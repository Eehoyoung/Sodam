/* eslint-disable react-native/no-unused-styles -- styles built via makeStyles(theme) factory; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
import React, {useMemo, useState} from 'react';
import {StyleSheet, View, TextInput, TouchableOpacity, Text, ActivityIndicator} from 'react-native';
import {spacing} from '../../../common/styles/theme';
import {ThemeColors, useThemeColors} from '../../../common/hooks/useThemeColors';

interface LoginFormProps {
    onSubmit: (email: string, password: string) => Promise<void>;
    isLoading?: boolean;
}

/**
 * 로그인 폼 컴포넌트
 *
 * 사용자의 이메일과 비밀번호를 입력받아 로그인 요청을 처리합니다.
 */
const LoginForm: React.FC<LoginFormProps> = ({onSubmit, isLoading = false}) => {
    const c = useThemeColors();
    const styles = useMemo(() => makeStyles(c), [c]);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    // 입력값 유효성 검사
    const validateForm = (): boolean => {
        const newErrors: { email?: string; password?: string } = {};

        if (!email) {
            newErrors.email = '이메일을 입력해 주세요';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = '유효한 이메일 주소를 입력해 주세요';
        }

        if (!password) {
            newErrors.password = '비밀번호를 입력해 주세요';
        } else if (password.length < 6) {
            newErrors.password = '비밀번호는 최소 6자 이상이어야 합니다';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 로그인 제출 핸들러
    const handleSubmit = async () => {
        if (validateForm()) {
            try {
                await onSubmit(email, password);
            } catch (error) {
                console.error('로그인 오류:', error);
            }
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.formGroup}>
                <Text style={styles.label}>이메일</Text>
                <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="이메일 주소를 입력하세요"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    testID="email-input"
                    accessibilityLabel="이메일 입력"
                />
                {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>비밀번호</Text>
                <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="비밀번호를 입력하세요"
                    secureTextEntry
                    testID="password-input"
                    accessibilityLabel="비밀번호 입력"
                />
                {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
                testID="login-button"
                accessibilityLabel="로그인 버튼"
            >
                {isLoading ? (
                    <ActivityIndicator color={c.textInverse}/>
                ) : (
                    <Text style={styles.buttonText}>로그인</Text>
                )}
            </TouchableOpacity>
        </View>
    );
};

const makeStyles = (c: ThemeColors) => StyleSheet.create({
    container: {
        width: '100%',
        padding: spacing.md,
    },
    formGroup: {
        marginBottom: spacing.md,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: spacing.xs,
        color: c.textPrimary,
    },
    input: {
        height: 48,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 8,
        paddingHorizontal: spacing.md,
        fontSize: 16,
        backgroundColor: c.surface,
        color: c.textPrimary,
    },
    button: {
        backgroundColor: c.brandPrimary,
        height: 48,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.md,
    },
    buttonDisabled: {
        backgroundColor: c.surfaceMuted,
    },
    buttonText: {
        color: c.textInverse,
        fontSize: 16,
        fontWeight: '600',
    },
    errorText: {
        color: c.error,
        fontSize: 14,
        marginTop: spacing.xs,
    },
});

export default LoginForm;
