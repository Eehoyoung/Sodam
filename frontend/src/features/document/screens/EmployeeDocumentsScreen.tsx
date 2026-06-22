import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation, useRoute, useFocusEffect, RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
    type BadgeTone,
} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';
import {EmployeeDocument, ExpiryStatus, fetchDocuments} from '../services/documentService';

type Route = RouteProp<{D: {storeId: number; employeeId: number; employeeName?: string}}, 'D'>;

const ICON: Record<string, string> = {
    HEALTH_CERTIFICATE: 'medkit-outline',
    LABOR_CONTRACT: 'document-text-outline',
    BANKBOOK: 'card-outline',
    ID_CARD: 'person-outline',
    ETC: 'folder-outline',
};

const STATUS: Record<ExpiryStatus, {tone: BadgeTone; text: (d?: number | null) => string}> = {
    OK: {tone: 'neutral', text: () => '유효'},
    EXPIRING: {tone: 'warning', text: d => (typeof d === 'number' ? `D-${d}` : '임박')},
    EXPIRED: {tone: 'error', text: () => '만료됨'},
};

/**
 * A5 직원 서류함 — 보건증 등 보관 + 만료 경보. 사장 전용.
 */
const EmployeeDocumentsScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<Route>();
    const c = useThemeColors();
    const {storeId, employeeId, employeeName} = route.params;

    const [items, setItems] = useState<EmployeeDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            setItems(await fetchDocuments(storeId, employeeId));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [storeId, employeeId]);

    useFocusEffect(useCallback(() => {
        load();
    }, [load]));

    const expiringCount = items.filter(it => it.expiryStatus !== 'OK').length;

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title={employeeName ? `${employeeName} · 서류함` : '서류함'} onBack={() => navigation.goBack()} />}
            footer={
                <AppButton
                    label="서류 추가"
                    onPress={() => navigation.navigate('AddDocument', {storeId, employeeId})}
                />
            }>
            {loading ? (
                <LoadingState />
            ) : error ? (
                <ErrorState
                    title="서류를 불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            ) : items.length === 0 ? (
                <EmptyState
                    glyph={<Ionicons name="folder-open-outline" size={40} color={c.textTertiary} />}
                    markColor={c.surfaceMuted}
                    title="등록된 서류가 없어요"
                    description="보건증·계약서 등을 등록하면 만료 임박 시 알려드려요."
                />
            ) : (
                <View>
                    {expiringCount > 0 ? (
                        <View style={[styles.banner, {backgroundColor: c.warningBg}]}>
                            <Ionicons name="alert-circle-outline" size={20} color={c.warning} />
                            <AppText variant="caption" style={[styles.bannerText, {color: c.warning}]}>
                                만료 임박·만료된 서류가 {expiringCount}건 있어요. 갱신을 챙겨주세요.
                            </AppText>
                        </View>
                    ) : null}
                    <View style={styles.list}>
                        {items.map(it => {
                            const s = STATUS[it.expiryStatus];
                            return (
                                <AppCard key={it.id} variant="flat">
                                    <View style={styles.row}>
                                        <View style={[styles.iconWrap, {backgroundColor: c.surfaceMuted}]}>
                                            <Ionicons name={ICON[it.type] ?? 'folder-outline'} size={20} color={c.textSecondary} />
                                        </View>
                                        <View style={styles.flex}>
                                            <AppText variant="titleMd" numberOfLines={1}>{it.title}</AppText>
                                            <AppText variant="caption" tone="tertiary">
                                                {it.typeLabel}{it.expiresAt ? ` · ~${it.expiresAt}` : ''}
                                            </AppText>
                                        </View>
                                        <AppBadge label={s.text(it.daysUntilExpiry)} tone={s.tone} />
                                    </View>
                                </AppCard>
                            );
                        })}
                    </View>
                </View>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    banner: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 14},
    bannerText: {flex: 1},
    list: {marginTop: spacing.lg, gap: spacing.sm},
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    iconWrap: {width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
    flex: {flex: 1},
});

export default EmployeeDocumentsScreen;
