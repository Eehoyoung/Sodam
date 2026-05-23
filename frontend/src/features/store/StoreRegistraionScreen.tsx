import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import SodamLogo from '../../common/components/logo/SodamLogo';
import { COLORS } from '../../common/components/logo/Colors';
import useStoreRegistration from './hooks/useStoreRegistration';

interface AddressResult {
  place_name: string;
  road_address_name: string;
  address_name: string;
  x: string; // longitude
  y: string; // latitude
}

interface StoreData {
  storeName: string;
  businessNumber: string; // 매장 유선전화
  storePhoneNumber: string; // 매장 휴대폰
  businessType: string;
  businessLicenseNumber: string; // 사업자등록번호
  query: string;
  roadAddress: string;
  jibunAddress: string;
  latitude: number | null;
  longitude: number | null;
  radius: number;
  storeStandardHourWage: number | null;
}

const StoreRegistrationScreen: React.FC = () => {
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
  const { isLoading, submit } = useStoreRegistration({
    onSuccess: () => {
      navigation.navigate('MasterMyPageScreen' as never);
    }
  });
  const [minimumWage] = useState(10030); // 2024년 최저시급 업데이트

  // 사업자등록번호 포맷팅 (000-00-00000)
  const formatBusinessLicenseNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 3) {return numbers;}
    if (numbers.length <= 5) {return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;}
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 10)}`;
  };

  // 유선전화 포맷팅 (031-000-0000, 02-000-0000)
  const formatLandlineNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 2) {return numbers;}
    if (numbers.length <= 3) {return numbers;}
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

  // 휴대폰 번호 포맷팅 (010-0000-0000)
  const formatMobileNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 3) {return numbers;}
    if (numbers.length <= 7) {return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;}
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  // 전화번호 유효성 검사
  const validatePhoneNumbers = () => {
    const businessNumber = storeData.businessNumber.replace(/[^\d]/g, '');
    const storePhoneNumber = storeData.storePhoneNumber.replace(/[^\d]/g, '');

    return businessNumber.length >= 9 || storePhoneNumber.length >= 10;
  };

  // 카카오 주소 검색 API 호출
  const searchAddress = async (query: string) => {
    if (!query.trim()) {return;}

    try {
      // 실제 구현시에는 카카오 REST API 키가 필요합니다
      // const response = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}`, {
      //   headers: {
      //     'Authorization': 'KakaoAK YOUR_REST_API_KEY'
      //   }
      // });
      // const data = await response.json();
      // setAddressResults(data.documents);

      // 데모용 더미 데이터
      const dummyResults: AddressResult[] = [
        {
          place_name: '서울특별시 강남구 테헤란로 123',
          road_address_name: '서울특별시 강남구 테헤란로 123',
          address_name: '서울특별시 강남구 역삼동 123-45',
          x: '127.0276',
          y: '37.4979'
        },
        {
          place_name: '서울특별시 강남구 테헤란로 456',
          road_address_name: '서울특별시 강남구 테헤란로 456',
          address_name: '서울특별시 강남구 역삼동 456-78',
          x: '127.0286',
          y: '37.4989'
        },
        {
          place_name: '서울특별시 서초구 강남대로 789',
          road_address_name: '서울특별시 서초구 강남대로 789',
          address_name: '서울특별시 서초구 서초동 789-12',
          x: '127.0296',
          y: '37.4999'
        }
      ];
      setAddressResults(dummyResults);
    } catch (error) {
      Alert.alert('오류', '주소 검색 중 오류가 발생했습니다.');
    }
  };

  // 주소 선택
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

  // 매장 등록 처리
  const handleStoreRegistration = async () => {
    if (isLoading) {return;}

    // 필수 필드 검증
    const requiredFields = [
      { field: storeData.storeName, name: '매장명' },
      { field: storeData.businessType, name: '업종' },
      { field: storeData.businessLicenseNumber, name: '사업자등록번호' },
      { field: storeData.roadAddress, name: '주소' },
      { field: storeData.storeStandardHourWage, name: '기준 시급' },
    ];

    for (const { field, name } of requiredFields) {
      if (!field) {
        Alert.alert('알림', `${name}을(를) 입력해주세요.`);
        return;
      }
    }

    // 전화번호 검증 (둘 중 하나는 필수)
    if (!validatePhoneNumbers()) {
      Alert.alert('알림', '유선 전화번호 또는 휴대폰 번호 중 하나는 필수입니다.');
      return;
    }

    // 사업자등록번호 길이 검증
    const bizNoDigits = storeData.businessLicenseNumber.replace(/[^\d]/g, '');
    if (bizNoDigits.length !== 10) {
      Alert.alert('알림', '사업자등록번호는 10자리여야 합니다.');
      return;
    }

    // 최저시급 검증
    if (storeData.storeStandardHourWage && storeData.storeStandardHourWage < minimumWage) {
      Alert.alert('알림', `기준 시급은 최저시급(${minimumWage.toLocaleString()}원) 이상이어야 합니다.`);
      return;
    }

    // payload 정규화 후 제출
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

  const isWageBelowMinimum = storeData.storeStandardHourWage !== null &&
                            storeData.storeStandardHourWage < minimumWage;

  const phoneValidationStatus = validatePhoneNumbers();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <LinearGradient
          colors={[COLORS.SODAM_ORANGE, COLORS.SODAM_BLUE]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <SodamLogo size={60} variant="simple" />
          <Text style={styles.headerTitle}>매장 등록</Text>
          <Text style={styles.headerSubtitle}>새로운 매장을 등록해보세요</Text>
        </LinearGradient>

        {/* 폼 카드 */}
        <View style={styles.formCard}>
          {/* 기본 정보 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>기본 정보</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>매장명 *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="매장명을 입력해주세요"
                value={storeData.storeName}
                onChangeText={(text) => setStoreData(prev => ({ ...prev, storeName: text }))}
                placeholderTextColor={COLORS.GRAY_400}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>업종 *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="예: 카페, 음식점, 편의점 등"
                value={storeData.businessType}
                onChangeText={(text) => setStoreData(prev => ({ ...prev, businessType: text }))}
                placeholderTextColor={COLORS.GRAY_400}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>사업자등록번호 * (000-00-00000)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="000-00-00000"
                value={storeData.businessLicenseNumber}
                onChangeText={(text) => {
                  const formatted = formatBusinessLicenseNumber(text);
                  setStoreData(prev => ({ ...prev, businessLicenseNumber: formatted }));
                }}
                keyboardType="numeric"
                maxLength={12}
                placeholderTextColor={COLORS.GRAY_400}
              />
            </View>
          </View>

          {/* 연락처 정보 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>연락처 정보</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>매장 전화번호 (유선) <Text style={styles.subLabel}>031, 02 등</Text></Text>
              <TextInput
                style={styles.formInput}
                placeholder="031-000-0000"
                value={storeData.businessNumber}
                onChangeText={(text) => {
                  const formatted = formatLandlineNumber(text);
                  setStoreData(prev => ({ ...prev, businessNumber: formatted }));
                }}
                keyboardType="phone-pad"
                maxLength={13}
                placeholderTextColor={COLORS.GRAY_400}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>매장 전화번호 (휴대폰)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="010-0000-0000"
                value={storeData.storePhoneNumber}
                onChangeText={(text) => {
                  const formatted = formatMobileNumber(text);
                  setStoreData(prev => ({ ...prev, storePhoneNumber: formatted }));
                }}
                keyboardType="phone-pad"
                maxLength={13}
                placeholderTextColor={COLORS.GRAY_400}
              />
            </View>

            <Text style={[
              styles.phoneValidation,
              phoneValidationStatus ? styles.phoneValidationValid : styles.phoneValidationInvalid
            ]}>
              {phoneValidationStatus
                ? '✅ 연락처가 입력되었습니다'
                : '📞 유선 전화번호 또는 휴대폰 번호 중 하나는 필수입니다'
              }
            </Text>
          </View>

          {/* 위치 정보 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>위치 정보</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>매장 주소 *</Text>
              <TouchableOpacity
                style={styles.addressButton}
                onPress={() => setShowAddressModal(true)}
              >
                <Text style={[
                  styles.addressButtonText,
                  !storeData.roadAddress && { color: COLORS.GRAY_400 }
                ]}>
                  {storeData.roadAddress || '주소를 검색해주세요'}
                </Text>
                <Text style={styles.searchIcon}>🔍</Text>
              </TouchableOpacity>

              {storeData.jibunAddress && (
                <Text style={styles.jibunAddress}>지번: {storeData.jibunAddress}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>출퇴근 인증 반경</Text>
              <View style={styles.radiusContainer}>
                <TextInput
                  style={[styles.formInput, styles.radiusInput]}
                  placeholder="100"
                  value={storeData.radius.toString()}
                  onChangeText={(text) => {
                    const number = parseInt(text, 10) || 100;
                    setStoreData(prev => ({ ...prev, radius: number }));
                  }}
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.GRAY_400}
                />
                <Text style={styles.radiusUnit}>m</Text>
              </View>
              <Text style={styles.radiusDesc}>직원들이 출퇴근 체크를 할 수 있는 반경을 설정해주세요</Text>
            </View>
          </View>

          {/* 급여 정보 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>급여 정보</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                매장 기준 시급 *
                <Text style={styles.minimumWageText}> (최저시급: {minimumWage.toLocaleString()}원)</Text>
              </Text>
              <View style={styles.wageContainer}>
                <TextInput
                  style={[
                    styles.formInput,
                    styles.wageInput,
                    isWageBelowMinimum && styles.wageInputError
                  ]}
                  placeholder={minimumWage.toString()}
                  value={storeData.storeStandardHourWage?.toString() ?? ''}
                  onChangeText={(text) => {
                    const number = parseInt(text.replace(/[^\d]/g, ''), 10) || null;
                    setStoreData(prev => ({ ...prev, storeStandardHourWage: number }));
                  }}
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.GRAY_400}
                />
                <Text style={styles.wageUnit}>원</Text>
              </View>

              {isWageBelowMinimum && (
                <Text style={styles.wageErrorText}>
                  ⚠️ 최저시급({minimumWage.toLocaleString()}원) 이상으로 설정해주세요
                </Text>
              )}
            </View>
          </View>

          {/* 등록 버튼 */}
          <TouchableOpacity
            onPress={handleStoreRegistration}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.SODAM_ORANGE, COLORS.SODAM_BLUE]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
            >
              <Text style={styles.registerButtonText}>
                {isLoading ? '등록 중...' : '매장 등록하기'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 주소 검색 모달 */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>주소 검색</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowAddressModal(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="주소를 입력해주세요"
              value={addressSearchQuery}
              onChangeText={setAddressSearchQuery}
              onSubmitEditing={() => searchAddress(addressSearchQuery)}
              placeholderTextColor={COLORS.GRAY_400}
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => searchAddress(addressSearchQuery)}
            >
              <Text style={styles.searchButtonText}>검색</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.addressList}>
            {addressResults.map((address, index) => (
              <TouchableOpacity
                key={index}
                style={styles.addressItem}
                onPress={() => selectAddress(address)}
              >
                <Text style={styles.addressName}>{address.place_name}</Text>
                <Text style={styles.addressDetail}>도로명: {address.road_address_name}</Text>
                <Text style={styles.addressDetail}>지번: {address.address_name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginTop: 15,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  formCard: {
    backgroundColor: COLORS.WHITE,
    marginTop: -20,
    marginHorizontal: 20,
    borderRadius: 25,
    padding: 30,
    marginBottom: 30,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.GRAY_800,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.GRAY_700,
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 12,
    color: COLORS.GRAY_500,
    fontWeight: 'normal',
  },
  formInput: {
    borderWidth: 2,
    borderColor: COLORS.GRAY_200,
    borderRadius: 15,
    padding: 16,
    fontSize: 16,
    backgroundColor: COLORS.GRAY_50,
    color: COLORS.GRAY_800,
  },
  addressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: COLORS.GRAY_200,
    borderRadius: 15,
    padding: 16,
    backgroundColor: COLORS.GRAY_50,
  },
  addressButtonText: {
    fontSize: 16,
    color: COLORS.GRAY_800,
    flex: 1,
  },
  searchIcon: {
    fontSize: 18,
  },
  jibunAddress: {
    fontSize: 14,
    color: COLORS.GRAY_500,
    marginTop: 8,
    paddingLeft: 4,
  },
  radiusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radiusInput: {
    flex: 1,
    marginRight: 10,
  },
  radiusUnit: {
    fontSize: 16,
    color: COLORS.GRAY_600,
    fontWeight: '600',
  },
  radiusDesc: {
    fontSize: 14,
    color: COLORS.GRAY_500,
    marginTop: 8,
    paddingLeft: 4,
  },
  minimumWageText: {
    fontSize: 14,
    color: COLORS.GRAY_500,
    fontWeight: 'normal',
  },
  wageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wageInput: {
    flex: 1,
    marginRight: 10,
  },
  wageInputError: {
    borderColor: COLORS.ERROR,
    backgroundColor: '#FEF2F2',
  },
  wageUnit: {
    fontSize: 16,
    color: COLORS.GRAY_600,
    fontWeight: '600',
  },
  wageErrorText: {
    fontSize: 14,
    color: COLORS.ERROR,
    marginTop: 8,
    paddingLeft: 4,
  },
  phoneValidation: {
    fontSize: 14,
    marginTop: 8,
    paddingLeft: 4,
  },
  phoneValidationValid: {
    color: COLORS.SUCCESS,
  },
  phoneValidationInvalid: {
    color: COLORS.ERROR,
  },
  registerButton: {
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: COLORS.WHITE,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_200,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.GRAY_800,
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 20,
    color: COLORS.GRAY_600,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.GRAY_200,
    borderRadius: 15,
    padding: 16,
    fontSize: 16,
    backgroundColor: COLORS.GRAY_50,
  },
  searchButton: {
    backgroundColor: COLORS.SODAM_ORANGE,
    borderRadius: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
  },
  addressList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  addressItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_100,
  },
  addressName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.GRAY_800,
    marginBottom: 8,
  },
  addressDetail: {
    fontSize: 14,
    color: COLORS.GRAY_600,
    marginBottom: 4,
  },
});

export default StoreRegistrationScreen;
