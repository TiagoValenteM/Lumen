import type { StyleSpecification } from "maplibre-gl";

export const workspaceMapStyle: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: ["a", "b", "c", "d"].map((host) => `https://cartodb-basemaps-${host}.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png`),
      tileSize: 256,
      attribution: "© OpenStreetMap contributors, © CARTO",
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};
