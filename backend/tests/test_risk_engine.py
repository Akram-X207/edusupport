"""
EduSupport Pytest Test Suite
=============================
Tests the risk engine, service calculations, and API endpoints.
Run with: pytest tests/ -v
"""
import pytest
from app.services.risk_engine import (
    calculate_attendance_risk,
    calculate_marks_risk,
    calculate_assignment_risk,
    calculate_overall_risk,
    classify_risk,
    generate_risk_factors,
    run_risk_engine,
)
from app.services.attendance_service import (
    calculate_attendance_percentage,
    is_below_threshold,
    build_attendance_summary,
)
from app.services.performance_service import (
    calculate_average_percentage,
    grade_from_percentage,
)


# ============================================================
# 1. Attendance Percentage Calculations
# ============================================================

class TestAttendanceCalculations:
    def test_perfect_attendance(self):
        pct = calculate_attendance_percentage(20, 20)
        assert pct == 100.0

    def test_zero_attendance(self):
        pct = calculate_attendance_percentage(0, 20)
        assert pct == 0.0

    def test_partial_attendance(self):
        pct = calculate_attendance_percentage(15, 20)
        assert pct == 75.0

    def test_no_sessions(self):
        """If there are no sessions, percentage should be 0."""
        pct = calculate_attendance_percentage(0, 0)
        assert pct == 0.0

    def test_below_threshold(self):
        assert is_below_threshold(70.0, threshold=75.0) is True
        assert is_below_threshold(75.0, threshold=75.0) is False
        assert is_below_threshold(80.0, threshold=75.0) is False

    def test_attendance_summary_structure(self):
        summary = build_attendance_summary(1, "Test Student", 15, 20)
        assert summary["attendance_percentage"] == 75.0
        assert summary["present_count"] == 15
        assert summary["absent_count"] == 5
        assert summary["total_sessions"] == 20
        assert "below_threshold" in summary


# ============================================================
# 2. Academic Average Calculations
# ============================================================

class TestAcademicCalculations:
    def test_average_percentage_basic(self):
        marks = [
            {"marks_obtained": 40, "max_marks": 50},
            {"marks_obtained": 30, "max_marks": 50},
        ]
        avg = calculate_average_percentage(marks)
        assert avg == 70.0  # (80% + 60%) / 2

    def test_average_percentage_empty(self):
        result = calculate_average_percentage([])
        assert result is None

    def test_average_percentage_zero_max(self):
        """Entries with max_marks = 0 should be ignored."""
        marks = [
            {"marks_obtained": 0, "max_marks": 0},
            {"marks_obtained": 40, "max_marks": 50},
        ]
        avg = calculate_average_percentage(marks)
        assert avg == 80.0

    def test_grade_from_percentage(self):
        assert grade_from_percentage(95) == "O"
        assert grade_from_percentage(80) == "A+"
        assert grade_from_percentage(65) == "A"
        assert grade_from_percentage(55) == "B"
        assert grade_from_percentage(45) == "C"
        assert grade_from_percentage(30) == "F"


# ============================================================
# 3. Assignment Completion Calculations
# ============================================================

class TestAssignmentCalculations:
    def test_all_submitted(self):
        submissions = [{"status": "submitted", "marks_obtained": 8, "max_marks": 10}] * 5
        comp = calculate_assignment_risk(submissions)
        assert comp.available is True
        assert comp.raw_value == 100.0  # All submitted
        assert comp.score < 30  # Low risk

    def test_all_missing(self):
        submissions = [{"status": "missing", "marks_obtained": None, "max_marks": 10}] * 5
        comp = calculate_assignment_risk(submissions)
        assert comp.available is True
        assert comp.raw_value == 0.0  # None submitted
        assert comp.score >= 90  # High risk

    def test_mixed_submissions(self):
        submissions = [
            {"status": "submitted", "marks_obtained": 8, "max_marks": 10},
            {"status": "late", "marks_obtained": 6, "max_marks": 10},
            {"status": "missing", "marks_obtained": None, "max_marks": 10},
        ]
        comp = calculate_assignment_risk(submissions)
        assert comp.available is True
        assert 30 < comp.raw_value < 70  # 2 out of 3 submitted/late

    def test_insufficient_assignments(self):
        comp = calculate_assignment_risk([])
        assert comp.available is False


# ============================================================
# 4. Weighted Risk Score Calculation
# ============================================================

