import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Button, Input, Card } from '../../components/common';
import { Pricing, TankerSize } from '../../types';
import { PricingUtils } from '../../utils/pricing';
import { useAuthStore } from '../../store/authStore';

const PricingManagementScreen: React.FC = () => {
  const { user } = useAuthStore();
  
  // Pricing state
  const [pricing, setPricing] = useState<Pricing>(PricingUtils.getDefaultPricing());
  const [pricingErrors, setPricingErrors] = useState<string[]>([]);
  const [pricingHistory, setPricingHistory] = useState<Pricing[]>([
    {
      pricePerKm: 5,
      minimumCharge: 50,
      updatedAt: new Date('2024-01-15'),
      updatedBy: 'admin-001',
    },
    {
      pricePerKm: 4.5,
      minimumCharge: 45,
      updatedAt: new Date('2024-01-01'),
      updatedBy: 'admin-001',
    },
  ]);
  
  // Tanker sizes state
  const [tankerSizes, setTankerSizes] = useState<TankerSize[]>([
    { id: '1', size: 10000, basePrice: 600, isActive: true, displayName: '10000L Tanker' },
    { id: '2', size: 15000, basePrice: 900, isActive: true, displayName: '15000L Tanker' },
    { id: '3', size: 20000, basePrice: 1200, isActive: true, displayName: '20000L Tanker' },
  ]);
  
  // UI state
  const [showTankerModal, setShowTankerModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [editingTanker, setEditingTanker] = useState<TankerSize | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form states
  const [newTankerSize, setNewTankerSize] = useState('');
  const [newTankerPrice, setNewTankerPrice] = useState('');
  const [newTankerDisplayName, setNewTankerDisplayName] = useState('');
  const [pricePerKm, setPricePerKm] = useState(pricing.pricePerKm.toString());
  const [minimumCharge, setMinimumCharge] = useState(pricing.minimumCharge.toString());

  useEffect(() => {
    // Load current pricing configuration
    loadPricingConfiguration();
  }, []);

  const loadPricingConfiguration = async () => {
    try {
      setIsLoading(true);
      // In a real app, this would fetch from your backend
      // For now, we'll use the default pricing
      setPricing(PricingUtils.getDefaultPricing());
    } catch (error) {
      Alert.alert('Error', 'Failed to load pricing configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const validatePricing = (): boolean => {
    const errors = PricingUtils.validatePricing({
      pricePerKm: parseFloat(pricePerKm),
      minimumCharge: parseFloat(minimumCharge),
    });
    
    setPricingErrors(errors);
    return errors.length === 0;
  };

  const handleSavePricing = async () => {
    if (!validatePricing()) {
      return;
    }

    try {
      setIsLoading(true);
      
      const newPricing: Pricing = {
        pricePerKm: parseFloat(pricePerKm),
        minimumCharge: parseFloat(minimumCharge),
        updatedAt: new Date(),
        updatedBy: user?.uid || 'admin',
      };

      // In a real app, save to backend
      setPricing(newPricing);
      
      // Add to pricing history
      setPricingHistory(prev => [newPricing, ...prev]);
      
      setShowPricingModal(false);
      
      Alert.alert('Success', 'Pricing configuration updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update pricing configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTankerSize = () => {
    if (!newTankerSize || !newTankerPrice || !newTankerDisplayName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const size = parseInt(newTankerSize);
    const basePrice = parseFloat(newTankerPrice);

    if (isNaN(size) || isNaN(basePrice) || size <= 0 || basePrice <= 0) {
      Alert.alert('Error', 'Please enter valid numbers');
      return;
    }

    if (tankerSizes.some(t => t.size === size)) {
      Alert.alert('Error', 'Tanker size already exists');
      return;
    }

    const newTanker: TankerSize = {
      id: Date.now().toString(),
      size,
      basePrice,
      isActive: true,
      displayName: newTankerDisplayName,
    };

    setTankerSizes([...tankerSizes, newTanker]);
    setNewTankerSize('');
    setNewTankerPrice('');
    setNewTankerDisplayName('');
    setShowTankerModal(false);
    
    Alert.alert('Success', 'Tanker size added successfully');
  };

  const handleEditTankerSize = (tanker: TankerSize) => {
    setEditingTanker(tanker);
    setNewTankerSize(tanker.size.toString());
    setNewTankerPrice(tanker.basePrice.toString());
    setNewTankerDisplayName(tanker.displayName);
    setShowTankerModal(true);
  };

  const handleUpdateTankerSize = () => {
    if (!editingTanker || !newTankerSize || !newTankerPrice || !newTankerDisplayName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const size = parseInt(newTankerSize);
    const basePrice = parseFloat(newTankerPrice);

    if (isNaN(size) || isNaN(basePrice) || size <= 0 || basePrice <= 0) {
      Alert.alert('Error', 'Please enter valid numbers');
      return;
    }

    const updatedTankerSizes = tankerSizes.map(tanker =>
      tanker.id === editingTanker.id
        ? { ...tanker, size, basePrice, displayName: newTankerDisplayName }
        : tanker
    );

    setTankerSizes(updatedTankerSizes);
    setEditingTanker(null);
    setNewTankerSize('');
    setNewTankerPrice('');
    setNewTankerDisplayName('');
    setShowTankerModal(false);
    
    Alert.alert('Success', 'Tanker size updated successfully');
  };

  const handleToggleTankerActive = (tankerId: string) => {
    const updatedTankerSizes = tankerSizes.map(tanker =>
      tanker.id === tankerId ? { ...tanker, isActive: !tanker.isActive } : tanker
    );
    setTankerSizes(updatedTankerSizes);
  };

  const handleDeleteTankerSize = (tankerId: string) => {
    Alert.alert(
      'Delete Tanker Size',
      'Are you sure you want to delete this tanker size?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setTankerSizes(tankerSizes.filter(tanker => tanker.id !== tankerId));
            Alert.alert('Success', 'Tanker size deleted successfully');
          },
        },
      ]
    );
  };

  const PricingConfigurationCard = () => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Typography variant="h3" style={styles.cardTitle}>Pricing Configuration</Typography>
        <TouchableOpacity
          onPress={() => {
            setPricePerKm(pricing.pricePerKm.toString());
            setMinimumCharge(pricing.minimumCharge.toString());
            setShowPricingModal(true);
          }}
          style={styles.editButton}
        >
          <Ionicons name="pencil" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.pricingInfo}>
        <View style={styles.pricingRow}>
          <Typography variant="body" style={styles.pricingLabel}>Price per KM:</Typography>
          <Typography variant="body" style={styles.pricingValue}>
            {PricingUtils.formatPrice(pricing.pricePerKm)}/km
          </Typography>
        </View>
        <View style={styles.pricingRow}>
          <Typography variant="body" style={styles.pricingLabel}>Minimum Charge:</Typography>
          <Typography variant="body" style={styles.pricingValue}>
            {PricingUtils.formatPrice(pricing.minimumCharge)}
          </Typography>
        </View>
        <View style={styles.pricingRow}>
          <Typography variant="caption" style={styles.pricingLabel}>Last Updated:</Typography>
          <Typography variant="caption" style={styles.pricingValue}>
            {pricing.updatedAt.toLocaleDateString()}
          </Typography>
        </View>
      </View>
    </Card>
  );

  const PricingHistoryCard = () => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Typography variant="h3" style={styles.cardTitle}>Pricing History</Typography>
      </View>
      
      <View style={styles.historyList}>
        {pricingHistory.slice(0, 5).map((historyItem, index) => (
          <View key={index} style={styles.historyItem}>
            <View style={styles.historyInfo}>
              <Typography variant="body" style={styles.historyPrice}>
                ₹{historyItem.pricePerKm}/km • Min: {PricingUtils.formatPrice(historyItem.minimumCharge)}
              </Typography>
              <Typography variant="caption" style={styles.historyDate}>
                {historyItem.updatedAt.toLocaleDateString()} • Updated by {historyItem.updatedBy}
              </Typography>
            </View>
            {index === 0 && (
              <View style={styles.currentBadge}>
                <Typography variant="caption" style={styles.currentBadgeText}>Current</Typography>
              </View>
            )}
          </View>
        ))}
      </View>
    </Card>
  );

  const TankerSizesCard = () => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Typography variant="h3" style={styles.cardTitle}>Tanker Sizes</Typography>
        <TouchableOpacity
          onPress={() => {
            setEditingTanker(null);
            setNewTankerSize('');
            setNewTankerPrice('');
            setNewTankerDisplayName('');
            setShowTankerModal(true);
          }}
          style={styles.addButton}
        >
          <Ionicons name="add" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.tankerList}>
        {tankerSizes.map((tanker) => (
          <View key={tanker.id} style={styles.tankerItem}>
            <View style={styles.tankerInfo}>
              <Typography variant="body" style={styles.tankerName}>
                {tanker.displayName}
              </Typography>
              <Typography variant="caption" style={styles.tankerDetails}>
                {tanker.size.toLocaleString()}L • {PricingUtils.formatPrice(tanker.basePrice)} base price
              </Typography>
            </View>
            
            <View style={styles.tankerActions}>
              <Switch
                value={tanker.isActive}
                onValueChange={() => handleToggleTankerActive(tanker.id)}
                trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                thumbColor={tanker.isActive ? '#FFFFFF' : '#FFFFFF'}
              />
              
              <TouchableOpacity
                onPress={() => handleEditTankerSize(tanker)}
                style={styles.actionButton}
              >
                <Ionicons name="pencil" size={16} color="#007AFF" />
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => handleDeleteTankerSize(tanker.id)}
                style={styles.actionButton}
              >
                <Ionicons name="trash" size={16} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );

  const PricingModal = () => (
    <Modal visible={showPricingModal} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowPricingModal(false)}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Typography variant="h3" style={styles.modalTitle}>Edit Pricing</Typography>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          <Input
            label="Price per Kilometer (₹)"
            value={pricePerKm}
            onChangeText={setPricePerKm}
            keyboardType="numeric"
            placeholder="Enter price per km"
          />
          
          <Input
            label="Minimum Charge (₹)"
            value={minimumCharge}
            onChangeText={setMinimumCharge}
            keyboardType="numeric"
            placeholder="Enter minimum charge"
          />

          {pricingErrors.length > 0 && (
            <View style={styles.errorContainer}>
              {pricingErrors.map((error, index) => (
                <Typography key={index} variant="caption" style={styles.errorText}>
                  • {error}
                </Typography>
              ))}
            </View>
          )}

          <Button
            title="Save Changes"
            onPress={handleSavePricing}
            loading={isLoading}
            style={styles.saveButton}
          />
        </ScrollView>
      </View>
    </Modal>
  );

  const TankerModal = () => (
    <Modal visible={showTankerModal} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowTankerModal(false)}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Typography variant="h3" style={styles.modalTitle}>
            {editingTanker ? 'Edit Tanker Size' : 'Add Tanker Size'}
          </Typography>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          <Input
            label="Tanker Size (Liters)"
            value={newTankerSize}
            onChangeText={setNewTankerSize}
            keyboardType="numeric"
            placeholder="e.g., 10000"
          />
          
          <Input
            label="Base Price (₹)"
            value={newTankerPrice}
            onChangeText={setNewTankerPrice}
            keyboardType="numeric"
            placeholder="e.g., 600"
          />

          <Input
            label="Display Name"
            value={newTankerDisplayName}
            onChangeText={setNewTankerDisplayName}
            placeholder="e.g., 10000L Tanker"
          />

          <Button
            title={editingTanker ? 'Update Tanker Size' : 'Add Tanker Size'}
            onPress={editingTanker ? handleUpdateTankerSize : handleAddTankerSize}
            style={styles.saveButton}
          />
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Typography variant="h2" style={styles.title}>Pricing Management</Typography>
          <Typography variant="body" style={styles.subtitle}>
            Configure pricing rates and manage tanker sizes
          </Typography>
        </View>

        <PricingConfigurationCard />
        <TankerSizesCard />
        <PricingHistoryCard />

        <View style={styles.footer}>
          <Typography variant="caption" style={styles.footerText}>
            Changes to pricing will affect all new bookings
          </Typography>
        </View>
      </ScrollView>

      <PricingModal />
      <TankerModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    lineHeight: 22,
  },
  card: {
    marginHorizontal: 24,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  editButton: {
    padding: 8,
  },
  addButton: {
    padding: 8,
  },
  pricingInfo: {
    gap: 12,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricingLabel: {
    color: '#8E8E93',
    fontWeight: '500',
  },
  pricingValue: {
    color: '#000000',
    fontWeight: '600',
  },
  tankerList: {
    gap: 12,
  },
  tankerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tankerInfo: {
    flex: 1,
  },
  tankerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  tankerDetails: {
    color: '#8E8E93',
  },
  tankerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    marginBottom: 4,
  },
  saveButton: {
    marginTop: 16,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  historyInfo: {
    flex: 1,
  },
  historyPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  historyDate: {
    color: '#8E8E93',
  },
  currentBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default PricingManagementScreen;
