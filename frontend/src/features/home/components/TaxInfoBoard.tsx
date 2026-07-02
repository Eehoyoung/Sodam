/* eslint-disable react-native/no-unused-styles -- styles built via makeStyles(theme) factory; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
import React, {useMemo} from 'react';
import {FlatList, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {ThemeColors, useThemeColors} from '../../../common/hooks/useThemeColors';

// 세무 정보 데이터 타입 정의
interface TaxInfo {
    id: number;
    title: string;
    date: string;
}

const TaxInfoBoard: React.FC<{ navigation?: any }> = ({navigation}) => {
    const c = useThemeColors();
    const styles = useMemo(() => makeStyles(c), [c]);

    // 예시 세무 정보 데이터
    const taxInfos: TaxInfo[] = [
        {id: 1, title: '2024년 세금신고 주요 변경사항 총정리', date: '2024-05-14'},
        {id: 2, title: '소상공인을 위한 부가가치세 절세 전략', date: '2024-05-10'},
        {id: 3, title: '개인사업자 종합소득세 신고 가이드', date: '2024-05-07'},
        {id: 4, title: '사업장 임대료 세금 공제 방법 안내', date: '2024-05-04'},
        {id: 5, title: '직원 급여 관련 세무 처리 주의사항', date: '2024-05-01'},
    ];

    const renderItem = ({item}: { item: TaxInfo }) => (
        <TouchableOpacity
            style={styles.taxItem}
            onPress={() => navigation?.navigate('TaxInfoDetail', {taxInfoId: item.id})}
        >
            <Text style={styles.taxTitle}>{item.title}</Text>
            <Text style={styles.taxDate}>{item.date}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>주요 세무 정보</Text>
                <TouchableOpacity style={styles.moreButton} onPress={() => navigation?.navigate('InfoList')}>
                    <Text style={styles.moreButtonText}>더보기</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={taxInfos}
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
        backgroundColor: c.surface,
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
        backgroundColor: c.warning,
        paddingVertical: 6,
        paddingHorizontal: 15,
        borderRadius: 20,
    },
    moreButtonText: {
        color: c.textPrimary,
        fontSize: 14,
        fontWeight: '500',
    },
    taxItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: c.divider,
    },
    taxTitle: {
        fontSize: 16,
        color: c.textPrimary,
        flex: 1,
    },
    taxDate: {
        fontSize: 14,
        color: c.textTertiary,
        marginLeft: 10,
    },
});

export default TaxInfoBoard;
