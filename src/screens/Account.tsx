import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  Alert,
  Dimensions,
  ScrollView
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { fetchUserAttributes, updateUserAttributes, fetchAuthSession } from "aws-amplify/auth";
import SignOutButton from '../components/SignOutButton';
import CustomButton from '../components/CustomButton';
import globalStyles from '../styles/globalStyles'; // Path to your stylesheet file
import {jwtDecode, JwtPayload } from 'jwt-decode';
import { useNavigation, NavigationProp } from '@react-navigation/native'; // Import the navigation hook
import type { StackNavigationProp } from '@react-navigation/stack';

type AccountStackParamList = {
  Admin: undefined;
};
const Account = () => {
  const navigation = useNavigation<StackNavigationProp<AccountStackParamList>>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [isAdmin, setIsAdmin] = useState(false); // State variable to track admin status


  // Extend JwtPayload to include cognito:groups
  interface CognitoJwtPayload extends JwtPayload {
    'cognito:groups'?: string[];
  }
  useEffect(() => {
    async function getUserGroups() {
      try {
        // Fetch the current authentication session
        const session = await fetchAuthSession();

        // Extract the ID token from the session
        const idToken = session.tokens?.idToken;
        if (!idToken) {
          throw new Error('ID Token is undefined or invalid');
        }
        // Decode the ID token to access its claims
        const decodedToken = jwtDecode<CognitoJwtPayload>(idToken.toString());
        // Extract the cognito:groups claim, which contains the user's groups
        const userGroups = decodedToken['cognito:groups'] || [];
        // Check if the user belongs to the Admin group
        if (userGroups.includes('Admin')) {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error('Error retrieving user groups:', error);
        return [];
      }
    }

    getUserGroups();
  }, []);

  // Fetch user attributes from Cognito
  useEffect(() => {
    const getUserAttributes = async () => {
      try {
        const attributes = await fetchUserAttributes();
        setName(attributes["name"] || ""); // Name can be editable
        setEmail(attributes["email"] || ""); // Read-only email
        setPhoneNumber(attributes["phone_number"] || ""); // Read-only phone number
        setAddress(attributes["address"] || ""); // Read-only address


      } catch (error) {
        console.error("Error fetching user attributes:", error);
        Alert.alert("Error", "Unable to fetch user attributes");
      }
    };

    getUserAttributes();
  }, []);

  // Handle Save (if saving name back to Cognito is required)

  const handleSave = async () => {
    try {
      // Prepare the input for updating user attributes
      const input = {
        userAttributes: {
          name, // Update the name
          phone_number: phoneNumber, // Update the phone number
          address, // Update the address
        },
      };
  
      // Save the updated attributes to Cognito
      const result = await updateUserAttributes(input);
  
      if (result) {
        Alert.alert("Success", "Profile updated successfully!");
      } else {
        Alert.alert("Notice", "Profile updated but additional confirmation may be required.");
      }
    } catch (error) {
      console.error("Error saving user attributes:", error);
      Alert.alert("Error", "Failed to save changes.");
    }
  };

  // Handle navigation to admin page
  const handleAdminNavigation = () => {
    navigation.navigate('Admin');
  };

  return (
    <View style={globalStyles.container}>
    {/* Header */}
    <View style={globalStyles.header}>
      <LinearGradient colors={['#FFE864', '#FFE15D']} style={globalStyles.gradient}>
      <SignOutButton />
      </LinearGradient>
    </View>
    
      {/* Overlay Component */}
      <ScrollView style={globalStyles.overlayComponent}>
        <Text style={globalStyles.title}>account setting</Text>
        {/* Content */}
        <View style={globalStyles.content}>
          {/* Profile Photo */}

          <View style={styles.photoContainer}>
            <Image
              source={
                Platform.OS === "web"
                  ? { uri: "/assets/icon3.png" } // Path to your logo on the web
                  : require("../../assets/icon3.png") // Path to your logo for native apps (e.g., in an `assets` folder)
              }
              style={styles.photo}
            />
          </View>

          {/* Editable Name */}
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
          />

          {/* Read-Only Email */}
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, styles.readOnlyInput]}
            value={email}
            editable={false}
          />

          {/* Read-Only Phone Number */}
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={[styles.input, styles.readOnlyInput]}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            //editable={false}
          />

          {/* Read-Only Address */}
          <Text style={styles.label}>Your Address</Text>
          <TextInput
            style={[styles.input, styles.readOnlyInput]}
            value={address}
            onChangeText={setAddress}
            //editable={false}
            multiline
          />
        </View>
        {/* Footer Note */}
        <Text style={styles.note}>
        Your contact information will be used for communication purposes.
        </Text>
        {/* Save Button */}
        <View style={globalStyles.customButton}>
          <CustomButton title="SAVE" onPress={handleSave} variant="filled" />
        </View>
        {/* Admin Access Button (conditionally rendered) */}
        {isAdmin && (
          <View style={styles.adminButtonContainer}>
            <TouchableOpacity onPress={handleAdminNavigation} style={styles.adminButton}>
              <Text style={styles.adminButtonText}>Go to Admin Page</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      {/* Body */}
      <View style={globalStyles.body}>
        {/* You can add additional body content here */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  photoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ccc", // Placeholder background
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    fontSize: 16,
    color: "#000",
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  readOnlyInput: {
    backgroundColor: "#e9e9e9",
    color: "#888",
  },
  note: {
    textAlign: 'center',
    fontSize: 20,
    color: "#666",
    marginBottom: 10,
  },
  adminButtonContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  adminButton: {
    backgroundColor: '#FFA500',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
  },
  adminButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Account;
