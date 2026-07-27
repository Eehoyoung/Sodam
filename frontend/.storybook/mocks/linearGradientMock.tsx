/**
 * Storybook 전용 LinearGradient 목업.
 *
 * react-native-linear-gradient는 android/ios/windows 네이티브 뷰(requireNativeComponent)만
 * 제공하고 웹 빌드는 아예 지원하지 않는다(.web.js 변형 없음). 실제 그라디언트를 그리진
 * 못하지만, children을 그대로 렌더링해 이 컴포넌트를 쓰는 화면(PaywallHost 등, AuthContext.tsx가
 * 항상 정적 import 하는 컴포넌트)이 최소한 크래시 없이 뜨도록 한다.
 */
import React from 'react';
import {View, ViewProps} from 'react-native';

interface LinearGradientMockProps extends ViewProps {
    colors?: string[];
    children?: React.ReactNode;
}

const LinearGradient: React.FC<LinearGradientMockProps> = ({colors, children, style, ...rest}) => (
    <View style={[style, colors?.[0] ? {backgroundColor: colors[0]} : null]} {...rest}>
        {children}
    </View>
);

export default LinearGradient;
