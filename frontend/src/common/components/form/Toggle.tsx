import React from 'react';
import {StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle,} from 'react-native';

interface ToggleProps {
    value: boolean;
    onToggle: () => void;
    label?: string;
    disabled?: boolean;
    size?: 'small' | 'medium' | 'large';
    activeColor?: string;
    inactiveColor?: string;
    thumbColor?: string;
    style?: ViewStyle;
    labelStyle?: TextStyle;
    labelPosition?: 'left' | 'right';
}

const Toggle: React.FC<ToggleProps> = ({
                                           value,
                                           onToggle,
                                           label,
                                           disabled = false,
                                           size = 'medium',
                                           activeColor = '#3498db',
                                           inactiveColor = '#e0e0e0',
                                           thumbColor = '#ffffff',
                                           style,
                                           labelStyle,
                                           labelPosition = 'right',
                                       }) => {
    // 크기에 따른 토글 크기 계산
    const getToggleSize = (): { width: number; height: number; thumbSize: number } => {
        switch (size) {
            case 'small':
                return {width: 36, height: 20, thumbSize: 16};
            case 'medium':
                return {width: 50, height: 28, thumbSize: 24};
            case 'large':
                return {width: 60, height: 34, thumbSize: 30};
            default:
                return {width: 50, height: 28, thumbSize: 24};
        }
    };

    const {width, height, thumbSize} = getToggleSize();

    // 토글 위치 계산
    const thumbPosition = value ? width - thumbSize - 2 : 2;

    const containerStyle: ViewStyle = {
        opacity: disabled ? 0.6 : 1,
    };

    const toggleStyle: ViewStyle = {
        width,
        height,
        backgroundColor: value ? activeColor : inactiveColor,
        borderRadius: height / 2,
    };

    const thumbStyle: ViewStyle = {
        width: thumbSize,
        height: thumbSize,
        borderRadius: thumbSize / 2,
        backgroundColor: thumbColor,
        position: 'absolute',
        top: (height - thumbSize) / 2,
        left: thumbPosition,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    };

    const textStyle: TextStyle = {
        fontSize: size === 'small' ? 14 : size === 'medium' ? 16 : 18,
        marginLeft: labelPosition === 'right' ? 8 : 0,
        marginRight: labelPosition === 'left' ? 8 : 0,
        color: '#333',
        ...labelStyle,
    };

    return (
        <View
            style={[
                styles.container,
                containerStyle,
                {flexDirection: labelPosition === 'left' ? 'row-reverse' : 'row'},
                style,
            ]}>
            {label && <Text style={textStyle}>{label}</Text>}
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={onToggle}
                disabled={disabled}
                accessibilityRole="switch"
                accessibilityState={{checked: value, disabled}}
                accessibilityLabel={label || (value ? '켜짐' : '꺼짐')}>
                <View style={[styles.toggle, toggleStyle]}>
                    <View style={thumbStyle}/>
                </View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 6,
    },
    toggle: {
        justifyContent: 'center',
    },
});

export default Toggle;
