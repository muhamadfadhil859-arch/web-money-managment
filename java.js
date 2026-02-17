// ================= THEME TOGGLE =================
const themeButton = document.getElementById('buttontheme');
const body = document.body;

// Check for saved theme preference or default to 'dark'
const currentTheme = localStorage.getItem('theme') || 'dark';

// Apply saved theme on page load
if (currentTheme === 'light') {
  body.classList.add('light-theme');
}

// Toggle theme on button click
themeButton?.addEventListener('click', () => {
  body.classList.toggle('light-theme');
  
  // Save theme preference
  const theme = body.classList.contains('light-theme') ? 'light' : 'dark';
  localStorage.setItem('theme', theme);
});

// ================= HOME PAGE: MONTH DROPDOWN + CHART RELOAD =================
// Dropdown bulan di home.html (tidak ada redirect, cukup filter ulang chart)
if (document.querySelector('.dashboard')) {
  document.querySelectorAll('.month-dropdown').forEach(dropdown => {
    const selector   = dropdown.querySelector('.month-selector');
    const spanMonth  = dropdown.querySelector('.selected-month');
    const items      = dropdown.querySelectorAll('.month-list li');

    selector?.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.month-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.remove('active');
      });
      dropdown.classList.toggle('active');
    });

    items.forEach(item => {
      item.addEventListener('click', e => {
        e.stopPropagation();
        spanMonth.textContent = item.dataset.month;
        items.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        dropdown.classList.remove('active');
        // Re-render chart bila tersedia
        if (typeof renderCharts === 'function') renderCharts();
      });
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.month-dropdown').forEach(d => d.classList.remove('active'));
  });
}

// ================= MONTH DROPDOWN (NON-HOME PAGES) =================
// Hanya aktif di halaman selain dashboard (add, document)
if (!document.querySelector('.dashboard')) {
  const monthDropdowns = document.querySelectorAll('.month-dropdown');

  monthDropdowns.forEach(dropdown => {
    const selector = dropdown.querySelector('.month-selector');
    const selectedMonth = dropdown.querySelector('.selected-month');
    const monthItems = dropdown.querySelectorAll('.month-list li');

    selector?.addEventListener('click', (e) => {
      e.stopPropagation();
      monthDropdowns.forEach(other => {
        if (other !== dropdown) other.classList.remove('active');
      });
      dropdown.classList.toggle('active');
    });

    monthItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedMonth.textContent = item.getAttribute('data-month');
        monthItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        dropdown.classList.remove('active');
      });
    });
  });

  document.addEventListener('click', () => {
    monthDropdowns.forEach(dropdown => dropdown.classList.remove('active'));
  });
}

// ================= CATEGORY AND TYPE SELECTION (ADD PAGE) =================
const savingsBtn = document.querySelector(".top .savings");
const spendingBtn = document.querySelector(".top .spending");
const allTypeBtns = document.querySelectorAll(".tabel1 .press, .tabel2 .press, .tabel3 .press");

let currentCategory = null; // 'savings' atau 'spending'

// Handle kategori utama (Savings/Spending)
savingsBtn?.addEventListener("click", function() {
  currentCategory = 'savings';
  
  // Set active kategori
  savingsBtn.classList.add("active");
  spendingBtn.classList.remove("active");
  
  // Reset semua type buttons
  allTypeBtns.forEach(btn => btn.classList.remove("active"));
  
  // Enable/disable buttons sesuai kategori
  allTypeBtns.forEach(btn => {
    if (btn.classList.contains("savings")) {
      btn.style.opacity = "1";
      btn.style.pointerEvents = "auto";
    } else {
      btn.style.opacity = "0.3";
      btn.style.pointerEvents = "none";
    }
  });
});

spendingBtn?.addEventListener("click", function() {
  currentCategory = 'spending';
  
  // Set active kategori
  spendingBtn.classList.add("active");
  savingsBtn.classList.remove("active");
  
  // Reset semua type buttons
  allTypeBtns.forEach(btn => btn.classList.remove("active"));
  
  // Enable/disable buttons sesuai kategori
  allTypeBtns.forEach(btn => {
    if (btn.classList.contains("food")) {
      btn.style.opacity = "1";
      btn.style.pointerEvents = "auto";
    } else {
      btn.style.opacity = "0.3";
      btn.style.pointerEvents = "none";
    }
  });
});

