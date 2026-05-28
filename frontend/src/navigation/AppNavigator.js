import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from '../components/Icon';
import NowPlayingScreen from '../screens/NowPlayingScreen';
import DictionaryScreen from '../screens/DictionaryScreen';
import ProgressScreen from '../screens/ProgressScreen';
import ReviewScreen from '../screens/ReviewScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  NowPlaying:  { focused: 'musical-notes',        unfocused: 'musical-notes-outline' },
  Dictionary:  { focused: 'library',               unfocused: 'library-outline' },
  Progress:    { focused: 'bar-chart',             unfocused: 'bar-chart-outline' },
  Review:      { focused: 'albums',                unfocused: 'albums-outline' },
};

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#000000',
            borderTopColor: 'rgba(255,255,255,0.08)',
            borderTopWidth: 0.5,
            height: Platform.OS === 'web' ? 80 : 62,
            paddingBottom: Platform.OS === 'web' ? 20 : 10,
            paddingTop: 6,
          },
          tabBarActiveTintColor: '#1DB954',
          tabBarInactiveTintColor: '#6A6A6A',
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
          tabBarIcon: ({ focused, color, size }) => {
            const icons = TAB_ICONS[route.name];
            const name = focused ? icons.focused : icons.unfocused;
            return <Icon name={name} size={22} color={color} />;
          },
        })}
      >
        <Tab.Screen
          name="NowPlaying"
          component={NowPlayingScreen}
          options={{ tabBarLabel: 'עכשיו' }}
        />
        <Tab.Screen
          name="Dictionary"
          component={DictionaryScreen}
          options={{ tabBarLabel: 'מילון' }}
        />
        <Tab.Screen
          name="Progress"
          component={ProgressScreen}
          options={{ tabBarLabel: 'התקדמות' }}
        />
        <Tab.Screen
          name="Review"
          component={ReviewScreen}
          options={{ tabBarLabel: 'קלפים' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
