import React from 'react';
import {StyleSheet, View, Text, TouchableOpacity, Image, ImageSourcePropType} from 'react-native';
import {colors, spacing} from '../../../common/styles/theme';

interface ProfileSectionProps {
    name: string;
    email: string;
    role: string;
    profileImage?: ImageSourcePropType;
    onEditPress?: () => void;
    onLogoutPress?: () => void;
    subscriptionStatus?: 'free' | 'premium' | 'business';
}

/**
 * 프로필 섹션 컴포넌트
 *
 * 마이페이지 상단에 표시되는 사용자 프로필 정보 섹션입니다.
 */
const ProfileSection: React.FC<ProfileSectionProps> = ({
                                                           name,
                                                           email,
                                                           role,
                                                           profileImage,
                                                           onEditPress,
                                                           onLogoutPress,
                                                           subscriptionStatus = 'free',
                                                       }) => {
    // 구독 상태에 따른 배지 텍스트 및 스타일
    const getBadgeInfo = () => {
        switch (subscriptionStatus) {
            case 'premium':
                return {
                    text: '프리미엄',
                    style: styles.premiumBadge,
                };
            case 'business':
                return {
                    text: '비즈니스',
                    style: styles.businessBadge,
                };
            default:
                return {
                    text: '무료',
                    style: styles.freeBadge,
                };
        }
    };

    const badgeInfo = getBadgeInfo();

    return (
        <View style={styles.container}>
            <View style={styles.profileHeader}>
                <View style={styles.profileImageContainer}>
                    {profileImage ? (
                        <Image source={profileImage} style={styles.profileImage}/>
                    ) : (
                        <View style={styles.defaultProfileImage}>
                            <Text style={styles.profileInitial}>{name.charAt(0)}</Text>
                        </View>
                    )}
                    <View style={[styles.badge, badgeInfo.style]}>
                        <Text style={styles.badgeText}>{badgeInfo.text}</Text>
                    </View>
                </View>

                <View style={styles.profileInfo}>
                    <Text style={styles.name}>{name}</Text>
                    <Text style={styles.email}>{email}</Text>
                    <Text style={styles.role}>{role}</Text>
                </View>
            </View>

            <View style={styles.actions}>
                {onEditPress && (
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={onEditPress}
                        accessibilityLabel="프로필 편집"
                        accessibilityHint="프로필 정보를 수정합니다"
                    >
                        <Text style={styles.editButtonText}>프로필 편집</Text>
                    </TouchableOpacity>
                )}

                {onLogoutPress && (
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={onLogoutPress}
                        accessibilityLabel="로그아웃"
                        accessibilityHint="계정에서 로그아웃합니다"
                    >
                        <Text style={styles.logoutButtonText}>로그아웃</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.lg,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    profileImageContainer: {
        position: 'relative',
        marginRight: spacing.md,
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    defaultProfileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileInitial: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    badge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs / 2,
        borderRadius: 10,
    },
    freeBadge: {
        backgroundColor: '#8E8E93',
    },
    premiumBadge: {
        backgroundColor: '#FFD700',
    },
    businessBadge: {
        backgroundColor: '#5856D6',
    },
    badgeText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    profileInfo: {
        flex: 1,
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    email: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    role: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.md,
    },
    editButton: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 8,
        flex: 1,
        marginRight: spacing.sm,
        alignItems: 'center',
    },
    editButtonText: {
        color: '#ffffff',
        fontWeight: '600',
    },
    logoutButton: {
        backgroundColor: '#f8f8f8',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 8,
        flex: 1,
        marginLeft: spacing.sm,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    logoutButtonText: {
        color: colors.text,
        fontWeight: '600',
    },
});

export default ProfileSection;
