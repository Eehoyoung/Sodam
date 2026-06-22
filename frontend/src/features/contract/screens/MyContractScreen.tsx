/**
 * S1 — 내 근로계약서 (직원).
 * 목록 → 상세(근로조건 카드) → 하단 CTA "내용 확인하고 서명" → ContractSignScreen.
 * 이미 서명한 계약은 서명 완료 배지를 보여주고 CTA 를 숨긴다.
 */
import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {NavigationProp, useFocusEffect, useNavigation} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {
    AppBadge,
    AppButton,
    AppHeader,
    AppListItem,
    AppText,
    CtaStack,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import contractService from '../services/contractService';
import {ContractTermsCard} from '../components/ContractTermsCard';
import type {LaborContract} from '../types';

type Phase = 'loading' | 'error' | 'ready';

const MyContractScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
    const c = useThemeColors();
    const [phase, setPhase] = useState<Phase>('loading');
    const [contracts, setContracts] = useState<LaborContract[]>([]);
    const [selected, setSelected] = useState<LaborContract | null>(null);

    const load = useCallback(async () => {
        setPhase('loading');
        try {
            const list = await contractService.getMyContracts();
            setContracts(list);
            setPhase('ready');
        } catch {
            setPhase('error');
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            load();
            // 목록으로 돌아올 때 서명 상태 갱신을 위해 선택 해제
            setSelected(null);
        }, [load]),
    );

    if (phase === 'loading') {
        return (
            <ScreenContainer header={<AppHeader title="내 근로계약서" onBack={() => navigation.goBack()} />}>
                <LoadingState title="불러오는 중" description="근로계약서를 불러오고 있어요." />
            </ScreenContainer>
        );
    }

    if (phase === 'error') {
        return (
            <ScreenContainer header={<AppHeader title="내 근로계약서" onBack={() => navigation.goBack()} />}>
                <ErrorState
                    title="불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            </ScreenContainer>
        );
    }

    // 상세 보기
    if (selected) {
        return (
            <ScreenContainer
                scroll
                header={<AppHeader title="근로계약서" onBack={() => setSelected(null)} />}
                footer={
                    selected.signed ? undefined : (
                        <CtaStack>
                            <AppButton
                                label="내용 확인하고 서명"
                                onPress={() =>
                                    navigation.navigate('ContractSign', {contractId: selected.id})
                                }
                            />
                        </CtaStack>
                    )
                }>
                <View style={styles.detailHead}>
                    <AppText variant="headingSm">근로조건을 확인해 주세요</AppText>
                    {selected.signed ? (
                        <AppBadge label="서명 완료" tone="success" />
                    ) : (
                        <AppBadge label="서명 대기" tone="warning" />
                    )}
                </View>
                <AppText variant="bodyMd" tone="secondary" style={styles.detailSub}>
                    아래 근로조건을 꼼꼼히 확인하신 뒤 서명해 주세요.
                </AppText>

                <ContractTermsCard contract={selected} />

                {selected.signed && selected.signedAt ? (
                    <AppText variant="caption" tone="tertiary" style={styles.signedNote}>
                        {formatSignedAt(selected.signedAt)}에 서명을 완료했어요.
                    </AppText>
                ) : null}
            </ScreenContainer>
        );
    }

    // 목록
    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="내 근로계약서" onBack={() => navigation.goBack()} />}>
            {contracts.length === 0 ? (
                <EmptyState
                    title="받은 근로계약서가 없어요"
                    description="사장님이 근로계약서를 보내면 여기에서 확인할 수 있어요."
                    glyph={<Ionicons name="document-text-outline" size={26} color={c.textInverse} />}
                />
            ) : (
                <View style={styles.list}>
                    {contracts.map(item => (
                        <AppListItem
                            key={String(item.id)}
                            title={item.workLocation ? `${item.workLocation} 근로계약서` : '근로계약서'}
                            subtitle={subtitleFor(item)}
                            right={
                                item.signed ? (
                                    <AppBadge label="서명 완료" tone="success" />
                                ) : (
                                    <AppBadge label="서명 대기" tone="warning" />
                                )
                            }
                            onPress={() => setSelected(item)}
                        />
                    ))}
                </View>
            )}
        </ScreenContainer>
    );
};

function subtitleFor(c: LaborContract): string {
    const wage = c.hourlyWage !== null ? `시급 ${c.hourlyWage.toLocaleString('ko-KR')}원` : '시급 미정';
    const start = c.startDate ? ` · ${c.startDate} 시작` : '';
    return `${wage}${start}`;
}

function formatSignedAt(iso: string): string {
    // BE LocalDateTime → 'YYYY-MM-DDTHH:mm:ss'. 날짜·시각만 사람이 읽기 쉽게.
    const [date, time] = iso.split('T');
    const hm = time ? time.slice(0, 5) : '';
    return hm ? `${date} ${hm}` : date;
}

const styles = StyleSheet.create({
    list: {gap: spacing.sm},
    detailHead: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    detailSub: {marginTop: spacing.sm, marginBottom: spacing.lg},
    signedNote: {marginTop: spacing.md},
});

export default MyContractScreen;
