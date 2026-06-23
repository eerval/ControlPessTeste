var ControlPess = (() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // js/firebase-config.js
  var firebaseConfig, auth, db;
  var init_firebase_config = __esm({
    "js/firebase-config.js"() {
      firebaseConfig = {
        apiKey: "AIzaSyDmr1Cbguvfgryr2T7-Ck8G85okd9PJ-Fg",
        authDomain: "controlpess-d5c11.firebaseapp.com",
        projectId: "controlpess-d5c11",
        storageBucket: "controlpess-d5c11.firebasestorage.app",
        messagingSenderId: "294067954965",
        appId: "1:294067954965:web:1900f32e03db87c128351c"
      };
      firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();
      db = firebase.firestore();
    }
  });

  // js/utils.js
  function formatDateISO(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  function getTodayISO() {
    return formatDateISO(/* @__PURE__ */ new Date());
  }
  function escapeHtml(str) {
    if (typeof str !== "string") return str;
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
  function escapeJsAttr(str) {
    if (str == null) return "";
    return JSON.stringify(String(str)).slice(1, -1);
  }
  function sanitizeFirestoreData(data) {
    if (!data || typeof data !== "object") return data;
    const blocked = ["__proto__", "constructor", "prototype"];
    return Object.fromEntries(
      Object.entries(data).filter(([key]) => !blocked.includes(key))
    );
  }
  function formatCurrency(value) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  function formatDate(dateStr) {
    const date = /* @__PURE__ */ new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString("pt-BR");
  }
  function trendBadge(curr, prev, invertColors = false) {
    if (prev === 0) return '<span class="kpi-badge neutral" title="Sem dados no m\xEAs anterior">\u2014</span>';
    const pct = Math.round((curr - prev) / Math.abs(prev) * 100);
    const up = pct >= 0;
    const badgeClass = invertColors ? up ? "down" : "up" : up ? "up" : "down";
    const icon = up ? "arrow_upward" : "arrow_downward";
    return `<span class="kpi-badge ${badgeClass}" style="cursor: help;" title="Varia\xE7\xE3o em rela\xE7\xE3o ao m\xEAs passado"><span class="material-icons-outlined" style="font-size:12px;margin-right:4px;">${icon}</span>${Math.abs(pct)}%</span>`;
  }
  function calcDueDate(transDateStr, closingDay, dueDay) {
    const cDay = parseInt(closingDay) || 1;
    const dDay = parseInt(dueDay) || 10;
    const tDate = /* @__PURE__ */ new Date(transDateStr + "T12:00:00");
    let m = tDate.getMonth(), y = tDate.getFullYear(), d = tDate.getDate();
    if (d >= cDay) {
      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }
    if (dDay < cDay) {
      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(dDay).padStart(2, "0")}`;
  }
  function formatarMoeda(valor) {
    if (typeof valor === "string") valor = parseFloat(valor.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  function valorParaNumero(valorFormatado) {
    if (typeof valorFormatado === "number") return valorFormatado;
    const limpo = valorFormatado.replace(/[R$\s.]/g, "").replace(",", ".");
    return parseFloat(limpo) || 0;
  }
  function formatDateHeader(dateStr) {
    const txDate = /* @__PURE__ */ new Date(dateStr + "T12:00:00");
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (txDate.getTime() === today.getTime()) return "Hoje";
    if (txDate.getTime() === yesterday.getTime()) return "Ontem";
    const options = { day: "numeric", month: "long" };
    return txDate.toLocaleDateString("pt-BR", options);
  }
  function getCategoryNameById(categoryId) {
    if (!categoryId) return null;
    const cat = (window.__categories || []).find((c) => c.id === categoryId);
    return cat ? cat.name : null;
  }
  async function fetchAddressByCep(cep) {
    cep = cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        document.getElementById("partnerStreet").value = data.logradouro || "";
        document.getElementById("partnerNeighborhood").value = data.bairro || "";
        document.getElementById("partnerCity").value = data.localidade || "";
        document.getElementById("partnerState").value = data.uf || "";
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    }
  }
  function generateRecurrentDates(startDate, freq, interval, terminoTipo, terminoValue) {
    const dates = [];
    let current = /* @__PURE__ */ new Date(startDate + "T12:00:00");
    let count = 0;
    const maxCount = terminoTipo === "count" ? parseInt(terminoValue) || 12 : 365;
    const endDate = terminoTipo === "data" ? /* @__PURE__ */ new Date(terminoValue + "T12:00:00") : null;
    while (count < maxCount) {
      if (terminoTipo === "data" && current > endDate) break;
      dates.push(formatDateISO(current));
      count++;
      if (freq === "semanal") current.setDate(current.getDate() + 7 * interval);
      else if (freq === "mensal") current.setMonth(current.getMonth() + interval);
      else if (freq === "anual") current.setFullYear(current.getFullYear() + interval);
      if (terminoTipo === "nunca" && count >= 365) break;
    }
    return dates;
  }
  function getRecurrenceText() {
    const freq = document.getElementById("recFrequencia")?.value;
    const interval = parseInt(document.getElementById("recIntervalo")?.value) || 1;
    const terminoTipo = document.getElementById("terminoTipo")?.value;
    if (!freq) return "";
    let text = `A cada ${interval > 1 ? interval + " " : ""}`;
    const map = { semanal: "semanas", mensal: "meses", anual: "anos" };
    text += interval > 1 ? map[freq] : freq.replace("al", "");
    if (terminoTipo === "count") {
      const c = document.getElementById("terminoCount")?.value;
      text += ` \xB7 ${c} repeti\xE7\xF5es`;
    } else if (terminoTipo === "data") {
      const d = document.getElementById("terminoData")?.value;
      if (d) text += ` \xB7 at\xE9 ${formatDate(d)}`;
    }
    return text;
  }
  function applyDocMask(e) {
    let value = e.target.value.replace(/\D/g, "");
    const type = document.getElementById("partnerType")?.value;
    if (type === "Jur\xEDdica") {
      if (value.length <= 14) {
        value = value.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
      }
    } else {
      if (value.length <= 11) {
        value = value.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");
      }
    }
    e.target.value = value;
  }
  function updateDocLabel() {
    const type = document.getElementById("partnerType")?.value;
    const label = document.getElementById("docLabel");
    if (label) label.textContent = type === "Jur\xEDdica" ? "CNPJ" : "CPF/CNPJ";
  }
  var LIMITES;
  var init_utils = __esm({
    "js/utils.js"() {
      LIMITES = {
        MIN_SENHA: 6,
        MAX_PARCELAS: 24,
        MESES_DASHBOARD: 6,
        MAX_ITENS_PDF: 400,
        MAX_RECENTES_DASHBOARD: 3,
        MAX_NAO_PAGOS_DASHBOARD: 3,
        IDLE_TIMEOUT_MIN: 30,
        MAX_AVATAR_BYTES: 1024 * 1024,
        MIN_BUSCA_CHARS: 2
      };
    }
  });

  // js/ui-helpers.js
  function showToast(message, type = "error") {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = `custom-toast ${type}`;
    let icon = "info";
    if (type === "error") icon = "error_outline";
    if (type === "success") icon = "check_circle";
    if (type === "warning") icon = "warning";
    const iconSpan = document.createElement("span");
    iconSpan.className = "material-icons";
    iconSpan.textContent = icon;
    const msgSpan = document.createElement("span");
    msgSpan.textContent = message;
    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4e3);
  }
  function askPaymentDate(originalDate) {
    return new Promise((resolve) => {
      const modal = document.getElementById("confirmPaymentModal");
      const btnToday = document.getElementById("btnPayToday");
      const btnOriginal = document.getElementById("btnPayOriginal");
      const btnCancel = document.getElementById("btnCancelPayment");
      const hoje = /* @__PURE__ */ new Date();
      const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
      document.getElementById("payTodayDate").textContent = (/* @__PURE__ */ new Date(hojeStr + "T12:00:00")).toLocaleDateString("pt-BR");
      document.getElementById("payOriginalDate").textContent = (/* @__PURE__ */ new Date(originalDate + "T12:00:00")).toLocaleDateString("pt-BR");
      if (hojeStr === originalDate) {
        resolve(hojeStr);
        return;
      }
      modal.style.display = "flex";
      const cleanup = () => {
        modal.style.display = "none";
        btnToday.removeEventListener("click", onToday);
        btnOriginal.removeEventListener("click", onOriginal);
        btnCancel.removeEventListener("click", onCancel);
      };
      const onToday = () => {
        cleanup();
        resolve(hojeStr);
      };
      const onOriginal = () => {
        cleanup();
        resolve(originalDate);
      };
      const onCancel = () => {
        cleanup();
        resolve(null);
      };
      btnToday.addEventListener("click", onToday);
      btnOriginal.addEventListener("click", onOriginal);
      btnCancel.addEventListener("click", onCancel);
    });
  }
  function askPixKeySelection(acc) {
    return new Promise((resolve) => {
      const keys = [];
      if (acc.pixKeys && acc.pixKeys.length > 0) {
        acc.pixKeys.forEach((pk) => keys.push(pk.value));
      } else {
        if (acc.pixKey1) keys.push(acc.pixKey1);
        if (acc.pixKey2) keys.push(acc.pixKey2);
        if (acc.pixKey3) keys.push(acc.pixKey3);
      }
      if (keys.length === 0) {
        resolve(null);
        return;
      }
      if (keys.length === 1) {
        resolve(keys[0]);
        return;
      }
      const modal = document.getElementById("selectPixKeyModal");
      const container = document.getElementById("pixKeyOptionsContainer");
      const btnCancel = document.getElementById("btnCancelPixKeySelect");
      container.innerHTML = "";
      keys.forEach((key) => {
        const btn = document.createElement("button");
        btn.className = "btn btn-secondary";
        btn.style.width = "100%";
        btn.style.padding = "14px 20px";
        btn.style.border = "1px solid #dadce0";
        btn.style.fontWeight = "600";
        btn.textContent = key;
        btn.onclick = () => {
          cleanup();
          resolve(key);
        };
        container.appendChild(btn);
      });
      modal.style.display = "flex";
      const cleanup = () => {
        modal.style.display = "none";
        btnCancel.removeEventListener("click", onCancel);
      };
      const onCancel = () => {
        cleanup();
        resolve(null);
      };
      btnCancel.addEventListener("click", onCancel);
    });
  }
  function askConfirmation(title, message, confirmText = "Confirmar", isDanger = true, icon = "warning_amber", prefKey = null) {
    return new Promise((resolve) => {
      if (prefKey && localStorage.getItem(prefKey) === "true") {
        resolve(true);
        return;
      }
      const modal = document.getElementById("genericConfirmModal");
      const btnAccept = document.getElementById("btnAcceptConfirm");
      const btnCancel = document.getElementById("btnCancelConfirm");
      const btnCloseX = document.getElementById("btnCloseConfirmModal");
      const iconContainer = document.getElementById("confirmIconContainer");
      const iconEl = document.getElementById("confirmIcon");
      const dontShowContainer = document.getElementById("confirmDontShowContainer");
      const dontShowCheckbox = document.getElementById("confirmDontShowCheckbox");
      document.getElementById("confirmTitle").textContent = title;
      document.getElementById("confirmTitle").style.marginBottom = "0";
      document.getElementById("confirmMessage").textContent = message;
      btnAccept.textContent = confirmText;
      iconEl.textContent = icon;
      if (prefKey) {
        dontShowContainer.style.display = "flex";
        dontShowCheckbox.checked = false;
      } else {
        dontShowContainer.style.display = "none";
      }
      if (isDanger) {
        modal.classList.remove("warning-state");
        btnAccept.className = "btn btn-danger";
        iconContainer.style.background = "#fce8e8";
        iconEl.style.color = "#d93025";
      } else {
        modal.classList.add("warning-state");
        btnAccept.className = "btn btn-primary";
        iconContainer.style.background = "#fef0d9";
        iconEl.style.color = "#e67e22";
      }
      modal.style.display = "flex";
      const cleanup = () => {
        modal.style.display = "none";
        btnAccept.removeEventListener("click", onAccept);
        btnCancel.removeEventListener("click", onCancel);
        if (btnCloseX) btnCloseX.removeEventListener("click", onCancel);
      };
      const onAccept = () => {
        if (prefKey && dontShowCheckbox.checked) localStorage.setItem(prefKey, "true");
        cleanup();
        resolve(true);
      };
      const onCancel = () => {
        cleanup();
        resolve(false);
      };
      btnAccept.addEventListener("click", onAccept);
      btnCancel.addEventListener("click", onCancel);
      if (btnCloseX) btnCloseX.addEventListener("click", onCancel);
    });
  }
  var init_ui_helpers = __esm({
    "js/ui-helpers.js"() {
    }
  });

  // js/state.js
  function setEditingTransactionId(v) {
    editingTransactionId = v;
  }
  function setCurrentUser(v) {
    currentUser = v;
  }
  function setPrivacyActive(v) {
    privacyActive = v;
  }
  function setOfxCurrentStep(v) {
    ofxCurrentStep = v;
  }
  function setOfxCurrentFilter(v) {
    ofxCurrentFilter = v;
  }
  function setOfxCurrentStatusFilter(v) {
    ofxCurrentStatusFilter = v;
  }
  function setOfxItemSendoConciliado(v) {
    ofxItemSendoConciliado = v;
  }
  function setCurrentRStep(v) {
    currentRStep = v;
  }
  function setReceiptEligibleTxs(v) {
    receiptEligibleTxs = v;
  }
  function setCurrentBStep(v) {
    currentBStep = v;
  }
  function setBillingEligibleTxs(v) {
    billingEligibleTxs = v;
  }
  function setCurrentPeriod(v) {
    currentPeriod = v;
  }
  function setCurrentStatus(v) {
    currentStatus = v;
  }
  function setCurrentType(v) {
    currentType = v;
  }
  function setCurrentPartner(v) {
    currentPartner = v;
  }
  function setPreviousPeriod(v) {
    previousPeriod = v;
  }
  function setCustomStartDate(v) {
    customStartDate = v;
  }
  function setCustomEndDate(v) {
    customEndDate = v;
  }
  function userRef(collectionName) {
    return db.collection("users").doc(currentUser.uid).collection(collectionName);
  }
  async function loadUserData() {
    if (!currentUser) return;
    const dataLimite = /* @__PURE__ */ new Date();
    dataLimite.setMonth(dataLimite.getMonth() - 6);
    const dataLimiteStr = `${dataLimite.getFullYear()}-${String(dataLimite.getMonth() + 1).padStart(2, "0")}-01`;
    try {
      const [txSnapshot, partnersSnapshot, accountsSnapshot, categoriesSnapshot, costCentersSnapshot, paymentTypesSnapshot] = await Promise.all([
        userRef("transactions").where("date", ">=", dataLimiteStr).get(),
        userRef("partners").get(),
        userRef("accounts").get(),
        userRef("categories").get(),
        userRef("costCenters").get(),
        userRef("paymentTypes").get()
      ]);
      g.transactions = txSnapshot.docs.map((doc) => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
      g.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      g.partners = partnersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      g.accounts = accountsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      g.categories = categoriesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      g.costCenters = costCentersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      g.paymentTypes = paymentTypesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      showToast("Erro ao carregar dados. Verifique sua conex\xE3o.", "error");
    }
  }
  async function saveTransaction2(transaction) {
    if (!currentUser) return null;
    const { id, ...data } = transaction;
    try {
      const docRef = await userRef("transactions").add(data);
      g.transactions.push({ id: docRef.id, ...data });
      return docRef;
    } catch (error) {
      console.error("Erro ao salvar transa\xE7\xE3o:", error);
      showToast("Erro ao salvar transa\xE7\xE3o. Tente novamente.", "error");
      return null;
    }
  }
  async function deleteTransaction(id) {
    if (!currentUser) return false;
    try {
      await userRef("transactions").doc(id).delete();
      g.transactions = g.transactions.filter((t) => t.id !== id);
      return true;
    } catch (error) {
      console.error("Erro ao excluir transa\xE7\xE3o:", error);
      showToast("Erro ao excluir transa\xE7\xE3o. Tente novamente.", "error");
      return false;
    }
  }
  var currentUser, editingTransactionId, currentPeriod, currentType, currentStatus, currentView, privacyActive, currentPartner, customStartDate, customEndDate, previousPeriod, currentRStep, receiptEligibleTxs, currentBStep, billingEligibleTxs, ofxParsedTransactions, ofxCurrentStep, ofxCurrentFilter, ofxCurrentStatusFilter, ofxItemSendoConciliado, g;
  var init_state = __esm({
    "js/state.js"() {
      init_firebase_config();
      init_utils();
      init_ui_helpers();
      currentUser = null;
      editingTransactionId = null;
      currentPeriod = "month";
      currentType = "all";
      currentStatus = "all";
      currentView = { value: "dashboard" };
      privacyActive = localStorage.getItem("controlpess-privacy") === "true";
      currentPartner = "all";
      customStartDate = "";
      customEndDate = "";
      previousPeriod = "month";
      currentRStep = 1;
      receiptEligibleTxs = [];
      currentBStep = 1;
      billingEligibleTxs = [];
      ofxParsedTransactions = [];
      ofxCurrentStep = 1;
      ofxCurrentFilter = "all";
      ofxCurrentStatusFilter = "all";
      ofxItemSendoConciliado = null;
      g = {
        get transactions() {
          return window.__transactions || [];
        },
        set transactions(v) {
          window.__transactions = v;
        },
        get partners() {
          return window.__partners || [];
        },
        set partners(v) {
          window.__partners = v;
        },
        get accounts() {
          return window.__accounts || [];
        },
        set accounts(v) {
          window.__accounts = v;
        },
        get categories() {
          return window.__categories || [];
        },
        set categories(v) {
          window.__categories = v;
        },
        get costCenters() {
          return window.__costCenters || [];
        },
        set costCenters(v) {
          window.__costCenters = v;
        },
        get paymentTypes() {
          return window.__paymentTypes || [];
        },
        set paymentTypes(v) {
          window.__paymentTypes = v;
        }
      };
    }
  });

  // js/theme.js
  function updatePrivacyMode() {
    const valueElements = document.querySelectorAll(
      ".summary-card .value, .transaction-amount, .receipt-value.highlight, #receiptValor, #balanceValue, #incomeValue, #expenseValue, .indicator-item .value, #chartTotalIncome, #chartTotalExpense, .earnings-value, .privacy-text-value, .account-card-balance, #detAccountBalance, #detBalanceDay, #detBalanceAvailable, .daily-balance-neutral, .daily-balance-negative"
    );
    valueElements.forEach((el) => {
      if (privacyActive) {
        if (!el.dataset.original) el.dataset.original = el.innerHTML;
        el.textContent = "R$ ****";
      } else {
        if (el.dataset.original) el.innerHTML = el.dataset.original;
      }
    });
  }
  function togglePrivacy() {
    setPrivacyActive(!privacyActive);
    localStorage.setItem("controlpess-privacy", privacyActive);
    const btn = document.getElementById("privacyToggle");
    if (btn) {
      const icon = btn.querySelector("span");
      icon.textContent = privacyActive ? "visibility_off" : "visibility";
    }
    updatePrivacyMode();
  }
  function loadSavedTheme() {
    const savedTheme = localStorage.getItem("controlpess-theme");
    if (savedTheme === "dark") {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
    if (themeToggle) {
      const icon = themeToggle.querySelector("span");
      icon.textContent = document.body.classList.contains("dark-mode") ? "light_mode" : "dark_mode";
    }
  }
  function loadSavedUIStates() {
    const savedSidebar = localStorage.getItem("controlpess-sidebar");
    const appSidebar = document.getElementById("appSidebar");
    if (window.innerWidth > 768 && savedSidebar === "collapsed" && appSidebar) {
      appSidebar.classList.add("collapsed");
    }
    const btnPrivacy = document.getElementById("privacyToggle");
    if (btnPrivacy) {
      const icon = btnPrivacy.querySelector("span");
      icon.textContent = privacyActive ? "visibility_off" : "visibility";
    }
  }
  var themeToggle;
  var init_theme = __esm({
    "js/theme.js"() {
      init_state();
      themeToggle = document.getElementById("themeToggle");
    }
  });

  // js/factories.js
  function criarHtmlNotificacaoVazia() {
    return `
        <div class="notif-empty-state">
            <div class="notif-empty-icon">
                <span class="material-icons">done_all</span>
            </div>
            <h4 class="notif-empty-title">Tudo limpo!</h4>
            <p class="notif-empty-subtitle">Voc\xEA n\xE3o tem nenhuma pend\xEAncia.</p>
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
    let bgIcon = typeClass === "income" ? "#ecfdf5" : typeClass === "expense" ? "#fff1f2" : "#eef2ff";
    let corIcone = typeClass === "income" ? "#059669" : typeClass === "expense" ? "#e11d48" : "#4f46e5";
    let iconeFigma = icon;
    if (typeClass === "income") iconeFigma = "arrow_downward";
    if (typeClass === "expense") iconeFigma = "arrow_upward";
    if (typeClass === "transfer") iconeFigma = "sync_alt";
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
                    <th style="padding: 10px 8px; color: #5f6368; font-weight: 600;">Descri\xE7\xE3o</th>
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
    const inactiveClass = isInactive ? "inactive" : "";
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
  var init_factories = __esm({
    "js/factories.js"() {
      init_utils();
    }
  });

  // js/notifications.js
  function renderNotifications() {
    const emptyStateHtml = criarHtmlNotificacaoVazia();
    if (!g.transactions || g.transactions.length === 0) {
      notificationsDropdown.innerHTML = emptyStateHtml;
      notifBadge.style.display = "none";
      return;
    }
    const hojeLocal = getTodayISO();
    let html = "";
    let count = 0;
    const pendentes = g.transactions.filter((t) => !t.isPaid && t.type !== "transfer");
    pendentes.sort((a, b) => new Date(a.date) - new Date(b.date));
    pendentes.forEach((t) => {
      const title = t.description ? t.description : "(Sem descri\xE7\xE3o)";
      const isIncome = t.type === "income";
      if (t.date < hojeLocal) {
        const textLabel = isIncome ? "Recebimento Atrasado" : "Despesa Vencida";
        html += criarHtmlItemNotificacao(t.id, title, `${textLabel} em ${formatDate(t.date)}`, "error_outline", "overdue", "#d93025");
        count++;
      } else if (t.date === hojeLocal) {
        const textLabel = isIncome ? "A Receber Hoje" : "Vence Hoje";
        html += criarHtmlItemNotificacao(t.id, title, textLabel, "schedule", "today", "#e67e22");
        count++;
      }
    });
    if (count === 0) {
      notificationsDropdown.innerHTML = emptyStateHtml;
      notifBadge.style.display = "none";
    } else {
      notificationsDropdown.innerHTML = `<div style="padding: 12px 16px 4px 16px; font-size: 0.85rem; font-weight: 600; color: #5f6368; text-transform: uppercase; letter-spacing: 0.5px;">Pend\xEAncias</div>` + html;
      notifBadge.style.display = "flex";
      notifBadge.textContent = count > 9 ? "9+" : count;
    }
  }
  var notificationsBtn, notificationsDropdown, notifBadge;
  var init_notifications = __esm({
    "js/notifications.js"() {
      init_state();
      init_factories();
      init_utils();
      notificationsBtn = document.getElementById("notificationsBtn");
      notificationsDropdown = document.getElementById("notificationsDropdown");
      notifBadge = document.getElementById("notifBadge");
    }
  });

  // js/db.js
  async function processAccountBalance(tx, action = "apply") {
    if (!tx || tx.type === "transfer") return;
    const accountId = tx.accountId;
    if (!accountId) return;
    try {
      const accRef = userRef("accounts").doc(accountId);
      const accDoc = await accRef.get();
      if (!accDoc.exists) return;
      const currentBalance = accDoc.data().balance || 0;
      let delta = tx.type === "income" ? tx.value : -tx.value;
      if (action === "revert") delta = -delta;
      await accRef.update({ balance: currentBalance + delta });
      const idx = g.accounts.findIndex((a) => a.id === accountId);
      if (idx !== -1) g.accounts[idx].balance = (g.accounts[idx].balance || 0) + delta;
    } catch (error) {
      console.error("Erro ao processar saldo:", error);
    }
  }
  var init_db = __esm({
    "js/db.js"() {
      init_firebase_config();
      init_state();
    }
  });

  // js/settings.js
  function renderSettings() {
    const grid = document.querySelector("#settingsView .settings-grid");
    if (!grid) return;
    grid.removeEventListener("click", settingsCardHandler);
    grid.addEventListener("click", settingsCardHandler);
  }
  function settingsCardHandler(e) {
    const card = e.target.closest(".settings-card");
    if (!card) return;
    const setting = card.dataset.setting;
    switch (setting) {
      case "profile":
        document.querySelector("#settingsView .settings-grid").style.display = "none";
        profileView.style.display = "block";
        loadProfile();
        break;
      case "costCenters":
        document.querySelector("#settingsView .settings-grid").style.display = "none";
        costCentersView.style.display = "block";
        loadCostCenters();
        break;
      case "categories":
        document.querySelector("#settingsView .settings-grid").style.display = "none";
        categoriesView.style.display = "block";
        loadCategories();
        break;
      case "paymentTypes":
        document.querySelector("#settingsView .settings-grid").style.display = "none";
        paymentTypesView.style.display = "block";
        loadPaymentTypes();
        break;
      case "alerts":
        document.querySelector("#settingsView .settings-grid").style.display = "none";
        document.getElementById("alertsView").style.display = "block";
        const isHidden = localStorage.getItem("hideOfxTransferWarning") === "true";
        document.getElementById("toggleOfxWarning").checked = !isHidden;
        break;
    }
  }
  async function verificarERepararFormasPagamento() {
    if (!currentUser) return;
    const defaultPaymentTypes = [
      { description: "Dinheiro", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true },
      { description: "D\xE9bito", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true },
      { description: "Cr\xE9dito", allowsInstallments: true, maxInstallments: 24, isSystem: true, active: true },
      { description: "Pix", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true },
      { description: "Boleto", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true },
      { description: "Transfer\xEAncia", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true }
    ];
    const batch = db.batch();
    let houveAlteracao = false;
    defaultPaymentTypes.forEach((defaultPt) => {
      const nomeNorm = defaultPt.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const existente = g.paymentTypes.find(
        (p) => p.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === nomeNorm
      );
      if (!existente) {
        const newDocRef = userRef("paymentTypes").doc();
        const novaForma = { ...defaultPt, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
        batch.set(newDocRef, novaForma);
        g.paymentTypes.push({ id: newDocRef.id, ...novaForma });
        houveAlteracao = true;
      } else if (!existente.isSystem) {
        const docRef = userRef("paymentTypes").doc(existente.id);
        batch.update(docRef, { isSystem: true });
        existente.isSystem = true;
        houveAlteracao = true;
      }
    });
    if (houveAlteracao) {
      await batch.commit();
      console.log("\u{1F680} ControlPess: Conta antiga identificada e atualizada para a nova pol\xEDtica de seguran\xE7a!");
    }
  }
  async function verificarERepararContasPadrao() {
    if (!currentUser) return;
    const ptDinheiro = g.paymentTypes.find((p) => p.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === "dinheiro");
    const dinheiroId = ptDinheiro ? ptDinheiro.id : null;
    const existente = g.accounts.find(
      (a) => a.isSystem || a.type === "Carteira" && a.name.toLowerCase() === "carteira"
    );
    if (!existente) {
      const newDocRef = userRef("accounts").doc();
      const novaConta = {
        name: "Carteira",
        bankIspb: "Outros",
        bankName: "",
        type: "Carteira",
        balance: 0,
        observation: "Dinheiro em esp\xE9cie (F\xEDsico)",
        showOnDashboard: true,
        includeInKPI: true,
        hasCreditCard: false,
        active: true,
        isSystem: true,
        acceptedPaymentTypes: dinheiroId ? [dinheiroId] : [],
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
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
        await userRef("accounts").doc(existente.id).update(updateData);
        Object.assign(existente, sanitizeFirestoreData(updateData));
      }
    }
  }
  function closePaymentTypeModal() {
    paymentTypeModal.style.display = "none";
  }
  async function fetchPaymentTypes() {
    if (!currentUser) return;
    const snapshot = await db.collection("users").doc(currentUser.uid).collection("paymentTypes").get();
    g.paymentTypes = snapshot.docs.map((doc) => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
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
    let html = "";
    sortedPaymentTypes.forEach((pt) => {
      const statusLabel = pt.active !== false ? "Ativo" : "Inativo";
      const statusColor = pt.active !== false ? "#188038" : "#5f6368";
      const parcelamento = pt.allowsInstallments ? `Sim (at\xE9 ${pt.maxInstallments}x)` : "N\xE3o";
      const subHtml = `<strong style="color: ${statusColor};">${statusLabel}</strong> | Parcelamento: ${parcelamento}`;
      const deleteClass = pt.isSystem ? "delete-payment-type-hidden" : "delete-payment-type";
      let rowHtml = criarHtmlItemCadastro(pt.id, pt.active === false, "", pt.description, subHtml, "edit-payment-type", deleteClass);
      if (pt.isSystem) {
        rowHtml = rowHtml.replace('class="delete-payment-type-hidden" title="Excluir"', 'class="delete-payment-type-hidden" title="N\xE3o \xE9 poss\xEDvel excluir" style="display:none;"');
      }
      html += rowHtml;
    });
    paymentTypesList.innerHTML = html;
    document.querySelectorAll(".delete-payment-type").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const row = e.target.closest(".item-row");
        const id = row.dataset.id;
        if (await askConfirmation("Excluir", "Tem certeza que deseja excluir este tipo de pagamento?", "Excluir", true, "warning")) {
          await userRef("paymentTypes").doc(id).delete();
          g.paymentTypes = g.paymentTypes.filter((pt) => pt.id !== id);
          renderPaymentTypes();
        }
      });
    });
    document.querySelectorAll("#paymentTypesList .item-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.closest(".delete-payment-type")) {
          return;
        }
        const id = row.dataset.id;
        const pt = g.paymentTypes.find((p) => p.id === id);
        if (pt) {
          editingPaymentTypeId = id;
          const descInput = document.getElementById("paymentDescricao");
          descInput.value = pt.description;
          if (pt.isSystem) {
            descInput.disabled = true;
            descInput.style.backgroundColor = "#f1f3f4";
          } else {
            descInput.disabled = false;
            descInput.style.backgroundColor = "";
          }
          document.getElementById("paymentStatus").checked = pt.active !== false;
          document.getElementById("paymentParcelamento").checked = pt.allowsInstallments;
          document.getElementById("paymentMaxParcelas").value = pt.maxInstallments || 12;
          updateToggleStatus();
          paymentTypeModal.style.display = "flex";
        }
      });
    });
  }
  function updateToggleStatus() {
    const statusLabel = document.getElementById("paymentStatusLabel");
    if (statusLabel) {
      statusLabel.textContent = paymentStatusCheckbox.checked ? "Ativo" : "Inativo";
    }
    const showMax = paymentParcelamentoCheckbox.checked;
    paymentMaxParcelas.disabled = !showMax;
    maxParcelasGroup.style.display = showMax ? "block" : "none";
  }
  async function fetchCostCenters() {
    if (!currentUser) return;
    const snapshot = await userRef("costCenters").get();
    g.costCenters = snapshot.docs.map((doc) => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
  }
  async function loadCostCenters() {
    await fetchCostCenters();
    renderCostCenters();
  }
  function renderCostCenterOptions(selectedId = null, centersList = g.costCenters) {
    let options = '<option value="">Nenhum</option>';
    if (centersList && centersList.length > 0) {
      centersList.forEach((cc) => {
        const selected = cc.id === selectedId ? "selected" : "";
        options += `<option value="${escapeHtml(cc.id)}" ${selected}>${escapeHtml(cc.description)}</option>`;
      });
    }
    return options;
  }
  async function fetchCategories2() {
    if (!currentUser) return;
    const snapshot = await db.collection("users").doc(currentUser.uid).collection("categories").get();
    g.categories = snapshot.docs.map((doc) => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
  }
  async function loadPaymentTypes() {
    await fetchPaymentTypes();
    renderPaymentTypes();
  }
  async function loadCategories() {
    if (document.getElementById("catSearchFilter")) document.getElementById("catSearchFilter").value = "";
    if (document.getElementById("catTypeFilter")) document.getElementById("catTypeFilter").value = "all";
    if (document.getElementById("catStatusFilter")) document.getElementById("catStatusFilter").value = "active";
    await Promise.all([
      fetchCategories2(),
      fetchCostCenters()
    ]);
    renderCategories();
  }
  function renderCategories() {
    const searchTerm = document.getElementById("catSearchFilter") ? document.getElementById("catSearchFilter").value.toLowerCase().trim() : "";
    const typeFilter = document.getElementById("catTypeFilter") ? document.getElementById("catTypeFilter").value : "all";
    const statusFilter = document.getElementById("catStatusFilter") ? document.getElementById("catStatusFilter").value : "active";
    let filteredCategories = g.categories.filter((cat) => {
      if (searchTerm && !(cat.name || "").toLowerCase().includes(searchTerm)) return false;
      if (typeFilter !== "all" && cat.type !== typeFilter) return false;
      if (statusFilter === "active" && cat.active === false) return false;
      if (statusFilter === "inactive" && cat.active !== false) return false;
      return true;
    });
    if (filteredCategories.length === 0) {
      categoriesList.innerHTML = '<div class="empty-message">Nenhuma categoria encontrada.</div>';
      return;
    }
    let html = "";
    filteredCategories.forEach((cat) => {
      const typeLabel = cat.type === "income" ? "Receita" : "Despesa";
      const activeLabel = cat.active ? "Ativo" : "Inativo";
      const activeColor = cat.active ? "#188038" : "#5f6368";
      const goal = cat.monthlyGoal ? `R$ ${parseFloat(cat.monthlyGoal).toFixed(2)}` : "N\xE3o definida";
      const avatar = `<span style="display: inline-block; width: 24px; height: 24px; border-radius: 50%; background-color: ${cat.color || "#ccc"}; flex-shrink: 0;"></span>`;
      const subHtml = `<strong style="color: ${activeColor};">${activeLabel}</strong> | ${typeLabel} | Meta: ${goal}`;
      html += criarHtmlItemCadastro(cat.id, cat.active === false, avatar, cat.name, subHtml, "edit-category", "delete-category");
    });
    categoriesList.innerHTML = html;
    document.querySelectorAll(".delete-category").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const row = e.target.closest(".item-row");
        const id = row.dataset.id;
        if (await askConfirmation("Excluir", "Tem certeza que deseja excluir esta categoria?", "Excluir", true, "warning")) {
          await userRef("categories").doc(id).delete();
          g.categories = g.categories.filter((cat) => cat.id !== id);
          renderCategories();
        }
      });
    });
    document.querySelectorAll("#categoriesList .item-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.closest(".delete-category")) return;
        const id = row.dataset.id;
        const cat = g.categories.find((c) => c.id === id);
        if (cat) {
          editingCategoryId = id;
          categoryName.value = cat.name;
          categoryType.value = cat.type || "expense";
          categoryColor.value = cat.color || "#1a73e8";
          const metaValor = cat.monthlyGoal || 0;
          const metaString = Math.round(metaValor * 100).toString();
          categoryMonthlyGoal.value = formatarMoeda(metaString) || "R$ 0,00";
          categoryActive.checked = cat.active !== false;
          updateCategoryActiveText();
          categoryCostCenter.innerHTML = renderCostCenterOptions(cat.costCenter || null);
          categoryModal.style.display = "flex";
        }
      });
    });
  }
  function closeCategoryModal() {
    categoryModal.style.display = "none";
  }
  function updateCostCenterActiveText() {
    const statusLabel = document.getElementById("costCenterActiveLabel");
    if (statusLabel) {
      statusLabel.textContent = costCenterActive.checked ? "Ativo" : "Inativo";
    }
  }
  function renderCostCenters() {
    if (g.costCenters.length === 0) {
      costCentersList.innerHTML = '<div class="empty-message">Nenhum centro de custo cadastrado.</div>';
      return;
    }
    let html = "";
    g.costCenters.forEach((cc) => {
      const statusLabel = cc.active !== false ? "Ativo" : "Inativo";
      const statusColor = cc.active !== false ? "#188038" : "#5f6368";
      const avatar = `<span style="display: inline-block; width: 24px; height: 24px; border-radius: 50%; background-color: ${cc.color || "#ccc"}; flex-shrink: 0;"></span>`;
      const subHtml = `<strong style="color: ${statusColor};">${statusLabel}</strong> | ${cc.observation || "Sem observa\xE7\xE3o"}`;
      html += criarHtmlItemCadastro(cc.id, cc.active === false, avatar, cc.description, subHtml, "edit-costcenter", "delete-costcenter");
    });
    costCentersList.innerHTML = html;
    document.querySelectorAll(".delete-costcenter").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const row = e.target.closest(".item-row");
        const id = row.dataset.id;
        if (await askConfirmation("Excluir", "Tem certeza que deseja excluir este centro de custo?", "Excluir", true, "warning")) {
          await userRef("costCenters").doc(id).delete();
          g.costCenters = g.costCenters.filter((cc) => cc.id !== id);
          renderCostCenters();
        }
      });
    });
    document.querySelectorAll("#costCentersList .item-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.closest(".delete-costcenter")) return;
        const id = row.dataset.id;
        const cc = g.costCenters.find((c) => c.id === id);
        if (cc) {
          editingCostCenterId = id;
          costCenterDescription.value = cc.description || "";
          costCenterObservation.value = cc.observation || "";
          costCenterColor.value = cc.color || "#1a73e8";
          costCenterActive.checked = cc.active !== false;
          updateCostCenterActiveText();
          costCenterModal.style.display = "flex";
        }
      });
    });
  }
  function closeCostCenterModal() {
    costCenterModal.style.display = "none";
  }
  async function loadProfile() {
    if (!currentUser) return;
    try {
      const userDoc = await db.collection("users").doc(currentUser.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        profileName.value = data.name || "";
        profileEmail.value = currentUser.email || "";
        aplicarFotoPerfil(data.photoURL || null);
      } else {
        const userData = {
          name: currentUser.displayName || currentUser.email.split("@")[0],
          email: currentUser.email,
          photoURL: null,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        await db.collection("users").doc(currentUser.uid).set(userData);
        profileName.value = userData.name;
        profileEmail.value = currentUser.email;
        aplicarFotoPerfil(null);
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    }
  }
  function aplicarFotoPerfil(url) {
    if (url && url.trim() !== "") {
      profileAvatar.innerHTML = "";
      const img = document.createElement("img");
      img.src = url;
      img.style.cssText = "width:100%; height:100%; object-fit:cover; border-radius:50%;";
      profileAvatar.appendChild(img);
      profileAvatar.style.background = "transparent";
    } else {
      const nome = profileName.value || currentUser?.email || "U";
      const inicial = nome.charAt(0).toUpperCase();
      profileAvatar.innerHTML = "";
      profileAvatar.textContent = inicial;
      profileAvatar.style.background = "linear-gradient(135deg, var(--accent), #059669)";
    }
  }
  function validateResetForm() {
    const pass = resetPassword.value.trim();
    const word = resetConfirmWord.value.trim().toUpperCase();
    if (pass.length > 0 && word === "EXCLUIR") {
      confirmReset.disabled = false;
      confirmReset.style.opacity = "1";
      confirmReset.style.cursor = "pointer";
    } else {
      confirmReset.disabled = true;
      confirmReset.style.opacity = "0.5";
      confirmReset.style.cursor = "not-allowed";
    }
  }
  function closeResetModalFn() {
    resetAccountModal.style.display = "none";
  }
  async function updateUserAvatar() {
    const btnAvatar = document.getElementById("userAvatarBtn");
    if (!btnAvatar) return;
    if (!currentUser) {
      btnAvatar.innerHTML = "";
      btnAvatar.innerHTML = '<span class="material-icons">account_circle</span>';
      return;
    }
    try {
      const userDoc = await db.collection("users").doc(currentUser.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        const photoURL = data.photoURL;
        if (photoURL && photoURL.startsWith("data:image")) {
          btnAvatar.innerHTML = "";
          const img = document.createElement("img");
          img.src = photoURL;
          img.alt = "Avatar";
          btnAvatar.appendChild(img);
        } else {
          const nome = data.name || currentUser.email || "U";
          const inicial = nome.charAt(0).toUpperCase();
          btnAvatar.innerHTML = "";
          const span = document.createElement("span");
          span.style.fontWeight = "600";
          span.textContent = inicial;
          btnAvatar.appendChild(span);
          btnAvatar.style.background = "#1a73e8";
          btnAvatar.style.color = "white";
        }
      } else {
        btnAvatar.innerHTML = "";
        btnAvatar.innerHTML = '<span class="material-icons">account_circle</span>';
      }
    } catch (error) {
      console.error("Erro ao carregar avatar:", error);
      btnAvatar.innerHTML = "";
      btnAvatar.innerHTML = '<span class="material-icons">account_circle</span>';
    }
  }
  function updateCategoryActiveText() {
    const statusLabel = document.getElementById("categoryActiveLabel");
    if (statusLabel) {
      statusLabel.textContent = categoryActive.checked ? "Ativo" : "Inativo";
    }
  }
  function initSettings() {
    document.getElementById("backFromAlerts")?.addEventListener("click", () => {
      document.getElementById("alertsView").style.display = "none";
      document.querySelector("#settingsView .settings-grid").style.display = "grid";
    });
    document.getElementById("ofxWarningAccordion")?.addEventListener("click", () => {
      const descContainer = document.getElementById("ofxWarningDesc");
      const chevron = document.getElementById("ofxWarningChevron");
      if (descContainer.style.gridTemplateRows === "0fr" || !descContainer.style.gridTemplateRows) {
        descContainer.style.gridTemplateRows = "1fr";
        chevron.style.transform = "rotate(180deg)";
      } else {
        descContainer.style.gridTemplateRows = "0fr";
        chevron.style.transform = "rotate(0deg)";
      }
    });
    document.getElementById("toggleOfxWarning")?.addEventListener("change", (e) => {
      if (e.target.checked) {
        localStorage.removeItem("hideOfxTransferWarning");
      } else {
        localStorage.setItem("hideOfxTransferWarning", "true");
      }
    });
    if (backFromPaymentTypes) backFromPaymentTypes.addEventListener("click", () => {
      paymentTypesView.style.display = "none";
      document.querySelector("#settingsView .settings-grid").style.display = "grid";
    });
    if (backFromCategories) backFromCategories.addEventListener("click", () => {
      categoriesView.style.display = "none";
      document.querySelector("#settingsView .settings-grid").style.display = "grid";
    });
    if (backFromCostCenters) backFromCostCenters.addEventListener("click", () => {
      costCentersView.style.display = "none";
      document.querySelector("#settingsView .settings-grid").style.display = "grid";
    });
    if (backFromProfile) backFromProfile.addEventListener("click", () => {
      profileView.style.display = "none";
      document.querySelector("#settingsView .settings-grid").style.display = "grid";
    });
    if (addPaymentTypeBtn) addPaymentTypeBtn.addEventListener("click", () => {
      editingPaymentTypeId = null;
      const descInput = document.getElementById("paymentDescricao");
      if (descInput) {
        descInput.value = "";
        descInput.disabled = false;
        descInput.style.backgroundColor = "";
      }
      const ps = document.getElementById("paymentStatus");
      if (ps) ps.checked = true;
      const pp = document.getElementById("paymentParcelamento");
      if (pp) pp.checked = false;
      const mpx = document.getElementById("paymentMaxParcelas");
      if (mpx) mpx.value = 12;
      updateToggleStatus();
      if (paymentTypeModal) paymentTypeModal.style.display = "flex";
    });
    if (closePaymentTypeBtn) closePaymentTypeBtn.addEventListener("click", closePaymentTypeModal);
    if (cancelPaymentTypeBtn) cancelPaymentTypeBtn.addEventListener("click", closePaymentTypeModal);
    if (paymentStatusCheckbox) paymentStatusCheckbox.addEventListener("change", updateToggleStatus);
    if (paymentParcelamentoCheckbox) paymentParcelamentoCheckbox.addEventListener("change", updateToggleStatus);
    if (paymentTypeModal) paymentTypeModal.addEventListener("click", (e) => {
      if (e.target === paymentTypeModal) closePaymentTypeModal();
    });
    if (savePaymentTypeBtn) savePaymentTypeBtn.addEventListener("click", async () => {
      const descricao = document.getElementById("paymentDescricao").value.trim();
      if (!descricao) {
        alert("Informe a descri\xE7\xE3o do tipo de pagamento.");
        return;
      }
      const paymentType = {
        description: descricao,
        active: paymentStatusCheckbox.checked,
        allowsInstallments: paymentParcelamentoCheckbox.checked,
        maxInstallments: paymentParcelamentoCheckbox.checked ? parseInt(paymentMaxParcelas.value) || 1 : null,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      try {
        if (!currentUser) {
          alert("Usu\xE1rio n\xE3o autenticado.");
          return;
        }
        if (editingPaymentTypeId) {
          await userRef("paymentTypes").doc(editingPaymentTypeId).update(paymentType);
          const index = g.paymentTypes.findIndex((pt) => pt.id === editingPaymentTypeId);
          if (index !== -1) g.paymentTypes[index] = { id: editingPaymentTypeId, ...paymentType };
        } else {
          paymentType.createdAt = (/* @__PURE__ */ new Date()).toISOString();
          const docRef = await userRef("paymentTypes").add(paymentType);
          g.paymentTypes.push({ id: docRef.id, ...paymentType });
        }
        renderPaymentTypes();
        closePaymentTypeModal();
      } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar. Tente novamente.");
      }
    });
    if (addCategoryBtn) addCategoryBtn.addEventListener("click", async () => {
      editingCategoryId = null;
      if (categoryName) categoryName.value = "";
      if (categoryType) categoryType.value = "expense";
      if (categoryColor) categoryColor.value = "#1a73e8";
      if (categoryMonthlyGoal) categoryMonthlyGoal.value = "R$ 0,00";
      if (categoryActive) {
        categoryActive.checked = true;
        updateCategoryActiveText();
      }
      if (categoryCostCenter) categoryCostCenter.innerHTML = renderCostCenterOptions(null, g.costCenters);
      if (categoryModal) categoryModal.style.display = "flex";
    });
    if (closeCategoryBtn) closeCategoryBtn.addEventListener("click", closeCategoryModal);
    if (cancelCategoryBtn) cancelCategoryBtn.addEventListener("click", closeCategoryModal);
    if (categoryActive) categoryActive.addEventListener("change", updateCategoryActiveText);
    if (categoryModal) categoryModal.addEventListener("click", (e) => {
      if (e.target === categoryModal) closeCategoryModal();
    });
    if (categoryMonthlyGoal) {
      categoryMonthlyGoal.addEventListener("input", function(e) {
        let rawValue = e.target.value.replace(/\D/g, "");
        if (rawValue.length > 15) rawValue = rawValue.slice(0, 15);
        e.target.value = rawValue.length ? formatarMoeda(rawValue) : "";
      });
      categoryMonthlyGoal.addEventListener("blur", function(e) {
        if (!e.target.value) e.target.value = "R$ 0,00";
      });
    }
    if (catSearchInput) catSearchInput.addEventListener("input", renderCategories);
    if (catTypeSelect) catTypeSelect.addEventListener("change", renderCategories);
    if (catStatusSelect) catStatusSelect.addEventListener("change", renderCategories);
    if (saveCategoryBtn) saveCategoryBtn.addEventListener("click", async () => {
      const name = categoryName.value.trim();
      if (!name) {
        alert("Informe o nome da categoria.");
        return;
      }
      const categoryData = { name, type: categoryType.value, color: categoryColor.value, costCenter: categoryCostCenter.value || null, monthlyGoal: valorParaNumero(categoryMonthlyGoal.value) || 0, active: categoryActive.checked, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      try {
        if (!currentUser) {
          alert("Usu\xE1rio n\xE3o autenticado.");
          return;
        }
        if (editingCategoryId) {
          await userRef("categories").doc(editingCategoryId).update(categoryData);
          const index = g.categories.findIndex((c) => c.id === editingCategoryId);
          if (index !== -1) g.categories[index] = { id: editingCategoryId, ...categoryData };
        } else {
          categoryData.createdAt = (/* @__PURE__ */ new Date()).toISOString();
          const docRef = await userRef("categories").add(categoryData);
          g.categories.push({ id: docRef.id, ...categoryData });
        }
        renderCategories();
        closeCategoryModal();
      } catch (error) {
        console.error("Erro ao salvar categoria:", error);
        alert("Erro ao salvar. Tente novamente.");
      }
    });
    if (addCostCenterBtn) addCostCenterBtn.addEventListener("click", () => {
      editingCostCenterId = null;
      if (costCenterDescription) costCenterDescription.value = "";
      if (costCenterObservation) costCenterObservation.value = "";
      if (costCenterColor) costCenterColor.value = "#1a73e8";
      if (costCenterActive) {
        costCenterActive.checked = true;
        updateCostCenterActiveText();
      }
      if (costCenterModal) costCenterModal.style.display = "flex";
    });
    if (closeCostCenterBtn) closeCostCenterBtn.addEventListener("click", closeCostCenterModal);
    if (cancelCostCenterBtn) cancelCostCenterBtn.addEventListener("click", closeCostCenterModal);
    if (costCenterActive) costCenterActive.addEventListener("change", updateCostCenterActiveText);
    if (costCenterModal) costCenterModal.addEventListener("click", (e) => {
      if (e.target === costCenterModal) closeCostCenterModal();
    });
    if (saveCostCenterBtn) saveCostCenterBtn.addEventListener("click", async () => {
      const description = costCenterDescription.value.trim();
      if (!description) {
        alert("Informe a descri\xE7\xE3o do centro de custo.");
        return;
      }
      const costCenterData = { description, observation: costCenterObservation.value.trim() || null, color: costCenterColor.value, active: costCenterActive.checked, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      try {
        if (!currentUser) {
          alert("Usu\xE1rio n\xE3o autenticado.");
          return;
        }
        if (editingCostCenterId) {
          await userRef("costCenters").doc(editingCostCenterId).update(costCenterData);
          const index = g.costCenters.findIndex((cc) => cc.id === editingCostCenterId);
          if (index !== -1) g.costCenters[index] = { id: editingCostCenterId, ...costCenterData };
        } else {
          costCenterData.createdAt = (/* @__PURE__ */ new Date()).toISOString();
          const docRef = await userRef("costCenters").add(costCenterData);
          g.costCenters.push({ id: docRef.id, ...costCenterData });
        }
        renderCostCenters();
        closeCostCenterModal();
      } catch (error) {
        console.error("Erro ao salvar centro de custo:", error);
        alert("Erro ao salvar. Tente novamente.");
      }
    });
    if (saveProfileBtn) saveProfileBtn.addEventListener("click", async () => {
      const newName = profileName.value.trim();
      if (!newName) {
        showToast("O nome n\xE3o pode ficar vazio.", "warning");
        return;
      }
      if (!currentUser) return;
      try {
        await db.collection("users").doc(currentUser.uid).update({ name: newName, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
        await updateUserAvatar();
        await currentUser.updateProfile({ displayName: newName });
        showToast("Nome atualizado com sucesso!", "success");
        aplicarFotoPerfil(null);
      } catch (error) {
        console.error("Erro ao atualizar nome:", error);
        showToast("Erro ao atualizar nome.", "error");
      }
    });
    if (changePhotoBtn) changePhotoBtn.addEventListener("click", () => {
      if (photoUpload) photoUpload.click();
    });
    if (photoUpload) photoUpload.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        alert("Por favor, selecione uma imagem.");
        return;
      }
      if (file.size > 1024 * 1024) {
        alert("A imagem deve ter no m\xE1ximo 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64 = event.target.result;
          await db.collection("users").doc(currentUser.uid).update({ photoURL: base64 });
          aplicarFotoPerfil(base64);
          await updateUserAvatar();
          alert("Foto atualizada com sucesso!");
        } catch (error) {
          console.error("Erro ao salvar foto:", error);
          alert("Erro ao salvar a foto. Tente novamente.");
        }
      };
      reader.readAsDataURL(file);
    });
    if (changePasswordBtn) changePasswordBtn.addEventListener("click", async () => {
      if (!currentUser?.email) return;
      try {
        await auth.sendPasswordResetEmail(currentUser.email);
        showToast("E-mail de redefini\xE7\xE3o de senha enviado!", "success");
      } catch (error) {
        showToast("Erro ao enviar e-mail. Tente novamente.", "error");
      }
    });
    if (resetAccountBtn) resetAccountBtn.addEventListener("click", () => {
      if (resetPassword) resetPassword.value = "";
      if (resetConfirmWord) resetConfirmWord.value = "";
      if (resetErrorMsg) resetErrorMsg.textContent = "";
      validateResetForm();
      if (resetAccountModal) resetAccountModal.style.display = "flex";
    });
    if (resetPassword) resetPassword.addEventListener("input", () => {
      if (resetErrorMsg) resetErrorMsg.textContent = "";
      validateResetForm();
    });
    if (resetConfirmWord) resetConfirmWord.addEventListener("input", () => {
      if (resetErrorMsg) resetErrorMsg.textContent = "";
      validateResetForm();
    });
    if (closeResetModal) closeResetModal.addEventListener("click", closeResetModalFn);
    if (cancelReset) cancelReset.addEventListener("click", closeResetModalFn);
    if (resetAccountModal) resetAccountModal.addEventListener("click", (e) => {
      if (e.target === resetAccountModal) closeResetModalFn();
    });
    if (confirmReset) confirmReset.addEventListener("click", async () => {
      const password = resetPassword.value.trim();
      const word = resetConfirmWord.value.trim().toUpperCase();
      if (!password || word !== "EXCLUIR") return;
      if (!currentUser) return;
      const originalText = confirmReset.innerHTML;
      confirmReset.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">autorenew</span> Processando...';
      confirmReset.disabled = true;
      resetErrorMsg.textContent = "";
      const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, password);
      try {
        await currentUser.reauthenticateWithCredential(credential);
        const batch = db.batch();
        const collections = ["transactions", "paymentTypes", "categories", "costCenters", "accounts"];
        let dinheiroIdParaReset = null;
        for (const col of collections) {
          const snapshot = await userRef(col).get();
          if (col === "paymentTypes") {
            snapshot.docs.forEach((doc) => {
              const data = doc.data();
              if (data.isSystem) {
                const isCredit = data.description === "Cr\xE9dito";
                batch.update(doc.ref, { active: true, allowsInstallments: isCredit, maxInstallments: isCredit ? 24 : 1 });
                if (data.description === "Dinheiro") dinheiroIdParaReset = doc.id;
              } else {
                batch.delete(doc.ref);
              }
            });
          } else if (col === "accounts") {
            snapshot.docs.forEach((doc) => {
              const data = doc.data();
              if (data.isSystem) {
                batch.update(doc.ref, {
                  balance: 0,
                  active: true,
                  observation: "Dinheiro em esp\xE9cie (F\xEDsico)",
                  acceptedPaymentTypes: dinheiroIdParaReset ? [dinheiroIdParaReset] : []
                });
              } else {
                batch.delete(doc.ref);
              }
            });
          } else {
            snapshot.docs.forEach((doc) => batch.delete(doc.ref));
          }
        }
        await batch.commit();
        showToast("Dados exclu\xEDdos com sucesso. Reiniciando o sistema...", "success");
        closeResetModalFn();
        setTimeout(() => {
          window.location.reload();
        }, 2e3);
      } catch (error) {
        if (error.code === "auth/wrong-password") {
          resetErrorMsg.textContent = "Senha incorreta. Verifique e tente novamente.";
        } else {
          resetErrorMsg.textContent = "Erro ao redefinir conta. Tente novamente.";
        }
        confirmReset.innerHTML = originalText;
        validateResetForm();
      }
    });
    renderSettings();
  }
  var editingPaymentTypeId, editingCategoryId, editingCostCenterId, paymentTypeModal, closePaymentTypeBtn, cancelPaymentTypeBtn, paymentStatusCheckbox, paymentStatusText, paymentParcelamentoCheckbox, paymentParcelamentoText, maxParcelasGroup, paymentMaxParcelas, savePaymentTypeBtn, paymentTypesView, paymentTypesList, addPaymentTypeBtn, backFromPaymentTypes, categoriesView, categoriesList, addCategoryBtn, backFromCategories, categoryModal, closeCategoryBtn, cancelCategoryBtn, saveCategoryBtn, categoryName, categoryType, categoryColor, categoryCostCenter, categoryMonthlyGoal, categoryActive, categoryActiveText, catSearchInput, catTypeSelect, catStatusSelect, costCentersView, costCentersList, addCostCenterBtn, backFromCostCenters, costCenterModal, closeCostCenterBtn, cancelCostCenterBtn, saveCostCenterBtn, costCenterDescription, costCenterObservation, costCenterColor, costCenterActive, costCenterActiveText, profileView, backFromProfile, profileName, profileEmail, profileAvatar, changePhotoBtn, photoUpload, changePasswordBtn, resetAccountBtn, saveProfileBtn, resetAccountModal, closeResetModal, cancelReset, confirmReset, resetPassword, resetConfirmWord, resetErrorMsg;
  var init_settings = __esm({
    "js/settings.js"() {
      init_firebase_config();
      init_state();
      init_utils();
      init_factories();
      init_ui_helpers();
      init_theme();
      editingPaymentTypeId = null;
      editingCategoryId = null;
      editingCostCenterId = null;
      paymentTypeModal = document.getElementById("paymentTypeModal");
      closePaymentTypeBtn = document.getElementById("closePaymentTypeModal");
      cancelPaymentTypeBtn = document.getElementById("cancelPaymentType");
      paymentStatusCheckbox = document.getElementById("paymentStatus");
      paymentStatusText = document.getElementById("paymentStatusText");
      paymentParcelamentoCheckbox = document.getElementById("paymentParcelamento");
      paymentParcelamentoText = document.getElementById("paymentParcelamentoText");
      maxParcelasGroup = document.getElementById("maxParcelasGroup");
      paymentMaxParcelas = document.getElementById("paymentMaxParcelas");
      savePaymentTypeBtn = document.getElementById("savePaymentType");
      paymentTypesView = document.getElementById("paymentTypesView");
      paymentTypesList = document.getElementById("paymentTypesList");
      addPaymentTypeBtn = document.getElementById("addPaymentTypeBtn");
      backFromPaymentTypes = document.getElementById("backFromPaymentTypes");
      categoriesView = document.getElementById("categoriesView");
      categoriesList = document.getElementById("categoriesList");
      addCategoryBtn = document.getElementById("addCategoryBtn");
      backFromCategories = document.getElementById("backFromCategories");
      categoryModal = document.getElementById("categoryModal");
      closeCategoryBtn = document.getElementById("closeCategoryModal");
      cancelCategoryBtn = document.getElementById("cancelCategory");
      saveCategoryBtn = document.getElementById("saveCategory");
      categoryName = document.getElementById("categoryName");
      categoryType = document.getElementById("categoryType");
      categoryColor = document.getElementById("categoryColor");
      categoryCostCenter = document.getElementById("categoryCostCenter");
      categoryMonthlyGoal = document.getElementById("categoryMonthlyGoal");
      categoryActive = document.getElementById("categoryActive");
      categoryActiveText = document.getElementById("categoryActiveText");
      catSearchInput = document.getElementById("catSearchFilter");
      catTypeSelect = document.getElementById("catTypeFilter");
      catStatusSelect = document.getElementById("catStatusFilter");
      costCentersView = document.getElementById("costCentersView");
      costCentersList = document.getElementById("costCentersList");
      addCostCenterBtn = document.getElementById("addCostCenterBtn");
      backFromCostCenters = document.getElementById("backFromCostCenters");
      costCenterModal = document.getElementById("costCenterModal");
      closeCostCenterBtn = document.getElementById("closeCostCenterModal");
      cancelCostCenterBtn = document.getElementById("cancelCostCenter");
      saveCostCenterBtn = document.getElementById("saveCostCenter");
      costCenterDescription = document.getElementById("costCenterDescription");
      costCenterObservation = document.getElementById("costCenterObservation");
      costCenterColor = document.getElementById("costCenterColor");
      costCenterActive = document.getElementById("costCenterActive");
      costCenterActiveText = document.getElementById("costCenterActiveText");
      profileView = document.getElementById("profileView");
      backFromProfile = document.getElementById("backFromProfile");
      profileName = document.getElementById("profileName");
      profileEmail = document.getElementById("profileEmail");
      profileAvatar = document.getElementById("profileAvatar");
      changePhotoBtn = document.getElementById("changePhotoBtn");
      photoUpload = document.getElementById("photoUpload");
      changePasswordBtn = document.getElementById("changePasswordBtn");
      resetAccountBtn = document.getElementById("resetAccountBtn");
      saveProfileBtn = document.getElementById("saveProfileBtn");
      resetAccountModal = document.getElementById("resetAccountModal");
      closeResetModal = document.getElementById("closeResetModal");
      cancelReset = document.getElementById("cancelReset");
      confirmReset = document.getElementById("confirmReset");
      resetPassword = document.getElementById("resetPassword");
      resetConfirmWord = document.getElementById("resetConfirmWord");
      resetErrorMsg = document.getElementById("resetErrorMsg");
    }
  });

  // js/accounts.js
  function criarHtmlLayoutCarteira(props) {
    const htmlFatura = props.isPrepaid ? "" : `
        <div style="background: ${props.faturaBg}; border-radius: 22px; padding: 22px 22px 20px 22px; margin-bottom: 12px; border: 1px solid ${props.isDark ? props.cardColor + "40" : "rgba(0,0,0,0.05)"}; box-shadow: ${props.isDark ? "0 8px 32px rgba(0,0,0,0.35)" : "0 12px 30px rgba(0,0,0,0.07)"};">
            <div style="display: inline-flex; align-items: center; gap: 6px; background: ${props.statusColor}1f; border: 1px solid ${props.statusColor}33; border-radius: 20px; padding: 4px 12px; margin-bottom: 14px;">
                <div style="width: 6px; height: 6px; border-radius: 50%; background: ${props.statusColor};"></div>
                <span style="color: ${props.statusColor}; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.8px;">${escapeHtml(props.statusText)}</span>
            </div>
            <p style="color: ${props.subTextColor}; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Total da Fatura</p>
            <h2 style="font-size: 2.4rem; font-weight: 800; color: ${props.totalDisplayColor}; margin: 0 0 18px 0; letter-spacing: -1.5px; line-height: 1;">${props.displayInvoiceTotal}</h2>
            <div style="border-top: 1px solid ${props.borderColor}; margin-bottom: 16px;"></div>
            <div style="display: flex; gap: 0; margin-bottom: ${props.faturaPendenteTotal > 0 ? "18px" : "0"};">
                <div style="flex: 1; padding-right: 16px; border-right: 1px solid ${props.borderColor};">
                    <p style="color: ${props.subTextColor}; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">Pago</p>
                    <p style="font-size: 1.05rem; font-weight: 700; color: ${props.isDark ? "#81c995" : "#188038"}; margin: 0;">${formatCurrency(props.faturaTotal - props.faturaPendenteTotal)}</p>
                </div>
                <div style="flex: 1; padding-left: 16px;">
                    <p style="color: ${props.subTextColor}; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">Pendente</p>
                    <p style="font-size: 1.05rem; font-weight: 700; color: ${props.faturaPendenteTotal > 0 ? props.isDark ? "#ff8a80" : "#d93025" : props.isDark ? "#81c995" : "#188038"}; margin: 0;">${formatCurrency(props.faturaPendenteTotal)}</p>
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
            </button>` : ""}
        </div>`;
    const htmlLimite = `
        <div style="background: ${props.limitBg}; border-radius: 16px; padding: 16px 20px; margin-bottom: 12px; border: 1px solid ${props.borderColor}; box-shadow: ${props.isDark ? "0 4px 16px rgba(0,0,0,0.15)" : "0 4px 14px rgba(0,0,0,0.05)"};">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
                <p style="color: ${props.subTextColor}; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; margin: 0;">${props.isPrepaid ? "Saldo da Conta" : "Limite Dispon\xEDvel"}</p>
                ${!props.isPrepaid ? `<span style="font-size: 0.72rem; color: ${props.subTextColor};">${props.usedPct}% utilizado</span>` : ""}
            </div>
            <p style="font-size: 1.35rem; font-weight: 700; color: ${props.textColor}; margin: 0 0 10px 0; letter-spacing: -0.5px;">${props.available}</p>
            ${!props.isPrepaid ? `
            <div style="width: 100%; height: 6px; background: ${props.isDark ? "var(--cor-superficie-dark)" : "#f1f3f4"}; border-radius: 999px; overflow: hidden;">
                <div style="height: 100%; width: ${Math.min(props.usedPct, 100)}%; background: ${props.usedPct > 80 ? props.isDark ? "#ff8a80" : "#d93025" : props.usedPct > 50 ? "#e67e22" : props.cardColor}; border-radius: 999px;"></div>
            </div>
            <p style="font-size: 0.72rem; color: ${props.subTextColor}; margin: 6px 0 0 0;">${props.limitUsedTotal} de ${props.limit} utilizados</p>` : ""}
        </div>`;
    return `
        <div class="wallet-desktop-grid">
            <div class="wallet-left-col">
                <div style="position: relative; margin-bottom: 12px; padding: 0 36px;">
                    ${props.arrowsHtml}
                    <div style="background: linear-gradient(135deg, ${props.cardColor}, #1a1a2e); border-radius: 16px; padding: 16px 24px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 8px 24px rgba(0,0,0,0.18); overflow: hidden; position: relative;">
                        <div style="position: absolute; top: -60%; left: -10%; width: 120%; height: 220%; background: radial-gradient(ellipse at top left, rgba(255,255,255,0.12) 0%, transparent 65%); pointer-events: none;"></div>
                        <div style="position: relative; z-index: 2;">
                            <span style="font-size: 1.1rem; font-family: 'Courier New', monospace; letter-spacing: 3px; color: white; font-weight: 700; opacity: 0.95;">\u2022\u2022\u2022\u2022 ${escapeHtml(props.cardLast4)}</span>
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
                        <span style="font-size: 0.75rem; font-weight: 700; color: ${props.subTextColor}; text-transform: uppercase; letter-spacing: 0.6px;">Lan\xE7amentos</span>
                        <span style="font-size: 0.75rem; font-weight: 600; color: ${props.subTextColor};">${props.txsCount} ${props.txsCount === 1 ? "item" : "itens"}</span>
                    </div>
                    <div class="wallet-tx-scroll-area">
                        ${props.txHtml}
                    </div>
                </div>
            </div>
        </div>
    `;
  }
  function getBankLogoHtml(bankName, ispb) {
    if (!bankName || bankName === "Outros") {
      return '<span class="material-icons" style="color: #9aa0a6;">account_balance_wallet</span>';
    }
    const ispbDomainMap = {
      "00000000": "bb.com.br",
      "00360305": "caixa.gov.br",
      "60701190": "itau.com.br",
      "60746948": "bradesco.com.br",
      "90400888": "santander.com.br",
      "18236120": "nubank.com.br",
      "00416968": "bancointer.com.br",
      "31872495": "c6bank.com.br",
      "22896431": "picpay.com",
      "10573521": "mercadopago.com.br",
      "13220451": "pagbank.com.br",
      "FLASH": "flashapp.com.br"
    };
    let domain = null;
    if (ispb && ispbDomainMap[ispb]) {
      domain = ispbDomainMap[ispb];
    } else {
      const upperName = bankName.toUpperCase();
      if (upperName.includes("MERCANTIL DO BRASIL")) domain = "mercantildobrasil.com.br";
      else if (upperName.includes("BRASIL") && upperName.includes("BCO DO")) domain = "bb.com.br";
      else if (upperName.includes("SANTANDER")) domain = "santander.com.br";
      else if (upperName.includes("CAIXA ECONOMICA") || upperName === "CAIXA") domain = "caixa.gov.br";
      else if (upperName.includes("ITA\xDA") || upperName.includes("ITAU")) domain = "itau.com.br";
      else if (upperName.includes("BRADESCO")) domain = "bradesco.com.br";
      else if (upperName.includes("NUBANK") || upperName.includes("NU PAGAMENTOS")) domain = "nubank.com.br";
      else if (upperName.includes("INTER")) domain = "bancointer.com.br";
      else if (upperName.includes("C6")) domain = "c6bank.com.br";
      else if (upperName.includes("PICPAY")) domain = "picpay.com";
      else if (upperName.includes("FLASH")) domain = "flashapp.com.br";
      else if (upperName.includes("MERCADO PAGO")) domain = "mercadopago.com.br";
      else if (upperName.includes("PAGSEGURO")) domain = "pagbank.com.br";
      else if (upperName.includes("SICREDI")) domain = "sicredi.com.br";
      else if (upperName.includes("SICOOB")) domain = "sicoob.com.br";
      else if (upperName.includes("BTG")) domain = "btgpactual.com";
      else if (upperName.includes("XP")) domain = "xpi.com.br";
      else if (upperName.includes("NEON")) domain = "banconeon.com.br";
    }
    const safeName = encodeURIComponent(bankName.replace(/'/g, ""));
    const fallbackAvatar = `https://ui-avatars.com/api/?name=${safeName}&background=random&color=fff&size=80`;
    if (domain) {
      const googleIcon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      return `<img src="${googleIcon}" onerror="this.onerror=null; this.src='${fallbackAvatar}';" style="width: 100%; height: 100%; object-fit: contain; padding: 6px; border-radius: 12px;">`;
    }
    return `<img src="${fallbackAvatar}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 12px;">`;
  }
  async function fetchBanksFromAPI() {
    if (allBanks.length > 0) return;
    try {
      const res = await fetch("https://brasilapi.com.br/api/banks/v1");
      const data = await res.json();
      allBanks = data.filter((b) => b.code && b.name);
      allBanks.push({ ispb: "FLASH", code: "---", name: "FLASH BENEF\xCDCIOS" });
      const picpay = allBanks.find((b) => b.ispb === "22896431");
      if (picpay) picpay.name = "PICPAY (INSTITUI\xC7\xC3O DE PAGAMENTO)";
      allBanks.sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
      console.error("Erro ao buscar bancos", e);
    }
  }
  function renderBankList(filterText = "") {
    const topBanks = [
      "BCO DO BRASIL S.A.",
      "CAIXA ECONOMICA FEDERAL",
      "BCO SANTANDER (BRASIL) S.A.",
      "ITA\xDA UNIBANCO S.A.",
      "BCO BRADESCO S.A.",
      "NU PAGAMENTOS S.A. - INSTITUI\xC7\xC3O DE PAGAMENTO",
      "BCO INTER S.A.",
      "PICPAY (INSTITUI\xC7\xC3O DE PAGAMENTO)",
      "MERCADO PAGO INSTITUI\xC7\xC3O DE PAGAMENTO LTDA.",
      "FLASH BENEF\xCDCIOS"
    ];
    let html = `<div class="custom-dropdown-item" data-ispb="Outros" data-name="Outros">Outro Banco / Carteira F\xEDsica</div>`;
    const lowerFilter = filterText.toLowerCase();
    if (filterText === "") {
      topBanks.forEach((tb) => {
        const bank = allBanks.find((b) => b.name === tb);
        if (bank) html += `<div class="custom-dropdown-item" data-ispb="${bank.ispb}" data-name="${bank.name}"><strong>${bank.code}</strong> - ${bank.name}</div>`;
      });
      html += `<div style="padding: 4px 16px; font-size: 0.8rem; color: #9aa0a6; background: #f8f9fa;">Comece a digitar para ver mais bancos...</div>`;
    } else {
      const filteredBanks = allBanks.filter((b) => b.name.toLowerCase().includes(lowerFilter) || b.code && b.code.toString().includes(lowerFilter));
      filteredBanks.forEach((b) => {
        html += `<div class="custom-dropdown-item" data-ispb="${b.ispb}" data-name="${b.name}"><strong>${b.code}</strong> - ${b.name}</div>`;
      });
      if (filteredBanks.length === 0) html += `<div style="padding: 12px 16px; color: #d93025;">Nenhum banco encontrado.</div>`;
    }
    accountBankList.innerHTML = html;
    document.querySelectorAll(".custom-dropdown-item").forEach((item) => {
      item.addEventListener("click", () => {
        const ispb = item.getAttribute("data-ispb");
        const name = item.getAttribute("data-name");
        accountBankValue.value = ispb;
        accountBankSearch.value = name === "Outros" ? "Outro Banco / Carteira F\xEDsica" : name;
        accountBankList.style.display = "none";
        accBankLogo.style.background = ispb === "Outros" ? "white" : "transparent";
        accBankLogo.innerHTML = getBankLogoHtml(name, ispb);
      });
    });
  }
  async function loadAccounts2() {
    if (!currentUser) return;
    const snapshot = await userRef("accounts").get();
    g.accounts = snapshot.docs.map((doc) => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
    renderAccounts2();
  }
  function renderAccounts2() {
    if (g.accounts.length === 0) {
      accountsList.innerHTML = '<div class="empty-message" style="grid-column: 1 / -1;">Nenhuma conta cadastrada. Clique em "Nova conta" para come\xE7ar.</div>';
      return;
    }
    const typeFilter = document.getElementById("accountTypeFilter")?.value || "all";
    const statusFilter = document.getElementById("accountStatusFilter")?.value || "all";
    let filtered = g.accounts.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (statusFilter === "active" && a.active === false) return false;
      if (statusFilter === "inactive" && a.active !== false) return false;
      return true;
    });
    let html = "";
    filtered.forEach((acc) => {
      const statusClass = acc.active !== false ? "acc-active" : "acc-inactive";
      const statusText = acc.active !== false ? "ATIVA" : "INATIVA";
      const balClass = acc.balance < 0 ? "negative" : "";
      let logoHtml = getBankLogoHtml(acc.bankName, acc.bankIspb);
      let iconesExtras = "";
      if (acc.hasCreditCard) {
        iconesExtras += `<span class="material-icons" style="font-size:1.2rem; color:#1a73e8; cursor:pointer; padding:4px; margin:-4px; border-radius:50%; background:rgba(26,115,232,0.1);" title="Abrir Fatura" onclick="event.stopPropagation(); abrirCarteira('${escapeJsAttr(acc.id)}')">credit_card</span>`;
      }
      if (acc.showOnDashboard) {
        iconesExtras += `<span class="material-icons" style="font-size:1.1rem; color:#1a73e8;" title="No Dashboard">dashboard</span>`;
      }
      const subtituloConta = `${acc.bankName || "Outros"} \u2022 ${acc.type}`;
      const saldoFormatado = formatCurrency(acc.balance || 0);
      html += criarHtmlCartaoConta(acc.id, logoHtml, statusClass, statusText, acc.name, subtituloConta, balClass, saldoFormatado, iconesExtras);
    });
    accountsList.innerHTML = html;
    document.querySelectorAll(".account-card").forEach((card) => {
      card.addEventListener("click", () => openAccountDetails(card.dataset.id));
    });
    updatePrivacyMode();
  }
  function openAccountDetails(id) {
    const acc = g.accounts.find((a) => a.id === id);
    if (!acc) return;
    document.getElementById("detAccountName").textContent = acc.name;
    document.getElementById("detBankLogo").innerHTML = getBankLogoHtml(acc.bankName, acc.bankIspb);
    const balFormat = formatCurrency(acc.balance || 0);
    const isNegative = acc.balance < 0;
    const balElement = document.getElementById("detAccountBalance");
    balElement.textContent = balFormat;
    balElement.style.color = isNegative ? "#d93025" : "";
    document.getElementById("detBalanceDay").textContent = balFormat;
    document.getElementById("detBalanceDay").style.color = isNegative ? "#d93025" : "";
    document.getElementById("detBalanceAvailable").textContent = balFormat;
    document.getElementById("detBalanceAvailable").style.color = isNegative ? "#d93025" : "";
    document.getElementById("detAccountType").textContent = acc.type;
    const tabConta = document.getElementById("bbTabConta");
    const tabCartao = document.getElementById("bbTabCartao");
    const contentConta = document.getElementById("accDetailsContent");
    const contentCartao = document.getElementById("accWalletContent");
    tabConta.classList.add("active");
    tabCartao.classList.remove("active");
    contentConta.style.display = "block";
    contentCartao.style.display = "none";
    document.getElementById("accountDetailsModal").classList.remove("expanded");
    tabConta.onclick = () => {
      tabConta.classList.add("active");
      tabCartao.classList.remove("active");
      contentConta.style.display = "block";
      contentCartao.style.display = "none";
      document.getElementById("accountDetailsModal").classList.remove("expanded");
    };
    if (acc.hasCreditCard) {
      tabCartao.style.display = "block";
      tabCartao.onclick = () => {
        tabCartao.classList.add("active");
        tabConta.classList.remove("active");
        contentConta.style.display = "none";
        contentCartao.style.display = "block";
        abrirCarteira(id, 0, true, true);
      };
    } else {
      tabCartao.style.display = "none";
    }
    const btnConfig = document.getElementById("btnOpenConfig");
    btnConfig.onclick = () => {
      document.getElementById("accountDetailsModal").style.display = "none";
      openAccountModal2(id);
    };
    document.getElementById("accountDetailsModal").style.display = "flex";
  }
  async function openAccountModal2(id = null) {
    editingAccountId = id;
    document.getElementById("accountModalTitle").textContent = id ? "Editar Conta" : "Nova Conta";
    await fetchBanksFromAPI();
    if (id) {
      const acc = g.accounts.find((a) => a.id === id);
      if (acc && acc.isSystem) {
        document.getElementById("deleteAccountBtn").style.display = "none";
      } else {
        document.getElementById("deleteAccountBtn").style.display = "inline-block";
      }
      accountBankValue.value = acc.bankIspb || "Outros";
      accountBankSearch.value = acc.bankIspb !== "Outros" && acc.bankName ? acc.bankName : "Outro Banco / Carteira F\xEDsica";
      accBankLogo.innerHTML = getBankLogoHtml(acc.bankName, acc.bankIspb);
      accBankLogo.style.background = acc.bankIspb === "Outros" ? "white" : "transparent";
      accountNameInput.value = acc.name;
      accountTypeInput.value = acc.type;
      accountBalanceLabel.textContent = "Saldo Atual (R$)";
      accountBalanceInput.value = formatCurrency(acc.balance);
      accountBalanceInput.disabled = true;
      accountBalanceHelper.textContent = "O saldo s\xF3 pode ser alterado atrav\xE9s de Lan\xE7amentos ou Transfer\xEAncias.";
      accountBalanceHelper.style.color = "#5f6368";
      accountObservationInput.value = acc.observation || "";
      accountShowDash.checked = acc.showOnDashboard !== false;
      accountIncludeKPI.checked = acc.includeInKPI !== false;
      accountHasCreditCard.checked = acc.hasCreditCard === true;
      accountActive.checked = acc.active !== false;
      document.getElementById("accountLimitType").value = acc.limitType || "individual";
      document.getElementById("accountGlobalLimit").value = acc.globalLimit ? formatCurrency(acc.globalLimit) : "";
      currentAccountPixKeys = acc.pixKeys ? [...acc.pixKeys] : [];
      if (currentAccountPixKeys.length === 0) {
        if (acc.pixKey1) currentAccountPixKeys.push({ type: "Desconhecido", value: acc.pixKey1 });
        if (acc.pixKey2) currentAccountPixKeys.push({ type: "Desconhecido", value: acc.pixKey2 });
        if (acc.pixKey3) currentAccountPixKeys.push({ type: "Desconhecido", value: acc.pixKey3 });
      }
      currentAccountCards = acc.cards ? [...acc.cards] : [];
      if (acc.hasCreditCard && currentAccountCards.length === 0 && acc.ccName) {
        currentAccountCards.push({
          id: "legacy_" + Date.now(),
          name: acc.ccName,
          last4: "****",
          brand: "Outra",
          typeFormat: "F\xEDsico",
          limit: acc.ccLimit || 0,
          color: acc.ccColor || "#ff7a00",
          isPrepaid: false,
          closingDay: acc.ccClosingDay || 1,
          dueDay: acc.ccDueDay || 10
        });
      }
    } else {
      document.getElementById("deleteAccountBtn").style.display = "none";
      document.getElementById("accountForm").reset();
      accountBankValue.value = "";
      accountBankSearch.value = "";
      accBankLogo.innerHTML = '<span class="material-icons" style="color: #9aa0a6;">account_balance</span>';
      accBankLogo.style.background = "white";
      accountBalanceLabel.textContent = "Saldo Inicial (R$) *";
      accountBalanceInput.value = "R$ 0,00";
      accountBalanceInput.disabled = false;
      accountBalanceHelper.textContent = "Defina o saldo para come\xE7ar. (N\xE3o edit\xE1vel depois)";
      accountBalanceHelper.style.color = "#1a73e8";
      accountShowDash.checked = true;
      accountIncludeKPI.checked = true;
      accountHasCreditCard.checked = false;
      accountActive.checked = true;
      currentAccountPixKeys = [];
      currentAccountCards = [];
    }
    renderAccountCardsList();
    document.getElementById("cardFormView").style.display = "none";
    document.getElementById("cardsListView").style.display = "block";
    renderAccountPixKeysList();
    document.getElementById("pixKeyFormView").style.display = "none";
    document.getElementById("pixKeysListView").style.display = "block";
    accountHasCreditCard.dispatchEvent(new Event("change"));
    accountActive.dispatchEvent(new Event("change"));
    await fetchPaymentTypes();
    const chipsContainer = document.getElementById("accountPaymentTypesContainer");
    chipsContainer.innerHTML = "";
    const accPaymentTypes = id ? g.accounts.find((a) => a.id === id).acceptedPaymentTypes || [] : [];
    g.paymentTypes.filter((pt) => pt.active !== false).forEach((pt) => {
      const isChecked = id ? accPaymentTypes.includes(pt.id) : true;
      chipsContainer.innerHTML += `
            <div class="payment-chip">
                <input type="checkbox" id="chip_pt_${pt.id}" value="${pt.id}" ${isChecked ? "checked" : ""}>
                <label for="chip_pt_${pt.id}">${pt.description}</label>
            </div>
        `;
    });
    function verificarExibicaoPix() {
      const pixConfigDiv = document.getElementById("accountPixConfig");
      let temPixMarcado = false;
      document.querySelectorAll('#accountPaymentTypesContainer input[type="checkbox"]:checked').forEach((cb) => {
        const label = document.querySelector(`label[for="${cb.id}"]`);
        if (label && label.textContent.toLowerCase().includes("pix")) {
          temPixMarcado = true;
        }
      });
      pixConfigDiv.style.display = temPixMarcado ? "block" : "none";
    }
    document.querySelectorAll('#accountPaymentTypesContainer input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener("change", verificarExibicaoPix);
    });
    verificarExibicaoPix();
    document.querySelector('[data-target="tabContaGeral"]').click();
    accountModal.style.display = "flex";
    setTimeout(() => {
      accountFormHasChanges = false;
    }, 100);
  }
  function getBankColorByIspb(ispb, bankName) {
    const map = {
      "00000000": "#fced22",
      "00360305": "#005ca9",
      "60701190": "#ec7000",
      "60746948": "#cc092f",
      "90400888": "#cc0000",
      "18236120": "#8a05be",
      "00416968": "#ff7a00",
      "31872495": "#242424",
      "22896431": "#11c76f",
      "10573521": "#009ee3",
      "13220451": "#00aba5",
      "FLASH": "#e20f54"
    };
    if (ispb && map[ispb]) return map[ispb];
    const upperName = (bankName || "").toUpperCase();
    if (upperName.includes("BRASIL") && upperName.includes("BCO DO")) return "#fced22";
    if (upperName.includes("SANTANDER")) return "#cc0000";
    if (upperName.includes("CAIXA")) return "#005ca9";
    if (upperName.includes("ITA\xDA") || upperName.includes("ITAU")) return "#ec7000";
    if (upperName.includes("BRADESCO")) return "#cc092f";
    if (upperName.includes("NUBANK")) return "#8a05be";
    if (upperName.includes("INTER")) return "#ff7a00";
    if (upperName.includes("C6")) return "#242424";
    if (upperName.includes("PICPAY")) return "#11c76f";
    if (upperName.includes("MERCADO PAGO")) return "#009ee3";
    if (upperName.includes("PAGSEGURO")) return "#00aba5";
    if (upperName.includes("SICREDI")) return "#00a54f";
    if (upperName.includes("SICOOB")) return "#003641";
    if (upperName.includes("BTG")) return "#181e4b";
    if (upperName.includes("XP")) return "#000000";
    if (upperName.includes("NEON")) return "#00e5ff";
    return "#1a73e8";
  }
  function getBrandLogoHtml(brand) {
    let logoUrl = "";
    switch (brand) {
      case "Mastercard":
        logoUrl = "assets/img/mastercard.png";
        break;
      case "Visa":
        logoUrl = "assets/img/visa.png";
        break;
      case "Elo":
        logoUrl = "assets/img/elo.png";
        break;
      case "American Express":
        logoUrl = "assets/img/amex.png";
        break;
      case "Hipercard":
        logoUrl = "assets/img/hipercard.png";
        break;
      default:
        return '<span class="material-icons" style="color: #9aa0a6;">credit_card</span>';
    }
    return `<img src="${logoUrl}" onerror="this.outerHTML='<span class=\\'material-icons\\' style=\\'color: #9aa0a6;\\'>credit_card</span>'" style="width: 100%; height: 100%; object-fit: contain; padding: 4px;">`;
  }
  function renderAccountCardsList() {
    const listEl = document.getElementById("innerCardsList");
    if (currentAccountCards.length === 0) {
      listEl.innerHTML = '<div class="empty-card-list" style="text-align: center; padding: 2rem; color: #9aa0a6; background: #f8f9fa; border-radius: 16px; border: 1px dashed #dadce0;">Nenhum cart\xE3o cadastrado.</div>';
      return;
    }
    let html = "";
    currentAccountCards.forEach((card, index) => {
      const limitTxt = card.isPrepaid ? "Pr\xE9-pago" : formatCurrency(card.limit);
      html += `
        <div class="card-list-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-radius: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 44px; height: 32px; border-radius: 6px; background: white; border: 1px solid #e8eaed; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05); flex-shrink: 0;">
                    ${getBrandLogoHtml(card.brand)}
                </div>
                <div>
                    <p style="font-weight: 600; font-size: 0.95rem; color: #202124; margin-bottom: 2px; display: flex; align-items: center; gap: 6px;">
                        ${card.name} 
                        <span style="color: #9aa0a6; font-weight: normal; font-size: 0.85rem;">\u2022 ${card.last4}</span>
                        ${card.isDefault ? `<span class="material-icons" style="font-size: 1.1rem; color: #f59e0b;" title="Cart\xE3o Principal do Dashboard">star</span>` : ""}
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
  function renderAccountPixKeysList() {
    const listEl = document.getElementById("innerPixKeysList");
    const btnAdd = document.getElementById("btnShowPixKeyForm");
    if (currentAccountPixKeys.length >= 5) {
      if (btnAdd) btnAdd.style.display = "none";
    } else {
      if (btnAdd) btnAdd.style.display = "flex";
    }
    if (currentAccountPixKeys.length === 0) {
      listEl.innerHTML = '<div style="text-align: center; padding: 1.5rem; color: #9aa0a6; background: transparent; border-radius: 12px; border: 1px dashed #dadce0; font-size: 0.85rem;">Nenhuma chave cadastrada.</div>';
      return;
    }
    let html = "";
    currentAccountPixKeys.forEach((pk, index) => {
      let icon = "vpn_key";
      if (pk.type === "CPF/CNPJ") icon = "badge";
      else if (pk.type === "Celular") icon = "smartphone";
      else if (pk.type === "E-mail") icon = "email";
      else if (pk.type === "Aleat\xF3ria") icon = "shuffle";
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
  function updateMiniQrCard() {
    const wrapper = document.getElementById("miniQrCardWrapper");
    const box = document.getElementById("miniQrBox");
    if (!wrapper || !box) return;
    let chave = "", tipo = "";
    if (document.getElementById("partnerDocIsPix").checked && document.getElementById("partnerDoc").value.trim()) {
      chave = document.getElementById("partnerDoc").value;
      tipo = "Documento";
    } else if (document.getElementById("partnerPhoneIsPix").checked && document.getElementById("partnerPhone").value.trim()) {
      chave = document.getElementById("partnerPhone").value;
      tipo = "Celular";
    } else if (document.getElementById("partnerEmailIsPix").checked && document.getElementById("partnerEmail").value.trim()) {
      chave = document.getElementById("partnerEmail").value;
      tipo = "E-mail";
    } else if (document.getElementById("partnerRandomPixIsPix") && document.getElementById("partnerRandomPixIsPix").checked && document.getElementById("partnerRandomPix").value.trim()) {
      chave = document.getElementById("partnerRandomPix").value;
      tipo = "Aleat\xF3ria";
    }
    if (chave) {
      wrapper.style.display = "flex";
      box.innerHTML = "";
      const nome = document.getElementById("partnerName").value || "Recebedor";
      const payload = gerarPayloadPix(chave, nome, tipo);
      if (typeof QRCode !== "undefined") {
        new QRCode(box, {
          text: payload,
          width: 160,
          height: 160,
          colorDark: "#202124",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.L
        });
      }
      document.getElementById("miniQrCard").onclick = () => abrirModalQrPixBigger(chave, nome, payload);
    } else {
      wrapper.style.display = "none";
    }
  }
  function gerarPayloadPix(chaveOrig, nome, tipoChave = "") {
    let chave = String(chaveOrig).trim();
    if (!tipoChave) {
      if (chave.includes("@")) tipoChave = "E-mail";
      else if (chave.includes("-") && chave.length > 20) tipoChave = "Aleat\xF3ria";
      else if (chave.includes("(")) tipoChave = "Celular";
      else tipoChave = "Documento";
    }
    if (tipoChave === "E-mail" || chave.includes("@")) {
    } else if (tipoChave === "Aleat\xF3ria") {
    } else {
      let apenasNumeros = chave.replace(/\D/g, "");
      if (tipoChave === "Celular") {
        if (!apenasNumeros.startsWith("55")) {
          apenasNumeros = "55" + apenasNumeros;
        }
        chave = "+" + apenasNumeros;
      } else {
        chave = apenasNumeros;
      }
    }
    let nomeFormatado = nome.substring(0, 25).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z ]/g, "");
    if (!nomeFormatado) nomeFormatado = "RECEBEDOR";
    const payloadFormat = "000201";
    const merchantAccountInfo = `26${(22 + chave.length).toString().padStart(2, "0")}0014br.gov.bcb.pix01${chave.length.toString().padStart(2, "0")}${chave}`;
    const merchantCategoryCode = "52040000";
    const transactionCurrency = "5303986";
    const countryCode = "5802BR";
    const merchantName = `59${nomeFormatado.length.toString().padStart(2, "0")}${nomeFormatado}`;
    const merchantCity = `6008BRASILIA`;
    const additionalDataFieldTemplate = "62070503***";
    let payload = payloadFormat + merchantAccountInfo + merchantCategoryCode + transactionCurrency + countryCode + merchantName + merchantCity + additionalDataFieldTemplate + "6304";
    let crc = 65535;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 32768) !== 0) crc = crc << 1 ^ 4129;
        else crc = crc << 1;
      }
    }
    return payload + (crc & 65535).toString(16).toUpperCase().padStart(4, "0");
  }
  function abrirModalQrPixBigger(chave, nome, payload) {
    document.getElementById("pixQrKeyLabel").textContent = `Chave: ${chave}`;
    const qrContainer = document.getElementById("qrcodeBoxBig");
    if (qrContainer) qrContainer.innerHTML = "";
    if (typeof QRCode !== "undefined") {
      new QRCode(qrContainer, {
        text: payload,
        width: 220,
        height: 220,
        colorDark: "#202124",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    }
    document.getElementById("pixQrModal").style.display = "flex";
  }
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
    codeReaderBoleto.decodeFromVideoDevice(void 0, "cameraVideo", (result, err) => {
      if (result) {
        const codeFound = result.text.replace(/\D/g, "");
        if (codeFound.length === 44) {
          document.getElementById("boletoLine").value = codeFound;
          scanStatus.style.display = "block";
          scanStatus.textContent = "C\xF3digo lido com sucesso!";
          scanStatus.style.color = "#188038";
          window.updateReceiptPreview?.();
          closeBoletoScanner();
        } else {
          scanStatus.style.display = "block";
          scanStatus.textContent = "Focando no c\xF3digo do boleto...";
          scanStatus.style.color = "#e67e22";
        }
      }
    }).catch((err) => {
      console.error("Erro na C\xE2mera:", err);
      isBoletoCameraRunning = false;
    });
  }
  function closeBoletoScanner() {
    stopBoletoCamera();
    scannerModal.style.display = "none";
  }
  function initAccounts() {
    if (document.getElementById("closeAccountDetailsBtn")) document.getElementById("closeAccountDetailsBtn").addEventListener("click", () => {
      if (document.getElementById("accountDetailsModal")) document.getElementById("accountDetailsModal").style.display = "none";
    });
    if (document.getElementById("accountDetailsModal")) document.getElementById("accountDetailsModal").addEventListener("click", (e) => {
      if (e.target === document.getElementById("accountDetailsModal")) {
        document.getElementById("accountDetailsModal").style.display = "none";
      }
    });
    accountBankSearch.addEventListener("focus", () => {
      renderBankList(accountBankSearch.value);
      accountBankList.style.display = "block";
    });
    accountBankSearch.addEventListener("input", (e) => {
      renderBankList(e.target.value);
      accountBankList.style.display = "block";
      accountBankValue.value = "";
    });
    document.addEventListener("click", (e) => {
      if (!document.getElementById("bankSelectorBox").contains(e.target)) {
        accountBankList.style.display = "none";
      }
    });
    if (document.getElementById("openAccountModalBtn")) document.getElementById("openAccountModalBtn").addEventListener("click", () => openAccountModal2());
    if (document.getElementById("closeAccountModal")) document.getElementById("closeAccountModal").addEventListener("click", () => {
      if (accountFormHasChanges) {
        showToast('Voc\xEA tem altera\xE7\xF5es n\xE3o salvas! Por favor, clique em "Salvar Conta" no rodap\xE9.', "warning");
        return;
      }
      accountModal.style.display = "none";
    });
    if (document.getElementById("cancelAccount")) document.getElementById("cancelAccount").addEventListener("click", () => {
      if (accountFormHasChanges) {
        showToast('Voc\xEA tem altera\xE7\xF5es n\xE3o salvas! Por favor, clique em "Salvar Conta" no rodap\xE9.', "warning");
        return;
      }
      accountModal.style.display = "none";
    });
    accountModal.addEventListener("click", (e) => {
      if (e.target === accountModal) {
        if (accountFormHasChanges) {
          showToast('Voc\xEA tem altera\xE7\xF5es n\xE3o salvas! Por favor, clique em "Salvar Conta" no rodap\xE9.', "warning");
          return;
        }
        accountModal.style.display = "none";
      }
    });
    if (document.getElementById("accountForm")) {
      const af = document.getElementById("accountForm");
      af.addEventListener("input", () => {
        accountFormHasChanges = true;
      });
      af.addEventListener("change", () => {
        accountFormHasChanges = true;
      });
    }
    accountBalanceInput.addEventListener("input", function(e) {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length === 0) {
        e.target.value = "";
        return;
      }
      e.target.value = formatarMoeda(value);
    });
    accountActive.addEventListener("change", async function() {
      const label = document.getElementById("accountActiveLabel");
      label.textContent = this.checked ? "Conta Ativa" : "Conta Inativa";
      if (!this.checked && editingAccountId) {
        const acc = g.accounts.find((a) => a.id === editingAccountId);
        if (acc && acc.balance > 0) {
          this.checked = true;
          label.textContent = "Conta Ativa";
          showToast("N\xE3o \xE9 poss\xEDvel inativar uma conta com saldo positivo. Zere a conta via transfer\xEAncia ou lan\xE7amento antes.", "warning");
        }
      }
    });
    accountHasCreditCard.addEventListener("change", function() {
      const limitConfigDiv = document.getElementById("accountLimitConfig");
      if (this.checked) {
        tabCartoesBtn.style.display = "block";
        limitConfigDiv.style.display = "block";
        document.getElementById("accountLimitType").dispatchEvent(new Event("change"));
      } else {
        tabCartoesBtn.style.display = "none";
        limitConfigDiv.style.display = "none";
        document.querySelector('[data-target="tabContaGeral"]').click();
      }
    });
    if (document.getElementById("accountLimitType")) document.getElementById("accountLimitType").addEventListener("change", function() {
      const limitGroup = document.getElementById("accountGlobalLimitGroup");
      if (limitGroup) limitGroup.style.display = this.value === "shared" ? "block" : "none";
    });
    if (document.getElementById("accountGlobalLimit")) document.getElementById("accountGlobalLimit").addEventListener("input", function(e) {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length === 0) {
        e.target.value = "";
        return;
      }
      e.target.value = formatarMoeda(value);
    });
    document.querySelectorAll("#accountTabs .tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll("#accountTabs .tab-btn").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll("#accountModal .tab-content").forEach((c) => c.classList.remove("active"));
        e.target.classList.add("active");
        document.getElementById(e.target.dataset.target).classList.add("active");
      });
    });
    if (document.getElementById("saveAccount")) document.getElementById("saveAccount").addEventListener("click", async () => {
      const name = accountNameInput.value.trim();
      const ispb = accountBankValue.value;
      if (!name) {
        showToast("Preencha o Apelido da Conta.", "warning");
        return;
      }
      if (!ispb) {
        showToast("Selecione uma Institui\xE7\xE3o Financeira.", "warning");
        return;
      }
      const saldoGarantido = accountBalanceInput.value ? valorParaNumero(accountBalanceInput.value) : 0;
      const bankName = ispb !== "Outros" ? accountBankSearch.value : "";
      const acceptedPaymentTypes = Array.from(document.querySelectorAll('#accountPaymentTypesContainer input[type="checkbox"]:checked')).map((cb) => cb.value);
      const accountData = {
        name,
        bankIspb: ispb,
        bankName,
        type: accountTypeInput.value,
        observation: accountObservationInput.value.trim(),
        showOnDashboard: accountShowDash.checked,
        includeInKPI: accountIncludeKPI.checked,
        hasCreditCard: accountHasCreditCard.checked,
        limitType: document.getElementById("accountLimitType").value,
        globalLimit: valorParaNumero(document.getElementById("accountGlobalLimit").value),
        active: accountActive.checked,
        pixKeys: currentAccountPixKeys,
        cards: accountHasCreditCard.checked ? currentAccountCards : [],
        acceptedPaymentTypes,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      try {
        if (editingAccountId) {
          await userRef("accounts").doc(editingAccountId).update(accountData);
          const index = g.accounts.findIndex((a) => a.id === editingAccountId);
          if (index !== -1) g.accounts[index] = { ...g.accounts[index], ...accountData };
        } else {
          accountData.balance = saldoGarantido;
          accountData.createdAt = (/* @__PURE__ */ new Date()).toISOString();
          const docRef = await userRef("accounts").add(accountData);
          g.accounts.push({ id: docRef.id, ...accountData });
          if (accountData.balance > 0) {
            await saveTransaction({
              type: "income",
              value: accountData.balance,
              description: "Saldo Inicial",
              category: "",
              isPaid: true,
              date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
              paymentDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
              contaDestino: name,
              createdAt: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
        }
        renderAccounts2();
        window.renderDashboard?.();
        accountModal.style.display = "none";
        showToast("Conta salva com sucesso!", "success");
      } catch (error) {
        console.error("Erro ao salvar conta:", error);
        showToast("Erro ao salvar conta.", "error");
      }
    });
    if (document.getElementById("accountTypeFilter")) document.getElementById("accountTypeFilter").addEventListener("change", renderAccounts2);
    if (document.getElementById("accountStatusFilter")) document.getElementById("accountStatusFilter").addEventListener("change", renderAccounts2);
    if (document.getElementById("deleteAccountBtn")) document.getElementById("deleteAccountBtn").addEventListener("click", async () => {
      if (!editingAccountId) return;
      const acc = g.accounts.find((a) => a.id === editingAccountId);
      if (!acc) return;
      if (acc.balance !== 0) {
        showToast("N\xE3o \xE9 poss\xEDvel excluir contas com saldo. Zere a conta transferindo os valores antes.", "error");
        return;
      }
      const isConfirmed = await askConfirmation(
        "Excluir Conta",
        `Tem certeza que deseja excluir a conta "${acc.name}" permanentemente?`,
        "Excluir Conta",
        true,
        "delete_forever"
      );
      if (isConfirmed) {
        try {
          await userRef("accounts").doc(editingAccountId).delete();
          g.accounts = g.accounts.filter((a) => a.id !== editingAccountId);
          renderAccounts2();
          window.renderDashboard?.();
          accountModal.style.display = "none";
          showToast("Conta exclu\xEDda com sucesso.", "success");
        } catch (error) {
          console.error("Erro ao excluir conta:", error);
          showToast("Erro de comunica\xE7\xE3o. Tente novamente.", "error");
        }
      }
    });
    if (document.getElementById("ccLimit")) document.getElementById("ccLimit").addEventListener("input", function(e) {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length === 0) {
        e.target.value = "";
        return;
      }
      e.target.value = formatarMoeda(value);
    });
    if (ccBrandSelect) {
      ccBrandSelect.addEventListener("change", (e) => {
        document.getElementById("ccBrandLogoBox").innerHTML = getBrandLogoHtml(e.target.value);
      });
    }
    if (btnShowCardForm) {
      btnShowCardForm.addEventListener("click", () => {
        editingCardIndex = null;
        document.getElementById("cardFormTitle").textContent = "Novo Cart\xE3o";
        document.getElementById("ccName").value = "";
        document.getElementById("ccLast4").value = "";
        document.getElementById("ccBrand").value = "Mastercard";
        document.getElementById("ccBrandLogoBox").innerHTML = getBrandLogoHtml("Mastercard");
        document.getElementById("ccTypeFormat").value = "F\xEDsico";
        document.getElementById("ccLimit").value = "";
        const limitType = document.getElementById("accountLimitType").value;
        document.getElementById("ccLimit").parentElement.style.display = limitType === "shared" ? "none" : "block";
        const ispb = document.getElementById("accountBankValue").value;
        const bankName = document.getElementById("accountBankSearch").value;
        document.getElementById("ccColor").value = getBankColorByIspb(ispb, bankName);
        const isPrepaidEl = document.getElementById("ccIsPrepaid");
        if (isPrepaidEl) {
          isPrepaidEl.checked = false;
          isPrepaidEl.dispatchEvent(new Event("change"));
        }
        const isDefaultEl = document.getElementById("ccIsDefault");
        if (isDefaultEl) {
          isDefaultEl.checked = false;
        }
        document.getElementById("ccClosingDay").value = "";
        document.getElementById("ccDueDay").value = "";
        const saveAccountBtnMaster = document.getElementById("saveAccount");
        if (saveAccountBtnMaster) {
          saveAccountBtnMaster.disabled = true;
          saveAccountBtnMaster.style.opacity = "0.5";
          saveAccountBtnMaster.style.cursor = "not-allowed";
        }
        document.getElementById("cardsListView").style.display = "none";
        document.getElementById("cardFormView").style.display = "block";
      });
    }
    if (btnHideCardForm) {
      btnHideCardForm.addEventListener("click", () => {
        const saveAccountBtnMaster = document.getElementById("saveAccount");
        if (saveAccountBtnMaster) {
          saveAccountBtnMaster.disabled = false;
          saveAccountBtnMaster.style.opacity = "1";
          saveAccountBtnMaster.style.cursor = "pointer";
        }
        document.getElementById("cardFormView").style.display = "none";
        document.getElementById("cardsListView").style.display = "block";
      });
    }
    if (ccIsPrepaidToggle) {
      ccIsPrepaidToggle.addEventListener("change", function() {
        const datesGroup = document.getElementById("ccDatesGroup");
        if (datesGroup) {
          datesGroup.style.display = this.checked ? "none" : "flex";
        }
      });
    }
    if (btnSaveCardToList) {
      btnSaveCardToList.addEventListener("click", async () => {
        const name = document.getElementById("ccName").value.trim();
        const last4 = document.getElementById("ccLast4").value.trim() || "****";
        const brand = document.getElementById("ccBrand").value;
        const typeFormat = document.getElementById("ccTypeFormat").value;
        const limit = valorParaNumero(document.getElementById("ccLimit").value);
        const color = document.getElementById("ccColor").value;
        const isPrepaid = document.getElementById("ccIsPrepaid").checked;
        const isDefault = document.getElementById("ccIsDefault").checked;
        const closingDay = parseInt(document.getElementById("ccClosingDay").value) || 1;
        const dueDay = parseInt(document.getElementById("ccDueDay").value) || 10;
        if (!name) {
          showToast("Informe um apelido para o cart\xE3o", "warning");
          return;
        }
        if (isDefault) {
          let existingDefaultCard = null;
          let existingDefaultAccount = null;
          (g.accounts || []).forEach((acc) => {
            if (acc.id !== editingAccountId && acc.cards) {
              acc.cards.forEach((c) => {
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
              existingDefaultAccount = { name: document.getElementById("accountName").value || "Esta Conta" };
            }
          });
          if (existingDefaultCard) {
            const accLabel = existingDefaultAccount.bankName ? `${existingDefaultAccount.name} (${existingDefaultAccount.bankName})` : existingDefaultAccount.name;
            const mensagemModal = `J\xE1 existe um cart\xE3o definido como Principal: "${existingDefaultCard.name}" (Final ${existingDefaultCard.last4}) na conta "${accLabel}". Deseja mudar o destaque do Dashboard para este novo cart\xE3o?`;
            const confirmarTroca = await askConfirmation("Substituir Cart\xE3o Principal", mensagemModal, "Sim, Mudar Destaque", false, "star");
            if (!confirmarTroca) {
              document.getElementById("ccIsDefault").checked = false;
              return;
            }
            if (existingDefaultAccount.id) {
              existingDefaultAccount.cards.forEach((c) => c.isDefault = false);
              await userRef("accounts").doc(existingDefaultAccount.id).update({
                cards: existingDefaultAccount.cards
              });
              const idxAcc = g.accounts.findIndex((a) => a.id === existingDefaultAccount.id);
              if (idxAcc !== -1) {
                g.accounts[idxAcc].cards = existingDefaultAccount.cards;
              }
            }
            currentAccountCards.forEach((c) => c.isDefault = false);
            window.currentDashboardCardIndex = 0;
          } else {
            currentAccountCards.forEach((c) => c.isDefault = false);
          }
        }
        const cardData = {
          id: editingCardIndex !== null ? currentAccountCards[editingCardIndex].id : "card_" + Date.now(),
          name,
          last4,
          brand,
          typeFormat,
          limit,
          color,
          isPrepaid,
          isDefault,
          closingDay,
          dueDay
        };
        if (editingCardIndex !== null) {
          currentAccountCards[editingCardIndex] = cardData;
        } else {
          currentAccountCards.push(cardData);
        }
        if (isDefault) {
          window.currentDashboardCardIndex = 0;
        }
        if (typeof editingAccountId !== "undefined" && editingAccountId) {
          const idxAcc = g.accounts.findIndex((a) => a.id === editingAccountId);
          if (idxAcc !== -1) {
            g.accounts[idxAcc].cards = currentAccountCards;
            userRef("accounts").doc(editingAccountId).update({
              cards: currentAccountCards
            });
          }
        }
        accountFormHasChanges = true;
        renderAccountCardsList();
        document.getElementById("btnHideCardForm").click();
      });
    }
    if (btnShowPixKeyForm) {
      btnShowPixKeyForm.addEventListener("click", () => {
        editingPixKeyIndex = null;
        document.getElementById("pixKeyFormTitle").textContent = "Nova Chave Pix";
        document.getElementById("newPixKeyType").value = "CPF/CNPJ";
        document.getElementById("newPixKeyValue").value = "";
        document.getElementById("newPixKeyType").dispatchEvent(new Event("change"));
        const saveAccountBtnMaster = document.getElementById("saveAccount");
        if (saveAccountBtnMaster) {
          saveAccountBtnMaster.disabled = true;
          saveAccountBtnMaster.style.opacity = "0.5";
          saveAccountBtnMaster.style.cursor = "not-allowed";
        }
        document.getElementById("pixKeysListView").style.display = "none";
        document.getElementById("pixKeyFormView").style.display = "block";
      });
    }
    if (btnHidePixKeyForm) {
      btnHidePixKeyForm.addEventListener("click", () => {
        const saveAccountBtnMaster = document.getElementById("saveAccount");
        if (saveAccountBtnMaster) {
          saveAccountBtnMaster.disabled = false;
          saveAccountBtnMaster.style.opacity = "1";
          saveAccountBtnMaster.style.cursor = "pointer";
        }
        document.getElementById("pixKeyFormView").style.display = "none";
        document.getElementById("pixKeysListView").style.display = "block";
      });
    }
    if (newPixKeyType) {
      newPixKeyType.addEventListener("change", (e) => {
        const type = e.target.value;
        newPixKeyValue.value = "";
        if (type === "CPF/CNPJ") {
          newPixKeyValue.placeholder = "000.000.000-00 ou 00.000.000/0000-00";
          newPixKeyValue.maxLength = 18;
        } else if (type === "Celular") {
          newPixKeyValue.placeholder = "(00) 00000-0000";
          newPixKeyValue.maxLength = 15;
        } else if (type === "E-mail") {
          newPixKeyValue.placeholder = "email@exemplo.com";
          newPixKeyValue.maxLength = 100;
        } else {
          newPixKeyValue.placeholder = "Ex: 123e4567-e89b-12d3...";
          newPixKeyValue.maxLength = 100;
        }
      });
    }
    if (newPixKeyValue) {
      newPixKeyValue.addEventListener("input", (e) => {
        const type = document.getElementById("newPixKeyType").value;
        let val = e.target.value;
        if (type === "CPF/CNPJ") {
          val = val.replace(/\D/g, "");
          if (val.length <= 11) {
            val = val.replace(/(\d{3})(\d)/, "$1.$2");
            val = val.replace(/(\d{3})(\d)/, "$1.$2");
            val = val.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
          } else {
            val = val.slice(0, 14);
            val = val.replace(/(\d{2})(\d)/, "$1.$2");
            val = val.replace(/(\d{3})(\d)/, "$1.$2");
            val = val.replace(/(\d{3})(\d)/, "$1/$2");
            val = val.replace(/(\d{4})(\d{1,2})$/, "$1-$2");
          }
          e.target.value = val;
        } else if (type === "Celular") {
          val = val.replace(/\D/g, "");
          if (val.length > 11) val = val.slice(0, 11);
          if (val.length > 10) val = val.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
          else if (val.length > 5) val = val.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
          else if (val.length > 2) val = val.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
          e.target.value = val;
        }
      });
    }
    if (btnSavePixKeyToList) {
      btnSavePixKeyToList.addEventListener("click", () => {
        const type = document.getElementById("newPixKeyType").value;
        const value = document.getElementById("newPixKeyValue").value.trim();
        if (!value) {
          showToast("Informe a chave Pix antes de salvar", "warning");
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
        document.getElementById("btnHidePixKeyForm").click();
      });
    }
    if (phoneInput) {
      phoneInput.addEventListener("input", function(e) {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 11) value = value.slice(0, 11);
        if (value.length > 10) value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
        else if (value.length > 5) value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
        else if (value.length > 2) value = value.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
        e.target.value = value;
        updateMiniQrCard();
      });
    }
    if (docInput) docInput.addEventListener("input", updateMiniQrCard);
    if (emailInput) emailInput.addEventListener("input", updateMiniQrCard);
    if (randomInput) randomInput.addEventListener("input", updateMiniQrCard);
    ["partnerDocIsPix", "partnerPhoneIsPix", "partnerEmailIsPix", "partnerRandomPixIsPix"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("change", (e) => {
          if (e.target.checked) {
            ["partnerDocIsPix", "partnerPhoneIsPix", "partnerEmailIsPix", "partnerRandomPixIsPix"].forEach((otherId) => {
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
    document.getElementById("closePixQrModal")?.addEventListener("click", () => {
      document.getElementById("pixQrModal").style.display = "none";
    });
    if (modalPixOverlay) {
      modalPixOverlay.addEventListener("click", function(e) {
        if (e.target === modalPixOverlay) modalPixOverlay.style.display = "none";
      });
    }
    if (openScannerModalBtn) {
      openScannerModalBtn.addEventListener("click", () => {
        scannerModal.style.display = "flex";
        if (!tabScanner.classList.contains("active") || !isBoletoCameraRunning) {
          tabScanner.click();
        }
      });
    }
    if (closeScannerModalBtn) closeScannerModalBtn.addEventListener("click", closeBoletoScanner);
    scannerModal.addEventListener("click", (e) => {
      if (e.target === scannerModal) closeBoletoScanner();
    });
    tabScanner.addEventListener("click", () => {
      tabScanner.classList.add("active");
      tabImagem.classList.remove("active");
      contentScanner.style.display = "block";
      contentImagem.style.display = "none";
      startBoletoCamera();
    });
    tabImagem.addEventListener("click", () => {
      tabImagem.classList.add("active");
      tabScanner.classList.remove("active");
      contentImagem.style.display = "block";
      contentScanner.style.display = "none";
      stopBoletoCamera();
    });
    if (btnUploadBoletoImage) {
      btnUploadBoletoImage.addEventListener("click", () => boletoPhotoInput.click());
    }
    if (boletoPhotoInput) {
      boletoPhotoInput.addEventListener("change", async (e) => {
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
                  const codeFound = result.text.replace(/\D/g, "");
                  if (codeFound.length === 44) {
                    document.getElementById("boletoLine").value = codeFound;
                    scanStatus.style.display = "block";
                    scanStatus.textContent = "C\xF3digo extra\xEDdo da imagem!";
                    scanStatus.style.color = "#188038";
                    window.updateReceiptPreview?.();
                    closeBoletoScanner();
                  } else {
                    throw new Error("C\xF3digo lido n\xE3o \xE9 um boleto v\xE1lido.");
                  }
                }
              } catch (err) {
                showToast("N\xE3o identificamos um boleto v\xE1lido. Tente uma foto mais focada nas barras pretas.", "warning");
              }
            };
          } catch (err) {
            console.error(err);
          }
        };
        reader.readAsDataURL(file);
        e.target.value = "";
      });
    }
    if (boletoCheckbox) {
      boletoCheckbox.addEventListener("change", function() {
        boletoFieldGroup.style.display = this.checked ? "block" : "none";
        window.updateReceiptPreview?.();
      });
    }
    if (boletoLineInput) {
      boletoLineInput.addEventListener("input", function(e) {
        this.value = this.value.replace(/\D/g, "");
        const status = document.getElementById("scanStatus");
        const len = this.value.length;
        if (len === 0) {
          status.style.display = "none";
        } else if (len === 44 || len === 47 || len === 48) {
          status.style.display = "block";
          status.textContent = "C\xF3digo com tamanho v\xE1lido!";
          status.style.color = "#188038";
        } else if (len > 48) {
          status.style.display = "block";
          status.textContent = "C\xF3digo longo demais! Verifique os n\xFAmeros.";
          status.style.color = "#d93025";
        } else {
          status.style.display = "block";
          status.textContent = `C\xF3digo incompleto... (${len} n\xFAmeros digitados)`;
          status.style.color = "#e67e22";
        }
        window.updateReceiptPreview?.();
      });
    }
    const originalUpdateReceiptPreview = window.updateReceiptPreview;
    window.updateReceiptPreview = function() {
      if (typeof originalUpdateReceiptPreview === "function") originalUpdateReceiptPreview();
      const boletoContainer = document.getElementById("receiptBoletoContainer");
      const boletoText = document.getElementById("boletoLineText");
      if (window.selectedType === "expense" && boletoCheckbox.checked && boletoLineInput.value.length >= 44) {
        boletoContainer.style.display = "flex";
        const linhaDigitavel = boletoLineInput.value;
        boletoText.textContent = linhaDigitavel;
        let codigoBarrasReal = "";
        if (linhaDigitavel[0] === "8" && linhaDigitavel.length === 48) {
          codigoBarrasReal = linhaDigitavel.substring(0, 11) + linhaDigitavel.substring(12, 23) + linhaDigitavel.substring(24, 35) + linhaDigitavel.substring(36, 47);
        } else if (linhaDigitavel.length === 47) {
          codigoBarrasReal = linhaDigitavel.substring(0, 4) + linhaDigitavel.substring(32, 33) + linhaDigitavel.substring(33, 47) + linhaDigitavel.substring(4, 9) + linhaDigitavel.substring(10, 20) + linhaDigitavel.substring(21, 31);
        } else {
          codigoBarrasReal = linhaDigitavel;
        }
        if (typeof JsBarcode !== "undefined" && codigoBarrasReal.length === 44) {
          JsBarcode("#boletoBarcode", codigoBarrasReal, {
            format: "ITF",
            lineColor: "#000",
            width: 1,
            height: 60,
            displayValue: false,
            margin: 0
          });
        } else if (typeof JsBarcode !== "undefined") {
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
        boletoContainer.style.display = "none";
      }
    };
    if (copyBoletoBtn) {
      copyBoletoBtn.addEventListener("click", function(e) {
        e.preventDefault();
        const numerosParaCopiar = document.getElementById("boletoLineText").textContent;
        navigator.clipboard.writeText(numerosParaCopiar).then(() => {
          const iconeOriginal = this.innerHTML;
          this.innerHTML = '<span class="material-icons" style="font-size: 1.1rem; color: #188038;">check</span> Copiado!';
          this.style.borderColor = "#188038";
          this.style.color = "#188038";
          showToast("C\xF3digo de barras copiado!", "success");
          setTimeout(() => {
            this.innerHTML = iconeOriginal;
            this.style.borderColor = "";
            this.style.color = "";
          }, 2e3);
        }).catch((err) => {
          showToast("Erro ao copiar o c\xF3digo", "error");
        });
      });
    }
    if (document.getElementById("btnCancelInvoicePayment")) document.getElementById("btnCancelInvoicePayment").addEventListener("click", () => {
      if (document.getElementById("payInvoiceModal")) document.getElementById("payInvoiceModal").style.display = "none";
      invoicePaymentData = null;
    });
    if (document.getElementById("btnConfirmInvoicePayment")) document.getElementById("btnConfirmInvoicePayment").addEventListener("click", async function() {
      if (!invoicePaymentData) return;
      const originalText = this.innerHTML;
      this.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">autorenew</span> Pagando...';
      this.disabled = true;
      const batch = db.batch();
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const now = /* @__PURE__ */ new Date();
      const hoje = getTodayISO();
      invoicePaymentData.txsPagar.forEach((tx) => {
        const ref = userRef("transactions").doc(tx.id);
        batch.update(ref, { isPaid: true, paymentDate: hoje, updatedAt: nowIso });
      });
      const accRef = userRef("accounts").doc(invoicePaymentData.accountId);
      batch.update(accRef, { balance: firebase.firestore.FieldValue.increment(-invoicePaymentData.total) });
      try {
        await batch.commit();
        invoicePaymentData.txsPagar.forEach((tx) => {
          const idx = g.transactions.findIndex((t) => t.id === tx.id);
          if (idx !== -1) {
            g.transactions[idx].isPaid = true;
            g.transactions[idx].paymentDate = hoje;
          }
        });
        const acc = g.accounts.find((a) => a.id === invoicePaymentData.accountId);
        if (acc) acc.balance -= invoicePaymentData.total;
        showToast("Fatura paga com sucesso!", "success");
        renderAccounts2();
        window.renderDashboard?.();
        window.renderTransactions?.();
        window.abrirCarteira(invoicePaymentData.accountId, 0, false);
        document.getElementById("payInvoiceModal").style.display = "none";
      } catch (e) {
        console.error("Erro ao pagar fatura:", e);
        showToast("Erro de conex\xE3o ao pagar fatura.", "error");
      } finally {
        this.innerHTML = "Pagar Fatura";
        this.disabled = false;
        invoicePaymentData = null;
      }
    });
  }
  var accountsView, accountsList, accountModal, accountBankSearch, accountBankValue, accountBankList, accBankLogo, accountNameInput, accountTypeInput, accountBalanceInput, accountBalanceLabel, accountBalanceHelper, accountObservationInput, accountShowDash, accountIncludeKPI, accountHasCreditCard, accountActive, accountActiveLabel, tabCartoesBtn, ccBrandSelect, btnShowCardForm, btnHideCardForm, ccIsPrepaidToggle, btnSaveCardToList, btnShowPixKeyForm, btnHidePixKeyForm, newPixKeyType, newPixKeyValue, btnSavePixKeyToList, phoneInput, docInput, emailInput, randomInput, modalPixOverlay, boletoCheckbox, boletoFieldGroup, boletoLineInput, copyBoletoBtn, openScannerModalBtn, scannerModal, closeScannerModalBtn, tabScanner, tabImagem, contentScanner, contentImagem, btnUploadBoletoImage, boletoPhotoInput, scanStatus, editingAccountId, editingCardIndex, editingPixKeyIndex, currentAccountCards, currentAccountPixKeys, allBanks, currentWalletAccId, invoiceMonthOffset, currentWalletCardIndex, invoicePaymentData, accountFormHasChanges, codeReaderBoleto, isBoletoCameraRunning;
  var init_accounts = __esm({
    "js/accounts.js"() {
      init_firebase_config();
      init_state();
      init_utils();
      init_factories();
      init_ui_helpers();
      init_theme();
      init_settings();
      accountsView = document.getElementById("accountsView");
      accountsList = document.getElementById("accountsList");
      accountModal = document.getElementById("accountModal");
      accountBankSearch = document.getElementById("accountBankSearch");
      accountBankValue = document.getElementById("accountBankValue");
      accountBankList = document.getElementById("accountBankList");
      accBankLogo = document.getElementById("accBankLogo");
      accountNameInput = document.getElementById("accountName");
      accountTypeInput = document.getElementById("accountType");
      accountBalanceInput = document.getElementById("accountBalance");
      accountBalanceLabel = document.getElementById("accountBalanceLabel");
      accountBalanceHelper = document.getElementById("accountBalanceHelper");
      accountObservationInput = document.getElementById("accountObservation");
      accountShowDash = document.getElementById("accountShowDash");
      accountIncludeKPI = document.getElementById("accountIncludeKPI");
      accountHasCreditCard = document.getElementById("accountHasCreditCard");
      accountActive = document.getElementById("accountActive");
      accountActiveLabel = document.getElementById("accountActiveLabel");
      tabCartoesBtn = document.getElementById("tabCartoesBtn");
      ccBrandSelect = document.getElementById("ccBrand");
      btnShowCardForm = document.getElementById("btnShowCardForm");
      btnHideCardForm = document.getElementById("btnHideCardForm");
      ccIsPrepaidToggle = document.getElementById("ccIsPrepaid");
      btnSaveCardToList = document.getElementById("btnSaveCardToList");
      btnShowPixKeyForm = document.getElementById("btnShowPixKeyForm");
      btnHidePixKeyForm = document.getElementById("btnHidePixKeyForm");
      newPixKeyType = document.getElementById("newPixKeyType");
      newPixKeyValue = document.getElementById("newPixKeyValue");
      btnSavePixKeyToList = document.getElementById("btnSavePixKeyToList");
      phoneInput = document.getElementById("partnerPhone");
      docInput = document.getElementById("partnerDoc");
      emailInput = document.getElementById("partnerEmail");
      randomInput = document.getElementById("partnerRandomPix");
      modalPixOverlay = document.getElementById("pixQrModal");
      boletoCheckbox = document.getElementById("boletoCheckbox");
      boletoFieldGroup = document.getElementById("boletoFieldGroup");
      boletoLineInput = document.getElementById("boletoLine");
      copyBoletoBtn = document.getElementById("copyBoletoBtn");
      openScannerModalBtn = document.getElementById("openScannerModalBtn");
      scannerModal = document.getElementById("scannerModal");
      closeScannerModalBtn = document.getElementById("closeScannerModalBtn");
      tabScanner = document.getElementById("tabScanner");
      tabImagem = document.getElementById("tabImagem");
      contentScanner = document.getElementById("contentScanner");
      contentImagem = document.getElementById("contentImagem");
      btnUploadBoletoImage = document.getElementById("btnUploadBoletoImage");
      boletoPhotoInput = document.getElementById("boletoPhotoInput");
      scanStatus = document.getElementById("scanStatus");
      editingAccountId = null;
      editingCardIndex = null;
      editingPixKeyIndex = null;
      currentAccountCards = [];
      currentAccountPixKeys = [];
      allBanks = [];
      currentWalletAccId = null;
      invoiceMonthOffset = 0;
      currentWalletCardIndex = 0;
      invoicePaymentData = null;
      accountFormHasChanges = false;
      codeReaderBoleto = null;
      isBoletoCameraRunning = false;
      window.removeCardFromList = function(index) {
        currentAccountCards.splice(index, 1);
        accountFormHasChanges = true;
        renderAccountCardsList();
      };
      window.editCardInList = function(index) {
        editingCardIndex = index;
        const card = currentAccountCards[index];
        document.getElementById("cardFormTitle").textContent = "Editar Cart\xE3o";
        document.getElementById("ccName").value = card.name;
        document.getElementById("ccLast4").value = card.last4 || "";
        document.getElementById("ccBrand").value = card.brand || "Outra";
        document.getElementById("ccBrandLogoBox").innerHTML = getBrandLogoHtml(card.brand || "Outra");
        document.getElementById("ccTypeFormat").value = card.typeFormat || "F\xEDsico";
        document.getElementById("ccLimit").value = card.limit > 0 ? formatCurrency(card.limit) : "";
        const limitType = document.getElementById("accountLimitType").value;
        document.getElementById("ccLimit").parentElement.style.display = limitType === "shared" ? "none" : "block";
        const ispb = document.getElementById("accountBankValue").value;
        const bankName = document.getElementById("accountBankSearch").value;
        document.getElementById("ccColor").value = card.color || getBankColorByIspb(ispb, bankName);
        const isPrepaidEl = document.getElementById("ccIsPrepaid");
        if (isPrepaidEl) {
          isPrepaidEl.checked = card.isPrepaid || false;
          isPrepaidEl.dispatchEvent(new Event("change"));
        }
        const isDefaultEl = document.getElementById("ccIsDefault");
        if (isDefaultEl) {
          isDefaultEl.checked = card.isDefault || false;
        }
        document.getElementById("ccClosingDay").value = card.closingDay || "";
        document.getElementById("ccDueDay").value = card.dueDay || "";
        const saveAccountBtnMaster = document.getElementById("saveAccount");
        if (saveAccountBtnMaster) {
          saveAccountBtnMaster.disabled = true;
          saveAccountBtnMaster.style.opacity = "0.5";
          saveAccountBtnMaster.style.cursor = "not-allowed";
        }
        document.getElementById("cardsListView").style.display = "none";
        document.getElementById("cardFormView").style.display = "block";
      };
      window.removePixKeyFromList = function(index) {
        currentAccountPixKeys.splice(index, 1);
        accountFormHasChanges = true;
        renderAccountPixKeysList();
      };
      window.editPixKeyInList = function(index) {
        editingPixKeyIndex = index;
        const pk = currentAccountPixKeys[index];
        document.getElementById("pixKeyFormTitle").textContent = "Editar Chave Pix";
        const typeSelect = document.getElementById("newPixKeyType");
        typeSelect.value = pk.type === "Desconhecido" ? "Aleat\xF3ria" : pk.type;
        const inputVal = document.getElementById("newPixKeyValue");
        typeSelect.dispatchEvent(new Event("change"));
        inputVal.value = pk.value;
        const saveAccountBtnMaster = document.getElementById("saveAccount");
        if (saveAccountBtnMaster) {
          saveAccountBtnMaster.disabled = true;
          saveAccountBtnMaster.style.opacity = "0.5";
          saveAccountBtnMaster.style.cursor = "not-allowed";
        }
        document.getElementById("pixKeysListView").style.display = "none";
        document.getElementById("pixKeyFormView").style.display = "block";
      };
      window.mudarCartaoCarteira = function(direction) {
        const acc = g.accounts.find((a) => a.id === currentWalletAccId);
        if (!acc || !acc.cards) return;
        currentWalletCardIndex += direction;
        if (currentWalletCardIndex >= acc.cards.length) currentWalletCardIndex = 0;
        if (currentWalletCardIndex < 0) currentWalletCardIndex = acc.cards.length - 1;
        window.abrirCarteira(currentWalletAccId, 0, false);
      };
      window.abrirCarteira = function(accountId, offset = 0, resetCard = true) {
        currentWalletAccId = accountId;
        invoiceMonthOffset += offset;
        if (offset === 0 && resetCard) {
          invoiceMonthOffset = 0;
          currentWalletCardIndex = 0;
        }
        document.getElementById("accountDetailsModal").style.display = "flex";
        document.getElementById("accountDetailsModal").classList.add("expanded");
        document.getElementById("bbTabCartao").classList.add("active");
        document.getElementById("bbTabConta").classList.remove("active");
        document.getElementById("accWalletContent").style.display = "block";
        document.getElementById("accDetailsContent").style.display = "none";
        const acc = g.accounts.find((a) => a.id === accountId);
        if (acc) {
          document.getElementById("detAccountName").textContent = acc.name;
          document.getElementById("detBankLogo").innerHTML = getBankLogoHtml(acc.bankName, acc.bankIspb);
          const balFormat = formatCurrency(acc.balance || 0);
          const isNegative = acc.balance < 0;
          const balElement = document.getElementById("detAccountBalance");
          balElement.textContent = balFormat;
          balElement.style.color = isNegative ? "#d93025" : "";
          document.getElementById("detBalanceDay").textContent = balFormat;
          document.getElementById("detBalanceDay").style.color = isNegative ? "#d93025" : "";
          document.getElementById("detBalanceAvailable").textContent = balFormat;
          document.getElementById("detBalanceAvailable").style.color = isNegative ? "#d93025" : "";
          document.getElementById("detAccountType").textContent = acc.type;
          const btnConfig = document.getElementById("btnOpenConfig");
          btnConfig.onclick = () => {
            document.getElementById("accountDetailsModal").style.display = "none";
            openAccountModal2(accountId);
          };
        }
        if (!acc || !acc.hasCreditCard || !acc.cards || acc.cards.length === 0) {
          document.getElementById("accWalletContent").innerHTML = '<div style="text-align: center; padding: 3rem 1rem; color: #9aa0a6;">Nenhum cart\xE3o cadastrado.</div>';
          return;
        }
        if (currentWalletCardIndex >= acc.cards.length) currentWalletCardIndex = 0;
        const activeCard = acc.cards[currentWalletCardIndex];
        let arrowsHtml = "";
        let dotsHtml = '<div style="height: 24px;"></div>';
        if (acc.cards.length > 1) {
          arrowsHtml = `
            <button onclick="mudarCartaoCarteira(-1)" style="position:absolute; left:2px; top:50%; transform:translateY(-50%); z-index:10; background:rgba(0,0,0,0.6); border:none; color:white; border-radius:50%; width:32px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); backdrop-filter: blur(4px);"><span class="material-icons" style="font-size: 1.2rem;">chevron_left</span></button>
            <button onclick="mudarCartaoCarteira(1)" style="position:absolute; right:2px; top:50%; transform:translateY(-50%); z-index:10; background:rgba(0,0,0,0.6); border:none; color:white; border-radius:50%; width:32px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); backdrop-filter: blur(4px);"><span class="material-icons" style="font-size: 1.2rem;">chevron_right</span></button>
        `;
          dotsHtml = `
            <div style="display: flex; justify-content: center; gap: 6px; margin-top: 12px; margin-bottom: 24px;">
                ${acc.cards.map((_, i) => `<div style="width: 6px; height: 6px; border-radius: 50%; background: ${i === currentWalletCardIndex ? "#1a73e8" : document.body.classList.contains("dark-mode") ? "var(--cor-borda-dark)" : "#dadce0"}; transition: background 0.3s;"></div>`).join("")}
            </div>
        `;
        }
        const today = /* @__PURE__ */ new Date();
        let baseM = today.getMonth();
        let baseY = today.getFullYear();
        if (!activeCard.isPrepaid) {
          const currentDay = today.getDate();
          const closingDay = parseInt(activeCard.closingDay) || 1;
          const dueDay2 = parseInt(activeCard.dueDay) || 10;
          let faturaAtualM = baseM;
          let faturaAtualY = baseY;
          if (dueDay2 < closingDay) {
            faturaAtualM++;
            if (faturaAtualM > 11) {
              faturaAtualM = 0;
              faturaAtualY++;
            }
          }
          const faturaAtualStr = `${faturaAtualY}-${String(faturaAtualM + 1).padStart(2, "0")}`;
          const faturaAtualTemPendente = g.transactions.some(
            (t) => t.accountId === accountId && t.type === "expense" && (t.cardId === activeCard.id || acc.limitType === "shared" && t.cardId) && t.date.startsWith(faturaAtualStr) && !t.isPaid
          );
          const vencimentoJaPassou = currentDay > dueDay2;
          if (vencimentoJaPassou && !faturaAtualTemPendente) {
            baseM++;
            if (baseM > 11) {
              baseM = 0;
              baseY++;
            }
            if (dueDay2 < closingDay) {
              baseM++;
              if (baseM > 11) {
                baseM = 0;
                baseY++;
              }
            }
          } else if (!vencimentoJaPassou && currentDay >= closingDay) {
            if (dueDay2 < closingDay) {
              baseM++;
              if (baseM > 11) {
                baseM = 0;
                baseY++;
              }
            }
          }
        }
        baseM += invoiceMonthOffset;
        while (baseM > 11) {
          baseM -= 12;
          baseY++;
        }
        while (baseM < 0) {
          baseM += 12;
          baseY--;
        }
        const targetMonthStr = `${baseY}-${String(baseM + 1).padStart(2, "0")}`;
        const targetMonth = baseM;
        const targetYear = baseY;
        const isShared = acc.limitType === "shared";
        const txs = g.transactions.filter((t) => {
          if (t.accountId !== accountId || t.type !== "expense" || !t.date.startsWith(targetMonthStr)) return false;
          if (isShared && t.cardId) return true;
          return t.cardId === activeCard.id;
        });
        const faturaTotal = txs.reduce((sum, t) => sum + t.value, 0);
        const pendentesNestaFatura = txs.filter((t) => !t.isPaid);
        const faturaPendenteTotal = pendentesNestaFatura.reduce((sum, t) => sum + t.value, 0);
        const allUnpaidTxs = g.transactions.filter((t) => {
          if (t.accountId !== accountId || t.type !== "expense" || t.isPaid) return false;
          if (isShared && t.cardId) return true;
          return t.cardId === activeCard.id;
        });
        const limitUsedTotal = allUnpaidTxs.reduce((sum, t) => sum + t.value, 0);
        const limit = isShared ? acc.globalLimit || 0 : activeCard.limit || 0;
        const available = activeCard.isPrepaid ? acc.balance || 0 : Math.max(limit - limitUsedTotal, 0);
        const usedPct = activeCard.isPrepaid ? 0 : limit > 0 ? Math.round(limitUsedTotal / limit * 100) : 0;
        const isDark = document.body.classList.contains("dark-mode");
        const limitBg = isDark ? "var(--cor-superficie-dark)" : "#ffffff";
        const faturaBg = isDark ? "var(--cor-superficie-dark)" : "#ffffff";
        const textColor = isDark ? "#e3e3e3" : "#202124";
        const subTextColor = isDark ? "#9aa0a6" : "#5f6368";
        const borderColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
        const arrowBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
        const arrowColor = isDark ? "#e0e0e0" : "#202124";
        const monthNames = ["Janeiro", "Fevereiro", "Mar\xE7o", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const dueDay = parseInt(activeCard.dueDay) || 10;
        const dueDateStr = `${String(dueDay).padStart(2, "0")}/${String(targetMonth + 1).padStart(2, "0")}`;
        let statusText = "", statusColor = "";
        if (activeCard.isPrepaid) {
          if (invoiceMonthOffset < 0) {
            statusText = `HIST\xD3RICO FECHADO`;
            statusColor = subTextColor;
          } else if (invoiceMonthOffset === 0) {
            statusText = `COMPRAS DO M\xCAS`;
            statusColor = isDark ? "#8ab4f8" : "#1a73e8";
          } else {
            statusText = `M\xCAS FUTURO`;
            statusColor = subTextColor;
          }
        } else {
          const _closingDay = parseInt(activeCard.closingDay) || 1;
          const _dueDay = parseInt(activeCard.dueDay) || 10;
          const _today = /* @__PURE__ */ new Date();
          const _currentDay = _today.getDate();
          const _currentM = _today.getMonth();
          const _currentY = _today.getFullYear();
          const isFaturaDoMesAtual = targetMonth === _currentM && targetYear === _currentY;
          if (faturaTotal > 0 && faturaPendenteTotal === 0) {
            statusText = `PAGA`;
            statusColor = isDark ? "#81c995" : "#188038";
          } else if (targetYear < _currentY || targetYear === _currentY && targetMonth < _currentM) {
            statusText = `FECHADA \u2022 VENCEU ${dueDateStr}`;
            statusColor = isDark ? "#ff8a80" : "#d93025";
          } else if (isFaturaDoMesAtual) {
            if (_currentDay < _closingDay) {
              statusText = `ABERTA \u2022 VENCE ${dueDateStr}`;
              statusColor = "#e67e22";
            } else if (_currentDay >= _closingDay && _currentDay <= _dueDay) {
              statusText = `FECHADA \u2022 VENCE ${dueDateStr}`;
              statusColor = isDark ? "#ff8a80" : "#d93025";
            } else {
              statusText = `VENCIDA \u2022 VENCEU ${dueDateStr}`;
              statusColor = isDark ? "#ff8a80" : "#d93025";
            }
          } else {
            statusText = `FUTURA \u2022 VENCE ${dueDateStr}`;
            statusColor = subTextColor;
          }
        }
        arrowsHtml = "";
        dotsHtml = '<div style="height: 24px;"></div>';
        if (acc.cards.length > 1) {
          arrowsHtml = `
            <button onclick="mudarCartaoCarteira(-1)" style="position:absolute; left:2px; top:50%; transform:translateY(-50%); z-index:10; background:${arrowBg}; border:none; color:${arrowColor}; border-radius:50%; width:36px; height:36px; cursor:pointer; display:flex; align-items:center; justify-content:center; backdrop-filter: blur(4px); transition: background 0.2s;"><span class="material-icons" style="font-size: 1.2rem;">chevron_left</span></button>
            <button onclick="mudarCartaoCarteira(1)" style="position:absolute; right:2px; top:50%; transform:translateY(-50%); z-index:10; background:${arrowBg}; border:none; color:${arrowColor}; border-radius:50%; width:36px; height:36px; cursor:pointer; display:flex; align-items:center; justify-content:center; backdrop-filter: blur(4px); transition: background 0.2s;"><span class="material-icons" style="font-size: 1.2rem;">chevron_right</span></button>
        `;
          dotsHtml = `
            <div style="display: flex; justify-content: center; gap: 6px; margin-top: 12px; margin-bottom: 24px;">
                ${acc.cards.map((_, i) => `<div style="width: 6px; height: 6px; border-radius: 50%; background: ${i === currentWalletCardIndex ? activeCard.color || "#1a73e8" : isDark ? "var(--cor-borda-dark)" : "#dadce0"}; transition: background 0.3s;"></div>`).join("")}
            </div>
        `;
        }
        let txHtml = "";
        if (txs.length === 0) {
          txHtml = `
        <div style="text-align: center; padding: 3rem 1rem; display: flex; flex-direction: column; align-items: center;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: ${isDark ? "rgba(255,255,255,0.05)" : "#f1f3f4"}; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
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
          }).forEach((t) => {
            const isSettled = activeCard.isPrepaid || t.isPaid;
            const itemStyle = !activeCard.isPrepaid && t.isPaid ? "opacity: 0.55;" : "";
            const paidCheckIcon = isSettled ? `<span class="material-icons" style="color: ${isDark ? "#81c995" : "#188038"}; font-size: 1.1rem; vertical-align: middle; margin-left: 4px;">check_circle</span>` : "";
            const clockIconHtml = isSettled ? "" : `<span class="material-icons" style="font-size: 11px; opacity: 0.8;">schedule</span>`;
            const valueColor = isSettled ? isDark ? "#81c995" : "#188038" : textColor;
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
        const displayInvoiceTotal = activeCard.isPrepaid ? faturaTotal : faturaPendenteTotal > 0 ? faturaPendenteTotal : faturaTotal;
        const totalDisplayColor = !activeCard.isPrepaid && faturaPendenteTotal === 0 && faturaTotal > 0 ? isDark ? "#81c995" : "#188038" : textColor;
        const propsCarteira = {
          arrowsHtml,
          dotsHtml,
          cardColor: activeCard.color || "#ff7a00",
          cardLast4: activeCard.last4 || "0000",
          cardName: activeCard.name,
          brandLogo: getBrandLogoHtml(activeCard.brand),
          accountId,
          cardId: activeCard.id,
          arrowBg,
          arrowColor,
          navTitle: activeCard.isPrepaid ? "EXTRATO" : "FATURA",
          navMonth: `${monthNames[targetMonth]} ${targetYear}`,
          subTextColor,
          textColor,
          isPrepaid: activeCard.isPrepaid,
          faturaBg,
          isDark,
          statusColor,
          statusText,
          totalDisplayColor,
          displayInvoiceTotal: formatCurrency(displayInvoiceTotal),
          borderColor,
          faturaPendenteTotal,
          faturaTotal,
          targetMonthStr,
          limitBg,
          usedPct,
          available: formatCurrency(available),
          limitUsedTotal: formatCurrency(limitUsedTotal),
          limit: formatCurrency(limit),
          txsCount: txs.length,
          txHtml
        };
        document.getElementById("accWalletContent").innerHTML = criarHtmlLayoutCarteira(propsCarteira);
        if (window.walletChartInstance) {
          window.walletChartInstance.destroy();
          window.walletChartInstance = null;
        }
      };
      window.prepararPagamentoFatura = function(accountId, cardId, targetMonthStr) {
        const acc = g.accounts.find((a) => a.id === accountId);
        const isShared = acc && acc.limitType === "shared";
        const txsPagar = g.transactions.filter((t) => {
          if (t.accountId !== accountId || t.type !== "expense" || !t.date.startsWith(targetMonthStr) || t.isPaid) return false;
          if (isShared && t.cardId) return true;
          return t.cardId === cardId;
        });
        const total = txsPagar.reduce((sum, t) => sum + t.value, 0);
        if (total <= 0) return;
        invoicePaymentData = { accountId, cardId, txsPagar, total };
        document.getElementById("payInvoiceTotalDisplay").textContent = formatCurrency(total);
        document.getElementById("payInvoiceModal").style.display = "flex";
      };
    }
  });

  // js/dashboard.js
  function buildCardCarousel() {
    const cards = [];
    (g.accounts || []).filter((a) => a.active !== false && a.cards && a.cards.length > 0).forEach((acc) => {
      acc.cards.forEach((c) => {
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
    const isDarkMode = document.body.classList.contains("dark-mode");
    let cardArrowsHtml = "", cardDotsHtml = "";
    if (cards.length > 1) {
      const arrowBg = isDarkMode ? "rgba(42,42,58,0.95)" : "rgba(255,255,255,0.95)";
      const arrowBorder = isDarkMode ? "var(--cor-borda-dark)" : "#e8eaed";
      const arrowColor = isDarkMode ? "#e0e0e0" : "#5f6368";
      cardArrowsHtml = `
            <button onclick="mudarCartaoDashboard(-1, event)" style="position:absolute; left:-18px; top:50%; transform:translateY(-50%); z-index:10; background:${arrowBg}; border:1px solid ${arrowBorder}; color:${arrowColor}; border-radius:50%; width:36px; height:36px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.2s;"><span class="material-icons" style="font-size: 1.4rem;">chevron_left</span></button>
            <button onclick="mudarCartaoDashboard(1, event)" style="position:absolute; right:-18px; top:50%; transform:translateY(-50%); z-index:10; background:${arrowBg}; border:1px solid ${arrowBorder}; color:${arrowColor}; border-radius:50%; width:36px; height:36px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.2s;"><span class="material-icons" style="font-size: 1.4rem;">chevron_right</span></button>
        `;
      const dotInactive = isDarkMode ? "var(--cor-borda-dark)" : "#dadce0";
      cardDotsHtml = `
            <div style="display:flex; justify-content:center; gap:6px; margin-top: 16px;">
                ${cards.map((_, i) => `<div style="width:6px; height:6px; border-radius:50%; background: ${i === window.currentDashboardCardIndex ? "#1a73e8" : dotInactive}; transition: background 0.3s;"></div>`).join("")}
            </div>
        `;
    }
    window.allDashboardCards = cards;
    return { displayCard, nextCard, cardArrowsHtml, cardDotsHtml, isDarkMode };
  }
  function renderCashFlowChart(isDark) {
    const monthNamesShort = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    let labels = [];
    let incomeData = [];
    let expenseData = [];
    let currentMonthIncome = 0;
    let currentMonthExpense = 0;
    const now = /* @__PURE__ */ new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      labels.push(monthNamesShort[d.getMonth()]);
      const txs = (g.transactions || []).filter((t) => t.date.startsWith(monthStr) && t.isPaid && t.type !== "transfer");
      const inc = txs.filter((t) => t.type === "income").reduce((acc, t) => acc + t.value, 0);
      const exp = txs.filter((t) => t.type === "expense").reduce((acc, t) => acc + t.value, 0);
      incomeData.push(inc);
      expenseData.push(exp);
      if (i === 0) {
        currentMonthIncome = inc;
        currentMonthExpense = exp;
      }
    }
    document.getElementById("chartTotalIncome").textContent = "+ " + formatCurrency(currentMonthIncome);
    document.getElementById("chartTotalExpense").textContent = "- " + formatCurrency(currentMonthExpense);
    const ctxBar = document.getElementById("monthlyEarningsChart").getContext("2d");
    if (monthlyEarningsChart) monthlyEarningsChart.destroy();
    const incColor = isDark ? "#34d399" : "#10b981";
    const expColor = isDark ? "#fb7185" : "#f43f5e";
    const incColorT = isDark ? "rgba(52,211,153,0.15)" : "rgba(16,185,129,0.15)";
    const expColorT = isDark ? "rgba(251,113,133,0.15)" : "rgba(244,63,94,0.15)";
    monthlyEarningsChart = new Chart(ctxBar, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Entradas",
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
            label: "Sa\xEDdas",
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
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? "var(--cor-superficie-dark)" : "#0f172a",
            titleColor: "#f1f5f9",
            bodyColor: "#f1f5f9",
            padding: 12,
            cornerRadius: 12,
            callbacks: {
              label: function(context) {
                const prefix = context.dataset.label === "Entradas" ? "+ R$ " : "- R$ ";
                return " " + context.dataset.label + ": " + prefix + context.raw.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false, drawBorder: false },
            ticks: {
              color: isDark ? "#64748b" : "#94a3b8",
              font: { weight: "600", family: "'Inter', 'Google Sans', sans-serif" }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9",
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
    const paidMonthExpensesForCat = monthExpenses.filter((t) => t.isPaid);
    let donutLabels = [];
    let donutData = [];
    let donutColors = [];
    let isEmpty = false;
    if (window.currentDonutViewIndex === 0) {
      const categoryTotals = {};
      paidMonthExpensesForCat.forEach((t) => {
        const catId = t.category || "outros";
        categoryTotals[catId] = (categoryTotals[catId] || 0) + t.value;
      });
      const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
      if (sortedCategories.length === 0) {
        isEmpty = true;
      } else {
        sortedCategories.forEach(([catId, value]) => {
          const cat = g.categories.find((c) => c.id === catId);
          donutLabels.push(cat ? cat.name : "Outros");
          donutData.push(value);
          donutColors.push(cat ? cat.color || "#9aa0a6" : "#9aa0a6");
        });
      }
    } else {
      const costCenterTotals = {};
      paidMonthExpensesForCat.forEach((t) => {
        const cat = g.categories.find((c) => c.id === t.category);
        const ccId = cat && cat.costCenter ? cat.costCenter : "sem_centro";
        costCenterTotals[ccId] = (costCenterTotals[ccId] || 0) + t.value;
      });
      const sortedCCs = Object.entries(costCenterTotals).sort((a, b) => b[1] - a[1]);
      if (sortedCCs.length === 0) {
        isEmpty = true;
      } else {
        sortedCCs.forEach(([ccId, value]) => {
          const cc = g.costCenters.find((c) => c.id === ccId);
          donutLabels.push(cc ? cc.description : "Sem Centro");
          donutData.push(value);
          donutColors.push(cc ? cc.color || "#1a73e8" : "#9aa0a6");
        });
      }
    }
    if (isEmpty) {
      donutLabels.push("Sem despesas");
      donutData.push(1);
      donutColors.push(isDark ? "var(--cor-borda-dark)" : "#e8eaed");
    }
    const ctxDonut = document.getElementById("dynamicDonutChart").getContext("2d");
    if (window.dynamicDonutChartInstance) window.dynamicDonutChartInstance.destroy();
    window.dynamicDonutChartInstance = new Chart(ctxDonut, {
      type: "doughnut",
      data: {
        labels: donutLabels,
        datasets: [{
          data: donutData,
          backgroundColor: donutColors,
          borderWidth: isEmpty ? 0 : 3,
          borderColor: isDark ? "var(--cor-superficie-dark)" : "#ffffff",
          hoverOffset: 6
        }]
      },
      options: {
        cutout: "78%",
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { left: 20, right: 20, top: 10, bottom: 10 } },
        plugins: {
          legend: {
            display: !isEmpty,
            position: "right",
            labels: {
              color: isDark ? "#94a3b8" : "#64748b",
              usePointStyle: true,
              padding: 16,
              font: {
                size: 11,
                weight: "500",
                family: "'Inter', 'Google Sans', sans-serif"
              }
            }
          },
          tooltip: {
            backgroundColor: isDark ? "var(--cor-superficie-dark)" : "#0f172a",
            titleColor: "#f1f5f9",
            bodyColor: "#f1f5f9",
            padding: 12,
            cornerRadius: 12,
            callbacks: {
              label: function(context) {
                if (isEmpty) return " Sem despesas no m\xEAs";
                return " R$ " + context.raw.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
              }
            }
          }
        }
      }
    });
  }
  function renderDashboard() {
    const container = document.getElementById("kpiContainer");
    const { displayCard, nextCard, cardArrowsHtml, cardDotsHtml, isDarkMode } = buildCardCarousel();
    let formatBankName = displayCard ? displayCard.bankLabel || "Cart\xE3o" : "Sem Cart\xE3o";
    if (formatBankName.length > 18) formatBankName = formatBankName.substring(0, 18) + "...";
    const nowDash = /* @__PURE__ */ new Date();
    const currentMonthStr = `${nowDash.getFullYear()}-${String(nowDash.getMonth() + 1).padStart(2, "0")}`;
    const monthExpenses = (g.transactions || []).filter((t) => t.type === "expense" && t.date.startsWith(currentMonthStr));
    const totalExpensesCount = monthExpenses.length;
    const paidExpensesCount = monthExpenses.filter((t) => t.isPaid).length;
    const unpaidExpensesCount = totalExpensesCount - paidExpensesCount;
    const totalExpensesValue = monthExpenses.reduce((a, t) => a + t.value, 0);
    const paidExpensesValue = monthExpenses.filter((t) => t.isPaid).reduce((a, t) => a + t.value, 0);
    const unpaidExpensesValue = totalExpensesValue - paidExpensesValue;
    const expensesProgressPct = totalExpensesValue > 0 ? Math.round(paidExpensesValue / totalExpensesValue * 100) : 0;
    const monthIncomes = (g.transactions || []).filter((t) => t.type === "income" && t.date.startsWith(currentMonthStr));
    const totalIncomesCount = monthIncomes.length;
    const paidIncomesCount = monthIncomes.filter((t) => t.isPaid).length;
    const unpaidIncomesCount = totalIncomesCount - paidIncomesCount;
    const totalIncomesValue = monthIncomes.reduce((a, t) => a + t.value, 0);
    const paidIncomesValue = monthIncomes.filter((t) => t.isPaid).reduce((a, t) => a + t.value, 0);
    const unpaidIncomesValue = totalIncomesValue - paidIncomesValue;
    const incomesProgressPct = totalIncomesValue > 0 ? Math.round(paidIncomesValue / totalIncomesValue * 100) : 0;
    const dashMonthIncome = monthIncomes.filter((t) => t.isPaid).reduce((acc, t) => acc + t.value, 0);
    const dashMonthExpense = monthExpenses.filter((t) => t.isPaid).reduce((acc, t) => acc + t.value, 0);
    const dashTotalBalance = (g.accounts || []).filter((a) => a.includeInKPI !== false && a.active !== false).reduce((acc, a) => acc + (a.balance || 0), 0);
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const recentTransactions = [...g.transactions || []].filter((t) => t.date <= todayStr).sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)).slice(0, 3);
    let recentTxsHtml = "";
    if (recentTransactions.length === 0) {
      recentTxsHtml = '<div style="padding: 1.5rem 0; color: #64748b; text-align: center; font-size: 0.9rem;">Nenhum lan\xE7amento recente</div>';
    } else {
      recentTransactions.forEach((t) => {
        let icon = "swap_horiz";
        let sign = "";
        let valClass = "expense";
        if (t.type === "income") {
          icon = "attach_money";
          sign = "+ ";
          valClass = "income";
        } else if (t.type === "expense") {
          icon = "shopping_bag";
          sign = "- ";
          valClass = "expense";
        }
        const title = t.description ? t.description : "(Sem descri\xE7\xE3o)";
        const iconClass = t.type === "income" ? "income-icon" : t.type === "expense" ? "expense-icon" : "transfer-icon";
        recentTxsHtml += criarHtmlItemDashboard(t.id, title, formatDate(t.date), icon, iconClass, valClass, sign, formatCurrency(t.value), "Editar");
      });
    }
    const unpaidTransactions = (g.transactions || []).filter((t) => !t.isPaid && t.type === "expense" && t.date.startsWith(currentMonthStr)).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 3);
    let unpaidTxsHtml = "";
    if (unpaidTransactions.length === 0) {
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
      unpaidTransactions.forEach((t) => {
        const title = t.description ? t.description : "(Sem descri\xE7\xE3o)";
        unpaidTxsHtml += criarHtmlItemDashboard(t.id, title, formatDate(t.date), "bolt", "expense-icon", "expense", "- ", formatCurrency(t.value), "Pagar");
      });
    }
    const isDark = isDarkMode;
    const dashAccounts = g.accounts.filter((a) => a.showOnDashboard !== false && a.active !== false).sort((a, b) => b.balance - a.balance);
    let accountsListHtml = "";
    if (dashAccounts.length === 0) {
      accountsListHtml = '<div style="padding: 1.5rem 0; color: #64748b; text-align: center; font-size: 0.9rem;">Nenhuma conta no dashboard</div>';
    } else {
      dashAccounts.forEach((acc) => {
        const balColor = acc.balance < 0 ? isDark ? "#ff8a80" : "#d93025" : isDark ? "#8ab4f8" : "#1e3c72";
        const logoBg = isDark ? acc.bankIspb === "Outros" ? "var(--cor-superficie-dark)" : "transparent" : acc.bankIspb === "Outros" ? "white" : "transparent";
        const logoBorder = isDark ? "var(--cor-borda-dark)" : "#e8eaed";
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
    const prevMonthDate = new Date(nowDash.getFullYear(), nowDash.getMonth() - 1, 1);
    const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;
    const prevIncome = (g.transactions || []).filter((t) => t.type === "income" && t.isPaid && t.date.startsWith(prevMonthStr)).reduce((a, t) => a + t.value, 0);
    const prevExpense = (g.transactions || []).filter((t) => t.type === "expense" && t.isPaid && t.date.startsWith(prevMonthStr)).reduce((a, t) => a + t.value, 0);
    const monthResult = dashMonthIncome - dashMonthExpense;
    const pastBalance = dashTotalBalance - monthResult;
    const econPct = dashMonthIncome > 0 ? Math.round((dashMonthIncome - dashMonthExpense) / dashMonthIncome * 100) : 0;
    let historyBalances = [];
    const nomeMeses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(nowDash.getFullYear(), nowDash.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const txsMes = (g.transactions || []).filter((t) => t.date.startsWith(mStr) && t.isPaid && t.type !== "transfer");
      const incMes = txsMes.filter((t) => t.type === "income").reduce((a, t) => a + t.value, 0);
      const expMes = txsMes.filter((t) => t.type === "expense").reduce((a, t) => a + t.value, 0);
      const resultadoMes = incMes - expMes;
      historyBalances.unshift({ val: resultadoMes, label: nomeMeses[d.getMonth()] });
    }
    const maxBal = Math.max(...historyBalances.map((b) => Math.abs(b.val)), 1);
    let dynamicBarsHtml = "";
    historyBalances.forEach((item, index) => {
      const isCurrentMonth = index === 6;
      let pct = Math.round(Math.abs(item.val) / maxBal * 100);
      if (pct < 8) pct = 8;
      const activeClass = isCurrentMonth ? "active" : "";
      const sinal = item.val > 0 ? "+" : "";
      const corNegativa = item.val < 0 && !isCurrentMonth ? "background: rgba(244, 63, 94, 0.4);" : "";
      dynamicBarsHtml += `<div class="dsw-bar ${activeClass}" style="height:${pct}%; ${corNegativa}" title="${item.label}: ${sinal}${formatCurrency(item.val)}"></div>`;
    });
    if (!container) return;
    container.innerHTML = `
        <!-- \u2460 CART\xC3O + KPIs -->
        <div class="card-row">

            <!-- Cart\xE3o de cr\xE9dito -->
            <div style="position: relative; display: flex; flex-direction: column; justify-content: center;">
                ${cardArrowsHtml}
                <div style="position: relative; width: 100%; max-width: 280px; margin: 0 auto; padding-bottom: 18px;">

                    ${nextCard ? `
                    <div style="position:absolute; top:24px; left:50%; transform:translateX(-50%) scale(0.91);
                                width:100%; aspect-ratio:1.58/1; border-radius:20px;
                                background: linear-gradient(135deg, ${nextCard.color}, #0f172a);
                                opacity:0.85; z-index:1; pointer-events:none;
                                box-shadow: 0 12px 24px -10px rgba(15,23,42,0.25);"></div>
                    ` : ""}

                    <div class="credit-card card-switch-anim"
                         style="position: relative; z-index: 2; aspect-ratio: 1.58/1; width: 100%;
                                background: ${displayCard ? `linear-gradient(135deg, ${displayCard.color}, #0f172a)` : "linear-gradient(135deg, #e2e8f0, #f8fafc)"};
                                cursor: ${displayCard ? "pointer" : "default"}; overflow: hidden;
                                display: flex; flex-direction: column; justify-content: space-between;
                                border-radius: 20px; padding: 16px;
                                box-shadow: 0 10px 24px -10px ${displayCard ? displayCard.color + "55" : "rgba(15,23,42,0.12)"}, inset 0 1px 1px rgba(255,255,255,0.2);"
                         ${displayCard ? `onclick="abrirCarteira('${escapeJsAttr(displayCard.accountId)}')"` : ""}>

                        <div style="position:absolute;top:-50%;left:-20%;width:150%;height:150%;background:radial-gradient(ellipse at top left,rgba(255,255,255,0.13) 0%,transparent 65%);pointer-events:none;"></div>
                        <div style="position:absolute;bottom:-30%;right:-10%;width:70%;height:70%;background:radial-gradient(circle,rgba(255,255,255,0.05) 0%,transparent 70%);pointer-events:none;"></div>

                        <div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:2;">
                            ${displayCard ? `
                            <div style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:rgba(255,255,255,0.92);border-radius:8px;padding:3px;box-shadow:0 4px 10px rgba(0,0,0,0.18);">
                                ${getBankLogoHtml(displayCard.bankLabel, displayCard.bankIspb)}
                            </div>` : '<span class="material-icons" style="color:#94a3b8;font-size:1.6rem;">credit_card</span>'}
                            <span style="font-weight:600;font-size:0.66rem;text-transform:uppercase;letter-spacing:1.2px;color:${displayCard ? "rgba(255,255,255,0.85)" : "#64748b"};text-shadow:${displayCard ? "0 1px 3px rgba(0,0,0,0.35)" : "none"};">${formatBankName}</span>
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
                        </div>` : ""}

                        <div style="display:flex;justify-content:space-between;align-items:flex-end;position:relative;z-index:2;margin-top:auto;">
                            <div>
                                <span style="font-size:0.95rem;font-family:'Courier New',monospace;letter-spacing:3px;color:${displayCard ? "rgba(255,255,255,0.95)" : "#64748b"};font-weight:700;text-shadow:${displayCard ? "0 2px 6px rgba(0,0,0,0.3)" : "none"};">\u2022\u2022\u2022\u2022 ${displayCard ? displayCard.last4 : "0000"}</span>
                                <p style="font-size:0.62rem;color:${displayCard ? "rgba(255,255,255,0.65)" : "#94a3b8"};margin-top:3px;text-transform:uppercase;letter-spacing:1px;font-weight:500;">${displayCard ? displayCard.name : 'Cadastre em "Contas"'}</p>
                            </div>
                            ${displayCard ? `<div style="width:60px;height:40px;display:flex;align-items:center;justify-content:flex-end;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.3));">${getBrandLogoHtml(displayCard.brand)}</div>` : ""}
                        </div>
                    </div>
                </div>
                ${cardDotsHtml}
            </div>

            <!-- KPIs \u2014 Novo Card \xDAnico Consolidado -->
            <div class="dash-summary-widget">
                <div>
                    <div class="dsw-header">
                        <span class="dsw-title">Saldo Total</span>
                        ${trendBadge(dashTotalBalance, pastBalance, false)}
                    </div>
                    <div class="dsw-subtitle">Este m\xEAs</div>
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

        <!-- \u2461 GR\xC1FICOS -->
        <div class="charts-row">
            <!-- Fluxo de Caixa -->
            <div class="chart-card">
                <div class="chart-header">
                    <h3>Fluxo de Caixa</h3>
                    <span class="material-icons-outlined" style="font-size:1.1rem;cursor:pointer;" onclick="setActiveView('transactions')">arrow_forward</span>
                </div>
                <p class="chart-sublabel">Entradas e sa\xEDdas dos \xFAltimos 6 meses</p>
                <div class="chart-totals-inline">
                    <div class="chart-total-item">
                        <span class="ct-label">Entradas</span>
                        <span class="ct-value income-color privacy-text-value" id="chartTotalIncome">+ R$ 0,00</span>
                    </div>
                    <div class="chart-total-item">
                        <span class="ct-label">Sa\xEDdas</span>
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
                    <h3>${window.currentDonutViewIndex === 0 ? "Por Categoria" : "Por Centro de Custo"}</h3>
                    <span class="material-icons-outlined" style="font-size:1rem;color:#6366f1;">${window.currentDonutViewIndex === 0 ? "category" : "store"}</span>
                </div>
                <p class="chart-sublabel">Distribui\xE7\xE3o de despesas do m\xEAs</p>
                <button onclick="mudarDonutDashboard(-1, event)" style="position:absolute;left:6px;top:55%;transform:translateY(-50%);z-index:10;background:transparent;border:none;cursor:pointer;display:flex;align-items:center;">
                    <span class="material-icons" style="font-size:1.5rem;color:${isDark ? "#e0e0e0" : "#94a3b8"};">chevron_left</span>
                </button>
                <button onclick="mudarDonutDashboard(1, event)" style="position:absolute;right:6px;top:55%;transform:translateY(-50%);z-index:10;background:transparent;border:none;cursor:pointer;display:flex;align-items:center;">
                    <span class="material-icons" style="font-size:1.5rem;color:${isDark ? "#e0e0e0" : "#94a3b8"};">chevron_right</span>
                </button>
                <div style="position:relative;flex:1;height:190px;display:flex;align-items:center;justify-content:center;">
                    <canvas id="dynamicDonutChart"></canvas>
                </div>
                <div style="display:flex;justify-content:center;gap:5px;margin-top:8px;">
                    <div style="width:5px;height:5px;border-radius:50%;background:${window.currentDonutViewIndex === 0 ? "#6366f1" : isDark ? "#334155" : "#e2e8f0"};transition:background 0.3s;"></div>
                    <div style="width:5px;height:5px;border-radius:50%;background:${window.currentDonutViewIndex === 1 ? "#6366f1" : isDark ? "#334155" : "#e2e8f0"};transition:background 0.3s;"></div>
                </div>
            </div>
        </div>

        <!-- \u2462 CONTAS A PAGAR / RECEBER -->
        <div class="lists-row" style="margin-bottom:1.25rem;">
            <div class="payable-card">
                <div class="payable-header">
                    <div class="payable-header-title">
                        <div class="icon-box" style="background: ${isDark ? "rgba(244,63,94,0.15)" : "#fff1f2"}; color: ${isDark ? "#fb7185" : "#f43f5e"};">
                            <span class="material-icons-outlined" style="font-size: 1.2rem;">arrow_downward</span>
                        </div>
                        <h3>A Pagar</h3>
                    </div>
                    <span>Este m\xEAs</span>
                </div>
                <div class="payable-content">
                    <span class="pm-label">Falta Pagar (${unpaidExpensesCount})</span>
                    <div class="pm-val privacy-text-value" style="color: ${unpaidExpensesValue > 0 ? isDark ? "#fb7185" : "#f43f5e" : isDark ? "#f1f5f9" : "#0f172a"};">
                        ${formatCurrency(unpaidExpensesValue)}
                    </div>
                </div>
                <div class="payable-footer">
                    <div class="payable-footer-meta">
                        <span>Pago: <span class="privacy-text-value">${formatCurrency(paidExpensesValue)}</span></span>
                        <span>${expensesProgressPct}%</span>
                    </div>
                    <div class="payable-bar">
                        <div class="payable-bar-fill" style="width:${expensesProgressPct}%; background: ${isDark ? "#34d399" : "#10b981"};"></div>
                    </div>
                </div>
            </div>

            <div class="payable-card">
                <div class="payable-header">
                    <div class="payable-header-title">
                        <div class="icon-box" style="background: ${isDark ? "rgba(99,102,241,0.15)" : "#eff6ff"}; color: ${isDark ? "#818cf8" : "#6366f1"};">
                            <span class="material-icons-outlined" style="font-size: 1.2rem;">arrow_upward</span>
                        </div>
                        <h3>A Receber</h3>
                    </div>
                    <span>Este m\xEAs</span>
                </div>
                <div class="payable-content">
                    <span class="pm-label">Falta Receber (${unpaidIncomesCount})</span>
                    <div class="pm-val privacy-text-value" style="color: ${isDark ? "#818cf8" : "#6366f1"};">
                        ${formatCurrency(unpaidIncomesValue)}
                    </div>
                </div>
                <div class="payable-footer">
                    <div class="payable-footer-meta">
                        <span>Recebido: <span class="privacy-text-value">${formatCurrency(paidIncomesValue)}</span></span>
                        <span>${incomesProgressPct}%</span>
                    </div>
                    <div class="payable-bar">
                        <div class="payable-bar-fill" style="width:${incomesProgressPct}%; background: ${isDark ? "#818cf8" : "#6366f1"};"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- \u2463 LAN\xC7AMENTOS RECENTES + A PAGAR -->
        <div class="lists-row" style="margin-bottom:1.25rem;">
            <div class="list-card">
                <div class="list-header">
                    <h3>Lan\xE7amentos Recentes</h3>
                    <button class="list-header-action" onclick="setActiveView('transactions')">Ver todos \u2192</button>
                </div>
                ${recentTxsHtml}
            </div>
            <div class="list-card">
                <div class="list-header">
                    <h3>Pr\xF3ximos Vencimentos</h3>
                    <button class="list-header-action" onclick="setActiveView('transactions')">Ver todos \u2192</button>
                </div>
                ${unpaidTxsHtml}
            </div>
        </div>

        <!-- \u2464 SALDO POR CONTA + GANHOS -->
        <div class="lists-row" style="align-items:flex-start;margin-bottom:2rem;">
            <div class="list-card" style="display:flex;flex-direction:column;">
                <div class="list-header">
                    <h3>Saldo por Conta</h3>
                    <button class="list-header-action" onclick="setActiveView('accounts')">Gerenciar \u2192</button>
                </div>
                <div style="display:flex;flex-direction:column;gap:2px;">
                    ${accountsListHtml}
                </div>
            </div>
            <div class="list-card" style="display:flex;flex-direction:column;gap:0;">
                <div class="list-header">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <h3>Resultado do M\xEAs</h3>
                        <span class="material-icons-outlined" style="font-size:14px;color:#94a3b8;cursor:help;" title="Regime de Caixa: receitas recebidas menos despesas pagas.">info</span>
                    </div>
                </div>

                ${(() => {
      const resultado = dashMonthIncome - dashMonthExpense;
      const isPositivo = resultado >= 0;
      const economiaPct = dashMonthIncome > 0 ? Math.round(resultado / dashMonthIncome * 100) : 0;
      const corPrincipal = isPositivo ? isDark ? "#34d399" : "#059669" : isDark ? "#fb7185" : "#e11d48";
      const corFundo = isPositivo ? isDark ? "rgba(52,211,153,0.08)" : "rgba(5,150,105,0.06)" : isDark ? "rgba(251,113,133,0.08)" : "rgba(225,29,72,0.06)";
      const icone = isPositivo ? "trending_up" : "trending_down";
      const label = isPositivo ? "Saldo positivo" : "Saldo negativo";
      return `
                    <div style="background:${corFundo};border-radius:16px;padding:20px;margin-bottom:14px;display:flex;flex-direction:column;gap:6px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span class="material-icons" style="font-size:1.3rem;color:${corPrincipal};">${icone}</span>
                            <span style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${corPrincipal};">${label}</span>
                        </div>
                        <div class="privacy-text-value" style="font-size:2rem;font-weight:800;letter-spacing:-0.04em;color:${corPrincipal};line-height:1;">
                            ${isPositivo ? "+" : ""}${formatCurrency(resultado)}
                        </div>
                        <div style="font-size:0.8rem;color:${isDark ? "#475569" : "#94a3b8"};font-weight:500;">
                            receitas recebidas menos despesas pagas
                        </div>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <div style="background:${isDark ? "var(--cor-superficie-dark)" : "#f8fafc"};border-radius:12px;padding:14px;">
                            <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${isDark ? "#475569" : "#94a3b8"};margin-bottom:6px;">Receitas</div>
                            <div class="privacy-text-value" style="font-size:1.1rem;font-weight:800;color:${isDark ? "#34d399" : "#059669"};letter-spacing:-0.03em;">+${formatCurrency(dashMonthIncome)}</div>
                        </div>
                        <div style="background:${isDark ? "var(--cor-superficie-dark)" : "#f8fafc"};border-radius:12px;padding:14px;">
                            <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${isDark ? "#475569" : "#94a3b8"};margin-bottom:6px;">Despesas</div>
                            <div class="privacy-text-value" style="font-size:1.1rem;font-weight:800;color:${isDark ? "#fb7185" : "#e11d48"};letter-spacing:-0.03em;">-${formatCurrency(dashMonthExpense)}</div>
                        </div>
                        <div style="background:${isDark ? "var(--cor-superficie-dark)" : "#f8fafc"};border-radius:12px;padding:14px;">
                            <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${isDark ? "#475569" : "#94a3b8"};margin-bottom:6px;">Economia</div>
                            <div class="privacy-text-value" style="font-size:1.1rem;font-weight:800;color:${isDark ? "#f1f5f9" : "#0f172a"};letter-spacing:-0.03em;">${economiaPct}%</div>
                        </div>
                        <div style="background:${isDark ? "var(--cor-superficie-dark)" : "#f8fafc"};border-radius:12px;padding:14px;">
                            <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${isDark ? "#475569" : "#94a3b8"};margin-bottom:6px;">Situa\xE7\xE3o</div>
                            <div style="font-size:0.85rem;font-weight:700;color:${corPrincipal};">${isPositivo ? "\u2713 No azul" : "\u2717 No vermelho"}</div>
                        </div>
                    </div>
                    `;
    })()}
            </div>
        </div>
    `;
    renderCashFlowChart(isDark);
    renderDonutChart(monthExpenses, isDark);
    updatePrivacyMode();
  }
  var monthlyEarningsChart;
  var init_dashboard = __esm({
    "js/dashboard.js"() {
      init_state();
      init_utils();
      init_factories();
      init_ui_helpers();
      init_db();
      init_theme();
      init_accounts();
      monthlyEarningsChart = null;
      window.currentDashboardCardIndex = 0;
      window.currentDonutViewIndex = 0;
      window.mudarCartaoDashboard = function(direction, event) {
        if (event) event.stopPropagation();
        window.currentDashboardCardIndex += direction;
        if (window.currentDashboardCardIndex >= window.allDashboardCards.length) {
          window.currentDashboardCardIndex = 0;
        }
        if (window.currentDashboardCardIndex < 0) {
          window.currentDashboardCardIndex = window.allDashboardCards.length - 1;
        }
        renderDashboard();
      };
      window.mudarDonutDashboard = function(direction, event) {
        if (event) event.stopPropagation();
        window.currentDonutViewIndex += direction;
        if (window.currentDonutViewIndex > 1) window.currentDonutViewIndex = 0;
        if (window.currentDonutViewIndex < 0) window.currentDonutViewIndex = 1;
        renderDashboard();
      };
    }
  });

  // js/transactions.js
  function preencherSelectCategorias() {
    const select = document.getElementById("categoria");
    const valorAnterior = select.value;
    select.innerHTML = '<option value="" disabled selected>Selecione</option>';
    g.categories.filter((cat) => cat.active !== false && cat.type === selectedType).sort((a, b) => a.name.localeCompare(b.name)).forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat.id;
      option.textContent = cat.name;
      select.appendChild(option);
    });
    if (valorAnterior) select.value = valorAnterior;
  }
  function preencherSelectContas() {
    const selects = [
      document.getElementById("contaLancamento"),
      document.getElementById("contaOrigem"),
      document.getElementById("contaDestino")
    ];
    selects.forEach((sel) => {
      if (!sel) return;
      const previousValue = sel.value;
      sel.innerHTML = '<option value="" disabled selected>Selecione a conta...</option>';
      g.accounts.filter((a) => a.active !== false).sort((a, b) => a.name.localeCompare(b.name)).forEach((acc) => {
        const opt = document.createElement("option");
        opt.value = acc.id;
        opt.textContent = acc.name + " (Saldo: " + formatCurrency(acc.balance) + ")";
        sel.appendChild(opt);
      });
      if (previousValue) sel.value = previousValue;
    });
  }
  function preencherSelectPagamentos(accountId = null) {
    const select = document.getElementById("pagamento");
    const valorAnterior = select.value;
    if (!accountId) {
      select.innerHTML = '<option value="" disabled selected>Selecione uma conta primeiro...</option>';
      select.disabled = true;
      if (document.getElementById("parcelasCardGroup")) document.getElementById("parcelasCardGroup").style.display = "none";
      if (document.getElementById("boletoGroupContainer")) document.getElementById("boletoGroupContainer").style.display = "none";
      if (document.getElementById("boletoFieldGroup")) document.getElementById("boletoFieldGroup").style.display = "none";
      return;
    }
    select.disabled = false;
    select.innerHTML = '<option value="" disabled selected>Selecione</option>';
    let tiposParaMostrar = g.paymentTypes;
    const contaSelecionada = g.accounts.find((a) => a.id === accountId);
    if (contaSelecionada && contaSelecionada.acceptedPaymentTypes) {
      tiposParaMostrar = g.paymentTypes.filter(
        (pt) => contaSelecionada.acceptedPaymentTypes.includes(pt.id)
      );
    }
    tiposParaMostrar.sort((a, b) => a.description.localeCompare(b.description)).forEach((pt) => {
      const option = document.createElement("option");
      option.value = pt.id;
      option.textContent = pt.description;
      select.appendChild(option);
    });
    if (valorAnterior && tiposParaMostrar.some((pt) => pt.id === valorAnterior)) {
      select.value = valorAnterior;
    }
  }
  async function fetchCategories3() {
    if (!currentUser) return;
    const snapshot = await db.collection("users").doc(currentUser.uid).collection("categories").get();
    g.categories = snapshot.docs.map((doc) => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
  }
  async function fetchPaymentTypes2() {
    if (!currentUser) return;
    const snapshot = await db.collection("users").doc(currentUser.uid).collection("paymentTypes").get();
    g.paymentTypes = snapshot.docs.map((doc) => ({ id: doc.id, ...sanitizeFirestoreData(doc.data()) }));
  }
  async function loadPartners() {
    if (!currentUser) return;
    const snapshot = await userRef("partners").get();
    g.partners = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
  async function loadAccounts3() {
    if (!currentUser) return;
    const snapshot = await userRef("accounts").get();
    g.accounts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
  async function verificarFormasPagamentoConta(selectElement) {
    const accId = selectElement.value;
    if (!accId) return;
    const acc = g.accounts.find((a) => a.id === accId);
    if (acc && (!acc.acceptedPaymentTypes || acc.acceptedPaymentTypes.length === 0)) {
      const irParaConfig = await askConfirmation(
        "Conta Incompleta",
        'A conta "' + acc.name + '" n\xE3o possui formas de pagamento associadas (Ex: Pix, Dinheiro, Cart\xE3o). Configure isso para poder utiliz\xE1-la em lan\xE7amentos.',
        "Configurar Conta",
        false,
        "settings"
      );
      if (irParaConfig) {
        modalOverlay.style.display = "none";
        resetToStep1();
        setActiveView("accounts");
        await new Promise((r) => setTimeout(r, 300));
        if (typeof openAccountModal === "function") openAccountModal(accId);
        await new Promise((r) => setTimeout(r, 400));
        const container = document.getElementById("accountPaymentTypesContainer");
        if (container) {
          container.scrollIntoView({ behavior: "smooth", block: "center" });
          container.style.transition = "all 0.3s ease";
          container.style.background = "rgba(26,115,232,0.05)";
          container.style.boxShadow = "0 0 0 4px rgba(26,115,232,0.3)";
          container.style.borderRadius = "16px";
          container.style.padding = "12px";
          await new Promise((r) => setTimeout(r, 3e3));
          container.style.boxShadow = "";
          container.style.background = "";
          container.style.padding = "";
        }
      } else {
        selectElement.value = "";
        preencherSelectPagamentos(null);
      }
    }
  }
  function gerarPayloadPix2(chaveOrig, nome, tipoChave = "") {
    const nomeLimpo = nome ? nome.trim().substring(0, 25) : "Pagamento";
    let chave = chaveOrig ? chaveOrig.trim() : "";
    if (!chave) return "";
    if (tipoChave && tipoChave.toLowerCase() === "documento") chave = chave.replace(/\D/g, "");
    const nomeMerchant = nomeLimpo;
    const cidade = "Brasil";
    const txId = "***";
    const payload = "00020126" + String(14 + nomeMerchant.length).padStart(2, "0") + "0014BR.GOV.BCB.PIX01" + String(4 + chave.length).padStart(2, "0") + chave + "520400005303986545802BR59" + String(2 + nomeMerchant.length).padStart(2, "0") + nomeMerchant + "6008" + cidade + "62070503" + txId + "6304";
    return payload;
  }
  function filterTransactions() {
    return g.transactions.filter((t) => {
      if (currentType !== "all" && t.type !== currentType) return false;
      if (currentPartner !== "all" && t.partnerId !== currentPartner) return false;
      if (window.currentAccountFilter && window.currentAccountFilter !== "all") {
        if (t.accountId !== window.currentAccountFilter && t.contaOrigemId !== window.currentAccountFilter && t.contaDestinoId !== window.currentAccountFilter) {
          return false;
        }
      }
      const effectiveDate = t.isPaid && t.paymentDate ? t.paymentDate : t.date;
      if (currentPeriod === "custom") {
        if (effectiveDate < customStartDate || effectiveDate > customEndDate) return false;
      } else if (currentPeriod !== "all") {
        const today = /* @__PURE__ */ new Date();
        today.setHours(0, 0, 0, 0);
        const txDate = /* @__PURE__ */ new Date(effectiveDate + "T12:00:00");
        if (currentPeriod === "today") {
          if (txDate.toDateString() !== today.toDateString()) return false;
        } else if (currentPeriod === "week") {
          const firstDayOfWeek = new Date(today);
          firstDayOfWeek.setDate(today.getDate() - today.getDay());
          const lastDayOfWeek = new Date(firstDayOfWeek);
          lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
          if (txDate < firstDayOfWeek || txDate > lastDayOfWeek) return false;
        } else if (currentPeriod === "month") {
          if (txDate.getMonth() !== today.getMonth() || txDate.getFullYear() !== today.getFullYear()) return false;
        }
      }
      if (currentStatus !== "all") {
        const hojeLocal = getTodayISO();
        const isPaid = t.isPaid;
        const isTransfer = t.type === "transfer";
        if (currentStatus === "paid") {
          if (!isPaid && !isTransfer) return false;
        } else if (currentStatus === "unpaid") {
          if (isPaid || isTransfer) return false;
        } else if (currentStatus === "scheduled") {
          if (isPaid || isTransfer || t.date < hojeLocal) return false;
        } else if (currentStatus === "overdue") {
          if (isPaid || isTransfer || t.date >= hojeLocal) return false;
        }
      }
      return true;
    });
  }
  function updateSummaryTotals(filtered) {
    const totalIncome = filtered.filter((t) => t.type === "income").reduce((acc, t) => acc + t.value, 0);
    const totalExpense = filtered.filter((t) => t.type === "expense").reduce((acc, t) => acc + t.value, 0);
    const balance = totalIncome - totalExpense;
    const elBalance = document.getElementById("balanceValue");
    const elIncome = document.getElementById("incomeValue");
    const elExpense = document.getElementById("expenseValue");
    if (elBalance) elBalance.innerHTML = '<span class="txn-val">' + formatCurrency(balance) + "</span>";
    if (elIncome) elIncome.innerHTML = '<span class="txn-val">' + formatCurrency(totalIncome) + "</span>";
    if (elExpense) elExpense.innerHTML = '<span class="txn-val">' + formatCurrency(totalExpense) + "</span>";
    const now = /* @__PURE__ */ new Date();
    const currentMonth = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prevMonthDate.getFullYear() + "-" + String(prevMonthDate.getMonth() + 1).padStart(2, "0");
    const curIncome = g.transactions.filter((t) => t.type === "income" && t.date.startsWith(currentMonth)).reduce((a, t) => a + t.value, 0);
    const curExpense = g.transactions.filter((t) => t.type === "expense" && t.date.startsWith(currentMonth)).reduce((a, t) => a + t.value, 0);
    const prevIncome = g.transactions.filter((t) => t.type === "income" && t.date.startsWith(prevMonth)).reduce((a, t) => a + t.value, 0);
    const prevExpense = g.transactions.filter((t) => t.type === "expense" && t.date.startsWith(prevMonth)).reduce((a, t) => a + t.value, 0);
    const bTrend = document.getElementById("balanceTrend");
    const iTrend = document.getElementById("incomeTrend");
    const eTrend = document.getElementById("expenseTrend");
    if (bTrend) bTrend.innerHTML = trendBadge(curIncome - curExpense, prevIncome - prevExpense);
    if (iTrend) iTrend.innerHTML = trendBadge(curIncome, prevIncome);
    if (eTrend) eTrend.innerHTML = trendBadge(curExpense, prevExpense, true);
  }
  function renderTransactions() {
    const filtered = filterTransactions();
    const listEl = document.getElementById("transactionsList");
    if (!listEl) return;
    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="empty-state"><span class="material-icons">search_off</span><h3>Nenhum lan\xE7amento encontrado</h3><p>Tente ajustar os filtros acima ou cadastre um novo lan\xE7amento.</p></div>';
      updateSummaryTotals(filtered);
      updatePrivacyMode();
      return;
    }
    let html = "";
    filtered.sort((a, b) => {
      const dateA = a.isPaid && a.paymentDate ? a.paymentDate : a.date;
      const dateB = b.isPaid && b.paymentDate ? b.paymentDate : b.date;
      const dateDiff = new Date(dateB) - new Date(dateA);
      if (dateDiff !== 0) return dateDiff;
      const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return timeB - timeA;
    });
    let currentDateStr = null;
    const isDark = document.body.classList.contains("dark-mode");
    filtered.forEach((t) => {
      const effectiveDate = t.isPaid && t.paymentDate ? t.paymentDate : t.date;
      if (effectiveDate !== currentDateStr) {
        const dailyTxs = filtered.filter((tx) => {
          const txEffDate = tx.isPaid && tx.paymentDate ? tx.paymentDate : tx.date;
          return txEffDate === effectiveDate;
        });
        let dailyTotal = 0;
        dailyTxs.forEach((tx) => {
          if (tx.type === "income") dailyTotal += tx.value;
          else if (tx.type === "expense") dailyTotal -= tx.value;
        });
        const balanceClass = dailyTotal < 0 ? "daily-balance-negative" : "daily-balance-neutral";
        html += '<div class="date-header"><span>' + formatDateHeader(effectiveDate) + '</span><span class="' + balanceClass + ' daily-balance">' + formatCurrency(dailyTotal) + "</span></div>";
        currentDateStr = effectiveDate;
      }
      const typeClass = t.type;
      let icon = "receipt";
      if (t.type === "expense") icon = "shopping_bag";
      else if (t.type === "income") icon = "payments";
      else if (t.type === "transfer") icon = "swap_horiz";
      let amountClass = typeClass;
      let amountSign = "";
      if (t.type === "expense") {
        amountSign = "- ";
      } else if (t.type === "income") {
        amountSign = "+ ";
      }
      const categoryName2 = getCategoryNameById(t.category) || "Outros";
      const tituloPrincipal = t.partnerName ? t.partnerName : t.description || "(Sem descri\xE7\xE3o)";
      const subDescricao = t.partnerName && t.description ? t.description + " \u2022 " + categoryName2 : categoryName2;
      let badgeHtml = "";
      if (t.type !== "transfer") {
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
        badgeHtml = '<span class="status-badge scheduled" style="border-color: ' + (isDark ? "#8ab4f8" : "#1a73e8") + "; color: " + (isDark ? "#8ab4f8" : "#1a73e8") + ';">Transferido</span>';
      }
      let botoesAcaoHtml = "";
      if (!t.isPaid && t.type !== "transfer") {
        botoesAcaoHtml += '<button class="action-btn pay-btn" title="Efetivar Pagamento"><span class="material-icons">check_circle</span></button>';
      }
      botoesAcaoHtml += '<button class="action-btn delete-btn" title="Excluir"><span class="material-icons">delete</span></button>';
      html += criarHtmlItemTransacao(t.id, typeClass, icon, tituloPrincipal, subDescricao, amountClass, amountSign, formatCurrency(t.value), badgeHtml, botoesAcaoHtml);
    });
    listEl.innerHTML = html;
    updateSummaryTotals(filtered);
    updatePrivacyMode();
    document.querySelectorAll(".pay-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const item = e.target.closest(".transaction-item");
        const id = item.dataset.id;
        const t = g.transactions.find((x) => x.id === id);
        if (!t) return;
        const chosenDate = await askPaymentDate(t.date);
        if (!chosenDate) return;
        try {
          await userRef("transactions").doc(id).update({ isPaid: true, paymentDate: chosenDate, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
          const idx = g.transactions.findIndex((x) => x.id === id);
          if (idx !== -1) {
            g.transactions[idx].isPaid = true;
            g.transactions[idx].paymentDate = chosenDate;
            await processAccountBalance(g.transactions[idx], "apply");
          }
          showToast("Lan\xE7amento pago com sucesso!", "success");
          renderTransactions();
          renderDashboard();
        } catch (error) {
          showToast("Erro ao processar pagamento.", "error");
        }
      });
    });
    document.querySelectorAll(".transaction-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (e.target.closest(".delete-btn")) return;
        const id = item.dataset.id;
        openEditTransactionModal(id);
      });
    });
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const item = e.target.closest(".transaction-item");
        const id = item.dataset.id;
        const isConfirmed = await askConfirmation("Excluir Lan\xE7amento", "Tem certeza que deseja excluir este lan\xE7amento permanentemente?", "Excluir", true, "delete_outline");
        if (isConfirmed) {
          const txToDel = g.transactions.find((t) => t.id === id);
          if (txToDel) await processAccountBalance(txToDel, "revert");
          await deleteTransaction(id);
          showToast("Lan\xE7amento exclu\xEDdo com sucesso.", "success");
          renderTransactions();
          renderDashboard();
        }
      });
    });
    renderNotifications();
  }
  function closeCustomDateModal() {
    customPeriodModal.style.display = "none";
    periodFilterElement.value = previousPeriod;
  }
  function updateLeftHeroPanel() {
    const isPaid = transactionPaid ? transactionPaid.checked : false;
    const typeConfig = { expense: { label: "Despesa", icon: "arrow_downward", cls: "expense" }, income: { label: "Receita", icon: "arrow_upward", cls: "income" }, transfer: { label: "Transfer\xEAncia", icon: "swap_horiz", cls: "transfer" } };
    const cfg = typeConfig[selectedType] || typeConfig.expense;
    ["leftPanel", "leftPanel2"].forEach((id) => {
      const panel = document.getElementById(id);
      if (panel) {
        panel.classList.remove("type-expense", "type-income", "type-transfer");
        panel.classList.add("type-" + cfg.cls);
      }
    });
    ["txTypeBadge", "txTypeBadge2"].forEach((id) => {
      const badge = document.getElementById(id);
      if (badge) {
        badge.classList.remove("expense", "income", "transfer");
        badge.classList.add(cfg.cls);
        badge.innerHTML = '<span class="material-icons" style="font-size:0.9rem;">' + cfg.icon + "</span> " + cfg.label;
      }
    });
    ["heroAmount", "heroAmount2"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove("income", "transfer");
        if (cfg.cls !== "expense") el.classList.add(cfg.cls);
      }
    });
    ["heroStatusPill", "heroStatusPill2"].forEach((id) => {
      const pill = document.getElementById(id);
      if (pill) {
        pill.classList.remove("unpaid", "paid");
        if (isPaid) {
          pill.classList.add("paid");
          pill.innerHTML = '<span class="material-icons" style="font-size:0.85rem;">check_circle</span> Pago';
        } else {
          pill.classList.add("unpaid");
          pill.innerHTML = '<span class="material-icons" style="font-size:0.85rem;">schedule</span> A pagar';
        }
      }
    });
  }
  function closeDrawer() {
    const card = modalOverlay.querySelector(".modal-card");
    if (card) {
      card.style.animation = "slideOutRight 0.22s cubic-bezier(0.32, 0.72, 0, 1) forwards";
      setTimeout(() => {
        modalOverlay.style.display = "none";
        modalOverlay.classList.remove("open");
        card.style.animation = "";
        resetToStep1();
      }, 210);
    } else {
      modalOverlay.style.display = "none";
      resetToStep1();
    }
  }
  function setType(type) {
    selectedType = type;
    preencherSelectCategorias();
    [typeExpense, typeIncome, typeTransfer].forEach((el) => {
      el.classList.remove("selected", "expense", "income", "transfer");
    });
    if (type === "expense") {
      typeExpense.classList.add("selected", "expense");
    } else if (type === "income") {
      typeIncome.classList.add("selected", "income");
    } else {
      typeTransfer.classList.add("selected", "transfer");
    }
    valorInput.classList.remove("expense", "income", "transfer");
    if (type === "expense") valorInput.classList.add("expense");
    else if (type === "income") valorInput.classList.add("income");
    else if (type === "transfer") valorInput.classList.add("transfer");
    const labelConta = document.querySelector('label[for="contaLancamento"]');
    const labelOrigem = document.querySelector('label[for="contaOrigem"]');
    const labelDestino = document.querySelector('label[for="contaDestino"]');
    if (type === "transfer") {
      transferFields.classList.add("visible");
      document.getElementById("contaLancamentoGroup").style.display = "none";
      labelOrigem.innerHTML = 'Conta de origem <span class="material-icons" style="color: #d93025; font-size: 1.1rem; vertical-align: text-bottom;">arrow_downward</span> *';
      labelDestino.innerHTML = 'Conta de destino <span class="material-icons" style="color: #1a73e8; font-size: 1.1rem; vertical-align: text-bottom;">arrow_upward</span> *';
    } else {
      transferFields.classList.remove("visible");
      document.getElementById("contaLancamentoGroup").style.display = "block";
      if (type === "expense") {
        labelConta.innerHTML = 'Conta Financeira <span class="material-icons" style="color: #d93025; font-size: 1.1rem; vertical-align: text-bottom;">arrow_downward</span> *';
      } else if (type === "income") {
        labelConta.innerHTML = 'Conta Financeira <span class="material-icons" style="color: #188038; font-size: 1.1rem; vertical-align: text-bottom;">arrow_upward</span> *';
      }
    }
    if (transactionPaid && paymentStatusLabel) {
      if (type === "transfer") {
        transactionPaid.checked = true;
        transactionPaid.disabled = true;
        paymentStatusLabel.textContent = "Pago";
        paymentStatusLabel.style.color = "#188038";
      } else {
        transactionPaid.disabled = false;
        if (transactionPaid.checked) {
          paymentStatusLabel.textContent = "Pago";
          paymentStatusLabel.style.color = "#188038";
        } else {
          paymentStatusLabel.textContent = "N\xE3o Pago";
          paymentStatusLabel.style.color = "#e67e22";
        }
      }
    }
    if (typeof window.verificarExibicaoCobranca === "function") {
      window.verificarExibicaoCobranca();
    }
    updateLeftHeroPanel();
    updateReceiptPreview();
  }
  function updateReceiptPreview() {
    const type = selectedType;
    let icon = "receipt";
    let title = currentStep === 4 ? "Comprovante de " : "Resumo para Confer\xEAncia";
    if (type === "expense") {
      icon = "arrow_downward";
      if (currentStep === 4) title += "Despesa";
    } else if (type === "income") {
      icon = "arrow_upward";
      if (currentStep === 4) title += "Receita";
    } else {
      icon = "swap_horiz";
      if (currentStep === 4) title += "Transfer\xEAncia";
    }
    receiptIcon.textContent = icon;
    receiptIcon.style.color = "";
    receiptTitle.textContent = title;
    const receiptTypeClass = type === "expense" ? "" : type;
    receiptHeaderIcon.classList.remove("income", "transfer");
    receiptValor.classList.remove("income", "transfer");
    if (receiptTypeClass) {
      receiptHeaderIcon.classList.add(receiptTypeClass);
      receiptValor.classList.add(receiptTypeClass);
    }
    const valor = valorParaNumero(valorInput.value);
    receiptValor.textContent = formatCurrency(valor);
    receiptDescricao.textContent = descricaoInput.value.trim() || "(n\xE3o informado)";
    const categoriaText = categoriaSelect.options[categoriaSelect.selectedIndex]?.text || "-";
    receiptCategoria.textContent = categoriaText;
    const parceiroText = transactionPartner && transactionPartner.selectedIndex > 0 ? transactionPartner.options[transactionPartner.selectedIndex].text : "-";
    const receiptParceiro = document.getElementById("receiptParceiro");
    if (receiptParceiro) receiptParceiro.textContent = parceiroText;
    const contaLancamentoEl = document.getElementById("contaLancamento");
    if (type === "transfer") {
      receiptOrigemRow.style.display = "flex";
      receiptDestinoRow.style.display = "flex";
      document.getElementById("receiptContaRow").style.display = "none";
      receiptOrigem.textContent = contaOrigem.options[contaOrigem.selectedIndex]?.text.split(" (")[0] || "-";
      receiptDestino.textContent = contaDestino.options[contaDestino.selectedIndex]?.text.split(" (")[0] || "-";
      if (document.getElementById("receiptParceiroRow")) document.getElementById("receiptParceiroRow").style.display = "none";
    } else {
      receiptOrigemRow.style.display = "none";
      receiptDestinoRow.style.display = "none";
      document.getElementById("receiptContaRow").style.display = "flex";
      document.getElementById("receiptConta").textContent = contaLancamentoEl.options[contaLancamentoEl.selectedIndex]?.text.split(" (")[0] || "-";
      if (document.getElementById("receiptParceiroRow")) document.getElementById("receiptParceiroRow").style.display = "flex";
    }
    const dataLancamento = transactionDateInput && transactionDateInput.value ? (/* @__PURE__ */ new Date(transactionDateInput.value + "T12:00:00")).toLocaleDateString("pt-BR") : "-";
    const receiptTransactionDate = document.getElementById("receiptTransactionDate");
    if (receiptTransactionDate) receiptTransactionDate.textContent = dataLancamento;
    let vDataVencimento = dataInput.value;
    let vDataPagamento = paymentDateInput && paymentDateInput.value ? paymentDateInput.value : "";
    let isCardSelected = false;
    let isPrepaidSelected = false;
    const cartaoSelectPreview = document.getElementById("cartaoUsado");
    const contaLancPreview = document.getElementById("contaLancamento");
    if (selectedType === "expense" && cartaoSelectPreview && cartaoSelectPreview.value && contaLancPreview.value) {
      const acc = g.accounts.find((a) => a.id === contaLancPreview.value);
      if (acc && acc.cards) {
        const card = acc.cards.find((c) => c.id === cartaoSelectPreview.value);
        if (card) {
          isCardSelected = true;
          if (!card.isPrepaid) {
            const dataBaseParaCalculo = transactionDateInput && transactionDateInput.value ? transactionDateInput.value : dataInput.value;
            vDataVencimento = editingTransactionId ? dataInput.value : calcDueDate(dataBaseParaCalculo, card.closingDay || 1, card.dueDay || 10);
            if (!transactionPaid.checked) {
              vDataPagamento = "";
            }
          } else {
            isPrepaidSelected = true;
            const dataBaseParaCalculo = transactionDateInput && transactionDateInput.value ? transactionDateInput.value : dataInput.value;
            vDataVencimento = dataBaseParaCalculo;
            vDataPagamento = dataBaseParaCalculo;
          }
        }
      }
    }
    receiptData.textContent = vDataVencimento ? (/* @__PURE__ */ new Date(vDataVencimento + "T12:00:00")).toLocaleDateString("pt-BR") : "-";
    const receiptDataPagamento = document.getElementById("receiptDataPagamento");
    if (receiptDataPagamento) receiptDataPagamento.textContent = vDataPagamento ? (/* @__PURE__ */ new Date(vDataPagamento + "T12:00:00")).toLocaleDateString("pt-BR") : "-";
    const qtdParcelas = document.getElementById("parcelas") ? parseInt(document.getElementById("parcelas").value) || 1 : 1;
    const receiptParcelasRow = document.getElementById("receiptParcelasRow");
    const receiptParcelas = document.getElementById("receiptParcelas");
    if (receiptParcelasRow && qtdParcelas > 1) {
      receiptParcelasRow.style.display = "flex";
      const valorParcela = valor / qtdParcelas;
      receiptParcelas.textContent = qtdParcelas + "x de " + formatCurrency(valorParcela);
    } else if (receiptParcelasRow) {
      receiptParcelasRow.style.display = "none";
    }
    const cartaoSelect = document.getElementById("cartaoUsado");
    const receiptCartaoRow = document.getElementById("receiptCartaoRow");
    const receiptCartao = document.getElementById("receiptCartao");
    if (receiptCartaoRow && cartaoSelect && cartaoSelect.value) {
      receiptCartaoRow.style.display = "flex";
      receiptCartao.textContent = cartaoSelect.options[cartaoSelect.selectedIndex].text;
    } else if (receiptCartaoRow) {
      receiptCartaoRow.style.display = "none";
    }
    const pagamentoText = pagamentoSelect.options[pagamentoSelect.selectedIndex]?.text || "-";
    receiptPagamento.textContent = pagamentoText;
    if (recorrenteCheckbox.checked) {
      receiptRecorrenciaRow.style.display = "flex";
      receiptRecorrencia.textContent = getRecurrenceText() || "Configura\xE7\xE3o inv\xE1lida";
    } else {
      receiptRecorrenciaRow.style.display = "none";
    }
    let isPaid = transactionPaid ? transactionPaid.checked : true;
    if (isCardSelected && !editingTransactionId) {
      isPaid = isPrepaidSelected ? true : false;
    }
    const receiptSituacao = document.getElementById("receiptSituacao");
    if (receiptSituacao) {
      if (type === "transfer") {
        receiptSituacao.textContent = "Transferido";
        receiptSituacao.style.color = "#1a73e8";
      } else if (isPaid) {
        receiptSituacao.textContent = type === "expense" ? "Pago" : "Recebido";
        receiptSituacao.style.color = "#188038";
      } else {
        receiptSituacao.textContent = type === "expense" ? "A Pagar" : "A Receber";
        receiptSituacao.style.color = "#e67e22";
      }
      receiptSituacao.style.fontWeight = "bold";
    }
    const statusIcon = receiptStatus.querySelector(".material-icons");
    let statusText = "";
    receiptStatus.className = "receipt-status";
    let parcelaInfo = "";
    const descAtual = descricaoInput.value.trim();
    const descMatch = descAtual.match(/\((\d+\/\d+)\)$/);
    if (descMatch) {
      parcelaInfo = " - Parcela " + descMatch[0];
    } else if (typeof editingTransactionId !== "undefined" && !editingTransactionId) {
      const qtdParcelasInner = document.getElementById("parcelas") ? parseInt(document.getElementById("parcelas").value) : 1;
      if (qtdParcelasInner > 1) {
        parcelaInfo = " - Parcela (1/" + qtdParcelasInner + ")";
      }
    }
    if (type === "transfer") {
      statusText = "Transfer\xEAncia realizada";
      statusIcon.textContent = "check_circle";
      receiptStatus.classList.add("status-transfer");
    } else {
      if (isPaid) {
        statusText = type === "expense" ? "Despesa paga" + parcelaInfo : "Receita recebida" + parcelaInfo;
        statusIcon.textContent = "check_circle";
        receiptStatus.classList.add("status-confirmed");
      } else {
        const hojeLocal = getTodayISO();
        const tDate = dataInput.value;
        if (tDate && tDate < hojeLocal) {
          statusText = type === "expense" ? "Despesa vencida" + parcelaInfo : "Receita atrasada" + parcelaInfo;
          statusIcon.textContent = "error_outline";
          receiptStatus.classList.add("status-overdue");
        } else {
          statusText = type === "expense" ? "Despesa agendada" + parcelaInfo : "Receita agendada" + parcelaInfo;
          statusIcon.textContent = "schedule";
          receiptStatus.classList.add("status-scheduled");
        }
      }
    }
    receiptStatusText.textContent = statusText;
    const verParcelasContainer = document.getElementById("receiptVerParcelasContainer");
    const listaParcelasExtrato2 = document.getElementById("listaParcelasExtrato");
    if (verParcelasContainer) {
      if (listaParcelasExtrato2) listaParcelasExtrato2.style.display = "none";
      let txEditada = null;
      if (editingTransactionId) {
        txEditada = g.transactions.find((t) => t.id === editingTransactionId);
      }
      if (txEditada && txEditada.installmentGroupId) {
        verParcelasContainer.style.display = "flex";
        const btnVerParcelasInner = document.getElementById("btnVerParcelas");
        btnVerParcelasInner.dataset.groupId = txEditada.installmentGroupId;
        btnVerParcelasInner.innerHTML = '<span class="material-icons">list_alt</span> Ver todas as parcelas';
      } else {
        verParcelasContainer.style.display = "none";
      }
    }
    const receiptQrContainer = document.getElementById("receiptQrContainer");
    const receiptQrBox = document.getElementById("receiptQrBox");
    const receiptQrKeyText = document.getElementById("receiptQrKeyText");
    if (receiptQrContainer && receiptQrBox && receiptQrKeyText) {
      receiptQrContainer.style.display = "none";
      receiptQrBox.innerHTML = "";
      if (!isPaid && type === "expense" && pagamentoText.toLowerCase().includes("pix")) {
        const partnerId = transactionPartner && transactionPartner.value;
        if (partnerId) {
          const partner = g.partners.find((p) => p.id === partnerId);
          if (partner) {
            let pixKey = "";
            let pixType = "";
            if (partner.docIsPix && partner.document) {
              pixKey = partner.document;
              pixType = "Documento";
            } else if (partner.phoneIsPix && partner.phone) {
              pixKey = partner.phone;
              pixType = "Celular";
            } else if (partner.emailIsPix && partner.email) {
              pixKey = partner.email;
              pixType = "E-mail";
            } else if (partner.randomPixIsPix && partner.randomPix) {
              pixKey = partner.randomPix;
              pixType = "Aleat\xF3ria";
            }
            if (pixKey) {
              const payload = gerarPayloadPix2(pixKey, partner.name, pixType);
              if (typeof QRCode !== "undefined") {
                new QRCode(receiptQrBox, { text: payload, width: 140, height: 140, colorDark: "#202124", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
                receiptQrKeyText.textContent = "Chave: " + pixKey;
                receiptQrContainer.style.display = "flex";
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
    stepContents.forEach((content) => content.classList.remove("active"));
    const stepIndicator = document.getElementById("stepIndicator");
    if (step <= 3) {
      document.getElementById("step" + step).classList.add("active");
      if (document.getElementById("receiptStatusContainer")) {
        document.getElementById("receiptStatusContainer").style.display = "none";
      }
      if (stepIndicator) stepIndicator.style.display = "flex";
    } else if (step === 4) {
      document.getElementById("step3").classList.add("active");
      if (document.getElementById("receiptStatusContainer")) {
        document.getElementById("receiptStatusContainer").style.display = "block";
      }
      if (stepIndicator) stepIndicator.style.display = "none";
    }
    steps.forEach((s, index) => {
      const stepNum = index + 1;
      s.classList.remove("active", "done");
      if (stepNum < step) s.classList.add("done");
      else if (stepNum === step) s.classList.add("active");
    });
    [1, 2].forEach((i) => {
      const conn = document.getElementById("conn" + i);
      if (conn) conn.classList.toggle("done", step > i);
    });
    [1, 2, 3].forEach((i) => {
      const lbl = document.getElementById("stepLabel" + i);
      if (lbl) {
        lbl.classList.remove("active", "done");
        if (i < step) lbl.classList.add("done");
        else if (i === step) lbl.classList.add("active");
      }
    });
    const prevBtnEl = document.getElementById("prevBtn");
    const nextBtnEl = document.getElementById("nextBtn");
    const finalActionsLeft = document.getElementById("finalActionsLeft");
    const finalActionsRight = document.getElementById("finalActionsRight");
    const topActionsRight = document.getElementById("topActionsRight");
    const editWarning = document.getElementById("receiptEditWarning");
    if (step < 4) {
      if (prevBtnEl) prevBtnEl.style.display = "inline-block";
      if (nextBtnEl) {
        nextBtnEl.style.display = "inline-block";
        nextBtnEl.disabled = false;
        nextBtnEl.textContent = step === 3 ? "Salvar lan\xE7amento" : "Continuar";
      }
      if (prevBtnEl) prevBtnEl.disabled = step === 1;
      if (finalActionsLeft) finalActionsLeft.style.display = "none";
      if (finalActionsRight) finalActionsRight.style.display = "none";
      if (topActionsRight) topActionsRight.style.display = "none";
      if (editWarning) editWarning.style.display = "none";
    } else {
      if (prevBtnEl) prevBtnEl.style.display = "none";
      if (nextBtnEl) nextBtnEl.style.display = "none";
      if (finalActionsLeft) finalActionsLeft.style.display = "flex";
      if (finalActionsRight) finalActionsRight.style.display = "flex";
      if (topActionsRight) topActionsRight.style.display = "flex";
      const downloadCobrancaBtn = document.getElementById("downloadCobrancaFooterBtn");
      if (downloadCobrancaBtn) {
        let exibirBtnCobranca = false;
        if (editingTransactionId) {
          const txAtual = g.transactions.find((t) => t.id === editingTransactionId);
          if (txAtual && txAtual.isCobranca) exibirBtnCobranca = true;
        } else {
          const cobrancaCheck = document.getElementById("cobrancaCheckbox");
          if (cobrancaCheck && cobrancaCheck.checked) exibirBtnCobranca = true;
        }
        downloadCobrancaBtn.style.display = exibirBtnCobranca ? "inline-block" : "none";
      }
      let usaCartaoCredito = false;
      const cartaoInput = document.getElementById("cartaoUsado");
      const contaInput = document.getElementById("contaLancamento");
      if (selectedType === "expense" && cartaoInput && cartaoInput.value && contaInput && contaInput.value) {
        const acc = g.accounts.find((a) => a.id === contaInput.value);
        if (acc && acc.cards) {
          const card = acc.cards.find((c) => c.id === cartaoInput.value);
          if (card && !card.isPrepaid) usaCartaoCredito = true;
        }
      }
      let isPaid = transactionPaid ? transactionPaid.checked : true;
      if (usaCartaoCredito && !editingTransactionId) {
        isPaid = false;
      }
      if (isPaid) {
        if (editWarning) editWarning.style.display = "flex";
        if (editFinalBtn) editFinalBtn.style.display = "none";
        if (reversePaymentBtn) reversePaymentBtn.style.display = "inline-block";
        if (payFinalBtn) payFinalBtn.style.display = "none";
      } else {
        if (editWarning) editWarning.style.display = "none";
        if (editFinalBtn) editFinalBtn.style.display = "flex";
        if (reversePaymentBtn) reversePaymentBtn.style.display = "none";
        if (payFinalBtn) payFinalBtn.style.display = "inline-block";
      }
    }
    if (step >= 3) updateReceiptPreview();
  }
  function destacarCampoInvalido(stepTarget, fieldId) {
    goToStep(stepTarget);
    setTimeout(() => {
      const campo = document.getElementById(fieldId);
      if (campo) {
        campo.scrollIntoView({ behavior: "smooth", block: "center" });
        campo.focus();
        campo.style.transition = "box-shadow 0.3s ease, border-color 0.3s ease";
        campo.style.borderColor = "#d93025";
        campo.style.boxShadow = "0 0 0 4px rgba(217, 48, 37, 0.2)";
        setTimeout(() => {
          campo.style.borderColor = "";
          campo.style.boxShadow = "";
        }, 3e3);
      }
    }, 300);
  }
  function resetToStep1() {
    setEditingTransactionId(null);
    document.getElementById("modalTitle").textContent = "Novo lan\xE7amento";
    valorInput.value = "";
    ["heroAmount", "heroAmount2"].forEach((id) => {
      const a = document.getElementById(id);
      if (a) a.textContent = "0,00";
    });
    descricaoInput.value = "";
    categoriaSelect.selectedIndex = 0;
    const today = getTodayISO();
    if (transactionDateInput) transactionDateInput.value = today;
    dataInput.value = today;
    if (paymentDateInput) paymentDateInput.value = "";
    if (transactionPartner) transactionPartner.selectedIndex = 0;
    if (transactionPaid) {
      transactionPaid.checked = false;
      transactionPaid.disabled = false;
      if (paymentStatusLabel) {
        paymentStatusLabel.textContent = "N\xE3o Pago";
        paymentStatusLabel.style.color = "#e67e22";
      }
    }
    document.getElementById("contaLancamento").value = "";
    document.getElementById("contaOrigem").value = "";
    document.getElementById("contaDestino").value = "";
    preencherSelectPagamentos(null);
    if (document.getElementById("cartaoUsado")) document.getElementById("cartaoUsado").value = "";
    if (document.getElementById("parcelas")) {
      document.getElementById("parcelas").value = "";
      document.getElementById("parcelas").dispatchEvent(new Event("change"));
    }
    if (document.getElementById("parcelasCardGroup")) document.getElementById("parcelasCardGroup").style.display = "none";
    setType("expense");
    document.getElementById("boletoCheckbox").checked = false;
    document.getElementById("boletoLine").value = "";
    document.getElementById("boletoFieldGroup").style.display = "none";
    document.getElementById("boletoGroupContainer").style.display = "none";
    const scanStatus2 = document.getElementById("scanStatus");
    if (scanStatus2) {
      scanStatus2.style.display = "none";
      scanStatus2.textContent = "";
    }
    recorrenteCheckbox.checked = false;
    recorrenteCheckbox.disabled = false;
    const recLabel = document.querySelector('label[for="recorrenteCheckbox"]');
    if (recLabel) recLabel.innerHTML = "Lan\xE7amento recorrente";
    recurrenceFields.classList.remove("visible");
    frequenciaSelect.value = "monthly";
    intervaloInput.value = "1";
    terminoTipoSelect.value = "never";
    terminoDataGroup.style.display = "none";
    terminoCountGroup.style.display = "none";
    terminoDataInput.value = "";
    terminoCountInput.value = "3";
    goToStep(1);
  }
  async function openEditTransactionModal(id) {
    const t = g.transactions.find((x) => x.id === id);
    if (!t) return;
    setEditingTransactionId(id);
    document.getElementById("modalTitle").textContent = "Editar lan\xE7amento";
    await Promise.all([fetchCategories3(), fetchPaymentTypes2(), loadPartners(), loadAccounts3()]);
    preencherSelectCategorias();
    preencherSelectPagamentos();
    preencherSelectContas();
    const selectPartner = document.getElementById("transactionPartner");
    if (selectPartner) {
      selectPartner.innerHTML = '<option value="">Selecione um parceiro...</option>';
      g.partners.filter((p) => p.active !== false).sort((a, b) => a.name.localeCompare(b.name)).forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name;
        selectPartner.appendChild(opt);
      });
    }
    setType(t.type);
    const valorSeguro = t.value ? Number(t.value) : 0;
    valorInput.value = formatarMoeda(valorSeguro.toFixed(2).replace(".", ""));
    descricaoInput.value = t.description || "";
    if (t.partnerId) selectPartner.value = t.partnerId;
    categoriaSelect.value = t.category || "";
    if (transactionDateInput) transactionDateInput.value = t.transactionDate || t.date;
    dataInput.value = t.date;
    if (paymentDateInput) paymentDateInput.value = t.isPaid ? t.paymentDate || t.date : "";
    const contaLancamentoEl = document.getElementById("contaLancamento");
    if (t.accountId) contaLancamentoEl.value = t.accountId;
    if (t.type === "transfer") {
      contaOrigem.value = t.contaOrigemId || "";
      contaDestino.value = t.contaDestinoId || "";
    }
    const contaParaFiltro = t.type === "transfer" ? t.contaOrigemId : t.accountId;
    preencherSelectPagamentos(contaParaFiltro);
    const eventoConta = new Event("change");
    document.getElementById("contaLancamento").dispatchEvent(eventoConta);
    if (t.cardId && document.getElementById("cartaoUsado")) {
      document.getElementById("cartaoUsado").value = t.cardId;
    }
    pagamentoSelect.value = t.paymentMethod || "";
    const checkBoleto = document.getElementById("boletoCheckbox");
    checkBoleto.checked = t.hasBoleto || false;
    document.getElementById("boletoLine").value = t.boletoLine || "";
    checkBoleto.dispatchEvent(new Event("change"));
    document.getElementById("pagamento").dispatchEvent(new Event("change"));
    const checkCobranca = document.getElementById("cobrancaCheckbox");
    if (checkCobranca && t.isCobranca) {
      checkCobranca.checked = true;
    }
    if (transactionPaid) {
      transactionPaid.checked = t.isPaid !== false;
      transactionPaid.dispatchEvent(new Event("change"));
    }
    recorrenteCheckbox.checked = false;
    recorrenteCheckbox.disabled = true;
    document.querySelector('label[for="recorrenteCheckbox"]').innerHTML = "Lan\xE7amento recorrente <small>(N\xE3o alter\xE1vel na edi\xE7\xE3o)</small>";
    recurrenceFields.classList.remove("visible");
    goToStep(4);
    modalOverlay.style.display = "flex";
    modalOverlay.classList.add("open");
  }
  function checkRStep1Valid() {
    if (currentRStep === 1) {
      rNextBtn.disabled = !(partnerSelect.value && monthSelect.value);
    }
  }
  function goToRStep(step) {
    setCurrentRStep(step);
    document.querySelectorAll("#receiptStepIndicator .step").forEach((s, idx) => {
      s.classList.toggle("active", idx + 1 <= step);
    });
    document.querySelectorAll("#receiptGeneratorModal .step-content").forEach((c) => c.classList.remove("active"));
    document.getElementById("rStep" + step).classList.add("active");
    rPrevBtn.disabled = step === 1;
    if (step === 1) {
      rNextBtn.style.display = "inline-block";
      rDownloadBtn.style.display = "none";
      rNextBtn.textContent = "Buscar Lan\xE7amentos";
      checkRStep1Valid();
    } else if (step === 2) {
      rNextBtn.style.display = "none";
      rDownloadBtn.style.display = "flex";
      rDownloadBtn.disabled = true;
      if (selectAllReceiptTx) selectAllReceiptTx.checked = false;
      loadReceiptTransactions();
    }
  }
  function loadReceiptTransactions() {
    const partnerId = partnerSelect.value;
    const monthStr = monthSelect.value;
    setReceiptEligibleTxs(g.transactions.filter((t) => t.partnerId === partnerId && t.date.startsWith(monthStr) && t.type !== "transfer" && t.isPaid === true).sort((a, b) => new Date(a.date) - new Date(b.date)));
    if (receiptEligibleTxs.length === 0) {
      rTxList.innerHTML = '<div class="receipt-empty-msg" style="padding: 16px; text-align: center;">Nenhum registro encontrado para este parceiro no per\xEDodo selecionado.</div>';
      if (selectAllReceiptTx) selectAllReceiptTx.disabled = true;
      return;
    }
    if (selectAllReceiptTx) selectAllReceiptTx.disabled = false;
    let html = "";
    receiptEligibleTxs.forEach((t) => {
      const isIncome = t.type === "income";
      const valClass = isIncome ? "receipt-val-income" : "receipt-val-expense";
      const sign = isIncome ? "+" : "-";
      const statusLabel = t.isPaid ? "(Pago)" : "(Pendente)";
      html += '<label class="receipt-tx-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #f1f3f4; cursor: pointer; transition: background 0.2s; border-radius: 8px;"><div style="display: flex; align-items: center; gap: 12px;"><input type="checkbox" class="rtx-checkbox" value="' + t.id + '" style="width: 18px; height: 18px; accent-color: #1a73e8;"><div><div class="receipt-item-desc" style="font-weight: 500;">' + t.description + ' <small style="color: #9aa0a6; font-weight: normal;">' + statusLabel + '</small></div><div style="font-size: 0.8rem; color: #5f6368;">' + formatDate(t.date) + '</div></div></div><div class="' + valClass + '" style="font-weight: 600;">' + sign + formatCurrency(t.value) + "</div></label>";
    });
    rTxList.innerHTML = html;
    document.querySelectorAll(".rtx-checkbox").forEach((cb) => {
      cb.addEventListener("change", updateRTotal);
    });
    updateRTotal();
  }
  function updateRTotal() {
    let total = 0;
    let checkedCount = 0;
    document.querySelectorAll(".rtx-checkbox:checked").forEach((cb) => {
      checkedCount++;
      const t = receiptEligibleTxs.find((x) => x.id === cb.value);
      if (t) {
        total += t.type === "income" ? t.value : -t.value;
      }
    });
    rTotalPreview.style.color = "";
    rTotalPreview.className = total >= 0 ? "receipt-total-positive" : "receipt-total-negative";
    rTotalPreview.textContent = "Total do Recibo: " + formatCurrency(Math.abs(total));
    rDownloadBtn.disabled = checkedCount === 0;
    const allCheckboxes = document.querySelectorAll(".rtx-checkbox");
    if (selectAllReceiptTx && allCheckboxes.length > 0) {
      selectAllReceiptTx.checked = checkedCount === allCheckboxes.length;
    }
  }
  function checkBStep1Valid() {
    if (currentBStep === 1) {
      bNextBtn.disabled = !bPartnerSelect.value;
    }
  }
  function goToBStep(step) {
    setCurrentBStep(step);
    document.querySelectorAll("#billingStepIndicator .step").forEach((s, idx) => {
      s.classList.toggle("active", idx + 1 <= step);
    });
    document.querySelectorAll("#billingGeneratorModal .step-content").forEach((c) => c.classList.remove("active"));
    document.getElementById("bStep" + step).classList.add("active");
    bPrevBtn.disabled = step === 1;
    if (step === 1) {
      bNextBtn.style.display = "inline-block";
      bGenerateBtn.style.display = "none";
      bNextBtn.textContent = "Buscar Receitas Pendentes";
      checkBStep1Valid();
    } else if (step === 2) {
      bNextBtn.style.display = "none";
      bGenerateBtn.style.display = "flex";
      bGenerateBtn.disabled = true;
      if (selectAllBillingTx) selectAllBillingTx.checked = false;
      loadBillingTransactions();
    }
  }
  function loadBillingTransactions() {
    const partnerId = bPartnerSelect.value;
    const partnerNameStr = bPartnerSelect.options[bPartnerSelect.selectedIndex].text;
    setBillingEligibleTxs(g.transactions.filter((t) => {
      if (t.partnerId !== partnerId && t.partnerName !== partnerNameStr) return false;
      if (t.type !== "income") return false;
      if (t.isPaid === true) return false;
      let isPix = false;
      const pm = g.paymentTypes.find((p) => p.id === t.paymentMethod);
      if (pm && pm.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("pix")) {
        isPix = true;
      }
      if (t.paymentMethod && typeof t.paymentMethod === "string" && t.paymentMethod.toLowerCase().includes("pix")) {
        isPix = true;
      }
      if (!isPix) return false;
      return true;
    }).sort((a, b) => new Date(a.date) - new Date(b.date)));
    if (billingEligibleTxs.length === 0) {
      bTxList.innerHTML = '<div class="receipt-empty-msg" style="padding: 16px; text-align: center;">Nenhuma receita pendente via Pix encontrada para este parceiro.</div>';
      if (selectAllBillingTx) selectAllBillingTx.disabled = true;
      return;
    }
    if (selectAllBillingTx) selectAllBillingTx.disabled = false;
    let html = "";
    billingEligibleTxs.forEach((t) => {
      const acc = g.accounts.find((a) => a.id === t.accountId);
      const accName = acc ? acc.name : "Conta Desconhecida";
      html += '<label class="receipt-tx-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #f1f3f4; cursor: pointer; transition: background 0.2s; border-radius: 8px;"><div style="display: flex; align-items: center; gap: 12px;"><input type="checkbox" class="btx-checkbox" value="' + t.id + '" style="width: 18px; height: 18px; accent-color: #1a73e8;"><div><div class="receipt-item-desc" style="font-weight: 500;">' + t.description + '</div><div style="font-size: 0.8rem; color: #5f6368;">' + formatDate(t.date) + " \u2022 " + accName + '</div></div></div><div class="receipt-val-income" style="font-weight: 600;">+' + formatCurrency(t.value) + "</div></label>";
    });
    bTxList.innerHTML = html;
    document.querySelectorAll(".btx-checkbox").forEach((cb) => {
      cb.addEventListener("change", updateBTotal);
    });
    updateBTotal();
  }
  function updateBTotal() {
    let total = 0;
    let checkedCount = 0;
    document.querySelectorAll(".btx-checkbox:checked").forEach((cb) => {
      checkedCount++;
      const t = billingEligibleTxs.find((x) => x.id === cb.value);
      if (t) total += t.value;
    });
    bTotalPreview.textContent = "Total da Fatura: " + formatCurrency(total);
    bGenerateBtn.disabled = checkedCount === 0;
    const allCheckboxes = document.querySelectorAll(".btx-checkbox");
    if (selectAllBillingTx && allCheckboxes.length > 0) {
      selectAllBillingTx.checked = checkedCount === allCheckboxes.length;
    }
  }
  function initTransactions() {
    document.getElementById("periodFilter")?.addEventListener("change", (e) => {
      setCurrentPeriod(e.target.value);
      renderTransactions();
    });
    document.getElementById("statusFilter")?.addEventListener("change", (e) => {
      setCurrentStatus(e.target.value);
      renderTransactions();
    });
    document.querySelectorAll("#typeFilter button").forEach((btn) => {
      btn?.addEventListener("click", (e) => {
        document.querySelectorAll("#typeFilter button").forEach((b) => b?.classList.remove("active"));
        btn.classList.add("active");
        setCurrentType(btn.dataset.type);
        renderTransactions();
      });
    });
    document.getElementById("partnerFilter")?.addEventListener("change", (e) => {
      setCurrentPartner(e.target.value);
      renderTransactions();
    });
    document.getElementById("accountFilter")?.addEventListener("change", (e) => {
      window.currentAccountFilter = e.target.value;
      renderTransactions();
    });
    periodFilterElement?.addEventListener("change", (e) => {
      if (e.target.value === "custom") {
        if (customStartDate) document.getElementById("customDateStart").value = customStartDate;
        if (customEndDate) document.getElementById("customDateEnd").value = customEndDate;
        customPeriodModal.style.display = "flex";
      } else if (e.target.value !== "custom_view") {
        setCurrentPeriod(e.target.value);
        setPreviousPeriod(currentPeriod);
        renderTransactions();
      }
    });
    document.getElementById("closeCustomPeriodBtn")?.addEventListener("click", closeCustomDateModal);
    document.getElementById("cancelCustomPeriodBtn")?.addEventListener("click", closeCustomDateModal);
    document.getElementById("applyCustomPeriodBtn")?.addEventListener("click", () => {
      const start = document.getElementById("customDateStart").value;
      const end = document.getElementById("customDateEnd").value;
      if (!start || !end) {
        showToast("Preencha a data de in\xEDcio e fim.", "warning");
        return;
      }
      if (start > end) {
        showToast("A data inicial n\xE3o pode ser maior que a final.", "error");
        return;
      }
      setCustomStartDate(start);
      setCustomEndDate(end);
      setCurrentPeriod("custom");
      const formatBr = (dateString) => dateString.split("-").reverse().join("/");
      const dateLabel = formatBr(start) + " - " + formatBr(end);
      const customViewOpt = document.getElementById("customViewOption");
      customViewOpt.textContent = dateLabel;
      periodFilterElement.value = "custom_view";
      setPreviousPeriod("custom_view");
      customPeriodModal.style.display = "none";
      renderTransactions();
    });
    const mobileFilterToggle = document.getElementById("mobileFilterToggle");
    const mainFiltersCard = document.getElementById("mainFiltersCard");
    if (mobileFilterToggle && mainFiltersCard) {
      mobileFilterToggle.addEventListener("click", () => {
        mainFiltersCard.classList.toggle("filters-expanded");
        const arrow = document.getElementById("filterToggleArrow");
        if (arrow) {
          arrow.textContent = mainFiltersCard.classList.contains("filters-expanded") ? "expand_less" : "expand_more";
        }
      });
    }
    document.getElementById("clearFiltersBtn")?.addEventListener("click", () => {
      setCurrentPeriod("month");
      setPreviousPeriod("month");
      setCurrentStatus("all");
      setCurrentType("all");
      setCurrentPartner("all");
      window.currentAccountFilter = "all";
      setCustomStartDate("");
      setCustomEndDate("");
      periodFilterElement.value = "month";
      document.getElementById("statusFilter").value = "all";
      document.getElementById("partnerFilter").value = "all";
      if (document.getElementById("accountFilter")) document.getElementById("accountFilter").value = "all";
      document.getElementById("customDateStart").value = "";
      document.getElementById("customDateEnd").value = "";
      document.querySelectorAll("#typeFilter button").forEach((b) => {
        b.classList.remove("active");
        if (b.dataset.type === "all") b.classList.add("active");
      });
      renderTransactions();
      showToast("Filtros restaurados", "success");
    });
    const downloadReportBtn = document.getElementById("downloadReportBtn");
    if (downloadReportBtn) {
      downloadReportBtn.addEventListener("click", () => {
        const filteredTx = filterTransactions();
        if (filteredTx.length === 0) {
          showToast("Nenhum lan\xE7amento encontrado para gerar o relat\xF3rio.", "warning");
          return;
        }
        if (filteredTx.length > 400) {
          showToast("Relat\xF3rio muito grande! Filtre por M\xEAs ou Trimestre para n\xE3o travar o sistema.", "warning");
          return;
        }
        const originalText = downloadReportBtn.innerHTML;
        downloadReportBtn.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">autorenew</span> Gerando...';
        downloadReportBtn.disabled = true;
        let totalIncome = 0;
        let totalExpense = 0;
        const txToPrint = [...filteredTx].sort((a, b) => new Date(b.date) - new Date(a.date));
        const groupedByMonth = {};
        txToPrint.forEach((t) => {
          if (t.type === "income") totalIncome += t.value;
          if (t.type === "expense") totalExpense += t.value;
          const monthKey = t.date.substring(0, 7);
          if (!groupedByMonth[monthKey]) groupedByMonth[monthKey] = [];
          groupedByMonth[monthKey].push(t);
        });
        const monthNames = ["Janeiro", "Fevereiro", "Mar\xE7o", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        let tablesHtml = "";
        for (const [monthKey, txs] of Object.entries(groupedByMonth)) {
          const [yearStr, monthStr] = monthKey.split("-");
          const monthTitle = monthNames[parseInt(monthStr) - 1] + " de " + yearStr;
          let rowsHtml = "";
          txs.forEach((t) => {
            const dateStr = formatDate(t.date);
            const typeLabel = t.type === "income" ? "Receita" : t.type === "expense" ? "Despesa" : "Transfer\xEAncia";
            const color = t.type === "income" ? "#188038" : t.type === "expense" ? "#d93025" : "#1a73e8";
            const sign = t.type === "income" ? "+" : t.type === "expense" ? "-" : "";
            let status = "";
            if (t.type === "transfer") {
              status = "Transferido";
            } else if (t.isPaid) {
              status = "Pago";
            } else {
              const hojeLocal = getTodayISO();
              status = t.date < hojeLocal ? '<span style="color: #d93025; font-weight: 500;">Vencido</span>' : "Agendado";
            }
            const categoryOrPartner = t.partnerName ? t.partnerName + " \u2022 " + (getCategoryNameById(t.category) || "Outros") : getCategoryNameById(t.category) || "Outros";
            rowsHtml += criarHtmlLinhaTabelaPDF(dateStr, t.description, categoryOrPartner, typeLabel, status, color, sign, formatCurrency(t.value));
          });
          tablesHtml += criarHtmlTabelaMesPDF(monthTitle, rowsHtml);
        }
        const balance = totalIncome - totalExpense;
        const balanceColor = balance >= 0 ? "#188038" : "#d93025";
        const htmlContent = '<div style="width: 800px; padding: 40px 50px 80px 50px; background: #ffffff; color: #202124; font-family: Helvetica, Arial, sans-serif;"><div style="border-bottom: 2px solid #1a73e8; padding-bottom: 24px; margin-bottom: 32px; overflow: hidden;"><div style="float: left;"><h1 style="color: #1a73e8; margin: 0; font-size: 2rem; letter-spacing: 1px;">ControlPess</h1><p style="color: #5f6368; margin: 4px 0 0 0; font-size: 1.1rem;">Relat\xF3rio Anal\xEDtico de Lan\xE7amentos</p></div><div style="float: right; text-align: right;"><p style="color: #202124; font-weight: 500; margin: 0; font-size: 1.1rem;">' + filteredTx.length + ' lan\xE7amento(s)</p><p style="color: #5f6368; font-size: 0.9rem; margin: 4px 0 0 0;">Emitido em: ' + (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR") + " \xE0s " + (/* @__PURE__ */ new Date()).toLocaleTimeString("pt-BR") + '</p></div><div style="clear: both;"></div></div><div style="display: flex; justify-content: space-between; margin-bottom: 32px; gap: 16px; page-break-inside: avoid;"><div style="flex: 1; background: #f8f9fa; padding: 20px; border-radius: 12px; border: 1px solid #e8eaed; text-align: center;"><p style="margin: 0 0 8px 0; color: #5f6368; font-size: 0.95rem;">Receitas no per\xEDodo</p><h3 style="margin: 0; color: #188038; font-size: 1.5rem;">' + formatCurrency(totalIncome) + '</h3></div><div style="flex: 1; background: #f8f9fa; padding: 20px; border-radius: 12px; border: 1px solid #e8eaed; text-align: center;"><p style="margin: 0 0 8px 0; color: #5f6368; font-size: 0.95rem;">Despesas no per\xEDodo</p><h3 style="margin: 0; color: #d93025; font-size: 1.5rem;">' + formatCurrency(totalExpense) + '</h3></div><div style="flex: 1; background: #f8f9fa; padding: 20px; border-radius: 12px; border: 1px solid #e8eaed; text-align: center;"><p style="margin: 0 0 8px 0; color: #5f6368; font-size: 0.95rem;">Saldo Final</p><h3 style="margin: 0; color: ' + balanceColor + '; font-size: 1.5rem;">' + formatCurrency(balance) + "</h3></div></div>" + tablesHtml + "</div>";
        const opt = { margin: [0.4, 0, 0.8, 0], filename: "Relatorio_ControlPess_" + (/* @__PURE__ */ new Date()).getTime() + ".pdf", image: { type: "jpeg", quality: 1 }, html2canvas: { scale: 2, useCORS: true, letterRendering: true }, jsPDF: { unit: "in", format: "a4", orientation: "portrait" } };
        html2pdf().set(opt).from(htmlContent).toPdf().get("pdf").then(function(pdf) {
          const totalPages = pdf.internal.getNumberOfPages();
          for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(9);
            pdf.setTextColor(150);
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            pdf.text("Documento gerado eletronicamente por ControlPess.", pageWidth / 2, pageHeight - 0.5, { align: "center" });
            pdf.text("P\xE1gina " + i + " de " + totalPages, pageWidth / 2, pageHeight - 0.3, { align: "center" });
          }
        }).save().then(() => {
          downloadReportBtn.innerHTML = originalText;
          downloadReportBtn.disabled = false;
          showToast("Relat\xF3rio baixado com sucesso!", "success");
        }).catch((err) => {
          console.error("Erro ao gerar PDF: ", err);
          downloadReportBtn.innerHTML = originalText;
          downloadReportBtn.disabled = false;
          showToast("Erro ao gerar relat\xF3rio.", "error");
        });
      });
    }
    if (openBtn) {
      openBtn.addEventListener("click", async () => {
        await Promise.all([fetchCategories3(), fetchPaymentTypes2(), loadPartners(), loadAccounts3()]);
        preencherSelectCategorias();
        preencherSelectPagamentos();
        preencherSelectContas();
        const selectPartner = document.getElementById("transactionPartner");
        if (selectPartner) {
          selectPartner.innerHTML = '<option value="">Selecione um parceiro...</option>';
          g.partners.filter((p) => p.active !== false).sort((a, b) => a.name.localeCompare(b.name)).forEach((p) => {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = p.name;
            selectPartner.appendChild(opt);
          });
        }
        resetToStep1();
        modalOverlay.style.display = "flex";
        modalOverlay.classList.add("open");
      });
    }
    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
    modalOverlay?.addEventListener("click", (e) => {
      if (e.target === modalOverlay) closeDrawer();
    });
    if (typeExpense) typeExpense.addEventListener("click", () => setType("expense"));
    if (typeIncome) typeIncome.addEventListener("click", () => setType("income"));
    if (typeTransfer) typeTransfer.addEventListener("click", () => setType("transfer"));
    if (transactionPaid) {
      transactionPaid.addEventListener("change", function() {
        if (this.checked) {
          paymentStatusLabel.textContent = "Pago";
          paymentStatusLabel.style.color = "#188038";
          paymentStatusLabel.style.fontWeight = "bold";
          if (paymentDateInput && !paymentDateInput.value) {
            paymentDateInput.value = getTodayISO();
          }
        } else {
          paymentStatusLabel.textContent = "N\xE3o Pago";
          paymentStatusLabel.style.color = "#e67e22";
          paymentStatusLabel.style.fontWeight = "bold";
          if (paymentDateInput) paymentDateInput.value = "";
        }
        updateLeftHeroPanel();
      });
    }
    document.getElementById("contaLancamento")?.addEventListener("change", async function() {
      preencherSelectPagamentos(this.value);
      const acc = g.accounts.find((a) => a.id === this.value);
      const cartaoSelect = document.getElementById("cartaoUsado");
      if (acc && acc.hasCreditCard && acc.cards && acc.cards.length > 0) {
        cartaoSelect.innerHTML = '<option value="">Selecione o cart\xE3o...</option>';
        acc.cards.forEach((card) => {
          cartaoSelect.innerHTML += '<option value="' + card.id + '">' + card.name + " (Final " + card.last4 + ")</option>";
        });
      } else {
        cartaoSelect.innerHTML = '<option value="">Selecione o cart\xE3o...</option>';
      }
      document.getElementById("parcelasCardGroup").style.display = "none";
      document.getElementById("cartaoGroup").style.display = "none";
      document.getElementById("parcelasGroup").style.display = "none";
      await verificarFormasPagamentoConta(this);
    });
    document.getElementById("contaOrigem")?.addEventListener("change", async function() {
      preencherSelectPagamentos(this.value);
      await verificarFormasPagamentoConta(this);
    });
    document.getElementById("contaDestino")?.addEventListener("change", async function() {
      await verificarFormasPagamentoConta(this);
    });
    document.getElementById("pagamento")?.addEventListener("change", function() {
      if (this.selectedIndex < 0) return;
      const textoSelecionado = this.options[this.selectedIndex].text.toLowerCase();
      const textoNormalizado = textoSelecionado.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (typeof window.verificarExibicaoCobranca === "function") {
        window.verificarExibicaoCobranca();
      }
      const containerBoleto = document.getElementById("boletoGroupContainer");
      const checkBoleto = document.getElementById("boletoCheckbox");
      const campoLinha = document.getElementById("boletoFieldGroup");
      if (textoNormalizado.includes("boleto")) {
        containerBoleto.style.display = "flex";
      } else {
        containerBoleto.style.display = "none";
        checkBoleto.checked = false;
        campoLinha.style.display = "none";
        document.getElementById("boletoLine").value = "";
        const scanStatus2 = document.getElementById("scanStatus");
        if (scanStatus2) scanStatus2.style.display = "none";
      }
      const ptId = this.value;
      const pt = g.paymentTypes.find((p) => p.id === ptId);
      const parcelasCardGroup = document.getElementById("parcelasCardGroup");
      const parcelasGroup = document.getElementById("parcelasGroup");
      const cartaoGroup = document.getElementById("cartaoGroup");
      const parcelasSelect = document.getElementById("parcelas");
      const cartaoSelect = document.getElementById("cartaoUsado");
      let mostrarParcelas = false;
      let mostrarCartao = false;
      if (pt && pt.allowsInstallments && (selectedType === "expense" || selectedType === "income") && !editingTransactionId) {
        mostrarParcelas = true;
        parcelasSelect.innerHTML = '<option value="" disabled selected>Selecione...</option>';
        parcelasSelect.innerHTML += '<option value="1">\xC0 vista (1x)</option>';
        for (let i = 2; i <= (pt.maxInstallments || 12); i++) {
          parcelasSelect.innerHTML += '<option value="' + i + '">' + i + "x parcelado</option>";
        }
        parcelasSelect.selectedIndex = 0;
      } else {
        parcelasSelect.value = "1";
      }
      if ((textoNormalizado.includes("credito") || textoNormalizado.includes("cartao")) && selectedType === "expense") {
        mostrarCartao = true;
      } else {
        if (cartaoSelect) cartaoSelect.value = "";
      }
      parcelasGroup.style.display = mostrarParcelas ? "block" : "none";
      cartaoGroup.style.display = mostrarCartao ? "block" : "none";
      parcelasCardGroup.style.display = mostrarParcelas || mostrarCartao ? "flex" : "none";
      if (parcelasSelect) parcelasSelect.dispatchEvent(new Event("change"));
      updateReceiptPreview();
      setTimeout(() => {
        if (mostrarParcelas && parcelasSelect) {
          parcelasSelect.scrollIntoView({ behavior: "smooth", block: "center" });
          parcelasSelect.focus();
        } else if (mostrarCartao && cartaoSelect) {
          cartaoSelect.scrollIntoView({ behavior: "smooth", block: "center" });
          cartaoSelect.focus();
        } else if (textoNormalizado.includes("boleto") && containerBoleto) {
          containerBoleto.scrollIntoView({ behavior: "smooth", block: "center" });
          checkBoleto.focus();
        }
      }, 150);
    });
    const parcelasEl = document.getElementById("parcelas");
    if (parcelasEl) {
      parcelasEl.addEventListener("change", function() {
        const recGroup = recorrenteCheckbox.parentElement;
        if (parseInt(this.value) > 1) {
          recGroup.style.display = "none";
          recorrenteCheckbox.checked = false;
          recurrenceFields.classList.remove("visible");
        } else {
          recGroup.style.display = "flex";
        }
        updateReceiptPreview();
      });
    }
    recorrenteCheckbox?.addEventListener("change", function() {
      if (this.checked) {
        recurrenceFields.classList.add("visible");
      } else {
        recurrenceFields.classList.remove("visible");
      }
      updateReceiptPreview();
    });
    terminoTipoSelect?.addEventListener("change", function() {
      if (this.value === "until") {
        terminoDataGroup.style.display = "block";
        terminoCountGroup.style.display = "none";
      } else if (this.value === "count") {
        terminoDataGroup.style.display = "none";
        terminoCountGroup.style.display = "block";
      } else {
        terminoDataGroup.style.display = "none";
        terminoCountGroup.style.display = "none";
      }
      updateReceiptPreview();
    });
    valorInput?.addEventListener("input", function(e) {
      let value = e.target.value;
      let rawValue = value.replace(/\D/g, "");
      if (rawValue.length === 0) {
        e.target.value = "";
        return;
      }
      if (rawValue.length > 15) rawValue = rawValue.slice(0, 15);
      e.target.value = formatarMoeda(rawValue);
      const display = e.target.value.replace("R$", "").trim() || "0,00";
      ["heroAmount", "heroAmount2"].forEach((id) => {
        const a = document.getElementById(id);
        if (a) a.textContent = display;
      });
    });
    valorInput?.addEventListener("blur", function(e) {
      if (!e.target.value) {
        e.target.value = "R$ 0,00";
      }
    });
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (currentStep > 1) goToStep(currentStep - 1);
      });
    }
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        if (currentStep > 1) goToStep(currentStep - 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", async () => {
        if (currentStep < 3) {
          if (currentStep === 1) {
            const valorNumerico = valorParaNumero(valorInput.value);
            if (valorNumerico <= 0) {
              showToast("Por favor, informe um valor v\xE1lido.", "warning");
              destacarCampoInvalido(1, "valor");
              return;
            }
          }
          goToStep(currentStep + 1);
        } else if (currentStep === 3) {
          const originalText = nextBtn.textContent;
          nextBtn.textContent = "Salvando...";
          nextBtn.disabled = true;
          try {
            const pSelect = document.getElementById("transactionPartner");
            const partnerName = pSelect && pSelect.selectedIndex > 0 ? pSelect.options[pSelect.selectedIndex].text : null;
            const contaLancamentoEl = document.getElementById("contaLancamento");
            const cartaoUsadoId = document.getElementById("cartaoUsado") ? document.getElementById("cartaoUsado").value : null;
            const totalDesejado = valorParaNumero(valorInput.value);
            let chavePixCobrancaSelecionada = null;
            const cobrancaCheckbox = document.getElementById("cobrancaCheckbox");
            if (cobrancaCheckbox && cobrancaCheckbox.checked) {
              if (!pSelect || !pSelect.value) {
                showToast('Para gerar uma cobran\xE7a, o campo "Parceiro" \xE9 obrigat\xF3rio.', "warning");
                nextBtn.textContent = originalText;
                nextBtn.disabled = false;
                destacarCampoInvalido(2, "transactionPartner");
                return;
              }
              if (!contaLancamentoEl.value) {
                showToast("Selecione a Conta Financeira para o recebimento da cobran\xE7a.", "warning");
                nextBtn.textContent = originalText;
                nextBtn.disabled = false;
                destacarCampoInvalido(2, "contaLancamento");
                return;
              }
              const acc = g.accounts.find((a) => a.id === contaLancamentoEl.value);
              const hasPixKeys = acc && (acc.pixKeys && acc.pixKeys.length > 0 || acc.pixKey1 || acc.pixKey2 || acc.pixKey3);
              if (!hasPixKeys) {
                showToast('A conta selecionada n\xE3o possui chaves Pix. Configure a conta no menu "Contas".', "error");
                nextBtn.textContent = originalText;
                nextBtn.disabled = false;
                destacarCampoInvalido(2, "contaLancamento");
                return;
              }
              chavePixCobrancaSelecionada = await askPixKeySelection(acc);
              if (!chavePixCobrancaSelecionada) {
                nextBtn.textContent = originalText;
                nextBtn.disabled = false;
                return;
              }
            }
            if (selectedType === "expense" && cartaoUsadoId && contaLancamentoEl.value) {
              const acc = g.accounts.find((a) => a.id === contaLancamentoEl.value);
              if (acc && acc.cards) {
                const card = acc.cards.find((c) => c.id === cartaoUsadoId);
                if (card && !card.isPrepaid) {
                  const unpaidOnCard = g.transactions.filter((t) => t.accountId === acc.id && t.cardId === cartaoUsadoId && t.type === "expense" && !t.isPaid);
                  const limitUsedTotal = unpaidOnCard.reduce((sum, t) => sum + t.value, 0);
                  const availableLimit = card.limit - limitUsedTotal;
                  let limitToCompare = availableLimit;
                  if (editingTransactionId) {
                    const oldTx = g.transactions.find((t) => t.id === editingTransactionId);
                    if (oldTx && !oldTx.isPaid && oldTx.cardId === cartaoUsadoId) {
                      limitToCompare += oldTx.value;
                    }
                  }
                  if (totalDesejado > limitToCompare) {
                    showToast("Limite do cart\xE3o insuficiente! Dispon\xEDvel: " + formatCurrency(limitToCompare), "error");
                    nextBtn.textContent = originalText;
                    nextBtn.disabled = false;
                    destacarCampoInvalido(2, "cartaoUsado");
                    return;
                  }
                }
              }
            }
            if (selectedType !== "transfer" && !contaLancamentoEl.value) {
              showToast("Selecione a Conta Financeira.", "warning");
              nextBtn.textContent = originalText;
              nextBtn.disabled = false;
              destacarCampoInvalido(2, "contaLancamento");
              return;
            }
            if (!pagamentoSelect.value) {
              showToast("Selecione a Forma de pagamento/recebimento.", "warning");
              nextBtn.textContent = originalText;
              nextBtn.disabled = false;
              destacarCampoInvalido(2, "pagamento");
              return;
            }
            const parcelasGroupVisibility = document.getElementById("parcelasGroup");
            const isParcelasRequired = parcelasGroupVisibility && parcelasGroupVisibility.style.display !== "none";
            const parcelasValue = document.getElementById("parcelas").value;
            if ((selectedType === "expense" || selectedType === "income") && isParcelasRequired && !parcelasValue) {
              showToast("Selecione a quantidade de parcelas.", "warning");
              nextBtn.textContent = originalText;
              nextBtn.disabled = false;
              destacarCampoInvalido(2, "parcelas");
              return;
            }
            const cartaoGroupVisibility = document.getElementById("cartaoGroup");
            const isCartaoRequired = cartaoGroupVisibility && cartaoGroupVisibility.style.display !== "none";
            if (selectedType === "expense" && isCartaoRequired && !cartaoUsadoId) {
              showToast("Selecione o Cart\xE3o de Cr\xE9dito.", "warning");
              nextBtn.textContent = originalText;
              nextBtn.disabled = false;
              destacarCampoInvalido(2, "cartaoUsado");
              return;
            }
            if (selectedType === "transfer") {
              if (!contaOrigem.value) {
                showToast("Selecione a conta de Origem.", "warning");
                nextBtn.textContent = originalText;
                nextBtn.disabled = false;
                destacarCampoInvalido(2, "contaOrigem");
                return;
              }
              if (!contaDestino.value) {
                showToast("Selecione a conta de Destino.", "warning");
                nextBtn.textContent = originalText;
                nextBtn.disabled = false;
                destacarCampoInvalido(2, "contaDestino");
                return;
              }
              if (contaOrigem.value === contaDestino.value) {
                showToast("A origem e o destino n\xE3o podem ser iguais.", "error");
                nextBtn.textContent = originalText;
                nextBtn.disabled = false;
                destacarCampoInvalido(2, "contaDestino");
                return;
              }
            }
            let dtLancamento = transactionDateInput ? transactionDateInput.value : dataInput.value;
            let dtVencimento = dataInput.value;
            let dtPagamento = paymentDateInput ? paymentDateInput.value : null;
            let isPrepaidCard = false;
            if (selectedType === "expense" && cartaoUsadoId && contaLancamentoEl.value) {
              const acc = g.accounts.find((a) => a.id === contaLancamentoEl.value);
              if (acc && acc.cards) {
                const card = acc.cards.find((c) => c.id === cartaoUsadoId);
                if (card) {
                  isPrepaidCard = card.isPrepaid || false;
                  if (!isPrepaidCard) {
                    if (!editingTransactionId) {
                      dtVencimento = calcDueDate(dtLancamento, card.closingDay, card.dueDay);
                    }
                    dtPagamento = null;
                  } else {
                    dtVencimento = dtLancamento;
                    dtPagamento = dtLancamento;
                  }
                }
              }
            }
            let bIsPaid = transactionPaid ? transactionPaid.checked : true;
            if (!editingTransactionId && selectedType === "expense" && cartaoUsadoId) {
              bIsPaid = isPrepaidCard ? true : false;
            }
            if (!dtLancamento || !dtVencimento) {
              showToast("Preencha as datas corretamente.", "error");
              nextBtn.textContent = originalText;
              nextBtn.disabled = false;
              destacarCampoInvalido(2, "data");
              return;
            }
            const baseTransaction = {
              type: selectedType,
              value: totalDesejado,
              cardId: cartaoUsadoId,
              description: descricaoInput.value.trim() || "(Sem descri\xE7\xE3o)",
              partnerId: pSelect ? pSelect.value : null,
              partnerName,
              category: categoriaSelect.value,
              paymentMethod: pagamentoSelect.value,
              isPaid: bIsPaid,
              paymentDate: dtPagamento,
              transactionDate: dtLancamento,
              accountId: selectedType !== "transfer" ? contaLancamentoEl.value : null,
              accountName: selectedType !== "transfer" ? contaLancamentoEl.options[contaLancamentoEl.selectedIndex].text.split(" (")[0] : null,
              hasBoleto: document.getElementById("boletoCheckbox").checked,
              boletoLine: document.getElementById("boletoLine").value.replace(/\D/g, ""),
              isCobranca: cobrancaCheckbox ? cobrancaCheckbox.checked : false,
              cobrancaPixKey: chavePixCobrancaSelecionada,
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            };
            if (selectedType === "transfer") {
              baseTransaction.contaOrigemId = contaOrigem.value;
              baseTransaction.contaOrigem = contaOrigem.options[contaOrigem.selectedIndex]?.text.split(" (")[0];
              baseTransaction.contaDestinoId = contaDestino.value;
              baseTransaction.contaDestino = contaDestino.options[contaDestino.selectedIndex]?.text.split(" (")[0];
            }
            const startDate = dtVencimento;
            if (editingTransactionId) {
              const oldTx = g.transactions.find((t) => t.id === editingTransactionId);
              if (oldTx) await processAccountBalance(oldTx, "revert");
              baseTransaction.date = dtVencimento;
              await userRef("transactions").doc(editingTransactionId).update(baseTransaction);
              const index = g.transactions.findIndex((t) => t.id === editingTransactionId);
              if (index !== -1) g.transactions[index] = { ...g.transactions[index], ...sanitizeFirestoreData(baseTransaction) };
              await processAccountBalance(g.transactions[index], "apply");
              if (baseTransaction.isCobranca) {
                let listaEdicao = [];
                if (g.transactions[index].installmentGroupId) {
                  listaEdicao = g.transactions.filter((t) => t.installmentGroupId === g.transactions[index].installmentGroupId);
                  listaEdicao.sort((a, b) => new Date(a.date) - new Date(b.date));
                } else {
                  listaEdicao = [g.transactions[index]];
                }
                window.gerarFaturaCobrancaPDF(listaEdicao);
              }
            } else {
              let transactionsToAdd = [];
              const qtdParcelas = document.getElementById("parcelas") ? parseInt(document.getElementById("parcelas").value) || 1 : 1;
              if (qtdParcelas > 1) {
                const valorParcela = totalDesejado / qtdParcelas;
                const installmentGroupId = "grp_" + Date.now();
                for (let i = 1; i <= qtdParcelas; i++) {
                  let parcelaDate = /* @__PURE__ */ new Date(dtVencimento + "T12:00:00");
                  parcelaDate.setMonth(parcelaDate.getMonth() + (i - 1));
                  const year = parcelaDate.getFullYear();
                  const month = String(parcelaDate.getMonth() + 1).padStart(2, "0");
                  const day = String(parcelaDate.getDate()).padStart(2, "0");
                  let txParcela = { ...baseTransaction, value: valorParcela, description: baseTransaction.description + " (" + i + "/" + qtdParcelas + ")", date: year + "-" + month + "-" + day, installmentGroupId };
                  transactionsToAdd.push({ ...txParcela, createdAt: (/* @__PURE__ */ new Date()).toISOString() });
                }
              } else if (recorrenteCheckbox.checked) {
                const freq = frequenciaSelect.value;
                const interval = parseInt(intervaloInput.value) || 1;
                const terminoTipo = terminoTipoSelect.value;
                let terminoValue = null;
                if (terminoTipo === "until") terminoValue = terminoDataInput.value;
                else if (terminoTipo === "count") terminoValue = parseInt(terminoCountInput.value) || 1;
                const dates = generateRecurrentDates(dtVencimento, freq, interval, terminoTipo, terminoValue);
                dates.forEach((date) => {
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, "0");
                  const day = String(date.getDate()).padStart(2, "0");
                  transactionsToAdd.push({ ...baseTransaction, date: year + "-" + month + "-" + day, createdAt: (/* @__PURE__ */ new Date()).toISOString() });
                });
              } else {
                transactionsToAdd.push({ ...baseTransaction, date: dtVencimento, createdAt: (/* @__PURE__ */ new Date()).toISOString() });
              }
              for (let t of transactionsToAdd) {
                await saveTransaction2(t);
                await processAccountBalance(t, "apply");
              }
              if (cobrancaCheckbox && cobrancaCheckbox.checked) {
                window.gerarFaturaCobrancaPDF(transactionsToAdd);
                if (g.transactions.length > 0) {
                  setEditingTransactionId(g.transactions[g.transactions.length - 1].id);
                }
              }
              setCurrentPeriod("month");
              setPreviousPeriod("month");
              setCurrentStatus("all");
              setCurrentType("all");
              setCurrentPartner("all");
              window.currentAccountFilter = "all";
              setCustomStartDate("");
              setCustomEndDate("");
              if (document.getElementById("periodFilter")) document.getElementById("periodFilter").value = "month";
              if (document.getElementById("statusFilter")) document.getElementById("statusFilter").value = "all";
              if (document.getElementById("partnerFilter")) document.getElementById("partnerFilter").value = "all";
              if (document.getElementById("accountFilter")) document.getElementById("accountFilter").value = "all";
              if (document.getElementById("customDateStart")) document.getElementById("customDateStart").value = "";
              if (document.getElementById("customDateEnd")) document.getElementById("customDateEnd").value = "";
              document.querySelectorAll("#typeFilter button").forEach((b) => {
                b.classList.remove("active");
                if (b.dataset.type === "all") b.classList.add("active");
              });
            }
            renderTransactions();
            renderDashboard();
            nextBtn.textContent = originalText;
            nextBtn.disabled = false;
            goToStep(4);
          } catch (error) {
            console.error("Erro ao salvar:", error);
            showToast("Erro de comunica\xE7\xE3o. Tente novamente.", "error");
            nextBtn.textContent = originalText;
            nextBtn.disabled = false;
          }
        }
      });
    }
    if (editFinalBtn) {
      editFinalBtn.addEventListener("click", async () => {
        if (!editingTransactionId) {
          closeDrawer();
          setTimeout(() => {
            showToast("Nenhuma transa\xE7\xE3o selecionada.", "error");
          }, 300);
          return;
        }
        closeDrawer();
        setTimeout(() => {
          const tx = g.transactions.find((t) => t.id === editingTransactionId);
          if (tx) openEditTransactionModal(tx);
        }, 300);
      });
    }
    if (deleteFinalBtn) {
      deleteFinalBtn.addEventListener("click", async () => {
        if (!editingTransactionId) return;
        const confirmDelete = await askConfirmation("Tem certeza que deseja excluir este lan\xE7amento?", "Esta a\xE7\xE3o n\xE3o pode ser desfeita.");
        if (!confirmDelete) return;
        try {
          const tx = g.transactions.find((t) => t.id === editingTransactionId);
          if (tx) await processAccountBalance(tx, "revert");
          await deleteTransaction(editingTransactionId);
          g.transactions = g.transactions.filter((t) => t.id !== editingTransactionId);
          document.getElementById("transactionReceiptPreview").innerHTML = '<p style="color:#5f6368;text-align:center;padding:20px;">Nenhum lan\xE7amento selecionado.</p>';
          renderTransactions();
          renderDashboard();
          closeDrawer();
          showToast("Lan\xE7amento exclu\xEDdo com sucesso!", "success");
        } catch (error) {
          console.error("Erro ao excluir:", error);
          showToast("Erro ao excluir lan\xE7amento.", "error");
        }
      });
    }
    if (cloneFinalBtn) {
      cloneFinalBtn.addEventListener("click", () => {
        if (!editingTransactionId) return;
        setEditingTransactionId(null);
        currentStep = 1;
        document.getElementById("mainTitle").textContent = "Novo Lan\xE7amento";
        const nextBtnLabel = document.getElementById("nextBtn");
        if (nextBtnLabel) nextBtnLabel.textContent = "Avan\xE7ar";
        goToStep(1);
      });
    }
    if (newTxFinalBtn) newTxFinalBtn.addEventListener("click", () => {
      setEditingTransactionId(null);
      document.getElementById("mainTitle").textContent = "Novo Lan\xE7amento";
      if (nextBtn) nextBtn.textContent = "Avan\xE7ar";
      goToStep(1);
    });
    if (reversePaymentBtn) {
      reversePaymentBtn.addEventListener("click", async () => {
        if (!editingTransactionId) return;
        const tx = g.transactions.find((t) => t.id === editingTransactionId);
        if (!tx) {
          showToast("Transa\xE7\xE3o n\xE3o encontrada.", "error");
          return;
        }
        const confirmReverse = await askConfirmation("Deseja realmente estornar o pagamento?", 'O lan\xE7amento voltar\xE1 ao status de "N\xE3o Pago".');
        if (!confirmReverse) return;
        try {
          await userRef("transactions").doc(editingTransactionId).update({ isPaid: false, paymentDate: null });
          if (tx) {
            tx.isPaid = false;
            tx.paymentDate = null;
            if (tx.type === "income") {
              if (tx.isCobranca) {
              }
            }
            await processAccountBalance(tx, "revert");
          }
          renderTransactions();
          renderDashboard();
          if (editingTransactionId) openEditTransactionModal(g.transactions.find((t) => t.id === editingTransactionId));
          showToast("Pagamento estornado com sucesso!", "success");
        } catch (error) {
          console.error("Erro ao estornar:", error);
          showToast("Erro ao estornar pagamento.", "error");
        }
      });
    }
    if (payFinalBtn) {
      payFinalBtn.addEventListener("click", async () => {
        if (!editingTransactionId) return;
        const tx = g.transactions.find((t) => t.id === editingTransactionId);
        if (!tx) {
          showToast("Transa\xE7\xE3o n\xE3o encontrada.", "error");
          return;
        }
        const payDate = await askPaymentDate("Informe a data do pagamento:");
        if (!payDate) return;
        try {
          await userRef("transactions").doc(editingTransactionId).update({ isPaid: true, paymentDate: payDate });
          if (tx) {
            tx.isPaid = true;
            tx.paymentDate = payDate;
            await processAccountBalance(tx, "apply");
          }
          renderTransactions();
          renderDashboard();
          if (editingTransactionId) openEditTransactionModal(g.transactions.find((t) => t.id === editingTransactionId));
          showToast("Lan\xE7amento marcado como pago!", "success");
        } catch (error) {
          console.error("Erro ao pagar:", error);
          showToast("Erro ao marcar como pago.", "error");
        }
      });
    }
    if (closeFinalBtn) closeFinalBtn.addEventListener("click", closeDrawer);
    if (downloadCobrancaFooterBtn) {
      downloadCobrancaFooterBtn.addEventListener("click", () => {
        if (!editingTransactionId) {
          showToast("Nenhum lan\xE7amento selecionado.", "warning");
          return;
        }
        const tx = g.transactions.find((t) => t.id === editingTransactionId);
        if (!tx) {
          showToast("Transa\xE7\xE3o n\xE3o encontrada.", "error");
          return;
        }
        if (!tx.isCobranca) {
          showToast("Este lan\xE7amento n\xE3o \xE9 uma cobran\xE7a.", "info");
          return;
        }
        let lista = [];
        if (tx.installmentGroupId) {
          lista = g.transactions.filter((t) => t.installmentGroupId === tx.installmentGroupId);
          lista.sort((a, b) => new Date(a.date) - new Date(b.date));
        } else {
          lista = [tx];
        }
        window.gerarFaturaCobrancaPDF(lista);
      });
    }
    if (downloadFooterBtn) {
      downloadFooterBtn.addEventListener("click", function() {
        if (!editingTransactionId) {
          showToast("Nenhum lan\xE7amento selecionado.", "warning");
          return;
        }
        const tx = g.transactions.find((t) => t.id === editingTransactionId);
        if (!tx) {
          showToast("Transa\xE7\xE3o n\xE3o encontrada.", "error");
          return;
        }
        const heroPanel = document.getElementById("leftHeroPanel");
        updateReceiptPreview();
        const originalText = this.innerHTML;
        this.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">autorenew</span> Gerando...';
        this.disabled = true;
        const buttons = document.querySelectorAll(".step-content-footer button");
        buttons.forEach((b) => {
          b.style.display = "none";
        });
        const printContent = heroPanel ? heroPanel.cloneNode(true) : document.getElementById("transactionReceiptPreview").cloneNode(true);
        const wrapper = document.createElement("div");
        wrapper.style.cssText = "width: 800px; padding: 40px 50px 80px 50px; background: #ffffff; color: #202124; font-family: Helvetica, Arial, sans-serif;";
        wrapper.innerHTML = '<div style="border-bottom: 2px solid #1a73e8; padding-bottom: 24px; margin-bottom: 32px;"><h1 style="color: #1a73e8; margin: 0; font-size: 1.8rem;">ControlPess</h1><p style="color: #5f6368; margin: 4px 0 0 0;">Comprovante de Lan\xE7amento</p></div>';
        wrapper.appendChild(printContent);
        html2pdf().set({ margin: [0.4, 0, 0.8, 0], filename: "Comprovante_ControlPess_" + (/* @__PURE__ */ new Date()).getTime() + ".pdf", image: { type: "jpeg", quality: 1 }, html2canvas: { scale: 2, useCORS: true, letterRendering: true }, jsPDF: { unit: "in", format: "a4", orientation: "portrait" } }).from(wrapper).toPdf().get("pdf").then(function(pdf) {
          const totalPages = pdf.internal.getNumberOfPages();
          for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(9);
            pdf.setTextColor(150);
            const pw = pdf.internal.pageSize.getWidth();
            const ph = pdf.internal.pageSize.getHeight();
            pdf.text("Documento gerado eletronicamente por ControlPess.", pw / 2, ph - 0.5, { align: "center" });
            pdf.text("P\xE1gina " + i + " de " + totalPages, pw / 2, ph - 0.3, { align: "center" });
          }
        }).save().then(() => {
          buttons.forEach((b) => {
            b.style.display = "";
          });
          downloadFooterBtn.innerHTML = originalText;
          downloadFooterBtn.disabled = false;
          showToast("Comprovante baixado com sucesso!", "success");
        }).catch((err) => {
          console.error("Erro ao gerar comprovante: ", err);
          buttons.forEach((b) => {
            b.style.display = "";
          });
          downloadFooterBtn.innerHTML = originalText;
          downloadFooterBtn.disabled = false;
          showToast("Erro ao gerar comprovante.", "error");
        });
      });
    }
    if (btnVerParcelas) {
      btnVerParcelas.addEventListener("click", () => {
        if (!editingTransactionId) {
          showToast("Nenhum lan\xE7amento selecionado.", "warning");
          return;
        }
        const tx = g.transactions.find((t) => t.id === editingTransactionId);
        if (!tx || !tx.installmentGroupId) {
          showToast("Este lan\xE7amento n\xE3o possui parcelas vinculadas.", "info");
          return;
        }
        const parcelas = g.transactions.filter((t) => t.installmentGroupId === tx.installmentGroupId).sort((a, b) => new Date(a.date) - new Date(b.date));
        if (parcelas.length < 2) {
          showToast("Apenas 1 parcela encontrada. Nada a exibir.", "info");
          return;
        }
        const total = parcelas.reduce((s, t) => s + t.value, 0);
        let tableRows = "";
        parcelas.forEach((p, idx) => {
          const paidIcon = p.isPaid ? "check_circle" : "radio_button_unchecked";
          const paidColor = p.isPaid ? "#188038" : "#e67e22";
          tableRows += `<tr onclick="window.abrirParcelaDoExtrato('` + p.id + `')" style="cursor:pointer;"><td style="padding:6px 10px;border-bottom:1px solid #e8eaed;">` + (idx + 1) + "/" + parcelas.length + '</td><td style="padding:6px 10px;border-bottom:1px solid #e8eaed;">' + formatDate(p.date) + '</td><td style="padding:6px 10px;border-bottom:1px solid #e8eaed;">' + formatCurrency(p.value) + '</td><td style="padding:6px 10px;border-bottom:1px solid #e8eaed;"><span class="material-icons" style="font-size:18px;color:' + paidColor + ';">' + paidIcon + '</span></td><td style="padding:6px 10px;border-bottom:1px solid #e8eaed;color:' + paidColor + ';">' + (p.isPaid ? "Pago" : "Pendente") + "</td></tr>";
        });
        const dataAtualFormatada = (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR") + " \xE0s " + (/* @__PURE__ */ new Date()).toLocaleTimeString("pt-BR");
        const modalContent = `<div id="extratoParcelasModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;justify-content:center;align-items:center;z-index:10000;"><div style="background:#fff;border-radius:16px;padding:30px;max-width:700px;width:90%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;"><h2 style="margin:0;color:#1a73e8;">Extrato de Parcelas</h2><button onclick="this.closest('#extratoParcelasModal').remove()" style="background:none;border:none;cursor:pointer;font-size:1.8rem;color:#5f6368;">&times;</button></div><p style="color:#5f6368;font-size:0.9rem;">Emitido em: ` + dataAtualFormatada + '</p><p style="color:#202124;font-weight:500;">' + tx.description.replace(/\(\d+\/\d+\)/g, "").trim() + '</p><table style="width:100%;border-collapse:collapse;margin-top:16px;"><thead><tr style="background:#f8f9fa;font-weight:500;color:#5f6368;"><th style="padding:8px 10px;text-align:left;">Parcela</th><th style="padding:8px 10px;text-align:left;">Vencimento</th><th style="padding:8px 10px;text-align:left;">Valor</th><th style="padding:8px 10px;text-align:left;">Status</th><th style="padding:8px 10px;text-align:left;"></th></tr></thead><tbody>' + tableRows + '</tbody></table><div style="margin-top:20px;padding-top:16px;border-top:2px solid #e8eaed;display:flex;justify-content:space-between;font-size:1.1rem;"><strong>Total:</strong><span>' + formatCurrency(total) + `</span></div><div style="margin-top:20px;display:flex;gap:10px;justify-content:flex-end;"><button onclick="window.exportarExtratoParcelas()" style="background:#1a73e8;color:#fff;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-weight:500;">Exportar PDF</button><button onclick="this.closest('#extratoParcelasModal').remove()" style="background:#f1f3f4;color:#5f6368;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;">Fechar</button></div></div></div>`;
        const existingModal = document.getElementById("extratoParcelasModal");
        if (existingModal) existingModal.remove();
        document.body.insertAdjacentHTML("beforeend", modalContent);
        window.exportarExtratoParcelas = function() {
          const txP = g.transactions.find((t2) => t2.id === editingTransactionId);
          if (!txP || !txP.installmentGroupId) {
            showToast("Nenhum extrato dispon\xEDvel.", "warning");
            return;
          }
          const pList = g.transactions.filter((t2) => t2.installmentGroupId === txP.installmentGroupId).sort((a, b) => new Date(a.date) - new Date(b.date));
          if (pList.length < 2) {
            showToast("Apenas uma parcela, extrato n\xE3o gerado.", "info");
            return;
          }
          const t = txP.description.replace(/\(\d+\/\d+\)/g, "").trim();
          const d = (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR");
          let r = '<div style="width:800px;padding:40px;font-family:Helvetica,Arial,sans-serif;"><div style="border-bottom:2px solid #1a73e8;padding-bottom:20px;margin-bottom:24px;"><h1 style="color:#1a73e8;margin:0;font-size:2rem;">ControlPess</h1><p style="color:#5f6368;margin:4px 0 0;">Extrato de Parcelas</p><p style="color:#5f6368;font-size:0.9rem;margin:2px 0 0;">Emitido em: ' + d + '</p></div><p style="color:#202124;font-weight:500;font-size:1.1rem;">' + t + '</p><table style="width:100%;border-collapse:collapse;margin-top:12px;"><thead><tr style="background:#f8f9fa;"><th style="padding:8px;text-align:left;border-bottom:2px solid #dadce0;">Parcela</th><th style="padding:8px;text-align:left;border-bottom:2px solid #dadce0;">Vencimento</th><th style="padding:8px;text-align:left;border-bottom:2px solid #dadce0;">Valor</th><th style="padding:8px;text-align:left;border-bottom:2px solid #dadce0;">Status</th></tr></thead><tbody>';
          pList.forEach((p, i) => {
            r += '<tr><td style="padding:6px 8px;border-bottom:1px solid #e8eaed;">' + (i + 1) + "/" + pList.length + '</td><td style="padding:6px 8px;border-bottom:1px solid #e8eaed;">' + formatDate(p.date) + '</td><td style="padding:6px 8px;border-bottom:1px solid #e8eaed;">' + formatCurrency(p.value) + '</td><td style="padding:6px 8px;border-bottom:1px solid #e8eaed;color:' + (p.isPaid ? "#188038" : "#e67e22") + ';">' + (p.isPaid ? "Pago" : "Pendente") + "</td></tr>";
          });
          r += '</tbody></table><div style="margin-top:16px;padding-top:12px;border-top:2px solid #dadce0;font-weight:500;">Total: ' + formatCurrency(pList.reduce((s, p) => s + p.value, 0)) + "</div></div>";
          html2pdf().set({ margin: [0.4, 0, 0.8, 0], filename: "Extrato_Parcelas_" + (/* @__PURE__ */ new Date()).getTime() + ".pdf", image: { type: "jpeg", quality: 1 }, html2canvas: { scale: 2, useCORS: true, letterRendering: true }, jsPDF: { unit: "in", format: "a4", orientation: "portrait" } }).from(r).save().then(() => showToast("Extrato baixado com sucesso!", "success")).catch((e) => {
            console.error(e);
            showToast("Erro ao gerar extrato.", "error");
          });
        };
        window.abrirParcelaDoExtrato = function(id) {
          const existingModal2 = document.getElementById("extratoParcelasModal");
          if (existingModal2) existingModal2.remove();
          setEditingTransactionId(id);
          const txx = g.transactions.find((tt) => tt.id === id);
          if (txx) openEditTransactionModal(txx);
        };
      });
    }
    const receiptModal = document.getElementById("receiptGenModal");
    const receiptModalOverlay = document.getElementById("receiptGenModalOverlay");
    const receiptPartnerSelect = document.getElementById("receiptPartnerSelect");
    const receiptMonthSelect = document.getElementById("receiptMonthSelect");
    const receiptListContainer = document.getElementById("receiptTransactionsList");
    const rNextBtn2 = document.getElementById("rNextBtn");
    const rPrevBtn2 = document.getElementById("rPrevBtn");
    const rStep1 = document.getElementById("rStep1");
    const rStep2 = document.getElementById("rStep2");
    const rTotalDisplay = document.getElementById("rTotalDisplay");
    const selectAllReceiptTx2 = document.getElementById("selectAllReceiptTx");
    const rDownloadBtn2 = document.getElementById("rDownloadBtn");
    if (window.btnOpenReceiptGen) {
      window.btnOpenReceiptGen.addEventListener("click", function() {
        if (g.partners.length === 0) {
          showToast("Nenhum parceiro cadastrado.", "warning");
          return;
        }
        receiptPartnerSelect.innerHTML = '<option value="" disabled selected>Selecione...</option>';
        g.partners.filter((p) => p.active !== false).sort((a, b) => a.name.localeCompare(b.name)).forEach((p) => {
          const o = document.createElement("option");
          o.value = p.id;
          o.textContent = p.name;
          receiptPartnerSelect.appendChild(o);
        });
        receiptMonthSelect.value = getTodayISO().substring(0, 7);
        rStep1.style.display = "block";
        rStep2.style.display = "none";
        receiptModalOverlay.style.display = "flex";
        receiptModal.classList.add("open");
      });
    }
    if (receiptPartnerSelect) {
      ["change", "keydown"].forEach((evt) => {
        receiptPartnerSelect.addEventListener(evt, function(e) {
          receiptMonthSelect.focus();
        });
      });
    }
    if (window.btnCloseReceiptGen) window.btnCloseReceiptGen.addEventListener("click", () => {
      receiptModalOverlay.style.display = "none";
      receiptModal.classList.remove("open");
    });
    receiptModalOverlay?.addEventListener("click", (e) => {
      if (e.target === receiptModalOverlay) {
        receiptModalOverlay.style.display = "none";
        receiptModal.classList.remove("open");
      }
    });
    if (receiptMonthSelect) {
      receiptMonthSelect.addEventListener("change", function() {
        if (!receiptPartnerSelect.value) {
          showToast("Selecione um parceiro primeiro.", "warning");
          return;
        }
        loadReceiptTransactions(receiptPartnerSelect.value, this.value);
      });
    }
    if (rNextBtn2) {
      rNextBtn2.addEventListener("click", function() {
        if (!checkRStep1Valid()) return;
        goToRStep(2);
      });
    }
    if (rPrevBtn2) rPrevBtn2.addEventListener("click", () => goToRStep(1));
    if (selectAllReceiptTx2) {
      selectAllReceiptTx2.addEventListener("change", function() {
        const checkboxes = receiptListContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((cb) => {
          cb.checked = this.checked;
        });
        updateRTotal();
      });
    }
    if (rDownloadBtn2) {
      rDownloadBtn2.addEventListener("click", function() {
        const selected = receiptListContainer.querySelectorAll('input[type="checkbox"]:checked');
        if (selected.length === 0) {
          showToast("Selecione ao menos um lan\xE7amento.", "warning");
          return;
        }
        const ids = Array.from(selected).map((cb) => cb.dataset.id);
        const txList = ids.map((id) => g.transactions.find((t) => t.id === id)).filter(Boolean);
        if (txList.length === 0) {
          showToast("Nenhum lan\xE7amento encontrado.", "warning");
          return;
        }
        const partnerId = receiptPartnerSelect.value;
        const partner = g.partners.find((p) => p.id === partnerId);
        if (!partner) {
          showToast("Parceiro n\xE3o encontrado.", "error");
          return;
        }
        const fullAddress = [partner.street, partner.number, partner.neighborhood, partner.city, partner.state].filter(Boolean).join(", ");
        const monthLabel = receiptMonthSelect.value;
        const [yr, mo] = monthLabel.split("-");
        const monthNames = ["Janeiro", "Fevereiro", "Mar\xE7o", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const monthName = monthNames[parseInt(mo) - 1] + "/" + yr;
        const sortedTx = [...txList].sort((a, b) => new Date(a.date) - new Date(b.date));
        let total = 0;
        let tableRows = "";
        sortedTx.forEach((tx, i) => {
          total += tx.value;
          const ref = String(i + 1).padStart(3, "0");
          const dateStr = formatDate(tx.date);
          const catName = getCategoryNameById(tx.category) || "Sem categoria";
          tableRows += '<tr><td style="padding:8px;border-bottom:1px solid #e8eaed;">' + ref + '</td><td style="padding:8px;border-bottom:1px solid #e8eaed;">' + dateStr + '</td><td style="padding:8px;border-bottom:1px solid #e8eaed;">' + escapeHtml(tx.description) + '</td><td style="padding:8px;border-bottom:1px solid #e8eaed;">' + catName + '</td><td style="padding:8px;border-bottom:1px solid #e8eaed;text-align:right;">' + formatCurrency(tx.value) + "</td></tr>";
        });
        const html = '<div style="width:800px;padding:40px 50px 80px;font-family:Helvetica,Arial,sans-serif;color:#202124;"><div style="border-bottom:2px solid #1a73e8;padding-bottom:20px;margin-bottom:24px;"><h1 style="color:#1a73e8;margin:0;font-size:1.8rem;">Recibo de Presta\xE7\xE3o de Servi\xE7os</h1><p style="color:#5f6368;margin:4px 0 0;">Referente a: ' + monthName + '</p></div><div style="margin-bottom:24px;padding:16px;background:#f8f9fa;border-radius:8px;"><p style="margin:0 0 4px;font-weight:500;">Tomador: ' + escapeHtml(partner.name) + "</p>" + (fullAddress ? '<p style="margin:0;color:#5f6368;">' + escapeHtml(fullAddress) + "</p>" : "") + '<p style="margin:4px 0 0;color:#5f6368;">CNPJ/CPF: ' + (partner.doc || "---") + '</p></div><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f8f9fa;font-weight:500;color:#5f6368;"><th style="padding:8px;text-align:left;">Ref</th><th style="padding:8px;text-align:left;">Data</th><th style="padding:8px;text-align:left;">Descri\xE7\xE3o</th><th style="padding:8px;text-align:left;">Categoria</th><th style="padding:8px;text-align:right;">Valor</th></tr></thead><tbody>' + tableRows + '</tbody></table><div style="margin-top:16px;padding-top:12px;border-top:2px solid #202124;display:flex;justify-content:space-between;font-size:1.1rem;font-weight:500;"><span>Total</span><span>' + formatCurrency(total) + '</span></div><div style="margin-top:40px;display:flex;justify-content:space-between;"><div style="text-align:center;border-top:1px solid #202124;padding-top:8px;width:200px;"><span style="color:#5f6368;font-size:0.85rem;">Emitente</span></div><div style="text-align:center;border-top:1px solid #202124;padding-top:8px;width:200px;"><span style="color:#5f6368;font-size:0.85rem;">Tomador</span></div></div></div>';
        this.innerHTML = '<span class="material-icons" style="animation:spin 1s linear infinite;">autorenew</span> Gerando...';
        this.disabled = true;
        html2pdf().set({ margin: [0.4, 0, 0.8, 0], filename: "Recibo_" + partner.name.replace(/\s+/g, "_") + "_" + monthLabel + ".pdf", image: { type: "jpeg", quality: 1 }, html2canvas: { scale: 2, useCORS: true, letterRendering: true }, jsPDF: { unit: "in", format: "a4", orientation: "portrait" } }).from(html).toPdf().get("pdf").then(function(pdf) {
          const tp = pdf.internal.getNumberOfPages();
          for (let i = 1; i <= tp; i++) {
            pdf.setPage(i);
            pdf.setFontSize(9);
            pdf.setTextColor(150);
            const pw = pdf.internal.pageSize.getWidth();
            const ph = pdf.internal.pageSize.getHeight();
            pdf.text("Documento gerado eletronicamente por ControlPess.", pw / 2, ph - 0.5, { align: "center" });
            pdf.text("P\xE1gina " + i + " de " + tp, pw / 2, ph - 0.3, { align: "center" });
          }
        }).save().then(() => {
          this.innerHTML = '<span class="material-icons">download</span> Baixar Recibo';
          this.disabled = false;
          showToast("Recibo gerado com sucesso!", "success");
        }).catch((e) => {
          console.error(e);
          this.innerHTML = '<span class="material-icons">download</span> Baixar Recibo';
          this.disabled = false;
          showToast("Erro ao gerar recibo.", "error");
        });
      });
    }
    const billingModalOverlay = document.getElementById("billingGenModalOverlay");
    const billingPartnerSelect = document.getElementById("billingPartnerSelect");
    const billingMonthSelect = document.getElementById("billingMonthSelect");
    const billingListContainer = document.getElementById("billingTransactionsList");
    const bStep1 = document.getElementById("bStep1");
    const bStep2 = document.getElementById("bStep2");
    const bTotalDisplay = document.getElementById("bTotalDisplay");
    const selectAllBillingTx2 = document.getElementById("selectAllBillingTx");
    const bNextBtn2 = document.getElementById("bNextBtn");
    const bPrevBtn2 = document.getElementById("bPrevBtn");
    const bGenerateBtn2 = document.getElementById("bGenerateBtn");
    if (window.btnOpenBillingGen) {
      window.btnOpenBillingGen.addEventListener("click", function() {
        if (g.partners.length === 0) {
          showToast("Nenhum parceiro cadastrado.", "warning");
          return;
        }
        billingPartnerSelect.innerHTML = '<option value="" disabled selected>Selecione...</option>';
        g.partners.filter((p) => p.active !== false).sort((a, b) => a.name.localeCompare(b.name)).forEach((p) => {
          const o = document.createElement("option");
          o.value = p.id;
          o.textContent = p.name;
          billingPartnerSelect.appendChild(o);
        });
        billingMonthSelect.value = getTodayISO().substring(0, 7);
        bStep1.style.display = "block";
        bStep2.style.display = "none";
        billingModalOverlay.style.display = "flex";
      });
    }
    if (window.btnCloseBillingGen) {
      window.btnCloseBillingGen.addEventListener("click", () => {
        billingModalOverlay.style.display = "none";
      });
    }
    billingModalOverlay?.addEventListener("click", (e) => {
      if (e.target === billingModalOverlay) billingModalOverlay.style.display = "none";
    });
    if (billingMonthSelect) {
      billingMonthSelect.addEventListener("change", function() {
        if (!billingPartnerSelect.value) {
          showToast("Selecione um parceiro primeiro.", "warning");
          return;
        }
        loadBillingTransactions(billingPartnerSelect.value, this.value);
      });
    }
    if (bNextBtn2) bNextBtn2.addEventListener("click", function() {
      if (checkBStep1Valid()) goToBStep(2);
    });
    if (bPrevBtn2) bPrevBtn2.addEventListener("click", () => goToBStep(1));
    if (selectAllBillingTx2) {
      selectAllBillingTx2.addEventListener("change", function() {
        billingListContainer.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
          cb.checked = this.checked;
        });
        updateBTotal();
      });
    }
    if (bGenerateBtn2) {
      bGenerateBtn2.addEventListener("click", function() {
        const selected = billingListContainer.querySelectorAll('input[type="checkbox"]:checked');
        if (selected.length === 0) {
          showToast("Selecione ao menos um lan\xE7amento.", "warning");
          return;
        }
        const txList = Array.from(selected).map((cb) => g.transactions.find((t) => t.id === cb.dataset.id)).filter(Boolean);
        if (txList.length === 0) {
          showToast("Nenhum lan\xE7amento encontrado.", "warning");
          return;
        }
        const partnerId = billingPartnerSelect.value;
        const partner = g.partners.find((p) => p.id === partnerId);
        if (!partner) {
          showToast("Parceiro n\xE3o encontrado.", "error");
          return;
        }
        const fullAddress = [partner.street, partner.number, partner.neighborhood, partner.city, partner.state].filter(Boolean).join(", ");
        const monthLabel = billingMonthSelect.value;
        const [yr, mo] = monthLabel.split("-");
        const monthNames = ["Janeiro", "Fevereiro", "Mar\xE7o", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const monthName = monthNames[parseInt(mo) - 1] + "/" + yr;
        const sortedTx = [...txList].sort((a, b) => new Date(a.date) - new Date(b.date));
        let total = 0;
        let tableRows = "";
        sortedTx.forEach((tx, i) => {
          total += tx.value;
          const ref = String(i + 1).padStart(3, "0");
          const dateStr = formatDate(tx.date);
          const catName = getCategoryNameById(tx.category) || "Sem categoria";
          tableRows += '<tr><td style="padding:8px;border-bottom:1px solid #e8eaed;">' + ref + '</td><td style="padding:8px;border-bottom:1px solid #e8eaed;">' + dateStr + '</td><td style="padding:8px;border-bottom:1px solid #e8eaed;">' + escapeHtml(tx.description) + '</td><td style="padding:8px;border-bottom:1px solid #e8eaed;">' + catName + '</td><td style="padding:8px;border-bottom:1px solid #e8eaed;text-align:right;">' + formatCurrency(tx.value) + '</td><td style="padding:8px;border-bottom:1px solid #e8eaed;text-align:center;">' + (tx.isPaid ? '<span style="color:#188038;">\u2713</span>' : '<span style="color:#e67e22;">\u25CB</span>') + "</td></tr>";
        });
        const html = '<div style="width:800px;padding:40px 50px 80px;font-family:Helvetica,Arial,sans-serif;color:#202124;"><div style="border-bottom:2px solid #1a73e8;padding-bottom:20px;margin-bottom:24px;"><h1 style="color:#1a73e8;margin:0;font-size:1.8rem;">Fatura de Cobran\xE7a</h1><p style="color:#5f6368;margin:4px 0 0;">Referente a: ' + monthName + '</p></div><div style="margin-bottom:24px;padding:16px;background:#f8f9fa;border-radius:8px;"><p style="margin:0 0 4px;font-weight:500;">Cliente: ' + escapeHtml(partner.name) + "</p>" + (fullAddress ? '<p style="margin:0;color:#5f6368;">' + escapeHtml(fullAddress) + "</p>" : "") + '<p style="margin:4px 0 0;color:#5f6368;">CNPJ/CPF: ' + (partner.doc || "---") + '</p></div><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f8f9fa;font-weight:500;color:#5f6368;"><th style="padding:8px;text-align:left;">Ref</th><th style="padding:8px;text-align:left;">Data</th><th style="padding:8px;text-align:left;">Descri\xE7\xE3o</th><th style="padding:8px;text-align:left;">Categoria</th><th style="padding:8px;text-align:right;">Valor</th><th style="padding:8px;text-align:center;">Status</th></tr></thead><tbody>' + tableRows + '</tbody></table><div style="margin-top:16px;padding-top:12px;border-top:2px solid #202124;display:flex;justify-content:space-between;font-size:1.1rem;font-weight:500;"><span>Total</span><span>' + formatCurrency(total) + '</span></div><div style="margin-top:40px;display:flex;justify-content:space-between;"><div style="text-align:center;border-top:1px solid #202124;padding-top:8px;width:200px;"><span style="color:#5f6368;font-size:0.85rem;">Emitente</span></div><div style="text-align:center;border-top:1px solid #202124;padding-top:8px;width:200px;"><span style="color:#5f6368;font-size:0.85rem;">Cliente</span></div></div></div>';
        this.innerHTML = '<span class="material-icons" style="animation:spin 1s linear infinite;">autorenew</span> Gerando...';
        this.disabled = true;
        html2pdf().set({ margin: [0.4, 0, 0.8, 0], filename: "Fatura_Cobranca_" + partner.name.replace(/\s+/g, "_") + "_" + monthLabel + ".pdf", image: { type: "jpeg", quality: 1 }, html2canvas: { scale: 2, useCORS: true, letterRendering: true }, jsPDF: { unit: "in", format: "a4", orientation: "portrait" } }).from(html).toPdf().get("pdf").then(function(pdf) {
          const tp = pdf.internal.getNumberOfPages();
          for (let i = 1; i <= tp; i++) {
            pdf.setPage(i);
            pdf.setFontSize(9);
            pdf.setTextColor(150);
            const pw = pdf.internal.pageSize.getWidth();
            const ph = pdf.internal.pageSize.getHeight();
            pdf.text("Documento gerado eletronicamente por ControlPess.", pw / 2, ph - 0.5, { align: "center" });
            pdf.text("P\xE1gina " + i + " de " + tp, pw / 2, ph - 0.3, { align: "center" });
          }
        }).save().then(() => {
          this.innerHTML = '<span class="material-icons">download</span> Gerar Fatura';
          this.disabled = false;
          showToast("Fatura gerada com sucesso!", "success");
        }).catch((e) => {
          console.error(e);
          this.innerHTML = '<span class="material-icons">download</span> Gerar Fatura';
          this.disabled = false;
          showToast("Erro ao gerar fatura.", "error");
        });
      });
    }
    const globalSearchInput2 = document.getElementById("globalSearchInput");
    if (globalSearchInput2) {
      globalSearchInput2.addEventListener("input", function() {
        const query = this.value.trim().toLowerCase();
        if (query.length < 2) {
          let existingList2 = document.getElementById("globalSearchResults");
          if (existingList2) existingList2.remove();
          return;
        }
        const results = g.transactions.filter((t) => {
          const desc = (t.description || "").toLowerCase();
          const partner = (t.partnerName || "").toLowerCase();
          const cat = getCategoryNameById(t.category) || "";
          const val = formatCurrency(t.value).toLowerCase();
          return desc.includes(query) || partner.includes(query) || cat.toLowerCase().includes(query) || val.includes(query);
        }).slice(0, 10);
        let existingList = document.getElementById("globalSearchResults");
        if (existingList) existingList.remove();
        if (results.length === 0) return;
        const list = document.createElement("div");
        list.id = "globalSearchResults";
        list.style.cssText = "position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #e8eaed;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.15);z-index:9999;max-height:400px;overflow-y:auto;margin-top:4px;";
        results.forEach((r) => {
          const item = document.createElement("div");
          item.style.cssText = "padding:12px 16px;cursor:pointer;border-bottom:1px solid #f1f3f4;display:flex;justify-content:space-between;align-items:center;";
          const sign = r.type === "income" ? "+" : r.type === "expense" ? "-" : "";
          const color = r.type === "income" ? "#188038" : r.type === "expense" ? "#d93025" : "#1a73e8";
          item.innerHTML = "<div><strong>" + escapeHtml(r.description || "(Sem descri\xE7\xE3o)") + '</strong><br><span style="color:#5f6368;font-size:0.85rem;">' + formatDate(r.date) + " \u2022 " + (r.partnerName || "Sem parceiro") + '</span></div><div style="color:' + color + ';font-weight:500;">' + sign + " " + formatCurrency(r.value) + "</div>";
          item.addEventListener("click", () => {
            window.abrirResultadoBusca(r.id);
            globalSearchInput2.value = "";
            existingList = document.getElementById("globalSearchResults");
            if (existingList) existingList.remove();
          });
          list.appendChild(item);
        });
        globalSearchInput2.parentElement.style.position = "relative";
        globalSearchInput2.parentElement.appendChild(list);
      });
    }
    document.addEventListener("click", function(e) {
      const searchList = document.getElementById("globalSearchResults");
      if (searchList && !searchList.contains(e.target) && e.target !== globalSearchInput2) searchList.remove();
    });
    window.abrirResultadoBusca = function(id) {
      const tx = g.transactions.find((t) => t.id === id);
      if (tx) {
        openEditTransactionModal(tx);
      } else {
        showToast("Lan\xE7amento n\xE3o encontrado.", "error");
      }
    };
    window.setActiveView = function(view) {
      document.querySelectorAll(".view-content").forEach((el) => el.style.display = "none");
      document.querySelectorAll(".nav-item").forEach((el) => el.classList.remove("active"));
      const targetView = document.getElementById("view" + view.charAt(0).toUpperCase() + view.slice(1));
      if (targetView) targetView.style.display = "block";
      const targetNav = document.querySelector('.nav-item[data-view="' + view + '"]');
      if (targetNav) targetNav.classList.add("active");
      if (view === "transactions") try {
        renderTransactions();
      } catch (e) {
        console.error(e);
      }
      if (view === "dashboard") try {
        window.renderDashboard();
      } catch (e) {
        console.error(e);
      }
      if (view === "notifications") try {
        window.renderNotifications();
      } catch (e) {
        console.error(e);
      }
    };
  }
  var currentStep, selectedType, periodFilterElement, customPeriodModal, modalOverlay, openBtn, closeBtn, cancelBtn, prevBtn, nextBtn, stepContents, steps, typeExpense, typeIncome, typeTransfer, valorInput, descricaoInput, categoriaSelect, transactionDateInput, dataInput, pagamentoSelect, transferFields, transactionPaid, paymentStatusLabel, transactionPartner, paymentDateInput, recorrenteCheckbox, recurrenceFields, frequenciaSelect, intervaloInput, terminoTipoSelect, terminoDataGroup, terminoCountGroup, terminoDataInput, terminoCountInput, receiptIcon, receiptHeaderIcon, receiptTitle, receiptSubtitle, receiptValor, receiptDescricao, receiptCategoria, receiptOrigemRow, receiptDestinoRow, receiptOrigem, receiptDestino, receiptData, receiptPagamento, receiptRecorrenciaRow, receiptRecorrencia, receiptStatus, receiptStatusText, receiptProtocol, contaOrigem, contaDestino, btnVerParcelas, listaParcelasExtrato, receiptGeneratorModal, btnOpenReceiptGen, btnCloseReceiptGen, rPrevBtn, rNextBtn, rDownloadBtn, partnerSelect, monthSelect, receiptMonthGroup, rTxList, rTotalPreview, selectAllReceiptTx, billingGeneratorModal, btnOpenBillingGen, btnCloseBillingGen, bPrevBtn, bNextBtn, bGenerateBtn, bPartnerSelect, bTxList, bTotalPreview, selectAllBillingTx, globalSearchInput, globalSearchDropdown, editFinalBtn, reversePaymentBtn, payFinalBtn, deleteFinalBtn, cloneFinalBtn, newTxFinalBtn, closeFinalBtn, downloadCobrancaFooterBtn, downloadFooterBtn;
  var init_transactions = __esm({
    "js/transactions.js"() {
      init_firebase_config();
      init_state();
      init_utils();
      init_factories();
      init_ui_helpers();
      init_db();
      init_theme();
      init_notifications();
      init_dashboard();
      currentStep = 1;
      selectedType = "expense";
      periodFilterElement = document.getElementById("periodFilter");
      customPeriodModal = document.getElementById("customPeriodModal");
      modalOverlay = document.getElementById("modalOverlay");
      openBtn = document.getElementById("openModalBtn");
      closeBtn = document.getElementById("closeModalBtn");
      cancelBtn = document.getElementById("cancelBtn");
      prevBtn = document.getElementById("prevBtn");
      nextBtn = document.getElementById("nextBtn");
      stepContents = document.querySelectorAll(".step-content");
      steps = document.querySelectorAll(".step");
      typeExpense = document.getElementById("typeExpense");
      typeIncome = document.getElementById("typeIncome");
      typeTransfer = document.getElementById("typeTransfer");
      valorInput = document.getElementById("valor");
      descricaoInput = document.getElementById("descricao");
      categoriaSelect = document.getElementById("categoria");
      transactionDateInput = document.getElementById("transactionDate");
      dataInput = document.getElementById("data");
      pagamentoSelect = document.getElementById("pagamento");
      transferFields = document.getElementById("transferFields");
      transactionPaid = document.getElementById("transactionPaid");
      paymentStatusLabel = document.getElementById("paymentStatusLabel");
      transactionPartner = document.getElementById("transactionPartner");
      paymentDateInput = document.getElementById("paymentDate");
      recorrenteCheckbox = document.getElementById("recorrenteCheckbox");
      recurrenceFields = document.getElementById("recurrenceFields");
      frequenciaSelect = document.getElementById("frequencia");
      intervaloInput = document.getElementById("intervalo");
      terminoTipoSelect = document.getElementById("terminoTipo");
      terminoDataGroup = document.getElementById("terminoDataGroup");
      terminoCountGroup = document.getElementById("terminoCountGroup");
      terminoDataInput = document.getElementById("terminoData");
      terminoCountInput = document.getElementById("terminoCount");
      receiptIcon = document.getElementById("receiptIcon");
      receiptHeaderIcon = document.getElementById("receiptHeaderIcon");
      receiptTitle = document.getElementById("receiptTitle");
      receiptSubtitle = document.getElementById("receiptSubtitle");
      receiptValor = document.getElementById("receiptValor");
      receiptDescricao = document.getElementById("receiptDescricao");
      receiptCategoria = document.getElementById("receiptCategoria");
      receiptOrigemRow = document.getElementById("receiptOrigemRow");
      receiptDestinoRow = document.getElementById("receiptDestinoRow");
      receiptOrigem = document.getElementById("receiptOrigem");
      receiptDestino = document.getElementById("receiptDestino");
      receiptData = document.getElementById("receiptData");
      receiptPagamento = document.getElementById("receiptPagamento");
      receiptRecorrenciaRow = document.getElementById("receiptRecorrenciaRow");
      receiptRecorrencia = document.getElementById("receiptRecorrencia");
      receiptStatus = document.getElementById("receiptStatus");
      receiptStatusText = document.getElementById("receiptStatusText");
      receiptProtocol = document.getElementById("receiptProtocol");
      contaOrigem = document.getElementById("contaOrigem");
      contaDestino = document.getElementById("contaDestino");
      btnVerParcelas = document.getElementById("btnVerParcelas");
      listaParcelasExtrato = document.getElementById("listaParcelasExtrato");
      receiptGeneratorModal = document.getElementById("receiptGeneratorModal");
      btnOpenReceiptGen = document.getElementById("generateReceiptBtn");
      btnCloseReceiptGen = document.getElementById("closeReceiptGenModal");
      rPrevBtn = document.getElementById("rPrevBtn");
      rNextBtn = document.getElementById("rNextBtn");
      rDownloadBtn = document.getElementById("rDownloadBtn");
      partnerSelect = document.getElementById("receiptPartnerSelect");
      monthSelect = document.getElementById("receiptMonthSelect");
      receiptMonthGroup = document.getElementById("receiptMonthGroup");
      rTxList = document.getElementById("receiptTxList");
      rTotalPreview = document.getElementById("receiptTotalPreview");
      selectAllReceiptTx = document.getElementById("selectAllReceiptTx");
      billingGeneratorModal = document.getElementById("billingGeneratorModal");
      btnOpenBillingGen = document.getElementById("generateBillingBtn");
      btnCloseBillingGen = document.getElementById("closeBillingGenModal");
      bPrevBtn = document.getElementById("bPrevBtn");
      bNextBtn = document.getElementById("bNextBtn");
      bGenerateBtn = document.getElementById("bGenerateBtn");
      bPartnerSelect = document.getElementById("billingPartnerSelect");
      bTxList = document.getElementById("billingTxList");
      bTotalPreview = document.getElementById("billingTotalPreview");
      selectAllBillingTx = document.getElementById("selectAllBillingTx");
      globalSearchInput = document.getElementById("globalSearchInput");
      globalSearchDropdown = document.getElementById("globalSearchDropdown");
      editFinalBtn = document.getElementById("editFinalBtn");
      reversePaymentBtn = document.getElementById("reversePaymentBtn");
      payFinalBtn = document.getElementById("payFinalBtn");
      deleteFinalBtn = document.getElementById("deleteFinalBtn");
      cloneFinalBtn = document.getElementById("cloneFinalBtn");
      newTxFinalBtn = document.getElementById("newTxFinalBtn");
      closeFinalBtn = document.getElementById("closeFinalBtn");
      downloadCobrancaFooterBtn = document.getElementById("downloadCobrancaFooterBtn");
      downloadFooterBtn = document.getElementById("downloadFooterBtn");
      window.openEditTransactionModal = openEditTransactionModal;
    }
  });

  // js/partners.js
  function updatePartnerActiveText() {
    document.getElementById("partnerActiveLabel").textContent = document.getElementById("partnerActive").checked ? "Ativo" : "Inativo";
  }
  function renderPartners() {
    const listEl = document.getElementById("partnersList");
    const searchFilter = document.getElementById("partnerSearchFilter") ? document.getElementById("partnerSearchFilter").value.toLowerCase().trim() : "";
    const typeFilter = document.getElementById("partnerTypeFilter")?.value || "all";
    const statusFilter = document.getElementById("partnerStatusFilter")?.value || "all";
    let filtered = g.partners.filter((p) => {
      if (searchFilter) {
        const searchableText = `${p.name || ""} ${p.document || ""} ${p.email || ""} ${p.phone || ""} ${p.city || ""} ${p.street || ""} ${p.neighborhood || ""} ${p.state || ""}`.toLowerCase();
        if (!searchableText.includes(searchFilter)) return false;
      }
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (statusFilter === "active" && p.active === false) return false;
      if (statusFilter === "inactive" && p.active !== false) return false;
      return true;
    });
    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="empty-message">Nenhum parceiro cadastrado.</div>';
      return;
    }
    let html = "";
    filtered.forEach((p) => {
      const docLabel = p.type === "Jur\xEDdica" ? "CNPJ" : p.type === "F\xEDsica" ? "CPF" : "Documento";
      const doc = p.document || "\u2014";
      const statusLabel = p.active !== false ? "Ativo" : "Inativo";
      const statusColor = p.active !== false ? "#188038" : "#5f6368";
      let locationText = "";
      if (p.city || p.state) locationText = ` | ${p.city || ""} ${p.state || ""}`.trim();
      const subHtml = `<strong style="color: ${statusColor};">${statusLabel}</strong> | ${p.type} | ${docLabel}: ${doc}${locationText}`;
      html += criarHtmlItemCadastro(p.id, p.active === false, "", p.name, subHtml, "edit-partner", "delete-partner");
    });
    listEl.innerHTML = html;
    document.querySelectorAll(".delete-partner").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const row = e.target.closest(".item-row");
        const id = row.dataset.id;
        if (await askConfirmation("Excluir", "Excluir este parceiro?", "Excluir", true, "warning")) {
          await userRef("partners").doc(id).delete();
          g.partners = g.partners.filter((p) => p.id !== id);
          renderPartners();
        }
      });
    });
    document.querySelectorAll("#partnersList .item-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.closest(".delete-partner")) return;
        const id = row.dataset.id;
        const partner = g.partners.find((p) => p.id === id);
        if (partner) openPartnerModal(partner);
      });
    });
  }
  function openPartnerModal(partner = null) {
    editingPartnerId = partner ? partner.id : null;
    document.getElementById("partnerModalTitle").textContent = partner ? "Editar parceiro" : "Novo parceiro";
    document.getElementById("partnerName").value = partner?.name || "";
    document.getElementById("partnerType").value = partner?.type || "F\xEDsica";
    updateDocLabel();
    document.getElementById("partnerDoc").value = partner?.document || "";
    document.getElementById("partnerDocIsPix").checked = partner?.docIsPix || false;
    document.getElementById("partnerPhone").value = partner?.phone || "";
    document.getElementById("partnerPhoneIsPix").checked = partner?.phoneIsPix || false;
    document.getElementById("partnerEmail").value = partner?.email || "";
    document.getElementById("partnerEmailIsPix").checked = partner?.emailIsPix || false;
    document.getElementById("partnerRandomPix").value = partner?.randomPix || "";
    document.getElementById("partnerRandomPixIsPix").checked = partner?.randomPixIsPix || false;
    if (document.getElementById("partnerDocIsPix").checked) {
      document.getElementById("partnerPhoneIsPix").checked = false;
      document.getElementById("partnerEmailIsPix").checked = false;
      document.getElementById("partnerRandomPixIsPix").checked = false;
    } else if (document.getElementById("partnerPhoneIsPix").checked) {
      document.getElementById("partnerEmailIsPix").checked = false;
      document.getElementById("partnerRandomPixIsPix").checked = false;
    } else if (document.getElementById("partnerEmailIsPix").checked) {
      document.getElementById("partnerRandomPixIsPix").checked = false;
    }
    document.getElementById("partnerCep").value = partner?.cep || "";
    document.getElementById("partnerStreet").value = partner?.street || "";
    document.getElementById("partnerNumber").value = partner?.number || "";
    document.getElementById("partnerNeighborhood").value = partner?.neighborhood || "";
    document.getElementById("partnerCity").value = partner?.city || "";
    document.getElementById("partnerState").value = partner?.state || "";
    document.getElementById("partnerObservation").value = partner?.observation || "";
    const isActive = partner ? partner.active !== false : true;
    document.getElementById("partnerActive").checked = isActive;
    updatePartnerActiveText();
    document.querySelector('[data-target="tabGeral"]').click();
    updateMiniQrCard();
    document.getElementById("partnerModal").style.display = "flex";
  }
  function initPartners() {
    const btnOpenPartner = document.getElementById("openPartnerModalBtn");
    if (btnOpenPartner) btnOpenPartner.addEventListener("click", () => openPartnerModal());
    const btnClosePartner = document.getElementById("closePartnerModal");
    if (btnClosePartner) btnClosePartner.addEventListener("click", () => document.getElementById("partnerModal").style.display = "none");
    const btnCancelPartner = document.getElementById("cancelPartner");
    if (btnCancelPartner) btnCancelPartner.addEventListener("click", () => document.getElementById("partnerModal").style.display = "none");
    const partnerModalEl = document.getElementById("partnerModal");
    if (partnerModalEl) partnerModalEl.addEventListener("click", (e) => {
      if (e.target === partnerModalEl) partnerModalEl.style.display = "none";
    });
    const partnerDocEl = document.getElementById("partnerDoc");
    if (partnerDocEl) partnerDocEl.addEventListener("input", applyDocMask);
    const partnerTypeEl = document.getElementById("partnerType");
    if (partnerTypeEl) partnerTypeEl.addEventListener("change", updateDocLabel);
    const partnerCepEl = document.getElementById("partnerCep");
    if (partnerCepEl) partnerCepEl.addEventListener("blur", (e) => fetchAddressByCep(e.target.value));
    const partnerActiveEl = document.getElementById("partnerActive");
    if (partnerActiveEl) partnerActiveEl.addEventListener("change", updatePartnerActiveText);
    if (document.getElementById("savePartner")) document.getElementById("savePartner").addEventListener("click", async () => {
      const name = document.getElementById("partnerName").value.trim();
      if (!name) {
        alert("Nome \xE9 obrigat\xF3rio.");
        return;
      }
      const partnerData = {
        name,
        type: document.getElementById("partnerType").value,
        document: document.getElementById("partnerDoc").value.trim() || null,
        docIsPix: document.getElementById("partnerDocIsPix").checked,
        phone: document.getElementById("partnerPhone").value.trim() || null,
        phoneIsPix: document.getElementById("partnerPhoneIsPix").checked,
        email: document.getElementById("partnerEmail").value.trim() || null,
        emailIsPix: document.getElementById("partnerEmailIsPix").checked,
        randomPix: document.getElementById("partnerRandomPix").value.trim() || null,
        randomPixIsPix: document.getElementById("partnerRandomPixIsPix").checked,
        cep: document.getElementById("partnerCep").value.trim() || null,
        street: document.getElementById("partnerStreet").value.trim() || null,
        number: document.getElementById("partnerNumber").value.trim() || null,
        neighborhood: document.getElementById("partnerNeighborhood").value.trim() || null,
        city: document.getElementById("partnerCity").value.trim() || null,
        state: document.getElementById("partnerState").value || null,
        observation: document.getElementById("partnerObservation").value.trim() || null,
        active: document.getElementById("partnerActive").checked,
        updatedAt: firebase.firestore.FieldValue ? firebase.firestore.FieldValue.serverTimestamp() : (/* @__PURE__ */ new Date()).toISOString()
      };
      try {
        if (!currentUser) return;
        if (editingPartnerId) {
          await userRef("partners").doc(editingPartnerId).update(partnerData);
          const index = g.partners.findIndex((p) => p.id === editingPartnerId);
          if (index !== -1) g.partners[index] = { id: editingPartnerId, ...partnerData };
        } else {
          partnerData.createdAt = (/* @__PURE__ */ new Date()).toISOString();
          const docRef = await userRef("partners").add(partnerData);
          g.partners.push({ id: docRef.id, ...partnerData });
        }
        renderPartners();
        document.getElementById("partnerModal").style.display = "none";
      } catch (error) {
        console.error("Erro ao salvar parceiro:", error);
        alert("Erro ao salvar.");
      }
    });
    if (document.getElementById("partnerSearchFilter")) document.getElementById("partnerSearchFilter").addEventListener("input", renderPartners);
    if (document.getElementById("partnerTypeFilter")) document.getElementById("partnerTypeFilter").addEventListener("change", renderPartners);
    if (document.getElementById("partnerStatusFilter")) document.getElementById("partnerStatusFilter").addEventListener("change", renderPartners);
    if (document.getElementById("clearPartnerFiltersBtn")) document.getElementById("clearPartnerFiltersBtn").addEventListener("click", () => {
      if (document.getElementById("partnerSearchFilter")) document.getElementById("partnerSearchFilter").value = "";
      if (document.getElementById("partnerTypeFilter")) document.getElementById("partnerTypeFilter").value = "all";
      if (document.getElementById("partnerStatusFilter")) document.getElementById("partnerStatusFilter").value = "all";
      renderPartners();
      showToast("Filtros restaurados", "success");
    });
  }
  var editingPartnerId;
  var init_partners = __esm({
    "js/partners.js"() {
      init_firebase_config();
      init_state();
      init_utils();
      init_factories();
      init_ui_helpers();
      init_accounts();
      editingPartnerId = null;
    }
  });

  // js/ofx-import.js
  function closeOfxModal() {
    importOfxModal.style.display = "none";
  }
  function handleOfxFile(file) {
    const nome = file.name.toLowerCase();
    const isOfx = nome.endsWith(".ofx");
    const isCsv = nome.endsWith(".csv");
    if (!isOfx && !isCsv) {
      showToast("Formato inv\xE1lido. Selecione um arquivo .OFX ou .CSV", "error");
      return;
    }
    ofxFileNameDisplay.textContent = `Arquivo carregado: ${file.name}`;
    ofxFileNameDisplay.style.display = "block";
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
    reader.readAsText(file, "UTF-8");
  }
  function parseCsvToOfx(csvText) {
    function parseCsvLine(linha) {
      const campos = [];
      let campo = "", emAspas = false;
      for (let i = 0; i < linha.length; i++) {
        const ch = linha[i];
        if (ch === '"') {
          if (emAspas && linha[i + 1] === '"') {
            campo += '"';
            i++;
          } else emAspas = !emAspas;
        } else if (ch === "," && !emAspas) {
          campos.push(campo.trim());
          campo = "";
        } else {
          campo += ch;
        }
      }
      campos.push(campo.trim());
      return campos;
    }
    function parseMoeda(str) {
      const limpo = str.replace(/R\$\s?/g, "").replace(/\./g, "").replace(",", ".").trim();
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
      return iso.replace(/-/g, "") + "120000";
    }
    const linhas = csvText.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (linhas.length < 2) {
      showToast("CSV vazio ou sem lan\xE7amentos.", "error");
      return null;
    }
    const header = parseCsvLine(linhas[0]).map(
      (h) => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
    );
    const find = (...termos) => header.findIndex((h) => termos.some((t) => h.includes(t)));
    const iData = find("data");
    const iDesc = find("descricao", "historico", "movimentacao", "lancamento", "memo", "obs");
    const iValor = find("valor", "quantia", "montante", "value", "amount");
    const iTipo = find("tipo", "type", "natureza");
    if (iData < 0 || iValor < 0) {
      showToast('CSV n\xE3o reconhecido: colunas obrigat\xF3rias "Data" e "Valor" n\xE3o encontradas.', "error");
      return null;
    }
    let blocos = "";
    let erros = 0;
    for (let i = 1; i < linhas.length; i++) {
      const cols = parseCsvLine(linhas[i]);
      if (cols.length <= Math.max(iData, iValor)) {
        erros++;
        continue;
      }
      const dataIso = parseData(cols[iData] || "");
      if (!dataIso) {
        erros++;
        continue;
      }
      let valor = parseMoeda(cols[iValor] || "");
      if (isNaN(valor)) {
        erros++;
        continue;
      }
      if (iTipo >= 0 && cols[iTipo]) {
        const tipo = cols[iTipo].toLowerCase().trim();
        if ((tipo.includes("deb") || tipo === "d") && valor > 0) valor = -valor;
        if ((tipo.includes("cred") || tipo === "c") && valor < 0) valor = Math.abs(valor);
      }
      const desc = iDesc >= 0 ? cols[iDesc] || "Lan\xE7amento CSV" : "Lan\xE7amento CSV";
      const fitid = `csv_${dataIso.replace(/-/g, "")}_${Math.abs(valor).toFixed(0)}_${i}`;
      blocos += `
<STMTTRN>
<TRNTYPE>${valor >= 0 ? "CREDIT" : "DEBIT"}
<DTPOSTED>${toOfxDate(dataIso)}
<TRNAMT>${valor.toFixed(2)}
<FITID>${fitid}
<MEMO>${desc}
</STMTTRN>`;
    }
    if (!blocos) {
      showToast("Nenhum lan\xE7amento v\xE1lido encontrado no CSV.", "error");
      return null;
    }
    if (erros > 0) showToast(`${erros} linha(s) ignorada(s) por formato inv\xE1lido.`, "warning");
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
        const formattedDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
        const fitid = fitidMatch ? fitidMatch[1].trim() : "manual_" + (crypto.randomUUID ? crypto.randomUUID().split("-").join("").substring(0, 9) : Date.now().toString(36) + Math.random().toString(36).substr(2, 5));
        let description = "Lan\xE7amento Importado";
        if (memoMatch && memoMatch[1].trim()) description = memoMatch[1].trim();
        else if (nameMatch && nameMatch[1].trim()) description = nameMatch[1].trim();
        description = description.replace(/^[0-9\-\/]+\s*/, "").trim();
        const jaExiste = g.transactions.some((t) => t.fitid === fitid);
        ofxParsedTransactions.push({
          id: "ofx_" + (crypto.randomUUID ? crypto.randomUUID().split("-").join("").substring(0, 9) : Date.now().toString(36) + Math.random().toString(36).substr(2, 5)),
          fitid,
          isDuplicate: jaExiste,
          type: amount >= 0 ? "income" : "expense",
          value: Math.abs(amount),
          date: formattedDate,
          description,
          category: "",
          partner: "",
          paymentType: "",
          selected: !jaExiste
        });
      }
    }
    const historicoMapeado = {};
    const transacoesAntigas = [...g.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    transacoesAntigas.forEach((t) => {
      if (t.description && (t.category || t.partnerId || t.paymentMethod)) {
        const descLimpa = t.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        if (descLimpa.length > 3) {
          historicoMapeado[descLimpa] = {
            category: t.category || "",
            partner: t.partnerId || "",
            paymentType: t.paymentMethod || ""
          };
        }
      }
    });
    ofxParsedTransactions.forEach((novoTx) => {
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
    const transacoesPendentes = [...g.transactions].filter((t) => !t.isPaid);
    ofxParsedTransactions.forEach((novoTx) => {
      if (novoTx.isDuplicate) return;
      const possivelMatch = transacoesPendentes.find((p) => {
        const mesmoTipo = p.type === novoTx.type;
        const mesmoValor = parseFloat(p.value).toFixed(2) === parseFloat(novoTx.value).toFixed(2);
        const dataPendente = new Date(p.date);
        const dataOfx = new Date(novoTx.date);
        const diffDias = Math.abs(dataOfx - dataPendente) / (1e3 * 60 * 60 * 24);
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
      showToast("N\xE3o encontramos lan\xE7amentos neste arquivo OFX.", "warning");
      ofxFileInput.value = "";
      ofxFileNameDisplay.style.display = "none";
    } else {
      showToast(`${ofxParsedTransactions.length} lan\xE7amentos encontrados!`, "success");
      let minDate = ofxParsedTransactions[0].date;
      let maxDate = ofxParsedTransactions[0].date;
      ofxParsedTransactions.forEach((t) => {
        if (t.date < minDate) minDate = t.date;
        if (t.date > maxDate) maxDate = t.date;
      });
      if (document.getElementById("ofxFilterDateStart")) document.getElementById("ofxFilterDateStart").value = minDate;
      if (document.getElementById("ofxFilterDateEnd")) document.getElementById("ofxFilterDateEnd").value = maxDate;
    }
  }
  function goToOfxStep(step) {
    setOfxCurrentStep(step);
    document.querySelectorAll("#ofxStepIndicator .step").forEach((s, idx) => s.classList.toggle("active", idx + 1 <= step));
    document.querySelectorAll("#importOfxModal .step-content").forEach((c) => c.classList.remove("active"));
    document.getElementById(`ofxStep${step}`).classList.add("active");
    ofxPrevBtn.disabled = step === 1;
    if (step === 1) {
      ofxNextBtn.style.display = "inline-block";
      ofxImportBtn.style.display = "none";
    } else if (step === 2) {
      ofxNextBtn.style.display = "none";
      ofxImportBtn.style.display = "inline-block";
      renderOfxReviewList();
    }
  }
  function txPassaNoFiltro(t, startDate, endDate) {
    if (ofxCurrentFilter !== "all" && t.type !== ofxCurrentFilter) return false;
    if (ofxCurrentStatusFilter === "new" && t.isDuplicate) return false;
    if (ofxCurrentStatusFilter === "imported" && !t.isDuplicate) return false;
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    return true;
  }
  function renderOfxReviewList() {
    let partnerOptionsHtml = '<option value="">Sem parceiro</option>';
    g.partners.filter((p) => p.active !== false).sort((a, b) => a.name.localeCompare(b.name)).forEach((p) => {
      partnerOptionsHtml += `<option value="${p.id}">${p.name}</option>`;
    });
    let paymentOptionsHtml = '<option value="">Forma de pagamento</option>';
    g.paymentTypes.filter((pt) => pt.active !== false).sort((a, b) => a.description.localeCompare(b.description)).forEach((pt) => {
      paymentOptionsHtml += `<option value="${pt.id}">${pt.description}</option>`;
    });
    let html = "";
    const startDate = document.getElementById("ofxFilterDateStart") ? document.getElementById("ofxFilterDateStart").value : "";
    const endDate = document.getElementById("ofxFilterDateEnd") ? document.getElementById("ofxFilterDateEnd").value : "";
    const filteredOfxTxs = ofxParsedTransactions.filter((t) => txPassaNoFiltro(t, startDate, endDate));
    filteredOfxTxs.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((t, i) => {
      const isIncome = t.type === "income";
      const sign = isIncome ? "+" : "-";
      const valClass = isIncome ? "receipt-val-income" : "receipt-item-desc";
      const opacity = t.isDuplicate ? "0.5" : "1";
      const pointerEvents = t.isDuplicate ? "none" : "auto";
      const checkElement = t.isDuplicate ? `<span class="material-icons" style="color: #d93025; font-size: 1.2rem; flex-shrink: 0;" title="Lan\xE7amento j\xE1 importado anteriormente">warning</span>` : `<input type="checkbox" class="ofx-check" data-id="${t.id}" ${t.selected ? "checked" : ""} style="width: 18px; height: 18px; accent-color: #1a73e8; cursor: pointer; flex-shrink: 0;">`;
      const isDark = document.body.classList.contains("dark-mode");
      let badgeConciliacao = "";
      if (t.reconcileWith) {
        badgeConciliacao = `<div onclick="window.abrirModalConciliacaoOfx('${escapeJsAttr(t.id)}')" style="background: ${isDark ? "rgba(138,180,248,0.15)" : "rgba(26,115,232,0.1)"}; color: ${isDark ? "#8ab4f8" : "#1a73e8"}; font-size: 0.75rem; font-weight: 600; padding: 4px 10px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px; margin-top: 6px; border: 1px solid ${isDark ? "rgba(138,180,248,0.3)" : "rgba(26,115,232,0.3)"}; cursor: pointer; transition: background 0.2s;" title="Clique para trocar"><span class="material-icons" style="font-size: 1rem;">link</span> Conciliar com: ${escapeHtml(t.reconcileName)} <span class="material-icons" style="font-size: 0.85rem; margin-left: 2px;">edit</span></div>`;
      } else {
        badgeConciliacao = `<div onclick="window.abrirModalConciliacaoOfx('${escapeJsAttr(t.id)}')" style="background: transparent; color: ${isDark ? "#9aa0a6" : "#5f6368"}; font-size: 0.7rem; font-weight: 500; padding: 4px 10px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px; margin-top: 6px; border: 1px dashed ${isDark ? "var(--cor-borda-dark)" : "#dadce0"}; cursor: pointer; transition: background 0.2s;" title="Clique para vincular a uma conta agendada"><span class="material-icons" style="font-size: 0.9rem;">add_circle_outline</span> Importar como novo (Mudar)</div>`;
      }
      let catOptionsHtml = '<option value="">Sem categoria</option>';
      g.categories.filter((c) => c.active !== false && c.type === t.type).sort((a, b) => a.name.localeCompare(b.name)).forEach((c) => {
        catOptionsHtml += `<option value="${c.id}">${c.name}</option>`;
      });
      html += `
            <div class="ofx-tx-item" style="opacity: ${opacity}; pointer-events: ${pointerEvents};">
                <div style="display: flex; align-items: center; gap: 12px; flex: 2; overflow: hidden;">
                    ${checkElement}
                    <div style="overflow: hidden; padding-right: 8px;">
                        <div class="receipt-item-desc" title="${t.description}" style="font-weight: 500; font-size: 0.9rem; line-height: 1.3; margin-bottom: 2px; white-space: normal; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${t.description}</div>
                        <div style="font-size: 0.8rem; color: #5f6368;">${formatDate(t.date)} ${t.isDuplicate ? '<span style="color: #d93025; font-weight: 600; margin-left: 6px;">(J\xE1 importado)</span>' : ""}</div>
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
    document.querySelectorAll(".ofx-check").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const tx = ofxParsedTransactions.find((x) => x.id === e.target.dataset.id);
        if (tx) tx.selected = e.target.checked;
        updateOfxSummary();
      });
    });
    const atualizarVisualDoSelect = (selectElement) => {
      if (selectElement.value !== "") {
        selectElement.classList.add("ofx-select-filled");
      } else {
        selectElement.classList.remove("ofx-select-filled");
      }
    };
    document.querySelectorAll(".ofx-cat-select").forEach((sel) => {
      const tx = ofxParsedTransactions.find((x) => x.id === sel.dataset.id);
      if (tx && tx.category) sel.value = tx.category;
      atualizarVisualDoSelect(sel);
      sel.addEventListener("change", (e) => {
        const tx2 = ofxParsedTransactions.find((x) => x.id === e.target.dataset.id);
        if (tx2) tx2.category = e.target.value;
        atualizarVisualDoSelect(e.target);
      });
    });
    document.querySelectorAll(".ofx-partner-select").forEach((sel) => {
      const tx = ofxParsedTransactions.find((x) => x.id === sel.dataset.id);
      if (tx && tx.partner) sel.value = tx.partner;
      atualizarVisualDoSelect(sel);
      sel.addEventListener("change", (e) => {
        const tx2 = ofxParsedTransactions.find((x) => x.id === e.target.dataset.id);
        if (tx2) tx2.partner = e.target.value;
        atualizarVisualDoSelect(e.target);
      });
    });
    document.querySelectorAll(".ofx-payment-select").forEach((sel) => {
      const tx = ofxParsedTransactions.find((x) => x.id === sel.dataset.id);
      if (tx && tx.paymentType) sel.value = tx.paymentType;
      atualizarVisualDoSelect(sel);
      sel.addEventListener("change", (e) => {
        const tx2 = ofxParsedTransactions.find((x) => x.id === e.target.dataset.id);
        if (tx2) tx2.paymentType = e.target.value;
        atualizarVisualDoSelect(e.target);
      });
    });
    updateOfxSummary();
  }
  function updateOfxSummary() {
    const countTotal = ofxParsedTransactions.filter((t) => t.selected).length;
    ofxSummaryTotal.textContent = `Lan\xE7amentos prontos para importar: ${countTotal}`;
    ofxImportBtn.disabled = countTotal === 0;
    const topCountEl = document.getElementById("ofxTopSelectionCount");
    if (topCountEl) {
      if (countTotal > 0) {
        topCountEl.textContent = `${countTotal} selecionado(s)`;
        topCountEl.style.display = "block";
      } else {
        topCountEl.style.display = "none";
      }
    }
    const startDate = document.getElementById("ofxFilterDateStart") ? document.getElementById("ofxFilterDateStart").value : "";
    const endDate = document.getElementById("ofxFilterDateEnd") ? document.getElementById("ofxFilterDateEnd").value : "";
    const visibleTxs = ofxParsedTransactions.filter((t) => txPassaNoFiltro(t, startDate, endDate));
    const selectedVisible = visibleTxs.filter((t) => t.selected).length;
    const visibleAndSelectable = visibleTxs.filter((t) => !t.isDuplicate);
    if (visibleAndSelectable.length > 0 && selectedVisible === visibleAndSelectable.length) {
      ofxSelectAll.checked = true;
    } else {
      ofxSelectAll.checked = false;
    }
  }
  function initOfxImport() {
    if (openImportOfxBtn) {
      openImportOfxBtn.addEventListener("click", async () => {
        await Promise.all([loadAccounts(), fetchCategories()]);
        ofxAccountSelect.innerHTML = '<option value="" disabled selected>Selecione a conta...</option>';
        g.accounts.filter((a) => a.active !== false).forEach((acc) => {
          const opt = document.createElement("option");
          opt.value = acc.id;
          opt.textContent = `${acc.name} (Saldo: ${formatCurrency(acc.balance)})`;
          ofxAccountSelect.appendChild(opt);
        });
        ofxParsedTransactions.length = 0;
        ofxFileInput.value = "";
        ofxFileNameDisplay.style.display = "none";
        setOfxCurrentFilter("all");
        setOfxCurrentStatusFilter("all");
        document.querySelectorAll("#ofxTypeFilter button").forEach((b) => {
          b.classList.remove("active");
          if (b.dataset.type === "all") b.classList.add("active");
        });
        document.querySelectorAll("#ofxStatusFilter button").forEach((b) => {
          b.classList.remove("active");
          if (b.dataset.status === "all") b.classList.add("active");
        });
        if (document.getElementById("ofxFilterDateStart")) document.getElementById("ofxFilterDateStart").value = "";
        if (document.getElementById("ofxFilterDateEnd")) document.getElementById("ofxFilterDateEnd").value = "";
        goToOfxStep(1);
        importOfxModal.style.display = "flex";
      });
    }
    if (closeImportOfxBtn) closeImportOfxBtn.addEventListener("click", closeOfxModal);
    importOfxModal.addEventListener("click", (e) => {
      if (e.target === importOfxModal) closeOfxModal();
    });
    ofxDropZone.addEventListener("click", () => ofxFileInput.click());
    ofxDropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      ofxDropZone.classList.add("dragover");
    });
    ofxDropZone.addEventListener("dragleave", () => {
      ofxDropZone.classList.remove("dragover");
    });
    ofxDropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      ofxDropZone.classList.remove("dragover");
      if (e.dataTransfer.files.length > 0) {
        ofxFileInput.files = e.dataTransfer.files;
        handleOfxFile(e.dataTransfer.files[0]);
      }
    });
    ofxFileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) handleOfxFile(e.target.files[0]);
    });
    ofxAccountSelect.addEventListener("change", checkOfxStep1Ready);
    ofxNextBtn.addEventListener("click", () => goToOfxStep(2));
    ofxPrevBtn.addEventListener("click", () => goToOfxStep(1));
    document.querySelectorAll("#ofxTypeFilter button").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll("#ofxTypeFilter button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        setOfxCurrentFilter(btn.dataset.type);
        ofxParsedTransactions.forEach((t) => t.selected = false);
        const selectAllCheckbox = document.getElementById("ofxSelectAll");
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        renderOfxReviewList();
      });
    });
    document.querySelectorAll("#ofxStatusFilter button").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll("#ofxStatusFilter button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        setOfxCurrentStatusFilter(btn.dataset.status);
        ofxParsedTransactions.forEach((t) => t.selected = false);
        const selectAllCheckbox = document.getElementById("ofxSelectAll");
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        renderOfxReviewList();
      });
    });
    document.getElementById("ofxFilterDateStart")?.addEventListener("change", renderOfxReviewList);
    document.getElementById("ofxFilterDateEnd")?.addEventListener("change", renderOfxReviewList);
    ofxSelectAll.addEventListener("change", (e) => {
      const isChecked = e.target.checked;
      const startDate = document.getElementById("ofxFilterDateStart") ? document.getElementById("ofxFilterDateStart").value : "";
      const endDate = document.getElementById("ofxFilterDateEnd") ? document.getElementById("ofxFilterDateEnd").value : "";
      ofxParsedTransactions.forEach((t) => {
        if (txPassaNoFiltro(t, startDate, endDate)) {
          if (!t.isDuplicate) {
            t.selected = isChecked;
          }
        }
      });
      renderOfxReviewList();
    });
    window.abrirModalConciliacaoOfx = function(ofxId) {
      const tx = ofxParsedTransactions.find((t) => t.id === ofxId);
      setOfxItemSendoConciliado(tx);
      if (!tx) return;
      const modal = document.getElementById("ofxReconcileModal");
      const listaEl = document.getElementById("ofxReconcileList");
      const isDark = document.body.classList.contains("dark-mode");
      const ofxDateObj = /* @__PURE__ */ new Date(tx.date + "T12:00:00");
      ofxDateObj.setDate(ofxDateObj.getDate() + 15);
      const dataLimiteSegura = formatDateISO(ofxDateObj);
      const pendentes = g.transactions.filter(
        (t) => !t.isPaid && t.type === tx.type && t.date <= dataLimiteSegura
      );
      pendentes.sort((a, b) => new Date(a.date) - new Date(b.date));
      let html = `
            <div onclick="window.escolherConciliacaoOfx('', '', 0)" style="padding: 12px; border: 1px solid ${isDark ? "var(--cor-borda-dark)" : "#dadce0"}; border-radius: 12px; margin-bottom: 12px; cursor: pointer; display: flex; align-items: center; gap: 12px; background: ${isDark ? "var(--cor-superficie-dark)" : "#f8f9fa"}; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                <span class="material-icons" style="color: ${isDark ? "#9aa0a6" : "#5f6368"};">add_circle_outline</span>
                <span style="font-weight: 600; color: ${isDark ? "#e0e0e0" : "#202124"};">N\xE3o conciliar (Importar como NOVO)</span>
            </div>
            <div style="font-size: 0.8rem; font-weight: bold; color: #9aa0a6; text-transform: uppercase; margin-bottom: 8px;">Lan\xE7amentos Pendentes (${pendentes.length}):</div>
        `;
      if (pendentes.length === 0) {
        html += `<div style="text-align: center; color: #9aa0a6; padding: 12px;">Nenhuma conta pendente encontrada para este tipo.</div>`;
      } else {
        pendentes.forEach((p) => {
          const diffVal = Math.abs(parseFloat(p.value) - parseFloat(tx.value));
          const isPerfectMatch = diffVal < 0.05;
          const badgeMatch = isPerfectMatch ? `<span style="background: #e6f4ea; color: #188038; font-size: 0.65rem; padding: 2px 6px; border-radius: 8px; font-weight: bold; border: 1px solid #ceead6; margin-left: 6px;">VALOR EXATO</span>` : "";
          html += `
                    <div onclick="window.escolherConciliacaoOfx('${escapeJsAttr(p.id)}', '${escapeJsAttr(p.description)}', ${p.value})" style="padding: 12px; border: 1px solid ${isDark ? "#444746" : "#e8eaed"}; border-radius: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s;" onmouseover="this.style.background='${isDark ? "var(--cor-superficie-dark)" : "#f1f3f4"}'" onmouseout="this.style.background='transparent'">
                        <div style="overflow: hidden; padding-right: 8px;">
                            <div style="font-weight: 600; font-size: 0.9rem; color: ${isDark ? "#e0e0e0" : "#202124"}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.description} ${badgeMatch}</div>
                            <div style="font-size: 0.8rem; color: #5f6368;">Vence: ${formatDate(p.date)}</div>
                        </div>
                        <div style="font-weight: bold; font-size: 1rem; color: ${p.type === "income" ? isDark ? "#81c995" : "#188038" : isDark ? "#ff8a80" : "#d93025"};">
                            ${formatCurrency(p.value)}
                        </div>
                    </div>
                `;
        });
      }
      listaEl.innerHTML = html;
      modal.style.display = "flex";
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
                            Foi identificada uma diferen\xE7a entre o valor registrado no sistema e o retornado pelo extrato banc\xE1rio.
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
                                Diferen\xE7a de ${valDiffStr}
                            </div>
                        </div>

                        <div class="divergence-recommendation">
                            <span class="material-icons">check_circle</span>
                            <div>
                                <strong>Recomenda\xE7\xE3o do sistema</strong>
                                Utilizar o valor do extrato. O saldo deste lan\xE7amento ser\xE1 atualizado de <strong style="display: inline; margin: 0;">${valPendenteStr}</strong> para <strong style="display: inline; margin: 0;">${valExtratoStr}</strong>.
                            </div>
                        </div>
                    `;
            assumirValorDoExtrato = await askConfirmation("Valor Divergente Identificado", msg, "Usar Valor do Banco", false, "warning_amber");
          }
          ofxItemSendoConciliado.reconcileWith = pendenteId;
          ofxItemSendoConciliado.reconcileName = pendenteName;
          ofxItemSendoConciliado.updateValueToOfx = assumirValorDoExtrato;
          ofxItemSendoConciliado.originalPendingValue = parseFloat(pendenteValue);
          const pOrig = g.transactions.find((t) => t.id === pendenteId);
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
        document.getElementById("ofxReconcileModal").style.display = "none";
        renderOfxReviewList();
      }
    };
    document.getElementById("closeOfxReconcileBtn")?.addEventListener("click", () => {
      document.getElementById("ofxReconcileModal").style.display = "none";
    });
    document.getElementById("ofxReconcileModal")?.addEventListener("click", (e) => {
      if (e.target === document.getElementById("ofxReconcileModal")) document.getElementById("ofxReconcileModal").style.display = "none";
    });
    ofxImportBtn.addEventListener("click", async () => {
      const txsToImport = ofxParsedTransactions.filter((t) => t.selected);
      if (txsToImport.length === 0) return;
      const accountId = ofxAccountSelect.value;
      const account = g.accounts.find((a) => a.id === accountId);
      let transCount = 0;
      let transSum = 0;
      let transValuesList = [];
      const transferKeywords = /(pix|ted|doc|transf|tef|tev|envio)/i;
      const nomeUsuarioMestre = (window.currentUserName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const termosNomeUsuario = nomeUsuarioMestre.split(" ").filter((palavra) => palavra.length > 2);
      txsToImport.forEach((t) => {
        const descBancoNormalizada = t.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (transferKeywords.test(descBancoNormalizada)) {
          const contemProprioNome = termosNomeUsuario.some((termo) => descBancoNormalizada.includes(termo));
          if (contemProprioNome) {
            transCount++;
            transSum += t.value;
            transValuesList.push(formatCurrency(t.value));
          }
        }
      });
      if (transCount > 0) {
        let valoresExibidos = transValuesList.slice(0, 5).join(" | ");
        if (transValuesList.length > 5) {
          valoresExibidos += " | ...";
        }
        const mensagemAviso = `
                <div class="modal-alert-box" style="text-align: left; background: #fafafa; padding: 16px; border-radius: 12px; border: 1px solid #eaeaea; margin-bottom: 16px;">
                    <p style="margin: 0 0 16px 0; color: #5f6368; font-size: 0.95rem;">Encontramos <strong>${transCount} poss\xEDveis transfer\xEAncias</strong> entre contas pr\xF3prias, nos valores <span style="font-size: 0.85rem; opacity: 0.85;">(${valoresExibidos})</span>.</p>

                    <div style="margin-bottom: 16px;">
                        <p style="margin: 0 0 4px 0; color: #5f6368; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Impacto estimado no saldo</p>
                        <p class="impact-value" style="margin: 0; color: #202124; font-size: 1.6rem; font-weight: 700; letter-spacing: -0.5px;">${formatCurrency(transSum)}</p>
                    </div>

                    <p style="margin: 0; color: #5f6368; font-size: 0.85rem; line-height: 1.5;">Essas movimenta\xE7\xF5es podem ser interpretadas como Receitas ou Despesas e alterar o saldo calculado.</p>
                </div>

                <div class="modal-tip-box" style="text-align: left; background: #e8f0fe; padding: 16px; border-radius: 12px; border: 1px solid #d2e3fc;">
                    <p style="margin: 0 0 8px 0; color: #1a73e8; font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; gap: 6px;"><span style="font-size: 1.1rem;">&#x1f4a1;</span> Recomenda\xE7\xE3o</p>
                    <p style="margin: 0 0 8px 0; color: #1a73e8; font-size: 0.85rem; line-height: 1.4;">Desmarque essas opera\xE7\xF5es agora e registre-as depois em:</p>
                    <div class="modal-path-box" style="background: rgba(255,255,255,0.6); padding: 8px 12px; border-radius: 8px; font-size: 0.85rem; color: #1a73e8; font-weight: 500; font-family: monospace;">
                        Lan\xE7amentos &rarr; Novo Lan\xE7amento &rarr; Transfer\xEAncia
                    </div>
                </div>
            `;
        const isConfirmed = await askConfirmation(
          "Transfer\xEAncias Detectadas",
          mensagemAviso,
          "Continuar Importa\xE7\xE3o",
          false,
          "warning_amber",
          "hideOfxTransferWarning"
        );
        if (!isConfirmed) return;
      }
      const originalText = ofxImportBtn.innerHTML;
      ofxImportBtn.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">autorenew</span> Importando...';
      ofxImportBtn.disabled = true;
      const batch = db.batch();
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const now = /* @__PURE__ */ new Date();
      const hoje = getTodayISO();
      let totalIncome = 0;
      let totalExpense = 0;
      txsToImport.forEach((t) => {
        let pNameForDb = null;
        if (t.partner) {
          const pObj = g.partners.find((p) => p.id === t.partner);
          if (pObj) pNameForDb = pObj.name;
        }
        if (t.reconcileWith) {
          const txRef = userRef("transactions").doc(t.reconcileWith);
          const updateData = {
            isPaid: true,
            paymentDate: t.date,
            fitid: t.fitid || null,
            updatedAt: nowIso,
            category: t.category || "",
            partnerId: t.partner || null,
            partnerName: pNameForDb,
            paymentMethod: t.paymentType || ""
          };
          let valorFinalDaConciliacao = t.value;
          if (t.updateValueToOfx === true) {
            updateData.value = t.value;
          } else if (t.updateValueToOfx === false && t.originalPendingValue) {
            valorFinalDaConciliacao = t.originalPendingValue;
          }
          batch.update(txRef, updateData);
          const idx = g.transactions.findIndex((x) => x.id === t.reconcileWith);
          if (idx !== -1) {
            g.transactions[idx] = { ...g.transactions[idx], ...updateData };
          }
          if (t.type === "income") totalIncome += valorFinalDaConciliacao;
          else totalExpense += valorFinalDaConciliacao;
        } else {
          const txRef = userRef("transactions").doc();
          const newTx = {
            type: t.type,
            value: t.value,
            description: t.description,
            category: t.category || "",
            date: t.date,
            isPaid: true,
            paymentDate: t.date,
            accountId,
            accountName: account ? account.name : "Conta",
            paymentMethod: t.paymentType || "",
            partnerId: t.partner || null,
            partnerName: pNameForDb,
            fitid: t.fitid || null,
            createdAt: nowIso,
            updatedAt: nowIso
          };
          batch.set(txRef, newTx);
          g.transactions.push({ id: txRef.id, ...sanitizeFirestoreData(newTx) });
          if (t.type === "income") totalIncome += t.value;
          else totalExpense += t.value;
        }
      });
      const netChange = totalIncome - totalExpense;
      if (netChange !== 0) {
        const accRef = userRef("accounts").doc(accountId);
        batch.update(accRef, { balance: firebase.firestore.FieldValue.increment(netChange) });
        if (account) account.balance += netChange;
      }
      try {
        await batch.commit();
        showToast(`${txsToImport.length} lan\xE7amentos importados com sucesso!`, "success");
        renderTransactions();
        renderAccounts();
        renderDashboard();
        closeOfxModal();
      } catch (err) {
        console.error("Erro na importa\xE7\xE3o:", err);
        showToast("Erro de conex\xE3o ao importar. Tente novamente.", "error");
      } finally {
        ofxImportBtn.innerHTML = originalText;
        ofxImportBtn.disabled = false;
      }
    });
  }
  var importOfxModal, openImportOfxBtn, closeImportOfxBtn, ofxAccountSelect, ofxDropZone, ofxFileInput, ofxFileNameDisplay, ofxPrevBtn, ofxNextBtn, ofxImportBtn, ofxReviewList, ofxSelectAll, ofxSummaryTotal;
  var init_ofx_import = __esm({
    "js/ofx-import.js"() {
      init_firebase_config();
      init_state();
      init_utils();
      init_ui_helpers();
      init_settings();
      init_transactions();
      init_dashboard();
      importOfxModal = document.getElementById("importOfxModal");
      openImportOfxBtn = document.getElementById("openImportOfxBtn");
      closeImportOfxBtn = document.getElementById("closeImportOfxBtn");
      ofxAccountSelect = document.getElementById("ofxAccountSelect");
      ofxDropZone = document.getElementById("ofxDropZone");
      ofxFileInput = document.getElementById("ofxFileInput");
      ofxFileNameDisplay = document.getElementById("ofxFileNameDisplay");
      ofxPrevBtn = document.getElementById("ofxPrevBtn");
      ofxNextBtn = document.getElementById("ofxNextBtn");
      ofxImportBtn = document.getElementById("ofxImportBtn");
      ofxReviewList = document.getElementById("ofxReviewList");
      ofxSelectAll = document.getElementById("ofxSelectAll");
      ofxSummaryTotal = document.getElementById("ofxSummaryTotal");
    }
  });

  // js/auth.js
  function resetIdleTimer() {
    if (!currentUser) return;
    if (isIdleTimerRunning) return;
    isIdleTimerRunning = true;
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
      sessionStorage.setItem("logoutReason", "idle");
      auth.signOut();
    }, IDLE_TIME_LIMIT);
    setTimeout(() => {
      isIdleTimerRunning = false;
    }, 2e3);
  }
  function showAuthError(message) {
    authError.textContent = message;
  }
  function traduzirErroFirebase(erro) {
    switch (erro.code) {
      case "auth/email-already-in-use":
        return '\u274C Este e-mail j\xE1 est\xE1 cadastrado. Clique em "J\xE1 tenho uma conta" para entrar.';
      case "auth/invalid-email":
        return "\u26A0\uFE0F O formato do e-mail \xE9 inv\xE1lido. Verifique se digitou corretamente.";
      case "auth/weak-password":
        return "\u26A0\uFE0F A senha \xE9 muito fraca. Escolha uma senha mais longa e segura.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
      case "auth/invalid-login-credentials":
        return "\u274C E-mail ou senha incorretos. Verifique os dados digitados.";
      case "auth/too-many-requests":
        return "\u26A0\uFE0F Acesso temporariamente bloqueado por muitas tentativas. Tente mais tarde.";
      case "auth/network-request-failed":
        return "\u26A0\uFE0F Sem conex\xE3o com a internet. Verifique sua rede e tente novamente.";
      default:
        return "\u274C Ocorreu um erro inesperado. Tente novamente mais tarde.";
    }
  }
  function togglePasswordVisibility(inputId, btnEl) {
    const input = document.getElementById(inputId);
    const icon = btnEl.querySelector("span");
    if (input.type === "password") {
      input.type = "text";
      icon.textContent = "visibility";
    } else {
      input.type = "password";
      icon.textContent = "visibility_off";
    }
  }
  function showDailyBriefing() {
    if (sessionStorage.getItem("briefingShown") === "true") return;
    const nomeUsuario = window.currentUserName ? window.currentUserName.split(" ")[0] : "Usu\xE1rio";
    document.getElementById("briefingName").textContent = nomeUsuario;
    const hojeLocal = getTodayISO();
    const daqui7DiasDate = /* @__PURE__ */ new Date();
    daqui7DiasDate.setDate(daqui7DiasDate.getDate() + 7);
    const daqui7DiasLocal = formatDateISO(daqui7DiasDate);
    const pendentes = g.transactions.filter((t) => !t.isPaid && t.type !== "transfer");
    const vencidos = [];
    const vencemHoje = [];
    const proximos = [];
    pendentes.forEach((t) => {
      if (t.date < hojeLocal) vencidos.push(t);
      else if (t.date === hojeLocal) vencemHoje.push(t);
      else if (t.date <= daqui7DiasLocal) proximos.push(t);
    });
    if (vencidos.length === 0 && vencemHoje.length === 0 && proximos.length === 0) {
      sessionStorage.setItem("briefingShown", "true");
      return;
    }
    vencidos.sort((a, b) => new Date(a.date) - new Date(b.date));
    vencemHoje.sort((a, b) => new Date(a.date) - new Date(b.date));
    proximos.sort((a, b) => new Date(a.date) - new Date(b.date));
    const isDark = document.body.classList.contains("dark-mode");
    let html = "";
    function renderBriefingBlock(lista, titulo, icone, cfg) {
      if (lista.length === 0) return "";
      const bg = isDark ? cfg.bgDark : cfg.bg;
      const iconCol = isDark ? cfg.colDark : cfg.col;
      const rowHover = isDark ? "#2a2b2e" : "#f8fafc";
      const border = isDark ? "#2a2b2e" : "#f1f3f4";
      const titleCol = isDark ? "#e8e8f0" : "#1a1b1e";
      const subCol = isDark ? "#6a7a8a" : "#64748b";
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
      lista.forEach((t) => {
        const isIncome = t.type === "income";
        const typeLabel = isIncome ? "A Receber" : "A Pagar";
        const valColor = isIncome ? isDark ? "#5DCAA5" : "#0F6E56" : isDark ? "#ff8a80" : "#A32D2D";
        const valPrefix = isIncome ? "+" : "-";
        blockHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 9px 10px; border-radius: 8px; cursor: pointer; transition: background 0.15s;"
                     onmouseover="this.style.background='${rowHover}'"
                     onmouseout="this.style.background='transparent'"
                     onclick="document.getElementById('briefingModal').style.display='none'; setActiveView('transactions'); setTimeout(()=>openEditTransactionModal('${escapeJsAttr(t.id)}'), 300)">
                    <div style="overflow: hidden; padding-right: 12px; flex: 1;">
                        <div style="color: ${titleCol}; font-weight: 500; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.description || "Sem descri\xE7\xE3o"}</div>
                        <div style="color: ${subCol}; font-size: 11px; margin-top: 1px;">${typeLabel} \xB7 ${formatDate(t.date)}</div>
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
    html += renderBriefingBlock(vencidos, "Vencidos", "error_outline", { bg: "#FCEBEB", col: "#A32D2D", bgDark: "rgba(226,75,74,0.12)", colDark: "#ff8a80" });
    html += renderBriefingBlock(vencemHoje, "Vencem hoje", "schedule", { bg: "#FAEEDA", col: "#854F0B", bgDark: "rgba(186,117,23,0.12)", colDark: "#FAC775" });
    html += renderBriefingBlock(proximos, "Pr\xF3ximos 7 dias", "event", { bg: "#E6F1FB", col: "#185FA5", bgDark: "rgba(24,95,165,0.12)", colDark: "#8ab4f8" });
    document.getElementById("briefingContent").innerHTML = html;
    document.getElementById("briefingModal").style.display = "flex";
    sessionStorage.setItem("briefingShown", "true");
  }
  var idleTimeout, isIdleTimerRunning, TEMPO_LIMITE_MINUTOS, IDLE_TIME_LIMIT, authOverlay, appLayout, loginEmail, loginPassword, loginBtn, logoutLink, authError, loginForm, registerForm, authTitle, authSubtitle;
  var init_auth = __esm({
    "js/auth.js"() {
      init_firebase_config();
      init_state();
      init_utils();
      init_ui_helpers();
      init_theme();
      init_notifications();
      init_settings();
      init_transactions();
      init_dashboard();
      isIdleTimerRunning = false;
      TEMPO_LIMITE_MINUTOS = LIMITES.IDLE_TIMEOUT_MIN;
      IDLE_TIME_LIMIT = TEMPO_LIMITE_MINUTOS * 60 * 1e3;
      authOverlay = document.getElementById("authOverlay");
      appLayout = document.getElementById("appLayout");
      loginEmail = document.getElementById("loginEmail");
      loginPassword = document.getElementById("loginPassword");
      loginBtn = document.getElementById("loginBtn");
      logoutLink = document.getElementById("logoutLink");
      authError = document.getElementById("authError");
      loginForm = document.getElementById("loginForm");
      registerForm = document.getElementById("registerForm");
      authTitle = document.getElementById("authTitle");
      authSubtitle = document.getElementById("authSubtitle");
      ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach((event) => {
        document.addEventListener(event, resetIdleTimer, { passive: true });
      });
      if (document.getElementById("showRegisterBtn")) document.getElementById("showRegisterBtn").addEventListener("click", () => {
        loginForm.style.display = "none";
        registerForm.style.display = "block";
        authTitle.textContent = "Crie sua conta";
        authSubtitle.textContent = "Comece a organizar sua vida financeira";
        authError.textContent = "";
      });
      if (document.getElementById("showLoginBtn")) document.getElementById("showLoginBtn").addEventListener("click", () => {
        registerForm.style.display = "none";
        loginForm.style.display = "block";
        authTitle.textContent = "Bem-vindo de volta!";
        authSubtitle.textContent = "Acesse sua gest\xE3o financeira";
        document.getElementById("regError").textContent = "";
      });
      auth.getRedirectResult().then((result) => {
        if (result && result.user) {
        }
      }).catch((err) => {
        if (authError) {
          if (err.code === "auth/unauthorized-domain") {
            authError.textContent = "\u26A0\uFE0F Dom\xEDnio n\xE3o autorizado no Firebase Console.";
          } else if (err.code !== "auth/no-auth-event") {
            authError.textContent = "Erro ao entrar com Google. Tente novamente.";
          }
        }
      });
      document.getElementById("loginGoogleBtn")?.addEventListener("click", () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        authError.textContent = "";
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).then(() => auth.signInWithRedirect(provider)).catch((err) => {
          console.error("Google login error:", err);
          authError.textContent = "Erro ao iniciar login com Google. Tente novamente.";
        });
      });
      loginBtn.addEventListener("click", () => {
        const email = loginEmail.value.trim();
        const password = loginPassword.value.trim();
        if (!email || !password) {
          authError.textContent = "\u26A0\uFE0F Digite e-mail e senha.";
          return;
        }
        auth.signInWithEmailAndPassword(email, password).catch((error) => {
          authError.textContent = traduzirErroFirebase(error);
        });
      });
      if (document.getElementById("doRegisterBtn")) document.getElementById("doRegisterBtn").addEventListener("click", async () => {
        const name = document.getElementById("regName").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const pass = document.getElementById("regPassword").value.trim();
        const confirmPass = document.getElementById("regConfirmPassword").value.trim();
        const errorEl = document.getElementById("regError");
        if (!name || !email || !pass || !confirmPass) {
          errorEl.textContent = "\u26A0\uFE0F Preencha todos os campos.";
          return;
        }
        if (pass !== confirmPass) {
          errorEl.textContent = "\u274C As senhas n\xE3o s\xE3o iguais.";
          return;
        }
        if (pass.length < 6) {
          errorEl.textContent = "\u26A0\uFE0F A senha deve ter pelo menos 6 caracteres.";
          return;
        }
        try {
          const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
          const user = userCredential.user;
          await db.collection("users").doc(user.uid).set({
            name,
            email,
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          });
          const defaultPaymentTypes = [
            { description: "Dinheiro", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true },
            { description: "D\xE9bito", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true },
            { description: "Cr\xE9dito", allowsInstallments: true, maxInstallments: 24, isSystem: true, active: true },
            { description: "Pix", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true },
            { description: "Boleto", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true },
            { description: "Transfer\xEAncia", allowsInstallments: false, maxInstallments: 1, isSystem: true, active: true }
          ];
          const batch = db.batch();
          let dinheiroId = null;
          defaultPaymentTypes.forEach((pt) => {
            const newDocRef = db.collection("users").doc(user.uid).collection("paymentTypes").doc();
            pt.createdAt = (/* @__PURE__ */ new Date()).toISOString();
            batch.set(newDocRef, pt);
            if (pt.description === "Dinheiro") dinheiroId = newDocRef.id;
          });
          const defaultAccountRef = db.collection("users").doc(user.uid).collection("accounts").doc();
          batch.set(defaultAccountRef, {
            name: "Carteira",
            bankIspb: "Outros",
            bankName: "",
            type: "Carteira",
            balance: 0,
            observation: "Dinheiro em esp\xE9cie (F\xEDsico)",
            showOnDashboard: true,
            includeInKPI: true,
            hasCreditCard: false,
            active: true,
            isSystem: true,
            acceptedPaymentTypes: dinheiroId ? [dinheiroId] : [],
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          });
          await batch.commit();
        } catch (error) {
          errorEl.textContent = traduzirErroFirebase(error);
        }
      });
      if (document.getElementById("forgotPasswordBtn")) document.getElementById("forgotPasswordBtn").addEventListener("click", () => {
        const email = loginEmail.value.trim();
        if (!email) {
          authError.textContent = "\u26A0\uFE0F Digite seu e-mail no campo acima para receber o link de recupera\xE7\xE3o.";
          return;
        }
        auth.sendPasswordResetEmail(email).then(() => {
          showToast("\u{1F4E7} Link enviado! Verifique sua caixa de entrada e spam.", "success");
          authError.textContent = "";
        }).catch((error) => {
          authError.textContent = traduzirErroFirebase(error);
        });
      });
      logoutLink.addEventListener("click", () => {
        auth.signOut();
      });
      if (document.getElementById("togglePasswordBtn")) document.getElementById("togglePasswordBtn").addEventListener("click", function() {
        togglePasswordVisibility("loginPassword", this);
      });
      if (document.getElementById("toggleRegPasswordBtn")) document.getElementById("toggleRegPasswordBtn").addEventListener("click", function() {
        togglePasswordVisibility("regPassword", this);
      });
      if (document.getElementById("toggleResetPasswordBtn")) document.getElementById("toggleResetPasswordBtn").addEventListener("click", function() {
        togglePasswordVisibility("resetPassword", this);
      });
      auth.onAuthStateChanged(async (user) => {
        if (user) {
          setCurrentUser(user);
          resetIdleTimer();
          authOverlay.style.display = "none";
          appLayout.style.display = "flex";
          const savedTheme = localStorage.getItem("controlpess-theme");
          if (savedTheme === "dark") {
            document.body.classList.add("dark-mode");
          } else {
            document.body.classList.remove("dark-mode");
          }
          if (themeToggle) {
            const icon = themeToggle.querySelector("span");
            icon.textContent = document.body.classList.contains("dark-mode") ? "light_mode" : "dark_mode";
          }
          logoutLink.style.display = "inline-block";
          const userDocRef = db.collection("users").doc(user.uid);
          const userDoc = await userDocRef.get();
          if (!userDoc.exists) {
            await userDocRef.set({
              name: user.displayName || user.email.split("@")[0],
              email: user.email,
              photoURL: null,
              createdAt: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
          window.currentUserName = userDoc.exists ? userDoc.data().name : user.displayName || user.email.split("@")[0];
          await updateUserAvatar();
          await loadUserData();
          await verificarERepararFormasPagamento();
          await verificarERepararContasPadrao();
          renderTransactions();
          renderDashboard();
          showDailyBriefing();
        } else {
          setCurrentUser(null);
          authOverlay.style.display = "flex";
          appLayout.style.display = "none";
          logoutLink.style.display = "none";
          loginEmail.value = "";
          loginPassword.value = "";
          g.transactions = [];
          if (sessionStorage.getItem("logoutReason") === "idle") {
            showAuthError("\u26A0\uFE0F Sua sess\xE3o expirou por inatividade. Entre novamente.");
            sessionStorage.removeItem("logoutReason");
          }
        }
      });
      if (document.getElementById("closeBriefingBtn")) document.getElementById("closeBriefingBtn").addEventListener("click", () => {
        const bm = document.getElementById("briefingModal");
        if (bm) bm.style.display = "none";
      });
      if (document.getElementById("btnAcknowledgeBriefing")) document.getElementById("btnAcknowledgeBriefing").addEventListener("click", () => {
        const bm = document.getElementById("briefingModal");
        if (bm) bm.style.display = "none";
      });
    }
  });

  // js/app.js
  var require_app = __commonJS({
    "js/app.js"() {
      init_firebase_config();
      init_firebase_config();
      init_state();
      init_utils();
      init_ui_helpers();
      init_theme();
      init_notifications();
      init_dashboard();
      init_transactions();
      init_partners();
      init_accounts();
      init_settings();
      init_ofx_import();
      init_auth();
      loadSavedTheme();
      loadSavedUIStates();
      var sidebarItems = document.querySelectorAll(".sidebar-item");
      var views = {
        dashboard: document.getElementById("dashboardView"),
        transactions: document.getElementById("transactionsView"),
        partners: document.getElementById("partnersView"),
        accounts: document.getElementById("accountsView"),
        settings: document.getElementById("settingsView")
      };
      function setActiveView2(view) {
        currentView.value = view;
        Object.values(views).forEach((v) => {
          if (v) v.style.display = "none";
        });
        sidebarItems.forEach((item) => item.classList.remove("active"));
        const activeView = views[view];
        if (activeView) activeView.style.display = "block";
        const activeItem = document.querySelector(`.sidebar-item[data-view="${view}"]`);
        if (activeItem) activeItem.classList.add("active");
        switch (view) {
          case "dashboard":
            renderDashboard();
            break;
          case "transactions":
            renderTransactions();
            filterTransactions();
            break;
          case "partners":
            renderPartners();
            break;
          case "accounts":
            loadAccounts2();
            break;
        }
      }
      window.setActiveView = setActiveView2;
      window.openEditTransactionModal = function(id) {
        document.dispatchEvent(new CustomEvent("openEditTransaction", { detail: { id } }));
      };
      window.nextStep = function() {
        document.dispatchEvent(new CustomEvent("wizard:next"));
      };
      window.prevStep = function() {
        document.dispatchEvent(new CustomEvent("wizard:prev"));
      };
      window.closeDrawer = function() {
        const drawer = document.querySelector(".drawer.open");
        if (drawer) drawer.classList.remove("open");
      };
      window.setType = function(type) {
        document.dispatchEvent(new CustomEvent("wizard:setType", { detail: { type } }));
      };
      window.togglePrivacy = togglePrivacy;
      sidebarItems.forEach((item) => {
        item.addEventListener("click", () => {
          const view = item.dataset.view;
          if (view) setActiveView2(view);
        });
      });
      document.getElementById("menuToggle")?.addEventListener("click", () => {
        document.querySelector(".sidebar")?.classList.toggle("collapsed");
      });
      document.getElementById("mobileOpenMenuBtn")?.addEventListener("click", () => {
        document.querySelector(".sidebar")?.classList.add("open");
      });
      document.getElementById("themeToggle")?.addEventListener("click", () => {
        themeToggle();
        const current = currentView.value;
        if (current) setActiveView2(current);
      });
      document.getElementById("privacyToggle")?.addEventListener("click", togglePrivacy);
      document.getElementById("notificationsBtn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        document.getElementById("notificationsDropdown")?.classList.toggle("show");
      });
      document.addEventListener("click", () => {
        document.getElementById("notificationsDropdown")?.classList.remove("show");
      });
      document.getElementById("logoutLink")?.addEventListener("click", (e) => {
        e.preventDefault();
        auth.signOut();
      });
      document.getElementById("userAvatarBtn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        document.getElementById("userDropdown")?.classList.toggle("show");
      });
      document.getElementById("logoHome")?.addEventListener("click", () => {
        setActiveView2("dashboard");
      });
      document.querySelectorAll(".close-briefing, .briefing-overlay").forEach((el) => {
        el.addEventListener("click", () => {
          document.querySelectorAll(".briefing-modal").forEach((m) => {
            m.style.display = "none";
          });
        });
      });
      document.getElementById("globalSearchInput")?.addEventListener("input", (e) => {
        document.dispatchEvent(new CustomEvent("globalSearch", { detail: { query: e.target.value.trim() } }));
      });
      initTransactions();
      initPartners();
      initAccounts();
      initSettings();
      initOfxImport();
    }
  });
  return require_app();
})();
