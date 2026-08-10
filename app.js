// KRUPA STORE POS - MAIN APPLICATION JAVASCRIPT ENGINE

// Default Inventory Items Data
const DEFAULT_ITEMS = [
    { id: 1, name: 'Fancy Bangle Set', category: 'fancy', price: 150, stock: 45 },
    { id: 2, name: 'Lipstick Matte Edition', category: 'fancy', price: 220, stock: 30 },
    { id: 3, name: 'Designer Hair Clip', category: 'fancy', price: 40, stock: 120 },
    { id: 4, name: 'Scented Perfume 100ml', category: 'fancy', price: 350, stock: 25 },
    { id: 5, name: 'Nail Polish Velvet Red', category: 'fancy', price: 65, stock: 80 },
    { id: 6, name: 'Premium Rice 5kg', category: 'grocery', price: 340, stock: 60 },
    { id: 7, name: 'Refined Cooking Oil 1L', category: 'grocery', price: 145, stock: 90 },
    { id: 8, name: 'Crystal Sugar 1kg', category: 'grocery', price: 48, stock: 150 },
    { id: 9, name: 'Assorted Tea Powder 250g', category: 'grocery', price: 110, stock: 75 },
    { id: 10, name: 'Wheat Flour 5kg', category: 'grocery', price: 230, stock: 50 }
];

// Default Sample Bills History
const DEFAULT_BILLS = [
    {
        billNo: 1000,
        date: new Date(Date.now() - 3600000 * 4).toLocaleString(),
        customerName: 'Ramesh Kumar',
        customerPhone: '9876543210',
        items: [
            { id: 1, name: 'Fancy Bangle Set', price: 150, qty: 2 },
            { id: 8, name: 'Crystal Sugar 1kg', price: 48, qty: 1 }
        ],
        subtotal: 348,
        discount: 0,
        grandTotal: 348,
        paymentStatus: 'paid'
    },
    {
        billNo: 999,
        date: new Date(Date.now() - 3600000 * 24).toLocaleString(),
        customerName: 'Suresh Reddy',
        customerPhone: '9812345678',
        items: [
            { id: 6, name: 'Premium Rice 5kg', price: 340, qty: 1 },
            { id: 7, name: 'Refined Cooking Oil 1L', price: 145, qty: 2 }
        ],
        subtotal: 630,
        discount: 30,
        grandTotal: 600,
        paymentStatus: 'credit',
        isBookNoted: true
    },
    {
        billNo: 998,
        date: new Date(Date.now() - 3600000 * 48).toLocaleString(),
        customerName: 'Anitha Sharma',
        customerPhone: '9765432109',
        items: [
            { id: 2, name: 'Lipstick Matte Edition', price: 220, qty: 1 },
            { id: 5, name: 'Nail Polish Velvet Red', price: 65, qty: 2 }
        ],
        subtotal: 350,
        discount: 10,
        grandTotal: 340,
        paymentStatus: 'paid'
    }
];

// App State Management
let items = JSON.parse(localStorage.getItem('krupa_items')) || DEFAULT_ITEMS;
let billsHistory = JSON.parse(localStorage.getItem('krupa_bills')) || DEFAULT_BILLS;
let currentCart = [];
let currentPosFilter = 'all';
let currentHistoryFilter = 'all';
let currentPaymentMode = 'credit';
let currentBillNumber = parseInt(localStorage.getItem('krupa_last_bill_no') || '1001');

let calcVal = '0';
let calcExp = '';

document.addEventListener('DOMContentLoaded', () => {
    // Restore saved theme mode (Light vs Dark)
    const savedThemeMode = localStorage.getItem('krupa_theme_mode') || 'light';
    setThemeMode(savedThemeMode);

    // Load store profile settings if present
    const profile = JSON.parse(localStorage.getItem('krupa_store_profile')) || {
        name: 'Krupa Store',
        tagline: 'Retail Fancy & Grocery Store',
        phone: '+91 9876543210',
        address: 'Main Market Road'
    };
    if (document.getElementById('setting-store-name')) {
        document.getElementById('setting-store-name').value = profile.name;
        document.getElementById('setting-store-tagline').value = profile.tagline;
        document.getElementById('setting-store-phone').value = profile.phone;
        document.getElementById('setting-store-address').value = profile.address;
    }

    updateClock();
    setInterval(updateClock, 1000);
    setPaymentMode('credit');
    renderPosItems();
    renderItemsTable();
    renderHistoryTable();
    renderCreditCustomersTable();
    updateHeaderStats();
    document.getElementById('current-bill-no').innerText = `Bill #${currentBillNumber}`;
});

