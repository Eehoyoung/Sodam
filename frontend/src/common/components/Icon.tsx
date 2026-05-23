import React from 'react';
import {StyleProp, TextStyle} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

type FontAwesomeIconProps = {
    name: React.ComponentProps<typeof FontAwesome>['name'];
    size?: number;
    color?: string;
    style?: StyleProp<TextStyle>;
    type: 'fontawesome';
};

type FontAwesome5IconProps = {
    name: React.ComponentProps<typeof FontAwesome5>['name'];
    size?: number;
    color?: string;
    style?: StyleProp<TextStyle>;
    type?: 'fontawesome5';
};

type IconProps = FontAwesomeIconProps | FontAwesome5IconProps;

export const Icon: React.FC<IconProps> = ({
                                              name,
                                              size = 24,
                                              color = '#000',
                                              style,
                                              type = 'fontawesome5',
                                          }) => {
    if (type === 'fontawesome') {
        return <FontAwesome name={name} size={size} color={color} style={style}/>;
    }

    return <FontAwesome5 name={name} size={size} color={color} style={style}/>;
};
