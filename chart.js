// ============================================================
//  chart.js — Home Dashboard Charts
//  Fitur:
//  - Donut chart spending & savings dari localStorage
//  - Line chart per bulan
//  - Progress bar berbasis BATAS (limit) yang bisa diubah
//    · Spending: merah jika melebihi batas, kuning jika >= 80%
//    · Savings : hijau jika mencapai target, ungu biasa jika belum
//  - Limit disimpan di localStorage agar persisten
// ============================================================

// --- Nama bulan ---
const BULAN = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
];

// --- Warna per type ---
const SPEND_COLORS = {
  food      : '#E85D7A',
  transport : '#F0A0B0',
  needs     : '#C94070',
  default   : '#FF6B9D'
};

const SAVE_COLORS = {
  'income active'  : '#7B5DE8',
  'scholarship'    : '#A688F5',
  'income passive' : '#5B3EC8',
  default          : '#9B7BFF'
};

// --- Format rupiah ---
function formatRp(val) {
  if (!val || val === 0) return 'RP. 0';
  return 'RP. ' + Number(val).toLocaleString('id-ID');
}

// --- localStorage helpers ---
function getData() {
  try { return JSON.parse(localStorage.getItem('financeData')) || []; }
  catch { return []; }
}

function getLimit(key) {
  const v = localStorage.getItem(key);
  return v ? parseInt(v, 10) : 0;
}

function saveLimit(key, val) {
  localStorage.setItem(key, val);
}

// --- Kalkulasi ---
function sumCategory(data, category) {
  return data
    .filter(d => d.category === category)
    .reduce((acc, d) => acc + (parseInt(d.price) || 0), 0);
}

function sumByType(data, category, types) {
  const result = {};
  types.forEach(t => {
    result[t] = data
      .filter(d => d.category === category && d.type.toLowerCase() === t.toLowerCase())
      .reduce((acc, d) => acc + (parseInt(d.price) || 0), 0);
  });
  return result;
}

function sumByMonth(data, category) {
  const monthly = new Array(12).fill(0);
  data.filter(d => d.category === category).forEach(d => {
    if (!d.date) return;
    const parts = d.date.split('/');
    if (parts.length < 3) return;
    const monthIdx = parseInt(parts[1], 10) - 1; // dd/mm/yyyy
    if (monthIdx >= 0 && monthIdx < 12) {
      monthly[monthIdx] += parseInt(d.price) || 0;
    }
  });
  return monthly;
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return r + ',' + g + ',' + b;
}

// --- Header cards ---
function updateHeader(data) {
  const totalSv = sumCategory(data, 'savings');
  const totalSp = sumCategory(data, 'spending');
  const balance = totalSv - totalSp;
  const el = function(id) { return document.getElementById(id); };
  if (el('savings-amount'))  el('savings-amount').textContent  = formatRp(totalSv);
  if (el('spending-amount')) el('spending-amount').textContent = formatRp(totalSp);
  if (el('balance-amount'))  el('balance-amount').textContent  = formatRp(Math.max(0, balance));
}

// ─── Donut: pure Canvas API ───────────────────────────────────
// bg ring   : abu-abu full 270°  (selalu penuh)
// arc warna : bergerak 0 → 270° sesuai actual/limit
//   - dibagi per kategori secara proporsional dalam arc terisi
// Tidak pakai Chart.js agar kontrol arc 100% akurat.

var donutAnimFrames = {}; // requestAnimationFrame ids

