import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SodamLogo from '../logo/SodamLogo';
import { useThemeColors } from '../../hooks/useThemeColors';

interface Props {
  title?: string;
}

const SodamHeaderTitle: React.FC<Props> = ({ title }) => {
  const c = useThemeColors();
  return (
    <View style={styles.container} accessibilityRole="header">
      <SodamLogo size={20} variant="simple" />
      {Boolean(title) && <Text style={[styles.titleText, { color: c.textPrimary }]}>{title}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SodamHeaderTitle;
