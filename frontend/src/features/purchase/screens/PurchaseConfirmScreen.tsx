/**
 * B3 PurchaseConfirmScreen — v3 시안(sodam-v3-10-business.html) 1:1.
 *
 * 거래처·일자 필드 + 분류 단일 chip-row(7종, segmented 미사용) + 품목 리스트(품목·수량·단위·단가,
 * 행 추가/삭제, 단가×수량 자동합계) + 합계 행(코랄 강조) + 하단 풀폭 CTA(매입 저장).
 * OCR 초안/수기 입력 보정 → 매입 저장(create) 또는 기존 수정(update). params: draft(신규) 또는 purchaseId(수정).
 */
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Image, Pressable, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {RouteProp, NavigationProp} from '@react-navigation/native';
import {
    AmountText,
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    AppToast,
    ConfirmSheet,
    CtaStack,
    ErrorState,
    FilterChipRow,
    LoadingState,
    ScreenContainer,
    SuccessState,
} from '../../../common/components/ds';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {DATE_DIGITS_HELPER, compactDateFromApi, dateDigitsToIso, isValidDateDigits, sanitizeDateDigits} from '../../../common/utils/dateTimeInput';
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
    return `${now.getFullYear()}${mm}${dd}`;
};

export default function PurchaseConfirmScreen({route, navigation}: Props) {
    const {storeId, draft, purchaseId} = route.params;
    const c = useThemeColors();
    const isEdit = typeof purchaseId === 'number';

    const [loading, setLoading] = useState(isEdit);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleted, setDeleted] = useState(false);

    const [vendorName, setVendorName] = useState(draft?.vendorName ?? '');
    const [imageRef, setImageRef] = useState<string | undefined>(draft?.imageRef);
    const [imageSource, setImageSource] = useState<{uri: string; headers: Record<string, string>} | null>(null);
    const [purchaseDate, setPurchaseDateValue] = useState(compactDateFromApi(draft?.purchaseDate) || todayString());
    const setPurchaseDate = (value: string) => setPurchaseDateValue(sanitizeDateDigits(value));
    const [memo, setMemo] = useState('');
    const [categoryIndex, setCategoryIndex] = useState(() => {
        const i = draft ? PURCHASE_CATEGORY_ORDER.indexOf(draft.category) : 0;
        return i >= 0 ? i : 0;
    });
    const [suggestRowKey, setSuggestRowKeyState] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const activeRowKeyRef = useRef<string | null>(null);

    const setSuggestRowKey = (key: string | null) => {
        activeRowKeyRef.current = key;
        setSuggestRowKeyState(key);
    };

    useEffect(() => {
        return () => {
            if (suggestTimer.current) {clearTimeout(suggestTimer.current);}
            if (blurTimer.current) {clearTimeout(blurTimer.current);}
        };
    }, []);

    /** 응답 도착 시점에 다른 행으로 포커스가 옮겨가 있으면(activeRowKeyRef 불일치) 화면을 덮어쓰지 않는다. */
    const fetchSuggestions = (rowKey: string, query: string) => {
        if (suggestTimer.current) {clearTimeout(suggestTimer.current);}
        suggestTimer.current = setTimeout(() => {
            purchaseService
                .itemSuggestions(storeId, query)
                .then(list => {
                    if (activeRowKeyRef.current === rowKey) {setSuggestions(list);}
                })
                .catch(() => {
                    if (activeRowKeyRef.current === rowKey) {setSuggestions([]);}
                });
        }, 200);
    };

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
            setImageRef(data.imageRef);
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

    useEffect(() => {
        let cancelled = false;
        if (!imageRef) {
            setImageSource(null);
            return undefined;
        }
        purchaseService.receiptImageSource(storeId, imageRef).then(src => {
            if (!cancelled) {
                setImageSource(src);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [storeId, imageRef]);

    const total = useMemo(
        () => rows.reduce((sum, r) => sum + toNumber(r.quantity) * toNumber(r.unitPrice), 0),
        [rows],
    );

    // 영수증에 인쇄된 합계(OCR 인식)와 품목 합계가 다르면 안내만 한다 — 저장값을 덮어쓰지 않음(WP-03).
    // ⚠️ undefined/null을 모두 걸러야 한다 — OCR 미설정(Noop, 기본값)일 때 BE가 recognizedTotal:null을
    // 내려주는데 `!== undefined`만 쓰면 null을 "인식된 값"으로 오판해 모든 영수증 촬영 저장마다
    // "영수증 인식 합계(undefined원)와 달라요" 오경고가 떴다(정적테스트 발견, eqeqeq 규칙상 `!= null` 대신
    // 명시적으로 둘 다 비교).
    const recognizedMismatch =
        draft?.recognizedTotal !== undefined && draft.recognizedTotal !== null && draft.recognizedTotal !== total;

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

        if (!isValidDateDigits(purchaseDate)) {
            AppToast.warn(DATE_DIGITS_HELPER);
            return;
        }

        const body: PurchaseSaveRequest = {
            vendorName: trimmedVendor,
            purchaseDate: dateDigitsToIso(purchaseDate),
            category: PURCHASE_CATEGORY_ORDER[categoryIndex],
            memo: memo.trim() || undefined,
            imageRef,
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

    // BE는 DELETE /api/stores/{storeId}/purchases/{purchaseId}(204)를 완비하고 있었지만 어느 화면에도
    // 진입점이 없어 사장님이 잘못 입력한 매입을 지울 방법이 없었다(정적테스트 발견) — 수정 화면(edit
    // 모드) 헤더에 삭제 액션을 추가한다.
    const requestDelete = () => {
        if (!isEdit || typeof purchaseId !== 'number') {
            return;
        }
        ConfirmSheet.confirm({
            title: '이 매입을 삭제할까요?',
            description: '삭제하면 되돌릴 수 없어요.',
            primary: {
                label: '삭제',
                destructive: true,
                onPress: async () => {
                    setDeleting(true);
                    try {
                        await purchaseService.remove(storeId, purchaseId);
                        setDeleted(true);
                    } catch {
                        AppToast.error('매입을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
                    } finally {
                        setDeleting(false);
                    }
                },
            },
            secondary: {label: '취소'},
        });
    };

    const header = (
        <AppHeader
            title="확인하고 저장"
            onBack={() => navigation.goBack()}
            actions={
                isEdit
                    ? [
                          {
                              icon: <Ionicons name="trash-outline" size={20} color={c.error} />,
                              accessibilityLabel: '매입 삭제',
                              onPress: requestDelete,
                          },
                      ]
                    : []
            }
        />
    );

    if (loading) {
        return (
            <ScreenContainer header={header}>
                <LoadingState title="매입 정보 로딩 중" description="잠시만 기다려 주세요" />
            </ScreenContainer>
        );
    }

    if (loadError) {
        return (
            <ScreenContainer header={header}>
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

    if (deleting) {
        return (
            <ScreenContainer header={<AppHeader title="확인하고 저장" onBack={() => navigation.goBack()} />}>
                <LoadingState title="매입 삭제 중" description="잠시만 기다려 주세요" />
            </ScreenContainer>
        );
    }

    if (deleted) {
        return (
            <ScreenContainer header={<AppHeader title="확인하고 저장" onBack={() => navigation.goBack()} />}>
                <SuccessState
                    title="매입을 삭제했어요"
                    description="매입장부 목록에서 사라졌어요."
                    primary={{label: '확인', onPress: () => navigation.goBack()}}
                />
            </ScreenContainer>
        );
    }

    if (saved) {
        return (
            <ScreenContainer header={header}>
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
            header={header}
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
                placeholder="20260629"
                value={purchaseDate}
                onChangeText={setPurchaseDate}
                keyboardType="number-pad"
                maxLength={8}
                helper={DATE_DIGITS_HELPER}
            />

            {imageRef ? (
                <View style={styles.receiptPreview}>
                    <AppText variant="titleMd" tone="secondary" style={styles.sectionLabel}>
                        영수증 원본
                    </AppText>
                    <View style={[styles.receiptThumbWrap, {borderColor: c.border}]}>
                        {imageSource ? (
                            <Image
                                source={imageSource}
                                style={styles.receiptThumb}
                                resizeMode="cover"
                                accessibilityLabel="첨부된 영수증 원본"
                            />
                        ) : null}
                        <Pressable
                            onPress={() => setImageRef(undefined)}
                            hitSlop={8}
                            style={[styles.receiptRemove, {backgroundColor: c.background, borderColor: c.border}]}
                            accessibilityRole="button"
                            accessibilityLabel="영수증 원본 제거">
                            <Ionicons name="close" size={16} color={c.textSecondary} />
                        </Pressable>
                    </View>
                </View>
            ) : null}

            <AppText variant="titleMd" tone="secondary" style={styles.sectionLabel}>
                분류
            </AppText>
            <FilterChipRow
                options={PURCHASE_CATEGORY_ORDER.map(k => PURCHASE_CATEGORY_LABELS[k])}
                value={categoryIndex}
                onChange={setCategoryIndex}
                style={styles.chipRow}
            />

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
                                onChangeText={t => {
                                    updateRow(row.key, {itemName: t});
                                    fetchSuggestions(row.key, t);
                                }}
                                onFocus={() => {
                                    if (blurTimer.current) {clearTimeout(blurTimer.current);}
                                    setSuggestRowKey(row.key);
                                    fetchSuggestions(row.key, row.itemName);
                                }}
                                onBlur={() => {
                                    // 제안 칩 탭이 blur보다 늦게 처리되므로 살짝 지연 후 닫는다.
                                    blurTimer.current = setTimeout(() => setSuggestRowKey(null), 150);
                                }}
                            />
                            {suggestRowKey === row.key && suggestions.length > 0 ? (
                                <View style={styles.suggestRow}>
                                    {suggestions.map(s => (
                                        <Pressable
                                            key={s}
                                            onPress={() => {
                                                updateRow(row.key, {itemName: s});
                                                setSuggestRowKey(null);
                                            }}
                                            style={[styles.suggestChip, {borderColor: c.border, backgroundColor: c.surfaceMuted}]}>
                                            <AppText variant="caption" tone="secondary">
                                                {s}
                                            </AppText>
                                        </Pressable>
                                    ))}
                                </View>
                            ) : null}
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
            {recognizedMismatch ? (
                <AppText variant="caption" tone="warning" style={styles.disclaimer}>
                    영수증 인식 합계({draft?.recognizedTotal?.toLocaleString()}원)와 달라요. 품목을 확인해 주세요.
                </AppText>
            ) : null}
            <AppText variant="caption" tone="tertiary" style={styles.disclaimer}>
                인식값을 확인한 뒤 저장해 주세요.
            </AppText>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    gap: {height: spacing.md},
    sectionLabel: {marginTop: spacing.xxl, marginBottom: spacing.md},
    chipRow: {marginTop: spacing.sm},
    receiptPreview: {marginTop: 0},
    receiptThumbWrap: {
        width: 96,
        height: 96,
        borderRadius: radius.lg,
        borderWidth: 1,
        overflow: 'hidden',
    },
    receiptThumb: {width: '100%', height: '100%'},
    receiptRemove: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemList: {gap: spacing.sm, marginBottom: spacing.md},
    suggestRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs},
    suggestChip: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radius.pill,
        borderWidth: 1,
    },
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
