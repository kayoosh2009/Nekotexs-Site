// --- KONFIGURACIA ---
const PROJECT_ID = "nekotexs";
const COLLECTION = "users";
// Используем Firestore REST API для записи без тяжелых библиотек
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}`;

const REWARD_PAGE_LOAD = 0.0003;
const REWARD_TIME_1MIN = 0.00001;

// --- INIT ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['nkTxBalance', 'walletAddress'], (result) => {
    if (result.nkTxBalance === undefined) {
      chrome.storage.local.set({ 
        nkTxBalance: 0, 
        walletAddress: null 
      });
    }
  });

  // Таймеры
  chrome.alarms.create("miningTimer", { periodInMinutes: 1 }); // Начисление за время
  chrome.alarms.create("firebaseSync", { periodInMinutes: 15 }); // Синхронизация с БД
});

// --- ОБРАБОТЧИКИ ТАЙМЕРОВ ---
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "miningTimer") {
    addReward(REWARD_TIME_1MIN);
  } else if (alarm.name === "firebaseSync") {
    syncToFirestore();
  }
});

// --- НАЧИСЛЕНИЕ ЗА АКТИВНОСТЬ (СТРАНИЦЫ) ---
chrome.webNavigation.onCommitted.addListener((details) => {
  // frameId 0 = основная страница (не реклама)
  if (details.frameId === 0 && !details.url.startsWith('chrome://')) {
    addReward(REWARD_PAGE_LOAD);
  }
});

// --- ЛОГИКА БАЛАНСА ---
function addReward(amount) {
  chrome.storage.local.get(['nkTxBalance', 'walletAddress'], (res) => {
    if (res.walletAddress) {
      let current = parseFloat(res.nkTxBalance || 0);
      let newVal = current + amount;
      // Сохраняем локально (быстро)
      chrome.storage.local.set({ nkTxBalance: parseFloat(newVal.toFixed(8)) });
    }
  });
}

// --- СИНХРОНИЗАЦИЯ С FIREBASE (Скрытая) ---
async function syncToFirestore() {
  const data = await chrome.storage.local.get(['nkTxBalance', 'walletAddress']);
  
  if (!data.walletAddress) return;

  // Формируем URL для конкретного юзера
  const url = `${FIRESTORE_URL}/${data.walletAddress}?updateMask.fieldPaths=nkTxBalance&updateMask.fieldPaths=lastExtensionSync`;

  // Формат данных для REST API Firestore (строгая типизация)
  const body = {
    fields: {
      nkTxBalance: { doubleValue: data.nkTxBalance },
      lastExtensionSync: { timestampValue: new Date().toISOString() }
    }
  };

  try {
    // Используем PATCH чтобы обновить только баланс, не затирая другие данные (рефералов и т.д.)
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (response.ok) {
      console.log(`[Nekotexs] Synced ${data.nkTxBalance} for ${data.walletAddress}`);
    } else {
      console.error(`[Nekotexs] Sync Error: ${response.status}`);
    }
  } catch (err) {
    console.error("Network Error:", err);
  }
}