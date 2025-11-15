# Drag & Drop Debugging Guide

## Jika Drag & Drop Tidak Berfungsi

### 1. Buka Browser Console
Tekan `F12` atau klik kanan → Inspect → Console

### 2. Check untuk Errors
Lihat apakah ada error merah di console. Common errors:

**a) Module Loading Error:**
```
Failed to load module script: Expected a JavaScript module script...
```
**Solution:** Pastikan semua file JS ada di lokasi yang benar dan server mendukung ES6 modules.

**b) Import Error:**
```
Cannot find module './modules/dragDrop.js'
```
**Solution:** Periksa struktur folder, pastikan semua module files ada.

**c) state.drag is undefined:**
```
Cannot read property 'isDragging' of undefined
```
**Solution:** State belum diinisialisasi dengan benar.

### 3. Manual Testing di Console

Paste dan jalankan code berikut di browser console:

```javascript
// Test 1: Check if modules loaded
console.log('=== MODULE LOADING TEST ===');
console.log('State module:', typeof state !== 'undefined' ? '✅ Loaded' : '❌ Not found');
console.log('State.drag:', state?.drag ? '✅ Initialized' : '❌ Not initialized');

// Test 2: Check drag state structure
console.log('\n=== DRAG STATE TEST ===');
console.log('state.drag:', state?.drag);

// Test 3: Check DOM elements
console.log('\n=== DOM ELEMENTS TEST ===');
const fileCard = document.querySelector('.file-card');
console.log('fileCard element:', fileCard ? '✅ Found' : '❌ Not found');

const rows = document.querySelectorAll('#file-table tr');
console.log('Table rows:', rows.length > 0 ? `✅ Found ${rows.length} rows` : '❌ No rows');

// Test 4: Check draggable attribute
console.log('\n=== DRAGGABLE TEST ===');
const firstRow = document.querySelector('#file-table tr[data-item-path]');
if (firstRow) {
    console.log('First row draggable:', firstRow.draggable ? '✅ Yes' : '❌ No');
    console.log('First row dataset:', firstRow.dataset);
} else {
    console.log('❌ No data rows found');
}

// Test 5: Test drag handlers
console.log('\n=== EVENT HANDLERS TEST ===');
if (firstRow) {
    const events = ['dragstart', 'dragend'];
    events.forEach(eventName => {
        const hasHandler = firstRow.ondragstart || firstRow.ondragend;
        console.log(`${eventName} handler:`, hasHandler ? '✅ Attached' : '⚠️ Check if attached via addEventListener');
    });
}

// Test 6: Manual drag simulation
console.log('\n=== MANUAL DRAG TEST ===');
console.log('Try to drag a file/folder now and watch for console logs starting with [DEBUG]');
```

### 4. Expected Console Output When Dragging

Saat Anda melakukan drag & drop, Anda harus melihat logs seperti ini:

```
[DEBUG] Drag started - adding .drag-over to file-card
[DEBUG] Dropping filename.txt into folder foldername with path folder/path
[DEBUG] Final target path: folder/path
[DEBUG] Loading: true
[DEBUG] Move response: {success: true, item: {...}}
[DEBUG] Status: "filename.txt" berhasil dipindahkan.
[DEBUG] Loading: false
[DEBUG] Drag ended - removing .drag-over from file-card
```

### 5. Visual Indicators

Saat drag & drop berfungsi dengan baik, Anda harus melihat:

✅ **Saat mulai drag:**
- Item yang di-drag menjadi semi-transparent (opacity reduced)
- File-card area menunjukkan border/highlight

✅ **Saat hover di atas folder:**
- Folder row mendapat highlight/background change
- Cursor berubah menunjukkan "move" operation

✅ **Setelah drop:**
- Semua highlight hilang
- File list refresh otomatis
- Item berpindah ke lokasi baru

### 6. Common Issues & Solutions

#### Issue 1: Tidak ada yang terjadi saat drag
**Possible Causes:**
- `row.draggable = true` tidak di-set
- Event handlers tidak terpasang
- JavaScript error mencegah initialization

