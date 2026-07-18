import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Banner, EmptyState, IconChip, SegmentedControl } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useRepo } from '../data/repo';
import { formatMoney, formatDate, formatMonthYear } from '../utils/format';
import { categoryIconName } from '../utils/categoryIcon';
import { colors, spacing } from '../theme';

const FILTERS = [
  { value: undefined, label: 'All' },
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expenses' },
];

const PAGE_SIZE = 20;

export default function TransactionsScreen({ navigation }) {
  const { user } = useAuth();
  const { transactionsApi } = useRepo();
  const baseCurrency = user?.baseCurrency || 'INR';
  const [items, setItems] = useState([]);
  const [type, setType] = useState(undefined);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPage = useCallback(
    async (pageIndex, filterType, replace) => {
      setLoading(true);
      setError(null);
      try {
        const res = await transactionsApi.search({
          type: filterType,
          page: pageIndex,
          size: PAGE_SIZE,
        });
        const content = res?.content || [];
        setItems((prev) => (replace ? content : [...prev, ...content]));
        setPage(pageIndex);
        setLast(res?.last ?? true);
      } catch (e) {
        setError(e.message || 'Could not load transactions.');
      } finally {
        setLoading(false);
      }
    },
    [transactionsApi],
  );

  // Reload first page whenever the screen regains focus or the filter changes.
  useFocusEffect(
    useCallback(() => {
      fetchPage(0, type, true);
    }, [fetchPage, type]),
  );

  const onEndReached = () => {
    if (!loading && !last) fetchPage(page + 1, type, false);
  };

  const onDelete = (tx) => {
    Alert.alert('Delete transaction', 'Remove this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          transactionsApi
            .remove(tx.id)
            .then(() => fetchPage(0, type, true))
            .catch((e) => setError(e.message)),
      },
    ]);
  };

  // Transactions arrive newest-first as one flat, paginated list — insert a
  // month header row wherever the month changes so it reads like the reference
  // design's "May 2025" section grouping.
  const listData = useMemo(() => {
    const out = [];
    let lastLabel = null;
    for (const tx of items) {
      const label = formatMonthYear(tx.occurredOn);
      if (label !== lastLabel) {
        out.push({ rowType: 'header', key: `h-${label}`, label });
        lastLabel = label;
      }
      out.push({ rowType: 'tx', key: tx.id, tx });
    }
    return out;
  }, [items]);

  const renderItem = ({ item }) => {
    if (item.rowType === 'header') {
      return <Text style={styles.monthHeader}>{item.label}</Text>;
    }
    const tx = item.tx;
    return (
      <Pressable
        style={styles.row}
        onLongPress={() => onDelete(tx)}
        onPress={() => navigation.navigate('TransactionForm', { transaction: tx })}
      >
        <IconChip
          icon={
            <MaterialCommunityIcons
              name={categoryIconName(tx.categoryName, tx.type)}
              size={20}
              color={colors.text}
            />
          }
        />
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>{tx.categoryName || tx.note || 'Transaction'}</Text>
          <Text style={styles.rowMeta}>{formatDate(tx.occurredOn)}</Text>
        </View>
        <Text
          style={[
            styles.amount,
            { color: tx.type === 'INCOME' ? colors.income : colors.expense },
          ]}
        >
          {tx.type === 'INCOME' ? '+ ' : '− '}
          {formatMoney(tx.amount, baseCurrency)}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>Transactions</Text>
      <View style={styles.filterRow}>
        <SegmentedControl options={FILTERS} value={type} onChange={setType} />
      </View>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Banner message={error} />
      </View>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={listData.length === 0 ? styles.emptyList : styles.list}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon={<MaterialCommunityIcons name="receipt" size={44} color={colors.textMuted} />}
              title="No transactions"
              subtitle="Use the + tab to add one. Long-press a row to delete."
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  filterRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  monthHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  rowBody: { flex: 1, marginLeft: spacing.md },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '800' },
});
