/**
 * EmployeeWorkingRing — 근무중 진행률 링 (v3 "링 & 패스" 시그니처, 22 EmployeeWorking).
 *
 * `AttendanceScreen.tsx`(isWorking 히어로)와 `EmployeeAttendanceHome.tsx`(WORKING 패널)에
 * 근무중 표시가 중복 구현돼 있던 것을 하나의 공유 프레젠테이션 컴포넌트로 통합한다
 * (docs/260720 계획서 §4.2 22 EmployeeWorking). 출퇴근 판정·API 호출 로직은 건드리지 않고
 * "근무 경과시간을 어떻게 보여줄지"만 담당한다 — 값(elapsedSeconds)은 호출부가 그대로 계산해 넘긴다.
 */
import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {AppText} from '../../../common/components/ds/AppText';
import {ProgressRing} from '../../../common/components/ds/ProgressRing';
import {formatTimer} from '../../../common/format/dateTime';
import {spacing} from '../../../theme/tokens';

interface EmployeeWorkingRingProps {
    /** 근무 경과 초. 값 자체는 호출부가 checkInTime 기준으로 계산(타임존/드리프트 책임은 호출부에 있음) */
    elapsedSeconds: number;
    /** 링 중앙 아래 보조 라벨 (예: "근무중 · 38%", "GPS 정상") */
    subLabel?: string;
    size?: number;
    style?: StyleProp<ViewStyle>;
    testID?: string;
}

/** 8시간 근무 기준 시각적 진행률(장식용) — 급여/근태 계산에는 쓰이지 않는다. */
const SHIFT_REFERENCE_SECONDS = 8 * 3600;

export const EmployeeWorkingRing: React.FC<EmployeeWorkingRingProps> = ({
    elapsedSeconds,
    subLabel,
    size = 148,
    style,
    testID,
}) => {
    const progress = Math.max(0, Math.min(1, elapsedSeconds / SHIFT_REFERENCE_SECONDS));
    return (
        <View style={[styles.wrap, style]} testID={testID}>
            <ProgressRing progress={progress} size={size}>
                <AppText variant="numericLg" weight="700" style={styles.timer}>
                    {formatTimer(elapsedSeconds)}
                </AppText>
                {subLabel ? (
                    <AppText variant="caption" tone="secondary" style={styles.subLabel}>{subLabel}</AppText>
                ) : null}
            </ProgressRing>
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: {alignItems: 'center', marginVertical: spacing.xs},
    timer: {fontVariant: ['tabular-nums']},
    subLabel: {marginTop: 3},
});

export default EmployeeWorkingRing;
