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
import { Picker } from '@react-native-picker/picker';

const client = generateClient<Schema>();

// Define ApplicationType based on your schema
type ApplicationType = Schema['Application']['type'];
type CourseType = Schema['Course']['type'];

const ControlApplication = () => {
  const [applications, setApplications] = useState<ApplicationType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [courses, setCourses] = useState<CourseType[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string; email: string }[]>([]); // Added email to the student type

  // Modal states
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [currentApplication, setCurrentApplication] = useState<Partial<ApplicationType>>({});
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Sorting
  const [sortKey, setSortKey] = useState<keyof ApplicationType | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Searching
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage: number = 5;
  const totalPages: number = Math.ceil(applications.length / itemsPerPage);

  const navigation = useNavigation();

  // Fetch students from Cognito
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { data, errors } = await client.queries.Users();
        if (errors) {
          console.error('GraphQL Errors:', errors);
          return;
        }
        if (data && data.users) {
          setStudents(JSON.parse(data.users).map((user: { username: string; name: string; email: string }) => ({
            id: user.username,  // Use username as the ID (sub)
            name: user.name || '',  // Handle cases where name might be null/undefined
            email: user.email || '',  // Store email address
          })));
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };
    fetchStudents();
  }, []);

  // Fetch courses from DynamoDB
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await client.models.Course.list();
        setCourses(response.data);
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
    };
    fetchCourses();
  }, []);

  // Fetch applications from DynamoDB
  useEffect(() => {
    fetchApplications();
  }, [sortKey, sortOrder, searchQuery, currentPage]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await client.models.Application.list() as { data: ApplicationType[]; nextToken?: string };
      let applicationList: ApplicationType[] = response.data;

      // Filter by search query
      if (searchQuery) {
        applicationList = applicationList.filter((application: ApplicationType) => {
          return ['status'].some((key) => {
            const value = application[key as keyof ApplicationType];
            return value?.toString().toLowerCase().includes(searchQuery.toLowerCase());
          });
        });
      }

      // Sorting
      if (sortKey) {
        applicationList.sort((a: ApplicationType, b: ApplicationType) => {
          const aValue = a[sortKey];
          const bValue = b[sortKey];

          if (aValue == null) return 1;
          if (bValue == null) return -1;
          if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      }

      setApplications(applicationList);
    } catch (error) {
      console.error('Error fetching applications:', error);
      Alert.alert('Error', 'Failed to fetch applications.');
    } finally {
      setLoading(false);
    }
  };

  const saveApplication = async () => {
    if (!currentApplication.studentId || !currentApplication.courseId || !currentApplication.status) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    try {
      if (isEditing) {
        await client.models.Application.update(currentApplication as ApplicationType);
        Alert.alert('Success', 'Application updated successfully');
      } else {
        await client.models.Application.create(currentApplication as ApplicationType);
        Alert.alert('Success', 'Application created successfully');
      }
      setModalVisible(false);
      fetchApplications();
    } catch (error) {
      console.error('Error saving application:', error);
      Alert.alert('Error', 'Failed to save application.');
    }
  };

  const deleteApplication = async (id: string) => {
    try {
      await client.models.Application.delete({ id });
      Alert.alert('Success', 'Application deleted successfully');
      fetchApplications();
    } catch (error) {
      console.error('Error deleting application:', error);
      Alert.alert('Error', 'Failed to delete application.');
    }
  };

  const openModal = (application?: ApplicationType) => {
    if (application) {
      setCurrentApplication(application);
      setIsEditing(true);
    } else {
      setCurrentApplication({});
      setIsEditing(false);
    }
    setModalVisible(true);
  };

  const handleSort = (key: keyof ApplicationType) => {
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

  // Helper function to format student display name with email
  const formatStudentDisplay = (studentId: string) => {
    const student = students.find(student => student.id === studentId);
    if (!student) return studentId;
    
    // If name exists, show "Name (email)", otherwise just show email
    if (student.name && student.name.trim() !== '') {
      return `${student.name} (${student.email})`;
    } else {
      return student.email;
    }
  };

  const renderApplicationItem = (application: ApplicationType) => {
    const studentDisplay = formatStudentDisplay(application.studentId);
    const courseName = courses.find(course => course.id === application.courseId)?.title || application.courseId;
    
    return (
      <View key={application.id} style={styles.itemContainer}>
        <View style={styles.itemRow}>
          <Text style={styles.itemText}>{studentDisplay}</Text>
          <Text style={styles.itemText}>{courseName}</Text>
          <Text style={styles.itemText}>{application.status}</Text>
          <View style={styles.itemActions}>
            <TouchableOpacity onPress={() => openModal(application)} style={styles.editButton}>
              <Text style={styles.buttonText}>Edit</Text>
            </TouchableOpacity>
            <View style={styles.buttonSpacer} />
            <TouchableOpacity onPress={() => deleteApplication(application.id)} style={styles.deleteButton}>
              <Text style={styles.buttonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const paginatedApplications = applications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Manage Applications</Text>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>{'< Back'}</Text>
      </TouchableOpacity>
      <TextInput
        placeholder="Search by Status"
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={handleSearch}
      />
      <TouchableOpacity onPress={() => openModal()} style={styles.createButton}>
        <Text style={styles.createButtonText}>+ Create New Application</Text>
      </TouchableOpacity>
      {loading ? (
        <ActivityIndicator size="large" color="#4C58D0" style={styles.loader} />
      ) : (
        <>
          <DataTable
            data={paginatedApplications}
            columns={[
              { key: 'studentId', label: 'Student' },
              { key: 'courseId', label: 'Course Name' },
              { key: 'status', label: 'Status' },
            ]}
            onSort={handleSort}
            sortKey={sortKey}
            sortOrder={sortOrder}
            renderItem={renderApplicationItem}
          />
          <View style={{ marginTop: 20 }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </View>
        </>
      )}
      <RecordModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={saveApplication}
        title={isEditing ? 'Edit Application' : 'Create Application'}
      >
        {isEditing ? (
          <>
            <Text style={styles.readOnlyText}>
              Student: {formatStudentDisplay(currentApplication.studentId || '')}
            </Text>
            <Text style={styles.readOnlyText}>
              Course: {courses.find(course => course.id === currentApplication.courseId)?.title || currentApplication.courseId}
            </Text>
          </>
        ) : (
          <>
            <Picker
              selectedValue={currentApplication.studentId ?? ''}
              onValueChange={(itemValue) => setCurrentApplication({ ...currentApplication, studentId: itemValue })}
              style={styles.picker}
            >
              <Picker.Item label="Select Student" value="" />
              {students.map((student) => (
                <Picker.Item 
                  key={student.id} 
                  label={student.name && student.name.trim() !== '' ? 
                    `${student.name} (${student.email})` : 
                    student.email} 
                  value={student.id} 
                />
              ))}
            </Picker>
            <Picker
              selectedValue={currentApplication.courseId ?? ''}
              onValueChange={(itemValue) => setCurrentApplication({ ...currentApplication, courseId: itemValue })}
              style={styles.picker}
            >
              <Picker.Item label="Select Course" value="" />
              {courses.map((course) => (
                <Picker.Item key={course.id} label={course.title} value={course.id} />
              ))}
            </Picker>
          </>
        )}
        <Picker
          selectedValue={currentApplication.status ?? ''}
          onValueChange={(itemValue) => setCurrentApplication({ ...currentApplication, status: itemValue })}
          style={styles.picker}
        >
          <Picker.Item label="Select Status" value="" />
          <Picker.Item label="Applied" value="Applied" />
          <Picker.Item label="Paid" value="Paid" />
        </Picker>
      </RecordModal>
    </View>
  );
};

export default ControlApplication;

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  searchInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  loader: {
    marginTop: 50,
  },
  itemContainer: {
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  buttonSpacer: {
    width: 10, // Add spacing between buttons
  },
  editButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  deleteButton: {
    backgroundColor: '#D14C4C',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  pagination: {
    marginTop: 20,
  },
  picker: {
    height: 50,
    width: '100%',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginVertical: 10,
  },
  readOnlyText: {
    fontSize: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    marginVertical: 5,
  },
  createButton: {
    alignSelf: 'center',
    backgroundColor: '#4C58D0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});