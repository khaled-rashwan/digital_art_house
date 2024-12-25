// components/ControlUser.tsx
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
import RNPickerSelect from 'react-native-picker-select'; // Import RNPickerSelect for role selection

const client = generateClient<Schema>();

// Define UserType based on your schema, including the role attribute
type UserType = Schema['User']['type'];

// Define the response type from the list method
type ListUsersResponse = {
  data: UserType[];
  nextToken?: string;
};

const ControlUser = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // States for modal
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<Partial<UserType>>({});
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Sorting
  const [sortKey, setSortKey] = useState<keyof UserType | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filtering and Searching
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage: number = 10;
  const totalPages: number = Math.ceil(users.length / itemsPerPage);

  // Define the searchable attributes, including role
  const searchableKeys: (keyof UserType)[] = ['id', 'pocketBalance', 'role'];

  const navigation = useNavigation(); // Instantiate navigation

  useEffect(() => {
    fetchUsers();
  }, [sortKey, sortOrder, searchQuery, currentPage]);

  // Fetch all users with sorting and multi-attribute searching
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await client.models.User.list() as ListUsersResponse;
      let userList: UserType[] = response.data;

      // Multi-attribute Search
      if (searchQuery) {
        userList = userList.filter((user: UserType) => {
          return searchableKeys.some((key) => {
            const value = user[key];
            if (value === undefined || value === null) return false;

            // Convert value to string for comparison
            return value.toString().toLowerCase().includes(searchQuery.toLowerCase());
          });
        });
      }

      // Sorting
      if (sortKey) {
        userList.sort((a: UserType, b: UserType) => {
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

      setUsers(userList);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  };

  // Handle sorting
  const handleSort = (key: keyof UserType) => {
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
    setSearchQuery(text);
    setCurrentPage(1); // Reset to first page on search
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Create or update a user
  const saveUser = async () => {
    // Validate required fields
    if (!currentUser.id) {
      Alert.alert('Error', 'ID is required');
      return;
    }

    // Validate role
    if (!currentUser.role) {
      Alert.alert('Error', 'Role is required');
      return;
    }

    // Construct the user data
    const userData: Partial<UserType> = {
      id: currentUser.id,
      pocketBalance: currentUser.pocketBalance ?? 0, // Default to 0 if undefined or null
      role: currentUser.role, // Ensure role is included
      // Add other fields as necessary
    };

    try {
      if (isEditing) {
        // Update existing user
        await client.models.User.update({
          id: currentUser.id,
          ...userData,
        } as UserType);
        Alert.alert('Success', 'User updated successfully');
      } else {
        // Create new user
        await client.models.User.create(userData as UserType);
        Alert.alert('Success', 'User created successfully');
      }
      setModalVisible(false);
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      Alert.alert('Error', 'Failed to save user.');
    }
  };

  // Delete a user
  const deleteUser = async (id: string) => {
    try {
      await client.models.User.delete({ id });
      Alert.alert('Success', 'User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      Alert.alert('Error', 'Failed to delete user.');
    }
  };

  // Open modal for creating or editing a user
  const openModal = (user?: UserType) => {
    if (user) {
      const { id, pocketBalance, role } = user;
      setCurrentUser({ id, pocketBalance, role });
      setIsEditing(true);
    } else {
      setCurrentUser({});
      setIsEditing(false);
    }
    setModalVisible(true);
  };

  // Render each user item
  const renderUserItem = (user: UserType) => (
    <View key={user.id} style={styles.itemContainer}>
      <View style={styles.itemRow}>
        <Text style={styles.itemText}>{user.id}</Text>
        <Text style={styles.itemText}>{user.pocketBalance}</Text>
        <Text style={styles.itemText}>{user.role}</Text> {/* Display role */}
        <View style={styles.itemActions}>
          <TouchableOpacity onPress={() => openModal(user)} style={styles.editButton}>
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteUser(user.id)} style={styles.deleteButton}>
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Calculate paginated data
  const paginatedUsers = users.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <View style={styles.container}>
      <CustomButton title="Back to Admin" onPress={() => navigation.goBack()} variant="outlined" />
      <CustomButton title="Create New User" onPress={() => openModal()} variant="filled" />
      {/* Search Bar */}
      <TextInput
        placeholder="Search by ID, Pocket Balance, or Role"
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={handleSearch}
      />
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <>
          <DataTable
            data={paginatedUsers}
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'pocketBalance', label: 'Pocket Balance' },
              { key: 'role', label: 'Role' }, // Add Role column
            ]}
            onSort={handleSort}
            sortKey={sortKey}
            sortOrder={sortOrder}
            renderItem={renderUserItem}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {/* Modal for creating/updating a user */}
      <RecordModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={saveUser}
        title={isEditing ? 'Edit User' : 'Create User'}
      >
        <TextInput
          placeholder="ID"
          style={styles.input}
          value={currentUser.id ?? ''}
          onChangeText={(text) => setCurrentUser({ ...currentUser, id: text })}
          editable={!isEditing} // Prevent editing ID when updating
        />
        <TextInput
          placeholder="Pocket Balance"
          style={styles.input}
          keyboardType="numeric"
          value={
            currentUser.pocketBalance !== undefined &&
            currentUser.pocketBalance !== null &&
            !isNaN(currentUser.pocketBalance)
              ? currentUser.pocketBalance.toString()
              : ''
          }
          onChangeText={(text) => {
            const parsed = parseFloat(text);
            setCurrentUser({ 
              ...currentUser, 
              pocketBalance: isNaN(parsed) ? 0 : parsed 
            });
          }}
        />
        {/* Add Role Picker */}
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Select Role:</Text>
          <RNPickerSelect
            onValueChange={(value) => setCurrentUser({ ...currentUser, role: value })}
            items={[
              { label: 'Student', value: 'Student' },
              { label: 'Instructor', value: 'Instructor' },
              { label: 'Admin', value: 'Admin' },
            ]}
            placeholder={{ label: 'Select a role...', value: '' }}
            style={pickerSelectStyles}
            value={currentUser.role ?? ''}
          />
        </View>
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
    marginVertical: 10,
  },
  label: {
    marginBottom: 5,
    fontWeight: 'bold',
  },
});

// Picker styles
const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    color: 'black',
    paddingRight: 30, // To ensure the text is never behind the icon
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: '#ccc',
    borderRadius: 8,
    color: 'black',
    paddingRight: 30, // To ensure the text is never behind the icon
  },
});
