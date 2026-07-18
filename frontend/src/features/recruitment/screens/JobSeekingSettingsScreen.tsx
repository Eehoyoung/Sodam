/**
 * JobSeekingSettingsScreen — [직원] 구직 설정 (260711_작업통합.md Part 2 §7.3).
 *
 * `EmployeeRecruitmentScreen` 허브의 "구직 설정" 탭 콘텐츠로 임베드된다(독립 라우트 아님 —
 * §19.4 개정으로 `HomeStackParamList.JobSeekingSettings` 는 `EmployeeRecruitment` 로 흡수됨).
 * 헤더/ScreenContainer 는 허브가 소유하므로 이 컴포넌트는 본문만 렌더링한다.
 *
 * 구성(위→아래, §7.3): 자격 배너 → 현재 소속 카드 → 구직 상태 토글 → 구직 유형 칩
 * → 업종 분류 칩(N/3) → 희망지역 2개(AddressSearchModal 재사용) → 요일별 근무가능 시간
 * → 저장 버튼 → 프라이버시 안내.
 *
 * BACK 키 이탈 확인: 이 컴포넌트가 `useNavigation()` 으로 얻는 navigation 객체는 상위
 * `EmployeeRecruitment` 스크린과 동일 인스턴스(React Navigation 컨텍스트로 전파)이므로,
 * 여기서 `beforeRemove` 리스너를 등록해도 화면 이탈(BACK/스와이프/goBack) 시점에 정확히
 * 동작한다 — 미저장 변경(`dirty`)이 있으면 확인 시트를 띄운다(testing.md BACK=폼취소 주의).
 *
 * 재조회 전략(FE-DUP 수정, findings_report.md §4.1): `useMyJobSeeking` 은 `staleTime: 30s` —
 * 이 탭은 허브의 기본 탭이라 진입할 때마다 조건부 렌더로 새로 마운트되므로, TanStack Query 기본
 * `refetchOnMount` 만으로 "재진입 시 stale 하면 재조회"가 이미 충족된다. 예전에는 여기에 수동
 * `useFocusEffect(refetch)` 를 얹어 staleTime 을 무시하고 매번 강제 재조회했다(허브 기본 탭이라
 * 사실상 항상 발생) — staleTime 30s 설정의 취지 자체를 무력화하는 중복 호출이었다.
 */
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Switch, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppInput,
    AppText,
    AppToast,
    BottomSheet,
    ConfirmSheet,
    ErrorState,
    LoadingState,
} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {radius, recruit, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import AddressSearchModal, {AddressSearchResult} from '../../store/components/AddressSearchModal';
import {useMyJobSeeking, useUpdateMyJobSeeking} from '../hooks/useRecruitmentQueries';
import {
    JOB_CATEGORY_CODES,
    JOB_CATEGORY_LABELS,
    JOB_DAY_LABELS_KO,
    JOB_DAY_ORDER,
    JOB_SEEKING_ERROR_MESSAGES,
    JobAvailabilityDay,
    JobCategoryCode,
    JobDayOfWeek,
    JobSeekingErrorCode,
    JobSeekingType,
    JobSeekingUpdatePayload,
    MAX_JOB_CATEGORIES,
    SEEKING_TYPE_LABELS,
    SEEKING_TYPE_OPTIONS,
} from '../types';
import {compactTimeFromApi, isValidTimeDigits, sanitizeTimeDigits, timeDigitsToHHmm, timeDigitsToHHmmss, TIME_DIGITS_HELPER} from '../../../common/utils/dateTimeInput';

const LOCATION_SLOTS: Array<0 | 1> = [0, 1];

function formatTimeSummary(startTime: string, endTime: string): string {
    const s = compactTimeFromApi(startTime);
    const e = compactTimeFromApi(endTime);
    if (s.length !== 4 || e.length !== 4) {
        return '';
    }
    return `${timeDigitsToHHmm(s)}~${timeDigitsToHHmm(e)}`;
}

function extractErrorCode(err: unknown): JobSeekingErrorCode | undefined {
    return (err as {response?: {data?: {errorCode?: string}}})?.response?.data?.errorCode as
        | JobSeekingErrorCode
        | undefined;
}

function extractErrorMessage(err: unknown): string | undefined {
    return (err as {response?: {data?: {message?: string}}})?.response?.data?.message;
}

const JobSeekingSettingsScreen: React.FC = () => {
    const c = useThemeColors();
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const {data, isLoading, isError, refetch} = useMyJobSeeking();
    const updateMutation = useUpdateMyJobSeeking();

    const [dirty, setDirty] = useState(false);
    const [seeking, setSeeking] = useState(false);
    const [seekingTypes, setSeekingTypes] = useState<JobSeekingType[]>([]);
    const [jobCategories, setJobCategories] = useState<JobCategoryCode[]>([]);
    const [locations, setLocations] = useState<string[]>(['', '']);
    const [availability, setAvailability] = useState<JobAvailabilityDay[]>([]);

    const [addressSlot, setAddressSlot] = useState<0 | 1 | null>(null);
    const [editingDay, setEditingDay] = useState<JobDayOfWeek | null>(null);
    const [sheetStart, setSheetStart] = useState('0900');
    const [sheetEnd, setSheetEnd] = useState('1800');

    // 서버 데이터 → 로컬 폼 동기화. 사용자가 편집 중(dirty)이면 덮어쓰지 않는다.
    useEffect(() => {
        if (data && !dirty) {
            setSeeking(data.seeking);
            setSeekingTypes(data.seekingTypes ?? []);
            setJobCategories(data.jobCategories ?? []);
            setLocations([data.locations?.[0]?.address ?? '', data.locations?.[1]?.address ?? '']);
            setAvailability(data.availability ?? []);
        }
    }, [data, dirty]);

    // BACK 키 = 폼 취소 — 미저장 변경 시 확인 시트로 이탈을 막는다.
    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (!dirty) {
                return;
            }
            e.preventDefault();
            ConfirmSheet.confirm({
                title: '변경사항을 저장하지 않고 나갈까요?',
                description: '지금까지 입력한 구직 설정이 저장되지 않아요.',
                primary: {
                    label: '나가기',
                    destructive: true,
                    onPress: () => navigation.dispatch(e.data.action),
                },
                secondary: {label: '계속 작성'},
            });
        });
        return unsubscribe;
    }, [navigation, dirty]);

    const toggleSeekingType = (type: JobSeekingType) => {
        setDirty(true);
        setSeekingTypes(prev => (prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]));
    };

    const toggleCategory = (code: JobCategoryCode) => {
        setDirty(true);
        setJobCategories(prev => {
            if (prev.includes(code)) {
                return prev.filter(x => x !== code);
            }
            if (prev.length >= MAX_JOB_CATEGORIES) {
                AppToast.warn('업종은 최대 3개까지 선택할 수 있어요.');
                return prev;
            }
            return [...prev, code];
        });
    };

    const handleSelectAddress = (result: AddressSearchResult) => {
        if (addressSlot === null) {
            return;
        }
        const address = result.roadAddress || result.jibunAddress || result.query;
        setLocations(prev => {
            const next = [...prev];
            next[addressSlot] = address;
            return next;
        });
        setDirty(true);
    };

    const handleDayChipPress = (day: JobDayOfWeek) => {
        const existing = availability.find(a => a.day === day);
        if (existing) {
            setSheetStart(compactTimeFromApi(existing.startTime) || '0900');
            setSheetEnd(compactTimeFromApi(existing.endTime) || '1800');
            setEditingDay(day);
            return;
        }
        setDirty(true);
        setAvailability(prev => [...prev, {day, startTime: '09:00:00', endTime: '18:00:00'}]);
    };

    /** 시트의 시작/종료 입력을 검증 후 "HH:mm:ss" 페어로 변환. 실패 시 null + 토스트. */
    const readSheetTimes = (): {start: string; end: string} | null => {
        if (!isValidTimeDigits(sheetStart) || !isValidTimeDigits(sheetEnd)) {
            AppToast.warn('시간은 4자리 숫자로 입력해 주세요. 예: 0900');
            return null;
        }
        const start = timeDigitsToHHmmss(sheetStart);
        const end = timeDigitsToHHmmss(sheetEnd);
        if (start >= end) {
            AppToast.warn('종료 시간은 시작 시간보다 늦어야 해요.');
            return null;
        }
        return {start, end};
    };

    const handleSaveDayTime = () => {
        if (!editingDay) {
            return;
        }
        const times = readSheetTimes();
        if (!times) {
            return;
        }
        setAvailability(prev => [
            ...prev.filter(a => a.day !== editingDay),
            {day: editingDay, startTime: times.start, endTime: times.end},
        ]);
        setDirty(true);
        setEditingDay(null);
    };

    const handleApplyAllDays = () => {
        const times = readSheetTimes();
        if (!times) {
            return;
        }
        setAvailability(prev => prev.map(a => ({...a, startTime: times.start, endTime: times.end})));
        setDirty(true);
        AppToast.success('선택한 모든 요일에 같은 시간을 적용했어요.');
        setEditingDay(null);
    };

    const handleRemoveDay = () => {
        if (!editingDay) {
            return;
        }
        setAvailability(prev => prev.filter(a => a.day !== editingDay));
        setDirty(true);
        setEditingDay(null);
    };

    const handleSave = async () => {
        const trimmedLocations = locations.map(l => l.trim());
        if (seeking) {
            if (trimmedLocations.some(l => l.length === 0)) {
                AppToast.warn(JOB_SEEKING_ERROR_MESSAGES.JOB_SEEKING_LOCATIONS_REQUIRED);
                return;
            }
            if (seekingTypes.length === 0) {
                AppToast.warn(JOB_SEEKING_ERROR_MESSAGES.JOB_SEEKING_TYPES_REQUIRED);
                return;
            }
            if (jobCategories.length === 0) {
                AppToast.warn(JOB_SEEKING_ERROR_MESSAGES.JOB_SEEKING_CATEGORIES_INVALID);
                return;
            }
            if (availability.length === 0) {
                AppToast.warn(JOB_SEEKING_ERROR_MESSAGES.JOB_SEEKING_AVAILABILITY_REQUIRED);
                return;
            }
        }

        const payload: JobSeekingUpdatePayload = {
            seeking,
            locationAddresses: trimmedLocations.every(l => l.length > 0) ? trimmedLocations : undefined,
            seekingTypes: seekingTypes.length > 0 ? seekingTypes : undefined,
            jobCategories: jobCategories.length > 0 ? jobCategories : undefined,
            availability: availability.length > 0 ? availability : undefined,
        };

        try {
            await updateMutation.mutateAsync(payload);
            setDirty(false);
            AppToast.success(seeking ? '구직 상태로 전환했어요.' : '구직 설정을 저장했어요.');
        } catch (err: unknown) {
            const errorCode = extractErrorCode(err);
            const message =
                (errorCode ? JOB_SEEKING_ERROR_MESSAGES[errorCode] : undefined) ??
                extractErrorMessage(err) ??
                '저장에 실패했어요. 잠시 후 다시 시도해 주세요.';
            AppToast.error(message);
        }
    };

    if (isLoading) {
        return <LoadingState title="구직 정보 불러오는 중" description="잠시만 기다려 주세요" />;
    }
    if (isError || !data) {
        return (
            <ErrorState
                title="불러오지 못했어요"
                description="구직 정보를 가져오지 못했어요."
                primary={{label: '다시 시도', onPress: () => refetch()}}
            />
        );
    }

    const saving = updateMutation.isPending;

    return (
        <View style={styles.container}>
            {!data.eligible ? (
                <AppCard variant="danger" style={styles.card} testID="job-seeking-eligibility-banner">
                    <AppText variant="bodyMd" weight="700" tone="warning">
                        아직 구직 기능을 이용할 수 없어요
                    </AppText>
                    <AppText variant="caption" tone="secondary" style={styles.bannerSub}>
                        소담으로 출퇴근한 이력이 있어야 이용할 수 있어요.
                    </AppText>
                </AppCard>
            ) : null}

            <AppCard variant="flat" style={styles.card}>
                <AppText variant="titleMd" weight="700">현재 소속</AppText>
                {data.currentEmployment ? (
                    <AppText variant="bodyMd" tone="secondary" style={styles.cardSub}>
                        {data.currentEmployment.storeName} · {data.currentEmployment.hireDate} ~ 현재
                    </AppText>
                ) : (
                    <AppBadge label="휴직중" tone="neutral" style={styles.cardSub} />
                )}
            </AppCard>

            <AppCard variant="flat" style={styles.card}>
                <View style={styles.toggleRow}>
                    <View style={styles.flex1}>
                        <AppText variant="titleMd" weight="700">구직 상태</AppText>
                        <AppText variant="caption" tone="secondary">
                            {seeking ? '구직중이에요. 사장님 리스트에 노출돼요.' : '구직중이 아니에요.'}
                        </AppText>
                    </View>
                    <Switch
                        testID="job-seeking-toggle"
                        value={seeking}
                        disabled={!data.eligible}
                        onValueChange={v => {
                            setDirty(true);
                            setSeeking(v);
                        }}
                        trackColor={{false: c.border, true: recruit.primary}}
                        thumbColor={c.background}
                    />
                </View>
            </AppCard>

            <AppCard variant="flat" style={styles.card}>
                <AppText variant="titleMd" weight="700" style={styles.sectionTitle}>구직 유형</AppText>
                <View style={styles.chipRow}>
                    {SEEKING_TYPE_OPTIONS.map(type => {
                        const selected = seekingTypes.includes(type);
                        return (
                            <Pressable
                                key={type}
                                testID={`job-seeking-type-chip-${type}`}
                                onPress={() => toggleSeekingType(type)}
                                accessibilityRole="button"
                                accessibilityState={{selected}}
                                style={[
                                    styles.chip,
                                    {
                                        borderColor: selected ? recruit.primary : c.border,
                                        backgroundColor: selected ? recruit.primarySoft : c.background,
                                    },
                                ]}>
                                <AppText variant="bodyMd" weight="700" style={{color: selected ? recruit.primary : c.textSecondary}}>
                                    {SEEKING_TYPE_LABELS[type]}
                                </AppText>
                            </Pressable>
                        );
                    })}
                </View>
            </AppCard>

            <AppCard variant="flat" style={styles.card}>
                <View style={styles.sectionHeaderRow}>
                    <AppText variant="titleMd" weight="700">업종 분류</AppText>
                    <AppText testID="job-seeking-category-counter" variant="caption" tone="secondary">
                        {jobCategories.length}/{MAX_JOB_CATEGORIES}
                    </AppText>
                </View>
                <View style={styles.chipWrap}>
                    {JOB_CATEGORY_CODES.map(code => {
                        const selected = jobCategories.includes(code);
                        return (
                            <Pressable
                                key={code}
                                testID={`job-seeking-category-chip-${code}`}
                                onPress={() => toggleCategory(code)}
                                accessibilityRole="button"
                                accessibilityState={{selected}}
                                style={[
                                    styles.chip,
                                    {
                                        borderColor: selected ? recruit.primary : c.border,
                                        backgroundColor: selected ? recruit.primarySoft : c.background,
                                    },
                                ]}>
                                <AppText variant="bodyMd" weight="700" style={{color: selected ? recruit.primary : c.textSecondary}}>
                                    {JOB_CATEGORY_LABELS[code]}
                                </AppText>
                            </Pressable>
                        );
                    })}
                </View>
            </AppCard>

            <AppCard variant="flat" style={styles.card}>
                <AppText variant="titleMd" weight="700" style={styles.sectionTitle}>희망지역 (2곳 필수)</AppText>
                <View style={styles.locationList}>
                    {LOCATION_SLOTS.map(idx => (
                        <Pressable
                            key={idx}
                            testID={`job-seeking-location-row-${idx}`}
                            onPress={() => setAddressSlot(idx)}
                            style={[styles.locationRow, {borderColor: c.border}]}>
                            <Ionicons name="location-outline" size={18} color={recruit.primary} />
                            <AppText variant="bodyMd" style={styles.locationText} numberOfLines={1}>
                                {locations[idx] ? locations[idx] : `희망지역 ${idx + 1} 선택`}
                            </AppText>
                            <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
                        </Pressable>
                    ))}
                </View>
            </AppCard>

            <AppCard variant="flat" style={styles.card}>
                <AppText variant="titleMd" weight="700" style={styles.sectionTitle}>요일별 근무가능 시간</AppText>
                <AppText variant="caption" tone="secondary" style={styles.sectionSub}>
                    요일을 탭해 켜고, 켠 요일을 다시 탭하면 시작/종료 시간을 설정할 수 있어요.
                </AppText>
                <View style={styles.dayGrid}>
                    {JOB_DAY_ORDER.map(day => {
                        const entry = availability.find(a => a.day === day);
                        const selected = !!entry;
                        return (
                            <Pressable
                                key={day}
                                testID={`job-seeking-day-chip-${day}`}
                                onPress={() => handleDayChipPress(day)}
                                accessibilityRole="button"
                                accessibilityState={{selected}}
                                style={[
                                    styles.dayChip,
                                    {
                                        borderColor: selected ? recruit.primary : c.border,
                                        backgroundColor: selected ? recruit.primarySoft : c.background,
                                    },
                                ]}>
                                <AppText variant="bodyMd" weight="700" style={{color: selected ? recruit.primary : c.textSecondary}}>
                                    {JOB_DAY_LABELS_KO[day]}
                                </AppText>
                                {entry ? (
                                    <AppText variant="caption" style={{color: recruit.primary}} numberOfLines={1}>
                                        {formatTimeSummary(entry.startTime, entry.endTime)}
                                    </AppText>
                                ) : null}
                            </Pressable>
                        );
                    })}
                </View>
            </AppCard>

            <AppText variant="caption" tone="tertiary" style={styles.privacy}>
                사장님께는 이름·나이·경력·근무가능 정보만 공개돼요. 연락처는 공개되지 않아요.
            </AppText>

            <Pressable
                testID="job-seeking-save-button"
                onPress={handleSave}
                disabled={saving}
                accessibilityRole="button"
                accessibilityState={{disabled: saving, busy: saving}}
                style={({pressed}) => [
                    styles.saveBtn,
                    {backgroundColor: saving ? c.surfaceMuted : recruit.primary},
                    pressed && !saving ? styles.savePressed : null,
                ]}>
                {saving ? (
                    <ActivityIndicator size="small" color={c.textInverse} />
                ) : (
                    <AppText variant="bodyLg" weight="700" style={{color: c.textInverse}}>저장하기</AppText>
                )}
            </Pressable>

            <AddressSearchModal
                visible={addressSlot !== null}
                onSelect={handleSelectAddress}
                onClose={() => setAddressSlot(null)}
            />

            <BottomSheet
                visible={editingDay !== null}
                onClose={() => setEditingDay(null)}
                title={editingDay ? `${JOB_DAY_LABELS_KO[editingDay]}요일 근무 가능 시간` : ''}
                primary={{label: '저장', onPress: handleSaveDayTime}}
                secondary={{label: '취소', onPress: () => setEditingDay(null)}}>
                <View style={styles.timeSheetRow}>
                    <AppInput
                        testID="job-seeking-sheet-start-input"
                        label="시작"
                        value={sheetStart}
                        onChangeText={v => setSheetStart(sanitizeTimeDigits(v))}
                        placeholder="0900"
                        keyboardType="number-pad"
                        maxLength={4}
                        helper={TIME_DIGITS_HELPER}
                        containerStyle={styles.timeSheetInput}
                    />
                    <AppInput
                        testID="job-seeking-sheet-end-input"
                        label="종료"
                        value={sheetEnd}
                        onChangeText={v => setSheetEnd(sanitizeTimeDigits(v))}
                        placeholder="1800"
                        keyboardType="number-pad"
                        maxLength={4}
                        helper={TIME_DIGITS_HELPER}
                        containerStyle={styles.timeSheetInput}
                    />
                </View>
                <AppButton
                    testID="job-seeking-apply-all-days-button"
                    label="모든 선택 요일에 동일 적용"
                    variant="outline"
                    size="sm"
                    onPress={handleApplyAllDays}
                    style={styles.sheetActionBtn}
                />
                <AppButton
                    testID="job-seeking-remove-day-button"
                    label="이 요일 근무 가능 해제"
                    variant="ghost"
                    size="sm"
                    onPress={handleRemoveDay}
                    style={styles.sheetActionBtn}
                />
            </BottomSheet>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {gap: spacing.md, paddingTop: spacing.md},
    card: {gap: spacing.xs},
    cardSub: {marginTop: spacing.xs},
    bannerSub: {marginTop: 2},
    toggleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    flex1: {flex: 1, minWidth: 0},
    sectionTitle: {marginBottom: spacing.xs},
    sectionSub: {marginBottom: spacing.sm},
    sectionHeaderRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs},
    chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    chipWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    chip: {
        borderWidth: 1,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
    },
    locationList: {gap: spacing.sm},
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        borderWidth: 1,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md - 2,
    },
    locationText: {flex: 1, minWidth: 0},
    dayGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    dayChip: {
        minWidth: 56,
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        gap: 2,
    },
    privacy: {lineHeight: 18, paddingHorizontal: 2},
    saveBtn: {
        minHeight: 52,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xxl,
    },
    savePressed: {opacity: 0.94, transform: [{scale: 0.98}]},
    timeSheetRow: {flexDirection: 'row', gap: spacing.md},
    timeSheetInput: {flex: 1},
    sheetActionBtn: {marginTop: spacing.sm},
});

export default JobSeekingSettingsScreen;
