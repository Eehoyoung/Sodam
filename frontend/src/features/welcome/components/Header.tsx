import React from 'react';
import {Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

interface HeaderProps {
    onLogin: () => void;
    onSignup: () => void;
}

const Header: React.FC<HeaderProps> = ({onLogin, onSignup}) => {
    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.logoContainer}>
                    <Text style={styles.logo}>Sodam</Text>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={onLogin}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.loginButtonText}>로그인</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.signupButton}
                        onPress={onSignup}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.signupButtonText}>가입</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: '#FFFFFF',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
    },
    logoContainer: {
        flex: 1,
    },
    logo: {
        fontSize: 24,
        fontWeight: '800',
        color: '#2196F3',
        letterSpacing: -0.5,
    },
    buttonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    loginButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#2196F3',
    },
    loginButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2196F3',
    },
    signupButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#2196F3',
    },
    signupButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default Header;
