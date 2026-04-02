import { NextResponse } from "next/server";

interface WikidataResult {
  gender?: string;
  nationality?: string;
  religion?: string;
  image_url?: string;
}

async function fetchFromWikidata(authorName: string): Promise<WikidataResult> {
  const result: WikidataResult = {};

  try {
    // Step 1: Search Wikidata for the author entity
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(authorName)}&language=en&limit=3&format=json`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return result;
    const searchData = await searchRes.json();

    if (!searchData.search || searchData.search.length === 0) return result;

    // Find best match — prefer entities described as writer/author
    let entityId = searchData.search[0].id;
    for (const item of searchData.search) {
      const desc = (item.description || "").toLowerCase();
      if (desc.includes("writer") || desc.includes("author") || desc.includes("theologian") || desc.includes("pastor")) {
        entityId = item.id;
        break;
      }
    }

    // Step 2: Fetch entity claims
    const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&props=claims&format=json`;
    const entityRes = await fetch(entityUrl);
    if (!entityRes.ok) return result;
    const entityData = await entityRes.json();

    const claims = entityData.entities?.[entityId]?.claims;
    if (!claims) return result;

    // Helper to get label for a Wikidata entity ID
    const getLabel = async (qid: string): Promise<string | null> => {
      try {
        const res = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=labels&languages=en&format=json`);
        const data = await res.json();
        return data.entities?.[qid]?.labels?.en?.value || null;
      } catch {
        return null;
      }
    };

    // P21 = sex/gender
    if (claims.P21?.[0]?.mainsnak?.datavalue?.value?.id) {
      const genderId = claims.P21[0].mainsnak.datavalue.value.id;
      const genderMap: Record<string, string> = {
        Q6581097: "Male",
        Q6581072: "Female",
        Q1097630: "Non-binary",
      };
      result.gender = genderMap[genderId] || await getLabel(genderId) || undefined;
    }

    // P27 = country of citizenship
    if (claims.P27?.[0]?.mainsnak?.datavalue?.value?.id) {
      const countryId = claims.P27[0].mainsnak.datavalue.value.id;
      const label = await getLabel(countryId);
      if (label) {
        // Convert country name to nationality demonym where possible
        const demonymMap: Record<string, string> = {
          "United States of America": "American",
          "United Kingdom": "British",
          "Canada": "Canadian",
          "Australia": "Australian",
          "Germany": "German",
          "France": "French",
          "Italy": "Italian",
          "Spain": "Spanish",
          "Netherlands": "Dutch",
          "Switzerland": "Swiss",
          "South Korea": "Korean",
          "Japan": "Japanese",
          "China": "Chinese",
          "India": "Indian",
          "Brazil": "Brazilian",
          "Mexico": "Mexican",
          "Russia": "Russian",
          "Poland": "Polish",
          "Sweden": "Swedish",
          "Norway": "Norwegian",
          "Denmark": "Danish",
          "Ireland": "Irish",
          "Scotland": "British",
          "Nigeria": "Nigerian",
          "South Africa": "South African",
          "Kenya": "Kenyan",
          "Israel": "Israeli",
          "Turkey": "Turkish",
          "Egypt": "Egyptian",
          "Pakistan": "Pakistani",
          "Philippines": "Filipino",
          "Indonesia": "Indonesian",
          "Argentina": "Argentinian",
          "Colombia": "Colombian",
          "Chile": "Chilean",
          "New Zealand": "New Zealander",
          "Austria": "Austrian",
          "Belgium": "Belgian",
          "Portugal": "Portuguese",
          "Greece": "Greek",
          "Czech Republic": "Czech",
          "Romania": "Romanian",
          "Hungary": "Hungarian",
          "Finland": "Finnish",
          "Ghana": "Ghanaian",
          "Ethiopia": "Ethiopian",
          "Jamaica": "Jamaican",
          "Cuba": "Cuban",
          "Peru": "Peruvian",
          "Lebanon": "Lebanese",
          "Iran": "Iranian",
          "Iraq": "Iraqi",
          "Syria": "Syrian",
          "Kingdom of England": "British",
        };
        result.nationality = demonymMap[label] || label;
      }
    }

    // P140 = religion
    if (claims.P140?.[0]?.mainsnak?.datavalue?.value?.id) {
      const religionId = claims.P140[0].mainsnak.datavalue.value.id;
      const label = await getLabel(religionId);
      if (label) {
        // Map to our religious tradition options
        const lower = label.toLowerCase();
        if (lower.includes("catholic")) result.religion = "Christian — Catholic";
        else if (lower.includes("protestant")) result.religion = "Christian — Protestant";
        else if (lower.includes("orthodox") && lower.includes("christian")) result.religion = "Christian — Orthodox";
        else if (lower.includes("evangelical")) result.religion = "Christian — Evangelical";
        else if (lower.includes("christian") || lower.includes("christianity")) result.religion = "Christian — Non-denominational";
        else if (lower.includes("sunni")) result.religion = "Muslim — Sunni";
        else if (lower.includes("shia")) result.religion = "Muslim — Shia";
        else if (lower.includes("islam") || lower.includes("muslim")) result.religion = "Muslim — Sunni";
        else if (lower.includes("judaism") || lower.includes("jewish")) result.religion = "Jewish — Reform";
        else if (lower.includes("hindu")) result.religion = "Hindu";
        else if (lower.includes("buddhis")) result.religion = "Buddhist";
        else if (lower.includes("sikh")) result.religion = "Sikh";
        else if (lower.includes("atheism") || lower.includes("agnostic")) result.religion = "Atheist / Agnostic";
        else if (lower.includes("mormon") || lower.includes("latter")) result.religion = "Mormon / LDS";
        else result.religion = label;
      }
    }

    // P18 = image
    if (claims.P18?.[0]?.mainsnak?.datavalue?.value) {
      const filename = claims.P18[0].mainsnak.datavalue.value;
      const encodedFilename = encodeURIComponent(filename.replace(/ /g, "_"));
      result.image_url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodedFilename}?width=400`;
    }
  } catch (err) {
    console.error(`Wikidata fetch error for ${authorName}:`, err);
  }

  return result;
}

export async function POST(request: Request) {
  try {
    const { authorName } = await request.json();
    if (!authorName) {
      return NextResponse.json({ error: "authorName required" }, { status: 400 });
    }

    const info = await fetchFromWikidata(authorName);
    return NextResponse.json(info);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
