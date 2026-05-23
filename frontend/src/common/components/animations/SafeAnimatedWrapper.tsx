/**
 * SafeAnimatedWrapper - Conditionally renders animated components
 * Purpose: Prevent Worklets/Reanimated initialization errors during app startup
 * Used during recovery to gradually reintroduce animations
 */

import React from 'react';
import { View, ViewProps } from 'react-native';
import { ENABLE_ANIMATIONS, ANIMATION_RECOVERY_STAGE, stageAtLeast } from '../../../navigation/config';

interface SafeAnimatedWrapperProps extends ViewProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireStage?: number;
}

/**
 * Conditionally renders animated components based on feature flags
 * Falls back to plain View if animations are disabled
 */
export const SafeAnimatedWrapper: React.FC<SafeAnimatedWrapperProps> = ({
  children,
  fallback,
  requireStage = ANIMATION_RECOVERY_STAGE,
  ...viewProps
}) => {
  const shouldEnableAnimations = ENABLE_ANIMATIONS && stageAtLeast(requireStage);

  if (!shouldEnableAnimations) {
    // Render fallback or plain View when animations are disabled
    return fallback ? (
      <>{fallback}</>
    ) : (
      <View {...viewProps}>
        {children}
      </View>
    );
  }

  // Render animated components normally when enabled
  return <>{children}</>;
};

/**
 * Higher-order component to wrap animated components safely
 */
export const withSafeAnimations = <P extends object>(
  Component: React.ComponentType<P>,
  FallbackComponent?: React.ComponentType<P>
) => {
  return (props: P) => {
    const shouldEnableAnimations = ENABLE_ANIMATIONS && stageAtLeast(ANIMATION_RECOVERY_STAGE);

    if (!shouldEnableAnimations && FallbackComponent) {
      return <FallbackComponent {...props} />;
    }

    if (!shouldEnableAnimations) {
      // Return a minimal placeholder
      return <View style={{ flex: 1 }} />;
    }

    return <Component {...props} />;
  };
};

export default SafeAnimatedWrapper;