**Check:**
```javascript
const row = document.querySelector('#file-table tr[data-item-path]');
console.log('Draggable:', row.draggable); // should be true
```

#### Issue 2: Drag dimulai tapi drop tidak berfungsi
**Possible Causes:**
- `handleDrop` tidak terpanggil
- `event.preventDefault()` missing di dragover
- Drop target tidak valid

**Check:**
```javascript
// Add temporary logging to handleDragOver
console.log('Drag over event triggered');
```

#### Issue 3: Error saat drop
**Possible Causes:**
- `moveItem()` function error
- API endpoint error
- Parameter mismatch

**Check console for:**
```
[DEBUG] Move error: <error message>
```

#### Issue 4: Visual feedback tidak muncul
**Possible Causes:**
- CSS classes tidak ada
- CSS specificity issues
- JavaScript tidak menambahkan classes

**Check:**
```javascript
// During drag, check classes
const fileCard = document.querySelector('.file-card');
console.log('File card classes:', fileCard.classList);
// Should include 'drag-over' during drag
```

### 7. Force Re-initialization

Jika perlu restart aplikasi tanpa reload page:

```javascript
// CAUTION: This will reset state
window.location.reload();
```

### 8. Check Server-Side (API)

Jika drag UI works but move operation fails:

1. Check browser Network tab (F12 → Network)
2. Look for POST request to `api.php?action=move`
3. Check request payload and response
4. Verify PHP error logs

**Expected Request:**
```json
{
  "sourcePath": "file.txt",
  "targetPath": "folder/subfolder"
}
```

**Expected Response:**
```json
{
  "success": true,
  "item": {
    "name": "file.txt",
    "path": "folder/subfolder/file.txt",
    "type": "file"
  }
}
```

### 9. Browser Compatibility

Pastikan browser Anda mendukung:
- ES6 Modules (import/export)
- HTML5 Drag & Drop API
- Modern JavaScript features

**Recommended Browsers:**
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

### 10. Quick Fix Checklist

Jika drag & drop tidak berfungsi, coba langkah-langkah ini secara berurutan:

1. ✅ Hard refresh: `Ctrl+F5` (Windows) atau `Cmd+Shift+R` (Mac)
2. ✅ Clear browser cache
3. ✅ Check console for errors
4. ✅ Verify all module files exist
5. ✅ Check server is running
6. ✅ Test dengan file/folder yang ada
7. ✅ Try different browser
8. ✅ Check file permissions
9. ✅ Verify API endpoint responds
10. ✅ Check PHP error logs

### 11. Report Issue

Jika masih tidak berfungsi setelah troubleshooting, kumpulkan informasi ini:

```javascript
// Run this in console and copy output
console.log({
    browser: navigator.userAgent,
    modules_loaded: typeof state !== 'undefined',
    drag_state: state?.drag,
    filecard_exists: !!document.querySelector('.file-card'),
    rows_count: document.querySelectorAll('#file-table tr').length,
    first_row_draggable: document.querySelector('#file-table tr[data-item-path]')?.draggable,
    console_errors: 'Copy any red errors from console here'
});
```

Kirimkan output ini beserta screenshot dari console errors.

## Success Indicators

Drag & drop berfungsi dengan baik jika:

✅ Console menunjukkan `[DEBUG]` logs saat drag/drop
✅ Visual feedback muncul (opacity, highlights)  
✅ File/folder berhasil berpindah lokasi
✅ File list refresh otomatis setelah move
✅ Tidak ada error di console
✅ Network tab menunjukkan successful API calls

## Need More Help?

Jika masih mengalami masalah:
1. Review file [`DRAG_DROP_TESTING.md`](./DRAG_DROP_TESTING.md) untuk testing scenarios
2. Check dokumentasi di [`COMPREHENSIVE_MODULAR_ISSUES_REPORT.md`](./COMPREHENSIVE_MODULAR_ISSUES_REPORT.md)
3. Review code implementation di:
   - [`dragDrop.js`](../assets/js/modules/dragDrop.js)
   - [`uiRenderer.js`](../assets/js/modules/uiRenderer.js)
   - [`appInitializer.js`](../assets/js/modules/appInitializer.js)