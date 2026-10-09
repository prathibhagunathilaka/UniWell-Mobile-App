import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { WellbeingColors as Colors, WellbeingRadius as Radius, WellbeingSpace as Space } from '@/constants/wellbeingTheme';

export type DropdownOption = { value: string; label: string };

type Props = {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
};

// Compact dropdown: shows the current choice, opens a scrollable list (with search once it gets long).
export function Dropdown({ label, value, options, onChange, placeholder = 'Select' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { height } = useWindowDimensions();

  const selected = options.find((o) => o.value === value);
  const searchable = options.length > 8;
  const shown = useMemo(
    () => (query.trim() ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase())) : options),
    [options, query],
  );

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}. Tap to change`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
      >
        <Text numberOfLines={1} style={[styles.fieldText, !selected && styles.placeholder]}>{selected?.label ?? placeholder}</Text>
        <Ionicons name="chevron-down" size={20} color={Colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close list" />
        <View style={styles.sheetWrap} pointerEvents="box-none">
          <View style={[styles.sheet, { maxHeight: height * 0.65 }]}>
            <Text style={styles.sheetTitle}>{label}</Text>
            {searchable ? (
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search"
                placeholderTextColor={Colors.muted}
                autoCapitalize="none"
                accessibilityLabel={`Search ${label}`}
                style={styles.search}
              />
            ) : null}
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {shown.length === 0 ? <Text style={styles.empty}>No matches</Text> : null}
              {shown.map((o) => {
                const on = o.value === value;
                return (
                  <Pressable
                    key={o.value || '__all'}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => {
                      onChange(o.value);
                      close();
                    }}
                    style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && styles.pressed]}
                  >
                    <Text style={[styles.rowText, on && styles.rowTextOn]}>{o.label}</Text>
                    {on ? <Ionicons name="checkmark" size={20} color={Colors.accent} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  label: { color: Colors.muted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  field: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm, paddingHorizontal: Space.md, borderRadius: Radius.md, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  fieldText: { flex: 1, color: Colors.accent, fontSize: 15, fontWeight: '700' },
  placeholder: { color: Colors.muted, fontWeight: '500' },
  pressed: { opacity: 0.8 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,46,60,0.45)' },
  sheetWrap: { flex: 1, justifyContent: 'center', padding: Space.lg },
  sheet: { gap: Space.sm, padding: Space.md, borderRadius: Radius.lg, backgroundColor: Colors.white },
  sheetTitle: { color: Colors.accent, fontSize: 16, fontWeight: '900' },
  search: { minHeight: 44, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Space.sm, fontSize: 15, color: Colors.accent },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm, paddingHorizontal: Space.sm, borderRadius: Radius.md },
  rowOn: { backgroundColor: Colors.paleBlue },
  rowText: { flex: 1, color: Colors.accent, fontSize: 15 },
  rowTextOn: { fontWeight: '800' },
  empty: { color: Colors.muted, fontSize: 14, padding: Space.md, textAlign: 'center' },
});