// Theme Mode Handler (Light vs Dark)
function setThemeMode(mode) {
    document.body.className = `theme-${mode} antialiased min-h-screen flex flex-col`;
    localStorage.setItem('krupa_theme_mode', mode);

    const cardLight = document.getElementById('theme-card-light');
    const cardDark = document.getElementById('theme-card-dark');
    const badgeLight = document.getElementById('badge-theme-light');
    const badgeDark = document.getElementById('badge-theme-dark');

    if (cardLight && cardDark) {
        if (mode === 'light') {
            cardLight.className = 'cursor-pointer p-4 rounded-xl border-2 border-indigo-600 bg-white text-slate-900 shadow-lg transition hover:scale-[1.01] flex flex-col justify-between gap-3';
            cardDark.className = 'cursor-pointer p-4 rounded-xl border-2 border-slate-700 bg-slate-900 text-white shadow-md transition hover:scale-[1.01] flex flex-col justify-between gap-3 opacity-70';
            if (badgeLight) { badgeLight.innerText = 'ACTIVE'; badgeLight.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white block'; }
            if (badgeDark) { badgeDark.innerText = 'SELECT'; badgeDark.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 block'; }
        } else {
            cardDark.className = 'cursor-pointer p-4 rounded-xl border-2 border-indigo-500 bg-slate-900 text-white shadow-lg transition hover:scale-[1.01] flex flex-col justify-between gap-3';
            cardLight.className = 'cursor-pointer p-4 rounded-xl border-2 border-slate-300 bg-white text-slate-900 shadow-md transition hover:scale-[1.01] flex flex-col justify-between gap-3 opacity-70';
            if (badgeDark) { badgeDark.innerText = 'ACTIVE'; badgeDark.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500 text-white block'; }
            if (badgeLight) { badgeLight.innerText = 'SELECT'; badgeLight.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600 block'; }
        }
    }
}

// Interactive Cursor Follower Spotlight
document.addEventListener('mousemove', (e) => {
    const spotlight = document.getElementById('cursor-spotlight');
    if (spotlight) {
        spotlight.style.transform = `translate(${e.clientX - 192}px, ${e.clientY - 192}px)`;
    }
});

// SLEEK NON-BLOCKING TOAST NOTIFICATION ENGINE
function showToastNotification(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const bgClass = type === 'error' ? 'bg-red-600 text-white' : type === 'warning' ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white';
    const iconClass = type === 'error' ? 'fa-triangle-exclamation' : type === 'warning' ? 'fa-circle-exclamation' : 'fa-circle-check';

    toast.className = `${bgClass} px-4 py-3 rounded-xl shadow-2xl font-semibold text-xs flex items-center gap-2.5 transition-all duration-300 transform translate-y-[-10px] opacity-0 pointer-events-auto border border-white/20`;
    toast.innerHTML = `<i class="fa-solid ${iconClass} text-sm"></i><span>${msg}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('translate-y-[-10px]', 'opacity-0');
    }, 10);

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-[-10px]');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ================= SETTINGS & DATA BACKUP HANDLERS =================
function handleSaveStoreProfile(e) {
    e.preventDefault();
    const profile = {
        name: document.getElementById('setting-store-name').value,
        tagline: document.getElementById('setting-store-tagline').value,
        phone: document.getElementById('setting-store-phone').value,
        address: document.getElementById('setting-store-address').value
    };
    localStorage.setItem('krupa_store_profile', JSON.stringify(profile));
    showToastNotification('Store settings saved successfully!', 'success');
}

function exportSystemData() {
    const data = {
        items: items,
        bills: billsHistory,
        lastBillNo: currentBillNumber,
        themeMode: localStorage.getItem('krupa_theme_mode') || 'light',
        exportDate: new Date().toISOString()
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `krupa_store_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importSystemData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = JSON.parse(evt.target.result);
            if (data.items) {
                items = data.items;
                localStorage.setItem('krupa_items', JSON.stringify(items));
            }
            if (data.bills) {
                billsHistory = data.bills;
                localStorage.setItem('krupa_bills', JSON.stringify(billsHistory));
            }
            if (data.lastBillNo) {
                currentBillNumber = data.lastBillNo;
                localStorage.setItem('krupa_last_bill_no', currentBillNumber.toString());
            }
            if (data.themeMode) {
                localStorage.setItem('krupa_theme_mode', data.themeMode);
            }
            alert('Data restored successfully!');
            location.reload();
        } catch (err) {
            alert('Invalid backup JSON file.');
        }
    };
    reader.readAsText(file);
}

function clearHistoryData() {
    if (confirm('Are you sure you want to clear all sales history and Udhar logs?')) {
        billsHistory = [];
        localStorage.removeItem('krupa_bills');
        renderHistoryTable();
        updateHeaderStats();
        alert('Sales history cleared!');
    }
}

function resetItemsToDefault() {
    if (confirm('Reset stock catalogue to default items?')) {
        items = [...DEFAULT_ITEMS];
        localStorage.setItem('krupa_items', JSON.stringify(items));
        renderPosItems();
        renderItemsTable();
        alert('Catalogue reset to defaults!');
    }
}

// ================= JS INTERACTIVE BACKGROUND CANVAS =================
let canvas, ctx, particles = [];
let particleColor = 'rgba(99, 102, 241, 0.4)';

function initParticleCanvas() {
    canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    createParticles();
    animateParticles();
}

function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function createParticles() {
    particles = [];
    const count = Math.floor(window.innerWidth / 30);
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            radius: Math.random() * 2 + 1,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4
        });
    }
}

// Celebration Confetti Sparkle Animation on Checkout
function triggerCheckoutCelebration() {
    const container = document.body;
    const colors = ['#6366f1', '#10b981', '#ec4899', '#f59e0b', '#3b82f6'];
    for (let i = 0; i < 35; i++) {
        const spark = document.createElement('div');
        spark.className = 'fixed pointer-events-none z-50 rounded-full animate-pop-in';
        const size = Math.random() * 8 + 4;
        spark.style.width = `${size}px`;
        spark.style.height = `${size}px`;
        spark.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        spark.style.left = `${Math.random() * 80 + 10}vw`;
        spark.style.top = `${Math.random() * 40 + 20}vh`;
        spark.style.boxShadow = `0 0 10px ${spark.style.backgroundColor}`;
        spark.style.transition = 'all 0.8s ease-out';
        container.appendChild(spark);

        setTimeout(() => {
            spark.style.transform = `translate(${(Math.random() - 0.5) * 200}px, ${(Math.random() - 0.5) * 200 + 150}px) scale(0)`;
            spark.style.opacity = '0';
        }, 50);

        setTimeout(() => spark.remove(), 850);
    }
}

