import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  AlertTriangle,
  CheckCircle,
  CalendarCheck,
  Award,
  ArrowRight,
  TrendingUp,
  FileWarning,
  LifeBuoy,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { dashboardApi } from '../services/api';
import type {
  DashboardStats,
  RiskDistributionItem,
  SubjectPerformance,
  AttentionStudent,
} from '../types';
import { StatCard } from '../components/common/StatCard';
import { RiskBadge } from '../components/common/Badge';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [riskDist, setRiskDist] = useState<RiskDistributionItem[]>([]);
  const [subjectPerf, setSubjectPerf] = useState<SubjectPerformance[]>([]);
  const [attentionStudents, setAttentionStudents] = useState<AttentionStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsData, distData, perfData, attentionData] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getRiskDistribution(),
          dashboardApi.getSubjectPerformance(),
          dashboardApi.getAttentionStudents(6),
        ]);
        setStats(statsData);
        setRiskDist(distData);
        setSubjectPerf(perfData);
        setAttentionStudents(attentionData);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-md w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-slate-200 rounded-2xl" />
          <div className="h-72 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Colors for risk distribution pie chart
  const RISK_COLORS: Record<string, string> = {
    HIGH: '#f43f5e',
    MEDIUM: '#f59e0b',
    LOW: '#10b981',
    INSUFFICIENT_DATA: '#94a3b8',
  };

  const chartData = riskDist.map((item) => ({
    name: item.category.replace('_', ' '),
    value: item.count,
    color: RISK_COLORS[item.category] || '#94a3b8',
  }));

  return (
    <div className="space-y-8">
      {/* Page Title & Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Academic Performance & Risk Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time analytics, risk indicators, and intervention tracking for School of Computational Science, JSPM University Pune.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/students"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-all"
          >
            <Users className="w-4 h-4" />
            <span>Manage Students</span>
          </Link>
          <Link
            to="/risk"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all"
          >
            <TrendingUp className="w-4 h-4 text-rose-500" />
            <span>Risk Matrix</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={stats?.total_students || 0}
          subtitle={`${stats?.active_students || 0} currently enrolled`}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="High Risk Students"
          value={stats?.high_risk_count || 0}
          subtitle="Require immediate intervention"
          icon={AlertTriangle}
          color="rose"
          badge={{
            text: `${stats?.total_students ? Math.round(((stats.high_risk_count || 0) / stats.total_students) * 100) : 0}% of class`,
            variant: 'danger',
          }}
        />
        <StatCard
          title="Avg Attendance"
          value={`${stats?.avg_attendance_pct ? stats.avg_attendance_pct.toFixed(1) : 0}%`}
          subtitle="University minimum is 75%"
          icon={CalendarCheck}
          color={stats && stats.avg_attendance_pct < 75 ? 'amber' : 'emerald'}
        />
        <StatCard
          title="Avg Assessment Score"
          value={`${stats?.avg_marks_pct ? stats.avg_marks_pct.toFixed(1) : 0}%`}
          subtitle="Across all coursework tests"
          icon={Award}
          color="purple"
        />
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-amber-900">Moderate Risk</div>
              <div className="text-[11px] text-amber-700">Requires close monitoring</div>
            </div>
          </div>
          <span className="text-xl font-bold text-amber-900">{stats?.medium_risk_count || 0}</span>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-emerald-900">Low Risk (Safe)</div>
              <div className="text-[11px] text-emerald-700">Satisfactory standing</div>
            </div>
          </div>
          <span className="text-xl font-bold text-emerald-900">{stats?.low_risk_count || 0}</span>
        </div>

        <div className="bg-purple-50/60 border border-purple-200/80 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-xl text-purple-700">
              <LifeBuoy className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-purple-900">Active Interventions</div>
              <div className="text-[11px] text-purple-700">Planned or in progress</div>
            </div>
          </div>
          <span className="text-xl font-bold text-purple-900">{stats?.pending_interventions || 0}</span>
        </div>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Risk Distribution Breakdown
              </h2>
              <p className="text-xs text-slate-500">Classification across all active students</p>
            </div>
            <span className="text-xs font-semibold text-slate-400">Class of 2026</span>
          </div>

          <div className="h-64 w-full flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`${value} Students`, 'Count']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 text-center">
            {chartData.map((item) => (
              <div key={item.name} className="flex flex-col items-center">
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="text-sm font-bold text-slate-800 mt-0.5">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Subject Average Performance Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Subject Average Marks (%)
              </h2>
              <p className="text-xs text-slate-500">Comparative performance across syllabus</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectPerf} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis
                  dataKey="subject_code"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  interval={0}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <Tooltip
                  formatter={(value: any) => [`${value}%`, 'Avg Marks']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none',
                  }}
                />
                <Bar dataKey="avg_marks_pct" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-center text-[11px] text-slate-400 pt-2 border-t border-slate-100">
            Hover over bars to see full subject details and percentage score
          </div>
        </div>
      </div>

      {/* Urgent Attention Students Feed */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
              <FileWarning className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Students Requiring Immediate Attention
              </h2>
              <p className="text-xs text-slate-500">
                Highest risk index based on weighted attendance, assessments, and assignments
              </p>
            </div>
          </div>
          <Link
            to="/risk"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 font-semibold">Student Name</th>
                <th className="py-3 px-4 font-semibold">PRN</th>
                <th className="py-3 px-4 font-semibold">Attendance</th>
                <th className="py-3 px-4 font-semibold">Avg Marks</th>
                <th className="py-3 px-4 font-semibold">Risk Level</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attentionStudents.map((st) => (
                <tr key={st.student_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-900">
                    <Link
                      to={`/students/${st.student_id}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {st.student_name}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{st.prn}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-semibold ${
                        st.attendance_pct !== null && st.attendance_pct < 75
                          ? 'text-rose-600'
                          : 'text-slate-700'
                      }`}
                    >
                      {st.attendance_pct !== null ? `${st.attendance_pct.toFixed(1)}%` : '—'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-semibold ${
                        st.avg_marks_pct !== null && st.avg_marks_pct < 50
                          ? 'text-rose-600'
                          : 'text-slate-700'
                      }`}
                    >
                      {st.avg_marks_pct !== null ? `${st.avg_marks_pct.toFixed(1)}%` : '—'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <RiskBadge category={st.risk_category} score={st.risk_score} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`/students/${st.student_id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 text-[11px] font-medium transition-colors"
                    >
                      <span>360° Profile</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
