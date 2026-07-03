"""
Deterministic chart-data extraction from the question bank's SVG charts.

Why this exists: the grading pipeline used to rasterize the chart SVG to a
small PNG and ask a vision model to *read the numbers off the picture*.
That is non-deterministic — the axis labels are ~10px text, and a single
misread (e.g. "103.2" seen as "1032") corrupts the whole reference scale
and produces cascades of bogus "Data Accuracy" errors. But the exact same
numbers exist as machine-readable <text> elements in the SVG source, and
every data mark (bar/point/slice) has exact coordinates. This module
computes the true values directly from that geometry, with no AI involved.

All question-bank SVGs are programmatically generated with a consistent
structure (see backend chart importers), which is what makes exact parsing
viable. If anything about a chart doesn't match the expected structure the
parser returns None and the caller falls back to the vision path.

Supported chart shapes (verified against every chart_svg row in exam_tasks):
  - bar / grouped bar / time-series bar   (<rect> data bars)
  - line / multi-line                     (<circle> points, <polyline> backup)
  - mixed bar + line with dual Y axes     (<rect> bars on left axis, <circle>
                                           points on right axis)
  - pie / comparative pies                (<path> arc segments)
"""

import math
import re
import xml.etree.ElementTree as ET
from typing import Dict, List, Optional, Tuple

_NUMERIC_RE = re.compile(r"^-?[\d,]+(?:\.\d+)?%?$")

_LEGEND_SWATCH_SIZE = 15  # all generated legends use 15x15 colour swatches


def _local(tag: str) -> str:
    return tag.split("}")[-1]


def _f(attrs: dict, key: str, default: Optional[float] = None) -> Optional[float]:
    raw = attrs.get(key)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _numeric_value(content: str) -> Optional[float]:
    content = content.strip()
    if not _NUMERIC_RE.match(content):
        return None
    try:
        return float(content.replace(",", "").rstrip("%"))
    except ValueError:
        return None


def _collect_elements(svg_text: str) -> Optional[dict]:
    try:
        root = ET.fromstring(svg_text)
    except ET.ParseError:
        return None

    out = {"text": [], "rect": [], "line": [], "circle": [], "polyline": [], "path": []}
    for el in root.iter():
        tag = _local(el.tag)
        if tag in out:
            entry = dict(el.attrib)
            if tag == "text":
                entry["_content"] = (el.text or "").strip()
            out[tag].append(entry)

    vb = root.attrib.get("viewBox", "").split()
    out["_width"] = float(vb[2]) if len(vb) == 4 else _f(root.attrib, "width", 760.0)
    return out


# ── Axis calibration ─────────────────────────────────────────────────────────

def _horizontal_gridlines(lines: List[dict], min_span: float = 100.0) -> List[float]:
    ys = []
    for ln in lines:
        y1, y2 = _f(ln, "y1"), _f(ln, "y2")
        x1, x2 = _f(ln, "x1"), _f(ln, "x2")
        if None in (y1, y2, x1, x2):
            continue
        if abs(y1 - y2) < 0.01 and abs(x2 - x1) >= min_span:
            if not any(abs(y1 - y) < 0.5 for y in ys):
                ys.append(y1)
    return sorted(ys)


def _fit_axis(pairs: List[Tuple[float, float]]) -> Optional[Tuple[float, float]]:
    """Least-squares fit value = a*y + b over (value, y) pairs."""
    if len(pairs) < 2:
        return None
    n = len(pairs)
    sy = sum(y for _, y in pairs)
    sv = sum(v for v, _ in pairs)
    syy = sum(y * y for _, y in pairs)
    svy = sum(v * y for v, y in pairs)
    denom = n * syy - sy * sy
    if abs(denom) < 1e-9:
        return None
    a = (n * svy - sv * sy) / denom
    b = (sv - a * sy) / n
    return a, b


