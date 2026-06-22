import { auth, db } from './firebase-config.js';
import { currentUser, g, userRef,
  ofxParsedTransactions, ofxCurrentStep, ofxCurrentFilter, ofxCurrentStatusFilter,
  ofxItemSendoConciliado, editingTransactionId } from './state.js';
import { escapeHtml, escapeJsAttr, formatCurrency, formatDate, formatDateISO, sanitizeFirestoreData, getTodayISO } from './utils.js';
import { showToast, askConfirmation } from './ui-helpers.js';
import { preencherSelectContas, preencherSelectCategorias, preencherSelectPagamentos } from './settings.js';
import { renderTransactions } from './transactions.js';
import { renderDashboard } from './dashboard.js';

const importOfxModal = document.getElementById('importOfxModal');
const openImportOfxBtn = document.getElementById('openImportOfxBtn');
const closeImportOfxBtn = document.getElementById('closeImportOfxBtn');
const ofxAccountSelect = document.getElementById('ofxAccountSelect');
const ofxDropZone = document.getElementById('ofxDropZone');
const ofxFileInput = document.getElementById('ofxFileInput');
const ofxFileNameDisplay = document.getElementById('ofxFileNameDisplay');
const ofxPrevBtn = document.getElementById('ofxPrevBtn');
const ofxNextBtn = document.getElementById('ofxNextBtn');
const ofxImportBtn = document.getElementById('ofxImportBtn');
const ofxReviewList = document.getElementById('ofxReviewList');
const ofxSelectAll = document.getElementById('ofxSelectAll');
const ofxSummaryTotal = document.getElementById('ofxSummaryTotal');

function closeOfxModal() { importOfxModal.style.display = 'none'; }

function handleOfxFile(file) {
    const nome = file.name.toLowerCase();
    const isOfx = nome.endsWith('.ofx');
    const isCsv = nome.endsWith('.csv');

    if (!isOfx && !isCsv) {
        showToast('Formato inválido. Selecione um arquivo .OFX ou .CSV', 'error');
        return;
    }

    ofxFileNameDisplay.textContent = `Arquivo carregado: ${file.name}`;
    ofxFileNameDisplay.style.display = 'block';

    const reader = new FileReader();
    reader.onload = function(e) {
        if (isOfx) {
            parseOfxContent(e.target.result);
        } else {
            const ofxConvertido = parseCsvToOfx(e.target.result);
            if (ofxConvertido) parseOfxContent(ofxConvertido);
        }
        checkOfxStep1Ready();
    };
    reader.readAsText(file, 'UTF-8');
}

