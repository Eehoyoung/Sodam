/**
 * 근태 관련 시트/상태 화면 모음 (확정 시안 58·60·61·62·63·78·79).
 * 시트는 BottomSheet, 성공/실패/미지원은 SuccessState/ErrorState 기반.
 */
import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {
    AppInput,
    BottomSheet,
    ErrorState,
    ScreenContainer,
    SegmentedControl,
    SuccessState,
} from '../../../common/components/ds';
import {formatMoney, formatTimer} from '../../../common/utils/format';
import {spacing} from '../../../theme/tokens';

/* 58 Attendance Filter Sheet */
const RANGES = ['오늘', '이번 주', '이번 달'];
export const AttendanceFilterSheet: React.FC<{
    visible: boolean;
    onClose: () => void;
    onApply: (rangeIdx: number) => void;
}> = ({visible, onClose, onApply}) => {
    const [range, setRange] = useState(0);
    return (
        <BottomSheet visible={visible} onClose={onClose} title="근태 필터" primary={{label: '필터 적용', onPress: () => onApply(range)}}>
            <SegmentedControl options={RANGES} value={range} onChange={setRange} />
        </BottomSheet>
    );
};

/* 61 Checkout Confirm Sheet */
export const CheckoutConfirmSheet: React.FC<{
    visible: boolean;
    onClose: () => void;
    workedSeconds: number;
    expectedPay: number;
    onConfirm: () => void;
    onAddBreak?: () => void;
}> = ({visible, onClose, workedSeconds, expectedPay, onConfirm, onAddBreak}) => (
    <BottomSheet
        visible={visible}
        onClose={onClose}
        title="퇴근 처리할까요?"
        description={`오늘 근무시간 ${formatTimer(workedSeconds)} · 예상 일급 ${formatMoney(expectedPay)}`}
        primary={{label: '퇴근 처리', onPress: onConfirm}}
        secondary={onAddBreak ? {label: '휴게시간 추가', onPress: onAddBreak} : undefined}
    />
);

/* 79 Break Timer Sheet */
export const BreakTimerSheet: React.FC<{
    visible: boolean;
    onClose: () => void;
    onStart: () => void;
    onManual?: () => void;
}> = ({visible, onClose, onStart, onManual}) => (
    <BottomSheet
        visible={visible}
        onClose={onClose}
        title="휴게시간을 기록할까요?"
        description="휴게시간은 급여 계산에서 제외됩니다."
        primary={{label: '휴게 시작', onPress: onStart}}
        secondary={onManual ? {label: '직접 입력', variant: 'ghost', onPress: onManual} : undefined}
    />
);

/* 78 Manual Record Sheet */
export const ManualRecordSheet: React.FC<{
    visible: boolean;
    onClose: () => void;
    onSave: (v: {date: string; checkIn: string; checkOut: string; breakMin: string}) => void;
}> = ({visible, onClose, onSave}) => {
    const [date, setDate] = useState('');
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [breakMin, setBreakMin] = useState('');
    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            scrollable
            title="수동 기록 추가"
            description="사장 승인 없이 내 기록장에만 저장됩니다."
            primary={{label: '기록 추가', onPress: () => onSave({date, checkIn, checkOut, breakMin})}}>
            <View style={styles.form}>
                <AppInput label="근무일" placeholder="2026-05-25" value={date} onChangeText={setDate} />
                <AppInput label="출근" placeholder="10:00" value={checkIn} onChangeText={setCheckIn} />
                <AppInput label="퇴근" placeholder="15:30" value={checkOut} onChangeText={setCheckOut} />
                <AppInput label="휴게(분)" placeholder="30" value={breakMin} onChangeText={setBreakMin} keyboardType="number-pad" />
            </View>
        </BottomSheet>
    );
};

/* 80 Personal Record Edit Sheet — 개인 기록 수정 (시급/예상급여) */
export const PersonalRecordEditSheet: React.FC<{
    visible: boolean;
    onClose: () => void;
    initial?: {date: string; checkIn: string; checkOut: string; wage: string};
    expectedPay?: number;
    onSave: (v: {date: string; checkIn: string; checkOut: string; wage: string}) => void;
}> = ({visible, onClose, initial, expectedPay, onSave}) => {
    const [date, setDate] = useState(initial?.date ?? '');
    const [checkIn, setCheckIn] = useState(initial?.checkIn ?? '');
    const [checkOut, setCheckOut] = useState(initial?.checkOut ?? '');
    const [wage, setWage] = useState(initial?.wage ?? '');
    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            scrollable
            title="기록 수정"
            // eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined
            description={expectedPay != null ? `예상 급여 ${formatMoney(expectedPay)}` : undefined}
            primary={{label: '수정 저장', onPress: () => onSave({date, checkIn, checkOut, wage})}}>
            <View style={styles.form}>
                <AppInput label="근무일" placeholder="2026-05-24" value={date} onChangeText={setDate} />
                <AppInput label="출근" placeholder="10:00" value={checkIn} onChangeText={setCheckIn} />
                <AppInput label="퇴근" placeholder="15:30" value={checkOut} onChangeText={setCheckOut} />
                <AppInput label="시급 (원)" placeholder="10500" value={wage} onChangeText={setWage} keyboardType="number-pad" />
            </View>
        </BottomSheet>
    );
};

/* 60 NFC Unsupported (screen) */
export const NfcUnsupportedScreen: React.FC<{onGps: () => void; onManual: () => void}> = ({onGps, onManual}) => (
    <ScreenContainer>
        <ErrorState
            glyph="!"
            markColor="#F59E0B"
            title={'이 기기는 NFC를\n지원하지 않아요'}
            description="GPS 출근 또는 사장님께 수동 요청을 사용할 수 있어요."
            primary={{label: 'GPS로 출근하기', onPress: onGps}}
            secondary={{label: '사장님께 수동 요청', onPress: onManual}}
        />
    </ScreenContainer>
);

/* 62 Punch Success */
export const PunchSuccessScreen: React.FC<{time: string; storeName: string; wage: number; onStart: () => void}> = ({time, storeName, wage, onStart}) => (
    <ScreenContainer>
        <SuccessState
            title="출근 처리됐어요"
            description={`${time} · ${storeName} · 시급 ${formatMoney(wage)}으로 기록했어요.`}
            primary={{label: '근무 시작', onPress: onStart}}
        />
    </ScreenContainer>
);

/* 63 Punch Failed (radius) */
export const PunchFailedScreen: React.FC<{onRetry: () => void; onManual: () => void}> = ({onRetry, onManual}) => (
    <ScreenContainer>
        <ErrorState
            glyph="!"
            markColor="#F59E0B"
            title="매장 반경 밖이에요"
            description="매장 근처에서 다시 시도하거나 사장님께 수동 처리를 요청하세요."
            primary={{label: '다시 시도', onPress: onRetry}}
            secondary={{label: '수동 요청', onPress: onManual}}
        />
    </ScreenContainer>
);

const styles = StyleSheet.create({
    form: {gap: spacing.md, marginTop: spacing.xs},
});

export default {
    AttendanceFilterSheet,
    CheckoutConfirmSheet,
    BreakTimerSheet,
    ManualRecordSheet,
    NfcUnsupportedScreen,
    PunchSuccessScreen,
    PunchFailedScreen,
};
