import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

Dimensions.get('window');

interface UsageSelectionScreenProps {
    navigation: any;
}

const UsageSelectionScreen: React.FC<UsageSelectionScreenProps> = ({ navigation }) => {
    const handleSelection = () => {
        navigation.navigate('WelcomeMain');
    };


    return (
        <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

    <LinearGradient
        colors={['#43e97b', '#38f9d7']}
    style={styles.gradient}
        >
        {/* 헤더 */}
        <View style={styles.header}>
    <Text style={styles.title}>어떻게 사용하고 싶으세요?</Text>
        <Text style={styles.subtitle}>용도에 맞는 방식을 선택해주세요</Text>
    </View>

    {/* 선택 옵션들 */}
    <View style={styles.optionsContainer}>
        {/* 개인 근태 기록 */}
        <TouchableOpacity
    style={styles.optionCard}
    onPress={handleSelection}
    activeOpacity={0.8}
    >
    <Text style={styles.optionIcon}>🏠</Text>
    <Text style={styles.optionTitle}>개인 근태 기록</Text>
    <Text style={styles.optionDescription}>
        혼자서 간편하게 출퇴근{'\n'}시간을 기록하고 싶어요
    </Text>
    <Text style={styles.optionBadge}>✓ 무료로 시작</Text>
    </TouchableOpacity>

    {/* 매장 사장으로 시작 */}
    <TouchableOpacity
        style={styles.optionCard}
        onPress={handleSelection}
        activeOpacity={0.8}
    >
    <Text style={styles.optionIcon}>🏢</Text>
    <Text style={styles.optionTitle}>매장 사장으로 시작</Text>
    <Text style={styles.optionDescription}>
        우리 매장 직원들의{'\n'}근태를 관리하고 싶어요
    </Text>
    <Text style={[styles.optionBadge, { color: '#3b82f6' }]}>✓ 매장 등록 필요</Text>
    </TouchableOpacity>

    {/* 직원으로 참여 */}
    <TouchableOpacity
        style={styles.optionCard}
        onPress={handleSelection}
        activeOpacity={0.8}
    >
    <Text style={styles.optionIcon}>👥</Text>
    <Text style={styles.optionTitle}>직원으로 참여</Text>
    <Text style={styles.optionDescription}>
        이미 등록된 매장에서{'\n'}일하고 있어요
    </Text>
    <Text style={[styles.optionBadge, { color: '#f59e0b' }]}>✓ 매장 코드 필요</Text>
    </TouchableOpacity>
    </View>

    {/* 하단 안내 텍스트 */}
    <View style={styles.footer}>
    <Text style={styles.footerText}>
            💡 언제든지 설정에서 사용 방식을 변경할 수 있어요
    </Text>
    </View>
    </LinearGradient>
    </SafeAreaView>
);
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
        paddingHorizontal: 20,
    },
    header: {
        alignItems: 'center',
        marginTop: 60,
        marginBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
    },
    optionsContainer: {
        flex: 1,
        justifyContent: 'center',
        gap: 20,
    },
    optionCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        transform: [{ scale: 1 }],
    },
    optionIcon: {
        fontSize: 50,
        marginBottom: 15,
    },
    optionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
        textAlign: 'center',
    },
    optionDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 12,
    },
    optionBadge: {
        fontSize: 12,
        color: '#10b981',
        fontWeight: 'bold',
    },
    footer: {
        alignItems: 'center',
        paddingBottom: 40,
        paddingTop: 20,
    },
    footerText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
    },
});

export default UsageSelectionScreen
