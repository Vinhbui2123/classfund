'use client';

import { TrendingUp } from 'lucide-react';

interface StatusBadgeProps {
  status: 'unpaid' | 'partial' | 'full' | 'overpaid' | string;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  let label = '';
  let badgeClasses = '';
  let dotComponent = null;

  switch (status) {
    case 'unpaid':
      label = 'Chưa đóng';
      badgeClasses = 'bg-status-error-bg text-status-error-text border-status-error-text/10';
      dotComponent = <span className="h-1.5 w-1.5 rounded-full bg-status-error-text flex-shrink-0" />;
      break;
    case 'partial':
      label = 'Trả góp';
      badgeClasses = 'bg-status-warning-bg text-status-warning-text border-status-warning-text/10';
      dotComponent = <span className="h-1.5 w-1.5 rounded-full bg-status-warning-text flex-shrink-0" />;
      break;
    case 'full':
      label = 'Đóng đủ';
      badgeClasses = 'bg-status-success-bg text-status-success-text border-status-success-text/10';
      dotComponent = <span className="h-1.5 w-1.5 rounded-full bg-status-success-text flex-shrink-0" />;
      break;
    case 'overpaid':
      label = 'Đóng dư';
      badgeClasses = 'bg-status-success-bg text-status-success-text border-status-success-text/10';
      dotComponent = <TrendingUp className="w-3 h-3 text-status-success-text flex-shrink-0" />;
      break;
    default:
      label = 'Không rõ';
      badgeClasses = 'bg-bg-surface text-text-muted border-border-subtle';
      dotComponent = <span className="h-1.5 w-1.5 rounded-full bg-text-muted flex-shrink-0" />;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-semibold border ${badgeClasses} ${className}`}
    >
      {dotComponent}
      {label}
    </span>
  );
}
