import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/shared/store/authStore";
import { Page } from "@/shared/ui/Page";
import { BoltButton } from "@/shared/ui/BoltButton";

// Wave 1 placeholder so the TEACHER role has a home behind the RBAC gate.
// The real instructor portal (batches, roster, live sessions) lands in Wave 3.
export default function TeacherDashboardPage() {
  const navigate = useNavigate();
  const handleLogout = () => {
    useAuthStore.getState().logout();
    navigate("/login");
  };

  return (
    <Page>
      <h1 className="t-h1" style={{ color: "var(--y-bolt)" }}>
        INSTRUCTOR COMMAND
      </h1>
      <p className="t-body-md" style={{ color: "var(--fg-sand)", marginTop: 12, maxWidth: 480 }}>
        Your teacher portal is on the way. Batch creation, the student roster, and live sessions
        land in a later wave.
      </p>
      <BoltButton variant="ghost" size="md" style={{ marginTop: 24 }} onClick={handleLogout}>
        LOG OUT
      </BoltButton>
    </Page>
  );
}
