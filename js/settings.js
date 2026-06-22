import { auth, db } from './firebase-config.js';
import { currentUser, g, userRef, currentView } from './state.js';
import { escapeHtml, escapeJsAttr, formatCurrency, sanitizeFirestoreData, formatarMoeda, valorParaNumero } from './utils.js';
import { criarHtmlItemCadastro } from './factories.js';
import { showToast, askConfirmation } from './ui-helpers.js';
import { updatePrivacyMode } from './theme.js';

let editingPaymentTypeId = null;
let editingCategoryId = null;
let editingCostCenterId = null;
let selectedType = 'expense';

const paymentTypeModal = document.getElementById('paymentTypeModal');
const closePaymentTypeBtn = document.getElementById('closePaymentTypeModal');
const cancelPaymentTypeBtn = document.getElementById('cancelPaymentType');
const paymentStatusCheckbox = document.getElementById('paymentStatus');
const paymentStatusText = document.getElementById('paymentStatusText');
const paymentParcelamentoCheckbox = document.getElementById('paymentParcelamento');
const paymentParcelamentoText = document.getElementById('paymentParcelamentoText');
const maxParcelasGroup = document.getElementById('maxParcelasGroup');
const paymentMaxParcelas = document.getElementById('paymentMaxParcelas');
const savePaymentTypeBtn = document.getElementById('savePaymentType');

const paymentTypesView = document.getElementById('paymentTypesView');
const paymentTypesList = document.getElementById('paymentTypesList');
const addPaymentTypeBtn = document.getElementById('addPaymentTypeBtn');
const backFromPaymentTypes = document.getElementById('backFromPaymentTypes');

const categoriesView = document.getElementById('categoriesView');
const categoriesList = document.getElementById('categoriesList');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const backFromCategories = document.getElementById('backFromCategories');

const categoryModal = document.getElementById('categoryModal');
const closeCategoryBtn = document.getElementById('closeCategoryModal');
const cancelCategoryBtn = document.getElementById('cancelCategory');
const saveCategoryBtn = document.getElementById('saveCategory');

const categoryName = document.getElementById('categoryName');
const categoryType = document.getElementById('categoryType');
const categoryColor = document.getElementById('categoryColor');
const categoryCostCenter = document.getElementById('categoryCostCenter');
const categoryMonthlyGoal = document.getElementById('categoryMonthlyGoal');
const categoryActive = document.getElementById('categoryActive');
const categoryActiveText = document.getElementById('categoryActiveText');

const catSearchInput = document.getElementById('catSearchFilter');
const catTypeSelect = document.getElementById('catTypeFilter');
const catStatusSelect = document.getElementById('catStatusFilter');

const costCentersView = document.getElementById('costCentersView');
const costCentersList = document.getElementById('costCentersList');
const addCostCenterBtn = document.getElementById('addCostCenterBtn');
const backFromCostCenters = document.getElementById('backFromCostCenters');

const costCenterModal = document.getElementById('costCenterModal');
const closeCostCenterBtn = document.getElementById('closeCostCenterModal');
const cancelCostCenterBtn = document.getElementById('cancelCostCenter');
const saveCostCenterBtn = document.getElementById('saveCostCenter');

const costCenterDescription = document.getElementById('costCenterDescription');
const costCenterObservation = document.getElementById('costCenterObservation');
const costCenterColor = document.getElementById('costCenterColor');
const costCenterActive = document.getElementById('costCenterActive');
const costCenterActiveText = document.getElementById('costCenterActiveText');

const profileView = document.getElementById('profileView');
const backFromProfile = document.getElementById('backFromProfile');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profileAvatar = document.getElementById('profileAvatar');
const changePhotoBtn = document.getElementById('changePhotoBtn');
const photoUpload = document.getElementById('photoUpload');
const changePasswordBtn = document.getElementById('changePasswordBtn');
const resetAccountBtn = document.getElementById('resetAccountBtn');
const saveProfileBtn = document.getElementById('saveProfileBtn');

const resetAccountModal = document.getElementById('resetAccountModal');
const closeResetModal = document.getElementById('closeResetModal');
const cancelReset = document.getElementById('cancelReset');
const confirmReset = document.getElementById('confirmReset');
const resetPassword = document.getElementById('resetPassword');
const resetConfirmWord = document.getElementById('resetConfirmWord');
const resetErrorMsg = document.getElementById('resetErrorMsg');

function renderSettings() {
    const grid = document.querySelector('#settingsView .settings-grid');
    if (!grid) return;
    grid.removeEventListener('click', settingsCardHandler);
    grid.addEventListener('click', settingsCardHandler);
}

