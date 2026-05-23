import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Workplace} from '../types';

type WorkplaceCardProps = {
    workplace: Workplace;
    onPress: (workplace: Workplace) => void;
};

export const WorkplaceCard: React.FC<WorkplaceCardProps> = ({workplace, onPress}) => {
    return (
        <TouchableOpacity
            style={styles.container}
            onPress={() => onPress(workplace)}
            activeOpacity={0.7}
        >
            <View style={styles.content}>
                <Text style={styles.name}>{workplace.name}</Text>
                <Text style={styles.address}>{workplace.address}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    content: {
        flex: 1,
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    address: {
        fontSize: 14,
        color: '#666',
    },
});
