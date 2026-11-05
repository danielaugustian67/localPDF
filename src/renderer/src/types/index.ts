export interface PDFFileItem {
  id: string
  name: string
  path?: string
  size: number
  pageCount: number
  data: Uint8Array
  thumbnail?: string
}

export interface PDFPageItem {
  id: string
  pageIndex: number // 1-based index for display
  originalIndex: number // 0-based index in the original document
  rotation: number // 0, 90, 180, 270
  thumbnail?: string
  isDeleted?: boolean
  annotationOverlay?: string // Base64 PNG data URL of drawn annotations/whiteout/eSign
}

export interface WatermarkOptions {
  enabled: boolean
  text: string
  opacity: number // 0.1 to 1.0
  fontSize: number
  color: string // hex
  rotation: number // degrees, e.g. 45
}

export interface PageNumberOptions {
  enabled: boolean
  position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left'
  format: 'number' | 'page-of-total' // "1" vs "Halaman 1 dari 10"
  startFrom: number
  fontSize: number
}

export type SplitMode = 'range' | 'every-n' | 'all'

export interface SplitResultFile {
  name: string
  pageDescription: string
  data: Uint8Array
}

export type CompressLevel = 'extreme' | 'balanced' | 'light'

export interface ImageFileItem {
  id: string
  name: string
  size: number
  data: Uint8Array
  dataUrl: string
  width?: number
  height?: number
}

export type PageSizeOption = 'A4' | 'Letter' | 'fit'
export type OrientationOption = 'auto' | 'portrait' | 'landscape'
export type MarginOption = 'none' | 'small' | 'normal'

export interface ImageToPdfOptions {
  pageSize: PageSizeOption
  orientation: OrientationOption
  margin: MarginOption
}

export interface PdfToImageResult {
  pageNumber: number
  name: string
  dataUrl: string
  blob: Blob
  size: number
}

export interface PDFMetadata {
  title: string
  author: string
  subject: string
  keywords: string
  creator: string
  producer: string
  creationDate: string
  modificationDate: string
}

export type NUpLayout = '2-up' | '4-up'

export interface PDFToDocxOptions {
  mode: 'digital' | 'ocr'
  includeHeadingStyle?: boolean
}

export interface ExtractedTableRow {
  cells: string[]
  pageNumber: number
}

export interface PDFToExcelResult {
  xlsxBytes: Uint8Array
  csvContent: string
  rows: ExtractedTableRow[]
  totalRows: number
  totalColumns: number
  pageCount: number
}

export interface ExtractedImageItem {
  id: string
  pageNumber: number
  name: string
  width: number
  height: number
  dataUrl: string
  bytes: Uint8Array
  sizeKb: number
  format: 'png' | 'jpeg'
}

export interface PDFTextResult {
  plainText: string
  markdownText: string
  wordCount: number
  characterCount: number
  lineCount: number
  pageCount: number
}

export interface RepairDiagnostics {
  hasValidHeader: boolean
  hasValidEof: boolean
  isLoadable: boolean
  issuesDetected: string[]
  pageCount: number
}

export interface RepairResult {
  repairedBytes: Uint8Array
  recoveredPages: number
  fixesApplied: string[]
}

export interface ComparePageResult {
  dataUrlA: string
  dataUrlB: string
  diffDataUrl: string
  hasDifferences: boolean
  diffPixelPercent: number
}


