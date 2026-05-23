import React from 'react';
import {ActivityIndicator, StyleSheet, Text, TextStyle, View, ViewStyle,} from 'react-native';

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
                                             color = '#3498db',
                                             text,
                                             textStyle,
                                             style,
                                             fullScreen = false,
                                             overlay = false,
                                         }) => {
    if (fullScreen) {
        return (
            <View
                style={[
                    styles.fullScreen,
                    overlay && styles.overlay,
                    style,
                ]}
                accessibilityRole="progressbar"
                accessibilityLabel={text || '로딩 중'}>
                <ActivityIndicator size={size} color={color}/>
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

const styles = StyleSheet.create({
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
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    text: {
        marginTop: 8,
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
});

export default Spinner;