function parseCsvToOfx(csvText) {

    function parseCsvLine(linha) {
        const campos = [];
        let campo = '', emAspas = false;
        for (let i = 0; i < linha.length; i++) {
            const ch = linha[i];
            if (ch === '"') {
                if (emAspas && linha[i + 1] === '"') { campo += '"'; i++; }
                else emAspas = !emAspas;
            } else if (ch === ',' && !emAspas) {
                campos.push(campo.trim()); campo = '';
            } else { campo += ch; }
        }
        campos.push(campo.trim());
        return campos;
    }

    function parseMoeda(str) {
        const limpo = str.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
        return parseFloat(limpo);
    }

    function parseData(str) {
        str = str.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
        const br = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (br) return `${br[3]}-${br[2]}-${br[1]}`;
        const br2 = str.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
        if (br2) return `20${br2[3]}-${br2[2]}-${br2[1]}`;
        return null;
    }

    function toOfxDate(iso) {
        return iso.replace(/-/g, '') + '120000';
    }

    const linhas = csvText.split(/\r?\n/).filter(l => l.trim() !== '');
    if (linhas.length < 2) {
        showToast('CSV vazio ou sem lançamentos.', 'error');
        return null;
    }

    const header = parseCsvLine(linhas[0]).map(h =>
        h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
    );

    const find = (...termos) => header.findIndex(h => termos.some(t => h.includes(t)));

    const iData   = find('data');
    const iDesc   = find('descricao', 'historico', 'movimentacao', 'lancamento', 'memo', 'obs');
    const iValor  = find('valor', 'quantia', 'montante', 'value', 'amount');
    const iTipo   = find('tipo', 'type', 'natureza');

    if (iData < 0 || iValor < 0) {
        showToast('CSV não reconhecido: colunas obrigatórias "Data" e "Valor" não encontradas.', 'error');
        return null;
    }

    let blocos = '';
    let erros = 0;

    for (let i = 1; i < linhas.length; i++) {
        const cols = parseCsvLine(linhas[i]);
        if (cols.length <= Math.max(iData, iValor)) { erros++; continue; }

        const dataIso = parseData(cols[iData] || '');
        if (!dataIso) { erros++; continue; }

        let valor = parseMoeda(cols[iValor] || '');
        if (isNaN(valor)) { erros++; continue; }

        if (iTipo >= 0 && cols[iTipo]) {
            const tipo = cols[iTipo].toLowerCase().trim();
            if ((tipo.includes('deb') || tipo === 'd') && valor > 0) valor = -valor;
            if ((tipo.includes('cred') || tipo === 'c') && valor < 0) valor = Math.abs(valor);
        }

        const desc  = iDesc >= 0 ? (cols[iDesc] || 'Lançamento CSV') : 'Lançamento CSV';
        const fitid = `csv_${dataIso.replace(/-/g,'')}_${Math.abs(valor).toFixed(0)}_${i}`;

        blocos += `
<STMTTRN>
<TRNTYPE>${valor >= 0 ? 'CREDIT' : 'DEBIT'}
<DTPOSTED>${toOfxDate(dataIso)}
<TRNAMT>${valor.toFixed(2)}
<FITID>${fitid}
<MEMO>${desc}
</STMTTRN>`;
    }

    if (!blocos) {
        showToast('Nenhum lançamento válido encontrado no CSV.', 'error');
        return null;
    }

    if (erros > 0) showToast(`${erros} linha(s) ignorada(s) por formato inválido.`, 'warning');

    return `
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
${blocos}
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;
}

function checkOfxStep1Ready() {
    if (ofxAccountSelect.value && ofxParsedTransactions.length > 0) {
        ofxNextBtn.disabled = false;
    } else {
        ofxNextBtn.disabled = true;
    }
}

function parseOfxContent(content) {
    ofxParsedTransactions.length = 0;
    const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
    let match;

    while ((match = trnRegex.exec(content)) !== null) {
        const block = match[1];

        const amtMatch = block.match(/<TRNAMT>([-+]?\d*\.?\d+)/);
        const dateMatch = block.match(/<DTPOSTED>(\d{8})/);
        const memoMatch = block.match(/<MEMO>([^<]*)/);
        const nameMatch = block.match(/<NAME>([^<]*)/);
        const fitidMatch = block.match(/<FITID>([^<]*)/);

        if (amtMatch && dateMatch) {
            const amount = parseFloat(amtMatch[1]);
            const dateStr = dateMatch[1];
            const formattedDate = `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`;
            const fitid = fitidMatch ? fitidMatch[1].trim() : ('manual_' + (crypto.randomUUID ? crypto.randomUUID().split('-').join('').substring(0, 9) : Date.now().toString(36) + Math.random().toString(36).substr(2, 5)));

            let description = 'Lançamento Importado';
            if (memoMatch && memoMatch[1].trim()) description = memoMatch[1].trim();
            else if (nameMatch && nameMatch[1].trim()) description = nameMatch[1].trim();

            description = description.replace(/^[0-9\-\/]+\s*/, '').trim();

            const jaExiste = g.transactions.some(t => t.fitid === fitid);

            ofxParsedTransactions.push({
                id: 'ofx_' + (crypto.randomUUID ? crypto.randomUUID().split('-').join('').substring(0, 9) : Date.now().toString(36) + Math.random().toString(36).substr(2, 5)),
                fitid: fitid,
                isDuplicate: jaExiste,
                type: amount >= 0 ? 'income' : 'expense',
                value: Math.abs(amount),
                date: formattedDate,
                description: description,
                category: '',
                partner: '',
                paymentType: '',
                selected: !jaExiste
            });
        }
    }

    const historicoMapeado = {};

    const transacoesAntigas = [...g.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    transacoesAntigas.forEach(t => {
        if (t.description && (t.category || t.partnerId || t.paymentMethod)) {
            const descLimpa = t.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

            if (descLimpa.length > 3) {
                historicoMapeado[descLimpa] = {
                    category: t.category || '',
                    partner: t.partnerId || '',
                    paymentType: t.paymentMethod || ''
                };
            }
        }
    });

    ofxParsedTransactions.forEach(novoTx => {
        if (novoTx.isDuplicate) return;

        const descNova = novoTx.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        let matchEncontrado = null;

        if (historicoMapeado[descNova]) {
            matchEncontrado = historicoMapeado[descNova];
        } else {
            for (let chaveAntiga in historicoMapeado) {
                if (descNova.includes(chaveAntiga) || chaveAntiga.includes(descNova)) {
                    matchEncontrado = historicoMapeado[chaveAntiga];
                    break;
                }
            }
        }

        if (matchEncontrado) {
            novoTx.category = matchEncontrado.category;
            novoTx.partner = matchEncontrado.partner;
            novoTx.paymentType = matchEncontrado.paymentType;
        }
    });

    const transacoesPendentes = [...g.transactions].filter(t => !t.isPaid);

    ofxParsedTransactions.forEach(novoTx => {
        if (novoTx.isDuplicate) return;

        const possivelMatch = transacoesPendentes.find(p => {
            const mesmoTipo = p.type === novoTx.type;
            const mesmoValor = parseFloat(p.value).toFixed(2) === parseFloat(novoTx.value).toFixed(2);

            const dataPendente = new Date(p.date);
            const dataOfx = new Date(novoTx.date);
            const diffDias = Math.abs(dataOfx - dataPendente) / (1000 * 60 * 60 * 24);

            return mesmoTipo && mesmoValor && diffDias <= 35;
        });

        if (possivelMatch) {
            novoTx.reconcileWith = possivelMatch.id;
            novoTx.reconcileName = possivelMatch.description;

            novoTx.category = possivelMatch.category || novoTx.category;
            novoTx.partner = possivelMatch.partnerId || novoTx.partner;
            novoTx.paymentType = possivelMatch.paymentMethod || novoTx.paymentType;
        }
    });

    if (ofxParsedTransactions.length === 0) {
        showToast('Não encontramos lançamentos neste arquivo OFX.', 'warning');
        ofxFileInput.value = '';
        ofxFileNameDisplay.style.display = 'none';
    } else {
        showToast(`${ofxParsedTransactions.length} lançamentos encontrados!`, 'success');

        let minDate = ofxParsedTransactions[0].date;
        let maxDate = ofxParsedTransactions[0].date;

        ofxParsedTransactions.forEach(t => {
            if (t.date < minDate) minDate = t.date;
            if (t.date > maxDate) maxDate = t.date;
        });

        if (document.getElementById('ofxFilterDateStart')) document.getElementById('ofxFilterDateStart').value = minDate;
        if (document.getElementById('ofxFilterDateEnd')) document.getElementById('ofxFilterDateEnd').value = maxDate;
    }
}

function goToOfxStep(step) {
    ofxCurrentStep = step;

    document.querySelectorAll('#ofxStepIndicator .step').forEach((s, idx) => s.classList.toggle('active', idx + 1 <= step));
    document.querySelectorAll('#importOfxModal .step-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`ofxStep${step}`).classList.add('active');

    ofxPrevBtn.disabled = (step === 1);

    if (step === 1) {
        ofxNextBtn.style.display = 'inline-block';
        ofxImportBtn.style.display = 'none';
    } else if (step === 2) {
        ofxNextBtn.style.display = 'none';
        ofxImportBtn.style.display = 'inline-block';
        renderOfxReviewList();
    }
}

function txPassaNoFiltro(t, startDate, endDate) {
    if (ofxCurrentFilter !== 'all' && t.type !== ofxCurrentFilter) return false;
    if (ofxCurrentStatusFilter === 'new' && t.isDuplicate) return false;
    if (ofxCurrentStatusFilter === 'imported' && !t.isDuplicate) return false;
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    return true;
}

function renderOfxReviewList() {
    let partnerOptionsHtml = '<option value="">Sem parceiro</option>';
    g.partners.filter(p => p.active !== false)
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(p => {
        partnerOptionsHtml += `<option value="${p.id}">${p.name}</option>`;
    });

    let paymentOptionsHtml = '<option value="">Forma de pagamento</option>';
    g.paymentTypes.filter(pt => pt.active !== false)
                .sort((a, b) => a.description.localeCompare(b.description))
                .forEach(pt => {
        paymentOptionsHtml += `<option value="${pt.id}">${pt.description}</option>`;
    });

    let html = '';

    const startDate = document.getElementById('ofxFilterDateStart') ? document.getElementById('ofxFilterDateStart').value : '';
    const endDate = document.getElementById('ofxFilterDateEnd') ? document.getElementById('ofxFilterDateEnd').value : '';

    const filteredOfxTxs = ofxParsedTransactions.filter(t => txPassaNoFiltro(t, startDate, endDate));

    filteredOfxTxs.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((t, i) => {
        const isIncome = t.type === 'income';
        const sign = isIncome ? '+' : '-';

        const valClass = isIncome ? 'receipt-val-income' : 'receipt-item-desc';

        const opacity = t.isDuplicate ? '0.5' : '1';
        const pointerEvents = t.isDuplicate ? 'none' : 'auto';
        const checkElement = t.isDuplicate
            ? `<span class="material-icons" style="color: #d93025; font-size: 1.2rem; flex-shrink: 0;" title="Lançamento já importado anteriormente">warning</span>`
            : `<input type="checkbox" class="ofx-check" data-id="${t.id}" ${t.selected ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #1a73e8; cursor: pointer; flex-shrink: 0;">`;

        const isDark = document.body.classList.contains('dark-mode');
        let badgeConciliacao = '';
        if (t.reconcileWith) {
            badgeConciliacao = `<div onclick="window.abrirModalConciliacaoOfx('${escapeJsAttr(t.id)}')" style="background: ${isDark ? 'rgba(138,180,248,0.15)' : 'rgba(26,115,232,0.1)'}; color: ${isDark ? '#8ab4f8' : '#1a73e8'}; font-size: 0.75rem; font-weight: 600; padding: 4px 10px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px; margin-top: 6px; border: 1px solid ${isDark ? 'rgba(138,180,248,0.3)' : 'rgba(26,115,232,0.3)'}; cursor: pointer; transition: background 0.2s;" title="Clique para trocar"><span class="material-icons" style="font-size: 1rem;">link</span> Conciliar com: ${escapeHtml(t.reconcileName)} <span class="material-icons" style="font-size: 0.85rem; margin-left: 2px;">edit</span></div>`;
        } else {
            badgeConciliacao = `<div onclick="window.abrirModalConciliacaoOfx('${escapeJsAttr(t.id)}')" style="background: transparent; color: ${isDark ? '#9aa0a6' : '#5f6368'}; font-size: 0.7rem; font-weight: 500; padding: 4px 10px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px; margin-top: 6px; border: 1px dashed ${isDark ? 'var(--cor-borda-dark)' : '#dadce0'}; cursor: pointer; transition: background 0.2s;" title="Clique para vincular a uma conta agendada"><span class="material-icons" style="font-size: 0.9rem;">add_circle_outline</span> Importar como novo (Mudar)</div>`;
        }

        let catOptionsHtml = '<option value="">Sem categoria</option>';
        g.categories.filter(c => c.active !== false && c.type === t.type)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .forEach(c => {
            catOptionsHtml += `<option value="${c.id}">${c.name}</option>`;
        });

        html += `
            <div class="ofx-tx-item" style="opacity: ${opacity}; pointer-events: ${pointerEvents};">
                <div style="display: flex; align-items: center; gap: 12px; flex: 2; overflow: hidden;">
                    ${checkElement}
                    <div style="overflow: hidden; padding-right: 8px;">
                        <div class="receipt-item-desc" title="${t.description}" style="font-weight: 500; font-size: 0.9rem; line-height: 1.3; margin-bottom: 2px; white-space: normal; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${t.description}</div>
                        <div style="font-size: 0.8rem; color: #5f6368;">${formatDate(t.date)} ${t.isDuplicate ? '<span style="color: #d93025; font-weight: 600; margin-left: 6px;">(Já importado)</span>' : ''}</div>
                        ${badgeConciliacao}
                    </div>
                </div>

                <div style="flex: 1.2; margin: 0 12px; display: flex; flex-direction: column; gap: 6px;">
                    <select class="filter-select ofx-cat-select" data-id="${t.id}" style="width: 100%; padding: 4px 8px; font-size: 0.8rem;" title="Categoria">
                        ${catOptionsHtml}
                    </select>
                    <select class="filter-select ofx-partner-select" data-id="${t.id}" style="width: 100%; padding: 4px 8px; font-size: 0.8rem;" title="Parceiro">
                        ${partnerOptionsHtml}
                    </select>
                    <select class="filter-select ofx-payment-select" data-id="${t.id}" style="width: 100%; padding: 4px 8px; font-size: 0.8rem;" title="Forma de Pagamento">
                        ${paymentOptionsHtml}
                    </select>
                </div>

                <div class="${valClass}" style="font-weight: bold; text-align: right; width: 90px;">
                    ${sign}${formatCurrency(t.value)}
                </div>
            </div>
        `;
    });

    ofxReviewList.innerHTML = html;

    document.querySelectorAll('.ofx-check').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const tx = ofxParsedTransactions.find(x => x.id === e.target.dataset.id);
            if (tx) tx.selected = e.target.checked;
            updateOfxSummary();
        });
    });

    const atualizarVisualDoSelect = (selectElement) => {
        if (selectElement.value !== "") {
            selectElement.classList.add('ofx-select-filled');
        } else {
            selectElement.classList.remove('ofx-select-filled');
        }
    };

    document.querySelectorAll('.ofx-cat-select').forEach(sel => {
        const tx = ofxParsedTransactions.find(x => x.id === sel.dataset.id);
        if (tx && tx.category) sel.value = tx.category;
        atualizarVisualDoSelect(sel);
        sel.addEventListener('change', (e) => {
            const tx = ofxParsedTransactions.find(x => x.id === e.target.dataset.id);
            if (tx) tx.category = e.target.value;
            atualizarVisualDoSelect(e.target);
        });
    });

    document.querySelectorAll('.ofx-partner-select').forEach(sel => {
        const tx = ofxParsedTransactions.find(x => x.id === sel.dataset.id);
        if (tx && tx.partner) sel.value = tx.partner;
        atualizarVisualDoSelect(sel);
        sel.addEventListener('change', (e) => {
            const tx = ofxParsedTransactions.find(x => x.id === e.target.dataset.id);
            if (tx) tx.partner = e.target.value;
            atualizarVisualDoSelect(e.target);
        });
    });

    document.querySelectorAll('.ofx-payment-select').forEach(sel => {
        const tx = ofxParsedTransactions.find(x => x.id === sel.dataset.id);
        if (tx && tx.paymentType) sel.value = tx.paymentType;
        atualizarVisualDoSelect(sel);
        sel.addEventListener('change', (e) => {
            const tx = ofxParsedTransactions.find(x => x.id === e.target.dataset.id);
            if (tx) tx.paymentType = e.target.value;
            atualizarVisualDoSelect(e.target);
        });
    });

    updateOfxSummary();
}

