import React from "react";
import { Button, View, Text, StyleSheet, SafeAreaView, Platform } from "react-native";
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from "@react-navigation/stack";
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHouse, faList, faBell, faUser, faPhoneVolume } from '@fortawesome/free-solid-svg-icons';
import { faSquareWhatsapp } from '@fortawesome/free-brands-svg-icons';

import { Amplify } from "aws-amplify";
import { Authenticator, useAuthenticator } from "./src/config/authConfig";
import {useTheme} from "@aws-amplify/ui-react-native";

import outputs from "./amplify_outputs.json";
import { Logo } from './src/components/Logo';
import { LinearGradient } from 'expo-linear-gradient'; // Use 'react-native-linear-gradient' if not using Expo


Amplify.configure(outputs);


// Enable screens optimization for better performance
import { enableScreens } from 'react-native-screens';
enableScreens();

// import screens (tabs)
import Home from './src/screens/Home';
import MyCourses from './src/screens/MyCourses';
import MyOrder from './src/screens/MyOrder';
import Notification from './src/screens/Notification';
import ContactUs from './src/screens/ContactUs';
import Account from './src/screens/Account';
import Reschedule from './src/screens/Reschedule'

import Admin from './src/screens/Admin'
import ControlUser from './src/screens/ControlUser'
import ControlCourse from './src/screens/ControlCourse'
import ControlLesson from './src/screens/ControlLesson'
import ControlApplication from './src/screens/ControlApplication'
import ControlInstructorAvailability from './src/screens/ControlInstructorAvailability'
import ControlBooking from './src/screens/ControlBooking'
import ControlTransaction from './src/screens/ControlTransaction'


type TabParamList = {
  Home: undefined;
  MyCourses: undefined;
  MyOrder: undefined;
  Notification: undefined;
  ContactUs: undefined;
  AccountStack: undefined;
};

const Stack = createStackNavigator();
const HomeStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomePage" component={Home} />
      <Stack.Screen name="Reschedule" component={Reschedule} />
    </Stack.Navigator>
  );
};

const AccountStack = () => {
  return (
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
};

const Tab = createBottomTabNavigator<TabParamList>();

// Bottom Tab Navigator
const AppContent = () => (
  <Tab.Navigator
  screenOptions={{
    headerShown: false,
    headerStyle: {
      backgroundColor: '#FFE560', // Set header background color here
      height: 120,
      borderTopRightRadius: 40,
      borderTopLeftRadius: 40,
    },
    tabBarStyle: {
      backgroundColor: '#FEB739', // Set the background color here
      height: 70, // Increase the height of the tab bar
      width: '100%',
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
    },
    tabBarActiveBackgroundColor: '#FEDB9B', // Active tab color (e.g., white text for better contrast)
    tabBarActiveTintColor: '#E69430', // Active tab color
    tabBarInactiveTintColor: '#FFFFFF', // Inactive tab color
    tabBarIconStyle: {
      marginBottom: 0, // Adjust icon position if needed
    },
    tabBarLabelStyle: {
      fontSize: 15, // Adjust font size if needed
    },
  }}>
    <Tab.Screen
      name="Home"
      component={HomeStack}
      options={{
        title: '',
        headerTitleAlign: 'center', // Center the title
        tabBarLabel: 'Home',
        tabBarIcon: ({ color, size }) => (
          <FontAwesomeIcon icon={faHouse} color={color} size={size} />
        ),
      }}
    />
    <Tab.Screen
      name="MyCourses"
      component={MyCourses}
      options={{
        title: '',
        headerTitleAlign: 'center', // Center the title
        tabBarLabel: 'My Courses',
        tabBarIcon: ({ color, size }) => (
          <FontAwesomeIcon icon={faList} color={color} size={size} />
        ),
      }}
    />
    <Tab.Screen
      name="ContactUs"
      component={ContactUs}
      options={{
        title: '',
        headerTitleAlign: 'center', // Center the title
        tabBarLabel: 'Contact Us',
        tabBarIcon: ({ color, size }) => (
          <FontAwesomeIcon icon={faPhoneVolume} color={color} size={size} />
        ),
      }}
    />
    <Tab.Screen
      name="AccountStack"
      component={AccountStack}
      options={{
        title: '',
        headerTitleAlign: 'center', // Center the title
        tabBarLabel: 'Account',
        tabBarIcon: ({ color, size }) => (
          <FontAwesomeIcon icon={faUser} color={color} size={size} />
        ),
      }}
    />
  </Tab.Navigator>
);

const LoginHeader = () => {
  return (
    <View style={styles.headerContainer}>
      <Logo />
      {/* <Text style={styles.headerText}>Welcom to Digital Art House</Text> */}
    </View>
  );
};

const LoginFooter = () => {
  return (
    <View style={styles.footerContainer}>
      <Text style={styles.footerText}>Learn How to Art</Text>
    </View>
  );
};

const App = () => {
  const {
    tokens: { colors },
  } = useTheme();
  
  return (
    <Authenticator.Provider>
      <Authenticator
        // will wrap every subcomponent
        Container={(props: React.ComponentProps<typeof Authenticator.Container>) => (
          <Authenticator.Container {...props}>
            <View  style={{flex: 1}} >
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

        Header = {LoginHeader}
        //Footer = {LoginFooter}
        components={{
          Header: LoginHeader,
          //Footer: LoginFooter
        }}
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
    // backgroundColor: "#FFE45F",
    padding: 20,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3A3C6D',
  },
  footerContainer: {
    backgroundColor: "#FEB739",
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default App;