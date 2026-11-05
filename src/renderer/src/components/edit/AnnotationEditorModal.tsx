import React, { useState, useRef, useEffect } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { PDFPageItem } from '../../types'
import { renderHighResPage } from '../../services/pdfThumbnail'
import { useTranslation } from '../../i18n/LanguageContext'
import {
  X,
  Pen,
  Highlighter,
  Square,
  Type,
  Check,
  Undo2,
  Trash2,
  Upload,
  Loader2,
  FileSignature,
  Stamp
} from 'lucide-react'

type ToolType = 'pen' | 'highlighter' | 'whiteout' | 'blackout' | 'text' | 'signature'

interface StampPreset {
  id: string
  label: string
  subtext: string
  color: string
}

const getStampPresets = (lang: string): StampPreset[] => [
  { id: 'paid', label: lang === 'id' ? 'LUNAS' : 'PAID', subtext: lang === 'id' ? 'TELAH DIBAYAR LUNAS' : 'PAYMENT VERIFIED', color: '#059669' },
  { id: 'confidential', label: lang === 'id' ? 'RAHASIA' : 'CONFIDENTIAL', subtext: lang === 'id' ? 'DOKUMEN RAHASIA' : 'CONFIDENTIAL DOCUMENT', color: '#dc2626' },
  { id: 'approved', label: lang === 'id' ? 'DISETUJUI' : 'APPROVED', subtext: lang === 'id' ? 'APPROVED & SIGNED' : 'FORMAL APPROVAL', color: '#2563eb' },
  { id: 'draft', label: lang === 'id' ? 'DRAFT' : 'DRAFT', subtext: lang === 'id' ? 'BELUM FINAL' : 'NOT FINALIZED', color: '#d97706' },
  { id: 'salinan', label: lang === 'id' ? 'SALINAN SAH' : 'CERTIFIED COPY', subtext: lang === 'id' ? 'SESUAI DOKUMEN ASLI' : 'OFFICIAL DOCUMENT COPY', color: '#0891b2' }
]

interface AnnotationEditorModalProps {
  isOpen: boolean
  onClose: () => void
  pageItem: PDFPageItem | null
  pdfBytes: Uint8Array | null
  onSaveAnnotation: (pageId: string, overlayDataUrl: string) => void
}

