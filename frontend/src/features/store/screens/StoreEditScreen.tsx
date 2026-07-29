import {AppToast, AppButton, AppHeader, AppInput, AppText, CtaStack, ScreenContainer} from '../../../common/components/ds';
import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {radius as tokenRadius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import storeService from '../services/storeService';
import PayrollCycleEditor, {PayrollCycleForm, defaultPayrollCycle, fromStorePayrollCycle, toPayrollCyclePayload} from '../components/PayrollCycleEditor';
import BusinessTypePicker from '../components/BusinessTypePicker';
import AddressSearchModal, {AddressSearchResult} from '../components/AddressSearchModal';
import {RadiusSelectorSheet} from '../components/StoreSheets';

/** 개발용 시각 검증 전용 — GET /api/stores/{storeId} 조회를 고정 폼 초기값으로 대체한다. */
export interface StoreEditVisualFixture {
    storeName: string;
    phone: string;
    businessType: string;
    standardWage: string;
    radius: string;
    fullAddress: string;
    cycle?: Partial<PayrollCycleForm>;
}

interface Props {
    visualFixture?: StoreEditVisualFixture;
}

/**
 * 14 StoreEdit — 확정 시안.
 * 매장명·전화·업종·기본시급·반경 편집. 조회/저장 로직 보존.
 */
const StoreEditScreen: React.FC<Props> = ({visualFixture}) => {
    const route = useRoute<RouteProp<HomeStackParamList, 'StoreEdit'>>();
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const c = useThemeColors();
    const storeId = route.params?.storeId;

    const [storeName, setStoreName] = useState(visualFixture?.storeName ?? '');
    const [phone, setPhone] = useState(visualFixture?.phone ?? '');
    const [businessType, setBusinessType] = useState(visualFixture?.businessType ?? '');
    const [standardWage, setStandardWage] = useState(visualFixture?.standardWage ?? '');
    const [radius, setRadius] = useState(visualFixture?.radius ?? '100');
    const [loading, setLoading] = useState(false);

    // 주소/위치 — 카카오 주소 API 키 미발급 상태라 수동 입력 + 좌표 목 보정으로 처리.
    const [fullAddress, setFullAddress] = useState(visualFixture?.fullAddress ?? '');
    const [initialAddress, setInitialAddress] = useState(visualFixture?.fullAddress ?? '');
    const [coords, setCoords] = useState<{latitude: number; longitude: number} | null>(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [showRadiusSheet, setShowRadiusSheet] = useState(false);

    // 급여 정산 주기(시작/마감/지급일)
    const [cycle, setCycle] = useState<PayrollCycleForm>({
        ...defaultPayrollCycle(),
        ...visualFixture?.cycle,
    });
    const [showBusinessTypeModal, setShowBusinessTypeModal] = useState(false);

    useEffect(() => {
        if (visualFixture) {
            return;
        }
        (async () => {
            if (!storeId) {
                return;
            }
            try {
                const s = await storeService.getStoreById(storeId);
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
                const pc = fromStorePayrollCycle(s.payrollCycle);
                if (pc) {
                    setCycle(pc);
                }
            } catch (_) {/* ignore */}
        })();
    }, [storeId, visualFixture]);

    const selectAddress = (address: AddressSearchResult) => {
        setFullAddress(address.roadAddress || address.query);
        setCoords(null);
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
            await storeService.updateStore(storeId, {
                storeName,
                storePhoneNumber: phone,
                businessType,
                storeStandardHourWage: wage,
                radius: r,
                payrollCycle: toPayrollCyclePayload(cycle) ?? undefined,
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
                <View>
                    <AppText variant="caption" tone="secondary" style={styles.fieldLabel}>업종</AppText>
                    <Pressable
                        style={[styles.businessTypeBtn, {borderColor: c.border, backgroundColor: c.background}]}
                        onPress={() => setShowBusinessTypeModal(true)}>
                        <AppText variant="bodyMd" tone={businessType ? 'primary' : 'tertiary'} numberOfLines={1} style={styles.flex}>
                            {businessType || '업종을 선택해 주세요'}
                        </AppText>
                        <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
                    </Pressable>
                </View>
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
                        onPress={() => setShowAddressModal(true)}
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
                <AppButton
                    label="추천 반경에서 빠르게 선택"
                    variant="ghost"
                    size="md"
                    onPress={() => setShowRadiusSheet(true)}
                    leftIcon={<Ionicons name="locate-outline" size={16} color={c.brandPrimary} />}
                    style={styles.radiusQuickBtn}
                />
            </Section>

            <Section title="급여">
                <AppInput label="기본 시급 (원/시간)" value={standardWage} onChangeText={setStandardWage} keyboardType="number-pad" />
            </Section>

            <Section title="급여 정산 주기">
                <PayrollCycleEditor value={cycle} onChange={setCycle} />
            </Section>

            <BusinessTypePicker
                visible={showBusinessTypeModal}
                value={businessType}
                onSelect={setBusinessType}
                onClose={() => setShowBusinessTypeModal(false)}
            />
            <AddressSearchModal
                visible={showAddressModal}
                initialQuery={fullAddress}
                onSelect={selectAddress}
                onClose={() => setShowAddressModal(false)}
            />
            {/* 54 반경 설정 시트 배선 — 죽은 코드였던 RadiusSelectorSheet 를 실제 화면에 연결(§4.1) */}
            <RadiusSelectorSheet
                visible={showRadiusSheet}
                onClose={() => setShowRadiusSheet(false)}
                value={[50, 80, 120].indexOf(parseInt(radius, 10)) >= 0 ? [50, 80, 120].indexOf(parseInt(radius, 10)) : 1}
                onApply={meters => {
                    setRadius(String(meters));
                    setShowRadiusSheet(false);
                }}
            />
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
    radiusQuickBtn: {marginTop: spacing.xs, alignSelf: 'flex-start'},
    addressBlock: {gap: spacing.sm},
    addressBtn: {alignSelf: 'flex-start'},
    fieldLabel: {marginBottom: spacing.xs},
    businessTypeBtn: {
        minHeight: 48, borderWidth: 1, borderRadius: tokenRadius.lg,
        paddingHorizontal: spacing.md, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm,
    },
    flex: {flex: 1},
});

export default StoreEditScreen;
