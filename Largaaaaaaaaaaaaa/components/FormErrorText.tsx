// Form Error Text - renders field-level and form-level validation messages.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface FormErrorTextProps {
  error?: string;
  visible?: boolean;
}

export default function FormErrorText({ error, visible = true }: FormErrorTextProps) {
  if (!error || !visible) return null;

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#EF4444" />
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginLeft: 2,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#EF4444',
  },
});
