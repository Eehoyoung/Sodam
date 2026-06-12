import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useRoute} from '@react-navigation/native';
import {
    AppCard,
    AppHeader,
    AppListItem,
    AppText,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {Workplace} from '../types';
import {getWorkplaceById} from '../services';
import {WorkplaceDetailRouteProp} from '../../../navigation/types';
import {spacing} from '../../../theme/tokens';

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
            <AppCard variant="navy" hero>
                <AppText variant="headingSm" tone="inverse">{workplace.name}</AppText>
                <AppText variant="bodyMd" tone="inverse" style={styles.heroSub}>{workplace.address}</AppText>
            </AppCard>

            <View style={styles.list}>
                <AppListItem title="근무지명" right={<AppText variant="titleMd">{workplace.name}</AppText>} />
                <AppListItem title="주소" right={<AppText variant="caption" tone="secondary">{workplace.address}</AppText>} />
            </View>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    heroSub: {marginTop: 4, opacity: 0.82},
    list: {marginTop: spacing.md, gap: spacing.sm},
});

export default WorkplaceDetailScreen;