function animateParticles() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
            let p2 = particles[j];
            let dist = Math.hypot(p.x - p2.x, p.y - p2.y);
            if (dist < 100) {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = particleColor.replace(/[\d\.]+\)$/, `${(1 - dist / 100) * 0.15})`);
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
    }
    requestAnimationFrame(animateParticles);
}

function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('current-clock');
    if (clockEl) clockEl.innerText = now.toLocaleTimeString();
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.className = 'tab-btn px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition text-slate-300 hover:text-white hover:bg-slate-800';
    });

    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.remove('hidden');

    const activeBtn = document.getElementById(`tab-btn-${tabName}`);
    if (activeBtn) {
        activeBtn.className = 'tab-btn px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition bg-indigo-600 text-white shadow';
    }

    if (tabName === 'history') {
        renderHistoryTable();
    } else if (tabName === 'customers') {
        renderCreditCustomersTable();
    }
}

// ================= PAYMENT MODE TOGGLE =================
function setPaymentMode(mode) {
    currentPaymentMode = mode;
    const paidBtn = document.getElementById('pay-mode-paid');
    const creditBtn = document.getElementById('pay-mode-credit');
    const warning = document.getElementById('credit-warning-note');
    const bookOption = document.getElementById('credit-book-note-option');
    const custInput = document.getElementById('cust-name');

    if (mode === 'paid') {
        paidBtn.className = 'pay-mode-btn py-1.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 bg-emerald-600 text-white shadow';
        creditBtn.className = 'pay-mode-btn py-1.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 text-red-300 hover:text-white';
        if (warning) warning.classList.add('hidden');
        if (bookOption) bookOption.classList.add('hidden');
        if (custInput) custInput.placeholder = "Customer Name (Optional)";
    } else {
        paidBtn.className = 'pay-mode-btn py-1.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 text-emerald-300 hover:text-white';
        creditBtn.className = 'pay-mode-btn py-1.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 bg-red-600 text-white shadow';
        if (warning) warning.classList.remove('hidden');
        if (bookOption) bookOption.classList.remove('hidden');
        if (custInput) custInput.placeholder = "Customer Name (REQUIRED for Credit)";
    }
}

// ================= CALCULATOR FUNCTIONS =================
function calcNum(num) {
    if (calcVal === '0' && num !== '.') {
        calcVal = num;
    } else {
        calcVal += num;
    }
    updateCalcDisplay();
}

function calcOp(op) {
    calcExp = calcVal + ' ' + op + ' ';
    calcVal = '0';
    updateCalcDisplay();
}

function calcClear() {
    calcVal = '0';
    calcExp = '';
    updateCalcDisplay();
}

function calcBackspace() {
    if (calcVal.length > 1) {
        calcVal = calcVal.slice(0, -1);
    } else {
        calcVal = '0';
    }
    updateCalcDisplay();
}

function calcEqual() {
    try {
        let fullExp = calcExp + calcVal;
        let sanitizedExp = fullExp.replace(/×/g, '*').replace(/÷/g, '/');
        let res = eval(sanitizedExp);
        calcExp = fullExp + ' =';
        calcVal = String(Math.round(res * 100) / 100);
        updateCalcDisplay();
    } catch (e) {
        calcVal = 'Error';
        updateCalcDisplay();
    }
}

function updateCalcDisplay() {
    document.getElementById('calc-display').innerText = calcVal;
    document.getElementById('calc-expression').innerText = calcExp;
    document.getElementById('calc-add-val').innerText = isNaN(parseFloat(calcVal)) ? '0' : calcVal;
}

function addCalcResultToBill() {
    let amount = parseFloat(calcVal);
    if (isNaN(amount) || amount <= 0) {
        showToastNotification('Please calculate a valid amount first', 'warning');
        return;
    }
    addToCartDirect('Calc Quick Item', amount, 1);
    calcClear();
}

// ================= POS & CART LOGIC =================
function setPosFilter(filter) {
    currentPosFilter = filter;
    document.querySelectorAll('.pos-filter-btn').forEach(btn => {
        btn.className = 'pos-filter-btn px-2.5 py-1 rounded-lg text-gray-400 hover:text-white';
    });
    document.getElementById(`filter-${filter}`).className = 'pos-filter-btn px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-medium';
    renderPosItems();
}

