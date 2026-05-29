/**
 * AppToast — 모듈 레벨 호출 가능한 전역 브랜드 토스트.
 *
 * 왜: Alert.alert 의 OS 회색 박스는 브랜드 임팩트를 망친다. 핵심 순간(출근 성공·정정
 * 보냄·저장 완료 등)을 폴리시드 토스트로 받게 한다. (08-micro-design-final-spec §9)
 *
 * 사용:
 *   AppToast.success('출근 처리됐어요');
 *   AppToast.error('네트워크가 불안정해요');
 *   AppToast.warn('지금 오프라인이에요');
 *   AppToast.show('초대 코드를 복사했어요');
 *
 * App.tsx 루트에 `<AppToastHost />` 1회 마운트(이미 처리됨).
 * 큐 1건 단순 노출 — 다중 큐는 P2 로 별도.
 */
import React, {useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppText} from './AppText';
import {radius, shadow, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../hooks/useThemeColors';

type Tone = 'default' | 'success' | 'error' | 'warning';
interface ToastMsg {id: number; text: string; tone: Tone}

let listeners: Array<(t: ToastMsg) => void> = [];
let counter = 0;

const emit = (m: ToastMsg) => listeners.forEach(l => l(m));

export const AppToast = {
    show(text: string, tone: Tone = 'default') { emit({id: ++counter, text, tone}); },
    success(text: string) { this.show(text, 'success'); },
    error(text: string) { this.show(text, 'error'); },
    warn(text: string) { this.show(text, 'warning'); },
};

export const AppToastHost: React.FC = () => {
    const insets = useSafeAreaInsets();
    const c = useThemeColors();
    const [current, setCurrent] = useState<ToastMsg | null>(null);
    const opacity = useRef(new Animated.Value(0)).current;
    const translate = useRef(new Animated.Value(20)).current;

    // 토스트 배경은 현재 테마 팔레트의 같은 의미 색을 사용.
    const toneBg: Record<Tone, string> = {
        default: c.brandSecondary,
        success: c.success,
        error: c.error,
        warning: c.warning,
    };

    useEffect(() => {
        const handler = (m: ToastMsg) => {
            setCurrent(m);
            opacity.setValue(0);
            translate.setValue(20);
            Animated.parallel([
                Animated.timing(opacity, {toValue: 1, duration: 200, useNativeDriver: true}),
                Animated.spring(translate, {toValue: 0, friction: 8, tension: 60, useNativeDriver: true}),
            ]).start();
            const hide = setTimeout(() => {
                Animated.timing(opacity, {toValue: 0, duration: 200, useNativeDriver: true}).start(() => setCurrent(null));
            }, 2200);
            return () => clearTimeout(hide);
        };
        listeners.push(handler);
        return () => {
            listeners = listeners.filter(l => l !== handler);
        };
    }, [opacity, translate]);

    if (!current) {
        return null;
    }

    return (
        <View pointerEvents="none" style={[styles.host, {bottom: insets.bottom + 84}]}>
            <Animated.View
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
                style={[
                    styles.toast,
                    {backgroundColor: toneBg[current.tone]},
                    {opacity, transform: [{translateY: translate}]},
                ]}>
                <AppText variant="bodyMd" tone="inverse" weight="800" numberOfLines={2}>
                    {current.text}
                </AppText>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    host: {
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        alignItems: 'center',
    },
    toast: {
        minHeight: 48,
        maxWidth: '100%',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.xl,
        ...shadow.lg,
    },
});

export default AppToast;
