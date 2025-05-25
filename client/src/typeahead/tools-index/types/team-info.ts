import { Team } from "./team";
import { Link } from "./link";

export interface TeamInfo {
  team: Team;
  description: string;
  links?: Link[];
}
