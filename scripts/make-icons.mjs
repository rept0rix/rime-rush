#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
  <rect width="180" height="180" rx="40" fill="#061018"/>
  <polygon points="90,26 140,80 40,80" fill="#E8F4FF"/>
  <rect x="66" y="80" width="48" height="76" fill="#7EE7FF"/>
  <rect x="44" y="114" width="92" height="16" rx="4" fill="#E8F4FF"/>
  <rect x="82" y="94" width="16" height="14" rx="2" fill="#061018"/>
</svg>`;

const sizes = [180, 192, 512];

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage();
for (const size of sizes) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<!doctype html><html><head><style>
      html,body{margin:0;padding:0;background:#061018;width:${size}px;height:${size}px;overflow:hidden}
      svg{display:block;width:${size}px;height:${size}px}
    </style></head><body>${SVG}</body></html>`,
    { waitUntil: "load" },
  );
  const buf = await page.screenshot({ type: "png", omitBackground: false });
  writeFileSync(`/workspace/public/icon-${size}.png`, buf);
  console.log("wrote", size, buf.length);
}
await browser.close();
