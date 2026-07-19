import {AppToast, ConfirmSheet, AppButton, AppCard, AppHeader, AppInput, AppListItem, AmountText, AppText, CtaStack, ScreenContainer} from '../../../common/components/ds';
import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {spacing} from '../../../theme/tokens';
import {formatWage} from '../../../common/utils/format';
import storeService from '../services/storeService';
import {wageService} from '../../wage/services/wageService';

/**
 * 18 WageSettings — v3 토스식.
 * 히어로: 현재 매장 기본 시급(AmountText). 한 입력 + 하단 CTA. 아래 변경 이력.
 * 최저임금 경고 + PUT /api/wages/store/{id}/standard + history GET 로직 보존.
 */
const WageSettingsScreen: React.FC = () => {
    const route = useRoute<RouteProp<HomeStackParamList, 'WageSettings'>>();
    const navigation = useNavigation();
    const storeId = route.params.storeId;

    const [currentWage, setCurrentWage] = useState<number | null>(null);
    const [standardWage, setStandardWage] = useState('');
    const [history, setHistory] = useState<Array<any>>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            if (!storeId) {
                return;
            }
            try {
                const store = await storeService.getStoreById(storeId);
                const wage = store.storeStandardHourWage;
                if (wage) {
                    setCurrentWage(wage);
                    setStandardWage(String(wage));
                }
            } catch (_) {/* ignore */}
            try {
                const list = await wageService.getStandardWageHistory(storeId);
                setHistory(list);
            } catch (_) {/* TODO[P2 BE]: WageHistory 조회 API 미노출 */}
        })();
    }, [storeId]);

    const submit = async () => {
        const n = parseInt(standardWage.replace(/[^0-9]/g, ''), 10);
        if (!n || n < 1) {
            AppToast.warn('시급은 1원 이상이어야 해요.');
            return;
        }
        if (n < 9860) {
            ConfirmSheet.confirm({
                title: '최저시급보다 낮아요',
                description: '2026년 최저시급(가정 ₩9,860)보다 낮은 시급이에요. 그래도 적용할까요?',
                primary: {label: '그래도 적용', destructive: true, onPress: () => applyWage(n)},
                secondary: {label: '취소'},
            });
            return;
        }
        applyWage(n);
    };

    const applyWage = async (wage: number) => {
        setLoading(true);
        try {
            await wageService.putStandardHourlyWage(storeId, wage);
            setCurrentWage(wage);
            AppToast.success('매장 기본 시급이 변경됐어요.');
        } catch (e: any) {
            AppToast.error(e?.response?.data?.message ?? '시급 변경에 실패했어요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="시급 정책" onBack={() => navigation.goBack()} />}
            footer={
                <CtaStack>
                    <AppButton label="시급 변경하기" loading={loading} onPress={submit} />
                </CtaStack>
            }>
            {/* 히어로: 현재 시급 */}
            <View style={styles.hero}>
                <AppText variant="caption" tone="secondary">현재 매장 기본 시급</AppText>
                <AmountText size={48} tone="primary" style={styles.heroAmount}>
                    {currentWage ? `${currentWage.toLocaleString()}원` : '미설정'}
                </AmountText>
                <AppText variant="caption" tone="tertiary" style={styles.heroSub}>
                    직원별 개별 시급이 없으면 이 시급이 적용돼요.
                </AppText>
            </View>

            <View style={styles.inputSection}>
                <AppInput
                    label="새 시급 (원/시간)"
                    value={standardWage}
                    onChangeText={setStandardWage}
                    keyboardType="number-pad"
                    placeholder="예: 12000"
                    helper="2026년 최저시급은 ₩9,860 입니다 (가정)."
                />
            </View>

            <View style={styles.section}>
                <AppText variant="titleMd" tone="secondary" style={styles.sectionTitle}>변경 이력</AppText>
                {history.length === 0 ? (
                    <AppCard variant="plain">
                        <AppText variant="bodyMd" tone="tertiary" style={styles.empty}>
                            변경 이력이 없어요. 시급 변경 시 자동으로 기록돼요.
                        </AppText>
                    </AppCard>
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
            </View>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    hero: {marginBottom: spacing.sm},
    heroAmount: {marginTop: spacing.xs},
    heroSub: {marginTop: spacing.xs},
    inputSection: {marginTop: spacing.xxl},
    section: {marginTop: spacing.xxl},
    sectionTitle: {marginBottom: spacing.md},
    empty: {lineHeight: 20},
    list: {gap: spacing.sm},
});

export default WageSettingsScreen;
