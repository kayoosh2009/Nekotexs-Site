// --- // --- КОНФИГУРАЦИЯ ---
const SYNC_PAGE_URL = "https://kayoosh2009.github.io/Nekotexs-Site/sync.html"; 

const REWARD_PAGE_LOAD = 0.0003;
const REWARD_TIME_1MIN = 0.00001;

// --- ИНИЦИАЛИЗАЦИЯ ---
chrome.runtime.onInstalled.addListener(() => {
  // Инициализируем переменные, если их нет, но НЕ перезаписываем существующие
  chrome.storage.local.get(['nkTxBalance', 'walletAddress'], (result) => {
    if (result.nkTxBalance === undefined) {
      chrome.storage.local.set({ 
        nkTxBalance: 0, 
        walletAddress: null 
      });
    }
  });

  // Создаем таймеры
  // 1. Таймер майнинга (каждую минуту начисляет награду)
  chrome.alarms.create("miningTimer", { periodInMinutes: 1 }); 
  
  // 2. Таймер синхронизации (каждую минуту открывает скрытое окно для отправки в Firebase)
  chrome.alarms.create("bridgeSync", { periodInMinutes: 1 });  
});

// --- ОБРАБОТЧИКИ ТАЙМЕРОВ ---
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "miningTimer") {
    addReward(REWARD_TIME_1MIN);
  } else if (alarm.name === "bridgeSync") {
    triggerBridgeSync();
  }
});

// --- НАЧИСЛЕНИЕ ЗА ЗАГРУЗКУ СТРАНИЦ ---
// Используем onCompleted, чтобы считать только полностью загруженные страницы
chrome.webNavigation.onCompleted.addListener((details) => {
  // frameId 0 = это основная вкладка, а не реклама или iframe
  if (details.frameId === 0 && !details.url.startsWith('chrome://')) {
    addReward(REWARD_PAGE_LOAD);
  }
});

// --- ЛОГИКА ИЗМЕНЕНИЯ БАЛАНСА ---
function addReward(amount) {
  chrome.storage.local.get(['nkTxBalance', 'walletAddress'], (res) => {
    if (res.walletAddress) {
      // Получаем текущий баланс
      let current = parseFloat(res.nkTxBalance || 0);
      let newVal = current + amount;
      
      // Округляем до 8 знаков, чтобы избежать ошибок javascript (0.0000000199999)
      newVal = Math.round(newVal * 100000000) / 100000000;

      // Сохраняем обратно
      chrome.storage.local.set({ nkTxBalance: newVal });
    }
  });
}

// --- ФУНКЦИЯ СКРЫТОЙ СИНХРОНИЗАЦИИ ---
function triggerBridgeSync() {
  chrome.storage.local.get(['nkTxBalance', 'walletAddress'], (data) => {
    // Если пользователь не залогинен, ничего не делаем
    if (!data.walletAddress) return;

    // Формируем URL с параметрами
    const finalUrl = `${SYNC_PAGE_URL}?wallet=${data.walletAddress}&balance=${data.nkTxBalance}`;

    // Создаем окно:
    // type: 'popup' - чтобы было без адресной строки
    // state: 'minimized' - чтобы оно свернулось в панель задач (не мешало юзеру)
    // focused: false - чтобы не перехватывало клавиатуру
    chrome.windows.create({
      url: finalUrl,
      type: 'popup',
      focused: false,
      state: 'minimized', 
      width: 1,  // Минимальный размер
      height: 1
    }, (window) => {
      // Окно откроется, sync.html выполнит код и сам вызовет window.close()
      
      // Но на всякий случай поставим таймер-предохранитель.
      // Если через 15 секунд окно всё еще висит (например, интернет отпал), мы закроем его принудительно.
      setTimeout(() => {
        if (window && window.id) {
          chrome.windows.remove(window.id).catch(() => { 
            // Игнорируем ошибку, если окно уже закрылось само
          });
        }
      }, 15000);
    });
    
    console.log(`[Nekotexs] Sync triggered for ${data.walletAddress}`);
  });
}