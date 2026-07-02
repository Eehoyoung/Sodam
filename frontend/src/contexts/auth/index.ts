// Export all hooks for easy importing
export {useStorage} from './hooks/useStorage';
export {useAuthState} from './hooks/useAuthState';
export {useFirstLaunch} from './hooks/useFirstLaunch';
export {useAuthActions} from './hooks/useAuthActions';

// Export AuthProvider and useAuth (New Hook-based system)
export {AuthProvider as NewAuthProvider, useAuth as useNewAuth} from './providers/AuthProvider';
export {AuthProvider, useAuth} from './providers/AuthProvider';

// Legacy AuthContext support for parallel operation
import LegacyAuthProviderDefault, {useAuth as useLegacyAuth} from '../AuthContext';

export {LegacyAuthProviderDefault as LegacyAuthProvider, useLegacyAuth};

// Re-export types for convenience
export type {User} from '../../features/auth/services/authService';
