import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
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
import {spacing} from '../../../theme/tokens';
import payrollService from '../services/payrollService';

interface ArchiveItem {
    payrollId: number;
    period: string;
    employeeName: string;
    netPay: number;
    issued: boolean;
}

/**
 * A12 명세서 보관함 / 지난 급여명세 (갭분석 추가).
 * 퇴사 후·세무 목적의 과거 명세 재열람. payrollService 조회 로직 사용.
 */
const SalaryArchiveScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const [year, setYear] = useState(0); // 0=올해, 1=작년
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<ArchiveItem[]>([]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            try {
                const target = new Date().getFullYear() - year;
                const list = await (payrollService as any)
                    .listArchive?.(target)
                    .catch(() => []) ?? [];
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
    }, [year]);

    return (
        <ScreenContainer scroll header={<AppHeader title="지난 급여명세" onBack={() => navigation.goBack()} />}>
            <SegmentedControl options={['올해', '작년']} value={year} onChange={setYear} />

            {loading ? (
                <LoadingState title="불러오는 중" description="지난 명세서를 정리하고 있어요" />
            ) : items.length === 0 ? (
                <EmptyState
                    glyph="🗃"
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
    list: {marginTop: spacing.md, gap: spacing.sm},
});

export default SalaryArchiveScreen;
