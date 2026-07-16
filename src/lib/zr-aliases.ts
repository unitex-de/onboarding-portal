import { supabase } from "@/lib/supabase";

export type LearnedAlias = {
  alias: string;
  liefNr: string | null;
  kanoname: string | null;
  isNonZr: boolean;
};

export async function fetchLearnedAliases(): Promise<LearnedAlias[]> {
  const { data, error } = await supabase
    .from("zr_alias_mappings")
    .select("alias, lief_nr, kanoname, is_non_zr");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    alias: r.alias,
    liefNr: r.lief_nr,
    kanoname: r.kanoname,
    isNonZr: r.is_non_zr,
  }));
}

/** Speichert/aktualisiert eine gelernte Alias-Zuordnung (Rohname -> Lieferant),
 * entsteht beim Bestätigen einer Review-Zeile. Portiert aus database.py::save_alias. */
export async function saveLearnedAlias(params: {
  alias: string;
  liefNr: string | null;
  kanoname: string | null;
  isNonZr: boolean;
  confirmedBy?: string;
}) {
  const { error } = await supabase.from("zr_alias_mappings").upsert(
    {
      alias: params.alias.trim(),
      lief_nr: params.liefNr,
      kanoname: params.kanoname,
      is_non_zr: params.isNonZr,
      confirmed_by: params.confirmedBy ?? "user",
      confirmed_at: new Date().toISOString(),
    },
    { onConflict: "alias" }
  );
  if (error) throw error;
}

export async function deleteLearnedAlias(id: number) {
  const { error } = await supabase.from("zr_alias_mappings").delete().eq("id", id);
  if (error) throw error;
}
