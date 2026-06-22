// ========== BOOTSTRAP PRINCIPAL DO CONTROLPESS ==========
import './firebase-config.js';
import { auth, db } from './firebase-config.js';
import { currentUser, g, currentView, privacyActive } from './state.js';
import { formatCurrency, formatDate, LIMITES, escapeJsAttr } from './utils.js';
import { showToast } from './ui-helpers.js';
import { updatePrivacyMode, togglePrivacy, themeToggle, updateThemeIcon, loadSavedTheme, loadSavedUIStates } from './theme.js';
import { renderNotifications, notificationsBtn, notificationsDropdown, notifBadge } from './notifications.js';
import { renderDashboard } from './dashboard.js';
import { renderTransactions, filterTransactions, initTransactions } from './transactions.js';
import { initPartners, loadPartners, renderPartners } from './partners.js';
import { loadAccounts, initAccounts } from './accounts.js';
import { initSettings, verificarERepararFormasPagamento, verificarERepararContasPadrao } from './settings.js';
import { initOfxImport } from './ofx-import.js';
import './auth.js';

loadSavedTheme();
loadSavedUIStates();

const sidebarItems = document.querySelectorAll('.sidebar-item');
const views = {
    dashboard: document.getElementById('dashboardView'),
    transactions: document.getElementById('transactionsView'),
    partners: document.getElementById('partnersView'),
    accounts: document.getElementById('accountsView'),
    settings: document.getElementById('settingsView')
};

function setActiveView(view) {
    currentView.value = view;
    Object.values(views).forEach(v => { if (v) v.style.display = 'none'; });
    sidebarItems.forEach(item => item.classList.remove('active'));
    const activeView = views[view];
    if (activeView) activeView.style.display = 'block';
    const activeItem = document.querySelector(`.sidebar-item[data-view="${view}"]`);
    if (activeItem) activeItem.classList.add('active');
    switch (view) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'transactions':
            renderTransactions();
            filterTransactions();
            break;
        case 'partners':
            renderPartners();
            break;
        case 'accounts':
            loadAccounts();
            break;
    }
}

window.setActiveView = setActiveView;
window.openEditTransactionModal = function (id) {
    document.dispatchEvent(new CustomEvent('openEditTransaction', { detail: { id } }));
};
window.nextStep = function () {
    document.dispatchEvent(new CustomEvent('wizard:next'));
};
window.prevStep = function () {
    document.dispatchEvent(new CustomEvent('wizard:prev'));
};
window.closeDrawer = function () {
    const drawer = document.querySelector('.drawer.open');
    if (drawer) drawer.classList.remove('open');
};
window.setType = function (type) {
    document.dispatchEvent(new CustomEvent('wizard:setType', { detail: { type } }));
};
window.togglePrivacy = togglePrivacy;

sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
        const view = item.dataset.view;
        if (view) setActiveView(view);
    });
});

document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.querySelector('.sidebar')?.classList.toggle('collapsed');
});

document.getElementById('mobileOpenMenuBtn')?.addEventListener('click', () => {
    document.querySelector('.sidebar')?.classList.add('open');
});

document.getElementById('themeToggle')?.addEventListener('click', () => {
    themeToggle();
    const current = currentView.value;
    if (current) setActiveView(current);
});

document.getElementById('privacyToggle')?.addEventListener('click', togglePrivacy);

document.getElementById('notificationsBtn')?.addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('notificationsDropdown')?.classList.toggle('show');
});

document.addEventListener('click', () => {
    document.getElementById('notificationsDropdown')?.classList.remove('show');
});

document.getElementById('logoutLink')?.addEventListener('click', e => {
    e.preventDefault();
    auth.signOut();
});

document.getElementById('userAvatarBtn')?.addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('userDropdown')?.classList.toggle('show');
});

document.getElementById('logoHome')?.addEventListener('click', () => {
    setActiveView('dashboard');
});

document.querySelectorAll('.close-briefing, .briefing-overlay').forEach(el => {
    el.addEventListener('click', () => {
        document.querySelectorAll('.briefing-modal').forEach(m => { m.style.display = 'none'; });
    });
});

document.getElementById('globalSearchInput')?.addEventListener('input', e => {
    document.dispatchEvent(new CustomEvent('globalSearch', { detail: { query: e.target.value.trim() } }));
});

initTransactions();
initPartners();
initAccounts();
initSettings();
initOfxImport();