class TestRiskScoreCalculation:
    def test_all_components_available(self):
        att = calculate_attendance_risk(10, 20)   # 50% attendance - below 75%
        marks = calculate_marks_risk([{"marks_obtained": 15, "max_marks": 50}])  # 30%
        assign = calculate_assignment_risk([
            {"status": "missing", "marks_obtained": None, "max_marks": 10},
            {"status": "missing", "marks_obtained": None, "max_marks": 10},
        ])
        overall = calculate_overall_risk(att, marks, assign)
        assert overall is not None
        assert 0 <= overall <= 100

    def test_high_performer_low_risk(self):
        att = calculate_attendance_risk(19, 20)   # 95% attendance
        marks = calculate_marks_risk([
            {"marks_obtained": 45, "max_marks": 50},
            {"marks_obtained": 48, "max_marks": 50},
        ])  # ~93%
        assign = calculate_assignment_risk([
            {"status": "submitted", "marks_obtained": 9, "max_marks": 10},
        ] * 5)
        overall = calculate_overall_risk(att, marks, assign)
        assert overall is not None
        assert overall < 20  # Should be clearly low risk

    def test_no_components_available(self):
        att = calculate_attendance_risk(0, 0)
        marks = calculate_marks_risk([])
        assign = calculate_assignment_risk([])
        overall = calculate_overall_risk(att, marks, assign)
        assert overall is None

    def test_custom_weights(self):
        att = calculate_attendance_risk(15, 20)
        marks = calculate_marks_risk([{"marks_obtained": 25, "max_marks": 50}])
        assign = calculate_assignment_risk([{"status": "submitted", "marks_obtained": 8, "max_marks": 10}])
        weights = {"attendance": 50, "marks": 30, "assignment": 20}
        overall = calculate_overall_risk(att, marks, assign, weights)
        assert overall is not None


# ============================================================
# 5. Risk Category Classification
# ============================================================

class TestRiskClassification:
    def test_low_risk(self):
        assert classify_risk(15.0, True) == "low"
        assert classify_risk(29.0, True) == "low"

    def test_medium_risk(self):
        assert classify_risk(30.0, True) == "medium"
        assert classify_risk(59.0, True) == "medium"

    def test_high_risk(self):
        assert classify_risk(60.0, True) == "high"
        assert classify_risk(95.0, True) == "high"

    def test_boundary_values(self):
        assert classify_risk(0.0, True) == "low"
        assert classify_risk(100.0, True) == "high"

    def test_insufficient_data(self):
        assert classify_risk(None, False) == "insufficient_data"
        assert classify_risk(None, True) == "insufficient_data"
        assert classify_risk(50.0, False) == "insufficient_data"


# ============================================================
# 6. Insufficient Data Handling
# ============================================================

class TestInsufficientData:
    def test_no_attendance_data(self):
        comp = calculate_attendance_risk(0, 0)
        assert comp.available is False

    def test_too_few_attendance_sessions(self):
        # Only 2 sessions, below MIN_ATTENDANCE_SESSIONS=3
        comp = calculate_attendance_risk(2, 2)
        assert comp.available is False

    def test_no_assessment_results(self):
        comp = calculate_marks_risk([])
        assert comp.available is False

    def test_run_engine_no_data(self):
        result = run_risk_engine(
            student_id=999,
            attendance_data={"present_count": 0, "total_sessions": 0},
            marks_data=[],
            assignment_data=[],
        )
        assert result.category == "insufficient_data"
        assert result.overall_score is None


# ============================================================
# 7. Invalid Marks and Attendance Inputs
# ============================================================

class TestInputValidation:
    def test_marks_negative_filtered(self):
        """Negative marks should be treated as invalid and excluded."""
        marks = [
            {"marks_obtained": -5, "max_marks": 50},
            {"marks_obtained": 40, "max_marks": 50},
        ]
        comp = calculate_marks_risk(marks)
        # Only the valid entry should be used
        assert comp.available is True
        assert comp.raw_value == 80.0  # 40/50 = 80%

    def test_attendance_risk_full_absence(self):
        comp = calculate_attendance_risk(0, 20)
        assert comp.available is True
        assert comp.score == 100.0  # Maximum risk

    def test_attendance_risk_full_presence(self):
        comp = calculate_attendance_risk(20, 20)
        assert comp.available is True
        assert comp.score == 0.0  # No risk

    def test_marks_zero_max_filtered(self):
        """Entries with max_marks = 0 should be excluded."""
        marks = [{"marks_obtained": 10, "max_marks": 0}]
        comp = calculate_marks_risk(marks)
        assert comp.available is False


# ============================================================
# 8. Risk Factor and Recommendation Generation
# ============================================================

class TestRiskFactorsAndRecommendations:
    def test_run_engine_returns_factors_and_recommendations(self):
        result = run_risk_engine(
            student_id=1,
            attendance_data={"present_count": 10, "total_sessions": 20},
            marks_data=[{"marks_obtained": 15, "max_marks": 50}],
            assignment_data=[{"status": "missing", "marks_obtained": None, "max_marks": 10}] * 3,
        )
        assert isinstance(result.risk_factors, list)
        assert len(result.risk_factors) > 0
        assert isinstance(result.recommendations, list)
        assert len(result.recommendations) > 0

    def test_good_student_low_risk_recommendation(self):
        result = run_risk_engine(
            student_id=2,
            attendance_data={"present_count": 19, "total_sessions": 20},
            marks_data=[{"marks_obtained": 46, "max_marks": 50}] * 3,
            assignment_data=[{"status": "submitted", "marks_obtained": 9, "max_marks": 10}] * 5,
        )
        assert result.category == "low"
        assert result.overall_score is not None
        assert result.overall_score < 30
