/**
 * JobSeekerDetailScreen — [사장] 구직자 상세 (260711_작업통합.md Part 2 §7.4-2).
 *
 * 진입점: `JobSeekerListScreen` 카드 탭 → push 전환(바텀시트 아님, 2026-07-11 2차 확정).
 * 라우트 파라미터로 리스트 항목(`JobSeekerListItem`)을 그대로 전달받는다 — **추가 조회 API
 * 없음**(v1). 뒤로가기 시 리스트가 `useFocusEffect` refetch 로 정합성을 회복한다.
 *
 * 히어로는 그린 그라디언트(`recruit.gradient`, §7.0 다크배경 금지) + 화이트 텍스트.
 * 하단 CTA "채용 제안 보내기"는 `JobOfferComposeSheet`(§15.5 R-11)를 연다(Phase 6 실연결).
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
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AppBadge, AppHeader, AppText, ScreenContainer} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {radius, recruit, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {JobOfferComposeSheet} from '../components/JobOfferComposeSheet';
import {
    JOB_CATEGORY_LABELS,
    JOB_DAY_LABELS_KO,
    JOB_DAY_ORDER,
    JobAvailabilityDay,
    SEEKING_TYPE_LABELS,
} from '../types';
import {formatDistanceKm, formatTimeRange} from '../utils/formatAvailability';

const JobSeekerDetailScreen: React.FC = () => {
    const c = useThemeColors();
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'JobSeekerDetail'>>();
    const {storeId, seeker} = route.params;
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
                    <Pressable
                        testID="job-seeker-send-offer-button"
                        onPress={handleSendOffer}
                        accessibilityRole="button"
                        style={({pressed}) => [
                            styles.cta,
                            {backgroundColor: recruit.primary},
                            pressed ? styles.ctaPressed : null,
                        ]}>
                        <AppText variant="bodyLg" weight="700" style={{color: c.textInverse}}>
                            채용 제안 보내기
                        </AppText>
                    </Pressable>
                </View>
            }>
            <LinearGradient
                colors={recruit.gradient}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.hero}
                testID="job-seeker-hero-gradient">
                <AppText variant="headingSm" style={styles.heroName}>
                    {seeker.name}
                    {seeker.age !== null ? ` · ${seeker.age}세` : ''}
                </AppText>
                <AppText variant="bodyMd" style={styles.heroSub}>
                    소담 출퇴근 이력으로 인증된 구직자예요 · {formatDistanceKm(seeker.distanceMeters)}
                </AppText>
                <View style={styles.heroBadgeRow}>
                    {seeker.availableToday ? <HeroPill label="오늘 바로출근 가능" /> : null}
                    {seeker.seekingTypes.map(type => (
                        <HeroPill key={type} label={SEEKING_TYPE_LABELS[type]} />
                    ))}
                </View>
            </LinearGradient>

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
                                        borderColor: highlighted ? recruit.primary : c.border,
                                        backgroundColor: highlighted ? recruit.primarySoft : c.background,
                                    },
                                ]}>
                                <AppText
                                    variant="bodyMd"
                                    weight="700"
                                    style={{color: highlighted ? recruit.primary : c.textSecondary}}>
                                    {JOB_CATEGORY_LABELS[code]}
                                </AppText>
                            </View>
                        );
                    })}
                </View>
                {seeker.categoryMatched ? (
                    <AppText variant="caption" style={[styles.matchedNote, {color: recruit.primary}]}>
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
                            <Ionicons name="location-outline" size={16} color={recruit.primary} />
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

            <AppText variant="caption" tone="tertiary" style={styles.privacy}>
                연락처는 비공개예요 — 제안을 수락하면 초대코드로 매장에 합류할 수 있어요.
            </AppText>

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

const HeroPill: React.FC<{label: string}> = ({label}) => (
    <View style={styles.heroPill}>
        <AppText variant="caption" weight="700" style={styles.heroPillText}>{label}</AppText>
    </View>
);

const styles = StyleSheet.create({
    hero: {
        borderRadius: radius.xxl,
        padding: spacing.xl,
        marginBottom: spacing.lg,
        gap: spacing.xs,
    },
    heroName: {color: '#FFFFFF'},
    heroSub: {color: 'rgba(255,255,255,0.92)'},
    heroBadgeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm},
    heroPill: {
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 6,
        borderRadius: radius.pill,
        backgroundColor: 'rgba(255,255,255,0.22)',
    },
    heroPillText: {color: '#FFFFFF'},
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
    privacy: {lineHeight: 18, paddingHorizontal: 2, marginBottom: spacing.xxl},
    footer: {
        paddingHorizontal: spacing.xxl,
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
        borderTopWidth: 1,
    },
    cta: {
        minHeight: 52,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaPressed: {opacity: 0.94, transform: [{scale: 0.98}]},
});

export default JobSeekerDetailScreen;
