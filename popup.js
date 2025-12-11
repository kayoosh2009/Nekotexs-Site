const PRICE_NKTX = 0.00000408; // Цена из твоего кода

document.addEventListener('DOMContentLoaded', () => {
    // Проверка авторизации
    chrome.storage.local.get(['walletAddress', 'nkTxBalance'], (data) => {
        if (data.walletAddress) {
            showDashboard(data.walletAddress, data.nkTxBalance || 0);
        } else {
            showLogin();
        }
    });

    // Логика Входа
    document.getElementById('login-btn').addEventListener('click', () => {
        const addr = document.getElementById('wallet-input').value.trim();
        // Простая валидация (длина Solana адреса 32-44)
        if (addr.length >= 32 && addr.length <= 44) {
            chrome.storage.local.set({ 
                walletAddress: addr,
                nkTxBalance: 0 // Или загрузить из БД при первом входе, если нужно
            }, () => {
                showDashboard(addr, 0);
            });
        } else {
            alert("Invalid Solana Address");
        }
    });

    // Логика Выхода
    document.getElementById('logout-btn').addEventListener('click', () => {
        chrome.storage.local.clear(() => {
            showLogin();
        });
    });
});

function showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('dashboard-screen').classList.add('hidden');
}

function showDashboard(address, balance) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard-screen').classList.remove('hidden');

    // Форматирование адреса (4TK4...vVon)
    const short = `${address.slice(0, 4)}...${address.slice(-4)}`;
    document.getElementById('short-address').innerText = short;

    updateBalanceUI(balance);

    // Слушаем изменения баланса в реальном времени (из background.js)
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.nkTxBalance) {
            updateBalanceUI(changes.nkTxBalance.newValue);
        }
    });
}

function updateBalanceUI(balance) {
    document.getElementById('balance-display').innerText = balance.toFixed(4);
    const usd = (balance * PRICE_NKTX).toFixed(6);
    document.getElementById('usd-display').innerText = `≈ $${usd} USD`;
}