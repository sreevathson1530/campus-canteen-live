const sharp = require("../node_modules/sharp");
const fs = require("fs");
const R = "android/app/src/main/res";
const MARK = '<circle cx="256" cy="244" r="118" fill="none" stroke="#fff" stroke-width="46"/><path d="M276 150 L206 262 H254 L236 340 L312 220 H262 Z" fill="#ffb703"/><path d="M318 318 L376 376" stroke="#fff" stroke-width="46" stroke-linecap="round"/>';
const fg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g transform="translate(256 256) scale(0.62) translate(-256 -256)">${MARK}</g></svg>`;
const sq = fs.readFileSync("../assets/icon.svg");
const round = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><circle cx="256" cy="256" r="256" fill="#d2112c"/><g transform="translate(256 256) scale(0.8) translate(-256 -256)">${MARK}</g></svg>`;
const d = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
(async () => {
  for (const [k, m] of Object.entries(d)) {
    const o = `${R}/mipmap-${k}`;
    await sharp(sq, { density: 384 }).resize(Math.round(48 * m)).png().toFile(`${o}/ic_launcher.png`);
    await sharp(Buffer.from(round), { density: 384 }).resize(Math.round(48 * m)).png().toFile(`${o}/ic_launcher_round.png`);
    await sharp(Buffer.from(fg), { density: 384 }).resize(Math.round(108 * m)).png().toFile(`${o}/ic_launcher_foreground.png`);
  }
  fs.writeFileSync(`${R}/values/ic_launcher_background.xml`, '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#D2112C</color>\n</resources>\n');
  console.log("icons ok");
})();
