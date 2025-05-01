import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { View, Pressable, Text, StyleSheet, FlatList, Image, Platform, TextInput, Linking } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { generateClient } from "aws-amplify/data";
import { fetchUserAttributes, FetchUserAttributesOutput } from 'aws-amplify/auth';

import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAngleUp, faAngleDown } from '@fortawesome/free-solid-svg-icons';
import globalStyles from '../styles/globalStyles';
import type { Schema } from "../../amplify/data/resource";
import {jwtDecode, JwtPayload } from 'jwt-decode';
import { fetchAuthSession } from "aws-amplify/auth";

// Generate client for Amplify
const client = generateClient<Schema>();

interface MyCoursesListProps {
  userCourses: Schema["Course"]["type"][];
  currentPage: number;
  itemsPerPage: number;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  totalPages: number;
  isInstructor: boolean;
  loading: boolean;
}

const MyCoursesList: React.FC<MyCoursesListProps> = ({
  userCourses,
  currentPage,
  itemsPerPage,
  goToNextPage,
  goToPreviousPage,
  totalPages,
  isInstructor,
  loading,
}) => {
  const displayedCourses = useMemo(() => {
    return userCourses.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
  }, [userCourses, currentPage, itemsPerPage]);

  const renderCourseItem = ({ item }: { item: Schema["Course"]["type"] }) => (
    <View key={item.id} style={styles.courseItem}>
      <Image
        source={
          Platform.OS === 'web'
            ? { uri: '/assets/profile-picture.png' }
            : require('../../assets/profile-picture.png')
        }
        style={styles.courseIcon}
      />
      <View style={styles.courseDetails}>
        <Text style={styles.courseTitle}>{item.title || ""}</Text>
        <Text style={styles.courseDescription}>{item.description || ""}</Text>
        {isInstructor && (
          <Text style={styles.instructorName}>Instructor: {item.instructor?.name || "Unknown"}</Text>
        )}
      </View>
    </View>
  );

  return (
    <FlatList
      data={displayedCourses}
      renderItem={renderCourseItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      ItemSeparatorComponent={() => <View style={styles.listItemSeparator} />}
      ListEmptyComponent={() => (
        <Text style={styles.emptyList}>
          {loading ? "Loading courses..." : "No courses available in My Courses"}
        </Text>
      )}
      ListFooterComponent={() => (
        <View style={styles.paginationContainer}>
          {currentPage > 0 && <Pressable style={styles.paginationArrow} onPress={goToPreviousPage}><FontAwesomeIcon icon={faAngleUp} color={'#6C7481'} size={30} /></Pressable>}{currentPage < totalPages - 1 && <Pressable style={styles.paginationArrow} onPress={goToNextPage}><FontAwesomeIcon icon={faAngleDown} color={'#6C7481'} size={30} /></Pressable>}
        </View>
      )}
    />
  );
};

interface AllCoursesListProps {
  allCourses: Schema["Course"]["type"][];
  currentPage: number;
  itemsPerPage: number;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  totalPages: number;
  loading: boolean;
  joinedCourseIds: string[]; // <-- Added prop
}

const AllCoursesList: React.FC<AllCoursesListProps> = ({
  allCourses,
  currentPage,
  itemsPerPage,
  goToNextPage,
  goToPreviousPage,
  totalPages,
  loading,
  joinedCourseIds, // <-- Added destructuring
}) => {
  const displayedCourses = useMemo(() => {
    return allCourses.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
  }, [allCourses, currentPage, itemsPerPage]);

  const renderCourseItem = ({ item }: { item: Schema["Course"]["type"] }) => (
    <View key={item.id} style={styles.courseItem}>
      <Image
        source={
          Platform.OS === 'web'
            ? { uri: '/assets/profile-picture.png' }
            : require('../../assets/profile-picture.png')
        }
        style={styles.courseIcon}
      />
      <View style={styles.courseDetails}>
        <Text style={styles.courseTitle}>{item.title || ""}</Text>
        <Text style={styles.courseDescription}>{item.description || ""}</Text>
      </View>
      { joinedCourseIds.includes(item.id)
        ? <Text style={[styles.joinButtonText, { padding: 5 }]}>Joined</Text>
        : (
          <Pressable
            style={styles.joinButton}
            onPress={() => {
              const message = `Hi, I'm interested in joining the course ${item.title}.`;
              const url = `https://wa.me/97450540272?text=${encodeURIComponent(message)}`;
              Linking.openURL(url);
            }}
          >
            <Text style={styles.joinButtonText}>Join</Text>
          </Pressable>
        )
      }
    </View>
  );

  return (
    <FlatList
      data={displayedCourses}
      renderItem={renderCourseItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      ItemSeparatorComponent={() => <View style={styles.listItemSeparator} />}
      ListEmptyComponent={() => (
        <Text style={styles.emptyList}>
          {loading ? "Loading courses..." : "No courses available in All Courses"}
        </Text>
      )}
      ListFooterComponent={() => (
        <View style={styles.paginationContainer}>
          {currentPage > 0 && <Pressable style={styles.paginationArrow} onPress={goToPreviousPage}><FontAwesomeIcon icon={faAngleUp} color={'#6C7481'} size={30} /></Pressable>}{currentPage < totalPages - 1 && <Pressable style={styles.paginationArrow} onPress={goToNextPage}><FontAwesomeIcon icon={faAngleDown} color={'#6C7481'} size={30} /></Pressable>}
        </View>
      )}
    />
  );
};

const MyCourses = () => {
  // Extend JwtPayload to include cognito:groups
  interface CognitoJwtPayload extends JwtPayload {
  'cognito:groups'?: string[];
  }
  const [isInstructor, setIsInstructor] = useState(false); // State variable to track admin status
  const [user, setUser] = useState<FetchUserAttributesOutput | null>(null);
  const [userCourses, setUserCourses] = useState<Schema["Course"]["type"][]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 4;
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'my'>('my');
  const [allCourses, setAllCourses] = useState<Schema["Course"]["type"][]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const totalPages = Math.ceil(
    (selectedCategory === 'my' ? userCourses.length : allCourses.length) / itemsPerPage
  );

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const filteredUserCourses = useMemo(() => 
    userCourses.filter(course => course.title?.toLowerCase().includes(searchTerm.toLowerCase())),
    [userCourses, searchTerm]
  );
  const filteredAllCourses = useMemo(() => 
    allCourses.filter(course => course.title?.toLowerCase().includes(searchTerm.toLowerCase())),
    [allCourses, searchTerm]
  );

  useEffect(() => {
    async function getUserGroups() {
      try {
        // Fetch the current authentication session
        const session = await fetchAuthSession();
  
        // Extract the ID token from the session
        const idToken = session.tokens?.idToken;
        if (!idToken) {
          throw new Error('ID Token is undefined or invalid');
        }
  
        // Decode the ID token to access its claims
        const decodedToken = jwtDecode<CognitoJwtPayload>(idToken.toString());
        // Extract the cognito:groups claim, which contains the user's groups
        const userGroups = decodedToken['cognito:groups'] || [];
        const userId = decodedToken.sub || "";
  
        if (userGroups.includes('Admin') || userGroups.includes('Instructor')) {
          setIsInstructor(true);
          setUser({ uid: userId, groups: userGroups.join(',') }); // Convert array to a comma-separated string
          await fetchInstructorCourses(userId);
          await fetchAllCourses(); // Ensure all courses are fetched for instructors
        } else {
          await fetchAllCourses();
          await fetchUserCourses();
        }
      } catch (error) {
        console.error("Error determining user role:", error);
      }
    }
  
    const fetchAllCourses = async () => {
      try {
        const { data: courses } = await client.models.Course.list();
        setAllCourses(courses);
      } catch (error) {
        console.error("Error fetching all courses:", error);
      }
    };
  
    const fetchUserCourses = async () => {
      try {
        const currentUser = await fetchUserAttributes();
        setUser(currentUser);
  
        const { data: applications } = await client.models.Application.list();
        const coursesPromises = applications.map(async (application) => {
          const courseId = application?.courseId ?? "";
          if (courseId) {
            const { data: course } = await client.models.Course.get({ id: courseId });
            return course;
          }
          return null;
        });
  
        const courses = (await Promise.all(coursesPromises)).filter(
          (course): course is NonNullable<typeof course> => course !== null
        );
        setUserCourses(courses);
      } catch (error) {
        console.error("Error fetching user courses:", error);
      }
    };
  
    const fetchInstructorCourses = async (userId: string) => {
      try {
        const { data: courses } = await client.models.Course.list();
        const instructorCourses = courses.filter(
          (course) => course.instructorId === userId
        );
        setUserCourses(instructorCourses);
      } catch (error) {
        console.error("Error fetching instructor courses:", error);
      }
    };
  
    const fetchData = async () => {
      setLoading(true);
      await getUserGroups();
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <View style={globalStyles.container}>
      <View style={globalStyles.header}>
        <LinearGradient colors={['#FFE864', '#FFE15D']} style={globalStyles.gradient} />
      </View>
      <View style={globalStyles.overlayComponent}>
        <Text style={globalStyles.title}>Courses</Text>
        <View style={styles.categoryToggle}>
          <Pressable
            style={[
              styles.categoryButton,
              selectedCategory === 'my' && styles.activeCategoryButton,
            ]}
            onPress={() => { setSelectedCategory('my'); setCurrentPage(0); }}
          >
            <Text style={styles.categoryButtonText}>My Courses</Text>
          </Pressable>
          <Pressable
            style={[
              styles.categoryButton,
              selectedCategory === 'all' && styles.activeCategoryButton,
            ]}
            onPress={() => { setSelectedCategory('all'); setCurrentPage(0); }}
          >
            <Text style={styles.categoryButtonText}>All Courses</Text>
          </Pressable>
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search courses..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <View style={globalStyles.content}>
          {selectedCategory === 'my' ? (
            <MyCoursesList
              userCourses={filteredUserCourses}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              goToNextPage={goToNextPage}
              goToPreviousPage={goToPreviousPage}
              totalPages={totalPages}
              isInstructor={isInstructor}
              loading={loading}
            />
          ) : (
            <AllCoursesList
              allCourses={filteredAllCourses}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              goToNextPage={goToNextPage}
              goToPreviousPage={goToPreviousPage}
              totalPages={totalPages}
              loading={loading}
              joinedCourseIds={userCourses.map(course => course.id)} // <-- Pass joined courses
            />
          )}
        </View>
      </View>
      <View style={globalStyles.body} />
    </View>
  );
};

const styles = StyleSheet.create({
  listItemSeparator: {
    height: 0, // Thickness of the separator line
    backgroundColor: '#6C7481', // Color of the separator line
    marginVertical: 15,
  },
  listContainer: {
    flexGrow: 1,
  },
  courseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  courseIcon: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    marginRight: 20,
  },
  courseDetails: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  courseDescription: {
    fontSize: 14,
    color: '#777',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationArrow: {
  },
  emptyList: {
    textAlign: 'center',
    fontSize: 18,
    color: 'red',
    marginTop: 20,
  },
  categoryToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  categoryButton: {
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 5,
    backgroundColor: '#EEE',
  },
  activeCategoryButton: {
    backgroundColor: '#FFE15D',
  },
  categoryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructorName: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
  searchInput: {
    height: 40,
    marginHorizontal: 20,
    marginBottom: 15,
    borderColor: '#CCC',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  joinButton: {
    backgroundColor: '#FFE15D',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  joinButtonText: {
    fontSize: 14,
    color: '#333',
  },
});

export default MyCourses;
