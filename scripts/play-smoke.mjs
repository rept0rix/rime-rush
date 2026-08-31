#!/usr/bin/env node
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:8080/";
const errors = [];

const browser = await chromium.launch({
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("crash", () => errors.push("browser crash"));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text()}`);
});

const shot = (name) => page.screenshot({ path: `/workspace/screenshots/smoke-${name}.png` });

await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForTimeout(1600);
await shot("boot");

const input = page.locator("input");
if (await input.count()) {
  await input.first().fill("Smoke");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
}

await page.mouse.click(195, 720);
await page.keyboard.press("Space");
await page.waitForTimeout(700);
await shot("play");

for (let i = 0; i < 18; i++) {
  await page.keyboard.down(i % 3 === 0 ? "ArrowLeft" : "ArrowRight");
  await page.keyboard.press("Space");
  if (i % 4 === 0) await page.keyboard.press("KeyJ");
  await page.waitForTimeout(90);
}
await page.keyboard.up("ArrowLeft");
await page.keyboard.up("ArrowRight");
await shot("run");

const mute = page.getByLabel(/mute|unmute/);
if (await mute.count()) {
  await mute.first().click();
  await page.waitForTimeout(250);
}
await shot("mute");

const pause = page.getByLabel("pause");
if (await pause.count()) {
  await pause.first().click();
  await page.waitForTimeout(400);
}
await shot("pause");

const body = await page.evaluate(() => document.body.innerText.slice(0, 400));
const canvas = await page.evaluate(() => {
  const c = document.querySelector("canvas");
  return c ? { w: c.width, h: c.height } : null;
});

await browser.close();

const fail = errors.filter((e) => !/favicon|Download the React DevTools/i.test(e));
console.log(
  JSON.stringify(
    {
      ok: fail.length === 0 && !!canvas,
      errors: fail,
      canvas,
      bodyPreview: body,
    },
    null,
    2,
  ),
);
if (fail.length) process.exit(1);
