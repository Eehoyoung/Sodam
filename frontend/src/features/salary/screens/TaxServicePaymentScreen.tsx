import React, {useCallback, useMemo, useRef} from 'react';
import {StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AppHeader, AppToast, ErrorState, LoadingState, ScreenContainer} from '../../../common/components/ds';
import {isTossLive, env} from '../../../common/config/env';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {useConfirmTaxServiceOrder} from '../hooks/useTaxServiceOrders';

type WebViewNavEvent = {url: string};
type WebViewComponent = React.ComponentType<{
    source: {html?: string};
    originWhitelist?: string[];
    onShouldStartLoadWithRequest?: (event: WebViewNavEvent) => boolean;
    onError?: () => void;
    style?: object;
}>;

function loadWebView(): WebViewComponent | null {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require('react-native-webview') as {WebView?: WebViewComponent};
        return mod.WebView ?? null;
    } catch {
        return null;
    }
}

const WebViewImpl = loadWebView();

function buildPaymentHtml(
    clientKey: string,
    orderId: string,
    orderName: string,
    amount: number,
    successUrl: string,
    failUrl: string,
): string {
    const safeOrderName = orderName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script src="https://js.tosspayments.com/v1/payment"></script></head><body><script>(function(){try{var tossPayments=TossPayments('${clientKey}');tossPayments.requestPayment('카드',{amount:${amount},orderId:'${orderId}',orderName:'${safeOrderName}',successUrl:'${successUrl}',failUrl:'${failUrl}'});}catch(e){location.href='${failUrl}?message='+encodeURIComponent(String(e&&e.message?e.message:e));}})();</script></body></html>`;
}

const extractQueryParam = (url: string, key: string): string | null => {
    const match = url.match(new RegExp(`[?&]${key}=([^&]+)`));
    return match ? decodeURIComponent(match[1]) : null;
};

const normalizeHttpsCallbackUrl = (url: string): string | null => {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') {
            return null;
        }
        return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    } catch {
        return null;
    }
};

const TaxServicePaymentScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'TaxServicePayment'>>();
    const confirmMutation = useConfirmTaxServiceOrder();
    const handledRef = useRef(false);
    const {orderId, amount, orderName, successUrl, failUrl} = route.params;
    const expectedSuccessUrl = normalizeHttpsCallbackUrl(successUrl);
    const expectedFailUrl = normalizeHttpsCallbackUrl(failUrl);
    const html = useMemo(
        () => buildPaymentHtml(env.tossClientKey, orderId, orderName, amount, successUrl, failUrl),
        [amount, failUrl, orderId, orderName, successUrl],
    );

    const confirm = useCallback(async (paymentKey: string, confirmedOrderId: string, confirmedAmount: number) => {
        try {
            await confirmMutation.mutateAsync({orderId: confirmedOrderId, paymentKey, amount: confirmedAmount});
            AppToast.success('세무 패키지 신청이 완료됐어요.');
            navigation.goBack();
        } catch (error: unknown) {
            const message = (error as {response?: {data?: {message?: string}}})?.response?.data?.message ??
                '결제 확인에 실패했어요. 잠시 후 다시 시도해 주세요.';
            AppToast.error(message);
            navigation.goBack();
        }
    }, [confirmMutation, navigation]);

    const handleNavRequest = useCallback((event: WebViewNavEvent): boolean => {
        const {url} = event;
        const normalizedUrl = normalizeHttpsCallbackUrl(url);
        if (expectedSuccessUrl && normalizedUrl === expectedSuccessUrl) {
            if (handledRef.current) {
                return false;
            }
            handledRef.current = true;
            const paymentKey = extractQueryParam(url, 'paymentKey');
            const confirmedOrderId = extractQueryParam(url, 'orderId');
            const amountParam = extractQueryParam(url, 'amount');
            const confirmedAmount = amountParam ? Number(amountParam) : Number.NaN;
            if (paymentKey && confirmedOrderId === orderId && confirmedAmount === amount) {
                confirm(paymentKey, confirmedOrderId, confirmedAmount).catch(() => undefined);
            } else {
                AppToast.error('결제 정보가 주문과 일치하지 않아요. 다시 시도해 주세요.');
                navigation.goBack();
            }
            return false;
        }
        if (expectedFailUrl && normalizedUrl === expectedFailUrl) {
            if (handledRef.current) {
                return false;
            }
            handledRef.current = true;
            AppToast.show('결제가 취소됐어요.');
            navigation.goBack();
            return false;
        }
        return true;
    }, [amount, confirm, expectedFailUrl, expectedSuccessUrl, navigation, orderId]);

    if (!isTossLive() || !WebViewImpl || !expectedSuccessUrl || !expectedFailUrl) {
        return <ScreenContainer header={<AppHeader title="세무 패키지 결제" onBack={() => navigation.goBack()} />}><ErrorState title="결제 환경이 일치하지 않아요" description="다시 시도해도 계속되면 고객센터에 문의해 주세요." primary={{label: '돌아가기', onPress: () => navigation.goBack()}} /></ScreenContainer>;
    }

    if (confirmMutation.isPending) {
        return <ScreenContainer header={<AppHeader title="세무 패키지 결제" />}><LoadingState title="결제 확인 중" description="세무 패키지 신청을 처리하고 있어요." /></ScreenContainer>;
    }

    const WebView = WebViewImpl;
    return <SafeAreaView style={styles.flex} edges={['top']}><AppHeader title="세무 패키지 결제" onBack={() => navigation.goBack()} /><WebView source={{html}} originWhitelist={['*']} onShouldStartLoadWithRequest={handleNavRequest} onError={() => { AppToast.error('결제 창을 열지 못했어요. 다시 시도해 주세요.'); navigation.goBack(); }} style={styles.flex} /></SafeAreaView>;
};

const styles = StyleSheet.create({
    flex: {flex: 1},
});

export default TaxServicePaymentScreen;
