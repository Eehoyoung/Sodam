/**
 * StorePassRow — 매장 패스 전환 칩 (v3 "링 & 패스" 시그니처, docs/260720 계획서 WP-02).
 *
 * 직원·알바가 2개 이상 매장에 소속될 때, 알약형 칩을 가로 스크롤로 보여주고 탭으로 전환한다.
 * 데이터 조회(stores)·선택 상태(selectedId)는 호출부가 그대로 소유 — 이 컴포넌트는 표현만 담당한다.
 * (기존 EmployeeAttendanceHome의 storeChips를 대체 — 토글 뒤에 숨기지 않고 상시 노출한다.)
 */
import React from 'react';
import {Pressable, ScrollView, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {AppText} from './AppText';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../hooks/useThemeColors';

export interface StorePassItem {
    id: number;
    name: string;
    /** 칩 왼쪽 색 점 — 매장 구분용. 미지정 시 순번 기반 팔레트 자동 배정 */
    dotColor?: string;
}

interface StorePassRowProps {
    items: StorePassItem[];
    selectedId: number | null;
    onSelect: (id: number) => void;
    style?: StyleProp<ViewStyle>;
    testID?: string;
}

const DOT_PALETTE = ['#FF4D6D', '#12B8A6', '#C97F00'];

/** 소속 매장이 1곳뿐이면 전환할 대상이 없으므로 아무것도 렌더링하지 않는다 */
export const StorePassRow: React.FC<StorePassRowProps> = ({items, selectedId, onSelect, style, testID}) => {
    const c = useThemeColors();
    if (items.length < 2) {
        return null;
    }
    return (
        <ScrollView
            testID={testID}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={style}
            contentContainerStyle={styles.row}>
            {items.map((item, idx) => {
                const active = item.id === selectedId;
                const dot = item.dotColor ?? DOT_PALETTE[idx % DOT_PALETTE.length];
                return (
                    <Pressable
                        key={item.id}
                        onPress={() => onSelect(item.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.name} 매장으로 전환`}
                        accessibilityState={{selected: active}}
                        style={[
                            styles.chip,
                            {
                                borderColor: active ? c.brandPrimary : c.border,
                                backgroundColor: active ? c.brandPrimarySoft : c.surface,
                            },
                        ]}>
                        <View style={[styles.dot, {backgroundColor: dot}]} />
                        <AppText
                            variant="caption"
                            weight={active ? '700' : '600'}
                            tone={active ? 'brand' : 'secondary'}
                            numberOfLines={1}>
                            {item.name}
                        </AppText>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    row: {gap: spacing.sm, paddingVertical: 2, paddingRight: spacing.lg},
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: radius.pill,
        borderWidth: 1.5,
    },
    dot: {width: 7, height: 7, borderRadius: 4},
});

export default StorePassRow;
