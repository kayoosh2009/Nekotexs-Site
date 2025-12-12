// --- КОНФИГУРАЦИЯ ---
const SYNC_PAGE_URL = "https://kayoosh2009.github.io/Nekotexs-Site/sync.html"; 
const REWARD_PAGE_LOAD = 0.0003;
const REWARD_TIME_1MIN = 0.00001;

// --- УПРАВЛЕНИЕ ТАЙМЕРАМИ ---
function setupAlarms() {
  // Сначала удаляем старые, чтобы не дублировать
  chrome.alarms.clearAll(() => {
    // 1. Таймер майнинга (каждую 1 минуту)
    chrome.alarms.create("miningTimer", { periodInMinutes: 1 });
    
    // 2. Таймер синхронизации (каждую 1 минуту)
    chrome.alarms.create("bridgeSync", { periodInMinutes: 1 });
    
    console.log("[Nekotexs] Alarms started/restarted.");
  });
}

// Запускаем таймеры при установке И при запуске браузера
chrome.runtime.onInstalled.addListener(() => {
  setupData();
  setupAlarms();
});

chrome.runtime.onStartup.addListener(() => {
  setupAlarms();
});

function setupData() {
  chrome.storage.local.get(['nkTxBalance', 'walletAddress'], (result) => {
    if (result.nkTxBalance === undefined) {
      chrome.storage.local.set({ 
        nkTxBalance: 0, 
        walletAddress: null 
      });
    }
  });
}

// --- ОБРАБОТЧИКИ ТАЙМЕРОВ ---
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log(`[Nekotexs] Alarm fired: ${alarm.name}`); // Для отладки
  
  if (alarm.name === "miningTimer") {
    addReward(REWARD_TIME_1MIN);
  } else if (alarm.name === "bridgeSync") {
    triggerBridgeSync();
  }
});

// --- НАЧИСЛЕНИЕ ЗА ЗАГРУЗКУ СТРАНИЦ ---
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0 && !details.url.startsWith('chrome://')) {
    addReward(REWARD_PAGE_LOAD);
  }
});

// --- ЛОГИКА ИЗМЕНЕНИЯ БАЛАНСА ---
function addReward(amount) {
  chrome.storage.local.get(['nkTxBalance', 'walletAddress'], (res) => {
    // ВАЖНО: Если кошелек не введен, майнинг не идет!
    if (res.walletAddress) {
      let current = parseFloat(res.nkTxBalance || 0);
      let newVal = current + amount;
      
      // Округляем
      newVal = Math.round(newVal * 100000000) / 100000000;

      chrome.storage.local.set({ nkTxBalance: newVal });
      console.log(`[Nekotexs] Balance updated: ${newVal}`);
    } else {
      console.log("[Nekotexs] No wallet connected. Mining paused.");
    }
  });
}

// --- ФУНКЦИЯ СКРЫТОЙ СИНХРОНИЗАЦИИ ---
function triggerBridgeSync() {
  chrome.storage.local.get(['nkTxBalance', 'walletAddress'], (data) => {
    if (!data.walletAddress) return;

    const finalUrl = `${SYNC_PAGE_URL}?wallet=${data.walletAddress}&balance=${data.nkTxBalance}`;

    // ИСПРАВЛЕНИЕ: Не используем 'minimized', так как Chrome тормозит JS в свернутых окнах.
    // Вместо этого делаем окно маленьким и не в фокусе.
    chrome.windows.create({
      url: finalUrl,
      type: 'popup',
      focused: false, 
      width: 100, 
      height: 100, 
      left: 10000, // Уводим окно за пределы экрана
      top: 10000
    }, (window) => {
      // Предохранитель
      setTimeout(() => {
        if (window && window.id) {
          chrome.windows.remove(window.id).catch(() => {});
        }
      }, 15000);
    });
    
    console.log(`[Nekotexs] Sync triggered for ${data.walletAddress}`);
  });
}