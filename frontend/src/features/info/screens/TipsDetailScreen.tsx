export type RootStackParamList = {
    TipsDetail: { tipId: number };
};

import React, {useEffect, useState} from 'react';
import {
    ActivityIndicator,
    Image,
    Linking,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Button, MainLayout, Toast} from '../../../common/components';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';


// 꿀팁 상세 타입 정의
interface TipDetail {
    id: number;
    title: string;
    summary: string;
    content: string;
    // image: any; // 실제 구현에서는 이미지 URL 또는 require 경로
    date: string;
    author: string;
    views: number;
    tags: string[];
    relatedLinks?: Array<{
        title: string;
        url: string;
    }>;
}

type TipsDetailScreenNavigationProp = NativeStackNavigationProp<
    RootStackParamList,
    'TipsDetail'
>;

const TipsDetailScreen = () => {
    const navigation = useNavigation<TipsDetailScreenNavigationProp>();
    const route = useRoute();
    const {tipId} = route.params as { tipId: number };

    const [loading, setLoading] = useState(true);
    const [tip, setTip] = useState<TipDetail | null>(null);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

    // 데이터 로딩 함수
    useEffect(() => {
        const fetchTip = async () => {
            try {
                // 실제 구현에서는 API 호출로 대체
                // const response = await fetch(`https://sodam-api.com/api/tips/${tipId}`);
                // const data = await response.json();
                // setTip(data);

                // 임시 데이터 (API 연동 전까지 사용)
                setTimeout(() => {
                    const mockData: TipDetail = {
                        id: tipId,
                        title: '점포 위치 선정 시 체크해야 할 10가지 포인트',
                        summary: '상권 분석부터 유동인구까지 성공적인 입지 선정 가이드',
                        content: `# 점포 위치 선정 시 체크해야 할 10가지 포인트

## 1. 상권 분석
상권의 특성과 규모를 파악하세요. 주변 업종 구성, 경쟁점 현황, 상권의 성장성 등을 종합적으로 분석해야 합니다.

## 2. 유동인구
시간대별, 요일별 유동인구를 체크하세요. 특히 타겟 고객층의 유동인구가 많은지 확인이 중요합니다.

## 3. 접근성
대중교통 접근성, 주차 시설, 도보 접근성 등을 고려하세요. 고객이 쉽게 찾아올 수 있는 위치가 좋습니다.

## 4. 가시성
간판이 잘 보이는 위치인지, 매장이 쉽게 눈에 띄는지 확인하세요. 가시성이 좋으면 자연스러운 홍보 효과가 있습니다.

## 5. 임대료와 권리금
임대료와 권리금이 매출 대비 적정한지 검토하세요. 과도한 초기 비용은 사업 운영에 부담이 됩니다.

## 6. 주변 시설
주변에 어떤 시설이 있는지 확인하세요. 주거 단지, 오피스, 학교 등 주변 시설에 따라 고객층이 달라집니다.

## 7. 건물 상태
건물의 노후도, 시설 상태, 관리 상태를 확인하세요. 리모델링 비용이 추가로 필요할 수 있습니다.

## 8. 규제 사항
해당 지역의 영업 제한, 간판 설치 규제, 영업시간 제한 등을 확인하세요.

## 9. 미래 개발 계획
주변 지역의 개발 계획을 확인하세요. 새로운 대형 시설이 들어서거나 재개발 계획이 있는지 알아보세요.

## 10. 경쟁점 분석
주변 경쟁점의 매출, 고객층, 메뉴, 가격대 등을 분석하여 차별화 전략을 세우세요.

이 10가지 포인트를 꼼꼼히 체크하면 실패 확률을 크게 줄일 수 있습니다. 특히 처음 창업하는 경우, 전문가의 도움을 받는 것도 좋은 방법입니다.`,
                        // image: require('../assets/tip1.jpg'),
                        date: '2024-05-15',
                        author: '소담 창업팀',
                        views: 3456,
                        tags: ['창업', '입지선정', '상권분석', '점포'],
                        relatedLinks: [
                            {
                                title: '상권분석 서비스 (소상공인시장진흥공단)',
                                url: 'https://sg.sbiz.or.kr/godo/index.sg',
                            },
                            {
                                title: '점포 임대차 계약 가이드',
                                url: 'https://www.mss.go.kr/site/smba/main.do',
                            },
                        ],
                    };
                    setTip(mockData);
                    setLoading(false);
                }, 1000);
            } catch (error) {
                console.error('꿀팁 정보를 불러오는 중 오류가 발생했습니다:', error);
                setToastMessage('정보를 불러오는 중 오류가 발생했습니다.');
                setToastType('error');
                setShowToast(true);
                setLoading(false);
            }
        };

        fetchTip();
    }, [tipId]);

    // 북마크 토글 함수
    const toggleBookmark = () => {
        setIsBookmarked(!isBookmarked);
        setToastMessage(isBookmarked ? '북마크가 해제되었습니다.' : '북마크에 추가되었습니다.');
        setToastType('success');
        setShowToast(true);

        // 실제 구현에서는 API 호출로 북마크 상태 저장
        // fetch(`https://sodam-api.com/api/bookmarks/tips/${tipId}`, {
        //   method: isBookmarked ? 'DELETE': 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ userId: 'current-user-id' })
        // });
    };

    // 공유 기능
    const shareContent = async () => {
        try {
            if (!tip) {
                return;
            }

            await Share.share({
                message: `${tip.title}\n\n${tip.summary}\n\n${tip.content.substring(0, 100)}...\n\n소담 앱에서 더 보기`,
                title: tip.title,
            });
        } catch (error) {
            console.error('공유 중 오류가 발생했습니다:', error);
            setToastMessage('공유 중 오류가 발생했습니다.');
            setToastType('error');
            setShowToast(true);
        }
    };

    // 관련 링크 열기
    const openLink = async (url: string) => {
        try {
            const supported = await Linking.canOpenURL(url);

            if (supported) {
                await Linking.openURL(url);
            } else {
                setToastMessage('링크를 열 수 없습니다.');
                setToastType('error');
                setShowToast(true);
            }
        } catch (error) {
            console.error('링크를 여는 중 오류가 발생했습니다:', error);
            setToastMessage('링크를 여는 중 오류가 발생했습니다.');
            setToastType('error');
            setShowToast(true);
        }
    };

    // 관련 꿀팁 목록
    const relatedTips = [
        {id: 101, title: '저비용으로 가게 인테리어 개선하는 방법', summary: '예산이 적어도 가능한 인테리어 팁'},
        {id: 102, title: '소셜미디어로 가게 홍보하는 노하우', summary: '인스타그램, 네이버 플레이스 활용 전략'},
        {id: 103, title: '소상공인 세금 절약 꿀팁 10가지', summary: '합법적인 절세 방법 총정리'},
    ];

    if (loading) {
        return (
            <MainLayout>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#f1c40f"/>
                    <Text style={styles.loadingText}>정보를 불러오는 중입니다...</Text>
                </View>
            </MainLayout>
        );
    }

    if (!tip) {
        return (
            <MainLayout>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>꿀팁 정보를 찾을 수 없습니다.</Text>
                    <Button
                        title="돌아가기"
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    />
                </View>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <ScrollView style={styles.container}>
                {/* 헤더 영역 */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                        accessibilityLabel="뒤로 가기"
                    >
                        <Ionicons name="arrow-back" size={24} color="#333"/>
                    </TouchableOpacity>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={toggleBookmark}
                            accessibilityLabel={isBookmarked ? '북마크 해제' : '북마크 추가'}
                        >
                            <Ionicons
                                name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                                size={24}
                                color={isBookmarked ? '#f1c40f' : '#333'}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={shareContent}
                            accessibilityLabel="공유하기"
                        >
                            <Ionicons name="share-outline" size={24} color="#333"/>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 이미지 영역 */}
                {/*<Image source={tip.image} style={styles.coverImage}/>*/}
                <Image style={styles.coverImage}/>

                {/* 콘텐츠 영역 */}
                <View style={styles.content}>
                    <Text style={styles.title}>{tip.title}</Text>
                    <Text style={styles.summary}>{tip.summary}</Text>

                    <View style={styles.metaInfo}>
                        <Text style={styles.author}>{tip.author}</Text>
                        <Text style={styles.date}>{tip.date}</Text>
                        <Text style={styles.views}>조회 {tip.views}</Text>
                    </View>

                    {/* 태그 영역 */}
                    <View style={styles.tagsContainer}>
                        {tip.tags.map((tag, index) => (
                            <View key={index} style={styles.tag}>
                                <Text style={styles.tagText}>#{tag}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.divider}/>

                    <Text style={styles.contentText}>{tip.content}</Text>

                    {/* 관련 링크 영역 */}
                    {tip.relatedLinks && tip.relatedLinks.length > 0 && (
                        <View style={styles.linksSection}>
                            <Text style={styles.linksSectionTitle}>관련 링크</Text>
                            {tip.relatedLinks.map((link, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.linkItem}
                                    onPress={() => openLink(link.url)}
                                >
                                    <Ionicons name="link-outline" size={18} color="#f1c40f"/>
                                    <Text style={styles.linkText}>{link.title}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* 관련 꿀팁 영역 */}
                <View style={styles.relatedSection}>
                    <Text style={styles.relatedTitle}>관련 꿀팁</Text>
                    {relatedTips.map(item => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.relatedItem}
                            onPress={() => {
                                // 관련 꿀팁 항목 클릭 시 해당 꿀팁으로 이동
                                navigation.navigate('TipsDetail', {tipId: item.id});
                            }}
                        >
                            <View style={styles.relatedItemContent}>
                                <Text style={styles.relatedItemTitle}>{item.title}</Text>
                                <Text style={styles.relatedItemSummary}>{item.summary}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#888"/>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {/* 토스트 메시지 */}
            <Toast
                visible={showToast}
                message={toastMessage}
                type={toastType}
                onClose={() => setShowToast(false)}
                duration={3000}
            />
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        color: '#e74c3c',
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    backButton: {
        padding: 8,
    },
    headerActions: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: 8,
        marginLeft: 16,
    },
    coverImage: {
        width: '100%',
        height: 250,
        resizeMode: 'cover',
    },
    content: {
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    summary: {
        fontSize: 16,
        color: '#666',
        marginBottom: 16,
        fontStyle: 'italic',
    },
    metaInfo: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    author: {
        fontSize: 14,
        color: '#666',
        marginRight: 12,
    },
    date: {
        fontSize: 14,
        color: '#888',
        marginRight: 12,
    },
    views: {
        fontSize: 14,
        color: '#888',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    tag: {
        backgroundColor: '#f1c40f20',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
    },
    tagText: {
        color: '#f1c40f',
        fontSize: 14,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 16,
    },
    contentText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#333',
    },
    linksSection: {
        marginTop: 24,
        marginBottom: 16,
    },
    linksSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    linkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    linkText: {
        fontSize: 16,
        color: '#3498db',
        marginLeft: 10,
        textDecorationLine: 'underline',
    },
    relatedSection: {
        padding: 20,
        backgroundColor: '#f9f9f9',
    },
    relatedTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    relatedItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    relatedItemContent: {
        flex: 1,
    },
    relatedItemTitle: {
        fontSize: 16,
        color: '#333',
        marginBottom: 4,
    },
    relatedItemSummary: {
        fontSize: 14,
        color: '#888',
    },
});

export default TipsDetailScreen;
