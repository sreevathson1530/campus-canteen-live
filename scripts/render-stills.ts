/**
 * Renders every procedural 3D dish to a transparent WebP still in public/stills/.
 * Needs the dev server running:  npm run dev   then   npm run render:stills [-- --url http://localhost:3000]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const KEYS = [
  "idli", "masala-dosa", "pongal", "poori", "veg-meals", "curd-rice", "lemon-rice", "biryani",
  "egg-fried-rice", "samosa", "veg-puff", "egg-puff", "onion-bajji", "filter-coffee", "tea", "lime-juice",
];

const urlArg = process.argv.indexOf("--url");
const base = urlArg > -1 ? process.argv[urlArg + 1] : "http://localhost:3000";
const outDir = path.resolve("public/stills");

async function main() {
  mkdirSync(outDir, { recursive: true });
  // Prefer the installed Chrome (GPU-backed WebGL); fall back to Playwright's Chromium.
  const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
  const page = await browser.newPage({ viewport: { width: 640, height: 512 } });
  for (const key of KEYS) {
    await page.goto(`${base}/dev/render/${key}`);
    await page.waitForFunction(() => window.__stillReady === true, null, { timeout: 60_000 });
    const dataUrl = await page.evaluate(() => (document.querySelector("#still canvas") as HTMLCanvasElement).toDataURL("image/webp", 0.86));
    const bytes = Buffer.from(dataUrl.split(",")[1], "base64");
    writeFileSync(path.join(outDir, `${key}.webp`), bytes);
    console.log(`✓ ${key}.webp  ${(bytes.length / 1024).toFixed(1)} KB`);
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
