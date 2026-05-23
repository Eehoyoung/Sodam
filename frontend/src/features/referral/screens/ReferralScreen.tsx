import React, {useEffect, useState} from 'react';
import {Alert, Pressable, Share, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {tokens} from '../../../theme/tokens';
import Card from '../../../common/components/data-display/Card';
import Button from '../../../common/components/form/Button';
import Badge from '../../../common/components/data-display/Badge';
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
 * 친구 추천 (PRD_OWNER A60·A61, PRD_EMPLOYEE E-A60·E-A61).
 *
 * 내 추천 코드 발급 + 공유 + 적용 이력.
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
                setHistory((h.data as ReferralItem[]) ?? []);
            } catch (_) {/* ignore */}
        })();
    }, []);

    const share = async () => {
        if (!code) return;
        try {
            await Share.share({message: code.shareText});
        } catch (_) {/* ignore */}
    };

    const copyCode = () => {
        // RN의 Clipboard 는 별도 SDK — fallback 으로 Alert
        Alert.alert('추천 코드', code?.referralCode ?? '');
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.heroWrap}>
                <LinearGradient
                    colors={tokens.gradient.brand}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.hero}
                >
                    <Text style={styles.heroEmoji}>🎁</Text>
                    <Text style={styles.heroTitle}>친구 추천하고{'\n'}1개월 무료 받기</Text>
                    <Text style={styles.heroSub}>친구가 첫 결제 시 양쪽 모두 1개월 무료!</Text>
                </LinearGradient>
            </View>

            <Card bordered style={styles.codeCard}>
                <Text style={styles.codeLabel}>내 추천 코드</Text>
                <Pressable onPress={copyCode}>
                    <Text style={styles.codeText}>{code?.referralCode ?? '...'}</Text>
                </Pressable>
                <Text style={styles.helper}>코드를 눌러 복사하거나 아래 버튼으로 공유하세요.</Text>
                <Button
                    title="카카오톡으로 공유"
                    onPress={share}
                    variant="primary"
                    size="md"
                    fullWidth
                    style={{marginTop: tokens.spacing.md}}
                />
            </Card>

            <Text style={styles.sectionTitle}>추천한 친구</Text>
            {history.length === 0 ? (
                <Text style={styles.empty}>
                    아직 추천한 친구가 없어요.{'\n'}코드를 공유해 보세요!
                </Text>
            ) : (
                history.map(it => (
                    <View key={it.id} style={styles.row}>
                        <Text style={styles.refName}>{it.refereeName}</Text>
                        <Badge
                            text={statusLabel(it.status)}
                            type={it.status === 'CONVERTED' ? 'success' : 'neutral'}
                        />
                    </View>
                ))
            )}
        </SafeAreaView>
    );
};

function statusLabel(s: string): string {
    if (s === 'CONVERTED') return '결제 완료';
    if (s === 'REGISTERED') return '가입 완료';
    if (s === 'EXPIRED') return '만료';
    return '취소';
}

const styles = StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: tokens.colors.background},
    heroWrap: {padding: tokens.spacing.lg},
    hero: {borderRadius: tokens.radius.xl, padding: tokens.spacing.xl, alignItems: 'center'},
    heroEmoji: {fontSize: 48, marginBottom: tokens.spacing.md},
    heroTitle: {
        color: tokens.colors.textInverse,
        fontSize: tokens.typography.sizes.xl,
        fontWeight: tokens.typography.weights.bold,
        textAlign: 'center',
        lineHeight: 30,
    },
    heroSub: {color: tokens.colors.textInverse, opacity: 0.9, marginTop: tokens.spacing.sm, textAlign: 'center'},
    codeCard: {marginHorizontal: tokens.spacing.lg, alignItems: 'center', padding: tokens.spacing.xl},
    codeLabel: {color: tokens.colors.textSecondary, fontSize: tokens.typography.sizes.sm},
    codeText: {
        fontSize: 32,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.brandPrimary,
        letterSpacing: 4,
        marginVertical: tokens.spacing.md,
        fontVariant: ['tabular-nums'],
    },
    helper: {color: tokens.colors.textTertiary, fontSize: tokens.typography.sizes.xs},
    sectionTitle: {
        marginHorizontal: tokens.spacing.lg,
        marginTop: tokens.spacing.xl,
        marginBottom: tokens.spacing.sm,
        fontSize: tokens.typography.sizes.md,
        fontWeight: tokens.typography.weights.semibold,
        color: tokens.colors.textSecondary,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: tokens.spacing.lg,
        paddingVertical: tokens.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: tokens.colors.divider,
    },
    refName: {fontSize: tokens.typography.sizes.md, color: tokens.colors.textPrimary},
    empty: {textAlign: 'center', padding: tokens.spacing.xl, color: tokens.colors.textTertiary, lineHeight: 22},
});

export default ReferralScreen;
