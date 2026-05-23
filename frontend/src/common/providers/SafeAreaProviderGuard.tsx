import React from 'react';
import { UIManager, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
    console.warn('[SAFE-AREA] RNCSafeAreaProvider ViewManager not found. Falling back to View.');
    return <View style={{ flex: 1 }}>{children}</View>;
  }

  return <SafeAreaProvider>{children}</SafeAreaProvider>;
};

export default SafeAreaProviderGuard;
