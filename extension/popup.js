const PRICE_NKTX = 0.00000408;

document.addEventListener('DOMContentLoaded', () => {
    // Проверка авторизации при открытии попапа
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
        
        if (addr.length >= 32 && addr.length <= 44) {
            // ИСПРАВЛЕНИЕ: Сначала получаем текущие данные, чтобы не стереть баланс
            chrome.storage.local.get(['nkTxBalance'], (prevData) => {
                const currentBalance = prevData.nkTxBalance || 0;
                
                chrome.storage.local.set({ 
                    walletAddress: addr,
                    nkTxBalance: currentBalance 
                }, () => {
                    showDashboard(addr, currentBalance);
                });
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

    const short = `${address.slice(0, 4)}...${address.slice(-4)}`;
    document.getElementById('short-address').innerText = short;

    updateBalanceUI(balance);

    chrome.storage.onChanged.addListener((changes) => {
        if (changes.nkTxBalance) {
            updateBalanceUI(changes.nkTxBalance.newValue);
        }
    });
}

function updateBalanceUI(balance) {
    // Отображаем больше знаков после запятой, так как награды очень маленькие
    document.getElementById('balance-display').innerText = balance.toFixed(5);
    const usd = (balance * PRICE_NKTX).toFixed(7);
    document.getElementById('usd-display').innerText = `≈ $${usd} USD`;
}