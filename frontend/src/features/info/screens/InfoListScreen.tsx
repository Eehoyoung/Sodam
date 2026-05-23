import React, {useEffect, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Card, MainLayout} from '../../../common/components';
import laborInfoService from '../services/laborInfoService';
import taxInfoService from '../services/taxInfoService';
import policyService from '../services/policyService';
import tipsService from '../services/tipsService';
import {InfoArticle, InfoCategory} from '../types';

// 네비게이션 타입 정의
type InfoStackParamList = {
    InfoList: undefined;
    LaborInfoDetail: { infoId: string };
    TaxInfoDetail: { taxInfoId: number };
    PolicyDetail: { policyId: number };
    TipsDetail: { tipId: number };
};

type InfoListScreenNavigationProp = NativeStackNavigationProp<InfoStackParamList, 'InfoList'>;

// 정보 타입 정의
type InfoType = 'LABOR' | 'TAX' | 'POLICY' | 'TIPS';

const InfoListScreen = () => {
    const navigation = useNavigation<InfoListScreenNavigationProp>();
    const [selectedType, setSelectedType] = useState<InfoType>('LABOR');
    const [categories, setCategories] = useState<InfoCategory[]>([]);
    const [articles, setArticles] = useState<InfoArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // 정보 타입에 따른 서비스 선택
    const getServiceByType = (type: InfoType) => {
        switch (type) {
            case 'LABOR':
                return laborInfoService;
            case 'TAX':
                return taxInfoService;
            case 'POLICY':
                return policyService;
            case 'TIPS':
                return tipsService;
            default:
                return laborInfoService;
        }
    };

    // 카테고리 목록 조회
    const fetchCategories = async () => {
        try {
            const service = getServiceByType(selectedType);
            const data = await service.getCategories();
            setCategories(data);

            if (data.length > 0) {
                setSelectedCategory(data[0].id);
            }
        } catch (error) {
            console.error('카테고리 목록을 가져오는 중 오류가 발생했습니다:', error);
            Alert.alert('오류', '카테고리 목록을 불러오는 데 실패했습니다. 다시 시도해주세요.');
        }
    };

    // 정보 목록 조회
    const fetchArticles = async () => {
        if (!selectedCategory) return;

        try {
            setLoading(true);
            const service = getServiceByType(selectedType);

            let data: InfoArticle[] = [];

            switch (selectedType) {
                case 'LABOR':
                    data = await (service as typeof laborInfoService).getLaborInfosByCategory(selectedCategory);
                    break;
                case 'TAX':
                    data = await (service as typeof taxInfoService).getTaxInfosByCategory(selectedCategory);
                    break;
                case 'POLICY':
                    data = await (service as typeof policyService).getPoliciesByCategory(selectedCategory);
                    break;
                case 'TIPS':
                    data = await (service as typeof tipsService).getTipsByCategory(selectedCategory);
                    break;
            }

            setArticles(data);
        } catch (error) {
            console.error('정보 목록을 가져오는 중 오류가 발생했습니다:', error);
            Alert.alert('오류', '정보 목록을 불러오는 데 실패했습니다. 다시 시도해주세요.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // 정보 타입 변경 시 카테고리 목록 다시 조회
    useEffect(() => {
        fetchCategories();
    }, [selectedType]);

    // 선택된 카테고리 변경 시 정보 목록 다시 조회
    useEffect(() => {
        if (selectedCategory) {
            fetchArticles();
        }
    }, [selectedCategory]);

    // 새로고침 처리
    const handleRefresh = () => {
        setRefreshing(true);
        fetchCategories();
    };

    // 정보 상세 화면으로 이동
    const navigateToDetail = (article: InfoArticle) => {
        switch (selectedType) {
            case 'LABOR':
                navigation.navigate('LaborInfoDetail', { infoId: article.id });
                break;
            case 'TAX':
                navigation.navigate('TaxInfoDetail', { taxInfoId: Number(article.id) });
                break;
            case 'POLICY':
                navigation.navigate('PolicyDetail', { policyId: Number(article.id) });
                break;
            case 'TIPS':
                navigation.navigate('TipsDetail', { tipId: Number(article.id) });
                break;
        }
    };

    // 정보 타입 탭 렌더링
    const renderTypeTabs = () => (
        <View style={styles.tabContainer}>
            <TouchableOpacity
                style={[styles.tab, selectedType === 'LABOR' && styles.selectedTab]}
                onPress={() => setSelectedType('LABOR')}
            >
                <Text style={[styles.tabText, selectedType === 'LABOR' && styles.selectedTabText]}>노동법</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, selectedType === 'TAX' && styles.selectedTab]}
                onPress={() => setSelectedType('TAX')}
            >
                <Text style={[styles.tabText, selectedType === 'TAX' && styles.selectedTabText]}>세금</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, selectedType === 'POLICY' && styles.selectedTab]}
                onPress={() => setSelectedType('POLICY')}
            >
                <Text style={[styles.tabText, selectedType === 'POLICY' && styles.selectedTabText]}>정책</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, selectedType === 'TIPS' && styles.selectedTab]}
                onPress={() => setSelectedType('TIPS')}
            >
                <Text style={[styles.tabText, selectedType === 'TIPS' && styles.selectedTabText]}>팁</Text>
            </TouchableOpacity>
        </View>
    );

    // 카테고리 목록 렌더링
    const renderCategories = () => (
        <FlatList
            data={categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            style={styles.categoryList}
            renderItem={({item}) => (
                <TouchableOpacity
                    style={[
                        styles.categoryItem,
                        selectedCategory === item.id && styles.selectedCategoryItem
                    ]}
                    onPress={() => setSelectedCategory(item.id)}
                >
                    <Text
                        style={[
                            styles.categoryText,
                            selectedCategory === item.id && styles.selectedCategoryText
                        ]}
                    >
                        {item.name}
                    </Text>
                </TouchableOpacity>
            )}
        />
    );

    // 정보 항목 렌더링
    const renderArticleItem = ({item}: { item: InfoArticle }) => (
        <Card style={styles.articleCard} onPress={() => navigateToDetail(item)}>
            <View style={styles.articleHeader}>
                <Text style={styles.articleTitle}>{item.title}</Text>
                <Icon name="chevron-right" size={24} color="#999"/>
            </View>
            <Text style={styles.articleSummary}>{item.summary}</Text>
            <View style={styles.articleFooter}>
                <Text style={styles.articleDate}>{new Date(item.publishDate).toLocaleDateString('ko-KR')}</Text>
                <View style={styles.tagContainer}>
                    {item.tags.slice(0, 2).map((tag, index) => (
                        <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>{tag}</Text>
                        </View>
                    ))}
                    {item.tags.length > 2 && (
                        <Text style={styles.moreTags}>+{item.tags.length - 2}</Text>
                    )}
                </View>
            </View>
        </Card>
    );

    return (
        <MainLayout>
            <View style={styles.container}>
                <Text style={styles.screenTitle}>정보 센터</Text>
                {renderTypeTabs()}
                {renderCategories()}

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#007AFF"/>
                    </View>
                ) : (
                    <FlatList
                        data={articles}
                        keyExtractor={(item) => item.id}
                        renderItem={renderArticleItem}
                        contentContainerStyle={styles.articleList}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh}/>
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Icon name="info" size={48} color="#ccc"/>
                                <Text style={styles.emptyText}>정보가 없습니다.</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </MainLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
    },
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 8,
        backgroundColor: '#eee',
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    selectedTab: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        color: '#666',
    },
    selectedTabText: {
        fontWeight: 'bold',
        color: '#007AFF',
    },
    categoryList: {
        marginBottom: 16,
        paddingHorizontal: 12,
    },
    categoryItem: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 4,
        borderRadius: 20,
        backgroundColor: '#eee',
    },
    selectedCategoryItem: {
        backgroundColor: '#007AFF',
    },
    categoryText: {
        fontSize: 14,
        color: '#666',
    },
    selectedCategoryText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    articleList: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    articleCard: {
        marginBottom: 12,
        padding: 16,
    },
    articleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    articleTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
    },
    articleSummary: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    articleFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    articleDate: {
        fontSize: 12,
        color: '#999',
    },
    tagContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tag: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 4,
    },
    tagText: {
        fontSize: 10,
        color: '#666',
    },
    moreTags: {
        fontSize: 10,
        color: '#999',
        marginLeft: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    emptyText: {
        marginTop: 8,
        fontSize: 16,
        color: '#999',
    },
});

export default InfoListScreen;
