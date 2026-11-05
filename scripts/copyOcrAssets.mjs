// Copies Tesseract worker, WASM core and language data into the renderer public dir
// so OCR runs fully offline (no CDN requests).
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// fileURLToPath decodes %20 etc. (folder "My Project" contains a space)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'src/renderer/public/tesseract')
const nm = path.join(root, 'node_modules')

fs.mkdirSync(path.join(out, 'core'), { recursive: true })
fs.mkdirSync(path.join(out, 'lang'), { recursive: true })

fs.copyFileSync(path.join(nm, 'tesseract.js/dist/worker.min.js'), path.join(out, 'worker.min.js'))

const coreDir = path.join(nm, 'tesseract.js-core')
for (const f of fs.readdirSync(coreDir)) {
  if (/^tesseract-core.*\.(js|wasm)$/.test(f)) {
    fs.copyFileSync(path.join(coreDir, f), path.join(out, 'core', f))
  }
}

for (const lang of ['ind', 'eng']) {
  fs.copyFileSync(
    path.join(nm, `@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`),
    path.join(out, 'lang', `${lang}.traineddata.gz`)
  )
}
console.log('[ocr-assets] copied to', path.relative(root, out))
