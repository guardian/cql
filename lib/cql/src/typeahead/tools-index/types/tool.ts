import { AwsAccount } from "./aws-account";
import { Team } from "./team";
import { Link } from "./link";

export interface Tool {
  name: string;
  description: string;
  team: Team;
  primaryLink: Link;
  links?: Link[];
  keywords?: string[];
  awsAccount?: AwsAccount;
}
