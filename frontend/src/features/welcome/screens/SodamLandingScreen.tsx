import React, {useEffect, useRef} from 'react';
import {
    Animated,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NavigationProp} from '@react-navigation/native';
import {AppButton} from '../../../common/components/ds';
import SodamLogo from '../../../common/components/logo/SodamLogo';
import {COLORS} from '../../../common/components/logo/Colors';
import {spacing} from '../../../theme/tokens';
import {RootStackParamList} from '../../../navigation/types';

interface Props {
    navigation: NavigationProp<RootStackParamList>;
}

export default function SodamLandingScreen({navigation}: Props) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(24)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {toValue: 1, duration: 700, useNativeDriver: true}),
            Animated.timing(slideAnim, {toValue: 0, duration: 700, useNativeDriver: true}),
        ]).start();
    }, [fadeAnim, slideAnim]);

    return (
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.WHITE} />
            <Animated.View
                style={[
                    styles.content,
                    {opacity: fadeAnim, transform: [{translateY: slideAnim}]},
                ]}>
                <View style={styles.logoZone}>
                    <SodamLogo size={160} variant="default" />
                    <Text style={styles.brandName}>소담</Text>
                    <Text style={styles.tagline}>사장님의 가게 관리 파트너</Text>
                </View>

                <View style={styles.buttons}>
                    <AppButton
                        label="소담 처음 시작해요"
                        onPress={() => navigation.navigate('Welcome')}
                    />
                    <AppButton
                        label="이미 계정이 있어요"
                        variant="secondary"
                        onPress={() => navigation.navigate('Auth', {screen: 'Login'})}
                    />
                </View>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: COLORS.WHITE,
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xxl,
        paddingBottom: spacing.xl,
        paddingTop: spacing.xxl,
    },
    logoZone: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    brandName: {
        fontSize: 34,
        fontWeight: '800',
        color: COLORS.SODAM_BLUE,
    },
    tagline: {
        fontSize: 14,
        color: COLORS.GRAY_500,
    },
    buttons: {
        gap: spacing.sm,
    },
});