function buildDonut(canvasId, vals, colors, labelId, total, limit) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;

  // Update label tengah
  var labelEl = document.getElementById(labelId);
  if (labelEl) {
    labelEl.querySelector('.donut-label-val').textContent =
      total > 0 ? formatRp(total) : 'RP. 0';
  }

  // Hentikan animasi sebelumnya
  if (donutAnimFrames[canvasId]) {
    cancelAnimationFrame(donutAnimFrames[canvasId]);
    donutAnimFrames[canvasId] = null;
  }

  var size   = canvas.width  || 120;
  canvas.width  = size;
  canvas.height = size;

  var ctx    = canvas.getContext('2d');
  var cx     = size / 2;
  var cy     = size / 2;
  var ro     = size / 2 - 6;   // outer radius
  var ri     = ro * 0.70;      // inner radius (cutout 70%)
  var lw     = ro - ri;        // ring thickness

  // Arc: mulai dari -135° (-225° dalam radian), total span 270°
  var START_DEG = -225;        // deg, ujung kiri bawah
  var SPAN_DEG  = 270;         // deg total arc

  var hasLimit = limit && limit > 0;
  var pct      = hasLimit ? Math.min(total / limit, 1) : (total > 0 ? 1 : 0);

  // Filter kategori yg punya nilai > 0
  var segs = [];
  for (var i = 0; i < vals.length; i++) {
    if (vals[i] > 0) segs.push({ val: vals[i], color: colors[i] });
  }

  // Animasi: arc tumbuh dari 0 ke target
  var targetDeg  = pct * SPAN_DEG;      // deg arc warna yg harus digambar
  var currentDeg = 0;
  var duration   = 1100;                // ms
  var startTime  = null;

  function easeInOutQuart(t) {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  function degToRad(d) { return d * Math.PI / 180; }

  function draw(now) {
    if (!startTime) startTime = now;
    var elapsed = now - startTime;
    var progress = Math.min(elapsed / duration, 1);
    currentDeg = easeInOutQuart(progress) * targetDeg;

    ctx.clearRect(0, 0, size, size);

    // 1. BG ring (abu-abu, selalu full 270°)
    ctx.beginPath();
    ctx.arc(cx, cy, ro - lw / 2, degToRad(START_DEG), degToRad(START_DEG + SPAN_DEG));
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth   = lw;
    ctx.lineCap     = 'round';
    ctx.stroke();

    // 2. Arc warna (dibagi per segmen kategori)
    if (currentDeg > 0.5 && segs.length > 0) {
      var drawnDeg = 0;

      for (var s = 0; s < segs.length; s++) {
        // Porsi segmen ini dalam arc terisi
        var segFrac    = segs[s].val / total;
        var segMaxDeg  = segFrac * currentDeg;  // deg yg dialokasikan untuk segmen ini
        var segStart   = START_DEG + drawnDeg;
        var segEnd     = segStart + segMaxDeg;

        if (segMaxDeg < 0.5) continue; // skip segmen terlalu kecil

        ctx.beginPath();
        ctx.arc(cx, cy, ro - lw / 2, degToRad(segStart), degToRad(segEnd));
        ctx.strokeStyle = segs[s].color;
        ctx.lineWidth   = lw;
        ctx.lineCap     = s === segs.length - 1 ? 'round' : 'butt'; // rounded di ujung akhir
        ctx.stroke();

        drawnDeg += segMaxDeg;
      }

      // lineCap 'round' di awal arc (gambar dot kecil di titik mulai)
      ctx.beginPath();
      ctx.arc(cx, cy, ro - lw / 2, degToRad(START_DEG), degToRad(START_DEG + 0.01));
      ctx.strokeStyle = segs[0].color;
      ctx.lineWidth   = lw;
      ctx.lineCap     = 'round';
      ctx.stroke();
    }

    if (progress < 1) {
      donutAnimFrames[canvasId] = requestAnimationFrame(draw);
    }
  }

  donutAnimFrames[canvasId] = requestAnimationFrame(draw);
}

// Destroy semua donut (untuk cleanup jika perlu)
function destroyAllDonuts() {
  Object.keys(donutAnimFrames).forEach(function(id) {
    if (donutAnimFrames[id]) {
      cancelAnimationFrame(donutAnimFrames[id]);
      donutAnimFrames[id] = null;
    }
  });
}

// --- Line chart ---
var lineInstances = {};

