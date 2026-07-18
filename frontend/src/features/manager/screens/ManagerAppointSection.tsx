import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppText,
    AppToast,
    ConfirmSheet,
} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {spacing} from '../../../theme/tokens';
import {useAppointManager, useStoreManagers, useUpdateManagerPermissions} from '../hooks/useManagedStores';
import {
    DEFAULT_MANAGER_PERMISSIONS,
    MANAGER_PERMISSION_LABEL,
    type ManagerPermission,
} from '../types';

interface Props {
    storeId: number;
    employeeId: number;
    employeeName: string;
    navigation: NativeStackNavigationProp<HomeStackParamList>;
}

const ManagerAppointSection: React.FC<Props> = ({storeId, employeeId, employeeName, navigation}) => {
    const managers = useStoreManagers(storeId);
    const appoint = useAppointManager(storeId);
    const updatePermissions = useUpdateManagerPermissions(storeId);
    const current = managers.data?.find(item => item.employeeId === employeeId);
    const reissueRequired = Boolean(
        current?.pendingVersion
        && current.signatureStatus
        && ['DECLINED', 'EXPIRED', 'FAILED', 'CANCELLED', 'MANUAL_REISSUE_REQUIRED'].includes(current.signatureStatus),
    );
    const [editing, setEditing] = useState(false);
    const [selected, setSelected] = useState<ManagerPermission[]>([]);

    useEffect(() => {
        if (current) {
            setSelected(current.pendingPermissions ?? current.permissions);
        }
    }, [current]);

    const togglePermission = (permission: ManagerPermission) => {
        setSelected(value => value.includes(permission)
            ? value.filter(item => item !== permission)
            : [...value, permission]);
    };

    const savePermissions = () => {
        if (!current || selected.length === 0) {
            AppToast.warn('권한을 하나 이상 선택해 주세요.');
            return;
        }
        updatePermissions.mutate(
            {employeeId, permissions: selected},
            {
                onSuccess: result => {
                    setEditing(false);
                    if (result.signatureRequired && result.envelopeId) {
                        navigation.navigate('ElectronicSign', {envelopeId: result.envelopeId});
                    } else {
                        AppToast.success('축소된 권한이 즉시 적용됐어요.');
                    }
                },
                onError: () => AppToast.error('권한 변경을 저장하지 못했어요.'),
            },
        );
    };

    const continueOrReissueSignature = () => {
        if (!current?.signatureEnvelopeId) {
            return;
        }
        if (reissueRequired && current.pendingPermissions) {
            updatePermissions.mutate(
                {employeeId, permissions: current.pendingPermissions},
                {
                    onSuccess: result => {
                        if (result.envelopeId) {
                            navigation.navigate('ElectronicSign', {envelopeId: result.envelopeId});
                        }
                    },
                    onError: () => AppToast.error('재서명 문서를 발급하지 못했어요.'),
                },
            );
            return;
        }
        navigation.navigate('ElectronicSign', {envelopeId: current.signatureEnvelopeId});
    };

    const confirmAppointment = () => ConfirmSheet.confirm({
        title: `${employeeName}님을 매니저로 지정할까요?`,
        description: [
            '기본 운영 권한 6개가 위임장에 고정되어 사업주와 매니저가 순서대로 전자서명합니다.',
            '양쪽 서명이 서버에서 검증되기 전에는 어떤 매니저 권한도 발효되지 않습니다.',
            '위임 후에도 근로기준법상 최종 책임은 사업주에게 있습니다.',
        ].join('\n\n'),
        primary: {
            label: '위임장 만들기',
            onPress: () => appoint.mutate(
                {employeeId, permissions: DEFAULT_MANAGER_PERMISSIONS},
                {
                    onSuccess: result => navigation.navigate('ElectronicSign', {envelopeId: result.envelopeId}),
                    onError: (error: unknown) => {
                        const message = (error as {response?: {data?: {message?: string}}})?.response?.data?.message;
                        AppToast.error(message ?? '매니저 위임장을 만들지 못했어요.');
                    },
                },
            ),
        },
        secondary: {label: '취소'},
    });

    return (
        <AppCard variant="warm" style={styles.card}>
            <View style={styles.headingRow}>
                <View style={styles.flex}>
                    <AppText variant="titleMd">매니저 권한 위임</AppText>
                    <AppText variant="caption" tone="secondary" style={styles.description}>
                        출퇴근·스케줄·휴가·직원조회·대타/공지·운영현황 권한을 전자 위임장으로 지정합니다.
                    </AppText>
                </View>
                {current ? (
                    <AppBadge
                        label={current.pendingVersion ? '권한 확대 서명 대기' : current.active ? '위임 완료' : '서명 대기'}
                        tone={current.active && !current.pendingVersion ? 'success' : 'warning'}
                    />
                ) : null}
            </View>

            {current ? (
                <>
                    <View style={styles.permissions}>
                        {current.permissions.map(permission => (
                            <AppBadge key={permission} label={MANAGER_PERMISSION_LABEL[permission]} tone="neutral" />
                        ))}
                    </View>
                    {current.pendingPermissions ? (
                        <AppText variant="caption" tone="secondary" style={styles.pendingText}>
                            확대 예정: {current.pendingPermissions.map(permission => MANAGER_PERMISSION_LABEL[permission]).join(', ')}
                        </AppText>
                    ) : null}
                    {editing ? (
                        <>
                            <View style={styles.editor}>
                                {(Object.keys(MANAGER_PERMISSION_LABEL) as ManagerPermission[]).map(permission => (
                                    <Pressable key={permission} onPress={() => togglePermission(permission)}>
                                        <AppBadge
                                            label={MANAGER_PERMISSION_LABEL[permission]}
                                            tone={selected.includes(permission) ? 'info' : 'neutral'}
                                        />
                                    </Pressable>
                                ))}
                            </View>
                            <AppButton
                                label="권한 변경 저장"
                                onPress={savePermissions}
                                loading={updatePermissions.isPending}
                                style={styles.button}
                            />
                            <AppButton label="취소" variant="ghost" onPress={() => setEditing(false)} />
                        </>
                    ) : (
                        <AppButton label="권한 편집" variant="secondary" onPress={() => setEditing(true)} style={styles.button} />
                    )}
                    {current.signatureEnvelopeId ? (
                        <AppButton
                            label={reissueRequired
                                ? '권한 확대 재서명 발급'
                                : current.pendingVersion
                                    ? '권한 확대 서명 계속하기'
                                    : current.active ? '위임 문서 확인' : '전자서명 계속하기'}
                            variant="secondary"
                            onPress={continueOrReissueSignature}
                            loading={updatePermissions.isPending}
                            style={styles.button}
                        />
                    ) : null}
                </>
            ) : (
                <AppButton label="매니저로 지정" onPress={confirmAppointment} loading={appoint.isPending} style={styles.button} />
            )}
        </AppCard>
    );
};

const styles = StyleSheet.create({
    card: {marginTop: spacing.xxl},
    headingRow: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm},
    flex: {flex: 1},
    description: {marginTop: spacing.xs, lineHeight: 20},
    permissions: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md},
    editor: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg},
    pendingText: {marginTop: spacing.sm},
    button: {marginTop: spacing.lg},
});

export default ManagerAppointSection;