function settingsCardHandler(e) {
    const card = e.target.closest('.settings-card');
    if (!card) return;
    const setting = card.dataset.setting;
    switch(setting) {
        case 'profile':
            document.querySelector('#settingsView .settings-grid').style.display = 'none';
            profileView.style.display = 'block';
            loadProfile();
            break;
        case 'costCenters':
            document.querySelector('#settingsView .settings-grid').style.display = 'none';
            costCentersView.style.display = 'block';
            loadCostCenters();
            break;
        case 'categories':
            document.querySelector('#settingsView .settings-grid').style.display = 'none';
            categoriesView.style.display = 'block';
            loadCategories();
            break;
        case 'paymentTypes':
            document.querySelector('#settingsView .settings-grid').style.display = 'none';
            paymentTypesView.style.display = 'block';
            loadPaymentTypes();
            break;
        case 'alerts':
            document.querySelector('#settingsView .settings-grid').style.display = 'none';
            document.getElementById('alertsView').style.display = 'block';
            const isHidden = localStorage.getItem('hideOfxTransferWarning') === 'true';
            document.getElementById('toggleOfxWarning').checked = !isHidden;
            break;
    }
}

async function verificarERepararFormasPagamento() {
    if (!currentUser) return;

    const defaultPaymentTypes = [
        { description: "Dinheiro", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true },
        { description: "Débito", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true },
        { description: "Crédito", allowsInstallments: true, maxInstallments: 24, isSystem: true, active: true },
        { description: "Pix", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true },
        { description: "Boleto", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true },
        { description: "Transferência", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true }
    ];

    const batch = db.batch();
    let houveAlteracao = false;

    defaultPaymentTypes.forEach(defaultPt => {
        const nomeNorm = defaultPt.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const existente = g.paymentTypes.find(p =>
            p.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === nomeNorm
        );

        if (!existente) {
            const newDocRef = userRef('paymentTypes').doc();
            const novaForma = { ...defaultPt, createdAt: new Date().toISOString() };
            batch.set(newDocRef, novaForma);
            g.paymentTypes.push({ id: newDocRef.id, ...novaForma });
            houveAlteracao = true;
        } else if (!existente.isSystem) {
            const docRef = userRef('paymentTypes').doc(existente.id);
            batch.update(docRef, { isSystem: true });
            existente.isSystem = true;
            houveAlteracao = true;
        }
    });

    if (houveAlteracao) {
        await batch.commit();
        console.log("🚀 ControlPess: Conta antiga identificada e atualizada para a nova política de segurança!");
    }
}

async function verificarERepararContasPadrao() {
    if (!currentUser) return;

    const ptDinheiro = g.paymentTypes.find(p => p.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === "dinheiro");
    const dinheiroId = ptDinheiro ? ptDinheiro.id : null;

    const existente = g.accounts.find(a =>
        a.isSystem || (a.type === 'Carteira' && a.name.toLowerCase() === 'carteira')
    );

    if (!existente) {
        const newDocRef = userRef('accounts').doc();
        const novaConta = {
            name: "Carteira",
            bankIspb: "Outros",
            bankName: "",
            type: "Carteira",
            balance: 0,
            observation: "Dinheiro em espécie (Físico)",
            showOnDashboard: true,
            includeInKPI: true,
            hasCreditCard: false,
            active: true,
            isSystem: true,
            acceptedPaymentTypes: dinheiroId ? [dinheiroId] : [],
            createdAt: new Date().toISOString()
        };
        await newDocRef.set(novaConta);
        g.accounts.push({ id: newDocRef.id, ...novaConta });
    } else {
        let updateData = {};
        let needsUpdate = false;

        if (!existente.isSystem) {
            updateData.isSystem = true;
            needsUpdate = true;
        }

        if (dinheiroId && (!existente.acceptedPaymentTypes || !existente.acceptedPaymentTypes.includes(dinheiroId))) {
            updateData.acceptedPaymentTypes = existente.acceptedPaymentTypes ? [...existente.acceptedPaymentTypes, dinheiroId] : [dinheiroId];
            needsUpdate = true;
        }

        if (needsUpdate) {
            await userRef('accounts').doc(existente.id).update(updateData);
            Object.assign(existente, sanitizeFirestoreData(updateData));
        }
    }
}

function closePaymentTypeModal() {
    paymentTypeModal.style.display = 'none';
}

