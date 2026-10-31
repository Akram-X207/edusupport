import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Sliders,
  CheckCircle2,
  Info,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { riskApi } from '../services/api';
import type { RiskAssessment, RiskCategory } from '../types';
import { RiskBadge } from '../components/common/Badge';

export const RiskAnalysis: React.FC = () => {
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [runningEngine, setRunningEngine] = useState(false);
  const [engineMessage, setEngineMessage] = useState<string | null>(null);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const list = await riskApi.getAll(filterCategory || undefined);
      // Sort highest risk to lowest
      list.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0));
      setAssessments(list);
    } catch (err) {
      console.error('Error fetching risk assessments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, [filterCategory]);

  const handleRunBatchEngine = async () => {
    try {
      setRunningEngine(true);
      setEngineMessage(null);
      const res = await riskApi.calculateAll();
      setEngineMessage(`Evaluated ${res.processed} students (${res.high_risk} High Risk)`);
      await fetchAssessments();
      setTimeout(() => setEngineMessage(null), 4000);
    } catch (err) {
      alert('Error running risk engine.');
    } finally {
      setRunningEngine(false);
    }
  };

  // High, medium, low counters
  const highCount = assessments.filter((a) => a.category === 'HIGH').length;
  const mediumCount = assessments.filter((a) => a.category === 'MEDIUM').length;
  const lowCount = assessments.filter((a) => a.category === 'LOW').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Academic Risk Engine & Predictive Matrix
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Algorithmic student risk classification based on weighted attendance, test marks, and submission compliance.
          </p>
        </div>

        <button
          onClick={handleRunBatchEngine}
          disabled={runningEngine}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${runningEngine ? 'animate-spin' : ''}`} />
          <span>{runningEngine ? 'Computing Batch Engine...' : 'Run Engine on All Students'}</span>
        </button>
      </div>

      {engineMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{engineMessage}</span>
        </div>
      )}

      {/* Formula & Weights Explanation Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-xl border border-slate-700">
        <div className="flex items-center gap-2.5 mb-3 text-blue-400">
          <Sliders className="w-5 h-5" />
          <h2 className="text-xs font-bold uppercase tracking-wider">
            Risk Calculation Mathematical Model
          </h2>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          The risk engine computes an aggregated academic vulnerability index $R \in [0, 100]$ using the weighted composite formula:
        </p>

        <div className="my-3 px-4 py-2.5 rounded-xl bg-slate-950/60 font-mono text-xs text-blue-300 border border-slate-800 inline-block">
          Overall Risk = (Attendance Risk × 0.40) + (Academic Marks Risk × 0.40) + (Assignment Non-Compliance × 0.20)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-700/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-300">
              <strong>High Risk (Score &ge; 50):</strong> Urgent faculty intervention
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-300">
              <strong>Moderate Risk (30–49):</strong> Remedial tutorials
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-300">
              <strong>Low Risk (&lt; 30):</strong> Good standing
            </span>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterCategory('')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterCategory === ''
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Students ({assessments.length})
        </button>
        <button
          onClick={() => setFilterCategory('HIGH')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterCategory === 'HIGH'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
          }`}
        >
          High Risk ({highCount})
        </button>
        <button
          onClick={() => setFilterCategory('MEDIUM')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterCategory === 'MEDIUM'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
          }`}
        >
          Moderate Risk ({mediumCount})
        </button>
        <button
          onClick={() => setFilterCategory('LOW')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterCategory === 'LOW'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          Low Risk ({lowCount})
        </button>
      </div>

      {/* Risk Assessments Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Student & PRN</th>
                <th className="py-3.5 px-4 font-semibold">Risk Classification</th>
                <th className="py-3.5 px-4 font-semibold">Attendance (40%)</th>
                <th className="py-3.5 px-4 font-semibold">Marks (40%)</th>
                <th className="py-3.5 px-4 font-semibold">Assignments (20%)</th>
                <th className="py-3.5 px-4 font-semibold">Primary Risk Factor</th>
                <th className="py-3.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading risk assessments...</span>
                  </td>
                </tr>
              ) : assessments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No risk evaluations found matching this filter.
                  </td>
                </tr>
              ) : (
                assessments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/students/${a.student_id}`}
                        className="font-bold text-slate-900 hover:text-blue-600 transition-colors block"
                      >
                        {a.student?.full_name || `Student #${a.student_id}`}
                      </Link>
                      <span className="text-[11px] font-mono text-slate-400">
                        {a.student?.prn || '—'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <RiskBadge
                        category={a.category as RiskCategory}
                        score={a.overall_score}
                        size="md"
                      />
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">
                        {a.attendance_score !== null ? a.attendance_score.toFixed(1) : '—'}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {a.attendance_pct !== null ? `${a.attendance_pct.toFixed(0)}% present` : 'No data'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">
                        {a.marks_score !== null ? a.marks_score.toFixed(1) : '—'}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {a.avg_marks_pct !== null ? `${a.avg_marks_pct.toFixed(0)}% avg` : 'No data'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">
                        {a.assignment_score !== null ? a.assignment_score.toFixed(1) : '—'}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {a.assignment_completion_pct !== null
                          ? `${a.assignment_completion_pct.toFixed(0)}% done`
                          : 'No data'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      {a.risk_factors && a.risk_factors.length > 0 ? (
                        <p className="text-[11px] text-slate-600 truncate" title={a.risk_factors[0]}>
                          {a.risk_factors[0]}
                        </p>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">None</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/students/${a.student_id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 font-medium text-[11px] transition-colors"
                      >
                        <span>Profile</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
