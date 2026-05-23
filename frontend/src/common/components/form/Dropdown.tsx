import React, {useRef, useState} from 'react';
import {FlatList, Modal, Platform, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle,} from 'react-native';

export interface DropdownItem {
    label: string;
    value: string | number;
    disabled?: boolean;
}

interface DropdownProps {
    items: DropdownItem[];
    selectedValue?: string | number;
    onValueChange: (value: string | number) => void;
    placeholder?: string;
    disabled?: boolean;
    label?: string;
    error?: string;
    containerStyle?: ViewStyle;
    labelStyle?: TextStyle;
    dropdownStyle?: ViewStyle;
    itemTextStyle?: TextStyle;
    selectedItemTextStyle?: TextStyle;
    placeholderTextStyle?: TextStyle;
    errorTextStyle?: TextStyle;
}

const Dropdown: React.FC<DropdownProps> = ({
                                               items,
                                               selectedValue,
                                               onValueChange,
                                               placeholder = '선택하세요',
                                               disabled = false,
                                               label,
                                               error,
                                               containerStyle,
                                               labelStyle,
                                               dropdownStyle,
                                               itemTextStyle,
                                               selectedItemTextStyle,
                                               placeholderTextStyle,
                                               errorTextStyle,
                                           }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({
        top: 0,
        left: 0,
        width: 0,
    });
    const dropdownRef = useRef<View>(null);

    // 선택된 항목 찾기
    const selectedItem = items.find(item => item.value === selectedValue);

    // 드롭다운 열기
    const openDropdown = () => {
        if (disabled) return;

        // 드롭다운 위치 계산
        if (dropdownRef.current) {
            dropdownRef.current.measure((x, y, width, height, pageX, pageY) => {

                setDropdownPosition({
                    top: pageY + height,
                    left: pageX,
                    width: width,
                });

                setIsVisible(true);
            });
        }
    };

    // 드롭다운 닫기
    const closeDropdown = () => {
        setIsVisible(false);
    };

    // 항목 선택
    const selectItem = (value: string | number) => {
        onValueChange(value);
        closeDropdown();
    };

    // 항목 렌더링
    const renderItem = ({item}: { item: DropdownItem }) => {
        const isSelected = item.value === selectedValue;

        return (
            <TouchableOpacity
                style={[
                    styles.item,
                    isSelected && styles.selectedItem,
                    item.disabled && styles.disabledItem,
                ]}
                onPress={() => selectItem(item.value)}
                disabled={item.disabled}
                accessibilityRole="button"
                accessibilityState={{selected: isSelected, disabled: item.disabled}}
                accessibilityLabel={item.label}>
                <Text
                    style={[
                        styles.itemText,
                        isSelected && styles.selectedItemText,
                        item.disabled && styles.disabledItemText,
                        itemTextStyle,
                        isSelected && selectedItemTextStyle,
                    ]}>
                    {item.label}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <Text style={[styles.label, labelStyle]} accessibilityRole="text">
                    {label}
                </Text>
            )}

            <TouchableOpacity
                ref={dropdownRef}
                style={[
                    styles.dropdown,
                    error && styles.errorDropdown,
                    disabled && styles.disabledDropdown,
                    dropdownStyle,
                ]}
                onPress={openDropdown}
                disabled={disabled}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{disabled}}
                accessibilityLabel={label || placeholder}
                accessibilityHint="드롭다운 메뉴를 엽니다">
                <Text
                    style={[
                        selectedItem
                            ? [styles.selectedText, selectedItemTextStyle]
                            : [styles.placeholderText, placeholderTextStyle],
                        disabled && styles.disabledText,
                    ]}
                    numberOfLines={1}>
                    {selectedItem ? selectedItem.label : placeholder}
                </Text>
                <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>

            {error && (
                <Text
                    style={[styles.errorText, errorTextStyle]}
                    accessibilityRole="text">
                    {error}
                </Text>
            )}

            <Modal
                visible={isVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={closeDropdown}>
                <TouchableOpacity
                    style={styles.modalOverlay}
                    onPress={closeDropdown}
                    activeOpacity={1}>
                    <View
                        style={[
                            styles.dropdownList,
                            {
                                top: dropdownPosition.top,
                                left: dropdownPosition.left,
                                width: dropdownPosition.width,
                            },
                        ]}>
                        <FlatList
                            data={items}
                            renderItem={renderItem}
                            keyExtractor={(item) => item.value.toString()}
                            showsVerticalScrollIndicator={true}
                            keyboardShouldPersistTaps="handled"
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
        width: '100%',
    },
    label: {
        fontSize: 14,
        marginBottom: 6,
        color: '#333',
        fontWeight: '500',
    },
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 50,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fff',
    },
    errorDropdown: {
        borderColor: '#e74c3c',
    },
    disabledDropdown: {
        backgroundColor: '#f5f5f5',
        opacity: 0.7,
    },
    placeholderText: {
        color: '#aaa',
        fontSize: 16,
        flex: 1,
    },
    selectedText: {
        color: '#333',
        fontSize: 16,
        flex: 1,
    },
    disabledText: {
        color: '#999',
    },
    arrow: {
        fontSize: 12,
        color: '#666',
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    dropdownList: {
        position: 'absolute',
        maxHeight: 200,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.2,
                shadowRadius: 2,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    item: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    selectedItem: {
        backgroundColor: '#f1f9ff',
    },
    disabledItem: {
        opacity: 0.5,
    },
    itemText: {
        fontSize: 16,
        color: '#333',
    },
    selectedItemText: {
        color: '#3498db',
        fontWeight: '500',
    },
    disabledItemText: {
        color: '#999',
    },
    errorText: {
        fontSize: 12,
        color: '#e74c3c',
        marginTop: 4,
        marginLeft: 2,
    },
});

export default Dropdown;
