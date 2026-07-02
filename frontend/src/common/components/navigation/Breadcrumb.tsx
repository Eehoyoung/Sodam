import React from 'react';
import {StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle} from 'react-native';

// 경로 아이템 타입 정의
export interface BreadcrumbItem {
    label: string;
    onPress?: () => void;
    active?: boolean;
}

// Breadcrumb 컴포넌트의 Props 타입 정의
interface BreadcrumbProps {
    items: BreadcrumbItem[];
    separator?: React.ReactNode;
    style?: ViewStyle;
    itemStyle?: ViewStyle;
    activeItemStyle?: ViewStyle;
    textStyle?: TextStyle;
    activeTextStyle?: TextStyle;
    separatorStyle?: TextStyle;
}

/**
 * 경로 탐색을 위한 Breadcrumb 컴포넌트
 *
 * 계층적 네비게이션 경로를 표시하는 컴포넌트입니다.
 * 각 경로 아이템은 클릭 가능하며, 활성 상태를 표시할 수 있습니다.
 */
const Breadcrumb: React.FC<BreadcrumbProps> = ({
                                                   items,
                                                   separator,
                                                   style,
                                                   itemStyle,
                                                   activeItemStyle,
                                                   textStyle,
                                                   activeTextStyle,
                                                   separatorStyle,
                                               }) => {
    // 기본 구분자
    const defaultSeparator = (
        <Text style={[styles.separator, separatorStyle]}>/</Text>
    );

    return (
        <View style={[styles.container, style]}>
            {items.map((item, index) => {
                const isLast = index === items.length - 1;
                const isActive = item.active ?? isLast;

                return (
                    <React.Fragment key={`breadcrumb-item-${index}`}>
                        <TouchableOpacity
                            style={[
                                styles.item,
                                itemStyle,
                                isActive && styles.activeItem,
                                isActive && activeItemStyle,
                            ]}
                            onPress={item.onPress}
                            disabled={!item.onPress || isActive}
                        >
                            <Text
                                style={[
                                    styles.text,
                                    textStyle,
                                    isActive && styles.activeText,
                                    isActive && activeTextStyle,
                                ]}
                                numberOfLines={1}
                            >
                                {item.label}
                            </Text>
                        </TouchableOpacity>

                        {!isLast && (separator ?? defaultSeparator)}
                    </React.Fragment>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    item: {
        paddingHorizontal: 4,
    },
    activeItem: {
        // 활성 아이템 스타일
    },
    text: {
        fontSize: 14,
        color: '#8E8E93',
    },
    activeText: {
        color: '#000000',
        fontWeight: '500',
    },
    separator: {
        marginHorizontal: 4,
        color: '#C7C7CC',
        fontSize: 14,
    },
});

export default Breadcrumb;
