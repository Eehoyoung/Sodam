import React, {useState} from 'react';
import {StyleSheet, View, TextInput, TouchableOpacity, Text, ActivityIndicator, ScrollView} from 'react-native';
import {colors, spacing} from '../../../common/styles/theme';

interface SignupFormProps {
    onSubmit: (name: string, email: string, password: string, confirmPassword: string) => Promise<void>;
    isLoading?: boolean;
}

/**
 * 회원가입 폼 컴포넌트
 *
 * 사용자의 이름, 이메일, 비밀번호를 입력받아 회원가입 요청을 처리합니다.
 */
const SignupForm: React.FC<SignupFormProps> = ({onSubmit, isLoading = false}) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<{
        name?: string;
        email?: string;
        password?: string;
        confirmPassword?: string;
    }>({});

    // 입력값 유효성 검사
    const validateForm = (): boolean => {
        const newErrors: {
            name?: string;
            email?: string;
            password?: string;
            confirmPassword?: string;
        } = {};

        if (!name) {
            newErrors.name = '이름을 입력해주세요';
        }

        if (!email) {
            newErrors.email = '이메일을 입력해주세요';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = '유효한 이메일 주소를 입력해주세요';
        }

        if (!password) {
            newErrors.password = '비밀번호를 입력해주세요';
        } else if (password.length < 6) {
            newErrors.password = '비밀번호는 최소 6자 이상이어야 합니다';
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = '비밀번호 확인을 입력해주세요';
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 회원가입 제출 핸들러
    const handleSubmit = async () => {
        if (validateForm()) {
            try {
                await onSubmit(name, email, password, confirmPassword);
            } catch (error) {
                console.error('회원가입 오류:', error);
            }
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.container}>
                <View style={styles.formGroup}>
                    <Text style={styles.label}>이름</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="이름을 입력하세요"
                        autoCapitalize="words"
                        testID="name-input"
                        accessibilityLabel="이름 입력"
                    />
                    {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
                </View>

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

                <View style={styles.formGroup}>
                    <Text style={styles.label}>비밀번호 확인</Text>
                    <TextInput
                        style={styles.input}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="비밀번호를 다시 입력하세요"
                        secureTextEntry
                        testID="confirm-password-input"
                        accessibilityLabel="비밀번호 확인 입력"
                    />
                    {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
                </View>

                <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={isLoading}
                    testID="signup-button"
                    accessibilityLabel="회원가입 버튼"
                >
                    {isLoading ? (
                        <ActivityIndicator color="#ffffff"/>
                    ) : (
                        <Text style={styles.buttonText}>회원가입</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
    },
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
        color: colors.text,
    },
    input: {
        height: 48,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: spacing.md,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    button: {
        backgroundColor: colors.primary,
        height: 48,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.md,
    },
    buttonDisabled: {
        backgroundColor: '#cccccc',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    errorText: {
        color: '#ff3b30',
        fontSize: 14,
        marginTop: spacing.xs,
    },
});

export default SignupForm;
