import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export default function AICourseCoachPanel() {
  const [recData, setRecData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshRecommendation();
  }, []);

  async function refreshRecommendation() {
    setLoading(true);
    try {
      const res = await api.get("/api/students/recommendation/");
      setRecData(res.data);
    } catch (err) {
      try {
        const r = await fetch("/data/recommendation.json");
        if (!r.ok) throw new Error(`/data/recommendation.json ${r.status}`);
        const data = await r.json();
        setRecData(data);
      } catch (err2) {
        console.error(err2);
        setRecData(null);
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card className="p-6 text-sm text-gray-500 dark:text-gray-400">
        Loading AI recommendations...
      </Card>
    );
  }

  if (!recData) {
    return (
      <Card className="p-6 text-sm text-gray-500 dark:text-gray-400">
        No recommendations available.
      </Card>
    );
  }

  const { recommendation, confidence, reason_features, alternatives } = recData;

  return (
    <Card className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-semibold">AI Course Coach</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Personalized, data-driven course recommendation.
        </p>
      </div>

      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        {/* Next Recommendation */}
        <div>
          <span className="font-medium">Next Recommendation:</span>
          <p className="mt-1 text-indigo-600 dark:text-indigo-400">
            {recommendation?.title ?? "—"}
          </p>
        </div>

        {/* Why / Reason Features */}
        <div>
          <span className="font-medium">Why:</span>
          <ul className="mt-1 list-disc list-inside text-gray-600 dark:text-gray-400">
            {reason_features ? (
              Object.entries(reason_features).map(([key, value]) => (
                <li key={key}>
                  {key}: <span className="text-indigo-500">{String(value)}</span>
                </li>
              ))
            ) : (
              <li>No reason data</li>
            )}
          </ul>
        </div>

        {/* Confidence */}
        <div>
          <span className="font-medium">Confidence:</span>{" "}
          <span className="text-green-600 dark:text-green-400 font-semibold">
            {confidence?.toFixed(2) ?? "0.00"}
          </span>
        </div>

        {/* Alternatives */}
        {alternatives?.length > 0 && (
          <div>
            <span className="font-medium">Alternatives:</span>
            <ul className="mt-1 list-disc list-inside text-gray-600 dark:text-gray-400">
              {alternatives.slice(0, 2).map((alt: any) => (
                <li key={alt.id}>{alt.title}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
        <Button onClick={refreshRecommendation} size="sm" variant="outline">
          Refresh Recommendation
        </Button>
      </div>
    </Card>
  );
}
