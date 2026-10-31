import axios from 'axios';
import type {
  User,
  AuthResponse,
  Student,
  Subject,
  RiskAssessment,
  AttendanceSession,
  AttendanceRecord,
  StudentAttendanceSummary,
  Assessment,
  AssessmentResult,
  Assignment,
  AssignmentSubmission,
  Intervention,
  DashboardStats,
  RiskDistributionItem,
  SubjectPerformance,
  AttentionStudent,
} from '../types';

const apiBase = import.meta.env.VITE_API_URL
  ? `${(import.meta.env.VITE_API_URL as string).replace(/\/$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL: apiBase,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('edusupport_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401s to redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('edusupport_token');
      localStorage.removeItem('edusupport_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// API Methods
// ---------------------------------------------------------------------------

export const authApi = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/login', { username, password });
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },
};

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await api.get<DashboardStats>('/dashboard/stats');
    return res.data;
  },
  getRiskDistribution: async (): Promise<RiskDistributionItem[]> => {
    const res = await api.get<RiskDistributionItem[]>('/dashboard/risk-distribution');
    return res.data;
  },
  getSubjectPerformance: async (): Promise<SubjectPerformance[]> => {
    const res = await api.get<SubjectPerformance[]>('/dashboard/subject-performance');
    return res.data;
  },
  getAttentionStudents: async (limit: number = 5): Promise<AttentionStudent[]> => {
    const res = await api.get<AttentionStudent[]>(`/dashboard/attention-students?limit=${limit}`);
    return res.data;
  },
};

export const studentsApi = {
  getAll: async (params?: {
    search?: string;
    semester?: number;
    risk_category?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ items: Student[]; total: number; page: number; pages: number }> => {
    const res = await api.get('/students', { params });
    return res.data;
  },
  getById: async (id: number): Promise<Student> => {
    const res = await api.get<Student>(`/students/${id}`);
    return res.data;
  },
  create: async (data: Partial<Student>): Promise<Student> => {
    const res = await api.post<Student>('/students', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Student>): Promise<Student> => {
    const res = await api.put<Student>(`/students/${id}`, data);
    return res.data;
  },
  delete: async (id: number): Promise<{ message: string }> => {
    const res = await api.delete(`/students/${id}`);
    return res.data;
  },
  importCsv: async (file: File): Promise<{ message: string; created: number; skipped: number; errors: string[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/students/import/csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

export const subjectsApi = {
  getAll: async (semester?: number): Promise<Subject[]> => {
    const res = await api.get<Subject[]>('/subjects', { params: { semester } });
    return res.data;
  },
  create: async (data: Partial<Subject>): Promise<Subject> => {
    const res = await api.post<Subject>('/subjects', data);
    return res.data;
  },
};

export const riskApi = {
  getAll: async (category?: string): Promise<RiskAssessment[]> => {
    const res = await api.get<RiskAssessment[]>('/risk', { params: { category } });
    return res.data;
  },
  getByStudentId: async (studentId: number): Promise<RiskAssessment> => {
    const res = await api.get<RiskAssessment>(`/risk/student/${studentId}`);
    return res.data;
  },
  calculateForStudent: async (studentId: number): Promise<RiskAssessment> => {
    const res = await api.post<RiskAssessment>(`/risk/calculate/${studentId}`);
    return res.data;
  },
  calculateAll: async (): Promise<{ message: string; processed: number; high_risk: number }> => {
    const res = await api.post('/risk/calculate-all');
    return res.data;
  },
};

export const attendanceApi = {
  getSessions: async (subjectId?: number): Promise<AttendanceSession[]> => {
    const res = await api.get<AttendanceSession[]>('/attendance/sessions', {
      params: { subject_id: subjectId },
    });
    return res.data;
  },
  createSession: async (data: { subject_id: number; session_date: string; topic?: string }): Promise<AttendanceSession> => {
    const res = await api.post<AttendanceSession>('/attendance/sessions', data);
    return res.data;
  },
  markSession: async (sessionId: number, records: { student_id: number; status: string; remarks?: string }[]) => {
    const res = await api.post(`/attendance/sessions/${sessionId}/records`, {
      session_id: sessionId,
      records,
    });
    return res.data;
  },
  getSessionRecords: async (sessionId: number): Promise<AttendanceRecord[]> => {
    const res = await api.get<AttendanceRecord[]>(`/attendance/sessions/${sessionId}/records`);
    return res.data;
  },
  getStudentHistory: async (studentId: number): Promise<AttendanceRecord[]> => {
    const res = await api.get<AttendanceRecord[]>(`/attendance/student/${studentId}`);
    return res.data;
  },
  getSubjectSummary: async (subjectId: number): Promise<StudentAttendanceSummary[]> => {
    const res = await api.get<StudentAttendanceSummary[]>(`/attendance/subject/${subjectId}/summary`);
    return res.data;
  },
};

export const assessmentsApi = {
  getAll: async (subjectId?: number): Promise<Assessment[]> => {
    const res = await api.get<Assessment[]>('/assessments', { params: { subject_id: subjectId } });
    return res.data;
  },
  create: async (data: {
    subject_id: number;
    name: string;
    max_marks: number;
    assessment_date?: string;
    assessment_type?: string;
  }): Promise<Assessment> => {
    const res = await api.post<Assessment>('/assessments', data);
    return res.data;
  },
  getResults: async (assessmentId: number): Promise<AssessmentResult[]> => {
    const res = await api.get<AssessmentResult[]>(`/assessments/${assessmentId}/results`);
    return res.data;
  },
  recordMarks: async (assessmentId: number, results: { student_id: number; marks_obtained: number; remarks?: string }[]) => {
    const res = await api.post(`/assessments/${assessmentId}/results`, {
      assessment_id: assessmentId,
      results,
    });
    return res.data;
  },
  getStudentMarks: async (studentId: number): Promise<AssessmentResult[]> => {
    const res = await api.get<AssessmentResult[]>(`/assessments/student/${studentId}`);
    return res.data;
  },
};

export const assignmentsApi = {
  getAll: async (subjectId?: number): Promise<Assignment[]> => {
    const res = await api.get<Assignment[]>('/assignments', { params: { subject_id: subjectId } });
    return res.data;
  },
  create: async (data: {
    subject_id: number;
    title: string;
    description?: string;
    due_date?: string;
    max_marks?: number;
  }): Promise<Assignment> => {
    const res = await api.post<Assignment>('/assignments', data);
    return res.data;
  },
  getSubmissions: async (assignmentId: number): Promise<AssignmentSubmission[]> => {
    const res = await api.get<AssignmentSubmission[]>(`/assignments/${assignmentId}/submissions`);
    return res.data;
  },
  recordSubmission: async (data: {
    assignment_id: number;
    student_id: number;
    status: string;
    marks_obtained?: number;
    remarks?: string;
  }): Promise<AssignmentSubmission> => {
    const res = await api.post<AssignmentSubmission>('/assignments/submissions', data);
    return res.data;
  },
  getStudentSubmissions: async (studentId: number): Promise<AssignmentSubmission[]> => {
    const res = await api.get<AssignmentSubmission[]>(`/assignments/student/${studentId}`);
    return res.data;
  },
};

export const interventionsApi = {
  getAll: async (status?: string, studentId?: number): Promise<Intervention[]> => {
    const res = await api.get<Intervention[]>('/interventions', {
      params: { status, student_id: studentId },
    });
    return res.data;
  },
  create: async (data: {
    student_id: number;
    issue_identified: string;
    recommended_actions?: string;
    faculty_notes?: string;
    follow_up_date?: string;
  }): Promise<Intervention> => {
    const res = await api.post<Intervention>('/interventions', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Intervention>): Promise<Intervention> => {
    const res = await api.put<Intervention>(`/interventions/${id}`, data);
    return res.data;
  },
};

export const reportsApi = {
  downloadRiskCsv: () => {
    window.open('/api/reports/risk/csv', '_blank');
  },
  downloadAttendanceCsv: () => {
    window.open('/api/reports/attendance/csv', '_blank');
  },
  downloadMarksCsv: () => {
    window.open('/api/reports/marks/csv', '_blank');
  },
  downloadAssignmentsCsv: () => {
    window.open('/api/reports/assignments/csv', '_blank');
  },
};

export default api;
