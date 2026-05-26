import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {
    AppHeader,
    AppListItem,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {useWorkplaces} from '../hooks/useWorkplaces';
import {Workplace} from '../types';
import {WorkplaceListScreenNavigationProp} from '../../../navigation/types';
import {spacing} from '../../../theme/tokens';

/**
 * 15 WorkplaceList — 확정 시안.
 * 근무지 목록. useWorkplaces 훅 보존.
 */
export const WorkplaceListScreen: React.FC = () => {
    const navigation = useNavigation<WorkplaceListScreenNavigationProp>();
    const {workplaces, isLoading, error} = useWorkplaces();

    const open = (workplace: Workplace) => navigation.navigate('WorkplaceDetail', {workplaceId: workplace.id});

    const header = <AppHeader title="근무지" />;

    if (isLoading) {
        return (
            <ScreenContainer header={header}>
                <LoadingState title="불러오는 중" description="근무지를 불러오고 있어요" />
            </ScreenContainer>
        );
    }
    if (error) {
        return (
            <ScreenContainer header={header}>
                <ErrorState title="불러오지 못했어요" description={error.message} />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer scroll header={header}>
            {!workplaces || workplaces.length === 0 ? (
                <EmptyState
                    title="아직 근무지가 없어요"
                    description="내가 일하는 곳을 등록하고 시간을 기록하세요."
                />
            ) : (
                <View style={styles.list}>
                    {workplaces.map(w => (
                        <AppListItem key={w.id} title={w.name} subtitle={w.address} right="›" onPress={() => open(w)} />
                    ))}
                </View>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    list: {gap: spacing.sm},
});

export default WorkplaceListScreen;
