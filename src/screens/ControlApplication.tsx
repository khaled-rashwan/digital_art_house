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

// Define ApplicationType based on your schema
type ApplicationType = Schema['Application']['type'];

const ControlApplication = () => {
  const [applications, setApplications] = useState<ApplicationType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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
  const itemsPerPage: number = 10;
  const totalPages: number = Math.ceil(applications.length / itemsPerPage);

  const navigation = useNavigation();

  useEffect(() => {
    fetchApplications();
  }, [sortKey, sortOrder, searchQuery, currentPage]);

  // Fetch all applications with sorting and searching
  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = (await client.models.Application.list()) as { data: ApplicationType[]; nextToken?: string };
      let applicationList: ApplicationType[] = response.data;

      // Filter by search query
      if (searchQuery) {
        applicationList = applicationList.filter((application: ApplicationType) => {
          return ['status', 'progressPercentage'].some((key) => {
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

  // Create or update an application
  const saveApplication = async () => {
    if (!currentApplication.studentId || !currentApplication.courseId || !currentApplication.status) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    try {
      if (isEditing) {
        // Update existing application
        await client.models.Application.update(currentApplication as ApplicationType);
        Alert.alert('Success', 'Application updated successfully');
      } else {
        // Create new application
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

  // Delete an application
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

  // Open modal for creating or editing an application
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

  const paginatedApplications = applications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <View style={styles.container}>
      <CustomButton title="Back to Admin" onPress={() => navigation.goBack()} variant="outlined" />
      <CustomButton title="Create New Application" onPress={() => openModal()} variant="filled" />
      <TextInput
        placeholder="Search Applications"
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={handleSearch}
      />
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <>
          <DataTable
            data={paginatedApplications}
            columns={[
              { key: 'studentId', label: 'Student ID' },
              { key: 'courseId', label: 'Course ID' },
              { key: 'status', label: 'Status' },
              { key: 'progressPercentage', label: 'Progress (%)' },
            ]}
            onSort={handleSort}
            sortKey={sortKey}
            sortOrder={sortOrder}
            renderItem={(application: ApplicationType) => (
              <View key={application.id} style={styles.itemContainer}>
                <Text>{application.status}</Text>
                <TouchableOpacity onPress={() => openModal(application)}>
                  <Text>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteApplication(application.id)}>
                  <Text>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          />
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
        </>
      )}
      <RecordModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={saveApplication}
        title={isEditing ? 'Edit Application' : 'Create Application'}
      >
        <TextInput
          placeholder="Student ID"
          value={currentApplication.studentId ?? ''}
          onChangeText={(text) => setCurrentApplication({ ...currentApplication, studentId: text })}
        />
        <TextInput
          placeholder="Course ID"
          value={currentApplication.courseId ?? ''}
          onChangeText={(text) => setCurrentApplication({ ...currentApplication, courseId: text })}
        />
        <TextInput
          placeholder="Status"
          value={currentApplication.status ?? ''}
          onChangeText={(text) => setCurrentApplication({ ...currentApplication, status: text })}
        />
        <TextInput
          placeholder="Progress Percentage"
          value={currentApplication.progressPercentage?.toString() ?? ''}
          keyboardType="numeric"
          onChangeText={(text) => setCurrentApplication({ ...currentApplication, progressPercentage: parseFloat(text) })}
        />
      </RecordModal>
    </View>
  );
};

export default ControlApplication;

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
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});
