/**
 * Read pixel dimensions from PNG or JPEG bytes without a dependency.
 * PNG: width/height are big-endian uint32 at offsets 16 and 20 (inside IHDR).
 * JPEG: walk the marker segments until a Start Of Frame marker; height and
 * width are big-endian uint16 at +5 and +7 from the marker.
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function readImageDimensions(bytes: Uint8Array, mimeType: string): ImageDimensions {
  if (mimeType === 'image/png') return readPng(bytes);
  if (mimeType === 'image/jpeg') return readJpeg(bytes);
  throw new Error(`Unsupported image type: ${mimeType}`);
}

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function readPng(bytes: Uint8Array): ImageDimensions {
  const signatureOk = bytes.length >= 24 && PNG_SIGNATURE.every((value, i) => bytes[i] === value);
  if (!signatureOk) throw new Error('Not a PNG file');
  const dv = view(bytes);
  return { width: dv.getUint32(16), height: dv.getUint32(20) };
}

/** SOF0–SOF15 except DHT (C4), JPG (C8) and DAC (CC), which are not frame headers. */
function isStartOfFrame(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

function readJpeg(bytes: Uint8Array): ImageDimensions {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8)
    throw new Error('Not a JPEG file');
  const dv = view(bytes);
  let offset = 2;
  while (offset + 9 <= bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error('Malformed JPEG segment');
    const marker = dv.getUint8(offset + 1);
    if (marker === 0xff) {
      offset += 1; // padding byte
      continue;
    }
    if (isStartOfFrame(marker)) {
      return { height: dv.getUint16(offset + 5), width: dv.getUint16(offset + 7) };
    }
    if (marker === 0xd9 || marker === 0xda) break; // EOI or SOS: no frame header found
    const segmentLength = dv.getUint16(offset + 2);
    offset += 2 + segmentLength;
  }
  throw new Error('JPEG has no frame header');
}
