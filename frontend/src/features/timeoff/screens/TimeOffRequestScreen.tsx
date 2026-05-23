import React, {useState} from 'react';
import {Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {tokens} from '../../../theme/tokens';
import Card from '../../../common/components/data-display/Card';
import Input from '../../../common/components/form/Input';
import Button from '../../../common/components/form/Button';
import api from '../../../common/utils/api';

/**
 * 직원 휴가 셀프 신청 (PRD_EMPLOYEE).
 */
const TimeOffRequestScreen: React.FC = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const storeId = route.params?.storeId as number | undefined;

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!storeId) {
            Alert.alert('확인 필요', '매장 정보가 없어요.');
            return;
        }
        if (!isValidDate(startDate) || !isValidDate(endDate)) {
            Alert.alert('확인 필요', '날짜는 YYYY-MM-DD 형식으로 입력해 주세요.');
            return;
        }
        if (new Date(endDate) < new Date(startDate)) {
            Alert.alert('확인 필요', '종료일은 시작일 이후여야 해요.');
            return;
        }
        if (!reason.trim() || reason.trim().length < 2) {
            Alert.alert('확인 필요', '사유를 2자 이상 작성해 주세요.');
            return;
        }
        setLoading(true);
        try {
            await api.post('/api/timeoff/self', {storeId, startDate, endDate, reason: reason.trim()});
            Alert.alert('신청 완료', '사장님 승인 후 결과 알림을 드릴게요.', [
                {text: '확인', onPress: () => navigation.goBack()},
            ]);
        } catch (e: any) {
            Alert.alert('실패', e?.response?.data?.message ?? '신청에 실패했어요.');
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
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.title}>휴가 신청</Text>
                    <Text style={styles.subtitle}>
                        시작·종료일과 사유를 입력해 주세요.{'\n'}사장님 승인 후 자동 반영돼요.
                    </Text>

                    <Card bordered>
                        <Input
                            label="시작일 (YYYY-MM-DD)"
                            value={startDate}
                            onChangeText={setStartDate}
                            placeholder="2026-06-01"
                        />
                        <Input
                            label="종료일 (YYYY-MM-DD)"
                            value={endDate}
                            onChangeText={setEndDate}
                            placeholder="2026-06-03"
                        />
                        <Input
                            label="사유"
                            value={reason}
                            onChangeText={setReason}
                            multiline
                            numberOfLines={3}
                            placeholder="예: 가족 행사 / 병원 진료 등"
                            helperText={`${reason.length} / 200자`}
                            maxLength={200}
                        />
                    </Card>

                    <Button
                        title="휴가 신청하기"
                        onPress={submit}
                        variant="primary"
                        size="lg"
                        fullWidth
                        loading={loading}
                        style={{marginTop: tokens.spacing.xl}}
                    />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

function isValidDate(s: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

const styles = StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: tokens.colors.background},
    flex: {flex: 1},
    scrollContent: {padding: tokens.spacing.lg, paddingBottom: tokens.spacing.huge},
    title: {
        fontSize: tokens.typography.sizes.xxl,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.textPrimary,
        marginTop: tokens.spacing.md,
        marginBottom: tokens.spacing.sm,
        letterSpacing: -0.3,
    },
    subtitle: {color: tokens.colors.textSecondary, fontSize: tokens.typography.sizes.md, lineHeight: 22, marginBottom: tokens.spacing.xl},
});

export default TimeOffRequestScreen;
