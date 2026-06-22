import { g, currentPeriod, currentView, currentUser, userRef } from './state.js';
import { formatCurrency, formatDate, formatDateISO, getTodayISO, getCurrentMonth, createGradient, getCategoryNameById, trendBadge, escapeJsAttr } from './utils.js';
import { criarHtmlItemDashboard } from './factories.js';
import { showToast, askConfirmation } from './ui-helpers.js';
import { processAccountBalance } from './db.js';
import { updatePrivacyMode } from './theme.js';
import { getBankLogoHtml, getBrandLogoHtml } from './accounts.js';

let monthlyEarningsChart = null;

window.currentDashboardCardIndex = 0;
window.currentDonutViewIndex = 0;

function buildCardCarousel() {
    const cards = [];
    (g.accounts || []).filter(a => a.active !== false && a.cards && a.cards.length > 0).forEach(acc => {
        acc.cards.forEach(c => {
            cards.push({ ...c, accountId: acc.id, bankLabel: acc.bankName || acc.name });
        });
    });
    cards.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
    if (window.currentDashboardCardIndex >= cards.length || !window.currentDashboardCardIndex) {
        window.currentDashboardCardIndex = 0;
    }
    const displayCard = cards[window.currentDashboardCardIndex] || null;
    let nextCard = null;
    if (cards.length > 1) {
        const nextIndex = (window.currentDashboardCardIndex + 1) % cards.length;
        nextCard = cards[nextIndex];
    }
    const isDarkMode = document.body.classList.contains('dark-mode');
    let cardArrowsHtml = '', cardDotsHtml = '';
    if (cards.length > 1) {
        const arrowBg = isDarkMode ? 'rgba(42,42,58,0.95)' : 'rgba(255,255,255,0.95)';
        const arrowBorder = isDarkMode ? 'var(--cor-borda-dark)' : '#e8eaed';
        const arrowColor = isDarkMode ? '#e0e0e0' : '#5f6368';
        cardArrowsHtml = `
            <button onclick="mudarCartaoDashboard(-1, event)" style="position:absolute; left:-18px; top:50%; transform:translateY(-50%); z-index:10; background:${arrowBg}; border:1px solid ${arrowBorder}; color:${arrowColor}; border-radius:50%; width:36px; height:36px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.2s;"><span class="material-icons" style="font-size: 1.4rem;">chevron_left</span></button>
            <button onclick="mudarCartaoDashboard(1, event)" style="position:absolute; right:-18px; top:50%; transform:translateY(-50%); z-index:10; background:${arrowBg}; border:1px solid ${arrowBorder}; color:${arrowColor}; border-radius:50%; width:36px; height:36px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.2s;"><span class="material-icons" style="font-size: 1.4rem;">chevron_right</span></button>
        `;
        const dotInactive = isDarkMode ? 'var(--cor-borda-dark)' : '#dadce0';
        cardDotsHtml = `
            <div style="display:flex; justify-content:center; gap:6px; margin-top: 16px;">
                ${cards.map((_, i) => `<div style="width:6px; height:6px; border-radius:50%; background: ${i === window.currentDashboardCardIndex ? '#1a73e8' : dotInactive}; transition: background 0.3s;"></div>`).join('')}
            </div>
        `;
    }
    window.allDashboardCards = cards;
    return { displayCard, nextCard, cardArrowsHtml, cardDotsHtml, isDarkMode };
}

