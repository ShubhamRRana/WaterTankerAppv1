import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Typography, Button } from '../../components/common';
import { UI_CONFIG } from '../../constants/config';
import { useBookingStore } from '../../store/bookingStore';
import { Alert } from 'react-native';
import { DriverStackParamList } from '../../navigation/DriverNavigator';

type CollectPaymentScreenRouteProp = RouteProp<DriverStackParamList, 'CollectPayment'>;
type CollectPaymentScreenNavigationProp = StackNavigationProp<DriverStackParamList, 'CollectPayment'>;

const CollectPaymentScreen: React.FC = () => {
  const navigation = useNavigation<CollectPaymentScreenNavigationProp>();
  const route = useRoute<CollectPaymentScreenRouteProp>();
  const { updateBookingStatus } = useBookingStore();
  const orderId = route.params.orderId;

  const handleCompleteDelivery = async () => {
    if (!orderId) {
      Alert.alert('Error', 'Order ID not found');
      return;
    }

    try {
      await updateBookingStatus(orderId, 'delivered', {
        deliveredAt: new Date(),
      });
      Alert.alert('Success', 'Delivery completed successfully!');
      navigation.goBack();
    } catch (error) {
            Alert.alert('Error', 'Failed to complete delivery. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Typography variant="h2" style={styles.title}>
            Collect Payment
          </Typography>
          <Typography variant="body" style={styles.subtitle}>
            Please collect the payment from the customer and click OK when done.
          </Typography>
        </View>
        <View style={styles.buttonContainer}>
          <Button
            title="OK"
            onPress={handleCompleteDelivery}
            style={styles.okButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: UI_CONFIG.colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    paddingBottom: 20,
  },
  okButton: {
    backgroundColor: UI_CONFIG.colors.success,
  },
});

export default CollectPaymentScreen;

