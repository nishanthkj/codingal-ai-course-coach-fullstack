type Input = { student: any; courses: any[]; attempts: any[] };
export type Recommendation = {
  id: string;
  title: string;
  reasonFeatures: Record<string, number | string>;
  confidence: number;
  alternatives: { id: string; title: string; reason: string }[];
  method: "heuristic";
};
export function recommendNext(input: Input): Recommendation {
  const { courses } = input;
  const by = [...courses].sort((a, b) => (a.progress ?? 0) - (b.progress ?? 0));
  const chosen = by[0];
  const reason = {
    progress_inverse: 100 - (chosen?.progress ?? 0),
    activity_gap_days: 5,
  };
  const confidence = Math.min(
    1,
    ((reason.progress_inverse as number) / 100) * 0.7 + 0.3
  );
  return {
    id: chosen?.id ?? "unknown",
    title: `Continue "${chosen?.name ?? "Course"}" — next lesson`,
    reasonFeatures: reason,
    confidence,
    alternatives: by
      .slice(1, 3)
      .map((c) => ({
        id: c.id,
        title: `Work on "${c.name}"`,
        reason: "Near in priority",
      })),
    method: "heuristic",
  };
}
