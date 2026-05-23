import React, {useEffect, useState} from 'react';
import {Dimensions, Image, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Alert} from 'react-native';
import homeService from '../services/homeService';
import {Event} from '../types';
import {useNavigation} from '@react-navigation/native';

// 화면 크기 가져오기
const {width} = Dimensions.get('window');

const EventSlider = () => {
    const navigation = useNavigation();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // 이벤트 데이터 가져오기
    const fetchEvents = async () => {
        try {
            setLoading(true);
            setError(false);
            const data = await homeService.fetchEvents();
            if (data && data.length > 0) {
                setEvents(data);
            } else {
                // 백업 데이터 (API 응답이 비어있는 경우)
                setEvents([
                    {
                        id: '1',
                        title: '소상공인 디지털 전환 지원 이벤트',
                        date: '2024-06-01',
                        imageUrl: 'https://via.placeholder.com/800x400?text=Event+1'
                    },
                    {
                        id: '2',
                        title: '세무 컨설팅 무료 체험',
                        date: '2024-06-05',
                        imageUrl: 'https://via.placeholder.com/800x400?text=Event+2'
                    },
                    {
                        id: '3',
                        title: '노무 관리 워크샵 안내',
                        date: '2024-06-10',
                        imageUrl: 'https://via.placeholder.com/800x400?text=Event+3'
                    },
                    {
                        id: '4',
                        title: '상권 분석 서비스 출시 기념 이벤트',
                        date: '2024-06-15',
                        imageUrl: 'https://via.placeholder.com/800x400?text=Event+4'
                    },
                    {
                        id: '5',
                        title: '모바일 포스 시스템 할인 프로모션',
                        date: '2024-06-20',
                        imageUrl: 'https://via.placeholder.com/800x400?text=Event+5'
                    },
                ]);
            }
        } catch (err) {
            console.error('이벤트 데이터를 가져오는 중 오류가 발생했습니다:', err);
            setError(true);
            // 백업 데이터 (API 호출 실패 시)
            setEvents([
                {
                    id: '1',
                    title: '소상공인 디지털 전환 지원 이벤트',
                    date: '2024-06-01',
                    imageUrl: 'https://via.placeholder.com/800x400?text=Event+1'
                },
                {
                    id: '2',
                    title: '세무 컨설팅 무료 체험',
                    date: '2024-06-05',
                    imageUrl: 'https://via.placeholder.com/800x400?text=Event+2'
                },
                {
                    id: '3',
                    title: '노무 관리 워크샵 안내',
                    date: '2024-06-10',
                    imageUrl: 'https://via.placeholder.com/800x400?text=Event+3'
                },
                {
                    id: '4',
                    title: '상권 분석 서비스 출시 기념 이벤트',
                    date: '2024-06-15',
                    imageUrl: 'https://via.placeholder.com/800x400?text=Event+4'
                },
                {
                    id: '5',
                    title: '모바일 포스 시스템 할인 프로모션',
                    date: '2024-06-20',
                    imageUrl: 'https://via.placeholder.com/800x400?text=Event+5'
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    // 컴포넌트 마운트 시 이벤트 데이터 가져오기
    useEffect(() => {
        fetchEvents();
    }, []);

    // 자동 슬라이드 설정
    useEffect(() => {
        if (events.length === 0) return;

        const interval = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % events.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [events.length]);

    // 화면 방향 변경을 감지하는 이벤트 리스너 추가
    useEffect(() => {
        const updateLayout = () => {
            // 강제 리렌더링 필요 없이 Dimensions.get('window')가 자동으로 최신 값을 반환
        };

        // 화면 방향 변경 이벤트 리스너 등록
        Dimensions.addEventListener('change', updateLayout);

        // 컴포넌트 언마운트 시 이벤트 리스너 제거
        return () => {
            // React Native 0.63부터는 더 이상 필요하지 않지만, 하위 호환성을 위해 유지
            // Dimensions.removeEventListener('change', updateLayout);
        };
    }, []);

    // 이벤트 클릭 처리
    const handleEventPress = (event: Event) => {
        // 이벤트 상세 페이지로 이동 (URL이 있는 경우 웹뷰로 열기)
        if (event.url) {
            // 웹뷰 화면으로 이동 (구현 필요)
            // navigation.navigate('WebView', { url: event.url, title: event.title });
            Alert.alert('이벤트 정보', `${event.title}\n\n자세한 내용은 웹사이트를 참조하세요.`);
        } else {
            // 이벤트 상세 화면으로 이동 (구현 필요)
            // navigation.navigate('EventDetail', { eventId: event.id });
            Alert.alert('이벤트 정보', event.title);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color="#3498db"/>
                <Text style={styles.loadingText}>이벤트 정보를 불러오는 중...</Text>
            </View>
        );
    }

    if (error || events.length === 0) {
        return (
            <View style={[styles.container, styles.errorContainer]}>
                <Text style={styles.errorText}>이벤트 정보를 불러올 수 없습니다.</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchEvents}>
                    <Text style={styles.retryButtonText}>다시 시도</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>이벤트 및 공지사항</Text>
            <TouchableOpacity
                style={styles.sliderContainer}
                onPress={() => handleEventPress(events[currentSlide])}
            >
                <Image
                    source={events[currentSlide].imageUrl ? {uri: events[currentSlide].imageUrl} : require('../../../assets/images/placeholder.png')}
                    style={styles.image}
                    defaultSource={require('../../../assets/images/placeholder.png')}
                />
                <Text style={styles.eventTitle}>{events[currentSlide].title}</Text>
            </TouchableOpacity>

            {/* 인디케이터 (자동 슬라이드 + 유저 조작 가능) */}
            <View style={styles.indicators}>
                {events.map((_, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => setCurrentSlide(index)}
                        accessible={true}
                        accessibilityLabel={`${index + 1}번째 이벤트로 이동`}
                    >
                        <View style={[styles.indicator, index === currentSlide && styles.activeIndicator]}/>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#fff',
        padding: 30,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
    },
    sliderContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: '100%',
    },
    image: {
        width: '100%',
        // 화면 너비에 맞게 이미지 높이 비율 조정 (16:9 비율 적용)
        height: (width - 60) * 0.5625, // 패딩 30px * 2를 고려하여 계산
        borderRadius: 8,
        resizeMode: 'cover',
    },
    eventTitle: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        backgroundColor: 'rgba(52, 152, 219, 0.8)',
        color: 'white',
        padding: 10,
        borderRadius: 5,
        fontSize: 16,
        fontWeight: 'bold',
        // 작은 화면에서 타이틀 크기 조정
        maxWidth: width - 100,
    },
    indicators: {
        flexDirection: 'row',
        marginTop: 15,
        justifyContent: 'center',
    },
    indicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ddd',
        marginHorizontal: 5,
    },
    activeIndicator: {
        backgroundColor: '#3498db',
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        height: 200,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        height: 200,
    },
    errorText: {
        fontSize: 16,
        color: '#e74c3c',
        marginBottom: 15,
    },
    retryButton: {
        backgroundColor: '#3498db',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
});

export default EventSlider;
