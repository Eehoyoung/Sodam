import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Share, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    AppToast,
    ScreenContainer,
} from '../../../common/components/ds';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import myHistoryService, {
    type MyAttendanceItem,
    type MyContractItem,
} from '../services/myHistoryService';

const PAGE_SIZE = 30;

const formatMinutes = (minutes: number) => {
    if (!minutes || minutes <= 0) {
        return '0분';
    }
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
};

const formatTime = (iso: string | null) => (iso ? iso.slice(11, 16) : '—');

/**
 * 내 소담 근무 기록 (WP-H·K.2).
 *
 * <p>퇴사한 매장의 기록까지 한 화면에서 본다. 기존 조회 경로는 전부 storeId 를 알아야 호출할 수
 * 있어서 "내가 일했던 모든 매장"을 모으지 못했다 — 개인 모드 사용자는 자기가 어느 매장 id 에서
 * 일했는지 모른다.</p>
 *
 * <p><b>이 화면이 보존기간 고지의 착지점이다.</b> 파기 30/15/1일 전 메일이 "마이페이지 &gt;
 * 내 근무 기록에서 내려받으세요"라고 안내한다. 파기된 기록은 되돌릴 수 없으므로 내려받기를
 * 눈에 띄게 두고, 왜 내려받아야 하는지도 함께 설명한다.</p>
 *
 * <p>⚠️ 여기 보이는 기록은 <b>사장님 승인을 거친 매장 기록</b>이다. 개인 모드에서 스스로 남긴
 * 자기신고 기록과 증명력이 다르므로 화면에서 섞어 보여주지 않는다(PRD §4.14).</p>
 */
const MyWorkHistoryScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const c = useThemeColors();

    const [attendance, setAttendance] = useState<MyAttendanceItem[]>([]);
    const [contracts, setContracts] = useState<MyContractItem[]>([]);
    const [total, setTotal] = useState(0);
    const [hasNext, setHasNext] = useState(false);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [failed, setFailed] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            const [first, contractList] = await Promise.all([
                myHistoryService.fetchMyAttendance(0, PAGE_SIZE),
                myHistoryService.fetchMyContracts(),
            ]);
            setAttendance(first.items);
            setTotal(first.totalElements);
            setHasNext(first.hasNext);
            setPage(0);
            setContracts(contractList);
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const loadMore = useCallback(async () => {
        if (!hasNext || loadingMore) {
            return;
        }
        setLoadingMore(true);
        try {
            const next = await myHistoryService.fetchMyAttendance(page + 1, PAGE_SIZE);
            setAttendance(prev => [...prev, ...next.items]);
            setHasNext(next.hasNext);
            setPage(next.page);
        } catch {
            AppToast.error('기록을 더 불러오지 못했어요.');
        } finally {
            setLoadingMore(false);
        }
    }, [hasNext, loadingMore, page]);

    const download = useCallback(async () => {
        setDownloading(true);
        try {
            const csv = await myHistoryService.fetchMyAttendanceCsv();
            // 이 프로젝트에는 네이티브 파일 저장 라이브러리가 없어, 증명서·명세서와 동일하게
            // 공유 시트로 내보낸다(메일·메모 앱 등으로 사용자가 직접 보관).
            await Share.share({message: csv, title: '소담 근무 기록'});
        } catch {
            AppToast.error('내려받기에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setDownloading(false);
        }
    }, []);

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="내 근무 기록" onBack={() => navigation.goBack()} />}>

            {/* 왜 내려받아야 하는지 — 보존기간 고지 메일과 같은 이야기를 화면에서도 한다. */}
            <AppCard variant="spot" style={styles.card}>
                <AppText variant="titleMd" weight="700">소담으로 남긴 근무 기록</AppText>
                <AppText variant="caption" tone="secondary" style={styles.desc}>
                    퇴사한 매장의 기록도 그대로 볼 수 있어요. 다만 근로기준법에 따라 3년이 지나면
                    파기되고, 파기된 기록은 되돌릴 수 없어요. 필요하시면 미리 내려받아 보관해 주세요.
                </AppText>
                <AppButton
                    label={downloading ? '준비 중…' : '기록 내려받기'}
                    onPress={download}
                    disabled={downloading}
                    style={styles.downloadBtn}
                />
            </AppCard>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={c.brandPrimary} />
                </View>
            ) : failed ? (
                <AppCard variant="plain" style={styles.card}>
                    <AppText variant="bodyMd">기록을 불러오지 못했어요.</AppText>
                    <AppButton label="다시 시도" variant="secondary" onPress={load} style={styles.retryBtn} />
                </AppCard>
            ) : (
                <>
                    <AppCard variant="plain" style={styles.card}>
                        <View style={styles.sectionHead}>
                            <AppText variant="titleMd" weight="700">출퇴근</AppText>
                            <AppText variant="caption" tone="secondary">총 {total}건</AppText>
                        </View>

                        {attendance.length === 0 ? (
                            <AppText variant="caption" tone="secondary" style={styles.empty}>
                                아직 소담으로 남긴 출퇴근 기록이 없어요.
                            </AppText>
                        ) : (
                            attendance.map(item => (
                                <View key={item.id} style={[styles.row, {borderBottomColor: c.border}]}>
                                    <View style={styles.rowMain}>
                                        <AppText variant="bodyMd" weight="600" numberOfLines={1}>
                                            {item.storeName || '이름 없는 매장'}
                                        </AppText>
                                        <AppText variant="caption" tone="secondary">
                                            {item.workDate ?? '—'} · {formatTime(item.checkInTime)}~{formatTime(item.checkOutTime)}
                                        </AppText>
                                    </View>
                                    <AppText variant="caption" weight="600">
                                        {formatMinutes(item.workingMinutes)}
                                    </AppText>
                                </View>
                            ))
                        )}

                        {hasNext && (
                            <AppButton
                                label={loadingMore ? '불러오는 중…' : '더 보기'}
                                variant="secondary"
                                onPress={loadMore}
                                disabled={loadingMore}
                                style={styles.moreBtn}
                            />
                        )}
                    </AppCard>

                    <AppCard variant="plain" style={styles.card}>
                        <AppText variant="titleMd" weight="700" style={styles.sectionTitle}>근로계약</AppText>
                        {contracts.length === 0 ? (
                            <AppText variant="caption" tone="secondary" style={styles.empty}>
                                등록된 근로계약이 없어요.
                            </AppText>
                        ) : (
                            contracts.map(contract => (
                                <View key={contract.id} style={[styles.row, {borderBottomColor: c.border}]}>
                                    <View style={styles.rowMain}>
                                        <AppText variant="bodyMd" weight="600">
                                            {contract.startDate ?? '—'} ~ {contract.endDate ?? '기간 없음'}
                                        </AppText>
                                        <AppText variant="caption" tone="secondary">
                                            {contract.hourlyWage
                                                ? `시급 ${contract.hourlyWage.toLocaleString()}원`
                                                : contract.monthlyBaseSalary
                                                    ? `월급 ${contract.monthlyBaseSalary.toLocaleString()}원`
                                                    : '임금 정보 없음'}
                                        </AppText>
                                    </View>
                                </View>
                            ))
                        )}
                    </AppCard>

                    {/* 증명력 구분 — 개인 모드의 자기신고 기록과 섞이지 않게 명시한다(PRD §4.14). */}
                    <AppCard variant="plain" style={styles.card}>
                        <AppBadge label="사장님 승인 기록" tone="success" />
                        <AppText variant="caption" tone="secondary" style={styles.note}>
                            이 화면의 기록은 매장에서 사장님 확인을 거쳐 남은 것이에요.
                            개인 모드에서 직접 남긴 기록은 본인 자기신고라 증명력이 달라, 여기에 함께 표시하지 않아요.
                        </AppText>
                    </AppCard>
                </>
            )}
        </ScreenContainer>
    );
};

// 테마 색은 사용처에서 인라인으로 얹는다 — 팩토리(createStyles)로 감싸면
// react-native/no-unused-styles 가 스타일 사용처를 추적하지 못한다(코드베이스 공통 관행).
const styles = StyleSheet.create({
    card: {marginBottom: spacing.md},
    desc: {marginTop: spacing.xs, lineHeight: 20},
    downloadBtn: {marginTop: spacing.md},
    retryBtn: {marginTop: spacing.sm},
    moreBtn: {marginTop: spacing.md},
    center: {paddingVertical: spacing.xl, alignItems: 'center'},
    sectionHead: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    sectionTitle: {marginBottom: spacing.sm},
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    rowMain: {flex: 1, marginRight: spacing.sm, gap: 2},
    empty: {paddingVertical: spacing.md},
    note: {marginTop: spacing.sm, lineHeight: 20},
});

export default MyWorkHistoryScreen;
