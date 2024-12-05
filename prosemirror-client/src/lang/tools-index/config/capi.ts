import { Tool } from '../types/tool'
import { prodLink, githubLink, codeLink } from '../types/link'

const Bonobo: Tool = {
  name: 'Bonobo',
  description: 'Managing API keys for CAPI',
  team: 'capi',
  keywords: ['key'],
  primaryLink: prodLink("https://bonobo.capi.gutools.co.uk"),
  awsAccount: 'capi',
  links: [
    githubLink("bonobo"),
    codeLink("https://bonobo-code.capi.gutools.co.uk")
  ]
}

const OpenPlatform: Tool = {
  name: 'Open Platform',
  description: 'A website to play with CAPI',
  team: 'capi',
  keywords: ['capi'],
  primaryLink: prodLink("https://open-platform.theguardian.com"),
  awsAccount: 'capi'
}

const LocalProxy: Tool = {
  name: 'Content API Local Proxy',
  description: `Proxying requests to live and preview CAPI. Handling auth, so you don't have to!`,
  team: 'capi',
  keywords: ['capi', 'proxy'],
  primaryLink: githubLink('content-api-local-proxy')
}

const KindlePreviewer: Tool = {
  name: 'Kindle Previewer',
  description: 'Viewing the Guardian Kindle edition before it is published',
  team: 'capi',
  keywords: ['capi', 'apps', 'preview'],
  primaryLink: prodLink('https://kindle-previewer.gutools.co.uk'),
  links: [
    githubLink("guardian-kindle-web"),
     {
      description: "CODE",
      url: new URL("https://kindle-previewer.code.dev-gutools.co.uk/")
    }
  ]
}

const Pubflow: Tool = {
  name: 'Pubflow',
  description: 'Track the progress of content through the production workflow and into CAPI.',
  team: 'capi',
  keywords: [ 'capi', 'content-pipeline' ],
  primaryLink: prodLink('https://pubflow.capi.gutools.co.uk/'),
  links: [
    githubLink("pubflow"),
    {
      description: "Preview",
      url: new URL("https://pubflow-preview.capi.gutools.co.uk/")
    },
    codeLink("https://pubflow.capi.code.dev-gutools.co.uk/")
  ]
}

const Nightwatch: Tool = {
  name: 'Nightwatch',
  description: 'Content API latency & request status monitoring dashboard.',
  team: 'capi',
  keywords: [ 'capi' ],
  primaryLink: prodLink('https://status.capi.gutools.co.uk/'),
  links: [
    githubLink("content-api/tree/main/nightwatch"),
    {
      description: "Preview",
      url: new URL("https://status-preview.capi.gutools.co.uk/")
    },
  ]
}

const AppleNews: Tool = {
  name: 'Apple News',
  description: 'Apple News distributor app',
  team: 'capi',
  keywords: [ 'capi' ],
  primaryLink: prodLink('https://apple-news.capi.gutools.co.uk/'),
  links: [
    githubLink("apple-news"),
    {
      description: "CODE",
      url: new URL("https://apple-news.capi.code.dev-gutools.co.uk/")
    },
  ]
}

const KongKeyMon: Tool = {
  name: 'KongKeyMon',
  description: 'Interrogate CAPI key usage',
  team: 'capi',
  keywords: [ 'capi' ],
  primaryLink: prodLink('https://kongkeymon.capi.gutools.co.uk/_plugin/kibana/app/dashboards'),
  links: [
    githubLink("kongkeymon"),
    {
      description: "CODE",
      url: new URL("https://kongkeymon.capi.code.dev-gutools.co.uk/_plugin/kibana/app/dashboards/")
    },
  ]
}

const All: Array<Tool> = [
  Bonobo,
  OpenPlatform,
  LocalProxy,
  KindlePreviewer,
  Pubflow,
  Nightwatch,
  AppleNews,
  KongKeyMon
]

export default All
