# Dokumentasi Perbaikan Overlay

## Masalah
Ketika halaman dimuat, overlay seperti `move-dialog bg-white rounded-lg p-6 w-full max-w-2xl shadow-lg` langsung muncul dan menutupi layar. Ini terjadi pada semua jenis overlay (preview, confirm, create, rename, unsaved, move, log, settings, context menu).

## Penyebab Masalah

### 1. Konflik Atribut HTML
- Semua overlay memiliki atribut `hidden` DAN `style="display: none;"` secara bersamaan
- Ini menciptakan inkonsistensi antara HTML attribute dan inline style
- Beberapa browser mungkin memprioritaskan inline style over HTML attribute

### 2. CSS Tidak Cukup Kuat
- Tailwind utility classes bisa mengoverride CSS default
- Class `.tw-overlay` menggunakan `display: none` tanpa `!important`
- JavaScript menambahkan class `visible` yang bisa mengoverride style default

### 3. JavaScript Test Functions
- Fungsi test di `index.js` bisa secara tidak sengaja membuka overlay
- Beberapa fungsi overlay menambahkan utility classes yang mengoverride CSS

## Solusi yang Diterapkan

### 1. Perbaikan Atribut HTML (`partials/overlays.php`)
```html
<!-- SEBELUM -->
<div class="move-overlay..." hidden style="display: none;">

<!-- SESUDAH -->
<div class="move-overlay..." hidden>
```

- Menghapus `style="display: none;"` dari semua overlay
- Hanya menggunakan atribut `hidden` HTML yang konsisten
- Mengurangi konflik antara inline style dan CSS

### 2. Perkuat CSS (`assets/css/style.css`)
```css
/* Force hide all overlays on page load */
.preview-overlay,
.confirm-overlay,
.create-overlay,
.rename-overlay,
.unsaved-overlay,
.move-overlay,
.log-overlay,
.settings-overlay,
.context-menu {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  z-index: -1 !important;
}

/* Only show when explicitly activated */
.preview-overlay.visible[aria-hidden="false"],
.confirm-overlay.visible[aria-hidden="false"],
/* ... dst */ {
  display: flex !important;
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
  z-index: 9999 !important;
}

/* Prevent inline style override */
.preview-overlay[style*="display: block"],
.confirm-overlay[style*="display: block"],
/* ... dst */ {
  display: none !important;
}
```

## Hasil yang Diharapkan

1. **Overlay Tersembunyi Saat Load**: Semua overlay akan benar-benar tersembunyi saat halaman dimuat
2. **Hanya Muncul Saat Diaktifkan**: Overlay hanya muncul ketika JavaScript secara eksplisit menambahkan class `visible` dan mengubah `aria-hidden="false"`
3. **Tidak Bisa Di-override**: CSS dengan `!important` mencegah inline style atau utility classes mengoverride status tersembunyi
4. **Konsistensi**: Semua overlay menggunakan pola yang sama untuk show/hide

## Testing

Untuk memastikan perbaikan berhasil:

1. **Load Halaman**: Buka halaman dan pastikan tidak ada overlay yang muncul
2. **Buka Overlay**: Klik tombol yang seharusnya membuka overlay (misal: Settings, Create file)
3. **Tutup Overlay**: Pastikan overlay bisa ditutup dengan tombol close atau klik di luar
4. **Inspect Element**: Periksa DOM untuk memastikan overlay memiliki atribut yang benar saat tersembunyi dan terlihat

## File yang Dimodifikasi

1. `partials/overlays.php` - Menghapus `style="display: none;"` dari semua overlay
2. `assets/css/style.css` - Menambahkan CSS force-hide dan show conditions dengan `!important`

## Catatan Tambahan

- Perbaikan ini bersifat non-invasive dan tidak mengubah fungsionalitas existing
- CSS menggunakan `!important` secara hati-hati hanya untuk mencegah overlay muncul tanpa sengaja
- JavaScript test functions tetap berfungsi untuk debugging dan development
- Context menu menggunakan `display: block` saat visible karena bukan flex container