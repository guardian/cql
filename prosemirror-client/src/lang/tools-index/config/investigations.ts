import { Tool } from "../types/tool";
import { prodLink, githubLink, riffRaffLink, codeLink } from "../types/link";

const Lurch: Tool = {
  name: "Lurch",
  description: "Land Registry and Companies House Search Tool",
  team: "investigations",
  keywords: ["investigations"],
  primaryLink: prodLink("https://lurch.pfi.gutools.co.uk"),
  awsAccount: "investigations",
  links: [
    githubLink("lurch"),
    codeLink("https://lurch.pfi.code.dev-gutools.co.uk"),
    {
      description: "PROD logs",
      url: new URL(
        `https://logs.gutools.co.uk/s/investigations/goto/b40773718ed32f1496988dfa2bb0671f`
      )
    },
    {
      description: "CODE logs",
      url: new URL(
        `https://logs.gutools.co.uk/s/investigations/goto/26e569b7135ab5480f88d40f51bcfc68`
      )
    },
    riffRaffLink("investigations::lurch")
  ]
};

const Giant: Tool = {
  name: "Giant",
  description: "Giant makes it easier for journalists to search, analyse, categorise and share unstructured data.",
  team: "investigations",
  keywords: ["investigations"],
  primaryLink: prodLink("https://giant.pfi.gutools.co.uk"),
  awsAccount: "investigations",
  links: [
    githubLink("giant"),
    {
      description: "Playground",
      url: new URL("https://playground.pfi.gutools.co.uk")
    },
    riffRaffLink("investigations::pfi-giant")
  ]
};

const Discourse: Tool = {
  name: "Discourse",
  description: "An internal discussion board for editorial. Self hosted instance of discourse.org",
  team: "investigations",
  keywords: ["investigations"],
  primaryLink: prodLink("https://discourse.gutools.co.uk"),
  awsAccount: "investigations",
  links: [
    riffRaffLink("investigations::discourse")
  ]
}

const TranscriptionService: Tool = {
  name: "Transcription Service",
  description: "A tool for transcribing audio and video to text",
  team: "investigations",
  keywords: ["transcription"],
  primaryLink: prodLink("https://transcribe.gutools.co.uk/"),
  awsAccount: "investigations",
  links: [
    githubLink("https://github.com/guardian/transcription-service"),
    codeLink("https://transcribe.code.dev-gutools.co.uk"),
    riffRaffLink("investigations::transcription-service"),
    {
      description: "PROD logs",
      url: new URL(
        `https://logs.gutools.co.uk/s/investigations/goto/8ee36250-db05-11ee-a291-5fa3d234705d`
      )
    },
    {
      description: "CODE logs",
      url: new URL(
        `https://logs.gutools.co.uk/s/investigations/goto/98fb27a0-db05-11ee-a291-5fa3d234705d`
      )
    }
  ]
}



const All: Array<Tool> = [
  Lurch,
  Giant,
  Discourse,
  TranscriptionService
];

export default All;
