import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Typography from './Typography';

interface SuccessNotificationProps {
  visible: boolean;
  title: string;
  message: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryPress?: () => void;
  onSecondaryPress?: () => void;
  onClose?: () => void;
}

const SuccessNotification: React.FC<SuccessNotificationProps> = ({
  visible,
  title,
  message,
  primaryButtonText = 'Continue',
  secondaryButtonText,
  onPrimaryPress,
  onSecondaryPress,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.notificationsContainer}>
          <View style={styles.success}>
            <View style={styles.flex}>
              <View style={styles.flexShrink0}>
                <Ionicons name="checkmark-circle" size={20} color="#4ADE80" />
              </View>
              <View style={styles.successPromptWrap}>
                <Typography variant="h3" style={styles.successPromptHeading}>
                  {title}
                </Typography>
                <Typography variant="body" style={styles.successPromptPrompt}>
                  {message}
                </Typography>
                {(onPrimaryPress || onSecondaryPress) && (
                  <View style={styles.successButtonContainer}>
                    {onPrimaryPress && (
                      <TouchableOpacity
                        style={[
                          styles.successButtonMain,
                          !onSecondaryPress && styles.successButtonFullWidth
                        ]}
                        onPress={onPrimaryPress}
                      >
                        <Typography variant="body" style={styles.successButtonMainText}>
                          {primaryButtonText}
                        </Typography>
                      </TouchableOpacity>
                    )}
                    {onSecondaryPress && secondaryButtonText && (
                      <TouchableOpacity
                        style={styles.successButtonSecondary}
                        onPress={onSecondaryPress}
                      >
                        <Typography variant="body" style={styles.successButtonSecondaryText}>
                          {secondaryButtonText}
                        </Typography>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notificationsContainer: {
    width: 320,
    minHeight: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  flex: {
    display: 'flex',
    flexDirection: 'row',
  },
  flexShrink0: {
    flexShrink: 0,
  },
  success: {
    padding: 16,
    borderRadius: 6,
    backgroundColor: 'rgb(240, 253, 244)',
  },
  successPromptWrap: {
    marginLeft: 12,
    flex: 1,
  },
  successPromptHeading: {
    fontWeight: 'bold',
    color: 'rgb(22, 101, 52)',
    fontSize: 16,
    marginBottom: 0,
  },
  successPromptPrompt: {
    marginTop: 8,
    color: 'rgb(21, 128, 61)',
    fontSize: 14,
    lineHeight: 20,
  },
  successButtonContainer: {
    display: 'flex',
    flexDirection: 'row',
    marginTop: 14,
    marginBottom: -6,
    marginLeft: -8,
    marginRight: -8,
  },
  successButtonMain: {
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successButtonFullWidth: {
    flex: 1,
    width: '100%',
  },
  successButtonMainText: {
    color: 'rgb(22, 101, 52)',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 'bold',
  },
  successButtonSecondary: {
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    marginLeft: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    borderWidth: 0,
  },
  successButtonSecondaryText: {
    color: '#065F46',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default SuccessNotification;

