/**
 * DatePicker — A custom inline date picker modal.
 * Works on web and native without native build dependencies.
 * Shows a clean month/day/year selector with a confirmation button.
 */
import React, { useState, useCallback } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface DatePickerProps {
  visible: boolean;
  value: string; // ISO date string "YYYY-MM-DD" or empty
  onConfirm: (dateStr: string, displayStr: string) => void;
  onCancel: () => void;
  minDate?: Date;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

function parseInitial(value: string): { month: number; day: number; year: number } {
  const now = new Date();
  if (value && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, d] = value.split('-').map(Number);
    return { month: m - 1, day: d, year: y };
  }
  // Default: 2 weeks from today
  const future = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  return { month: future.getMonth(), day: future.getDate(), year: future.getFullYear() };
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

function WheelColumn({
  items,
  selectedIndex,
  onSelect,
}: {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const colors = useColors();
  const scrollRef = React.useRef<ScrollView>(null);

  // Scroll to selected item on mount and when selectedIndex changes
  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      y: selectedIndex * ITEM_HEIGHT,
      animated: false,
    });
  }, [selectedIndex]);

  const handleScroll = useCallback((e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    if (clamped !== selectedIndex) {
      onSelect(clamped);
    }
  }, [items.length, selectedIndex, onSelect]);

  return (
    <View style={{ flex: 1, height: PICKER_HEIGHT, overflow: 'hidden' }}>
      {/* Selection highlight */}
      <View
        style={{
          position: 'absolute',
          top: ITEM_HEIGHT * 2,
          left: 0, right: 0,
          height: ITEM_HEIGHT,
          backgroundColor: colors.primaryLight,
          borderRadius: 10,
          zIndex: 0,
        }}
        pointerEvents="none"
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScroll}
        onScrollEndDrag={handleScroll}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        scrollEventThrottle={16}
      >
        {items.map((item, i) => {
          const isSelected = i === selectedIndex;
          return (
            <Pressable
              key={i}
              onPress={() => {
                onSelect(i);
                scrollRef.current?.scrollTo({ y: i * ITEM_HEIGHT, animated: true });
              }}
              style={{ height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text
                style={{
                  fontSize: isSelected ? 17 : 14,
                  fontWeight: isSelected ? '700' : '400',
                  color: isSelected ? colors.primary : colors.muted,
                }}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function DatePicker({ visible, value, onConfirm, onCancel }: DatePickerProps) {
  const colors = useColors();
  const initial = parseInitial(value);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day - 1); // 0-indexed
  const [year, setYear] = useState(() => {
    const currentYear = new Date().getFullYear();
    return initial.year - currentYear; // offset from current year
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear + i));
  const selectedYear = currentYear + year;
  const daysInMonth = getDaysInMonth(month, selectedYear);
  const days = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));

  // Clamp day if month changes and day is out of range
  const clampedDay = Math.min(day, daysInMonth - 1);

  const handleConfirm = () => {
    const d = clampedDay + 1;
    const m = month + 1;
    const y = selectedYear;
    const isoStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const displayStr = `${MONTHS[month]} ${d}, ${y}`;
    onConfirm(isoStr, displayStr);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        onPress={onCancel}
      >
        <Pressable onPress={() => {}} style={[styles.sheet, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Pressable onPress={onCancel} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[styles.headerBtn, { color: colors.muted }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Select Date</Text>
            <Pressable onPress={handleConfirm} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[styles.headerBtn, { color: colors.primary, fontWeight: '700' }]}>Done</Text>
            </Pressable>
          </View>

          {/* Wheels */}
          <View style={styles.wheelsRow}>
            {/* Month */}
            <WheelColumn items={MONTHS} selectedIndex={month} onSelect={setMonth} />
            {/* Day */}
            <View style={{ width: 64 }}>
              <WheelColumn items={days} selectedIndex={clampedDay} onSelect={setDay} />
            </View>
            {/* Year */}
            <View style={{ width: 80 }}>
              <WheelColumn items={years} selectedIndex={year} onSelect={setYear} />
            </View>
          </View>

          {/* Confirm button */}
          <Pressable
            onPress={handleConfirm}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, margin: 16, marginTop: 8 }]}
          >
            <View style={[styles.confirmBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.confirmBtnText}>Confirm Date</Text>
            </View>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerBtn: { fontSize: 15 },
  wheelsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 4,
  },
  confirmBtn: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  confirmBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
