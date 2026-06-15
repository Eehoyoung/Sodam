import React from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AppBadge, AppButton, AppText, Brandmark} from '../../../common/components/ds';
import {gradient, radius, spacing} from '../../../theme/tokens';
import {OnboardingRole, roleToPurpose} from '../../../navigation/authFlow';

interface UsageSelectionScreenProps {
    navigation: any;
}

interface RoleOption {
    role: OnboardingRole;
    icon: string;
    title: string;
    sub: string;
    recommended?: boolean;
}

const ROLE_OPTIONS: RoleOption[] = [
    {role: 'owner', icon: 'storefront-outline', title: '사장님', sub: '매장·직원·급여를 함께 관리해요.', recommended: true},
    {role: 'employee', icon: 'person-outline', title: '직원', sub: '출퇴근·휴가·급여명세를 확인해요.'},
    {role: 'personal', icon: 'time-outline', title: '개인', sub: '근무 시간과 급여 기록을 직접 남겨요.'},
];

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
                    <AppText variant="display" tone="inverse" style={styles.title}>
                        {'어떻게\n시작할까요?'}
                    </AppText>
                    <AppText variant="bodyLg" tone="inverse" style={styles.copy}>
                        선택한 역할로 가입과 첫 화면까지 이어집니다.
                    </AppText>

                    <View style={styles.cards}>
                        {ROLE_OPTIONS.map(opt => (
                            <RoleRow key={opt.role} option={opt} onPress={() => handleSelection(opt.role)} />
                        ))}
                    </View>
                </ScrollView>

                <View style={[styles.cta, {paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm}]}>
                    <AppButton label="사장님으로 시작하기" onPress={() => handleSelection('owner')} />
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
};

const RoleRow: React.FC<{option: RoleOption; onPress: () => void}> = ({option, onPress}) => (
    <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${option.title} 역할로 시작`}
        style={({pressed}) => [styles.row, pressed && styles.rowPressed]}>
        <View style={styles.iconWrap}>
            <Ionicons name={option.icon} size={24} color="#FFFFFF" />
        </View>
        <View style={styles.rowBody}>
            <View style={styles.rowTitleLine}>
                <AppText variant="headingSm" tone="inverse" numberOfLines={1} style={styles.flexShrink}>
                    {option.title}
                </AppText>
                {option.recommended ? <AppBadge label="추천" tone="warning" /> : null}
            </View>
            <AppText variant="bodyMd" tone="inverse" numberOfLines={1} style={styles.rowSub}>
                {option.sub}
            </AppText>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
    </Pressable>
);

const styles = StyleSheet.create({
    flex: {flex: 1},
    content: {paddingHorizontal: spacing.xxl, paddingTop: spacing.xxl, flexGrow: 1},
    title: {marginTop: spacing.xl, letterSpacing: -1},
    copy: {marginTop: spacing.md, opacity: 0.82},
    cards: {marginTop: spacing.xxxl, gap: spacing.md},
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: radius.xl,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.lg,
    },
    rowPressed: {opacity: 0.85, transform: [{scale: 0.99}]},
    iconWrap: {
        width: 48,
        height: 48,
        borderRadius: radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    rowBody: {flex: 1, minWidth: 0},
    rowTitleLine: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    flexShrink: {flexShrink: 1},
    rowSub: {marginTop: 2, opacity: 0.78},
    cta: {paddingHorizontal: spacing.xxl},
});

export default UsageSelectionScreen;
