// Shared country-name canonicalization. Enrichment fills `authors.country`
// with values like "United States", "England", or "Kingdom of the
// Netherlands"; Natural Earth (world-atlas) uses canonical short names like
// "United States of America" and "Netherlands". Both the world-map choropleth
// on /stats and the country-filter on / go through this so the same source
// always resolves to the same country regardless of spelling variant.

const COUNTRY_NAME_ALIASES: Record<string, string> = {
  "United States": "United States of America",
  "USA": "United States of America",
  "US": "United States of America",
  "UK": "United Kingdom",
  "England": "United Kingdom",
  "Scotland": "United Kingdom",
  "Wales": "United Kingdom",
  "Northern Ireland": "United Kingdom",
  "Kingdom of England": "United Kingdom",
  "United Kingdom of Great Britain and Ireland": "United Kingdom",
  "Great Britain": "United Kingdom",
  "Kingdom of the Netherlands": "Netherlands",
  "Republic of Ireland": "Ireland",
  "Russian Federation": "Russia",
  "South Korea": "South Korea",
  "Republic of Korea": "South Korea",
  "North Korea": "North Korea",
  "Czechia": "Czechia",
  "Czech Republic": "Czechia",
  "Bohemia": "Czechia",
  "Vatican": "Vatican",
  "Roman Empire": "Italy",
};

export function canonicalCountryName(name: string): string {
  return COUNTRY_NAME_ALIASES[name] || name;
}
