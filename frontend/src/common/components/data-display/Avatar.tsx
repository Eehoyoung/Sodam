import React, {useState} from 'react';
import {Image, ImageSourcePropType, ImageStyle, StyleSheet, Text, View, ViewStyle,} from 'react-native';

interface AvatarProps {
    source?: ImageSourcePropType;
    size?: number | 'small' | 'medium' | 'large';
    shape?: 'circle' | 'square';
    name?: string;
    backgroundColor?: string;
    style?: ViewStyle;
    imageStyle?: ImageStyle;
    onError?: () => void;
}

const Avatar: React.FC<AvatarProps> = ({
                                           source,
                                           size = 'medium',
                                           shape = 'circle',
                                           name,
                                           backgroundColor = '#3498db',
                                           style,
                                           imageStyle,
                                           onError,
                                       }) => {
    const [imageError, setImageError] = useState(false);

    const getSize = (): number => {
        if (typeof size === 'number') {
            return size;
        }

        switch (size) {
            case 'small':
                return 32;
            case 'medium':
                return 48;
            case 'large':
                return 64;
            default:
                return 48;
        }
    };

    const avatarSize = getSize();
    const borderRadius = shape === 'circle' ? avatarSize / 2 : avatarSize / 8;

    const getInitials = (): string => {
        if (!name) return '';

        const nameParts = name.trim().split(' ');
        if (nameParts.length === 1) {
            return nameParts[0].charAt(0).toUpperCase();
        }

        return (
            nameParts[0].charAt(0).toUpperCase() +
            nameParts[nameParts.length - 1].charAt(0).toUpperCase()
        );
    };

    const handleImageError = () => {
        setImageError(true);
        if (onError) {
            onError();
        }
    };

    const containerStyle: ViewStyle = {
        width: avatarSize,
        height: avatarSize,
        borderRadius,
        backgroundColor,
        ...style,
    };

    const imgStyle: ImageStyle = {
        width: avatarSize,
        height: avatarSize,
        borderRadius,
        ...imageStyle,
    };

    return (
        <View style={[styles.container, containerStyle]}>
            {source && !imageError ? (
                <Image
                    source={source}
                    style={imgStyle}
                    onError={handleImageError}
                    accessibilityRole="image"
                    accessibilityLabel={name || 'User avatar'}
                />
            ) : name ? (
                <Text
                    style={[
                        styles.initialsText,
                        {fontSize: avatarSize * 0.4},
                    ]}
                    accessibilityRole="text">
                    {getInitials()}
                </Text>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    initialsText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default Avatar;
