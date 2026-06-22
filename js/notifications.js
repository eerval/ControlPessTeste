import { g } from './state.js';
import { criarHtmlNotificacaoVazia, criarHtmlItemNotificacao } from './factories.js';
import { formatDate, getTodayISO } from './utils.js';

const notificationsBtn = document.getElementById('notificationsBtn');
const notificationsDropdown = document.getElementById('notificationsDropdown');
const notifBadge = document.getElementById('notifBadge');

function renderNotifications() {
    const emptyStateHtml = criarHtmlNotificacaoVazia();
    if (!g.transactions || g.transactions.length === 0) {
        notificationsDropdown.innerHTML = emptyStateHtml;
        notifBadge.style.display = 'none';
        return;
    }
    const hojeLocal = getTodayISO();
    let html = '';
    let count = 0;
    const pendentes = g.transactions.filter(t => !t.isPaid && t.type !== 'transfer');
    pendentes.sort((a, b) => new Date(a.date) - new Date(b.date));
    pendentes.forEach(t => {
        const title = t.description ? t.description : '(Sem descrição)';
        const isIncome = t.type === 'income';
        if (t.date < hojeLocal) {
            const textLabel = isIncome ? 'Recebimento Atrasado' : 'Despesa Vencida';
            html += criarHtmlItemNotificacao(t.id, title, `${textLabel} em ${formatDate(t.date)}`, 'error_outline', 'overdue', '#d93025');
            count++;
        } else if (t.date === hojeLocal) {
            const textLabel = isIncome ? 'A Receber Hoje' : 'Vence Hoje';
            html += criarHtmlItemNotificacao(t.id, title, textLabel, 'schedule', 'today', '#e67e22');
            count++;
        }
    });
    if (count === 0) {
        notificationsDropdown.innerHTML = emptyStateHtml;
        notifBadge.style.display = 'none';
    } else {
        notificationsDropdown.innerHTML = `<div style="padding: 12px 16px 4px 16px; font-size: 0.85rem; font-weight: 600; color: #5f6368; text-transform: uppercase; letter-spacing: 0.5px;">Pendências</div>` + html;
        notifBadge.style.display = 'flex';
        notifBadge.textContent = count > 9 ? '9+' : count;
    }
}

export { renderNotifications, notificationsBtn, notificationsDropdown, notifBadge };