async function fetchPaymentTypes() {
    if (!currentUser) return;
    const snapshot = await db
        .collection('users')
        .doc(currentUser.uid)
        .collection('paymentTypes')
        .get();
    g.paymentTypes = snapshot.docs.map(doc => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
}

function renderPaymentTypes() {
    if (g.paymentTypes.length === 0) {
        paymentTypesList.innerHTML = '<div class="empty-message">Nenhuma forma de pagamento cadastrada.</div>';
        return;
    }

    const sortedPaymentTypes = [...g.paymentTypes].sort((a, b) => {
        if (a.isSystem && !b.isSystem) return -1;
        if (!a.isSystem && b.isSystem) return 1;
        return a.description.localeCompare(b.description);
    });

    let html = '';
    sortedPaymentTypes.forEach(pt => {
        const statusLabel = pt.active !== false ? 'Ativo' : 'Inativo';
        const statusColor = pt.active !== false ? '#188038' : '#5f6368';
        const parcelamento = pt.allowsInstallments ? `Sim (até ${pt.maxInstallments}x)` : 'Não';

        const subHtml = `<strong style="color: ${statusColor};">${statusLabel}</strong> | Parcelamento: ${parcelamento}`;

        const deleteClass = pt.isSystem ? 'delete-payment-type-hidden' : 'delete-payment-type';

        let rowHtml = criarHtmlItemCadastro(pt.id, pt.active === false, '', pt.description, subHtml, 'edit-payment-type', deleteClass);

        if (pt.isSystem) {
            rowHtml = rowHtml.replace('class="delete-payment-type-hidden" title="Excluir"', 'class="delete-payment-type-hidden" title="Não é possível excluir" style="display:none;"');
        }

        html += rowHtml;
    });
    paymentTypesList.innerHTML = html;

    document.querySelectorAll('.delete-payment-type').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const row = e.target.closest('.item-row');
            const id = row.dataset.id;
            if (await askConfirmation('Excluir', 'Tem certeza que deseja excluir este tipo de pagamento?', 'Excluir', true, 'warning')) {
                await userRef('paymentTypes').doc(id).delete();
                g.paymentTypes = g.paymentTypes.filter(pt => pt.id !== id);
                renderPaymentTypes();
            }
        });
    });

    document.querySelectorAll('#paymentTypesList .item-row').forEach(row => {
        row.addEventListener('click', (e) => {
            if (e.target.closest('.delete-payment-type')) {
                return;
            }

            const id = row.dataset.id;
            const pt = g.paymentTypes.find(p => p.id === id);
            if (pt) {
                editingPaymentTypeId = id;

                const descInput = document.getElementById('paymentDescricao');
                descInput.value = pt.description;

                if (pt.isSystem) {
                    descInput.disabled = true;
                    descInput.style.backgroundColor = '#f1f3f4';
                } else {
                    descInput.disabled = false;
                    descInput.style.backgroundColor = '';
                }

                document.getElementById('paymentStatus').checked = pt.active !== false;
                document.getElementById('paymentParcelamento').checked = pt.allowsInstallments;
                document.getElementById('paymentMaxParcelas').value = pt.maxInstallments || 12;
                updateToggleStatus();
                paymentTypeModal.style.display = 'flex';
            }
        });
    });
}

function updateToggleStatus() {
    const statusLabel = document.getElementById('paymentStatusLabel');
    if (statusLabel) {
        statusLabel.textContent = paymentStatusCheckbox.checked ? 'Ativo' : 'Inativo';
    }

    const showMax = paymentParcelamentoCheckbox.checked;
    paymentMaxParcelas.disabled = !showMax;
    maxParcelasGroup.style.display = showMax ? 'block' : 'none';
}

