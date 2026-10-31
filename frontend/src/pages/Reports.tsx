import React, { useEffect, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Printer,
  FileText,
  BarChart3,
  CalendarCheck,
  Award,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { reportsApi, dashboardApi } from '../services/api';
import type { DashboardStats, AttentionStudent } from '../types';

export const Reports: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [highRiskStudents, setHighRiskStudents] = useState<AttentionStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReportData = async () => {
      try {
        setLoading(true);
        const [s, attention] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getAttentionStudents(15),
        ]);
        setStats(s);
        setHighRiskStudents(attention);
      } catch (err) {
        console.error('Error fetching report data', err);
      } finally {
        setLoading(false);
      }
    };
    loadReportData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Institutional Reports & Data Export
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate official academic audit sheets and export comma-separated raw datasets.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>Print Academic Audit</span>
        </button>
      </div>

      {/* CSV Export Cards Grid (Hidden when printing) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 rounded-2xl text-rose-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Risk Assessment CSV</h3>
              <p className="text-[11px] text-slate-500">All student risk scores & recommendations</p>
            </div>
          </div>
          <button
            onClick={reportsApi.downloadRiskCsv}
            className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-2xl text-emerald-600">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Attendance Log CSV</h3>
              <p className="text-[11px] text-slate-500">Historical records per lecture session</p>
            </div>
          </div>
          <button
            onClick={reportsApi.downloadAttendanceCsv}
            className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-2xl text-blue-600">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Assessment Marks CSV</h3>
              <p className="text-[11px] text-slate-500">Test scores, maximum marks & grades</p>
            </div>
          </div>
          <button
            onClick={reportsApi.downloadMarksCsv}
            className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 rounded-2xl text-purple-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Assignment Submissions CSV</h3>
              <p className="text-[11px] text-slate-500">Compliance statuses & coursework grades</p>
            </div>
          </div>
          <button
            onClick={reportsApi.downloadAssignmentsCsv}
            className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Official Printable Academic Audit Document */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-6">
        {/* University Header */}
        <div className="border-b-2 border-slate-900 pb-5 text-center">
          <div className="flex justify-center mb-3">
            <img src="/jspm_header.png" alt="JSPM University Pune" className="h-24 object-contain" />
          </div>
          <h2 className="text-xl font-black text-slate-950 uppercase tracking-wider">
            JSPM UNIVERSITY PUNE
          </h2>
          <p className="text-xs text-slate-600 italic font-medium">
            Inspiring Innovation. Transforming Talent.
          </p>
          <h3 className="text-sm font-bold text-slate-800 mt-1">
            Faculty of Science and Technology • School of Computational Science
          </h3>
          <p className="text-xs text-slate-700 font-semibold mt-0.5">
            B.Tech (Computer Science and Engineering) — Academic Evaluation Division
          </p>
          <p className="text-xs text-slate-500 mt-1">
            EduSupport Academic Risk & Performance Audit Report | Term 2026-27
          </p>
          <div className="mt-2 flex justify-center items-center gap-4 text-[11px] text-slate-500">
            <span>Project Group: <strong>G1</strong></span>
            <span>•</span>
            <span>Subject: <strong>Python Programming Lab</strong></span>
            <span>•</span>
            <span>Generated: {new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Aggregate KPI Summary */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            1. Institutional Cohort Summary
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Total Cohort</span>
              <div className="text-xl font-black text-slate-900 mt-0.5">{stats?.total_students || 0}</div>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-[10px] text-rose-700 font-bold uppercase">High Risk Students</span>
              <div className="text-xl font-black text-rose-700 mt-0.5">{stats?.high_risk_count || 0}</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
              <span className="text-[10px] text-blue-700 font-bold uppercase">Cohort Avg Attendance</span>
              <div className="text-xl font-black text-blue-700 mt-0.5">
                {stats?.avg_attendance_pct ? `${stats.avg_attendance_pct.toFixed(1)}%` : '0%'}
              </div>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
              <span className="text-[10px] text-purple-700 font-bold uppercase">Cohort Avg Marks</span>
              <div className="text-xl font-black text-purple-700 mt-0.5">
                {stats?.avg_marks_pct ? `${stats.avg_marks_pct.toFixed(1)}%` : '0%'}
              </div>
            </div>
          </div>
        </div>

        {/* High Risk Students Section */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            2. Priority Attention Roster (Score &ge; 50)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">PRN</th>
                  <th className="py-2.5 px-3 text-center">Risk Index</th>
                  <th className="py-2.5 px-3 text-center">Attendance %</th>
                  <th className="py-2.5 px-3 text-center">Avg Marks %</th>
                  <th className="py-2.5 px-3">Primary Action Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {highRiskStudents.map((st) => (
                  <tr key={st.student_id}>
                    <td className="py-2 px-3 font-semibold text-slate-900">{st.student_name}</td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{st.prn}</td>
                    <td className="py-2 px-3 text-center font-bold text-rose-600">
                      {st.risk_score ? st.risk_score.toFixed(1) : '—'}
                    </td>
                    <td className="py-2 px-3 text-center font-semibold">
                      {st.attendance_pct !== null ? `${st.attendance_pct.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2 px-3 text-center font-semibold">
                      {st.avg_marks_pct !== null ? `${st.avg_marks_pct.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2 px-3 text-[11px] text-slate-600">
                      Counseling & Remedial Study Plan
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Verification Sign-off Box */}
        <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs text-slate-700 border-t border-slate-200">
          <div>
            <div className="h-10 border-b border-dashed border-slate-300" />
            <p className="mt-1 font-semibold">Course Faculty In-Charge</p>
          </div>
          <div>
            <div className="h-10 border-b border-dashed border-slate-300" />
            <p className="mt-1 font-semibold">Academic Counselor</p>
          </div>
          <div>
            <div className="h-10 border-b border-dashed border-slate-300" />
            <p className="mt-1 font-semibold">Head of Department</p>
          </div>
        </div>
      </div>
    </div>
  );
};
