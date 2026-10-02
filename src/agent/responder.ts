export type Severity = "critical" | "high" | "medium" | "low";

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  asset: string;
  detail: string;
}

export type ResponderEvent =
  | { type: "phase"; phase: "thinking" | "searching" | "analyzing" | "found" }
  | { type: "findings"; items: Finding[] }
  | { type: "token"; text: string }
  | { type: "done"; tone: "success" | "warning" | "error" };

/**
 * Plug a real backend (LLM, application API, ...) in here. Emit phases as work progresses and
 * Qivi's body will follow them; tokens stream into the answer bubble.
 */
export type Responder = (query: string, signal: AbortSignal) => AsyncIterable<ResponderEvent>;

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((res, rej) => {
    const t = setTimeout(res, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      rej(new DOMException("aborted", "AbortError"));
    }, { once: true });
  });

const RISK: Finding[] = [
  { id: "CVE-2024-3400", title: "PAN-OS GlobalProtect command injection", severity: "critical", asset: "fw-edge-02", detail: "Internet-facing, exploit public" },
  { id: "CVE-2023-4966", title: "Citrix Bleed session token leak", severity: "critical", asset: "ns-gw-01", detail: "Unpatched for 41 days" },
  { id: "CVE-2024-21762", title: "FortiOS out-of-bounds write", severity: "high", asset: "vpn-eu-03", detail: "Reachable from 2 subnets" },
];

const PATCH: Finding[] = [
  { id: "KB5034441", title: "Windows Recovery Environment update", severity: "medium", asset: "112 endpoints", detail: "Ready to deploy" },
  { id: "RHSA-2024:1249", title: "OpenSSL security update", severity: "high", asset: "38 Linux hosts", detail: "Reboot not required" },
];

const ASSETS: Finding[] = [
  { id: "INV-2207", title: "Unmanaged hosts discovered", severity: "low", asset: "10.40.0.0/16", detail: "14 new devices this week" },
  { id: "INV-2208", title: "Expired agent certificates", severity: "medium", asset: "9 servers", detail: "Agents stopped reporting" },
];

interface Scenario {
  findings: Finding[];
  answer: string;
  tone: "success" | "warning" | "error";
  failAt?: "searching";
}

function pick(q: string): Scenario {
  const s = q.toLowerCase();
  if (/(fail|error|break|crash|offline)/.test(s))
    return { findings: [], tone: "error", failAt: "searching", answer: "I couldn't reach the asset inventory service, so I have no results. Check that the connector is online, then ask again." };
  if (/(critical|risk|vuln|cve|exposed|attack|threat)/.test(s))
    return { findings: RISK, tone: "warning", answer: "I found 2 critical vulnerabilities on internet-facing gateways. Both have public exploits, so patch fw-edge-02 first, then ns-gw-01. I've ranked all three by exposure in the findings panel." };
  if (/(patch|fix|remediat|update)/.test(s))
    return { findings: PATCH, tone: "success", answer: "Two patch bundles are ready and cover 150 hosts. Neither needs a reboot during business hours. I can schedule them for tonight's maintenance window." };
  return { findings: ASSETS, tone: "success", answer: "Your environment looks healthy overall. I found 14 unmanaged devices and 9 servers whose agents stopped reporting. Both are listed in the findings panel." };
}

export const mockResponder: Responder = async function* (query, signal) {
  const sc = pick(query);
  yield { type: "phase", phase: "thinking" };
  await sleep(1100, signal);
  yield { type: "phase", phase: "searching" };
  await sleep(1600, signal);
  if (sc.failAt) {
    yield* stream(sc.answer, signal);
    yield { type: "done", tone: "error" };
    return;
  }
  yield { type: "phase", phase: "analyzing" };
  await sleep(1400, signal);
  yield { type: "phase", phase: "found" };
  await sleep(450, signal);
  yield { type: "findings", items: sc.findings };
  await sleep(650, signal);
  yield* stream(sc.answer, signal);
  yield { type: "done", tone: sc.tone };
};

async function* stream(text: string, signal: AbortSignal): AsyncGenerator<ResponderEvent> {
  for (const w of text.split(/(?<= )/)) {
    await sleep(26 + Math.random() * 40, signal);
    yield { type: "token", text: w };
  }
}