async function fetchCostCenters() {
    if (!currentUser) return;
    const snapshot = await userRef('costCenters').get();
    g.costCenters = snapshot.docs.map(doc => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
}

async function loadCostCenters() {
    await fetchCostCenters();
    renderCostCenters();
}

function renderCostCenterOptions(selectedId = null, centersList = g.costCenters) {
    let options = '<option value="">Nenhum</option>';
    if (centersList && centersList.length > 0) {
        centersList.forEach(cc => {
            const selected = cc.id === selectedId ? 'selected' : '';
            options += `<option value="${escapeHtml(cc.id)}" ${selected}>${escapeHtml(cc.description)}</option>`;
        });
    }
    return options;
}

async function fetchCategories() {
    if (!currentUser) return;
    const snapshot = await db
        .collection('users')
        .doc(currentUser.uid)
        .collection('categories')
        .get();
    g.categories = snapshot.docs.map(doc => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
}

async function loadPaymentTypes() {
    await fetchPaymentTypes();
    renderPaymentTypes();
}

async function loadCategories() {
    if (document.getElementById('catSearchFilter')) document.getElementById('catSearchFilter').value = '';
    if (document.getElementById('catTypeFilter')) document.getElementById('catTypeFilter').value = 'all';
    if (document.getElementById('catStatusFilter')) document.getElementById('catStatusFilter').value = 'active';

    await Promise.all([
        fetchCategories(),
        fetchCostCenters()
    ]);
    renderCategories();
}

function preencherSelectCategorias() {
    const select = document.getElementById("categoria");
    const valorAnterior = select.value;

    select.innerHTML = '<option value="" disabled selected>Selecione</option>';

    g.categories.filter(cat => cat.active !== false && cat.type === selectedType)
              .sort((a, b) => a.name.localeCompare(b.name))
              .forEach(cat => {
        const option = document.createElement("option");
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
        if(!sel) return;
        const previousValue = sel.value;
        sel.innerHTML = '<option value="" disabled selected>Selecione a conta...</option>';
        g.accounts.filter(a => a.active !== false)
                .sort((a, b) => a.name.localeCompare(b.name))
                .forEach(acc => {
            const opt = document.createElement('option');
            opt.value = acc.id;
            opt.textContent = `${acc.name} (Saldo: ${formatCurrency(acc.balance)})`;
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

        if(document.getElementById('parcelasCardGroup')) document.getElementById('parcelasCardGroup').style.display = 'none';
        if(document.getElementById('boletoGroupContainer')) document.getElementById('boletoGroupContainer').style.display = 'none';
        if(document.getElementById('boletoFieldGroup')) document.getElementById('boletoFieldGroup').style.display = 'none';

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

function renderCategories() {
    const searchTerm = (document.getElementById('catSearchFilter') ? document.getElementById('catSearchFilter').value.toLowerCase().trim() : '');
    const typeFilter = document.getElementById('catTypeFilter') ? document.getElementById('catTypeFilter').value : 'all';
    const statusFilter = document.getElementById('catStatusFilter') ? document.getElementById('catStatusFilter').value : 'active';

    let filteredCategories = g.categories.filter(cat => {
        if (searchTerm && !(cat.name || '').toLowerCase().includes(searchTerm)) return false;
        if (typeFilter !== 'all' && cat.type !== typeFilter) return false;
        if (statusFilter === 'active' && cat.active === false) return false;
        if (statusFilter === 'inactive' && cat.active !== false) return false;
        return true;
    });

    if (filteredCategories.length === 0) {
        categoriesList.innerHTML = '<div class="empty-message">Nenhuma categoria encontrada.</div>';
        return;
    }

    let html = '';
    filteredCategories.forEach(cat => {
        const typeLabel = cat.type === 'income' ? 'Receita' : 'Despesa';
        const activeLabel = cat.active ? 'Ativo' : 'Inativo';
        const activeColor = cat.active ? '#188038' : '#5f6368';
        const goal = cat.monthlyGoal ? `R$ ${parseFloat(cat.monthlyGoal).toFixed(2)}` : 'Não definida';

        const avatar = `<span style="display: inline-block; width: 24px; height: 24px; border-radius: 50%; background-color: ${cat.color || '#ccc'}; flex-shrink: 0;"></span>`;
        const subHtml = `<strong style="color: ${activeColor};">${activeLabel}</strong> | ${typeLabel} | Meta: ${goal}`;
        html += criarHtmlItemCadastro(cat.id, cat.active === false, avatar, cat.name, subHtml, 'edit-category', 'delete-category');
    });
    categoriesList.innerHTML = html;

    document.querySelectorAll('.delete-category').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const row = e.target.closest('.item-row');
            const id = row.dataset.id;
            if (await askConfirmation('Excluir', 'Tem certeza que deseja excluir esta categoria?', 'Excluir', true, 'warning')) {
                await userRef('categories').doc(id).delete();
                g.categories = g.categories.filter(cat => cat.id !== id);
                renderCategories();
            }
        });
    });

    document.querySelectorAll('#categoriesList .item-row').forEach(row => {
        row.addEventListener('click', (e) => {
            if (e.target.closest('.delete-category')) return;

            const id = row.dataset.id;
            const cat = g.categories.find(c => c.id === id);
            if (cat) {
                editingCategoryId = id;
                categoryName.value = cat.name;
                categoryType.value = cat.type || 'expense';
                categoryColor.value = cat.color || '#1a73e8';

                const metaValor = cat.monthlyGoal || 0;
                const metaString = Math.round(metaValor * 100).toString();
                categoryMonthlyGoal.value = formatarMoeda(metaString) || 'R$ 0,00';

                categoryActive.checked = cat.active !== false;
                updateCategoryActiveText();
                categoryCostCenter.innerHTML = renderCostCenterOptions(cat.costCenter || null);
                categoryModal.style.display = 'flex';
            }
        });
    });
}

function closeCategoryModal() {
    categoryModal.style.display = 'none';
}

function updateCostCenterActiveText() {
    const statusLabel = document.getElementById('costCenterActiveLabel');
    if (statusLabel) {
        statusLabel.textContent = costCenterActive.checked ? 'Ativo' : 'Inativo';
    }
}

function renderCostCenters() {
    if (g.costCenters.length === 0) {
        costCentersList.innerHTML = '<div class="empty-message">Nenhum centro de custo cadastrado.</div>';
        return;
    }
    let html = '';
    g.costCenters.forEach(cc => {
        const statusLabel = cc.active !== false ? 'Ativo' : 'Inativo';
        const statusColor = cc.active !== false ? '#188038' : '#5f6368';

        const avatar = `<span style="display: inline-block; width: 24px; height: 24px; border-radius: 50%; background-color: ${cc.color || '#ccc'}; flex-shrink: 0;"></span>`;
        const subHtml = `<strong style="color: ${statusColor};">${statusLabel}</strong> | ${cc.observation || 'Sem observação'}`;
        html += criarHtmlItemCadastro(cc.id, cc.active === false, avatar, cc.description, subHtml, 'edit-costcenter', 'delete-costcenter');
    });
    costCentersList.innerHTML = html;

    document.querySelectorAll('.delete-costcenter').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const row = e.target.closest('.item-row');
            const id = row.dataset.id;
            if (await askConfirmation('Excluir', 'Tem certeza que deseja excluir este centro de custo?', 'Excluir', true, 'warning')) {
                await userRef('costCenters').doc(id).delete();
                g.costCenters = g.costCenters.filter(cc => cc.id !== id);
                renderCostCenters();
            }
        });
    });

    document.querySelectorAll('#costCentersList .item-row').forEach(row => {
        row.addEventListener('click', (e) => {
            if (e.target.closest('.delete-costcenter')) return;

            const id = row.dataset.id;
            const cc = g.costCenters.find(c => c.id === id);
            if (cc) {
                editingCostCenterId = id;
                costCenterDescription.value = cc.description || '';
                costCenterObservation.value = cc.observation || '';
                costCenterColor.value = cc.color || '#1a73e8';
                costCenterActive.checked = cc.active !== false;
                updateCostCenterActiveText();
                costCenterModal.style.display = 'flex';
            }
        });
    });
}

