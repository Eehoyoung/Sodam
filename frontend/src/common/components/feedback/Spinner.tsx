/* eslint-disable react-native/no-unused-styles -- styles built via makeStyles(theme) factory; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
import React, {useMemo} from 'react';
import {ActivityIndicator, StyleSheet, Text, TextStyle, View, ViewStyle,} from 'react-native';
import {ThemeColors, useThemeColors} from '../../hooks/useThemeColors';

interface SpinnerProps {
    size?: 'small' | 'large' | number;
    color?: string;
    text?: string;
    textStyle?: TextStyle;
    style?: ViewStyle;
    fullScreen?: boolean;
    overlay?: boolean;
}

const Spinner: React.FC<SpinnerProps> = ({
                                             size = 'large',
                                             color,
                                             text,
                                             textStyle,
                                             style,
                                             fullScreen = false,
                                             overlay = false,
                                         }) => {
    const c = useThemeColors();
    const styles = useMemo(() => makeStyles(c), [c]);
    const indicatorColor = color ?? c.brandPrimary;

    if (fullScreen) {
        return (
            <View
                style={[
                    styles.fullScreen,
                    overlay && styles.overlay,
                    style,
                ]}
                accessibilityRole="progressbar"
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- blank a11y label should fall back to default, so ?? would announce an empty label
                accessibilityLabel={text || '로딩 중'}>
                <ActivityIndicator size={size} color={indicatorColor}/>
                {text && (
                    <Text style={[styles.text, textStyle]}>
                        {text}
                    </Text>
                )}
            </View>
        );
    }

    return (
        <View
            style={[styles.container, style]}
            accessibilityRole="progressbar"
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- blank a11y label should fall back to default, so ?? would announce an empty label
            accessibilityLabel={text || '로딩 중'}>
            <ActivityIndicator size={size} color={color}/>
            {text && (
                <Text style={[styles.text, textStyle]}>
                    {text}
                </Text>
            )}
        </View>
    );
};

const makeStyles = (c: ThemeColors) => StyleSheet.create({
    container: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    fullScreen: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    overlay: {
        backgroundColor: c.overlayDark,
    },
    text: {
        marginTop: 8,
        fontSize: 14,
        color: c.textSecondary,
        textAlign: 'center',
    },
});

export default Spinner;
