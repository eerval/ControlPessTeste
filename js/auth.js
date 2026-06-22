// ========== AUTENTICAÇÃO ==========
import { auth, db } from './firebase-config.js';
import { currentUser, g, loadUserData, userRef, setCurrentUser } from './state.js';
import { LIMITES, getTodayISO, formatDateISO, escapeHtml, formatDate, formatCurrency, escapeJsAttr } from './utils.js';
import { showToast } from './ui-helpers.js';
import { loadSavedTheme, loadSavedUIStates, themeToggle } from './theme.js';
import { renderNotifications } from './notifications.js';
import { verificarERepararFormasPagamento, verificarERepararContasPadrao, updateUserAvatar } from './settings.js';
import { renderTransactions } from './transactions.js';
import { renderDashboard } from './dashboard.js';

// ========== VARIÁVEIS GLOBAIS ==========
let idleTimeout;
let isIdleTimerRunning = false;
const TEMPO_LIMITE_MINUTOS = LIMITES.IDLE_TIMEOUT_MIN;
const IDLE_TIME_LIMIT = TEMPO_LIMITE_MINUTOS * 60 * 1000;

const authOverlay = document.getElementById('authOverlay');
const appLayout = document.getElementById('appLayout');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const logoutLink = document.getElementById('logoutLink');
const authError = document.getElementById('authError');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');

// ========== CONTROLE DE SEGURANÇA (AUTO-LOGOFF) ==========
function resetIdleTimer() {
    if (!currentUser) return;
    if (isIdleTimerRunning) return;
    isIdleTimerRunning = true;
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
        sessionStorage.setItem('logoutReason', 'idle');
        auth.signOut();
    }, IDLE_TIME_LIMIT);
    setTimeout(() => {
        isIdleTimerRunning = false;
    }, 2000);
}

['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, resetIdleTimer, { passive: true });
});

// ========== AUTENTICAÇÃO ==========
function showAuthError(message) {
    authError.textContent = message;
}

function clearAuthError() {
    authError.textContent = '';
}

function traduzirErroFirebase(erro) {
    switch (erro.code) {
        case 'auth/email-already-in-use':
            return '❌ Este e-mail já está cadastrado. Clique em "Já tenho uma conta" para entrar.';
        case 'auth/invalid-email':
            return '⚠️ O formato do e-mail é inválido. Verifique se digitou corretamente.';
        case 'auth/weak-password':
            return '⚠️ A senha é muito fraca. Escolha uma senha mais longa e segura.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
        case 'auth/invalid-login-credentials':
            return '❌ E-mail ou senha incorretos. Verifique os dados digitados.';
        case 'auth/too-many-requests':
            return '⚠️ Acesso temporariamente bloqueado por muitas tentativas. Tente mais tarde.';
        case 'auth/network-request-failed':
            return '⚠️ Sem conexão com a internet. Verifique sua rede e tente novamente.';
        default:
            return '❌ Ocorreu um erro inesperado. Tente novamente mais tarde.';
    }
}

if (document.getElementById('showRegisterBtn')) document.getElementById('showRegisterBtn').addEventListener('click', () => {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    authTitle.textContent = 'Crie sua conta';
    authSubtitle.textContent = 'Comece a organizar sua vida financeira';
    authError.textContent = '';
});

if (document.getElementById('showLoginBtn')) document.getElementById('showLoginBtn').addEventListener('click', () => {
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
    authTitle.textContent = 'Bem-vindo de volta!';
    authSubtitle.textContent = 'Acesse sua gestão financeira';
    document.getElementById('regError').textContent = '';
});

auth.getRedirectResult().then(result => {
    if (result && result.user) {
        // Usuário autenticado via redirect — onAuthStateChanged cuida do resto
    }
}).catch(err => {
    if (authError) {
        if (err.code === 'auth/unauthorized-domain') {
            authError.textContent = '⚠️ Domínio não autorizado no Firebase Console.';
        } else if (err.code !== 'auth/no-auth-event') {
            authError.textContent = 'Erro ao entrar com Google. Tente novamente.';
        }
    }
});

document.getElementById('loginGoogleBtn')?.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    authError.textContent = '';
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => auth.signInWithRedirect(provider))
        .catch(err => {
            console.error('Google login error:', err);
            authError.textContent = 'Erro ao iniciar login com Google. Tente novamente.';
        });
});

loginBtn.addEventListener('click', () => {
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();
    if (!email || !password) {
        authError.textContent = '⚠️ Digite e-mail e senha.';
        return;
    }
    auth.signInWithEmailAndPassword(email, password)
        .catch(error => {
            authError.textContent = traduzirErroFirebase(error);
        });
});

