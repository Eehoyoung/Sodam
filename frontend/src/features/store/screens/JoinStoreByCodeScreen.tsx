import React, {useState} from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {tokens} from '../../../theme/tokens';
import Button from '../../../common/components/form/Button';
import Input from '../../../common/components/form/Input';
import api from '../../../common/utils/api';

/**
 * 매장 코드 가입 (PRD_EMPLOYEE E-301).
 *
 * 직원 본인이 사장이 공유한 매장 코드를 입력해 매장에 가입.
 * QR 스캔은 추후 카메라 SDK 도입 시 구현 — 본 화면은 코드 직접 입력 + 자리 안내.
 *
 * TODO[CONFIRM-C-2 후]: react-native-camera 또는 react-native-vision-camera 도입 후
 *   QR 스캐너 컴포넌트(`<QrCameraScanner onScanned={code => ...}/>`) 연결.
 */
const JoinStoreByCodeScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        const normalized = code.trim().toUpperCase();
        if (normalized.length < 8) {
            Alert.alert('확인 필요', '매장 코드는 보통 ST 로 시작하는 12자 이상이에요.');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post<{id: number; storeName: string}>(
                '/api/stores/join-by-code',
                {storeCode: normalized},
            );
            const storeName = (res.data as any)?.storeName ?? '매장';
            Alert.alert('가입 완료', `${storeName} 에 가입되었어요!`, [
                {text: '확인', onPress: () => navigation.goBack()},
            ]);
        } catch (e: any) {
            const msg = e?.response?.data?.message
                ?? (e?.response?.status === 404
                    ? '매장 코드와 일치하는 매장을 찾을 수 없어요.'
                    : '잠시 후 다시 시도해 주세요.');
            Alert.alert('가입 실패', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <Text style={styles.title}>
                        사장님이 알려주신{'\n'}매장 코드를 입력해 주세요
                    </Text>
                    <Text style={styles.subtitle}>
                        가입 후 출퇴근·급여를 한 화면에서 확인할 수 있어요.
                    </Text>

                    <Input
                        label="매장 코드"
                        value={code}
                        onChangeText={v => setCode(v.toUpperCase())}
                        placeholder="예: ST1234ABCD"
                        autoCapitalize="characters"
                        autoCorrect={false}
                        editable={!loading}
                        helperText="대소문자 구분 없이 입력해도 괜찮아요."
                    />

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>또는</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <View style={styles.qrPlaceholder}>
                        <Text style={styles.qrEmoji}>📷</Text>
                        <Text style={styles.qrTitle}>QR 스캔으로 가입하기</Text>
                        <Text style={styles.qrBody}>
                            카메라 권한 허용 후 매장 QR 을 비춰주세요.{'\n'}
                            (정식 출시 직전 활성화)
                        </Text>
                    </View>

                    <Button
                        title="매장 가입하기"
                        onPress={submit}
                        variant="primary"
                        size="lg"
                        fullWidth
                        loading={loading}
                        disabled={code.length < 8}
                        style={styles.cta}
                    />

                    <Pressable
                        onPress={() => Alert.alert(
                            '매장 코드는 어디서 받나요?',
                            '사장님 앱의 [매장 → 매장 코드] 에서 확인하거나, 카운터에 부착된 QR 을 스캔할 수 있어요.',
                        )}
                        style={({pressed}) => [styles.helpRow, pressed && {opacity: 0.5}]}
                    >
                        <Text style={styles.helpText}>매장 코드는 어디서 받나요?</Text>
                    </Pressable>
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
        letterSpacing: -0.5,
        marginTop: tokens.spacing.md,
        marginBottom: tokens.spacing.sm,
        lineHeight: 32,
    },
    subtitle: {
        fontSize: tokens.typography.sizes.md,
        color: tokens.colors.textSecondary,
        marginBottom: tokens.spacing.xxl,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: tokens.spacing.xl,
    },
    dividerLine: {flex: 1, height: 1, backgroundColor: tokens.colors.divider},
    dividerText: {
        paddingHorizontal: tokens.spacing.md,
        color: tokens.colors.textTertiary,
        fontSize: tokens.typography.sizes.xs,
    },
    qrPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: tokens.colors.border,
        borderStyle: 'dashed',
        borderRadius: tokens.radius.xl,
        padding: tokens.spacing.xxl,
        backgroundColor: tokens.colors.surface,
        gap: tokens.spacing.sm,
    },
    qrEmoji: {fontSize: 56},
    qrTitle: {
        fontSize: tokens.typography.sizes.md,
        fontWeight: tokens.typography.weights.semibold,
        color: tokens.colors.textPrimary,
    },
    qrBody: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.textTertiary,
        textAlign: 'center',
        lineHeight: 18,
    },
    cta: {marginTop: tokens.spacing.xxl},
    helpRow: {alignItems: 'center', paddingVertical: tokens.spacing.lg},
    helpText: {
        color: tokens.colors.brandPrimary,
        fontSize: tokens.typography.sizes.sm,
        fontWeight: tokens.typography.weights.medium,
    },
});

export default JoinStoreByCodeScreen;
