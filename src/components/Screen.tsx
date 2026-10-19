import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, gutter } from '@/theme/tokens';

interface ScreenProps {
  children: ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}

export function Screen({ children, edges, style }: ScreenProps) {
  return (
    <SafeAreaView
      edges={edges ?? ['top']}
      style={{ flex: 1, backgroundColor: colors.paper }}
    >
      <View style={[{ flex: 1, paddingHorizontal: gutter }, style]}>{children}</View>
    </SafeAreaView>
  );
}
