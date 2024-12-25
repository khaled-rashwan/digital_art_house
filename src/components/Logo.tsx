import React from 'react';
import { Image, Platform } from 'react-native';

export const Logo = () => {
  return (
    <Image
      source={
        Platform.OS === 'web'
          ? { uri: '/assets/icon.png' } // Path to your logo on the web
          : require('../../assets/icon.png')  // Path to your logo for native apps (e.g., in an `assets` folder)
      }
      style={{
        width: 300,  // Adjust width based on your needs
        height: 300, // Adjust height based on your needs
        resizeMode: 'contain',
        marginBottom: 20,
      }}
    />
  );
};
