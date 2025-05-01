import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity, // Using TouchableOpacity for better styling control if CustomButton is rigid
  Platform, // For platform-specific shadows
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Import icons
import SignOutButton from '../components/SignOutButton';
import CustomButton from '../components/CustomButton'; // Keep for Back button? Or reuse styling
import globalStyles from '../styles/globalStyles';
import type { StackNavigationProp } from '@react-navigation/stack';
import ProtectedAdminPage from '../components/ProtectedAdminPage';
import { useNavigation } from '@react-navigation/native';
import { Authenticator } from '@aws-amplify/ui-react-native';

type AccountStackParamList = {
  Account: undefined;
  Admin: undefined;
  ControlUser: undefined; // Renamed internally, keep screen name for navigation
  ControlCourse: undefined; // Renamed internally, keep screen name for navigation
  ControlLesson: undefined; // Renamed internally, keep screen name for navigation
  ControlApplication: undefined; // Renamed internally, keep screen name for navigation
  ControlInstructorAvailability: undefined; // Renamed internally, keep screen name for navigation
  ControlBooking: undefined; // Renamed internally, keep screen name for navigation
  ControlTransaction: undefined; // Renamed internally, keep screen name for navigation
};

// Extend ButtonConfig to include an icon name
type ButtonConfig = {
  title: string;
  navigateTo: keyof AccountStackParamList;
  iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name']; // Type for MaterialCommunityIcons names
};

// --- Text Enhancements Applied Here ---
// Using "Manage" instead of "Control" for a slightly softer, more standard admin term.
// Adjusted wording for clarity where applicable.
const buttonConfigs: ButtonConfig[] = [
  { title: "Manage Users", navigateTo: "ControlUser", iconName: "account-cog-outline" },
  { title: "Manage Courses", navigateTo: "ControlCourse", iconName: "book-open-page-variant-outline" },
  { title: "Manage Lessons", navigateTo: "ControlLesson", iconName: "school-outline" },
  { title: "Manage Applications", navigateTo: "ControlApplication", iconName: "file-document-edit-outline" }, // Assuming 'Applications' refers to course/user applications
  { title: "Instructor Availability", navigateTo: "ControlInstructorAvailability", iconName: "calendar-clock-outline" }, // Kept as is, quite descriptive
  { title: "Manage Bookings", navigateTo: "ControlBooking", iconName: "calendar-check-outline" },
  { title: "Manage Transactions", navigateTo: "ControlTransaction", iconName: "credit-card-outline" },
  // Add more buttons here if needed
];

const Admin: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<AccountStackParamList>>();

  // Helper function to render admin tiles
  const renderAdminTile = ({ title, navigateTo, iconName }: ButtonConfig) => (
    <TouchableOpacity
      key={navigateTo}
      style={styles.tile}
      onPress={() => navigation.navigate(navigateTo)}
      activeOpacity={0.7} // Visual feedback on press
    >
      <MaterialCommunityIcons name={iconName} size={32} color="#4A90E2" style={styles.tileIcon} />
      <Text style={styles.tileText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <Authenticator.Provider>
      <ProtectedAdminPage>
        <View style={globalStyles.container}>
          {/* Redesigned Header */}
          <LinearGradient colors={['#FFE864', '#FFE15D']} style={styles.header}>
            <View style={styles.headerContent}>
              {/* --- Text Enhancement Applied Here --- */}
              <Text style={styles.headerTitle}>Admin Dashboard</Text>
              <SignOutButton />
            </View>
          </LinearGradient>

          {/* Main Content */}
          <ScrollView
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tileContainer}>
              {buttonConfigs.map(renderAdminTile)}
            </View>

            {/* Back Button - Text remains clear */}
            <CustomButton
              title="Back to Account"
              onPress={() => navigation.navigate('Account')}
              variant="outlined" // Assuming CustomButton has an 'outline' or similar variant
              style={styles.backButton}
              // Optional: Add textStyle if CustomButton allows it
              // textStyle={styles.backButtonText}
            />
          </ScrollView>
        </View>
      </ProtectedAdminPage>
    </Authenticator.Provider>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 50, // Adjust for status bar
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333', // Darker text on yellow background
    // Removed textAlign: 'center' as it's now positioned by flexbox
  },
  scrollViewContent: {
    padding: 20,
    paddingBottom: 40, // Extra padding at the bottom
  },
  // Container for the tiles
  tileContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between', // Creates space between columns
    marginBottom: 20,
  },
  // Individual Tile Styling
  tile: {
    width: '48%', // Keep 2 columns layout
    backgroundColor: '#FFFFFF', // White background for tiles
    borderRadius: 12, // Rounded corners
    paddingVertical: 20,
    paddingHorizontal: 10,
    marginBottom: 15, // Space below each tile
    alignItems: 'center', // Center content (icon & text)
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    // Elevation for Android
    elevation: 4,
  },
  tileIcon: {
    marginBottom: 10, // Space between icon and text
    color: '#4A90E2', // Example icon color - choose one that fits your theme
  },
  tileText: {
    fontSize: 14,
    fontWeight: '600', // Slightly bolder text
    color: '#333',
    textAlign: 'center',
  },
  // Back Button Styling
  backButton: {
    width: '100%',
    marginTop: 20, // More space above the back button
    backgroundColor: 'transparent', // Example: make it look different
    borderColor: '#4A90E2', // Example border color
    borderWidth: 1,
    // If using CustomButton variant="outline" doesn't work, style manually:
    // paddingVertical: 12,
    // borderRadius: 8,
  },
  // Optional: Style text inside back button if needed/possible
  // backButtonText: {
  //   color: '#4A90E2', // Match border color
  //   fontWeight: 'bold',
  // },
});

export default Admin;