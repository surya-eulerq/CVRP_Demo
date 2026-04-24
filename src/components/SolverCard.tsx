// src/components/SolverCard.tsx

import type { ReactNode } from "react";

interface SolverCardProps {
    title: string;

    accent: "orange" | "teal";

    objective?: number;

    solveTime?: number;

    children?: ReactNode;

    assignments?: ReactNode;

    rightAction?: ReactNode;
}

export default function SolverCard({
    title,
    accent,
    objective,
    solveTime,
    children,
    assignments,
    rightAction,
}: SolverCardProps) {
    const accentStyles = {
        orange: {
            dot: "bg-orange-400",

            value: "text-orange-400",

            border: "border-orange-500/20",

            bg: "bg-orange-500/10",
        },

        teal: {
            dot: "bg-teal-400",

            value: "text-teal-400",

            border: "border-teal-500/20",

            bg: "bg-teal-500/10",
        },
    };

    const styles = accentStyles[accent];

    return (
        <div
            className="
        h-full
        rounded-2xl
        border border-[#13213a]
        bg-[#081225]
        overflow-hidden
        flex flex-col
      "
        >
            {/* ===================================== */}
            {/* HEADER */}
            {/* ===================================== */}

            <div
                className="
          h-16
          border-b border-[#13213a]
          px-5
          flex items-center justify-between
        "
            >
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${styles.dot}`} />

                    <h3 className="text-sm font-semibold text-white">
                        {title}
                    </h3>
                </div>

                {rightAction}
            </div>

            {/* ===================================== */}
            {/* METRICS */}
            {/* ===================================== */}

            <div
                className="
          h-20
          border-b border-[#13213a]
          grid grid-cols-2
        "
            >
                {/* Objective */}
                <div
                    className="
            px-5
            flex flex-col justify-center
            border-r border-[#13213a]
          "
                >
                    <span className="text-[10px] uppercase tracking-widest text-[#64748b]">
                        Objective
                    </span>

                    <span
                        className={`text-2xl font-bold mt-1 ${styles.value}`}
                    >
                        {objective !== undefined
                            ? objective.toFixed(2)
                            : "--"}
                    </span>
                </div>

                {/* Solve Time */}
                <div className="px-5 flex flex-col justify-center">
                    <span className="text-[10px] uppercase tracking-widest text-[#64748b]">
                        Solve Time
                    </span>

                    <span className="text-2xl font-bold mt-1 text-white">
                        {solveTime !== undefined
                            ? `${solveTime} ms`
                            : "--"}
                    </span>
                </div>
            </div>

            {/* ===================================== */}
            {/* MAP CONTENT */}
            {/* ===================================== */}

            <div className="flex-1 bg-[#020817] overflow-hidden">
                {children}
            </div>

            {/* ===================================== */}
            {/* ASSIGNMENTS */}
            {/* ===================================== */}

            <div
                className="
          h-[180px]
          border-t border-[#13213a]
          bg-[#050d1c]
          p-4
          overflow-y-auto
        "
            >
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-white">
                        Assignments
                    </h4>

                    <div
                        className={`
              px-3 py-1 rounded-md text-xs
              ${styles.bg}
              ${styles.border}
              border
              ${styles.value}
            `}
                    >
                        Routes
                    </div>
                </div>

                {assignments ? (
                    assignments
                ) : (
                    <div className="text-sm text-[#64748b]">
                        No assignments available
                    </div>
                )}
            </div>
        </div>
    );
}