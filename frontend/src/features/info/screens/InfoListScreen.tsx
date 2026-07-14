import {AppToast, AppBadge, AppCard, AppHeader, AppInput, AppText, EmptyState, LoadingState, ScreenContainer, SegmentedControl} from '../../../common/components/ds';
import React, {useEffect, useState} from 'react';
import {FlatList, StyleSheet, View, Pressable} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import laborInfoService from '../services/laborInfoService';
import taxInfoService from '../services/taxInfoService';
import policyService from '../services/policyService';
import tipsService from '../services/tipsService';
import {InfoArticle, InfoCategory} from '../types';

type InfoStackParamList = {
    InfoList: undefined;
    LaborInfoDetail: {infoId: string};
    TaxInfoDetail: {taxInfoId: number};
    PolicyDetail: {policyId: number};
    TipsDetail: {tipId: number};
};

type InfoListScreenNavigationProp = NativeStackNavigationProp<InfoStackParamList, 'InfoList'>;
type InfoType = 'LABOR' | 'TAX' | 'POLICY' | 'TIPS';

const TYPES: InfoType[] = ['LABOR', 'TAX', 'POLICY', 'TIPS'];
const TYPE_LABELS = ['노동법', '세금', '정책', '팁'];

/**
 * 32 InfoList — 확정 시안.
 * 노무/세무/정책/팁 정보 센터. 서비스 조회·라우팅 로직 보존.
 */
