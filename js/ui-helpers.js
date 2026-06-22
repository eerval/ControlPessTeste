
function showToast(message, type = 'error') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    let icon = 'info';
    if (type === 'error') icon = 'error_outline';
    if (type === 'success') icon = 'check_circle';
    if (type === 'warning') icon = 'warning';
    const iconSpan = document.createElement('span');
    iconSpan.className = 'material-icons';
    iconSpan.textContent = icon;
    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 4000);
}

function askPaymentDate(originalDate) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmPaymentModal');
        const btnToday = document.getElementById('btnPayToday');
        const btnOriginal = document.getElementById('btnPayOriginal');
        const btnCancel = document.getElementById('btnCancelPayment');
        const hoje = new Date();
        const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
        document.getElementById('payTodayDate').textContent = new Date(hojeStr + 'T12:00:00').toLocaleDateString('pt-BR');
        document.getElementById('payOriginalDate').textContent = new Date(originalDate + 'T12:00:00').toLocaleDateString('pt-BR');
        if (hojeStr === originalDate) { resolve(hojeStr); return; }
        modal.style.display = 'flex';
        const cleanup = () => {
            modal.style.display = 'none';
            btnToday.removeEventListener('click', onToday);
            btnOriginal.removeEventListener('click', onOriginal);
            btnCancel.removeEventListener('click', onCancel);
        };
        const onToday = () => { cleanup(); resolve(hojeStr); };
        const onOriginal = () => { cleanup(); resolve(originalDate); };
        const onCancel = () => { cleanup(); resolve(null); };
        btnToday.addEventListener('click', onToday);
        btnOriginal.addEventListener('click', onOriginal);
        btnCancel.addEventListener('click', onCancel);
    });
}

function askPixKeySelection(acc) {
    return new Promise((resolve) => {
        const keys = [];
        if (acc.pixKeys && acc.pixKeys.length > 0) {
            acc.pixKeys.forEach(pk => keys.push(pk.value));
        } else {
            if (acc.pixKey1) keys.push(acc.pixKey1);
            if (acc.pixKey2) keys.push(acc.pixKey2);
            if (acc.pixKey3) keys.push(acc.pixKey3);
        }
        if (keys.length === 0) { resolve(null); return; }
        if (keys.length === 1) { resolve(keys[0]); return; }
        const modal = document.getElementById('selectPixKeyModal');
        const container = document.getElementById('pixKeyOptionsContainer');
        const btnCancel = document.getElementById('btnCancelPixKeySelect');
        container.innerHTML = '';
        keys.forEach(key => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary';
            btn.style.width = '100%';
            btn.style.padding = '14px 20px';
            btn.style.border = '1px solid #dadce0';
            btn.style.fontWeight = '600';
            btn.textContent = key;
            btn.onclick = () => { cleanup(); resolve(key); };
            container.appendChild(btn);
        });
        modal.style.display = 'flex';
        const cleanup = () => { modal.style.display = 'none'; btnCancel.removeEventListener('click', onCancel); };
        const onCancel = () => { cleanup(); resolve(null); };
        btnCancel.addEventListener('click', onCancel);
    });
}

function askConfirmation(title, message, confirmText = 'Confirmar', isDanger = true, icon = 'warning_amber', prefKey = null) {
    return new Promise((resolve) => {
        if (prefKey && localStorage.getItem(prefKey) === 'true') { resolve(true); return; }
        const modal = document.getElementById('genericConfirmModal');
        const btnAccept = document.getElementById('btnAcceptConfirm');
        const btnCancel = document.getElementById('btnCancelConfirm');
        const btnCloseX = document.getElementById('btnCloseConfirmModal');
        const iconContainer = document.getElementById('confirmIconContainer');
        const iconEl = document.getElementById('confirmIcon');
        const dontShowContainer = document.getElementById('confirmDontShowContainer');
        const dontShowCheckbox = document.getElementById('confirmDontShowCheckbox');
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmTitle').style.marginBottom = '0';
        document.getElementById('confirmMessage').textContent = message;
        btnAccept.textContent = confirmText;
        iconEl.textContent = icon;
        if (prefKey) { dontShowContainer.style.display = 'flex'; dontShowCheckbox.checked = false; }
        else { dontShowContainer.style.display = 'none'; }
        if (isDanger) {
            modal.classList.remove('warning-state');
            btnAccept.className = 'btn btn-danger';
            iconContainer.style.background = '#fce8e8';
            iconEl.style.color = '#d93025';
        } else {
            modal.classList.add('warning-state');
            btnAccept.className = 'btn btn-primary';
            iconContainer.style.background = '#fef0d9';
            iconEl.style.color = '#e67e22';
        }
        modal.style.display = 'flex';
        const cleanup = () => {
            modal.style.display = 'none';
            btnAccept.removeEventListener('click', onAccept);
            btnCancel.removeEventListener('click', onCancel);
            if (btnCloseX) btnCloseX.removeEventListener('click', onCancel);
        };
        const onAccept = () => {
            if (prefKey && dontShowCheckbox.checked) localStorage.setItem(prefKey, 'true');
            cleanup(); resolve(true);
        };
        const onCancel = () => { cleanup(); resolve(false); };
        btnAccept.addEventListener('click', onAccept);
        btnCancel.addEventListener('click', onCancel);
        if (btnCloseX) btnCloseX.addEventListener('click', onCancel);
    });
}

export { showToast, askPaymentDate, askPixKeySelection, askConfirmation };
