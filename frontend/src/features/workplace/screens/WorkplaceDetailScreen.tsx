import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useRoute} from '@react-navigation/native';
import {
    AppCard,
    AppHeader,
    AppText,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {Workplace} from '../types';
import {getWorkplaceById} from '../services';
import {WorkplaceDetailRouteProp} from '../../../navigation/types';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';

/**
 * 16 WorkplaceDetail — 확정 시안.
 * 근무지 상세. getWorkplaceById 로직 보존.
 */
export const WorkplaceDetailScreen: React.FC = () => {
    const route = useRoute<WorkplaceDetailRouteProp>();
    const {workplaceId} = route.params;

    const [workplace, setWorkplace] = useState<Workplace | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetch = async () => {
            try {
                setIsLoading(true);
                const data = await getWorkplaceById(workplaceId);
                if (data) {
                    setWorkplace(data);
                } else {
                    throw new Error('근무지 정보를 찾을 수 없어요.');
                }
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Unknown error'));
            } finally {
                setIsLoading(false);
            }
        };
        fetch();
    }, [workplaceId]);

    const header = <AppHeader title="근무지 상세" />;

    if (isLoading) {
        return (
            <ScreenContainer header={header}>
                <LoadingState title="불러오는 중" />
            </ScreenContainer>
        );
    }
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- boolean condition (logical OR), not value coalescing
    if (error || !workplace) {
        return (
            <ScreenContainer header={header}>
                <ErrorState title="찾을 수 없어요" description={error?.message ?? '근무지 정보를 찾을 수 없어요.'} />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer scroll header={header}>
            <View style={styles.hero}>
                <AppText variant="headingMd" numberOfLines={2}>{workplace.name}</AppText>
                <AppText variant="bodyMd" tone="secondary" numberOfLines={2} style={styles.heroSub}>
                    {workplace.address}
                </AppText>
            </View>

            <AppCard variant="plain" style={styles.card}>
                <InfoRow icon="business-outline" label="근무지명" value={workplace.name} />
                <InfoRow icon="location-outline" label="주소" value={workplace.address} last />
            </AppCard>
        </ScreenContainer>
    );
};

const InfoRow: React.FC<{icon: string; label: string; value: string; last?: boolean}> = ({icon, label, value, last}) => {
    const c = useThemeColors();
    return (
        <View style={[styles.infoRow, !last && styles.infoRowBordered, !last && {borderBottomColor: c.divider}]}>
            <View style={styles.infoLabel}>
                <Ionicons name={icon} size={18} color={c.textTertiary} />
                <AppText variant="bodyMd" tone="secondary">{label}</AppText>
            </View>
            <AppText variant="bodyMd" weight="600" numberOfLines={1} style={styles.infoValue}>{value}</AppText>
        </View>
    );
};

const styles = StyleSheet.create({
    hero: {marginBottom: spacing.lg},
    heroSub: {marginTop: spacing.sm},
    card: {marginTop: spacing.sm},
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        gap: spacing.md,
    },
    infoRowBordered: {borderBottomWidth: 1},
    infoLabel: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    infoValue: {flex: 1, textAlign: 'right'},
});

export default WorkplaceDetailScreen;
