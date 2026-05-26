/**
 * 전역 네비게이션 ref — NavigationContainer 밖(AuthContext 등)에서
 * 네비게이션을 트리거하기 위함. (갭분석 A1 세션 만료 등)
 */
import {createNavigationContainerRef} from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

export function navigate(name: string, params?: object) {
    if (navigationRef.isReady()) {
        (navigationRef.navigate as any)(name, params);
    }
}
