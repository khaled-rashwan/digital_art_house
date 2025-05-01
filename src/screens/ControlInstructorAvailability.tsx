import React, { useEffect, useState } from 'react';
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
import CustomButton from '../components/CustomButton';
import RNPickerSelect from 'react-native-picker-select';
import { Calendar } from 'react-native-calendars';
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";

import { useNavigation } from '@react-navigation/native';
const client = generateClient<Schema>();

interface UserType {
  id: string;
  name: string;
  role: string;
}

interface InstructorAvailabilityType {
  id: string;
  instructorId: string;
  date: string;      // YYYY-MM-DD
  timeStart: string; // ISO datetime
  timeEnd: string;   // ISO datetime
  isBooked: boolean;
  description?: string;
}

interface TimeSlotProps {
  timeLabel: string;
  isBooked: boolean;
  onToggle: () => void;
}

const TimeSlot: React.FC<TimeSlotProps> = ({ timeLabel, isBooked, onToggle }) => {
  return (
    <TouchableOpacity
      style={[styles.slot, isBooked ? styles.booked : styles.free]}
      onPress={onToggle}
    >
      <Text style={styles.timeText}>{timeLabel}</Text>
    </TouchableOpacity>
  );
};

const ControlInstructorAvailability: React.FC = () => {
  const navigation = useNavigation();
  const [instructors, setInstructors] = useState<UserType[]>([]);
  const [selectedInstructor, setSelectedInstructor] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availability, setAvailability] = useState<InstructorAvailabilityType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Fetch all Instructors
  useEffect(() => {
    const fetchInstructors = async () => {
      try {
        setLoading(true);
        // Call the Instructors query
        const { data, errors } = await client.queries.Instructors();

        if (data && data.instructors) {
          // Parse the instructors and store them in state
          const instructorList = JSON.parse(data.instructors).map((instructor: { username: string; name: string }) => ({
            id: instructor.username, // Use username as the ID (sub)
            name: instructor.name,
            role: 'Instructor',
          }));
          setInstructors(instructorList);
        }
      } catch (error) {
        console.error('Error fetching instructors:', error);
        Alert.alert('Error', 'Failed to fetch instructors.');
      } finally {
        setLoading(false);
      }
    };
    fetchInstructors();
  }, []);

  // Fetch availability for selected instructor and date
  useEffect(() => {
    if (selectedInstructor && selectedDate) {
      fetchAvailability();
    } else {
      setAvailability([]);
    }
  }, [selectedInstructor, selectedDate]);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const { data: allAvailability } = await client.models.InstructorAvailability.list() as { data: InstructorAvailabilityType[] };
      const filtered = allAvailability.filter(av =>
        av.instructorId === selectedInstructor && av.date === selectedDate
      );

      if (filtered.length > 0) {
        setAvailability(filtered);
      } else {
        // Create default slots from 8 AM to 11 PM
        const defaultSlots: InstructorAvailabilityType[] = [];
        for (let hour = 8; hour < 23; hour++) {
          const timeStart = new Date(`${selectedDate}T${hour.toString().padStart(2, '0')}:00:00`);
          const timeEnd = new Date(timeStart.getTime() + 60 * 60 * 1000); // 1 hour later

          const timeStartISO = timeStart.toISOString();
          const timeEndISO = timeEnd.toISOString();
          const slotId = `${selectedInstructor}-${selectedDate}-${hour}`;

          defaultSlots.push({
            id: slotId,
            instructorId: selectedInstructor,
            date: selectedDate,
            timeStart: timeStartISO,
            timeEnd: timeEndISO,
            isBooked: false,
          });
        }
        setAvailability(defaultSlots);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      Alert.alert('Error', 'Failed to fetch availability.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSlot = (slotId: string) => {
    setAvailability(prev =>
      prev.map(slot =>
        slot.id === slotId ? { ...slot, isBooked: !slot.isBooked } : slot
      )
    );
  };

  const saveAvailability = async () => {
    try {
      if (!selectedInstructor || !selectedDate) {
        Alert.alert('Error', 'Please select an instructor and a date.');
        return;
      }

      setSaving(true);

      // Delete existing slots for this instructor and date to simplify logic
      const { data: existingSlots } = await client.models.InstructorAvailability.list();
      const slotsToDelete = existingSlots.filter(s => s.instructorId === selectedInstructor && s.date === selectedDate);
      for (const s of slotsToDelete) {
        await client.models.InstructorAvailability.delete({ id: s.id });
      }

      // Create (or recreate) all current slots
      for (const slot of availability) {
        await client.models.InstructorAvailability.create({
          id: slot.id,
          instructorId: slot.instructorId,
          date: slot.date,
          timeStart: slot.timeStart,
          timeEnd: slot.timeEnd,
          isBooked: slot.isBooked
        });
      }

      Alert.alert('Success', 'Availability saved successfully.');
    } catch (error) {
      console.error('Error saving availability:', error);
      Alert.alert('Error', 'Failed to save availability.');
    } finally {
      setSaving(false);
    }
  };

  const renderTimeSlots = () => {
    return availability.map(slot => {
      const startHour = new Date(slot.timeStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const endHour = new Date(slot.timeEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const timeLabel = `${startHour} - ${endHour}`;
      return (
        <TimeSlot
          key={slot.id}
          timeLabel={timeLabel}
          isBooked={slot.isBooked}
          onToggle={() => toggleSlot(slot.id)}
        />
      );
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Manage Instructor Availability</Text>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>{'< Back'}</Text>
      </TouchableOpacity>
      <View style={styles.selectorContainer}>
        <Text style={styles.label}>Select Instructor:</Text>
        <RNPickerSelect
          onValueChange={(value) => setSelectedInstructor(value)}
          items={instructors.map((inst) => ({
            label: inst.name,
            value: inst.id,
          }))}
          placeholder={{ label: 'Select an instructor...', value: '' }}
          style={pickerSelectStyles}
          value={selectedInstructor}
        />
      </View>
      <View style={styles.selectorContainer}>
        <Text style={styles.label}>Select Date:</Text>
        <Calendar
          onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
          markedDates={{
            [selectedDate]: { selected: true, selectedColor: '#00adf5' },
          }}
          theme={{
            selectedDayBackgroundColor: '#00adf5',
            selectedDayTextColor: '#ffffff',
            todayTextColor: '#00adf5',
            arrowColor: '#00adf5',
          }}
        />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#4C58D0" style={styles.loader} />
      ) : selectedInstructor && selectedDate ? (
        <View style={styles.timetableContainer}>
          <Text style={styles.subTitle}>Time Slots for {selectedDate}</Text>
          <View style={styles.slotsGrid}>
            {renderTimeSlots()}
          </View>
          <TouchableOpacity onPress={saveAvailability} style={styles.saveButton} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Availability'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.instructions}>Please select an instructor and date.</Text>
      )}
    </ScrollView>
  );
};

export default ControlInstructorAvailability;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 25,
    color: '#4C58D0',
    fontWeight: '500',
  },
  selectorContainer: {
    marginVertical: 10,
  },
  label: {
    marginBottom: 5,
    fontWeight: 'bold',
    fontSize: 16,
    color: '#374151',
  },
  loader: {
    marginTop: 50,
  },
  instructions: {
    marginTop: 20,
    textAlign: 'center',
    color: '#888',
  },
  timetableContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  subTitle: {
    fontSize: 18,
    marginBottom: 10,
    fontWeight: 'bold',
    color: '#333',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  slot: {
    padding: 10,
    borderRadius: 5,
    margin: 5,
    width: '45%',
    alignItems: 'center',
  },
  free: {
    backgroundColor: '#4CAF50',
  },
  booked: {
    backgroundColor: '#F44336',
  },
  timeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: '#4C58D0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
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