const awsAccounts = [
  "composer",
  "media-service",
  "cmsFronts",
  "workflow",
  "discussion",
  "deployTools",
  "frontend",
  "ophan",
  "capi",
  "investigations",
  "editorial-feeds",
] as const;

export type AwsAccount = (typeof awsAccounts)[number];

export const AwsAccounts: Array<AwsAccount> = [...awsAccounts].sort();
