# React Native Integration Guide

## Overview

This document provides guidelines for integrating React Native mobile applications with the Sodam backend API. The
backend has been configured to support React Native clients, with specific considerations for authentication, API
access, and cross-platform compatibility.

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- React Native CLI or Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

## Setting Up a New React Native Project

### Using React Native CLI

```bash
npx react-native init SodamMobile
cd SodamMobile
```

### Using Expo (Recommended for easier setup)

```bash
npx create-expo-app SodamMobile
cd SodamMobile
```

## Required Dependencies

Install the following dependencies for API communication and state management:

```bash
npm install axios @react-native-async-storage/async-storage
```

Or if using yarn:

```bash
yarn add axios @react-native-async-storage/async-storage
```

## API Configuration

Create an API configuration file to manage backend communication:

```javascript
// src/api/apiConfig.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL configuration
const API_URL = __DEV__
    ? 'http://10.0.2.2:8080' // Android Emulator pointing to localhost
    : 'https://your-production-api-url.com';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token to requests
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        // Handle token expiration or other auth errors
        if (error.response && error.response.status === 401) {
            await AsyncStorage.removeItem('auth_token');
            // Redirect to login or refresh token logic here
        }
        return Promise.reject(error);
    }
);

export default api;
```

## Authentication Implementation

Create an authentication service to handle login and token management:

```javascript
// src/services/authService.js
import api from '../api/apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const login = async (email, password) => {
    try {
        const response = await api.post('/api/login', {email, password});

        // Store the token and user info
        if (response.data.token) {
            await AsyncStorage.setItem('auth_token', response.data.token);
            await AsyncStorage.setItem('user_id', response.data.userId.toString());
            return response.data;
        }

        throw new Error('Authentication failed');
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
};

export const kakaoLogin = async (code) => {
    try {
        const response = await api.get(`/kakao/auth/proc?code=${code}`);

        // Store the token and user info
        if (response.data.token) {
            await AsyncStorage.setItem('auth_token', response.data.token);
            await AsyncStorage.setItem('user_id', response.data.userId.toString());
            return response.data;
        }

        throw new Error('Kakao authentication failed');
    } catch (error) {
        console.error('Kakao login error:', error);
        throw error;
    }
};

export const logout = async () => {
    try {
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user_id');
        // Additional cleanup if needed
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
};

export const isAuthenticated = async () => {
    try {
        const token = await AsyncStorage.getItem('auth_token');
        return !!token;
    } catch (error) {
        return false;
    }
};
```

## Example API Service

Create service files for each API domain:

```javascript
// src/services/tipService.js
import api from '../api/apiConfig';

export const getAllTips = async () => {
    try {
        const response = await api.get('/api/tip-info');
        return response.data;
    } catch (error) {
        console.error('Error fetching tips:', error);
        throw error;
    }
};

export const getTipById = async (id) => {
    try {
        const response = await api.get(`/api/tip-info/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching tip ${id}:`, error);
        throw error;
    }
};

// Add other API methods as needed
```

## Example Login Screen

```javascript
// src/screens/LoginScreen.js
import React, {useState} from 'react';
import {View, TextInput, Button, StyleSheet, Text, Alert} from 'react-native';
import {login} from '../services/authService';

const LoginScreen = ({navigation}) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setLoading(true);
        try {
            const userData = await login(email, password);
            setLoading(false);
            // Navigate to main app
            navigation.replace('Home');
        } catch (error) {
            setLoading(false);
            Alert.alert('Login Failed', error.message || 'Please check your credentials');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>
            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
            <Button
                title={loading ? "Logging in..." : "Login"}
                onPress={handleLogin}
                disabled={loading}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        marginBottom: 15,
        paddingHorizontal: 10,
    },
});

export default LoginScreen;
```

## Handling Different Environments

For different environments (development, staging, production), you can use environment variables or configuration files:

```javascript
// src/config/env.js
const ENV = {
    dev: {
        apiUrl: 'http://10.0.2.2:8080',
        // Other dev-specific config
    },
    staging: {
        apiUrl: 'https://staging-api.example.com',
        // Other staging-specific config
    },
    prod: {
        apiUrl: 'https://api.example.com',
        // Other production-specific config
    }
};

// Select the right environment
const getEnvVars = () => {
    // This is a simple example - you might want to use a more robust solution
    if (__DEV__) {
        return ENV.dev;
    } else if (process.env.APP_ENV === 'staging') {
        return ENV.staging;
    } else {
        return ENV.prod;
    }
};

export default getEnvVars();
```

## Testing the Integration

1. Start your Spring Boot application
2. Run your React Native app:

```bash
# For React Native CLI
npx react-native run-android
# or
npx react-native run-ios

# For Expo
npx expo start
```

3. Test the login functionality and API calls

## Common Issues and Solutions

### CORS Issues

If you encounter CORS issues, ensure the backend CORS configuration includes all necessary origins. The current
configuration should already support React Native development environments.

### Network Connection Issues

When testing on Android emulator, use `10.0.2.2` instead of `localhost` to access your local development server.

For iOS simulator, use `localhost`.

### Authentication Issues

If authentication fails, check:

- The token is being properly stored in AsyncStorage
- The token is being included in the Authorization header
- The token hasn't expired

## Future Considerations

### iOS Support

For iOS support, ensure:

- All API endpoints work with iOS simulator (using `localhost` instead of `10.0.2.2`)
- Handle iOS-specific authentication flows (especially for social login)
- Test on multiple iOS devices and versions

### Web Support

For web support:

- Consider using React Native Web
- Adjust authentication to work with browser cookies when on web
- Test responsive layouts for different screen sizes

## Conclusion

This guide provides the basic setup for integrating a React Native mobile application with the Sodam backend API. By
following these guidelines, you can create a mobile client that communicates effectively with the backend while
maintaining security and performance.
