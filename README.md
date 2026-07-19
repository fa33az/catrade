# Catrade - Trading Journal & Analytics Platform

[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)](https://react.dev)
[![Node](https://img.shields.io/badge/Node-Express-green?style=for-the-badge&logo=node.js)](https://expressjs.com)

**catrade** adalah aplikasi Jurnal & Analisis Performa Trading mandiri (self-hosted) dengan desain **Neo-Brutalism Pop** yang interaktif. Dirancang khusus untuk trader yang menginginkan transparansi penuh atas catatan transaksi, analisis grafik performa, ekspor laporan mingguan PDF, dan kalkulasi Pips/Profit otomatis yang akurat (selaras dengan broker Exness).

---

## Fitur Utama

- **Sistem Login & Register (Multi-User)**: Keamanan hashing password SHA256 di backend dengan verifikasi JWT/Session Token terenkripsi. Sesi pengguna tetap aktif meskipun tab ditutup.
- **Isolasi Data Sempurna**: Setiap trader memiliki ruang catatan terisolasi. Anda hanya dapat melihat dan mengedit transaksi Anda sendiri.
- **Kalkulator Pips & Profit Otomatis (Exness-Aligned)**:
  - **Emas (XAUUSD)**: Selisih $1.00 dihitung tepat sebagai 10.0 pips (1 Lot = 100 oz).
  - **Forex Standard**: Pip size 0.0001 (1 Lot = 100,000 unit).
  - **Forex JPY**: Pip size 0.01.
  - **Crypto / Indeks (BTCUSD)**: Pip size 1.0.
  - *Dukungan Manual Override* untuk pencatatan swap, komisi, atau deviasi khusus.
- **Wizard Logging Form (3 Langkah)**: Input transaksi yang terstruktur dan mudah digunakan di mobile.
  - Langkah 1: Info Transaksi & Status Awal.
  - Langkah 2: Parameter Harga (Entry, Exit, TP, SL) dengan **Live Preview** potensi profit/loss yang menyesuaikan Lot Size secara real-time.
  - Langkah 3: Hasil Akhir & Catatan.
- **Menu Pengaturan (Settings Modal)**:
  - **Mata Uang Jurnal**: Ganti instan antara USD ($) dan Rupiah (Rp).
  - **Kurs Real-time Otomatis**: Jika Rp aktif, aplikasi otomatis mengambil data nilai tukar USD/IDR terbaru menggunakan Frankfurter API dengan failover ke ExchangeRate-API.
  - **Filter Rentang Waktu**: Pilih filter default data mingguan, bulanan, atau semua transaksi.
  - **Auto-Pips Toggle**: Aktifkan/nonaktifkan kalkulasi otomatis pips.
- **Grafik Profit Kumulatif (SVG)**: Visualisasi kurva pertumbuhan ekuitas yang interaktif dengan grid dinamis dan tooltip informasi detail yang kompatibel di browser mobile & desktop.
- **Ekspor Laporan PDF Mingguan**: Unduh ringkasan transaksi 7 hari terakhir lengkap dengan tabel berdesain brutalist, logo catrade, dan pewarnaan indikator profit/loss secara instan.
- **Mobile-Responsive Optimization**: Dilengkapi dengan Bottom Nav Bar, visualisasi kartu transaksi brutalist untuk layar kecil, dan penataan ulang grid kartu statistik prioritas (Net Profit full-width di bagian bawah).

---

## Tech Stack

### Frontend
- **Framework**: React.js (Vite)
- **Styling**: Vanilla CSS (Neo-Brutalist design tokens)
- **Library**: `jsPDF` (PDF Generation), React Hooks & Context

### Backend (Node/Express or Python)
- **Framework**: Express.js (Node) / Python HTTP Server
- **Database**: SQLite3 (Data persisten ringan)
- **Keamanan**: SHA256 Hashing, Signed Session Tokens

---

## Memulai (Local Setup)

Pastikan Anda sudah menginstal Node.js.

1. **Clone Repository**:
   ```bash
   git clone https://github.com/fa33az/catrade.git
   cd catrade
   ```

2. **Jalankan Aplikasi Secara Concurrently**:
   Aplikasi ini dikonfigurasi untuk menjalankan frontend and backend secara bersamaan menggunakan satu perintah di root folder:
   ```bash
   npm run dev
   ```
   - **Frontend**: Akses di http://localhost:5173/
   - **Backend**: Berjalan di http://localhost:5000/api

---

## Panduan Deploy ke Vercel

Projek ini bisa dideploy dengan sangat mudah ke Vercel. Karena backend menggunakan SQLite (file database lokal), harap perhatikan batasan stateless serverless di bawah ini.

### 1. Deploy Frontend (Vite React)

Anda bisa mendeploy folder frontend/ ke Vercel sebagai aplikasi statis:

1. Masuk ke Vercel Dashboard dan buat project baru.
2. Hubungkan akun GitHub Anda dan pilih repository catrade.
3. Di konfigurasi project:
   - **Framework Preset**: Vite
   - **Root Directory**: frontend
   - **Build Command**: npm run build
   - **Output Directory**: dist
4. Di bagian **Environment Variables**, tambahkan endpoint API backend Anda (jika backend dideploy terpisah):
   - `VITE_API_BASE_URL` = `https://api-catrade-anda.vercel.app/api` (atau biarkan default localhost jika dideploy monolitik).
5. Klik **Deploy**!

### 2. Deploy Backend (Express Serverless)

Untuk menjalankan server Express di Vercel, kita menggunakan serverless function dengan membuat file vercel.json di root backend:

1. Buat file vercel.json di dalam folder backend/:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "server.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/api/(.*)",
         "dest": "server.js"
       }
     ]
   }
   ```
2. Hubungkan folder backend/ ke Vercel secara terpisah, atau buat deployment monolitik di root project dengan konfigurasi root routing.

> [!WARNING]
> **PENTING UNTUK SQLITE:** Serverless function Vercel bersifat stateless (tidak menyimpan data secara permanen). Setiap kali fungsi backend mengalami cold start, file database.db akan di-reset ke kondisi awal.
>
> **Rekomendasi Produksi:** 
> Untuk deployment serius yang menyimpan data transaksi selamanya:
> 1. Ganti database SQLite ke database cloud (seperti PostgreSQL di Supabase atau Neon, atau MySQL di PlanetScale).
> 2. Host backend Node/Express Anda di penyedia layanan persistent server seperti Railway, Render, atau VPS (DigitalOcean/Linode).

---

## Lisensi

Projek ini bersifat open-source dan dilisensikan di bawah lisensi MIT. Silakan gunakan, modifikasi, dan distribusikan kembali sesuai kebutuhan trading Anda!

*Dibuat oleh fa33az.*
