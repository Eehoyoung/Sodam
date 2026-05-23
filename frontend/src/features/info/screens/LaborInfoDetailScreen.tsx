import React, {useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Button, MainLayout, Toast} from '../../../common/components';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import laborInfoService from '../services/laborInfoService';

export type RootStackParamList = {
    LaborInfoDetail: { infoId: string };
};

// 노무 정보 상세 타입 정의
interface LaborInfoDetail {
    id: number;
    title: string;
    date: string;
    content: string;
    author: string;
    views: number;
    category: string;
}

type LaborInfoDetailScreenNavigationProp = NativeStackNavigationProp<
    RootStackParamList,
    'LaborInfoDetail'
>;

const LaborInfoDetailScreen = () => {
    const navigation = useNavigation<LaborInfoDetailScreenNavigationProp>();
    const route = useRoute();
    const {infoId} = route.params as { infoId: string };

    const [loading, setLoading] = useState(true);
    const [laborInfo, setLaborInfo] = useState<LaborInfoDetail | null>(null);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

    // 데이터 로딩 함수
    useEffect(() => {
        const fetchLaborInfo = async () => {
            try {
                setLoading(true);
                // 서비스 통해 백엔드 연동 (http://10.0.2.2:8080 기반)
                const detail = await laborInfoService.getLaborInfoById(infoId);
                const mapped: LaborInfoDetail = {
                    id: parseInt(detail.id, 10),
                    title: detail.title,
                    date: new Date(detail.publishDate).toISOString().slice(0, 10),
                    content: detail.content,
                    author: detail.author || '소담 노무팀',
                    views: 0,
                    category: '노무 정보',
                };
                setLaborInfo(mapped);
            } catch (error) {
                console.error('노무 정보를 불러오는 중 오류가 발생했습니다:', error);
                setToastMessage('정보를 불러오는 중 오류가 발생했습니다.');
                setToastType('error');
                setShowToast(true);
            } finally {
                setLoading(false);
            }
        };

        fetchLaborInfo().catch(error => {
            console.error('Error in fetchLaborInfo:', error);
            setToastMessage('정보를 불러오는 중 오류가 발생했습니다.');
            setToastType('error');
            setShowToast(true);
            setLoading(false);
        });
    }, [infoId]);

    // 북마크 토글 함수
    const toggleBookmark = () => {
        setIsBookmarked(!isBookmarked);
        setToastMessage(isBookmarked ? '북마크가 해제되었습니다.' : '북마크에 추가되었습니다.');
        setToastType('success');
        setShowToast(true);

        // TODO: API 연결 필요 - 북마크 상태를 저장하는 API 호출로 대체해야 함
        // 실제 구현에서는 API 호출로 북마크 상태 저장
        // fetch(`https://sodam-api.com/api/bookmarks/${laborInfoId}`, {
        //   method: isBookmarked ? 'DELETE': 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ userId: 'current-user-id' })
        // });
    };

    // 공유 기능
    const shareContent = async () => {
        try {
            if (!laborInfo) {
                return;
            }

            await Share.share({
                message: `${laborInfo.title}\n\n${laborInfo.content.substring(0, 100)}...\n\n소담 앱에서 더 보기`,
                title: laborInfo.title,
            });
        } catch (error) {
            console.error('공유 중 오류가 발생했습니다:', error);
            setToastMessage('공유 중 오류가 발생했습니다.');
            setToastType('error');
            setShowToast(true);
        }
    };

    // 관련 정보 목록
    const relatedInfos = [
        {id: 101, title: '최저임금 위반 시 처벌 규정 안내'},
        {id: 102, title: '급여 명세서 작성 가이드'},
        {id: 103, title: '소상공인 인건비 지원 정책'},
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

    if (!laborInfo) {
        return (
            <MainLayout>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>정보를 찾을 수 없습니다.</Text>
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
                                color={isBookmarked ? '#3498db' : '#333'}
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
                    <Text style={styles.category}>{laborInfo.category}</Text>
                    <Text style={styles.title}>{laborInfo.title}</Text>
                    <View style={styles.metaInfo}>
                        <Text style={styles.author}>{laborInfo.author}</Text>
                        <Text style={styles.date}>{laborInfo.date}</Text>
                        <Text style={styles.views}>조회 {laborInfo.views}</Text>
                    </View>

                    <View style={styles.divider}/>

                    <Text style={styles.contentText}>{laborInfo.content}</Text>
                </View>

                {/* 관련 정보 영역 */}
                <View style={styles.relatedSection}>
                    <Text style={styles.relatedTitle}>관련 정보</Text>
                    {relatedInfos.map(info => (
                        <TouchableOpacity
                            key={info.id}
                            style={styles.relatedItem}
                            onPress={() => {
                                // 관련 정보 항목 클릭 시 해당 정보로 이동
                                navigation.navigate('LaborInfoDetail', {infoId: info.id.toString()});
                            }}
                        >
                            <Ionicons name="document-text-outline" size={18} color="#3498db"/>
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

export default LaborInfoDetailScreen;
