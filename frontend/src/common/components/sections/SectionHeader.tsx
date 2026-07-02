import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { COLORS } from '../logo/Colors';

interface SectionHeaderProps {
  title: string;
  onPressAction?: () => void;
  actionLabel?: string;
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;
  actionStyle?: TextStyle;
  testID?: string;
  accessibilityLabel?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  onPressAction,
  actionLabel,
  containerStyle,
  titleStyle,
  actionStyle,
  testID,
  accessibilityLabel,
}) => {
  return (
    <View style={[styles.container, containerStyle]} testID={testID} accessibilityRole="header" accessibilityLabel={accessibilityLabel ?? `${title} 섹션 헤더`}>
      <Text style={[styles.title, titleStyle]}>{title}</Text>
      {actionLabel && onPressAction ? (
        <TouchableOpacity
          onPress={onPressAction}
          accessibilityRole="button"
          accessibilityLabel={`${title} 섹션 ${actionLabel}`}
        >
          <Text style={[styles.action, actionStyle]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.GRAY_800,
  },
  action: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.SODAM_BLUE,
  },
});

export default SectionHeader;
