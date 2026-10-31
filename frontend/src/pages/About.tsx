import React from 'react';
import {
  GraduationCap,
  Users,
  Code2,
  Cpu,
  Layers,
  Database,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export const About: React.FC = () => {
  const teamMembers = [
    { name: 'ABHALE HARSHAD JANARDAN', prn: '22358010001', role: 'Full Stack & Risk Engine Lead' },
    { name: 'ACHWALE MANTHAN RAJKUMAR', prn: '22358010002', role: 'Database Architecture & API Services' },
    { name: 'ADALAKKATHU ADIL ABDUL RASHEED', prn: '22358010003', role: 'Analytics & Visualization' },
    { name: 'AGASTHE DEVANSH RAJESH', prn: '22358010004', role: 'Attendance & Assessment Modules' },
    { name: 'AGRAWAL AADITYA CHANDRAKANT', prn: '22358010005', role: 'QA & Testing Suite' },
  ];

  const techStack = [
    { category: 'Backend Engine', tech: 'FastAPI, Python 3.10+, Uvicorn, Pydantic v2' },
    { category: 'Persistence', tech: 'SQLAlchemy 2.0 ORM, SQLite DB, Foreign Key Enforcements' },
    { category: 'Algorithm', tech: 'Weighted Academic Risk Multi-factor Predictive Model' },
    { category: 'Frontend Client', tech: 'React 19, TypeScript, Vite, Tailwind CSS v4' },
    { category: 'Visualizations', tech: 'Recharts Donut, Bar & Comparative Distribution Graphs' },
    { category: 'Testing & QA', tech: 'Pytest Suite with 46 Automated Unit & Integration Tests' },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Hero Banner */}
      <div className="bg-gradient-to-tr from-slate-950 via-slate-900 to-blue-950 text-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold">
                <GraduationCap className="w-4 h-4" />
                <span>JSPM University Pune</span>
              </div>
              <span className="text-[11px] text-amber-300/90 font-medium italic">
                Inspiring Innovation. Transforming Talent.
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              EduSupport: Early Identification of Students at Academic Risk
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              A full-stack, university-grade academic analytics platform engineered for proactive student mentoring, early risk intervention, and rigorous performance evaluation.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="font-semibold text-white">Faculty of Science and Technology</span>
              <span className="text-slate-500">•</span>
              <span className="text-blue-300">School of Computational Science</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">B.Tech (CSE)</span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 font-bold">Group: G1</span>
            </div>
          </div>
          <div className="hidden lg:block shrink-0 p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md">
            <img src="/jspm_header.png" alt="JSPM University Logo" className="h-20 object-contain rounded-xl" />
          </div>
        </div>
      </div>

      {/* Project Team Group G1 */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2.5 mb-6 text-slate-900">
          <Users className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-black tracking-tight uppercase">
            Project Group G1 — Team Members
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamMembers.map((member, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  {member.prn}
                </span>
              </div>

              <div className="mt-3">
                <h3 className="text-xs font-black text-slate-900 leading-snug">
                  {member.name}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Architecture & Tech Stack */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2.5 mb-6 text-slate-900">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-black tracking-tight uppercase">
            Technical Architecture & Engineering Standards
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {techStack.map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {item.category}
              </span>
              <span className="text-xs font-bold text-slate-800 mt-1 block">
                {item.tech}
              </span>
            </div>
          ))}
        </div>

        {/* Verification Checklist */}
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>46 Pytest test cases passing (unit + integration)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>SQLite database with 35 enrolled students seeded</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Stateless JWT authentication with bcrypt password hashing</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>CSV bulk import/export capabilities implemented</span>
          </div>
        </div>
      </div>
    </div>
  );
};
