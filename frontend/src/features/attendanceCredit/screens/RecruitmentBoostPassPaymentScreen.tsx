import React, {useCallback, useMemo, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AppButton, AppHeader, AppText, CtaStack, LoadingState, ScreenContainer, AppToast} from '../../../common/components/ds';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {env} from '../../../common/config/env';
import recruitmentBoostPassApi from '../services/recruitmentBoostPassApi';

/**
 * 채용 부스트 무제한 패스 — 토스 단건결제 화면.
 *
 * `AttendanceCreditChargePaymentScreen`(출근권 충전소)과 완전히 동일한 WebView 가로채기 패턴을
 * 그대로 따른다 — 새 결제 UI 패턴을 발명하지 않는다(recruitment-monetization-gamification-plan.md
 * §2.5, §7). 차이는 승인 콜백이 `recruitmentBoostPassApi.confirmOrder`를 호출한다는 점뿐이다.
 */

const SUCCESS_URL = 'https://sodam.local/recruitment-boost-pass/success';
const FAIL_URL = 'https://sodam.local/recruitment-boost-pass/fail';

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

function buildPaymentHtml(clientKey: string, orderId: string, orderName: string, amount: number): string {
    // orderName 은 JS 문자열 리터럴에 그대로 삽입되므로 따옴표/백슬래시만 최소 이스케이프한다
    // (한글 상품명 고정 문구라 실사용자 입력이 섞이지 않음 — XSS 벡터 아님).
    const safeOrderName = orderName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
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
        tossPayments.requestPayment('카드', {
          amount: ${amount},
          orderId: '${orderId}',
          orderName: '${safeOrderName}',
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

const RecruitmentBoostPassPaymentScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'RecruitmentBoostPassPayment'>>();
    const c = useThemeColors();

    const {orderId, amountKrw, orderName} = route.params ?? {orderId: '', amountKrw: 0, orderName: ''};

    const [processing, setProcessing] = useState(false);
    const handledRef = useRef(false);

    const html = useMemo(
        () => buildPaymentHtml(env.tossClientKey, orderId, orderName, amountKrw),
        [orderId, orderName, amountKrw],
    );

    const onSuccess = useCallback(
        async (paymentKey: string, confirmedOrderId: string, confirmedAmount: number) => {
            setProcessing(true);
            try {
                await recruitmentBoostPassApi.confirmOrder(confirmedOrderId, paymentKey, confirmedAmount);
                AppToast.success('무제한 패스가 활성화됐어요!');
                navigation.goBack();
            } catch (e: unknown) {
                const message =
                    (e as {response?: {data?: {message?: string}}})?.response?.data?.message ??
                    '결제 승인에 실패했어요. 잠시 후 다시 시도해 주세요.';
                AppToast.error(message);
                navigation.goBack();
            } finally {
                setProcessing(false);
            }
        },
        [navigation],
    );

    const handleNavRequest = useCallback(
        (event: WebViewNavEvent): boolean => {
            const url = event.url;
            if (url.startsWith(SUCCESS_URL)) {
                if (handledRef.current) {
                    return false;
                }
                handledRef.current = true;
                const paymentKey = extractQueryParam(url, 'paymentKey');
                const confirmedOrderId = extractQueryParam(url, 'orderId') ?? orderId;
                const confirmedAmountRaw = extractQueryParam(url, 'amount');
                const confirmedAmount = confirmedAmountRaw ? Number(confirmedAmountRaw) : amountKrw;
                if (paymentKey) {
                    void onSuccess(paymentKey, confirmedOrderId, confirmedAmount);
                } else {
                    AppToast.error('결제 정보를 받지 못했어요. 다시 시도해 주세요.');
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
            return true; // 그 외(토스 결제 페이지·카드사 3DS 등)는 정상 로드.
        },
        [onSuccess, navigation, orderId, amountKrw],
    );

    if (!WebViewImpl) {
        return (
            <ScreenContainer
                header={<AppHeader title="무제한 패스 결제" onBack={() => navigation.goBack()} />}
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
            <ScreenContainer header={<AppHeader title="무제한 패스 결제" />}>
                <LoadingState title="결제 처리 중" description="패스를 활성화하고 있어요…" />
            </ScreenContainer>
        );
    }

    const WebView = WebViewImpl;
    return (
        <SafeAreaView style={styles.flex} edges={['top']}>
            <AppHeader title="무제한 패스 결제" onBack={() => navigation.goBack()} />
            <WebView
                source={{html}}
                // 카드사·은행·3DS 외부 인증 도메인 리다이렉트가 필요해 '*' 유지(좁히면 실결제 차단).
                // 보안 게이트는 onShouldStartLoadWithRequest(handleNavRequest)의 sentinel URL 검증으로 수행.
                originWhitelist={['*']}
                onShouldStartLoadWithRequest={handleNavRequest}
                onError={() => {
                    AppToast.error('결제 창을 여는 데 실패했어요. 다시 시도해 주세요.');
                    navigation.goBack();
                }}
                style={styles.flex}
            />
        </SafeAreaView>
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
        width: 72, height: 72, borderRadius: radius.xxl,
        alignItems: 'center', justifyContent: 'center',
    },
    title: {marginTop: spacing.xl},
    desc: {marginTop: spacing.sm, maxWidth: 320},
});

export default RecruitmentBoostPassPaymentScreen;
