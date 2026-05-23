import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    FlatList,
    RefreshControl,
    Alert,
} from 'react-native';
import  LinearGradient  from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationProp } from '@react-navigation/native';
import  Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../../common/components/logo/Colors';
import policyService from '../../info/services/policyService';
import storeService from '../../store/services/storeService';
import laborInfoService from '../../../services/laborInfoService';
import SectionCard from '../../../common/components/sections/SectionCard';
import SectionHeader from '../../../common/components/sections/SectionHeader';
import { InfoSlot } from '../components/RoleSlots';

interface MasterMyPageScreenProps {
    navigation: NavigationProp<any>;
}

interface StoreInfo {
    id: number;
    storeName: string;
    businessNumber: string;
    storePhoneNumber: string;
    businessType: string;
    storeCode: string;
    fullAddress: string;
    storeStandardHourWage: number;
    monthlyLaborCost: number;
    employeeCount: number;
    todayAttendance: number;
    monthlyRevenue: number;
}

interface PolicyInfo {
    id: number;
    title: string;
    category: string;
    deadline: string;
    description: string;
    isNew: boolean;
}

interface LaborInfo {
    minimumWage: number;
    year: number;
    weeklyMaxHours: number;
    overtimeRate: number;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

export default function MasterMyPageScreen({ navigation }: MasterMyPageScreenProps) {
    const [stores, setStores] = useState<StoreInfo[]>([]);
    const [policies, setPolicies] = useState<PolicyInfo[]>([]);
    const [laborInfo, setLaborInfo] = useState<LaborInfo | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [masterInfo, setMasterInfo] = useState({
        name: '김소상',
        businessLicenseNumber: '123-45-67890',
        totalStores: 0,
        totalEmployees: 0,
        monthlyTotalLaborCost: 0,
    });

    const storeScrollRef = useRef<FlatList>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // TODO: AuthContext에서 실제 userId 가져오기
            const userId = 1; // 임시 하드코딩

            // Store API 호출
            const storeData = await storeService.getMasterStores(userId);

            // StoreSummaryDto를 StoreInfo 형식으로 매핑
            const apiStores: StoreInfo[] = storeData.map(store => ({
                id: store.id,
                storeName: store.storeName,
                businessNumber: store.businessNumber || '',
                storePhoneNumber: store.storePhoneNumber || '',
                businessType: store.businessType || '',
                storeCode: store.storeCode || '',
                fullAddress: store.fullAddress || '',
                storeStandardHourWage: store.storeStandardHourWage || 9620,
                monthlyLaborCost: store.monthlyLaborCost || 0,
                employeeCount: store.employeeCount || 0,
                todayAttendance: store.todayAttendance || 0,
                monthlyRevenue: store.monthlyRevenue || 0,
            }));

            // 정책 정보: info 서비스 연동 (상위 3개 노출)
            const policyDtos: any[] = await policyService.getPoliciesByCategory('ALL');
            const mockPolicies: PolicyInfo[] = (policyDtos || []).slice(0, 3).map((dto: any) => {
                const createdAt = dto.publishDate || dto.createdAt || new Date().toISOString();
                const updatedAt = dto.updatedAt || createdAt;
                const isNew = (() => {
                    try {
                        const created = new Date(createdAt).getTime();
                        return Date.now() - created < 7 * 24 * 60 * 60 * 1000; // 7일 이내
                    } catch {
                        return false;
                    }
                })();
                const deadline = (updatedAt || '').toString().slice(0, 10);
                return {
                    id: Number(dto.id),
                    title: dto.title || '',
                    category: '국가정책',
                    deadline,
                    description: (dto.content ? String(dto.content).slice(0, 80) : '').trim(),
                    isNew,
                } as PolicyInfo;
            });

            // LaborInfo API 호출
            const laborData = await laborInfoService.getCurrentLaborInfo();
            const apiLaborInfo: LaborInfo = {
                minimumWage: laborData.minimumWage,
                year: laborData.year,
                weeklyMaxHours: laborData.weeklyMaxHours,
                overtimeRate: laborData.overtimeRate,
            };

            setStores(apiStores);
            setPolicies(mockPolicies);
            setLaborInfo(apiLaborInfo);

            // 마스터 정보 업데이트
            const totalEmployees = apiStores.reduce((sum, store) => sum + store.employeeCount, 0);
            const totalLaborCost = apiStores.reduce((sum, store) => sum + store.monthlyLaborCost, 0);

            setMasterInfo(prev => ({
                ...prev,
                totalStores: apiStores.length,
                totalEmployees,
                monthlyTotalLaborCost: totalLaborCost,
            }));

        } catch (error) {
            Alert.alert('오류', '데이터를 불러오는데 실패했습니다.');
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ko-KR').format(amount);
    };

