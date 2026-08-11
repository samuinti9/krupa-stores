const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5173;
const DB_FILE = path.join(__dirname, 'krupa_store_db.json');

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading db file:', err);
  }
  return null;
}

function saveDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing db file:', err);
  }
}

function mergeDb(existing, incoming) {
  if (!existing) {
    incoming.lastModified = Date.now();
    return incoming;
  }
  if (!incoming) return existing;

  // 1. Smart Merge Bills History
  const billMap = new Map();
  (existing.bills || []).forEach(b => {
    if (b && b.billNo) billMap.set(b.billNo, b);
  });

  (incoming.bills || []).forEach(b => {
    if (b && b.billNo) {
      if (!billMap.has(b.billNo)) {
        billMap.set(b.billNo, b);
      } else {
        const prev = billMap.get(b.billNo);
        const prevTime = prev.createdAt || 0;
        const curTime = b.createdAt || 0;
        if (curTime >= prevTime) {
          billMap.set(b.billNo, { ...prev, ...b });
        }
      }
    }
  });

  const mergedBills = Array.from(billMap.values()).sort((a, b) => {
    return (b.createdAt || b.billNo) - (a.createdAt || a.billNo);
  });

  // 2. Smart Merge Items Catalogue
  const itemMap = new Map();
  (existing.items || []).forEach(i => {
    if (i && i.id) itemMap.set(i.id, i);
  });
  (incoming.items || []).forEach(i => {
    if (i && i.id) itemMap.set(i.id, i);
  });
  const mergedItems = Array.from(itemMap.values());

  // 3. Compute Max Bill Number across all devices
  let maxBillNo = 1000;
  mergedBills.forEach(b => {
    if (b.billNo && b.billNo > maxBillNo) maxBillNo = b.billNo;
  });
  const nextBillNo = Math.max(maxBillNo + 1, incoming.lastBillNo || 1001, existing.lastBillNo || 1001);

  // 4. Merge Store Settings
  const mergedStoreName = incoming.storeName || existing.storeName || 'KRUPA STORE';
  const mergedStoreTagline = incoming.storeTagline || existing.storeTagline || 'Retail Fancy & Grocery Store';
  const mergedStorePhone = incoming.storePhone || existing.storePhone || '';
  const mergedStoreAddress = incoming.storeAddress || existing.storeAddress || '';
  const mergedStoreFooter = incoming.storeFooter || existing.storeFooter || 'Thank you for shopping at Krupa Store! 🙏';
  const mergedStoreLogo = incoming.storeLogo || existing.storeLogo || '';

  return {
    items: mergedItems,
    bills: mergedBills,
    lastBillNo: nextBillNo,
    storeName: mergedStoreName,
    storeTagline: mergedStoreTagline,
    storePhone: mergedStorePhone,
    storeAddress: mergedStoreAddress,
    storeFooter: mergedStoreFooter,
    storeLogo: mergedStoreLogo,
    lastModified: Date.now()
  };
}

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.sqlite': 'application/x-sqlite3'
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = req.url.split('?')[0];

  // API Endpoint: GET Sync Data
  if (reqUrl === '/api/sync-data' && req.method === 'GET') {
    const data = loadDb();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data || { status: 'empty' }));
    return;
  }

  // API Endpoint: POST Sync Data with Smart Multi-Device Merger
  if (reqUrl === '/api/sync-data' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const incoming = JSON.parse(body);
        const existing = loadDb();
        const mergedData = mergeDb(existing, incoming);
        saveDb(mergedData);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mergedData));
      } catch (err) {
        console.error('Error handling sync POST:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Static File Serving
  let filePath = path.join(__dirname, reqUrl === '/' ? 'index.html' : reqUrl);
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Error loading resource');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Krupa POS Multi-Device Sync Server running at http://localhost:${PORT}`);
});
