import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Button, Card, LoadingSpinner } from '../../../components/common';
import { AgencyPayoutService } from '../../../services/agencyPayout.service';
import type { LinkedAccountStatus } from '../../../services/agencyPayout.service';
import { useTheme } from '../../../theme/ThemeProvider';
import type { AdminStackParamList } from '../../../navigation/AdminNavigator';

type RazorpayAccountSetupNavigationProp = StackNavigationProp<
  AdminStackParamList,
  'RazorpayAccountSetup'
>;

const RazorpayAccountSetupScreen: React.FC = () => {
  const navigation = useNavigation<RazorpayAccountSetupNavigationProp>();
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
              <TextInput style={styles.input} placeholder="Business / trade name" value={businessName} onChangeText={setBusinessName} placeholderTextColor={colors.textSecondary} />
              <TextInput style={styles.input} placeholder="Your name (exactly as on PAN card)" value={contactName} onChangeText={setContactName} placeholderTextColor={colors.textSecondary} autoCapitalize="words" />
              <TextInput style={styles.input} placeholder="Contact email" value={contactEmail} onChangeText={setContactEmail} placeholderTextColor={colors.textSecondary} autoCapitalize="none" />
              <TextInput style={styles.input} placeholder="Mobile (Aadhaar/CKYC-linked number)" value={contactPhone} onChangeText={setContactPhone} placeholderTextColor={colors.textSecondary} keyboardType="phone-pad" />
              <TextInput style={styles.input} placeholder="Personal PAN (sole operator / individual)" value={pan} onChangeText={setPan} placeholderTextColor={colors.textSecondary} autoCapitalize="characters" />
              <TextInput style={styles.input} placeholder="Bank Account Number" value={bankAccountNumber} onChangeText={setBankAccountNumber} placeholderTextColor={colors.textSecondary} />
              <TextInput style={styles.input} placeholder="IFSC" value={bankIfsc} onChangeText={setBankIfsc} placeholderTextColor={colors.textSecondary} autoCapitalize="characters" />
              <TextInput style={styles.input} placeholder="Address line 1" value={registeredStreet} onChangeText={setRegisteredStreet} placeholderTextColor={colors.textSecondary} />
              <TextInput style={styles.input} placeholder="Area / locality (optional)" value={registeredStreet2} onChangeText={setRegisteredStreet2} placeholderTextColor={colors.textSecondary} />
              <TextInput style={styles.input} placeholder="City" value={registeredCity} onChangeText={setRegisteredCity} placeholderTextColor={colors.textSecondary} />
              <TextInput style={styles.input} placeholder="State" value={registeredState} onChangeText={setRegisteredState} placeholderTextColor={colors.textSecondary} />
              <TextInput style={styles.input} placeholder="PIN code" value={registeredPostalCode} onChangeText={setRegisteredPostalCode} placeholderTextColor={colors.textSecondary} keyboardType="number-pad" maxLength={6} />
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
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      color: colors.text,
      marginBottom: 8,
    },
  });
}

export default RazorpayAccountSetupScreen;
