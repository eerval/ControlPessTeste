import { auth, db } from './firebase-config.js';
import { currentUser, g, userRef,
  currentPeriod, currentType, currentStatus, currentView,
  currentPartner, customStartDate, customEndDate, previousPeriod,
  editingTransactionId, setEditingTransactionId, currentRStep, receiptEligibleTxs,
  currentBStep, billingEligibleTxs,
  setCurrentRStep, setReceiptEligibleTxs, setCurrentBStep, setBillingEligibleTxs,
  setCurrentPeriod, setCurrentStatus, setCurrentType, setCurrentPartner,
  setPreviousPeriod, setCustomStartDate, setCustomEndDate,
  deleteTransaction, saveTransaction
} from './state.js';
import {
  escapeHtml, escapeJsAttr, formatCurrency, formatDate,
  formatDateISO, getTodayISO, sanitizeFirestoreData,
  getCategoryNameById, getPaymentTypeNameById,
  formatarMoeda, valorParaNumero, formatDateHeader,
  generateRecurrentDates, getRecurrenceText,
  CORES, LIMITES, trendBadge, calcDueDate
} from './utils.js';
import { criarHtmlItemTransacao, criarHtmlLinhaTabelaPDF, criarHtmlTabelaMesPDF } from './factories.js';
import { showToast, askPaymentDate, askConfirmation, askPixKeySelection } from './ui-helpers.js';
import { processAccountBalance } from './db.js';
import { updatePrivacyMode } from './theme.js';
import { renderNotifications } from './notifications.js';
import { renderDashboard } from './dashboard.js';

let currentStep = 1;
let selectedType = 'expense';

const periodFilterElement = document.getElementById('periodFilter');
const customPeriodModal = document.getElementById('customPeriodModal');
const modalOverlay = document.getElementById('modalOverlay');
const openBtn = document.getElementById('openModalBtn');
const closeBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const stepContents = document.querySelectorAll('.step-content');
const steps = document.querySelectorAll('.step');

const typeExpense = document.getElementById('typeExpense');
const typeIncome = document.getElementById('typeIncome');
const typeTransfer = document.getElementById('typeTransfer');
const valorInput = document.getElementById('valor');
const descricaoInput = document.getElementById('descricao');
const categoriaSelect = document.getElementById('categoria');
const transactionDateInput = document.getElementById('transactionDate');
const dataInput = document.getElementById('data');
const pagamentoSelect = document.getElementById('pagamento');
const transferFields = document.getElementById('transferFields');

const transactionPaid = document.getElementById('transactionPaid');
const paymentStatusLabel = document.getElementById('paymentStatusLabel');
const transactionPartner = document.getElementById('transactionPartner');
const paymentDateInput = document.getElementById('paymentDate');

const recorrenteCheckbox = document.getElementById('recorrenteCheckbox');
const recurrenceFields = document.getElementById('recurrenceFields');
const frequenciaSelect = document.getElementById('frequencia');
const intervaloInput = document.getElementById('intervalo');
const terminoTipoSelect = document.getElementById('terminoTipo');
const terminoDataGroup = document.getElementById('terminoDataGroup');
const terminoCountGroup = document.getElementById('terminoCountGroup');
const terminoDataInput = document.getElementById('terminoData');
const terminoCountInput = document.getElementById('terminoCount');

const receiptIcon = document.getElementById('receiptIcon');
const receiptHeaderIcon = document.getElementById('receiptHeaderIcon');
const receiptTitle = document.getElementById('receiptTitle');
const receiptSubtitle = document.getElementById('receiptSubtitle');
const receiptValor = document.getElementById('receiptValor');
const receiptDescricao = document.getElementById('receiptDescricao');
const receiptCategoria = document.getElementById('receiptCategoria');
const receiptOrigemRow = document.getElementById('receiptOrigemRow');
const receiptDestinoRow = document.getElementById('receiptDestinoRow');
const receiptOrigem = document.getElementById('receiptOrigem');
const receiptDestino = document.getElementById('receiptDestino');
const receiptData = document.getElementById('receiptData');
const receiptPagamento = document.getElementById('receiptPagamento');
const receiptRecorrenciaRow = document.getElementById('receiptRecorrenciaRow');
const receiptRecorrencia = document.getElementById('receiptRecorrencia');
const receiptStatus = document.getElementById('receiptStatus');
const receiptStatusText = document.getElementById('receiptStatusText');
const receiptProtocol = document.getElementById('receiptProtocol');
const contaOrigem = document.getElementById('contaOrigem');
const contaDestino = document.getElementById('contaDestino');

const btnVerParcelas = document.getElementById('btnVerParcelas');
const listaParcelasExtrato = document.getElementById('listaParcelasExtrato');

const receiptGeneratorModal = document.getElementById('receiptGeneratorModal');
const btnOpenReceiptGen = document.getElementById('generateReceiptBtn');
const btnCloseReceiptGen = document.getElementById('closeReceiptGenModal');
const rPrevBtn = document.getElementById('rPrevBtn');
const rNextBtn = document.getElementById('rNextBtn');
const rDownloadBtn = document.getElementById('rDownloadBtn');
const partnerSelect = document.getElementById('receiptPartnerSelect');
const monthSelect = document.getElementById('receiptMonthSelect');
const receiptMonthGroup = document.getElementById('receiptMonthGroup');
const rTxList = document.getElementById('receiptTxList');
const rTotalPreview = document.getElementById('receiptTotalPreview');
const selectAllReceiptTx = document.getElementById('selectAllReceiptTx');

const billingGeneratorModal = document.getElementById('billingGeneratorModal');
const btnOpenBillingGen = document.getElementById('generateBillingBtn');
const btnCloseBillingGen = document.getElementById('closeBillingGenModal');
const bPrevBtn = document.getElementById('bPrevBtn');
const bNextBtn = document.getElementById('bNextBtn');
const bGenerateBtn = document.getElementById('bGenerateBtn');
const bPartnerSelect = document.getElementById('billingPartnerSelect');
const bTxList = document.getElementById('billingTxList');
const bTotalPreview = document.getElementById('billingTotalPreview');
const selectAllBillingTx = document.getElementById('selectAllBillingTx');

const globalSearchInput = document.getElementById('globalSearchInput');
const globalSearchDropdown = document.getElementById('globalSearchDropdown');

const editFinalBtn = document.getElementById('editFinalBtn');
const reversePaymentBtn = document.getElementById('reversePaymentBtn');
const payFinalBtn = document.getElementById('payFinalBtn');
const deleteFinalBtn = document.getElementById('deleteFinalBtn');
const cloneFinalBtn = document.getElementById('cloneFinalBtn');
const newTxFinalBtn = document.getElementById('newTxFinalBtn');
const closeFinalBtn = document.getElementById('closeFinalBtn');
const downloadCobrancaFooterBtn = document.getElementById('downloadCobrancaFooterBtn');
const downloadFooterBtn = document.getElementById('downloadFooterBtn');

function preencherSelectCategorias() {
  const select = document.getElementById('categoria');
  const valorAnterior = select.value;
  select.innerHTML = '<option value="" disabled selected>Selecione</option>';
  g.categories.filter(cat => cat.active !== false && cat.type === selectedType)
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      select.appendChild(option);
    });
  if (valorAnterior) select.value = valorAnterior;
}

function preencherSelectContas() {
  const selects = [
    document.getElementById('contaLancamento'),
    document.getElementById('contaOrigem'),
    document.getElementById('contaDestino')
  ];
  selects.forEach(sel => {
    if (!sel) return;
    const previousValue = sel.value;
    sel.innerHTML = '<option value="" disabled selected>Selecione a conta...</option>';
    g.accounts.filter(a => a.active !== false)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(acc => {
        const opt = document.createElement('option');
        opt.value = acc.id;
        opt.textContent = acc.name + ' (Saldo: ' + formatCurrency(acc.balance) + ')';
        sel.appendChild(opt);
      });
    if (previousValue) sel.value = previousValue;
  });
}

function preencherSelectPagamentos(accountId = null) {
  const select = document.getElementById('pagamento');
  const valorAnterior = select.value;
  if (!accountId) {
    select.innerHTML = '<option value="" disabled selected>Selecione uma conta primeiro...</option>';
    select.disabled = true;
    if (document.getElementById('parcelasCardGroup')) document.getElementById('parcelasCardGroup').style.display = 'none';
    if (document.getElementById('boletoGroupContainer')) document.getElementById('boletoGroupContainer').style.display = 'none';
    if (document.getElementById('boletoFieldGroup')) document.getElementById('boletoFieldGroup').style.display = 'none';
    return;
  }
  select.disabled = false;
  select.innerHTML = '<option value="" disabled selected>Selecione</option>';
  let tiposParaMostrar = g.paymentTypes;
  const contaSelecionada = g.accounts.find(a => a.id === accountId);
  if (contaSelecionada && contaSelecionada.acceptedPaymentTypes) {
    tiposParaMostrar = g.paymentTypes.filter(pt =>
      contaSelecionada.acceptedPaymentTypes.includes(pt.id)
    );
  }
  tiposParaMostrar.sort((a, b) => a.description.localeCompare(b.description)).forEach(pt => {
    const option = document.createElement('option');
    option.value = pt.id;
    option.textContent = pt.description;
    select.appendChild(option);
  });
  if (valorAnterior && tiposParaMostrar.some(pt => pt.id === valorAnterior)) {
    select.value = valorAnterior;
  }
}

async function fetchCategories() {
  if (!currentUser) return;
  const snapshot = await db.collection('users').doc(currentUser.uid).collection('categories').get();
  g.categories = snapshot.docs.map(doc => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
}

async function fetchPaymentTypes() {
  if (!currentUser) return;
  const snapshot = await db.collection('users').doc(currentUser.uid).collection('paymentTypes').get();
  g.paymentTypes = snapshot.docs.map(doc => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
}

async function loadPartners() {
  if (!currentUser) return;
  const snapshot = await userRef('partners').get();
  g.partners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function loadAccounts() {
  if (!currentUser) return;
  const snapshot = await userRef('accounts').get();
  g.accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function verificarFormasPagamentoConta(selectElement) {
  const accId = selectElement.value;
  if (!accId) return;
  const acc = g.accounts.find(a => a.id === accId);
  if (acc && (!acc.acceptedPaymentTypes || acc.acceptedPaymentTypes.length === 0)) {
    const irParaConfig = await askConfirmation(
      'Conta Incompleta',
      'A conta "' + acc.name + '" não possui formas de pagamento associadas (Ex: Pix, Dinheiro, Cartão). Configure isso para poder utilizá-la em lançamentos.',
      'Configurar Conta',
      false,
      'settings'
    );
    if (irParaConfig) {
      modalOverlay.style.display = 'none';
      resetToStep1();
      setActiveView('accounts');
      await new Promise(r => setTimeout(r, 300));
      if (typeof openAccountModal === 'function') openAccountModal(accId);
      await new Promise(r => setTimeout(r, 400));
      const container = document.getElementById('accountPaymentTypesContainer');
      if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        container.style.transition = 'all 0.3s ease';
        container.style.background = 'rgba(26,115,232,0.05)';
        container.style.boxShadow = '0 0 0 4px rgba(26,115,232,0.3)';
        container.style.borderRadius = '16px';
        container.style.padding = '12px';
        await new Promise(r => setTimeout(r, 3000));
        container.style.boxShadow = '';
        container.style.background = '';
        container.style.padding = '';
      }
    } else {
      selectElement.value = '';
      preencherSelectPagamentos(null);
    }
  }
}

function gerarPayloadPix(chaveOrig, nome, tipoChave = '') {
  const nomeLimpo = nome ? nome.trim().substring(0, 25) : 'Pagamento';
  let chave = chaveOrig ? chaveOrig.trim() : '';
  if (!chave) return '';
  if (tipoChave && tipoChave.toLowerCase() === 'documento') chave = chave.replace(/\D/g, '');
  const nomeMerchant = nomeLimpo;
  const cidade = 'Brasil';
  const txId = '***';
  const payload = '00020126' + (String(14 + nomeMerchant.length).padStart(2, '0')) + '0014BR.GOV.BCB.PIX01' + (String(4 + chave.length).padStart(2, '0')) + chave + '52040000530398654' + '5802BR59' + (String(2 + nomeMerchant.length).padStart(2, '0')) + nomeMerchant + '6008' + cidade + '62070503' + txId + '6304';
  return payload;
}

function filterTransactions() {
  return g.transactions.filter(t => {
    if (currentType !== 'all' && t.type !== currentType) return false;
    if (currentPartner !== 'all' && t.partnerId !== currentPartner) return false;
    if (window.currentAccountFilter && window.currentAccountFilter !== 'all') {
      if (t.accountId !== window.currentAccountFilter &&
        t.contaOrigemId !== window.currentAccountFilter &&
        t.contaDestinoId !== window.currentAccountFilter) {
        return false;
      }
    }
    const effectiveDate = (t.isPaid && t.paymentDate) ? t.paymentDate : t.date;
    if (currentPeriod === 'custom') {
      if (effectiveDate < customStartDate || effectiveDate > customEndDate) return false;
    } else if (currentPeriod !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const txDate = new Date(effectiveDate + 'T12:00:00');
      if (currentPeriod === 'today') {
        if (txDate.toDateString() !== today.toDateString()) return false;
      } else if (currentPeriod === 'week') {
        const firstDayOfWeek = new Date(today);
        firstDayOfWeek.setDate(today.getDate() - today.getDay());
        const lastDayOfWeek = new Date(firstDayOfWeek);
        lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
        if (txDate < firstDayOfWeek || txDate > lastDayOfWeek) return false;
      } else if (currentPeriod === 'month') {
        if (txDate.getMonth() !== today.getMonth() || txDate.getFullYear() !== today.getFullYear()) return false;
      }
    }
    if (currentStatus !== 'all') {
      const hojeLocal = getTodayISO();
      const isPaid = t.isPaid;
      const isTransfer = t.type === 'transfer';
      if (currentStatus === 'paid') {
        if (!isPaid && !isTransfer) return false;
      } else if (currentStatus === 'unpaid') {
        if (isPaid || isTransfer) return false;
      } else if (currentStatus === 'scheduled') {
        if (isPaid || isTransfer || t.date < hojeLocal) return false;
      } else if (currentStatus === 'overdue') {
        if (isPaid || isTransfer || t.date >= hojeLocal) return false;
      }
    }
    return true;
  });
}

function updateSummaryTotals(filtered) {
  const totalIncome = filtered.filter(t => t.type === 'income').reduce((acc, t) => acc + t.value, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.value, 0);
  const balance = totalIncome - totalExpense;
  const elBalance = document.getElementById('balanceValue');
  const elIncome = document.getElementById('incomeValue');
  const elExpense = document.getElementById('expenseValue');
  if (elBalance) elBalance.innerHTML = '<span class="txn-val">' + formatCurrency(balance) + '</span>';
  if (elIncome) elIncome.innerHTML = '<span class="txn-val">' + formatCurrency(totalIncome) + '</span>';
  if (elExpense) elExpense.innerHTML = '<span class="txn-val">' + formatCurrency(totalExpense) + '</span>';
  const now = new Date();
  const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = prevMonthDate.getFullYear() + '-' + String(prevMonthDate.getMonth() + 1).padStart(2, '0');
  const curIncome = g.transactions.filter(t => t.type === 'income' && t.date.startsWith(currentMonth)).reduce((a, t) => a + t.value, 0);
  const curExpense = g.transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth)).reduce((a, t) => a + t.value, 0);
  const prevIncome = g.transactions.filter(t => t.type === 'income' && t.date.startsWith(prevMonth)).reduce((a, t) => a + t.value, 0);
  const prevExpense = g.transactions.filter(t => t.type === 'expense' && t.date.startsWith(prevMonth)).reduce((a, t) => a + t.value, 0);
  const bTrend = document.getElementById('balanceTrend');
  const iTrend = document.getElementById('incomeTrend');
  const eTrend = document.getElementById('expenseTrend');
  if (bTrend) bTrend.innerHTML = trendBadge(curIncome - curExpense, prevIncome - prevExpense);
  if (iTrend) iTrend.innerHTML = trendBadge(curIncome, prevIncome);
  if (eTrend) eTrend.innerHTML = trendBadge(curExpense, prevExpense, true);
}

function populatePartnerFilter() {
  const pFilter = document.getElementById('partnerFilter');
  if (!pFilter) return;
  pFilter.innerHTML = '<option value="all" selected>Todos</option>';
  g.partners.filter(p => p.active !== false).forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    pFilter.appendChild(opt);
  });
  pFilter.value = currentPartner;
}

