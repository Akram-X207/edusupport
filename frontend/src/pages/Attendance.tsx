import React, { useEffect, useState } from 'react';
import {
  CalendarCheck,
  Plus,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Clock,
  XCircle,
  Save,
  BookOpen,
} from 'lucide-react';
import { attendanceApi, subjectsApi, studentsApi } from '../services/api';
import type {
  Subject,
  AttendanceSession,
  StudentAttendanceSummary,
  Student,
} from '../types';
import { Modal } from '../components/common/Modal';

export const Attendance: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);

  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<number, { status: string; remarks: string }>>({});

  const [summaries, setSummaries] = useState<StudentAttendanceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // New session modal state
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [newSessionData, setNewSessionData] = useState({
    session_date: new Date().toISOString().split('T')[0],
    topic: '',
  });

  // Load subjects initially
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const list = await subjectsApi.getAll();
        setSubjects(list);
        if (list.length > 0) {
          setSelectedSubjectId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load subjects', err);
      }
    };
    fetchSubjects();
  }, []);

  // When subject changes, load its sessions and attendance summaries
  useEffect(() => {
    if (!selectedSubjectId) return;

    const loadSubjectSessions = async () => {
      try {
        setLoading(true);
        const [sessList, summList] = await Promise.all([
          attendanceApi.getSessions(selectedSubjectId),
          attendanceApi.getSubjectSummary(selectedSubjectId).catch(() => []),
        ]);

        setSessions(sessList);
        setSummaries(summList);

        if (sessList.length > 0) {
          setSelectedSessionId(sessList[0].id);
        } else {
          setSelectedSessionId(null);
        }
      } catch (err) {
        console.error('Error fetching sessions', err);
      } finally {
        setLoading(false);
      }
    };

    loadSubjectSessions();
  }, [selectedSubjectId]);

  // Load enrolled students & existing records for the selected session
  useEffect(() => {
    if (!selectedSessionId) return;

    const loadSessionRoster = async () => {
      try {
        const [stRes, existingRecords] = await Promise.all([
          studentsApi.getAll({ page_size: 100 }),
          attendanceApi.getSessionRecords(selectedSessionId).catch(() => []),
        ]);

        setStudents(stRes.items);

        // Build status map
        const map: Record<number, { status: string; remarks: string }> = {};
        stRes.items.forEach((st) => {
          const rec = existingRecords.find((r) => r.student_id === st.id);
          map[st.id] = {
            status: rec ? rec.status : 'present',
            remarks: rec?.remarks || '',
          };
        });
        setAttendanceMap(map);
      } catch (err) {
        console.error('Error loading session records', err);
      }
    };

    loadSessionRoster();
  }, [selectedSessionId]);

  const handleStatusChange = (studentId: number, status: string) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleMarkAll = (status: 'present' | 'absent' | 'late') => {
    const updated = { ...attendanceMap };
    students.forEach((st) => {
      updated[st.id] = {
        ...updated[st.id],
        status,
      };
    });
    setAttendanceMap(updated);
  };

  const handleSaveAttendance = async () => {
    if (!selectedSessionId) return;
    try {
      setSaving(true);
      setSaveSuccess(null);

      const records = Object.entries(attendanceMap).map(([studentIdStr, val]) => ({
        student_id: Number(studentIdStr),
        status: val.status,
        remarks: val.remarks,
      }));

      await attendanceApi.markSession(selectedSessionId, records);
      setSaveSuccess('Attendance marked successfully!');

      if (selectedSubjectId) {
        const summ = await attendanceApi.getSubjectSummary(selectedSubjectId);
        setSummaries(summ);
      }

      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      alert('Failed to save attendance records.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) return;

    try {
      const created = await attendanceApi.createSession({
        subject_id: selectedSubjectId,
        ...newSessionData,
      });

      setSessions([created, ...sessions]);
      setSelectedSessionId(created.id);
      setIsNewSessionOpen(false);
      setNewSessionData({
        session_date: new Date().toISOString().split('T')[0],
        topic: '',
      });
    } catch (err) {
      alert('Failed to create session.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Attendance Management & Roster
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Conduct daily classroom roll calls, monitor 75% attendance threshold, and identify habitual absenteeism.
          </p>
        </div>

        <button
          onClick={() => setIsNewSessionOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Attendance Session</span>
        </button>
      </div>

      {/* Selectors Bar */}
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
          <CalendarCheck className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-semibold text-slate-700">Session Date:</span>
          {sessions.length === 0 ? (
            <span className="text-xs text-slate-400 italic">No sessions created yet</span>
          ) : (
            <select
              value={selectedSessionId || ''}
              onChange={(e) => setSelectedSessionId(Number(e.target.value))}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              {sessions.map((sess) => (
                <option key={sess.id} value={sess.id}>
                  {sess.session_date} {sess.topic ? `— ${sess.topic}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Roster Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Attendance Marking Table (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Session Roll Call Roster
              </h2>
              <span className="text-[11px] text-slate-500">
                {students.length} students enrolled in semester
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">Quick Mark:</span>
              <button
                type="button"
                onClick={() => handleMarkAll('present')}
                className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
              >
                All Present
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll('absent')}
                className="px-2.5 py-1 text-[11px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
              >
                All Absent
              </button>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] sticky top-0 z-10 border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 font-semibold">Student Name & PRN</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400">
                      No students available for this session.
                    </td>
                  </tr>
                ) : (
                  students.map((st) => {
                    const currentStatus = attendanceMap[st.id]?.status || 'present';
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
                              onClick={() => handleStatusChange(st.id, 'present')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                currentStatus === 'present'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              Present
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
                              onClick={() => handleStatusChange(st.id, 'absent')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                currentStatus === 'absent'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              Absent
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            placeholder="Optional remark..."
                            value={attendanceMap[st.id]?.remarks || ''}
                            onChange={(e) =>
                              setAttendanceMap((prev) => ({
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

          {/* Table Save Bar */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            {saveSuccess ? (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                {saveSuccess}
              </span>
            ) : (
              <span className="text-xs text-slate-400">
                Ensure records are accurate before saving.
              </span>
            )}

            <button
              onClick={handleSaveAttendance}
              disabled={saving || !selectedSessionId}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Attendance'}</span>
            </button>
          </div>
        </div>

        {/* Attendance Summary Panel (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Subject Attendance Summary
              </h2>
              <p className="text-[11px] text-slate-500">Cumulative percentage to date</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              Threshold 75%
            </span>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[460px] pr-1">
            {summaries.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                No session data recorded for this subject yet.
              </p>
            ) : (
              summaries.map((s) => (
                <div
                  key={s.student_id}
                  className={`p-3 rounded-xl border transition-all ${
                    s.below_threshold
                      ? 'bg-rose-50/60 border-rose-200'
                      : 'bg-slate-50 border-slate-200/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{s.student_name}</span>
                    <span
                      className={`text-xs font-black ${
                        s.below_threshold ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {s.attendance_percentage.toFixed(1)}%
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Attended: {s.present_count} / {s.total_sessions}
                    </span>
                    {s.below_threshold && (
                      <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-500" />
                        Defaulter
                      </span>
                    )}
                  </div>

                  {/* Visual mini-bar */}
                  <div className="mt-2 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        s.below_threshold ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(2, s.attendance_percentage))}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* New Session Modal */}
      <Modal
        isOpen={isNewSessionOpen}
        onClose={() => setIsNewSessionOpen(false)}
        title="Schedule New Attendance Session"
        subtitle="Create a new class date to record daily student presence."
      >
        <form onSubmit={handleCreateSession} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Class Date *
            </label>
            <input
              type="date"
              required
              value={newSessionData.session_date}
              onChange={(e) =>
                setNewSessionData({ ...newSessionData, session_date: e.target.value })
              }
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Topic / Syllabus Unit
            </label>
            <input
              type="text"
              placeholder="e.g. Unit 3: Dynamic Programming Algorithms"
              value={newSessionData.topic}
              onChange={(e) =>
                setNewSessionData({ ...newSessionData, topic: e.target.value })
              }
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewSessionOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
            >
              Create Session
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
