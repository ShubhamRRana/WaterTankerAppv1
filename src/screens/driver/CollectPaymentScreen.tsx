import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Typography, Button } from '../../components/common';
import { useBookingStore } from '../../store/bookingStore';
import { Alert } from 'react-native';
import { DriverStackParamList } from '../../navigation/DriverNavigator';
import { Booking } from '../../types';
import { BankAccountService, PaymentService, AgencyPayoutService } from '../../services';
import { openCheckout } from '../../services/razorpayCheckout.service';
import { FEATURE_FLAGS, ERROR_MESSAGES } from '../../constants/config';
import { getBookingPaymentChipLabel, getBookingPaymentChip, canCollectOnlinePayment } from '../../utils/paymentDisplay';
import AmountInputModal from '../../components/driver/AmountInputModal';
import { AppPalette } from '../../theme/palettes';
import { useTheme } from '../../theme/ThemeProvider';

type CollectPaymentScreenRouteProp = RouteProp<DriverStackParamList, 'CollectPayment'>;
type CollectPaymentScreenNavigationProp = StackNavigationProp<DriverStackParamList, 'CollectPayment'>;

const CollectPaymentScreen: React.FC = () => {
  const navigation = useNavigation<CollectPaymentScreenNavigationProp>();
  const route = useRoute<CollectPaymentScreenRouteProp>();
  const { updateBookingStatus, getBookingById } = useBookingStore();
  const orderId = route.params.orderId;
  const autoOpenDeliveryModal = route.params?.autoOpenDeliveryModal;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState<string | null>(null);
  const [loadingQRCode, setLoadingQRCode] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);
  const [hasAutoOpenedModal, setHasAutoOpenedModal] = useState(false);
  const [collectingPayment, setCollectingPayment] = useState(false);
  const [allowCash, setAllowCash] = useState(true);
  const [defaultCollectionMethod, setDefaultCollectionMethod] = useState<'razorpay' | 'manual_qr'>('manual_qr');
  const [payoutActive, setPayoutActive] = useState(false);
  const [agencySettingsLoaded, setAgencySettingsLoaded] = useState(false);

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    loadBooking();
  }, [orderId]);

  useEffect(() => {
    if (!autoOpenDeliveryModal) return;
    if (hasAutoOpenedModal) return;
    if (loading) return;
    if (error) return;
    if (!booking) return;

    setHasAutoOpenedModal(true);
    setShowDeliveryModal(true);
  }, [autoOpenDeliveryModal, hasAutoOpenedModal, loading, error, booking]);

  const loadBooking = async () => {
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

      if (bookingData.agencyId) {
        try {
          const account = await AgencyPayoutService.getLocalAccount(bookingData.agencyId);
          if (account) {
            setAllowCash(account.allowCashCollection);
            setDefaultCollectionMethod(account.defaultCollectionMethod);
          }
          const routeStatus = await AgencyPayoutService.getAccountStatus();
          setPayoutActive(routeStatus.status === 'active');
          if (routeStatus.allowCashCollection !== undefined) {
            setAllowCash(routeStatus.allowCashCollection);
          }
          if (routeStatus.defaultCollectionMethod) {
            setDefaultCollectionMethod(routeStatus.defaultCollectionMethod);
          }
        } catch {
          setPayoutActive(false);
        } finally {
          setAgencySettingsLoaded(true);
        }

        setLoadingQRCode(true);
        try {
          const defaultAccount = await BankAccountService.getDefaultBankAccount(bookingData.agencyId);
          // Check if default account has a valid (non-empty) QR code URL
          if (defaultAccount?.qrCodeImageUrl && defaultAccount.qrCodeImageUrl.trim() !== '') {
            setQrCodeImageUrl(defaultAccount.qrCodeImageUrl);
          } else {
            // If no default account, try to get the first available account
            const allAccounts = await BankAccountService.getAllBankAccounts(bookingData.agencyId);
            if (allAccounts.length > 0) {
              // Find first account with valid QR code URL (non-empty)
              const accountWithQR = allAccounts.find(acc => acc.qrCodeImageUrl && acc.qrCodeImageUrl.trim() !== '');
              if (accountWithQR?.qrCodeImageUrl) {
                setQrCodeImageUrl(accountWithQR.qrCodeImageUrl);
              }
            }
          }
        } catch (qrError) {
          // Don't show error to user, just silently fail
        } finally {
          setLoadingQRCode(false);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load booking details';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRazorpayCollect = async () => {
    if (!orderId || !booking) return;
    if (!booking.deliveredAmount || !booking.deliveredTankerLiters) {
      setShowDeliveryModal(true);
      return;
    }
    if (!payoutActive) {
      Alert.alert('Online payments unavailable', ERROR_MESSAGES.payment.agencyNotOnboarded);
      return;
    }
    if (booking.paymentStatus === 'completed') {
      navigation.navigate('PaymentResult', {
        type: 'delivery',
        status: 'success',
        message: 'This booking is already paid.',
        ...(booking.paymentId ? { referenceId: booking.paymentId } : {}),
      });
      return;
    }

    setCollectingPayment(true);
    try {
      const order = await PaymentService.createDeliveryPayment(orderId);
      const checkout = await openCheckout({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
        description: `Delivery payment — ${booking.customerName}`,
        prefill: { contact: booking.customerPhone, name: booking.customerName },
      });

      if (checkout.status === 'cancelled') {
        navigation.navigate('PaymentResult', {
          type: 'delivery',
          status: 'failed',
          message: ERROR_MESSAGES.payment.cancelled,
        });
        return;
      }
      if (checkout.status === 'error') {
        navigation.navigate('PaymentResult', {
          type: 'delivery',
          status: 'failed',
          message: checkout.message,
        });
        return;
      }

      const verify = await PaymentService.verifyDeliveryPayment(orderId, checkout.data);
      if (!verify.success) {
        navigation.navigate('PaymentResult', {
          type: 'delivery',
          status: 'failed',
          message: verify.error ?? ERROR_MESSAGES.payment.failed,
        });
        return;
      }

      navigation.replace('PaymentResult', {
        type: 'delivery',
        status: 'success',
        referenceId: checkout.data.razorpay_payment_id,
        message: 'Payment collected and delivery completed.',
      });
    } catch (error) {
      navigation.navigate('PaymentResult', {
        type: 'delivery',
        status: 'failed',
        message: error instanceof Error ? error.message : ERROR_MESSAGES.payment.failed,
      });
    } finally {
      setCollectingPayment(false);
    }
  };

  const handleCashPayment = async () => {
    if (!orderId || !booking) return;
    if (!allowCash) {
      Alert.alert('Cash not allowed', 'Your admin has disabled cash collection for this agency.');
      return;
    }
    if (!booking.deliveredAmount || !booking.deliveredTankerLiters) {
      setShowDeliveryModal(true);
      return;
    }
    setCollectingPayment(true);
    try {
      const result = await PaymentService.recordCashPayment(orderId, 'driver_cash');
      if (!result.success) {
        navigation.navigate('PaymentResult', {
          type: 'delivery',
          status: 'failed',
          message: result.error ?? 'Cash payment failed',
        });
        return;
      }
      navigation.replace('PaymentResult', {
        type: 'delivery',
        status: 'success',
        message: 'Cash payment recorded.',
        ...(result.paymentId ? { referenceId: result.paymentId } : {}),
      });
    } finally {
      setCollectingPayment(false);
    }
  };

  const handleCompleteDelivery = async () => {
    if (!orderId) {
      Alert.alert('Error', 'Order ID not found');
      return;
    }
    if (!booking?.deliveredAmount || !booking?.deliveredTankerLiters) {
      setShowDeliveryModal(true);
      return;
    }

    if (FEATURE_FLAGS.enableOnlinePayment && booking.paymentStatus !== 'completed') {
      const needsOnline =
        defaultCollectionMethod === 'razorpay' || !allowCash;
      Alert.alert(
        'Payment required',
        needsOnline
          ? 'Collect payment via Razorpay before completing delivery.'
          : 'Collect payment via Razorpay or record cash before completing delivery.'
      );
      return;
    }

    try {
      setIsSubmittingDelivery(true);
      await updateBookingStatus(orderId, 'delivered', { deliveredAt: new Date() });
      Alert.alert('Success', 'Delivery completed successfully!');
      navigation.goBack();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to complete delivery. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmittingDelivery(false);
    }
  };

  const handleSubmitDelivery = async (amount: number, deliveredLiters: number) => {
    if (!orderId) return;

    try {
      setIsSubmittingDelivery(true);
      // Only save the delivery details here.
      // Delivery completion (status = delivered) happens when driver taps "Payment Collected".
      await updateBookingStatus(orderId, booking?.status ?? 'in_transit', {
        deliveredAmount: amount,
        deliveredTankerLiters: deliveredLiters,
        // Keep legacy fields in sync for existing UI/reports.
        totalPrice: amount,
        basePrice: amount,
        distanceCharge: 0,
        tankerSize: deliveredLiters,
      });
      setBooking((prev) =>
        prev
          ? {
              ...prev,
              deliveredAmount: amount,
              deliveredTankerLiters: deliveredLiters,
              totalPrice: amount,
              basePrice: amount,
              distanceCharge: 0,
              tankerSize: deliveredLiters,
            }
          : prev
      );
      Alert.alert('Saved', 'Delivery amount saved. Now collect payment and tap “Payment Collected”.');
      setShowDeliveryModal(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to complete delivery. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmittingDelivery(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Typography variant="body" style={styles.loadingText}>
            Loading booking details...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.centerContent]}>
          <Typography variant="h2" style={styles.title}>
            Collect Payment
          </Typography>
          <Typography variant="body" style={[styles.subtitle, styles.errorText]}>
            {error || 'Booking not found'}
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

  const showOnlineCollect =
    FEATURE_FLAGS.enableOnlinePayment &&
    booking.paymentStatus !== 'completed' &&
    canCollectOnlinePayment(booking, payoutActive) &&
    (defaultCollectionMethod === 'razorpay' || payoutActive);
  const showManualQrPrimary = defaultCollectionMethod === 'manual_qr';
  const showPaymentCollectedButton =
    !FEATURE_FLAGS.enableOnlinePayment ||
    booking.paymentStatus === 'completed' ||
    (defaultCollectionMethod === 'manual_qr' && allowCash);

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
              Complete the payment collection process
            </Typography>

            {booking && (
              <>
                <View style={styles.paymentInfo}>
                  <Typography variant="body" style={styles.amountLabel}>
                    Amount to Pay
                  </Typography>
                  <Typography variant="h2" style={styles.amount}>
                    ₹{(booking.deliveredAmount ?? booking.totalPrice).toLocaleString('en-IN')}
                  </Typography>
                  <Typography variant="caption" style={styles.amountLabel}>
                    {getBookingPaymentChipLabel(getBookingPaymentChip(booking))}
                  </Typography>
                </View>

                {showOnlineCollect ? (
                  <View style={styles.buttonContainer}>
                    <Button
                      title={collectingPayment ? 'Processing...' : `Collect payment (₹${(booking.deliveredAmount ?? booking.totalPrice).toLocaleString('en-IN')})`}
                      onPress={() => void handleRazorpayCollect()}
                      disabled={collectingPayment || !agencySettingsLoaded}
                      style={styles.okButton}
                    />
                    {allowCash ? (
                      <Button
                        title="Record cash payment"
                        variant="outline"
                        onPress={() => void handleCashPayment()}
                        disabled={collectingPayment}
                        style={styles.backButton}
                      />
                    ) : null}
                  </View>
                ) : null}

                {!payoutActive && FEATURE_FLAGS.enableOnlinePayment && booking.paymentStatus !== 'completed' ? (
                  <Typography variant="caption" style={[styles.subtitle, { color: colors.warning, marginBottom: 12 }]}>
                    {ERROR_MESSAGES.payment.agencyNotOnboarded}
                  </Typography>
                ) : null}

                <View style={styles.qrCodeSection}>
                  <Typography variant="h3" style={styles.qrCodeTitle}>
                    {showManualQrPrimary ? 'Manual QR (scan to pay)' : 'Scan QR Code to Pay'}
                  </Typography>
                  {loadingQRCode ? (
                    <View style={styles.qrCodeLoadingContainer}>
                      <ActivityIndicator size="large" color={colors.accent} />
                      <Typography variant="body" style={styles.qrCodeLoadingText}>
                        Loading QR code...
                      </Typography>
                    </View>
                  ) : qrCodeImageUrl ? (
                    <View style={styles.qrCodeContainer}>
                      <Image
                        source={{ uri: qrCodeImageUrl }}
                        style={styles.qrCodeImage}
                        resizeMode="contain"
                        onError={() => {
                          setQrCodeImageUrl(null);
                        }}
                      />
                    </View>
                  ) : (
                    <View style={styles.qrCodeErrorContainer}>
                      <Typography variant="body" style={styles.qrCodeErrorText}>
                        QR code not available. Please contact the admin.
                      </Typography>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
          {showPaymentCollectedButton ? (
            <View style={styles.buttonContainer}>
              <Button
                title="Payment Collected"
                onPress={handleCompleteDelivery}
                style={styles.okButton}
                disabled={collectingPayment}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <AmountInputModal
        visible={showDeliveryModal}
        onClose={() => setShowDeliveryModal(false)}
        onSubmit={handleSubmitDelivery}
        isSubmitting={isSubmittingDelivery}
        customerName={booking?.customerName}
        vehicleCapacity={booking?.tankerSize}
      />
    </SafeAreaView>
  );
};

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.error,
    marginBottom: 24,
  },
  paymentInfo: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 24,
  },
  amountLabel: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  amount: {
    fontSize: 25,
    fontWeight: '700',
    color: colors.accent,
  },
  buttonContainer: {
    paddingBottom: 20,
    paddingTop: 10,
  },
  okButton: {
    backgroundColor: colors.success,
  },
  backButton: {
    backgroundColor: colors.accent,
  },
  qrCodeSection: {
    marginTop: 32,
    alignItems: 'center',
    width: '100%',
  },
  qrCodeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  qrCodeContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 300,
    minHeight: 300,
  },
  qrCodeImage: {
    width: 280,
    height: 280,
    borderRadius: 8,
  },
  qrCodeLoadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeLoadingText: {
    marginTop: 12,
    color: colors.textSecondary,
  },
  qrCodeErrorContainer: {
    padding: 24,
    backgroundColor: colors.surface,
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
  },
  qrCodeErrorText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
}


export default CollectPaymentScreen;

