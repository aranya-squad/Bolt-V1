import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/shared/store/authStore";
import { AmbientScene } from "@/shared/ui/AmbientScene";
import { GlassCard } from "@/shared/ui/GlassCard";
import { BoltButton } from "@/shared/ui/BoltButton";
import { Page } from "@/shared/ui/Page";

const ONBOARDED_KEY = "bolt_onboarded";

const STEPS = [
  {
    title: "WELCOME, RECRUIT",
    body: (name: string) =>
      `Good to have you, ${name}. Bolt Abacus is your training ground — we'll turn you into a mental-math machine, one mission at a time.`,
    cta: "NEXT",
  },
  {
    title: "HOW IT WORKS",
    body: () =>
      "Each level is a mission. Complete Classwork to unlock the next level. When you're ready to push yourself, hit the Practice Arena for Time Attack, Zen, and more.",
    cta: "NEXT",
  },
  {
    title: "READY FOR LAUNCH",
    body: () =>
      "Your teacher has set up your class. Head to Level 1 and begin your first mission. Focus, speed, accuracy — that's the Bolt way.",
    cta: "START LEVEL 1",
  },
] as const;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState(0);

  const displayName = user?.profile?.display_name ?? user?.profile?.call_sign ?? "Recruit";
  const current = STEPS[step];

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      localStorage.setItem(ONBOARDED_KEY, "1");
      navigate("/learn");
    }
  }

  return (
    <>
      <AmbientScene accents={["yellow", "purple", "blue"]} />
      <Page>
        <div
          style={{
            minHeight: "70vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--s-xl)",
          }}
        >
          {/* Step dots */}
          <div style={{ display: "flex", gap: 8 }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === step ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === step ? "var(--y-bolt)" : "rgba(255,255,255,0.15)",
                  transition: "width 250ms var(--ease-out), background 250ms",
                }}
              />
            ))}
          </div>

          <GlassCard variant="default" style={{ maxWidth: 480, width: "100%", padding: "var(--s-3xl)" }}>
            <h1
              className="t-h2"
              style={{ color: "var(--y-bolt)", marginBottom: "var(--s-lg)", textAlign: "center" }}
            >
              {current.title}
            </h1>
            <p
              className="t-body"
              style={{ color: "var(--fg-sand)", textAlign: "center", marginBottom: "var(--s-xl)", lineHeight: 1.7 }}
            >
              {current.body(displayName)}
            </p>

            <BoltButton
              variant="primary"
              size="lg"
              style={{ width: "100%" }}
              onClick={handleNext}
            >
              {current.cta}
            </BoltButton>
          </GlassCard>
        </div>
      </Page>
    </>
  );
}
