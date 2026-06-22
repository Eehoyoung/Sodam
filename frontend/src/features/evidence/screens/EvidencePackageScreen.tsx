/* eslint-disable react-native/no-unused-styles -- styles built via useStyles() factory hook; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Share, StyleSheet, View} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
    SegmentedControl,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {
    EvidencePackage,
    fetchEvidencePackage,
    toIsoDate,
} from '../services/evidenceService';

type Route = RouteProp<
    {S: {storeId: number; employeeId: number; employeeName?: string}},
    'S'
>;

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** 기간 옵션 — 기본 최근 3개월. */
const RANGE_OPTIONS = ['최근 3개월', '최근 6개월', '최근 1년'] as const;
const RANGE_MONTHS = [3, 6, 12];

function rangeFor(months: number): {from: string; to: string} {
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - months);
    return {from: toIsoDate(from), to: toIsoDate(to)};
}

function weekdayLabel(day: string | null): string {
    switch (day) {
        case 'MONDAY':
            return '월요일';
        case 'TUESDAY':
            return '화요일';
        case 'WEDNESDAY':
            return '수요일';
        case 'THURSDAY':
            return '목요일';
        case 'FRIDAY':
            return '금요일';
        case 'SATURDAY':
            return '토요일';
        case 'SUNDAY':
            return '일요일';
        default:
            return '-';
    }
}

function scopeLabel(scope: string): string {
    return scope === 'EMPLOYEE_OVERRIDE' ? '직원 개별' : '매장 기본';
}

/**
 * 근무 증거 패키지 (L-NEW-05) — 임금체불 진정 대비 셀프 증거 묶음. 사장 전용.
 * 한 직원의 근태·급여·계약·시급이력을 한 기간 기준으로 묶어 보여준다(집계만).
 * 주민번호 등 PII 미노출. 면책 동반.
 */
const EvidencePackageScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<Route>();
    const {storeId, employeeId, employeeName} = route.params;

    const [rangeIdx, setRangeIdx] = useState(0); // 0 = 최근 3개월(기본)
    const range = useMemo(() => rangeFor(RANGE_MONTHS[rangeIdx]), [rangeIdx]);

    const [data, setData] = useState<EvidencePackage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            setData(await fetchEvidencePackage(storeId, employeeId, range.from, range.to));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [storeId, employeeId, range.from, range.to]);

    useEffect(() => {
        load();
    }, [load]);

    const shareSummary = useCallback(async () => {
        if (!data) {
            return;
        }
        const lines = [
            `[근무 증거 패키지] ${data.employeeName}`,
            `기간: ${data.from} ~ ${data.to}`,
            '',
            `■ 근태`,
            `· 출근일수: ${data.attendance.workedDays}일`,
            `· 총 근로시간: ${data.attendance.totalWorkedHours}시간`,
            '',
            `■ 급여(발급 명세 ${data.payroll.payslipCount}건)`,
            `· 지급총액: ${won(data.payroll.totalGrossWage)}`,
            `· 실수령액: ${won(data.payroll.totalNetWage)}`,
            '',
            `■ 근로계약`,
            data.contract.hasContract
                ? `· 시급 ${data.contract.hourlyWage ? won(data.contract.hourlyWage) : '-'} · 서명 ${
                      data.contract.signed ? '완료' : '미완료'
                  }`
                : '· 등록된 근로계약서 없음',
            '',
            data.disclaimer,
        ];
        try {
            await Share.share({message: lines.join('\n')});
        } catch {
            // 사용자가 공유를 취소한 경우 등 — 별도 처리 불필요
        }
    }, [data]);

    const styles = useStyles();

    return (
        <ScreenContainer
            scroll
            header={
                <AppHeader
                    title="근무 증거 패키지"
                    onBack={() => navigation.goBack()}
                />
            }
            footer={
                data && data.attendance.recordCount + data.payroll.payslipCount > 0 ? (
                    <AppButton label="요약 공유하기" variant="secondary" onPress={shareSummary} />
                ) : undefined
            }>
            <AppText variant="titleMd" style={styles.name}>
                {data?.employeeName ?? employeeName ?? '직원'}
            </AppText>
            <AppText variant="caption" tone="secondary" style={styles.sub}>
                임금체불 진정 등 분쟁에 대비한 근무 기록 묶음이에요.
            </AppText>

            <SegmentedControl
                options={[...RANGE_OPTIONS]}
                value={rangeIdx}
                onChange={setRangeIdx}
                style={styles.segment}
            />

            {loading ? (
                <LoadingState />
            ) : error ? (
                <ErrorState
                    title="자료를 불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            ) : !data ? (
                <EmptyState
                    title="집계할 기록이 없어요"
                    description="이 기간에 출근·급여·계약 기록이 있으면 증거 묶음을 만들어드려요."
                />
            ) : (
                <View style={styles.list}>
                    {/* 근태 요약 */}
                    <AppCard variant="flat">
                        <AppText variant="titleMd">근태 요약</AppText>
                        <Row label="출근일수" value={`${data.attendance.workedDays}일`} />
                        <Row label="기록 건수" value={`${data.attendance.recordCount}건`} />
                        <Row
                            label="총 근로시간"
                            value={`${data.attendance.totalWorkedHours}시간`}
                        />
                    </AppCard>

                    {/* 급여 요약 */}
                    <AppCard variant="flat">
                        <AppText variant="titleMd">급여 요약</AppText>
                        <Row label="발급 명세" value={`${data.payroll.payslipCount}건`} />
                        <Row label="지급총액(세전)" value={won(data.payroll.totalGrossWage)} />
                        <Row label="실수령액(세후)" value={won(data.payroll.totalNetWage)} />
                        <Row label="공제·세액" value={won(data.payroll.totalDeduction)} />
                    </AppCard>

                    {/* 근로계약 요약 */}
                    <AppCard variant="flat">
                        <View style={styles.cardHead}>
                            <AppText variant="titleMd">근로계약</AppText>
                            {data.contract.hasContract ? (
                                <AppBadge
                                    label={data.contract.signed ? '서명 완료' : '서명 미완료'}
                                    tone={data.contract.signed ? 'success' : 'warning'}
                                />
                            ) : null}
                        </View>
                        {data.contract.hasContract ? (
                            <>
                                <Row
                                    label="계약 시급"
                                    value={
                                        data.contract.hourlyWage
                                            ? won(data.contract.hourlyWage)
                                            : '-'
                                    }
                                />
                                <Row
                                    label="소정근로시간"
                                    value={
                                        data.contract.contractedHoursPerWeek
                                            ? `주 ${data.contract.contractedHoursPerWeek}시간`
                                            : '-'
                                    }
                                />
                                <Row
                                    label="주휴일"
                                    value={weekdayLabel(data.contract.weeklyHolidayDay)}
                                />
                                <Row
                                    label="계약 기간"
                                    value={`${data.contract.startDate ?? '-'} ~ ${
                                        data.contract.endDate ?? '정함 없음'
                                    }`}
                                />
                            </>
                        ) : (
                            <AppText variant="bodyMd" tone="secondary" style={styles.empty}>
                                등록된 근로계약서가 없어요.
                            </AppText>
                        )}
                    </AppCard>

                    {/* 시급 변경 이력 */}
                    <AppCard variant="flat">
                        <AppText variant="titleMd">시급 변경 이력</AppText>
                        {data.wageHistory.length === 0 ? (
                            <AppText variant="bodyMd" tone="secondary" style={styles.empty}>
                                기록된 시급 변경 이력이 없어요.
                            </AppText>
                        ) : (
                            data.wageHistory.map((w, idx) => (
                                <View key={`${w.scope}-${w.effectiveFrom}-${idx}`} style={styles.wageRow}>
                                    <View style={styles.wageMain}>
                                        <AppText variant="bodyMd">{won(w.hourlyWage)}</AppText>
                                        <AppText variant="caption" tone="tertiary">
                                            {w.effectiveFrom}부터 · {scopeLabel(w.scope)}
                                            {w.reason ? ` · ${w.reason}` : ''}
                                        </AppText>
                                    </View>
                                </View>
                            ))
                        )}
                    </AppCard>

                    <AppText variant="caption" tone="tertiary" style={styles.disclaimer}>
                        {data.disclaimer}
                    </AppText>
                </View>
            )}
        </ScreenContainer>
    );
};

const Row: React.FC<{label: string; value: string}> = ({label, value}) => {
    const styles = useStyles();
    return (
        <View style={styles.row}>
            <AppText variant="caption" tone="secondary">
                {label}
            </AppText>
            <AppText variant="bodyMd" numberOfLines={1} adjustsFontSizeToFit>
                {value}
            </AppText>
        </View>
    );
};

const useStyles = () =>
    useMemo(
        () =>
            StyleSheet.create({
                name: {marginTop: spacing.sm},
                sub: {marginTop: spacing.xs},
                segment: {marginTop: spacing.lg, marginBottom: spacing.lg},
                list: {gap: spacing.sm},
                row: {
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: spacing.xs,
                },
                cardHead: {
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                },
                wageRow: {marginTop: spacing.sm},
                wageMain: {gap: 2},
                empty: {marginTop: spacing.xs},
                disclaimer: {marginTop: spacing.md},
            }),
        [],
    );

export default EvidencePackageScreen;
