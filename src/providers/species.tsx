import { useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { deriveDistricts, derivePlaces, type Species } from "@contracts/species";

const EMPTY: Species[] = [];

/**
 * Tür kataloğu artık veritabanından gelir (trpc.species.list).
 * Tüm sayfalar aynı sorguyu paylaşır; react-query önbelleği sayesinde tek kez yüklenir.
 */
export function useSpecies() {
  const q = trpc.species.list.useQuery(undefined, {
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const species = q.data ?? EMPTY;
  const byId = useMemo(() => new Map(species.map((s) => [s.id, s])), [species]);
  const districts = useMemo(() => deriveDistricts(species), [species]);
  const places = useMemo(() => derivePlaces(species), [species]);
  return {
    species,
    byId,
    getSpeciesById: (id: string) => byId.get(id),
    districts,
    places,
    isLoading: q.isLoading,
    isError: q.isError,
  };
}
