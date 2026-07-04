import React, {useMemo, useState} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AppHeader, AppInput, AppText, ScreenContainer} from '../../../common/components/ds';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {BUSINESS_TYPE_GROUPS} from '../constants/businessTypes';

interface BusinessTypePickerProps {
    visible: boolean;
    value: string;
    onSelect: (value: string) => void;
    onClose: () => void;
}

/**
 * 표준 업종분류 선택 모달 — 그룹별 목록 + 검색 + 목록에 없는 업종을 위한 직접 입력.
 */
const BusinessTypePicker: React.FC<BusinessTypePickerProps> = ({visible, value, onSelect, onClose}) => {
    const c = useThemeColors();
    const [query, setQuery] = useState('');
    const [customText, setCustomText] = useState('');

    const filteredGroups = useMemo(() => {
        const q = query.trim();
        if (!q) {
            return BUSINESS_TYPE_GROUPS;
        }
        return BUSINESS_TYPE_GROUPS
            .map(group => ({...group, items: group.items.filter(item => item.includes(q))}))
            .filter(group => group.items.length > 0);
    }, [query]);

    const pick = (item: string) => {
        onSelect(item);
        setQuery('');
        onClose();
    };

    const submitCustom = () => {
        const trimmed = customText.trim();
        if (!trimmed) {
            return;
        }
        onSelect(trimmed);
        setCustomText('');
        setQuery('');
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <ScreenContainer header={<AppHeader title="업종 선택" actions={[{label: '닫기', onPress: onClose}]} />}>
                <AppInput
                    placeholder="업종 검색 (예: 카페, 미용실)"
                    value={query}
                    onChangeText={setQuery}
                    containerStyle={styles.search}
                />

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
                    {filteredGroups.length === 0 ? (
                        <AppText variant="bodyMd" tone="tertiary" style={styles.empty}>
                            검색 결과가 없어요. 아래 직접 입력을 이용해 주세요.
                        </AppText>
                    ) : (
                        filteredGroups.map(group => (
                            <View key={group.key} style={styles.group}>
                                <AppText variant="titleMd" tone="secondary" style={styles.groupTitle}>{group.label}</AppText>
                                <View style={styles.chipWrap}>
                                    {group.items.map(item => {
                                        const selected = item === value;
                                        return (
                                            <Pressable
                                                key={item}
                                                style={[
                                                    styles.chip,
                                                    {borderColor: c.border, backgroundColor: c.surface},
                                                    selected ? {borderColor: c.brandPrimary, backgroundColor: c.brandPrimarySoft} : null,
                                                ]}
                                                onPress={() => pick(item)}>
                                                <AppText variant="bodyMd" tone={selected ? 'brand' : 'primary'}>{item}</AppText>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        ))
                    )}

                    <View style={[styles.customBox, {borderColor: c.border, backgroundColor: c.surfaceCanvas}]}>
                        <View style={styles.customHeader}>
                            <Ionicons name="create-outline" size={16} color={c.textSecondary} />
                            <AppText variant="titleMd" tone="secondary">목록에 없는 업종인가요?</AppText>
                        </View>
                        <AppInput
                            placeholder="업종을 직접 입력해 주세요"
                            value={customText}
                            onChangeText={setCustomText}
                            onSubmitEditing={submitCustom}
                            returnKeyType="done"
                        />
                        <Pressable
                            style={[styles.customSubmit, {backgroundColor: customText.trim() ? c.brandPrimary : c.surfaceMuted}]}
                            disabled={!customText.trim()}
                            onPress={submitCustom}>
                            <AppText variant="titleMd" tone={customText.trim() ? 'inverse' : 'tertiary'} weight="700">이 업종으로 선택</AppText>
                        </Pressable>
                    </View>
                </ScrollView>
            </ScreenContainer>
        </Modal>
    );
};

const styles = StyleSheet.create({
    search: {marginTop: spacing.sm},
    list: {paddingBottom: spacing.xxxl, gap: spacing.lg},
    empty: {marginTop: spacing.xl, textAlign: 'center'},
    group: {gap: spacing.sm},
    groupTitle: {marginBottom: spacing.xs},
    chipWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    chip: {
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderRadius: radius.pill, borderWidth: 1,
    },
    customBox: {
        borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md,
    },
    customHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    customSubmit: {
        borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center',
    },
});

export default BusinessTypePicker;
