// background.js

// --- КОНФИГУРАЦИЯ ---
const SYNC_PAGE_URL = "https://kayoosh2009.github.io/Nekotexs-Site/sync.html"; 
const REWARD_PAGE_LOAD = 0.0003;
const REWARD_TIME_1MIN = 0.00001;

// --- УПРАВЛЕНИЕ ТАЙМЕРАМИ ---
function setupAlarms() {
  chrome.alarms.clearAll(() => {
    // 1. Таймер майнинга (каждую 1 минуту)
    chrome.alarms.create("miningTimer", { periodInMinutes: 1 });
    
    // 2. Таймер синхронизации (каждую 1 минуту)
    chrome.alarms.create("bridgeSync", { periodInMinutes: 1 });
    
    console.log("[Nekotexs] Alarms started/restarted.");
  });
}

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
    if (res.walletAddress) {
      // Превращаем в число, если вдруг там строка
      let current = parseFloat(res.nkTxBalance);
      if (isNaN(current)) current = 0;

      let newVal = current + amount;
      
      // Округляем до 8 знаков
      newVal = Math.round(newVal * 100000000) / 100000000;

      chrome.storage.local.set({ nkTxBalance: newVal });
      console.log(`[Nekotexs] Balance updated: ${newVal}`);
    }
  });
}

// --- ФУНКЦИЯ СКРЫТОЙ СИНХРОНИЗАЦИИ ---
function triggerBridgeSync() {
  chrome.storage.local.get(['nkTxBalance', 'walletAddress'], (data) => {
    // Если кошелька нет, ничего не делаем
    if (!data.walletAddress) return;

    // Гарантируем числовой формат
    const safeBalance = parseFloat(data.nkTxBalance || 0);

    // Используем URLSearchParams для правильного формирования ссылки
    const params = new URLSearchParams();
    params.append('wallet', data.walletAddress);
    params.append('balance', safeBalance);

    const finalUrl = `${SYNC_PAGE_URL}?${params.toString()}`;

    // Создаем маленькое окно в углу
    chrome.windows.create({
      url: finalUrl,
      type: 'popup',
      focused: false, 
      width: 1,      // Минимально возможный размер
      height: 1,     // Минимально возможный размер
      left: 9999,    // Уводим за экран
      top: 9999
    }, (createdWindow) => {
      // Подстраховка: закрыть окно через 10 секунд, если скрипт на странице сам не закрыл
      if (createdWindow) {
          setTimeout(() => {
            // Проверяем, существует ли еще окно, прежде чем пытаться закрыть
            chrome.windows.get(createdWindow.id).then(() => {
                chrome.windows.remove(createdWindow.id);
            }).catch(() => {
                // Окно уже было закрыто скриптом страницы, игнорируем ошибку
            });
          }, 10000);
      }
    });
    
    console.log(`[Nekotexs] Sync triggered for ${data.walletAddress}`);
  });
}
