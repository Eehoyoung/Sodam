import React, {useEffect, useState} from 'react';
import {Share, StyleSheet, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Toast} from '../../../common/components';
import {
    AppCard,
    AppHeader,
    AppListItem,
    AppText,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import laborInfoService from '../services/laborInfoService';

export type RootStackParamList = {
    LaborInfoDetail: {infoId: string};
};

interface LaborInfoDetail {
    id: number;
    title: string;
    date: string;
    content: string;
    author: string;
    views: number;
    category: string;
}

type LaborInfoDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'LaborInfoDetail'>;

/**
 * 33 LaborInfoDetail — 확정 시안.
 * 노무 정보 상세. fetch/bookmark/share/Toast 로직 보존.
 */
const LaborInfoDetailScreen = () => {
    const navigation = useNavigation<LaborInfoDetailScreenNavigationProp>();
    const route = useRoute();
    const {infoId} = route.params as {infoId: string};

    const [loading, setLoading] = useState(true);
    const [laborInfo, setLaborInfo] = useState<LaborInfoDetail | null>(null);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

    useEffect(() => {
        const fetchLaborInfo = async () => {
            try {
                setLoading(true);
                const detail = await laborInfoService.getLaborInfoById(infoId);
                setLaborInfo({
                    id: parseInt(detail.id, 10),
                    title: detail.title,
                    date: new Date(detail.publishDate).toISOString().slice(0, 10),
                    content: detail.content,
                    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty-string author should fall back to default, so ?? would be wrong
                    author: detail.author || '소담 노무팀',
                    views: 0,
                    category: '노무 정보',
                });
            } catch (error) {
                setToastMessage('정보를 불러오는 중 오류가 생겼어요.');
                setToastType('error');
                setShowToast(true);
            } finally {
                setLoading(false);
            }
        };
        fetchLaborInfo().catch(() => {
            setToastMessage('정보를 불러오는 중 오류가 생겼어요.');
            setToastType('error');
            setShowToast(true);
            setLoading(false);
        });
    }, [infoId]);

    const toggleBookmark = () => {
        setIsBookmarked(!isBookmarked);
        setToastMessage(isBookmarked ? '북마크가 해제됐어요.' : '나중에 볼 수 있게 저장했어요.');
        setToastType('success');
        setShowToast(true);
    };

    const shareContent = async () => {
        try {
            if (!laborInfo) {
                return;
            }
            await Share.share({
                message: `${laborInfo.title}\n\n${laborInfo.content.substring(0, 100)}...\n\n소담 앱에서 더 보기`,
                title: laborInfo.title,
            });
        } catch (error) {
            setToastMessage('공유 중 오류가 생겼어요.');
            setToastType('error');
            setShowToast(true);
        }
    };

    const relatedInfos = [
        {id: 101, title: '최저임금 위반 시 처벌 규정 안내'},
        {id: 102, title: '급여 명세서 작성 가이드'},
        {id: 103, title: '소상공인 인건비 지원 정책'},
    ];

    const header = (
        <AppHeader
            title="노무 정보"
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
    if (!laborInfo) {
        return (
            <ScreenContainer header={header}>
                <ErrorState title="정보를 찾을 수 없어요" primary={{label: '이전 화면으로', onPress: () => navigation.goBack()}} />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer scroll header={header}>
            <AppCard variant="warm">
                <AppText variant="caption" tone="brand" weight="800">{laborInfo.category}</AppText>
                <AppText variant="headingMd" style={styles.title}>{laborInfo.title}</AppText>
                <AppText variant="caption" tone="tertiary" style={styles.meta}>
                    {laborInfo.author} · {laborInfo.date}
                </AppText>
            </AppCard>

            <AppText variant="bodyLg" style={styles.content}>{laborInfo.content}</AppText>

            <AppText variant="titleMd" style={styles.relatedTitle}>관련 정보</AppText>
            <View style={styles.list}>
                {relatedInfos.map(info => (
                    <AppListItem
                        key={info.id}
                        title={info.title}
                        right="›"
                        onPress={() => navigation.navigate('LaborInfoDetail', {infoId: info.id.toString()})}
                    />
                ))}
            </View>

            <Toast visible={showToast} message={toastMessage} type={toastType} onClose={() => setShowToast(false)} duration={3000} />
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    title: {marginTop: spacing.sm},
    meta: {marginTop: spacing.sm},
    content: {marginTop: spacing.lg},
    relatedTitle: {marginTop: spacing.xl, marginBottom: spacing.sm},
    list: {gap: spacing.sm},
});

export default LaborInfoDetailScreen;
