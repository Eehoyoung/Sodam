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
import {DATE_DIGITS_HELPER, dateDigitsToIso, isValidDateDigits, sanitizeDateDigits} from '../../../common/utils/dateTimeInput';

type Route = RouteProp<{A: {storeId: number; employeeId: number}}, 'A'>;

/**
 * A5 ?쒕쪟 異붽? ??醫낅쪟쨌?쒕ぉ쨌諛쒓툒/留뚮즺???낅젰 ????? ?먮낯 ?뚯씪? ??ν븯吏 ?딆쓬(硫뷀?留?.
 */
const AddDocumentScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<Route>();
    const {storeId, employeeId} = route.params;

    const [typeIdx, setTypeIdx] = useState(0);
    const [title, setTitle] = useState('');
    const [issuedAt, setIssuedAtValue] = useState('');
    const [expiresAt, setExpiresAtValue] = useState('');
    const setIssuedAt = (value: string) => setIssuedAtValue(sanitizeDateDigits(value));
    const setExpiresAt = (value: string) => setExpiresAtValue(sanitizeDateDigits(value));
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const type: DocumentType = DOC_TYPE_ORDER[typeIdx];

    const save = async () => {
        if (!title.trim()) {
            setError('?쒕쪟 ?쒕ぉ???낅젰??二쇱꽭??');
            return;
        }
        if (issuedAt && !isValidDateDigits(issuedAt)) {
            setError(DATE_DIGITS_HELPER);
            return;
        }
        if (expiresAt && !isValidDateDigits(expiresAt)) {
            setError(DATE_DIGITS_HELPER);
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await addDocument(storeId, employeeId, {
                type,
                title: title.trim(),
                issuedAt: issuedAt ? dateDigitsToIso(issuedAt) : undefined,
                expiresAt: expiresAt ? dateDigitsToIso(expiresAt) : undefined,
            });
            navigation.goBack();
        } catch {
            setError('??μ뿉 ?ㅽ뙣?덉뼱?? ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??');
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
            <AppInput value={issuedAt} onChangeText={setIssuedAt} placeholder="20260629" keyboardType="number-pad" maxLength={8} helper={DATE_DIGITS_HELPER} />

            <AppText variant="caption" tone="secondary" style={styles.label}>만료일 (선택)</AppText>
            <AppInput value={expiresAt} onChangeText={setExpiresAt} placeholder="20260629" keyboardType="number-pad" maxLength={8} helper={DATE_DIGITS_HELPER} />
            <AppText variant="caption" tone="tertiary" style={styles.hint}>
                만료일을 입력하면 갱신 전 알림을 보낼 수 있어요.
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
