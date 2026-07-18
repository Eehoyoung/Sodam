import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useFocusEffect, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    AppToast,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {StoreNfcTag} from '../services/nfcTagService';
import {
    useActivateNfcTag,
    useDeactivateNfcTag,
    useNfcTags,
    useRegisterNfcTag,
} from '../hooks/useNfcTagQueries';

type NfcTagManagementRouteProp = RouteProp<HomeStackParamList, 'NfcTagManagement'>;

interface Props {
    route: NfcTagManagementRouteProp;
    navigation: NativeStackNavigationProp<HomeStackParamList>;
}

function extractErrorMessage(err: unknown, fallback: string): string {
    const message = (err as {response?: {data?: {message?: string}}})?.response?.data?.message;
    return message ?? fallback;
}

/**
 * NFC 태그 관리(사장 전용) — 매장에 부착한 물리 NFC 태그를 등록/조회/비활성화·재활성화.
 * "직원이 태그를 찍어 출퇴근하는" 검증 플로우와는 별개(대리출근 방지용 매장-태그 매핑 관리).
 * BE: NfcTagController (`/api/stores/{storeId}/nfc-tags`).
 */
export default function NfcTagManagementScreen({route, navigation}: Props) {
    const {storeId} = route.params;
    const c = useThemeColors();
    const [tagId, setTagId] = useState('');
    const [label, setLabel] = useState('');
    const [busyTagPk, setBusyTagPk] = useState<number | null>(null);

    const {data: tags = [], isLoading, isError, refetch} = useNfcTags(storeId);
    const registerMutation = useRegisterNfcTag(storeId);
    const deactivateMutation = useDeactivateNfcTag(storeId);
    const activateMutation = useActivateNfcTag(storeId);

    // 포커스마다 재조회 — 태그 등록/비활성화 후 다른 화면 갔다 돌아와도 최신 반영.
    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch]),
    );

    const handleRegister = async () => {
        const trimmedTagId = tagId.trim();
        if (!trimmedTagId) {
            AppToast.error('태그 ID를 입력해 주세요.');
            return;
        }
        try {
            await registerMutation.mutateAsync({tagId: trimmedTagId, label: label.trim() || undefined});
            AppToast.success('태그를 등록했어요.');
            setTagId('');
            setLabel('');
        } catch (err: unknown) {
            AppToast.error(extractErrorMessage(err, '태그 등록에 실패했어요. 다시 시도해 주세요.'));
        }
    };

    const handleToggle = async (tag: StoreNfcTag) => {
        setBusyTagPk(tag.id);
        try {
            if (tag.active) {
                await deactivateMutation.mutateAsync(tag.id);
                AppToast.show(`'${tag.label ?? tag.tagId}' 태그를 비활성화했어요.`);
            } else {
                await activateMutation.mutateAsync(tag.id);
                AppToast.success(`'${tag.label ?? tag.tagId}' 태그를 다시 활성화했어요.`);
            }
        } catch (err: unknown) {
            AppToast.error(extractErrorMessage(err, '처리에 실패했어요. 다시 시도해 주세요.'));
        } finally {
            setBusyTagPk(null);
        }
    };

    const header = <AppHeader title="NFC 태그 관리" onBack={() => navigation.goBack()} />;

    if (isLoading) {
        return (
            <ScreenContainer header={header}>
                <LoadingState title="태그 정보 로딩 중" description="잠시만 기다려 주세요" />
            </ScreenContainer>
        );
    }
    if (isError) {
        return (
            <ScreenContainer header={header}>
                <ErrorState
                    title="불러오지 못했어요"
                    description="NFC 태그 목록을 가져오지 못했어요."
                    primary={{label: '다시 시도', onPress: () => refetch()}}
                />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer scroll header={header}>
            <AppText variant="headingSm" style={styles.sectionTitle}>새 태그 등록</AppText>
            <AppCard variant="flat" style={styles.formCard}>
                <AppInput
                    label="태그 ID"
                    placeholder="태그에 인쇄된 고유 ID"
                    value={tagId}
                    onChangeText={setTagId}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                <AppInput
                    label="라벨 (선택)"
                    placeholder="예: 카운터, 뒷문"
                    value={label}
                    onChangeText={setLabel}
                />
                <AppButton
                    label="등록하기"
                    onPress={handleRegister}
                    loading={registerMutation.isPending}
                    style={styles.registerBtn}
                />
            </AppCard>

            <AppText variant="headingSm" style={styles.sectionTitleGap}>
                등록된 태그 {tags.length > 0 ? `${tags.length}개` : ''}
            </AppText>
            {tags.length === 0 ? (
                <EmptyState
                    glyph={<Ionicons name="pricetags-outline" size={40} color={c.textInverse} />}
                    title="아직 등록된 태그가 없어요"
                    description="매장에 부착한 NFC 태그의 ID를 등록해 두면 출근 검증에 사용돼요."
                />
            ) : (
                <View style={styles.list}>
                    {tags.map(tag => {
                        const busy = busyTagPk === tag.id;
                        return (
                            <AppCard key={tag.id} variant="flat" style={styles.tagCard}>
                                <View style={styles.tagRow}>
                                    <View style={styles.flex}>
                                        <AppText variant="titleMd" weight="700" numberOfLines={1}>
                                            {tag.label ? tag.label : tag.tagId}
                                        </AppText>
                                        <AppText variant="caption" tone="secondary" numberOfLines={1}>
                                            {tag.label ? `ID ${tag.tagId}` : '라벨 없음'}
                                        </AppText>
                                    </View>
                                    <AppBadge
                                        label={tag.active ? '활성' : '비활성'}
                                        tone={tag.active ? 'success' : 'neutral'}
                                    />
                                </View>
                                <AppButton
                                    label={tag.active ? '비활성화' : '재활성화'}
                                    variant={tag.active ? 'destructive' : 'secondary'}
                                    size="sm"
                                    fullWidth={false}
                                    loading={busy}
                                    disabled={busy}
                                    style={styles.toggleBtn}
                                    onPress={() => handleToggle(tag)}
                                />
                            </AppCard>
                        );
                    })}
                </View>
            )}
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    sectionTitle: {marginBottom: spacing.md},
    sectionTitleGap: {marginTop: spacing.xxl, marginBottom: spacing.md},
    formCard: {gap: spacing.md},
    registerBtn: {marginTop: spacing.xs},
    list: {gap: spacing.sm},
    tagCard: {gap: spacing.md},
    tagRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    flex: {flex: 1, minWidth: 0},
    toggleBtn: {alignSelf: 'flex-start', borderRadius: radius.lg},
});