function updateOfxSummary() {
    const countTotal = ofxParsedTransactions.filter(t => t.selected).length;
    ofxSummaryTotal.textContent = `Lançamentos prontos para importar: ${countTotal}`;
    ofxImportBtn.disabled = countTotal === 0;

    const topCountEl = document.getElementById('ofxTopSelectionCount');
    if (topCountEl) {
        if (countTotal > 0) {
            topCountEl.textContent = `${countTotal} selecionado(s)`;
            topCountEl.style.display = 'block';
        } else {
            topCountEl.style.display = 'none';
        }
    }

    const startDate = document.getElementById('ofxFilterDateStart') ? document.getElementById('ofxFilterDateStart').value : '';
    const endDate = document.getElementById('ofxFilterDateEnd') ? document.getElementById('ofxFilterDateEnd').value : '';

    const visibleTxs = ofxParsedTransactions.filter(t => txPassaNoFiltro(t, startDate, endDate));
    const selectedVisible = visibleTxs.filter(t => t.selected).length;

    const visibleAndSelectable = visibleTxs.filter(t => !t.isDuplicate);

    if (visibleAndSelectable.length > 0 && selectedVisible === visibleAndSelectable.length) {
        ofxSelectAll.checked = true;
    } else {
        ofxSelectAll.checked = false;
    }
}

