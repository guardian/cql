import { Tool } from "../types/tool";
import { prodLink, githubLink, riffRaffLink } from "../types/link";

const Elk: Tool = {
  name: "ELK",
  description: "Central log server",
  team: "devx",
  keywords: ["logs"],
  primaryLink: prodLink("https://logs.gutools.co.uk"),
  awsAccount: "deployTools",
};

const RiffRaff: Tool = {
  name: "Riff Raff",
  description: "Deploying apps",
  team: "devx",
  keywords: ["deploy", "cd"],
  primaryLink: prodLink("https://riffraff.gutools.co.uk"),
  awsAccount: "deployTools",
};

const SecurityHq: Tool = {
  name: "Security HQ",
  description: "Auditing security of AWS accounts",
  team: "devx",
  keywords: ["security"],
  primaryLink: prodLink("https://security-hq.gutools.co.uk"),
};

const Janus: Tool = {
  name: "Janus",
  description: "Issuing credentials to AWS accounts",
  team: "devx",
  keywords: ["security", "aws"],
  primaryLink: prodLink("https://janus.gutools.co.uk"),
};

const Amigo: Tool = {
  name: "AMIgo",
  description: "An AMI bakery",
  team: "devx",
  keywords: ["aws", "ami", "bake"],
  primaryLink: prodLink("https://amigo.gutools.co.uk/"),
  links: [
    githubLink("amigo"),
    {
      description: "CODE",
      url: new URL("https://amigo.code.dev-gutools.co.uk"),
    },
  ],
};

const Amiable: Tool = {
  name: "Amiable",
  description: "AMI management tool",
  team: "devx",
  keywords: ["aws", "ami"],
  primaryLink: prodLink("https://amiable.gutools.co.uk/"),
  links: [githubLink("amiable")],
};

const Prism: Tool = {
  name: "Prism",
  description:
    "Tool for collecting live data about infrastructure so it can be easily queried by users and automated tooling",
  team: "devx",
  keywords: ["aws"],
  primaryLink: prodLink("https://prism.gutools.co.uk/"),
  links: [githubLink("prism"), riffRaffLink("tools::prism")],
};

const ZeroBin: Tool = {
  name: "ZeroBin",
  description:
    "A minimalist pastebin where the server has zero knowledge of pasted data",
  team: "devx",
  keywords: ["security", "privatebin", "zerobin"],
  primaryLink: prodLink("https://zerobin.gutools.co.uk/"),
  links: [githubLink("privatebin")],
};

const Metrics: Tool = {
  name: "Metrics",
  description: "Visualise metrics",
  team: "devx",
  keywords: ["grafana", "metrics", "graphs"],
  primaryLink: prodLink("https://metrics.gutools.co.uk"),
  awsAccount: "deployTools",
  links: [
    githubLink("grafana"),
    {
      description: "CODE",
      url: new URL("https://metrics.code.dev-gutools.co.uk"),
    },
  ],
};

const Anghammarad: Tool = {
  name: "Anghammarad",
  description: `Notification service for the Guardian's dev teams.`,
  team: "devx",
  keywords: ["notification"],
  primaryLink: githubLink("anghammarad"),
  links: [],
};

const Storybooks: Tool = {
  name: "Storybooks",
  description: "Collected Guardian storybooks",
  team: "devx",
  keywords: ["storybook", "components", "client-side"],
  primaryLink: prodLink("https://guardian.github.io/storybooks"),
};

const All: Array<Tool> = [
  Elk,
  Metrics,
  RiffRaff,
  SecurityHq,
  Janus,
  Amigo,
  Amiable,
  Prism,
  ZeroBin,
  Anghammarad,
  Storybooks,
];

export default All;