function populateAccountFilter() {
  const accFilter = document.getElementById('accountFilter');
  if (!accFilter) return;
  accFilter.innerHTML = '<option value="all" selected>Todas</option>';
  g.accounts.filter(a => a.active !== false).forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = a.name;
    accFilter.appendChild(opt);
  });
  accFilter.value = window.currentAccountFilter || 'all';
}

function renderCostCenterOptions(selectedId = null, centersList = g.costCenters) {
  let options = '<option value="">Nenhum</option>';
  if (centersList && centersList.length > 0) {
    centersList.forEach(cc => {
      const selected = cc.id === selectedId ? 'selected' : '';
      options += '<option value="' + escapeHtml(cc.id) + '" ' + selected + '>' + escapeHtml(cc.description) + '</option>';
    });
  }
  return options;
}

function renderTransactions() {
  const filtered = filterTransactions();
  const listEl = document.getElementById('transactionsList');
  if (!listEl) return;
  if (filtered.length === 0) {
    listEl.innerHTML = '<div class="empty-state"><span class="material-icons">search_off</span><h3>Nenhum lançamento encontrado</h3><p>Tente ajustar os filtros acima ou cadastre um novo lançamento.</p></div>';
    updateSummaryTotals(filtered);
    updatePrivacyMode();
    return;
  }
  let html = '';
  filtered.sort((a, b) => {
    const dateA = (a.isPaid && a.paymentDate) ? a.paymentDate : a.date;
    const dateB = (b.isPaid && b.paymentDate) ? b.paymentDate : b.date;
    const dateDiff = new Date(dateB) - new Date(dateA);
    if (dateDiff !== 0) return dateDiff;
    const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
    const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
    return timeB - timeA;
  });
  let currentDateStr = null;
  const isDark = document.body.classList.contains('dark-mode');
  filtered.forEach(t => {
    const effectiveDate = (t.isPaid && t.paymentDate) ? t.paymentDate : t.date;
    if (effectiveDate !== currentDateStr) {
      const dailyTxs = filtered.filter(tx => {
        const txEffDate = (tx.isPaid && tx.paymentDate) ? tx.paymentDate : tx.date;
        return txEffDate === effectiveDate;
      });
      let dailyTotal = 0;
      dailyTxs.forEach(tx => {
        if (tx.type === 'income') dailyTotal += tx.value;
        else if (tx.type === 'expense') dailyTotal -= tx.value;
      });
      const balanceClass = dailyTotal < 0 ? 'daily-balance-negative' : 'daily-balance-neutral';
      html += '<div class="date-header"><span>' + formatDateHeader(effectiveDate) + '</span><span class="' + balanceClass + ' daily-balance">' + formatCurrency(dailyTotal) + '</span></div>';
      currentDateStr = effectiveDate;
    }
    const typeClass = t.type;
    let icon = 'receipt';
    if (t.type === 'expense') icon = 'shopping_bag';
    else if (t.type === 'income') icon = 'payments';
    else if (t.type === 'transfer') icon = 'swap_horiz';
    let amountClass = typeClass;
    let amountSign = '';
    if (t.type === 'expense') { amountSign = '- '; }
    else if (t.type === 'income') { amountSign = '+ '; }
    const categoryName = getCategoryNameById(t.category) || 'Outros';
    const tituloPrincipal = t.partnerName ? t.partnerName : (t.description || '(Sem descrição)');
    const subDescricao = (t.partnerName && t.description) ? t.description + ' • ' + categoryName : categoryName;
    let badgeHtml = '';
    if (t.type !== 'transfer') {
      if (t.isPaid) {
        badgeHtml = '<span class="status-badge paid">Pago</span>';
      } else {
        const hojeLocal = getTodayISO();
        if (t.date < hojeLocal) {
          badgeHtml = '<span class="status-badge overdue">Vencido</span>';
        } else {
          badgeHtml = '<span class="status-badge scheduled">Agendado</span>';
        }
      }
    } else {
      badgeHtml = '<span class="status-badge scheduled" style="border-color: ' + (isDark ? '#8ab4f8' : '#1a73e8') + '; color: ' + (isDark ? '#8ab4f8' : '#1a73e8') + ';">Transferido</span>';
    }
    let botoesAcaoHtml = '';
    if (!t.isPaid && t.type !== 'transfer') {
      botoesAcaoHtml += '<button class="action-btn pay-btn" title="Efetivar Pagamento"><span class="material-icons">check_circle</span></button>';
    }
    botoesAcaoHtml += '<button class="action-btn delete-btn" title="Excluir"><span class="material-icons">delete</span></button>';
    html += criarHtmlItemTransacao(t.id, typeClass, icon, tituloPrincipal, subDescricao, amountClass, amountSign, formatCurrency(t.value), badgeHtml, botoesAcaoHtml);
  });
  listEl.innerHTML = html;
  updateSummaryTotals(filtered);
  updatePrivacyMode();
  document.querySelectorAll('.pay-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const item = e.target.closest('.transaction-item');
      const id = item.dataset.id;
      const t = g.transactions.find(x => x.id === id);
      if (!t) return;
      const chosenDate = await askPaymentDate(t.date);
      if (!chosenDate) return;
      try {
        await userRef('transactions').doc(id).update({ isPaid: true, paymentDate: chosenDate, updatedAt: new Date().toISOString() });
        const idx = g.transactions.findIndex(x => x.id === id);
        if (idx !== -1) {
          g.transactions[idx].isPaid = true;
          g.transactions[idx].paymentDate = chosenDate;
          await processAccountBalance(g.transactions[idx], 'apply');
        }
        showToast('Lançamento pago com sucesso!', 'success');
        renderTransactions();
        renderDashboard();
      } catch (error) {
        showToast('Erro ao processar pagamento.', 'error');
      }
    });
  });
  document.querySelectorAll('.transaction-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.delete-btn')) return;
      const id = item.dataset.id;
      openEditTransactionModal(id);
    });
  });
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const item = e.target.closest('.transaction-item');
      const id = item.dataset.id;
      const isConfirmed = await askConfirmation('Excluir Lançamento', 'Tem certeza que deseja excluir este lançamento permanentemente?', 'Excluir', true, 'delete_outline');
      if (isConfirmed) {
        const txToDel = g.transactions.find(t => t.id === id);
        if (txToDel) await processAccountBalance(txToDel, 'revert');
        await deleteTransaction(id);
        showToast('Lançamento excluído com sucesso.', 'success');
        renderTransactions();
        renderDashboard();
      }
    });
  });
  renderNotifications();
}

function closeCustomDateModal() {
  customPeriodModal.style.display = 'none';
  periodFilterElement.value = previousPeriod;
}

function updateLeftHeroPanel() {
  const isPaid = transactionPaid ? transactionPaid.checked : false;
  const typeConfig = { expense: { label: 'Despesa', icon: 'arrow_downward', cls: 'expense' }, income: { label: 'Receita', icon: 'arrow_upward', cls: 'income' }, transfer: { label: 'Transferência', icon: 'swap_horiz', cls: 'transfer' } };
  const cfg = typeConfig[selectedType] || typeConfig.expense;
  ['leftPanel', 'leftPanel2'].forEach(id => {
    const panel = document.getElementById(id);
    if (panel) { panel.classList.remove('type-expense', 'type-income', 'type-transfer'); panel.classList.add('type-' + cfg.cls); }
  });
  ['txTypeBadge', 'txTypeBadge2'].forEach(id => {
    const badge = document.getElementById(id);
    if (badge) { badge.classList.remove('expense', 'income', 'transfer'); badge.classList.add(cfg.cls); badge.innerHTML = '<span class="material-icons" style="font-size:0.9rem;">' + cfg.icon + '</span> ' + cfg.label; }
  });
  ['heroAmount', 'heroAmount2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('income', 'transfer'); if (cfg.cls !== 'expense') el.classList.add(cfg.cls); }
  });
  ['heroStatusPill', 'heroStatusPill2'].forEach(id => {
    const pill = document.getElementById(id);
    if (pill) {
      pill.classList.remove('unpaid', 'paid');
      if (isPaid) { pill.classList.add('paid'); pill.innerHTML = '<span class="material-icons" style="font-size:0.85rem;">check_circle</span> Pago'; }
      else { pill.classList.add('unpaid'); pill.innerHTML = '<span class="material-icons" style="font-size:0.85rem;">schedule</span> A pagar'; }
    }
  });
}

function closeDrawer() {
  const card = modalOverlay.querySelector('.modal-card');
  if (card) {
    card.style.animation = 'slideOutRight 0.22s cubic-bezier(0.32, 0.72, 0, 1) forwards';
    setTimeout(() => { modalOverlay.style.display = 'none'; modalOverlay.classList.remove('open'); card.style.animation = ''; resetToStep1(); }, 210);
  } else { modalOverlay.style.display = 'none'; resetToStep1(); }
}

function setType(type) {
  selectedType = type;
  preencherSelectCategorias();
  [typeExpense, typeIncome, typeTransfer].forEach(el => { el.classList.remove('selected', 'expense', 'income', 'transfer'); });
  if (type === 'expense') { typeExpense.classList.add('selected', 'expense'); }
  else if (type === 'income') { typeIncome.classList.add('selected', 'income'); }
  else { typeTransfer.classList.add('selected', 'transfer'); }
  valorInput.classList.remove('expense', 'income', 'transfer');
  if (type === 'expense') valorInput.classList.add('expense');
  else if (type === 'income') valorInput.classList.add('income');
  else if (type === 'transfer') valorInput.classList.add('transfer');
  const labelConta = document.querySelector('label[for="contaLancamento"]');
  const labelOrigem = document.querySelector('label[for="contaOrigem"]');
  const labelDestino = document.querySelector('label[for="contaDestino"]');
  if (type === 'transfer') {
    transferFields.classList.add('visible');
    document.getElementById('contaLancamentoGroup').style.display = 'none';
    labelOrigem.innerHTML = 'Conta de origem <span class="material-icons" style="color: #d93025; font-size: 1.1rem; vertical-align: text-bottom;">arrow_downward</span> *';
    labelDestino.innerHTML = 'Conta de destino <span class="material-icons" style="color: #1a73e8; font-size: 1.1rem; vertical-align: text-bottom;">arrow_upward</span> *';
  } else {
    transferFields.classList.remove('visible');
    document.getElementById('contaLancamentoGroup').style.display = 'block';
    if (type === 'expense') { labelConta.innerHTML = 'Conta Financeira <span class="material-icons" style="color: #d93025; font-size: 1.1rem; vertical-align: text-bottom;">arrow_downward</span> *'; }
    else if (type === 'income') { labelConta.innerHTML = 'Conta Financeira <span class="material-icons" style="color: #188038; font-size: 1.1rem; vertical-align: text-bottom;">arrow_upward</span> *'; }
  }
  if (transactionPaid && paymentStatusLabel) {
    if (type === 'transfer') { transactionPaid.checked = true; transactionPaid.disabled = true; paymentStatusLabel.textContent = 'Pago'; paymentStatusLabel.style.color = '#188038'; }
    else { transactionPaid.disabled = false; if (transactionPaid.checked) { paymentStatusLabel.textContent = 'Pago'; paymentStatusLabel.style.color = '#188038'; } else { paymentStatusLabel.textContent = 'Não Pago'; paymentStatusLabel.style.color = '#e67e22'; } }
  }
  if (typeof window.verificarExibicaoCobranca === 'function') { window.verificarExibicaoCobranca(); }
  updateLeftHeroPanel();
  updateReceiptPreview();
}

