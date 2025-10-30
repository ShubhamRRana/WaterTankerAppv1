import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  Image,
  TextInput,
} from 'react-native';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography, Button, Card, LoadingSpinner } from '../../components/common';
import { useAuthStore } from '../../store/authStore';
import { User } from '../../types';

const AdminProfileScreen: React.FC = () => {
  const { user, updateUser, logout, isLoading } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
  });

  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      const updates: Partial<User> = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
      };
      await updateUser(updates);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(w => w.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
          <Typography variant="body" style={styles.loadingText}>
            Loading profile...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Typography variant="h3">Profile Not Found</Typography>
          <Typography variant="body" style={styles.loadingText}>Try logging in again.</Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {user.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Typography variant="h3" style={styles.avatarText}>
                  {getInitials(user.name || 'A')}
                </Typography>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Typography variant="h3" style={styles.userName}>{user.name}</Typography>
              <Typography variant="body" style={styles.userPhone}>{user.phone}</Typography>
            </View>
          </View>

          {!isEditing && (
            <Button title="Edit Profile" onPress={() => setIsEditing(true)} variant="primary" />
          )}
        </Card>

        {isEditing && (
          <Card style={styles.editCard}>
            <Typography variant="h3" style={styles.sectionTitle}>Edit Profile</Typography>
            <View style={styles.inputContainer}>
              <Typography variant="body" style={styles.inputLabel}>Full Name</Typography>
              <TextInput
                style={styles.textInput}
                value={editForm.name}
                onChangeText={(t) => setEditForm(prev => ({ ...prev, name: t }))}
                placeholder="Enter full name"
                placeholderTextColor="#8E8E93"
              />
            </View>
            <View style={styles.inputContainer}>
              <Typography variant="body" style={styles.inputLabel}>Phone Number</Typography>
              <TextInput
                style={styles.textInput}
                value={editForm.phone}
                onChangeText={(t) => setEditForm(prev => ({ ...prev, phone: t }))}
                placeholder="Enter phone number"
                placeholderTextColor="#8E8E93"
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.row}>
              <Button title="Cancel" onPress={() => setIsEditing(false)} variant="outline" style={styles.rowButton} />
              <Button title="Save" onPress={handleSaveProfile} variant="primary" style={styles.rowButton} />
            </View>
          </Card>
        )}

        <View style={styles.logoutContainer}>
          <Button title="Logout" onPress={handleLogout} variant="outline" />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
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
  contentContainer: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: '#8E8E93',
  },
  profileCard: {
    margin: 16,
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  userPhone: {
    fontSize: 14,
    color: '#8E8E93',
  },
  editCard: {
    marginHorizontal: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  logoutContainer: {
    margin: 16,
  },
});

export default AdminProfileScreen;


