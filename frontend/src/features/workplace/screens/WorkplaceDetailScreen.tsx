import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useRoute} from '@react-navigation/native';
import {MainLayout} from '../../../common/components';
import {Workplace} from '../types';
import {getWorkplaceById} from '../services';
import {WorkplaceDetailRouteProp} from '../../../navigation/types';

export const WorkplaceDetailScreen: React.FC = () => {
    const route = useRoute<WorkplaceDetailRouteProp>();
    const {workplaceId} = route.params;

    const [workplace, setWorkplace] = useState<Workplace | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchWorkplaceDetails = async () => {
            try {
                setIsLoading(true);
                const data = await getWorkplaceById(workplaceId);
                if (data) {
                    setWorkplace(data);
                } else {
                    throw new Error('직장 정보를 찾을 수 없습니다.');
                }
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Unknown error'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchWorkplaceDetails();
    }, [workplaceId]);

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

    if (!workplace) {
        return (
            <MainLayout>
                <View style={styles.centerContainer}>
                    <Text>직장 정보를 찾을 수 없습니다.</Text>
                </View>
            </MainLayout>
        );
    }

    return (
        <MainLayout title="직장 상세 정보">
            <View style={styles.container}>
                <View style={styles.section}>
                    <Text style={styles.label}>직장명</Text>
                    <Text style={styles.value}>{workplace.name}</Text>
                </View>
                <View style={styles.section}>
                    <Text style={styles.label}>주소</Text>
                    <Text style={styles.value}>{workplace.address}</Text>
                </View>
                {/* 추가 정보가 있다면 여기에 표시 */}
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: {
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
    section: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    value: {
        fontSize: 18,
        fontWeight: '500',
    },
});
