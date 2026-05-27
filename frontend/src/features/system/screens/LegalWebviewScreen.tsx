import React from 'react';
import {StyleSheet} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {AppCard, AppHeader, AppText, ScreenContainer} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';

/**
 * 74 Legal Webview — 약관/개인정보 처리방침 (확정 시안).
 * route param.kind 로 문서 종류 결정. 실제 약관 전문은 BE/원격에서 주입 가능(route.params.body).
 */
const TITLES: Record<string, string> = {
    privacy: '개인정보 처리방침',
    terms: '서비스 이용약관',
    location: '위치기반 서비스 약관',
};

const LegalWebviewScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const kind = route.params?.kind ?? 'privacy';
    const body: string = route.params?.body ??
        '소담은 서비스 제공에 필요한 최소한의 정보를 처리합니다. 위치 정보는 출퇴근 인증 목적으로만 사용되며 관련 법령과 정책에 따라 보호됩니다.';

    return (
        <ScreenContainer scroll header={<AppHeader title={TITLES[kind] ?? '약관'} onBack={() => navigation.goBack()} />}>
            <AppCard variant="flat">
                <AppText variant="bodyMd" tone="secondary" style={styles.body}>{body}</AppText>
            </AppCard>
            <AppCard variant="flat" style={styles.toc}>
                <AppText variant="caption" tone="tertiary">제1조 목적 · 제2조 수집 항목 · 제3조 보관 기간 · 제4조 이용자 권리</AppText>
            </AppCard>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    body: {lineHeight: 22},
    toc: {marginTop: spacing.md},
});

export default LegalWebviewScreen;
