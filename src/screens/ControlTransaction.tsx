import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import CustomButton from '../components/CustomButton';
import DataTable from '../components/DataTable';
import RecordModal from '../components/RecordModal';
import Pagination from '../components/Pagination';
import { Picker } from '@react-native-picker/picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

const client = generateClient<Schema>();

// Define types based on your schema
type TransactionType = Schema['Transaction']['type'];
type ApplicationType = Schema['Application']['type'];
type CourseType = Schema['Course']['type'];

const ControlTransaction = () => {
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  // Updated student type to include email
  const [students, setStudents] = useState<{ id: string; name: string; email: string }[]>([]);
  const [applications, setApplications] = useState<ApplicationType[]>([]);
  const [courses, setCourses] = useState<CourseType[]>([]);

  // Modal states
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [currentTransaction, setCurrentTransaction] = useState<Partial<TransactionType>>({});
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState<boolean>(false);

  // Sorting
  const [sortKey, setSortKey] = useState<keyof TransactionType | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Searching
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage: number = 5;
  const totalPages: number = Math.ceil(transactions.length / itemsPerPage);

  const navigation = useNavigation();

  // Fetch students from Cognito with email
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
            id: user.username,
            name: user.name || '',
            email: user.email || ''
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
    const fetchApplications = async () => {
      try {
        const response = await client.models.Application.list();
        setApplications(response.data);
      } catch (error) {
        console.error('Error fetching applications:', error);
      }
    };
    fetchApplications();
  }, []);

  // Fetch transactions from DynamoDB
  useEffect(() => {
    fetchTransactions();
  }, [sortKey, sortOrder, searchQuery, currentPage]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await client.models.Transaction.list() as { data: TransactionType[]; nextToken?: string };
      let transactionList: TransactionType[] = response.data;

      if (searchQuery) {
        transactionList = transactionList.filter((transaction: TransactionType) => {
          return ['transactionType', 'amount', 'description'].some((key) => {
            const value = transaction[key as keyof TransactionType];
            return value?.toString().toLowerCase().includes(searchQuery.toLowerCase());
          });
        });
      }

      if (sortKey) {
        transactionList.sort((a: TransactionType, b: TransactionType) => {
          const aValue = a[sortKey];
          const bValue = b[sortKey];

          if (aValue == null) return 1;
          if (bValue == null) return -1;
          if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      }

      setTransactions(transactionList);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      Alert.alert('Error', 'Failed to fetch transactions.');
    } finally {
      setLoading(false);
    }
  };

  const saveTransaction = async () => {
    if (
      !currentTransaction.userId ||
      !currentTransaction.amount ||
      !currentTransaction.transactionType ||
      !currentTransaction.date
    ) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    try {
      if (isEditing) {
        await client.models.Transaction.update(currentTransaction as TransactionType);
        Alert.alert('Success', 'Transaction updated successfully');
      } else {
        await client.models.Transaction.create(currentTransaction as TransactionType);
        Alert.alert('Success', 'Transaction created successfully');
      }
      setModalVisible(false);
      fetchTransactions();
    } catch (error) {
      console.error('Error saving transaction:', error);
      Alert.alert('Error', 'Failed to save transaction.');
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      await client.models.Transaction.delete({ id });
      Alert.alert('Success', 'Transaction deleted successfully');
      fetchTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      Alert.alert('Error', 'Failed to delete transaction.');
    }
  };

  const openModal = (transaction?: TransactionType) => {
    if (transaction) {
      setCurrentTransaction(transaction);
      setIsEditing(true);
    } else {
      setCurrentTransaction({ date: new Date().toISOString() });
      setIsEditing(false);
    }
    setModalVisible(true);
  };

  const handleSort = (key: keyof TransactionType) => {
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
    return student.name && student.name.trim() !== '' 
      ? `${student.name} (${student.email})` 
      : student.email;
  };

  const renderTransactionItem = (transaction: TransactionType) => {
    const studentDisplay = formatStudentDisplay(transaction.userId);
    const application = applications.find(app => app.id === transaction.relatedApplicationId);
    const courseName = application
      ? courses.find(course => course.id === application.courseId)?.title || 'N/A'
      : 'N/A';
    return (
      <View key={transaction.id} style={styles.itemContainer}>
        <View style={styles.itemRow}>
          <Text style={styles.itemText}>{studentDisplay}</Text>
          <Text style={styles.itemText}>{transaction.amount}</Text>
          <Text style={styles.itemText}>{transaction.transactionType}</Text>
          <Text style={styles.itemText}>{new Date(transaction.date).toLocaleDateString()}</Text>
          <Text style={styles.itemText}>{transaction.description || 'N/A'}</Text>
          <Text style={styles.itemText}>{courseName}</Text>
          <View style={styles.itemActions}>
            <TouchableOpacity onPress={() => openModal(transaction)} style={styles.editButton}>
              <Text style={styles.buttonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteTransaction(transaction.id)} style={styles.deleteButton}>
              <Text style={styles.buttonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Date picker handlers for mobile
  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirm = (date: Date) => {
    setCurrentTransaction({ ...currentTransaction, date: date.toISOString() });
    hideDatePicker();
  };

  // Web-specific date handler
  const handleWebDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(event.target.value);
    if (!isNaN(newDate.getTime())) {
      setCurrentTransaction({ ...currentTransaction, date: newDate.toISOString() });
    }
  };

  return (
    <View style={styles.container}>
      <CustomButton title="Back to Admin" onPress={() => navigation.goBack()} variant="outlined" />
      <CustomButton title="Create New Transaction" onPress={() => openModal()} variant="filled" />
      <TextInput
        placeholder="Search Transactions"
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={handleSearch}
      />
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <>
          <DataTable
            data={paginatedTransactions}
            columns={[
              { key: 'userId', label: 'Student' },
              { key: 'amount', label: 'Amount' },
              { key: 'transactionType', label: 'Type' },
              { key: 'date', label: 'Date' },
              { key: 'description', label: 'Description' },
              { key: 'relatedApplicationId', label: 'Course Name' },
            ]}
            onSort={handleSort}
            sortKey={sortKey}
            sortOrder={sortOrder}
            renderItem={renderTransactionItem}
          />
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
        </>
      )}
      <RecordModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={saveTransaction}
        title={isEditing ? 'Edit Transaction' : 'Create Transaction'}
      >
        {isEditing ? (
          <>
            <Text style={styles.readOnlyText}>
              Student: {formatStudentDisplay(currentTransaction.userId || '')}
            </Text>
            <Text style={styles.readOnlyText}>
              Course: {(() => {
                const application = applications.find(app => app.id === currentTransaction.relatedApplicationId);
                return application
                  ? courses.find(course => course.id === application.courseId)?.title || 'N/A'
                  : 'N/A';
              })()}
            </Text>
          </>
        ) : (
          <>
            <Picker
              selectedValue={currentTransaction.userId ?? ''}
              onValueChange={(itemValue) => setCurrentTransaction({ ...currentTransaction, userId: itemValue })}
              style={styles.picker}
            >
              <Picker.Item label="Select Student" value="" />
              {students.map((student) => (
                <Picker.Item 
                  key={student.id} 
                  label={student.name && student.name.trim() !== '' 
                    ? `${student.name} (${student.email})` 
                    : student.email} 
                  value={student.id} 
                />
              ))}
            </Picker>
            <Picker
              selectedValue={currentTransaction.relatedApplicationId ?? ''}
              onValueChange={(itemValue) => setCurrentTransaction({ ...currentTransaction, relatedApplicationId: itemValue })}
              style={styles.picker}
            >
              <Picker.Item label="Select Related Course (Optional)" value="" />
              {applications.map((app) => {
                const courseName = courses.find(course => course.id === app.courseId)?.title || app.id;
                return <Picker.Item key={app.id} label={courseName} value={app.id} />;
              })}
            </Picker>
          </>
        )}

        <TextInput
          placeholder="Amount"
          style={styles.readOnlyText}
          value={currentTransaction.amount?.toString() ?? ''}
          onChangeText={(text) => setCurrentTransaction({ ...currentTransaction, amount: parseFloat(text) || 0 })}
          keyboardType="numeric"
        />
        <Picker
          selectedValue={currentTransaction.transactionType ?? ''}
          onValueChange={(itemValue) => setCurrentTransaction({ ...currentTransaction, transactionType: itemValue })}
          style={styles.picker}
        >
          <Picker.Item label="Select Transaction Type" value="" />
          <Picker.Item label="Payment" value="payment" />
          <Picker.Item label="Refund" value="refund" />
          <Picker.Item label="Deduction" value="deduction" />
        </Picker>

        {/* Date Picker Section */}
        {Platform.OS === 'web' ? (
          <input
            type="date"
            value={currentTransaction.date ? new Date(currentTransaction.date).toISOString().split('T')[0] : ''}
            onChange={handleWebDateChange}
            style={{
              fontSize: 16,
              padding: 10,
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 5,
              width: '100%',
            }}
          />
        ) : (
          <>
            <TouchableOpacity style={styles.readOnlyText} onPress={showDatePicker}>
              <Text style={styles.dateText}>
                {currentTransaction.date
                  ? new Date(currentTransaction.date).toLocaleDateString()
                  : 'Select Date'}
              </Text>
            </TouchableOpacity>
            <DateTimePickerModal
              isVisible={isDatePickerVisible}
              mode="date"
              date={new Date(currentTransaction.date || Date.now())}
              onConfirm={handleConfirm}
              onCancel={hideDatePicker}
            />
          </>
        )}

        <TextInput
          placeholder="Description"
          style={styles.readOnlyText}
          value={currentTransaction.description ?? ''}
          onChangeText={(text) => setCurrentTransaction({ ...currentTransaction, description: text })}
        />
      </RecordModal>
    </View>
  );
};

export default ControlTransaction;

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
  picker: {
    height: 50,
    width: '100%',
  },
  readOnlyText: {
    fontSize: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginVertical: 5,
  },
  dateText: {
    fontSize: 16,
    color: '#000',
  },
});