import { privacyActive, setPrivacyActive } from './state.js';

function updatePrivacyMode() {
    const valueElements = document.querySelectorAll(
        '.summary-card .value, .transaction-amount, .receipt-value.highlight, #receiptValor, #balanceValue, #incomeValue, #expenseValue, ' +
        '.indicator-item .value, #chartTotalIncome, #chartTotalExpense, .earnings-value, ' +
        '.privacy-text-value, .account-card-balance, #detAccountBalance, #detBalanceDay, #detBalanceAvailable, ' +
        '.daily-balance-neutral, .daily-balance-negative'
    );
    valueElements.forEach(el => {
        if (privacyActive) {
            if (!el.dataset.original) el.dataset.original = el.innerHTML;
            el.textContent = 'R$ ****';
        } else {
            if (el.dataset.original) el.innerHTML = el.dataset.original;
        }
    });
}

function togglePrivacy() {
    setPrivacyActive(!privacyActive);
    localStorage.setItem('controlpess-privacy', privacyActive);
    const btn = document.getElementById('privacyToggle');
    if (btn) {
        const icon = btn.querySelector('span');
        icon.textContent = privacyActive ? 'visibility_off' : 'visibility';
    }
    updatePrivacyMode();
}

const themeToggle = document.getElementById('themeToggle');

function updateThemeIcon() {
    const isDark = document.body.classList.contains('dark-mode');
    const icon = themeToggle.querySelector('span');
    icon.textContent = isDark ? 'light_mode' : 'dark_mode';
    localStorage.setItem('controlpess-theme', isDark ? 'dark' : 'light');
}

function loadSavedTheme() {
    const savedTheme = localStorage.getItem('controlpess-theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    if (themeToggle) {
        const icon = themeToggle.querySelector('span');
        icon.textContent = document.body.classList.contains('dark-mode') ? 'light_mode' : 'dark_mode';
    }
}

function loadSavedUIStates() {
    const savedSidebar = localStorage.getItem('controlpess-sidebar');
    const appSidebar = document.getElementById('appSidebar');
    if (window.innerWidth > 768 && savedSidebar === 'collapsed' && appSidebar) {
        appSidebar.classList.add('collapsed');
    }
    const btnPrivacy = document.getElementById('privacyToggle');
    if (btnPrivacy) {
        const icon = btnPrivacy.querySelector('span');
        icon.textContent = privacyActive ? 'visibility_off' : 'visibility';
    }
}

export { updatePrivacyMode, togglePrivacy, themeToggle, updateThemeIcon, loadSavedTheme, loadSavedUIStates };