    const handleStorePress = (store: StoreInfo) => {
        navigation.navigate('StoreDetailScreen', { storeId: store.id });
    };

    const handlePolicyPress = (policy: PolicyInfo) => {
        navigation.navigate('PolicyDetail', { policyId: policy.id });
    };

    const handleAddStore = () => {
        // HomeNavigator에 등록된 라우트로 이동
        navigation.navigate('StoreRegistration' as never);
    };

    const renderStoreCard = ({ item: store }: { item: StoreInfo }) => (
        <TouchableOpacity
            style={styles.storeCard}
            onPress={() => handleStorePress(store)}
            activeOpacity={0.8}
        >
            <LinearGradient
                colors={['#FF6B35', '#FF8A65']}
                style={styles.storeCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.storeCardHeader}>
                    <Text style={styles.storeName}>{store.storeName}</Text>
                    <View style={styles.storeTypeTag}>
                        <Text style={styles.storeTypeText}>{store.businessType}</Text>
                    </View>
                </View>

                <View style={styles.storeStats}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>이번달 인건비</Text>
                        <Text style={styles.statValue}>{formatCurrency(store.monthlyLaborCost)}원</Text>
                    </View>

                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>직원 수</Text>
                        <Text style={styles.statValue}>{store.employeeCount}명</Text>
                    </View>
                </View>

                <View style={styles.storeStats}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>오늘 출근</Text>
                        <Text style={styles.statValue}>{store.todayAttendance}명</Text>
                    </View>

                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>이번달 매출</Text>
                        <Text style={styles.statValue}>{formatCurrency(store.monthlyRevenue)}원</Text>
                    </View>
                </View>

                <View style={styles.storeFooter}>
                    <Text style={styles.storeAddress}>{store.fullAddress}</Text>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );

    const renderPolicyCard = (policy: PolicyInfo) => (
        <TouchableOpacity
            key={policy.id}
            style={styles.policyCard}
            onPress={() => handlePolicyPress(policy)}
            activeOpacity={0.8}
        >
            <View style={styles.policyHeader}>
                <View style={styles.policyTitleRow}>
                    <Text style={styles.policyTitle}>{policy.title}</Text>
                    {policy.isNew && (
                        <View style={styles.newBadge}>
                            <Text style={styles.newBadgeText}>NEW</Text>
                        </View>
                    )}
                </View>
                <View style={styles.policyCategoryTag}>
                    <Text style={styles.policyCategoryText}>{policy.category}</Text>
                </View>
            </View>

            <Text style={styles.policyDescription}>{policy.description}</Text>

            <View style={styles.policyFooter}>
                <Text style={styles.policyDeadline}>마감: {policy.deadline}</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.GRAY_400} />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* 헤더 */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <Text style={styles.greeting}>안녕하세요, {masterInfo.name}님</Text>
                        <Text style={styles.subGreeting}>오늘도 화이팅하세요! 💪</Text>
                    </View>

                    <TouchableOpacity style={styles.notificationButton}>
                        <Ionicons name="notifications-outline" size={24} color={COLORS.GRAY_600} />
                    </TouchableOpacity>
                </View>

