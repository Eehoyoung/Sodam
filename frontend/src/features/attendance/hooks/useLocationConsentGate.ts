import {useCallback} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {ConfirmSheet} from '../../../common/components/ds';
import {useAuth} from '../../../contexts/AuthContext';
import {authQueryKeys} from '../../../common/auth/queryKeys';
import authApi from '../../auth/services/authApi';
import {User} from '../../auth/services/authService';

/**
 * GPS 출퇴근 첫 사용 시점 위치정보 동의 게이트.
 *
 * 가입 시 위치정보 동의는 필수에서 제외됐다(위치정보법 §19② — 미동의를 이유로 서비스 제공
 * 거부 금지, 소담은 NFC·사장승인 등 GPS 없이도 쓸 수 있는 대체 수단이 있어 GPS 를 서비스
 * 필수불가결 요소로 볼 수 없음). 대신 GPS 좌표를 실제로 수집(Geolocation.getCurrentPosition
 * 호출)하기 직전에 동의를 구해야 한다.
 *
 * user.locationConsented 가 이미 true 면 즉시 통과(매번 뜨지 않도록 최초 1회만 확인).
 */
export const useLocationConsentGate = () => {
    const {user} = useAuth();
    const queryClient = useQueryClient();

    /**
     * GPS 진행 가능하면 true, 사용자가 거부(또는 시트를 닫음)하면 false 를 resolve 한다.
     * false 인 경우 호출부는 GPS 호출을 진행하지 말고 NFC·사장승인 등 대체 수단으로 안내해야 한다.
     */
    const ensureLocationConsent = useCallback((): Promise<boolean> => {
        if (!user || user.locationConsented) {
            return Promise.resolve(true);
        }

        return new Promise<boolean>(resolve => {
            let settled = false;
            const finish = (result: boolean) => {
                if (settled) {return;}
                settled = true;
                resolve(result);
            };

            ConfirmSheet.confirm({
                title: '위치정보 이용에 동의해 주세요',
                description:
                    '출퇴근 위치 확인을 위해 위치정보 이용에 동의해 주세요. 동의하지 않아도 NFC나 사장님 승인으로 출퇴근할 수 있어요.',
                primary: {
                    label: '동의하고 계속',
                    onPress: () => {
                        authApi
                            .setLocationConsent(true)
                            .then(() => {
                                const nextUser: User = {...user, locationConsented: true};
                                queryClient.setQueryData<User | null>(authQueryKeys.currentUser(), nextUser);
                            })
                            .catch(() => {
                                // 저장 실패해도 이번 GPS 요청은 사용자 의사대로 진행한다.
                                // (다음 진입 시 다시 동의를 묻게 되는 정도의 저하만 발생.)
                            })
                            .finally(() => finish(true));
                    },
                },
                secondary: {
                    label: '다음에',
                    onPress: () => finish(false),
                },
                onDismiss: () => finish(false),
            });
        });
    }, [user, queryClient]);

    return {ensureLocationConsent};
};

export default useLocationConsentGate;
