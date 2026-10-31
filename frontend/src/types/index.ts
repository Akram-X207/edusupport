export type UserRole = 'admin' | 'faculty';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type RiskCategory = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';

export interface Student {
  id: number;
  prn: string;
  full_name: string;
  email?: string;
  semester: number;
  division?: string;
  rollno?: string;
  date_of_admission?: string;
  is_active: boolean;
  created_at: string;
  risk_category?: RiskCategory;
  risk_score?: number;
  attendance_pct?: number;
  avg_marks_pct?: number;
}

export interface Subject {
  id: number;
  code: string;
  name: string;
  semester: number;
  credits: number;
  description?: string;
  created_at: string;
}

export interface RiskAssessment {
  id: number;
  student_id: number;
  overall_score: number | null;
  category: RiskCategory;
  attendance_score: number | null;
  marks_score: number | null;
  assignment_score: number | null;
  attendance_pct: number | null;
  avg_marks_pct: number | null;
  assignment_completion_pct: number | null;
  risk_factors: string[];
  recommendations: string[];
  calculated_at: string;
  student?: Student;
}

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface AttendanceRecord {
  id: number;
  session_id: number;
  student_id: number;
  status: AttendanceStatus;
  remarks?: string;
  student?: Student;
}

export interface AttendanceSession {
  id: number;
  subject_id: number;
  session_date: string;
  topic?: string;
  created_at: string;
  subject?: Subject;
  record_count?: number;
  present_count?: number;
}

export interface StudentAttendanceSummary {
  student_id: number;
  student_name: string;
  total_sessions: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
  below_threshold: boolean;
}

export interface Assessment {
  id: number;
  subject_id: number;
  name: string;
  max_marks: number;
  assessment_date?: string;
  assessment_type: string;
  created_at: string;
  subject?: Subject;
}

export interface AssessmentResult {
  id: number;
  assessment_id: number;
  student_id: number;
  marks_obtained: number;
  percentage?: number;
  remarks?: string;
  entered_at: string;
  student?: Student;
  assessment?: Assessment;
}

export interface Assignment {
  id: number;
  subject_id: number;
  title: string;
  description?: string;
  due_date?: string;
  max_marks?: number;
  created_at: string;
  subject?: Subject;
}

export type SubmissionStatus = 'submitted' | 'late' | 'missing';

export interface AssignmentSubmission {
  id: number;
  assignment_id: number;
  student_id: number;
  status: SubmissionStatus;
  marks_obtained?: number;
  submitted_at?: string;
  remarks?: string;
  student?: Student;
  assignment?: Assignment;
}

export type InterventionStatus = 'planned' | 'in_progress' | 'completed';

export interface Intervention {
  id: number;
  student_id: number;
  faculty_id?: number;
  issue_identified: string;
  recommended_actions?: string;
  faculty_notes?: string;
  status: InterventionStatus;
  follow_up_date?: string;
  created_at: string;
  updated_at: string;
  student?: Student;
  faculty?: User;
}

export interface DashboardStats {
  total_students: number;
  active_students: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  insufficient_data_count: number;
  avg_attendance_pct: number;
  avg_marks_pct: number;
  students_with_missing_assignments: number;
  pending_interventions: number;
}

export interface RiskDistributionItem {
  category: string;
  count: number;
  percentage: number;
}

export interface SubjectPerformance {
  subject_name: string;
  subject_code: string;
  avg_marks_pct: number;
  student_count: number;
}

export interface AttentionStudent {
  student_id: number;
  student_name: string;
  prn: string;
  risk_score: number | null;
  risk_category: string;
  attendance_pct: number | null;
  avg_marks_pct: number | null;
}
