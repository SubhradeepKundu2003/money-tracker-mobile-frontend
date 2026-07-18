import {
  localAccounts,
  localCategories,
  localTransactions,
  localBudgets,
} from './localStore';

const localRepo = {
  accountsApi: localAccounts,
  categoriesApi: localCategories,
  transactionsApi: localTransactions,
  budgetsApi: localBudgets,
};

/** Everything is stored on-device — this hook exists so screens keep one call site. */
export function useRepo() {
  return localRepo;
}
