import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

/**
 * On-device data layer — the app's only data source. Persists accounts,
 * categories, transactions and budgets in AsyncStorage, namespaced per
 * profile so a single device can hold multiple independent users. Balance
 * bookkeeping: INCOME adds, EXPENSE subtracts; updates reverse-then-reapply;
 * deletes reverse.
 */

const GLOBAL_K = {
  profiles: 'mt.profiles',
  activeProfileId: 'mt.activeProfileId',
};

// Pre-profile storage keys — read once during initActiveProfile() to migrate
// an existing install's data into its new default profile.
const LEGACY_K = {
  accounts: 'mt.guest.accounts',
  categories: 'mt.guest.categories',
  transactions: 'mt.guest.transactions',
  budgets: 'mt.guest.budgets',
  seeded: 'mt.guest.seeded',
};

const DATA_NAMES = ['accounts', 'categories', 'transactions', 'budgets', 'seeded'];

let activeProfileId = null;

// Falls back to a 'pending' namespace if called before initActiveProfile()
// resolves, so any premature read just sees an empty, harmless dataset
// instead of throwing.
function keyFor(name) {
  return `mt.profile.${activeProfileId || 'pending'}.${name}`;
}

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

export async function seedProfileIfNeeded() {
  const seeded = await AsyncStorage.getItem(keyFor('seeded'));
  if (seeded) return;
  const cats = DEFAULT_CATEGORIES.map((c) => ({ id: uid(), ...c }));
  await write(keyFor('categories'), cats);
  await write(keyFor('accounts'), []);
  await write(keyFor('transactions'), []);
  await write(keyFor('budgets'), []);
  await AsyncStorage.setItem(keyFor('seeded'), '1');
}

// Wipes the active profile's data only — other profiles on this device are untouched.
export async function clearProfileData() {
  await AsyncStorage.multiRemove(DATA_NAMES.map((n) => keyFor(n)));
}

// Snapshot used by the JSON backup export (src/data/backup.js) — the active profile only.
export async function exportGuestData() {
  const [accounts, categories, transactions, budgets] = await Promise.all([
    read(keyFor('accounts')),
    read(keyFor('categories')),
    read(keyFor('transactions')),
    read(keyFor('budgets')),
  ]);
  return { accounts, categories, transactions, budgets };
}

// Replaces the active profile's data with a previously exported snapshot.
export async function importGuestData({ accounts = [], categories = [], transactions = [], budgets = [] }) {
  await Promise.all([
    write(keyFor('accounts'), accounts),
    write(keyFor('categories'), categories),
    write(keyFor('transactions'), transactions),
    write(keyFor('budgets'), budgets),
  ]);
  // Data is now present — don't let seedProfileIfNeeded overwrite it with defaults.
  await AsyncStorage.setItem(keyFor('seeded'), '1');
}

// ---- profiles ----
// Moves a pre-multi-profile install's un-namespaced data into `profileId`'s
// namespace, so upgrading the app doesn't lose anyone's existing data.
async function migrateLegacyData(profileId) {
  const pairs = await AsyncStorage.multiGet(Object.values(LEGACY_K));
  const present = pairs.filter(([, v]) => v != null);
  if (present.length === 0) return;
  const legacyToName = Object.fromEntries(
    Object.entries(LEGACY_K).map(([name, key]) => [key, name]),
  );
  await AsyncStorage.multiSet(
    present.map(([key, value]) => [`mt.profile.${profileId}.${legacyToName[key]}`, value]),
  );
  await AsyncStorage.multiRemove(Object.values(LEGACY_K));
}

// Loads (or creates) the profile list and picks the active one. Must resolve
// before any screen reads/writes profile-scoped data. Safe to call once at
// app bootstrap.
export async function initActiveProfile() {
  let profiles = await read(GLOBAL_K.profiles);
  if (profiles.length === 0) {
    const profile = { id: uid(), name: 'You' };
    profiles = [profile];
    await write(GLOBAL_K.profiles, profiles);
    await migrateLegacyData(profile.id);
    activeProfileId = profile.id;
  } else {
    const stored = await AsyncStorage.getItem(GLOBAL_K.activeProfileId);
    activeProfileId = profiles.some((p) => p.id === stored) ? stored : profiles[0].id;
  }
  await AsyncStorage.setItem(GLOBAL_K.activeProfileId, activeProfileId);
  await seedProfileIfNeeded();
  return { profiles, activeProfileId };
}

