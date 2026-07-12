import React, {useMemo, useState} from 'react';
import {Modal, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {WebView, type WebViewMessageEvent} from 'react-native-webview';
import {AppHeader, AppText, AppToast} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';

export interface AddressSearchResult {
    query: string;
    roadAddress: string;
    jibunAddress: string;
    zonecode: string;
    buildingName: string;
}

interface AddressSearchModalProps {
    visible: boolean;
    initialQuery?: string;
    onSelect: (address: AddressSearchResult) => void;
    onClose: () => void;
}

function buildPostcodeHtml(initialQuery: string): string {
    const q = JSON.stringify(initialQuery);
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <script src="https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
  <style>
    html, body, #postcode {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #ffffff;
    }
  </style>
</head>
<body>
  <div id="postcode"></div>
  <script>
    (function () {
      function send(type, payload) {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload || {} }));
      }

      function start() {
        var Postcode = window.daum && window.daum.Postcode ? window.daum.Postcode : window.kakao && window.kakao.Postcode;
        if (!Postcode) {
          send('error', { message: 'Kakao Postcode script is not available.' });
          return;
        }

        var postcode = new Postcode({
          width: '100%',
          height: '100%',
          animation: false,
          hideMapBtn: true,
          oncomplete: function (data) {
            var roadAddress = data.roadAddress || data.autoRoadAddress || data.address || '';
            var jibunAddress = data.jibunAddress || data.autoJibunAddress || '';
            send('complete', {
              query: data.query || roadAddress || data.address || '',
              roadAddress: roadAddress,
              jibunAddress: jibunAddress,
              zonecode: data.zonecode || '',
              buildingName: data.buildingName || ''
            });
          }
        });

        postcode.embed(document.getElementById('postcode'), {
          q: ${q},
          autoClose: true
        });
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
      } else {
        start();
      }
    })();
  </script>
</body>
</html>`;
}

const AddressSearchModal: React.FC<AddressSearchModalProps> = ({
    visible,
    initialQuery = '',
    onSelect,
    onClose,
}) => {
    const c = useThemeColors();
    const [loading, setLoading] = useState(true);
    const html = useMemo(() => buildPostcodeHtml(initialQuery), [initialQuery]);

    const handleMessage = (event: WebViewMessageEvent) => {
        try {
            const message = JSON.parse(event.nativeEvent.data) as {
                type?: string;
                payload?: Partial<AddressSearchResult> & {message?: string};
            };
            if (message.type === 'complete') {
                const payload = message.payload ?? {};
                onSelect({
                    query: payload.query ?? '',
                    roadAddress: payload.roadAddress ?? '',
                    jibunAddress: payload.jibunAddress ?? '',
                    zonecode: payload.zonecode ?? '',
                    buildingName: payload.buildingName ?? '',
                });
                onClose();
                return;
            }
            if (message.type === 'error') {
                AppToast.error(message.payload?.message ?? '주소 검색을 불러오지 못했어요.');
            }
        } catch {
            AppToast.error('주소 검색 결과를 처리하지 못했어요.');
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView style={[styles.safeArea, {backgroundColor: c.background}]} edges={['top', 'bottom']}>
                <AppHeader title="주소 검색" actions={[{label: '닫기', onPress: onClose}]} />
                {loading ? (
                    <View style={styles.loading}>
                        <AppText variant="bodyMd" tone="secondary">주소 검색을 불러오고 있어요.</AppText>
                    </View>
                ) : null}
                {visible ? (
                <WebView
                    source={{html, baseUrl: 'https://postcode.map.daum.net'}}
                    originWhitelist={['*']}
                    javaScriptEnabled
                    domStorageEnabled
                    onLoadEnd={() => setLoading(false)}
                    onMessage={handleMessage}
                    onError={() => {
                        setLoading(false);
                        AppToast.error('주소 검색을 불러오지 못했어요.');
                    }}
                    style={styles.webView}
                />
                ) : null}
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    safeArea: {flex: 1},
    webView: {flex: 1},
    loading: {
        paddingVertical: spacing.sm,
        alignItems: 'center',
    },
});

export default AddressSearchModal;
