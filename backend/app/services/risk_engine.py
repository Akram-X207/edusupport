"""
EduSupport Academic Risk Engine.

This module implements the core risk detection algorithm. It is deliberately
kept independent from FastAPI so that it can be unit-tested in isolation.

Risk Score Calculation
======================
The overall risk score is a weighted combination of three components:

  Overall = (Attendance Risk × W_att) + (Marks Risk × W_marks) + (Assignment Risk × W_assign)

Each component score is in the range [0, 100] where a higher score means more risk.

Component definitions
---------------------
Attendance Risk  : Penalises attendance below the minimum threshold.
Marks Risk       : 100 − average assessment percentage.
Assignment Risk  : Driven by the proportion of missing/late submissions.

Thresholds (configurable)
--------------------------
Low    : 0–29
Medium : 30–59
High   : 60–100

Insufficient Data : fewer than the minimum required records are available.
"""
import json
import math
from dataclasses import dataclass
from typing import Optional, List, Dict, Any

from app.config import settings


# Minimum number of data points needed before a component is considered reliable
MIN_ATTENDANCE_SESSIONS = 3
MIN_ASSESSMENTS = 1
MIN_ASSIGNMENTS = 1


@dataclass
class ComponentScore:
    """Holds the computed score and raw data for a single risk component."""
    score: float          # 0-100, higher = more risk
    raw_value: float      # percentage or ratio used in calculation
    available: bool       # whether sufficient data existed


@dataclass
class RiskResult:
    """
    Final output from the risk engine for a single student.

    Fields:
        overall_score    : weighted combined score (None if insufficient data)
        category         : "low" | "medium" | "high" | "insufficient_data"
        attendance_score : attendance component score (0-100)
        marks_score      : marks component score (0-100)
        assignment_score : assignment component score (0-100)
        attendance_pct   : actual attendance percentage
        avg_marks_pct    : average assessment percentage
        assignment_completion_pct : proportion of assignments submitted (non-missing)
        risk_factors     : human-readable list of risk factors
        recommendations  : human-readable list of recommended actions
    """
    overall_score: Optional[float]
    category: str
    attendance_score: Optional[float]
    marks_score: Optional[float]
    assignment_score: Optional[float]
    attendance_pct: Optional[float]
    avg_marks_pct: Optional[float]
    assignment_completion_pct: Optional[float]
    risk_factors: List[str]
    recommendations: List[str]


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    """Clamp a float to [lo, hi]."""
    return max(lo, min(hi, value))


def calculate_attendance_risk(
    present_count: int,
    total_sessions: int,
    min_threshold: float = None,
) -> ComponentScore:
    """
    Calculate the attendance risk component.

    Formula:
        attendance_pct = (present / total) × 100
        If attendance_pct >= threshold: score = max(0, (threshold - pct) / threshold * 60)
        # Even at threshold, a small score is given; below threshold it rises steeply.
        Full formula:
            deficit = max(0, threshold - attendance_pct)
            score   = min(100, (deficit / threshold) * 120)

    Args:
        present_count: Number of sessions the student attended.
        total_sessions: Total number of sessions held.
        min_threshold: Minimum acceptable attendance percentage.

    Returns:
        ComponentScore with score, raw attendance percentage, and availability flag.
    """
    if min_threshold is None:
        min_threshold = settings.MIN_ATTENDANCE_PERCENT

    if total_sessions < MIN_ATTENDANCE_SESSIONS:
        return ComponentScore(score=0.0, raw_value=0.0, available=False)

    attendance_pct = (present_count / total_sessions) * 100.0

    # Proportional penalty: student 20% below threshold gets a much higher score
    deficit = max(0.0, min_threshold - attendance_pct)
    # At threshold=75: deficit of 75 (0% attendance) → score = 100
    score = _clamp((deficit / min_threshold) * 100.0 * 1.33)

    return ComponentScore(score=round(score, 2), raw_value=round(attendance_pct, 2), available=True)


def calculate_marks_risk(
    marks_list: List[Dict[str, float]],
) -> ComponentScore:
    """
    Calculate the academic marks risk component.

    Formula:
        percentage_i = (marks_obtained_i / max_marks_i) × 100
        avg_pct      = mean(percentage_i for all i)
        score        = 100 − avg_pct

    Args:
        marks_list: List of dicts with keys 'marks_obtained' and 'max_marks'.

    Returns:
        ComponentScore with marks risk score and average percentage.
    """
    if len(marks_list) < MIN_ASSESSMENTS:
        return ComponentScore(score=0.0, raw_value=0.0, available=False)

    valid_entries = [
        m for m in marks_list
        if m.get("max_marks", 0) > 0 and m.get("marks_obtained", -1) >= 0
    ]
    if not valid_entries:
        return ComponentScore(score=0.0, raw_value=0.0, available=False)

    percentages = [
        (m["marks_obtained"] / m["max_marks"]) * 100.0
        for m in valid_entries
    ]
    avg_pct = sum(percentages) / len(percentages)
    score = _clamp(100.0 - avg_pct)

    return ComponentScore(score=round(score, 2), raw_value=round(avg_pct, 2), available=True)


