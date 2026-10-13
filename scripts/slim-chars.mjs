// Trims Quaternius modular characters (CC0) down to what the game plays:
// a few animation clips, no UVs or vertex colours (they're flat-shaded), and no orphaned buffer data.
// Usage: node scripts/slim-chars.mjs <source dir> <dest dir>
import fs from "node:fs";
import path from "node:path";

const KEEP_CLIPS = ["Idle", "Walk", "Interact", "Wave"];
const DROP_ATTRIBUTES = ["TEXCOORD_0", "COLOR_0"];

/** Source file (from poly.pizza) to game id. */
const PICKS = {
  "m-Casual_Character.glb": "m_casual",
  "m-Hoodie_Character.glb": "m_hoodie",
  "m-Business_Man.glb": "m_suit",
  "m-Punk.glb": "m_punk",
  "m-Beach_Character.glb": "m_beach",
  "m-Adventurer.glb": "m_adventurer",
  "f-Woman_qJ2gsTUBHL.glb": "f_casual",
  "f-Woman_nIItLV9nxS.glb": "f_formal",
  "f-Suit.glb": "f_suit",
  "f-Punk.glb": "f_punk",
  "f-Adventurer.glb": "f_adventurer",
  "f-Soldier.glb": "f_soldier",
};

function readGlb(buffer) {
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));
  const binStart = 20 + jsonLength;
  const binLength = buffer.readUInt32LE(binStart);
  return { json, bin: buffer.subarray(binStart + 8, binStart + 8 + binLength) };
}

function writeGlb(json, bin) {
  const pad = (data, fill) => Buffer.concat([data, Buffer.alloc((4 - (data.length % 4)) % 4, fill)]);
  const jsonChunk = pad(Buffer.from(JSON.stringify(json)), 0x20);
  const binChunk = pad(bin, 0);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8);
  const chunkHeader = (length, type) => {
    const out = Buffer.alloc(8);
    out.writeUInt32LE(length, 0);
    out.writeUInt32LE(type, 4);
    return out;
  };
  return Buffer.concat([
    header,
    chunkHeader(jsonChunk.length, 0x4e4f534a),
    jsonChunk,
    chunkHeader(binChunk.length, 0x004e4942),
    binChunk,
  ]);
}

export function slim(buffer) {
  const { json, bin } = readGlb(buffer);
  json.animations = (json.animations ?? [])
    .map((clip) => ({ ...clip, name: clip.name.split("|").pop() }))
    .filter((clip) => KEEP_CLIPS.includes(clip.name));
  for (const mesh of json.meshes) {
    for (const primitive of mesh.primitives) {
      for (const attribute of DROP_ATTRIBUTES) delete primitive.attributes[attribute];
    }
  }

  const accessorMap = new Map();
  const accessors = [];
  const keepAccessor = (index) => {
    if (index === undefined) return undefined;
    if (!accessorMap.has(index)) {
      accessorMap.set(index, accessors.length);
      accessors.push(json.accessors[index]);
    }
    return accessorMap.get(index);
  };
  for (const mesh of json.meshes) {
    for (const primitive of mesh.primitives) {
      for (const [name, index] of Object.entries(primitive.attributes))
        primitive.attributes[name] = keepAccessor(index);
      if (primitive.indices !== undefined) primitive.indices = keepAccessor(primitive.indices);
      for (const target of primitive.targets ?? []) {
        for (const [name, index] of Object.entries(target)) target[name] = keepAccessor(index);
      }
    }
  }
  for (const skin of json.skins ?? []) skin.inverseBindMatrices = keepAccessor(skin.inverseBindMatrices);
  for (const clip of json.animations) {
    for (const sampler of clip.samplers) {
      sampler.input = keepAccessor(sampler.input);
      sampler.output = keepAccessor(sampler.output);
    }
  }

  const viewMap = new Map();
  const views = [];
  const parts = [];
  let offset = 0;
  for (const accessor of accessors) {
    const old = accessor.bufferView;
    if (old === undefined) continue;
    if (!viewMap.has(old)) {
      const view = json.bufferViews[old];
      const start = view.byteOffset ?? 0;
      const bytes = bin.subarray(start, start + view.byteLength);
      const padding = (4 - (offset % 4)) % 4;
      if (padding) parts.push(Buffer.alloc(padding));
      offset += padding;
      viewMap.set(old, views.length);
      views.push({ ...view, buffer: 0, byteOffset: offset });
      parts.push(bytes);
      offset += bytes.length;
    }
    accessor.bufferView = viewMap.get(old);
  }

  json.accessors = accessors;
  json.bufferViews = views;
  const outBin = Buffer.concat(parts);
  json.buffers = [{ byteLength: outBin.length }];
  delete json.textures;
  delete json.images;
  delete json.samplers;
  return writeGlb(json, outBin);
}

const [, , sourceDir, destDir] = process.argv;
if (sourceDir && destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const [file, id] of Object.entries(PICKS)) {
    const out = slim(fs.readFileSync(path.join(sourceDir, file)));
    fs.writeFileSync(path.join(destDir, `${id}.glb`), out);
    console.log(id, `${Math.round(out.length / 1024)}KB`);
  }
}
