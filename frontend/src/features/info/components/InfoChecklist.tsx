/**
 * InfoChecklist — v3 아티팩트 33~36(LaborInfoDetail/PolicyDetail/TaxInfoDetail/TipsDetail,
 * sodam-v3-05-info.html)의 `.checklist` 번호매김 체크리스트 컴포넌트.
 *
 * 정보 상세 4화면이 공용으로 재사용한다(순수 프레젠테이션 — 데이터는 각 화면이 주입).
 * 아티팩트의 체크리스트 문구는 데모용 특정 기사(예: 주휴수당) 전용 하드코딩이라, 실제 화면에서는
 * BE가 내려주는 자유 텍스트 content를 그대로 3개 항목으로 요약해 보여준다(buildContentChecklist) —
 * 임의로 지어낸 도메인 문구를 노출하지 않기 위함.
 */
import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {AppText} from '../../../common/components/ds';

export interface InfoChecklistItem {
    /** 좌측 원형 배지 글자 ("1"/"2"/"✓" 등) */
    dot: string;
    title: string;
    description: string;
}

interface InfoChecklistProps {
    items: InfoChecklistItem[];
    style?: StyleProp<ViewStyle>;
}

export const InfoChecklist: React.FC<InfoChecklistProps> = ({items, style}) => {
    const c = useThemeColors();
    if (items.length === 0) {
        return null;
    }
    return (
        <View style={[styles.card, {borderColor: c.border, backgroundColor: c.background}, style]}>
            {items.map((item, idx) => (
                <View
                    key={idx}
                    style={[
                        styles.row,
                        idx < items.length - 1 ? [styles.rowDivider, {borderBottomColor: c.border}] : null,
                    ]}>
                    <View style={[styles.dot, {backgroundColor: c.infoBg}]}>
                        <AppText variant="caption" weight="800" style={{color: c.info}}>
                            {item.dot}
                        </AppText>
                    </View>
                    <View style={styles.txt}>
                        <AppText variant="titleMd" weight="700">{item.title}</AppText>
                        <AppText variant="caption" tone="secondary" style={styles.desc}>
                            {item.description}
                        </AppText>
                    </View>
                </View>
            ))}
        </View>
    );
};

/**
 * 자유 텍스트 content를 문단(줄바꿈) 우선, 부족하면 문장 단위로 나눠 최대 max개 항목으로 요약한다.
 * lookbehind 정규식은 Hermes 구버전 호환을 위해 피하고 치환→분리 방식을 쓴다.
 *
 * 문장이 1개뿐이면(짧은 콘텐츠) 체크리스트가 본문 전체와 완전히 같은 문장을 그대로 반복하게 되어
 * 정보 가치가 없다 — 이 경우 빈 배열을 반환해 InfoChecklist 자체를 숨긴다.
 */
export const buildContentChecklist = (content: string | undefined, max = 3): InfoChecklistItem[] => {
    const trimmed = (content ?? '').trim();
    if (!trimmed) {
        return [];
    }
    const paragraphs = trimmed.split(/\n+/).map(s => s.trim()).filter(Boolean);
    const lines = paragraphs.length >= 2
        ? paragraphs
        : trimmed.replace(/([.!?])\s+/g, '$1\n').split('\n').map(s => s.trim()).filter(Boolean);

    if (lines.length < 2) {
        return [];
    }

    return lines.slice(0, max).map((line, idx) => ({
        dot: String(idx + 1),
        title: `핵심 ${idx + 1}`,
        description: line,
    }));
};

const styles = StyleSheet.create({
    rowDivider: {borderBottomWidth: 1},
    card: {borderWidth: 1, borderRadius: radius.xl, overflow: 'hidden'},
    row: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md},
    dot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
    },
    txt: {flex: 1, gap: 2},
    desc: {lineHeight: 16},
});

export default InfoChecklist;
