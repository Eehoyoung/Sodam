import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

const HybridMainScreen: React.FC = () => {
    console.log('[WSOD_FIX] 🎉 HybridMainScreen 단순화 버전 렌더링 시작!');

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Hello World!</Text>
            <Text style={styles.subtitle}>WSOD 해결 테스트 중...</Text>
            <Text style={styles.body}>
                이 화면이 보이면 기본 UI 렌더링이 성공한 것입니다.
            </Text>
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
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#000000',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 16,
        color: '#666666',
        textAlign: 'center',
    },
    body: {
        fontSize: 14,
        textAlign: 'center',
        color: '#333333',
        lineHeight: 20,
    },
});

export default HybridMainScreen;
