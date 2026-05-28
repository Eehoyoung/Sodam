/**
 * ConfirmSheet — 모듈 레벨 호출 가능한 전역 확인 시트.
 *
 * 왜: 콜백 있는 Alert.alert(파괴/중요 액션 확인)도 OS 회색 박스 대신 브랜드 BottomSheet 로
 * 받아야 일관성 완성. 핵심 임프레션(탈퇴/승인/취소/발급 등) 마지막 1cm 까지 브랜드 정합.
 *
 * 사용 (한 줄):
 *   ConfirmSheet.confirm({
 *       title: '로그아웃할까요?',
 *       description: '다시 로그인하면 모든 기록을 이어서 볼 수 있어요.',
 *       primary: {label: '로그아웃', onPress: doLogout},
 *       secondary: {label: '취소'},
 *   });
 *
 *   ConfirmSheet.confirm({
 *       title: '정말 탈퇴하시겠어요?',
 *       description: '이 작업은 되돌릴 수 없어요.',
 *       primary: {label: '탈퇴하기', destructive: true, onPress: doDelete},
 *       secondary: {label: '취소'},
 *   });
 *
 * App.tsx 루트에 `<ConfirmSheetHost />` 1회 마운트(이미 처리됨).
 */
import React, {useEffect, useState} from 'react';
import {BottomSheet} from './BottomSheet';

export interface ConfirmAction {
    label: string;
    /** true 시 파괴적 스타일(빨강 텍스트, destructive variant). */
    destructive?: boolean;
    onPress?: () => void;
}

export interface ConfirmOpts {
    title: string;
    description?: string;
    primary: ConfirmAction;
    secondary?: ConfirmAction;
    /** 닫기 동작(취소) 시 호출. secondary.onPress 와 별개로 dismiss 후크. */
    onDismiss?: () => void;
}

let listeners: Array<(opts: ConfirmOpts | null) => void> = [];

const emit = (opts: ConfirmOpts | null) => listeners.forEach(l => l(opts));

export const ConfirmSheet = {
    confirm(opts: ConfirmOpts) { emit(opts); },
    dismiss() { emit(null); },
};

export const ConfirmSheetHost: React.FC = () => {
    const [current, setCurrent] = useState<ConfirmOpts | null>(null);

    useEffect(() => {
        const handler = (opts: ConfirmOpts | null) => setCurrent(opts);
        listeners.push(handler);
        return () => {
            listeners = listeners.filter(l => l !== handler);
        };
    }, []);

    if (!current) {
        return null;
    }

    const close = () => {
        const dismiss = current.onDismiss;
        setCurrent(null);
        dismiss?.();
    };

    return (
        <BottomSheet
            visible
            onClose={close}
            title={current.title}
            description={current.description}
            primary={{
                label: current.primary.label,
                variant: current.primary.destructive ? 'destructive' : 'primary',
                onPress: () => {
                    const fn = current.primary.onPress;
                    setCurrent(null);
                    fn?.();
                },
            }}
            secondary={
                current.secondary
                    ? {
                          label: current.secondary.label,
                          variant: 'ghost',
                          onPress: () => {
                              const fn = current.secondary?.onPress;
                              setCurrent(null);
                              fn?.();
                          },
                      }
                    : {label: '취소', variant: 'ghost', onPress: close}
            }
        />
    );
};

export default ConfirmSheet;
