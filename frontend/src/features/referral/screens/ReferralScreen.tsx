import React, {useEffect, useState} from 'react';
import {Pressable, Share, StyleSheet, View} from 'react-native';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppListItem,
    AppText,
    AppToast,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import api from '../../../common/utils/api';

interface MyCode {
    referralCode: string;
    shareText: string;
}
interface ReferralItem {
    id: number;
    refereeName: string;
    status: 'REGISTERED' | 'CONVERTED' | 'EXPIRED' | 'CANCELLED';
    registeredAt: string;
    convertedAt?: string;
}

/**
 * 44 Referral — 확정 시안.
 * 추천 코드 발급/공유 + 적용 이력. share/copy 로직 보존.
 */
const ReferralScreen: React.FC = () => {
    const [code, setCode] = useState<MyCode | null>(null);
    const [history, setHistory] = useState<ReferralItem[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const myCode = await api.get<MyCode>('/api/referrals/my-code');
                setCode(myCode.data);
            } catch (_) {/* ignore */}
            try {
                const h = await api.get<ReferralItem[]>('/api/referrals/my-history');
                setHistory((h.data) ?? []);
            } catch (_) {/* ignore */}
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
                    추천받은 사장님이 첫 정산을 끝내면 양쪽 모두 혜택을 드려요.
                </AppText>
            </AppCard>

            <AppCard variant="warm" style={styles.codeCard}>
                <AppText variant="caption" tone="secondary">내 추천 코드</AppText>
                <Pressable onPress={copyCode}>
                    <AppText variant="numericLg" tone="brand" style={styles.codeText}>{code?.referralCode ?? '...'}</AppText>
                </Pressable>
                <AppText variant="caption" tone="tertiary">코드를 눌러 복사하거나 아래 버튼으로 공유하세요.</AppText>
                <AppButton label="추천 링크 공유" size="md" onPress={share} style={styles.cta} />
            </AppCard>

            <AppText variant="titleMd" style={styles.sectionTitle}>추천한 친구</AppText>
            {history.length === 0 ? (
                <AppText variant="caption" tone="tertiary" style={styles.empty}>
                    아직 추천한 친구가 없어요. 코드를 공유해 보세요!
                </AppText>
            ) : (
                <View style={styles.list}>
                    {history.map(it => (
                        <AppListItem
                            key={it.id}
                            title={it.refereeName}
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
    codeCard: {marginTop: spacing.md, alignItems: 'center'},
    codeText: {letterSpacing: 4, marginVertical: spacing.sm},
    cta: {marginTop: spacing.md, alignSelf: 'stretch'},
    sectionTitle: {marginTop: spacing.xl, marginBottom: spacing.sm},
    empty: {paddingVertical: spacing.md, lineHeight: 20},
    list: {gap: spacing.sm},
});

export default ReferralScreen;
