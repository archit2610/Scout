import { Check } from 'lucide-react';
import type { ReportStatus } from '../types';

const config: Record<ReportStatus, { className: string; label: string }> = {
  pending: { className: 'badge-pending', label: 'Pending' },
  running: { className: 'badge-running', label: 'Running' },
  done: { className: 'badge-done', label: 'Completed' },
  error: { className: 'badge-error', label: 'Error' },
};

export default function StatusBadge({ status }: { status: ReportStatus }) {
  const { className, label } = config[status];

  return (
    <span className={className}>
      {status === 'running' && (
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
      )}
      {status === 'done' && <Check size={12} />}
      {label}
    </span>
  );
}
