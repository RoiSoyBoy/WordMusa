import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { inflate } from 'pako';

// Parse PNG bytes and return array of {r,g,b} for every pixel.
function parsePngPixels(bytes) {
  const view = new DataView(bytes.buffer ?? bytes);

  // Walk chunks
  let offset = 8; // skip 8-byte PNG signature
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idatChunks = [];

  while (offset < bytes.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(bytes[offset+4], bytes[offset+5], bytes[offset+6], bytes[offset+7]);
    const data = bytes.slice(offset + 8, offset + 8 + length);

    if (type === 'IHDR') {
      width     = view.getUint32(offset + 8);
      height    = view.getUint32(offset + 12);
      bitDepth  = bytes[offset + 16];
      colorType = bytes[offset + 17];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length; // length(4) + type(4) + data + crc(4)
  }

  if (!idatChunks.length || bitDepth !== 8) return [];

  // Channels per pixel: colorType 2 = RGB, 6 = RGBA
  const channels = colorType === 6 ? 4 : 3;
  const combined = new Uint8Array(idatChunks.reduce((n, c) => n + c.length, 0));
  let pos = 0;
  for (const c of idatChunks) { combined.set(c, pos); pos += c.length; }

  const raw = inflate(combined); // decompress DEFLATE
  const pixels = [];
  const stride = width * channels + 1; // +1 for filter byte per row

  for (let y = 0; y < height; y++) {
    const rowBase = y * stride + 1; // skip filter byte
    for (let x = 0; x < width; x++) {
      const i = rowBase + x * channels;
      pixels.push({ r: raw[i], g: raw[i+1], b: raw[i+2] });
    }
  }
  return pixels;
}

function toHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// Darken a color so it works well as a gradient backdrop (avoids washed-out light colors)
function darkenColor(r, g, b, factor = 0.55) {
  return toHex(Math.round(r * factor), Math.round(g * factor), Math.round(b * factor));
}

export async function extractAlbumColor(imageUrl) {
  let localUri = null;
  try {
    // 1. Download to local cache (ImageManipulator can't read remote URLs)
    const dest = FileSystem.cacheDirectory + 'album_thumb.jpg';
    await FileSystem.downloadAsync(imageUrl, dest);
    localUri = dest;

    // 2. Resize to tiny thumbnail so we sample representative colors quickly
    const small = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: 10, height: 10 } }],
      { format: ImageManipulator.SaveFormat.PNG, base64: true }
    );

    if (!small.base64) return null;

    // 3. Decode base64 → Uint8Array
    const binary = atob(small.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    // 3. Parse PNG pixel data
    const pixels = parsePngPixels(bytes);
    if (!pixels.length) return null;

    // 4. Average all pixel colors
    let rSum = 0, gSum = 0, bSum = 0;
    for (const { r, g, b } of pixels) { rSum += r; gSum += g; bSum += b; }
    const n = pixels.length;
    const r = Math.round(rSum / n);
    const g = Math.round(gSum / n);
    const b = Math.round(bSum / n);

    // 5. Darken so it reads as a rich background, not a washed-out overlay
    return darkenColor(r, g, b, 0.55);
  } catch (err) {
    console.log('[color] ERROR:', err.message);
    return null;
  }
}
