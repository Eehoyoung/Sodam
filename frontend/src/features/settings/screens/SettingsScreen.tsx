import {AppToast, AppBadge, AppButton, AppHeader, AppListItem, AppText, BottomSheet, CtaStack, ScreenContainer} from '../../../common/components/ds';
import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useAuth} from '../../../contexts/AuthContext';
import {useNavigation} from '@react-navigation/native';
import {RootNavigationProp} from '../../../navigation/types';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';

/**
 * 39 Settings + 75 Logout Confirm Sheet — v3 토스식.
 * 계정 히어로 + 설정 리스트(라인 아이콘) + 하단 로그아웃 CTA. 로그아웃 로직 보존.
 */
const SettingsScreen: React.FC = () => {
    const {user, logout} = useAuth();
    const navigation = useNavigation<RootNavigationProp>();
    const c = useThemeColors();
    const [logoutSheet, setLogoutSheet] = useState(false);

    const confirmLogout = async () => {
        setLogoutSheet(false);
        try {
            await logout();
            navigation.reset({index: 0, routes: [{name: 'Welcome'}]});
        } catch (e) {
            AppToast.error('로그아웃 중 오류가 생겼어요.');
        }
    };

    const initial = (user?.name ?? '?').slice(0, 1);

    const SettingItem = ({icon, title, subtitle, route}: {icon: string; title: string; subtitle: string; route: string}) => (
        <AppListItem
            title={title}
            subtitle={subtitle}
            onPress={() => (navigation as any).navigate(route)}
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
                    <AppButton label="로그아웃" variant="secondary" onPress={() => setLogoutSheet(true)} />
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
                <SettingItem icon="person-outline" title="프로필 보기" subtitle="이름, 이메일, 역할" route="Profile" />
                <SettingItem icon="notifications-outline" title="알림" subtitle="근태, 급여, 정정 요청" route="NotificationSettings" />
                <SettingItem icon="contrast-outline" title="화면 표시" subtitle="큰 글자와 다크 모드 준비" route="AccountSettings" />
                <SettingItem icon="help-circle-outline" title="고객지원" subtitle="문의와 공지" route="QnA" />
            </View>

            <BottomSheet
                visible={logoutSheet}
                onClose={() => setLogoutSheet(false)}
                title="로그아웃할까요?"
                description="다시 로그인하면 모든 기록을 이어서 볼 수 있어요."
                primary={{label: '로그아웃', onPress: confirmLogout}}
                secondary={{label: '취소', onPress: () => setLogoutSheet(false)}}
            />
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
