import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const dir = "/workspace/screenshots";

const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("console", (m) => {
  if (m.type() === "error") console.log("ERR", m.text());
});
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1400);

const profile = page.getByRole("button", { name: "Profile" });
await profile.click({ timeout: 8000 });
await page.waitForTimeout(400);

const text = await page.locator("body").innerText();
const howto = /how to play/i.test(text);
const sound = await page.getByTestId("feel-sound").count();
const shake = await page.getByTestId("feel-shake").count();
const alerts = await page.getByTestId("feel-alerts").count();
const home = await page.getByTestId("feel-home").count();
const signout = await page.getByTestId("feel-signout").count();
const del = await page.getByTestId("feel-delete").count();
await page.screenshot({ path: `${dir}/set-profile.png` });

await page.getByTestId("feel-sound").click();
await page.waitForTimeout(500);
const afterSound = await page.getByTestId("feel-sound").innerText();
await page.screenshot({ path: `${dir}/set-toggled.png` });

await page.getByTestId("feel-shake").click();
await page.waitForTimeout(180);
const shaking = await page.evaluate(() => document.documentElement.classList.contains("feel-shake") || document.body.classList.contains("feel-shake") || !!document.querySelector(".feel-shake"));
await page.screenshot({ path: `${dir}/set-shook.png` });

await page.getByTestId("feel-signout").click();
await page.waitForTimeout(300);
const outTitle = await page.getByText("SIGN OUT?").count();
await page.screenshot({ path: `${dir}/set-signout.png` });
await page.getByRole("button", { name: "Cancel" }).click();
await page.waitForTimeout(200);

await page.getByTestId("feel-delete").click();
await page.waitForTimeout(300);
const delTitle = await page.getByText("DELETE?").count();
await page.screenshot({ path: `${dir}/set-delete.png` });
await page.getByRole("button", { name: "Cancel" }).click();

const audio = await page.evaluate(() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  return AC ? "ctx-ok" : "no-ctx";
});

await page.getByRole("button", { name: "Back" }).click();
await page.waitForTimeout(300);
await page.keyboard.press("Space");
await page.waitForTimeout(600);
const pause = page.getByRole("button", { name: "pause" });
if (await pause.count()) {
  await pause.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/set-pause.png` });
}

console.log(
  JSON.stringify({
    howto,
    sound,
    shake,
    alerts,
    home,
    signout,
    del,
    afterSound: afterSound.replace(/\s+/g, " ").trim(),
    shaking,
    outTitle,
    delTitle,
    audio,
  }),
);

await browser.close();
