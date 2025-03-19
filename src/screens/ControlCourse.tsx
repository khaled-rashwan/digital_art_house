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
import type { Schema } from '../../amplify/data/resource'; // Import Nullable
import CustomButton from '../components/CustomButton';
import DataTable from '../components/DataTable';
import RecordModal from '../components/RecordModal';
import Pagination from '../components/Pagination';
import { Picker } from '@react-native-picker/picker'; // Correct import for Picker

const client = generateClient<Schema>();

// Define CourseType based on your schema
type CourseType = Schema['Course']['type'];

const ControlCourse = () => {
  const [courses, setCourses] = useState<CourseType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [instructors, setInstructors] = useState<{ id: string; name: string }[]>([]); // State to store instructors

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
  const itemsPerPage: number = 5; // Adjusted to match ControlLesson
  const totalPages: number = Math.ceil(courses.length / itemsPerPage);

  const navigation = useNavigation();

  // Fetch instructors
  useEffect(() => {
    const fetchInstructors = async () => {
      try {
        // Call the Instructors query
        const { data, errors } = await client.queries.Instructors();

        if (data && data.instructors) {
          // Parse the instructors and store them in state
          const instructorList = JSON.parse(data.instructors).map((instructor: { username: string; name: string }) => ({
            id: instructor.username, // Use username as the ID (sub)
            name: instructor.name,
          }));
          setInstructors(instructorList);
        }

        if (errors) {
          console.error("GraphQL Errors:", errors);
        }
      } catch (error) {
        console.error("Error fetching instructors:", error);
      }
    };

    fetchInstructors();
  }, []);

  // Fetch courses
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

  const sanitizeCourse = (course: Partial<CourseType>): CourseType => {
    const { id, title, cost, duration } = course;
    if (!title || cost === undefined || duration === undefined) {
      throw new Error("Sanitized course is missing required properties");
    }
    return {
      id: id ?? undefined, // Optional if id is not required for creation
      title: title!,
      cost: cost!,
      duration: duration!,
      available: course.available ?? false, // Default to false if not provided
      description: course.description ?? '', // Default to empty string
      instructorId: course.instructorId ?? '', // Default to empty string or null if that's acceptable
    } as CourseType;
  };

  // Create or update a course
  const saveCourse = async () => {
    if (!currentCourse.title || currentCourse.cost === undefined || currentCourse.duration === undefined) {
      Alert.alert('Error', 'Please fill in all required fields (Title, Cost, Duration).');
      return;
    }

    try {
      if (isEditing) {
        if (!currentCourse.id) {
          Alert.alert('Error', 'Course ID is missing for update.');
          return;
        }
        const courseToUpdate = sanitizeCourse(currentCourse);
        await client.models.Course.update(courseToUpdate);
        Alert.alert('Success', 'Course updated successfully');
      } else {
        // Create new course
        const courseToCreate = sanitizeCourse(currentCourse);
        await client.models.Course.create(courseToCreate);
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

  // Render each course item
  const renderCourseItem = (course: CourseType) => {
    return (
      <View key={course.id} style={styles.itemContainer}>
        <View style={styles.itemRow}>
          <Text style={styles.itemText}>{course.title}</Text>
          <Text style={styles.itemText}>{course.cost}</Text>
          <Text style={styles.itemText}>{course.duration}</Text>
          <Text style={styles.itemText}>{course.available ? 'Yes' : 'No'}</Text>
          <View style={styles.itemActions}>
            <TouchableOpacity onPress={() => openModal(course)} style={styles.editButton}>
              <Text style={styles.buttonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteCourse(course.id)} style={styles.deleteButton}>
              <Text style={styles.buttonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

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
            renderItem={renderCourseItem}
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
          placeholder="Title*"
          style={styles.input}
          value={currentCourse.title ?? ''}
          onChangeText={(text) => setCurrentCourse({ ...currentCourse, title: text })}
        />
        <TextInput
          placeholder="Cost*"
          style={styles.input}
          value={currentCourse.cost?.toString() ?? ''}
          keyboardType="numeric"
          onChangeText={(text) => setCurrentCourse({ ...currentCourse, cost: parseFloat(text) })}
        />
        <TextInput
          placeholder="Duration*"
          style={styles.input}
          value={currentCourse.duration?.toString() ?? ''}
          keyboardType="numeric"
          onChangeText={(text) => setCurrentCourse({ ...currentCourse, duration: parseInt(text, 10) })}
        />
        <TextInput
          placeholder="Description (optional)"
          style={styles.input}
          value={currentCourse.description ?? ''}
          onChangeText={(text) => setCurrentCourse({ ...currentCourse, description: text })}
        />
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Instructor (optional):</Text>
          <Picker
            selectedValue={currentCourse.instructorId ?? ''}
            onValueChange={(itemValue) => setCurrentCourse({ ...currentCourse, instructorId: itemValue })}
            style={styles.picker}
          >
            <Picker.Item label="Select Instructor" value="" />
            {instructors.map((instructor) => (
              <Picker.Item key={instructor.id} label={instructor.name} value={instructor.id} />
            ))}
          </Picker>
        </View>
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
  pickerContainer: {
    marginVertical: 5,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  label: {
    width: 100,
    fontWeight: 'bold',
  },
});