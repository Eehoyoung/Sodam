/**
 * S1 — 근로계약서 보내기 (사장).
 * StepScaffold 3스텝: ① 대상 직원 선택 → ② 근로조건 입력(전체 §17 A+B+C 항목) → ③ 확인 발송.
 * 발송 = POST /labor-contracts(작성·저장) + POST .../{id}/send(직원 인박스 알림).
 *
 * 근로조건 입력은 당사자정보(읽기전용, /context 조회) → 계약기간 → 임금 → 근로시간·휴일
 * (주 15시간 미만이면 §18③ 에 따라 휴일·연차 자동 비활성화) → 요일별근무시간표(선택, 단시간근로자)
 * → 취업장소·업무 → 연차 → 수습(선택) → 4대보험 순으로 섹션화했다.
 */
import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, Share, StyleSheet, View} from 'react-native';
import {NavigationProp, RouteProp, useNavigation, useRoute, useFocusEffect} from '@react-navigation/native';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {
    AppBadge,
    AppButton,
    AppCard,
    ConfirmSheet,
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
    timeDigitsToHHmm,
    timeDigitsToHHmmss,
} from '../../../common/utils/dateTimeInput';
import contractService, {contractErrorMessage} from '../services/contractService';
import storeService from '../../store/services/storeService';
import {ContractTermsCard} from '../components/ContractTermsCard';
import type {
    ContractPeriodType,
    LaborContract,
    LaborContractContext,
    LaborContractCreatePayload,
    WagePaymentMethod,
    WorkScheduleDayCode,
    WorkScheduleDayDto,
} from '../types';
import {
    buildSalaryWageComponents,
    calculateSalaryContract,
    type ContractPayType,
    formatWon,
    type SalaryPayUnit,
} from '../core/salaryContractCalculator';
import {
    breakMinutesOfDay,
    buildSchedulePreviewLines,
    buildSchedulePreviewWageComponents,
    calculateScheduleSalary,
    type ScheduleSalaryBreakdown,
} from '../core/scheduleSalaryCalculator';
import {autoBreakDigitsFromTimeDigits} from '../core/breakTimeCalculator';

interface StoreEmployee {
    id: number;
    name: string;
    email: string;
}

const WEEKDAYS: Array<{code: WorkScheduleDayCode; label: string; field: 'monHours' | 'tueHours' | 'wedHours' | 'thuHours' | 'friHours' | 'satHours' | 'sunHours'}> = [
    {code: 'MONDAY', label: '월', field: 'monHours'},
    {code: 'TUESDAY', label: '화', field: 'tueHours'},
    {code: 'WEDNESDAY', label: '수', field: 'wedHours'},
    {code: 'THURSDAY', label: '목', field: 'thuHours'},
    {code: 'FRIDAY', label: '금', field: 'friHours'},
    {code: 'SATURDAY', label: '토', field: 'satHours'},
    {code: 'SUNDAY', label: '일', field: 'sunHours'},
];

const WEEKLY_ALLOWANCE_THRESHOLD = 15;
const PROBATION_REDUCTION_MAX_MONTHS = 3;
const PROBATION_REDUCTION_RATE = 0.9;
const WEEKS_PER_MONTH = 52 / 12;
const HEALTH_INSURANCE_MONTHLY_HOURS_THRESHOLD = 60;
const NATIONAL_PENSION_MIN_AGE = 18;
const NATIONAL_PENSION_MAX_EXCLUSIVE_AGE = 60;
const DEFAULT_ANNUAL_LEAVE_NOTE =
    '근로기준법 §60에 따라 1년간 80% 이상 출근 시 연차유급휴가 15일을 부여합니다(1년 미만 근속은 개근한 달마다 1일).';
const SMALL_BUSINESS_ANNUAL_LEAVE_NOTE =
    '상시근로자 5인 미만 사업장은 근로기준법 §11에 따라 연차유급휴가 조항이 적용되지 않습니다.';

type HelpTopic =
    | 'contractType'
    | 'headcount'
    | 'wage'
    | 'monthlySalary'
    | 'scheduleSalary'
    | 'standardHours'
    | 'weeklyHoliday'
    | 'annualLeave'
    | 'probation'
    | 'insurance';

const HELP_TOPICS: Record<HelpTopic, {title: string; description: string}> = {
    contractType: {
        title: '시급제와 월급제 차이',
        description:
            '시급제는 실제 근무시간에 시급을 곱해 임금을 계산하는 방식이에요. 아르바이트·단시간 근로에 주로 씁니다.\n\n월급제/연봉제는 월 고정급 또는 연봉을 정하고, 월 통상임금 산정 기준시간으로 통상시급을 환산해 연장·야간·휴일수당과 공제 기준으로 사용해요.',
    },
    headcount: {
        title: '상시근로자 5인 기준',
        description:
            '근로기준법은 원칙적으로 상시 5명 이상 사업장에 전면 적용돼요. 5인 미만은 연장·야간·휴일 가산수당과 연차유급휴가 일부 조항이 적용 제외됩니다.\n\n앱에서는 현재 매장 활성 직원 수와 저장된 5인 이상 여부를 기준으로 안내합니다. 실제 상시근로자 수는 시행령상 일정 기간의 연인원 산정이 필요할 수 있어요.',
    },
    wage: {
        title: '임금 구성항목·계산방법',
        description:
            '근로계약서에는 임금액뿐 아니라 기본급, 주휴수당, 연장·야간·휴일수당, 지급일, 지급방법, 계산방법을 명확히 적어야 해요.\n\n시급제는 시급과 실제 근무시간 중심으로 쓰고, 월급제는 월급/연봉에서 통상시급을 환산한 뒤 추가수당 산식을 함께 적습니다.',
    },
    monthlySalary: {
        title: '월급/연봉 환산',
        description:
            '월급제는 월 기본급을 월 통상임금 산정 기준시간으로 나눠 통상시급을 계산합니다. 주 40시간 근로자는 보통 주휴 포함 209시간을 기준으로 봅니다.\n\n연봉제는 입력한 연봉을 12개월로 나눈 금액을 월 기본급으로 보고 같은 방식으로 통상시급을 산정합니다.',
    },
    scheduleSalary: {
        title: '스케줄로 월급 자동 계산',
        description:
            '요일별 출퇴근·휴게 시각과 급여 기준시급을 입력하면 근로기준법 산식으로 월 기본급과 고정 연장·야간수당을 자동 계산해요.\n\n주 소정근로는 최대 40시간(주휴 포함 월 209시간)이고, 일 8시간 또는 주 40시간 초과분은 고정 연장으로, 22시~06시 근무는 야간가산으로 계산합니다. 5인 미만 사업장은 연장 1.5배·야간 0.5배 가산이 적용되지 않아요.\n\n여기 표시되는 금액은 미리보기이고, 최종 금액·산출근거는 발급 시 서버가 동일 산식으로 다시 계산해 확정합니다.',
    },
    standardHours: {
        title: '주 소정근로시간',
        description:
            '소정근로시간은 근로자와 사업주가 계약으로 정한 기본 근로시간이에요. 주 15시간 미만이면 주휴일·연차유급휴가가 적용되지 않습니다.\n\n월급제에서는 이 시간이 월 통상임금 산정 기준시간과 통상시급 계산의 출발점이 됩니다.',
    },
    weeklyHoliday: {
        title: '주휴일과 주휴수당',
        description:
            '주 15시간 이상 근무하기로 한 근로자가 정해진 근무일을 개근하면 1주에 평균 1회 이상의 유급휴일을 줘야 합니다.\n\n시급제에서는 주휴수당이 별도 계산될 수 있고, 월급제는 보통 월 기본급에 주휴분이 포함된 구조로 적습니다.',
    },
    annualLeave: {
        title: '연차유급휴가',
        description:
            '연차는 일정 기간 출근한 근로자에게 유급으로 쉬는 날을 부여하는 제도예요.\n\n상시근로자 5인 이상이고 주 15시간 이상인 경우를 기준으로 적용합니다. 5인 미만 사업장 또는 주 15시간 미만 근로자는 앱에서 자동으로 미적용 안내를 표시합니다.',
    },
    probation: {
        title: '수습기간',
        description:
            '근로기준법에 수습기간 자체를 몇 개월로 해야 한다는 조항은 없고, 실무상 3개월을 많이 둡니다.\n\n최저임금 90% 감액은 1년 이상 계약, 비단순노무직, 수습 시작 후 3개월 이내 조건을 모두 만족할 때만 가능합니다.',
    },
    insurance: {
        title: '4대보험 자동 적용',
        description:
            '산재보험은 근로시간·기간과 무관하게 적용됩니다. 고용보험은 1개월 이상 계약과 주 15시간 이상을 기준으로 판단합니다.\n\n건강보험은 월 60시간 이상 여부, 국민연금은 나이와 기준소득월액 하한 등을 함께 봅니다. 화면의 체크값은 입력한 계약조건에 따라 자동 계산됩니다.',
    },
};

