import React, {useCallback, useMemo, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppButton,
    AppText,
    CtaStack,
    LoadingState,
    ScreenContainer,
    AppToast,
} from '../../../common/components/ds';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {env} from '../../../common/config/env';
import subscriptionApi, {
    BillingCycle,
    PlanType,
} from '../services/subscriptionApi';

/**
 * 토스 빌링 인증 화면.
 *
 * 흐름:
 *  1. WebView 에서 토스 SDK `requestBillingAuth('카드', …)` 호출 → 카드 인증 창
 *  2. 성공 시 토스가 successUrl 로 리다이렉트 → onShouldStartLoadWithRequest 로 가로채
 *     쿼리스트링에서 `authKey` 추출
 *  3. subscribePaid(plan, authKey, billingCycle) → 빌링키 발급 + 첫 청구 (BE 담당)
 *
 * react-native-webview 미설치 시: 의존성을 임의로 추가하지 않고 안내 화면으로 폴백한다.
 */

// 토스가 인증 성공/실패 후 돌려보낼 sentinel URL. 실제 페이지를 로드하지 않고 가로채기만 한다.
const SUCCESS_URL = 'https://sodam.local/billing/success';
const FAIL_URL = 'https://sodam.local/billing/fail';

// react-native-webview 는 선택적 의존성 — 설치 전이면 require 가 throw 하므로 안전하게 감싼다.
type WebViewNavEvent = {url: string};
type WebViewComponent = React.ComponentType<{
    source: {html?: string; uri?: string};
    originWhitelist?: string[];
    onShouldStartLoadWithRequest?: (event: WebViewNavEvent) => boolean;
    onError?: () => void;
    style?: object;
}>;

function loadWebView(): WebViewComponent | null {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require('react-native-webview') as {WebView?: WebViewComponent};
        return mod?.WebView ?? null;
    } catch {
        return null;
    }
}

const WebViewImpl = loadWebView();

function isPlanType(value: string): value is PlanType {
    return value === 'STARTER' || value === 'PRO' || value === 'PREMIUM' || value === 'FREE';
}

function isBillingCycle(value: string): value is BillingCycle {
    return value === 'MONTHLY' || value === 'HALF_YEARLY' || value === 'YEARLY';
}

// 토스 SDK 를 로드해 빌링 인증을 요청하는 인라인 HTML.
function buildBillingHtml(clientKey: string, customerKey: string): string {
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://js.tosspayments.com/v1/payment"></script>
</head>
<body>
  <script>
    (function () {
      try {
        var tossPayments = TossPayments('${clientKey}');
        tossPayments.requestBillingAuth('카드', {
          customerKey: '${customerKey}',
          successUrl: '${SUCCESS_URL}',
          failUrl: '${FAIL_URL}'
        });
      } catch (e) {
        location.href = '${FAIL_URL}?message=' + encodeURIComponent(String(e && e.message ? e.message : e));
      }
    })();
  </script>
</body>
</html>`;
}

function extractQueryParam(url: string, key: string): string | null {
    const match = url.match(new RegExp(`[?&]${key}=([^&]+)`));
    return match ? decodeURIComponent(match[1]) : null;
}

const TossBillingAuthScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'TossBillingAuth'>>();
    const c = useThemeColors();

    const planParam = route.params?.plan ?? '';
    const cycleParam = route.params?.billingCycle ?? 'MONTHLY';
    const plan: PlanType | null = isPlanType(planParam) ? planParam : null;
    const billingCycle: BillingCycle = isBillingCycle(cycleParam) ? cycleParam : 'MONTHLY';

    const [processing, setProcessing] = useState(false);
    // 리다이렉트가 onShouldStartLoadWithRequest 로 2회 들어오는 경우(중복 처리) 방지.
    const handledRef = useRef(false);

    // customerKey 는 토스 빌링 식별자 — 사용자/세션마다 고유해야 한다. 영숫자만 허용.
    const customerKey = useMemo(
        () => `sodam_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`,
        [],
    );

    const html = useMemo(
        () => buildBillingHtml(env.tossClientKey, customerKey),
        [customerKey],
    );

    const onSuccess = useCallback(
        async (authKey: string) => {
            if (!plan) {
                AppToast.error('플랜 정보가 올바르지 않아요. 다시 시도해 주세요.');
                navigation.goBack();
                return;
            }
            setProcessing(true);
            try {
                await subscriptionApi.subscribePaid(plan, authKey, billingCycle);
                AppToast.success('결제가 완료됐어요. 소담과 함께해요!');
                navigation.navigate('Home');
            } catch (e: unknown) {
                const message =
                    (e as {response?: {data?: {message?: string}}})?.response?.data?.message ??
                    null;
                if (message) {
                    AppToast.error(message);
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 크로스 네비게이터: PaymentFailed 는 루트 스택 라우트
                (navigation as any).navigate('PaymentFailed');
            } finally {
                setProcessing(false);
            }
        },
        [plan, billingCycle, navigation],
    );

    const handleNavRequest = useCallback(
        (event: WebViewNavEvent): boolean => {
            const url = event.url;
            if (url.startsWith(SUCCESS_URL)) {
                if (handledRef.current) {
                    return false;
                }
                handledRef.current = true;
                const authKey = extractQueryParam(url, 'authKey');
                if (authKey) {
                    void onSuccess(authKey);
                } else {
                    AppToast.error('인증 정보를 받지 못했어요. 다시 시도해 주세요.');
                    navigation.goBack();
                }
                return false; // sentinel URL 은 실제 로드하지 않는다.
            }
            if (url.startsWith(FAIL_URL)) {
                if (handledRef.current) {
                    return false;
                }
                handledRef.current = true;
                AppToast.show('결제가 취소됐어요.');
                navigation.goBack();
                return false;
            }
            return true; // 그 외(토스 인증 페이지)는 정상 로드.
        },
        [onSuccess, navigation],
    );

    // 폴백: react-native-webview 미설치 → 의존성 임의 추가 금지, 안내만.
    if (!WebViewImpl) {
        return (
            <ScreenContainer
                footer={
                    <CtaStack>
                        <AppButton label="돌아가기" onPress={() => navigation.goBack()} />
                    </CtaStack>
                }>
                <View style={styles.center}>
                    <View style={[styles.iconBadge, {backgroundColor: c.surfaceWarm}]}>
                        <Ionicons name="card-outline" size={34} color={c.brandPrimary} />
                    </View>
                    <AppText variant="headingMd" center style={styles.title}>
                        결제 모듈을 준비하고 있어요
                    </AppText>
                    <AppText variant="bodyLg" tone="secondary" center style={styles.desc}>
                        카드 결제 기능을 곧 열어드릴게요. 조금만 기다려 주세요.
                    </AppText>
                </View>
            </ScreenContainer>
        );
    }

    if (processing) {
        return (
            <ScreenContainer>
                <LoadingState title="결제 처리 중" description="결제를 처리하고 있어요…" />
            </ScreenContainer>
        );
    }

    const WebView = WebViewImpl;
    return (
        <View style={styles.flex}>
            <WebView
                source={{html}}
                originWhitelist={['*']}
                onShouldStartLoadWithRequest={handleNavRequest}
                onError={() => {
                    AppToast.error('결제 창을 여는 데 실패했어요. 다시 시도해 주세요.');
                    navigation.goBack();
                }}
                style={styles.flex}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    flex: {flex: 1},
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    iconBadge: {
        width: 72,
        height: 72,
        borderRadius: radius.xxl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {marginTop: spacing.xl},
    desc: {marginTop: spacing.sm, maxWidth: 320},
});

export default TossBillingAuthScreen;
