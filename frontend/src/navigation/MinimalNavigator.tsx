import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
    backgroundColor: '#0f172a', // slate-900 for high contrast
  },
  text: {
    color: '#fff',
    fontSize: 18,
  },
});

export default MinimalNavigator;
