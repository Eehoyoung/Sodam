import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// dev-only placeholder — 라우터 미연결. 디자인 v2 마이그레이션 시 제거 또는 정상 진입점으로 교체.
const HybridMainScreen: React.FC = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Hybrid Main (dev placeholder)</Text>
            <Text style={styles.body}>이 화면은 라우터에 연결되어 있지 않아요.</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
        color: '#111111',
        textAlign: 'center',
    },
    body: {
        fontSize: 14,
        color: '#555555',
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default HybridMainScreen;
