import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewProps,
} from 'react-native';

type CalendarProps = ViewProps & {
  value?: Date;
  onValueChange?: (date: Date) => void;
};
function Calendar({ value, onValueChange, style, ...props }: CalendarProps) {
  const [date, setDate] = useState(value ?? new Date());
  const selected = value ?? date;
  const days = useMemo(
    () => Array.from({ length: 30 }, (_, index) => index + 1),
    [],
  );
  const select = (day: number) => {
    const next = new Date(selected.getFullYear(), selected.getMonth(), day);
    if (!value) setDate(next);
    onValueChange?.(next);
  };
  return (
    <View style={[styles.calendar, style]} {...props}>
      <Text style={styles.month}>
        {selected.toLocaleDateString(undefined, {
          month: 'long',
          year: 'numeric',
        })}
      </Text>
      <View style={styles.grid}>
        {days.map((day) => (
          <Pressable
            key={day}
            onPress={() => select(day)}
            style={[styles.day, day === selected.getDate() && styles.selected]}
          >
            <Text
              style={[
                styles.dayText,
                day === selected.getDate() && styles.selectedText,
              ]}
            >
              {day}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  calendar: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12 },
  month: {
    color: '#17212B',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  day: {
    alignItems: 'center',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  selected: { backgroundColor: '#1479F8' },
  dayText: { color: '#17212B' },
  selectedText: { color: '#FFFFFF', fontWeight: '700' },
});

export { Calendar };
