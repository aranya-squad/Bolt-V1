import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMe } from "@/shared/api/queries/useMe";
import { useAvatarPresets, usePatchProfile } from "@/shared/api/queries/useProfile";
import { useXpProgress } from "@/shared/api/queries/useXpProgress";
import { useAuthStore } from "@/shared/store/authStore";
import { Page } from "@/shared/ui/Page";
import { BoltButton } from "@/shared/ui/BoltButton";
import { XpProgressBar } from "@/shared/ui/XpProgressBar";
import { Skeleton } from "@/shared/ui/Skeleton";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { data: me, isLoading } = useMe();
  const { data: presetsData } = useAvatarPresets();
  const { data: xpData } = useXpProgress();
  const { mutate: patchProfile } = usePatchProfile();

  const [displayName, setDisplayName] = useState<string>("");
  const [nameEdited, setNameEdited] = useState(false);

  const currentDisplayName = me?.profile?.display_name ?? "";
  const currentAvatarUrl = me?.profile?.avatar_url ?? "";

  const handleNameChange = (v: string) => {
    setDisplayName(v);
    setNameEdited(true);
  };

  const handleSaveName = () => {
    const name = nameEdited ? displayName : currentDisplayName;
    if (!name.trim()) return;
    patchProfile({ display_name: name.trim() });
    setNameEdited(false);
  };

  const handleSelectAvatar = (url: string) => {
    patchProfile({ avatar_url: url });
  };

  const handleLogout = () => {
    useAuthStore.getState().logout();
    navigate("/login");
  };

  if (isLoading) {
    return (
      <Page>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-lg)", maxWidth: 480 }}>
          <Skeleton height={32} width="60%" />
          <Skeleton height={48} />
          <Skeleton height={120} />
        </div>
      </Page>
    );
  }

  const presets = presetsData?.presets ?? [];
  const editedName = nameEdited ? displayName : currentDisplayName;

  return (
    <Page>
      <h1 className="t-h1" style={{ color: "var(--y-bolt)", marginBottom: "var(--s-xl)" }}>
        PROFILE
      </h1>

      <div style={{ maxWidth: 480 }}>
        {/* Display name */}
        <div style={{ marginBottom: "var(--s-xl)" }}>
          <div
            style={{
              fontFamily: "var(--font-label)",
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--fg-sand)",
              marginBottom: 8,
            }}
          >
            Display Name
          </div>
          <div style={{ display: "flex", gap: "var(--s-sm)" }}>
            <input
              type="text"
              value={editedName}
              onChange={(e) => handleNameChange(e.target.value)}
              className="field"
              style={{ flex: 1 }}
              maxLength={64}
            />
            <BoltButton
              variant="primary"
              size="md"
              onClick={handleSaveName}
              disabled={!nameEdited || !editedName.trim()}
            >
              SAVE
            </BoltButton>
          </div>
        </div>

        {/* Avatar grid */}
        {presets.length > 0 && (
          <div style={{ marginBottom: "var(--s-xl)" }}>
            <div
              style={{
                fontFamily: "var(--font-label)",
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--fg-sand)",
                marginBottom: 8,
              }}
            >
              Avatar
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: "var(--s-sm)",
              }}
            >
              {presets.map((url) => (
                <button
                  key={url}
                  onClick={() => handleSelectAvatar(url)}
                  style={{
                    padding: 2,
                    borderRadius: "var(--r-xl)",
                    border: currentAvatarUrl === url
                      ? "2px solid var(--y-bolt)"
                      : "2px solid transparent",
                    boxShadow: currentAvatarUrl === url
                      ? "0 0 12px rgba(250,204,21,0.5)"
                      : "none",
                    background: "none",
                    cursor: "pointer",
                    transition: "border-color 150ms, box-shadow 150ms",
                  }}
                >
                  <img
                    src={url}
                    alt="avatar preset"
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      borderRadius: "var(--r-lg)",
                      display: "block",
                      objectFit: "cover",
                      background: "var(--bg-ash)",
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* XP progress */}
        <div style={{ marginBottom: "var(--s-xl)" }}>
          <XpProgressBar
            currentXp={xpData?.total_xp ?? 0}
            currentLevelThreshold={xpData?.current_level_threshold ?? 0}
            nextLevelThreshold={xpData?.next_level_threshold ?? 0}
          />
        </div>

        {/* Logout */}
        <BoltButton
          variant="ghost"
          size="md"
          style={{ width: "100%" }}
          onClick={handleLogout}
        >
          LOG OUT
        </BoltButton>
      </div>
    </Page>
  );
}
