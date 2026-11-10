# Aturan Penulisan Skripsi & Pembuatan Diagram

## 1. Aturan Indentasi Paragraf (Mengacu pada `DRAFT 10`)
- **Setiap awal paragraf WAJIB diberi penanda indentasi (menjorok ke dalam) sebesar `1,27 cm` (`36 pt` / `0,5 inci` / 1 *tab stop* standar Word)**:
  - Berlaku untuk seluruh paragraf teks isi (termasuk paragraf pertama tepat di bawah judul bab/subbab, paragraf penjelasan di bawah tiap butir *Metodologi Penelitian* `1.5`, serta paragraf penjelasan di bawah tiap bab pada *Sistematika Penulisan* `1.6`).
  - Pada HTML/CSS gunakan `text-indent: 1.27cm;` pada elemen `<p>` isi, dan pada LaTeX gunakan `\usepackage{indentfirst}` serta `\setlength{\parindent}{1.27cm}`.

## 2. Aturan Penggunaan Huruf Tebal (*Bold*) (Mengacu pada `DRAFT 10`)
- **DILARANG melakukan *bold* secara sembarangan pada kata, istilah teknis, maupun nama metode di tengah paragraf atau di awal butir daftar (`<li>` / `\item`)**:
  - Contoh yang **DILARANG**: mencetak tebal istilah seperti ***Manifest V3***, ***Unified Modeling Language* (UML)**, ***Waterfall***, **Playwright**, ***black-box testing***, ***confusion matrix*** di tengah kalimat paragraf, ataupun mencetak tebal label di awal butir `<li>`/`\item` pada uraian materi Bab 2.
  - Huruf tebal (*bold*) **HANYA** boleh digunakan pada:
    1. Teks halaman sampul (*cover*).
    2. Judul bab (`BAB 1 PENDAHULUAN`, `BAB 2 TINJAUAN PUSTAKA`, dst.), judul subbab (`1.1`, `2.1`, dst.), judul anak subbab (`2.1.1`, `2.2.1`, dst.), serta sub-judul tahapan pada `1.5 Metodologi Penelitian` dan `1.6 Sistematika Penulisan`.
    3. Judul bagian utama (Level-0) pada `DAFTAR ISI`.
    4. Nomor tabel pada keterangan di atas tabel (`<b>Tabel 2.1</b> <i>Literature Review</i> 1`) serta label kolom pertama pada tabel *State of the Art* (`Judul Jurnal`, `Penulis`, `Tahun Terbit`, `Masalah Utama`, `Tujuan`, `Metode`, `Hasil dan Pembahasan`, `Kesimpulan`).

