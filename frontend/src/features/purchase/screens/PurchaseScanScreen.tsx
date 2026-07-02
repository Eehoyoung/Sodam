/**
 * ① PurchaseScanScreen — 영수증 촬영/선택 → OCR 초안 → 확인 화면으로.
 *
 * 한 화면=한 가지: "영수증을 비춰주세요". 하단 풀폭 CTA 1개(영수증 촬영) + 보조(직접 입력).
 * OCR 미설정(ocrAvailable=false)이면 안내 후 수기 입력 경로로 유도.
 */
import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {RouteProp, NavigationProp} from '@react-navigation/native';
import {
    AppButton,
    AppText,
    AppToast,
    CtaStack,
    ImagePickerSheet,
    ScreenContainer,
} from '../../../common/components/ds';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import purchaseService from '../services/purchaseService';
import {PurchaseCategory, ReceiptDraft} from '../types';
import {pickReceiptImage, PickedImage} from '../utils/imagePicker';

type ScanRouteProp = RouteProp<{PurchaseScan: {storeId: number}}, 'PurchaseScan'>;

interface Props {
    route: ScanRouteProp;
    navigation: NavigationProp<Record<string, object | undefined>>;
}

const todayString = (): string => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${mm}-${dd}`;
};

const emptyDraft = (): ReceiptDraft => ({
    vendorName: '',
    purchaseDate: todayString(),
    category: 'VEGETABLE' as PurchaseCategory,
    items: [],
    ocrAvailable: false,
});

export default function PurchaseScanScreen({route, navigation}: Props) {
    const {storeId} = route.params;
    const c = useThemeColors();
    const [sheetVisible, setSheetVisible] = useState(false);
    const [scanning, setScanning] = useState(false);

    const goConfirm = (draft: ReceiptDraft) => {
        navigation.navigate('PurchaseConfirm', {storeId, draft});
    };

    const runScan = async (source: 'camera' | 'album') => {
        setSheetVisible(false);
        let picked: PickedImage | null = null;
        try {
            picked = await pickReceiptImage(source);
        } catch {
            AppToast.error('사진을 불러오지 못했어요. 직접 입력으로 진행해 주세요.');
            return;
        }
        if (!picked) {
            // 사용자가 취소했거나 picker 미설치 — 수기 입력 안내
            AppToast.show('직접 입력으로 매입을 기록해 주세요.');
            return;
        }

        setScanning(true);
        try {
            const form = new FormData();
            // RN FormData 는 파일 디스크립터를 받지만 TS lib 타입은 string|Blob 만 허용.
            (form as unknown as {append: (k: string, v: unknown) => void}).append('image', {
                uri: picked.uri,
                name: picked.fileName ?? 'receipt.jpg',
                type: picked.type ?? 'image/jpeg',
            });
            const draft = await purchaseService.scan(storeId, form);
            if (!draft.ocrAvailable) {
                AppToast.warn('자동 인식이 아직 준비 중이라 직접 확인해 주세요.');
            }
            goConfirm(draft);
        } catch {
            AppToast.error('영수증 인식에 실패했어요. 직접 입력으로 진행해 주세요.');
        } finally {
            setScanning(false);
        }
    };

    return (
        <ScreenContainer
            scroll
            footer={
                <CtaStack>
                    <AppButton
                        label="영수증 촬영"
                        loading={scanning}
                        loadingLabel="인식 중..."
                        onPress={() => setSheetVisible(true)}
                        leftIcon={<Ionicons name="camera-outline" size={20} color={c.textInverse} />}
                    />
                    <AppButton
                        label="직접 입력하기"
                        variant="secondary"
                        disabled={scanning}
                        onPress={() => goConfirm(emptyDraft())}
                    />
                </CtaStack>
            }>
            <View style={[styles.frame, {borderColor: c.border, backgroundColor: c.surfaceWarm}]}>
                <View style={[styles.iconWrap, {backgroundColor: c.brandPrimarySoft}]}>
                    <Ionicons name="receipt-outline" size={40} color={c.brandPrimary} />
                </View>
                <AppText variant="headingSm" center style={styles.frameTitle}>
                    영수증을 비춰주세요
                </AppText>
            </View>

            <AppText variant="bodyMd" tone="secondary" center style={styles.help}>
                야채·주류 영수증을 찍으면 품목·단가가 자동으로 입력돼요.
            </AppText>
            <AppText variant="caption" tone="tertiary" center style={styles.helpSub}>
                자동 인식이 어려우면 직접 입력하기로 기록할 수 있어요.
            </AppText>

            <ImagePickerSheet
                visible={sheetVisible}
                onClose={() => setSheetVisible(false)}
                onCamera={() => runScan('camera')}
                onAlbum={() => runScan('album')}
            />
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    frame: {
        marginTop: spacing.lg,
        borderWidth: 1,
        borderRadius: radius.xxl,
        paddingVertical: spacing.huge,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrap: {
        width: 80,
        height: 80,
        borderRadius: radius.xxl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    frameTitle: {marginTop: spacing.lg},
    help: {marginTop: spacing.xxl},
    helpSub: {marginTop: spacing.sm},
});