function renderCashFlowChart(isDark) {
    const monthNamesShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    let labels = [];
    let incomeData = [];
    let expenseData = [];
    let currentMonthIncome = 0;
    let currentMonthExpense = 0;

    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        labels.push(monthNamesShort[d.getMonth()]);

        const txs = (g.transactions || []).filter(t => t.date.startsWith(monthStr) && t.isPaid && t.type !== 'transfer');
        const inc = txs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.value, 0);
        const exp = txs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.value, 0);

        incomeData.push(inc);
        expenseData.push(exp);

        if (i === 0) {
            currentMonthIncome = inc;
            currentMonthExpense = exp;
        }
    }

    document.getElementById('chartTotalIncome').textContent = '+ ' + formatCurrency(currentMonthIncome);
    document.getElementById('chartTotalExpense').textContent = '- ' + formatCurrency(currentMonthExpense);

    const ctxBar = document.getElementById('monthlyEarningsChart').getContext('2d');
    if (monthlyEarningsChart) monthlyEarningsChart.destroy();

    const incColor  = isDark ? '#34d399' : '#10b981';
    const expColor  = isDark ? '#fb7185' : '#f43f5e';
    const incColorT = isDark ? 'rgba(52,211,153,0.15)'  : 'rgba(16,185,129,0.15)';
    const expColorT = isDark ? 'rgba(251,113,133,0.15)' : 'rgba(244,63,94,0.15)';

    monthlyEarningsChart = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Entradas',
                    data: incomeData,
                    backgroundColor: incColorT,
                    borderColor: incColor,
                    borderWidth: 1.5,
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.55,
                    categoryPercentage: 0.7
                },
                {
                    label: 'Saídas',
                    data: expenseData,
                    backgroundColor: expColorT,
                    borderColor: expColor,
                    borderWidth: 1.5,
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.55,
                    categoryPercentage: 0.7
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? 'var(--cor-superficie-dark)' : '#0f172a',
                    titleColor: '#f1f5f9',
                    bodyColor: '#f1f5f9',
                    padding: 12,
                    cornerRadius: 12,
                    callbacks: {
                        label: function(context) {
                            const prefix = context.dataset.label === 'Entradas' ? '+ R$ ' : '- R$ ';
                            return ' ' + context.dataset.label + ': ' + prefix + context.raw.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: {
                        color: isDark ? '#64748b' : '#94a3b8',
                        font: { weight: '600', family: "'Inter', 'Google Sans', sans-serif" }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                        drawBorder: false,
                        borderDash: [6, 6]
                    },
                    ticks: { display: false }
                }
            }
        }
    });
}

function renderDonutChart(monthExpenses, isDark) {
    const paidMonthExpensesForCat = monthExpenses.filter(t => t.isPaid);

    let donutLabels = [];
    let donutData = [];
    let donutColors = [];
    let isEmpty = false;

    if (window.currentDonutViewIndex === 0) {
        const categoryTotals = {};
        paidMonthExpensesForCat.forEach(t => {
            const catId = t.category || 'outros';
            categoryTotals[catId] = (categoryTotals[catId] || 0) + t.value;
        });
        const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

        if (sortedCategories.length === 0) { isEmpty = true; }
        else {
            sortedCategories.forEach(([catId, value]) => {
                const cat = g.categories.find(c => c.id === catId);
                donutLabels.push(cat ? cat.name : 'Outros');
                donutData.push(value);
                donutColors.push(cat ? (cat.color || '#9aa0a6') : '#9aa0a6');
            });
        }
    } else {
        const costCenterTotals = {};
        paidMonthExpensesForCat.forEach(t => {
            const cat = g.categories.find(c => c.id === t.category);
            const ccId = cat && cat.costCenter ? cat.costCenter : 'sem_centro';
            costCenterTotals[ccId] = (costCenterTotals[ccId] || 0) + t.value;
        });
        const sortedCCs = Object.entries(costCenterTotals).sort((a, b) => b[1] - a[1]);

        if (sortedCCs.length === 0) { isEmpty = true; }
        else {
            sortedCCs.forEach(([ccId, value]) => {
                const cc = g.costCenters.find(c => c.id === ccId);
                donutLabels.push(cc ? cc.description : 'Sem Centro');
                donutData.push(value);
                donutColors.push(cc ? (cc.color || '#1a73e8') : '#9aa0a6');
            });
        }
    }

    if (isEmpty) {
        donutLabels.push('Sem despesas');
        donutData.push(1);
        donutColors.push(isDark ? 'var(--cor-borda-dark)' : '#e8eaed');
    }

    const ctxDonut = document.getElementById('dynamicDonutChart').getContext('2d');
    if (window.dynamicDonutChartInstance) window.dynamicDonutChartInstance.destroy();

    window.dynamicDonutChartInstance = new Chart(ctxDonut, {
        type: 'doughnut',
        data: {
            labels: donutLabels,
            datasets: [{
                data: donutData,
                backgroundColor: donutColors,
                borderWidth: isEmpty ? 0 : 3,
                borderColor: isDark ? 'var(--cor-superficie-dark)' : '#ffffff',
                hoverOffset: 6
            }]
        },
        options: {
            cutout: '78%',
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { left: 20, right: 20, top: 10, bottom: 10 } },
            plugins: {
                legend: {
                    display: !isEmpty,
                    position: 'right',
                    labels: {
                        color: isDark ? '#94a3b8' : '#64748b',
                        usePointStyle: true,
                        padding: 16,
                        font: {
                            size: 11,
                            weight: '500',
                            family: "'Inter', 'Google Sans', sans-serif"
                        }
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? 'var(--cor-superficie-dark)' : '#0f172a',
                    titleColor: '#f1f5f9',
                    bodyColor: '#f1f5f9',
                    padding: 12,
                    cornerRadius: 12,
                    callbacks: {
                        label: function(context) {
                            if (isEmpty) return ' Sem despesas no mês';
                            return ' R$ ' + context.raw.toLocaleString('pt-BR', {minimumFractionDigits: 2});
                        }
                    }
                }
            }
        }
    });
}

