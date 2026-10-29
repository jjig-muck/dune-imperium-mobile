import { deflateSync } from "node:zlib";
import { writeFile } from "node:fs/promises";
const crc = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) {
    c ^= byte;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const name = Buffer.from(type),
    out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length);
  name.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc(Buffer.concat([name, data])), 8 + data.length);
  return out;
}
for (const size of [192, 512]) {
  const data = Buffer.alloc((size * 4 + 1) * size),
    gold = [205, 178, 122],
    bg = [17, 24, 22];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const px = (x / size) * 192,
        py = (y / size) * 192,
        dist = Math.hypot(px - 96, py - 83);
      const outer =
        py >= 40 &&
        py <= 135 &&
        px >= 96 - ((py - 40) * 56) / 95 &&
        px <= 96 + ((py - 40) * 56) / 95;
      const inner =
        py >= 62 &&
        py <= 123 &&
        px >= 96 - ((py - 62) * 36) / 61 &&
        px <= 96 + ((py - 62) * 36) / 61;
      const on =
        (dist >= 42 && dist <= 44) ||
        (outer && !inner) ||
        (py >= 144 && py <= 146 && px >= 28 && px <= 164) ||
        (py >= 155 && py <= 157 && px >= 70 && px <= 122);
      const offset = y * (size * 4 + 1) + 1 + x * 4;
      const color = on ? gold : bg;
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = 255;
    }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  await writeFile(
    new URL(`../assets/icon-${size}.png`, import.meta.url),
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(data)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}
