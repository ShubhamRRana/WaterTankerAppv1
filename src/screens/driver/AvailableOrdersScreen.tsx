import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AvailableOrdersScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Available Orders</Text>
      <Text style={styles.subtitle}>Accept new delivery requests</Text>
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

export default AvailableOrdersScreen;
