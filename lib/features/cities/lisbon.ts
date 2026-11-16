export const LISBON_SLUG = "lisbon";
export const LEGACY_LISBON_SLUG = "lisboa-portugal";

export function canonicalCitySlug(slug: string) {
  return slug === LEGACY_LISBON_SLUG ? LISBON_SLUG : slug;
}

export function normalizeCityName(name: string, country: string) {
  return country.trim().toLowerCase() === "portugal" && /^(lisboa|lisbon)$/i.test(name.trim()) ? "Lisboa" : name;
}
