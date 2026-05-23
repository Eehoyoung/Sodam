import React, {useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {tokens} from '../../../theme/tokens';
import Input from '../../../common/components/form/Input';
import Button from '../../../common/components/form/Button';
import Card from '../../../common/components/data-display/Card';
import api from '../../../common/utils/api';
import {useAuth} from '../../../contexts/AuthContext';

/**
 * 계정 설정 — 본인 정보 변경(이름) + 회원 탈퇴.
 *
 * PRD_OWNER A4·A5, PRD_EMPLOYEE E-A?.
 */
const AccountSettingsScreen: React.FC = () => {
    const {user, logout} = useAuth() as any;
    const navigation = useNavigation<any>();
    const [name, setName] = useState(user?.name ?? '');
    const [saving, setSaving] = useState(false);

    const saveName = async () => {
        if (!name || name.trim().length < 2) {
            Alert.alert('확인 필요', '이름은 2자 이상이어야 해요.');
            return;
        }
        setSaving(true);
        try {
            await api.put('/api/user/me', {name: name.trim()});
            Alert.alert('완료', '이름이 변경됐어요.');
        } catch (e: any) {
            Alert.alert('실패', e?.response?.data?.message ?? '변경에 실패했어요.');
        } finally {
            setSaving(false);
        }
    };

    const withdraw = () => {
        if (!user?.id) return;
        Alert.alert(
            '회원 탈퇴',
            '정말 탈퇴하시겠어요?\n\n• 활성 구독이 있으면 차단됩니다.\n• 90일 후 개인정보가 자동 익명화됩니다.\n• 이 작업은 되돌릴 수 없어요.',
            [
                {text: '취소', style: 'cancel'},
                {
                    text: '탈퇴하기',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/api/user/${user.id}`);
                            Alert.alert('탈퇴 완료', '이용해 주셔서 감사했어요.', [
                                {
                                    text: '확인',
                                    onPress: async () => {
                                        try {
                                            await logout?.();
                                        } catch (_) {/* ignore */}
                                        navigation.reset({index: 0, routes: [{name: 'Auth' as never}]});
                                    },
                                },
                            ]);
                        } catch (e: any) {
                            const msg = e?.response?.data?.message
                                ?? (e?.response?.status === 400
                                    ? '활성 구독을 먼저 해지해 주세요.'
                                    : '탈퇴 처리에 실패했어요.');
                            Alert.alert('실패', msg);
                        }
                    },
                },
            ],
        );
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>계정 설정</Text>

                <Card bordered>
                    <Input
                        label="이름"
                        value={name}
                        onChangeText={setName}
                        placeholder="실명 또는 닉네임"
                        helperText="2~50자"
                    />
                    <Button
                        title="이름 변경"
                        onPress={saveName}
                        variant="primary"
                        size="md"
                        fullWidth
                        loading={saving}
                        style={{marginTop: tokens.spacing.md}}
                    />
                </Card>

                <Text style={styles.sectionTitle}>이메일</Text>
                <Card bordered>
                    <Text style={styles.kv}>
                        {user?.email ?? '-'}
                    </Text>
                    <Text style={styles.helper}>이메일 변경은 별도 인증이 필요해요 (출시 후 지원).</Text>
                </Card>

                <Text style={styles.sectionTitle}>위험</Text>
                <Card bordered>
                    <Text style={styles.warnText}>
                        탈퇴 후에는 출퇴근·급여 데이터를 다시 조회할 수 없어요.
                    </Text>
                    <Button
                        title="회원 탈퇴"
                        onPress={withdraw}
                        variant="destructive"
                        size="md"
                        fullWidth
                        style={{marginTop: tokens.spacing.md}}
                    />
                </Card>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: tokens.colors.background},
    scrollContent: {padding: tokens.spacing.lg, paddingBottom: tokens.spacing.huge},
    title: {
        fontSize: tokens.typography.sizes.xxl,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.textPrimary,
        marginTop: tokens.spacing.md,
        marginBottom: tokens.spacing.lg,
    },
    sectionTitle: {
        fontSize: tokens.typography.sizes.sm,
        fontWeight: tokens.typography.weights.semibold,
        color: tokens.colors.textSecondary,
        marginTop: tokens.spacing.xl,
        marginBottom: tokens.spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    kv: {fontSize: tokens.typography.sizes.md, color: tokens.colors.textPrimary},
    helper: {fontSize: tokens.typography.sizes.xs, color: tokens.colors.textTertiary, marginTop: tokens.spacing.sm},
    warnText: {color: tokens.colors.textSecondary, fontSize: tokens.typography.sizes.sm, lineHeight: 20},
});

export default AccountSettingsScreen;