// Handle type selection dalam kategori yang sama
allTypeBtns.forEach(button => {
  button.addEventListener("click", function() {
    // Hanya izinkan klik jika kategori sudah dipilih
    if (!currentCategory) return;
    
    // Cari semua button dalam kategori yang sama
    const categoryClass = currentCategory === 'savings' ? 'savings' : 'food';
    const sameCategoryBtns = document.querySelectorAll(`.tabel1 .${categoryClass}, .tabel2 .${categoryClass}, .tabel3 .${categoryClass}`);
    
    // Hapus active dari semua button di kategori yang sama
    sameCategoryBtns.forEach(btn => btn.classList.remove("active"));
    
    // Tambahkan active ke button yang diklik
    this.classList.add("active");
  });
});

// ================= CONFIRM BUTTON & SAVE DATA =================
const confirmButton = document.querySelector(".confirm");

if (confirmButton) {
  confirmButton.addEventListener("click", function() {
    
    // Validasi kategori
    const activeCategory = document.querySelector(".top .press.active");
    if (!activeCategory) {
      alert("Pilih kategori terlebih dahulu (Savings atau Spending)!");
      return;
    }

    // Validasi type
    const activeType = document.querySelector(".tabel1 .press.active, .tabel2 .press.active, .tabel3 .press.active");
    if (!activeType) {
      alert("Pilih type terlebih dahulu!");
      return;
    }

    // Ambil input details dan price
    const detailsInput = document.querySelector('input[type="text"].kolom');
    const priceInput = document.querySelector('input[type="number"].kolom');

    if (!detailsInput || !priceInput) {
      alert("Input tidak ditemukan!");
      return;
    }

    const details = detailsInput.value.trim();
    const price = priceInput.value.trim();

    // Validasi input
    if (details === "") {
      alert("Mohon isi Details!");
      return;
    }

    if (price === "" || price === "0") {
      alert("Mohon isi Price dengan benar!");
      return;
    }

    // Tentukan kategori (savings atau spending)
    const category = activeCategory.textContent.toLowerCase().trim();
    const type = activeType.textContent.trim();

    // Buat objek data baru
    const newData = {
      category: category,
      type: type,
      details: details,
      price: parseInt(price),
      date: new Date().toLocaleDateString("id-ID", {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      })
    };

    // Ambil data yang sudah ada dari localStorage
    let allData = JSON.parse(localStorage.getItem("financeData")) || [];
    
    // Tambahkan data baru
    allData.push(newData);
    
    // Simpan kembali ke localStorage
    localStorage.setItem("financeData", JSON.stringify(allData));

    // Tampilkan pesan sukses
    alert(`Data berhasil disimpan!\nKategori: ${category}\nType: ${type}`);

    // Reset form
    detailsInput.value = "";
    priceInput.value = "";
    
    // Reset active states
    document.querySelectorAll(".press.active").forEach(btn => btn.classList.remove("active"));
    currentCategory = null;
    
    // Reset opacity semua type buttons
    allTypeBtns.forEach(btn => {
      btn.style.opacity = "0.3";
      btn.style.pointerEvents = "none";
    });

    // Pindah ke halaman document
    setTimeout(() => {
      window.location.href = "document.html";
    }, 500);
  });
}

// ================= DELETE FUNCTION =================
function deleteItem(index) {
  // Konfirmasi sebelum menghapus
  if (confirm("Apakah Anda yakin ingin menghapus data ini?")) {
    // Ambil data dari localStorage
    let allData = JSON.parse(localStorage.getItem("financeData")) || [];
    
    // Hapus item berdasarkan index
    allData.splice(index, 1);
    
    // Simpan kembali ke localStorage
    localStorage.setItem("financeData", JSON.stringify(allData));
    
    // Reload halaman untuk update tampilan
    location.reload();
  }
}

