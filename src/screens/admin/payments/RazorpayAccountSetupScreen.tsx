import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Button, Card, LoadingSpinner } from '../../../components/common';
import { AgencyPayoutService } from '../../../services/agencyPayout.service';
import type { LinkedAccountStatus } from '../../../services/agencyPayout.service';
import { useTheme } from '../../../theme/ThemeProvider';

const RazorpayAccountSetupScreen: React.FC = () => {
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
          <Card style={styles.card}>
            <Typography variant="h2">Razorpay Route setup</Typography>
            <Typography variant="body">Status: {status.status}</Typography>
            {status.rejectionReason ? (
              <Typography variant="caption" style={{ opacity: 0.8 }}>{status.rejectionReason}</Typography>
            ) : null}
          </Card>
          {status.status !== 'active' ? (
            <Card style={styles.card}>
              <TextInput style={styles.input} placeholder="Business name" value={businessName} onChangeText={setBusinessName} placeholderTextColor={colors.textSecondary} />
              <TextInput style={styles.input} placeholder="Contact name" value={contactName} onChangeText={setContactName} placeholderTextColor={colors.textSecondary} />
              <TextInput style={styles.input} placeholder="Contact email" value={contactEmail} onChangeText={setContactEmail} placeholderTextColor={colors.textSecondary} autoCapitalize="none" />
              <TextInput style={styles.input} placeholder="Contact phone" value={contactPhone} onChangeText={setContactPhone} placeholderTextColor={colors.textSecondary} keyboardType="phone-pad" />
              <TextInput style={styles.input} placeholder="PAN" value={pan} onChangeText={setPan} placeholderTextColor={colors.textSecondary} autoCapitalize="characters" />
              <TextInput style={styles.input} placeholder="Bank account" value={bankAccountNumber} onChangeText={setBankAccountNumber} placeholderTextColor={colors.textSecondary} />
              <TextInput style={styles.input} placeholder="IFSC" value={bankIfsc} onChangeText={setBankIfsc} placeholderTextColor={colors.textSecondary} autoCapitalize="characters" />
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
