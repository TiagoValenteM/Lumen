import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { BRAND_SITE_URL, getSiteOrigin } from "../lib/constants/brand.ts";

test("metadata uses the preview host and keeps the existing public origin for production", () => {
  const production = { NEXT_PUBLIC_SITE_URL: BRAND_SITE_URL };
  assert.equal(getSiteOrigin(production).origin, BRAND_SITE_URL);
  assert.equal(getSiteOrigin({ ...production, VERCEL_ENV: "preview", VERCEL_URL: "preview.vercel.app" }).origin, "https://preview.vercel.app");
  assert.equal(getSiteOrigin({ NEXT_PUBLIC_SITE_URL: "file:///private", VERCEL_PROJECT_PRODUCTION_URL: "site.vercel.app" }).origin, "https://site.vercel.app");
  assert.equal(getSiteOrigin({ NEXT_PUBLIC_SITE_URL: "https://user:pass@example.com" }).origin, BRAND_SITE_URL);
});

test("the favicon and share assets keep the declared formats and sizes", () => {
  const asset = (name) => readFileSync(new URL(`../app/${name}`, import.meta.url));
  const ico = asset("favicon.ico");
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 3);
  assert.deepEqual([ico[6], ico[22], ico[38]], [16, 32, 48]);
  for (const [name, width, height] of [["icon.png", 192, 192], ["apple-icon.png", 180, 180], ["../public/brand/deskhaunt-share.png", 1200, 630]]) {
    const png = asset(name);
    assert.equal(png.toString("ascii", 12, 16), "IHDR");
    assert.equal(png.readUInt32BE(16), width);
    assert.equal(png.readUInt32BE(20), height);
  }
});
