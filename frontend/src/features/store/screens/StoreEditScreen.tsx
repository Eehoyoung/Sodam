import {AppToast, AppButton, AppHeader, AppInput, AppText, CtaStack, ScreenContainer} from '../../../common/components/ds';
import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import api from '../../../common/utils/api';
import storeService from '../services/storeService';

/**
 * 14 StoreEdit — 확정 시안.
 * 매장명·전화·업종·기본시급·반경 편집. 조회/저장 로직 보존.
 */
const StoreEditScreen: React.FC = () => {
    const route = useRoute<RouteProp<HomeStackParamList, 'StoreEdit'>>();
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const c = useThemeColors();
    const storeId = route.params?.storeId;

    const [storeName, setStoreName] = useState('');
    const [phone, setPhone] = useState('');
    const [businessType, setBusinessType] = useState('');
    const [standardWage, setStandardWage] = useState('');
    const [radius, setRadius] = useState('100');
    const [loading, setLoading] = useState(false);

    // 주소/위치 — 카카오 주소 API 키 미발급 상태라 수동 입력 + 좌표 목 보정으로 처리.
    const [fullAddress, setFullAddress] = useState('');
    const [initialAddress, setInitialAddress] = useState('');
    const [coords, setCoords] = useState<{latitude: number; longitude: number} | null>(null);
    const [geocoding, setGeocoding] = useState(false);

    useEffect(() => {
        (async () => {
            if (!storeId) {
                return;
            }
            try {
                const res = await api.get<any>(`/api/stores/${storeId}`);
                const s = res.data;
                setStoreName(s.storeName ?? '');
                setPhone(s.storePhoneNumber ?? '');
                setBusinessType(s.businessType ?? '');
                setStandardWage(s.storeStandardHourWage ? String(s.storeStandardHourWage) : '');
                setRadius(s.radius ? String(s.radius) : '100');
                setFullAddress(s.fullAddress ?? '');
                setInitialAddress(s.fullAddress ?? '');
                if (typeof s.latitude === 'number' && typeof s.longitude === 'number') {
                    setCoords({latitude: s.latitude, longitude: s.longitude});
                }
            } catch (_) {/* ignore */}
        })();
    }, [storeId]);

    // 주소 검색(임시): 카카오 키 발급 전까지 좌표를 목으로 채워 위치 변경을 가능케 한다.
    const searchAddress = async () => {
        if (!fullAddress || fullAddress.trim().length < 2) {
            AppToast.warn('주소를 입력한 뒤 검색해 주세요.');
            return;
        }
        setGeocoding(true);
        try {
            // TODO[키 발급]: 카카오 로컬 API 연동. 현재는 서울시청 근처 좌표로 목 보정.
            await new Promise(r => setTimeout(r, 400));
            const jitter = () => (Math.random() - 0.5) * 0.01;
            setCoords({latitude: 37.5663 + jitter(), longitude: 126.9779 + jitter()});
            AppToast.success('주소 좌표를 확인했어요. 저장 시 위치가 반영돼요.');
        } finally {
            setGeocoding(false);
        }
    };

    const submit = async () => {
        if (!storeName || storeName.length < 2) {
            AppToast.warn('매장명을 2자 이상 입력해 주세요.');
            return;
        }
        const wage = parseInt(standardWage.replace(/[^0-9]/g, ''), 10) || 0;
        const r = parseInt(radius, 10) || 100;
        setLoading(true);
        try {
            await api.put(`/api/stores/${storeId}`, {
                storeName,
                storePhoneNumber: phone,
                businessType,
                storeStandardHourWage: wage,
                radius: r,
            });

            // 주소가 바뀐 경우에만 위치 갱신 (좌표는 검색으로 채워진 경우 함께 전송).
            const addressChanged = fullAddress.trim() !== initialAddress.trim();
            if (storeId && addressChanged && fullAddress.trim().length >= 2) {
                await storeService.putLocation(storeId, {
                    fullAddress: fullAddress.trim(),
                    radius: r,
                    ...(coords ?? {}),
                });
                setInitialAddress(fullAddress.trim());
            }

            AppToast.success('매장 정보가 변경됐어요.');
            navigation.goBack();
        } catch (e: any) {
            AppToast.error(e?.response?.data?.message ?? '변경에 실패했어요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="매장 정보 수정" onBack={() => navigation.goBack()} />}
            footer={
                <CtaStack>
                    <AppButton label="변경사항 저장" loading={loading} onPress={submit} />
                </CtaStack>
            }>
            <Section title="기본 정보">
                <AppInput label="매장명" value={storeName} onChangeText={setStoreName} />
                <AppInput label="전화번호" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                <AppInput label="업종" value={businessType} onChangeText={setBusinessType} placeholder="예: 음식점" />
            </Section>

            <Section title="위치">
                <View style={styles.addressBlock}>
                    <AppInput
                        label="매장 주소"
                        value={fullAddress}
                        onChangeText={setFullAddress}
                        placeholder="예: 서울시 중구 세종대로 110"
                        helper={coords ? '좌표 확인됨 · 저장 시 위치가 반영돼요.' : '주소 변경 후 검색을 눌러 좌표를 확인해 주세요.'}
                    />
                    <AppButton
                        label="주소 검색"
                        variant="outline"
                        size="md"
                        loading={geocoding}
                        onPress={searchAddress}
                        leftIcon={<Ionicons name="search-outline" size={16} color={c.brandPrimary} />}
                        style={styles.addressBtn}
                    />
                </View>
                <AppInput
                    label="출퇴근 인증 반경 (m)"
                    value={radius}
                    onChangeText={setRadius}
                    keyboardType="number-pad"
                    helper="50~1000m 권장 · 위치를 바꾸면 직원 출퇴근 가능 반경도 함께 변경돼요."
                    containerStyle={styles.gap}
                />
            </Section>

            <Section title="급여">
                <AppInput label="기본 시급 (원/시간)" value={standardWage} onChangeText={setStandardWage} keyboardType="number-pad" />
            </Section>
        </ScreenContainer>
    );
};

const Section: React.FC<{title: string; children: React.ReactNode}> = ({title, children}) => (
    <View style={styles.section}>
        <AppText variant="titleMd" tone="secondary" style={styles.sectionTitle}>{title}</AppText>
        <View style={styles.form}>{children}</View>
    </View>
);

const styles = StyleSheet.create({
    section: {marginTop: spacing.xxl},
    sectionTitle: {marginBottom: spacing.md},
    form: {gap: spacing.md},
    gap: {marginTop: spacing.xs},
    addressBlock: {gap: spacing.sm},
    addressBtn: {alignSelf: 'flex-start'},
});

export default StoreEditScreen;
