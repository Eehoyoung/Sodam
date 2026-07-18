/**
 * 매장 관련 바텀시트 모음 (확정 시안 54·55·56·57).
 * 모두 BottomSheet 기반. 실제 액션은 호출 측 핸들러로 위임.
 */
import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {AppBadge, AppInput, AppListItem, AppText, BottomSheet, SegmentedControl} from '../../../common/components/ds';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {DATE_DIGITS_HELPER, dateDigitsToIso, isValidDateDigits, sanitizeDateDigits} from '../../../common/utils/dateTimeInput';
import type {EmploymentType} from '../../wage/services/wageService';

/* 54 Radius Selector Sheet — 출퇴근 인증 반경 */
const RADII = ['50m', '80m', '120m'];
export const RadiusSelectorSheet: React.FC<{
    visible: boolean;
    onClose: () => void;
    value?: number; // index
    onApply: (meters: number) => void;
}> = ({visible, onClose, value = 1, onApply}) => {
    const [idx, setIdx] = useState(value);
    const meters = [50, 80, 120][idx];
    const c = useThemeColors();
    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            title="출퇴근 반경"
            description="추천 반경은 80m예요. 너무 좁으면 정상 출근도 실패할 수 있어요."
            primary={{label: '반경 적용', onPress: () => onApply(meters)}}>
            <SegmentedControl options={RADII} value={idx} onChange={setIdx} />
            <View style={styles.radiusPreview}>
                <View style={[styles.radiusCircle, {borderColor: c.brandPrimary}]}>
                    <AppText variant="titleMd" tone="brand">{meters}m</AppText>
                </View>
            </View>
        </BottomSheet>
    );
};

/* 55 Invite Share Sheet — 직원 초대 코드 공유 */
export const InviteShareSheet: React.FC<{
    visible: boolean;
    onClose: () => void;
    code: string;
    onShareKakao: () => void;
    onShareSms: () => void;
    onCopy: () => void;
}> = ({visible, onClose, code, onShareKakao, onShareSms, onCopy}) => {
    const c = useThemeColors();
    return (
        <BottomSheet visible={visible} onClose={onClose} title="초대 코드 공유">
            <View style={[styles.codeBox, {backgroundColor: c.surfaceWarm}]}>
                <AppText variant="numericLg" tone="brand" style={styles.code}>{code}</AppText>
            </View>
            <View style={styles.quick}>
                <Pressable style={[styles.quickItem, {borderColor: c.border, backgroundColor: c.background}]} onPress={onShareSms}><AppText variant="caption" weight="800">문자</AppText></Pressable>
                <Pressable style={[styles.quickItem, {borderColor: c.border, backgroundColor: c.background}]} onPress={onShareKakao}><AppText variant="caption" weight="800">카카오</AppText></Pressable>
                <Pressable style={[styles.quickItem, {borderColor: c.border, backgroundColor: c.background}]} onPress={onCopy}><AppText variant="caption" weight="800">복사</AppText></Pressable>
            </View>
        </BottomSheet>
    );
};

/* 56 Employee Action Sheet — 직원 작업 */
export const EmployeeActionSheet: React.FC<{
    visible: boolean;
    onClose: () => void;
    employeeName: string;
    onWage: () => void;
    onMemo: () => void;
    onDeactivate: () => void;
}> = ({visible, onClose, employeeName, onWage, onMemo, onDeactivate}) => (
    <BottomSheet visible={visible} onClose={onClose} title={`${employeeName} · 직원 작업`}>
        <View style={styles.list}>
            <AppListItem title="시급 변경" subtitle="적용일과 사유 입력" right="›" onPress={onWage} />
            <AppListItem title="사장 메모" subtitle="비공개 메모 저장" right="›" onPress={onMemo} />
            <AppListItem title="비활성화" subtitle="퇴사 또는 장기 휴무 처리" right={<AppBadge label="주의" tone="warning" />} onPress={onDeactivate} />
        </View>
    </BottomSheet>
);

/* 57 Wage Edit Sheet — 직원 급여 설정 (시급제/월급제 + 4대보험) */
const EMPLOYMENT_TYPE_OPTIONS = ['시급제', '월급제'];
const INSURANCE_OPTIONS = ['매장 정책 따름', '4대보험 가입', '3.3% 원천징수'];

export interface WageEditValues {
    employmentType: EmploymentType;
    /** 시급제 전용(원). 0 이면 매장 기본 시급 사용 */
    hourlyWage: number;
    /** 월급제 전용(원, 세전) */
    monthlySalary: number;
    /** null=매장 정책 따름, true=4대보험, false=3.3% 원천징수 */
    socialInsuranceEnrolled: boolean | null;
    effectiveDate: string;
    reason: string;
}