const InfoListScreen = () => {
    const navigation = useNavigation<InfoListScreenNavigationProp>();
    const [typeIndex, setTypeIndex] = useState(0);
    const [categories, setCategories] = useState<InfoCategory[]>([]);
    const [articles, setArticles] = useState<InfoArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState('');

    const selectedType = TYPES[typeIndex];

    // 현재 목록을 제목/요약 기준으로 화면 내 필터 (별도 검색 API 없이 클라이언트 필터)
    const visibleArticles = query.trim()
        ? articles.filter(a => {
            const q = query.trim().toLowerCase();
            return (a.title ?? '').toLowerCase().includes(q) || (a.summary ?? '').toLowerCase().includes(q);
        })
        : articles;

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

    // 특정 (탭 유형, 카테고리) 조합의 목록을 명시적 인자로 조회한다.
    // selectedType/selectedCategory state에 의존하면, 탭 전환 시 카테고리 값이
    // 우연히 동일(예: 모든 탭이 'ALL' 단일 카테고리)한 경우 state가 바뀌지 않아
    // articles 재조회 useEffect가 트리거되지 않는 회귀가 발생한다.
    const fetchArticlesFor = async (type: InfoType, categoryId: string) => {
        try {
            setLoading(true);
            const service = getServiceByType(type);
            let data: InfoArticle[] = [];
            switch (type) {
                case 'LABOR':
                    data = await (service as typeof laborInfoService).getLaborInfosByCategory(categoryId);
                    break;
                case 'TAX':
                    data = await (service as typeof taxInfoService).getTaxInfosByCategory(categoryId);
                    break;
                case 'POLICY':
                    data = await (service as typeof policyService).getPoliciesByCategory(categoryId);
                    break;
                case 'TIPS':
                    data = await (service as typeof tipsService).getTipsByCategory(categoryId);
                    break;
            }
            setArticles(data);
        } catch (error) {
            AppToast.error('정보 목록을 불러오는 데 실패했어요. 다시 시도해 주세요.');
        } finally {
            setLoading(false);
        }
    };

    // 탭(유형) 전환 시 카테고리 목록과 게시글 목록을 함께 새로 불러온다.
    // 카테고리 응답을 기다린 뒤 결과 값을 직접 fetchArticlesFor에 넘겨,
    // selectedCategory state 변경 여부와 무관하게 항상 새 탭의 목록을 갱신한다.
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const service = getServiceByType(selectedType);
                const data = await service.getCategories();
                if (cancelled) {
                    return;
                }
                setCategories(data);
                const firstCategoryId = data.length > 0 ? data[0].id : null;
                setSelectedCategory(firstCategoryId);
                if (firstCategoryId) {
                    await fetchArticlesFor(selectedType, firstCategoryId);
                } else {
                    setArticles([]);
                }
            } catch (error) {
                if (!cancelled) {
                    AppToast.error('카테고리 목록을 불러오는 데 실패했어요. 다시 시도해 주세요.');
                }
            }
        };
        load();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedType]);

    // 사용자가 카테고리 칩을 직접 탭했을 때만 호출 — 탭 전환과 분리된 경로.
    const handleSelectCategory = (categoryId: string) => {
        setSelectedCategory(categoryId);
        fetchArticlesFor(selectedType, categoryId);
    };

    const navigateToDetail = (article: InfoArticle) => {
        switch (selectedType) {
            case 'LABOR':
                navigation.navigate('LaborInfoDetail', {infoId: article.id});
                break;
            case 'TAX':
                navigation.navigate('TaxInfoDetail', {taxInfoId: Number(article.id)});
                break;
            case 'POLICY':
                navigation.navigate('PolicyDetail', {policyId: Number(article.id)});
                break;
            case 'TIPS':
                navigation.navigate('TipsDetail', {tipId: Number(article.id)});
                break;
        }
    };

    const c = useThemeColors();
    return (
        <ScreenContainer padded={false} header={<AppHeader title="노무 정보" actions={[{label: searchOpen ? '닫기' : '검색', onPress: () => setSearchOpen(o => { if (o) { setQuery(''); } return !o; })}]} />}>
            <View style={styles.controls}>
                {searchOpen ? (
                    <AppInput
                        placeholder="제목·내용으로 검색"
                        value={query}
                        onChangeText={setQuery}
                        autoFocus
                    />
                ) : null}
                <SegmentedControl options={TYPE_LABELS} value={typeIndex} onChange={setTypeIndex} />
                <FlatList
                    data={categories}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={item => item.id}
                    style={styles.categoryList}
                    contentContainerStyle={styles.categoryContent}
                    renderItem={({item}) => {
                        const on = selectedCategory === item.id;
                        return (
                            <Pressable
                                onPress={() => handleSelectCategory(item.id)}
                                style={[styles.chip, {backgroundColor: on ? c.brandPrimary : c.surfaceMuted}]}>
                                <AppText variant="caption" weight="800" tone={on ? 'inverse' : 'secondary'}>{item.name}</AppText>
                            </Pressable>
                        );
                    }}
                />
            </View>

            {loading ? (
                <LoadingState title="불러오는 중" description="정보를 불러오고 있어요" />
            ) : (
                <FlatList
                    data={visibleArticles}
                    keyExtractor={item => item.id}
                    contentContainerStyle={visibleArticles.length === 0 ? styles.flexCenter : styles.articleList}
                    renderItem={({item}) => (
                        <AppCard variant="plain" onPress={() => navigateToDetail(item)} style={styles.articleCard}>
                            <View style={styles.articleHeader}>
                                <AppText variant="headingSm" style={styles.flex} numberOfLines={2}>{item.title}</AppText>
                                <Ionicons name="chevron-forward" size={20} color={c.textTertiary} />
                            </View>
                            <AppText variant="bodyMd" tone="secondary" numberOfLines={2} style={styles.summary}>{item.summary}</AppText>
                            <View style={styles.articleFooter}>
                                <AppText variant="caption" tone="tertiary">{new Date(item.publishDate).toLocaleDateString('ko-KR')}</AppText>
                                <View style={styles.tags}>
                                    {item.tags.slice(0, 2).map((tag, i) => (
                                        <AppBadge key={i} label={tag} tone="info" />
                                    ))}
                                </View>
                            </View>
                        </AppCard>
                    )}
                    ListEmptyComponent={
                        query.trim()
                            ? <EmptyState glyph={<Ionicons name="search-outline" size={40} color={c.textInverse} />} markColor={c.brandSecondary} title="검색 결과가 없어요" description="다른 검색어를 입력해 보세요." />
                            : <EmptyState glyph={<Ionicons name="document-text-outline" size={40} color={c.textInverse} />} markColor={c.brandSecondary} title="정보가 없어요" description="다른 분류를 확인해 보세요." />
                    }
                />
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    controls: {paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md},
    categoryList: {marginBottom: spacing.sm},
    categoryContent: {gap: spacing.sm, paddingRight: spacing.lg},
    chip: {paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill},
    articleList: {paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md},
    flexCenter: {flexGrow: 1, justifyContent: 'center'},
    articleCard: {},
    articleHeader: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm},
    flex: {flex: 1},
    summary: {marginTop: spacing.sm},
    articleFooter: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md},
    tags: {flexDirection: 'row', gap: spacing.xs},
});

export default InfoListScreen;
