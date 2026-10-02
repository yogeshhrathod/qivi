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

interface Scenario {
  findings: Finding[];
  answer: string;
  tone: "success" | "warning" | "error";
  failAt?: "searching";
}
function pick(query: string): Scenario {
  const text = query.toLowerCase();
  let answer: string;
  if (/(email|draft|write|follow.up)/.test(text)) {
    answer = "Here’s a friendly starting point:\n\nHi Alex,\n\nJust following up on our conversation. Have you had a chance to look at the proposal? I’d be happy to answer questions or find a time to talk.\n\nThanks,\n[Your name]\n\nKeep the opening warm, make the request clear, and give them an easy next step.";
  } else if (/(plan|afternoon|focus|schedule)/.test(text)) {
    answer = "Let’s make your afternoon feel manageable:\n\n1. Spend 10 minutes choosing one priority.\n2. Give it a 45-minute block with notifications off.\n3. Take a short break away from your screen.\n4. Use the next block for smaller tasks.\n5. Leave 10 minutes to wrap up and decide what comes next.\n\nA little breathing room makes a plan easier to follow.";
  } else if (/(rainbow|learn|explain)/.test(text)) {
    answer = "A rainbow forms when sunlight passes through droplets of water. The light bends as it enters, reflects inside the droplet, and bends again as it leaves. Different colors bend by different amounts, so white sunlight spreads into a band of colors.\n\nThink of each raindrop as a tiny prism. The angle between you, the Sun and the droplets determines which colors reach your eyes.";
  } else if (/(coffee|brainstorm|idea|create|name)/.test(text)) {
    answer = "Here are a few directions for your coffee shop:\n\n• Slow Morning — relaxed and welcoming.\n• Common Ground — built around conversation.\n• Little Ritual — a daily moment to look forward to.\n• Ember & Bean — warm and a little distinctive.\n• Second Cup Society — playful and social.\n\nPick the feeling you want people to have when they walk in, then choose a name that matches it.";
  } else if (/(hello|hi\b|hey)/.test(text)) {
    answer = "Hi! I’m Qivi. We can explore an idea, draft something, make a plan, or learn something new. What would you like to work on?";
  } else {
    answer = "Let’s work through that together. Start with the outcome you want, then break it into a few smaller steps. It helps to write down what you already know, what is uncertain, and the first thing you can try.\n\nThis showcase uses sample replies to demonstrate how Qivi reacts while listening, thinking and answering. Try one of the writing, planning, learning or creative prompts for a more specific example.";
  }
  return { findings: [], tone: "success", answer };
}

export const mockResponder: Responder = async function* (query, signal) {
  const sc = pick(query);
  yield { type: "phase", phase: "thinking" };
  await sleep(500, signal);
  yield { type: "phase", phase: "searching" };
  await sleep(450, signal);
  if (sc.failAt) {
    yield* stream(sc.answer, signal);
    yield { type: "done", tone: "error" };
    return;
  }
  yield { type: "phase", phase: "analyzing" };
  await sleep(450, signal);
  yield { type: "phase", phase: "found" };
  await sleep(450, signal);
  yield { type: "findings", items: sc.findings };
  await sleep(200, signal);
  yield* stream(sc.answer, signal);
  yield { type: "done", tone: sc.tone };
};

async function* stream(text: string, signal: AbortSignal): AsyncGenerator<ResponderEvent> {
  for (const w of text.split(/(?<= )/)) {
    await sleep(26 + Math.random() * 40, signal);
    yield { type: "token", text: w };
  }
}
