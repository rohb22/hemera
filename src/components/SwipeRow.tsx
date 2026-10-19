import { useRef, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { colors, spacing, type } from '@/theme/tokens';

interface SwipeRowProps {
  children: ReactNode;
  onComplete: () => void;
  onOpenActions?: () => void;
}

export function SwipeRow({ children, onComplete, onOpenActions }: SwipeRowProps) {
  const ref = useRef<Swipeable>(null);

  return (
    <Swipeable
      ref={ref}
      friction={2}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={() => (
        <View style={[styles.action, styles.completeAction]}>
          <Text style={[styles.actionLabel, styles.completeLabel]}>Complete</Text>
        </View>
      )}
      renderRightActions={
        onOpenActions
          ? () => (
              <View style={[styles.action, styles.actionsAction]}>
                <Text style={[styles.actionLabel, styles.actionsLabel]}>Actions</Text>
              </View>
            )
          : undefined
      }
      onSwipeableOpen={(direction) => {
        ref.current?.close();
        if (direction === 'left') onComplete();
        else onOpenActions?.();
      }}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  action: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  completeAction: { backgroundColor: colors.accent },
  actionsAction: { backgroundColor: colors.surfaceMuted },
  actionLabel: { ...type.overline, color: colors.surface },
  completeLabel: { color: colors.surface },
  actionsLabel: { color: colors.ink },
});
