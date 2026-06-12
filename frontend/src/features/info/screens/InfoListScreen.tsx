import {AppToast, AppBadge, AppCard, AppHeader, AppInput, AppText, EmptyState, LoadingState, ScreenContainer, SegmentedControl} from '../../../common/components/ds';
import React, {useEffect, useState} from 'react';
import {FlatList, StyleSheet, View, Pressable} from 'react-native';
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

    const fetchCategories = async () => {
        try {
            const service = getServiceByType(selectedType);
            const data = await service.getCategories();
            setCategories(data);
            if (data.length > 0) {
                setSelectedCategory(data[0].id);
            }
        } catch (error) {
            AppToast.error('카테고리 목록을 불러오는 데 실패했어요. 다시 시도해 주세요.');
        }
    };

    const fetchArticles = async () => {
        if (!selectedCategory) {
            return;
        }
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
            AppToast.error('정보 목록을 불러오는 데 실패했어요. 다시 시도해 주세요.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedType]);

    useEffect(() => {
        if (selectedCategory) {
            fetchArticles();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategory]);

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
                                onPress={() => setSelectedCategory(item.id)}
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
                        <AppCard variant="flat" onPress={() => navigateToDetail(item)} style={styles.articleCard}>
                            <View style={styles.articleHeader}>
                                <AppText variant="titleMd" style={styles.flex}>{item.title}</AppText>
                                <AppText variant="bodyLg" tone="tertiary">›</AppText>
                            </View>
                            <AppText variant="caption" tone="secondary" numberOfLines={2} style={styles.summary}>{item.summary}</AppText>
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
                            ? <EmptyState glyph="🔍" markColor={c.surfaceMuted} title="검색 결과가 없어요" description="다른 검색어를 입력해 보세요." />
                            : <EmptyState glyph="ⓘ" markColor={c.surfaceMuted} title="정보가 없어요" description="다른 분류를 확인해 보세요." />
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
    articleList: {paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm},
    flexCenter: {flexGrow: 1, justifyContent: 'center'},
    articleCard: {},
    articleHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    flex: {flex: 1},
    summary: {marginTop: spacing.xs},
    articleFooter: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm},
    tags: {flexDirection: 'row', gap: spacing.xs},
});

export default InfoListScreen;
