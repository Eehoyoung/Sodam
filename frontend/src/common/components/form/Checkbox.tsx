import React from 'react';
import {StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle,} from 'react-native';

interface CheckboxProps {
    checked: boolean;
    onToggle: () => void;
    label?: string;
    disabled?: boolean;
    size?: 'small' | 'medium' | 'large';
    color?: string;
    style?: ViewStyle;
    labelStyle?: TextStyle;
    checkboxStyle?: ViewStyle;
}

const Checkbox: React.FC<CheckboxProps> = ({
                                               checked,
                                               onToggle,
                                               label,
                                               disabled = false,
                                               size = 'medium',
                                               color = '#3498db',
                                               style,
                                               labelStyle,
                                               checkboxStyle,
                                           }) => {
    const getSize = (): number => {
        switch (size) {
            case 'small':
                return 16;
            case 'medium':
                return 20;
            case 'large':
                return 24;
            default:
                return 20;
        }
    };

    const checkboxSize = getSize();
    const checkmarkSize = checkboxSize * 0.6;

    const containerStyle: ViewStyle = {
        opacity: disabled ? 0.6 : 1,
    };

    const boxStyle: ViewStyle = {
        width: checkboxSize,
        height: checkboxSize,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: checked ? color : '#ccc',
        backgroundColor: checked ? color : 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        ...checkboxStyle,
    };

    const textStyle: TextStyle = {
        fontSize: size === 'small' ? 14 : size === 'medium' ? 16 : 18,
        marginLeft: 8,
        color: '#333',
        ...labelStyle,
    };

    return (
        <TouchableOpacity
            style={[styles.container, containerStyle, style]}
            onPress={onToggle}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{checked, disabled}}
            accessibilityLabel={label}>
            <View style={boxStyle}>
                {checked && (
                    <View
                        style={[
                            styles.checkmark,
                            {
                                width: checkmarkSize,
                                height: checkmarkSize / 2,
                            },
                        ]}
                    />
                )}
            </View>
            {label && <Text style={textStyle}>{label}</Text>}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 6,
    },
    checkmark: {
        borderBottomWidth: 2,
        borderLeftWidth: 2,
        borderColor: '#fff',
        transform: [{rotate: '-45deg'}],
        marginBottom: 3,
    },
});

export default Checkbox;
