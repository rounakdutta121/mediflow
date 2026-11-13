"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  width?: number | string;
  className?: string;
  sticky?: boolean;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  empty?: ReactNode;
  className?: string;
  /** Virtualize when row count exceeds this (default 40). */
  virtualizeAbove?: number;
  /** Max viewport height for scroll body. */
  maxHeight?: number | string;
  estimateRowHeight?: number;
  onRowClick?: (row: T) => void;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty = "No records found",
  className,
  virtualizeAbove = 40,
  maxHeight = "min(70vh, 720px)",
  estimateRowHeight = 52,
  onRowClick,
}: DataTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const useVirtual = rows.length > virtualizeAbove;

  useEffect(() => setReady(true), []);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 12,
    enabled: useVirtual && ready,
  });

  const colTemplate = useMemo(
    () =>
      columns
        .map((c) =>
          typeof c.width === "number"
            ? `${c.width}px`
            : c.width || "minmax(8rem, 1fr)"
        )
        .join(" "),
    [columns]
  );

  const minWidth = useMemo(() => {
    const sum = columns.reduce((acc, c) => {
      if (typeof c.width === "number") return acc + c.width;
      return acc + 140;
    }, 0);
    return Math.max(sum, 640);
  }, [columns]);

  const renderRow = useCallback(
    (row: T, index: number, style?: React.CSSProperties) => (
      <div
        key={rowKey(row, index)}
        role="row"
        style={{
          ...style,
          display: "grid",
          gridTemplateColumns: colTemplate,
          minWidth,
        }}
        className={cn(
          "border-b border-[var(--border)] transition-colors",
          onRowClick && "cursor-pointer hover:bg-[var(--surface-muted)]",
          index % 2 === 1 && "bg-[color-mix(in_oklab,var(--surface-muted)_35%,transparent)]"
        )}
        onClick={onRowClick ? () => onRowClick(row) : undefined}
      >
        {columns.map((col) => (
          <div
            key={col.id}
            role="cell"
            className={cn(
              "flex items-center px-3 py-3 text-sm text-[var(--foreground)] sm:px-4",
              col.className
            )}
          >
            {col.cell(row, index)}
          </div>
        ))}
      </div>
    ),
    [colTemplate, columns, minWidth, onRowClick, rowKey]
  );

  if (rows.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-32 items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--muted)]",
          className
        )}
      >
        {empty}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]",
        className
      )}
    >
      <div
        ref={parentRef}
        className="overflow-auto overscroll-contain"
        style={{ maxHeight }}
        role="table"
        aria-rowcount={rows.length}
      >
        <div
          role="rowgroup"
          className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface-muted)] backdrop-blur-md"
          style={{ minWidth }}
        >
          <div
            role="row"
            className="grid"
            style={{ gridTemplateColumns: colTemplate, minWidth }}
          >
            {columns.map((col) => (
              <div
                key={col.id}
                role="columnheader"
                className={cn(
                  "px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)] sm:px-4",
                  col.className
                )}
              >
                {col.header}
              </div>
            ))}
          </div>
        </div>

        {useVirtual ? (
          <div
            role="rowgroup"
            style={{ height: virtualizer.getTotalSize(), position: "relative", minWidth }}
          >
            {virtualizer.getVirtualItems().map((vRow) => {
              const row = rows[vRow.index];
              return renderRow(row, vRow.index, {
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${vRow.size}px`,
                transform: `translateY(${vRow.start}px)`,
              });
            })}
          </div>
        ) : (
          <div role="rowgroup" style={{ minWidth }}>
            {rows.map((row, index) => renderRow(row, index))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Scroll shell for legacy HTML tables — keeps pages responsive at any width/row count. */
export function TableScroll({
  children,
  className,
  maxHeight = "min(70vh, 720px)",
}: {
  children: ReactNode;
  className?: string;
  maxHeight?: number | string;
}) {
  return (
    <div
      className={cn(
        "overflow-auto overscroll-contain rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]",
        className
      )}
      style={{ maxHeight }}
    >
      <table className="mf-table w-full min-w-[640px] border-collapse text-left">
        {children}
      </table>
    </div>
  );
}
