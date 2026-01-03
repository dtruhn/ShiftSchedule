import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";

type Violation = {
  id: string;
  assignmentKeys: string[];
};

type ViolationLinesOverlayProps = {
  /** All violations to show lines for */
  violations: Violation[];
  /** Whether lines should be visible */
  visible: boolean;
  /** Container element to scope pill lookups (optional, defaults to document) */
  containerRef?: React.RefObject<HTMLElement>;
};

type PillPosition = {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type Line = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

/**
 * Determines if a violation is an on-call rest violation
 * Format: rest-{clinicianId}-{dateISO}-{targetISO}-(before|after)-{offset}
 */
function isOnCallRestViolation(id: string): boolean {
  return id.startsWith("rest-");
}

/**
 * Determines if a violation is a same-location violation
 * Format: location-{clinicianId}-{dateISO}
 */
function isSameLocationViolation(id: string): boolean {
  return id.startsWith("location-");
}

/**
 * Determines if a violation is an overlapping times violation
 * Format: overlap-{clinicianId}-{dateISO}
 */
function isOverlapViolation(id: string): boolean {
  return id.startsWith("overlap-");
}

/**
 * For on-call rest violations, the first key(s) are on-call assignments,
 * and the remaining keys are conflicting assignments.
 * We want to connect each on-call pill to each conflicting pill.
 */
function getOnCallLines(
  violation: Violation,
  positions: Map<string, PillPosition>,
): Line[] {
  const lines: Line[] = [];
  const keys = violation.assignmentKeys;

  // Find the on-call keys (same dateISO as in the violation id)
  // On-call keys come first, then target date keys
  // Parse the violation id to get the on-call date
  const parts = violation.id.split("-");
  // rest-{clinicianId}-{dateISO}-{targetISO}-(before|after)-{offset}
  // The dateISO is the on-call date
  const onCallDateISO = parts[2]; // e.g., "2025-01-06"

  const onCallKeys: string[] = [];
  const conflictKeys: string[] = [];

  for (const key of keys) {
    // Key format: ${rowId}__${dateISO}__${clinicianId}
    const keyParts = key.split("__");
    const keyDateISO = keyParts[1];
    if (keyDateISO === onCallDateISO) {
      onCallKeys.push(key);
    } else {
      conflictKeys.push(key);
    }
  }

  // Draw line from each on-call pill to each conflict pill
  for (const onCallKey of onCallKeys) {
    const onCallPos = positions.get(onCallKey);
    if (!onCallPos) continue;

    for (const conflictKey of conflictKeys) {
      const conflictPos = positions.get(conflictKey);
      if (!conflictPos) continue;

      lines.push({
        id: `${violation.id}-${onCallKey}-${conflictKey}`,
        x1: onCallPos.x + onCallPos.width / 2,
        y1: onCallPos.y + onCallPos.height / 2,
        x2: conflictPos.x + conflictPos.width / 2,
        y2: conflictPos.y + conflictPos.height / 2,
      });
    }
  }

  return lines;
}

/**
 * For same-location violations, draw chain lines A → B → C
 * Sort keys by row order (if available) to ensure consistent ordering
 */
function getChainLines(
  violation: Violation,
  positions: Map<string, PillPosition>,
): Line[] {
  const lines: Line[] = [];
  const keys = violation.assignmentKeys;

  // Get positions for all keys that exist
  const orderedPositions: Array<{ key: string; pos: PillPosition }> = [];
  for (const key of keys) {
    const pos = positions.get(key);
    if (pos) {
      orderedPositions.push({ key, pos });
    }
  }

  // Sort by vertical position (row) first, then horizontal (date)
  orderedPositions.sort((a, b) => {
    if (Math.abs(a.pos.y - b.pos.y) > 10) {
      return a.pos.y - b.pos.y;
    }
    return a.pos.x - b.pos.x;
  });

  // Draw chain: A → B → C
  for (let i = 0; i < orderedPositions.length - 1; i++) {
    const from = orderedPositions[i];
    const to = orderedPositions[i + 1];
    lines.push({
      id: `${violation.id}-chain-${i}`,
      x1: from.pos.x + from.pos.width / 2,
      y1: from.pos.y + from.pos.height / 2,
      x2: to.pos.x + to.pos.width / 2,
      y2: to.pos.y + to.pos.height / 2,
    });
  }

  return lines;
}

export default function ViolationLinesOverlay({
  violations,
  visible,
  containerRef,
}: ViolationLinesOverlayProps) {
  const [lines, setLines] = useState<Line[]>([]);

  const calculateLines = useCallback(() => {
    if (!visible || violations.length === 0) {
      setLines([]);
      return;
    }

    // Collect all unique assignment keys
    const allKeys = new Set<string>();
    for (const violation of violations) {
      for (const key of violation.assignmentKeys) {
        allKeys.add(key);
      }
    }

    // Find all pill elements and their positions
    const container = containerRef?.current ?? document;
    const positions = new Map<string, PillPosition>();

    for (const key of allKeys) {
      const element = container.querySelector(
        `[data-assignment-key="${key}"]`,
      ) as HTMLElement | null;
      if (element) {
        const rect = element.getBoundingClientRect();
        // Use viewport coordinates directly since SVG is fixed positioned
        positions.set(key, {
          key,
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        });
      }
    }

    // Calculate lines for each violation
    const newLines: Line[] = [];
    for (const violation of violations) {
      if (isOnCallRestViolation(violation.id)) {
        // On-call rest: connect on-call pill to each conflicting pill
        newLines.push(...getOnCallLines(violation, positions));
      } else if (isSameLocationViolation(violation.id)) {
        // Same-location: draw chain lines A → B → C
        newLines.push(...getChainLines(violation, positions));
      } else if (isOverlapViolation(violation.id)) {
        // Overlapping times: draw chain lines A → B → C
        newLines.push(...getChainLines(violation, positions));
      } else {
        // Default: chain lines
        newLines.push(...getChainLines(violation, positions));
      }
    }

    setLines(newLines);
  }, [visible, violations, containerRef]);

  // Calculate lines on mount and when dependencies change
  useEffect(() => {
    calculateLines();

    // Recalculate on window resize and scroll
    const handleResize = () => calculateLines();
    const handleScroll = () => calculateLines();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [calculateLines]);

  if (!visible || lines.length === 0) {
    return null;
  }

  return createPortal(
    <svg
      className="pointer-events-none fixed inset-0 z-[1000]"
      style={{ width: "100vw", height: "100vh", overflow: "visible" }}
    >
      <defs>
        <marker
          id="violation-line-end"
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <circle cx="5" cy="5" r="3" fill="#ef4444" />
        </marker>
      </defs>
      {lines.map((line) => (
        <line
          key={line.id}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="#ef4444"
          strokeWidth="2"
          strokeDasharray="6 4"
          strokeLinecap="round"
          markerEnd="url(#violation-line-end)"
          markerStart="url(#violation-line-end)"
        />
      ))}
    </svg>,
    document.body,
  );
}
