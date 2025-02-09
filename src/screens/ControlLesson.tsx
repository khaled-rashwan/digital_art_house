// screens/ControlLesson.tsx

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
import { useNavigation } from '@react-navigation/native'; // Import useNavigation
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import CustomButton from '../components/CustomButton';
import DataTable from '../components/DataTable';
import RecordModal from '../components/RecordModal';
import Pagination from '../components/Pagination';
import { Picker } from '@react-native-picker/picker';

const client = generateClient<Schema>();

// Define LessonType based on your schema
type LessonType = Schema['Lesson']['type'];
type CustomLessonType = LessonType & {
  courseTitle?: string; // Optional custom field
};

// Define CourseType based on your schema
type CourseType = Schema['Course']['type'];

// Define the response type from the list method
type ListLessonsResponse = {
  data: CustomLessonType[];
  nextToken?: string;
};

const ControlLesson = () => {
  const [lessons, setLessons] = useState<CustomLessonType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // States for modal
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [currentLesson, setCurrentLesson] = useState<Partial<CustomLessonType>>({});
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Sorting
  const [sortKey, setSortKey] = useState<keyof CustomLessonType | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filtering and Searching
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage: number = 5;
  const totalPages: number = Math.ceil(lessons.length / itemsPerPage);

  // Define the searchable attributes
  const searchableKeys: (keyof CustomLessonType)[] = ['title', 'description', 'courseId', 'courseTitle'];

  const navigation = useNavigation(); // Instantiate navigation

  // Courses state
  const [courses, setCourses] = useState<CourseType[]>([]);
  const [courseMap, setCourseMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    fetchLessons();
  }, [sortKey, sortOrder, searchQuery, currentPage]);

  // Fetch all lessons with sorting and multi-attribute searching
  const fetchLessons = async () => {
    try {
      setLoading(true);

      // Fetch Courses first
      const coursesResponse = await client.models.Course.list() as { data: CourseType[]; nextToken?: string };
      const fetchedCourses = coursesResponse.data;
      setCourses(fetchedCourses);

      // Create a map from courseId to courseTitle
      const map = new Map<string, string>();
      fetchedCourses.forEach(course => {
        map.set(course.id, course.title);
      });
      setCourseMap(map);

      // Fetch Lessons
      const response = await client.models.Lesson.list() as ListLessonsResponse;
      let lessonList: CustomLessonType[] = response.data;

      // Log the source data
      console.log('Source Data:', response.data);

      // Multi-attribute Search
      if (searchQuery) {
        lessonList = lessonList.filter((lesson: CustomLessonType) => {
          return searchableKeys.some((key) => {
            let value;
            if (key === 'courseTitle') {
              // Get the course title from the courseMap
              value = courseMap.get(lesson.courseId) || '';
            } else {
              value = lesson[key];
            }

            if (value === undefined || value === null) return false;

            // Convert value to string for comparison
            return value.toString().toLowerCase().includes(searchQuery.toLowerCase());
          });
        });
      }

      // Log the search results
      console.log('Search Results:', lessonList);

      // Sorting
      if (sortKey) {
        lessonList.sort((a: CustomLessonType, b: CustomLessonType) => {
          const aValue = a[sortKey];
          const bValue = b[sortKey];

          // Handle undefined or null values
          if (aValue === undefined || aValue === null) return 1;
          if (bValue === undefined || bValue === null) return -1;

          // Compare based on sortOrder
          if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      }

      setLessons(lessonList);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      Alert.alert('Error', 'Failed to fetch lessons.');
    } finally {
      setLoading(false);
    }
  };

  // Handle sorting
  const handleSort = (key: keyof CustomLessonType) => {
    if (sortKey === key) {
      // Toggle sort order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // Handle search
  const handleSearch = (text: string) => {
    console.log('Search Query:', text);
    setSearchQuery(text);
    setCurrentPage(1); // Reset to first page on search
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Create or update a lesson
  const saveLesson = async () => {
    // Validate required fields
    if (!currentLesson.title || currentLesson.order === undefined) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // When creating a new lesson, ensure courseId is selected
    if (!isEditing && (!currentLesson.courseId || currentLesson.courseId === '')) {
      Alert.alert('Error', 'Please select a Course');
      return;
    }

    // Construct the lesson data
    const lessonData: Partial<CustomLessonType> = {
      title: currentLesson.title,
      description: currentLesson.description ?? '',
      order: currentLesson.order,
      duration: currentLesson.duration ?? 60, // Default to 60 if undefined
      courseId: isEditing ? currentLesson.courseId : currentLesson.courseId ?? '', // Only set courseId when creating
      // Add other fields as necessary
    };

    try {
      if (isEditing) {
        // Update existing lesson
        await client.models.Lesson.update({
          id: currentLesson.id,
          ...lessonData,
        } as CustomLessonType);
        Alert.alert('Success', 'Lesson updated successfully');
      } else {
        // Create new lesson
        await client.models.Lesson.create(lessonData as CustomLessonType);
        Alert.alert('Success', 'Lesson created successfully');
      }
      setModalVisible(false);
      fetchLessons();
    } catch (error) {
      console.error('Error saving lesson:', error);
      Alert.alert('Error', 'Failed to save lesson.');
    }
  };

  // Delete a lesson
  const deleteLesson = async (id: string) => {
    try {
      await client.models.Lesson.delete({ id });
      Alert.alert('Success', 'Lesson deleted successfully');
      fetchLessons();
    } catch (error) {
      console.error('Error deleting lesson:', error);
      Alert.alert('Error', 'Failed to delete lesson.');
    }
  };

  // Open modal for creating or editing a lesson
  const openModal = (lesson?: CustomLessonType) => {
    if (lesson) {
      const { id, title, description, order, duration, courseId } = lesson;
      setCurrentLesson({ id, title, description, order, duration, courseId });
      setIsEditing(true);
    } else {
      setCurrentLesson({});
      setIsEditing(false);
    }
    setModalVisible(true);
  };

  // Render each lesson item
  const renderLessonItem = (lesson: CustomLessonType) => {
    const courseTitle = courseMap.get(lesson.courseId) || 'Unknown Course';
    return (
      <View key={lesson.id} style={styles.itemContainer}>
        <View style={styles.itemRow}>
          <Text style={styles.itemText}>{lesson.title}</Text>
          <Text style={styles.itemText}>{lesson.order}</Text>
          <Text style={styles.itemText}>{lesson.duration}</Text>
          <Text style={styles.itemText}>{courseTitle}</Text>
          {/* Add other fields as necessary */}
          <View style={styles.itemActions}>
            <TouchableOpacity onPress={() => openModal(lesson)} style={styles.editButton}>
              <Text style={styles.buttonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteLesson(lesson.id)} style={styles.deleteButton}>
              <Text style={styles.buttonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Calculate paginated data
  const paginatedLessons = lessons.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <View style={styles.container}>
      <CustomButton title="Back to Admin" onPress={() => navigation.goBack()} variant="outlined" />
      <CustomButton title="Create New Lesson" onPress={() => openModal()} variant="filled" />
      {/* Search Bar */}
      <TextInput
        placeholder="Search by any attribute"
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={handleSearch}
      />
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <>
          <DataTable
            data={paginatedLessons}
            columns={[
              { key: 'title', label: 'Title' },
              { key: 'order', label: 'Order' },
              { key: 'duration', label: 'Duration (mins)' },
              { key: 'courseTitle', label: 'Course Title' }, // Custom key
              // Add other columns as necessary
            ]}
            onSort={handleSort}
            sortKey={sortKey}
            sortOrder={sortOrder}
            renderItem={renderLessonItem}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {/* Modal for creating/updating a lesson */}
      <RecordModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={saveLesson}
        title={isEditing ? 'Edit Lesson' : 'Create Lesson'}
      >
        {isEditing ? (
          // Display Course Title as read-only
          <View style={styles.readOnlyContainer}>
            <Text style={styles.label}>Course:</Text>
            <Text style={styles.readOnlyText}>
              {courseMap.get(currentLesson.courseId ?? '') || 'Unknown Course'}
            </Text>
          </View>
        ) : (
          // Picker to select Course when creating a new Lesson
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Course:</Text>
            <Picker
              selectedValue={currentLesson.courseId}
              onValueChange={(itemValue) =>
                setCurrentLesson({ ...currentLesson, courseId: itemValue })
              }
              style={styles.picker}>
              <Picker.Item label="Select a Course" value="" />
              {courses.map(course => (
                <Picker.Item key={course.id} label={course.title} value={course.id} />
              ))}
            </Picker>
          </View>
        )}
        <TextInput
          placeholder="Title"
          style={styles.input}
          value={currentLesson.title ?? ''}
          onChangeText={(text) => setCurrentLesson({ ...currentLesson, title: text })}
        />
        <TextInput
          placeholder="Description"
          style={styles.input}
          value={currentLesson.description ?? ''}
          onChangeText={(text) => setCurrentLesson({ ...currentLesson, description: text })}
        />
        <TextInput
          placeholder="Order"
          style={styles.input}
          keyboardType="numeric"
          value={
            currentLesson.order !== undefined && !isNaN(currentLesson.order)
              ? currentLesson.order.toString()
              : ''
          }
          onChangeText={(text) => {
            const parsed = parseInt(text, 10);
            setCurrentLesson({ 
              ...currentLesson, 
              order: isNaN(parsed) ? 0 : parsed 
            });
          }}
        />
        <TextInput
          placeholder="Duration (mins)"
          style={styles.input}
          keyboardType="numeric"
          value={
            currentLesson.duration !== undefined && !isNaN(currentLesson.duration)
              ? currentLesson.duration.toString()
              : ''
          }
          onChangeText={(text) => {
            const parsed = parseInt(text, 10);
            setCurrentLesson({ 
              ...currentLesson, 
              duration: isNaN(parsed) ? 60 : parsed 
            });
          }}
        />
        {/* Add other input fields as necessary */}
      </RecordModal>
    </View>
  );
};

export default ControlLesson;

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
    marginRight: 10,
    borderRadius: 5,
  },
  deleteButton: {
    backgroundColor: '#D14C4C',
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
  readOnlyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    width: 100,
    fontWeight: 'bold',
  },
  readOnlyText: {
    flex: 1,
  },
  pickerContainer: {
    marginVertical: 5,
  },
  picker: {
    height: 50,
    width: '100%',
  },
});
