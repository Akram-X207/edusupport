"""
EduSupport Demo Data Seeder
============================
Seeds the database with:
- 2 user accounts (admin + faculty)
- 6 subjects across semesters 3 and 4
- 35 fictional students (NOT the project group members)
- Attendance sessions and records
- Assessments and results
- Assignments and submissions
- Risk assessments for all students

All data is clearly fictional and intended for demonstration purposes only.
The four G1 project contributors are NOT included in this dataset.
"""
import json
import random
from datetime import date, timedelta, datetime
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine
from app.models.models import Base
from app.models import (
    User, Subject, Student, Enrollment,
    AttendanceSession, AttendanceRecord,
    Assessment, AssessmentResult,
    Assignment, AssignmentSubmission,
    RiskAssessment,
    UserRole, AttendanceStatus, SubmissionStatus, RiskCategory,
)
from app.utils.auth import hash_password
from app.services.risk_engine import run_risk_engine

# Reproducible randomness for the demo dataset
random.seed(42)


# ---------------------------------------------------------------------------
# Demo student data — 35 fictional students
# ---------------------------------------------------------------------------
DEMO_STUDENTS = [
    # (prn, full_name, email, semester, division, rollno)
    ("DS001", "Aarav Sharma", "aarav.sharma@demo.edu", 3, "A", "01"),
    ("DS002", "Aditi Verma", "aditi.verma@demo.edu", 3, "A", "02"),
    ("DS003", "Amit Patel", "amit.patel@demo.edu", 3, "A", "03"),
    ("DS004", "Ananya Singh", "ananya.singh@demo.edu", 3, "A", "04"),
    ("DS005", "Arjun Mehta", "arjun.mehta@demo.edu", 3, "A", "05"),
    ("DS006", "Bhavna Rao", "bhavna.rao@demo.edu", 3, "A", "06"),
    ("DS007", "Chirag Desai", "chirag.desai@demo.edu", 3, "B", "07"),
    ("DS008", "Deepika Joshi", "deepika.joshi@demo.edu", 3, "B", "08"),
    ("DS009", "Ganesh Kulkarni", "ganesh.k@demo.edu", 3, "B", "09"),
    ("DS010", "Harini Nair", "harini.nair@demo.edu", 3, "B", "10"),
    ("DS011", "Ishaan Gupta", "ishaan.gupta@demo.edu", 3, "B", "11"),
    ("DS012", "Jahanvi Shah", "jahanvi.shah@demo.edu", 3, "B", "12"),
    ("DS013", "Karan Bose", "karan.bose@demo.edu", 3, "C", "13"),
    ("DS014", "Kavya Reddy", "kavya.reddy@demo.edu", 3, "C", "14"),
    ("DS015", "Lakshmi Iyer", "lakshmi.iyer@demo.edu", 3, "C", "15"),
    ("DS016", "Manish Tiwari", "manish.tiwari@demo.edu", 3, "C", "16"),
    ("DS017", "Meera Pillai", "meera.pillai@demo.edu", 3, "C", "17"),
    ("DS018", "Nikhil Jain", "nikhil.jain@demo.edu", 3, "C", "18"),
    ("DS019", "Nisha Agarwal", "nisha.agarwal@demo.edu", 4, "A", "19"),
    ("DS020", "Om Pandey", "om.pandey@demo.edu", 4, "A", "20"),
    ("DS021", "Pooja Mishra", "pooja.mishra@demo.edu", 4, "A", "21"),
    ("DS022", "Priya Saxena", "priya.saxena@demo.edu", 4, "A", "22"),
    ("DS023", "Rahul Chauhan", "rahul.chauhan@demo.edu", 4, "A", "23"),
    ("DS024", "Rajesh Kumar", "rajesh.kumar@demo.edu", 4, "A", "24"),
    ("DS025", "Ritika Bhatt", "ritika.bhatt@demo.edu", 4, "B", "25"),
    ("DS026", "Rohit Sinha", "rohit.sinha@demo.edu", 4, "B", "26"),
    ("DS027", "Roshni Dubey", "roshni.dubey@demo.edu", 4, "B", "27"),
    ("DS028", "Sachin Thakur", "sachin.thakur@demo.edu", 4, "B", "28"),
    ("DS029", "Sandhya Nair", "sandhya.nair@demo.edu", 4, "B", "29"),
    ("DS030", "Sanjay Yadav", "sanjay.yadav@demo.edu", 4, "B", "30"),
    ("DS031", "Sneha Joshi", "sneha.joshi@demo.edu", 4, "C", "31"),
    ("DS032", "Suresh Patel", "suresh.patel@demo.edu", 4, "C", "32"),
    ("DS033", "Tanvi Kapoor", "tanvi.kapoor@demo.edu", 4, "C", "33"),
    ("DS034", "Uday Garg", "uday.garg@demo.edu", 4, "C", "34"),
    ("DS035", "Vaishali Patil", "vaishali.patil@demo.edu", 4, "C", "35"),
]

