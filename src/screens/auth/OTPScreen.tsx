import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../components/common';

interface OTPScreenProps {
  route: {
    params: {
      phone: string;
    };
  };
}

const OTPScreen: React.FC<OTPScreenProps> = ({ route }) => {
  const { phone } = route.params;
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleVerifyOTP = () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter a 6-digit OTP');
      return;
    }

    // TODO: Implement OTP verification
    Alert.alert('Success', 'OTP verified successfully!');
  };

  const handleResendOTP = async () => {
    setIsResending(true);
    // TODO: Implement OTP resend
    setTimeout(() => {
      setIsResending(false);
      setTimer(60);
      Alert.alert('OTP Sent', 'A new OTP has been sent to your phone');
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
      <View style={styles.header}>
        <Typography variant="h1" style={styles.title}>Verify Phone Number</Typography>
        <Typography variant="body" style={styles.subtitle}>
          Enter the 6-digit code sent to{'\n'}
          <Typography variant="body" style={styles.phoneNumber}>+91 {phone}</Typography>
        </Typography>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, otp.length !== 6 && styles.buttonDisabled]}
          onPress={handleVerifyOTP}
          disabled={otp.length !== 6}
        >
          <Typography variant="body" style={styles.buttonText}>Verify OTP</Typography>
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Typography variant="body" style={styles.resendText}>
            Didn't receive the code?{' '}
          </Typography>
          <TouchableOpacity
            onPress={handleResendOTP}
            disabled={timer > 0 || isResending}
          >
            <Typography variant="body" style={[
              styles.resendLink,
              (timer > 0 || isResending) && styles.resendLinkDisabled
            ]}>
              {isResending ? 'Sending...' : timer > 0 ? `Resend in ${timer}s` : 'Resend'}
            </Typography>
          </TouchableOpacity>
        </View>
      </View>
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
  },
  phoneNumber: {
    fontWeight: '600',
    color: '#000000',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    fontSize: 24,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    letterSpacing: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#8E8E93',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  resendLink: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  resendLinkDisabled: {
    color: '#8E8E93',
  },
});

export default OTPScreen;
