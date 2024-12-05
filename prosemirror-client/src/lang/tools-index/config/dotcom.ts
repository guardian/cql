import { Tool } from '../types/tool'
import { prodLink, codeLink } from '../types/link'

const TheGuardian: Tool = {
  name: 'The Guardian',
  description: 'Telling the news',
  team: 'dotcom',
  keywords: ['news'],
  primaryLink: prodLink('https://www.theguardian.com'),
  links: [
    codeLink("https://m.code.dev-theguardian.com")
  ],
  awsAccount: 'frontend'
}

const FrontendAdmin: Tool = {
  name: 'Frontend admin',
  description: 'Links to lots of useful tools for theguardian.com',
  team: 'dotcom',
  keywords: ['A/B Tests', 'Switchboard', 'Clear cache', 'Football', 'Commercial'],
  primaryLink: prodLink('https://frontend.gutools.co.uk'),
  links: [
    codeLink("https://frontend.code.dev-gutools.co.uk")
  ],
  awsAccount: 'frontend'
}

const All: Array<Tool> = [
  TheGuardian,
  FrontendAdmin
]

export default All
