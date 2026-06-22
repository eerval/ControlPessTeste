// ========== CONFIGURAÇÃO DO FIREBASE ==========
        const firebaseConfig = {
            apiKey: "AIzaSyDmr1Cbguvfgryr2T7-Ck8G85okd9PJ-Fg",
            authDomain: "controlpess-d5c11.firebaseapp.com",
            projectId: "controlpess-d5c11",
            storageBucket: "controlpess-d5c11.firebasestorage.app",
            messagingSenderId: "294067954965",
            appId: "1:294067954965:web:1900f32e03db87c128351c"
        };

        // Inicializa Firebase
        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.firestore();
		
		// NOVO: Segurança - Desloga o usuário se ele fechar a aba ou navegador
        auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
		
		// ========== SISTEMA DE NOTIFICAÇÕES GLOBAIS (TOAST) ==========
        function showToast(message, type = 'error') {
            let container = document.getElementById('toastContainer');
            // Cria o contêiner se ele ainda não existir na tela
            if (!container) {
                container = document.createElement('div');
                container.id = 'toastContainer';
                container.className = 'toast-container';
                document.body.appendChild(container);
            }

            const toast = document.createElement('div');
            toast.className = `custom-toast ${type}`;
            
            // Escolhe o ícone de acordo com o tipo
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

            // Destrói o elemento HTML após a animação de saída terminar (4 segundos no total)
            setTimeout(() => { toast.remove(); }, 4000);
        }

        // ========== SEGURANÇA: Sanitização contra XSS ==========
        function escapeHtml(str) {
            if (typeof str !== 'string') return str;
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        function escapeJsAttr(str) {
            if (str == null) return '';
            return JSON.stringify(String(str)).slice(1, -1);
        }

        function sanitizeFirestoreData(data) {
            if (!data || typeof data !== 'object') return data;
            const blocked = ['__proto__', 'constructor', 'prototype'];
            return Object.fromEntries(
                Object.entries(data).filter(([key]) => !blocked.includes(key))
            );
        }

        // ========== HELPERS ==========
        function formatDateISO(date) {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }

        function getTodayISO() {
            return formatDateISO(new Date());
        }

        // ========== CONSTANTES ==========
        const CORES = {
            verde: '#188038',
            vermelho: '#d93025',
            azul: '#1a73e8',
            laranja: '#e67e22',
            cinza: '#5f6368',
            borda: '#e8eaed',
            verdeDark: '#81c995',
            vermelhoDark: '#ff8a80',
        };

        const LIMITES = {
            MIN_SENHA: 6,
            MAX_PARCELAS: 24,
            MESES_DASHBOARD: 6,
            MAX_ITENS_PDF: 400,
            MAX_RECENTES_DASHBOARD: 3,
            MAX_NAO_PAGOS_DASHBOARD: 3,
            IDLE_TIMEOUT_MIN: 30,
            MAX_AVATAR_BYTES: 1024 * 1024,
            MIN_BUSCA_CHARS: 2,
        };

        function calcDueDate(transDateStr, closingDay, dueDay) {
            const cDay = parseInt(closingDay) || 1;
            const dDay = parseInt(dueDay) || 10;
            const tDate = new Date(transDateStr + 'T12:00:00');
            let m = tDate.getMonth(), y = tDate.getFullYear(), d = tDate.getDate();
            if (d >= cDay) { m++; if (m > 11) { m = 0; y++; } }
            if (dDay < cDay) { m++; if (m > 11) { m = 0; y++; } }
            return `${y}-${String(m + 1).padStart(2, '0')}-${String(dDay).padStart(2, '0')}`;
        }

        function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        function trendBadge(curr, prev, invertColors = false) {
            if (prev === 0) return '<span class="kpi-badge neutral" title="Sem dados no mês anterior">—</span>';
            const pct = Math.round(((curr - prev) / Math.abs(prev)) * 100);
            const up = pct >= 0;
            const badgeClass = invertColors ? (up ? 'down' : 'up') : (up ? 'up' : 'down');
            const icon = up ? 'arrow_upward' : 'arrow_downward';
            return `<span class="kpi-badge ${badgeClass}" style="cursor: help;" title="Variação em relação ao mês passado"><span class="material-icons-outlined" style="font-size:12px;margin-right:4px;">${icon}</span>${Math.abs(pct)}%</span>`;
        }

        function userRef(collectionName) {
            return db.collection('users').doc(currentUser.uid).collection(collectionName);
        }

        // ========== VARIÁVEIS GLOBAIS ==========
        let transactions = [];
        let currentUser = null;
        let currentPeriod = 'month'; // Mudou o padrão para o mês atual
        let currentType = 'all';
        let currentStatus = 'all';   // Nova variável de controle do status
        let currentView = 'dashboard';
        let privacyActive = localStorage.getItem('controlpess-privacy') === 'true'; // Lê a memória do navegador
		let partners = [];
		let accounts = [];
		let categories = [];
		let costCenters = [];
		let paymentTypes = [];
		let editingPartnerId = null;
		let editingTransactionId = null;
		
		// ========== CONTROLE DE SEGURANÇA (AUTO-LOGOFF) ==========
        let idleTimeout;
        let isIdleTimerRunning = false; // Trava de segurança para performance
        const TEMPO_LIMITE_MINUTOS = LIMITES.IDLE_TIMEOUT_MIN;
        const IDLE_TIME_LIMIT = TEMPO_LIMITE_MINUTOS * 60 * 1000; 

        function resetIdleTimer() {
            if (!currentUser) return; // Só vigia se tiver alguém logado
            
            // Se já processou o movimento nos últimos 2 segundos, ignora para não fritar a CPU
            if (isIdleTimerRunning) return; 
            isIdleTimerRunning = true;
            
            clearTimeout(idleTimeout); // Zera o cronômetro antigo
            
            // Inicia um novo cronômetro
            idleTimeout = setTimeout(() => {
                // O tempo esgotou! 
                sessionStorage.setItem('logoutReason', 'idle'); // Deixa um "bilhete" na memória
                auth.signOut(); // Desloga o usuário
            }, IDLE_TIME_LIMIT);
            
            // Libera o detetor de movimento novamente após 2 segundos
            setTimeout(() => {
                isIdleTimerRunning = false;
            }, 2000);
        }

        // Fica de olho nos movimentos do usuário para zerar o cronômetro (modo passivo para não travar a tela)
        ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetIdleTimer, { passive: true });
        });

        // ========== AUTENTICAÇÃO ==========
        const authOverlay = document.getElementById('authOverlay');
        const appLayout = document.getElementById('appLayout');
        const loginEmail = document.getElementById('loginEmail');
        const loginPassword = document.getElementById('loginPassword');
        const loginBtn = document.getElementById('loginBtn');

        const logoutLink = document.getElementById('logoutLink');
        const authError = document.getElementById('authError');

        function showAuthError(message) {
            authError.textContent = message;
        }

        function clearAuthError() {
            authError.textContent = '';
        }

        // =========================================================
        // NOVA LOGICA DE TELAS (LOGIN vs CADASTRO)
        // =========================================================

        // Referências dos novos elementos que criamos no HTML
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const authTitle = document.getElementById('authTitle');
        const authSubtitle = document.getElementById('authSubtitle');
		
		// FUNÇÃO: Traduzir erros do Firebase para o usuário de forma amigável
        function traduzirErroFirebase(erro) {
            switch (erro.code) {
                // Erros de Cadastro
                case 'auth/email-already-in-use':
                    return '❌ Este e-mail já está cadastrado. Clique em "Já tenho uma conta" para entrar.';
                case 'auth/invalid-email':
                    return '⚠️ O formato do e-mail é inválido. Verifique se digitou corretamente.';
                case 'auth/weak-password':
                    return '⚠️ A senha é muito fraca. Escolha uma senha mais longa e segura.';
                
                // Erros de Login
                // Erros de Login
				case 'auth/user-not-found':
				case 'auth/wrong-password':
				case 'auth/invalid-credential':
				case 'auth/invalid-login-credentials': // Código de segurança novo do Firebase
                return '❌ E-mail ou senha incorretos. Verifique os dados digitados.';
                case 'auth/too-many-requests':
                    return '⚠️ Acesso temporariamente bloqueado por muitas tentativas. Tente mais tarde.';
                case 'auth/network-request-failed':
                    return '⚠️ Sem conexão com a internet. Verifique sua rede e tente novamente.';
                
                // Erro genérico para coisas raras
                default:
                    return '❌ Ocorreu um erro inesperado. Tente novamente mais tarde.';
            }
        }

        // FUNÇÃO: Trocar para tela de Cadastro
        document.getElementById('showRegisterBtn').addEventListener('click', () => {
            loginForm.style.display = 'none';    // Esconde login
            registerForm.style.display = 'block'; // Mostra cadastro
            authTitle.textContent = 'Crie sua conta';
            authSubtitle.textContent = 'Comece a organizar sua vida financeira';
            document.getElementById('authError').textContent = '';
        });

        // FUNÇÃO: Voltar para tela de Login
        document.getElementById('showLoginBtn').addEventListener('click', () => {
            registerForm.style.display = 'none'; // Esconde cadastro
            loginForm.style.display = 'block';   // Mostra login
            authTitle.textContent = 'Bem-vindo de volta!';
            authSubtitle.textContent = 'Acesse sua gestão financeira';
            document.getElementById('regError').textContent = '';
        });
		
		// FUNÇÃO: Login com Google
        // Ao carregar a página, verifica se voltou de um redirect do Google
        auth.getRedirectResult().then(result => {
            if (result && result.user) {
                // Usuário autenticado via redirect — onAuthStateChanged cuida do resto
            }
        }).catch(err => {
            const errorEl = document.getElementById('authError');
            if (errorEl) {
                if (err.code === 'auth/unauthorized-domain') {
                    errorEl.textContent = '⚠️ Domínio não autorizado no Firebase Console.';
                } else if (err.code !== 'auth/no-auth-event') {
                    errorEl.textContent = 'Erro ao entrar com Google. Tente novamente.';
                }
            }
        });

        document.getElementById('loginGoogleBtn')?.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            const errorEl = document.getElementById('authError');
            errorEl.textContent = '';

            auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                .then(() => auth.signInWithRedirect(provider))
                .catch(err => {
                    console.error('Google login error:', err);
                    errorEl.textContent = 'Erro ao iniciar login com Google. Tente novamente.';
                });
        });

        // FUNÇÃO: Executar o Login Real
        document.getElementById('loginBtn').addEventListener('click', () => {
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value.trim();
            
            if (!email || !password) {
                document.getElementById('authError').textContent = '⚠️ Digite e-mail e senha.';
                return;
            }
            
            // Comando que fala com o Firebase
            auth.signInWithEmailAndPassword(email, password)
                .catch(error => {
                    // AQUÍ ACONTECE A MÁGICA DA TRADUÇÃO:
                    document.getElementById('authError').textContent = traduzirErroFirebase(error);
                });
        });

        // FUNÇÃO: Executar o Cadastro Real
        document.getElementById('doRegisterBtn').addEventListener('click', async () => {
            const name = document.getElementById('regName').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const pass = document.getElementById('regPassword').value.trim();
            const confirmPass = document.getElementById('regConfirmPassword').value.trim();
            const errorEl = document.getElementById('regError');

            // Validações de segurança antes de enviar ao Firebase
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
                // 1. Cria o usuário no sistema de login
                const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
                const user = userCredential.user;

                // 2. Salva o Nome do usuário no Banco de Dados (Firestore)
                await db.collection('users').doc(user.uid).set({
                    name: name,
                    email: email,
                    createdAt: new Date().toISOString()
                });

                // 3. INJEÇÃO DOS PADRÕES DE FÁBRICA (Formas de Pagamento)
                const defaultPaymentTypes = [
                    { description: "Dinheiro", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true },
                    { description: "Débito", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true },
                    { description: "Crédito", allowsInstallments: true, maxInstallments: 24, isSystem: true, active: true },
                    { description: "Pix", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true },
                    { description: "Boleto", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true },
                    { description: "Transferência", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true }
                ];

                const batch = db.batch();
                let dinheiroId = null; // Guardará o ID mágico do Dinheiro

                defaultPaymentTypes.forEach(pt => {
                    const newDocRef = db.collection('users').doc(user.uid).collection('paymentTypes').doc();
                    pt.createdAt = new Date().toISOString();
                    batch.set(newDocRef, pt);
                    
                    // Se for o Dinheiro, guarda o ID gerado pelo Firebase!
                    if (pt.description === "Dinheiro") dinheiroId = newDocRef.id;
                });

                // Criação da Conta "Carteira" Padrão do Sistema
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
                    acceptedPaymentTypes: dinheiroId ? [dinheiroId] : [], // <--- Vínculo Mágico!
                    createdAt: new Date().toISOString()
                });

                await batch.commit();

                // Sucesso! O Firebase loga o usuário automaticamente aqui.
            } catch (error) {
                // Substitui a mensagem gringa em inglês pela instrução clara e em português
                errorEl.textContent = traduzirErroFirebase(error);
            }
        });
		
		// FUNÇÃO: Recuperação de Senha
        document.getElementById('forgotPasswordBtn').addEventListener('click', () => {
            const email = document.getElementById('loginEmail').value.trim();
            
            // 1. Verifica se o e-mail foi digitado
            if (!email) {
                document.getElementById('authError').textContent = '⚠️ Digite seu e-mail no campo acima para receber o link de recuperação.';
                return;
            }

            // 2. Comando do Firebase para enviar o e-mail
            auth.sendPasswordResetEmail(email)
                .then(() => {
                    // Mostra um aviso de sucesso usando o seu sistema de Toast
                    showToast('📧 Link enviado! Verifique sua caixa de entrada e spam.', 'success');
                    document.getElementById('authError').textContent = ''; 
                })
                .catch(error => {
                    // Usa o tradutor de erros que já criamos
                    document.getElementById('authError').textContent = traduzirErroFirebase(error);
                });
        });

        logoutLink.addEventListener('click', () => {
            auth.signOut();
        });

        // Alterna visibilidade de senha (reutilizável, migrado de onclick inline)
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
        document.getElementById('togglePasswordBtn').addEventListener('click', function() {
            togglePasswordVisibility('loginPassword', this);
        });
        document.getElementById('toggleRegPasswordBtn').addEventListener('click', function() {
            togglePasswordVisibility('regPassword', this);
        });
        document.getElementById('toggleResetPasswordBtn').addEventListener('click', function() {
            togglePasswordVisibility('resetPassword', this);
        });
        // Impede que clique no toggle-switch propague (migrado de onclick inline)
        document.getElementById('toggleOfxWarningSwitch').addEventListener('click', function(e) {
            e.stopPropagation();
        });
        // Link de perfil no aviso OFX (migrado de onclick inline)
        document.getElementById('profileLinkFromOfxWarning').addEventListener('click', function(e) {
            e.preventDefault();
            setActiveView('settings');
            document.querySelector('#settingsView .settings-grid').style.display = 'none';
            document.getElementById('profileView').style.display = 'block';
            loadProfile();
            setTimeout(() => document.getElementById('profileName').focus(), 400);
        });
        // Botão de ampliar QR Code (migrado de onclick inline)
        document.getElementById('miniQrCardExpandBtn').addEventListener('click', function() {
            document.getElementById('miniQrCard').click();
        });
        // Fecha modal PIX ao clicar fora do card (migrado de onclick inline)
        document.getElementById('pixQrModal').addEventListener('click', function(e) {
            if (e.target === this) this.style.display = 'none';
        });
        // Fecha modal PIX ao clicar no X (migrado de onclick inline)
        document.getElementById('pixQrModalCloseBtn').addEventListener('click', function() {
            document.getElementById('pixQrModal').style.display = 'none';
        });

        auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
				resetIdleTimer(); // Inicia o cronômetro de ociosidade assim que loga
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
				// Criar/verificar documento do usuário no Firestore
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
                
                // --- SOLUÇÃO PONTO 1: CACHE GLOBAL DO NOME DO USUÁRIO ---
                window.currentUserName = userDoc.exists ? userDoc.data().name : (user.displayName || user.email.split('@')[0]);

                await updateUserAvatar();
                await loadUserData();
                
                // GATILHO CRÍTICO: Repara contas antigas antes de renderizar a interface
                await verificarERepararFormasPagamento();
				await verificarERepararContasPadrao();
                
                renderTransactions(); // 1º Renderiza a lista do extrato
                renderDashboard();    // 2º Preenche os saldos nos cards superiores
                showDailyBriefing();  // 3º Dispara o resumo inteligente
            } else {
                currentUser = null;
                authOverlay.style.display = 'flex';
                appLayout.style.display = 'none';
                logoutLink.style.display = 'none';
                loginEmail.value = '';
                loginPassword.value = '';
                transactions = [];
				// NOVO: Verifica se o motivo do logout foi inatividade
                if (sessionStorage.getItem('logoutReason') === 'idle') {
                    showAuthError('⚠️ Sua sessão expirou por inatividade. Entre novamente.');
                    sessionStorage.removeItem('logoutReason'); // Apaga o bilhete
                }
            }
        });

        // ========== CARREGAR DADOS DO FIRESTORE ==========
        async function loadUserData() {
            if (!currentUser) return;

            const dataLimite = new Date();
            dataLimite.setMonth(dataLimite.getMonth() - 6);
            const dataLimiteStr = `${dataLimite.getFullYear()}-${String(dataLimite.getMonth() + 1).padStart(2, '0')}-01`;
            
            try {
                const [
                    txSnapshot,
                    partnersSnapshot,
                    accountsSnapshot,
                    categoriesSnapshot,
                    costCentersSnapshot,
                    paymentTypesSnapshot
                ] = await Promise.all([
                    userRef('transactions').where('date', '>=', dataLimiteStr).get(),
                    userRef('partners').get(),
                    userRef('accounts').get(),
                    userRef('categories').get(),
                    userRef('costCenters').get(),
                    userRef('paymentTypes').get()
                ]);

                transactions = txSnapshot.docs.map(doc => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
                transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

                partners = partnersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                accounts = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                costCenters = costCentersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                paymentTypes = paymentTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
                transactions.push({ id: docRef.id, ...data });
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
                transactions = transactions.filter(t => t.id !== id);
                return true;
            } catch (error) {
                console.error('Erro ao excluir transação:', error);
                showToast('Erro ao excluir transação. Tente novamente.', 'error');
                return false;
            }
        }

        // ========== FUNÇÕES AUXILIARES ==========
        function formatCurrency(value) {
            return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        function formatDate(dateStr) {
            const date = new Date(dateStr + 'T12:00:00');
            return date.toLocaleDateString('pt-BR');
        }

        // --- CÉREBRO DA CONFIRMAÇÃO DE DATA DE PAGAMENTO ---
        function askPaymentDate(originalDate) {
            return new Promise((resolve) => {
                const modal = document.getElementById('confirmPaymentModal');
                const btnToday = document.getElementById('btnPayToday');
                const btnOriginal = document.getElementById('btnPayOriginal');
                const btnCancel = document.getElementById('btnCancelPayment');
                
                // CORREÇÃO DO FUSO HORÁRIO: Pega a data local exata do dispositivo
                const now = new Date();
                const hoje = getTodayISO();
                
                document.getElementById('payTodayDate').textContent = formatDate(hoje);
                document.getElementById('payOriginalDate').textContent = formatDate(originalDate);

                // Se a data agendada for hoje, não precisa perguntar! Aceita direto.
                if (hoje === originalDate) {
                    resolve(hoje);
                    return;
                }

                modal.style.display = 'flex';

                const cleanup = () => {
                    modal.style.display = 'none';
                    btnToday.removeEventListener('click', onToday);
                    btnOriginal.removeEventListener('click', onOriginal);
                    btnCancel.removeEventListener('click', onCancel);
                };

                const onToday = () => { cleanup(); resolve(hoje); };
                const onOriginal = () => { cleanup(); resolve(originalDate); };
                const onCancel = () => { cleanup(); resolve(null); }; // null significa que desistiu

                btnToday.addEventListener('click', onToday);
                btnOriginal.addEventListener('click', onOriginal);
                btnCancel.addEventListener('click', onCancel);
            });
        }
		
		// --- CÉREBRO DA SELEÇÃO DE CHAVES PIX PARA COBRANÇA ---
        function askPixKeySelection(acc) {
            return new Promise((resolve) => {
                const keys = [];
                // Compatibilidade Inteligente: Puxa da lista nova, se não achar tenta da versão antiga
                if (acc.pixKeys && acc.pixKeys.length > 0) {
                    acc.pixKeys.forEach(pk => keys.push(pk.value));
                } else {
                    if (acc.pixKey1) keys.push(acc.pixKey1);
                    if (acc.pixKey2) keys.push(acc.pixKey2);
                    if (acc.pixKey3) keys.push(acc.pixKey3);
                }

                if (keys.length === 0) {
                    resolve(null); 
                    return;
                }
                
                // Se tiver apenas uma chave, vai direto sem incomodar o usuário
                if (keys.length === 1) {
                    resolve(keys[0]); 
                    return;
                }

                // Se tiver mais de uma, abre o modal
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
                    btn.onclick = () => {
                        cleanup();
                        resolve(key);
                    };
                    container.appendChild(btn);
                });

                modal.style.display = 'flex';

                const cleanup = () => {
                    modal.style.display = 'none';
                    btnCancel.removeEventListener('click', onCancel);
                };

                const onCancel = () => {
                    cleanup();
                    resolve(null);
                };

                btnCancel.addEventListener('click', onCancel);
            });
        }

        // --- CÉREBRO DA CONFIRMAÇÃO GENÉRICA (EXCLUSÃO E ESTORNO E AVISOS) ---
        function askConfirmation(title, message, confirmText = 'Confirmar', isDanger = true, icon = 'warning_amber', prefKey = null) {
            return new Promise((resolve) => {
                // MÁGICA: Se o usuário já marcou para não ver, aprova o alerta de forma silenciosa e instantânea!
                if (prefKey && localStorage.getItem(prefKey) === 'true') {
                    resolve(true);
                    return;
                }

                const modal = document.getElementById('genericConfirmModal');
                const btnAccept = document.getElementById('btnAcceptConfirm');
                const btnCancel = document.getElementById('btnCancelConfirm');
                const btnCloseX = document.getElementById('btnCloseConfirmModal');
                const iconContainer = document.getElementById('confirmIconContainer');
                const iconEl = document.getElementById('confirmIcon');
                const dontShowContainer = document.getElementById('confirmDontShowContainer');
                const dontShowCheckbox = document.getElementById('confirmDontShowCheckbox');
                
                document.getElementById('confirmTitle').textContent = title;
                document.getElementById('confirmTitle').style.marginBottom = '0'; // Reseta a margem para o flexbox alinhar o ícone
                document.getElementById('confirmMessage').textContent = message;
                btnAccept.textContent = confirmText;
                iconEl.textContent = icon;

                // Controle da caixinha "Não mostrar novamente"
                if (prefKey) {
                    dontShowContainer.style.display = 'flex';
                    dontShowCheckbox.checked = false; // Reseta sempre que abre
                } else {
                    dontShowContainer.style.display = 'none';
                }

                // Estiliza de acordo com o perigo da ação
                if (isDanger) {
                    modal.classList.remove('warning-state');
                    btnAccept.className = 'btn btn-danger';
                    iconContainer.style.background = '#fce8e8';
                    iconEl.style.color = '#d93025';
                } else {
                    modal.classList.add('warning-state'); // Identificador para o Modo Escuro
                    btnAccept.className = 'btn btn-primary'; // Botão Azul Preenchido Oficial!
                    iconContainer.style.background = '#fef0d9';
                    iconEl.style.color = '#e67e22';
                }

                modal.style.display = 'flex';

                const cleanup = () => {
                    modal.style.display = 'none';
                    btnAccept.style.background = '';
                    btnAccept.style.color = '';
                    btnAccept.removeEventListener('click', onAccept);
                    btnCancel.removeEventListener('click', onCancel);
                    if (btnCloseX) btnCloseX.removeEventListener('click', onCancel);
                };

                const onAccept = () => { 
                    // Se a caixinha foi marcada, grava a decisão no navegador do usuário
                    if (prefKey && dontShowCheckbox.checked) {
                        localStorage.setItem(prefKey, 'true');
                    }
                    cleanup(); 
                    resolve(true); 
                };
                const onCancel = () => { cleanup(); resolve(false); };

                btnAccept.addEventListener('click', onAccept);
                btnCancel.addEventListener('click', onCancel);
                if (btnCloseX) btnCloseX.addEventListener('click', onCancel);
            });
        }

        function getCurrentMonth() {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }

        function getPreviousMonth() {
            const now = new Date();
            if (now.getMonth() === 0) {
                return `${now.getFullYear() - 1}-12`;
            } else {
                return `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
            }
        }

        function filterTransactionsByMonth(monthStr) {
            return transactions.filter(t => t.date.startsWith(monthStr));
        }

        function calculateTotals(txns) {
            let income = 0, expense = 0, transfer = 0;
            txns.forEach(t => {
                if (t.type === 'income') income += t.value;
                else if (t.type === 'expense') expense += t.value;
                else if (t.type === 'transfer') transfer += t.value;
            });
            return { income, expense, transfer, balance: income - expense };
        }
		
		// ========== Busca de CEP -*viacep*====
		async function fetchAddressByCep(cep) {
			cep = cep.replace(/\D/g, '');
			if (cep.length !== 8) return;
			try {
				const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
				const data = await response.json();
				if (!data.erro) {
					document.getElementById('partnerStreet').value = data.logradouro || '';
					document.getElementById('partnerNeighborhood').value = data.bairro || '';
					document.getElementById('partnerCity').value = data.localidade || '';
					document.getElementById('partnerState').value = data.uf || '';
				}
			} catch (error) {
				console.error('Erro ao buscar CEP:', error);
			}
		}

        // ========== PRIVACIDADE ==========
        function updatePrivacyMode() {
            // Mega-seletor que pega os valores no Dashboard, Contas, Lançamentos e Recibos!
            const valueElements = document.querySelectorAll(
                '.summary-card .value, .transaction-amount, .receipt-value.highlight, #receiptValor, #balanceValue, #incomeValue, #expenseValue, ' +
                '.indicator-item .value, #chartTotalIncome, #chartTotalExpense, .earnings-value, ' +
                '.privacy-text-value, .account-card-balance, #detAccountBalance, #detBalanceDay, #detBalanceAvailable, ' +
                '.daily-balance-neutral, .daily-balance-negative'
            );
            
            valueElements.forEach(el => {
                if (privacyActive) {
                    if (!el.dataset.original) {
                        // Salva o HTML para não perder formatação de cores e sinais de + e -
                        el.dataset.original = el.innerHTML; 
                    }
                    el.textContent = 'R$ ****';
                } else {
                    if (el.dataset.original) {
                        // Restaura o HTML original com os valores
                        el.innerHTML = el.dataset.original;
                    }
                }
            });
        }

        function togglePrivacy() {
            privacyActive = !privacyActive;
            localStorage.setItem('controlpess-privacy', privacyActive); // NOVO: Salva a preferência
            const btn = document.getElementById('privacyToggle');
            if (btn) {
                const icon = btn.querySelector('span');
                // Lógica corrigida: se a privacidade está ativa, mostra o olho com risco. Senão, olho aberto.
                icon.textContent = privacyActive ? 'visibility_off' : 'visibility';
            }
            updatePrivacyMode();
        }

        // ========== TEMA CLARO/ESCURO ==========
		const themeToggle = document.getElementById('themeToggle');

		// Função para atualizar o ícone e salvar preferência
		function updateThemeIcon() {
			const isDark = document.body.classList.contains('dark-mode');
			const icon = themeToggle.querySelector('span');
			icon.textContent = isDark ? 'light_mode' : 'dark_mode';
			localStorage.setItem('controlpess-theme', isDark ? 'dark' : 'light');
		}

		// Aplicar tema salvo ao carregar a página
		(function loadSavedTheme() {
			const savedTheme = localStorage.getItem('controlpess-theme');
			if (savedTheme === 'dark') {
				document.body.classList.add('dark-mode');
			} else {
				document.body.classList.remove('dark-mode');
			}
			// Atualizar ícone se o botão já existir (pode ser chamado depois)
			if (themeToggle) {
				const icon = themeToggle.querySelector('span');
				icon.textContent = document.body.classList.contains('dark-mode') ? 'light_mode' : 'dark_mode';
			}
		})();
		
		// --- NOVO: Restaurar estado do Menu Lateral e Privacidade ao abrir o sistema ---
		(function loadSavedUIStates() {
			// 1. Restaura o Menu Lateral
			const savedSidebar = localStorage.getItem('controlpess-sidebar');
			const appSidebar = document.getElementById('appSidebar');
			// Só aplica se estiver no computador (no celular o CSS já força ela a ficar escondida por padrão)
			if (window.innerWidth > 768 && savedSidebar === 'collapsed' && appSidebar) {
				appSidebar.classList.add('collapsed');
			}

			// 2. Restaura o ícone do Olhinho
			const btnPrivacy = document.getElementById('privacyToggle');
			if (btnPrivacy) {
				const icon = btnPrivacy.querySelector('span');
				icon.textContent = privacyActive ? 'visibility_off' : 'visibility';
			}
		})();

		themeToggle.addEventListener('click', () => {
			document.body.classList.toggle('dark-mode');
			updateThemeIcon();
            
            // RE-PINTA AS TELAS EM TEMPO REAL CONFORME O TEMA ATIVO
            if (currentView === 'dashboard') {
                renderDashboard();
            } else if (currentView === 'transactions') {
                renderTransactions();
            } else if (currentView === 'accounts') {
                renderAccounts();
            }
		});

        // ========== FÁBRICA DE COMPONENTES VISUAIS (HTML) ==========
        // Técnica: Guardamos o visual em funções isoladas para limpar a lógica principal.
        
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

        // NOVA FÁBRICA: Recebe "ingredientes" (variáveis) e monta o HTML dinamicamente
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

        // NOVA FÁBRICA: Cria as linhas de Lançamentos que aparecem no Dashboard
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

        // NOVA FÁBRICA: Cria os cartões da tela de Contas Financeiras
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

        // NOVA FÁBRICA: Cria as linhas da lista principal de Lançamentos (Extrato)
        function criarHtmlItemTransacao(id, typeClass, icon, tituloPrincipal, subDescricao, amountClass, amountSign, valorFormatado, badgeHtml, htmlBotoesAcao) {
            // MÁGICA DE TRADUÇÃO: Pega as cores e formatos do Figma (React) e injeta direto no seu HTML seguro!
            let bgIcon = typeClass === 'income' ? '#ecfdf5' : (typeClass === 'expense' ? '#fff1f2' : '#eef2ff');
            let corIcone = typeClass === 'income' ? '#059669' : (typeClass === 'expense' ? '#e11d48' : '#4f46e5');
            
            // Converte os ícones antigos para as setinhas modernas desenhadas no Figma
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

        // NOVA FÁBRICA: Cria as linhas da tabela do relatório em PDF
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

        // NOVA FÁBRICA: Cria o cabeçalho do mês e a tabela para o PDF
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

        // NOVA FÁBRICA: Cria as linhas genéricas para as listas de Configuração e Cadastros
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

        // NOVA FÁBRICA: Monta a tela inteira da Carteira (Apple Wallet)
        function criarHtmlLayoutCarteira(props) {
            // Separa os pedaços para manter o código limpo
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

        // ========== NOTIFICAÇÕES ==========
        const notificationsBtn = document.getElementById('notificationsBtn');
        const notificationsDropdown = document.getElementById('notificationsDropdown');
        const notifBadge = document.getElementById('notifBadge');

        function renderNotifications() {
            const notificationsDropdown = document.getElementById('notificationsDropdown');
            const notifBadge = document.getElementById('notifBadge');
            
            const emptyStateHtml = criarHtmlNotificacaoVazia();

            if (!transactions || transactions.length === 0) {
                notificationsDropdown.innerHTML = emptyStateHtml;
                notifBadge.style.display = 'none';
                return;
            }

            const now = new Date();
            const hojeLocal = getTodayISO();
            let html = '';
            let count = 0;

            const pendentes = transactions.filter(t => !t.isPaid && t.type !== 'transfer');
            pendentes.sort((a, b) => new Date(a.date) - new Date(b.date));

            pendentes.forEach(t => {
                const title = t.description ? t.description : '(Sem descrição)';
                const isIncome = t.type === 'income'; 
                
                if (t.date < hojeLocal) {
                    const textLabel = isIncome ? 'Recebimento Atrasado' : 'Despesa Vencida';
                    const textoComData = `${textLabel} em ${formatDate(t.date)}`;
                    
                    // A mágica: Encomenda o HTML da fábrica passando os ingredientes corretos
                    html += criarHtmlItemNotificacao(t.id, title, textoComData, 'error_outline', 'overdue', '#d93025');
                    count++;
                } else if (t.date === hojeLocal) {
                    const textLabel = isIncome ? 'A Receber Hoje' : 'Vence Hoje';
                    
                    // A mágica: Encomenda o HTML da fábrica com ingredientes diferentes
                    html += criarHtmlItemNotificacao(t.id, title, textLabel, 'schedule', 'today', '#e67e22');
                    count++;
                }
            });

            if (count === 0) {
                notificationsDropdown.innerHTML = emptyStateHtml;
                notifBadge.style.display = 'none';
            } else {
                const headerHtml = `<div style="padding: 12px 16px 4px 16px; font-size: 0.85rem; font-weight: 600; color: #5f6368; text-transform: uppercase; letter-spacing: 0.5px;">Pendências</div>`;
                notificationsDropdown.innerHTML = headerHtml + html;
                notifBadge.style.display = 'flex';
                notifBadge.textContent = count > 9 ? '9+' : count; 
            }
        }

        notificationsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationsDropdown.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!notificationsBtn.contains(e.target) && !notificationsDropdown.contains(e.target)) {
                notificationsDropdown.classList.remove('show');
            }
        });

        renderNotifications();

        // ========== BRIEFING DE BOAS VINDAS (POP-UP) ==========
        function showDailyBriefing() {
            // Regra de Ouro: Exibir apenas 1 vez por sessão (Login)
            if (sessionStorage.getItem('briefingShown') === 'true') return;

            const nomeUsuario = window.currentUserName ? window.currentUserName.split(' ')[0] : 'Usuário';
            document.getElementById('briefingName').textContent = nomeUsuario;

            const now = new Date();
            const hojeLocal = getTodayISO();
            
            // Calcula a data de daqui a 7 dias
            const daqui7DiasDate = new Date();
            daqui7DiasDate.setDate(daqui7DiasDate.getDate() + 7);
            const daqui7DiasLocal = formatDateISO(daqui7DiasDate);

            // Pega apenas o que não foi pago (ignorando transferências)
            const pendentes = transactions.filter(t => !t.isPaid && t.type !== 'transfer');
            
            const vencidos = [];
            const vencemHoje = [];
            const proximos = [];

            pendentes.forEach(t => {
                if (t.date < hojeLocal) vencidos.push(t);
                else if (t.date === hojeLocal) vencemHoje.push(t);
                else if (t.date <= daqui7DiasLocal) proximos.push(t);
            });

            // Se o usuário for muito organizado e não tiver nada nos próximos 7 dias, não incomoda ele!
            if (vencidos.length === 0 && vencemHoje.length === 0 && proximos.length === 0) {
                sessionStorage.setItem('briefingShown', 'true');
                return;
            }

            // Ordena as listas
            vencidos.sort((a, b) => new Date(a.date) - new Date(b.date));
            vencemHoje.sort((a, b) => new Date(a.date) - new Date(b.date));
            proximos.sort((a, b) => new Date(a.date) - new Date(b.date));

            // Variáveis Dinâmicas de Cor (Modo Claro vs Modo Escuro)
            const isDark = document.body.classList.contains('dark-mode');
            const borderColor = isDark ? '#444746' : '#e8eaed';
            const titleColor = isDark ? '#e3e3e3' : '#202124';
            const subColor = isDark ? '#c4c7c5' : '#5f6368';
            const hoverBg = isDark ? '#333537' : '#f8f9fa';

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
            
            // Exibe a tela
            document.getElementById('briefingModal').style.display = 'flex';
            
            // Salva na memória do navegador para não exibir de novo até o próximo login/fechamento da aba
            sessionStorage.setItem('briefingShown', 'true');
        }

        // Fecha o Modal
        document.getElementById('closeBriefingBtn').addEventListener('click', () => { document.getElementById('briefingModal').style.display = 'none'; });
        document.getElementById('btnAcknowledgeBriefing').addEventListener('click', () => { document.getElementById('briefingModal').style.display = 'none'; });

        // ========== GRÁFICOS DO DASHBOARD ==========
        let monthlyEarningsChart = null;

        // Função para criar gradiente
        function createGradient(ctx, color1, color2) {
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, color1);
            gradient.addColorStop(1, color2);
            return gradient;
        }

        function buildCardCarousel() {
            const cards = [];
            (accounts || []).filter(a => a.active !== false && a.cards && a.cards.length > 0).forEach(acc => {
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

        // ========== DASHBOARD (NOVO) ==========
        function renderDashboard() {
            const container = document.getElementById('kpiContainer');
			
			const { displayCard, nextCard, cardArrowsHtml, cardDotsHtml, isDarkMode } = buildCardCarousel();
            
            // Trata o tamanho do nome do banco para não vazar
            let formatBankName = displayCard ? (displayCard.bankLabel || 'Cartão') : 'Sem Cartão';
            if (formatBankName.length > 18) formatBankName = formatBankName.substring(0, 18) + '...';

            // --- INTELIGÊNCIA: CONTAS A PAGAR DO MÊS ATUAL ---
            const nowDash = new Date();
            const currentMonthStr = `${nowDash.getFullYear()}-${String(nowDash.getMonth() + 1).padStart(2, '0')}`;
            
            const monthExpenses = (transactions || []).filter(t => t.type === 'expense' && t.date.startsWith(currentMonthStr));
            const totalExpensesCount = monthExpenses.length;
            const paidExpensesCount = monthExpenses.filter(t => t.isPaid).length;
            const unpaidExpensesCount = totalExpensesCount - paidExpensesCount;
            
            // Novos Cálculos Financeiros (Valor em Reais)
            const totalExpensesValue = monthExpenses.reduce((a, t) => a + t.value, 0);
            const paidExpensesValue = monthExpenses.filter(t => t.isPaid).reduce((a, t) => a + t.value, 0);
            const unpaidExpensesValue = totalExpensesValue - paidExpensesValue;
            const expensesProgressPct = totalExpensesValue > 0 ? Math.round((paidExpensesValue / totalExpensesValue) * 100) : 0;

            // --- INTELIGÊNCIA: RECEITAS, DESPESAS E SALDO GERAL (REGIME DE CAIXA) ---
            const monthIncomes = (transactions || []).filter(t => t.type === 'income' && t.date.startsWith(currentMonthStr));
            
            // --- INTELIGÊNCIA: CONTAS A RECEBER DO MÊS ATUAL ---
            const totalIncomesCount = monthIncomes.length;
            const paidIncomesCount = monthIncomes.filter(t => t.isPaid).length;
            const unpaidIncomesCount = totalIncomesCount - paidIncomesCount;

            // Novos Cálculos Financeiros (Valor em Reais)
            const totalIncomesValue = monthIncomes.reduce((a, t) => a + t.value, 0);
            const paidIncomesValue = monthIncomes.filter(t => t.isPaid).reduce((a, t) => a + t.value, 0);
            const unpaidIncomesValue = totalIncomesValue - paidIncomesValue;
            const incomesProgressPct = totalIncomesValue > 0 ? Math.round((paidIncomesValue / totalIncomesValue) * 100) : 0;

            // Filtra rigorosamente APENAS o que já foi recebido/pago para refletir a realidade do bolso
            const dashMonthIncome = monthIncomes.filter(t => t.isPaid).reduce((acc, t) => acc + t.value, 0);
            const dashMonthExpense = monthExpenses.filter(t => t.isPaid).reduce((acc, t) => acc + t.value, 0);
            
            const dashTotalBalance = (accounts || []).filter(a => a.includeInKPI !== false && a.active !== false).reduce((acc, a) => acc + (a.balance || 0), 0);

            // --- INTELIGÊNCIA: ÚLTIMOS LANÇAMENTOS ---
            const todayStr = new Date().toISOString().split('T')[0];
            const recentTransactions = [...(transactions || [])]
                .filter(t => t.date <= todayStr) // Trava: Mostra apenas o que já aconteceu até hoje!
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
                    
                    // A mágica: encomendamos o HTML preenchido na nossa fábrica!
                    recentTxsHtml += criarHtmlItemDashboard(t.id, title, formatDate(t.date), icon, iconClass, valClass, sign, formatCurrency(t.value), 'Editar');
                });
            }

            // --- INTELIGÊNCIA: A PAGAR (PRÓXIMOS VENCIMENTOS) ---
			const unpaidTransactions = (transactions || [])
				.filter(t => !t.isPaid && t.type === 'expense' && t.date.startsWith(currentMonthStr)) 
				.sort((a, b) => new Date(a.date) - new Date(b.date))
				.slice(0, 3);

            let unpaidTxsHtml = '';
            if (unpaidTransactions.length === 0) {
                // Design Premium
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
                    // A mágica novamente! Aqui passamos parâmetros fixos pois todos são "Despesas".
                    unpaidTxsHtml += criarHtmlItemDashboard(t.id, title, formatDate(t.date), 'bolt', 'expense-icon', 'expense', '- ', formatCurrency(t.value), 'Pagar');
                });
            }

            const isDark = isDarkMode;

            // --- INTELIGÊNCIA: SALDO POR CONTAS ---
            const dashAccounts = accounts.filter(a => a.showOnDashboard !== false && a.active !== false).sort((a,b) => b.balance - a.balance);
            let accountsListHtml = '';
            if (dashAccounts.length === 0) {
                accountsListHtml = '<div style="padding: 1.5rem 0; color: #64748b; text-align: center; font-size: 0.9rem;">Nenhuma conta no dashboard</div>';
            } else {
                dashAccounts.forEach(acc => {
                    // Dinâmica de cores: Positivo com o mesmo azul-marinho do Ganhos (#1e3c72) no modo claro
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

            // Cálculo de tendências para badges dos KPIs
            const prevMonthDate = new Date(nowDash.getFullYear(), nowDash.getMonth() - 1, 1);
            const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
            const prevIncome = (transactions||[]).filter(t=>t.type==='income'&&t.isPaid&&t.date.startsWith(prevMonthStr)).reduce((a,t)=>a+t.value,0);
            const prevExpense = (transactions||[]).filter(t=>t.type==='expense'&&t.isPaid&&t.date.startsWith(prevMonthStr)).reduce((a,t)=>a+t.value,0);

            // Nova lógica para o Saldo Total e Porcentagem de Economia
            const monthResult = dashMonthIncome - dashMonthExpense;
            const pastBalance = dashTotalBalance - monthResult;
            const econPct = dashMonthIncome > 0 ? Math.round(((dashMonthIncome - dashMonthExpense) / dashMonthIncome) * 100) : 0;

            // --- INTELIGÊNCIA: BARRAS DINÂMICAS DE RESULTADO MENSAL (Últimos 7 meses) ---
            let historyBalances = [];
            const nomeMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            
            // Loop que volta 7 meses no tempo
            for (let i = 0; i < 7; i++) {
                const d = new Date(nowDash.getFullYear(), nowDash.getMonth() - i, 1);
                const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                
                // Pega as receitas e despesas exatas daquele mês
                const txsMes = (transactions || []).filter(t => t.date.startsWith(mStr) && t.isPaid && t.type !== 'transfer');
                const incMes = txsMes.filter(t => t.type === 'income').reduce((a, t) => a + t.value, 0);
                const expMes = txsMes.filter(t => t.type === 'expense').reduce((a, t) => a + t.value, 0);
                
                // Em vez do Saldo Total Acumulado, usamos o RESULTADO LÍQUIDO DO MÊS (o que sobrou ou faltou)
                const resultadoMes = incMes - expMes;
                historyBalances.unshift({ val: resultadoMes, label: nomeMeses[d.getMonth()] });
            }

            // Descobre qual foi o maior resultado (ignorando se é negativo ou positivo) para definir o 100% da altura
            const maxBal = Math.max(...historyBalances.map(b => Math.abs(b.val)), 1); 
            let dynamicBarsHtml = '';
            
            // Desenha as barrinhas proporcionais
            historyBalances.forEach((item, index) => {
                const isCurrentMonth = (index === 6);
                let pct = Math.round((Math.abs(item.val) / maxBal) * 100);
                if (pct < 8) pct = 8; // Altura mínima para a barra não sumir da tela
                
                const activeClass = isCurrentMonth ? 'active' : '';
                const sinal = item.val > 0 ? '+' : '';
                
                // Se o mês fechou no vermelho (faltou dinheiro), deixamos a barra levemente avermelhada para indicar perigo
                const corNegativa = (item.val < 0 && !isCurrentMonth) ? 'background: rgba(244, 63, 94, 0.4);' : '';
                
                dynamicBarsHtml += `<div class="dsw-bar ${activeClass}" style="height:${pct}%; ${corNegativa}" title="${item.label}: ${sinal}${formatCurrency(item.val)}"></div>`;
            });

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

            // --- CÁLCULO DINÂMICO PARA O FLUXO DE CAIXA (Últimos 6 meses) ---
            renderCashFlowChart(isDark);

            // Donut de resultado removido — substituído por card de métricas

            // 1. Gráficos circulares de Contas a Pagar/Receber removidos.
            // O novo design utiliza apenas as barras horizontais nativas no HTML focando no valor financeiro.

            // 3. INTELIGÊNCIA DO GRÁFICO DINÂMICO (CATEGORIA OU CENTRO DE CUSTO)
            renderDonutChart(monthExpenses, isDark);

            updatePrivacyMode();
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

                const txs = (transactions || []).filter(t => t.date.startsWith(monthStr) && t.isPaid && t.type !== 'transfer');
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
                        const cat = categories.find(c => c.id === catId);
                        donutLabels.push(cat ? cat.name : 'Outros');
                        donutData.push(value);
                        donutColors.push(cat ? (cat.color || '#9aa0a6') : '#9aa0a6');
                    });
                }
            } else {
                const costCenterTotals = {};
                paidMonthExpensesForCat.forEach(t => {
                    const cat = categories.find(c => c.id === t.category);
                    const ccId = cat && cat.costCenter ? cat.costCenter : 'sem_centro';
                    costCenterTotals[ccId] = (costCenterTotals[ccId] || 0) + t.value;
                });
                const sortedCCs = Object.entries(costCenterTotals).sort((a, b) => b[1] - a[1]);

                if (sortedCCs.length === 0) { isEmpty = true; } 
                else {
                    sortedCCs.forEach(([ccId, value]) => {
                        const cc = costCenters.find(c => c.id === ccId);
                        donutLabels.push(cc ? cc.description : 'Sem Centro');
                        donutData.push(value);
                        donutColors.push(cc ? (cc.color || '#1a73e8') : '#9aa0a6');
                    });
                }
            }

            // Trata o caso de mês sem despesas para não deixar o gráfico quebrado
            if (isEmpty) {
                donutLabels.push('Sem despesas');
                donutData.push(1);
                donutColors.push(isDark ? 'var(--cor-borda-dark)' : '#e8eaed');
            }

            // Renderiza o Gráfico Único
            const ctxDonut = document.getElementById('dynamicDonutChart').getContext('2d');
            if (window.dynamicDonutChartInstance) window.dynamicDonutChartInstance.destroy();

            window.dynamicDonutChartInstance = new Chart(ctxDonut, {
                type: 'doughnut',
                data: {
                    labels: donutLabels,
                    datasets: [{
                        data: donutData,
                        backgroundColor: donutColors,
                        borderWidth: isEmpty ? 0 : 3, // Cria as ranhuras separando as fatias
                        borderColor: isDark ? 'var(--cor-superficie-dark)' : '#ffffff', // A cor da ranhura tem que ser igual ao fundo do cartão!
                        hoverOffset: 6 // A fatia dá um "pulo" chique ao passar o mouse
                    }]
                },
                options: {
                    cutout: '78%', // Anel levemente mais fino
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: { padding: { left: 20, right: 20, top: 10, bottom: 10 } },
                    plugins: {
                        legend: {
                            display: !isEmpty,
                            position: 'right',
                            labels: {
                                color: isDark ? '#94a3b8' : '#64748b', // Cinza Slate atualizado
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

        // Novas Variáveis Globais de Controle de Filtro
        let currentPartner = 'all';
        let customStartDate = '';
        let customEndDate = '';
        let previousPeriod = 'month'; // Guarda memória se o usuário cancelar o modal

        // ========== TRANSAÇÕES ==========
        function filterTransactions() {
            return transactions.filter(t => {
                // 1. Filtro de Tipo (Receita, Despesa, Transferência)
                if (currentType !== 'all' && t.type !== currentType) return false;
                
                // NOVO: Filtro de Parceiro
                if (currentPartner !== 'all' && t.partnerId !== currentPartner) return false;
				
				// NOVO: Filtro de Conta (Pega Receitas, Despesas e também analisa a Origem/Destino das Transferências)
                if (window.currentAccountFilter && window.currentAccountFilter !== 'all') {
                    if (t.accountId !== window.currentAccountFilter && 
                        t.contaOrigemId !== window.currentAccountFilter && 
                        t.contaDestinoId !== window.currentAccountFilter) {
                        return false;
                    }
                }

                // 2. Filtro de Período (Com inteligência Personalizada de Regime de Caixa)
                // Pega a data efetiva exata sob a qual o lançamento deve aparecer na listagem
                const effectiveDate = (t.isPaid && t.paymentDate) ? t.paymentDate : t.date;

                if (currentPeriod === 'custom') {
                    if (effectiveDate < customStartDate || effectiveDate > customEndDate) return false;
                } else if (currentPeriod !== 'all') {
                    const today = new Date();
                    today.setHours(0,0,0,0);
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

                // 3. NOVO: Filtro de Status
                if (currentStatus !== 'all') {
                    const now = new Date();
                    const hojeLocal = getTodayISO();
                    const isPaid = t.isPaid;
                    const isTransfer = t.type === 'transfer'; // Transferências não têm atraso
                    
                    if (currentStatus === 'paid') {
                        if (!isPaid && !isTransfer) return false;
                    } else if (currentStatus === 'unpaid') {
                        // NOVO: Mostra tudo que NÃO está pago (engloba agendados e vencidos)
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

            document.getElementById('balanceValue').innerHTML = `<span class="txn-val">${formatCurrency(balance)}</span>`;
            document.getElementById('incomeValue').innerHTML = `<span class="txn-val">${formatCurrency(totalIncome)}</span>`;
            document.getElementById('expenseValue').innerHTML = `<span class="txn-val">${formatCurrency(totalExpense)}</span>`;

            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

            const curIncome = transactions.filter(t => t.type === 'income' && t.date.startsWith(currentMonth)).reduce((a, t) => a + t.value, 0);
            const curExpense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth)).reduce((a, t) => a + t.value, 0);
            const prevIncome = transactions.filter(t => t.type === 'income' && t.date.startsWith(prevMonth)).reduce((a, t) => a + t.value, 0);
            const prevExpense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(prevMonth)).reduce((a, t) => a + t.value, 0);

            const bTrend = document.getElementById('balanceTrend');
            const iTrend = document.getElementById('incomeTrend');
            const eTrend = document.getElementById('expenseTrend');
            if (bTrend) bTrend.innerHTML = trendBadge(curIncome - curExpense, prevIncome - prevExpense);
            if (iTrend) iTrend.innerHTML = trendBadge(curIncome, prevIncome);
            if (eTrend) eTrend.innerHTML = trendBadge(curExpense, prevExpense, true);
        }

        // Função auxiliar para cabeçalhos de data estilo "Inter"
        function formatDateHeader(dateStr) {
            const txDate = new Date(dateStr + 'T12:00:00');
            const today = new Date();
            today.setHours(0,0,0,0);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (txDate.getTime() === today.getTime()) return "Hoje";
            if (txDate.getTime() === yesterday.getTime()) return "Ontem";
            
            const options = { day: 'numeric', month: 'long' };
            return txDate.toLocaleDateString('pt-BR', options);
        }

        function renderTransactions() {
            const filtered = filterTransactions();
            const listEl = document.getElementById('transactionsList');
            
            // ESCUDO SENIOR: Se o elemento não existir na tela atual, aborta silenciosamente sem quebrar o app!
            if (!listEl) return;
            
            if (filtered.length === 0) {
                listEl.innerHTML = `
                    <div class="empty-state">
                        <span class="material-icons">search_off</span>
                        <h3>Nenhum lançamento encontrado</h3>
                        <p>Tente ajustar os filtros acima ou cadastre um novo lançamento.</p>
                    </div>
                `;
                updateSummaryTotals(filtered);
                updatePrivacyMode();
                return;
            }

            let html = '';
            // Ordena decrescente: Primeiro pela data real de movimento (Regime de Caixa), depois pela hora exata de criação
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
                // Inteligência Contábil: Define em qual dia este lançamento deve aparecer no extrato
                const effectiveDate = (t.isPaid && t.paymentDate) ? t.paymentDate : t.date;

                // Adiciona cabeçalho se a data mudar
                if (effectiveDate !== currentDateStr) {
                    
                    // --- CÁLCULO DO SALDO DO DIA (Olhando para o dia em que o dinheiro de fato rodou) ---
                    const dailyTxs = filtered.filter(tx => {
                        const txEffDate = (tx.isPaid && tx.paymentDate) ? tx.paymentDate : tx.date;
                        return txEffDate === effectiveDate;
                    });
                    let dailyTotal = 0;
                    dailyTxs.forEach(tx => {
                        if (tx.type === 'income') dailyTotal += tx.value;
                        else if (tx.type === 'expense') dailyTotal -= tx.value;
                    });
                    
                    // Usa as classes elegantes do CSS para o saldo
                    const balanceClass = dailyTotal < 0 ? 'daily-balance-negative' : 'daily-balance-neutral';

                    html += `
                        <div class="date-header">
                            <span>${formatDateHeader(effectiveDate)}</span>
                            <span class="${balanceClass} daily-balance">${formatCurrency(dailyTotal)}</span>
                        </div>
                    `;
                    currentDateStr = effectiveDate;
                }

                const typeClass = t.type;
                let icon = 'receipt';
                if (t.type === 'expense') icon = 'shopping_bag'; // Ícone mais moderno
                else if (t.type === 'income') icon = 'payments';
                else if (t.type === 'transfer') icon = 'swap_horiz';

                let amountClass = typeClass;
                let amountSign = '';
                if (t.type === 'expense') { amountSign = '- '; } // Adicionado o sinal de menos para clareza visual
                else if (t.type === 'income') { amountSign = '+ '; }
                
                const categoryName = getCategoryNameById(t.category) || 'Outros';
                
                // NOVA HIERARQUIA: Parceiro vira o título principal. Se não houver, usa a Descrição.
                const tituloPrincipal = t.partnerName ? t.partnerName : (t.description || '(Sem descrição)');
                
                // Se o Parceiro assumiu o título principal, a descrição desce para o subtítulo
                const subDescricao = (t.partnerName && t.description) 
                    ? `${t.description} • ${categoryName}` 
                    : categoryName;
                
                // Lógica Inteligente de Agendado vs Vencido vs Pago
                let badgeHtml = '';
                if (t.type !== 'transfer') {
                    if (t.isPaid) {
                        badgeHtml = `<span class="status-badge paid">Pago</span>`;
                    } else {
                        const now = new Date();
                        const hojeLocal = getTodayISO();
                        
                        if (t.date < hojeLocal) {
                            badgeHtml = `<span class="status-badge overdue">Vencido</span>`;
                        } else {
                            badgeHtml = `<span class="status-badge scheduled">Agendado</span>`;
                        }
                    }
                } else {
                    badgeHtml = `<span class="status-badge scheduled" style="border-color: ${isDark ? '#8ab4f8' : '#1a73e8'}; color: ${isDark ? '#8ab4f8' : '#1a73e8'};">Transferido</span>`;
                }

                // Prepara os botões de ação (O botão de pagar só aparece se não estiver pago e não for transferência)
                let botoesAcaoHtml = '';
                if (!t.isPaid && t.type !== 'transfer') {
                    botoesAcaoHtml += `<button class="action-btn pay-btn" title="Efetivar Pagamento"><span class="material-icons">check_circle</span></button>`;
                }
                botoesAcaoHtml += `<button class="action-btn delete-btn" title="Excluir"><span class="material-icons">delete</span></button>`;

                // A mágica: encomendamos a linha de transação na nossa fábrica!
                html += criarHtmlItemTransacao(t.id, typeClass, icon, tituloPrincipal, subDescricao, amountClass, amountSign, formatCurrency(t.value), badgeHtml, botoesAcaoHtml);
            });

            listEl.innerHTML = html;
            updateSummaryTotals(filtered);
            updatePrivacyMode();

            // EVENTO DA AÇÃO RÁPIDA "MARCAR COMO PAGO" (Card)
            document.querySelectorAll('.pay-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation(); 
                    const item = e.target.closest('.transaction-item');
                    const id = item.dataset.id;
                    const t = transactions.find(x => x.id === id);
                    if (!t) return;

                    // Chama o modal Inteligente e aguarda a decisão
                    const chosenDate = await askPaymentDate(t.date);
                    if (!chosenDate) return; 
                    
                    try {
                        await userRef('transactions').doc(id).update({
                            isPaid: true,
                            paymentDate: chosenDate,
                            updatedAt: new Date().toISOString()
                        });
                        
                        const idx = transactions.findIndex(x => x.id === id);
                        if(idx !== -1) {
                            transactions[idx].isPaid = true;
                            transactions[idx].paymentDate = chosenDate;
                            // CONTABILIDADE: Subtrai/Soma o saldo no banco!
                            await processAccountBalance(transactions[idx], 'apply');
                        }
                        
                        showToast('Lançamento pago com sucesso!', 'success');
                        renderTransactions();
                        renderDashboard();
                    } catch(error) {
                        showToast('Erro ao processar pagamento.', 'error');
                    }
                });
            });

            // EVENTO DE VISUALIZAÇÃO/EDIÇÃO (Clicar no Card Inteiro)
            document.querySelectorAll('.transaction-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    // Se clicou na lixeira, ele ignora e deixa deletar
                    if (e.target.closest('.delete-btn')) return;
                    
                    const id = item.dataset.id;
                    openEditTransactionModal(id); 
                });
            });

            // EVENTO DE EXCLUSÃO
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const item = e.target.closest('.transaction-item');
                    const id = item.dataset.id;
                    
                    const isConfirmed = await askConfirmation(
                        'Excluir Lançamento', 
                        'Tem certeza que deseja excluir este lançamento permanentemente?', 
                        'Excluir', 
                        true, 
                        'delete_outline'
                    );

                    if (isConfirmed) {
                        // CONTABILIDADE: Devolve o saldo antes de apagar!
                        const txToDel = transactions.find(t => t.id === id);
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
		
		// ========== CONFIGURAÇÕES ==========
		function renderSettings() {
			// Configurar delegação de eventos no grid (faz isso apenas uma vez)
			const grid = document.querySelector('#settingsView .settings-grid'); /* CORRIGIDO */
			if (!grid) return;
			
			// Remove listeners antigos para não duplicar (opcional)
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
				// Abre a subview de listagem
					document.querySelector('#settingsView .settings-grid').style.display = 'none';
					paymentTypesView.style.display = 'block';
					loadPaymentTypes(); // função que criaremos
					break;
				case 'alerts':
					document.querySelector('#settingsView .settings-grid').style.display = 'none';
					document.getElementById('alertsView').style.display = 'block';
					
					// LÓGICA REVERSA: O Toggle está "ativo" quando mostra. O LocalStorage guarda quando oculta.
					const isHidden = localStorage.getItem('hideOfxTransferWarning') === 'true';
					document.getElementById('toggleOfxWarning').checked = !isHidden;
					break;
			}
		}
		
		// ========== ROTINA DE AUTO-REPARO E MIGRAÇÃO PARA USUÁRIOS ANTIGOS ==========
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
				// Normaliza o nome para evitar problemas com maiúsculas/minúsculas ou acentos
				const nomeNorm = defaultPt.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
				
				// Procura se o usuário antigo já tem essa forma de pagamento na memória
				const existente = paymentTypes.find(p => 
					p.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === nomeNorm
				);

				if (!existente) {
					// CASO 1: O usuário antigo deletou ou nunca teve essa forma. Vamos criar do zero!
					const newDocRef = userRef('paymentTypes').doc();
					const novaForma = { ...defaultPt, createdAt: new Date().toISOString() };
					batch.set(newDocRef, novaForma);
					paymentTypes.push({ id: newDocRef.id, ...novaForma }); // Atualiza a memória RAM local
					houveAlteracao = true;
				} else if (!existente.isSystem) {
					// CASO 2: Ele tem a forma (ex: "Crédito"), mas ela é antiga e não tem a flag de proteção 'isSystem'
					const docRef = userRef('paymentTypes').doc(existente.id);
					batch.update(docRef, { isSystem: true });
					existente.isSystem = true; // Atualiza a trava na memória RAM local
					houveAlteracao = true;
				}
			});

			// Se encontramos contas antigas precisando de reparo, salva tudo no Firestore de uma vez só
			if (houveAlteracao) {
				await batch.commit();
				console.log("🚀 ControlPess: Conta antiga identificada e atualizada para a nova política de segurança!");
			}
		}
		
		async function verificarERepararContasPadrao() {
			if (!currentUser) return;

			// Busca o ID do "Dinheiro" na memória (pois a função de formas já rodou e carregou ele)
			const ptDinheiro = paymentTypes.find(p => p.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === "dinheiro");
			const dinheiroId = ptDinheiro ? ptDinheiro.id : null;

			const existente = accounts.find(a => 
				a.isSystem || (a.type === 'Carteira' && a.name.toLowerCase() === 'carteira')
			);

			if (!existente) {
				// CASO 1: Usuário antigo não tem a Carteira padrão. Cria ela zerada já vinculada.
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
					acceptedPaymentTypes: dinheiroId ? [dinheiroId] : [], // <--- Vínculo!
					createdAt: new Date().toISOString()
				};
				await newDocRef.set(novaConta);
				accounts.push({ id: newDocRef.id, ...novaConta });
			} else {
				// CASO 2: Ele tem a Carteira, mas pode faltar blindagem OU faltar o vínculo do Dinheiro
				let updateData = {};
				let needsUpdate = false;

				if (!existente.isSystem) {
					updateData.isSystem = true;
					needsUpdate = true;
				}

				// Se o Dinheiro não está vinculado na Carteira dele, nós injetamos!
				if (dinheiroId && (!existente.acceptedPaymentTypes || !existente.acceptedPaymentTypes.includes(dinheiroId))) {
					updateData.acceptedPaymentTypes = existente.acceptedPaymentTypes ? [...existente.acceptedPaymentTypes, dinheiroId] : [dinheiroId];
					needsUpdate = true;
				}

				if (needsUpdate) {
					await userRef('accounts').doc(existente.id).update(updateData);
					Object.assign(existente, sanitizeFirestoreData(updateData)); // Atualiza na memória RAM
				}
			}
		}

		// --- Eventos da tela de Alertas ---
		document.getElementById('backFromAlerts')?.addEventListener('click', () => {
			document.getElementById('alertsView').style.display = 'none';
			document.querySelector('#settingsView .settings-grid').style.display = 'grid';
		});

        // Lógica do Acordeão (Expandir/Encolher) do Alerta OFX
        document.getElementById('ofxWarningAccordion')?.addEventListener('click', () => {
            const descContainer = document.getElementById('ofxWarningDesc');
            const chevron = document.getElementById('ofxWarningChevron');
            
            // Verifica se está fechado (0fr) e abre, ou vice-versa
            if (descContainer.style.gridTemplateRows === '0fr' || !descContainer.style.gridTemplateRows) {
                descContainer.style.gridTemplateRows = '1fr';
                chevron.style.transform = 'rotate(180deg)'; // Gira a setinha para cima
            } else {
                descContainer.style.gridTemplateRows = '0fr';
                chevron.style.transform = 'rotate(0deg)'; // Volta a setinha para baixo
            }
        });

		document.getElementById('toggleOfxWarning')?.addEventListener('change', (e) => {
			if (e.target.checked) {
				// Se a chave ligou (quer ver), apagamos o bloqueio!
				localStorage.removeItem('hideOfxTransferWarning');
			} else {
				// Se a chave desligou (não quer ver), ativamos o bloqueio!
				localStorage.setItem('hideOfxTransferWarning', 'true');
			}
		});

        // ========== FILTROS ==========
        document.getElementById('periodFilter')?.addEventListener('change', (e) => {
            currentPeriod = e.target.value;
            renderTransactions();
        });
		
		// Evento do novo filtro de status
        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            currentStatus = e.target.value;
            renderTransactions();
        });

        document.querySelectorAll('#typeFilter button').forEach(btn => {
            btn?.addEventListener('click', (e) => {
                document.querySelectorAll('#typeFilter button').forEach(b => b?.classList.remove('active'));
                btn.classList.add('active');
                currentType = btn.dataset.type;
                renderTransactions();
            });
        });

        // --- EVENTO DO BOTÃO LIMPAR FILTROS ---
        // --- EVENTOS DOS NOVOS FILTROS (PARCEIRO E PERÍODO) ---
        const periodFilterElement = document.getElementById('periodFilter');
        const customPeriodModal = document.getElementById('customPeriodModal');
        
        // Popula Parceiros no Filtro
        function populatePartnerFilter() {
            const pFilter = document.getElementById('partnerFilter');
            if(!pFilter) return;
            pFilter.innerHTML = '<option value="all" selected>Todos</option>';
            partners.filter(p => p.active !== false).forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                pFilter.appendChild(opt);
            });
            pFilter.value = currentPartner;
        }

        // NOVO: Popula Contas no Filtro
        function populateAccountFilter() {
            const accFilter = document.getElementById('accountFilter');
            if(!accFilter) return;
            accFilter.innerHTML = '<option value="all" selected>Todas</option>';
            accounts.filter(a => a.active !== false).forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.id;
                opt.textContent = a.name;
                accFilter.appendChild(opt);
            });
            // Lê o valor atual ou define como 'all'
            accFilter.value = window.currentAccountFilter || 'all';
        }

        // Eventos: Selecionou Parceiro ou Conta (Protegidos com Escudo Senior)
        document.getElementById('partnerFilter')?.addEventListener('change', (e) => {
            currentPartner = e.target.value;
            renderTransactions();
        });
        
        document.getElementById('accountFilter')?.addEventListener('change', (e) => {
            window.currentAccountFilter = e.target.value;
            renderTransactions();
        });

        // Evento: Trocou de Período (Protegido com Escudo Senior Definitivo)
        periodFilterElement?.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                // UX Premium: Se já havia data, deixa preenchido para facilitar a edição
                if (customStartDate) document.getElementById('customDateStart').value = customStartDate;
                if (customEndDate) document.getElementById('customDateEnd').value = customEndDate;
                
                customPeriodModal.style.display = 'flex';
            } else if (e.target.value !== 'custom_view') {
                currentPeriod = e.target.value;
                previousPeriod = currentPeriod;
                renderTransactions();
            }
        });

        // Evento: Fechar/Cancelar Modal de Data
        function closeCustomDateModal() {
            customPeriodModal.style.display = 'none';
            periodFilterElement.value = previousPeriod; // Aborta e volta pra opção segura
        }
        document.getElementById('closeCustomPeriodBtn').addEventListener('click', closeCustomDateModal);
        document.getElementById('cancelCustomPeriodBtn').addEventListener('click', closeCustomDateModal);

        // Evento: Botão "Filtrar" do Modal
        document.getElementById('applyCustomPeriodBtn').addEventListener('click', () => {
            const start = document.getElementById('customDateStart').value;
            const end = document.getElementById('customDateEnd').value;
            
            if (!start || !end) {
                showToast('Preencha a data de início e fim.', 'warning');
                return;
            }
            if (start > end) {
                showToast('A data inicial não pode ser maior que a final.', 'error');
                return;
            }
            
            customStartDate = start;
            customEndDate = end;
            currentPeriod = 'custom'; // A lista continua filtrando por 'custom'

            // --- A MÁGICA DA EXIBIÇÃO ---
            // Converte a data de YYYY-MM-DD para DD/MM/YYYY
            const formatBr = (dateString) => dateString.split('-').reverse().join('/');
            const dateLabel = `${formatBr(start)} - ${formatBr(end)}`;
            
            // Joga o texto na opção fantasma e seleciona ela
            const customViewOpt = document.getElementById('customViewOption');
            customViewOpt.textContent = dateLabel;
            periodFilterElement.value = 'custom_view';
            previousPeriod = 'custom_view'; // Salva na memória pra não perder se o usuário cancelar depois
            // ----------------------------
            
            customPeriodModal.style.display = 'none';
            renderTransactions();
        });

        // --- FILTER TOGGLE ON MOBILE ---
        const mobileFilterToggle = document.getElementById('mobileFilterToggle');
        const mainFiltersCard = document.getElementById('mainFiltersCard');
        if (mobileFilterToggle && mainFiltersCard) {
            mobileFilterToggle.addEventListener('click', () => {
                mainFiltersCard.classList.toggle('filters-expanded');
                const arrow = document.getElementById('filterToggleArrow');
                if (arrow) {
                    arrow.textContent = mainFiltersCard.classList.contains('filters-expanded') ? 'expand_less' : 'expand_more';
                }
            });
        }

        // --- EVENTO DO BOTÃO LIMPAR FILTROS ---
        document.getElementById('clearFiltersBtn').addEventListener('click', () => {
            // Volta as variáveis pro padrão
            currentPeriod = 'month';
            previousPeriod = 'month';
            currentStatus = 'all';
            currentType = 'all';
            currentPartner = 'all';
            window.currentAccountFilter = 'all';
            customStartDate = '';
            customEndDate = '';

            // Reseta visualmente as caixas de seleção
            periodFilterElement.value = 'month';
            document.getElementById('statusFilter').value = 'all';
            document.getElementById('partnerFilter').value = 'all';
            if (document.getElementById('accountFilter')) document.getElementById('accountFilter').value = 'all';
            
            // Limpa as caixinhas de texto do modal de datas
            document.getElementById('customDateStart').value = '';
            document.getElementById('customDateEnd').value = '';
            
            // Reseta visualmente os botões
            document.querySelectorAll('#typeFilter button').forEach(b => {
                b.classList.remove('active');
                if (b.dataset.type === 'all') b.classList.add('active');
            });

            // Atualiza a lista e joga um aviso elegante
            renderTransactions();
            showToast('Filtros restaurados', 'success');
        });
		
		// --- EVENTO DO BOTÃO RELATÓRIO PDF (INTELIGENTE E PAGINADO) ---
        const downloadReportBtn = document.getElementById('downloadReportBtn');
        if (downloadReportBtn) {
            downloadReportBtn.addEventListener('click', () => {
                const filteredTx = filterTransactions(); 
                
                if (filteredTx.length === 0) {
                    showToast('Nenhum lançamento encontrado para gerar o relatório.', 'warning');
                    return;
                }

                // 1. TRAVA DE SEGURANÇA CONTRA TRAVAMENTO DO NAVEGADOR
                if (filteredTx.length > 400) {
                    showToast('Relatório muito grande! Filtre por Mês ou Trimestre para não travar o sistema.', 'warning');
                    return;
                }

                const originalText = downloadReportBtn.innerHTML;
                downloadReportBtn.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">autorenew</span> Gerando...';
                downloadReportBtn.disabled = true;

                let totalIncome = 0;
                let totalExpense = 0;

                const txToPrint = [...filteredTx].sort((a, b) => new Date(b.date) - new Date(a.date));

                // 2. AGRUPAMENTO DOS LANÇAMENTOS POR MÊS E ANO
                const groupedByMonth = {};
                txToPrint.forEach(t => {
                    if (t.type === 'income') totalIncome += t.value;
                    if (t.type === 'expense') totalExpense += t.value;
                    
                    // Pega os 7 primeiros caracteres da data (Ex: "2026-03")
                    const monthKey = t.date.substring(0, 7); 
                    if (!groupedByMonth[monthKey]) groupedByMonth[monthKey] = [];
                    groupedByMonth[monthKey].push(t);
                });

                // 3. CONSTRUÇÃO DAS TABELAS SEPARADAS
                const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                let tablesHtml = '';

                // Para cada mês, cria um cabeçalho e uma tabela
                for (const [monthKey, txs] of Object.entries(groupedByMonth)) {
                    const [yearStr, monthStr] = monthKey.split('-');
                    const monthTitle = `${monthNames[parseInt(monthStr) - 1]} de ${yearStr}`;

                    let rowsHtml = '';
                    txs.forEach(t => {
                        const dateStr = formatDate(t.date);
                        const typeLabel = t.type === 'income' ? 'Receita' : (t.type === 'expense' ? 'Despesa' : 'Transferência');
                        const color = t.type === 'income' ? '#188038' : (t.type === 'expense' ? '#d93025' : '#1a73e8');
                        const sign = t.type === 'income' ? '+' : (t.type === 'expense' ? '-' : '');
                        
                        let status = '';
                        if (t.type === 'transfer') {
                            status = 'Transferido';
                        } else if (t.isPaid) {
                            status = 'Pago';
                        } else {
                            const now = new Date();
                            const hojeLocal = getTodayISO();
                            status = (t.date < hojeLocal) ? '<span style="color: #d93025; font-weight: 500;">Vencido</span>' : 'Agendado';
                        }

                        const categoryOrPartner = t.partnerName ? `${t.partnerName} • ${getCategoryNameById(t.category) || 'Outros'}` : (getCategoryNameById(t.category) || 'Outros');

                        // A mágica: encomendamos a linha pronta na nossa fábrica!
                        rowsHtml += criarHtmlLinhaTabelaPDF(dateStr, t.description, categoryOrPartner, typeLabel, status, color, sign, formatCurrency(t.value));
                    });

                    // A mágica: encomendamos a tabela inteira do mês com as linhas dentro!
                    tablesHtml += criarHtmlTabelaMesPDF(monthTitle, rowsHtml);
                }

                const balance = totalIncome - totalExpense;
                const balanceColor = balance >= 0 ? '#188038' : '#d93025';

                const htmlContent = `
                    <div style="width: 800px; padding: 40px 50px 80px 50px; background: #ffffff; color: #202124; font-family: Helvetica, Arial, sans-serif;">
                        <div style="border-bottom: 2px solid #1a73e8; padding-bottom: 24px; margin-bottom: 32px; overflow: hidden;">
                            <div style="float: left;">
                                <h1 style="color: #1a73e8; margin: 0; font-size: 2rem; letter-spacing: 1px;">ControlPess</h1>
                                <p style="color: #5f6368; margin: 4px 0 0 0; font-size: 1.1rem;">Relatório Analítico de Lançamentos</p>
                            </div>
                            <div style="float: right; text-align: right;">
                                <p style="color: #202124; font-weight: 500; margin: 0; font-size: 1.1rem;">${filteredTx.length} lançamento(s)</p>
                                <p style="color: #5f6368; font-size: 0.9rem; margin: 4px 0 0 0;">Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                            </div>
                            <div style="clear: both;"></div>
                        </div>

                        <div style="display: flex; justify-content: space-between; margin-bottom: 32px; gap: 16px; page-break-inside: avoid;">
                            <div style="flex: 1; background: #f8f9fa; padding: 20px; border-radius: 12px; border: 1px solid #e8eaed; text-align: center;">
                                <p style="margin: 0 0 8px 0; color: #5f6368; font-size: 0.95rem;">Receitas no período</p>
                                <h3 style="margin: 0; color: #188038; font-size: 1.5rem;">${formatCurrency(totalIncome)}</h3>
                            </div>
                            <div style="flex: 1; background: #f8f9fa; padding: 20px; border-radius: 12px; border: 1px solid #e8eaed; text-align: center;">
                                <p style="margin: 0 0 8px 0; color: #5f6368; font-size: 0.95rem;">Despesas no período</p>
                                <h3 style="margin: 0; color: #d93025; font-size: 1.5rem;">${formatCurrency(totalExpense)}</h3>
                            </div>
                            <div style="flex: 1; background: #f8f9fa; padding: 20px; border-radius: 12px; border: 1px solid #e8eaed; text-align: center;">
                                <p style="margin: 0 0 8px 0; color: #5f6368; font-size: 0.95rem;">Saldo Final</p>
                                <h3 style="margin: 0; color: ${balanceColor}; font-size: 1.5rem;">${formatCurrency(balance)}</h3>
                            </div>
                        </div>

                        ${tablesHtml}
                        
                    </div>
                `;

                // Configurações do gerador de PDF
                const opt = {
                    // Margens: [Topo, Esquerda, Baixo, Direita] (em polegadas)
                    // Colocamos 0.8 embaixo para proteger o rodapé!
                    margin:       [0.4, 0, 0.8, 0], 
                    filename:     `Relatorio_ControlPess_${new Date().getTime()}.pdf`,
                    image:        { type: 'jpeg', quality: 1 },
                    html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
                    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
                };

                // 4. GERA, INJETA NÚMERO DA PÁGINA NO RODAPÉ E SALVA
                html2pdf().set(opt).from(htmlContent).toPdf().get('pdf').then(function (pdf) {
                    const totalPages = pdf.internal.getNumberOfPages();
                    
                    for (let i = 1; i <= totalPages; i++) {
                        pdf.setPage(i);
                        pdf.setFontSize(9); // Reduzi um pontinho pra ficar mais delicado
                        pdf.setTextColor(150);
                        
                        const textInfo = 'Documento gerado eletronicamente por ControlPess.';
                        const textPage = `Página ${i} de ${totalPages}`;
                        
                        const pageWidth = pdf.internal.pageSize.getWidth();
                        const pageHeight = pdf.internal.pageSize.getHeight();
                        
                        // Posiciona os textos exatamente dentro do espaço em branco da margem inferior (0.8 polegadas)
                        pdf.text(textInfo, pageWidth / 2, pageHeight - 0.5, { align: 'center' });
                        pdf.text(textPage, pageWidth / 2, pageHeight - 0.3, { align: 'center' });
                    }
                }).save().then(() => {
                    downloadReportBtn.innerHTML = originalText;
                    downloadReportBtn.disabled = false;
                    showToast('Relatório baixado com sucesso!', 'success');
                }).catch(err => {
                    console.error("Erro ao gerar PDF: ", err);
                    downloadReportBtn.innerHTML = originalText;
                    downloadReportBtn.disabled = false;
                    showToast('Erro ao gerar relatório.', 'error');
                });
            });
        }

        // ========== MODAL ==========
        const modalOverlay = document.getElementById('modalOverlay');
        const openBtn = document.getElementById('openModalBtn');
        const closeBtn = document.getElementById('closeModalBtn');
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
        const transactionDateInput = document.getElementById('transactionDate'); // O NOVO CAMPO
        const dataInput = document.getElementById('data');
        const pagamentoSelect = document.getElementById('pagamento');
        const transferFields = document.getElementById('transferFields');

        // --- NOVAS VARIÁVEIS E LÓGICA DO BOTÃO PAGO/NÃO PAGO ---
        const transactionPaid = document.getElementById('transactionPaid');
        const paymentStatusLabel = document.getElementById('paymentStatusLabel');
        const transactionPartner = document.getElementById('transactionPartner');
        const paymentDateInput = document.getElementById('paymentDate');

        // --- SINCRONIZA O PAINEL ESQUERDO (badge, valor colorido e pílula de status) ---
        function updateLeftHeroPanel() {
            const isPaid = transactionPaid ? transactionPaid.checked : false;

            const typeConfig = {
                expense:  { label: 'Despesa',       icon: 'arrow_downward', cls: 'expense'  },
                income:   { label: 'Receita',       icon: 'arrow_upward',   cls: 'income'   },
                transfer: { label: 'Transferência', icon: 'swap_horiz',     cls: 'transfer' }
            };
            const cfg = typeConfig[selectedType] || typeConfig.expense;

            // Fundo do painel esquerdo (rosa/verde/azul)
            ['leftPanel', 'leftPanel2'].forEach(id => {
                const panel = document.getElementById(id);
                if (panel) {
                    panel.classList.remove('type-expense', 'type-income', 'type-transfer');
                    panel.classList.add('type-' + cfg.cls);
                }
            });

            // Badge "Despesa / Receita / Transferência"
            ['txTypeBadge', 'txTypeBadge2'].forEach(id => {
                const badge = document.getElementById(id);
                if (badge) {
                    badge.classList.remove('expense', 'income', 'transfer');
                    badge.classList.add(cfg.cls);
                    badge.innerHTML = `<span class="material-icons" style="font-size:0.9rem;">${cfg.icon}</span> ${cfg.label}`;
                }
            });

            // Cor do valor em destaque
            ['heroAmount', 'heroAmount2'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.classList.remove('income', 'transfer');
                    if (cfg.cls !== 'expense') el.classList.add(cfg.cls);
                }
            });

            // Pílula "A pagar" / "Pago"
            ['heroStatusPill', 'heroStatusPill2'].forEach(id => {
                const pill = document.getElementById(id);
                if (pill) {
                    pill.classList.remove('unpaid', 'paid');
                    if (isPaid) {
                        pill.classList.add('paid');
                        pill.innerHTML = '<span class="material-icons" style="font-size:0.85rem;">check_circle</span> Pago';
                    } else {
                        pill.classList.add('unpaid');
                        pill.innerHTML = '<span class="material-icons" style="font-size:0.85rem;">schedule</span> A pagar';
                    }
                }
            });
        }

        if (transactionPaid) {
            transactionPaid.addEventListener('change', function() {
                if (this.checked) {
                    paymentStatusLabel.textContent = 'Pago';
                    paymentStatusLabel.style.color = '#188038'; // Verde
                    paymentStatusLabel.style.fontWeight = 'bold';
                    
                    // MÁGICA: Preenche a data de pagamento com a de hoje se estiver vazia
                    if (paymentDateInput && !paymentDateInput.value) {
                        const now = new Date();
                        paymentDateInput.value = getTodayISO();
                    }
                } else {
                    paymentStatusLabel.textContent = 'Não Pago';
                    paymentStatusLabel.style.color = '#e67e22'; // Laranja
                    paymentStatusLabel.style.fontWeight = 'bold';
                    
                    // MÁGICA: Limpa a data de pagamento, pois voltou a ficar pendente
                    if (paymentDateInput) paymentDateInput.value = '';
                }
                updateLeftHeroPanel();
            });
        }
		
        // --------------------------------------------------------
        const contaOrigem = document.getElementById('contaOrigem');
        const contaDestino = document.getElementById('contaDestino');
		
		// --- FUNÇÃO MÁGICA: VERIFICA SE A CONTA TEM FORMAS DE PAGAMENTO ---
        async function verificarFormasPagamentoConta(selectElement) {
            const accId = selectElement.value;
            if (!accId) return;

            const acc = accounts.find(a => a.id === accId);
            // Se a conta não tem tipos de pagamento ou o array está vazio...
            if (acc && (!acc.acceptedPaymentTypes || acc.acceptedPaymentTypes.length === 0)) {
                
                // Abre o modal inteligente em tom amigável (isDanger = false)
                const irParaConfig = await askConfirmation(
                    'Conta Incompleta',
                    `A conta "${acc.name}" não possui formas de pagamento associadas (Ex: Pix, Dinheiro, Cartão). Configure isso para poder utilizá-la em lançamentos.`,
                    'Configurar Conta',
                    false, 
                    'settings'
                );

                if (irParaConfig) {
                    document.getElementById('modalOverlay').style.display = 'none';
                    resetToStep1();
                    setActiveView('accounts');
                    await delay(300);
                    openAccountModal(accId);
                    await delay(400);
                    const container = document.getElementById('accountPaymentTypesContainer');
                    if (container) {
                        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        container.style.transition = 'all 0.3s ease';
                        container.style.background = 'rgba(26,115,232,0.05)';
                        container.style.boxShadow = '0 0 0 4px rgba(26,115,232,0.3)';
                        container.style.borderRadius = '16px';
                        container.style.padding = '12px';
                        await delay(3000);
                        container.style.boxShadow = '';
                        container.style.background = '';
                        container.style.padding = '';
                    }
                } else {
                    // Se ele clicar em Cancelar, limpamos a caixa de conta para não deixar ele avançar com erro
                    selectElement.value = '';
                    preencherSelectPagamentos(null);
                }
            }
        }

		// ATUALIZA A LISTA DE PAGAMENTOS E CARTÕES QUANDO A CONTA MUDA
		document.getElementById('contaLancamento').addEventListener('change', async function() {
			preencherSelectPagamentos(this.value);
            
            const acc = accounts.find(a => a.id === this.value);
            const cartaoSelect = document.getElementById('cartaoUsado');
            
            // Apenas popula o select, mas NÃO exibe os campos ainda
            if (acc && acc.hasCreditCard && acc.cards && acc.cards.length > 0) {
                cartaoSelect.innerHTML = '<option value="">Selecione o cartão...</option>';
                acc.cards.forEach(card => {
                    cartaoSelect.innerHTML += `<option value="${card.id}">${card.name} (Final ${card.last4})</option>`;
                });
            } else {
                cartaoSelect.innerHTML = '<option value="">Selecione o cartão...</option>';
            }
            
            // Garante que os grupos comecem escondidos ao trocar de conta
            document.getElementById('parcelasCardGroup').style.display = 'none';
            document.getElementById('cartaoGroup').style.display = 'none';
            document.getElementById('parcelasGroup').style.display = 'none';

            // MÁGICA: Dispara a verificação e o modal se necessário
            await verificarFormasPagamentoConta(this);
		});

		document.getElementById('contaOrigem').addEventListener('change', async function() {
			preencherSelectPagamentos(this.value);
            // MÁGICA: Valida a conta de origem nas transferências
            await verificarFormasPagamentoConta(this);
		});

        // MÁGICA EXTRA: Adicionado evento de validação também na Conta de Destino para garantir 100% de segurança
        document.getElementById('contaDestino').addEventListener('change', async function() {
            await verificarFormasPagamentoConta(this);
        });

        // --- NOVA FUNÇÃO: VERIFICA SE DEVE EXIBIR "GERAR COBRANÇA" ---
        window.verificarExibicaoCobranca = function() {
            const containerCobranca = document.getElementById('cobrancaGroupContainer');
            const cobrancaCheckbox = document.getElementById('cobrancaCheckbox');
            const pagamentoSelect = document.getElementById('pagamento');
            const transactionPaidEl = document.getElementById('transactionPaid');
            
            if (!containerCobranca || !transactionPaidEl) return;
            
            const isPaid = transactionPaidEl.checked;

            if (pagamentoSelect.selectedIndex >= 0) {
                const textoSelecionado = pagamentoSelect.options[pagamentoSelect.selectedIndex].text.toLowerCase();
                const textoNormalizado = textoSelecionado.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                
                // Regra Mestra: Tem que ser Receita + Pendente (Não Pago) + Forma de Pagamento que contenha 'pix'
                if (selectedType === 'income' && !isPaid && textoNormalizado.includes('pix')) {
                    containerCobranca.style.display = 'flex';
                } else {
                    containerCobranca.style.display = 'none';
                    cobrancaCheckbox.checked = false; // Desmarca por segurança se esconder
                }
            } else {
                containerCobranca.style.display = 'none';
                cobrancaCheckbox.checked = false;
            }
        };

        // Monitora as viradas de chave do "Pago / Não Pago"
        const transactionPaidWatcher = document.getElementById('transactionPaid');
        if (transactionPaidWatcher) {
            transactionPaidWatcher.addEventListener('change', window.verificarExibicaoCobranca);
        }

        // EXIBE A OPÇÃO DE BOLETO, PARCELAMENTO, CARTÃO E COBRANÇA DE FORMA INDEPENDENTE
        document.getElementById('pagamento').addEventListener('change', function() {
            if(this.selectedIndex < 0) return; // Segurança extra
            
            const textoSelecionado = this.options[this.selectedIndex].text.toLowerCase();
            // A MÁGICA: Remove os acentos para evitar bugs (ex: Crédito vs Credito)
            const textoNormalizado = textoSelecionado.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            window.verificarExibicaoCobranca(); // Dispara o detetive da cobrança

            const containerBoleto = document.getElementById('boletoGroupContainer');
            const checkBoleto = document.getElementById('boletoCheckbox');
            const campoLinha = document.getElementById('boletoFieldGroup');

            // --- LÓGICA DO BOLETO ---
            if (textoNormalizado.includes('boleto')) {
                containerBoleto.style.display = 'flex';
            } else {
                containerBoleto.style.display = 'none';
                checkBoleto.checked = false;
                campoLinha.style.display = 'none';
                document.getElementById('boletoLine').value = '';
                const scanStatus = document.getElementById('scanStatus');
                if (scanStatus) scanStatus.style.display = 'none'; 
            }

            // --- LÓGICA INTELIGENTE (PARCELAS VS CARTÃO) ---
            const ptId = this.value;
            const pt = paymentTypes.find(p => p.id === ptId);
            
            const parcelasCardGroup = document.getElementById('parcelasCardGroup');
            const parcelasGroup = document.getElementById('parcelasGroup');
            const cartaoGroup = document.getElementById('cartaoGroup');
            
            const parcelasSelect = document.getElementById('parcelas');
            const cartaoSelect = document.getElementById('cartaoUsado');

            let mostrarParcelas = false;
            let mostrarCartao = false;

            // 1. O tipo de pagamento permite parcelar?
            // MÁGICA: Oculte o parcelamento na edição para evitar duplicação de parcelas no banco!
            if (pt && pt.allowsInstallments && (selectedType === 'expense' || selectedType === 'income') && !editingTransactionId) {
                mostrarParcelas = true;
                
                // Constrói as opções começando pela VAZIA
                parcelasSelect.innerHTML = '<option value="" disabled selected>Selecione...</option>';
                parcelasSelect.innerHTML += '<option value="1">À vista (1x)</option>';
                
                for (let i = 2; i <= (pt.maxInstallments || 12); i++) {
                    parcelasSelect.innerHTML += `<option value="${i}">${i}x parcelado</option>`;
                }

                // SOLUÇÃO DEFINITIVA: Sempre que a forma de pagamento mudar, FORÇA o campo a nascer vazio (índice 0).
                // Se for a abertura de uma edição, o motor principal do modal injetará o valor salvo logo em seguida.
                parcelasSelect.selectedIndex = 0;
            } else {
                parcelasSelect.value = '1';
            }

            // 2. É um Cartão de Crédito? (Aceita "credito" ou "cartao" sem acento)
            if ((textoNormalizado.includes('credito') || textoNormalizado.includes('cartao')) && selectedType === 'expense') {
                mostrarCartao = true;
                // Importante: NÃO resetamos o select de cartão aqui para preservar a escolha ao Editar.
                // O reset de segurança já acontece na função `resetToStep1()` quando a tela abre.
            } else {
                if (cartaoSelect) cartaoSelect.value = "";
            }

            // 3. Aplica a visibilidade na tela
                parcelasGroup.style.display = mostrarParcelas ? 'block' : 'none';
                cartaoGroup.style.display = mostrarCartao ? 'block' : 'none';
                
                // O container pai aparece se pelo menos um dos dois for ativado
                parcelasCardGroup.style.display = (mostrarParcelas || mostrarCartao) ? 'flex' : 'none';

                // Dispara a verificação da recorrência que criamos no Passo 2!
                if(parcelasSelect) parcelasSelect.dispatchEvent(new Event('change'));

                updateReceiptPreview(); 

                // --- MÁGICA DO AUTO-FOCO E SCROLL ---
                // Aguarda um breve instante para o navegador "desenhar" os campos na tela e rola suavemente até eles
                setTimeout(() => {
                    // MÁGICA: Prioridade 1 é a Parcela. Se houver, foca nela primeiro.
                    if (mostrarParcelas && parcelasSelect) {
                        parcelasSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        parcelasSelect.focus();
                    } 
                    // Prioridade 2 é o Cartão.
                    else if (mostrarCartao && cartaoSelect) {
                        cartaoSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        cartaoSelect.focus();
                    } 
                    // Prioridade 3 é o Boleto.
                    else if (textoNormalizado.includes('boleto') && containerBoleto) {
                        containerBoleto.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        checkBoleto.focus();
                    }
                }, 150);
            });

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

        let currentStep = 1;
        let selectedType = 'expense';

        function formatarMoeda(valor) {
            // O String() garante que nunca dará erro, mesmo se o valor vier quebrado
            const digits = String(valor).replace(/\D/g, '');
            const number = parseInt(digits) / 100;
            if (isNaN(number)) return '';
            return number.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }

        function valorParaNumero(valorFormatado) {
            if (!valorFormatado) return 0;
            // Remove tudo que não for dígito ou vírgula (ignora R$, espaços, pontos)
            let apenasNumeros = String(valorFormatado).replace(/[^\d,]/g, '');
            // Troca a vírgula decimal por ponto para o JavaScript conseguir calcular
            apenasNumeros = apenasNumeros.replace(',', '.');
            return parseFloat(apenasNumeros) || 0;
        }

        valorInput.addEventListener('input', function(e) {
            let value = e.target.value;
            let rawValue = value.replace(/\D/g, '');
            if (rawValue.length === 0) {
                e.target.value = '';
                return;
            }
            if (rawValue.length > 15) rawValue = rawValue.slice(0, 15);
            e.target.value = formatarMoeda(rawValue);
			// Espelha no painel esquerdo
            const display = e.target.value.replace('R$', '').trim() || '0,00';
            ['heroAmount','heroAmount2'].forEach(id => {
                const a = document.getElementById(id); if (a) a.textContent = display;
            });
        });

        valorInput.addEventListener('blur', function(e) {
            if (!e.target.value) {
                e.target.value = 'R$ 0,00';
            }
        });

        const btnAbrirLancamento = document.getElementById('openModalBtn');
        if (btnAbrirLancamento) {
            btnAbrirLancamento.addEventListener('click', async () => {
                await Promise.all([
                    fetchCategories(),
                    fetchPaymentTypes(),
                    loadPartners(), 
					loadAccounts() 
                ]);

                preencherSelectCategorias();
                preencherSelectPagamentos();
				preencherSelectContas();

                const selectPartner = document.getElementById('transactionPartner');
                if (selectPartner) {
                    selectPartner.innerHTML = '<option value="">Selecione um parceiro...</option>';
                    partners.filter(p => p.active !== false)
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .forEach(p => {
                        const opt = document.createElement('option');
                        opt.value = p.id;
                        opt.textContent = p.name;
                        selectPartner.appendChild(opt);
                    });
                }

                resetToStep1();
                document.getElementById('modalOverlay').style.display = 'flex';
                document.getElementById('modalOverlay').classList.add('open');
            });
        }

        function closeDrawer() {
            const card = modalOverlay.querySelector('.modal-card');
            if (card) {
                card.style.animation = 'slideOutRight 0.22s cubic-bezier(0.32, 0.72, 0, 1) forwards';
                setTimeout(() => {
                    modalOverlay.style.display = 'none';
                    modalOverlay.classList.remove('open');
                    card.style.animation = '';
                    resetToStep1();
                }, 210);
            } else {
                modalOverlay.style.display = 'none';
                resetToStep1();
            }
        }

        closeBtn.addEventListener('click', closeDrawer);

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeDrawer();
        });

        typeExpense.addEventListener('click', () => setType('expense'));
        typeIncome.addEventListener('click', () => setType('income'));
        typeTransfer.addEventListener('click', () => setType('transfer'));

        function setType(type) {
            selectedType = type;
            preencherSelectCategorias(); // <--- GATILHO MÁGICO: Atualiza as categorias na mesma hora!

            [typeExpense, typeIncome, typeTransfer].forEach(el => {
                el.classList.remove('selected', 'expense', 'income', 'transfer');
            });
            if (type === 'expense') {
                typeExpense.classList.add('selected', 'expense');
            } else if (type === 'income') {
                typeIncome.classList.add('selected', 'income');
            } else {
                typeTransfer.classList.add('selected', 'transfer');
            }

            valorInput.classList.remove('expense', 'income', 'transfer');
            if (type === 'expense') {
                valorInput.classList.add('expense');
            } else if (type === 'income') {
                valorInput.classList.add('income');
            } else if (type === 'transfer') {
                valorInput.classList.add('transfer');
            }

            const labelConta = document.querySelector('label[for="contaLancamento"]');
            const labelOrigem = document.querySelector('label[for="contaOrigem"]');
            const labelDestino = document.querySelector('label[for="contaDestino"]');

            if (type === 'transfer') {
                transferFields.classList.add('visible');
                document.getElementById('contaLancamentoGroup').style.display = 'none'; // Esconde conta única
                
                // Setas para Transferência
                labelOrigem.innerHTML = 'Conta de origem <span class="material-icons" style="color: #d93025; font-size: 1.1rem; vertical-align: text-bottom;">arrow_downward</span> *';
                labelDestino.innerHTML = 'Conta de destino <span class="material-icons" style="color: #1a73e8; font-size: 1.1rem; vertical-align: text-bottom;">arrow_upward</span> *';
            } else {
                transferFields.classList.remove('visible');
                document.getElementById('contaLancamentoGroup').style.display = 'block'; // Mostra conta única
                
                // Setas para Despesa ou Receita
                if (type === 'expense') {
                    labelConta.innerHTML = 'Conta Financeira <span class="material-icons" style="color: #d93025; font-size: 1.1rem; vertical-align: text-bottom;">arrow_downward</span> *';
                } else if (type === 'income') {
                    labelConta.innerHTML = 'Conta Financeira <span class="material-icons" style="color: #188038; font-size: 1.1rem; vertical-align: text-bottom;">arrow_upward</span> *';
                }
            }

            // --- TRAVAR BOTÃO EM "PAGO" SE FOR TRANSFERÊNCIA ---
            if (transactionPaid && paymentStatusLabel) {
                if (type === 'transfer') {
                    transactionPaid.checked = true;
                    transactionPaid.disabled = true; // Trava o clique
                    paymentStatusLabel.textContent = 'Pago';
                    paymentStatusLabel.style.color = '#188038';
                } else {
                    transactionPaid.disabled = false; // Destrava
                    if(transactionPaid.checked) {
                        paymentStatusLabel.textContent = 'Pago';
                        paymentStatusLabel.style.color = '#188038';
                    } else {
                        paymentStatusLabel.textContent = 'Não Pago';
                        paymentStatusLabel.style.color = '#e67e22';
                    }
                }
            }
            // ----------------------------------------------------

            if (typeof window.verificarExibicaoCobranca === 'function') {
                window.verificarExibicaoCobranca();
            }

            updateLeftHeroPanel();
            updateReceiptPreview();
        }

        // --- MÁGICA 2: Ocultar Recorrência se for Parcelado ---
        if (document.getElementById('parcelas')) {
            document.getElementById('parcelas').addEventListener('change', function() {
                const recGroup = recorrenteCheckbox.parentElement;
                
                // Se a parcela for maior que 1, a recorrência perde o sentido e deve sumir
                if (parseInt(this.value) > 1) {
                    recGroup.style.display = 'none';
                    recorrenteCheckbox.checked = false; // Desmarca por segurança
                    recurrenceFields.classList.remove('visible');
                } else {
                    recGroup.style.display = 'flex'; // Volta a exibir a opção
                }
                updateReceiptPreview();
            });
        }

        recorrenteCheckbox.addEventListener('change', function() {
            if (this.checked) {
                recurrenceFields.classList.add('visible');
            } else {
                recurrenceFields.classList.remove('visible');
            }
            updateReceiptPreview();
        });

        terminoTipoSelect.addEventListener('change', function() {
            if (this.value === 'until') {
                terminoDataGroup.style.display = 'block';
                terminoCountGroup.style.display = 'none';
            } else if (this.value === 'count') {
                terminoDataGroup.style.display = 'none';
                terminoCountGroup.style.display = 'block';
            } else {
                terminoDataGroup.style.display = 'none';
                terminoCountGroup.style.display = 'none';
            }
            updateReceiptPreview();
        });

        function getRecurrenceText() {
            if (!recorrenteCheckbox.checked) return null;
            const freqMap = { daily: 'dia', weekly: 'semana', monthly: 'mês', yearly: 'ano' };
            const freq = frequenciaSelect.value;
            const intervalo = intervaloInput.value || 1;
            let base = `A cada ${intervalo} ${freqMap[freq]}${intervalo > 1 ? 's' : ''}`;
            const terminoTipo = terminoTipoSelect.value;
            if (terminoTipo === 'until') {
                const data = terminoDataInput.value;
                base += ` até ${data ? new Date(data).toLocaleDateString('pt-BR') : '___'}`;
            } else if (terminoTipo === 'count') {
                const count = terminoCountInput.value || 1;
                base += `, ${count} vez(es)`;
            } else {
                base += ' (indefinidamente)';
            }
            return base;
        }

        function updateReceiptPreview() {
            const type = selectedType;
            let icon = 'receipt';
            
            // O título muda dinamicamente: Etapa 3 = Resumo | Etapa 4 = Comprovante
            let title = currentStep === 4 ? 'Comprovante de ' : 'Resumo para Conferência';
            
            // Configurações base do cabeçalho e cor dos ícones
            if (type === 'expense') {
                icon = 'arrow_downward';
                if (currentStep === 4) title += 'Despesa';
            } else if (type === 'income') {
                icon = 'arrow_upward';
                if (currentStep === 4) title += 'Receita';
            } else {
                icon = 'swap_horiz';
                if (currentStep === 4) title += 'Transferência';
            }
            receiptIcon.textContent = icon;
            receiptIcon.style.color = ''; // remove cor inline antiga, quem manda agora é a classe
            receiptTitle.textContent = title;

            // Sincroniza as cores do círculo do ícone e do valor com o tipo (despesa/receita/transferência)
            const receiptTypeClass = type === 'expense' ? '' : type; // expense usa o estilo padrão (vermelho)
            receiptHeaderIcon.classList.remove('income', 'transfer');
            receiptValor.classList.remove('income', 'transfer');
            if (receiptTypeClass) {
                receiptHeaderIcon.classList.add(receiptTypeClass);
                receiptValor.classList.add(receiptTypeClass);
            }

            // Valor
            const valor = valorParaNumero(valorInput.value);
            receiptValor.textContent = formatCurrency(valor);

            // Descrição e Categoria
            receiptDescricao.textContent = descricaoInput.value.trim() || '(não informado)';
            const categoriaText = categoriaSelect.options[categoriaSelect.selectedIndex]?.text || '-';
            receiptCategoria.textContent = categoriaText;

            // NOVO: Parceiro
            const parceiroText = transactionPartner && transactionPartner.selectedIndex > 0 
                                 ? transactionPartner.options[transactionPartner.selectedIndex].text 
                                 : '-';
            const receiptParceiro = document.getElementById('receiptParceiro');
            if (receiptParceiro) receiptParceiro.textContent = parceiroText;

            // Conta e Transferência no Recibo
            const contaLancamentoEl = document.getElementById('contaLancamento');
            if (type === 'transfer') {
                receiptOrigemRow.style.display = 'flex';
                receiptDestinoRow.style.display = 'flex';
                document.getElementById('receiptContaRow').style.display = 'none';
                
                receiptOrigem.textContent = contaOrigem.options[contaOrigem.selectedIndex]?.text.split(' (')[0] || '-';
                receiptDestino.textContent = contaDestino.options[contaDestino.selectedIndex]?.text.split(' (')[0] || '-';
                if(document.getElementById('receiptParceiroRow')) document.getElementById('receiptParceiroRow').style.display = 'none';
            } else {
                receiptOrigemRow.style.display = 'none';
                receiptDestinoRow.style.display = 'none';
                document.getElementById('receiptContaRow').style.display = 'flex';
                
                document.getElementById('receiptConta').textContent = contaLancamentoEl.options[contaLancamentoEl.selectedIndex]?.text.split(' (')[0] || '-';
                if(document.getElementById('receiptParceiroRow')) document.getElementById('receiptParceiroRow').style.display = 'flex';
            }

            // --- FUNÇÃO EMBUTIDA: CÁLCULO DA FATURA (DELEGADA PARA GLOBAL) ---
            // Usa a função global calcDueDate definida no início do arquivo

            // --- INTELIGÊNCIA DAS DATAS (Cartão x Dinheiro) ---
            const dataLancamento = transactionDateInput && transactionDateInput.value ? new Date(transactionDateInput.value + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
            const receiptTransactionDate = document.getElementById('receiptTransactionDate');
            if (receiptTransactionDate) receiptTransactionDate.textContent = dataLancamento;

            let vDataVencimento = dataInput.value;
            let vDataPagamento = paymentDateInput && paymentDateInput.value ? paymentDateInput.value : '';
            let isCardSelected = false;
            let isPrepaidSelected = false; // NOVA TRAVA PARA PRÉ-PAGO

            const cartaoSelectPreview = document.getElementById('cartaoUsado');
            const contaLancPreview = document.getElementById('contaLancamento');

            // Se for Crédito: Vencimento vira o dia da fatura, e pagamento fica vazio!
            if (selectedType === 'expense' && cartaoSelectPreview && cartaoSelectPreview.value && contaLancPreview.value) {
                const acc = accounts.find(a => a.id === contaLancPreview.value);
                if (acc && acc.cards) {
                    const card = acc.cards.find(c => c.id === cartaoSelectPreview.value);
                    if (card) {
                        isCardSelected = true;
                        if (!card.isPrepaid) {
                            const dataBaseParaCalculo = (transactionDateInput && transactionDateInput.value) ? transactionDateInput.value : dataInput.value;
                            // CORREÇÃO: Se for edição, exibe no resumo a data que você selecionou no campo da tela
                            vDataVencimento = editingTransactionId ? dataInput.value : calcDueDate(dataBaseParaCalculo, card.closingDay || 1, card.dueDay || 10);
                            
                            // MÁGICA: Só apaga a data visualmente se a fatura AINDA NÃO foi paga.
                            // Se já estiver como "Pago", ele preserva a data exata do pagamento.
                            if (!transactionPaid.checked) {
                                vDataPagamento = ''; 
                            }
                        } else {
                            isPrepaidSelected = true;
                            // PRÉ-PAGO: Descontado e pago na hora da compra!
                            const dataBaseParaCalculo = (transactionDateInput && transactionDateInput.value) ? transactionDateInput.value : dataInput.value;
                            vDataVencimento = dataBaseParaCalculo;
                            vDataPagamento = dataBaseParaCalculo;
                        }
                    }
                }
            }

            // Escreve as novas datas na tela
            receiptData.textContent = vDataVencimento ? new Date(vDataVencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
            const receiptDataPagamento = document.getElementById('receiptDataPagamento');
            if (receiptDataPagamento) receiptDataPagamento.textContent = vDataPagamento ? new Date(vDataPagamento + 'T12:00:00').toLocaleDateString('pt-BR') : '-';

            // --- NOVO: Parcelas e Cartão no Resumo ---
            // Usamos parseInt para garantir que a quantidade de parcelas seja tratada como número para a divisão
            const qtdParcelas = document.getElementById('parcelas') ? parseInt(document.getElementById('parcelas').value) || 1 : 1;
            const receiptParcelasRow = document.getElementById('receiptParcelasRow');
            const receiptParcelas = document.getElementById('receiptParcelas');
            
            if (receiptParcelasRow && qtdParcelas > 1) {
                receiptParcelasRow.style.display = 'flex';
                // MÁGICA: Pega o valor total da variável 'valor' lá do topo da função e divide pelas parcelas!
                const valorParcela = valor / qtdParcelas;
                receiptParcelas.textContent = `${qtdParcelas}x de ${formatCurrency(valorParcela)}`;
            } else if (receiptParcelasRow) {
                receiptParcelasRow.style.display = 'none';
            }

            const cartaoSelect = document.getElementById('cartaoUsado');
            const receiptCartaoRow = document.getElementById('receiptCartaoRow');
            const receiptCartao = document.getElementById('receiptCartao');
            if (receiptCartaoRow && cartaoSelect && cartaoSelect.value) {
                receiptCartaoRow.style.display = 'flex';
                receiptCartao.textContent = cartaoSelect.options[cartaoSelect.selectedIndex].text;
            } else if (receiptCartaoRow) {
                receiptCartaoRow.style.display = 'none';
            }

            // Forma de pagamento
            const pagamentoText = pagamentoSelect.options[pagamentoSelect.selectedIndex]?.text || '-';
            receiptPagamento.textContent = pagamentoText;

            // Recorrência
            if (recorrenteCheckbox.checked) {
                receiptRecorrenciaRow.style.display = 'flex';
                receiptRecorrencia.textContent = getRecurrenceText() || 'Configuração inválida';
            } else {
                receiptRecorrenciaRow.style.display = 'none';
            }

            // --- EXIBIÇÃO DA SITUAÇÃO (PAGO/PENDENTE) NA ETAPA 3 ---
            let isPaid = transactionPaid ? transactionPaid.checked : true;
            if (isCardSelected && !editingTransactionId) {
                isPaid = isPrepaidSelected ? true : false; // Apenas NOVO lançamento de cartão normal nasce pendente. Pré-pago nasce pago.
            }

            const receiptSituacao = document.getElementById('receiptSituacao');
            if (receiptSituacao) {
                if (type === 'transfer') {
                    receiptSituacao.textContent = 'Transferido';
                    receiptSituacao.style.color = '#1a73e8'; // Azul
                } else if (isPaid) {
                    receiptSituacao.textContent = type === 'expense' ? 'Pago' : 'Recebido';
                    receiptSituacao.style.color = '#188038'; // Verde
                } else {
                    receiptSituacao.textContent = type === 'expense' ? 'A Pagar' : 'A Receber';
                    receiptSituacao.style.color = '#e67e22'; // Laranja
                }
                receiptSituacao.style.fontWeight = 'bold';
            }

            // --- LÓGICA DINÂMICA DE STATUS (Pago / Agendado) ---
            const statusIcon = receiptStatus.querySelector('.material-icons');
            let statusText = '';
            
            // Limpa qualquer classe antiga antes de aplicar a nova
            receiptStatus.className = 'receipt-status';

            // NOVO: Detetive de Parcelas (Procura por "(1/12)", "(2/5)", etc. na descrição)
            let parcelaInfo = '';
            const descAtual = descricaoInput.value.trim();
            const descMatch = descAtual.match(/\((\d+\/\d+)\)$/);
            
            if (descMatch) {
                // Ajustado para mostrar " - Parcela (X/Y)"
                parcelaInfo = ` - Parcela ${descMatch[0]}`; 
            } else if (typeof editingTransactionId !== 'undefined' && !editingTransactionId) {
                // Para novos lançamentos, mostra que será a parcela 1 de X
                const qtdParcelas = document.getElementById('parcelas') ? parseInt(document.getElementById('parcelas').value) : 1;
                if (qtdParcelas > 1) {
                    parcelaInfo = ` - Parcela (1/${qtdParcelas})`;
                }
            }

            if (type === 'transfer') {
                statusText = 'Transferência realizada';
                statusIcon.textContent = 'check_circle';
                receiptStatus.classList.add('status-transfer');
            } else {
                if (isPaid) {
                    statusText = type === 'expense' ? `Despesa paga${parcelaInfo}` : `Receita recebida${parcelaInfo}`;
                    statusIcon.textContent = 'check_circle';
                    receiptStatus.classList.add('status-confirmed');
                } else {
                    const now = new Date();
                    const hojeLocal = getTodayISO();
                    const tDate = dataInput.value;

                    if (tDate && tDate < hojeLocal) {
                        statusText = type === 'expense' ? `Despesa vencida${parcelaInfo}` : `Receita atrasada${parcelaInfo}`;
                        statusIcon.textContent = 'error_outline';
                        receiptStatus.classList.add('status-overdue');
                    } else {
                        statusText = type === 'expense' ? `Despesa agendada${parcelaInfo}` : `Receita agendada${parcelaInfo}`;
                        statusIcon.textContent = 'schedule';
                        receiptStatus.classList.add('status-scheduled');
                    }
                }
            }
            receiptStatusText.textContent = statusText;

            // --- NOVO: LÓGICA DO BOTÃO "VER PARCELAS" ---
            const verParcelasContainer = document.getElementById('receiptVerParcelasContainer');
            const listaParcelasExtrato = document.getElementById('listaParcelasExtrato');
            
            if (verParcelasContainer) {
                if (listaParcelasExtrato) listaParcelasExtrato.style.display = 'none';
                
                let txEditada = null;
                if (editingTransactionId) {
                    txEditada = transactions.find(t => t.id === editingTransactionId);
                }

                // Verifica se a transação tem o nosso novo ID de Grupo! Muito mais seguro.
                if (txEditada && txEditada.installmentGroupId) {
                    verParcelasContainer.style.display = 'flex';
                    const btnVerParcelas = document.getElementById('btnVerParcelas');
                    
                    // Salva APENAS o ID do grupo no botão. Muito mais limpo!
                    btnVerParcelas.dataset.groupId = txEditada.installmentGroupId;
                    
                    btnVerParcelas.innerHTML = '<span class="material-icons">list_alt</span> Ver todas as parcelas';
                } else {
                    verParcelasContainer.style.display = 'none';
                }
            }
			
			// --- LÓGICA INTELIGENTE DO QR CODE PIX NO COMPROVANTE ---
            const receiptQrContainer = document.getElementById('receiptQrContainer');
            const receiptQrBox = document.getElementById('receiptQrBox');
            const receiptQrKeyText = document.getElementById('receiptQrKeyText');
            
            if (receiptQrContainer && receiptQrBox && receiptQrKeyText) {
                receiptQrContainer.style.display = 'none'; // Esconde por padrão
                receiptQrBox.innerHTML = ''; // Limpa o QR anterior

                // REGRA: Não pago (!isPaid), Despesa (expense) E Forma de Pagamento contém "Pix"
                if (!isPaid && type === 'expense' && pagamentoText.toLowerCase().includes('pix')) {
                    const partnerId = transactionPartner && transactionPartner.value;
                    if (partnerId) {
                        const partner = partners.find(p => p.id === partnerId);
                        
                        if (partner) {
                            let pixKey = '';
                            let pixType = '';
                            
                            // Verifica qual chave PIX o parceiro tem ativa
                            if (partner.docIsPix && partner.document) { pixKey = partner.document; pixType = 'Documento'; }
                            else if (partner.phoneIsPix && partner.phone) { pixKey = partner.phone; pixType = 'Celular'; }
                            else if (partner.emailIsPix && partner.email) { pixKey = partner.email; pixType = 'E-mail'; }
                            else if (partner.randomPixIsPix && partner.randomPix) { pixKey = partner.randomPix; pixType = 'Aleatória'; }

                            // Se encontrou uma chave válida, invoca o Motor do PIX!
                            if (pixKey) {
                                const payload = gerarPayloadPix(pixKey, partner.name, pixType);
                                
                                if (typeof QRCode !== 'undefined') {
                                    new QRCode(receiptQrBox, {
                                        text: payload,
                                        width: 140,
                                        height: 140,
                                        colorDark : "#202124", 
                                        colorLight : "#ffffff",
                                        correctLevel : QRCode.CorrectLevel.M
                                    });
                                    
                                    // Exibe a chave abaixo da imagem e revela a caixa
                                    receiptQrKeyText.textContent = `Chave: ${pixKey}`;
                                    receiptQrContainer.style.display = 'flex';
                                }
                            }
                        }
                    }
                }
            }
            // ---------------------------------------------------

            updatePrivacyMode();
        }

        function goToStep(step) {
            if (step < 1 || step > 4) return;
            
            // Avisa o sistema em qual etapa estamos PRIMEIRO
            currentStep = step; 
            
            stepContents.forEach(content => content.classList.remove('active'));
            
            // Controle de Exibição
            const stepIndicator = document.getElementById('stepIndicator');
            
            if (step <= 3) {
                document.getElementById(`step${step}`).classList.add('active');
                if(document.getElementById('receiptStatusContainer')) {
                    document.getElementById('receiptStatusContainer').style.display = 'none';
                }
                if (stepIndicator) stepIndicator.style.display = 'flex'; // Mostra as barras na criação/edição
            } else if (step === 4) {
                document.getElementById('step3').classList.add('active'); 
                if(document.getElementById('receiptStatusContainer')) {
                    document.getElementById('receiptStatusContainer').style.display = 'block';
                }
                if (stepIndicator) stepIndicator.style.display = 'none'; // Esconde as barras no comprovante
            }

            // Atualiza circles, connectors e labels do stepper premium
            steps.forEach((s, index) => {
                const stepNum = index + 1;
                s.classList.remove('active', 'done');
                if (stepNum < step) s.classList.add('done');
                else if (stepNum === step) s.classList.add('active');
            });

            // Atualiza connectors
            [1, 2].forEach(i => {
                const conn = document.getElementById(`conn${i}`);
                if (conn) {
                    conn.classList.toggle('done', step > i);
                }
            });

            // Atualiza labels
            [1, 2, 3].forEach(i => {
                const lbl = document.getElementById(`stepLabel${i}`);
                if (lbl) {
                    lbl.classList.remove('active', 'done');
                    if (i < step) lbl.classList.add('done');
                    else if (i === step) lbl.classList.add('active');
                }
            });

            // Controle dos Botões do Rodapé e do Topo
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            const finalActionsLeft = document.getElementById('finalActionsLeft');
            const finalActionsRight = document.getElementById('finalActionsRight');
            const topActionsRight = document.getElementById('topActionsRight'); // <--- Nova bandeja superior
            
            const editWarning = document.getElementById('receiptEditWarning');
            const editFinalBtn = document.getElementById('editFinalBtn');
            const reversePaymentBtn = document.getElementById('reversePaymentBtn');
            const payFinalBtn = document.getElementById('payFinalBtn');

            if (step < 4) {
                if(prevBtn) prevBtn.style.display = 'inline-block';
                if(nextBtn) {
                    nextBtn.style.display = 'inline-block';
                    nextBtn.disabled = false; 
                    nextBtn.textContent = (step === 3) ? 'Salvar lançamento' : 'Continuar';
                }
                if(prevBtn) prevBtn.disabled = (step === 1);
                
                if(finalActionsLeft) finalActionsLeft.style.display = 'none';
                if(finalActionsRight) finalActionsRight.style.display = 'none';
                if(topActionsRight) topActionsRight.style.display = 'none'; // Esconde os ícones
                if(editWarning) editWarning.style.display = 'none';
            } else {
                // Etapa 4 (Visualização com Design Elegante)
                if(prevBtn) prevBtn.style.display = 'none';
                if(nextBtn) nextBtn.style.display = 'none';
                
                if(finalActionsLeft) finalActionsLeft.style.display = 'flex';
                if(finalActionsRight) finalActionsRight.style.display = 'flex';
                if(topActionsRight) topActionsRight.style.display = 'flex'; // Acende os ícones no topo!

                // --- CONTROLE DE EXIBIÇÃO DO BOTÃO DE REIMPRESSÃO DA COBRANÇA ---
                const downloadCobrancaBtn = document.getElementById('downloadCobrancaFooterBtn');
                if (downloadCobrancaBtn) {
                    let exibirBtnCobranca = false;
                    if (editingTransactionId) {
                        const txAtual = transactions.find(t => t.id === editingTransactionId);
                        if (txAtual && txAtual.isCobranca) exibirBtnCobranca = true;
                    } else {
                        const cobrancaCheck = document.getElementById('cobrancaCheckbox');
                        if (cobrancaCheck && cobrancaCheck.checked) exibirBtnCobranca = true;
                    }
                    downloadCobrancaBtn.style.display = exibirBtnCobranca ? 'inline-block' : 'none';
                }

                // Lógica de Travar Edição se estiver Pago
                let usaCartaoCredito = false;
                const cartaoInput = document.getElementById('cartaoUsado');
                const contaInput = document.getElementById('contaLancamento');
                
                // Verifica com segurança se um cartão foi escolhido
                if (selectedType === 'expense' && cartaoInput && cartaoInput.value && contaInput && contaInput.value) {
                    const acc = accounts.find(a => a.id === contaInput.value);
                    if (acc && acc.cards) {
                        const card = acc.cards.find(c => c.id === cartaoInput.value);
                        if (card && !card.isPrepaid) usaCartaoCredito = true;
                    }
                }
                
                // CORREÇÃO: Respeita o status real de 'isPaid' se estivermos editando um lançamento já existente!
                let isPaid = transactionPaid ? transactionPaid.checked : true;
                if (usaCartaoCredito && !editingTransactionId) {
                    isPaid = false; // Apenas novos lançamentos de cartão de crédito nascem obrigatoriamente pendentes
                }
                
                if (isPaid) {
                    if(editWarning) editWarning.style.display = 'flex';
                    if(editFinalBtn) editFinalBtn.style.display = 'none';
                    if(reversePaymentBtn) reversePaymentBtn.style.display = 'inline-block';
                    if(payFinalBtn) payFinalBtn.style.display = 'none';
                } else {
                    if(editWarning) editWarning.style.display = 'none';
                    if(editFinalBtn) editFinalBtn.style.display = 'flex'; // Usando flex para centralizar o ícone
                    if(reversePaymentBtn) reversePaymentBtn.style.display = 'none';
                    if(payFinalBtn) payFinalBtn.style.display = 'inline-block';
                }
            }

            if (step >= 3) updateReceiptPreview();
        }

        // --- AÇÕES DOS NOVOS BOTÕES CRUD DA ETAPA 4 ---
        const editFinalBtn = document.getElementById('editFinalBtn');
        if (editFinalBtn) {
            editFinalBtn.addEventListener('click', () => {
                document.getElementById('modalTitle').textContent = 'Editar lançamento';
                goToStep(1); // Libera o usuário para a etapa inicial!
            });
        }
		
		// --- AÇÃO DO BOTÃO "REIMPRIMIR COBRANÇA" NO TOPO DO MODAL ---
        const downloadCobrancaFooterBtn = document.getElementById('downloadCobrancaFooterBtn');
        if (downloadCobrancaFooterBtn) {
            downloadCobrancaFooterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                let listaParaPDF = [];
                
                if (editingTransactionId) {
                    const txAtual = transactions.find(t => t.id === editingTransactionId);
                    if (txAtual) {
                        // Se for parcelado, busca o grupo inteiro para a fatura vir unificada
                        if (txAtual.installmentGroupId) {
                            listaParaPDF = transactions.filter(t => t.installmentGroupId === txAtual.installmentGroupId);
                            listaParaPDF.sort((a, b) => new Date(a.date) - new Date(b.date));
                        } else {
                            listaParaPDF = [txAtual];
                        }
                    }
                }
                
                if (listaParaPDF.length > 0) {
                    window.gerarFaturaCobrancaPDF(listaParaPDF);
                } else {
                    showToast('Não foi possível recuperar os dados da cobrança para reimpressão.', 'warning');
                }
            });
        }
		
		// --- AÇÃO DO BOTÃO "EXCLUIR" NO TOPO DO MODAL ---
        const deleteFinalBtn = document.getElementById('deleteFinalBtn');
        if (deleteFinalBtn) {
            deleteFinalBtn.addEventListener('click', async () => {
                if (!editingTransactionId) return;
                
                const isConfirmed = await askConfirmation(
                    'Excluir Lançamento', 
                    'Tem certeza que deseja excluir este lançamento permanentemente?', 
                    'Excluir', 
                    true, 
                    'delete_outline'
                );

                if (isConfirmed) {
                    // Contabilidade: Reverte o saldo antes de apagar!
                    const txToDel = transactions.find(t => t.id === editingTransactionId);
                    if (txToDel) await processAccountBalance(txToDel, 'revert');

                    await deleteTransaction(editingTransactionId);
                    showToast('Lançamento excluído com sucesso.', 'success');
                    renderTransactions();
                    renderDashboard();
                    
                    // Fecha o modal logo após explodir o registro
                    document.getElementById('modalOverlay').style.display = 'none';
                    resetToStep1();
                }
            });
        }

        // --- AÇÃO DO BOTÃO "CLONAR" ---
        const cloneFinalBtn = document.getElementById('cloneFinalBtn');
        if (cloneFinalBtn) {
            cloneFinalBtn.addEventListener('click', () => {
                // 1. Zera a memória para o sistema criar um NOVO registro em vez de atualizar
                editingTransactionId = null;
                
                document.getElementById('modalTitle').textContent = 'Clonando lançamento...';
                
                // 2. Adiciona "(Cópia)" na descrição para facilitar a identificação
                const desc = document.getElementById('descricao');
                if (desc.value && !desc.value.includes('(Cópia)')) {
                    desc.value += ' (Cópia)';
                }

                // 3. Desativa a trava de recorrência caso o usuário estivesse visualizando uma edição antes
                const recCheckbox = document.getElementById('recorrenteCheckbox');
                if (recCheckbox) {
                    recCheckbox.disabled = false;
                    document.querySelector('label[for="recorrenteCheckbox"]').innerHTML = 'Lançamento recorrente';
                }
                
                // 4. Volta para a tela inicial para o usuário revisar e salvar
                goToStep(1);
                showToast('Cópia gerada! Revise as datas e valores antes de salvar.', 'success');
            });
        }
		
		// --- AÇÃO DO BOTÃO "NOVO" NO FINAL DO MODAL ---
        const newTxFinalBtn = document.getElementById('newTxFinalBtn');
        if (newTxFinalBtn) {
            newTxFinalBtn.addEventListener('click', () => {
                resetToStep1(); // Limpa a memória e volta suavemente para a primeira etapa!
            });
        }

        const reversePaymentBtn = document.getElementById('reversePaymentBtn');
        if (reversePaymentBtn) {
            const newReverseBtn = reversePaymentBtn.cloneNode(true);
            reversePaymentBtn.parentNode.replaceChild(newReverseBtn, reversePaymentBtn);

            newReverseBtn.addEventListener('click', async () => {
                if (!editingTransactionId) {
                    transactionPaid.checked = false;
                    transactionPaid.dispatchEvent(new Event('change'));
                    goToStep(4);
                    return;
                }

                const isConfirmed = await askConfirmation(
                    'Estornar Pagamento', 
                    'Deseja estornar este lançamento? O status mudará para "Agendado/Pendente".', 
                    'Estornar', 
                    false, 
                    'settings_backup_restore'
                );

                if(isConfirmed) {
                    try {
                        // CONTABILIDADE: Reverte o saldo (Devolve o dinheiro!)
                        const oldTx = transactions.find(t => t.id === editingTransactionId);
                        if (oldTx) await processAccountBalance(oldTx, 'revert');

                        // MÁGICA: Além de marcar como não pago, limpamos o FITID para desvincular do extrato OFX!
                        const baseUpdate = { 
                            isPaid: false, 
                            fitid: null, 
                            updatedAt: new Date().toISOString() 
                        };
                        if (selectedType === 'transfer') transactionPaid.disabled = false;
                        
                        await userRef('transactions').doc(editingTransactionId).update(baseUpdate);
                        
                        const idx = transactions.findIndex(t => t.id === editingTransactionId);
                        if(idx !== -1) {
                            transactions[idx].isPaid = false;
                            transactions[idx].fitid = null; // Limpa na memória também
                        }
                        
                        transactionPaid.checked = false;
                        transactionPaid.dispatchEvent(new Event('change'));
                        
                        showToast('Estorno realizado! Edição liberada.', 'success');
                        renderTransactions();
                        renderDashboard();
                        goToStep(4); 
                    } catch(e) {
                        showToast('Erro ao estornar pagamento.', 'error');
                    }
                }
            });
        }

        // --- EVENTO: MARCAR COMO PAGO PELO MODAL ---
        const payFinalBtn = document.getElementById('payFinalBtn');
        if (payFinalBtn) {
            const novoPayBtn = payFinalBtn.cloneNode(true);
            payFinalBtn.parentNode.replaceChild(novoPayBtn, payFinalBtn);
            
            novoPayBtn.addEventListener('click', async () => {
                if (!editingTransactionId) return;
                const t = transactions.find(x => x.id === editingTransactionId);
                if (!t) return;
                
                const chosenDate = await askPaymentDate(t.date);
                if (!chosenDate) return; 
                
                try {
                    await userRef('transactions').doc(editingTransactionId).update({
                        isPaid: true,
                        paymentDate: chosenDate,
                        updatedAt: new Date().toISOString()
                    });
                    
                    const idx = transactions.findIndex(x => x.id === editingTransactionId);
                    if(idx !== -1) {
                        transactions[idx].isPaid = true;
                        transactions[idx].paymentDate = chosenDate;
                        // CONTABILIDADE: Tira/Soma o dinheiro no banco
                        await processAccountBalance(transactions[idx], 'apply');
                    }
                    
                    if(paymentDateInput) paymentDateInput.value = chosenDate;
                    transactionPaid.checked = true;
                    
                    showToast('Pagamento confirmado!', 'success');
                    renderTransactions();
                    renderDashboard();
                    goToStep(4); 
                } catch(e) {
                    showToast('Erro ao processar pagamento.', 'error');
                }
            });
        }

        prevBtn.addEventListener('click', () => {
            if (currentStep > 1) goToStep(currentStep - 1);
        });

        function generateRecurrentDates(startDate, freq, interval, terminoTipo, terminoValue) {
            const dates = [new Date(startDate)];
            let currentDate = new Date(startDate);
            let count = 1;
            while (true) {
                let nextDate = new Date(currentDate);
                if (freq === 'daily') nextDate.setDate(currentDate.getDate() + interval);
                else if (freq === 'weekly') nextDate.setDate(currentDate.getDate() + interval * 7);
                else if (freq === 'monthly') nextDate.setMonth(currentDate.getMonth() + interval);
                else if (freq === 'yearly') nextDate.setFullYear(currentDate.getFullYear() + interval);

                if (terminoTipo === 'until') {
                    const endDate = new Date(terminoValue);
                    if (nextDate > endDate) break;
                } else if (terminoTipo === 'count') {
                    if (count >= terminoValue) break;
                } else {
                    if (count > 120) break;
                }

                dates.push(new Date(nextDate));
                currentDate = nextDate;
                count++;
                if (count > 1000) break;
            }
            return dates;
        }
		
		// --- MOTOR DE GERAÇÃO DE PDF DA FATURA DE COBRANÇA ---
        window.gerarFaturaCobrancaPDF = function(txList) {
            if (!txList || txList.length === 0) return;
            
            const baseTx = txList[0];
            const dataEmissao = new Date().toLocaleDateString('pt-BR');
            const totalCobranca = txList.reduce((sum, t) => sum + t.value, 0);

            // Descobre o mês da fatura (baseado na data do primeiro lançamento)
            const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
            const invoiceMonthDate = new Date(baseTx.date + 'T12:00:00');
            const invoiceMonthStr = monthNames[invoiceMonthDate.getMonth()];

            // Pega até os 2 primeiros nomes do parceiro para uma saudação amigável
            const partnerFirstName = baseTx.partnerName.split(' ').slice(0, 2).join(' ');

            // Monta a Tabela de Parcelas/Vencimentos com Efeito Zebrado e Status inspirado na imagem
            let linhasHtml = '';
            txList.forEach((t, index) => {
                const statusText = t.isPaid ? 'PAGO' : 'PENDENTE';
                const statusColor = t.isPaid ? '#10b981' : '#f59e0b'; // Verde se pago, Laranja forte se pendente
                const bgRow = index % 2 === 0 ? '#ffffff' : '#f9fafb'; // Zebrado branco e cinza clarinho
                
                linhasHtml += `
                    <tr style="background: ${bgRow}; page-break-inside: avoid;">
                        <td style="padding: 14px 8px; border-bottom: none; color: #6b7280;">${formatDate(t.date)}</td>
                        <td style="padding: 14px 8px; border-bottom: none; color: #374151;">${t.description}</td>
                        <td style="padding: 14px 8px; border-bottom: none; color: ${statusColor}; font-weight: bold;">${statusText}</td>
                        <td style="padding: 14px 8px; border-bottom: none; color: #111827; text-align: right; font-weight: bold;">${formatCurrency(t.value)}</td>
                    </tr>
                `;
            });

            // --- SOLUÇÃO PONTO 1: USA O NOME CACHEADO DA SESSÃO ATIVA ---
            const nomeEmissor = window.currentUserName || 'Emissor';

            // Gera o QR Code em um bloco invisível usando o motor que já temos
            const tempDiv = document.createElement('div');
            const payloadPix = gerarPayloadPix(baseTx.cobrancaPixKey, nomeEmissor, '');
            
            if (typeof QRCode !== 'undefined') {
                new QRCode(tempDiv, {
                    text: payloadPix, width: 150, height: 150,
                    colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M
                });
            }

            // Busca o nome do Banco na memória
            const accForBank = accounts.find(a => a.id === baseTx.accountId);
            const bankName = accForBank && accForBank.bankName && accForBank.bankName !== 'Outros' ? accForBank.bankName : '';
            const bankHtml = bankName ? `<p style="margin: 6px 0 0 0; font-size: 0.75rem; color: #6b7280; font-weight: 500;">${bankName}</p>` : '';

            // Aguarda 300ms para o QR Code "pintar" na memória antes de gerar o PDF
            setTimeout(() => {
                const qrCanvas = tempDiv.querySelector('canvas');
                const qrImgSrc = qrCanvas ? qrCanvas.toDataURL('image/png') : '';

                // O NOVO LAYOUT COMPACTO E OTIMIZADO
                const htmlContent = `
                    <div style="width: 800px; padding: 40px 50px; background: #ffffff; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
                        
                        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
                            <div>
                                <h3 style="margin: 0; font-size: 1.2rem; color: #1f2937; font-weight: normal;">Emissor: <strong style="font-weight: bold;">${nomeEmissor}</strong></h3>
                            </div>
                            <div style="text-align: right;">
                                <p style="margin: 0; font-size: 0.9rem; color: #6b7280;">Emitido em: ${dataEmissao}</p>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
                            <div style="display: flex; gap: 16px; align-items: center;">
                                <div style="width: 5px; height: 110px; background-color: #1e1b4b; border-radius: 4px;"></div>
                                <div style="display: flex; flex-direction: column; justify-content: center;">
                                    <p style="margin: 0 0 4px 0; font-size: 1.2rem; color: #6b7280;">Olá, ${partnerFirstName}</p>
                                    <h2 style="margin: 0 0 16px 0; font-size: 1.6rem; color: #1e1b4b;">Essa é sua Fatura</h2>
                                    <p style="margin: 0 0 2px 0; font-size: 0.9rem; color: #6b7280;">Total a pagar</p>
                                    <h1 style="margin: 0; font-size: 2.2rem; color: #1e1b4b; letter-spacing: -0.5px;">${formatCurrency(totalCobranca)}</h1>
                                </div>
                            </div>

                            <div style="background-color: #eff6ff; border: 1px dashed #3b82f6; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 200px;">
                                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px; color: #1d4ed8; font-weight: 600; font-size: 0.9rem;">
                                    <span class="material-icons" style="font-size: 1.1rem;">qr_code_scanner</span> Pague com Pix
                                </div>
                                <div style="background: #ffffff; padding: 6px; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                    <img src="${qrImgSrc}" style="width: 110px; height: 110px; display: block;">
                                </div>
                                <p style="margin: 0 0 2px 0; font-size: 0.65rem; color: #6b7280; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Chave Recebedora</p>
                                <p style="margin: 0; font-size: 0.85rem; color: #111827; font-weight: bold; word-break: break-all; text-align: center;">${baseTx.cobrancaPixKey}</p>
                                ${bankHtml}
                            </div>
                        </div>

                        <h2 style="margin: 0 0 20px 0; font-size: 1.4rem; color: #374151;">Detalhes da Fatura</h2>
                        
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem; margin-bottom: 40px;">
                            <thead>
                                <tr style="border-bottom: 2px solid #e5e7eb; text-align: left;">
                                    <th style="padding: 10px 8px; color: #4b5563; font-weight: 600;">Vencimento</th>
                                    <th style="padding: 10px 8px; color: #4b5563; font-weight: 600;">Descrição</th>
                                    <th style="padding: 10px 8px; color: #4b5563; font-weight: 600;">Status</th>
                                    <th style="padding: 10px 8px; text-align: right; color: #4b5563; font-weight: 600;">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${linhasHtml}
                            </tbody>
                        </table>

                        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #9ca3af; font-size: 0.85rem;">
                            Este documento foi gerado eletronicamente pela plataforma ControlPess.
                        </div>
                    </div>
                `;

                const opt = {
                    margin:       [0.5, 0],
                    filename:     `Fatura_${baseTx.partnerName.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`,
                    image:        { type: 'jpeg', quality: 1 },
                    html2canvas:  { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
                    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
                };

                html2pdf().set(opt).from(htmlContent).save().then(() => {
                    showToast('Fatura de Cobrança gerada com sucesso!', 'success');
                });

            }, 300); 
        };

        // --- FUNÇÃO MÁGICA DE FOCO EM CAMPOS INVÁLIDOS ---
        function destacarCampoInvalido(stepTarget, fieldId) {
            // Volta para a etapa correta onde o campo está escondido
            goToStep(stepTarget);
            
            // Aguarda a animação da tela e foca no campo
            setTimeout(() => {
                const campo = document.getElementById(fieldId);
                if (campo) {
                    // Rola a tela até o campo para garantir que ele esteja visível
                    campo.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    campo.focus();
                    
                    // Aplica a borda vermelha e um "brilho" para chamar atenção visual
                    campo.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
                    campo.style.borderColor = '#d93025';
                    campo.style.boxShadow = '0 0 0 4px rgba(217, 48, 37, 0.2)';
                    
                    // Remove o alerta visual suavemente depois de 3 segundos
                    setTimeout(() => {
                        campo.style.borderColor = '';
                        campo.style.boxShadow = '';
                    }, 3000);
                }
            }, 300);
        }

        nextBtn.addEventListener('click', async () => {
            if (currentStep < 3) {
                if (currentStep === 1) {
                    const valorNumerico = valorParaNumero(valorInput.value);
                    if (valorNumerico <= 0) {
                        showToast('Por favor, informe um valor válido.', 'warning');
                        // Aplica o foco no campo de valor!
                        destacarCampoInvalido(1, 'valor');
                        return;
                    }
                }
                goToStep(currentStep + 1);	
            } else if (currentStep === 3) {
                // INÍCIO DO SALVAMENTO!
                const originalText = nextBtn.textContent;
                nextBtn.textContent = 'Salvando...';
                nextBtn.disabled = true;

                try {
                    // Captura o nome do parceiro para o card
                    const pSelect = document.getElementById('transactionPartner');
                    const partnerName = (pSelect && pSelect.selectedIndex > 0) ? pSelect.options[pSelect.selectedIndex].text : null;

                    const contaLancamentoEl = document.getElementById('contaLancamento');
                    const cartaoUsadoId = document.getElementById('cartaoUsado') ? document.getElementById('cartaoUsado').value : null;
                    const totalDesejado = valorParaNumero(valorInput.value);

                    // --- NOVA VALIDAÇÃO INTELIGENTE: GERAR COBRANÇA ---
                    let chavePixCobrancaSelecionada = null; // Variável que guardará a chave escolhida
                    const cobrancaCheckbox = document.getElementById('cobrancaCheckbox');
                    
                    if (cobrancaCheckbox && cobrancaCheckbox.checked) {
                        // 1. Trava do Parceiro
                        if (!pSelect || !pSelect.value) {
                            showToast('Para gerar uma cobrança, o campo "Parceiro" é obrigatório.', 'warning');
                            nextBtn.textContent = originalText; nextBtn.disabled = false;
                            destacarCampoInvalido(2, 'transactionPartner');
                            return;
                        }
                        
                        // 2. Trava da Conta
                        if (!contaLancamentoEl.value) {
                            showToast('Selecione a Conta Financeira para o recebimento da cobrança.', 'warning');
                            nextBtn.textContent = originalText; nextBtn.disabled = false;
                            destacarCampoInvalido(2, 'contaLancamento');
                            return;
                        }

                        // 3. Trava das Chaves Pix
                        const acc = accounts.find(a => a.id === contaLancamentoEl.value);
                        const hasPixKeys = acc && ((acc.pixKeys && acc.pixKeys.length > 0) || acc.pixKey1 || acc.pixKey2 || acc.pixKey3);
                        if (!hasPixKeys) {
                            showToast('A conta selecionada não possui chaves Pix. Configure a conta no menu "Contas".', 'error');
                            nextBtn.textContent = originalText; nextBtn.disabled = false;
                            destacarCampoInvalido(2, 'contaLancamento');
                            return;
                        }

                        // 4. Pergunta qual chave usar (Chama o cérebro que criamos na etapa 2)
                        chavePixCobrancaSelecionada = await askPixKeySelection(acc);
                        
                        if (!chavePixCobrancaSelecionada) {
                            // Se o usuário clicar em "Cancelar" no modal da chave, o salvamento para aqui.
                            nextBtn.textContent = originalText; nextBtn.disabled = false;
                            return; 
                        }
                    }

                    // --- VALIDAÇÃO INTELIGENTE DE LIMITE DO CARTÃO ---
                    if (selectedType === 'expense' && cartaoUsadoId && contaLancamentoEl.value) {
                        const acc = accounts.find(a => a.id === contaLancamentoEl.value);
                        if (acc && acc.cards) {
                            const card = acc.cards.find(c => c.id === cartaoUsadoId);
                            // Calcula limite apenas para cartões normais (pré-pago usa o saldo da conta direto)
                            if (card && !card.isPrepaid) {
                                const unpaidOnCard = transactions.filter(t => t.accountId === acc.id && t.cardId === cartaoUsadoId && t.type === 'expense' && !t.isPaid);
                                const limitUsedTotal = unpaidOnCard.reduce((sum, t) => sum + t.value, 0);
                                const availableLimit = card.limit - limitUsedTotal;

                                // Se for edição, o sistema reconhece que aquele valor já estava descontado antes e devolve ele matematicamente para analisar a diferença.
                                let limitToCompare = availableLimit;
                                if (editingTransactionId) {
                                    const oldTx = transactions.find(t => t.id === editingTransactionId);
                                    if (oldTx && !oldTx.isPaid && oldTx.cardId === cartaoUsadoId) {
                                        limitToCompare += oldTx.value;
                                    }
                                }

                                if (totalDesejado > limitToCompare) {
                                    showToast(`Limite do cartão insuficiente! Disponível: ${formatCurrency(limitToCompare)}`, 'error');
                                    nextBtn.textContent = originalText;
                                    nextBtn.disabled = false;
                                    // Foca no campo de cartão que deu problema
                                    destacarCampoInvalido(2, 'cartaoUsado');
                                    return; // Para o salvamento na hora!
                                }
                            }
                        }
                    }
                    // -------------------------------------------------

                    // Validações de Conta Obrigatória e Foco no Campo!
                    if (selectedType !== 'transfer' && !contaLancamentoEl.value) {
                        showToast('Selecione a Conta Financeira.', 'warning');
                        nextBtn.textContent = originalText; nextBtn.disabled = false; 
                        destacarCampoInvalido(2, 'contaLancamento');
                        return;
                    }

                    // MÁGICA 1: Validação da Forma de Pagamento Obrigatória!
                    if (!pagamentoSelect.value) {
                        showToast('Selecione a Forma de pagamento/recebimento.', 'warning');
                        nextBtn.textContent = originalText; nextBtn.disabled = false; 
                        destacarCampoInvalido(2, 'pagamento');
                        return;
                    }
                    
                    // MÁGICA: Validação de Parcelas Obrigatória (Verifica a Parcela Primeiro!)
                    const parcelasGroupVisibility = document.getElementById('parcelasGroup');
                    const isParcelasRequired = parcelasGroupVisibility && parcelasGroupVisibility.style.display !== 'none';
                    const parcelasValue = document.getElementById('parcelas').value;
                    if ((selectedType === 'expense' || selectedType === 'income') && isParcelasRequired && !parcelasValue) {
                        showToast('Selecione a quantidade de parcelas.', 'warning');
                        nextBtn.textContent = originalText; nextBtn.disabled = false; 
                        destacarCampoInvalido(2, 'parcelas');
                        return;
                    }

                    // MÁGICA: Validação do Cartão de Crédito Obrigatório!
                    const cartaoGroupVisibility = document.getElementById('cartaoGroup');
                    const isCartaoRequired = cartaoGroupVisibility && cartaoGroupVisibility.style.display !== 'none';
                    if (selectedType === 'expense' && isCartaoRequired && !cartaoUsadoId) {
                        showToast('Selecione o Cartão de Crédito.', 'warning');
                        nextBtn.textContent = originalText; nextBtn.disabled = false; 
                        destacarCampoInvalido(2, 'cartaoUsado');
                        return;
                    }

                    if (selectedType === 'transfer') {
                        if (!contaOrigem.value) {
                            showToast('Selecione a conta de Origem.', 'warning');
                            nextBtn.textContent = originalText; nextBtn.disabled = false; 
                            destacarCampoInvalido(2, 'contaOrigem');
                            return;
                        }
                        if (!contaDestino.value) {
                            showToast('Selecione a conta de Destino.', 'warning');
                            nextBtn.textContent = originalText; nextBtn.disabled = false; 
                            destacarCampoInvalido(2, 'contaDestino');
                            return;
                        }
                        if (contaOrigem.value === contaDestino.value) {
                            showToast('A origem e o destino não podem ser iguais.', 'error');
                            nextBtn.textContent = originalText; nextBtn.disabled = false; 
                            destacarCampoInvalido(2, 'contaDestino');
                            return;
                        }
                    }

                    // --- MÁGICA DAS DATAS E DO CARTÃO DE CRÉDITO AO SALVAR ---
                    let dtLancamento = transactionDateInput ? transactionDateInput.value : dataInput.value;
                    let dtVencimento = dataInput.value;
                    let dtPagamento = paymentDateInput ? paymentDateInput.value : null;
                    let isPrepaidCard = false;

                    if (selectedType === 'expense' && cartaoUsadoId && contaLancamentoEl.value) {
                        const acc = accounts.find(a => a.id === contaLancamentoEl.value);
                        if (acc && acc.cards) {
                            const card = acc.cards.find(c => c.id === cartaoUsadoId);
                            if (card) {
                                isPrepaidCard = card.isPrepaid || false;
                                if (!isPrepaidCard) {
                                    // CORREÇÃO: Só força o cálculo se for um lançamento NOVO.
                                    // Usa a função global calcDueDate
                                    if (!editingTransactionId) {
                                        dtVencimento = calcDueDate(dtLancamento, card.closingDay, card.dueDay);
                                    }
                                    dtPagamento = null; 
                                } else {
                                    // PRÉ-PAGO: Datas de vencimento e pagamento são iguais a de lançamento
                                    dtVencimento = dtLancamento;
                                    dtPagamento = dtLancamento;
                                }
                            }
                        }
                    }

                    // CORREÇÃO BUG 2 NA HORA DE SALVAR: Respeita o status se estiver editando!
                    let bIsPaid = transactionPaid ? transactionPaid.checked : true;
                    if (!editingTransactionId && selectedType === 'expense' && cartaoUsadoId) {
                        bIsPaid = isPrepaidCard ? true : false; // Apenas compras NOVAS no cartão normal nascem pendentes
                    }

                    if (!dtLancamento || !dtVencimento) {
                        showToast('Preencha as datas corretamente.', 'error');
                        nextBtn.textContent = originalText; nextBtn.disabled = false; 
                        destacarCampoInvalido(2, 'data'); // Foca no campo de data de vencimento
                        return;
                    }

                    const baseTransaction = {
                        type: selectedType,
                        value: totalDesejado, 
                        cardId: cartaoUsadoId, 
                        description: descricaoInput.value.trim() || '(Sem descrição)',
                        partnerId: pSelect ? pSelect.value : null,
                        partnerName: partnerName, 
                        category: categoriaSelect.value,
                        paymentMethod: pagamentoSelect.value,
                        isPaid: bIsPaid,
                        paymentDate: dtPagamento,
                        transactionDate: dtLancamento, // <--- SALVANDO O NOVO CAMPO NO BANCO!
                        accountId: selectedType !== 'transfer' ? contaLancamentoEl.value : null,
                        accountName: selectedType !== 'transfer' ? contaLancamentoEl.options[contaLancamentoEl.selectedIndex].text.split(' (')[0] : null,
                        hasBoleto: document.getElementById('boletoCheckbox').checked,
                        boletoLine: document.getElementById('boletoLine').value.replace(/\D/g, ''),
                        
                        // --- SALVA OS DADOS DA COBRANÇA ---
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

                    // A partir daqui o extrato principal e o parcelamento vão usar a data do vencimento calculada!
                    const startDate = dtVencimento;

                    // VERIFICA SE É EDIÇÃO OU NOVO
                    if (editingTransactionId) {
                        const oldTx = transactions.find(t => t.id === editingTransactionId);
                        if (oldTx) await processAccountBalance(oldTx, 'revert');

                        baseTransaction.date = dtVencimento; // A data que afeta o extrato principal é o vencimento!
                        await userRef('transactions').doc(editingTransactionId).update(baseTransaction);
                        
                        const index = transactions.findIndex(t => t.id === editingTransactionId);
                        if (index !== -1) transactions[index] = { ...transactions[index], ...sanitizeFirestoreData(baseTransaction) };
                        
                        await processAccountBalance(transactions[index], 'apply');
                        
                        // --- REGERAÇÃO AUTOMÁTICA DA COBRANÇA APÓS EDITAR ---
                        if (baseTransaction.isCobranca) {
                            let listaEdicao = [];
                            if (transactions[index].installmentGroupId) {
                                listaEdicao = transactions.filter(t => t.installmentGroupId === transactions[index].installmentGroupId);
                                listaEdicao.sort((a, b) => new Date(a.date) - new Date(b.date));
                            } else {
                                listaEdicao = [transactions[index]];
                            }
                            window.gerarFaturaCobrancaPDF(listaEdicao);
                        }
                        
                    } else {
                        let transactionsToAdd = [];
                        const qtdParcelas = document.getElementById('parcelas') ? (parseInt(document.getElementById('parcelas').value) || 1) : 1;
                        
                        // SE O USUÁRIO PARCELOU:
                        if (qtdParcelas > 1) {
                            const valorParcela = totalDesejado / qtdParcelas; 
                            const installmentGroupId = 'grp_' + Date.now(); // MÁGICA AQUI: ID único para este grupo de parcelas!

                            for (let i = 1; i <= qtdParcelas; i++) {
                                // Joga a fatura 1 mês para frente sucessivamente
                                let parcelaDate = new Date(dtVencimento + 'T12:00:00');
                                parcelaDate.setMonth(parcelaDate.getMonth() + (i - 1)); 
                                
                                const year = parcelaDate.getFullYear();
                                const month = String(parcelaDate.getMonth() + 1).padStart(2, '0');
                                const day = String(parcelaDate.getDate()).padStart(2, '0');
                                
                                let txParcela = { 
                                    ...baseTransaction, 
                                    value: valorParcela,
                                    description: `${baseTransaction.description} (${i}/${qtdParcelas})`,
                                    date: `${year}-${month}-${day}`,
                                    installmentGroupId: installmentGroupId // Vincula a parcela ao seu grupo
                                };

                                transactionsToAdd.push({ ...txParcela, createdAt: new Date().toISOString() });
                            }
                        } 
                        // SE FOR RECORRENTE NORMAL (Ex: Assinatura Mensal Dinheiro/Pix)
                        else if (recorrenteCheckbox.checked) {
                            const freq = frequenciaSelect.value;
                            const interval = parseInt(intervaloInput.value) || 1;
                            const terminoTipo = terminoTipoSelect.value;
                            let terminoValue = null;
                            if (terminoTipo === 'until') terminoValue = terminoDataInput.value;
                            else if (terminoTipo === 'count') terminoValue = parseInt(terminoCountInput.value) || 1;

                            const dates = generateRecurrentDates(dtVencimento, freq, interval, terminoTipo, terminoValue);
                            dates.forEach(date => {
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                transactionsToAdd.push({ ...baseTransaction, date: `${year}-${month}-${day}`, createdAt: new Date().toISOString() });
                            });
                        } 
                        // LANÇAMENTO ÚNICO
                        else {
                            transactionsToAdd.push({ ...baseTransaction, date: dtVencimento, createdAt: new Date().toISOString() });
                        }

                        for (let t of transactionsToAdd) {
                            await saveTransaction(t); 
                            await processAccountBalance(t, 'apply');
                        }

                        // --- GERAÇÃO AUTOMÁTICA DA COBRANÇA EM PDF ---
                        if (cobrancaCheckbox && cobrancaCheckbox.checked) {
                            window.gerarFaturaCobrancaPDF(transactionsToAdd);
                            // Sincroniza o ID para habilitar botões de ação e reimpressão imediatos no modal ativo
                            if (transactions.length > 0) {
                                editingTransactionId = transactions[transactions.length - 1].id;
                            }
                        }

                        // --- MÁGICA: Se for lançamento novo, limpa os filtros para ele aparecer na hora! ---
                        currentPeriod = 'month';
                        previousPeriod = 'month';
                        currentStatus = 'all';
                        currentType = 'all';
                        currentPartner = 'all';
                        window.currentAccountFilter = 'all';
                        customStartDate = '';
                        customEndDate = '';

                        if(document.getElementById('periodFilter')) document.getElementById('periodFilter').value = 'month';
                        if(document.getElementById('statusFilter')) document.getElementById('statusFilter').value = 'all';
                        if(document.getElementById('partnerFilter')) document.getElementById('partnerFilter').value = 'all';
                        if(document.getElementById('accountFilter')) document.getElementById('accountFilter').value = 'all';
                        if(document.getElementById('customDateStart')) document.getElementById('customDateStart').value = '';
                        if(document.getElementById('customDateEnd')) document.getElementById('customDateEnd').value = '';
                        document.querySelectorAll('#typeFilter button').forEach(b => {
                            b.classList.remove('active');
                            if (b.dataset.type === 'all') b.classList.add('active');
                        });
                    }
                    
                    // ATUALIZA A TELA DE FUNDO COM OS DADOS NOVOS ANTES DE ABRIR O COMPROVANTE!
                    renderTransactions();
                    renderDashboard();
                    
                    // Avança para a Etapa 4 Mágica!
                    nextBtn.textContent = originalText;
                    nextBtn.disabled = false;
                    goToStep(4);

                } catch (error) {
                    console.error("Erro ao salvar:", error);
                    showToast('Erro de comunicação. Tente novamente.', 'error');
                    // Se der erro, destrava o botão para o usuário tentar de novo
                    nextBtn.textContent = originalText;
                    nextBtn.disabled = false;
                }
            }
        });

        // --- NOVO: EVENTO DO BOTÃO "VER PARCELAS" ---
        const btnVerParcelas = document.getElementById('btnVerParcelas');
        if (btnVerParcelas) {
            btnVerParcelas.addEventListener('click', (e) => {
                e.preventDefault();
                const listaContainer = document.getElementById('listaParcelasExtrato');
                const isHidden = listaContainer.style.display === 'none';
                
                if (isHidden) {
                    const groupId = btnVerParcelas.dataset.groupId;
                    
                    // Encontra todas as parcelas "irmãs" usando apenas o ID do Grupo. Impossível falhar!
                    const parcelasIrmas = transactions.filter(t => t.installmentGroupId === groupId);
                    
                    // Ordena por data
                    parcelasIrmas.sort((a, b) => new Date(a.date) - new Date(b.date));
                    
                    let html = '';
                    const isDark = document.body.classList.contains('dark-mode');
                    const textColor = isDark ? '#e0e0e0' : '#202124';
                    
                    parcelasIrmas.forEach(p => {
                        const match = p.description.match(/\((\d+\/\d+)\)$/);
                        const numeroParcela = match ? match[1] : '';
                        
                        let icon = 'schedule';
                        let iconColor = '#e67e22'; // Laranja
                        let statusTxt = 'Pendente';
                        
                        if (p.isPaid) {
                            icon = 'check_circle';
                            iconColor = '#188038'; // Verde
                            statusTxt = 'Pago';
                        } else {
                            const now = new Date();
                            const hojeLocal = getTodayISO();
                            if (p.date < hojeLocal) {
                                icon = 'error_outline';
                                iconColor = '#d93025'; // Vermelho
                                statusTxt = 'Vencido';
                            }
                        }
                        
                        const bgDestacarAtual = p.id === editingTransactionId ? (isDark ? 'rgba(255, 255, 255, 0.05)' : '#e8f0fe') : 'transparent';
                        
                        // MÁGICA 1: Adicionamos cursor pointer e o evento de clique para navegar direto para a parcela
                        html += `
                            <div class="parcela-item" 
                                 onclick="abrirParcelaDoExtrato('${escapeJsAttr(p.id)}')"
                                 style="display: flex; justify-content: space-between; align-items: center; padding: 10px 8px; border-bottom: 1px solid #e8eaed; background: ${bgDestacarAtual}; border-radius: 8px; margin-bottom: 2px; cursor: pointer; transition: background 0.2s;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span class="material-icons" style="color: ${iconColor}; font-size: 1.2rem;">${icon}</span>
                                    <div>
                                        <div style="font-weight: 500; font-size: 0.9rem; color: ${textColor};">Parcela ${numeroParcela}</div>
                                        <div style="font-size: 0.8rem; color: #5f6368;">${formatDate(p.date)} - ${statusTxt}</div>
                                    </div>
                                </div>
                                <div style="font-weight: 600; font-size: 0.95rem; color: ${textColor};">
                                    ${formatCurrency(p.value)}
                                </div>
                            </div>
                        `;
                    });

                    // MÁGICA 2: Botão discreto para exportar o extrato em PDF
                    html += `
                        <div style="text-align: center; margin-top: 8px;">
                            <button onclick="exportarExtratoParcelas('${escapeJsAttr(groupId)}')" 
                                    style="background: transparent; border: none; color: #1a73e8; font-size: 0.75rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; border-radius: 12px; transition: background 0.2s;">
                                <span class="material-icons" style="font-size: 0.9rem;">picture_as_pdf</span> EXPORTAR EXTRATO EM PDF
                            </button>
                        </div>
                    `;
                    
                    listaContainer.innerHTML = html;
                    listaContainer.style.display = 'block';
                    btnVerParcelas.innerHTML = '<span class="material-icons">expand_less</span> Ocultar parcelas';
                } else {
                    listaContainer.style.display = 'none';
                    btnVerParcelas.innerHTML = '<span class="material-icons">list_alt</span> Ver todas as parcelas';
                }
            });
        }
		
		// --- FUNÇÕES DE APOIO AO EXTRATO DE PARCELAS ---
        
        // 1. Função para navegar entre as parcelas clicando na lista
        window.abrirParcelaDoExtrato = function(id) {
            if (id === editingTransactionId) return; // Se já estiver nela, ignora
            
            // Fecha o modal atual, limpa a memória e abre a nova parcela
            document.getElementById('modalOverlay').style.display = 'none';
            resetToStep1(); 
            
            setTimeout(() => {
                openEditTransactionModal(id);
                showToast('Navegando para a parcela selecionada...', 'success');
            }, 300);
        };

        // 2. Função para gerar o PDF detalhado do parcelamento
        window.exportarExtratoParcelas = async function(groupId) {
            const parcelas = transactions.filter(t => t.installmentGroupId === groupId);
            if (parcelas.length === 0) return;

            parcelas.sort((a, b) => new Date(a.date) - new Date(b.date));

            const tExemplo = parcelas[0];
            const tituloOriginal = tExemplo.description.replace(/\s*\(\d+\/\d+\)$/, '');
            const totalCompra = parcelas.reduce((acc, p) => acc + p.value, 0);
            const totalPago = parcelas.filter(p => p.isPaid).reduce((acc, p) => acc + p.value, 0);
            
            let rowsHtml = '';
            parcelas.forEach(p => {
                const match = p.description.match(/\((\d+\/\d+)\)$/);
                const num = match ? match[1] : '';
                const status = p.isPaid ? 'PAGO' : 'PENDENTE';
                const statusColor = p.isPaid ? '#188038' : '#e67e22';

                rowsHtml += `
                    <tr style="border-bottom: 1px solid #e8eaed; color: #202124;">
                        <td style="padding: 12px 8px; font-weight: 500;">Parcela ${num}</td>
                        <td style="padding: 12px 8px; color: #5f6368;">${formatDate(p.date)}</td>
                        <td style="padding: 12px 8px; font-weight: 600; color: ${statusColor};">${status}</td>
                        <td style="padding: 12px 8px; text-align: right; font-weight: bold;">${formatCurrency(p.value)}</td>
                    </tr>
                `;
            });

            const htmlContent = `
                <div style="width: 800px; padding: 40px; background: #ffffff; color: #202124; font-family: Helvetica, Arial, sans-serif;">
                    <h1 style="color: #1a73e8; margin-bottom: 4px;">Extrato de Parcelamento</h1>
                    <p style="color: #5f6368; margin-top: 0;">${tituloOriginal}</p>
                    
                    <div style="display: flex; gap: 20px; margin: 30px 0;">
                        <div style="flex: 1; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e8eaed;">
                            <span style="font-size: 0.8rem; color: #5f6368;">VALOR TOTAL DA COMPRA</span>
                            <div style="font-size: 1.4rem; font-weight: bold; color: #202124;">${formatCurrency(totalCompra)}</div>
                        </div>
                        <div style="flex: 1; background: #e6f4ea; padding: 15px; border-radius: 8px; border: 1px solid #ceead6;">
                            <span style="font-size: 0.8rem; color: #188038;">TOTAL PAGO ATÉ AGORA</span>
                            <div style="font-size: 1.4rem; font-weight: bold; color: #188038;">${formatCurrency(totalPago)}</div>
                        </div>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <thead>
                            <tr style="background: #f1f3f4; text-align: left; color: #5f6368;">
                                <th style="padding: 12px 8px; border-radius: 8px 0 0 8px;">Parcela</th>
                                <th style="padding: 12px 8px;">Vencimento</th>
                                <th style="padding: 12px 8px;">Situação</th>
                                <th style="padding: 12px 8px; text-align: right; border-radius: 0 8px 8px 0;">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                    <div style="margin-top: 40px; font-size: 0.8rem; color: #9aa0a6; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
                        Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} pelo ControlPess
                    </div>
                </div>
            `;

            const opt = {
                margin: [0.5, 0],
                filename: `Extrato_Parcelas_${tituloOriginal.replace(/\s+/g, '_')}.pdf`,
                image: { type: 'jpeg', quality: 1 },
                html2canvas: { scale: 2, scrollY: 0 },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(htmlContent).save();
            showToast('PDF do extrato gerado com sucesso!', 'success');
        };

        // Fechar Modal após a Etapa 4
        const closeFinalBtn = document.getElementById('closeFinalBtn');
        if (closeFinalBtn) {
            closeFinalBtn.addEventListener('click', () => {
                modalOverlay.style.display = 'none';
                resetToStep1(); // Zera pra próxima vez
            });
        }

       // ========== FUNÇÃO DE BAIXAR PDF DO COMPROVANTE (COMPACTO) ==========
        const downloadFooterBtn = document.getElementById('downloadFooterBtn');
        if (downloadFooterBtn) {
            downloadFooterBtn.addEventListener('click', () => {
                
                // 1. Mostra estado de carregamento
                const originalBtnContent = downloadFooterBtn.innerHTML;
                downloadFooterBtn.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">autorenew</span> Gerando...';
                downloadFooterBtn.disabled = true;

                // 2. Coleta as informações exatas da tela
                const title = document.getElementById('receiptTitle').textContent;
                const valor = document.getElementById('receiptValor').textContent;
                const descricao = document.getElementById('receiptDescricao').textContent;
                const parceiro = document.getElementById('receiptParceiro').textContent;
                const categoria = document.getElementById('receiptCategoria').textContent;
                const dataVencimento = document.getElementById('receiptData').textContent;
                const dataPagamento = document.getElementById('receiptDataPagamento').textContent;
                const formaPagamento = document.getElementById('receiptPagamento').textContent;
                const statusText = document.getElementById('receiptStatusText').textContent;
                
                // Pega a classe da etiqueta para aplicar as cores FIXAS do modo claro no PDF (já que o PDF é sempre branco)
                const statusBgElement = document.getElementById('receiptStatus');
                let pdfStatusBg = '#fef0d9'; // Padrão: Agendado (Laranja)
                let pdfStatusColor = '#e67e22';
                let pdfStatusIcon = 'schedule'; // Padrão: Relógio
                
                if (statusBgElement.classList.contains('status-confirmed')) {
                    pdfStatusBg = '#e6f4ea'; pdfStatusColor = '#188038'; // Pago (Verde)
                    pdfStatusIcon = 'check_circle';
                } else if (statusBgElement.classList.contains('status-overdue')) {
                    pdfStatusBg = '#fce8e8'; pdfStatusColor = '#d93025'; // Vencido (Vermelho)
                    pdfStatusIcon = 'error_outline';
                } else if (statusBgElement.classList.contains('status-transfer')) {
                    pdfStatusBg = '#e8f0fe'; pdfStatusColor = '#1a73e8'; // Transferido (Azul)
                    pdfStatusIcon = 'check_circle';
                }

                const origem = document.getElementById('receiptOrigem').textContent;
                const destino = document.getElementById('receiptDestino').textContent;
                const isTransfer = document.getElementById('receiptOrigemRow').style.display !== 'none';

                // 3. Monta as linhas usando FLOAT com Paddings Reduzidos
                let rowsHtml = `
                    <div style="padding: 8px 0; border-bottom: 1px solid #e8eaed; font-size: 0.95rem; overflow: hidden;">
                        <span style="color: #5f6368; float: left;">Descrição</span>
                        <strong style="float: right; text-align: right;">${descricao}</strong>
                        <div style="clear: both;"></div>
                    </div>
                `;

                if (isTransfer) {
                    rowsHtml += `
                        <div style="padding: 8px 0; border-bottom: 1px solid #e8eaed; font-size: 0.95rem; overflow: hidden;">
                            <span style="color: #5f6368; float: left;">Conta Origem</span>
                            <strong style="float: right; text-align: right;">${origem}</strong>
                            <div style="clear: both;"></div>
                        </div>
                        <div style="padding: 8px 0; border-bottom: 1px solid #e8eaed; font-size: 0.95rem; overflow: hidden;">
                            <span style="color: #5f6368; float: left;">Conta Destino</span>
                            <strong style="float: right; text-align: right;">${destino}</strong>
                            <div style="clear: both;"></div>
                        </div>
                    `;
                } else {
                    rowsHtml += `
                        <div style="padding: 8px 0; border-bottom: 1px solid #e8eaed; font-size: 0.95rem; overflow: hidden;">
                            <span style="color: #5f6368; float: left;">Parceiro</span>
                            <strong style="float: right; text-align: right;">${parceiro}</strong>
                            <div style="clear: both;"></div>
                        </div>
                    `;
                }

                rowsHtml += `
                    <div style="padding: 8px 0; border-bottom: 1px solid #e8eaed; font-size: 0.95rem; overflow: hidden;">
                        <span style="color: #5f6368; float: left;">Categoria</span>
                        <strong style="float: right; text-align: right;">${categoria}</strong>
                        <div style="clear: both;"></div>
                    </div>
                    <div style="padding: 8px 0; border-bottom: 1px solid #e8eaed; font-size: 0.95rem; overflow: hidden;">
                        <span style="color: #5f6368; float: left;">Data da Transação</span>
                        <strong style="float: right; text-align: right;">${document.getElementById('receiptTransactionDate').textContent}</strong>
                        <div style="clear: both;"></div>
                    </div>
                    <div style="padding: 8px 0; border-bottom: 1px solid #e8eaed; font-size: 0.95rem; overflow: hidden;">
                        <span style="color: #5f6368; float: left;">Vencimento</span>
                        <strong style="float: right; text-align: right;">${dataVencimento}</strong>
                        <div style="clear: both;"></div>
                    </div>
                    <div style="padding: 8px 0; border-bottom: 1px solid #e8eaed; font-size: 0.95rem; overflow: hidden;">
                        <span style="color: #5f6368; float: left;">Data de Pagamento</span>
                        <strong style="float: right; text-align: right;">${dataPagamento}</strong>
                        <div style="clear: both;"></div>
                    </div>
                    <div style="padding: 8px 0; border-bottom: 1px solid #e8eaed; font-size: 0.95rem; overflow: hidden;">
                        <span style="color: #5f6368; float: left;">Forma de Pagamento</span>
                        <strong style="float: right; text-align: right;">${formaPagamento}</strong>
                        <div style="clear: both;"></div>
                    </div>
                `;

                // --- NOVO: Inclui Parcelas e Cartão no PDF apenas se existirem ---
                const rowParcelas = document.getElementById('receiptParcelasRow');
                if (rowParcelas && rowParcelas.style.display !== 'none') {
                    const valParcelas = document.getElementById('receiptParcelas').textContent;
                    rowsHtml += `
                        <div style="padding: 8px 0; border-bottom: 1px solid #e8eaed; font-size: 0.95rem; overflow: hidden;">
                            <span style="color: #5f6368; float: left;">Parcelamento</span>
                            <strong style="float: right; text-align: right;">${valParcelas}</strong>
                            <div style="clear: both;"></div>
                        </div>
                    `;
                }

                const rowCartao = document.getElementById('receiptCartaoRow');
                if (rowCartao && rowCartao.style.display !== 'none') {
                    const valCartao = document.getElementById('receiptCartao').textContent;
                    rowsHtml += `
                        <div style="padding: 8px 0; border-bottom: 1px solid #e8eaed; font-size: 0.95rem; overflow: hidden;">
                            <span style="color: #5f6368; float: left;">Cartão</span>
                            <strong style="float: right; text-align: right;">${valCartao}</strong>
                            <div style="clear: both;"></div>
                        </div>
                    `;
                }
				
				// --- CAPTURA DO CÓDIGO DE BARRAS PARA O PDF ---
                let boletoPdfHtml = '';
                const boletoContainer = document.getElementById('receiptBoletoContainer');
                if (boletoContainer && boletoContainer.style.display !== 'none') {
                    const svgElement = document.getElementById('boletoBarcode');
                    const boletoLineText = document.getElementById('boletoLineText').textContent;
                    
                    // Converte o SVG do código de barras em uma imagem para o PDF
                    const xml = new XMLSerializer().serializeToString(svgElement);
                    const svg64 = window.btoa(unescape(encodeURIComponent(xml)));
                    const b64Start = 'data:image/svg+xml;base64,';
                    const imageSrc = b64Start + svg64;

                    boletoPdfHtml = `
                        <div style="text-align: center; margin-top: 20px; padding-top: 16px; border-top: 1px dashed #dadce0; page-break-inside: avoid;">
                            <p style="color: #202124; font-size: 1rem; margin: 0 0 8px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Boleto Bancário</p>
                            <div style="background: #ffffff; padding: 10px; border: 1px solid #dadce0; border-radius: 12px; display: inline-block;">
                                <img src="${imageSrc}" style="width: 550px; height: 65px;">
                            </div>
                            <p style="font-family: monospace; color: #5f6368; font-size: 0.9rem; margin-top: 10px; word-break: break-all;">${boletoLineText}</p>
                        </div>
                    `;
                }

                // --- CAPTURA DO QR CODE PIX PARA O PDF ---
                let qrCodeHtml = '';
                const qrContainer = document.getElementById('receiptQrContainer');
                
                // Se a caixa do QR Code estiver visível na tela, nós a levamos pro PDF
                if (qrContainer && qrContainer.style.display !== 'none') {
                    const qrCanvas = document.querySelector('#receiptQrBox canvas');
                    if (qrCanvas) {
                        const qrDataUrl = qrCanvas.toDataURL('image/png'); 
                        const qrKeyText = document.getElementById('receiptQrKeyText').textContent;
                        
                        // QR Code mais compacto no PDF
                        qrCodeHtml = `
                            <div style="text-align: center; margin-top: 20px; padding-top: 16px; border-top: 1px dashed #dadce0; page-break-inside: avoid;">
                                <p style="color: #202124; font-size: 1rem; margin: 0 0 8px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Pagar via PIX</p>
                                <img src="${qrDataUrl}" style="width: 120px; height: 120px; border: 1px solid #dadce0; padding: 8px; border-radius: 12px; background: #ffffff;">
                                <p style="color: #5f6368; font-size: 0.85rem; margin-top: 8px;">${qrKeyText}</p>
                                
                                <div style="background: #fef0d9; color: #e67e22; padding: 10px 14px; border-radius: 12px; margin: 16px auto 0 auto; font-size: 0.85rem; text-align: center; max-width: 320px; border: 1px solid #fbdc9e;">
                                    <span style="line-height: 1.3;"><strong>Atenção:</strong> Confira atentamente os dados do destinatário antes de confirmar a transação no seu banco.</span>
                                </div>
                            </div>
                        `;
                    }
                }

                // Monta o "Papel Virtual" Ultra Compacto
                const htmlContent = `
                    <div style="width: 800px; padding: 30px 40px; background: #ffffff; color: #202124; font-family: Helvetica, Arial, sans-serif;">
                        <div style="border-bottom: 2px solid #1a73e8; padding-bottom: 16px; margin-bottom: 20px; overflow: hidden;">
                            <div style="float: left;">
                                <h1 style="color: #1a73e8; margin: 0; font-size: 1.6rem; letter-spacing: 1px;">ControlPess</h1>
                                <p style="color: #5f6368; margin: 4px 0 0 0; font-size: 0.95rem;">Gerenciamento Financeiro</p>
                            </div>
                            <div style="float: right; text-align: right;">
                                <h2 style="color: #202124; margin: 0; font-size: 1.2rem; font-weight: 500;">${title}</h2>
                                <p style="color: #5f6368; margin: 4px 0 0 0; font-size: 0.85rem;">Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                            </div>
                            <div style="clear: both;"></div>
                        </div>

                        <div style="text-align: center; margin-bottom: 20px; background: #f8f9fa; padding: 16px; border-radius: 12px; border: 1px solid #e8eaed;">
                            <p style="color: #5f6368; margin: 0 0 4px 0; font-size: 0.95rem;">Valor do Lançamento</p>
                            <h2 style="color: #202124; margin: 0; font-size: 2.4rem; font-weight: 600;">${valor}</h2>
                        </div>

                        <div style="margin-bottom: 20px;">
                            ${rowsHtml}
                        </div>

                        <div style="text-align: center; margin: 24px 0 12px 0;">
                            <span style="display: inline-block; background: ${pdfStatusBg}; color: ${pdfStatusColor}; padding: 8px 24px; border-radius: 24px; font-weight: 700; font-size: 1.05rem; letter-spacing: 0.5px;">
                                <span class="material-icons" style="font-size: 1.2rem; vertical-align: middle; margin-right: 6px; margin-top: -3px;">${pdfStatusIcon}</span><span style="vertical-align: middle;">${statusText.toUpperCase()}</span>
                            </span>
                        </div>
                        
                        ${qrCodeHtml}
						${boletoPdfHtml}
                        
                        <div style="text-align: center; margin-top: 24px; color: #9aa0a6; font-size: 0.8rem;">
                            Documento gerado eletronicamente por ControlPess.
                        </div>
                    </div>
                `;

                // 4. Configurações do PDF (Margem Reduzida)
                const opt = {
                    margin:       [0.2, 0], 
                    filename:     `ControlPess_${title.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`,
                    image:        { type: 'jpeg', quality: 1 },
                    html2canvas:  { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
                    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
                };

                // 5. Gera, Baixa e destrava o botão
                html2pdf().set(opt).from(htmlContent).save().then(() => {
                    downloadFooterBtn.innerHTML = originalBtnContent;
                    downloadFooterBtn.disabled = false;
                }).catch(err => {
                    console.error("Erro ao gerar PDF: ", err);
                    downloadFooterBtn.innerHTML = originalBtnContent;
                    downloadFooterBtn.disabled = false;
                });
            });
        }
		
		async function openEditTransactionModal(id) {
            const t = transactions.find(x => x.id === id);
            if (!t) return;
            
            editingTransactionId = id; // Marca que estamos editando!
            document.getElementById('modalTitle').textContent = 'Editar lançamento';

            // Carrega os selects primeiro para podermos preenchê-los
            await Promise.all([ fetchCategories(), fetchPaymentTypes(), loadPartners(), loadAccounts() ]);
            preencherSelectCategorias();
            preencherSelectPagamentos();
			preencherSelectContas();
            
            const selectPartner = document.getElementById('transactionPartner');
            if (selectPartner) {
                selectPartner.innerHTML = '<option value="">Selecione um parceiro...</option>';
                partners.filter(p => p.active !== false)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = p.name;
                    selectPartner.appendChild(opt);
                });
            }

            // Preenche os dados
            setType(t.type);
            
            // Trava de segurança: Garante que o valor seja um número válido antes de formatar, evitando erros em registros antigos
            const valorSeguro = t.value ? Number(t.value) : 0;
            valorInput.value = formatarMoeda(valorSeguro.toFixed(2).replace('.', ''));
            
            descricaoInput.value = t.description || '';
            if(t.partnerId) selectPartner.value = t.partnerId;
            categoriaSelect.value = t.category || '';
			if(transactionDateInput) transactionDateInput.value = t.transactionDate || t.date;
            dataInput.value = t.date;
            // MÁGICA: Só preenche a data de pagamento se a transação realmente estiver paga!
            if(paymentDateInput) paymentDateInput.value = t.isPaid ? (t.paymentDate || t.date) : '';
            const contaLancamentoEl = document.getElementById('contaLancamento');
			if(t.accountId) contaLancamentoEl.value = t.accountId;

			if (t.type === 'transfer') {
				contaOrigem.value = t.contaOrigemId || '';
				contaDestino.value = t.contaDestinoId || '';
			}

			// Filtra os pagamentos baseados na conta recém-carregada ANTES de preencher
			const contaParaFiltro = t.type === 'transfer' ? t.contaOrigemId : t.accountId;
			preencherSelectPagamentos(contaParaFiltro);

            // MÁGICA DO CARTÃO NA EDIÇÃO: Dispara a verificação se a conta tem cartão
            const eventoConta = new Event('change');
            document.getElementById('contaLancamento').dispatchEvent(eventoConta);
            if (t.cardId && document.getElementById('cartaoUsado')) {
                document.getElementById('cartaoUsado').value = t.cardId;
            }

			// Agora sim, seleciona o método salvo no banco de dados
			pagamentoSelect.value = t.paymentMethod || '';
			
			// Carrega os dados do Boleto salvos no Firebase
            const checkBoleto = document.getElementById('boletoCheckbox');
            checkBoleto.checked = t.hasBoleto || false;
            document.getElementById('boletoLine').value = t.boletoLine || '';
            checkBoleto.dispatchEvent(new Event('change')); // Força a tela a exibir o campo se estiver marcado
			
			// Força a verificação se deve exibir o container da checkbox baseado no pagamento selecionado
            document.getElementById('pagamento').dispatchEvent(new Event('change'));

            // --- CORREÇÃO: CARREGA O STATUS DA COBRANÇA (PDF) ---
            const checkCobranca = document.getElementById('cobrancaCheckbox');
            if (checkCobranca && t.isCobranca) {
                checkCobranca.checked = true;
            }

            if (transactionPaid) {
                transactionPaid.checked = t.isPaid !== false;
                transactionPaid.dispatchEvent(new Event('change')); // Atualiza a cor do rótulo
            }

            // Desativa a recorrência na edição para evitar bagunça no banco
			recorrenteCheckbox.checked = false;
            recorrenteCheckbox.disabled = true;
            document.querySelector('label[for="recorrenteCheckbox"]').innerHTML = 'Lançamento recorrente <small>(Não alterável na edição)</small>';
            recurrenceFields.classList.remove('visible');

            // Vai direto para a visualização do comprovante (Etapa 4)
            goToStep(4);
            document.getElementById('modalOverlay').style.display = 'flex';
                document.getElementById('modalOverlay').classList.add('open');
        }

        function resetToStep1() {
            // 1. ZERA A MEMÓRIA DE EDIÇÃO (Resolve o bug da sobreposição!)
            editingTransactionId = null; 
            document.getElementById('modalTitle').textContent = 'Novo lançamento';

            // 2. Limpa os campos de texto e valor
            valorInput.value = '';

            // Limpa o "resíduo" do valor exibido no painel esquerdo (hero)
            ['heroAmount', 'heroAmount2'].forEach(id => {
                const a = document.getElementById(id);
                if (a) a.textContent = '0,00';
            });
            descricaoInput.value = '';
            categoriaSelect.selectedIndex = 0;
            
            // 3. Reseta as datas para hoje (USANDO FUSO HORÁRIO LOCAL!)
            const now = new Date();
            const today = getTodayISO();
            if(transactionDateInput) transactionDateInput.value = today;
            dataInput.value = today;
            // MÁGICA: A data de pagamento começa sempre vazia em um novo lançamento!
            if (paymentDateInput) paymentDateInput.value = '';
            if (transactionPartner) transactionPartner.selectedIndex = 0;

            // 4. Reseta o botão de Pago/Não Pago
            if (transactionPaid) {
                transactionPaid.checked = false;
                transactionPaid.disabled = false;
                if(paymentStatusLabel) {
                    paymentStatusLabel.textContent = 'Não Pago';
                    paymentStatusLabel.style.color = '#e67e22';
                }
            }

            // 5. Reseta as contas
            document.getElementById('contaLancamento').value = '';
            document.getElementById('contaOrigem').value = '';
            document.getElementById('contaDestino').value = '';
            
            // MÁGICA: Aciona a função que limpa e trava o campo de pagamento!
            preencherSelectPagamentos(null); 
            
            // Limpa Cartão e Parcelas
            if(document.getElementById('cartaoUsado')) document.getElementById('cartaoUsado').value = '';
            if(document.getElementById('parcelas')) {
                document.getElementById('parcelas').value = ''; // Começa vazio!
                document.getElementById('parcelas').dispatchEvent(new Event('change')); // Avisa a recorrência para reaparecer
            }
            if(document.getElementById('parcelasCardGroup')) document.getElementById('parcelasCardGroup').style.display = 'none';

            setType('expense');
			
			// Limpa o campo de boleto
            document.getElementById('boletoCheckbox').checked = false;
            document.getElementById('boletoLine').value = '';
            document.getElementById('boletoFieldGroup').style.display = 'none';
			document.getElementById('boletoGroupContainer').style.display = 'none';
			
			// Limpa a mensagem de status do scanner/digitação
            const scanStatus = document.getElementById('scanStatus');
            if (scanStatus) {
                scanStatus.style.display = 'none';
                scanStatus.textContent = '';
            }

            // 6. Destrava e limpa a Recorrência (caso tenha sido travada na edição)
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

            // 7. Volta para a aba 1
            goToStep(1);
        }

        [valorInput, descricaoInput, categoriaSelect, dataInput, pagamentoSelect, contaOrigem, contaDestino, recorrenteCheckbox, frequenciaSelect, intervaloInput, terminoTipoSelect, terminoDataInput, terminoCountInput].forEach(field => {
            field.addEventListener('input', () => {
                if (currentStep === 3) updateReceiptPreview();
            });
            field.addEventListener('change', () => {
                if (currentStep === 3) updateReceiptPreview();
            });
        });

        // ========== PRIVACIDADE TOGGLE ==========
        const privacyToggle = document.getElementById('privacyToggle');
        privacyToggle.addEventListener('click', togglePrivacy);

        // ========== LOGOTIPO CLICÁVEL ==========
        document.getElementById('logoHome').addEventListener('click', () => {
            setActiveView('dashboard');
        });

        // ========== CONFIGURAÇÕES ==========
        // ========== BOTÃO DE CONFIGURAÇÕES ==========
		document.getElementById('settingsBtn').addEventListener('click', () => {
			setActiveView('settings');
		});

        // ========== TROCA DE VIEW ==========
		const sidebarItems = document.querySelectorAll('.sidebar-item');
		const dashboardView = document.getElementById('dashboardView');
		const transactionsView = document.getElementById('transactionsView');
		const settingsView = document.getElementById('settingsView');
		const partnersView = document.getElementById('partnersView');

		function setActiveView(view) {
			currentView = view;
			sidebarItems.forEach(item => {
				const itemView = item.dataset.view;
				if (itemView === view) {
					item.classList.add('active');
				} else {
					item.classList.remove('active');
				}
			});

			// Esconde todas as views
			dashboardView.style.display = 'none';
			transactionsView.style.display = 'none';
			settingsView.style.display = 'none';
			partnersView.style.display = 'none';
			if (typeof accountsView !== 'undefined' && accountsView) accountsView.style.display = 'none'; // Esconde contas!

			// Mostra a view selecionada
			if (view === 'dashboard') {
                window.currentDashboardCardIndex = 0; // MÁGICA 2: Sempre volta para o cartão principal (0) ao clicar no menu!
                dashboardView.style.display = 'block';
                renderDashboard();
            } else if (view === 'transactions') {
                // --- RESET DE FILTROS AO ENTRAR NA TELA ---
                currentPeriod = 'month';
                previousPeriod = 'month';
                currentStatus = 'all';
                currentType = 'all';
                currentPartner = 'all';
                window.currentAccountFilter = 'all';
                customStartDate = '';
                customEndDate = '';

                // Garante que a tela mude visualmente sem depender de mais nada
                if (typeof transactionsView !== 'undefined' && transactionsView) {
                    transactionsView.style.display = 'block';
                } else if (document.getElementById('transactionsView')) {
                    document.getElementById('transactionsView').style.display = 'block';
                }

                // Executa a montagem dos filtros capturando erros para não travar o sistema
                try {
                    if (typeof populatePartnerFilter === 'function') populatePartnerFilter();
                } catch (e) { console.warn("Aviso Parceiro:", e); }

                try {
                    if (typeof populateAccountFilter === 'function') populateAccountFilter();
                } catch (e) { console.warn("Aviso Conta:", e); }

                // Reseta visualmente os seletores da tela com proteção individual
                const fPeriod = document.getElementById('periodFilter');
                if (fPeriod) fPeriod.value = 'month';

                const fStatus = document.getElementById('statusFilter');
                if (fStatus) fStatus.value = 'all';

                const fAccount = document.getElementById('accountFilter');
                if (fAccount) fAccount.value = 'all';
                
                const fPartner = document.getElementById('partnerFilter');
                if (fPartner) fPartner.value = 'all';
                
                const dStart = document.getElementById('customDateStart');
                if (dStart) dStart.value = '';

                const dEnd = document.getElementById('customDateEnd');
                if (dEnd) dEnd.value = '';
                
                // Reseta as abas (Todos, Receitas, Despesas)
                try {
                    const buttons = document.querySelectorAll('#typeFilter button');
                    if (buttons && buttons.length > 0) {
                        buttons.forEach(b => {
                            b.classList.remove('active');
                            if (b.dataset.type === 'all') b.classList.add('active');
                        });
                    }
                } catch (e) { console.warn("Aviso Abas:", e); }
                // ------------------------------------------
                
                // Chama a renderização final dos dados com escudo de proteção
                try {
                    if (typeof renderTransactions === 'function') {
                        renderTransactions();
                    }
                } catch (e) {
                    console.error("Erro crítico ao renderizar lançamentos:", e);
                }
            } else if (view === 'settings') {
				document.querySelectorAll('.settings-subview').forEach(subview => {
					subview.style.display = 'none';
				});
				document.querySelector('#settingsView .settings-grid').style.display = 'grid'; /* CORRIGIDO */
				settingsView.style.display = 'block';
				renderSettings();
			} else if (view === 'partners') {
				partnersView.style.display = 'block';
				loadPartners();
			} else if (view === 'accounts') {
				accountsView.style.display = 'block';
				loadAccounts();
			}
		}

		sidebarItems.forEach(item => {
			item.addEventListener('click', () => {
                // MÁGICA 3: TRAVA DE SEGURANÇA. Se o usuário tentar sair clicando no menu sem salvar a conta, o sistema bloqueia!
                if (typeof accountFormHasChanges !== 'undefined' && accountFormHasChanges && currentView === 'accounts' && document.getElementById('accountModal').style.display === 'flex') {
                    showToast('Você tem alterações não salvas! Clique em "Salvar Conta" no rodapé antes de sair.', 'warning');
                    return;
                }
				const view = item.dataset.view;
				setActiveView(view);
			});
		});

		// ========== BOTÃO VOLTAR NAS CONFIGURAÇÕES ==========
		document.getElementById('backFromSettings').addEventListener('click', () => {
			setActiveView('dashboard'); // ou a última view, mas vamos para dashboard
		});
		
		// ========== MODAL DE TIPO DE PAGAMENTO ==========
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

		function closePaymentTypeModal() {
			paymentTypeModal.style.display = 'none';
		}
		
		// ========== TIPOS DE PAGAMENTO (LISTAGEM) ==========
		let editingPaymentTypeId = null;
		
		async function fetchPaymentTypes() {
			if (!currentUser) return;
			const snapshot = await db
				.collection('users')
				.doc(currentUser.uid)
				.collection('paymentTypes')
				.get();
			paymentTypes = snapshot.docs.map(doc => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
		}

		const paymentTypesView = document.getElementById('paymentTypesView');
		const paymentTypesList = document.getElementById('paymentTypesList');
		const addPaymentTypeBtn = document.getElementById('addPaymentTypeBtn');
		const backFromPaymentTypes = document.getElementById('backFromPaymentTypes');

		function renderPaymentTypes() {
			if (paymentTypes.length === 0) {
				paymentTypesList.innerHTML = '<div class="empty-message">Nenhuma forma de pagamento cadastrada.</div>';
				return;
			}

			// MÁGICA DA ORDENAÇÃO: Sistema primeiro, Personalizados depois (ambos em ordem alfabética)
			const sortedPaymentTypes = [...paymentTypes].sort((a, b) => {
				if (a.isSystem && !b.isSystem) return -1; // 'a' sobe
				if (!a.isSystem && b.isSystem) return 1;  // 'b' sobe
				// Se os dois forem do sistema ou os dois forem personalizados, ordena de A a Z
				return a.description.localeCompare(b.description);
			});

			let html = '';
			sortedPaymentTypes.forEach(pt => {
				// Variáveis com a nova lógica de cor e texto
				const statusLabel = pt.active !== false ? 'Ativo' : 'Inativo';
				const statusColor = pt.active !== false ? '#188038' : '#5f6368'; 
				const parcelamento = pt.allowsInstallments ? `Sim (até ${pt.maxInstallments}x)` : 'Não';
				
				const subHtml = `<strong style="color: ${statusColor};">${statusLabel}</strong> | Parcelamento: ${parcelamento}`;
				
                // A MÁGICA: Ocultamos a classe de deletar se for item nativo do sistema
                const deleteClass = pt.isSystem ? 'delete-payment-type-hidden' : 'delete-payment-type';
                
                // Gera a linha (se a lixeira tiver a classe oculta, nós injetamos um display none in-line)
				let rowHtml = criarHtmlItemCadastro(pt.id, pt.active === false, '', pt.description, subHtml, 'edit-payment-type', deleteClass);
                
                if (pt.isSystem) {
                    rowHtml = rowHtml.replace('class="delete-payment-type-hidden" title="Excluir"', 'class="delete-payment-type-hidden" title="Não é possível excluir" style="display:none;"');
                }

                html += rowHtml;
			});
			paymentTypesList.innerHTML = html;

			// Eventos de editar/excluir
			document.querySelectorAll('.delete-payment-type').forEach(btn => {
				btn.addEventListener('click', async (e) => {
					const row = e.target.closest('.item-row');
					const id = row.dataset.id;
					if (await askConfirmation('Excluir', 'Tem certeza que deseja excluir este tipo de pagamento?', 'Excluir', true, 'warning')) {
						await userRef('paymentTypes').doc(id).delete();
						paymentTypes = paymentTypes.filter(pt => pt.id !== id);
						renderPaymentTypes();
					}
				});
			});

			// Removemos a busca apenas pelo botão de editar e colocamos o clique na linha inteira (.item-row)
			document.querySelectorAll('#paymentTypesList .item-row').forEach(row => {
				row.addEventListener('click', (e) => {
					// Regra de ouro: se o usuário clicou no botão de excluir (ou no ícone da lixeira), nós ignoramos este clique!
					if (e.target.closest('.delete-payment-type')) {
						return;
					}

					const id = row.dataset.id;
					const pt = paymentTypes.find(p => p.id === id);
					if (pt) {
						editingPaymentTypeId = id;
						
                        const descInput = document.getElementById('paymentDescricao');
                        descInput.value = pt.description;
                        
                        // BLINDAGEM: Impede a edição do nome se for sistema
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

		// Botão "Novo" na subview
		addPaymentTypeBtn.addEventListener('click', () => {
			editingPaymentTypeId = null;
			const descInput = document.getElementById('paymentDescricao');
            descInput.value = '';
            descInput.disabled = false;
            descInput.style.backgroundColor = '';
			document.getElementById('paymentStatus').checked = true;
			document.getElementById('paymentParcelamento').checked = false;
			document.getElementById('paymentMaxParcelas').value = 12;
			updateToggleStatus();
			paymentTypeModal.style.display = 'flex';
		});

		// Voltar da subview
		backFromPaymentTypes.addEventListener('click', () => {
			paymentTypesView.style.display = 'none';
			document.querySelector('#settingsView .settings-grid').style.display = 'grid';
		});

		// Atualiza textos dos toggles
		function updateToggleStatus() {
			// Atualiza o título do Status para Ativo/Inativo
			const statusLabel = document.getElementById('paymentStatusLabel');
			if (statusLabel) {
				statusLabel.textContent = paymentStatusCheckbox.checked ? 'Ativo' : 'Inativo';
			}
			
			// Mostra ou esconde o campo de quantidade de parcelas
			const showMax = paymentParcelamentoCheckbox.checked;
			paymentMaxParcelas.disabled = !showMax;
			maxParcelasGroup.style.display = showMax ? 'block' : 'none';
		}

		// Event listeners parceiros
		paymentStatusCheckbox.addEventListener('change', updateToggleStatus);
		paymentParcelamentoCheckbox.addEventListener('change', updateToggleStatus);

		closePaymentTypeBtn.addEventListener('click', closePaymentTypeModal);
		cancelPaymentTypeBtn.addEventListener('click', closePaymentTypeModal);
		
		// Lógica para alternar as abas do Modal de Parceiros
		document.querySelectorAll('#partnerTabs .tab-btn').forEach(btn => {
			btn.addEventListener('click', (e) => {
				// Remove a classe 'active' de todos os botões e conteúdos
				document.querySelectorAll('#partnerTabs .tab-btn').forEach(b => b.classList.remove('active'));
				document.querySelectorAll('#partnerModal .tab-content').forEach(c => c.classList.remove('active'));
				
				// Adiciona a classe 'active' no botão clicado e na aba correspondente
				const targetId = e.target.dataset.target;
				e.target.classList.add('active');
				document.getElementById(targetId).classList.add('active');
			});
		});

		// Atualiza o texto dinâmico "Ativo/Inativo" no Parceiro
		function updatePartnerActiveText() {
			const statusLabel = document.getElementById('partnerActiveLabel');
			if (statusLabel) {
				statusLabel.textContent = document.getElementById('partnerActive').checked ? 'Ativo' : 'Inativo';
			}
		}
		document.getElementById('partnerActive').addEventListener('change', updatePartnerActiveText);

		// Fechar ao clicar fora
		paymentTypeModal.addEventListener('click', (e) => {
			if (e.target === paymentTypeModal) {
				closePaymentTypeModal();
			}
		});

		// Salvar no Firebase (criar ou editar)
		savePaymentTypeBtn.addEventListener('click', async () => {
			const descricao = document.getElementById('paymentDescricao').value.trim();
			if (!descricao) {
				alert('Informe a descrição do tipo de pagamento.');
				return;
			}

			const paymentType = {
				description: descricao,
				active: paymentStatusCheckbox.checked,
				allowsInstallments: paymentParcelamentoCheckbox.checked,
				maxInstallments: paymentParcelamentoCheckbox.checked ? parseInt(paymentMaxParcelas.value) || 1 : null,
				updatedAt: new Date().toISOString()
			};

			try {
				if (!currentUser) {
					alert('Usuário não autenticado.');
					return;
				}

				if (editingPaymentTypeId) {
					// Atualizar
					await userRef('paymentTypes').doc(editingPaymentTypeId).update(paymentType);
					const index = paymentTypes.findIndex(pt => pt.id === editingPaymentTypeId);
					if (index !== -1) paymentTypes[index] = { id: editingPaymentTypeId, ...paymentType };
				} else {
					// Criar novo
					paymentType.createdAt = new Date().toISOString();
					const docRef = await userRef('paymentTypes').add(paymentType);
					paymentTypes.push({ id: docRef.id, ...paymentType });
				}

				renderPaymentTypes();
				closePaymentTypeModal();
			} catch (error) {
				console.error('Erro ao salvar:', error);
				alert('Erro ao salvar. Tente novamente.');
			}
		});
		
		// ========== CENTROS DE CUSTO (CARREGAR PARA USO NAS CATEGORIAS) ==========
		
		// Busca os dados no banco de forma pura
		async function fetchCostCenters() {
			if (!currentUser) return;
			const snapshot = await userRef('costCenters').get();
			costCenters = snapshot.docs.map(doc => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
		}

		// Carrega a tela específica de Centros de Custo
		async function loadCostCenters() {
			await fetchCostCenters();
			renderCostCenters();
		}

		function renderCostCenterOptions(selectedId = null, centersList = costCenters) {
			let options = '<option value="">Nenhum</option>';
			if (centersList && centersList.length > 0) {
				centersList.forEach(cc => {
					const selected = cc.id === selectedId ? 'selected' : '';
					options += `<option value="${escapeHtml(cc.id)}" ${selected}>${escapeHtml(cc.description)}</option>`;
				});
			}
			return options;
		}
		
		// ========== CATEGORIAS (LISTAGEM) ==========
		let editingCategoryId = null;

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
		
		// Aplica a máscara de moeda enquanto o usuário digita na Meta
		categoryMonthlyGoal.addEventListener('input', function(e) {
			let value = e.target.value;
			let rawValue = value.replace(/\D/g, ''); // Remove tudo que não é número
			if (rawValue.length === 0) {
				e.target.value = '';
				return;
			}
			if (rawValue.length > 15) rawValue = rawValue.slice(0, 15);
			e.target.value = formatarMoeda(rawValue);
		});

		// Garante que não fique vazio ao sair do campo
		categoryMonthlyGoal.addEventListener('blur', function(e) {
			if (!e.target.value) {
				e.target.value = 'R$ 0,00';
			}
		});

		// Atualiza texto do toggle ativo/inativo na Categoria
		function updateCategoryActiveText() {
			const statusLabel = document.getElementById('categoryActiveLabel');
			if (statusLabel) {
				statusLabel.textContent = categoryActive.checked ? 'Ativo' : 'Inativo';
			}
		}
		categoryActive.addEventListener('change', updateCategoryActiveText);
		
		async function fetchCategories() {
			if (!currentUser) return;
			const snapshot = await db
				.collection('users')
				.doc(currentUser.uid)
				.collection('categories')
				.get();
			categories = snapshot.docs.map(doc => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
		}

		async function loadPaymentTypes() {
			await fetchPaymentTypes();
			renderPaymentTypes();
		}

		async function loadCategories() {
			// --- NOVO: Limpa os filtros sempre que o usuário entra na tela ---
			if (document.getElementById('catSearchFilter')) document.getElementById('catSearchFilter').value = '';
			if (document.getElementById('catTypeFilter')) document.getElementById('catTypeFilter').value = 'all';
			if (document.getElementById('catStatusFilter')) document.getElementById('catStatusFilter').value = 'active';

			// Dispara as duas buscas no banco em paralelo (ao mesmo tempo)
			await Promise.all([
				fetchCategories(),
				fetchCostCenters()
			]);
			renderCategories(); // Só desenha a tela quando as duas respostas chegarem
		}
		
		function preencherSelectCategorias() {
			const select = document.getElementById("categoria");
			const valorAnterior = select.value; // Guarda a seleção para não perder na edição

			select.innerHTML = '<option value="" disabled selected>Selecione</option>';
			
			// MÁGICA: Filtra pelo Tipo atual (selectedType) e ordena de A a Z!
			categories.filter(cat => cat.active !== false && cat.type === selectedType)
					  .sort((a, b) => a.name.localeCompare(b.name))
					  .forEach(cat => {
				const option = document.createElement("option");
				option.value = cat.id;
				option.textContent = cat.name;
				select.appendChild(option);
			});
			
			if (valorAnterior) select.value = valorAnterior;
		}
		
		function getCategoryNameById(categoryId) {
			const category = categories.find(cat => cat.id === categoryId);
			return category ? category.name : "Sem categoria";
		}
		
		function getPaymentTypeNameById(paymentId) {
            const pt = paymentTypes.find(p => p.id === paymentId);
            return pt ? pt.description : "Outros";
        }

        // --- MOTOR FINANCEIRO: ATUALIZAÇÃO INTELIGENTE DE SALDOS ---
        function preencherSelectContas() {
            const selects = [
                document.getElementById('contaLancamento'),
                document.getElementById('contaOrigem'),
                document.getElementById('contaDestino')
            ];
            selects.forEach(sel => {
                if(!sel) return;
                const previousValue = sel.value; // Guarda a memória para a edição
                sel.innerHTML = '<option value="" disabled selected>Selecione a conta...</option>';
                accounts.filter(a => a.active !== false)
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

        async function processAccountBalance(tx, action = 'apply') {
            if (!tx.isPaid) return; // Regra de Ouro: Lançamentos pendentes não afetam o saldo real do banco

            const multiplier = action === 'apply' ? 1 : -1;
            const batch = db.batch();
            let hasChanges = false;

            const getRef = (id) => userRef('accounts').doc(id);
            const updateLocal = (id, change) => {
                const acc = accounts.find(a => a.id === id);
                if(acc) acc.balance += change;
            }

            if (tx.type === 'income' && tx.accountId) {
                const change = tx.value * multiplier;
                batch.update(getRef(tx.accountId), { balance: firebase.firestore.FieldValue.increment(change) });
                updateLocal(tx.accountId, change);
                hasChanges = true;
            } else if (tx.type === 'expense' && tx.accountId) {
                const change = -tx.value * multiplier;
                batch.update(getRef(tx.accountId), { balance: firebase.firestore.FieldValue.increment(change) });
                updateLocal(tx.accountId, change);
                hasChanges = true;
            } else if (tx.type === 'transfer') {
                if (tx.contaOrigemId) {
                    const change = -tx.value * multiplier;
                    batch.update(getRef(tx.contaOrigemId), { balance: firebase.firestore.FieldValue.increment(change) });
                    updateLocal(tx.contaOrigemId, change);
                    hasChanges = true;
                }
                if (tx.contaDestinoId) {
                    const change = tx.value * multiplier;
                    batch.update(getRef(tx.contaDestinoId), { balance: firebase.firestore.FieldValue.increment(change) });
                    updateLocal(tx.contaDestinoId, change);
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                await batch.commit(); // Salva tudo no banco de dados de uma vez!
            }
        }
		
		function preencherSelectPagamentos(accountId = null) {
			const select = document.getElementById('pagamento');
			const valorAnterior = select.value; // Memoriza o que estava selecionado
			
            // MÁGICA: Trava a forma de pagamento se a conta não estiver selecionada!
            if (!accountId) {
                select.innerHTML = '<option value="" disabled selected>Selecione uma conta primeiro...</option>';
                select.disabled = true; // Desabilita o clique
                
                // Esconde por segurança os grupos de cartões, parcelas e boletos
                if(document.getElementById('parcelasCardGroup')) document.getElementById('parcelasCardGroup').style.display = 'none';
                if(document.getElementById('boletoGroupContainer')) document.getElementById('boletoGroupContainer').style.display = 'none';
                if(document.getElementById('boletoFieldGroup')) document.getElementById('boletoFieldGroup').style.display = 'none';
                
                return; // Para a execução aqui!
            }

            // Conta selecionada, destrava e popula as opções!
            select.disabled = false;
			select.innerHTML = '<option value="" disabled selected>Selecione</option>';

			let tiposParaMostrar = paymentTypes;

			const contaSelecionada = accounts.find(a => a.id === accountId);
			if (contaSelecionada && contaSelecionada.acceptedPaymentTypes) {
				tiposParaMostrar = paymentTypes.filter(pt => 
					contaSelecionada.acceptedPaymentTypes.includes(pt.id)
				);
			}

			// Desenha as opções na tela em ordem alfabética
			tiposParaMostrar.sort((a, b) => a.description.localeCompare(b.description)).forEach(pt => {
				const option = document.createElement('option');
				option.value = pt.id;
				option.textContent = pt.description;
				select.appendChild(option);
			});

			// Se o valor que estava selecionado antes ainda for válido, mantém ele
			if (valorAnterior && tiposParaMostrar.some(pt => pt.id === valorAnterior)) {
				select.value = valorAnterior;
			}
		}

		function renderCategories() {
			// --- 1. PEGA OS VALORES DOS FILTROS ---
			const searchTerm = (document.getElementById('catSearchFilter') ? document.getElementById('catSearchFilter').value.toLowerCase().trim() : '');
			const typeFilter = document.getElementById('catTypeFilter') ? document.getElementById('catTypeFilter').value : 'all';
			const statusFilter = document.getElementById('catStatusFilter') ? document.getElementById('catStatusFilter').value : 'active';

			// --- 2. APLICA OS FILTROS NA LISTA ---
			let filteredCategories = categories.filter(cat => {
				// Filtro por Nome
				if (searchTerm && !(cat.name || '').toLowerCase().includes(searchTerm)) return false;
				// Filtro por Tipo
				if (typeFilter !== 'all' && cat.type !== typeFilter) return false;
				// Filtro por Status
				if (statusFilter === 'active' && cat.active === false) return false;
				if (statusFilter === 'inactive' && cat.active !== false) return false;
				
				return true; // Se passou por tudo, exibe!
			});

			if (filteredCategories.length === 0) {
				categoriesList.innerHTML = '<div class="empty-message">Nenhuma categoria encontrada.</div>';
				return;
			}
			
			let html = '';
			// Usa a lista filtrada em vez da lista completa
			filteredCategories.forEach(cat => {
				const typeLabel = cat.type === 'income' ? 'Receita' : 'Despesa';
				const activeLabel = cat.active ? 'Ativo' : 'Inativo';
				const activeColor = cat.active ? '#188038' : '#5f6368'; // Verde para ativo, cinza para inativo
				const goal = cat.monthlyGoal ? `R$ ${parseFloat(cat.monthlyGoal).toFixed(2)}` : 'Não definida';

				const avatar = `<span style="display: inline-block; width: 24px; height: 24px; border-radius: 50%; background-color: ${cat.color || '#ccc'}; flex-shrink: 0;"></span>`;
				const subHtml = `<strong style="color: ${activeColor};">${activeLabel}</strong> | ${typeLabel} | Meta: ${goal}`;
				html += criarHtmlItemCadastro(cat.id, cat.active === false, avatar, cat.name, subHtml, 'edit-category', 'delete-category');
			});
			categoriesList.innerHTML = html;

			// Eventos de editar/excluir
			document.querySelectorAll('.delete-category').forEach(btn => {
				btn.addEventListener('click', async (e) => {
					const row = e.target.closest('.item-row');
					const id = row.dataset.id;
					if (await askConfirmation('Excluir', 'Tem certeza que deseja excluir esta categoria?', 'Excluir', true, 'warning')) {
						await userRef('categories').doc(id).delete();
						categories = categories.filter(cat => cat.id !== id);
						renderCategories();
					}
				});
			});

			// Evento de edição clicando na linha inteira (Categorias)
			document.querySelectorAll('#categoriesList .item-row').forEach(row => {
				row.addEventListener('click', (e) => { // <-- Removemos o 'async' daqui
					// Ignora se o usuário clicou na lixeira
					if (e.target.closest('.delete-category')) return;

					// REMOVEMOS A LINHA DE 'await loadCostCenters();' que travava o modal
					const id = row.dataset.id;
					const cat = categories.find(c => c.id === id);
					if (cat) {
						editingCategoryId = id;
						categoryName.value = cat.name;
						categoryType.value = cat.type || 'expense';
						categoryColor.value = cat.color || '#1a73e8';
						
						// Mantém a formatação da meta que fizemos anteriormente
						const metaValor = cat.monthlyGoal || 0;
						const metaString = Math.round(metaValor * 100).toString(); 
						categoryMonthlyGoal.value = formatarMoeda(metaString) || 'R$ 0,00';
						
						categoryActive.checked = cat.active !== false;
						updateCategoryActiveText();
						// Preenche o select com o centro de custo usando a memória
						categoryCostCenter.innerHTML = renderCostCenterOptions(cat.costCenter || null);
						categoryModal.style.display = 'flex';
					}
				});
			});
		}
		
		// Eventos dos novos filtros de Categoria
		const catSearchInput = document.getElementById('catSearchFilter');
		const catTypeSelect = document.getElementById('catTypeFilter');
		const catStatusSelect = document.getElementById('catStatusFilter');

		if (catSearchInput) catSearchInput.addEventListener('input', renderCategories);
		if (catTypeSelect) catTypeSelect.addEventListener('change', renderCategories);
		if (catStatusSelect) catStatusSelect.addEventListener('change', renderCategories);

		// Botão "Nova" na subview
		addCategoryBtn.addEventListener('click', async () => {
			editingCategoryId = null;
			categoryName.value = '';
			categoryType.value = 'expense';
			categoryColor.value = '#1a73e8';
			categoryMonthlyGoal.value = 'R$ 0,00';
			categoryActive.checked = true;
			updateCategoryActiveText();
			categoryCostCenter.innerHTML = renderCostCenterOptions(null, costCenters); // passa a lista
			categoryModal.style.display = 'flex';
		});

		// Voltar da subview
		backFromCategories.addEventListener('click', () => {
			categoriesView.style.display = 'none';
			document.querySelector('#settingsView .settings-grid').style.display = 'grid';
		});

		// Fechar modal
		function closeCategoryModal() {
			categoryModal.style.display = 'none';
		}
		closeCategoryBtn.addEventListener('click', closeCategoryModal);
		cancelCategoryBtn.addEventListener('click', closeCategoryModal);
		categoryModal.addEventListener('click', (e) => {
			if (e.target === categoryModal) closeCategoryModal();
		});

		// Salvar categoria
		saveCategoryBtn.addEventListener('click', async () => {
			const name = categoryName.value.trim();
			if (!name) {
				alert('Informe o nome da categoria.');
				return;
			}

			const categoryData = {
				name: name,
				type: categoryType.value,
				color: categoryColor.value,
				costCenter: categoryCostCenter.value || null,
				monthlyGoal: valorParaNumero(categoryMonthlyGoal.value) || 0,
				active: categoryActive.checked,
				updatedAt: new Date().toISOString()
			};

			try {
				if (!currentUser) {
					alert('Usuário não autenticado.');
					return;
				}

				if (editingCategoryId) {
					await userRef('categories').doc(editingCategoryId).update(categoryData);
					const index = categories.findIndex(c => c.id === editingCategoryId);
					if (index !== -1) categories[index] = { id: editingCategoryId, ...categoryData };
				} else {
					categoryData.createdAt = new Date().toISOString();
					const docRef = await userRef('categories').add(categoryData);
					categories.push({ id: docRef.id, ...categoryData });
				}

				renderCategories();
				closeCategoryModal();
			} catch (error) {
				console.error('Erro ao salvar categoria:', error);
				alert('Erro ao salvar. Tente novamente.');
			}
		});
		
		// ========== CENTROS DE CUSTO (LISTAGEM) ==========
		let editingCostCenterId = null;

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

		// Atualiza texto do toggle ativo/inativo no Centro de Custo
		function updateCostCenterActiveText() {
			const statusLabel = document.getElementById('costCenterActiveLabel');
			if (statusLabel) {
				statusLabel.textContent = costCenterActive.checked ? 'Ativo' : 'Inativo';
			}
		}
		costCenterActive.addEventListener('change', updateCostCenterActiveText);

		function renderCostCenters() {
			if (costCenters.length === 0) {
				costCentersList.innerHTML = '<div class="empty-message">Nenhum centro de custo cadastrado.</div>';
				return;
			}
			let html = '';
			costCenters.forEach(cc => {
				// Nova lógica de cor e texto para o status
				const statusLabel = cc.active !== false ? 'Ativo' : 'Inativo';
				const statusColor = cc.active !== false ? '#188038' : '#5f6368'; // Verde para ativo, cinza para inativo
				
				const avatar = `<span style="display: inline-block; width: 24px; height: 24px; border-radius: 50%; background-color: ${cc.color || '#ccc'}; flex-shrink: 0;"></span>`;
				const subHtml = `<strong style="color: ${statusColor};">${statusLabel}</strong> | ${cc.observation || 'Sem observação'}`;
				html += criarHtmlItemCadastro(cc.id, cc.active === false, avatar, cc.description, subHtml, 'edit-costcenter', 'delete-costcenter');
			});
			costCentersList.innerHTML = html;
			// Evento de exclusão (faltava)
			document.querySelectorAll('.delete-costcenter').forEach(btn => {
				btn.addEventListener('click', async (e) => {
					const row = e.target.closest('.item-row');
					const id = row.dataset.id;
					if (await askConfirmation('Excluir', 'Tem certeza que deseja excluir este centro de custo?', 'Excluir', true, 'warning')) {
						await userRef('costCenters').doc(id).delete();
						costCenters = costCenters.filter(cc => cc.id !== id);
						renderCostCenters();
					}
				});
			});

			// Evento de edição clicando na linha inteira (Centros de Custo)
			document.querySelectorAll('#costCentersList .item-row').forEach(row => {
				row.addEventListener('click', (e) => {
					// Se o clique foi no botão de excluir, não faz nada (deixa a exclusão rodar)
					if (e.target.closest('.delete-costcenter')) return;

					const id = row.dataset.id;
					const cc = costCenters.find(c => c.id === id);
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
		
		// Botão "Novo" na subview
		addCostCenterBtn.addEventListener('click', () => {
			editingCostCenterId = null;
			costCenterDescription.value = '';
			costCenterObservation.value = '';
			costCenterColor.value = '#1a73e8';
			costCenterActive.checked = true;
			updateCostCenterActiveText();
			costCenterModal.style.display = 'flex';
		});

		// Voltar da subview
		backFromCostCenters.addEventListener('click', () => {
			costCentersView.style.display = 'none';
			document.querySelector('#settingsView .settings-grid').style.display = 'grid';
		});

		// Fechar modal
		function closeCostCenterModal() {
			costCenterModal.style.display = 'none';
		}
		closeCostCenterBtn.addEventListener('click', closeCostCenterModal);
		cancelCostCenterBtn.addEventListener('click', closeCostCenterModal);
		costCenterModal.addEventListener('click', (e) => {
			if (e.target === costCenterModal) closeCostCenterModal();
		});

		// Salvar centro de custo
		saveCostCenterBtn.addEventListener('click', async () => {
			const description = costCenterDescription.value.trim();
			if (!description) {
				alert('Informe a descrição do centro de custo.');
				return;
			}

			const costCenterData = {
				description: description,
				observation: costCenterObservation.value.trim() || null,
				color: costCenterColor.value,
				active: costCenterActive.checked,
				updatedAt: new Date().toISOString()
			};

			try {
				if (!currentUser) {
					alert('Usuário não autenticado.');
					return;
				}

				if (editingCostCenterId) {
					await userRef('costCenters').doc(editingCostCenterId).update(costCenterData);
					const index = costCenters.findIndex(cc => cc.id === editingCostCenterId);
					if (index !== -1) costCenters[index] = { id: editingCostCenterId, ...costCenterData };
				} else {
					costCenterData.createdAt = new Date().toISOString();
					const docRef = await userRef('costCenters').add(costCenterData);
					costCenters.push({ id: docRef.id, ...costCenterData });
				}

				renderCostCenters();
				closeCostCenterModal();
			} catch (error) {
				console.error('Erro ao salvar centro de custo:', error);
				alert('Erro ao salvar. Tente novamente.');
			}
		});
		
		// ========== PERFIL ==========
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

		// Função para carregar dados do perfil do Firestore
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
					// Se não existir, criar documento básico
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

		// Aplica a foto no avatar (Base64 ou letra)
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

		// Alterar foto
		changePhotoBtn.addEventListener('click', () => {
			photoUpload.click();
		});

		photoUpload.addEventListener('change', async (e) => {
			const file = e.target.files[0];
			if (!file) return;

			// Validar tipo e tamanho
			if (!file.type.startsWith('image/')) {
				alert('Por favor, selecione uma imagem.');
				return;
			}
			if (file.size > 1024 * 1024) { // 1MB
				alert('A imagem deve ter no máximo 1MB.');
				return;
			}

			const reader = new FileReader();
			reader.onload = async (event) => {
				const base64 = event.target.result;
				try {
					// Salvar no Firestore
					await db.collection('users').doc(currentUser.uid).update({
						photoURL: base64
					});
					aplicarFotoPerfil(base64);
					await updateUserAvatar();
					alert('Foto atualizada com sucesso!');
				} catch (error) {
					console.error('Erro ao salvar foto:', error);
					alert('Erro ao salvar a foto. Tente novamente.');
				}
			};
			reader.readAsDataURL(file);
		});

		// Salvar nome
		saveProfileBtn.addEventListener('click', async () => {
			const newName = profileName.value.trim();
			if (!newName) {
				showToast('O nome não pode ficar vazio.', 'warning');
				return;
			}
			if (!currentUser) return;

			try {
				// Atualizar no Firestore
				await db.collection('users').doc(currentUser.uid).update({
					name: newName,
					updatedAt: new Date().toISOString()
				});
				await updateUserAvatar();
				// Opcional: atualizar no Firebase Auth
				await currentUser.updateProfile({ displayName: newName });
				showToast('Nome atualizado com sucesso!', 'success');
				// Atualizar a inicial do avatar se não houver foto
				aplicarFotoPerfil(null);
			} catch (error) {
				console.error('Erro ao atualizar nome:', error);
				showToast('Erro ao atualizar nome.', 'error');
			}
		});

		// Trocar senha
		changePasswordBtn.addEventListener('click', async () => {
			if (!currentUser?.email) return;
			try {
				await auth.sendPasswordResetEmail(currentUser.email);
				showToast('E-mail de redefinição de senha enviado!', 'success');
			} catch (error) {
				showToast('Erro ao enviar e-mail. Tente novamente.', 'error');
			}
		});

		// ═══ MOTOR DE RESET DE CONTA (DUPLA VALIDAÇÃO) ═══
		const resetConfirmWord = document.getElementById('resetConfirmWord');
        const resetErrorMsg = document.getElementById('resetErrorMsg');

        // Função que avalia em tempo real se destrava o botão
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

		resetAccountBtn.addEventListener('click', () => {
			resetPassword.value = '';
            resetConfirmWord.value = '';
            resetErrorMsg.textContent = '';
            validateResetForm(); // Força a travar ao abrir
			resetAccountModal.style.display = 'flex';
		});

        // Escutadores de digitação em tempo real
        resetPassword.addEventListener('input', () => { resetErrorMsg.textContent = ''; validateResetForm(); });
        resetConfirmWord.addEventListener('input', () => { resetErrorMsg.textContent = ''; validateResetForm(); });

		function closeResetModalFn() {
			resetAccountModal.style.display = 'none';
		}
		closeResetModal.addEventListener('click', closeResetModalFn);
		cancelReset.addEventListener('click', closeResetModalFn);
		resetAccountModal.addEventListener('click', (e) => {
			if (e.target === resetAccountModal) closeResetModalFn();
		});

		confirmReset.addEventListener('click', async () => {
			const password = resetPassword.value.trim();
			const word = resetConfirmWord.value.trim().toUpperCase();

            // Bloqueio duplo para evitar invasão do front-end
			if (!password || word !== 'EXCLUIR') return; 
			if (!currentUser) return;

            // Feedback visual nativo enquanto o firebase processa
            const originalText = confirmReset.innerHTML;
            confirmReset.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">autorenew</span> Processando...';
            confirmReset.disabled = true;
            resetErrorMsg.textContent = '';

			const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, password);
			
            try {
				await currentUser.reauthenticateWithCredential(credential);
				const batch = db.batch();
				const collections = ['transactions', 'paymentTypes', 'categories', 'costCenters', 'accounts'];
				
                let dinheiroIdParaReset = null; // Memória temporária para o laço

                for (const col of collections) {
					const snapshot = await userRef(col).get();
					
                    if (col === 'paymentTypes') {
                        snapshot.docs.forEach(doc => {
                            const data = doc.data();
                            if (data.isSystem) {
                                const isCredit = data.description === 'Crédito';
                                batch.update(doc.ref, { active: true, allowsInstallments: isCredit, maxInstallments: isCredit ? 24 : 1 });
                                
                                // Captura o ID do Dinheiro quando passar por ele
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
                                    acceptedPaymentTypes: dinheiroIdParaReset ? [dinheiroIdParaReset] : [] // <--- Vínculo blindado no Reset!
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
                
                // Aguarda o usuário ler a mensagem de sucesso antes de atualizar a página e deslogar
				setTimeout(() => { window.location.reload(); }, 2000);
			
            } catch (error) {
				if (error.code === 'auth/wrong-password') {
					resetErrorMsg.textContent = 'Senha incorreta. Verifique e tente novamente.';
				} else {
					resetErrorMsg.textContent = 'Erro ao redefinir conta. Tente novamente.';
				}
                // Devolve o botão ao normal em caso de erro
                confirmReset.innerHTML = originalText;
                validateResetForm(); 
			}
		});

		// Voltar da subview
		backFromProfile.addEventListener('click', () => {
			profileView.style.display = 'none';
			document.querySelector('#settingsView .settings-grid').style.display = 'grid';
		});
		
		// ========== AVATAR E DROPDOWN DO USUÁRIO ==========
		const userAvatarBtn = document.getElementById('userAvatarBtn');
		const userDropdown = document.getElementById('userDropdown');
		const goToProfile = document.getElementById('goToProfile');
		const logoutBtn = document.getElementById('logoutBtn');

		// Função para atualizar o avatar com foto ou inicial
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

		// Abrir/fechar dropdown
		userAvatarBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			userDropdown.classList.toggle('show');
		});

		// Fechar ao clicar fora
		document.addEventListener('click', (e) => {
			if (!userAvatarBtn.contains(e.target) && !userDropdown.contains(e.target)) {
				userDropdown.classList.remove('show');
			}
		});

		// Ação: Perfil
		goToProfile.addEventListener('click', () => {
			userDropdown.classList.remove('show');
			setActiveView('settings');
			// Abre a subview de perfil
			document.querySelector('#settingsView .settings-grid').style.display = 'none';
			profileView.style.display = 'block';
			loadProfile();
		});

		// Ação: Sair
		logoutBtn.addEventListener('click', () => {
			userDropdown.classList.remove('show');
			auth.signOut();
		});	
		
		//----- funções de CRUD para parceiros ------
		async function loadPartners() {
			if (!currentUser) return;
			const snapshot = await userRef('partners').get();
			partners = snapshot.docs.map(doc => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
			renderPartners();
		}

		function renderPartners() {
			const listEl = document.getElementById('partnersList');
			const searchFilter = (document.getElementById('partnerSearchFilter') ? document.getElementById('partnerSearchFilter').value.toLowerCase().trim() : '');
			const typeFilter = document.getElementById('partnerTypeFilter').value;
			const statusFilter = document.getElementById('partnerStatusFilter').value;

			let filtered = partners.filter(p => {
				// NOVO: Busca Inteligente (Nome, Documento, Email, Telefone, Cidade, Rua, etc.)
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
				const doc = p.document || '—';
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
						partners = partners.filter(p => p.id !== id);
						renderPartners();
					}
				});
			});

			document.querySelectorAll('#partnersList .item-row').forEach(row => {
				row.addEventListener('click', (e) => {
					if (e.target.closest('.delete-partner')) return;
					const id = row.dataset.id;
					const partner = partners.find(p => p.id === id);
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
			
			// Trava de segurança: Limpa se tiver mais de um PIX marcado por erro antigo
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

		function updateDocLabel() {
			const type = document.getElementById('partnerType').value;
			const docInput = document.getElementById('partnerDoc');
			if (type === 'Jurídica') {
				document.getElementById('docLabel').textContent = 'CNPJ';
				docInput.placeholder = '00.000.000/0000-00';
				docInput.maxLength = 18;
			} else if (type === 'Física') {
				document.getElementById('docLabel').textContent = 'CPF';
				docInput.placeholder = '000.000.000-00';
				docInput.maxLength = 14;
			} else {
				document.getElementById('docLabel').textContent = 'Documento';
				docInput.placeholder = 'Digite o documento';
				docInput.maxLength = 50; 
			}
			applyDocMask({ target: docInput });
		}

		function applyDocMask(e) {
			const type = document.getElementById('partnerType').value;
			let value = e.target.value;
			if (type === 'Física') {
				value = value.replace(/\D/g, ''); 
				if (value.length > 11) value = value.slice(0, 11);
				value = value.replace(/(\d{3})(\d)/, '$1.$2');
				value = value.replace(/(\d{3})(\d)/, '$1.$2');
				value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
				e.target.value = value;
			} else if (type === 'Jurídica') {
				value = value.replace(/\D/g, ''); 
				if (value.length > 14) value = value.slice(0, 14);
				value = value.replace(/(\d{2})(\d)/, '$1.$2');
				value = value.replace(/(\d{3})(\d)/, '$1.$2');
				value = value.replace(/(\d{3})(\d)/, '$1/$2');
				value = value.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
				e.target.value = value;
			} else {
				e.target.value = value;
			}
			updateMiniQrCard();
		}

		document.getElementById('partnerDoc').addEventListener('input', applyDocMask);
		
		document.getElementById('partnerPhone').addEventListener('input', function(e) {
			let value = e.target.value.replace(/\D/g, ''); 
			if (value.length > 11) value = value.slice(0, 11);
			if (value.length > 10) value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
			else if (value.length > 5) value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
			else if (value.length > 2) value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
			e.target.value = value;
			updateMiniQrCard();
		});

		document.getElementById('partnerEmail').addEventListener('input', () => updateMiniQrCard());

		function updatePartnerActiveText() {
			document.getElementById('partnerActiveLabel').textContent = document.getElementById('partnerActive').checked ? 'Ativo' : 'Inativo';
		}

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

		const partnerTypeEl = document.getElementById('partnerType');
		if (partnerTypeEl) partnerTypeEl.addEventListener('change', updateDocLabel);

		const partnerCepEl = document.getElementById('partnerCep');
		if (partnerCepEl) partnerCepEl.addEventListener('blur', (e) => fetchAddressByCep(e.target.value));

		const partnerActiveEl = document.getElementById('partnerActive');
		if (partnerActiveEl) partnerActiveEl.addEventListener('change', updatePartnerActiveText);
		
		document.getElementById('savePartner').addEventListener('click', async () => {
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
					const index = partners.findIndex(p => p.id === editingPartnerId);
					if (index !== -1) partners[index] = { id: editingPartnerId, ...partnerData };
				} else {
					partnerData.createdAt = new Date().toISOString();
					const docRef = await userRef('partners').add(partnerData);
					partners.push({ id: docRef.id, ...partnerData });
				}
				renderPartners();
				document.getElementById('partnerModal').style.display = 'none';
			} catch (error) {
				console.error('Erro ao salvar parceiro:', error);
				alert('Erro ao salvar.');
			}
		});
		
		// Eventos dos filtros
		if (document.getElementById('partnerSearchFilter')) document.getElementById('partnerSearchFilter').addEventListener('input', renderPartners);
		document.getElementById('partnerTypeFilter').addEventListener('change', renderPartners);
		document.getElementById('partnerStatusFilter').addEventListener('change', renderPartners);
		
		// Evento de Limpar Filtros
		document.getElementById('clearPartnerFiltersBtn').addEventListener('click', () => {
			if (document.getElementById('partnerSearchFilter')) document.getElementById('partnerSearchFilter').value = '';
			document.getElementById('partnerTypeFilter').value = 'all';
			document.getElementById('partnerStatusFilter').value = 'all';
			renderPartners();
			showToast('Filtros restaurados', 'success');
		});
		
		// =========================================================================
        // MOTOR DO GERADOR DE RECIBOS EM 3 ETAPAS
        // =========================================================================
        let currentRStep = 1;
        let receiptEligibleTxs = [];

        const receiptGeneratorModal = document.getElementById('receiptGeneratorModal');
        const btnOpenReceiptGen = document.getElementById('generateReceiptBtn');
        const btnCloseReceiptGen = document.getElementById('closeReceiptGenModal');
        const rPrevBtn = document.getElementById('rPrevBtn');
        const rNextBtn = document.getElementById('rNextBtn');
        const rDownloadBtn = document.getElementById('rDownloadBtn');

        const partnerSelect = document.getElementById('receiptPartnerSelect');
        const monthSelect = document.getElementById('receiptMonthSelect');
        const rTxList = document.getElementById('receiptTxList');
        const rTotalPreview = document.getElementById('receiptTotalPreview');
        const selectAllReceiptTx = document.getElementById('selectAllReceiptTx');

        // Lógica do botão "Selecionar Todos" (Recibo)
        if (selectAllReceiptTx) {
            selectAllReceiptTx.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                document.querySelectorAll('.rtx-checkbox').forEach(cb => {
                    cb.checked = isChecked;
                });
                updateRTotal();
            });
        }

        // 1. Abrir o Modal e Preparar Etapa 1
        const receiptMonthGroup = document.getElementById('receiptMonthGroup');
        
        if (btnOpenReceiptGen) {
            btnOpenReceiptGen.addEventListener('click', async () => {
                await loadPartners();
                
                partnerSelect.innerHTML = '<option value="" disabled selected>Selecione um parceiro...</option>';
                partners.filter(p => p.active !== false).forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = p.name;
                    partnerSelect.appendChild(opt);
                });

                // Seta o mês atual como padrão e esconde a caixa até o parceiro ser selecionado
                const now = new Date();
                monthSelect.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                receiptMonthGroup.style.display = 'none';

                goToRStep(1);
                receiptGeneratorModal.style.display = 'flex';
            });
        }

        // Fechar Modal
        btnCloseReceiptGen.addEventListener('click', () => receiptGeneratorModal.style.display = 'none');

        // Validar Liberação do botão Continuar e Efeito Cascata
        function checkRStep1Valid() {
            if (currentRStep === 1) {
                rNextBtn.disabled = !(partnerSelect.value && monthSelect.value);
            }
        }

        partnerSelect.addEventListener('change', () => {
            if (partnerSelect.value) {
                receiptMonthGroup.style.display = 'block'; // Efeito cascata: revela o mês
            }
            checkRStep1Valid();
        });
        
        monthSelect.addEventListener('change', checkRStep1Valid);

        // 2. Navegação entre as Etapas (Agora apenas 2 etapas!)
        function goToRStep(step) {
            currentRStep = step;
            
            // Bolinhas
            document.querySelectorAll('#receiptStepIndicator .step').forEach((s, idx) => {
                s.classList.toggle('active', idx + 1 <= step);
            });
            
            // Abas
            document.querySelectorAll('#receiptGeneratorModal .step-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`rStep${step}`).classList.add('active');

            rPrevBtn.disabled = (step === 1);

            if (step === 1) {
                rNextBtn.style.display = 'inline-block';
                rDownloadBtn.style.display = 'none';
                rNextBtn.textContent = 'Buscar Lançamentos';
                checkRStep1Valid();
            } else if (step === 2) {
                rNextBtn.style.display = 'none';
                rDownloadBtn.style.display = 'flex';
                rDownloadBtn.disabled = true; // Só ativa se marcar caixinha
                if (selectAllReceiptTx) selectAllReceiptTx.checked = false;
                loadReceiptTransactions();
            }
        }

        rNextBtn.addEventListener('click', () => goToRStep(currentRStep + 1));
        rPrevBtn.addEventListener('click', () => goToRStep(currentRStep - 1));

        // 3. Etapa 2: Carregar Listagem e Calcular Total
        function loadReceiptTransactions() {
            const partnerId = partnerSelect.value;
            const monthStr = monthSelect.value; // YYYY-MM
            
            // Filtro de Segurança: parceiro, mês, não-transferência E EFETIVAMENTE PAGO (isPaid)
            receiptEligibleTxs = transactions.filter(t => 
                t.partnerId === partnerId && 
                t.date.startsWith(monthStr) &&
                t.type !== 'transfer' &&
                t.isPaid === true
            ).sort((a, b) => new Date(a.date) - new Date(b.date));

            if (receiptEligibleTxs.length === 0) {
                rTxList.innerHTML = '<div class="receipt-empty-msg" style="padding: 16px; text-align: center;">Nenhum registro encontrado para este parceiro no período selecionado.</div>';
                if (selectAllReceiptTx) selectAllReceiptTx.disabled = true;
                return;
            }
            if (selectAllReceiptTx) selectAllReceiptTx.disabled = false;

            let html = '';
            receiptEligibleTxs.forEach(t => {
                const isIncome = t.type === 'income';
                // Agora usamos CSS classes em vez de injetar cores fixas
                const valClass = isIncome ? 'receipt-val-income' : 'receipt-val-expense';
                const sign = isIncome ? '+' : '-';
                const statusLabel = t.isPaid ? '(Pago)' : '(Pendente)';
                
                html += `
                    <label class="receipt-tx-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #f1f3f4; cursor: pointer; transition: background 0.2s; border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <input type="checkbox" class="rtx-checkbox" value="${t.id}" style="width: 18px; height: 18px; accent-color: #1a73e8;">
                            <div>
                                <div class="receipt-item-desc" style="font-weight: 500;">${t.description} <small style="color: #9aa0a6; font-weight: normal;">${statusLabel}</small></div>
                                <div style="font-size: 0.8rem; color: #5f6368;">${formatDate(t.date)}</div>
                            </div>
                        </div>
                        <div class="${valClass}" style="font-weight: 600;">
                            ${sign}${formatCurrency(t.value)}
                        </div>
                    </label>
                `;
            });
            rTxList.innerHTML = html;

            document.querySelectorAll('.rtx-checkbox').forEach(cb => {
                cb.addEventListener('change', updateRTotal);
            });
            updateRTotal();
        }

        function updateRTotal() {
            let total = 0;
            let checkedCount = 0;
            
            document.querySelectorAll('.rtx-checkbox:checked').forEach(cb => {
                checkedCount++;
                const t = receiptEligibleTxs.find(x => x.id === cb.value);
                if (t) {
                    total += (t.type === 'income' ? t.value : -t.value);
                }
            });
            
            // Remove as cores inline antigas e aplica a classe dinâmica
            rTotalPreview.style.color = '';
            rTotalPreview.className = total >= 0 ? 'receipt-total-positive' : 'receipt-total-negative';
            rTotalPreview.textContent = `Total do Recibo: ${formatCurrency(Math.abs(total))}`;
            rDownloadBtn.disabled = checkedCount === 0;
            
            // Marca o "Selecionar Todos" automaticamente se todos estiverem checados
            const allCheckboxes = document.querySelectorAll('.rtx-checkbox');
            if (selectAllReceiptTx && allCheckboxes.length > 0) {
                selectAllReceiptTx.checked = (checkedCount === allCheckboxes.length);
            }
        }

        // 4. Geração Profissional do PDF
        rDownloadBtn.addEventListener('click', () => {
            const selectedIds = Array.from(document.querySelectorAll('.rtx-checkbox:checked')).map(cb => cb.value);
            const txsToPrint = receiptEligibleTxs.filter(t => selectedIds.includes(t.id));
            if(txsToPrint.length === 0) return;

            const partner = partners.find(p => p.id === partnerSelect.value);
            let totalIncome = 0;
            let totalExpense = 0;
            let rowsHtml = '';
            
            // Vamos rastrear todas as formas de pagamento usadas nestes lançamentos
            const usedPaymentMethods = new Set();

            txsToPrint.forEach(t => {
                if (t.type === 'income') totalIncome += t.value;
                if (t.type === 'expense') totalExpense += t.value;
                
                const paymentName = getPaymentTypeNameById(t.paymentMethod);
                if (paymentName !== 'Outros') usedPaymentMethods.add(paymentName);
                
                rowsHtml += `
                    <tr>
                        <td style="padding: 12px 0; color: #5f6368; border-bottom: 1px solid #e8eaed;">${formatDate(t.date)}</td>
                        <td style="padding: 12px 0; color: #202124; border-bottom: 1px solid #e8eaed;"><strong>${t.description}</strong></td>
                        <td style="padding: 12px 0; color: #5f6368; border-bottom: 1px solid #e8eaed;">${paymentName}</td>
                        <td style="padding: 12px 0; text-align: right; color: #202124; border-bottom: 1px solid #e8eaed;">${formatCurrency(t.value)}</td>
                    </tr>
                `;
            });

            const netTotal = totalIncome - totalExpense;
            const isRecebimento = netTotal >= 0;
            const valorRecibo = Math.abs(netTotal);
            
            // Pega as formas de pagamento separadas por vírgula (ex: "Pix, Dinheiro")
            const methodsArr = Array.from(usedPaymentMethods);
            const methodsStr = methodsArr.length > 0 ? methodsArr.join(', ') : 'Não informada';
            
            // 1. Removemos a palavra "pago" daqui:
            const docStr = partner.document 
                ? `inscrito(a) no CPF/CNPJ <strong>${partner.document}</strong>` 
                : `via <strong>${methodsStr}</strong>`;
                
            const docTitle = isRecebimento ? 'RECIBO' : 'RECIBO DE PAGAMENTO';
            
            // 2. Inteligência para o Título da coluna na Tabela
            const paymentHeaderLabel = isRecebimento ? 'Forma de Recebimento' : 'Forma de Pagamento';
            
            // Texto adaptativo inteligente
            const declarationText = isRecebimento 
                ? `Recebi(emos) de <strong>${partner.name}</strong>, ${docStr}, a importância de <strong>${formatCurrency(valorRecibo)}</strong> referente aos lançamentos listados abaixo.`
                : `Declaro ter pago a <strong>${partner.name}</strong>, ${docStr}, a importância de <strong>${formatCurrency(valorRecibo)}</strong> referente aos lançamentos listados abaixo.`;

            const htmlContent = `
                <div style="width: 800px; padding: 60px 70px; background: #ffffff; color: #202124; font-family: Helvetica, Arial, sans-serif;">
                    
                    <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #1a73e8; padding-bottom: 20px;">
                        <h1 style="color: #1a73e8; margin: 0; font-size: 2.2rem; text-transform: uppercase; letter-spacing: 2px;">${docTitle}</h1>
                        <h2 style="color: #5f6368; margin: 12px 0 0 0; font-size: 1.6rem;">Valor: ${formatCurrency(valorRecibo)}</h2>
                    </div>

                    <div style="font-size: 1.2rem; line-height: 1.8; color: #202124; text-align: justify; margin-bottom: 50px; background: #f8f9fa; padding: 24px; border-radius: 12px; border: 1px solid #e8eaed;">
                        ${declarationText}
                    </div>

                    <h3 style="color: #5f6368; font-size: 1rem; text-transform: uppercase; margin-bottom: 16px;">Detalhamento de Valores</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 1.05rem; margin-bottom: 60px;">
                        <thead>
                            <tr style="text-align: left; color: #5f6368; background: #f1f3f4;">
                                <th style="padding: 12px 8px; font-weight: 600; border-radius: 8px 0 0 8px;">Data</th>
                                <th style="padding: 12px 8px; font-weight: 600;">Descrição</th>
                                <th style="padding: 12px 8px; font-weight: 600;">${paymentHeaderLabel}</th>
                                <th style="padding: 12px 8px; text-align: right; font-weight: 600; border-radius: 0 8px 8px 0;">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                        <tfoot>
                            <tr style="font-weight: bold; font-size: 1.2rem;">
                                <td colspan="3" style="padding-top: 24px; text-align: right;">Total do Recibo:</td>
                                <td style="padding-top: 24px; text-align: right; color: ${isRecebimento ? '#188038' : '#d93025'};">${formatCurrency(valorRecibo)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div style="text-align: center; margin-top: 60px; page-break-inside: avoid;">
                        <div style="margin-bottom: 12px;">__________________________________________________________________</div>
                        <strong style="font-size: 1.2rem;">Assinatura do Emissor</strong><br>
                        <span style="color: #5f6368; font-size: 0.95rem; display: block; margin-top: 8px;">Emitido em ${new Date().toLocaleDateString('pt-BR')} via ControlPess</span>
                    </div>
                </div>
            `;

            const originalBtnText = rDownloadBtn.innerHTML;
            rDownloadBtn.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">autorenew</span> Gerando...';
            rDownloadBtn.disabled = true;

            const opt = {
                margin:       [0.5, 0],
                filename:     `Recibo_${partner.name.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`,
                image:        { type: 'jpeg', quality: 1 },
                // A MÁGICA ESTÁ AQUI: scrollY: 0 zera o deslocamento fantasma da tela!
                html2canvas:  { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(htmlContent).save().then(() => {
                rDownloadBtn.innerHTML = originalBtnText;
                rDownloadBtn.disabled = false;
                receiptGeneratorModal.style.display = 'none';
                showToast('Recibo gerado com sucesso!', 'success');
            }).catch(err => {
                console.error(err);
                rDownloadBtn.innerHTML = originalBtnText;
                rDownloadBtn.disabled = false;
                showToast('Erro ao gerar recibo.', 'error');
            });
        });
		
		// =========================================================================
        // MOTOR DO GERADOR DE COBRANÇAS EM LOTE (NOVO)
        // =========================================================================
        let currentBStep = 1;
        let billingEligibleTxs = [];

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

        // 1. Abrir Modal de Cobrança
        if (btnOpenBillingGen) {
            btnOpenBillingGen.addEventListener('click', async () => {
                await loadPartners();
                await fetchPaymentTypes(); // <--- MÁGICA: Carrega os tipos de pagamento da memória!
                
                bPartnerSelect.innerHTML = '<option value="" disabled selected>Selecione um parceiro...</option>';
                partners.filter(p => p.active !== false).forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = p.name;
                    bPartnerSelect.appendChild(opt);
                });

                goToBStep(1);
                billingGeneratorModal.style.display = 'flex';
            });
        }

        if (btnCloseBillingGen) {
            btnCloseBillingGen.addEventListener('click', () => billingGeneratorModal.style.display = 'none');
        }

        function checkBStep1Valid() {
            if (currentBStep === 1) {
                bNextBtn.disabled = !bPartnerSelect.value;
            }
        }

        bPartnerSelect.addEventListener('change', checkBStep1Valid);

        // 2. Navegação entre as Etapas do Modal
        function goToBStep(step) {
            currentBStep = step;
            
            document.querySelectorAll('#billingStepIndicator .step').forEach((s, idx) => {
                s.classList.toggle('active', idx + 1 <= step);
            });
            
            document.querySelectorAll('#billingGeneratorModal .step-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`bStep${step}`).classList.add('active');

            bPrevBtn.disabled = (step === 1);

            if (step === 1) {
                bNextBtn.style.display = 'inline-block';
                bGenerateBtn.style.display = 'none';
                bNextBtn.textContent = 'Buscar Receitas Pendentes';
                checkBStep1Valid();
            } else if (step === 2) {
                bNextBtn.style.display = 'none';
                bGenerateBtn.style.display = 'flex';
                bGenerateBtn.disabled = true; 
                if (selectAllBillingTx) selectAllBillingTx.checked = false;
                loadBillingTransactions();
            }
        }

        bNextBtn.addEventListener('click', () => goToBStep(currentBStep + 1));
        bPrevBtn.addEventListener('click', () => goToBStep(currentBStep - 1));

        // 3. Buscar os Lançamentos Compatíveis com Cobrança Pix
        function loadBillingTransactions() {
            const partnerId = bPartnerSelect.value;
            const partnerNameStr = bPartnerSelect.options[bPartnerSelect.selectedIndex].text;
            
            // Filtro Inteligente: Parceiro exato, Receita, Pendente e com "Pix" na forma de pagamento
            billingEligibleTxs = transactions.filter(t => {
                // Trava 1: Parceiro (Verifica pelo ID ou pelo Nome para garantir lançamentos antigos)
                if (t.partnerId !== partnerId && t.partnerName !== partnerNameStr) return false;
                
                // Trava 2: Tem que ser Receita
                if (t.type !== 'income') return false;
                
                // Trava 3: Tem que estar Pendente (Não pago)
                if (t.isPaid === true) return false; 
                
                // Trava 4: Forma de Pagamento (Verifica o banco de dados e também o nome salvo)
                let isPix = false;
                const pm = paymentTypes.find(p => p.id === t.paymentMethod);
                if (pm && pm.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('pix')) {
                    isPix = true;
                }
                // Fallback de segurança caso a forma de pagamento seja uma string "PIX" pura de versões anteriores
                if (t.paymentMethod && typeof t.paymentMethod === 'string' && t.paymentMethod.toLowerCase().includes('pix')) {
                    isPix = true; 
                }
                
                if (!isPix) return false;

                return true;
            }).sort((a, b) => new Date(a.date) - new Date(b.date));

            if (billingEligibleTxs.length === 0) {
                bTxList.innerHTML = '<div class="receipt-empty-msg" style="padding: 16px; text-align: center;">Nenhuma receita pendente via Pix encontrada para este parceiro.</div>';
                if (selectAllBillingTx) selectAllBillingTx.disabled = true;
                return;
            }

            if (selectAllBillingTx) selectAllBillingTx.disabled = false;
            let html = '';
            
            billingEligibleTxs.forEach(t => {
                const acc = accounts.find(a => a.id === t.accountId);
                const accName = acc ? acc.name : 'Conta Desconhecida';
                
                html += `
                    <label class="receipt-tx-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #f1f3f4; cursor: pointer; transition: background 0.2s; border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <input type="checkbox" class="btx-checkbox" value="${t.id}" style="width: 18px; height: 18px; accent-color: #1a73e8;">
                            <div>
                                <div class="receipt-item-desc" style="font-weight: 500;">${t.description}</div>
                                <div style="font-size: 0.8rem; color: #5f6368;">${formatDate(t.date)} • ${accName}</div>
                            </div>
                        </div>
                        <div class="receipt-val-income" style="font-weight: 600;">
                            +${formatCurrency(t.value)}
                        </div>
                    </label>
                `;
            });
            bTxList.innerHTML = html;

            document.querySelectorAll('.btx-checkbox').forEach(cb => {
                cb.addEventListener('change', updateBTotal);
            });
            updateBTotal();
        }

        // Lógica do botão "Selecionar Todos"
        if (selectAllBillingTx) {
            selectAllBillingTx.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                document.querySelectorAll('.btx-checkbox').forEach(cb => {
                    cb.checked = isChecked;
                });
                updateBTotal();
            });
        }

        function updateBTotal() {
            let total = 0;
            let checkedCount = 0;
            
            document.querySelectorAll('.btx-checkbox:checked').forEach(cb => {
                checkedCount++;
                const t = billingEligibleTxs.find(x => x.id === cb.value);
                if (t) total += t.value;
            });
            
            bTotalPreview.textContent = `Total da Fatura: ${formatCurrency(total)}`;
            bGenerateBtn.disabled = checkedCount === 0;
            
            // Marca o "Selecionar Todos" automaticamente se todos estiverem checados
            const allCheckboxes = document.querySelectorAll('.btx-checkbox');
            if (selectAllBillingTx && allCheckboxes.length > 0) {
                selectAllBillingTx.checked = (checkedCount === allCheckboxes.length);
            }
        }

        // 4. Validações e Geração do PDF
        bGenerateBtn.addEventListener('click', async () => {
            const selectedIds = Array.from(document.querySelectorAll('.btx-checkbox:checked')).map(cb => cb.value);
            const txsToPrint = billingEligibleTxs.filter(t => selectedIds.includes(t.id));
            if (txsToPrint.length === 0) return;

            // VALIDAÇÃO DE SEGURANÇA: Checa se todos os lançamentos são da mesma conta financeira
            const firstAccountId = txsToPrint[0].accountId;
            const hasMultipleAccounts = txsToPrint.some(t => t.accountId !== firstAccountId);
            
            if (hasMultipleAccounts) {
                showToast('ERRO: Você selecionou receitas de Contas Financeiras diferentes. A cobrança Pix só pode ser enviada para uma única conta por fatura.', 'error');
                return;
            }

            // Busca os detalhes da Conta
            const acc = accounts.find(a => a.id === firstAccountId);
            const hasPixKeys = acc && ((acc.pixKeys && acc.pixKeys.length > 0) || acc.pixKey1 || acc.pixKey2 || acc.pixKey3);
            if (!hasPixKeys) {
                
                // --- MÁGICA DE UX: MODAL INTERATIVO COM REDIRECIONAMENTO ---
                const irParaConfig = await askConfirmation(
                    'Conta Incompleta',
                    `A conta financeira vinculada a estas receitas não possui Chaves Pix cadastradas. Configure as chaves para gerar a cobrança.`,
                    'Configurar Conta',
                    false, 
                    'settings'
                );

                if (irParaConfig) {
                    // 1. Fecha o modal de cobrança abortando a ação atual
                    billingGeneratorModal.style.display = 'none';

                    // 2. Navega automaticamente para a tela de Contas
                    setActiveView('accounts');

                    // 3. Abre a conta que deu problema para edição
                    setTimeout(() => {
                        openAccountModal(firstAccountId);
                        
                        // 4. Auto-Foco Brilhante: Rola a tela e destaca a área do Pix
                        setTimeout(() => {
                            const containerPix = document.getElementById('accountPixConfig');
                            if (containerPix) {
                                containerPix.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                
                                // Aplica um "glow" azulado chamativo para o usuário não se perder
                                containerPix.style.transition = 'all 0.3s ease';
                                containerPix.style.background = 'rgba(26,115,232,0.05)';
                                containerPix.style.boxShadow = '0 0 0 4px rgba(26,115,232,0.3)';
                                
                                // O efeito some magicamente após 3 segundos
                                setTimeout(() => {
                                    containerPix.style.boxShadow = '';
                                    containerPix.style.background = document.body.classList.contains('dark-mode') ? 'var(--cor-superficie-dark)' : '#f8f9fa';
                                }, 3000);
                            }
                        }, 400); // Aguarda o modal de conta renderizar
                    }, 300); // Aguarda a troca de tela do fundo
                }
                
                return; // Para a geração do PDF aqui!
            }

            // Pergunta a chave Pix (Usa a mesma inteligência que criamos no outro passo)
            const chaveEscolhida = await askPixKeySelection(acc);
            if (!chaveEscolhida) return; // Se o usuário fechar o modal, aborta.

            // Prepara a lista injetando a Chave Pix escolhida para que o Motor de PDF consiga ler
            const txsWithKey = txsToPrint.map(t => ({
                ...t,
                cobrancaPixKey: chaveEscolhida,
                partnerName: bPartnerSelect.options[bPartnerSelect.selectedIndex].text
            }));

            // Fecha o Modal e chama o Motor de PDF!
            billingGeneratorModal.style.display = 'none';
            window.gerarFaturaCobrancaPDF(txsWithKey);
        });
		
		// =========================================================================
		// MÓDULO DE CONTAS FINANCEIRAS (CRUD E BRASIL API)
		// =========================================================================
		let editingAccountId = null;
		let allBanks = [];

		const accountsView = document.getElementById('accountsView');
		const accountsList = document.getElementById('accountsList');
		const accountModal = document.getElementById('accountModal');
		
		// Campos do Form Inteligente
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
		
		// Toggles
		const accountShowDash = document.getElementById('accountShowDash');
		const accountIncludeKPI = document.getElementById('accountIncludeKPI');
		const accountHasCreditCard = document.getElementById('accountHasCreditCard');
		const accountActive = document.getElementById('accountActive');
		const accountActiveLabel = document.getElementById('accountActiveLabel');
		
		const tabCartoesBtn = document.getElementById('tabCartoesBtn');

		// 1. Integrar e Adicionar a Tela ao Menu
		

        // --- INTELIGÊNCIA CENTRAL DE LOGOTIPOS (BLINDADA COM ISPB) ---
        function getBankLogoHtml(bankName, ispb) {
            if (!bankName || bankName === 'Outros') {
                return '<span class="material-icons" style="color: #9aa0a6;">account_balance_wallet</span>';
            }
            
            // 1. Mapeamento 100% preciso pelo ISPB (Evita o bug Mercantil x BB)
            const ispbDomainMap = {
                '00000000': 'bb.com.br',        // Banco do Brasil
                '00360305': 'caixa.gov.br',     // Caixa
                '60701190': 'itau.com.br',      // Itaú
                '60746948': 'bradesco.com.br',  // Bradesco
                '90400888': 'santander.com.br', // Santander
                '18236120': 'nubank.com.br',    // Nubank
                '00416968': 'bancointer.com.br',// Banco Inter
                '31872495': 'c6bank.com.br',    // C6 Bank
                '22896431': 'picpay.com',       // PicPay
                '10573521': 'mercadopago.com.br',// Mercado Pago
                '13220451': 'pagbank.com.br',   // PagSeguro
                'FLASH': 'flashapp.com.br'      // Flash Benefícios (Customizado)
            };

            let domain = null;
            
            // Primeiro tenta pelo Código Único (ISPB)
            if (ispb && ispbDomainMap[ispb]) {
                domain = ispbDomainMap[ispb];
            } else {
                // 2. Fallback Seguro por Nome (Regras mais inteligentes)
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

		// 2. Buscar Bancos na Brasil API e Lógica da Busca
		async function fetchBanksFromAPI() {
			if(allBanks.length > 0) return; // Cache local
			try {
				const res = await fetch('https://brasilapi.com.br/api/banks/v1');
				const data = await res.json();
				allBanks = data.filter(b => b.code && b.name);
                
                // --- INJETAR FINTECHS MANUAIS ---
                allBanks.push({ ispb: 'FLASH', code: '---', name: 'FLASH BENEFÍCIOS' });
                
                // Força o PicPay a ter um nome mais "amigável" para a busca se necessário
                const picpay = allBanks.find(b => b.ispb === '22896431');
                if (picpay) picpay.name = 'PICPAY (INSTITUIÇÃO DE PAGAMENTO)';

				allBanks.sort((a,b) => a.name.localeCompare(b.name));
			} catch (e) {
				console.error("Erro ao buscar bancos", e);
			}
		}

        function renderBankList(filterText = '') {
            // Ampliamos a lista de sugestões iniciais com as Fintechs
            const topBanks = [
                'BCO DO BRASIL S.A.', 'CAIXA ECONOMICA FEDERAL', 'BCO SANTANDER (BRASIL) S.A.', 
                'ITAÚ UNIBANCO S.A.', 'BCO BRADESCO S.A.', 'NU PAGAMENTOS S.A. - INSTITUIÇÃO DE PAGAMENTO', 
                'BCO INTER S.A.', 'PICPAY (INSTITUIÇÃO DE PAGAMENTO)', 'MERCADO PAGO INSTITUIÇÃO DE PAGAMENTO LTDA.',
                'FLASH BENEFÍCIOS'
            ];
            let html = `<div class="custom-dropdown-item" data-ispb="Outros" data-name="Outros">Outro Banco / Carteira Física</div>`;
            
            const lowerFilter = filterText.toLowerCase();
            
            if (filterText === '') {
                // Mostra top bancos se não digitou nada
                topBanks.forEach(tb => {
                    const bank = allBanks.find(b => b.name === tb);
                    if(bank) html += `<div class="custom-dropdown-item" data-ispb="${bank.ispb}" data-name="${bank.name}"><strong>${bank.code}</strong> - ${bank.name}</div>`;
                });
                html += `<div style="padding: 4px 16px; font-size: 0.8rem; color: #9aa0a6; background: #f8f9fa;">Comece a digitar para ver mais bancos...</div>`;
            } else {
                // Filtra pelo que foi digitado (código ou nome)
                const filteredBanks = allBanks.filter(b => b.name.toLowerCase().includes(lowerFilter) || (b.code && b.code.toString().includes(lowerFilter)));
                filteredBanks.forEach(b => {
                    html += `<div class="custom-dropdown-item" data-ispb="${b.ispb}" data-name="${b.name}"><strong>${b.code}</strong> - ${b.name}</div>`;
                });
                if(filteredBanks.length === 0) html += `<div style="padding: 12px 16px; color: #d93025;">Nenhum banco encontrado.</div>`;
            }

            accountBankList.innerHTML = html;

            // Ação de Selecionar o Banco
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

        // 3. Eventos da Barra de Busca Inteligente
        accountBankSearch.addEventListener('focus', () => {
            renderBankList(accountBankSearch.value);
            accountBankList.style.display = 'block';
        });

        accountBankSearch.addEventListener('input', (e) => {
            renderBankList(e.target.value);
            accountBankList.style.display = 'block';
            accountBankValue.value = ''; // Reseta se o cara voltar a digitar
        });

        // Fechar dropdown se clicar fora
        document.addEventListener('click', (e) => {
            if (!document.getElementById('bankSelectorBox').contains(e.target)) {
                accountBankList.style.display = 'none';
            }
        });

		// 4. Carregar e Renderizar Contas
		async function loadAccounts() {
			if (!currentUser) return;
			const snapshot = await userRef('accounts').get();
			accounts = snapshot.docs.map(doc => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
			renderAccounts();
		}

		function renderAccounts() {
			if (accounts.length === 0) {
				accountsList.innerHTML = '<div class="empty-message" style="grid-column: 1 / -1;">Nenhuma conta cadastrada. Clique em "Nova conta" para começar.</div>';
				return;
			}
			
            const typeFilter = document.getElementById('accountTypeFilter').value;
			const statusFilter = document.getElementById('accountStatusFilter').value;

			let filtered = accounts.filter(a => {
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
				
                // Recupera a logo pela inteligência central
                let logoHtml = getBankLogoHtml(acc.bankName, acc.bankIspb);

                // Prepara os ícones extras (Cartão de Crédito e Dashboard)
                let iconesExtras = '';
                if (acc.hasCreditCard) {
                    iconesExtras += `<span class="material-icons" style="font-size:1.2rem; color:#1a73e8; cursor:pointer; padding:4px; margin:-4px; border-radius:50%; background:rgba(26,115,232,0.1);" title="Abrir Fatura" onclick="event.stopPropagation(); abrirCarteira('${escapeJsAttr(acc.id)}')">credit_card</span>`;
                }
                if (acc.showOnDashboard) {
                    iconesExtras += `<span class="material-icons" style="font-size:1.1rem; color:#1a73e8;" title="No Dashboard">dashboard</span>`;
                }

                const subtituloConta = `${acc.bankName || 'Outros'} • ${acc.type}`;
                const saldoFormatado = formatCurrency(acc.balance || 0);

                // A mágica: chamamos a nossa fábrica de cartões!
                html += criarHtmlCartaoConta(acc.id, logoHtml, statusClass, statusText, acc.name, subtituloConta, balClass, saldoFormatado, iconesExtras);
			});
			accountsList.innerHTML = html;

			document.querySelectorAll('.account-card').forEach(card => {
				card.addEventListener('click', () => openAccountDetails(card.dataset.id));
			});
            
			// NOVO: Aplica a regra do olhinho assim que termina de desenhar as contas!
			updatePrivacyMode();
		}
		
		// -------------------------------------------------------------
        // ABRE O RESUMO DA CONTA (Estilo Banco do Brasil)
        // -------------------------------------------------------------
        function openAccountDetails(id) {
            const acc = accounts.find(a => a.id === id);
            if (!acc) return;
            
            // 1. Preenche o Cabeçalho
            document.getElementById('detAccountName').textContent = acc.name;
            document.getElementById('detBankLogo').innerHTML = getBankLogoHtml(acc.bankName, acc.bankIspb);
            
            // 2. Preenche os Valores de Saldo
            const balFormat = formatCurrency(acc.balance || 0);
            const isNegative = acc.balance < 0;
            
            const balElement = document.getElementById('detAccountBalance');
            balElement.textContent = balFormat;
            balElement.style.color = isNegative ? '#d93025' : ''; // Vermelho se negativo
            
            document.getElementById('detBalanceDay').textContent = balFormat;
            document.getElementById('detBalanceDay').style.color = isNegative ? '#d93025' : '';
            
            document.getElementById('detBalanceAvailable').textContent = balFormat;
            document.getElementById('detBalanceAvailable').style.color = isNegative ? '#d93025' : '';
            
            document.getElementById('detAccountType').textContent = acc.type;
            
            // 3. Lógica das Abas (Conta vs Cartão)
            const tabConta = document.getElementById('bbTabConta');
            const tabCartao = document.getElementById('bbTabCartao');
            const contentConta = document.getElementById('accDetailsContent');
            const contentCartao = document.getElementById('accWalletContent');

            // Sempre que abrir o modal, reseta para mostrar a aba "Conta" primeiro
            tabConta.classList.add('active');
            tabCartao.classList.remove('active');
            contentConta.style.display = 'block';
            contentCartao.style.display = 'none';
            document.getElementById('accountDetailsModal').classList.remove('expanded');

            // Evento de clique na aba "Conta"
            tabConta.onclick = () => {
                tabConta.classList.add('active');
                tabCartao.classList.remove('active');
                contentConta.style.display = 'block';
                contentCartao.style.display = 'none';
                document.getElementById('accountDetailsModal').classList.remove('expanded');
            };

            // Regra da aba "Cartão" (Só aparece se a conta tiver cartão ativado)
            if (acc.hasCreditCard) {
                tabCartao.style.display = 'block'; // Fica lado a lado no container
                tabCartao.onclick = () => {
                    tabCartao.classList.add('active');
                    tabConta.classList.remove('active');
                    contentConta.style.display = 'none';
                    contentCartao.style.display = 'block';
                    
                    // Desenha os dados da carteira na gaveta nova (Faremos isso na próxima etapa)
                    abrirCarteira(id, 0, true, true); 
                };
            } else {
                tabCartao.style.display = 'none';
            }
            
            // 4. Botão Configurações (Abre o modal antigo de edição)
            const btnConfig = document.getElementById('btnOpenConfig');
            btnConfig.onclick = () => {
                document.getElementById('accountDetailsModal').style.display = 'none';
                openAccountModal(id);
            };
            
            document.getElementById('accountDetailsModal').style.display = 'flex';
        }

        // Fechar o Resumo
        document.getElementById('closeAccountDetailsBtn').addEventListener('click', () => {
            document.getElementById('accountDetailsModal').style.display = 'none';
        });
        
        // Clicar fora para fechar
        document.getElementById('accountDetailsModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('accountDetailsModal')) {
                document.getElementById('accountDetailsModal').style.display = 'none';
            }
        });

		// 5. Abrir Modal (Novo ou Edição)
		async function openAccountModal(id = null) {
			editingAccountId = id;
            document.getElementById('accountModalTitle').textContent = id ? 'Editar Conta' : 'Nova Conta';
			await fetchBanksFromAPI(); // Garante que a API foi chamada

			if (id) {
				const acc = accounts.find(a => a.id === id);	
                
                // BLINDAGEM: Se for a conta do sistema, some com o botão Excluir do rodapé
                if (acc && acc.isSystem) {
                    document.getElementById('deleteAccountBtn').style.display = 'none';
                } else {
                    document.getElementById('deleteAccountBtn').style.display = 'inline-block';
                }	
				
                // --- NOVA LÓGICA DO BANCO (Busca Inteligente) ---
                accountBankValue.value = acc.bankIspb || 'Outros';
                accountBankSearch.value = (acc.bankIspb !== 'Outros' && acc.bankName) ? acc.bankName : 'Outro Banco / Carteira Física';
                accBankLogo.innerHTML = getBankLogoHtml(acc.bankName, acc.bankIspb);
                accBankLogo.style.background = (acc.bankIspb === 'Outros') ? 'white' : 'transparent';
                // ------------------------------------------------

				accountNameInput.value = acc.name;
				accountTypeInput.value = acc.type;
				
				// Trava o saldo na edição
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

                // Carrega a configuração do limite
                document.getElementById('accountLimitType').value = acc.limitType || 'individual';
                document.getElementById('accountGlobalLimit').value = acc.globalLimit ? formatCurrency(acc.globalLimit) : '';

                // --- CARREGA AS CHAVES PIX ---
                currentAccountPixKeys = acc.pixKeys ? [...acc.pixKeys] : [];
                // Se a conta for antiga, migra as chaves fixas pro novo formato de lista
                if (currentAccountPixKeys.length === 0) {
                    if (acc.pixKey1) currentAccountPixKeys.push({ type: 'Desconhecido', value: acc.pixKey1 });
                    if (acc.pixKey2) currentAccountPixKeys.push({ type: 'Desconhecido', value: acc.pixKey2 });
                    if (acc.pixKey3) currentAccountPixKeys.push({ type: 'Desconhecido', value: acc.pixKey3 });
                }

                // --- CARREGA OS DADOS DO CARTÃO ---
                currentAccountCards = acc.cards ? [...acc.cards] : [];
                
                // MIGRAR CARTÃO ANTIGO: Se a conta tem cartão no modelo antigo, converte automaticamente!
                if (acc.hasCreditCard && currentAccountCards.length === 0 && acc.ccName) {
                    currentAccountCards.push({
                        id: 'legacy_' + Date.now(), name: acc.ccName, last4: '****', brand: 'Outra', typeFormat: 'Físico',
                        limit: acc.ccLimit || 0, color: acc.ccColor || '#ff7a00', isPrepaid: false,
                        closingDay: acc.ccClosingDay || 1, dueDay: acc.ccDueDay || 10
                    });
                }

			} else {
				// Nova Conta
				document.getElementById('deleteAccountBtn').style.display = 'none'; // Esconde na criação
				document.getElementById('accountForm').reset();
				
                // --- NOVA LÓGICA DO BANCO (Busca Inteligente) ---
                accountBankValue.value = '';
                accountBankSearch.value = '';
                accBankLogo.innerHTML = '<span class="material-icons" style="color: #9aa0a6;">account_balance</span>';
                accBankLogo.style.background = 'white';
                // ------------------------------------------------
				
                // Libera o saldo na criação
				accountBalanceLabel.textContent = 'Saldo Inicial (R$) *';
				accountBalanceInput.value = 'R$ 0,00';
				accountBalanceInput.disabled = false;
				accountBalanceHelper.textContent = 'Defina o saldo para começar. (Não editável depois)';
				accountBalanceHelper.style.color = '#1a73e8';

				accountShowDash.checked = true;
				accountIncludeKPI.checked = true;
				accountHasCreditCard.checked = false;
				accountActive.checked = true;
                
                // --- LIMPA AS CHAVES PIX PARA NOVA CONTA ---
                currentAccountPixKeys = [];

                // Limpa o estojo para a nova conta
                currentAccountCards = [];
			}
            
            // Desenha a lista de cartões assim que a tela abre
            renderAccountCardsList();
            document.getElementById('cardFormView').style.display = 'none';
            document.getElementById('cardsListView').style.display = 'block';

            // Desenha a lista de chaves Pix assim que a tela abre
            renderAccountPixKeysList();
            document.getElementById('pixKeyFormView').style.display = 'none';
            document.getElementById('pixKeysListView').style.display = 'block';

			accountHasCreditCard.dispatchEvent(new Event('change'));
			accountActive.dispatchEvent(new Event('change'));
			
			// --- INJETA OS CHIPS DE FORMAS DE PAGAMENTO ---
			await fetchPaymentTypes(); // Garante que a lista de pagamentos está carregada
			const chipsContainer = document.getElementById('accountPaymentTypesContainer');
			chipsContainer.innerHTML = '';
			
			// Se estiver editando, busca o que já foi salvo. Se for nova conta, o array fica vazio.
			const accPaymentTypes = id ? (accounts.find(a => a.id === id).acceptedPaymentTypes || []) : [];

			// Cria um botão (Chip) para cada tipo de pagamento ativo no seu sistema
			paymentTypes.filter(pt => pt.active !== false).forEach(pt => {
				// Se for uma conta nova, já vem tudo marcado para facilitar. Se for edição, olha no banco.
				const isChecked = id ? accPaymentTypes.includes(pt.id) : true; 
				chipsContainer.innerHTML += `
					<div class="payment-chip">
						<input type="checkbox" id="chip_pt_${pt.id}" value="${pt.id}" ${isChecked ? 'checked' : ''}>
						<label for="chip_pt_${pt.id}">${pt.description}</label>
					</div>
				`;
			});
			
            // --- LÓGICA INTELIGENTE: MOSTRAR/ESCONDER SESSÃO PIX ---
            function verificarExibicaoPix() {
                const pixConfigDiv = document.getElementById('accountPixConfig');
                let temPixMarcado = false;
                
                // Varre todos os chips que estão marcados
                document.querySelectorAll('#accountPaymentTypesContainer input[type="checkbox"]:checked').forEach(cb => {
                    const label = document.querySelector(`label[for="${cb.id}"]`);
                    // Se o texto do chip contiver "pix" (ignorando maiúsculas), dispara o gatilho
                    if (label && label.textContent.toLowerCase().includes('pix')) {
                        temPixMarcado = true;
                    }
                });
                
                pixConfigDiv.style.display = temPixMarcado ? 'block' : 'none';
            }

            // Escuta os cliques nos chips criados
            document.querySelectorAll('#accountPaymentTypesContainer input[type="checkbox"]').forEach(cb => {
                cb.addEventListener('change', verificarExibicaoPix);
            });

            // Roda a verificação inicial para exibir ou esconder logo que o modal abre
            verificarExibicaoPix();

            document.querySelector('[data-target="tabContaGeral"]').click();
			accountModal.style.display = 'flex';
            
            // NOVO: Reseta o rastreador logo após a tela carregar os dados
            setTimeout(() => { accountFormHasChanges = false; }, 100);
		}

		// --- NOVO: RASTREADOR DE ALTERAÇÕES NA CONTA ---
        let accountFormHasChanges = false;

        // Monitora qualquer digitação ou clique dentro do formulário da conta
        document.getElementById('accountForm').addEventListener('input', () => { accountFormHasChanges = true; });
        document.getElementById('accountForm').addEventListener('change', () => { accountFormHasChanges = true; });

		// Botões de Abrir/Fechar
		document.getElementById('openAccountModalBtn').addEventListener('click', () => openAccountModal());
		
        // Tenta fechar no X
        document.getElementById('closeAccountModal').addEventListener('click', () => {
            if (accountFormHasChanges) {
                showToast('Você tem alterações não salvas! Por favor, clique em "Salvar Conta" no rodapé.', 'warning');
                return; // Impede que o modal feche
            }
            accountModal.style.display = 'none';
        });
        
        // Tenta fechar no Cancelar
		document.getElementById('cancelAccount').addEventListener('click', () => {
            if (accountFormHasChanges) {
                showToast('Você tem alterações não salvas! Por favor, clique em "Salvar Conta" no rodapé.', 'warning');
                return; // Impede que o modal feche
            }
            accountModal.style.display = 'none';
        });

		// Mascara de Moeda no Saldo Inicial
		accountBalanceInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if(value.length === 0) { e.target.value = ''; return; }
            e.target.value = formatarMoeda(value);
        });

		// 6. Lógicas Especiais dos Toggles
		accountActive.addEventListener('change', async function() {
			const label = document.getElementById('accountActiveLabel');
			label.textContent = this.checked ? 'Conta Ativa' : 'Conta Inativa';
			
			// Regra de Ouro: Não pode desativar se tiver saldo!
			if (!this.checked && editingAccountId) {
				const acc = accounts.find(a => a.id === editingAccountId);
				if (acc && acc.balance > 0) {
					this.checked = true; // Força voltar
					label.textContent = 'Conta Ativa';
					showToast('Não é possível inativar uma conta com saldo positivo. Zere a conta via transferência ou lançamento antes.', 'warning');
				}
			}
		});

		accountHasCreditCard.addEventListener('change', function() {
            const limitConfigDiv = document.getElementById('accountLimitConfig');
			if (this.checked) {
				tabCartoesBtn.style.display = 'block';
                limitConfigDiv.style.display = 'block';
                document.getElementById('accountLimitType').dispatchEvent(new Event('change')); // Atualiza
			} else {
				tabCartoesBtn.style.display = 'none';
                limitConfigDiv.style.display = 'none';
				document.querySelector('[data-target="tabContaGeral"]').click();
			}
		});

        // Toggle do Tipo de Limite
        document.getElementById('accountLimitType').addEventListener('change', function() {
            const limitGroup = document.getElementById('accountGlobalLimitGroup');
            limitGroup.style.display = this.value === 'shared' ? 'block' : 'none';
        });

        // Mascara do Limite Global
        document.getElementById('accountGlobalLimit').addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if(value.length === 0) { e.target.value = ''; return; }
            e.target.value = formatarMoeda(value);
        });

        // Abas do Modal de Contas
        document.querySelectorAll('#accountTabs .tab-btn').forEach(btn => {
			btn.addEventListener('click', (e) => {
				document.querySelectorAll('#accountTabs .tab-btn').forEach(b => b.classList.remove('active'));
				document.querySelectorAll('#accountModal .tab-content').forEach(c => c.classList.remove('active'));
				e.target.classList.add('active');
				document.getElementById(e.target.dataset.target).classList.add('active');
			});
		});

		// 7. Salvar Conta
		document.getElementById('saveAccount').addEventListener('click', async () => {
			const name = accountNameInput.value.trim();
			const ispb = accountBankValue.value; // Agora puxamos do novo campo oculto!
			
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
			// Captura todas as pílulas (chips) que o usuário deixou marcadas
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
                // --- SALVA AS CHAVES PIX ---
                pixKeys: currentAccountPixKeys,
                // --- SALVA O ESTOJO DE CARTÕES ---
                cards: accountHasCreditCard.checked ? currentAccountCards : [],
				acceptedPaymentTypes: acceptedPaymentTypes,
				updatedAt: new Date().toISOString()
			};

			try {
				if (editingAccountId) {
					// Edição (Saldo não entra aqui)
					await userRef('accounts').doc(editingAccountId).update(accountData);
					const index = accounts.findIndex(a => a.id === editingAccountId);
					if (index !== -1) accounts[index] = { ...accounts[index], ...accountData };
				} else {
					// Criação (Define o saldo inicial)
					accountData.balance = saldoGarantido;
					accountData.createdAt = new Date().toISOString();
					const docRef = await userRef('accounts').add(accountData);
					accounts.push({ id: docRef.id, ...accountData });
                    
                    // Grava uma transação de "Saldo Inicial" no extrato automaticamente para bater a contabilidade
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
				renderDashboard(); // Atualiza o Saldo Geral no Dashboard!
				accountModal.style.display = 'none';
				showToast('Conta salva com sucesso!', 'success');
			} catch (error) {
				console.error('Erro ao salvar conta:', error);
				showToast('Erro ao salvar conta.', 'error');
			}
		});

        // Filtros da Lista
        document.getElementById('accountTypeFilter').addEventListener('change', renderAccounts);
        document.getElementById('accountStatusFilter').addEventListener('change', renderAccounts);
		
		// 8. Excluir Conta (Com trava de segurança de Saldo)
		document.getElementById('deleteAccountBtn').addEventListener('click', async () => {
			if (!editingAccountId) return;
			
			const acc = accounts.find(a => a.id === editingAccountId);
			if (!acc) return;

			// Regra de Ouro da Contabilidade: Não pode excluir conta com saldo diferente de zero
			// (Seja positivo ou negativo, o dinheiro precisa ter um destino!)
			if (acc.balance !== 0) {
				showToast('Não é possível excluir contas com saldo. Zere a conta transferindo os valores antes.', 'error');
				return;
			}

			// Chama o nosso Modal de Confirmação Inteligente (Genérico)
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
					
					// Remove da lista local e atualiza a tela
					accounts = accounts.filter(a => a.id !== editingAccountId);
					renderAccounts();
					renderDashboard(); // Atualiza o Saldo Geral no Dashboard!
					accountModal.style.display = 'none';
					
					showToast('Conta excluída com sucesso.', 'success');
				} catch (error) {
					console.error('Erro ao excluir conta:', error);
					showToast('Erro de comunicação. Tente novamente.', 'error');
				}
			}
		});
		
        // Máscara de moeda para o campo de limite no cadastro
        document.getElementById('ccLimit').addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if(value.length === 0) { e.target.value = ''; return; }
            e.target.value = formatarMoeda(value);
        });

		// =========================================================
        // MOTOR DE MÚLTIPLOS CARTÕES (MEMÓRIA / CRUD)
        // =========================================================
        let currentAccountCards = [];
        let editingCardIndex = null;

        // --- INTELIGÊNCIA DE LOGOTIPOS DE BANDEIRA (LOCAL) E CORES DOS BANCOS ---
        function getBankColorByIspb(ispb, bankName) {
            const map = {
                '00000000': '#fced22', // Banco do Brasil (Amarelo)
                '00360305': '#005ca9', // Caixa (Azul)
                '60701190': '#ec7000', // Itaú (Laranja)
                '60746948': '#cc092f', // Bradesco (Vermelho)
                '90400888': '#cc0000', // Santander (Vermelho)
                '18236120': '#8a05be', // Nubank (Roxo)
                '00416968': '#ff7a00', // Inter (Laranja)
                '31872495': '#242424', // C6 Bank (Preto)
                '22896431': '#11c76f', // PicPay (Verde)
                '10573521': '#009ee3', // Mercado Pago (Azul)
                '13220451': '#00aba5', // PagSeguro (Verde Água)
                'FLASH': '#e20f54'     // Flash (Rosa)
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
            return '#1a73e8'; // Azul padrão se não encontrar correspondência
        }

        function getBrandLogoHtml(brand) {
            let logoUrl = '';
            switch(brand) {
                // Busca as imagens localmente. Garanta que esses arquivos existam na mesma pasta!
                case 'Mastercard': logoUrl = 'assets/img/mastercard.png'; break;
                case 'Visa': logoUrl = 'assets/img/visa.png'; break;
                case 'Elo': logoUrl = 'assets/img/elo.png'; break;
                case 'American Express': logoUrl = 'assets/img/amex.png'; break;
                case 'Hipercard': logoUrl = 'assets/img/hipercard.png'; break;
                default: return '<span class="material-icons" style="color: #9aa0a6;">credit_card</span>';
            }
            // Plano B (onerror): Se a imagem não for encontrada, ele troca na hora pelo ícone genérico do Google
            return `<img src="${logoUrl}" onerror="this.outerHTML='<span class=\\'material-icons\\' style=\\'color: #9aa0a6;\\'>credit_card</span>'" style="width: 100%; height: 100%; object-fit: contain; padding: 4px;">`;
        }

        // Atualiza a logo ao mudar o select
        const ccBrandSelect = document.getElementById('ccBrand');
        if (ccBrandSelect) {
            ccBrandSelect.addEventListener('change', (e) => {
                document.getElementById('ccBrandLogoBox').innerHTML = getBrandLogoHtml(e.target.value);
            });
        }

        function renderAccountCardsList() {
            const listEl = document.getElementById('innerCardsList');
            if (currentAccountCards.length === 0) {
                listEl.innerHTML = '<div class="empty-card-list" style="text-align: center; padding: 2rem; color: #9aa0a6; background: #f8f9fa; border-radius: 16px; border: 1px dashed #dadce0;">Nenhum cartão cadastrado.</div>';
                return;
            }
            
            let html = '';
            currentAccountCards.forEach((card, index) => {
                const limitTxt = card.isPrepaid ? 'Pré-pago' : formatCurrency(card.limit);
                // Substituímos as cores fixas pela classe 'card-list-item' para o Dark Mode
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

        window.removeCardFromList = function(index) {
            currentAccountCards.splice(index, 1);
            accountFormHasChanges = true; // NOVO: Avisa o rastreador
            renderAccountCardsList();
        }

        // --- FUNÇÃO PARA ABRIR O MODO EDIÇÃO ---
        window.editCardInList = function(index) {
            editingCardIndex = index; // Avisa o sistema que estamos editando!
            const card = currentAccountCards[index];
            
            document.getElementById('cardFormTitle').textContent = 'Editar Cartão';
            
            // Preenche o formulário com os dados do cartão
            document.getElementById('ccName').value = card.name;
            document.getElementById('ccLast4').value = card.last4 || '';
            document.getElementById('ccBrand').value = card.brand || 'Outra';
			document.getElementById('ccBrandLogoBox').innerHTML = getBrandLogoHtml(card.brand || 'Outra');
            document.getElementById('ccTypeFormat').value = card.typeFormat || 'Físico';
            document.getElementById('ccLimit').value = card.limit > 0 ? formatCurrency(card.limit) : '';
            
            // Esconde o limite do cartão se a conta gerenciar o limite de forma Global
            const limitType = document.getElementById('accountLimitType').value;
            document.getElementById('ccLimit').parentElement.style.display = limitType === 'shared' ? 'none' : 'block';

            // Carrega prioritariamente a cor salva pelo usuário; se não houver, usa a sugestão do banco
            const ispb = document.getElementById('accountBankValue').value;
            const bankName = document.getElementById('accountBankSearch').value;
            document.getElementById('ccColor').value = card.color || getBankColorByIspb(ispb, bankName);
            
            const isPrepaidEl = document.getElementById('ccIsPrepaid');
            if (isPrepaidEl) {
                isPrepaidEl.checked = card.isPrepaid || false;
                isPrepaidEl.dispatchEvent(new Event('change')); // Dispara o evento para esconder as datas se for pré-pago
            }

            const isDefaultEl = document.getElementById('ccIsDefault');
            if (isDefaultEl) {
                isDefaultEl.checked = card.isDefault || false;
            }
            
            document.getElementById('ccClosingDay').value = card.closingDay || '';
            document.getElementById('ccDueDay').value = card.dueDay || '';

            // HIERARQUIA DE SALVAMENTO: Desativa o botão de Salvar a Conta
            const saveAccountBtnMaster = document.getElementById('saveAccount');
            if (saveAccountBtnMaster) {
                saveAccountBtnMaster.disabled = true;
                saveAccountBtnMaster.style.opacity = '0.5';
                saveAccountBtnMaster.style.cursor = 'not-allowed';
            }

            // Troca a tela
            document.getElementById('cardsListView').style.display = 'none';
            document.getElementById('cardFormView').style.display = 'block';
        };

        // --- NOVO: EVENTOS DE ABRIR E FECHAR O FORMULÁRIO DE CARTÃO ---
        const btnShowCardForm = document.getElementById('btnShowCardForm');
        const saveAccountBtnMaster = document.getElementById('saveAccount'); // O Botão Mestre de Salvar Conta

        if (btnShowCardForm) {
            btnShowCardForm.addEventListener('click', () => {
                editingCardIndex = null; // Garante que é um cartão NOVO
                document.getElementById('cardFormTitle').textContent = 'Novo Cartão';
                
                // Reseta os campos para ficarem em branco
                document.getElementById('ccName').value = '';
                document.getElementById('ccLast4').value = '';
                document.getElementById('ccBrand').value = 'Mastercard';
                document.getElementById('ccBrandLogoBox').innerHTML = getBrandLogoHtml('Mastercard');
                document.getElementById('ccTypeFormat').value = 'Físico';
                document.getElementById('ccLimit').value = '';
                
                // NOVO: Esconde o limite do cartão se a conta gerenciar o limite de forma Global
                const limitType = document.getElementById('accountLimitType').value;
                document.getElementById('ccLimit').parentElement.style.display = limitType === 'shared' ? 'none' : 'block';
                
                // COR AUTOMÁTICA DA INSTITUIÇÃO FINANCEIRA
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

                // HIERARQUIA DE SALVAMENTO: Desativa o botão de Salvar a Conta!
                if (saveAccountBtnMaster) {
                    saveAccountBtnMaster.disabled = true;
                    saveAccountBtnMaster.style.opacity = '0.5';
                    saveAccountBtnMaster.style.cursor = 'not-allowed';
                }

                // Esconde a lista e mostra o formulário
                document.getElementById('cardsListView').style.display = 'none';
                document.getElementById('cardFormView').style.display = 'block';
            });
        }

        const btnHideCardForm = document.getElementById('btnHideCardForm');
        if (btnHideCardForm) {
            btnHideCardForm.addEventListener('click', () => {
                // HIERARQUIA DE SALVAMENTO: Reativa o botão Mestre
                if (saveAccountBtnMaster) {
                    saveAccountBtnMaster.disabled = false;
                    saveAccountBtnMaster.style.opacity = '1';
                    saveAccountBtnMaster.style.cursor = 'pointer';
                }

                // Esconde o formulário e volta para a lista
                document.getElementById('cardFormView').style.display = 'none';
                document.getElementById('cardsListView').style.display = 'block';
            });
        }

        // --- INTELIGÊNCIA DO CARTÃO PRÉ-PAGO (Esconde datas) ---
        const ccIsPrepaidToggle = document.getElementById('ccIsPrepaid');
        if (ccIsPrepaidToggle) {
            ccIsPrepaidToggle.addEventListener('change', function() {
                const datesGroup = document.getElementById('ccDatesGroup');
                if (datesGroup) {
                    datesGroup.style.display = this.checked ? 'none' : 'flex';
                }
            });
        }

        const btnSaveCardToList = document.getElementById('btnSaveCardToList');
        if(btnSaveCardToList) {
            // Tornamos a função assíncrona (async) para poder aguardar a resposta do modal de confirmação
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

                // TRAVA GLOBAL DE CARTÃO PRINCIPAL (VALIDAÇÃO ENTRE CONTAS)
                if (isDefault) {
                    let existingDefaultCard = null;
                    let existingDefaultAccount = null;

                    // 1. Procura se existe algum cartão principal em OUTRAS contas salvas
                    (accounts || []).forEach(acc => {
                        if (acc.id !== editingAccountId && acc.cards) {
                            acc.cards.forEach(c => {
                                if (c.isDefault) {
                                    existingDefaultCard = c;
                                    existingDefaultAccount = acc;
                                }
                            });
                        }
                    });

                    // 2. Procura se existe na PRÓPRIA lista da conta atual (outros cartões além do que está editando)
                    currentAccountCards.forEach((c, idx) => {
                        if (editingCardIndex !== null && idx === editingCardIndex) return; // ignora o próprio
                        if (c.isDefault) {
                            existingDefaultCard = c;
                            existingDefaultAccount = { name: document.getElementById('accountName').value || 'Esta Conta' };
                        }
                    });

                    // 3. Se encontrou um conflito, abre o modal de decisão
                    if (existingDefaultCard) {
                        const accLabel = existingDefaultAccount.bankName ? `${existingDefaultAccount.name} (${existingDefaultAccount.bankName})` : existingDefaultAccount.name;
                        const mensagemModal = `Já existe um cartão definido como Principal: "${existingDefaultCard.name}" (Final ${existingDefaultCard.last4}) na conta "${accLabel}". Deseja mudar o destaque do Dashboard para este novo cartão?`;
                        
                        // Invoca o modal interativo do próprio sistema
                        const confirmarTroca = await askConfirmation('Substituir Cartão Principal', mensagemModal, 'Sim, Mudar Destaque', false, 'star');
                        
                        if (!confirmarTroca) {
                            // Se o usuário recusar, desmarca a caixinha da tela e aborta o salvamento para ele revisar
                            document.getElementById('ccIsDefault').checked = false;
                            return;
                        }

                        // Se ele aceitou, remove a marcação de principal do cartão antigo globalmente
                        if (existingDefaultAccount.id) {
                            existingDefaultAccount.cards.forEach(c => c.isDefault = false);
                            // Atualiza a outra conta diretamente no Firestore imediatamente
                            await userRef('accounts').doc(existingDefaultAccount.id).update({
                                cards: existingDefaultAccount.cards
                            });

                            // MÁGICA DA SINCRONIZAÇÃO: Atualiza a outra conta na memória local (accounts)
                            const idxAcc = accounts.findIndex(a => a.id === existingDefaultAccount.id);
                            if (idxAcc !== -1) {
                                accounts[idxAcc].cards = existingDefaultAccount.cards;
                            }
                        }
                        
                        // Limpa também qualquer outro cartão marcado na lista local atual
                        currentAccountCards.forEach(c => c.isDefault = false);

                        // Reseta o índice do carrossel do Dashboard para focar no novo favorito (posição 0)
                        window.currentDashboardCardIndex = 0;
                    } else {
                        // Se não encontrou conflito externo, limpa os locais por segurança
                        currentAccountCards.forEach(c => c.isDefault = false);
                    }
                }

                // Monta o objeto do cartão com os dados validados
                const cardData = {
                    id: editingCardIndex !== null ? currentAccountCards[editingCardIndex].id : 'card_' + Date.now(),
                    name, last4, brand, typeFormat, limit, color, isPrepaid, isDefault, closingDay, dueDay
                };

                // Lógica de Update ou Create
                if (editingCardIndex !== null) {
                    currentAccountCards[editingCardIndex] = cardData; 
                } else {
                    currentAccountCards.push(cardData); 
                }

                // Garante que o carrossel do Dashboard volte para o início para mostrar a estrela na hora
                if (isDefault) {
                    window.currentDashboardCardIndex = 0;
                }

                // MÁGICA 1: Auto-salvamento silencioso! Se a conta já existe, salva os cartões no banco imediatamente para não perder a estrela
                if (typeof editingAccountId !== 'undefined' && editingAccountId) {
                    const idxAcc = accounts.findIndex(a => a.id === editingAccountId);
                    if (idxAcc !== -1) {
                        accounts[idxAcc].cards = currentAccountCards;
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
		
		// =========================================================
        // MOTOR DE MÚLTIPLAS CHAVES PIX (MEMÓRIA E MÁSCARAS)
        // =========================================================
        let currentAccountPixKeys = [];
        let editingPixKeyIndex = null;

        function renderAccountPixKeysList() {
            const listEl = document.getElementById('innerPixKeysList');
            const btnAdd = document.getElementById('btnShowPixKeyForm');
            
            // Trava de limite de chaves
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

        window.removePixKeyFromList = function(index) {
            currentAccountPixKeys.splice(index, 1);
            accountFormHasChanges = true;
            renderAccountPixKeysList();
        }

        window.editPixKeyInList = function(index) {
            editingPixKeyIndex = index;
            const pk = currentAccountPixKeys[index];
            
            document.getElementById('pixKeyFormTitle').textContent = 'Editar Chave Pix';
            
            const typeSelect = document.getElementById('newPixKeyType');
            typeSelect.value = pk.type === 'Desconhecido' ? 'Aleatória' : pk.type;
            
            const inputVal = document.getElementById('newPixKeyValue');
            typeSelect.dispatchEvent(new Event('change')); // Ajusta o placeholder/máscara
            inputVal.value = pk.value; // Força o valor de volta após a máscara rodar
            
            const saveAccountBtnMaster = document.getElementById('saveAccount');
            if (saveAccountBtnMaster) {
                saveAccountBtnMaster.disabled = true;
                saveAccountBtnMaster.style.opacity = '0.5';
                saveAccountBtnMaster.style.cursor = 'not-allowed';
            }

            document.getElementById('pixKeysListView').style.display = 'none';
            document.getElementById('pixKeyFormView').style.display = 'block';
        };

        const btnShowPixKeyForm = document.getElementById('btnShowPixKeyForm');
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

        const btnHidePixKeyForm = document.getElementById('btnHidePixKeyForm');
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

        // --- Máscaras Inteligentes da Chave ---
        const newPixKeyType = document.getElementById('newPixKeyType');
        const newPixKeyValue = document.getElementById('newPixKeyValue');
        
        if (newPixKeyType) {
            newPixKeyType.addEventListener('change', (e) => {
                const type = e.target.value;
                newPixKeyValue.value = ''; // Limpa ao trocar
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

        const btnSavePixKeyToList = document.getElementById('btnSavePixKeyToList');
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

		// =========================================================
        // MOTOR DO CARROSSEL DE CARTÕES (DASHBOARD)
        // =========================================================
        window.currentDashboardCardIndex = 0;
        
        window.mudarCartaoDashboard = function(direction, event) {
            // Impede que o clique na seta abra o detalhe da fatura sem querer
            if (event) event.stopPropagation(); 
            
            window.currentDashboardCardIndex += direction;
            
            // Loop infinito: do último volta pro primeiro e vice-versa
            if (window.currentDashboardCardIndex >= window.allDashboardCards.length) {
                window.currentDashboardCardIndex = 0;
            }
            if (window.currentDashboardCardIndex < 0) {
                window.currentDashboardCardIndex = window.allDashboardCards.length - 1;
            }
            
            renderDashboard(); // Atualiza a tela com o novo cartão
        };
		
		// --- MOTOR DO CARROSSEL DO GRÁFICO (CATEGORIA / CENTRO DE CUSTO) ---
        window.currentDonutViewIndex = 0; // 0 = Categoria, 1 = Centro de Custo

        window.mudarDonutDashboard = function(direction, event) {
            if (event) event.stopPropagation();
            window.currentDonutViewIndex += direction;
            
            // Só temos 2 telas, então o loop é bem simples (entre 0 e 1)
            if (window.currentDonutViewIndex > 1) window.currentDonutViewIndex = 0;
            if (window.currentDonutViewIndex < 0) window.currentDonutViewIndex = 1;
            
            renderDashboard();
        };

        // =========================================================
        // MOTOR INTELIGENTE DA CARTEIRA DE CRÉDITO (APPLE WALLET)
        // =========================================================
        let currentWalletAccId = null;
        let invoiceMonthOffset = 0; 
        let currentWalletCardIndex = 0;

        // Função do Carrossel (Esquerda/Direita)
        window.mudarCartaoCarteira = function(direction) {
            const acc = accounts.find(a => a.id === currentWalletAccId);
            if (!acc || !acc.cards) return;
            
            currentWalletCardIndex += direction;
            
            // Faz o "loop" infinito (vai do último pro primeiro e vice-versa)
            if (currentWalletCardIndex >= acc.cards.length) currentWalletCardIndex = 0;
            if (currentWalletCardIndex < 0) currentWalletCardIndex = acc.cards.length - 1;
            
            // Reabre a carteira atualizando a gaveta
            abrirCarteira(currentWalletAccId, 0, false); 
        };

        window.abrirCarteira = function(accountId, offset = 0, resetCard = true) {
            currentWalletAccId = accountId;
            invoiceMonthOffset += offset;
            
            if (offset === 0 && resetCard) {
                invoiceMonthOffset = 0; 
                currentWalletCardIndex = 0;
            }

            // MÁGICA DE UX: Garante que o Modal abra na aba de Cartões (Expande lado a lado no PC)
            document.getElementById('accountDetailsModal').style.display = 'flex';
            document.getElementById('accountDetailsModal').classList.add('expanded');
            document.getElementById('bbTabCartao').classList.add('active');
            document.getElementById('bbTabConta').classList.remove('active');
            document.getElementById('accWalletContent').style.display = 'block';
            document.getElementById('accDetailsContent').style.display = 'none';

            const acc = accounts.find(a => a.id === accountId);
            
            // CORREÇÃO: Atualiza o cabeçalho e os saldos da conta para exibir no painel lateral
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

            // 1. CARROSSEL E PONTINHOS (Estilo Apple, setas escuras)
            let arrowsHtml = '';
            let dotsHtml = '<div style="height: 24px;"></div>'; // Garante o recuo quando há apenas 1 cartão
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

            // 2. LÓGICA DA DATA E FATURA
            const today = new Date();
            let baseM = today.getMonth();
            let baseY = today.getFullYear();
            
            // INTELIGÊNCIA: Se for Crédito Normal, simula a fatura. Se for Pré-pago, trava no Mês Calendário.
            if (!activeCard.isPrepaid) {
                const currentDay = today.getDate();
                const closingDay = parseInt(activeCard.closingDay) || 1;
                const dueDay    = parseInt(activeCard.dueDay)    || 10;

                // --- REGRA DE AVANÇO AUTOMÁTICO DE FATURA ---
                // A fatura só avança para o próximo ciclo quando AMBAS as condições forem verdadeiras:
                // 1. Já passou o dia de VENCIMENTO da fatura atual (não apenas o fechamento)
                // 2. A fatura atual está PAGA (sem transações pendentes)
                
                // Primeiro: identifica qual é o mês/ano da fatura atual (antes de avançar)
                let faturaAtualM = baseM;
                let faturaAtualY = baseY;
                // Se o fechamento já passou E o vencimento fica no mês seguinte ao fechamento,
                // a fatura "atual" já pertence ao mês seguinte
                if (dueDay < closingDay) {
                    faturaAtualM++;
                    if (faturaAtualM > 11) { faturaAtualM = 0; faturaAtualY++; }
                }

                // Monta a string do mês da fatura atual para buscar as transações
                const faturaAtualStr = `${faturaAtualY}-${String(faturaAtualM + 1).padStart(2, '0')}`;

                // Verifica se a fatura atual tem alguma transação pendente (não paga)
                const faturaAtualTemPendente = transactions.some(t =>
                    t.accountId === accountId &&
                    t.type === 'expense' &&
                    (t.cardId === activeCard.id || (acc.limitType === 'shared' && t.cardId)) &&
                    t.date.startsWith(faturaAtualStr) &&
                    !t.isPaid
                );

                // Só avança o mês base se o fechamento JÁ passou E o vencimento JÁ passou E a fatura está PAGA
                const vencimentoJaPassou = currentDay > dueDay;

                if (vencimentoJaPassou && !faturaAtualTemPendente) {
                    // Fatura vencida e paga: avança para o próximo ciclo
                    baseM++;
                    if (baseM > 11) { baseM = 0; baseY++; }
                    // Se o vencimento for em mês diferente do fechamento, avança mais um
                    if (dueDay < closingDay) {
                        baseM++;
                        if (baseM > 11) { baseM = 0; baseY++; }
                    }
                } else if (!vencimentoJaPassou && currentDay >= closingDay) {
                    // Fechamento passou mas vencimento ainda não: permanece na fatura atual
                    // Só ajusta o mês base se vencimento cair em mês seguinte ao fechamento
                    if (dueDay < closingDay) {
                        baseM++;
                        if (baseM > 11) { baseM = 0; baseY++; }
                    }
                }
                // Se nem o fechamento passou: permanece no mês atual (baseM e baseY inalterados)
            }
            
            // Aplica a navegação (offset) de meses do usuário
            baseM += invoiceMonthOffset;
            while (baseM > 11) { baseM -= 12; baseY++; }
            while (baseM < 0) { baseM += 12; baseY--; }

            const targetMonthStr = `${baseY}-${String(baseM + 1).padStart(2, '0')}`;
            const targetMonth = baseM;
            const targetYear = baseY;

            const isShared = acc.limitType === 'shared';

            // LÓGICA MESTRA: Agrupa as transações
            const txs = transactions.filter(t => {
                if (t.accountId !== accountId || t.type !== 'expense' || !t.date.startsWith(targetMonthStr)) return false;
                if (isShared && t.cardId) return true; // Conta compras de qualquer cartão
                return t.cardId === activeCard.id;     // Conta apenas a do cartão atual (Individual)
            });
            const faturaTotal = txs.reduce((sum, t) => sum + t.value, 0);
            
            const pendentesNestaFatura = txs.filter(t => !t.isPaid);
            const faturaPendenteTotal = pendentesNestaFatura.reduce((sum, t) => sum + t.value, 0);
            
            // LIMITE COMPROMETIDO: Soma o saldo devedor consolidado ou individual
            const allUnpaidTxs = transactions.filter(t => {
                if (t.accountId !== accountId || t.type !== 'expense' || t.isPaid) return false;
                if (isShared && t.cardId) return true;
                return t.cardId === activeCard.id;
            });
            const limitUsedTotal = allUnpaidTxs.reduce((sum, t) => sum + t.value, 0);
            
            const limit = isShared ? (acc.globalLimit || 0) : (activeCard.limit || 0);
            
            // INTELIGÊNCIA PRÉ-PAGO: O limite é o saldo da conta.
            const available = activeCard.isPrepaid ? (acc.balance || 0) : Math.max(limit - limitUsedTotal, 0);
            const usedPct = activeCard.isPrepaid ? 0 : (limit > 0 ? Math.round((limitUsedTotal / limit) * 100) : 0);

            // CORES SOFISTICADAS E CLEAN (ATUALIZADO E REFINADO)
            const isDark = document.body.classList.contains('dark-mode');
            
            // Hierarquia: Fundo dos cards secundários (Lançamentos e Limite) vs Principal (Fatura)
            const limitBg = isDark ? 'var(--cor-superficie-dark)' : '#ffffff'; 
            const faturaBg = isDark ? 'var(--cor-superficie-dark)' : '#ffffff';

            const textColor = isDark ? '#e3e3e3' : '#202124';
            const subTextColor = isDark ? '#9aa0a6' : '#5f6368';
            const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
            
            // Cores base para os botões de navegação da Carteira
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
                // --- LÓGICA DE STATUS BASEADA NA DATA REAL (não no offset de navegação) ---
                const _closingDay = parseInt(activeCard.closingDay) || 1;
                const _dueDay     = parseInt(activeCard.dueDay)     || 10;
                const _today      = new Date();
                const _currentDay = _today.getDate();
                const _currentM   = _today.getMonth();     // 0-11
                const _currentY   = _today.getFullYear();

                // Mês/ano da fatura sendo EXIBIDA (targetMonth e targetYear já calculados acima)
                const isFaturaDoMesAtual = (targetMonth === _currentM && targetYear === _currentY);

                // Prioridade 1: fatura PAGA (sem pendentes, mas com lançamentos)
                if (faturaTotal > 0 && faturaPendenteTotal === 0) {
                    statusText = `PAGA`; statusColor = isDark ? '#81c995' : '#188038';
                // Prioridade 2: fatura do passado (mês/ano anterior ao atual)
                } else if (targetYear < _currentY || (targetYear === _currentY && targetMonth < _currentM)) {
                    statusText = `FECHADA • VENCEU ${dueDateStr}`; statusColor = isDark ? '#ff8a80' : '#d93025';
                // Prioridade 3: fatura do mês atual → decide pelo dia real
                } else if (isFaturaDoMesAtual) {
                    if (_currentDay < _closingDay) {
                        statusText = `ABERTA • VENCE ${dueDateStr}`; statusColor = '#e67e22';
                    } else if (_currentDay >= _closingDay && _currentDay <= _dueDay) {
                        statusText = `FECHADA • VENCE ${dueDateStr}`; statusColor = isDark ? '#ff8a80' : '#d93025';
                    } else {
                        statusText = `VENCIDA • VENCEU ${dueDateStr}`; statusColor = isDark ? '#ff8a80' : '#d93025';
                    }
                // Prioridade 4: fatura futura
                } else {
                    statusText = `FUTURA • VENCE ${dueDateStr}`; statusColor = subTextColor;
                }
            }

            // 1. CARROSSEL E PONTINHOS (Agora usando as cores padronizadas)
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

            // 3. LISTA DE TRANSAÇÕES
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

            // 4. INJETANDO O HTML REFINADO COM A NOVA HIERARQUIA VISUAL
            const displayInvoiceTotal = activeCard.isPrepaid ? faturaTotal : (faturaPendenteTotal > 0 ? faturaPendenteTotal : faturaTotal);
            const totalDisplayColor = (!activeCard.isPrepaid && faturaPendenteTotal === 0 && faturaTotal > 0) ? (isDark ? '#81c995' : '#188038') : textColor;

            // A mágica: preparamos os "ingredientes" em uma caixa (objeto) e enviamos para a fábrica
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

            // 5. Gráfico substituído por barra horizontal — destrói instância antiga se existir

            // 5. Gráfico substituído por barra horizontal — destrói instância antiga se existir
            if (window.walletChartInstance) {
                window.walletChartInstance.destroy();
                window.walletChartInstance = null;
            }
        };
		
		// =========================================================
		// MOTOR DO QR CODE PIX (Miniatura e Ampliação) - COM CHAVE ALEATÓRIA
		// =========================================================

		// 1. Máscara Automática de Celular/WhatsApp
		const phoneInput = document.getElementById('partnerPhone');
		if (phoneInput) {
			phoneInput.addEventListener('input', function(e) {
				let value = e.target.value.replace(/\D/g, ''); 
				if (value.length > 11) value = value.slice(0, 11);
				if (value.length > 10) value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
				else if (value.length > 5) value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
				else if (value.length > 2) value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
				e.target.value = value;
				updateMiniQrCard(); // Atualiza QR se estiver digitando
			});
		}

		// Garante que o QR atualiza ao digitar nos outros campos também
		const docInput = document.getElementById('partnerDoc');
		if(docInput) docInput.addEventListener('input', updateMiniQrCard);
		
		const emailInput = document.getElementById('partnerEmail');
		if(emailInput) emailInput.addEventListener('input', updateMiniQrCard);

		const randomInput = document.getElementById('partnerRandomPix');
		if(randomInput) randomInput.addEventListener('input', updateMiniQrCard);

		// 2. Trava de segurança: Deixa apenas UM checkbox marcado por vez (AGORA COM 4 CHAVES)
		['partnerDocIsPix', 'partnerPhoneIsPix', 'partnerEmailIsPix', 'partnerRandomPixIsPix'].forEach(id => {
			const el = document.getElementById(id);
			if(el) {
				el.addEventListener('change', (e) => {
					if (e.target.checked) {
						['partnerDocIsPix', 'partnerPhoneIsPix', 'partnerEmailIsPix', 'partnerRandomPixIsPix'].forEach(otherId => {
							if(otherId !== id) {
								const otherEl = document.getElementById(otherId);
								if(otherEl) otherEl.checked = false;
							}
						});
					}
					updateMiniQrCard();
				});
			}
		});

		// 3. Checa os campos para desenhar o QR Code Pequenino
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
				
				// A MÁGICA OCORRE AQUI: Passamos a chave, o nome e o TIPO
				const payload = gerarPayloadPix(chave, nome, tipo);
				
				if (typeof QRCode !== 'undefined') {
					new QRCode(box, {
						text: payload, width: 160, height: 160,
						colorDark: "#202124", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.L
					});
				}
				
				// Associa o clique da miniatura para abrir o Modal Grande
				document.getElementById('miniQrCard').onclick = () => abrirModalQrPixBigger(chave, nome, payload);
			} else {
				wrapper.style.display = 'none'; 
			}
		}

		// 4. Função oficial geradora do BR Code do Banco Central (BLINDADA)
		function gerarPayloadPix(chaveOrig, nome, tipoChave = '') {
			let chave = String(chaveOrig).trim();

			// Fallback de segurança caso a função seja chamada sem o tipo
			if (!tipoChave) {
				if (chave.includes('@')) tipoChave = 'E-mail';
				else if (chave.includes('-') && chave.length > 20) tipoChave = 'Aleatória';
				else if (chave.includes('(')) tipoChave = 'Celular';
				else tipoChave = 'Documento';
			}

			// LIMPEZA ABSOLUTA DA CHAVE PARA O BANCO CENTRAL
			if (tipoChave === 'E-mail' || chave.includes('@')) {
				// E-mail não se mexe (banco aceita letras, pontos e arroba)
			} else if (tipoChave === 'Aleatória') {
				// Chave Aleatória não se mexe (o banco EXIGE os traços e letras originais)
			} else {
				// CPF/CNPJ ou Celular: Remove TUDO que não for número
				let apenasNumeros = chave.replace(/\D/g, '');

				if (tipoChave === 'Celular') {
					// PIX exige código do país (+55) no celular
					if (!apenasNumeros.startsWith('55')) {
						apenasNumeros = '55' + apenasNumeros;
					}
					chave = '+' + apenasNumeros; // Fica ex: +5519999999999
				} else {
					// CPF ou CNPJ (apenas números puros)
					chave = apenasNumeros;
				}
			}
			
			// Formata o nome do recebedor (tira acentos, max 25 chars exigido pelo banco)
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
			
			// Calcula CRC16
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

		// 5. Função que abre a versão ampliada do QR
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

		// 6. FECHAR O MODAL GRANDE DO QR CODE PIX
		document.getElementById('closePixQrModal')?.addEventListener('click', () => { document.getElementById('pixQrModal').style.display = 'none'; });
		const modalPixOverlay = document.getElementById('pixQrModal');
		if(modalPixOverlay) {
			modalPixOverlay.addEventListener('click', function(e) {
				if (e.target === modalPixOverlay) modalPixOverlay.style.display = 'none';
			});
		}
		
		// =========================================================
        // MOTOR DO BOLETO (EVENTOS, CÓDIGO DE BARRAS E COPIAR)
        // =========================================================

        const boletoCheckbox = document.getElementById('boletoCheckbox');
        const boletoFieldGroup = document.getElementById('boletoFieldGroup');
        const boletoLineInput = document.getElementById('boletoLine');
        const copyBoletoBtn = document.getElementById('copyBoletoBtn');

        // --- LÓGICA DO MODAL SCANNER DE BOLETO (ABAS) ---
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

        let codeReaderBoleto = null;
        let isBoletoCameraRunning = false; // TRAVA DE SEGURANÇA CONTRA LOOPS DE PERMISSÃO

        // Função para Desligar a Câmera
        function stopBoletoCamera() {
            if (codeReaderBoleto) {
                codeReaderBoleto.reset();
            }
            isBoletoCameraRunning = false;
        }

        // Função para Ligar a Câmera
        function startBoletoCamera() {
            // Se já estiver rodando, barra a execução para não travar o navegador pedindo permissão de novo
            if (isBoletoCameraRunning) return; 

            if (!codeReaderBoleto) codeReaderBoleto = new ZXing.BrowserMultiFormatReader();
            
            isBoletoCameraRunning = true;
            
            // "undefined" no lugar de "null" força a buscar a câmera padrão de forma mais estável
            codeReaderBoleto.decodeFromVideoDevice(undefined, 'cameraVideo', (result, err) => {
                if (result) {
                    const codeFound = result.text.replace(/\D/g, '');
                    
                    // TRAVA DE SEGURANÇA: O código de barras do boleto tem EXATAMENTE 44 números.
                    if (codeFound.length === 44) {
                        document.getElementById('boletoLine').value = codeFound;
                        
                        scanStatus.style.display = 'block';
                        scanStatus.textContent = 'Código lido com sucesso!';
                        scanStatus.style.color = '#188038';
                        
                        updateReceiptPreview();
                        closeBoletoScanner();
                    } else {
                        // Se leu um código menor/diferente, ele ignora silenciosamente e continua procurando!
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

        // Abrir Modal
        if (openScannerModalBtn) {
            openScannerModalBtn.addEventListener('click', () => {
                scannerModal.style.display = 'flex';
                // Só clica na aba da câmera se ela não estiver ativa (Evita o loop de permissão!)
                if (!tabScanner.classList.contains('active') || !isBoletoCameraRunning) {
                    tabScanner.click();
                }
            });
        }

        // Fechar Modal (No X ou clicando fora)
        if (closeScannerModalBtn) closeScannerModalBtn.addEventListener('click', closeBoletoScanner);
        scannerModal.addEventListener('click', (e) => { if (e.target === scannerModal) closeBoletoScanner(); });

        // Troca de Abas
        tabScanner.addEventListener('click', () => {
            tabScanner.classList.add('active');
            tabImagem.classList.remove('active');
            contentScanner.style.display = 'block';
            contentImagem.style.display = 'none';
            startBoletoCamera(); // Liga a câmera com segurança
        });

        tabImagem.addEventListener('click', () => {
            tabImagem.classList.add('active');
            tabScanner.classList.remove('active');
            contentImagem.style.display = 'block';
            contentScanner.style.display = 'none';
            stopBoletoCamera(); // Desliga a câmera para economizar bateria
        });

        // Leitura por Imagem da Galeria
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
                                    
                                    // TRAVA DE SEGURANÇA: Exige os 44 números
                                    if (codeFound.length === 44) {
                                        document.getElementById('boletoLine').value = codeFound;
                                        
                                        scanStatus.style.display = 'block';
                                        scanStatus.textContent = 'Código extraído da imagem!';
                                        scanStatus.style.color = '#188038';
                                        
                                        updateReceiptPreview();
                                        closeBoletoScanner();
                                    } else {
                                        // Se achou um código que não tem 44 números, força o erro para cair no catch
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
                e.target.value = ''; // Reseta o campo
            });
        }

        // Mostra/Esconde o campo ao marcar a caixinha
        if (boletoCheckbox) {
            boletoCheckbox.addEventListener('change', function() {
                boletoFieldGroup.style.display = this.checked ? 'block' : 'none';
                updateReceiptPreview(); // Atualiza o recibo na hora
            });
        }

        // Formata os números que o usuário colar e valida o tamanho em tempo real
        if (boletoLineInput) {
            boletoLineInput.addEventListener('input', function(e) {
                this.value = this.value.replace(/\D/g, ''); // Arranca letras e espaços
                
                const status = document.getElementById('scanStatus');
                const len = this.value.length;
                
                if (len === 0) {
                    status.style.display = 'none';
                } else if (len === 44 || len === 47 || len === 48) {
                    status.style.display = 'block';
                    status.textContent = 'Código com tamanho válido!';
                    status.style.color = '#188038'; // Verde
                } else if (len > 48) {
                    status.style.display = 'block';
                    status.textContent = 'Código longo demais! Verifique os números.';
                    status.style.color = '#d93025'; // Vermelho
                } else {
                    status.style.display = 'block';
                    status.textContent = `Código incompleto... (${len} números digitados)`;
                    status.style.color = '#e67e22'; // Laranja
                }

                updateReceiptPreview();
            });
        }

        // Intercepta a função updateReceiptPreview para desenhar o código de barras
        const originalUpdateReceiptPreview = updateReceiptPreview;
        updateReceiptPreview = function() {
            originalUpdateReceiptPreview(); // Roda o código original do PIX e etc

            const boletoContainer = document.getElementById('receiptBoletoContainer');
            const boletoText = document.getElementById('boletoLineText');
            
            // Só exibe se for Despesa, a caixinha estiver marcada e tiver algo digitado
            if (selectedType === 'expense' && boletoCheckbox.checked && boletoLineInput.value.length >= 44) {
                boletoContainer.style.display = 'flex';
                const linhaDigitavel = boletoLineInput.value;
                boletoText.textContent = linhaDigitavel; // Mantém a linha de 47 para o usuário copiar

                // 1. CONVERSOR: Linha Digitável (47/48) -> Código de Barras Real (44 dígitos)
                let codigoBarrasReal = "";
                
                if (linhaDigitavel[0] === '8' && linhaDigitavel.length === 48) {
                    // Contas de consumo (Água, Luz, Telefone, Tributos) - 48 dígitos
                    codigoBarrasReal = linhaDigitavel.substring(0, 11) + 
                                       linhaDigitavel.substring(12, 23) + 
                                       linhaDigitavel.substring(24, 35) + 
                                       linhaDigitavel.substring(36, 47);
                } else if (linhaDigitavel.length === 47) {
                    // Boletos bancários normais - 47 dígitos
                    codigoBarrasReal = linhaDigitavel.substring(0, 4) + 
                                       linhaDigitavel.substring(32, 33) + 
                                       linhaDigitavel.substring(33, 47) + 
                                       linhaDigitavel.substring(4, 9) + 
                                       linhaDigitavel.substring(10, 20) + 
                                       linhaDigitavel.substring(21, 31);
                } else {
                    codigoBarrasReal = linhaDigitavel; // Fallback
                }

                // 2. Desenha o Código de Barras usando ITF (Padrão FEBRABAN)
                if (typeof JsBarcode !== 'undefined' && codigoBarrasReal.length === 44) {
                    JsBarcode("#boletoBarcode", codigoBarrasReal, {
                        format: "ITF", // OBRIGATÓRIO PARA BOLETOS BRASILEROS
                        lineColor: "#000",
                        width: 1, 
                        height: 60,
                        displayValue: false,
                        margin: 0
                    });
                } else if (typeof JsBarcode !== 'undefined') {
                    // Se o usuário ainda estiver digitando/incompleto, desenha um genérico temporário
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

        // Botão "Copiar Código"
        if (copyBoletoBtn) {
            copyBoletoBtn.addEventListener('click', function(e) {
                e.preventDefault(); // Evita recarregar a tela
                const numerosParaCopiar = document.getElementById('boletoLineText').textContent;
                
                navigator.clipboard.writeText(numerosParaCopiar).then(() => {
                    const iconeOriginal = this.innerHTML;
                    this.innerHTML = '<span class="material-icons" style="font-size: 1.1rem; color: #188038;">check</span> Copiado!';
                    this.style.borderColor = '#188038';
                    this.style.color = '#188038';
                    
                    showToast('Código de barras copiado!', 'success');

                    // Volta o botão ao normal depois de 2 segundos
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
		
		// =========================================================
        // TOGGLE DA SIDEBAR RETRÁTIL (ESTILO CHATGPT)
        // =========================================================
        const appSidebar = document.getElementById('appSidebar');
        const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
        const mobileOpenMenuBtn = document.getElementById('mobileOpenMenuBtn');

        // Botão que fica DENTRO da barra (Desktop)
        if (toggleSidebarBtn) {
            toggleSidebarBtn.addEventListener('click', () => {
                appSidebar.classList.toggle('collapsed');
                // NOVO: Salva se a barra está encolhida ou expandida
                localStorage.setItem('controlpess-sidebar', appSidebar.classList.contains('collapsed') ? 'collapsed' : 'expanded'); 
            });
        }
        
        // Botão Hamburger que fica FORA da barra (Celular)
        if (mobileOpenMenuBtn) {
            mobileOpenMenuBtn.addEventListener('click', () => {
                appSidebar.classList.remove('collapsed');
            });
        }
        
        // Em celulares, começa recolhida para não cobrir a tela
        if (window.innerWidth <= 768) {
            appSidebar.classList.add('collapsed');
            
            // Clicou num item do menu no celular? Esconde a barra automaticamente!
            document.querySelectorAll('.sidebar-item').forEach(item => {
                item.addEventListener('click', () => {
                    appSidebar.classList.add('collapsed');
                });
            });
        }
		
		// =========================================================
        // MOTOR DE BUSCA GLOBAL INTELIGENTE
        // =========================================================
        const globalSearchInput = document.getElementById('globalSearchInput');
        const globalSearchDropdown = document.getElementById('globalSearchDropdown');

        if (globalSearchInput) {
            globalSearchInput.addEventListener('input', function(e) {
                const term = e.target.value.toLowerCase().trim();
                
                // Só começa a buscar se digitar pelo menos 2 letras
                if (term.length < 2) {
                    globalSearchDropdown.style.display = 'none';
                    return;
                }

                let resultsHtml = '';
                let hasResults = false;
                const isDark = document.body.classList.contains('dark-mode');

                // 1. Busca em LANÇAMENTOS (Por texto, valor ou FITID)
                const foundTxs = (transactions || []).filter(t => {
                    const desc = (t.description || '').toLowerCase();
                    const valStr = t.value ? t.value.toString() : '';
                    const partnerStr = (t.partnerName || '').toLowerCase();
                    const valFormatted = formatCurrency(t.value).toLowerCase(); // Acha até se digitar "R$ 50"
                    const fitidStr = (t.fitid || '').toLowerCase(); // MÁGICA: Captura o ID do banco (OFX)
                    
                    return desc.includes(term) || 
                           valStr.includes(term) || 
                           valFormatted.includes(term) || 
                           partnerStr.includes(term) || 
                           fitidStr.includes(term); // Permite buscar colando o FITID
                }).slice(0, 5); // Limita a 5 resultados para não poluir

                if (foundTxs.length > 0) {
                    hasResults = true;
                    resultsHtml += '<div class="search-category-title">Lançamentos</div>';
                    foundTxs.forEach(t => {
                        const icon = t.type === 'income' ? 'arrow_upward' : (t.type === 'expense' ? 'arrow_downward' : 'swap_horiz');
                        let color = t.type === 'income' ? '#188038' : (t.type === 'expense' ? '#d93025' : '#1a73e8');
                        if (isDark) color = t.type === 'income' ? '#81c995' : (t.type === 'expense' ? '#ff8a80' : '#8ab4f8');
                        
                        const titleColor = isDark ? '#e0e0e0' : '#202124';

                        resultsHtml += `
                            <div class="search-result-item" onclick="abrirResultadoBusca('tx', '${escapeJsAttr(t.id)}')">
                                <div style="display: flex; align-items: center; gap: 12px; overflow: hidden;">
                                    <span class="material-icons" style="color: ${color}; font-size: 1.2rem;">${icon}</span>
                                    <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                        <div style="font-weight: 500; font-size: 0.9rem; color: ${titleColor};">${t.description || 'Sem descrição'}</div>
                                        <div style="font-size: 0.8rem; color: #5f6368;">${formatDate(t.date)}</div>
                                    </div>
                                </div>
                                <strong style="color: ${color}; font-size: 0.95rem;">${formatCurrency(t.value)}</strong>
                            </div>
                        `;
                    });
                }

                // 2. Busca em PARCEIROS
                const foundPartners = (partners || []).filter(p => {
                    const name = (p.name || '').toLowerCase();
                    const doc = (p.document || '').toLowerCase();
                    return name.includes(term) || doc.includes(term);
                }).slice(0, 3);

                if (foundPartners.length > 0) {
                    hasResults = true;
                    resultsHtml += '<div class="search-category-title">Parceiros</div>';
                    foundPartners.forEach(p => {
                        const titleColor = isDark ? '#e0e0e0' : '#202124';
                        resultsHtml += `
                            <div class="search-result-item" onclick="abrirResultadoBusca('partner', '${escapeJsAttr(p.id)}')">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span class="material-icons" style="color: #5f6368; font-size: 1.2rem;">person</span>
                                    <div>
                                        <div style="font-weight: 500; font-size: 0.9rem; color: ${titleColor};">${p.name}</div>
                                        <div style="font-size: 0.8rem; color: #5f6368;">${p.type} • ${p.document || 'Sem doc'}</div>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                }

                // 3. Busca em CONTAS
                const foundAccounts = (accounts || []).filter(a => {
                    const name = (a.name || '').toLowerCase();
                    const bank = (a.bankName || '').toLowerCase();
                    return name.includes(term) || bank.includes(term);
                }).slice(0, 3);

                if (foundAccounts.length > 0) {
                    hasResults = true;
                    resultsHtml += '<div class="search-category-title">Contas</div>';
                    foundAccounts.forEach(a => {
                        const color = isDark ? '#8ab4f8' : '#1a73e8';
                        const titleColor = isDark ? '#e0e0e0' : '#202124';
                        resultsHtml += `
                            <div class="search-result-item" onclick="abrirResultadoBusca('account', '${escapeJsAttr(a.id)}')">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span class="material-icons" style="color: ${color}; font-size: 1.2rem;">account_balance</span>
                                    <div>
                                        <div style="font-weight: 500; font-size: 0.9rem; color: ${titleColor};">${a.name}</div>
                                        <div style="font-size: 0.8rem; color: #5f6368;">${a.bankName || 'Outros'}</div>
                                    </div>
                                </div>
                                <strong style="color: ${color}; font-size: 0.95rem;">${formatCurrency(a.balance)}</strong>
                            </div>
                        `;
                    });
                }

                // Exibe os resultados ou mensagem de "não encontrado"
                if (hasResults) {
                    globalSearchDropdown.innerHTML = resultsHtml;
                    globalSearchDropdown.style.display = 'block';
                } else {
                    globalSearchDropdown.innerHTML = '<div style="padding: 16px; text-align: center; color: #5f6368; font-size: 0.9rem;">Nenhum resultado encontrado.</div>';
                    globalSearchDropdown.style.display = 'block';
                }
            });

            // Fecha a caixinha de busca se clicar fora dela
            document.addEventListener('click', (e) => {
                if (!document.querySelector('.global-search-container').contains(e.target)) {
                    globalSearchDropdown.style.display = 'none';
                }
            });
        }

        // 4. Ação ao clicar no resultado
        window.abrirResultadoBusca = function(tipo, id) {
            globalSearchDropdown.style.display = 'none';
            globalSearchInput.value = ''; // Limpa a barra depois de clicar
            
            // Navega para a tela certa e abre o modal/detalhe do item!
            if (tipo === 'tx') {
                setActiveView('transactions');
                setTimeout(() => openEditTransactionModal(id), 300);
            } else if (tipo === 'partner') {
                setActiveView('partners');
                const partner = partners.find(p => p.id === id);
                if (partner) setTimeout(() => openPartnerModal(partner), 300);
            } else if (tipo === 'account') {
                setActiveView('accounts');
                setTimeout(() => openAccountDetails(id), 300);
            }
        };

        // =========================================================
        // MOTOR DE PAGAMENTO DE FATURAS EM LOTE (BATCH)
        // =========================================================
        let invoicePaymentData = null; // Memória temporária

        // 1. Abre o Modal e prepara os dados
        window.prepararPagamentoFatura = function(accountId, cardId, targetMonthStr) {
            const acc = accounts.find(a => a.id === accountId);
            const isShared = acc && acc.limitType === 'shared';

            // Busca os lançamentos pendentes (respeitando a regra de Consolidado ou Individual)
            const txsPagar = transactions.filter(t => {
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

        // 2. Fecha o modal se cancelar
        document.getElementById('btnCancelInvoicePayment').addEventListener('click', () => {
            document.getElementById('payInvoiceModal').style.display = 'none';
            invoicePaymentData = null;
        });

        // 3. O Botão que executa a mágica!
        document.getElementById('btnConfirmInvoicePayment').addEventListener('click', async function() {
            if (!invoicePaymentData) return;
            
            const originalText = this.innerHTML;
            this.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">autorenew</span> Pagando...';
            this.disabled = true;

            const batch = db.batch(); // Inicia o LOTE
            const nowIso = new Date().toISOString();
            
            // Fuso horário local para a data do pagamento
            const now = new Date();
            const hoje = getTodayISO();

            // A) Marca todas as compras da fatura como pagas no lote
            invoicePaymentData.txsPagar.forEach(tx => {
                const ref = userRef('transactions').doc(tx.id);
                batch.update(ref, { isPaid: true, paymentDate: hoje, updatedAt: nowIso });
            });

            // B) Desconta o valor total da conta bancária de uma vez só!
            const accRef = userRef('accounts').doc(invoicePaymentData.accountId);
            batch.update(accRef, { balance: firebase.firestore.FieldValue.increment(-invoicePaymentData.total) });

            try {
                // Envia tudo para o banco instantaneamente
                await batch.commit(); 

                // Atualiza a memória local (sem precisar dar refresh na tela)
                invoicePaymentData.txsPagar.forEach(tx => {
                    const idx = transactions.findIndex(t => t.id === tx.id);
                    if(idx !== -1) {
                        transactions[idx].isPaid = true;
                        transactions[idx].paymentDate = hoje;
                    }
                });

                const acc = accounts.find(a => a.id === invoicePaymentData.accountId);
                if(acc) acc.balance -= invoicePaymentData.total;

                showToast('Fatura paga com sucesso!', 'success');
                
                // Atualiza os gráficos de fundo, recarrega a carteira E a lista de lançamentos!
                renderAccounts();
                renderDashboard();
                renderTransactions(); // CORREÇÃO BUG 1: Sincroniza a tela de Lançamentos
                abrirCarteira(invoicePaymentData.accountId, 0, false); 
                
                document.getElementById('payInvoiceModal').style.display = 'none';
            } catch(e) {
                console.error("Erro ao pagar fatura:", e);
                showToast('Erro de conexão ao pagar fatura.', 'error');
            } finally {
                this.innerHTML = 'Pagar Fatura';
                this.disabled = false;
                invoicePaymentData = null;
            }
        });
		
		// =========================================================================
        // MOTOR DE IMPORTAÇÃO DE EXTRATO BANCÁRIO (OFX)
        // =========================================================================
        let ofxParsedTransactions = [];
        let ofxCurrentStep = 1;
        let ofxCurrentFilter = 'all'; 
        let ofxCurrentStatusFilter = 'all'; // Novo filtro de status (Novos / Já Importados)

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

        // 1. ABRIR MODAL
        if (openImportOfxBtn) {
            openImportOfxBtn.addEventListener('click', async () => {
                await Promise.all([loadAccounts(), fetchCategories()]);
                
                ofxAccountSelect.innerHTML = '<option value="" disabled selected>Selecione a conta...</option>';
                accounts.filter(a => a.active !== false).forEach(acc => {
                    const opt = document.createElement('option');
                    opt.value = acc.id;
                    opt.textContent = `${acc.name} (Saldo: ${formatCurrency(acc.balance)})`;
                    ofxAccountSelect.appendChild(opt);
                });

                ofxParsedTransactions = [];
                ofxFileInput.value = '';
                ofxFileNameDisplay.style.display = 'none';
                
                // Reseta os filtros visuais e de data
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

        // 2. FECHAR MODAL
        function closeOfxModal() { importOfxModal.style.display = 'none'; }
        if (closeImportOfxBtn) closeImportOfxBtn.addEventListener('click', closeOfxModal);
        importOfxModal.addEventListener('click', (e) => { if (e.target === importOfxModal) closeOfxModal(); });

        // 3. UPLOAD DO ARQUIVO (Drag & Drop)
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

        // ─── CONVERSOR CSV → OFX (roda internamente, sem gerar arquivo) ───────────
        function parseCsvToOfx(csvText) {

            // 1. Parser CSV robusto: respeita campos entre aspas com vírgulas internas
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

            // 2. Converte "R$ 1.234,56" ou "-1234.56" para float
            function parseMoeda(str) {
                const limpo = str.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
                return parseFloat(limpo);
            }

            // 3. Tenta detectar a data no campo e normalizar para DD/MM/AAAA ou AAAA-MM-DD
            function parseData(str) {
                str = str.trim();
                // Formato AAAA-MM-DD (ISO)
                if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
                // Formato DD/MM/AAAA
                const br = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                if (br) return `${br[3]}-${br[2]}-${br[1]}`;
                // Formato DD/MM/AA
                const br2 = str.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
                if (br2) return `20${br2[3]}-${br2[2]}-${br2[1]}`;
                return null;
            }

            // 4. Converte data AAAA-MM-DD para AAAAMMDD (formato OFX)
            function toOfxDate(iso) {
                return iso.replace(/-/g, '') + '120000';
            }

            const linhas = csvText.split(/\r?\n/).filter(l => l.trim() !== '');
            if (linhas.length < 2) {
                showToast('CSV vazio ou sem lançamentos.', 'error');
                return null;
            }

            // 5. Detecta colunas pelo cabeçalho (busca insensível a acento/maiúscula)
            const header = parseCsvLine(linhas[0]).map(h =>
                h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
            );

            // Mapeamento flexível: aceita variações comuns de nomes de coluna
            const find = (...termos) => header.findIndex(h => termos.some(t => h.includes(t)));

            const iData   = find('data');
            const iDesc   = find('descricao', 'historico', 'movimentacao', 'lancamento', 'memo', 'obs');
            const iValor  = find('valor', 'quantia', 'montante', 'value', 'amount');
            const iTipo   = find('tipo', 'type', 'natureza');  // opcional: credito/debito

            if (iData < 0 || iValor < 0) {
                showToast('CSV não reconhecido: colunas obrigatórias "Data" e "Valor" não encontradas.', 'error');
                return null;
            }

            // 6. Monta o conteúdo OFX sinteticamente
            let blocos = '';
            let erros = 0;

            for (let i = 1; i < linhas.length; i++) {
                const cols = parseCsvLine(linhas[i]);
                if (cols.length <= Math.max(iData, iValor)) { erros++; continue; }

                const dataIso = parseData(cols[iData] || '');
                if (!dataIso) { erros++; continue; }

                let valor = parseMoeda(cols[iValor] || '');
                if (isNaN(valor)) { erros++; continue; }

                // Se existir coluna de tipo e disser "débito"/"debit"/"D", inverte o sinal
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

            // 7. Embrulha no envelope OFX mínimo que o parseOfxContent já sabe ler
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

        // 4. PARSER DO OFX (O CÉREBRO)
        function parseOfxContent(content) {
            ofxParsedTransactions = [];
            const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
            let match;
            
            while ((match = trnRegex.exec(content)) !== null) {
                const block = match[1];
                
                const amtMatch = block.match(/<TRNAMT>([-+]?\d*\.?\d+)/);
                const dateMatch = block.match(/<DTPOSTED>(\d{8})/);
                const memoMatch = block.match(/<MEMO>([^<]*)/);
                const nameMatch = block.match(/<NAME>([^<]*)/);
                const fitidMatch = block.match(/<FITID>([^<]*)/); // Extrai o ID único do banco
                
                if (amtMatch && dateMatch) {
                    const amount = parseFloat(amtMatch[1]);
                    const dateStr = dateMatch[1];
                    const formattedDate = `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`;
                    const fitid = fitidMatch ? fitidMatch[1].trim() : ('manual_' + (crypto.randomUUID ? crypto.randomUUID().split('-').join('').substring(0, 9) : Date.now().toString(36) + Math.random().toString(36).substr(2, 5)));
                    
                    let description = 'Lançamento Importado';
                    if (memoMatch && memoMatch[1].trim()) description = memoMatch[1].trim();
                    else if (nameMatch && nameMatch[1].trim()) description = nameMatch[1].trim();

                    // Mágica: Remove códigos numéricos bizarros dos nomes dos bancos para deixar mais limpo
                    description = description.replace(/^[0-9\-\/]+\s*/, '').trim();

                    // Segurança: Verifica na memória (ultrarrápido) se esse ID já existe no sistema!
                    const jaExiste = transactions.some(t => t.fitid === fitid);

                    ofxParsedTransactions.push({
                        id: 'ofx_' + (crypto.randomUUID ? crypto.randomUUID().split('-').join('').substring(0, 9) : Date.now().toString(36) + Math.random().toString(36).substr(2, 5)),
                        fitid: fitid, // Guarda a identificação do banco
                        isDuplicate: jaExiste, // Trava de segurança
                        type: amount >= 0 ? 'income' : 'expense',
                        value: Math.abs(amount),
                        date: formattedDate,
                        description: description,
                        category: '',
                        partner: '',      // Preparando o terreno para o preenchimento mágico
                        paymentType: '',  // Preparando o terreno para o preenchimento mágico
                        selected: !jaExiste // Se for duplicado, nasce bloqueado e desmarcado!
                    });
                }
            }
            
            // --- MÁGICA DO PREENCHIMENTO AUTOMÁTICO (MACHINE LEARNING) ---
            // 1. Cria um "cérebro" baseado no histórico de lançamentos do usuário
            const historicoMapeado = {};
            
            // Ordena do mais antigo pro mais novo, assim as classificações mais recentes sobrescrevem as antigas
            const transacoesAntigas = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
            
            transacoesAntigas.forEach(t => {
                // Se o lançamento antigo tiver descrição e alguma classificação salva...
                if (t.description && (t.category || t.partnerId || t.paymentMethod)) {
                    // Pega o nome do lançamento, deixa tudo minúsculo e tira os acentos para a busca não falhar
                    const descLimpa = t.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                    
                    // Ignora descrições genéricas muito curtas (menos de 4 letras) para não dar falso positivo
                    if (descLimpa.length > 3) {
                        historicoMapeado[descLimpa] = {
                            category: t.category || '',
                            partner: t.partnerId || '',
                            paymentType: t.paymentMethod || ''
                        };
                    }
                }
            });

            // 2. Aplica o cérebro nos novos lançamentos do extrato OFX
            ofxParsedTransactions.forEach(novoTx => {
                if (novoTx.isDuplicate) return; // Não perde tempo com o que já foi importado no passado

                const descNova = novoTx.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                let matchEncontrado = null;
                
                // Tenta achar uma correspondência exata primeiro (ex: "Aluguel" == "Aluguel")
                if (historicoMapeado[descNova]) {
                    matchEncontrado = historicoMapeado[descNova];
                } else {
                    // Se não achou exato, busca se o nome novo contém uma palavra antiga, ou vice-versa
                    // Exemplo: Se você salvou "UBER" no passado, preenche automático se o extrato vier "COMPRA DEB UBER EATS"
                    for (let chaveAntiga in historicoMapeado) {
                        if (descNova.includes(chaveAntiga) || chaveAntiga.includes(descNova)) {
                            matchEncontrado = historicoMapeado[chaveAntiga];
                            break; // Se achou um compatível, para de procurar
                        }
                    }
                }
                
                // Se achou alguém parecido no seu histórico, preenche os 3 campos magicamente!
                if (matchEncontrado) {
                    novoTx.category = matchEncontrado.category;
                    novoTx.partner = matchEncontrado.partner;
                    novoTx.paymentType = matchEncontrado.paymentType;
                }
            });
            
            // 3. MÁGICA DA CONCILIAÇÃO (Encontrar lançamentos pendentes para vincular)
            const transacoesPendentes = [...transactions].filter(t => !t.isPaid); // Pega só o que não foi pago

            ofxParsedTransactions.forEach(novoTx => {
                if (novoTx.isDuplicate) return; // Ignora se já foi importado

                // Procura um lançamento pendente que tenha o mesmo TIPO e VALOR EXATO
                // E que a data não seja tão distante (ex: no máximo 35 dias de diferença)
                const possivelMatch = transacoesPendentes.find(p => {
                    const mesmoTipo = p.type === novoTx.type;
                    // Fixa em 2 casas decimais para evitar bugs de centavos (ex: 15.50 === 15.5)
                    const mesmoValor = parseFloat(p.value).toFixed(2) === parseFloat(novoTx.value).toFixed(2);
                    
                    const dataPendente = new Date(p.date);
                    const dataOfx = new Date(novoTx.date);
                    const diffDias = Math.abs(dataOfx - dataPendente) / (1000 * 60 * 60 * 24);
                    
                    return mesmoTipo && mesmoValor && diffDias <= 35; 
                });

                if (possivelMatch) {
                    novoTx.reconcileWith = possivelMatch.id; // Salva o ID do lançamento original
                    novoTx.reconcileName = possivelMatch.description; // Salva o nome para mostrar na tela
                    
                    // Copia os dados do agendamento para a tela do OFX ficar preenchida certinho
                    novoTx.category = possivelMatch.category || novoTx.category;
                    novoTx.partner = possivelMatch.partnerId || novoTx.partner;
                    novoTx.paymentType = possivelMatch.paymentMethod || novoTx.paymentType;
                }
            });
            // -------------------------------------------------------------

            if (ofxParsedTransactions.length === 0) {
                showToast('Não encontramos lançamentos neste arquivo OFX.', 'warning');
                ofxFileInput.value = '';
                ofxFileNameDisplay.style.display = 'none';
            } else {
                showToast(`${ofxParsedTransactions.length} lançamentos encontrados!`, 'success');
                
                // MÁGICA: Descobre as datas reais do arquivo e preenche o filtro!
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

        // 5. NAVEGAÇÃO E RENDERIZAÇÃO DA LISTA (ETAPA 2)
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

        ofxNextBtn.addEventListener('click', () => goToOfxStep(2));
        ofxPrevBtn.addEventListener('click', () => goToOfxStep(1));

        // Evento do Filtro de Tipo
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

        // Evento do Filtro de Status (Novos / Já Importados)
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

        // FUNÇÃO CENTRAL: Checa se a transação obedece a TODOS os filtros!
        function txPassaNoFiltro(t, startDate, endDate) {
            if (ofxCurrentFilter !== 'all' && t.type !== ofxCurrentFilter) return false;
            if (ofxCurrentStatusFilter === 'new' && t.isDuplicate) return false;
            if (ofxCurrentStatusFilter === 'imported' && !t.isDuplicate) return false;
            if (startDate && t.date < startDate) return false;
            if (endDate && t.date > endDate) return false;
            return true;
        }

        function renderOfxReviewList() {
            // 1. Prepara a lista de Parceiros (Em ordem alfabética)
            let partnerOptionsHtml = '<option value="">Sem parceiro</option>';
            partners.filter(p => p.active !== false)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .forEach(p => {
                partnerOptionsHtml += `<option value="${p.id}">${p.name}</option>`;
            });

            // 2. Prepara a lista de Formas de Pagamento (Em ordem alfabética)
            let paymentOptionsHtml = '<option value="">Forma de pagamento</option>';
            paymentTypes.filter(pt => pt.active !== false)
                        .sort((a, b) => a.description.localeCompare(b.description))
                        .forEach(pt => {
                paymentOptionsHtml += `<option value="${pt.id}">${pt.description}</option>`;
            });

            let html = '';
            
            // Pega os valores das datas
            const startDate = document.getElementById('ofxFilterDateStart') ? document.getElementById('ofxFilterDateStart').value : '';
            const endDate = document.getElementById('ofxFilterDateEnd') ? document.getElementById('ofxFilterDateEnd').value : '';

            // Aplica a filtragem cruzada (Tipo + Status + Data) usando a Função Central
            const filteredOfxTxs = ofxParsedTransactions.filter(t => txPassaNoFiltro(t, startDate, endDate));

            filteredOfxTxs.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((t, i) => {
                const isIncome = t.type === 'income';
                const sign = isIncome ? '+' : '-';
                
                // Usamos as classes que já existem no sistema para o Modo Escuro automático!
                const valClass = isIncome ? 'receipt-val-income' : 'receipt-item-desc';
                
                // Mágica Visual: Se for duplicado, a linha fica opaca, a caixinha some e entra uma tag de aviso
                const opacity = t.isDuplicate ? '0.5' : '1';
                const pointerEvents = t.isDuplicate ? 'none' : 'auto'; // Trava o clique
                const checkElement = t.isDuplicate 
                    ? `<span class="material-icons" style="color: #d93025; font-size: 1.2rem; flex-shrink: 0;" title="Lançamento já importado anteriormente">warning</span>`
                    : `<input type="checkbox" class="ofx-check" data-id="${t.id}" ${t.selected ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #1a73e8; cursor: pointer; flex-shrink: 0;">`;
                
                // MÁGICA VISUAL: Etiqueta de Conciliação (Agora Clicável!)
                const isDark = document.body.classList.contains('dark-mode');
                let badgeConciliacao = '';
                if (t.reconcileWith) {
                    badgeConciliacao = `<div onclick="window.abrirModalConciliacaoOfx('${escapeJsAttr(t.id)}')" style="background: ${isDark ? 'rgba(138,180,248,0.15)' : 'rgba(26,115,232,0.1)'}; color: ${isDark ? '#8ab4f8' : '#1a73e8'}; font-size: 0.75rem; font-weight: 600; padding: 4px 10px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px; margin-top: 6px; border: 1px solid ${isDark ? 'rgba(138,180,248,0.3)' : 'rgba(26,115,232,0.3)'}; cursor: pointer; transition: background 0.2s;" title="Clique para trocar"><span class="material-icons" style="font-size: 1rem;">link</span> Conciliar com: ${escapeHtml(t.reconcileName)} <span class="material-icons" style="font-size: 0.85rem; margin-left: 2px;">edit</span></div>`;
                } else {
                    badgeConciliacao = `<div onclick="window.abrirModalConciliacaoOfx('${escapeJsAttr(t.id)}')" style="background: transparent; color: ${isDark ? '#9aa0a6' : '#5f6368'}; font-size: 0.7rem; font-weight: 500; padding: 4px 10px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px; margin-top: 6px; border: 1px dashed ${isDark ? 'var(--cor-borda-dark)' : '#dadce0'}; cursor: pointer; transition: background 0.2s;" title="Clique para vincular a uma conta agendada"><span class="material-icons" style="font-size: 0.9rem;">add_circle_outline</span> Importar como novo (Mudar)</div>`;
                }

                // 3. INTELIGÊNCIA DE CATEGORIAS: Só mostra as que batem com o TIPO da transação e em ordem alfabética!
                let catOptionsHtml = '<option value="">Sem categoria</option>';
                categories.filter(c => c.active !== false && c.type === t.type)
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

            // Eventos dos Checkboxes da Lista
            document.querySelectorAll('.ofx-check').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const tx = ofxParsedTransactions.find(x => x.id === e.target.dataset.id);
                    if (tx) tx.selected = e.target.checked;
                    updateOfxSummary();
                });
            });

            // Função Mágica para pintar o select de azul (preenchido) ou voltar ao cinza (vazio)
            const atualizarVisualDoSelect = (selectElement) => {
                if (selectElement.value !== "") {
                    selectElement.classList.add('ofx-select-filled');
                } else {
                    selectElement.classList.remove('ofx-select-filled');
                }
            };

            // Restaura e escuta as Categorias
            document.querySelectorAll('.ofx-cat-select').forEach(sel => {
                const tx = ofxParsedTransactions.find(x => x.id === sel.dataset.id);
                if (tx && tx.category) sel.value = tx.category;
                atualizarVisualDoSelect(sel); // Pinta na hora de carregar a tela
                sel.addEventListener('change', (e) => {
                    const tx = ofxParsedTransactions.find(x => x.id === e.target.dataset.id);
                    if (tx) tx.category = e.target.value;
                    atualizarVisualDoSelect(e.target); // Pinta na hora que o usuário escolhe
                });
            });

            // Restaura e escuta os Parceiros
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

            // Restaura e escuta as Formas de Pagamento
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

        ofxSelectAll.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const startDate = document.getElementById('ofxFilterDateStart') ? document.getElementById('ofxFilterDateStart').value : '';
            const endDate = document.getElementById('ofxFilterDateEnd') ? document.getElementById('ofxFilterDateEnd').value : '';

            // 1. Atualiza no Array principal apenas os itens que passam na Função Central
            ofxParsedTransactions.forEach(t => {
                if (txPassaNoFiltro(t, startDate, endDate)) {
                    // A Mágica de Segurança: Se está visível E NÃO É DUPLICADO, obedece ao checkbox mestre.
                    if (!t.isDuplicate) {
                        t.selected = isChecked;
                    }
                }
            });
            
            // 2. Para a tela refletir, nós redesenhamos a lista, pois ela já respeita o array atualizado!
            renderOfxReviewList(); 
        });

        function updateOfxSummary() {
            const countTotal = ofxParsedTransactions.filter(t => t.selected).length;
            ofxSummaryTotal.textContent = `Lançamentos prontos para importar: ${countTotal}`;
            ofxImportBtn.disabled = countTotal === 0;

            // Atualiza o pequeno contador logo abaixo da caixinha "Selecionar Todos"
            const topCountEl = document.getElementById('ofxTopSelectionCount');
            if (topCountEl) {
                if (countTotal > 0) {
                    topCountEl.textContent = `${countTotal} selecionado(s)`;
                    topCountEl.style.display = 'block';
                } else {
                    topCountEl.style.display = 'none';
                }
            }
            
            // Atualiza a caixinha "Selecionar Todos" baseada apenas nos itens visíveis
            const startDate = document.getElementById('ofxFilterDateStart') ? document.getElementById('ofxFilterDateStart').value : '';
            const endDate = document.getElementById('ofxFilterDateEnd') ? document.getElementById('ofxFilterDateEnd').value : '';

            const visibleTxs = ofxParsedTransactions.filter(t => txPassaNoFiltro(t, startDate, endDate));
            const selectedVisible = visibleTxs.filter(t => t.selected).length;
            
            // A caixinha só fica marcada se houver itens visíveis que PUDERAM ser selecionados (não bloqueados)
            const visibleAndSelectable = visibleTxs.filter(t => !t.isDuplicate);

            if (visibleAndSelectable.length > 0 && selectedVisible === visibleAndSelectable.length) {
                ofxSelectAll.checked = true;
            } else {
                ofxSelectAll.checked = false;
            }
        }

        // =========================================================
        // MOTOR DE CONCILIAÇÃO MANUAL DO OFX
        // =========================================================
        let ofxItemSendoConciliado = null;

        window.abrirModalConciliacaoOfx = function(ofxId) {
            ofxItemSendoConciliado = ofxParsedTransactions.find(t => t.id === ofxId);
            if (!ofxItemSendoConciliado) return;

            const modal = document.getElementById('ofxReconcileModal');
            const listaEl = document.getElementById('ofxReconcileList');
            const isDark = document.body.classList.contains('dark-mode');

            // MÁGICA: Calcula um "Limite Seguro" de +15 dias a partir da data do extrato OFX. 
            // Isso permite conciliar contas pagas um pouco adiantadas, mas bloqueia os provisionamentos de meses futuros!
            const ofxDateObj = new Date(ofxItemSendoConciliado.date + 'T12:00:00');
            ofxDateObj.setDate(ofxDateObj.getDate() + 15);
            const dataLimiteSegura = formatDateISO(ofxDateObj);

            // Puxa as transações do sistema que não estão pagas, do mesmo tipo, e dentro da Janela Segura
            const pendentes = transactions.filter(t => 
                !t.isPaid && 
                t.type === ofxItemSendoConciliado.type &&
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
                    // Diferença de valor: se for exata (margem de 5 centavos), recebe o selo verde
                    const diffVal = Math.abs(parseFloat(p.value) - parseFloat(ofxItemSendoConciliado.value));
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

                    // Se a diferença for considerável (> 5 centavos), pergunta ao usuário
                    if (diffVal > 0.05) {
                        const valExtratoStr = formatCurrency(ofxItemSendoConciliado.value);
                        const valPendenteStr = formatCurrency(pendenteValue);
                        const valDiffStr = formatCurrency(diffVal);
                        
                        // A Mágica do Layout Rico Injetado (Refinamento de UX)
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
                        
                        // Texto Principal Claro, Neutro e Autoexplicativo!
                        assumirValorDoExtrato = await askConfirmation('Valor Divergente Identificado', msg, 'Usar Valor do Banco', false, 'warning_amber');
                    }

                    ofxItemSendoConciliado.reconcileWith = pendenteId;
                    ofxItemSendoConciliado.reconcileName = pendenteName;
                    
                    // Salva a decisão e o valor antigo na memória
                    ofxItemSendoConciliado.updateValueToOfx = assumirValorDoExtrato;
                    ofxItemSendoConciliado.originalPendingValue = parseFloat(pendenteValue);
                    
                    // Puxa as classificações antigas
                    const pOrig = transactions.find(t => t.id === pendenteId);
                    if (pOrig) {
                        ofxItemSendoConciliado.category = pOrig.category || ofxItemSendoConciliado.category;
                        ofxItemSendoConciliado.partner = pOrig.partnerId || ofxItemSendoConciliado.partner;
                        ofxItemSendoConciliado.paymentType = pOrig.paymentMethod || ofxItemSendoConciliado.paymentType;
                    }
                } else {
                    // O usuário clicou em NÃO CONCILIAR (Criar como Novo)
                    ofxItemSendoConciliado.reconcileWith = null;
                    ofxItemSendoConciliado.reconcileName = null;
                    ofxItemSendoConciliado.updateValueToOfx = false;
                }
                
                // Fecha o modal e recarrega a lista para mostrar a alteração
                document.getElementById('ofxReconcileModal').style.display = 'none';
                renderOfxReviewList();
            }
        };

        // Fechar Modal (Clicando no X ou fora da tela)
        document.getElementById('closeOfxReconcileBtn')?.addEventListener('click', () => { document.getElementById('ofxReconcileModal').style.display = 'none'; });
        document.getElementById('ofxReconcileModal')?.addEventListener('click', (e) => { if (e.target === document.getElementById('ofxReconcileModal')) document.getElementById('ofxReconcileModal').style.display = 'none'; });

        // 6. IMPORTAÇÃO NO FIREBASE (BATCH)
        ofxImportBtn.addEventListener('click', async () => {
            const txsToImport = ofxParsedTransactions.filter(t => t.selected);
            if (txsToImport.length === 0) return;

            const accountId = ofxAccountSelect.value;
            const account = accounts.find(a => a.id === accountId);

            // --- DETETIVE DE TRANSFERÊNCIAS (INTELIGÊNCIA REFINADA ANTIDUPLICIDADE) ---
            let transCount = 0;
            let transSum = 0;
            let transValuesList = []; // MÁGICA: Array para guardar os valores separados
            const transferKeywords = /(pix|ted|doc|transf|tef|tev|envio)/i;

            // 1. Prepara o nome do usuário logado (deixa em minúsculas e remove acentos)
            const nomeUsuarioMestre = (window.currentUserName || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            // Quebra o nome em palavras e filtra apenas pedaços relevantes (ignora "da", "de", "do", "dos")
            const termosNomeUsuario = nomeUsuarioMestre.split(' ').filter(palavra => palavra.length > 2);

            txsToImport.forEach(t => {
                // Normaliza a descrição do banco para bater com o nome limpável
                const descBancoNormalizada = t.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                
                // Critério 1: Precisa ser um formato de transferência/pagamento rápido
                if (transferKeywords.test(descBancoNormalizada)) {
                    
                    // Critério 2: O nome do dono da conta (ou parte dele) precisa estar na descrição do banco
                    const contemProprioNome = termosNomeUsuario.some(termo => descBancoNormalizada.includes(termo));
                    
                    if (contemProprioNome) {
                        transCount++;
                        transSum += t.value;
                        transValuesList.push(formatCurrency(t.value)); // Guarda o valor bonitinho
                    }
                }
            });

            // Só exibe o aviso se realmente encontrar possíveis transferências selecionadas!
            if (transCount > 0) {
                // MÁGICA UX: Junta os valores com pipe ("|") e trava no máximo 5 para não estourar a tela
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
                        <p style="margin: 0 0 8px 0; color: #1a73e8; font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; gap: 6px;"><span style="font-size: 1.1rem;">💡</span> Recomendação</p>
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
            // ---------------------------------------------------

            const originalText = ofxImportBtn.innerHTML;
            ofxImportBtn.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">autorenew</span> Importando...';
            ofxImportBtn.disabled = true;

            const batch = db.batch();
            const nowIso = new Date().toISOString();
            
            // Fuso horário local para o extrato (A importação considera tudo "Pago" na hora, pois já aconteceu no banco)
            const now = new Date();
            const hoje = getTodayISO();
            
            let totalIncome = 0;
            let totalExpense = 0;

            txsToImport.forEach(t => {
                // Mágica para descobrir e salvar o NOME do parceiro no extrato, e não só o ID
                let pNameForDb = null;
                if (t.partner) {
                    const pObj = partners.find(p => p.id === t.partner);
                    if (pObj) pNameForDb = pObj.name;
                }

                if (t.reconcileWith) {
                    // --- MODO CONCILIAÇÃO: Atualiza o lançamento pendente existente! ---
                    const txRef = userRef('transactions').doc(t.reconcileWith);
                    
                    const updateData = {
                        isPaid: true,
                        paymentDate: t.date, // Registra que foi pago no dia exato do extrato
                        fitid: t.fitid || null, // Cola o ID do banco para evitar duplicidade futura
                        updatedAt: nowIso,
                        // Atualiza categoria e parceiro caso o usuário tenha mudado na tela do OFX
                        category: t.category || '',
                        partnerId: t.partner || null,
                        partnerName: pNameForDb,
                        paymentMethod: t.paymentType || ''
                    };

                    // Inteligência do Valor Divergente!
                    // Por padrão, se foi auto-match (que já é valor exato), ele assume o valor natural
                    let valorFinalDaConciliacao = t.value; 
                    
                    if (t.updateValueToOfx === true) {
                        // Se o usuário mandou atualizar o valor pro do extrato, injetamos no banco
                        updateData.value = t.value;
                    } else if (t.updateValueToOfx === false && t.originalPendingValue) {
                        // Se o usuário recusou a troca, o valor contabilizado no saldo TEM que ser o antigo agendado!
                        valorFinalDaConciliacao = t.originalPendingValue;
                    }
                    
                    batch.update(txRef, updateData);
                    
                    // Atualiza na memória RAM instantaneamente
                    const idx = transactions.findIndex(x => x.id === t.reconcileWith);
                    if (idx !== -1) {
                        transactions[idx] = { ...transactions[idx], ...updateData };
                    }
                    
                    // Soma para atualizar o saldo do banco no final usando a decisão do usuário!
                    if (t.type === 'income') totalIncome += valorFinalDaConciliacao;
                    else totalExpense += valorFinalDaConciliacao;

                } else {
                    // --- MODO CRIAÇÃO: Lançamento totalmente novo ---
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
                    
                    transactions.push({ id: txRef.id, ...sanitizeFirestoreData(newTx) });
                    
                    if (t.type === 'income') totalIncome += t.value;
                    else totalExpense += t.value;
                }
            });

            // Atualiza o saldo da conta numa tacada só
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