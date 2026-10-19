import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DAY_LETTERS } from '@/domain/habits';
import { colors, hitTarget, radii, type } from '@/theme/tokens';

interface DayTogglesProps {
  days: number[];
  onToggle: (dayIndex: number) => void;
}

/** Mon–Sun toggles for the planned-days set (D11 — no weekly count). */
export function DayToggles({ days, onToggle }: DayTogglesProps) {
  return (
    <View style={styles.row}>
      {DAY_LETTERS.map((letter, index) => {
        const selected = days.includes(index);
        return (
          <Pressable
            key={`${letter}-${index}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][index]}${selected ? ', planned' : ', not planned'}`}
            onPress={() => onToggle(index)}
            style={[styles.day, selected && styles.daySelected]}
          >
            <Text style={[styles.letter, selected && styles.letterSelected]}>{letter}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    width: hitTarget,
    height: hitTarget,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  letter: { ...type.body, color: colors.inkMuted, fontWeight: '600' },
  letterSelected: { color: colors.surface },
});
