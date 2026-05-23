import React from 'react';
import {ActivityIndicator, FlatList, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {MainLayout} from '../../../common/components';
import {WorkplaceCard} from '../components';
import {useWorkplaces} from '../hooks/useWorkplaces';
import {Workplace} from '../types';
import {WorkplaceListScreenNavigationProp} from '../../../navigation/types';

export const WorkplaceListScreen: React.FC = () => {
    const navigation = useNavigation<WorkplaceListScreenNavigationProp>();
    const {workplaces, isLoading, error} = useWorkplaces();

    const handleWorkplacePress = (workplace: Workplace) => {
        navigation.navigate('WorkplaceDetail', {workplaceId: workplace.id});
    };

    if (isLoading) {
        return (
            <MainLayout>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#0000ff"/>
                </View>
            </MainLayout>
        );
    }

    if (error) {
        return (
            <MainLayout>
                <View style={styles.centerContainer}>
                    <Text style={styles.errorText}>오류가 발생했습니다: {error.message}</Text>
                </View>
            </MainLayout>
        );
    }

    return (
        <MainLayout title="직장 목록">
            <FlatList
                data={workplaces}
                keyExtractor={(item) => item.id}
                renderItem={({item}) => (
                    <WorkplaceCard workplace={item} onPress={handleWorkplacePress}/>
                )}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>등록된 직장이 없습니다.</Text>
                    </View>
                }
            />
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    listContainer: {
        padding: 16,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
    },
});
