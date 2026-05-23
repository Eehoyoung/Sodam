import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../logo/Colors';

interface SectionCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

const SectionCard: React.FC<SectionCardProps> = ({ children, style, testID }) => {
  return (
    <View style={[styles.card, Array.isArray(style) ? style : [style]]} testID={testID}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
});

export default SectionCard;
