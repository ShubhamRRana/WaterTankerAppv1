/**
 * Admin profile — replay walkthrough row
 */

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import AdminProfileScreen from '../../../screens/admin/AdminProfileScreen';
import { renderWithProviders } from '../../renderWithProviders';
import type { AdminUser } from '../../../types';

const mockNavigate = jest.fn();
const mockStartReplay = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../context/AdminWalkthroughContext', () => ({
  useOptionalAdminWalkthrough: jest.fn(),
}));

jest.mock('../../../store/authStore', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('../../../components/admin/AdminSubscriptionCard', () => {
  const React = require('react');
  const { View } = require('react-native');
  return () => <View testID="AdminSubscriptionCard" />;
});

jest.mock('../../../components/common/AdminMenuDrawer', () => {
  const React = require('react');
  return () => null;
});

jest.mock('../../../services/auth.service', () => ({
  AuthService: { deleteAdminAccount: jest.fn() },
}));

const adminUser: AdminUser = {
  id: 'admin-1',
  email: 'admin@test.com',
  password: 'hashed',
  name: 'Test Admin',
  role: 'admin',
  businessName: 'Test Business',
  phone: '9876543210',
  createdAt: new Date(),
};

describe('AdminProfileScreen replay walkthrough', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { useAuthStore } = require('../../../store/authStore');
    useAuthStore.mockReturnValue({
      user: adminUser,
      updateUser: jest.fn(),
      logout: jest.fn(),
      isLoading: false,
    });
  });

  it('calls startReplay when Replay walkthrough is pressed', () => {
    const { useOptionalAdminWalkthrough } = require('../../../context/AdminWalkthroughContext');
    useOptionalAdminWalkthrough.mockReturnValue({
      startReplay: mockStartReplay,
      isActive: false,
    });

    const { getByLabelText } = renderWithProviders(<AdminProfileScreen />);
    fireEvent.press(getByLabelText('Replay walkthrough'));

    expect(mockStartReplay).toHaveBeenCalledTimes(1);
  });

  it('hides Replay walkthrough when walkthrough context is unavailable', () => {
    const { useOptionalAdminWalkthrough } = require('../../../context/AdminWalkthroughContext');
    useOptionalAdminWalkthrough.mockReturnValue(null);

    const { queryByLabelText } = renderWithProviders(<AdminProfileScreen />);

    expect(queryByLabelText('Replay walkthrough')).toBeNull();
  });
});
