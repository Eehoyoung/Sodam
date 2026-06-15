/**
 * AppInput — 텍스트 입력.
 *
 * (08-micro-design-final-spec.md §7)
 *   Height 48 · Radius 15 · border default · focus border brand · placeholder tertiary
 *   Error: border red + 아래 12px 오류 문구.
 *   Label 은 field 위에 표시 (화면 전체 통일).
 *   Helper text 는 시급/반경/비밀번호처럼 헷갈리는 입력에만.
 */
import React, {forwardRef, useState} from 'react';
import {
    StyleProp,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    View,
    ViewStyle,
} from 'react-native';
import {spacing, typography} from '../../../theme/tokens';
import {useThemeColors} from '../../hooks/useThemeColors';

interface AppInputProps extends TextInputProps {
    label?: string;
    error?: string;
    helper?: string;
    containerStyle?: StyleProp<ViewStyle>;
    /** 멀티라인 사유 입력 등 (높이 확장) */
    multilineMinHeight?: number;
}

export const AppInput = forwardRef<TextInput, AppInputProps>(
    (
        {label, error, helper, containerStyle, multilineMinHeight, multiline, style, onFocus, onBlur, ...rest},
        ref,
    ) => {
        const [focused, setFocused] = useState(false);
        const c = useThemeColors();
        const borderColor = error
            ? c.error
            : focused
                ? c.borderFocus
                : c.border;

        return (
            <View style={[styles.container, containerStyle]}>
                {label ? <Text style={[styles.label, {color: c.textSecondary}]}>{label}</Text> : null}
                <View
                    style={[
                        styles.field,
                        {borderColor, backgroundColor: c.background},
                        multiline ? {minHeight: multilineMinHeight ?? 92, paddingVertical: spacing.md} : null,
                    ]}>
                    <TextInput
                        ref={ref}
                        multiline={multiline}
                        placeholderTextColor={c.textTertiary}
                        style={[styles.input, {color: c.textPrimary}, multiline ? styles.inputMultiline : null, style]}
                        onFocus={e => {
                            setFocused(true);
                            onFocus?.(e);
                        }}
                        onBlur={e => {
                            setFocused(false);
                            onBlur?.(e);
                        }}
                        {...rest}
                    />
                </View>
                {error ? (
                    <Text style={[styles.error, {color: c.error}]}>{error}</Text>
                ) : helper ? (
                    <Text style={[styles.helper, {color: c.textTertiary}]}>{helper}</Text>
                ) : null}
            </View>
        );
    },
);

AppInput.displayName = 'AppInput';

const styles = StyleSheet.create({
    container: {gap: spacing.xs},
    label: {
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 2,
    },
    field: {
        minHeight: 48,
        borderRadius: 15,
        borderWidth: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.md + 2,
    },
    input: {
        fontSize: typography.sizes.md,
        padding: 0,
        fontWeight: '500',
    },
    inputMultiline: {textAlignVertical: 'top', minHeight: 64},
    error: {fontSize: 12, marginLeft: 2},
    helper: {fontSize: 12, marginLeft: 2},
});

export default AppInput;
