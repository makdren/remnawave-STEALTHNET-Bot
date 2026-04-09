import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Joyride,
  EVENTS,
  STATUS,
  Step,
  type Controls,
  type EventData,
  type TooltipRenderProps,
} from "react-joyride";
import { TourTooltip } from "./tour-tooltip";
import { api, type ClientTourStep, type PublicConfig } from "@/lib/api";
import { useCabinetConfig } from "@/contexts/cabinet-config";

interface DashboardTourProps {
  run: boolean;
  onComplete: () => void;
}

interface TourStepWithRoute extends Step {
  route?: string | null;
}

// ── Disabled-tab detection ─────────────────────────────────────────
// Maps data-tour attribute values AND cabinet routes to config checks.
// Returns true when the corresponding tab is DISABLED (hidden from user).

type ConfigCheck = (c: PublicConfig) => boolean;

const DISABLED_BY_TOUR_ATTR: Record<string, ConfigCheck> = {
  "custom-build": (c) => !c.customBuildConfig,
  "extra-options": (c) => !c.sellOptionsEnabled,
  "proxy": (c) => !c.showProxyEnabled,
  "singbox": (c) => !c.showSingboxEnabled,
  "gifts": (c) => !c.giftSubscriptionsEnabled,
};

const DISABLED_BY_ROUTE: Record<string, ConfigCheck> = {
  "/cabinet/custom-build": (c) => !c.customBuildConfig,
  "/cabinet/extra-options": (c) => !c.sellOptionsEnabled,
  "/cabinet/proxy": (c) => !c.showProxyEnabled,
  "/cabinet/singbox": (c) => !c.showSingboxEnabled,
  "/cabinet/gifts": (c) => !c.giftSubscriptionsEnabled,
};

/** Extract `data-tour` value from selectors like `[data-tour="subscription"]` */
function extractTourAttr(target: string): string | null {
  const m = target.match(/\[data-tour="([^"]+)"\]/);
  return m ? m[1] : null;
}

/** Returns true if the step targets a tab that is currently disabled in config. */
function isStepDisabled(step: TourStepWithRoute, config: PublicConfig): boolean {
  // Check by route
  if (step.route) {
    const routeCheck = DISABLED_BY_ROUTE[step.route];
    if (routeCheck?.(config)) return true;
  }
  // Check by data-tour attribute in the target selector
  const attr = extractTourAttr(step.target as string);
  if (attr) {
    const attrCheck = DISABLED_BY_TOUR_ATTR[attr];
    if (attrCheck?.(config)) return true;
  }
  return false;
}

/**
 * Waits for the React route transition to settle before resuming.
 * Uses a longer delay to let React Router fully mount the new route's
 * component tree — joyride's `targetWaitTimeout` then handles the element.
 */
function waitForRouteSettled(callback: () => void) {
  // Give React Router time to mount the new route's component tree.
  // 80ms was too short for heavier pages — 300ms is safer.
  requestAnimationFrame(() => {
    setTimeout(callback, 300);
  });
}

/**
 * If the target step points at [data-tour="floating-chat"],
 * dispatch a custom event so FloatingChat opens itself.
 * Returns a small delay (ms) the caller should wait before showing the step,
 * so the chat panel has time to animate open.
 */
function ensureFloatingChatOpen(step: TourStepWithRoute): number {
  const target = typeof step.target === "string" ? step.target : "";
  if (target.includes('floating-chat')) {
    window.dispatchEvent(new CustomEvent("tour:open-chat"));
    return 400; // wait for chat open animation
  }
  return 0;
}

