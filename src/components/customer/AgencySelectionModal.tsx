import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../common/Card';
import LoadingSpinner from '../common/LoadingSpinner';
import { Typography } from '../common';
import { UI_CONFIG } from '../../constants/config';

interface AgencySelectionModalProps {
  visible: boolean;
  onClose: () => void;
  agencies: Array<{ id: string; name: string }>;
  selectedAgencyId: string | null;
  onSelectAgency: (agency: { id: string; name: string }) => void;
  loading: boolean;
}

const AgencySelectionModal: React.FC<AgencySelectionModalProps> = ({
  visible,
  onClose,
  agencies,
  selectedAgencyId,
  onSelectAgency,
  loading,
}) => {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={UI_CONFIG.colors.text} />
          </TouchableOpacity>
          <Typography variant="h3" style={styles.modalTitle}>Select Tanker Agency</Typography>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {loading ? (
            <View style={styles.emptyState}>
              <LoadingSpinner />
              <Typography variant="body" style={styles.emptyStateText}>Loading agencies...</Typography>
            </View>
          ) : agencies.length > 0 ? (
            agencies.map((agency) => (
              <Card
                key={agency.id}
                style={[
                  styles.tankerCard,
                  selectedAgencyId === agency.id && styles.selectedTankerCard,
                ]}
                onPress={() => onSelectAgency(agency)}
              >
                <View style={styles.tankerInfo}>
                  <Typography variant="body" style={styles.tankerName}>{agency.name}</Typography>
                </View>
                <Ionicons
                  name={selectedAgencyId === agency.id ? 'radio-button-on' : 'radio-button-off'}
                  size={24}
                  color={selectedAgencyId === agency.id ? UI_CONFIG.colors.primary : UI_CONFIG.colors.textSecondary}
                />
              </Card>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="business-outline" size={64} color={UI_CONFIG.colors.textSecondary} />
              <Typography variant="body" style={styles.emptyStateText}>No agencies available</Typography>
              <Typography variant="caption" style={styles.emptyStateSubtext}>Please contact support if you need assistance</Typography>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: UI_CONFIG.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: UI_CONFIG.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: UI_CONFIG.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: UI_CONFIG.colors.text,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  tankerCard: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedTankerCard: {
    backgroundColor: UI_CONFIG.colors.surfaceLight,
    borderColor: UI_CONFIG.colors.primary,
    borderWidth: 1,
  },
  tankerInfo: {
    flex: 1,
  },
  tankerName: {
    fontSize: 16,
    fontWeight: '500',
    color: UI_CONFIG.colors.text,
    marginBottom: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: UI_CONFIG.colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: UI_CONFIG.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
});

export default AgencySelectionModal;

