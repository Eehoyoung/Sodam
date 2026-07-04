import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {
    AppBadge,
    AppHeader,
    AppListItem,
    AppText,
    EmptyState,
    LoadingState,
    ScreenContainer,
    SegmentedControl,
} from '../../../common/components/ds';
import {formatMoney} from '../../../common/utils/format';
import RoleTabBar from '../../../common/components/navigation/RoleTabBar';
import {spacing} from '../../../theme/tokens';
import {useAuth} from '../../../contexts/AuthContext';
import payrollService, {ArchiveItem} from '../services/payrollService';

/**
 * A12 명세서 보관함 / 지난 급여명세 (갭분석 추가).
 * 퇴사 후·세무 목적의 과거 명세 재열람. 본인 employeeId 의 급여 목록을 연도로 조회.
 */
const SalaryArchiveScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const {user} = useAuth();
    const [year, setYear] = useState(0); // 0=올해, 1=작년
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<ArchiveItem[]>([]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            try {
                const employeeId = user?.id;
                if (!employeeId) {
                    if (mounted) {setItems([]);}
                    return;
                }
                const target = new Date().getFullYear() - year;
                const list = await payrollService.listArchive(employeeId, target).catch(() => []);
                if (mounted) {
                    setItems(Array.isArray(list) ? list : []);
                }
            } catch (_) {
                if (mounted) {
                    setItems([]);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        })();
        return () => {
            mounted = false;
        };
    }, [year, user?.id]);

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="지난 급여명세" onBack={() => navigation.goBack()} />}
            footer={<RoleTabBar active="salary" />}>
            <AppText variant="bodyMd" tone="secondary" style={styles.intro}>
                퇴사·세무 목적의 과거 명세서를 다시 열어볼 수 있어요.
            </AppText>
            <SegmentedControl options={['올해', '작년']} value={year} onChange={setYear} />

            {loading ? (
                <LoadingState title="불러오는 중" description="지난 명세서를 정리하고 있어요" />
            ) : items.length === 0 ? (
                <EmptyState
                    glyph="₩"
                    title="아직 발급된 명세서가 없어요"
                    description="급여 정산을 마치면 발급한 명세서가 여기에 보관돼요."
                />
            ) : (
                <View style={styles.list}>
                    {items.map(it => (
                        <AppListItem
                            key={it.payrollId}
                            title={`${it.period} · ${it.employeeName}`}
                            subtitle={formatMoney(it.netPay)}
                            right={<AppBadge label={it.issued ? '발급' : '대기'} tone={it.issued ? 'success' : 'warning'} />}
                            onPress={() => navigation.navigate('SalaryDetail', {payrollId: it.payrollId})}
                        />
                    ))}
                </View>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    intro: {marginBottom: spacing.lg},
    list: {marginTop: spacing.lg, gap: spacing.md},
});

export default SalaryArchiveScreen;
