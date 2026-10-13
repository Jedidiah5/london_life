// Builds every app icon from the pixel-art bus. Usage: node scripts/make-icons.mjs <path-to-icon.jpg>
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const source = process.argv[2] ?? "assets/icon.jpg";
const OUT_PUBLIC = "public/icons";

/** Trim the white margin and key it out so the bus sits on whatever background we choose. */
async function cutout() {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const near = Math.min(data[i], data[i + 1], data[i + 2]);
    if (near > 238) data[i + 3] = 0;
    else if (near > 200) data[i + 3] = Math.round(((238 - near) / 38) * 255);
  }
  const full = await sharp(data, { raw: info }).png().toBuffer();
  return sharp(full).trim({ threshold: 1 }).png().toBuffer();
}

async function render(bus, size, { background, scale }) {
  const inner = Math.round(size * scale);
  const sprite = await sharp(bus)
    .resize(inner, inner, { fit: "inside", kernel: "nearest", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: background ?? { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: sprite, gravity: "center" }])
    .png()
    .toBuffer();
}

const bus = await cutout();
await mkdir(OUT_PUBLIC, { recursive: true });

const navy = { r: 0x1b, g: 0x28, b: 0x38, alpha: 1 };
const paper = { r: 0xf4, g: 0xef, b: 0xe6, alpha: 1 };

const files = {
  "app/icon.png": await render(bus, 512, { scale: 0.92 }),
  "app/apple-icon.png": await render(bus, 180, { background: paper, scale: 0.78 }),
  [`${OUT_PUBLIC}/icon-192.png`]: await render(bus, 192, { scale: 0.92 }),
  [`${OUT_PUBLIC}/icon-512.png`]: await render(bus, 512, { scale: 0.92 }),
  [`${OUT_PUBLIC}/icon-maskable-512.png`]: await render(bus, 512, { background: navy, scale: 0.6 }),
};

for (const [path, buffer] of Object.entries(files)) {
  await writeFile(path, buffer);
  console.log("wrote", path);
}
