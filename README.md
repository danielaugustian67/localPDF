<p align="center">
  <img src="src/renderer/public/logo.svg" width="72" height="72" alt="LocalPDF Logo" />
</p>

<h1 align="center">LocalPDF</h1>

<p align="center">
  Aplikasi desktop PDF offline dengan mesin OCR WebAssembly lokal.<br>
  Semua pemrosesan berjalan 100% di komputer pengguna. Tanpa server, tanpa analitik, tanpa telemetri.
</p>

---

## Fitur

### Dokumen
- **Merge PDF**: Gabung banyak berkas PDF dengan pratinjau thumbnail dan drag-and-drop.
- **Split PDF**: Pisah berdasarkan rentang halaman kustom (`1-3, 5, 8`), tiap N halaman, atau pecah per lembar.
- **Page Manager & eSign**: Rotasi, hapus halaman, nomor halaman, cap watermark, tanda tangan digital (eSign pad), pena coret, stabilo, whiteout, dan sensor redaction permanen.
- **N-Up Print**: Susun 2-in-1 atau 4-in-1 halaman dalam satu lembar cetak (A4/Letter).
- **Compare PDF**: Bandingkan 2 dokumen PDF secara berdampingan dengan deteksi perbedaan visual per halaman.

### Konversi & OCR
- **OCR PDF**: Ekstraksi teks dari dokumen scan fisik, nota, dan KTP menggunakan Tesseract.js WebAssembly. Dilengkapi binarisasi adaptif Otsu dan histogram stretching. Output: Searchable PDF (invisible text layer), Word (.docx), atau Plain Text. Bahasa: Indonesia (`ind`) dan Inggris (`eng`).
- **PDF to Word (.docx)**: Ekstraksi struktur paragraf dan heading ke dokumen Word asli tanpa server pihak ketiga. Mendukung mode scan OCR.
- **PDF to Excel (.xlsx / .csv)**: Deteksi tabel, kolom, dan baris otomatis menjadi spreadsheet.
- **PDF to Text & Markdown**: Ekstraksi teks bersih dengan live counter jumlah kata dan karakter.
- **Extract Images**: Ambil seluruh aset gambar raster yang tertanam di dalam berkas PDF.
- **Images to PDF**: Konversi kumpulan JPG, PNG, atau WebP menjadi satu berkas PDF dengan pilihan ukuran A4, Letter, atau Fit.
- **PDF to Images**: Ekstraksi setiap halaman PDF menjadi berkas gambar PNG atau JPG (resolusi 150 DPI atau 250 DPI).

### Keamanan & Perbaikan
- **Compress PDF**: Kompresi ukuran dokumen (mode Ekstrem, Seimbang, atau Kualitas Tinggi).
- **Unlock PDF**: Buka proteksi password dokumen terenkripsi langsung di memori lokal.
- **Repair PDF**: Rekonstruksi struktur PDF rusak, cross-reference table hilang, atau trailer `%%EOF` terpotong.
- **Metadata Sanitizer**: Inspeksi dan bersihkan data pelacak dokumen (Author, Creator, Producer, CreationDate, ModifyDate).

---

## Arsitektur & Privasi

- **100% Client-Side**: Berjalan sepenuhnya di runtime Electron lokal.
- **Aset OCR Offline**: Model bahasa (`eng.traineddata.gz`, `ind.traineddata.gz`) dan core WASM disimpan secara lokal di `public/tesseract/`. Tidak ada unduhan runtime dari CDN luar.
- **Strict Content Security Policy**: Akses jaringan eksternal diblokir.

---

## Instalasi & Pengembangan

### Kebutuhan Sistem
- Node.js >= 18
- npm >= 9

### Menjalankan Mode Pengembangan
```bash
# Pasang dependensi
npm install

# Salin aset OCR ke folder public (otomatis via script)
npm run ocr:assets

# Jalankan dev server Electron
npm run dev
```

### Menjalankan Pengujian Otomatis (Playwright E2E)
```bash
# Headless test (21 skenario)
npm test

# Headed test dengan UI browser terlihat
npm run test:headed
```

### Build Paket Rilis (GitHub Release)
```bash
# Build paket macOS (.dmg dan .zip untuk Apple Silicon arm64 & Intel x64)
npm run build:mac

# Build paket Windows (NSIS Installer .exe dan Portable .exe)
npm run build:win
```

Output installer tersimpan di direktori `dist/`.

---

## Lisensi

MIT License. Bebas digunakan untuk kebutuhan personal maupun komersial.
