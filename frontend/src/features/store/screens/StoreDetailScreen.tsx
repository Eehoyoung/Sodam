import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../../../common/components/logo/Colors';
import storeService, { StoreDetailDto } from '../services/storeService';

type StoreDetailScreenRouteProp = RouteProp<{ StoreDetail: { storeId: number } }, 'StoreDetail'>;

interface StoreDetailScreenProps {
    route: StoreDetailScreenRouteProp;
    navigation: NavigationProp<any>;
}

/**
 * 매장 상세 화면
 * Backend API: GET /api/stores/{storeId}
 */
export default function StoreDetailScreen({ route, navigation }: StoreDetailScreenProps) {
    const { storeId } = route.params;
    const [store, setStore] = useState<StoreDetailDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadStoreDetail();
    }, [storeId]);

    const loadStoreDetail = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await storeService.getStoreById(storeId);
            setStore(data);
        } catch (err: any) {
            console.error('매장 상세 조회 실패:', err);
            setError(err?.message || '매장 정보를 불러오는데 실패했습니다.');
            Alert.alert('오류', '매장 정보를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.SODAM_BLUE} />
                    <Text style={styles.loadingText}>매장 정보 로딩 중...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error || !store) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={60} color={COLORS.ERROR} />
                    <Text style={styles.errorText}>{error || '매장 정보를 찾을 수 없습니다.'}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={loadStoreDetail}>
                        <Text style={styles.retryButtonText}>다시 시도</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView}>
                {/* 헤더 카드 */}
                <LinearGradient
                    colors={[COLORS.SODAM_BLUE, COLORS.SODAM_GREEN]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerCard}
                >
                    <View style={styles.headerContent}>
                        <Text style={styles.storeName}>{store.storeName}</Text>
                        <Text style={styles.storeCode}>{store.storeCode}</Text>
                        <Text style={styles.businessType}>{store.businessType}</Text>
                    </View>
                </LinearGradient>

                {/* 기본 정보 섹션 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>기본 정보</Text>
                    <View style={styles.infoCard}>
                        <InfoRow icon="location-outline" label="주소" value={store.fullAddress} />
                        {store.businessNumber && (
                            <InfoRow icon="card-outline" label="사업자번호" value={store.businessNumber} />
                        )}
                        {store.storePhoneNumber && (
                            <InfoRow icon="call-outline" label="전화번호" value={store.storePhoneNumber} />
                        )}
                    </View>
                </View>

                {/* 근무 정보 섹션 */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>근무 정보</Text>
                    <View style={styles.infoCard}>
                        <InfoRow
                            icon="cash-outline"
                            label="기준 시급"
                            value={`${store.storeStandardHourWage.toLocaleString()}원`}
                        />
                        {store.employeeCount !== undefined && (
                            <InfoRow
                                icon="people-outline"
                                label="직원 수"
                                value={`${store.employeeCount}명`}
                            />
                        )}
                    </View>
                </View>

                {/* 위치 정보 섹션 */}
                {(store.latitude !== undefined && store.longitude !== undefined) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>위치 설정</Text>
                        <View style={styles.infoCard}>
                            <InfoRow icon="navigate-outline" label="위도" value={store.latitude.toFixed(6)} />
                            <InfoRow icon="navigate-outline" label="경도" value={store.longitude.toFixed(6)} />
                            {store.radius && (
                                <InfoRow
                                    icon="radio-button-on-outline"
                                    label="인증 반경"
                                    value={`${store.radius}m`}
                                />
                            )}
                        </View>
                    </View>
                )}

                {/* 시스템 정보 섹션 */}
                {(store.createdAt || store.updatedAt) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>시스템 정보</Text>
                        <View style={styles.infoCard}>
                            {store.createdAt && (
                                <InfoRow
                                    icon="calendar-outline"
                                    label="등록일"
                                    value={new Date(store.createdAt).toLocaleDateString('ko-KR')}
                                />
                            )}
                            {store.updatedAt && (
                                <InfoRow
                                    icon="sync-outline"
                                    label="수정일"
                                    value={new Date(store.updatedAt).toLocaleDateString('ko-KR')}
                                />
                            )}
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

interface InfoRowProps {
    icon: string;
    label: string;
    value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
    return (
        <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
                <Ionicons name={icon} size={20} color={COLORS.SODAM_BLUE} />
                <Text style={styles.infoLabel}>{label}</Text>
            </View>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    scrollView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: COLORS.GRAY_600,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    errorText: {
        marginTop: 16,
        fontSize: 16,
        color: COLORS.GRAY_600,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 24,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: COLORS.SODAM_BLUE,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    headerCard: {
        margin: 16,
        padding: 24,
        borderRadius: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    headerContent: {
        alignItems: 'center',
    },
    storeName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    storeCode: {
        fontSize: 14,
        color: '#FFFFFF',
        opacity: 0.9,
        marginBottom: 4,
    },
    businessType: {
        fontSize: 16,
        color: '#FFFFFF',
        opacity: 0.8,
    },
    section: {
        marginHorizontal: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.GRAY_900,
        marginBottom: 12,
    },
    infoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    infoLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    infoLabel: {
        fontSize: 15,
        color: COLORS.GRAY_600,
        marginLeft: 8,
    },
    infoValue: {
        fontSize: 15,
        color: COLORS.GRAY_900,
        fontWeight: '500',
        marginLeft: 16,
        textAlign: 'right',
        flex: 1,
    },
});
