import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {AppCard, AppHeader, AppListItem, AppText, ScreenContainer} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';

/**
 * 09 HomeScreen Replacement — 확정 시안.
 * 역할에 맞는 홈으로 안내하는 라우팅 랜딩.
 */
const HomeScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    return (
        <ScreenContainer scroll header={<AppHeader title="오늘의 소담" actions={[{label: '알림', onPress: () => navigation.navigate('NotificationCenter')}]} />}>
            <AppCard variant="warm">
                <AppText variant="titleMd">역할에 맞는 홈으로 이동해요</AppText>
                <AppText variant="caption" tone="secondary" style={styles.sub}>
                    사장님은 대시보드, 직원은 출근 버튼, 개인은 기록장으로 바로 진입합니다.
                </AppText>
            </AppCard>

            <View style={styles.list}>
                <AppListItem title="사장 홈" subtitle="매장 운영 현황 보기" right="›" />
                <AppListItem title="직원 홈" subtitle="출근/퇴근 바로가기" right="›" />
                <AppListItem title="개인 기록장" subtitle="내 근무 시간 직접 기록" right="›" />
            </View>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    sub: {marginTop: 4},
    list: {marginTop: spacing.md, gap: spacing.sm},
});

export default HomeScreen;
