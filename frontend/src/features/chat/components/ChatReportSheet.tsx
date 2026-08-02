/**
 * ChatReportSheet — 메시지 신고 바텀시트(recruitment-monetization-gamification-plan.md §4.4,
 * docs/260801/recruitment-design-artifacts.html "💬 채팅" report-sheet 1:1).
 *
 * 진입: 상대 메시지 롱프레스(§4.4 "메시지 단위 신고" — 사람 전체가 아니라 메시지 하나를 짚는다).
 * 사유 3종(스팸·부적절한 언어·사기 의심) 중 하나를 라디오로 선택 후 제출한다.
 */
import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {AppText, BottomSheet} from '../../../common/components/ds';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {CHAT_REPORT_REASON_LABELS, CHAT_REPORT_REASON_OPTIONS, ChatReportReason} from '../types';

interface ChatReportSheetProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (reason: ChatReportReason) => void;
    submitting?: boolean;
}

export const ChatReportSheet: React.FC<ChatReportSheetProps> = ({visible, onClose, onSubmit, submitting}) => {
    const c = useThemeColors();
    const [reason, setReason] = useState<ChatReportReason>('SPAM');

    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            title="메시지를 신고하는 이유를 알려주세요"
            primary={{
                testID: 'chat-report-submit-button',
                label: '신고 접수하기',
                variant: 'destructive',
                loading: submitting,
                onPress: () => onSubmit(reason),
            }}
            secondary={{testID: 'chat-report-cancel-button', label: '취소', onPress: onClose}}>
            <View style={styles.optionList} testID="chat-report-options">
                {CHAT_REPORT_REASON_OPTIONS.map(option => {
                    const selected = reason === option;
                    return (
                        <Pressable
                            key={option}
                            testID={`chat-report-option-${option}`}
                            onPress={() => setReason(option)}
                            accessibilityRole="radio"
                            accessibilityState={{selected}}
                            style={styles.optionRow}>
                            <View
                                style={[
                                    styles.radioOuter,
                                    {borderColor: selected ? c.brandPrimary : c.border},
                                ]}>
                                {selected ? <View style={[styles.radioInner, {backgroundColor: c.brandPrimary}]} /> : null}
                            </View>
                            <AppText variant="bodyMd" weight={selected ? '700' : undefined}>
                                {CHAT_REPORT_REASON_LABELS[option]}
                            </AppText>
                        </Pressable>
                    );
                })}
            </View>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    optionList: {gap: spacing.xs, marginBottom: spacing.md},
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm + 2,
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: radius.pill,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioInner: {width: 10, height: 10, borderRadius: radius.pill},
});

export default ChatReportSheet;
