import React from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppBadge, AppButton, AppText, Brandmark} from '../../../common/components/ds';
import {colors, gradient, radius, spacing} from '../../../theme/tokens';

interface UsageSelectionScreenProps {
    navigation: any;
}

type Role = 'owner' | 'employee' | 'personal';

/**
 * 01 RoleStart — 확정 시안.
 * 첫 화면은 마케팅 랜딩이 아니라 역할 선택 + 즉시 시작 경험.
 */
const UsageSelectionScreen: React.FC<UsageSelectionScreenProps> = ({navigation}) => {
    const insets = useSafeAreaInsets();
    // 역할 정보는 WelcomeMain/가입 흐름에서 사용 (현 라우팅 보존)
    const handleSelection = (_role: Role) => navigation.navigate('WelcomeMain');

    return (
        <LinearGradient colors={gradient.darkScreen} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.flex}>
            <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
                <ScrollView
                    contentContainerStyle={[styles.content, {paddingBottom: spacing.md}]}
                    showsVerticalScrollIndicator={false}>
                    <Brandmark size={56} />
                    <AppText variant="headingLg" tone="inverse" style={styles.title}>
                        {'오늘 가게 운영,\n여기서 끝내세요'}
                    </AppText>
                    <AppText variant="bodyMd" tone="inverse" style={styles.copy}>
                        출퇴근부터 급여명세까지 사장님과 직원이 같은 기록을 봅니다.
                    </AppText>

                    <View style={styles.cards}>
                        <Pressable onPress={() => handleSelection('owner')} style={styles.whiteCard}>
                            <View style={styles.rowBetween}>
                                <View style={styles.flexShrink}>
                                    <AppText variant="headingSm">사장님</AppText>
                                    <AppText variant="caption" tone="secondary" style={styles.cardSub}>
                                        미출근, 급여, 직원 초대
                                    </AppText>
                                </View>
                                <AppBadge label="추천" tone="warning" />
                            </View>
                        </Pressable>

                        <Pressable onPress={() => handleSelection('employee')} style={styles.glassCard}>
                            <AppText variant="headingSm" tone="inverse">직원</AppText>
                            <AppText variant="caption" tone="inverse" style={styles.glassSub}>
                                출근, 퇴근, 급여명세
                            </AppText>
                        </Pressable>

                        <Pressable onPress={() => handleSelection('personal')} style={styles.glassCard}>
                            <AppText variant="headingSm" tone="inverse">개인 기록</AppText>
                            <AppText variant="caption" tone="inverse" style={styles.glassSub}>
                                내 알바 시간 직접 기록
                            </AppText>
                        </Pressable>
                    </View>
                </ScrollView>

                <View style={[styles.cta, {paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm}]}>
                    <AppButton label="사장님으로 시작하기" onPress={() => handleSelection('owner')} />
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    flex: {flex: 1},
    content: {paddingHorizontal: spacing.lg, paddingTop: spacing.xl, flexGrow: 1},
    title: {marginTop: spacing.lg},
    copy: {marginTop: spacing.sm, opacity: 0.8},
    cards: {marginTop: spacing.xl, gap: spacing.sm + 2},
    whiteCard: {
        backgroundColor: colors.background,
        borderRadius: radius.xl,
        padding: spacing.lg,
    },
    glassCard: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: radius.xl,
        padding: spacing.lg,
    },
    rowBetween: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm},
    flexShrink: {flexShrink: 1},
    cardSub: {marginTop: 4},
    glassSub: {marginTop: 4, opacity: 0.82},
    cta: {paddingHorizontal: spacing.lg},
});

export default UsageSelectionScreen;