def _build_axes(elements: dict) -> dict:
    """Returns {'left': (a, b, unit), 'right': ..., 'gridline_ys': [...]} for available axes."""
    grid_ys = _horizontal_gridlines(elements["line"])
    if len(grid_ys) < 2:
        return {"gridline_ys": grid_ys}

    grid_x1 = min(_f(ln, "x1", 1e9) for ln in elements["line"]) if elements["line"] else 0
    grid_x2 = max(_f(ln, "x2", 0) for ln in elements["line"]) if elements["line"] else 0

    left_pairs, right_pairs = [], []
    left_pct, right_pct = False, False
    for t in elements["text"]:
        if "transform" in t:
            continue
        val = _numeric_value(t["_content"])
        if val is None:
            continue
        tx, ty = _f(t, "x"), _f(t, "y")
        if tx is None or ty is None:
            continue
        nearest = min(grid_ys, key=lambda gy: abs(gy - ty))
        if abs(nearest - ty) > 10:
            continue
        anchor = t.get("text-anchor", "start")
        is_pct = t["_content"].rstrip().endswith("%")
        if anchor == "end" and tx <= grid_x1 + 15:
            left_pairs.append((val, nearest))
            left_pct = left_pct or is_pct
        elif anchor == "start" and tx >= grid_x2 - 15:
            right_pairs.append((val, nearest))
            right_pct = right_pct or is_pct

    axes = {"gridline_ys": grid_ys}
    left = _fit_axis(left_pairs)
    if left:
        axes["left"] = (left[0], left[1], "%" if left_pct else "")
        axes["left_labels"] = sorted({v for v, _ in left_pairs})
    right = _fit_axis(right_pairs)
    if right:
        axes["right"] = (right[0], right[1], "%" if right_pct else "")
        axes["right_labels"] = sorted({v for v, _ in right_pairs})
    return axes


# ── Legend / labels ──────────────────────────────────────────────────────────

def _legend_map(elements: dict) -> Dict[str, str]:
    """fill colour → series label, from 15x15 swatch rects and their adjacent text."""
    mapping = {}
    for r in elements["rect"]:
        if _f(r, "width") != _LEGEND_SWATCH_SIZE or _f(r, "height") != _LEGEND_SWATCH_SIZE:
            continue
        fill = r.get("fill")
        rx, ry = _f(r, "x"), _f(r, "y")
        if not fill or rx is None or ry is None:
            continue
        best, best_dx = None, 1e9
        for t in elements["text"]:
            tx, ty = _f(t, "x"), _f(t, "y")
            if tx is None or ty is None or not t["_content"]:
                continue
            dx = tx - (rx + _LEGEND_SWATCH_SIZE)
            if 0 <= dx <= 60 and abs(ty - (ry + 12)) <= 8 and dx < best_dx:
                best, best_dx = t["_content"], dx
        if best:
            mapping[fill] = best
    return mapping


def _x_labels(elements: dict, baseline_y: float) -> List[Tuple[float, str]]:
    """Category labels along the baseline (years, countries, etc.).

    Y-axis tick numbers (e.g. '0.0', '103.2') sit near the baseline too but
    use text-anchor='end' and sit left of the plot — exclude those so the
    first bar group is not mis-labelled '0.0' instead of '2000'.
    """
    plot_left = min(_f(ln, "x1", 60.0) for ln in elements["line"]) if elements["line"] else 60.0
    labels = []
    for t in elements["text"]:
        if "transform" in t or not t["_content"]:
            continue
        tx, ty = _f(t, "x"), _f(t, "y")
        if tx is None or ty is None:
            continue
        if baseline_y + 2 <= ty <= baseline_y + 40:
            anchor = t.get("text-anchor", "start")
            if anchor == "end" or tx < plot_left + 10:
                continue
            labels.append((tx, t["_content"]))
    return sorted(labels)


def _nearest_label(x: float, labels: List[Tuple[float, str]]) -> str:
    if not labels:
        return f"x={x:.0f}"
    return min(labels, key=lambda lb: abs(lb[0] - x))[1]


def _fmt(v: float) -> str:
    return f"{v:.1f}".rstrip("0").rstrip(".")


# ── Series extraction ────────────────────────────────────────────────────────

