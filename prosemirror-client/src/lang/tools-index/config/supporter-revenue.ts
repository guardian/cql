import { codeLink, githubLink, prodLink } from "../types/link"
import { Tool } from "../types/tool"

// Our storybook is in here, so it feels like a 
const Storybook: Tool = {
  name: 'Supporter Revenue Storybook',
  description: 'Supporter Revenue Storybook',
  team: 'supporter-revenue',
  keywords: ['storybook', 'components', 'client-side'],
  primaryLink: prodLink('https://62e115310aef0868687b2322-acpdaoduvv.chromatic.com')
}

const ReaderRevenueControlPanel: Tool = {
  // I've use the accronym as the long name breaks the layout
  name: 'RRCP',
  description: 'Reader Revenue Control Panel for Supporter Revenue Epics, Banners, support.theguardian.com and other related content',
  team: 'supporter-revenue',
  keywords: ['cms'],
  primaryLink: prodLink('https://support.gutools.co.uk'),
  links: [
    codeLink('https://support.code.dev-gutools.co.uk'),
    githubLink('https://github.com/guardian/support-admin-console')
  ]
}

const PromoTool: Tool = {
  name: 'Promo tool',
  description: 'Creation of promotional offers on support.theguardian.com',
  team: 'supporter-revenue',
  keywords: ['cms'],
  primaryLink: prodLink('https://memsub-promotions.gutools.co.uk'),
  links: [
    codeLink('https://promo.code.memsub-promotions.gutools.co.uk'),
    githubLink('https://github.com/guardian/memsub-promotions')
  ]
}

const All: Array<Tool> = [
  ReaderRevenueControlPanel,
  PromoTool,
  Storybook,
]

export default All