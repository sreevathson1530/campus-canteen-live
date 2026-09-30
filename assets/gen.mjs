import sharp from "sharp";
const j=(f,s,o)=>sharp(f,{density:384}).resize(s,s).png().toFile(o);
await j("assets/icon.svg",192,"public/icons/icon-192.png");
await j("assets/icon.svg",512,"public/icons/icon-512.png");
await j("assets/maskable.svg",512,"public/icons/maskable-512.png");
await j("assets/icon.svg",180,"src/app/apple-icon.png");
await j("assets/icon.svg",1024,"assets/icon-only.png");
await j("assets/maskable.svg",1024,"assets/icon-foreground.png");
console.log("done");
