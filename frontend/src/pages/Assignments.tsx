import React, { useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  Save,
  CheckCircle2,
  BookOpen,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { assignmentsApi, subjectsApi, studentsApi } from '../services/api';
import type { Subject, Assignment, AssignmentSubmission, Student } from '../types';
import { SubmissionBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const Assignments: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [submissionMap, setSubmissionMap] = useState<
    Record<number, { status: string; marks: number; remarks: string }>
  >({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // New assignment modal
  const [isNewAssignmentOpen, setIsNewAssignmentOpen] = useState(false);
  const [newAssignmentData, setNewAssignmentData] = useState({
    title: '',
    description: '',
    due_date: new Date().toISOString().split('T')[0],
    max_marks: 20,
  });

  // Load subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const list = await subjectsApi.getAll();
        setSubjects(list);
        if (list.length > 0) setSelectedSubjectId(list[0].id);
      } catch (err) {
        console.error('Failed to load subjects', err);
      }
    };
    fetchSubjects();
  }, []);

  // When subject changes, fetch its assignments
  useEffect(() => {
    if (!selectedSubjectId) return;

    const fetchAssignments = async () => {
      try {
        setLoading(true);
        const list = await assignmentsApi.getAll(selectedSubjectId);
        setAssignments(list);
        if (list.length > 0) {
          setSelectedAssignmentId(list[0].id);
        } else {
          setSelectedAssignmentId(null);
        }
      } catch (err) {
        console.error('Error fetching assignments', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [selectedSubjectId]);

  // Load submissions for selected assignment
  useEffect(() => {
    if (!selectedAssignmentId) return;

    const loadSubmissions = async () => {
      try {
        const [stRes, existingSubs] = await Promise.all([
          studentsApi.getAll({ page_size: 100 }),
          assignmentsApi.getSubmissions(selectedAssignmentId).catch(() => []),
        ]);

        setStudents(stRes.items);

        const map: Record<number, { status: string; marks: number; remarks: string }> = {};
        stRes.items.forEach((st) => {
          const sub = existingSubs.find((s) => s.student_id === st.id);
          map[st.id] = {
            status: sub ? sub.status : 'submitted',
            marks: sub?.marks_obtained ?? 20,
            remarks: sub?.remarks || '',
          };
        });
        setSubmissionMap(map);
      } catch (err) {
        console.error('Error loading submissions', err);
      }
    };

    loadSubmissions();
  }, [selectedAssignmentId]);

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId);
  const maxMarks = selectedAssignment?.max_marks || 20;

  const handleStatusChange = (studentId: number, status: string) => {
    setSubmissionMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  };

  const handleMarksChange = (studentId: number, val: string) => {
    const num = Math.max(0, Math.min(maxMarks, Number(val) || 0));
    setSubmissionMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], marks: num },
    }));
  };

  const handleSaveSubmissions = async () => {
    if (!selectedAssignmentId) return;
    try {
      setSaving(true);
      setSaveSuccess(null);

      // Save each submission record
      for (const [studentIdStr, val] of Object.entries(submissionMap)) {
        await assignmentsApi.recordSubmission({
          assignment_id: selectedAssignmentId,
          student_id: Number(studentIdStr),
          status: val.status,
          marks_obtained: val.marks,
          remarks: val.remarks,
        });
      }

      setSaveSuccess('Submissions recorded successfully!');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      alert('Failed to save assignment submissions.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) return;

    try {
      const created = await assignmentsApi.create({
        subject_id: selectedSubjectId,
        ...newAssignmentData,
      });

      setAssignments([...assignments, created]);
      setSelectedAssignmentId(created.id);
      setIsNewAssignmentOpen(false);
      setNewAssignmentData({
        title: '',
        description: '',
        due_date: new Date().toISOString().split('T')[0],
        max_marks: 20,
      });
    } catch (err) {
      alert('Failed to create assignment.');
    }
  };

  // Compute submission statistics
  const totalStudents = students.length;
  const submittedCount = Object.values(submissionMap).filter((s) => s.status === 'submitted').length;
  const lateCount = Object.values(submissionMap).filter((s) => s.status === 'late').length;
  const missingCount = Object.values(submissionMap).filter((s) => s.status === 'missing').length;
  const submissionRate = totalStudents > 0 ? Math.round(((submittedCount + lateCount) / totalStudents) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Assignments & Coursework Submissions
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track student assignment submissions, monitor non-compliance, and record continuous internal evaluation.
          </p>
        </div>

        <button
          onClick={() => setIsNewAssignmentOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Assignment</span>
        </button>
      </div>

      {/* Selectors */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-semibold text-slate-700">Subject:</span>
          <select
            value={selectedSubjectId || ''}
            onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
          >
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.code} — {sub.name} (Sem {sub.semester})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-semibold text-slate-700">Assignment:</span>
          {assignments.length === 0 ? (
            <span className="text-xs text-slate-400 italic">No assignments created</span>
          ) : (
            <select
              value={selectedAssignmentId || ''}
              onChange={(e) => setSelectedAssignmentId(Number(e.target.value))}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} {a.due_date ? `(Due: ${a.due_date})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Overall Submission Rate
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">{submissionRate}%</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            On-Time Submissions
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{submittedCount}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Late Submissions
          </span>
          <div className="text-2xl font-black text-amber-600 mt-1">{lateCount}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Missing / Defaulters
          </span>
          <div className="text-2xl font-black text-rose-600 mt-1">{missingCount}</div>
        </div>
      </div>

      {/* Submissions Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Student Submissions Roster
            </h2>
            <p className="text-[11px] text-slate-500">
              Max marks: <strong>{maxMarks}</strong>
            </p>
          </div>
        </div>

        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] sticky top-0 z-10 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 font-semibold">Student Name & PRN</th>
                <th className="py-3 px-4 font-semibold text-center">Submission Status</th>
                <th className="py-3 px-4 font-semibold w-36">Marks</th>
                <th className="py-3 px-4 font-semibold">Evaluation Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No students found.
                  </td>
                </tr>
              ) : (
                students.map((st) => {
                  const currentStatus = submissionMap[st.id]?.status || 'submitted';
                  return (
                    <tr key={st.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{st.full_name}</div>
                        <span className="text-[11px] font-mono text-slate-400">{st.prn}</span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, 'submitted')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                              currentStatus === 'submitted'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Submitted
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, 'late')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                              currentStatus === 'late'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Late
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, 'missing')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                              currentStatus === 'missing'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Missing
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={maxMarks}
                            value={submissionMap[st.id]?.marks ?? 0}
                            disabled={currentStatus === 'missing'}
                            onChange={(e) => handleMarksChange(st.id, e.target.value)}
                            className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 text-right focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
                          />
                          <span className="text-slate-400 text-xs">/ {maxMarks}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="Feedback..."
                          value={submissionMap[st.id]?.remarks || ''}
                          onChange={(e) =>
                            setSubmissionMap((prev) => ({
                              ...prev,
                              [st.id]: { ...prev[st.id], remarks: e.target.value },
                            }))
                          }
                          className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Save Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          {saveSuccess ? (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              {saveSuccess}
            </span>
          ) : (
            <span className="text-xs text-slate-400">
              Missing assignments contribute directly to student risk score penalty.
            </span>
          )}

          <button
            onClick={handleSaveSubmissions}
            disabled={saving || !selectedAssignmentId}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Submissions'}</span>
          </button>
        </div>
      </div>

      {/* New Assignment Modal */}
      <Modal
        isOpen={isNewAssignmentOpen}
        onClose={() => setIsNewAssignmentOpen(false)}
        title="Create Coursework Assignment"
        subtitle="Set up homework or practical lab assignment requirements."
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assignment Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Assignment 3: Binary Search Tree Implementation"
              value={newAssignmentData.title}
              onChange={(e) =>
                setNewAssignmentData({ ...newAssignmentData, title: e.target.value })
              }
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Instructions
            </label>
            <textarea
              rows={2}
              placeholder="Optional guidelines or problem statement..."
              value={newAssignmentData.description}
              onChange={(e) =>
                setNewAssignmentData({ ...newAssignmentData, description: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={newAssignmentData.due_date}
                onChange={(e) =>
                  setNewAssignmentData({ ...newAssignmentData, due_date: e.target.value })
                }
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Marks
              </label>
              <input
                type="number"
                min="1"
                value={newAssignmentData.max_marks}
                onChange={(e) =>
                  setNewAssignmentData({
                    ...newAssignmentData,
                    max_marks: Number(e.target.value),
                  })
                }
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewAssignmentOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
            >
              Create Assignment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
