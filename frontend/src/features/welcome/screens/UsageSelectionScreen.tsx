import React from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppBadge, AppButton, AppText, Brandmark} from '../../../common/components/ds';
import {gradient, radius, spacing} from '../../../theme/tokens';
import {OnboardingRole, roleToPurpose} from '../../../navigation/authFlow';

interface UsageSelectionScreenProps {
    navigation: any;
}

const UsageSelectionScreen: React.FC<UsageSelectionScreenProps> = ({navigation}) => {
    const insets = useSafeAreaInsets();

    const handleSelection = (selectedRole: OnboardingRole) => {
        navigation.navigate('WelcomeMain', {
            selectedRole,
            selectedPurpose: roleToPurpose(selectedRole),
        });
    };

    return (
        <LinearGradient colors={gradient.darkScreen} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.flex}>
            <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
                <ScrollView
                    contentContainerStyle={[styles.content, {paddingBottom: spacing.md}]}
                    showsVerticalScrollIndicator={false}>
                    <Brandmark size={56} />
                    <AppText variant="headingLg" tone="inverse" style={styles.title}>
                        {'어떤 방식으로\n소담을 시작할까요?'}
                    </AppText>
                    <AppText variant="bodyMd" tone="inverse" style={styles.copy}>
                        선택한 역할은 가입과 첫 홈 화면까지 이어집니다. 나중에 서버 계정 정보가 확인되면 서버 역할을 우선 적용합니다.
                    </AppText>

                    <View style={styles.cards}>
                        <Pressable onPress={() => handleSelection('owner')} style={styles.whiteCard}>
                            <View style={styles.rowBetween}>
                                <View style={styles.flexShrink}>
                                    <AppText variant="headingSm">사장님</AppText>
                                    <AppText variant="caption" tone="secondary" style={styles.cardSub}>
                                        매장, 직원, 급여를 함께 관리해요.
                                    </AppText>
                                </View>
                                <AppBadge label="추천" tone="warning" />
                            </View>
                        </Pressable>

                        <Pressable onPress={() => handleSelection('employee')} style={styles.glassCard}>
                            <AppText variant="headingSm" tone="inverse">직원</AppText>
                            <AppText variant="caption" tone="inverse" style={styles.glassSub}>
                                출퇴근, 휴가, 급여명세를 확인해요.
                            </AppText>
                        </Pressable>

                        <Pressable onPress={() => handleSelection('personal')} style={styles.glassCard}>
                            <AppText variant="headingSm" tone="inverse">개인</AppText>
                            <AppText variant="caption" tone="inverse" style={styles.glassSub}>
                                근무 시간과 급여 기록을 개인용으로 남겨요.
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
        backgroundColor: '#FFFFFF',
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
