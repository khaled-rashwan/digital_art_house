import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import CustomButton from '../components/CustomButton';
import DataTable from '../components/DataTable';
import RecordModal from '../components/RecordModal';
import Pagination from '../components/Pagination';

const client = generateClient<Schema>();

// Define StudentType with an "id" property required by DataTable
type StudentType = {
  id: string;            // Primary key from Cognito (username)
  studentName: string;   // from Cognito attribute "name"
  pocketBalance: number; // from DynamoDB attribute "pocketBalance"
};

const ControlUser = () => {
  const [students, setStudents] = useState<StudentType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [currentStudent, setCurrentStudent] = useState<StudentType | null>(null);

  // Sorting and searching state
  const [sortKey, setSortKey] = useState<keyof StudentType | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage: number = 5;
  const totalPages: number = Math.ceil(students.length / itemsPerPage);

  const navigation = useNavigation();

  // Fetch Cognito users via the custom Users query.
  // Expected JSON: [{ username, name }]
  const fetchCognitoStudents = async (): Promise<any[]> => {
    try {
      const { data, errors } = await client.queries.Users();
      if (errors) {
        console.error('GraphQL Errors:', errors);
        return [];
      }
      if (data && data.users) {
        const cognitoUsers = JSON.parse(data.users);
        return cognitoUsers;
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error fetching Cognito users:', error);
      return [];
    }
  };

  // Fetch DynamoDB users from the User table (only students)
  const fetchDynamoDBUsers = async (): Promise<any[]> => {
    try {
      const response = await client.models.User.list();
      let userList = response.data;
      // Explicitly filter for only Student role
      const studentUsers = userList.filter((user: any) => user.role === 'Student');
      return studentUsers;
    } catch (error) {
      console.error('Error fetching DynamoDB users:', error);
      return [];
    }
  };

  // Merge Cognito and DynamoDB data into StudentType[]
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const cognitoUsers = await fetchCognitoStudents();
      const dbStudentUsers = await fetchDynamoDBUsers(); // Already filtered for Students only

      const mergedStudents: StudentType[] = cognitoUsers.map((cognitoUser: any) => {
        const matchingDbUser = dbStudentUsers.find((user: any) => user.id === cognitoUser.username);
        return {
          id: cognitoUser.username,
          studentName: cognitoUser.name,
          pocketBalance: matchingDbUser ? matchingDbUser.pocketBalance : 0,
        };
      }).filter(student => {
        // Additional safety check: only include if we found a matching Student record in DynamoDB
        return dbStudentUsers.some(dbUser => dbUser.id === student.id);
      });

      // Filter by search query if provided
      let filteredStudents = mergedStudents;
      if (searchQuery) {
        filteredStudents = mergedStudents.filter((student) =>
          student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.id.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Sorting
      if (sortKey) {
        filteredStudents.sort((a, b) => {
          const aValue = a[sortKey];
          const bValue = b[sortKey];
          if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      }

      setStudents(filteredStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
      Alert.alert('Error', 'Failed to fetch students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [searchQuery, sortKey, sortOrder, currentPage]);

  const handleSort = (key: keyof StudentType) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Open modal to edit the pocket balance
  const openModal = (student: StudentType) => {
    setCurrentStudent(student);
    setModalVisible(true);
  };

  // Save updated pocket balance in DynamoDB
  const saveStudent = async () => {
    if (currentStudent) {
      try {
        await client.models.User.update({
          id: currentStudent.id,
          pocketBalance: currentStudent.pocketBalance,
        });
        Alert.alert('Success', 'Pocket balance updated successfully');
        setModalVisible(false);
        fetchStudents();
      } catch (error) {
        console.error('Error updating pocket balance:', error);
        Alert.alert('Error', 'Failed to update pocket balance.');
      }
    }
  };

  // Render a student row in the table
  const renderStudentItem = (student: StudentType) => (
    <View key={student.id} style={styles.itemContainer}>
      <View style={styles.itemRow}>
        <Text style={styles.itemText}>{student.id}</Text>
        <Text style={styles.itemText}>{student.studentName}</Text>
        <Text style={styles.itemText}>{student.pocketBalance}</Text>
        <View style={styles.itemActions}>
          <TouchableOpacity onPress={() => openModal(student)} style={styles.editButton}>
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const paginatedStudents = students.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <View style={styles.container}>
      <CustomButton title="Back to Admin" onPress={() => navigation.goBack()} variant="outlined" />
      <TextInput
        placeholder="Search Students"
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={handleSearch}
      />
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <>
          <DataTable<StudentType>
            data={paginatedStudents}
            columns={[
              { key: 'id', label: 'Student ID' },
              { key: 'studentName', label: 'Student Name' },
              { key: 'pocketBalance', label: 'Pocket Balance' },
            ]}
            onSort={handleSort}
            sortKey={sortKey}
            sortOrder={sortOrder}
            renderItem={renderStudentItem}
          />
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
        </>
      )}
      <RecordModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={saveStudent}
        title="Edit Pocket Balance"
      >
        <TextInput
          placeholder="Pocket Balance"
          style={styles.input}
          value={currentStudent ? currentStudent.pocketBalance.toString() : ''}
          keyboardType="numeric"
          onChangeText={(text) => {
            if (currentStudent) {
              setCurrentStudent({ ...currentStudent, pocketBalance: parseFloat(text) });
            }
          }}
        />
      </RecordModal>
    </View>
  );
};

export default ControlUser;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
  },
  itemContainer: {
    borderBottomWidth: 1,
    borderColor: '#eee',
    paddingVertical: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemText: {
    flex: 1,
    textAlign: 'center',
  },
  itemActions: {
    flexDirection: 'row',
  },
  editButton: {
    backgroundColor: '#4C58D0',
    padding: 5,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginVertical: 5,
  },
});