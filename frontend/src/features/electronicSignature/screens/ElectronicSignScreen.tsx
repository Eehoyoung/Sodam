import React, {useCallback, useEffect, useState} from 'react';
import {AppState, RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import {useFocusEffect, useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    AppToast,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {spacing} from '../../../theme/tokens';
import {
    useElectronicSignature,
    useRefreshElectronicSignature,
    useRequestElectronicSignature,
} from '../hooks/useElectronicSignature';
import type {SignaturePartyStatus, SignatureSignerRole} from '../types';
import electronicSignatureService from '../services/electronicSignatureService';

const ElectronicSignScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'ElectronicSign'>>();
    const {envelopeId} = route.params;
    const query = useElectronicSignature(envelopeId);
    const request = useRequestElectronicSignature(envelopeId);
    const refresh = useRefreshElectronicSignature(envelopeId);
    const [downloading, setDownloading] = useState(false);

    const download = async (certificate: boolean) => {
        if (downloading) {
            return;
        }
        setDownloading(true);
        try {
            if (certificate) {
                await electronicSignatureService.downloadCompletionCertificate(envelopeId);
            } else {
                await electronicSignatureService.downloadDocument(envelopeId);
            }
            AppToast.success(certificate ? '완료증명서를 불러왔어요.' : '서명 대상 문서를 불러왔어요.');
        } catch {
            AppToast.error('문서를 불러오지 못했어요.');
        } finally {
            setDownloading(false);
        }
    };

    useFocusEffect(useCallback(() => {
        query.refetch();
        // The query observer object changes as data arrives; refetch itself is the stable dependency.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query.refetch]));

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextState => {
            if (nextState === 'active') {
                // 인증 앱 복귀는 신뢰 신호가 아니다. 서버 상태만 다시 읽는다.
                query.refetch();
            }
        });
        return () => subscription.remove();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query.refetch]);

    const envelope = query.data;
    const current = envelope?.parties.find(p => p.order === envelope.currentSigningOrder);
    const terminal = envelope && ['VERIFIED', 'DECLINED', 'EXPIRED', 'FAILED', 'CANCELLED', 'MANUAL_REISSUE_REQUIRED']
        .includes(envelope.status);
    const isViewerTurn = envelope?.viewerPartyOrder === envelope?.currentSigningOrder;
    const canRequest = isViewerTurn && (current?.status === 'WAITING' || current?.status === 'REQUEST_QUEUED');
    const canRefresh = isViewerTurn && current?.status === 'PENDING';

    if (query.isLoading) {
        return <ScreenContainer header={<AppHeader title="전자서명" onBack={() => navigation.goBack()} />}>
            <LoadingState title="전자서명 상태 확인 중" description="서명 순서와 문서 정보를 확인하고 있어요." />
        </ScreenContainer>;
    }
    if (query.isError || !envelope) {
        return <ScreenContainer header={<AppHeader title="전자서명" onBack={() => navigation.goBack()} />}>
            <ErrorState title="전자서명을 불러오지 못했어요" description="접근 권한과 네트워크를 확인해 주세요."
                primary={{label: '다시 시도', onPress: () => query.refetch()}} />
        </ScreenContainer>;
    }

    return (
        <ScreenContainer padded={false} header={<AppHeader title="전자서명" onBack={() => navigation.goBack()} />}>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}>
                <AppCard variant="navy" hero>
                    <AppText variant="caption" tone="inverse">{subjectLabel(envelope.subjectType)}</AppText>
                    <AppText variant="headingMd" tone="inverse" style={styles.cardTitle}>
                        {envelope.status === 'VERIFIED' ? '모든 서명이 검증됐어요' : '서명 순서를 확인해 주세요'}
                    </AppText>
                    <AppText variant="bodyMd" tone="inverse" style={styles.mutedInverse}>
                        문서 버전 {envelope.documentVersion} · {shortHash(envelope.documentSha256)}
                    </AppText>
                </AppCard>

                <View style={styles.section}>
                    <AppText variant="titleMd">서명 진행 상태</AppText>
                    {envelope.parties.map(party => (
                        <AppCard key={`${party.role}-${party.order}`} variant="plain">
                            <View style={styles.row}>
                                <View style={styles.flex}>
                                    <AppText variant="titleMd">{party.order}. {roleLabel(party.role)}</AppText>
                                    <AppText variant="caption" tone="secondary" style={styles.caption}>
                                        {party.verifiedAt ? `${formatDate(party.verifiedAt)} 검증 완료` : partyStatusLabel(party.status)}
                                    </AppText>
                                </View>
                                <AppBadge {...partyBadge(party.status)} />
                            </View>
                        </AppCard>
                    ))}
                </View>

                {!terminal ? (
                    <AppCard variant="warm">
                        <AppText variant="titleMd">현재 서명 안내</AppText>
                        <AppText variant="bodyMd" tone="secondary" style={styles.description}>
                            요청 후 인증 앱에서 문서 내용을 확인하고 서명해 주세요. 앱으로 돌아오면 서버 검증 결과를 다시 조회하며,
                            화면 복귀만으로 완료 처리하지 않습니다.
                        </AppText>
                        {canRequest ? (
                            <AppButton label="전자서명 요청 보내기" loading={request.isPending}
                                onPress={() => request.mutate()} style={styles.action} />
                        ) : canRefresh ? (
                            <AppButton label="서명 상태 다시 확인" variant="secondary" loading={refresh.isPending}
                                onPress={() => refresh.mutate()} style={styles.action} />
                        ) : isViewerTurn ? (
                            <AppBadge label="검증 결과 확인 중" tone="info" />
                        ) : (
                            <AppBadge label="앞 순서 서명 대기" tone="neutral" />
                        )}
                    </AppCard>
                ) : null}

                {envelope.status === 'MANUAL_REISSUE_REQUIRED' ? (
                    <AppCard variant="warm">
                        <AppText variant="titleMd">새 서명 요청이 필요해요</AppText>
                        <AppText variant="bodyMd" tone="secondary" style={styles.description}>
                            제한된 공급자 검증 횟수를 안전하게 초과하지 않도록 자동 재시도를 중단했습니다. 고객센터에 재발행을 요청해 주세요.
                        </AppText>
                    </AppCard>
                ) : null}

                <AppCard variant="plain">
                    <AppText variant="titleMd">전자문서 교부</AppText>
                    <AppText variant="bodyMd" tone="secondary" style={styles.description}>
                        원문과 완료증명서는 인가 확인 후 서버가 직접 전송하며 외부 만료 URL을 저장하지 않습니다.
                    </AppText>
                    <AppButton label="서명 대상 문서 확인" variant="secondary"
                        loading={downloading} onPress={() => download(false)} style={styles.action} />
                    {envelope.status === 'VERIFIED' ? (
                        <AppButton label="완료증명서 확인" loading={downloading}
                            onPress={() => download(true)} style={styles.action} />
                    ) : null}
                </AppCard>
            </ScrollView>
        </ScreenContainer>
    );
};

