import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  type DateTimePickerChangeEvent,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { parseISO } from 'date-fns';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { toTimeKey } from '@/domain/calendar';
import { colors, radii, spacing, type } from '@/theme/tokens';

interface TimeFieldProps {
  value: string | null;
  onChange: (time: string) => void;
}

const FALLBACK = parseISO('2021-01-01T09:00:00');

export function TimeField({ value, onChange }: TimeFieldProps) {
  const [showAndroid, setShowAndroid] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  const date = value ? parseISO(`2021-01-01T${value}:00`) : FALLBACK;

  const handleValueChange = (_event: DateTimePickerChangeEvent | DateTimePickerEvent, picked: Date) => {
    if (Platform.OS === 'android') setShowAndroid(false);
    onChange(toTimeKey(picked));
  };

  const handleDismiss = () => setShowAndroid(false);

  const onPress = () => {
    if (Platform.OS === 'android') setShowAndroid(true);
    else setShowSpinner((open) => !open);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value ? `Time ${value}` : 'Time not set'}
        onPress={onPress}
        style={styles.field}
      >
        <Text style={[styles.fieldText, !value && styles.placeholder]}>{value ?? 'Not set'}</Text>
        <Ionicons name="time-outline" size={18} color={colors.inkMuted} />
      </Pressable>

      {Platform.OS === 'android' && showAndroid && (
        <DateTimePicker
          value={date}
          mode="time"
          display="clock"
          onValueChange={handleValueChange}
          onDismiss={handleDismiss}
        />
      )}
      {Platform.OS !== 'android' && showSpinner && (
        <DateTimePicker
          value={date}
          mode="time"
          display="spinner"
          onValueChange={handleValueChange}
          style={styles.spinner}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  fieldText: { ...type.body, color: colors.ink },
  placeholder: { color: colors.inkFaint },
  spinner: { alignSelf: 'center' },
});
