import React from 'react';
import {StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle} from 'react-native';

// 탭 아이템 타입 정의
export interface TabItem {
    key: string;
    label: string;
    icon?: React.ReactNode;
    badge?: number | string;
    disabled?: boolean;
}

// 탭 컴포넌트의 Props 타입 정의
interface TabProps {
    items: TabItem[];
    activeKey: string;
    onChange: (key: string) => void;
    style?: ViewStyle;
    tabStyle?: ViewStyle;
    activeTabStyle?: ViewStyle;
    textStyle?: TextStyle;
    activeTextStyle?: TextStyle;
    disabledTabStyle?: ViewStyle;
    disabledTextStyle?: TextStyle;
    indicatorStyle?: ViewStyle;
    showIndicator?: boolean;
    scrollable?: boolean;
}

/**
 * 탭 네비게이션 컴포넌트
 *
 * 여러 탭 간의 전환을 위한 컴포넌트입니다.
 * 아이콘, 배지, 비활성화 상태를 지원합니다.
 */
const Tab: React.FC<TabProps> = ({
                                     items,
                                     activeKey,
                                     onChange,
                                     style,
                                     tabStyle,
                                     activeTabStyle,
                                     textStyle,
                                     activeTextStyle,
                                     disabledTabStyle,
                                     disabledTextStyle,
                                     indicatorStyle,
                                     showIndicator = true,
                                     scrollable = false,
                                 }) => {
    // 컨테이너 컴포넌트 결정 (스크롤 가능 여부에 따라)
    const Container = scrollable ? View : View;
    const containerStyle = scrollable ? [styles.scrollContainer, style] : [styles.container, style];

    return (
        <Container style={containerStyle}>
            {items.map((item) => {
                const isActive = activeKey === item.key;
                const isDisabled = item.disabled;

                return (
                    <TouchableOpacity
                        key={item.key}
                        style={[
                            styles.tab,
                            tabStyle,
                            isActive && styles.activeTab,
                            isActive && activeTabStyle,
                            isDisabled && styles.disabledTab,
                            isDisabled && disabledTabStyle,
                        ]}
                        onPress={() => !isDisabled && onChange(item.key)}
                        disabled={isDisabled}
                        activeOpacity={0.7}
                    >
                        {/* 아이콘이 있는 경우 렌더링 */}
                        {item.icon && <View style={styles.icon}>{item.icon}</View>}

                        {/* 탭 레이블 */}
                        <Text
                            style={[
                                styles.text,
                                textStyle,
                                isActive && styles.activeText,
                                isActive && activeTextStyle,
                                isDisabled && styles.disabledText,
                                isDisabled && disabledTextStyle,
                            ]}
                        >
                            {item.label}
                        </Text>

                        {/* 배지가 있는 경우 렌더링 */}
                        {item.badge != null && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{item.badge}</Text>
                            </View>
                        )}

                        {/* 활성 탭 인디케이터 */}
                        {isActive && showIndicator && (
                            <View style={[styles.indicator, indicatorStyle]}/>
                        )}
                    </TouchableOpacity>
                );
            })}
        </Container>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    scrollContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        position: 'relative',
    },
    activeTab: {
        // 활성 탭 스타일
    },
    disabledTab: {
        opacity: 0.5,
    },
    text: {
        fontSize: 14,
        color: '#8E8E93',
        textAlign: 'center',
    },
    activeText: {
        color: '#007AFF',
        fontWeight: '500',
    },
    disabledText: {
        color: '#C7C7CC',
    },
    icon: {
        marginRight: 4,
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#FF3B30',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    indicator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: '#007AFF',
    },
});

export default Tab;