export function initOfxImport() {

    if (openImportOfxBtn) {
        openImportOfxBtn.addEventListener('click', async () => {
            await Promise.all([loadAccounts(), fetchCategories()]);

            ofxAccountSelect.innerHTML = '<option value="" disabled selected>Selecione a conta...</option>';
            g.accounts.filter(a => a.active !== false).forEach(acc => {
                const opt = document.createElement('option');
                opt.value = acc.id;
                opt.textContent = `${acc.name} (Saldo: ${formatCurrency(acc.balance)})`;
                ofxAccountSelect.appendChild(opt);
            });

            ofxParsedTransactions.length = 0;
            ofxFileInput.value = '';
            ofxFileNameDisplay.style.display = 'none';

            ofxCurrentFilter = 'all';
            ofxCurrentStatusFilter = 'all';
            document.querySelectorAll('#ofxTypeFilter button').forEach(b => {
                b.classList.remove('active');
                if(b.dataset.type === 'all') b.classList.add('active');
            });
            document.querySelectorAll('#ofxStatusFilter button').forEach(b => {
                b.classList.remove('active');
                if(b.dataset.status === 'all') b.classList.add('active');
            });
            if(document.getElementById('ofxFilterDateStart')) document.getElementById('ofxFilterDateStart').value = '';
            if(document.getElementById('ofxFilterDateEnd')) document.getElementById('ofxFilterDateEnd').value = '';

            goToOfxStep(1);
            importOfxModal.style.display = 'flex';
        });
    }

    if (closeImportOfxBtn) closeImportOfxBtn.addEventListener('click', closeOfxModal);
    importOfxModal.addEventListener('click', (e) => { if (e.target === importOfxModal) closeOfxModal(); });

    ofxDropZone.addEventListener('click', () => ofxFileInput.click());

    ofxDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        ofxDropZone.classList.add('dragover');
    });

    ofxDropZone.addEventListener('dragleave', () => {
        ofxDropZone.classList.remove('dragover');
    });

    ofxDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        ofxDropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            ofxFileInput.files = e.dataTransfer.files;
            handleOfxFile(e.dataTransfer.files[0]);
        }
    });

    ofxFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleOfxFile(e.target.files[0]);
    });

    ofxAccountSelect.addEventListener('change', checkOfxStep1Ready);

    ofxNextBtn.addEventListener('click', () => goToOfxStep(2));
    ofxPrevBtn.addEventListener('click', () => goToOfxStep(1));

    document.querySelectorAll('#ofxTypeFilter button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#ofxTypeFilter button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            ofxCurrentFilter = btn.dataset.type;

            ofxParsedTransactions.forEach(t => t.selected = false);
            const selectAllCheckbox = document.getElementById('ofxSelectAll');
            if (selectAllCheckbox) selectAllCheckbox.checked = false;

            renderOfxReviewList();
        });
    });

    document.querySelectorAll('#ofxStatusFilter button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#ofxStatusFilter button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            ofxCurrentStatusFilter = btn.dataset.status;

            ofxParsedTransactions.forEach(t => t.selected = false);
            const selectAllCheckbox = document.getElementById('ofxSelectAll');
            if (selectAllCheckbox) selectAllCheckbox.checked = false;

            renderOfxReviewList();
        });
    });

    document.getElementById('ofxFilterDateStart')?.addEventListener('change', renderOfxReviewList);
    document.getElementById('ofxFilterDateEnd')?.addEventListener('change', renderOfxReviewList);

    ofxSelectAll.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const startDate = document.getElementById('ofxFilterDateStart') ? document.getElementById('ofxFilterDateStart').value : '';
        const endDate = document.getElementById('ofxFilterDateEnd') ? document.getElementById('ofxFilterDateEnd').value : '';

        ofxParsedTransactions.forEach(t => {
            if (txPassaNoFiltro(t, startDate, endDate)) {
                if (!t.isDuplicate) {
                    t.selected = isChecked;
                }
            }
        });

        renderOfxReviewList();
    });

    window.abrirModalConciliacaoOfx = function(ofxId) {
        const tx = ofxParsedTransactions.find(t => t.id === ofxId);
        ofxItemSendoConciliado = tx;
        if (!tx) return;

        const modal = document.getElementById('ofxReconcileModal');
        const listaEl = document.getElementById('ofxReconcileList');
        const isDark = document.body.classList.contains('dark-mode');

        const ofxDateObj = new Date(tx.date + 'T12:00:00');
        ofxDateObj.setDate(ofxDateObj.getDate() + 15);
        const dataLimiteSegura = formatDateISO(ofxDateObj);

        const pendentes = g.transactions.filter(t =>
            !t.isPaid &&
            t.type === tx.type &&
            t.date <= dataLimiteSegura
        );
        pendentes.sort((a, b) => new Date(a.date) - new Date(b.date));

        let html = `
            <div onclick="window.escolherConciliacaoOfx('', '', 0)" style="padding: 12px; border: 1px solid ${isDark ? 'var(--cor-borda-dark)' : '#dadce0'}; border-radius: 12px; margin-bottom: 12px; cursor: pointer; display: flex; align-items: center; gap: 12px; background: ${isDark ? 'var(--cor-superficie-dark)' : '#f8f9fa'}; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                <span class="material-icons" style="color: ${isDark ? '#9aa0a6' : '#5f6368'};">add_circle_outline</span>
                <span style="font-weight: 600; color: ${isDark ? '#e0e0e0' : '#202124'};">Não conciliar (Importar como NOVO)</span>
            </div>
            <div style="font-size: 0.8rem; font-weight: bold; color: #9aa0a6; text-transform: uppercase; margin-bottom: 8px;">Lançamentos Pendentes (${pendentes.length}):</div>
        `;

        if (pendentes.length === 0) {
            html += `<div style="text-align: center; color: #9aa0a6; padding: 12px;">Nenhuma conta pendente encontrada para este tipo.</div>`;
        } else {
            pendentes.forEach(p => {
                const diffVal = Math.abs(parseFloat(p.value) - parseFloat(tx.value));
                const isPerfectMatch = diffVal < 0.05;
                const badgeMatch = isPerfectMatch ? `<span style="background: #e6f4ea; color: #188038; font-size: 0.65rem; padding: 2px 6px; border-radius: 8px; font-weight: bold; border: 1px solid #ceead6; margin-left: 6px;">VALOR EXATO</span>` : '';

                html += `
                    <div onclick="window.escolherConciliacaoOfx('${escapeJsAttr(p.id)}', '${escapeJsAttr(p.description)}', ${p.value})" style="padding: 12px; border: 1px solid ${isDark ? '#444746' : '#e8eaed'}; border-radius: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s;" onmouseover="this.style.background='${isDark ? 'var(--cor-superficie-dark)' : '#f1f3f4'}'" onmouseout="this.style.background='transparent'">
                        <div style="overflow: hidden; padding-right: 8px;">
                            <div style="font-weight: 600; font-size: 0.9rem; color: ${isDark ? '#e0e0e0' : '#202124'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.description} ${badgeMatch}</div>
                            <div style="font-size: 0.8rem; color: #5f6368;">Vence: ${formatDate(p.date)}</div>
                        </div>
                        <div style="font-weight: bold; font-size: 1rem; color: ${p.type === 'income' ? (isDark ? '#81c995' : '#188038') : (isDark ? '#ff8a80' : '#d93025')};">
                            ${formatCurrency(p.value)}
                        </div>
                    </div>
                `;
            });
        }

        listaEl.innerHTML = html;
        modal.style.display = 'flex';
    };

    window.escolherConciliacaoOfx = async function(pendenteId, pendenteName, pendenteValue) {
        if (ofxItemSendoConciliado) {
            if (pendenteId) {

                const diffVal = Math.abs(parseFloat(pendenteValue) - parseFloat(ofxItemSendoConciliado.value));
                let assumirValorDoExtrato = true;

                if (diffVal > 0.05) {
                    const valExtratoStr = formatCurrency(ofxItemSendoConciliado.value);
                    const valPendenteStr = formatCurrency(pendenteValue);
                    const valDiffStr = formatCurrency(diffVal);

                    const msg = `
                        <div style="margin-bottom: 20px;">
                            Foi identificada uma diferença entre o valor registrado no sistema e o retornado pelo extrato bancário.
                        </div>

                        <div class="divergence-box">
                            <div style="flex: 1; text-align: center;">
                                <span class="label">Banco (Extrato)</span>
                                <span class="val-bank">${valExtratoStr}</span>
                            </div>
                            <div class="divergence-divider"></div>
                            <div style="flex: 1; text-align: center;">
                                <span class="label">Agendado</span>
                                <span class="val-sys">${valPendenteStr}</span>
                            </div>
                        </div>

                        <div style="text-align: center;">
                            <div class="divergence-diff">
                                <span class="material-icons" style="font-size: 1.2rem;">analytics</span>
                                Diferença de ${valDiffStr}
                            </div>
                        </div>

                        <div class="divergence-recommendation">
                            <span class="material-icons">check_circle</span>
                            <div>
                                <strong>Recomendação do sistema</strong>
                                Utilizar o valor do extrato. O saldo deste lançamento será atualizado de <strong style="display: inline; margin: 0;">${valPendenteStr}</strong> para <strong style="display: inline; margin: 0;">${valExtratoStr}</strong>.
                            </div>
                        </div>
                    `;

                    assumirValorDoExtrato = await askConfirmation('Valor Divergente Identificado', msg, 'Usar Valor do Banco', false, 'warning_amber');
                }

                ofxItemSendoConciliado.reconcileWith = pendenteId;
                ofxItemSendoConciliado.reconcileName = pendenteName;

                ofxItemSendoConciliado.updateValueToOfx = assumirValorDoExtrato;
                ofxItemSendoConciliado.originalPendingValue = parseFloat(pendenteValue);

                const pOrig = g.transactions.find(t => t.id === pendenteId);
                if (pOrig) {
                    ofxItemSendoConciliado.category = pOrig.category || ofxItemSendoConciliado.category;
                    ofxItemSendoConciliado.partner = pOrig.partnerId || ofxItemSendoConciliado.partner;
                    ofxItemSendoConciliado.paymentType = pOrig.paymentMethod || ofxItemSendoConciliado.paymentType;
                }
            } else {
                ofxItemSendoConciliado.reconcileWith = null;
                ofxItemSendoConciliado.reconcileName = null;
                ofxItemSendoConciliado.updateValueToOfx = false;
            }

            document.getElementById('ofxReconcileModal').style.display = 'none';
            renderOfxReviewList();
        }
    };

    document.getElementById('closeOfxReconcileBtn')?.addEventListener('click', () => { document.getElementById('ofxReconcileModal').style.display = 'none'; });
    document.getElementById('ofxReconcileModal')?.addEventListener('click', (e) => { if (e.target === document.getElementById('ofxReconcileModal')) document.getElementById('ofxReconcileModal').style.display = 'none'; });

    ofxImportBtn.addEventListener('click', async () => {
        const txsToImport = ofxParsedTransactions.filter(t => t.selected);
        if (txsToImport.length === 0) return;

        const accountId = ofxAccountSelect.value;
        const account = g.accounts.find(a => a.id === accountId);

        let transCount = 0;
        let transSum = 0;
        let transValuesList = [];
        const transferKeywords = /(pix|ted|doc|transf|tef|tev|envio)/i;

        const nomeUsuarioMestre = (window.currentUserName || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const termosNomeUsuario = nomeUsuarioMestre.split(' ').filter(palavra => palavra.length > 2);

        txsToImport.forEach(t => {
            const descBancoNormalizada = t.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            if (transferKeywords.test(descBancoNormalizada)) {

                const contemProprioNome = termosNomeUsuario.some(termo => descBancoNormalizada.includes(termo));

                if (contemProprioNome) {
                    transCount++;
                    transSum += t.value;
                    transValuesList.push(formatCurrency(t.value));
                }
            }
        });

        if (transCount > 0) {
            let valoresExibidos = transValuesList.slice(0, 5).join(' | ');
            if (transValuesList.length > 5) {
                valoresExibidos += ' | ...';
            }

            const mensagemAviso = `
                <div class="modal-alert-box" style="text-align: left; background: #fafafa; padding: 16px; border-radius: 12px; border: 1px solid #eaeaea; margin-bottom: 16px;">
                    <p style="margin: 0 0 16px 0; color: #5f6368; font-size: 0.95rem;">Encontramos <strong>${transCount} possíveis transferências</strong> entre contas próprias, nos valores <span style="font-size: 0.85rem; opacity: 0.85;">(${valoresExibidos})</span>.</p>

                    <div style="margin-bottom: 16px;">
                        <p style="margin: 0 0 4px 0; color: #5f6368; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Impacto estimado no saldo</p>
                        <p class="impact-value" style="margin: 0; color: #202124; font-size: 1.6rem; font-weight: 700; letter-spacing: -0.5px;">${formatCurrency(transSum)}</p>
                    </div>

                    <p style="margin: 0; color: #5f6368; font-size: 0.85rem; line-height: 1.5;">Essas movimentações podem ser interpretadas como Receitas ou Despesas e alterar o saldo calculado.</p>
                </div>

                <div class="modal-tip-box" style="text-align: left; background: #e8f0fe; padding: 16px; border-radius: 12px; border: 1px solid #d2e3fc;">
                    <p style="margin: 0 0 8px 0; color: #1a73e8; font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; gap: 6px;"><span style="font-size: 1.1rem;">&#x1f4a1;</span> Recomendação</p>
                    <p style="margin: 0 0 8px 0; color: #1a73e8; font-size: 0.85rem; line-height: 1.4;">Desmarque essas operações agora e registre-as depois em:</p>
                    <div class="modal-path-box" style="background: rgba(255,255,255,0.6); padding: 8px 12px; border-radius: 8px; font-size: 0.85rem; color: #1a73e8; font-weight: 500; font-family: monospace;">
                        Lançamentos &rarr; Novo Lançamento &rarr; Transferência
                    </div>
                </div>
            `;

            const isConfirmed = await askConfirmation(
                'Transferências Detectadas',
                mensagemAviso,
                'Continuar Importação',
                false,
                'warning_amber',
                'hideOfxTransferWarning'
            );

            if (!isConfirmed) return;
        }

        const originalText = ofxImportBtn.innerHTML;
        ofxImportBtn.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">autorenew</span> Importando...';
        ofxImportBtn.disabled = true;

        const batch = db.batch();
        const nowIso = new Date().toISOString();

        const now = new Date();
        const hoje = getTodayISO();

        let totalIncome = 0;
        let totalExpense = 0;

        txsToImport.forEach(t => {
            let pNameForDb = null;
            if (t.partner) {
                const pObj = g.partners.find(p => p.id === t.partner);
                if (pObj) pNameForDb = pObj.name;
            }

            if (t.reconcileWith) {
                const txRef = userRef('transactions').doc(t.reconcileWith);

                const updateData = {
                    isPaid: true,
                    paymentDate: t.date,
                    fitid: t.fitid || null,
                    updatedAt: nowIso,
                    category: t.category || '',
                    partnerId: t.partner || null,
                    partnerName: pNameForDb,
                    paymentMethod: t.paymentType || ''
                };

                let valorFinalDaConciliacao = t.value;

                if (t.updateValueToOfx === true) {
                    updateData.value = t.value;
                } else if (t.updateValueToOfx === false && t.originalPendingValue) {
                    valorFinalDaConciliacao = t.originalPendingValue;
                }

                batch.update(txRef, updateData);

                const idx = g.transactions.findIndex(x => x.id === t.reconcileWith);
                if (idx !== -1) {
                    g.transactions[idx] = { ...g.transactions[idx], ...updateData };
                }

                if (t.type === 'income') totalIncome += valorFinalDaConciliacao;
                else totalExpense += valorFinalDaConciliacao;

            } else {
                const txRef = userRef('transactions').doc();

                const newTx = {
                    type: t.type,
                    value: t.value,
                    description: t.description,
                    category: t.category || '',
                    date: t.date,
                    isPaid: true,
                    paymentDate: t.date,
                    accountId: accountId,
                    accountName: account ? account.name : 'Conta',
                    paymentMethod: t.paymentType || '',
                    partnerId: t.partner || null,
                    partnerName: pNameForDb,
                    fitid: t.fitid || null,
                    createdAt: nowIso,
                    updatedAt: nowIso
                };

                batch.set(txRef, newTx);

                g.transactions.push({ id: txRef.id, ...sanitizeFirestoreData(newTx) });

                if (t.type === 'income') totalIncome += t.value;
                else totalExpense += t.value;
            }
        });

        const netChange = totalIncome - totalExpense;
        if (netChange !== 0) {
            const accRef = userRef('accounts').doc(accountId);
            batch.update(accRef, { balance: firebase.firestore.FieldValue.increment(netChange) });
            if (account) account.balance += netChange;
        }

        try {
            await batch.commit();
            showToast(`${txsToImport.length} lançamentos importados com sucesso!`, 'success');

            renderTransactions();
            renderAccounts();
            renderDashboard();

            closeOfxModal();
        } catch (err) {
            console.error("Erro na importação:", err);
            showToast("Erro de conexão ao importar. Tente novamente.", 'error');
        } finally {
            ofxImportBtn.innerHTML = originalText;
            ofxImportBtn.disabled = false;
        }
    });
}
