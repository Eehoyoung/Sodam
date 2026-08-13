import {AppToast, AppButton, AppCard, AppHeader, AppInput, AppText, CtaStack, ScreenContainer, SuccessState} from '../../../common/components/ds';
import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import storeService from '../services/storeService';
import {getErrorMessage, toApiError} from '../../../common/errors';

/**
 * 27 JoinStoreByCode — 확정 시안.
 * 직원이 사장 매장 코드로 가입. QR 은 추후 카메라 SDK. submit 로직 보존.
 */
/** 개발 시각 검증에서 매장 가입 성공 상태를 고정한다. */
export interface JoinStoreByCodeVisualFixture {
    joinedStore: string;
}

interface JoinStoreByCodeScreenProps {
    visualFixture?: JoinStoreByCodeVisualFixture;
}

const JoinStoreByCodeScreen: React.FC<JoinStoreByCodeScreenProps> = ({visualFixture}) => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const c = useThemeColors();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [joinedStore, setJoinedStore] = useState<string | null>(visualFixture?.joinedStore ?? null);

    const submit = async () => {
        const normalized = code.trim().toUpperCase();
        if (normalized.length < 8) {
            AppToast.warn('매장 코드는 보통 ST 로 시작하는 12자 이상이에요.');
            return;
        }
        setLoading(true);
        setErrorMessage(null);
        try {
            const result = await storeService.joinByCode(normalized);
            setJoinedStore(result?.storeName ?? '매장');
        } catch (e: unknown) {
            // getErrorMessage 는 fallback 을 넘겨야 화면 문구가 산다 — 인자 없이 부르면 서버가
            // message 를 안 준 404 에서 axios 의 영문 문자열이 그대로 사용자에게 노출된다.
            const msg = getErrorMessage(
                e,
                toApiError(e).status === 404
                    ? '매장 코드와 일치하는 매장을 찾을 수 없어요.'
                    : '잠시 후 다시 시도해 주세요.',
            );
            setErrorMessage(msg);
            AppToast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    if (joinedStore) {
        return (
            <ScreenContainer header={<AppHeader title="매장 가입" rightText="닫기" onRightText={() => navigation.goBack()} />}>
                <SuccessState
                    glyph={<Text style={[styles.stateGlyph, {color: c.success}]}>✓</Text>}
                    markColor={c.successBg}
                    title={`${joinedStore}에\n가입했어요`}
                    description="오늘부터 출퇴근 기록과 급여명세를 확인할 수 있어요. 기존 매장 기록은 그대로예요."
                    primary={{label: '출근 화면으로', onPress: () => navigation.goBack()}}
                />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="매장 가입" onBack={() => navigation.goBack()} actions={[{label: 'QR', onPress: () => AppToast.show('QR 스캔은 정식 출시 직전 활성화돼요.')}]} />}
            footer={
                <CtaStack bordered>
                    <AppButton label="매장 가입하기" loading={loading} disabled={code.trim().length < 8} onPress={submit} />
                </CtaStack>
            }>
            <AppCard variant="spot" hero>
                <AppText variant="headingSm" tone="primary">사장님께 받은 코드를 입력하세요</AppText>
                <AppText variant="bodyMd" tone="secondary" style={styles.heroSub}>
                    가입하면 오늘부터 출퇴근과 급여명세를 확인할 수 있어요. 기존에 소속된 매장 기록은 그대로 유지돼요.
                </AppText>
            </AppCard>

            <AppInput
                value={code}
                onChangeText={(v: string) => setCode(v.toUpperCase())}
                placeholder="예: ST1234ABCD"
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!loading}
                helper="대소문자 구분 없이 입력해도 괜찮아요."
                style={styles.codeInput}
                containerStyle={styles.codeWrap}
            />
            {errorMessage ? (
                <AppText variant="bodyMd" tone="error" weight="700" style={styles.errorMessage}>
                    {errorMessage}
                </AppText>
            ) : null}

            <View style={[styles.qrPlaceholder, {borderColor: c.border, backgroundColor: c.background}]}>
                <Ionicons name="qr-code-outline" size={48} color={c.textTertiary} />
                <AppText variant="titleMd">QR 스캔으로 가입하기</AppText>
                <AppText variant="caption" tone="tertiary" center style={styles.qrBody}>
                    카메라 권한 허용 후 매장 QR 을 비춰주세요. (정식 출시 직전 활성화)
                </AppText>
            </View>

            <Pressable
                onPress={() =>
                    AppToast.show('사장님 앱의 매장 코드 또는 카운터 QR 에서 확인할 수 있어요.')
                }
                style={({pressed}) => [styles.helpRow, pressed && {opacity: 0.5}]}>
                <AppText variant="caption" tone="brand" weight="700">매장 코드는 어디서 받나요?</AppText>
            </Pressable>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    heroSub: {marginTop: spacing.xs, opacity: 0.82},
    codeWrap: {marginTop: spacing.lg},
    codeInput: {fontSize: 22, letterSpacing: 4, fontWeight: '900', textAlign: 'center'},
    errorMessage: {marginTop: spacing.sm},
    qrPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: radius.xl,
        padding: spacing.xxl,
        gap: spacing.sm,
        marginTop: spacing.lg,
    },
    qrBody: {marginTop: 2},
    helpRow: {alignItems: 'center', paddingVertical: spacing.lg},
    stateGlyph: {fontSize: 22, fontWeight: '900'},
});

export default JoinStoreByCodeScreen;
