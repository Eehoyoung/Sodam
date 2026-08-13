import React from 'react';
import { StyleSheet, UIManager, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {logger} from '../../utils/logger';

interface Props {
  children: React.ReactNode;
}

/**
 * SafeAreaProviderGuard
 * - Uses SafeAreaProvider if the native ViewManager 'RNCSafeAreaProvider' is available
 * - Otherwise, falls back to a plain View and logs a warning.
 * This provides an alternate/augmentation strategy to keep the app running even when
 * the native module is not properly registered, especially in Bridgeless/Fabric.
 */
const SafeAreaProviderGuard: React.FC<Props> = ({ children }) => {
  const hasSafeAreaVM = !!(UIManager as any)?.getViewManagerConfig?.('RNCSafeAreaProvider');

  if (!hasSafeAreaVM) {
    logger.warn('[SAFE-AREA] RNCSafeAreaProvider ViewManager not found. Falling back to View.');
    return <View style={styles.fill}>{children}</View>;
  }

  return <SafeAreaProvider>{children}</SafeAreaProvider>;
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

export default SafeAreaProviderGuard;
