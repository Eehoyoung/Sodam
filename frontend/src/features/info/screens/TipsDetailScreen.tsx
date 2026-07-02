export type RootStackParamList = {
    TipsDetail: {tipId: number};
};

import React, {useEffect, useState} from 'react';
import {Linking, Share, StyleSheet, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Toast} from '../../../common/components';
import {
    AppBadge,
    AppHeader,
    AppListItem,
    AppText,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';

interface TipDetail {
    id: number;
    title: string;
    summary: string;
    content: string;
    date: string;
    author: string;
    views: number;
    tags: string[];
    relatedLinks?: Array<{title: string; url: string}>;
}

type TipsDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TipsDetail'>;

/**
 * 36 TipsDetail — 확정 시안.
 * 운영 팁 상세. fetch/share/태그/관련 링크 로직 보존.
 */
const TipsDetailScreen = () => {
    const navigation = useNavigation<TipsDetailScreenNavigationProp>();
    const route = useRoute();
    const {tipId} = route.params as {tipId: number};
    const c = useThemeColors();

    const [loading, setLoading] = useState(true);
    const [tip, setTip] = useState<TipDetail | null>(null);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

    useEffect(() => {
        const fetchTip = async () => {
            try {
                setTimeout(() => {
                    setTip({
                        id: tipId,
                        title: '점포 위치 선정 시 체크해야 할 10가지 포인트',
                        summary: '상권 분석부터 유동인구까지 성공적인 입지 선정 가이드',
                        content:
                            '점포 위치 선정 시 체크 포인트\n\n1. 상권 분석 — 주변 업종 구성, 경쟁점 현황, 성장성을 종합 분석하세요.\n2. 유동인구 — 시간대·요일별, 특히 타겟 고객층의 유동인구를 확인하세요.\n3. 접근성 — 대중교통·주차·도보 접근성을 고려하세요.\n4. 가시성 — 간판과 매장이 잘 보이는 위치인지 확인하세요.\n5. 임대료와 권리금 — 매출 대비 적정한지 검토하세요.\n6. 주변 시설 — 주거/오피스/학교 등 고객층을 좌우합니다.\n7. 건물 상태 — 노후도·시설·관리 상태를 확인하세요.\n8. 규제 사항 — 영업/간판/시간 제한을 확인하세요.\n9. 미래 개발 계획 — 재개발·대형시설 계획을 알아보세요.\n10. 경쟁점 분석 — 차별화 전략을 세우세요.',
                        date: '2024-05-15',
                        author: '소담 창업팀',
                        views: 3456,
                        tags: ['창업', '입지선정', '상권분석', '점포'],
                        relatedLinks: [
                            {title: '상권분석 서비스 (소상공인시장진흥공단)', url: 'https://sg.sbiz.or.kr/godo/index.sg'},
                            {title: '점포 임대차 계약 가이드', url: 'https://www.mss.go.kr/site/smba/main.do'},
                        ],
                    });
                    setLoading(false);
                }, 1000);
            } catch (error) {
                setToastMessage('정보를 불러오는 중 오류가 생겼어요.');
                setToastType('error');
                setShowToast(true);
                setLoading(false);
            }
        };
        fetchTip();
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

    const openLink = async (url: string) => {
        // 보안: 서버 응답 변조 시 tel:/임의 스킴 실행 방지 — http(s) 만 허용
        if (!/^https?:\/\//i.test(url)) {
            setToastMessage('안전하지 않은 링크예요.');
            return;
        }
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                setToastMessage('링크를 열 수 없어요.');
                setToastType('error');
                setShowToast(true);
            }
        } catch (error) {
            setToastMessage('링크를 여는 중 오류가 생겼어요.');
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

            {tip.relatedLinks && tip.relatedLinks.length > 0 ? (
                <>
                    <AppText variant="headingSm" style={styles.relatedTitle}>관련 링크</AppText>
                    <View style={styles.list}>
                        {tip.relatedLinks.map((l, i) => (
                            <AppListItem key={i} title={l.title} right={<Ionicons name="open-outline" size={18} color={c.textTertiary} />} onPress={() => openLink(l.url)} />
                        ))}
                    </View>
                </>
            ) : null}

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
    relatedTitle: {marginTop: spacing.xxxl, marginBottom: spacing.md},
    list: {gap: spacing.sm},
});

export default TipsDetailScreen;
