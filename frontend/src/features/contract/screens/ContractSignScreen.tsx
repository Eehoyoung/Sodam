/**
 * S1 — 근로계약서 서명 (직원).
 * 서명 캔버스(react-native-signature-canvas)가 설치돼 있으면 손글씨 서명을,
 * 없으면 "서명에 동의합니다" 확인 버튼으로 폴백한다. 어느 경로든 POST /sign 으로
 * 서명 시각(employeeSignedAt)을 기록한다.
 */
import React, {useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {NavigationProp, RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    AppToast,
    CtaStack,
    ScreenContainer,
    SuccessState,
} from '../../../common/components/ds';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import contractService, {contractErrorMessage} from '../services/contractService';
import {loadSignatureCanvas} from '../utils/signaturePad';

const ContractSignScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'ContractSign'>>();
    const c = useThemeColors();
    const contractId = route.params?.contractId;

    const SignatureCanvas = useMemo(() => loadSignatureCanvas(), []);
    const [agreed, setAgreed] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    const submit = async () => {
        if (!contractId) {
            AppToast.warn('계약서 정보가 없어요.');
            return;
        }
        setSubmitting(true);
        try {
            // 서명 이미지는 현재 BE 가 저장하지 않음(타임스탬프만 기록).
            // 캔버스/동의 어느 경로든 서명 의사 확인 후 동일하게 /sign 호출.
            await contractService.sign(contractId);
            setDone(true);
        } catch (e: unknown) {
            AppToast.error(contractErrorMessage(e, '서명에 실패했어요. 잠시 후 다시 시도해 주세요.'));
        } finally {
            setSubmitting(false);
        }
    };

    if (done) {
        return (
            <ScreenContainer header={<AppHeader title="서명 완료" onBack={() => navigation.goBack()} />}>
                <SuccessState
                    title="서명을 완료했어요"
                    description="근로계약서 서명이 안전하게 기록되었어요. 사장님도 확인할 수 있어요."
                    primary={{label: '내 근로계약서로 돌아가기', onPress: () => navigation.goBack()}}
                />
            </ScreenContainer>
        );
    }

    const canSubmit = SignatureCanvas ? hasDrawn : agreed;

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="근로계약서 서명" onBack={() => navigation.goBack()} />}
            footer={
                <CtaStack>
                    <AppButton
                        label="서명 제출"
                        onPress={submit}
                        loading={submitting}
                        disabled={!canSubmit}
                    />
                </CtaStack>
            }>
            <AppText variant="headingSm">서명해 주세요</AppText>
            <AppText variant="bodyMd" tone="secondary" style={styles.sub}>
                근로조건에 동의하시면 아래에 서명해 주세요.
            </AppText>

            {SignatureCanvas ? (
                <View style={[styles.canvasWrap, {borderColor: c.border, backgroundColor: c.background}]}>
                    <SignatureCanvas
                        descriptionText="여기에 서명해 주세요"
                        clearText="지우기"
                        confirmText="확인"
                        autoClear={false}
                        onOK={() => setHasDrawn(true)}
                        onEmpty={() => setHasDrawn(false)}
                        style={styles.canvas}
                    />
                </View>
            ) : (
                <AppCard
                    variant="outlined"
                    selected={agreed}
                    onPress={() => setAgreed(prev => !prev)}
                    accessibilityLabel="서명에 동의합니다"
                    style={styles.agreeCard}>
                    <View style={styles.agreeRow}>
                        <View
                            style={[
                                styles.check,
                                {borderColor: agreed ? c.brandPrimary : c.borderStrong},
                                agreed ? {backgroundColor: c.brandPrimary} : null,
                            ]}>
                            {agreed ? (
                                <AppText variant="caption" tone="inverse" weight="900">
                                    ✓
                                </AppText>
                            ) : null}
                        </View>
                        <AppText variant="titleMd" style={styles.agreeText}>
                            위 근로조건을 확인했으며, 서명에 동의합니다.
                        </AppText>
                    </View>
                </AppCard>
            )}

            <AppText variant="caption" tone="tertiary" style={styles.disclaimer}>
                본 서명은 전자문서 및 전자거래 기본법에 따른 전자서명으로, 위 근로조건에 동의함을 의미합니다. 서명 시 서명 시각이 함께 기록됩니다.
            </AppText>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    sub: {marginTop: spacing.sm, marginBottom: spacing.lg},
    canvasWrap: {
        height: 220,
        borderWidth: 1,
        borderRadius: radius.xl,
        overflow: 'hidden',
    },
    canvas: {flex: 1, width: '100%', height: '100%'},
    agreeCard: {marginTop: spacing.xs},
    agreeRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    check: {
        width: 24,
        height: 24,
        borderRadius: radius.sm,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    agreeText: {flexShrink: 1},
    disclaimer: {marginTop: spacing.lg},
});

export default ContractSignScreen;
