/**
 * 사장 스케줄 관리 화면 (B10 v2 — UX 개선).
 *
 * [수정 사항]
 * 1. 날짜 입력 제거 → 캘린더 탭에서 날짜 탭 후 바텀시트 오픈. 폼 내 날짜 표시만.
 * 2. 캘린더↔보드 탭 연결 → 보드 탭 진입 시 selectedDate 기준 주로 자동 이동.
 * 3. 보드 월 이동이 calMonth를 건드리지 않음 → 달력 탭 뷰가 튀지 않음.
 * 4. 로딩 2단계 → 초기 로드만 전체 스피너, 이후 월 변경은 달력 위 인디케이터만.
 * 5. 직원 선택 칩 → 인라인 드롭다운으로 교체 (직원 수 많아도 정상 표시).
 * 6. 확정·알림 버튼을 보드 주 헤더에 배치 → 항상 노출.
 * 7. 보드 빈 칸 "+" → onAddShift로 바텀시트 오픈.
 */
import React, {useCallback, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, View} from 'react-native';
import {RouteProp, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    AppToast,
    BottomSheet,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import AppCalendar from '../../../common/components/AppCalendar';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {radius, spacing} from '../../../theme/tokens';
import {COLORS} from '../../../common/components/logo/Colors';
import {
    TIME_DIGITS_HELPER,
    compactTimeFromApi,
    isValidTimeDigits,
    sanitizeTimeDigits,
    timeDigitsToHHmm,
} from '../../../common/utils/dateTimeInput';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import storeService, {DayOperatingHours, DayOfWeek, StoreEmployeeDto} from '../../store/services/storeService';
import {
    addDays,
    applyTemplate,
    confirmStoreWeekShifts,
    createShift,
    createTemplate,
    currentYearMonth,
    deleteShift,
    deleteTemplate,
    fetchStoreShifts,
    fetchTemplates,
    isOvernight,
    monthRange,
    ShiftTemplate,
    shiftDurationHours,
    shortTime,
    todayIso,
    updateShift,
    weekRangeOf,
    WorkShift,
    WorkShiftCreateBody,
    WorkShiftUpdateBody,
} from '../services/shiftService';
import WeeklyShiftBoard from '../components/WeeklyShiftBoard';

type StoreScheduleRouteProp = RouteProp<HomeStackParamList, 'StoreSchedule'>;
type StoreScheduleNavProp = NativeStackNavigationProp<HomeStackParamList, 'StoreSchedule'>;

interface Props {
    route: StoreScheduleRouteProp;
    navigation: StoreScheduleNavProp;
}

type TabMode = 'calendar' | 'board' | 'template';

const EMP_COLORS = [COLORS.SODAM_ORANGE, COLORS.SODAM_BLUE, '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'];
const DOW_ENUM: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

function parseDate(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
}

function formatDateLong(iso: string): string {
    if (!iso) { return '—'; }
    const d = parseDate(iso);
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY_KO[d.getDay()]})`;
}

function formatDateShort(iso: string): string {
    const d = parseDate(iso);
    return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAY_KO[d.getDay()]})`;
}

function timeToMin(t: string): number {
    const [h, m] = shortTime(t).split(':').map(Number);
    return (Number.isNaN(h) ? 0 : h) * 60 + (Number.isNaN(m) ? 0 : m);
}

function shiftInterval(start: string, end: string): [number, number] {
    const s = timeToMin(start);
    let e = timeToMin(end);
    if (e <= s) { e += 24 * 60; }
    return [s, e];
}

