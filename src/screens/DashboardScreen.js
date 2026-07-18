import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Banner, EmptyState, IconChip } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useRepo } from '../data/repo';
import { formatMoney, formatDate, currentMonthRange, greetingForNow } from '../utils/format';
import { categoryIconName } from '../utils/categoryIcon';
import { colors, spacing, radius } from '../theme';

const CHART_HEIGHT = 90;

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { accountsApi, transactionsApi } = useRepo();
  const [summary, setSummary] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [recent, setRecent] = useState([]);
  const [daily, setDaily] = useState([]);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);

  const baseCurrency = user?.baseCurrency || 'INR';

  const load = useCallback(async () => {
    setError(null);
    const range = currentMonthRange();
    // Load independently so one failing endpoint can't blank the whole screen
    // (e.g. a failed summary must not hide your balance or recent activity).
    const [sumRes, accsRes, txRes, dailyRes] = await Promise.allSettled([
      transactionsApi.summary(range),
      accountsApi.list(),
      transactionsApi.search({ page: 0, size: 5 }),
      transactionsApi.dailyTotals(range),
    ]);

    if (accsRes.status === 'fulfilled') setAccounts(accsRes.value || []);
    if (txRes.status === 'fulfilled') setRecent(txRes.value?.content || []);
    if (sumRes.status === 'fulfilled') setSummary(sumRes.value);
    if (dailyRes.status === 'fulfilled') setDaily(dailyRes.value || []);

    const failed = [sumRes, accsRes, txRes, dailyRes].find((r) => r.status === 'rejected');
    if (failed) {
      setError(failed.reason?.message || 'Some data could not be loaded.');
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

  // Fill every day of the current month (even ones with no activity) so the
  // bars line up evenly across the card width.
  const chart = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const byDay = {};
    daily.forEach((d) => {
      byDay[d.day] = d;
    });
    const maxValue = daily.reduce((m, d) => Math.max(m, d.income, d.expense), 0) || 1;
    const bars = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        day,
      ).padStart(2, '0')}`;
      const entry = byDay[iso];
      bars.push({ day, income: entry?.income || 0, expense: entry?.expense || 0 });
    }
    return { bars, maxValue };
  }, [daily]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.greeting}>{greetingForNow()},</Text>
        <Text style={styles.name}>{user?.displayName || 'there'}</Text>

        <Banner message={error} />

        <Text style={styles.balanceLabel}>Your Balance</Text>
        <View style={styles.balanceValueRow}>
          <Text style={styles.balanceValue}>
            {hideBalance ? '••••••' : formatMoney(totalBalance, baseCurrency)}
          </Text>
          <Pressable
            onPress={() => setHideBalance((v) => !v)}
            style={styles.eyeButton}
            hitSlop={8}
          >
            <Ionicons
              name={hideBalance ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.text}
            />
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { marginRight: spacing.sm }]}>
            <View>
              <Text style={styles.summaryLabel}>Income</Text>
              <Text style={styles.summaryValue}>
                {formatMoney(summary?.totalIncome, baseCurrency)}
              </Text>
            </View>
            <View style={styles.summaryIcon}>
              <MaterialCommunityIcons name="arrow-up" size={16} color={colors.text} />
            </View>
          </View>
          <View style={styles.summaryCard}>
            <View>
              <Text style={styles.summaryLabel}>Expenses</Text>
              <Text style={styles.summaryValue}>
                {formatMoney(summary?.totalExpense, baseCurrency)}
              </Text>
            </View>
            <View style={styles.summaryIcon}>
              <MaterialCommunityIcons name="arrow-down" size={16} color={colors.text} />
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>This Month Overview</Text>
        <View style={styles.chartCard}>
          <View style={styles.chartBars}>
            {chart.bars.map((b) => (
              <View key={b.day} style={styles.chartSlot}>
                <View style={styles.chartBarPair}>
                  <View
                    style={[
                      styles.chartBar,
                      styles.chartBarIncome,
                      { height: Math.max(2, (b.income / chart.maxValue) * CHART_HEIGHT) },
                    ]}
                  />
                  <View
                    style={[
                      styles.chartBar,
                      styles.chartBarExpense,
                      { height: Math.max(2, (b.expense / chart.maxValue) * CHART_HEIGHT) },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
          <View style={styles.chartAxis}>
            {chart.bars
              .filter((b) => b.day === 1 || b.day % 5 === 0)
              .map((b) => (
                <Text key={b.day} style={styles.chartAxisLabel}>
                  {b.day}
                </Text>
              ))}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
              <Text style={styles.legendLabel}>Income</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
              <Text style={styles.legendLabel}>Expenses</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <Text style={styles.sectionLink} onPress={() => navigation.navigate('Transactions')}>
            View all
          </Text>
        </View>

        {recent.length === 0 ? (
          <EmptyState
            icon={<MaterialCommunityIcons name="receipt" size={44} color={colors.textMuted} />}
            title="No transactions yet"
            subtitle="Tap the + tab to record your first one."
          />
        ) : (
          recent.map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <IconChip
                icon={
                  <MaterialCommunityIcons
                    name={categoryIconName(tx.categoryName, tx.type)}
                    size={20}
                    color={colors.text}
                  />
                }
              />
              <View style={styles.txBody}>
                <Text style={styles.txTitle}>{tx.categoryName || tx.note || 'Transaction'}</Text>
                <Text style={styles.txMeta}>{formatDate(tx.occurredOn)}</Text>
              </View>
              <Text
                style={[
                  styles.txAmount,
                  { color: tx.type === 'INCOME' ? colors.income : colors.expense },
                ]}
              >
                {tx.type === 'INCOME' ? '+ ' : '− '}
                {formatMoney(tx.amount, baseCurrency)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: spacing.xl },

  greeting: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  name: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: spacing.lg },

  balanceLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  balanceValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  balanceValue: { fontSize: 32, fontWeight: '800', color: colors.text, marginRight: spacing.sm },
  eyeButton: { padding: spacing.xs },

  summaryRow: { flexDirection: 'row', marginBottom: spacing.lg },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginBottom: spacing.xs },
  summaryValue: { fontSize: 16, fontWeight: '800', color: colors.text },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  sectionLink: { color: colors.primary, fontWeight: '700' },

  chartCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT },
  chartSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: CHART_HEIGHT },
  chartBarPair: { flexDirection: 'row', alignItems: 'flex-end', gap: 1 },
  chartBar: { width: 2, borderRadius: 1 },
  chartBarIncome: { backgroundColor: colors.income },
  chartBarExpense: { backgroundColor: colors.border },
  chartAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  chartAxisLabel: { fontSize: 10, color: colors.textMuted },
  legendRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },

  txRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  txBody: { flex: 1, marginLeft: spacing.md },
  txTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  txMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '800' },
});
