export type RootStackParamList = {
    TaxInfoDetail: {taxInfoId: number};
};

import React, {useEffect, useState} from 'react';
import {Linking, Share, StyleSheet, View} from 'react-native';
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

interface TaxInfoDetail {
    id: number;
    title: string;
    date: string;
    content: string;
    author: string;
    views: number;
    category: string;
    relatedLinks: Array<{title: string; url: string}>;
}

type TaxInfoDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TaxInfoDetail'>;

/**
 * 35 TaxInfoDetail — 확정 시안.
 * 세무 정보 상세. fetch/share/관련 링크 로직 보존.
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
        const fetchTaxInfo = async () => {
            try {
                setTimeout(() => {
                    setTaxInfo({
                        id: taxInfoId,
                        title: '2024년 세금신고 주요 변경사항 총정리',
                        date: '2024-05-14',
                        content:
                            '2024년 세금신고 주요 변경사항\n\n1. 종합소득세 신고 기간 변경\n- 기존: 5월 1일 ~ 5월 31일\n- 변경: 5월 1일 ~ 6월 15일 (15일 연장)\n\n2. 간이과세자 기준금액 상향\n- 기존: 연 매출 4,800만원 미만\n- 변경: 연 매출 8,000만원 미만\n\n3. 소상공인 세액공제 확대\n4. 전자세금계산서 의무발급 대상 확대\n5. 신용카드 매출 세액공제율 조정\n\n자세한 내용은 국세청 홈페이지를 참조주세요.',
                        author: '소담 세무팀',
                        views: 2345,
                        category: '세무 정보',
                        relatedLinks: [
                            {title: '국세청 홈페이지', url: 'https://www.nts.go.kr'},
                            {title: '종합소득세 신고 안내', url: 'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2318&cntntsId=7711'},
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
        fetchTaxInfo();
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

    const openLink = async (url: string) => {
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

            {taxInfo.relatedLinks.length > 0 ? (
                <>
                    <AppText variant="headingSm" style={styles.relatedTitle}>관련 링크</AppText>
                    <View style={styles.list}>
                        {taxInfo.relatedLinks.map((l, i) => (
                            <AppListItem key={i} title={l.title} right={<Ionicons name="open-outline" size={18} color={c.textTertiary} />} onPress={() => openLink(l.url)} />
                        ))}
                    </View>
                </>
            ) : null}

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
