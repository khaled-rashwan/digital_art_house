// components/CustomButton.tsx
import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'filled' | 'outlined';
  style?: object; // Accept additional styles
}

const CustomButton: React.FC<ButtonProps> = ({ title, onPress, variant = 'filled', style }) => {
  const isFilled = variant === 'filled';
  return (
    <Pressable
      style={[styles.button, isFilled ? styles.filledButton : styles.outlinedButton, style, // Apply additional styles here
]}
      onPress={onPress}
    >
      <Text style={[styles.text, isFilled ? styles.filledText : styles.outlinedText]}>
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 10, // Rounded corners
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
    minHeight: 40,
    padding: 4,
    paddingRight: 0.03*width,
    paddingLeft: 0.03*width,
  },
  filledButton: {
    backgroundColor: '#4C58D0', // Background color for filled button
  },
  outlinedButton: {
    borderColor: '#4C58D0', // Border color for outlined button
    borderWidth: 2,
  },
  text: {
    fontSize: 15,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  filledText: {
    color: '#FFFFFF', // White text for filled button
  },
  outlinedText: {
    color: '#4C58D0', // Text color matching border for outlined button
  },
});

export default CustomButton;
