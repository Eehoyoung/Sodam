export type RootStackParamList = {
    PolicyDetail: {policyId: number};
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
import policyService from '../services/policyService';
import {InfoChecklist, buildContentChecklist} from '../components/InfoChecklist';

interface PolicyDetail {
    id: number;
    title: string;
    date: string;
    content: string;
    department: string;
}

type PolicyDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PolicyDetail'>;

/**
 * 34 PolicyDetail — v3 아티팩트(sodam-v3-05-info.html) 반영.
 * 정책 정보 상세. GET /api/policy-info/{id}(policyService.getPolicyById) 실API 연동.
 * BE(PolicyInfoResponseDto)에 신청기간/지원대상/지원내용/신청링크 필드가 없어 해당 UI는 제거.
 * InfoChecklist(번호매김 체크리스트) 추가.
 */
interface Props {
    /** 개발용 시각 검증 전용 — API 호출을 건너뛰고 고정 데이터를 표시한다. */
    visualFixture?: PolicyDetail;
}

const PolicyDetailScreen: React.FC<Props> = ({visualFixture}) => {
    const navigation = useNavigation<PolicyDetailScreenNavigationProp>();
    const route = useRoute();
    const {policyId} = (route.params as {policyId: number} | undefined) ?? {policyId: 0};
    const c = useThemeColors();

    const [loading, setLoading] = useState(!visualFixture);
    const [policy, setPolicy] = useState<PolicyDetail | null>(visualFixture ?? null);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

    useEffect(() => {
        if (visualFixture) {
            return;
        }
        let mounted = true;
        const fetchPolicy = async () => {
            try {
                setLoading(true);
                const detail = await policyService.getPolicyById(String(policyId));
                if (!mounted) {
                    return;
                }
                setPolicy({
                    id: Number(detail.id),
                    title: detail.title,
                    date: new Date(detail.publishDate).toISOString().slice(0, 10),
                    content: detail.content,
                    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty-string author should fall back to default, so ?? would be wrong
                    department: detail.author || '소담 정책팀',
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
        fetchPolicy();
        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- visualFixture is a dev-only static prop, not expected to change
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
                message: `${policy.title}\n\n${policy.content.substring(0, 100)}...\n\n소담 앱에서 더 보기`,
                title: policy.title,
            });
        } catch (error) {
            setToastMessage('공유 중 오류가 생겼어요.');
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
            <AppText variant="caption" tone="brand" weight="800" style={styles.kicker}>{policy.department}</AppText>
            <AppText variant="headingLg" style={styles.title}>{policy.title}</AppText>
            <AppText variant="bodyMd" tone="tertiary" style={styles.meta}>등록일 {policy.date}</AppText>

            {/* v3 아티팩트 34 PolicyDetail의 .checklist — 원문 content를 3항목으로 요약 */}
            <InfoChecklist items={buildContentChecklist(policy.content)} style={styles.checklist} />

            <AppText variant="bodyLg" style={styles.content}>{policy.content}</AppText>

            <AppText variant="headingSm" style={styles.relatedTitle}>관련 정책</AppText>
            <View style={styles.list}>
                {relatedPolicies.map(item => (
                    <AppListItem key={item.id} title={item.title} right={<Ionicons name="chevron-forward" size={18} color={c.textTertiary} />} onPress={() => navigation.navigate('PolicyDetail', {policyId: item.id})} />
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

export default PolicyDetailScreen;
