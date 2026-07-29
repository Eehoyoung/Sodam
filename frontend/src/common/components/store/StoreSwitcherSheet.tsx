/**
 * StoreSwitcherSheet — 사장 다매장 전환 바텀시트 (v3 시안 52 "매장 전환 시트").
 *
 * ⚠️ 이건 "사장이 소유한 매장 중 관리 대상 전환" 용도다. 직원의 소속매장 전환은
 * `StorePassRow`(패스 칩) 전용이니 혼동하지 말 것 — 개념이 다르다(§3.2).
 *
 * 데이터/선택 상태는 호출부가 그대로 소유(SelectableStore[], selectedId, onSelect).
 * 이 컴포넌트는 트리거 행 + BottomSheet 표현만 담당한다.
 */
import React, {useState} from 'react';
import {Pressable, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AppBadge} from '../ds/AppBadge';
import {AppButton} from '../ds/AppButton';
import {AppListItem} from '../ds/AppListItem';
import {AppText} from '../ds/AppText';
import {BottomSheet} from '../ds/BottomSheet';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../hooks/useThemeColors';

export interface SwitchableStore {
    id: number;
    storeName: string;
    subtitle?: string;
}

interface StoreSwitcherSheetProps {
    stores: SwitchableStore[];
    selectedId: number | null;
    onSelect: (id: number) => void;
    onRegisterNew?: () => void;
    style?: StyleProp<ViewStyle>;
    testID?: string;
    /** 개발용 시각 검증 전용 — 시트를 처음부터 열린 상태로 렌더링한다. */
    visualForceOpen?: boolean;
    /** 개발용 시각 검증 전용 — Modal 은 별도 창이라 배경 마커가 uiautomator에 안 잡힌다. */
    captureMarker?: string;
}

/** 소속 매장이 1곳뿐이면 전환할 대상이 없으므로 트리거 자체를 렌더링하지 않는다. */
export const StoreSwitcherSheet: React.FC<StoreSwitcherSheetProps> = ({
    stores,
    selectedId,
    onSelect,
    onRegisterNew,
    style,
    testID,
    visualForceOpen,
    captureMarker,
}) => {
    const c = useThemeColors();
    const [visible, setVisible] = useState(visualForceOpen ?? false);
    if (stores.length < 2) {
        return null;
    }
    const current = stores.find(s => s.id === selectedId) ?? stores[0];

    return (
        <View style={style} testID={testID}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${current.storeName} · 매장 전환`}
                onPress={() => setVisible(true)}
                style={({pressed}) => [
                    styles.trigger,
                    {borderColor: c.border, backgroundColor: c.surface},
                    pressed ? styles.pressed : null,
                ]}>
                <Ionicons name="storefront-outline" size={18} color={c.brandPrimary} />
                <AppText variant="titleMd" numberOfLines={1} style={styles.triggerText}>
                    {current.storeName}
                </AppText>
                <Ionicons name="swap-horizontal-outline" size={16} color={c.textSecondary} />
            </Pressable>

            <BottomSheet visible={visible} onClose={() => setVisible(false)} title="매장 선택" captureMarker={captureMarker}>
                <View style={styles.list}>
                    {stores.map(s => {
                        const active = s.id === current.id;
                        return (
                            <AppListItem
                                key={s.id}
                                title={s.storeName}
                                subtitle={s.subtitle}
                                right={<AppBadge label={active ? '현재' : '변경'} tone={active ? 'error' : 'success'} />}
                                onPress={() => {
                                    onSelect(s.id);
                                    setVisible(false);
                                }}
                            />
                        );
                    })}
                </View>
                {onRegisterNew ? (
                    <AppButton
                        label="새 매장 등록"
                        variant="outline"
                        style={styles.registerBtn}
                        onPress={() => {
                            setVisible(false);
                            onRegisterNew();
                        }}
                    />
                ) : null}
            </BottomSheet>
        </View>
    );
};

const styles = StyleSheet.create({
    trigger: {
        minHeight: 48,
        borderRadius: radius.lg,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    pressed: {opacity: 0.85},
    triggerText: {flex: 1, minWidth: 0},
    list: {gap: spacing.sm, marginTop: spacing.xs},
    registerBtn: {marginTop: spacing.md},
});

export default StoreSwitcherSheet;
