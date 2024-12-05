const teams = [
  'data-tech',
  'editorial-tools',
  'devx',
  'misc',
  'dotcom',
  'ophan',
  'design-system',
  'capi',
  'investigations',
  'transparency-consent',
  'supporter-revenue'
] as const

export type Team = typeof teams[number]

export const Teams: Array<Team> = [...teams].sort()