if (document.getElementById('doRegisterBtn')) document.getElementById('doRegisterBtn').addEventListener('click', async () => {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPassword').value.trim();
    const confirmPass = document.getElementById('regConfirmPassword').value.trim();
    const errorEl = document.getElementById('regError');

    if (!name || !email || !pass || !confirmPass) {
        errorEl.textContent = '⚠️ Preencha todos os campos.';
        return;
    }
    if (pass !== confirmPass) {
        errorEl.textContent = '❌ As senhas não são iguais.';
        return;
    }
    if (pass.length < 6) {
        errorEl.textContent = '⚠️ A senha deve ter pelo menos 6 caracteres.';
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
        const user = userCredential.user;

        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            createdAt: new Date().toISOString()
        });

        const defaultPaymentTypes = [
            { description: "Dinheiro", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true },
            { description: "Débito", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true },
            { description: "Crédito", allowsInstallments: true, maxInstallments: 24, isSystem: true, active: true },
            { description: "Pix", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true },
            { description: "Boleto", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true },
            { description: "Transferência", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true }
        ];

        const batch = db.batch();
        let dinheiroId = null;

        defaultPaymentTypes.forEach(pt => {
            const newDocRef = db.collection('users').doc(user.uid).collection('paymentTypes').doc();
            pt.createdAt = new Date().toISOString();
            batch.set(newDocRef, pt);
            if (pt.description === "Dinheiro") dinheiroId = newDocRef.id;
        });

        const defaultAccountRef = db.collection('users').doc(user.uid).collection('accounts').doc();
        batch.set(defaultAccountRef, {
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
        });

        await batch.commit();
    } catch (error) {
        errorEl.textContent = traduzirErroFirebase(error);
    }
});

if (document.getElementById('forgotPasswordBtn')) document.getElementById('forgotPasswordBtn').addEventListener('click', () => {
    const email = loginEmail.value.trim();
    if (!email) {
        authError.textContent = '⚠️ Digite seu e-mail no campo acima para receber o link de recuperação.';
        return;
    }
    auth.sendPasswordResetEmail(email)
        .then(() => {
            showToast('📧 Link enviado! Verifique sua caixa de entrada e spam.', 'success');
            authError.textContent = '';
        })
        .catch(error => {
            authError.textContent = traduzirErroFirebase(error);
        });
});

logoutLink.addEventListener('click', () => {
    auth.signOut();
});

function togglePasswordVisibility(inputId, btnEl) {
    const input = document.getElementById(inputId);
    const icon = btnEl.querySelector('span');
    if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = 'visibility';
    } else {
        input.type = 'password';
        icon.textContent = 'visibility_off';
    }
}

if (document.getElementById('togglePasswordBtn')) document.getElementById('togglePasswordBtn').addEventListener('click', function() {
    togglePasswordVisibility('loginPassword', this);
});

if (document.getElementById('toggleRegPasswordBtn')) document.getElementById('toggleRegPasswordBtn').addEventListener('click', function() {
    togglePasswordVisibility('regPassword', this);
});

if (document.getElementById('toggleResetPasswordBtn')) document.getElementById('toggleResetPasswordBtn').addEventListener('click', function() {
    togglePasswordVisibility('resetPassword', this);
});

auth.onAuthStateChanged(async (user) => {
    if (user) {
        setCurrentUser(user);
        resetIdleTimer();
        authOverlay.style.display = 'none';
        appLayout.style.display = 'flex';
        const savedTheme = localStorage.getItem('controlpess-theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        if (themeToggle) {
            const icon = themeToggle.querySelector('span');
            icon.textContent = document.body.classList.contains('dark-mode') ? 'light_mode' : 'dark_mode';
        }
        logoutLink.style.display = 'inline-block';
        const userDocRef = db.collection('users').doc(user.uid);
        const userDoc = await userDocRef.get();
        if (!userDoc.exists) {
            await userDocRef.set({
                name: user.displayName || user.email.split('@')[0],
                email: user.email,
                photoURL: null,
                createdAt: new Date().toISOString()
            });
        }
        window.currentUserName = userDoc.exists ? userDoc.data().name : (user.displayName || user.email.split('@')[0]);
        await updateUserAvatar();
        await loadUserData();
        await verificarERepararFormasPagamento();
        await verificarERepararContasPadrao();
        renderTransactions();
        renderDashboard();
        showDailyBriefing();
    } else {
        setCurrentUser(null);
        authOverlay.style.display = 'flex';
        appLayout.style.display = 'none';
        logoutLink.style.display = 'none';
        loginEmail.value = '';
        loginPassword.value = '';
        g.transactions = [];
        if (sessionStorage.getItem('logoutReason') === 'idle') {
            showAuthError('⚠️ Sua sessão expirou por inatividade. Entre novamente.');
            sessionStorage.removeItem('logoutReason');
        }
    }
});

