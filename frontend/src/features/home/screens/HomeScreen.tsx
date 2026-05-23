import React from 'react';
import {FlatList, SafeAreaView, StatusBar, StyleSheet, Text, View} from 'react-native';

const MOCK_ITEMS = Array.from({length: 20}).map((_, i) => ({id: String(i + 1), name: `항목 ${i + 1}`}));

const HomeScreen: React.FC = () => {
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content"/>
            <View style={styles.header}>
                <Text style={styles.title}>홈 (모의 데이터)</Text>
            </View>
            <FlatList
                data={MOCK_ITEMS}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({item}) => (
                    <View style={styles.card}>
                        <Text style={styles.cardText}>{item.name}</Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: '#FFFFFF'},
    header: {padding: 16, borderBottomColor: '#E5E7EB', borderBottomWidth: StyleSheet.hairlineWidth},
    title: {fontSize: 20, fontWeight: '700'},
    listContent: {padding: 16},
    card: {backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8, marginBottom: 8},
    cardText: {color: '#111'},
});

export default HomeScreen;