                {/* 전체 현황 카드 */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>전체 현황</Text>
                    <View style={styles.summaryGrid}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>운영 매장</Text>
                            <Text style={styles.summaryValue}>{masterInfo.totalStores}개</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>전체 직원</Text>
                            <Text style={styles.summaryValue}>{masterInfo.totalEmployees}명</Text>
                        </View>
                        <View style={styles.summaryItemFull}>
                            <Text style={styles.summaryLabel}>이번달 총 인건비</Text>
                            <Text style={styles.summaryValueLarge}>{formatCurrency(masterInfo.monthlyTotalLaborCost)}원</Text>
                        </View>
                    </View>
                </View>

                {/* 매장 목록 */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>내 매장</Text>
                        <TouchableOpacity onPress={handleAddStore}>
                            <Text style={styles.sectionMore}>매장 추가</Text>
                        </TouchableOpacity>
                    </View>

                    {stores.length === 0 ? (
                        <View style={styles.emptyStateCard}>
                            <Ionicons name="storefront-outline" size={40} color={COLORS.GRAY_400} />
                            <Text style={styles.emptyStateTitle}>등록된 매장이 없습니다</Text>
                            <Text style={styles.emptyStateDesc}>매장을 추가하고 직원과 급여를 관리해보세요</Text>
                            <TouchableOpacity style={styles.addStoreButton} onPress={handleAddStore}>
                                <Text style={styles.addStoreButtonText}>매장 추가하기</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <FlatList
                            ref={storeScrollRef}
                            data={stores}
                            renderItem={renderStoreCard}
                            keyExtractor={(item) => item.id.toString()}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            snapToInterval={CARD_WIDTH + 16}
                            decelerationRate="fast"
                            contentContainerStyle={styles.storeList}
                        />
                    )}
                </View>

                {/* 빠른 메뉴 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>매장 관리</Text>
                    <View style={styles.quickMenuGrid}>
                        <TouchableOpacity style={styles.quickMenuItem}>
                            <View style={[styles.quickMenuIcon, { backgroundColor: '#E3F2FD' }]}>
                                <Ionicons name="people-outline" size={24} color={COLORS.SODAM_BLUE} />
                            </View>
                            <Text style={styles.quickMenuText}>직원 관리</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.quickMenuItem}>
                            <View style={[styles.quickMenuIcon, { backgroundColor: '#E8F5E8' }]}>
                                <Ionicons name="time-outline" size={24} color={COLORS.SODAM_GREEN} />
                            </View>
                            <Text style={styles.quickMenuText}>근태 관리</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.quickMenuItem}>
                            <View style={[styles.quickMenuIcon, { backgroundColor: '#FFF3E0' }]}>
                                <Ionicons name="card-outline" size={24} color={COLORS.SODAM_ORANGE} />
                            </View>
                            <Text style={styles.quickMenuText}>급여 관리</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.quickMenuItem}>
                            <View style={[styles.quickMenuIcon, { backgroundColor: '#F3E5F5' }]}>
                                <Ionicons name="bar-chart-outline" size={24} color="#9C27B0" />
                            </View>
                            <Text style={styles.quickMenuText}>매출 분석</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 정부 정책 정보 */}
                <InfoSlot testID="slotInfoPolicies">
                <View style={styles.section}>
                    <SectionCard>
                        <SectionHeader
                          title="정부 지원 정책"
                          onPressAction={() => navigation.navigate('InfoList')}
                          actionLabel="더보기"
                        />
                        <View style={styles.policyList}>
                            {policies.map(renderPolicyCard)}
                        </View>
                    </SectionCard>
                </View>
                </InfoSlot>

                {/* 노무 정보 */}
                {laborInfo && (
                    <InfoSlot testID="slotInfoLabor">
                    <View style={styles.section}>
                        <SectionCard>
                            <SectionHeader title={`${laborInfo.year}년 노무 정보`} onPressAction={() => navigation.navigate('InfoList')} actionLabel="자세히" />
                            <View style={styles.laborInfoCard}>
                            <View style={styles.laborInfoGrid}>
                                <View style={styles.laborInfoItem}>
                                    <Text style={styles.laborInfoLabel}>최저임금</Text>
                                    <Text style={styles.laborInfoValue}>{formatCurrency(laborInfo.minimumWage)}원</Text>
                                </View>
                                <View style={styles.laborInfoItem}>
                                    <Text style={styles.laborInfoLabel}>주 최대 근무시간</Text>
                                    <Text style={styles.laborInfoValue}>{laborInfo.weeklyMaxHours}시간</Text>
                                </View>
                                <View style={styles.laborInfoItem}>
                                    <Text style={styles.laborInfoLabel}>연장근무 수당</Text>
                                    <Text style={styles.laborInfoValue}>{laborInfo.overtimeRate}배</Text>
                                </View>
                            </View>

                            <TouchableOpacity style={styles.laborInfoButton} onPress={() => navigation.navigate('InfoList')}>
                                <Text style={styles.laborInfoButtonText}>근로기준법 자세히 보기</Text>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.SODAM_BLUE} />
                            </TouchableOpacity>
                        </View>
                        </SectionCard>
                    </View>
                    </InfoSlot>
                )}

                {/* 하단 여백 */}
                <View style={styles.bottomSpacing} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.GRAY_50,
    },
    scrollView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: COLORS.WHITE,
    },
    headerContent: {
        flex: 1,
    },
    greeting: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.GRAY_800,
        marginBottom: 4,
    },
    subGreeting: {
        fontSize: 14,
        color: COLORS.GRAY_600,
    },
    notificationButton: {
        padding: 8,
    },
    summaryCard: {
        backgroundColor: COLORS.WHITE,
        margin: 20,
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.GRAY_800,
        marginBottom: 16,
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    summaryItem: {
        width: '48%',
        marginBottom: 16,
    },
    summaryItemFull: {
        width: '100%',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.GRAY_200,
    },
    summaryLabel: {
        fontSize: 14,
        color: COLORS.GRAY_600,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.GRAY_800,
    },
    summaryValueLarge: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.SODAM_ORANGE,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.GRAY_800,
    },
    sectionMore: {
        fontSize: 14,
        color: COLORS.SODAM_BLUE,
        fontWeight: '500',
    },
    storeList: {
        paddingLeft: 20,
    },
    storeCard: {
        width: CARD_WIDTH,
        marginRight: 16,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    storeCardGradient: {
        padding: 20,
    },
    storeCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    storeName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.WHITE,
        flex: 1,
    },
    storeTypeTag: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    storeTypeText: {
        fontSize: 12,
        color: COLORS.WHITE,
        fontWeight: '500',
    },
    storeStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    statItem: {
        flex: 1,
    },
    statLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.WHITE,
    },
    storeFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.2)',
    },
    storeAddress: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        flex: 1,
    },
    quickMenuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
    },
    quickMenuItem: {
        width: '25%',
        alignItems: 'center',
        marginBottom: 20,
    },
    quickMenuIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    quickMenuText: {
        fontSize: 12,
        color: COLORS.GRAY_700,
        textAlign: 'center',
    },
    emptyStateCard: {
        backgroundColor: COLORS.WHITE,
        marginHorizontal: 20,
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    emptyStateTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.GRAY_800,
        marginTop: 12,
        marginBottom: 6,
        textAlign: 'center',
    },
    emptyStateDesc: {
        fontSize: 14,
        color: COLORS.GRAY_600,
        textAlign: 'center',
        marginBottom: 12,
    },
    addStoreButton: {
        backgroundColor: COLORS.SODAM_ORANGE,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 140,
    },
    addStoreButtonText: {
        color: COLORS.WHITE,
        fontSize: 16,
        fontWeight: 'bold',
    },
    policyList: {
        paddingHorizontal: 20,
    },
    policyCard: {
        backgroundColor: COLORS.WHITE,
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    policyHeader: {
        marginBottom: 8,
    },
    policyTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    policyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.GRAY_800,
        flex: 1,
    },
    newBadge: {
        backgroundColor: COLORS.SODAM_ORANGE,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    newBadgeText: {
        fontSize: 10,
        color: COLORS.WHITE,
        fontWeight: 'bold',
    },
    policyCategoryTag: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.GRAY_100,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    policyCategoryText: {
        fontSize: 12,
        color: COLORS.GRAY_600,
        fontWeight: '500',
    },
    policyDescription: {
        fontSize: 14,
        color: COLORS.GRAY_600,
        marginBottom: 12,
        lineHeight: 20,
    },
    policyFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    policyDeadline: {
        fontSize: 12,
        color: COLORS.GRAY_500,
    },
    laborInfoCard: {
        backgroundColor: COLORS.WHITE,
        margin: 20,
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    laborInfoGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    laborInfoItem: {
        flex: 1,
        alignItems: 'center',
    },
    laborInfoLabel: {
        fontSize: 12,
        color: COLORS.GRAY_600,
        marginBottom: 4,
        textAlign: 'center',
    },
    laborInfoValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.GRAY_800,
    },
    laborInfoButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.GRAY_200,
    },
    laborInfoButtonText: {
        fontSize: 14,
        color: COLORS.SODAM_BLUE,
        fontWeight: '500',
        marginRight: 4,
    },
    bottomSpacing: {
        height: 40,
    },
});
