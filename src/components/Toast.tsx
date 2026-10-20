import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUiStore } from '@/stores/uiStore';
import { colors, radii, spacing, type } from '@/theme/tokens';

/** Default bottom-tab content height (design-system §2.6: toast sits above the tab bar). */
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 49 : 56;

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const toast = useUiStore((s) => s.toast);
  const dismiss = useUiStore((s) => s.dismissToast);

  if (!toast) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.host,
        { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + spacing.md },
      ]}
    >
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={styles.card}
      >
        <Text style={styles.message}>{toast.message}</Text>
        {toast.actionLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={toast.actionLabel}
            hitSlop={spacing.sm}
            onPress={() => {
              toast.onAction?.();
              dismiss();
            }}
          >
            <Text style={styles.action}>{toast.actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: 0,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  message: { ...type.body, color: colors.paper, flexShrink: 1 },
  action: { ...type.button, color: colors.accentSoft },
});
