import {
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    AppToast,
    CtaStack,
    ScreenContainer,
} from '../../common/components/ds';
import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../navigation/HomeNavigator';
import {radius, spacing} from '../../theme/tokens';
import {useThemeColors} from '../../common/hooks/useThemeColors';
import {TIME_DIGITS_HELPER} from '../../common/utils/dateTimeInput';
import useStoreRegistration from './hooks/useStoreRegistration';
import type {DayOfWeek, StoreOperatingHourPayload} from './services/storeService';
import PayrollCycleEditor, {PayrollCycleForm, defaultPayrollCycle, toPayrollCyclePayload} from './components/PayrollCycleEditor';
import BusinessTypePicker from './components/BusinessTypePicker';
import AddressSearchModal, {AddressSearchResult} from './components/AddressSearchModal';

interface StoreData {
    storeName: string;
    businessNumber: string;
    storePhoneNumber: string;
    businessType: string;
    businessLicenseNumber: string;
    query: string;
    roadAddress: string;
    jibunAddress: string;
    latitude: number | null;
    longitude: number | null;
    radius: number;
    storeStandardHourWage: number | null;
}

type Step = 1 | 2 | 3;
type OperatingMode = 'same' | 'weekly';

interface OperatingHourDraft {
    dayOfWeek: DayOfWeek;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
}

const DAY_ORDER: DayOfWeek[] = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
];

const DAY_LABEL: Record<DayOfWeek, string> = {
    MONDAY: '월',
    TUESDAY: '화',
    WEDNESDAY: '수',
    THURSDAY: '목',
    FRIDAY: '금',
    SATURDAY: '토',
    SUNDAY: '일',
};

const formatBusinessLicenseNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 3) {
        return numbers;
    }
    if (numbers.length <= 5) {
        return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    }
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 10)}`;
};

const formatLandlineNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 3) {
        return numbers;
    }
    if (numbers.length <= 6) {
        return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    }
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
};

const formatMobileNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 3) {
        return numbers;
    }
    if (numbers.length <= 7) {
        return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    }
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
};

const sanitizeTimeInput = (value: string) => value.replace(/[^\d]/g, '').slice(0, 4);

const getTimeError = (value: string): string | undefined => {
    if (!/^\d{4}$/.test(value)) {
        return '4자리 숫자를 적어주세요';
    }
    const hour = Number(value.slice(0, 2));
    const minute = Number(value.slice(2, 4));
    if (hour > 23 || minute > 59) {
        return '다시입력해 주세요';
    }
    return undefined;
};

const toHHmm = (value: string) => `${value.slice(0, 2)}:${value.slice(2, 4)}`;
const toHHmmss = (value: string) => `${toHHmm(value)}:00`;

const createDefaultWeeklyHours = (): OperatingHourDraft[] =>
    DAY_ORDER.map(dayOfWeek => ({
        dayOfWeek,
        openTime: '1000',
        closeTime: '2200',
        isClosed: false,
    }));

const StoreRegistrationScreen: React.FC = () => {
    const c = useThemeColors();
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const {isLoading, submit} = useStoreRegistration({
        onSuccess: () => {
            navigation.navigate('MasterMyPageScreen');
        },
    });

    const [step, setStep] = useState<Step>(1);
    const [minimumWage] = useState(10030);
    const [storeData, setStoreData] = useState<StoreData>({
        storeName: '',
        businessNumber: '',
        storePhoneNumber: '',
        businessType: '',
        businessLicenseNumber: '',
        query: '',
        roadAddress: '',
        jibunAddress: '',
        latitude: null,
        longitude: null,
        radius: 100,
        storeStandardHourWage: null,
    });
    const [cycle, setCycle] = useState<PayrollCycleForm>(defaultPayrollCycle());
    const [operatingMode, setOperatingMode] = useState<OperatingMode>('same');
    const [sameOpenTime, setSameOpenTime] = useState('1000');
    const [sameCloseTime, setSameCloseTime] = useState('2200');
    const [weeklyHours, setWeeklyHours] = useState<OperatingHourDraft[]>(createDefaultWeeklyHours());
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [showBusinessTypeModal, setShowBusinessTypeModal] = useState(false);

    const validatePhoneNumbers = () => {
        const businessNumber = storeData.businessNumber.replace(/[^\d]/g, '');
        const storePhoneNumber = storeData.storePhoneNumber.replace(/[^\d]/g, '');
        return businessNumber.length >= 9 || storePhoneNumber.length >= 10;
    };

    const selectAddress = (address: AddressSearchResult) => {
        setStoreData(prev => ({
            ...prev,
            query: address.query || address.roadAddress,
            roadAddress: address.roadAddress,
            jibunAddress: address.jibunAddress,
            latitude: null,
            longitude: null,
        }));
    };

    const updateWeeklyHour = (dayOfWeek: DayOfWeek, patch: Partial<OperatingHourDraft>) => {
        setWeeklyHours(prev => prev.map(row => (row.dayOfWeek === dayOfWeek ? {...row, ...patch} : row)));
    };

    const copySameTimeToEveryDay = () => {
        setWeeklyHours(prev =>
            prev.map(row => ({
                ...row,
                openTime: sameOpenTime,
                closeTime: sameCloseTime,
            })),
        );
        setOperatingMode('weekly');
    };

    const setWeekdayWeekendHours = () => {
        setOperatingMode('weekly');
        setWeeklyHours(prev =>
            prev.map(row => {
                const isWeekend = row.dayOfWeek === 'SATURDAY' || row.dayOfWeek === 'SUNDAY';
                return {
                    ...row,
                    openTime: isWeekend ? '1100' : '1000',
                    closeTime: isWeekend ? '2100' : '2200',
                    isClosed: false,
                };
            }),
        );
    };

    const closeSunday = () => {
        setOperatingMode('weekly');
        updateWeeklyHour('SUNDAY', {isClosed: true});
    };

    const validateBasicInfo = () => {
        const requiredFields = [
            {field: storeData.storeName.trim(), name: '매장명'},
            {field: storeData.businessType.trim(), name: '업종'},
            {field: storeData.businessLicenseNumber, name: '사업자등록번호'},
            {field: storeData.roadAddress, name: '주소'},
            {field: storeData.storeStandardHourWage, name: '기본 시급'},
        ];
        for (const {field, name} of requiredFields) {
            if (!field) {
                AppToast.warn(`${name}을 입력해 주세요.`);
                return false;
            }
        }
        if (!validatePhoneNumbers()) {
            AppToast.show('유선 전화번호 또는 휴대폰 번호 중 하나는 필수입니다.');
            return false;
        }
        const bizNoDigits = storeData.businessLicenseNumber.replace(/[^\d]/g, '');
        if (bizNoDigits.length !== 10) {
            AppToast.show('사업자등록번호는 10자리여야 합니다.');
            return false;
        }
        if (storeData.storeStandardHourWage && storeData.storeStandardHourWage < minimumWage) {
            AppToast.warn(`기본 시급은 최저시급(${minimumWage.toLocaleString()}원) 이상이어야 해요.`);
            return false;
        }
        return true;
    };

    const getOperatingRows = (): OperatingHourDraft[] => {
        if (operatingMode === 'same') {
            return DAY_ORDER.map(dayOfWeek => ({
                dayOfWeek,
                openTime: sameOpenTime,
                closeTime: sameCloseTime,
                isClosed: false,
            }));
        }
        return weeklyHours;
    };

    const validateOperatingHours = () => {
        const rows = getOperatingRows();
        if (rows.every(row => row.isClosed)) {
            AppToast.warn('최소 하루는 영업일로 설정해 주세요.');
            return false;
        }
        for (const row of rows) {
            if (row.isClosed) {
                continue;
            }
            const openError = getTimeError(row.openTime);
            const closeError = getTimeError(row.closeTime);
            if (openError !== undefined || closeError !== undefined) {
                AppToast.warn(`${DAY_LABEL[row.dayOfWeek]}요일 시간을 확인해 주세요.`);
                return false;
            }
        }
        return true;
    };

    const buildOperatingHoursPayload = (): StoreOperatingHourPayload[] =>
        getOperatingRows().map(row => ({
            dayOfWeek: row.dayOfWeek,
            openTime: row.isClosed ? null : toHHmmss(row.openTime),
            closeTime: row.isClosed ? null : toHHmmss(row.closeTime),
            isClosed: row.isClosed,
        }));

    const goNext = () => {
        if (step === 1 && !validateBasicInfo()) {
            return;
        }
        if (step === 2 && !validateOperatingHours()) {
            return;
        }
        setStep(prev => (prev < 3 ? ((prev + 1) as Step) : prev));
    };

    const goBackStep = () => {
        if (step === 1) {
            navigation.goBack();
            return;
        }
        setStep(prev => (prev > 1 ? ((prev - 1) as Step) : prev));
    };

    const handleStoreRegistration = async () => {
        if (isLoading || !validateBasicInfo() || !validateOperatingHours()) {
            return;
        }
        const bizNoDigits = storeData.businessLicenseNumber.replace(/[^\d]/g, '');
        await submit({
            storeName: storeData.storeName.trim(),
            businessNumber: storeData.businessNumber.replace(/[^\d]/g, ''),
            storePhoneNumber: storeData.storePhoneNumber.replace(/[^\d]/g, ''),
            businessType: storeData.businessType.trim(),
            businessLicenseNumber: bizNoDigits,
            query: storeData.query || storeData.roadAddress,
            roadAddress: storeData.roadAddress,
            jibunAddress: storeData.jibunAddress,
            latitude: storeData.latitude,
            longitude: storeData.longitude,
            radius: storeData.radius,
            storeStandardHourWage: storeData.storeStandardHourWage ?? minimumWage,
            operatingHours: buildOperatingHoursPayload(),
            payrollCycle: toPayrollCyclePayload(cycle) ?? undefined,
        });
    };

    const isWageBelowMinimum =
        storeData.storeStandardHourWage !== null && storeData.storeStandardHourWage < minimumWage;
    const phoneOk = validatePhoneNumbers();

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="매장 등록" rightText={`${step}/3`} onBack={goBackStep} />}
            footer={
                <CtaStack>
                    {step === 1 ? (
                        <AppButton label="다음" onPress={goNext} />
                    ) : (
                        <View style={styles.footerRow}>
                            <AppButton
                                label="이전"
                                variant="secondary"
                                onPress={goBackStep}
                                style={styles.footerButton}
                            />
                            <AppButton
                                label={step === 3 ? '매장 등록하기' : '다음'}
                                loading={step === 3 && isLoading}
                                loadingLabel="등록 중..."
                                onPress={step === 3 ? handleStoreRegistration : goNext}
                                style={styles.footerButton}
                            />
                        </View>
                    )}
                </CtaStack>
            }>
            <View style={styles.heroBlock}>
                <AppText variant="headingMd">{getStepTitle(step)}</AppText>
                <AppText variant="bodyMd" tone="secondary" style={styles.hintSub}>
                    {getStepDescription(step)}
                </AppText>
            </View>

            <StepIndicator currentStep={step} />

            {step === 1 ? (
                <BasicInfoStep
                    c={c}
                    storeData={storeData}
                    setStoreData={setStoreData}
                    minimumWage={minimumWage}
                    isWageBelowMinimum={isWageBelowMinimum}
                    phoneOk={phoneOk}
                    onOpenAddressModal={() => setShowAddressModal(true)}
                    onOpenBusinessTypeModal={() => setShowBusinessTypeModal(true)}
                    cycle={cycle}
                    setCycle={setCycle}
                />
            ) : null}

            {step === 2 ? (
                <OperatingHoursStep
                    operatingMode={operatingMode}
                    sameOpenTime={sameOpenTime}
                    sameCloseTime={sameCloseTime}
                    weeklyHours={weeklyHours}
                    onModeChange={setOperatingMode}
                    onSameOpenTimeChange={value => setSameOpenTime(sanitizeTimeInput(value))}
                    onSameCloseTimeChange={value => setSameCloseTime(sanitizeTimeInput(value))}
                    onCopySame={copySameTimeToEveryDay}
                    onWeekdayWeekend={setWeekdayWeekendHours}
                    onCloseSunday={closeSunday}
                    onUpdateWeeklyHour={updateWeeklyHour}
                />
            ) : null}

            {step === 3 ? (
                <ConfirmStep
                    storeData={storeData}
                    minimumWage={minimumWage}
                    operatingHours={buildOperatingHoursPayload()}
                />
            ) : null}

            <AddressSearchModal
                visible={showAddressModal}
                initialQuery={storeData.query || storeData.roadAddress}
                onSelect={selectAddress}
                onClose={() => setShowAddressModal(false)}
            />

            <BusinessTypePicker
                visible={showBusinessTypeModal}
                value={storeData.businessType}
                onSelect={value => setStoreData(p => ({...p, businessType: value}))}
                onClose={() => setShowBusinessTypeModal(false)}
            />
        </ScreenContainer>
    );
};

interface BasicInfoStepProps {
    c: ReturnType<typeof useThemeColors>;
    storeData: StoreData;
    setStoreData: React.Dispatch<React.SetStateAction<StoreData>>;
    minimumWage: number;
    isWageBelowMinimum: boolean;
    phoneOk: boolean;
    onOpenAddressModal: () => void;
    onOpenBusinessTypeModal: () => void;
    cycle: PayrollCycleForm;
    setCycle: React.Dispatch<React.SetStateAction<PayrollCycleForm>>;
}

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
    c,
    storeData,
    setStoreData,
    minimumWage,
    isWageBelowMinimum,
    phoneOk,
    onOpenAddressModal,
    onOpenBusinessTypeModal,
    cycle,
    setCycle,
}) => (
    <>
        <SectionLabel text="기본 정보" />
        <View style={styles.form}>
            <AppInput label="매장명 *" placeholder="매장명을 입력해 주세요" value={storeData.storeName} onChangeText={t => setStoreData(p => ({...p, storeName: t}))} />
            <View>
                <AppText variant="caption" tone="secondary" style={styles.fieldLabel}>업종 *</AppText>
                <Pressable style={[styles.addressBtn, {borderColor: c.border, backgroundColor: c.background}]} onPress={onOpenBusinessTypeModal}>
                    <AppText variant="bodyMd" tone={storeData.businessType ? 'primary' : 'tertiary'} numberOfLines={1} style={styles.flex}>
                        {storeData.businessType || '업종을 선택해 주세요'}
                    </AppText>
                    <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
                </Pressable>
            </View>
            <AppInput
                label="사업자등록번호 *"
                placeholder="000-00-00000"
                value={storeData.businessLicenseNumber}
                onChangeText={t => setStoreData(p => ({...p, businessLicenseNumber: formatBusinessLicenseNumber(t)}))}
                keyboardType="numeric"
                maxLength={12}
            />
        </View>

        <SectionLabel text="연락처 정보" />
        <View style={styles.form}>
            <AppInput
                label="매장 전화번호 (유선)"
                placeholder="031-000-0000"
                value={storeData.businessNumber}
                onChangeText={t => setStoreData(p => ({...p, businessNumber: formatLandlineNumber(t)}))}
                keyboardType="phone-pad"
                maxLength={13}
            />
            <AppInput
                label="매장 전화번호 (휴대폰)"
                placeholder="010-0000-0000"
                value={storeData.storePhoneNumber}
                onChangeText={t => setStoreData(p => ({...p, storePhoneNumber: formatMobileNumber(t)}))}
                keyboardType="phone-pad"
                maxLength={13}
                helper={phoneOk ? '연락처가 입력되었어요' : '유선 또는 휴대폰 번호 중 하나는 필수예요'}
            />
        </View>

        <SectionLabel text="위치 정보" />
        <View style={styles.form}>
            <View>
                <AppText variant="caption" tone="secondary" style={styles.fieldLabel}>매장 주소 *</AppText>
                <Pressable style={[styles.addressBtn, {borderColor: c.border, backgroundColor: c.background}]} onPress={onOpenAddressModal}>
                    <AppText variant="bodyMd" tone={storeData.roadAddress ? 'primary' : 'tertiary'} numberOfLines={1} style={styles.flex}>
                        {storeData.roadAddress || '주소를 검색해 주세요'}
                    </AppText>
                    <Ionicons name="search-outline" size={18} color={c.textTertiary} />
                </Pressable>
                {storeData.jibunAddress ? (
                    <AppText variant="caption" tone="tertiary" style={styles.jibun}>지번 {storeData.jibunAddress}</AppText>
                ) : null}
            </View>
            <AppInput
                label="출퇴근 인증 반경 (m)"
                placeholder="100"
                value={storeData.radius.toString()}
                onChangeText={t => setStoreData(p => ({...p, radius: parseInt(t, 10) || 100}))}
                keyboardType="numeric"
                helper="직원이 출퇴근 체크를 할 수 있는 반경이에요"
            />
        </View>

        <SectionLabel text="급여 정보" />
        <View style={styles.form}>
            <AppInput
                label={`매장 기본 시급 * (최저 ${minimumWage.toLocaleString()}원)`}
                placeholder={minimumWage.toString()}
                value={storeData.storeStandardHourWage?.toString() ?? ''}
                onChangeText={t => setStoreData(p => ({...p, storeStandardHourWage: parseInt(t.replace(/[^\d]/g, ''), 10) || null}))}
                keyboardType="numeric"
                error={isWageBelowMinimum ? `최저시급(${minimumWage.toLocaleString()}원) 이상으로 설정해 주세요` : undefined}
            />
        </View>

        <SectionLabel text="급여 정산 주기" />
        <View style={styles.form}>
            <PayrollCycleEditor value={cycle} onChange={setCycle} />
        </View>
    </>
);

interface OperatingHoursStepProps {
    operatingMode: OperatingMode;
    sameOpenTime: string;
    sameCloseTime: string;
    weeklyHours: OperatingHourDraft[];
    onModeChange: (mode: OperatingMode) => void;
    onSameOpenTimeChange: (value: string) => void;
    onSameCloseTimeChange: (value: string) => void;
    onCopySame: () => void;
    onWeekdayWeekend: () => void;
    onCloseSunday: () => void;
    onUpdateWeeklyHour: (dayOfWeek: DayOfWeek, patch: Partial<OperatingHourDraft>) => void;
}

const OperatingHoursStep: React.FC<OperatingHoursStepProps> = ({
    operatingMode,
    sameOpenTime,
    sameCloseTime,
    weeklyHours,
    onModeChange,
    onSameOpenTimeChange,
    onSameCloseTimeChange,
    onCopySame,
    onWeekdayWeekend,
    onCloseSunday,
    onUpdateWeeklyHour,
}) => {
    const c = useThemeColors();
    const openToggleStyle = {backgroundColor: c.brandPrimarySoft};
    const closedToggleStyle = {backgroundColor: c.surfaceMuted};

    return (
        <>
            <View style={styles.segmented}>
                <ModeButton active={operatingMode === 'same'} label="매일 같음" onPress={() => onModeChange('same')} />
                <ModeButton active={operatingMode === 'weekly'} label="요일별 설정" onPress={() => onModeChange('weekly')} />
            </View>

            <View style={styles.quickActions}>
                <AppButton label="매일 같음 복사" size="sm" variant="outline" fullWidth={false} onPress={onCopySame} />
                <AppButton label="평일/주말 빠른 설정" size="sm" variant="outline" fullWidth={false} onPress={onWeekdayWeekend} />
                <AppButton label="일요일 휴무" size="sm" variant="outline" fullWidth={false} onPress={onCloseSunday} />
            </View>

            {operatingMode === 'same' ? (
                <AppCard variant="plain" style={styles.cardForm}>
                    <AppText variant="titleMd">매일 같은 운영시간</AppText>
                    <View style={styles.timeRow}>
                        <TimeInput label="오픈" value={sameOpenTime} onChangeText={onSameOpenTimeChange} />
                        <TimeInput label="마감" value={sameCloseTime} onChangeText={onSameCloseTimeChange} />
                    </View>
                </AppCard>
            ) : (
                <View style={styles.dayList}>
                    {weeklyHours.map(row => (
                        <AppCard key={row.dayOfWeek} variant="plain" style={styles.dayCard}>
                            <View style={styles.dayHeader}>
                                <AppText variant="titleMd">{DAY_LABEL[row.dayOfWeek]}요일</AppText>
                                <Pressable
                                    onPress={() => onUpdateWeeklyHour(row.dayOfWeek, {isClosed: !row.isClosed})}
                                    style={[
                                        styles.closedToggle,
                                        row.isClosed ? closedToggleStyle : openToggleStyle,
                                    ]}>
                                    <AppText variant="caption" weight="700" tone={row.isClosed ? 'secondary' : 'brand'}>
                                        {row.isClosed ? '휴무' : '영업'}
                                    </AppText>
                                </Pressable>
                            </View>
                            {row.isClosed ? (
                                <AppText variant="caption" tone="tertiary">이 요일은 휴무로 등록돼요.</AppText>
                            ) : (
                                <View style={styles.timeRow}>
                                    <TimeInput
                                        label="오픈"
                                        value={row.openTime}
                                        onChangeText={value => onUpdateWeeklyHour(row.dayOfWeek, {openTime: sanitizeTimeInput(value)})}
                                    />
                                    <TimeInput
                                        label="마감"
                                        value={row.closeTime}
                                        onChangeText={value => onUpdateWeeklyHour(row.dayOfWeek, {closeTime: sanitizeTimeInput(value)})}
                                    />
                                </View>
                            )}
                        </AppCard>
                    ))}
                </View>
            )}
        </>
    );
};

const TimeInput: React.FC<{label: string; value: string; onChangeText: (value: string) => void}> = ({label, value, onChangeText}) => (
    <AppInput
        label={label}
        value={value}
        onChangeText={valueText => onChangeText(sanitizeTimeInput(valueText))}
        placeholder="1000"
        keyboardType="number-pad"
        maxLength={4}
        helper={TIME_DIGITS_HELPER}
        error={getTimeError(value)}
        containerStyle={styles.timeInput}
    />
);

const ConfirmStep: React.FC<{
    storeData: StoreData;
    minimumWage: number;
    operatingHours: StoreOperatingHourPayload[];
}> = ({storeData, minimumWage, operatingHours}) => (
    <View style={styles.confirmList}>
        <AppCard variant="plain" style={styles.cardForm}>
            <AppText variant="titleMd">기본정보</AppText>
            <SummaryRow label="매장명" value={storeData.storeName} />
            <SummaryRow label="업종" value={storeData.businessType} />
            <SummaryRow label="사업자등록번호" value={storeData.businessLicenseNumber} />
            <SummaryRow label="연락처" value={storeData.storePhoneNumber || storeData.businessNumber} />
            <SummaryRow label="주소" value={storeData.roadAddress} />
            <SummaryRow label="기본 시급" value={`${(storeData.storeStandardHourWage ?? minimumWage).toLocaleString()}원`} />
        </AppCard>

        <AppCard variant="plain" style={styles.cardForm}>
            <AppText variant="titleMd">운영시간</AppText>
            {operatingHours.map(row => (
                <SummaryRow
                    key={row.dayOfWeek}
                    label={`${DAY_LABEL[row.dayOfWeek]}요일`}
                    value={row.isClosed ? '휴무' : `${row.openTime?.slice(0, 5)} - ${row.closeTime?.slice(0, 5)}`}
                />
            ))}
        </AppCard>
    </View>
);

const SummaryRow: React.FC<{label: string; value?: string | null}> = ({label, value}) => (
    <View style={styles.summaryRow}>
        <AppText variant="bodyMd" tone="secondary" style={styles.summaryLabel}>{label}</AppText>
        <AppText variant="bodyMd" weight="700" style={styles.summaryValue}>{value?.length ? value : '-'}</AppText>
    </View>
);

const SectionLabel: React.FC<{text: string}> = ({text}) => (
    <AppText variant="titleMd" style={styles.sectionLabel}>{text}</AppText>
);

const ModeButton: React.FC<{active: boolean; label: string; onPress: () => void}> = ({active, label, onPress}) => {
    const c = useThemeColors();
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{selected: active}}
            onPress={onPress}
            style={[
                styles.modeButton,
                {backgroundColor: active ? c.brandPrimary : c.background, borderColor: active ? c.brandPrimary : c.border},
            ]}>
            <AppText variant="bodyMd" weight="700" tone={active ? 'inverse' : 'secondary'}>{label}</AppText>
        </Pressable>
    );
};

const StepIndicator: React.FC<{currentStep: Step}> = ({currentStep}) => {
    const c = useThemeColors();
    const activeStyle = {backgroundColor: c.brandPrimary};
    const inactiveStyle = {backgroundColor: c.border};

    return (
        <View style={styles.stepRow}>
            {[1, 2, 3].map(value => (
                <View key={value} style={[styles.stepDot, currentStep === value ? activeStyle : inactiveStyle]} />
            ))}
        </View>
    );
};

const getStepTitle = (step: Step) => {
    if (step === 1) {
        return '기본정보를 입력해 주세요';
    }
    if (step === 2) {
        return '운영시간을 설정해 주세요';
    }
    return '입력한 내용을 확인해 주세요';
};

const getStepDescription = (step: Step) => {
    if (step === 1) {
        return '매장 연락처, 위치, 기본 시급을 먼저 설정합니다.';
    }
    if (step === 2) {
        return '시간은 콜론 없이 4자리 숫자로 입력해 주세요. 예: 1000';
    }
    return '최종 등록 버튼을 누르면 매장 정보와 운영시간을 함께 제출합니다.';
};

const styles = StyleSheet.create({
    heroBlock: {marginBottom: spacing.sm},
    hintSub: {marginTop: spacing.sm},
    stepRow: {flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, marginBottom: spacing.lg},
    stepDot: {
        flex: 1,
        height: 4,
        borderRadius: radius.pill,
    },
    sectionLabel: {marginTop: spacing.xxl, marginBottom: spacing.sm},
    form: {gap: spacing.md},
    fieldLabel: {marginBottom: spacing.xs, marginLeft: 2, fontWeight: '700'},
    addressBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 48,
        borderRadius: 15,
        borderWidth: 1,
        paddingHorizontal: spacing.md + 2,
        gap: spacing.sm,
    },
    flex: {flex: 1},
    jibun: {marginTop: spacing.xs, marginLeft: 2},
    footerRow: {flexDirection: 'row', gap: spacing.sm},
    footerButton: {flex: 1},
    segmented: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    modeButton: {
        flex: 1,
        minHeight: 44,
        borderRadius: radius.pill,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    cardForm: {gap: spacing.md},
    timeRow: {flexDirection: 'row', gap: spacing.md},
    timeInput: {flex: 1},
    dayList: {gap: spacing.md},
    dayCard: {gap: spacing.md},
    dayHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    closedToggle: {
        minWidth: 64,
        minHeight: 34,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
    },
    confirmList: {gap: spacing.md},
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.md,
    },
    summaryLabel: {width: 112},
    summaryValue: {flex: 1, textAlign: 'right'},
});

export default StoreRegistrationScreen;
