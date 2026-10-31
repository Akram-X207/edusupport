import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout, ProtectedRoute } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { StudentDetail } from './pages/StudentDetail';
import { Attendance } from './pages/Attendance';
import { Assessments } from './pages/Assessments';
import { Assignments } from './pages/Assignments';
import { RiskAnalysis } from './pages/RiskAnalysis';
import { Interventions } from './pages/Interventions';
import { Reports } from './pages/Reports';
import { About } from './pages/About';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public login route */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes wrapped in Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="students/:id" element={<StudentDetail />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="assessments" element={<Assessments />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="risk" element={<RiskAnalysis />} />
            <Route path="interventions" element={<Interventions />} />
            <Route path="reports" element={<Reports />} />
            <Route path="about" element={<About />} />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
