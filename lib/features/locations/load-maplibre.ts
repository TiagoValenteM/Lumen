export async function importMapLibre() {
  const maplibre = await import("maplibre-gl");
  if (typeof maplibre.Map === "function") return maplibre;
  // MapLibre 5's CommonJS bundle can appear under default in ESM loaders.
  return maplibre.default;
}
