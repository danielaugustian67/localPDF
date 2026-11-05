# LocalPDF 📑

Aplikasi desktop lintas platform (**macOS** & **Windows**) berkinerja tinggi untuk mengelola, mengedit, mengompres, dan mengonversi dokumen PDF secara **100% offline & lokal** tanpa pernah mengunggah berkas ke internet.

Dirancang dengan standar antarmuka **Native Desktop Utility** (palet monokromatis Zinc, tipografi presisi, dan tata letak minimalis).

---

## ✨ Fitur Lengkap

### 1. Gabungkan PDF (*Merge PDF*)
- Drag & drop banyak file PDF sekaligus.
- Susun urutan gabungan file ke atas/bawah secara fleksibel.
- Pratinjau thumbnail lembar pertama, rincian ukuran file, dan total halaman.
- Simpan dokumen gabungan langsung ke direktori pilihan.

### 2. Pisahkan PDF (*Split PDF*)
- **Rentang Kustom**: Pisahkan berdasarkan halaman tertentu (contoh: `1-3, 5, 7-10`).
- **Tiap N Halaman**: Membagi rata PDF setiap X halaman (misal tiap 2 halaman jadi 1 file baru).
- **Semua Halaman**: Memecah setiap lembar menjadi berkas PDF mandiri satu per satu.
- Pratinjau visual seluruh halaman sebelum pemisahan.

### 3. Kelola Halaman, eSign & Anotasi (*Page Manager & Editor*)
- Grid visual dengan rasio kertas asli **A4 / Letter (`aspect-[1/1.414]`)**.
- **Tanda Tangan Digital (eSign Pad)**: Gambar tanda tangan langsung dengan mouse/trackpad atau unggah gambar tanda tangan berlatar transparan (PNG).
- **Pena & Coretan Bebas**: Menggambar garis halus dengan pilihan warna (Hitam, Biru, Merah) dan ketebalan goresan.
- **Stabilo (Highlighter)**: Menandai teks penting dengan arsiran transparan.
- **Hapus / Tutup Teks (Whiteout)**: Menarik kotak putih di atas teks lama untuk menghapus atau menyembunyikan teks dokumen.
- **Sensor Rahasia (Blackout Redaction)**: Kotak sensor hitam permanen untuk menutupi NIK, nomor rekening, atau informasi pribadi.
- **Tambah Teks Baru**: Ketik teks tambahan di koordinat lembar dokumen mana pun.
- **Rotasi & Hapus Halaman**: Putar lembar (90°, 180°, -90°) dan tandai lembar yang dibuang.
- **Watermark & Nomor Halaman**: Tambahkan cap teks diagonal dan penomoran otomatis berurutan.

### 4. Kompres Ukuran PDF (*PDF Compressor*)
- Mengurangi ukuran file PDF yang membengkak agar lolos batas upload instansi/portal (CPNS, bank, beasiswa):
  - **Ekstrem**: Pengurangan ukuran drastis (~60–80%), teks tetap terbaca jelas.
  - **Seimbang (Rekomendasi)**: Keseimbangan optimal ketajaman teks & ukuran (~40–60%).
  - **Kualitas Tinggi**: Kompresi halus untuk kebutuhan cetak (~20–35%).
- Indikator perbandingan ukuran sebelum vs sesudah (*Sebelum ➔ Sesudah, -X%*).

### 5. Gambar ke PDF (*Image to PDF*)
- Menggabungkan koleksi foto KTP, kartu keluarga, nota belanja, atau dokumen scan fisik (JPG, PNG, WebP) ke dalam satu berkas PDF rapi.
- Pilihan ukuran kertas: **A4**, **Letter**, atau **Sesuai Ukuran Gambar Asli (*Fit*)**.
- Pilihan orientasi: **Otomatis**, **Potret**, atau **Lanskap**.
- Pilihan margin tepi: **Tanpa Margin**, **Tipis (16pt)**, atau **Normal (32pt)**.

### 6. Ekstrak PDF ke Gambar (*PDF to Images*)
- Ekstrak seluruh lembar PDF menjadi gambar beresolusi tinggi.
- Format pilihan: **PNG (Lossless)** atau **JPG (Ringan)**.
- Opsi ketajaman: **Standar (150 DPI)** atau **Tinggi (250 DPI)**.
- Unduh per lembar atau unduh semua berkas gambar sekaligus.

---

## 🔒 Keamanan & Privasi

- **100% Pemrosesan di Memori Lokal**: Dijalankan secara *in-memory* di dalam komputer pengguna menggunakan mesin internal `pdf-lib` dan `pdfjs-dist`.
- **Zero Outbound Traffic**: Tidak ada data, analitik, ataupun token yang dikirimkan ke server eksternal.
- **Strict Content Security Policy**: Aturan keamanan `default-src 'self'` memastikan aplikasi terisolasi dari jaringan luar.

---

## 🛠️ Stack Teknologi

- **App Shell**: Electron v34 + `electron-vite`
- **Frontend UI**: React 18 + TypeScript + Tailwind CSS (Zinc precision palette)
- **Icons**: Lucide React
- **PDF Engine**: `pdf-lib` v1.17.1 (Pure JS buffer manipulation)
- **Render Engine**: Mozilla PDF.js `pdfjs-dist` (Local bundled worker)

---

## 🚀 Cara Menjalankan

```bash
# 1. Masuk ke direktori
cd "LocalPDF"

# 2. Jalankan Mode Pengembangan (Dev Mode)
npm run dev

# 3. Build Installer untuk macOS (.dmg & .app)
npm run build:mac

# 4. Build Installer untuk Windows (.exe)
npm run build:win
```
