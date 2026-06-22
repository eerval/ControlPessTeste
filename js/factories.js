import { escapeHtml, escapeJsAttr, formatCurrency } from './utils.js';

function criarHtmlNotificacaoVazia() {
    return `
        <div class="notif-empty-state">
            <div class="notif-empty-icon">
                <span class="material-icons">done_all</span>
            </div>
            <h4 class="notif-empty-title">Tudo limpo!</h4>
            <p class="notif-empty-subtitle">Você não tem nenhuma pendência.</p>
        </div>
    `;
}

function criarHtmlItemNotificacao(id, titulo, textoStatus, icone, classeCorCaixa, corTexto) {
    return `
        <div class="notification-item" onclick="openEditTransactionModal('${escapeJsAttr(id)}')">
            <div class="notif-icon-box ${classeCorCaixa}">
                <span class="material-icons" style="font-size: 1.4rem;">${icone}</span>
            </div>
            <div class="notif-text">
                <div style="font-weight: 600; margin-bottom: 2px;">${escapeHtml(titulo)}</div>
                <div style="font-size: 0.8rem; color: ${corTexto}; font-weight: 500;">${escapeHtml(textoStatus)}</div>
            </div>
        </div>
    `;
}

function criarHtmlItemDashboard(id, titulo, dataFormatada, icone, classeIcone, classeValor, sinal, valorFormatado, textoBotao) {
    return `
        <div class="list-item" onclick="setActiveView('transactions'); setTimeout(()=>openEditTransactionModal('${escapeJsAttr(id)}'), 300)" style="cursor:pointer;">
            <div class="item-info">
                <div class="item-icon ${classeIcone}">
                    <span class="material-icons-outlined">${icone}</span>
                </div>
                <div class="item-info-text">
                    <p class="item-title">${escapeHtml(titulo)}</p>
                    <p class="item-sub">${escapeHtml(dataFormatada)}</p>
                </div>
            </div>
            <div class="item-right">
                <span class="item-val ${classeValor} privacy-text-value">${sinal}${valorFormatado}</span>
                <button class="item-quick-btn" onclick="event.stopPropagation();openEditTransactionModal('${escapeJsAttr(id)}')">${escapeHtml(textoBotao)}</button>
            </div>
        </div>
    `;
}

function criarHtmlCartaoConta(id, logoHtml, classeStatus, textoStatus, nomeConta, subtituloConta, classeSaldo, saldoFormatado, htmlIconesExtras) {
    return `
        <div class="account-card" data-id="${escapeHtml(id)}">
            <div class="account-card-header">
                <div class="account-card-logo">${logoHtml}</div>
                <span class="account-card-status ${classeStatus}">${escapeHtml(textoStatus)}</span>
            </div>
            <div>
                <div class="account-card-title">${escapeHtml(nomeConta)}</div>
                <div class="account-card-type">${escapeHtml(subtituloConta)}</div>
            </div>
            <div class="account-card-balance ${classeSaldo}">
                ${saldoFormatado}
            </div>
            <div style="display: flex; gap: 8px; margin-top: 8px;">
                ${htmlIconesExtras}
            </div>
        </div>
    `;
}

function criarHtmlItemTransacao(id, typeClass, icon, tituloPrincipal, subDescricao, amountClass, amountSign, valorFormatado, badgeHtml, htmlBotoesAcao) {
    let bgIcon = typeClass === 'income' ? '#ecfdf5' : (typeClass === 'expense' ? '#fff1f2' : '#eef2ff');
    let corIcone = typeClass === 'income' ? '#059669' : (typeClass === 'expense' ? '#e11d48' : '#4f46e5');
    let iconeFigma = icon;
    if (typeClass === 'income') iconeFigma = 'arrow_downward';
    if (typeClass === 'expense') iconeFigma = 'arrow_upward';
    if (typeClass === 'transfer') iconeFigma = 'sync_alt';
    return `
        <div class="transaction-item ${typeClass}" data-id="${escapeHtml(id)}">
            <div class="transaction-info">
                <div class="tx-icon-circle" style="background: ${bgIcon}; color: ${corIcone};">
                    <span class="material-icons-outlined">${iconeFigma}</span>
                </div>
                <div class="transaction-details">
                    <h3>${escapeHtml(tituloPrincipal)}</h3>
                    <div class="transaction-meta">
                        <span>${escapeHtml(subDescricao)}</span>
                        ${badgeHtml}
                    </div>
                </div>
            </div>
            <div class="tx-right-col">
                <div class="transaction-amount ${amountClass}">
                    ${amountSign}${valorFormatado}
                </div>
                <div class="transaction-actions">
                    ${htmlBotoesAcao}
                </div>
            </div>
        </div>
    `;
}

