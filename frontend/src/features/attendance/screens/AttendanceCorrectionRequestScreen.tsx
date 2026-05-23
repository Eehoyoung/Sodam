import React, {useState} from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {tokens} from '../../../theme/tokens';
import Button from '../../../common/components/form/Button';
import Input from '../../../common/components/form/Input';
import Card from '../../../common/components/data-display/Card';
import api from '../../../common/utils/api';

interface RouteParams {
    attendanceId?: number;
    date?: string;
    storeName?: string;
    currentCheckIn?: string;
    currentCheckOut?: string;
}

/**
 * 출퇴근 정정 요청 (PRD_EMPLOYEE 부가).
 *
 * 직원이 잘못 기록된 출퇴근을 사장에게 정정 요청.
 *
 * TODO[P1 BE]: POST /api/attendance/{id}/correction-request 엔드포인트 미구현.
 *  - 현재는 mock fallback (이메일 발송 또는 알림으로 사장에게 전달)
 *  - BE 구현 시 본 화면 hookup 만 교체.
 */
const AttendanceCorrectionRequestScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const params: RouteParams = route.params ?? {};

    const [checkIn, setCheckIn] = useState(formatTime(params.currentCheckIn) ?? '09:00');
    const [checkOut, setCheckOut] = useState(formatTime(params.currentCheckOut) ?? '18:00');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!reason.trim() || reason.trim().length < 5) {
            Alert.alert('확인 필요', '정정 사유를 5자 이상 적어주세요.\n사장님이 더 빠르게 검토해 주실 수 있어요.');
            return;
        }
        if (!isValidTime(checkIn) || !isValidTime(checkOut)) {
            Alert.alert('확인 필요', '시간을 HH:MM 형식으로 입력해 주세요.');
            return;
        }
        setLoading(true);
        try {
            // TODO[P1 BE]: 본 엔드포인트 구현 후 실제 호출 활성화
            // await api.post(`/api/attendance/${params.attendanceId}/correction-request`, {
            //     proposedCheckIn: checkIn,
            //     proposedCheckOut: checkOut,
            //     reason: reason.trim(),
            // });
            console.log('[correction-request mock]', {
                attendanceId: params.attendanceId,
                checkIn,
                checkOut,
                reason: reason.trim(),
            });
            Alert.alert(
                '요청 전송 완료',
                '사장님께 정정 요청을 보냈어요. 검토 후 알림으로 결과를 알려드릴게요.',
                [{text: '확인', onPress: () => navigation.goBack()}],
            );
        } catch (e: any) {
            Alert.alert('실패', '요청 전송에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <Text style={styles.title}>출퇴근 정정 요청</Text>
                    <Text style={styles.subtitle}>
                        잘못 기록된 출퇴근 시간을 사장님께 알려드려요.{'\n'}
                        승인 시 자동 반영됩니다.
                    </Text>

                    {params.date ? (
                        <Card bordered style={styles.summary}>
                            <Text style={styles.summaryDate}>{params.date}</Text>
                            {params.storeName ? (
                                <Text style={styles.summaryStore}>{params.storeName}</Text>
                            ) : null}
                            {params.currentCheckIn || params.currentCheckOut ? (
                                <Text style={styles.summaryNote}>
                                    현재 기록: {params.currentCheckIn ?? '-'} ~ {params.currentCheckOut ?? '미체크'}
                                </Text>
                            ) : null}
                        </Card>
                    ) : null}

                    <Input
                        label="수정할 출근 시간 (HH:MM)"
                        value={checkIn}
                        onChangeText={setCheckIn}
                        placeholder="09:00"
                        keyboardType="numbers-and-punctuation"
                        editable={!loading}
                    />
                    <Input
                        label="수정할 퇴근 시간 (HH:MM)"
                        value={checkOut}
                        onChangeText={setCheckOut}
                        placeholder="18:00"
                        keyboardType="numbers-and-punctuation"
                        editable={!loading}
                    />
                    <Input
                        label="정정 사유"
                        value={reason}
                        onChangeText={setReason}
                        placeholder="예: NFC 인식이 안 돼서 사장님께 말씀드리고 일했어요."
                        multiline
                        numberOfLines={4}
                        editable={!loading}
                        helperText={`${reason.length} / 200자`}
                        maxLength={200}
                    />

                    <Button
                        title="정정 요청 보내기"
                        onPress={submit}
                        variant="primary"
                        size="lg"
                        fullWidth
                        loading={loading}
                        style={styles.cta}
                    />
                    <Text style={styles.disclaimer}>
                        ⓘ 정정 사유는 사장님과 직원 본인만 볼 수 있어요.
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

function formatTime(iso?: string): string | undefined {
    if (!iso) return undefined;
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
    safeArea: {flex: 1, backgroundColor: tokens.colors.background},
    flex: {flex: 1},
    scrollContent: {padding: tokens.spacing.lg, paddingBottom: tokens.spacing.huge},
    title: {
        fontSize: tokens.typography.sizes.xxl,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.textPrimary,
        letterSpacing: -0.5,
        marginTop: tokens.spacing.md,
        marginBottom: tokens.spacing.sm,
    },
    subtitle: {
        fontSize: tokens.typography.sizes.md,
        color: tokens.colors.textSecondary,
        marginBottom: tokens.spacing.xl,
        lineHeight: 22,
    },
    summary: {marginBottom: tokens.spacing.lg},
    summaryDate: {
        fontSize: tokens.typography.sizes.lg,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.textPrimary,
    },
    summaryStore: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.textSecondary,
        marginTop: 2,
    },
    summaryNote: {
        marginTop: tokens.spacing.sm,
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.warning,
    },
    cta: {marginTop: tokens.spacing.xl},
    disclaimer: {
        marginTop: tokens.spacing.md,
        textAlign: 'center',
        color: tokens.colors.textTertiary,
        fontSize: tokens.typography.sizes.xs,
    },
});

export default AttendanceCorrectionRequestScreen;
