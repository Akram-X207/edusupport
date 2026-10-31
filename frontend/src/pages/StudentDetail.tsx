import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  CalendarCheck,
  Award,
  FileText,
  LifeBuoy,
  Plus,
  Mail,
  User,
  GraduationCap,
  CheckCircle2,
} from 'lucide-react';
import {
  studentsApi,
  riskApi,
  attendanceApi,
  assessmentsApi,
  assignmentsApi,
  interventionsApi,
} from '../services/api';
import type {
  Student,
  RiskAssessment,
  AttendanceRecord,
  AssessmentResult,
  AssignmentSubmission,
  Intervention,
} from '../types';
import { RiskGauge } from '../components/common/RiskGauge';
import {
  AttendanceBadge,
  SubmissionBadge,
  InterventionBadge,
} from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const StudentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const studentId = Number(id);

  const [student, setStudent] = useState<Student | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);

  const [activeTab, setActiveTab] = useState<'attendance' | 'marks' | 'assignments' | 'interventions'>('attendance');
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  // Intervention modal state
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [newIntervention, setNewIntervention] = useState({
    issue_identified: '',
    recommended_actions: '',
    faculty_notes: '',
    follow_up_date: '',
  });

  const loadAllStudentData = async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      const [st, att, marks, subs, interv] = await Promise.all([
        studentsApi.getById(studentId),
        attendanceApi.getStudentHistory(studentId).catch(() => []),
        assessmentsApi.getStudentMarks(studentId).catch(() => []),
        assignmentsApi.getStudentSubmissions(studentId).catch(() => []),
        interventionsApi.getAll(undefined, studentId).catch(() => []),
      ]);

      setStudent(st);
      setAttendanceRecords(att);
      setAssessmentResults(marks);
      setSubmissions(subs);
      setInterventions(interv);

      try {
        const risk = await riskApi.getByStudentId(studentId);
        setRiskAssessment(risk);
      } catch {
        setRiskAssessment(null);
      }
    } catch (err) {
      console.error('Error loading student profile', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllStudentData();
  }, [studentId]);

  const handleRecalculateRisk = async () => {
    try {
      setRecalculating(true);
      const updated = await riskApi.calculateForStudent(studentId);
      setRiskAssessment(updated);
    } catch (err) {
      alert('Failed to calculate risk score.');
    } finally {
      setRecalculating(false);
    }
  };

  const handleCreateIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await interventionsApi.create({
        student_id: studentId,
        ...newIntervention,
      });
      setIsInterventionModalOpen(false);
      setNewIntervention({
        issue_identified: '',
        recommended_actions: '',
        faculty_notes: '',
        follow_up_date: '',
      });
      const updatedInterventions = await interventionsApi.getAll(undefined, studentId);
      setInterventions(updatedInterventions);
    } catch (err) {
      alert('Failed to log intervention.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading 360° student profile...</span>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-bold text-slate-800">Student not found</h2>
        <Link to="/students" className="mt-2 text-xs text-blue-600 underline">
          Back to students directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button & Action Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/students"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Students</span>
        </Link>

        <button
          onClick={handleRecalculateRisk}
          disabled={recalculating}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : ''}`} />
          <span>{recalculating ? 'Analyzing...' : 'Recalculate Risk'}</span>
        </button>
      </div>

      {/* Student Overview Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-blue-500/20 shrink-0">
              {student.full_name.charAt(0)}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {student.full_name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 font-mono">
                  PRN: {student.prn}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
                  Semester {student.semester}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {student.email || 'No email registered'}
                </span>
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  Division: {student.division || 'A'} | Roll: {student.rollno || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Gauge & AI Insights Row */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Risk Gauge (5 cols) */}
          <div className="lg:col-span-5">
            <RiskGauge assessment={riskAssessment} />
          </div>

          {/* Risk Factors & Recommendations (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Risk Factors */}
            <div className="bg-rose-50/50 rounded-2xl p-5 border border-rose-200/60">
              <div className="flex items-center gap-2 mb-2 text-rose-800">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Identified Academic Risk Factors
                </h3>
              </div>

              {riskAssessment && riskAssessment.risk_factors && riskAssessment.risk_factors.length > 0 ? (
                <ul className="space-y-1.5">
                  {riskAssessment.risk_factors.map((factor, idx) => (
                    <li key={idx} className="text-xs text-rose-900 flex items-start gap-2">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">
                  No critical risk factors flagged at this time.
                </p>
              )}
            </div>

            {/* Actionable Recommendations */}
            <div className="bg-blue-50/40 rounded-2xl p-5 border border-blue-200/60 flex-1">
              <div className="flex items-center gap-2 mb-2 text-blue-800">
                <Lightbulb className="w-4 h-4 shrink-0 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Engine Action Recommendations
                </h3>
              </div>

              {riskAssessment && riskAssessment.recommendations && riskAssessment.recommendations.length > 0 ? (
                <ul className="space-y-1.5">
                  {riskAssessment.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">
                  Maintain standard academic monitoring.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section for Deep Dive */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-200/80 px-6 pt-4 gap-2 overflow-x-auto">
          {[
            { id: 'attendance', label: 'Attendance Records', icon: CalendarCheck, count: attendanceRecords.length },
            { id: 'marks', label: 'Assessment Results', icon: Award, count: assessmentResults.length },
            { id: 'assignments', label: 'Assignments', icon: FileText, count: submissions.length },
            { id: 'interventions', label: 'Interventions Hub', icon: LifeBuoy, count: interventions.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 pb-4 px-3 text-xs font-bold border-b-2 transition-all shrink-0 ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Attendance */}
        {activeTab === 'attendance' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Date</th>
                    <th className="py-3 px-4 font-semibold">Session Topic</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceRecords.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No attendance records found for this student.
                      </td>
                    </tr>
                  ) : (
                    attendanceRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                          {rec.session_id ? `Session #${rec.session_id}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-medium">
                          Lecture Session
                        </td>
                        <td className="py-3 px-4">
                          <AttendanceBadge status={rec.status} />
                        </td>
                        <td className="py-3 px-4 text-slate-500">{rec.remarks || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Marks */}
        {activeTab === 'marks' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Assessment</th>
                    <th className="py-3 px-4 font-semibold">Subject</th>
                    <th className="py-3 px-4 font-semibold">Marks Obtained</th>
                    <th className="py-3 px-4 font-semibold">Max Marks</th>
                    <th className="py-3 px-4 font-semibold">Percentage</th>
                    <th className="py-3 px-4 font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assessmentResults.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No assessment marks entered yet.
                      </td>
                    </tr>
                  ) : (
                    assessmentResults.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {res.assessment?.name || `Assessment #${res.assessment_id}`}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {res.assessment?.subject?.name || 'Coursework'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {res.marks_obtained}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {res.assessment?.max_marks || 100}
                        </td>
                        <td className="py-3 px-4 font-bold">
                          <span
                            className={
                              res.percentage !== undefined && res.percentage < 50
                                ? 'text-rose-600'
                                : 'text-emerald-600'
                            }
                          >
                            {res.percentage !== undefined ? `${res.percentage.toFixed(1)}%` : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{res.remarks || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Assignments */}
        {activeTab === 'assignments' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Assignment Title</th>
                    <th className="py-3 px-4 font-semibold">Subject</th>
                    <th className="py-3 px-4 font-semibold">Due Date</th>
                    <th className="py-3 px-4 font-semibold">Submission Status</th>
                    <th className="py-3 px-4 font-semibold">Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No assignment submission records found.
                      </td>
                    </tr>
                  ) : (
                    submissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {sub.assignment?.title || `Assignment #${sub.assignment_id}`}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {sub.assignment?.subject?.name || 'Subject'}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {sub.assignment?.due_date || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <SubmissionBadge status={sub.status} />
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-700">
                          {sub.marks_obtained !== undefined && sub.marks_obtained !== null
                            ? `${sub.marks_obtained} / ${sub.assignment?.max_marks || 20}`
                            : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Interventions */}
        {activeTab === 'interventions' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Academic Remediation & Mentorship Log
                </h3>
                <p className="text-[11px] text-slate-500">
                  Document counseling sessions, parent communications, and remedial plans.
                </p>
              </div>
              <button
                onClick={() => setIsInterventionModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Intervention</span>
              </button>
            </div>

            <div className="space-y-3">
              {interventions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No active interventions recorded for this student yet.
                </div>
              ) : (
                interventions.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <InterventionBadge status={inv.status} />
                        <span className="text-[11px] text-slate-400 font-mono">
                          Logged: {new Date(inv.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {inv.follow_up_date && (
                        <span className="text-[11px] text-blue-600 font-medium">
                          Follow-up: {inv.follow_up_date}
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-bold text-slate-900">
                      Issue: {inv.issue_identified}
                    </div>

                    {inv.recommended_actions && (
                      <div className="text-xs text-slate-600">
                        <strong className="text-slate-800">Action:</strong> {inv.recommended_actions}
                      </div>
                    )}

                    {inv.faculty_notes && (
                      <div className="text-[11px] text-slate-500 italic bg-white p-2.5 rounded-xl border border-slate-100">
                        " {inv.faculty_notes} "
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Log Intervention Modal */}
      <Modal
        isOpen={isInterventionModalOpen}
        onClose={() => setIsInterventionModalOpen(false)}
        title="Record Academic Intervention"
        subtitle={`Student: ${student.full_name} (${student.prn})`}
      >
        <form onSubmit={handleCreateIntervention} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Issue Identified *
            </label>
            <textarea
              required
              rows={2}
              placeholder="e.g. Attendance fell below 60% with back-to-back quiz failures."
              value={newIntervention.issue_identified}
              onChange={(e) =>
                setNewIntervention({ ...newIntervention, issue_identified: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Recommended Remedial Action
            </label>
            <input
              type="text"
              placeholder="e.g. Schedule peer mentoring session & parent notification"
              value={newIntervention.recommended_actions}
              onChange={(e) =>
                setNewIntervention({ ...newIntervention, recommended_actions: e.target.value })
              }
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Faculty / Mentor Confidential Notes
            </label>
            <textarea
              rows={2}
              placeholder="Private notes on student conversation..."
              value={newIntervention.faculty_notes}
              onChange={(e) =>
                setNewIntervention({ ...newIntervention, faculty_notes: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Follow-Up Review Date
            </label>
            <input
              type="date"
              value={newIntervention.follow_up_date}
              onChange={(e) =>
                setNewIntervention({ ...newIntervention, follow_up_date: e.target.value })
              }
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsInterventionModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
            >
              Save Intervention
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
