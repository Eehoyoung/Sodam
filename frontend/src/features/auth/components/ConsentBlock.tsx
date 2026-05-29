import React, {useMemo, useState} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {tokens} from '../../../theme/tokens';
import {useThemeColors, ThemeColors} from '../../../common/hooks/useThemeColors';

export interface ConsentValue {
    age: boolean;
    terms: boolean;
    privacy: boolean;
    marketing: boolean;
}

export interface ConsentBlockProps {
    value: ConsentValue;
    onChange: (next: ConsentValue) => void;
    /** 풀텍스트 미리보기 — 약관/방침/마케팅 본문. 없으면 자리 표시 텍스트. */
    legalTexts?: {terms?: string; privacy?: string; marketing?: string};
}

type ItemKey = 'age' | 'terms' | 'privacy' | 'marketing';
const REQUIRED: ItemKey[] = ['age', 'terms', 'privacy'];

/**
 * 회원가입 약관 동의 묶음 (PRD_GUEST G-A1~G-A4).
 *  - 필수 3종 + 선택 1종 (마케팅)
 *  - "전체 동의" 토글
 *  - 약관·방침은 "보기" 탭으로 풀텍스트 모달
 */
const ConsentBlock: React.FC<ConsentBlockProps> = ({value, onChange, legalTexts}) => {
    const [openedDoc, setOpenedDoc] = useState<null | 'terms' | 'privacy' | 'marketing'>(null);
    const c = useThemeColors();
    const styles = useMemo(() => makeStyles(c), [c]);

    const allRequiredChecked = REQUIRED.every(k => value[k]);
    const allChecked = allRequiredChecked && value.marketing;

    const toggle = (key: ItemKey) =>
        onChange({...value, [key]: !value[key]});

    const toggleAll = () => {
        const next = !allChecked;
        onChange({age: next, terms: next, privacy: next, marketing: next});
    };

    const docText = useMemo(() => {
        if (!openedDoc) return '';
        if (openedDoc === 'terms') {
            return legalTexts?.terms ?? FALLBACK_TERMS;
        }
        if (openedDoc === 'privacy') {
            return legalTexts?.privacy ?? FALLBACK_PRIVACY;
        }
        return legalTexts?.marketing ?? FALLBACK_MARKETING;
    }, [openedDoc, legalTexts]);

    return (
        <View>
            <Text style={styles.sectionTitle}>약관 동의</Text>

            <ConsentRow
                styles={styles}
                checked={allChecked}
                label="전체 동의"
                bold
                onPress={toggleAll}
            />
            <View style={styles.thinDivider} />

            <ConsentRow
                styles={styles}
                checked={value.age}
                label="만 14세 이상이에요"
                required
                onPress={() => toggle('age')}
            />
            <ConsentRow
                styles={styles}
                checked={value.terms}
                label="이용약관 동의"
                required
                onPress={() => toggle('terms')}
                onPressView={() => setOpenedDoc('terms')}
            />
            <ConsentRow
                styles={styles}
                checked={value.privacy}
                label="개인정보 처리방침 동의"
                required
                onPress={() => toggle('privacy')}
                onPressView={() => setOpenedDoc('privacy')}
            />
            <ConsentRow
                styles={styles}
                checked={value.marketing}
                label="마케팅 정보 수신 (선택)"
                onPress={() => toggle('marketing')}
                onPressView={() => setOpenedDoc('marketing')}
            />

            <Modal
                visible={openedDoc != null}
                animationType="slide"
                transparent
                onRequestClose={() => setOpenedDoc(null)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>
                            {openedDoc === 'terms' && '이용약관'}
                            {openedDoc === 'privacy' && '개인정보 처리방침'}
                            {openedDoc === 'marketing' && '마케팅 정보 수신 동의'}
                        </Text>
                        <ScrollView style={styles.modalScroll}>
                            <Text style={styles.modalText}>{docText}</Text>
                        </ScrollView>
                        <Pressable
                            onPress={() => setOpenedDoc(null)}
                            style={({pressed}) => [styles.modalClose, pressed && {opacity: 0.7}]}
                        >
                            <Text style={styles.modalCloseText}>닫기</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

interface ConsentRowProps {
    checked: boolean;
    label: string;
    required?: boolean;
    bold?: boolean;
    onPress: () => void;
    onPressView?: () => void;
    styles: ReturnType<typeof makeStyles>;
}

const ConsentRow: React.FC<ConsentRowProps> = ({
    checked,
    label,
    required,
    bold,
    onPress,
    onPressView,
    styles,
}) => (
    <View style={styles.row}>
        <Pressable
            onPress={onPress}
            style={({pressed}) => [styles.checkTouchable, pressed && {opacity: 0.6}]}
            accessibilityRole="checkbox"
            accessibilityState={{checked}}
            accessibilityLabel={label}
        >
            <View style={[styles.checkBox, checked && styles.checkBoxOn]}>
                {checked ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            <Text style={[styles.label, bold && styles.labelBold]}>
                {label}
                {required ? <Text style={styles.required}>  (필수)</Text> : null}
            </Text>
        </Pressable>
        {onPressView ? (
            <Pressable onPress={onPressView} hitSlop={8}>
                <Text style={styles.viewBtn}>보기</Text>
            </Pressable>
        ) : null}
    </View>
);

const FALLBACK_TERMS =
    '본 이용약관은 소담(SODAM) 서비스 이용에 관한 일반 조건을 규정합니다.\n\n자세한 내용은 출시 직전 변호사 검토 후 docs/legal/terms-of-service.md 에서 확인하실 수 있어요.';
const FALLBACK_PRIVACY =
    '소담은 「개인정보 보호법」을 준수하며, 회원가입·출퇴근 위치·결제 처리에 필요한 최소한의 개인정보만 수집합니다.\n\n자세한 처리 항목은 docs/legal/privacy-policy.md 를 참고해 주세요.';
const FALLBACK_MARKETING =
    '신규 기능·이벤트·노무/세무 콘텐츠를 푸시 또는 이메일로 보내드려요.\n\n월 최대 4회, 언제든지 알림 설정에서 수신 거부 가능합니다.';

const makeStyles = (c: ThemeColors) => StyleSheet.create({
    sectionTitle: {
        fontSize: tokens.typography.sizes.md,
        fontWeight: tokens.typography.weights.semibold,
        color: c.textSecondary,
        marginTop: tokens.spacing.lg,
        marginBottom: tokens.spacing.sm,
    },
    row: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
        minHeight: 44,
        paddingVertical: tokens.spacing.xs,
    },
    checkTouchable: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        flex: 1,
        gap: tokens.spacing.md,
    },
    checkBox: {
        width: 24,
        height: 24,
        borderRadius: tokens.radius.sm,
        borderWidth: 1.5,
        borderColor: c.border,
        backgroundColor: c.surface,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    checkBoxOn: {
        backgroundColor: c.brandPrimary,
        borderColor: c.brandPrimary,
    },
    checkMark: {color: c.textInverse, fontWeight: '700' as const, fontSize: 14},
    label: {
        fontSize: tokens.typography.sizes.md,
        color: c.textPrimary,
        flexShrink: 1,
    },
    labelBold: {fontWeight: tokens.typography.weights.bold},
    required: {color: c.error, fontSize: tokens.typography.sizes.xs},
    viewBtn: {
        color: c.brandPrimary,
        fontSize: tokens.typography.sizes.sm,
        fontWeight: tokens.typography.weights.semibold,
        paddingHorizontal: tokens.spacing.sm,
    },
    thinDivider: {height: 1, backgroundColor: c.divider, marginVertical: tokens.spacing.sm},

    modalBackdrop: {
        flex: 1,
        backgroundColor: c.overlayDark,
        justifyContent: 'flex-end' as const,
    },
    modalSheet: {
        backgroundColor: c.background,
        borderTopLeftRadius: tokens.radius.xl,
        borderTopRightRadius: tokens.radius.xl,
        maxHeight: '80%' as const,
        padding: tokens.spacing.lg,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: c.border,
        alignSelf: 'center' as const,
        marginBottom: tokens.spacing.md,
    },
    modalTitle: {
        fontSize: tokens.typography.sizes.lg,
        fontWeight: tokens.typography.weights.bold,
        color: c.textPrimary,
        marginBottom: tokens.spacing.md,
    },
    modalScroll: {flexGrow: 0},
    modalText: {
        fontSize: tokens.typography.sizes.sm,
        color: c.textSecondary,
        lineHeight: 22,
    },
    modalClose: {
        marginTop: tokens.spacing.lg,
        backgroundColor: c.brandPrimary,
        borderRadius: tokens.radius.lg,
        paddingVertical: tokens.spacing.md,
        alignItems: 'center' as const,
    },
    modalCloseText: {
        color: c.textInverse,
        fontWeight: tokens.typography.weights.semibold,
        fontSize: tokens.typography.sizes.md,
    },
});

export default ConsentBlock;
