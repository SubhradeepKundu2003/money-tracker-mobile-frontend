import React, { useCallback, useState } from 'react';
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
import { Banner, EmptyState, Pill } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useRepo } from '../data/repo';
import { formatMoney, formatDate } from '../utils/format';
import { colors, spacing } from '../theme';

const FILTERS = [
  { key: undefined, label: 'All' },
  { key: 'INCOME', label: 'Income' },
  { key: 'EXPENSE', label: 'Expense' },
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

  const renderItem = ({ item }) => (
    <Pressable
      style={styles.row}
      onLongPress={() => onDelete(item)}
      onPress={() => navigation.navigate('TransactionForm', { transaction: item })}
    >
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons
          name={item.type === 'INCOME' ? 'arrow-up-circle' : 'arrow-down-circle'}
          size={26}
          color={item.type === 'INCOME' ? colors.income : colors.expense}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{item.categoryName || item.note || 'Transaction'}</Text>
        <Text style={styles.rowMeta}>
          {item.accountName} · {formatDate(item.occurredOn)}
        </Text>
      </View>
      <Text
        style={[
          styles.amount,
          { color: item.type === 'INCOME' ? colors.income : colors.expense },
        ]}
      >
        {item.type === 'INCOME' ? '+' : '−'}
        {formatMoney(item.amount, baseCurrency)}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>Transactions</Text>
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pill
            key={f.label}
            label={f.label}
            active={type === f.key}
            onPress={() => setType(f.key)}
          />
        ))}
      </View>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Banner message={error} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(t) => t.id}
        renderItem={renderItem}
        contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
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
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: { marginRight: spacing.md },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '800' },
});