function buildLine(canvasId, monthlyData, color) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (lineInstances[canvasId]) lineInstances[canvasId].destroy();

  var ctx  = canvas.getContext('2d');
  var h    = canvas.parentElement.offsetHeight || 180;
  var grad = ctx.createLinearGradient(0, 0, 0, h);
  var rgb  = hexToRgb(color);
  grad.addColorStop(0, 'rgba(' + rgb + ',0.22)');
  grad.addColorStop(1, 'rgba(' + rgb + ',0)');

  var labels = BULAN.slice(0, 6).map(function(b) { return b.slice(0, 3); });
  var vals   = monthlyData.slice(0, 6);

  lineInstances[canvasId] = new Chart(ctx, {
    type : 'line',
    data : {
      labels   : labels,
      datasets : [{
        data                : vals,
        borderColor         : color,
        backgroundColor     : grad,
        fill                : true,
        tension             : 0.45,
        borderWidth         : 2.5,
        pointRadius         : 0,
        pointHoverRadius    : 6,
        pointBackgroundColor: color,
        pointBorderColor    : '#fff',
        pointBorderWidth    : 2
      }]
    },
    options: {
      responsive          : true,
      maintainAspectRatio : false,
      plugins: {
        legend  : { display: false },
        tooltip : {
          backgroundColor : 'rgba(15,15,15,0.92)',
          borderColor     : 'rgba(255,255,255,0.08)',
          borderWidth     : 1,
          padding         : 10,
          callbacks: {
            label: function(ctx) { return ' ' + formatRp(ctx.raw); }
          }
        }
      },
      scales: {
        x: {
          grid  : { display: false },
          border: { display: false },
          ticks : { color: 'rgba(180,180,180,0.7)', font: { size: 11 } }
        },
        y: {
          grid  : { color: 'rgba(255,255,255,0.04)' },
          border: { display: false },
          ticks : {
            color: 'rgba(180,180,180,0.7)', font: { size: 10 },
            maxTicksLimit: 4,
            callback: function(v) {
              if (v === 0) return '';
              if (v >= 1000000) return (v / 1000000).toFixed(1) + ' jt';
              if (v >= 1000)    return (v / 1000).toFixed(0) + ' rb';
              return v;
            }
          },
          min: 0
        }
      }
    }
  });
}

// --- Progress bar dengan logika limit ---
function setProgressWithLimit(opts) {
  var fillId   = opts.fillId;
  var pctId    = opts.pctId;
  var statusId = opts.statusId;
  var actual   = opts.actual;
  var limit    = opts.limit;
  var type     = opts.type;

  var fillEl   = document.getElementById(fillId);
  var pctEl    = document.getElementById(pctId);
  var statusEl = document.getElementById(statusId);

  if (!fillEl || !pctEl) return;

  // Belum ada limit
  if (!limit || limit === 0) {
    setTimeout(function() { fillEl.style.width = '0%'; }, 300);
    fillEl.className = 'progress-fill ' + (type === 'spending' ? 'pink-fill' : 'purple-fill');
    pctEl.textContent = type === 'spending' ? '0%' : '0%';
    pctEl.className = '';
    if (statusEl) {
      statusEl.textContent = type === 'spending'
        ? 'Belum ada batas spending. Klik ✎ untuk mengatur.'
        : 'Belum ada target savings. Klik ✎ untuk mengatur.';
      statusEl.className = 'progress-status';
    }
    return;
  }

  var pct     = Math.round((actual / limit) * 100);
  var display = Math.min(pct, 100);
  var sisa    = limit - actual;

  setTimeout(function() { fillEl.style.width = display + '%'; }, 300);

  if (type === 'spending') {
    if (pct >= 100) {
      fillEl.className = 'progress-fill over-fill';
      pctEl.textContent = pct + '%';
      pctEl.className = 'over';
      if (statusEl) {
        var lebih = actual - limit;
        statusEl.textContent = '⚠ Melebihi batas! RP. ' + lebih.toLocaleString('id-ID') + ' di atas limit';
        statusEl.className = 'progress-status over';
      }
    } else if (pct >= 80) {
      fillEl.className = 'progress-fill warn-fill';
      pctEl.textContent = pct + '%';
      pctEl.className = 'warn';
      if (statusEl) {
        statusEl.textContent = '⚡ Hampir limit! Sisa RP. ' + sisa.toLocaleString('id-ID');
        statusEl.className = 'progress-status warn';
      }
    } else {
      fillEl.className = 'progress-fill pink-fill';
      pctEl.textContent = pct + '%';
      pctEl.className = '';
      if (statusEl) {
        statusEl.textContent = 'Sisa RP. ' + sisa.toLocaleString('id-ID') + ' dari batas';
        statusEl.className = 'progress-status';
      }
    }
  } else {
    // savings
    if (pct >= 100) {
      fillEl.className = 'progress-fill purple-fill';
      pctEl.textContent = pct + '%';
      pctEl.className = '';
      if (statusEl) {
        var bonus = actual - limit;
        statusEl.textContent = '🎉 Target tercapai! Bonus RP. ' + bonus.toLocaleString('id-ID');
        statusEl.className = 'progress-status good';
      }
    } else {
      fillEl.className = 'progress-fill purple-fill';
      pctEl.textContent = pct + '%';
      pctEl.className = '';
      if (statusEl) {
        statusEl.textContent = 'Butuh RP. ' + sisa.toLocaleString('id-ID') + ' lagi untuk capai target';
        statusEl.className = 'progress-status';
      }
    }
  }
}

