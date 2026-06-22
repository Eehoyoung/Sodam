import React, {useState} from 'react';
import {StyleSheet} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {
    AppButton,
    AppHeader,
    AppInput,
    AppText,
    ScreenContainer,
    SegmentedControl,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {
    addDocument,
    DOC_TYPE_LABEL,
    DOC_TYPE_ORDER,
    DocumentType,
} from '../services/documentService';

type Route = RouteProp<{A: {storeId: number; employeeId: number}}, 'A'>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A5 서류 추가 — 종류·제목·발급/만료일 입력 후 저장. 원본 파일은 저장하지 않음(메타만).
 */
const AddDocumentScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<Route>();
    const {storeId, employeeId} = route.params;

    const [typeIdx, setTypeIdx] = useState(0);
    const [title, setTitle] = useState('');
    const [issuedAt, setIssuedAt] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const type: DocumentType = DOC_TYPE_ORDER[typeIdx];

    const save = async () => {
        if (!title.trim()) {
            setError('서류 제목을 입력해 주세요.');
            return;
        }
        if (issuedAt && !DATE_RE.test(issuedAt)) {
            setError('발급일은 YYYY-MM-DD 형식으로 입력해 주세요.');
            return;
        }
        if (expiresAt && !DATE_RE.test(expiresAt)) {
            setError('만료일은 YYYY-MM-DD 형식으로 입력해 주세요.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await addDocument(storeId, employeeId, {
                type,
                title: title.trim(),
                issuedAt: issuedAt || undefined,
                expiresAt: expiresAt || undefined,
            });
            navigation.goBack();
        } catch {
            setError('저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
            setSaving(false);
        }
    };

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="서류 추가" onBack={() => navigation.goBack()} />}
            footer={<AppButton label="저장" onPress={save} loading={saving} />}>
            <AppText variant="caption" tone="secondary" style={styles.label}>종류</AppText>
            <SegmentedControl
                options={DOC_TYPE_ORDER.map(t => DOC_TYPE_LABEL[t])}
                value={typeIdx}
                onChange={setTypeIdx}
            />

            <AppText variant="caption" tone="secondary" style={styles.label}>제목</AppText>
            <AppInput value={title} onChangeText={setTitle} placeholder="예: 2026년 보건증" />

            <AppText variant="caption" tone="secondary" style={styles.label}>발급일 (선택)</AppText>
            <AppInput value={issuedAt} onChangeText={setIssuedAt} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />

            <AppText variant="caption" tone="secondary" style={styles.label}>만료일 (선택)</AppText>
            <AppInput value={expiresAt} onChangeText={setExpiresAt} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
            <AppText variant="caption" tone="tertiary" style={styles.hint}>
                만료일을 넣으면 갱신 임박 시 알려드려요. (보건증 등)
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

export default AddDocumentScreen;
