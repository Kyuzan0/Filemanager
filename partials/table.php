<?php
// Partial: table & file list (table wrapper + empty state + status bar)
// This partial is intended to be included in index.php. JS wiring points are noted below.
?>
<section class="file-card container mx-auto px-4 md:px-4 mt-1 md:mt-0">
    <div class="file-card-header mb-2 md:mb-3">
        <div class="alert error" id="error-banner" role="alert"></div>
        <!-- Desktop Search (hidden on mobile) -->
        <div class="search-field relative hidden md:block">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><path d="M15.5 14h-.79l-.28-.27a6 6 0 1 0-.71.71l.27.28v.79l4.5 4.5a1 1 0 0 0 1.41-1.41L15.5 14zm-6 0a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/></svg>
            <input id="filter-input" type="search" placeholder="Cari file atau folder" autocomplete="off" class="pl-10 pr-8 py-2 w-full rounded-md border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-sm" />
            <button type="button" class="clear-search absolute right-2 top-1/2 -translate-y-1/2 text-lg" id="clear-search" aria-label="Bersihkan pencarian" hidden>
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    </div>

    <!-- DESKTOP TABLE -->
    <div class="table-wrapper hidden md:block overflow-auto bg-white rounded-md shadow-sm p-2 -mx-4 px-4 md:mx-0 md:px-2">
        <table class="w-full min-w-[600px] md:min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50 sticky top-0">
                <tr>
                    <th scope="col" class="selection-column px-2 md:px-4 py-2 w-12">
                        <input type="checkbox" id="select-all" aria-label="Pilih semua item">
                    </th>
                    <th scope="col" class="sortable px-2 md:px-4 py-2 text-left text-sm font-medium text-gray-700 min-w-[200px]" data-sort-key="name" aria-sort="none">
                        <span class="column-header">Name</span>
                    </th>
                    <th scope="col" class="sortable px-2 md:px-4 py-2 text-left text-sm font-medium text-gray-700 min-w-[120px]" data-sort-key="modified" aria-sort="none">
                        <span class="column-header">Date</span>
                    </th>
                    <th scope="col" class="sortable px-2 md:px-4 py-2 text-right text-sm font-medium text-gray-700 w-[100px]" data-sort-key="size" aria-sort="none">
                        <span class="column-header">Size</span>
                    </th>
                    <th scope="col" class="actions-column px-2 md:px-4 py-2 text-left text-sm font-medium text-gray-700 w-[120px] md:w-auto">Aksi</th>
                </tr>
            </thead>
            <tbody id="file-table" class="bg-white divide-y divide-gray-100"></tbody>
        </table>
    </div>
    
    <!-- PAGINATION CONTROLS (will be populated by JS) -->
    <div id="pagination-container" class="pagination-container hidden md:block"></div>
    <div id="pagination-mobile" class="pagination-mobile md:hidden"></div>

    <!-- MOBILE VIEW -->
    <div id="mobile-file-list" class="md:hidden divide-y bg-white rounded-md shadow-sm -mx-4 px-4 md:mx-0 md:px-2"></div>

    <div class="empty-state py-8 text-center text-sm text-gray-500" id="empty-state" hidden>Tidak ada file atau folder di direktori ini.</div>

    <div class="status-bar mt-3 text-sm text-gray-600 flex flex-col md:flex-row md:items-center md:justify-between gap-2" hidden>
        <span id="status-info">Menunggu data...</span>
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2">
            <span id="status-filter" hidden></span>
            <span id="status-sort" hidden></span>
            <span id="status-time"></span>
        </div>
    </div>
</section>

<!-- Notes:
 - JS wiring needed:
    * filter input: #filter-input
    * clear button: #clear-search
    * select all checkbox: #select-all
    * file rows container: #file-table (desktop)
    * mobile file list container: #mobile-file-list (mobile)
 - Event handlers live in [`assets/js/modules/eventHandlers.js`](assets/js/modules/eventHandlers.js:1)
 - Pagination module inserts `.pagination-container` after `.table-wrapper` (see [`assets/js/modules/pagination.js`](assets/js/modules/pagination.js:1)
-->