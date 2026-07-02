import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AppHeader, AppListItem, AppText, ScreenContainer} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';

/**
 * HomeScreen — v3 토스식 라우팅 랜딩.
 * 큰 인사 타이포 + 역할별 큰 리스트(Ionicons). 동작/네비게이션 보존.
 */
const HomeScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const c = useThemeColors();
    return (
        <ScreenContainer scroll header={<AppHeader title="오늘의 소담" actions={[{label: '알림', icon: <Ionicons name="notifications-outline" size={20} color={c.brandPrimary} />, accessibilityLabel: '알림', onPress: () => navigation.navigate('NotificationCenter')}]} />}>
            <View style={styles.intro}>
                <AppText variant="headingLg">어디로 갈까요?</AppText>
                <AppText variant="bodyLg" tone="secondary" style={styles.sub}>
                    역할에 맞는 홈으로 바로 안내해 드릴게요.
                </AppText>
            </View>

            <View style={styles.list}>
                <AppListItem
                    title="사장 홈"
                    subtitle="매장 운영 현황 보기"
                    left={<Ionicons name="storefront-outline" size={24} color={c.brandPrimary} />}
                    right="›"
                    onPress={() => navigation.navigate('OwnerDashboard')}
                />
                <AppListItem
                    title="직원 홈"
                    subtitle="출근·퇴근 바로가기"
                    left={<Ionicons name="time-outline" size={24} color={c.brandPrimary} />}
                    right="›"
                    onPress={() => navigation.navigate('EmployeeAttendanceHome')}
                />
                <AppListItem
                    title="개인 기록장"
                    subtitle="내 근무 시간 직접 기록"
                    left={<Ionicons name="create-outline" size={24} color={c.brandPrimary} />}
                    right="›"
                    onPress={() => navigation.navigate('Attendance')}
                />
            </View>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    intro: {marginBottom: spacing.xxl},
    sub: {marginTop: spacing.sm},
    list: {gap: spacing.sm},
});

export default HomeScreen;
