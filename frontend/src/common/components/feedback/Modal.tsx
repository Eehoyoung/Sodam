import React, {useEffect} from 'react';
import {
    Dimensions,
    Modal as RNModal,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    ViewStyle,
} from 'react-native';
import {ENABLE_ANIMATIONS, stageAtLeast, ANIMATION_RECOVERY_STAGE} from '../../../navigation/config';

// Conditionally import Reanimated components only when needed
let Animated: any;
let useAnimatedStyle: any;
let useSharedValue: any;
let withTiming: any;

try {
  if (ENABLE_ANIMATIONS && stageAtLeast(ANIMATION_RECOVERY_STAGE)) {
    const reanimated = require('react-native-reanimated');
    Animated = reanimated.default;
    useAnimatedStyle = reanimated.useAnimatedStyle;
    useSharedValue = reanimated.useSharedValue;
    withTiming = reanimated.withTiming;
  }
} catch (error) {
  console.warn('[RECOVERY] Modal: Reanimated import failed, using fallback', error);
}

// 모달 컴포넌트의 Props 타입 정의
interface ModalProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    animationType?: 'none' | 'slide' | 'fade';
    closeOnBackdropPress?: boolean;
    backdropOpacity?: number;
    style?: ViewStyle;
    titleStyle?: TextStyle;
    contentStyle?: ViewStyle;
    footerStyle?: ViewStyle;
    width?: number | "auto" | `${number}%`;
    height?: number | "auto" | `${number}%`;
}

/**
 * 재사용 가능한 모달 컴포넌트
 *
 * 제목, 내용, 푸터를 포함할 수 있는 모달 컴포넌트입니다.
 * 다양한 애니메이션 타입과 배경 터치 닫기 기능을 지원합니다.
 */
const Modal: React.FC<ModalProps> = ({
                                         visible,
                                         onClose,
                                         title,
                                         children,
                                         footer,
                                         animationType = 'fade',
                                         closeOnBackdropPress = true,
                                         backdropOpacity = 0.5,
                                         style,
                                         titleStyle,
                                         contentStyle,
                                         footerStyle,
                                         width = `80%`,
                                         height,
                                     }) => {
    const shouldUseAnimations = ENABLE_ANIMATIONS && stageAtLeast(ANIMATION_RECOVERY_STAGE);

    // Only use animated values when animations are enabled
    const fadeAnim = shouldUseAnimations && useSharedValue ? useSharedValue(0) : null;

    // Conditionally create animated styles only when animations are enabled
    const animatedStyle = shouldUseAnimations && useAnimatedStyle && fadeAnim ? useAnimatedStyle(() => ({
        opacity: fadeAnim.value,
    })) : null;

    // 모달 표시 상태가 변경될 때 애니메이션 실행
    useEffect(() => {
        if (shouldUseAnimations && fadeAnim && withTiming) {
            fadeAnim.value = withTiming(visible ? 1 : 0, {duration: 200});
        }
    }, [visible, fadeAnim, shouldUseAnimations]);

    // 배경 터치 핸들러
    const handleBackdropPress = () => {
        if (closeOnBackdropPress) {
            onClose();
        }
    };

    // 모달 내부 터치 시 이벤트 전파 중지
    const handleModalPress = (e: any) => {
        e.stopPropagation();
    };

    return (
        <RNModal
            transparent
            visible={visible}
            animationType="none" // Use 'none' to avoid conflicts with custom Reanimated animation
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={handleBackdropPress}>
                <View
                    style={[
                        styles.backdrop,
                        {backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})`},
                    ]}
                >
                    <TouchableWithoutFeedback onPress={handleModalPress}>
                        <Animated.View
                            style={[
                                styles.modalContainer,
                                {
                                    width: typeof width === 'string' && !width.endsWith('%') && width !== 'auto' ? undefined : width,
                                    height: typeof height === 'string' && !height.endsWith('%') && height !== 'auto' ? undefined : height,
                                },
                                animatedStyle,
                                style,
                            ]}
                        >
                            {/* 모달 헤더 */}
                            {title && (
                                <View style={styles.header}>
                                    <Text style={[styles.title, titleStyle]}>{title}</Text>
                                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                        <Text style={styles.closeButtonText}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* 모달 내용 */}
                            <View style={[styles.content, contentStyle]}>{children}</View>

                            {/* 모달 푸터 */}
                            {footer && <View style={[styles.footer, footerStyle]}>{footer}</View>}
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </RNModal>
    );
};

const {width: screenWidth} = Dimensions.get('window');

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        maxWidth: screenWidth - 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
        flex: 1,
    },
    closeButton: {
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 18,
        color: '#8E8E93',
    },
    content: {
        padding: 16,
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#F2F2F7',
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
});

export default Modal;
