import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const root = new URL("../../", import.meta.url);
const original = await readFile(new URL("public/brand/deskhaunt-ghost.png", root));
const browser = await chromium.launch();

try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const images = await page.evaluate(async (source) => {
    const ghost = new Image();
    ghost.src = source;
    await ghost.decode();

    const mask = document.createElement("canvas");
    mask.width = ghost.naturalWidth;
    mask.height = ghost.naturalHeight;
    const ctx = mask.getContext("2d");
    ctx.drawImage(ghost, 0, 0);
    const { data } = ctx.getImageData(0, 0, mask.width, mask.height);
    let left = mask.width, right = 0, top = mask.height, bottom = 0;
    for (let y = 0; y < mask.height; y++) {
      for (let x = 0; x < mask.width; x++) {
        if (data[(y * mask.width + x) * 4 + 3] < 24) continue;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
    if (right <= left || bottom <= top) throw new Error("The original mark has no visible art.");
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = "#A8CDB3";
    ctx.fillRect(0, 0, mask.width, mask.height);

    const output = (size, background, insetRatio) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const frame = canvas.getContext("2d");
      if (background) {
        frame.fillStyle = "#171C19";
        frame.beginPath();
        frame.roundRect(0, 0, size, size, size === 180 ? 0 : Math.round(size * 0.18));
        frame.fill();
      }
      const width = right - left + 1;
      const height = bottom - top + 1;
      const scale = (size * (1 - insetRatio * 2)) / Math.max(width, height);
      frame.imageSmoothingQuality = "high";
      frame.drawImage(mask, left, top, width, height, (size - width * scale) / 2, (size - height * scale) / 2, width * scale, height * scale);
      return canvas.toDataURL("image/png");
    };

    return {
      icons: [16, 32, 48, 180, 192].map((size) => output(size, true, size <= 32 ? 0.06 : 0.15)),
      mark: output(384, false, 0),
    };
  }, `data:image/png;base64,${original.toString("base64")}`);

  const icons = images.icons.map((uri) => Buffer.from(uri.split(",")[1], "base64"));
  const icoHeader = Buffer.alloc(6 + 3 * 16);
  icoHeader.writeUInt16LE(1, 2);
  icoHeader.writeUInt16LE(3, 4);
  let offset = icoHeader.length;
  [16, 32, 48].forEach((size, index) => {
    const pos = 6 + index * 16;
    icoHeader[pos] = icoHeader[pos + 1] = size;
    icoHeader.writeUInt16LE(1, pos + 4);
    icoHeader.writeUInt16LE(32, pos + 6);
    icoHeader.writeUInt32LE(icons[index].length, pos + 8);
    icoHeader.writeUInt32LE(offset, pos + 12);
    offset += icons[index].length;
  });
  await Promise.all([
    writeFile(new URL("app/favicon.ico", root), Buffer.concat([icoHeader, ...icons.slice(0, 3)])),
    writeFile(new URL("app/apple-icon.png", root), icons[3]),
    writeFile(new URL("app/icon.png", root), icons[4]),
  ]);

  await page.setContent(`<!doctype html>
    <html lang="en"><meta charset="utf-8"><title>Deskhaunt share image</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; background: #171c19; color: #e9eee8; font-family: Arial, sans-serif; }
      main { width: 1200px; height: 630px; display: grid; grid-template-columns: minmax(0, 1fr) 310px; align-items: center; gap: 56px; padding: 72px 80px; }
      h1 { margin: 0 0 22px; font-size: 100px; line-height: 1; }
      p { margin: 0; }
      .tagline { font-size: 36px; line-height: 1.18; color: #a8cdb3; }
      .credit { margin-top: 58px; font-size: 21px; color: #aebab1; }
      img { width: 310px; height: 310px; }
    </style>
    <main>
      <div><h1>Deskhaunt</h1><p class="tagline">Find a good spot to work.</p><p class="credit">Proudly developed in Switzerland</p></div>
      <img src="${images.mark}" alt="">
    </main></html>`);
  await page.locator("img").evaluate((image) => image.decode());
  await page.screenshot({ path: new URL("public/brand/deskhaunt-share.png", root).pathname });
} finally {
  await browser.close();
}
