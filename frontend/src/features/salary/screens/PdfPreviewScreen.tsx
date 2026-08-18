import React from 'react';
import {StyleSheet, View} from 'react-native';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {AppButton, AppCard, AppHeader, AppText, AppToast, CtaStack, ScreenContainer} from '../../../common/components/ds';
import {openPdf} from '../../../common/utils/pdfDocument';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';

/**
 * 70 PDF Preview — 발급된 문서 안내 화면.
 *
 * H-4 이후로 문서는 이미 기기에 저장되고 기본 뷰어로 한 번 열린 상태로 이 화면에 온다.
 * 여기서는 "다시 열기"(저장 경로 재오픈)와 공유를 제공한다 — 예전처럼 파일 없이 제목만
 * 보여주고 끝내지 않는다.
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
    const filePath = route.params?.filePath;

    const reopen = async () => {
        if (!filePath) {
            return;
        }
        try {
            await openPdf(filePath);
        } catch {
            AppToast.error('문서를 열지 못했어요. PDF 를 볼 수 있는 앱이 필요해요.');
        }
    };

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="PDF 미리보기" onBack={() => navigation.goBack()} actions={[{label: '공유', onPress: () => onShare?.()}]} />}
            footer={
                <CtaStack bordered>
                    {filePath ? <AppButton label="문서 열기" onPress={reopen} /> : null}
                    {onDownload ? <AppButton label="다운로드" variant={filePath ? 'secondary' : 'primary'} onPress={onDownload} /> : null}
                    <AppButton label="공유하기" variant={onDownload !== undefined || filePath !== undefined ? 'secondary' : 'primary'} onPress={() => onShare?.()} />
                </CtaStack>
            }>
            <AppCard variant="flat" style={[styles.page, {backgroundColor: c.background}]}>
                <View style={styles.doc}>
                    <AppText variant="titleMd">{title}</AppText>
                    {sub ? <AppText variant="caption" tone="tertiary" style={styles.sub}>{sub}</AppText> : null}
                    {filePath ? (
                        <AppText variant="caption" tone="tertiary" style={styles.sub}>기기에 저장됐어요</AppText>
                    ) : null}
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
