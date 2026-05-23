import React, {useEffect, useState} from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute} from '@react-navigation/native';
import {tokens} from '../../../theme/tokens';
import Card from '../../../common/components/data-display/Card';
import Input from '../../../common/components/form/Input';
import Button from '../../../common/components/form/Button';
import api from '../../../common/utils/api';

/**
 * 사장 시급 설정 화면 (PRD_OWNER S-501c).
 *
 * - 매장 기본 시급 변경 (즉시 반영)
 * - 직원별 개별 시급 (오버라이드)
 * - 변경 이력 (BE WageHistory 기반)
 */
const WageSettingsScreen: React.FC = () => {
    const route = useRoute<any>();
    const storeId = route.params?.storeId as number | undefined;

    const [standardWage, setStandardWage] = useState('');
    const [history, setHistory] = useState<Array<any>>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            if (!storeId) return;
            try {
                const storeRes = await api.get<any>(`/api/stores/${storeId}`);
                const wage = storeRes.data?.storeStandardHourWage;
                if (wage) setStandardWage(String(wage));
            } catch (_) {/* ignore */}
            try {
                const hRes = await api.get<any[]>(`/api/wages/store/${storeId}/history`);
                setHistory((hRes.data as any[]) ?? []);
            } catch (_) {/* TODO[P2 BE]: WageHistory 조회 API 미노출 — 추후 추가 */}
        })();
    }, [storeId]);

    const submit = async () => {
        const n = parseInt(standardWage.replace(/[^0-9]/g, ''), 10);
        if (!n || n < 1) {
            Alert.alert('확인 필요', '시급은 1원 이상이어야 해요.');
            return;
        }
        if (n < 9860) {
            Alert.alert(
                '주의',
                `2026년 최저시급(가정 ₩9,860)보다 낮은 시급이에요.\n그래도 적용하시겠어요?`,
                [
                    {text: '취소', style: 'cancel'},
                    {text: '적용', onPress: () => applyWage(n)},
                ],
            );
            return;
        }
        applyWage(n);
    };

    const applyWage = async (wage: number) => {
        setLoading(true);
        try {
            await api.put(`/api/wages/store/${storeId}/standard`, null, {params: {standardHourlyWage: wage}});
            Alert.alert('완료', '매장 기본 시급이 변경됐어요.');
        } catch (e: any) {
            // 일부 BE 는 body 로 받음 — 둘 다 시도
            try {
                await api.put(`/api/wages/store/${storeId}/standard`, {standardHourlyWage: wage});
                Alert.alert('완료', '매장 기본 시급이 변경됐어요.');
            } catch (e2: any) {
                Alert.alert('실패', e2?.response?.data?.message ?? '시급 변경에 실패했어요.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.title}>매장 기본 시급</Text>
                    <Text style={styles.subtitle}>
                        직원별 개별 시급이 설정되지 않은 경우 이 시급이 적용돼요.
                    </Text>

                    <Card bordered>
                        <Input
                            label="시급 (원/시간)"
                            value={standardWage}
                            onChangeText={setStandardWage}
                            keyboardType="number-pad"
                            placeholder="예: 12000"
                            helperText="2026년 최저시급은 ₩9,860 입니다 (가정)."
                        />
                        <Button
                            title="시급 변경하기"
                            onPress={submit}
                            variant="primary"
                            size="md"
                            fullWidth
                            loading={loading}
                            style={{marginTop: tokens.spacing.md}}
                        />
                    </Card>

                    <Text style={styles.sectionTitle}>변경 이력</Text>
                    {history.length === 0 ? (
                        <Text style={styles.empty}>
                            변경 이력이 없어요.{'\n'}시급 변경 시 자동으로 기록돼요.
                        </Text>
                    ) : (
                        history.map((h, idx) => (
                            <View key={idx} style={styles.historyRow}>
                                <View>
                                    <Text style={styles.historyDate}>{h.effectiveFrom ?? '-'}</Text>
                                    <Text style={styles.historyReason}>{h.reason ?? '시급 변경'}</Text>
                                </View>
                                <Text style={styles.historyWage}>
                                    {h.hourlyWage?.toLocaleString('ko-KR') ?? '-'}원
                                </Text>
                            </View>
                        ))
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: tokens.colors.background},
    flex: {flex: 1},
    scrollContent: {padding: tokens.spacing.lg, paddingBottom: tokens.spacing.huge},
    title: {
        fontSize: tokens.typography.sizes.xxl,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.textPrimary,
        marginTop: tokens.spacing.md,
        marginBottom: tokens.spacing.xs,
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: tokens.typography.sizes.md,
        color: tokens.colors.textSecondary,
        marginBottom: tokens.spacing.lg,
    },
    sectionTitle: {
        fontSize: tokens.typography.sizes.md,
        fontWeight: tokens.typography.weights.semibold,
        color: tokens.colors.textSecondary,
        marginTop: tokens.spacing.xxl,
        marginBottom: tokens.spacing.sm,
    },
    empty: {color: tokens.colors.textTertiary, padding: tokens.spacing.lg, lineHeight: 22},
    historyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: tokens.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: tokens.colors.divider,
    },
    historyDate: {fontSize: tokens.typography.sizes.md, color: tokens.colors.textPrimary, fontWeight: '500'},
    historyReason: {fontSize: tokens.typography.sizes.xs, color: tokens.colors.textTertiary, marginTop: 2},
    historyWage: {
        fontSize: tokens.typography.sizes.lg,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.brandPrimary,
    },
});

export default WageSettingsScreen;
