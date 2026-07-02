import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AppButton, AppCard, AppText} from '../../../common/components/ds';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {fetchStoreSetupProgress, StoreSetupProgress} from '../services/setupService';

interface StoreSetupCardProps {
    storeId: number;
    /** 다음 액션 키 → 해당 설정 화면으로 이동 (라우트·파라미터는 호출부가 책임). */
    onNavigate: (routeName: string, params: {storeId: number}) => void;
    /** 외부 새로고침 트리거 (pull-to-refresh 등). 값이 바뀌면 재조회. */
    refreshKey?: number;
}

/** 다음 액션 키 → 기존 설정 라우트 매핑. 매핑이 없으면 매장 상세로 보낸다(죽은 버튼 방지). */
const ROUTE_BY_KEY: Record<string, string> = {
    STORE_INFO: 'StoreEdit',
    WAGE: 'WageSettings',
    OPERATING_HOURS: 'StoreOperatingHours',
    LOCATION: 'StoreEdit',
    EMPLOYEE: 'StoreDetail',
};

/**
 * 매장 설정 완성도 게이지 + "지금 할 한 가지" 단일 CTA (GR-NEW-06).
 * 유령매장(설정 미완) 절벽을 줄이는 activation 카드. 100%면 완료 표시. 사장 전용.
 * 조회 실패 시 조용히 렌더 생략(대시보드 핵심 흐름을 막지 않음).
 */
export const StoreSetupCard: React.FC<StoreSetupCardProps> = ({storeId, onNavigate, refreshKey}) => {
    const c = useThemeColors();
    const [progress, setProgress] = useState<StoreSetupProgress | null>(null);

    const load = useCallback(async () => {
        try {
            setProgress(await fetchStoreSetupProgress(storeId));
        } catch {
            setProgress(null);
        }
    }, [storeId]);

    useEffect(() => {
        load();
    }, [load, refreshKey]);

    if (!progress) {
        return null;
    }

    const {completionRate, nextActionKey, nextActionLabel} = progress;
    const complete = completionRate >= 100;
    const fillWidth = `${Math.max(0, Math.min(100, completionRate))}%` as const;

    return (
        <AppCard variant="plain" style={styles.card}>
            <View style={styles.headerRow}>
                <View style={styles.titleWrap}>
                    <Ionicons
                        name={complete ? 'checkmark-circle' : 'rocket-outline'}
                        size={20}
                        color={complete ? c.success : c.brandPrimary}
                    />
                    <AppText variant="titleMd" style={styles.title}>
                        {complete ? '매장 설정 완료' : '매장 설정 완성도'}
                    </AppText>
                </View>
                <AppText variant="titleMd" style={{color: complete ? c.success : c.brandPrimary}}>
                    {`${completionRate}%`}
                </AppText>
            </View>

            <View style={[styles.track, {backgroundColor: c.surfaceMuted}]}>
                <View
                    style={[
                        styles.fill,
                        {width: fillWidth, backgroundColor: complete ? c.success : c.brandPrimary},
                    ]}
                />
            </View>

            {complete ? (
                <AppText variant="caption" tone="tertiary" style={styles.caption}>
                    출퇴근·급여를 바로 운영할 수 있어요.
                </AppText>
            ) : (
                <>
                    <AppText variant="caption" tone="secondary" style={styles.caption}>
                        {nextActionLabel
                            ? `다음 한 가지: ${nextActionLabel} 설정하기`
                            : '남은 설정을 마저 채워볼까요?'}
                    </AppText>
                    {nextActionKey ? (
                        <AppButton
                            label={`${nextActionLabel ?? '설정'} 하러 가기`}
                            size="md"
                            style={styles.cta}
                            onPress={() =>
                                onNavigate(ROUTE_BY_KEY[nextActionKey] ?? 'StoreDetail', {storeId})
                            }
                        />
                    ) : null}
                </>
            )}
        </AppCard>
    );
};

const styles = StyleSheet.create({
    card: {gap: spacing.sm},
    headerRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    titleWrap: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    title: {flexShrink: 1},
    track: {height: 8, borderRadius: radius.pill, overflow: 'hidden', marginTop: spacing.xs},
    fill: {height: 8, borderRadius: radius.pill},
    caption: {marginTop: spacing.xs},
    cta: {marginTop: spacing.sm},
});

export default StoreSetupCard;
