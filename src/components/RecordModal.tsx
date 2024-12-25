// components/RecordModal.tsx

import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Modal } from 'react-native';
import CustomButton from './CustomButton';

type RecordModalProps<T> = {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  children: React.ReactNode;
};

const RecordModal: React.FC<RecordModalProps<any>> = ({
  visible,
  onClose,
  onSubmit,
  title,
  children,
}) => {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>{title}</Text>
        {children}
        <View style={styles.modalActions}>
          <CustomButton title="Save" onPress={onSubmit} variant="filled" />
          <CustomButton title="Cancel" onPress={onClose} variant="outlined" />
        </View>
      </View>
    </Modal>
  );
};

export default RecordModal;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
});
