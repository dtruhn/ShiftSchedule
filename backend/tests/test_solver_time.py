from backend.models import SubShift, WorkplaceRow
from backend.solver import _build_shift_intervals, _parse_time_to_minutes


def test_parse_time_to_minutes_valid() -> None:
    assert _parse_time_to_minutes("08:30") == 8 * 60 + 30


def test_parse_time_to_minutes_invalid() -> None:
    assert _parse_time_to_minutes("24:00") is None
    assert _parse_time_to_minutes("08:60") is None
    assert _parse_time_to_minutes("bad") is None


def test_build_shift_intervals_applies_day_offset_and_location() -> None:
    row = WorkplaceRow(
        id="class-1",
        name="MRI",
        kind="class",
        dotColorClass="bg-slate-200",
        locationId="loc-1",
        subShifts=[
            SubShift(
                id="s1",
                name="Shift 1",
                order=1,
                startTime="08:00",
                endTime="16:00",
                endDayOffset=1,
            )
        ],
    )
    intervals = _build_shift_intervals([row])
    assert intervals["class-1::s1"] == (480, 2400, "loc-1")


def test_build_shift_intervals_clamps_offset_and_non_negative_end() -> None:
    row = WorkplaceRow(
        id="class-2",
        name="CT",
        kind="class",
        dotColorClass="bg-slate-200",
        subShifts=[
            SubShift(
                id="s2",
                name="Shift 2",
                order=2,
                startTime="08:00",
                endTime="16:00",
                endDayOffset=5,
            )
        ],
    )
    intervals = _build_shift_intervals([row])
    assert intervals["class-2::s2"] == (480, 5280, "")


def test_build_shift_intervals_handles_end_before_start() -> None:
    row = WorkplaceRow(
        id="class-3",
        name="US",
        kind="class",
        dotColorClass="bg-slate-200",
        subShifts=[
            SubShift(
                id="s1",
                name="Shift 1",
                order=1,
                startTime="08:00",
                endTime="06:00",
                endDayOffset=0,
            )
        ],
    )
    intervals = _build_shift_intervals([row])
    assert intervals["class-3::s1"] == (480, 480, "")
