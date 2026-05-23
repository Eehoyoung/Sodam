import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Button, Input} from '../../../common/components';
import {Workplace} from '../types';

type WorkplaceFormProps = {
    initialValues?: Partial<Workplace>;
    onSubmit: (workplace: Omit<Workplace, 'id'>) => void;
    isSubmitting?: boolean;
};

export const WorkplaceForm: React.FC<WorkplaceFormProps> = ({
                                                                initialValues = {},
                                                                onSubmit,
                                                                isSubmitting = false,
                                                            }) => {
    const [name, setName] = useState(initialValues.name || '');
    const [address, setAddress] = useState(initialValues.address || '');

    const handleSubmit = () => {
        onSubmit({
            name,
            address,
        });
    };

    return (
        <View style={styles.container}>
            <Input
                label="직장명"
                value={name}
                onChangeText={setName}
                placeholder="직장명을 입력하세요"
                containerStyle={styles.inputContainer}
            />
            <Input
                label="주소"
                value={address}
                onChangeText={setAddress}
                placeholder="주소를 입력하세요"
                containerStyle={styles.inputContainer}
            />
            <Button
                title={initialValues.id ? "수정하기" : "등록하기"}
                onPress={handleSubmit}
                disabled={!name || !address || isSubmitting}
                loading={isSubmitting}
                style={styles.button}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    inputContainer: {
        marginBottom: 16,
    },
    button: {
        marginTop: 8,
    },
});
