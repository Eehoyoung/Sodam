import React from 'react';
import {FlatList, ListRenderItem, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle} from 'react-native';

// 리스트 아이템의 기본 타입 정의
export interface ListItemData {
    id: string | number;
    title: string;
    subtitle?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;

    [key: string]: any; // 추가 데이터를 위한 인덱스 시그니처
}

// 리스트 컴포넌트의 Props 타입 정의
interface ListProps<T extends ListItemData> {
    data: T[];
    renderItem?: (item: T, index: number) => React.ReactElement;
    keyExtractor?: (item: T) => string;
    onItemPress?: (item: T) => void;
    ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
    ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
    ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
    ItemSeparatorComponent?: React.ComponentType<any> | React.ReactElement | null;
    style?: ViewStyle;
    contentContainerStyle?: ViewStyle;
    itemStyle?: ViewStyle;
    titleStyle?: TextStyle;
    subtitleStyle?: TextStyle;
    showSeparator?: boolean;
    bordered?: boolean;
    rounded?: boolean;
}

/**
 * 재사용 가능한 리스트 컴포넌트
 *
 * 다양한 형태의 리스트를 표시할 수 있는 컴포넌트입니다.
 * 기본 렌더링 로직을 제공하며, 커스텀 렌더링도 지원합니다.
 */
function List<T extends ListItemData>({
                                          data,
                                          renderItem,
                                          keyExtractor,
                                          onItemPress,
                                          ListHeaderComponent,
                                          ListFooterComponent,
                                          ListEmptyComponent,
                                          ItemSeparatorComponent,
                                          style,
                                          contentContainerStyle,
                                          itemStyle,
                                          titleStyle,
                                          subtitleStyle,
                                          showSeparator = true,
                                          bordered = false,
                                          rounded = false,
                                      }: ListProps<T>): React.ReactElement {

    // 기본 키 추출기
    const defaultKeyExtractor = React.useCallback((item: T): string => {
        return item.id?.toString() || `item-${Math.random()}`;
    }, []);

    // 기본 아이템 렌더링 함수
    const defaultRenderItem = React.useCallback((item: T, index: number): React.ReactElement => {
        return (
            <TouchableOpacity
                style={[
                    styles.item,
                    itemStyle,
                ]}
                onPress={() => onItemPress && onItemPress(item)}
                disabled={!onItemPress}
            >
                {/* 왼쪽 아이콘 */}
                {item.leftIcon && <View style={styles.leftIcon}>{item.leftIcon}</View>}

                {/* 텍스트 컨텐츠 */}
                <View style={styles.textContainer}>
                    <Text style={[styles.title, titleStyle]} numberOfLines={1}>{item.title}</Text>
                    {item.subtitle && (
                        <Text style={[styles.subtitle, subtitleStyle]} numberOfLines={2}>{item.subtitle}</Text>
                    )}
                </View>

                {/* 오른쪽 아이콘 */}
                {item.rightIcon && <View style={styles.rightIcon}>{item.rightIcon}</View>}
            </TouchableOpacity>
        );
    }, [itemStyle, onItemPress, titleStyle, subtitleStyle]);

    // 구분선 컴포넌트
    const Separator = React.useCallback(() => {
        if (!showSeparator) return null;
        if (ItemSeparatorComponent) {
            return typeof ItemSeparatorComponent === 'function'
                ? React.createElement(ItemSeparatorComponent)
                : ItemSeparatorComponent;
        }
        return <View style={styles.separator}/>;
    }, [showSeparator, ItemSeparatorComponent]);

    // FlatList용 렌더 함수
    const memoizedRenderItem: ListRenderItem<T> = React.useCallback(({item, index}) => {
        return renderItem ? renderItem(item, index) : defaultRenderItem(item, index);
    }, [renderItem, defaultRenderItem]);

    // 안전한 데이터 처리
    const safeData = data || [];

    // Key extractor
    const safeKeyExtractor = React.useCallback((item: T): string => {
        if (keyExtractor) {
            return keyExtractor(item);
        }
        return defaultKeyExtractor(item);
    }, [keyExtractor, defaultKeyExtractor]);

    // 빈 컴포넌트
    const EmptyComponent = React.useCallback(() => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>데이터가 없습니다.</Text>
        </View>
    ), []);

    return (
        <View
            style={[
                styles.container,
                bordered && styles.bordered,
                rounded && styles.rounded,
                style
            ]}
        >
            <FlatList<T>
                data={safeData}
                renderItem={memoizedRenderItem}
                keyExtractor={safeKeyExtractor}
                ListHeaderComponent={ListHeaderComponent}
                ListFooterComponent={ListFooterComponent}
                ListEmptyComponent={ListEmptyComponent || EmptyComponent}
                ItemSeparatorComponent={Separator}
                contentContainerStyle={[
                    styles.contentContainer,
                    contentContainerStyle
                ]}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                initialNumToRender={10}
            />
        </View>
    );
}

// styles는 동일하게 유지
const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        width: '100%',
    },
    bordered: {
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    rounded: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    contentContainer: {
        flexGrow: 1,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    leftIcon: {
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000000',
    },
    subtitle: {
        fontSize: 14,
        color: '#8E8E93',
        marginTop: 4,
    },
    rightIcon: {
        marginLeft: 16,
    },
    separator: {
        height: 1,
        backgroundColor: '#F2F2F7',
        marginLeft: 16,
    },
    emptyContainer: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#8E8E93',
    },
});

export default List;
