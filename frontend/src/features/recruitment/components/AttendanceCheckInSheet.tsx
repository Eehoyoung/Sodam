/* eslint-disable react-native/no-color-literals, react-native/no-inline-styles -- 완료/오늘 상태에 따라
   동적으로 바뀌는 그리드 셀·CTA 색(recruit 토큰 + '#FFFFFF' 흰 텍스트)이라 정적 StyleSheet 로 분리하기
   어렵다(MasterMyPageScreen 의 히어로/그라디언트 카드와 동일 예외 패턴). */
/**
 * AttendanceCheckInSheet — 사장 출석체크 바텀시트(recruitment-monetization-gamification-plan.md §5,
 * docs/260801/recruitment-design-artifacts.html "✅ 사장 출석체크" 목업 1:1).
 *
 * 목업 레이아웃: 홈 화면 위 바텀시트(전면 팝업 아님) → 제목/부제 → 월~일 출석 그리드(오늘 강조,
 * 완료 요일 체크) → 오늘 지급량 프리뷰 → "출석 체크하기" 버튼 → (7일 완주 시) 보너스 배너.
 *
 * 색은 브랜드 코랄이 아니라 채용 도메인 전용 그린 토큰(`recruit.*`)만 사용한다(frontend.md,
 * "채용 화면은 검정/네이비 없이 recruit 팔레트만" 원칙과 동일선상) — BottomSheet 의 기본
 * title/icon 슬롯은 코랄 토큰을 하드코딩하므로 여기서는 쓰지 않고 children 을 전부 커스텀 구성한다.
 *
 * "오늘" 판정은 기기 타임존이 아니라 서버가 내려준 `weeklyGrid[].isToday`/`dayOfWeek` 를 그대로
 * 쓴다(CLAUDE.md 시간 처리 원칙) — 지급량 프리뷰(평일 3개/금토일 5개)도 이 필드로 계산한다.
 */
import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AppText, AppToast, BottomSheet} from '../../../common/components/ds';
import {radius, recruit, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {useAttendanceCreditCheckIn} from '../hooks/useAttendanceCreditQueries';
import type {AttendanceCreditCheckInResult, AttendanceCreditSummary} from '../types';

const DAY_LABELS: Record<string, string> = {
    MON: '월',
    TUE: '화',
    WED: '수',
    THU: '목',
    FRI: '금',
    SAT: '토',
    SUN: '일',
};

const WEEKEND_DAYS: ReadonlySet<string> = new Set(['FRI', 'SAT', 'SUN']);

interface AttendanceCheckInSheetProps {
    visible: boolean;
    onClose: () => void;
    summary: AttendanceCreditSummary;
}

function extractStatus(err: unknown): number | undefined {
    return (err as {response?: {status?: number}})?.response?.status;
}

export const AttendanceCheckInSheet: React.FC<AttendanceCheckInSheetProps> = ({visible, onClose, summary}) => {
    const c = useThemeColors();
    const checkIn = useAttendanceCreditCheckIn();
    const [result, setResult] = useState<AttendanceCreditCheckInResult | null>(null);

    const todayEntry = summary.weeklyGrid.find(d => d.isToday);
    const previewQuantity = todayEntry && WEEKEND_DAYS.has(todayEntry.dayOfWeek) ? 5 : 3;

    const handleClose = () => {
        setResult(null);
        onClose();
    };

    const handleCheckIn = async () => {
        try {
            const res = await checkIn.mutateAsync();
            setResult(res);
        } catch (err: unknown) {
            if (extractStatus(err) === 409) {
                AppToast.show('오늘은 이미 출석 체크를 완료했어요.');
                handleClose();
                return;
            }
            AppToast.error('출석 체크에 실패했어요. 잠시 후 다시 시도해 주세요.');
        }
    };

    return (
        <BottomSheet visible={visible} onClose={handleClose}>
            <View style={styles.header}>
                <AppText variant="headingSm" tone="primary" center style={styles.title}>
                    {result ? '오늘 출석 체크를 완료했어요!' : '오늘 출근 체크, 하셨나요?'}
                </AppText>
                <AppText variant="bodyMd" tone="secondary" center>
                    출근 체크하면 오늘의 출근권을 받아요
                </AppText>
            </View>

            <View style={styles.grid} testID="attendance-checkin-grid">
                {summary.weeklyGrid.map(day => {
                    const done = day.checkedIn || (day.isToday && !!result);
                    return (
                        <View
                            key={day.date}
                            testID={`attendance-checkin-day-${day.dayOfWeek}`}
                            style={[
                                styles.dayCell,
                                {backgroundColor: done ? recruit.primarySoft : c.surfaceCanvas},
                                day.isToday ? {borderColor: recruit.primary, borderWidth: 1.5} : null,
                            ]}>
                            <AppText
                                variant="caption"
                                weight={day.isToday ? '800' : undefined}
                                style={{color: done ? recruit.primaryPressed : c.textTertiary}}>
                                {DAY_LABELS[day.dayOfWeek] ?? day.dayOfWeek}
                            </AppText>
                            {done ? (
                                <Ionicons name="checkmark" size={14} color={recruit.primary} />
                            ) : (
                                <View style={styles.dayDotEmpty} />
                            )}
                        </View>
                    );
                })}
            </View>

            <View style={[styles.previewRow, {backgroundColor: recruit.primarySoft}]}>
                <AppText variant="bodyMd" weight="700" style={{color: recruit.primaryPressed}}>
                    {result
                        ? `오늘 받은 출근권 +${result.grantedQuantity}개`
                        : `오늘 받는 출근권 +${previewQuantity}개`}
                </AppText>
            </View>

            <Pressable
                testID="attendance-checkin-button"
                accessibilityRole="button"
                accessibilityState={{disabled: checkIn.isPending || !!result}}
                disabled={checkIn.isPending || !!result}
                onPress={result ? handleClose : handleCheckIn}
                style={({pressed}) => [
                    styles.ctaButton,
                    {backgroundColor: result ? c.surfaceMuted : recruit.primary},
                    pressed && !result && !checkIn.isPending ? styles.ctaPressed : null,
                ]}>
                <AppText variant="titleMd" weight="700" style={{color: result ? c.textSecondary : '#FFFFFF'}}>
                    {result ? '확인' : checkIn.isPending ? '처리 중...' : '출석 체크하기'}
                </AppText>
            </Pressable>

            {result?.streakBonusGranted ? (
                <View
                    testID="attendance-checkin-streak-banner"
                    style={[styles.streakBanner, {backgroundColor: c.warningBg}]}>
                    <AppText variant="bodyMd" weight="700" style={{color: c.warning}}>
                        {`🎉 7일 연속 출석 완료! 보너스 +${result.streakBonusQuantity}개 지급`}
                    </AppText>
                </View>
            ) : null}
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    header: {marginBottom: spacing.lg, gap: spacing.xs},
    title: {},
    grid: {flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg},
    dayCell: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        paddingVertical: spacing.sm,
        gap: 4,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    dayDotEmpty: {width: 14, height: 14},
    previewRow: {
        borderRadius: radius.lg,
        paddingVertical: spacing.md,
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    ctaButton: {
        minHeight: 52,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaPressed: {opacity: 0.92},
    streakBanner: {
        borderRadius: radius.lg,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        marginTop: spacing.md,
    },
});

export default AttendanceCheckInSheet;
