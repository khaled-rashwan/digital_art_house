import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useAuthenticator } from '@aws-amplify/ui-react-native'; // Import for native, or adjust for web if necessary

import { Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');

const SignOutButton = () => {
  const { signOut } = useAuthenticator(); // Access the `signOut` method from AWS Amplify Authenticator

  return (
    <Pressable onPress={signOut} style={styles.signOutButton}>
      <Text style={styles.buttonText}>SIGN OUT</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  signOutButton: {
    borderRadius: 10, // Rounded corners
    justifyContent: 'center',
    alignItems: 'center',
    width: 160,
    minHeight: 40,
    padding: 4,
    paddingRight: 0.03*width,
    paddingLeft: 0.03*width,
    backgroundColor: '#4C58D0', // Background color for filled button
  },
  buttonText: {
    fontSize: 15,
    textTransform: 'uppercase',
    textAlign: 'center',
    color: '#FFFFFF', // White text for filled button
  },
});

export default SignOutButton;
