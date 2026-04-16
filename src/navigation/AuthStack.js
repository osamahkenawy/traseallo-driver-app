/**
 * Trasealla Driver App — Auth Stack Navigator
 * Handles login, forgot password, reset password flows
 */

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {routeNames} from '../constants/routeNames';

// ─── Screen Imports ──────────────────────────────────
import LoginScreen from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import VerifyOtpScreen from '../screens/auth/VerifyOtpScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

const Stack = createNativeStackNavigator();

const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        contentStyle: {backgroundColor: '#F8FBFF'},
      }}>
      <Stack.Screen name={routeNames.Login} component={LoginScreen} />
      <Stack.Screen
        name={routeNames.ForgotPassword}
        component={ForgotPasswordScreen}
      />
      <Stack.Screen
        name={routeNames.VerifyOtp}
        component={VerifyOtpScreen}
      />
      <Stack.Screen
        name={routeNames.ResetPassword}
        component={ResetPasswordScreen}
      />
    </Stack.Navigator>
  );
};

export default AuthStack;
