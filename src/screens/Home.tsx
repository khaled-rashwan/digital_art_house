import React, { useState, useCallback } from 'react';

import {
    View,
    Text,
    FlatList,
    Image,
    Platform,
    StyleSheet,
    Pressable
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { generateClient } from 'aws-amplify/data';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPersonChalkboard, faUser } from '@fortawesome/free-solid-svg-icons';
import globalStyles from '../styles/globalStyles';
import CustomButton from '../components/CustomButton';
import Pagination from '../components/Pagination';
import type { Schema } from '../../amplify/data/resource';
import type { StackNavigationProp } from '@react-navigation/stack';

type HomeStackParamList = {
    Reschedule: {
        bookingId: string;
        lessonId: string;
        studentId: string;
    };
};

const client = generateClient<Schema>();

type Booking = Schema['Booking']['type'];

interface Session extends Booking {
    status: string;
    title: string;
    order: number;
    date: string;
    timeStart: string;
    timeEnd: string;
    numberOfReschedules?: number;
    lessonId: string;
    instructorAvailabilityId: string;
    studentId: string;
}

interface UserAttributes {
    name: string;
    email: string;
    sub: string;
}

const Home: React.FC = () => {
    const navigation = useNavigation<StackNavigationProp<HomeStackParamList>>();
    const [user, setUser] = useState<UserAttributes | null>(null);
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
            const attributes = await fetchUserAttributes();
            let formattedUser: UserAttributes;
            if (Array.isArray(attributes)) {
                formattedUser = {
                    name: attributes.find((attr: any) => attr.Name === 'name')?.Value || '',
                    email: attributes.find((attr: any) => attr.Name === 'email')?.Value || '',
                    sub: attributes.find((attr: any) => attr.Name === 'sub')?.Value || ''
                };
            } else {
                formattedUser = attributes as UserAttributes;
            }
            if (!formattedUser.sub) return;
            setUser(formattedUser);

            const userId = formattedUser.sub;
            const { data: userData } = await client.models.User.get({ id: userId });
            setPocketBalance(userData?.pocketBalance ?? 0);

            const { data: bookings } = await client.models.Booking.list({
                filter: { studentId: { eq: userId } }
            });

            const sessions: Session[] = (
                await Promise.all(
                    bookings.map(async (booking: Booking) => {
                        try {
                            const lesson = await booking.lesson();
                            const availability = await booking.availability();
                            if (!lesson?.data || !availability?.data) return null;
                            return {
                                ...booking,
                                status: booking.status,
                                title: lesson.data.title || 'Untitled',
                                order: lesson.data.order || 0,
                                date: availability.data.date || '',
                                timeStart: availability.data.timeStart || '',
                                timeEnd: availability.data.timeEnd || '',
                                studentId: booking.studentId
                            } as Session;
                        } catch {
                            return null;
                        }
                    })
                )
            ).filter((session): session is Session => session !== null);

            setUserSessions(sessions);
            setFilteredSessions(sessions.filter(s => s.status === 'scheduled'));
            setCurrentPage(1);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
            return () => {};
        }, [])
    );

    const paginatedSessions = filteredSessions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    const handleFilter = (filterType: 'upcoming' | 'previous') => {
        setCurrentPage(1);
        if (filterType === 'upcoming') {
            setFilteredSessions(userSessions.filter(s => s.status === 'scheduled'));
        } else {
            setFilteredSessions(
                userSessions.filter(s => s.status === 'completed' || s.status === 'canceled')
            );
        }
    };

    const formatDate = (dateStr: string): string => {
        const d = new Date(dateStr);
        return isNaN(d.getTime())
            ? 'Invalid Date'
            : d.toLocaleDateString(undefined, {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
              });
    };

    const formatTimeRange = (startStr: string, endStr: string): string => {
        const start = new Date(startStr);
        const end = new Date(endStr);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Invalid Time';
        const formatTime = (date: Date) =>
            date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
        return `${formatTime(start)} - ${formatTime(end)}`;
    };

    const handleSkipBooking = async (session: Session) => {
        try {
            await client.queries.RecordBooking({
                studentId: session.studentId,
                lessonId: session.lessonId,
                oldInstructorAvailabilityId: session.instructorAvailabilityId,
                action: 'skip'
            });
            fetchData();
        } catch (error) {
            console.error('Error skipping booking:', error);
        }
    };

    const renderSessionItem = ({ item }: { item: Session }) => {
        const canReschedule = item.status === 'scheduled' && (item.numberOfReschedules ?? 0) < 2;
        return (
            <View key={item.id} style={styles.sessionCard}>
                <View style={styles.sessionData}>
                    <View style={styles.ImageTitleNo}>
                        <FontAwesomeIcon
                            icon={faPersonChalkboard}
                            size={40}
                            style={{ marginRight: 10 }}
                        />
                        <View style={styles.sessionTitleContainer}>
                            <Text style={styles.sessionTitle} numberOfLines={2} ellipsizeMode="tail">
                                {item.title}
                            </Text>
                            <Text style={styles.sessionNo}>Session {item.order}</Text>
                        </View>
                    </View>
                    <View style={styles.dates}>
                        <Text style={styles.startDate}>{formatDate(item.date)}</Text>
                        <Text style={styles.duration}>{formatTimeRange(item.timeStart, item.timeEnd)}</Text>
                    </View>
                </View>
                {canReschedule && (
                    <View style={styles.buttonContainer}>
                        <View style={[globalStyles.customButton, styles.buttonWrapper]}>
                            <CustomButton
                                title="Reschedule"
                                onPress={() =>
                                    navigation.navigate('Reschedule', {
                                        bookingId: item.id,
                                        lessonId: item.lessonId,
                                        studentId: item.studentId
                                    })
                                }
                                variant="filled"
                            />
                        </View>
                        <View style={[globalStyles.customButton, styles.buttonWrapper]}>
                            <CustomButton title="Skip" onPress={() => handleSkipBooking(item)} variant="outlined" />
                        </View>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <FontAwesomeIcon icon={faUser} size={40} />
                <View style={styles.info}>
                    <Text style={styles.userName}>{user?.name || 'User'}</Text>
                    <Text>{user?.email || ''}</Text>
                </View>
                <View style={styles.balance}>
                    <Text>Balance</Text>
                    <Text style={styles.balanceValue}>{pocketBalance}</Text>
                </View>
            </View>
            <LinearGradient colors={["#013F7A", "#6B72CD"]} style={styles.title}>
                <Image
                    source={
                        Platform.OS === 'web'
                            ? { uri: '/assets/profile-picture.png' }
                            : require('../../assets/profile-picture.png')
                    }
                    style={styles.titleImage}
                />
                <View style={styles.titleTextContainer}>
                    <Text style={styles.titleText}>Digital</Text>
                    <Text style={styles.titleText}>Art</Text>
                    <Text style={styles.titleText}>House</Text>
                </View>
            </LinearGradient>
            <View style={styles.sessions}>
                <FlatList
                    data={paginatedSessions}
                    renderItem={renderSessionItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    ItemSeparatorComponent={() => <View style={styles.listItemSeparator} />}
                    ListEmptyComponent={
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <Text style={styles.emptyList}>
                                {isLoading ? 'Loading sessions...' : 'No sessions found!'}
                            </Text>
                        </View>
                    }
                    ListHeaderComponent={
                        <View style={styles.listHeader}>
                            <Pressable style={styles.headerItem} onPress={() => handleFilter('upcoming')}>
                                <Text style={styles.headerItemText}>Upcoming Sessions</Text>
                            </Pressable>
                            <Pressable style={styles.headerItem} onPress={() => handleFilter('previous')}>
                                <Text style={styles.headerItemText}>Previous Sessions</Text>
                            </Pressable>
                        </View>
                    }
                />
            </View>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F2'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#FFE560',
        borderTopRightRadius: 40,
        borderTopLeftRadius: 40,
        padding: 10
    },
    userName: {
        textTransform: 'uppercase',
        fontSize: 20,
        color: '#3A3C6D'
    },
    info: {
        alignItems: 'center'
    },
    balance: {
        alignItems: 'center'
    },
    balanceValue: {
        fontSize: 20
    },
    title: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        padding: Platform.OS === 'web' ? 5 : 10,
        height: Platform.OS === 'web' ? 150 : undefined
    },
    titleImage: {
        width: Platform.OS === 'web' ? 150 : 105,
        height: Platform.OS === 'web' ? 150 : 137,
        resizeMode: 'contain'
    },
    titleTextContainer: {
        alignItems: 'flex-end'
    },
    titleText: {
        color: '#FFE862',
        fontSize: 40
    },
    listItemSeparator: {
        height: 2,
        backgroundColor: '#6C7481',
        margin: 20,
        marginBottom: 0
    },
    emptyList: {
        textAlign: 'center',
        padding: 5,
        fontSize: 20,
        color: 'red'
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: 'rgb(76, 88, 208)'
    },
    headerItem: {
        padding: 20
    },
    headerItemText: {
        color: 'white'
    },
    listContainer: {
        backgroundColor: 'white',
        margin: 20,
        borderBottomRightRadius: 20,
        borderBottomLeftRadius: 20,
        paddingBottom: 20
    },
    sessionCard: {
        marginHorizontal: 20,
        marginVertical: 10,
        backgroundColor: '#FFF',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3
    },
    sessionData: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        padding: 15
    },
    ImageTitleNo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        minWidth: 0
    },
    sessionTitleContainer: {
        flexShrink: 1,
        flexWrap: 'wrap'
    },
    sessionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        flexWrap: 'wrap'
    },
    sessionNo: {
        fontSize: 14,
        color: '#555'
    },
    dates: {
        alignItems: 'flex-end',
        minWidth: 100
    },
    startDate: {
        color: 'red',
        fontSize: 18
    },
    duration: {
        color: 'red',
        fontSize: 14
    },
    sessions: {
        flex: 1,
        minHeight: '40%',
        maxHeight: '70%'
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
        paddingBottom: 10
    },
    buttonWrapper: {
        flex: 1,
        marginHorizontal: 5
    }
});

export default Home;
