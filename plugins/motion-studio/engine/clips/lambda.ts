import type { Series } from "../src/kits/series.ts";

const series: Series = {
  code: "lambda",
  service: "AWS Lambda",
  clips: [
    {
      number: 1,
      slug: "cold-start",
      checked: "2026-10-06",
      status: "made",
      level: 200,
      hero: "lambda",
      hook: "Your Lambda is fast. *Except the first time.*",
      setup: "A request arrives and no copy of your function is running.",
      nodes: [
        {
          id: "api",
          icon: "apigw",
          label: "API Gateway",
          at: [0, 0],
        },
        {
          id: "fn",
          icon: "lambda",
          label: "Your function",
          at: [1, 0],
        },
        {
          id: "code",
          icon: "tile:ZIP",
          label: "Code package",
          at: [1, 1],
        },
      ],
      edges: [
        {
          from: "api",
          to: "fn",
        },
        {
          from: "code",
          to: "fn",
        },
      ],
      steps: [
        {
          say: "Lambda downloads your code and starts a *new execution environment*.",
          flow: [
            {
              from: "code",
              to: "fn",
            },
          ],
          badge: {
            on: "fn",
            text: "cold start",
            tone: "bad",
          },
        },
        {
          say: "Your init code runs *once*: imports, SDK clients, connections.",
          focus: ["fn"],
          badge: {
            on: "fn",
            text: "init runs once",
          },
        },
        {
          say: "The environment is kept for a while, so later requests *skip all that*.",
          flow: [
            {
              from: "api",
              to: "fn",
            },
          ],
          badge: {
            on: "fn",
            text: "warm",
            tone: "good",
          },
        },
      ],
      catchLine: "Provisioned concurrency keeps environments ready, but you pay for them while idle.",
      catchFocus: ["fn"],
      takeaway: "Do setup *outside the handler*. Measure before paying to stay warm.",
      sources: ["https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html", "https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html"],
    },
  ],
};

export default series;
