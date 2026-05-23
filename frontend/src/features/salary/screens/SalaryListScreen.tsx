import React, {useEffect, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {Button, Card, MainLayout} from '../../../common/components';

import salaryService from '../services/salaryService';
import {SalaryFilter, SalaryRecord, SalaryStatus} from '../types';
import {format} from 'date-fns';

// 네비게이션 타입 정의
type SalaryStackParamList = {
    SalaryList: undefined;
    SalaryDetail: { payrollId: number };
    SalaryForm: { salaryId?: string };
    SalaryPolicy: { workplaceId: string };
};

type SalaryListScreenNavigationProp = NativeStackNavigationProp<SalaryStackParamList, 'SalaryList'>;

const SalaryListScreen = () => {
    const navigation = useNavigation<SalaryListScreenNavigationProp>();
    const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedWorkplaceId, setSelectedWorkplaceId] = useState<string>('');
    const [workplaces, setWorkplaces] = useState<{ id: string; name: string }[]>([]);
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filter, setFilter] = useState<SalaryFilter>({});
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerMode, setDatePickerMode] = useState<'startDate' | 'endDate'>('startDate');
    const [tempDate, setTempDate] = useState(new Date());
    const [batchActionModalVisible, setBatchActionModalVisible] = useState(false);
    const [selectedSalaries, setSelectedSalaries] = useState<string[]>([]);
    const [paymentDate, setPaymentDate] = useState(new Date());
    const [showPaymentDatePicker, setShowPaymentDatePicker] = useState(false);

    // 급여 목록 조회
    const fetchSalaries = async () => {
        try {
            setLoading(true);
            let data: SalaryRecord[] = [];

            if (selectedWorkplaceId) {
                data = await salaryService.getWorkplaceSalaries(selectedWorkplaceId, filter);
            } else {
                data = await salaryService.getSalaries(filter);
            }

            setSalaries(data);
        } catch (error) {
            console.error('급여 목록을 가져오는 중 오류가 발생했습니다:', error);
            Alert.alert('오류', '급여 목록을 불러오는 데 실패했습니다. 다시 시도해주세요.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // 근무지 목록 조회 (실제 구현에서는 API 호출)
    const fetchWorkplaces = async () => {
        try {
            // 임시 데이터 (실제 구현에서는 API 호출)
            const data = [
                {id: '1', name: '카페 소담'},
                {id: '2', name: '레스토랑 소담'}
            ];
            setWorkplaces(data);
        } catch (error) {
            console.error('근무지 목록을 가져오는 중 오류가 발생했습니다:', error);
        }
    };

    // 화면 로드 시 데이터 조회
    useEffect(() => {
        fetchWorkplaces();
        fetchSalaries();
    }, []);

    // 선택된 근무지가 변경되면 급여 목록 다시 조회
    useEffect(() => {
        fetchSalaries();
    }, [selectedWorkplaceId]);

    // 새로고침 처리
    const handleRefresh = () => {
        setRefreshing(true);
        fetchSalaries();
    };

    // 필터 적용
    const applyFilter = () => {
        setFilterModalVisible(false);
        fetchSalaries();
    };

    // 필터 초기화
    const resetFilter = () => {
        setFilter({});
        setFilterModalVisible(false);
        fetchSalaries();
    };

    // 날짜 선택기 표시
    const showDatePickerModal = (mode: 'startDate' | 'endDate') => {
        setDatePickerMode(mode);
        setTempDate(new Date());
        setShowDatePicker(true);
    };

    // 날짜 선택 처리
    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);

        if (selectedDate) {
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');

            if (datePickerMode === 'startDate') {
                setFilter({...filter, startDate: formattedDate});
            } else {
                setFilter({...filter, endDate: formattedDate});
            }
        }
    };

    // 급여 상태 변경
    const handleStatusChange = (status: SalaryStatus) => {
        setFilter({...filter, status});
    };

    // 급여 항목 선택/해제
    const toggleSalarySelection = (salaryId: string) => {
        if (selectedSalaries.includes(salaryId)) {
            setSelectedSalaries(selectedSalaries.filter(id => id !== salaryId));
        } else {
            setSelectedSalaries([...selectedSalaries, salaryId]);
        }
    };

    // 일괄 지급 처리
    const handleBatchPay = async () => {
        if (selectedSalaries.length === 0) {
            Alert.alert('알림', '지급할 급여를 선택해주세요.');
            return;
        }

        try {
            const formattedDate = format(paymentDate, 'yyyy-MM-dd');
            await salaryService.batchPaySalaries(selectedSalaries, formattedDate);
            Alert.alert('성공', '선택한 급여가 일괄 지급되었습니다.');
            setBatchActionModalVisible(false);
            setSelectedSalaries([]);
            fetchSalaries();
        } catch (error) {
            console.error('일괄 지급 중 오류가 발생했습니다:', error);
            Alert.alert('오류', '일괄 지급에 실패했습니다. 다시 시도해주세요.');
        }
    };

    // 일괄 명세서 생성
    const handleBatchStatements = async () => {
        if (selectedSalaries.length === 0) {
            Alert.alert('알림', '명세서를 생성할 급여를 선택해주세요.');
            return;
        }

        try {
            const url = await salaryService.batchGenerateSalaryStatements(selectedSalaries);
            Alert.alert('성공', '명세서가 생성되었습니다. 다운로드 URL: ' + url);
            setBatchActionModalVisible(false);
            setSelectedSalaries([]);
        } catch (error) {
            console.error('일괄 명세서 생성 중 오류가 발생했습니다:', error);
            Alert.alert('오류', '명세서 생성에 실패했습니다. 다시 시도해주세요.');
        }
    };

    // 급여 생성 화면으로 이동
    const navigateToCreateSalary = () => {
        navigation.navigate({name: 'SalaryForm', params: {salaryId: undefined}});
    };

    // 급여 상세 화면으로 이동
    const navigateToSalaryDetail = (payrollId: number) => {
            navigation.navigate({name: 'SalaryDetail', params: {payrollId}});
        };

    // 급여 정책 화면으로 이동
    const navigateToSalaryPolicy = () => {
        if (!selectedWorkplaceId) {
            Alert.alert('알림', '근무지를 선택해주세요.');
            return;
        }
        navigation.navigate({name: 'SalaryPolicy', params: {workplaceId: selectedWorkplaceId}});
    };

    // 근무지 선택기 렌더링
    const renderWorkplacePicker = () => (
        <View style={styles.workplacePickerContainer}>
            <Text style={styles.workplaceLabel}>근무지 선택:</Text>
            <View style={styles.workplaceButtons}>
                <TouchableOpacity
                    style={[
                        styles.workplaceButton,
                        !selectedWorkplaceId && styles.selectedWorkplaceButton
                    ]}
                    onPress={() => setSelectedWorkplaceId('')}
                >
                    <Text
                        style={[
                            styles.workplaceButtonText,
                            !selectedWorkplaceId && styles.selectedWorkplaceButtonText
                        ]}
                    >
                        전체
                    </Text>
                </TouchableOpacity>

                {workplaces.map(workplace => (
                    <TouchableOpacity
                        key={workplace.id}
                        style={[
                            styles.workplaceButton,
                            selectedWorkplaceId === workplace.id && styles.selectedWorkplaceButton
                        ]}
                        onPress={() => setSelectedWorkplaceId(workplace.id)}
                    >
                        <Text
                            style={[
                                styles.workplaceButtonText,
                                selectedWorkplaceId === workplace.id && styles.selectedWorkplaceButtonText
                            ]}
                        >
                            {workplace.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    // 액션 버튼 렌더링
    const renderActionButtons = () => (
        <View style={styles.actionButtonsContainer}>
            <Button
                title="급여 생성"
                onPress={navigateToCreateSalary}
                size="small"
                icon="add"
            />
            <Button
                title="일괄 작업"
                onPress={() => setBatchActionModalVisible(true)}
                size="small"
                icon="playlist-add-check"
                disabled={selectedSalaries.length === 0}
            />
            <Button
                title="필터"
                onPress={() => setFilterModalVisible(true)}
                size="small"
                icon="filter-list"
            />
            <Button
                title="급여 정책"
                onPress={navigateToSalaryPolicy}
                size="small"
                icon="policy"
            />
        </View>
    );

    // 급여 항목 렌더링
    const renderSalaryItem = ({item}: { item: SalaryRecord }) => (
        <Card style={styles.salaryCard}>
            <TouchableOpacity
                style={styles.selectCheckbox}
                onPress={() => toggleSalarySelection(item.id)}
            >
                <Icon
                    name={selectedSalaries.includes(item.id) ? "check-box" : "check-box-outline-blank"}
                    size={24}
                    color={selectedSalaries.includes(item.id) ? "#007AFF" : "#999"}
                />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.salaryContent}
                onPress={() => { const pid = Number(item.id); if (Number.isNaN(pid) || pid <= 0) { Alert.alert('오류', '급여 ID가 유효하지 않습니다.'); return; } navigateToSalaryDetail(pid); }}
            >
                <View style={styles.salaryHeader}>
                    <Text style={styles.employeeName}>{item.employeeName}</Text>
                    <View style={[
                        styles.statusBadge,
                        item.status === SalaryStatus.PAID ? styles.paidBadge :
                            item.status === SalaryStatus.PENDING ? styles.pendingBadge :
                                styles.cancelledBadge
                    ]}>
                        <Text style={styles.statusText}>
                            {item.status === SalaryStatus.PAID ? '지급완료' :
                                item.status === SalaryStatus.PENDING ? '지급대기' :
                                    '취소됨'}
                        </Text>
                    </View>
                </View>

                <View style={styles.salaryDetails}>
                    <Text style={styles.workplaceName}>{item.workplaceName}</Text>
                    <Text
                        style={styles.period}>{item.period} ({format(new Date(item.startDate), 'MM.dd')} ~ {format(new Date(item.endDate), 'MM.dd')})</Text>
                </View>

                <View style={styles.salaryAmounts}>
                    <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>기본급</Text>
                        <Text style={styles.amountValue}>{item.baseAmount.toLocaleString()}원</Text>
                    </View>
                    {item.overtimeAmount > 0 && (
                        <View style={styles.amountRow}>
                            <Text style={styles.amountLabel}>초과근무수당</Text>
                            <Text style={styles.amountValue}>{item.overtimeAmount.toLocaleString()}원</Text>
                        </View>
                    )}
                    {item.bonusAmount > 0 && (
                        <View style={styles.amountRow}>
                            <Text style={styles.amountLabel}>보너스</Text>
                            <Text style={styles.amountValue}>{item.bonusAmount.toLocaleString()}원</Text>
                        </View>
                    )}
                    {item.deductionAmount > 0 && (
                        <View style={styles.amountRow}>
                            <Text style={styles.amountLabel}>공제액</Text>
                            <Text style={styles.amountValue}>-{item.deductionAmount.toLocaleString()}원</Text>
                        </View>
                    )}
                    <View style={[styles.amountRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>총액</Text>
                        <Text style={styles.totalValue}>{item.totalAmount.toLocaleString()}원</Text>
                    </View>
                </View>

                {item.status === SalaryStatus.PAID && item.paymentDate && (
                    <Text style={styles.paymentDate}>지급일: {format(new Date(item.paymentDate), 'yyyy.MM.dd')}</Text>
                )}
            </TouchableOpacity>
        </Card>
    );

    // 필터 모달 렌더링
    const renderFilterModal = () => (
        <Modal
            visible={filterModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setFilterModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>급여 필터</Text>
                        <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                            <Icon name="close" size={24} color="#000"/>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <Text style={styles.filterSectionTitle}>기간</Text>
                        <View style={styles.dateFilterContainer}>
                            <TouchableOpacity
                                style={styles.datePickerButton}
                                onPress={() => showDatePickerModal('startDate')}
                            >
                                <Text style={styles.datePickerButtonText}>
                                    {filter.startDate ?? '시작일 선택'}
                                </Text>
                                <Icon name="calendar-today" size={18} color="#666"/>
                            </TouchableOpacity>

                            <Text style={styles.dateRangeSeparator}>~</Text>

                            <TouchableOpacity
                                style={styles.datePickerButton}
                                onPress={() => showDatePickerModal('endDate')}
                            >
                                <Text style={styles.datePickerButtonText}>
                                    {filter.endDate ?? '종료일 선택'}
                                </Text>
                                <Icon name="calendar-today" size={18} color="#666"/>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.filterSectionTitle}>지급 상태</Text>
                        <View style={styles.statusFilterContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.statusFilterButton,
                                    filter.status === SalaryStatus.PENDING && styles.selectedStatusButton
                                ]}
                                onPress={() => handleStatusChange(SalaryStatus.PENDING)}
                            >
                                <Text
                                    style={[
                                        styles.statusFilterText,
                                        filter.status === SalaryStatus.PENDING && styles.selectedStatusText
                                    ]}
                                >
                                    지급대기
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.statusFilterButton,
                                    filter.status === SalaryStatus.PAID && styles.selectedStatusButton
                                ]}
                                onPress={() => handleStatusChange(SalaryStatus.PAID)}
                            >
                                <Text
                                    style={[
                                        styles.statusFilterText,
                                        filter.status === SalaryStatus.PAID && styles.selectedStatusText
                                    ]}
                                >
                                    지급완료
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.statusFilterButton,
                                    filter.status === SalaryStatus.CANCELLED && styles.selectedStatusButton
                                ]}
                                onPress={() => handleStatusChange(SalaryStatus.CANCELLED)}
                            >
                                <Text
                                    style={[
                                        styles.statusFilterText,
                                        filter.status === SalaryStatus.CANCELLED && styles.selectedStatusText
                                    ]}
                                >
                                    취소됨
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.filterSectionTitle}>급여 기간</Text>
                        <TextInput
                            style={styles.periodInput}
                            placeholder="YYYY-MM (예: 2023-06)"
                            value={filter.period}
                            onChangeText={(text) => setFilter({...filter, period: text})}
                        />
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <Button
                            title="초기화"
                            onPress={resetFilter}
                            size="small"
                            type="secondary"
                        />
                        <Button
                            title="적용"
                            onPress={applyFilter}
                            size="small"
                        />
                    </View>
                </View>
            </View>

            {showDatePicker && (
                    <DateTimePicker
                        value={tempDate}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                    />
            )}
        </Modal>
    );

    // 일괄 작업 모달 렌더링
    const renderBatchActionModal = () => (
        <Modal
            visible={batchActionModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setBatchActionModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>일괄 작업</Text>
                        <TouchableOpacity onPress={() => setBatchActionModalVisible(false)}>
                            <Icon name="close" size={24} color="#000"/>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalContent}>
                        <Text style={styles.batchInfoText}>
                            선택된 급여: {selectedSalaries.length}개
                        </Text>

                        <View style={styles.batchActionSection}>
                            <Text style={styles.batchSectionTitle}>일괄 지급</Text>
                            <View style={styles.paymentDateContainer}>
                                <Text style={styles.paymentDateLabel}>지급일:</Text>
                                <TouchableOpacity
                                    style={styles.paymentDateButton}
                                    onPress={() => setShowPaymentDatePicker(true)}
                                >
                                    <Text style={styles.paymentDateButtonText}>
                                        {format(paymentDate, 'yyyy-MM-dd')}
                                    </Text>
                                    <Icon name="calendar-today" size={18} color="#666"/>
                                </TouchableOpacity>
                            </View>
                            <Button
                                title="일괄 지급 처리"
                                onPress={handleBatchPay}
                                icon="payments"
                            />
                        </View>

                        <View style={styles.batchActionSection}>
                            <Text style={styles.batchSectionTitle}>명세서 생성</Text>
                            <Button
                                title="일괄 명세서 생성"
                                onPress={handleBatchStatements}
                                icon="description"
                            />
                        </View>
                    </View>
                </View>
            </View>

            {showPaymentDatePicker && (
                    <DateTimePicker
                        value={paymentDate}
                        mode="date"
                        display="default"
                        onChange={(event: any, selectedDate: Date | undefined) => {
                            setShowPaymentDatePicker(false);
                            if (selectedDate) {
                                setPaymentDate(selectedDate);
                            }
                        }}
                    />
            )}
        </Modal>
    );

    return (
        <MainLayout>
            <View style={styles.container}>
                <Text style={styles.screenTitle}>급여 관리</Text>

                {renderWorkplacePicker()}
                {renderActionButtons()}

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#007AFF"/>
                    </View>
                ) : (
                    <FlatList
                        data={salaries}
                        keyExtractor={(item) => item.id}
                        renderItem={renderSalaryItem}
                        contentContainerStyle={styles.salaryList}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh}/>
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Icon name="account-balance-wallet" size={48} color="#ccc"/>
                                <Text style={styles.emptyText}>급여 정보가 없습니다.</Text>
                            </View>
                        }
                    />
                )}

                {renderFilterModal()}
                {renderBatchActionModal()}
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
    workplacePickerContainer: {
        marginHorizontal: 16,
        marginBottom: 12,
    },
    workplaceLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    workplaceButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    workplaceButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#eee',
        marginRight: 8,
        marginBottom: 8,
    },
    selectedWorkplaceButton: {
        backgroundColor: '#007AFF',
    },
    workplaceButtonText: {
        fontSize: 14,
        color: '#666',
    },
    selectedWorkplaceButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 16,
        marginBottom: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    salaryList: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    salaryCard: {
        marginBottom: 12,
        padding: 0,
        flexDirection: 'row',
    },
    selectCheckbox: {
        padding: 16,
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    salaryContent: {
        flex: 1,
        padding: 16,
        paddingLeft: 0,
    },
    salaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    employeeName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    paidBadge: {
        backgroundColor: '#4CAF50',
    },
    pendingBadge: {
        backgroundColor: '#FFC107',
    },
    cancelledBadge: {
        backgroundColor: '#F44336',
    },
    statusText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: 'bold',
    },
    salaryDetails: {
        marginBottom: 8,
    },
    workplaceName: {
        fontSize: 14,
        color: '#666',
    },
    period: {
        fontSize: 14,
        color: '#666',
    },
    salaryAmounts: {
        backgroundColor: '#f5f5f5',
        padding: 8,
        borderRadius: 8,
        marginBottom: 8,
    },
    amountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    amountLabel: {
        fontSize: 14,
        color: '#666',
    },
    amountValue: {
        fontSize: 14,
        color: '#333',
    },
    totalRow: {
        marginTop: 4,
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    totalValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#007AFF',
    },
    paymentDate: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        maxHeight: '80%',
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalContent: {
        padding: 16,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    filterSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        marginTop: 16,
    },
    dateFilterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    datePickerButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
    },
    datePickerButtonText: {
        color: '#666',
    },
    dateRangeSeparator: {
        marginHorizontal: 8,
        color: '#666',
    },
    statusFilterContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    statusFilterButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: '#eee',
        marginRight: 8,
        marginBottom: 8,
    },
    selectedStatusButton: {
        backgroundColor: '#007AFF',
    },
    statusFilterText: {
        fontSize: 14,
        color: '#666',
    },
    selectedStatusText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    periodInput: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
    },
    batchInfoText: {
        fontSize: 16,
        marginBottom: 16,
    },
    batchActionSection: {
        marginBottom: 24,
    },
    batchSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    paymentDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    paymentDateLabel: {
        fontSize: 14,
        marginRight: 8,
    },
    paymentDateButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
    },
    paymentDateButtonText: {
        color: '#666',
    },
});

export default SalaryListScreen;
