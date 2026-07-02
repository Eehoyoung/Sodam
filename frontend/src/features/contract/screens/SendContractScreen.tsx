/**
 * S1 — 근로계약서 보내기 (사장).
 * StepScaffold 3스텝: ① 대상 직원 선택 → ② 근로조건 입력(전체 §17 A+B+C 항목) → ③ 확인 발송.
 * 발송 = POST /labor-contracts(작성·저장) + POST .../{id}/send(직원 인박스 알림).
 *
 * 근로조건 입력은 당사자정보(읽기전용, /context 조회) → 계약기간 → 임금 → 근로시간·휴일
 * (주 15시간 미만이면 §18③ 에 따라 주휴 섹션 자동 비활성화) → 요일별근무시간표(선택, 단시간근로자)
 * → 취업장소·업무 → 연차 → 수습(선택) → 4대보험 순으로 섹션화했다.
 */
import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {NavigationProp, RouteProp, useNavigation, useRoute, useFocusEffect} from '@react-navigation/native';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppInput,
    AppText,
    AppToast,
    CtaStack,
    SegmentedControl,
    StepScaffold,
    SuccessState,
    ScreenContainer,
    AppHeader,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import api from '../../../common/utils/api';
import {
    DATE_DIGITS_HELPER,
    TIME_DIGITS_HELPER,
    dateDigitsToIso,
    isValidDateDigits,
    isValidTimeDigits,
    sanitizeDateDigits,
    sanitizeTimeDigits,
    timeDigitsToHHmmss,
} from '../../../common/utils/dateTimeInput';
import contractService, {contractErrorMessage} from '../services/contractService';
import {ContractTermsCard} from '../components/ContractTermsCard';
import type {
    ContractPeriodType,
    LaborContract,
    LaborContractContext,
    LaborContractCreatePayload,
    WagePaymentMethod,
} from '../types';

interface StoreEmployee {
    id: number;
    name: string;
    email: string;
}

const WEEKDAYS: Array<{code: string; label: string; field: 'monHours' | 'tueHours' | 'wedHours' | 'thuHours' | 'friHours' | 'satHours' | 'sunHours'}> = [
    {code: 'MONDAY', label: '월', field: 'monHours'},
    {code: 'TUESDAY', label: '화', field: 'tueHours'},
    {code: 'WEDNESDAY', label: '수', field: 'wedHours'},
    {code: 'THURSDAY', label: '목', field: 'thuHours'},
    {code: 'FRIDAY', label: '금', field: 'friHours'},
    {code: 'SATURDAY', label: '토', field: 'satHours'},
    {code: 'SUNDAY', label: '일', field: 'sunHours'},
];

const WEEKLY_ALLOWANCE_THRESHOLD = 15;
const DEFAULT_ANNUAL_LEAVE_NOTE =
    '근로기준법 §60에 따라 1년간 80% 이상 출근 시 연차유급휴가 15일을 부여합니다(1년 미만 근속은 개근한 달마다 1일).';

type ToggleChipProps = {label: string; on: boolean; onPress: () => void};
const ToggleChip: React.FC<ToggleChipProps> = ({label, on, onPress}) => (
    <AppButton
        label={on ? `✓ ${label}` : label}
        size="sm"
        variant={on ? 'primary' : 'secondary'}
        onPress={onPress}
        style={styles.toggleChip}
    />
);

const SectionTitle: React.FC<{children: string}> = ({children}) => (
    <AppText variant="caption" tone="tertiary" weight="800" style={styles.sectionTitle}>
        {children}
    </AppText>
);

const SendContractScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'SendContract'>>();
    const params = route.params;
    const {storeId} = params;

    const [step, setStep] = useState(0);
    const [employees, setEmployees] = useState<StoreEmployee[]>([]);
    const [employeeId, setEmployeeId] = useState<number | undefined>(params.employeeId);
    const [context, setContext] = useState<LaborContractContext | null>(null);

    // 계약 기본
    const [periodType, setPeriodType] = useState<ContractPeriodType>('PERMANENT');
    const [startDate, setStartDateValue] = useState('');
    const setStartDate = (v: string) => setStartDateValue(sanitizeDateDigits(v));
    const [endDate, setEndDateValue] = useState('');
    const setEndDate = (v: string) => setEndDateValue(sanitizeDateDigits(v));

    // 임금
    const [hourlyWage, setHourlyWage] = useState('');
    const [wagePaymentMethod, setWagePaymentMethod] = useState<WagePaymentMethod>('BANK_TRANSFER');
    const [payDay, setPayDay] = useState('');
    const [wageComponents, setWageComponents] = useState('');

    // 근로시간·휴일
    const [hoursPerWeek, setHoursPerWeek] = useState('');
    const [workStart, setWorkStartValue] = useState('');
    const setWorkStart = (v: string) => setWorkStartValue(sanitizeTimeDigits(v));
    const [workEnd, setWorkEndValue] = useState('');
    const setWorkEnd = (v: string) => setWorkEndValue(sanitizeTimeDigits(v));
    const [breakMinutes, setBreakMinutes] = useState('60');
    const [holiday, setHoliday] = useState('SUNDAY');

    // 요일별 근무시간(단시간근로자, 선택)
    const [useWeeklySchedule, setUseWeeklySchedule] = useState(false);
    const [weeklyHours, setWeeklyHours] = useState<Record<string, string>>({});

    // 취업장소·업무·연차
    const [workLocation, setWorkLocation] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [annualLeaveNote, setAnnualLeaveNote] = useState(DEFAULT_ANNUAL_LEAVE_NOTE);

    // 수습
    const [probation, setProbation] = useState(false);
    const [probationMonths, setProbationMonths] = useState('3');
    const [probationWageRate, setProbationWageRate] = useState(0.9);

    // 4대보험
    const [employmentInsurance, setEmploymentInsurance] = useState(true);
    const [industrialAccidentInsurance, setIndustrialAccidentInsurance] = useState(true);
    const [nationalPension, setNationalPension] = useState(true);
    const [healthInsurance, setHealthInsurance] = useState(true);

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

    useFocusEffect(
        useCallback(() => {
            loadEmployees();
        }, [loadEmployees]),
    );

    // 직원이 정해지면 당사자정보·최저임금·가산율 보조정보를 조회해 폼에 자동 반영한다.
    useEffect(() => {
        if (!employeeId) {
            return;
        }
        let cancelled = false;
        contractService
            .getContext(storeId, employeeId)
            .then(ctx => {
                if (cancelled) {return;}
                setContext(ctx);
                setWageComponents(prev => (prev.trim().length > 0 ? prev : ctx.suggestedWageComponents));
            })
            .catch(() => {
                if (!cancelled) {setContext(null);}
            });
        return () => {
            cancelled = true;
        };
    }, [employeeId, storeId]);

    const selectedName =
        employees.find(e => e.id === employeeId)?.name ?? params.employeeName ?? '직원';

    const weeklyAllowanceEligible = (() => {
        const h = Number(hoursPerWeek);
        return hoursPerWeek.trim() !== '' && !Number.isNaN(h) && h >= WEEKLY_ALLOWANCE_THRESHOLD;
    })();

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
        if (!wageComponents.trim()) {
            AppToast.warn('임금 구성항목·계산방법을 입력해 주세요.');
            return null;
        }
        if (!hoursPerWeek.trim() || Number.isNaN(hours) || hours <= 0) {
            AppToast.warn('주 소정근로시간을 입력해 주세요.');
            return null;
        }
        if (!workStart.trim() || !isValidTimeDigits(workStart) || !workEnd.trim() || !isValidTimeDigits(workEnd)) {
            AppToast.warn(`시업·종업 시각을 입력해 주세요. ${TIME_DIGITS_HELPER}`);
            return null;
        }
        if (!workLocation.trim() || !jobDescription.trim()) {
            AppToast.warn('취업 장소와 담당 업무를 입력해 주세요.');
            return null;
        }
        if (!annualLeaveNote.trim()) {
            AppToast.warn('연차유급휴가 안내를 입력해 주세요.');
            return null;
        }
        const payDayNum = payDay.trim() ? Number(payDay) : undefined;
        if (payDayNum !== undefined && (Number.isNaN(payDayNum) || payDayNum < 1 || payDayNum > 31)) {
            AppToast.warn('임금 지급일은 1~31 사이로 입력해 주세요.');
            return null;
        }
        if (startDate.trim() && !isValidDateDigits(startDate)) {
            AppToast.warn(DATE_DIGITS_HELPER);
            return null;
        }
        if (periodType === 'FIXED_TERM' && (!endDate.trim() || !isValidDateDigits(endDate))) {
            AppToast.warn('기간제 계약은 종료일을 입력해 주세요.');
            return null;
        }
        const breakMin = breakMinutes.trim() ? Number(breakMinutes) : undefined;
        const probationMonthsNum = probation ? Number(probationMonths) : undefined;
        if (probation && (!probationMonths.trim() || Number.isNaN(probationMonthsNum) || (probationMonthsNum ?? 0) <= 0)) {
            AppToast.warn('수습기간(개월)을 입력해 주세요.');
            return null;
        }

        const weeklySchedule = useWeeklySchedule
            ? WEEKDAYS.reduce<Record<string, number | undefined>>((acc, d) => {
                  const raw = weeklyHours[d.field];
                  acc[d.field] = raw && raw.trim() !== '' ? Number(raw) : undefined;
                  return acc;
              }, {})
            : {};

        return {
            employeeId,
            periodType,
            hourlyWage: wage,
            wagePaymentMethod,
            wageComponents: wageComponents.trim(),
            wagePaymentDay: payDayNum,
            contractedHoursPerWeek: hours,
            workStartTime: timeDigitsToHHmmss(workStart),
            workEndTime: timeDigitsToHHmmss(workEnd),
            breakMinutes: breakMin,
            weeklyHolidayDay: weeklyAllowanceEligible ? holiday : undefined,
            workLocation: workLocation.trim(),
            jobDescription: jobDescription.trim(),
            annualLeaveNote: annualLeaveNote.trim(),
            startDate: startDate.trim() ? dateDigitsToIso(startDate) : undefined,
            endDate: periodType === 'FIXED_TERM' && endDate.trim() ? dateDigitsToIso(endDate) : undefined,
            probation,
            probationMonths: probationMonthsNum,
            probationWageRate: probation ? probationWageRate : undefined,
            employmentInsurance,
            industrialAccidentInsurance,
            nationalPension,
            healthInsurance,
            ...weeklySchedule,
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
        const weeklyEligible = weeklyAllowanceEligible;
        const refYear = new Date().getFullYear();
        const refValue = context?.minimumWageHourly ?? 0;
        return {
            id: 0,
            employeeId: employeeId ?? 0,
            storeId,
            periodType,
            startDate: startDate.trim() && isValidDateDigits(startDate) ? dateDigitsToIso(startDate) : null,
            endDate: periodType === 'FIXED_TERM' && endDate.trim() && isValidDateDigits(endDate) ? dateDigitsToIso(endDate) : null,
            hourlyWage: Number.isNaN(wage) ? null : wage,
            wagePaymentDay: payDay.trim() ? Number(payDay) : null,
            wagePaymentMethod,
            wageComponents: wageComponents.trim() || null,
            contractedHoursPerWeek: Number.isNaN(hours) ? null : hours,
            workStartTime: isValidTimeDigits(workStart) ? timeDigitsToHHmmss(workStart) : null,
            workEndTime: isValidTimeDigits(workEnd) ? timeDigitsToHHmmss(workEnd) : null,
            breakMinutes: breakMinutes.trim() ? Number(breakMinutes) : null,
            contractedWeeklyDays: null,
            weeklyHolidayDay: weeklyEligible ? holiday : null,
            weeklyAllowanceApplicable: weeklyEligible,
            annualLeaveNote: annualLeaveNote.trim() || null,
            workLocation: workLocation.trim() || null,
            jobDescription: jobDescription.trim() || null,
            probation,
            probationMonths: probation && probationMonths.trim() ? Number(probationMonths) : null,
            probationWageRate: probation ? probationWageRate : null,
            employmentInsurance,
            industrialAccidentInsurance,
            nationalPension,
            healthInsurance,
            minimumWageCompliant: !refValue || (!Number.isNaN(wage) && wage >= refValue),
            minimumWageReferenceYear: refYear,
            minimumWageReferenceValue: refValue,
            monHours: useWeeklySchedule && weeklyHours.monHours ? Number(weeklyHours.monHours) : null,
            tueHours: useWeeklySchedule && weeklyHours.tueHours ? Number(weeklyHours.tueHours) : null,
            wedHours: useWeeklySchedule && weeklyHours.wedHours ? Number(weeklyHours.wedHours) : null,
            thuHours: useWeeklySchedule && weeklyHours.thuHours ? Number(weeklyHours.thuHours) : null,
            friHours: useWeeklySchedule && weeklyHours.friHours ? Number(weeklyHours.friHours) : null,
            satHours: useWeeklySchedule && weeklyHours.satHours ? Number(weeklyHours.satHours) : null,
            sunHours: useWeeklySchedule && weeklyHours.sunHours ? Number(weeklyHours.sunHours) : null,
            signed: false,
            signedAt: null,
            hasSignatureImage: false,
            employeeSignatureImage: null,
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
                onBack={() => navigation.goBack()}
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
                subtitle={`${selectedName}님의 근로계약서 — 근로기준법 §17 필수 기재사항이에요.`}
                onBack={() => setStep(0)}
                footer={
                    <CtaStack>
                        <AppButton label="다음" onPress={goStep3} />
                        <AppButton label="이전" variant="secondary" onPress={() => setStep(0)} />
                    </CtaStack>
                }>
                <View style={styles.form}>
                    {context?.minorWorker ? (
                        <AppCard variant="danger">
                            <AppText variant="bodyMd" weight="800" tone="warning">
                                ⚠ 연소근로자(만 18세 미만)
                            </AppText>
                            <AppText variant="caption" tone="secondary" style={styles.minorSub}>
                                1일 7시간·주 35시간 한도, 22시~06시 야간·휴일근로 원칙 금지(§69·§70). 친권자 동의서를
                                사업장에 비치해 주세요.
                            </AppText>
                        </AppCard>
                    ) : null}

                    {context ? (
                        <AppCard variant="flat">
                            <SectionTitle>당사자 정보</SectionTitle>
                            <View style={styles.partyRow}>
                                <AppText variant="caption" tone="secondary">사업주(매장)</AppText>
                                <AppText variant="titleMd">{context.employerName ?? '-'}</AppText>
                            </View>
                            <AppText variant="caption" tone="tertiary">
                                {context.employerBusinessNumber ?? '사업자번호 미등록'} · {context.employerPhone ?? '전화 미등록'}
                            </AppText>
                            <View style={[styles.partyRow, styles.partyRowGap]}>
                                <AppText variant="caption" tone="secondary">근로자</AppText>
                                <AppText variant="titleMd">{context.employeeName ?? selectedName}</AppText>
                            </View>
                            <AppText variant="caption" tone="tertiary">
                                {context.employeePhone ?? '연락처 미등록'}
                            </AppText>
                        </AppCard>
                    ) : null}

                    <SectionTitle>계약 기간</SectionTitle>
                    <SegmentedControl
                        options={['기간의 정함 없음', '기간제']}
                        value={periodType === 'FIXED_TERM' ? 1 : 0}
                        onChange={i => setPeriodType(i === 1 ? 'FIXED_TERM' : 'PERMANENT')}
                    />
                    <AppInput
                        label="근로개시일(계약 시작일, 선택)"
                        placeholder="20260601"
                        value={startDate}
                        onChangeText={setStartDate}
                        keyboardType="number-pad"
                        maxLength={8}
                        helper={DATE_DIGITS_HELPER}
                    />
                    {periodType === 'FIXED_TERM' ? (
                        <AppInput
                            label="계약 종료일"
                            placeholder="20261231"
                            value={endDate}
                            onChangeText={setEndDate}
                            keyboardType="number-pad"
                            maxLength={8}
                            helper={DATE_DIGITS_HELPER}
                        />
                    ) : null}

                    <SectionTitle>임금</SectionTitle>
                    <AppInput
                        label="시급(원)"
                        placeholder="예: 10320"
                        keyboardType="number-pad"
                        value={hourlyWage}
                        onChangeText={setHourlyWage}
                        helper={
                            context
                                ? `${context.minimumWageYear}년 최저임금 ${context.minimumWageHourly.toLocaleString('ko-KR')}원`
                                : undefined
                        }
                    />
                    <View>
                        <AppText variant="caption" tone="secondary" style={styles.fieldLabel}>
                            지급방법
                        </AppText>
                        <SegmentedControl
                            options={['계좌이체', '현금']}
                            value={wagePaymentMethod === 'CASH' ? 1 : 0}
                            onChange={i => setWagePaymentMethod(i === 1 ? 'CASH' : 'BANK_TRANSFER')}
                        />
                    </View>
                    <AppInput
                        label="임금 지급일(매월, 선택)"
                        placeholder="예: 25"
                        keyboardType="number-pad"
                        value={payDay}
                        onChangeText={setPayDay}
                    />
                    <AppInput
                        label="임금 구성항목·계산방법"
                        placeholder="기본급·수당 구성과 연장/야간/휴일 가산 계산방법"
                        value={wageComponents}
                        onChangeText={setWageComponents}
                        multiline
                        multilineMinHeight={72}
                    />

                    <SectionTitle>근로시간·휴일</SectionTitle>
                    <AppInput
                        label="주 소정근로시간"
                        placeholder="예: 40"
                        keyboardType="number-pad"
                        value={hoursPerWeek}
                        onChangeText={setHoursPerWeek}
                    />
                    <View style={styles.timeRow}>
                        <AppInput
                            label="시업 시각"
                            placeholder="0900"
                            value={workStart}
                            onChangeText={setWorkStart}
                            keyboardType="number-pad"
                            maxLength={4}
                            containerStyle={styles.timeField}
                        />
                        <AppInput
                            label="종업 시각"
                            placeholder="1800"
                            value={workEnd}
                            onChangeText={setWorkEnd}
                            keyboardType="number-pad"
                            maxLength={4}
                            containerStyle={styles.timeField}
                        />
                    </View>
                    <AppText variant="caption" tone="tertiary">{TIME_DIGITS_HELPER}</AppText>
                    <AppInput
                        label="휴게시간(분)"
                        placeholder="예: 60"
                        keyboardType="number-pad"
                        value={breakMinutes}
                        onChangeText={setBreakMinutes}
                    />

                    {weeklyAllowanceEligible ? (
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
                    ) : (
                        <AppCard variant="outlined">
                            <AppText variant="caption" tone="secondary">
                                주 소정근로시간이 {WEEKLY_ALLOWANCE_THRESHOLD}시간 미만이면 근로기준법 §18③에 따라
                                주휴(유급휴일)가 발생하지 않아요. 소정근로시간을 15시간 이상으로 입력하면 주휴일을
                                선택할 수 있어요.
                            </AppText>
                        </AppCard>
                    )}

                    <AppCard
                        variant="outlined"
                        selected={useWeeklySchedule}
                        onPress={() => setUseWeeklySchedule(prev => !prev)}
                        accessibilityLabel="요일별 근무시간이 달라요">
                        <AppText variant="titleMd">요일마다 근무시간이 달라요(단시간근로자)</AppText>
                        <AppText variant="caption" tone="secondary" style={styles.toggleHint}>
                            체크하면 요일별 근로시간을 각각 입력할 수 있어요. 기간제 및 단시간근로자 보호법
                            §17에 따라 근로일별 근로시간을 명시해야 해요.
                        </AppText>
                    </AppCard>
                    {useWeeklySchedule ? (
                        <View style={styles.weekHoursRow}>
                            {WEEKDAYS.map(d => (
                                <AppInput
                                    key={d.field}
                                    label={d.label}
                                    placeholder="0"
                                    keyboardType="number-pad"
                                    value={weeklyHours[d.field] ?? ''}
                                    onChangeText={v => setWeeklyHours(prev => ({...prev, [d.field]: v.replace(/[^0-9.]/g, '')}))}
                                    containerStyle={styles.weekHourField}
                                />
                            ))}
                        </View>
                    ) : null}

                    <SectionTitle>취업 장소·업무</SectionTitle>
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

                    <SectionTitle>연차유급휴가</SectionTitle>
                    <AppInput
                        label="연차 안내"
                        value={annualLeaveNote}
                        onChangeText={setAnnualLeaveNote}
                        multiline
                        multilineMinHeight={72}
                    />

                    <SectionTitle>수습(선택)</SectionTitle>
                    <AppCard
                        variant="outlined"
                        selected={probation}
                        onPress={() => setProbation(prev => !prev)}
                        accessibilityLabel="수습 적용">
                        <AppText variant="titleMd">수습을 적용해요</AppText>
                        <AppText variant="caption" tone="secondary" style={styles.toggleHint}>
                            1년 이상 계약 + 수습 3개월 이내(단순노무 제외) 요건 충족 시 최저임금의 90%까지
                            감액할 수 있어요(§5②).
                        </AppText>
                    </AppCard>
                    {probation ? (
                        <>
                            <AppInput
                                label="수습기간(개월)"
                                placeholder="예: 3"
                                keyboardType="number-pad"
                                value={probationMonths}
                                onChangeText={setProbationMonths}
                            />
                            <View>
                                <AppText variant="caption" tone="secondary" style={styles.fieldLabel}>
                                    수습 중 임금
                                </AppText>
                                <SegmentedControl
                                    options={['정상 지급(100%)', '90% 감액']}
                                    value={probationWageRate < 1 ? 1 : 0}
                                    onChange={i => setProbationWageRate(i === 1 ? 0.9 : 1.0)}
                                />
                            </View>
                        </>
                    ) : null}

                    <SectionTitle>4대보험 적용</SectionTitle>
                    <View style={styles.insuranceRow}>
                        <ToggleChip label="고용보험" on={employmentInsurance} onPress={() => setEmploymentInsurance(v => !v)} />
                        <ToggleChip label="산재보험" on={industrialAccidentInsurance} onPress={() => setIndustrialAccidentInsurance(v => !v)} />
                        <ToggleChip label="국민연금" on={nationalPension} onPress={() => setNationalPension(v => !v)} />
                        <ToggleChip label="건강보험" on={healthInsurance} onPress={() => setHealthInsurance(v => !v)} />
                    </View>
                </View>
            </StepScaffold>
        );
    }

    // ③ 확인 후 발송
    const preview = previewContract();
    return (
        <StepScaffold
            progress={1}
            title="내용을 확인해 주세요"
            subtitle={`${selectedName}님에게 아래 근로계약서를 보낼게요.`}
            onBack={() => setStep(1)}
            footer={
                <CtaStack>
                    <AppButton label="근로계약서 보내기" onPress={send} loading={sending} />
                    <AppButton label="이전" variant="secondary" onPress={() => setStep(1)} />
                </CtaStack>
            }>
            {!preview.minimumWageCompliant ? (
                <AppBadge label="최저임금 확인 필요" tone="error" style={styles.mwBadge} />
            ) : null}
            <ContractTermsCard contract={preview} />
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
    sectionTitle: {marginTop: spacing.sm, letterSpacing: 0.4},
    weekRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    weekBtn: {minWidth: 44},
    weekHoursRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    weekHourField: {width: 64},
    timeRow: {flexDirection: 'row', gap: spacing.sm},
    timeField: {flex: 1},
    toggleHint: {marginTop: spacing.xs},
    toggleChip: {minWidth: 0},
    insuranceRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    partyRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
    partyRowGap: {marginTop: spacing.sm},
    minorSub: {marginTop: spacing.xs},
    mwBadge: {marginBottom: spacing.sm},
    disclaimer: {marginTop: spacing.lg},
});

export default SendContractScreen;
