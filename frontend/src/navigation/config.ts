// Navigation feature flags and recovery toggles
// Restoring stability: keep StackView disabled until RNGestureHandler native module is available.

export const ENABLE_STACK_NAV: boolean = true; // Enabled for recovery - Logcat shows stable app

// Some builds currently lack react-native-screens native module.
// To avoid console errors, gate enableScreens() behind this explicit flag.
export const ENABLE_SCREENS_NATIVE: boolean = true; // enabled after successful validation - app is stable

// Animation/Reanimated control (for Worklets native initialization issues)
export const ENABLE_ANIMATIONS: boolean = true; // ✅ Re-enabled after Worklets error resolution and validation system restoration
export const ANIMATION_RECOVERY_STAGE: number = 15; // stage threshold to attempt enabling animations

// Stage index for stepwise reintroduction logging (0..20)
export const STACK_RECOVERY_STAGE: number = 20; // 0: disabled, 1..20: iteration steps

// Helper to check if we reached a given iteration stage
export const stageAtLeast = (n: number): boolean => {
    try {
        return (STACK_RECOVERY_STAGE ?? 0) >= n;
    } catch {
        return false;
    }
};
