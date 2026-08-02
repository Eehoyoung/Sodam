/* eslint-disable react-native/no-color-literals -- 히어로 그라디언트 위 반투명 흰색 데코(MasterMyPageScreen 패턴과 동일) */
/**
 * AttendanceCreditSummaryCard — 마이페이지 출근권 상시 카드(§5 "상시 접근": 마이페이지 "출근권"
 * 메뉴에서 잔액/소멸 예정 수량/스트릭 이력 확인). 목업(recruitment-design-artifacts.html
 * "💳 출근권 충전소" 화면의 balance-card + streak-strip)의 그라디언트 히어로를 그대로 옮긴다.
 *
 * 홈 진입 팝업(`AttendanceCreditPopupHost`)을 닫아도 이 카드로 언제든 같은 출석체크 시트를
 * 다시 열 수 있다 — "닫아도 마이페이지에서 상시 접근 가능해야 함" 요구사항을 충족.
 *
 * 충전소(IAP, Phase C) — `features/attendanceCredit/screens/AttendanceCreditChargeScreen`로 연결.
 */
import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {AppBadge, AppText} from '../../../common/components/ds';
import {radius, recruit, shadow, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {useAttendanceCreditSummary} from '../hooks/useAttendanceCreditQueries';
import {AttendanceCheckInSheet} from './AttendanceCheckInSheet';

const DAY_LABELS: Record<string, string> = {
    MON: '월',
    TUE: '화',
    WED: '수',
    THU: '목',
    FRI: '금',
    SAT: '토',
    SUN: '일',
};

export const AttendanceCreditSummaryCard: React.FC = () => {
    const c = useThemeColors();
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const {data: summary, isLoading, isError} = useAttendanceCreditSummary();
    const [sheetVisible, setSheetVisible] = useState(false);

    // 보조 도메인 카드 — 로딩/에러는 마이페이지 다른 섹션(정책/노무 정보)과 동일하게 조용히 숨긴다.
    if (isLoading || isError || !summary) {
        return null;
    }

    return (
        <>
            <View style={styles.wrap} testID="attendance-credit-summary-card">
                <LinearGradient
                    colors={recruit.gradient}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.hero}>
                    <View style={styles.heroTop}>
                        <View style={styles.shrink}>
                            <AppText variant="caption" tone="inverse" style={styles.heroLabel}>보유 출근권</AppText>
                            <AppText variant="headingLg" tone="inverse" weight="800">{`${summary.balance}개`}</AppText>
                        </View>
                        <Ionicons name="ribbon-outline" size={26} color="rgba(255,255,255,0.85)" />
                    </View>

                    {summary.expiringThisWeek > 0 ? (
                        <View style={styles.expiryChip}>
                            <AppText variant="caption" tone="inverse" weight="700">
                                {`⏳ 이번 주 소멸 예정 ${summary.expiringThisWeek}개`}
                            </AppText>
                        </View>
                    ) : null}

                    <View style={styles.grid} testID="attendance-credit-week-grid">
                        {summary.weeklyGrid.map(day => (
                            <View key={day.date} style={styles.dayCol}>
                                <AppText variant="caption" tone="inverse" style={styles.dayLabel}>
                                    {DAY_LABELS[day.dayOfWeek] ?? day.dayOfWeek}
                                </AppText>
                                <View
                                    style={[
                                        styles.dayDot,
                                        day.checkedIn ? styles.dayDotDone : null,
                                        day.isToday && !day.checkedIn ? styles.dayDotToday : null,
                                    ]}>
                                    {day.checkedIn ? (
                                        <Ionicons name="checkmark" size={12} color={recruit.primaryPressed} />
                                    ) : null}
                                </View>
                            </View>
                        ))}
                    </View>

                    <View style={styles.streakRow}>
                        <AppText variant="caption" tone="inverse" style={styles.shrink}>
                            {`연속 출석 ${summary.currentStreak}일째`}
                        </AppText>
                        {summary.checkedInToday ? (
                            <AppBadge label="오늘 출석 완료" tone="success" />
                        ) : (
                            <Pressable
                                testID="attendance-credit-checkin-cta"
                                accessibilityRole="button"
                                onPress={() => setSheetVisible(true)}
                                style={styles.ctaButton}>
                                <AppText variant="bodyMd" weight="700" style={{color: recruit.primaryPressed}}>
                                    출석 체크하기
                                </AppText>
                            </Pressable>
                        )}
                    </View>
                </LinearGradient>

                <Pressable
                    testID="attendance-credit-charge-station-cta"
                    accessibilityRole="button"
                    onPress={() => navigation.navigate('AttendanceCreditCharge')}
                    style={[styles.chargeRow, {borderColor: c.border}]}>
                    <AppText variant="bodyMd" tone="primary">충전소로 이동</AppText>
                    <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
                </Pressable>
            </View>

            <AttendanceCheckInSheet
                visible={sheetVisible}
                onClose={() => setSheetVisible(false)}
                summary={summary}
            />
        </>
    );
};

const styles = StyleSheet.create({
    wrap: {gap: spacing.sm},
    hero: {
        borderRadius: radius.xxl,
        padding: spacing.xl,
        overflow: 'hidden',
        ...shadow.md,
    },
    heroTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    },
    shrink: {flexShrink: 1},
    heroLabel: {opacity: 0.85, marginBottom: 2},
    expiryChip: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.22)',
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: 5,
        marginBottom: spacing.lg,
    },
    grid: {flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md},
    dayCol: {flex: 1, alignItems: 'center', gap: 4},
    dayLabel: {opacity: 0.85},
    dayDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.18)',
    },
    dayDotDone: {backgroundColor: '#FFFFFF'},
    dayDotToday: {borderWidth: 1.5, borderColor: '#FFFFFF'},
    streakRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    ctaButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: radius.pill,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    chargeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
});

export default AttendanceCreditSummaryCard;
