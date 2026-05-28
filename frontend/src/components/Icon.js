import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Icon({ name, size = 24, color, style }) {
  if (Platform.OS !== 'web') {
    return <Ionicons name={name} size={size} color={color} style={style} />;
  }
  return React.createElement('ion-icon', {
    name,
    style: { fontSize: size, color, display: 'block', width: size, height: size, ...style },
  });
}
