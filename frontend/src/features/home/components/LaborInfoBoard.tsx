/* eslint-disable react-native/no-unused-styles -- styles built via makeStyles(theme) factory; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
import React, {useMemo} from 'react';
import {FlatList, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {ThemeColors, useThemeColors} from '../../../common/hooks/useThemeColors';

// 노무 데이터 타입 정의
interface LaborInfo {
    id: number;
    title: string;
    date: string;
}

const LaborInfoBoard: React.FC<{ navigation?: any }> = ({navigation}) => {
    const c = useThemeColors();
    const styles = useMemo(() => makeStyles(c), [c]);

    // 예시 노무 정보 데이터
    const laborInfos: LaborInfo[] = [
        {id: 1, title: '2024년 최저임금 변경에 따른 급여 계산 방법', date: '2024-05-15'},
        {id: 2, title: '소규모 사업장 근로계약서 작성 가이드', date: '2024-05-12'},
        {id: 3, title: '아르바이트생 고용 시 주의사항과 의무사항', date: '2024-05-09'},
        {id: 4, title: '근로시간 단축에 따른 소상공인 대응 방안', date: '2024-05-06'},
        {id: 5, title: '4대보험 신고 및 납부 절차 안내', date: '2024-05-03'},
    ];

    const renderItem = ({item}: { item: LaborInfo }) => (
        <TouchableOpacity
            style={styles.laborItem}
            onPress={() => handleLaborItemPress(item)}
            accessibilityLabel={`노무 정보: ${item.title}, 날짜: ${item.date}`}
        >
            <Text style={styles.laborTitle}>{item.title}</Text>
            <Text style={styles.laborDate}>{item.date}</Text>
        </TouchableOpacity>
    );

    const handleLaborItemPress = (item: LaborInfo) => {
        // 상세 정보 페이지로 이동
        navigation.navigate('LaborInfoDetail', {laborInfoId: item.id});
    };

    const handleViewMorePress = () => {
        navigation.navigate('InfoList');
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>주요 노무 정보</Text>
                <TouchableOpacity
                    style={styles.moreButton}
                    onPress={handleViewMorePress}
                    accessibilityLabel="더 많은 노무 정보 보기"
                >
                    <Text style={styles.moreButtonText}>더보기</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={laborInfos}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                scrollEnabled={false}
            />
        </View>
    );
};

const makeStyles = (c: ThemeColors) => StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: c.surfaceSky,
        padding: 30,
        marginVertical: 10,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: c.textPrimary,
    },
    moreButton: {
        backgroundColor: c.brandPrimary,
        paddingVertical: 6,
        paddingHorizontal: 15,
        borderRadius: 20,
    },
    moreButtonText: {
        color: c.textInverse,
        fontSize: 14,
        fontWeight: '500',
    },
    laborItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: c.divider,
    },
    laborTitle: {
        fontSize: 16,
        color: c.textPrimary,
        flex: 1,
    },
    laborDate: {
        fontSize: 14,
        color: c.textTertiary,
        marginLeft: 10,
    },
});

export default LaborInfoBoard;