export const AnnotationEditorModal: React.FC<AnnotationEditorModalProps> = ({
  isOpen,
  onClose,
  pageItem,
  pdfBytes,
  onSaveAnnotation
}) => {
  if (!isOpen || !pageItem || !pdfBytes) return null
  const { t, lang } = useTranslation()
  const stampPresets = getStampPresets(lang)

  // Active Tool state
  const [activeTool, setActiveTool] = useState<ToolType>('pen')
  const [color, setColor] = useState<string>('#000000')
  const [strokeWidth, setStrokeWidth] = useState<number>(2)

  // Loading & View state
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({
    width: 600,
    height: 850
  })

  // History stack for undo
  const [history, setHistory] = useState<ImageData[]>([])

  // Text insertion state
  const [textModalOpen, setTextModalOpen] = useState(false)
  const [textInput, setTextInput] = useState('Catatan')
  const [textCoord, setTextCoord] = useState<{ x: number; y: number } | null>(null)
  const [fontSize, setFontSize] = useState(14)

  // Signature modal state
  const [sigPadOpen, setSigPadOpen] = useState(false)
  const [stampMenuOpen, setStampMenuOpen] = useState(false)
  const sigCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isSigDrawing, setIsSigDrawing] = useState(false)

  // Canvases refs
  const bgCanvasRef = useRef<HTMLCanvasElement>(null)
  const drawCanvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const rectStartCoord = useRef<{ x: number; y: number } | null>(null)

  // Load PDF page and render background directly to canvas
  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    const renderDirect = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({
          data: pdfBytes.slice(0)
        })
        const pdf = await loadingTask.promise
        if (!isMounted) return

        const page = await pdf.getPage(pageItem.originalIndex + 1)
        const totalRotation = ((page.rotate || 0) + (pageItem.rotation || 0)) % 360
        const viewport = page.getViewport({ scale: 1.6, rotation: totalRotation })
        if (!isMounted) return

        setCanvasDimensions({ width: viewport.width, height: viewport.height })

        const bgCanvas = bgCanvasRef.current
        if (bgCanvas) {
          bgCanvas.width = viewport.width
          bgCanvas.height = viewport.height
          const ctx = bgCanvas.getContext('2d')
          if (ctx) {
            // Isi latar belakang dengan putih solid agar teks PDF terbaca jelas
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, viewport.width, viewport.height)
            await page.render({
              canvasContext: ctx,
              viewport
            }).promise
          }
        }

        // Initialize drawing canvas
        const drawCanvas = drawCanvasRef.current
        if (drawCanvas) {
          drawCanvas.width = viewport.width
          drawCanvas.height = viewport.height
          const drawCtx = drawCanvas.getContext('2d')
          if (drawCtx) {
            drawCtx.clearRect(0, 0, viewport.width, viewport.height)

            // Restore existing annotation if any
            if (pageItem.annotationOverlay) {
              const existingImg = new Image()
              existingImg.onload = () => {
                drawCtx.drawImage(existingImg, 0, 0)
                saveStateToHistory()
              }
              existingImg.src = pageItem.annotationOverlay
            } else {
              saveStateToHistory()
            }
          }
        }
      } catch (err) {
        console.error('Gagal render halaman PDF di editor:', err)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    renderDirect()

    return () => {
      isMounted = false
    }
  }, [pageItem.id, pageItem.rotation, isOpen])

  // Save current drawing canvas state to history for Undo
  const saveStateToHistory = () => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const state = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHistory((prev) => [...prev.slice(-15), state])
  }

  // Undo last action
  const handleUndo = () => {
    if (history.length <= 1) {
      handleClear()
      return
    }
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const newHistory = [...history]
    newHistory.pop() // remove current
    const previous = newHistory[newHistory.length - 1]
    if (previous) {
      ctx.putImageData(previous, 0, 0)
    }
    setHistory(newHistory)
  }

  // Clear all annotations
  const handleClear = () => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setHistory([])
      saveStateToHistory()
    }
  }

  // Get canvas coordinates from mouse event
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  // Mouse Down
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e)

    if (activeTool === 'text') {
      setTextCoord(coords)
      setTextModalOpen(true)
      return
    }

    isDrawing.current = true
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      ctx.beginPath()
      ctx.moveTo(coords.x, coords.y)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (activeTool === 'pen') {
        ctx.strokeStyle = color
        ctx.lineWidth = strokeWidth
        ctx.globalAlpha = 1.0
      } else {
        ctx.strokeStyle = color === '#000000' ? '#eab308' : color
        ctx.lineWidth = 14
        ctx.globalAlpha = 0.35
      }
    } else if (activeTool === 'whiteout' || activeTool === 'blackout') {
      rectStartCoord.current = coords
    }
  }

  // Mouse Move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return
    const coords = getCanvasCoords(e)
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      ctx.lineTo(coords.x, coords.y)
      ctx.stroke()
    }
  }

  // Mouse Up
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return
    isDrawing.current = false
    const coords = getCanvasCoords(e)
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (activeTool === 'whiteout' || activeTool === 'blackout') {
      if (rectStartCoord.current) {
        const startX = Math.min(rectStartCoord.current.x, coords.x)
        const startY = Math.min(rectStartCoord.current.y, coords.y)
        const w = Math.abs(coords.x - rectStartCoord.current.x)
        const h = Math.abs(coords.y - rectStartCoord.current.y)

        ctx.globalAlpha = 1.0
        ctx.fillStyle = activeTool === 'whiteout' ? '#ffffff' : '#000000'
        ctx.fillRect(startX, startY, w, h)

        rectStartCoord.current = null
      }
    }

    ctx.closePath()
    saveStateToHistory()
  }

  // Insert Custom Text
  const handleAddTextConfirm = () => {
    if (!textCoord || !textInput.trim()) {
      setTextModalOpen(false)
      return
    }
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.globalAlpha = 1.0
      ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
      ctx.fillStyle = color
      ctx.fillText(textInput.trim(), textCoord.x, textCoord.y)
      saveStateToHistory()
    }
    setTextModalOpen(false)
    setTextCoord(null)
  }

  // Signature Pad Handlers
  const handleSigMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsSigDrawing(true)
    const canvas = sigCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  const handleSigMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSigDrawing) return
    const canvas = sigCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  const handleSigMouseUp = () => {
    setIsSigDrawing(false)
  }

  const handleClearSig = () => {
    const canvas = sigCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  // Stamp Signature onto the drawing canvas
  const handleApplySignature = () => {
    const sigCanvas = sigCanvasRef.current
    const drawCanvas = drawCanvasRef.current
    if (!sigCanvas || !drawCanvas) return

    const drawCtx = drawCanvas.getContext('2d')
    if (!drawCtx) return

    // Position signature at bottom right quadrant by default
    const stampWidth = Math.min(220, drawCanvas.width * 0.35)
    const stampHeight = stampWidth * (sigCanvas.height / sigCanvas.width)
    const posX = drawCanvas.width - stampWidth - 40
    const posY = drawCanvas.height - stampHeight - 60

    drawCtx.globalAlpha = 1.0
    drawCtx.drawImage(sigCanvas, posX, posY, stampWidth, stampHeight)
    saveStateToHistory()
    setSigPadOpen(false)
    handleClearSig()
  }

  // Upload Signature Image PNG
  const handleUploadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const drawCanvas = drawCanvasRef.current
        if (!drawCanvas) return
        const drawCtx = drawCanvas.getContext('2d')
        if (!drawCtx) return

        const stampWidth = Math.min(200, drawCanvas.width * 0.35)
        const stampHeight = stampWidth * (img.height / img.width)
        const posX = drawCanvas.width - stampWidth - 40
        const posY = drawCanvas.height - stampHeight - 60

        drawCtx.globalAlpha = 1.0
        drawCtx.drawImage(img, posX, posY, stampWidth, stampHeight)
        saveStateToHistory()
        setSigPadOpen(false)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Apply Business Stamp
  const handleApplyStamp = (preset: StampPreset) => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const now = new Date()
    const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`
    const fullSubtext = `${preset.subtext} • ${dateStr}`

    const centerX = canvas.width / 2
    const centerY = canvas.height * 0.45

    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate((-12 * Math.PI) / 180)

    const width = 230
    const height = 80
    const halfW = width / 2
    const halfH = height / 2

    // Background semi-transparan tipis
    ctx.fillStyle = `${preset.color}0D`
    ctx.fillRect(-halfW, -halfH, width, height)

    // Border ganda khas stempel kantor
    ctx.strokeStyle = preset.color
    ctx.lineWidth = 3.5
    ctx.strokeRect(-halfW, -halfH, width, height)

    ctx.lineWidth = 1.2
    ctx.strokeRect(-halfW + 4, -halfH + 4, width - 8, height - 8)

    // Teks Utama
    ctx.fillStyle = preset.color
    ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(preset.label, 0, -8)

    // Garis pemisah tipis
    ctx.beginPath()
    ctx.moveTo(-halfW + 15, 8)
    ctx.lineTo(halfW - 15, 8)
    ctx.strokeStyle = preset.color
    ctx.lineWidth = 1
    ctx.stroke()

    // Subteks tanggal & keterangan
    ctx.font = 'bold 9px monospace'
    ctx.fillText(fullSubtext, 0, 20)

    ctx.restore()
    saveStateToHistory()
    setStampMenuOpen(false)
  }

  // Save changes and exit
  const handleApplyAndClose = () => {
    const drawCanvas = drawCanvasRef.current
    if (!drawCanvas) return
    const overlayUrl = drawCanvas.toDataURL('image/png')
    onSaveAnnotation(pageItem.id, overlayUrl)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="w-full max-w-5xl h-[92vh] bg-zinc-900 text-zinc-100 rounded-2xl shadow-2xl border border-zinc-800 flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="h-12 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-zinc-100">
              {t.annotatePage}
            </span>
            <span className="font-mono text-[11px] text-zinc-500">
              • {t.pageNumbersShort} #{pageItem.pageIndex}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleApplyAndClose}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-900 hover:bg-white shadow-xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t.apply}</span>
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="h-11 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0 bg-zinc-900 text-xs">
          {/* Tools Selector */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTool('pen')}
              title={t.pen}
              className={`p-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                activeTool === 'pen'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Pen className="w-3.5 h-3.5" />
              <span className="text-[11px]">{t.pen}</span>
            </button>

            <button
              onClick={() => setActiveTool('highlighter')}
              title={t.highlighter}
              className={`p-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                activeTool === 'highlighter'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span className="text-[11px]">{t.highlighter}</span>
            </button>

            <button
              onClick={() => setActiveTool('whiteout')}
              title={t.whiteout}
              className={`p-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                activeTool === 'whiteout'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Square className="w-3.5 h-3.5 text-zinc-300" />
              <span className="text-[11px]">{t.whiteout}</span>
            </button>

            <button
              onClick={() => setActiveTool('blackout')}
              title={t.blackout}
              className={`p-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                activeTool === 'blackout'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Square className="w-3.5 h-3.5 fill-zinc-950 text-zinc-700" />
              <span className="text-[11px]">{t.blackout}</span>
            </button>

            <button
              onClick={() => setActiveTool('text')}
              title={t.text}
              className={`p-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                activeTool === 'text'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span className="text-[11px]">{t.text}</span>
            </button>

            <div className="h-4 w-[1px] bg-zinc-800 mx-1" />

            <button
              onClick={() => setSigPadOpen(true)}
              title={t.signature}
              className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-750 text-zinc-200 flex items-center gap-1.5 transition-colors"
            >
              <FileSignature className="w-3.5 h-3.5 text-zinc-300" />
              <span className="text-[11px] font-medium">+ {t.signature}</span>
            </button>

            {/* Stamp Menu Button & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setStampMenuOpen(!stampMenuOpen)}
                title={t.stamp}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
                  stampMenuOpen
                    ? 'bg-zinc-700 text-zinc-100 font-medium'
                    : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200'
                }`}
              >
                <Stamp className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-medium">+ {t.stamp}</span>
              </button>

              {stampMenuOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-56 rounded-xl bg-zinc-900 border border-zinc-750 shadow-2xl p-1.5 z-60 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-mono uppercase text-zinc-400 tracking-wider">
                    {t.selectStamp}
                  </div>
                  {stampPresets.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => handleApplyStamp(st)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/90 transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div
                          className="text-xs font-black tracking-wider"
                          style={{ color: st.color }}
                        >
                          {st.label}
                        </div>
                        <div className="text-[9px] font-mono text-zinc-500">
                          {st.subtext}
                        </div>
                      </div>
                      <div
                        className="w-2 h-2 rounded-full opacity-60 group-hover:opacity-100"
                        style={{ backgroundColor: st.color }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Color & Stroke Controls */}
          <div className="flex items-center gap-2">
            {(activeTool === 'pen' || activeTool === 'text') && (
              <div className="flex items-center gap-1">
                {['#000000', '#1d4ed8', '#b91c1c'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-4 h-4 rounded-full border ${
                      color === c ? 'border-white scale-110 ring-1 ring-white/50' : 'border-zinc-700'
                    }`}
                  />
                ))}
              </div>
            )}

            {activeTool === 'pen' && (
              <div className="flex items-center gap-1 pl-2">
                {[1.5, 3, 5].map((w) => (
                  <button
                    key={w}
                    onClick={() => setStrokeWidth(w)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      strokeWidth === w ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-500'
                    }`}
                  >
                    {w}px
                  </button>
                ))}
              </div>
            )}

            <div className="h-4 w-[1px] bg-zinc-800 mx-1" />

            {/* Undo & Clear */}
            <button
              onClick={handleUndo}
              title={t.undoAction}
              className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleClear}
              title={t.clearAllDrawings}
              className="p-1.5 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Canvas Work Area */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-zinc-950/80 relative">
          <div
            className="relative shadow-2xl rounded border border-zinc-700/80 bg-white"
            style={{
              width: canvasDimensions.width,
              height: canvasDimensions.height
            }}
          >
            {/* Background Canvas (PDF Page Content) - Selalu di-mount agar ref tidak null saat render */}
            <canvas
              ref={bgCanvasRef}
              className="absolute inset-0 pointer-events-none rounded"
            />

            {/* Foreground Canvas (Drawings / Whiteout / Signatures) */}
            <canvas
              ref={drawCanvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="absolute inset-0 cursor-crosshair rounded"
            />

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-zinc-300 text-xs font-mono rounded z-10">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                <span>{t.renderingPage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Text Input Modal */}
        {textModalOpen && (
          <div className="absolute inset-0 z-60 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 w-72 space-y-3 shadow-2xl">
              <span className="text-xs font-semibold text-zinc-200">{t.addTextPrompt}</span>
              <input
                type="text"
                autoFocus
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTextConfirm()}
                className="w-full px-2.5 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-100 focus:outline-none"
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 text-[11px] font-mono">{t.textSize} {fontSize}px</span>
                <input
                  type="range"
                  min={10}
                  max={36}
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                  className="w-24 accent-zinc-100"
                />
              </div>
              <div className="flex justify-end gap-1.5 pt-2">
                <button
                  onClick={() => setTextModalOpen(false)}
                  className="px-2.5 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleAddTextConfirm}
                  className="px-3 py-1 rounded bg-zinc-100 text-zinc-900 text-xs font-semibold"
                >
                  {t.done}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Signature Pad Modal */}
        {sigPadOpen && (
          <div className="absolute inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 w-full max-w-sm space-y-3.5 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <FileSignature className="w-4 h-4 text-zinc-400" />
                  {t.drawSignature}
                </span>
                <button
                  onClick={() => setSigPadOpen(false)}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Signature Canvas Box */}
              <div className="border border-dashed border-zinc-700 rounded-xl overflow-hidden bg-white">
                <canvas
                  ref={sigCanvasRef}
                  width={320}
                  height={140}
                  onMouseDown={handleSigMouseDown}
                  onMouseMove={handleSigMouseMove}
                  onMouseUp={handleSigMouseUp}
                  className="w-full h-36 cursor-crosshair"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  onClick={handleClearSig}
                  className="text-zinc-500 hover:text-rose-400 text-[11px] font-mono"
                >
                  {t.clearPad}
                </button>

                {/* Upload PNG Signature Option */}
                <label className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer">
                  <Upload className="w-3 h-3" />
                  <span>{t.uploadPng}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleUploadSignature}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setSigPadOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:bg-zinc-800"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleApplySignature}
                  className="px-4 py-1.5 rounded-lg bg-zinc-100 text-zinc-900 text-xs font-semibold hover:bg-white"
                >
                  {t.pasteToDoc}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
