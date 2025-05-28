import { TeamInfo } from "../types/team-info";

const EditorialToolsInfo: TeamInfo = {
  team: "editorial-tools",
  description: "Need access to a Tool? Contact Central Production",
  links: [
    {
      description: "Contact Us",
      url: new URL("mailto:digitalcms.dev@theguardian.com"),
    },
    {
      description: "Report a bug or health request",
      url: new URL(
        "https://docs.google.com/forms/d/e/1FAIpQLSeZje55T3OnErlTI_8iGuyZERjDy2Pybh8fdPmbnjy1PNFDAw/viewform",
      ),
    },
    {
      description: "View health rota",
      url: new URL(
        "https://docs.google.com/spreadsheets/d/1LVKJArZDJsq5R17zGCfto1b_BIgVcJF8MELR7bDPYpM/edit?usp=sharing",
      ),
    },
    {
      description: "Logs",
      url: new URL(
        "https://logs.gutools.co.uk/goto/e3f2ce37ecf92aad24f3b84e41d0e27b",
      ),
    },
  ],
};

const DotcomTeamInfo: TeamInfo = {
  team: "dotcom",
  description: "Running theguardian.com for millions of readers a day",
  links: [
    {
      description: "Contact Us",
      url: new URL("mailto:dotcom.platform@theguardian.com"),
    },
  ],
};

const InvestigationsTeamInfo: TeamInfo = {
  team: "investigations",
  description: "Investigations and Reporting team",
  links: [
    {
      description: "Contact Us",
      url: new URL("mailto:Digital.Investigations@guardian.co.uk"),
    },
  ],
};

const DevxTeamInfo: TeamInfo = {
  team: "devx",
  description: "A collection of tools for Guardian Product & Engineering",
  links: [
    {
      description: "GitHub respositories",
      url: new URL(
        "https://github.com/orgs/guardian/teams/deploy-infrastructure/repositories",
      ),
    },
    {
      description: "DevX introduction presentation",
      url: new URL(
        "https://docs.google.com/presentation/d/11XrwvTSjqAshKFQs-BeZj6_tTMAbEZhz7GbDHLyGmIU/edit#slide=id.g4524256496_0_0",
      ),
    },
  ],
};

const OphanTeamInfo: TeamInfo = {
  team: "ophan",
  description: "Ophan is the Guardian editorial analytics tool",
  links: [
    {
      description: "Contact Us",
      url: new URL("mailto:ophan.dev@theguardian.com"),
    },
    {
      description: "Logs",
      url: new URL(
        "https://es6-monitor.ophan.co.uk/app/monitoring#/overview?_g=(cluster_uuid:X5hBehuBQweta9Til7E9SQ)",
      ),
    },
    {
      description: "Build (TeamCity)",
      url: new URL("https://teamcity.gutools.co.uk/project/Ophan"),
    },
  ],
};

const DesignSystemTeamInfo: TeamInfo = {
  team: "design-system",
  description: `The Guardian's digital design system`,
  links: [
    {
      description: "Contact Us",
      url: new URL("mailto:digital.design.system@theguardian.com"),
    },
    {
      description: "Google Hangouts Chat",
      url: new URL("https://chat.google.com/room/AAAAGDIhXQs"),
    },
  ],
};

const MiscTeamInfo: TeamInfo = {
  team: "misc",
  description: `A collection of miscellaneous links that don't belong to a specific team`,
  links: [],
};

const CapiTeamInfo: TeamInfo = {
  team: "capi",
  description: `We maintain the content api, the heart of the Guardian's digital apps`,
  links: [],
};

const SupporterRevenueTeamInfo: TeamInfo = {
  team: "supporter-revenue",
  description: `We are responsible for securing - then keeping - paying readers via subscriptions, contributions, and app purchases.`,
  links: [
    {
      description: "✉️ Contact us",
      url: new URL("mailto:supporter.revenue@guardian.co.uk"),
    },
    {
      description: "✉️ Engineering",
      url: new URL("mailto:reader.revenue.dev@guardian.co.uk"),
    },
    {
      description: "✉️ Bug reports",
      url: new URL("mailto:supporter.revenue.support@guardian.co.uk"),
    },
    {
      description: "Google Hangouts Chat",
      url: new URL("https://chat.google.com/room/AAAAIddGn5w?cls=7"),
    },
  ],
};

const AllTeamInfo: Array<TeamInfo> = [
  DevxTeamInfo,
  DotcomTeamInfo,
  InvestigationsTeamInfo,
  EditorialToolsInfo,
  MiscTeamInfo,
  OphanTeamInfo,
  DesignSystemTeamInfo,
  CapiTeamInfo,
  SupporterRevenueTeamInfo,
];

export default AllTeamInfo;
