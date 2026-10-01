import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { partiesApi, PartyPayload, PartyRecord } from "@/core/api/parties";

export function useParties(params?: {
  type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["api-parties", params],
    queryFn: () => partiesApi.listParties(params),
    staleTime: 30000,
  });
}

export function useParty(id: string) {
  return useQuery({
    queryKey: ["api-party", id],
    queryFn: () => partiesApi.getParty(id),
    enabled: !!id,
  });
}

export function useCreateParty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PartyPayload) => partiesApi.createParty(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-parties"] });
      queryClient.invalidateQueries({ queryKey: ["parties"] });
    },
  });
}

export function useUpdateParty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<PartyPayload> }) =>
      partiesApi.updateParty(id, payload),
    onSuccess: (data: PartyRecord) => {
      queryClient.invalidateQueries({ queryKey: ["api-parties"] });
      queryClient.invalidateQueries({ queryKey: ["api-party", data.id] });
      queryClient.invalidateQueries({ queryKey: ["parties"] });
    },
  });
}
