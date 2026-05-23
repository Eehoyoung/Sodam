import React from 'react';
import {FlatList, Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

// 꿀팁 데이터 타입 정의
interface Tip {
    id: number;
    title: string;
    summary: string;
    // image: ImageSourcePropType;
    date: string;
}

const TipsBoard: React.FC<{ navigation?: any }> = ({navigation}) => {
    // 예시 꿀팁 데이터
    const tips: Tip[] = [
        {
            id: 1,
            title: '점포 위치 선정 시 체크해야 할 10가지 포인트',
            summary: '상권 분석부터 유동인구까지 성공적인 입지 선정 가이드',
            // image: require('../assets/tip1.jpg'),
            date: '2024-05-15'
        },
        {
            id: 2,
            title: '저비용으로 가게 인테리어 개선하는 방법',
            summary: '예산이 적어도 가능한 인테리어 팁과 자재 구매 전략',
            // image: require('../assets/tip2.jpg'),
            date: '2024-05-10'
        },
        {
            id: 3,
            title: '소셜미디어로 가게 홍보하는 노하우',
            summary: '인스타그램, 네이버 플레이스 활용 전략 총정리',
            // image: require('../assets/tip3.jpg'),
            date: '2024-05-05'
        },
    ];

    const renderItem = ({item}: { item: Tip }) => (
        <TouchableOpacity
            style={styles.tipItem}
            onPress={() => navigation?.navigate('TipsDetail', {tipId: item.id})}
        >
            {/*<Image source={item.image} style={styles.tipImage}/>*/}
            <Image style={styles.tipImage}/>
            <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>{item.title}</Text>
                <Text style={styles.tipSummary}>{item.summary}</Text>
                <Text style={styles.tipDate}>{item.date}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>소상공인 꿀팁</Text>
                <TouchableOpacity style={styles.moreButton}>
                    <Text style={styles.moreButtonText}>더보기</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={tips}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#fff',
        padding: 30,
        marginVertical: 10,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    moreButton: {
        backgroundColor: '#f1c40f',
        paddingVertical: 6,
        paddingHorizontal: 15,
        borderRadius: 20,
    },
    moreButtonText: {
        color: '#333',
        fontSize: 14,
        fontWeight: '500',
    },
    tipItem: {
        width: 300,
        marginRight: 20,
        borderRadius: 10,
        backgroundColor: '#f9f9f9',
        overflow: 'hidden',
        elevation: 3,
    },
    tipImage: {
        width: '100%',
        height: 150,
        resizeMode: 'cover',
    },
    tipContent: {
        padding: 15,
    },
    tipTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    tipSummary: {
        fontSize: 14,
        color: '#666',
        marginBottom: 10,
    },
    tipDate: {
        fontSize: 12,
        color: '#888',
    },
});

export default TipsBoard;
