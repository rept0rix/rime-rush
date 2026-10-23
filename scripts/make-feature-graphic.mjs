#!/usr/bin/env node
import { writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const iconBase64 = readFileSync(resolve(ROOT, "public/icon-512.png")).toString("base64");
const bgBase64 = readFileSync(resolve(ROOT, "public/art/tower-bg.jpg")).toString("base64");

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1024px;
    height: 500px;
    overflow: hidden;
    background: #061018;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .bg {
    position: absolute;
    inset: 0;
    background-image: url('data:image/jpeg;base64,${bgBase64}');
    background-size: cover;
    background-position: center 35%;
    filter: brightness(0.45) contrast(1.15) saturate(1.2);
  }
  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, rgba(6,16,24,0.1) 0%, rgba(6,16,24,0.7) 70%, rgba(6,16,24,0.95) 100%);
  }
  .glow {
    position: absolute;
    width: 600px;
    height: 300px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(126,231,255,0.18) 0%, rgba(126,231,255,0) 70%);
  }
  .content {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 48px;
    padding: 0 40px;
  }
  .icon-wrap {
    width: 200px;
    height: 200px;
    border-radius: 44px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(126,231,255,0.35);
    border: 3px solid rgba(126,231,255,0.5);
    overflow: hidden;
    flex-shrink: 0;
  }
  .icon-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .text-box {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .badge {
    display: inline-block;
    padding: 6px 14px;
    border-radius: 20px;
    background: rgba(126,231,255,0.12);
    border: 1px solid rgba(126,231,255,0.4);
    color: #7EE7FF;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 12px;
  }
  .title {
    font-size: 64px;
    font-weight: 900;
    letter-spacing: -1.5px;
    color: #FFFFFF;
    line-height: 1;
    text-shadow: 0 4px 20px rgba(0,0,0,0.8), 0 0 40px rgba(126,231,255,0.4);
    margin-bottom: 12px;
  }
  .title span {
    color: #7EE7FF;
  }
  .tagline {
    font-size: 20px;
    font-weight: 500;
    color: #C8D9E2;
    letter-spacing: 0.5px;
    max-width: 500px;
    line-height: 1.4;
  }
  .chips {
    display: flex;
    gap: 12px;
    margin-top: 18px;
  }
  .chip {
    font-size: 12px;
    font-weight: 600;
    color: #91AAB8;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    padding: 5px 12px;
    border-radius: 6px;
  }
</style>
</head>
<body>
  <div class="bg"></div>
  <div class="vignette"></div>
  <div class="glow"></div>
  <div class="content">
    <div class="icon-wrap">
      <img src="data:image/png;base64,${iconBase64}" alt="Rime Rush Icon" />
    </div>
    <div class="text-box">
      <div class="badge">Arcade Climber</div>
      <h1 class="title">RIME <span>RUSH</span></h1>
      <p class="tagline">Ascend the frozen monolith. Dodge shattering icicles, unlock climbers, and claim the summit.</p>
      <div class="chips">
        <span class="chip">⚡ Fast-Paced Arcade</span>
        <span class="chip">❄️ Frost Roguelite</span>
        <span class="chip">👥 Realtime Matchmaking</span>
      </div>
    </div>
  </div>
</body>
</html>`;

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewportSize({ width: 1024, height: 500 });
await page.setContent(html, { waitUntil: "networkidle" });
const buf = await page.screenshot({ type: "png", omitBackground: false });
const outPath = resolve(ROOT, "android/store-assets/feature-graphic-1024x500.png");
writeFileSync(outPath, buf);
console.log(`✅ Feature graphic generated: ${outPath} (${buf.length} bytes)`);
await browser.close();
