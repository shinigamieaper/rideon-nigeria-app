'use client';

import * as React from 'react';
import Button from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { AlertTriangle } from 'lucide-react';

export interface BookingErrorStateProps extends React.ComponentPropsWithoutRef<'div'> {
  isOpen: boolean;
  onTryAgain: () => void;
  onChangeMethod: () => void;
  onClose: () => void;
}

export default function BookingErrorState({ isOpen, onTryAgain, onChangeMethod, onClose }: BookingErrorStateProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Payment Failed">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5" aria-hidden />
        <p className="text-sm text-slate-700 dark:text-slate-200">
          We were unable to process the payment with your selected card. Please try again or use a different payment method.
        </p>
      </div>
      <div className="mt-6 flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={onChangeMethod}>Change Payment Method</Button>
        <Button onClick={onTryAgain}>Try Again</Button>
      </div>
    </Modal>
  );
}
