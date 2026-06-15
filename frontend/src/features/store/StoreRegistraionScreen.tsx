import {AppToast, AppButton, AppHeader, AppInput, AppListItem, AppText, CtaStack, ScreenContainer} from '../../common/components/ds';
import React, {useState} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {spacing} from '../../theme/tokens';
import {useThemeColors} from '../../common/hooks/useThemeColors';
import useStoreRegistration from './hooks/useStoreRegistration';

interface AddressResult {
    place_name: string;
    road_address_name: string;
    address_name: string;
    x: string;
    y: string;
}

interface StoreData {
    storeName: string;
    businessNumber: string;
    storePhoneNumber: string;
    businessType: string;
    businessLicenseNumber: string;
    query: string;
    roadAddress: string;
    jibunAddress: string;
    latitude: number | null;
    longitude: number | null;
    radius: number;
    storeStandardHourWage: number | null;
}

/**
 * 12 StoreRegistration — 확정 시안.
 * 사장 매장 등록. 모든 포맷터/검증/주소검색/submit 훅 로직 보존.
 */
const StoreRegistrationScreen: React.FC = () => {
    const c = useThemeColors();
    const [storeData, setStoreData] = useState<StoreData>({
        storeName: '',
        businessNumber: '',
        storePhoneNumber: '',
        businessType: '',
        businessLicenseNumber: '',
        query: '',
        roadAddress: '',
        jibunAddress: '',
        latitude: null,
        longitude: null,
        radius: 100,
        storeStandardHourWage: null,
    });

    const [addressSearchQuery, setAddressSearchQuery] = useState('');
    const [addressResults, setAddressResults] = useState<AddressResult[]>([]);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const navigation = useNavigation<any>();
    const {isLoading, submit} = useStoreRegistration({
        onSuccess: () => {
            navigation.navigate('MasterMyPageScreen' as never);
        },
    });
    const [minimumWage] = useState(10030);

    const formatBusinessLicenseNumber = (value: string) => {
        const numbers = value.replace(/[^\d]/g, '');
        if (numbers.length <= 3) {
            return numbers;
        }
        if (numbers.length <= 5) {
            return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
        }
        return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 10)}`;
    };

    const formatLandlineNumber = (value: string) => {
        const numbers = value.replace(/[^\d]/g, '');
        if (numbers.length <= 2) {
            return numbers;
        }
        if (numbers.length <= 3) {
            return numbers;
        }
        if (numbers.length <= 6) {
            const areaCode = numbers.slice(0, numbers.length <= 3 ? numbers.length : 3);
            const middle = numbers.slice(numbers.length <= 3 ? numbers.length : 3);
            return `${areaCode}-${middle}`;
        }
        const areaCode = numbers.slice(0, numbers.length <= 3 ? numbers.length : 3);
        const middle = numbers.slice(numbers.length <= 3 ? numbers.length : 3, 7);
        const last = numbers.slice(7, 11);
        return `${areaCode}-${middle}-${last}`;
    };

    const formatMobileNumber = (value: string) => {
        const numbers = value.replace(/[^\d]/g, '');
        if (numbers.length <= 3) {
            return numbers;
        }
        if (numbers.length <= 7) {
            return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
        }
        return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    };

    const validatePhoneNumbers = () => {
        const businessNumber = storeData.businessNumber.replace(/[^\d]/g, '');
        const storePhoneNumber = storeData.storePhoneNumber.replace(/[^\d]/g, '');
        return businessNumber.length >= 9 || storePhoneNumber.length >= 10;
    };

    const searchAddress = async (query: string) => {
        if (!query.trim()) {
            return;
        }
        try {
            // 데모용 더미 데이터 (실 구현 시 카카오 REST API 키 필요)
            const dummyResults: AddressResult[] = [
                {place_name: '서울특별시 강남구 테헤란로 123', road_address_name: '서울특별시 강남구 테헤란로 123', address_name: '서울특별시 강남구 역삼동 123-45', x: '127.0276', y: '37.4979'},
                {place_name: '서울특별시 강남구 테헤란로 456', road_address_name: '서울특별시 강남구 테헤란로 456', address_name: '서울특별시 강남구 역삼동 456-78', x: '127.0286', y: '37.4989'},
                {place_name: '서울특별시 서초구 강남대로 789', road_address_name: '서울특별시 서초구 강남대로 789', address_name: '서울특별시 서초구 서초동 789-12', x: '127.0296', y: '37.4999'},
            ];
            setAddressResults(dummyResults);
        } catch (error) {
            AppToast.error('주소 검색 중 오류가 생겼어요.');
        }
    };

    const selectAddress = (address: AddressResult) => {
        setStoreData(prev => ({
            ...prev,
            query: address.place_name,
            roadAddress: address.road_address_name,
            jibunAddress: address.address_name,
            latitude: parseFloat(address.y),
            longitude: parseFloat(address.x),
        }));
        setShowAddressModal(false);
        setAddressSearchQuery('');
        setAddressResults([]);
    };

    const handleStoreRegistration = async () => {
        if (isLoading) {
            return;
        }
        const requiredFields = [
            {field: storeData.storeName, name: '매장명'},
            {field: storeData.businessType, name: '업종'},
            {field: storeData.businessLicenseNumber, name: '사업자등록번호'},
            {field: storeData.roadAddress, name: '주소'},
            {field: storeData.storeStandardHourWage, name: '기준 시급'},
        ];
        for (const {field, name} of requiredFields) {
            if (!field) {
                AppToast.warn(`${name}을(를) 입력해 주세요.`);
                return;
            }
        }
        if (!validatePhoneNumbers()) {
            AppToast.show('유선 전화번호 또는 휴대폰 번호 중 하나는 필수입니다.');
            return;
        }
        const bizNoDigits = storeData.businessLicenseNumber.replace(/[^\d]/g, '');
        if (bizNoDigits.length !== 10) {
            AppToast.show('사업자등록번호는 10자리여야 합니다.');
            return;
        }
        if (storeData.storeStandardHourWage && storeData.storeStandardHourWage < minimumWage) {
            AppToast.warn(`기준 시급은 최저시급(${minimumWage.toLocaleString()}원) 이상이어야 해요.`);
            return;
        }
        await submit({
            storeName: storeData.storeName.trim(),
            businessNumber: storeData.businessNumber.replace(/[^\d]/g, ''),
            storePhoneNumber: storeData.storePhoneNumber.replace(/[^\d]/g, ''),
            businessType: storeData.businessType.trim(),
            businessLicenseNumber: bizNoDigits,
            roadAddress: storeData.roadAddress,
            jibunAddress: storeData.jibunAddress,
            latitude: storeData.latitude,
            longitude: storeData.longitude,
            radius: storeData.radius,
            storeStandardHourWage: storeData.storeStandardHourWage ?? minimumWage,
        });
    };

    const isWageBelowMinimum =
        storeData.storeStandardHourWage !== null && storeData.storeStandardHourWage < minimumWage;
    const phoneOk = validatePhoneNumbers();

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="첫 매장 등록" rightText="2/3" onBack={() => navigation.goBack()} />}
            footer={
                <CtaStack>
                    <AppButton label="매장 등록하기" loading={isLoading} loadingLabel="등록 중..." onPress={handleStoreRegistration} />
                </CtaStack>
            }>
            <View style={styles.heroBlock}>
                <AppText variant="headingMd" numberOfLines={2}>매장 정보를{'\n'}입력해 주세요</AppText>
                <AppText variant="bodyMd" tone="secondary" style={styles.hintSub}>
                    직원이 매장 근처에서만 출근할 수 있도록 위치와 시급을 설정해요.
                </AppText>
            </View>

            <SectionLabel text="기본 정보" />
            <View style={styles.form}>
                <AppInput label="매장명 *" placeholder="매장명을 입력해 주세요" value={storeData.storeName} onChangeText={t => setStoreData(p => ({...p, storeName: t}))} />
                <AppInput label="업종 *" placeholder="예: 카페, 음식점, 편의점 등" value={storeData.businessType} onChangeText={t => setStoreData(p => ({...p, businessType: t}))} />
                <AppInput
                    label="사업자등록번호 *"
                    placeholder="000-00-00000"
                    value={storeData.businessLicenseNumber}
                    onChangeText={t => setStoreData(p => ({...p, businessLicenseNumber: formatBusinessLicenseNumber(t)}))}
                    keyboardType="numeric"
                    maxLength={12}
                />
            </View>

            <SectionLabel text="연락처 정보" />
            <View style={styles.form}>
                <AppInput
                    label="매장 전화번호 (유선)"
                    placeholder="031-000-0000"
                    value={storeData.businessNumber}
                    onChangeText={t => setStoreData(p => ({...p, businessNumber: formatLandlineNumber(t)}))}
                    keyboardType="phone-pad"
                    maxLength={13}
                />
                <AppInput
                    label="매장 전화번호 (휴대폰)"
                    placeholder="010-0000-0000"
                    value={storeData.storePhoneNumber}
                    onChangeText={t => setStoreData(p => ({...p, storePhoneNumber: formatMobileNumber(t)}))}
                    keyboardType="phone-pad"
                    maxLength={13}
                    helper={phoneOk ? '✓ 연락처가 입력됐어요' : '유선 또는 휴대폰 번호 중 하나는 필수예요'}
                />
            </View>

            <SectionLabel text="위치 정보" />
            <View style={styles.form}>
                <View>
                    <AppText variant="caption" tone="secondary" style={styles.fieldLabel}>매장 주소 *</AppText>
                    <Pressable style={[styles.addressBtn, {borderColor: c.border, backgroundColor: c.background}]} onPress={() => setShowAddressModal(true)}>
                        <AppText variant="bodyMd" tone={storeData.roadAddress ? 'primary' : 'tertiary'} numberOfLines={1} style={styles.flex}>
                            {storeData.roadAddress || '주소를 검색해주세요'}
                        </AppText>
                        <Ionicons name="search-outline" size={18} color={c.textTertiary} />
                    </Pressable>
                    {storeData.jibunAddress ? (
                        <AppText variant="caption" tone="tertiary" style={styles.jibun}>지번: {storeData.jibunAddress}</AppText>
                    ) : null}
                </View>
                <AppInput
                    label="출퇴근 인증 반경 (m)"
                    placeholder="100"
                    value={storeData.radius.toString()}
                    onChangeText={t => setStoreData(p => ({...p, radius: parseInt(t, 10) || 100}))}
                    keyboardType="numeric"
                    helper="직원들이 출퇴근 체크를 할 수 있는 반경이에요."
                />
            </View>

            <SectionLabel text="급여 정보" />
            <View style={styles.form}>
                <AppInput
                    label={`매장 기준 시급 * (최저 ${minimumWage.toLocaleString()}원)`}
                    placeholder={minimumWage.toString()}
                    value={storeData.storeStandardHourWage?.toString() ?? ''}
                    onChangeText={t => setStoreData(p => ({...p, storeStandardHourWage: parseInt(t.replace(/[^\d]/g, ''), 10) || null}))}
                    keyboardType="numeric"
                    error={isWageBelowMinimum ? `최저시급(${minimumWage.toLocaleString()}원) 이상으로 설정해주세요` : undefined}
                />
            </View>

            <Modal visible={showAddressModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddressModal(false)}>
                <ScreenContainer header={<AppHeader title="주소 검색" actions={[{label: '닫기', onPress: () => setShowAddressModal(false)}]} />}>
                    <View style={styles.searchRow}>
                        <AppInput
                            containerStyle={styles.flex}
                            placeholder="주소를 입력해 주세요"
                            value={addressSearchQuery}
                            onChangeText={setAddressSearchQuery}
                            onSubmitEditing={() => searchAddress(addressSearchQuery)}
                        />
                        <AppButton label="검색" size="md" fullWidth={false} onPress={() => searchAddress(addressSearchQuery)} style={styles.searchBtn} />
                    </View>
                    <ScrollView contentContainerStyle={styles.resultsList}>
                        {addressResults.map((address, index) => (
                            <AppListItem
                                key={index}
                                title={address.place_name}
                                subtitle={`도로명 ${address.road_address_name}`}
                                onPress={() => selectAddress(address)}
                            />
                        ))}
                    </ScrollView>
                </ScreenContainer>
            </Modal>
        </ScreenContainer>
    );
};

const SectionLabel: React.FC<{text: string}> = ({text}) => (
    <AppText variant="titleMd" style={styles.sectionLabel}>{text}</AppText>
);

const styles = StyleSheet.create({
    heroBlock: {marginBottom: spacing.sm},
    hintSub: {marginTop: spacing.sm},
    sectionLabel: {marginTop: spacing.xxl, marginBottom: spacing.sm},
    form: {gap: spacing.md},
    fieldLabel: {marginBottom: spacing.xs, marginLeft: 2, fontWeight: '700'},
    addressBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 48,
        borderRadius: 15,
        borderWidth: 1,
        paddingHorizontal: spacing.md + 2,
        gap: spacing.sm,
    },
    flex: {flex: 1},
    jibun: {marginTop: spacing.xs, marginLeft: 2},
    searchRow: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm},
    searchBtn: {marginTop: 0},
    resultsList: {paddingTop: spacing.md, gap: spacing.sm},
});

export default StoreRegistrationScreen;
