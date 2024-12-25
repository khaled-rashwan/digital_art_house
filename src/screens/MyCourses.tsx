import * as React from 'react';
import { useEffect, useState } from 'react';
import { View, Pressable, Text, StyleSheet, FlatList, Image, Platform, Alert } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { generateClient } from "aws-amplify/data";
import { fetchUserAttributes, FetchUserAttributesOutput } from 'aws-amplify/auth';

import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAngleUp, faAngleDown } from '@fortawesome/free-solid-svg-icons';
import globalStyles from '../styles/globalStyles';
import type { Schema } from "../../amplify/data/resource";

// Generate client for Amplify
const client = generateClient<Schema>();

const MyCourses = () => {
  /* =========================
      State Variables
  ========================= */
  const [user, setUser] = useState<FetchUserAttributesOutput | null>(null);
  const [userCourses, setUserCourses] = useState<Schema["Course"]["type"][]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 4;

  // Calculate the number of pages
  const totalPages = Math.ceil(userCourses.length / itemsPerPage);

  // Slice data for the current page
  const paginatedData = userCourses.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  /* =========================
      Pagination Handlers
  ========================= */
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

  /* =================================
      Fetch and Set User Data
      Fetch User Applications from DynamoDB
  ================================= */
  useEffect(() => {
    const fetchUserCourses = async () => {
      try {
        const currentUser = await fetchUserAttributes();
        setUser(currentUser);
        // Fetch all applications
        const { data: applications } = await client.models.Application.list();
  
        // Fetch courses for each application
        const coursesPromises = applications.map(async (application) => {
          const courseId = application?.courseId ?? "";
          if (courseId) {
            // Fetch the course by its ID
            const { data: course } = await client.models.Course.get({ id: courseId });
            return course; // Return the course
          }
          return null; // Return null if courseId is not defined
        });
  
        // Resolve all course promises and filter out null values
        const courses = (await Promise.all(coursesPromises)).filter(
          (course): course is NonNullable<typeof course> => course !== null
        );
  
        // Update the state with resolved courses
        setUserCourses(courses);
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };
  
    fetchUserCourses();
  }, []);  

  /* =========================
      Render Functions
  ========================= */
  // Render course item for FlatList
  const renderCourseItem = ({ item }: { item: Schema["Course"]["type"] }) => (
    <View key={item.id} style={styles.courseItem}>
      <Image
          source={
            Platform.OS === 'web'
              ? { uri: '/assets/icon3.png' } // Path to your logo on the web
              : require('../../assets/icon3.png')  // Path to your logo for native apps (e.g., in an `assets` folder)
          }
        style={styles.courseIcon}
      />
      <View style={styles.courseDetails}>
        <Text style={styles.courseTitle}>{item.title || ""}</Text>
        <Text style={styles.courseDescription}>{item.description || ""}</Text>
      </View>
    </View>
  );

  /* =========================
      Render Component
  ========================= */
  return (
    
    <View style={globalStyles.container}>
      {/* Header */}
      <View style={globalStyles.header}>
        <LinearGradient colors={['#FFE864', '#FFE15D']} style={globalStyles.gradient}>
          {/* You can add header content here if needed */}
        </LinearGradient>
      </View>
        {/* Overlay Component */}
      <View style={globalStyles.overlayComponent}>
        <Text style={globalStyles.title}>my courses</Text>
        <View style={globalStyles.content}>
          <FlatList
            data={paginatedData}
            renderItem={renderCourseItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            ItemSeparatorComponent={() => <View style={styles.listItemSeparator} />}
            ListEmptyComponent={() => <Text style={styles.emptyList}>No courses available</Text>}
            ListFooterComponent={() => (
              <View style={styles.paginationContainer}>
                {currentPage > 0 && (
                  <Pressable style={styles.paginationArrow} onPress={goToPreviousPage}>
                    <FontAwesomeIcon icon={faAngleUp} color={'#6C7481'} size={30} />
                  </Pressable>
                )}
                {currentPage < totalPages - 1 && (
                  <Pressable style={styles.paginationArrow} onPress={goToNextPage}>
                    <FontAwesomeIcon icon={faAngleDown} color={'#6C7481'} size={30} />
                  </Pressable>
                )}
              </View>
            )}
          />
        </View>
      </View>
      {/* Body */}
      <View style={globalStyles.body}>
        {/* You can add additional body content here */}
      </View>
    </View>
  );
};

/* =========================
    Styles
========================= */
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
});

export default MyCourses;
