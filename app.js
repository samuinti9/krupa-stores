// KRUPA STORE POS - MAIN APPLICATION ENGINE (LOCAL & MOBILE OPTIMIZED)

// Safe LocalStorage Reader with Error Fallback
function getStoredData(key, fallback) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        console.warn(`Error reading ${key} from localStorage:`, e);
        return fallback;
    }
}

// Helper functions for robust Date comparisons across localized strings & timestamps
function getBillDateObj(bill) {
    if (bill.createdAt && typeof bill.createdAt === 'number') {
        return new Date(bill.createdAt);
    }
    if (bill.date) {
        const parsed = new Date(bill.date);
        if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
}

function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

function isSameMonth(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth();
}

function isWithinLast7Days(billDate, now) {
    const startOf7DaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    return billDate.getTime() >= startOf7DaysAgo.getTime();
}

function isMatchingCustomDate(billDate, dateStr) {
    if (!dateStr) return true;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return true;
    const targetYear = parseInt(parts[0], 10);
    const targetMonth = parseInt(parts[1], 10) - 1;
    const targetDay = parseInt(parts[2], 10);

    return billDate.getFullYear() === targetYear &&
           billDate.getMonth() === targetMonth &&
           billDate.getDate() === targetDay;
}

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
        createdAt: Date.now() - 3600000 * 4,
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
        createdAt: Date.now() - 3600000 * 24 * 3,
        date: new Date(Date.now() - 3600000 * 24 * 3).toLocaleString(),
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
        createdAt: Date.now() - 3600000 * 24 * 10,
        date: new Date(Date.now() - 3600000 * 24 * 10).toLocaleString(),
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
let items = getStoredData('krupa_items', DEFAULT_ITEMS);
let billsHistory = getStoredData('krupa_bills', DEFAULT_BILLS);
let currentCart = [];
let currentPosFilter = 'all';
let currentHistoryFilter = 'all';
let currentPaymentMode = 'cash';
let currentBillNumber = parseInt(localStorage.getItem('krupa_last_bill_no') || '1001');

let calcVal = '0';
let calcExp = '';

document.addEventListener('DOMContentLoaded', () => {
    // Restore saved theme mode (Light vs Dark)
    const savedThemeMode = localStorage.getItem('krupa_theme_mode') || 'light';
    setThemeMode(savedThemeMode);

    // Load store profile settings if present
    const profile = getStoredData('krupa_store_profile', {
        name: 'Krupa Store',
        tagline: 'Retail Fancy & Grocery Store',
        phone: '+91 9876543210',
        address: 'Main Market Road'
    });

    if (document.getElementById('setting-store-name')) {
        document.getElementById('setting-store-name').value = profile.name;
        document.getElementById('setting-store-tagline').value = profile.tagline;
        document.getElementById('setting-store-phone').value = profile.phone;
        document.getElementById('setting-store-address').value = profile.address;
    }

    updateClock();
    setInterval(updateClock, 1000);
    setPaymentMode('cash');
    renderPosItems();
    renderItemsTable();
    renderHistoryTable();
    renderCreditCustomersTable();
    updateHeaderStats();
    updateCartUI();
    const billNoEl = document.getElementById('current-bill-no');
    if (billNoEl) billNoEl.innerText = `Bill #${currentBillNumber}`;
    
    // Initialize SQLite WASM Engine
    initSQLiteDB();
});

// Scroll to Cart Summary on Mobile
function scrollToCartSummary() {
    const cartEl = document.getElementById('cart-summary-section');
    if (cartEl) {
        cartEl.scrollIntoView({ behavior: 'smooth' });
    }
}

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
    showToastNotification('Store profile settings saved successfully!', 'success');
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
            showToastNotification('Data restored successfully!', 'success');
            setTimeout(() => location.reload(), 800);
        } catch (err) {
            showToastNotification('Invalid backup JSON file.', 'error');
        }
    };
    reader.readAsText(file);
}

function clearHistoryData() {
    if (confirm('Are you sure you want to clear all sales history and Udhar logs?')) {
        billsHistory = [];
        localStorage.removeItem('krupa_bills');
        renderHistoryTable();
        renderCreditCustomersTable();
        updateHeaderStats();
        showToastNotification('Sales history cleared!', 'info');
    }
}

function resetItemsToDefault() {
    if (confirm('Reset stock catalogue to default items?')) {
        items = [...DEFAULT_ITEMS];
        localStorage.setItem('krupa_items', JSON.stringify(items));
        renderPosItems();
        renderItemsTable();
        showToastNotification('Catalogue reset to defaults!', 'success');
    }
}

