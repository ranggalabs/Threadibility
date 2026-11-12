# Aturan Penulisan Skripsi & Pembuatan Diagram

## 0. Alur Kerja, Lokasi Berkas, dan Kompilasi PDF
- **Sumber acuan (urutan prioritas)**: (1) aturan di berkas `AGENTS.md` ini, (2) `pedoman_penulisan/final-PEDOMAN-DASAR-PENULISAN-SKRIPSI-2026-Revisi-1.pdf` (Pedoman UNIKOM 2026), (3) contoh skripsi pembanding `DRAFT 10`. Apabila `AGENTS.md` berbeda dengan Pedoman, ikuti `AGENTS.md` dan laporkan perbedaannya kepada penulis (contoh: Pedoman 1.3 butir 5 menyebut paragraf dimulai dari tepi kiri, sedangkan aturan No. 1 di bawah mewajibkan indentasi `1,27 cm`).
- **Berkas sumber utama**: `revisi_bab1_bab2/main.tex` (gambar di `revisi_bab1_bab2/gambar/`).
- **Kompilasi WAJIB dari LaTeX asli** menggunakan Tectonic (XeTeX, font Times New Roman melalui `fontspec`), bukan konversi HTML ke PDF:
  ```
  cd skripsi/revisi_bab1_bab2
  ~/.local/bin/tectonic.exe -X compile main.tex --outdir <folder_sementara>
  ```
  Pastikan log kompilasi bebas dari `Overfull \hbox` (teks keluar margin) dan periksa tampilan halaman secara visual (render PNG) sebelum diserahkan.
- **Setiap selesai revisi, WAJIB menyamakan seluruh salinan berkas**:
  1. `revisi_bab1_bab2/main.tex` → `skripsi_revisi_bab1_bab2.tex`
  2. PDF hasil kompilasi → `revisi_bab1_bab2/skripsi_revisi_bab1_bab2.pdf` dan `skripsi_revisi_bab1_bab2.pdf`
  3. `main.tex` dan seluruh isi folder `gambar/` di dalam `revisi_bab1_bab2/skripsi_revisi_bab1_bab2_overleaf.zip`
- **Pengaturan LaTeX yang sudah ditetapkan (jangan dihapus)**:
  - Judul `DAFTAR ISI`, `DAFTAR GAMBAR`, `DAFTAR TABEL` didefinisikan di dalam `\addto\captionsindonesian{...}` agar tidak tertimpa `babel` menjadi huruf kecil.
  - Pemenggalan kata diminimalkan (`\hyphenpenalty=9000`, `\exhyphenpenalty=9000`, `\tolerance=2000`, `\emergencystretch=2.5em`) dan kata terakhir di dasar halaman tidak boleh dipenggal (`\brokenpenalty=10000`) sesuai Pedoman 1.6.
  - `\raggedbottom` WAJIB dipertahankan: opsi `twoside` mengaktifkan `\flushbottom` yang meregangkan jarak antarbutir/paragraf secara tidak wajar (contoh: celah besar antarnomor pada 1.2 Identifikasi Masalah) agar halaman selalu penuh.
  - Paket `xurl` dipakai agar URL panjang pada Daftar Pustaka dapat berpindah baris; huruf *monospace* (`\texttt`) memakai Courier New.
  - Nomor halaman lanjutan berada 1,5 cm dari tepi atas kertas (`headsep=2.5cm` dengan margin atas 4 cm), nomor halaman pertama bab 1,5 cm dari tepi bawah (Pedoman 2.6).
  - Butir tahapan pada `1.5 Metodologi Penelitian` dimasukkan ke Daftar Isi melalui `\tocsub`/`\tocsubsub` dengan format `nomor` + jarak tetap `8pt` + judul (setara jarak "1.1 Latar Belakang"). Jangan memakai `\numberline` untuk butir ini karena kolom nomornya (34 pt, disiapkan untuk "2.1.10") membuat celah besar setelah nomor pendek seperti "1." atau "a.". Pedoman 3.6 tidak menetapkan ukuran jarak, hanya tiga kolom (nomor, judul, halaman) yang rapi.
  - Batas porsi gambar dilonggarkan (`\topfraction=0.9`, `\textfraction=0.1`, `\floatpagefraction=0.8`) agar gambar besar tetap berbagi halaman dengan teks.
  - Tabel 2.5 Perbandingan *Literature Review* disajikan pada halaman *landscape* (`pdflscape`, Pedoman 6.7) dengan lebar kolom `2.8/2.8/4.4/3.6/7.5 cm`; pada halaman *landscape* gaya halaman dikosongkan dan nomor halaman dicetak terputar mengikuti arah baca melalui *hook* `shipout/background` (`\landscapenumtrue`/`\landscapenumfalse`), ganjil di kiri dan genap di kanan.

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
  - Tidak menggunakan judul panjang seperti *"Tinjauan penelitian terdahulu pertama (...)"* pada judul tabel *Literature Review* 1, 2, 3, dst.
