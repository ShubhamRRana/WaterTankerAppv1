import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import QRCode from 'react-native-qrcode-svg';
import { Typography, Button } from '../../components/common';
import { UI_CONFIG } from '../../constants/config';
import { useBookingStore } from '../../store/bookingStore';
import { BankAccountService } from '../../services/bankAccount.service';
import { Alert } from 'react-native';
import { DriverStackParamList } from '../../navigation/DriverNavigator';
import { Booking, BankAccount } from '../../types';

type CollectPaymentScreenRouteProp = RouteProp<DriverStackParamList, 'CollectPayment'>;
type CollectPaymentScreenNavigationProp = StackNavigationProp<DriverStackParamList, 'CollectPayment'>;

const CollectPaymentScreen: React.FC = () => {
  const navigation = useNavigation<CollectPaymentScreenNavigationProp>();
  const route = useRoute<CollectPaymentScreenRouteProp>();
  const { updateBookingStatus, getBookingById } = useBookingStore();
  const orderId = route.params.orderId;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBookingAndBankAccount();
  }, [orderId]);

  const loadBookingAndBankAccount = async () => {
    if (!orderId) {
      setError('Order ID not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch booking details
      const bookingData = await getBookingById(orderId);
      if (!bookingData) {
        setError('Booking not found');
        setLoading(false);
        return;
      }

      setBooking(bookingData);

      // Check if agencyId exists
      if (!bookingData.agencyId) {
        setError('Account details have not been updated by the owner');
        setLoading(false);
        return;
      }

      // Fetch default bank account for the agency
      const defaultAccount = await BankAccountService.getDefaultBankAccount(bookingData.agencyId);
      
      if (!defaultAccount) {
        setError('Account details have not been updated by the owner');
        setLoading(false);
        return;
      }

      setBankAccount(defaultAccount);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load payment details';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCodeData = (): string => {
    if (!bankAccount || !booking) {
      return '';
    }

    // Generate QR code data with bank account details
    // Format: JSON string with bank account information for payment
    const qrData = {
      type: 'bank_account_payment',
      accountHolderName: bankAccount.accountHolderName,
      accountNumber: bankAccount.accountNumber,
      ifscCode: bankAccount.ifscCode,
      bankName: bankAccount.bankName,
      branchName: bankAccount.branchName,
      amount: booking.totalPrice,
      orderId: booking.id,
      agencyName: booking.agencyName || 'Water Tanker Service',
    };

    return JSON.stringify(qrData);
  };

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

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={UI_CONFIG.colors.primary} />
          <Typography variant="body" style={styles.loadingText}>
            Loading payment details...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !bankAccount) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.centerContent]}>
          <Typography variant="h2" style={styles.title}>
            Collect Payment
          </Typography>
          <Typography variant="body" style={[styles.subtitle, styles.errorText]}>
            {error || 'Account details have not been updated by the owner'}
          </Typography>
          <View style={styles.buttonContainer}>
            <Button
              title="Go Back"
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.content}>
            <Typography variant="h2" style={styles.title}>
              Collect Payment
            </Typography>
            <Typography variant="body" style={styles.subtitle}>
              Scan the QR code below to make payment
            </Typography>

            <View style={styles.qrCodeContainer}>
              <QRCode
                value={generateQRCodeData()}
                size={250}
                color={UI_CONFIG.colors.text}
                backgroundColor="#FFFFFF"
                logoSize={0}
              />
            </View>

            {booking && (
              <View style={styles.paymentInfo}>
                <Typography variant="body" style={styles.amountLabel}>
                  Amount to Pay
                </Typography>
                <Typography variant="h2" style={styles.amount}>
                  ₹{booking.totalPrice.toLocaleString('en-IN')}
                </Typography>
              </View>
            )}

            <View style={styles.bankDetails}>
              <Typography variant="body" style={styles.bankDetailsTitle}>
                Bank Details
              </Typography>
              <View style={styles.bankDetailRow}>
                <Typography variant="body" style={styles.bankDetailLabel}>
                  Account Holder:
                </Typography>
                <Typography variant="body" style={styles.bankDetailValue}>
                  {bankAccount.accountHolderName}
                </Typography>
              </View>
              <View style={styles.bankDetailRow}>
                <Typography variant="body" style={styles.bankDetailLabel}>
                  Account Number:
                </Typography>
                <Typography variant="body" style={styles.bankDetailValue}>
                  {bankAccount.accountNumber}
                </Typography>
              </View>
              <View style={styles.bankDetailRow}>
                <Typography variant="body" style={styles.bankDetailLabel}>
                  IFSC Code:
                </Typography>
                <Typography variant="body" style={styles.bankDetailValue}>
                  {bankAccount.ifscCode}
                </Typography>
              </View>
              <View style={styles.bankDetailRow}>
                <Typography variant="body" style={styles.bankDetailLabel}>
                  Bank:
                </Typography>
                <Typography variant="body" style={styles.bankDetailValue}>
                  {bankAccount.bankName}
                </Typography>
              </View>
              <View style={styles.bankDetailRow}>
                <Typography variant="body" style={styles.bankDetailLabel}>
                  Branch:
                </Typography>
                <Typography variant="body" style={styles.bankDetailValue}>
                  {bankAccount.branchName}
                </Typography>
              </View>
            </View>
          </View>
          <View style={styles.buttonContainer}>
            <Button
              title="Payment Collected"
              onPress={handleCompleteDelivery}
              style={styles.okButton}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
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
    marginBottom: 24,
  },
  loadingText: {
    marginTop: 16,
    color: UI_CONFIG.colors.textSecondary,
  },
  errorText: {
    color: UI_CONFIG.colors.error,
    marginBottom: 24,
  },
  qrCodeContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  paymentInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 15,
    color: UI_CONFIG.colors.textSecondary,
    marginBottom: 8,
  },
  amount: {
    fontSize: 25,
    fontWeight: '700',
    color: UI_CONFIG.colors.primary,
  },
  bankDetails: {
    width: '100%',
    backgroundColor: UI_CONFIG.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  bankDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: UI_CONFIG.colors.text,
    marginBottom: 12,
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bankDetailLabel: {
    fontSize: 14,
    color: UI_CONFIG.colors.textSecondary,
    flex: 1,
  },
  bankDetailValue: {
    fontSize: 14,
    color: UI_CONFIG.colors.text,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  buttonContainer: {
    paddingBottom: 20,
    paddingTop: 10,
  },
  okButton: {
    backgroundColor: UI_CONFIG.colors.success,
  },
  backButton: {
    backgroundColor: UI_CONFIG.colors.primary,
  },
});

export default CollectPaymentScreen;