// Celebration Confetti Sparkle Animation on Checkout
function triggerCheckoutCelebration() {
    const container = document.body;
    const colors = ['#6366f1', '#10b981', '#ec4899', '#f59e0b', '#3b82f6'];
    for (let i = 0; i < 30; i++) {
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

// ================= MASTER PIN SECURITY ENGINE =================
let masterPin = localStorage.getItem('krupa_master_pin') || '1234';
let isPinRequired = localStorage.getItem('krupa_pin_required') === 'true';
let isStoreUnlocked = sessionStorage.getItem('krupa_admin_unlocked') === 'true';
let pendingUnlockTargetTab = null;
let currentEnteredPin = '';

function lockStoreApp() {
    isStoreUnlocked = false;
    sessionStorage.removeItem('krupa_admin_unlocked');
    currentEnteredPin = '';
    updatePinDisplay();
    document.getElementById('pin-error-msg')?.classList.add('hidden');
    document.getElementById('security-lock-modal')?.classList.remove('hidden');
    showToastNotification('🔒 Store App locked with Master PIN', 'info');
}

function unlockStoreApp() {
    isStoreUnlocked = true;
    sessionStorage.setItem('krupa_admin_unlocked', 'true');
    document.getElementById('security-lock-modal')?.classList.add('hidden');
    showToastNotification('🔓 Admin mode unlocked!', 'success');
    if (pendingUnlockTargetTab) {
        switchTab(pendingUnlockTargetTab, true);
        pendingUnlockTargetTab = null;
    }
}

function pressPinNum(digit) {
    if (currentEnteredPin.length < 4) {
        currentEnteredPin += digit;
        updatePinDisplay();
    }
    if (currentEnteredPin.length === 4) {
        submitPinUnlock();
    }
}

function clearPinInput() {
    currentEnteredPin = '';
    updatePinDisplay();
    document.getElementById('pin-error-msg')?.classList.add('hidden');
}

function updatePinDisplay() {
    for (let i = 1; i <= 4; i++) {
        const input = document.getElementById(`pin-digit-${i}`);
        if (input) {
            input.value = currentEnteredPin.length >= i ? '•' : '';
        }
    }
}

function submitPinUnlock() {
    if (currentEnteredPin === masterPin) {
        unlockStoreApp();
    } else {
        document.getElementById('pin-error-msg')?.classList.remove('hidden');
        currentEnteredPin = '';
        updatePinDisplay();
    }
}

function handleSaveMasterPin(event) {
    event.preventDefault();
    const isRequired = document.getElementById('setting-pin-required').checked;
    const newPin = document.getElementById('setting-new-pin').value.trim();

    if (newPin && newPin.length === 4 && /^\d+$/.test(newPin)) {
        masterPin = newPin;
        localStorage.setItem('krupa_master_pin', masterPin);
        document.getElementById('setting-new-pin').value = '';
    }

    isPinRequired = isRequired;
    localStorage.setItem('krupa_pin_required', isPinRequired.toString());
    showToastNotification('Security PIN settings updated successfully!', 'success');
}

function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('current-clock');
    if (clockEl) clockEl.innerText = now.toLocaleTimeString();
}

function switchTab(tabName, skipPinCheck = false) {
    if (isPinRequired && !isStoreUnlocked && ['history', 'customers', 'items', 'settings'].includes(tabName) && !skipPinCheck) {
        pendingUnlockTargetTab = tabName;
        document.getElementById('pin-error-msg')?.classList.add('hidden');
        currentEnteredPin = '';
        updatePinDisplay();
        document.getElementById('security-lock-modal')?.classList.remove('hidden');
        showToastNotification('🔒 Master PIN required to access admin tab', 'warning');
        return;
    }

    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.className = 'tab-btn px-3 py-2 rounded-lg font-medium text-xs sm:text-sm flex items-center gap-1.5 transition text-slate-300 hover:text-white hover:bg-slate-800 shrink-0';
    });

    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.remove('hidden');

    const activeBtn = document.getElementById(`tab-btn-${tabName}`);
    if (activeBtn) {
        activeBtn.className = 'tab-btn px-3 py-2 rounded-lg font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition bg-indigo-600 text-white shadow shrink-0';
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
    const cashBtn = document.getElementById('pay-mode-cash');
    const onlineBtn = document.getElementById('pay-mode-online');
    const creditBtn = document.getElementById('pay-mode-credit');
    const warning = document.getElementById('credit-warning-note');
    const custInput = document.getElementById('cust-name');

    if (cashBtn) cashBtn.className = 'pay-mode-btn py-1.5 rounded-lg font-semibold text-[11px] sm:text-xs flex items-center justify-center gap-1 text-emerald-300 hover:text-white transition';
    if (onlineBtn) onlineBtn.className = 'pay-mode-btn py-1.5 rounded-lg font-semibold text-[11px] sm:text-xs flex items-center justify-center gap-1 text-indigo-300 hover:text-white transition';
    if (creditBtn) creditBtn.className = 'pay-mode-btn py-1.5 rounded-lg font-semibold text-[11px] sm:text-xs flex items-center justify-center gap-1 text-red-300 hover:text-white transition';

    if (mode === 'cash') {
        if (cashBtn) cashBtn.className = 'pay-mode-btn py-1.5 rounded-lg font-semibold text-[11px] sm:text-xs flex items-center justify-center gap-1 bg-emerald-600 text-white shadow transition';
        if (warning) warning.classList.add('hidden');
        if (custInput) custInput.placeholder = "Customer Name (Optional for Cash)";
    } else if (mode === 'online') {
        if (onlineBtn) onlineBtn.className = 'pay-mode-btn py-1.5 rounded-lg font-semibold text-[11px] sm:text-xs flex items-center justify-center gap-1 bg-indigo-600 text-white shadow transition';
        if (warning) warning.classList.add('hidden');
        if (custInput) custInput.placeholder = "Customer Name (Optional for Online)";
    } else {
        if (creditBtn) creditBtn.className = 'pay-mode-btn py-1.5 rounded-lg font-semibold text-[11px] sm:text-xs flex items-center justify-center gap-1 bg-red-600 text-white shadow transition';
        if (warning) warning.classList.remove('hidden');
        if (custInput) custInput.placeholder = "Customer Name (REQUIRED for Udhar)";
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
    const disp = document.getElementById('calc-display');
    const exp = document.getElementById('calc-expression');
    const addVal = document.getElementById('calc-add-val');

    if (disp) disp.innerText = calcVal;
    if (exp) exp.innerText = calcExp;
    if (addVal) addVal.innerText = isNaN(parseFloat(calcVal)) ? '0' : calcVal;
}

function addCalcResultToBill() {
    let amount = parseFloat(calcVal);
    if (isNaN(amount) || amount <= 0) {
        showToastNotification('Please calculate a valid amount first', 'warning');
        return;
    }
    addToCartDirect('Quick Custom Item', amount, 1);
    calcClear();
}

// ================= POS & CART LOGIC =================
function setPosFilter(filter) {
    currentPosFilter = filter;
    document.querySelectorAll('.pos-filter-btn').forEach(btn => {
        btn.className = 'pos-filter-btn px-3 py-1 rounded-lg text-gray-400 hover:text-white';
    });
    const filterBtn = document.getElementById(`filter-${filter}`);
    if (filterBtn) filterBtn.className = 'pos-filter-btn px-3 py-1 rounded-lg bg-indigo-600 text-white font-medium';
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
        <div onclick="addItemToCart(${item.id})" class="pos-item-card glass-card p-2.5 sm:p-3 rounded-2xl border border-white/10 hover:border-indigo-500/50 hover:bg-indigo-900/20 cursor-pointer transition flex flex-col justify-between h-24 sm:h-28 group">
            <div class="flex items-start justify-between gap-1">
                <span class="font-semibold text-xs text-gray-100 group-hover:text-indigo-300 line-clamp-2">${item.name}</span>
                <span class="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded ${item.category === 'fancy' ? 'bg-pink-500/20 text-pink-300' : 'bg-emerald-500/20 text-emerald-300'} font-medium capitalize shrink-0">${item.category}</span>
            </div>
            <div class="flex items-end justify-between mt-1.5">
                <div class="text-xs sm:text-sm font-bold font-mono text-emerald-400">₹${item.price}</div>
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
    updateCartUI();
}

function addToCartDirect(name, price, qty) {
    currentCart.push({
        id: Date.now(),
        name: name,
        price: price,
        qty: qty,
        isCustom: true
    });
    updateCartUI();
}

function formatWeightOrQty(qty) {
    const num = parseFloat(qty);
    if (isNaN(num)) return '1 Pcs';

    if (num === 1) return '1 kg';
    if (num === 0.5) return '500g (1/2 kg)';
    if (num === 0.25) return '250g (1/4 kg)';
    if (num === 0.1) return '100g';
    if (num === 0.05) return '50g';

    if (num < 1) {
        return `${Math.round(num * 1000)}g`;
    }
    return `${num} kg/Pcs`;
}

function handleUnitSelect(val) {
    const qtyInput = document.getElementById('quick-item-qty');
    if (!qtyInput) return;
    if (val === 'custom') {
        qtyInput.classList.remove('hidden');
        qtyInput.focus();
    } else {
        qtyInput.classList.add('hidden');
        qtyInput.value = val;
    }
}

function setCartItemWeight(index, weight) {
    if (currentCart[index]) {
        currentCart[index].qty = parseFloat(weight);
        updateCartUI();
    }
}

function handleQuickCustomAdd(e) {
    e.preventDefault();
    const nameInput = document.getElementById('quick-item-name');
    const priceInput = document.getElementById('quick-item-price');
    const unitSelect = document.getElementById('quick-item-unit');
    const qtyInput = document.getElementById('quick-item-qty');

    const name = nameInput ? nameInput.value.trim() : '';
    const price = priceInput ? parseFloat(priceInput.value) : 0;

    let qty = 1;
    if (unitSelect && unitSelect.value !== 'custom') {
        qty = parseFloat(unitSelect.value);
    } else if (qtyInput) {
        qty = parseFloat(qtyInput.value) || 1;
    }

    if (name && price > 0 && qty > 0) {
        addToCartDirect(name, price, qty);
        if (nameInput) nameInput.value = '';
        if (priceInput) priceInput.value = '';
        if (unitSelect) unitSelect.value = '1';
        if (qtyInput) {
            qtyInput.value = '1';
            qtyInput.classList.add('hidden');
        }
        showToastNotification(`Added custom item "${name}" (${formatWeightOrQty(qty)}) to bill!`, 'success');
    }
}

function updateCartQty(index, change) {
    if (currentCart[index]) {
        currentCart[index].qty += change;
        if (currentCart[index].qty <= 0) {
            currentCart.splice(index, 1);
        }
    }
    updateCartUI();
}

function removeCartItem(index) {
    currentCart.splice(index, 1);
    updateCartUI();
}

function clearBillCart() {
    currentCart = [];
    const custName = document.getElementById('cust-name');
    if (custName) custName.value = '';
    const custPhone = document.getElementById('cust-phone');
    if (custPhone) custPhone.value = '';
    const cashGiven = document.getElementById('cash-given');
    if (cashGiven) cashGiven.value = '';
    const billDiscount = document.getElementById('bill-discount');
    if (billDiscount) billDiscount.value = '0';
    setPaymentMode('cash');
    updateCartUI();
}

function updateCartUI() {
    const container = document.getElementById('cart-items-container');
    if (!container) return;

    if (currentCart.length === 0) {
        container.innerHTML = `
            <div id="empty-cart-msg" class="py-6 text-center text-gray-500">
                <i class="fa-solid fa-basket-shopping text-2xl mb-1 text-gray-600 block"></i>
                <p class="text-xs">No items in bill yet.</p>
                <p class="text-[11px] text-gray-500 mt-0.5">Click items above or use calculator</p>
            </div>
        `;
    } else {
        container.innerHTML = currentCart.map((item, idx) => {
            const itemTotal = (item.price * item.qty).toFixed(2).replace(/\.00$/, '');
            const qStr = formatWeightOrQty(item.qty);

            return `
                <div class="p-2 rounded-xl bg-gray-900/80 border border-white/10 space-y-1.5 text-xs">
                    <div class="flex items-center justify-between gap-1">
                        <span class="font-semibold text-gray-100 line-clamp-1">${item.name}</span>
                        <span class="text-emerald-400 font-mono font-bold text-sm shrink-0">₹${itemTotal}</span>
                    </div>
                    
                    <div class="flex items-center justify-between gap-1 pt-1 border-t border-white/5">
                        <!-- Quick Weight Selector Buttons -->
                        <div class="flex items-center gap-1 overflow-x-auto text-[10px]">
                            <button onclick="setCartItemWeight(${idx}, 1)" class="px-1.5 py-0.5 rounded font-medium transition ${item.qty === 1 ? 'bg-indigo-600 text-white font-bold' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}">1kg</button>
                            <button onclick="setCartItemWeight(${idx}, 0.5)" class="px-1.5 py-0.5 rounded font-medium transition ${item.qty === 0.5 ? 'bg-indigo-600 text-white font-bold' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}">500g</button>
                            <button onclick="setCartItemWeight(${idx}, 0.25)" class="px-1.5 py-0.5 rounded font-medium transition ${item.qty === 0.25 ? 'bg-indigo-600 text-white font-bold' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}">250g</button>
                            <button onclick="setCartItemWeight(${idx}, 0.1)" class="px-1.5 py-0.5 rounded font-medium transition ${item.qty === 0.1 ? 'bg-indigo-600 text-white font-bold' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}">100g</button>
                        </div>

                        <!-- Quantity Adjuster -->
                        <div class="flex items-center gap-1 shrink-0">
                            <button onclick="updateCartQty(${idx}, -1)" class="w-5 h-5 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 font-bold text-xs">-</button>
                            <span class="font-mono font-extrabold text-xs px-1 text-indigo-300 min-w-[40px] text-center">${qStr}</span>
                            <button onclick="updateCartQty(${idx}, 1)" class="w-5 h-5 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 font-bold text-xs">+</button>
                            <button onclick="removeCartItem(${idx})" class="w-5 h-5 rounded text-red-400 hover:bg-red-500/20 ml-0.5"><i class="fa-solid fa-trash text-[10px]"></i></button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    updateBillTotals();
}

function updateBillTotals() {
    let subtotal = currentCart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    let discount = parseFloat(document.getElementById('bill-discount')?.value) || 0;
    let grandTotal = Math.max(0, subtotal - discount);

    const subEl = document.getElementById('bill-subtotal');
    const grandEl = document.getElementById('bill-grand-total');
    const mobileCountEl = document.getElementById('mobile-cart-count');
    const mobileTotalEl = document.getElementById('mobile-cart-total');

    if (subEl) subEl.innerText = subtotal;
    if (grandEl) grandEl.innerText = grandTotal;
    
    let totalQty = currentCart.reduce((sum, i) => sum + i.qty, 0);
    if (mobileCountEl) mobileCountEl.innerText = totalQty;
    if (mobileTotalEl) mobileTotalEl.innerText = grandTotal;

    calculateChange();
}

function calculateChange() {
    let grandTotal = parseFloat(document.getElementById('bill-grand-total')?.innerText) || 0;
    let cashGivenInput = document.getElementById('cash-given');
    let cashGivenVal = cashGivenInput ? cashGivenInput.value.trim() : '';
    let cashGiven = parseFloat(cashGivenVal) || 0;

    const labelEl = document.getElementById('cash-change-label');
    const changeEl = document.getElementById('cash-change');
    const changeBox = document.getElementById('cash-change-box');

    if (cashGivenVal === '' || cashGiven === 0) {
        if (labelEl) {
            labelEl.innerText = 'Return Change';
            labelEl.className = 'text-[11px] text-gray-400 block mb-0.5 transition';
        }
        if (changeEl) {
            changeEl.innerText = '₹0';
            changeEl.className = 'text-gray-300';
        }
        if (changeBox) changeBox.className = 'glass-input px-2 py-1 rounded text-xs font-mono font-bold flex items-center justify-end h-[34px] sm:h-[28px] border-white/10 transition';
        return;
    }

    if (cashGiven >= grandTotal) {
        let change = cashGiven - grandTotal;
        if (labelEl) {
            labelEl.innerText = 'Return Change 🟢';
            labelEl.className = 'text-[11px] text-emerald-400 font-bold block mb-0.5 transition';
        }
        if (changeEl) {
            changeEl.innerText = `₹${change.toFixed(2).replace(/\.00$/, '')}`;
            changeEl.className = 'text-emerald-400 font-extrabold text-sm';
        }
        if (changeBox) changeBox.className = 'glass-input px-2 py-1 rounded text-xs font-mono font-bold flex items-center justify-end h-[34px] sm:h-[28px] border-emerald-500/50 bg-emerald-950/40 shadow transition';
    } else {
        let needToPay = grandTotal - cashGiven;
        if (labelEl) {
            labelEl.innerText = 'Need to Pay (Udhar) 🔴';
            labelEl.className = 'text-[11px] text-red-400 font-bold block mb-0.5 transition';
        }
        if (changeEl) {
            changeEl.innerText = `₹${needToPay.toFixed(2).replace(/\.00$/, '')}`;
            changeEl.className = 'text-red-400 font-extrabold text-sm';
        }
        if (changeBox) changeBox.className = 'glass-input px-2 py-1 rounded text-xs font-mono font-bold flex items-center justify-end h-[34px] sm:h-[28px] border-red-500/50 bg-red-950/40 shadow transition';
    }
}

// CHECKOUT & BILL GENERATION
function checkoutBill(showReceiptModal) {
    if (currentCart.length === 0) {
        showToastNotification('Please add items to bill before saving', 'warning');
        return;
    }

    let custName = (document.getElementById('cust-name')?.value || '').trim();
    let custPhone = (document.getElementById('cust-phone')?.value || '').trim();
    let cashGiven = parseFloat(document.getElementById('cash-given')?.value) || 0;
    let subtotal = parseFloat(document.getElementById('bill-subtotal')?.innerText || '0');
    let discount = parseFloat(document.getElementById('bill-discount')?.value) || 0;
    let grandTotal = parseFloat(document.getElementById('bill-grand-total')?.innerText || '0');

    let paidAmt = 0;
    let dueAmt = 0;
    let effectivePayMode = currentPaymentMode;

    if (currentPaymentMode === 'credit') {
        paidAmt = Math.min(cashGiven, grandTotal);
        dueAmt = Math.max(0, grandTotal - paidAmt);
    } else {
        if (cashGiven > 0 && cashGiven < grandTotal) {
            // Partial Cash paid, rest is Udhar credit!
            paidAmt = cashGiven;
            dueAmt = grandTotal - cashGiven;
            effectivePayMode = 'credit';
            if (!custName) {
                showToastNotification('⚠️ Customer Name is required when remaining amount is Udhar!', 'warning');
                document.getElementById('cust-name')?.focus();
                return;
            }
        } else {
            paidAmt = grandTotal;
            dueAmt = 0;
        }
    }

    if (effectivePayMode === 'credit' && !custName) {
        showToastNotification('⚠️ Customer Name is required for Credit (Udhar) Bills!', 'warning');
        document.getElementById('cust-name')?.focus();
        return;
    }

    if (!custName) custName = 'Walk-in Customer';

    const now = new Date();
    const billData = {
        billNo: currentBillNumber,
        createdAt: now.getTime(),
        date: now.toLocaleString(),
        customerName: custName,
        customerPhone: custPhone,
        items: [...currentCart],
        subtotal: subtotal,
        discount: discount,
        grandTotal: grandTotal,
        cashGiven: cashGiven,
        paidAmount: paidAmt,
        dueAmount: dueAmt,
        paymentStatus: effectivePayMode,
        isBookNoted: false
    };

    billsHistory.unshift(billData);
    localStorage.setItem('krupa_bills', JSON.stringify(billsHistory));
    syncDataToSQLite();
    
    currentBillNumber++;
    localStorage.setItem('krupa_last_bill_no', currentBillNumber.toString());
    const billNoEl = document.getElementById('current-bill-no');
    if (billNoEl) billNoEl.innerText = `Bill #${currentBillNumber}`;

    updateHeaderStats();
    renderHistoryTable();
    renderCreditCustomersTable();

    if (showReceiptModal) {
        openReceiptModal(billData);
    } else {
        const toastMsg = dueAmt > 0 
            ? `Bill #${billData.billNo} saved! Paid ₹${paidAmt}, Pending Udhar: ₹${dueAmt}`
            : `Bill #${billData.billNo} saved as ${effectivePayMode.toUpperCase()}! Total: ₹${grandTotal}`;
        showToastNotification(toastMsg, 'success');
    }

    clearBillCart();
}

let currentOpenReceiptBillNo = null;

// ================= RECEIPT MODAL =================
function openReceiptModal(bill) {
    currentOpenReceiptBillNo = bill.billNo;
    triggerCheckoutCelebration();
    document.getElementById('rec-bill-no').innerText = `Bill #${bill.billNo}`;
    document.getElementById('rec-datetime').innerText = `Date: ${bill.date}`;

    let statusText = '💵 CASH PAYMENT';
    let stampStyle = 'bg-emerald-100 text-emerald-800 border-emerald-400';
    let isCredit = (bill.paymentStatus === 'credit');

    let paid = bill.paidAmount !== undefined ? bill.paidAmount : (isCredit ? 0 : bill.grandTotal);
    let due = bill.dueAmount !== undefined ? bill.dueAmount : (isCredit ? bill.grandTotal : 0);

    if (bill.paymentStatus === 'online') {
        statusText = '📱 ONLINE / UPI PAYMENT';
        stampStyle = 'bg-indigo-100 text-indigo-800 border-indigo-400';
    } else if (isCredit) {
        statusText = due < bill.grandTotal && paid > 0 
            ? `🔴 PARTIAL UDHAR (PAID ₹${paid} | DUE ₹${due})` 
            : '🔴 CREDIT BILL / UNPAID (KHATA)';
        stampStyle = 'bg-red-100 text-red-700 border-red-400';
    }

    const stamp = document.getElementById('rec-status-stamp');
    const proofBox = document.getElementById('rec-credit-proof-box');
    const bookStamp = document.getElementById('rec-book-noted-stamp');
    const bookBtn = document.getElementById('rec-book-toggle-btn');
    const paidRow = document.getElementById('rec-paid-row');
    const dueRow = document.getElementById('rec-due-row');

    if (stamp) {
        stamp.className = `py-1 px-3 text-[11px] font-extrabold uppercase rounded border tracking-wider inline-block ${stampStyle}`;
        stamp.innerText = statusText;
    }

    if (due > 0) {
        if (paidRow) {
            paidRow.classList.remove('hidden');
            document.getElementById('rec-paid-amt').innerText = paid;
        }
        if (dueRow) {
            dueRow.classList.remove('hidden');
            document.getElementById('rec-due-amt').innerText = due;
        }
    } else {
        if (paidRow) paidRow.classList.add('hidden');
        if (dueRow) dueRow.classList.add('hidden');
    }

    if (isCredit || due > 0) {
        if (proofBox) proofBox.classList.remove('hidden');
        const proofAmt = document.getElementById('rec-credit-proof-amt');
        if (proofAmt) proofAmt.innerText = due;

        if (bookStamp) {
            bookStamp.classList.remove('hidden');
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
        if (proofBox) proofBox.classList.add('hidden');
        if (bookStamp) bookStamp.classList.add('hidden');
        if (bookBtn) bookBtn.classList.add('hidden');
    }

    if (bill.customerName !== 'Walk-in Customer' || bill.customerPhone) {
        document.getElementById('rec-customer-box')?.classList.remove('hidden');
        document.getElementById('rec-cust-name').innerText = bill.customerName;
        document.getElementById('rec-cust-phone').innerText = bill.customerPhone || 'N/A';
    } else {
        document.getElementById('rec-customer-box')?.classList.add('hidden');
    }

    document.getElementById('rec-items-list').innerHTML = bill.items.map(item => `
        <tr class="border-b border-slate-200">
            <td class="py-1.5 font-semibold text-slate-900 text-left">${item.name}</td>
            <td class="py-1.5 text-center font-mono font-medium text-slate-800">${formatWeightOrQty(item.qty)}</td>
            <td class="py-1.5 text-right font-mono text-slate-700">₹${item.price}</td>
            <td class="py-1.5 text-right font-mono font-bold text-slate-900">₹${(item.price * item.qty).toFixed(2).replace(/\.00$/, '')}</td>
        </tr>
    `).join('');

    document.getElementById('rec-subtotal').innerText = bill.subtotal;
    if (bill.discount > 0) {
        document.getElementById('rec-discount-row')?.classList.remove('hidden');
        document.getElementById('rec-discount').innerText = bill.discount;
    } else {
        document.getElementById('rec-discount-row')?.classList.add('hidden');
    }
    document.getElementById('rec-grandtotal').innerText = bill.grandTotal;

    document.getElementById('receipt-modal')?.classList.remove('hidden');
}

function toggleCurrentReceiptBookNoted() {
    if (currentOpenReceiptBillNo) {
        toggleBookNoted(currentOpenReceiptBillNo);
    }
}

function closeReceiptModal() {
    document.getElementById('receipt-modal')?.classList.add('hidden');
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
    document.getElementById('item-modal')?.classList.remove('hidden');
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
    document.getElementById('item-modal')?.classList.remove('hidden');
}

function closeItemModal() {
    document.getElementById('item-modal')?.classList.add('hidden');
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
    syncDataToSQLite();
    renderItemsTable();
    renderPosItems();
    closeItemModal();
    showToastNotification('Item catalogue updated!', 'success');
}

function deleteItem(id) {
    if (confirm('Are you sure you want to delete this item?')) {
        items = items.filter(i => i.id !== id);
        localStorage.setItem('krupa_items', JSON.stringify(items));
        syncDataToSQLite();
        renderItemsTable();
        renderPosItems();
        showToastNotification('Item removed!', 'info');
    }
}

// ================= HISTORY TABLE & DATE FILTERING =================
let currentDatePeriod = 'all';
let currentCustomDateStr = null;

function setDatePeriodFilter(period) {
    currentDatePeriod = period;
    currentCustomDateStr = null;
    const dateInput = document.getElementById('hist-custom-date');
    if (dateInput) {
        dateInput.value = '';
        dateInput.classList.remove('border-indigo-500', 'bg-indigo-900/40', 'ring-2', 'ring-indigo-500/50');
    }

    document.querySelectorAll('.date-filter-btn').forEach(btn => {
        btn.className = 'date-filter-btn px-2.5 py-1 rounded-lg text-gray-400 hover:text-white transition';
    });

    const activeBtn = document.getElementById(`date-btn-${period}`);
    if (activeBtn) {
        activeBtn.className = 'date-filter-btn px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-semibold shadow transition';
    }

    renderHistoryTable();
}

function handleCustomDateChange(dateStr) {
    const dateInput = document.getElementById('hist-custom-date');
    if (!dateStr) {
        setDatePeriodFilter('all');
        return;
    }
    currentDatePeriod = 'custom';
    currentCustomDateStr = dateStr;

    document.querySelectorAll('.date-filter-btn').forEach(btn => {
        btn.className = 'date-filter-btn px-2.5 py-1 rounded-lg text-gray-400 hover:text-white transition';
    });

    if (dateInput) {
        dateInput.classList.add('border-indigo-500', 'bg-indigo-900/40', 'ring-2', 'ring-indigo-500/50');
    }

    renderHistoryTable();
}

function filterHistory(status) {
    currentHistoryFilter = status;
    document.querySelectorAll('.hist-filter-btn').forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'bg-emerald-600', 'bg-red-600', 'text-white', 'shadow');
        btn.classList.add('text-gray-400');
    });

    const activeBtn = document.getElementById(`hist-filter-${status}`);
    if (activeBtn) {
        if (status === 'all') {
            activeBtn.className = 'hist-filter-btn px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white shadow';
        } else if (status === 'cash') {
            activeBtn.className = 'hist-filter-btn px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white shadow';
        } else if (status === 'online') {
            activeBtn.className = 'hist-filter-btn px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white shadow';
        } else if (status === 'credit') {
            activeBtn.className = 'hist-filter-btn px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white shadow';
        }
    }
    renderHistoryTable();
}

function markBillAsPaid(billNo, payMode = 'cash') {
    const bill = billsHistory.find(b => b.billNo === billNo);
    if (!bill) return;

    const modeLabel = payMode === 'online' ? 'ONLINE / UPI 📱' : 'CASH 💵';
    bill.paymentStatus = payMode;
    bill.paidAmount = bill.grandTotal;
    bill.dueAmount = 0;
    localStorage.setItem('krupa_bills', JSON.stringify(billsHistory));
    syncDataToSQLite();
    renderHistoryTable();
    renderCreditCustomersTable();
    updateHeaderStats();
    showToastNotification(`Bill #${billNo} marked as fully PAID via ${modeLabel}!`, 'success');
}

function renderHistoryTable() {
    const tbody = document.getElementById('history-table-body');
    if (!tbody) return;
    
    const now = new Date();

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

        const bDate = getBillDateObj(b);

        if (isSameDay(bDate, now)) {
            todaySales += b.grandTotal;
        }

        if (isWithinLast7Days(bDate, now)) {
            weekSales += b.grandTotal;
        }

        if (isSameMonth(bDate, now)) {
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

    const countAllEl = document.getElementById('hist-count-all');
    const countPaidEl = document.getElementById('hist-count-paid');
    const countCreditEl = document.getElementById('hist-count-credit');

    if (countAllEl) countAllEl.innerText = countAll;
    if (countPaidEl) countPaidEl.innerText = countPaid;
    if (countCreditEl) countCreditEl.innerText = countCredit;

    let filtered = billsHistory.filter(b => {
        let status = b.paymentStatus || 'paid';
        if (currentHistoryFilter !== 'all' && status !== currentHistoryFilter) {
            return false;
        }

        const bDate = getBillDateObj(b);

        if (currentDatePeriod === 'today') {
            return isSameDay(bDate, now);
        } else if (currentDatePeriod === 'week') {
            return isWithinLast7Days(bDate, now);
        } else if (currentDatePeriod === 'month') {
            return isSameMonth(bDate, now);
        } else if (currentDatePeriod === 'custom' && currentCustomDateStr) {
            return isMatchingCustomDate(bDate, currentCustomDateStr);
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
                : `<div class="mt-1 text-[10px] font-medium text-gray-400 flex items-center justify-center gap-1"><i class="fa-solid fa-pen"></i> Not in Book</div>`
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
                        <button onclick="openUdharSettlementModalForBill(${b.billNo})" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition">
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

// ================= CREDIT CUSTOMERS (UDHAR KHATA) DIRECTORY =================
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
            let dueForThisBill = b.dueAmount !== undefined ? b.dueAmount : b.grandTotal;
            creditMap[key].totalBalance += dueForThisBill;
            creditMap[key].unpaidBillsCount += 1;
            creditMap[key].billNos.push(b.billNo);
            grandUdharTotal += dueForThisBill;
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
                    <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-500/20 text-red-400 font-bold flex items-center justify-center text-xs border border-red-500/30 shrink-0">
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
                <button onclick="openUdharSettlementModalForCustomer('${c.name.replace(/'/g, "\\'")}', '${c.phone}', ${c.totalBalance})" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition inline-flex items-center gap-1.5">
                    <i class="fa-solid fa-hand-holding-dollar"></i> Settle Udhar (₹${c.totalBalance})
                </button>
            </td>
        </tr>
    `).join('');
}

// ================= UDHAR SETTLEMENT MODAL HANDLERS =================
let currentSettleTarget = null;
let currentSettlePayMode = 'cash';

function openUdharSettlementModalForCustomer(custName, custPhone, totalBalance) {
    currentSettleTarget = { type: 'customer', custName, custPhone, amount: totalBalance };
    currentSettlePayMode = 'cash';

    document.getElementById('settle-modal-cust-name').innerText = custName;
    document.getElementById('settle-modal-cust-amt').innerText = `₹${totalBalance}`;

    selectSettlePayMode('cash');
    document.getElementById('udhar-settlement-modal')?.classList.remove('hidden');
}

function openUdharSettlementModalForBill(billNo) {
    const bill = billsHistory.find(b => b.billNo === billNo);
    if (!bill) return;

    currentSettleTarget = { type: 'bill', billNo: bill.billNo, custName: bill.customerName, amount: bill.grandTotal };
    currentSettlePayMode = 'cash';

    document.getElementById('settle-modal-cust-name').innerText = `${bill.customerName} (Bill #${bill.billNo})`;
    document.getElementById('settle-modal-cust-amt').innerText = `₹${bill.grandTotal}`;

    selectSettlePayMode('cash');
    document.getElementById('udhar-settlement-modal')?.classList.remove('hidden');
}

function selectSettlePayMode(mode) {
    currentSettlePayMode = mode;
    const cashBtn = document.getElementById('settle-pay-cash');
    const onlineBtn = document.getElementById('settle-pay-online');

    if (mode === 'cash') {
        if (cashBtn) cashBtn.className = 'p-3 rounded-2xl border border-emerald-500/50 bg-emerald-600/30 text-emerald-300 font-bold text-xs flex flex-col items-center justify-center gap-1 shadow transition';
        if (onlineBtn) onlineBtn.className = 'p-3 rounded-2xl border border-white/10 bg-gray-900/60 text-gray-400 font-bold text-xs flex flex-col items-center justify-center gap-1 hover:text-indigo-300 transition';
    } else {
        if (cashBtn) cashBtn.className = 'p-3 rounded-2xl border border-white/10 bg-gray-900/60 text-gray-400 font-bold text-xs flex flex-col items-center justify-center gap-1 hover:text-emerald-300 transition';
        if (onlineBtn) onlineBtn.className = 'p-3 rounded-2xl border border-indigo-500/50 bg-indigo-600/30 text-indigo-300 font-bold text-xs flex flex-col items-center justify-center gap-1 shadow transition';
    }
}

function closeUdharSettlementModal() {
    document.getElementById('udhar-settlement-modal')?.classList.add('hidden');
    currentSettleTarget = null;
}

function confirmUdharSettlement() {
    if (!currentSettleTarget) return;

    if (currentSettleTarget.type === 'customer') {
        payCustomerCreditAll(currentSettleTarget.custName, currentSettleTarget.custPhone, currentSettlePayMode);
    } else if (currentSettleTarget.type === 'bill') {
        markBillAsPaid(currentSettleTarget.billNo, currentSettlePayMode);
    }

    closeUdharSettlementModal();
}

function payCustomerCreditAll(custName, custPhone, payMode = 'cash') {
    let matchCount = 0;
    let settledTotal = 0;
    const modeLabel = payMode === 'online' ? 'ONLINE / UPI 📱' : 'CASH 💵';

    billsHistory.forEach(b => {
        if (b.paymentStatus === 'credit' && b.customerName === custName) {
            let dueForThisBill = b.dueAmount !== undefined ? b.dueAmount : b.grandTotal;
            b.paymentStatus = payMode;
            b.paidAmount = b.grandTotal;
            b.dueAmount = 0;
            settledTotal += dueForThisBill;
            matchCount++;
        }
    });

    if (matchCount > 0) {
        localStorage.setItem('krupa_bills', JSON.stringify(billsHistory));
        syncDataToSQLite();
        renderCreditCustomersTable();
        renderHistoryTable();
        updateHeaderStats();
        showToastNotification(`Successfully settled ₹${settledTotal} Udhar balance for ${custName} via ${modeLabel}!`, 'success');
    }
}

function updateHeaderStats() {
    const now = new Date();
    let todaySales = billsHistory.reduce((sum, b) => {
        const bDate = getBillDateObj(b);
        return isSameDay(bDate, now) ? sum + b.grandTotal : sum;
    }, 0);
    const headerSales = document.getElementById('header-today-sales');
    if (headerSales) headerSales.innerText = `₹${todaySales}`;
}

// ================= SQLITE WASM & EXCEL EXPORT ENGINE =================
let sqliteDB = null;

async function initSQLiteDB() {
    try {
        if (typeof initSqlJs === 'function') {
            const SQL = await initSqlJs({
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            });

            const savedBytes = localStorage.getItem('krupa_sqlite_db_bytes');
            if (savedBytes) {
                try {
                    const uarr = new Uint8Array(JSON.parse(savedBytes));
                    sqliteDB = new SQL.Database(uarr);
                } catch(e) {
                    sqliteDB = new SQL.Database();
                }
            } else {
                sqliteDB = new SQL.Database();
            }

            createSQLiteTables();
            syncDataToSQLite();
            console.log("SQLite WASM Database Engine initialized successfully!");
        }
    } catch (err) {
        console.warn("SQLite WASM Engine init notice:", err);
    }
}

function createSQLiteTables() {
    if (!sqliteDB) return;
    try {
        sqliteDB.run(`
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                price REAL NOT NULL,
                stock INTEGER NOT NULL
            );
        `);
        sqliteDB.run(`
            CREATE TABLE IF NOT EXISTS bills (
                billNo INTEGER PRIMARY KEY,
                createdAt INTEGER NOT NULL,
                date TEXT NOT NULL,
                customerName TEXT NOT NULL,
                customerPhone TEXT,
                subtotal REAL NOT NULL,
                discount REAL NOT NULL,
                grandTotal REAL NOT NULL,
                paymentStatus TEXT NOT NULL,
                isBookNoted INTEGER DEFAULT 0,
                itemsJson TEXT NOT NULL
            );
        `);
    } catch (e) {
        console.warn("Error creating SQLite tables:", e);
    }
}

function syncDataToSQLite() {
    if (!sqliteDB) return;
    try {
        items.forEach(item => {
            sqliteDB.run(
                `INSERT OR REPLACE INTO items (id, name, category, price, stock) VALUES (?, ?, ?, ?, ?)`,
                [item.id, item.name, item.category, item.price, item.stock]
            );
        });

        billsHistory.forEach(bill => {
            const bDateObj = getBillDateObj(bill);
            sqliteDB.run(
                `INSERT OR REPLACE INTO bills (billNo, createdAt, date, customerName, customerPhone, subtotal, discount, grandTotal, paymentStatus, isBookNoted, itemsJson) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    bill.billNo,
                    bDateObj.getTime(),
                    bill.date,
                    bill.customerName,
                    bill.customerPhone || '',
                    bill.subtotal,
                    bill.discount,
                    bill.grandTotal,
                    bill.paymentStatus || 'paid',
                    bill.isBookNoted ? 1 : 0,
                    JSON.stringify(bill.items || [])
                ]
            );
        });

        saveSQLiteToLocalStorage();
    } catch (e) {
        console.warn("SQLite sync notice:", e);
    }
}

function saveSQLiteToLocalStorage() {
    if (!sqliteDB) return;
    try {
        const binaryArray = sqliteDB.export();
        localStorage.setItem('krupa_sqlite_db_bytes', JSON.stringify(Array.from(binaryArray)));
    } catch (e) {
        console.warn("Error saving SQLite binary buffer:", e);
    }
}

// 1-CLICK EXCEL EXPORT FUNCTIONS (SheetJS)
function exportBillsToExcel() {
    if (typeof XLSX === 'undefined') {
        showToastNotification('Excel export library is loading... Please retry in a moment.', 'info');
        return;
    }
    
    if (!billsHistory || billsHistory.length === 0) {
        showToastNotification('No sales bill records available to export!', 'info');
        return;
    }

    const payStatusMap = {
        'cash': 'CASH 💵',
        'online': 'ONLINE / UPI 📱',
        'credit': 'UDHAR / KHATA 🔴',
        'paid': 'CASH 💵'
    };

    const exportData = billsHistory.map(b => {
        const itemsSummary = (b.items || []).map(i => `${i.name} (${formatWeightOrQty(i.qty)})`).join(', ');
        const statusLabel = payStatusMap[b.paymentStatus] || 'CASH 💵';
        const paidVal = b.paidAmount !== undefined ? b.paidAmount : (b.paymentStatus === 'credit' ? 0 : b.grandTotal);
        const dueVal = b.dueAmount !== undefined ? b.dueAmount : (b.paymentStatus === 'credit' ? b.grandTotal : 0);

        return {
            "Bill No": `#${b.billNo}`,
            "Date & Time": b.date,
            "Customer Name": b.customerName,
            "Phone Number": b.customerPhone || 'N/A',
            "Items Summary": itemsSummary,
            "Subtotal (₹)": b.subtotal,
            "Discount (₹)": b.discount,
            "Grand Total (₹)": b.grandTotal,
            "Paid Amount (₹)": paidVal,
            "Pending Udhar (₹)": dueVal,
            "Payment Method": statusLabel,
            "Noted in Book": b.isBookNoted ? 'YES' : 'NO'
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales History");

    worksheet['!cols'] = [
        { wch: 10 }, { wch: 22 }, { wch: 20 }, { wch: 15 },
        { wch: 35 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
        { wch: 18 }, { wch: 15 }
    ];

    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Krupa_Sales_History_${todayStr}.xlsx`);
    showToastNotification('Sales history exported to Excel (.xlsx) successfully! 📊', 'success');
}

function exportCreditToExcel() {
    if (typeof XLSX === 'undefined') {
        showToastNotification('Excel export library is loading... Please retry in a moment.', 'info');
        return;
    }

    const creditMap = {};
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
            creditMap[key].billNos.push(`#${b.billNo}`);
        }
    });

    const exportData = Object.values(creditMap).map(c => ({
        "Customer Name": c.name,
        "Phone Number": c.phone,
        "Unpaid Bills Count": c.unpaidBillsCount,
        "Unpaid Bill Numbers": c.billNos.join(', '),
        "Outstanding Udhar Balance (₹)": c.totalBalance,
        "Last Purchase Date": c.lastPurchase
    }));

    if (exportData.length === 0) {
        showToastNotification('No pending credit (Udhar) customer records found to export!', 'info');
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Udhar Khata Directory");

    worksheet['!cols'] = [
        { wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 25 }, { wch: 25 }, { wch: 22 }
    ];

    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Krupa_Udhar_Ledger_${todayStr}.xlsx`);
    showToastNotification('Udhar Khata ledger exported to Excel (.xlsx) successfully! 📖', 'success');
}

function exportItemsToExcel() {
    if (typeof XLSX === 'undefined') {
        showToastNotification('Excel export library is loading... Please retry in a moment.', 'info');
        return;
    }

    const exportData = items.map(i => ({
        "Item ID": i.id,
        "Item Name": i.name,
        "Category": i.category.toUpperCase(),
        "Selling Price (₹)": i.price,
        "Stock Quantity": i.stock,
        "Stock Value (₹)": i.price * i.stock
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Catalogue");

    worksheet['!cols'] = [
        { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 18 }
    ];

    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Krupa_Inventory_Catalogue_${todayStr}.xlsx`);
    showToastNotification('Inventory catalogue exported to Excel (.xlsx)! 📦', 'success');
}

function exportSQLiteDBFile() {
    try {
        let binaryArray;
        if (sqliteDB) {
            binaryArray = sqliteDB.export();
        } else {
            const savedBytes = localStorage.getItem('krupa_sqlite_db_bytes');
            if (savedBytes) binaryArray = new Uint8Array(JSON.parse(savedBytes));
        }

        if (!binaryArray) {
            showToastNotification('SQLite database is initializing...', 'info');
            return;
        }

        const blob = new Blob([binaryArray], { type: 'application/x-sqlite3' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const todayStr = new Date().toISOString().split('T')[0];
        a.download = `krupa_store_${todayStr}.sqlite`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToastNotification('SQLite database file (.sqlite) downloaded! 🗄️', 'success');
    } catch (e) {
        console.error("Error exporting SQLite file:", e);
        showToastNotification('Failed to download SQLite file', 'error');
    }
}
