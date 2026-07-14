import React, { useEffect, useRef } from 'react';
import { View, type ViewProps } from 'react-native';
import type { WalkthroughTargetId } from './adminSteps';
import { targetRegistry } from './targetRegistry';

type WalkthroughTargetProps = ViewProps & {
  id: WalkthroughTargetId;
  children?: React.ReactNode;
};

export function WalkthroughTarget({ id, children, ...rest }: WalkthroughTargetProps) {
  const ref = useRef<View>(null);

  useEffect(() => targetRegistry.register(id, ref), [id]);

  return (
    <View ref={ref} collapsable={false} {...rest}>
      {children}
    </View>
  );
}
