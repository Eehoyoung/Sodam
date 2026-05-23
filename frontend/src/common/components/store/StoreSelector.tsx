import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {tokens} from '../../../theme/tokens';

export interface SelectableStore {
    id: number;
    storeName: string;
}

interface Props {
    stores: SelectableStore[];
    selectedId: number | null;
    onSelect: (id: number) => void;
}

/**
 * 다매장 사장님용 매장 전환 셀렉터 (Pill 형태).
 * 매장 1개일 때는 자동 숨김.
 * 가로 스크롤 + 선택 강조.
 */
const StoreSelector: React.FC<Props> = ({stores, selectedId, onSelect}) => {
    if (!stores || stores.length <= 1) return null;
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
        >
            {stores.map(s => {
                const active = s.id === selectedId;
                return (
                    <Pressable
                        key={s.id}
                        onPress={() => onSelect(s.id)}
                        style={({pressed}) => [
                            styles.pill,
                            active && styles.pillActive,
                            pressed && {opacity: 0.7},
                        ]}
                    >
                        <Text style={[styles.text, active && styles.textActive]} numberOfLines={1}>
                            {s.storeName}
                        </Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: tokens.spacing.lg,
        paddingVertical: tokens.spacing.sm,
        gap: tokens.spacing.sm,
    },
    pill: {
        paddingHorizontal: tokens.spacing.lg,
        paddingVertical: tokens.spacing.sm,
        borderRadius: tokens.radius.pill,
        borderWidth: 1,
        borderColor: tokens.colors.border,
        backgroundColor: tokens.colors.surface,
        marginRight: tokens.spacing.sm,
    },
    pillActive: {
        backgroundColor: tokens.colors.brandPrimary,
        borderColor: tokens.colors.brandPrimary,
    },
    text: {
        color: tokens.colors.textPrimary,
        fontSize: tokens.typography.sizes.sm,
        fontWeight: tokens.typography.weights.medium,
        maxWidth: 160,
    },
    textActive: {color: tokens.colors.textInverse, fontWeight: tokens.typography.weights.bold},
});

export default StoreSelector;
