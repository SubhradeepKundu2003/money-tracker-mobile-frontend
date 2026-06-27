import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, EmptyState, Banner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useRepo } from '../data/repo';
import { formatMoney, formatDate, currentMonthRange } from '../utils/format';
import { colors, spacing, radius } from '../theme';

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { accountsApi, transactionsApi } = useRepo();
  const [summary, setSummary] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const baseCurrency = user?.baseCurrency || 'INR';

  const load = useCallback(async () => {
    setError(null);
    try {
      const range = currentMonthRange();
      const [sum, accs, txPage] = await Promise.all([
        transactionsApi.summary(range),
        accountsApi.list(),
        transactionsApi.search({ page: 0, size: 5 }),
      ]);
      setSummary(sum);
      setAccounts(accs || []);
      setRecent(txPage?.content || []);
    } catch (e) {
      setError(e.message || 'Could not load your dashboard.');
    }
  }, [accountsApi, transactionsApi]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const totalBalance = accounts
    .filter((a) => !a.archived)
    .reduce((acc, a) => acc + Number(a.balance || 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.greeting}>Hi, {user?.displayName || 'there'}</Text>
        <Text style={styles.subgreeting}>Here's your money this month.</Text>

        <Banner message={error} />

        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total balance</Text>
          <Text style={styles.balanceValue}>{formatMoney(totalBalance, baseCurrency)}</Text>
          <Text style={styles.balanceMeta}>
            Across {accounts.filter((a) => !a.archived).length} account(s)
          </Text>
        </Card>

        <View style={styles.summaryRow}>
          <Card style={[styles.summaryCard, { marginRight: spacing.sm }]}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryValue, { color: colors.income }]}>
              {formatMoney(summary?.totalIncome, baseCurrency)}
            </Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Expense</Text>
            <Text style={[styles.summaryValue, { color: colors.expense }]}>
              {formatMoney(summary?.totalExpense, baseCurrency)}
            </Text>
          </Card>
        </View>

        <Card style={styles.netCard}>
          <Text style={styles.summaryLabel}>Net this month</Text>
          <Text
            style={[
              styles.netValue,
              { color: Number(summary?.net) >= 0 ? colors.income : colors.expense },
            ]}
          >
            {formatMoney(summary?.net, baseCurrency)}
          </Text>
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <Text style={styles.sectionLink} onPress={() => navigation.navigate('Transactions')}>
            See all
          </Text>
        </View>

        {recent.length === 0 ? (
          <Card>
            <EmptyState
              icon={<MaterialCommunityIcons name="receipt" size={44} color={colors.textMuted} />}
              title="No transactions yet"
              subtitle="Tap the + tab to record your first one."
            />
          </Card>
        ) : (
          <Card style={{ padding: 0 }}>
            {recent.map((tx, i) => (
              <View
                key={tx.id}
                style={[styles.txRow, i < recent.length - 1 && styles.txDivider]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.txTitle}>{tx.categoryName || tx.note || 'Transaction'}</Text>
                  <Text style={styles.txMeta}>
                    {tx.accountName} · {formatDate(tx.occurredOn)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.txAmount,
                    { color: tx.type === 'INCOME' ? colors.income : colors.expense },
                  ]}
                >
                  {tx.type === 'INCOME' ? '+' : '−'}
                  {formatMoney(tx.amount, baseCurrency)}
                </Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: spacing.xl },
  greeting: { fontSize: 24, fontWeight: '800', color: colors.text },
  subgreeting: { fontSize: 15, color: colors.textMuted, marginBottom: spacing.lg },

  balanceCard: { backgroundColor: colors.primary, marginBottom: spacing.md },
  balanceLabel: { color: colors.primaryLight, fontSize: 14, fontWeight: '600' },
  balanceValue: { color: '#fff', fontSize: 34, fontWeight: '800', marginVertical: spacing.xs },
  balanceMeta: { color: colors.primaryLight, fontSize: 13 },

  summaryRow: { flexDirection: 'row', marginBottom: spacing.md },
  summaryCard: { flex: 1 },
  summaryLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  summaryValue: { fontSize: 20, fontWeight: '800', marginTop: spacing.xs },

  netCard: { marginBottom: spacing.lg },
  netValue: { fontSize: 24, fontWeight: '800', marginTop: spacing.xs },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  sectionLink: { color: colors.primary, fontWeight: '700' },

  txRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  txDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  txTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  txMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '800' },
});
