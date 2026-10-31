import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  Upload,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { studentsApi } from '../services/api';
import type { Student, RiskCategory } from '../types';
import { RiskBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [semester, setSemester] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form states
  const [newStudent, setNewStudent] = useState({
    prn: '',
    full_name: '',
    email: '',
    semester: 5,
    division: 'A',
    rollno: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // CSV Import state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<{
    created?: number;
    skipped?: number;
    errors?: string[];
    message?: string;
  } | null>(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await studentsApi.getAll({
        search: search || undefined,
        semester: semester ? Number(semester) : undefined,
        risk_category: riskFilter || undefined,
        page_size: 100,
      });
      setStudents(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Error fetching students', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, semester, riskFilter]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!newStudent.prn || !newStudent.full_name) {
      setFormError('PRN and Student Full Name are required.');
      return;
    }

    try {
      await studentsApi.create(newStudent);
      setFormSuccess('Student enrolled successfully!');
      setTimeout(() => {
        setIsAddOpen(false);
        setFormSuccess(null);
        setNewStudent({
          prn: '',
          full_name: '',
          email: '',
          semester: 5,
          division: 'A',
          rollno: '',
        });
        fetchStudents();
      }, 1000);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setFormError(detail);
      } else if (Array.isArray(detail)) {
        setFormError(detail.map((d: any) => d.msg || JSON.stringify(d)).join(', '));
      } else {
        setFormError(err.message || 'Failed to add student. Ensure PRN is unique.');
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await studentsApi.delete(id);
      setDeleteConfirmId(null);
      fetchStudents();
    } catch (err) {
      alert('Failed to delete student.');
    }
  };

  const handleCsvUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;

    try {
      const res = await studentsApi.importCsv(csvFile);
      setImportStatus(res);
      fetchStudents();
    } catch (err: any) {
      setImportStatus({
        message: err.response?.data?.detail || 'Error importing CSV file.',
        errors: [],
      });
    }
  };

  const downloadSampleCsv = () => {
    const csvContent =
      'prn,full_name,email,semester,division,rollno\n22358010099,Sample Student,sample@jspmuni.ac.in,5,A,99';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_students_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Students Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage academic profiles, monitor individual risk levels, and perform batch imports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-xs transition-all"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name or PRN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Semester Filter */}
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Semesters</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
            <option value="3">Semester 3</option>
            <option value="4">Semester 4</option>
            <option value="5">Semester 5</option>
            <option value="6">Semester 6</option>
          </select>

          {/* Risk Level Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Risk Levels</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
            <option value="INSUFFICIENT_DATA">Insufficient Data</option>
          </select>

          <span className="text-xs text-slate-400 font-medium px-2 hidden sm:inline">
            Total: <strong className="text-slate-800">{total}</strong>
          </span>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Student Name</th>
                <th className="py-3.5 px-4 font-semibold">PRN</th>
                <th className="py-3.5 px-4 font-semibold">Sem / Div</th>
                <th className="py-3.5 px-4 font-semibold">Attendance</th>
                <th className="py-3.5 px-4 font-semibold">Avg Marks</th>
                <th className="py-3.5 px-4 font-semibold">Risk Classification</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading student records...</span>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No students found matching your criteria.
                  </td>
                </tr>
              ) : (
                students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/students/${st.id}`}
                        className="font-bold text-slate-900 hover:text-blue-600 transition-colors block"
                      >
                        {st.full_name}
                      </Link>
                      <span className="text-[11px] text-slate-400">{st.email || 'No email registered'}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">{st.prn}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      Sem {st.semester} ({st.division || 'A'})
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold ${
                          st.attendance_pct !== null && st.attendance_pct !== undefined && st.attendance_pct < 75
                            ? 'text-rose-600'
                            : 'text-slate-700'
                        }`}
                      >
                        {st.attendance_pct !== null && st.attendance_pct !== undefined
                          ? `${st.attendance_pct.toFixed(1)}%`
                          : '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold ${
                          st.avg_marks_pct !== null && st.avg_marks_pct !== undefined && st.avg_marks_pct < 50
                            ? 'text-rose-600'
                            : 'text-slate-700'
                        }`}
                      >
                        {st.avg_marks_pct !== null && st.avg_marks_pct !== undefined
                          ? `${st.avg_marks_pct.toFixed(1)}%`
                          : '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <RiskBadge
                        category={st.risk_category as RiskCategory}
                        score={st.risk_score}
                        size="sm"
                      />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/students/${st.id}`}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-[11px] transition-colors"
                        >
                          Profile
                        </Link>
                        <button
                          onClick={() => setDeleteConfirmId(st.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete student"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Enroll New Student"
        subtitle="Add student details into the university academic registry."
      >
        <form onSubmit={handleCreateStudent} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          {formSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Permanent Registration Number (PRN) *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 22358010045"
              value={newStudent.prn}
              onChange={(e) => setNewStudent({ ...newStudent, prn: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Student Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Sharma"
              value={newStudent.full_name}
              onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Institutional Email
            </label>
            <input
              type="email"
              placeholder="e.g. rahul.sharma@jspmuni.ac.in"
              value={newStudent.email}
              onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Semester</label>
              <select
                value={newStudent.semester}
                onChange={(e) => setNewStudent({ ...newStudent, semester: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Sem {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Division</label>
              <input
                type="text"
                value={newStudent.division}
                onChange={(e) => setNewStudent({ ...newStudent, division: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Roll No</label>
              <input
                type="text"
                placeholder="e.g. 45"
                value={newStudent.rollno}
                onChange={(e) => setNewStudent({ ...newStudent, rollno: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
            >
              Save Student
            </button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => {
          setIsImportOpen(false);
          setImportStatus(null);
          setCsvFile(null);
        }}
        title="Bulk Import Students from CSV"
        subtitle="Upload a standard CSV file to enroll multiple students at once."
      >
        <form onSubmit={handleCsvUpload} className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-blue-600" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Standard CSV Format</h4>
                <p className="text-[11px] text-slate-500">Headers: prn, full_name, email, semester, division, rollno</p>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadSampleCsv}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>

          {importStatus && (
            <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs space-y-1">
              <div className="font-bold text-slate-800">{importStatus.message}</div>
              {importStatus.created !== undefined && (
                <div className="text-emerald-700">Enrolled: {importStatus.created} students</div>
              )}
              {importStatus.skipped !== undefined && importStatus.skipped > 0 && (
                <div className="text-amber-700">Skipped (duplicates): {importStatus.skipped}</div>
              )}
              {importStatus.errors && importStatus.errors.length > 0 && (
                <div className="text-rose-600 text-[11px] max-h-24 overflow-y-auto">
                  {importStatus.errors.map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsImportOpen(false);
                setImportStatus(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={!csvFile}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs disabled:opacity-50"
            >
              Upload & Process
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirm Student Deletion"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to delete this student record? This action will permanently remove associated attendance, assessments, and risk evaluations.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