function closeCostCenterModal() {
    costCenterModal.style.display = 'none';
}

async function loadProfile() {
    if (!currentUser) return;
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            profileName.value = data.name || '';
            profileEmail.value = currentUser.email || '';
            aplicarFotoPerfil(data.photoURL || null);
        } else {
            const userData = {
                name: currentUser.displayName || currentUser.email.split('@')[0],
                email: currentUser.email,
                photoURL: null,
                createdAt: new Date().toISOString()
            };
            await db.collection('users').doc(currentUser.uid).set(userData);
            profileName.value = userData.name;
            profileEmail.value = currentUser.email;
            aplicarFotoPerfil(null);
        }
    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
    }
}

function aplicarFotoPerfil(url) {
    if (url && url.trim() !== '') {
        profileAvatar.innerHTML = '';
        const img = document.createElement('img');
        img.src = url;
        img.style.cssText = 'width:100%; height:100%; object-fit:cover; border-radius:50%;';
        profileAvatar.appendChild(img);
        profileAvatar.style.background = 'transparent';
    } else {
        const nome = profileName.value || currentUser?.email || 'U';
        const inicial = nome.charAt(0).toUpperCase();
        profileAvatar.innerHTML = '';
        profileAvatar.textContent = inicial;
        profileAvatar.style.background = 'linear-gradient(135deg, var(--accent), #059669)';
    }
}

function validateResetForm() {
    const pass = resetPassword.value.trim();
    const word = resetConfirmWord.value.trim().toUpperCase();

    if (pass.length > 0 && word === 'EXCLUIR') {
        confirmReset.disabled = false;
        confirmReset.style.opacity = '1';
        confirmReset.style.cursor = 'pointer';
    } else {
        confirmReset.disabled = true;
        confirmReset.style.opacity = '0.5';
        confirmReset.style.cursor = 'not-allowed';
    }
}

function closeResetModalFn() {
    resetAccountModal.style.display = 'none';
}

async function updateUserAvatar() {
    const btnAvatar = document.getElementById('userAvatarBtn');
    if (!btnAvatar) return;

    if (!currentUser) {
        btnAvatar.innerHTML = '';
        btnAvatar.innerHTML = '<span class="material-icons">account_circle</span>';
        return;
    }
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            const photoURL = data.photoURL;
            if (photoURL && photoURL.startsWith('data:image')) {
                btnAvatar.innerHTML = '';
                const img = document.createElement('img');
                img.src = photoURL;
                img.alt = 'Avatar';
                btnAvatar.appendChild(img);
            } else {
                const nome = data.name || currentUser.email || 'U';
                const inicial = nome.charAt(0).toUpperCase();
                btnAvatar.innerHTML = '';
                const span = document.createElement('span');
                span.style.fontWeight = '600';
                span.textContent = inicial;
                btnAvatar.appendChild(span);
                btnAvatar.style.background = '#1a73e8';
                btnAvatar.style.color = 'white';
            }
        } else {
            btnAvatar.innerHTML = '';
            btnAvatar.innerHTML = '<span class="material-icons">account_circle</span>';
        }
    } catch (error) {
        console.error('Erro ao carregar avatar:', error);
        btnAvatar.innerHTML = '';
        btnAvatar.innerHTML = '<span class="material-icons">account_circle</span>';
    }
}

function updateCategoryActiveText() {
    const statusLabel = document.getElementById('categoryActiveLabel');
    if (statusLabel) {
        statusLabel.textContent = categoryActive.checked ? 'Ativo' : 'Inativo';
    }
}

