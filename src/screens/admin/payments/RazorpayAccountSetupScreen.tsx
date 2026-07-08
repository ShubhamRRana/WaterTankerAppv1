import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Button, Card, LoadingSpinner, Input } from '../../../components/common';
import { AgencyPayoutService } from '../../../services/agencyPayout.service';
import type { LinkedAccountStatus } from '../../../services/agencyPayout.service';
import { useOptionalAdminSubscriptionGate } from '../../../context/AdminSubscriptionGateContext';
import { useTheme } from '../../../theme/ThemeProvider';
import type { AdminStackParamList } from '../../../navigation/AdminNavigator';

type RazorpayAccountSetupNavigationProp = StackNavigationProp<
  AdminStackParamList,
  'RazorpayAccountSetup'
>;

const RazorpayAccountSetupScreen: React.FC = () => {
  const navigation = useNavigation<RazorpayAccountSetupNavigationProp>();
  const subscriptionGate = useOptionalAdminSubscriptionGate();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [status, setStatus] = useState<LinkedAccountStatus>({ status: 'not_started' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [pan, setPan] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [registeredStreet, setRegisteredStreet] = useState('');
  const [registeredStreet2, setRegisteredStreet2] = useState('');
  const [registeredCity, setRegisteredCity] = useState('');
  const [registeredState, setRegisteredState] = useState('');
  const [registeredPostalCode, setRegisteredPostalCode] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const s = await AgencyPayoutService.getAccountStatus();
      setStatus(s);
      if (s.businessName) setBusinessName(s.businessName);
      if (subscriptionGate) {
        await subscriptionGate.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSubmit = async () => {
    if (!businessName.trim() || !contactName.trim() || !contactEmail.trim() || !contactPhone.trim()) {
      Alert.alert(
        'Missing details',
        'Business name, your name (as on PAN), contact email, and phone are required.'
      );
      return;
    }
    if (!pan.trim() || !bankAccountNumber.trim() || !bankIfsc.trim()) {
      Alert.alert('Missing details', 'PAN, bank account, and IFSC are required for Razorpay KYC.');
      return;
    }
    if (
      !registeredStreet.trim() ||
      !registeredCity.trim() ||
      !registeredState.trim() ||
      !registeredPostalCode.trim()
    ) {
      Alert.alert('Missing address', 'Registered business address is required for Razorpay Route.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await AgencyPayoutService.submitOnboarding({
        businessName,
        contactName,
        contactEmail,
        contactPhone,
        pan,
        bankAccountNumber,
        bankIfsc,
        registeredStreet,
        registeredStreet2,
        registeredCity,
        registeredState,
        registeredPostalCode,
      });
      setStatus(result);
      if (subscriptionGate) {
        await subscriptionGate.refresh();
      }
      Alert.alert('Submitted', 'Razorpay payout setup submitted. Status will update after review.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner size="large" text="Loading payout status..." />;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={styles.backRow}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
            <Typography variant="body" style={styles.backText}>Back to profile</Typography>
          </TouchableOpacity>
          <Card style={styles.card}>
            <Typography variant="h2">Razorpay Route setup</Typography>
            <Typography variant="body">Status: {status.status}</Typography>
            {status.rejectionReason ? (
              <Typography variant="caption" style={{ opacity: 0.8 }}>{status.rejectionReason}</Typography>
            ) : null}
          </Card>
          {status.status !== 'active' ? (
            <Card style={styles.card}>
              <Input
                label="Business / trade name *"
                placeholder="Enter business or trade name"
                value={businessName}
                onChangeText={setBusinessName}
              />
              <Input
                label="Your name (as on PAN) *"
                placeholder="Enter name exactly as on PAN"
                value={contactName}
                onChangeText={setContactName}
                autoCapitalize="words"
              />
              <Input
                label="Contact email *"
                placeholder="Enter contact email"
                value={contactEmail}
                onChangeText={setContactEmail}
                autoCapitalize="none"
              />
              <Input
                label="Mobile (Aadhaar/CKYC-linked) *"
                placeholder="Enter mobile number"
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
              />
              <Input
                label="PAN Number *"
                placeholder="Enter PAN number"
                value={pan}
                onChangeText={setPan}
                autoCapitalize="characters"
              />
              <Input
                label="Bank account number *"
                placeholder="Enter account number"
                value={bankAccountNumber}
                onChangeText={setBankAccountNumber}
              />
              <Input
                label="IFSC *"
                placeholder="Enter IFSC code"
                value={bankIfsc}
                onChangeText={setBankIfsc}
                autoCapitalize="characters"
              />
              <Input
                label="Address line 1 *"
                placeholder="Enter street address"
                value={registeredStreet}
                onChangeText={setRegisteredStreet}
              />
              <Input
                label="Area / locality"
                placeholder="Optional"
                value={registeredStreet2}
                onChangeText={setRegisteredStreet2}
              />
              <Input
                label="City *"
                placeholder="Enter city"
                value={registeredCity}
                onChangeText={setRegisteredCity}
              />
              <Input
                label="State *"
                placeholder="Enter state"
                value={registeredState}
                onChangeText={setRegisteredState}
              />
              <Input
                label="PIN code *"
                placeholder="Enter 6-digit PIN"
                value={registeredPostalCode}
                onChangeText={setRegisteredPostalCode}
                keyboardType="number-pad"
                maxLength={6}
              />
              <Button title={submitting ? 'Submitting...' : 'Submit for verification'} onPress={() => void handleSubmit()} disabled={submitting} />
            </Card>
          ) : (
            <Button title="Refresh status" variant="outline" onPress={() => void load()} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

function createStyles(colors: { background: string; text: string; border: string; textSecondary: string }) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    scroll: { padding: 16, gap: 12 },
    backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    backText: { marginLeft: 8, color: colors.text },
    card: { padding: 16, gap: 10 },
  });
}

export default RazorpayAccountSetupScreen;
