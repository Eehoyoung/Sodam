export type RootStackParamList = {
    TaxInfoDetail: { taxInfoId: number };
};

import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Linking, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Button, MainLayout, Toast} from '../../../common/components';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

// 세무 정보 상세 타입 정의
interface TaxInfoDetail {
    id: number;
    title: string;
    date: string;
    content: string;
    author: string;
    views: number;
    category: string;
    relatedLinks: Array<{
        title: string;
        url: string;
    }>;
}

type TaxInfoDetailScreenNavigationProp = NativeStackNavigationProp<
    RootStackParamList,
    'TaxInfoDetail'
>;

const TaxInfoDetailScreen = () => {
    const navigation = useNavigation<TaxInfoDetailScreenNavigationProp>();
    const route = useRoute();
    const {taxInfoId} = route.params as { taxInfoId: number };
    const [loading, setLoading] = useState(true);
    const [taxInfo, setTaxInfo] = useState<TaxInfoDetail | null>(null);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

    // 데이터 로딩 함수
    useEffect(() => {
        const fetchTaxInfo = async () => {
            try {
                // 실제 구현에서는 API 호출로 대체
                // const response = await fetch(`https://sodam-api.com/api/tax-info/${taxInfoId}`);
                // const data = await response.json();
                // setTaxInfo(data);

                // 임시 데이터 (API 연동 전까지 사용)
                setTimeout(() => {
                    const mockData: TaxInfoDetail = {
                        id: taxInfoId,
                        title: '2024년 세금신고 주요 변경사항 총정리',
                        date: '2024-05-14',
                        content: `# 2024년 세금신고 주요 변경사항

## 1. 종합소득세 신고 기간 변경
- 기존: 5월 1일 ~ 5월 31일
- 변경: 5월 1일 ~ 6월 15일 (15일 연장)

## 2. 간이과세자 기준금액 상향
- 기존: 연 매출 4,800만원 미만
- 변경: 연 매출 8,000만원 미만

## 3. 소상공인 세액공제 확대
- 영세 자영업자 부가가치세 감면 확대
- 소상공인 상생협력 세액공제 신설

## 4. 전자세금계산서 의무발급 대상 확대
- 개인사업자 중 직전 과세기간 공급가액 3,000만원 이상인 사업자

## 5. 신용카드 매출 세액공제율 조정
- 영세/중소가맹점: 1.3% → 1.5%
- 일반가맹점: 1.0% → 0.8%

자세한 내용은 국세청 홈페이지를 참조하시기 바랍니다.`,
                        author: '소담 세무팀',
                        views: 2345,
                        category: '세무 정보',
                        relatedLinks: [
                            {
                                title: '국세청 홈페이지',
                                url: 'https://www.nts.go.kr',
                            },
                            {
                                title: '종합소득세 신고 안내',
                                url: 'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2318&cntntsId=7711',
                            },
                        ],
                    };
                    setTaxInfo(mockData);
                    setLoading(false);
                }, 1000);
            } catch (error) {
                console.error('세무 정보를 불러오는 중 오류가 발생했습니다:', error);
                setToastMessage('정보를 불러오는 중 오류가 발생했습니다.');
                setToastType('error');
                setShowToast(true);
                setLoading(false);
            }
        };

        fetchTaxInfo();
    }, [taxInfoId]);

    // 북마크 토글 함수
    const toggleBookmark = () => {
        setIsBookmarked(!isBookmarked);
        setToastMessage(isBookmarked ? '북마크가 해제되었습니다.' : '북마크에 추가되었습니다.');
        setToastType('success');
        setShowToast(true);

        // 실제 구현에서는 API 호출로 북마크 상태 저장
        // fetch(`https://sodam-api.com/api/bookmarks/tax-info/${taxInfoId}`, {
        //   method: isBookmarked ? 'DELETE' : 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ userId: 'current-user-id' })
        // });
    };

    // 공유 기능
    const shareContent = async () => {
        try {
            if (!taxInfo) {
                return;
            }

            await Share.share({
                message: `${taxInfo.title}\n\n${taxInfo.content.substring(0, 100)}...\n\n소담 앱에서 더 보기`,
                title: taxInfo.title,
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

    // 관련 세무 정보 목록
    const relatedTaxInfos = [
        {id: 101, title: '소상공인을 위한 부가가치세 절세 전략'},
        {id: 102, title: '개인사업자 종합소득세 신고 가이드'},
        {id: 103, title: '직원 급여 관련 세무 처리 주의사항'},
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

    if (!taxInfo) {
        return (
            <MainLayout>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>세무 정보를 찾을 수 없습니다.</Text>
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

                {/* 콘텐츠 영역 */}
                <View style={styles.content}>
                    <Text style={styles.category}>{taxInfo.category}</Text>
                    <Text style={styles.title}>{taxInfo.title}</Text>
                    <View style={styles.metaInfo}>
                        <Text style={styles.author}>{taxInfo.author}</Text>
                        <Text style={styles.date}>{taxInfo.date}</Text>
                        <Text style={styles.views}>조회 {taxInfo.views}</Text>
                    </View>

                    <View style={styles.divider}/>

                    <Text style={styles.contentText}>{taxInfo.content}</Text>

                    {/* 관련 링크 영역 */}
                    {taxInfo.relatedLinks && taxInfo.relatedLinks.length > 0 && (
                        <View style={styles.linksSection}>
                            <Text style={styles.linksSectionTitle}>관련 링크</Text>
                            {taxInfo.relatedLinks.map((link, index) => (
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

                {/* 관련 세무 정보 영역 */}
                <View style={styles.relatedSection}>
                    <Text style={styles.relatedTitle}>관련 세무 정보</Text>
                    {relatedTaxInfos.map(info => (
                        <TouchableOpacity
                            key={info.id}
                            style={styles.relatedItem}
                            onPress={() => {
                                // 관련 세무 정보 항목 클릭 시 해당 정보로 이동
                                navigation.navigate('TaxInfoDetail', {taxInfoId: info.id});
                            }}
                        >
                            <Ionicons name="document-text-outline" size={18} color="#f1c40f"/>
                            <Text style={styles.relatedItemText}>{info.title}</Text>
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
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
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
    content: {
        padding: 20,
    },
    category: {
        fontSize: 14,
        color: '#f1c40f',
        fontWeight: '600',
        marginBottom: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
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
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    relatedItemText: {
        fontSize: 16,
        color: '#333',
        marginLeft: 10,
    },
});

export default TaxInfoDetailScreen;
