import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/authStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Address } from '../../types';
import { CustomerStackParamList } from '../../navigation/CustomerNavigator';
import { LocalStorageService } from '../../services/localStorage';

type SavedAddressesScreenNavigationProp = StackNavigationProp<CustomerStackParamList, 'SavedAddresses'>;

interface SavedAddressesScreenProps {
  navigation: SavedAddressesScreenNavigationProp;
}

const SavedAddressesScreen: React.FC<SavedAddressesScreenProps> = ({ navigation }) => {
  const { user, updateUser, isLoading } = useAuthStore();
  
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [newAddressText, setNewAddressText] = useState('');
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  useEffect(() => {
    loadAddresses();
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [user?.savedAddresses]);

  const loadAddresses = async () => {
    if (!user?.savedAddresses) {
      setAddresses([]);
      return;
    }
    setAddresses(user.savedAddresses);
  };

  const handleSaveAddress = async () => {
    if (!newAddressText.trim()) {
      Alert.alert('Error', 'Please enter an address');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    try {
      let updatedAddresses: Address[];
      
      if (editingAddress) {
        // Update existing address
        const updatedAddress: Address = {
          ...editingAddress,
          street: newAddressText.trim(),
        };
        
        updatedAddresses = addresses.map(addr => 
          addr.id === editingAddress.id ? updatedAddress : addr
        );
      } else {
        // Add new address
        const addressToSave: Address = {
          id: LocalStorageService.generateId(),
          street: newAddressText.trim(),
          city: '', // We'll use the full address as street
          state: '',
          pincode: '',
          landmark: '',
          latitude: 28.6139 + (Math.random() - 0.5) * 0.1,
          longitude: 77.2090 + (Math.random() - 0.5) * 0.1,
          isDefault: addresses.length === 0, // First address becomes default
        };
        
        updatedAddresses = [...addresses, addressToSave];
      }

      setAddresses(updatedAddresses);
      
      // Update user in auth store
      if (user) {
        await updateUser({ savedAddresses: updatedAddresses });
      }

      setNewAddressText('');
      setEditingAddress(null);
      
      Alert.alert('Success', editingAddress ? 'Address updated successfully' : 'Address saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save address. Please try again.');
    }
  };

  const handleDeleteAddress = (addressId: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) {
              Alert.alert('Error', 'User not found. Please log in again.');
              return;
            }

            try {
              const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
              
              // If we deleted the default address, make the first remaining address default
              if (updatedAddresses.length > 0 && !updatedAddresses.some(addr => addr.isDefault)) {
                updatedAddresses[0].isDefault = true;
              }

              setAddresses(updatedAddresses);
              
              if (user) {
                await updateUser({ savedAddresses: updatedAddresses });
              }
              
              Alert.alert('Success', 'Address deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete address. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (addressId: string) => {
    if (!user) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    try {
      const updatedAddresses = addresses.map(addr => ({
        ...addr,
        isDefault: addr.id === addressId,
      }));

      setAddresses(updatedAddresses);
      
      if (user) {
        await updateUser({ savedAddresses: updatedAddresses });
      }
      
      Alert.alert('Success', 'Default address updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update default address. Please try again.');
    }
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setNewAddressText(address.street);
  };

  const handleCancelEdit = () => {
    setEditingAddress(null);
    setNewAddressText('');
  };



  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Loading addresses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Saved Addresses</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Add/Edit Address Input */}
      <View style={styles.addAddressContainer}>
        <Card style={styles.inputCard}>
          {editingAddress && (
            <View style={styles.editModeHeader}>
              <Text style={styles.editModeText}>Editing Address</Text>
              <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButton}>
                <Ionicons name="close" size={20} color="#FF3B30" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.addressInput}
              placeholder={editingAddress ? "Edit address..." : "Enter new address..."}
              value={newAddressText}
              onChangeText={setNewAddressText}
              multiline
              numberOfLines={2}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleSaveAddress}
              disabled={!newAddressText.trim()}
            >
              <Ionicons 
                name={editingAddress ? "checkmark" : "add"} 
                size={20} 
                color={newAddressText.trim() ? "#007AFF" : "#8E8E93"} 
              />
              <Text style={[
                styles.addButtonText,
                { color: newAddressText.trim() ? "#007AFF" : "#8E8E93" }
              ]}>
                {editingAddress ? 'Update' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      </View>

      <ScrollView style={styles.content}>
        {addresses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyStateText}>No saved addresses</Text>
            <Text style={styles.emptyStateSubtext}>Add your first address using the input above</Text>
          </View>
        ) : (
          <View style={styles.addressList}>
            {addresses.map((address) => (
              <Card key={address.id} style={styles.addressCard}>
                <View style={styles.addressHeader}>
                  <View style={styles.addressInfo}>
                    <View style={styles.addressTitleRow}>
                      <Text style={styles.addressTitle}>
                        {address.street}
                      </Text>
                      {address.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultText}>DEFAULT</Text>
                        </View>
                      )}
                    </View>
F                    {(address.city || address.state || address.pincode) && (
                      <Text style={styles.addressDetails}>
                        {[address.city, address.state, address.pincode].filter(Boolean).join(', ')}
                      </Text>
                    )}
                    {address.landmark && (
                      <Text style={styles.landmark}>
                        Near {address.landmark}
                      </Text>
                    )}
                  </View>
                  <View style={styles.addressActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditAddress(address)}
                    >
                      <Ionicons name="create-outline" size={20} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDeleteAddress(address.id!)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {!address.isDefault && (
                  <TouchableOpacity
                    style={styles.setDefaultButton}
                    onPress={() => handleSetDefault(address.id!)}
                  >
                    <Ionicons name="star-outline" size={16} color="#FF9500" />
                    <Text style={styles.setDefaultText}>Set as Default</Text>
                  </TouchableOpacity>
                )}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
  },
  addAddressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inputCard: {
    marginBottom: 0,
  },
  editModeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  editModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF3B30',
    marginLeft: 4,
  },
  addressInput: {
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    minHeight: 60,
    textAlignVertical: 'top',
    flex: 1,
    marginRight: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    minWidth: 60,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    paddingHorizontal: 32,
  },
  addressList: {
    gap: 12,
  },
  addressCard: {
    marginBottom: 12,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  addressInfo: {
    flex: 1,
    marginRight: 12,
  },
  addressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addressDetails: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  landmark: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  addressActions: {
    flexDirection: 'column',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setDefaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  setDefaultText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF9500',
    marginLeft: 4,
  },
});

export default SavedAddressesScreen;
