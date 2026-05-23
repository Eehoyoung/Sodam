export type RootStackParamList = {
    PolicyDetail: { policyId: number };
};

import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Linking, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Button, MainLayout, Toast} from '../../../common/components';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';


// 정책 정보 상세 타입 정의
interface PolicyDetail {
    id: number;
    title: string;
    date: string;
    content: string;
    department: string;
    applicationPeriod: string;
    eligibility: string;
    benefits: string;
    applicationLink: string;
}

type PolicyDetailScreenNavigationProp = NativeStackNavigationProp<
    RootStackParamList,
    'PolicyDetail'
>;

const PolicyDetailScreen = () => {
    const navigation = useNavigation<PolicyDetailScreenNavigationProp>();
    const route = useRoute();
    const {policyId} = route.params as { policyId: number };

    const [loading, setLoading] = useState(true);
    const [policy, setPolicy] = useState<PolicyDetail | null>(null);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

    // 데이터 로딩 함수
    useEffect(() => {
        const fetchPolicy = async () => {
            try {
                // 실제 구현에서는 API 호출로 대체
                // const response = await fetch(`https://sodam-api.com/api/policies/${policyId}`);
                // const data = await response.json();
                // setPolicy(data);

                // 임시 데이터 (API 연동 전까지 사용)
                setTimeout(() => {
                    const mockData: PolicyDetail = {
                        id: policyId,
                        title: '2024년 소상공인 디지털 전환 지원 사업 안내',
                        date: '2024-05-15',
                        content: `소상공인의 디지털 전환을 지원하기 위한 2024년 지원 사업을 안내드립니다. 본 사업은 소상공인의 경쟁력 강화와 디지털 역량 향상을 목표로 합니다.`,
                        department: '중소벤처기업부',
                        applicationPeriod: '2024년 6월 1일 ~ 2024년 7월 31일',
                        eligibility: '연 매출 3억원 이하의 소상공인 (사업자등록증 보유 필수)',
                        benefits: `1. 디지털 전환 컨설팅 지원 (최대 100만원)
2. 온라인 판로 구축 지원 (최대 300만원)
3. 스마트 기기 도입 지원 (최대 200만원)
4. 디지털 마케팅 교육 제공`,
                        applicationLink: 'https://www.mss.go.kr/site/smba/main.do'
                    };
                    setPolicy(mockData);
                    setLoading(false);
                }, 1000);
            } catch (error) {
                console.error('정책 정보를 불러오는 중 오류가 발생했습니다:', error);
                setToastMessage('정보를 불러오는 중 오류가 발생했습니다.');
                setToastType('error');
                setShowToast(true);
                setLoading(false);
            }
        };

        fetchPolicy();
    }, [policyId]);

    // 북마크 토글 함수
    const toggleBookmark = () => {
        setIsBookmarked(!isBookmarked);
        setToastMessage(isBookmarked ? '북마크가 해제되었습니다.' : '북마크에 추가되었습니다.');
        setToastType('success');
        setShowToast(true);

        // 실제 구현에서는 API 호출로 북마크 상태 저장
        // fetch(`https://sodam-api.com/api/bookmarks/policies/${policyId}`, {
        //   method: isBookmarked ? 'DELETE' : 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ userId: 'current-user-id' })
        // });
    };

    // 공유 기능
    const shareContent = async () => {
        try {
            if (!policy) return;

            await Share.share({
                message: `${policy.title}\n\n${policy.content}\n\n신청 기간: ${policy.applicationPeriod}\n\n소담 앱에서 더 보기`,
                title: policy.title,
            });
        } catch (error) {
            console.error('공유 중 오류가 발생했습니다:', error);
            setToastMessage('공유 중 오류가 발생했습니다.');
            setToastType('error');
            setShowToast(true);
        }
    };

    // 신청 링크 열기
    const openApplicationLink = async () => {
        if (!policy?.applicationLink) return;

        try {
            const supported = await Linking.canOpenURL(policy.applicationLink);

            if (supported) {
                await Linking.openURL(policy.applicationLink);
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

    // 관련 정책 목록
    const relatedPolicies = [
        {id: 101, title: '소상공인 경영안정자금 지원 사업'},
        {id: 102, title: '온라인 판로 지원 사업'},
        {id: 103, title: '소상공인 재창업 지원 사업'},
    ];

    if (loading) {
        return (
            <MainLayout>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3498db"/>
                    <Text style={styles.loadingText}>정보를 불러오는 중입니다...</Text>
                </View>
            </MainLayout>
        );
    }

    if (!policy) {
        return (
            <MainLayout>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>정책 정보를 찾을 수 없습니다.</Text>
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
                            accessibilityLabel={isBookmarked ? "북마크 해제" : "북마크 추가"}
                        >
                            <Ionicons
                                name={isBookmarked ? "bookmark" : "bookmark-outline"}
                                size={24}
                                color={isBookmarked ? "#3498db" : "#333"}
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
                    <Text style={styles.department}>{policy.department}</Text>
                    <Text style={styles.title}>{policy.title}</Text>
                    <Text style={styles.date}>등록일: {policy.date}</Text>

                    <View style={styles.divider}/>

                    <Text style={styles.contentText}>{policy.content}</Text>

                    <View style={styles.infoSection}>
                        <Text style={styles.infoTitle}>신청 기간</Text>
                        <Text style={styles.infoContent}>{policy.applicationPeriod}</Text>
                    </View>

                    <View style={styles.infoSection}>
                        <Text style={styles.infoTitle}>지원 대상</Text>
                        <Text style={styles.infoContent}>{policy.eligibility}</Text>
                    </View>

                    <View style={styles.infoSection}>
                        <Text style={styles.infoTitle}>지원 내용</Text>
                        <Text style={styles.infoContent}>{policy.benefits}</Text>
                    </View>

                    <Button
                        title="신청하기"
                        onPress={openApplicationLink}
                        style={styles.applyButton}
                    />
                </View>

                {/* 관련 정책 영역 */}
                <View style={styles.relatedSection}>
                    <Text style={styles.relatedTitle}>관련 정책</Text>
                    {relatedPolicies.map(item => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.relatedItem}
                            onPress={() => {
                                // 관련 정책 항목 클릭 시 해당 정책으로 이동
                                navigation.navigate('PolicyDetail', {policyId: item.id});
                            }}
                        >
                            <Ionicons name="document-text-outline" size={18} color="#3498db"/>
                            <Text style={styles.relatedItemText}>{item.title}</Text>
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
    department: {
        fontSize: 14,
        color: '#3498db',
        fontWeight: '600',
        marginBottom: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    date: {
        fontSize: 14,
        color: '#888',
        marginBottom: 16,
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
        marginBottom: 20,
    },
    infoSection: {
        marginBottom: 16,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    infoContent: {
        fontSize: 16,
        lineHeight: 24,
        color: '#333',
    },
    applyButton: {
        marginTop: 20,
        marginBottom: 10,
        backgroundColor: '#27ae60',
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

export default PolicyDetailScreen;
