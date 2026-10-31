import React, { useEffect, useState } from 'react';
import {
  LifeBuoy,
  Plus,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  User,
  ArrowRight,
} from 'lucide-react';
import { interventionsApi, studentsApi } from '../services/api';
import type { Intervention, Student, InterventionStatus } from '../types';
import { InterventionBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const Interventions: React.FC = () => {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // New intervention modal state
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newInv, setNewInv] = useState({
    student_id: 0,
    issue_identified: '',
    recommended_actions: '',
    faculty_notes: '',
    follow_up_date: '',
  });

  const fetchInterventions = async () => {
    try {
      setLoading(true);
      const list = await interventionsApi.getAll(statusFilter || undefined);
      setInterventions(list);
    } catch (err) {
      console.error('Error fetching interventions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterventions();
  }, [statusFilter]);

  // Load students for selector
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const res = await studentsApi.getAll({ page_size: 100 });
        setStudents(res.items);
        if (res.items.length > 0) {
          setNewInv((prev) => ({ ...prev, student_id: res.items[0].id }));
        }
      } catch (err) {
        console.error('Error loading students', err);
      }
    };
    loadStudents();
  }, []);

  const handleStatusUpdate = async (id: number, nextStatus: InterventionStatus) => {
    try {
      await interventionsApi.update(id, { status: nextStatus });
      fetchInterventions();
    } catch (err) {
      alert('Failed to update intervention status.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInv.student_id || !newInv.issue_identified) return;

    try {
      await interventionsApi.create(newInv);
      setIsNewOpen(false);
      setNewInv({
        student_id: students[0]?.id || 0,
        issue_identified: '',
        recommended_actions: '',
        faculty_notes: '',
        follow_up_date: '',
      });
      fetchInterventions();
    } catch (err) {
      alert('Failed to log intervention.');
    }
  };

  const plannedCount = interventions.filter((i) => i.status === 'planned').length;
  const inProgressCount = interventions.filter((i) => i.status === 'in_progress').length;
  const completedCount = interventions.filter((i) => i.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Academic Interventions Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Coordinate mentorship, remedial classes, parent conferences, and track remediation outcomes.
          </p>
        </div>

        <button
          onClick={() => setIsNewOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Log New Intervention</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            statusFilter === ''
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Actions ({interventions.length})
        </button>
        <button
          onClick={() => setStatusFilter('planned')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            statusFilter === 'planned'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
          }`}
        >
          Planned ({plannedCount})
        </button>
        <button
          onClick={() => setStatusFilter('in_progress')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            statusFilter === 'in_progress'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
          }`}
        >
          In Progress ({inProgressCount})
        </button>
        <button
          onClick={() => setStatusFilter('completed')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            statusFilter === 'completed'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Interventions Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-12 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading intervention logs...</span>
          </div>
        ) : interventions.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
            No academic interventions found matching this status filter.
          </div>
        ) : (
          interventions.map((inv) => (
            <div
              key={inv.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between">
                  <InterventionBadge status={inv.status} />
                  {inv.follow_up_date && (
                    <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Follow-up: {inv.follow_up_date}
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <div className="text-sm font-black text-slate-900">
                    {inv.student?.full_name || `Student #${inv.student_id}`}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    PRN: {inv.student?.prn || '—'}
                  </span>
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                      Vulnerability Identified:
                    </span>
                    <p className="text-slate-800 font-medium mt-0.5">{inv.issue_identified}</p>
                  </div>

                  {inv.recommended_actions && (
                    <div>
                      <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                        Prescribed Action:
                      </span>
                      <p className="text-slate-700 mt-0.5">{inv.recommended_actions}</p>
                    </div>
                  )}

                  {inv.faculty_notes && (
                    <div className="p-3 rounded-xl bg-slate-50 text-[11px] text-slate-600 italic border border-slate-100">
                      "{inv.faculty_notes}"
                    </div>
                  )}
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  Recorded: {new Date(inv.created_at).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-1.5">
                  {inv.status === 'planned' && (
                    <button
                      onClick={() => handleStatusUpdate(inv.id, 'in_progress')}
                      className="px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                    >
                      Start Progress
                    </button>
                  )}
                  {inv.status === 'in_progress' && (
                    <button
                      onClick={() => handleStatusUpdate(inv.id, 'completed')}
                      className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                    >
                      Mark Completed
                    </button>
                  )}
                  {inv.status === 'completed' && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resolved
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Log Intervention Modal */}
      <Modal
        isOpen={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        title="Schedule Academic Intervention"
        subtitle="Initiate remedial support or counseling for an identified student."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Student *
            </label>
            <select
              value={newInv.student_id}
              onChange={(e) => setNewInv({ ...newInv, student_id: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.full_name} ({st.prn}) — Sem {st.semester}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Academic Issue Identified *
            </label>
            <textarea
              required
              rows={2}
              placeholder="e.g. Scored 32% in Midterm Exam and missed 4 laboratory sessions."
              value={newInv.issue_identified}
              onChange={(e) => setNewInv({ ...newInv, issue_identified: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Recommended Action Plan
            </label>
            <input
              type="text"
              placeholder="e.g. 3 sessions of peer tutoring and remedial test"
              value={newInv.recommended_actions}
              onChange={(e) => setNewInv({ ...newInv, recommended_actions: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Faculty / Counselor Notes
            </label>
            <textarea
              rows={2}
              placeholder="Confidential observations or discussion points..."
              value={newInv.faculty_notes}
              onChange={(e) => setNewInv({ ...newInv, faculty_notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Follow-Up Review Date
            </label>
            <input
              type="date"
              value={newInv.follow_up_date}
              onChange={(e) => setNewInv({ ...newInv, follow_up_date: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
            >
              Log Intervention
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
