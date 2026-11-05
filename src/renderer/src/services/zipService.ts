import pako from 'pako'

// CRC32 Lookup Table
const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  CRC_TABLE[i] = c
}

export function calculateCrc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}

export interface ZipFileEntry {
  name: string
  data: Uint8Array
}

/**
 * Builds a valid PKZip archive in pure TypeScript using Pako deflateRaw
 */
export function buildZipArchive(files: ZipFileEntry[]): Uint8Array {
  const fileRecords: {
    nameBytes: Uint8Array
    compressedData: Uint8Array
    crc: number
    uncompressedSize: number
    compressedSize: number
    localHeaderOffset: number
  }[] = []

  const parts: Uint8Array[] = []
  let currentOffset = 0

  const encoder = new TextEncoder()

  // 1. Write Local File Headers & File Data
  for (const file of files) {
    const nameBytes = encoder.encode(file.name)
    const crc = calculateCrc32(file.data)
    const uncompressedSize = file.data.byteLength

    // Deflate with pako
    const compressedData = pako.deflateRaw(file.data, { level: 6 })
    const compressedSize = compressedData.byteLength

    const localHeaderOffset = currentOffset

    // Local file header (30 bytes + name length)
    const header = new Uint8Array(30 + nameBytes.length)
    const view = new DataView(header.buffer)

    view.setUint32(0, 0x04034b50, true) // Local header signature
    view.setUint16(4, 20, true) // Version needed (2.0)
    view.setUint16(6, 0x0800, true) // General purpose flag: Bit 11 set for UTF-8 names
    view.setUint16(8, 8, true) // Compression method: 8 (Deflate)
    view.setUint16(10, 0, true) // Mod time
    view.setUint16(12, 0, true) // Mod date
    view.setUint32(14, crc, true) // CRC32
    view.setUint32(18, compressedSize, true) // Compressed size
    view.setUint32(22, uncompressedSize, true) // Uncompressed size
    view.setUint16(26, nameBytes.length, true) // File name length
    view.setUint16(28, 0, true) // Extra field length

    header.set(nameBytes, 30)

    parts.push(header)
    parts.push(compressedData)

    currentOffset += header.byteLength + compressedData.byteLength

    fileRecords.push({
      nameBytes,
      compressedData,
      crc,
      uncompressedSize,
      compressedSize,
      localHeaderOffset
    })
  }

  const centralDirStartOffset = currentOffset

  // 2. Write Central Directory Headers
  for (const rec of fileRecords) {
    const cdHeader = new Uint8Array(46 + rec.nameBytes.length)
    const view = new DataView(cdHeader.buffer)

    view.setUint32(0, 0x02014b50, true) // Central directory signature
    view.setUint16(4, 20, true) // Version made by
    view.setUint16(6, 20, true) // Version needed
    view.setUint16(8, 0x0800, true) // Flag (UTF-8)
    view.setUint16(10, 8, true) // Compression method (Deflate)
    view.setUint16(12, 0, true) // Mod time
    view.setUint16(14, 0, true) // Mod date
    view.setUint32(16, rec.crc, true) // CRC32
    view.setUint32(20, rec.compressedSize, true) // Compressed size
    view.setUint32(24, rec.uncompressedSize, true) // Uncompressed size
    view.setUint16(28, rec.nameBytes.length, true) // File name length
    view.setUint16(30, 0, true) // Extra field length
    view.setUint16(32, 0, true) // File comment length
    view.setUint16(34, 0, true) // Disk number start
    view.setUint16(36, 0, true) // Internal file attributes
    view.setUint32(38, 0, true) // External file attributes
    view.setUint32(42, rec.localHeaderOffset, true) // Relative offset of local header

    cdHeader.set(rec.nameBytes, 46)
    parts.push(cdHeader)

    currentOffset += cdHeader.byteLength
  }

  const centralDirSize = currentOffset - centralDirStartOffset

  // 3. Write End of Central Directory Record (EOCD - 22 bytes)
  const eocd = new Uint8Array(22)
  const eocdView = new DataView(eocd.buffer)

  eocdView.setUint32(0, 0x06054b50, true) // EOCD signature
  eocdView.setUint16(4, 0, true) // Disk number
  eocdView.setUint16(6, 0, true) // Disk with central dir
  eocdView.setUint16(8, fileRecords.length, true) // Entries on this disk
  eocdView.setUint16(10, fileRecords.length, true) // Total entries
  eocdView.setUint32(12, centralDirSize, true) // Central directory size
  eocdView.setUint32(16, centralDirStartOffset, true) // Offset of start of central directory
  eocdView.setUint16(20, 0, true) // Comment length

  parts.push(eocd)

  // Merge all parts into a single Uint8Array
  const totalLength = parts.reduce((acc, p) => acc + p.byteLength, 0)
  const result = new Uint8Array(totalLength)
  let pos = 0
  for (const part of parts) {
    result.set(part, pos)
    pos += part.byteLength
  }

  return result
}
