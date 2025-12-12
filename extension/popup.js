// popup.js

const PRICE_NKTX = 0.00000408;

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['walletAddress', 'nkTxBalance'], (data) => {
        // Убедимся, что баланс отображается как число
        const balance = parseFloat(data.nkTxBalance || 0);
        
        if (data.walletAddress) {
            showDashboard(data.walletAddress, balance);
        } else {
            showLogin();
        }
    });

    document.getElementById('login-btn').addEventListener('click', () => {
        const addr = document.getElementById('wallet-input').value.trim();
        
        if (addr.length >= 32 && addr.length <= 44) {
            chrome.storage.local.get(['nkTxBalance'], (prevData) => {
                // При входе берем старый баланс или 0
                const currentBalance = parseFloat(prevData.nkTxBalance || 0);
                
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

    document.getElementById('logout-btn').addEventListener('click', () => {
        // При выходе очищаем кошелек, но баланс в storage можно оставить (опционально)
        // Но здесь чистим всё, как в оригинале
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

    // Слушаем изменения в реальном времени (пока открыто окно)
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.nkTxBalance) {
            updateBalanceUI(changes.nkTxBalance.newValue);
        }
    });
}

function updateBalanceUI(balance) {
    // Гарантируем, что balance это число
    const numBalance = parseFloat(balance);
    document.getElementById('balance-display').innerText = numBalance.toFixed(5);
    const usd = (numBalance * PRICE_NKTX).toFixed(7);
    document.getElementById('usd-display').innerText = `≈ $${usd} USD`;
}