function initSettings() {
    document.getElementById('backFromAlerts')?.addEventListener('click', () => {
        document.getElementById('alertsView').style.display = 'none';
        document.querySelector('#settingsView .settings-grid').style.display = 'grid';
    });

    document.getElementById('ofxWarningAccordion')?.addEventListener('click', () => {
        const descContainer = document.getElementById('ofxWarningDesc');
        const chevron = document.getElementById('ofxWarningChevron');

        if (descContainer.style.gridTemplateRows === '0fr' || !descContainer.style.gridTemplateRows) {
            descContainer.style.gridTemplateRows = '1fr';
            chevron.style.transform = 'rotate(180deg)';
        } else {
            descContainer.style.gridTemplateRows = '0fr';
            chevron.style.transform = 'rotate(0deg)';
        }
    });

    document.getElementById('toggleOfxWarning')?.addEventListener('change', (e) => {
        if (e.target.checked) {
            localStorage.removeItem('hideOfxTransferWarning');
        } else {
            localStorage.setItem('hideOfxTransferWarning', 'true');
        }
    });

    if (backFromPaymentTypes) backFromPaymentTypes.addEventListener('click', () => {
        paymentTypesView.style.display = 'none';
        document.querySelector('#settingsView .settings-grid').style.display = 'grid';
    });

    if (backFromCategories) backFromCategories.addEventListener('click', () => {
        categoriesView.style.display = 'none';
        document.querySelector('#settingsView .settings-grid').style.display = 'grid';
    });

    if (backFromCostCenters) backFromCostCenters.addEventListener('click', () => {
        costCentersView.style.display = 'none';
        document.querySelector('#settingsView .settings-grid').style.display = 'grid';
    });

    if (backFromProfile) backFromProfile.addEventListener('click', () => {
        profileView.style.display = 'none';
        document.querySelector('#settingsView .settings-grid').style.display = 'grid';
    });

    if (addPaymentTypeBtn) addPaymentTypeBtn.addEventListener('click', () => {
        editingPaymentTypeId = null;
        const descInput = document.getElementById('paymentDescricao');
        if (descInput) { descInput.value = ''; descInput.disabled = false; descInput.style.backgroundColor = ''; }
        const ps = document.getElementById('paymentStatus'); if (ps) ps.checked = true;
        const pp = document.getElementById('paymentParcelamento'); if (pp) pp.checked = false;
        const mpx = document.getElementById('paymentMaxParcelas'); if (mpx) mpx.value = 12;
        updateToggleStatus();
        if (paymentTypeModal) paymentTypeModal.style.display = 'flex';
    });

    if (closePaymentTypeBtn) closePaymentTypeBtn.addEventListener('click', closePaymentTypeModal);
    if (cancelPaymentTypeBtn) cancelPaymentTypeBtn.addEventListener('click', closePaymentTypeModal);

    if (paymentStatusCheckbox) paymentStatusCheckbox.addEventListener('change', updateToggleStatus);
    if (paymentParcelamentoCheckbox) paymentParcelamentoCheckbox.addEventListener('change', updateToggleStatus);

    if (paymentTypeModal) paymentTypeModal.addEventListener('click', (e) => {
        if (e.target === paymentTypeModal) closePaymentTypeModal();
    });

    if (savePaymentTypeBtn) savePaymentTypeBtn.addEventListener('click', async () => {
        const descricao = document.getElementById('paymentDescricao').value.trim();
        if (!descricao) { alert('Informe a descrição do tipo de pagamento.'); return; }
        const paymentType = {
            description: descricao, active: paymentStatusCheckbox.checked,
            allowsInstallments: paymentParcelamentoCheckbox.checked,
            maxInstallments: paymentParcelamentoCheckbox.checked ? parseInt(paymentMaxParcelas.value) || 1 : null,
            updatedAt: new Date().toISOString()
        };
        try {
            if (!currentUser) { alert('Usuário não autenticado.'); return; }
            if (editingPaymentTypeId) {
                await userRef('paymentTypes').doc(editingPaymentTypeId).update(paymentType);
                const index = g.paymentTypes.findIndex(pt => pt.id === editingPaymentTypeId);
                if (index !== -1) g.paymentTypes[index] = { id: editingPaymentTypeId, ...paymentType };
            } else {
                paymentType.createdAt = new Date().toISOString();
                const docRef = await userRef('paymentTypes').add(paymentType);
                g.paymentTypes.push({ id: docRef.id, ...paymentType });
            }
            renderPaymentTypes(); closePaymentTypeModal();
        } catch (error) { console.error('Erro ao salvar:', error); alert('Erro ao salvar. Tente novamente.'); }
    });

    if (addCategoryBtn) addCategoryBtn.addEventListener('click', async () => {
        editingCategoryId = null;
        if (categoryName) categoryName.value = '';
        if (categoryType) categoryType.value = 'expense';
        if (categoryColor) categoryColor.value = '#1a73e8';
        if (categoryMonthlyGoal) categoryMonthlyGoal.value = 'R$ 0,00';
        if (categoryActive) { categoryActive.checked = true; updateCategoryActiveText(); }
        if (categoryCostCenter) categoryCostCenter.innerHTML = renderCostCenterOptions(null, g.costCenters);
        if (categoryModal) categoryModal.style.display = 'flex';
    });

    if (closeCategoryBtn) closeCategoryBtn.addEventListener('click', closeCategoryModal);
    if (cancelCategoryBtn) cancelCategoryBtn.addEventListener('click', closeCategoryModal);
    if (categoryActive) categoryActive.addEventListener('change', updateCategoryActiveText);
    if (categoryModal) categoryModal.addEventListener('click', (e) => { if (e.target === categoryModal) closeCategoryModal(); });
    if (categoryMonthlyGoal) { categoryMonthlyGoal.addEventListener('input', function(e) {
        let rawValue = e.target.value.replace(/\D/g, '');
        if (rawValue.length > 15) rawValue = rawValue.slice(0, 15);
        e.target.value = rawValue.length ? formatarMoeda(rawValue) : '';
    }); categoryMonthlyGoal.addEventListener('blur', function(e) { if (!e.target.value) e.target.value = 'R$ 0,00'; }); }
    if (catSearchInput) catSearchInput.addEventListener('input', renderCategories);
    if (catTypeSelect) catTypeSelect.addEventListener('change', renderCategories);
    if (catStatusSelect) catStatusSelect.addEventListener('change', renderCategories);
    if (saveCategoryBtn) saveCategoryBtn.addEventListener('click', async () => {
        const name = categoryName.value.trim();
        if (!name) { alert('Informe o nome da categoria.'); return; }
        const categoryData = { name, type: categoryType.value, color: categoryColor.value, costCenter: categoryCostCenter.value || null, monthlyGoal: valorParaNumero(categoryMonthlyGoal.value) || 0, active: categoryActive.checked, updatedAt: new Date().toISOString() };
        try {
            if (!currentUser) { alert('Usuário não autenticado.'); return; }
            if (editingCategoryId) {
                await userRef('categories').doc(editingCategoryId).update(categoryData);
                const index = g.categories.findIndex(c => c.id === editingCategoryId);
                if (index !== -1) g.categories[index] = { id: editingCategoryId, ...categoryData };
            } else {
                categoryData.createdAt = new Date().toISOString();
                const docRef = await userRef('categories').add(categoryData);
                g.categories.push({ id: docRef.id, ...categoryData });
            }
            renderCategories(); closeCategoryModal();
        } catch (error) { console.error('Erro ao salvar categoria:', error); alert('Erro ao salvar. Tente novamente.'); }
    });

    if (addCostCenterBtn) addCostCenterBtn.addEventListener('click', () => {
        editingCostCenterId = null;
        if (costCenterDescription) costCenterDescription.value = '';
        if (costCenterObservation) costCenterObservation.value = '';
        if (costCenterColor) costCenterColor.value = '#1a73e8';
        if (costCenterActive) { costCenterActive.checked = true; updateCostCenterActiveText(); }
        if (costCenterModal) costCenterModal.style.display = 'flex';
    });
    if (closeCostCenterBtn) closeCostCenterBtn.addEventListener('click', closeCostCenterModal);
    if (cancelCostCenterBtn) cancelCostCenterBtn.addEventListener('click', closeCostCenterModal);
    if (costCenterActive) costCenterActive.addEventListener('change', updateCostCenterActiveText);
    if (costCenterModal) costCenterModal.addEventListener('click', (e) => { if (e.target === costCenterModal) closeCostCenterModal(); });
    if (saveCostCenterBtn) saveCostCenterBtn.addEventListener('click', async () => {
        const description = costCenterDescription.value.trim();
        if (!description) { alert('Informe a descrição do centro de custo.'); return; }
        const costCenterData = { description, observation: costCenterObservation.value.trim() || null, color: costCenterColor.value, active: costCenterActive.checked, updatedAt: new Date().toISOString() };
        try {
            if (!currentUser) { alert('Usuário não autenticado.'); return; }
            if (editingCostCenterId) {
                await userRef('costCenters').doc(editingCostCenterId).update(costCenterData);
                const index = g.costCenters.findIndex(cc => cc.id === editingCostCenterId);
                if (index !== -1) g.costCenters[index] = { id: editingCostCenterId, ...costCenterData };
            } else {
                costCenterData.createdAt = new Date().toISOString();
                const docRef = await userRef('costCenters').add(costCenterData);
                g.costCenters.push({ id: docRef.id, ...costCenterData });
            }
            renderCostCenters(); closeCostCenterModal();
        } catch (error) { console.error('Erro ao salvar centro de custo:', error); alert('Erro ao salvar. Tente novamente.'); }
    });

    if (saveProfileBtn) saveProfileBtn.addEventListener('click', async () => {
        const newName = profileName.value.trim();
        if (!newName) { showToast('O nome não pode ficar vazio.', 'warning'); return; }
        if (!currentUser) return;
        try {
            await db.collection('users').doc(currentUser.uid).update({ name: newName, updatedAt: new Date().toISOString() });
            await updateUserAvatar();
            await currentUser.updateProfile({ displayName: newName });
            showToast('Nome atualizado com sucesso!', 'success');
            aplicarFotoPerfil(null);
        } catch (error) { console.error('Erro ao atualizar nome:', error); showToast('Erro ao atualizar nome.', 'error'); }
    });

    if (changePhotoBtn) changePhotoBtn.addEventListener('click', () => { if (photoUpload) photoUpload.click(); });
    if (photoUpload) photoUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { alert('Por favor, selecione uma imagem.'); return; }
        if (file.size > 1024 * 1024) { alert('A imagem deve ter no máximo 1MB.'); return; }
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const base64 = event.target.result;
                await db.collection('users').doc(currentUser.uid).update({ photoURL: base64 });
                aplicarFotoPerfil(base64);
                await updateUserAvatar();
                alert('Foto atualizada com sucesso!');
            } catch (error) { console.error('Erro ao salvar foto:', error); alert('Erro ao salvar a foto. Tente novamente.'); }
        };
        reader.readAsDataURL(file);
    });

    if (changePasswordBtn) changePasswordBtn.addEventListener('click', async () => {
        if (!currentUser?.email) return;
        try { await auth.sendPasswordResetEmail(currentUser.email); showToast('E-mail de redefinição de senha enviado!', 'success'); }
        catch (error) { showToast('Erro ao enviar e-mail. Tente novamente.', 'error'); }
    });

    if (resetAccountBtn) resetAccountBtn.addEventListener('click', () => {
        if (resetPassword) resetPassword.value = '';
        if (resetConfirmWord) resetConfirmWord.value = '';
        if (resetErrorMsg) resetErrorMsg.textContent = '';
        validateResetForm();
        if (resetAccountModal) resetAccountModal.style.display = 'flex';
    });

    if (resetPassword) resetPassword.addEventListener('input', () => { if (resetErrorMsg) resetErrorMsg.textContent = ''; validateResetForm(); });
    if (resetConfirmWord) resetConfirmWord.addEventListener('input', () => { if (resetErrorMsg) resetErrorMsg.textContent = ''; validateResetForm(); });
    if (closeResetModal) closeResetModal.addEventListener('click', closeResetModalFn);
    if (cancelReset) cancelReset.addEventListener('click', closeResetModalFn);
    if (resetAccountModal) resetAccountModal.addEventListener('click', (e) => { if (e.target === resetAccountModal) closeResetModalFn(); });
    if (confirmReset) confirmReset.addEventListener('click', async () => {
        const password = resetPassword.value.trim();
        const word = resetConfirmWord.value.trim().toUpperCase();
        if (!password || word !== 'EXCLUIR') return;
        if (!currentUser) return;

        const originalText = confirmReset.innerHTML;
        confirmReset.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">autorenew</span> Processando...';
        confirmReset.disabled = true;
        resetErrorMsg.textContent = '';

        const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, password);

        try {
            await currentUser.reauthenticateWithCredential(credential);
            const batch = db.batch();
            const collections = ['transactions', 'paymentTypes', 'categories', 'costCenters', 'accounts'];

            let dinheiroIdParaReset = null;

            for (const col of collections) {
                const snapshot = await userRef(col).get();

                if (col === 'paymentTypes') {
                    snapshot.docs.forEach(doc => {
                        const data = doc.data();
                        if (data.isSystem) {
                            const isCredit = data.description === 'Crédito';
                            batch.update(doc.ref, { active: true, allowsInstallments: isCredit, maxInstallments: isCredit ? 24 : 1 });

                            if (data.description === 'Dinheiro') dinheiroIdParaReset = doc.id;

                        } else { batch.delete(doc.ref); }
                    });
                } else if (col === 'accounts') {
                    snapshot.docs.forEach(doc => {
                        const data = doc.data();
                        if (data.isSystem) {
                            batch.update(doc.ref, {
                                balance: 0,
                                active: true,
                                observation: "Dinheiro em espécie (Físico)",
                                acceptedPaymentTypes: dinheiroIdParaReset ? [dinheiroIdParaReset] : []
                            });
                        } else {
                            batch.delete(doc.ref);
                        }
                    });
                } else {
                    snapshot.docs.forEach(doc => batch.delete(doc.ref));
                }
            }

            await batch.commit();

            showToast('Dados excluídos com sucesso. Reiniciando o sistema...', 'success');
            closeResetModalFn();

            setTimeout(() => { window.location.reload(); }, 2000);

        } catch (error) {
            if (error.code === 'auth/wrong-password') {
                resetErrorMsg.textContent = 'Senha incorreta. Verifique e tente novamente.';
            } else {
                resetErrorMsg.textContent = 'Erro ao redefinir conta. Tente novamente.';
            }
            confirmReset.innerHTML = originalText;
            validateResetForm();
        }
    });

    renderSettings();
}

export {
    initSettings,
    renderSettings,
    settingsCardHandler,
    verificarERepararFormasPagamento,
    verificarERepararContasPadrao,
    closePaymentTypeModal,
    fetchPaymentTypes,
    renderPaymentTypes,
    updateToggleStatus,
    fetchCostCenters,
    loadCostCenters,
    renderCostCenterOptions,
    updateCostCenterActiveText,
    fetchCategories,
    loadPaymentTypes,
    loadCategories,
    preencherSelectCategorias,
    preencherSelectContas,
    preencherSelectPagamentos,
    renderCategories,
    closeCategoryModal,
    updateCategoryActiveText,
    renderCostCenters,
    closeCostCenterModal,
    loadProfile,
    aplicarFotoPerfil,
    validateResetForm,
    closeResetModalFn,
    updateUserAvatar
};
