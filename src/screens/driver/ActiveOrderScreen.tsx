import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography } from '../../components/common';
import { UI_CONFIG } from '../../constants/config';

const ActiveOrderScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Typography variant='h2' style={styles.title}>Active Order</Typography>
      <Typography variant='body' style={styles.subtitle}>Update delivery status</Typography>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
  },
});

export default ActiveOrderScreen;
