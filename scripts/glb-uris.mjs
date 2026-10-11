import fs from "node:fs";

const files = process.argv.slice(2);
for (const file of files) {
  const buffer = fs.readFileSync(file);
  const length = buffer.readUInt32LE(12);
  const json = buffer.slice(20, 20 + length).toString("utf8");
  const uris = [...json.matchAll(/"uri":"[^"]+"/g)].map((match) => match[0]);
  console.log(file, uris.length ? uris.join(" ") : "embedded");
}