def calculate_assignment_risk(
    submissions: List[Dict[str, Any]],
) -> ComponentScore:
    """
    Calculate the assignment risk component.

    Scoring:
        base_score = missing_pct × 1.0 + late_pct × 0.4

        If assignment marks are available, blend in a marks deficit:
            marks_deficit_pct = 100 − avg_submission_pct
            final = 0.7 × base_score + 0.3 × marks_deficit_pct

        Otherwise:
            final = base_score

    Args:
        submissions: List of dicts with keys 'status', 'marks_obtained' (optional),
                     and 'max_marks' (optional).

    Returns:
        ComponentScore with assignment risk score and completion percentage.
    """
    if len(submissions) < MIN_ASSIGNMENTS:
        return ComponentScore(score=0.0, raw_value=0.0, available=False)

    total = len(submissions)
    missing_count = sum(1 for s in submissions if s.get("status") == "missing")
    late_count = sum(1 for s in submissions if s.get("status") == "late")
    submitted_count = total - missing_count

    completion_pct = (submitted_count / total) * 100.0
    missing_pct = (missing_count / total) * 100.0
    late_pct = (late_count / total) * 100.0

    base_score = _clamp(missing_pct * 1.0 + late_pct * 0.4)

    # Optional: incorporate submission marks quality
    scored_submissions = [
        s for s in submissions
        if s.get("status") != "missing"
        and s.get("marks_obtained") is not None
        and s.get("max_marks") is not None
        and s["max_marks"] > 0
    ]

    if scored_submissions:
        avg_sub_pct = sum(
            (s["marks_obtained"] / s["max_marks"]) * 100.0
            for s in scored_submissions
        ) / len(scored_submissions)
        marks_deficit = _clamp(100.0 - avg_sub_pct)
        final_score = _clamp(0.7 * base_score + 0.3 * marks_deficit)
    else:
        final_score = base_score

    return ComponentScore(
        score=round(final_score, 2),
        raw_value=round(completion_pct, 2),
        available=True,
    )


def calculate_overall_risk(
    attendance_component: ComponentScore,
    marks_component: ComponentScore,
    assignment_component: ComponentScore,
    weights: Optional[Dict[str, float]] = None,
) -> Optional[float]:
    """
    Combine component scores into a weighted overall risk score.

    Returns None if no component has available data.
    Uses only available components and renormalises weights accordingly.

    Args:
        attendance_component: Result from calculate_attendance_risk()
        marks_component: Result from calculate_marks_risk()
        assignment_component: Result from calculate_assignment_risk()
        weights: Optional dict with keys 'attendance', 'marks', 'assignment' summing to 100.

    Returns:
        Overall risk score in [0, 100] or None.
    """
    if weights is None:
        weights = {
            "attendance": settings.ATTENDANCE_WEIGHT,
            "marks": settings.MARKS_WEIGHT,
            "assignment": settings.ASSIGNMENT_WEIGHT,
        }

    components = [
        ("attendance", attendance_component),
        ("marks", marks_component),
        ("assignment", assignment_component),
    ]

    available_components = [(name, c) for name, c in components if c.available]
    if not available_components:
        return None

    # Renormalise weights to only include available components
    total_weight = sum(weights[name] for name, _ in available_components)
    if total_weight == 0:
        return None

    overall = sum(
        (weights[name] / total_weight) * component.score
        for name, component in available_components
    )
    return round(_clamp(overall), 2)


def classify_risk(
    overall_score: Optional[float],
    any_data_available: bool,
) -> str:
    """
    Classify a risk score into a risk category.

    Categories:
        insufficient_data : no reliable data available
        low               : 0–29
        medium            : 30–59
        high              : 60–100

    Args:
        overall_score: The computed risk score (None if insufficient data).
        any_data_available: True if at least one component had data.

    Returns:
        Category string.
    """
    if overall_score is None or not any_data_available:
        return "insufficient_data"

    if overall_score <= settings.LOW_RISK_MAX:
        return "low"
    elif overall_score <= settings.MEDIUM_RISK_MAX:
        return "medium"
    else:
        return "high"


def generate_risk_factors(
    attendance_component: ComponentScore,
    marks_component: ComponentScore,
    assignment_component: ComponentScore,
    min_attendance: float = None,
) -> List[str]:
    """
    Generate human-readable risk factors based on computed scores.

    Returns:
        List of plain-English descriptions of identified academic risk factors.
    """
    if min_attendance is None:
        min_attendance = settings.MIN_ATTENDANCE_PERCENT

    factors = []

    if attendance_component.available:
        pct = attendance_component.raw_value
        if pct < min_attendance:
            deficit = round(min_attendance - pct, 1)
            factors.append(
                f"Attendance is {pct:.1f}%, which is {deficit}% below the "
                f"required minimum of {min_attendance:.0f}%."
            )
        elif attendance_component.score > 10:
            factors.append(
                f"Attendance is {pct:.1f}%, approaching the minimum threshold."
            )

    if marks_component.available:
        pct = marks_component.raw_value
        if pct < 40:
            factors.append(
                f"Average assessment score is critically low at {pct:.1f}%."
            )
        elif pct < 60:
            factors.append(
                f"Average assessment score of {pct:.1f}% is below the passing benchmark."
            )
        elif pct < 75:
            factors.append(
                f"Average assessment score of {pct:.1f}% has room for improvement."
            )

    if assignment_component.available:
        completion = assignment_component.raw_value
        if completion < 50:
            factors.append(
                f"Assignment completion rate is critically low at {completion:.1f}%."
            )
        elif completion < 75:
            factors.append(
                f"Assignment completion rate of {completion:.1f}% indicates missing submissions."
            )

    if not factors:
        factors.append("No significant academic risk factors identified at this time.")

    return factors


