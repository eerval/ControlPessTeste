import { auth, db } from './firebase-config.js';
import { currentUser, g, userRef, currentView } from './state.js';
import { escapeHtml, escapeJsAttr, formatCurrency, applyDocMask, updateDocLabel, sanitizeFirestoreData, fetchAddressByCep } from './utils.js';
import { criarHtmlItemCadastro } from './factories.js';
import { showToast, askConfirmation } from './ui-helpers.js';
import { updateMiniQrCard } from './accounts.js';

let editingPartnerId = null;

function updatePartnerActiveText() {
    document.getElementById('partnerActiveLabel').textContent = document.getElementById('partnerActive').checked ? 'Ativo' : 'Inativo';
}

async function loadPartners() {
    if (!currentUser) return;
    const snapshot = await userRef('partners').get();
    g.partners = snapshot.docs.map(doc => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
    renderPartners();
}

function renderPartners() {
    const listEl = document.getElementById('partnersList');
    const searchFilter = (document.getElementById('partnerSearchFilter') ? document.getElementById('partnerSearchFilter').value.toLowerCase().trim() : '');
    const typeFilter = document.getElementById('partnerTypeFilter')?.value || 'all';
    const statusFilter = document.getElementById('partnerStatusFilter')?.value || 'all';

    let filtered = g.partners.filter(p => {
        if (searchFilter) {
            const searchableText = `${p.name || ''} ${p.document || ''} ${p.email || ''} ${p.phone || ''} ${p.city || ''} ${p.street || ''} ${p.neighborhood || ''} ${p.state || ''}`.toLowerCase();
            if (!searchableText.includes(searchFilter)) return false;
        }
        if (typeFilter !== 'all' && p.type !== typeFilter) return false;
        if (statusFilter === 'active' && p.active === false) return false;
        if (statusFilter === 'inactive' && p.active !== false) return false;
        return true;
    });

    if (filtered.length === 0) {
        listEl.innerHTML = '<div class="empty-message">Nenhum parceiro cadastrado.</div>';
        return;
    }

    let html = '';
    filtered.forEach(p => {
        const docLabel = p.type === 'Jurídica' ? 'CNPJ' : (p.type === 'Física' ? 'CPF' : 'Documento');
        const doc = p.document || '\u2014';
        const statusLabel = p.active !== false ? 'Ativo' : 'Inativo';
        const statusColor = p.active !== false ? '#188038' : '#5f6368';
        let locationText = '';
        if (p.city || p.state) locationText = ` | ${p.city || ''} ${p.state || ''}`.trim();

        const subHtml = `<strong style="color: ${statusColor};">${statusLabel}</strong> | ${p.type} | ${docLabel}: ${doc}${locationText}`;
        html += criarHtmlItemCadastro(p.id, p.active === false, '', p.name, subHtml, 'edit-partner', 'delete-partner');
    });
    listEl.innerHTML = html;

    document.querySelectorAll('.delete-partner').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const row = e.target.closest('.item-row');
            const id = row.dataset.id;
            if (await askConfirmation('Excluir', 'Excluir este parceiro?', 'Excluir', true, 'warning')) {
                await userRef('partners').doc(id).delete();
                g.partners = g.partners.filter(p => p.id !== id);
                renderPartners();
            }
        });
    });

    document.querySelectorAll('#partnersList .item-row').forEach(row => {
        row.addEventListener('click', (e) => {
            if (e.target.closest('.delete-partner')) return;
            const id = row.dataset.id;
            const partner = g.partners.find(p => p.id === id);
            if (partner) openPartnerModal(partner);
        });
    });
}

function openPartnerModal(partner = null) {
    editingPartnerId = partner ? partner.id : null;
    document.getElementById('partnerModalTitle').textContent = partner ? 'Editar parceiro' : 'Novo parceiro';

    document.getElementById('partnerName').value = partner?.name || '';
    document.getElementById('partnerType').value = partner?.type || 'Física';
    updateDocLabel();

    document.getElementById('partnerDoc').value = partner?.document || '';
    document.getElementById('partnerDocIsPix').checked = partner?.docIsPix || false;

    document.getElementById('partnerPhone').value = partner?.phone || '';
    document.getElementById('partnerPhoneIsPix').checked = partner?.phoneIsPix || false;

    document.getElementById('partnerEmail').value = partner?.email || '';
    document.getElementById('partnerEmailIsPix').checked = partner?.emailIsPix || false;

    document.getElementById('partnerRandomPix').value = partner?.randomPix || '';
    document.getElementById('partnerRandomPixIsPix').checked = partner?.randomPixIsPix || false;

    if (document.getElementById('partnerDocIsPix').checked) {
        document.getElementById('partnerPhoneIsPix').checked = false;
        document.getElementById('partnerEmailIsPix').checked = false;
        document.getElementById('partnerRandomPixIsPix').checked = false;
    } else if (document.getElementById('partnerPhoneIsPix').checked) {
        document.getElementById('partnerEmailIsPix').checked = false;
        document.getElementById('partnerRandomPixIsPix').checked = false;
    } else if (document.getElementById('partnerEmailIsPix').checked) {
        document.getElementById('partnerRandomPixIsPix').checked = false;
    }

    document.getElementById('partnerCep').value = partner?.cep || '';
    document.getElementById('partnerStreet').value = partner?.street || '';
    document.getElementById('partnerNumber').value = partner?.number || '';
    document.getElementById('partnerNeighborhood').value = partner?.neighborhood || '';
    document.getElementById('partnerCity').value = partner?.city || '';
    document.getElementById('partnerState').value = partner?.state || '';
    document.getElementById('partnerObservation').value = partner?.observation || '';

    const isActive = partner ? partner.active !== false : true;
    document.getElementById('partnerActive').checked = isActive;
    updatePartnerActiveText();

    document.querySelector('[data-target="tabGeral"]').click();

    updateMiniQrCard();

    document.getElementById('partnerModal').style.display = 'flex';
}

