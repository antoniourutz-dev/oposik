import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

export type ProfileStats = {
    commits: number;
    totalActualDuration: number;
    maxActualDuration: number;
};

export type ProfileRow = {
    id: string;
    commits: number;
    totalMs: number;
    avgMs: number;
    maxMs: number;
};

export const useAppProfiler = () => {
    const profilingEnabled = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return new URLSearchParams(window.location.search).get('profiling') === '1';
    }, []);

    const [profileRows, setProfileRows] = useState<ProfileRow[]>([]);
    const profileStatsRef = useRef<Map<string, ProfileStats>>(new Map());

    const handleProfilerRender = useCallback<React.ProfilerOnRenderCallback>(
        (id, _phase, actualDuration) => {
            if (!profilingEnabled) return;

            const existing = profileStatsRef.current.get(id) ?? {
                commits: 0,
                totalActualDuration: 0,
                maxActualDuration: 0
            };
            existing.commits += 1;
            existing.totalActualDuration += actualDuration;
            existing.maxActualDuration = Math.max(existing.maxActualDuration, actualDuration);
            profileStatsRef.current.set(id, existing);
        },
        [profilingEnabled]
    );

    useEffect(() => {
        if (!profilingEnabled || typeof window === 'undefined') return;
        (window as Window & { __korrikaProfileRows?: ProfileRow[] }).__korrikaProfileRows = profileRows;
    }, [profilingEnabled, profileRows]);

    useEffect(() => {
        if (!profilingEnabled) {
            setProfileRows([]);
            profileStatsRef.current.clear();
            return;
        }

        const intervalId = window.setInterval(() => {
            const rows = [...profileStatsRef.current.entries()]
                .map(([id, stats]) => ({
                    id,
                    commits: stats.commits,
                    totalMs: Number(stats.totalActualDuration.toFixed(4)),
                    avgMs: Number((stats.totalActualDuration / Math.max(stats.commits, 1)).toFixed(4)),
                    maxMs: Number(stats.maxActualDuration.toFixed(4))
                }))
                .sort((a, b) => b.totalMs - a.totalMs)
                .slice(0, 3);

            setProfileRows((prev) => {
                if (
                    prev.length === rows.length &&
                    prev.every((row, idx) => {
                        const candidate = rows[idx];
                        return (
                            row.id === candidate.id &&
                            row.commits === candidate.commits &&
                            row.totalMs === candidate.totalMs &&
                            row.avgMs === candidate.avgMs &&
                            row.maxMs === candidate.maxMs
                        );
                    })
                ) {
                    return prev;
                }
                return rows;
            });
        }, 1000);

        return () => window.clearInterval(intervalId);
    }, [profilingEnabled]);

    const renderWithProfiler = useCallback(
        (id: string, node: React.ReactElement) => {
            if (!profilingEnabled) return node;
            return (
                <React.Profiler id= { id } onRender = { handleProfilerRender } >
                    { node }
                    </React.Profiler>
      );
},
    [profilingEnabled, handleProfilerRender]
  );

return {
    profilingEnabled,
    profileRows,
    renderWithProfiler
};
};
