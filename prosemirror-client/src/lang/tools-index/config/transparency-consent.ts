import {Tool} from "../types/tool";
import {githubLink, prodLink, codeLink} from "../types/link";

const Baton: Tool = {
  name: 'Baton',
  description: `Orchestration of Subject Access Requests and Right to Erasure Requests`,
  team: 'transparency-consent',
  keywords: ['GDPR'],
  primaryLink: prodLink('https://baton.gutools.co.uk'),
  links: [
    githubLink('baton'),
    codeLink("https://baton.code.dev-gutools.co.uk")
  ]
}

const All: Array<Tool> = [
  Baton,
]

export default All
