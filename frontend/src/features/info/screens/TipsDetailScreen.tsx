export type RootStackParamList = {
    TipsDetail: {tipId: number};
};

import React, {useEffect, useState} from 'react';
import {Share, StyleSheet, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Toast} from '../../../common/components';
import {
    AppBadge,
    AppHeader,
    AppText,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import tipsService from '../services/tipsService';

interface TipDetail {
    id: number;
    title: string;
    summary: string;
    content: string;
    date: string;
    author: string;
    tags: string[];
}

type TipsDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TipsDetail'>;

/**
 * 36 TipsDetail — 확정 시안.
 * 운영 팁 상세. GET /api/tip-info/{id}(tipsService.getTipById) 실API 연동.
 * BE(TipInfoResponseDto)에 관련 링크 필드가 없어 해당 UI는 제거.
 */
const TipsDetailScreen = () => {
    const navigation = useNavigation<TipsDetailScreenNavigationProp>();
    const route = useRoute();
    const {tipId} = route.params as {tipId: number};

    const [loading, setLoading] = useState(true);
    const [tip, setTip] = useState<TipDetail | null>(null);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

    useEffect(() => {
        let mounted = true;
        const fetchTip = async () => {
            try {
                setLoading(true);
                const detail = await tipsService.getTipById(String(tipId));
                if (!mounted) {
                    return;
                }
                setTip({
                    id: Number(detail.id),
                    title: detail.title,
                    summary: detail.summary,
                    content: detail.content,
                    date: new Date(detail.publishDate).toISOString().slice(0, 10),
                    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty-string author should fall back to default, so ?? would be wrong
                    author: detail.author || '소담 창업팀',
                    tags: detail.tags ?? [],
                });
            } catch (error) {
                if (!mounted) {
                    return;
                }
                setToastMessage('정보를 불러오는 중 오류가 생겼어요.');
                setToastType('error');
                setShowToast(true);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };
        fetchTip();
        return () => {
            mounted = false;
        };
    }, [tipId]);

    const toggleBookmark = () => {
        setIsBookmarked(!isBookmarked);
        setToastMessage(isBookmarked ? '북마크가 해제됐어요.' : '나중에 볼 수 있게 저장했어요.');
        setToastType('success');
        setShowToast(true);
    };

    const shareContent = async () => {
        try {
            if (!tip) {
                return;
            }
            await Share.share({message: `${tip.title}\n\n${tip.summary}\n\n소담 앱에서 더 보기`, title: tip.title});
        } catch (error) {
            setToastMessage('공유 중 오류가 생겼어요.');
            setToastType('error');
            setShowToast(true);
        }
    };

    const header = (
        <AppHeader
            title="운영 팁"
            onBack={() => navigation.goBack()}
            actions={[
                {label: isBookmarked ? '저장됨' : '저장', onPress: toggleBookmark},
                {label: '공유', onPress: shareContent},
            ]}
        />
    );

    if (loading) {
        return (
            <ScreenContainer header={header}>
                <LoadingState title="불러오는 중" description="정보를 불러오고 있어요" />
            </ScreenContainer>
        );
    }
    if (!tip) {
        return (
            <ScreenContainer header={header}>
                <ErrorState title="정보를 찾을 수 없어요" primary={{label: '이전 화면으로', onPress: () => navigation.goBack()}} />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer scroll header={header}>
            <AppText variant="caption" tone="brand" weight="800" style={styles.kicker}>운영 팁</AppText>
            <AppText variant="headingLg" style={styles.title}>{tip.title}</AppText>
            <AppText variant="bodyLg" tone="secondary" style={styles.summary}>{tip.summary}</AppText>
            <AppText variant="bodyMd" tone="tertiary" style={styles.meta}>{tip.author} · {tip.date}</AppText>

            <View style={styles.tags}>
                {tip.tags.map((t, i) => (
                    <AppBadge key={i} label={t} tone="info" />
                ))}
            </View>

            <AppText variant="bodyLg" style={styles.content}>{tip.content}</AppText>

            <Toast visible={showToast} message={toastMessage} type={toastType} onClose={() => setShowToast(false)} duration={3000} />
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    kicker: {marginTop: spacing.xs},
    title: {marginTop: spacing.sm},
    summary: {marginTop: spacing.sm},
    meta: {marginTop: spacing.md},
    tags: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.lg},
    content: {marginTop: spacing.xxl, lineHeight: 28},
});

export default TipsDetailScreen;