SUBJECTS = [
    ("CS301", "Data Structures and Algorithms", 3, 4),
    ("CS302", "Database Management Systems", 3, 4),
    ("CS303", "Object Oriented Programming with Java", 3, 4),
    ("CS401", "Operating Systems", 4, 4),
    ("CS402", "Computer Networks", 4, 4),
    ("CS403", "Software Engineering", 4, 4),
]


def seed_database(db: Session) -> None:
    """Seed all demo data into the database."""

    # Create tables
    Base.metadata.create_all(bind=engine)

    # Skip if already seeded
    if db.query(User).count() > 0:
        print("[Seeder] Database already seeded. Skipping.")
        return

    print("[Seeder] Starting demo data seeding...")

    # ---- Users ----
    admin = User(
        username="admin",
        email="admin@edusupport.edu",
        full_name="Dr. Admin User",
        hashed_password=hash_password("admin123"),
        role=UserRole.ADMIN,
    )
    faculty = User(
        username="faculty",
        email="faculty@edusupport.edu",
        full_name="Prof. Faculty Member",
        hashed_password=hash_password("faculty123"),
        role=UserRole.FACULTY,
    )
    db.add_all([admin, faculty])
    db.commit()
    db.refresh(admin)
    db.refresh(faculty)
    print("[Seeder] Users created.")

    # ---- Subjects ----
    subject_objs = []
    for code, name, semester, credits in SUBJECTS:
        s = Subject(code=code, name=name, semester=semester, credits=credits)
        db.add(s)
        subject_objs.append(s)
    db.commit()
    for s in subject_objs:
        db.refresh(s)
    print(f"[Seeder] {len(subject_objs)} subjects created.")

    # ---- Students ----
    student_objs = []
    for prn, name, email, sem, div, rollno in DEMO_STUDENTS:
        st = Student(
            prn=prn,
            full_name=name,
            email=email,
            semester=sem,
            division=div,
            rollno=rollno,
            date_of_admission=date(2022, 7, 1),
        )
        db.add(st)
        student_objs.append(st)
    db.commit()
    for st in student_objs:
        db.refresh(st)
    print(f"[Seeder] {len(student_objs)} students created.")

    # Semester-subject mapping
    sem3_subjects = [s for s in subject_objs if s.semester == 3]
    sem4_subjects = [s for s in subject_objs if s.semester == 4]
    sem3_students = [st for st in student_objs if st.semester == 3]
    sem4_students = [st for st in student_objs if st.semester == 4]

    # ---- Enrollments ----
    for st in sem3_students:
        for subj in sem3_subjects:
            db.add(Enrollment(student_id=st.id, subject_id=subj.id))
    for st in sem4_students:
        for subj in sem4_subjects:
            db.add(Enrollment(student_id=st.id, subject_id=subj.id))
    db.commit()
    print("[Seeder] Enrollments created.")

    # ---- Attendance Sessions ----
    # 20 sessions per subject over the last 60 days
    base_date = date.today() - timedelta(days=60)
    sessions_created = []

    for subj in subject_objs:
        enrolled_students = sem3_students if subj.semester == 3 else sem4_students
        for week in range(20):
            session_date = base_date + timedelta(days=week * 3)
            sess = AttendanceSession(
                subject_id=subj.id,
                session_date=session_date,
                topic=f"Lecture {week + 1}",
                created_by=faculty.id,
            )
            db.add(sess)
            db.flush()

            # Assign attendance patterns
            for student in enrolled_students:
                idx = student_objs.index(student)

                # Attendance pattern based on student index
                if idx % 7 == 0:
                    # Very low attendance (high risk)
                    prob_present = 0.35
                elif idx % 7 == 1:
                    # Low attendance (medium-high risk)
                    prob_present = 0.55
                elif idx % 7 == 2:
                    # Borderline attendance
                    prob_present = 0.72
                elif idx % 7 == 6:
                    # Nearly perfect attendance
                    prob_present = 0.97
                else:
                    # Good attendance
                    prob_present = 0.88

                att_status = (
                    AttendanceStatus.PRESENT
                    if random.random() < prob_present
                    else AttendanceStatus.ABSENT
                )
                db.add(AttendanceRecord(
                    session_id=sess.id,
                    student_id=student.id,
                    status=att_status,
                ))
            sessions_created.append(sess)

    db.commit()
    print(f"[Seeder] {len(sessions_created)} attendance sessions created.")

    # ---- Assessments ----
    assessment_types = ["Unit Test 1", "Unit Test 2", "Mid-Semester Exam", "Practical Exam", "Assignment Test"]
    assessment_objs = []

    for subj in subject_objs:
        for i, atype in enumerate(assessment_types):
            exam_date = base_date + timedelta(days=10 + i * 10)
            a = Assessment(
                subject_id=subj.id,
                name=f"{atype} - {subj.code}",
                max_marks=50.0 if "Exam" in atype else 25.0,
                assessment_date=exam_date,
                assessment_type="exam" if "Exam" in atype else "quiz",
            )
            db.add(a)
            assessment_objs.append(a)

    db.commit()
    for a in assessment_objs:
        db.refresh(a)
    print(f"[Seeder] {len(assessment_objs)} assessments created.")

    # ---- Assessment Results ----
    for assessment in assessment_objs:
        subj = next(s for s in subject_objs if s.id == assessment.subject_id)
        enrolled_students = sem3_students if subj.semester == 3 else sem4_students

        for student in enrolled_students:
            idx = student_objs.index(student)

            # Marks pattern based on student risk profile
            if idx % 7 == 0:
                # High risk: very poor marks
                base_pct = random.uniform(15, 38)
            elif idx % 7 == 1:
                # Medium-high risk: poor marks
                base_pct = random.uniform(35, 52)
            elif idx % 7 == 2:
                # Medium risk: borderline
                base_pct = random.uniform(48, 62)
            elif idx % 7 == 3:
                # Good performance
                base_pct = random.uniform(65, 80)
            elif idx % 7 == 4:
                # Above average
                base_pct = random.uniform(72, 88)
            elif idx % 7 == 5:
                # Excellent
                base_pct = random.uniform(82, 96)
            else:
                # Top performer
                base_pct = random.uniform(88, 100)

            # Add some variability
            pct = max(0, min(100, base_pct + random.uniform(-5, 5)))
            marks = round((pct / 100) * assessment.max_marks, 1)

            db.add(AssessmentResult(
                assessment_id=assessment.id,
                student_id=student.id,
                marks_obtained=marks,
            ))

    db.commit()
    print("[Seeder] Assessment results created.")

    # ---- Assignments ----
    assignment_titles = [
        "Research Paper Review",
        "Implementation Exercise",
        "Case Study Analysis",
        "Lab Report Submission",
        "Group Project Milestone",
    ]
    assignment_objs = []

    for subj in subject_objs:
        for i, title in enumerate(assignment_titles):
            a = Assignment(
                subject_id=subj.id,
                title=f"{title} - {subj.code}",
                description=f"Complete the {title.lower()} for {subj.name}.",
                due_date=base_date + timedelta(days=15 + i * 10),
                max_marks=10.0,
            )
            db.add(a)
            assignment_objs.append(a)

    db.commit()
    for a in assignment_objs:
        db.refresh(a)
    print(f"[Seeder] {len(assignment_objs)} assignments created.")

    # ---- Assignment Submissions ----
    for assignment in assignment_objs:
        subj = next(s for s in subject_objs if s.id == assignment.subject_id)
        enrolled_students = sem3_students if subj.semester == 3 else sem4_students

        for student in enrolled_students:
            idx = student_objs.index(student)

            # Submission pattern based on risk profile
            if idx % 7 == 0:
                # High risk: many missing
                rand = random.random()
                if rand < 0.55:
                    status = SubmissionStatus.MISSING
                elif rand < 0.75:
                    status = SubmissionStatus.LATE
                else:
                    status = SubmissionStatus.SUBMITTED
            elif idx % 7 == 1:
                rand = random.random()
                if rand < 0.35:
                    status = SubmissionStatus.MISSING
                elif rand < 0.60:
                    status = SubmissionStatus.LATE
                else:
                    status = SubmissionStatus.SUBMITTED
            elif idx % 7 == 2:
                rand = random.random()
                if rand < 0.20:
                    status = SubmissionStatus.MISSING
                elif rand < 0.45:
                    status = SubmissionStatus.LATE
                else:
                    status = SubmissionStatus.SUBMITTED
            else:
                rand = random.random()
                if rand < 0.05:
                    status = SubmissionStatus.MISSING
                elif rand < 0.15:
                    status = SubmissionStatus.LATE
                else:
                    status = SubmissionStatus.SUBMITTED

            marks = None
            submitted_at = None
            if status != SubmissionStatus.MISSING and assignment.max_marks:
                marks = round(random.uniform(5, assignment.max_marks), 1)
                submitted_at = datetime.combine(
                    assignment.due_date + timedelta(days=1 if status == SubmissionStatus.LATE else 0),
                    datetime.min.time()
                )

            db.add(AssignmentSubmission(
                assignment_id=assignment.id,
                student_id=student.id,
                status=status,
                marks_obtained=marks,
                submitted_at=submitted_at,
            ))

    db.commit()
    print("[Seeder] Assignment submissions created.")

    # ---- Risk Assessments ----
    all_students = sem3_students + sem4_students
    category_map = {
        "low": RiskCategory.LOW,
        "medium": RiskCategory.MEDIUM,
        "high": RiskCategory.HIGH,
        "insufficient_data": RiskCategory.INSUFFICIENT_DATA,
    }

    for student in all_students:
        # Collect attendance data
        att_records = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == student.id
        ).all()
        total_sessions = len(att_records)
        present_count = sum(1 for r in att_records if r.status == AttendanceStatus.PRESENT)

        # Collect marks data
        results = (
            db.query(AssessmentResult, Assessment)
            .join(Assessment, AssessmentResult.assessment_id == Assessment.id)
            .filter(AssessmentResult.student_id == student.id)
            .all()
        )
        marks_data = [
            {"marks_obtained": r.marks_obtained, "max_marks": a.max_marks}
            for r, a in results
        ]

        # Collect assignment data
        subs = (
            db.query(AssignmentSubmission, Assignment)
            .join(Assignment, AssignmentSubmission.assignment_id == Assignment.id)
            .filter(AssignmentSubmission.student_id == student.id)
            .all()
        )
        assignment_data = [
            {
                "status": s.status.value,
                "marks_obtained": s.marks_obtained,
                "max_marks": a.max_marks,
            }
            for s, a in subs
        ]

        # Run risk engine
        result = run_risk_engine(
            student_id=student.id,
            attendance_data={"present_count": present_count, "total_sessions": total_sessions},
            marks_data=marks_data,
            assignment_data=assignment_data,
        )

        ra = RiskAssessment(
            student_id=student.id,
            overall_score=result.overall_score,
            category=category_map[result.category],
            attendance_score=result.attendance_score,
            marks_score=result.marks_score,
            assignment_score=result.assignment_score,
            attendance_pct=result.attendance_pct,
            avg_marks_pct=result.avg_marks_pct,
            assignment_completion_pct=result.assignment_completion_pct,
            risk_factors=json.dumps(result.risk_factors),
            recommendations=json.dumps(result.recommendations),
        )
        db.add(ra)

    db.commit()
    print(f"[Seeder] Risk assessments computed for {len(all_students)} students.")
    print("[Seeder] Demo data seeding complete!")
    print("\n  Demo credentials:")
    print("  Admin    -> username: admin    | password: admin123")
    print("  Faculty  -> username: faculty  | password: faculty123\n")


def run_seeder():
    """Entry point to run the seeder directly."""
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


if __name__ == "__main__":
    run_seeder()
