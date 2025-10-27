import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography } from '../../components/common';

const AllBookingsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Typography variant="h2" style={styles.title}>All Bookings</Typography>
      <Typography variant="body" style={styles.subtitle}>Monitor all platform bookings</Typography>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

export default AllBookingsScreen;
