import {AppToast, AppBadge, AppButton, AppHeader, AppListItem, AppText, ConfirmSheet, CtaStack, ScreenContainer} from '../../../common/components/ds';
import React from 'react';
import {StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useAuth} from '../../../contexts/AuthContext';
import {useNavigation} from '@react-navigation/native';
import {RootNavigationProp} from '../../../navigation/types';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';

/**
 * 39 Settings + 41 MyPage(구독/결제 항목) + 75 Logout Confirm — v3 토스식.
 * 계정 히어로 + 설정 리스트(라인 아이콘) + 하단 로그아웃 CTA. 로그아웃 로직 보존.
 * 75: SettingsScreen/AccountSettingsScreen 2곳에 중복 구현돼 있던 로그아웃 확인을
 *     전역 ConfirmSheet(AccountSettingsScreen 이 쓰던 패턴) 하나로 통일.
 *
 * 진입 경로(docs/260720 v3 감사 후속): MasterMyPageScreen/EmployeeMyPageRNScreen 상단
 * 설정 아이콘·ManagerMyPageScreen "설정" 항목에서 이 화면으로 진입한다. 이 화면 자체가
 * Profile(43)·Referral(44)·QnA(37)·AccountSettings(42)·Subscribe(31) 로의 허브 역할.
 */
const SettingsScreen: React.FC = () => {
    const {user, logout} = useAuth();
    const navigation = useNavigation<RootNavigationProp>();
    const c = useThemeColors();
    const isMaster = user?.role === 'MASTER';

    const confirmLogout = () => {
        ConfirmSheet.confirm({
            title: '로그아웃할까요?',
            description: '다시 로그인하면 모든 기록을 이어서 볼 수 있어요.',
            primary: {
                label: '로그아웃',
                onPress: async () => {
                    try {
                        await logout();
                        navigation.reset({index: 0, routes: [{name: 'SodamLanding'}]});
                    } catch (e) {
                        AppToast.error('로그아웃 중 오류가 생겼어요.');
                    }
                },
            },
            secondary: {label: '취소'},
        });
    };

    const initial = (user?.name ?? '?').slice(0, 1);

    const SettingItem = ({icon, title, subtitle, route, params}: {icon: string; title: string; subtitle: string; route: string; params?: Record<string, unknown>}) => (
        <AppListItem
            title={title}
            subtitle={subtitle}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 동적 routeName(string) 디스패치: 루트 네비게이터에서 중첩 라우트명을 런타임 결정
            onPress={() => (navigation as any).navigate(route, params)}
            right={<Ionicons name="chevron-forward" size={20} color={c.textTertiary} />}
            left={
                <View style={[styles.iconWrap, {backgroundColor: c.surfaceMuted}]}>
                    <Ionicons name={icon} size={20} color={c.textSecondary} />
                </View>
            }
        />
    );

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="설정" />}
            footer={
                <CtaStack>
                    <AppButton label="로그아웃" variant="secondary" onPress={confirmLogout} />
                </CtaStack>
            }>
            {/* 계정 히어로 */}
            <View style={styles.hero}>
                <View style={[styles.avatar, {backgroundColor: c.brandPrimarySoft}]}>
                    <AppText variant="headingSm" tone="brand">{initial}</AppText>
                </View>
                <View style={styles.heroText}>
                    <AppText variant="headingSm" numberOfLines={1}>{user?.name ?? '-'}</AppText>
                    <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.email}>
                        {user?.email ?? '-'}
                    </AppText>
                </View>
                {user?.role ? <AppBadge label={String(user.role)} tone="info" /> : null}
            </View>

            <View style={styles.list}>
                {isMaster ? (
                    <SettingItem icon="card-outline" title="구독/결제" subtitle="플랜 확인 · 결제 수단 관리" route="Subscribe" />
                ) : null}
                <SettingItem icon="person-outline" title="프로필 보기" subtitle="이름, 이메일, 역할" route="Profile" />
                {isMaster ? (
                    <SettingItem icon="gift-outline" title="친구 초대" subtitle="추천 코드로 무료 이용 혜택 받기" route="Referral" />
                ) : null}
                <SettingItem icon="notifications-outline" title="알림" subtitle="근태, 급여, 정정 요청" route="NotificationSettings" />
                <SettingItem icon="contrast-outline" title="화면 표시" subtitle="큰 글자와 다크 모드 준비" route="AccountSettings" />
                <SettingItem icon="help-circle-outline" title="고객지원" subtitle="문의와 공지" route="QnA" />
                <SettingItem
                    icon="document-text-outline"
                    title="이용약관"
                    subtitle="서비스 이용약관 보기"
                    route="LegalWebview"
                    params={{kind: 'terms'}}
                />
                <SettingItem
                    icon="shield-checkmark-outline"
                    title="개인정보 처리방침"
                    subtitle="개인정보 수집·이용 내역 보기"
                    route="LegalWebview"
                    params={{kind: 'privacy'}}
                />
            </View>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    hero: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xxl},
    avatar: {width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center'},
    heroText: {flex: 1, minWidth: 0},
    email: {marginTop: 2},
    iconWrap: {width: 40, height: 40, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center'},
    list: {gap: spacing.sm},
});

export default SettingsScreen;
