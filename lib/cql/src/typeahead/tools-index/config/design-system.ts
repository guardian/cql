import { Tool } from "../types/tool";
import { prodLink, githubLink } from "../types/link";

const Source: Tool = {
  name: "Source Design System",
  description:
    "Documentation and styleguide for the Guardian's digital design system",
  team: "design-system",
  keywords: ["design", "components", "library"],
  primaryLink: prodLink("https://zeroheight.com/2a1e5182b"),
  links: [githubLink("source-components")],
};

const All: Array<Tool> = [Source];

export default All;
