import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, Share, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    AppToast,
    CtaStack,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
    SegmentedControl,
} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {useAuth} from '../../../contexts/AuthContext';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';
import storeService, {StoreSummaryDto} from '../../store/services/storeService';
import certificateService, {
    CERTIFICATE_TYPE_LABEL,
    CertificateType,
} from '../services/certificateService';

interface RouteParams {
    storeId?: number;
}

interface Props {
    route?: {params?: RouteParams};
}

const TYPES: CertificateType[] = ['EMPLOYMENT', 'CAREER'];
const TYPE_OPTIONS = TYPES.map(t => CERTIFICATE_TYPE_LABEL[t]);

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * 직원 본인 증명서 발급 (재직/경력).
 *
 * 급여명세서 다운로드(SalaryDetailScreen)와 동일한 후처리 패턴:
 * PDF 바이트 수신 확인 → PdfPreview 라우트로 미리보기 + Share 공유.
 * (이 프로젝트에는 네이티브 파일 저장 라이브러리가 없다.)
 *
 * v3 시안(sodam-v3-08-contract.html C9) 정렬: 하단 설명 카드에 증명서 종류 굵은 타이틀 추가.
 */
const MyCertificateScreen: React.FC<Props> = ({route}) => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const {user} = useAuth();
    const c = useThemeColors();
    const initialStoreId = route?.params?.storeId;

    const [stores, setStores] = useState<StoreSummaryDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
    const [typeIdx, setTypeIdx] = useState(0);
    const [issuing, setIssuing] = useState(false);

    const load = useCallback(async () => {
        if (user?.id === undefined) {
            setStores([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        setLoadError(false);
        try {
            // 퇴사한 매장도 경력증명서 대상이므로 비활성 관계까지 포함해 조회한다(WP-6).
            const list = await storeService.getEmployeeStores(user.id, true);
            setStores(list);
            // 1개면 자동 선택, route param 이 목록에 있으면 우선 선택.
            if (initialStoreId && list.some(s => s.id === initialStoreId)) {
                setSelectedStoreId(initialStoreId);
            } else if (list.length === 1) {
                setSelectedStoreId(list[0].id);
            }
        } catch {
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [user?.id, initialStoreId]);

    useEffect(() => {
        load();
    }, [load]);

    const type = TYPES[typeIdx];
    const typeLabel = CERTIFICATE_TYPE_LABEL[type];
    const selectedStore = stores.find(s => s.id === selectedStoreId) ?? null;

    const handleIssue = async () => {
        if (issuing) {
            return;
        }
        if (!selectedStoreId || !selectedStore) {
            AppToast.error('발급받을 매장을 먼저 선택해 주세요.');
            return;
        }
        setIssuing(true);
        try {
            const storeName = selectedStore.storeName;
            const issuedAt = todayIso();
            // PDF 를 실제로 저장하고 기기 기본 뷰어로 연다(H-4).
            const filePath = await certificateService.downloadMyCertificate(
                selectedStoreId, type, `${typeLabel}_${storeName}_${issuedAt}.pdf`,
            );
            AppToast.success(`${typeLabel}가 발급됐어요.`);
            const shareCertificate = () => {
                Share.share({
                    // 저장된 파일 자체를 공유한다 — 텍스트만 보내면 상대가 문서를 받지 못한다.
                    url: `file://${filePath}`,
                    message: `[소담] ${typeLabel}\n매장 ${storeName}\n발급일 ${issuedAt}`,
                }).catch(() => undefined);
            };
            // 명세서와 동일한 후처리: PdfPreview 미리보기 + 공유.
            navigation.navigate('PdfPreview', {
                title: `${typeLabel}_${storeName}.pdf`,
                sub: `발급일 ${issuedAt}`,
                filePath,
                onShare: shareCertificate,
            });
        } catch {
            AppToast.error('증명서 발급에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setIssuing(false);
        }
    };

    const header = <AppHeader title="증명서 발급" onBack={() => navigation.goBack()} />;

    if (loading) {
        return (
            <ScreenContainer header={header} testID="my-certificate-loading">
                <LoadingState title="불러오는 중" description="소속 매장을 확인하고 있어요" />
            </ScreenContainer>
        );
    }

    if (loadError) {
        return (
            <ScreenContainer header={header} testID="my-certificate-error">
                <ErrorState
                    title="불러오지 못했어요"
                    description="소속 매장 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            </ScreenContainer>
        );
    }

    if (stores.length === 0) {
        return (
            <ScreenContainer header={header} testID="my-certificate-empty">
                <EmptyState
                    glyph={<Ionicons name="business-outline" size={40} color={c.textTertiary} />}
                    markColor={c.surfaceMuted}
                    title="소속 매장이 없어요"
                    description="매장에 합류하면 재직·경력증명서를 발급받을 수 있어요."
                    primary={{
                        label: '입장 코드로 매장 합류하기',
                        onPress: () => navigation.navigate('JoinStoreByCode'),
                    }}
                />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer
            scroll
            header={header}
            testID="my-certificate-success"
            footer={
                <CtaStack bordered>
                    <AppButton
                        label="PDF 발급받기"
                        loading={issuing}
                        disabled={!selectedStoreId}
                        onPress={handleIssue}
                    />
                </CtaStack>
            }>
            <AppCard variant="flat" style={styles.notice}>
                <View style={styles.noticeRow}>
                    <Ionicons name="information-circle-outline" size={20} color={c.textSecondary} />
                    <AppText variant="caption" tone="secondary" style={styles.noticeText}>
                        주민등록번호는 포함되지 않아요. 매장명·재직기간·발급일이 담긴 PDF가
                        생성돼요.
                    </AppText>
                </View>
            </AppCard>

            <AppText variant="caption" tone="secondary" style={styles.label}>매장 선택</AppText>
            {stores.length === 1 ? (
                <AppCard variant="warm">
                    <AppText variant="titleMd" numberOfLines={1}>{stores[0].storeName}</AppText>
                    {stores[0].fullAddress ? (
                        <AppText variant="caption" tone="tertiary" numberOfLines={1} style={styles.storeSub}>
                            {stores[0].fullAddress}
                        </AppText>
                    ) : null}
                </AppCard>
            ) : (
                <View style={styles.chipRow}>
                    {stores.map(s => {
                        const on = s.id === selectedStoreId;
                        return (
                            <Pressable
                                key={s.id}
                                onPress={() => setSelectedStoreId(s.id)}
                                testID={`certificate-store-chip-${s.id}`}
                                style={[
                                    styles.chip,
                                    {borderColor: on ? c.brandPrimary : c.border},
                                    on && {backgroundColor: c.surfaceWarm},
                                ]}>
                                <AppText
                                    variant="bodyMd"
                                    weight={on ? '700' : '400'}
                                    numberOfLines={1}
                                    style={{color: on ? c.brandPrimary : c.textSecondary}}>
                                    {s.storeName}
                                </AppText>
                            </Pressable>
                        );
                    })}
                </View>
            )}

            <AppText variant="caption" tone="secondary" style={styles.label}>증명서 종류</AppText>
            <SegmentedControl options={TYPE_OPTIONS} value={typeIdx} onChange={setTypeIdx} />

            <AppCard variant="flat" style={styles.descCard}>
                <AppText variant="titleMd" weight="800" style={styles.descTitle}>{typeLabel}</AppText>
                <AppText variant="bodyMd" tone="secondary">
                    {type === 'EMPLOYMENT'
                        ? '현재 이 매장에서 일하고 있음을 증명해요.'
                        : '이 매장에서 일한 기간과 이력을 증명해요.'}
                </AppText>
            </AppCard>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    notice: {marginBottom: spacing.lg},
    noticeRow: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm},
    noticeText: {flex: 1, lineHeight: 18},
    label: {marginTop: spacing.md, marginBottom: spacing.xs, marginLeft: 2, fontWeight: '700'},
    storeSub: {marginTop: 2},
    chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    chip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 999,
        borderWidth: 1,
        maxWidth: '100%',
    },
    descCard: {marginTop: spacing.lg},
    descTitle: {marginBottom: spacing.xs},
});

export default MyCertificateScreen;
