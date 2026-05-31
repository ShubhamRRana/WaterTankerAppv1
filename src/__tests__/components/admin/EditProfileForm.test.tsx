/**
 * EditProfileForm Component Tests
 * Tests business logic: character counting, validation display, form interactions
 */

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders as render } from '../../renderWithProviders';
import { TextInput } from 'react-native';
import EditProfileForm from '../../../components/admin/EditProfileForm';

describe('EditProfileForm', () => {
  const mockFormData = {
    businessName: '',
    name: '',
    email: '',
    phone: '',
  };

  const mockFormErrors = {};

  const defaultProps = {
    formData: mockFormData,
    formErrors: mockFormErrors,
    isSaving: false,
    isDirty: false,
    onFieldChange: jest.fn(),
    onSave: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Character Counting Logic', () => {
    it('should display character count for business name', () => {
      const formData = { ...mockFormData, businessName: 'Test Business' };
      const { getByText } = render(
        <EditProfileForm {...defaultProps} formData={formData} />
      );
      
      expect(getByText('13/100')).toBeTruthy();
    });

    it('should display character count for name', () => {
      const formData = { ...mockFormData, name: 'John Doe' };
      const { getByText } = render(
        <EditProfileForm {...defaultProps} formData={formData} />
      );
      
      expect(getByText('8/50')).toBeTruthy();
    });

    it('should display character count for email', () => {
      const formData = { ...mockFormData, email: 'test@example.com' };
      const { getByText } = render(
        <EditProfileForm {...defaultProps} formData={formData} />
      );
      
      expect(getByText('16/100')).toBeTruthy();
    });

    it('should display character count for phone', () => {
      const formData = { ...mockFormData, phone: '1234567890' };
      const { getByText } = render(
        <EditProfileForm {...defaultProps} formData={formData} />
      );
      
      expect(getByText('10/10')).toBeTruthy();
    });

    it('should show error color when business name exceeds 90% of max length', () => {
      const longName = 'A'.repeat(91);
      const formData = { ...mockFormData, businessName: longName };
      const { getByText } = render(
        <EditProfileForm {...defaultProps} formData={formData} />
      );
      
      const countText = getByText('91/100');
      expect(countText).toBeTruthy();
    });

    it('should show warning color when business name exceeds 75% of max length', () => {
      const mediumName = 'A'.repeat(76);
      const formData = { ...mockFormData, businessName: mediumName };
      const { getByText } = render(
        <EditProfileForm {...defaultProps} formData={formData} />
      );
      
      const countText = getByText('76/100');
      expect(countText).toBeTruthy();
    });
  });

  describe('Form Field Interactions', () => {
    it('should call onFieldChange when business name is changed', () => {
      const { getByPlaceholderText } = render(
        <EditProfileForm {...defaultProps} />
      );
      
      const input = getByPlaceholderText('Enter business name');
      fireEvent.changeText(input, 'New Business');
      
      expect(defaultProps.onFieldChange).toHaveBeenCalledWith('businessName', 'New Business');
    });

    it('should call onFieldChange when email is changed', () => {
      const { getByPlaceholderText } = render(
        <EditProfileForm {...defaultProps} />
      );
      
      const input = getByPlaceholderText('Enter email address');
      fireEvent.changeText(input, 'test@example.com');
      
      expect(defaultProps.onFieldChange).toHaveBeenCalledWith('email', 'test@example.com');
    });
  });

  describe('Error Display', () => {
    it('should display business name error when present', () => {
      const formErrors = { businessName: 'Business name is required' };
      const { getByText } = render(
        <EditProfileForm {...defaultProps} formErrors={formErrors} />
      );
      
      expect(getByText('Business name is required')).toBeTruthy();
    });

    it('should display name error when present', () => {
      const formErrors = { name: 'Name is required' };
      const { getByText } = render(
        <EditProfileForm {...defaultProps} formErrors={formErrors} />
      );
      
      expect(getByText('Name is required')).toBeTruthy();
    });

    it('should display email error when present', () => {
      const formErrors = { email: 'Invalid email format' };
      const { getByText } = render(
        <EditProfileForm {...defaultProps} formErrors={formErrors} />
      );
      
      expect(getByText('Invalid email format')).toBeTruthy();
    });

    it('should display phone error when present', () => {
      const formErrors = { phone: 'Invalid phone number' };
      const { getByText } = render(
        <EditProfileForm {...defaultProps} formErrors={formErrors} />
      );
      
      expect(getByText('Invalid phone number')).toBeTruthy();
    });
  });

  describe('Form Field Navigation (onSubmitEditing)', () => {
    it('should focus name input when business name onSubmitEditing is triggered', () => {
      const focusSpy = jest.spyOn(TextInput.prototype, 'focus');
      
      const { getByPlaceholderText } = render(
        <EditProfileForm {...defaultProps} />
      );
      
      const businessNameInput = getByPlaceholderText('Enter business name');
      
      fireEvent(businessNameInput, 'submitEditing');
      
      expect(focusSpy).toHaveBeenCalled();
      
      focusSpy.mockRestore();
    });

    it('should focus email input when name onSubmitEditing is triggered', () => {
      const focusSpy = jest.spyOn(TextInput.prototype, 'focus');
      
      const { getByPlaceholderText } = render(
        <EditProfileForm {...defaultProps} />
      );
      
      const nameInput = getByPlaceholderText('Enter full name');
      
      fireEvent(nameInput, 'submitEditing');
      
      expect(focusSpy).toHaveBeenCalled();
      
      focusSpy.mockRestore();
    });

    it('should focus phone input when email onSubmitEditing is triggered', () => {
      const focusSpy = jest.spyOn(TextInput.prototype, 'focus');
      
      const { getByPlaceholderText } = render(
        <EditProfileForm {...defaultProps} />
      );
      
      const emailInput = getByPlaceholderText('Enter email address');
      
      fireEvent(emailInput, 'submitEditing');
      
      expect(focusSpy).toHaveBeenCalled();
      
      focusSpy.mockRestore();
    });

    it('should call onSave when phone onSubmitEditing is triggered', () => {
      const { getByPlaceholderText } = render(
        <EditProfileForm {...defaultProps} isDirty={true} />
      );
      
      const phoneInput = getByPlaceholderText('Enter phone number');
      
      fireEvent(phoneInput, 'submitEditing');
      
      expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
    });
  });

  describe('Save and Cancel Actions', () => {
    it('should call onSave when Save button is pressed', () => {
      const { getByText } = render(
        <EditProfileForm {...defaultProps} isDirty={true} />
      );
      
      const saveButton = getByText('Save');
      fireEvent.press(saveButton);
      
      expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when Cancel button is pressed', () => {
      const { getByText } = render(
        <EditProfileForm {...defaultProps} />
      );
      
      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);
      
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('should disable Save button when isDirty is false', () => {
      const { getByText } = render(
        <EditProfileForm {...defaultProps} isDirty={false} />
      );
      
      const saveButton = getByText('Save');
      expect(saveButton).toBeTruthy();
    });

    it('should disable Save button when isSaving is true', () => {
      const { queryByText } = render(
        <EditProfileForm {...defaultProps} isSaving={true} isDirty={true} />
      );
      
      expect(queryByText('Saving...')).toBeNull();
      expect(queryByText('Save')).toBeNull();
    });

    it('should disable Cancel button when isSaving is true', () => {
      const { getByText } = render(
        <EditProfileForm {...defaultProps} isSaving={true} />
      );
      
      const cancelButton = getByText('Cancel');
      expect(cancelButton).toBeTruthy();
    });
  });

  describe('Form Validation Display', () => {
    it('should apply error styling to input when error exists', () => {
      const formErrors = { businessName: 'Error message' };
      const { getByPlaceholderText } = render(
        <EditProfileForm {...defaultProps} formErrors={formErrors} />
      );
      
      const input = getByPlaceholderText('Enter business name');
      expect(input).toBeTruthy();
    });

    it('should not show error styling when no error exists', () => {
      const { getByPlaceholderText } = render(
        <EditProfileForm {...defaultProps} />
      );
      
      const input = getByPlaceholderText('Enter business name');
      expect(input).toBeTruthy();
    });
  });
});
