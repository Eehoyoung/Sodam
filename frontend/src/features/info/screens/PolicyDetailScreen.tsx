export type RootStackParamList = {
    PolicyDetail: {policyId: number};
};

import React, {useEffect, useState} from 'react';
import {Linking, Share, StyleSheet, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Toast} from '../../../common/components';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppListItem,
    AppText,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';

interface PolicyDetail {
    id: number;
    title: string;
    date: string;
    content: string;
    department: string;
    applicationPeriod: string;
    eligibility: string;
    benefits: string;
    applicationLink: string;
}

type PolicyDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PolicyDetail'>;

/**
 * 34 PolicyDetail — 확정 시안.
 * 정책 정보 상세. fetch/bookmark/share/신청링크 로직 보존.
 */
const PolicyDetailScreen = () => {
    const navigation = useNavigation<PolicyDetailScreenNavigationProp>();
    const route = useRoute();
    const {policyId} = route.params as {policyId: number};

    const [loading, setLoading] = useState(true);
    const [policy, setPolicy] = useState<PolicyDetail | null>(null);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

    useEffect(() => {
        const fetchPolicy = async () => {
            try {
                setTimeout(() => {
                    setPolicy({
                        id: policyId,
                        title: '2024년 소상공인 디지털 전환 지원 사업 안내',
                        date: '2024-05-15',
                        content: '소상공인의 디지털 전환을 지원하기 위한 2024년 지원 사업을 안내드립니다. 본 사업은 소상공인의 경쟁력 강화와 디지털 역량 향상을 목표로 합니다.',
                        department: '중소벤처기업부',
                        applicationPeriod: '2024년 6월 1일 ~ 2024년 7월 31일',
                        eligibility: '연 매출 3억원 이하의 소상공인 (사업자등록증 보유 필수)',
                        benefits: '1. 디지털 전환 컨설팅 지원 (최대 100만원)\n2. 온라인 판로 구축 지원 (최대 300만원)\n3. 디지털 기기 도입 지원 (최대 200만원)\n4. 디지털 마케팅 교육 제공',
                        applicationLink: 'https://www.mss.go.kr/site/smba/main.do',
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
        fetchPolicy();
    }, [policyId]);

    const toggleBookmark = () => {
        setIsBookmarked(!isBookmarked);
        setToastMessage(isBookmarked ? '북마크가 해제됐어요.' : '나중에 볼 수 있게 저장했어요.');
        setToastType('success');
        setShowToast(true);
    };

    const shareContent = async () => {
        try {
            if (!policy) {
                return;
            }
            await Share.share({
                message: `${policy.title}\n\n${policy.content}\n\n신청 기간: ${policy.applicationPeriod}\n\n소담 앱에서 더 보기`,
                title: policy.title,
            });
        } catch (error) {
            setToastMessage('공유 중 오류가 생겼어요.');
            setToastType('error');
            setShowToast(true);
        }
    };

    const openApplicationLink = async () => {
        if (!policy?.applicationLink) {
            return;
        }
        try {
            const supported = await Linking.canOpenURL(policy.applicationLink);
            if (supported) {
                await Linking.openURL(policy.applicationLink);
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

    const relatedPolicies = [
        {id: 101, title: '소상공인 경영안정자금 지원 사업'},
        {id: 102, title: '온라인 판로 지원 사업'},
        {id: 103, title: '소상공인 재창업 지원 사업'},
    ];

    const header = (
        <AppHeader
            title="정책 정보"
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
    if (!policy) {
        return (
            <ScreenContainer header={header}>
                <ErrorState title="정책 정보를 찾을 수 없어요" primary={{label: '이전 화면으로', onPress: () => navigation.goBack()}} />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer scroll header={header}>
            <AppCard variant="warm">
                <AppText variant="caption" tone="brand" weight="800">{policy.department}</AppText>
                <AppText variant="headingMd" style={styles.title}>{policy.title}</AppText>
                <AppText variant="caption" tone="tertiary" style={styles.meta}>등록일 {policy.date}</AppText>
            </AppCard>

            <AppText variant="bodyLg" style={styles.content}>{policy.content}</AppText>

            <InfoSection title="신청 기간" body={policy.applicationPeriod} />
            <InfoSection title="지원 대상" body={policy.eligibility} />
            <InfoSection title="지원 내용" body={policy.benefits} />

            <AppButton label="신청하기" onPress={openApplicationLink} style={styles.apply} />

            <AppText variant="titleMd" style={styles.relatedTitle}>관련 정책</AppText>
            <View style={styles.list}>
                {relatedPolicies.map(item => (
                    <AppListItem key={item.id} title={item.title} right="›" onPress={() => navigation.navigate('PolicyDetail', {policyId: item.id})} />
                ))}
            </View>

            <Toast visible={showToast} message={toastMessage} type={toastType} onClose={() => setShowToast(false)} duration={3000} />
        </ScreenContainer>
    );
};

const InfoSection: React.FC<{title: string; body: string}> = ({title, body}) => (
    <AppCard variant="flat" style={styles.infoCard}>
        <AppText variant="titleMd">{title}</AppText>
        <AppText variant="bodyMd" tone="secondary" style={styles.infoBody}>{body}</AppText>
    </AppCard>
);

const styles = StyleSheet.create({
    title: {marginTop: spacing.sm},
    meta: {marginTop: spacing.sm},
    content: {marginTop: spacing.lg},
    infoCard: {marginTop: spacing.md},
    infoBody: {marginTop: spacing.xs},
    apply: {marginTop: spacing.lg},
    relatedTitle: {marginTop: spacing.xl, marginBottom: spacing.sm},
    list: {gap: spacing.sm},
});

export default PolicyDetailScreen;
