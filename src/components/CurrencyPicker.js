import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Field, Banner } from './ui';
import { currenciesApi } from '../api/endpoints';
import { colors, radius, spacing } from '../theme';

/**
 * Full-screen modal that lists the backend's supported currencies (with search)
 * and reports the chosen one via {@code onSelect(currency)}. Fetches the list
 * lazily each time it opens.
 */
export default function CurrencyPicker({ visible, currentCode, onClose, onSelect }) {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setError(null);
    setLoading(true);
    currenciesApi
      .list()
      .then(setAll)
      .catch((e) => setError(e.message || 'Could not load currencies'))
      .finally(() => setLoading(false));
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [all, query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Base currency</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <Field
            placeholder="Search currency…"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {error ? <Banner message={error} type="error" /> : null}

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = item.code === currentCode;
                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.row,
                      active && styles.rowActive,
                      pressed && styles.rowPressed,
                    ]}
                    onPress={() => onSelect(item)}
                  >
                    <Text style={styles.code}>{item.code}</Text>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {active ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  close: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  body: { flex: 1, paddingHorizontal: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowActive: { backgroundColor: colors.primaryLight },
  rowPressed: { opacity: 0.7 },
  code: { fontSize: 16, fontWeight: '800', color: colors.text, width: 56 },
  name: { fontSize: 15, color: colors.textMuted, flex: 1 },
  check: { color: colors.primary, fontWeight: '800', fontSize: 16, marginLeft: spacing.sm },
});