- **Tabel Perbandingan *Literature Review***: Setelah seluruh tabel *Literature Review* per jurnal, WAJIB disajikan satu tabel ringkasan `Tabel 2.X Perbandingan Literature Review` (*Literature Review* dicetak miring) dengan 5 kolom: `Nama Penulis, Tahun dan Judul Jurnal`, `Tujuan Jurnal`, `Inti Dari Jurnal`, `Hasil Studi`, dan `Persamaan & Perbedaan dengan Penelitian Skripsi` (satu baris per jurnal, baris kepala dicetak tebal dan diulang di setiap halaman, baris tidak terpotong antarhalaman).
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
  - Isi tabel berspasi 1 (`\begin{spacing}{1.0}`, Pedoman 1.3 butir 3) dan tabel *Literature Review* memakai penempatan `[H]` (paket `float`) agar urutannya tetap. Judul subbab *State of the Art* diikuti satu kalimat pengantar dan tidak boleh tertinggal sendirian di satu halaman.
  - Pada LaTeX, ukuran tersebut diterapkan dengan `\setlength{\arrayrulewidth}{0.5pt}` dan `\begin{tabular}{|L{119.5pt}|L{251.5pt}|}` (lebar isi + `\tabcolsep` 2×6 pt = `132pt` dan `264pt`, total `396pt` = lebar area teks).

- **Perataan Teks di Dalam Tabel (aturan penulis; Pedoman tidak mengatur perataan isi tabel)**:
  - Seluruh isi sel tabel WAJIB rata kanan-kiri (*justify*) agar rapi. Pada LaTeX, tipe kolom `L{...}` didefinisikan sebagai `>{\arraybackslash}p{...}` (tanpa `\raggedright`). Baris kepala tabel tetap rata tengah (`\centering`) dan dicetak tebal.
  - Pedoman hanya mengatur bahwa tabel diletakkan simetris di tengah halaman, isinya berspasi 1, dan mudah dibaca (Pedoman 1.3 butir 3 dan 6.7); kata "*Justify*" di Pedoman hanya muncul pada contoh Surat Pernyataan Orisinalitas.
  - Pada kolom sempit (≤ 4 cm, misalnya Tabel 2.5), pemenggalan kata otomatis diizinkan secara lokal (`\hyphenpenalty=300`) agar tidak muncul celah antarkata yang lebar. Hasil pemenggalan WAJIB diperiksa: nama produk/teknologi tidak boleh dipenggal dan kata bahasa Indonesia harus dipenggal sesuai kaidah (contoh salah yang pernah muncul: `Fas-tAPI`, `Threa-ds`, `sedangk-an`, `sk-ripsi`, `ho-ax`). Tambahkan kata bermasalah ke daftar `\hyphenation{...}` di pembuka `main.tex`.

