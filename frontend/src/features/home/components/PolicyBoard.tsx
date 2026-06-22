/* eslint-disable react-native/no-unused-styles -- styles built via makeStyles(theme) factory; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
import React, {useEffect, useMemo, useState} from 'react';
import {FlatList, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator} from 'react-native';
import homeService from '../services/homeService';
import {Policy} from '../types';
import {ThemeColors, useThemeColors} from '../../../common/hooks/useThemeColors';

const PolicyBoard: React.FC<{ navigation?: any }> = ({navigation}) => {
    const c = useThemeColors();
    const styles = useMemo(() => makeStyles(c), [c]);
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // 정책 데이터 가져오기
    const fetchPolicies = async () => {
        try {
            setLoading(true);
            setError(false);
            const data = await homeService.fetchPolicies();
            if (data && data.length > 0) {
                setPolicies(data);
            } else {
                // 백업 데이터 (API 응답이 비어있는 경우)
                setPolicies([
                    {id: '1', title: '2024년 소상공인 디지털 전환 지원 사업 안내', date: '2024-05-15', category: '지원사업', content: ''},
                    {id: '2', title: '중소벤처기업부 2/4분기 주요 정책 개편 내용', date: '2024-05-12', category: '정책개편', content: ''},
                    {id: '3', title: '소상공인 대출 지원 확대 프로그램 시행 안내', date: '2024-05-08', category: '금융지원', content: ''},
                    {id: '4', title: '전통시장 활성화를 위한 지역화폐 지원 사업', date: '2024-05-05', category: '지원사업', content: ''},
                    {id: '5', title: '코로나19 피해 소상공인 임대료 감면 연장 방안', date: '2024-05-01', category: '지원사업', content: ''},
                ]);
            }
        } catch (err) {
            console.error('정책 데이터를 가져오는 중 오류가 생겼어요:', err);
            setError(true);
            // 백업 데이터 (API 호출 실패 시)
            setPolicies([
                {id: '1', title: '2024년 소상공인 디지털 전환 지원 사업 안내', date: '2024-05-15', category: '지원사업', content: ''},
                {id: '2', title: '중소벤처기업부 2/4분기 주요 정책 개편 내용', date: '2024-05-12', category: '정책개편', content: ''},
                {id: '3', title: '소상공인 대출 지원 확대 프로그램 시행 안내', date: '2024-05-08', category: '금융지원', content: ''},
                {id: '4', title: '전통시장 활성화를 위한 지역화폐 지원 사업', date: '2024-05-05', category: '지원사업', content: ''},
                {id: '5', title: '코로나19 피해 소상공인 임대료 감면 연장 방안', date: '2024-05-01', category: '지원사업', content: ''},
            ]);
        } finally {
            setLoading(false);
        }
    };

    // 컴포넌트 마운트 시 정책 데이터 가져오기
    useEffect(() => {
        fetchPolicies();
    }, []);

    // 더보기 버튼 클릭 처리
    // 'PolicyList' 라우트는 미등록 — 정책/정보 목록이 모여있는 'InfoList' 로 연결
    const handleViewMore = () => {
        navigation?.navigate('InfoList');
    };

    const renderItem = ({item}: { item: Policy }) => (
        <TouchableOpacity
            style={styles.policyItem}
            onPress={() => navigation?.navigate('PolicyDetail', {policyId: item.id})}
        >
            <Text style={styles.policyTitle}>{item.title}</Text>
            <Text style={styles.policyDate}>{item.date}</Text>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <View style={styles.headerRow}>
                    <Text style={styles.sectionTitle}>정부 주요 정책 소개</Text>
                </View>
                <ActivityIndicator size="large" color={c.brandPrimary}/>
                <Text style={styles.loadingText}>정책 정보를 불러오는 중...</Text>
            </View>
        );
    }

    if (error || policies.length === 0) {
        return (
            <View style={[styles.container, styles.errorContainer]}>
                <View style={styles.headerRow}>
                    <Text style={styles.sectionTitle}>정부 주요 정책 소개</Text>
                </View>
                <Text style={styles.errorText}>정책 정보를 불러올 수 없어요.</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchPolicies}>
                    <Text style={styles.retryButtonText}>다시 시도</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>정부 주요 정책 소개</Text>
                <TouchableOpacity style={styles.moreButton} onPress={handleViewMore}>
                    <Text style={styles.moreButtonText}>더보기</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={policies}
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
    policyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: c.divider,
    },
    policyTitle: {
        fontSize: 16,
        color: c.textPrimary,
        flex: 1,
    },
    policyDate: {
        fontSize: 14,
        color: c.textTertiary,
        marginLeft: 10,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: c.textSecondary,
    },
    errorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
    },
    errorText: {
        fontSize: 16,
        color: c.error,
        marginVertical: 10,
    },
    retryButton: {
        backgroundColor: c.brandPrimary,
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 20,
        marginTop: 10,
    },
    retryButtonText: {
        color: c.textInverse,
        fontSize: 14,
        fontWeight: '500',
    },
});

export default PolicyBoard;
