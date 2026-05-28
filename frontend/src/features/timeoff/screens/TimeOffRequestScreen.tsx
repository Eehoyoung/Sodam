import {AppToast} from '../../../common/components/ds';
import React, {useState} from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    CtaStack,
    ScreenContainer,
    SuccessState,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import api from '../../../common/utils/api';

/**
 * 26 TimeOffRequest — 확정 시안.
 * 직원 휴가 셀프 신청. 검증/제출 로직 보존 (BE: storeId/startDate/endDate/reason).
 */
const TimeOffRequestScreen: React.FC = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const storeId = route.params?.storeId as number | undefined;

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const submit = async () => {
        if (!storeId) {
            AppToast.warn('매장 정보가 없어요.');
            return;
        }
        if (!isValidDate(startDate) || !isValidDate(endDate)) {
            AppToast.warn('날짜는 YYYY-MM-DD 형식으로 입력해 주세요.');
            return;
        }
        if (new Date(endDate) < new Date(startDate)) {
            AppToast.warn('종료일은 시작일 이후여야 해요.');
            return;
        }
        if (!reason.trim() || reason.trim().length < 2) {
            AppToast.warn('사유를 2자 이상 작성해 주세요.');
            return;
        }
        setLoading(true);
        try {
            await api.post('/api/timeoff/self', {storeId, startDate, endDate, reason: reason.trim()});
            setSubmitted(true);
        } catch (e: any) {
            AppToast.error(e?.response?.data?.message ?? '신청에 실패했어요.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <ScreenContainer header={<AppHeader title="휴가 신청" onBack={() => navigation.goBack()} />}>
                <SuccessState
                    title="휴가 신청을 보냈어요"
                    description="승인 결과는 알림으로 알려드릴게요."
                    primary={{label: '내 정보로 돌아가기', onPress: () => navigation.goBack()}}
                />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="휴가 신청" onBack={() => navigation.goBack()} actions={[{label: '내역', onPress: () => {}}]} />}
            footer={
                <CtaStack bordered>
                    <AppButton label="휴가 신청하기" loading={loading} onPress={submit} />
                </CtaStack>
            }>
            <AppCard variant="warm">
                <AppText variant="titleMd">휴가를 신청해요</AppText>
                <AppText variant="caption" tone="secondary" style={styles.sub}>
                    시작·종료일과 사유를 입력하면 사장님 승인 후 자동 반영돼요.
                </AppText>
            </AppCard>

            <View style={styles.form}>
                <AppInput label="시작일" placeholder="2026-06-01" value={startDate} onChangeText={setStartDate} />
                <AppInput label="종료일" placeholder="2026-06-03" value={endDate} onChangeText={setEndDate} />
                <AppInput
                    label="사유"
                    placeholder="예: 가족 행사 / 병원 진료 등"
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    maxLength={200}
                    helper={`${reason.length} / 200자`}
                />
            </View>
        </ScreenContainer>
    );
};

function isValidDate(s: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

const styles = StyleSheet.create({
    sub: {marginTop: 4},
    form: {marginTop: spacing.md, gap: spacing.md},
});

export default TimeOffRequestScreen;
