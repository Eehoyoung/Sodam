import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    ErrorState,
    HeroNumber,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';
import {fetchOnboarding, Onboarding} from '../services/onboardingService';

type Route = RouteProp<{O: {storeId?: number; employeeId?: number; employeeName?: string}}, 'O'>;

/**
 * 직원 온보딩 체크리스트 (M-NEW-05 사장 / E-NEW-08 직원).
 * employeeId 있으면 사장 뷰, 없으면 직원 본인 뷰. 다음 단계는 해당 화면으로 안내.
 */
const OnboardingScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<Route>();
    const c = useThemeColors();
    const {storeId, employeeId, employeeName} = route.params ?? {};
    const ownerView = employeeId !== undefined;

    const [data, setData] = useState<Onboarding | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            setData(await fetchOnboarding(storeId, employeeId));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [storeId, employeeId]);

    useEffect(() => {
        load();
    }, [load]);

    // 다음 단계 → 이동할 화면(없으면 버튼 미표시: 직원이 직접 해야 하는 단계)
    const nextAction = (key?: string | null): {label: string; go: () => void} | null => {
        if (!key) {
            return null;
        }
        if (ownerView && storeId !== undefined) {
            if (key === 'CONTRACT') {
                return {label: '근로계약서 보내기', go: () => navigation.navigate('SendContract', {storeId, employeeId, employeeName})};
            }
            if (key === 'WAGE') {
                return {label: '시급 설정하기', go: () => navigation.navigate('WageSettings', {storeId})};
            }
            return null; // FIRST_ATTENDANCE: 직원이 출근해야 완료
        }
        if (ownerView) {
            return null;
        }
        if (key === 'CONTRACT') {
            return {label: '계약서 확인·서명', go: () => navigation.navigate('MyContract')};
        }
        return null;
    };

    const action = data ? nextAction(data.nextStepKey) : null;

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title={ownerView && employeeName ? `${employeeName} 온보딩` : '내 온보딩'} onBack={() => navigation.goBack()} />}
            footer={action ? <AppButton label={action.label} onPress={action.go} /> : undefined}>
            {loading ? (
                <LoadingState />
            ) : error ? (
                <ErrorState
                    title="불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            ) : data ? (
                <View>
                    <HeroNumber
                        label="온보딩 진행"
                        value={`${data.completedCount}/${data.total} 단계`}
                        sub={data.nextStepLabel ? `다음: ${data.nextStepLabel}` : '모든 단계를 마쳤어요'}
                        accent={data.completedCount === data.total}
                    />
                    <View style={styles.list}>
                        {data.steps.map(s => (
                            <AppCard key={s.key} variant="flat">
                                <View style={styles.row}>
                                    <Ionicons
                                        name={s.done ? 'checkmark-circle' : 'ellipse-outline'}
                                        size={22}
                                        color={s.done ? c.success : c.textTertiary}
                                    />
                                    <AppText variant="titleMd" style={styles.flex}>{s.label}</AppText>
                                    <AppText variant="caption" tone={s.done ? 'secondary' : 'tertiary'}>
                                        {s.done ? '완료' : '대기'}
                                    </AppText>
                                </View>
                            </AppCard>
                        ))}
                    </View>
                </View>
            ) : null}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    list: {marginTop: spacing.lg, gap: spacing.sm},
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    flex: {flex: 1},
});

export default OnboardingScreen;
