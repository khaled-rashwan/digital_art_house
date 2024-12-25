// components/DataTable.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';

type DataTableProps<T> = {
  data: T[];
  columns: Array<{ key: keyof T; label: string }>;
  onSort: (columnKey: keyof T) => void;
  sortKey: keyof T | null;
  sortOrder: 'asc' | 'desc';
  renderItem: (item: T) => React.ReactElement;
};

const DataTable = <T extends { id: string }>({
  data,
  columns,
  onSort,
  sortKey,
  sortOrder,
  renderItem,
}: DataTableProps<T>) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        {columns.map((column) => (
          <TouchableOpacity
            key={column.key as string}
            style={styles.headerCell}
            onPress={() => onSort(column.key)}
          >
            <Text style={styles.headerText}>
              {column.label}
              {sortKey === column.key ? (sortOrder === 'asc' ? ' 🔼' : ' 🔽') : ''}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.headerCell}>
          <Text style={styles.headerText}>Actions</Text>
        </View>
      </View>
      {/* Data Rows */}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderItem(item)}
      />
    </View>
  );
};

export default DataTable;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f1f1',
    paddingVertical: 10,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
  },
  headerText: {
    fontWeight: 'bold',
  },
});