export const WageEditSheet: React.FC<{
    visible: boolean;
    onClose: () => void;
    employeeName: string;
    /** 현재 설정값 — 시트 열릴 때 초기 선택 상태로 반영 */
    initialEmploymentType?: EmploymentType;
    initialMonthlySalary?: number;
    initialSocialInsuranceEnrolled?: boolean | null;
    onSave: (values: WageEditValues) => void;
}> = ({
    visible,
    onClose,
    employeeName,
    initialEmploymentType,
    initialMonthlySalary,
    initialSocialInsuranceEnrolled,
    onSave,
}) => {
    const [typeIdx, setTypeIdx] = useState(initialEmploymentType === 'MONTHLY_SALARY' ? 1 : 0);
    const [wage, setWage] = useState('');
    const [salary, setSalary] = useState('');
    const [insIdx, setInsIdx] = useState(0);
    const [date, setDateValue] = useState('');
    const setDate = (value: string) => setDateValue(sanitizeDateDigits(value));
    const [reason, setReason] = useState('');

    // 시트가 열릴 때마다 현재 설정값으로 초기화(직전 편집 잔상 제거)
    useEffect(() => {
        if (visible) {
            setTypeIdx(initialEmploymentType === 'MONTHLY_SALARY' ? 1 : 0);
            setSalary(initialMonthlySalary ? String(initialMonthlySalary) : '');
            setInsIdx(
                initialSocialInsuranceEnrolled === null || initialSocialInsuranceEnrolled === undefined
                    ? 0
                    : initialSocialInsuranceEnrolled ? 1 : 2,
            );
            setWage('');
            setDateValue('');
            setReason('');
        }
    }, [visible, initialEmploymentType, initialMonthlySalary, initialSocialInsuranceEnrolled]);

    const isMonthly = typeIdx === 1;
    const save = () =>
        onSave({
            employmentType: isMonthly ? 'MONTHLY_SALARY' : 'HOURLY',
            hourlyWage: parseInt(wage.replace(/[^0-9]/g, ''), 10) || 0,
            monthlySalary: parseInt(salary.replace(/[^0-9]/g, ''), 10) || 0,
            socialInsuranceEnrolled: insIdx === 0 ? null : insIdx === 1,
            effectiveDate: isValidDateDigits(date) ? dateDigitsToIso(date) : date,
            reason,
        });

    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            scrollable
            title={`${employeeName}님의 급여를 설정해요`}
            description="적용 시작일 이후 급여 계산에 반영됩니다."
            primary={{label: '급여 설정 저장', onPress: save}}>
            <View style={styles.form}>
                <View>
                    <AppText variant="caption" tone="secondary" style={styles.fieldLabel}>고용형태</AppText>
                    <SegmentedControl options={EMPLOYMENT_TYPE_OPTIONS} value={typeIdx} onChange={setTypeIdx} />
                </View>
                {isMonthly ? (
                    <AppInput
                        label="월급 (원, 세전)"
                        placeholder="예: 2200000"
                        value={salary}
                        onChangeText={setSalary}
                        keyboardType="number-pad"
                        helper="최저임금 월 환산액 이상이어야 저장돼요."
                    />
                ) : (
                    <AppInput
                        label="적용 시급 (원)"
                        placeholder="예: 10500"
                        value={wage}
                        onChangeText={setWage}
                        keyboardType="number-pad"
                        helper="비워두면 매장 기본 시급을 사용해요."
                    />
                )}
                <View>
                    <AppText variant="caption" tone="secondary" style={styles.fieldLabel}>4대보험</AppText>
                    <SegmentedControl options={INSURANCE_OPTIONS} value={insIdx} onChange={setInsIdx} />
                </View>
                <AppInput label="적용 시작일" placeholder="20260601" value={date} onChangeText={setDate} keyboardType="number-pad" maxLength={8} helper={DATE_DIGITS_HELPER} />
                <AppInput label="변경 사유" placeholder="예: 근속 인상" value={reason} onChangeText={setReason} multiline />
            </View>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    radiusPreview: {alignItems: 'center', marginTop: spacing.lg},
    radiusCircle: {width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,107,53,0.14)', borderWidth: 2, alignItems: 'center', justifyContent: 'center'},
    codeBox: {alignItems: 'center', borderRadius: radius.xl, paddingVertical: spacing.lg, marginTop: spacing.xs},
    code: {letterSpacing: 4},
    quick: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md},
    quickItem: {flex: 1, minHeight: 48, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
    list: {gap: spacing.sm, marginTop: spacing.xs},
    form: {gap: spacing.md, marginTop: spacing.xs},
    fieldLabel: {marginBottom: spacing.xs},
});

export default {RadiusSelectorSheet, InviteShareSheet, EmployeeActionSheet, WageEditSheet};
