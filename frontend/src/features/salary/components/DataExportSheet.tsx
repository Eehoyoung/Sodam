/**
 * A13 데이터 내보내기 시트 (갭분석 추가).
 * 세무 신고용 월별 정산·명세 일괄 추출(PDF/CSV). 기간·형식 선택.
 * 실제 추출/전송은 호출 측 onExport 핸들러.
 */
import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText, BottomSheet, SegmentedControl} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';

interface Props {
    visible: boolean;
    onClose: () => void;
    onExport: (opts: {format: 'PDF' | 'CSV'; range: '이번달' | '지난달' | '올해'}) => void;
}

const FORMATS: Array<'PDF' | 'CSV'> = ['PDF', 'CSV'];
const RANGES: Array<'이번달' | '지난달' | '올해'> = ['이번달', '지난달', '올해'];

export const DataExportSheet: React.FC<Props> = ({visible, onClose, onExport}) => {
    const [fmt, setFmt] = useState(0);
    const [range, setRange] = useState(0);

    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            title="자료 내보내기"
            description="세무 신고나 자료 제출용으로 정산·명세를 한 번에 받을 수 있어요."
            primary={{label: '내보내기', onPress: () => onExport({format: FORMATS[fmt], range: RANGES[range]})}}
            secondary={{label: '취소', variant: 'ghost', onPress: onClose}}>
            <View style={styles.group}>
                <AppText variant="caption" tone="secondary" style={styles.label}>기간</AppText>
                <SegmentedControl options={RANGES} value={range} onChange={setRange} />
            </View>
            <View style={styles.group}>
                <AppText variant="caption" tone="secondary" style={styles.label}>형식</AppText>
                <SegmentedControl options={FORMATS} value={fmt} onChange={setFmt} />
            </View>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    group: {marginTop: spacing.md, gap: spacing.xs},
    label: {marginLeft: 2, fontWeight: '700'},
});

export default DataExportSheet;
