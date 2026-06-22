import React, {useState} from 'react';
import {StyleSheet} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {
    AppButton,
    AppHeader,
    AppInput,
    AppText,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {createNotice} from '../services/noticeService';

type Route = RouteProp<{W: {storeId: number}}, 'W'>;

/**
 * 공지 작성 (M-NEW-04) — 제목·내용 입력 후 발행. 발행 시 직원에게 알림 전송.
 */
const WriteNoticeScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<Route>();
    const {storeId} = route.params;

    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const publish = async () => {
        if (!title.trim()) {
            setError('공지 제목을 입력해 주세요.');
            return;
        }
        if (!body.trim()) {
            setError('공지 내용을 입력해 주세요.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await createNotice(storeId, {title: title.trim(), body: body.trim()});
            navigation.goBack();
        } catch {
            setError('발행에 실패했어요. 잠시 후 다시 시도해 주세요.');
            setSaving(false);
        }
    };

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="공지 작성" onBack={() => navigation.goBack()} />}
            footer={<AppButton label="공지 발행" onPress={publish} loading={saving} />}>
            <AppText variant="caption" tone="secondary" style={styles.label}>제목</AppText>
            <AppInput value={title} onChangeText={setTitle} placeholder="예: 이번 주 청소 당번 안내" maxLength={100} />

            <AppText variant="caption" tone="secondary" style={styles.label}>내용</AppText>
            <AppInput
                value={body}
                onChangeText={setBody}
                placeholder="직원들에게 전할 내용을 입력해 주세요."
                multiline
                maxLength={2000}
                multilineMinHeight={140}
            />
            <AppText variant="caption" tone="tertiary" style={styles.hint}>
                발행하면 매장 직원들에게 알림이 전송돼요. 직원이 "확인했어요"를 누르면 읽음으로 표시돼요.
            </AppText>

            {error ? (
                <AppText variant="caption" tone="error" style={styles.error}>{error}</AppText>
            ) : null}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    label: {marginTop: spacing.md, marginBottom: spacing.xs},
    hint: {marginTop: spacing.xs},
    error: {marginTop: spacing.sm},
});

export default WriteNoticeScreen;
