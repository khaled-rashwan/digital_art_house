import React from 'react';
import { Image } from 'react-native';
import icon from '../../assets/icon.png'; // Single, direct import

export const Logo: React.FC = () => {
  return (
    <Image
      source={icon} // Use the imported asset directly
      style={{
        marginBottom: 20,
      }}
    />
  );
};