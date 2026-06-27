import {
  accountsApi,
  categoriesApi,
  transactionsApi,
  budgetsApi,
} from '../api/endpoints';
import { exportGuestData, clearGuestData } from './localStore';

/**
 * Pushes everything a guest created on-device up to the backend, then wipes the
 * local copy. Called right after a guest successfully registers or logs in.
 *
 * Categories are matched to the backend's seeded set by name+type to avoid
 * duplicates; anything new is created. Accounts are recreated with their
 * original opening balance and transactions are replayed, so the server
 * recomputes identical balances.
 *
 * Kept free of any AuthContext import so AuthContext can call it without a cycle.
 */
export async function migrateGuestToBackend() {
  const { accounts, categories, transactions, budgets = [] } =
    await exportGuestData();
  if (accounts.length === 0 && transactions.length === 0) {
    await clearGuestData();
    return { accounts: 0, transactions: 0, budgets: 0 };
  }

  // ---- categories: reuse seeded ones, create the rest ----
  const remoteCats = (await categoriesApi.list()) || [];
  const keyOf = (c) => `${c.type}::${c.name.trim().toLowerCase()}`;
  const remoteByKey = new Map(remoteCats.map((c) => [keyOf(c), c.id]));
  const catIdMap = new Map();
  for (const c of categories) {
    const k = keyOf(c);
    let remoteId = remoteByKey.get(k);
    if (!remoteId) {
      const created = await categoriesApi.create({
        name: c.name,
        type: c.type,
        icon: c.icon,
        color: c.color,
      });
      remoteId = created.id;
      remoteByKey.set(k, remoteId);
    }
    catIdMap.set(c.id, remoteId);
  }

  // ---- accounts ----
  const accIdMap = new Map();
  for (const a of accounts) {
    const created = await accountsApi.create({
      name: a.name,
      type: a.type,
      currency: a.currency,
      openingBalance: a.openingBalance ?? 0,
    });
    accIdMap.set(a.id, created.id);
  }

  // ---- transactions (oldest first so any ordering stays natural) ----
  const ordered = transactions
    .slice()
    .sort((x, y) => (x.createdSeq || 0) - (y.createdSeq || 0));
  let txCount = 0;
  for (const t of ordered) {
    const accountId = accIdMap.get(t.accountId);
    if (!accountId) continue; // account was deleted locally
    await transactionsApi.create({
      accountId,
      categoryId: t.categoryId ? catIdMap.get(t.categoryId) || null : null,
      type: t.type,
      amount: t.amount,
      occurredOn: t.occurredOn,
      note: t.note,
    });
    txCount += 1;
  }

  // ---- budgets (one per account+period; recreate then restore state) ----
  let budgetCount = 0;
  for (const b of budgets) {
    const accountId = accIdMap.get(b.accountId);
    if (!accountId) continue; // account was deleted locally
    try {
      const created = await budgetsApi.create({
        accountId,
        periodType: b.periodType,
        limitAmount: b.limitAmount,
      });
      const topUp = Number(b.topUp || 0);
      if (topUp > 0) await budgetsApi.topUp(created.id, topUp);
      if (b.active === false) await budgetsApi.setActive(created.id, false);
      budgetCount += 1;
    } catch {
      // A duplicate period or stale account shouldn't abort the whole migration.
    }
  }

  await clearGuestData();
  return { accounts: accounts.length, transactions: txCount, budgets: budgetCount };
}