export const localProfiles = {
  async list() {
    return read(GLOBAL_K.profiles);
  },
  async create(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('Enter a name.');
    const profiles = await read(GLOBAL_K.profiles);
    const profile = { id: uid(), name: trimmed };
    profiles.push(profile);
    await write(GLOBAL_K.profiles, profiles);
    return profile;
  },
  async rename(id, name) {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('Enter a name.');
    const profiles = await read(GLOBAL_K.profiles);
    const profile = profiles.find((p) => p.id === id);
    if (!profile) throw new Error('Profile not found');
    profile.name = trimmed;
    await write(GLOBAL_K.profiles, profiles);
    return profile;
  },
  // Switches the active profile and seeds it if it has never been used before.
  async switchTo(id) {
    const profiles = await read(GLOBAL_K.profiles);
    if (!profiles.some((p) => p.id === id)) throw new Error('Profile not found');
    activeProfileId = id;
    await AsyncStorage.setItem(GLOBAL_K.activeProfileId, id);
    await seedProfileIfNeeded();
    return id;
  },
  // Deletes a profile and all of its data. Returns the remaining profile list.
  async remove(id) {
    const profiles = await read(GLOBAL_K.profiles);
    if (profiles.length <= 1) throw new Error('At least one profile is required.');
    const remaining = profiles.filter((p) => p.id !== id);
    await write(GLOBAL_K.profiles, remaining);
    await AsyncStorage.multiRemove(DATA_NAMES.map((n) => `mt.profile.${id}.${n}`));
    return remaining;
  },
};

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
    return read(keyFor('accounts'));
  },
  async get(id) {
    const accounts = await read(keyFor('accounts'));
    return accounts.find((a) => a.id === id) || null;
  },
  async create({ name, type, currency, openingBalance = 0 }) {
    const accounts = await read(keyFor('accounts'));
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
    await write(keyFor('accounts'), accounts);
    return acc;
  },
  async update(id, { name, type, currency }) {
    const accounts = await read(keyFor('accounts'));
    const acc = accounts.find((a) => a.id === id);
    if (!acc) throw new Error('Account not found');
    Object.assign(acc, { name, type, currency });
    await write(keyFor('accounts'), accounts);
    return acc;
  },
  async archive(id, archived) {
    const accounts = await read(keyFor('accounts'));
    const acc = accounts.find((a) => a.id === id);
    if (!acc) throw new Error('Account not found');
    acc.archived = String(archived) === 'true' || archived === true;
    await write(keyFor('accounts'), accounts);
    return acc;
  },
  async remove(id) {
    const accounts = (await read(keyFor('accounts'))).filter((a) => a.id !== id);
    const transactions = (await read(keyFor('transactions'))).filter((t) => t.accountId !== id);
    await write(keyFor('accounts'), accounts);
    await write(keyFor('transactions'), transactions);
    return null;
  },
};