function renderPosItems() {
    const grid = document.getElementById('pos-items-grid');
    if (!grid) return;
    const searchInput = document.getElementById('pos-search');
    const search = searchInput ? searchInput.value.toLowerCase() : '';
    
    let filtered = items.filter(item => {
        let matchesCat = currentPosFilter === 'all' || item.category === currentPosFilter;
        let matchesSearch = item.name.toLowerCase().includes(search) || item.price.toString().includes(search);
        return matchesCat && matchesSearch;
    });

    grid.innerHTML = filtered.map(item => `
        <div onclick="addItemToCart(${item.id})" class="glass-card p-3 rounded-2xl border border-white/10 hover:border-indigo-500/50 hover:bg-indigo-900/20 cursor-pointer transition flex flex-col justify-between h-28 group">
            <div class="flex items-start justify-between gap-1">
                <span class="font-semibold text-xs text-gray-100 group-hover:text-indigo-300 line-clamp-2">${item.name}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded ${item.category === 'fancy' ? 'bg-pink-500/20 text-pink-300' : 'bg-emerald-500/20 text-emerald-300'} font-medium capitalize">${item.category}</span>
            </div>
            <div class="flex items-end justify-between mt-2">
                <div class="text-sm font-bold font-mono text-emerald-400">₹${item.price}</div>
                <button class="w-6 h-6 rounded-lg bg-indigo-600/80 group-hover:bg-indigo-500 text-white flex items-center justify-center text-xs shadow">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function addItemToCart(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const existing = currentCart.find(c => c.id === item.id && !c.isCustom);
    if (existing) {
        existing.qty++;
    } else {
        currentCart.push({
            id: item.id,
            name: item.name,
            price: item.price,
            qty: 1,
            isCustom: false
        });
    }
    renderCart();
}

function addToCartDirect(name, price, qty) {
    currentCart.push({
        id: Date.now(),
        name: name,
        price: price,
        qty: qty,
        isCustom: true
    });
    renderCart();
}

function handleQuickCustomAdd(e) {
    e.preventDefault();
    const name = document.getElementById('quick-item-name').value;
    const price = parseFloat(document.getElementById('quick-item-price').value);
    const qty = parseInt(document.getElementById('quick-item-qty').value);

    if (name && price > 0 && qty > 0) {
        addToCartDirect(name, price, qty);
        document.getElementById('quick-item-name').value = '';
        document.getElementById('quick-item-price').value = '';
        document.getElementById('quick-item-qty').value = '1';
    }
}

function updateCartQty(index, change) {
    if (currentCart[index]) {
        currentCart[index].qty += change;
        if (currentCart[index].qty <= 0) {
            currentCart.splice(index, 1);
        }
    }
    renderCart();
}

function removeCartItem(index) {
    currentCart.splice(index, 1);
    renderCart();
}

function clearBillCart() {
    currentCart = [];
    document.getElementById('cust-name').value = '';
    document.getElementById('cust-phone').value = '';
    document.getElementById('cash-given').value = '';
    document.getElementById('bill-discount').value = '0';
    setPaymentMode('credit');
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    if (!container) return;

    if (currentCart.length === 0) {
        container.innerHTML = `
            <div id="empty-cart-msg" class="py-8 text-center text-gray-500">
                <i class="fa-solid fa-basket-shopping text-3xl mb-2 text-gray-600 block"></i>
                <p class="text-xs">No items in bill yet.</p>
                <p class="text-[11px] text-gray-600 mt-1">Click an item or use calculator/custom input</p>
            </div>
        `;
    } else {
        container.innerHTML = currentCart.map((item, idx) => `
            <div class="flex items-center justify-between p-2 rounded-xl bg-gray-900/60 border border-white/5 text-xs">
                <div class="flex-1 pr-2">
                    <div class="font-medium text-gray-200 line-clamp-1">${item.name}</div>
                    <div class="text-[11px] text-gray-400 font-mono">₹${item.price} x ${item.qty} = <span class="text-emerald-400 font-bold">₹${item.price * item.qty}</span></div>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="updateCartQty(${idx}, -1)" class="w-5 h-5 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 flex items-center justify-center font-bold text-xs">-</button>
                    <span class="w-5 text-center font-mono font-bold text-xs">${item.qty}</span>
                    <button onclick="updateCartQty(${idx}, 1)" class="w-5 h-5 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 flex items-center justify-center font-bold text-xs">+</button>
                    <button onclick="removeCartItem(${idx})" class="w-5 h-5 rounded text-red-400 hover:bg-red-500/20 flex items-center justify-center ml-1"><i class="fa-solid fa-trash text-[10px]"></i></button>
                </div>
            </div>
        `).join('');
    }
    updateBillTotals();
}

function updateBillTotals() {
    let subtotal = currentCart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    let discount = parseFloat(document.getElementById('bill-discount').value) || 0;
    let grandTotal = Math.max(0, subtotal - discount);

    document.getElementById('bill-subtotal').innerText = subtotal;
    document.getElementById('bill-grand-total').innerText = grandTotal;
    calculateChange();
}

function calculateChange() {
    let grandTotal = parseFloat(document.getElementById('bill-grand-total').innerText) || 0;
    let cashGiven = parseFloat(document.getElementById('cash-given').value) || 0;
    let change = cashGiven > grandTotal ? cashGiven - grandTotal : 0;
    document.getElementById('cash-change').innerText = `₹${change}`;
}

// CHECKOUT & BILL GENERATION
function checkoutBill(showReceiptModal) {
    if (currentCart.length === 0) {
        showToastNotification('Please add items to bill before saving', 'warning');
        return;
    }

    let custName = document.getElementById('cust-name').value.trim();
    let custPhone = document.getElementById('cust-phone').value.trim();

    if (currentPaymentMode === 'credit' && !custName) {
        showToastNotification('⚠️ Customer Name is required for Credit (Udhar) Bills as proof!', 'warning');
        document.getElementById('cust-name').focus();
        return;
    }

    if (!custName) custName = 'Walk-in Customer';

    let subtotal = parseFloat(document.getElementById('bill-subtotal').innerText);
    let discount = parseFloat(document.getElementById('bill-discount').value) || 0;
    let grandTotal = parseFloat(document.getElementById('bill-grand-total').innerText);
    const isBookNotedVal = (currentPaymentMode === 'credit' && document.getElementById('check-book-noted')?.checked) || false;

    const billData = {
        billNo: currentBillNumber,
        date: new Date().toLocaleString(),
        customerName: custName,
        customerPhone: custPhone,
        items: [...currentCart],
        subtotal: subtotal,
        discount: discount,
        grandTotal: grandTotal,
        paymentStatus: currentPaymentMode,
        isBookNoted: isBookNotedVal
    };

    billsHistory.unshift(billData);
    localStorage.setItem('krupa_bills', JSON.stringify(billsHistory));
    
    currentBillNumber++;
    localStorage.setItem('krupa_last_bill_no', currentBillNumber.toString());
    document.getElementById('current-bill-no').innerText = `Bill #${currentBillNumber}`;

    updateHeaderStats();
    renderHistoryTable();
    renderCreditCustomersTable();

    if (showReceiptModal) {
        openReceiptModal(billData);
    } else {
        showToastNotification(`Bill #${billData.billNo} saved successfully as ${currentPaymentMode.toUpperCase()}! Total: ₹${grandTotal}`, 'success');
    }

    clearBillCart();
}

function clearBillCart() {
    currentCart = [];
    document.getElementById('cust-name').value = '';
    document.getElementById('cust-phone').value = '';
    document.getElementById('bill-discount').value = '0';
    const checkBook = document.getElementById('check-book-noted');
    if (checkBook) checkBook.checked = false;
    updateCartUI();
}

let currentOpenReceiptBillNo = null;

// ================= RECEIPT MODAL =================
function openReceiptModal(bill) {
    currentOpenReceiptBillNo = bill.billNo;
    triggerCheckoutCelebration();
    document.getElementById('rec-bill-no').innerText = `Bill #${bill.billNo}`;
    document.getElementById('rec-datetime').innerText = `Date: ${bill.date}`;

    let isCredit = (bill.paymentStatus === 'credit');
    const stamp = document.getElementById('rec-status-stamp');
    const proofBox = document.getElementById('rec-credit-proof-box');
    const bookStamp = document.getElementById('rec-book-noted-stamp');
    const bookBtn = document.getElementById('rec-book-toggle-btn');

    if (isCredit) {
        stamp.className = 'py-1 px-3 text-[11px] font-extrabold uppercase rounded border tracking-wider inline-block bg-red-100 text-red-700 border-red-400';
        stamp.innerText = '🔴 CREDIT BILL / UNPAID (KHATA)';
        proofBox.classList.remove('hidden');
        document.getElementById('rec-credit-proof-amt').innerText = bill.grandTotal;

        if (bookStamp) {
            if (bill.isBookNoted) {
                bookStamp.className = 'mt-2 p-1.5 bg-emerald-100 border border-emerald-400 rounded text-center text-[10px] font-bold text-emerald-900 flex items-center justify-center gap-1';
                document.getElementById('rec-book-noted-text').innerText = '📖 NOTED IN SHOP PHYSICAL REGISTER BOOK ✅';
            } else {
                bookStamp.className = 'mt-2 p-1.5 bg-amber-100 border border-amber-400 rounded text-center text-[10px] font-bold text-amber-900 flex items-center justify-center gap-1';
                document.getElementById('rec-book-noted-text').innerText = '📝 NOT YET RECORDED IN PHYSICAL BOOK';
            }
        }

        if (bookBtn) {
            bookBtn.classList.remove('hidden');
            bookBtn.innerHTML = bill.isBookNoted 
                ? `<i class="fa-solid fa-circle-check"></i> Noted in Book` 
                : `<i class="fa-solid fa-book"></i> Mark as Noted`;
        }
    } else {
        stamp.className = 'py-1 px-3 text-[11px] font-extrabold uppercase rounded border tracking-wider inline-block bg-emerald-100 text-emerald-700 border-emerald-400';
        stamp.innerText = '🟢 PAID BILL (CASH/ONLINE)';
        proofBox.classList.add('hidden');
        if (bookBtn) bookBtn.classList.add('hidden');
    }

    if (bill.customerName !== 'Walk-in Customer' || bill.customerPhone) {
        document.getElementById('rec-customer-box').classList.remove('hidden');
        document.getElementById('rec-cust-name').innerText = bill.customerName;
        document.getElementById('rec-cust-phone').innerText = bill.customerPhone || 'N/A';
    } else {
        document.getElementById('rec-customer-box').classList.add('hidden');
    }

    document.getElementById('rec-items-list').innerHTML = bill.items.map(item => `
        <tr class="border-b border-slate-200">
            <td class="py-1.5 font-semibold text-slate-900 text-left">${item.name}</td>
            <td class="py-1.5 text-center font-mono font-medium text-slate-800">${item.qty}</td>
            <td class="py-1.5 text-right font-mono text-slate-700">₹${item.price}</td>
            <td class="py-1.5 text-right font-mono font-bold text-slate-900">₹${item.price * item.qty}</td>
        </tr>
    `).join('');

    document.getElementById('rec-subtotal').innerText = bill.subtotal;
    if (bill.discount > 0) {
        document.getElementById('rec-discount-row').classList.remove('hidden');
        document.getElementById('rec-discount').innerText = bill.discount;
    } else {
        document.getElementById('rec-discount-row').classList.add('hidden');
    }
    document.getElementById('rec-grandtotal').innerText = bill.grandTotal;

    document.getElementById('receipt-modal').classList.remove('hidden');
}

function toggleCurrentReceiptBookNoted() {
    if (currentOpenReceiptBillNo) {
        toggleBookNoted(currentOpenReceiptBillNo);
    }
}

function closeReceiptModal() {
    document.getElementById('receipt-modal').classList.add('hidden');
}

// ================= ITEM MANAGEMENT MODAL =================
function renderItemsTable() {
    const tbody = document.getElementById('items-table-body');
    if (!tbody) return;
    tbody.innerHTML = items.map(item => `
        <tr class="hover:bg-white/5 transition">
            <td class="px-4 py-3 font-semibold text-white">${item.name}</td>
            <td class="px-4 py-3">
                <span class="text-xs px-2 py-0.5 rounded ${item.category === 'fancy' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'} font-medium capitalize">
                    ${item.category}
                </span>
            </td>
            <td class="px-4 py-3 text-right font-mono font-bold text-emerald-400">₹${item.price}</td>
            <td class="px-4 py-3 text-center font-mono">${item.stock}</td>
            <td class="px-4 py-3 text-right space-x-2">
                <button onclick="openEditItemModal(${item.id})" class="text-indigo-400 hover:text-indigo-300"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="deleteItem(${item.id})" class="text-red-400 hover:text-red-300"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
    const badge = document.getElementById('items-count-badge');
    if (badge) badge.innerText = items.length;
}

function openAddItemModal() {
    document.getElementById('item-id').value = '';
    document.getElementById('modal-title').innerText = 'Add New Item';
    document.getElementById('modal-item-name').value = '';
    document.getElementById('modal-item-cat').value = 'fancy';
    document.getElementById('modal-item-price').value = '';
    document.getElementById('modal-item-stock').value = '100';
    document.getElementById('item-modal').classList.remove('hidden');
}

function openEditItemModal(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    document.getElementById('item-id').value = item.id;
    document.getElementById('modal-title').innerText = 'Edit Item';
    document.getElementById('modal-item-name').value = item.name;
    document.getElementById('modal-item-cat').value = item.category;
    document.getElementById('modal-item-price').value = item.price;
    document.getElementById('modal-item-stock').value = item.stock;
    document.getElementById('item-modal').classList.remove('hidden');
}

function closeItemModal() {
    document.getElementById('item-modal').classList.add('hidden');
}

function handleSaveItem(e) {
    e.preventDefault();
    const id = document.getElementById('item-id').value;
    const name = document.getElementById('modal-item-name').value;
    const cat = document.getElementById('modal-item-cat').value;
    const price = parseFloat(document.getElementById('modal-item-price').value);
    const stock = parseInt(document.getElementById('modal-item-stock').value) || 0;

    if (id) {
        let idx = items.findIndex(i => i.id == id);
        if (idx !== -1) {
            items[idx] = { id: parseInt(id), name, category: cat, price, stock };
        }
    } else {
        items.push({ id: Date.now(), name, category: cat, price, stock });
    }

    localStorage.setItem('krupa_items', JSON.stringify(items));
    renderItemsTable();
    renderPosItems();
    closeItemModal();
}

function deleteItem(id) {
    if (confirm('Are you sure you want to delete this item?')) {
        items = items.filter(i => i.id !== id);
        localStorage.setItem('krupa_items', JSON.stringify(items));
        renderItemsTable();
        renderPosItems();
    }
}

// ================= HISTORY TABLE & DATE FILTERING =================
let currentDatePeriod = 'all';
let currentCustomDateStr = null;

function setDatePeriodFilter(period) {
    currentDatePeriod = period;
    currentCustomDateStr = null;
    const dateInput = document.getElementById('hist-custom-date');
    if (dateInput) dateInput.value = '';

    document.querySelectorAll('.date-filter-btn').forEach(btn => {
        btn.className = 'date-filter-btn px-2.5 py-1 rounded-lg text-gray-400 hover:text-white';
    });

    const activeBtn = document.getElementById(`date-btn-${period}`);
    if (activeBtn) {
        activeBtn.className = 'date-filter-btn px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-semibold shadow';
    }

    renderHistoryTable();
}

function handleCustomDateChange(dateStr) {
    if (!dateStr) return;
    currentDatePeriod = 'custom';
    currentCustomDateStr = dateStr;

    document.querySelectorAll('.date-filter-btn').forEach(btn => {
        btn.className = 'date-filter-btn px-2.5 py-1 rounded-lg text-gray-400 hover:text-white';
    });

    renderHistoryTable();
}

function filterHistory(status) {
    currentHistoryFilter = status;
    document.querySelectorAll('.hist-filter-btn').forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'bg-emerald-600', 'bg-red-600', 'text-white', 'shadow');
        btn.classList.add('text-gray-400');
    });

    const activeBtn = document.getElementById(`hist-filter-${status}`);
    if (status === 'all') {
        activeBtn.className = 'hist-filter-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white shadow';
    } else if (status === 'paid') {
        activeBtn.className = 'hist-filter-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white shadow';
    } else if (status === 'credit') {
        activeBtn.className = 'hist-filter-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-600 text-white shadow';
    }
    renderHistoryTable();
}

function markBillAsPaid(billNo) {
    const bill = billsHistory.find(b => b.billNo === billNo);
    if (!bill) return;

    if (confirm(`Are you sure you want to mark Bill #${billNo} for ${bill.customerName} (₹${bill.grandTotal}) as PAID?`)) {
        bill.paymentStatus = 'paid';
        localStorage.setItem('krupa_bills', JSON.stringify(billsHistory));
        renderHistoryTable();
        renderCreditCustomersTable();
        updateHeaderStats();
        showToastNotification(`Bill #${billNo} updated to PAID!`, 'success');
    }
}

function renderHistoryTable() {
    const tbody = document.getElementById('history-table-body');
    if (!tbody) return;
    
    const now = new Date();
    const todayStr = now.toLocaleDateString();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const sevenDaysAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);

    let totalAllTime = 0;
    let todaySales = 0;
    let weekSales = 0;
    let monthSales = 0;

    let countAll = billsHistory.length;
    let countPaid = 0;
    let countCredit = 0;

    billsHistory.forEach(b => {
        let status = b.paymentStatus || 'paid';
        totalAllTime += b.grandTotal;

        if (status === 'credit') {
            countCredit++;
        } else {
            countPaid++;
        }

        const bDate = new Date(b.date);
        const bTime = isNaN(bDate.getTime()) ? now.getTime() : bDate.getTime();

        if (bTime >= (now.getTime() - 24 * 3600 * 1000) || b.date.includes(todayStr)) {
            todaySales += b.grandTotal;
        }

        if (bTime >= sevenDaysAgo) {
            weekSales += b.grandTotal;
        }

        if (!isNaN(bDate.getTime()) && bDate.getMonth() === currentMonth && bDate.getFullYear() === currentYear) {
            monthSales += b.grandTotal;
        }
    });

    const statToday = document.getElementById('hist-stat-today');
    const statWeek = document.getElementById('hist-stat-week');
    const statMonth = document.getElementById('hist-stat-month');
    const statTotal = document.getElementById('history-total-sales');

    if (statToday) statToday.innerText = `₹${todaySales}`;
    if (statWeek) statWeek.innerText = `₹${weekSales}`;
    if (statMonth) statMonth.innerText = `₹${monthSales}`;
    if (statTotal) statTotal.innerText = `₹${totalAllTime}`;

    document.getElementById('hist-count-all').innerText = countAll;
    document.getElementById('hist-count-paid').innerText = countPaid;
    document.getElementById('hist-count-credit').innerText = countCredit;

    let filtered = billsHistory.filter(b => {
        let status = b.paymentStatus || 'paid';
        if (currentHistoryFilter !== 'all' && status !== currentHistoryFilter) {
            return false;
        }

        const bDate = new Date(b.date);
        const bTime = isNaN(bDate.getTime()) ? now.getTime() : bDate.getTime();

        if (currentDatePeriod === 'today') {
            return (bTime >= (now.getTime() - 24 * 3600 * 1000) || b.date.includes(todayStr));
        } else if (currentDatePeriod === 'week') {
            return bTime >= sevenDaysAgo;
        } else if (currentDatePeriod === 'month') {
            return (!isNaN(bDate.getTime()) && bDate.getMonth() === currentMonth && bDate.getFullYear() === currentYear);
        } else if (currentDatePeriod === 'custom' && currentCustomDateStr) {
            const customDateObj = new Date(currentCustomDateStr);
            const customStr = customDateObj.toLocaleDateString();
            return b.date.includes(customStr) || b.date.includes(currentCustomDateStr);
        }

        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-gray-500 font-medium">No bills found matching selected date & status filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(b => {
        let isCredit = (b.paymentStatus === 'credit');
        let statusBadge = isCredit 
            ? `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 inline-flex items-center gap-1"><i class="fa-solid fa-clock"></i> CREDIT (UDHAR)</span>`
            : `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1"><i class="fa-solid fa-circle-check"></i> PAID</span>`;

        let bookBadge = isCredit ? (
            b.isBookNoted 
                ? `<div class="mt-1 text-[10px] font-bold text-amber-300 flex items-center justify-center gap-1"><i class="fa-solid fa-book-bookmark"></i> Noted in Book</div>`
                : `<div class="mt-1 text-[10px] font-medium text-gray-500 flex items-center justify-center gap-1"><i class="fa-solid fa-pen"></i> Not in Book</div>`
        ) : '';

        return `
            <tr class="hover:bg-white/5 transition">
                <td class="px-4 py-3 font-mono font-bold text-indigo-300">#${b.billNo}</td>
                <td class="px-4 py-3 text-xs text-gray-400">${b.date}</td>
                <td class="px-4 py-3 font-medium text-white">
                    ${b.customerName}
                    ${b.customerPhone ? `<div class="text-[10px] text-gray-400 font-mono"><i class="fa-solid fa-phone text-[9px] mr-1"></i>${b.customerPhone}</div>` : ''}
                </td>
                <td class="px-4 py-3 text-center">${statusBadge}${bookBadge}</td>
                <td class="px-4 py-3 text-center font-mono">${b.items.length} items</td>
                <td class="px-4 py-3 text-right font-mono font-bold ${isCredit ? 'text-red-400' : 'text-emerald-400'}">₹${b.grandTotal}</td>
                <td class="px-4 py-3 text-right space-x-1.5">
                    ${isCredit ? `
                        <button onclick="toggleBookNoted(${b.billNo})" title="Toggle physical book status" class="px-2.5 py-1 ${b.isBookNoted ? 'bg-amber-600/80 hover:bg-amber-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'} text-xs font-semibold rounded-lg shadow transition">
                            <i class="fa-solid fa-book mr-1"></i> ${b.isBookNoted ? 'Noted' : '+ Book'}
                        </button>
                        <button onclick="markBillAsPaid(${b.billNo})" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition">
                            <i class="fa-solid fa-check mr-1"></i> Mark Paid
                        </button>
                    ` : ''}
                    <button onclick='openReceiptModal(${JSON.stringify(b)})' class="px-2.5 py-1 bg-indigo-600/60 hover:bg-indigo-500 text-white text-xs rounded-lg transition">
                        <i class="fa-solid fa-eye mr-1"></i> Proof Receipt
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function toggleBookNoted(billNo) {
    const bill = billsHistory.find(b => b.billNo === billNo);
    if (!bill) return;

    bill.isBookNoted = !bill.isBookNoted;
    localStorage.setItem('krupa_bills', JSON.stringify(billsHistory));
    
    renderHistoryTable();
    renderCreditCustomersTable();

    const noteText = bill.isBookNoted 
        ? `Bill #${billNo} for ${bill.customerName} marked as NOTED IN SHOP PHYSICAL BOOK 📖!`
        : `Bill #${billNo} marked as NOT IN BOOK 📝!`;

    showToastNotification(noteText, bill.isBookNoted ? 'success' : 'info');

    if (currentOpenReceiptBillNo === billNo) {
        const receiptModal = document.getElementById('receipt-modal');
        if (receiptModal && !receiptModal.classList.contains('hidden')) {
            openReceiptModal(bill);
        }
    }
}

// ================= SEPARATE CREDIT CUSTOMERS (UDHAR KHATA) DIRECTORY =================
function renderCreditCustomersTable() {
    const tbody = document.getElementById('credit-customers-table-body');
    if (!tbody) return;

    const searchTerm = (document.getElementById('credit-cust-search')?.value || '').toLowerCase().trim();

    // Group credit bills by customer name/phone
    const creditMap = {};
    let grandUdharTotal = 0;

    billsHistory.forEach(b => {
        if (b.paymentStatus === 'credit') {
            const key = `${b.customerName}_${b.customerPhone || ''}`;
            if (!creditMap[key]) {
                creditMap[key] = {
                    name: b.customerName,
                    phone: b.customerPhone || 'N/A',
                    totalBalance: 0,
                    unpaidBillsCount: 0,
                    lastPurchase: b.date,
                    billNos: []
                };
            }
            creditMap[key].totalBalance += b.grandTotal;
            creditMap[key].unpaidBillsCount += 1;
            creditMap[key].billNos.push(b.billNo);
            grandUdharTotal += b.grandTotal;
        }
    });

    const customersList = Object.values(creditMap).filter(c => {
        if (!searchTerm) return true;
        return c.name.toLowerCase().includes(searchTerm) || c.phone.toLowerCase().includes(searchTerm);
    });

    const totalUdharEl = document.getElementById('total-udhar-balance');
    const totalCustEl = document.getElementById('total-udhar-customers');
    const badgeEl = document.getElementById('credit-cust-count-badge');

    if (totalUdharEl) totalUdharEl.innerText = `₹${grandUdharTotal}`;
    if (totalCustEl) totalCustEl.innerText = Object.keys(creditMap).length;
    if (badgeEl) badgeEl.innerText = Object.keys(creditMap).length;

    if (customersList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500 font-medium">No pending credit (Udhar) customers found. All clear! 🎉</td></tr>`;
        return;
    }

    tbody.innerHTML = customersList.map(c => `
        <tr class="hover:bg-white/5 transition">
            <td class="px-4 py-3 font-semibold text-white">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-red-500/20 text-red-400 font-bold flex items-center justify-center text-xs border border-red-500/30">
                        ${c.name.charAt(0).toUpperCase()}
                    </div>
                    <span>${c.name}</span>
                </div>
            </td>
            <td class="px-4 py-3 font-mono text-xs text-gray-300">${c.phone}</td>
            <td class="px-4 py-3 text-center">
                <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    ${c.unpaidBillsCount} ${c.unpaidBillsCount === 1 ? 'Bill' : 'Bills'} (#${c.billNos.join(', #')})
                </span>
            </td>
            <td class="px-4 py-3 text-right font-mono font-extrabold text-red-400 text-base">₹${c.totalBalance}</td>
            <td class="px-4 py-3 text-center text-xs text-gray-400">${c.lastPurchase}</td>
            <td class="px-4 py-3 text-right">
                <button onclick="payCustomerCreditAll('${c.name.replace(/'/g, "\\'")}', '${c.phone}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition inline-flex items-center gap-1.5">
                    <i class="fa-solid fa-circle-check"></i> Settle Udhar (₹${c.totalBalance})
                </button>
            </td>
        </tr>
    `).join('');
}

function payCustomerCreditAll(custName, custPhone) {
    let matchCount = 0;
    let settledTotal = 0;

    billsHistory.forEach(b => {
        if (b.paymentStatus === 'credit' && b.customerName === custName) {
            b.paymentStatus = 'paid';
            settledTotal += b.grandTotal;
            matchCount++;
        }
    });

    if (matchCount > 0) {
        localStorage.setItem('krupa_bills', JSON.stringify(billsHistory));
        renderCreditCustomersTable();
        renderHistoryTable();
        updateHeaderStats();
        showToastNotification(`Successfully settled ₹${settledTotal} Udhar balance for ${custName}!`, 'success');
    }
}

function updateHeaderStats() {
    let todaySales = billsHistory.reduce((sum, b) => sum + b.grandTotal, 0);
    const headerSales = document.getElementById('header-today-sales');
    if (headerSales) headerSales.innerText = `₹${todaySales}`;
}