## 3A. Aturan Kebenaran Isi *Literature Review* dan Sitasi (Mengacu pada Pedoman 1.5, 2.4, dan Bab 5)
- **Isi tabel *Literature Review* WAJIB 100% sesuai dengan isi jurnal asli di folder `jurnal/`**. Sebelum menulis atau mengubah tabel, baca dan cocokkan langsung dengan PDF jurnalnya:
  - Nama model/algoritma, jumlah dan sumber *dataset*, jumlah kategori/kelas, rasio data, parameter pelatihan, serta seluruh angka hasil (akurasi, presisi, *recall*, *F1-score*) harus tertulis persis seperti di jurnal (gunakan koma desimal, misalnya `96,49%`).
  - **DILARANG** mengarang atau memperkirakan angka, nama model, maupun klaim yang tidak ada di jurnal (contoh kesalahan yang pernah terjadi: menulis model IndoBERT padahal jurnal memakai `bert-base-uncased`; menulis "3.164 artikel, 7 kategori, Word2Vec" padahal jurnal memakai 5.000 dokumen dalam 3 kategori tanpa Word2Vec; menyebut "menampilkan tingkat keyakinan" padahal tidak dibahas jurnal).
  - Perubahan pada tabel *Literature Review* wajib diikuti penyesuaian pada Tabel Perbandingan *Literature Review* dan paragraf Latar Belakang yang merujuk jurnal yang sama.
- **Sitasi IEEE**:
  - Nomor rujukan `[n]` diberikan berdasarkan urutan kemunculan pertama di naskah; jika rujukan baru disisipkan, nomor rujukan sesudahnya dan seluruh sitasinya di naskah wajib digeser.
  - Setiap sumber yang disebut di naskah (termasuk nama penulis seperti "Pressman dan Maxim" atau "Fowler dan Scott") WAJIB memiliki nomor sitasi dan tercantum di Daftar Pustaka, dan setiap entri Daftar Pustaka wajib dirujuk di naskah.
  - Setiap konsep, teori, metode, dan data dari sumber lain wajib disertai sitasi. **DILARANG** membuat referensi fiktif; apabila sumber belum tersedia, laporkan kepada penulis agar ia menyediakan jurnal/bukunya di folder `jurnal/`.

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

4. **Ukuran Huruf Diagram Harus Terbaca saat Dicetak (Pedoman 6.1: huruf pada gambar "harus jelas")**:
   - Teks terkecil di dalam diagram WAJIB tercetak minimal ±9 pt setelah gambar diskalakan ke dalam naskah. Rumus: ukuran tercetak = ukuran huruf SVG × (lebar gambar di naskah ÷ lebar `viewBox` SVG).
   - Standar yang dipakai: lebar `viewBox` 480–500 unit, huruf judul kontainer/lajur 12,5–13, judul kotak 12–12,5 (tebal), isi 11,5–12, lalu disisipkan dengan `\includegraphics[width=\textwidth]{...}` (hasil ±9–10,7 pt). Teks panjang dipecah menjadi beberapa baris, bukan diperkecil.
   - Diagram dibuat ulang dengan `alat_diagram/gen_diagram.py` (SVG) lalu dirender ke PNG skala 4× sekaligus diperiksa teks yang keluar dari kotaknya dengan `alat_diagram/render_diagram.cjs`:
     ```
     python alat_diagram/gen_diagram.py <folder_keluaran>
     PW_CORE=../server/node_modules/playwright-core node alat_diagram/render_diagram.cjs <folder_svg> <folder_png> metodologi_penelitian metode_waterfall system_engineering system_analysis arsitektur_umum
     ```
     Pemeriksaan harus menampilkan `OK` untuk setiap diagram sebelum berkas SVG/PNG disalin ke `revisi_bab1_bab2/gambar/`. Kotak kontainer/lajur selalu digambar di lapisan belakang agar tidak menutupi isinya.

