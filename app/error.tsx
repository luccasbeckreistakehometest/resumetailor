"use client";

import { useEffect } from "react";
import { ErrorScreen } from "./ErrorScreen";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <ErrorScreen kind="error" onRetry={() => retry()} digest={error.digest} />;
}
