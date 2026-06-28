import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';
import { formatDate, todayIso } from '../utils/format';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
// How many years to show per page in the year grid.
const YEAR_SPAN = 12;

const pad = (n) => String(n).padStart(2, '0');
const toIso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

// Parse a YYYY-MM-DD string into {y, m, d} (m is 0-indexed). Returns null when
// the string is empty or malformed, so callers can fall back to "today".
function parseIso(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!match) return null;
  return { y: +match[1], m: +match[2] - 1, d: +match[3] };
}

// Days of `month` (0-indexed) laid out into 7-column weeks, padded with nulls
// for the leading/trailing blanks so the grid always has full rows.
function buildMatrix(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * A tappable field that opens a custom calendar for picking a date. Reports the
 * chosen day as a YYYY-MM-DD string via {@code onChange}. No native date picker
 * or external calendar library — fully self-contained and themed.
 */
export function DateField({ label, value, onChange, error }) {
  const [open, setOpen] = useState(false);

  const handlePick = (iso) => {
    onChange(iso);
    setOpen(false);
  };

  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.input,
          error && styles.inputError,
          pressed && styles.inputPressed,
        ]}
      >
        <Text style={[styles.inputText, !value && styles.placeholder]}>
          {value ? formatDate(value) : 'Select a date'}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
      </Pressable>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {/* Stop taps inside the card from dismissing the modal. */}
          <Pressable style={styles.card} onPress={() => {}}>
            {/* `key` resets the calendar's internal view/cursor each time it opens. */}
            <Calendar
              key={open ? value || 'today' : 'closed'}
              initial={value}
              onPick={handlePick}
              onClose={() => setOpen(false)}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Calendar({ initial, onPick, onClose }) {
  const start = parseIso(initial) || parseIso(todayIso());
  const selected = parseIso(initial);
  const today = parseIso(todayIso());

  const [view, setView] = useState('days'); // 'days' | 'months' | 'years'
  const [year, setYear] = useState(start.y);
  const [month, setMonth] = useState(start.m);
  const [yearBase, setYearBase] = useState(
    Math.floor(start.y / YEAR_SPAN) * YEAR_SPAN,
  );

  const matrix = useMemo(() => buildMatrix(year, month), [year, month]);

  const stepMonth = (delta) => {
    const next = month + delta;
    if (next < 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else if (next > 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth(next);
    }
  };

  const isSelected = (d) =>
    selected && selected.y === year && selected.m === month && selected.d === d;
  const isToday = (d) =>
    today && today.y === year && today.m === month && today.d === d;

  // Shared header: a [<] [ title ] [>] row. The title cycles days -> months ->
  // years so month and year are always one or two taps away.
  const Header = ({ title, onPrev, onNext, onTitle }) => (
    <View style={styles.header}>
      <Pressable onPress={onPrev} hitSlop={10} style={styles.navBtn}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <Pressable onPress={onTitle} hitSlop={8} style={styles.titleBtn}>
        <Text style={styles.title}>{title}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>
      <Pressable onPress={onNext} hitSlop={10} style={styles.navBtn}>
        <Ionicons name="chevron-forward" size={22} color={colors.text} />
      </Pressable>
    </View>
  );

  return (
    <View>
      {view === 'days' && (
        <>
          <Header
            title={`${MONTHS[month]} ${year}`}
            onPrev={() => stepMonth(-1)}
            onNext={() => stepMonth(1)}
            onTitle={() => setView('months')}
          />
          <View style={styles.weekRow}>
            {WEEKDAYS.map((w) => (
              <Text key={w} style={styles.weekday}>{w}</Text>
            ))}
          </View>
          <View style={styles.grid}>
            {matrix.map((d, i) => (
              <View key={i} style={styles.cell}>
                {d ? (
                  <Pressable
                    onPress={() => onPick(toIso(year, month, d))}
                    style={[
                      styles.day,
                      isSelected(d) && styles.daySelected,
                      !isSelected(d) && isToday(d) && styles.dayToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected(d) && styles.dayTextSelected,
                      ]}
                    >
                      {d}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        </>
      )}

      {view === 'months' && (
        <>
          <Header
            title={`${year}`}
            onPrev={() => setYear((y) => y - 1)}
            onNext={() => setYear((y) => y + 1)}
            onTitle={() => {
              setYearBase(Math.floor(year / YEAR_SPAN) * YEAR_SPAN);
              setView('years');
            }}
          />
          <View style={styles.gridWrap}>
            {MONTHS_SHORT.map((m, i) => (
              <Pressable
                key={m}
                onPress={() => { setMonth(i); setView('days'); }}
                style={[styles.chip, month === i && styles.chipActive]}
              >
                <Text style={[styles.chipText, month === i && styles.chipTextActive]}>
                  {m}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {view === 'years' && (
        <>
          <Header
            title={`${yearBase} - ${yearBase + YEAR_SPAN - 1}`}
            onPrev={() => setYearBase((b) => b - YEAR_SPAN)}
            onNext={() => setYearBase((b) => b + YEAR_SPAN)}
            onTitle={() => setView('months')}
          />
          <View style={styles.gridWrap}>
            {Array.from({ length: YEAR_SPAN }, (_, i) => yearBase + i).map((y) => (
              <Pressable
                key={y}
                onPress={() => { setYear(y); setView('months'); }}
                style={[styles.chip, year === y && styles.chipActive]}
              >
                <Text style={[styles.chipText, year === y && styles.chipTextActive]}>
                  {y}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <View style={styles.footer}>
        <Pressable onPress={onClose} hitSlop={8} style={styles.footerBtn}>
          <Text style={styles.footerText}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={() => onPick(todayIso())}
          hitSlop={8}
          style={styles.footerBtn}
        >
          <Text style={[styles.footerText, styles.footerTextStrong]}>Today</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.md },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  inputPressed: { opacity: 0.7 },
  inputError: { borderColor: colors.danger },
  inputText: { fontSize: 16, color: colors.text },
  placeholder: { color: colors.textMuted },
  fieldError: { color: colors.danger, fontSize: 12, marginTop: spacing.xs },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  titleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },

  weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  day: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  daySelected: { backgroundColor: colors.primary },
  dayToday: { borderWidth: 1, borderColor: colors.text },
  dayText: { fontSize: 15, color: colors.text },
  dayTextSelected: { color: colors.textInverse, fontWeight: '700' },

  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  chip: {
    width: '30%',
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 15, fontWeight: '600', color: colors.text },
  chipTextActive: { color: colors.textInverse },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  footerText: { fontSize: 15, color: colors.textMuted, fontWeight: '600' },
  footerTextStrong: { color: colors.text },
});
