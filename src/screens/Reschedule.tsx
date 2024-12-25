// Reschedule.tsx

import React from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import CustomButton from '../components/CustomButton';

const Reschedule = () => {
    // Button press handler to navigate to the Reschedule screen
    const handlePress = () => {
      
    };
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient colors={['#FFE864', '#FFE15D']} style={styles.gradient}>
          {/* You can add header content here if needed */}
        </LinearGradient>
      </View>

      {/* Overlay Component */}
      <View style={styles.overlayComponent}>
        <Text style={styles.title}>SELECT TIME AND DATE</Text>
        <ScrollView>
          {[...Array(5)].map((_, index) => (
            <TextInput
              key={index}
              style={styles.input}
              placeholder={`Date Input ${index + 1}`}
            />
          ))}
        </ScrollView>
        <View style={styles.buttons}>
          <CustomButton title="reschedule" onPress={handlePress} variant="filled" />
          <CustomButton title="skip" onPress={handlePress} variant="outlined" />
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* You can add additional body content here */}
      </View>
    </View>
  );
};

export default Reschedule;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },
  header: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  body: {
    flex: 5,
  },
  overlayComponent: {
    position: 'absolute',
    top: '8%',
    left: '5%',
    right: '5%',
    bottom: '3%',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 10,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    // Elevation for Android
    elevation: 5,
  },
  title: {
    textAlign: 'center',
    fontSize: 22,
    marginBottom: 50,
  },
  input: {
    height: 45,
    //borderColor: '#CCCCCC',
    borderWidth: 1,
    marginBottom: 30,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
});
