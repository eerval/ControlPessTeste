import { auth, db } from './firebase-config.js';
import { currentUser, g, userRef } from './state.js';
import { escapeHtml, escapeJsAttr, formatCurrency, formatDate, formatDateISO, getTodayISO, sanitizeFirestoreData, formatarMoeda, valorParaNumero } from './utils.js';
import { criarHtmlCartaoConta } from './factories.js';
import { showToast, askConfirmation, askPixKeySelection } from './ui-helpers.js';
import { updatePrivacyMode } from './theme.js';
import { fetchPaymentTypes } from './settings.js';

// ===================== DOM ELEMENT REFS =====================
const accountsView = document.getElementById('accountsView');
const accountsList = document.getElementById('accountsList');
const accountModal = document.getElementById('accountModal');
const accountBankSearch = document.getElementById('accountBankSearch');
const accountBankValue = document.getElementById('accountBankValue');
const accountBankList = document.getElementById('accountBankList');
const accBankLogo = document.getElementById('accBankLogo');
const accountNameInput = document.getElementById('accountName');
const accountTypeInput = document.getElementById('accountType');
const accountBalanceInput = document.getElementById('accountBalance');
const accountBalanceLabel = document.getElementById('accountBalanceLabel');
const accountBalanceHelper = document.getElementById('accountBalanceHelper');
const accountObservationInput = document.getElementById('accountObservation');
const accountShowDash = document.getElementById('accountShowDash');
const accountIncludeKPI = document.getElementById('accountIncludeKPI');
const accountHasCreditCard = document.getElementById('accountHasCreditCard');
const accountActive = document.getElementById('accountActive');
const accountActiveLabel = document.getElementById('accountActiveLabel');
const tabCartoesBtn = document.getElementById('tabCartoesBtn');
const ccBrandSelect = document.getElementById('ccBrand');
const btnShowCardForm = document.getElementById('btnShowCardForm');
const btnHideCardForm = document.getElementById('btnHideCardForm');
const ccIsPrepaidToggle = document.getElementById('ccIsPrepaid');
const btnSaveCardToList = document.getElementById('btnSaveCardToList');
const btnShowPixKeyForm = document.getElementById('btnShowPixKeyForm');
const btnHidePixKeyForm = document.getElementById('btnHidePixKeyForm');
const newPixKeyType = document.getElementById('newPixKeyType');
const newPixKeyValue = document.getElementById('newPixKeyValue');
const btnSavePixKeyToList = document.getElementById('btnSavePixKeyToList');
const phoneInput = document.getElementById('partnerPhone');
const docInput = document.getElementById('partnerDoc');
const emailInput = document.getElementById('partnerEmail');
const randomInput = document.getElementById('partnerRandomPix');
const modalPixOverlay = document.getElementById('pixQrModal');
const boletoCheckbox = document.getElementById('boletoCheckbox');
const boletoFieldGroup = document.getElementById('boletoFieldGroup');
const boletoLineInput = document.getElementById('boletoLine');
const copyBoletoBtn = document.getElementById('copyBoletoBtn');
const openScannerModalBtn = document.getElementById('openScannerModalBtn');
const scannerModal = document.getElementById('scannerModal');
const closeScannerModalBtn = document.getElementById('closeScannerModalBtn');
const tabScanner = document.getElementById('tabScanner');
const tabImagem = document.getElementById('tabImagem');
const contentScanner = document.getElementById('contentScanner');
const contentImagem = document.getElementById('contentImagem');
const btnUploadBoletoImage = document.getElementById('btnUploadBoletoImage');
const boletoPhotoInput = document.getElementById('boletoPhotoInput');
const scanStatus = document.getElementById('scanStatus');

// ===================== LOCAL STATE =====================
let editingAccountId = null;
let editingCardIndex = null;
let editingPixKeyIndex = null;
let currentAccountCards = [];
let currentAccountPixKeys = [];
let allBanks = [];
let currentWalletAccId = null;
let invoiceMonthOffset = 0;
let currentWalletCardIndex = 0;
let invoicePaymentData = null;
let accountFormHasChanges = false;
let codeReaderBoleto = null;
let isBoletoCameraRunning = false;

// =============================================================
//  FACTORY: LAYOUT DA CARTEIRA (APPLE WALLET)
// =============================================================
function criarHtmlLayoutCarteira(props) {
    const htmlFatura = props.isPrepaid ? '' : `
        <div style="background: ${props.faturaBg}; border-radius: 22px; padding: 22px 22px 20px 22px; margin-bottom: 12px; border: 1px solid ${props.isDark ? (props.cardColor + '40') : 'rgba(0,0,0,0.05)'}; box-shadow: ${props.isDark ? '0 8px 32px rgba(0,0,0,0.35)' : '0 12px 30px rgba(0,0,0,0.07)'};">
            <div style="display: inline-flex; align-items: center; gap: 6px; background: ${props.statusColor}1f; border: 1px solid ${props.statusColor}33; border-radius: 20px; padding: 4px 12px; margin-bottom: 14px;">
                <div style="width: 6px; height: 6px; border-radius: 50%; background: ${props.statusColor};"></div>
                <span style="color: ${props.statusColor}; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.8px;">${escapeHtml(props.statusText)}</span>
            </div>
            <p style="color: ${props.subTextColor}; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Total da Fatura</p>
            <h2 style="font-size: 2.4rem; font-weight: 800; color: ${props.totalDisplayColor}; margin: 0 0 18px 0; letter-spacing: -1.5px; line-height: 1;">${props.displayInvoiceTotal}</h2>
            <div style="border-top: 1px solid ${props.borderColor}; margin-bottom: 16px;"></div>
            <div style="display: flex; gap: 0; margin-bottom: ${props.faturaPendenteTotal > 0 ? '18px' : '0'};">
                <div style="flex: 1; padding-right: 16px; border-right: 1px solid ${props.borderColor};">
                    <p style="color: ${props.subTextColor}; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">Pago</p>
                    <p style="font-size: 1.05rem; font-weight: 700; color: ${props.isDark ? '#81c995' : '#188038'}; margin: 0;">${formatCurrency(props.faturaTotal - props.faturaPendenteTotal)}</p>
                </div>
                <div style="flex: 1; padding-left: 16px;">
                    <p style="color: ${props.subTextColor}; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">Pendente</p>
                    <p style="font-size: 1.05rem; font-weight: 700; color: ${props.faturaPendenteTotal > 0 ? (props.isDark ? '#ff8a80' : '#d93025') : (props.isDark ? '#81c995' : '#188038')}; margin: 0;">${formatCurrency(props.faturaPendenteTotal)}</p>
                </div>
            </div>
            ${props.faturaPendenteTotal > 0 ? `
            <button onclick="prepararPagamentoFatura('${escapeJsAttr(props.accountId)}', '${escapeJsAttr(props.cardId)}', '${escapeJsAttr(props.targetMonthStr)}')"
                    style="width: 100%; background: ${props.cardColor}; color: white; border: none; padding: 13px 20px; border-radius: 14px; font-size: 0.95rem; font-weight: 600; cursor: pointer; letter-spacing: 0.2px; box-shadow: 0 6px 15px ${props.cardColor}2e; transition: opacity 0.2s, transform 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;"
                    onmouseover="this.style.opacity='0.88'; this.style.transform='translateY(-1px)'"
                    onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)'">
                <span class="material-icons" style="font-size: 1.1rem;">credit_card</span>
                Pagar Fatura
                <span class="material-icons" style="font-size: 1rem; margin-left: auto;">arrow_forward</span>
            </button>` : ''}
        </div>`;

    const htmlLimite = `
        <div style="background: ${props.limitBg}; border-radius: 16px; padding: 16px 20px; margin-bottom: 12px; border: 1px solid ${props.borderColor}; box-shadow: ${props.isDark ? '0 4px 16px rgba(0,0,0,0.15)' : '0 4px 14px rgba(0,0,0,0.05)'};">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
                <p style="color: ${props.subTextColor}; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; margin: 0;">${props.isPrepaid ? 'Saldo da Conta' : 'Limite Disponível'}</p>
                ${!props.isPrepaid ? `<span style="font-size: 0.72rem; color: ${props.subTextColor};">${props.usedPct}% utilizado</span>` : ''}
            </div>
            <p style="font-size: 1.35rem; font-weight: 700; color: ${props.textColor}; margin: 0 0 10px 0; letter-spacing: -0.5px;">${props.available}</p>
            ${!props.isPrepaid ? `
            <div style="width: 100%; height: 6px; background: ${props.isDark ? 'var(--cor-superficie-dark)' : '#f1f3f4'}; border-radius: 999px; overflow: hidden;">
                <div style="height: 100%; width: ${Math.min(props.usedPct, 100)}%; background: ${props.usedPct > 80 ? (props.isDark ? '#ff8a80' : '#d93025') : props.usedPct > 50 ? '#e67e22' : props.cardColor}; border-radius: 999px;"></div>
            </div>
            <p style="font-size: 0.72rem; color: ${props.subTextColor}; margin: 6px 0 0 0;">${props.limitUsedTotal} de ${props.limit} utilizados</p>` : ''}
        </div>`;

    return `
        <div class="wallet-desktop-grid">
            <div class="wallet-left-col">
                <div style="position: relative; margin-bottom: 12px; padding: 0 36px;">
                    ${props.arrowsHtml}
                    <div style="background: linear-gradient(135deg, ${props.cardColor}, #1a1a2e); border-radius: 16px; padding: 16px 24px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 8px 24px rgba(0,0,0,0.18); overflow: hidden; position: relative;">
                        <div style="position: absolute; top: -60%; left: -10%; width: 120%; height: 220%; background: radial-gradient(ellipse at top left, rgba(255,255,255,0.12) 0%, transparent 65%); pointer-events: none;"></div>
                        <div style="position: relative; z-index: 2;">
                            <span style="font-size: 1.1rem; font-family: 'Courier New', monospace; letter-spacing: 3px; color: white; font-weight: 700; opacity: 0.95;">•••• ${escapeHtml(props.cardLast4)}</span>
                            <p style="font-size: 0.75rem; color: rgba(255,255,255,0.7); margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">${escapeHtml(props.cardName)}</p>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px; position: relative; z-index: 2;">
                            <div style="width: 64px; height: 44px; display: flex; align-items: center; justify-content: flex-end; filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));">
                                ${props.brandLogo}
                            </div>
                        </div>
                    </div>
                </div>
                ${props.dotsHtml}

                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px;">
                    <button onclick="abrirCarteira('${escapeJsAttr(props.accountId)}', -1, false)" style="background: ${props.arrowBg}; border: none; color: ${props.arrowColor}; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; transition: background 0.2s;"><span class="material-icons" style="font-size: 1.2rem;">chevron_left</span></button>
                    <div style="text-align: center; display: flex; flex-direction: column; gap: 2px;">
                        <span style="font-size: 0.75rem; font-weight: 700; color: ${props.subTextColor}; text-transform: uppercase; letter-spacing: 1px;">${escapeHtml(props.navTitle)}</span>
                        <span style="font-size: 1.15rem; font-weight: 700; color: ${props.textColor}; letter-spacing: -0.2px;">${escapeHtml(props.navMonth)}</span>
                    </div>
                    <button onclick="abrirCarteira('${escapeJsAttr(props.accountId)}', 1, false)" style="background: ${props.arrowBg}; border: none; color: ${props.arrowColor}; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; transition: background 0.2s;"><span class="material-icons" style="font-size: 1.2rem;">chevron_right</span></button>
                </div>

                ${htmlFatura}
                ${htmlLimite}
            </div>

            <div class="wallet-right-col">
                <div style="background: ${props.limitBg}; border-radius: 14px; padding: 0 18px 4px 18px; border: 1px solid ${props.borderColor}; box-shadow: none; display: flex; flex-direction: column; height: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid ${props.borderColor}; margin-bottom: 8px;">
                        <span style="font-size: 0.75rem; font-weight: 700; color: ${props.subTextColor}; text-transform: uppercase; letter-spacing: 0.6px;">Lançamentos</span>
                        <span style="font-size: 0.75rem; font-weight: 600; color: ${props.subTextColor};">${props.txsCount} ${props.txsCount === 1 ? 'item' : 'itens'}</span>
                    </div>
                    <div class="wallet-tx-scroll-area">
                        ${props.txHtml}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// =============================================================
//  INTELIGÊNCIA CENTRAL DE LOGOTIPOS (BLINDADA COM ISPB)
// =============================================================
function getBankLogoHtml(bankName, ispb) {
    if (!bankName || bankName === 'Outros') {
        return '<span class="material-icons" style="color: #9aa0a6;">account_balance_wallet</span>';
    }

    const ispbDomainMap = {
        '00000000': 'bb.com.br',
        '00360305': 'caixa.gov.br',
        '60701190': 'itau.com.br',
        '60746948': 'bradesco.com.br',
        '90400888': 'santander.com.br',
        '18236120': 'nubank.com.br',
        '00416968': 'bancointer.com.br',
        '31872495': 'c6bank.com.br',
        '22896431': 'picpay.com',
        '10573521': 'mercadopago.com.br',
        '13220451': 'pagbank.com.br',
        'FLASH': 'flashapp.com.br'
    };

    let domain = null;

    if (ispb && ispbDomainMap[ispb]) {
        domain = ispbDomainMap[ispb];
    } else {
        const upperName = bankName.toUpperCase();
        if (upperName.includes('MERCANTIL DO BRASIL')) domain = 'mercantildobrasil.com.br';
        else if (upperName.includes('BRASIL') && upperName.includes('BCO DO')) domain = 'bb.com.br';
        else if (upperName.includes('SANTANDER')) domain = 'santander.com.br';
        else if (upperName.includes('CAIXA ECONOMICA') || upperName === 'CAIXA') domain = 'caixa.gov.br';
        else if (upperName.includes('ITAÚ') || upperName.includes('ITAU')) domain = 'itau.com.br';
        else if (upperName.includes('BRADESCO')) domain = 'bradesco.com.br';
        else if (upperName.includes('NUBANK') || upperName.includes('NU PAGAMENTOS')) domain = 'nubank.com.br';
        else if (upperName.includes('INTER')) domain = 'bancointer.com.br';
        else if (upperName.includes('C6')) domain = 'c6bank.com.br';
        else if (upperName.includes('PICPAY')) domain = 'picpay.com';
        else if (upperName.includes('FLASH')) domain = 'flashapp.com.br';
        else if (upperName.includes('MERCADO PAGO')) domain = 'mercadopago.com.br';
        else if (upperName.includes('PAGSEGURO')) domain = 'pagbank.com.br';
        else if (upperName.includes('SICREDI')) domain = 'sicredi.com.br';
        else if (upperName.includes('SICOOB')) domain = 'sicoob.com.br';
        else if (upperName.includes('BTG')) domain = 'btgpactual.com';
        else if (upperName.includes('XP')) domain = 'xpi.com.br';
        else if (upperName.includes('NEON')) domain = 'banconeon.com.br';
    }

    const safeName = encodeURIComponent(bankName.replace(/'/g, ""));
    const fallbackAvatar = `https://ui-avatars.com/api/?name=${safeName}&background=random&color=fff&size=80`;

    if (domain) {
        const googleIcon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        return `<img src="${googleIcon}" onerror="this.onerror=null; this.src='${fallbackAvatar}';" style="width: 100%; height: 100%; object-fit: contain; padding: 6px; border-radius: 12px;">`;
    }

    return `<img src="${fallbackAvatar}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 12px;">`;
}

