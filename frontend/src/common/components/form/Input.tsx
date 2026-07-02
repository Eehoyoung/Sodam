import React, {useState} from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import {tokens} from '../../../theme/tokens';

interface InputProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    label?: string;
    error?: string;
    helperText?: string;
    secureTextEntry?: boolean;
    multiline?: boolean;
    numberOfLines?: number;
    maxLength?: number;
    keyboardType?:
        | 'default'
        | 'email-address'
        | 'numeric'
        | 'phone-pad'
        | 'number-pad'
        | 'numbers-and-punctuation'
        | 'decimal-pad'
        | 'url'
        | 'visible-password';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    autoCorrect?: boolean;
    editable?: boolean;
    style?: ViewStyle;
    containerStyle?: ViewStyle;
    inputStyle?: TextStyle;
    labelStyle?: TextStyle;
    errorStyle?: TextStyle;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    onBlur?: () => void;
    onFocus?: () => void;
    testID?: string;
}

/**
 * 소담 입력 필드.
 * - 토큰 기반 컬러/타이포
 * - 포커스 시 브랜드 컬러 보더
 * - 에러 시 빨강 보더 + 메시지
 * - 비밀번호 표시/숨김 토글 자동
 */
const Input: React.FC<InputProps> = ({
    value,
    onChangeText,
    placeholder,
    label,
    error,
    helperText,
    secureTextEntry = false,
    multiline = false,
    numberOfLines = 1,
    maxLength,
    keyboardType = 'default',
    autoCapitalize = 'none',
    autoCorrect = true,
    editable = true,
    style,
    containerStyle,
    inputStyle,
    labelStyle,
    errorStyle,
    leftIcon,
    rightIcon,
    onBlur,
    onFocus,
    testID,
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);

    return (
        <View style={[styles.container, style, containerStyle]}>
            {label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}

            <View
                style={[
                    styles.inputContainer,
                    isFocused && styles.focusedInput,
                    !!error && styles.errorInput,
                    !editable && styles.disabledInput,
                ]}
            >
                {leftIcon ? <View style={styles.leftIconContainer}>{leftIcon}</View> : null}

                <TextInput
                    testID={testID}
                    style={[
                        styles.input,
                        multiline && styles.multilineInput,
                        inputStyle,
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={tokens.colors.textTertiary}
                    secureTextEntry={secureTextEntry && !isPasswordVisible}
                    multiline={multiline}
                    numberOfLines={multiline ? numberOfLines : undefined}
                    maxLength={maxLength}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    autoCorrect={autoCorrect}
                    editable={editable}
                    onFocus={() => {
                        setIsFocused(true);
                        onFocus?.();
                    }}
                    onBlur={() => {
                        setIsFocused(false);
                        onBlur?.();
                    }}
                />

                {secureTextEntry ? (
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={isPasswordVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
                        style={styles.rightIconContainer}
                        onPress={() => setIsPasswordVisible(v => !v)}
                    >
                        <Text style={styles.passwordToggle}>
                            {isPasswordVisible ? '숨기기' : '보기'}
                        </Text>
                    </TouchableOpacity>
                ) : rightIcon ? (
                    <View style={styles.rightIconContainer}>{rightIcon}</View>
                ) : null}
            </View>

            {error ? (
                <Text style={[styles.errorText, errorStyle]}>{error}</Text>
            ) : helperText ? (
                <Text style={styles.helperText}>{helperText}</Text>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: tokens.spacing.lg,
        width: '100%',
    },
    label: {
        fontSize: tokens.typography.sizes.sm,
        fontWeight: tokens.typography.weights.semibold,
        marginBottom: tokens.spacing.xs,
        color: tokens.colors.textSecondary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: tokens.colors.border,
        borderRadius: tokens.radius.lg,
        backgroundColor: tokens.colors.surface,
        minHeight: 48,
    },
    input: {
        flex: 1,
        paddingHorizontal: tokens.spacing.lg,
        paddingVertical: tokens.spacing.sm,
        fontSize: tokens.typography.sizes.md,
        color: tokens.colors.textPrimary,
    },
    multilineInput: {
        minHeight: 96,
        textAlignVertical: 'top',
        paddingTop: tokens.spacing.md,
    },
    leftIconContainer: {paddingLeft: tokens.spacing.md},
    rightIconContainer: {paddingRight: tokens.spacing.md},
    focusedInput: {
        borderColor: tokens.colors.brandPrimary,
        backgroundColor: tokens.colors.background,
    },
    errorInput: {borderColor: tokens.colors.error},
    disabledInput: {
        backgroundColor: tokens.colors.surfaceMuted,
        borderColor: tokens.colors.border,
    },
    errorText: {
        color: tokens.colors.error,
        fontSize: tokens.typography.sizes.xs,
        marginTop: tokens.spacing.xs,
    },
    helperText: {
        color: tokens.colors.textTertiary,
        fontSize: tokens.typography.sizes.xs,
        marginTop: tokens.spacing.xs,
    },
    passwordToggle: {
        color: tokens.colors.brandPrimary,
        fontSize: tokens.typography.sizes.sm,
        fontWeight: tokens.typography.weights.semibold,
    },
});

export default Input;
