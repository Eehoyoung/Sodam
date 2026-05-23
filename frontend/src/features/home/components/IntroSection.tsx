import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

const IntroSection = () => {
    return (
        <View style={styles.introSection}>
            <Text style={styles.mainTitle}>소상공인을 담다! 소담</Text>
            <Text style={styles.subTitle}>
                소상공인의 생산성과 자생력을 높이기 위해 소상공인이 개발한 소상공인을 위한 서비스
            </Text>
            <TouchableOpacity style={styles.getStartedButton}>
                <Text style={styles.getStartedText}>시작하기</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    introSection: {
        backgroundColor: '#f8f9fa',
        padding: 50,
        alignItems: 'center',
        width: '100%',
    },
    mainTitle: {
        fontSize: 36,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#3498db',
    },
    subTitle: {
        fontSize: 18,
        textAlign: 'center',
        maxWidth: 800,
        lineHeight: 28,
        color: '#555',
        marginBottom: 30,
    },
    getStartedButton: {
        backgroundColor: '#f1c40f',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 25,
        elevation: 3,
    },
    getStartedText: {
        color: '#333',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default IntroSection;
