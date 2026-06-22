/**
 * ② PurchaseConfirmScreen — OCR 초안/수기 입력 보정 → 매입 저장(create) 또는 기존 수정(update).
 *
 * 거래처·일자·분류 + 품목 리스트(품목·수량·단위·단가, 행 추가/삭제, 단가×수량 자동합계).
 * 하단 풀폭 CTA 1개(매입 저장). params: draft(신규) 또는 purchaseId(수정).
 */
import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {RouteProp, NavigationProp} from '@react-navigation/native';
import {
    AmountText,
    AppButton,
    AppCard,
    AppInput,
    AppText,
    AppToast,
    CtaStack,
    ErrorState,
    LoadingState,
    SegmentedControl,
    ScreenContainer,
    SuccessState,
} from '../../../common/components/ds';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import purchaseService from '../services/purchaseService';
import {
    PURCHASE_CATEGORY_LABELS,
    PURCHASE_CATEGORY_ORDER,
    PurchaseSaveRequest,
    ReceiptDraft,
} from '../types';

type ConfirmRouteProp = RouteProp<
    {PurchaseConfirm: {storeId: number; draft?: ReceiptDraft; purchaseId?: number}},
    'PurchaseConfirm'
>;

interface Props {
    route: ConfirmRouteProp;
    navigation: NavigationProp<Record<string, object | undefined>>;
}

/** 입력 중인 행은 문자열로 보관(빈칸·부분입력 허용), 저장 시 number 로 변환. */
interface ItemRow {
    key: string;
    itemName: string;
    quantity: string;
    unit: string;
    unitPrice: string;
}

let rowSeq = 0;
const newRow = (): ItemRow => ({
    key: `row-${rowSeq++}`,
    itemName: '',
    quantity: '',
    unit: '',
    unitPrice: '',
});