function initPartners() {
    const btnOpenPartner = document.getElementById('openPartnerModalBtn');
    if (btnOpenPartner) btnOpenPartner.addEventListener('click', () => openPartnerModal());

    const btnClosePartner = document.getElementById('closePartnerModal');
    if (btnClosePartner) btnClosePartner.addEventListener('click', () => document.getElementById('partnerModal').style.display = 'none');

    const btnCancelPartner = document.getElementById('cancelPartner');
    if (btnCancelPartner) btnCancelPartner.addEventListener('click', () => document.getElementById('partnerModal').style.display = 'none');

    const partnerModalEl = document.getElementById('partnerModal');
    if (partnerModalEl) partnerModalEl.addEventListener('click', (e) => {
        if (e.target === partnerModalEl) partnerModalEl.style.display = 'none';
    });

    const partnerDocEl = document.getElementById('partnerDoc');
    if (partnerDocEl) partnerDocEl.addEventListener('input', applyDocMask);

    const partnerTypeEl = document.getElementById('partnerType');
    if (partnerTypeEl) partnerTypeEl.addEventListener('change', updateDocLabel);

    const partnerCepEl = document.getElementById('partnerCep');
    if (partnerCepEl) partnerCepEl.addEventListener('blur', (e) => fetchAddressByCep(e.target.value));

    const partnerActiveEl = document.getElementById('partnerActive');
    if (partnerActiveEl) partnerActiveEl.addEventListener('change', updatePartnerActiveText);

    if (document.getElementById('savePartner')) document.getElementById('savePartner').addEventListener('click', async () => {
        const name = document.getElementById('partnerName').value.trim();
        if (!name) { alert('Nome é obrigatório.'); return; }

        const partnerData = {
            name: name,
            type: document.getElementById('partnerType').value,
            document: document.getElementById('partnerDoc').value.trim() || null,
            docIsPix: document.getElementById('partnerDocIsPix').checked,
            phone: document.getElementById('partnerPhone').value.trim() || null,
            phoneIsPix: document.getElementById('partnerPhoneIsPix').checked,
            email: document.getElementById('partnerEmail').value.trim() || null,
            emailIsPix: document.getElementById('partnerEmailIsPix').checked,
            randomPix: document.getElementById('partnerRandomPix').value.trim() || null,
            randomPixIsPix: document.getElementById('partnerRandomPixIsPix').checked,
            cep: document.getElementById('partnerCep').value.trim() || null,
            street: document.getElementById('partnerStreet').value.trim() || null,
            number: document.getElementById('partnerNumber').value.trim() || null,
            neighborhood: document.getElementById('partnerNeighborhood').value.trim() || null,
            city: document.getElementById('partnerCity').value.trim() || null,
            state: document.getElementById('partnerState').value || null,
            observation: document.getElementById('partnerObservation').value.trim() || null,
            active: document.getElementById('partnerActive').checked,
            updatedAt: firebase.firestore.FieldValue ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
        };

        try {
            if (!currentUser) return;
            if (editingPartnerId) {
                await userRef('partners').doc(editingPartnerId).update(partnerData);
                const index = g.partners.findIndex(p => p.id === editingPartnerId);
                if (index !== -1) g.partners[index] = { id: editingPartnerId, ...partnerData };
            } else {
                partnerData.createdAt = new Date().toISOString();
                const docRef = await userRef('partners').add(partnerData);
                g.partners.push({ id: docRef.id, ...partnerData });
            }
            renderPartners();
            document.getElementById('partnerModal').style.display = 'none';
        } catch (error) {
            console.error('Erro ao salvar parceiro:', error);
            alert('Erro ao salvar.');
        }
    });

    if (document.getElementById('partnerSearchFilter')) document.getElementById('partnerSearchFilter').addEventListener('input', renderPartners);
    if (document.getElementById('partnerTypeFilter')) document.getElementById('partnerTypeFilter').addEventListener('change', renderPartners);
    if (document.getElementById('partnerStatusFilter')) document.getElementById('partnerStatusFilter').addEventListener('change', renderPartners);

    if (document.getElementById('clearPartnerFiltersBtn')) document.getElementById('clearPartnerFiltersBtn').addEventListener('click', () => {
        if (document.getElementById('partnerSearchFilter')) document.getElementById('partnerSearchFilter').value = '';
        if (document.getElementById('partnerTypeFilter')) document.getElementById('partnerTypeFilter').value = 'all';
        if (document.getElementById('partnerStatusFilter')) document.getElementById('partnerStatusFilter').value = 'all';
        renderPartners();
        showToast('Filtros restaurados', 'success');
    });
}

export { initPartners, loadPartners, renderPartners };