function updateReceiptPreview() {
  const type = selectedType;
  let icon = 'receipt';
  let title = currentStep === 4 ? 'Comprovante de ' : 'Resumo para Conferência';
  if (type === 'expense') { icon = 'arrow_downward'; if (currentStep === 4) title += 'Despesa'; }
  else if (type === 'income') { icon = 'arrow_upward'; if (currentStep === 4) title += 'Receita'; }
  else { icon = 'swap_horiz'; if (currentStep === 4) title += 'Transferência'; }
  receiptIcon.textContent = icon;
  receiptIcon.style.color = '';
  receiptTitle.textContent = title;
  const receiptTypeClass = type === 'expense' ? '' : type;
  receiptHeaderIcon.classList.remove('income', 'transfer');
  receiptValor.classList.remove('income', 'transfer');
  if (receiptTypeClass) { receiptHeaderIcon.classList.add(receiptTypeClass); receiptValor.classList.add(receiptTypeClass); }
  const valor = valorParaNumero(valorInput.value);
  receiptValor.textContent = formatCurrency(valor);
  receiptDescricao.textContent = descricaoInput.value.trim() || '(não informado)';
  const categoriaText = categoriaSelect.options[categoriaSelect.selectedIndex]?.text || '-';
  receiptCategoria.textContent = categoriaText;
  const parceiroText = transactionPartner && transactionPartner.selectedIndex > 0 ? transactionPartner.options[transactionPartner.selectedIndex].text : '-';
  const receiptParceiro = document.getElementById('receiptParceiro');
  if (receiptParceiro) receiptParceiro.textContent = parceiroText;
  const contaLancamentoEl = document.getElementById('contaLancamento');
  if (type === 'transfer') {
    receiptOrigemRow.style.display = 'flex';
    receiptDestinoRow.style.display = 'flex';
    document.getElementById('receiptContaRow').style.display = 'none';
    receiptOrigem.textContent = contaOrigem.options[contaOrigem.selectedIndex]?.text.split(' (')[0] || '-';
    receiptDestino.textContent = contaDestino.options[contaDestino.selectedIndex]?.text.split(' (')[0] || '-';
    if (document.getElementById('receiptParceiroRow')) document.getElementById('receiptParceiroRow').style.display = 'none';
  } else {
    receiptOrigemRow.style.display = 'none';
    receiptDestinoRow.style.display = 'none';
    document.getElementById('receiptContaRow').style.display = 'flex';
    document.getElementById('receiptConta').textContent = contaLancamentoEl.options[contaLancamentoEl.selectedIndex]?.text.split(' (')[0] || '-';
    if (document.getElementById('receiptParceiroRow')) document.getElementById('receiptParceiroRow').style.display = 'flex';
  }
  const dataLancamento = transactionDateInput && transactionDateInput.value ? new Date(transactionDateInput.value + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
  const receiptTransactionDate = document.getElementById('receiptTransactionDate');
  if (receiptTransactionDate) receiptTransactionDate.textContent = dataLancamento;
  let vDataVencimento = dataInput.value;
  let vDataPagamento = paymentDateInput && paymentDateInput.value ? paymentDateInput.value : '';
  let isCardSelected = false;
  let isPrepaidSelected = false;
  const cartaoSelectPreview = document.getElementById('cartaoUsado');
  const contaLancPreview = document.getElementById('contaLancamento');
  if (selectedType === 'expense' && cartaoSelectPreview && cartaoSelectPreview.value && contaLancPreview.value) {
    const acc = g.accounts.find(a => a.id === contaLancPreview.value);
    if (acc && acc.cards) {
      const card = acc.cards.find(c => c.id === cartaoSelectPreview.value);
      if (card) {
        isCardSelected = true;
        if (!card.isPrepaid) {
          const dataBaseParaCalculo = (transactionDateInput && transactionDateInput.value) ? transactionDateInput.value : dataInput.value;
          vDataVencimento = editingTransactionId ? dataInput.value : calcDueDate(dataBaseParaCalculo, card.closingDay || 1, card.dueDay || 10);
          if (!transactionPaid.checked) { vDataPagamento = ''; }
        } else {
          isPrepaidSelected = true;
          const dataBaseParaCalculo = (transactionDateInput && transactionDateInput.value) ? transactionDateInput.value : dataInput.value;
          vDataVencimento = dataBaseParaCalculo;
          vDataPagamento = dataBaseParaCalculo;
        }
      }
    }
  }
  receiptData.textContent = vDataVencimento ? new Date(vDataVencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
  const receiptDataPagamento = document.getElementById('receiptDataPagamento');
  if (receiptDataPagamento) receiptDataPagamento.textContent = vDataPagamento ? new Date(vDataPagamento + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
  const qtdParcelas = document.getElementById('parcelas') ? parseInt(document.getElementById('parcelas').value) || 1 : 1;
  const receiptParcelasRow = document.getElementById('receiptParcelasRow');
  const receiptParcelas = document.getElementById('receiptParcelas');
  if (receiptParcelasRow && qtdParcelas > 1) {
    receiptParcelasRow.style.display = 'flex';
    const valorParcela = valor / qtdParcelas;
    receiptParcelas.textContent = qtdParcelas + 'x de ' + formatCurrency(valorParcela);
  } else if (receiptParcelasRow) { receiptParcelasRow.style.display = 'none'; }
  const cartaoSelect = document.getElementById('cartaoUsado');
  const receiptCartaoRow = document.getElementById('receiptCartaoRow');
  const receiptCartao = document.getElementById('receiptCartao');
  if (receiptCartaoRow && cartaoSelect && cartaoSelect.value) { receiptCartaoRow.style.display = 'flex'; receiptCartao.textContent = cartaoSelect.options[cartaoSelect.selectedIndex].text; }
  else if (receiptCartaoRow) { receiptCartaoRow.style.display = 'none'; }
  const pagamentoText = pagamentoSelect.options[pagamentoSelect.selectedIndex]?.text || '-';
  receiptPagamento.textContent = pagamentoText;
  if (recorrenteCheckbox.checked) { receiptRecorrenciaRow.style.display = 'flex'; receiptRecorrencia.textContent = getRecurrenceText() || 'Configuração inválida'; }
  else { receiptRecorrenciaRow.style.display = 'none'; }
  let isPaid = transactionPaid ? transactionPaid.checked : true;
  if (isCardSelected && !editingTransactionId) { isPaid = isPrepaidSelected ? true : false; }
  const receiptSituacao = document.getElementById('receiptSituacao');
  if (receiptSituacao) {
    if (type === 'transfer') { receiptSituacao.textContent = 'Transferido'; receiptSituacao.style.color = '#1a73e8'; }
    else if (isPaid) { receiptSituacao.textContent = type === 'expense' ? 'Pago' : 'Recebido'; receiptSituacao.style.color = '#188038'; }
    else { receiptSituacao.textContent = type === 'expense' ? 'A Pagar' : 'A Receber'; receiptSituacao.style.color = '#e67e22'; }
    receiptSituacao.style.fontWeight = 'bold';
  }
  const statusIcon = receiptStatus.querySelector('.material-icons');
  let statusText = '';
  receiptStatus.className = 'receipt-status';
  let parcelaInfo = '';
  const descAtual = descricaoInput.value.trim();
  const descMatch = descAtual.match(/\((\d+\/\d+)\)$/);
  if (descMatch) { parcelaInfo = ' - Parcela ' + descMatch[0]; }
  else if (typeof editingTransactionId !== 'undefined' && !editingTransactionId) {
    const qtdParcelasInner = document.getElementById('parcelas') ? parseInt(document.getElementById('parcelas').value) : 1;
    if (qtdParcelasInner > 1) { parcelaInfo = ' - Parcela (1/' + qtdParcelasInner + ')'; }
  }
  if (type === 'transfer') { statusText = 'Transferência realizada'; statusIcon.textContent = 'check_circle'; receiptStatus.classList.add('status-transfer'); }
  else {
    if (isPaid) { statusText = type === 'expense' ? 'Despesa paga' + parcelaInfo : 'Receita recebida' + parcelaInfo; statusIcon.textContent = 'check_circle'; receiptStatus.classList.add('status-confirmed'); }
    else {
      const hojeLocal = getTodayISO();
      const tDate = dataInput.value;
      if (tDate && tDate < hojeLocal) { statusText = type === 'expense' ? 'Despesa vencida' + parcelaInfo : 'Receita atrasada' + parcelaInfo; statusIcon.textContent = 'error_outline'; receiptStatus.classList.add('status-overdue'); }
      else { statusText = type === 'expense' ? 'Despesa agendada' + parcelaInfo : 'Receita agendada' + parcelaInfo; statusIcon.textContent = 'schedule'; receiptStatus.classList.add('status-scheduled'); }
    }
  }
  receiptStatusText.textContent = statusText;
  const verParcelasContainer = document.getElementById('receiptVerParcelasContainer');
  const listaParcelasExtrato = document.getElementById('listaParcelasExtrato');
  if (verParcelasContainer) {
    if (listaParcelasExtrato) listaParcelasExtrato.style.display = 'none';
    let txEditada = null;
    if (editingTransactionId) { txEditada = g.transactions.find(t => t.id === editingTransactionId); }
    if (txEditada && txEditada.installmentGroupId) {
      verParcelasContainer.style.display = 'flex';
      const btnVerParcelasInner = document.getElementById('btnVerParcelas');
      btnVerParcelasInner.dataset.groupId = txEditada.installmentGroupId;
      btnVerParcelasInner.innerHTML = '<span class="material-icons">list_alt</span> Ver todas as parcelas';
    } else { verParcelasContainer.style.display = 'none'; }
  }
  const receiptQrContainer = document.getElementById('receiptQrContainer');
  const receiptQrBox = document.getElementById('receiptQrBox');
  const receiptQrKeyText = document.getElementById('receiptQrKeyText');
  if (receiptQrContainer && receiptQrBox && receiptQrKeyText) {
    receiptQrContainer.style.display = 'none';
    receiptQrBox.innerHTML = '';
    if (!isPaid && type === 'expense' && pagamentoText.toLowerCase().includes('pix')) {
      const partnerId = transactionPartner && transactionPartner.value;
      if (partnerId) {
        const partner = g.partners.find(p => p.id === partnerId);
        if (partner) {
          let pixKey = ''; let pixType = '';
          if (partner.docIsPix && partner.document) { pixKey = partner.document; pixType = 'Documento'; }
          else if (partner.phoneIsPix && partner.phone) { pixKey = partner.phone; pixType = 'Celular'; }
          else if (partner.emailIsPix && partner.email) { pixKey = partner.email; pixType = 'E-mail'; }
          else if (partner.randomPixIsPix && partner.randomPix) { pixKey = partner.randomPix; pixType = 'Aleatória'; }
          if (pixKey) {
            const payload = gerarPayloadPix(pixKey, partner.name, pixType);
            if (typeof QRCode !== 'undefined') {
              new QRCode(receiptQrBox, { text: payload, width: 140, height: 140, colorDark: '#202124', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
              receiptQrKeyText.textContent = 'Chave: ' + pixKey;
              receiptQrContainer.style.display = 'flex';
            }
          }
        }
      }
    }
  }
  updatePrivacyMode();
}

function goToStep(step) {
  if (step < 1 || step > 4) return;
  currentStep = step;
  stepContents.forEach(content => content.classList.remove('active'));
  const stepIndicator = document.getElementById('stepIndicator');
  if (step <= 3) {
    document.getElementById('step' + step).classList.add('active');
    if (document.getElementById('receiptStatusContainer')) { document.getElementById('receiptStatusContainer').style.display = 'none'; }
    if (stepIndicator) stepIndicator.style.display = 'flex';
  } else if (step === 4) {
    document.getElementById('step3').classList.add('active');
    if (document.getElementById('receiptStatusContainer')) { document.getElementById('receiptStatusContainer').style.display = 'block'; }
    if (stepIndicator) stepIndicator.style.display = 'none';
  }
  steps.forEach((s, index) => {
    const stepNum = index + 1;
    s.classList.remove('active', 'done');
    if (stepNum < step) s.classList.add('done');
    else if (stepNum === step) s.classList.add('active');
  });
  [1, 2].forEach(i => { const conn = document.getElementById('conn' + i); if (conn) conn.classList.toggle('done', step > i); });
  [1, 2, 3].forEach(i => {
    const lbl = document.getElementById('stepLabel' + i);
    if (lbl) { lbl.classList.remove('active', 'done'); if (i < step) lbl.classList.add('done'); else if (i === step) lbl.classList.add('active'); }
  });
  const prevBtnEl = document.getElementById('prevBtn');
  const nextBtnEl = document.getElementById('nextBtn');
  const finalActionsLeft = document.getElementById('finalActionsLeft');
  const finalActionsRight = document.getElementById('finalActionsRight');
  const topActionsRight = document.getElementById('topActionsRight');
  const editWarning = document.getElementById('receiptEditWarning');
  if (step < 4) {
    if (prevBtnEl) prevBtnEl.style.display = 'inline-block';
    if (nextBtnEl) { nextBtnEl.style.display = 'inline-block'; nextBtnEl.disabled = false; nextBtnEl.textContent = (step === 3) ? 'Salvar lançamento' : 'Continuar'; }
    if (prevBtnEl) prevBtnEl.disabled = (step === 1);
    if (finalActionsLeft) finalActionsLeft.style.display = 'none';
    if (finalActionsRight) finalActionsRight.style.display = 'none';
    if (topActionsRight) topActionsRight.style.display = 'none';
    if (editWarning) editWarning.style.display = 'none';
  } else {
    if (prevBtnEl) prevBtnEl.style.display = 'none';
    if (nextBtnEl) nextBtnEl.style.display = 'none';
    if (finalActionsLeft) finalActionsLeft.style.display = 'flex';
    if (finalActionsRight) finalActionsRight.style.display = 'flex';
    if (topActionsRight) topActionsRight.style.display = 'flex';
    const downloadCobrancaBtn = document.getElementById('downloadCobrancaFooterBtn');
    if (downloadCobrancaBtn) {
      let exibirBtnCobranca = false;
      if (editingTransactionId) { const txAtual = g.transactions.find(t => t.id === editingTransactionId); if (txAtual && txAtual.isCobranca) exibirBtnCobranca = true; }
      else { const cobrancaCheck = document.getElementById('cobrancaCheckbox'); if (cobrancaCheck && cobrancaCheck.checked) exibirBtnCobranca = true; }
      downloadCobrancaBtn.style.display = exibirBtnCobranca ? 'inline-block' : 'none';
    }
    let usaCartaoCredito = false;
    const cartaoInput = document.getElementById('cartaoUsado');
    const contaInput = document.getElementById('contaLancamento');
    if (selectedType === 'expense' && cartaoInput && cartaoInput.value && contaInput && contaInput.value) {
      const acc = g.accounts.find(a => a.id === contaInput.value);
      if (acc && acc.cards) { const card = acc.cards.find(c => c.id === cartaoInput.value); if (card && !card.isPrepaid) usaCartaoCredito = true; }
    }
    let isPaid = transactionPaid ? transactionPaid.checked : true;
    if (usaCartaoCredito && !editingTransactionId) { isPaid = false; }
    if (isPaid) { if (editWarning) editWarning.style.display = 'flex'; if (editFinalBtn) editFinalBtn.style.display = 'none'; if (reversePaymentBtn) reversePaymentBtn.style.display = 'inline-block'; if (payFinalBtn) payFinalBtn.style.display = 'none'; }
    else { if (editWarning) editWarning.style.display = 'none'; if (editFinalBtn) editFinalBtn.style.display = 'flex'; if (reversePaymentBtn) reversePaymentBtn.style.display = 'none'; if (payFinalBtn) payFinalBtn.style.display = 'inline-block'; }
  }
  if (step >= 3) updateReceiptPreview();
}

function destacarCampoInvalido(stepTarget, fieldId) {
  goToStep(stepTarget);
  setTimeout(() => {
    const campo = document.getElementById(fieldId);
    if (campo) {
      campo.scrollIntoView({ behavior: 'smooth', block: 'center' });
      campo.focus();
      campo.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
      campo.style.borderColor = '#d93025';
      campo.style.boxShadow = '0 0 0 4px rgba(217, 48, 37, 0.2)';
      setTimeout(() => { campo.style.borderColor = ''; campo.style.boxShadow = ''; }, 3000);
    }
  }, 300);
}

function resetToStep1() {
  setEditingTransactionId(null);
  document.getElementById('modalTitle').textContent = 'Novo lançamento';
  valorInput.value = '';
  ['heroAmount', 'heroAmount2'].forEach(id => { const a = document.getElementById(id); if (a) a.textContent = '0,00'; });
  descricaoInput.value = '';
  categoriaSelect.selectedIndex = 0;
  const today = getTodayISO();
  if (transactionDateInput) transactionDateInput.value = today;
  dataInput.value = today;
  if (paymentDateInput) paymentDateInput.value = '';
  if (transactionPartner) transactionPartner.selectedIndex = 0;
  if (transactionPaid) { transactionPaid.checked = false; transactionPaid.disabled = false; if (paymentStatusLabel) { paymentStatusLabel.textContent = 'Não Pago'; paymentStatusLabel.style.color = '#e67e22'; } }
  document.getElementById('contaLancamento').value = '';
  document.getElementById('contaOrigem').value = '';
  document.getElementById('contaDestino').value = '';
  preencherSelectPagamentos(null);
  if (document.getElementById('cartaoUsado')) document.getElementById('cartaoUsado').value = '';
  if (document.getElementById('parcelas')) { document.getElementById('parcelas').value = ''; document.getElementById('parcelas').dispatchEvent(new Event('change')); }
  if (document.getElementById('parcelasCardGroup')) document.getElementById('parcelasCardGroup').style.display = 'none';
  setType('expense');
  document.getElementById('boletoCheckbox').checked = false;
  document.getElementById('boletoLine').value = '';
  document.getElementById('boletoFieldGroup').style.display = 'none';
  document.getElementById('boletoGroupContainer').style.display = 'none';
  const scanStatus = document.getElementById('scanStatus');
  if (scanStatus) { scanStatus.style.display = 'none'; scanStatus.textContent = ''; }
  recorrenteCheckbox.checked = false;
  recorrenteCheckbox.disabled = false;
  const recLabel = document.querySelector('label[for="recorrenteCheckbox"]');
  if (recLabel) recLabel.innerHTML = 'Lançamento recorrente';
  recurrenceFields.classList.remove('visible');
  frequenciaSelect.value = 'monthly';
  intervaloInput.value = '1';
  terminoTipoSelect.value = 'never';
  terminoDataGroup.style.display = 'none';
  terminoCountGroup.style.display = 'none';
  terminoDataInput.value = '';
  terminoCountInput.value = '3';
  goToStep(1);
}

async function openEditTransactionModal(id) {
  const t = g.transactions.find(x => x.id === id);
  if (!t) return;
  setEditingTransactionId(id);
  document.getElementById('modalTitle').textContent = 'Editar lançamento';
  await Promise.all([fetchCategories(), fetchPaymentTypes(), loadPartners(), loadAccounts()]);
  preencherSelectCategorias();
  preencherSelectPagamentos();
  preencherSelectContas();
  const selectPartner = document.getElementById('transactionPartner');
  if (selectPartner) {
    selectPartner.innerHTML = '<option value="">Selecione um parceiro...</option>';
    g.partners.filter(p => p.active !== false).sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
      const opt = document.createElement('option'); opt.value = p.id; opt.textContent = p.name; selectPartner.appendChild(opt);
    });
  }
  setType(t.type);
  const valorSeguro = t.value ? Number(t.value) : 0;
  valorInput.value = formatarMoeda(valorSeguro.toFixed(2).replace('.', ''));
  descricaoInput.value = t.description || '';
  if (t.partnerId) selectPartner.value = t.partnerId;
  categoriaSelect.value = t.category || '';
  if (transactionDateInput) transactionDateInput.value = t.transactionDate || t.date;
  dataInput.value = t.date;
  if (paymentDateInput) paymentDateInput.value = t.isPaid ? (t.paymentDate || t.date) : '';
  const contaLancamentoEl = document.getElementById('contaLancamento');
  if (t.accountId) contaLancamentoEl.value = t.accountId;
  if (t.type === 'transfer') { contaOrigem.value = t.contaOrigemId || ''; contaDestino.value = t.contaDestinoId || ''; }
  const contaParaFiltro = t.type === 'transfer' ? t.contaOrigemId : t.accountId;
  preencherSelectPagamentos(contaParaFiltro);
  const eventoConta = new Event('change');
  document.getElementById('contaLancamento').dispatchEvent(eventoConta);
  if (t.cardId && document.getElementById('cartaoUsado')) { document.getElementById('cartaoUsado').value = t.cardId; }
  pagamentoSelect.value = t.paymentMethod || '';
  const checkBoleto = document.getElementById('boletoCheckbox');
  checkBoleto.checked = t.hasBoleto || false;
  document.getElementById('boletoLine').value = t.boletoLine || '';
  checkBoleto.dispatchEvent(new Event('change'));
  document.getElementById('pagamento').dispatchEvent(new Event('change'));
  const checkCobranca = document.getElementById('cobrancaCheckbox');
  if (checkCobranca && t.isCobranca) { checkCobranca.checked = true; }
  if (transactionPaid) { transactionPaid.checked = t.isPaid !== false; transactionPaid.dispatchEvent(new Event('change')); }
  recorrenteCheckbox.checked = false;
  recorrenteCheckbox.disabled = true;
  document.querySelector('label[for="recorrenteCheckbox"]').innerHTML = 'Lançamento recorrente <small>(Não alterável na edição)</small>';
  recurrenceFields.classList.remove('visible');
  goToStep(4);
  modalOverlay.style.display = 'flex';
  modalOverlay.classList.add('open');
}

function checkRStep1Valid() {
  if (currentRStep === 1) { rNextBtn.disabled = !(partnerSelect.value && monthSelect.value); }
}

function goToRStep(step) {
  setCurrentRStep(step);
  document.querySelectorAll('#receiptStepIndicator .step').forEach((s, idx) => { s.classList.toggle('active', idx + 1 <= step); });
  document.querySelectorAll('#receiptGeneratorModal .step-content').forEach(c => c.classList.remove('active'));
  document.getElementById('rStep' + step).classList.add('active');
  rPrevBtn.disabled = (step === 1);
  if (step === 1) { rNextBtn.style.display = 'inline-block'; rDownloadBtn.style.display = 'none'; rNextBtn.textContent = 'Buscar Lançamentos'; checkRStep1Valid(); }
  else if (step === 2) { rNextBtn.style.display = 'none'; rDownloadBtn.style.display = 'flex'; rDownloadBtn.disabled = true; if (selectAllReceiptTx) selectAllReceiptTx.checked = false; loadReceiptTransactions(); }
}

function loadReceiptTransactions() {
  const partnerId = partnerSelect.value;
  const monthStr = monthSelect.value;
  setReceiptEligibleTxs(g.transactions.filter(t => t.partnerId === partnerId && t.date.startsWith(monthStr) && t.type !== 'transfer' && t.isPaid === true).sort((a, b) => new Date(a.date) - new Date(b.date)));
  if (receiptEligibleTxs.length === 0) { rTxList.innerHTML = '<div class="receipt-empty-msg" style="padding: 16px; text-align: center;">Nenhum registro encontrado para este parceiro no período selecionado.</div>'; if (selectAllReceiptTx) selectAllReceiptTx.disabled = true; return; }
  if (selectAllReceiptTx) selectAllReceiptTx.disabled = false;
  let html = '';
  receiptEligibleTxs.forEach(t => {
    const isIncome = t.type === 'income';
    const valClass = isIncome ? 'receipt-val-income' : 'receipt-val-expense';
    const sign = isIncome ? '+' : '-';
    const statusLabel = t.isPaid ? '(Pago)' : '(Pendente)';
    html += '<label class="receipt-tx-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #f1f3f4; cursor: pointer; transition: background 0.2s; border-radius: 8px;"><div style="display: flex; align-items: center; gap: 12px;"><input type="checkbox" class="rtx-checkbox" value="' + t.id + '" style="width: 18px; height: 18px; accent-color: #1a73e8;"><div><div class="receipt-item-desc" style="font-weight: 500;">' + t.description + ' <small style="color: #9aa0a6; font-weight: normal;">' + statusLabel + '</small></div><div style="font-size: 0.8rem; color: #5f6368;">' + formatDate(t.date) + '</div></div></div><div class="' + valClass + '" style="font-weight: 600;">' + sign + formatCurrency(t.value) + '</div></label>';
  });
  rTxList.innerHTML = html;
  document.querySelectorAll('.rtx-checkbox').forEach(cb => { cb.addEventListener('change', updateRTotal); });
  updateRTotal();
}

function updateRTotal() {
  let total = 0;
  let checkedCount = 0;
  document.querySelectorAll('.rtx-checkbox:checked').forEach(cb => {
    checkedCount++;
    const t = receiptEligibleTxs.find(x => x.id === cb.value);
    if (t) { total += (t.type === 'income' ? t.value : -t.value); }
  });
  rTotalPreview.style.color = '';
  rTotalPreview.className = total >= 0 ? 'receipt-total-positive' : 'receipt-total-negative';
  rTotalPreview.textContent = 'Total do Recibo: ' + formatCurrency(Math.abs(total));
  rDownloadBtn.disabled = checkedCount === 0;
  const allCheckboxes = document.querySelectorAll('.rtx-checkbox');
  if (selectAllReceiptTx && allCheckboxes.length > 0) { selectAllReceiptTx.checked = (checkedCount === allCheckboxes.length); }
}

function checkBStep1Valid() {
  if (currentBStep === 1) { bNextBtn.disabled = !bPartnerSelect.value; }
}

function goToBStep(step) {
  setCurrentBStep(step);
  document.querySelectorAll('#billingStepIndicator .step').forEach((s, idx) => { s.classList.toggle('active', idx + 1 <= step); });
  document.querySelectorAll('#billingGeneratorModal .step-content').forEach(c => c.classList.remove('active'));
  document.getElementById('bStep' + step).classList.add('active');
  bPrevBtn.disabled = (step === 1);
  if (step === 1) { bNextBtn.style.display = 'inline-block'; bGenerateBtn.style.display = 'none'; bNextBtn.textContent = 'Buscar Receitas Pendentes'; checkBStep1Valid(); }
  else if (step === 2) { bNextBtn.style.display = 'none'; bGenerateBtn.style.display = 'flex'; bGenerateBtn.disabled = true; if (selectAllBillingTx) selectAllBillingTx.checked = false; loadBillingTransactions(); }
}

function loadBillingTransactions() {
  const partnerId = bPartnerSelect.value;
  const partnerNameStr = bPartnerSelect.options[bPartnerSelect.selectedIndex].text;
  setBillingEligibleTxs(g.transactions.filter(t => {
    if (t.partnerId !== partnerId && t.partnerName !== partnerNameStr) return false;
    if (t.type !== 'income') return false;
    if (t.isPaid === true) return false;
    let isPix = false;
    const pm = g.paymentTypes.find(p => p.id === t.paymentMethod);
    if (pm && pm.description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('pix')) { isPix = true; }
    if (t.paymentMethod && typeof t.paymentMethod === 'string' && t.paymentMethod.toLowerCase().includes('pix')) { isPix = true; }
    if (!isPix) return false;
    return true;
  }).sort((a, b) => new Date(a.date) - new Date(b.date)));
  if (billingEligibleTxs.length === 0) { bTxList.innerHTML = '<div class="receipt-empty-msg" style="padding: 16px; text-align: center;">Nenhuma receita pendente via Pix encontrada para este parceiro.</div>'; if (selectAllBillingTx) selectAllBillingTx.disabled = true; return; }
  if (selectAllBillingTx) selectAllBillingTx.disabled = false;
  let html = '';
  billingEligibleTxs.forEach(t => {
    const acc = g.accounts.find(a => a.id === t.accountId);
    const accName = acc ? acc.name : 'Conta Desconhecida';
    html += '<label class="receipt-tx-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #f1f3f4; cursor: pointer; transition: background 0.2s; border-radius: 8px;"><div style="display: flex; align-items: center; gap: 12px;"><input type="checkbox" class="btx-checkbox" value="' + t.id + '" style="width: 18px; height: 18px; accent-color: #1a73e8;"><div><div class="receipt-item-desc" style="font-weight: 500;">' + t.description + '</div><div style="font-size: 0.8rem; color: #5f6368;">' + formatDate(t.date) + ' • ' + accName + '</div></div></div><div class="receipt-val-income" style="font-weight: 600;">+' + formatCurrency(t.value) + '</div></label>';
  });
  bTxList.innerHTML = html;
  document.querySelectorAll('.btx-checkbox').forEach(cb => { cb.addEventListener('change', updateBTotal); });
  updateBTotal();
}

function updateBTotal() {
  let total = 0;
  let checkedCount = 0;
  document.querySelectorAll('.btx-checkbox:checked').forEach(cb => {
    checkedCount++;
    const t = billingEligibleTxs.find(x => x.id === cb.value);
    if (t) total += t.value;
  });
  bTotalPreview.textContent = 'Total da Fatura: ' + formatCurrency(total);
  bGenerateBtn.disabled = checkedCount === 0;
  const allCheckboxes = document.querySelectorAll('.btx-checkbox');
  if (selectAllBillingTx && allCheckboxes.length > 0) { selectAllBillingTx.checked = (checkedCount === allCheckboxes.length); }
}

function initTransactions() {
  document.getElementById('periodFilter')?.addEventListener('change', (e) => { setCurrentPeriod(e.target.value); renderTransactions(); });
  document.getElementById('statusFilter')?.addEventListener('change', (e) => { setCurrentStatus(e.target.value); renderTransactions(); });
  document.querySelectorAll('#typeFilter button').forEach(btn => {
    btn?.addEventListener('click', (e) => {
      document.querySelectorAll('#typeFilter button').forEach(b => b?.classList.remove('active'));
      btn.classList.add('active');
      setCurrentType(btn.dataset.type);
      renderTransactions();
    });
  });
  document.getElementById('partnerFilter')?.addEventListener('change', (e) => { setCurrentPartner(e.target.value); renderTransactions(); });
  document.getElementById('accountFilter')?.addEventListener('change', (e) => { window.currentAccountFilter = e.target.value; renderTransactions(); });
  periodFilterElement?.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
      if (customStartDate) document.getElementById('customDateStart').value = customStartDate;
      if (customEndDate) document.getElementById('customDateEnd').value = customEndDate;
      customPeriodModal.style.display = 'flex';
    } else if (e.target.value !== 'custom_view') { setCurrentPeriod(e.target.value); setPreviousPeriod(currentPeriod); renderTransactions(); }
  });
  document.getElementById('closeCustomPeriodBtn')?.addEventListener('click', closeCustomDateModal);
  document.getElementById('cancelCustomPeriodBtn')?.addEventListener('click', closeCustomDateModal);
  document.getElementById('applyCustomPeriodBtn')?.addEventListener('click', () => {
    const start = document.getElementById('customDateStart').value;
    const end = document.getElementById('customDateEnd').value;
    if (!start || !end) { showToast('Preencha a data de início e fim.', 'warning'); return; }
    if (start > end) { showToast('A data inicial não pode ser maior que a final.', 'error'); return; }
    setCustomStartDate(start); setCustomEndDate(end); setCurrentPeriod('custom');
    const formatBr = (dateString) => dateString.split('-').reverse().join('/');
    const dateLabel = formatBr(start) + ' - ' + formatBr(end);
    const customViewOpt = document.getElementById('customViewOption');
    customViewOpt.textContent = dateLabel;
    periodFilterElement.value = 'custom_view';
    setPreviousPeriod('custom_view');
    customPeriodModal.style.display = 'none';
    renderTransactions();
  });
  const mobileFilterToggle = document.getElementById('mobileFilterToggle');
  const mainFiltersCard = document.getElementById('mainFiltersCard');
  if (mobileFilterToggle && mainFiltersCard) {
    mobileFilterToggle.addEventListener('click', () => {
      mainFiltersCard.classList.toggle('filters-expanded');
      const arrow = document.getElementById('filterToggleArrow');
      if (arrow) { arrow.textContent = mainFiltersCard.classList.contains('filters-expanded') ? 'expand_less' : 'expand_more'; }
    });
  }
  document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
    setCurrentPeriod('month'); setPreviousPeriod('month'); setCurrentStatus('all'); setCurrentType('all'); setCurrentPartner('all');
    window.currentAccountFilter = 'all'; setCustomStartDate(''); setCustomEndDate('');
    periodFilterElement.value = 'month';
    document.getElementById('statusFilter').value = 'all';
    document.getElementById('partnerFilter').value = 'all';
    if (document.getElementById('accountFilter')) document.getElementById('accountFilter').value = 'all';
    document.getElementById('customDateStart').value = '';
    document.getElementById('customDateEnd').value = '';
    document.querySelectorAll('#typeFilter button').forEach(b => { b.classList.remove('active'); if (b.dataset.type === 'all') b.classList.add('active'); });
    renderTransactions();
    showToast('Filtros restaurados', 'success');
  });

  const downloadReportBtn = document.getElementById('downloadReportBtn');
  if (downloadReportBtn) {
    downloadReportBtn.addEventListener('click', () => {
      const filteredTx = filterTransactions();
      if (filteredTx.length === 0) { showToast('Nenhum lançamento encontrado para gerar o relatório.', 'warning'); return; }
      if (filteredTx.length > 400) { showToast('Relatório muito grande! Filtre por Mês ou Trimestre para não travar o sistema.', 'warning'); return; }
      const originalText = downloadReportBtn.innerHTML;
      downloadReportBtn.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">autorenew</span> Gerando...';
      downloadReportBtn.disabled = true;
      let totalIncome = 0;
      let totalExpense = 0;
      const txToPrint = [...filteredTx].sort((a, b) => new Date(b.date) - new Date(a.date));
      const groupedByMonth = {};
      txToPrint.forEach(t => {
        if (t.type === 'income') totalIncome += t.value;
        if (t.type === 'expense') totalExpense += t.value;
        const monthKey = t.date.substring(0, 7);
        if (!groupedByMonth[monthKey]) groupedByMonth[monthKey] = [];
        groupedByMonth[monthKey].push(t);
      });
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      let tablesHtml = '';
      for (const [monthKey, txs] of Object.entries(groupedByMonth)) {
        const [yearStr, monthStr] = monthKey.split('-');
        const monthTitle = monthNames[parseInt(monthStr) - 1] + ' de ' + yearStr;
        let rowsHtml = '';
        txs.forEach(t => {
          const dateStr = formatDate(t.date);
          const typeLabel = t.type === 'income' ? 'Receita' : (t.type === 'expense' ? 'Despesa' : 'Transferência');
          const color = t.type === 'income' ? '#188038' : (t.type === 'expense' ? '#d93025' : '#1a73e8');
          const sign = t.type === 'income' ? '+' : (t.type === 'expense' ? '-' : '');
          let status = '';
          if (t.type === 'transfer') { status = 'Transferido'; }
          else if (t.isPaid) { status = 'Pago'; }
          else { const hojeLocal = getTodayISO(); status = (t.date < hojeLocal) ? '<span style="color: #d93025; font-weight: 500;">Vencido</span>' : 'Agendado'; }
          const categoryOrPartner = t.partnerName ? t.partnerName + ' • ' + (getCategoryNameById(t.category) || 'Outros') : (getCategoryNameById(t.category) || 'Outros');
          rowsHtml += criarHtmlLinhaTabelaPDF(dateStr, t.description, categoryOrPartner, typeLabel, status, color, sign, formatCurrency(t.value));
        });
        tablesHtml += criarHtmlTabelaMesPDF(monthTitle, rowsHtml);
      }
      const balance = totalIncome - totalExpense;
      const balanceColor = balance >= 0 ? '#188038' : '#d93025';
      const htmlContent = '<div style="width: 800px; padding: 40px 50px 80px 50px; background: #ffffff; color: #202124; font-family: Helvetica, Arial, sans-serif;">' +
        '<div style="border-bottom: 2px solid #1a73e8; padding-bottom: 24px; margin-bottom: 32px; overflow: hidden;">' +
        '<div style="float: left;"><h1 style="color: #1a73e8; margin: 0; font-size: 2rem; letter-spacing: 1px;">ControlPess</h1><p style="color: #5f6368; margin: 4px 0 0 0; font-size: 1.1rem;">Relatório Analítico de Lançamentos</p></div>' +
        '<div style="float: right; text-align: right;"><p style="color: #202124; font-weight: 500; margin: 0; font-size: 1.1rem;">' + filteredTx.length + ' lançamento(s)</p><p style="color: #5f6368; font-size: 0.9rem; margin: 4px 0 0 0;">Emitido em: ' + new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR') + '</p></div>' +
        '<div style="clear: both;"></div></div>' +
        '<div style="display: flex; justify-content: space-between; margin-bottom: 32px; gap: 16px; page-break-inside: avoid;">' +
        '<div style="flex: 1; background: #f8f9fa; padding: 20px; border-radius: 12px; border: 1px solid #e8eaed; text-align: center;"><p style="margin: 0 0 8px 0; color: #5f6368; font-size: 0.95rem;">Receitas no período</p><h3 style="margin: 0; color: #188038; font-size: 1.5rem;">' + formatCurrency(totalIncome) + '</h3></div>' +
        '<div style="flex: 1; background: #f8f9fa; padding: 20px; border-radius: 12px; border: 1px solid #e8eaed; text-align: center;"><p style="margin: 0 0 8px 0; color: #5f6368; font-size: 0.95rem;">Despesas no período</p><h3 style="margin: 0; color: #d93025; font-size: 1.5rem;">' + formatCurrency(totalExpense) + '</h3></div>' +
        '<div style="flex: 1; background: #f8f9fa; padding: 20px; border-radius: 12px; border: 1px solid #e8eaed; text-align: center;"><p style="margin: 0 0 8px 0; color: #5f6368; font-size: 0.95rem;">Saldo Final</p><h3 style="margin: 0; color: ' + balanceColor + '; font-size: 1.5rem;">' + formatCurrency(balance) + '</h3></div></div>' +
        tablesHtml + '</div>';
      const opt = { margin: [0.4, 0, 0.8, 0], filename: 'Relatorio_ControlPess_' + new Date().getTime() + '.pdf', image: { type: 'jpeg', quality: 1 }, html2canvas: { scale: 2, useCORS: true, letterRendering: true }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } };
      html2pdf().set(opt).from(htmlContent).toPdf().get('pdf').then(function(pdf) {
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i); pdf.setFontSize(9); pdf.setTextColor(150);
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          pdf.text('Documento gerado eletronicamente por ControlPess.', pageWidth / 2, pageHeight - 0.5, { align: 'center' });
          pdf.text('Página ' + i + ' de ' + totalPages, pageWidth / 2, pageHeight - 0.3, { align: 'center' });
        }
      }).save().then(() => { downloadReportBtn.innerHTML = originalText; downloadReportBtn.disabled = false; showToast('Relatório baixado com sucesso!', 'success'); }).catch(err => { console.error('Erro ao gerar PDF: ', err); downloadReportBtn.innerHTML = originalText; downloadReportBtn.disabled = false; showToast('Erro ao gerar relatório.', 'error'); });
    });
  }

  if (openBtn) {
    openBtn.addEventListener('click', async () => {
      await Promise.all([fetchCategories(), fetchPaymentTypes(), loadPartners(), loadAccounts()]);
      preencherSelectCategorias();
      preencherSelectPagamentos();
      preencherSelectContas();
      const selectPartner = document.getElementById('transactionPartner');
      if (selectPartner) {
        selectPartner.innerHTML = '<option value="">Selecione um parceiro...</option>';
        g.partners.filter(p => p.active !== false).sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
          const opt = document.createElement('option'); opt.value = p.id; opt.textContent = p.name; selectPartner.appendChild(opt);
        });
      }
      resetToStep1();
      modalOverlay.style.display = 'flex';
      modalOverlay.classList.add('open');
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  modalOverlay?.addEventListener('click', (e) => { if (e.target === modalOverlay) closeDrawer(); });
  if (typeExpense) typeExpense.addEventListener('click', () => setType('expense'));
  if (typeIncome) typeIncome.addEventListener('click', () => setType('income'));
  if (typeTransfer) typeTransfer.addEventListener('click', () => setType('transfer'));
  if (transactionPaid) {
    transactionPaid.addEventListener('change', function() {
      if (this.checked) {
        paymentStatusLabel.textContent = 'Pago'; paymentStatusLabel.style.color = '#188038'; paymentStatusLabel.style.fontWeight = 'bold';
        if (paymentDateInput && !paymentDateInput.value) { paymentDateInput.value = getTodayISO(); }
      } else {
        paymentStatusLabel.textContent = 'Não Pago'; paymentStatusLabel.style.color = '#e67e22'; paymentStatusLabel.style.fontWeight = 'bold';
        if (paymentDateInput) paymentDateInput.value = '';
      }
      updateLeftHeroPanel();
    });
  }
  document.getElementById('contaLancamento')?.addEventListener('change', async function() {
    preencherSelectPagamentos(this.value);
    const acc = g.accounts.find(a => a.id === this.value);
    const cartaoSelect = document.getElementById('cartaoUsado');
    if (acc && acc.hasCreditCard && acc.cards && acc.cards.length > 0) {
      cartaoSelect.innerHTML = '<option value="">Selecione o cartão...</option>';
      acc.cards.forEach(card => { cartaoSelect.innerHTML += '<option value="' + card.id + '">' + card.name + ' (Final ' + card.last4 + ')</option>'; });
    } else { cartaoSelect.innerHTML = '<option value="">Selecione o cartão...</option>'; }
    document.getElementById('parcelasCardGroup').style.display = 'none';
    document.getElementById('cartaoGroup').style.display = 'none';
    document.getElementById('parcelasGroup').style.display = 'none';
    await verificarFormasPagamentoConta(this);
  });
  document.getElementById('contaOrigem')?.addEventListener('change', async function() { preencherSelectPagamentos(this.value); await verificarFormasPagamentoConta(this); });
  document.getElementById('contaDestino')?.addEventListener('change', async function() { await verificarFormasPagamentoConta(this); });
  document.getElementById('pagamento')?.addEventListener('change', function() {
    if (this.selectedIndex < 0) return;
    const textoSelecionado = this.options[this.selectedIndex].text.toLowerCase();
    const textoNormalizado = textoSelecionado.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (typeof window.verificarExibicaoCobranca === 'function') { window.verificarExibicaoCobranca(); }
    const containerBoleto = document.getElementById('boletoGroupContainer');
    const checkBoleto = document.getElementById('boletoCheckbox');
    const campoLinha = document.getElementById('boletoFieldGroup');
    if (textoNormalizado.includes('boleto')) { containerBoleto.style.display = 'flex'; }
    else {
      containerBoleto.style.display = 'none'; checkBoleto.checked = false; campoLinha.style.display = 'none';
      document.getElementById('boletoLine').value = '';
      const scanStatus = document.getElementById('scanStatus');
      if (scanStatus) scanStatus.style.display = 'none';
    }
    const ptId = this.value;
    const pt = g.paymentTypes.find(p => p.id === ptId);
    const parcelasCardGroup = document.getElementById('parcelasCardGroup');
    const parcelasGroup = document.getElementById('parcelasGroup');
    const cartaoGroup = document.getElementById('cartaoGroup');
    const parcelasSelect = document.getElementById('parcelas');
    const cartaoSelect = document.getElementById('cartaoUsado');
    let mostrarParcelas = false;
    let mostrarCartao = false;
    if (pt && pt.allowsInstallments && (selectedType === 'expense' || selectedType === 'income') && !editingTransactionId) {
      mostrarParcelas = true;
      parcelasSelect.innerHTML = '<option value="" disabled selected>Selecione...</option>';
      parcelasSelect.innerHTML += '<option value="1">À vista (1x)</option>';
      for (let i = 2; i <= (pt.maxInstallments || 12); i++) { parcelasSelect.innerHTML += '<option value="' + i + '">' + i + 'x parcelado</option>'; }
      parcelasSelect.selectedIndex = 0;
    } else { parcelasSelect.value = '1'; }
    if ((textoNormalizado.includes('credito') || textoNormalizado.includes('cartao')) && selectedType === 'expense') { mostrarCartao = true; }
    else { if (cartaoSelect) cartaoSelect.value = ''; }
    parcelasGroup.style.display = mostrarParcelas ? 'block' : 'none';
    cartaoGroup.style.display = mostrarCartao ? 'block' : 'none';
    parcelasCardGroup.style.display = (mostrarParcelas || mostrarCartao) ? 'flex' : 'none';
    if (parcelasSelect) parcelasSelect.dispatchEvent(new Event('change'));
    updateReceiptPreview();
    setTimeout(() => {
      if (mostrarParcelas && parcelasSelect) { parcelasSelect.scrollIntoView({ behavior: 'smooth', block: 'center' }); parcelasSelect.focus(); }
      else if (mostrarCartao && cartaoSelect) { cartaoSelect.scrollIntoView({ behavior: 'smooth', block: 'center' }); cartaoSelect.focus(); }
      else if (textoNormalizado.includes('boleto') && containerBoleto) { containerBoleto.scrollIntoView({ behavior: 'smooth', block: 'center' }); checkBoleto.focus(); }
    }, 150);
  });
    const parcelasEl = document.getElementById('parcelas');
    if (parcelasEl) {
    parcelasEl.addEventListener('change', function() {
      const recGroup = recorrenteCheckbox.parentElement;
      if (parseInt(this.value) > 1) { recGroup.style.display = 'none'; recorrenteCheckbox.checked = false; recurrenceFields.classList.remove('visible'); }
      else { recGroup.style.display = 'flex'; }
      updateReceiptPreview();
    });
  }
  recorrenteCheckbox?.addEventListener('change', function() { if (this.checked) { recurrenceFields.classList.add('visible'); } else { recurrenceFields.classList.remove('visible'); } updateReceiptPreview(); });
  terminoTipoSelect?.addEventListener('change', function() {
    if (this.value === 'until') { terminoDataGroup.style.display = 'block'; terminoCountGroup.style.display = 'none'; }
    else if (this.value === 'count') { terminoDataGroup.style.display = 'none'; terminoCountGroup.style.display = 'block'; }
    else { terminoDataGroup.style.display = 'none'; terminoCountGroup.style.display = 'none'; }
    updateReceiptPreview();
  });
  valorInput?.addEventListener('input', function(e) {
    let value = e.target.value;
    let rawValue = value.replace(/\D/g, '');
    if (rawValue.length === 0) { e.target.value = ''; return; }
    if (rawValue.length > 15) rawValue = rawValue.slice(0, 15);
    e.target.value = formatarMoeda(rawValue);
    const display = e.target.value.replace('R$', '').trim() || '0,00';
    ['heroAmount', 'heroAmount2'].forEach(id => { const a = document.getElementById(id); if (a) a.textContent = display; });
  });
  valorInput?.addEventListener('blur', function(e) { if (!e.target.value) { e.target.value = 'R$ 0,00'; } });
  if (prevBtn) { prevBtn.addEventListener('click', () => { if (currentStep > 1) goToStep(currentStep - 1); }); }
  if (cancelBtn) { cancelBtn.addEventListener('click', () => { if (currentStep > 1) goToStep(currentStep - 1); }); }

  if (nextBtn) {
    nextBtn.addEventListener('click', async () => {
      if (currentStep < 3) {
        if (currentStep === 1) {
          const valorNumerico = valorParaNumero(valorInput.value);
          if (valorNumerico <= 0) { showToast('Por favor, informe um valor válido.', 'warning'); destacarCampoInvalido(1, 'valor'); return; }
        }
        goToStep(currentStep + 1);
      } else if (currentStep === 3) {
        const originalText = nextBtn.textContent;
        nextBtn.textContent = 'Salvando...';
        nextBtn.disabled = true;
        try {
          const pSelect = document.getElementById('transactionPartner');
          const partnerName = (pSelect && pSelect.selectedIndex > 0) ? pSelect.options[pSelect.selectedIndex].text : null;
          const contaLancamentoEl = document.getElementById('contaLancamento');
          const cartaoUsadoId = document.getElementById('cartaoUsado') ? document.getElementById('cartaoUsado').value : null;
          const totalDesejado = valorParaNumero(valorInput.value);
          let chavePixCobrancaSelecionada = null;
          const cobrancaCheckbox = document.getElementById('cobrancaCheckbox');
          if (cobrancaCheckbox && cobrancaCheckbox.checked) {
            if (!pSelect || !pSelect.value) { showToast('Para gerar uma cobrança, o campo "Parceiro" é obrigatório.', 'warning'); nextBtn.textContent = originalText; nextBtn.disabled = false; destacarCampoInvalido(2, 'transactionPartner'); return; }
            if (!contaLancamentoEl.value) { showToast('Selecione a Conta Financeira para o recebimento da cobrança.', 'warning'); nextBtn.textContent = originalText; nextBtn.disabled = false; destacarCampoInvalido(2, 'contaLancamento'); return; }
            const acc = g.accounts.find(a => a.id === contaLancamentoEl.value);
            const hasPixKeys = acc && ((acc.pixKeys && acc.pixKeys.length > 0) || acc.pixKey1 || acc.pixKey2 || acc.pixKey3);
            if (!hasPixKeys) { showToast('A conta selecionada não possui chaves Pix. Configure a conta no menu "Contas".', 'error'); nextBtn.textContent = originalText; nextBtn.disabled = false; destacarCampoInvalido(2, 'contaLancamento'); return; }
            chavePixCobrancaSelecionada = await askPixKeySelection(acc);
            if (!chavePixCobrancaSelecionada) { nextBtn.textContent = originalText; nextBtn.disabled = false; return; }
          }
          if (selectedType === 'expense' && cartaoUsadoId && contaLancamentoEl.value) {
            const acc = g.accounts.find(a => a.id === contaLancamentoEl.value);
            if (acc && acc.cards) {
              const card = acc.cards.find(c => c.id === cartaoUsadoId);
              if (card && !card.isPrepaid) {
                const unpaidOnCard = g.transactions.filter(t => t.accountId === acc.id && t.cardId === cartaoUsadoId && t.type === 'expense' && !t.isPaid);
                const limitUsedTotal = unpaidOnCard.reduce((sum, t) => sum + t.value, 0);
                const availableLimit = card.limit - limitUsedTotal;
                let limitToCompare = availableLimit;
                if (editingTransactionId) { const oldTx = g.transactions.find(t => t.id === editingTransactionId); if (oldTx && !oldTx.isPaid && oldTx.cardId === cartaoUsadoId) { limitToCompare += oldTx.value; } }
                if (totalDesejado > limitToCompare) { showToast('Limite do cartão insuficiente! Disponível: ' + formatCurrency(limitToCompare), 'error'); nextBtn.textContent = originalText; nextBtn.disabled = false; destacarCampoInvalido(2, 'cartaoUsado'); return; }
              }
            }
          }
          if (selectedType !== 'transfer' && !contaLancamentoEl.value) { showToast('Selecione a Conta Financeira.', 'warning'); nextBtn.textContent = originalText; nextBtn.disabled = false; destacarCampoInvalido(2, 'contaLancamento'); return; }
          if (!pagamentoSelect.value) { showToast('Selecione a Forma de pagamento/recebimento.', 'warning'); nextBtn.textContent = originalText; nextBtn.disabled = false; destacarCampoInvalido(2, 'pagamento'); return; }
          const parcelasGroupVisibility = document.getElementById('parcelasGroup');
          const isParcelasRequired = parcelasGroupVisibility && parcelasGroupVisibility.style.display !== 'none';
          const parcelasValue = document.getElementById('parcelas').value;
          if ((selectedType === 'expense' || selectedType === 'income') && isParcelasRequired && !parcelasValue) { showToast('Selecione a quantidade de parcelas.', 'warning'); nextBtn.textContent = originalText; nextBtn.disabled = false; destacarCampoInvalido(2, 'parcelas'); return; }
          const cartaoGroupVisibility = document.getElementById('cartaoGroup');
          const isCartaoRequired = cartaoGroupVisibility && cartaoGroupVisibility.style.display !== 'none';
          if (selectedType === 'expense' && isCartaoRequired && !cartaoUsadoId) { showToast('Selecione o Cartão de Crédito.', 'warning'); nextBtn.textContent = originalText; nextBtn.disabled = false; destacarCampoInvalido(2, 'cartaoUsado'); return; }
          if (selectedType === 'transfer') {
            if (!contaOrigem.value) { showToast('Selecione a conta de Origem.', 'warning'); nextBtn.textContent = originalText; nextBtn.disabled = false; destacarCampoInvalido(2, 'contaOrigem'); return; }
            if (!contaDestino.value) { showToast('Selecione a conta de Destino.', 'warning'); nextBtn.textContent = originalText; nextBtn.disabled = false; destacarCampoInvalido(2, 'contaDestino'); return; }
            if (contaOrigem.value === contaDestino.value) { showToast('A origem e o destino não podem ser iguais.', 'error'); nextBtn.textContent = originalText; nextBtn.disabled = false; destacarCampoInvalido(2, 'contaDestino'); return; }
          }
          let dtLancamento = transactionDateInput ? transactionDateInput.value : dataInput.value;
          let dtVencimento = dataInput.value;
          let dtPagamento = paymentDateInput ? paymentDateInput.value : null;
          let isPrepaidCard = false;
          if (selectedType === 'expense' && cartaoUsadoId && contaLancamentoEl.value) {
            const acc = g.accounts.find(a => a.id === contaLancamentoEl.value);
            if (acc && acc.cards) {
              const card = acc.cards.find(c => c.id === cartaoUsadoId);
              if (card) {
                isPrepaidCard = card.isPrepaid || false;
                if (!isPrepaidCard) { if (!editingTransactionId) { dtVencimento = calcDueDate(dtLancamento, card.closingDay, card.dueDay); } dtPagamento = null; }
                else { dtVencimento = dtLancamento; dtPagamento = dtLancamento; }
              }
            }
          }
          let bIsPaid = transactionPaid ? transactionPaid.checked : true;
          if (!editingTransactionId && selectedType === 'expense' && cartaoUsadoId) { bIsPaid = isPrepaidCard ? true : false; }
          if (!dtLancamento || !dtVencimento) { showToast('Preencha as datas corretamente.', 'error'); nextBtn.textContent = originalText; nextBtn.disabled = false; destacarCampoInvalido(2, 'data'); return; }
          const baseTransaction = {
            type: selectedType, value: totalDesejado, cardId: cartaoUsadoId,
            description: descricaoInput.value.trim() || '(Sem descrição)',
            partnerId: pSelect ? pSelect.value : null, partnerName: partnerName,
            category: categoriaSelect.value, paymentMethod: pagamentoSelect.value,
            isPaid: bIsPaid, paymentDate: dtPagamento, transactionDate: dtLancamento,
            accountId: selectedType !== 'transfer' ? contaLancamentoEl.value : null,
            accountName: selectedType !== 'transfer' ? contaLancamentoEl.options[contaLancamentoEl.selectedIndex].text.split(' (')[0] : null,
            hasBoleto: document.getElementById('boletoCheckbox').checked,
            boletoLine: document.getElementById('boletoLine').value.replace(/\D/g, ''),
            isCobranca: cobrancaCheckbox ? cobrancaCheckbox.checked : false,
            cobrancaPixKey: chavePixCobrancaSelecionada,
            updatedAt: new Date().toISOString()
          };
          if (selectedType === 'transfer') {
            baseTransaction.contaOrigemId = contaOrigem.value;
            baseTransaction.contaOrigem = contaOrigem.options[contaOrigem.selectedIndex]?.text.split(' (')[0];
            baseTransaction.contaDestinoId = contaDestino.value;
            baseTransaction.contaDestino = contaDestino.options[contaDestino.selectedIndex]?.text.split(' (')[0];
          }
          const startDate = dtVencimento;
          if (editingTransactionId) {
            const oldTx = g.transactions.find(t => t.id === editingTransactionId);
            if (oldTx) await processAccountBalance(oldTx, 'revert');
            baseTransaction.date = dtVencimento;
            await userRef('transactions').doc(editingTransactionId).update(baseTransaction);
            const index = g.transactions.findIndex(t => t.id === editingTransactionId);
            if (index !== -1) g.transactions[index] = { ...g.transactions[index], ...sanitizeFirestoreData(baseTransaction) };
            await processAccountBalance(g.transactions[index], 'apply');
            if (baseTransaction.isCobranca) {
              let listaEdicao = [];
              if (g.transactions[index].installmentGroupId) { listaEdicao = g.transactions.filter(t => t.installmentGroupId === g.transactions[index].installmentGroupId); listaEdicao.sort((a, b) => new Date(a.date) - new Date(b.date)); }
              else { listaEdicao = [g.transactions[index]]; }
              window.gerarFaturaCobrancaPDF(listaEdicao);
            }
          } else {
            let transactionsToAdd = [];
            const qtdParcelas = document.getElementById('parcelas') ? (parseInt(document.getElementById('parcelas').value) || 1) : 1;
            if (qtdParcelas > 1) {
              const valorParcela = totalDesejado / qtdParcelas;
              const installmentGroupId = 'grp_' + Date.now();
              for (let i = 1; i <= qtdParcelas; i++) {
                let parcelaDate = new Date(dtVencimento + 'T12:00:00');
                parcelaDate.setMonth(parcelaDate.getMonth() + (i - 1));
                const year = parcelaDate.getFullYear();
                const month = String(parcelaDate.getMonth() + 1).padStart(2, '0');
                const day = String(parcelaDate.getDate()).padStart(2, '0');
                let txParcela = { ...baseTransaction, value: valorParcela, description: baseTransaction.description + ' (' + i + '/' + qtdParcelas + ')', date: year + '-' + month + '-' + day, installmentGroupId: installmentGroupId };
                transactionsToAdd.push({ ...txParcela, createdAt: new Date().toISOString() });
              }
            } else if (recorrenteCheckbox.checked) {
              const freq = frequenciaSelect.value;
              const interval = parseInt(intervaloInput.value) || 1;
              const terminoTipo = terminoTipoSelect.value;
              let terminoValue = null;
              if (terminoTipo === 'until') terminoValue = terminoDataInput.value;
              else if (terminoTipo === 'count') terminoValue = parseInt(terminoCountInput.value) || 1;
              const dates = generateRecurrentDates(dtVencimento, freq, interval, terminoTipo, terminoValue);
              dates.forEach(date => {
                const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0');
                transactionsToAdd.push({ ...baseTransaction, date: year + '-' + month + '-' + day, createdAt: new Date().toISOString() });
              });
            } else { transactionsToAdd.push({ ...baseTransaction, date: dtVencimento, createdAt: new Date().toISOString() }); }
            for (let t of transactionsToAdd) { await saveTransaction(t); await processAccountBalance(t, 'apply'); }
            if (cobrancaCheckbox && cobrancaCheckbox.checked) { window.gerarFaturaCobrancaPDF(transactionsToAdd); if (g.transactions.length > 0) { setEditingTransactionId(g.transactions[g.transactions.length - 1].id); } }
            setCurrentPeriod('month'); setPreviousPeriod('month'); setCurrentStatus('all'); setCurrentType('all'); setCurrentPartner('all');
            window.currentAccountFilter = 'all'; setCustomStartDate(''); setCustomEndDate('');
            if (document.getElementById('periodFilter')) document.getElementById('periodFilter').value = 'month';
            if (document.getElementById('statusFilter')) document.getElementById('statusFilter').value = 'all';
            if (document.getElementById('partnerFilter')) document.getElementById('partnerFilter').value = 'all';
            if (document.getElementById('accountFilter')) document.getElementById('accountFilter').value = 'all';
            if (document.getElementById('customDateStart')) document.getElementById('customDateStart').value = '';
            if (document.getElementById('customDateEnd')) document.getElementById('customDateEnd').value = '';
            document.querySelectorAll('#typeFilter button').forEach(b => { b.classList.remove('active'); if (b.dataset.type === 'all') b.classList.add('active'); });
          }
          renderTransactions(); renderDashboard();
          nextBtn.textContent = originalText; nextBtn.disabled = false;
          goToStep(4);
        } catch (error) { console.error('Erro ao salvar:', error); showToast('Erro de comunicação. Tente novamente.', 'error'); nextBtn.textContent = originalText; nextBtn.disabled = false; }
      }
    });
  }

  if (editFinalBtn) {
    editFinalBtn.addEventListener('click', async () => {
      if (!editingTransactionId) { closeDrawer(); setTimeout(() => { showToast('Nenhuma transação selecionada.', 'error'); }, 300); return; }
      closeDrawer();
      setTimeout(() => {
        const tx = g.transactions.find(t => t.id === editingTransactionId);
        if (tx) openEditTransactionModal(tx);
      }, 300);
    });
  }
  if (deleteFinalBtn) {
    deleteFinalBtn.addEventListener('click', async () => {
      if (!editingTransactionId) return;
      const confirmDelete = await askConfirmation('Tem certeza que deseja excluir este lançamento?', 'Esta ação não pode ser desfeita.');
      if (!confirmDelete) return;
      try {
        const tx = g.transactions.find(t => t.id === editingTransactionId);
        if (tx) await processAccountBalance(tx, 'revert');
        await deleteTransaction(editingTransactionId);
        g.transactions = g.transactions.filter(t => t.id !== editingTransactionId);
        document.getElementById('transactionReceiptPreview').innerHTML = '<p style="color:#5f6368;text-align:center;padding:20px;">Nenhum lançamento selecionado.</p>';
        renderTransactions(); renderDashboard();
        closeDrawer();
        showToast('Lançamento excluído com sucesso!', 'success');
      } catch (error) { console.error('Erro ao excluir:', error); showToast('Erro ao excluir lançamento.', 'error'); }
    });
  }
  if (cloneFinalBtn) {
    cloneFinalBtn.addEventListener('click', () => {
      if (!editingTransactionId) return;
      setEditingTransactionId(null);
      currentStep = 1;
      document.getElementById('mainTitle').textContent = 'Novo Lançamento';
      const nextBtnLabel = document.getElementById('nextBtn');
      if (nextBtnLabel) nextBtnLabel.textContent = 'Avançar';
      goToStep(1);
    });
  }
  if (newTxFinalBtn) newTxFinalBtn.addEventListener('click', () => { setEditingTransactionId(null); document.getElementById('mainTitle').textContent = 'Novo Lançamento'; if (nextBtn) nextBtn.textContent = 'Avançar'; goToStep(1); });
  if (reversePaymentBtn) {
    reversePaymentBtn.addEventListener('click', async () => {
      if (!editingTransactionId) return;
      const tx = g.transactions.find(t => t.id === editingTransactionId);
      if (!tx) { showToast('Transação não encontrada.', 'error'); return; }
      const confirmReverse = await askConfirmation('Deseja realmente estornar o pagamento?', 'O lançamento voltará ao status de "Não Pago".');
      if (!confirmReverse) return;
      try {
        await userRef('transactions').doc(editingTransactionId).update({ isPaid: false, paymentDate: null });
        if (tx) {
          tx.isPaid = false; tx.paymentDate = null;
          if (tx.type === 'income') { if (tx.isCobranca) { /* cobrança estornada */ } }
          await processAccountBalance(tx, 'revert');
        }
        renderTransactions(); renderDashboard();
        if (editingTransactionId) openEditTransactionModal(g.transactions.find(t => t.id === editingTransactionId));
        showToast('Pagamento estornado com sucesso!', 'success');
      } catch (error) { console.error('Erro ao estornar:', error); showToast('Erro ao estornar pagamento.', 'error'); }
    });
  }
  if (payFinalBtn) {
    payFinalBtn.addEventListener('click', async () => {
      if (!editingTransactionId) return;
      const tx = g.transactions.find(t => t.id === editingTransactionId);
      if (!tx) { showToast('Transação não encontrada.', 'error'); return; }
      const payDate = await askPaymentDate('Informe a data do pagamento:');
      if (!payDate) return;
      try {
        await userRef('transactions').doc(editingTransactionId).update({ isPaid: true, paymentDate: payDate });
        if (tx) { tx.isPaid = true; tx.paymentDate = payDate; await processAccountBalance(tx, 'apply'); }
        renderTransactions(); renderDashboard();
        if (editingTransactionId) openEditTransactionModal(g.transactions.find(t => t.id === editingTransactionId));
        showToast('Lançamento marcado como pago!', 'success');
      } catch (error) { console.error('Erro ao pagar:', error); showToast('Erro ao marcar como pago.', 'error'); }
    });
  }
  if (closeFinalBtn) closeFinalBtn.addEventListener('click', closeDrawer);
  if (downloadCobrancaFooterBtn) {
    downloadCobrancaFooterBtn.addEventListener('click', () => {
      if (!editingTransactionId) { showToast('Nenhum lançamento selecionado.', 'warning'); return; }
      const tx = g.transactions.find(t => t.id === editingTransactionId);
      if (!tx) { showToast('Transação não encontrada.', 'error'); return; }
      if (!tx.isCobranca) { showToast('Este lançamento não é uma cobrança.', 'info'); return; }
      let lista = [];
      if (tx.installmentGroupId) { lista = g.transactions.filter(t => t.installmentGroupId === tx.installmentGroupId); lista.sort((a, b) => new Date(a.date) - new Date(b.date)); }
      else { lista = [tx]; }
      window.gerarFaturaCobrancaPDF(lista);
    });
  }

  if (downloadFooterBtn) {
    downloadFooterBtn.addEventListener('click', function() {
      if (!editingTransactionId) { showToast('Nenhum lançamento selecionado.', 'warning'); return; }
      const tx = g.transactions.find(t => t.id === editingTransactionId);
      if (!tx) { showToast('Transação não encontrada.', 'error'); return; }
      const heroPanel = document.getElementById('leftHeroPanel');
      updateReceiptPreview();
      const originalText = this.innerHTML;
      this.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">autorenew</span> Gerando...';
      this.disabled = true;
      const buttons = document.querySelectorAll('.step-content-footer button');
      buttons.forEach(b => { b.style.display = 'none'; });
      const printContent = heroPanel ? heroPanel.cloneNode(true) : document.getElementById('transactionReceiptPreview').cloneNode(true);
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'width: 800px; padding: 40px 50px 80px 50px; background: #ffffff; color: #202124; font-family: Helvetica, Arial, sans-serif;';
      wrapper.innerHTML = '<div style="border-bottom: 2px solid #1a73e8; padding-bottom: 24px; margin-bottom: 32px;"><h1 style="color: #1a73e8; margin: 0; font-size: 1.8rem;">ControlPess</h1><p style="color: #5f6368; margin: 4px 0 0 0;">Comprovante de Lançamento</p></div>';
      wrapper.appendChild(printContent);
      html2pdf().set({ margin: [0.4, 0, 0.8, 0], filename: 'Comprovante_ControlPess_' + new Date().getTime() + '.pdf', image: { type: 'jpeg', quality: 1 }, html2canvas: { scale: 2, useCORS: true, letterRendering: true }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } }).from(wrapper).toPdf().get('pdf').then(function(pdf) {
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) { pdf.setPage(i); pdf.setFontSize(9); pdf.setTextColor(150); const pw = pdf.internal.pageSize.getWidth(); const ph = pdf.internal.pageSize.getHeight(); pdf.text('Documento gerado eletronicamente por ControlPess.', pw / 2, ph - 0.5, { align: 'center' }); pdf.text('Página ' + i + ' de ' + totalPages, pw / 2, ph - 0.3, { align: 'center' }); }
      }).save().then(() => {
        buttons.forEach(b => { b.style.display = ''; });
        downloadFooterBtn.innerHTML = originalText; downloadFooterBtn.disabled = false;
        showToast('Comprovante baixado com sucesso!', 'success');
      }).catch(err => {
        console.error('Erro ao gerar comprovante: ', err);
        buttons.forEach(b => { b.style.display = ''; });
        downloadFooterBtn.innerHTML = originalText; downloadFooterBtn.disabled = false;
        showToast('Erro ao gerar comprovante.', 'error');
      });
    });
  }

  if (btnVerParcelas) {
    btnVerParcelas.addEventListener('click', () => {
      if (!editingTransactionId) { showToast('Nenhum lançamento selecionado.', 'warning'); return; }
      const tx = g.transactions.find(t => t.id === editingTransactionId);
      if (!tx || !tx.installmentGroupId) { showToast('Este lançamento não possui parcelas vinculadas.', 'info'); return; }
      const parcelas = g.transactions.filter(t => t.installmentGroupId === tx.installmentGroupId)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      if (parcelas.length < 2) { showToast('Apenas 1 parcela encontrada. Nada a exibir.', 'info'); return; }
      const total = parcelas.reduce((s, t) => s + t.value, 0);
      let tableRows = '';
      parcelas.forEach((p, idx) => {
        const paidIcon = p.isPaid ? 'check_circle' : 'radio_button_unchecked';
        const paidColor = p.isPaid ? '#188038' : '#e67e22';
        tableRows += '<tr onclick="window.abrirParcelaDoExtrato(\'' + p.id + '\')" style="cursor:pointer;">' +
          '<td style="padding:6px 10px;border-bottom:1px solid #e8eaed;">' + (idx + 1) + '/' + parcelas.length + '</td>' +
          '<td style="padding:6px 10px;border-bottom:1px solid #e8eaed;">' + formatDate(p.date) + '</td>' +
          '<td style="padding:6px 10px;border-bottom:1px solid #e8eaed;">' + formatCurrency(p.value) + '</td>' +
          '<td style="padding:6px 10px;border-bottom:1px solid #e8eaed;"><span class="material-icons" style="font-size:18px;color:' + paidColor + ';">' + paidIcon + '</span></td>' +
          '<td style="padding:6px 10px;border-bottom:1px solid #e8eaed;color:' + paidColor + ';">' + (p.isPaid ? 'Pago' : 'Pendente') + '</td></tr>';
      });
      const dataAtualFormatada = new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR');
      const modalContent = '<div id="extratoParcelasModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;justify-content:center;align-items:center;z-index:10000;">' +
        '<div style="background:#fff;border-radius:16px;padding:30px;max-width:700px;width:90%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;"><h2 style="margin:0;color:#1a73e8;">Extrato de Parcelas</h2><button onclick="this.closest(\'#extratoParcelasModal\').remove()" style="background:none;border:none;cursor:pointer;font-size:1.8rem;color:#5f6368;">&times;</button></div>' +
        '<p style="color:#5f6368;font-size:0.9rem;">Emitido em: ' + dataAtualFormatada + '</p>' +
        '<p style="color:#202124;font-weight:500;">' + tx.description.replace(/\(\d+\/\d+\)/g, '').trim() + '</p>' +
        '<table style="width:100%;border-collapse:collapse;margin-top:16px;"><thead><tr style="background:#f8f9fa;font-weight:500;color:#5f6368;"><th style="padding:8px 10px;text-align:left;">Parcela</th><th style="padding:8px 10px;text-align:left;">Vencimento</th><th style="padding:8px 10px;text-align:left;">Valor</th><th style="padding:8px 10px;text-align:left;">Status</th><th style="padding:8px 10px;text-align:left;"></th></tr></thead><tbody>' + tableRows + '</tbody></table>' +
        '<div style="margin-top:20px;padding-top:16px;border-top:2px solid #e8eaed;display:flex;justify-content:space-between;font-size:1.1rem;"><strong>Total:</strong><span>' + formatCurrency(total) + '</span></div>' +
        '<div style="margin-top:20px;display:flex;gap:10px;justify-content:flex-end;">' +
        '<button onclick="window.exportarExtratoParcelas()" style="background:#1a73e8;color:#fff;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-weight:500;">Exportar PDF</button>' +
        '<button onclick="this.closest(\'#extratoParcelasModal\').remove()" style="background:#f1f3f4;color:#5f6368;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;">Fechar</button></div></div></div>';
      const existingModal = document.getElementById('extratoParcelasModal');
      if (existingModal) existingModal.remove();
      document.body.insertAdjacentHTML('beforeend', modalContent);
      window.exportarExtratoParcelas = function() {
        const txP = g.transactions.find(t => t.id === editingTransactionId);
        if (!txP || !txP.installmentGroupId) { showToast('Nenhum extrato disponível.', 'warning'); return; }
        const pList = g.transactions.filter(t => t.installmentGroupId === txP.installmentGroupId).sort((a, b) => new Date(a.date) - new Date(b.date));
        if (pList.length < 2) { showToast('Apenas uma parcela, extrato não gerado.', 'info'); return; }
        const t = txP.description.replace(/\(\d+\/\d+\)/g, '').trim();
        const d = new Date().toLocaleDateString('pt-BR');
        let r = '<div style="width:800px;padding:40px;font-family:Helvetica,Arial,sans-serif;">' +
          '<div style="border-bottom:2px solid #1a73e8;padding-bottom:20px;margin-bottom:24px;"><h1 style="color:#1a73e8;margin:0;font-size:2rem;">ControlPess</h1><p style="color:#5f6368;margin:4px 0 0;">Extrato de Parcelas</p><p style="color:#5f6368;font-size:0.9rem;margin:2px 0 0;">Emitido em: ' + d + '</p></div>' +
          '<p style="color:#202124;font-weight:500;font-size:1.1rem;">' + t + '</p><table style="width:100%;border-collapse:collapse;margin-top:12px;"><thead><tr style="background:#f8f9fa;"><th style="padding:8px;text-align:left;border-bottom:2px solid #dadce0;">Parcela</th><th style="padding:8px;text-align:left;border-bottom:2px solid #dadce0;">Vencimento</th><th style="padding:8px;text-align:left;border-bottom:2px solid #dadce0;">Valor</th><th style="padding:8px;text-align:left;border-bottom:2px solid #dadce0;">Status</th></tr></thead><tbody>';
        pList.forEach((p, i) => { r += '<tr><td style="padding:6px 8px;border-bottom:1px solid #e8eaed;">' + (i + 1) + '/' + pList.length + '</td><td style="padding:6px 8px;border-bottom:1px solid #e8eaed;">' + formatDate(p.date) + '</td><td style="padding:6px 8px;border-bottom:1px solid #e8eaed;">' + formatCurrency(p.value) + '</td><td style="padding:6px 8px;border-bottom:1px solid #e8eaed;color:' + (p.isPaid ? '#188038' : '#e67e22') + ';">' + (p.isPaid ? 'Pago' : 'Pendente') + '</td></tr>'; });
        r += '</tbody></table><div style="margin-top:16px;padding-top:12px;border-top:2px solid #dadce0;font-weight:500;">Total: ' + formatCurrency(pList.reduce((s, p) => s + p.value, 0)) + '</div></div>';
        html2pdf().set({ margin: [0.4, 0, 0.8, 0], filename: 'Extrato_Parcelas_' + new Date().getTime() + '.pdf', image: { type: 'jpeg', quality: 1 }, html2canvas: { scale: 2, useCORS: true, letterRendering: true }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } }).from(r).save().then(() => showToast('Extrato baixado com sucesso!', 'success')).catch(e => { console.error(e); showToast('Erro ao gerar extrato.', 'error'); });
      };
      window.abrirParcelaDoExtrato = function(id) {
        const existingModal = document.getElementById('extratoParcelasModal');
        if (existingModal) existingModal.remove();
        setEditingTransactionId(id);
        const txx = g.transactions.find(tt => tt.id === id);
        if (txx) openEditTransactionModal(txx);
      };
    });
  }

  const receiptModal = document.getElementById('receiptGenModal');
  const receiptModalOverlay = document.getElementById('receiptGenModalOverlay');
  const receiptPartnerSelect = document.getElementById('receiptPartnerSelect');
  const receiptMonthSelect = document.getElementById('receiptMonthSelect');
  const receiptListContainer = document.getElementById('receiptTransactionsList');
  const rNextBtn = document.getElementById('rNextBtn');
  const rPrevBtn = document.getElementById('rPrevBtn');
  const rStep1 = document.getElementById('rStep1');
  const rStep2 = document.getElementById('rStep2');
  const rTotalDisplay = document.getElementById('rTotalDisplay');
  const selectAllReceiptTx = document.getElementById('selectAllReceiptTx');
  const rDownloadBtn = document.getElementById('rDownloadBtn');

  if (window.btnOpenReceiptGen) {
    window.btnOpenReceiptGen.addEventListener('click', function() {
      if (g.partners.length === 0) { showToast('Nenhum parceiro cadastrado.', 'warning'); return; }
      receiptPartnerSelect.innerHTML = '<option value="" disabled selected>Selecione...</option>';
      g.partners.filter(p => p.active !== false).sort((a, b) => a.name.localeCompare(b.name)).forEach(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; receiptPartnerSelect.appendChild(o); });
      receiptMonthSelect.value = getTodayISO().substring(0, 7);
      rStep1.style.display = 'block'; rStep2.style.display = 'none';
      receiptModalOverlay.style.display = 'flex'; receiptModal.classList.add('open');
    });
  }
  if (receiptPartnerSelect) {
    ['change', 'keydown'].forEach(evt => {
      receiptPartnerSelect.addEventListener(evt, function(e) { receiptMonthSelect.focus(); });
    });
  }
  if (window.btnCloseReceiptGen) window.btnCloseReceiptGen.addEventListener('click', () => { receiptModalOverlay.style.display = 'none'; receiptModal.classList.remove('open'); });
  receiptModalOverlay?.addEventListener('click', (e) => { if (e.target === receiptModalOverlay) { receiptModalOverlay.style.display = 'none'; receiptModal.classList.remove('open'); } });

  if (receiptMonthSelect) {
    receiptMonthSelect.addEventListener('change', function() {
      if (!receiptPartnerSelect.value) { showToast('Selecione um parceiro primeiro.', 'warning'); return; }
      loadReceiptTransactions(receiptPartnerSelect.value, this.value);
    });
  }

  if (rNextBtn) {
    rNextBtn.addEventListener('click', function() {
      if (!checkRStep1Valid()) return;
      goToRStep(2);
    });
  }
  if (rPrevBtn) rPrevBtn.addEventListener('click', () => goToRStep(1));
  if (selectAllReceiptTx) {
    selectAllReceiptTx.addEventListener('change', function() {
      const checkboxes = receiptListContainer.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => { cb.checked = this.checked; });
      updateRTotal();
    });
  }
  if (rDownloadBtn) {
    rDownloadBtn.addEventListener('click', function() {
      const selected = receiptListContainer.querySelectorAll('input[type="checkbox"]:checked');
      if (selected.length === 0) { showToast('Selecione ao menos um lançamento.', 'warning'); return; }
      const ids = Array.from(selected).map(cb => cb.dataset.id);
      const txList = ids.map(id => g.transactions.find(t => t.id === id)).filter(Boolean);
      if (txList.length === 0) { showToast('Nenhum lançamento encontrado.', 'warning'); return; }
      const partnerId = receiptPartnerSelect.value;
      const partner = g.partners.find(p => p.id === partnerId);
      if (!partner) { showToast('Parceiro não encontrado.', 'error'); return; }
      const fullAddress = [partner.street, partner.number, partner.neighborhood, partner.city, partner.state].filter(Boolean).join(', ');
      const monthLabel = receiptMonthSelect.value;
      const [yr, mo] = monthLabel.split('-');
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const monthName = monthNames[parseInt(mo) - 1] + '/' + yr;
      const sortedTx = [...txList].sort((a, b) => new Date(a.date) - new Date(b.date));
      let total = 0;
      let tableRows = '';
      sortedTx.forEach((tx, i) => {
        total += tx.value;
        const ref = String(i + 1).padStart(3, '0');
        const dateStr = formatDate(tx.date);
        const catName = getCategoryNameById(tx.category) || 'Sem categoria';
        tableRows += '<tr><td style="padding:8px;border-bottom:1px solid #e8eaed;">' + ref + '</td><td style="padding:8px;border-bottom:1px solid #e8eaed;">' + dateStr + '</td><td style="padding:8px;border-bottom:1px solid #e8eaed;">' + escapeHtml(tx.description) + '</td><td style="padding:8px;border-bottom:1px solid #e8eaed;">' + catName + '</td><td style="padding:8px;border-bottom:1px solid #e8eaed;text-align:right;">' + formatCurrency(tx.value) + '</td></tr>';
      });
      const html = '<div style="width:800px;padding:40px 50px 80px;font-family:Helvetica,Arial,sans-serif;color:#202124;">' +
        '<div style="border-bottom:2px solid #1a73e8;padding-bottom:20px;margin-bottom:24px;"><h1 style="color:#1a73e8;margin:0;font-size:1.8rem;">Recibo de Prestação de Serviços</h1><p style="color:#5f6368;margin:4px 0 0;">Referente a: ' + monthName + '</p></div>' +
        '<div style="margin-bottom:24px;padding:16px;background:#f8f9fa;border-radius:8px;"><p style="margin:0 0 4px;font-weight:500;">Tomador: ' + escapeHtml(partner.name) + '</p>' + (fullAddress ? '<p style="margin:0;color:#5f6368;">' + escapeHtml(fullAddress) + '</p>' : '') + '<p style="margin:4px 0 0;color:#5f6368;">CNPJ/CPF: ' + (partner.doc || '---') + '</p></div>' +
        '<table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f8f9fa;font-weight:500;color:#5f6368;"><th style="padding:8px;text-align:left;">Ref</th><th style="padding:8px;text-align:left;">Data</th><th style="padding:8px;text-align:left;">Descrição</th><th style="padding:8px;text-align:left;">Categoria</th><th style="padding:8px;text-align:right;">Valor</th></tr></thead><tbody>' + tableRows + '</tbody></table>' +
        '<div style="margin-top:16px;padding-top:12px;border-top:2px solid #202124;display:flex;justify-content:space-between;font-size:1.1rem;font-weight:500;"><span>Total</span><span>' + formatCurrency(total) + '</span></div>' +
        '<div style="margin-top:40px;display:flex;justify-content:space-between;"><div style="text-align:center;border-top:1px solid #202124;padding-top:8px;width:200px;"><span style="color:#5f6368;font-size:0.85rem;">Emitente</span></div><div style="text-align:center;border-top:1px solid #202124;padding-top:8px;width:200px;"><span style="color:#5f6368;font-size:0.85rem;">Tomador</span></div></div></div>';
      this.innerHTML = '<span class="material-icons" style="animation:spin 1s linear infinite;">autorenew</span> Gerando...';
      this.disabled = true;
      html2pdf().set({ margin: [0.4, 0, 0.8, 0], filename: 'Recibo_' + partner.name.replace(/\s+/g, '_') + '_' + monthLabel + '.pdf', image: { type: 'jpeg', quality: 1 }, html2canvas: { scale: 2, useCORS: true, letterRendering: true }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } }).from(html).toPdf().get('pdf').then(function(pdf) {
        const tp = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= tp; i++) { pdf.setPage(i); pdf.setFontSize(9); pdf.setTextColor(150); const pw = pdf.internal.pageSize.getWidth(); const ph = pdf.internal.pageSize.getHeight(); pdf.text('Documento gerado eletronicamente por ControlPess.', pw / 2, ph - 0.5, { align: 'center' }); pdf.text('Página ' + i + ' de ' + tp, pw / 2, ph - 0.3, { align: 'center' }); }
      }).save().then(() => {
        this.innerHTML = '<span class="material-icons">download</span> Baixar Recibo'; this.disabled = false;
        showToast('Recibo gerado com sucesso!', 'success');
      }).catch(e => { console.error(e); this.innerHTML = '<span class="material-icons">download</span> Baixar Recibo'; this.disabled = false; showToast('Erro ao gerar recibo.', 'error'); });
    });
  }

  const billingModalOverlay = document.getElementById('billingGenModalOverlay');
  const billingPartnerSelect = document.getElementById('billingPartnerSelect');
  const billingMonthSelect = document.getElementById('billingMonthSelect');
  const billingListContainer = document.getElementById('billingTransactionsList');
  const bStep1 = document.getElementById('bStep1');
  const bStep2 = document.getElementById('bStep2');
  const bTotalDisplay = document.getElementById('bTotalDisplay');
  const selectAllBillingTx = document.getElementById('selectAllBillingTx');
  const bNextBtn = document.getElementById('bNextBtn');
  const bPrevBtn = document.getElementById('bPrevBtn');
  const bGenerateBtn = document.getElementById('bGenerateBtn');

  if (window.btnOpenBillingGen) {
    window.btnOpenBillingGen.addEventListener('click', function() {
      if (g.partners.length === 0) { showToast('Nenhum parceiro cadastrado.', 'warning'); return; }
      billingPartnerSelect.innerHTML = '<option value="" disabled selected>Selecione...</option>';
      g.partners.filter(p => p.active !== false).sort((a, b) => a.name.localeCompare(b.name)).forEach(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; billingPartnerSelect.appendChild(o); });
      billingMonthSelect.value = getTodayISO().substring(0, 7);
      bStep1.style.display = 'block'; bStep2.style.display = 'none';
      billingModalOverlay.style.display = 'flex';
    });
  }
  if (window.btnCloseBillingGen) {
    window.btnCloseBillingGen.addEventListener('click', () => { billingModalOverlay.style.display = 'none'; });
  }
  billingModalOverlay?.addEventListener('click', (e) => { if (e.target === billingModalOverlay) billingModalOverlay.style.display = 'none'; });

  if (billingMonthSelect) {
    billingMonthSelect.addEventListener('change', function() {
      if (!billingPartnerSelect.value) { showToast('Selecione um parceiro primeiro.', 'warning'); return; }
      loadBillingTransactions(billingPartnerSelect.value, this.value);
    });
  }
  if (bNextBtn) bNextBtn.addEventListener('click', function() { if (checkBStep1Valid()) goToBStep(2); });
  if (bPrevBtn) bPrevBtn.addEventListener('click', () => goToBStep(1));
  if (selectAllBillingTx) {
    selectAllBillingTx.addEventListener('change', function() {
      billingListContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = this.checked; });
      updateBTotal();
    });
  }
  if (bGenerateBtn) {
    bGenerateBtn.addEventListener('click', function() {
      const selected = billingListContainer.querySelectorAll('input[type="checkbox"]:checked');
      if (selected.length === 0) { showToast('Selecione ao menos um lançamento.', 'warning'); return; }
      const txList = Array.from(selected).map(cb => g.transactions.find(t => t.id === cb.dataset.id)).filter(Boolean);
      if (txList.length === 0) { showToast('Nenhum lançamento encontrado.', 'warning'); return; }
      const partnerId = billingPartnerSelect.value;
      const partner = g.partners.find(p => p.id === partnerId);
      if (!partner) { showToast('Parceiro não encontrado.', 'error'); return; }
      const fullAddress = [partner.street, partner.number, partner.neighborhood, partner.city, partner.state].filter(Boolean).join(', ');
      const monthLabel = billingMonthSelect.value;
      const [yr, mo] = monthLabel.split('-');
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const monthName = monthNames[parseInt(mo) - 1] + '/' + yr;
      const sortedTx = [...txList].sort((a, b) => new Date(a.date) - new Date(b.date));
      let total = 0;
      let tableRows = '';
      sortedTx.forEach((tx, i) => {
        total += tx.value;
        const ref = String(i + 1).padStart(3, '0');
        const dateStr = formatDate(tx.date);
        const catName = getCategoryNameById(tx.category) || 'Sem categoria';
        tableRows += '<tr><td style="padding:8px;border-bottom:1px solid #e8eaed;">' + ref + '</td><td style="padding:8px;border-bottom:1px solid #e8eaed;">' + dateStr + '</td><td style="padding:8px;border-bottom:1px solid #e8eaed;">' + escapeHtml(tx.description) + '</td><td style="padding:8px;border-bottom:1px solid #e8eaed;">' + catName + '</td><td style="padding:8px;border-bottom:1px solid #e8eaed;text-align:right;">' + formatCurrency(tx.value) + '</td><td style="padding:8px;border-bottom:1px solid #e8eaed;text-align:center;">' + (tx.isPaid ? '<span style="color:#188038;">✓</span>' : '<span style="color:#e67e22;">○</span>') + '</td></tr>';
      });
      const html = '<div style="width:800px;padding:40px 50px 80px;font-family:Helvetica,Arial,sans-serif;color:#202124;">' +
        '<div style="border-bottom:2px solid #1a73e8;padding-bottom:20px;margin-bottom:24px;"><h1 style="color:#1a73e8;margin:0;font-size:1.8rem;">Fatura de Cobrança</h1><p style="color:#5f6368;margin:4px 0 0;">Referente a: ' + monthName + '</p></div>' +
        '<div style="margin-bottom:24px;padding:16px;background:#f8f9fa;border-radius:8px;"><p style="margin:0 0 4px;font-weight:500;">Cliente: ' + escapeHtml(partner.name) + '</p>' + (fullAddress ? '<p style="margin:0;color:#5f6368;">' + escapeHtml(fullAddress) + '</p>' : '') + '<p style="margin:4px 0 0;color:#5f6368;">CNPJ/CPF: ' + (partner.doc || '---') + '</p></div>' +
        '<table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f8f9fa;font-weight:500;color:#5f6368;"><th style="padding:8px;text-align:left;">Ref</th><th style="padding:8px;text-align:left;">Data</th><th style="padding:8px;text-align:left;">Descrição</th><th style="padding:8px;text-align:left;">Categoria</th><th style="padding:8px;text-align:right;">Valor</th><th style="padding:8px;text-align:center;">Status</th></tr></thead><tbody>' + tableRows + '</tbody></table>' +
        '<div style="margin-top:16px;padding-top:12px;border-top:2px solid #202124;display:flex;justify-content:space-between;font-size:1.1rem;font-weight:500;"><span>Total</span><span>' + formatCurrency(total) + '</span></div>' +
        '<div style="margin-top:40px;display:flex;justify-content:space-between;"><div style="text-align:center;border-top:1px solid #202124;padding-top:8px;width:200px;"><span style="color:#5f6368;font-size:0.85rem;">Emitente</span></div><div style="text-align:center;border-top:1px solid #202124;padding-top:8px;width:200px;"><span style="color:#5f6368;font-size:0.85rem;">Cliente</span></div></div></div>';
      this.innerHTML = '<span class="material-icons" style="animation:spin 1s linear infinite;">autorenew</span> Gerando...';
      this.disabled = true;
      html2pdf().set({ margin: [0.4, 0, 0.8, 0], filename: 'Fatura_Cobranca_' + partner.name.replace(/\s+/g, '_') + '_' + monthLabel + '.pdf', image: { type: 'jpeg', quality: 1 }, html2canvas: { scale: 2, useCORS: true, letterRendering: true }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } }).from(html).toPdf().get('pdf').then(function(pdf) {
        const tp = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= tp; i++) { pdf.setPage(i); pdf.setFontSize(9); pdf.setTextColor(150); const pw = pdf.internal.pageSize.getWidth(); const ph = pdf.internal.pageSize.getHeight(); pdf.text('Documento gerado eletronicamente por ControlPess.', pw / 2, ph - 0.5, { align: 'center' }); pdf.text('Página ' + i + ' de ' + tp, pw / 2, ph - 0.3, { align: 'center' }); }
      }).save().then(() => {
        this.innerHTML = '<span class="material-icons">download</span> Gerar Fatura'; this.disabled = false;
        showToast('Fatura gerada com sucesso!', 'success');
      }).catch(e => { console.error(e); this.innerHTML = '<span class="material-icons">download</span> Gerar Fatura'; this.disabled = false; showToast('Erro ao gerar fatura.', 'error'); });
    });
  }

  const globalSearchInput = document.getElementById('globalSearchInput');
  if (globalSearchInput) {
    globalSearchInput.addEventListener('input', function() {
      const query = this.value.trim().toLowerCase();
      if (query.length < 2) {
        let existingList = document.getElementById('globalSearchResults');
        if (existingList) existingList.remove();
        return;
      }
      const results = g.transactions.filter(t => {
        const desc = (t.description || '').toLowerCase();
        const partner = (t.partnerName || '').toLowerCase();
        const cat = getCategoryNameById(t.category) || '';
        const val = formatCurrency(t.value).toLowerCase();
        return desc.includes(query) || partner.includes(query) || cat.toLowerCase().includes(query) || val.includes(query);
      }).slice(0, 10);
      let existingList = document.getElementById('globalSearchResults');
      if (existingList) existingList.remove();
      if (results.length === 0) return;
      const list = document.createElement('div');
      list.id = 'globalSearchResults';
      list.style.cssText = 'position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #e8eaed;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.15);z-index:9999;max-height:400px;overflow-y:auto;margin-top:4px;';
      results.forEach(r => {
        const item = document.createElement('div');
        item.style.cssText = 'padding:12px 16px;cursor:pointer;border-bottom:1px solid #f1f3f4;display:flex;justify-content:space-between;align-items:center;';
        const sign = r.type === 'income' ? '+' : (r.type === 'expense' ? '-' : '');
        const color = r.type === 'income' ? '#188038' : (r.type === 'expense' ? '#d93025' : '#1a73e8');
        item.innerHTML = '<div><strong>' + escapeHtml(r.description || '(Sem descrição)') + '</strong><br><span style="color:#5f6368;font-size:0.85rem;">' + formatDate(r.date) + ' • ' + (r.partnerName || 'Sem parceiro') + '</span></div><div style="color:' + color + ';font-weight:500;">' + sign + ' ' + formatCurrency(r.value) + '</div>';
        item.addEventListener('click', () => {
          window.abrirResultadoBusca(r.id);
          globalSearchInput.value = '';
          existingList = document.getElementById('globalSearchResults');
          if (existingList) existingList.remove();
        });
        list.appendChild(item);
      });
      globalSearchInput.parentElement.style.position = 'relative';
      globalSearchInput.parentElement.appendChild(list);
    });
  }
  document.addEventListener('click', function(e) {
    const searchList = document.getElementById('globalSearchResults');
    if (searchList && !searchList.contains(e.target) && e.target !== globalSearchInput) searchList.remove();
  });

  window.abrirResultadoBusca = function(id) {
    const tx = g.transactions.find(t => t.id === id);
    if (tx) { openEditTransactionModal(tx); }
    else { showToast('Lançamento não encontrado.', 'error'); }
  };

  window.setActiveView = function(view) {
    document.querySelectorAll('.view-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const targetView = document.getElementById('view' + view.charAt(0).toUpperCase() + view.slice(1));
    if (targetView) targetView.style.display = 'block';
    const targetNav = document.querySelector('.nav-item[data-view="' + view + '"]');
    if (targetNav) targetNav.classList.add('active');
    if (view === 'transactions') try { renderTransactions(); } catch(e) { console.error(e); }
    if (view === 'dashboard') try { window.renderDashboard(); } catch(e) { console.error(e); }
    if (view === 'notifications') try { window.renderNotifications(); } catch(e) { console.error(e); }
  };
}

window.openEditTransactionModal = openEditTransactionModal;

export { initTransactions, renderTransactions, filterTransactions };
