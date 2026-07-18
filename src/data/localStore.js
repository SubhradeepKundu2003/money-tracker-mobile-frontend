import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

/**
 * On-device data layer — the app's only data source. Persists accounts,
 * categories, transactions and budgets in AsyncStorage. Balance bookkeeping:
 * INCOME adds, EXPENSE subtracts; updates reverse-then-reapply; deletes reverse.
 */

const K = {
  accounts: 'mt.guest.accounts',
  categories: 'mt.guest.categories',
  transactions: 'mt.guest.transactions',
  budgets: 'mt.guest.budgets',
  seeded: 'mt.guest.seeded',
};

function uid() {
  return Crypto.randomUUID();
}

async function read(key) {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

async function write(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// Default categories seeded for a new guest (parallels the backend's 9 seeds).
const DEFAULT_CATEGORIES = [
  { name: 'Salary', type: 'INCOME', icon: null, color: '#374151' },
  { name: 'Other Income', type: 'INCOME', icon: null, color: '#374151' },
  { name: 'Food & Dining', type: 'EXPENSE', icon: null, color: '#6B7280' },
  { name: 'Transport', type: 'EXPENSE', icon: null, color: '#6B7280' },
  { name: 'Shopping', type: 'EXPENSE', icon: null, color: '#6B7280' },
  { name: 'Bills', type: 'EXPENSE', icon: null, color: '#6B7280' },
  { name: 'Health', type: 'EXPENSE', icon: null, color: '#6B7280' },
  { name: 'Entertainment', type: 'EXPENSE', icon: null, color: '#6B7280' },
  { name: 'Other', type: 'EXPENSE', icon: null, color: '#6B7280' },
];

export async function seedGuestIfNeeded() {
  const seeded = await AsyncStorage.getItem(K.seeded);
  if (seeded) return;
  const cats = DEFAULT_CATEGORIES.map((c) => ({ id: uid(), ...c }));
  await write(K.categories, cats);
  await write(K.accounts, []);
  await write(K.transactions, []);
  await write(K.budgets, []);
  await AsyncStorage.setItem(K.seeded, '1');
}

export async function clearGuestData() {
  await AsyncStorage.multiRemove([
    K.accounts,
    K.categories,
    K.transactions,
    K.budgets,
    K.seeded,
  ]);
}

export async function hasGuestData() {
  const [accounts, transactions] = await Promise.all([
    read(K.accounts),
    read(K.transactions),
  ]);
  return accounts.length > 0 || transactions.length > 0;
}

// Snapshot used by the JSON backup export (src/data/backup.js).
export async function exportGuestData() {
  const [accounts, categories, transactions, budgets] = await Promise.all([
    read(K.accounts),
    read(K.categories),
    read(K.transactions),
    read(K.budgets),
  ]);
  return { accounts, categories, transactions, budgets };
}

// Replaces all on-device data with a previously exported snapshot.
export async function importGuestData({ accounts = [], categories = [], transactions = [], budgets = [] }) {
  await Promise.all([
    write(K.accounts, accounts),
    write(K.categories, categories),
    write(K.transactions, transactions),
    write(K.budgets, budgets),
  ]);
  // Data is now present — don't let seedGuestIfNeeded overwrite it with defaults.
  await AsyncStorage.setItem(K.seeded, '1');
}

function decorate(tx, accounts, categories) {
  const acc = accounts.find((a) => a.id === tx.accountId);
  const cat = categories.find((c) => c.id === tx.categoryId);
  return {
    ...tx,
    accountName: acc ? acc.name : null,
    categoryName: cat ? cat.name : null,
  };
}

// ---- accounts ----
export const localAccounts = {
  async list() {
    return read(K.accounts);
  },
  async get(id) {
    const accounts = await read(K.accounts);
    return accounts.find((a) => a.id === id) || null;
  },
  async create({ name, type, currency, openingBalance = 0 }) {
    const accounts = await read(K.accounts);
    const acc = {
      id: uid(),
      name,
      type,
      currency,
      openingBalance: Number(openingBalance) || 0,
      balance: Number(openingBalance) || 0,
      archived: false,
    };
    accounts.push(acc);
    await write(K.accounts, accounts);
    return acc;
  },
  async update(id, { name, type, currency }) {
    const accounts = await read(K.accounts);
    const acc = accounts.find((a) => a.id === id);
    if (!acc) throw new Error('Account not found');
    Object.assign(acc, { name, type, currency });
    await write(K.accounts, accounts);
    return acc;
  },
  async archive(id, archived) {
    const accounts = await read(K.accounts);
    const acc = accounts.find((a) => a.id === id);
    if (!acc) throw new Error('Account not found');
    acc.archived = String(archived) === 'true' || archived === true;
    await write(K.accounts, accounts);
    return acc;
  },
  async remove(id) {
    const accounts = (await read(K.accounts)).filter((a) => a.id !== id);
    const transactions = (await read(K.transactions)).filter((t) => t.accountId !== id);
    await write(K.accounts, accounts);
    await write(K.transactions, transactions);
    return null;
  },
};

// ---- categories ----
export const localCategories = {
  async list(type) {
    const cats = await read(K.categories);
    return type ? cats.filter((c) => c.type === type) : cats;
  },
  async create({ name, type, icon, color }) {
    const cats = await read(K.categories);
    const cat = { id: uid(), name, type, icon: icon || null, color: color || null };
    cats.push(cat);
    await write(K.categories, cats);
    return cat;
  },
  async update(id, { name, type, icon, color }) {
    const cats = await read(K.categories);
    const cat = cats.find((c) => c.id === id);
    if (!cat) throw new Error('Category not found');
    Object.assign(cat, { name, type, icon, color });
    await write(K.categories, cats);
    return cat;
  },
  async remove(id) {
    await write(K.categories, (await read(K.categories)).filter((c) => c.id !== id));
    return null;
  },
};

function applyBalance(accounts, accountId, type, amount, sign) {
  const acc = accounts.find((a) => a.id === accountId);
  if (!acc) return;
  const delta = (type === 'INCOME' ? 1 : -1) * Number(amount) * sign;
  acc.balance = Number((Number(acc.balance) + delta).toFixed(2));
}

// ---- transactions ----
export const localTransactions = {
  async search({ accountId, type, from, to, page = 0, size = 20 } = {}) {
    const [all, accounts, categories] = await Promise.all([
      read(K.transactions),
      read(K.accounts),
      read(K.categories),
    ]);
    let items = all.slice();
    if (accountId) items = items.filter((t) => t.accountId === accountId);
    if (type) items = items.filter((t) => t.type === type);
    if (from) items = items.filter((t) => t.occurredOn >= from);
    if (to) items = items.filter((t) => t.occurredOn <= to);
    // newest first by date, then by insertion order (createdSeq desc)
    items.sort((a, b) =>
      a.occurredOn === b.occurredOn
        ? (b.createdSeq || 0) - (a.createdSeq || 0)
        : a.occurredOn < b.occurredOn ? 1 : -1,
    );
    const totalElements = items.length;
    const start = page * size;
    const content = items
      .slice(start, start + size)
      .map((t) => decorate(t, accounts, categories));
    return {
      content,
      totalElements,
      totalPages: Math.ceil(totalElements / size) || 1,
      number: page,
      size,
      first: page === 0,
      last: start + size >= totalElements,
    };
  },
  async summary({ from, to } = {}) {
    let items = await read(K.transactions);
    if (from) items = items.filter((t) => t.occurredOn >= from);
    if (to) items = items.filter((t) => t.occurredOn <= to);
    const totalIncome = items
      .filter((t) => t.type === 'INCOME')
      .reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = items
      .filter((t) => t.type === 'EXPENSE')
      .reduce((s, t) => s + Number(t.amount), 0);
    return {
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpense: Number(totalExpense.toFixed(2)),
      net: Number((totalIncome - totalExpense).toFixed(2)),
    };
  },
  async get(id) {
    const [all, accounts, categories] = await Promise.all([
      read(K.transactions),
      read(K.accounts),
      read(K.categories),
    ]);
    const tx = all.find((t) => t.id === id);
    return tx ? decorate(tx, accounts, categories) : null;
  },
  // Per-day income/expense totals within [from, to] — backs the dashboard's
  // "This Month Overview" bar chart.
  async dailyTotals({ from, to } = {}) {
    let items = await read(K.transactions);
    if (from) items = items.filter((t) => t.occurredOn >= from);
    if (to) items = items.filter((t) => t.occurredOn <= to);
    const byDay = {};
    for (const t of items) {
      const bucket = byDay[t.occurredOn] || { day: t.occurredOn, income: 0, expense: 0 };
      if (t.type === 'INCOME') bucket.income += Number(t.amount);
      else bucket.expense += Number(t.amount);
      byDay[t.occurredOn] = bucket;
    }
    return Object.values(byDay).sort((a, b) => (a.day < b.day ? -1 : 1));
  },
  async create({ accountId, categoryId, type, amount, occurredOn, note }) {
    const [all, accounts, categories] = await Promise.all([
      read(K.transactions),
      read(K.accounts),
      read(K.categories),
    ]);
    const tx = {
      id: uid(),
      accountId,
      categoryId: categoryId || null,
      type,
      amount: Number(amount),
      occurredOn,
      note: note || null,
      createdSeq: Date.now(),
    };
    applyBalance(accounts, accountId, type, amount, 1);
    all.push(tx);
    await write(K.transactions, all);
    await write(K.accounts, accounts);
    return decorate(tx, accounts, categories);
  },
  async update(id, { accountId, categoryId, type, amount, occurredOn, note }) {
    const [all, accounts, categories] = await Promise.all([
      read(K.transactions),
      read(K.accounts),
      read(K.categories),
    ]);
    const tx = all.find((t) => t.id === id);
    if (!tx) throw new Error('Transaction not found');
    // reverse the old effect, then apply the new one (handles account change)
    applyBalance(accounts, tx.accountId, tx.type, tx.amount, -1);
    applyBalance(accounts, accountId, type, amount, 1);
    Object.assign(tx, {
      accountId,
      categoryId: categoryId || null,
      type,
      amount: Number(amount),
      occurredOn,
      note: note || null,
    });
    await write(K.transactions, all);
    await write(K.accounts, accounts);
    return decorate(tx, accounts, categories);
  },
  async remove(id) {
    const [all, accounts] = await Promise.all([
      read(K.transactions),
      read(K.accounts),
    ]);
    const tx = all.find((t) => t.id === id);
    if (tx) applyBalance(accounts, tx.accountId, tx.type, tx.amount, -1);
    await write(K.transactions, all.filter((t) => t.id !== id));
    await write(K.accounts, accounts);
    return null;
  },
};

// ---- budgets ----
// Mirrors the backend's BudgetPeriodType: the inclusive [start, end] calendar
// window that contains a given date, returned as YYYY-MM-DD strings.
function todayIsoLocal() {
  const d = new Date();
  return fmtDate(d);
}

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function periodRange(periodType, iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  switch (periodType) {
    case 'DAILY':
      return { periodStart: iso, periodEnd: iso };
    case 'WEEKLY': {
      // Monday-start week, matching the backend's previousOrSame(MONDAY).
      const offset = (date.getDay() + 6) % 7; // 0 = Monday
      const start = new Date(y, m - 1, d - offset);
      const end = new Date(y, m - 1, d - offset + 6);
      return { periodStart: fmtDate(start), periodEnd: fmtDate(end) };
    }
    case 'YEARLY':
      return { periodStart: `${y}-01-01`, periodEnd: `${y}-12-31` };
    case 'MONTHLY':
    default: {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      return { periodStart: fmtDate(start), periodEnd: fmtDate(end) };
    }
  }
}

// Builds the BudgetResponse shape the backend returns, computing the live spend
// from this account's EXPENSE transactions inside the current period window.
// Guests have no scheduled rollover job, so carry-in is always 0 and a top-up
// only counts while its period is the current one.
function budgetView(b, accounts, transactions) {
  const { periodStart, periodEnd } = periodRange(b.periodType, todayIsoLocal());
  const acc = accounts.find((a) => a.id === b.accountId);
  const spent = transactions
    .filter(
      (t) =>
        t.accountId === b.accountId &&
        t.type === 'EXPENSE' &&
        t.occurredOn >= periodStart &&
        t.occurredOn <= periodEnd,
    )
    .reduce((s, t) => s + Number(t.amount), 0);
  const topUp = b.topUpPeriodStart === periodStart ? Number(b.topUp || 0) : 0;
  const limitAmount = Number(b.limitAmount);
  const carriedIn = 0;
  const available = Number((limitAmount + carriedIn + topUp - spent).toFixed(2));
  return {
    id: b.id,
    accountId: b.accountId,
    accountName: acc ? acc.name : null,
    periodType: b.periodType,
    limitAmount,
    active: b.active,
    currentPeriod: {
      id: `${b.id}:${periodStart}`,
      periodStart,
      periodEnd,
      limitAmount,
      carriedIn,
      topUp,
      spent: Number(spent.toFixed(2)),
      available,
    },
  };
}

export const localBudgets = {
  async list() {
    const [budgets, accounts, transactions] = await Promise.all([
      read(K.budgets),
      read(K.accounts),
      read(K.transactions),
    ]);
    return budgets.map((b) => budgetView(b, accounts, transactions));
  },
  async get(id) {
    const [budgets, accounts, transactions] = await Promise.all([
      read(K.budgets),
      read(K.accounts),
      read(K.transactions),
    ]);
    const b = budgets.find((x) => x.id === id);
    return b ? budgetView(b, accounts, transactions) : null;
  },
  async create({ accountId, periodType, limitAmount }) {
    const budgets = await read(K.budgets);
    if (budgets.some((b) => b.accountId === accountId && b.periodType === periodType)) {
      throw new Error(`A ${periodType} budget already exists for this account`);
    }
    const b = {
      id: uid(),
      accountId,
      periodType,
      limitAmount: Number(limitAmount),
      active: true,
      topUp: 0,
      topUpPeriodStart: null,
    };
    budgets.push(b);
    await write(K.budgets, budgets);
    return this.get(b.id);
  },
  async update(id, { limitAmount }) {
    const budgets = await read(K.budgets);
    const b = budgets.find((x) => x.id === id);
    if (!b) throw new Error('Budget not found');
    // Account and period type are structural; only the allowance changes.
    b.limitAmount = Number(limitAmount);
    await write(K.budgets, budgets);
    return this.get(id);
  },
  async setActive(id, active) {
    const budgets = await read(K.budgets);
    const b = budgets.find((x) => x.id === id);
    if (!b) throw new Error('Budget not found');
    b.active = active === true || String(active) === 'true';
    await write(K.budgets, budgets);
    return this.get(id);
  },
  async topUp(id, amount) {
    const value = Number(amount);
    if (!(value > 0)) throw new Error('Top-up amount must be greater than zero');
    const budgets = await read(K.budgets);
    const b = budgets.find((x) => x.id === id);
    if (!b) throw new Error('Budget not found');
    const { periodStart } = periodRange(b.periodType, todayIsoLocal());
    // Reset the pool if we've rolled into a new period since the last top-up.
    b.topUp = (b.topUpPeriodStart === periodStart ? Number(b.topUp || 0) : 0) + value;
    b.topUpPeriodStart = periodStart;
    await write(K.budgets, budgets);
    return this.get(id);
  },
  async remove(id) {
    await write(K.budgets, (await read(K.budgets)).filter((b) => b.id !== id));
    return null;
  },
};
