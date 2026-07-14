import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../store/authStore';
import { WalkthroughService } from '../services/walkthrough.service';
import {
  persistIfNeeded,
  shouldAutoStart,
  shouldPersistOnClose,
  type TourMode,
} from '../walkthrough/controllerState';
import { ADMIN_WALKTHROUGH_STEPS, resolveStepTarget } from '../walkthrough/adminSteps';
import { targetRegistry, type Rect } from '../walkthrough/targetRegistry';
import WalkthroughOverlay from '../components/admin/WalkthroughOverlay';
import type { AdminStackParamList } from '../navigation/AdminNavigator';

type Nav = StackNavigationProp<AdminStackParamList>;

type TourStatus = 'idle' | 'active' | 'saving' | 'saveError';

interface AdminWalkthroughValue {
  startReplay: () => void;
  isActive: boolean;
}

const AdminWalkthroughContext = createContext<AdminWalkthroughValue | null>(null);

export function useAdminWalkthrough(): AdminWalkthroughValue {
  const ctx = useContext(AdminWalkthroughContext);
  if (!ctx) {
    throw new Error('useAdminWalkthrough must be used within AdminWalkthroughProvider');
  }
  return ctx;
}

export function useOptionalAdminWalkthrough(): AdminWalkthroughValue | null {
  return useContext(AdminWalkthroughContext);
}

const NAV_SETTLE_MS = 250;
const MEASURE_RETRY_MS = 300;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Props {
  children: React.ReactNode;
}

export const AdminWalkthroughProvider: React.FC<Props> = ({ children }) => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();

  const [status, setStatus] = useState<TourStatus>('idle');
  const [mode, setMode] = useState<TourMode | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [highlight, setHighlight] = useState<Rect | null>(null);

  const statusRef = useRef(status);
  statusRef.current = status;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const stepIndexRef = useRef(stepIndex);
  stepIndexRef.current = stepIndex;
  const hasRetriedEligibility = useRef(false);

  const reset = useCallback(() => {
    setStatus('idle');
    setMode(null);
    setStepIndex(0);
    setHighlight(null);
  }, []);

  const closeTour = useCallback(async () => {
    const currentMode = modeRef.current;
    if (!currentMode || !user?.id || !shouldPersistOnClose(currentMode)) {
      reset();
      return;
    }

    setStatus('saving');
    try {
      await persistIfNeeded(currentMode, user.id, WalkthroughService.markSeen);
      reset();
    } catch {
      setStatus('saveError');
    }
  }, [reset, user?.id]);

  const goToStep = useCallback((index: number) => {
    setHighlight(null);
    setStepIndex(index);
  }, []);

  const advance = useCallback(() => {
    const nextIndex = stepIndexRef.current + 1;
    if (nextIndex >= ADMIN_WALKTHROUGH_STEPS.length) {
      void closeTour();
      return;
    }
    goToStep(nextIndex);
  }, [closeTour, goToStep]);

  const handleNext = useCallback(() => advance(), [advance]);

  const handleBack = useCallback(() => {
    if (stepIndexRef.current === 0) return;
    goToStep(stepIndexRef.current - 1);
  }, [goToStep]);

  const handleSkip = useCallback(() => {
    void closeTour();
  }, [closeTour]);

  const handleFinish = useCallback(() => {
    void closeTour();
  }, [closeTour]);

  const handleRetrySave = useCallback(() => {
    void closeTour();
  }, [closeTour]);

  const startReplay = useCallback(() => {
    hasRetriedEligibility.current = true;
    setMode('replay');
    setHighlight(null);
    setStepIndex(0);
    setStatus('active');
  }, []);

  // Auto-start eligibility check; retries once on next AppState 'active' if load failed.
  useEffect(() => {
    const adminId = user?.id;
    if (!adminId) return;

    hasRetriedEligibility.current = false;
    let cancelled = false;

    const attempt = async () => {
      const seenAt = await WalkthroughService.getSeenAt(adminId);
      if (cancelled || statusRef.current !== 'idle') return;

      if (shouldAutoStart(seenAt)) {
        setMode('auto');
        setHighlight(null);
        setStepIndex(0);
        setStatus('active');
      }
    };

    void attempt();

    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || hasRetriedEligibility.current) return;
      hasRetriedEligibility.current = true;
      void attempt();
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [user?.id]);

  // Logout forces idle.
  useEffect(() => {
    if (!user) reset();
  }, [user, reset]);

  // Navigate + measure target for the current step.
  useEffect(() => {
    if (status !== 'active') return;

    const step = ADMIN_WALKTHROUGH_STEPS[stepIndex];
    if (!step) return;

    if (step.route === null) {
      setHighlight(null);
      return;
    }

    let cancelled = false;

    const resolveAndMeasure = async (): Promise<Rect | null> => {
      const targetId = resolveStepTarget(step, targetRegistry.getAvailableIds());
      if (!targetId) return null;
      return targetRegistry.measure(targetId);
    };

    const run = async () => {
      navigation.navigate(step.route as 'Bookings');
      await wait(NAV_SETTLE_MS);
      if (cancelled) return;

      let rect = await resolveAndMeasure();
      if (cancelled) return;

      if (!rect) {
        await wait(MEASURE_RETRY_MS);
        if (cancelled) return;
        rect = await resolveAndMeasure();
        if (cancelled) return;
      }

      if (!rect) {
        advance();
        return;
      }
      setHighlight(rect);
    };

    void run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, stepIndex, mode]);

  // Android back: step back if possible, else consume (must Skip to exit).
  useEffect(() => {
    if (status !== 'active') return;

    const onBackPress = () => {
      if (stepIndexRef.current > 0) {
        handleBack();
      }
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [status, handleBack]);

  const value = useMemo<AdminWalkthroughValue>(
    () => ({
      startReplay,
      isActive: status !== 'idle',
    }),
    [startReplay, status]
  );

  const currentStep = ADMIN_WALKTHROUGH_STEPS[stepIndex];
  const isLast = stepIndex === ADMIN_WALKTHROUGH_STEPS.length - 1;
  const overlayMode =
    status === 'saving'
      ? 'saving'
      : status === 'saveError'
      ? 'saveError'
      : currentStep?.id === 'welcome'
      ? 'welcome'
      : 'spotlight';

  return (
    <AdminWalkthroughContext.Provider value={value}>
      {children}
      {status !== 'idle' && currentStep && (
        <WalkthroughOverlay
          mode={overlayMode}
          title={currentStep.title}
          body={currentStep.body}
          stepIndex={stepIndex}
          stepCount={ADMIN_WALKTHROUGH_STEPS.length}
          highlight={highlight}
          onNext={handleNext}
          onBack={handleBack}
          onSkip={handleSkip}
          onFinish={handleFinish}
          onRetrySave={handleRetrySave}
          canGoBack={stepIndex > 0}
          isLast={isLast}
        />
      )}
    </AdminWalkthroughContext.Provider>
  );
};

export default AdminWalkthroughProvider;
