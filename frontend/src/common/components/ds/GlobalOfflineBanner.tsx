/**
 * GlobalOfflineBanner — useOfflineSync 상태를 OfflineBanner 로 연결한 전역 오버레이.
 * App 루트(네비게이터 위)에 절대배치로 마운트한다. (갭분석 A2)
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useOfflineSync} from '../../hooks/useOfflineSync';
import {OfflineBanner, SyncState} from './OfflineBanner';

export const GlobalOfflineBanner: React.FC = () => {
    const {isOnline, isSyncing, pendingMutations} = useOfflineSync();

    const state: SyncState = !isOnline ? 'offline' : isSyncing && pendingMutations > 0 ? 'syncing' : 'hidden';
    if (state === 'hidden') {
        return null;
    }

    return (
        <View pointerEvents="none" style={styles.overlay}>
            <OfflineBanner state={state} pendingCount={pendingMutations} />
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999, elevation: 9999},
});

export default GlobalOfflineBanner;
