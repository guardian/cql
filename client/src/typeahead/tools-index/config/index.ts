import { Tool } from "../types/tool";
import { Team } from "../types/team";
import EditorialTools from "./editorial-tools";
import DataTech from "./data-tech";
import DesignSystem from "./design-system";
import DevXTools from "./devx";
import Dotcom from "./dotcom";
import Misc from "./misc";
import Ophan from "./ophan";
import Capi from "./capi";
import Investigations from "./investigations";
import TransparencyConsent from "./transparency-consent";
import SupporterRevenue from "./supporter-revenue";
import { TextSuggestionOption } from "../../../lang/types.ts";
import AllTeamInfo from "./team-info.ts";

const AllTools = [
  ...DataTech,
  ...DesignSystem,
  ...DevXTools,
  ...Dotcom,
  ...EditorialTools,
  ...Misc,
  ...Ophan,
  ...Capi,
  ...Investigations,
  ...TransparencyConsent,
  ...SupporterRevenue,
];

export const toolsSuggestionOptionResolvers: TextSuggestionOption[] =
  AllTeamInfo.sort((a, b) => {
    if (a.team < b.team) {
      return -1;
    }
    if (a.team > b.team) {
      return 1;
    }
    return 0;
  }).map(
    (team) => new TextSuggestionOption(team.team, team.team, team.description),
  );

function sortByName(tools: Array<Tool>): Array<Tool> {
  return tools.sort((a, b) => {
    if (a.name < b.name) {
      return -1;
    }
    if (a.name > b.name) {
      return 1;
    }
    return 0;
  });
}

export function getToolsByTeams(teams: Array<Team>): Array<Tool> {
  return sortByName(
    AllTools.filter((tool) => teams.filter((_) => _ === tool.team).length > 0),
  );
}

export default sortByName(AllTools);
