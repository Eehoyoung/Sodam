import {AppToast} from '../../../common/components/ds';
import React, {useEffect, useState} from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {useRoute} from '@react-navigation/native';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppListItem,
    AppText,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {formatWage} from '../../../common/utils/format';
import api from '../../../common/utils/api';

/**
 * 18 WageSettings — 확정 시안.
 * 매장 기본 시급 변경(최저임금 경고) + 변경 이력. 적용 로직 보존.
 */
const WageSettingsScreen: React.FC = () => {
    const route = useRoute<any>();
    const storeId = route.params?.storeId as number | undefined;

    const [standardWage, setStandardWage] = useState('');
    const [history, setHistory] = useState<Array<any>>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            if (!storeId) {
                return;
            }
            try {
                const storeRes = await api.get<any>(`/api/stores/${storeId}`);
                const wage = storeRes.data?.storeStandardHourWage;
                if (wage) {
                    setStandardWage(String(wage));
                }
            } catch (_) {/* ignore */}
            try {
                const hRes = await api.get<any[]>(`/api/wages/store/${storeId}/history`);
                setHistory((hRes.data as any[]) ?? []);
            } catch (_) {/* TODO[P2 BE]: WageHistory 조회 API 미노출 */}
        })();
    }, [storeId]);

    const submit = async () => {
        const n = parseInt(standardWage.replace(/[^0-9]/g, ''), 10);
        if (!n || n < 1) {
            Alert.alert('확인 필요', '시급은 1원 이상이어야 해요.');
            return;
        }
        if (n < 9860) {
            Alert.alert('주의', `2026년 최저시급(가정 ₩9,860)보다 낮은 시급이에요.\n그래도 적용하시겠어요?`, [
                {text: '취소', style: 'cancel'},
                {text: '적용', onPress: () => applyWage(n)},
            ]);
            return;
        }
        applyWage(n);
    };

    const applyWage = async (wage: number) => {
        setLoading(true);
        try {
            await api.put(`/api/wages/store/${storeId}/standard`, null, {params: {standardHourlyWage: wage}});
            AppToast.success('매장 기본 시급이 변경됐어요.');
        } catch (e: any) {
            try {
                await api.put(`/api/wages/store/${storeId}/standard`, {standardHourlyWage: wage});
                AppToast.success('매장 기본 시급이 변경됐어요.');
            } catch (e2: any) {
                Alert.alert('실패', e2?.response?.data?.message ?? '시급 변경에 실패했어요.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenContainer scroll header={<AppHeader title="시급 정책" />}>
            <AppCard variant="warm">
                <AppText variant="titleMd">매장 기본 시급</AppText>
                <AppText variant="caption" tone="secondary" style={styles.hint}>
                    직원별 개별 시급이 설정되지 않은 경우 이 시급이 적용돼요.
                </AppText>
                <AppInput
                    label="시급 (원/시간)"
                    value={standardWage}
                    onChangeText={setStandardWage}
                    keyboardType="number-pad"
                    placeholder="예: 12000"
                    helper="2026년 최저시급은 ₩9,860 입니다 (가정)."
                    containerStyle={styles.input}
                />
                <AppButton label="시급 변경하기" size="md" loading={loading} onPress={submit} style={styles.cta} />
            </AppCard>

            <AppText variant="titleMd" style={styles.sectionTitle}>변경 이력</AppText>
            {history.length === 0 ? (
                <AppText variant="caption" tone="tertiary" style={styles.empty}>
                    변경 이력이 없어요. 시급 변경 시 자동으로 기록돼요.
                </AppText>
            ) : (
                <View style={styles.list}>
                    {history.map((h, idx) => (
                        <AppListItem
                            key={idx}
                            title={h.effectiveFrom ?? '-'}
                            subtitle={h.reason ?? '시급 변경'}
                            right={<AppText variant="titleMd" tone="brand">{h.hourlyWage ? formatWage(h.hourlyWage) : '-'}</AppText>}
                        />
                    ))}
                </View>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    hint: {marginTop: 4},
    input: {marginTop: spacing.md},
    cta: {marginTop: spacing.md},
    sectionTitle: {marginTop: spacing.xl, marginBottom: spacing.sm},
    empty: {paddingVertical: spacing.md, lineHeight: 20},
    list: {gap: spacing.sm},
});

export default WageSettingsScreen;
