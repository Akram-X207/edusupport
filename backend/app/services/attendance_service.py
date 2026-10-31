"""
Attendance service: attendance percentage calculations and summary generation.
Pure Python logic separated from the database layer.
"""
from typing import List, Dict, Any
from app.config import settings


def calculate_attendance_percentage(present: int, total: int) -> float:
    """
    Calculate attendance percentage.

    Args:
        present: Number of sessions attended.
        total: Total number of sessions held.

    Returns:
        Attendance percentage in [0, 100]. Returns 0 if total is 0.
    """
    if total == 0:
        return 0.0
    return round((present / total) * 100, 2)


def is_below_threshold(attendance_pct: float, threshold: float = None) -> bool:
    """
    Determine whether a student's attendance is below the required threshold.

    Args:
        attendance_pct: Student's attendance percentage.
        threshold: Minimum required percentage (uses config default if None).

    Returns:
        True if attendance is below the threshold.
    """
    if threshold is None:
        threshold = settings.MIN_ATTENDANCE_PERCENT
    return attendance_pct < threshold


def build_attendance_summary(
    student_id: int,
    student_name: str,
    present_count: int,
    total_sessions: int,
    threshold: float = None,
) -> Dict[str, Any]:
    """
    Build a comprehensive attendance summary dict for one student.

    Returns:
        Dictionary with attendance statistics.
    """
    if threshold is None:
        threshold = settings.MIN_ATTENDANCE_PERCENT

    pct = calculate_attendance_percentage(present_count, total_sessions)
    return {
        "student_id": student_id,
        "student_name": student_name,
        "total_sessions": total_sessions,
        "present_count": present_count,
        "absent_count": total_sessions - present_count,
        "attendance_percentage": pct,
        "below_threshold": is_below_threshold(pct, threshold),
    }


def aggregate_class_attendance(summaries: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compute class-level attendance statistics from individual summaries.

    Args:
        summaries: List of attendance summary dicts from build_attendance_summary().

    Returns:
        Dictionary with class-level statistics.
    """
    if not summaries:
        return {"average_attendance_pct": 0.0, "below_threshold_count": 0, "total_students": 0}

    total = len(summaries)
    avg = sum(s["attendance_percentage"] for s in summaries) / total
    below = sum(1 for s in summaries if s["below_threshold"])

    return {
        "average_attendance_pct": round(avg, 2),
        "below_threshold_count": below,
        "total_students": total,
    }