function computeWarnings(args: {
    employeeId: number | null;
    date: string;
    start: string;
    end: string;
    shifts: WorkShift[];
    operatingHours: DayOperatingHours[];
    excludeId?: number | null;
    empName?: string;
}): string[] {
    const {employeeId, date, start, end, shifts, operatingHours, excludeId, empName} = args;
    const out: string[] = [];
    if (!employeeId || !date || !start || !end || start === end) { return out; }
    const [s, e] = shiftInterval(start, end);

    const overlap = shifts.some(sh => {
        if (sh.employeeId !== employeeId || sh.shiftDate !== date || sh.id === excludeId) { return false; }
        const [s2, e2] = shiftInterval(shortTime(sh.startTime), shortTime(sh.endTime));
        return s < e2 && s2 < e;
    });
    if (overlap) { out.push(`${empName ?? '이 직원'}의 근무가 같은 날 다른 근무와 겹쳐요.`); }

    const hours = (e - s) / 60;
    if (hours >= 8) { out.push('8시간 이상 근무엔 1시간 이상 휴게가 필요해요 (§54).'); }
    else if (hours >= 4) { out.push('4시간 이상 근무엔 30분 이상 휴게가 필요해요 (§54).'); }

    if (operatingHours.length > 0) {
        const dow = DOW_ENUM[parseDate(date).getDay()];
        const day = operatingHours.find(d => d.dayOfWeek === dow);
        if (day?.isClosed) {
            out.push('휴무일에 근무가 잡혔어요. 운영시간을 확인해 주세요.');
        } else if (day?.openTime && day?.closeTime) {
            const open = timeToMin(day.openTime);
            const close = timeToMin(day.closeTime);
            const isON = e > 24 * 60;
            if (timeToMin(start) < open || (!isON && timeToMin(end) > close)) {
                out.push(`영업시간(${day.openTime.slice(0, 5)}~${day.closeTime.slice(0, 5)}) 밖 근무예요.`);
            }
        }
    }
    return out;
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function StoreScheduleScreen({route, navigation}: Props) {
    const {storeId} = route.params;
    const c = useThemeColors();

    // ─ 화면 ─
    const [tab, setTab] = useState<TabMode>('calendar');
    const [calMonth, setCalMonth] = useState(currentYearMonth);
    const [selectedDate, setSelectedDate] = useState<string | null>(todayIso);
    const [boardWeekStart, setBoardWeekStart] = useState(() => weekRangeOf(todayIso()).from);

    // ─ 데이터 ─
    const [employees, setEmployees] = useState<StoreEmployeeDto[]>([]);
    const [shifts, setShifts] = useState<WorkShift[]>([]);
    const [operatingHours, setOperatingHours] = useState<DayOperatingHours[]>([]);
    const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
    const loadedMonthsRef = useRef<Set<string>>(new Set()); // 이미 로드된 월 추적

    // ─ 로딩 (분리) ─
    const [pageLoading, setPageLoading] = useState(true);   // 최초 1회 전체 스피너
    const [calLoading, setCalLoading] = useState(false);    // 달력 월 변경 시 인디케이터
    const [loadError, setLoadError] = useState<string | null>(null);

    // ─ 바텀시트 ─
    const [sheetVisible, setSheetVisible] = useState(false);
    const [editingShift, setEditingShift] = useState<WorkShift | null>(null);
    const [formEmployee, setFormEmployee] = useState<number | null>(null);
    const [formDateIso, setFormDateIso] = useState(''); // YYYY-MM-DD, 항상 유효값
    const [formStart, setFormStartRaw] = useState('0900');
    const [formEnd, setFormEndRaw] = useState('1800');
    const [formMemo, setFormMemo] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false); // 직원 인라인 드롭다운

    // ─ 보드 액션 ─
    const [confirming, setConfirming] = useState(false);
    const [copying, setCopying] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [templateBusy, setTemplateBusy] = useState(false);

    const setFormStart = (v: string) => setFormStartRaw(sanitizeTimeDigits(v));
    const setFormEnd = (v: string) => setFormEndRaw(sanitizeTimeDigits(v));

    // ── 데이터 로드 (3종) ────────────────────────────────────────────────────

    /** 초기 전체 로드: 직원·운영시간·템플릿·시프트 */
    const loadBase = useCallback(
        async (ym: string) => {
            setLoadError(null);
            try {
                const {from, to} = monthRange(ym);
                const [empList, shiftList, hours, tpls] = await Promise.all([
                    storeService.getStoreEmployees(storeId),
                    fetchStoreShifts(storeId, from, to),
                    storeService.getStoreOperatingHours(storeId).catch(() => [] as DayOperatingHours[]),
                    fetchTemplates(storeId).catch(() => [] as ShiftTemplate[]),
                ]);
                setEmployees(empList);
                setShifts(shiftList);
                setOperatingHours(hours);
                setTemplates(tpls);
                loadedMonthsRef.current.add(ym);
                setFormEmployee(prev => prev ?? empList[0]?.id ?? null);
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : '스케줄 정보를 불러오지 못했어요.';
                setLoadError(msg);
            }
        },
        [storeId],
    );

    /** 캘린더 월 이동: 시프트만 교체, 직원/운영시간은 유지 */
    const loadShiftsForMonth = useCallback(
        async (ym: string) => {
            setCalLoading(true);
            try {
                const {from, to} = monthRange(ym);
                const list = await fetchStoreShifts(storeId, from, to);
                setShifts(list);
                loadedMonthsRef.current.add(ym);
            } catch {
                AppToast.error('해당 월 스케줄을 불러오지 못했어요.');
            } finally {
                setCalLoading(false);
            }
        },
        [storeId],
    );

    /** 보드가 다른 월로 이동 시: 시프트 추가 병합 (calMonth 건드리지 않음) */
    const loadShiftsAdditive = useCallback(
        async (ym: string) => {
            if (loadedMonthsRef.current.has(ym)) { return; }
            try {
                const {from, to} = monthRange(ym);
                const list = await fetchStoreShifts(storeId, from, to);
                setShifts(prev => {
                    const filtered = prev.filter(s => !s.shiftDate.startsWith(ym));
                    return [...filtered, ...list];
                });
                loadedMonthsRef.current.add(ym);
            } catch { /* 보드 이동 중 오류는 무시 — 다음 주 이동 시 재시도 */ }
        },
        [storeId],
    );

    useFocusEffect(
        useCallback(() => {
            loadedMonthsRef.current.clear(); // 포커스 복귀 시 캐시 초기화
            setPageLoading(true);
            loadBase(calMonth).finally(() => setPageLoading(false));
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [loadBase]),
    );

    // ── 캘린더 월 이동 ───────────────────────────────────────────────────────
    const handleMonthChange = (ym: string) => {
        setCalMonth(ym);
        loadShiftsForMonth(ym);
    };

    // ── 탭 전환 (보드 탭 진입 시 selectedDate 기준 주 자동 이동) ──────────────
    const handleTabChange = (newTab: TabMode) => {
        if (newTab === 'board') {
            const anchor = selectedDate ?? todayIso();
            const weekFrom = weekRangeOf(anchor).from;
            setBoardWeekStart(weekFrom);
            const wm = weekFrom.slice(0, 7);
            loadShiftsAdditive(wm);
        }
        setTab(newTab);
        setDropdownOpen(false);
    };

    // ── 파생 상태 ────────────────────────────────────────────────────────────
    const employeeColorMap = useMemo<Record<number, string>>(() => {
        const map: Record<number, string> = {};
        employees.forEach((emp, i) => { map[emp.id] = EMP_COLORS[i % EMP_COLORS.length]; });
        return map;
    }, [employees]);

    const employeeNameById = useMemo<Record<number, string>>(() => {
        const map: Record<number, string> = {};
        employees.forEach(emp => { map[emp.id] = emp.name; });
        return map;
    }, [employees]);

    const calendarMarks = useMemo(() => {
        const marks: Record<string, {dots: string[]}> = {};
        shifts.forEach(s => {
            if (!marks[s.shiftDate]) { marks[s.shiftDate] = {dots: []}; }
            const color = employeeColorMap[s.employeeId] ?? COLORS.SODAM_ORANGE;
            if (!marks[s.shiftDate].dots.includes(color) && marks[s.shiftDate].dots.length < 3) {
                marks[s.shiftDate].dots.push(color);
            }
        });
        return marks;
    }, [shifts, employeeColorMap]);

    const dayShifts = useMemo(() => {
        if (!selectedDate) { return []; }
        return shifts
            .filter(s => s.shiftDate === selectedDate)
            .sort((a, b) => shortTime(a.startTime).localeCompare(shortTime(b.startTime)));
    }, [shifts, selectedDate]);

    const boardWeekDates = useMemo(
        () => Array.from({length: 7}, (_, i) => addDays(boardWeekStart, i)),
        [boardWeekStart],
    );

    const boardSummary = useMemo(() => {
        const weekShifts = shifts.filter(s => boardWeekDates.includes(s.shiftDate));
        const empIds = new Set(weekShifts.map(s => s.employeeId));
        const hrs = weekShifts.reduce((sum, s) => sum + shiftDurationHours(s.startTime, s.endTime), 0);
        return {count: weekShifts.length, empCount: empIds.size, hours: hrs};
    }, [shifts, boardWeekDates]);

    const boardShifts = shifts.filter(s => boardWeekDates.includes(s.shiftDate));

    // 폼에서 쓰는 HH:mm 값
    const formStartHHmm = isValidTimeDigits(formStart) ? timeDigitsToHHmm(formStart) : '';
    const formEndHHmm = isValidTimeDigits(formEnd) ? timeDigitsToHHmm(formEnd) : '';

    const formWarnings = useMemo(
        () =>
            computeWarnings({
                employeeId: formEmployee,
                date: formDateIso,
                start: formStartHHmm,
                end: formEndHHmm,
                shifts,
                operatingHours,
                excludeId: editingShift?.id ?? null,
                empName: formEmployee !== null ? employeeNameById[formEmployee] : undefined,
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [formEmployee, formDateIso, formStartHHmm, formEndHHmm, shifts, operatingHours, editingShift],
    );

    // ── 바텀시트 열기/닫기 ────────────────────────────────────────────────────
    const openAddSheet = (date: string) => {
        setEditingShift(null);
        setFormDateIso(date);
        setFormStart('0900');
        setFormEnd('1800');
        setFormMemo('');
        setFormError(null);
        setDropdownOpen(false);
        setFormEmployee(employees[0]?.id ?? null);
        setSheetVisible(true);
    };

    const openEditSheet = (shift: WorkShift) => {
        setEditingShift(shift);
        setFormEmployee(shift.employeeId);
        setFormDateIso(shift.shiftDate);
        setFormStart(compactTimeFromApi(shift.startTime));
        setFormEnd(compactTimeFromApi(shift.endTime));
        setFormMemo(shift.memo ?? '');
        setFormError(null);
        setDropdownOpen(false);
        setSheetVisible(true);
    };

    const closeSheet = () => {
        setSheetVisible(false);
        setEditingShift(null);
        setFormError(null);
        setDropdownOpen(false);
    };

    // ── 폼 검증 ───────────────────────────────────────────────────────────────
    const validateForm = (): string | null => {
        if (!formEmployee) { return '직원을 선택해 주세요.'; }
        if (!formDateIso) { return '날짜가 없어요. 달력에서 날짜를 먼저 선택해 주세요.'; }
        if (!isValidTimeDigits(formStart)) { return TIME_DIGITS_HELPER; }
        if (!isValidTimeDigits(formEnd)) { return TIME_DIGITS_HELPER; }
        if (formStart === formEnd) { return '시작 시간과 종료 시간이 같을 수 없어요.'; }
        return null;
    };

    // ── 근무 CRUD ─────────────────────────────────────────────────────────────
    const handleSave = async () => {
        const msg = validateForm();
        if (msg) { setFormError(msg); return; }
        setSaving(true);
        setFormError(null);

        if (editingShift) {
            const body: WorkShiftUpdateBody = {
                shiftDate: formDateIso,
                startTime: formStartHHmm,
                endTime: formEndHHmm,
                memo: formMemo.trim() || undefined,
            };
            const prevShifts = shifts;
            setShifts(curr =>
                curr.map(s =>
                    s.id === editingShift.id
                        ? {...s, shiftDate: body.shiftDate, startTime: body.startTime + ':00', endTime: body.endTime + ':00', memo: body.memo}
                        : s,
                ),
            );
            closeSheet();
            setSaving(false);
            try {
                const updated = await updateShift(storeId, editingShift.id, body);
                setShifts(curr => curr.map(s => s.id === updated.id ? updated : s));
                AppToast.success('근무를 수정했어요. 다시 확정·알림을 보내주세요.');
            } catch {
                setShifts(prevShifts);
                AppToast.error('근무 수정에 실패했어요.');
            }
        } else {
            const body: WorkShiftCreateBody = {
                employeeId: formEmployee as number,
                shiftDate: formDateIso,
                startTime: formStartHHmm,
                endTime: formEndHHmm,
                memo: formMemo.trim() || undefined,
            };
            const tmpId = -Date.now();
            const optimistic: WorkShift = {
                id: tmpId,
                employeeId: body.employeeId,
                storeId,
                shiftDate: body.shiftDate,
                startTime: body.startTime + ':00',
                endTime: body.endTime + ':00',
                memo: body.memo,
            };
            setShifts(prev => [...prev, optimistic]);
            closeSheet();
            setSaving(false);
            try {
                const created = await createShift(storeId, body);
                setShifts(curr => curr.map(s => s.id === tmpId ? created : s));
                AppToast.success('근무를 추가했어요.');
            } catch {
                setShifts(prev => prev.filter(s => s.id !== tmpId));
                AppToast.error('근무 추가에 실패했어요.');
            }
        }
    };

    const handleDelete = async () => {
        if (!editingShift) { return; }
        const id = editingShift.id;
        const prevShifts = shifts;
        setShifts(prev => prev.filter(s => s.id !== id));
        closeSheet();
        try {
            await deleteShift(storeId, id);
            AppToast.success('근무를 삭제했어요.');
        } catch {
            setShifts(prevShifts);
            AppToast.error('근무 삭제에 실패했어요.');
        }
    };

    const moveShift = useCallback(
        async (shift: WorkShift, newDate: string) => {
            if (newDate === shift.shiftDate) { return; }
            const prevShifts = shifts;
            setShifts(curr => curr.map(s => s.id === shift.id ? {...s, shiftDate: newDate} : s));
            try {
                await updateShift(storeId, shift.id, {
                    shiftDate: newDate,
                    startTime: shortTime(shift.startTime),
                    endTime: shortTime(shift.endTime),
                    memo: shift.memo ?? undefined,
                });
                AppToast.success('요일을 옮겼어요. 다시 확정·알림을 보내주세요.');
            } catch {
                setShifts(prevShifts);
                AppToast.error('요일 이동에 실패했어요.');
            }
        },
        [storeId, shifts],
    );

    // ── 보드 주 이동 ──────────────────────────────────────────────────────────
    const goBoardWeek = (delta: number) => {
        const newStart = addDays(boardWeekStart, delta * 7);
        setBoardWeekStart(newStart);
        // calMonth는 건드리지 않음 — 달력 탭 뷰는 사용자가 직접 이동할 때만 바뀜
        loadShiftsAdditive(newStart.slice(0, 7));
    };

    // ── 지난주 복사 ───────────────────────────────────────────────────────────
    const copyLastWeek = async () => {
        setCopying(true);
        try {
            const prevFrom = addDays(boardWeekStart, -7);
            const prevTo = addDays(boardWeekStart, -1);
            const lastWeekShifts = await fetchStoreShifts(storeId, prevFrom, prevTo);
            if (lastWeekShifts.length === 0) { AppToast.show('지난주에 복사할 근무가 없어요.'); return; }
            const existingKeys = new Set(
                shifts.map(s => `${s.employeeId}|${s.shiftDate}|${shortTime(s.startTime)}`),
            );
            const toCreate = lastWeekShifts.filter(it => {
                const key = `${it.employeeId}|${addDays(it.shiftDate, 7)}|${shortTime(it.startTime)}`;
                return !existingKeys.has(key);
            });
            if (toCreate.length === 0) { AppToast.show('이미 이번 주에 복사돼 있어요.'); return; }
            await Promise.all(
                toCreate.map(it =>
                    createShift(storeId, {
                        employeeId: it.employeeId,
                        shiftDate: addDays(it.shiftDate, 7),
                        startTime: shortTime(it.startTime),
                        endTime: shortTime(it.endTime),
                        memo: it.memo ?? undefined,
                    }),
                ),
            );
            AppToast.success(`지난주 스케줄 ${toCreate.length}건을 복사했어요.`);
            const {from, to} = monthRange(calMonth);
            setShifts(await fetchStoreShifts(storeId, from, to));
        } catch {
            AppToast.error('지난주 복사에 실패했어요.');
        } finally {
            setCopying(false);
        }
    };

    // ── 확정·알림 ─────────────────────────────────────────────────────────────
    const confirmAndNotify = async () => {
        setConfirming(true);
        try {
            const result = await confirmStoreWeekShifts(storeId, {
                from: boardWeekStart,
                to: addDays(boardWeekStart, 6),
            });
            AppToast.success(
                `${result.confirmedCount}건 확정, ${result.notifiedCount}명에게 알림 발송 완료.`,
            );
        } catch {
            AppToast.error('스케줄 확정에 실패했어요.');
        } finally {
            setConfirming(false);
        }
    };

    // ── 템플릿 ────────────────────────────────────────────────────────────────
    const saveTemplate = async () => {
        const name = templateName.trim();
        if (!name) { AppToast.error('템플릿 이름을 입력해 주세요.'); return; }
        setTemplateBusy(true);
        try {
            await createTemplate(storeId, {name, from: boardWeekStart, to: addDays(boardWeekStart, 6)});
            setTemplateName('');
            AppToast.success('템플릿을 저장했어요.');
            setTemplates(await fetchTemplates(storeId));
        } catch {
            AppToast.error('템플릿 저장에 실패했어요. 보드에 근무가 있는지 확인해 주세요.');
        } finally {
            setTemplateBusy(false);
        }
    };

    const applyTpl = async (t: ShiftTemplate) => {
        setTemplateBusy(true);
        try {
            const res = await applyTemplate(storeId, t.id, boardWeekStart);
            const skip = res.skippedCount > 0 ? ` (${res.skippedCount}건 비활성 직원 제외)` : '';
            AppToast.success(`${res.createdCount}건을 이번 주에 추가했어요.${skip}`);
            const {from, to} = monthRange(calMonth);
            setShifts(await fetchStoreShifts(storeId, from, to));
            handleTabChange('calendar');
        } catch {
            AppToast.error('템플릿 적용에 실패했어요.');
        } finally {
            setTemplateBusy(false);
        }
    };

    const removeTpl = async (t: ShiftTemplate) => {
        setTemplateBusy(true);
        try {
            await deleteTemplate(storeId, t.id);
            AppToast.success('템플릿을 삭제했어요.');
            setTemplates(await fetchTemplates(storeId));
        } catch {
            AppToast.error('템플릿 삭제에 실패했어요.');
        } finally {
            setTemplateBusy(false);
        }
    };

    // ── 초기 로딩/에러 ────────────────────────────────────────────────────────
    const header = <AppHeader title="스케줄 관리" onBack={() => navigation.goBack()} />;
    if (pageLoading) {
        return (
            <ScreenContainer header={header}>
                <LoadingState title="스케줄 불러오는 중" />
            </ScreenContainer>
        );
    }
    if (loadError) {
        return (
            <ScreenContainer header={header}>
                <ErrorState
                    title="불러오지 못했어요"
                    description={loadError}
                    primary={{label: '다시 시도', onPress: () => { setPageLoading(true); loadBase(calMonth).finally(() => setPageLoading(false)); }}}
                />
            </ScreenContainer>
        );
    }

    const boardWeekEnd = addDays(boardWeekStart, 6);
    const boardWeekLabel = `${formatDateShort(boardWeekStart)} ~ ${formatDateShort(boardWeekEnd)}`;

    // ── 선택된 직원 이름 (드롭다운 표시용) ───────────────────────────────────
    const selectedEmpName =
        formEmployee !== null ? (employeeNameById[formEmployee] ?? '직원 선택') : '직원 선택';

    return (
        <>
            <ScreenContainer scroll header={header}>
                {/* ── 탭 바 ── */}
                <View style={styles.tabBar}>
                    {(['calendar', 'board', 'template'] as const).map(t => {
                        const active = tab === t;
                        const icon =
                            t === 'calendar' ? 'calendar-outline'
                            : t === 'board' ? 'grid-outline'
                            : 'documents-outline';
                        const label =
                            t === 'calendar' ? '캘린더' : t === 'board' ? '보드' : '템플릿';
                        return (
                            <Pressable
                                key={t}
                                onPress={() => handleTabChange(t)}
                                style={[
                                    styles.tabBtn,
                                    {
                                        backgroundColor: active ? c.brandPrimary : c.background,
                                        borderColor: active ? c.brandPrimary : c.border,
                                    },
                                ]}>
                                <Ionicons name={icon} size={16} color={active ? c.textInverse : c.textTertiary} />
                                <AppText
                                    variant="caption"
                                    weight={active ? '700' : '400'}
                                    style={{color: active ? c.textInverse : c.textTertiary}}>
                                    {label}
                                </AppText>
                            </Pressable>
                        );
                    })}
                </View>

                {/* ════════ 캘린더 탭 ════════ */}
                {tab === 'calendar' && (
                    <View style={styles.section}>
                        {/* 달력 + 로딩 인디케이터 (오버레이, 전체 스피너 아님) */}
                        <View>
                            <AppCalendar
                                month={calMonth}
                                onMonthChange={handleMonthChange}
                                markedDates={calendarMarks}
                                selectedDate={selectedDate}
                                onDayPress={setSelectedDate}
                            />
                            {calLoading && (
                                <View style={styles.calLoadingOverlay}>
                                    <ActivityIndicator size="small" color={c.brandPrimary} />
                                </View>
                            )}
                        </View>

                        {/* 선택 날 근무 */}
                        {selectedDate && (
                            <View style={styles.daySection}>
                                <View style={styles.daySectionHeader}>
                                    <AppText variant="titleMd" weight="700">
                                        {formatDateLong(selectedDate)}
                                    </AppText>
                                    <AppButton
                                        label="+ 근무 추가"
                                        size="sm"
                                        fullWidth={false}
                                        onPress={() => openAddSheet(selectedDate)}
                                    />
                                </View>

                                {dayShifts.length === 0 ? (
                                    <View style={[styles.emptyDay, {borderColor: c.border}]}>
                                        <AppText variant="caption" tone="tertiary" center>
                                            이 날 등록된 근무가 없어요
                                        </AppText>
                                    </View>
                                ) : (
                                    dayShifts.map(shift => {
                                        const overnight =
                                            shift.crossesMidnight ??
                                            isOvernight(shift.startTime, shift.endTime);
                                        const empColor = employeeColorMap[shift.employeeId] ?? COLORS.SODAM_ORANGE;
                                        return (
                                            <Pressable
                                                key={shift.id}
                                                onPress={() => openEditSheet(shift)}
                                                style={({pressed}) => [{opacity: pressed ? 0.7 : 1}]}>
                                                <AppCard variant="flat" style={styles.shiftCard}>
                                                    <View style={styles.shiftRow}>
                                                        <View style={[styles.empDot, {backgroundColor: empColor}]} />
                                                        <View style={styles.flex}>
                                                            <AppText variant="titleMd" numberOfLines={1}>
                                                                {employeeNameById[shift.employeeId] ?? '직원'}
                                                            </AppText>
                                                            <AppText variant="caption" tone="secondary">
                                                                {shortTime(shift.startTime)} ~ {shortTime(shift.endTime)}
                                                                {overnight ? ' (익일)' : ''}
                                                                {shift.memo ? ` · ${shift.memo}` : ''}
                                                            </AppText>
                                                        </View>
                                                        <Ionicons name="create-outline" size={16} color={c.textTertiary} />
                                                    </View>
                                                </AppCard>
                                            </Pressable>
                                        );
                                    })
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* ════════ 보드 탭 ════════ */}
                {tab === 'board' && (
                    <View style={styles.section}>
                        {/* 주 이동 + 확정 버튼 (항상 노출) */}
                        <View style={[styles.weekHeader, {backgroundColor: c.surfaceMuted}]}>
                            <Pressable hitSlop={12} onPress={() => goBoardWeek(-1)}>
                                <Ionicons name="chevron-back-outline" size={22} color={c.textPrimary} />
                            </Pressable>
                            <View style={styles.weekHeaderCenter}>
                                <AppText variant="caption" tone="secondary">{boardWeekLabel}</AppText>
                                <View style={styles.summaryPills}>
                                    <SummaryPill value={`${boardSummary.count}건`} />
                                    <SummaryPill value={`${boardSummary.empCount}명`} />
                                    <SummaryPill value={`${boardSummary.hours.toFixed(1)}h`} />
                                </View>
                            </View>
                            <Pressable hitSlop={12} onPress={() => goBoardWeek(1)}>
                                <Ionicons name="chevron-forward-outline" size={22} color={c.textPrimary} />
                            </Pressable>
                        </View>

                        {/* 확정·알림 + 지난주 복사 */}
                        <View style={styles.actionRow}>
                            <AppButton
                                label="지난주 복사"
                                variant="secondary"
                                size="md"
                                fullWidth={false}
                                loading={copying}
                                disabled={copying}
                                style={styles.flex}
                                onPress={copyLastWeek}
                            />
                            <AppButton
                                label={confirming ? '발송 중...' : '확정·알림'}
                                size="md"
                                fullWidth={false}
                                loading={confirming}
                                disabled={confirming || boardShifts.length === 0}
                                style={styles.flex}
                                onPress={confirmAndNotify}
                            />
                        </View>

                        {/* 힌트 */}
                        <View style={styles.hintRow}>
                            <Ionicons name="hand-left-outline" size={13} color={c.textTertiary} />
                            <AppText variant="caption" tone="tertiary">
                                근무를 길게 눌러 끌면 요일 이동 · 탭하면 수정 · "+" 탭하면 추가
                            </AppText>
                        </View>

                        <WeeklyShiftBoard
                            weekDates={boardWeekDates}
                            shifts={boardShifts}
                            employeeNameById={employeeNameById}
                            onMoveShift={moveShift}
                            onPressShift={openEditSheet}
                            onAddShift={openAddSheet}
                        />
                    </View>
                )}

                {/* ════════ 템플릿 탭 ════════ */}
                {tab === 'template' && (
                    <View style={styles.section}>
                        <AppCard variant="plain" style={styles.tplForm}>
                            <View style={styles.rowSm}>
                                <Ionicons name="save-outline" size={20} color={c.brandPrimary} />
                                <AppText variant="titleMd">현재 보드 주를 템플릿으로 저장</AppText>
                            </View>
                            <AppText variant="caption" tone="secondary">
                                보드 탭에 표시된 주({boardWeekLabel})를 요일 패턴으로 저장해요.
                            </AppText>
                            <AppInput
                                label="템플릿 이름"
                                value={templateName}
                                onChangeText={setTemplateName}
                                placeholder="예: 평일 기본, 주말 강화"
                            />
                            <AppButton
                                label="이번 주 저장"
                                loading={templateBusy}
                                disabled={templateBusy}
                                onPress={saveTemplate}
                            />
                        </AppCard>

                        {templates.length === 0 ? (
                            <EmptyState
                                glyph={<Ionicons name="documents-outline" size={40} color={c.textTertiary} />}
                                markColor={c.surfaceMuted}
                                title="저장된 템플릿이 없어요"
                                description="보드 탭에서 주를 세팅한 뒤 여기서 저장해 보세요."
                            />
                        ) : (
                            templates.map(t => (
                                <AppCard key={t.id} variant="flat" style={styles.shiftCard}>
                                    <View style={styles.shiftRow}>
                                        <View style={[styles.tplIcon, {backgroundColor: c.surfaceSky}]}>
                                            <Ionicons name="documents-outline" size={18} color={c.info} />
                                        </View>
                                        <View style={styles.flex}>
                                            <AppText variant="titleMd" numberOfLines={1}>{t.name}</AppText>
                                            <AppText variant="caption" tone="secondary">근무 {t.entryCount}개</AppText>
                                        </View>
                                        <AppButton
                                            label="적용"
                                            size="sm"
                                            fullWidth={false}
                                            disabled={templateBusy}
                                            onPress={() => applyTpl(t)}
                                        />
                                        <Pressable hitSlop={8} disabled={templateBusy} onPress={() => removeTpl(t)}>
                                            <Ionicons name="trash-outline" size={20} color={c.textTertiary} />
                                        </Pressable>
                                    </View>
                                </AppCard>
                            ))
                        )}
                    </View>
                )}
            </ScreenContainer>

            {/* ════════ 근무 추가/수정 바텀시트 ════════ */}
            <BottomSheet
                visible={sheetVisible}
                onClose={closeSheet}
                title={editingShift ? '근무 수정' : '근무 추가'}
                scrollable
                primary={{
                    label: saving ? '저장 중...' : editingShift ? '수정 저장' : '근무 추가',
                    onPress: handleSave,
                    loading: saving,
                }}
                secondary={
                    editingShift
                        ? {label: '삭제', variant: 'destructive', onPress: handleDelete}
                        : {label: '취소', variant: 'secondary', onPress: closeSheet}
                }>
                <View style={styles.sheetContent}>
                    {/* ── 날짜 표시 (읽기 전용, 편집 불가) ── */}
                    <View style={[styles.dateBadge, {backgroundColor: c.surfaceMuted}]}>
                        <Ionicons name="calendar-outline" size={16} color={c.brandPrimary} />
                        <View style={styles.flex}>
                            <AppText variant="titleMd" weight="700">
                                {formatDateLong(formDateIso)}
                            </AppText>
                            {editingShift && (
                                <AppText variant="caption" tone="tertiary">
                                    날짜 변경은 보드 탭에서 끌어서 이동하세요
                                </AppText>
                            )}
                        </View>
                    </View>

                    {/* ── 직원 선택 드롭다운 ── */}
                    <View>
                        <AppText variant="caption" tone="secondary" style={styles.fieldLabel}>
                            직원{editingShift ? ' (수정 시 변경 불가)' : ''}
                        </AppText>
                        <Pressable
                            disabled={!!editingShift}
                            onPress={() => setDropdownOpen(v => !v)}
                            style={[
                                styles.dropdownTrigger,
                                {
                                    borderColor: dropdownOpen ? c.brandPrimary : c.border,
                                    backgroundColor: c.background,
                                },
                                !!editingShift && styles.lockedField,
                            ]}>
                            <AppText
                                variant="titleMd"
                                style={{color: formEmployee ? c.textPrimary : c.textTertiary}}>
                                {selectedEmpName}
                            </AppText>
                            <Ionicons
                                name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                                size={18}
                                color={c.textTertiary}
                            />
                        </Pressable>
                        {dropdownOpen && (
                            <View style={[styles.dropdown, {borderColor: c.border, backgroundColor: c.background}]}>
                                {employees.map((emp, idx) => (
                                    <React.Fragment key={emp.id}>
                                        {idx > 0 && <View style={[styles.separator, {backgroundColor: c.border}]} />}
                                        <Pressable
                                            onPress={() => { setFormEmployee(emp.id); setDropdownOpen(false); }}
                                            style={[
                                                styles.dropdownItem,
                                                emp.id === formEmployee && {backgroundColor: c.brandPrimarySoft},
                                            ]}>
                                            <View style={[styles.empColorDot, {backgroundColor: employeeColorMap[emp.id] ?? COLORS.SODAM_ORANGE}]} />
                                            <AppText
                                                variant="titleMd"
                                                style={{color: emp.id === formEmployee ? c.brandPrimary : c.textPrimary}}>
                                                {emp.name}
                                            </AppText>
                                            {emp.id === formEmployee && (
                                                <Ionicons name="checkmark" size={16} color={c.brandPrimary} />
                                            )}
                                        </Pressable>
                                    </React.Fragment>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* ── 시간 입력 ── */}
                    <View style={styles.timeRow}>
                        <AppInput
                            label="시작"
                            value={formStart}
                            onChangeText={setFormStart}
                            placeholder="0900"
                            keyboardType="number-pad"
                            maxLength={4}
                            helper={TIME_DIGITS_HELPER}
                            containerStyle={styles.flex}
                        />
                        <AppInput
                            label="종료"
                            value={formEnd}
                            onChangeText={setFormEnd}
                            placeholder="1800"
                            keyboardType="number-pad"
                            maxLength={4}
                            helper={TIME_DIGITS_HELPER}
                            containerStyle={styles.flex}
                        />
                    </View>

                    {/* 야간 표시 */}
                    {isValidTimeDigits(formStart) &&
                    isValidTimeDigits(formEnd) &&
                    formStart !== formEnd &&
                    isOvernight(formStartHHmm, formEndHHmm) ? (
                        <View style={styles.hintRow}>
                            <Ionicons name="moon-outline" size={14} color={c.info} />
                            <AppText variant="caption" tone="secondary">
                                야간 근무 — {formEndHHmm}는 다음 날이에요.
                            </AppText>
                        </View>
                    ) : null}

                    <AppInput
                        label="메모 (선택)"
                        value={formMemo}
                        onChangeText={setFormMemo}
                        placeholder="마감, 교육, 특이사항 등"
                        multiline
                        multilineMinHeight={72}
                    />

                    {/* 경고 */}
                    {formWarnings.length > 0 && (
                        <View style={[styles.warnPanel, {backgroundColor: c.surfaceMuted, borderColor: c.warning}]}>
                            {formWarnings.map(w => (
                                <View key={w} style={styles.warnRow}>
                                    <Ionicons name="alert-circle-outline" size={13} color={c.warning} />
                                    <AppText variant="caption" tone="warning" style={styles.flex}>{w}</AppText>
                                </View>
                            ))}
                            <AppText variant="caption" tone="tertiary">저장은 가능해요. 확인 후 진행하세요.</AppText>
                        </View>
                    )}

                    {formError ? (
                        <AppText variant="caption" tone="error">{formError}</AppText>
                    ) : null}
                </View>
            </BottomSheet>
        </>
    );
}

// ── 보조 컴포넌트 ─────────────────────────────────────────────────────────────
function SummaryPill({value}: {value: string}) {
    const c = useThemeColors();
    return (
        <View style={[styles.pill, {backgroundColor: c.background}]}>
            <AppText variant="caption" weight="700" tone="secondary">{value}</AppText>
        </View>
    );
}

const styles = StyleSheet.create({
    // ─ 탭 ─
    tabBar: {flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg},
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
    },
    // ─ 공통 ─
    section: {gap: spacing.lg},
    flex: {flex: 1, minWidth: 0},
    rowSm: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    // ─ 캘린더 탭 ─
    calLoadingOverlay: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
    daySection: {gap: spacing.sm},
    daySectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
    },
    emptyDay: {
        borderWidth: 1,
        borderRadius: radius.lg,
        borderStyle: 'dashed',
        paddingVertical: spacing.xl,
    },
    shiftCard: {paddingVertical: spacing.md},
    shiftRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    empDot: {width: 10, height: 10, borderRadius: 5, flexShrink: 0},
    // ─ 보드 탭 ─
    weekHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: radius.lg,
        padding: spacing.md,
    },
    weekHeaderCenter: {flex: 1, alignItems: 'center', gap: spacing.xs},
    summaryPills: {flexDirection: 'row', gap: spacing.xs},
    pill: {
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
    },
    actionRow: {flexDirection: 'row', gap: spacing.sm},
    hintRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    // ─ 템플릿 탭 ─
    tplForm: {gap: spacing.md},
    tplIcon: {width: 36, height: 36, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center'},
    // ─ 바텀시트 ─
    sheetContent: {gap: spacing.md, paddingTop: spacing.sm},
    dateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        borderRadius: radius.lg,
        padding: spacing.md,
    },
    fieldLabel: {marginBottom: spacing.xs},
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    lockedField: {opacity: 0.5},
    dropdown: {
        borderWidth: 1,
        borderRadius: radius.lg,
        marginTop: spacing.xs,
        overflow: 'hidden',
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    separator: {height: 1},
    empColorDot: {width: 8, height: 8, borderRadius: 4},
    timeRow: {flexDirection: 'row', gap: spacing.md},
    warnPanel: {
        gap: spacing.xs,
        padding: spacing.sm,
        borderRadius: radius.md,
        borderWidth: 1,
    },
    warnRow: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs},
});
