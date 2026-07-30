import React, {useState} from 'react';
import {Image, Pressable, StyleSheet, View} from 'react-native';
import {useAuth} from '../../../contexts/AuthContext';
import {useCurrentUser, useDeleteAvatar, useUploadAvatar} from '../hooks/useAuthQueries';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppListItem,
    AppText,
    AppToast,
    Brandmark,
    ImagePickerSheet,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {pickReceiptImage as pickPhoto} from '../../purchase/utils/imagePicker';

/**
 * 43 Profile — 확정 시안.
 * 아바타 마크 + 계정 정보 리스트. (읽기 + 새로고침)
 * 아바타를 탭하면 77 ImagePickerSheet 가 열린다 — 카메라/앨범에서 고른 사진을 실제로
 * 업로드하고(POST /api/user/me/avatar), 기본 이미지로 되돌리는 삭제(DELETE)도 지원한다.
 */
const ProfileScreen: React.FC = () => {
    const {user} = useAuth();
    const currentUserQuery = useCurrentUser();
    const uploadAvatar = useUploadAvatar();
    const deleteAvatar = useDeleteAvatar();
    const [pickerVisible, setPickerVisible] = useState(false);

    const displayedUser = user ?? currentUserQuery.data ?? null;
    const loading = currentUserQuery.isLoading;

    const handleRefresh = async () => {
        try {
            await currentUserQuery.refetch();
        } catch (e: any) {
            AppToast.error(e?.response?.data?.message || '프로필을 새로고침하는 중 오류가 생겼어요.');
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

    const handlePickPhoto = async (source: 'camera' | 'album') => {
        setPickerVisible(false);
        const picked = await pickPhoto(source);
        if (!picked) {
            AppToast.show('사진 선택 기능은 아직 준비 중이에요.');
            return;
        }
        try {
            await uploadAvatar.mutateAsync(picked);
            AppToast.success('프로필 사진을 변경했어요.');
        } catch (e: any) {
            AppToast.error(e?.response?.data?.message || '프로필 사진 업로드에 실패했어요.');
        }
    };

    const handleResetPhoto = async () => {
        setPickerVisible(false);
        try {
            await deleteAvatar.mutateAsync();
            AppToast.success('기본 이미지로 되돌렸어요.');
        } catch (e: any) {
            AppToast.error(e?.response?.data?.message || '사진 삭제에 실패했어요.');
        }
    };

    return (
        <ScreenContainer scroll header={<AppHeader title="프로필" />}>
            <Pressable
                onPress={() => setPickerVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="프로필 사진 변경">
                <AppCard variant="flat" style={styles.avatarCard}>
                    {displayedUser.avatarUrl ? (
                        <Image source={{uri: displayedUser.avatarUrl}} style={styles.avatarImage} />
                    ) : (
                        <Brandmark size={56} label={initial} />
                    )}
                    <AppText variant="caption" tone="tertiary" style={styles.avatarHint}>프로필 사진 · 탭해서 변경</AppText>
                </AppCard>
            </Pressable>

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

            <ImagePickerSheet
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                onCamera={() => handlePickPhoto('camera')}
                onAlbum={() => handlePickPhoto('album')}
                onReset={displayedUser.avatarUrl ? handleResetPhoto : undefined}
            />
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
    avatarCard: {alignItems: 'center', paddingVertical: spacing.xl},
    avatarImage: {width: 56, height: 56, borderRadius: 28},
    avatarHint: {marginTop: spacing.sm},
    list: {marginTop: spacing.md, gap: spacing.sm},
    refresh: {marginTop: spacing.lg},
});

export default ProfileScreen;