// ---- categories ----
export const localCategories = {
  async list(type) {
    const cats = await read(keyFor('categories'));
    return type ? cats.filter((c) => c.type === type) : cats;
  },
  async create({ name, type, icon, color }) {
    const cats = await read(keyFor('categories'));
    const cat = { id: uid(), name, type, icon: icon || null, color: color || null };
    cats.push(cat);
    await write(keyFor('categories'), cats);
    return cat;
  },
  async update(id, { name, type, icon, color }) {
    const cats = await read(keyFor('categories'));
    const cat = cats.find((c) => c.id === id);
    if (!cat) throw new Error('Category not found');
    Object.assign(cat, { name, type, icon, color });
    await write(keyFor('categories'), cats);
    return cat;
  },
  async remove(id) {
    await write(keyFor('categories'), (await read(keyFor('categories'))).filter((c) => c.id !== id));
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
      read(keyFor('transactions')),
      read(keyFor('accounts')),
      read(keyFor('categories')),
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
    let items = await read(keyFor('transactions'));
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
      read(keyFor('transactions')),
      read(keyFor('accounts')),
      read(keyFor('categories')),
    ]);
    const tx = all.find((t) => t.id === id);
    return tx ? decorate(tx, accounts, categories) : null;
  },
  // Per-day income/expense totals within [from, to] — backs the dashboard's
  // "This Month Overview" bar chart.
  async dailyTotals({ from, to } = {}) {
    let items = await read(keyFor('transactions'));
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
      read(keyFor('transactions')),
      read(keyFor('accounts')),
      read(keyFor('categories')),
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
    await write(keyFor('transactions'), all);
    await write(keyFor('accounts'), accounts);
    return decorate(tx, accounts, categories);
  },
  async update(id, { accountId, categoryId, type, amount, occurredOn, note }) {
    const [all, accounts, categories] = await Promise.all([
      read(keyFor('transactions')),
      read(keyFor('accounts')),
      read(keyFor('categories')),
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
    await write(keyFor('transactions'), all);
    await write(keyFor('accounts'), accounts);
    return decorate(tx, accounts, categories);
  },
  async remove(id) {
    const [all, accounts] = await Promise.all([
      read(keyFor('transactions')),
      read(keyFor('accounts')),
    ]);
    const tx = all.find((t) => t.id === id);
    if (tx) applyBalance(accounts, tx.accountId, tx.type, tx.amount, -1);
    await write(keyFor('transactions'), all.filter((t) => t.id !== id));
    await write(keyFor('accounts'), accounts);
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
      read(keyFor('budgets')),
      read(keyFor('accounts')),
      read(keyFor('transactions')),
    ]);
    return budgets.map((b) => budgetView(b, accounts, transactions));
  },
  async get(id) {
    const [budgets, accounts, transactions] = await Promise.all([
      read(keyFor('budgets')),
      read(keyFor('accounts')),
      read(keyFor('transactions')),
    ]);
    const b = budgets.find((x) => x.id === id);
    return b ? budgetView(b, accounts, transactions) : null;
  },
  async create({ accountId, periodType, limitAmount }) {
    const budgets = await read(keyFor('budgets'));
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
    await write(keyFor('budgets'), budgets);
    return this.get(b.id);
  },
  async update(id, { limitAmount }) {
    const budgets = await read(keyFor('budgets'));
    const b = budgets.find((x) => x.id === id);
    if (!b) throw new Error('Budget not found');
    // Account and period type are structural; only the allowance changes.
    b.limitAmount = Number(limitAmount);
    await write(keyFor('budgets'), budgets);
    return this.get(id);
  },
  async setActive(id, active) {
    const budgets = await read(keyFor('budgets'));
    const b = budgets.find((x) => x.id === id);
    if (!b) throw new Error('Budget not found');
    b.active = active === true || String(active) === 'true';
    await write(keyFor('budgets'), budgets);
    return this.get(id);
  },
  async topUp(id, amount) {
    const value = Number(amount);
    if (!(value > 0)) throw new Error('Top-up amount must be greater than zero');
    const budgets = await read(keyFor('budgets'));
    const b = budgets.find((x) => x.id === id);
    if (!b) throw new Error('Budget not found');
    const { periodStart } = periodRange(b.periodType, todayIsoLocal());
    // Reset the pool if we've rolled into a new period since the last top-up.
    b.topUp = (b.topUpPeriodStart === periodStart ? Number(b.topUp || 0) : 0) + value;
    b.topUpPeriodStart = periodStart;
    await write(keyFor('budgets'), budgets);
    return this.get(id);
  },
  async remove(id) {
    await write(keyFor('budgets'), (await read(keyFor('budgets'))).filter((b) => b.id !== id));
    return null;
  },
};
