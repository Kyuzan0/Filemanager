<?php
// Partial: table & file list dengan design sistem baru
// Enhanced with ARIA attributes for accessibility (Phase 3)
?>

<!-- Screen reader announcements live region -->
<div id="aria-live-region"
     class="sr-only"
     aria-live="polite"
     aria-atomic="true"
     role="status">
</div>

<!-- Assertive announcements for important actions -->
<div id="aria-live-assertive"
     class="sr-only"
     aria-live="assertive"
     aria-atomic="true"
     role="alert">
</div>

<table id="fileTable"
       class="w-full"
       role="grid"
       aria-label="File and folder list"
       aria-describedby="file-table-description">
    <caption id="file-table-description" class="sr-only">
        File manager table showing files and folders with their names, types, modification dates, sizes, and available actions.
        Use arrow keys to navigate, Enter to open, Delete to remove items.
    </caption>
    <thead>
        <tr role="row">
            <th class="px-3 py-3 text-left text-sm font-semibold" scope="col">
                <input type="checkbox"
                       id="selectAll"
                       aria-label="Select all files and folders"
                       title="Select all items (Ctrl+A)">
                <span class="sr-only">Select</span>
            </th>
            <th class="px-3 py-3 text-left text-sm font-semibold" scope="col" aria-sort="none">
                Name
            </th>
            <th class="px-3 py-3 text-left text-sm font-semibold" scope="col">
                Type
            </th>
            <th class="px-3 py-3 text-left text-sm font-semibold" scope="col" aria-sort="none">
                Date Modified
            </th>
            <th class="px-3 py-3 text-right text-sm font-semibold" scope="col" aria-sort="none">
                Size
            </th>
            <th class="px-3 py-3 text-left text-sm font-semibold" scope="col">
                <span class="sr-only">Actions</span>
                Actions
            </th>
        </tr>
    </thead>
    <tbody id="tbody"
           class="divide-y divide-slate-100"
           role="rowgroup"
           aria-label="File list contents">
    </tbody>
</table>

<!-- Selection indicator for batch operations -->
<div id="selection-indicator"
     class="selection-indicator"
     role="status"
     aria-live="polite"
     aria-label="Selection count"
     hidden>
    <span id="selection-count">0</span> items selected
    <button type="button"
            id="clear-selection-btn"
            class="selection-clear-btn"
            aria-label="Clear selection">
        Clear
    </button>
</div>

<div class="empty-state py-8 text-center text-slate-500 text-sm hidden"
     id="empty-state"
     role="status"
     aria-label="Empty directory">
    <span aria-hidden="true">📁</span>
    Tidak ada file atau folder di direktori ini.
</div>

<!-- Batch actions bar for multi-select operations -->
<div id="batch-actions-bar"
     class="batch-actions-bar"
     role="toolbar"
     aria-label="Batch actions for selected items"
     hidden>
    <div class="batch-actions-info">
        <span id="batch-selection-count">0</span> items selected
    </div>
    <div class="batch-actions-buttons" role="group" aria-label="Available batch actions">
        <button type="button"
                id="batch-move-btn"
                class="batch-action-btn"
                aria-label="Move selected items">
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4" aria-hidden="true">
                <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 12l-4-4h3V10h2v4h3l-4 4z"/>
            </svg>
            Move
        </button>
        <button type="button"
                id="batch-download-btn"
                class="batch-action-btn"
                aria-label="Download selected items as ZIP">
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4" aria-hidden="true">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
            Download
        </button>
        <button type="button"
                id="batch-delete-btn"
                class="batch-action-btn batch-action-btn-danger"
                aria-label="Delete selected items">
            <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4" aria-hidden="true">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
            Delete
        </button>
        <button type="button"
                id="batch-cancel-btn"
                class="batch-action-btn"
                aria-label="Cancel selection">
            Cancel
        </button>
    </div>
</div>

<!-- Progress indicator for batch operations -->
<div id="batch-progress"
     class="batch-progress"
     role="progressbar"
     aria-valuemin="0"
     aria-valuemax="100"
     aria-valuenow="0"
     aria-label="Batch operation progress"
     hidden>
    <div class="batch-progress-bar">
        <div id="batch-progress-fill" class="batch-progress-fill" style="width: 0%"></div>
    </div>
    <div class="batch-progress-text">
        <span id="batch-progress-status">Processing...</span>
        <span id="batch-progress-percent">0%</span>
    </div>
</div>