// --- Tampilkan nilai limit ---
function renderLimitText(valElId, limit) {
  var el = document.getElementById(valElId);
  if (!el) return;
  el.textContent = limit > 0 ? 'RP. ' + limit.toLocaleString('id-ID') : '–';
}

// --- Toggle form ---
function toggleForm(formEl, show) {
  if (!formEl) return;
  if (show) {
    formEl.classList.remove('hidden');
    requestAnimationFrame(function() { formEl.classList.add('visible'); });
  } else {
    formEl.classList.remove('visible');
    formEl.classList.add('hidden');
  }
}

// --- Inisialisasi tombol edit limit ---
function initLimitControls() {

  // SPENDING
  var spBtnOpen   = document.getElementById('sp-limit-btn');
  var spForm      = document.getElementById('sp-limit-form');
  var spInput     = document.getElementById('sp-limit-input');
  var spSaveBtn   = document.getElementById('sp-limit-save');
  var spCancelBtn = document.getElementById('sp-limit-cancel');

  if (spBtnOpen) {
    spBtnOpen.addEventListener('click', function() {
      var limit = getLimit('spendingLimit');
      spInput.value = limit > 0 ? limit : '';
      toggleForm(spForm, true);
      spInput.focus();
    });
  }

  if (spSaveBtn) {
    spSaveBtn.addEventListener('click', function() {
      var val = parseInt(spInput.value, 10);
      if (isNaN(val) || val < 0) {
        spInput.style.borderColor = '#FF5E5E';
        setTimeout(function() { spInput.style.borderColor = ''; }, 1000);
        return;
      }
      saveLimit('spendingLimit', val);
      toggleForm(spForm, false);
      renderCharts();
    });
  }

  if (spCancelBtn) {
    spCancelBtn.addEventListener('click', function() { toggleForm(spForm, false); });
  }

  if (spInput) {
    spInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter')  spSaveBtn && spSaveBtn.click();
      if (e.key === 'Escape') spCancelBtn && spCancelBtn.click();
    });
  }

  // SAVINGS
  var svBtnOpen   = document.getElementById('sv-limit-btn');
  var svForm      = document.getElementById('sv-limit-form');
  var svInput     = document.getElementById('sv-limit-input');
  var svSaveBtn   = document.getElementById('sv-limit-save');
  var svCancelBtn = document.getElementById('sv-limit-cancel');

  if (svBtnOpen) {
    svBtnOpen.addEventListener('click', function() {
      var limit = getLimit('savingsLimit');
      svInput.value = limit > 0 ? limit : '';
      toggleForm(svForm, true);
      svInput.focus();
    });
  }

  if (svSaveBtn) {
    svSaveBtn.addEventListener('click', function() {
      var val = parseInt(svInput.value, 10);
      if (isNaN(val) || val < 0) {
        svInput.style.borderColor = '#FF5E5E';
        setTimeout(function() { svInput.style.borderColor = ''; }, 1000);
        return;
      }
      saveLimit('savingsLimit', val);
      toggleForm(svForm, false);
      renderCharts();
    });
  }

  if (svCancelBtn) {
    svCancelBtn.addEventListener('click', function() { toggleForm(svForm, false); });
  }

  if (svInput) {
    svInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter')  svSaveBtn && svSaveBtn.click();
      if (e.key === 'Escape') svCancelBtn && svCancelBtn.click();
    });
  }
}

