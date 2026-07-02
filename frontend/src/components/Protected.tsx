import React, {useEffect} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../contexts/AuthContext';
import {RootNavigationProp} from '../navigation/types';
import {resolvePostAuthRoute, resetToRootRoute} from '../navigation/authFlow';

interface Props {
    children: React.ReactNode;
}

const Protected: React.FC<Props> = ({children}) => {
    const {user, loading} = useAuth();
    const navigation = useNavigation<RootNavigationProp>();

    useEffect(() => {
        if (loading) {
            return;
        }
        if (!user) {
            navigation.reset({
                index: 0,
                routes: [{name: 'Auth' as never, params: {screen: 'Login'} as never}] as any,
            });
            return;
        }
        if (user.consentCompleted === false || user.profileCompleted === false) {
            resetToRootRoute(navigation, resolvePostAuthRoute(user));
        }
    }, [loading, user, navigation]);

    if (loading) {
        return (
            <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <ActivityIndicator />
            </View>
        );
    }

    if (!user || user.consentCompleted === false || user.profileCompleted === false) {
        return null;
    }

    return <>{children}</>;
};

export default Protected;
