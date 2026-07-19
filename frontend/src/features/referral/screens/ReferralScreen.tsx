import React, {useEffect, useState} from 'react';
import {Pressable, Share, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppListItem,
    AppText,
    AppToast,
    HeroNumber,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import referralService, {MyCode, MyRewards, ReferralItem} from '../services/referralService';

/**
 * 44 Referral — 확정 시안.
 * 추천 코드 발급/공유 + 적용 이력. share/copy 로직 보존.
 */
const ReferralScreen: React.FC = () => {
    const c = useThemeColors();
    const [code, setCode] = useState<MyCode | null>(null);
    const [history, setHistory] = useState<ReferralItem[]>([]);
    const [rewards, setRewards] = useState<MyRewards | null>(null);

    useEffect(() => {
        (async () => {
            setCode(await referralService.getMyCode());
            setHistory(await referralService.getMyHistory());
            setRewards(await referralService.getMyRewards());
        })();
    }, []);

    const share = async () => {
        if (!code) {
            return;
        }
        try {
            await Share.share({message: code.shareText});
        } catch (_) {/* ignore */}
    };

    const copyCode = () => AppToast.show(`내 추천 코드: ${code?.referralCode ?? ''}`);

    return (
        <ScreenContainer scroll header={<AppHeader title="친구 추천" actions={[{label: '공유', onPress: share}]} />}>
            <AppCard variant="navy" hero>
                <AppText variant="headingSm" tone="inverse">사장님 친구에게 소담을 알려주세요</AppText>
                <AppText variant="bodyMd" tone="inverse" style={styles.heroSub}>
                    추천받은 사장님이 유료 플랜을 시작(첫 결제)하면 양쪽 모두 혜택을 드려요.
                </AppText>
            </AppCard>

            {rewards && (rewards.freeMonthsEarned > 0 || rewards.convertedCount > 0) ? (
                <AppCard variant="flat" style={styles.rewardCard}>
                    <HeroNumber
                        label="지금까지 적립한 무료 이용"
                        value={`무료 ${rewards.freeMonthsEarned}개월`}
                        sub={`초대한 사장님 ${rewards.convertedCount}명이 결제를 완료했어요`}
                        accent
                    />
                </AppCard>
            ) : null}

            <AppCard variant="warm" style={styles.codeCard}>
                <AppText variant="caption" tone="secondary">내 추천 코드</AppText>
                <Pressable onPress={copyCode} style={styles.codeWrap} accessibilityRole="button" accessibilityLabel="추천 코드 복사">
                    <AppText variant="display" tone="brand" weight="800" style={styles.codeText}>{code?.referralCode ?? '...'}</AppText>
                    <Ionicons name="copy-outline" size={18} color={c.textTertiary} />
                </Pressable>
                <AppText variant="caption" tone="tertiary" center>코드를 눌러 복사하거나 아래 버튼으로 공유하세요.</AppText>
                <AppButton label="추천 링크 공유" leftIcon={<Ionicons name="share-social-outline" size={18} color={c.textInverse} />} onPress={share} style={styles.cta} />
            </AppCard>

            <AppText variant="headingSm" style={styles.sectionTitle}>추천한 친구</AppText>
            {history.length === 0 ? (
                <AppText variant="bodyMd" tone="tertiary" style={styles.empty}>
                    아직 추천한 친구가 없어요. 코드를 공유해 보세요!
                </AppText>
            ) : (
                <View style={styles.list}>
                    {history.map(it => (
                        <AppListItem
                            key={it.id}
                            title={it.refereeName}
                            left={<Ionicons name="person-circle-outline" size={28} color={c.textTertiary} />}
                            right={<AppBadge label={statusLabel(it.status)} tone={it.status === 'CONVERTED' ? 'success' : 'neutral'} />}
                        />
                    ))}
                </View>
            )}
        </ScreenContainer>
    );
};

function statusLabel(s: string): string {
    if (s === 'CONVERTED') {
        return '결제 완료';
    }
    if (s === 'REGISTERED') {
        return '가입 완료';
    }
    if (s === 'EXPIRED') {
        return '만료';
    }
    return '취소';
}

const styles = StyleSheet.create({
    heroSub: {marginTop: spacing.xs, opacity: 0.82},
    rewardCard: {marginTop: spacing.lg},
    codeCard: {marginTop: spacing.lg, alignItems: 'center'},
    codeWrap: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.sm},
    codeText: {letterSpacing: 4},
    cta: {marginTop: spacing.lg, alignSelf: 'stretch'},
    sectionTitle: {marginTop: spacing.xxl, marginBottom: spacing.md},
    empty: {paddingVertical: spacing.md, lineHeight: 22},
    list: {gap: spacing.sm},
});

export default ReferralScreen;
