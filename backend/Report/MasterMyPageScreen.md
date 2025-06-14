import React, {useEffect, useState} from 'react';
import {
ActivityIndicator,
Alert,
FlatList,
Image,
RefreshControl,
SafeAreaView,
ScrollView,
StyleSheet,
Text,
TouchableOpacity,
View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';

// 네비게이션 타입 정의
type RootStackParamList = {
Home: undefined;
Login: undefined;
StoreDetail: { storeId: number };
EmployeeManagement: { storeId: number };
StoreSettings: { storeId: number };
PayrollManagement: { storeId: number };
TimeOffApprovals: { storeId: number };
ProfileEdit: undefined;
AddStore: undefined;
};

type MasterMyPageScreenNavigationProp = StackNavigationProp<RootStackParamList>;

// 매장 타입 정의
interface Store {
id: number;
name: string;
address: string;
employeeCount: number;
monthlyLaborCost: number;
logoUrl?: string;
}

// 매장 통계 타입 정의
interface StoreStats {
totalEmployees: number;
totalLaborCost: number;
averageHourlyWage: number;
pendingTimeOffRequests: number;
month: string;
}

// 직원 타입 정의
interface Employee {
id: number;
name: string;
position: string;
hourlyWage: number;
workHours: number;
profileImageUrl?: string;
}

// 급여 내역 타입 정의
interface Payroll {
id: number;
storeId: number;
storeName: string;
month: string;
totalAmount: number;
employeeCount: number;
status: 'PENDING' | 'PROCESSED' | 'COMPLETED';
processedDate: string | null;
}

// 휴가 신청 타입
interface TimeOff {
id: number;
employeeId: number;
employeeName: string;
storeId: number;
storeName: string;
startDate: string;
endDate: string;
reason: string;
status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

// 매출 데이터 타입
interface Revenue {
month: string;
amount: number;
}

// 인건비 데이터 타입
interface LaborCost {
month: string;
amount: number;
}

const MasterMyPageScreen = () => {
const navigation = useNavigation<MasterMyPageScreenNavigationProp>();

    // 상태 관리
    const [isLoading, setIsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedStore, setSelectedStore] = useState<Store | null>(null);
    const [stores, setStores] = useState<Store[]>([]);
    const [storeStats, setStoreStats] = useState<StoreStats | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [payrolls, setPayrolls] = useState<Payroll[]>([]);
    const [timeOffRequests, setTimeOffRequests] = useState<TimeOff[]>([]);
    const [monthlyRevenue, setMonthlyRevenue] = useState<Revenue[]>([]);
    const [monthlyLaborCost, setMonthlyLaborCost] = useState<LaborCost[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<string>(
        new Date().toISOString().slice(0, 7) // 현재 연월(YYYY-MM)
    );
    const [showAddStoreModal, setShowAddStoreModal] = useState(false);
    const [combinedStats, setCombinedStats] = useState({
        totalStores: 0,
        totalEmployees: 0,
        totalLaborCost: 0,
        pendingTimeOffRequests: 0,
    });

    // 이전 6개월 목록 생성
    const getLastSixMonths = () => {
        const months = [];
        const currentDate = new Date();

        for (let i = 0; i < 6; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthString = date.toISOString().slice(0, 7);
            const displayText = `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
            months.push({value: monthString, label: displayText});
        }

        return months;
    };

    const monthOptions = getLastSixMonths();

    // 데이터 로딩 함수
    const loadData = async () => {
        setIsLoading(true);
        try {
            // 실제 구현에서는 API 호출
            // 1. 소유한 매장 목록 조회
            await fetchStores();

            // 2. 선택된 매장이 있으면 해당 매장의 통계 로드
            if (selectedStore) {
                await fetchStoreStats();
                await fetchEmployees();
            }

            // 3. 급여 내역 로드
            await fetchPayrolls();

            // 4. 휴가 신청 내역 로드
            await fetchTimeOffRequests();

            // 5. 월별 매출 및 인건비 추이 데이터 로드
            await fetchMonthlyData();

            // 6. 통합 통계 로드
            await fetchCombinedStats();

        } catch (error) {
            Alert.alert('오류', '데이터를 불러오는 중 오류가 발생했습니다.');
            console.error(error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    // 매장 목록 조회 (임시 데이터)
    const fetchStores = async () => {
        // 실제 API 호출 대신 임시 데이터
        const storesData: Store[] = [
            {
                id: 1,
                name: '소담 카페 강남점',
                address: '서울시 강남구 역삼동 123-45',
                employeeCount: 8,
                monthlyLaborCost: 8500000
            },
            {
                id: 2,
                name: '소담 레스토랑 홍대점',
                address: '서울시 마포구 서교동 345-67',
                employeeCount: 12,
                monthlyLaborCost: 12000000
            },
            {
                id: 3,
                name: '소담 베이커리 종로점',
                address: '서울시 종로구 관철동 89-12',
                employeeCount: 5,
                monthlyLaborCost: 4500000
            },
        ];

        setStores(storesData);

        // 아직 선택된 매장이 없으면 첫 번째 매장 선택
        if (!selectedStore && storesData.length > 0) {
            setSelectedStore(storesData[0]);
        }
    };

    // 매장 통계 조회 (임시 데이터)
    const fetchStoreStats = async () => {
        if (!selectedStore) {
            return;
        }

        // 실제 API 호출 대신 임시 데이터
        setTimeout(() => {
            const statsData: StoreStats = {
                totalEmployees: selectedStore.employeeCount,
                totalLaborCost: selectedStore.monthlyLaborCost,
                averageHourlyWage: Math.round(selectedStore.monthlyLaborCost / (selectedStore.employeeCount * 160)),
                pendingTimeOffRequests: 3,
                month: selectedMonth,
            };

            setStoreStats(statsData);
        }, 500);
    };

    // 직원 목록 조회 (임시 데이터)
    const fetchEmployees = async () => {
        if (!selectedStore) {
            return;
        }

        // 실제 API 호출 대신 임시 데이터
        setTimeout(() => {
            const employeesData: Employee[] = [
                {
                    id: 101,
                    name: '김소담',
                    position: '매니저',
                    hourlyWage: 12000,
                    workHours: 160,
                },
                {
                    id: 102,
                    name: '이하늘',
                    position: '바리스타',
                    hourlyWage: 10000,
                    workHours: 120,
                },
                {
                    id: 103,
                    name: '박별',
                    position: '바리스타',
                    hourlyWage: 10000,
                    workHours: 80,
                },
                {
                    id: 104,
                    name: '최달',
                    position: '주방 보조',
                    hourlyWage: 9500,
                    workHours: 100,
                },
            ];

            setEmployees(employeesData);
        }, 500);
    };

    // 급여 내역 조회 (임시 데이터)
    const fetchPayrolls = async () => {
        // 실제 API 호출 대신 임시 데이터
        setTimeout(() => {
            const payrollsData: Payroll[] = [
                {
                    id: 201,
                    storeId: 1,
                    storeName: '소담 카페 강남점',
                    month: '2023-10',
                    totalAmount: 8200000,
                    employeeCount: 8,
                    status: 'COMPLETED',
                    processedDate: '2023-11-05',
                },
                {
                    id: 202,
                    storeId: 2,
                    storeName: '소담 레스토랑 홍대점',
                    month: '2023-10',
                    totalAmount: 11800000,
                    employeeCount: 12,
                    status: 'COMPLETED',
                    processedDate: '2023-11-05',
                },
                {
                    id: 203,
                    storeId: 3,
                    storeName: '소담 베이커리 종로점',
                    month: '2023-10',
                    totalAmount: 4300000,
                    employeeCount: 5,
                    status: 'COMPLETED',
                    processedDate: '2023-11-05',
                },
            ];

            setPayrolls(payrollsData);
        }, 500);
    };

    // 휴가 신청 내역 조회 (임시 데이터)
    const fetchTimeOffRequests = async () => {
        // 실제 API 호출 대신 임시 데이터
        setTimeout(() => {
            const timeOffData: TimeOff[] = [
                {
                    id: 301,
                    employeeId: 102,
                    employeeName: '이하늘',
                    storeId: 1,
                    storeName: '소담 카페 강남점',
                    startDate: '2023-12-25',
                    endDate: '2023-12-26',
                    reason: '개인 사유',
                    status: 'PENDING',
                },
                {
                    id: 302,
                    employeeId: 103,
                    employeeName: '박별',
                    storeId: 1,
                    storeName: '소담 카페 강남점',
                    startDate: '2023-12-24',
                    endDate: '2023-12-24',
                    reason: '병가',
                    status: 'PENDING',
                },
                {
                    id: 303,
                    employeeId: 105,
                    employeeName: '정해',
                    storeId: 2,
                    storeName: '소담 레스토랑 홍대점',
                    startDate: '2023-12-31',
                    endDate: '2024-01-01',
                    reason: '가족 행사',
                    status: 'PENDING',
                },
            ];

            setTimeOffRequests(timeOffData);
        }, 500);
    };

    // 월별 매출 및 인건비 추이 데이터 조회 (임시 데이터)
    const fetchMonthlyData = async () => {
        // 실제 API 호출 대신 임시 데이터
        setTimeout(() => {
            // 6개월 간의 매출 데이터
            const revenueData = [
                {month: '2023-06', amount: 35000000},
                {month: '2023-07', amount: 38000000},
                {month: '2023-08', amount: 36500000},
                {month: '2023-09', amount: 37200000},
                {month: '2023-10', amount: 39500000},
                {month: '2023-11', amount: 38700000},
            ];

            // 6개월 간의 인건비 데이터
            const laborCostData = [
                {month: '2023-06', amount: 23000000},
                {month: '2023-07', amount: 24500000},
                {month: '2023-08', amount: 24000000},
                {month: '2023-09', amount: 24200000},
                {month: '2023-10', amount: 25000000},
                {month: '2023-11', amount: 25500000},
            ];

            setMonthlyRevenue(revenueData);
            setMonthlyLaborCost(laborCostData);
        }, 500);
    };

    // 통합 통계 조회 (임시 데이터)
    const fetchCombinedStats = async () => {
        // 실제 API 호출 대신 임시 데이터
        setTimeout(() => {
            const combinedData = {
                totalStores: stores.length,
                totalEmployees: stores.reduce((sum, store) => sum + store.employeeCount, 0),
                totalLaborCost: stores.reduce((sum, store) => sum + store.monthlyLaborCost, 0),
                pendingTimeOffRequests: timeOffRequests.filter(req => req.status === 'PENDING').length,
            };

            setCombinedStats(combinedData);
        }, 500);
    };

    // 화면 로드 시 데이터 로딩
    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 매장 변경 시 해당 매장의 데이터 로딩
    useEffect(() => {
        if (selectedStore) {
            fetchStoreStats();
            fetchEmployees();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStore, selectedMonth]);

    // 새로고침 처리
    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    // 매장 선택 처리
    const handleStoreSelect = (store: Store) => {
        setSelectedStore(store);
    };

    // 휴가 승인 처리
    const handleApproveTimeOff = (timeOffId: number) => {
        // 실제 API 호출 구현 필요
        const updatedRequests = timeOffRequests.map(req =>
            req.id === timeOffId ? {...req, status: 'APPROVED'} : req
        );
        setTimeOffRequests(updatedRequests);
        Alert.alert('성공', '휴가 신청이 승인되었습니다.');
    };

    // 휴가 거부 처리
    const handleRejectTimeOff = (timeOffId: number) => {
        // 실제 API 호출 구현 필요
        const updatedRequests = timeOffRequests.map(req =>
            req.id === timeOffId ? {...req, status: 'REJECTED'} : req
        );
        setTimeOffRequests(updatedRequests);
        Alert.alert('성공', '휴가 신청이 거부되었습니다.');
    };

    // 매장 카드 렌더링
    const renderStoreCard = ({item}: { item: Store }) => {
        const isSelected = selectedStore?.id === item.id;

        return (
            <TouchableOpacity
                style={[
                    styles.storeCard,
                    isSelected && styles.selectedStoreCard,
                ]}
                onPress={() => handleStoreSelect(item)}
            >
                <View style={styles.storeLogoContainer}>
                    {item.logoUrl ? (
                        <Image source={{uri: item.logoUrl}} style={styles.storeLogo}/>
                    ) : (
                        <View style={styles.storeLogoPlaceholder}>
                            <Text style={styles.storeLogoText}>{item.name.charAt(0)}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.storeInfo}>
                    <Text style={styles.storeName}>{item.name}</Text>
                    <Text style={styles.storeAddress} numberOfLines={1}>{item.address}</Text>
                    <Text style={styles.storeEmployeeCount}>직원 수: {item.employeeCount}명</Text>
                </View>
                {isSelected && (
                    <View style={styles.selectedIndicator}>
                        <Text style={styles.selectedIndicatorText}>✓</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    // 휴가 신청 아이템 렌더링
    const renderTimeOffItem = ({item}: { item: TimeOff }) => {
        const startDate = new Date(item.startDate).toLocaleDateString('ko-KR');
        const endDate = new Date(item.endDate).toLocaleDateString('ko-KR');

        return (
            <View style={styles.timeOffItem}>
                <View style={styles.timeOffHeader}>
                    <Text style={styles.timeOffPeriod}>
                        {startDate} ~ {endDate}
                    </Text>
                    <View style={styles.timeOffStatus}>
                        <Text style={styles.timeOffStatusText}>
                            {item.status === 'PENDING' ? '검토 중' :
                                item.status === 'APPROVED' ? '승인됨' : '반려됨'}
                        </Text>
                    </View>
                </View>
                <View style={styles.timeOffEmployee}>
                    <Text style={styles.timeOffEmployeeName}>{item.employeeName}</Text>
                    <Text style={styles.timeOffStoreName}>{item.storeName}</Text>
                </View>
                <View style={styles.timeOffReason}>
                    <Text style={styles.timeOffReasonLabel}>사유:</Text>
                    <Text style={styles.timeOffReasonText}>{item.reason}</Text>
                </View>
                {item.status === 'PENDING' && (
                    <View style={styles.timeOffActions}>
                        <TouchableOpacity
                            style={[styles.timeOffActionButton, styles.timeOffApproveButton]}
                            onPress={() => handleApproveTimeOff(item.id)}
                        >
                            <Text style={styles.timeOffActionButtonText}>승인</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.timeOffActionButton, styles.timeOffRejectButton]}
                            onPress={() => handleRejectTimeOff(item.id)}
                        >
                            <Text style={styles.timeOffActionButtonText}>거부</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh}/>
                }
            >
                {/* 사용자 프로필 */}
                <View style={styles.profileSection}>
                    <View style={styles.profileHeader}>
                        <View style={styles.profileInfo}>
                            <View style={styles.profileImageContainer}>
                                <Image
                                    // source={require('../../assets/profile-placeholder.png')}
                                    style={styles.profileImage}
                                />
                            </View>
                            <View style={styles.profileDetails}>
                                <Text style={styles.profileName}>김사장</Text>
                                <Text style={styles.profileEmail}>master.kim@example.com</Text>
                                <TouchableOpacity
                                    style={styles.editProfileButton}
                                    onPress={() => navigation.navigate('ProfileEdit')}
                                >
                                    <Text style={styles.editProfileText}>프로필 수정</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 통합 통계 */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>통합 통계</Text>
                    </View>
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{combinedStats.totalStores}개</Text>
                            <Text style={styles.statLabel}>매장 수</Text>
                        </View>
                        <View style={styles.statDivider}/>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{combinedStats.totalEmployees}명</Text>
                            <Text style={styles.statLabel}>총 직원 수</Text>
                        </View>
                        <View style={styles.statDivider}/>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{combinedStats.totalLaborCost.toLocaleString()}원</Text>
                            <Text style={styles.statLabel}>총 인건비</Text>
                        </View>
                    </View>
                </View>

                {/* 매장 목록 */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>내 매장</Text>
                        <TouchableOpacity onPress={() => setShowAddStoreModal(true)}>
                            <Text style={styles.viewAllLink}>매장 추가</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={stores}
                        renderItem={renderStoreCard}
                        keyExtractor={(item) => item.id.toString()}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.storeListContainer}
                    />
                </View>

                {/* 매장 통계 */}
                {selectedStore && storeStats && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>
                                {selectedStore.name} 통계
                            </Text>
                        </View>

                        <View style={styles.statsContainer}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{storeStats.totalEmployees}명</Text>
                                <Text style={styles.statLabel}>직원 수</Text>
                            </View>
                            <View style={styles.statDivider}/>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{storeStats.totalLaborCost.toLocaleString()}원</Text>
                                <Text style={styles.statLabel}>인건비</Text>
                            </View>
                            <View style={styles.statDivider}/>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{storeStats.averageHourlyWage.toLocaleString()}원</Text>
                                <Text style={styles.statLabel}>평균 시급</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* 휴가 신청 내역 */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>휴가 신청 내역</Text>
                        <TouchableOpacity>
                            <Text style={styles.viewAllLink}>전체보기</Text>
                        </TouchableOpacity>
                    </View>

                    {timeOffRequests.length > 0 ? (
                        <FlatList
                            data={timeOffRequests.filter(req => req.status === 'PENDING')}
                            renderItem={renderTimeOffItem}
                            keyExtractor={(item) => item.id.toString()}
                            scrollEnabled={false}
                            contentContainerStyle={styles.timeOffListContainer}
                        />
                    ) : (
                        <Text style={styles.emptyListText}>대기 중인 휴가 신청이 없습니다.</Text>
                    )}
                </View>
            </ScrollView>

            {/* 로딩 인디케이터 */}
            {isLoading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0000ff"/>
                </View>
            )}
        </SafeAreaView>
    );

};

const styles = StyleSheet.create({
safeArea: {
flex: 1,
backgroundColor: '#f8f9fa',
},
scrollContent: {
paddingBottom: 30,
},
loadingContainer: {
position: 'absolute',
top: 0,
left: 0,
right: 0,
bottom: 0,
justifyContent: 'center',
alignItems: 'center',
backgroundColor: 'rgba(255, 255, 255, 0.7)',
},
section: {
backgroundColor: '#ffffff',
borderRadius: 10,
marginHorizontal: 15,
marginTop: 15,
padding: 15,
shadowColor: '#000',
shadowOffset: {width: 0, height: 1},
shadowOpacity: 0.1,
shadowRadius: 2,
elevation: 2,
},
sectionHeader: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
marginBottom: 15,
},
sectionTitle: {
fontSize: 18,
fontWeight: 'bold',
color: '#333',
},
viewAllLink: {
fontSize: 14,
color: '#007bff',
},
profileSection: {
backgroundColor: '#ffffff',
paddingVertical: 20,
paddingHorizontal: 15,
marginBottom: 10,
shadowColor: '#000',
shadowOffset: {width: 0, height: 1},
shadowOpacity: 0.1,
shadowRadius: 2,
elevation: 2,
},
profileHeader: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
},
profileInfo: {
flexDirection: 'row',
alignItems: 'center',
},
profileImageContainer: {
width: 70,
height: 70,
borderRadius: 35,
overflow: 'hidden',
backgroundColor: '#f0f0f0',
justifyContent: 'center',
alignItems: 'center',
},
profileImage: {
width: 70,
height: 70,
},
profileDetails: {
marginLeft: 15,
},
profileName: {
fontSize: 20,
fontWeight: 'bold',
color: '#333',
marginBottom: 5,
},
profileEmail: {
fontSize: 14,
color: '#666',
marginBottom: 10,
},
editProfileButton: {
backgroundColor: '#f0f0f0',
paddingVertical: 5,
paddingHorizontal: 10,
borderRadius: 5,
},
editProfileText: {
fontSize: 12,
color: '#333',
},
statsContainer: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
paddingVertical: 10,
},
statItem: {
flex: 1,
alignItems: 'center',
},
statValue: {
fontSize: 18,
fontWeight: 'bold',
color: '#333',
marginBottom: 5,
},
statLabel: {
fontSize: 12,
color: '#666',
},
statDivider: {
width: 1,
height: 40,
backgroundColor: '#e0e0e0',
},
storeListContainer: {
paddingVertical: 10,
},
storeCard: {
width: 200,
backgroundColor: '#f9f9f9',
borderRadius: 10,
padding: 15,
marginRight: 10,
shadowColor: '#000',
shadowOffset: {width: 0, height: 1},
shadowOpacity: 0.1,
shadowRadius: 2,
elevation: 2,
},
selectedStoreCard: {
backgroundColor: '#e6f7ff',
borderColor: '#1890ff',
borderWidth: 1,
},
storeLogoContainer: {
width: 50,
height: 50,
borderRadius: 25,
backgroundColor: '#e0e0e0',
justifyContent: 'center',
alignItems: 'center',
marginBottom: 10,
},
storeLogo: {
width: 50,
height: 50,
borderRadius: 25,
},
storeLogoPlaceholder: {
width: 50,
height: 50,
borderRadius: 25,
backgroundColor: '#1890ff',
justifyContent: 'center',
alignItems: 'center',
},
storeLogoText: {
fontSize: 20,
fontWeight: 'bold',
color: '#fff',
},
storeInfo: {
flex: 1,
},
storeName: {
fontSize: 16,
fontWeight: 'bold',
color: '#333',
marginBottom: 5,
},
storeAddress: {
fontSize: 12,
color: '#666',
marginBottom: 5,
},
storeEmployeeCount: {
fontSize: 12,
color: '#666',
},
selectedIndicator: {
position: 'absolute',
top: 10,
right: 10,
width: 20,
height: 20,
borderRadius: 10,
backgroundColor: '#1890ff',
justifyContent: 'center',
alignItems: 'center',
},
selectedIndicatorText: {
color: '#fff',
fontSize: 12,
fontWeight: 'bold',
},
timeOffListContainer: {
paddingTop: 10,
},
timeOffItem: {
backgroundColor: '#f9f9f9',
borderRadius: 10,
padding: 15,
marginBottom: 10,
},
timeOffHeader: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
marginBottom: 10,
},
timeOffPeriod: {
fontSize: 14,
fontWeight: 'bold',
color: '#333',
},
timeOffStatus: {
paddingVertical: 4,
paddingHorizontal: 8,
borderRadius: 4,
backgroundColor: '#ffa502',
},
timeOffStatusText: {
fontSize: 12,
color: '#fff',
fontWeight: 'bold',
},
timeOffEmployee: {
marginBottom: 10,
},
timeOffEmployeeName: {
fontSize: 14,
fontWeight: 'bold',
color: '#333',
marginBottom: 2,
},
timeOffStoreName: {
fontSize: 12,
color: '#666',
},
timeOffReason: {
flexDirection: 'row',
marginBottom: 10,
},
timeOffReasonLabel: {
fontSize: 14,
color: '#666',
marginRight: 5,
},
timeOffReasonText: {
fontSize: 14,
color: '#333',
flex: 1,
},
timeOffActions: {
flexDirection: 'row',
justifyContent: 'flex-end',
},
timeOffActionButton: {
paddingVertical: 6,
paddingHorizontal: 12,
borderRadius: 4,
marginLeft: 10,
},
timeOffApproveButton: {
backgroundColor: '#2ed573',
},
timeOffRejectButton: {
backgroundColor: '#ff4757',
},
timeOffActionButtonText: {
fontSize: 12,
color: '#fff',
fontWeight: 'bold',
},
emptyListText: {
fontSize: 14,
color: '#666',
textAlign: 'center',
paddingVertical: 20,
},
});

export default MasterMyPageScreen;
