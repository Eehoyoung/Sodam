import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {colors} from '../theme/tokens';

const MinimalNavigator: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>MinimalNavigator • Visible</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceInverse, // 잉크 — 고대비 폴백 화면
  },
  text: {
    color: colors.textInverse,
    fontSize: 18,
  },
});

export default MinimalNavigator;
