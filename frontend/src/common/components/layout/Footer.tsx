import React from 'react';
import {Alert, Dimensions, Linking, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useResponsiveStyles} from '../../../utils/responsive';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import {HomeStackParamList} from '../../../navigation/types';

const Footer = () => {
    const {isSmallScreen, isMediumScreen} = useResponsiveStyles();
    const screenWidth = Dimensions.get('window').width;
    const navigation = useNavigation<NavigationProp<HomeStackParamList>>();

    // 외부 링크 열기
    const openExternalLink = (url: string) => {
        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                Alert.alert('오류', `링크를 열 수 없습니다: ${url}`);
            }
        });
    };

    // 이메일 보내기
    const sendEmail = (email: string) => {
        Linking.openURL(`mailto:${email}`);
    };
    const dynamicStyles = {
        footer: {
            padding: isSmallScreen ? 15 : isMediumScreen ? 20 : 30,
        },
        footerSection: {
            flex: 1,
            flexBasis: isSmallScreen ? '100%' : isMediumScreen ? '48%' : '23%',
            maxWidth: isSmallScreen ? '100%' : isMediumScreen ? '48%' : '23%',
        } as any,
        // 나머지 스타일은 그대로 유지
        footerTitle: {
            fontSize: isSmallScreen ? 20 : 24,
        },

        footerSectionTitle: {
            fontSize: isSmallScreen ? 16 : 18,
        },
        footerText: {
            fontSize: isSmallScreen ? 12 : 14,
        },
        footerLink: {
            fontSize: isSmallScreen ? 12 : 14,
        },
        copyright: {
            fontSize: isSmallScreen ? 12 : 14,
        },
        footerBottomLink: {
            marginLeft: isSmallScreen ? 10 : 20,
            fontSize: isSmallScreen ? 12 : 14,
        },
    };

    // 작은 화면에서는 간소화된 푸터 표시
    if (screenWidth < 400) {
        return (
            <View style={[styles.footer, dynamicStyles.footer]}>
                <View style={styles.footerTop}>
                    <View style={[styles.footerSection, dynamicStyles.footerSection]}>
                        <Text style={[styles.footerTitle, dynamicStyles.footerTitle]}>SOODAM</Text>
                        <Text style={[styles.footerText, dynamicStyles.footerText]}>소상공인의 생산성과 자생력을 높이기 위한 종합 서비스</Text>
                    </View>
                </View>

                <View style={styles.footerBottom}>
                    <Text style={[styles.copyright, dynamicStyles.copyright]}>© 2024 SOODAM Inc. 모든 권리 보유.</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.footer, dynamicStyles.footer]}>
            <View style={styles.footerTop}>
                <View style={[styles.footerSection, dynamicStyles.footerSection]}>
                    <Text style={[styles.footerTitle, dynamicStyles.footerTitle]}>SOODAM</Text>
                    <Text style={[styles.footerText, dynamicStyles.footerText]}>소상공인의 생산성과 자생력을 높이기 위한 종합 서비스</Text>
                </View>

                <View style={[styles.footerSection, dynamicStyles.footerSection]}>
                    <Text style={[styles.footerSectionTitle, dynamicStyles.footerSectionTitle]}>주요 서비스</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('LaborInfoDetail', {laborInfoId: 1})}>
                        <Text style={[styles.footerLink, dynamicStyles.footerLink]}>근태관리</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('TaxInfoDetail', {taxInfoId: 1})}>
                        <Text style={[styles.footerLink, dynamicStyles.footerLink]}>세무관리</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('TipsDetail', {tipId: 1})}>
                        <Text style={[styles.footerLink, dynamicStyles.footerLink]}>마케팅 도구</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('PolicyDetail', {policyId: 1})}>
                        <Text style={[styles.footerLink, dynamicStyles.footerLink]}>상권분석</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.footerSection, dynamicStyles.footerSection]}>
                    <Text style={[styles.footerSectionTitle, dynamicStyles.footerSectionTitle]}>고객지원</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('QnA')}>
                        <Text style={[styles.footerLink, dynamicStyles.footerLink]}>자주 묻는 질문</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => sendEmail('contact@soodam.kr')}>
                        <Text style={[styles.footerLink, dynamicStyles.footerLink]}>문의하기</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('TipsDetail', {tipId: 1})}>
                        <Text style={[styles.footerLink, dynamicStyles.footerLink]}>서비스 가이드</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                        <Text style={[styles.footerLink, dynamicStyles.footerLink]}>공지사항</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.footerSection, dynamicStyles.footerSection]}>
                    <Text style={[styles.footerSectionTitle, dynamicStyles.footerSectionTitle]}>회사정보</Text>
                    <Text style={[styles.footerText, dynamicStyles.footerText]}>사업자등록번호: 123-45-67890</Text>
                    <Text style={[styles.footerText, dynamicStyles.footerText]}>대표: 홍길동</Text>
                    <TouchableOpacity onPress={() => openExternalLink('https://maps.google.com/?q=서울특별시 강남구 테헤란로 123')}>
                        <Text style={[styles.footerText, dynamicStyles.footerText]}>주소: 서울특별시 강남구 테헤란로 123</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => sendEmail('contact@soodam.kr')}>
                        <Text style={[styles.footerText, dynamicStyles.footerText]}>이메일: contact@soodam.kr</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => Linking.openURL('tel:02-1234-5678')}>
                        <Text style={[styles.footerText, dynamicStyles.footerText]}>전화: 02-1234-5678</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.footerBottom}>
                <Text style={[styles.copyright, dynamicStyles.copyright]}>© 2024 SOODAM Inc. 모든 권리 보유.</Text>
                <View style={styles.footerLinks}>
                    <TouchableOpacity onPress={() => openExternalLink('https://sodam.com/terms')}>
                        <Text style={[styles.footerBottomLink, dynamicStyles.footerBottomLink]}>이용약관</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openExternalLink('https://sodam.com/privacy')}>
                        <Text style={[styles.footerBottomLink, dynamicStyles.footerBottomLink]}>개인정보처리방침</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openExternalLink('https://sodam.com/cookies')}>
                        <Text style={[styles.footerBottomLink, dynamicStyles.footerBottomLink]}>쿠키정책</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    footer: {
        width: '100%',
        backgroundColor: '#3498db',
    },
    footerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    },
    footerSection: {
        marginBottom: 20,
    },
    footerTitle: {
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 15,
        letterSpacing: 3,
    },
    footerSectionTitle: {
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 15,
    },
    footerText: {
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 8,
    },
    footerLink: {
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 10,
    },
    footerBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        flexWrap: 'wrap',
    },
    copyright: {
        color: 'rgba(255, 255, 255, 0.8)',
    },
    footerLinks: {
        flexDirection: 'row',
    },
    footerBottomLink: {
        color: 'rgba(255, 255, 255, 0.8)',
    },
});

export default Footer;
