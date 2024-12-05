import { Tool } from '../types/tool'
import { prodLink, githubLink, codeLink } from '../types/link'

const Sentry: Tool = {
  name: 'Sentry',
  description: 'Catching exceptions',
  team: 'misc',
  keywords: ['exception'],
  primaryLink: {
    description: 'login',
    url: new URL('https://sentry.io/auth/login/the-guardian/')
  }
}

const BigBrother: Tool = {
  name: 'Big Brother',
  description: 'Locating staff in Kings Place, London',
  team: 'misc',
  keywords: ['locate'],
  primaryLink: prodLink('http://octhelp.dc.gnm.int/inventory/bigbrother')
}

const HrSystem: Tool = {
  name: 'HR System',
  description: 'Performing HR related tasks (login via "company single sign-on")',
  team: 'misc',
  keywords: ['hr', 'holiday', 'pay'],
  primaryLink: prodLink('https://myapps.microsoft.com')
}

const AdminGuide: Tool = {
  name: 'Admin Guide',
  description: 'Everything you need to know in Digital',
  team: 'misc',
  keywords: ['admin'],
  primaryLink: prodLink('https://docs.google.com/document/d/1ErsZUEL0ELiGUYXHbEWlm0mLGY7lZoAnzF4IXWqnPG0/edit')
}

const IncidentResponse: Tool = {
  name: 'Incident Response',
  description: 'How to respond to SEV-1 and SEV-2 incidents',
  team: 'misc',
  keywords: ['incident', 'process', 'outage'],
  primaryLink: prodLink('https://docs.google.com/document/d/1HQxblYg0nh48UJlmh_qlWHfXB5EYJRStcKvoWAqyM_Y')
}

const AWSBudgets: Tool = {
  name: 'AWS Budgets',
  description: 'Track costs for the department in AWS',
  team: 'misc',
  keywords: ['aws', 'spend', 'budget'],
  primaryLink: prodLink('https://eng-budgets.gutools.co.uk/'),
  links: [
    githubLink('aws-budgets')
  ]
}

const ElasticsearchNodeRotation: Tool = {
  name: 'Elasticsearch Node Rotation',
  description: 'Safely rotate in a new Elasticsearch node.  See links on a given execution step to logs for that step. Used by various teams (see riff-raff.yaml deployments)',
  team: 'misc',
  keywords: ['elasticsearch', 'rotate', 'lambda'],
  primaryLink: githubLink('elasticsearch-node-rotation'),
  links: [
    {
      description: 'AWS Console',
      url: new URL('https://eu-west-1.console.aws.amazon.com/states/home?region=eu-west-1#/statemachines')
    }
  ]
}

const ImageUrlSigner: Tool = {
  name: 'Image URL Signer',
  description: 'Generates URLs for the Fastly IO image resizer',
  team: 'misc',
  keywords: ['image', 'fastly', 'resizer', 'optimisation'],
  primaryLink: prodLink('http://image-url-signer.s3-website-eu-west-1.amazonaws.com/'),
  links: [
    githubLink('image-url-signer-lambda')
  ]
}

const Snyk: Tool = {
  name: 'Snyk',
  description: 'Snyk. Use your @guardian.co.uk address to login. You also need to be a member of the engineering@theguardian.com group (ask your manager to add you).',
  team: 'misc',
  keywords: ['snyk', 'security'],
  primaryLink: {
    description: 'login',
    url: new URL('https://app.snyk.io/login/sso')
  }
}

const InterviewQuestions: Tool = {
  name: 'Interview Questions',
  description: 'Guardian Engineering Interview Questions',
  team: 'misc',
  keywords: ['interview', 'questions', 'coding exercise'],
  primaryLink: {
    description: 'dashboard',
    url: new URL('https://interviews.gutools.co.uk')
  },
  links: [
    githubLink('interview-questions'),
    codeLink('https://interviews.code.dev-gutools.co.uk/')
  ]
}


const CvRedact: Tool = {
  name: 'CV Redact',
  description: 'Tool for redacting CVs in pdf format for name-blind recruitment',
  team: 'misc',
  keywords: ['cv', 'redact', 'diversity', 'recruitment'],
  primaryLink: {
    description: 'dashboard',
    url: new URL('https://cv-redact.gutools.co.uk')
  },
  links: [
    githubLink('redact-pdf'),
  ]
}

const SelfAssessment: Tool = {
  name: 'Self Assessment',
  description: 'A CLI tool that generates a list of pull requests raised and reviewed in the Guardian\'s GitHub organisation, as well as an optional summary of the user\'s Trello boards and cards.',
  team: 'misc',
  keywords: ['self assessment', 'cli tool', 'github', 'trello'],
  primaryLink: githubLink('self-assessment'),
  links: [
    {
      description: 'Crate registry',
      url: new URL('https://crates.io/crates/self-assessment')
    }
  ]
}

const Galaxies: Tool = {
  name: 'Galaxies',
  description:
    'An irregular org chart. Browse a visual directory of people, teams, and streams in the Guardian P&E department',
  team: 'misc',
  keywords: ['org chart', 'teams', 'streams', 'info', 'directory'],
  primaryLink: prodLink('https://galaxies.gutools.co.uk/'),
  links: [
    githubLink('galaxies'),
    codeLink('https://galaxies.code.dev-gutools.co.uk/')
  ],
};

const TheKingsPath: Tool = {
  name: 'The Kings Path',
  description:
    'Helps you navigate the office at Kings Place',
  team: 'misc',
  keywords: ['kings place', 'office', 'navigation', 'meeting room', 'route', 'router'],
  primaryLink: prodLink('https://office-router.gutools.co.uk/'),
  links: [
    githubLink('the-kings-path'),
    codeLink('https://office-router.code.dev-gutools.co.uk/')
  ],
};

const All: Array<Tool> = [
  Sentry,
  BigBrother,
  HrSystem,
  AdminGuide,
  IncidentResponse,
  AWSBudgets,
  ElasticsearchNodeRotation,
  ImageUrlSigner,
  Snyk,
  InterviewQuestions,
  CvRedact,
  SelfAssessment,
  Galaxies,
  TheKingsPath
]

export default All
