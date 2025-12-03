import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography } from '../common';
import { UI_CONFIG } from '../../constants/config';

interface OrdersHeaderProps {
  userName?: string;
}

const OrdersHeader: React.FC<OrdersHeaderProps> = memo(({ userName }) => {
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
    </View>
  );
});

OrdersHeader.displayName = 'OrdersHeader';

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
});

export default OrdersHeader;

