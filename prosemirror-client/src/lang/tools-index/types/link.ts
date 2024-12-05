export interface Link {
  description: string,
  url: URL
}

export function prodLink(url: string): Link {
  return {
    description: 'PROD',
    url: new URL(url)
  }
}

export function codeLink(url: string): Link {
  return {
    description: 'CODE',
    url: new URL(url)
  }
}

export function githubLink(repoName: string): Link {
  return {
    description: 'GitHub Repository',
    url: new URL(`https://github.com/guardian/${repoName}`)
  }
}

export function riffRaffLink(projectName: string): Link {
  return {
    description: 'Previous deploys',
    url: new URL(`https://riffraff.gutools.co.uk/deployment/history?projectName=${projectName}`)
  }
}
