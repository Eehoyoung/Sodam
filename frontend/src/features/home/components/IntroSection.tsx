/* eslint-disable react-native/no-unused-styles -- styles built via makeStyles(theme) factory; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
import React, {useMemo} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {ThemeColors, useThemeColors} from '../../../common/hooks/useThemeColors';

const IntroSection = () => {
    const c = useThemeColors();
    const styles = useMemo(() => makeStyles(c), [c]);

    return (
        <View style={styles.introSection}>
            <Text style={styles.mainTitle}>소상공인을 담다! 소담</Text>
            <Text style={styles.subTitle}>
                소상공인의 생산성과 자생력을 높이기 위해 소상공인이 개발한 소상공인을 위한 서비스
            </Text>
            <TouchableOpacity style={styles.getStartedButton}>
                <Text style={styles.getStartedText}>시작하기</Text>
            </TouchableOpacity>
        </View>
    );
};

const makeStyles = (c: ThemeColors) => StyleSheet.create({
    introSection: {
        backgroundColor: c.surfaceCanvas,
        padding: 50,
        alignItems: 'center',
        width: '100%',
    },
    mainTitle: {
        fontSize: 36,
        fontWeight: 'bold',
        marginBottom: 15,
        color: c.brandPrimary,
    },
    subTitle: {
        fontSize: 18,
        textAlign: 'center',
        maxWidth: 800,
        lineHeight: 28,
        color: c.textSecondary,
        marginBottom: 30,
    },
    getStartedButton: {
        backgroundColor: c.warning,
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 25,
        elevation: 3,
    },
    getStartedText: {
        color: c.textPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default IntroSection;
