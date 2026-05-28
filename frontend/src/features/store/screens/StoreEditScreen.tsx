import {AppToast} from '../../../common/components/ds';
import React, {useEffect, useState} from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    CtaStack,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import api from '../../../common/utils/api';

/**
 * 14 StoreEdit — 확정 시안.
 * 매장명·전화·업종·기본시급·반경 편집. 조회/저장 로직 보존.
 */
const StoreEditScreen: React.FC = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const storeId = route.params?.storeId as number | undefined;

    const [storeName, setStoreName] = useState('');
    const [phone, setPhone] = useState('');
    const [businessType, setBusinessType] = useState('');
    const [standardWage, setStandardWage] = useState('');
    const [radius, setRadius] = useState('100');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            if (!storeId) {
                return;
            }
            try {
                const res = await api.get<any>(`/api/stores/${storeId}`);
                const s = res.data as any;
                setStoreName(s.storeName ?? '');
                setPhone(s.storePhoneNumber ?? '');
                setBusinessType(s.businessType ?? '');
                setStandardWage(s.storeStandardHourWage ? String(s.storeStandardHourWage) : '');
                setRadius(s.radius ? String(s.radius) : '100');
            } catch (_) {/* ignore */}
        })();
    }, [storeId]);

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
            Alert.alert('완료', '매장 정보가 변경됐어요.', [{text: '확인', onPress: () => navigation.goBack()}]);
        } catch (e: any) {
            Alert.alert('실패', e?.response?.data?.message ?? '변경에 실패했어요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="매장 정보 수정" onBack={() => navigation.goBack()} />}
            footer={
                <CtaStack bordered>
                    <AppButton label="변경사항 저장" loading={loading} onPress={submit} />
                </CtaStack>
            }>
            <View style={styles.form}>
                <AppInput label="매장명" value={storeName} onChangeText={setStoreName} />
                <AppInput label="전화번호" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                <AppInput label="업종" value={businessType} onChangeText={setBusinessType} placeholder="예: 음식점" />
                <AppInput label="기본 시급 (원/시간)" value={standardWage} onChangeText={setStandardWage} keyboardType="number-pad" />
                <AppInput
                    label="출퇴근 인증 반경 (m)"
                    value={radius}
                    onChangeText={setRadius}
                    keyboardType="number-pad"
                    helper="50~1000m 권장"
                />
            </View>

            <AppCard variant="warm" style={styles.note}>
                <AppText variant="titleMd">위치를 바꾸면</AppText>
                <AppText variant="caption" tone="secondary" style={styles.noteSub}>
                    직원의 출퇴근 가능 반경도 함께 변경됩니다.
                </AppText>
            </AppCard>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    form: {gap: spacing.md},
    note: {marginTop: spacing.lg},
    noteSub: {marginTop: 4},
});

export default StoreEditScreen;
