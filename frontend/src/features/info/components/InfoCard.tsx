import React from 'react';
import {StyleSheet, View, Text, TouchableOpacity, Image, ImageSourcePropType} from 'react-native';
import {colors, spacing} from '../../../common/styles/theme';

interface InfoCardProps {
    title: string;
    description: string;
    imageSource?: ImageSourcePropType;
    date?: string;
    onPress?: () => void;
    category?: string;
}

/**
 * 정보 카드 컴포넌트
 *
 * 노동법, 세금, 정책 정보 등을 카드 형태로 표시하는 컴포넌트입니다.
 */
const InfoCard: React.FC<InfoCardProps> = ({
                                               title,
                                               description,
                                               imageSource,
                                               date,
                                               onPress,
                                               category,
                                           }) => {
    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${title} 정보 카드`}
            accessibilityHint="탭하여 상세 정보를 확인합니다"
        >
            <View style={styles.cardContent}>
                {imageSource && (
                    <Image source={imageSource} style={styles.image} resizeMode="cover"/>
                )}

                <View style={styles.textContainer}>
                    {category && (
                        <View style={styles.categoryContainer}>
                            <Text style={styles.category}>{category}</Text>
                        </View>
                    )}

                    <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
                        {title}
                    </Text>

                    <Text style={styles.description} numberOfLines={3} ellipsizeMode="tail">
                        {description}
                    </Text>

                    {date && <Text style={styles.date}>{date}</Text>}
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        marginBottom: spacing.md,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    cardContent: {
        flexDirection: 'column',
    },
    image: {
        width: '100%',
        height: 160,
        backgroundColor: '#f0f0f0',
    },
    textContainer: {
        padding: spacing.md,
    },
    categoryContainer: {
        backgroundColor: colors.secondary,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs / 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginBottom: spacing.sm,
    },
    category: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.sm,
    },
    description: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: spacing.sm,
    },
    date: {
        fontSize: 12,
        color: '#999',
        marginTop: spacing.xs,
    },
});

export default InfoCard;
