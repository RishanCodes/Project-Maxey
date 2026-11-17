// Renders PNG app icons from the original SVG mark using the preinstalled Chromium. Run: npm run icons
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const svg = readFileSync(new URL("../public/icons/icon.svg", import.meta.url), "utf8");
const maskable = svg.replace('rx="112"', 'rx="0"').replace("translate(64 64) scale(12)", "translate(112 112) scale(9)");
const out = (n) => new URL(`../public/icons/${n}`, import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, src] of [["icon-192.png", 192, svg], ["icon-512.png", 512, svg], ["icon-maskable-512.png", 512, maskable], ["apple-touch-icon.png", 180, maskable]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${src.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: out(name), omitBackground: true });
}
await browser.close();
console.log("icons written");