// =============================================================
//  BUSCAR BANCOS NA BRASIL API
// =============================================================
async function fetchBanksFromAPI() {
    if (allBanks.length > 0) return;
    try {
        const res = await fetch('https://brasilapi.com.br/api/banks/v1');
        const data = await res.json();
        allBanks = data.filter(b => b.code && b.name);

        allBanks.push({ ispb: 'FLASH', code: '---', name: 'FLASH BENEFÍCIOS' });

        const picpay = allBanks.find(b => b.ispb === '22896431');
        if (picpay) picpay.name = 'PICPAY (INSTITUIÇÃO DE PAGAMENTO)';

        allBanks.sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
        console.error("Erro ao buscar bancos", e);
    }
}

// =============================================================
//  RENDERIZAR LISTA DE BANCOS
// =============================================================
function renderBankList(filterText = '') {
    const topBanks = [
        'BCO DO BRASIL S.A.', 'CAIXA ECONOMICA FEDERAL', 'BCO SANTANDER (BRASIL) S.A.',
        'ITAÚ UNIBANCO S.A.', 'BCO BRADESCO S.A.', 'NU PAGAMENTOS S.A. - INSTITUIÇÃO DE PAGAMENTO',
        'BCO INTER S.A.', 'PICPAY (INSTITUIÇÃO DE PAGAMENTO)', 'MERCADO PAGO INSTITUIÇÃO DE PAGAMENTO LTDA.',
        'FLASH BENEFÍCIOS'
    ];
    let html = `<div class="custom-dropdown-item" data-ispb="Outros" data-name="Outros">Outro Banco / Carteira Física</div>`;

    const lowerFilter = filterText.toLowerCase();

    if (filterText === '') {
        topBanks.forEach(tb => {
            const bank = allBanks.find(b => b.name === tb);
            if (bank) html += `<div class="custom-dropdown-item" data-ispb="${bank.ispb}" data-name="${bank.name}"><strong>${bank.code}</strong> - ${bank.name}</div>`;
        });
        html += `<div style="padding: 4px 16px; font-size: 0.8rem; color: #9aa0a6; background: #f8f9fa;">Comece a digitar para ver mais bancos...</div>`;
    } else {
        const filteredBanks = allBanks.filter(b => b.name.toLowerCase().includes(lowerFilter) || (b.code && b.code.toString().includes(lowerFilter)));
        filteredBanks.forEach(b => {
            html += `<div class="custom-dropdown-item" data-ispb="${b.ispb}" data-name="${b.name}"><strong>${b.code}</strong> - ${b.name}</div>`;
        });
        if (filteredBanks.length === 0) html += `<div style="padding: 12px 16px; color: #d93025;">Nenhum banco encontrado.</div>`;
    }

    accountBankList.innerHTML = html;

    document.querySelectorAll('.custom-dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            const ispb = item.getAttribute('data-ispb');
            const name = item.getAttribute('data-name');

            accountBankValue.value = ispb;
            accountBankSearch.value = name === 'Outros' ? 'Outro Banco / Carteira Física' : name;
            accountBankList.style.display = 'none';

            accBankLogo.style.background = (ispb === 'Outros') ? 'white' : 'transparent';
            accBankLogo.innerHTML = getBankLogoHtml(name, ispb);
        });
    });
}

