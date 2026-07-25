/* eslint-disable react-native/no-color-literals -- 다크 인트로 화면 고정 톤(Splash/KakaoLogin과 동일 계열), 반투명 오버레이는 토큰에 없음. */
import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AppButton, AppText, Brandmark} from '../../../common/components/ds';
import {gradient, spacing, v3Colors} from '../../../theme/tokens';
import {AuthStackParamList} from '../../../navigation/types';
import {AuthPurpose} from '../../../navigation/authFlow';

interface Props {
    navigation: NativeStackNavigationProp<AuthStackParamList, 'RoleStart'>;
}

interface RoleOption {
    id: AuthPurpose;
    label: string;
    hint: string;
    ctaLabel: string;
    recommended?: boolean;
}

const ROLE_OPTIONS: RoleOption[] = [
    {id: 'boss', label: '사장님', hint: '미출근, 급여, 직원 초대', ctaLabel: '사장님으로 시작하기', recommended: true},
    {id: 'employee', label: '직원', hint: '출근, 퇴근, 급여명세', ctaLabel: '직원으로 시작하기'},
    {id: 'personal', label: '개인 기록', hint: '내 알바 시간 직접 기록', ctaLabel: '개인 기록 시작하기'},
];

/**
 * 01 RoleStart — 신규 제작(docs/260720/260720_V3_링패스_적용_계획서.md §4.1, (d) 분류).
 * WelcomeMain "무료로 시작하기" → 이 화면에서 역할을 먼저 고른 뒤 → Signup 으로 role 프리셋만 넘긴다.
 * Splash/KakaoLogin과 동일한 gradient.darkScreen 다크 인트로 톤 — 회원가입 로직/검증은 SignupScreen 그대로.
 */
const RoleStartScreen: React.FC<Props> = ({navigation}) => {
    const [selected, setSelected] = useState<AuthPurpose>('boss');
    const selectedOption = ROLE_OPTIONS.find(option => option.id === selected) ?? ROLE_OPTIONS[0];

    const handleStart = () => {
        navigation.navigate('Signup', {selectedPurpose: selected});
    };

    return (
        <LinearGradient colors={gradient.darkScreen} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.flex}>
            <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
                <View style={styles.body}>
                    <Brandmark size={42} style={styles.mark} />
                    <AppText variant="headingMd" tone="inverse" style={styles.title}>
                        {'오늘 가게 운영,\n여기서 끝내세요'}
                    </AppText>
                    <AppText variant="bodyMd" tone="inverse" style={styles.copy}>
                        출퇴근부터 급여명세까지 사장님과 직원이 같은 기록을 봅니다.
                    </AppText>

                    <View style={styles.roleList}>
                        {ROLE_OPTIONS.map(option => {
                            const isSelected = option.id === selected;
                            return (
                                <Pressable
                                    key={option.id}
                                    onPress={() => setSelected(option.id)}
                                    accessibilityRole="radio"
                                    accessibilityState={{selected: isSelected}}
                                    accessibilityLabel={`${option.label} 역할 선택`}
                                    style={({pressed}) => [
                                        styles.roleCard,
                                        isSelected && styles.roleCardSelected,
                                        pressed && styles.rolePressed,
                                    ]}>
                                    <View style={styles.roleCardText}>
                                        <AppText variant="titleMd" tone="inverse" weight="700">
                                            {option.label}
                                        </AppText>
                                        <AppText variant="caption" tone="inverse" style={styles.roleHint}>
                                            {option.hint}
                                        </AppText>
                                    </View>
                                    {option.recommended ? (
                                        <View style={styles.recommendBadge}>
                                            <AppText variant="caption" weight="800" style={styles.recommendText}>
                                                추천
                                            </AppText>
                                        </View>
                                    ) : null}
                                </Pressable>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.footer}>
                    <AppButton label={selectedOption.ctaLabel} onPress={handleStart} testID="role-start-cta" />
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    flex: {flex: 1},
    body: {flex: 1, paddingHorizontal: spacing.xxl, paddingTop: spacing.xxl},
    mark: {marginBottom: spacing.lg},
    title: {letterSpacing: -0.6},
    copy: {marginTop: spacing.sm, opacity: 0.72, marginBottom: spacing.xl},
    roleList: {gap: spacing.sm},
    roleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(245,243,239,0.18)',
        backgroundColor: 'rgba(255,255,255,0.04)',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    roleCardSelected: {
        borderColor: '#FF7288',
        backgroundColor: 'rgba(255,255,255,0.09)',
    },
    rolePressed: {opacity: 0.85},
    roleCardText: {flexShrink: 1},
    roleHint: {marginTop: 2, opacity: 0.7},
    recommendBadge: {
        // 아티팩트 badge--coral: 카드 01은 device__screen--dark 이지만 --coral-soft/--coral
        // 변수 자체는 root(라이트) 값을 그대로 참조 — 다크 그라디언트 위 라이트 코랄 칩.
        backgroundColor: v3Colors.coralSoft,
        borderRadius: 999,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 4,
        marginLeft: spacing.sm,
    },
    recommendText: {color: v3Colors.coral},
    footer: {paddingHorizontal: spacing.xxl, paddingBottom: spacing.lg},
});

export default RoleStartScreen;
