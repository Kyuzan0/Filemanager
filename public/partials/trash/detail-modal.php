<!-- Trash Detail Modal -->
<div class="modal-overlay" id="detail-modal">
    <div class="modal-dialog" style="max-width: 500px;">
        <div class="modal-header">
            <h3 id="detail-modal-title"><i class="ri-information-line"></i> Detail Item</h3>
            <button class="modal-close" id="detail-modal-close"><i class="ri-close-line"></i></button>
        </div>
        <div class="modal-body">
            <div class="detail-row" style="display: flex; margin-bottom: 0.75rem;">
                <span class="detail-label" style="width: 120px; color: #94a3b8; font-size: 0.875rem;">Nama</span>
                <span class="detail-value" id="detail-name" style="flex: 1; font-weight: 500;">-</span>
            </div>
            <div class="detail-row" style="display: flex; margin-bottom: 0.75rem;">
                <span class="detail-label" style="width: 120px; color: #94a3b8; font-size: 0.875rem;">Tipe</span>
                <span class="detail-value" id="detail-type" style="flex: 1;">-</span>
            </div>
            <div class="detail-row" style="display: flex; margin-bottom: 0.75rem;">
                <span class="detail-label" style="width: 120px; color: #94a3b8; font-size: 0.875rem;">Path Asli</span>
                <span class="detail-value" id="detail-path" style="flex: 1; word-break: break-all;">-</span>
            </div>
            <div class="detail-row" style="display: flex; margin-bottom: 0.75rem;">
                <span class="detail-label" style="width: 120px; color: #94a3b8; font-size: 0.875rem;">Ukuran</span>
                <span class="detail-value" id="detail-size" style="flex: 1;">-</span>
            </div>
            <div class="detail-row" style="display: flex; margin-bottom: 0.75rem;">
                <span class="detail-label" style="width: 120px; color: #94a3b8; font-size: 0.875rem;">Dihapus</span>
                <span class="detail-value" id="detail-deleted" style="flex: 1;">-</span>
            </div>
            <div class="detail-row" style="display: flex; margin-bottom: 0;">
                <span class="detail-label" style="width: 120px; color: #94a3b8; font-size: 0.875rem;">Dihapus Oleh</span>
                <span class="detail-value" id="detail-by" style="flex: 1;">-</span>
            </div>
        </div>
        <div class="modal-footer" style="display: flex; gap: 0.5rem; justify-content: flex-end;">
            <button class="btn" id="detail-cancel" style="background: #475569; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer;">Tutup</button>
            <button class="btn" id="detail-restore" style="background: #10b981; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer;"><i class="ri-arrow-go-back-line"></i> Restore</button>
            <button class="btn" id="detail-delete" style="background: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer;"><i class="ri-delete-bin-line"></i> Hapus Permanen</button>
        </div>
    </div>
</div>
