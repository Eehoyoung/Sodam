/* eslint-disable react-native/no-unused-styles -- styles built via makeStyles(theme) factory; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
import React, {useMemo} from 'react';
import {Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {ThemeColors, useThemeColors} from '../../../common/hooks/useThemeColors';

interface HeaderProps {
    onLogin: () => void;
    onSignup: () => void;
}

const Header: React.FC<HeaderProps> = ({onLogin, onSignup}) => {
    const c = useThemeColors();
    const styles = useMemo(() => makeStyles(c), [c]);

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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
    safeArea: {
        backgroundColor: c.surface,
        ...Platform.select({
            ios: {
                shadowColor: c.shadowColor,
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
        backgroundColor: c.surface,
    },
    logoContainer: {
        flex: 1,
    },
    logo: {
        fontSize: 24,
        fontWeight: '800',
        color: c.brandPrimary,
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
        borderWidth: 1,
        borderColor: c.brandPrimary,
    },
    loginButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: c.brandPrimary,
    },
    signupButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: c.brandPrimary,
    },
    signupButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: c.textInverse,
    },
});

export default Header;
