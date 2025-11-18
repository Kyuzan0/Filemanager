document.addEventListener('DOMContentLoaded', function() {
    // Konfigurasi pagination
    const config = {
        itemsPerPage: 6,
        currentPage: 1,
        maxVisiblePages: 5
    };

    // Sample data - dalam aplikasi nyata, ini bisa dari API
    const sampleData = [];
    for (let i = 1; i <= 50; i++) {
        sampleData.push({
            id: i,
            title: `Item ${i}`,
            description: `Ini adalah deskripsi untuk item nomor ${i}`
        });
    }

    // Fungsi untuk menampilkan data pada halaman saat ini
    function displayData() {
        const dataList = document.getElementById('data-list');
        const startIndex = (config.currentPage - 1) * config.itemsPerPage;
        const endIndex = startIndex + config.itemsPerPage;
        const currentPageData = sampleData.slice(startIndex, endIndex);

        // Kosongkan container data
        dataList.innerHTML = '';

        // Tampilkan data untuk halaman saat ini
        currentPageData.forEach(item => {
            const dataItem = document.createElement('div');
            dataItem.className = 'data-item';
            dataItem.innerHTML = `
                <h3>${item.title}</h3>
                <p>${item.description}</p>
            `;
            dataList.appendChild(dataItem);
        });

        // Tampilkan info halaman
        const infoText = document.querySelector('.info-text');
        if (!infoText) {
            const info = document.createElement('div');
            info.className = 'info-text';
            document.querySelector('.data-container').appendChild(info);
        }
        
        document.querySelector('.info-text').textContent = 
            `Menampilkan ${startIndex + 1}-${Math.min(endIndex, sampleData.length)} dari ${sampleData.length} items`;
    }

    // Fungsi untuk membuat tombol pagination
    function createPaginationButtons() {
        const pagination = document.getElementById('pagination');
        const totalPages = Math.ceil(sampleData.length / config.itemsPerPage);
        
        // Kosongkan pagination
        pagination.innerHTML = '';

        // Tombol Previous
        const prevLi = document.createElement('li');
        prevLi.className = config.currentPage === 1 ? 'disabled' : '';
        prevLi.innerHTML = `<a href="#" data-page="${config.currentPage - 1}">&laquo;</a>`;
        pagination.appendChild(prevLi);

        // Tentukan range halaman yang akan ditampilkan
        let startPage = Math.max(1, config.currentPage - Math.floor(config.maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + config.maxVisiblePages - 1);
        
        // Adjust startPage jika endPage mencapai totalPages
        if (endPage - startPage + 1 < config.maxVisiblePages) {
            startPage = Math.max(1, endPage - config.maxVisiblePages + 1);
        }

        // Tombol First (jika tidak menampilkan halaman 1)
        if (startPage > 1) {
            const firstLi = document.createElement('li');
            firstLi.innerHTML = `<a href="#" data-page="1">1</a>`;
            pagination.appendChild(firstLi);
            
            if (startPage > 2) {
                const dotsLi = document.createElement('li');
                dotsLi.innerHTML = '<span>...</span>';
                pagination.appendChild(dotsLi);
            }
        }

        // Tombol halaman
        for (let i = startPage; i <= endPage; i++) {
            const pageLi = document.createElement('li');
            pageLi.className = i === config.currentPage ? 'active' : '';
            pageLi.innerHTML = `<a href="#" data-page="${i}">${i}</a>`;
            pagination.appendChild(pageLi);
        }

        // Tombol Last (jika tidak menampilkan halaman terakhir)
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const dotsLi = document.createElement('li');
                dotsLi.innerHTML = '<span>...</span>';
                pagination.appendChild(dotsLi);
            }
            
            const lastLi = document.createElement('li');
            lastLi.innerHTML = `<a href="#" data-page="${totalPages}">${totalPages}</a>`;
            pagination.appendChild(lastLi);
        }

        // Tombol Next
        const nextLi = document.createElement('li');
        nextLi.className = config.currentPage === totalPages ? 'disabled' : '';
        nextLi.innerHTML = `<a href="#" data-page="${config.currentPage + 1}">&raquo;</a>`;
        pagination.appendChild(nextLi);

        // Tambahkan event listener untuk semua tombol pagination
        const paginationLinks = pagination.querySelectorAll('a');
        paginationLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const page = parseInt(this.getAttribute('data-page'));
                
                if (page && page !== config.currentPage && page > 0 && page <= totalPages) {
                    config.currentPage = page;
                    displayData();
                    createPaginationButtons();
                    
                    // Scroll ke atas container data
                    document.querySelector('.data-container').scrollIntoView({ 
                        behavior: 'smooth' 
                    });
                }
            });
        });
    }

    // Inisialisasi pagination
    function init() {
        displayData();
        createPaginationButtons();
    }

    // Jalankan inisialisasi
    init();
});