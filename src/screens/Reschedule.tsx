// Reschedule.tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Button,
  TouchableOpacity,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { generateClient } from 'aws-amplify/data';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { Schema } from '../../amplify/data/resource';
import { MarkedDates } from 'react-native-calendars/src/types';

const client = generateClient<Schema>();

// Define route param types
type RescheduleRouteParams = {
  bookingId: string; // Now composite: studentId_lessonId
  lessonId: string;
  studentId: string;
};

type RescheduleScreenRouteProp = RouteProp<
  { Reschedule: RescheduleRouteParams },
  'Reschedule'
>;

interface TimeSlotProps {
  timeLabel: string;
  isSelected: boolean;
  isDisabled?: boolean;
  onPress: () => void;
}

const TimeSlot: React.FC<TimeSlotProps> = ({
  timeLabel,
  isSelected,
  isDisabled = false,
  onPress
}) => (
  <TouchableOpacity
    style={[
      styles.slot,
      isSelected ? styles.selectedSlot : styles.freeSlot,
      isDisabled && styles.disabledSlot
    ]}
    onPress={onPress}
    disabled={isDisabled}
  >
    <Text style={[styles.slotText, isDisabled && styles.disabledText]}>
      {timeLabel}
    </Text>
  </TouchableOpacity>
);

interface UserAttributes {
  sub: string;
  email?: string;
  [key: string]: any;
}

interface RecordBookingResponse {  // Matches custom type
  recordStatus: string;
  executionDuration: number;
}

// Use the Schema type
type LessonType = Schema['Lesson']['type'];
type InstructorAvailabilityType = Schema['InstructorAvailability']['type'];
type BookingType = Schema['Booking']['type'];

