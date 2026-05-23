import React, {useEffect, useState} from 'react';
import {Image, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Dimensions} from 'react-native';
import {useNavigation, NavigationProp} from '@react-navigation/native';
import {HomeStackParamList} from '../../../navigation/types';
import homeService from '../services/homeService';
import {Service} from '../types';

// 화면 크기 가져오기
const {width} = Dimensions.get('window');

const ServiceCards = () => {
    const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // 서비스 데이터 가져오기
    const fetchServices = async () => {
        try {
            setLoading(true);
            setError(false);
            const data = await homeService.getServices();
            if (data && data.length > 0) {
                setServices(data);
            } else {
                // 백업 데이터 (API 응답이 비어있는 경우)
                setServices([
                    {
                        id: '1',
                        title: '근태관리',
                        description: '직원 출퇴근 기록, 근무시간 집계, 급여 계산까지 한번에',
                        iconUrl: 'https://via.placeholder.com/60?text=Attendance',
                        screenName: 'Attendance'
                    },
                    {
                        id: '2',
                        title: '세무관리',
                        description: '세금 신고, 계산서 발행, 회계 관리를 쉽고 간편하게',
                        iconUrl: 'https://via.placeholder.com/60?text=Tax',
                        screenName: 'TaxInfoDetail'
                    },
                    {
                        id: '3',
                        title: '마케팅 도구',
                        description: '효과적인 홍보를 위한 맞춤형 마케팅 솔루션 제공',
                        iconUrl: 'https://via.placeholder.com/60?text=Marketing',
                        screenName: 'TipsDetail'
                    },
                    {
                        id: '4',
                        title: '상권분석',
                        description: '위치 기반 상권 정보와 경쟁 현황 분석 리포트',
                        iconUrl: 'https://via.placeholder.com/60?text=Market',
                        screenName: 'PolicyDetail'
                    },
                ]);
            }
        } catch (err) {
            console.error('서비스 데이터를 가져오는 중 오류가 발생했습니다:', err);
            setError(true);
            // 백업 데이터 (API 호출 실패 시)
            setServices([
                {
                    id: '1',
                    title: '근태관리',
                    description: '직원 출퇴근 기록, 근무시간 집계, 급여 계산까지 한번에',
                    iconUrl: 'https://via.placeholder.com/60?text=Attendance',
                    screenName: 'Attendance'
                },
                {
                    id: '2',
                    title: '세무관리',
                    description: '세금 신고, 계산서 발행, 회계 관리를 쉽고 간편하게',
                    iconUrl: 'https://via.placeholder.com/60?text=Tax',
                    screenName: 'TaxInfoDetail'
                },
                {
                    id: '3',
                    title: '마케팅 도구',
                    description: '효과적인 홍보를 위한 맞춤형 마케팅 솔루션 제공',
                    iconUrl: 'https://via.placeholder.com/60?text=Marketing',
                    screenName: 'TipsDetail'
                },
                {
                    id: '4',
                    title: '상권분석',
                    description: '위치 기반 상권 정보와 경쟁 현황 분석 리포트',
                    iconUrl: 'https://via.placeholder.com/60?text=Market',
                    screenName: 'PolicyDetail'
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    // 컴포넌트 마운트 시 서비스 데이터 가져오기
    useEffect(() => {
        fetchServices();
    }, []);

    // 서비스 카드 너비 계산 (반응형)
    const getCardWidth = () => {
        // 화면 너비에 따라 카드 너비 조정
        if (width >= 1200) { return '22%'; } // 대형 화면
        if (width >= 768) { return '45%'; }  // 태블릿
        return '90%';                        // 모바일
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <Text style={styles.sectionTitle}>소담의 주요 서비스</Text>
                <ActivityIndicator size="large" color="#3498db"/>
                <Text style={styles.loadingText}>서비스 정보를 불러오는 중...</Text>
            </View>
        );
    }

    if (error || services.length === 0) {
        return (
            <View style={[styles.container, styles.errorContainer]}>
                <Text style={styles.sectionTitle}>소담의 주요 서비스</Text>
                <Text style={styles.errorText}>서비스 정보를 불러올 수 없습니다.</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchServices}>
                    <Text style={styles.retryButtonText}>다시 시도</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>소담의 주요 서비스</Text>
            <Text style={styles.sectionSubtitle}>소상공인의 다양한 고민을 해결해 드립니다</Text>

            <View style={styles.cardsContainer}>
                {services.map(service => {
                    // 서비스 화면으로 이동
                    const handlePress = () => {
                        if (service.screenName) {
                            // @ts-expect-error - 타입 오류 무시 (동적 네비게이션)
                            navigation.navigate(service.screenName);
                        } else {
                            // 기본 화면으로 이동
                            navigation.navigate('Home');
                        }
                    };

                    return (
                        <TouchableOpacity
                            key={service.id}
                            style={[styles.card, {width: getCardWidth()}]}
                            onPress={handlePress}
                        >
                            <Image
                                source={service.iconUrl ? {uri: service.iconUrl} : require('../../../assets/placeholder.png')}
                                style={styles.cardIcon}
                                defaultSource={require('../../../assets/placeholder.png')}
                            />
                            <Text style={styles.cardTitle}>{service.title}</Text>
                            <Text style={styles.cardDescription}>{service.description}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#f1f9ff',
        padding: 30,
        marginVertical: 20,
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    sectionSubtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 30,
    },
    cardsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    card: {
        width: '22%',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        margin: 10,
        alignItems: 'center',
        elevation: 3,
        minHeight: 200,
    },
    cardIcon: {
        width: 60,
        height: 60,
        marginBottom: 15,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#3498db',
        marginBottom: 10,
    },
    cardDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    loadingContainer: {
        justifyContent: 'center',
        minHeight: 200,
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
        marginTop: 10,
    },
    errorContainer: {
        justifyContent: 'center',
        minHeight: 200,
    },
    errorText: {
        fontSize: 16,
        color: '#e74c3c',
        marginTop: 10,
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#3498db',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default ServiceCards;
