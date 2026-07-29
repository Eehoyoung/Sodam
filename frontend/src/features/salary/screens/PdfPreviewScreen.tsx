import React from 'react';
import {StyleSheet, View} from 'react-native';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {AppButton, AppCard, AppHeader, AppText, CtaStack, ScreenContainer} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';

/**
 * 70 PDF Preview — 급여명세서 미리보기 (확정 시안).
 * 실제 다운로드/공유는 호출 측 onDownload/onShare (route param) 또는 기본 안내.
 */
export interface PdfPreviewVisualFixture {
    title: string;
    sub: string;
}

interface PdfPreviewScreenProps {
    /** 개발용 시각 검증 전용 — route.params 대신 고정값을 표시한다. */
    visualFixture?: PdfPreviewVisualFixture;
}

const PdfPreviewScreen: React.FC<PdfPreviewScreenProps> = ({visualFixture}) => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'PdfPreview'>>();
    const c = useThemeColors();
    const title = visualFixture?.title ?? route.params?.title ?? '급여명세서.pdf';
    const sub = visualFixture?.sub ?? route.params?.sub ?? '';
    const onDownload = route.params?.onDownload ?? (visualFixture ? () => undefined : undefined);
    const onShare = route.params?.onShare;

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="PDF 미리보기" onBack={() => navigation.goBack()} actions={[{label: '공유', onPress: () => onShare?.()}]} />}
            footer={
                <CtaStack bordered>
                    {onDownload ? <AppButton label="다운로드" onPress={onDownload} /> : null}
                    <AppButton label="공유하기" variant={onDownload ? 'secondary' : 'primary'} onPress={() => onShare?.()} />
                </CtaStack>
            }>
            <AppCard variant="flat" style={[styles.page, {backgroundColor: c.background}]}>
                <View style={styles.doc}>
                    <AppText variant="titleMd">{title}</AppText>
                    {sub ? <AppText variant="caption" tone="tertiary" style={styles.sub}>{sub}</AppText> : null}
                </View>
            </AppCard>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    // v3 아티팩트 70 PDFPreview(sodam-v3-04-payroll.html)의 .pdf-preview: height 320, 흰 카드.
    page: {height: 320, alignItems: 'center', justifyContent: 'center'},
    doc: {alignItems: 'center'},
    sub: {marginTop: spacing.xs},
});

export default PdfPreviewScreen;
