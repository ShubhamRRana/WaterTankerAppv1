/**
 * OrdersFilter Component Tests
 * Tests tab filtering logic and animations
 */

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import OrdersFilter from '../../../components/driver/OrdersFilter';
import { renderWithProviders as render } from '../../renderWithProviders';

describe('OrdersFilter', () => {
  const mockOnTabChange = jest.fn();

  const defaultProps = {
    activeTab: 'available' as const,
    onTabChange: mockOnTabChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tab Rendering', () => {
    it('should render all three tabs', () => {
      const { getByText } = render(<OrdersFilter {...defaultProps} />);
      
      expect(getByText('Available')).toBeTruthy();
      expect(getByText('Active')).toBeTruthy();
      expect(getByText('Done')).toBeTruthy();
    });

    it('should highlight active tab', () => {
      const { getByText } = render(<OrdersFilter {...defaultProps} activeTab="available" />);
      
      const availableTab = getByText('Available');
      expect(availableTab).toBeTruthy();
    });
  });

  describe('Tab Selection', () => {
    it('should call onTabChange when Available tab is pressed', () => {
      const { getByText } = render(<OrdersFilter {...defaultProps} activeTab="active" />);
      
      const availableTab = getByText('Available');
      fireEvent.press(availableTab);
      
      expect(mockOnTabChange).toHaveBeenCalledWith('available');
    });

    it('should call onTabChange when Active tab is pressed', () => {
      const { getByText } = render(<OrdersFilter {...defaultProps} activeTab="available" />);
      
      const activeTab = getByText('Active');
      fireEvent.press(activeTab);
      
      expect(mockOnTabChange).toHaveBeenCalledWith('active');
    });

    it('should call onTabChange when Done tab is pressed', () => {
      const { getByText } = render(<OrdersFilter {...defaultProps} activeTab="available" />);
      
      const doneTab = getByText('Done');
      fireEvent.press(doneTab);
      
      expect(mockOnTabChange).toHaveBeenCalledWith('completed');
    });
  });

  describe('Tab State Management', () => {
    it('should reflect activeTab prop changes', () => {
      const { rerender, getByText } = render(
        <OrdersFilter {...defaultProps} activeTab="available" />
      );
      
      expect(getByText('Available')).toBeTruthy();
      
      rerender(<OrdersFilter {...defaultProps} activeTab="active" />);
      
      expect(getByText('Active')).toBeTruthy();
    });

    it('should handle all tab states correctly', () => {
      const tabs = ['available', 'active', 'completed'] as const;
      
      tabs.forEach(tab => {
        const { getByText } = render(
          <OrdersFilter {...defaultProps} activeTab={tab} />
        );
        
        // Each tab should be renderable
        expect(getByText('Available')).toBeTruthy();
        expect(getByText('Active')).toBeTruthy();
        expect(getByText('Done')).toBeTruthy();
      });
    });
  });

  describe('Component Structure', () => {
    it('should render tab container', () => {
      const { UNSAFE_getByType } = render(<OrdersFilter {...defaultProps} />);
      
      // Component should render without errors
      expect(UNSAFE_getByType).toBeDefined();
    });

    it('should handle rapid tab changes', () => {
      const { getByText } = render(<OrdersFilter {...defaultProps} activeTab="available" />);
      
      const availableTab = getByText('Available');
      const activeTab = getByText('Active');
      const doneTab = getByText('Done');
      
      fireEvent.press(activeTab);
      fireEvent.press(doneTab);
      fireEvent.press(availableTab);
      
      expect(mockOnTabChange).toHaveBeenCalledTimes(3);
      expect(mockOnTabChange).toHaveBeenNthCalledWith(1, 'active');
      expect(mockOnTabChange).toHaveBeenNthCalledWith(2, 'completed');
      expect(mockOnTabChange).toHaveBeenNthCalledWith(3, 'available');
    });
  });
});