/** 월급제 급여 입력 방식 — 스케줄 자동 산출(기본) vs 월급 직접 입력(기존 폼). 시급제와 무관. */
type SalaryInputMode = 'SCHEDULE' | 'DIRECT';

/** 요일 1개의 시각 입력 초안(4자리 숫자 문자열). 휴게는 쌍으로만 유효, 둘 다 비우면 휴게 없음. */
type DayTimeDraft = {start: string; end: string; breakStart: string; breakEnd: string};

const EMPTY_DAY_TIME: DayTimeDraft = {start: '', end: '', breakStart: '', breakEnd: ''};

/**
 * 출근/퇴근 시각 입력 필드 변경을 반영하고, 휴게 시각이 아직 비어 있으면(사용자가 손댄 적
 * 없으면) §54 법정 최소 휴게를 자동 산출해 채운다. 휴게 필드를 직접 입력한 요일은 이후
 * 출퇴근 시각을 바꿔도 자동 산출이 덮어쓰지 않는다(수동 입력 우선).
 */
function applyDayTimeChange(prevDraft: DayTimeDraft, field: keyof DayTimeDraft, rawValue: string): DayTimeDraft {
    const next: DayTimeDraft = {...prevDraft, [field]: sanitizeTimeDigits(rawValue)};
    const isStartOrEnd = field === 'start' || field === 'end';
    const breakUntouched = next.breakStart.trim() === '' && next.breakEnd.trim() === '';
    if (isStartOrEnd && breakUntouched) {
        const auto = autoBreakDigitsFromTimeDigits(next.start, next.end);
        if (auto) {
            next.breakStart = auto.breakStart;
            next.breakEnd = auto.breakEnd;
        }
    }
    return next;
}

/** 주 연장 12h(= 주 52시간, §53) 초과 경고 기준 — 경고만 표시하고 저장은 차단하지 않는다. */
const WEEKLY_OVERTIME_LIMIT_HOURS = 12;

type ScheduleFormState =
    | {status: 'incomplete'; message: string}
    | {status: 'invalid'; message: string}
    | {status: 'ready'; days: WorkScheduleDayDto[]};

type ToggleChipProps = {label: string; on: boolean; onPress: () => void; disabled?: boolean};
const ToggleChip: React.FC<ToggleChipProps> = ({label, on, onPress, disabled}) => (
    <AppButton
        label={on ? `✓ ${label}` : label}
        size="sm"
        variant={on ? 'primary' : 'secondary'}
        onPress={onPress}
        disabled={disabled}
        style={styles.toggleChip}
    />
);

/** 요일 1개의 출근/퇴근/휴게 시각 입력 세트 — 기존 시업·종업 4자리 숫자 입력 패턴과 동일. */
const DayTimeFields: React.FC<{
    value: DayTimeDraft;
    onChange: (field: keyof DayTimeDraft, v: string) => void;
}> = ({value, onChange}) => (
    <View style={styles.dayTimeGroup}>
        <View style={styles.timeRow}>
            <AppInput
                label="출근 시각"
                placeholder="1700"
                keyboardType="number-pad"
                maxLength={4}
                value={value.start}
                onChangeText={v => onChange('start', v)}
                containerStyle={styles.timeField}
            />
            <AppInput
                label="퇴근 시각"
                placeholder="2200"
                keyboardType="number-pad"
                maxLength={4}
                value={value.end}
                onChangeText={v => onChange('end', v)}
                containerStyle={styles.timeField}
            />
        </View>
        <View style={styles.timeRow}>
            <AppInput
                label="휴게 시작(자동입력)"
                placeholder="1500"
                keyboardType="number-pad"
                maxLength={4}
                value={value.breakStart}
                onChangeText={v => onChange('breakStart', v)}
                containerStyle={styles.timeField}
            />
            <AppInput
                label="휴게 종료(자동입력)"
                placeholder="1600"
                keyboardType="number-pad"
                maxLength={4}
                value={value.breakEnd}
                onChangeText={v => onChange('breakEnd', v)}
                containerStyle={styles.timeField}
            />
        </View>
    </View>
);

const SectionTitle: React.FC<{children: string}> = ({children}) => (
    <AppText variant="caption" tone="tertiary" weight="800" style={styles.sectionTitle}>
        {children}
    </AppText>
);

