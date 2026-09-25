/**
 * AbeBooks cheapest-TOTAL probe - HARDENED.
 * Fixes 5 defects found by adversarial testing of abebooks-price.mjs:
 *   F1 lookup() never passed title/author on the ISBN path -> the wrong-book guard was DEAD CODE.
 *   F2 matchScore scored the pre-colon "head", so a 1-2 word head gave overlap 1.00 vs any book
 *      sharing that word ("Jonah:..." matched a book literally called "Jonah").
 *   F3 author surname was taken AFTER "Editor"/"eds" -> surname === "editor" -> authorOk always
 *      false for 113 prod rows, leaving them on the authorless overlap>=0.85 branch.
 *   F4 ISBN compare was string-equality; DB holds 16 ISBN-10s, AbeBooks JSON-LD is always ISBN-13
 *      -> guaranteed isbn_mismatch -> NO_RESULT -> wasted request / risk of false "$-".
 *   F5 volume/set qualifiers were stripped, so "(2 Volume set)" happily matched "Volume 2".
 * Re-exports the parts that survived testing unchanged.
 */
import { parseListings, blockSignal, cleanQuery, coreTitle } from './abebooks-price.mjs';
export { parseListings, blockSignal, cleanQuery, isbnUrl, keywordUrl, fetchPage } from './abebooks-price.mjs';
import { isbnUrl, keywordUrl, fetchPage } from './abebooks-price.mjs';

const RE_SRP_LIST=/data-test-id="srp-search-results-list"/, RE_ITEM_PRICE=/data-test-id="item-price-0"/;
const RE_CLOSEST=/data-test-id="closest-match-item"/, RE_UNABLE=/We were unable to find exact matches/i;
const RE_RESULTCNT=/data-test-id="result-count"[^>]*>\s*\(([\d,]+) results?\)/;
const STOP=new Set(['the','a','an','of','and','or','in','on','to','for','with','its','is','how','from','by','at','as']);
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
const toks=s=>norm(s).split(' ').filter(w=>w&&!STOP.has(w));

/** F4: ISBN-10 -> ISBN-13 so DB ISBN-10s can match AbeBooks' always-13-digit JSON-LD. */
export function toIsbn13(raw){
  const s=String(raw||'').replace(/[^0-9Xx]/g,'').toUpperCase();
  if(s.length===13) return s;
  if(s.length!==10) return s;
  const core='978'+s.slice(0,9);
  let sum=0; for(let i=0;i<12;i++) sum+=(+core[i])*(i%2?3:1);
  return core+String((10-(sum%10))%10);
}

/** F3: drop editorial role words BEFORE taking the surname. */
export function authorSurname(author){
  const t=toks(String(author||'').replace(/\b(editor|editors|eds?|translator|translators|trans|general|gen|compiler|foreword)\b\.?/gi,' '))
    .filter(w=>w.length>2);
  return t.length?t[t.length-1]:null;
}

/** F5: volume / set qualifiers are load-bearing, not noise. */
export function volumeKey(s){
  const n=norm(s);
  const set=/\b(\d+)\s*(volume|vol|vols)\s*(set|series)?\b/.exec(n)||/\bset of (\d+)\b/.exec(n);
  const vol=/\b(?:volume|vol)\.?\s*(\d+)\b/.exec(n);
  if(set&&/set|series/.test(set[0])) return 'set'+set[1];
  if(vol) return 'v'+vol[1];
  if(/\bcomplete set\b|\b\d+\s*volume set\b/.test(n)) return 'set';
  return null;
}

export function matchScore(row,title,author){
  const got=new Set(toks(row.name).concat(toks(row.author)));
  const score=t=>{const w=toks(t);return w.length?w.filter(x=>got.has(x)).length/w.length:0;};
  const full=score(title);
  const coreT=coreTitle(title), core=score(coreT);
  // F2: only let the pre-colon head count when it carries >=3 content tokens.
  const headT=coreT.split(':')[0];
  const headToks=toks(headT);
  const head=headToks.length>=3?score(headT):0;
  const overlap=Math.max(full,core,head);
  const basis=overlap===full?'full':(overlap===core?'core':'head');

  const surname=authorSurname(author);
  const authorOk=surname?new Set(toks(row.author).concat(toks(row.name))).has(surname):false;

  // F5: a volume/set qualifier on either side must not contradict the other.
  const vWant=volumeKey(title), vGot=volumeKey(row.name);
  const volumeConflict=!!(vWant&&vGot&&vWant!==vGot)||!!(vWant&&/^set/.test(vWant)&&vGot&&/^v/.test(vGot));

  // Tighter accept: a match resting on the truncated core/head MUST have the author.
  const ok=!volumeConflict&&((full>=0.85)||(overlap>=0.6&&authorOk)||(overlap>=0.85&&basis==='full'));
  return {overlap:+overlap.toFixed(2),full:+full.toFixed(2),basis,authorOk,volumeConflict,vWant,vGot,ok};
}

export function bestMatch(rows,title,author,n){
  let best=null;
  for(const r of rows.slice(0,n||8)){
    const s=matchScore(r,title,author);
    const better=!best||(s.ok&&!best.s.ok)||(s.ok===best.s.ok&&(s.overlap>best.s.overlap||(s.overlap===best.s.overlap&&s.authorOk&&!best.s.authorOk)));
    if(better) best={row:r,s};
  }
  return best;
}

