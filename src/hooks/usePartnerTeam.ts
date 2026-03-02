import * as React from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export type PartnerTeamRole = "admin" | "manager" | "viewer";

export type UsePartnerTeamResult = {
  loading: boolean;
  isTeamMember: boolean;
  teamRole: PartnerTeamRole | null;
};

export function usePartnerTeam(): UsePartnerTeamResult {
  const [loading, setLoading] = React.useState(true);
  const [isTeamMember, setIsTeamMember] = React.useState(false);
  const [teamRole, setTeamRole] = React.useState<PartnerTeamRole | null>(null);

  const refresh = React.useCallback(async (u = auth.currentUser) => {
    try {
      if (!u) {
        setIsTeamMember(false);
        setTeamRole(null);
        return;
      }

      let token = await u.getIdToken();

      const fetchMe = async (t: string) =>
        fetch("/api/partner/me", {
          headers: { Authorization: `Bearer ${t}` },
          cache: "no-store",
        });

      let res = await fetchMe(token);
      if (res.status === 403) {
        token = await u.getIdToken(true);
        res = await fetchMe(token);
      }

      if (!res.ok) {
        setIsTeamMember(false);
        setTeamRole(null);
        return;
      }

      const data = (await res.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      const kind = typeof data?.kind === "string" ? data.kind : "";
      const tr = data?.teamRole;
      const nextRole: PartnerTeamRole | null =
        tr === "admin" || tr === "manager" || tr === "viewer" ? tr : null;

      if (kind === "team") {
        setIsTeamMember(true);
        setTeamRole(nextRole);
        return;
      }

      setIsTeamMember(false);
      setTeamRole(null);
    } catch {
      setIsTeamMember(false);
      setTeamRole(null);
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;

    const start = async () => {
      await refresh();
      if (!mounted) return;
      setLoading(false);
    };

    start();

    const unsub = onAuthStateChanged(auth, (u) => {
      refresh(u || undefined).finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [refresh]);

  return { loading, isTeamMember, teamRole };
}
