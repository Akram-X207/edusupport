"""
Report service: CSV report generation using Python's built-in csv module.
"""
import csv
import io
from typing import List, Dict, Any


def generate_csv(headers: List[str], rows: List[List[Any]]) -> str:
    """
    Generate a CSV string from a list of headers and rows.

    Args:
        headers: Column header names.
        rows: List of row value lists (same length as headers).

    Returns:
        CSV content as a UTF-8 string.
    """
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(headers)
    writer.writerows(rows)
    return output.getvalue()


def student_risk_report(students: List[Dict[str, Any]]) -> str:
    """Generate a risk report CSV for all students."""
    headers = [
        "PRN", "Student Name", "Semester", "Division",
        "Risk Category", "Overall Score",
        "Attendance %", "Avg Marks %", "Assignment Completion %",
        "Risk Factors",
    ]
    rows = []
    for s in students:
        rows.append([
            s.get("prn", ""),
            s.get("full_name", ""),
            s.get("semester", ""),
            s.get("division", ""),
            s.get("risk_category", ""),
            s.get("overall_score", ""),
            s.get("attendance_pct", ""),
            s.get("avg_marks_pct", ""),
            s.get("assignment_completion_pct", ""),
            "; ".join(s.get("risk_factors", [])),
        ])
    return generate_csv(headers, rows)


def attendance_report(records: List[Dict[str, Any]]) -> str:
    """Generate an attendance summary CSV."""
    headers = [
        "PRN", "Student Name", "Total Sessions",
        "Present", "Absent", "Attendance %", "Below Threshold",
    ]
    rows = [
        [
            r.get("prn", ""),
            r.get("student_name", ""),
            r.get("total_sessions", 0),
            r.get("present_count", 0),
            r.get("absent_count", 0),
            r.get("attendance_percentage", 0),
            "Yes" if r.get("below_threshold") else "No",
        ]
        for r in records
    ]
    return generate_csv(headers, rows)


def marks_report(results: List[Dict[str, Any]]) -> str:
    """Generate a marks summary CSV."""
    headers = [
        "PRN", "Student Name", "Subject", "Assessment",
        "Marks Obtained", "Max Marks", "Percentage",
    ]
    rows = [
        [
            r.get("prn", ""),
            r.get("student_name", ""),
            r.get("subject_name", ""),
            r.get("assessment_name", ""),
            r.get("marks_obtained", ""),
            r.get("max_marks", ""),
            r.get("percentage", ""),
        ]
        for r in results
    ]
    return generate_csv(headers, rows)


def assignment_report(submissions: List[Dict[str, Any]]) -> str:
    """Generate an assignment completion CSV."""
    headers = [
        "PRN", "Student Name", "Subject", "Assignment",
        "Due Date", "Status", "Marks Obtained",
    ]
    rows = [
        [
            s.get("prn", ""),
            s.get("student_name", ""),
            s.get("subject_name", ""),
            s.get("assignment_title", ""),
            s.get("due_date", ""),
            s.get("status", ""),
            s.get("marks_obtained", ""),
        ]
        for s in submissions
    ]
    return generate_csv(headers, rows)
