import React from 'react';
import {StyleSheet, View, Text, TouchableOpacity} from 'react-native';
import {colors, spacing} from '../../../common/styles/theme';

interface QuestionItemProps {
    id: string;
    title: string;
    content: string;
    author: string;
    date: string;
    isAnswered: boolean;
    answerCount: number;
    onPress: (id: string) => void;
}

/**
 * 질문 아이템 컴포넌트
 *
 * Q&A 목록에서 개별 질문을 표시하는 컴포넌트입니다.
 */
const QuestionItem: React.FC<QuestionItemProps> = ({
                                                       id,
                                                       title,
                                                       content,
                                                       author,
                                                       date,
                                                       isAnswered,
                                                       answerCount,
                                                       onPress,
                                                   }) => {
    const handlePress = () => {
        onPress(id);
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={handlePress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`질문: ${title}`}
            accessibilityHint="탭하여 질문 상세 내용을 확인합니다"
        >
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
                        {title}
                    </Text>
                    <View style={[styles.statusBadge, isAnswered ? styles.answeredBadge : styles.unansweredBadge]}>
                        <Text style={styles.statusText}>
                            {isAnswered ? '답변완료' : '답변대기'}
                        </Text>
                    </View>
                </View>
            </View>

            <Text style={styles.content} numberOfLines={3} ellipsizeMode="tail">
                {content}
            </Text>

            <View style={styles.footer}>
                <View style={styles.authorInfo}>
                    <Text style={styles.author}>{author}</Text>
                    <Text style={styles.date}>{date}</Text>
                </View>
                <View style={styles.stats}>
                    <Text style={styles.answerCount}>답변 {answerCount}개</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: spacing.md,
        marginBottom: spacing.md,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    },
    titleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginRight: spacing.sm,
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 12,
        marginLeft: spacing.xs,
    },
    answeredBadge: {
        backgroundColor: '#4cd964',
    },
    unansweredBadge: {
        backgroundColor: '#ff9500',
    },
    statusText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '600',
    },
    content: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: spacing.md,
        lineHeight: 20,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    authorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    author: {
        fontSize: 12,
        color: colors.text,
        fontWeight: '500',
    },
    date: {
        fontSize: 12,
        color: '#999',
        marginLeft: spacing.sm,
    },
    stats: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    answerCount: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '500',
    },
});

export default QuestionItem;
