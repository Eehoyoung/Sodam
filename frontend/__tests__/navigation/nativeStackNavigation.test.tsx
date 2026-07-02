/**
 * Native Stack Navigation Tests
 * Verifies Native Stack Navigator functionality after RNGH migration
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Mock components for testing
const TestScreen1 = () => <></>;
const TestScreen2 = () => <></>;

const Stack = createNativeStackNavigator();

const TestNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator>
      <Stack.Screen name="Screen1" component={TestScreen1} />
      <Stack.Screen name="Screen2" component={TestScreen2} />
    </Stack.Navigator>
  </NavigationContainer>
);

describe('Native Stack Navigation', () => {
  beforeEach(() => {
    console.log('[DEBUG_LOG] Starting Native Stack Navigation test');
  });

  test('creates Native Stack Navigator without errors', () => {
    console.log('[DEBUG_LOG] Testing Native Stack Navigator creation');

    const component = render(<TestNavigator />);
    expect(component).toBeTruthy();

    console.log('[DEBUG_LOG] Native Stack Navigator created successfully');
  });

  test('Native Stack Navigator is properly imported', () => {
    console.log('[DEBUG_LOG] Testing createNativeStackNavigator import');

    expect(typeof createNativeStackNavigator).toBe('function');

    console.log('[DEBUG_LOG] createNativeStackNavigator import verified');
  });

  test('Stack screens can be configured', () => {
    console.log('[DEBUG_LOG] Testing Stack screen configuration');

    const stack = createNativeStackNavigator();
    expect(stack.Screen).toBeDefined();
    expect(stack.Navigator).toBeDefined();

    console.log('[DEBUG_LOG] Stack screen configuration verified');
  });
});