function showDailyBriefing() {
    if (sessionStorage.getItem('briefingShown') === 'true') return;

    const nomeUsuario = window.currentUserName ? window.currentUserName.split(' ')[0] : 'Usuário';
    document.getElementById('briefingName').textContent = nomeUsuario;

    const hojeLocal = getTodayISO();

    const daqui7DiasDate = new Date();
    daqui7DiasDate.setDate(daqui7DiasDate.getDate() + 7);
    const daqui7DiasLocal = formatDateISO(daqui7DiasDate);

    const pendentes = g.transactions.filter(t => !t.isPaid && t.type !== 'transfer');

    const vencidos = [];
    const vencemHoje = [];
    const proximos = [];

    pendentes.forEach(t => {
        if (t.date < hojeLocal) vencidos.push(t);
        else if (t.date === hojeLocal) vencemHoje.push(t);
        else if (t.date <= daqui7DiasLocal) proximos.push(t);
    });

    if (vencidos.length === 0 && vencemHoje.length === 0 && proximos.length === 0) {
        sessionStorage.setItem('briefingShown', 'true');
        return;
    }

    vencidos.sort((a, b) => new Date(a.date) - new Date(b.date));
    vencemHoje.sort((a, b) => new Date(a.date) - new Date(b.date));
    proximos.sort((a, b) => new Date(a.date) - new Date(b.date));

    const isDark = document.body.classList.contains('dark-mode');

    let html = '';

    function renderBriefingBlock(lista, titulo, icone, cfg) {
        if (lista.length === 0) return '';

        const bg       = isDark ? cfg.bgDark   : cfg.bg;
        const iconCol  = isDark ? cfg.colDark  : cfg.col;
        const rowHover = isDark ? '#2a2b2e'    : '#f8fafc';
        const border   = isDark ? '#2a2b2e'    : '#f1f3f4';
        const titleCol = isDark ? '#e8e8f0'    : '#1a1b1e';
        const subCol   = isDark ? '#6a7a8a'    : '#64748b';

        let blockHtml = `
            <div style="padding: 16px 20px; border-bottom: 0.5px solid ${border};">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                    <div style="width: 28px; height: 28px; border-radius: 8px; background: ${bg}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <span class="material-icons" style="font-size: 0.95rem; color: ${iconCol};">${icone}</span>
                    </div>
                    <span style="font-size: 12px; font-weight: 600; letter-spacing: 0.04em; color: ${titleCol};">${titulo}</span>
                    <span style="margin-left: auto; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; background: ${bg}; color: ${iconCol};">${lista.length}</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
        `;

        lista.forEach(t => {
            const isIncome  = t.type === 'income';
            const typeLabel = isIncome ? 'A Receber' : 'A Pagar';
            const valColor  = isIncome
                ? (isDark ? '#5DCAA5' : '#0F6E56')
                : (isDark ? '#ff8a80' : '#A32D2D');
            const valPrefix = isIncome ? '+' : '-';

            blockHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 9px 10px; border-radius: 8px; cursor: pointer; transition: background 0.15s;"
                     onmouseover="this.style.background='${rowHover}'"
                     onmouseout="this.style.background='transparent'"
                     onclick="document.getElementById('briefingModal').style.display='none'; setActiveView('transactions'); setTimeout(()=>openEditTransactionModal('${escapeJsAttr(t.id)}'), 300)">
                    <div style="overflow: hidden; padding-right: 12px; flex: 1;">
                        <div style="color: ${titleCol}; font-weight: 500; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.description || 'Sem descrição'}</div>
                        <div style="color: ${subCol}; font-size: 11px; margin-top: 1px;">${typeLabel} · ${formatDate(t.date)}</div>
                    </div>
                    <div style="font-weight: 600; color: ${valColor}; white-space: nowrap; font-size: 13px;">
                        ${valPrefix}${formatCurrency(t.value)}
                    </div>
                </div>
            `;
        });

        blockHtml += `</div></div>`;
        return blockHtml;
    }

    html += renderBriefingBlock(vencidos,   'Vencidos',        'error_outline', { bg:'#FCEBEB', col:'#A32D2D', bgDark:'rgba(226,75,74,0.12)',   colDark:'#ff8a80' });
    html += renderBriefingBlock(vencemHoje, 'Vencem hoje',     'schedule',      { bg:'#FAEEDA', col:'#854F0B', bgDark:'rgba(186,117,23,0.12)',  colDark:'#FAC775' });
    html += renderBriefingBlock(proximos,   'Próximos 7 dias', 'event',         { bg:'#E6F1FB', col:'#185FA5', bgDark:'rgba(24,95,165,0.12)',   colDark:'#8ab4f8' });

    document.getElementById('briefingContent').innerHTML = html;
    document.getElementById('briefingModal').style.display = 'flex';
    sessionStorage.setItem('briefingShown', 'true');
}

if (document.getElementById('closeBriefingBtn')) document.getElementById('closeBriefingBtn').addEventListener('click', () => { const bm = document.getElementById('briefingModal'); if (bm) bm.style.display = 'none'; });
if (document.getElementById('btnAcknowledgeBriefing')) document.getElementById('btnAcknowledgeBriefing').addEventListener('click', () => { const bm = document.getElementById('briefingModal'); if (bm) bm.style.display = 'none'; });

export { resetIdleTimer, showAuthError, clearAuthError, traduzirErroFirebase, togglePasswordVisibility, showDailyBriefing, idleTimeout, isIdleTimerRunning, TEMPO_LIMITE_MINUTOS, IDLE_TIME_LIMIT, authOverlay, appLayout, loginEmail, loginPassword, loginBtn, logoutLink, authError, loginForm, registerForm, authTitle, authSubtitle };
