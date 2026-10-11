"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics-client";
import type { AnalyticsEventName } from "@/lib/validation/schemas";

export function TrackOnMount({ name, properties }: { name: AnalyticsEventName; properties?: Record<string, string | number | boolean> }) {
  const key = JSON.stringify(properties ?? {});
  useEffect(() => {
    track(name, JSON.parse(key));
  }, [name, key]);
  return null;
}
