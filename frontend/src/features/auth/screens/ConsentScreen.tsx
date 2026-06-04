import React, {useState} from 'react';
import {StyleSheet} from 'react-native';
import {NavigationProp} from '@react-navigation/native';
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

interface Props {
    navigation: NavigationProp<any>;
}

/**
 * 동의 화면 (PIPA §22 — 필수/선택 분리, G-2).
 *
 * 흐름: 카카오 등 소셜 로그인 → (consentCompleted=false 면) 본 화면 강제 진입 →
 *   필수 3종 동의 → POST /api/auth/consents → 캐시 갱신 → ProfileBasics 또는 메인.
 *
 * 약관 본문(법률 문구)은 ConsentBlock 의 "보기"에서 표시하며, 실제 문구는 변호사 검토 후
 * 주입된다. 본 화면은 동의 수집·전송만 담당한다.
 */
export default function ConsentScreen({navigation}: Props) {
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
            AppToast.warn('필수 약관에 모두 동의해 주세요.');
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
            // 캐시의 사용자 동의 상태를 즉시 반영해 네비게이터 재진입(루프) 방지
            queryClient.setQueryData<User | null>(queryKeys.auth.currentUser(), prev =>
                prev ? {...prev, consentCompleted: true} : prev,
            );

            const profileDone = user?.profileCompleted !== false;
            if (profileDone) {
                navigation.reset({
                    index: 0,
                    routes: [{name: 'HomeRoot' as never}] as any,
                });
            } else {
                navigation.reset({
                    index: 0,
                    routes: [{name: 'Auth' as never, params: {screen: 'ProfileBasics'} as never}] as any,
                });
            }
        } catch (e: any) {
            const msg = e?.response?.data?.message ?? '동의 저장에 실패했어요. 잠시 후 다시 시도해 주세요.';
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
                        label="동의하고 시작하기"
                        loading={submitting}
                        loadingLabel="저장 중..."
                        disabled={!requiredOk}
                        onPress={handleSubmit}
                    />
                    <AppText variant="caption" tone="tertiary" center>
                        필수 항목에 동의하셔야 서비스를 이용할 수 있어요.
                    </AppText>
                </CtaStack>
            }>
            <AppCard variant="warm" hero>
                <AppText variant="headingSm">시작하기 전에</AppText>
                <AppText variant="bodyMd" tone="secondary" style={styles.heroSub}>
                    소담을 안전하게 이용하실 수 있도록{'\n'}약관에 동의해 주세요.
                </AppText>
            </AppCard>

            <ConsentBlock value={consent} onChange={setConsent} />
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    heroSub: {marginTop: spacing.sm, opacity: 0.85},
});
