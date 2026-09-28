import React from 'react';
import { cn } from '@/lib/utils';
import type { DomainStatus, EmailStatus, DeliveryStatus } from '@sunmail/shared';

interface StatusBadgeProps {
  status: DomainStatus | EmailStatus | DeliveryStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  let badgeStyles = 'bg-zinc-800 text-zinc-300 border-zinc-700';
  let label = status;

  switch (status) {
    // Domains
    case 'verified':
    case 'forwarded':
    case 'success':
      badgeStyles = 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80';
      label = status === 'verified' ? 'Verified' : status === 'forwarded' ? 'Forwarded' : 'Success';
      break;

    case 'pending':
    case 'processing':
      badgeStyles = 'bg-amber-950/60 text-amber-400 border-amber-800/80';
      label = status === 'pending' ? 'Pending' : 'Processing';
      break;

    case 'received':
      badgeStyles = 'bg-blue-950/60 text-blue-400 border-blue-800/80';
      label = 'Received';
      break;

    case 'failed':
    case 'permanent_failure':
      badgeStyles = 'bg-rose-950/60 text-rose-400 border-rose-800/80';
      label = 'Failed';
      break;

    case 'rejected':
      badgeStyles = 'bg-red-950/80 text-red-400 border-red-800';
      label = 'Rejected';
      break;

    case 'temporary_failure':
      badgeStyles = 'bg-orange-950/60 text-orange-400 border-orange-800/80';
      label = 'Retry Queued';
      break;

    case 'disabled':
      badgeStyles = 'bg-zinc-900 text-zinc-500 border-zinc-800';
      label = 'Disabled';
      break;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border tracking-wide uppercase',
        badgeStyles,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {label}
    </span>
  );
}
