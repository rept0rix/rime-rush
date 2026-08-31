import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const url = process.argv[2] || "http://127.0.0.1:8080/";
await mkdir("/workspace/screenshots", { recursive: true });

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("console", (m) => {
  if (m.type() === "error") console.log("ERR", m.text());
});
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1400);

const name = page.locator('input[placeholder="Name"]');
if (await name.count()) {
  await name.click();
  await page.evaluate(() => {
    const el = document.querySelector('input[placeholder="Name"]');
    if (!el) return;
    const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
    desc?.set?.call(el, "Naor");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(150);
  const enter = page.locator('button:has(img[alt="Enter"])');
  if (await enter.count()) await enter.click();
  else await page.keyboard.press("Enter");
  await page.waitForTimeout(350);
}

if (await page.locator('input[placeholder="Name"]').count()) {
  await page.keyboard.press("Space");
  await page.waitForTimeout(250);
}

await page.keyboard.press("Space");
await page.mouse.click(195, 620);
await page.waitForTimeout(600);
await page.screenshot({ path: "/workspace/screenshots/fix-start.png" });

await page.keyboard.down("ArrowRight");
await page.waitForTimeout(2400);
const mid = await page.evaluate(() => {
  const t = window.__controlsTest;
  const body = document.body.innerText;
  return {
    probe: t
      ? { x: t.getX(), y: t.getY?.() ?? 0, combo: t.getCombo(), floor: t.getFloor(), speed: t.getSpeed() }
      : null,
    hasX2: body.includes("X2"),
    hasRime: body.includes("RIME"),
    hasEmber: body.includes("EMBER"),
  };
});
console.log("MID", JSON.stringify(mid));
await page.screenshot({ path: "/workspace/screenshots/fix-climb.png" });
await page.waitForTimeout(2200);
await page.screenshot({ path: "/workspace/screenshots/fix-combo.png" });
const end = await page.evaluate(() => {
  const t = window.__controlsTest;
  const body = document.body.innerText;
  return {
    probe: t
      ? { x: t.getX(), y: t.getY?.() ?? 0, combo: t.getCombo(), floor: t.getFloor(), speed: t.getSpeed() }
      : null,
    hasX2: body.includes("X2"),
    hasX3: body.includes("X3"),
    hasCombo: body.includes("COMBO"),
    hasRime: body.includes("RIME"),
    hasEmber: body.includes("EMBER"),
  };
});
console.log("END", JSON.stringify(end));
await page.keyboard.up("ArrowRight");

await browser.close();
