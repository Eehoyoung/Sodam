import {AppToast, AppButton, AppCard, AppHeader, AppInput, AppText, CtaStack, ScreenContainer, SuccessState} from '../../../common/components/ds';
import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import api from '../../../common/utils/api';

interface RouteParams {
    attendanceId?: number;
    date?: string;
    storeName?: string;
    currentCheckIn?: string;
    currentCheckOut?: string;
}

/**
 * 24 CorrectionRequest — 확정 시안.
 * 직원이 잘못 기록된 출퇴근을 사장에게 정정 요청.
 * POST /api/attendance/{attendanceId}/correction-request 로 실제 제출(사장 승인 워크플로).
 */
const AttendanceCorrectionRequestScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const c = useThemeColors();
    const params: RouteParams = route.params ?? {};

    const [checkIn, setCheckIn] = useState(formatTime(params.currentCheckIn) ?? '09:00');
    const [checkOut, setCheckOut] = useState(formatTime(params.currentCheckOut) ?? '18:00');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const submit = async () => {
        if (!reason.trim() || reason.trim().length < 5) {
            AppToast.warn('정정 사유를 5자 이상 적어주세요.\n사장님이 더 빠르게 검토해 주실 수 있어요.');
            return;
        }
        if (!isValidTime(checkIn) || !isValidTime(checkOut)) {
            AppToast.warn('시간을 HH:MM 형식으로 입력해 주세요.');
            return;
        }
        if (!params.attendanceId) {
            AppToast.warn('정정할 근무 기록을 먼저 선택해 주세요.');
            return;
        }
        setLoading(true);
        try {
            // 정정 대상 날짜(YYYY-MM-DD) + 입력 시각(HH:MM)을 LocalDateTime 으로 결합
            const baseDate = /^\d{4}-\d{2}-\d{2}/.test(params.date ?? '')
                ? (params.date as string).slice(0, 10)
                : new Date().toISOString().slice(0, 10);
            await api.post(`/api/attendance/${params.attendanceId}/correction-request`, {
                proposedCheckIn: `${baseDate}T${checkIn}:00`,
                proposedCheckOut: `${baseDate}T${checkOut}:00`,
                reason: reason.trim(),
            });
            setSubmitted(true);
        } catch (e: any) {
            AppToast.error(e?.response?.data?.message ?? '요청 전송에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <ScreenContainer header={<AppHeader title="정정 요청" onBack={() => navigation.goBack()} />}>
                <SuccessState
                    title="정정 요청을 보냈어요"
                    description="사장님이 승인하면 기록에 반영됩니다."
                    primary={{label: '근무 기록으로', onPress: () => navigation.goBack()}}
                />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="정정 요청" onBack={() => navigation.goBack()} />}
            footer={
                <CtaStack bordered>
                    <AppButton label="정정 요청 보내기" loading={loading} onPress={submit} />
                </CtaStack>
            }>
            <AppText variant="headingLg" style={styles.question}>어디를 바로잡을까요?</AppText>

            <AppCard variant="warm">
                <AppText variant="titleMd">현재 기록</AppText>
                {params.date ? (
                    <AppText variant="caption" tone="secondary" style={styles.sub}>
                        {params.date}
                        {params.storeName ? ` · ${params.storeName}` : ''}
                    </AppText>
                ) : null}
                <AppText variant="caption" tone="warning" style={styles.sub}>
                    출근 {params.currentCheckIn ?? '-'} · 퇴근 {params.currentCheckOut ?? '미체크'}
                </AppText>
            </AppCard>

            <View style={styles.form}>
                <AppInput
                    label="수정 출근 시간 (HH:MM)"
                    value={checkIn}
                    onChangeText={setCheckIn}
                    placeholder="09:00"
                    keyboardType="numbers-and-punctuation"
                    editable={!loading}
                />
                <AppInput
                    label="수정 퇴근 시간 (HH:MM)"
                    value={checkOut}
                    onChangeText={setCheckOut}
                    placeholder="18:00"
                    keyboardType="numbers-and-punctuation"
                    editable={!loading}
                />
                <AppInput
                    label="정정 사유"
                    value={reason}
                    onChangeText={setReason}
                    placeholder="예: NFC 인식이 안 돼서 사장님께 말씀드리고 일했어요."
                    multiline
                    editable={!loading}
                    maxLength={200}
                    helper={`${reason.length} / 200자`}
                />
            </View>

            <View style={styles.disclaimer}>
                <Ionicons name="lock-closed-outline" size={14} color={c.textTertiary} />
                <AppText variant="caption" tone="tertiary">
                    정정 사유는 사장님과 직원 본인만 볼 수 있어요.
                </AppText>
            </View>
        </ScreenContainer>
    );
};

function formatTime(iso?: string): string | undefined {
    if (!iso) {
        return undefined;
    }
    try {
        const d = new Date(iso);
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (_) {
        return undefined;
    }
}
function pad(n: number): string {
    return String(n).padStart(2, '0');
}
function isValidTime(s: string): boolean {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

const styles = StyleSheet.create({
    question: {marginBottom: spacing.xl},
    sub: {marginTop: 4},
    form: {marginTop: spacing.xl, gap: spacing.lg},
    disclaimer: {marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs},
});

export default AttendanceCorrectionRequestScreen;