const HelpButton: React.FC<{topic: HelpTopic}> = ({topic}) => (
    <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${HELP_TOPICS[topic].title} 도움말`}
        hitSlop={8}
        style={styles.helpButton}
        onPress={() => {
            const help = HELP_TOPICS[topic];
            ConfirmSheet.confirm({
                title: help.title,
                description: help.description,
                primary: {label: '확인'},
            });
        }}>
        <AppText variant="caption" weight="900" style={styles.helpButtonText}>?</AppText>
    </Pressable>
);

const HelpSectionTitle: React.FC<{children: string; topic: HelpTopic}> = ({children, topic}) => (
    <View style={styles.sectionTitleRow}>
        <SectionTitle>{children}</SectionTitle>
        <HelpButton topic={topic} />
    </View>
);

function isFixedTermAtLeastOneYear(startDigits: string, endDigits: string): boolean {
    if (!isValidDateDigits(startDigits) || !isValidDateDigits(endDigits)) {
        return false;
    }
    const startIso = dateDigitsToIso(startDigits);
    const endIso = dateDigitsToIso(endDigits);
    const [sy, sm, sd] = startIso.split('-').map(Number);
    const [ey, em, ed] = endIso.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    const oneYearInclusiveEnd = new Date(start);
    oneYearInclusiveEnd.setFullYear(oneYearInclusiveEnd.getFullYear() + 1);
    oneYearInclusiveEnd.setDate(oneYearInclusiveEnd.getDate() - 1);
    return end >= oneYearInclusiveEnd;
}

function isFixedTermAtLeastOneMonth(startDigits: string, endDigits: string): boolean {
    if (!isValidDateDigits(startDigits) || !isValidDateDigits(endDigits)) {
        return false;
    }
    const startIso = dateDigitsToIso(startDigits);
    const endIso = dateDigitsToIso(endDigits);
    const [sy, sm, sd] = startIso.split('-').map(Number);
    const [ey, em, ed] = endIso.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    const oneMonthInclusiveEnd = new Date(start);
    oneMonthInclusiveEnd.setMonth(oneMonthInclusiveEnd.getMonth() + 1);
    oneMonthInclusiveEnd.setDate(oneMonthInclusiveEnd.getDate() - 1);
    return end >= oneMonthInclusiveEnd;
}

function ageOn(dateIso: string | null | undefined, referenceIso: string): number | null {
    if (!dateIso) {return null;}
    const [by, bm, bd] = dateIso.split('-').map(Number);
    const [ry, rm, rd] = referenceIso.split('-').map(Number);
    if ([by, bm, bd, ry, rm, rd].some(Number.isNaN)) {return null;}
    let age = ry - by;
    if (rm < bm || (rm === bm && rd < bd)) {
        age -= 1;
    }
    return age;
}

function weeklyAllowanceHours(weeklyHours: number): number {
    if (weeklyHours < WEEKLY_ALLOWANCE_THRESHOLD) {
        return 0;
    }
    return Math.min(8, (weeklyHours / 40) * 8);
}

function sanitizeDecimalInput(v: string): string {
    return v.replace(/[^0-9.]/g, '');
}

function sanitizeIntegerInput(v: string): string {
    return v.replace(/[^0-9]/g, '');
}

function numberOrZero(raw: string): number {
    const n = Number(raw);
    return raw.trim() === '' || Number.isNaN(n) ? 0 : n;
}

const SendContractScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'SendContract'>>();
    const params = route.params;
    const {storeId} = params;

    const [step, setStep] = useState(0);
    const [employees, setEmployees] = useState<StoreEmployee[]>([]);
    const [employeeId, setEmployeeId] = useState<number | undefined>(params.employeeId);
    const [context, setContext] = useState<LaborContractContext | null>(null);
    const [contractPayType, setContractPayType] = useState<ContractPayType>('HOURLY');
    const [fiveOrMoreEmployees, setFiveOrMoreEmployees] = useState(true);

    // 계약 기본
    const [periodType, setPeriodType] = useState<ContractPeriodType>('PERMANENT');
    const [startDate, setStartDateValue] = useState('');
    const setStartDate = (v: string) => setStartDateValue(sanitizeDateDigits(v));
    const [endDate, setEndDateValue] = useState('');
    const setEndDate = (v: string) => setEndDateValue(sanitizeDateDigits(v));

    // 임금
    const [hourlyWage, setHourlyWage] = useState('');
    const [salaryPayUnit, setSalaryPayUnit] = useState<SalaryPayUnit>('MONTHLY');
    const [salaryAmount, setSalaryAmountValue] = useState('');
    const setSalaryAmount = (v: string) => setSalaryAmountValue(sanitizeIntegerInput(v));
    const [fixedOvertimeHours, setFixedOvertimeHours] = useState('');
    const [fixedNightHours, setFixedNightHours] = useState('');
    const [fixedHolidayHoursWithin8, setFixedHolidayHoursWithin8] = useState('');
    const [fixedHolidayHoursOver8, setFixedHolidayHoursOver8] = useState('');
    const [wagePaymentMethod, setWagePaymentMethod] = useState<WagePaymentMethod>('BANK_TRANSFER');
    const [payDay, setPayDay] = useState('');
    const [wageComponents, setWageComponents] = useState('');

    // 월급제 — 스케줄 자동 산출(기본) / 직접 입력. 시급제(HOURLY) 경로와 완전 분리.
    const [salaryInputMode, setSalaryInputMode] = useState<SalaryInputMode>('SCHEDULE');
    const [scheduleDayOn, setScheduleDayOn] = useState<Partial<Record<WorkScheduleDayCode, boolean>>>({});
    const [scheduleSameDaily, setScheduleSameDaily] = useState(true);
    const [uniformDayTime, setUniformDayTime] = useState<DayTimeDraft>(EMPTY_DAY_TIME);
    const [perDayTime, setPerDayTime] = useState<Partial<Record<WorkScheduleDayCode, DayTimeDraft>>>({});
    const [salaryBaseWage, setSalaryBaseWageValue] = useState('');
    const setSalaryBaseWage = (v: string) => setSalaryBaseWageValue(sanitizeIntegerInput(v));
    const [storeStandardWage, setStoreStandardWage] = useState<number | null>(null);

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
    const [probationWageRate, setProbationWageRate] = useState(1.0);
    const [simpleLabor, setSimpleLabor] = useState(true);

    // 4대보험
    const [employmentInsurance, setEmploymentInsurance] = useState(true);
    const [industrialAccidentInsurance, setIndustrialAccidentInsurance] = useState(true);
    const [nationalPension, setNationalPension] = useState(true);
    const [healthInsurance, setHealthInsurance] = useState(true);

    const [sending, setSending] = useState(false);
    const [done, setDone] = useState(false);
    const [sentContractId, setSentContractId] = useState<number | null>(null);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    // create() 는 성공했는데 이어지는 send()가 실패한 경우(네트워크 순단 등) 재시도 시 그대로
    // 두면 buildPayload()를 다시 태워 계약서를 중복 생성한다. 이미 만든 계약 id를 기억해 두고
    // 재시도는 send()만 다시 호출한다.
    const [createdContractId, setCreatedContractId] = useState<number | null>(null);

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
                setFiveOrMoreEmployees(ctx.fiveOrMoreEmployees);
                setWageComponents(prev => (prev.trim().length > 0 ? prev : ctx.suggestedWageComponents));
            })
            .catch(() => {
                if (!cancelled) {setContext(null);}
            });
        return () => {
            cancelled = true;
        };
    }, [employeeId, storeId]);

    // 스케줄 모드 급여 기준시급 기본값 = 매장 기준시급(사장이 수정 가능). 실패해도 직접 입력으로 진행.
    useEffect(() => {
        let cancelled = false;
        storeService
            .getStoreById(storeId)
            .then(store => {
                if (cancelled || !store.storeStandardHourWage || store.storeStandardHourWage <= 0) {
                    return;
                }
                setStoreStandardWage(store.storeStandardHourWage);
                setSalaryBaseWageValue(prev =>
                    prev.trim().length > 0 ? prev : String(store.storeStandardHourWage),
                );
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [storeId]);

    const selectedName =
        employees.find(e => e.id === employeeId)?.name ?? params.employeeName ?? '직원';

    const isSalaryContract = contractPayType === 'SALARY';

    // ── 월급제 스케줄 자동 산출 (SALARY 전용 — 시급제 HOURLY 는 이 블록을 전혀 타지 않는다) ──
    const isScheduleMode = isSalaryContract && salaryInputMode === 'SCHEDULE';
    const selectedScheduleDays = WEEKDAYS.filter(d => !!scheduleDayOn[d.code]);
    const scheduleForm: ScheduleFormState = (() => {
        if (selectedScheduleDays.length === 0) {
            return {status: 'incomplete', message: '근무요일을 1개 이상 선택해 주세요.'};
        }
        const days: WorkScheduleDayDto[] = [];
        for (const d of selectedScheduleDays) {
            const t = scheduleSameDaily ? uniformDayTime : perDayTime[d.code] ?? EMPTY_DAY_TIME;
            if (!t.start.trim() || !t.end.trim()) {
                return {status: 'incomplete', message: `${d.label}요일 출근·퇴근 시각을 입력해 주세요.`};
            }
            if (!isValidTimeDigits(t.start) || !isValidTimeDigits(t.end)) {
                return {status: 'invalid', message: `${d.label}요일 시각이 올바르지 않아요. ${TIME_DIGITS_HELPER}`};
            }
            const hasBreak = t.breakStart.trim() !== '' || t.breakEnd.trim() !== '';
            if (hasBreak && (t.breakStart.trim() === '' || t.breakEnd.trim() === '')) {
                return {status: 'invalid', message: `${d.label}요일 휴게는 시작·종료 시각을 함께 입력해 주세요.`};
            }
            if (hasBreak && (!isValidTimeDigits(t.breakStart) || !isValidTimeDigits(t.breakEnd))) {
                return {status: 'invalid', message: `${d.label}요일 휴게 시각이 올바르지 않아요. ${TIME_DIGITS_HELPER}`};
            }
            days.push({
                day: d.code,
                startTime: timeDigitsToHHmm(t.start),
                endTime: timeDigitsToHHmm(t.end),
                breakStartTime: hasBreak ? timeDigitsToHHmm(t.breakStart) : null,
                breakEndTime: hasBreak ? timeDigitsToHHmm(t.breakEnd) : null,
            });
        }
        return {status: 'ready', days};
    })();

    const salaryBaseWageValue = Number(salaryBaseWage);
    const validBaseWage =
        salaryBaseWage.trim() !== '' && !Number.isNaN(salaryBaseWageValue) && salaryBaseWageValue > 0;
    let scheduleBreakdown: ScheduleSalaryBreakdown | null = null;
    let scheduleCalcError: string | null = null;
    if (isScheduleMode && scheduleForm.status === 'ready' && validBaseWage) {
        try {
            scheduleBreakdown = calculateScheduleSalary({
                schedule: scheduleForm.days,
                baseHourlyWage: salaryBaseWageValue,
                fiveOrMoreEmployees,
                minimumHourlyWage: context?.minimumWageHourly,
                probationWageRate: probation && probationWageRate < 1 ? probationWageRate : 1,
            });
        } catch (e) {
            scheduleCalcError = e instanceof Error ? e.message : '스케줄 급여 계산에 실패했어요.';
        }
    }
    /** 주 연장 12h 초과(= 주 52시간, §53) — 경고만, 저장은 차단하지 않는다(노무 리스크 대시보드 연동). */
    const scheduleOvertimeExceeded =
        scheduleBreakdown !== null && scheduleBreakdown.weeklyOvertimeHours > WEEKLY_OVERTIME_LIMIT_HOURS;

    const weeklyAllowanceEligible = isScheduleMode
        ? (scheduleBreakdown?.weeklyContractedHours ?? 0) >= WEEKLY_ALLOWANCE_THRESHOLD
        : (() => {
              const h = Number(hoursPerWeek);
              return hoursPerWeek.trim() !== '' && !Number.isNaN(h) && h >= WEEKLY_ALLOWANCE_THRESHOLD;
          })();

    const weeklyHoursValue = Number(hoursPerWeek);
    const wageValue = Number(hourlyWage);
    const salaryValue = Number(salaryAmount);
    const salaryBreakdown = calculateSalaryContract({
        salaryAmount: numberOrZero(salaryAmount),
        salaryPayUnit,
        contractedHoursPerWeek: Number.isNaN(weeklyHoursValue) ? 0 : weeklyHoursValue,
        fixedOvertimeHoursPerMonth: numberOrZero(fixedOvertimeHours),
        fixedNightHoursPerMonth: numberOrZero(fixedNightHours),
        fixedHolidayHoursWithin8PerMonth: numberOrZero(fixedHolidayHoursWithin8),
        fixedHolidayHoursOver8PerMonth: numberOrZero(fixedHolidayHoursOver8),
        fiveOrMoreEmployees,
        minimumHourlyWage: context?.minimumWageHourly,
        probationWageRate: probation && probationWageRate < 1 ? probationWageRate : 1,
    });
    const salaryWageComponents = buildSalaryWageComponents(salaryBreakdown, salaryPayUnit, fiveOrMoreEmployees);
    const validWeeklyHours = hoursPerWeek.trim() !== '' && !Number.isNaN(weeklyHoursValue) && weeklyHoursValue > 0;
    const validWage = isSalaryContract
        ? salaryAmount.trim() !== '' && !Number.isNaN(salaryValue) && salaryValue > 0 && salaryBreakdown.ordinaryHourlyWage > 0
        : hourlyWage.trim() !== '' && !Number.isNaN(wageValue) && wageValue > 0;
    const monthlyContractedHours = isScheduleMode
        ? (scheduleBreakdown?.weeklyContractedHours ?? 0) * WEEKS_PER_MONTH
        : validWeeklyHours ? weeklyHoursValue * WEEKS_PER_MONTH : 0;
    const estimatedMonthlyWage = isSalaryContract
        ? (isScheduleMode ? scheduleBreakdown?.expectedMonthlyWage ?? 0 : salaryBreakdown.totalMonthlyWage)
        : (validWeeklyHours && validWage
            ? wageValue * (weeklyHoursValue + weeklyAllowanceHours(weeklyHoursValue)) * WEEKS_PER_MONTH
            : 0);
    const annualLeaveApplicable = weeklyAllowanceEligible && fiveOrMoreEmployees;
    const contractAtLeastOneMonth =
        periodType === 'PERMANENT' || isFixedTermAtLeastOneMonth(startDate, endDate);
    const insuranceReferenceDate =
        startDate.trim() && isValidDateDigits(startDate)
            ? dateDigitsToIso(startDate)
            : new Date().toISOString().slice(0, 10);
    const employeeAge = ageOn(context?.employeeBirthDate, insuranceReferenceDate);
    const autoEmploymentInsurance = contractAtLeastOneMonth && weeklyAllowanceEligible;
    const autoHealthInsurance =
        contractAtLeastOneMonth && monthlyContractedHours >= HEALTH_INSURANCE_MONTHLY_HOURS_THRESHOLD;
    const autoNationalPension =
        employeeAge !== null
        && employeeAge >= NATIONAL_PENSION_MIN_AGE
        && employeeAge < NATIONAL_PENSION_MAX_EXCLUSIVE_AGE
        // 기준소득월액 하한은 매년 7.1 갱신 — 서버 context 값을 그대로 쓴다(하드코딩 금지).
        && !!context
        && estimatedMonthlyWage >= context.nationalPensionMinMonthlyIncome;

    useEffect(() => {
        setIndustrialAccidentInsurance(true);
        setEmploymentInsurance(autoEmploymentInsurance);
        setHealthInsurance(autoHealthInsurance);
        setNationalPension(autoNationalPension);
    }, [autoEmploymentInsurance, autoHealthInsurance, autoNationalPension]);

    const probationMonthsValue = Number(probationMonths);
    const probationReductionMonthsEligible =
        probationMonths.trim() !== ''
        && !Number.isNaN(probationMonthsValue)
        && probationMonthsValue > 0
        && probationMonthsValue <= PROBATION_REDUCTION_MAX_MONTHS;
    const probationReductionTermEligible =
        periodType === 'PERMANENT' || isFixedTermAtLeastOneYear(startDate, endDate);
    const probationReductionAllowed =
        probation && !simpleLabor && probationReductionMonthsEligible && probationReductionTermEligible;

    useEffect(() => {
        if (probationWageRate < 1 && !probationReductionAllowed) {
            setProbationWageRate(1.0);
        }
    }, [probationReductionAllowed, probationWageRate]);

    const goStep2 = () => {
        if (!employeeId) {
            AppToast.warn('계약서를 보낼 직원을 선택해 주세요.');
            return;
        }
        setStep(1);
    };

    const goStepForm = () => {
        setWageComponents(prev => {
            return prev.trim().length > 0 ? prev : context?.suggestedWageComponents ?? '';
        });
        setStep(2);
    };

    const buildPayload = (): LaborContractCreatePayload | null => {
        const wage = isSalaryContract ? salaryBreakdown.ordinaryHourlyWage : Number(hourlyWage);
        const wageComponentText = isSalaryContract ? salaryWageComponents : wageComponents.trim();
        const hours = Number(hoursPerWeek);
        if (!employeeId) {
            AppToast.warn('직원을 선택해 주세요.');
            return null;
        }
        // 스케줄 자동 산출 모드(월급제 전용) — 스케줄·기준시급만 검증하고 금액 필드는 서버가 산출.
        if (isScheduleMode) {
            if (scheduleForm.status !== 'ready') {
                AppToast.warn(scheduleForm.message);
                return null;
            }
            if (!validBaseWage) {
                AppToast.warn('급여 기준시급을 올바르게 입력해 주세요.');
                return null;
            }
            if (!scheduleBreakdown) {
                AppToast.warn(scheduleCalcError ?? '스케줄 급여 계산에 실패했어요. 입력을 확인해 주세요.');
                return null;
            }
            if (context?.minimumWageHourly && !scheduleBreakdown.minimumWageCompliant) {
                AppToast.warn('급여 기준시급이 최저임금보다 낮아요.');
                return null;
            }
        }
        if (!isScheduleMode && isSalaryContract && (!salaryAmount.trim() || Number.isNaN(salaryValue) || salaryValue <= 0)) {
            AppToast.warn(`${salaryPayUnit === 'ANNUAL' ? '연봉' : '월급'}을 올바르게 입력해 주세요.`);
            return null;
        }
        if (!isSalaryContract && (!hourlyWage.trim() || Number.isNaN(wage) || wage < 0)) {
            AppToast.warn('시급을 올바르게 입력해 주세요.');
            return null;
        }
        if (!isScheduleMode && !wageComponentText.trim()) {
            AppToast.warn('임금 구성항목·계산방법을 입력해 주세요.');
            return null;
        }
        if (!isScheduleMode && (!hoursPerWeek.trim() || Number.isNaN(hours) || hours <= 0)) {
            AppToast.warn('주 소정근로시간을 입력해 주세요.');
            return null;
        }
        if (!isScheduleMode && (!workStart.trim() || !isValidTimeDigits(workStart) || !workEnd.trim() || !isValidTimeDigits(workEnd))) {
            AppToast.warn(`시업·종업 시각을 입력해 주세요. ${TIME_DIGITS_HELPER}`);
            return null;
        }
        if (!workLocation.trim() || !jobDescription.trim()) {
            AppToast.warn('취업 장소와 담당 업무를 입력해 주세요.');
            return null;
        }
        if (annualLeaveApplicable && !annualLeaveNote.trim()) {
            AppToast.warn('연차유급휴가 안내를 입력해 주세요.');
            return null;
        }
        if (!isScheduleMode && isSalaryContract && context?.minimumWageHourly && !salaryBreakdown.minimumWageCompliant) {
            AppToast.warn('월급/연봉의 월 기본급이 법정 최저액보다 낮아요.');
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
        if (probation && probationWageRate < 1 && !probationReductionAllowed) {
            AppToast.warn('최저임금 90% 감액은 1년 이상 계약, 비단순노무직, 수습 3개월 이내일 때만 가능해요.');
            return null;
        }

        // 스케줄 모드 페이로드 — 금액·시간 필드(monthlyBaseSalary/fixed*/workStartTime 등)는
        // 보내지 않는다. 서버가 workSchedule + salaryBaseHourlyWage 로 재계산(서버 권위)하고
        // wageComponents(산출근거)도 서버 자동 생성이 단일 소스다.
        if (isScheduleMode && scheduleForm.status === 'ready') {
            return {
                employeeId,
                periodType,
                payType: 'SALARY',
                salaryBaseHourlyWage: salaryBaseWageValue,
                workSchedule: scheduleForm.days,
                fiveOrMoreEmployeesSnapshot: fiveOrMoreEmployees,
                wagePaymentMethod,
                wagePaymentDay: payDayNum,
                weeklyHolidayDay: weeklyAllowanceEligible ? holiday : undefined,
                workLocation: workLocation.trim(),
                jobDescription: jobDescription.trim(),
                annualLeaveNote: annualLeaveApplicable ? annualLeaveNote.trim() : undefined,
                startDate: startDate.trim() ? dateDigitsToIso(startDate) : undefined,
                endDate: periodType === 'FIXED_TERM' && endDate.trim() ? dateDigitsToIso(endDate) : undefined,
                probation,
                probationMonths: probationMonthsNum,
                probationWageRate: probation ? probationWageRate : undefined,
                simpleLabor: probation ? simpleLabor : undefined,
                employmentInsurance,
                industrialAccidentInsurance,
                nationalPension,
                healthInsurance,
            };
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
            payType: contractPayType,
            salaryPayUnit: isSalaryContract ? salaryPayUnit : undefined,
            monthlyBaseSalary: isSalaryContract ? salaryBreakdown.monthlyBaseSalary : undefined,
            annualSalary: isSalaryContract
                ? salaryPayUnit === 'ANNUAL'
                    ? numberOrZero(salaryAmount)
                    : salaryBreakdown.monthlyBaseSalary * 12
                : undefined,
            ordinaryHourlyWage: isSalaryContract ? salaryBreakdown.ordinaryHourlyWage : undefined,
            fixedOvertimeHoursPerMonth: isSalaryContract ? numberOrZero(fixedOvertimeHours) : undefined,
            fixedOvertimePay: isSalaryContract ? salaryBreakdown.overtimePay : undefined,
            fixedNightHoursPerMonth: isSalaryContract ? numberOrZero(fixedNightHours) : undefined,
            fixedNightPay: isSalaryContract ? salaryBreakdown.nightPremiumPay : undefined,
            fixedHolidayHoursWithin8PerMonth: isSalaryContract ? numberOrZero(fixedHolidayHoursWithin8) : undefined,
            fixedHolidayHoursOver8PerMonth: isSalaryContract ? numberOrZero(fixedHolidayHoursOver8) : undefined,
            fixedHolidayPay: isSalaryContract ? salaryBreakdown.holidayPay : undefined,
            expectedMonthlyWage: isSalaryContract ? salaryBreakdown.totalMonthlyWage : undefined,
            fiveOrMoreEmployeesSnapshot: fiveOrMoreEmployees,
            wagePaymentMethod,
            wageComponents: wageComponentText,
            wagePaymentDay: payDayNum,
            contractedHoursPerWeek: hours,
            workStartTime: timeDigitsToHHmmss(workStart),
            workEndTime: timeDigitsToHHmmss(workEnd),
            breakMinutes: breakMin,
            weeklyHolidayDay: weeklyAllowanceEligible ? holiday : undefined,
            workLocation: workLocation.trim(),
            jobDescription: jobDescription.trim(),
            annualLeaveNote: annualLeaveApplicable ? annualLeaveNote.trim() : undefined,
            startDate: startDate.trim() ? dateDigitsToIso(startDate) : undefined,
            endDate: periodType === 'FIXED_TERM' && endDate.trim() ? dateDigitsToIso(endDate) : undefined,
            probation,
            probationMonths: probationMonthsNum,
            probationWageRate: probation ? probationWageRate : undefined,
            simpleLabor: probation ? simpleLabor : undefined,
            employmentInsurance,
            industrialAccidentInsurance,
            nationalPension,
            healthInsurance,
            ...weeklySchedule,
        };
    };

    const goStep3 = () => {
        if (buildPayload()) {
            setStep(3);
        }
    };

    /** 스케줄 모드 4단계 미리보기 — FE 로컬 산출값으로 구성(발급 시 서버가 동일 산식으로 확정). */
    const buildSchedulePreviewContract = (
        days: WorkScheduleDayDto[],
        breakdown: ScheduleSalaryBreakdown,
    ): LaborContract => {
        const round2 = (n: number) => Math.round(n * 100) / 100;
        const first = days[0]; // WEEKDAYS(월→일) 순으로 구성되므로 첫 근무요일 — BE firstByDayOrder 와 동일
        return {
            id: 0,
            employeeId: employeeId ?? 0,
            storeId,
            periodType,
            startDate: startDate.trim() && isValidDateDigits(startDate) ? dateDigitsToIso(startDate) : null,
            endDate: periodType === 'FIXED_TERM' && endDate.trim() && isValidDateDigits(endDate) ? dateDigitsToIso(endDate) : null,
            hourlyWage: breakdown.ordinaryHourlyWage,
            payType: 'SALARY',
            salaryPayUnit: 'MONTHLY',
            monthlyBaseSalary: breakdown.monthlyBaseSalary,
            annualSalary: breakdown.annualizedWage, // 스케줄 모드 연봉 = 예상 월 지급액 × 12
            ordinaryHourlyWage: breakdown.ordinaryHourlyWage,
            fixedOvertimeHoursPerMonth: round2(breakdown.monthlyOvertimeHours),
            fixedOvertimePay: breakdown.overtimePay,
            fixedNightHoursPerMonth: round2(breakdown.monthlyNightHours),
            fixedNightPay: breakdown.nightPremiumPay,
            fixedHolidayHoursWithin8PerMonth: 0,
            fixedHolidayHoursOver8PerMonth: 0,
            fixedHolidayPay: 0,
            expectedMonthlyWage: breakdown.expectedMonthlyWage,
            fiveOrMoreEmployeesSnapshot: fiveOrMoreEmployees,
            wagePaymentDay: payDay.trim() ? Number(payDay) : null,
            wagePaymentMethod,
            wageComponents: buildSchedulePreviewWageComponents(
                breakdown,
                fiveOrMoreEmployees,
                breakdown.ordinaryHourlyWage,
            ),
            contractedHoursPerWeek: breakdown.weeklyContractedHours,
            workStartTime: `${first.startTime}:00`,
            workEndTime: `${first.endTime}:00`,
            breakMinutes: breakMinutesOfDay(first),
            contractedWeeklyDays: breakdown.workingDays,
            weeklyHolidayDay: weeklyAllowanceEligible ? holiday : null,
            weeklyAllowanceApplicable: weeklyAllowanceEligible,
            annualLeaveNote: annualLeaveApplicable ? (annualLeaveNote.trim() || null) : null,
            workLocation: workLocation.trim() || null,
            jobDescription: jobDescription.trim() || null,
            probation,
            probationMonths: probation && probationMonths.trim() ? Number(probationMonths) : null,
            probationWageRate: probation ? probationWageRate : null,
            simpleLabor,
            employmentInsurance,
            industrialAccidentInsurance,
            nationalPension,
            healthInsurance,
            minimumWageCompliant: breakdown.minimumWageCompliant,
            minimumWageReferenceYear: new Date().getFullYear(),
            minimumWageReferenceValue: context?.minimumWageHourly ?? 0,
            monHours: breakdown.dailyWorkedHours.MONDAY ?? null,
            tueHours: breakdown.dailyWorkedHours.TUESDAY ?? null,
            wedHours: breakdown.dailyWorkedHours.WEDNESDAY ?? null,
            thuHours: breakdown.dailyWorkedHours.THURSDAY ?? null,
            friHours: breakdown.dailyWorkedHours.FRIDAY ?? null,
            satHours: breakdown.dailyWorkedHours.SATURDAY ?? null,
            sunHours: breakdown.dailyWorkedHours.SUNDAY ?? null,
            sent: false,
            sentAt: null,
            signed: false,
            signedAt: null,
            electronicSignatureEnvelopeId: null,
            electronicSignatureDocumentVersion: 0,
            createdAt: null,
            updatedAt: null,
            workSchedule: days,
            salaryBaseHourlyWage: breakdown.ordinaryHourlyWage,
            scheduleDerivedSalary: true,
        };
    };

    const previewContract = (): LaborContract => {
        if (isScheduleMode && scheduleForm.status === 'ready' && scheduleBreakdown) {
            return buildSchedulePreviewContract(scheduleForm.days, scheduleBreakdown);
        }
        const wage = isSalaryContract ? salaryBreakdown.ordinaryHourlyWage : Number(hourlyWage);
        const wageComponentText = isSalaryContract ? salaryWageComponents : wageComponents.trim();
        const hours = Number(hoursPerWeek);
        const weeklyEligible = weeklyAllowanceEligible;
        const refYear = new Date().getFullYear();
        const refValue = context?.minimumWageHourly ?? 0;
        const minimumWageRate =
            probation && probationWageRate < 1 && probationReductionAllowed ? probationWageRate : 1.0;
        const requiredMinimumWage = Math.ceil(refValue * minimumWageRate);
        return {
            id: 0,
            employeeId: employeeId ?? 0,
            storeId,
            periodType,
            startDate: startDate.trim() && isValidDateDigits(startDate) ? dateDigitsToIso(startDate) : null,
            endDate: periodType === 'FIXED_TERM' && endDate.trim() && isValidDateDigits(endDate) ? dateDigitsToIso(endDate) : null,
            hourlyWage: Number.isNaN(wage) ? null : wage,
            payType: contractPayType,
            salaryPayUnit: isSalaryContract ? salaryPayUnit : null,
            monthlyBaseSalary: isSalaryContract ? salaryBreakdown.monthlyBaseSalary : null,
            annualSalary: isSalaryContract
                ? salaryPayUnit === 'ANNUAL'
                    ? numberOrZero(salaryAmount)
                    : salaryBreakdown.monthlyBaseSalary * 12
                : null,
            ordinaryHourlyWage: isSalaryContract ? salaryBreakdown.ordinaryHourlyWage : null,
            fixedOvertimeHoursPerMonth: isSalaryContract ? numberOrZero(fixedOvertimeHours) : null,
            fixedOvertimePay: isSalaryContract ? salaryBreakdown.overtimePay : null,
            fixedNightHoursPerMonth: isSalaryContract ? numberOrZero(fixedNightHours) : null,
            fixedNightPay: isSalaryContract ? salaryBreakdown.nightPremiumPay : null,
            fixedHolidayHoursWithin8PerMonth: isSalaryContract ? numberOrZero(fixedHolidayHoursWithin8) : null,
            fixedHolidayHoursOver8PerMonth: isSalaryContract ? numberOrZero(fixedHolidayHoursOver8) : null,
            fixedHolidayPay: isSalaryContract ? salaryBreakdown.holidayPay : null,
            expectedMonthlyWage: isSalaryContract ? salaryBreakdown.totalMonthlyWage : null,
            fiveOrMoreEmployeesSnapshot: fiveOrMoreEmployees,
            wagePaymentDay: payDay.trim() ? Number(payDay) : null,
            wagePaymentMethod,
            wageComponents: wageComponentText || null,
            contractedHoursPerWeek: Number.isNaN(hours) ? null : hours,
            workStartTime: isValidTimeDigits(workStart) ? timeDigitsToHHmmss(workStart) : null,
            workEndTime: isValidTimeDigits(workEnd) ? timeDigitsToHHmmss(workEnd) : null,
            breakMinutes: breakMinutes.trim() ? Number(breakMinutes) : null,
            contractedWeeklyDays: null,
            weeklyHolidayDay: weeklyEligible ? holiday : null,
            weeklyAllowanceApplicable: weeklyEligible,
            annualLeaveNote: annualLeaveApplicable ? (annualLeaveNote.trim() || null) : null,
            workLocation: workLocation.trim() || null,
            jobDescription: jobDescription.trim() || null,
            probation,
            probationMonths: probation && probationMonths.trim() ? Number(probationMonths) : null,
            probationWageRate: probation ? probationWageRate : null,
            simpleLabor,
            employmentInsurance,
            industrialAccidentInsurance,
            nationalPension,
            healthInsurance,
            minimumWageCompliant: isSalaryContract
                ? salaryBreakdown.minimumWageCompliant
                : !refValue || (!Number.isNaN(wage) && wage >= requiredMinimumWage),
            minimumWageReferenceYear: refYear,
            minimumWageReferenceValue: refValue,
            monHours: useWeeklySchedule && weeklyHours.monHours ? Number(weeklyHours.monHours) : null,
            tueHours: useWeeklySchedule && weeklyHours.tueHours ? Number(weeklyHours.tueHours) : null,
            wedHours: useWeeklySchedule && weeklyHours.wedHours ? Number(weeklyHours.wedHours) : null,
            thuHours: useWeeklySchedule && weeklyHours.thuHours ? Number(weeklyHours.thuHours) : null,
            friHours: useWeeklySchedule && weeklyHours.friHours ? Number(weeklyHours.friHours) : null,
            satHours: useWeeklySchedule && weeklyHours.satHours ? Number(weeklyHours.satHours) : null,
            sunHours: useWeeklySchedule && weeklyHours.sunHours ? Number(weeklyHours.sunHours) : null,
            sent: false,
            sentAt: null,
            signed: false,
            signedAt: null,
            electronicSignatureEnvelopeId: null,
            electronicSignatureDocumentVersion: 0,
            createdAt: null,
            updatedAt: null,
        };
    };

    const send = async () => {
        setSending(true);
        try {
            // create()는 이미 성공했는데 send()만 실패했던 재시도라면, 새 계약을 또 만들지 않고
            // 저장된 id로 발송만 다시 시도한다(중복 계약 생성 방지).
            let contractId = createdContractId;
            if (contractId === null) {
                const payload = buildPayload();
                if (!payload) {
                    setSending(false);
                    return;
                }
                const created = await contractService.create(storeId, payload);
                contractId = created.id;
                setCreatedContractId(contractId);
            }
            const signature = await contractService.send(storeId, contractId);
            setSentContractId(contractId);
            setDone(true);
            navigation.navigate('ElectronicSign', {envelopeId: signature.envelopeId});
        } catch (e: unknown) {
            AppToast.error(contractErrorMessage(e, '발송에 실패했어요. 잠시 후 다시 시도해 주세요.'));
        } finally {
            setSending(false);
        }
    };

    const downloadContractPdf = async () => {
        if (!sentContractId || downloadingPdf) {
            return;
        }
        setDownloadingPdf(true);
        try {
            await contractService.downloadPdfForMaster(storeId, sentContractId);
            AppToast.success('근로계약서 PDF가 발급됐어요.');
            navigation.navigate('PdfPreview', {
                title: `근로계약서_${selectedName}.pdf`,
                sub: `발급일 ${new Date().toISOString().slice(0, 10)}`,
                onShare: () => {
                    Share.share({
                        message: `[소담] 근로계약서\n${selectedName}님\n발급일 ${new Date().toISOString().slice(0, 10)}`,
                    }).catch(() => undefined);
                },
            });
        } catch {
            AppToast.error('PDF 발급에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setDownloadingPdf(false);
        }
    };

    if (done) {
        return (
            <ScreenContainer header={<AppHeader title="발송 완료" onBack={() => navigation.goBack()} />}>
                <SuccessState
                    title="근로계약서를 보냈어요"
                    description={`${selectedName}님에게 근로계약서를 보냈어요. 서명하면 알려드릴게요.`}
                    primary={{label: '직원 상세로 돌아가기', onPress: () => navigation.goBack()}}
                    secondary={{label: downloadingPdf ? '발급 중…' : '근로계약서 PDF 발급', onPress: downloadContractPdf}}
                />
            </ScreenContainer>
        );
    }

    // ① 대상 직원 선택
    if (step === 0) {
        return (
            <StepScaffold
                progress={1 / 4}
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

    // ② 계약 유형·사업장 기준 선택
    if (step === 1) {
        const employeeCountText = context?.employeeCount !== null && context?.employeeCount !== undefined
            ? `현재 활성 직원 ${context.employeeCount}명 기준`
            : '매장 상시근로자 수를 확인해 주세요';

        return (
            <StepScaffold
                progress={2 / 4}
                title="계약 유형을 선택해 주세요"
                subtitle="시급제와 월급제는 임금 계산 방식과 계약서 문구가 달라요."
                onBack={() => setStep(0)}
                footer={
                    <CtaStack>
                        <AppButton label="근로조건 입력" onPress={goStepForm} />
                        <AppButton label="이전" variant="secondary" onPress={() => setStep(0)} />
                    </CtaStack>
                }>
                <View style={styles.form}>
                    <HelpSectionTitle topic="contractType">임금 형태</HelpSectionTitle>
                    <View style={styles.choiceGrid}>
                        <AppCard
                            variant="outlined"
                            selected={contractPayType === 'HOURLY'}
                            onPress={() => setContractPayType('HOURLY')}
                            accessibilityLabel="시급제 아르바이트 선택">
                            <AppText variant="titleMd">시급제(아르바이트)</AppText>
                            <AppText variant="caption" tone="secondary" style={styles.toggleHint}>
                                실제 근무시간에 시급을 곱해 임금을 계산해요. 주휴·연장·야간·휴일수당은 근무기록을 기준으로 별도 산정해요.
                            </AppText>
                        </AppCard>
                        <AppCard
                            variant="outlined"
                            selected={contractPayType === 'SALARY'}
                            onPress={() => setContractPayType('SALARY')}
                            accessibilityLabel="월급제 직원 선택">
                            <AppText variant="titleMd">월급제/연봉제(직원)</AppText>
                            <AppText variant="caption" tone="secondary" style={styles.toggleHint}>
                                월급 또는 연봉을 정하고 통상시급을 환산해요. 고정 연장·야간·휴일수당이 있으면 계약서에 계산식을 함께 적어요.
                            </AppText>
                        </AppCard>
                    </View>

                    <AppCard variant="flat">
                        <AppText variant="titleMd">차이 요약</AppText>
                        <View style={styles.diffList}>
                            <AppText variant="caption" tone="secondary">시급제: 시급 × 실제 근무시간 + 주휴/가산수당</AppText>
                            <AppText variant="caption" tone="secondary">월급제: 월 고정급 ÷ 월 기준시간 = 통상시급</AppText>
                            <AppText variant="caption" tone="secondary">연봉제: 연봉 ÷ 12개월을 월 기본급으로 환산</AppText>
                        </View>
                    </AppCard>

                    <HelpSectionTitle topic="headcount">상시근로자 5인 기준</HelpSectionTitle>
                    <SegmentedControl
                        options={['5인 이상', '5인 미만']}
                        value={fiveOrMoreEmployees ? 0 : 1}
                        onChange={i => setFiveOrMoreEmployees(i === 0)}
                    />
                    <AppCard variant="outlined">
                        <AppText variant="caption" tone="secondary">
                            {employeeCountText}. 5인 미만이면 연장·야간·휴일 가산수당과 연차유급휴가를 적용 제외로 안내하고,
                            5인 이상이면 가산수당과 연차 항목을 계약서에 반영해요.
                        </AppText>
                    </AppCard>
                </View>
            </StepScaffold>
        );
    }

    // ③ 근로조건 입력
    if (step === 2) {
        return (
            <StepScaffold
                progress={3 / 4}
                title="근로조건을 입력해 주세요"
                subtitle={`${selectedName}님의 근로계약서 — 근로기준법 §17 필수 기재사항이에요.`}
                onBack={() => setStep(1)}
                footer={
                    <CtaStack>
                        <AppButton label="다음" onPress={goStep3} />
                        <AppButton label="이전" variant="secondary" onPress={() => setStep(1)} />
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

                    <HelpSectionTitle topic="wage">임금</HelpSectionTitle>
                    {isSalaryContract ? (
                        <>
                            <View>
                                <View style={styles.inlineLabelRow}>
                                    <AppText variant="caption" tone="secondary" style={styles.fieldLabel}>
                                        급여 입력 방식
                                    </AppText>
                                    <HelpButton topic="scheduleSalary" />
                                </View>
                                <SegmentedControl
                                    options={['스케줄로 자동 계산', '월급 직접 입력']}
                                    value={salaryInputMode === 'DIRECT' ? 1 : 0}
                                    onChange={i => setSalaryInputMode(i === 1 ? 'DIRECT' : 'SCHEDULE')}
                                />
                            </View>
                            {salaryInputMode === 'SCHEDULE' ? (
                                <>
                                    <AppInput
                                        label="급여 기준시급(원)"
                                        placeholder="예: 10320"
                                        keyboardType="number-pad"
                                        value={salaryBaseWage}
                                        onChangeText={setSalaryBaseWage}
                                        helper={
                                            [
                                                storeStandardWage
                                                    ? `매장 기준시급 ${storeStandardWage.toLocaleString('ko-KR')}원이 기본 적용돼요.`
                                                    : undefined,
                                                context
                                                    ? `${context.minimumWageYear}년 최저임금 ${context.minimumWageHourly.toLocaleString('ko-KR')}원`
                                                    : undefined,
                                            ]
                                                .filter(Boolean)
                                                .join(' ') || undefined
                                        }
                                    />
                                    <View>
                                        <AppText variant="caption" tone="secondary" style={styles.fieldLabel}>
                                            근무요일
                                        </AppText>
                                        <View style={styles.weekRow}>
                                            {WEEKDAYS.map(d => (
                                                <ToggleChip
                                                    key={d.code}
                                                    label={d.label}
                                                    on={!!scheduleDayOn[d.code]}
                                                    onPress={() =>
                                                        setScheduleDayOn(prev => ({...prev, [d.code]: !prev[d.code]}))
                                                    }
                                                />
                                            ))}
                                        </View>
                                    </View>
                                    <SegmentedControl
                                        options={['매일 동일', '요일별 다름']}
                                        value={scheduleSameDaily ? 0 : 1}
                                        onChange={i => setScheduleSameDaily(i === 0)}
                                    />
                                    {scheduleSameDaily ? (
                                        <DayTimeFields
                                            value={uniformDayTime}
                                            onChange={(field, v) =>
                                                setUniformDayTime(prev => applyDayTimeChange(prev, field, v))
                                            }
                                        />
                                    ) : selectedScheduleDays.length === 0 ? (
                                        <AppCard variant="outlined">
                                            <AppText variant="caption" tone="secondary">
                                                근무요일을 먼저 선택하면 요일별 시간을 입력할 수 있어요.
                                            </AppText>
                                        </AppCard>
                                    ) : (
                                        selectedScheduleDays.map(d => (
                                            <View key={d.code} style={styles.scheduleDayBlock}>
                                                <AppText variant="caption" tone="tertiary" weight="800">
                                                    {d.label}요일
                                                </AppText>
                                                <DayTimeFields
                                                    value={perDayTime[d.code] ?? EMPTY_DAY_TIME}
                                                    onChange={(field, v) =>
                                                        setPerDayTime(prev => ({
                                                            ...prev,
                                                            [d.code]: applyDayTimeChange(
                                                                prev[d.code] ?? EMPTY_DAY_TIME,
                                                                field,
                                                                v,
                                                            ),
                                                        }))
                                                    }
                                                />
                                            </View>
                                        ))
                                    )}
                                    <AppText variant="caption" tone="tertiary">
                                        {TIME_DIGITS_HELPER} 퇴근이 출근보다 이르면 익일(자정 넘김)로 계산해요. 휴게시간은
                                        근로기준법 §54 기준(4시간 이상 30분·8시간 이상 1시간)으로 자동 입력돼요 —
                                        직접 수정할 수 있어요.
                                    </AppText>
                                    <AppCard variant="flat">
                                        <View style={styles.inlineLabelRow}>
                                            <AppText variant="titleMd">스케줄 산출 미리보기</AppText>
                                            <HelpButton topic="scheduleSalary" />
                                        </View>
                                        <View style={styles.diffList}>
                                            {scheduleBreakdown ? (
                                                <>
                                                    {buildSchedulePreviewLines(scheduleBreakdown, fiveOrMoreEmployees).map(line => (
                                                        <AppText key={line} variant="caption" tone="secondary">
                                                            {line}
                                                        </AppText>
                                                    ))}
                                                    <AppText variant="caption" tone="tertiary">
                                                        최종 금액·산출근거는 발급 시 서버가 동일 산식으로 확정해요.
                                                    </AppText>
                                                </>
                                            ) : (
                                                <AppText variant="caption" tone="secondary">
                                                    {scheduleCalcError
                                                        ?? (scheduleForm.status !== 'ready'
                                                            ? scheduleForm.message
                                                            : '급여 기준시급을 입력하면 월급이 자동 계산돼요.')}
                                                </AppText>
                                            )}
                                        </View>
                                        {scheduleOvertimeExceeded && scheduleBreakdown ? (
                                            <View style={styles.scheduleWarnBlock}>
                                                <AppBadge label="주 52시간 한도 초과" tone="warning" />
                                                <AppText variant="caption" tone="warning" style={styles.scheduleWarnText}>
                                                    주 52시간 한도 초과 스케줄이에요(연장{' '}
                                                    {scheduleBreakdown.weeklyOvertimeHours.toFixed(1)}h {'>'} 12h, §53).
                                                    노무 리스크 대시보드에 경고로 표시돼요.
                                                </AppText>
                                            </View>
                                        ) : null}
                                        {scheduleBreakdown && !scheduleBreakdown.minimumWageCompliant ? (
                                            <AppBadge label="최저임금 미달 가능" tone="error" style={styles.scheduleMwBadge} />
                                        ) : null}
                                    </AppCard>
                                </>
                            ) : (
                                <>
                            <View>
                                <View style={styles.inlineLabelRow}>
                                    <AppText variant="caption" tone="secondary" style={styles.fieldLabel}>
                                        급여 기준
                                    </AppText>
                                    <HelpButton topic="monthlySalary" />
                                </View>
                                <SegmentedControl
                                    options={['월급', '연봉']}
                                    value={salaryPayUnit === 'ANNUAL' ? 1 : 0}
                                    onChange={i => setSalaryPayUnit(i === 1 ? 'ANNUAL' : 'MONTHLY')}
                                />
                            </View>
                            <AppInput
                                label={salaryPayUnit === 'ANNUAL' ? '연봉(원)' : '월급(원)'}
                                placeholder={salaryPayUnit === 'ANNUAL' ? '예: 36000000' : '예: 3000000'}
                                keyboardType="number-pad"
                                value={salaryAmount}
                                onChangeText={setSalaryAmount}
                                helper={
                                    context
                                        ? `${context.minimumWageYear}년 최저임금 ${context.minimumWageHourly.toLocaleString('ko-KR')}원 기준 월 기본급 하한을 확인해요.`
                                        : undefined
                                }
                            />
                            <View style={styles.timeRow}>
                                <AppInput
                                    label="월 고정 연장시간"
                                    placeholder="예: 10"
                                    keyboardType="number-pad"
                                    value={fixedOvertimeHours}
                                    onChangeText={v => setFixedOvertimeHours(sanitizeDecimalInput(v))}
                                    containerStyle={styles.timeField}
                                />
                                <AppInput
                                    label="월 고정 야간시간"
                                    placeholder="예: 0"
                                    keyboardType="number-pad"
                                    value={fixedNightHours}
                                    onChangeText={v => setFixedNightHours(sanitizeDecimalInput(v))}
                                    containerStyle={styles.timeField}
                                />
                            </View>
                            <View style={styles.timeRow}>
                                <AppInput
                                    label="휴일 8h 이내"
                                    placeholder="예: 0"
                                    keyboardType="number-pad"
                                    value={fixedHolidayHoursWithin8}
                                    onChangeText={v => setFixedHolidayHoursWithin8(sanitizeDecimalInput(v))}
                                    containerStyle={styles.timeField}
                                />
                                <AppInput
                                    label="휴일 8h 초과"
                                    placeholder="예: 0"
                                    keyboardType="number-pad"
                                    value={fixedHolidayHoursOver8}
                                    onChangeText={v => setFixedHolidayHoursOver8(sanitizeDecimalInput(v))}
                                    containerStyle={styles.timeField}
                                />
                            </View>
                            <AppCard variant="flat">
                                <View style={styles.inlineLabelRow}>
                                    <AppText variant="titleMd">월급제 산출</AppText>
                                    <HelpButton topic="standardHours" />
                                </View>
                                <View style={styles.diffList}>
                                    <AppText variant="caption" tone="secondary">
                                        월 기본급 {formatWon(salaryBreakdown.monthlyBaseSalary)} · 월 기준시간 {salaryBreakdown.monthlyStandardHours}시간
                                    </AppText>
                                    <AppText variant="caption" tone="secondary">
                                        통상시급 {formatWon(salaryBreakdown.ordinaryHourlyWage)} · 주휴 {salaryBreakdown.weeklyPaidHolidayHours.toFixed(1)}시간/주
                                    </AppText>
                                    <AppText variant="caption" tone="secondary">
                                        고정수당 {formatWon(salaryBreakdown.overtimePay + salaryBreakdown.nightPremiumPay + salaryBreakdown.holidayPay)} · 예상 월 지급액 {formatWon(salaryBreakdown.totalMonthlyWage)}
                                    </AppText>
                                </View>
                                {!salaryBreakdown.minimumWageCompliant ? (
                                    <AppBadge label="최저임금 미달 가능" tone="error" style={styles.mwBadge} />
                                ) : null}
                            </AppCard>
                            <AppInput
                                label="임금 구성항목·계산방법"
                                value={salaryWageComponents}
                                editable={false}
                                multiline
                                multilineMinHeight={120}
                            />
                                </>
                            )}
                        </>
                    ) : (
                        <>
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
                            <AppInput
                                label="임금 구성항목·계산방법"
                                placeholder="기본급·수당 구성과 연장/야간/휴일 가산 계산방법"
                                value={wageComponents}
                                onChangeText={setWageComponents}
                                multiline
                                multilineMinHeight={72}
                            />
                        </>
                    )}
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

                    <HelpSectionTitle topic="standardHours">근로시간·휴일</HelpSectionTitle>
                    {isScheduleMode ? (
                        <AppCard variant="outlined">
                            <AppText variant="caption" tone="secondary">
                                {scheduleBreakdown
                                    ? `근무 스케줄에서 자동 반영돼요 — 주 근무일 ${scheduleBreakdown.workingDays}일 · 주 소정근로 ${scheduleBreakdown.weeklyContractedHours.toFixed(1)}시간(시업·종업·휴게 포함).`
                                    : '위 근무 스케줄을 입력하면 주 소정근로시간과 시업·종업·휴게 시각이 자동 반영돼요.'}
                            </AppText>
                        </AppCard>
                    ) : (
                        <>
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
                        </>
                    )}

                    {weeklyAllowanceEligible ? (
                        <View>
                            <View style={styles.inlineLabelRow}>
                                <AppText variant="caption" tone="secondary" style={styles.fieldLabel}>
                                    주휴일
                                </AppText>
                                <HelpButton topic="weeklyHoliday" />
                            </View>
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
                                휴일(주휴)과 연차유급휴가가 적용되지 않아요. 소정근로시간을 15시간 이상으로 입력하면
                                주휴일과 연차 안내를 입력할 수 있어요.
                            </AppText>
                        </AppCard>
                    )}

                    {/* 스케줄 자동 산출 모드에서는 요일별 근로시간이 스케줄에서 유도되므로 별도 입력을 숨긴다 */}
                    {!isScheduleMode ? (
                        <>
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
                        </>
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

                    <HelpSectionTitle topic="annualLeave">연차유급휴가</HelpSectionTitle>
                    {annualLeaveApplicable ? (
                        <AppInput
                            label="연차 안내"
                            value={annualLeaveNote}
                            onChangeText={setAnnualLeaveNote}
                            multiline
                            multilineMinHeight={72}
                        />
                    ) : weeklyAllowanceEligible ? (
                        <AppCard variant="outlined">
                            <AppText variant="caption" tone="secondary">
                                {SMALL_BUSINESS_ANNUAL_LEAVE_NOTE}
                            </AppText>
                        </AppCard>
                    ) : (
                        <AppCard variant="outlined">
                            <AppText variant="caption" tone="secondary">
                                주 15시간 미만 근로자는 근로기준법 §18③에 따라 연차유급휴가 조항이 적용되지 않아요.
                            </AppText>
                        </AppCard>
                    )}

                    <HelpSectionTitle topic="probation">수습(선택)</HelpSectionTitle>
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
                                    업무 구분
                                </AppText>
                                <SegmentedControl
                                    options={['단순노무직', '비단순노무직']}
                                    value={simpleLabor ? 0 : 1}
                                    onChange={i => setSimpleLabor(i === 0)}
                                />
                            </View>
                            {!probationReductionAllowed ? (
                                <AppCard variant="outlined">
                                    <AppText variant="caption" tone="secondary">
                                        최저임금 90% 감액은 1년 이상 계약, 비단순노무직, 수습 3개월 이내 조건을 모두
                                        만족할 때만 선택할 수 있어요.
                                    </AppText>
                                </AppCard>
                            ) : null}
                            <View>
                                <AppText variant="caption" tone="secondary" style={styles.fieldLabel}>
                                    수습 중 임금
                                </AppText>
                                <SegmentedControl
                                    options={['정상 지급(100%)', '90% 감액']}
                                    value={probationWageRate < 1 ? 1 : 0}
                                    onChange={i => {
                                        if (i === 1 && !probationReductionAllowed) {
                                            AppToast.warn('90% 감액 조건을 먼저 충족해 주세요.');
                                            setProbationWageRate(1.0);
                                            return;
                                        }
                                        setProbationWageRate(i === 1 ? PROBATION_REDUCTION_RATE : 1.0);
                                    }}
                                />
                            </View>
                        </>
                    ) : null}

                    <HelpSectionTitle topic="insurance">4대보험 적용</HelpSectionTitle>
                    <AppCard variant="outlined">
                        <AppText variant="caption" tone="secondary">
                            계약기간, 주 소정근로시간, 예상 월 소득, 생년월일 기준으로 자동 적용돼요. 산재보험은 모든 근로자에게 적용돼요.
                        </AppText>
                    </AppCard>
                    <View style={styles.insuranceRow}>
                        <ToggleChip label="고용보험" on={employmentInsurance} onPress={() => {}} disabled />
                        <ToggleChip label="산재보험" on={industrialAccidentInsurance} onPress={() => {}} disabled />
                        <ToggleChip label="국민연금" on={nationalPension} onPress={() => {}} disabled />
                        <ToggleChip label="건강보험" on={healthInsurance} onPress={() => {}} disabled />
                    </View>
                </View>
            </StepScaffold>
        );
    }

    // ④ 확인 후 발송
    // 확인 화면에서 조건을 다시 바꾸러 돌아가면, create()까지는 성공했던 이전 시도의 계약 id를
    // 그대로 재사용하면 안 된다(수정된 내용이 반영 안 된 계약이 발송될 수 있음) — 초기화한다.
    const backToEdit = () => {
        setCreatedContractId(null);
        setStep(2);
    };
    const preview = previewContract();
    return (
        <StepScaffold
            progress={1}
            title="내용을 확인해 주세요"
            subtitle={`${selectedName}님에게 아래 근로계약서를 보낼게요.`}
            onBack={backToEdit}
            footer={
                <CtaStack>
                    <AppButton label="근로계약서 보내기" onPress={send} loading={sending} />
                    <AppButton label="이전" variant="secondary" onPress={backToEdit} />
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
    sectionTitleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    inlineLabelRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    helpButton: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        marginTop: spacing.sm,
    },
    helpButtonText: {lineHeight: 16},
    choiceGrid: {gap: spacing.sm},
    diffList: {gap: spacing.xs, marginTop: spacing.xs},
    weekRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    weekBtn: {minWidth: 44},
    weekHoursRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    weekHourField: {width: 64},
    timeRow: {flexDirection: 'row', gap: spacing.sm},
    timeField: {flex: 1},
    dayTimeGroup: {gap: spacing.sm},
    scheduleDayBlock: {gap: spacing.xs},
    scheduleWarnBlock: {marginTop: spacing.sm, gap: spacing.xs, alignItems: 'flex-start'},
    scheduleWarnText: {alignSelf: 'stretch'},
    scheduleMwBadge: {marginTop: spacing.sm},
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
