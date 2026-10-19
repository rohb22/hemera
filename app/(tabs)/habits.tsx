import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { colors, spacing, type } from '@/theme/tokens';

export default function HabitsScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.heading}>Habits</Text>
      </View>
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No habits yet</Text>
        <Text style={styles.emptyBody}>Habits will appear here as a simple daily list.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.sm, paddingBottom: spacing.lg },
  heading: { ...type.title, color: colors.ink },
  empty: { paddingTop: spacing.xxxl, gap: spacing.xs },
  emptyTitle: { ...type.title, color: colors.ink },
  emptyBody: { ...type.body, color: colors.inkMuted },
});
