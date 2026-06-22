/**
 * S1 — 근로계약서 보내기 (사장).
 * StepScaffold 3스텝: ① 대상 직원 선택 → ② 근로조건 입력/확인 → ③ 발송.
 * 발송 = POST /labor-contracts(작성·저장) + POST .../{id}/send(직원 인박스 알림).
 */
import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {NavigationProp, RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {
    AppButton,
    AppCard,
    AppInput,
    AppText,
    AppToast,
    CtaStack,
    StepScaffold,
    SuccessState,
    ScreenContainer,
    AppHeader,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import api from '../../../common/utils/api';
import contractService, {contractErrorMessage} from '../services/contractService';
import {ContractTermsCard} from '../components/ContractTermsCard';
import type {LaborContract, LaborContractCreatePayload} from '../types';

interface StoreEmployee {
    id: number;
    name: string;
    email: string;
}

const WEEKDAYS: Array<{code: string; label: string}> = [
    {code: 'MONDAY', label: '월'},
    {code: 'TUESDAY', label: '화'},
    {code: 'WEDNESDAY', label: '수'},
    {code: 'THURSDAY', label: '목'},
    {code: 'FRIDAY', label: '금'},
    {code: 'SATURDAY', label: '토'},
    {code: 'SUNDAY', label: '일'},
];

const SendContractScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'SendContract'>>();
    const params = route.params;
    const {storeId} = params;

    const [step, setStep] = useState(0);
    const [employees, setEmployees] = useState<StoreEmployee[]>([]);
    const [employeeId, setEmployeeId] = useState<number | undefined>(params.employeeId);

    // 근로조건 입력 상태
    const [hourlyWage, setHourlyWage] = useState('');
    const [hoursPerWeek, setHoursPerWeek] = useState('');
    const [payDay, setPayDay] = useState('');
    const [holiday, setHoliday] = useState('SUNDAY');
    const [workLocation, setWorkLocation] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [startDate, setStartDate] = useState('');

    const [sending, setSending] = useState(false);
    const [done, setDone] = useState(false);

    const loadEmployees = useCallback(async () => {
        try {
            const res = await api.get<StoreEmployee[]>(`/api/stores/${storeId}/employees`);
            setEmployees(res.data);
        } catch {
            AppToast.error('직원 목록을 불러오지 못했어요.');
        }
    }, [storeId]);

    useEffect(() => {
        loadEmployees();
    }, [loadEmployees]);

    const selectedName =
        employees.find(e => e.id === employeeId)?.name ?? params.employeeName ?? '직원';

    const goStep2 = () => {
        if (!employeeId) {
            AppToast.warn('계약서를 보낼 직원을 선택해 주세요.');
            return;
        }
        setStep(1);
    };

    const buildPayload = (): LaborContractCreatePayload | null => {
        const wage = Number(hourlyWage);
        const hours = Number(hoursPerWeek);
        if (!employeeId) {
            AppToast.warn('직원을 선택해 주세요.');
            return null;
        }
        if (!hourlyWage.trim() || Number.isNaN(wage) || wage < 0) {
            AppToast.warn('시급을 올바르게 입력해 주세요.');
            return null;
        }
        if (!hoursPerWeek.trim() || Number.isNaN(hours) || hours <= 0) {
            AppToast.warn('주 소정근로시간을 입력해 주세요.');
            return null;
        }
        if (!workLocation.trim() || !jobDescription.trim()) {
            AppToast.warn('취업 장소와 담당 업무를 입력해 주세요.');
            return null;
        }
        const payDayNum = payDay.trim() ? Number(payDay) : undefined;
        if (payDayNum !== undefined && (Number.isNaN(payDayNum) || payDayNum < 1 || payDayNum > 31)) {
            AppToast.warn('임금 지급일은 1~31 사이로 입력해 주세요.');
            return null;
        }
        return {
            employeeId,
            hourlyWage: wage,
            contractedHoursPerWeek: hours,
            wagePaymentDay: payDayNum,
            weeklyHolidayDay: holiday,
            workLocation: workLocation.trim(),
            jobDescription: jobDescription.trim(),
            startDate: startDate.trim() || undefined,
        };
    };

    const goStep3 = () => {
        if (buildPayload()) {
            setStep(2);
        }
    };

    const previewContract = (): LaborContract => {
        const wage = Number(hourlyWage);
        const hours = Number(hoursPerWeek);
        return {
            id: 0,
            employeeId: employeeId ?? 0,
            storeId,
            startDate: startDate.trim() || null,
            endDate: null,
            hourlyWage: Number.isNaN(wage) ? null : wage,
            wagePaymentDay: payDay.trim() ? Number(payDay) : null,
            contractedHoursPerWeek: Number.isNaN(hours) ? null : hours,
            weeklyHolidayDay: holiday,
            annualLeaveNote: null,
            workLocation: workLocation.trim() || null,
            jobDescription: jobDescription.trim() || null,
            signed: false,
            signedAt: null,
            createdAt: null,
            updatedAt: null,
        };
    };

    const send = async () => {
        const payload = buildPayload();
        if (!payload) {
            return;
        }
        setSending(true);
        try {
            const created = await contractService.create(storeId, payload);
            await contractService.send(storeId, created.id);
            setDone(true);
        } catch (e: unknown) {
            AppToast.error(contractErrorMessage(e, '발송에 실패했어요. 잠시 후 다시 시도해 주세요.'));
        } finally {
            setSending(false);
        }
    };

    if (done) {
        return (
            <ScreenContainer header={<AppHeader title="발송 완료" onBack={() => navigation.goBack()} />}>
                <SuccessState
                    title="근로계약서를 보냈어요"
                    description={`${selectedName}님에게 근로계약서를 보냈어요. 서명하면 알려드릴게요.`}
                    primary={{label: '직원 상세로 돌아가기', onPress: () => navigation.goBack()}}
                />
            </ScreenContainer>
        );
    }

    // ① 대상 직원 선택
    if (step === 0) {
        return (
            <StepScaffold
                progress={1 / 3}
                title="누구에게 보낼까요?"
                subtitle="근로계약서를 보낼 직원을 선택해 주세요."
                footer={
                    <CtaStack>
                        <AppButton label="다음" onPress={goStep2} disabled={!employeeId} />
                    </CtaStack>
                }>
                <View style={styles.list}>
                    {employees.length === 0 ? (
                        <AppText variant="bodyMd" tone="secondary">
                            매장에 등록된 직원이 없어요.
                        </AppText>
                    ) : (
                        employees.map(emp => (
                            <AppCard
                                key={String(emp.id)}
                                variant="outlined"
                                selected={emp.id === employeeId}
                                onPress={() => setEmployeeId(emp.id)}
                                accessibilityLabel={`${emp.name} 선택`}>
                                <AppText variant="titleMd">{emp.name}</AppText>
                                <AppText variant="caption" tone="secondary" style={styles.email}>
                                    {emp.email.trim().length > 0 ? emp.email : '이메일 미등록'}
                                </AppText>
                            </AppCard>
                        ))
                    )}
                </View>
            </StepScaffold>
        );
    }

    // ② 근로조건 입력
    if (step === 1) {
        return (
            <StepScaffold
                progress={2 / 3}
                title="근로조건을 입력해 주세요"
                subtitle={`${selectedName}님의 시급·근무시간 등을 입력해 주세요.`}
                footer={
                    <CtaStack>
                        <AppButton label="다음" onPress={goStep3} />
                        <AppButton label="이전" variant="secondary" onPress={() => setStep(0)} />
                    </CtaStack>
                }>
                <View style={styles.form}>
                    <AppInput
                        label="시급(원)"
                        placeholder="예: 10320"
                        keyboardType="number-pad"
                        value={hourlyWage}
                        onChangeText={setHourlyWage}
                    />
                    <AppInput
                        label="주 소정근로시간"
                        placeholder="예: 40"
                        keyboardType="number-pad"
                        value={hoursPerWeek}
                        onChangeText={setHoursPerWeek}
                    />
                    <AppInput
                        label="임금 지급일(매월, 선택)"
                        placeholder="예: 25"
                        keyboardType="number-pad"
                        value={payDay}
                        onChangeText={setPayDay}
                    />
                    <View>
                        <AppText variant="caption" tone="secondary" style={styles.fieldLabel}>
                            주휴일
                        </AppText>
                        <View style={styles.weekRow}>
                            {WEEKDAYS.map(d => {
                                const active = d.code === holiday;
                                return (
                                    <AppButton
                                        key={d.code}
                                        label={d.label}
                                        size="sm"
                                        variant={active ? 'primary' : 'secondary'}
                                        onPress={() => setHoliday(d.code)}
                                        style={styles.weekBtn}
                                    />
                                );
                            })}
                        </View>
                    </View>
                    <AppInput
                        label="취업 장소"
                        placeholder="예: 소담카페 서울점"
                        value={workLocation}
                        onChangeText={setWorkLocation}
                    />
                    <AppInput
                        label="담당 업무"
                        placeholder="예: 홀 서빙 및 매장 관리"
                        value={jobDescription}
                        onChangeText={setJobDescription}
                    />
                    <AppInput
                        label="계약 시작일(선택)"
                        placeholder="2026-06-01"
                        value={startDate}
                        onChangeText={setStartDate}
                    />
                </View>
            </StepScaffold>
        );
    }

    // ③ 확인 후 발송
    return (
        <StepScaffold
            progress={1}
            title="내용을 확인해 주세요"
            subtitle={`${selectedName}님에게 아래 근로계약서를 보낼게요.`}
            footer={
                <CtaStack>
                    <AppButton label="근로계약서 보내기" onPress={send} loading={sending} />
                    <AppButton label="이전" variant="secondary" onPress={() => setStep(1)} />
                </CtaStack>
            }>
            <ContractTermsCard contract={previewContract()} />
            <AppText variant="caption" tone="tertiary" style={styles.disclaimer}>
                발송하면 직원에게 알림이 가요. 직원이 내용을 확인하고 전자서명하면 근로계약이 성립하며, 서명 시각이 함께 기록됩니다.
            </AppText>
        </StepScaffold>
    );
};

const styles = StyleSheet.create({
    list: {gap: spacing.sm},
    email: {marginTop: 2},
    form: {gap: spacing.md},
    fieldLabel: {marginBottom: spacing.xs},
    weekRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    weekBtn: {minWidth: 44},
    disclaimer: {marginTop: spacing.lg},
});

export default SendContractScreen;
