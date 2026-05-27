/**
 * 매장 관련 바텀시트 모음 (확정 시안 54·55·56·57).
 * 모두 BottomSheet 기반. 실제 액션은 호출 측 핸들러로 위임.
 */
import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {AppBadge, AppInput, AppListItem, AppText, BottomSheet, SegmentedControl} from '../../../common/components/ds';
import {colors, radius, spacing} from '../../../theme/tokens';

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
    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            title="출퇴근 반경"
            description="추천 반경은 80m예요. 너무 좁으면 정상 출근도 실패할 수 있어요."
            primary={{label: '반경 적용', onPress: () => onApply(meters)}}>
            <SegmentedControl options={RADII} value={idx} onChange={setIdx} />
            <View style={styles.radiusPreview}>
                <View style={styles.radiusCircle}>
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
}> = ({visible, onClose, code, onShareKakao, onShareSms, onCopy}) => (
    <BottomSheet visible={visible} onClose={onClose} title="초대 코드 공유">
        <View style={styles.codeBox}>
            <AppText variant="numericLg" tone="brand" style={styles.code}>{code}</AppText>
        </View>
        <View style={styles.quick}>
            <Pressable style={styles.quickItem} onPress={onShareSms}><AppText variant="caption" weight="800">문자</AppText></Pressable>
            <Pressable style={styles.quickItem} onPress={onShareKakao}><AppText variant="caption" weight="800">카카오</AppText></Pressable>
            <Pressable style={styles.quickItem} onPress={onCopy}><AppText variant="caption" weight="800">복사</AppText></Pressable>
        </View>
    </BottomSheet>
);

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

/* 57 Wage Edit Sheet — 직원 시급 변경 */
export const WageEditSheet: React.FC<{
    visible: boolean;
    onClose: () => void;
    employeeName: string;
    onSave: (wage: number, effectiveDate: string, reason: string) => void;
}> = ({visible, onClose, employeeName, onSave}) => {
    const [wage, setWage] = useState('');
    const [date, setDate] = useState('');
    const [reason, setReason] = useState('');
    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            scrollable
            title={`${employeeName}님의 시급을 바꿔요`}
            description="적용 시작일 이후 급여 계산에 반영됩니다."
            primary={{label: '시급 변경 저장', onPress: () => onSave(parseInt(wage.replace(/[^0-9]/g, ''), 10) || 0, date, reason)}}>
            <View style={styles.form}>
                <AppInput label="적용 시급 (원)" placeholder="예: 10500" value={wage} onChangeText={setWage} keyboardType="number-pad" />
                <AppInput label="적용 시작일" placeholder="2026-06-01" value={date} onChangeText={setDate} />
                <AppInput label="변경 사유" placeholder="예: 근속 인상" value={reason} onChangeText={setReason} multiline />
            </View>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    radiusPreview: {alignItems: 'center', marginTop: spacing.lg},
    radiusCircle: {width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,107,53,0.14)', borderWidth: 2, borderColor: colors.brandPrimary, alignItems: 'center', justifyContent: 'center'},
    codeBox: {alignItems: 'center', backgroundColor: colors.surfaceWarm, borderRadius: radius.xl, paddingVertical: spacing.lg, marginTop: spacing.xs},
    code: {letterSpacing: 4},
    quick: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md},
    quickItem: {flex: 1, minHeight: 48, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center'},
    list: {gap: spacing.sm, marginTop: spacing.xs},
    form: {gap: spacing.md, marginTop: spacing.xs},
});

export default {RadiusSelectorSheet, InviteShareSheet, EmployeeActionSheet, WageEditSheet};