def _bar_series(elements: dict, axes: dict, labels, canvas_w: float) -> Dict[str, List[Tuple[str, float]]]:
    if "left" not in axes:
        return {}
    a, b, _ = axes["left"]
    series: Dict[str, List[Tuple[str, float]]] = {}
    for r in elements["rect"]:
        w, h = _f(r, "width"), _f(r, "height")
        x, y = _f(r, "x"), _f(r, "y")
        fill = r.get("fill", "")
        if None in (w, h) or w >= canvas_w * 0.8:  # background rect
            continue
        if w == _LEGEND_SWATCH_SIZE and h == _LEGEND_SWATCH_SIZE:  # legend swatch
            continue
        if x is None or y is None or not fill or fill in ("#ffffff", "#fff", "none"):
            continue
        value = a * y + b  # bar top edge
        label = _nearest_label(x + w / 2, labels)
        series.setdefault(fill, []).append((label, round(value, 1)))
    return series


def _point_series(elements: dict, axes: dict, labels) -> Dict[str, List[Tuple[str, float]]]:
    # Points use the right axis when one exists (mixed dual-axis charts);
    # otherwise the left axis (plain line graphs).
    axis = axes.get("right") or axes.get("left")
    if not axis:
        return {}
    a, b, _ = axis
    series: Dict[str, List[Tuple[str, float]]] = {}
    for c in elements["circle"]:
        cx, cy = _f(c, "cx"), _f(c, "cy")
        fill = c.get("fill", "")
        if cx is None or cy is None or not fill:
            continue
        series.setdefault(fill, []).append((_nearest_label(cx, labels), round(a * cy + b, 1)))

    if not series:  # polyline fallback when a chart has lines without markers
        for pl in elements["polyline"]:
            stroke = pl.get("stroke", "")
            pts = pl.get("points", "").replace(",", " ").split()
            if not stroke or len(pts) < 4:
                continue
            coords = [(float(pts[i]), float(pts[i + 1])) for i in range(0, len(pts) - 1, 2)]
            series[stroke] = [(_nearest_label(px, labels), round(a * py + b, 1)) for px, py in coords]
    return series


_PIE_PATH_RE = re.compile(
    r"M\s*([\d.\-]+)\s+([\d.\-]+)\s*L\s*([\d.\-]+)\s+([\d.\-]+)\s*"
    r"A\s*[\d.\-]+\s+[\d.\-]+\s+\S+\s+([01])\s+([01])\s+([\d.\-]+)\s+([\d.\-]+)\s*Z"
)


def _pie_segments(elements: dict) -> Dict[Tuple[float, float], List[Tuple[str, float]]]:
    """{(cx, cy): [(fill, percent), ...]} computed from exact arc geometry."""
    pies: Dict[Tuple[float, float], List[Tuple[str, float]]] = {}
    for p in elements["path"]:
        m = _PIE_PATH_RE.match(p.get("d", "").strip())
        if not m:
            continue
        cx, cy, x1, y1, _large, sweep, x2, y2 = (float(m.group(i)) for i in (1, 2, 3, 4, 5, 6, 7, 8))
        a1 = math.atan2(y1 - cy, x1 - cx)
        a2 = math.atan2(y2 - cy, x2 - cx)
        delta = (a2 - a1) % (2 * math.pi) if sweep == 1 else (a1 - a2) % (2 * math.pi)
        pct = delta / (2 * math.pi) * 100
        pies.setdefault((round(cx), round(cy)), []).append((p.get("fill", ""), round(pct, 1)))
    return pies


# ── Public entry point ───────────────────────────────────────────────────────

