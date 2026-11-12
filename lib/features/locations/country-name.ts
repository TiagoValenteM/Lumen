const swissNames = new Set(["switzerland", "schweiz", "suisse", "svizzera", "svizra"]);

export function normalizeCountryName(country: string, countryCode?: unknown): string {
  const name = country.trim();
  if (typeof countryCode === "string" && countryCode.trim().toLowerCase() === "ch") return "Switzerland";
  if (name && name.toLowerCase().split("/").every((part) => swissNames.has(part.trim()))) return "Switzerland";
  return name;
}
