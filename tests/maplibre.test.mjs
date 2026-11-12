import assert from "node:assert/strict";
import { test } from "node:test";
import { importMapLibre } from "../lib/features/locations/load-maplibre.ts";

test("the patched MapLibre bundle exposes maps, draggable markers, and safe popup content", async () => {
  const { Map, Marker, Popup } = await importMapLibre();
  assert.equal(typeof Map, "function");
  assert.equal(typeof Marker.prototype.setDraggable, "function");
  assert.equal(typeof Popup.prototype.setDOMContent, "function");
});
