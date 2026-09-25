// coverart.js — lee la imagen de portada guardada dentro del propio archivo de audio.
// Soporta ID3v2 (MP3), FLAC y contenedores MP4/M4A. Si no encuentra nada, devuelve null
// y la app usa un color generado a partir del nombre como respaldo visual.

function synchsafe(b, o) { return ((b[o] & 0x7f) << 21) | ((b[o + 1] & 0x7f) << 14) | ((b[o + 2] & 0x7f) << 7) | (b[o + 3] & 0x7f); }
function be32(b, o) { return (b[o] << 24 | b[o + 1] << 16 | b[o + 2] << 8 | b[o + 3]) >>> 0; }
function findMime(bytes, start) {
  if (bytes[start] === 0xff && bytes[start + 1] === 0xd8) return 'image/jpeg';
  if (bytes[start] === 0x89 && bytes[start + 1] === 0x50) return 'image/png';
  return 'image/jpeg';
}

function fromID3(bytes) {
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return null; // "ID3"
  const ver = bytes[3];
  const tagSize = synchsafe(bytes, 6);
  let off = 10;
  const end = Math.min(bytes.length, 10 + tagSize);
  while (off < end - 10) {
    const id = String.fromCharCode(bytes[off], bytes[off + 1], bytes[off + 2], bytes[off + 3]);
    let size;
    if (ver >= 4) size = synchsafe(bytes, off + 4); else size = be32(bytes, off + 4);
    if (!id.trim() || size <= 0 || off + 10 + size > bytes.length) break;
    if (id === 'APIC') {
      let p = off + 10;
      const enc = bytes[p]; p++;
      let mEnd = p; while (mEnd < off + 10 + size && bytes[mEnd] !== 0) mEnd++;
      const mime = String.fromCharCode(...bytes.slice(p, mEnd)) || 'image/jpeg';
      p = mEnd + 1;
      p += 1; // picture type byte
      // descripción, terminada en \0 (o \0\0 si UTF-16)
      if (enc === 1 || enc === 2) { while (p < off + 10 + size - 1 && !(bytes[p] === 0 && bytes[p + 1] === 0)) p += 2; p += 2; }
      else { while (p < off + 10 + size && bytes[p] !== 0) p++; p++; }
      const data = bytes.slice(p, off + 10 + size);
      if (data.length > 100) return { mime: mime.includes('/') ? mime : 'image/jpeg', data };
    }
    off += 10 + size;
  }
  return null;
}

function fromFLAC(bytes) {
  if (String.fromCharCode(...bytes.slice(0, 4)) !== 'fLaC') return null;
  let off = 4;
  while (off + 4 <= bytes.length) {
    const header = bytes[off];
    const last = (header & 0x80) !== 0;
    const type = header & 0x7f;
    const len = (bytes[off + 1] << 16) | (bytes[off + 2] << 8) | bytes[off + 3];
    const bodyStart = off + 4;
    if (type === 6) { // PICTURE
      let p = bodyStart;
      p += 4; // picture type
      const mLen = be32(bytes, p); p += 4;
      const mime = String.fromCharCode(...bytes.slice(p, p + mLen)); p += mLen;
      const dLen = be32(bytes, p); p += 4;
      p += dLen; // descripción
      p += 16; // width,height,depth,colors
      const dataLen = be32(bytes, p); p += 4;
      const data = bytes.slice(p, p + dataLen);
      if (data.length > 100) return { mime: mime.includes('/') ? mime : 'image/jpeg', data };
    }
    off = bodyStart + len;
    if (last || len < 0) break;
  }
  return null;
}

// Contenedor MP4/M4A: busca moov/udta/meta/ilst/covr -> data
function fromMP4(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  function walk(start, end, path) {
    let off = start;
    while (off + 8 <= end) {
      let size = dv.getUint32(off);
      const type = String.fromCharCode(bytes[off + 4], bytes[off + 5], bytes[off + 6], bytes[off + 7]);
      let bodyStart = off + 8;
      if (size === 1) { size = Number(dv.getBigUint64(off + 8)); bodyStart = off + 16; }
      if (size <= 0) break;
      const bodyEnd = off + size;
      if (type === 'covr') {
        let p = bodyStart;
        while (p + 8 <= bodyEnd) {
          const dsize = dv.getUint32(p);
          const dtype = String.fromCharCode(bytes[p + 4], bytes[p + 5], bytes[p + 6], bytes[p + 7]);
          if (dtype === 'data' && dsize > 16) {
            const flags = dv.getUint32(p + 8);
            const data = bytes.slice(p + 16, p + dsize);
            const mime = flags === 14 ? 'image/png' : 'image/jpeg';
            if (data.length > 100) return { mime, data };
          }
          if (dsize <= 0) break;
          p += dsize;
        }
      }
      if (['moov', 'udta', 'meta', 'ilst'].includes(type)) {
        const inner = type === 'meta' ? bodyStart + 4 : bodyStart; // meta tiene 4 bytes de version/flags
        const r = walk(inner, bodyEnd, path.concat(type));
        if (r) return r;
      }
      off = bodyEnd;
    }
    return null;
  }
  return walk(0, bytes.length, []);
}

/**
 * Intenta extraer la portada incrustada en un archivo de audio.
 * @param {File} file
 * @returns {Promise<Blob|null>}
 */
export async function extractCoverArt(file) {
  try {
    const head = new Uint8Array(await file.slice(0, 2_500_000).arrayBuffer());
    let res = null;
    if (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) res = fromID3(head);
    else if (String.fromCharCode(...head.slice(0, 4)) === 'fLaC') res = fromFLAC(head);
    else if (String.fromCharCode(...head.slice(4, 8)) === 'ftyp') res = fromMP4(head);
    if (!res) return null;
    return new Blob([res.data], { type: res.mime || findMime(res.data, 0) });
  } catch (e) { return null; }
}
