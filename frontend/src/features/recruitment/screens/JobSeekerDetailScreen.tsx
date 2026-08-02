/* eslint-disable react-native/no-color-literals -- 그라디언트 배지 위 흰색 텍스트/아이콘(다른 recruitment 화면과 동일 패턴) */
/**
 * JobSeekerDetailScreen — [사장] 구직자 상세 (260711_작업통합.md Part 2 §7.4-2).
 *
 * 진입점: `JobSeekerListScreen` 카드 탭 → push 전환(바텀시트 아님, 2026-07-11 2차 확정).
 * 라우트 파라미터로 리스트 항목(`JobSeekerListItem`)을 그대로 전달받는다 — **추가 조회 API
 * 없음**(v1). 뒤로가기 시 리스트가 `useFocusEffect` refetch 로 정합성을 회복한다.
 *
 * 히어로는 v3 시안(sodam-v3-07-recruitment.html R4)에 맞춰 흰 배경 + 회색 테두리(--border) spot
 * 카드로 구성하고, 체크마크 "인증" 배지 문구를 그대로 붙인다(§7.0 다크배경 금지 원칙은 유지).
 * 하단 CTA "채용 제안 보내기"는 `JobOfferComposeSheet`(§15.5 R-11)를 연다(Phase 6 실연결).
 * ⚠️ 2026-07-11 초안 주석은 히어로 테두리를 "recruit 그린"이라 잘못 인용했었다 — 실제 아티팩트는
 * 중립 회색 테두리 spot-card이고, "인증된 구직자"(.verified) 문구는 틸(`c.success`), "오늘 바로
 * 출근 가능" 배지는 코랄(`badge--coral`)이다. 2026-07-20 확정에 따라 recruit 그린 토큰은
 * 참조하지 않고 코랄/틸/앰버 3색만 사용한다.
 *
 * 2026-08-01 기존 화면 리디자인(recruitment-monetization-gamification-plan.md §6.2 "구직자 상세")은
 * "그라디언트 프로필 히어로"를 요구하지만, 이 화면은 위 "다크배경 금지 · 흰 배경 spot 카드" 결정이
 * `JobSeekerDetailScreen.test.tsx`("히어로가 흰 배경 + 회색 테두리 spot 카드로 렌더된다")에 배경색
 * `#FFFFFF`/테두리색 `#E7E7E2` 하드 검증으로 고정돼 있다 — 히어로 카드 자체의 배경은 그대로 두고,
 * "출퇴근 기록 기반 인증" 배지만 그라디언트 필(pill)로 승격해 패턴을 부분 적용했다(카드 프레임은
 * 유지, 배지만 그라디언트). "채용 제안 보내기" 시 출근권 1개가 소모된다는 안내도 함께 추가했다.
 *
 * ⚠️ 실 DTO 범위 한계: `JobSeekerListItemResponse` 는 희망지역을 문자열 배열(`desiredLocations`)
 * + 단일 최단거리(`distanceMeters`)로만 내려준다(지역별 개별 거리 없음). §7.4-2 시안은
 * "지역별 거리 표시"를 요구하지만 v1 DTO에 그 데이터가 없어(추가 API 호출 금지 원칙과 상충),
 * 이 화면은 지역 목록 아래 "가장 가까운 지역까지의 거리" 1개 값으로 대체 표기한다.
 */
