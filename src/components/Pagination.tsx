// components/Pagination.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={[styles.button, currentPage === 1 && styles.disabled]}
      >
        <Text>Previous</Text>
      </TouchableOpacity>
      <Text style={styles.pageText}>
        Page {currentPage} of {totalPages}
      </Text>
      <TouchableOpacity
        onPress={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={[styles.button, currentPage === totalPages && styles.disabled]}
      >
        <Text>Next</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Pagination;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  button: {
    padding: 10,
    backgroundColor: '#4C58D0',
    marginHorizontal: 10,
    borderRadius: 5,
  },
  disabled: {
    backgroundColor: '#ccc',
  },
  pageText: {
    fontSize: 16,
  },
});