function criarHtmlLinhaTabelaPDF(dataStr, descricao, categoriaOuParceiro, tipoLabel, statusHtml, corTexto, sinal, valorFormatado) {
    return `
        <tr style="border-bottom: 1px solid #e8eaed; page-break-inside: avoid;">
            <td style="padding: 10px 8px; color: #5f6368; width: 12%;">${escapeHtml(dataStr)}</td>
            <td style="padding: 10px 8px; color: #202124; width: 40%;"><strong>${escapeHtml(descricao)}</strong><br><span style="font-size: 0.85em; color: #9aa0a6;">${escapeHtml(categoriaOuParceiro)}</span></td>
            <td style="padding: 10px 8px; color: #5f6368; width: 15%;">${escapeHtml(tipoLabel)}</td>
            <td style="padding: 10px 8px; color: #5f6368; width: 15%;">${statusHtml}</td>
            <td style="padding: 10px 8px; text-align: right; color: ${corTexto}; font-weight: bold; width: 18%; white-space: nowrap;">${sinal}${valorFormatado}</td>
        </tr>
    `;
}

function criarHtmlTabelaMesPDF(tituloMes, linhasHtml) {
    return `
        <div style="margin-top: 24px; margin-bottom: 12px; font-size: 1.2rem; font-weight: bold; color: #1a73e8; border-bottom: 2px solid #e8eaed; padding-bottom: 8px; page-break-after: avoid;">
            ${tituloMes}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem; margin-bottom: 16px;">
            <thead>
                <tr style="background: #f1f3f4; text-align: left;">
                    <th style="padding: 10px 8px; color: #5f6368; font-weight: 600; border-radius: 8px 0 0 8px;">Data</th>
                    <th style="padding: 10px 8px; color: #5f6368; font-weight: 600;">Descrição</th>
                    <th style="padding: 10px 8px; color: #5f6368; font-weight: 600;">Tipo</th>
                    <th style="padding: 10px 8px; color: #5f6368; font-weight: 600;">Status</th>
                    <th style="padding: 10px 8px; color: #5f6368; font-weight: 600; text-align: right; border-radius: 0 8px 8px 0;">Valor</th>
                </tr>
            </thead>
            <tbody>
                ${linhasHtml}
            </tbody>
        </table>
    `;
}

function criarHtmlItemCadastro(id, isInactive, avatarHtml, titulo, subtituloHtml, classeBtnEdit, classeBtnDelete) {
    const inactiveClass = isInactive ? 'inactive' : '';
    return `
        <div class="item-row ${inactiveClass}" data-id="${escapeHtml(id)}">
            <div style="flex:1; display: flex; align-items: center; gap: 12px;">
                ${avatarHtml}
                <div>
                    <strong>${escapeHtml(titulo)}</strong><br>
                    <small style="color:#5f6368">${escapeHtml(subtituloHtml)}</small>
                </div>
            </div>
            <div class="item-actions">
                <button class="${classeBtnEdit}" title="Editar"><span class="material-icons">edit</span></button>
                <button class="${classeBtnDelete}" title="Excluir"><span class="material-icons">delete</span></button>
            </div>
        </div>
    `;
}

export {
    criarHtmlNotificacaoVazia, criarHtmlItemNotificacao,
    criarHtmlItemDashboard, criarHtmlCartaoConta,
    criarHtmlItemTransacao,
    criarHtmlLinhaTabelaPDF, criarHtmlTabelaMesPDF,
    criarHtmlItemCadastro
};
