import React, {useState} from 'react';
import {StyleSheet} from 'react-native';
import {NavigationProp, RouteProp} from '@react-navigation/native';
import {useQueryClient} from '@tanstack/react-query';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    AppToast,
    CtaStack,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {useAuth} from '../../../contexts/AuthContext';
import {queryKeys} from '../../../common/utils/queryClient';
import ConsentBlock, {ConsentValue} from '../components/ConsentBlock';
import authApi from '../services/authApi';
import {User} from '../services/authService';
import {AuthStackParamList} from '../../../navigation/types';
import {resetToRootRoute, resolvePostAuthRoute} from '../../../navigation/authFlow';

interface Props {
    navigation: NavigationProp<any>;
    route: RouteProp<AuthStackParamList, 'Consent'>;
}

export default function ConsentScreen({navigation, route}: Props) {
    const {user} = useAuth();
    const queryClient = useQueryClient();

    const [consent, setConsent] = useState<ConsentValue>({
        age: false,
        terms: false,
        privacy: false,
        marketing: false,
    });
    const [submitting, setSubmitting] = useState(false);

    const requiredOk = consent.age && consent.terms && consent.privacy;

    const handleSubmit = async () => {
        if (!requiredOk) {
            AppToast.warn('서비스 이용을 위해 필수 약관에 모두 동의해 주세요.');
            return;
        }
        if (!user) {
            AppToast.error('로그인 정보가 필요합니다. 다시 로그인해 주세요.');
            navigation.reset({
                index: 0,
                routes: [{name: 'Auth' as never, params: {screen: 'Login', params: route.params} as never}] as any,
            });
            return;
        }
        setSubmitting(true);
        try {
            await authApi.recordConsents({
                age: consent.age,
                terms: consent.terms,
                privacy: consent.privacy,
                marketing: consent.marketing,
            });

            const nextUser = {...user, consentCompleted: true};
            queryClient.setQueryData<User | null>(queryKeys.auth.currentUser(), nextUser);

            resetToRootRoute(navigation, resolvePostAuthRoute(nextUser, route.params?.selectedPurpose));
        } catch (e: any) {
            const msg = e?.response?.data?.message ?? '약관 동의 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.';
            AppToast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="약관 동의" />}
            footer={
                <CtaStack bordered>
                    <AppButton
                        label="동의하고 계속"
                        loading={submitting}
                        loadingLabel="저장 중..."
                        disabled={!requiredOk}
                        onPress={handleSubmit}
                    />
                    <AppText variant="caption" tone="tertiary" center>
                        필수 항목에 동의해야 소담을 이용할 수 있어요.
                    </AppText>
                </CtaStack>
            }>
            <AppCard variant="warm" hero>
                <AppText variant="headingMd">서비스 이용을 위한 설정</AppText>
                <AppText variant="bodyLg" tone="secondary" style={styles.heroSub}>
                    처음 한 번만 필요한 약관 동의 단계예요.
                </AppText>
            </AppCard>

            <ConsentBlock value={consent} onChange={setConsent} />
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    heroSub: {marginTop: spacing.sm, opacity: 0.85},
});
