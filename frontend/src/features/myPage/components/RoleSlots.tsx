import React from 'react';
import { View, ViewProps } from 'react-native';

export interface SlotProps extends ViewProps {
  children?: React.ReactNode;
}

export const HeroSlot: React.FC<SlotProps> = ({ children, ...rest }) => {
  return <View {...rest}>{children}</View>;
};

export const SummarySlot: React.FC<SlotProps> = ({ children, ...rest }) => {
  return <View {...rest}>{children}</View>;
};

export const ActionsSlot: React.FC<SlotProps> = ({ children, ...rest }) => {
  return <View {...rest}>{children}</View>;
};

export const InfoSlot: React.FC<SlotProps> = ({ children, ...rest }) => {
  return <View {...rest}>{children}</View>;
};

export default {
  HeroSlot,
  SummarySlot,
  ActionsSlot,
  InfoSlot,
};
