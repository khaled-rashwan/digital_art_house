import React, { useEffect, useState } from 'react';
import { fetchAuthSession } from "aws-amplify/auth";
import {jwtDecode, JwtPayload } from 'jwt-decode';
import type { StackNavigationProp } from '@react-navigation/stack';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';



type AccountStackParamList = {
  Account: undefined;
};

const ProtectedAdminPage = ({ children }: { children: React.ReactNode }) => {
  const navigation = useNavigation<StackNavigationProp<AccountStackParamList>>();

    const [isAdmin, setIsAdmin] = useState(false); // State variable to track admin status
    const [loading, setLoading] = useState(true);

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
                console.error('Error verifying admin access:', error);
            }
        finally {
            setLoading(false);
        }
    }

    getUserGroups();
    }, []);

  if (loading) {
    return (
      <View>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    navigation.navigate('Account'); // Redirect if not an Admin
    return null;
  }

  return <>{children}</>;
};

export default ProtectedAdminPage;
