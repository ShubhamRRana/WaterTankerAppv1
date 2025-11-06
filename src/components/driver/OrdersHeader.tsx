import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '../common';
import { UI_CONFIG } from '../../constants/config';

interface OrdersHeaderProps {
  userName?: string;
  onLogout: () => void;
}

const OrdersHeader: React.FC<OrdersHeaderProps> = ({ userName, onLogout }) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Typography variant="h2" style={styles.title}>
          Welcome, {userName || 'Driver'}!
        </Typography>
        <Typography variant="body" style={styles.subtitle}>
          Manage your orders and deliveries
        </Typography>
      </View>
      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={onLogout}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={24} color={UI_CONFIG.colors.error} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: UI_CONFIG.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: UI_CONFIG.colors.surface,
    shadowColor: UI_CONFIG.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default OrdersHeader;