const toNumber = (v: string): number => {
    const n = Number(v.replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
};

const todayString = (): string => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${mm}-${dd}`;
};

export default function PurchaseConfirmScreen({route, navigation}: Props) {
    const {storeId, draft, purchaseId} = route.params;
    const c = useThemeColors();
    const isEdit = typeof purchaseId === 'number';

    const [loading, setLoading] = useState(isEdit);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [vendorName, setVendorName] = useState(draft?.vendorName ?? '');
    const [purchaseDate, setPurchaseDate] = useState(draft?.purchaseDate ?? todayString());
    const [memo, setMemo] = useState('');
    const [categoryIndex, setCategoryIndex] = useState(() => {
        const i = draft ? PURCHASE_CATEGORY_ORDER.indexOf(draft.category) : 0;
        return i >= 0 ? i : 0;
    });
    const [rows, setRows] = useState<ItemRow[]>(() => {
        const seed = draft?.items ?? [];
        if (seed.length === 0) {
            return [newRow()];
        }
        return seed.map(it => ({
            key: `row-${rowSeq++}`,
            itemName: it.itemName,
            quantity: String(it.quantity ?? ''),
            unit: it.unit ?? '',
            unitPrice: String(it.unitPrice ?? ''),
        }));
    });

    const loadExisting = async (id: number) => {
        try {
            setLoading(true);
            setLoadError(null);
            const data = await purchaseService.get(storeId, id);
            setVendorName(data.vendorName);
            setPurchaseDate(data.purchaseDate);
            setMemo(data.memo ?? '');
            const ci = PURCHASE_CATEGORY_ORDER.indexOf(data.category);
            setCategoryIndex(ci >= 0 ? ci : 0);
            setRows(
                data.items.length > 0
                    ? data.items.map(it => ({
                          key: `row-${rowSeq++}`,
                          itemName: it.itemName,
                          quantity: String(it.quantity ?? ''),
                          unit: it.unit ?? '',
                          unitPrice: String(it.unitPrice ?? ''),
                      }))
                    : [newRow()],
            );
        } catch (err) {
            setLoadError(err instanceof Error ? err.message : '매입 정보를 불러오지 못했어요.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isEdit && typeof purchaseId === 'number') {
            loadExisting(purchaseId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [purchaseId]);

    const total = useMemo(
        () => rows.reduce((sum, r) => sum + toNumber(r.quantity) * toNumber(r.unitPrice), 0),
        [rows],
    );

    const updateRow = (key: string, patch: Partial<ItemRow>) =>
        setRows(prev => prev.map(r => (r.key === key ? {...r, ...patch} : r)));

    const addRow = () => setRows(prev => [...prev, newRow()]);

    const removeRow = (key: string) =>
        setRows(prev => (prev.length <= 1 ? prev : prev.filter(r => r.key !== key)));

    const save = async () => {
        const trimmedVendor = vendorName.trim();
        if (!trimmedVendor) {
            AppToast.warn('거래처를 입력해 주세요.');
            return;
        }
        const validItems = rows
            .filter(r => r.itemName.trim().length > 0)
            .map(r => ({
                itemName: r.itemName.trim(),
                quantity: toNumber(r.quantity),
                unit: r.unit.trim() || undefined,
                unitPrice: toNumber(r.unitPrice),
            }));
        if (validItems.length === 0) {
            AppToast.warn('품목을 1개 이상 입력해 주세요.');
            return;
        }

        const body: PurchaseSaveRequest = {
            vendorName: trimmedVendor,
            purchaseDate,
            category: PURCHASE_CATEGORY_ORDER[categoryIndex],
            memo: memo.trim() || undefined,
            imageRef: undefined,
            items: validItems,
        };

        setSaving(true);
        try {
            if (isEdit && typeof purchaseId === 'number') {
                await purchaseService.update(storeId, purchaseId, body);
            } else {
                await purchaseService.create(storeId, body);
            }
            setSaved(true);
        } catch {
            AppToast.error('매입을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <ScreenContainer>
                <LoadingState title="매입 정보 로딩 중" description="잠시만 기다려 주세요" />
            </ScreenContainer>
        );
    }

    if (loadError) {
        return (
            <ScreenContainer>
                <ErrorState
                    title="불러오지 못했어요"
                    description={loadError}
                    primary={{
                        label: '다시 시도',
                        onPress: () => typeof purchaseId === 'number' && loadExisting(purchaseId),
                    }}
                    secondary={{label: '돌아가기', onPress: () => navigation.goBack()}}
                />
            </ScreenContainer>
        );
    }

    if (saved) {
        return (
            <ScreenContainer>
                <SuccessState
                    title={isEdit ? '매입을 수정했어요' : '매입을 저장했어요'}
                    description="매입장부에서 언제든 다시 볼 수 있어요."
                    primary={{label: '확인', onPress: () => navigation.goBack()}}
                />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer
            scroll
            footer={
                <CtaStack>
                    <AppButton
                        label="매입 저장"
                        loading={saving}
                        loadingLabel="저장 중..."
                        onPress={save}
                    />
                </CtaStack>
            }>
            <AppInput
                label="거래처"
                placeholder="예: OO청과"
                value={vendorName}
                onChangeText={setVendorName}
            />
            <View style={styles.gap} />
            <AppInput
                label="매입일자"
                placeholder="YYYY-MM-DD"
                value={purchaseDate}
                onChangeText={setPurchaseDate}
                keyboardType="numbers-and-punctuation"
                helper="예: 2026-06-16"
            />

            <AppText variant="titleMd" tone="secondary" style={styles.sectionLabel}>
                분류
            </AppText>
            <SegmentedControl
                options={PURCHASE_CATEGORY_ORDER.slice(0, 4).map(k => PURCHASE_CATEGORY_LABELS[k])}
                value={categoryIndex < 4 ? categoryIndex : 0}
                onChange={setCategoryIndex}
            />
            <View style={styles.chipRow}>
                {PURCHASE_CATEGORY_ORDER.slice(4).map((k, i) => {
                    const idx = i + 4;
                    const on = categoryIndex === idx;
                    return (
                        <Pressable
                            key={k}
                            onPress={() => setCategoryIndex(idx)}
                            accessibilityRole="button"
                            accessibilityState={{selected: on}}
                            style={[
                                styles.chip,
                                {borderColor: on ? c.brandPrimary : c.border, backgroundColor: on ? c.brandPrimarySoft : c.background},
                            ]}>
                            <AppText
                                variant="caption"
                                weight="700"
                                tone={on ? 'brand' : 'secondary'}>
                                {PURCHASE_CATEGORY_LABELS[k]}
                            </AppText>
                        </Pressable>
                    );
                })}
            </View>

            <AppText variant="titleMd" tone="secondary" style={styles.sectionLabel}>
                품목
            </AppText>
            <View style={styles.itemList}>
                {rows.map((row, idx) => {
                    const rowAmount = toNumber(row.quantity) * toNumber(row.unitPrice);
                    return (
                        <AppCard key={row.key} variant="flat">
                            <View style={styles.itemHeader}>
                                <AppText variant="caption" tone="tertiary">
                                    품목 {idx + 1}
                                </AppText>
                                <Pressable
                                    onPress={() => removeRow(row.key)}
                                    hitSlop={8}
                                    disabled={rows.length <= 1}
                                    accessibilityRole="button"
                                    accessibilityLabel={`품목 ${idx + 1} 삭제`}>
                                    <Ionicons
                                        name="trash-outline"
                                        size={18}
                                        color={rows.length <= 1 ? c.textDisabled : c.textTertiary}
                                    />
                                </Pressable>
                            </View>
                            <AppInput
                                placeholder="품목명 (예: 양파)"
                                value={row.itemName}
                                onChangeText={t => updateRow(row.key, {itemName: t})}
                            />
                            <View style={styles.rowInputs}>
                                <AppInput
                                    containerStyle={styles.qtyInput}
                                    placeholder="수량"
                                    value={row.quantity}
                                    keyboardType="numeric"
                                    onChangeText={t => updateRow(row.key, {quantity: t})}
                                />
                                <AppInput
                                    containerStyle={styles.unitInput}
                                    placeholder="단위(kg)"
                                    value={row.unit}
                                    onChangeText={t => updateRow(row.key, {unit: t})}
                                />
                                <AppInput
                                    containerStyle={styles.priceInput}
                                    placeholder="단가"
                                    value={row.unitPrice}
                                    keyboardType="numeric"
                                    onChangeText={t => updateRow(row.key, {unitPrice: t})}
                                />
                            </View>
                            <AppText
                                variant="caption"
                                tone="secondary"
                                numberOfLines={1}
                                style={styles.rowAmount}>
                                합계 {rowAmount.toLocaleString()}원
                            </AppText>
                        </AppCard>
                    );
                })}
            </View>
            <AppButton
                label="품목 추가"
                variant="outline"
                size="md"
                onPress={addRow}
                leftIcon={<Ionicons name="add-outline" size={18} color={c.brandPrimary} />}
            />

            <AppText variant="titleMd" tone="secondary" style={styles.sectionLabel}>
                메모 (선택)
            </AppText>
            <AppInput
                placeholder="결제 방식·비고 등"
                value={memo}
                onChangeText={setMemo}
                multiline
            />

            <View style={[styles.totalBox, {borderTopColor: c.divider}]}>
                <AppText variant="bodyMd" tone="secondary">
                    합계
                </AppText>
                <AmountText size={28} tone="primary">
                    {`${total.toLocaleString()}원`}
                </AmountText>
            </View>
            <AppText variant="caption" tone="tertiary" style={styles.disclaimer}>
                인식값을 확인한 뒤 저장해 주세요.
            </AppText>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    gap: {height: spacing.md},
    sectionLabel: {marginTop: spacing.xxl, marginBottom: spacing.md},
    chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm},
    chip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
    },
    itemList: {gap: spacing.sm, marginBottom: spacing.md},
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    rowInputs: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm},
    qtyInput: {flex: 1},
    unitInput: {flex: 1.2},
    priceInput: {flex: 1.4},
    rowAmount: {marginTop: spacing.sm, textAlign: 'right'},
    totalBox: {
        marginTop: spacing.xxl,
        paddingTop: spacing.lg,
        borderTopWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    disclaimer: {marginTop: spacing.sm},
});
