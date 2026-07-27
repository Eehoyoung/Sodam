import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';

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
  const c = useThemeColors();
  return (
    <View style={[styles.container, containerStyle]} testID={testID} accessibilityRole="header" accessibilityLabel={accessibilityLabel ?? `${title} 섹션 헤더`}>
      <Text style={[styles.title, { color: c.textPrimary }, titleStyle]}>{title}</Text>
      {actionLabel && onPressAction ? (
        <TouchableOpacity
          onPress={onPressAction}
          accessibilityRole="button"
          accessibilityLabel={`${title} 섹션 ${actionLabel}`}
        >
          <Text style={[styles.action, { color: c.brandPrimary }, actionStyle]}>{actionLabel}</Text>
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
  },
  action: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SectionHeader;