def parse_chart_svg_reference(svg_text: str) -> Optional[str]:
    """
    Returns the REFERENCE DATA grading context computed exactly from the SVG,
    or None if the SVG doesn't match the expected generated-chart structure
    (caller then falls back to vision extraction).
    """
    elements = _collect_elements(svg_text)
    if elements is None:
        return None

    legend = _legend_map(elements)

    def name_of(colour: str, idx: int) -> str:
        return legend.get(colour, f"Series {idx + 1}")

    title = ""
    for t in elements["text"]:
        ty = _f(t, "y", 1e9)
        if t.get("font-weight") == "bold" and ty is not None and ty <= 50 and t["_content"]:
            title = t["_content"]
            break

    unit_notes = [t["_content"] for t in elements["text"]
                  if t.get("font-style") == "italic" and t["_content"]]
    axis_titles = [t["_content"] for t in elements["text"]
                   if "transform" in t and t["_content"]]

    lines_out: List[str] = []

    pies = _pie_segments(elements)
    if pies:
        bold_labels = [(_f(t, "x", 0.0), t["_content"]) for t in elements["text"]
                       if t.get("font-weight") == "bold" and t["_content"]]
        for i, (center, segs) in enumerate(sorted(pies.items())):
            pie_name = (min(bold_labels, key=lambda bl: abs(bl[0] - center[0]))[1]
                        if bold_labels else f"Pie {i + 1}")
            parts = ", ".join(f"{name_of(fill, j)}={_fmt(pct)}%" for j, (fill, pct) in enumerate(segs))
            lines_out.append(f"{pie_name}: {parts}")
        body = "\n".join(lines_out)
        header = f"CHART TITLE: {title}\n" if title else ""
        return (
            "REFERENCE DATA FOR GRADING (computed EXACTLY from the chart's SVG source — "
            "these values are precise ground truth, NOT estimates; every axis label and "
            "data mark was read directly from the chart's own markup):\n\n"
            f"{header}CHART TYPE: pie chart(s)\n\n"
            "SEGMENT PERCENTAGES (exact):\n"
            f"{body}\n\n"
            "DATA ACCURACY CHECKING INSTRUCTION:\n"
            "The reference values above are exact. Accept stated values within ±15% "
            "tolerance for rounding. Only flag as data error if a value differs by more "
            "than 15% from its reference value."
        )

    axes = _build_axes(elements)
    if "left" not in axes and "right" not in axes:
        return None

    baseline = max(axes["gridline_ys"])
    labels = _x_labels(elements, baseline)
    canvas_w = elements["_width"] or 760.0

    bars = _bar_series(elements, axes, labels, canvas_w)
    points = _point_series(elements, axes, labels)
    if not bars and not points:
        return None

    def emit(series: Dict[str, List[Tuple[str, float]]], axis_key: str, kind: str):
        unit = axes.get(axis_key, ("", "", ""))[2] if axis_key in axes else ""
        for i, (colour, vals) in enumerate(series.items()):
            pretty = ", ".join(f"{lbl}={_fmt(v)}{unit}" for lbl, v in vals)
            axis_note = " [right axis]" if axis_key == "right" and "right" in axes else ""
            lines_out.append(f"{name_of(colour, i)} ({kind}){axis_note}: {pretty}")

    emit(bars, "left", "bars")
    emit(points, "right" if "right" in axes else "left", "line/points")

    meta = []
    if title:
        meta.append(f"CHART TITLE: {title}")
    if unit_notes:
        meta.append(f"UNIT NOTE: {'; '.join(unit_notes)}")
    if axis_titles:
        meta.append(f"AXIS TITLES: {'; '.join(axis_titles)}")
    if "left" in axes and axes.get("left_labels"):
        lv = axes["left_labels"]
        meta.append(f"LEFT Y-AXIS GRIDLINE VALUES: {', '.join(_fmt(v) for v in lv)}")
    if "right" in axes and axes.get("right_labels"):
        rv = axes["right_labels"]
        meta.append(f"RIGHT Y-AXIS GRIDLINE VALUES: {', '.join(_fmt(v) + '%' if axes['right'][2] else _fmt(v) for v in rv)}")
    if labels:
        meta.append(f"X-AXIS LABELS: {', '.join(lb for _, lb in labels)}")

    return (
        "REFERENCE DATA FOR GRADING (computed EXACTLY from the chart's SVG source — "
        "these values are precise ground truth, NOT estimates; every axis label and "
        "data mark was read directly from the chart's own markup):\n\n"
        + "\n".join(meta)
        + "\n\nREFERENCE DATA (exact values per series):\n"
        + "\n".join(lines_out)
        + "\n\nDATA ACCURACY CHECKING INSTRUCTION:\n"
          "The reference values above are exact. Accept stated values within ±15% "
          "tolerance for rounding. Only flag as data error if a value differs by more "
          "than 15% from its reference value."
    )