const Reschedule: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RescheduleScreenRouteProp>();
  const { bookingId, lessonId, studentId } = route.params;

  const [user, setUser] = useState<UserAttributes | null>(null);
  const [lesson, setLesson] = useState<LessonType | null>(null);
  const [availabilities, setAvailabilities] = useState<InstructorAvailabilityType[]>([]);
  const [selectedAvailability, setSelectedAvailability] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [existingBooking, setExistingBooking] = useState<BookingType | null>(null);
  const [currentAvailability, setCurrentAvailability] = useState<InstructorAvailabilityType | null>(null);
  const [instructorId, setInstructorId] = useState<string>('');  // Keep track of instructor
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
    const [rescheduleCount, setRescheduleCount] = useState<number>(0);

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      try {
        const currentUser = await fetchUserAttributes();
        const userAttributes: UserAttributes = { sub: currentUser.sub ?? '', ...currentUser };
        setUser(userAttributes);
        const userId = userAttributes.sub;

        if (!userId) throw new Error('User ID not found');

          // Fetch lesson
          const { data: lessonData } = await client.models.Lesson.get({ id: lessonId });
          if (!lessonData) throw new Error(`Lesson not found with ID: ${lessonId}`);
          setLesson(lessonData);

          // Fetch existing booking using composite ID
          const { data: bookingData } = await client.models.Booking.get({ id: bookingId });
          if (bookingData) {
              setExistingBooking(bookingData);
              setRescheduleCount(bookingData.numberOfReschedules || 0);

              // Fetch current availability using availabilityId from the booking
              if (bookingData.availabilityId) {
                  const { data: currentAvailData } = await client.models.InstructorAvailability.get({ id: bookingData.availabilityId });
                  setCurrentAvailability(currentAvailData);
                  setSelectedDate(currentAvailData?.date || null); // Set selected date
              }
          }

        // Get instructor ID from the course (same as before)
        if (lessonData.courseId) {
            const { data: courses } = await client.models.Course.list({
              filter: { id: { eq: lessonData.courseId } }
            });
            const course = courses?.[0];

            if (course?.instructorId) {
                setInstructorId(course.instructorId);
                const { data: availabilityData } = await client.models.InstructorAvailability.list({
                    filter: {
                        instructorId: { eq: course.instructorId },
                        or: existingBooking?.availabilityId
                            ? [
                                { isBooked: { eq: false } },
                                { id: { eq: existingBooking.availabilityId } }
                            ]
                            : [{ isBooked: { eq: false } }],
                    },
                });

                setAvailabilities(availabilityData || []);  // Handle potential null
            }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'Failed to fetch booking details.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bookingId, lessonId, studentId]); // Correct dependencies



    const uniqueDates = useMemo((): Set<string> => {
        const dates = availabilities
            .filter(slot => slot?.date)
            .map(slot => slot.date!);
        return new Set(dates);
    }, [availabilities]);

    const markedDates = useMemo((): MarkedDates => {
        const marked: MarkedDates = {};

        uniqueDates.forEach(date => {
            marked[date] = { marked: true, dotColor: 'green' };
        });

        if (selectedDate) {
            marked[selectedDate] = {
                selected: true,
                marked: true,
                selectedColor: 'blue',
            };
        }

        // Mark the current booking date, if it exists and isn't the selected date
        if (currentAvailability?.date && currentAvailability.date !== selectedDate) {
            marked[currentAvailability.date] = {
                ...marked[currentAvailability.date], // Preserve existing marks
                marked: true,
                dotColor: 'red',  // Different color for current booking
            };
        }

        return marked;
    }, [uniqueDates, selectedDate, currentAvailability]);


    const rescheduleBooking = async (): Promise<void> => {
        if (!user?.sub || !selectedAvailability) {
            Alert.alert('Error', 'Please select a date and time slot.');
            return;
        }

        if (existingBooking?.availabilityId === selectedAvailability) {
          Alert.alert('Notice', 'You selected the same time slot. No changes needed.');
          navigation.goBack();
          return;
        }


    try {
      setSaving(true);
      const oldAvailabilityId = existingBooking?.availabilityId || '';

      const response = await client.queries.RecordBooking({
        studentId: user.sub,
        lessonId,
        oldInstructorAvailabilityId: oldAvailabilityId,  // Now correctly passing old ID
        newInstructorAvailabilityId: selectedAvailability, // And new ID
        action: existingBooking ? 'RESCHEDULE' : 'BOOK' // Use action to determine operation
      });


      const bookingResponse = response.data as RecordBookingResponse;

      if (bookingResponse.recordStatus === 'SUCCESS') {
        Alert.alert(
          'Success',
          'Booking rescheduled successfully.'
        );
        navigation.goBack();
      } else {
        // More specific error handling based on the response
        throw new Error(`Booking failed with status: ${bookingResponse.recordStatus}`);
      }

    } catch (error: any) {  //  `any` is acceptable here, we don't know the error type
      console.error('Error updating booking:', error);
      Alert.alert('Error', error.message || 'Failed to update booking.'); // Show error message
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (dateString: string | undefined): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

    const renderDateSlots = (): React.ReactNode => {
        if (!selectedDate) return null;

        const slots = availabilities.filter(slot => slot.date === selectedDate);
        if (slots.length === 0) {
            return (
                <View style={styles.availabilityContainer}>
                    <Text style={styles.infoText}>No time slots available for this date.</Text>
                </View>
            );
        }

        return (
            <View style={styles.availabilityContainer}>
                <Text style={styles.label}>Select Time Slot for {selectedDate}:</Text>
                <View style={styles.slotsGrid}>
                    {slots.map(slot => {
                        const timeLabel = `${formatTime(slot.timeStart)} - ${formatTime(slot.timeEnd)}`;
                        const isCurrentBooking = slot.id === existingBooking?.availabilityId;
                        const isDisabled = !!slot.isBooked && !isCurrentBooking;
                        return (
                            <TimeSlot
                                key={slot.id}
                                timeLabel={timeLabel}
                                isSelected={selectedAvailability === slot.id || isCurrentBooking} // Highlight current
                                isDisabled={isDisabled} // Disable booked slots
                                onPress={() => {
                                    if (!isDisabled) {
                                        setSelectedAvailability(slot.id);
                                    }
                                }}
                            />
                        );
                    })}
                </View>
            </View>
        );
    };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {existingBooking ? 'Reschedule' : 'Book'} {lesson?.title || 'Lesson'}
      </Text>
      <Button title="Back" onPress={() => navigation.goBack()} />

      {existingBooking && currentAvailability && (  // Show current booking details
        <View style={styles.currentBookingContainer}>
          <Text style={styles.sectionTitle}>Current Booking</Text>
          <Text style={styles.infoText}>
            Date: {currentAvailability.date}
          </Text>
          <Text style={styles.infoText}>
            Time: {formatTime(currentAvailability.timeStart)} - {formatTime(currentAvailability.timeEnd)}
          </Text>
            {rescheduleCount > 0 && (
                <Text style={styles.rescheduleInfo}>
                    This lesson has been rescheduled {rescheduleCount} time{rescheduleCount > 1 ? 's' : ''}.
                </Text>
            )}
        </View>
      )}

      <View style={styles.calendarContainer}>
        <Text style={styles.sectionTitle}>Select New Date</Text>
        <Calendar
          onDayPress={(day: DateData): void => {
             const dateString = day.dateString;
                if (uniqueDates.has(dateString)) {
                    setSelectedDate(dateString);
                    if (currentAvailability?.date !== dateString) {
                        setSelectedAvailability('');
                    } else if (existingBooking) {
                        setSelectedAvailability(existingBooking.availabilityId);
                    }
                } else {
                    Alert.alert('No Availability', 'There are no time slots available on this date.');
                }
          }}
          markedDates={markedDates}
          theme={{
            selectedDayBackgroundColor: 'blue',
            todayTextColor: '#00adf5',
            arrowColor: 'blue',
          }}
        />
      </View>

      {renderDateSlots()}

      <View style={styles.buttonContainer}>
        <Button
          title={saving ? 'Processing...' : existingBooking ? 'Confirm Reschedule' : 'Book Lesson'}
          onPress={rescheduleBooking}
          disabled={saving || !selectedAvailability}  // Disable during save and if no slot is selected
        />
      </View>
    </ScrollView>
  );
};
const styles = StyleSheet.create({
    container: {
        padding: 20,
        flexGrow: 1,
        backgroundColor: '#fff'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 20
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginVertical: 10
    },
    label: {
        marginBottom: 5,
        fontWeight: 'bold'
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    currentBookingContainer: {
        backgroundColor: '#f0f0f0',
        padding: 15,
        borderRadius: 8,
        marginVertical: 15
    },
    slotsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between'
    },
    slot: {
        padding: 10,
        borderRadius: 5,
        margin: 5,
        width: '45%',
        alignItems: 'center'
    },
    freeSlot: {
        backgroundColor: '#4CAF50'
    },
    selectedSlot: {
        backgroundColor: '#2196F3'
    },
    disabledSlot: {
        backgroundColor: '#cccccc',
        opacity: 0.7
    },
    slotText: {
        color: '#fff',
        fontWeight: 'bold'
    },
    disabledText: {
        color: '#666666'
    },
    availabilityContainer: {
        marginVertical: 15
    },
    infoText: {
        fontSize: 16,
        marginBottom: 5
    },
    rescheduleInfo: {
        fontSize: 14,
        color: '#FF9800',
        marginTop: 5
    },
    calendarContainer: {
        marginVertical: 15
    },
    buttonContainer: {
        marginVertical: 20
    }
});

export default Reschedule;