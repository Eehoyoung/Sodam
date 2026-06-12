import React from 'react';
import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { colors, darkColors } from '../theme/tokens';
import SodamHeaderTitle from '../common/components/navigation/SodamHeaderTitle';

type ThemeColors = typeof colors;

/**
 * 네이티브 스택 헤더 옵션 — DS v2 AppHeader 와 동일하게 테마 surface 배경 + primary 텍스트.
 *
 * 기존에는 헤더 배경을 브랜드 컬러(SODAM_BLUE)로 칠해 화면 전환마다 톤이 무너졌다.
 * 확정 디자인은 "흰/네이비 surface + 본문 텍스트 + 하단 divider" 의 차분한 헤더다.
 * 다크모드 대응을 위해 테마 색을 받는 팩토리를 제공하고, 정적 기본값은 라이트 토큰을 사용한다.
 */
export const makeAppHeaderOptions = (c: ThemeColors | typeof darkColors): NativeStackNavigationOptions => ({
  headerShown: true,
  headerStyle: {
    backgroundColor: c.background,
  },
  headerShadowVisible: false,
  headerTintColor: c.textPrimary,
  headerTitleAlign: 'center',
  headerBackTitleVisible: false,
  headerTitle: ({ children }: { children?: React.ReactNode }) => (
    <SodamHeaderTitle title={typeof children === 'string' ? children : (children ? String(children) : '')} />
  ),
});

/** 정적 기본값 (라이트 테마). 테마 반영이 필요한 화면은 makeAppHeaderOptions(useThemeColors()) 사용. */
export const appHeaderOptions: NativeStackNavigationOptions = makeAppHeaderOptions(colors);

export const darkAppHeaderOptions: NativeStackNavigationOptions = makeAppHeaderOptions(darkColors);

export default appHeaderOptions;
