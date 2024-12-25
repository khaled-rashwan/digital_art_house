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

// Define CourseType based on your schema
type CourseType = Schema['Course']['type'];

const ControlCourse = () => {
  const [courses, setCourses] = useState<CourseType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal states
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [currentCourse, setCurrentCourse] = useState<Partial<CourseType>>({});
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Sorting
  const [sortKey, setSortKey] = useState<keyof CourseType | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Searching
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage: number = 10;
  const totalPages: number = Math.ceil(courses.length / itemsPerPage);

  const navigation = useNavigation();

  useEffect(() => {
    fetchCourses();
  }, [sortKey, sortOrder, searchQuery, currentPage]);

  // Fetch all courses with sorting and searching
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = (await client.models.Course.list()) as { data: CourseType[]; nextToken?: string };
      let courseList: CourseType[] = response.data;

      // Filter by search query
      if (searchQuery) {
        courseList = courseList.filter((course: CourseType) => {
          return ['title', 'description'].some((key) => {
            const value = course[key as keyof CourseType];
            return value?.toString().toLowerCase().includes(searchQuery.toLowerCase());
          });
        });
      }

      // Sorting
      if (sortKey) {
        courseList.sort((a: CourseType, b: CourseType) => {
          const aValue = a[sortKey];
          const bValue = b[sortKey];

          if (aValue == null) return 1;
          if (bValue == null) return -1;
          if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      }

      setCourses(courseList);
    } catch (error) {
      console.error('Error fetching courses:', error);
      Alert.alert('Error', 'Failed to fetch courses.');
    } finally {
      setLoading(false);
    }
  };

  // Create or update a course
  const saveCourse = async () => {
    if (!currentCourse.title || !currentCourse.cost) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    try {
      if (isEditing) {
        // Update existing course
        await client.models.Course.update(currentCourse as CourseType);
        Alert.alert('Success', 'Course updated successfully');
      } else {
        // Create new course
        await client.models.Course.create(currentCourse as CourseType);
        Alert.alert('Success', 'Course created successfully');
      }
      setModalVisible(false);
      fetchCourses();
    } catch (error) {
      console.error('Error saving course:', error);
      Alert.alert('Error', 'Failed to save course.');
    }
  };

  // Delete a course
  const deleteCourse = async (id: string) => {
    try {
      await client.models.Course.delete({ id });
      Alert.alert('Success', 'Course deleted successfully');
      fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      Alert.alert('Error', 'Failed to delete course.');
    }
  };

  // Open modal for creating or editing a course
  const openModal = (course?: CourseType) => {
    if (course) {
      setCurrentCourse(course);
      setIsEditing(true);
    } else {
      setCurrentCourse({});
      setIsEditing(false);
    }
    setModalVisible(true);
  };

  const handleSort = (key: keyof CourseType) => {
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

  const paginatedCourses = courses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <View style={styles.container}>
      <CustomButton title="Back to Admin" onPress={() => navigation.goBack()} variant="outlined" />
      <CustomButton title="Create New Course" onPress={() => openModal()} variant="filled" />
      <TextInput
        placeholder="Search Courses"
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={handleSearch}
      />
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <>
          <DataTable
            data={paginatedCourses}
            columns={[
              { key: 'title', label: 'Title' },
              { key: 'cost', label: 'Cost' },
              { key: 'duration', label: 'Duration (sessions)' },
              { key: 'available', label: 'Available' },
            ]}
            onSort={handleSort}
            sortKey={sortKey}
            sortOrder={sortOrder}
            renderItem={(course: CourseType) => (
              <View key={course.id} style={styles.itemContainer}>
                <Text>{course.title}</Text>
                <TouchableOpacity onPress={() => openModal(course)}>
                  <Text>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteCourse(course.id)}>
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
        onSubmit={saveCourse}
        title={isEditing ? 'Edit Course' : 'Create Course'}
      >
        <TextInput
          placeholder="Title"
          value={currentCourse.title ?? ''}
          onChangeText={(text) => setCurrentCourse({ ...currentCourse, title: text })}
        />
        <TextInput
          placeholder="Cost"
          value={currentCourse.cost?.toString() ?? ''}
          keyboardType="numeric"
          onChangeText={(text) => setCurrentCourse({ ...currentCourse, cost: parseFloat(text) })}
        />
        <TextInput
          placeholder="Duration"
          value={currentCourse.duration?.toString() ?? ''}
          keyboardType="numeric"
          onChangeText={(text) => setCurrentCourse({ ...currentCourse, duration: parseInt(text, 10) })}
        />
        <TextInput
          placeholder="Description"
          value={currentCourse.description ?? ''}
          onChangeText={(text) => setCurrentCourse({ ...currentCourse, description: text })}
        />
      </RecordModal>
    </View>
  );
};

export default ControlCourse;

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
