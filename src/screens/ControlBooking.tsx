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
import RNPickerSelect from 'react-native-picker-select';
import { Calendar, DateData } from 'react-native-calendars';
import { generateClient } from 'aws-amplify/data';
import { useNavigation } from '@react-navigation/native';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

// Updated StudentType to include email
interface StudentType { username: string; name: string; email: string; }
type CourseType = Omit<Schema['Course']['type'], 'instructor' | 'lessons' | 'applications'>;
type LessonType = Schema['Lesson']['type'];
type InstructorAvailabilityType = Schema['InstructorAvailability']['type'];
type BookingType = Schema['Booking']['type'];

interface TimeSlotProps { timeLabel: string; isSelected: boolean; onPress: () => void; }
const TimeSlot: React.FC<TimeSlotProps> = ({ timeLabel, isSelected, onPress }) => (
  <TouchableOpacity
    style={[styles.slot, isSelected ? styles.selectedSlot : styles.freeSlot]}
    onPress={onPress}
  >
    <Text style={styles.slotText}>{timeLabel}</Text>
  </TouchableOpacity>
);

const CreateBooking: React.FC = () => {
  const navigation = useNavigation();

  const [students, setStudents] = useState<StudentType[]>([]);
  const [studentId, setStudentId] = useState<string>('');
  const [courses, setCourses] = useState<CourseType[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [lessons, setLessons] = useState<LessonType[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<string>('');
  const [availabilities, setAvailabilities] = useState<InstructorAvailabilityType[]>([]);
  const [selectedAvailability, setSelectedAvailability] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [timeSlotsForSelectedDate, setTimeSlotsForSelectedDate] = useState<InstructorAvailabilityType[]>([]);
  const [existingBooking, setExistingBooking] = useState<BookingType | null>(null);
  const [currentAvailability, setCurrentAvailability] = useState<InstructorAvailabilityType | null>(null);
  const [buttonText, setButtonText] = useState('Reserve Booking');
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const uniqueDates = useMemo(() => {
    const dates = availabilities.map(slot => new Date(slot.timeStart).toISOString().split('T')[0]);
    return new Set(dates);
  }, [availabilities]);

  const fetchCognitoStudents = async (): Promise<StudentType[]> => {
    try {
      const { data, errors } = await client.queries.Students();
      if (errors) throw new Error(errors[0].message);
      if (!data || !data.users) throw new Error('No data returned from query.');
      return JSON.parse(data.users).map((user: { username: string; name: string; email: string }) => ({
        username: user.username,
        name: user.name || '',
        email: user.email || ''
      })) as StudentType[];
    } catch (error) {
      console.error('Error fetching students:', error);
      Alert.alert('Error', 'Failed to fetch students.');
      return [];
    }
  };

  // Helper function to format student display name with email
  const formatStudentDisplay = (student: StudentType) => {
    if (student.name && student.name.trim() !== '') {
      return `${student.name} (${student.email})`;
    }
    return student.email;
  };

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      const studentList = await fetchCognitoStudents();
      setStudents(studentList);
      setLoading(false);
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    if (!studentId) {
      setCourses([]);
      return;
    }
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const { data: applicationsData, errors } = await client.models.Application.list({
          filter: { studentId: { eq: studentId }, status: { eq: 'Paid' } },
          selectionSet: ['id', 'status', 'course.*'],
        });
        if (errors) throw new Error(errors[0].message);
        const courses = applicationsData.map(app => app.course).filter(Boolean);
        setCourses(courses);
      } catch (error) {
        console.error('Error fetching courses:', error);
        Alert.alert('Error', 'Failed to fetch courses.');
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [studentId]);

  useEffect(() => {
    if (!selectedCourse) {
      setLessons([]);
      setAvailabilities([]);
      return;
    }
    const fetchLessonsAndAvailabilities = async () => {
      try {
        setLoading(true);
        const { data: lessonsData } = await client.models.Lesson.list({
          filter: { courseId: { eq: selectedCourse } },
        });
        setLessons(lessonsData);

        const { data: allCourses } = await client.models.Course.list();
        const courseDetails = allCourses.find(course => course.id === selectedCourse);
        if (courseDetails) {
          const { data: availabilityData } = await client.models.InstructorAvailability.list({
            filter: { instructorId: { eq: courseDetails.instructorId || '' }, isBooked: { eq: false } },
          });
          setAvailabilities(availabilityData);
        }
      } catch (error) {
        console.error('Error fetching lessons and availabilities:', error);
        Alert.alert('Error', 'Failed to fetch lessons or availabilities.');
      } finally {
        setLoading(false);
      }
    };
    fetchLessonsAndAvailabilities();
  }, [selectedCourse]);

  const checkExistingBooking = async (lessonId: string) => {
    try {
      const compositeId = `${studentId}_${lessonId}`;
      const { data: booking } = await client.models.Booking.get({ id: compositeId });
      if (booking) {
        setExistingBooking(booking);
        setButtonText('Change Booking Date');
        const { data: availability } = await client.models.InstructorAvailability.get({
          id: booking.availabilityId,
        });
        if (availability) {
          setCurrentAvailability(availability);
          const date = new Date(availability.timeStart).toISOString().split('T')[0];
          setSelectedDate(date);
          setSelectedAvailability(booking.availabilityId);
          const slots = availabilities.filter(slot =>
            new Date(slot.timeStart).toISOString().split('T')[0] === date
          );
          setTimeSlotsForSelectedDate(slots);
        }
      } else {
        setExistingBooking(null);
        setCurrentAvailability(null);
        setSelectedDate(null);
        setSelectedAvailability('');
        setTimeSlotsForSelectedDate([]);
        setButtonText('Reserve Booking');
      }
    } catch (error) {
      console.error('Error fetching existing booking:', error);
      setExistingBooking(null);
      setCurrentAvailability(null);
      setSelectedDate(null);
      setSelectedAvailability('');
      setTimeSlotsForSelectedDate([]);
      setButtonText('Reserve Booking');
    }
  };

  const reserveBooking = async () => {
    if (!studentId || !selectedCourse || !selectedLesson || !selectedAvailability) {
      Alert.alert('Error', 'Please select a student, course, lesson, date, and time slot.');
      return;
    }
    try {
      setSaving(true);
      const compositeId = `${studentId}_${selectedLesson}`;
      const { data: existingBooking } = await client.models.Booking.get({ id: compositeId });

      if (existingBooking) {
        await client.models.Booking.update({
          id: compositeId,
          availabilityId: selectedAvailability,
        });
        if (existingBooking.availabilityId) {
          await client.models.InstructorAvailability.update({
            id: existingBooking.availabilityId,
            isBooked: false,
          });
        }
        await client.models.InstructorAvailability.update({
          id: selectedAvailability,
          isBooked: true,
        });
        Alert.alert('Success', 'Booking updated successfully.');
      } else {
        await client.models.Booking.create({
          id: compositeId,
          availabilityId: selectedAvailability,
          studentId: studentId,
          lessonId: selectedLesson,
          status: 'scheduled',
        });
        await client.models.InstructorAvailability.update({
          id: selectedAvailability,
          isBooked: true,
        });
        Alert.alert('Success', 'Booking reserved successfully.');
      }

      setSelectedCourse('');
      setSelectedLesson('');
      setAvailabilities([]);
      setSelectedAvailability('');
      setSelectedDate(null);
      setTimeSlotsForSelectedDate([]);
      setExistingBooking(null);
      setCurrentAvailability(null);
    } catch (error) {
      console.error('Error reserving booking:', error);
      Alert.alert('Error', 'Failed to reserve booking.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Booking</Text>
      <Button title="Back" onPress={() => navigation.goBack()} />
      {loading && <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />}

      <View style={styles.selectorContainer}>
        <Text style={styles.label}>Select Student:</Text>
        <RNPickerSelect
          onValueChange={(value) => {
            setStudentId(value);
            setSelectedCourse('');
            setSelectedLesson('');
            setAvailabilities([]);
            setSelectedAvailability('');
            setSelectedDate(null);
            setTimeSlotsForSelectedDate([]);
          }}
          items={students.map(student => ({
            label: formatStudentDisplay(student),
            value: student.username
          }))}
          placeholder={{ label: 'Select a student...', value: '', key: 'student-placeholder' }}
          style={pickerSelectStyles}
          value={studentId}
        />
      </View>

      {studentId !== '' && (
        <View style={styles.selectorContainer}>
          <Text style={styles.label}>Select Course:</Text>
          <RNPickerSelect
            onValueChange={(value) => {
              setSelectedCourse(value);
              setSelectedLesson('');
              setAvailabilities([]);
              setSelectedAvailability('');
              setSelectedDate(null);
              setTimeSlotsForSelectedDate([]);
            }}
            items={courses.map(course => ({ label: course.title, value: course.id }))}
            placeholder={{ label: 'Select a course...', value: '', key: 'course-placeholder' }}
            style={pickerSelectStyles}
            value={selectedCourse}
          />
        </View>
      )}

      {selectedCourse !== '' && (
        <View style={styles.selectorContainer}>
          <Text style={styles.label}>Select Lesson:</Text>
          <RNPickerSelect
            onValueChange={async (value) => {
              setSelectedLesson(value);
              if (value && studentId) {
                await checkExistingBooking(value);
              } else {
                setExistingBooking(null);
                setCurrentAvailability(null);
                setSelectedDate(null);
                setSelectedAvailability('');
                setTimeSlotsForSelectedDate([]);
                setButtonText('Reserve Booking');
              }
            }}
            items={lessons.map(lesson => ({ label: lesson.title, value: lesson.id }))}
            placeholder={{ label: 'Select a lesson...', value: '', key: 'lesson-placeholder' }}
            style={pickerSelectStyles}
            value={selectedLesson}
          />
        </View>
      )}

      {existingBooking && currentAvailability && (
        <View>
          <Text style={styles.infoText}>
            You have already booked this lesson on{' '}
            {new Date(currentAvailability.timeStart).toLocaleString()}.
            Select a different date or time slot to change the booking.
          </Text>
        </View>
      )}

      {selectedLesson && (
        <View style={styles.calendarContainer}>
          <Text style={styles.label}>Select Date:</Text>
          <Calendar
            onDayPress={(day: DateData) => {
              const dateString = day.dateString;
              if (uniqueDates.has(dateString)) {
                setSelectedDate(dateString);
                const slots = availabilities.filter(slot =>
                  new Date(slot.timeStart).toISOString().split('T')[0] === dateString
                );
                setTimeSlotsForSelectedDate(slots);
                setSelectedAvailability('');
              } else {
                Alert.alert('No Availability', 'There are no time slots available on this date.');
              }
            }}
            markedDates={{
              ...Object.fromEntries(
                Array.from(uniqueDates).map(date => [
                  date,
                  { marked: true, dotColor: 'green' }
                ])
              ),
              ...(selectedDate ? {
                [selectedDate]: {
                  selected: true,
                  marked: true,
                  selectedColor: 'blue',
                }
              } : {}),
            }}
            theme={{
              selectedDayBackgroundColor: 'blue',
              todayTextColor: '#00adf5',
              arrowColor: 'blue',
            }}
          />
        </View>
      )}

      {selectedDate && (
        <View style={styles.availabilityContainer}>
          <Text style={styles.label}>Select Time Slot for {selectedDate}:</Text>
          <View style={styles.slotsGrid}>
            {timeSlotsForSelectedDate.map(slot => {
              const startDate = new Date(slot.timeStart);
              const endDate = new Date(slot.timeEnd);
              const timeLabel = `${startDate.toLocaleTimeString()} - ${endDate.toLocaleTimeString()}`;
              return (
                <TimeSlot
                  key={slot.id}
                  timeLabel={timeLabel}
                  isSelected={selectedAvailability === slot.id}
                  onPress={() => setSelectedAvailability(slot.id)}
                />
              );
            })}
          </View>
        </View>
      )}

      <Button
        title={saving ? 'Processing...' : buttonText}
        onPress={reserveBooking}
        disabled={saving}
      />
    </ScrollView>
  );
};

export default CreateBooking;

const styles = StyleSheet.create({
  container: { padding: 20, flexGrow: 1, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 20 },
  selectorContainer: { marginVertical: 10 },
  label: { marginBottom: 5, fontWeight: 'bold' },
  loader: { marginVertical: 20 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  slot: { padding: 10, borderRadius: 5, margin: 5, width: '45%', alignItems: 'center' },
  freeSlot: { backgroundColor: '#4CAF50' },
  selectedSlot: { backgroundColor: '#2196F3' },
  slotText: { color: '#fff', fontWeight: 'bold' },
  availabilityContainer: { marginVertical: 10 },
  infoText: { marginVertical: 10, fontSize: 16, color: 'red' },
  calendarContainer: { marginVertical: 10 },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    color: 'black',
    paddingRight: 30,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: '#ccc',
    borderRadius: 8,
    color: 'black',
    paddingRight: 30,
  },
});