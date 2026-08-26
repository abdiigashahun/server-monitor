import React from 'react';
import { ShieldCheck, Clock, MinusCircle } from 'lucide-react';
import { Badge } from '../Common/Badge';
import { verificationVariant } from '../../utils/formatters';
import type { VerificationStatus } from '../../types';

const LABEL: Record<VerificationStatus, string> = {
  VERIFIED: 'Verified',
  PENDING: 'Pending',
  NOT_REQUIRED: 'No agent',
};

const TOOLTIP: Record<VerificationStatus, string> = {
  VERIFIED: 'An agent has checked in and proven this host — not a UI-side ping.',
  PENDING: 'Awaiting the first agent check-in before this host is verified.',
  NOT_REQUIRED: 'This entry does not expect an agent (e.g. a grouping container).',
};

interface VerificationBadgeProps {
  status: VerificationStatus;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ status }) => {
  const Icon = status === 'VERIFIED' ? ShieldCheck : status === 'PENDING' ? Clock : MinusCircle;
  return (
    <Badge variant={verificationVariant(status)} title={TOOLTIP[status]}>
      <Icon className="w-3 h-3" />
      {LABEL[status]}
    </Badge>
  );
};