export function classify(html,httpStatus,opts){
  opts=opts||{};
  const blocked=blockSignal(httpStatus,html);
  if(blocked) return {status:'FAILED',reason:'blocked:'+blocked};
  if(opts.declaredLength&&html.length<opts.declaredLength) return {status:'FAILED',reason:'truncated_body'};
  if(opts.finalUrl&&/\/servlet\/SearchEntry\?errorcode=/.test(opts.finalUrl)) return {status:'NO_RESULT',reason:'invalid_isbn_rejected'};
  if(RE_CLOSEST.test(html)||RE_UNABLE.test(html.replace(/<script[\s\S]*?<\/script>/g,''))) return {status:'NO_RESULT',reason:'closest_match_page'};
  if(!RE_SRP_LIST.test(html)||!RE_ITEM_PRICE.test(html)) return {status:'FAILED',reason:'unrecognised_page_shape'};

  let rows=parseListings(html);
  if(!rows.length) return {status:'FAILED',reason:'no_listings_parsed'};
  const rc=RE_RESULTCNT.exec(html); const resultCount=rc?rc[1]:null;

  let sanity=null;
  if(opts.expectIsbn){
    const want=toIsbn13(opts.expectIsbn);                  // F4
    const withIsbn=rows.filter(r=>r.isbn);
    if(withIsbn.length&&!withIsbn.some(r=>toIsbn13(r.isbn)===want))
      return {status:'NO_RESULT',reason:'isbn_mismatch',got:withIsbn[0].isbn};
  }
  // F1: the title guard now runs on BOTH paths, always.
  if(opts.title){
    const b=bestMatch(rows,opts.title,opts.author,8);
    if(!b||!b.s.ok) return {status:'NO_RESULT',reason:opts.expectIsbn?'isbn_resolves_to_other_book':'title_author_mismatch',
      overlap:b?b.s.overlap:0,basis:b?b.s.basis:null,authorOk:b?b.s.authorOk:false,
      volumeConflict:b?b.s.volumeConflict:false,got:b?b.row.name:null,gotAuthor:b?b.row.author:null};
    sanity={titleOverlap:b.s.overlap,basis:b.s.basis,authorOk:b.s.authorOk,matchedIdx:b.row.idx};
    const anchor=b.row.isbn;
    const same=rows.filter(r=>(anchor&&r.isbn===anchor)||matchScore(r,opts.title,opts.author).ok);
    if(same.length) rows=same;
  }
  if(opts.usedOnly){const u=rows.filter(r=>r.condition==='Used'); if(!u.length) return {status:'NO_RESULT',reason:'no_used_copies'}; rows=u;}

  const priced=rows.filter(r=>r.total!=null);
  if(!priced.length) return {status:'FAILED',reason:'price_or_shipping_unparsed',sample:rows[0].shipText};
  const best=priced.reduce((a,b)=>b.total<a.total?b:a), idx0=priced[0];
  return {status:'OK',total:best.total,item:best.item,shipping:best.shipping,condition:best.condition,
    seller:best.seller,isbn:best.isbn,matchedTitle:best.name,matchedAuthor:best.author,url:best.url,
    chosenIdx:best.idx,idx0Total:idx0.total,sortWasCorrect:best.idx===idx0.idx,
    resultCount,listingsParsed:rows.length,sanity};
}

export async function lookup(book){
  const usedOnly=!!book.usedOnly;
  const raw=String(book.isbn||'').replace(/[^0-9Xx]/g,'');
  if(raw&&/^(\d{9}[\dXx]|\d{13})$/.test(raw)){
    const url=isbnUrl(toIsbn13(raw));                       // F4: always query the 13-digit form
    const r=await fetchPage(url);
    if(r.netError) return {status:'FAILED',reason:'net:'+r.netError,url,via:'isbn'};
    const out=classify(r.html,r.status,{expectIsbn:raw,title:book.title,author:book.author,usedOnly,finalUrl:r.finalUrl}); // F1
    out.url=url; out.via='isbn';
    if(out.status!=='NO_RESULT'||!book.title) return out;
  }
  if(!book.title) return {status:'NO_RESULT',reason:'no_isbn_no_title'};
  const url=keywordUrl(book.title,book.author);
  const r=await fetchPage(url);
  if(r.netError) return {status:'FAILED',reason:'net:'+r.netError,url,via:'keyword'};
  const out=classify(r.html,r.status,{title:book.title,author:book.author,usedOnly,finalUrl:r.finalUrl});
  out.url=url; out.via='keyword'; out.query=cleanQuery(book.title,book.author);
  return out;
}

export const cellFor=o=>o.status==='OK'?'$'+o.total.toFixed(2):(o.status==='NO_RESULT'?'$-':null);

// ------------------------------------------------------------------ cli
if (import.meta.url === 'file://' + process.argv[1]) {
  const a=process.argv.slice(2), arg=k=>{const i=a.indexOf(k);return i===-1?null:a[i+1];};
  if (arg('--file')) {
    const fs=await import('node:fs');
    console.log(JSON.stringify(classify(fs.readFileSync(arg('--file'),'utf8'),200,
      {expectIsbn:arg('--expect-isbn'),title:arg('--title'),author:arg('--author'),
       usedOnly:a.includes('--used-only'),finalUrl:arg('--final-url')}),null,2));
  } else {
    const out=await lookup({isbn:arg('--isbn'),title:arg('--title'),author:arg('--author'),
                            usedOnly:a.includes('--used-only')});
    out.cell=cellFor(out);
    console.log(JSON.stringify(out,null,2));
  }
}
