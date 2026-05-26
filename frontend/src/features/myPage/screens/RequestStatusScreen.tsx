import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {
    AppBadge,
    AppCard,
    AppHeader,
    AppText,
    EmptyState,
    ScreenContainer,
    SegmentedControl,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';

type ReqType = 'correction' | 'timeoff' | 'inquiry';
type ReqStatus = 'pending' | 'approved' | 'rejected';

interface RequestItem {
    id: number;
    type: ReqType;
    title: string;
    date: string;
    status: ReqStatus;
    rejectReason?: string;
}

const TYPE_LABEL: Record<ReqType, string> = {correction: '정정', timeoff: '휴가', inquiry: '문의'};
const STATUS: Record<ReqStatus, {label: string; tone: 'warning' | 'success' | 'error'}> = {
    pending: {label: '승인 대기', tone: 'warning'},
    approved: {label: '승인됨', tone: 'success'},
    rejected: {label: '반려됨', tone: 'error'},
};

/**
 * A14 정정/휴가/문의 처리 상태 추적 (갭분석 P1).
 * 직원이 보낸 요청의 진행 상태를 한곳에서 확인. 반려 시 사유 표시.
 * TODO[BE]: GET /api/requests/my — 현재는 화면/상태 구조만 제공.
 */
const RequestStatusScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const [tab, setTab] = useState(0); // 0 전체 1 대기 2 처리됨

    // 실데이터 연결 전 표시용 (BE 연동 시 교체)
    const [items] = useState<RequestItem[]>([]);

    const filtered = items.filter(it =>
        tab === 0 ? true : tab === 1 ? it.status === 'pending' : it.status !== 'pending',
    );

    return (
        <ScreenContainer scroll header={<AppHeader title="내 요청" onBack={() => navigation.goBack()} />}>
            <SegmentedControl options={['전체', '대기', '처리됨']} value={tab} onChange={setTab} />

            {filtered.length === 0 ? (
                <EmptyState
                    glyph="🗂"
                    markColor="#F1EEE9"
                    title="보낸 요청이 없어요"
                    description="정정·휴가·문의를 보내면 여기서 진행 상태를 확인할 수 있어요."
                />
            ) : (
                <View style={styles.list}>
                    {filtered.map(it => (
                        <AppCard key={it.id} variant="flat">
                            <View style={styles.row}>
                                <View style={styles.flex}>
                                    <AppText variant="titleMd">{TYPE_LABEL[it.type]} · {it.title}</AppText>
                                    <AppText variant="caption" tone="tertiary" style={styles.date}>{it.date}</AppText>
                                </View>
                                <AppBadge label={STATUS[it.status].label} tone={STATUS[it.status].tone} />
                            </View>
                            {it.status === 'rejected' && it.rejectReason ? (
                                <AppText variant="caption" tone="error" style={styles.reason}>
                                    사장님 사유: {it.rejectReason}
                                </AppText>
                            ) : null}
                        </AppCard>
                    ))}
                </View>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    list: {marginTop: spacing.md, gap: spacing.sm},
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    flex: {flex: 1},
    date: {marginTop: 2},
    reason: {marginTop: spacing.sm},
});

export default RequestStatusScreen;
