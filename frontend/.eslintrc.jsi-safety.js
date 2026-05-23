/**
 * ESLint Rules for JSI Safety in React Native Reanimated 3
 * Prevents JSI assertion failures by detecting unsafe patterns in worklets
 */

module.exports = {
    rules: {
        // Prevent Dimensions.get() calls inside worklets
        "no-restricted-syntax": [
            "error",
            {
                "selector": "CallExpression[callee.object.name='Dimensions'][callee.property.name='get']",
                "message": "🚨 JSI VIOLATION: Dimensions.get() should not be called inside worklets. Use useMemo to cache the value outside the worklet context."
            },
            {
                "selector": "CallExpression[callee.name='useAnimatedStyle'] CallExpression[callee.object.name='Dimensions'][callee.property.name='get']",
                "message": "🚨 JSI VIOLATION: Dimensions.get() detected inside useAnimatedStyle worklet. Cache the value with useMemo outside the worklet."
            },
            {
                "selector": "CallExpression[callee.name='useAnimatedScrollHandler'] CallExpression[callee.object.name='Dimensions'][callee.property.name='get']",
                "message": "🚨 JSI VIOLATION: Dimensions.get() detected inside useAnimatedScrollHandler worklet. Cache the value with useMemo outside the worklet."
            },
            // Prevent Date.now() calls inside worklets
            {
                "selector": "CallExpression[callee.object.name='Date'][callee.property.name='now']",
                "message": "🚨 JSI VIOLATION: Date.now() should not be called inside worklets. Use runOnJS() wrapper or cache the value with useSharedValue."
            },
            // Prevent Math.random() calls inside worklets
            {
                "selector": "CallExpression[callee.object.name='Math'][callee.property.name='random']",
                "message": "🚨 JSI VIOLATION: Math.random() should not be called inside worklets. Use runOnJS() wrapper or cache the value with useSharedValue."
            },
            // Prevent console.log calls inside worklets
            {
                "selector": "CallExpression[callee.object.name='console']",
                "message": "🚨 JSI VIOLATION: console methods should not be called inside worklets. Use runOnJS() wrapper for debugging."
            },
            // Prevent direct JavaScript API calls in worklets
            {
                "selector": "CallExpression[callee.name='useAnimatedStyle'] CallExpression[callee.name='setTimeout']",
                "message": "🚨 JSI VIOLATION: setTimeout should not be called inside worklets. Use runOnJS() wrapper."
            },
            {
                "selector": "CallExpression[callee.name='useAnimatedStyle'] CallExpression[callee.name='setInterval']",
                "message": "🚨 JSI VIOLATION: setInterval should not be called inside worklets. Use runOnJS() wrapper."
            }
        ],

        // Custom rule to detect potential JSI violations in worklet contexts
        "no-restricted-globals": [
            "error",
            {
                "name": "window",
                "message": "🚨 JSI VIOLATION: 'window' global should not be accessed inside worklets. Use runOnJS() wrapper."
            },
            {
                "name": "document",
                "message": "🚨 JSI VIOLATION: 'document' global should not be accessed inside worklets. Use runOnJS() wrapper."
            }
        ]
    },

    // Custom JSI safety plugin configuration
    plugins: ["@typescript-eslint"],

    // Override for specific worklet-related files
    overrides: [
        {
            files: ["**/*Animation*.tsx", "**/*Animated*.tsx", "**/*Worklet*.tsx"],
            rules: {
                "no-restricted-syntax": [
                    "error",
                    {
                        "selector": "CallExpression[callee.object.name='Dimensions'][callee.property.name='get']",
                        "message": "🚨 CRITICAL JSI VIOLATION: This file contains animations. Dimensions.get() must be cached with useMemo outside worklets to prevent JSI assertion failures."
                    }
                ]
            }
        }
    ],

    // Environment configuration for React Native
    env: {
        "react-native/react-native": true
    },

    // Parser options for TypeScript
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
        ecmaFeatures: {
            jsx: true
        }
    }
};
