import React, { useEffect, useState } from 'react';
import {
  Award,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { assessmentsApi, subjectsApi, studentsApi } from '../services/api';
import type { Subject, Assessment, AssessmentResult, Student } from '../types';
import { Modal } from '../components/common/Modal';

export const Assessments: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [marksMap, setMarksMap] = useState<Record<number, { marks: number; remarks: string }>>({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // New assessment modal
  const [isNewAssessmentOpen, setIsNewAssessmentOpen] = useState(false);
  const [newAssessmentData, setNewAssessmentData] = useState({
    name: '',
    max_marks: 50,
    assessment_type: 'exam',
    assessment_date: new Date().toISOString().split('T')[0],
  });

  // Load subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const list = await subjectsApi.getAll();
        setSubjects(list);
        if (list.length > 0) setSelectedSubjectId(list[0].id);
      } catch (err) {
        console.error('Error fetching subjects', err);
      }
    };
    fetchSubjects();
  }, []);

  // When subject changes, fetch assessments
  useEffect(() => {
    if (!selectedSubjectId) return;

    const fetchAssessments = async () => {
      try {
        setLoading(true);
        const list = await assessmentsApi.getAll(selectedSubjectId);
        setAssessments(list);
        if (list.length > 0) {
          setSelectedAssessmentId(list[0].id);
        } else {
          setSelectedAssessmentId(null);
        }
      } catch (err) {
        console.error('Error fetching assessments', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessments();
  }, [selectedSubjectId]);

  // Load students & results for selected assessment
  useEffect(() => {
    if (!selectedAssessmentId) return;

    const loadAssessmentMarks = async () => {
      try {
        const [stRes, existingResults] = await Promise.all([
          studentsApi.getAll({ page_size: 100 }),
          assessmentsApi.getResults(selectedAssessmentId).catch(() => []),
        ]);

        setStudents(stRes.items);

        const map: Record<number, { marks: number; remarks: string }> = {};
        stRes.items.forEach((st) => {
          const res = existingResults.find((r) => r.student_id === st.id);
          map[st.id] = {
            marks: res ? res.marks_obtained : 0,
            remarks: res?.remarks || '',
          };
        });
        setMarksMap(map);
      } catch (err) {
        console.error('Error loading marks', err);
      }
    };

    loadAssessmentMarks();
  }, [selectedAssessmentId]);

  const selectedAssessment = assessments.find((a) => a.id === selectedAssessmentId);
  const maxMarks = selectedAssessment ? selectedAssessment.max_marks : 50;

  const handleMarkChange = (studentId: number, val: string) => {
    const num = Math.max(0, Math.min(maxMarks, Number(val) || 0));
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marks: num,
      },
    }));
  };

  const handleSaveMarks = async () => {
    if (!selectedAssessmentId) return;
    try {
      setSaving(true);
      setSaveSuccess(null);

      const payload = Object.entries(marksMap).map(([studentIdStr, val]) => ({
        student_id: Number(studentIdStr),
        marks_obtained: val.marks,
        remarks: val.remarks,
      }));

      await assessmentsApi.recordMarks(selectedAssessmentId, payload);
      setSaveSuccess('Marks recorded successfully!');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      alert('Failed to save assessment marks.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) return;

    try {
      const created = await assessmentsApi.create({
        subject_id: selectedSubjectId,
        ...newAssessmentData,
      });

      setAssessments([...assessments, created]);
      setSelectedAssessmentId(created.id);
      setIsNewAssessmentOpen(false);
      setNewAssessmentData({
        name: '',
        max_marks: 50,
        assessment_type: 'exam',
        assessment_date: new Date().toISOString().split('T')[0],
      });
    } catch (err) {
      alert('Failed to create assessment.');
    }
  };

  // Compute live statistics
  const marksValues = Object.values(marksMap).map((m) => m.marks);
  const avgMarks =
    marksValues.length > 0
      ? (marksValues.reduce((a, b) => a + b, 0) / marksValues.length).toFixed(1)
      : '0';
  const highestMark = marksValues.length > 0 ? Math.max(...marksValues) : 0;
  const lowestMark = marksValues.length > 0 ? Math.min(...marksValues) : 0;
  const passCount = marksValues.filter((m) => maxMarks > 0 && (m / maxMarks) * 100 >= 50).length;
  const passRate =
    marksValues.length > 0 ? Math.round((passCount / marksValues.length) * 100) : 0;

  const getGrade = (percentage: number) => {
    if (percentage >= 85) return { grade: 'O', color: 'text-emerald-700 bg-emerald-50' };
    if (percentage >= 75) return { grade: 'A+', color: 'text-emerald-600 bg-emerald-50' };
    if (percentage >= 65) return { grade: 'A', color: 'text-blue-600 bg-blue-50' };
    if (percentage >= 55) return { grade: 'B+', color: 'text-amber-700 bg-amber-50' };
    if (percentage >= 50) return { grade: 'B', color: 'text-amber-600 bg-amber-50' };
    return { grade: 'F', color: 'text-rose-700 bg-rose-50 font-bold' };
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Assessments & Marks Entry
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Record exam and test scores, evaluate statistical averages, and identify students failing benchmarks.
          </p>
        </div>

        <button
          onClick={() => setIsNewAssessmentOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Assessment</span>
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
          <Award className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-semibold text-slate-700">Assessment:</span>
          {assessments.length === 0 ? (
            <span className="text-xs text-slate-400 italic">No assessments created</span>
          ) : (
            <select
              value={selectedAssessmentId || ''}
              onChange={(e) => setSelectedAssessmentId(Number(e.target.value))}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (Max: {a.max_marks} marks)
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Stats Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Class Average
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {avgMarks} <span className="text-xs font-normal text-slate-400">/ {maxMarks}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Highest Score
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{highestMark}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Lowest Score
          </span>
          <div className="text-2xl font-black text-rose-600 mt-1">{lowestMark}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Pass Rate (&ge; 50%)
          </span>
          <div className="text-2xl font-black text-blue-600 mt-1">{passRate}%</div>
        </div>
      </div>

      {/* Marks Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Student Marks Roster
            </h2>
            <p className="text-[11px] text-slate-500">
              Maximum allowable marks for this test: <strong>{maxMarks}</strong>
            </p>
          </div>
        </div>

        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] sticky top-0 z-10 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 font-semibold">Student Name & PRN</th>
                <th className="py-3 px-4 font-semibold w-40">Marks Obtained</th>
                <th className="py-3 px-4 font-semibold text-center">Percentage</th>
                <th className="py-3 px-4 font-semibold text-center">Grade</th>
                <th className="py-3 px-4 font-semibold">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No students found.
                  </td>
                </tr>
              ) : (
                students.map((st) => {
                  const m = marksMap[st.id]?.marks || 0;
                  const pct = maxMarks > 0 ? (m / maxMarks) * 100 : 0;
                  const gradeObj = getGrade(pct);

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{st.full_name}</div>
                        <span className="text-[11px] font-mono text-slate-400">{st.prn}</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={maxMarks}
                            step="0.5"
                            value={marksMap[st.id]?.marks ?? 0}
                            onChange={(e) => handleMarkChange(st.id, e.target.value)}
                            className="w-24 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 text-right focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-slate-400 text-xs">/ {maxMarks}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-semibold ${
                            pct < 50 ? 'text-rose-600' : 'text-slate-700'
                          }`}
                        >
                          {pct.toFixed(1)}%
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${gradeObj.color}`}
                        >
                          {gradeObj.grade}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="Feedback..."
                          value={marksMap[st.id]?.remarks || ''}
                          onChange={(e) =>
                            setMarksMap((prev) => ({
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
              Check all entries before committing to the student academic record.
            </span>
          )}

          <button
            onClick={handleSaveMarks}
            disabled={saving || !selectedAssessmentId}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Marks'}</span>
          </button>
        </div>
      </div>

      {/* New Assessment Modal */}
      <Modal
        isOpen={isNewAssessmentOpen}
        onClose={() => setIsNewAssessmentOpen(false)}
        title="Schedule New Assessment"
        subtitle="Add a test, quiz, or final examination for the course."
      >
        <form onSubmit={handleCreateAssessment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assessment Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Unit Test 2: Graph Theory"
              value={newAssessmentData.name}
              onChange={(e) =>
                setNewAssessmentData({ ...newAssessmentData, name: e.target.value })
              }
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Maximum Marks (&gt; 0) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={newAssessmentData.max_marks}
                onChange={(e) =>
                  setNewAssessmentData({
                    ...newAssessmentData,
                    max_marks: Number(e.target.value),
                  })
                }
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assessment Type
              </label>
              <select
                value={newAssessmentData.assessment_type}
                onChange={(e) =>
                  setNewAssessmentData({
                    ...newAssessmentData,
                    assessment_type: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                <option value="exam">Written Examination</option>
                <option value="quiz">Objective Quiz</option>
                <option value="lab">Lab Practical</option>
                <option value="project">Course Project</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assessment Date
            </label>
            <input
              type="date"
              value={newAssessmentData.assessment_date}
              onChange={(e) =>
                setNewAssessmentData({
                  ...newAssessmentData,
                  assessment_date: e.target.value,
                })
              }
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewAssessmentOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
            >
              Create Assessment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
