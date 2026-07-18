import React from 'react';
import {Alert, Dimensions, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
// useNavigation 타입을 import 합니다.
import {CompositeNavigationProp, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

// AppNavigator.tsx 또는 타입 정의 파일에서 정의한 RootStackParamList 타입을 import 합니다.
import {RootStackParamList,HomeStackParamList} from '../../../navigation/types';
import {useResponsiveStyles} from "../../../utils/responsive";
import {useAuth} from '../../../contexts/AuthContext';
import SodamLogo from '../logo/SodamLogo';
import {tokens} from '../../../theme/tokens';
// 복합 네비게이션 타입 정의
type HeaderNavigationProp = CompositeNavigationProp<
    NativeStackNavigationProp<RootStackParamList>,
    NativeStackNavigationProp<HomeStackParamList>
>;

interface HeaderProps {
    title?: string;
}

const Header: React.FC<HeaderProps> = ({title}) => {
    const {isSmallScreen} = useResponsiveStyles();
    const screenWidth = Dimensions.get('window').width;

    // AuthContext에서 인증 상태와 로그아웃 함수 가져오기
    const {isAuthenticated, user} = useAuth();

    // useNavigation 훅에 복합 네비게이션 타입을 명시합니다.
    const navigation = useNavigation<HeaderNavigationProp>();

    // 화면 크기에 따라 동적으로 스타일 조정
    const dynamicStyles = {
        header: {
            paddingHorizontal: isSmallScreen ? 15 : 30,
            paddingVertical: isSmallScreen ? 10 : 15,
        },
        logo: {
            fontSize: isSmallScreen ? 22 : 28,
        },
        navButtonText: {
            fontSize: isSmallScreen ? 14 : 16,
        },
        navButton: {
            marginLeft: isSmallScreen ? 10 : 20,
        }
    };

    // AuthContext에서 로그아웃 함수 가져오기
    const {logout} = useAuth();

    // 로그인/로그아웃 처리
    const handleAuthAction = () => {
        if (isAuthenticated) {
            // 로그아웃 처리
            Alert.alert(
                '로그아웃',
                '정말 로그아웃 하시겠습니까?',
                [
                    {
                        text: '취소',
                        style: 'cancel'
                    },
                    {
                        text: '확인',
                        onPress: async () => {
                            try {
                                await logout();
                                Alert.alert('알림', '로그아웃 되었습니다.');
                            } catch (error) {
                                console.error('로그아웃 중 오류가 발생했습니다:', error);
                                Alert.alert('오류', '로그아웃 중 오류가 발생했습니다.');
                            }
                        }
                    }
                ]
            );
        } else {
            // 로그인 화면으로 이동
            navigation.navigate('Auth', {screen: 'Login'});
        }
    };

    // 마이페이지 이동 처리
    const handleMyPageNavigation = () => {
        if (!isAuthenticated) {
            Alert.alert('알림', '로그인이 필요한 서비스입니다.', [
                {
                    text: '확인',
                    onPress: () => navigation.navigate('Auth', {screen: 'Login'})
                }
            ]);
            return;
        }

        // 매니저 여부는 전역 계정 역할이 아니라 매장-직원 위임 관계로 판정한다.
        if (user?.role === 'MASTER') {
            navigation.navigate('MasterMyPageScreen');
        } else if (user?.role === 'USER' || user?.role === 'PERSONAL') {
            navigation.navigate('UserMyPageScreen');
        } else if (user?.role) {
            navigation.navigate('EmployeeMyPageScreen');
        } else {
            // 사용자 정보가 없는 경우 기본 마이페이지로 이동
            navigation.navigate('UserMyPageScreen');
        }
    };

    // 작은 화면에서는 일부 버튼만 표시
    const renderNavButtons = () => {
        if (screenWidth < 400) {
            return (
                <View style={styles.navButtons}>
                    <TouchableOpacity
                        style={[styles.navButton, dynamicStyles.navButton]}
                        onPress={handleAuthAction}
                        accessibilityRole="button"
                        accessibilityLabel={isAuthenticated ? '로그아웃 버튼' : '로그인 버튼'}
                        testID="btnAuth"
                    >
                        <Text style={[styles.navButtonText, dynamicStyles.navButtonText]}>
                            {isAuthenticated ? '로그아웃' : '로그인'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.navButton, dynamicStyles.navButton]}
                        onPress={handleMyPageNavigation}
                        accessibilityRole="button"
                        accessibilityLabel="마이페이지 화면으로 이동"
                        testID="btnMyPage"
                    >
                        <Text style={[styles.navButtonText, dynamicStyles.navButtonText]}>마이페이지</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={styles.navButtons}>
                <TouchableOpacity
                    style={[styles.navButton, dynamicStyles.navButton]}
                    onPress={handleAuthAction}
                    accessibilityRole="button"
                    accessibilityLabel={isAuthenticated ? '로그아웃 버튼' : '로그인 버튼'}
                    testID="btnAuth"
                >
                    <Text style={[styles.navButtonText, dynamicStyles.navButtonText]}>
                        {isAuthenticated ? '로그아웃' : '로그인'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.navButton, dynamicStyles.navButton]}
                    onPress={() => navigation.navigate('QnA')}
                    accessibilityRole="button"
                    accessibilityLabel="Q&A 화면으로 이동"
                    testID="btnQnA"
                >
                    <Text style={[styles.navButtonText, dynamicStyles.navButtonText]}>Q&A</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.navButton, dynamicStyles.navButton]}
                    onPress={() => navigation.navigate('Subscribe')}
                    accessibilityRole="button"
                    accessibilityLabel="구독하기 화면으로 이동"
                    testID="btnSubscribe"
                >
                    <Text style={[styles.navButtonText, dynamicStyles.navButtonText]}>구독하기</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.navButton, dynamicStyles.navButton]}
                    onPress={() => navigation.navigate('Settings')}
                    accessibilityRole="button"
                    accessibilityLabel="설정 화면으로 이동"
                    testID="btnSettings"
                >
                    <Text style={[styles.navButtonText, dynamicStyles.navButtonText]}>설정</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.navButton, dynamicStyles.navButton]}
                    onPress={handleMyPageNavigation}
                    accessibilityRole="button"
                    accessibilityLabel="마이페이지 화면으로 이동"
                    testID="btnMyPage"
                >
                    <Text style={[styles.navButtonText, dynamicStyles.navButtonText]}>마이페이지</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.header, dynamicStyles.header]} accessibilityRole="header" accessibilityLabel="소담 상단바" testID="sodamHeader">
            <View style={styles.leftContainer}>
                <SodamLogo size={isSmallScreen ? 20 : 24} variant="simple" />
                {title && <Text style={styles.title}>{title}</Text>}
            </View>
            {renderNavButtons()}
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: tokens.colors.brandPrimary,
        width: '100%',
        ...tokens.shadow.sm,
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        color: tokens.colors.textInverse,
        fontSize: tokens.typography.sizes.lg,
        fontWeight: tokens.typography.weights.semibold,
        marginLeft: tokens.spacing.md,
        letterSpacing: -0.3,
    },
    navButtons: {
        flexDirection: 'row',
    },
    navButton: {
        paddingVertical: tokens.spacing.xs,
        paddingHorizontal: tokens.spacing.sm,
    },
    navButtonText: {
        color: tokens.colors.textInverse,
        fontWeight: tokens.typography.weights.medium,
        fontSize: tokens.typography.sizes.sm,
    },
});

export default Header;
