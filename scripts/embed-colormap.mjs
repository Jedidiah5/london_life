import fs from "node:fs";
import path from "node:path";

const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

function pad(length, multiple, fill) {
  const extra = (multiple - (length % multiple)) % multiple;
  return Buffer.alloc(extra, fill);
}

export function embedPng(glb, png) {
  const magic = glb.readUInt32LE(0);
  if (magic !== 0x46546c67) throw new Error("not a glb");
  let offset = 12;
  const jsonLength = glb.readUInt32LE(offset);
  const jsonType = glb.readUInt32LE(offset + 4);
  if (jsonType !== JSON_CHUNK) throw new Error("missing json chunk");
  const jsonBytes = glb.subarray(offset + 8, offset + 8 + jsonLength);
  offset += 8 + jsonLength;
  const binLength = glb.readUInt32LE(offset);
  const binType = glb.readUInt32LE(offset + 4);
  if (binType !== BIN_CHUNK) throw new Error("missing bin chunk");
  const bin = Buffer.from(glb.subarray(offset + 8, offset + 8 + binLength));

  const document = JSON.parse(jsonBytes.toString("utf8").trim());
  const image = document.images?.find((entry) => entry.uri);
  if (!image) return glb;

  const aligned = Buffer.concat([bin, pad(bin.length, 4, 0)]);
  const byteOffset = aligned.length;
  const embedded = Buffer.concat([aligned, png, pad(png.length, 4, 0)]);
  document.bufferViews = document.bufferViews ?? [];
  const bufferView = document.bufferViews.length;
  document.bufferViews.push({
    buffer: 0,
    byteOffset,
    byteLength: png.length,
  });
  delete image.uri;
  image.bufferView = bufferView;
  image.mimeType = "image/png";
  document.buffers[0].byteLength = embedded.length;

  const jsonOut = Buffer.from(JSON.stringify(document));
  const jsonPadded = Buffer.concat([jsonOut, pad(jsonOut.length, 4, 0x20)]);
  const total = 12 + 8 + jsonPadded.length + 8 + embedded.length;
  const out = Buffer.alloc(total);
  out.writeUInt32LE(0x46546c67, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(total, 8);
  out.writeUInt32LE(jsonPadded.length, 12);
  out.writeUInt32LE(JSON_CHUNK, 16);
  jsonPadded.copy(out, 20);
  const binHeader = 20 + jsonPadded.length;
  out.writeUInt32LE(embedded.length, binHeader);
  out.writeUInt32LE(BIN_CHUNK, binHeader + 4);
  embedded.copy(out, binHeader + 8);
  return out;
}

const [, , glbPath, pngPath, destPath] = process.argv;
if (glbPath && pngPath) {
  const result = embedPng(fs.readFileSync(glbPath), fs.readFileSync(pngPath));
  fs.mkdirSync(path.dirname(destPath ?? glbPath), { recursive: true });
  fs.writeFileSync(destPath ?? glbPath, result);
  console.log("embedded", destPath ?? glbPath, result.length);
}