// =============================================================
//  CARREGAR E RENDERIZAR CONTAS
// =============================================================
async function loadAccounts() {
    if (!currentUser) return;
    const snapshot = await userRef('accounts').get();
    g.accounts = snapshot.docs.map(doc => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
    renderAccounts();
}

function renderAccounts() {
    if (g.accounts.length === 0) {
        accountsList.innerHTML = '<div class="empty-message" style="grid-column: 1 / -1;">Nenhuma conta cadastrada. Clique em "Nova conta" para começar.</div>';
        return;
    }

    const typeFilter = document.getElementById('accountTypeFilter')?.value || 'all';
    const statusFilter = document.getElementById('accountStatusFilter')?.value || 'all';

    let filtered = g.accounts.filter(a => {
        if (typeFilter !== 'all' && a.type !== typeFilter) return false;
        if (statusFilter === 'active' && a.active === false) return false;
        if (statusFilter === 'inactive' && a.active !== false) return false;
        return true;
    });

    let html = '';
    filtered.forEach(acc => {
        const statusClass = acc.active !== false ? 'acc-active' : 'acc-inactive';
        const statusText = acc.active !== false ? 'ATIVA' : 'INATIVA';
        const balClass = acc.balance < 0 ? 'negative' : '';

        let logoHtml = getBankLogoHtml(acc.bankName, acc.bankIspb);

        let iconesExtras = '';
        if (acc.hasCreditCard) {
            iconesExtras += `<span class="material-icons" style="font-size:1.2rem; color:#1a73e8; cursor:pointer; padding:4px; margin:-4px; border-radius:50%; background:rgba(26,115,232,0.1);" title="Abrir Fatura" onclick="event.stopPropagation(); abrirCarteira('${escapeJsAttr(acc.id)}')">credit_card</span>`;
        }
        if (acc.showOnDashboard) {
            iconesExtras += `<span class="material-icons" style="font-size:1.1rem; color:#1a73e8;" title="No Dashboard">dashboard</span>`;
        }

        const subtituloConta = `${acc.bankName || 'Outros'} • ${acc.type}`;
        const saldoFormatado = formatCurrency(acc.balance || 0);

        html += criarHtmlCartaoConta(acc.id, logoHtml, statusClass, statusText, acc.name, subtituloConta, balClass, saldoFormatado, iconesExtras);
    });
    accountsList.innerHTML = html;

    document.querySelectorAll('.account-card').forEach(card => {
        card.addEventListener('click', () => openAccountDetails(card.dataset.id));
    });

    updatePrivacyMode();
}

// =============================================================
//  ABRIR RESUMO DA CONTA
// =============================================================
function openAccountDetails(id) {
    const acc = g.accounts.find(a => a.id === id);
    if (!acc) return;

    document.getElementById('detAccountName').textContent = acc.name;
    document.getElementById('detBankLogo').innerHTML = getBankLogoHtml(acc.bankName, acc.bankIspb);

    const balFormat = formatCurrency(acc.balance || 0);
    const isNegative = acc.balance < 0;

    const balElement = document.getElementById('detAccountBalance');
    balElement.textContent = balFormat;
    balElement.style.color = isNegative ? '#d93025' : '';

    document.getElementById('detBalanceDay').textContent = balFormat;
    document.getElementById('detBalanceDay').style.color = isNegative ? '#d93025' : '';

    document.getElementById('detBalanceAvailable').textContent = balFormat;
    document.getElementById('detBalanceAvailable').style.color = isNegative ? '#d93025' : '';

    document.getElementById('detAccountType').textContent = acc.type;

    const tabConta = document.getElementById('bbTabConta');
    const tabCartao = document.getElementById('bbTabCartao');
    const contentConta = document.getElementById('accDetailsContent');
    const contentCartao = document.getElementById('accWalletContent');

    tabConta.classList.add('active');
    tabCartao.classList.remove('active');
    contentConta.style.display = 'block';
    contentCartao.style.display = 'none';
    document.getElementById('accountDetailsModal').classList.remove('expanded');

    tabConta.onclick = () => {
        tabConta.classList.add('active');
        tabCartao.classList.remove('active');
        contentConta.style.display = 'block';
        contentCartao.style.display = 'none';
        document.getElementById('accountDetailsModal').classList.remove('expanded');
    };

    if (acc.hasCreditCard) {
        tabCartao.style.display = 'block';
        tabCartao.onclick = () => {
            tabCartao.classList.add('active');
            tabConta.classList.remove('active');
            contentConta.style.display = 'none';
            contentCartao.style.display = 'block';
            abrirCarteira(id, 0, true, true);
        };
    } else {
        tabCartao.style.display = 'none';
    }

    const btnConfig = document.getElementById('btnOpenConfig');
    btnConfig.onclick = () => {
        document.getElementById('accountDetailsModal').style.display = 'none';
        openAccountModal(id);
    };

    document.getElementById('accountDetailsModal').style.display = 'flex';
}

// =============================================================
//  ABRIR MODAL DE CONTA (NOVO OU EDIÇÃO)
// =============================================================
async function openAccountModal(id = null) {
    editingAccountId = id;
    document.getElementById('accountModalTitle').textContent = id ? 'Editar Conta' : 'Nova Conta';
    await fetchBanksFromAPI();

    if (id) {
        const acc = g.accounts.find(a => a.id === id);

        if (acc && acc.isSystem) {
            document.getElementById('deleteAccountBtn').style.display = 'none';
        } else {
            document.getElementById('deleteAccountBtn').style.display = 'inline-block';
        }

        accountBankValue.value = acc.bankIspb || 'Outros';
        accountBankSearch.value = (acc.bankIspb !== 'Outros' && acc.bankName) ? acc.bankName : 'Outro Banco / Carteira Física';
        accBankLogo.innerHTML = getBankLogoHtml(acc.bankName, acc.bankIspb);
        accBankLogo.style.background = (acc.bankIspb === 'Outros') ? 'white' : 'transparent';

        accountNameInput.value = acc.name;
        accountTypeInput.value = acc.type;

        accountBalanceLabel.textContent = 'Saldo Atual (R$)';
        accountBalanceInput.value = formatCurrency(acc.balance);
        accountBalanceInput.disabled = true;
        accountBalanceHelper.textContent = 'O saldo só pode ser alterado através de Lançamentos ou Transferências.';
        accountBalanceHelper.style.color = '#5f6368';

        accountObservationInput.value = acc.observation || '';
        accountShowDash.checked = acc.showOnDashboard !== false;
        accountIncludeKPI.checked = acc.includeInKPI !== false;
        accountHasCreditCard.checked = acc.hasCreditCard === true;
        accountActive.checked = acc.active !== false;

        document.getElementById('accountLimitType').value = acc.limitType || 'individual';
        document.getElementById('accountGlobalLimit').value = acc.globalLimit ? formatCurrency(acc.globalLimit) : '';

        currentAccountPixKeys = acc.pixKeys ? [...acc.pixKeys] : [];
        if (currentAccountPixKeys.length === 0) {
            if (acc.pixKey1) currentAccountPixKeys.push({ type: 'Desconhecido', value: acc.pixKey1 });
            if (acc.pixKey2) currentAccountPixKeys.push({ type: 'Desconhecido', value: acc.pixKey2 });
            if (acc.pixKey3) currentAccountPixKeys.push({ type: 'Desconhecido', value: acc.pixKey3 });
        }

        currentAccountCards = acc.cards ? [...acc.cards] : [];

        if (acc.hasCreditCard && currentAccountCards.length === 0 && acc.ccName) {
            currentAccountCards.push({
                id: 'legacy_' + Date.now(), name: acc.ccName, last4: '****', brand: 'Outra', typeFormat: 'Físico',
                limit: acc.ccLimit || 0, color: acc.ccColor || '#ff7a00', isPrepaid: false,
                closingDay: acc.ccClosingDay || 1, dueDay: acc.ccDueDay || 10
            });
        }

    } else {
        document.getElementById('deleteAccountBtn').style.display = 'none';
        document.getElementById('accountForm').reset();

        accountBankValue.value = '';
        accountBankSearch.value = '';
        accBankLogo.innerHTML = '<span class="material-icons" style="color: #9aa0a6;">account_balance</span>';
        accBankLogo.style.background = 'white';

        accountBalanceLabel.textContent = 'Saldo Inicial (R$) *';
        accountBalanceInput.value = 'R$ 0,00';
        accountBalanceInput.disabled = false;
        accountBalanceHelper.textContent = 'Defina o saldo para começar. (Não editável depois)';
        accountBalanceHelper.style.color = '#1a73e8';

        accountShowDash.checked = true;
        accountIncludeKPI.checked = true;
        accountHasCreditCard.checked = false;
        accountActive.checked = true;

        currentAccountPixKeys = [];

        currentAccountCards = [];
    }

    renderAccountCardsList();
    document.getElementById('cardFormView').style.display = 'none';
    document.getElementById('cardsListView').style.display = 'block';

    renderAccountPixKeysList();
    document.getElementById('pixKeyFormView').style.display = 'none';
    document.getElementById('pixKeysListView').style.display = 'block';

    accountHasCreditCard.dispatchEvent(new Event('change'));
    accountActive.dispatchEvent(new Event('change'));

    await fetchPaymentTypes();
    const chipsContainer = document.getElementById('accountPaymentTypesContainer');
    chipsContainer.innerHTML = '';

    const accPaymentTypes = id ? (g.accounts.find(a => a.id === id).acceptedPaymentTypes || []) : [];

    g.paymentTypes.filter(pt => pt.active !== false).forEach(pt => {
        const isChecked = id ? accPaymentTypes.includes(pt.id) : true;
        chipsContainer.innerHTML += `
            <div class="payment-chip">
                <input type="checkbox" id="chip_pt_${pt.id}" value="${pt.id}" ${isChecked ? 'checked' : ''}>
                <label for="chip_pt_${pt.id}">${pt.description}</label>
            </div>
        `;
    });

    function verificarExibicaoPix() {
        const pixConfigDiv = document.getElementById('accountPixConfig');
        let temPixMarcado = false;

        document.querySelectorAll('#accountPaymentTypesContainer input[type="checkbox"]:checked').forEach(cb => {
            const label = document.querySelector(`label[for="${cb.id}"]`);
            if (label && label.textContent.toLowerCase().includes('pix')) {
                temPixMarcado = true;
            }
        });

        pixConfigDiv.style.display = temPixMarcado ? 'block' : 'none';
    }

    document.querySelectorAll('#accountPaymentTypesContainer input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', verificarExibicaoPix);
    });

    verificarExibicaoPix();

    document.querySelector('[data-target="tabContaGeral"]').click();
    accountModal.style.display = 'flex';

    setTimeout(() => { accountFormHasChanges = false; }, 100);
}

// =============================================================
//  INTELIGÊNCIA DE LOGOTIPOS DE BANDEIRA E CORES DOS BANCOS
// =============================================================
function getBankColorByIspb(ispb, bankName) {
    const map = {
        '00000000': '#fced22',
        '00360305': '#005ca9',
        '60701190': '#ec7000',
        '60746948': '#cc092f',
        '90400888': '#cc0000',
        '18236120': '#8a05be',
        '00416968': '#ff7a00',
        '31872495': '#242424',
        '22896431': '#11c76f',
        '10573521': '#009ee3',
        '13220451': '#00aba5',
        'FLASH': '#e20f54'
    };
    if (ispb && map[ispb]) return map[ispb];

    const upperName = (bankName || '').toUpperCase();
    if (upperName.includes('BRASIL') && upperName.includes('BCO DO')) return '#fced22';
    if (upperName.includes('SANTANDER')) return '#cc0000';
    if (upperName.includes('CAIXA')) return '#005ca9';
    if (upperName.includes('ITAÚ') || upperName.includes('ITAU')) return '#ec7000';
    if (upperName.includes('BRADESCO')) return '#cc092f';
    if (upperName.includes('NUBANK')) return '#8a05be';
    if (upperName.includes('INTER')) return '#ff7a00';
    if (upperName.includes('C6')) return '#242424';
    if (upperName.includes('PICPAY')) return '#11c76f';
    if (upperName.includes('MERCADO PAGO')) return '#009ee3';
    if (upperName.includes('PAGSEGURO')) return '#00aba5';
    if (upperName.includes('SICREDI')) return '#00a54f';
    if (upperName.includes('SICOOB')) return '#003641';
    if (upperName.includes('BTG')) return '#181e4b';
    if (upperName.includes('XP')) return '#000000';
    if (upperName.includes('NEON')) return '#00e5ff';
    return '#1a73e8';
}

function getBrandLogoHtml(brand) {
    let logoUrl = '';
    switch (brand) {
        case 'Mastercard': logoUrl = 'assets/img/mastercard.png'; break;
        case 'Visa': logoUrl = 'assets/img/visa.png'; break;
        case 'Elo': logoUrl = 'assets/img/elo.png'; break;
        case 'American Express': logoUrl = 'assets/img/amex.png'; break;
        case 'Hipercard': logoUrl = 'assets/img/hipercard.png'; break;
        default: return '<span class="material-icons" style="color: #9aa0a6;">credit_card</span>';
    }
    return `<img src="${logoUrl}" onerror="this.outerHTML='<span class=\\'material-icons\\' style=\\'color: #9aa0a6;\\'>credit_card</span>'" style="width: 100%; height: 100%; object-fit: contain; padding: 4px;">`;
}

// =============================================================
//  RENDERIZAR LISTA DE CARTÕES
// =============================================================
function renderAccountCardsList() {
    const listEl = document.getElementById('innerCardsList');
    if (currentAccountCards.length === 0) {
        listEl.innerHTML = '<div class="empty-card-list" style="text-align: center; padding: 2rem; color: #9aa0a6; background: #f8f9fa; border-radius: 16px; border: 1px dashed #dadce0;">Nenhum cartão cadastrado.</div>';
        return;
    }

    let html = '';
    currentAccountCards.forEach((card, index) => {
        const limitTxt = card.isPrepaid ? 'Pré-pago' : formatCurrency(card.limit);
        html += `
        <div class="card-list-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-radius: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 44px; height: 32px; border-radius: 6px; background: white; border: 1px solid #e8eaed; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05); flex-shrink: 0;">
                    ${getBrandLogoHtml(card.brand)}
                </div>
                <div>
                    <p style="font-weight: 600; font-size: 0.95rem; color: #202124; margin-bottom: 2px; display: flex; align-items: center; gap: 6px;">
                        ${card.name} 
                        <span style="color: #9aa0a6; font-weight: normal; font-size: 0.85rem;">• ${card.last4}</span>
                        ${card.isDefault ? `<span class="material-icons" style="font-size: 1.1rem; color: #f59e0b;" title="Cartão Principal do Dashboard">star</span>` : ''}
                    </p>
                    <p style="color: #5f6368; font-size: 0.8rem;">${card.typeFormat} | Limite: ${limitTxt}</p>
                </div>
            </div>
            <div style="display: flex; gap: 4px;">
                <button type="button" onclick="editCardInList(${index})" style="width: 32px; height: 32px; border: none; background: transparent; color: #5f6368; cursor: pointer; display: flex; align-items: center; justify-content: center;"><span class="material-icons" style="font-size: 1.2rem;">edit</span></button>
                <button type="button" onclick="removeCardFromList(${index})" style="width: 32px; height: 32px; border: none; background: transparent; color: #d93025; cursor: pointer; display: flex; align-items: center; justify-content: center;"><span class="material-icons" style="font-size: 1.2rem;">delete</span></button>
            </div>
        </div>`;
    });
    listEl.innerHTML = html;
}

window.removeCardFromList = function (index) {
    currentAccountCards.splice(index, 1);
    accountFormHasChanges = true;
    renderAccountCardsList();
};

