# Drag & Drop Testing Guide

## Overview
Dokumentasi ini menjelaskan cara testing drag & drop functionality setelah refactoring ke modular architecture.

## Changes Summary

### Step 5: Fixed moveItem() Calls
**Files Modified:**
- [`assets/js/modules/dragDrop.js`](../assets/js/modules/dragDrop.js) - 3 locations
- [`assets/js/modules/uiRenderer.js`](../assets/js/modules/uiRenderer.js) - 1 location

**Changes Made:**
1. Updated all `moveItem()` calls to use proper parameter signatures
2. Changed placeholder comments to proper callback functions with debug logging
3. All callbacks now properly log their actions for debugging

**Before:**
```javascript
moveItem(
    sourcePath,
    targetPath,
    state,
    () => { /* setLoading - will be implemented later */ },
    (error) => { console.error('Move error:', error); },
    () => fetchDirectory(state.currentPath, { silent: true }),
    (message) => { console.log('Status:', message); },
    null, null, null, null
);
```

**After:**
```javascript
moveItem(
    sourcePath,
    targetPath,
    state,
    (isLoading) => { console.log('[DEBUG] Loading:', isLoading); },
    (error) => { console.error('[DEBUG] Move error:', error); },
    () => fetchDirectory(state.currentPath, { silent: true }),
    (message) => { console.log('[DEBUG] Status:', message); },
    null, // previewTitle
    null, // previewMeta
    null, // previewOpenRaw
    null  // buildFileUrl
);
```

## Testing Scenarios

### 1. Drag File to Folder
**Steps:**
1. Open file manager
2. Drag a file from the list
3. Drop it onto a folder row
4. Verify file moves to the target folder

**Expected Behavior:**
- Visual feedback during drag (`.dragging` class on dragged item)
- Drop target highlights when hovering over folder (`.drop-target` class)
- File disappears from source location
- File appears in target folder when navigating there
- Console logs show: `[DEBUG] Dropping <filename> into folder <foldername>`

### 2. Drag Folder to Folder
**Steps:**
1. Drag a folder from the list
2. Drop it onto another folder row
3. Verify folder moves correctly

**Expected Behavior:**
- Cannot drop folder into itself or its subfolders
- Visual feedback shows valid/invalid drop targets
- Folder moves successfully to valid target

### 3. Drag to Up-Row (Parent Directory)
**Steps:**
1. Navigate to a subdirectory
2. Drag a file or folder
3. Drop it onto the "↑ .." row at the top

**Expected Behavior:**
- Drop target highlights on up-row (`.drop-target` class)
- Item moves to parent directory
- Console logs show: `[DEBUG] Dropping <itemname> onto up-row to move into parent`

### 4. Drag to File Card (Current Directory)
**Steps:**
1. Drag a file or folder
2. Drop it onto the empty space in file-card area
3. Verify item stays in current directory (useful for moving from subdirectories)

**Expected Behavior:**
- File-card shows drop zone visual feedback (`.drag-over` class)
- Item moves to current directory if coming from elsewhere
- Console logs show: `[DEBUG] Dropping <itemname> in current directory via file card`

### 5. Drag to Body (Current Directory)
**Steps:**
1. Drag a file or folder
2. Drop it onto the page body (outside file-card)
3. Verify item moves to current directory

**Expected Behavior:**
- All drop target highlights clear
- Item moves to current directory
- Console logs show: `[DEBUG] Dropping <itemname> in current directory`

### 6. Visual Feedback Tests
**During Drag:**
- Dragged item has `.dragging` class (opacity reduced)
- File-card has `.drag-over` class (shows drop zone)
- Cursor shows move effect

**On Drop Target Hover:**
- Folder rows get `.drop-target` class (highlight background)
- Up-row gets `.drop-target` class when hovering
- File-card maintains `.drag-over` class

**After Drop:**
- All visual classes removed
- Item list refreshes automatically
- No lingering highlights

## Debug Console Logs

When drag & drop is working correctly, you should see these console logs:

```
[DEBUG] Drag started - adding .drag-over to file-card
[DEBUG] Dropping <itemname> into folder <foldername> with path <path>
[DEBUG] Final target path: <targetPath>
[DEBUG] Loading: true
[DEBUG] Move response: {success: true, item: {...}}
[DEBUG] Status: "<itemname>" berhasil dipindahkan.
[DEBUG] Loading: false
[DEBUG] Drag ended - removing .drag-over from file-card
```

## Error Scenarios

### 1. Drop File on Itself
**Expected:** No action, silent failure

### 2. Drop Folder Into Itself
**Expected:** No action, silent failure
**Console:** No move operation initiated

### 3. Drop Folder Into Its Subfolder
**Expected:** No action, prevented by validation
**Console:** No move operation initiated

### 4. API Error During Move
**Expected:** Error logged, file list refreshes
**Console:** `[DEBUG] Move error: <error message>`

## Code Architecture

### Key Functions

1. **`handleDragStart(event, item)`** - Initiates drag operation
   - Sets drag state
   - Adds visual feedback
   - Attaches body drop listeners

2. **`handleDragEnd(event)`** - Cleans up after drag
   - Clears drag state
   - Removes visual feedback
   - Removes body listeners

3. **`handleDragOver(event, item)`** - Shows drop target
   - Validates drop target
   - Adds highlight to valid targets

4. **`handleDrop(event, targetItem)`** - Performs move operation
   - Validates drop
   - Calls [`moveItem()`](../assets/js/modules/fileOperations.js:130-164)
   - Refreshes file list

5. **`setupFileCardDropZone()`** - Sets up file-card as drop zone
   - Handles dragover, dragleave, drop events
   - Provides visual feedback

### Integration Points

- **State Management:** [`state.js`](../assets/js/modules/state.js) - `state.drag` object
- **DOM Elements:** [`constants.js`](../assets/js/modules/constants.js) - `elements.fileCard`
- **API Calls:** [`fileOperations.js`](../assets/js/modules/fileOperations.js) - `moveItem()` function
- **UI Rendering:** [`uiRenderer.js`](../assets/js/modules/uiRenderer.js) - Attaches drag handlers to rows

## Known Limitations

1. **No Preview Update:** When moving a file that's currently open in preview, the preview doesn't update automatically (parameters set to `null`)
2. **Basic Loading Feedback:** Loading state only logs to console, no UI spinner
3. **Simple Error Handling:** Errors only logged to console, no user notification
4. **No Undo:** Move operations are immediate and cannot be undone

## Future Enhancements

1. Integrate with proper loading UI (spinner overlay)
2. Integrate with flashStatus for user feedback
3. Update preview when moving currently-previewed file
4. Add undo/redo capability for move operations
5. Add multi-select drag & drop
6. Add keyboard shortcuts for move operations
7. Add move confirmation for certain scenarios

## Status

✅ **Step 5 COMPLETED** - All `moveItem()` calls fixed
🔄 **Step 6 IN PROGRESS** - Testing phase

## Next Steps

After testing confirms drag & drop is working:
1. Move to **Move Search & Shortcuts** implementation
2. Then proceed to **Phase 3** features