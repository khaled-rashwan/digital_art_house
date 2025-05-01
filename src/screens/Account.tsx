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
  ScrollView
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { fetchUserAttributes, updateUserAttributes, fetchAuthSession, signOut } from "aws-amplify/auth";
import CustomButton from "../components/CustomButton";
import globalStyles from "../styles/globalStyles";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import * as ImagePicker from "expo-image-picker";
import { Authenticator } from "@aws-amplify/ui-react-native";
import { uploadData, getUrl } from "aws-amplify/storage";

type AccountStackParamList = {
  Admin: undefined;
};

const Account = () => {
  const navigation = useNavigation<StackNavigationProp<AccountStackParamList>>();
  const [name, setName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    getUserGroups();
    getUserAttributes();
  }, []);

  useEffect(() => {
    if (userId) {
      getProfilePhotoUrl(`profile-pictures/${userId}/profile-picture.jpg`, "private");
    }
  }, [userId]);

  // Retrieve user groups and set admin state if applicable
  async function getUserGroups(): Promise<void> {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens) throw new Error("Authentication tokens are undefined");
      const userGroups = session.tokens.accessToken.payload["cognito:groups"];
      if (Array.isArray(userGroups) && userGroups.every(group => typeof group === "string")) {
        if (userGroups.includes("Admin")) {
          setIsAdmin(true);
        }
      }
    } catch (error) {
      console.error("Error retrieving user groups:", error);
    }
  }

  // Retrieve user attributes and update state
  const getUserAttributes = async (): Promise<void> => {
    try {
      const attributes = await fetchUserAttributes();
      setUserId(attributes["sub"] || "");
      setName(attributes["name"] || "");
      setEmail(attributes["email"] || "");
      setPhoneNumber(attributes["phone_number"] || "");
      setAddress(attributes["address"] || "");
    } catch (error) {
      console.error("Error fetching user attributes:", error);
      Alert.alert("Error", "Unable to fetch user attributes");
    }
  };

  // New function to update a single attribute
  const handleSaveAttribute = async (attribute: string, value: string): Promise<void> => {
    try {
      const result = await updateUserAttributes({ userAttributes: { [attribute]: value } });
      if (result) {
        Alert.alert("Success", "Profile updated successfully!");
        await getUserAttributes();
      } else {
        Alert.alert("Notice", "Profile updated but additional confirmation may be required.");
      }
    } catch (error) {
      console.error("Error saving attribute:", error);
      Alert.alert("Error", "Failed to save changes.");
    }
  };

  // Navigate to the admin page
  const handleAdminNavigation = (): void => {
    navigation.navigate("Admin");
  };

  // New function to handle sign out
  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out", error);
      Alert.alert("Error", "Failed to sign out");
    }
  };

  // Retrieve image URL from storage and update profile photo state
  async function getProfilePhotoUrl(objectPath: string, accessLevel: string = "private"): Promise<string | null> {
    try {
      const options = {
        accessLevel,
        validateObjectExistence: false,
      };
      const getUrlResult = await getUrl({
        path: objectPath,
        options,
      });
      setProfilePhoto(getUrlResult.url.toString());
      return getUrlResult.url.toString();
    } catch (error) {
      console.error("Error getting image URL:", error);
      return null;
    }
  }

  // Handle image selection and upload process
  const handleSelectPhoto = async (): Promise<void> => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Denied", "You need to allow access to your media library to upload a photo.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.canceled) {
        const selectedFile = result.assets[0];
        setProfilePhoto(selectedFile.uri);
        const response = await fetch(selectedFile.uri);
        const fileBlob = await response.blob();
        const filePath = `profile-pictures/${userId}/profile-picture.jpg`;
        await uploadData({
          path: filePath,
          data: fileBlob,
        });
        Alert.alert("Success", "Photo uploaded successfully!");
      }
    } catch (error) {
      console.error("Error selecting or uploading photo:", error);
      Alert.alert("Error", "Failed to select or upload photo.");
    }
  };

  return (
    <Authenticator.Provider>
      <View style={globalStyles.container}>
        {/* Header */}
        <View style={globalStyles.header}>
          <LinearGradient colors={["#FFE864", "#FFE15D"]} style={globalStyles.gradient}>
          </LinearGradient>
        </View>

        <ScrollView style={globalStyles.overlayComponent}>
          <Text style={globalStyles.title}>account setting</Text>
          <View style={styles.content}>
            <View style={styles.photoContainer}>
              <TouchableOpacity onPress={handleSelectPhoto}>
                <Image
                  source={
                    profilePhoto
                      ? { uri: profilePhoto }
                      : Platform.OS === "web"
                      ? { uri: "/assets/profile-picture.png" }
                      : require("../../assets/profile-picture.png")
                  }
                  style={styles.photo}
                />
              </TouchableOpacity>
              <Text style={styles.photoHint}>Tap to change photo</Text>
            </View>
            {/* Name field with inline save */}
            <View style={styles.inputRow}>
              <View style={styles.iconPlaceholder} />
              <TextInput
                style={[styles.input, styles.nameInput]}
                value={name}
                onChangeText={setName}
              />
              <TouchableOpacity onPress={() => handleSaveAttribute("name", name)}>
                <Text style={styles.inlineSave}>Save</Text>
              </TouchableOpacity>
            </View>
            {/* Email field remains unchanged */}
            <View style={styles.inputRow}>
              <Text style={styles.icon}>✉️</Text>
              <TextInput style={[styles.input, styles.readOnlyInput]} value={email} editable={false} />
            </View>
            {/* Phone field with inline save */}
            <View style={styles.inputRow}>
              <Text style={styles.icon}>📞</Text>
              <TextInput style={styles.input} value={phoneNumber} onChangeText={setPhoneNumber} />
              <TouchableOpacity onPress={() => handleSaveAttribute("phone_number", phoneNumber)}>
                <Text style={styles.inlineSave}>Save</Text>
              </TouchableOpacity>
            </View>
            {/* Address field with inline save */}
            <View style={styles.inputRow}>
              <Text style={styles.icon}>🏠</Text>
              <TextInput style={styles.input} value={address} onChangeText={setAddress} multiline />
              <TouchableOpacity onPress={() => handleSaveAttribute("address", address)}>
                <Text style={styles.inlineSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
          {isAdmin && (
            <>
            <TouchableOpacity onPress={handleAdminNavigation}>
              <View style={styles.inputRow}>
                <Text style={styles.icon}>➡️</Text>
                <Text style={styles.adminLabel}>Admin Control Panel</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSignOut}>
              <View style={[styles.inputRow, { paddingBottom: 10 }]}>
                <Text style={styles.icon}>👋</Text>
                <Text style={styles.adminLabel}>Sign Out</Text>
              </View>
            </TouchableOpacity>
            </>
          )}
        </ScrollView>
        <View style={globalStyles.body}>
          {/* Additional body content */}
        </View>
      </View>
    </Authenticator.Provider>
  );
};