window.editCardInList = function (index) {
    editingCardIndex = index;
    const card = currentAccountCards[index];

    document.getElementById('cardFormTitle').textContent = 'Editar Cartão';

    document.getElementById('ccName').value = card.name;
    document.getElementById('ccLast4').value = card.last4 || '';
    document.getElementById('ccBrand').value = card.brand || 'Outra';
    document.getElementById('ccBrandLogoBox').innerHTML = getBrandLogoHtml(card.brand || 'Outra');
    document.getElementById('ccTypeFormat').value = card.typeFormat || 'Físico';
    document.getElementById('ccLimit').value = card.limit > 0 ? formatCurrency(card.limit) : '';

    const limitType = document.getElementById('accountLimitType').value;
    document.getElementById('ccLimit').parentElement.style.display = limitType === 'shared' ? 'none' : 'block';

    const ispb = document.getElementById('accountBankValue').value;
    const bankName = document.getElementById('accountBankSearch').value;
    document.getElementById('ccColor').value = card.color || getBankColorByIspb(ispb, bankName);

    const isPrepaidEl = document.getElementById('ccIsPrepaid');
    if (isPrepaidEl) {
        isPrepaidEl.checked = card.isPrepaid || false;
        isPrepaidEl.dispatchEvent(new Event('change'));
    }

    const isDefaultEl = document.getElementById('ccIsDefault');
    if (isDefaultEl) {
        isDefaultEl.checked = card.isDefault || false;
    }

    document.getElementById('ccClosingDay').value = card.closingDay || '';
    document.getElementById('ccDueDay').value = card.dueDay || '';

    const saveAccountBtnMaster = document.getElementById('saveAccount');
    if (saveAccountBtnMaster) {
        saveAccountBtnMaster.disabled = true;
        saveAccountBtnMaster.style.opacity = '0.5';
        saveAccountBtnMaster.style.cursor = 'not-allowed';
    }

    document.getElementById('cardsListView').style.display = 'none';
    document.getElementById('cardFormView').style.display = 'block';
};

// =============================================================
//  RENDERIZAR LISTA DE CHAVES PIX
// =============================================================
function renderAccountPixKeysList() {
    const listEl = document.getElementById('innerPixKeysList');
    const btnAdd = document.getElementById('btnShowPixKeyForm');

    if (currentAccountPixKeys.length >= 5) {
        if (btnAdd) btnAdd.style.display = 'none';
    } else {
        if (btnAdd) btnAdd.style.display = 'flex';
    }

    if (currentAccountPixKeys.length === 0) {
        listEl.innerHTML = '<div style="text-align: center; padding: 1.5rem; color: #9aa0a6; background: transparent; border-radius: 12px; border: 1px dashed #dadce0; font-size: 0.85rem;">Nenhuma chave cadastrada.</div>';
        return;
    }

    let html = '';
    currentAccountPixKeys.forEach((pk, index) => {
        let icon = 'vpn_key';
        if (pk.type === 'CPF/CNPJ') icon = 'badge';
        else if (pk.type === 'Celular') icon = 'smartphone';
        else if (pk.type === 'E-mail') icon = 'email';
        else if (pk.type === 'Aleatória') icon = 'shuffle';

        html += `
        <div class="card-list-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 12px; border: 1px solid #e8eaed; margin-bottom: 2px;">
            <div style="display: flex; align-items: center; gap: 12px; overflow: hidden;">
                <span class="material-icons" style="color: #1a73e8; font-size: 1.3rem; background: rgba(26,115,232,0.1); padding: 6px; border-radius: 8px;">${icon}</span>
                <div style="overflow: hidden;">
                    <p style="font-weight: 600; font-size: 0.95rem; color: #202124; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${pk.value}</p>
                    <p style="color: #5f6368; font-size: 0.75rem;">${pk.type}</p>
                </div>
            </div>
            <div style="display: flex; gap: 2px; flex-shrink: 0;">
                <button type="button" onclick="editPixKeyInList(${index})" style="width: 32px; height: 32px; border: none; background: transparent; color: #5f6368; cursor: pointer; display: flex; align-items: center; justify-content: center;"><span class="material-icons" style="font-size: 1.1rem;">edit</span></button>
                <button type="button" onclick="removePixKeyFromList(${index})" style="width: 32px; height: 32px; border: none; background: transparent; color: #d93025; cursor: pointer; display: flex; align-items: center; justify-content: center;"><span class="material-icons" style="font-size: 1.1rem;">delete</span></button>
            </div>
        </div>`;
    });
    listEl.innerHTML = html;
}

window.removePixKeyFromList = function (index) {
    currentAccountPixKeys.splice(index, 1);
    accountFormHasChanges = true;
    renderAccountPixKeysList();
};

window.editPixKeyInList = function (index) {
    editingPixKeyIndex = index;
    const pk = currentAccountPixKeys[index];

    document.getElementById('pixKeyFormTitle').textContent = 'Editar Chave Pix';

    const typeSelect = document.getElementById('newPixKeyType');
    typeSelect.value = pk.type === 'Desconhecido' ? 'Aleatória' : pk.type;

    const inputVal = document.getElementById('newPixKeyValue');
    typeSelect.dispatchEvent(new Event('change'));
    inputVal.value = pk.value;

    const saveAccountBtnMaster = document.getElementById('saveAccount');
    if (saveAccountBtnMaster) {
        saveAccountBtnMaster.disabled = true;
        saveAccountBtnMaster.style.opacity = '0.5';
        saveAccountBtnMaster.style.cursor = 'not-allowed';
    }

    document.getElementById('pixKeysListView').style.display = 'none';
    document.getElementById('pixKeyFormView').style.display = 'block';
};

// =============================================================
//  QR CODE PIX (MINIATURA, GERAÇÃO E MODAL)
// =============================================================
function updateMiniQrCard() {
    const wrapper = document.getElementById('miniQrCardWrapper');
    const box = document.getElementById('miniQrBox');
    if (!wrapper || !box) return;

    let chave = '', tipo = '';

    if (document.getElementById('partnerDocIsPix').checked && document.getElementById('partnerDoc').value.trim()) {
        chave = document.getElementById('partnerDoc').value;
        tipo = 'Documento';
    } else if (document.getElementById('partnerPhoneIsPix').checked && document.getElementById('partnerPhone').value.trim()) {
        chave = document.getElementById('partnerPhone').value;
        tipo = 'Celular';
    } else if (document.getElementById('partnerEmailIsPix').checked && document.getElementById('partnerEmail').value.trim()) {
        chave = document.getElementById('partnerEmail').value;
        tipo = 'E-mail';
    } else if (document.getElementById('partnerRandomPixIsPix') && document.getElementById('partnerRandomPixIsPix').checked && document.getElementById('partnerRandomPix').value.trim()) {
        chave = document.getElementById('partnerRandomPix').value;
        tipo = 'Aleatória';
    }

    if (chave) {
        wrapper.style.display = 'flex';
        box.innerHTML = '';
        const nome = document.getElementById('partnerName').value || 'Recebedor';

        const payload = gerarPayloadPix(chave, nome, tipo);

        if (typeof QRCode !== 'undefined') {
            new QRCode(box, {
                text: payload, width: 160, height: 160,
                colorDark: "#202124", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.L
            });
        }

        document.getElementById('miniQrCard').onclick = () => abrirModalQrPixBigger(chave, nome, payload);
    } else {
        wrapper.style.display = 'none';
    }
}

function gerarPayloadPix(chaveOrig, nome, tipoChave = '') {
    let chave = String(chaveOrig).trim();

    if (!tipoChave) {
        if (chave.includes('@')) tipoChave = 'E-mail';
        else if (chave.includes('-') && chave.length > 20) tipoChave = 'Aleatória';
        else if (chave.includes('(')) tipoChave = 'Celular';
        else tipoChave = 'Documento';
    }

    if (tipoChave === 'E-mail' || chave.includes('@')) {
    } else if (tipoChave === 'Aleatória') {
    } else {
        let apenasNumeros = chave.replace(/\D/g, '');

        if (tipoChave === 'Celular') {
            if (!apenasNumeros.startsWith('55')) {
                apenasNumeros = '55' + apenasNumeros;
            }
            chave = '+' + apenasNumeros;
        } else {
            chave = apenasNumeros;
        }
    }

    let nomeFormatado = nome.substring(0, 25).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z ]/g, "");
    if (!nomeFormatado) nomeFormatado = "RECEBEDOR";

    const payloadFormat = '000201';
    const merchantAccountInfo = `26${(22 + chave.length).toString().padStart(2, '0')}0014br.gov.bcb.pix01${chave.length.toString().padStart(2, '0')}${chave}`;
    const merchantCategoryCode = '52040000';
    const transactionCurrency = '5303986';
    const countryCode = '5802BR';
    const merchantName = `59${nomeFormatado.length.toString().padStart(2, '0')}${nomeFormatado}`;
    const merchantCity = `6008BRASILIA`;
    const additionalDataFieldTemplate = '62070503***';

    let payload = payloadFormat + merchantAccountInfo + merchantCategoryCode + transactionCurrency + countryCode + merchantName + merchantCity + additionalDataFieldTemplate + '6304';

    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021;
            else crc = crc << 1;
        }
    }
    return payload + (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function abrirModalQrPixBigger(chave, nome, payload) {
    document.getElementById('pixQrKeyLabel').textContent = `Chave: ${chave}`;
    const qrContainer = document.getElementById('qrcodeBoxBig');
    if (qrContainer) qrContainer.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, {
            text: payload, width: 220, height: 220,
            colorDark: "#202124", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M
        });
    }
    document.getElementById('pixQrModal').style.display = 'flex';
}

// =============================================================
//  BOLETO (CÂMERA, SCANNER, CÓDIGO DE BARRAS)
// =============================================================
function stopBoletoCamera() {
    if (codeReaderBoleto) {
        codeReaderBoleto.reset();
    }
    isBoletoCameraRunning = false;
}

function startBoletoCamera() {
    if (isBoletoCameraRunning) return;

    if (!codeReaderBoleto) codeReaderBoleto = new ZXing.BrowserMultiFormatReader();

    isBoletoCameraRunning = true;

    codeReaderBoleto.decodeFromVideoDevice(undefined, 'cameraVideo', (result, err) => {
        if (result) {
            const codeFound = result.text.replace(/\D/g, '');

            if (codeFound.length === 44) {
                document.getElementById('boletoLine').value = codeFound;

                scanStatus.style.display = 'block';
                scanStatus.textContent = 'Código lido com sucesso!';
                scanStatus.style.color = '#188038';

                window.updateReceiptPreview?.();
                closeBoletoScanner();
            } else {
                scanStatus.style.display = 'block';
                scanStatus.textContent = 'Focando no código do boleto...';
                scanStatus.style.color = '#e67e22';
            }
        }
    }).catch(err => {
        console.error("Erro na Câmera:", err);
        isBoletoCameraRunning = false;
    });
}

function closeBoletoScanner() {
    stopBoletoCamera();
    scannerModal.style.display = 'none';
}

// =============================================================
//  CARTEIRA DE CRÉDITO (APPLE WALLET)
// =============================================================
window.mudarCartaoCarteira = function (direction) {
    const acc = g.accounts.find(a => a.id === currentWalletAccId);
    if (!acc || !acc.cards) return;

    currentWalletCardIndex += direction;

    if (currentWalletCardIndex >= acc.cards.length) currentWalletCardIndex = 0;
    if (currentWalletCardIndex < 0) currentWalletCardIndex = acc.cards.length - 1;

    window.abrirCarteira(currentWalletAccId, 0, false);
};

