"""
Performance service: academic marks calculations.
"""
from typing import List, Dict, Optional


def calculate_average_percentage(
    marks_list: List[Dict[str, float]],
) -> Optional[float]:
    """
    Calculate the average assessment percentage across multiple assessments.

    Args:
        marks_list: List of dicts with 'marks_obtained' and 'max_marks'.

    Returns:
        Average percentage (0-100), or None if no valid assessments.
    """
    valid = [
        m for m in marks_list
        if m.get("max_marks", 0) > 0 and m.get("marks_obtained", -1) >= 0
    ]
    if not valid:
        return None

    percentages = [(m["marks_obtained"] / m["max_marks"]) * 100 for m in valid]
    return round(sum(percentages) / len(percentages), 2)


def subject_average(
    results: List[Dict[str, float]],
) -> Dict[str, float]:
    """
    Calculate per-subject average marks percentage.

    Args:
        results: List of dicts with 'subject_id', 'marks_obtained', 'max_marks'.

    Returns:
        Dict mapping subject_id → average percentage.
    """
    from collections import defaultdict

    subject_marks: Dict[int, List[float]] = defaultdict(list)
    for r in results:
        if r.get("max_marks", 0) > 0 and r.get("marks_obtained", -1) >= 0:
            pct = (r["marks_obtained"] / r["max_marks"]) * 100
            subject_marks[r["subject_id"]].append(pct)

    return {
        sid: round(sum(pcts) / len(pcts), 2)
        for sid, pcts in subject_marks.items()
        if pcts
    }


def grade_from_percentage(pct: float) -> str:
    """Return a letter grade for a given percentage."""
    if pct >= 90:
        return "O"   # Outstanding
    elif pct >= 75:
        return "A+"
    elif pct >= 60:
        return "A"
    elif pct >= 50:
        return "B"
    elif pct >= 40:
        return "C"
    else:
        return "F"
