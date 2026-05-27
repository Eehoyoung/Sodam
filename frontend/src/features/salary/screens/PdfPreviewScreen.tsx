import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {AppButton, AppCard, AppHeader, AppText, CtaStack, ScreenContainer} from '../../../common/components/ds';
import {colors, spacing} from '../../../theme/tokens';

/**
 * 70 PDF Preview — 급여명세서 미리보기 (확정 시안).
 * 실제 다운로드/공유는 호출 측 onDownload/onShare (route param) 또는 기본 안내.
 */
const PdfPreviewScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const title = route.params?.title ?? '급여명세서.pdf';
    const sub = route.params?.sub ?? '';

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="PDF 미리보기" onBack={() => navigation.goBack()} actions={[{label: '공유', onPress: () => route.params?.onShare?.()}]} />}
            footer={
                <CtaStack bordered>
                    <AppButton label="다운로드" onPress={() => route.params?.onDownload?.()} />
                    <AppButton label="공유하기" variant="secondary" onPress={() => route.params?.onShare?.()} />
                </CtaStack>
            }>
            <AppCard variant="flat" style={styles.page}>
                <View style={styles.doc}>
                    <AppText variant="titleMd">{title}</AppText>
                    {sub ? <AppText variant="caption" tone="tertiary" style={styles.sub}>{sub}</AppText> : null}
                </View>
            </AppCard>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    page: {height: 360, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted},
    doc: {alignItems: 'center'},
    sub: {marginTop: spacing.xs},
});

export default PdfPreviewScreen;