window.abrirCarteira = function (accountId, offset = 0, resetCard = true) {
    currentWalletAccId = accountId;
    invoiceMonthOffset += offset;

    if (offset === 0 && resetCard) {
        invoiceMonthOffset = 0;
        currentWalletCardIndex = 0;
    }

    document.getElementById('accountDetailsModal').style.display = 'flex';
    document.getElementById('accountDetailsModal').classList.add('expanded');
    document.getElementById('bbTabCartao').classList.add('active');
    document.getElementById('bbTabConta').classList.remove('active');
    document.getElementById('accWalletContent').style.display = 'block';
    document.getElementById('accDetailsContent').style.display = 'none';

    const acc = g.accounts.find(a => a.id === accountId);

    if (acc) {
        document.getElementById('detAccountName').textContent = acc.name;
        document.getElementById('detBankLogo').innerHTML = getBankLogoHtml(acc.bankName, acc.bankIspb);

        const balFormat = formatCurrency(acc.balance || 0);
        const isNegative = acc.balance < 0;

        const balElement = document.getElementById('detAccountBalance');
        balElement.textContent = balFormat;
        balElement.style.color = isNegative ? '#d93025' : '';

        document.getElementById('detBalanceDay').textContent = balFormat;
        document.getElementById('detBalanceDay').style.color = isNegative ? '#d93025' : '';

        document.getElementById('detBalanceAvailable').textContent = balFormat;
        document.getElementById('detBalanceAvailable').style.color = isNegative ? '#d93025' : '';

        document.getElementById('detAccountType').textContent = acc.type;

        const btnConfig = document.getElementById('btnOpenConfig');
        btnConfig.onclick = () => {
            document.getElementById('accountDetailsModal').style.display = 'none';
            openAccountModal(accountId);
        };
    }

    if (!acc || !acc.hasCreditCard || !acc.cards || acc.cards.length === 0) {
        document.getElementById('accWalletContent').innerHTML = '<div style="text-align: center; padding: 3rem 1rem; color: #9aa0a6;">Nenhum cartão cadastrado.</div>';
        return;
    }

    if (currentWalletCardIndex >= acc.cards.length) currentWalletCardIndex = 0;
    const activeCard = acc.cards[currentWalletCardIndex];

    let arrowsHtml = '';
    let dotsHtml = '<div style="height: 24px;"></div>';
    if (acc.cards.length > 1) {
        arrowsHtml = `
            <button onclick="mudarCartaoCarteira(-1)" style="position:absolute; left:2px; top:50%; transform:translateY(-50%); z-index:10; background:rgba(0,0,0,0.6); border:none; color:white; border-radius:50%; width:32px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); backdrop-filter: blur(4px);"><span class="material-icons" style="font-size: 1.2rem;">chevron_left</span></button>
            <button onclick="mudarCartaoCarteira(1)" style="position:absolute; right:2px; top:50%; transform:translateY(-50%); z-index:10; background:rgba(0,0,0,0.6); border:none; color:white; border-radius:50%; width:32px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); backdrop-filter: blur(4px);"><span class="material-icons" style="font-size: 1.2rem;">chevron_right</span></button>
        `;
        dotsHtml = `
            <div style="display: flex; justify-content: center; gap: 6px; margin-top: 12px; margin-bottom: 24px;">
                ${acc.cards.map((_, i) => `<div style="width: 6px; height: 6px; border-radius: 50%; background: ${i === currentWalletCardIndex ? '#1a73e8' : (document.body.classList.contains('dark-mode') ? 'var(--cor-borda-dark)' : '#dadce0')}; transition: background 0.3s;"></div>`).join('')}
            </div>
        `;
    }

    const today = new Date();
    let baseM = today.getMonth();
    let baseY = today.getFullYear();

    if (!activeCard.isPrepaid) {
        const currentDay = today.getDate();
        const closingDay = parseInt(activeCard.closingDay) || 1;
        const dueDay = parseInt(activeCard.dueDay) || 10;

        let faturaAtualM = baseM;
        let faturaAtualY = baseY;
        if (dueDay < closingDay) {
            faturaAtualM++;
            if (faturaAtualM > 11) { faturaAtualM = 0; faturaAtualY++; }
        }

        const faturaAtualStr = `${faturaAtualY}-${String(faturaAtualM + 1).padStart(2, '0')}`;

        const faturaAtualTemPendente = g.transactions.some(t =>
            t.accountId === accountId &&
            t.type === 'expense' &&
            (t.cardId === activeCard.id || (acc.limitType === 'shared' && t.cardId)) &&
            t.date.startsWith(faturaAtualStr) &&
            !t.isPaid
        );

        const vencimentoJaPassou = currentDay > dueDay;

        if (vencimentoJaPassou && !faturaAtualTemPendente) {
            baseM++;
            if (baseM > 11) { baseM = 0; baseY++; }
            if (dueDay < closingDay) {
                baseM++;
                if (baseM > 11) { baseM = 0; baseY++; }
            }
        } else if (!vencimentoJaPassou && currentDay >= closingDay) {
            if (dueDay < closingDay) {
                baseM++;
                if (baseM > 11) { baseM = 0; baseY++; }
            }
        }
    }

    baseM += invoiceMonthOffset;
    while (baseM > 11) { baseM -= 12; baseY++; }
    while (baseM < 0) { baseM += 12; baseY--; }

    const targetMonthStr = `${baseY}-${String(baseM + 1).padStart(2, '0')}`;
    const targetMonth = baseM;
    const targetYear = baseY;

    const isShared = acc.limitType === 'shared';

    const txs = g.transactions.filter(t => {
        if (t.accountId !== accountId || t.type !== 'expense' || !t.date.startsWith(targetMonthStr)) return false;
        if (isShared && t.cardId) return true;
        return t.cardId === activeCard.id;
    });
    const faturaTotal = txs.reduce((sum, t) => sum + t.value, 0);

    const pendentesNestaFatura = txs.filter(t => !t.isPaid);
    const faturaPendenteTotal = pendentesNestaFatura.reduce((sum, t) => sum + t.value, 0);

    const allUnpaidTxs = g.transactions.filter(t => {
        if (t.accountId !== accountId || t.type !== 'expense' || t.isPaid) return false;
        if (isShared && t.cardId) return true;
        return t.cardId === activeCard.id;
    });
    const limitUsedTotal = allUnpaidTxs.reduce((sum, t) => sum + t.value, 0);

    const limit = isShared ? (acc.globalLimit || 0) : (activeCard.limit || 0);

    const available = activeCard.isPrepaid ? (acc.balance || 0) : Math.max(limit - limitUsedTotal, 0);
    const usedPct = activeCard.isPrepaid ? 0 : (limit > 0 ? Math.round((limitUsedTotal / limit) * 100) : 0);

    const isDark = document.body.classList.contains('dark-mode');

    const limitBg = isDark ? 'var(--cor-superficie-dark)' : '#ffffff';
    const faturaBg = isDark ? 'var(--cor-superficie-dark)' : '#ffffff';

    const textColor = isDark ? '#e3e3e3' : '#202124';
    const subTextColor = isDark ? '#9aa0a6' : '#5f6368';
    const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    const arrowBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    const arrowColor = isDark ? '#e0e0e0' : '#202124';

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const dueDay = parseInt(activeCard.dueDay) || 10;
    const dueDateStr = `${String(dueDay).padStart(2, '0')}/${String(targetMonth + 1).padStart(2, '0')}`;

    let statusText = '', statusColor = '';
    if (activeCard.isPrepaid) {
        if (invoiceMonthOffset < 0) {
            statusText = `HISTÓRICO FECHADO`; statusColor = subTextColor;
        } else if (invoiceMonthOffset === 0) {
            statusText = `COMPRAS DO MÊS`; statusColor = isDark ? '#8ab4f8' : '#1a73e8';
        } else {
            statusText = `MÊS FUTURO`; statusColor = subTextColor;
        }
    } else {
        const _closingDay = parseInt(activeCard.closingDay) || 1;
        const _dueDay = parseInt(activeCard.dueDay) || 10;
        const _today = new Date();
        const _currentDay = _today.getDate();
        const _currentM = _today.getMonth();
        const _currentY = _today.getFullYear();

        const isFaturaDoMesAtual = (targetMonth === _currentM && targetYear === _currentY);

        if (faturaTotal > 0 && faturaPendenteTotal === 0) {
            statusText = `PAGA`; statusColor = isDark ? '#81c995' : '#188038';
        } else if (targetYear < _currentY || (targetYear === _currentY && targetMonth < _currentM)) {
            statusText = `FECHADA • VENCEU ${dueDateStr}`; statusColor = isDark ? '#ff8a80' : '#d93025';
        } else if (isFaturaDoMesAtual) {
            if (_currentDay < _closingDay) {
                statusText = `ABERTA • VENCE ${dueDateStr}`; statusColor = '#e67e22';
            } else if (_currentDay >= _closingDay && _currentDay <= _dueDay) {
                statusText = `FECHADA • VENCE ${dueDateStr}`; statusColor = isDark ? '#ff8a80' : '#d93025';
            } else {
                statusText = `VENCIDA • VENCEU ${dueDateStr}`; statusColor = isDark ? '#ff8a80' : '#d93025';
            }
        } else {
            statusText = `FUTURA • VENCE ${dueDateStr}`; statusColor = subTextColor;
        }
    }

    arrowsHtml = '';
    dotsHtml = '<div style="height: 24px;"></div>';
    if (acc.cards.length > 1) {
        arrowsHtml = `
            <button onclick="mudarCartaoCarteira(-1)" style="position:absolute; left:2px; top:50%; transform:translateY(-50%); z-index:10; background:${arrowBg}; border:none; color:${arrowColor}; border-radius:50%; width:36px; height:36px; cursor:pointer; display:flex; align-items:center; justify-content:center; backdrop-filter: blur(4px); transition: background 0.2s;"><span class="material-icons" style="font-size: 1.2rem;">chevron_left</span></button>
            <button onclick="mudarCartaoCarteira(1)" style="position:absolute; right:2px; top:50%; transform:translateY(-50%); z-index:10; background:${arrowBg}; border:none; color:${arrowColor}; border-radius:50%; width:36px; height:36px; cursor:pointer; display:flex; align-items:center; justify-content:center; backdrop-filter: blur(4px); transition: background 0.2s;"><span class="material-icons" style="font-size: 1.2rem;">chevron_right</span></button>
        `;
        dotsHtml = `
            <div style="display: flex; justify-content: center; gap: 6px; margin-top: 12px; margin-bottom: 24px;">
                ${acc.cards.map((_, i) => `<div style="width: 6px; height: 6px; border-radius: 50%; background: ${i === currentWalletCardIndex ? (activeCard.color || '#1a73e8') : (isDark ? 'var(--cor-borda-dark)' : '#dadce0')}; transition: background 0.3s;"></div>`).join('')}
            </div>
        `;
    }

    let txHtml = '';
    if (txs.length === 0) {
        txHtml = `
        <div style="text-align: center; padding: 3rem 1rem; display: flex; flex-direction: column; align-items: center;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: ${isDark ? 'rgba(255,255,255,0.05)' : '#f1f3f4'}; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                <span class="material-icons" style="color: ${subTextColor};">check</span>
            </div>
            <span style="color: ${subTextColor}; font-size: 0.9rem;">Nenhuma compra nesta fatura.</span>
        </div>`;
    } else {
        txs.sort((a, b) => {
            const dateDiff = new Date(b.date) - new Date(a.date);
            if (dateDiff !== 0) return dateDiff;
            const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
            const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
            return timeB - timeA;
        }).forEach(t => {
            const isSettled = activeCard.isPrepaid || t.isPaid;
            const itemStyle = (!activeCard.isPrepaid && t.isPaid) ? 'opacity: 0.55;' : '';
            const paidCheckIcon = isSettled
                ? `<span class="material-icons" style="color: ${isDark ? '#81c995' : '#188038'}; font-size: 1.1rem; vertical-align: middle; margin-left: 4px;">check_circle</span>`
                : '';
            const clockIconHtml = isSettled
                ? ''
                : `<span class="material-icons" style="font-size: 11px; opacity: 0.8;">schedule</span>`;

            const valueColor = isSettled ? (isDark ? '#81c995' : '#188038') : textColor;

            txHtml += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid ${borderColor}; cursor: pointer; ${itemStyle}" onclick="document.getElementById('accountDetailsModal').style.display='none'; setActiveView('transactions'); setTimeout(()=>openEditTransactionModal('${escapeJsAttr(t.id)}'), 300)">
                <div style="flex: 1; padding-right: 12px; overflow: hidden;">
                    <p style="font-weight: 500; font-size: 0.88rem; color: ${textColor}; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(t.description)}">${escapeHtml(t.description)}</p>
                    <div style="display: flex; align-items: center; gap: 4px; color: ${subTextColor}; font-size: 0.72rem;">
                        ${clockIconHtml}
                        ${formatDate(t.date)}
                    </div>
                </div>
                <div style="font-weight: 700; font-size: 0.88rem; color: ${valueColor}; display: flex; align-items: center; white-space: nowrap;">
                    ${formatCurrency(t.value)}${paidCheckIcon}
                </div>
            </div>`;
        });
    }

    const displayInvoiceTotal = activeCard.isPrepaid ? faturaTotal : (faturaPendenteTotal > 0 ? faturaPendenteTotal : faturaTotal);
    const totalDisplayColor = (!activeCard.isPrepaid && faturaPendenteTotal === 0 && faturaTotal > 0) ? (isDark ? '#81c995' : '#188038') : textColor;

    const propsCarteira = {
        arrowsHtml, dotsHtml,
        cardColor: activeCard.color || '#ff7a00',
        cardLast4: activeCard.last4 || '0000',
        cardName: activeCard.name,
        brandLogo: getBrandLogoHtml(activeCard.brand),
        accountId, cardId: activeCard.id,
        arrowBg, arrowColor,
        navTitle: activeCard.isPrepaid ? 'EXTRATO' : 'FATURA',
        navMonth: `${monthNames[targetMonth]} ${targetYear}`,
        subTextColor, textColor,
        isPrepaid: activeCard.isPrepaid,
        faturaBg, isDark, statusColor, statusText, totalDisplayColor,
        displayInvoiceTotal: formatCurrency(displayInvoiceTotal),
        borderColor, faturaPendenteTotal, faturaTotal, targetMonthStr,
        limitBg, usedPct,
        available: formatCurrency(available),
        limitUsedTotal: formatCurrency(limitUsedTotal),
        limit: formatCurrency(limit),
        txsCount: txs.length, txHtml
    };

    document.getElementById('accWalletContent').innerHTML = criarHtmlLayoutCarteira(propsCarteira);

    if (window.walletChartInstance) {
        window.walletChartInstance.destroy();
        window.walletChartInstance = null;
    }
};

// =============================================================
//  PAGAMENTO DE FATURA EM LOTE
// =============================================================
window.prepararPagamentoFatura = function (accountId, cardId, targetMonthStr) {
    const acc = g.accounts.find(a => a.id === accountId);
    const isShared = acc && acc.limitType === 'shared';

    const txsPagar = g.transactions.filter(t => {
        if (t.accountId !== accountId || t.type !== 'expense' || !t.date.startsWith(targetMonthStr) || t.isPaid) return false;
        if (isShared && t.cardId) return true;
        return t.cardId === cardId;
    });

    const total = txsPagar.reduce((sum, t) => sum + t.value, 0);
    if (total <= 0) return;

    invoicePaymentData = { accountId, cardId, txsPagar, total };

    document.getElementById('payInvoiceTotalDisplay').textContent = formatCurrency(total);
    document.getElementById('payInvoiceModal').style.display = 'flex';
};

// =============================================================
//  INIT ACCOUNTS (EVENT LISTENERS)
// =============================================================
function initAccounts() {
    // ---- Close Account Details ----
    if (document.getElementById('closeAccountDetailsBtn')) document.getElementById('closeAccountDetailsBtn').addEventListener('click', () => {
        if (document.getElementById('accountDetailsModal')) document.getElementById('accountDetailsModal').style.display = 'none';
    });

    if (document.getElementById('accountDetailsModal')) document.getElementById('accountDetailsModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('accountDetailsModal')) {
            document.getElementById('accountDetailsModal').style.display = 'none';
        }
    });

    // ---- Bank Search Events ----
    accountBankSearch.addEventListener('focus', () => {
        renderBankList(accountBankSearch.value);
        accountBankList.style.display = 'block';
    });

    accountBankSearch.addEventListener('input', (e) => {
        renderBankList(e.target.value);
        accountBankList.style.display = 'block';
        accountBankValue.value = '';
    });

    document.addEventListener('click', (e) => {
        if (!document.getElementById('bankSelectorBox').contains(e.target)) {
            accountBankList.style.display = 'none';
        }
    });

    // ---- Open Account Modal ----
    if (document.getElementById('openAccountModalBtn')) document.getElementById('openAccountModalBtn').addEventListener('click', () => openAccountModal());

    // ---- Close Account Modal (X and Cancel) ----
    if (document.getElementById('closeAccountModal')) document.getElementById('closeAccountModal').addEventListener('click', () => {
        if (accountFormHasChanges) {
            showToast('Você tem alterações não salvas! Por favor, clique em "Salvar Conta" no rodapé.', 'warning');
            return;
        }
        accountModal.style.display = 'none';
    });

    if (document.getElementById('cancelAccount')) document.getElementById('cancelAccount').addEventListener('click', () => {
        if (accountFormHasChanges) {
            showToast('Você tem alterações não salvas! Por favor, clique em "Salvar Conta" no rodapé.', 'warning');
            return;
        }
        accountModal.style.display = 'none';
    });

    // ---- Close Account Modal by clicking overlay ----
    accountModal.addEventListener('click', (e) => {
        if (e.target === accountModal) {
            if (accountFormHasChanges) {
                showToast('Você tem alterações não salvas! Por favor, clique em "Salvar Conta" no rodapé.', 'warning');
                return;
            }
            accountModal.style.display = 'none';
        }
    });

    // ---- Account Form Changes Tracker ----
    if (document.getElementById('accountForm')) { const af = document.getElementById('accountForm'); af.addEventListener('input', () => { accountFormHasChanges = true; }); af.addEventListener('change', () => { accountFormHasChanges = true; }); }

    // ---- Balance Input Mask ----
    accountBalanceInput.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length === 0) { e.target.value = ''; return; }
        e.target.value = formatarMoeda(value);
    });

    // ---- Account Active Toggle ----
    accountActive.addEventListener('change', async function () {
        const label = document.getElementById('accountActiveLabel');
        label.textContent = this.checked ? 'Conta Ativa' : 'Conta Inativa';

        if (!this.checked && editingAccountId) {
            const acc = g.accounts.find(a => a.id === editingAccountId);
            if (acc && acc.balance > 0) {
                this.checked = true;
                label.textContent = 'Conta Ativa';
                showToast('Não é possível inativar uma conta com saldo positivo. Zere a conta via transferência ou lançamento antes.', 'warning');
            }
        }
    });

    // ---- Has Credit Card Toggle ----
    accountHasCreditCard.addEventListener('change', function () {
        const limitConfigDiv = document.getElementById('accountLimitConfig');
        if (this.checked) {
            tabCartoesBtn.style.display = 'block';
            limitConfigDiv.style.display = 'block';
            document.getElementById('accountLimitType').dispatchEvent(new Event('change'));
        } else {
            tabCartoesBtn.style.display = 'none';
            limitConfigDiv.style.display = 'none';
            document.querySelector('[data-target="tabContaGeral"]').click();
        }
    });

    // ---- Limit Type Toggle ----
    if (document.getElementById('accountLimitType')) document.getElementById('accountLimitType').addEventListener('change', function () {
        const limitGroup = document.getElementById('accountGlobalLimitGroup');
        if (limitGroup) limitGroup.style.display = this.value === 'shared' ? 'block' : 'none';
    });

    // ---- Global Limit Mask ----
    if (document.getElementById('accountGlobalLimit')) document.getElementById('accountGlobalLimit').addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length === 0) { e.target.value = ''; return; }
        e.target.value = formatarMoeda(value);
    });

    // ---- Account Tabs ----
    document.querySelectorAll('#accountTabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#accountTabs .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('#accountModal .tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(e.target.dataset.target).classList.add('active');
        });
    });

    // ---- Save Account ----
    if (document.getElementById('saveAccount')) document.getElementById('saveAccount').addEventListener('click', async () => {
        const name = accountNameInput.value.trim();
        const ispb = accountBankValue.value;

        if (!name) {
            showToast('Preencha o Apelido da Conta.', 'warning');
            return;
        }

        if (!ispb) {
            showToast('Selecione uma Instituição Financeira.', 'warning');
            return;
        }

        const saldoGarantido = accountBalanceInput.value ? valorParaNumero(accountBalanceInput.value) : 0;
        const bankName = ispb !== 'Outros' ? accountBankSearch.value : '';
        const acceptedPaymentTypes = Array.from(document.querySelectorAll('#accountPaymentTypesContainer input[type="checkbox"]:checked')).map(cb => cb.value);

        const accountData = {
            name,
            bankIspb: ispb,
            bankName: bankName,
            type: accountTypeInput.value,
            observation: accountObservationInput.value.trim(),
            showOnDashboard: accountShowDash.checked,
            includeInKPI: accountIncludeKPI.checked,
            hasCreditCard: accountHasCreditCard.checked,
            limitType: document.getElementById('accountLimitType').value,
            globalLimit: valorParaNumero(document.getElementById('accountGlobalLimit').value),
            active: accountActive.checked,
            pixKeys: currentAccountPixKeys,
            cards: accountHasCreditCard.checked ? currentAccountCards : [],
            acceptedPaymentTypes: acceptedPaymentTypes,
            updatedAt: new Date().toISOString()
        };

        try {
            if (editingAccountId) {
                await userRef('accounts').doc(editingAccountId).update(accountData);
                const index = g.accounts.findIndex(a => a.id === editingAccountId);
                if (index !== -1) g.accounts[index] = { ...g.accounts[index], ...accountData };
            } else {
                accountData.balance = saldoGarantido;
                accountData.createdAt = new Date().toISOString();
                const docRef = await userRef('accounts').add(accountData);
                g.accounts.push({ id: docRef.id, ...accountData });

                if (accountData.balance > 0) {
                    await saveTransaction({
                        type: 'income',
                        value: accountData.balance,
                        description: 'Saldo Inicial',
                        category: '',
                        isPaid: true,
                        date: new Date().toISOString().split('T')[0],
                        paymentDate: new Date().toISOString().split('T')[0],
                        contaDestino: name,
                        createdAt: new Date().toISOString()
                    });
                }
            }

            renderAccounts();
            window.renderDashboard?.();
            accountModal.style.display = 'none';
            showToast('Conta salva com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar conta:', error);
            showToast('Erro ao salvar conta.', 'error');
        }
    });

    // ---- Filters ----
    if (document.getElementById('accountTypeFilter')) document.getElementById('accountTypeFilter').addEventListener('change', renderAccounts);
    if (document.getElementById('accountStatusFilter')) document.getElementById('accountStatusFilter').addEventListener('change', renderAccounts);

    // ---- Delete Account ----
    if (document.getElementById('deleteAccountBtn')) document.getElementById('deleteAccountBtn').addEventListener('click', async () => {
        if (!editingAccountId) return;

        const acc = g.accounts.find(a => a.id === editingAccountId);
        if (!acc) return;

        if (acc.balance !== 0) {
            showToast('Não é possível excluir contas com saldo. Zere a conta transferindo os valores antes.', 'error');
            return;
        }

        const isConfirmed = await askConfirmation(
            'Excluir Conta',
            `Tem certeza que deseja excluir a conta "${acc.name}" permanentemente?`,
            'Excluir Conta',
            true,
            'delete_forever'
        );

        if (isConfirmed) {
            try {
                await userRef('accounts').doc(editingAccountId).delete();

                g.accounts = g.accounts.filter(a => a.id !== editingAccountId);
                renderAccounts();
                window.renderDashboard?.();
                accountModal.style.display = 'none';

                showToast('Conta excluída com sucesso.', 'success');
            } catch (error) {
                console.error('Erro ao excluir conta:', error);
                showToast('Erro de comunicação. Tente novamente.', 'error');
            }
        }
    });

    // ---- Card Limit Mask ----
    if (document.getElementById('ccLimit')) document.getElementById('ccLimit').addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length === 0) { e.target.value = ''; return; }
        e.target.value = formatarMoeda(value);
    });

    // ---- Brand Select Change (logo) ----
    if (ccBrandSelect) {
        ccBrandSelect.addEventListener('change', (e) => {
            document.getElementById('ccBrandLogoBox').innerHTML = getBrandLogoHtml(e.target.value);
        });
    }

    // ---- Show Card Form ----
    if (btnShowCardForm) {
        btnShowCardForm.addEventListener('click', () => {
            editingCardIndex = null;
            document.getElementById('cardFormTitle').textContent = 'Novo Cartão';

            document.getElementById('ccName').value = '';
            document.getElementById('ccLast4').value = '';
            document.getElementById('ccBrand').value = 'Mastercard';
            document.getElementById('ccBrandLogoBox').innerHTML = getBrandLogoHtml('Mastercard');
            document.getElementById('ccTypeFormat').value = 'Físico';
            document.getElementById('ccLimit').value = '';

            const limitType = document.getElementById('accountLimitType').value;
            document.getElementById('ccLimit').parentElement.style.display = limitType === 'shared' ? 'none' : 'block';

            const ispb = document.getElementById('accountBankValue').value;
            const bankName = document.getElementById('accountBankSearch').value;
            document.getElementById('ccColor').value = getBankColorByIspb(ispb, bankName);

            const isPrepaidEl = document.getElementById('ccIsPrepaid');
            if (isPrepaidEl) {
                isPrepaidEl.checked = false;
                isPrepaidEl.dispatchEvent(new Event('change'));
            }

            const isDefaultEl = document.getElementById('ccIsDefault');
            if (isDefaultEl) {
                isDefaultEl.checked = false;
            }

            document.getElementById('ccClosingDay').value = '';
            document.getElementById('ccDueDay').value = '';

            const saveAccountBtnMaster = document.getElementById('saveAccount');
            if (saveAccountBtnMaster) {
                saveAccountBtnMaster.disabled = true;
                saveAccountBtnMaster.style.opacity = '0.5';
                saveAccountBtnMaster.style.cursor = 'not-allowed';
            }

            document.getElementById('cardsListView').style.display = 'none';
            document.getElementById('cardFormView').style.display = 'block';
        });
    }

    // ---- Hide Card Form ----
    if (btnHideCardForm) {
        btnHideCardForm.addEventListener('click', () => {
            const saveAccountBtnMaster = document.getElementById('saveAccount');
            if (saveAccountBtnMaster) {
                saveAccountBtnMaster.disabled = false;
                saveAccountBtnMaster.style.opacity = '1';
                saveAccountBtnMaster.style.cursor = 'pointer';
            }

            document.getElementById('cardFormView').style.display = 'none';
            document.getElementById('cardsListView').style.display = 'block';
        });
    }

    // ---- Prepaid Toggle ----
    if (ccIsPrepaidToggle) {
        ccIsPrepaidToggle.addEventListener('change', function () {
            const datesGroup = document.getElementById('ccDatesGroup');
            if (datesGroup) {
                datesGroup.style.display = this.checked ? 'none' : 'flex';
            }
        });
    }

    // ---- Save Card To List ----
    if (btnSaveCardToList) {
        btnSaveCardToList.addEventListener('click', async () => {
            const name = document.getElementById('ccName').value.trim();
            const last4 = document.getElementById('ccLast4').value.trim() || '****';
            const brand = document.getElementById('ccBrand').value;
            const typeFormat = document.getElementById('ccTypeFormat').value;
            const limit = valorParaNumero(document.getElementById('ccLimit').value);
            const color = document.getElementById('ccColor').value;
            const isPrepaid = document.getElementById('ccIsPrepaid').checked;
            const isDefault = document.getElementById('ccIsDefault').checked;
            const closingDay = parseInt(document.getElementById('ccClosingDay').value) || 1;
            const dueDay = parseInt(document.getElementById('ccDueDay').value) || 10;

            if (!name) {
                showToast('Informe um apelido para o cartão', 'warning');
                return;
            }

            if (isDefault) {
                let existingDefaultCard = null;
                let existingDefaultAccount = null;

                (g.accounts || []).forEach(acc => {
                    if (acc.id !== editingAccountId && acc.cards) {
                        acc.cards.forEach(c => {
                            if (c.isDefault) {
                                existingDefaultCard = c;
                                existingDefaultAccount = acc;
                            }
                        });
                    }
                });

                currentAccountCards.forEach((c, idx) => {
                    if (editingCardIndex !== null && idx === editingCardIndex) return;
                    if (c.isDefault) {
                        existingDefaultCard = c;
                        existingDefaultAccount = { name: document.getElementById('accountName').value || 'Esta Conta' };
                    }
                });

                if (existingDefaultCard) {
                    const accLabel = existingDefaultAccount.bankName ? `${existingDefaultAccount.name} (${existingDefaultAccount.bankName})` : existingDefaultAccount.name;
                    const mensagemModal = `Já existe um cartão definido como Principal: "${existingDefaultCard.name}" (Final ${existingDefaultCard.last4}) na conta "${accLabel}". Deseja mudar o destaque do Dashboard para este novo cartão?`;

                    const confirmarTroca = await askConfirmation('Substituir Cartão Principal', mensagemModal, 'Sim, Mudar Destaque', false, 'star');

                    if (!confirmarTroca) {
                        document.getElementById('ccIsDefault').checked = false;
                        return;
                    }

                    if (existingDefaultAccount.id) {
                        existingDefaultAccount.cards.forEach(c => c.isDefault = false);
                        await userRef('accounts').doc(existingDefaultAccount.id).update({
                            cards: existingDefaultAccount.cards
                        });

                        const idxAcc = g.accounts.findIndex(a => a.id === existingDefaultAccount.id);
                        if (idxAcc !== -1) {
                            g.accounts[idxAcc].cards = existingDefaultAccount.cards;
                        }
                    }

                    currentAccountCards.forEach(c => c.isDefault = false);

                    window.currentDashboardCardIndex = 0;
                } else {
                    currentAccountCards.forEach(c => c.isDefault = false);
                }
            }

            const cardData = {
                id: editingCardIndex !== null ? currentAccountCards[editingCardIndex].id : 'card_' + Date.now(),
                name, last4, brand, typeFormat, limit, color, isPrepaid, isDefault, closingDay, dueDay
            };

            if (editingCardIndex !== null) {
                currentAccountCards[editingCardIndex] = cardData;
            } else {
                currentAccountCards.push(cardData);
            }

            if (isDefault) {
                window.currentDashboardCardIndex = 0;
            }

            if (typeof editingAccountId !== 'undefined' && editingAccountId) {
                const idxAcc = g.accounts.findIndex(a => a.id === editingAccountId);
                if (idxAcc !== -1) {
                    g.accounts[idxAcc].cards = currentAccountCards;
                    userRef('accounts').doc(editingAccountId).update({
                        cards: currentAccountCards
                    });
                }
            }

            accountFormHasChanges = true;
            renderAccountCardsList();
            document.getElementById('btnHideCardForm').click();
        });
    }

    // ---- Show Pix Key Form ----
    if (btnShowPixKeyForm) {
        btnShowPixKeyForm.addEventListener('click', () => {
            editingPixKeyIndex = null;
            document.getElementById('pixKeyFormTitle').textContent = 'Nova Chave Pix';

            document.getElementById('newPixKeyType').value = 'CPF/CNPJ';
            document.getElementById('newPixKeyValue').value = '';
            document.getElementById('newPixKeyType').dispatchEvent(new Event('change'));

            const saveAccountBtnMaster = document.getElementById('saveAccount');
            if (saveAccountBtnMaster) {
                saveAccountBtnMaster.disabled = true;
                saveAccountBtnMaster.style.opacity = '0.5';
                saveAccountBtnMaster.style.cursor = 'not-allowed';
            }

            document.getElementById('pixKeysListView').style.display = 'none';
            document.getElementById('pixKeyFormView').style.display = 'block';
        });
    }

    // ---- Hide Pix Key Form ----
    if (btnHidePixKeyForm) {
        btnHidePixKeyForm.addEventListener('click', () => {
            const saveAccountBtnMaster = document.getElementById('saveAccount');
            if (saveAccountBtnMaster) {
                saveAccountBtnMaster.disabled = false;
                saveAccountBtnMaster.style.opacity = '1';
                saveAccountBtnMaster.style.cursor = 'pointer';
            }
            document.getElementById('pixKeyFormView').style.display = 'none';
            document.getElementById('pixKeysListView').style.display = 'block';
        });
    }

    // ---- Pix Key Type Change ----
    if (newPixKeyType) {
        newPixKeyType.addEventListener('change', (e) => {
            const type = e.target.value;
            newPixKeyValue.value = '';
            if (type === 'CPF/CNPJ') {
                newPixKeyValue.placeholder = '000.000.000-00 ou 00.000.000/0000-00';
                newPixKeyValue.maxLength = 18;
            } else if (type === 'Celular') {
                newPixKeyValue.placeholder = '(00) 00000-0000';
                newPixKeyValue.maxLength = 15;
            } else if (type === 'E-mail') {
                newPixKeyValue.placeholder = 'email@exemplo.com';
                newPixKeyValue.maxLength = 100;
            } else {
                newPixKeyValue.placeholder = 'Ex: 123e4567-e89b-12d3...';
                newPixKeyValue.maxLength = 100;
            }
        });
    }

    // ---- Pix Key Value Mask ----
    if (newPixKeyValue) {
        newPixKeyValue.addEventListener('input', (e) => {
            const type = document.getElementById('newPixKeyType').value;
            let val = e.target.value;

            if (type === 'CPF/CNPJ') {
                val = val.replace(/\D/g, '');
                if (val.length <= 11) {
                    val = val.replace(/(\d{3})(\d)/, '$1.$2');
                    val = val.replace(/(\d{3})(\d)/, '$1.$2');
                    val = val.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                } else {
                    val = val.slice(0, 14);
                    val = val.replace(/(\d{2})(\d)/, '$1.$2');
                    val = val.replace(/(\d{3})(\d)/, '$1.$2');
                    val = val.replace(/(\d{3})(\d)/, '$1/$2');
                    val = val.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
                }
                e.target.value = val;
            } else if (type === 'Celular') {
                val = val.replace(/\D/g, '');
                if (val.length > 11) val = val.slice(0, 11);
                if (val.length > 10) val = val.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
                else if (val.length > 5) val = val.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
                else if (val.length > 2) val = val.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
                e.target.value = val;
            }
        });
    }

    // ---- Save Pix Key To List ----
    if (btnSavePixKeyToList) {
        btnSavePixKeyToList.addEventListener('click', () => {
            const type = document.getElementById('newPixKeyType').value;
            const value = document.getElementById('newPixKeyValue').value.trim();

            if (!value) {
                showToast('Informe a chave Pix antes de salvar', 'warning');
                return;
            }

            const pkData = { type, value };

            if (editingPixKeyIndex !== null) {
                currentAccountPixKeys[editingPixKeyIndex] = pkData;
            } else {
                currentAccountPixKeys.push(pkData);
            }

            accountFormHasChanges = true;
            renderAccountPixKeysList();
            document.getElementById('btnHidePixKeyForm').click();
        });
    }

    // ---- Phone Input Mask (partner) ----
    if (phoneInput) {
        phoneInput.addEventListener('input', function (e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            if (value.length > 10) value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
            else if (value.length > 5) value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
            else if (value.length > 2) value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
            e.target.value = value;
            updateMiniQrCard();
        });
    }

    if (docInput) docInput.addEventListener('input', updateMiniQrCard);
    if (emailInput) emailInput.addEventListener('input', updateMiniQrCard);
    if (randomInput) randomInput.addEventListener('input', updateMiniQrCard);

    // ---- Pix Checkbox Tracker ----
    ['partnerDocIsPix', 'partnerPhoneIsPix', 'partnerEmailIsPix', 'partnerRandomPixIsPix'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', (e) => {
                if (e.target.checked) {
                    ['partnerDocIsPix', 'partnerPhoneIsPix', 'partnerEmailIsPix', 'partnerRandomPixIsPix'].forEach(otherId => {
                        if (otherId !== id) {
                            const otherEl = document.getElementById(otherId);
                            if (otherEl) otherEl.checked = false;
                        }
                    });
                }
                updateMiniQrCard();
            });
        }
    });

    // ---- Pix QR Modal Close ----
    document.getElementById('closePixQrModal')?.addEventListener('click', () => { document.getElementById('pixQrModal').style.display = 'none'; });
    if (modalPixOverlay) {
        modalPixOverlay.addEventListener('click', function (e) {
            if (e.target === modalPixOverlay) modalPixOverlay.style.display = 'none';
        });
    }

    // ---- Boleto Scanner ----
    if (openScannerModalBtn) {
        openScannerModalBtn.addEventListener('click', () => {
            scannerModal.style.display = 'flex';
            if (!tabScanner.classList.contains('active') || !isBoletoCameraRunning) {
                tabScanner.click();
            }
        });
    }

    if (closeScannerModalBtn) closeScannerModalBtn.addEventListener('click', closeBoletoScanner);
    scannerModal.addEventListener('click', (e) => { if (e.target === scannerModal) closeBoletoScanner(); });

    tabScanner.addEventListener('click', () => {
        tabScanner.classList.add('active');
        tabImagem.classList.remove('active');
        contentScanner.style.display = 'block';
        contentImagem.style.display = 'none';
        startBoletoCamera();
    });

    tabImagem.addEventListener('click', () => {
        tabImagem.classList.add('active');
        tabScanner.classList.remove('active');
        contentImagem.style.display = 'block';
        contentScanner.style.display = 'none';
        stopBoletoCamera();
    });

    if (btnUploadBoletoImage) {
        btnUploadBoletoImage.addEventListener('click', () => boletoPhotoInput.click());
    }

    if (boletoPhotoInput) {
        boletoPhotoInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    if (!codeReaderBoleto) codeReaderBoleto = new ZXing.BrowserMultiFormatReader();
                    const image = new Image();
                    image.src = event.target.result;

                    image.onload = async () => {
                        try {
                            const result = await codeReaderBoleto.decodeFromImageElement(image);
                            if (result) {
                                const codeFound = result.text.replace(/\D/g, '');

                                if (codeFound.length === 44) {
                                    document.getElementById('boletoLine').value = codeFound;

                                    scanStatus.style.display = 'block';
                                    scanStatus.textContent = 'Código extraído da imagem!';
                                    scanStatus.style.color = '#188038';

                                    window.updateReceiptPreview?.();
                                    closeBoletoScanner();
                                } else {
                                    throw new Error("Código lido não é um boleto válido.");
                                }
                            }
                        } catch (err) {
                            showToast('Não identificamos um boleto válido. Tente uma foto mais focada nas barras pretas.', 'warning');
                        }
                    };
                } catch (err) {
                    console.error(err);
                }
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        });
    }

    // ---- Boleto Checkbox ----
    if (boletoCheckbox) {
        boletoCheckbox.addEventListener('change', function () {
            boletoFieldGroup.style.display = this.checked ? 'block' : 'none';
            window.updateReceiptPreview?.();
        });
    }

    // ---- Boleto Line Input ----
    if (boletoLineInput) {
        boletoLineInput.addEventListener('input', function (e) {
            this.value = this.value.replace(/\D/g, '');

            const status = document.getElementById('scanStatus');
            const len = this.value.length;

            if (len === 0) {
                status.style.display = 'none';
            } else if (len === 44 || len === 47 || len === 48) {
                status.style.display = 'block';
                status.textContent = 'Código com tamanho válido!';
                status.style.color = '#188038';
            } else if (len > 48) {
                status.style.display = 'block';
                status.textContent = 'Código longo demais! Verifique os números.';
                status.style.color = '#d93025';
            } else {
                status.style.display = 'block';
                status.textContent = `Código incompleto... (${len} números digitados)`;
                status.style.color = '#e67e22';
            }

            window.updateReceiptPreview?.();
        });
    }

    // ---- Boleto updateReceiptPreview Override ----
    const originalUpdateReceiptPreview = window.updateReceiptPreview;
    window.updateReceiptPreview = function () {
        if (typeof originalUpdateReceiptPreview === 'function') originalUpdateReceiptPreview();

        const boletoContainer = document.getElementById('receiptBoletoContainer');
        const boletoText = document.getElementById('boletoLineText');

        if (window.selectedType === 'expense' && boletoCheckbox.checked && boletoLineInput.value.length >= 44) {
            boletoContainer.style.display = 'flex';
            const linhaDigitavel = boletoLineInput.value;
            boletoText.textContent = linhaDigitavel;

            let codigoBarrasReal = "";

            if (linhaDigitavel[0] === '8' && linhaDigitavel.length === 48) {
                codigoBarrasReal = linhaDigitavel.substring(0, 11) +
                    linhaDigitavel.substring(12, 23) +
                    linhaDigitavel.substring(24, 35) +
                    linhaDigitavel.substring(36, 47);
            } else if (linhaDigitavel.length === 47) {
                codigoBarrasReal = linhaDigitavel.substring(0, 4) +
                    linhaDigitavel.substring(32, 33) +
                    linhaDigitavel.substring(33, 47) +
                    linhaDigitavel.substring(4, 9) +
                    linhaDigitavel.substring(10, 20) +
                    linhaDigitavel.substring(21, 31);
            } else {
                codigoBarrasReal = linhaDigitavel;
            }

            if (typeof JsBarcode !== 'undefined' && codigoBarrasReal.length === 44) {
                JsBarcode("#boletoBarcode", codigoBarrasReal, {
                    format: "ITF",
                    lineColor: "#000",
                    width: 1,
                    height: 60,
                    displayValue: false,
                    margin: 0
                });
            } else if (typeof JsBarcode !== 'undefined') {
                JsBarcode("#boletoBarcode", codigoBarrasReal, {
                    format: "CODE128",
                    lineColor: "#ccc",
                    width: 1.4,
                    height: 50,
                    displayValue: false,
                    margin: 0
                });
            }
        } else {
            boletoContainer.style.display = 'none';
        }
    };

    // ---- Copy Boleto Button ----
    if (copyBoletoBtn) {
        copyBoletoBtn.addEventListener('click', function (e) {
            e.preventDefault();
            const numerosParaCopiar = document.getElementById('boletoLineText').textContent;

            navigator.clipboard.writeText(numerosParaCopiar).then(() => {
                const iconeOriginal = this.innerHTML;
                this.innerHTML = '<span class="material-icons" style="font-size: 1.1rem; color: #188038;">check</span> Copiado!';
                this.style.borderColor = '#188038';
                this.style.color = '#188038';

                showToast('Código de barras copiado!', 'success');

                setTimeout(() => {
                    this.innerHTML = iconeOriginal;
                    this.style.borderColor = '';
                    this.style.color = '';
                }, 2000);
            }).catch(err => {
                showToast('Erro ao copiar o código', 'error');
            });
        });
    }

    // ---- Invoice Payment ----
    if (document.getElementById('btnCancelInvoicePayment')) document.getElementById('btnCancelInvoicePayment').addEventListener('click', () => {
        if (document.getElementById('payInvoiceModal')) document.getElementById('payInvoiceModal').style.display = 'none';
        invoicePaymentData = null;
    });

    if (document.getElementById('btnConfirmInvoicePayment')) document.getElementById('btnConfirmInvoicePayment').addEventListener('click', async function () {
        if (!invoicePaymentData) return;

        const originalText = this.innerHTML;
        this.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">autorenew</span> Pagando...';
        this.disabled = true;

        const batch = db.batch();
        const nowIso = new Date().toISOString();
        const now = new Date();
        const hoje = getTodayISO();

        invoicePaymentData.txsPagar.forEach(tx => {
            const ref = userRef('transactions').doc(tx.id);
            batch.update(ref, { isPaid: true, paymentDate: hoje, updatedAt: nowIso });
        });

        const accRef = userRef('accounts').doc(invoicePaymentData.accountId);
        batch.update(accRef, { balance: firebase.firestore.FieldValue.increment(-invoicePaymentData.total) });

        try {
            await batch.commit();

            invoicePaymentData.txsPagar.forEach(tx => {
                const idx = g.transactions.findIndex(t => t.id === tx.id);
                if (idx !== -1) {
                    g.transactions[idx].isPaid = true;
                    g.transactions[idx].paymentDate = hoje;
                }
            });

            const acc = g.accounts.find(a => a.id === invoicePaymentData.accountId);
            if (acc) acc.balance -= invoicePaymentData.total;

            showToast('Fatura paga com sucesso!', 'success');

            renderAccounts();
            window.renderDashboard?.();
            window.renderTransactions?.();
            window.abrirCarteira(invoicePaymentData.accountId, 0, false);

            document.getElementById('payInvoiceModal').style.display = 'none';
        } catch (e) {
            console.error("Erro ao pagar fatura:", e);
            showToast('Erro de conexão ao pagar fatura.', 'error');
        } finally {
            this.innerHTML = 'Pagar Fatura';
            this.disabled = false;
            invoicePaymentData = null;
        }
    });
}

export { initAccounts, getBankLogoHtml, getBrandLogoHtml, getBankColorByIspb, loadAccounts, updateMiniQrCard };