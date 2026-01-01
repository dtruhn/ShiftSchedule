from backend.models import TemplateSlot
from backend.solver import _build_slot_interval, _parse_time_to_minutes


def test_parse_time_to_minutes_valid() -> None:
    assert _parse_time_to_minutes("08:30") == 8 * 60 + 30


def test_parse_time_to_minutes_invalid() -> None:
    assert _parse_time_to_minutes("24:00") is None
    assert _parse_time_to_minutes("08:60") is None
    assert _parse_time_to_minutes("bad") is None


def test_build_slot_interval_applies_day_offset_and_location() -> None:
    slot = TemplateSlot(
        id="slot-1",
        locationId="loc-1",
        rowBandId="row-1",
        colBandId="col-1",
        blockId="block-1",
        startTime="08:00",
        endTime="16:00",
        endDayOffset=1,
    )
    assert _build_slot_interval(slot, "loc-1") == (480, 2400, "loc-1")


def test_build_slot_interval_clamps_offset_and_non_negative_end() -> None:
    slot = TemplateSlot(
        id="slot-2",
        locationId="loc-1",
        rowBandId="row-1",
        colBandId="col-1",
        blockId="block-2",
        startTime="08:00",
        endTime="16:00",
        endDayOffset=5,
    )
    assert _build_slot_interval(slot, "loc-1") == (480, 5280, "loc-1")


def test_build_slot_interval_handles_end_before_start() -> None:
    slot = TemplateSlot(
        id="slot-3",
        locationId="loc-1",
        rowBandId="row-1",
        colBandId="col-1",
        blockId="block-3",
        startTime="08:00",
        endTime="06:00",
        endDayOffset=0,
    )
    assert _build_slot_interval(slot, "loc-1") == (480, 480, "loc-1")
