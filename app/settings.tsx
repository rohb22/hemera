import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { colors, spacing, type } from '@/theme/tokens';

export default function SettingsScreen() {
  return (
    <Screen>
      <View style={styles.body}>
        <Text style={styles.bodyText}>Settings will appear here.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: spacing.xl },
  bodyText: { ...type.body, color: colors.inkMuted },
});
