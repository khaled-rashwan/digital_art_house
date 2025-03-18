import * as React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { View, Pressable, Text, StyleSheet, FlatList, Image, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { generateClient } from 'aws-amplify/data';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import globalStyles from '../styles/globalStyles';
import CustomButton from '../components/CustomButton';
import type { Schema } from '../../amplify/data/resource';  // Import Schema
import type { StackNavigationProp } from '@react-navigation/stack';
import Pagination from '../components/Pagination';

type HomeStackParamList = {
    Reschedule: {
        bookingId: string; // Now composite: studentId_lessonId
        lessonId: string;
        studentId: string;
    };
};

const client = generateClient<Schema>();

// Use the Schema type to ensure consistency
type Booking = Schema['Booking']['type'];
type Lesson = Schema['Lesson']['type'];
type InstructorAvailability = Schema['InstructorAvailability']['type'];

interface Session extends Booking {
  title: string;
  order: number;
  date: string;
  timeStart: string;
  timeEnd: string;
  numberOfReschedules?: number; // Add this optional property
  lessonId: string; // Add this required property
  instructorAvailabilityId: string; // Add this required property
}

const Home = () => {
    const navigation = useNavigation<StackNavigationProp<HomeStackParamList>>();
    const [user, setUser] = useState<any>(null);  // Consider a more specific user type
    const [pocketBalance, setPocketBalance] = useState<number>(0);
    const [userSessions, setUserSessions] = useState<Session[]>([]);
    const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const itemsPerPage = 2;
    const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const currentUser = await fetchUserAttributes();
            console.log("currentUser:", currentUser); // DEBUG: Check the user object
            setUser(currentUser);

            if (!currentUser || !currentUser.sub) {
                console.error("User not authenticated or sub is missing.");
                setIsLoading(false); // Important: Stop loading
                return; // Exit the function
            }
            const userId = currentUser.sub;

            const { data: userData } = await client.models.User.get({ id: userId });
            setPocketBalance(userData?.pocketBalance || 0);

            const { data: bookings } = await client.models.Booking.list({
                filter: { studentId: { eq: userId } },
            });
            console.log("bookings:", bookings); // DEBUG: Check the bookings array

            const sessions: Session[] = await Promise.all(
                bookings.map(async (booking: Booking) => {
                    try { // Added try-catch inside map
                        const lesson = await booking.lesson();
                        if (!lesson?.data) {
                            console.warn("Lesson data is missing for booking:", booking);
                            return null; // Return null for this booking
                        }
                        const availability = await booking.availability();

                        if (!availability?.data) {
                            console.warn("Lesson or Availability data is missing for booking:", booking);
                            return null; // Return null for this booking
                        }

                        return {
                            ...booking,
                            title: lesson.data.title || 'Untitled',
                            order: lesson.data.order || 0,
                            date: availability.data.date || '',
                            timeStart: availability.data.timeStart || '',
                            timeEnd: availability.data.timeEnd || '',
                        };
                    } catch (error) {
                        console.error("Error fetching lesson or availability for booking:", booking, error);
                        return null; // Return null on error
                    }
                })
            ).then(results => results.filter((session): session is Session => session !== null)); // Filter out nulls *after* Promise.all resolves

            setUserSessions(sessions);
            setFilteredSessions(sessions.filter((s) => s.status === 'scheduled'));
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Use useFocusEffect to trigger data fetch when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchData();
            // Return cleanup function if needed
            return () => {
                // Any cleanup code if necessary
            };
        }, []) // Empty dependency array as fetchData uses state setters
    );

    const paginatedSessions = filteredSessions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (page: number) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    const handleFilter = (filterType: 'upcoming' | 'previous') => {
        setCurrentPage(1);
        if (filterType === 'upcoming') {
            setFilteredSessions(userSessions.filter((s) => s.status === 'scheduled'));
        } else if (filterType === 'previous') {
            setFilteredSessions(userSessions.filter((s) => s.status === 'completed' || s.status === 'canceled')); // Include canceled
        }
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        
        // Format to local date (DD/MM/YYYY)
        return date.toLocaleDateString(undefined, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatTimeRange = (startString: string, endString: string): string => {
        const startDate = new Date(startString);
        const endDate = new Date(endString);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 'Invalid Time';

        // Format to local time with timezone name
        const formatTime = (date: Date) => {
            return date.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        };

        // Get timezone abbreviation
        const timeZoneName = new Intl.DateTimeFormat().resolvedOptions().timeZone;
        const timeZoneAbbr = (() => {
            // Get timezone abbreviation
            try {
                const formatter = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' });
                const parts = formatter.formatToParts(new Date());
                const timeZonePart = parts.find(part => part.type === 'timeZoneName');
                return timeZonePart ? timeZonePart.value : timeZoneName;
            } catch (error) {
                // Fallback to offset if browser doesn't support timezone names
                const offset = new Date().getTimezoneOffset();
                const hours = Math.abs(Math.floor(offset / 60));
                const minutes = Math.abs(offset % 60);
                return `UTC${offset <= 0 ? '+' : '-'}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }
        })();

        return `${formatTime(startDate)} - ${formatTime(endDate)} ${timeZoneAbbr}`;
    };
    
    // Define the skip booking function
    const handleSkipBooking = async (item: Session) => {
      try {
        const response = await client.queries.RecordBooking({
          studentId: item.studentId,
          lessonId: item.lessonId,
          oldInstructorAvailabilityId: item.availabilityId, // or the relevant field from your item
          action: "skip"
        });

        console.log("Skip operation successful:", response);
        // Optionally navigate or update the UI based on response
      } catch (error) {
        console.error("Error skipping booking:", error);
      }
    };

    const renderSessionItem = ({ item }: { item: Session }) => {
        // Check if the session has 2 or more reschedules
        const canReschedule = item.status === 'scheduled' && (item.numberOfReschedules === undefined || item.numberOfReschedules < 2);
        
    return (
      <View key={item.id}>
          <View style={styles.sessionData}>
              {/* Existing session data layout */}
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
                      <Text style={styles.sessionTitle}>{item.title}</Text>
                      <Text style={styles.sessionNo}>Session {item.order}</Text>
                  </View>
              </View>
              <View style={styles.dates}>
                  <Text style={styles.startDate}>{formatDate(item.date)}</Text>
                  <Text style={styles.duration}>
                      {formatTimeRange(item.timeStart, item.timeEnd)}
                  </Text>
              </View>
          </View>
          {canReschedule && (
              <View style={styles.buttonContainer}>
                  <View style={[globalStyles.customButton, styles.buttonWrapper]}>
                      <CustomButton
                          title="Reschedule"
                          onPress={() => {
                              navigation.navigate('Reschedule', {
                                  bookingId: item.id, // Pass the composite ID
                                  lessonId: item.lessonId,
                                  studentId: item.studentId,
                              });
                          }}
                          variant="filled"
                      />
                  </View>
                  <View style={[globalStyles.customButton, styles.buttonWrapper]}>
                      <CustomButton
                          title="Skip"
                          onPress={() => handleSkipBooking(item)}
                          variant="outlined"
                      />
                  </View>
              </View>
          )}
      </View>
  );
    };

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
                    <Text style={{ fontSize: 20 }}>{pocketBalance}</Text>
                </View>
            </View>

            {/* Title Section */}
            <LinearGradient colors={['#013F7A', '#6B72CD']} style={styles.title}>
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
                    data={paginatedSessions}
                    renderItem={renderSessionItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    ItemSeparatorComponent={() => <View style={styles.listItemSeparator} />}
                    ListEmptyComponent={() => (
                        <Text style={styles.emptyList}>
                            {isLoading ? 'Loading sessions...' : 'No sessions found!'}
                        </Text>
                    )}
                    ListHeaderComponent={() => (
                        <View style={styles.listHeader}>
                            <Pressable
                                style={styles.headerItem}
                                onPress={() => handleFilter('upcoming')}
                            >
                                <Text style={styles.headerItemText}>Upcoming Sessions</Text>
                            </Pressable>
                            <Pressable
                                style={styles.headerItem}
                                onPress={() => handleFilter('previous')}
                            >
                                <Text style={styles.headerItemText}>Previous Sessions</Text>
                            </Pressable>
                        </View>
                    )}
                />
            </View>

            {/* Pagination */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
            />
        </View>
    );
};

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
        justifyContent: 'flex-start',
        backgroundColor: 'white',
        margin: 20,
        borderBottomRightRadius: 20,
        borderBottomLeftRadius: 20,
        paddingBottom: 20,
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
        flex: 1,
        minHeight: '40%',
        maxHeight: '70%',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
    },
    buttonWrapper: {
        flex: 1,
        marginHorizontal: 5,
    },
});

export default Home;