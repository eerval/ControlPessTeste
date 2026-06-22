const CORES = {
    verde: '#188038',
    vermelho: '#d93025',
    azul: '#1a73e8',
    laranja: '#e67e22',
    cinza: '#5f6368',
    borda: '#e8eaed',
    verdeDark: '#81c995',
    vermelhoDark: '#ff8a80',
};

const LIMITES = {
    MIN_SENHA: 6,
    MAX_PARCELAS: 24,
    MESES_DASHBOARD: 6,
    MAX_ITENS_PDF: 400,
    MAX_RECENTES_DASHBOARD: 3,
    MAX_NAO_PAGOS_DASHBOARD: 3,
    IDLE_TIMEOUT_MIN: 30,
    MAX_AVATAR_BYTES: 1024 * 1024,
    MIN_BUSCA_CHARS: 2,
};

function formatDateISO(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getTodayISO() {
    return formatDateISO(new Date());
}

function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeJsAttr(str) {
    if (str == null) return '';
    return JSON.stringify(String(str)).slice(1, -1);
}

function sanitizeFirestoreData(data) {
    if (!data || typeof data !== 'object') return data;
    const blocked = ['__proto__', 'constructor', 'prototype'];
    return Object.fromEntries(
        Object.entries(data).filter(([key]) => !blocked.includes(key))
    );
}

function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR');
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function trendBadge(curr, prev, invertColors = false) {
    if (prev === 0) return '<span class="kpi-badge neutral" title="Sem dados no mês anterior">—</span>';
    const pct = Math.round(((curr - prev) / Math.abs(prev)) * 100);
    const up = pct >= 0;
    const badgeClass = invertColors ? (up ? 'down' : 'up') : (up ? 'up' : 'down');
    const icon = up ? 'arrow_upward' : 'arrow_downward';
    return `<span class="kpi-badge ${badgeClass}" style="cursor: help;" title="Variação em relação ao mês passado"><span class="material-icons-outlined" style="font-size:12px;margin-right:4px;">${icon}</span>${Math.abs(pct)}%</span>`;
}

function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getPreviousMonth() {
    const now = new Date();
    if (now.getMonth() === 0) {
        return `${now.getFullYear() - 1}-12`;
    } else {
        return `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
    }
}

function filterTransactionsByMonth(monthStr) {
    return (window.__transactions || []).filter(t => t.date.startsWith(monthStr));
}

function calculateTotals(txns) {
    let income = 0, expense = 0, transfer = 0;
    txns.forEach(t => {
        if (t.type === 'income') income += t.value;
        else if (t.type === 'expense') expense += t.value;
        else if (t.type === 'transfer') transfer += t.value;
    });
    return { income, expense, transfer, balance: income - expense };
}

function calcDueDate(transDateStr, closingDay, dueDay) {
    const cDay = parseInt(closingDay) || 1;
    const dDay = parseInt(dueDay) || 10;
    const tDate = new Date(transDateStr + 'T12:00:00');
    let m = tDate.getMonth(), y = tDate.getFullYear(), d = tDate.getDate();
    if (d >= cDay) { m++; if (m > 11) { m = 0; y++; } }
    if (dDay < cDay) { m++; if (m > 11) { m = 0; y++; } }
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(dDay).padStart(2, '0')}`;
}

function formatarMoeda(valor) {
    if (typeof valor === 'string') valor = parseFloat(valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function valorParaNumero(valorFormatado) {
    if (typeof valorFormatado === 'number') return valorFormatado;
    const limpo = valorFormatado.replace(/[R$\s.]/g, '').replace(',', '.');
    return parseFloat(limpo) || 0;
}

function formatDateHeader(dateStr) {
    const txDate = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    today.setHours(0,0,0,0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (txDate.getTime() === today.getTime()) return "Hoje";
    if (txDate.getTime() === yesterday.getTime()) return "Ontem";
    const options = { day: 'numeric', month: 'long' };
    return txDate.toLocaleDateString('pt-BR', options);
}

function createGradient(ctx, color1, color2) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
}

function getCategoryNameById(categoryId) {
    if (!categoryId) return null;
    const cat = (window.__categories || []).find(c => c.id === categoryId);
    return cat ? cat.name : null;
}

function getPaymentTypeNameById(paymentId) {
    if (!paymentId) return null;
    const pt = (window.__paymentTypes || []).find(p => p.id === paymentId);
    return pt ? pt.description : null;
}

async function fetchAddressByCep(cep) {
    cep = cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
            document.getElementById('partnerStreet').value = data.logradouro || '';
            document.getElementById('partnerNeighborhood').value = data.bairro || '';
            document.getElementById('partnerCity').value = data.localidade || '';
            document.getElementById('partnerState').value = data.uf || '';
        }
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
    }
}

function generateRecurrentDates(startDate, freq, interval, terminoTipo, terminoValue) {
    const dates = [];
    let current = new Date(startDate + 'T12:00:00');
    let count = 0;
    const maxCount = terminoTipo === 'count' ? parseInt(terminoValue) || 12 : 365;
    const endDate = terminoTipo === 'data' ? new Date(terminoValue + 'T12:00:00') : null;

    while (count < maxCount) {
        if (terminoTipo === 'data' && current > endDate) break;
        dates.push(formatDateISO(current));
        count++;
        if (freq === 'semanal') current.setDate(current.getDate() + 7 * interval);
        else if (freq === 'mensal') current.setMonth(current.getMonth() + interval);
        else if (freq === 'anual') current.setFullYear(current.getFullYear() + interval);
        if (terminoTipo === 'nunca' && count >= 365) break;
    }
    return dates;
}

function getRecurrenceText() {
    const freq = document.getElementById('recFrequencia')?.value;
    const interval = parseInt(document.getElementById('recIntervalo')?.value) || 1;
    const terminoTipo = document.getElementById('terminoTipo')?.value;
    if (!freq) return '';
    let text = `A cada ${interval > 1 ? interval + ' ' : ''}`;
    const map = { semanal: 'semanas', mensal: 'meses', anual: 'anos' };
    text += interval > 1 ? map[freq] : freq.replace('al', '');
    if (terminoTipo === 'count') {
        const c = document.getElementById('terminoCount')?.value;
        text += ` · ${c} repetições`;
    } else if (terminoTipo === 'data') {
        const d = document.getElementById('terminoData')?.value;
        if (d) text += ` · até ${formatDate(d)}`;
    }
    return text;
}

function applyDocMask(e) {
    let value = e.target.value.replace(/\D/g, '');
    const type = document.getElementById('partnerType')?.value;
    if (type === 'Jurídica') {
        if (value.length <= 14) {
            value = value.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
        }
    } else {
        if (value.length <= 11) {
            value = value.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
        }
    }
    e.target.value = value;
}

function updateDocLabel() {
    const type = document.getElementById('partnerType')?.value;
    const label = document.getElementById('docLabel');
    if (label) label.textContent = type === 'Jurídica' ? 'CNPJ' : 'CPF/CNPJ';
}

export {
    CORES, LIMITES,
    formatDateISO, getTodayISO,
    escapeHtml, escapeJsAttr, sanitizeFirestoreData,
    formatCurrency, formatDate,
    delay, trendBadge,
    getCurrentMonth, getPreviousMonth,
    filterTransactionsByMonth, calculateTotals,
    calcDueDate,
    formatarMoeda, valorParaNumero,
    formatDateHeader,
    createGradient,
    getCategoryNameById, getPaymentTypeNameById,
    fetchAddressByCep,
    generateRecurrentDates,
    getRecurrenceText,
    applyDocMask, updateDocLabel
};