def generate_recommendations(
    risk_category: str,
    attendance_component: ComponentScore,
    marks_component: ComponentScore,
    assignment_component: ComponentScore,
    min_attendance: float = None,
) -> List[str]:
    """
    Generate actionable, personalised recommendations based on risk factors.

    NOTE: This system is an early-warning tool. Recommendations are advisory
    only and do not constitute a definitive judgment about a student.

    Returns:
        List of plain-English recommendations for faculty.
    """
    if min_attendance is None:
        min_attendance = settings.MIN_ATTENDANCE_PERCENT

    recommendations = []

    if risk_category == "insufficient_data":
        recommendations.append(
            "Insufficient academic data is available. Ensure attendance records, "
            "assessment results, and assignment records are entered for this student."
        )
        return recommendations

    # Attendance recommendations
    if attendance_component.available and attendance_component.raw_value < min_attendance:
        recommendations.append(
            "Schedule a meeting with the student to discuss attendance barriers. "
            "Monitor attendance closely in the coming weeks."
        )
        if attendance_component.raw_value < 50:
            recommendations.append(
                "Consider sending a formal attendance warning as per institutional policy."
            )

    # Marks recommendations
    if marks_component.available:
        if marks_component.raw_value < 40:
            recommendations.append(
                "Arrange immediate academic support sessions. The student may require "
                "foundational remedial assistance in the subject."
            )
        elif marks_component.raw_value < 60:
            recommendations.append(
                "Provide additional study materials and encourage the student to attend "
                "extra tutorial sessions."
            )
        elif marks_component.raw_value < 75:
            recommendations.append(
                "Encourage consistent revision and participation in peer study groups."
            )

    # Assignment recommendations
    if assignment_component.available and assignment_component.raw_value < 75:
        recommendations.append(
            "Follow up with the student regarding missing or late assignment submissions. "
            "Identify whether workload management is an issue."
        )
        if assignment_component.raw_value < 50:
            recommendations.append(
                "Consider a structured assignment support plan with faculty-supervised deadlines."
            )

    # High-risk holistic recommendation
    if risk_category == "high" and len(recommendations) >= 2:
        recommendations.append(
            "Given multiple risk factors, consider developing a personalised academic "
            "intervention plan in consultation with the academic coordinator."
        )

    if not recommendations:
        recommendations.append(
            "The student's academic performance is currently satisfactory. "
            "Continue regular monitoring."
        )

    return recommendations


def run_risk_engine(
    student_id: int,
    attendance_data: Dict[str, Any],
    marks_data: List[Dict[str, float]],
    assignment_data: List[Dict[str, Any]],
    weights: Optional[Dict[str, float]] = None,
) -> RiskResult:
    """
    Main entry point for the risk engine.

    Args:
        student_id: ID of the student being assessed.
        attendance_data: Dict with 'present_count' and 'total_sessions'.
        marks_data: List of {'marks_obtained': float, 'max_marks': float}.
        assignment_data: List of {'status': str, 'marks_obtained': float|None, 'max_marks': float|None}.
        weights: Optional custom weights dict.

    Returns:
        RiskResult dataclass with all computed scores and explanations.
    """
    # Compute individual component scores
    att = calculate_attendance_risk(
        present_count=attendance_data.get("present_count", 0),
        total_sessions=attendance_data.get("total_sessions", 0),
    )
    marks = calculate_marks_risk(marks_data)
    assign = calculate_assignment_risk(assignment_data)

    # Compute overall risk
    overall = calculate_overall_risk(att, marks, assign, weights)
    any_available = att.available or marks.available or assign.available
    category = classify_risk(overall, any_available)

    # Generate human-readable factors and recommendations
    factors = generate_risk_factors(att, marks, assign)
    recommendations = generate_recommendations(category, att, marks, assign)

    return RiskResult(
        overall_score=overall,
        category=category,
        attendance_score=att.score if att.available else None,
        marks_score=marks.score if marks.available else None,
        assignment_score=assign.score if assign.available else None,
        attendance_pct=att.raw_value if att.available else None,
        avg_marks_pct=marks.raw_value if marks.available else None,
        assignment_completion_pct=assign.raw_value if assign.available else None,
        risk_factors=factors,
        recommendations=recommendations,
    )
