import React, {useEffect, useState} from 'react';
import {Share, StyleSheet, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Toast} from '../../../common/components';
import {
    AppHeader,
    AppListItem,
    AppText,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import laborInfoService from '../services/laborInfoService';
import {InfoChecklist, buildContentChecklist} from '../components/InfoChecklist';

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
 * 33 LaborInfoDetail — v3 아티팩트(sodam-v3-05-info.html) 반영.
 * 노무 정보 상세. fetch/bookmark/share/Toast 로직 보존 + InfoChecklist(번호매김 체크리스트) 추가.
 */
interface Props {
    /** 개발용 시각 검증 전용 — API 호출을 건너뛰고 고정 데이터를 표시한다. */
    visualFixture?: LaborInfoDetail;
}

const LaborInfoDetailScreen: React.FC<Props> = ({visualFixture}) => {
    const navigation = useNavigation<LaborInfoDetailScreenNavigationProp>();
    const route = useRoute();
    const {infoId} = (route.params as {infoId: string} | undefined) ?? {infoId: ''};
    const c = useThemeColors();

    const [loading, setLoading] = useState(!visualFixture);
    const [laborInfo, setLaborInfo] = useState<LaborInfoDetail | null>(visualFixture ?? null);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

    useEffect(() => {
        if (visualFixture) {
            return;
        }
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
        // eslint-disable-next-line react-hooks/exhaustive-deps -- visualFixture is a dev-only static prop, not expected to change
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
            <AppText variant="caption" tone="brand" weight="800" style={styles.kicker}>{laborInfo.category}</AppText>
            <AppText variant="headingLg" style={styles.title}>{laborInfo.title}</AppText>
            <AppText variant="bodyMd" tone="tertiary" style={styles.meta}>
                {laborInfo.author} · {laborInfo.date}
            </AppText>

            {/* v3 아티팩트 33 LaborInfoDetail의 .checklist — 원문 content를 3항목으로 요약 */}
            <InfoChecklist items={buildContentChecklist(laborInfo.content)} style={styles.checklist} />

            <AppText variant="bodyLg" style={styles.content}>{laborInfo.content}</AppText>

            <AppText variant="headingSm" style={styles.relatedTitle}>관련 정보</AppText>
            <View style={styles.list}>
                {relatedInfos.map(info => (
                    <AppListItem
                        key={info.id}
                        title={info.title}
                        right={<Ionicons name="chevron-forward" size={18} color={c.textTertiary} />}
                        onPress={() => navigation.navigate('LaborInfoDetail', {infoId: info.id.toString()})}
                    />
                ))}
            </View>

            <Toast visible={showToast} message={toastMessage} type={toastType} onClose={() => setShowToast(false)} duration={3000} />
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    kicker: {marginTop: spacing.xs},
    title: {marginTop: spacing.sm},
    meta: {marginTop: spacing.md},
    checklist: {marginTop: spacing.lg},
    content: {marginTop: spacing.xxl, lineHeight: 28},
    relatedTitle: {marginTop: spacing.xxxl, marginBottom: spacing.md},
    list: {gap: spacing.sm},
});

export default LaborInfoDetailScreen;
