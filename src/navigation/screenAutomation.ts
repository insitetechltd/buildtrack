export type Sprint7AutomationActor = "tristan" | "herman";

export type AutomationLaunchRequest = {
  type: "sprint7-sandbox";
  actor: Sprint7AutomationActor;
};

const SPRINT7_SANDBOX_AUTOMATION_URL_PATTERN =
  /^taskr:\/\/automation\/sprint7(?:\/(tristan|herman))?\/?$/i;

export function buildSprint7SandboxAutomationUrl(
  actor: Sprint7AutomationActor = "tristan",
) {
  return `taskr://automation/sprint7/${actor}`;
}

export function parseAutomationLaunchUrl(
  url?: string | null,
): AutomationLaunchRequest | null {
  if (typeof url !== "string") {
    return null;
  }

  const match = url.trim().match(SPRINT7_SANDBOX_AUTOMATION_URL_PATTERN);
  if (!match) {
    return null;
  }

  const actor = (match[1]?.toLowerCase() as Sprint7AutomationActor | undefined) ?? "tristan";

  return {
    type: "sprint7-sandbox",
    actor,
  };
}

export async function handleAutomationLaunchUrl(
  url: string | null | undefined,
  options: {
    runSprint7Sandbox: (actor: Sprint7AutomationActor) => Promise<void>;
  },
): Promise<boolean> {
  const request = parseAutomationLaunchUrl(url);
  if (!request) {
    return false;
  }

  if (request.type === "sprint7-sandbox") {
    await options.runSprint7Sandbox(request.actor);
    return true;
  }

  return false;
}
