import { Tool } from '../types/tool'
import {githubLink, prodLink} from '../types/link'

const Ophan: Tool = {
  name: 'Ophan',
  description: 'The Guardian web analytics platform',
  team: 'ophan',
  keywords: ['analytics'],
  primaryLink: prodLink('https://dashboard.ophan.co.uk/'),
  awsAccount: 'ophan',
  links: [
    githubLink('ophan'),
    {
      description: "Elasticsearch 7 monitoring",
      url: new URL("https://ophan-monitoring-es7.kb.eu-west-1.aws.found.io:9243/app/monitoring")
    }
  ]
}

const All: Array<Tool> = [
  Ophan
]

export default All
