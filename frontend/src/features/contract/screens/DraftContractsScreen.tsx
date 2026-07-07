/**
 * 임시저장(미발송) 근로계약서 관리 — 사장 전용.
 * create()는 성공했는데 send()가 실패하거나 화면을 벗어나 방치된 초안을 나중에 다시 찾아
 * 발송하거나 삭제할 수 있게 한다(그렇지 않으면 영구히 안 보이는 고아 계약서로 남는다).
 */
import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {NavigationProp, RouteProp, useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    AppToast,
    ConfirmSheet,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import contractService, {contractErrorMessage} from '../services/contractService';
import type {LaborContract} from '../types';

type Route = RouteProp<{D: {storeId: number; employeeId: number; employeeName?: string}}, 'D'>;

function wageSummary(c: LaborContract): string {
    if (c.payType === 'SALARY') {
        return c.monthlyBaseSalary !== null ? `월급 ${c.monthlyBaseSalary.toLocaleString('ko-KR')}원` : '월급 미정';
    }
    return c.hourlyWage !== null ? `시급 ${c.hourlyWage.toLocaleString('ko-KR')}원` : '시급 미정';
}

function createdAtLabel(c: LaborContract): string {
    if (!c.createdAt) {
        return '';
    }
    const [date, time] = c.createdAt.split('T');
    return time ? `${date} ${time.slice(0, 5)} 작성` : `${date} 작성`;
}

const DraftContractsScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
    const route = useRoute<Route>();
    const c = useThemeColors();
    const {storeId, employeeId, employeeName} = route.params;

    const [items, setItems] = useState<LaborContract[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            setItems(await contractService.getDrafts(storeId, employeeId));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [storeId, employeeId]);

    useFocusEffect(useCallback(() => {
        load();
    }, [load]));

    const resend = async (draft: LaborContract) => {
        setBusyId(draft.id);
        try {
            await contractService.send(storeId, draft.id);
            AppToast.success('근로계약서를 발송했어요.');
            await load();
        } catch (e: unknown) {
            AppToast.error(contractErrorMessage(e, '발송에 실패했어요. 잠시 후 다시 시도해 주세요.'));
        } finally {
            setBusyId(null);
        }
    };

    const remove = (draft: LaborContract) => {
        ConfirmSheet.confirm({
            title: '임시저장 계약서를 삭제할까요?',
            description: '삭제하면 되돌릴 수 없어요. 발송된 적 없는 초안만 삭제할 수 있어요.',
            primary: {
                label: '삭제하기',
                destructive: true,
                onPress: async () => {
                    setBusyId(draft.id);
                    try {
                        await contractService.deleteDraft(storeId, draft.id);
                        AppToast.show('임시저장 계약서를 삭제했어요.');
                        await load();
                    } catch (e: unknown) {
                        AppToast.error(contractErrorMessage(e, '삭제에 실패했어요. 잠시 후 다시 시도해 주세요.'));
                    } finally {
                        setBusyId(null);
                    }
                },
            },
            secondary: {label: '취소'},
        });
    };

    const header = (
        <AppHeader
            title={employeeName ? `${employeeName}님 · 임시저장 계약서` : '임시저장 계약서'}
            onBack={() => navigation.goBack()}
        />
    );

    if (loading) {
        return (
            <ScreenContainer header={header}>
                <LoadingState title="불러오는 중" description="임시저장 계약서를 불러오고 있어요." />
            </ScreenContainer>
        );
    }
    if (error) {
        return (
            <ScreenContainer header={header}>
                <ErrorState title="불러오지 못했어요" description="잠시 후 다시 시도해 주세요." primary={{label: '다시 시도', onPress: load}} />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer scroll header={header}>
            <View style={styles.intro}>
                <AppText variant="bodyMd" tone="secondary">
                    아직 직원에게 발송되지 않은 계약서예요. 이어서 발송하거나 필요 없으면 삭제할 수 있어요.
                </AppText>
            </View>

            {items.length === 0 ? (
                <EmptyState
                    glyph={<Ionicons name="document-outline" size={40} color={c.textTertiary} />}
                    markColor={c.surfaceMuted}
                    title="임시저장된 계약서가 없어요"
                    description="발송에 실패했거나 저장만 하고 나간 계약서가 있으면 여기에 표시돼요."
                />
            ) : (
                <View style={styles.list}>
                    {items.map(item => {
                        const busy = busyId === item.id;
                        return (
                            <AppCard key={item.id} variant="flat" style={styles.card}>
                                <View style={styles.cardHead}>
                                    <View style={styles.flex}>
                                        <AppText variant="titleMd">{wageSummary(item)}</AppText>
                                        <AppText variant="caption" tone="secondary">{createdAtLabel(item)}</AppText>
                                    </View>
                                    <AppBadge label="미발송" tone="warning" />
                                </View>
                                <View style={styles.actions}>
                                    <AppButton
                                        label="삭제"
                                        variant="secondary"
                                        fullWidth={false}
                                        disabled={busy}
                                        style={styles.flex}
                                        onPress={() => remove(item)}
                                    />
                                    <AppButton
                                        label="발송하기"
                                        fullWidth={false}
                                        loading={busy}
                                        disabled={busy}
                                        style={styles.flex}
                                        onPress={() => resend(item)}
                                    />
                                </View>
                            </AppCard>
                        );
                    })}
                </View>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    intro: {marginBottom: spacing.lg},
    list: {gap: spacing.md},
    card: {gap: spacing.md, paddingVertical: spacing.md},
    cardHead: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    flex: {flex: 1, minWidth: 0},
    actions: {flexDirection: 'row', gap: spacing.sm},
});

export default DraftContractsScreen;
