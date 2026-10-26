# Bedrock AgentCore: evidence for every on-screen line

Clips in `concepts/ac/s1.ts`. Pages fetched from the AgentCore developer guide on 2026-10-14
and read in full. Each on-screen line is followed by the docs sentence that supports it,
quoted verbatim, and the page it is on.

The series pitches build ideas. Nothing on screen claims the build exists or was run.

Not evidence: block sizes, the customer's question, the "2 records" count and the card
"prefers email". They are examples to make the picture readable. "order #XYZ-123" is the
docs' own example.

Pages (all under https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/):

- TYPES: memory-types.html
- ORG: memory-organization.html
- STRAT: memory-strategies.html
- SEMANTIC: semantic-memory-strategy.html
- PREF: user-preference-memory-strategy.html
- BP: best-practices.html
- OAUTH: runtime-oauth.html
- REGIONS: agentcore-regions.html (Memory, Runtime and Identity are all listed for Asia Pacific (Sydney))

## ac-01-support-memory

**Hook: "A support agent that remembers every customer."**
> "Conversational agents: A customer support chatbot remembers a user's previous issues and preferences, enabling it to provide more relevant assistance in future interactions." (memory.html)

**Gate label "Inbound JWT check", badge "issuer, audience"; Beat 1: "Runtime checks the customer's JWT before the request reaches your agent."**
> "The discovery url should point to an issuer url. This should match the iss claim in the decoded token." (OAUTH)
> "One of the values in aud claim from the token should match one of the allowed audience specified in the authorizer" (OAUTH)
> "Allowed audiences - A list of permitted audiences that will be validated against the aud claim in the JWT token" (OAUTH)

**Beat 2: "Each turn is saved as an event, keyed by session and actor."**
> "Each customer question and agent response is saved as a separate event (or in batches, depending on your implementation)." (TYPES)
> "When you create a short term memory event with CreateEvent , you specify a session ID ( sessionId ) and an actor ID ( actorId ) that uniquely identify the session and actor for the event." (ORG)

**Beat 3: "In the background, strategies extract key facts into long-term memory."**
> "Long-term memory generation is an asynchronous process that runs in the background and automatically extracts insights after raw conversation/context is stored in short-term memory via CreateEvent" (TYPES)
> "These strategies determine what types of information to extract from raw conversations." (STRAT)
> "An order number ( #XYZ-123 ) is associated with a specific support case." (SEMANTIC, example)

**Beat 4: "A week later, a new session retrieves by meaning, scoped to that customer."**
> "The RetrieveMemoryRecords operation is powerful as it performs a semantic search to find memory records that are most relevant to the query." (TYPES)
> "Long-term memory automatically extracts and stores key insights from conversations across multiple sessions" (memory.html)
> "Using the actor ID helps the system know which user the memory belongs to, keeping each user's data separate and organized." (ORG)

**Beat 5 (catch): "Extraction is a model's judgement, so false claims get remembered too."**
> "When processing conversational data through the CreateEvent API and extracting long-term memory via LLM, it is important to protect against memory poisoning" (BP)
> "Memory poisoning represents a threat where attackers embed false information in conversations to corrupt long-term memory stores." (BP)

**Takeaway: "Validate input before CreateEvent, and scope namespaces by actor."**
> "Input validation forms the foundation of protection at the CreateEvent API level. Sanitize the user input data with guardrails prior to persistence to memory" (BP)
> "Structure the namespace as a hierarchy of segments separated by forward slashes /, with a leading and a trailing slash. The slash prevents prefix collisions in multi-tenant applications" (ORG)

Also worth saying in the post, not on screen:

> "If no strategies are specified, long-term memory records will not be extracted for that memory." (STRAT)
> "Event metadata is not meant to store sensitive content, as it is not encrypted with customer managed key." (TYPES)