const roleLabel = (role: SignatureSignerRole) => ({
    OWNER: '사업주', MANAGER: '매니저', EMPLOYEE: '직원', GUARDIAN: '친권자·후견인',
}[role]);

const subjectLabel = (subject: string) => ({
    MANAGER_DELEGATION: '매니저 권한 위임장',
    LABOR_CONTRACT: '근로계약서',
    LABOR_CONTRACT_AMENDMENT: '근로조건 변경계약서',
    MINOR_GUARDIAN_CONSENT: '미성년자 친권자 동의서',
}[subject] ?? '전자문서');

const partyStatusLabel = (status: SignaturePartyStatus) => ({
    WAITING: '앞 순서 서명 대기', REQUEST_QUEUED: '서명 요청 준비 중', PENDING: '인증 앱 서명 대기',
    PROVIDER_COMPLETED: '공급자 완료 확인', VERIFY_QUEUED: '검증 대기', VERIFYING: '검증 중', VERIFIED: '검증 완료',
    DECLINED: '서명 거절', EXPIRED: '요청 만료', FAILED: '처리 실패', CANCELLED: '요청 취소',
    MANUAL_REISSUE_REQUIRED: '수동 재발행 필요',
}[status]);

const partyBadge = (status: SignaturePartyStatus): {label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'error'} => {
    if (status === 'VERIFIED') {return {label: '검증 완료', tone: 'success'};}
    if (['DECLINED', 'FAILED', 'CANCELLED'].includes(status)) {return {label: partyStatusLabel(status), tone: 'error'};}
    if (['EXPIRED', 'MANUAL_REISSUE_REQUIRED'].includes(status)) {return {label: partyStatusLabel(status), tone: 'warning'};}
    if (['PENDING', 'PROVIDER_COMPLETED', 'VERIFY_QUEUED', 'VERIFYING'].includes(status)) {
        return {label: '진행 중', tone: 'info'};
    }
    return {label: '대기', tone: 'neutral'};
};

const shortHash = (hash: string) => `SHA-256 ${hash.slice(0, 10)}…${hash.slice(-8)}`;
const formatDate = (value: string) => new Date(value).toLocaleString('ko-KR');

const styles = StyleSheet.create({
    content: {padding: spacing.xxl, paddingBottom: spacing.xxxl, gap: spacing.xxl},
    cardTitle: {marginTop: spacing.xs},
    mutedInverse: {marginTop: spacing.sm, opacity: 0.82},
    section: {gap: spacing.sm},
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    flex: {flex: 1},
    caption: {marginTop: 2},
    description: {marginTop: spacing.sm, lineHeight: 22},
    action: {marginTop: spacing.lg},
});

export default ElectronicSignScreen;
