import { useAuth } from '../context/AuthContext';
import {
  accountsApi,
  categoriesApi,
  transactionsApi,
  budgetsApi,
} from '../api/endpoints';
import {
  localAccounts,
  localCategories,
  localTransactions,
  localBudgets,
} from './localStore';

const remoteRepo = { accountsApi, categoriesApi, transactionsApi, budgetsApi };
const localRepo = {
  accountsApi: localAccounts,
  categoriesApi: localCategories,
  transactionsApi: localTransactions,
  budgetsApi: localBudgets,
};

/**
 * Returns the active data source. Guests read/write the device; authenticated
 * users hit the backend. The same method names mean screens don't branch.
 */
export function useRepo() {
  const { isGuest } = useAuth();
  return isGuest ? localRepo : remoteRepo;
}
