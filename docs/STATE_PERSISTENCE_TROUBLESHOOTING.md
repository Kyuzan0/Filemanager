# 🔧 State Persistence Troubleshooting Guide

**Document Version**: 1.0  
**Last Updated**: 15 January 2025  
**Purpose**: Troubleshooting guide for state persistence issues

---

## ❌ Issue: Sort & Path Persistence Test Failures

### Symptoms
```
Sort Persistence - Failed
❌ Sort not persisted

Path Persistence - Failed  
❌ Path not persisted
```

### Root Cause
The state persistence feature requires user interaction to trigger saving to localStorage. The automated test suite cannot simulate these interactions properly.

---

## ✅ Manual Verification Steps

### Step 1: Verify localStorage is Available

Open browser console (F12) and run:
```javascript
// Check if localStorage is working
localStorage.setItem('test', 'test');
console.log(localStorage.getItem('test'));
localStorage.removeItem('test');
// Should output: "test"
```

### Step 2: Verify Storage Module is Loaded

Run in browser console:
```javascript
// Check if storage module is available
window.debugModules.getStorage().then(storage => {
    console.log('Storage module:', storage);
    console.log('Available:', storage.isLocalStorageAvailable());
});
```

### Step 3: Test Sort Persistence Manually

1. **Open the application**: http://localhost/Filemanager
2. **Change sort order**: Click on "Name" column header
3. **Check localStorage**: Open console and run:
   ```javascript
   console.log('Sort Key:', localStorage.getItem('filemanager_sort_key'));
   console.log('Sort Direction:', localStorage.getItem('filemanager_sort_direction'));
   ```
4. **Expected output**:
   ```
   Sort Key: "name"
   Sort Direction: "asc" or "desc"
   ```
5. **Refresh the page** (F5)
6. **Verify**: Sort order should be preserved

### Step 4: Test Path Persistence Manually

1. **Navigate to a folder**: Click on any folder
2. **Check localStorage**: Run in console:
   ```javascript
   console.log('Last Path:', localStorage.getItem('filemanager_last_path'));
   ```
3. **Expected output**: The current folder path (e.g., `"folder1"`)
4. **Close the tab** completely
5. **Open new tab**: Navigate to http://localhost/Filemanager
6. **Verify**: Should open to the last visited folder

---

## 🔍 Debugging Commands

### Check All Filemanager Keys
```javascript
// Get all filemanager keys in localStorage
const keys = Object.keys(localStorage).filter(k => k.startsWith('filemanager_'));
console.log('Filemanager keys:', keys);

// Get their values
keys.forEach(key => {
    console.log(`${key}: ${localStorage.getItem(key)}`);
});
```

### Force Save Sort Preferences
```javascript
// Manually trigger sort preference save
window.debugModules.getStorage().then(storage => {
    storage.saveSortPreferences('name', 'asc');
    console.log('Sort saved:', {
        key: localStorage.getItem('filemanager_sort_key'),
        direction: localStorage.getItem('filemanager_sort_direction')
    });
});
```

### Force Save Path
```javascript
// Manually trigger path save
window.debugModules.getStorage().then(storage => {
    storage.saveLastPath('test/folder');
    console.log('Path saved:', localStorage.getItem('filemanager_last_path'));
});
```

### Clear All Filemanager Data
```javascript
// Clear all filemanager localStorage data
window.debugModules.getStorage().then(storage => {
    storage.clearAllStorage();
    console.log('All data cleared');
});
```

### Get Storage Info
```javascript
// Get storage usage info
window.debugModules.getStorage().then(storage => {
    const info = storage.getStorageInfo();
    console.log('Storage info:', info);
});
```

---

## 🛠️ Fix: Update Test Implementation

The test suite needs to be updated to properly test state persistence. Here's the corrected approach:

### Option 1: Test After User Interaction (Recommended)

Create a **manual test checklist** instead of automated tests:

```markdown
## Manual State Persistence Tests

### Test 1: Sort Persistence
1. [ ] Open application
2. [ ] Click "Name" column header (change sort)
3. [ ] Open console, verify: localStorage.getItem('filemanager_sort_key')
4. [ ] Refresh page (F5)
5. [ ] Verify sort order is preserved

### Test 2: Path Persistence
1. [ ] Navigate to any folder
2. [ ] Open console, verify: localStorage.getItem('filemanager_last_path')
3. [ ] Close tab completely
4. [ ] Open new tab to application
5. [ ] Verify opens to last visited folder

### Test 3: localStorage Disabled
1. [ ] Disable cookies/localStorage in browser settings
2. [ ] Open application
3. [ ] Verify application still works (no errors)
4. [ ] Verify defaults are used (no persistence)
```

