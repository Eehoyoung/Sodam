import React from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {useAuth} from '../../../contexts/AuthContext';
import {useCurrentUser} from '../hooks/useAuthQueries';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppListItem,
    AppText,
    Brandmark,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';

/**
 * 43 Profile — 확정 시안.
 * 아바타 마크 + 계정 정보 리스트. (읽기 + 새로고침)
 */
const ProfileScreen: React.FC = () => {
    const {user} = useAuth();
    const currentUserQuery = useCurrentUser();

    const displayedUser = user ?? currentUserQuery.data ?? null;
    const loading = currentUserQuery.isLoading;

    const handleRefresh = async () => {
        try {
            await currentUserQuery.refetch();
        } catch (e: any) {
            Alert.alert('오류', e?.response?.data?.message || '프로필을 새로고침하는 중 오류가 발생했습니다.');
        }
    };

    if (loading && !displayedUser) {
        return (
            <ScreenContainer header={<AppHeader title="프로필" />}>
                <LoadingState title="프로필 불러오는 중" description="잠시만 기다려 주세요" />
            </ScreenContainer>
        );
    }

    if (!displayedUser) {
        return (
            <ScreenContainer header={<AppHeader title="프로필" />}>
                <View style={styles.center}>
                    <AppText variant="bodyLg" tone="secondary">로그인이 필요합니다.</AppText>
                </View>
            </ScreenContainer>
        );
    }

    const initial = (displayedUser.name || '소').charAt(0);

    return (
        <ScreenContainer scroll header={<AppHeader title="프로필" />}>
            <AppCard variant="flat" style={styles.avatarCard}>
                <Brandmark size={56} label={initial} />
                <AppText variant="caption" tone="tertiary" style={styles.avatarHint}>프로필 사진</AppText>
            </AppCard>

            <View style={styles.list}>
                <AppListItem title="ID" right={<AppText variant="titleMd">{String(displayedUser.id)}</AppText>} />
                <AppListItem title="이름" right={<AppText variant="titleMd">{displayedUser.name || '-'}</AppText>} />
                <AppListItem title="이메일" right={<AppText variant="titleMd">{displayedUser.email || '-'}</AppText>} />
                <AppListItem title="역할" right={<AppText variant="titleMd">{displayedUser.role ?? '-'}</AppText>} />
            </View>

            <AppButton
                label="새로고침"
                variant="secondary"
                loading={currentUserQuery.isFetching}
                loadingLabel="새로고침 중..."
                onPress={handleRefresh}
                style={styles.refresh}
            />
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
    avatarCard: {alignItems: 'center', paddingVertical: spacing.xl},
    avatarHint: {marginTop: spacing.sm},
    list: {marginTop: spacing.md, gap: spacing.sm},
    refresh: {marginTop: spacing.lg},
});

export default ProfileScreen;
