import React, {useState} from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {useAuth} from '../../../contexts/AuthContext';
import {useNavigation} from '@react-navigation/native';
import {RootNavigationProp} from '../../../navigation/types';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppListItem,
    AppText,
    BottomSheet,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';

/**
 * 39 Settings + 75 Logout Confirm Sheet — 확정 시안.
 * 계정 요약 + 설정 리스트 + 로그아웃(바텀시트 확인). 로그아웃 로직 보존.
 */
const SettingsScreen: React.FC = () => {
    const {user, logout} = useAuth();
    const navigation = useNavigation<RootNavigationProp>();
    const [logoutSheet, setLogoutSheet] = useState(false);

    const confirmLogout = async () => {
        setLogoutSheet(false);
        try {
            await logout();
            navigation.reset({index: 0, routes: [{name: 'Welcome'}]});
        } catch (e) {
            Alert.alert('오류', '로그아웃 중 오류가 발생했습니다.');
        }
    };

    return (
        <ScreenContainer scroll header={<AppHeader title="설정" />}>
            <AppCard variant="flat">
                <View style={styles.accountRow}>
                    <View style={styles.flexShrink}>
                        <AppText variant="headingSm">{user?.name ?? '-'}</AppText>
                        <AppText variant="caption" tone="secondary" style={styles.email}>
                            {user?.email ?? '-'}
                        </AppText>
                    </View>
                    {user?.role ? <AppBadge label={String(user.role)} tone="info" /> : null}
                </View>
            </AppCard>

            <View style={styles.list}>
                <AppListItem title="프로필 보기" subtitle="이름, 이메일, 역할" right="›" onPress={() => (navigation as any).navigate('Profile')} />
                <AppListItem title="알림" subtitle="근태, 급여, 정정 요청" right="›" />
                <AppListItem title="화면 표시" subtitle="큰 글자와 다크 모드 준비" right="›" />
                <AppListItem title="고객지원" subtitle="문의와 공지" right="›" />
            </View>

            <AppButton label="로그아웃" variant="secondary" onPress={() => setLogoutSheet(true)} style={styles.logout} />

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
    accountRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm},
    flexShrink: {flexShrink: 1},
    email: {marginTop: 2},
    list: {marginTop: spacing.md, gap: spacing.sm},
    logout: {marginTop: spacing.lg},
});

export default SettingsScreen;
