import { auth, db } from './firebase-config.js';
import { currentUser, userRef, g } from './state.js';

async function processAccountBalance(tx, action = 'apply') {
    if (!tx || tx.type === 'transfer') return;
    const accountId = tx.accountId;
    if (!accountId) return;
    try {
        const accRef = userRef('accounts').doc(accountId);
        const accDoc = await accRef.get();
        if (!accDoc.exists) return;
        const currentBalance = accDoc.data().balance || 0;
        let delta = tx.type === 'income' ? tx.value : -tx.value;
        if (action === 'revert') delta = -delta;
        await accRef.update({ balance: currentBalance + delta });
        const idx = g.accounts.findIndex(a => a.id === accountId);
        if (idx !== -1) g.accounts[idx].balance = (g.accounts[idx].balance || 0) + delta;
    } catch (error) {
        console.error('Erro ao processar saldo:', error);
    }
}

export { processAccountBalance };
