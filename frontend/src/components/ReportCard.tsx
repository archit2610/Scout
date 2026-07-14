import { Link } from 'react-router-dom';
import type { Report } from '../types';
import StatusBadge from './StatusBadge';

export default function ReportCard({ report }: { report: Report }) {
  const formattedDate = new Date(report.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Link to={`/report/${report.token}`} className="glass-card rounded-2xl p-5 block group">
      <p className="text-white/90 text-sm font-medium line-clamp-2 mb-4">
        {report.question}
      </p>
      <div className="flex items-center justify-between">
        <StatusBadge status={report.status} />
        <span className="text-white/40 text-xs">{formattedDate}</span>
      </div>
    </Link>
  );
}