// ================= CALCULATE AND UPDATE TOTALS FOR DOCUMENT PAGE =================
function updateDocumentTotals() {
  // Ambil semua data dari localStorage
  const allData = JSON.parse(localStorage.getItem("financeData")) || [];
  
  // Pisahkan data berdasarkan kategori
  const savingsData = allData.filter(item => item.category === 'savings');
  const spendingData = allData.filter(item => item.category === 'spending');
  
  // Hitung total
  const totalSavings = savingsData.reduce((sum, item) => sum + item.price, 0);
  const totalSpending = spendingData.reduce((sum, item) => sum + item.price, 0);
  
  // Update elemen total di document page
  const totalSpendingElement = document.getElementById('total-spending');
  const totalSavingsElement = document.getElementById('total-savings');
  
  if (totalSpendingElement) {
    totalSpendingElement.textContent = `Total: RP. ${totalSpending.toLocaleString("id-ID")}`;
  }
  
  if (totalSavingsElement) {
    totalSavingsElement.textContent = `Total: RP. ${totalSavings.toLocaleString("id-ID")}`;
  }
}

// ================= LOAD DATA TO DOCUMENT PAGE =================
document.addEventListener("DOMContentLoaded", function () {

  const spendingGrids = document.querySelectorAll(".spending-grid");
  if (spendingGrids.length === 0) return;

  // Update totals first
  updateDocumentTotals();

  // Ambil semua data dari localStorage
  const allData = JSON.parse(localStorage.getItem("financeData")) || [];

  // Pisahkan data berdasarkan kategori dengan index asli
  const spendingData = allData.map((item, index) => ({...item, originalIndex: index}))
                              .filter(item => item.category === 'spending');
  const savingsData = allData.map((item, index) => ({...item, originalIndex: index}))
                             .filter(item => item.category === 'savings');

  // Grid pertama untuk Spending (pink dots)
  if (spendingGrids[0]) {
    const spendingGrid = spendingGrids[0];
    const headerRow = spendingGrid.querySelector('.header-row');
    
    // Hapus semua row kecuali header
    const existingRows = spendingGrid.querySelectorAll('.grid-row:not(.header-row)');
    existingRows.forEach(row => row.remove());

    // Tambahkan data spending
    spendingData.forEach(item => {
      const row = document.createElement("div");
      row.classList.add("grid-row");

      row.innerHTML = `
        <div class="type-cell"><span class="dot pink"></span> ${item.type}</div>
        <div>${item.details}</div>
        <div>${item.date}</div>
        <div class="text-right bold">RP. ${item.price.toLocaleString("id-ID")}</div>
        <div class="delete-cell">
          <button class="delete-btn" onclick="deleteItem(${item.originalIndex})">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      `;

      spendingGrid.appendChild(row);
    });

    // Jika tidak ada data, tampilkan pesan
    if (spendingData.length === 0) {
      const emptyRow = document.createElement("div");
      emptyRow.classList.add("grid-row");
      emptyRow.innerHTML = `
        <div colspan="5" style="text-align: center; padding: 20px; opacity: 0.5; grid-column: 1 / -1;">
          Belum ada data spending
        </div>
      `;
      spendingGrid.appendChild(emptyRow);
    }
  }

  // Grid kedua untuk Savings (blue dots)
  if (spendingGrids[1]) {
    const savingsGrid = spendingGrids[1];
    const headerRow = savingsGrid.querySelector('.header-row');
    
    // Hapus semua row kecuali header
    const existingRows = savingsGrid.querySelectorAll('.grid-row:not(.header-row)');
    existingRows.forEach(row => row.remove());

    // Tambahkan data savings
    savingsData.forEach(item => {
      const row = document.createElement("div");
      row.classList.add("grid-row");

      row.innerHTML = `
        <div class="type-cell"><span class="dot blue"></span> ${item.type}</div>
        <div>${item.details}</div>
        <div>${item.date}</div>
        <div class="text-right bold">RP. ${item.price.toLocaleString("id-ID")}</div>
        <div class="delete-cell">
          <button class="delete-btn" onclick="deleteItem(${item.originalIndex})">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      `;

      savingsGrid.appendChild(row);
    });

    // Jika tidak ada data, tampilkan pesan
    if (savingsData.length === 0) {
      const emptyRow = document.createElement("div");
      emptyRow.classList.add("grid-row");
      emptyRow.innerHTML = `
        <div colspan="5" style="text-align: center; padding: 20px; opacity: 0.5; grid-column: 1 / -1;">
          Belum ada data savings
        </div>
      `;
      savingsGrid.appendChild(emptyRow);
    }
  }
});