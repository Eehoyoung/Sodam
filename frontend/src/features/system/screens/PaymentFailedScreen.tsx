import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppButton, AppText, Brandmark, ScreenContainer} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';

interface Props {
    onRetry: () => void;
    onChangeMethod?: () => void;
    onSupport?: () => void;
}

/**
 * A4 결제 실패 / 재시도 결과 (갭분석 P0).
 * ⚠️ 표현/라우팅만 — 금액 계산·PG 트리거는 변경하지 않음 (CLAUDE.md 승인필수).
 */
const PaymentFailedScreen: React.FC<Props> = ({onRetry, onChangeMethod, onSupport}) => {
    const c = useThemeColors();
    return (
    <ScreenContainer>
        <View style={styles.center}>
            <Brandmark size={56} label="!" backgroundColor={c.error} />
            <AppText variant="headingMd" center style={styles.title}>결제를 마치지 못했어요</AppText>
            <AppText variant="bodyMd" tone="secondary" center style={styles.desc}>
                카드 정보나 한도를 확인한 뒤 다시 시도해 주세요. 요금이 중복 청구되지는 않아요.
            </AppText>
            <View style={styles.ctas}>
                <AppButton label="다시 결제하기" onPress={onRetry} />
                {onChangeMethod ? <AppButton label="다른 결제 수단" variant="secondary" onPress={onChangeMethod} /> : null}
                {onSupport ? <AppButton label="고객지원 보기" variant="ghost" onPress={onSupport} /> : null}
            </View>
        </View>
    </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    center: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl},
    title: {marginTop: spacing.md},
    desc: {marginTop: spacing.sm, maxWidth: 320},
    ctas: {alignSelf: 'stretch', marginTop: spacing.xl, gap: spacing.sm},
});

export default PaymentFailedScreen;