import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {AppBadge, AppHeader, AppText, ScreenContainer} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {gradient, radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {JobOfferComposeSheet} from '../components/JobOfferComposeSheet';
import {
    JOB_CATEGORY_LABELS,
    JOB_DAY_LABELS_KO,
    JOB_DAY_ORDER,
    JobAvailabilityDay,
    JobSeekerListItem,
    SEEKING_TYPE_LABELS,
} from '../types';
import {formatDistanceKm, formatTimeRange} from '../utils/formatAvailability';

interface Props {
    /** 개발용 시각 검증 전용 — route.params 없이도 storeId/seeker를 지정한다. */
    visualFixture?: {storeId: number; seeker: JobSeekerListItem};
}

const JobSeekerDetailScreen: React.FC<Props> = ({visualFixture}) => {
    const c = useThemeColors();
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'JobSeekerDetail'>>();
    const {storeId, seeker} = visualFixture ?? route.params;
    const [offerSheetVisible, setOfferSheetVisible] = useState(false);

    const orderedAvailability = JOB_DAY_ORDER
        .map(day => seeker.availability.find(a => a.day === day))
        .filter((a): a is JobAvailabilityDay => !!a);

    const handleSendOffer = () => {
        setOfferSheetVisible(true);
    };

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="구직자 상세" onBack={() => navigation.goBack()} />}
            footer={
                <View style={[styles.footer, {backgroundColor: c.background, borderTopColor: c.divider}]}>
                    {/* 출근권 소모 안내(§6.2, Phase A 출근권 이코노미) — 제안 발송은 출근권 1개를 소모한다. */}
                    <AppText variant="caption" tone="secondary" style={styles.creditNotice}>
                        제안을 보내면 출근권 1개가 소모돼요.
                    </AppText>
                    <Pressable
                        testID="job-seeker-send-offer-button"
                        onPress={handleSendOffer}
                        accessibilityRole="button"
                        style={({pressed}) => [
                            styles.cta,
                            {backgroundColor: c.brandPrimary},
                            pressed ? styles.ctaPressed : null,
                        ]}>
                        <AppText variant="bodyLg" weight="700" style={{color: c.textInverse}}>
                            채용 제안 보내기
                        </AppText>
                    </Pressable>
                </View>
            }>
            <View
                style={[styles.hero, {backgroundColor: c.background, borderColor: c.border}]}
                testID="job-seeker-hero-card">
                <AppText variant="headingSm" weight="800">
                    {seeker.name}
                    {seeker.age !== null ? ` · ${seeker.age}세` : ''}
                </AppText>
                {/* "인증된 구직자" = 틸(v3 시안 .verified) */}
                <View style={styles.verifiedRow}>
                    <Ionicons name="checkmark-circle" size={14} color={c.success} />
                    <AppText variant="caption" weight="700" style={{color: c.success}}>
                        소담 출퇴근 이력으로 인증된 구직자예요 · {formatDistanceKm(seeker.distanceMeters)}
                    </AppText>
                </View>
                {/* "출퇴근 기록 기반 인증" 그라디언트 배지(§6.2) — 히어로 카드 프레임(흰 배경+회색
                    테두리)은 그대로 두고 배지만 그라디언트로 승격한다(파일 상단 주석 참고). */}
                <LinearGradient
                    colors={gradient.success}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.verifiedBadge}
                    testID="job-seeker-verified-badge">
                    <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
                    <AppText variant="caption" weight="800" style={styles.verifiedBadgeText}>
                        출퇴근 기록 기반 인증
                    </AppText>
                </LinearGradient>
                <View style={styles.heroBadgeRow}>
                    {/* "오늘 바로 출근 가능" = 코랄(v3 시안 badge--coral). AppBadge 는 별도 coral
                        톤이 없어 error 톤(v3 팔레트에서 error=coral #FF4D6D)을 그대로 재사용한다. */}
                    {seeker.availableToday ? <AppBadge label="오늘 바로 출근 가능" tone="error" /> : null}
                    {seeker.seekingTypes.map(type => (
                        <AppBadge key={type} label={SEEKING_TYPE_LABELS[type]} tone="neutral" />
                    ))}
                </View>
            </View>

            <Section title="인증 경력">
                {seeker.currentEmployment ? (
                    <AppText variant="bodyMd" tone="secondary">
                        {seeker.currentEmployment.storeName} · {seeker.currentEmployment.hireDate} ~ 현재
                    </AppText>
                ) : (
                    <AppBadge label="휴직중" tone="neutral" />
                )}
            </Section>

            <Section title="업종 분류">
                <View style={styles.chipWrap}>
                    {seeker.jobCategories.map(code => {
                        const highlighted = seeker.categoryMatched;
                        return (
                            <View
                                key={code}
                                style={[
                                    styles.categoryChip,
                                    {
                                        borderColor: highlighted ? c.brandPrimary : c.border,
                                        backgroundColor: highlighted ? c.brandPrimarySoft : c.background,
                                    },
                                ]}>
                                <AppText
                                    variant="bodyMd"
                                    weight="700"
                                    style={{color: highlighted ? c.brandPrimary : c.textSecondary}}>
                                    {JOB_CATEGORY_LABELS[code]}
                                </AppText>
                            </View>
                        );
                    })}
                </View>
                {seeker.categoryMatched ? (
                    <AppText variant="caption" style={[styles.matchedNote, {color: c.brandPrimary}]}>
                        우리 매장과 업종 일치
                    </AppText>
                ) : null}
            </Section>

            <Section title="요일별 근무가능 시간">
                {orderedAvailability.length === 0 ? (
                    <AppText variant="bodyMd" tone="secondary">등록된 근무가능 시간이 없어요.</AppText>
                ) : (
                    <View style={styles.availabilityList}>
                        {orderedAvailability.map(entry => (
                            <View key={entry.day} style={styles.availabilityRow}>
                                <AppText variant="bodyMd" weight="700" style={styles.availabilityDay}>
                                    {JOB_DAY_LABELS_KO[entry.day]}요일
                                </AppText>
                                <AppText variant="bodyMd" tone="secondary">
                                    {formatTimeRange(entry.startTime, entry.endTime)}
                                </AppText>
                            </View>
                        ))}
                    </View>
                )}
            </Section>

            <Section title="희망지역">
                <View style={styles.locationList}>
                    {seeker.desiredLocations.map((address, idx) => (
                        <View key={`${address}-${idx}`} style={styles.locationRow}>
                            <Ionicons name="location-outline" size={16} color={c.brandPrimary} />
                            <AppText variant="bodyMd" style={styles.locationText} numberOfLines={2}>
                                {address}
                            </AppText>
                        </View>
                    ))}
                </View>
                <AppText variant="caption" tone="secondary" style={styles.distanceNote}>
                    가장 가까운 희망지역까지 {formatDistanceKm(seeker.distanceMeters)}
                </AppText>
            </Section>

            <View style={[styles.privacyBox, {backgroundColor: c.surfaceMuted}]}>
                <AppText variant="caption" tone="secondary" style={styles.privacyText}>
                    연락처는 비공개예요 — 제안을 수락하면 초대코드로 매장에 합류할 수 있어요.
                </AppText>
            </View>

            <JobOfferComposeSheet
                visible={offerSheetVisible}
                onClose={() => setOfferSheetVisible(false)}
                storeId={storeId}
                seeker={seeker}
            />
        </ScreenContainer>
    );
};

