export type RootStackParamList = {
    TaxInfoDetail: {taxInfoId: number};
};

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
import taxInfoService from '../services/taxInfoService';

interface TaxInfoDetail {
    id: number;
    title: string;
    date: string;
    content: string;
    author: string;
    category: string;
}

type TaxInfoDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TaxInfoDetail'>;

/**
 * 35 TaxInfoDetail — 확정 시안.
 * 세무 정보 상세. GET /api/tax-info/{id}(taxInfoService.getTaxInfoById) 실API 연동.
 * BE(TaxInfoResponseDto)에 관련 링크 필드가 없어 해당 UI는 제거.
 */
const TaxInfoDetailScreen = () => {
    const navigation = useNavigation<TaxInfoDetailScreenNavigationProp>();
    const route = useRoute();
    const {taxInfoId} = route.params as {taxInfoId: number};
    const c = useThemeColors();
    const [loading, setLoading] = useState(true);
    const [taxInfo, setTaxInfo] = useState<TaxInfoDetail | null>(null);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

    useEffect(() => {
        let mounted = true;
        const fetchTaxInfo = async () => {
            try {
                setLoading(true);
                const detail = await taxInfoService.getTaxInfoById(String(taxInfoId));
                if (!mounted) {
                    return;
                }
                setTaxInfo({
                    id: Number(detail.id),
                    title: detail.title,
                    date: new Date(detail.publishDate).toISOString().slice(0, 10),
                    content: detail.content,
                    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty-string author should fall back to default, so ?? would be wrong
                    author: detail.author || '소담 세무팀',
                    category: '세무 정보',
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
        fetchTaxInfo();
        return () => {
            mounted = false;
        };
    }, [taxInfoId]);

    const toggleBookmark = () => {
        setIsBookmarked(!isBookmarked);
        setToastMessage(isBookmarked ? '북마크가 해제됐어요.' : '나중에 볼 수 있게 저장했어요.');
        setToastType('success');
        setShowToast(true);
    };

    const shareContent = async () => {
        try {
            if (!taxInfo) {
                return;
            }
            await Share.share({
                message: `${taxInfo.title}\n\n${taxInfo.content.substring(0, 100)}...\n\n소담 앱에서 더 보기`,
                title: taxInfo.title,
            });
        } catch (error) {
            setToastMessage('공유 중 오류가 생겼어요.');
            setToastType('error');
            setShowToast(true);
        }
    };

    const relatedTaxInfos = [
        {id: 101, title: '소상공인을 위한 부가가치세 절세 전략'},
        {id: 102, title: '개인사업자 종합소득세 신고 가이드'},
        {id: 103, title: '직원 급여 관련 세무 처리 주의사항'},
    ];

    const header = (
        <AppHeader
            title="세무 정보"
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
    if (!taxInfo) {
        return (
            <ScreenContainer header={header}>
                <ErrorState title="세무 정보를 찾을 수 없어요" primary={{label: '이전 화면으로', onPress: () => navigation.goBack()}} />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer scroll header={header}>
            <AppText variant="caption" tone="brand" weight="800" style={styles.kicker}>{taxInfo.category}</AppText>
            <AppText variant="headingLg" style={styles.title}>{taxInfo.title}</AppText>
            <AppText variant="bodyMd" tone="tertiary" style={styles.meta}>{taxInfo.author} · {taxInfo.date}</AppText>

            <AppText variant="bodyLg" style={styles.content}>{taxInfo.content}</AppText>

            <AppText variant="headingSm" style={styles.relatedTitle}>관련 세무 정보</AppText>
            <View style={styles.list}>
                {relatedTaxInfos.map(item => (
                    <AppListItem key={item.id} title={item.title} right={<Ionicons name="chevron-forward" size={18} color={c.textTertiary} />} onPress={() => navigation.navigate('TaxInfoDetail', {taxInfoId: item.id})} />
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
    content: {marginTop: spacing.xxl, lineHeight: 28},
    relatedTitle: {marginTop: spacing.xxxl, marginBottom: spacing.md},
    list: {gap: spacing.sm},
});

export default TaxInfoDetailScreen;