export function DashboardTour({ run, onComplete }: DashboardTourProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const config = useCabinetConfig();

  const [allSteps, setAllSteps] = useState<TourStepWithRoute[]>([]);
  const [allTourSteps, setAllTourSteps] = useState<ClientTourStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Track whether we're mid-navigation so the location effect fires correctly
  const navigatingRef = useRef(false);
  const pendingStepRef = useRef<number | null>(null);
  // Store joyride controls for programmatic navigation after route change
  const controlsRef = useRef<Controls | null>(null);
  // Track last user action to know direction for TARGET_NOT_FOUND skipping
  const lastActionRef = useRef<string>("next");

  // ── Filter out steps targeting disabled tabs ─────────────────────
  const { steps, tourSteps } = useMemo(() => {
    if (!config) return { steps: allSteps, tourSteps: allTourSteps };

    const enabledIndices: number[] = [];
    allSteps.forEach((s, i) => {
      if (!isStepDisabled(s, config)) enabledIndices.push(i);
    });

    return {
      steps: enabledIndices.map((i) => allSteps[i]),
      tourSteps: enabledIndices.map((i) => allTourSteps[i]),
    };
  }, [allSteps, allTourSteps, config]);

  // ── Load steps from API ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    api
      .getClientTourSteps()
      .then((data) => {
        if (cancelled) return;
        setAllTourSteps(data.items);
        setAllSteps(
          data.items.map((s) => ({
            target: s.target,
            placement: s.placement as Step["placement"],
            title: s.title,
            content: s.content,
            skipBeacon: true,
            route: s.route,
          })),
        );
      })
      .catch((err) => {
        console.error("Failed to load tour steps:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Start tour when run=true and steps are loaded ────────────────
  useEffect(() => {
    if (!run || loading || steps.length === 0) return;

    const firstStep = steps[0];
    if (firstStep.route && firstStep.route !== location.pathname) {
      // Need to navigate to the route of the first step before starting
      navigatingRef.current = true;
      pendingStepRef.current = 0;
      navigate(firstStep.route);
    } else {
      setStepIndex(0);
      setIsRunning(true);
    }
  }, [run, loading, steps.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── After navigation completes, wait for route to settle then resume ──
  useEffect(() => {
    if (!navigatingRef.current || pendingStepRef.current === null) return;
    navigatingRef.current = false;

    const idx = pendingStepRef.current;
    pendingStepRef.current = null;
    if (idx < 0 || idx >= steps.length) return;

    // Let React Router mount the new route, then resume
    // joyride's targetWaitTimeout handles waiting for the actual element
    waitForRouteSettled(() => {
      const delay = ensureFloatingChatOpen(steps[idx]);
      if (delay > 0) {
        setTimeout(() => {
          setStepIndex(idx);
          setIsRunning(true);
        }, delay);
      } else {
        setStepIndex(idx);
        setIsRunning(true);
      }
    });
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Joyride event handler (controlled mode, v3 API) ──────────────
  const handleEvent = useCallback(
    (data: EventData, controls: Controls) => {
      const { action, index, status, type } = data;

      // Persist controls ref for use in the navigation effect
      controlsRef.current = controls;

      // Tour finished or skipped — but NOT if we're mid-navigation.
      // When we set `run=false` for a cross-route transition, Joyride fires
      // FINISHED/SKIPPED which would kill the tour permanently. Ignore it.
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        if (navigatingRef.current || pendingStepRef.current !== null) return;
        setIsRunning(false);
        onComplete();
        return;
      }

      // Target not found — skip in the direction the user was going
      if (type === EVENTS.TARGET_NOT_FOUND) {
        const direction = lastActionRef.current === "prev" ? -1 : 1;
        const skipTo = index + direction;
        if (skipTo >= 0 && skipTo < steps.length) {
          setStepIndex(skipTo);
        } else {
          setIsRunning(false);
          onComplete();
        }
        return;
      }

      if (type === EVENTS.STEP_AFTER) {
        const isPrev = action === "prev";
        lastActionRef.current = isPrev ? "prev" : "next";
        const nextIndex = isPrev ? index - 1 : index + 1;

        // Bounds check
        if (nextIndex < 0 || nextIndex >= steps.length) {
          setIsRunning(false);
          onComplete();
          return;
        }

        const nextStep = steps[nextIndex];

        // Check if we need to navigate to a different route
        if (nextStep.route && nextStep.route !== location.pathname) {
          // Cross-route transition: mark navigating FIRST (refs are sync),
          // then stop joyride. The location.pathname effect resumes the tour.
          navigatingRef.current = true;
          pendingStepRef.current = nextIndex;
          setIsRunning(false);
          navigate(nextStep.route);
        } else {
          // Same route — open floating chat if needed, then update stepIndex.
          const delay = ensureFloatingChatOpen(nextStep);
          if (delay > 0) {
            setTimeout(() => setStepIndex(nextIndex), delay);
          } else {
            setStepIndex(nextIndex);
          }
        }
      }
    },
    [steps, location.pathname, navigate, onComplete],
  );

  if (loading || steps.length === 0) return null;

  return (
    <Joyride
      steps={steps}
      run={isRunning}
      stepIndex={stepIndex}
      continuous
      options={{
        overlayClickAction: false,
        blockTargetInteraction: true,
        buttons: ["back", "close", "primary", "skip"],
        targetWaitTimeout: 3000,
        spotlightRadius: 16,
        zIndex: 10000,
      }}
      styles={{
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
        },
      }}
      onEvent={handleEvent}
      tooltipComponent={(props: TooltipRenderProps) => (
        <TourTooltip {...props} tourSteps={tourSteps} />
      )}
    />
  );
}