const styles = StyleSheet.create({
  content: {
    margin: 0,
    flex: 1,
  },
  // Modified style: center-align photo and text; removed left margin
  photoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ccc",
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
    flex: 1,
  },
  readOnlyInput: {
    backgroundColor: "#e9e9e9",
    color: "#888",
  },
  note: {
    textAlign: "center",
    fontSize: 20,
    color: "#666",
    marginBottom: 10,
  },
  saveMessage: {
    textAlign: "center",
    fontSize: 16,
    color: "green",
    marginVertical: 10,
  },
  adminLabel: {
    fontWeight: "bold",
    fontSize: 18,
    color: "#000",
    paddingVertical: 8,
  },
  photoHint: {
    marginTop: 5,
    fontSize: 14,
    color: "#888",
    textAlign: "center",
  },
  nameInput: {
    fontWeight: "bold",
    fontSize: 18,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  icon: {
    fontSize: 18,
    marginRight: 10,
  },
  iconPlaceholder: {
    width: 30, // matches icon width plus margin
    marginRight: 10,
  },
  inlineSave: {
    fontSize: 16,
    color: "blue",
    marginLeft: 10,
  },
  gotoIcon: {
    marginLeft: "auto",
    fontSize: 18,
    marginRight: 10,
  },
  signOutIcon: {
    marginLeft: "auto",
    fontSize: 18,
    marginRight: 10,
  },
});

export default Account;
