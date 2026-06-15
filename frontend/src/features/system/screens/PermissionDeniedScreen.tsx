import React from 'react';
import {Linking} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {PermissionState, ScreenContainer} from '../../../common/components/ds';
import {useThemeColors} from '../../../common/hooks/useThemeColors';

type PermissionKind = 'location' | 'nfc' | 'camera';

interface Props {
    kind?: PermissionKind;
    /** 보조 행동 (예: 사장님께 수동 요청 / 코드 직접 입력) */
    onSecondary?: () => void;
    secondaryLabel?: string;
}

const COPY: Record<PermissionKind, {title: string; desc: string; icon: string}> = {
    location: {
        title: '위치 권한이 꺼져 있어요',
        desc: '출근 위치를 확인하려면 휴대폰 설정에서 위치 권한을 켜주세요. 켜기 어려우시면 사장님께 수동 출근을 요청할 수 있어요.',
        icon: 'location-outline',
    },
    nfc: {
        title: 'NFC가 꺼져 있어요',
        desc: '매장 태그로 출근하려면 설정에서 NFC를 켜주세요. 대신 GPS 출근도 사용할 수 있어요.',
        icon: 'radio-outline',
    },
    camera: {
        title: '카메라 권한이 꺼져 있어요',
        desc: '초대 QR을 읽으려면 설정에서 카메라 권한을 켜주세요. 대신 코드를 직접 입력할 수 있어요.',
        icon: 'camera-outline',
    },
};

/**
 * A3 권한 영구거부 → OS 설정 이동 분기 (갭분석 P0).
 * "다시 묻지 않음"으로 막힌 상태에서 앱 내 재요청이 안 되므로 설정으로 보낸다.
 * v3 토스식: 큰 Ionicons 일러스트 + 친근한 한 줄 + 단일 CTA.
 */
const PermissionDeniedScreen: React.FC<Props> = ({kind = 'location', onSecondary, secondaryLabel}) => {
    const copy = COPY[kind];
    const c = useThemeColors();
    return (
        <ScreenContainer>
            <PermissionState
                glyph={<Ionicons name={copy.icon} size={40} color={c.textInverse} />}
                title={copy.title}
                description={copy.desc}
                primary={{label: '설정 열기', onPress: () => Linking.openSettings()}}
                secondary={onSecondary ? {label: secondaryLabel ?? '사장님께 수동 요청', onPress: onSecondary} : undefined}
            />
        </ScreenContainer>
    );
};

export default PermissionDeniedScreen;
