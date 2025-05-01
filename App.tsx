import React from "react";
import { View, StyleSheet, SafeAreaView } from "react-native";
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from "@react-navigation/stack";
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHouse, faList, faPhoneVolume, faUser } from '@fortawesome/free-solid-svg-icons';

import { Amplify } from "aws-amplify";
import { Authenticator } from "./src/config/authConfig";
import { useTheme } from "@aws-amplify/ui-react-native";

import outputs from "./amplify_outputs.json";
import { Logo } from './src/components/Logo';
import { LinearGradient } from 'expo-linear-gradient';

Amplify.configure(outputs);

import { enableScreens } from 'react-native-screens';
enableScreens();

// Import screens
import Home from './src/screens/Home';
import MyCourses from './src/screens/MyCourses';
import ContactUs from './src/screens/ContactUs';
import Account from './src/screens/Account';
import Reschedule from './src/screens/Reschedule';

import Admin from './src/screens/Admin';
import ControlUser from './src/screens/ControlUser';
import ControlCourse from './src/screens/ControlCourse';
import ControlLesson from './src/screens/ControlLesson';
import ControlApplication from './src/screens/ControlApplication';
import ControlInstructorAvailability from './src/screens/ControlInstructorAvailability';
import ControlBooking from './src/screens/ControlBooking';
import ControlTransaction from './src/screens/ControlTransaction';

type TabParamList = {
  Home: undefined;
  MyCourses: undefined;
  MyOrder: undefined;
  Notification: undefined;
  ContactUs: undefined;
  AccountStack: undefined;
};

const Stack = createStackNavigator();

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomePage" component={Home} />
    <Stack.Screen name="Reschedule" component={Reschedule} />
  </Stack.Navigator>
);

const AccountStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Account" component={Account} />
    <Stack.Screen name="Admin" component={Admin} />
    <Stack.Screen name="ControlUser" component={ControlUser} />
    <Stack.Screen name="ControlCourse" component={ControlCourse} />
    <Stack.Screen name="ControlLesson" component={ControlLesson} />
    <Stack.Screen name="ControlApplication" component={ControlApplication} />
    <Stack.Screen name="ControlInstructorAvailability" component={ControlInstructorAvailability} />
    <Stack.Screen name="ControlBooking" component={ControlBooking} />
    <Stack.Screen name="ControlTransaction" component={ControlTransaction} />
  </Stack.Navigator>
);

const Tab = createBottomTabNavigator<TabParamList>();

const AppContent = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      headerStyle: {
        backgroundColor: '#FFE560',
        height: 120,
        borderTopRightRadius: 40,
        borderTopLeftRadius: 40,
      },
      tabBarStyle: {
        backgroundColor: '#FEB739',
        height: 70,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
      },
      tabBarActiveBackgroundColor: '#FEDB9B',
      tabBarActiveTintColor: '#E69430',
      tabBarInactiveTintColor: '#FFFFFF',
      tabBarLabelStyle: { fontSize: 15 },
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeStack}
      options={{
        tabBarLabel: 'Home',
        tabBarIcon: ({ color, size }) => <FontAwesomeIcon icon={faHouse} color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="MyCourses"
      component={MyCourses}
      options={{
        tabBarLabel: 'My Courses',
        tabBarIcon: ({ color, size }) => <FontAwesomeIcon icon={faList} color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="ContactUs"
      component={ContactUs}
      options={{
        tabBarLabel: 'Contact Us',
        tabBarIcon: ({ color, size }) => <FontAwesomeIcon icon={faPhoneVolume} color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="AccountStack"
      component={AccountStack}
      options={{
        tabBarLabel: 'Account',
        tabBarIcon: ({ color, size }) => <FontAwesomeIcon icon={faUser} color={color} size={size} />,
      }}
    />
  </Tab.Navigator>
);

const LoginHeader = () => (
  <View style={styles.headerContainer}>
    <Logo />
  </View>
);

const App = () => {
  const {
    tokens: { colors },
  } = useTheme();

  return (
    <Authenticator.Provider>
      <Authenticator
        Container={(props: React.ComponentProps<typeof Authenticator.Container>) => (
          <Authenticator.Container {...props}>
            <View style={{ flex: 1 }}>
              <LinearGradient
                colors={['#FFE864', '#FEB938']}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />
              {props.children}
            </View>
          </Authenticator.Container>
        )}
        Header={LoginHeader}
      >
        <SafeAreaView style={styles.container}>
          <NavigationContainer>
            <AppContent />
          </NavigationContainer>
        </SafeAreaView>
      </Authenticator>
    </Authenticator.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 8,
  },
  headerContainer: {
    padding: 20,
    alignItems: 'center',
  },
});

export default App;