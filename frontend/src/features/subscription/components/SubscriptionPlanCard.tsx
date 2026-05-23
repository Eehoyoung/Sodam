import React from 'react';
import {StyleSheet, View, Text, TouchableOpacity} from 'react-native';
import {colors, spacing} from '../../../common/styles/theme';

interface Feature {
    name: string;
    included: boolean;
}

interface SubscriptionPlanCardProps {
    title: string;
    price: string;
    period: string;
    features: Feature[];
    isPopular?: boolean;
    isSelected?: boolean;
    onSelect: () => void;
    buttonText?: string;
}

/**
 * 구독 플랜 카드 컴포넌트
 *
 * 구독 화면에서 각 구독 플랜 정보를 표시하는 카드 컴포넌트입니다.
 */
const SubscriptionPlanCard: React.FC<SubscriptionPlanCardProps> = ({
                                                                       title,
                                                                       price,
                                                                       period,
                                                                       features,
                                                                       isPopular = false,
                                                                       isSelected = false,
                                                                       onSelect,
                                                                       buttonText = '선택하기',
                                                                   }) => {
    return (
        <View style={[
            styles.container,
            isPopular && styles.popularContainer,
            isSelected && styles.selectedContainer
        ]}>
            {isPopular && (
                <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>인기</Text>
                </View>
            )}

            <Text style={[styles.title, isSelected && styles.selectedText]}>{title}</Text>

            <View style={styles.priceContainer}>
                <Text style={[styles.price, isSelected && styles.selectedText]}>{price}</Text>
                <Text style={[styles.period, isSelected && styles.selectedText]}>/ {period}</Text>
            </View>

            <View style={styles.featuresContainer}>
                {features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                        <Text style={[
                            styles.featureIcon,
                            feature.included ? styles.includedIcon : styles.excludedIcon,
                            isSelected && feature.included && styles.selectedIncludedIcon
                        ]}>
                            {feature.included ? '✓' : '✕'}
                        </Text>
                        <Text style={[
                            styles.featureName,
                            !feature.included && styles.excludedFeature,
                            isSelected && styles.selectedText
                        ]}>
                            {feature.name}
                        </Text>
                    </View>
                ))}
            </View>

            <TouchableOpacity
                style={[
                    styles.button,
                    isSelected ? styles.selectedButton : styles.defaultButton
                ]}
                onPress={onSelect}
                accessibilityLabel={`${title} 구독 플랜 ${isSelected ? '선택됨' : '선택하기'}`}
                accessibilityRole="button"
                accessibilityState={{selected: isSelected}}
            >
                <Text style={[
                    styles.buttonText,
                    isSelected ? styles.selectedButtonText : styles.defaultButtonText
                ]}>
                    {isSelected ? '선택됨' : buttonText}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.lg,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        position: 'relative',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    popularContainer: {
        borderColor: colors.primary,
    },
    selectedContainer: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10', // 10% opacity
    },
    popularBadge: {
        position: 'absolute',
        top: -10,
        right: spacing.md,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: 12,
    },
    popularText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: spacing.md,
    },
    price: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
    },
    period: {
        fontSize: 14,
        color: colors.textSecondary,
        marginLeft: 4,
    },
    featuresContainer: {
        marginBottom: spacing.md,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    featureIcon: {
        fontSize: 16,
        fontWeight: 'bold',
        width: 20,
        textAlign: 'center',
        marginRight: spacing.sm,
    },
    includedIcon: {
        color: '#4cd964',
    },
    excludedIcon: {
        color: '#ff3b30',
    },
    selectedIncludedIcon: {
        color: colors.primary,
    },
    featureName: {
        fontSize: 14,
        color: colors.text,
    },
    excludedFeature: {
        color: colors.textSecondary,
        textDecorationLine: 'line-through',
    },
    button: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    defaultButton: {
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    selectedButton: {
        backgroundColor: colors.primary,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    defaultButtonText: {
        color: colors.text,
    },
    selectedButtonText: {
        color: '#ffffff',
    },
    selectedText: {
        color: colors.primary,
    },
});

export default SubscriptionPlanCard;
