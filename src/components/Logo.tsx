import { Image } from 'react-native';

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <Image
      accessibilityRole="image"
      accessibilityLabel="Hemera"
      source={require('../../assets/images/hemera-mark.png')}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}