function renderDashboard() {
    const container = document.getElementById('kpiContainer');

    const { displayCard, nextCard, cardArrowsHtml, cardDotsHtml, isDarkMode } = buildCardCarousel();

    let formatBankName = displayCard ? (displayCard.bankLabel || 'Cartão') : 'Sem Cartão';
    if (formatBankName.length > 18) formatBankName = formatBankName.substring(0, 18) + '...';

    const nowDash = new Date();
    const currentMonthStr = `${nowDash.getFullYear()}-${String(nowDash.getMonth() + 1).padStart(2, '0')}`;

    const monthExpenses = (g.transactions || []).filter(t => t.type === 'expense' && t.date.startsWith(currentMonthStr));
    const totalExpensesCount = monthExpenses.length;
    const paidExpensesCount = monthExpenses.filter(t => t.isPaid).length;
    const unpaidExpensesCount = totalExpensesCount - paidExpensesCount;

    const totalExpensesValue = monthExpenses.reduce((a, t) => a + t.value, 0);
    const paidExpensesValue = monthExpenses.filter(t => t.isPaid).reduce((a, t) => a + t.value, 0);
    const unpaidExpensesValue = totalExpensesValue - paidExpensesValue;
    const expensesProgressPct = totalExpensesValue > 0 ? Math.round((paidExpensesValue / totalExpensesValue) * 100) : 0;

    const monthIncomes = (g.transactions || []).filter(t => t.type === 'income' && t.date.startsWith(currentMonthStr));

    const totalIncomesCount = monthIncomes.length;
    const paidIncomesCount = monthIncomes.filter(t => t.isPaid).length;
    const unpaidIncomesCount = totalIncomesCount - paidIncomesCount;

    const totalIncomesValue = monthIncomes.reduce((a, t) => a + t.value, 0);
    const paidIncomesValue = monthIncomes.filter(t => t.isPaid).reduce((a, t) => a + t.value, 0);
    const unpaidIncomesValue = totalIncomesValue - paidIncomesValue;
    const incomesProgressPct = totalIncomesValue > 0 ? Math.round((paidIncomesValue / totalIncomesValue) * 100) : 0;

    const dashMonthIncome = monthIncomes.filter(t => t.isPaid).reduce((acc, t) => acc + t.value, 0);
    const dashMonthExpense = monthExpenses.filter(t => t.isPaid).reduce((acc, t) => acc + t.value, 0);

    const dashTotalBalance = (g.accounts || []).filter(a => a.includeInKPI !== false && a.active !== false).reduce((acc, a) => acc + (a.balance || 0), 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const recentTransactions = [...(g.transactions || [])]
        .filter(t => t.date <= todayStr)
        .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
        .slice(0, 3);

    let recentTxsHtml = '';
    if (recentTransactions.length === 0) {
        recentTxsHtml = '<div style="padding: 1.5rem 0; color: #64748b; text-align: center; font-size: 0.9rem;">Nenhum lançamento recente</div>';
    } else {
        recentTransactions.forEach(t => {
            let icon = 'swap_horiz'; let sign = ''; let valClass = 'expense';
            if (t.type === 'income') { icon = 'attach_money'; sign = '+ '; valClass = 'income'; }
            else if (t.type === 'expense') { icon = 'shopping_bag'; sign = '- '; valClass = 'expense'; }

            const title = t.description ? t.description : '(Sem descrição)';
            const iconClass = t.type === 'income' ? 'income-icon' : t.type === 'expense' ? 'expense-icon' : 'transfer-icon';

            recentTxsHtml += criarHtmlItemDashboard(t.id, title, formatDate(t.date), icon, iconClass, valClass, sign, formatCurrency(t.value), 'Editar');
        });
    }

    const unpaidTransactions = (g.transactions || [])
        .filter(t => !t.isPaid && t.type === 'expense' && t.date.startsWith(currentMonthStr))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 3);

    let unpaidTxsHtml = '';
    if (unpaidTransactions.length === 0) {
        unpaidTxsHtml = `
            <div class="ios-empty-state" style="text-align: center; padding: 2rem 0 1rem 0;">
                <div class="ios-icon-circle">
                    <span class="material-icons">check</span>
                </div>
                <h4 class="ios-title">Contas em dia</h4>
                <p class="ios-subtitle">Nenhuma despesa pendente</p>
            </div>
        `;
    } else {
        unpaidTransactions.forEach(t => {
            const title = t.description ? t.description : '(Sem descrição)';
            unpaidTxsHtml += criarHtmlItemDashboard(t.id, title, formatDate(t.date), 'bolt', 'expense-icon', 'expense', '- ', formatCurrency(t.value), 'Pagar');
        });
    }

    const isDark = isDarkMode;

    const dashAccounts = g.accounts.filter(a => a.showOnDashboard !== false && a.active !== false).sort((a,b) => b.balance - a.balance);
    let accountsListHtml = '';
    if (dashAccounts.length === 0) {
        accountsListHtml = '<div style="padding: 1.5rem 0; color: #64748b; text-align: center; font-size: 0.9rem;">Nenhuma conta no dashboard</div>';
    } else {
        dashAccounts.forEach(acc => {
            const balColor = acc.balance < 0 ? (isDark ? '#ff8a80' : '#d93025') : (isDark ? '#8ab4f8' : '#1e3c72');
            const logoBg = isDark ? (acc.bankIspb === 'Outros' ? 'var(--cor-superficie-dark)' : 'transparent') : (acc.bankIspb === 'Outros' ? 'white' : 'transparent');
            const logoBorder = isDark ? 'var(--cor-borda-dark)' : '#e8eaed';

            accountsListHtml += `
                <div class="list-item" onclick="setActiveView('accounts')" style="cursor: pointer;">
                    <div class="item-info">
                        <div style="width: 38px; height: 38px; border-radius: 10px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: ${logoBg}; border: 1px solid ${logoBorder}; flex-shrink: 0;">
                            ${getBankLogoHtml(acc.bankName, acc.bankIspb)}
                        </div>
                        <div>
                            <p style="font-weight: 600;">${acc.name}</p>
                            <p style="font-size: 0.8rem; color: #64748b;">${acc.type}</p>
                        </div>
                    </div>
                    <span class="privacy-text-value" style="font-weight: 700; color: ${balColor};">${formatCurrency(acc.balance)}</span>
                </div>
            `;
        });
    }

    const prevMonthDate = new Date(nowDash.getFullYear(), nowDash.getMonth() - 1, 1);
    const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const prevIncome = (g.transactions||[]).filter(t=>t.type==='income'&&t.isPaid&&t.date.startsWith(prevMonthStr)).reduce((a,t)=>a+t.value,0);
    const prevExpense = (g.transactions||[]).filter(t=>t.type==='expense'&&t.isPaid&&t.date.startsWith(prevMonthStr)).reduce((a,t)=>a+t.value,0);

    const monthResult = dashMonthIncome - dashMonthExpense;
    const pastBalance = dashTotalBalance - monthResult;
    const econPct = dashMonthIncome > 0 ? Math.round(((dashMonthIncome - dashMonthExpense) / dashMonthIncome) * 100) : 0;

    let historyBalances = [];
    const nomeMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    for (let i = 0; i < 7; i++) {
        const d = new Date(nowDash.getFullYear(), nowDash.getMonth() - i, 1);
        const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        const txsMes = (g.transactions || []).filter(t => t.date.startsWith(mStr) && t.isPaid && t.type !== 'transfer');
        const incMes = txsMes.filter(t => t.type === 'income').reduce((a, t) => a + t.value, 0);
        const expMes = txsMes.filter(t => t.type === 'expense').reduce((a, t) => a + t.value, 0);

        const resultadoMes = incMes - expMes;
        historyBalances.unshift({ val: resultadoMes, label: nomeMeses[d.getMonth()] });
    }

    const maxBal = Math.max(...historyBalances.map(b => Math.abs(b.val)), 1);
    let dynamicBarsHtml = '';

    historyBalances.forEach((item, index) => {
        const isCurrentMonth = (index === 6);
        let pct = Math.round((Math.abs(item.val) / maxBal) * 100);
        if (pct < 8) pct = 8;

        const activeClass = isCurrentMonth ? 'active' : '';
        const sinal = item.val > 0 ? '+' : '';

        const corNegativa = (item.val < 0 && !isCurrentMonth) ? 'background: rgba(244, 63, 94, 0.4);' : '';

        dynamicBarsHtml += `<div class="dsw-bar ${activeClass}" style="height:${pct}%; ${corNegativa}" title="${item.label}: ${sinal}${formatCurrency(item.val)}"></div>`;
    });

    if (!container) return;
    container.innerHTML = `
        <!-- ① CARTÃO + KPIs -->
        <div class="card-row">

            <!-- Cartão de crédito -->
            <div style="position: relative; display: flex; flex-direction: column; justify-content: center;">
                ${cardArrowsHtml}
                <div style="position: relative; width: 100%; max-width: 280px; margin: 0 auto; padding-bottom: 18px;">

                    ${nextCard ? `
                    <div style="position:absolute; top:24px; left:50%; transform:translateX(-50%) scale(0.91);
                                width:100%; aspect-ratio:1.58/1; border-radius:20px;
                                background: linear-gradient(135deg, ${nextCard.color}, #0f172a);
                                opacity:0.85; z-index:1; pointer-events:none;
                                box-shadow: 0 12px 24px -10px rgba(15,23,42,0.25);"></div>
                    ` : ''}

                    <div class="credit-card card-switch-anim"
                         style="position: relative; z-index: 2; aspect-ratio: 1.58/1; width: 100%;
                                background: ${displayCard ? `linear-gradient(135deg, ${displayCard.color}, #0f172a)` : 'linear-gradient(135deg, #e2e8f0, #f8fafc)'};
                                cursor: ${displayCard ? 'pointer' : 'default'}; overflow: hidden;
                                display: flex; flex-direction: column; justify-content: space-between;
                                border-radius: 20px; padding: 16px;
                                box-shadow: 0 10px 24px -10px ${displayCard ? displayCard.color+'55' : 'rgba(15,23,42,0.12)'}, inset 0 1px 1px rgba(255,255,255,0.2);"
                         ${displayCard ? `onclick="abrirCarteira('${escapeJsAttr(displayCard.accountId)}')"` : ''}>

                        <div style="position:absolute;top:-50%;left:-20%;width:150%;height:150%;background:radial-gradient(ellipse at top left,rgba(255,255,255,0.13) 0%,transparent 65%);pointer-events:none;"></div>
                        <div style="position:absolute;bottom:-30%;right:-10%;width:70%;height:70%;background:radial-gradient(circle,rgba(255,255,255,0.05) 0%,transparent 70%);pointer-events:none;"></div>

                        <div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:2;">
                            ${displayCard ? `
                            <div style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:rgba(255,255,255,0.92);border-radius:8px;padding:3px;box-shadow:0 4px 10px rgba(0,0,0,0.18);">
                                ${getBankLogoHtml(displayCard.bankLabel, displayCard.bankIspb)}
                            </div>` : '<span class="material-icons" style="color:#94a3b8;font-size:1.6rem;">credit_card</span>'}
                            <span style="font-weight:600;font-size:0.66rem;text-transform:uppercase;letter-spacing:1.2px;color:${displayCard?'rgba(255,255,255,0.85)':'#64748b'};text-shadow:${displayCard?'0 1px 3px rgba(0,0,0,0.35)':'none'};">${formatBankName}</span>
                        </div>

                        ${displayCard ? `
                        <div style="display:flex;align-items:center;gap:8px;position:relative;z-index:2;">
                            <div style="width:26px;height:19px;background:linear-gradient(135deg,#e6c27a,#d4af37,#f3e5ab);border-radius:4px;overflow:hidden;box-shadow:inset 0 0 2px rgba(0,0,0,0.5),0 2px 4px rgba(0,0,0,0.2);position:relative;">
                                <div style="position:absolute;top:35%;left:0;right:0;height:1px;background:rgba(0,0,0,0.12);"></div>
                                <div style="position:absolute;top:65%;left:0;right:0;height:1px;background:rgba(0,0,0,0.12);"></div>
                                <div style="position:absolute;top:0;bottom:0;left:35%;width:1px;background:rgba(0,0,0,0.12);"></div>
                                <div style="position:absolute;top:0;bottom:0;right:35%;width:1px;background:rgba(0,0,0,0.12);"></div>
                            </div>
                            <span class="material-icons" style="color:rgba(255,255,255,0.75);font-size:1.05rem;transform:rotate(90deg);">wifi_tethering</span>
                        </div>` : ''}

                        <div style="display:flex;justify-content:space-between;align-items:flex-end;position:relative;z-index:2;margin-top:auto;">
                            <div>
                                <span style="font-size:0.95rem;font-family:'Courier New',monospace;letter-spacing:3px;color:${displayCard?'rgba(255,255,255,0.95)':'#64748b'};font-weight:700;text-shadow:${displayCard?'0 2px 6px rgba(0,0,0,0.3)':'none'};">•••• ${displayCard?displayCard.last4:'0000'}</span>
                                <p style="font-size:0.62rem;color:${displayCard?'rgba(255,255,255,0.65)':'#94a3b8'};margin-top:3px;text-transform:uppercase;letter-spacing:1px;font-weight:500;">${displayCard?displayCard.name:'Cadastre em "Contas"'}</p>
                            </div>
                            ${displayCard?`<div style="width:60px;height:40px;display:flex;align-items:center;justify-content:flex-end;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.3));">${getBrandLogoHtml(displayCard.brand)}</div>`:''}
                        </div>
                    </div>
                </div>
                ${cardDotsHtml}
            </div>

            <!-- KPIs — Novo Card Único Consolidado -->
            <div class="dash-summary-widget">
                <div>
                    <div class="dsw-header">
                        <span class="dsw-title">Saldo Total</span>
                        ${trendBadge(dashTotalBalance, pastBalance, false)}
                    </div>
                    <div class="dsw-subtitle">Este mês</div>
                    <div class="dsw-value privacy-text-value">${formatCurrency(dashTotalBalance)}</div>
                </div>

                <div class="dsw-bars">
                    ${dynamicBarsHtml}
                </div>

                <div class="dsw-chips">
                    <div class="dsw-chip">
                        <div class="dsw-chip-label">Receitas</div>
                        <div class="dsw-chip-val green privacy-text-value">+ ${formatCurrency(dashMonthIncome)}</div>
                    </div>
                    <div class="dsw-chip">
                        <div class="dsw-chip-label">Despesas</div>
                        <div class="dsw-chip-val red privacy-text-value">- ${formatCurrency(dashMonthExpense)}</div>
                    </div>
                    <div class="dsw-chip">
                        <div class="dsw-chip-label">Economia</div>
                        <div class="dsw-chip-val privacy-text-value">${econPct}%</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ② GRÁFICOS -->
        <div class="charts-row">
            <!-- Fluxo de Caixa -->
            <div class="chart-card">
                <div class="chart-header">
                    <h3>Fluxo de Caixa</h3>
                    <span class="material-icons-outlined" style="font-size:1.1rem;cursor:pointer;" onclick="setActiveView('transactions')">arrow_forward</span>
                </div>
                <p class="chart-sublabel">Entradas e saídas dos últimos 6 meses</p>
                <div class="chart-totals-inline">
                    <div class="chart-total-item">
                        <span class="ct-label">Entradas</span>
                        <span class="ct-value income-color privacy-text-value" id="chartTotalIncome">+ R$ 0,00</span>
                    </div>
                    <div class="chart-total-item">
                        <span class="ct-label">Saídas</span>
                        <span class="ct-value expense-color privacy-text-value" id="chartTotalExpense">- R$ 0,00</span>
                    </div>
                </div>
                <div class="bar-chart-container" style="height:160px;">
                    <canvas id="monthlyEarningsChart"></canvas>
                </div>
            </div>

            <!-- Donut -->
            <div class="chart-card" style="display:flex;flex-direction:column;position:relative;">
                <div class="chart-header">
                    <h3>${window.currentDonutViewIndex === 0 ? 'Por Categoria' : 'Por Centro de Custo'}</h3>
                    <span class="material-icons-outlined" style="font-size:1rem;color:#6366f1;">${window.currentDonutViewIndex === 0 ? 'category' : 'store'}</span>
                </div>
                <p class="chart-sublabel">Distribuição de despesas do mês</p>
                <button onclick="mudarDonutDashboard(-1, event)" style="position:absolute;left:6px;top:55%;transform:translateY(-50%);z-index:10;background:transparent;border:none;cursor:pointer;display:flex;align-items:center;">
                    <span class="material-icons" style="font-size:1.5rem;color:${isDark?'#e0e0e0':'#94a3b8'};">chevron_left</span>
                </button>
                <button onclick="mudarDonutDashboard(1, event)" style="position:absolute;right:6px;top:55%;transform:translateY(-50%);z-index:10;background:transparent;border:none;cursor:pointer;display:flex;align-items:center;">
                    <span class="material-icons" style="font-size:1.5rem;color:${isDark?'#e0e0e0':'#94a3b8'};">chevron_right</span>
                </button>
                <div style="position:relative;flex:1;height:190px;display:flex;align-items:center;justify-content:center;">
                    <canvas id="dynamicDonutChart"></canvas>
                </div>
                <div style="display:flex;justify-content:center;gap:5px;margin-top:8px;">
                    <div style="width:5px;height:5px;border-radius:50%;background:${window.currentDonutViewIndex===0?'#6366f1':(isDark?'#334155':'#e2e8f0')};transition:background 0.3s;"></div>
                    <div style="width:5px;height:5px;border-radius:50%;background:${window.currentDonutViewIndex===1?'#6366f1':(isDark?'#334155':'#e2e8f0')};transition:background 0.3s;"></div>
                </div>
            </div>
        </div>

        <!-- ③ CONTAS A PAGAR / RECEBER -->
        <div class="lists-row" style="margin-bottom:1.25rem;">
            <div class="payable-card">
                <div class="payable-header">
                    <div class="payable-header-title">
                        <div class="icon-box" style="background: ${isDark ? 'rgba(244,63,94,0.15)' : '#fff1f2'}; color: ${isDark ? '#fb7185' : '#f43f5e'};">
                            <span class="material-icons-outlined" style="font-size: 1.2rem;">arrow_downward</span>
                        </div>
                        <h3>A Pagar</h3>
                    </div>
                    <span>Este mês</span>
                </div>
                <div class="payable-content">
                    <span class="pm-label">Falta Pagar (${unpaidExpensesCount})</span>
                    <div class="pm-val privacy-text-value" style="color: ${unpaidExpensesValue > 0 ? (isDark ? '#fb7185' : '#f43f5e') : (isDark ? '#f1f5f9' : '#0f172a')};">
                        ${formatCurrency(unpaidExpensesValue)}
                    </div>
                </div>
                <div class="payable-footer">
                    <div class="payable-footer-meta">
                        <span>Pago: <span class="privacy-text-value">${formatCurrency(paidExpensesValue)}</span></span>
                        <span>${expensesProgressPct}%</span>
                    </div>
                    <div class="payable-bar">
                        <div class="payable-bar-fill" style="width:${expensesProgressPct}%; background: ${isDark ? '#34d399' : '#10b981'};"></div>
                    </div>
                </div>
            </div>

            <div class="payable-card">
                <div class="payable-header">
                    <div class="payable-header-title">
                        <div class="icon-box" style="background: ${isDark ? 'rgba(99,102,241,0.15)' : '#eff6ff'}; color: ${isDark ? '#818cf8' : '#6366f1'};">
                            <span class="material-icons-outlined" style="font-size: 1.2rem;">arrow_upward</span>
                        </div>
                        <h3>A Receber</h3>
                    </div>
                    <span>Este mês</span>
                </div>
                <div class="payable-content">
                    <span class="pm-label">Falta Receber (${unpaidIncomesCount})</span>
                    <div class="pm-val privacy-text-value" style="color: ${isDark ? '#818cf8' : '#6366f1'};">
                        ${formatCurrency(unpaidIncomesValue)}
                    </div>
                </div>
                <div class="payable-footer">
                    <div class="payable-footer-meta">
                        <span>Recebido: <span class="privacy-text-value">${formatCurrency(paidIncomesValue)}</span></span>
                        <span>${incomesProgressPct}%</span>
                    </div>
                    <div class="payable-bar">
                        <div class="payable-bar-fill" style="width:${incomesProgressPct}%; background: ${isDark ? '#818cf8' : '#6366f1'};"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ④ LANÇAMENTOS RECENTES + A PAGAR -->
        <div class="lists-row" style="margin-bottom:1.25rem;">
            <div class="list-card">
                <div class="list-header">
                    <h3>Lançamentos Recentes</h3>
                    <button class="list-header-action" onclick="setActiveView('transactions')">Ver todos →</button>
                </div>
                ${recentTxsHtml}
            </div>
            <div class="list-card">
                <div class="list-header">
                    <h3>Próximos Vencimentos</h3>
                    <button class="list-header-action" onclick="setActiveView('transactions')">Ver todos →</button>
                </div>
                ${unpaidTxsHtml}
            </div>
        </div>

        <!-- ⑤ SALDO POR CONTA + GANHOS -->
        <div class="lists-row" style="align-items:flex-start;margin-bottom:2rem;">
            <div class="list-card" style="display:flex;flex-direction:column;">
                <div class="list-header">
                    <h3>Saldo por Conta</h3>
                    <button class="list-header-action" onclick="setActiveView('accounts')">Gerenciar →</button>
                </div>
                <div style="display:flex;flex-direction:column;gap:2px;">
                    ${accountsListHtml}
                </div>
            </div>
            <div class="list-card" style="display:flex;flex-direction:column;gap:0;">
                <div class="list-header">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <h3>Resultado do Mês</h3>
                        <span class="material-icons-outlined" style="font-size:14px;color:#94a3b8;cursor:help;" title="Regime de Caixa: receitas recebidas menos despesas pagas.">info</span>
                    </div>
                </div>

                ${(() => {
                    const resultado = dashMonthIncome - dashMonthExpense;
                    const isPositivo = resultado >= 0;
                    const economiaPct = dashMonthIncome > 0 ? Math.round((resultado / dashMonthIncome) * 100) : 0;
                    const corPrincipal = isPositivo
                        ? (isDark ? '#34d399' : '#059669')
                        : (isDark ? '#fb7185' : '#e11d48');
                    const corFundo = isPositivo
                        ? (isDark ? 'rgba(52,211,153,0.08)' : 'rgba(5,150,105,0.06)')
                        : (isDark ? 'rgba(251,113,133,0.08)' : 'rgba(225,29,72,0.06)');
                    const icone = isPositivo ? 'trending_up' : 'trending_down';
                    const label = isPositivo ? 'Saldo positivo' : 'Saldo negativo';

                    return `
                    <div style="background:${corFundo};border-radius:16px;padding:20px;margin-bottom:14px;display:flex;flex-direction:column;gap:6px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span class="material-icons" style="font-size:1.3rem;color:${corPrincipal};">${icone}</span>
                            <span style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${corPrincipal};">${label}</span>
                        </div>
                        <div class="privacy-text-value" style="font-size:2rem;font-weight:800;letter-spacing:-0.04em;color:${corPrincipal};line-height:1;">
                            ${isPositivo ? '+' : ''}${formatCurrency(resultado)}
                        </div>
                        <div style="font-size:0.8rem;color:${isDark ? '#475569' : '#94a3b8'};font-weight:500;">
                            receitas recebidas menos despesas pagas
                        </div>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <div style="background:${isDark ? 'var(--cor-superficie-dark)' : '#f8fafc'};border-radius:12px;padding:14px;">
                            <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${isDark ? '#475569' : '#94a3b8'};margin-bottom:6px;">Receitas</div>
                            <div class="privacy-text-value" style="font-size:1.1rem;font-weight:800;color:${isDark ? '#34d399' : '#059669'};letter-spacing:-0.03em;">+${formatCurrency(dashMonthIncome)}</div>
                        </div>
                        <div style="background:${isDark ? 'var(--cor-superficie-dark)' : '#f8fafc'};border-radius:12px;padding:14px;">
                            <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${isDark ? '#475569' : '#94a3b8'};margin-bottom:6px;">Despesas</div>
                            <div class="privacy-text-value" style="font-size:1.1rem;font-weight:800;color:${isDark ? '#fb7185' : '#e11d48'};letter-spacing:-0.03em;">-${formatCurrency(dashMonthExpense)}</div>
                        </div>
                        <div style="background:${isDark ? 'var(--cor-superficie-dark)' : '#f8fafc'};border-radius:12px;padding:14px;">
                            <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${isDark ? '#475569' : '#94a3b8'};margin-bottom:6px;">Economia</div>
                            <div class="privacy-text-value" style="font-size:1.1rem;font-weight:800;color:${isDark ? '#f1f5f9' : '#0f172a'};letter-spacing:-0.03em;">${economiaPct}%</div>
                        </div>
                        <div style="background:${isDark ? 'var(--cor-superficie-dark)' : '#f8fafc'};border-radius:12px;padding:14px;">
                            <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${isDark ? '#475569' : '#94a3b8'};margin-bottom:6px;">Situação</div>
                            <div style="font-size:0.85rem;font-weight:700;color:${corPrincipal};">${isPositivo ? '✓ No azul' : '✗ No vermelho'}</div>
                        </div>
                    </div>
                    `;
                })()}
            </div>
        </div>
    `;

    renderCashFlowChart(isDark);

    renderDonutChart(monthExpenses, isDark);

    updatePrivacyMode();
}

window.mudarCartaoDashboard = function(direction, event) {
    if (event) event.stopPropagation();

    window.currentDashboardCardIndex += direction;

    if (window.currentDashboardCardIndex >= window.allDashboardCards.length) {
        window.currentDashboardCardIndex = 0;
    }
    if (window.currentDashboardCardIndex < 0) {
        window.currentDashboardCardIndex = window.allDashboardCards.length - 1;
    }

    renderDashboard();
};

window.mudarDonutDashboard = function(direction, event) {
    if (event) event.stopPropagation();
    window.currentDonutViewIndex += direction;

    if (window.currentDonutViewIndex > 1) window.currentDonutViewIndex = 0;
    if (window.currentDonutViewIndex < 0) window.currentDonutViewIndex = 1;

    renderDashboard();
};

export { renderDashboard };
