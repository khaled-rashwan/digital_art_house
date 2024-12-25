// components/InstructorAvailability/TimeSlot.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface TimeSlotProps {
  time: string;
  isBooked: boolean;
  onToggle: () => void;
}

const TimeSlot: React.FC<TimeSlotProps> = ({ time, isBooked, onToggle }) => {
  return (
    <TouchableOpacity
      style={[styles.slot, isBooked ? styles.booked : styles.free]}
      onPress={onToggle}
    >
      <Text style={styles.timeText}>{time}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  slot: {
    padding: 10,
    borderRadius: 5,
    margin: 5,
    width: '45%',
    alignItems: 'center',
  },
  free: {
    backgroundColor: '#4CAF50', // Green for free
  },
  booked: {
    backgroundColor: '#F44336', // Red for booked
  },
  timeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default TimeSlot;
