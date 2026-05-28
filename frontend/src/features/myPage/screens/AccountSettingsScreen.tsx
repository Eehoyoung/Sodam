import {AppToast} from '../../../common/components/ds';
import React, {useState} from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import api from '../../../common/utils/api';
import {useAuth} from '../../../contexts/AuthContext';

/**
 * 42 AccountSettings — 확정 시안.
 * 이름 변경 + 회원 탈퇴. saveName/withdraw 로직 보존.
 */
const AccountSettingsScreen: React.FC = () => {
    const {user, logout} = useAuth() as any;
    const navigation = useNavigation<any>();
    const [name, setName] = useState(user?.name ?? '');
    const [saving, setSaving] = useState(false);

    const saveName = async () => {
        if (!name || name.trim().length < 2) {
            AppToast.warn('이름은 2자 이상이어야 해요.');
            return;
        }
        setSaving(true);
        try {
            await api.put('/api/user/me', {name: name.trim()});
            AppToast.success('이름이 변경됐어요.');
        } catch (e: any) {
            Alert.alert('실패', e?.response?.data?.message ?? '변경에 실패했어요.');
        } finally {
            setSaving(false);
        }
    };

    const withdraw = () => {
        if (!user?.id) {
            return;
        }
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
                            const msg =
                                e?.response?.data?.message ??
                                (e?.response?.status === 400 ? '활성 구독을 먼저 해지해 주세요.' : '탈퇴 처리에 실패했어요.');
                            Alert.alert('실패', msg);
                        }
                    },
                },
            ],
        );
    };

    return (
        <ScreenContainer scroll header={<AppHeader title="계정 설정" onBack={() => navigation.goBack()} />}>
            <AppCard variant="flat">
                <AppInput label="이름" value={name} onChangeText={setName} placeholder="실명 또는 닉네임" helper="2~50자" />
                <AppButton label="이름 변경" size="md" loading={saving} onPress={saveName} style={styles.cta} />
            </AppCard>

            <AppText variant="caption" tone="secondary" style={styles.sectionTitle}>이메일</AppText>
            <AppCard variant="flat">
                <AppText variant="bodyMd">{user?.email ?? '-'}</AppText>
                <AppText variant="caption" tone="tertiary" style={styles.helper}>
                    이메일 변경은 별도 인증이 필요해요 (출시 후 지원).
                </AppText>
            </AppCard>

            <AppText variant="caption" tone="secondary" style={styles.sectionTitle}>위험</AppText>
            <AppCard variant="danger">
                <AppText variant="titleMd">계정 탈퇴 전 확인</AppText>
                <AppText variant="caption" tone="secondary" style={styles.helper}>
                    탈퇴 후에는 출퇴근·급여 데이터를 다시 조회할 수 없어요.
                </AppText>
                <AppButton label="회원 탈퇴" variant="destructive" size="md" onPress={withdraw} style={styles.cta} />
            </AppCard>
            <View style={styles.bottomGap} />
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    cta: {marginTop: spacing.md},
    sectionTitle: {marginTop: spacing.xl, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5},
    helper: {marginTop: spacing.sm},
    bottomGap: {height: spacing.xl},
});

export default AccountSettingsScreen;
