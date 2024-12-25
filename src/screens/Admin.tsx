import {
  View,
  Text,
  StyleSheet,
  ScrollView
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import SignOutButton from '../components/SignOutButton';
import CustomButton from '../components/CustomButton';
import globalStyles from '../styles/globalStyles'; // Path to your stylesheet file
import type { StackNavigationProp } from '@react-navigation/stack';
import ProtectedAdminPage from '../components/ProtectedAdminPage';
import { useNavigation, NavigationProp } from '@react-navigation/native'; // Import the navigation hook

type AccountStackParamList = {
  Account: undefined;
  Admin: undefined;
  ControlUser: undefined;
  ControlCourse: undefined;
  ControlLesson: undefined;
  ControlApplication: undefined;
  ControlInstructorAvailability: undefined;
  ControlBooking: undefined;
  ControlTransaction: undefined;
};

// Define the type for button configurations
type ButtonConfig = {
  title: string;
  navigateTo: keyof AccountStackParamList;
};

// Define the button configurations with proper typing
const buttonConfigs: ButtonConfig[] = [
  // { title: "Account", navigateTo: "Account" },
  { title: "Control User", navigateTo: "ControlUser" },
  { title: "Control Course", navigateTo: "ControlCourse" },
  { title: "Control Lesson", navigateTo: "ControlLesson" },
  { title: "Control Application", navigateTo: "ControlApplication" },
  { title: "Instructor Availability", navigateTo: "ControlInstructorAvailability" },
  { title: "Control Booking", navigateTo: "ControlBooking" },
  { title: "Control Transaction", navigateTo: "ControlTransaction" },
];

const Admin: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<AccountStackParamList>>();

  return (
    <ProtectedAdminPage>
      <View style={globalStyles.container}>
      {/* Header */}
      <View style={globalStyles.header}>
        <LinearGradient colors={['#FFE864', '#FFE15D']} style={globalStyles.gradient}>
        <SignOutButton />
        </LinearGradient>
      </View>
        {/* Overlay Component */}
        <ScrollView
          style={[globalStyles.overlayComponent, styles.scrollViewContent]}
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Text style={globalStyles.title}>account setting</Text>
            <View style={styles.buttonContainer}>
              {buttonConfigs.map(({ title, navigateTo }) => (
                <CustomButton
                  key={navigateTo}
                  title={title}
                  onPress={() => navigation.navigate(navigateTo)}
                  variant="filled"
                  style={styles.buttonStyle}
                />
              ))}
            </View>
            <View style={styles.backButton}>
              <CustomButton
                  title="Back to Account"
                  onPress={() => navigation.navigate('Account')}
                  variant="filled"
                  style={styles.buttonStyle}
                />
              </View>
          </View>
        </ScrollView>
        {/* Body */}
        <View style={globalStyles.body}>
          {/* You can add additional body content here */}
        </View>
      </View>
    </ProtectedAdminPage>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between', // Adjusts spacing between buttons
    padding: 10,
  },
  buttonStyle: {
    width: '48%', // Adjusts width to fit two buttons per row
    marginVertical: 5,
  },
  backButton: {
    alignItems: 'center',
  },
});

export default Admin;