// --- Legend value ---
function setLegendVal(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = formatRp(val);
}

// --- MAIN render ---
function renderCharts() {
  var data = getData();

  updateHeader(data);

  // SPENDING
  var spTypes = sumByType(data, 'spending', ['food', 'transport', 'needs']);
  var totalSp = spTypes.food + spTypes.transport + spTypes.needs;
  var spLimit = getLimit('spendingLimit');

  setLegendVal('sp-food-val',      spTypes.food);
  setLegendVal('sp-transport-val', spTypes.transport);
  setLegendVal('sp-needs-val',     spTypes.needs);

  buildDonut(
    'spendingDonut',
    [spTypes.food, spTypes.transport, spTypes.needs],
    [SPEND_COLORS.food, SPEND_COLORS.transport, SPEND_COLORS.needs],
    'spending-donut-label',
    totalSp,
    spLimit
  );

  renderLimitText('sp-limit-val', spLimit);
  setProgressWithLimit({
    fillId   : 'spending-progress',
    pctId    : 'spending-pct',
    statusId : 'spending-status',
    actual   : totalSp,
    limit    : spLimit,
    type     : 'spending'
  });

  // SAVINGS
  var svTypes   = sumByType(data, 'savings', ['income active', 'scholarship', 'income passive']);
  var totalSv   = svTypes['income active'] + svTypes['scholarship'] + svTypes['income passive'];
  var svLimit   = getLimit('savingsLimit');

  setLegendVal('sv-income-val',  svTypes['income active']);
  setLegendVal('sv-scholar-val', svTypes['scholarship']);
  setLegendVal('sv-passive-val', svTypes['income passive']);

  buildDonut(
    'savingsDonut',
    [svTypes['income active'], svTypes['scholarship'], svTypes['income passive']],
    [SAVE_COLORS['income active'], SAVE_COLORS['scholarship'], SAVE_COLORS['income passive']],
    'savings-donut-label',
    totalSv,
    svLimit
  );

  renderLimitText('sv-limit-val', svLimit);
  setProgressWithLimit({
    fillId   : 'savings-progress',
    pctId    : 'savings-pct',
    statusId : 'savings-status',
    actual   : totalSv,
    limit    : svLimit,
    type     : 'savings'
  });

  // LINE CHARTS
  var spMonthly = sumByMonth(data, 'spending');
  var svMonthly = sumByMonth(data, 'savings');

  buildLine('spendingLine', spMonthly, '#E85D7A');
  buildLine('savingsLine',  svMonthly, '#7B5DE8');
}

// --- Init ---
document.addEventListener('DOMContentLoaded', function() {
  Chart.defaults.color       = 'rgba(180,180,180,0.8)';
  Chart.defaults.font.family = '"Segoe UI", sans-serif';
  Chart.defaults.font.size   = 11;

  initLimitControls();
  renderCharts();
});
