import { Tool } from "../types/tool";
import { prodLink } from "../types/link";

const BigQuery: Tool = {
  name: 'Big Query Console',
  description: 'BigQuery is a serverless and cost-effective enterprise data warehouse',
  team: 'data-tech',
  keywords: ['BigQuery'],
  primaryLink: prodLink('https://console.cloud.google.com/bigquery'),
  links: []
}

const All: Array<Tool> = [
  BigQuery,
]

export default All
