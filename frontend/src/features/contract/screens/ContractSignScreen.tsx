import React, {useEffect, useState} from 'react';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AppHeader, ErrorState, LoadingState, ScreenContainer} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import contractService from '../services/contractService';

/**
 * 이전 앱 링크와 내비게이션 호환용 화면이다. 서명 데이터를 직접 받지 않고 계약에 연결된
 * 공통 전자서명 봉투를 조회해 ElectronicSign 화면으로 넘긴다.
 */
const ContractSignScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'ContractSign'>>();
    const [error, setError] = useState(false);

    useEffect(() => {
        let active = true;
        contractService.getMyContracts()
            .then(contracts => {
                if (!active) {
                    return;
                }
                const contract = contracts.find(item => item.id === route.params.contractId);
                if (!contract?.electronicSignatureEnvelopeId) {
                    setError(true);
                    return;
                }
                navigation.replace('ElectronicSign', {
                    envelopeId: contract.electronicSignatureEnvelopeId,
                });
            })
            .catch(() => active && setError(true));
        return () => {
            active = false;
        };
    }, [navigation, route.params.contractId]);

    return (
        <ScreenContainer header={<AppHeader title="전자서명" onBack={() => navigation.goBack()} />}>
            {error ? (
                <ErrorState
                    title="서명 요청을 찾지 못했어요"
                    description="계약서의 전자서명 요청 상태를 다시 확인해 주세요."
                    primary={{label: '돌아가기', onPress: () => navigation.goBack()}}
                />
            ) : (
                <LoadingState title="전자서명으로 이동 중" description="안전한 서명 요청을 확인하고 있어요." />
            )}
        </ScreenContainer>
    );
};

export default ContractSignScreen;
