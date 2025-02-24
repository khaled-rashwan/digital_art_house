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

// Define TransactionType based on your schema
type TransactionType = Schema['Transaction']['type'];

const ControlTransaction = () => {
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal states
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [currentTransaction, setCurrentTransaction] = useState<Partial<TransactionType>>({});
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Sorting
  const [sortKey, setSortKey] = useState<keyof TransactionType | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Searching
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage: number = 10;
  const totalPages: number = Math.ceil(transactions.length / itemsPerPage);

  const navigation = useNavigation();

  useEffect(() => {
    fetchTransactions();
  }, [sortKey, sortOrder, searchQuery, currentPage]);

  // Fetch all transactions with sorting and searching
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = (await client.models.Transaction.list()) as { data: TransactionType[]; nextToken?: string };
      let transactionList: TransactionType[] = response.data;

      // Filter by search query
      if (searchQuery) {
        transactionList = transactionList.filter((transaction: TransactionType) => {
          return ['transactionType', 'description'].some((key) => {
            const value = transaction[key as keyof TransactionType];
            return value?.toString().toLowerCase().includes(searchQuery.toLowerCase());
          });
        });
      }

      // Sorting
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

  // Create or update a transaction
  const saveTransaction = async () => {
    if (!currentTransaction.userId || !currentTransaction.amount || !currentTransaction.transactionType) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    try {
      if (isEditing) {
        // Update existing transaction
        await client.models.Transaction.update(currentTransaction as TransactionType);
        Alert.alert('Success', 'Transaction updated successfully');
      } else {
        // Create new transaction
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

  // Delete a transaction
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

  // Open modal for creating or editing a transaction
  const openModal = (transaction?: TransactionType) => {
    if (transaction) {
      setCurrentTransaction(transaction);
      setIsEditing(true);
    } else {
      setCurrentTransaction({});
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

  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
              { key: 'userId', label: 'User ID' },
              { key: 'amount', label: 'Amount' },
              { key: 'transactionType', label: 'Transaction Type' },
              { key: 'date', label: 'Date' },
            ]}
            onSort={handleSort}
            sortKey={sortKey}
            sortOrder={sortOrder}
            renderItem={(transaction: TransactionType) => (
              <View key={transaction.id} style={styles.itemContainer}>
                <Text>{transaction.transactionType}</Text>
                <TouchableOpacity onPress={() => openModal(transaction)}>
                  <Text>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteTransaction(transaction.id)}>
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
        onSubmit={saveTransaction}
        title={isEditing ? 'Edit Transaction' : 'Create Transaction'}
      >
        <TextInput
          placeholder="User ID"
          value={currentTransaction.userId ?? ''}
          onChangeText={(text) => setCurrentTransaction({ ...currentTransaction, userId: text })}
        />
        <TextInput
          placeholder="Amount"
          value={currentTransaction.amount?.toString() ?? ''}
          keyboardType="numeric"
          onChangeText={(text) => setCurrentTransaction({ ...currentTransaction, amount: parseFloat(text) })}
        />
        <TextInput
          placeholder="Transaction Type"
          value={currentTransaction.transactionType ?? ''}
          onChangeText={(text) => setCurrentTransaction({ ...currentTransaction, transactionType: text })}
        />
        <TextInput
          placeholder="Date"
          value={currentTransaction.date ?? ''}
          onChangeText={(text) => setCurrentTransaction({ ...currentTransaction, date: text })}
        />
        <TextInput
          placeholder="Description"
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
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});
