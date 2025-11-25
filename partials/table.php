<?php
// Partial: table & file list dengan design sistem baru
?>
<table id="fileTable" class="w-full">
    <thead>
        <tr>
            <th class="px-3 py-3 text-left text-sm font-semibold"><input type="checkbox" id="selectAll"></th>
            <th class="px-3 py-3 text-left text-sm font-semibold">Name</th>
            <th class="px-3 py-3 text-left text-sm font-semibold">Type</th>
            <th class="px-3 py-3 text-left text-sm font-semibold">Date Modified</th>
            <th class="px-3 py-3 text-right text-sm font-semibold">Size</th>
            <th class="px-3 py-3 text-left text-sm font-semibold">Actions</th>
        </tr>
    </thead>
    <tbody id="tbody" class="divide-y divide-slate-100"></tbody>
</table>

<div class="empty-state py-8 text-center text-slate-500 text-sm hidden" id="empty-state">
    Tidak ada file atau folder di direktori ini.
</div>