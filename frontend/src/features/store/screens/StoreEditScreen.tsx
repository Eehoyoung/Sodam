import React, {useEffect, useState} from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {tokens} from '../../../theme/tokens';
import Input from '../../../common/components/form/Input';
import Button from '../../../common/components/form/Button';
import Card from '../../../common/components/data-display/Card';
import api from '../../../common/utils/api';

/**
 * 사장 매장 정보 편집 (PRD_OWNER S-501a).
 *
 * 매장명·전화·업종·기본시급·반경. 위치 변경은 별도 (위치 수정).
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
            if (!storeId) return;
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
            Alert.alert('확인 필요', '매장명을 2자 이상 입력해 주세요.');
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
            Alert.alert('완료', '매장 정보가 변경됐어요.', [
                {text: '확인', onPress: () => navigation.goBack()},
            ]);
        } catch (e: any) {
            Alert.alert('실패', e?.response?.data?.message ?? '변경에 실패했어요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.title}>매장 정보 편집</Text>
                    <Card bordered>
                        <Input label="매장명" value={storeName} onChangeText={setStoreName} />
                        <Input label="전화번호" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                        <Input label="업종" value={businessType} onChangeText={setBusinessType} placeholder="예: 음식점" />
                        <Input label="기본 시급 (원/시간)" value={standardWage} onChangeText={setStandardWage} keyboardType="number-pad" />
                        <Input label="출퇴근 인증 반경 (m)" value={radius} onChangeText={setRadius} keyboardType="number-pad" helperText="50~1000m 권장" />
                    </Card>
                    <Button
                        title="저장하기"
                        onPress={submit}
                        variant="primary"
                        size="lg"
                        fullWidth
                        loading={loading}
                        style={{marginTop: tokens.spacing.xl}}
                    />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: tokens.colors.background},
    flex: {flex: 1},
    scrollContent: {padding: tokens.spacing.lg, paddingBottom: tokens.spacing.huge},
    title: {
        fontSize: tokens.typography.sizes.xxl,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.textPrimary,
        marginTop: tokens.spacing.md,
        marginBottom: tokens.spacing.lg,
        letterSpacing: -0.3,
    },
});

export default StoreEditScreen;
