import React from 'react';
import {StyleSheet} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {AppCard, AppHeader, AppText, ScreenContainer} from '../../../common/components/ds';
import {LOCATION_SERVICE_TEXT, PRIVACY_POLICY_TEXT, TERMS_OF_SERVICE_TEXT} from '../legalContent';

/**
 * 74 Legal Webview — 약관/개인정보 처리방침 (확정 시안).
 * route param.kind 로 문서 종류 결정. 기본값은 실제 게시 문구(legalContent.ts, docs/legal/*.md
 * 원본과 동일)이며, route.params.body 가 전달되면 그 값을 우선한다(BE/원격 주입 오버라이드 유지).
 * HomeNavigator 'LegalWebview' 라우트로 등록됨(docs/260720 v3 감사 후속) — SettingsScreen
 * "이용약관"/"개인정보 처리방침" 항목에서 각각 kind='terms'/'privacy' 로 진입한다.
 */
const TITLES: Record<string, string> = {
    privacy: '개인정보 처리방침',
    terms: '서비스 이용약관',
    location: '위치기반 서비스 약관',
};

const DEFAULT_BODIES: Record<string, string> = {
    privacy: PRIVACY_POLICY_TEXT,
    terms: TERMS_OF_SERVICE_TEXT,
    location: LOCATION_SERVICE_TEXT,
};

const LegalWebviewScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'LegalWebview'>>();
    const kind = route.params?.kind ?? 'privacy';
    const body: string = route.params?.body ?? DEFAULT_BODIES[kind] ?? PRIVACY_POLICY_TEXT;

    return (
        <ScreenContainer scroll header={<AppHeader title={TITLES[kind] ?? '약관'} onBack={() => navigation.goBack()} />}>
            <AppCard variant="flat">
                <AppText variant="bodyMd" tone="secondary" style={styles.body}>{body}</AppText>
            </AppCard>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    body: {lineHeight: 22},
});

export default LegalWebviewScreen;