const Section: React.FC<{title: string; children: React.ReactNode}> = ({title, children}) => (
    <View style={styles.section}>
        <AppText variant="titleMd" weight="700" style={styles.sectionTitle}>{title}</AppText>
        {children}
    </View>
);

const styles = StyleSheet.create({
    hero: {
        borderRadius: radius.xxl,
        borderWidth: 1.5,
        padding: spacing.xl,
        marginBottom: spacing.lg,
        gap: spacing.xs,
    },
    verifiedRow: {flexDirection: 'row', alignItems: 'center', gap: 4},
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 4,
        marginTop: spacing.xs,
    },
    verifiedBadgeText: {color: '#FFFFFF'},
    heroBadgeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm},
    section: {marginBottom: spacing.lg, gap: spacing.xs},
    sectionTitle: {marginBottom: spacing.xs},
    chipWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    categoryChip: {
        borderWidth: 1,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
    },
    matchedNote: {marginTop: spacing.xs},
    availabilityList: {gap: spacing.sm},
    availabilityRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    availabilityDay: {minWidth: 56},
    locationList: {gap: spacing.sm},
    locationRow: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm},
    locationText: {flex: 1, minWidth: 0},
    distanceNote: {marginTop: spacing.xs},
    privacyBox: {borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.xxl},
    privacyText: {lineHeight: 18},
    footer: {
        paddingHorizontal: spacing.xxl,
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
        borderTopWidth: 1,
    },
    creditNotice: {textAlign: 'center', marginBottom: spacing.sm},
    cta: {
        minHeight: 52,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaPressed: {opacity: 0.94, transform: [{scale: 0.98}]},
});

export default JobSeekerDetailScreen;
