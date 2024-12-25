import * as React from 'react';
import { useEffect, useState } from 'react';
import { View, Pressable, Text, StyleSheet, FlatList, Image, Platform, Alert } from "react-native";

import { useNavigation, NavigationProp } from '@react-navigation/native'; // Import the navigation hook

import { LinearGradient } from 'expo-linear-gradient'; // Import LinearGradient
import { generateClient } from "aws-amplify/data";
import { fetchUserAttributes, FetchUserAttributesOutput } from 'aws-amplify/auth';

import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser, faAngleUp, faAngleDown } from '@fortawesome/free-solid-svg-icons';

import globalStyles from '../styles/globalStyles';
import CustomButton from '../components/CustomButton';
import type { Schema } from "../../amplify/data/resource";
import type { StackNavigationProp } from '@react-navigation/stack';

type HomeStackParamList = {
  HomePage: undefined;
  Reschedule: undefined;
};

type HomeScreenProps = {
  navigation: StackNavigationProp<HomeStackParamList>;
};

type Session = {
  id: string;
  title: string;
  order: number;
  date: string;
  timeStart: string;
  timeEnd: string;
};

// Generate client for Amplify
const client = generateClient<Schema>();

const Home = ({ navigation }: HomeScreenProps) => {
  /* =========================
      State Variables
  ========================= */
  const [user, setUser] = useState<FetchUserAttributesOutput | null>(null);
  const [pocketBalance, setPocketBalance] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [userSessions, setUserSessions] = useState<Session[]>([]); // Initialize state with an empty array
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [paginatedData, setpaginatedData] = useState<Session[]>([]);
  const itemsPerPage = 2;
  // Calculate the number of pages
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);

  // Slice data for the current page
  useEffect(() => {
    setpaginatedData(
      filteredSessions.slice(
        currentPage * itemsPerPage,
        (currentPage + 1) * itemsPerPage
      )
    );
  }, [filteredSessions, currentPage]); // Only run when filteredSessions or currentPage changes

  /* =========================
      Pagination Handlers
  ========================= */
  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  /* =================================
    Data Fetching Overview:
    1. Retrieve the current user's attributes from Cognito.
    2. Fetch the current user's pocket balance from the (User) table using their Cognito sub as the identifier.
    3. Fetch all bookings from the (Booking) table.
    4. For each booking:
        - Fetch the title and order from the related (Lesson) table using the 'lesson' attribute.
        - Fetch the date, timeStart, and timeEnd from the related (InstructorAvailability) table using the 'availability' attribute.
  ================================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = await fetchUserAttributes();
        setUser(currentUser);
        const id = currentUser.sub ?? "";

        const { data: user } = await client.models.User.get({ id: id });

        if (user) {
          const balance = user.pocketBalance || 0;
          setPocketBalance(balance);
        } else {
          console.warn("No matching user found for the current admin.");
        }

        const { data: bookings } = await client.models.Booking.list();

        const sessionPromises = bookings.map(async (booking) => {
          const lesson = await booking.lesson();
          const availability = await booking.availability();

          const lessonData = lesson?.data;
          const availabilityData = availability?.data;

          if (lessonData && availabilityData) {
            return {
              id: booking.id,
              title: lessonData.title,
              order: lessonData.order,
              date: availabilityData.date,
              timeStart: availabilityData.timeStart,
              timeEnd: availabilityData.timeEnd,
            } as Session;
          }
          return null;
        });

        const resolvedSessions = (await Promise.all(sessionPromises)).filter(
          (session): session is NonNullable<typeof session> => session !== null
        );

        // Update states only after resolvedSessions is fully resolved
        if (resolvedSessions.length > 0) {
          setUserSessions(resolvedSessions);
          setFilteredSessions(resolvedSessions);
        } else {
          console.warn("No valid sessions found.");
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error("Error collecting data:", error.message);
        } else {
          console.error("Unexpected error:", error);
        }
      }
    };

    fetchData();
  }, []);

  /* =========================
      Helper Functions
  ========================= */
  // Convert the string into a Date object
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    const day = date.getUTCDate().toString().padStart(2, '0'); // Extract the day
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0'); // Extract the month (0-based index)
    const year = date.getUTCFullYear(); // Extract the year

    return `${day}/${month}/${year}`; // Format as DD/MM/YYYY
  };

  // Get time range from two date inputs
  const formatTimeRange = (startString: string, endString: string): string => {
    const startDate = new Date(startString); // Convert the start string to a Date object
    const endDate = new Date(endString); // Convert the end string to a Date object

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return 'Invalid Time';
    }

    const formatTime = (date: Date) =>
      `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;

    const startTime = formatTime(startDate); // Extract and format start time
    const endTime = formatTime(endDate); // Extract and format end time

    return `${startTime} - ${endTime} GMT`; // Combine times with "GMT"
  };

  // Filter sessions based on upcoming or previous
  const handleFilter = (filterType: 'upcoming' | 'previous') => {
    if (filterType === 'upcoming') {
      const upcomingSessions = userSessions.filter(
        (session) => new Date(session.timeStart) > new Date()
      );
      setFilteredSessions(upcomingSessions);
    } else if (filterType === 'previous') {
      const previousSessions = userSessions.filter(
        (session) => new Date(session.timeEnd) <= new Date()
      );
      setFilteredSessions(previousSessions);
    }
  };

  /* =========================
      Render Functions
  ========================= */
  // Render session item for FlatList
  const renderSessionItem = ({ item }: { item: Session }) => {
    if (!item) return null;

    const title = item.title || 'Untitled';
    const order = item.order != null ? item.order : 'Unknown';
    const date = item.date || '';
    const timeStart = item.timeStart || '';
    const timeEnd = item.timeEnd || '';

    return (
      <View key={`${item.id}`}>
        <View style={styles.sessionData}>
          <View style={styles.ImageTitleNo}>
            <Image
              source={
                Platform.OS === 'web'
                  ? { uri: '/assets/App-11.png' }
                  : require('../../assets/App-11.png')
              }
              style={styles.sessionImage}
            />
            <View style={styles.titleNo}>
              <Text style={styles.sessionTitle}>{title}</Text>
              <Text style={styles.sessionNo}>Session {order}</Text>
            </View>
          </View>
          <View style={styles.dates}>
            <Text style={styles.startDate}>{formatDate(date)}</Text>
            <Text style={styles.duration}>
              {formatTimeRange(timeStart, timeEnd)}
            </Text>
          </View>
        </View>
        <View style={globalStyles.customButton}>
          <CustomButton title="reschedule" onPress={handlePress} variant="filled" />
          <CustomButton title="skip" onPress={handlePress} variant="outlined" />
        </View>
      </View>
    );
  };

  // Button press handler to navigate to the Reschedule screen
  const handlePress = () => {
    navigation.navigate('Reschedule'); // Navigate to the Reschedule screen
  };

  /* =========================
      Render Component
  ========================= */
  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <FontAwesomeIcon icon={faUser} color={'#3A3C6D'} size={50} />
        <View style={styles.info}>
          <Text style={styles.userName}>{user?.name || ''}</Text>
          <Text>{user?.email || ''}</Text>
        </View>
        <View style={styles.balance}>
          <Text>Balance</Text>
          <Text style={{ fontSize: 20 }}>{pocketBalance ?? 0}</Text>
        </View>
      </View>

      {/* Title Section */}
      <LinearGradient
        colors={['#013F7A', '#6B72CD']} // Gradient colors
        style={styles.title}
      >
        <Image
          source={
            Platform.OS === 'web'
              ? { uri: '/assets/icon3.png' }
              : require('../../assets/icon3.png')
          }
          style={styles.titleImage}
        />
        <View style={styles.titleTextContainer}>
          <Text style={styles.titleText}>Digital</Text>
          <Text style={styles.titleText}>Art</Text>
          <Text style={styles.titleText}>House</Text>
        </View>
      </LinearGradient>

      {/* Sessions Section */}
      <View style={styles.sessions}>
        <FlatList
          data={paginatedData}
          renderItem={renderSessionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={styles.listItemSeparator} />}
          ListEmptyComponent={() => <Text style={styles.emptyList}>Nothing to show!!</Text>}
          ListHeaderComponent={() => (
            <View style={styles.listHeader}>
              <Pressable style={styles.headerItem} onPress={() => handleFilter('upcoming')}>
                <Text style={styles.headerItemText}>Upcoming Sessions</Text>
              </Pressable>
              <Pressable style={styles.headerItem} onPress={() => handleFilter('previous')}>
                <Text style={styles.headerItemText}>Previous Sessions</Text>
              </Pressable>
            </View>
          )}
          ListFooterComponent={() => (
            <View style={styles.paginationContainer}>
              {currentPage > 0 && (
                <Pressable style={styles.paginationArrow} onPress={goToPreviousPage}>
                  <FontAwesomeIcon icon={faAngleUp} color={'#6C7481'} size={30} />
                </Pressable>
              )}
              {currentPage < totalPages - 1 && (
                <Pressable style={styles.paginationArrow} onPress={goToNextPage}>
                  <FontAwesomeIcon icon={faAngleDown} color={'#6C7481'} size={30} />
                </Pressable>
              )}
            </View>
          )}
        />
      </View>
    </View>
  );
};

/* =========================
    Styles
========================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },
  header: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFE560',
    borderTopRightRadius: 40,
    borderTopLeftRadius: 40,
  },
  userName: {
    textTransform: 'uppercase',
    fontSize: 20,
    color: '#3A3C6D',
  },
  info: {
    alignItems: 'center',
  },
  balance: {
    alignItems: 'center',
  },
  title: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  titleImage: {
    width: 250,
    height: 250,
    resizeMode: 'contain',
  },
  titleTextContainer: {
    alignItems: 'flex-end',
  },
  titleText: {
    color: '#FFE862',
    fontSize: 50,
  },
  listItemSeparator: {
    height: 2,
    backgroundColor: '#6C7481',
    margin: 20,
    marginBottom: 0,
  },
  emptyList: {
    textAlign: 'center',
    padding: 5,
    fontSize: 20,
    color: 'red',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'blue',
  },
  headerItem: {
    padding: 20,
  },
  headerItemText: {
    color: 'white',
  },
  listContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    backgroundColor: 'white',
    margin: 20,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
  },
  sessionData: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    padding: 25,
  },
  ImageTitleNo: {
    flexDirection: 'row',
  },
  sessionImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  titleNo: {},
  sessionTitle: {
    fontSize: 20,
  },
  sessionNo: {
    fontSize: 14,
  },
  dates: {
    alignItems: 'flex-end',
  },
  startDate: {
    color: 'red',
    fontSize: 20,
  },
  duration: {
    color: 'red',
    fontSize: 14,
  },
  sessions: {
    flex: 3,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationArrow: {},
  paginationText: {},
});

export default Home;
