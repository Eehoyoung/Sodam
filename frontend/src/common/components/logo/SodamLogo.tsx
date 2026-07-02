import React from 'react';
import { View, ViewStyle } from 'react-native';
import Svg, {
    Circle,
    Path,
    Rect,
    Text,
    Defs,
    LinearGradient,
    Stop,
    Filter,
    FeDropShadow,
} from 'react-native-svg';
import { COLORS } from './Colors';

interface SodamLogoProps {
    size?: number;
    variant?: 'default' | 'white' | 'simple';
    style?: ViewStyle;
}

export default function SodamLogo({
                                      size = 80,
                                      variant = 'default',
                                      style
                                  }: SodamLogoProps) {
    const renderLogo = () => {
        switch (variant) {
            case 'white':
                return (
                    <Svg width={size} height={size} viewBox="0 0 120 120">
                        <Defs>
                            <Filter id="whiteShadow">
                                <FeDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                            </Filter>
                        </Defs>

                        {/* 외곽 부드러운 원들 */}
                        <Circle cx="60" cy="60" r="48" fill={COLORS.WHITE} opacity="0.1"/>
                        <Circle cx="60" cy="60" r="38" fill={COLORS.WHITE} opacity="0.15"/>

                        {/* 메인 하트 모양 컨테이너 */}
                        <Path
                            d="M60 75 C50 65, 35 55, 35 45 C35 35, 45 30, 55 35 C58 32, 62 32, 65 35 C75 30, 85 35, 85 45 C85 55, 70 65, 60 75 Z"
                            fill={COLORS.WHITE}
                            filter="url(#whiteShadow)"
                        />

                        {/* 귀여운 얼굴 */}
                        <Circle cx="52" cy="48" r="3" fill={COLORS.SODAM_ORANGE} opacity="0.8"/>
                        <Circle cx="68" cy="48" r="3" fill={COLORS.SODAM_ORANGE} opacity="0.8"/>
                        <Path
                            d="M55 58 Q60 62 65 58"
                            stroke={COLORS.SODAM_ORANGE}
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                        />

                        {/* 중앙 소담 심볼 */}
                        <Circle cx="60" cy="52" r="8" fill={COLORS.SODAM_ORANGE} opacity="0.1"/>
                        <Text
                            x="60"
                            y="57"
                            textAnchor="middle"
                            fill={COLORS.SODAM_ORANGE}
                            fontSize="10"
                            fontWeight="bold"
                        >
                            소
                        </Text>
                    </Svg>
                );

            case 'simple':
                return (
                    <Svg width={size} height={size} viewBox="0 0 120 120">
                        <Defs>
                            <LinearGradient
                                id="simpleGradient"
                                x1="0%"
                                y1="0%"
                                x2="100%"
                                y2="100%"
                            >
                                <Stop offset="0%" stopColor={COLORS.SODAM_ORANGE} stopOpacity="1"/>
                                <Stop offset="100%" stopColor={COLORS.SODAM_BLUE} stopOpacity="1"/>
                            </LinearGradient>
                        </Defs>

                        {/* 둥근 사각형 컨테이너 */}
                        <Rect
                            x="35"
                            y="35"
                            width="50"
                            height="50"
                            rx="20"
                            ry="20"
                            fill="url(#simpleGradient)"
                        />

                        {/* 중앙 심볼 */}
                        <Circle cx="60" cy="60" r="12" fill={COLORS.WHITE} opacity="0.95"/>
                        <Text
                            x="60"
                            y="66"
                            textAnchor="middle"
                            fill={COLORS.SODAM_ORANGE}
                            fontSize="12"
                            fontWeight="bold"
                        >
                            소
                        </Text>
                    </Svg>
                );

            default:
                return (
                    <Svg width={size} height={size} viewBox="0 0 120 120">
                        <Defs>
                            <LinearGradient
                                id="sodamGradient"
                                x1="0%"
                                y1="0%"
                                x2="100%"
                                y2="100%"
                            >
                                <Stop offset="0%" stopColor={COLORS.SODAM_ORANGE} stopOpacity="1"/>
                                <Stop offset="50%" stopColor="#FF8A65" stopOpacity="1"/>
                                <Stop offset="100%" stopColor={COLORS.SODAM_BLUE} stopOpacity="1"/>
                            </LinearGradient>
                            <Filter id="defaultShadow">
                                <FeDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2"/>
                            </Filter>
                        </Defs>

                        {/* 외곽 부드러운 원들 */}
                        <Circle cx="60" cy="60" r="48" fill="url(#sodamGradient)" opacity="0.08"/>
                        <Circle cx="60" cy="60" r="38" fill="url(#sodamGradient)" opacity="0.12"/>

                        {/* 메인 하트 모양 컨테이너 */}
                        <Path
                            d="M60 75 C50 65, 35 55, 35 45 C35 35, 45 30, 55 35 C58 32, 62 32, 65 35 C75 30, 85 35, 85 45 C85 55, 70 65, 60 75 Z"
                            fill="url(#sodamGradient)"
                            filter="url(#defaultShadow)"
                        />

                        {/* 귀여운 얼굴 */}
                        <Circle cx="52" cy="48" r="3" fill={COLORS.WHITE} opacity="0.9"/>
                        <Circle cx="68" cy="48" r="3" fill={COLORS.WHITE} opacity="0.9"/>
                        <Path
                            d="M55 58 Q60 62 65 58"
                            stroke={COLORS.WHITE}
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                        />

                        {/* 중앙 소담 심볼 */}
                        <Circle cx="60" cy="52" r="8" fill={COLORS.WHITE} opacity="0.95"/>
                        <Text
                            x="60"
                            y="57"
                            textAnchor="middle"
                            fill={COLORS.SODAM_ORANGE}
                            fontSize="10"
                            fontWeight="bold"
                        >
                            소
                        </Text>
                    </Svg>
                );
        }
    };

    return (
        <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
            {renderLogo()}
        </View>
    );
}

/*
// 기본 사용법
<SodamLogo size={80} />

// 화이트 버전 (어두운 배경용)
<SodamLogo size={100} variant="white" />

// 심플 버전 (작은 사이즈용)
<SodamLogo size={40} variant="simple" />

// 커스텀 스타일
<SodamLogo
  size={120}
  variant="default"
  style={{ marginBottom: 20 }}
/>

// 런치 스크린에서 사용
<View style={styles.logoContainer}>
  <SodamLogo size={120} variant="white" />
  <Text style={styles.brandName}>소담</Text>
</View>

// 헤더에서 사용 (작은 사이즈)
<View style={styles.header}>
  <SodamLogo size={32} variant="simple" />
  <Text style={styles.headerTitle}>소담</Text>
</View>
 */
