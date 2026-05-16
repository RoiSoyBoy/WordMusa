import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import NowPlayingScreen from '../screens/NowPlayingScreen';
import DictionaryScreen from '../screens/DictionaryScreen';
import ProgressScreen from '../screens/ProgressScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#13131A',
            borderTopColor: 'rgba(255,255,255,0.05)',
            borderTopWidth: 1,
          },
          tabBarActiveTintColor: '#7C6AF7',
          tabBarInactiveTintColor: '#7A7A9A',
          tabBarLabelStyle: { fontSize: 12, textAlign: 'right' },
        }}
      >
        <Tab.Screen
          name="NowPlaying"
          component={NowPlayingScreen}
          options={{
            tabBarLabel: 'עכשיו',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 18 }}>🎵</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Dictionary"
          component={DictionaryScreen}
          options={{
            tabBarLabel: 'מילון',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 18 }}>📚</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Progress"
          component={ProgressScreen}
          options={{
            tabBarLabel: 'התקדמות',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 18 }}>📊</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'הגדרות',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 18 }}>⚙️</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
