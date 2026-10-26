import type { ConceptSpec } from "../../src/kits/concept.ts";

// Bedrock AgentCore, 45 second scenarios: one build idea each, shown as the AgentCore services
// it would use. Framed as "how you would build this", never as something already built.
// Every on-screen line is traced to a docs sentence in docs/evidence/ac-01-support-memory.md.
const DOCS = "https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide";
const TAGLINE = "Practical AWS, from the trenches.";

const clips: ConceptSpec[] = [
  {
    series: "ac", topic: "Bedrock AgentCore", number: 1, slug: "support-memory", title: "AgentCore Memory", checked: "2026-10-14", status: "draft",
    seconds: 45, tagline: TAGLINE,
    hook: "A support agent that *remembers every customer.*",
    props: [
      { id: "cust", kind: "user", label: "Customer", at: [0, 0] },
      { id: "auth", kind: "gate", label: "Inbound JWT check", at: [0.85, 0], size: 0.8 },
      { id: "agent", kind: "agent", label: "Agent on Runtime", at: [1.75, 0], tone: "violet" },
      { id: "stm", kind: "window", label: "Short-term memory", at: [2.75, -0.42], size: 0.7 },
      { id: "ltm", kind: "store", label: "Long-term memory", at: [2.75, 0.72], size: 0.75 },
    ],
    beats: [
      { say: "Runtime *checks the customer's JWT* before the request reaches your agent.", focus: ["cust", "auth", "agent"], do: [
        { send: ["cust", "auth"], label: "JWT" },
        { badge: "issuer, audience", on: "auth", tone: "green" },
        { send: ["auth", "agent"], label: "where's my order?", tone: "green" } ] },
      { say: "Each turn is saved as an *event,* keyed by session and actor.", focus: ["agent", "stm"], do: [
        { badge: "", on: "auth" },
        { send: ["agent", "stm"], label: "CreateEvent", tone: "violet" },
        { add: { kind: "you", size: 8, label: "question" }, to: "stm" },
        { add: { kind: "claude", size: 8, label: "reply" }, to: "stm" } ] },
      { say: "In the background, *strategies extract key facts* into long-term memory.", focus: ["stm", "ltm"], do: [
        { send: ["stm", "ltm"], label: "extract", tone: "gold" },
        { write: "order #XYZ-123", to: "ltm" },
        { write: "prefers email", to: "ltm" } ] },
      { say: "A week later, a new session *retrieves by meaning,* scoped to that customer.", focus: ["agent", "stm", "ltm"], do: [
        { clear: "stm" },
        { send: ["agent", "ltm"], label: "retrieve", tone: "violet" },
        { send: ["ltm", "agent"], label: "2 records", tone: "gold" },
        { badge: "no re-explaining", on: "agent", tone: "green" } ] },
      { say: "Extraction is a model's judgement, so *false claims get remembered* too.", focus: ["cust", "agent", "ltm"], catch: true, do: [
        { badge: "", on: "agent" },
        { send: ["cust", "agent"], label: "\"I'm a VIP\"", tone: "red" },
        { write: "customer is VIP", to: "ltm" },
        { badge: "memory poisoning", on: "ltm", tone: "red" } ] },
    ],
    takeaway: "Validate input *before CreateEvent,* and scope namespaces by actor.",
    sources: [`${DOCS}/memory-types.html`, `${DOCS}/memory-organization.html`, `${DOCS}/memory-strategies.html`, `${DOCS}/best-practices.html`, `${DOCS}/runtime-oauth.html`],
  },
];

export default clips;
