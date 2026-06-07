<?php

/**
 * Error & Status Messages
 * 
 * Centralized message definitions for consistent i18n-ready error handling.
 * All messages in Bahasa Indonesia for consistency.
 * 
 * @version 1.0.0
 */

return [
    // Authentication
    'auth_required'              => 'Autentikasi diperlukan.',
    'auth_login_failed'          => 'Username atau password salah.',
    'auth_account_disabled'      => 'Akun dinonaktifkan. Hubungi administrator.',
    'auth_rate_limited'          => 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.',
    'auth_session_expired'       => 'Sesi telah berakhir. Silakan login kembali.',
    'auth_setup_admin_exists'    => 'Akun admin sudah ada. Gunakan login untuk mengakses sistem.',

    // Authorization
    'access_denied'              => 'Akses ditolak.',
    'role_insufficient'          => 'Akses ditolak. Role "%s" diperlukan.',
    'write_denied'               => 'Akses ditolak. Anda tidak memiliki izin tulis.',
    'cannot_delete_last_admin'   => 'Tidak bisa menghapus admin terakhir.',

    // HTTP
    'method_not_allowed'         => 'Metode HTTP tidak diizinkan.',

    // Path & Files
    'root_not_found'             => 'Root directory tidak ditemukan.',
    'path_not_found'             => 'Path tidak ditemukan.',
    'path_outside_root'          => 'Akses path di luar root tidak diizinkan.',
    'path_invalid'               => 'Path tidak valid.',
    'file_not_found'             => 'File tidak ditemukan.',
    'file_not_accessible'        => 'File tidak dapat diakses.',
    'file_not_readable'          => 'File tidak dapat dibaca.',
    'file_not_writable'          => 'File tidak dapat diubah.',
    'file_name_required'         => 'Nama wajib diisi.',
    'file_name_taken'            => 'Nama sudah digunakan.',
    'file_name_invalid'          => 'Nama tidak valid.',
    'file_name_too_long'         => 'Nama file terlalu panjang (maks 255 karakter).',
    'file_type_unsupported'      => 'Tipe file tidak didukung.',
    'file_too_large'             => 'File terlalu besar untuk pratinjau.',
    'file_size_exceeded'         => 'Ukuran file (%sMB) melebihi batas (%sMB).',
    'file_empty'                 => 'Tidak ada file yang diunggah.',
    'file_invalid'               => 'File tidak valid.',
    'file_extension_blocked'     => 'Tipe file .%s tidak diizinkan karena alasan keamanan.',

    // Directories
    'dir_not_found'              => 'Direktori tidak ditemukan.',
    'dir_not_writable'           => 'Direktori tujuan tidak dapat ditulisi.',
    'dir_not_accessible'         => 'Direktori tidak dapat diakses.',
    'dir_not_processable'        => 'Direktori tidak dapat diproses.',
    'dir_not_valid'              => 'Direktori tujuan tidak valid.',
    'dir_parent_not_found'       => 'Direktori induk tidak ditemukan.',
    'cannot_delete_root'         => 'Tidak dapat menghapus direktori root.',

    // Upload
    'upload_invalid'             => 'File upload tidak valid.',
    'upload_partial'             => 'File hanya terunggah sebagian.',
    'upload_no_tmp_dir'          => 'Folder sementara tidak ditemukan.',
    'upload_cant_write'          => 'Gagal menulis file ke disk.',
    'upload_extension_blocked'   => 'Ekstensi file diblokir.',
    'upload_generic_error'       => 'Terjadi kesalahan saat mengunggah file.',
    'upload_move_failed'         => 'Gagal memindahkan file yang diunggah.',
    'upload_folder_create_failed' => 'Gagal membuat direktori.',
    'upload_chunk_save_failed'   => 'Gagal menyimpan chunk.',
    'upload_chunk_missing'       => 'Chunk ke-%d hilang saat merakit file.',
    'upload_chunk_read_failed'   => 'Gagal membaca chunk ke-%d.',
    'upload_assembly_failed'     => 'Gagal membuat berkas akhir.',
    'upload_lock_failed'         => 'Gagal mendapatkan kunci untuk menulis berkas akhir.',
    'upload_write_failed'        => 'Gagal menulis ke berkas akhir.',
    'upload_original_name_required' => 'Nama file asli wajib diisi.',

    // Create
    'create_type_invalid'        => 'Tipe tidak valid.',
    'create_content_invalid'     => 'Konten wajib berupa string.',

    // Rename
    'rename_old_path_required'   => 'Path item wajib diisi.',
    'rename_new_name_required'   => 'Nama baru wajib diisi.',
    'rename_new_path_required'   => 'Path baru wajib diisi.',
    'rename_failed'              => 'Gagal mengubah nama item.',

    // Move / Copy
    'move_source_required'       => 'Path sumber wajib diisi.',
    'move_into_self'             => 'Tidak dapat memindahkan folder ke dalam dirinya sendiri.',
    'move_into_subdir_self'      => 'Tidak dapat memindahkan folder ke dalam subdirektori-nya sendiri.',
    'move_failed'                => 'Gagal memindahkan item.',
    'copy_source_not_found'      => 'Item sumber tidak ditemukan.',
    'copy_into_self'             => 'Tidak dapat menyalin folder ke dalam dirinya sendiri.',
    'copy_dir_create_failed'     => 'Gagal membuat direktori tujuan.',
    'copy_file_failed'           => 'Gagal menyalin file.',

    // Trash
    'trash_path_invalid'         => 'Path tidak valid.',
    'trash_item_not_found'       => 'Item tidak ditemukan di trash.',
    'trash_file_not_found'       => 'File trash tidak ditemukan.',
    'trash_dir_create_failed'    => 'Gagal membuat direktori trash.',
    'trash_dir_not_writable'     => 'Direktori trash tidak dapat ditulisi.',
    'trash_restore_conflict'     => 'Tidak dapat membuat nama unik untuk restore.',
    'trash_parent_create_failed' => 'Gagal membuat direktori parent.',
    'trash_restore_failed'       => 'Gagal merestore item.',
    'trash_delete_dir_failed'    => 'Gagal menghapus subdirektori.',
    'trash_delete_file_failed'   => 'Gagal menghapus file.',
    'trash_delete_dir_main_failed' => 'Gagal menghapus direktori trash.',

    // Archive
    'archive_not_supported'      => 'ZipArchive tidak tersedia di server.',
    'archive_empty'              => 'Tidak ada file yang dipilih untuk dikompres.',
    'archive_create_failed'      => 'Gagal membuat file ZIP. Error code: %d',
    'archive_add_failed'         => 'Gagal menambahkan ke ZIP.',
    'archive_open_failed'        => 'Gagal membuka file ZIP. Error code: %d',
    'archive_extract_failed'     => 'Gagal mengekstrak file ZIP.',
    'archive_unsafe_path'        => 'File ZIP mengandung path tidak aman: %s',
    'archive_7zip_not_available' => '7-Zip tidak tersedia di server. Install 7-Zip untuk mengekstrak file ini.',
    'archive_7zip_extract_failed' => 'Gagal mengekstrak arsip: %s',
    'archive_type_unsupported'   => 'Format arsip tidak didukung.',
    'archive_invalid'            => 'File bukan format ZIP yang valid.',

    // Search
    'search_query_required'      => 'Parameter pencarian (q) diperlukan.',
    'search_regex_invalid'       => 'Pola regex tidak valid: %s',

    // Share
    'share_token_required'       => 'Token wajib diisi.',
    'share_not_found'            => 'Link berbagi tidak ditemukan.',
    'share_disabled'             => 'Link berbagi sudah dinonaktifkan.',
    'share_expired'              => 'Link berbagi sudah kedaluwarsa.',
    'share_downloads_exhausted'  => 'Batas unduhan sudah tercapai.',
    'share_download_not_allowed' => 'Unduhan tidak diizinkan untuk link ini.',
    'share_password_wrong'       => 'Password salah.',
    'share_password_not_validated' => 'Password belum divalidasi. Silakan akses link lagi.',
    'share_file_unavailable'     => 'File tidak lagi tersedia.',
    'share_create_failed'        => 'Gagal membuat link berbagi: %s',
    'share_delete_failed'        => 'Gagal menghapus share: %s',
    'share_list_failed'          => 'Gagal mengambil daftar share: %s',
    'share_access_failed'        => 'Gagal mengakses share: %s',
    'share_download_failed'      => 'Gagal mengunduh file.',
    'share_rate_limited'         => 'Terlalu banyak permintaan. Coba lagi dalam beberapa menit.',
    'share_file_not_found'       => 'File atau folder tidak ditemukan.',

    // Logs
    'log_write_failed'           => 'Gagal menulis log aktivitas.',
    'log_cleanup_failed'         => 'Gagal membersihkan log aktivitas.',

    // Setup
    'setup_success'              => 'Akun admin berhasil dibuat. Silakan login.',
    'setup_init_success'         => 'Database berhasil diinisialisasi.',

    // System
    'system_php_version_required' => 'PHP %s tidak memenuhi syarat (minimal 7.4)',
    'system_extension_missing'   => 'Extension tidak tersedia: %s',
    'system_dir_not_writable'    => 'Beberapa direktori tidak dapat ditulisi.',

    // Generic
    'generic_error'              => 'Terjadi kesalahan.',
    'generic_internal_error'     => 'Terjadi kesalahan internal.',
    'payload_invalid'            => 'Payload tidak valid.',
    'payload_unreadable'         => 'Payload tidak dapat dibaca.',
    'data_empty'                 => 'Tidak ada data yang diubah.',
    'name_required'              => 'Nama wajib diisi.',
    'paths_required'             => 'Daftar path harus berupa array.',
    'path_string_required'       => 'Path wajib berupa string.',
];