## 6. Aturan Gaya Bahasa dan Parafrasa (Mengacu pada Pedoman 1.5 butir j dan 1.6)
Setiap kali menulis, merevisi, atau memparafrasakan teks naskah (Bab 1, Bab 2, dan bab berikutnya), tulisan WAJIB terdengar natural seperti ditulis oleh peneliti manusia, mengalir secara akademik, dan bebas dari pola bahasa AI. Aturan ketat:
1. **Pertahankan makna dan istilah**: jangan mengubah makna asli, data statistik, angka, kutipan, maupun istilah teknis bidang ilmu. Parafrasa tidak menghilangkan kewajiban sitasi `[n]` (Pedoman 1.5 butir g dan j), dan nomor sitasi pada kalimat yang diparafrasakan tidak boleh hilang atau bergeser.
2. **Hindari kata klise AI**: DILARANG memakai kata sambung atau frasa yang terlalu sering dipakai AI, yaitu `selain itu`, `lebih lanjut`, `oleh karena itu`, `dalam konteks ini`, `secara keseluruhan`, `sangat penting untuk dicatat`, dan `menunjukkan bahwa`. Ganti dengan transisi ide yang lebih organik, misalnya dengan menyambung langsung ke gagasan sebelumnya, memakai kata hubung yang lebih sederhana (`sementara`, `padahal`, `akibatnya`, `karena itu`), atau menyatukan dua kalimat yang berkaitan.
3. **Variasi struktur kalimat**: gabungkan kalimat pendek dan kalimat majemuk secara seimbang. Ubah sebagian kalimat pasif menjadi aktif (atau sebaliknya) agar ritme bacaan tidak monoton. Hindari memulai beberapa kalimat berurutan dengan kata yang sama.
4. **Sesuai PUEBI**: gunakan bahasa Indonesia baku yang lugas, tidak bertele-tele, dan tidak puitis. Hindari ungkapan subjektif atau emosional tanpa dasar (Pedoman 1.5 butir l), dan istilah asing yang belum punya padanan baku tetap dicetak miring (Pedoman 1.5 butir c).
5. **Berlaku juga untuk isi tabel** (tabel *Literature Review* dan Tabel Perbandingan), asalkan angka dan klaim tetap sesuai jurnal (lihat aturan 3A).
6. **Pilih kata yang mudah dimengerti**: pembaca skripsi harus dapat memahami kalimat tanpa membuka kamus. DILARANG memakai kata yang jarang dipakai atau terlalu abstrak bila ada padanan sehari-hari yang maknanya sama. Contoh yang sudah diganti dan tidak boleh dipakai lagi: `sintesis` (pakai `penyusunan`), `hiperbola` (`dilebih-lebihkan`), `dipelintir` (`diubah agar menyesatkan`), `terkecoh` (`tertipu`), `mengada-ada` (`tidak sesuai fakta`), `pijakan` (`berpegang pada`), `aktual` (`terbaru`; untuk *ground truth* pakai `sebenarnya`), `menyematkan`/`menyuntikkan`/`disisipkan` (`memasang`/`menampilkan`/`dipasang`), `memangkas` (`mempersingkat`), `resolusi tautan` (`pelacakan tautan`), `irisan kata kunci` (`kata kunci yang sama`), `kandidat` (`calon`), `terotomasi` (`otomatis`), `keabsahan` (`kebenaran`), `finansial` (`materi`), `peladen` (`server`), `korpus` (`kumpulan publikasi`), `multidisiplin` (`lintas bidang ilmu`), `estimator` (`ukuran`), `prosedural` (`berurutan`), `pengodean` (`penulisan kode`), `terprogram` (`melalui kode program`), `mewujudkan` (`menerapkan`). Istilah teknis yang memang diperlukan (misalnya normalisasi, ekstraksi, `endpoint`, `metamodel`) boleh dipakai, tetapi harus diberi penjelasan singkat pada pemakaian pertama.
7. **Ejaan awalan dan kata ulang (PUEBI)**: awalan serapan ditulis serangkai, yaitu `antarkomponen`, `antarobjek`, `subtahap`, `nonfungsional` (bukan `antar-komponen`, `antar-objek`, `sub-tahap`, `non-fungsional`). Tanda hubung tetap dipakai bila diikuti istilah asing bercetak miring, misalnya `non-\textit{hoax}`.
8. **Pemeriksaan sebelum diserahkan**: cari ketujuh frasa terlarang di atas pada `main.tex` (pencarian tidak peka huruf besar-kecil, termasuk yang diawali huruf kapital di awal kalimat) beserta kata-kata pada aturan 6 dan ejaan pada aturan 7, lalu pastikan tidak ada yang tersisa pada teks yang baru ditulis atau direvisi.
