import { auth, db } from './firebase-config.js';
import { sanitizeFirestoreData } from './utils.js';
import { showToast } from './ui-helpers.js';

let currentUser = null;
let editingPartnerId = null;
let editingTransactionId = null;
function setEditingTransactionId(v) { editingTransactionId = v; }
let editingPaymentTypeId = null;
let editingCategoryId = null;
let editingCostCenterId = null;
let editingAccountId = null;
let editingCardIndex = null;
let editingPixKeyIndex = null;
let currentPeriod = 'month';
let currentType = 'all';
let currentStatus = 'all';
let currentView = { value: 'dashboard' };
let privacyActive = localStorage.getItem('controlpess-privacy') === 'true';
function setCurrentUser(v) { currentUser = v; }
function setPrivacyActive(v) { privacyActive = v; }
function setOfxCurrentStep(v) { ofxCurrentStep = v; }
function setOfxCurrentFilter(v) { ofxCurrentFilter = v; }
function setOfxCurrentStatusFilter(v) { ofxCurrentStatusFilter = v; }
function setOfxItemSendoConciliado(v) { ofxItemSendoConciliado = v; }
function setCurrentRStep(v) { currentRStep = v; }
function setReceiptEligibleTxs(v) { receiptEligibleTxs = v; }
function setCurrentBStep(v) { currentBStep = v; }
function setBillingEligibleTxs(v) { billingEligibleTxs = v; }
function setCurrentPeriod(v) { currentPeriod = v; }
function setCurrentStatus(v) { currentStatus = v; }
function setCurrentType(v) { currentType = v; }
function setCurrentPartner(v) { currentPartner = v; }
function setPreviousPeriod(v) { previousPeriod = v; }
function setCustomStartDate(v) { customStartDate = v; }
function setCustomEndDate(v) { customEndDate = v; }
let currentPartner = 'all';
let customStartDate = '';
let customEndDate = '';
let previousPeriod = 'month';
let currentRStep = 1;
let receiptEligibleTxs = [];
let currentBStep = 1;
let billingEligibleTxs = [];
let ofxParsedTransactions = [];
let ofxCurrentStep = 1;
let ofxCurrentFilter = 'all';
let ofxCurrentStatusFilter = 'all';
let ofxItemSendoConciliado = null;
let currentWalletAccId = null;
let invoiceMonthOffset = 0;
let currentWalletCardIndex = 0;
let invoicePaymentData = null;
let accountFormHasChanges = false;
let allBanks = [];
let currentAccountCards = [];
let currentAccountPixKeys = [];
let codeReaderBoleto = null;
let isBoletoCameraRunning = false;

const g = {
    get transactions() { return window.__transactions || []; },
    set transactions(v) { window.__transactions = v; },
    get partners() { return window.__partners || []; },
    set partners(v) { window.__partners = v; },
    get accounts() { return window.__accounts || []; },
    set accounts(v) { window.__accounts = v; },
    get categories() { return window.__categories || []; },
    set categories(v) { window.__categories = v; },
    get costCenters() { return window.__costCenters || []; },
    set costCenters(v) { window.__costCenters = v; },
    get paymentTypes() { return window.__paymentTypes || []; },
    set paymentTypes(v) { window.__paymentTypes = v; },
};

function userRef(collectionName) {
    return db.collection('users').doc(currentUser.uid).collection(collectionName);
}

async function loadUserData() {
    if (!currentUser) return;
    const dataLimite = new Date();
    dataLimite.setMonth(dataLimite.getMonth() - 6);
    const dataLimiteStr = `${dataLimite.getFullYear()}-${String(dataLimite.getMonth() + 1).padStart(2, '0')}-01`;
    try {
        const [txSnapshot, partnersSnapshot, accountsSnapshot, categoriesSnapshot, costCentersSnapshot, paymentTypesSnapshot] = await Promise.all([
            userRef('transactions').where('date', '>=', dataLimiteStr).get(),
            userRef('partners').get(),
            userRef('accounts').get(),
            userRef('categories').get(),
            userRef('costCenters').get(),
            userRef('paymentTypes').get()
        ]);
        g.transactions = txSnapshot.docs.map(doc => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
        g.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        g.partners = partnersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        g.accounts = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        g.categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        g.costCenters = costCentersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        g.paymentTypes = paymentTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showToast('Erro ao carregar dados. Verifique sua conexão.', 'error');
    }
}

async function saveTransaction(transaction) {
    if (!currentUser) return null;
    const { id, ...data } = transaction;
    try {
        const docRef = await userRef('transactions').add(data);
        g.transactions.push({ id: docRef.id, ...data });
        return docRef;
    } catch (error) {
        console.error('Erro ao salvar transação:', error);
        showToast('Erro ao salvar transação. Tente novamente.', 'error');
        return null;
    }
}

async function deleteTransaction(id) {
    if (!currentUser) return false;
    try {
        await userRef('transactions').doc(id).delete();
        g.transactions = g.transactions.filter(t => t.id !== id);
        return true;
    } catch (error) {
        console.error('Erro ao excluir transação:', error);
        showToast('Erro ao excluir transação. Tente novamente.', 'error');
        return false;
    }
}

export {
    currentUser, g, setCurrentUser, setPrivacyActive,
    editingPartnerId, editingTransactionId, setEditingTransactionId,
    editingPaymentTypeId, editingCategoryId, editingCostCenterId,
    editingAccountId, editingCardIndex, editingPixKeyIndex,
    currentPeriod, currentType, currentStatus, currentView, privacyActive,
    currentPartner, customStartDate, customEndDate, previousPeriod,
    currentRStep, receiptEligibleTxs, currentBStep, billingEligibleTxs,
    setCurrentRStep, setReceiptEligibleTxs, setCurrentBStep, setBillingEligibleTxs,
    setCurrentPeriod, setCurrentStatus, setCurrentType, setCurrentPartner,
    setPreviousPeriod, setCustomStartDate, setCustomEndDate,
    ofxParsedTransactions, ofxCurrentStep, ofxCurrentFilter, ofxCurrentStatusFilter,
    setOfxCurrentStep, setOfxCurrentFilter, setOfxCurrentStatusFilter, setOfxItemSendoConciliado,
    ofxItemSendoConciliado, currentWalletAccId, invoiceMonthOffset, currentWalletCardIndex,
    invoicePaymentData, accountFormHasChanges, allBanks, currentAccountCards, currentAccountPixKeys,
    codeReaderBoleto, isBoletoCameraRunning,
    userRef, loadUserData, saveTransaction, deleteTransaction
};
