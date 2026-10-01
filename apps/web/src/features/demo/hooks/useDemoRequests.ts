import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDemoRequests,
  updateDemoRequest,
  submitDemoRequest,
  type DemoStatus,
  type SubmitDemoPayload,
} from "@/features/demo/lib/demoApi";

const QUERY_KEY = "demo_requests";

/** Submit a new demo request (public, no auth required) */
export function useSubmitDemo() {
  return useMutation({
    mutationFn: (payload: SubmitDemoPayload) => submitDemoRequest(payload),
  });
}

/** Fetch all demo requests — admin only. Auto-refetches every 30s. */
export function useDemoRequests(statusFilter?: DemoStatus | "all") {
  return useQuery({
    queryKey: [QUERY_KEY, statusFilter ?? "all"],
    queryFn: () => getDemoRequests(statusFilter),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

/** Update status or notes for a demo request — admin only. */
export function useUpdateDemoRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: { status?: DemoStatus; notes?: string };
    }) => updateDemoRequest(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
