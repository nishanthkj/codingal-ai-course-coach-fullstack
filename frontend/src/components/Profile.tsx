import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from "chart.js";
import { Line, Bar, Pie, Doughnut } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

type Profile = {
  id: number;
  full_name?: string;
  email?: string;
  username?: string;
  bio?: string;
  joined_at?: string;
  lessons_completed?: number;
  total_lessons?: number;
  accuracy_rate?: number;
};

type Attempt = {
  id: number;
  lesson?: number | null;
  correctness?: number | string | null;
  duration_sec?: number | string | null;
  timestamp?: string | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [pRes, aRes] = await Promise.all([
          api.get("/api/profile/").catch(() => null),
          api.get("/api/attempts/").catch(() => null),
        ]);
        if (!mounted) return;
        if (pRes && pRes.data) setProfile(pRes.data);
        if (aRes && Array.isArray(aRes.data)) setAttempts(aRes.data);
        else if (aRes && aRes.data?.results) setAttempts(aRes.data.results);
      } catch (err) {
        setError("Failed to load profile or attempt data");
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const attemptsByDay = React.useMemo(() => {
    const map = new Map<string, number>();
    attempts.forEach((a) => {
      const ts = a.timestamp ? new Date(a.timestamp) : null;
      const day = ts ? ts.toISOString().slice(0, 10) : "unknown";
      map.set(day, (map.get(day) || 0) + 1);
    });
    const labels = Array.from(map.keys()).sort();
    const data = labels.map((l) => map.get(l) ?? 0);
    return { labels, data };
  }, [attempts]);

  const correctnessDistribution = React.useMemo(() => {
    let right = 0;
    let wrong = 0;
    attempts.forEach((a) => {
      if (a.correctness === 1 || a.correctness === "1") right += 1;
      else wrong += 1;
    });
    return { labels: ["Correct", "Incorrect"], data: [right, wrong] };
  }, [attempts]);

  const avgDurationPerLesson = React.useMemo(() => {
    const map = new Map<number | string, { total: number; count: number }>();
    attempts.forEach((a) => {
      const lid = a.lesson ?? "unknown";
      const dur = typeof a.duration_sec === "number" ? a.duration_sec : Number(a.duration_sec) || 0;
      const cur = map.get(lid) ?? { total: 0, count: 0 };
      cur.total += dur;
      cur.count += 1;
      map.set(lid, cur);
    });
    const labels = Array.from(map.keys()).map((k) => String(k));
    const data = labels.map((k) => {
      const v = map.get(Number(k) as any) ?? map.get(k as any);
      return v && v.count ? Number((v.total / v.count).toFixed(1)) : 0;
    });
    return { labels, data };
  }, [attempts]);

  if (loading) return <div className="p-6">Loading profile...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow w-full lg:w-1/2">
          <h1 className="text-2xl font-semibold mb-2">Student Profile</h1>
          {profile && (
            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <div><strong>Name:</strong> {profile.full_name ?? profile.username}</div>
              <div><strong>Email:</strong> {profile.email ?? "-"}</div>
              <div><strong>Joined:</strong> {profile.joined_at ? new Date(profile.joined_at).toLocaleDateString() : "-"}</div>
              <div><strong>Lessons Completed:</strong> {profile.lessons_completed ?? 0} / {profile.total_lessons ?? 0}</div>
              <div><strong>Accuracy:</strong> {profile.accuracy_rate ? `${profile.accuracy_rate}%` : "-"}</div>
              {profile.bio && <div className="mt-2 italic">{profile.bio}</div>}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow w-full lg:w-1/2">
          <h2 className="text-sm font-medium mb-2">Overall Progress</h2>
          <Doughnut
            data={{
              labels: ["Completed", "Remaining"],
              datasets: [
                {
                  data: [profile?.lessons_completed ?? 0, (profile?.total_lessons ?? 0) - (profile?.lessons_completed ?? 0)],
                  backgroundColor: ["#4CAF50", "#E5E7EB"],
                },
              ],
            }}
            options={{
              plugins: {
                legend: { position: "bottom" },
              },
            }}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
          <h2 className="text-sm font-medium mb-2">Attempts Over Time</h2>
          <Line
            options={{ responsive: true, plugins: { legend: { display: false } } }}
            data={{ labels: attemptsByDay.labels, datasets: [{ label: "Attempts", data: attemptsByDay.data, borderColor: "#4F46E5" }] }}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
          <h2 className="text-sm font-medium mb-2">Correctness</h2>
          <Pie
            data={{ labels: correctnessDistribution.labels, datasets: [{ data: correctnessDistribution.data, backgroundColor: ["#10B981", "#EF4444"] }] }}
            options={{ plugins: { legend: { position: "bottom" } } }}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
          <h2 className="text-sm font-medium mb-2">Avg Duration (sec) per Lesson</h2>
          <Bar
            data={{ labels: avgDurationPerLesson.labels, datasets: [{ label: "Avg Sec", data: avgDurationPerLesson.data, backgroundColor: "#3B82F6" }] }}
            options={{ responsive: true, plugins: { legend: { display: false } } }}
          />
        </div>
      </div>
    </div>
  );
}
