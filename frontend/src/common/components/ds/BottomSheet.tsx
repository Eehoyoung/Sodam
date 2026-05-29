/**
 * BottomSheet / ConfirmSheet — 확정 시안의 하단 시트.
 *
 * (08-micro-design-final-spec.md §10)
 *   레이아웃: handle → title → description(opt) → content → primary CTA → secondary/cancel
 *   safe-area bottom padding · 닫기 제스처 허용 · 위험 액션은 destructive 스타일.
 *   높이: action(content) / form(60~86vh) / confirm(content, max 420).
 */
import React, {ReactNode} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../hooks/useThemeColors';
import {AppText} from './AppText';
import {AppButton, ButtonVariant} from './AppButton';

interface SheetAction {
    label: string;
    onPress: () => void;
    variant?: ButtonVariant;
    loading?: boolean;
}

interface BottomSheetProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children?: ReactNode;
    primary?: SheetAction;
    secondary?: SheetAction;
    /** form 시트 — 더 큰 높이 허용 (키보드 대응 스크롤) */
    scrollable?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
    visible,
    onClose,
    title,
    description,
    children,
    primary,
    secondary,
    scrollable = false,
}) => {
    const insets = useSafeAreaInsets();
    const c = useThemeColors();

    const body = (
        <>
            <View style={[styles.handle, {backgroundColor: c.border}]} />
            {title ? <AppText variant="headingSm" style={styles.title}>{title}</AppText> : null}
            {description ? (
                <AppText variant="bodyMd" tone="secondary" style={styles.desc}>{description}</AppText>
            ) : null}
            {children}
            {primary ? (
                <AppButton label={primary.label} variant={primary.variant ?? 'primary'} loading={primary.loading} onPress={primary.onPress} style={styles.cta} />
            ) : null}
            {secondary ? (
                <AppButton label={secondary.label} variant={secondary.variant ?? 'secondary'} onPress={secondary.onPress} style={styles.ctaSub} />
            ) : null}
        </>
    );

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={[styles.backdrop, {backgroundColor: c.overlayDark}]} onPress={onClose}>
                <Pressable
                    style={[styles.sheet, {backgroundColor: c.background, paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm}]}
                    onPress={e => e.stopPropagation()}>
                    {scrollable ? (
                        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            {body}
                        </ScrollView>
                    ) : (
                        body
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {flex: 1, justifyContent: 'flex-end'},
    sheet: {
        borderTopLeftRadius: radius.xxl,
        borderTopRightRadius: radius.xxl,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        maxHeight: '86%',
    },
    handle: {width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md},
    title: {marginBottom: spacing.xs},
    desc: {marginBottom: spacing.md},
    cta: {marginTop: spacing.md},
    ctaSub: {marginTop: spacing.sm},
});

export default BottomSheet;