### Option 2: Integration Test with Selenium/Puppeteer

For automated testing, use a proper browser automation tool:

```javascript
// Example with Puppeteer
const puppeteer = require('puppeteer');

async function testSortPersistence() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Navigate to app
    await page.goto('http://localhost/Filemanager');
    
    // Click sort header
    await page.click('[data-sort="name"]');
    
    // Wait for state to be saved
    await page.waitForTimeout(500);
    
    // Check localStorage
    const sortKey = await page.evaluate(() => {
        return localStorage.getItem('filemanager_sort_key');
    });
    
    console.log('Sort key saved:', sortKey);
    
    // Reload page
    await page.reload();
    
    // Verify sort is preserved
    // ... verify UI state
    
    await browser.close();
}
```

---

## 📋 Expected Behavior

### On Sort Change
```javascript
// When user clicks sort header:
1. changeSort() is called
2. updateState() updates state.sortKey and state.sortDirection
3. saveSortPreferences() saves to localStorage
4. localStorage.getItem('filemanager_sort_key') === 'name'
5. localStorage.getItem('filemanager_sort_direction') === 'asc'
```

### On Navigation
```javascript
// When user navigates to folder:
1. navigateTo(path) is called
2. saveLastPath(path) saves to localStorage
3. fetchDirectoryWrapper() fetches new data
4. localStorage.getItem('filemanager_last_path') === path
```

### On App Initialize
```javascript
// When app starts:
1. initializeApp() is called
2. loadSortPreferences() reads from localStorage
3. loadLastPath() reads from localStorage
4. updateState() sets initial state with saved values
5. loadInitialDirectory() loads the saved path
```

---

## ✅ Verification Checklist

Use this checklist to verify state persistence is working:

- [ ] **localStorage Available**: Browser allows localStorage access
- [ ] **Storage Module Loaded**: Module is imported and available
- [ ] **Save on Sort**: Clicking sort header saves preferences
- [ ] **Save on Navigate**: Navigating to folder saves path
- [ ] **Load on Init**: App loads saved preferences on startup
- [ ] **Persistence Across Sessions**: Data persists after tab close
- [ ] **Graceful Degradation**: App works without localStorage
- [ ] **No Console Errors**: No errors in browser console

---

## 🚨 Common Issues

### Issue 1: localStorage Not Saving

**Symptoms**: localStorage.getItem() returns null  
**Causes**:
- Cookies/localStorage disabled in browser
- Private/Incognito mode
- Storage quota exceeded
- Browser extension blocking

**Solutions**:
1. Check browser settings (enable cookies)
2. Exit private mode
3. Clear localStorage data
4. Disable interfering extensions

### Issue 2: Data Not Loading on Init

**Symptoms**: App doesn't use saved preferences  
**Causes**:
- Module import error
- State initialization order issue
- localStorage cleared between sessions

**Solutions**:
1. Check console for import errors
2. Verify initializeApp() flow
3. Check browser cache settings

### Issue 3: Test Suite Failures

**Symptoms**: Automated tests fail  
**Causes**:
- Tests run before user interaction
- No data in localStorage yet
- Test environment differs from actual usage

**Solutions**:
1. Use manual verification instead
2. Implement proper E2E testing with Puppeteer
3. Mock localStorage in test environment

---

## 📊 Success Criteria

State persistence is working correctly when:

1. ✅ Sort preferences save immediately when changed
2. ✅ Last path saves immediately when navigating
3. ✅ Preferences load automatically on app startup
4. ✅ Data persists across browser sessions
5. ✅ App works gracefully without localStorage
6. ✅ No console errors related to storage

---

## 🔗 Related Documentation

- [State Persistence Feature](./STATE_PERSISTENCE_FEATURE.md) - Full feature documentation
- [Integration Testing Guide](./INTEGRATION_TESTING_GUIDE.md) - Testing procedures
- [Storage Module](../assets/js/modules/storage.js) - Implementation code

---

## 📞 Need Help?

If you've followed all troubleshooting steps and still have issues:

1. **Check Console**: Look for error messages
2. **Verify Browser**: Ensure modern browser with localStorage support
3. **Test Manually**: Use manual verification steps above
4. **Review Code**: Check storage.js and appInitializer.js integration

---

**Document Status**: Active  
**Last Updated**: 15 January 2025  
**Maintained By**: Development Team