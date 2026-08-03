/* eslint-disable react-native/no-unused-styles -- styles built via makeStyles(theme) factory; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
import React, {useMemo, useState} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {tokens} from '../../../theme/tokens';
import {useThemeColors, ThemeColors} from '../../../common/hooks/useThemeColors';
import {AppBadge} from '../../../common/components/ds/AppBadge';
import {LOCATION_SERVICE_TEXT, PRIVACY_POLICY_TEXT, TERMS_OF_SERVICE_TEXT} from '../../system/legalContent';

export interface ConsentValue {
    age: boolean;
    terms: boolean;
    privacy: boolean;
    locationService: boolean;
    marketing: boolean;
}

export interface ConsentBlockProps {
    value: ConsentValue;
    onChange: (next: ConsentValue) => void;
    /** 풀텍스트 미리보기 — 약관/방침/마케팅 본문. 없으면 자리 표시 텍스트. */
    legalTexts?: {terms?: string; privacy?: string; marketing?: string};
}

type ItemKey = 'age' | 'terms' | 'privacy' | 'locationService' | 'marketing';
// 위치정보 동의는 필수에서 제외 — 위치정보법 §19② (미동의를 이유로 서비스 제공 거부 금지).
// NFC·사장승인 등 GPS 없이도 쓸 수 있는 대체 출퇴근 수단이 있어 서비스 필수불가결 요소가
// 아니다. GPS 출퇴근을 실제로 처음 쓰는 시점에 별도로 동의를 구한다(useLocationConsentGate).
const REQUIRED: ItemKey[] = ['age', 'terms', 'privacy'];

/**
 * 회원가입 약관 동의 묶음 (PRD_GUEST G-A1~G-A4).
 *  - 필수 3종 + 선택 1종 (마케팅)
 *  - "전체 동의" 토글
 *  - 약관·방침은 "보기" 탭으로 풀텍스트 모달
 */
const ConsentBlock: React.FC<ConsentBlockProps> = ({value, onChange, legalTexts}) => {
    const [openedDoc, setOpenedDoc] = useState<null | 'terms' | 'privacy' | 'location' | 'marketing'>(null);
    const c = useThemeColors();
    const styles = useMemo(() => makeStyles(c), [c]);

    const allRequiredChecked = REQUIRED.every(k => value[k]);
    const allChecked = allRequiredChecked && value.marketing;

    const toggle = (key: ItemKey) =>
        onChange({...value, [key]: !value[key]});

    const toggleAll = () => {
        const next = !allChecked;
        onChange({age: next, terms: next, privacy: next, locationService: next, marketing: next});
    };

    const docText = useMemo(() => {
        if (!openedDoc) {return '';}
        if (openedDoc === 'terms') {
            return legalTexts?.terms ?? FALLBACK_TERMS;
        }
        if (openedDoc === 'privacy') {
            return legalTexts?.privacy ?? FALLBACK_PRIVACY;
        }
        if (openedDoc === 'location') {
            return FALLBACK_LOCATION;
        }
        return legalTexts?.marketing ?? FALLBACK_MARKETING;
    }, [openedDoc, legalTexts]);

    return (
        <View>
            <Text style={styles.sectionTitle}>약관 동의</Text>

            <ConsentRow
                styles={styles}
                checkColor={c.textInverse}
                checked={allChecked}
                label="전체 동의"
                bold
                onPress={toggleAll}
            />
            <View style={styles.thinDivider} />

            <ConsentRow
                styles={styles}
                checkColor={c.textInverse}
                checked={value.age}
                label="만 14세 이상이에요"
                required
                onPress={() => toggle('age')}
            />
            {/* 아티팩트 51 TermsSheet 행 라벨 1:1(서비스 이용약관/개인정보 처리방침/위치기반 서비스/마케팅 알림)
                + badge--coral(필수)/badge--teal(선택) 색상. 체크박스는 실제 동의 토글에 필요해 유지. */}
            <ConsentRow
                styles={styles}
                checkColor={c.textInverse}
                checked={value.terms}
                label="서비스 이용약관"
                required
                onPress={() => toggle('terms')}
                onPressView={() => setOpenedDoc('terms')}
            />
            <ConsentRow
                styles={styles}
                checkColor={c.textInverse}
                checked={value.privacy}
                label="개인정보 처리방침"
                required
                onPress={() => toggle('privacy')}
                onPressView={() => setOpenedDoc('privacy')}
            />
            <ConsentRow
                styles={styles}
                checkColor={c.textInverse}
                checked={value.locationService}
                label="위치기반 서비스"
                optional
                onPress={() => toggle('locationService')}
                onPressView={() => setOpenedDoc('location')}
            />
            <ConsentRow
                styles={styles}
                checkColor={c.textInverse}
                checked={value.marketing}
                label="마케팅 알림"
                optional
                onPress={() => toggle('marketing')}
                onPressView={() => setOpenedDoc('marketing')}
            />

            <Modal
                // eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined
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
                            {openedDoc === 'location' && '위치기반 서비스 약관'}
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
    /** 아티팩트 badge--teal "선택" — 필수 항목이 아님을 알리는 배지 */
    optional?: boolean;
    bold?: boolean;
    onPress: () => void;
    onPressView?: () => void;
    checkColor: string;
    styles: ReturnType<typeof makeStyles>;
}

const ConsentRow: React.FC<ConsentRowProps> = ({
    checked,
    label,
    required,
    optional,
    bold,
    onPress,
    onPressView,
    checkColor,
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
                {checked ? <Ionicons name="checkmark" size={16} color={checkColor} /> : null}
            </View>
            <Text style={[styles.label, bold && styles.labelBold]}>{label}</Text>
            {/* 아티팩트 51: badge--coral(필수) / badge--teal(선택) */}
            {required ? <AppBadge tone="error" label="필수" style={styles.rowBadge} /> : null}
            {optional ? <AppBadge tone="success" label="선택" style={styles.rowBadge} /> : null}
        </Pressable>
        {onPressView ? (
            <Pressable onPress={onPressView} hitSlop={8}>
                <Text style={styles.viewBtn}>보기</Text>
            </Pressable>
        ) : null}
    </View>
);

const FALLBACK_TERMS = TERMS_OF_SERVICE_TEXT;
const FALLBACK_PRIVACY = PRIVACY_POLICY_TEXT;
const FALLBACK_LOCATION = LOCATION_SERVICE_TEXT;
const FALLBACK_MARKETING =
    '신규 기능·이벤트·노무/세무 콘텐츠를 푸시 또는 이메일로 보내드려요.\n\n월 최대 4회, 언제든지 알림 설정에서 수신 거부 가능합니다.';

const makeStyles = (c: ThemeColors) => StyleSheet.create({
    sectionTitle: {
        fontSize: tokens.typography.sizes.lg,
        fontWeight: tokens.typography.weights.bold,
        color: c.textPrimary,
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
    label: {
        fontSize: tokens.typography.sizes.md,
        color: c.textPrimary,
        flexShrink: 1,
    },
    labelBold: {fontWeight: tokens.typography.weights.bold},
    rowBadge: {marginLeft: tokens.spacing.sm},
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
