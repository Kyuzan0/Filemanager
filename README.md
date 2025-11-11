# test
# Manajer Berkas (File Manager)

Ringkasan singkat:

Aplikasi file manager ringan berbasis PHP untuk menjelajahi, melihat metadata, dan menyunting berkas teks di dalam direktori `file/` melalui peramban.

Fitur utama (singkat):

- Navigasi folder dan berkas yang responsif.
- Breadcrumb sederhana untuk navigasi cepat.
- Seleksi ganda dan penghapusan beberapa item sekaligus.
- Pratinjau dan editor teks dengan dukungan nomor baris dan sinkronisasi scroll.
- Pratinjau hanya untuk format teks umum (mis. `txt`, `md`, `json`, `php`, `js`, dll.).
- Polling otomatis (default 5 detik) untuk mendeteksi item baru.

Struktur penting:

- `index.php` — antarmuka (HTML/CSS/JS) dan integrasi front-end.
- `assets/js/index.js` — logika UI: render daftar, filter, preview/editor, dan pemanggilan `api.php`.
- `assets/css/style.css` — stylesheet utama untuk tata letak, tema, dan responsivitas UI.
- `api.php` — endpoint backend (JSON) untuk daftar, baca, simpan, dan hapus.
- `lib/file_manager.php` — utilitas file (validasi path, pembacaan/penulisan).
- `file/` — direktori yang diekspos ke UI (letakkan berkas/folder Anda di sini).

Persyaratan sistem:

- PHP 7.4+ dengan dukungan JSON.
- Web server (Apache, Nginx, atau built-in PHP server).
- Izin baca/tulis pada `file/` untuk user yang menjalankan web server.

Cara cepat menjalankan (lokal):

1. Pastikan proyek berada di dalam root yang di-serve oleh web server Anda.
2. Akses `index.php` melalui peramban (mis. `http://localhost/` atau `http://d.local/`).
3. Tambahkan berkas ke folder `file/` untuk mencoba fitur.

Catatan keamanan dan konfigurasi:

- Aplikasi melakukan sanitasi path dan berupaya menolak akses di luar direktori `file/`, namun ini bukan pengganti konfigurasi server yang aman.
- Jangan letakkan data sensitif di dalam `file/` pada lingkungan produksi tanpa otentikasi.
- Batasi akses web server ke direktori ini jika digunakan pada server publik.
- Untuk mengubah interval polling, sesuaikan pemanggilan di `assets/js/index.js` (fungsi `startPolling`).

Known limits:

- Pratinjau berkas besar dapat menurunkan performa — ukuran besar dapat ditolak di sisi klien/server.
- Editor berfungsi paling baik untuk berkas teks; file biner tidak didukung.

Troubleshooting singkat:

- Jika tidak muncul daftar, periksa log server dan izin filesystem pada `file/`.
- Jika penyimpanan gagal, cek izin tulis pada berkas dan pastikan `api.php` merespons JSON dengan sukses.
- Jika UI terlihat berantakan, coba bersihkan cache peramban atau gunakan peramban modern.

Kontribusi kecil:

- Perbaikan cepat (UI/UX, format tampilan) dipersilakan melalui patch sederhana — ini bukan repositori git terkelola di proyek ini.

Terakhir diperbarui: 2025-10-16

Instruksi
---------

1. Menjalankan secara lokal

	- Jika menggunakan built-in PHP server (cepat untuk testing):

	  php -S localhost:8000

	  Lalu buka http://localhost:8000/ di peramban. Pastikan working directory berada di folder proyek (`index.php` di root).

	- Jika menggunakan Apache/Nginx: letakkan proyek ini dalam document root dan konfigurasi virtual host seperti biasa.

2. Menyesuaikan tampilan (CSS)

	- File utama stylesheet ada di `assets/css/style.css`.
	- Untuk mengubah warna tema, edit variabel di bagian atas berkas (`:root`) seperti `--accent`, `--bg`, dan `--text`.
	- Untuk mengubah spasi atau ukuran font, cari aturan untuk `.card`, `.toolbar`, dan tabel.

3. Mengubah interval polling

	- Buka `assets/js/index.js` dan cari fungsi `startPolling()`.
	- Default interval ada di `setInterval(..., 5000)` (nilai dalam milidetik). Ubah sesuai kebutuhan.

4. Izin filesystem

	- Pastikan user yang menjalankan proses web (mis. `www-data`, UID 82 pada Alpine/php-fpm) memiliki izin baca/tulis pada subdirektori `file/`.
	- Pada setup berbasis Samba seperti contoh kami, jalankan `chown -R 82:82 /docker/compose/samba/www/file` (atau sesuaikan UID/GID) agar upload dan penambahan folder berjalan normal.
	- Jika tidak, operasi baca/simpan akan gagal atau menghasilkan error.

5. Debugging cepat

	- Cek log server web (Apache/Nginx/PHP) untuk pesan error.
	- Buka Developer Tools di peramban (Console & Network) untuk melihat permintaan `api.php` dan respons JSON.
	- Jika ada masalah respons JSON, jalankan `api.php?action=list&path=` langsung di peramban untuk melihat output mentah.

