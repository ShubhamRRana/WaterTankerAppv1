/**
 * WalkthroughOverlay Component Tests
 */

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import WalkthroughOverlay from '../../../components/admin/WalkthroughOverlay';
import { renderWithProviders as render } from '../../renderWithProviders';

describe('WalkthroughOverlay', () => {
  const defaultProps = {
    mode: 'welcome' as const,
    title: 'Your agency is live',
    body: 'Your free trial has started. This short tour shows how to run bookings, crew, and collections.',
    stepIndex: 0,
    stepCount: 8,
    highlight: null,
    onNext: jest.fn(),
    onBack: jest.fn(),
    onSkip: jest.fn(),
    onFinish: jest.fn(),
    onRetrySave: jest.fn(),
    canGoBack: false,
    isLast: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('welcome mode', () => {
    it('renders title and body', () => {
      const { getByText } = render(<WalkthroughOverlay {...defaultProps} />);

      expect(getByText('Your agency is live')).toBeTruthy();
      expect(getByText(defaultProps.body)).toBeTruthy();
    });

    it('calls onNext when Next is pressed', () => {
      const { getByText } = render(<WalkthroughOverlay {...defaultProps} />);

      fireEvent.press(getByText('Next'));

      expect(defaultProps.onNext).toHaveBeenCalledTimes(1);
    });

    it('calls onSkip when Skip tour is pressed', () => {
      const { getByText } = render(<WalkthroughOverlay {...defaultProps} />);

      fireEvent.press(getByText('Skip tour'));

      expect(defaultProps.onSkip).toHaveBeenCalledTimes(1);
    });

    it('does not show Back when canGoBack is false', () => {
      const { queryByText } = render(<WalkthroughOverlay {...defaultProps} />);

      expect(queryByText('Back')).toBeNull();
    });

    it('shows Finish instead of Next when isLast is true', () => {
      const { getByText, queryByText } = render(
        <WalkthroughOverlay {...defaultProps} isLast />
      );

      expect(getByText('Finish')).toBeTruthy();
      expect(queryByText('Next')).toBeNull();
    });

    it('calls onFinish when Finish is pressed on last step', () => {
      const { getByText } = render(<WalkthroughOverlay {...defaultProps} isLast />);

      fireEvent.press(getByText('Finish'));

      expect(defaultProps.onFinish).toHaveBeenCalledTimes(1);
    });

    it('calls onBack when Back is pressed and canGoBack is true', () => {
      const { getByText } = render(
        <WalkthroughOverlay {...defaultProps} canGoBack stepIndex={1} />
      );

      fireEvent.press(getByText('Back'));

      expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('spotlight mode with highlight', () => {
    it('renders without crashing given a highlight rect', () => {
      const { getByText } = render(
        <WalkthroughOverlay
          {...defaultProps}
          mode="spotlight"
          title="Bookings"
          body="See and manage every booking here."
          stepIndex={1}
          highlight={{ x: 10, y: 20, width: 100, height: 40 }}
        />
      );

      expect(getByText('Bookings')).toBeTruthy();
    });
  });

  describe('saving mode', () => {
    it('disables Next control while saving', () => {
      const { getByText } = render(
        <WalkthroughOverlay {...defaultProps} mode="saving" isLast stepIndex={7} />
      );

      const finishButton = getByText('Finish');
      fireEvent.press(finishButton);

      expect(defaultProps.onFinish).not.toHaveBeenCalled();
    });

    it('disables Skip tour control while saving', () => {
      const { getByText } = render(
        <WalkthroughOverlay {...defaultProps} mode="saving" />
      );

      fireEvent.press(getByText('Skip tour'));

      expect(defaultProps.onSkip).not.toHaveBeenCalled();
    });
  });

  describe('saveError mode', () => {
    it('shows Retry control and error copy', () => {
      const { getByText } = render(
        <WalkthroughOverlay {...defaultProps} mode="saveError" />
      );

      expect(getByText("Couldn't save progress")).toBeTruthy();
      expect(getByText('Retry')).toBeTruthy();
    });

    it('calls onRetrySave when Retry is pressed', () => {
      const { getByText } = render(
        <WalkthroughOverlay {...defaultProps} mode="saveError" />
      );

      fireEvent.press(getByText('Retry'));

      expect(defaultProps.onRetrySave).toHaveBeenCalledTimes(1);
    });
  });

  describe('progress announcement', () => {
    it('announces current step position', () => {
      const { getByText } = render(
        <WalkthroughOverlay {...defaultProps} stepIndex={2} stepCount={8} />
      );

      expect(getByText('Step 3 of 8')).toBeTruthy();
    });
  });
});