## 3. Aturan Tabel *State of the Art* & `DAFTAR TABEL` (Mengacu pada `DRAFT 10`)
- **Penamaan Judul Tabel *State of the Art***:
  - Baik pada halaman `DAFTAR TABEL` maupun pada bagian *State of the Art* di Bab 2, judul tabel penelitian terdahulu **WAJIB** ditulis dengan format `Tabel 2.1 Literature Review 1`, `Tabel 2.2 Literature Review 2`, `Tabel 2.3 Literature Review 3`, dan seterusnya (kata *Literature Review* dicetak miring/*italic*).
  - Tidak menggunakan judul panjang seperti *"Tinjauan penelitian terdahulu pertama (...)"* ataupun tabel perbandingan terpisah di akhir *State of the Art*.
- **Struktur Baris Tabel *Literature Review***:
  - Mengacu pada `DRAFT 10`, setiap tabel *Literature Review* disajikan dalam format 2 kolom berukuran `12pt` tanpa baris kepala (`<th>`), dengan 8 baris komponen pada kolom kiri (dicetak tebal):
    1. **Judul Jurnal**
    2. **Penulis**
    3. **Tahun Terbit**
    4. **Masalah Utama**
    5. **Tujuan**
    6. **Metode**
    7. **Hasil dan Pembahasan**
    8. **Kesimpulan**
- **Ketajaman dan Konsistensi Garis Tabel (*Table Borders* Standar Microsoft Word `0.5pt`)**:
  - Seluruh garis tepi tabel (kiri, tengah, kanan, atas, dan bawah) **WAJIB** memiliki ketebalan tipis standar tabel Microsoft Word (`0.5pt` / `1/2 pt`, tidak terlalu tebal/*bold*) serta kepekatan warna hitam (`#000000`) yang sama persis antara sisi kiri, tengah, dan kanan.
  - Pada pembuatan PDF, gunakan lebar kolom yang habis dibagi `12pt` (`width: 528px` = `396pt`, kolom kiri `176px` = `132pt`, kolom kanan `352px` = `264pt`) dan gambar garis tabel menggunakan vektor *stroke* PDF murni (`width=0.5` pt pada `pymupdf`) agar seluruh garis vertikal dan horizontal memiliki ketebalan piksel yang 100% identik di semua tingkat *zoom*.

## 4. Aturan Pemisahan Subbab pada Bab 2 (Mengacu pada `DRAFT 10`)
- **DILARANG menggabungkan beberapa topik, konsep teori, metode, ataupun perangkat lunak (*tools*) ke dalam satu judul anak subbab gabungan**:
  - Contoh yang **DILARANG**: `2.1.1 Teori Umum Sistem, Informasi, dan Deteksi Hoax`, `2.1.2 Hoax, Misinformasi, Disinformasi, dan Satire`, `2.1.3 Platform Media Sosial Threads dan Struktur DOM Halaman`, `2.1.5 Layanan Server Backend, REST API, dan Normalisasi Teks Unicode`, `2.1.6 Penelusuran Bukti Fakta Real-Time dan Pencegahan Halusinasi Rujukan`, atau `2.3.2 Bahasa Pemrograman, Pustaka, dan Perkakas Pendukung`.
  - Setiap konsep teori (misalnya `Sistem`, `Informasi`, `Deteksi Hoax`, `Hoax`, `Misinformasi`, `Disinformasi`, `Satire`, `Platform Media Sosial Threads`, `Document Object Model (DOM)`, `Layanan Server Backend`, `REST API`, `Normalisasi Teks Unicode`, `Penelusuran Bukti Fakta Real-Time`, `Pencegahan Halusinasi Rujukan`), metode penelitian (`Kuesioner`, `System Engineering`, `System Analysis`, `Waterfall`, `Unified Modeling Language (UML)`, `Pengujian Black-Box`, `Confusion Matrix`), maupun perangkat lunak/bahasa/pustaka (`Google Antigravity`, `TypeScript`, `React`, `Vite`, `Node.js`, `Express.js`, `Playwright`, `Draw.io`) **WAJIB** dipisahkan menjadi anak subbab tersendiri (`2.1.1`, `2.1.2`, dst.) dan dijelaskan masing-masing secara utuh.

## 5. Aturan Pembuatan Gambar dan Diagram (Draw.io / diagrams.net Standard)
Setiap kali membuat atau men-generate gambar/diagram (diagram alur metodologi, arsitektur sistem, UML, tahapan metode pengembangan perangkat lunak, maupun diagram teknis lainnya), WAJIB mematuhi aturan berikut tanpa pengecualian:

1. **Gaya Visual Standar `https://app.diagrams.net/` (draw.io)**:
   - Gunakan bentuk kotak standar draw.io (persegi panjang bersudut tajam atau sedikit membulat untuk proses, kontainer grup dengan *header* garis pembatas untuk batas sistem/tahapan, serta konektor garis ortogonal/siku-siku dengan mata panah segitiga hitam klasik khas draw.io).
   - Tata letak harus rapi, simetris, proporsional, dan memiliki ruang kosong (*whitespace*) yang cukup agar mudah diikuti mata.

2. **Tanpa Warna (Hitam-Putih / Monokrom Murni — Anti AI Slop)**:
   - **DILARANG** menggunakan warna latar kotak (biru, hijau, kuning, ungu, oranye, pastel, atau gradasi) maupun garis panah berwarna.
   - Seluruh diagram wajib menggunakan latar putih (`#FFFFFF`), kotak berisi putih (`#FFFFFF`), garis tepi hitam (`#000000`), garis konektor hitam (`#000000`), dan teks hitam (`#000000`).

3. **Mudah Dimengerti & Ringkas**:
   - Isi teks di dalam setiap kotak harus singkat, jelas, langsung pada intinya, dan mudah dipahami pembaca tanpa istilah berbelit-belit.
   - Istilah bahasa Inggris di dalam diagram wajib dicetak miring (*italic*).
