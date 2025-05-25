import { Tool } from "../types/tool";
import { prodLink, githubLink, riffRaffLink, codeLink } from "../types/link";

const Composer: Tool = {
  name: "Composer",
  description: "Making Articles",
  team: "editorial-tools",
  keywords: ["cms", "article"],
  primaryLink: prodLink("https://composer.gutools.co.uk"),
  awsAccount: "composer",
  links: [
    githubLink("flexible-content"),
    codeLink("https://composer.code.dev-gutools.co.uk"),
    {
      description: "PROD logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/kibana#/discover?_g=(filters:!())&_a=(columns:!(_source),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:flexible),type:phrase,value:flexible),query:(match:(stack:(query:flexible,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:PROD),type:phrase,value:PROD),query:(match:(stage:(query:PROD,type:phrase))))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:'app:%20apiv2%20OR%20app:%20%22composer-backend%22%20OR%20app:%20integration%20OR%20app:%20composer'),sort:!('@timestamp',desc))`,
      ),
    },
    {
      description: "CODE logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/kibana#/discover?_g=(filters:!())&_a=(columns:!(_source),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:flexible),type:phrase,value:flexible),query:(match:(stack:(query:flexible,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:CODE),type:phrase,value:CODE),query:(match:(stage:(query:CODE,type:phrase))))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:'app:%20apiv2%20OR%20app:%20%22composer-backend%22%20OR%20app:%20integration%20OR%20app:%20composer'),sort:!('@timestamp',desc))`,
      ),
    },
    riffRaffLink("Editorial Tools::Flexible Content"),
  ],
};

const MediaAtomMaker: Tool = {
  name: "Media Atom Maker",
  description: "Making Videos",
  team: "editorial-tools",
  keywords: ["video", "media", "atom", "pluto"],
  primaryLink: prodLink("https://video.gutools.co.uk"),
  awsAccount: "media-service",
  links: [
    githubLink("media-atom-maker"),
    codeLink("https://video.code.dev-gutools.co.uk"),
    {
      description: "PROD logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/discover#/?_g=()&_a=(columns:!(),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:PROD),type:phrase),query:(match_phrase:(stage:PROD))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:media-service),type:phrase),query:(match_phrase:(stack:(query:media-service)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:app,negate:!f,params:(query:media-atom-maker),type:phrase),query:(match_phrase:(app:(query:media-atom-maker))))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:''),sort:!('@timestamp',desc))`,
      ),
    },
    {
      description: "CODE logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/discover#/?_g=()&_a=(columns:!(),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:media-service),type:phrase),query:(match_phrase:(stack:(query:media-service)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:app,negate:!f,params:(query:media-atom-maker),type:phrase),query:(match_phrase:(app:(query:media-atom-maker)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:CODE),type:phrase),query:(match_phrase:(stage:CODE)))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:''),sort:!('@timestamp',desc))`,
      ),
    },
    riffRaffLink("media-service:media-atom-maker"),
  ],
};

const Grid: Tool = {
  name: "Grid",
  description: "Managing Images",
  team: "editorial-tools",
  keywords: ["image", "picture"],
  primaryLink: prodLink("https://media.gutools.co.uk"),
  awsAccount: "media-service",
  links: [
    githubLink("grid"),
    codeLink("https://media.test.dev-gutools.co.uk"),
    {
      description: "PROD cerebro",
      url: new URL("https://cerebro.media.gutools.co.uk/"),
    },
    {
      description: "CODE cerebro",
      url: new URL("https://cerebro.media.test.dev-gutools.co.uk/"),
    },
    {
      description: "PROD logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/kibana#/discover?_g=(filters:!())&_a=(columns:!(_source),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:a35a6090-59d7-11e8-bbe4-cbb5b151b19c,key:stack,negate:!f,params:(query:media-service),type:phrase,value:media-service),query:(match:(stack:(query:media-service,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:a35a6090-59d7-11e8-bbe4-cbb5b151b19c,key:app,negate:!t,params:(query:media-atom-maker),type:phrase,value:media-atom-maker),query:(match:(app:(query:media-atom-maker,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:a35a6090-59d7-11e8-bbe4-cbb5b151b19c,key:stage,negate:!f,params:(query:PROD),type:phrase,value:PROD),query:(match:(stage:(query:PROD,type:phrase))))),index:a35a6090-59d7-11e8-bbe4-cbb5b151b19c,interval:auto,query:(language:lucene,query:''),sort:!('@timestamp',desc))`,
      ),
    },
    {
      description: "TEST logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/kibana#/discover?_g=(filters:!())&_a=(columns:!(_source),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:a35a6090-59d7-11e8-bbe4-cbb5b151b19c,key:stack,negate:!f,params:(query:media-service),type:phrase,value:media-service),query:(match:(stack:(query:media-service,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:a35a6090-59d7-11e8-bbe4-cbb5b151b19c,key:app,negate:!t,params:(query:media-atom-maker),type:phrase,value:media-atom-maker),query:(match:(app:(query:media-atom-maker,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:a35a6090-59d7-11e8-bbe4-cbb5b151b19c,key:stage,negate:!f,params:(query:TEST),type:phrase,value:TEST),query:(match:(stage:(query:TEST,type:phrase))))),index:a35a6090-59d7-11e8-bbe4-cbb5b151b19c,interval:auto,query:(language:lucene,query:''),sort:!('@timestamp',desc))`,
      ),
    },
    {
      description: "Radiator",
      url: new URL(
        `https://metrics.gutools.co.uk/d/MYer9zQZk/media-service-overview?orgId=1`,
      ),
    },
    riffRaffLink("media-service::grid::all"),
  ],
};

const Workflow: Tool = {
  name: "Workflow",
  description: "Managing content through production",
  team: "editorial-tools",
  keywords: ["production", "tracking"],
  primaryLink: prodLink("https://workflow.gutools.co.uk"),
  awsAccount: "workflow",
  links: [
    githubLink("workflow"),
    codeLink("https://workflow.code.dev-gutools.co.uk"),
    {
      description: "PROD logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/kibana#/discover?_g=()&_a=(columns:!(_source),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:description,negate:!f,params:(query:PROD,type:phrase),type:phrase,value:PROD),query:(match:(description:(query:PROD,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:workflow,type:phrase),type:phrase,value:workflow),query:(match:(stack:(query:workflow,type:phrase))))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:'app:+workflow-frontend+OR+app:+prole+OR+app:+datastore+OR+app:+archiver'),sort:!('@timestamp',desc))`,
      ),
    },
    {
      description: "CODE logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/kibana#/discover?_g=()&_a=(columns:!(_source),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:workflow,type:phrase),type:phrase,value:workflow),query:(match:(stack:(query:workflow,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:description,negate:!f,params:(query:CODE,type:phrase),type:phrase,value:CODE),query:(match:(description:(query:CODE,type:phrase))))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:'app:+workflow-frontend+OR+app:+prole+OR+app:+datastore+OR+app:+archiver'),sort:!('@timestamp',desc))`,
      ),
    },
    riffRaffLink("Editorial Tools::Workflow"),
  ],
};
const FrontsTool: Tool = {
  name: "Fronts Tool",
  description: "Manages fronts",
  team: "editorial-tools",
  keywords: ["fronts", "editions"],
  primaryLink: prodLink("https://fronts.gutools.co.uk"),
  awsAccount: "cmsFronts",
  links: [
    githubLink("facia-tool"),
    codeLink("https://fronts.code.dev-gutools.co.uk"),
    {
      description: "PROD logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/kibana#/discover?_g=(filters:!())&_a=(columns:!(_source),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:app,negate:!f,params:(query:facia-tool),type:phrase,value:facia-tool),query:(match:(app:(query:facia-tool,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:cms-fronts),type:phrase,value:cms-fronts),query:(match:(stack:(query:cms-fronts,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:PROD),type:phrase,value:{PROD}),query:(match:(stage:(query:PROD,type:phrase))))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:''),sort:!('@timestamp',desc))`,
      ),
    },
    {
      description: "CODE logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/kibana#/discover?_g=(filters:!())&_a=(columns:!(_source),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:app,negate:!f,params:(query:facia-tool),type:phrase,value:facia-tool),query:(match:(app:(query:facia-tool,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:cms-fronts),type:phrase,value:cms-fronts),query:(match:(stack:(query:cms-fronts,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:CODE),type:phrase,value:CODE),query:(match:(stage:(query:CODE,type:phrase))))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:''),sort:!('@timestamp',desc))`,
      ),
    },
    riffRaffLink("cms-fronts::facia-tool"),
  ],
};

const BreakingNewsTool: Tool = {
  name: "Breaking News Tool",
  description: "Manages breaking news",
  team: "editorial-tools",
  keywords: ["fronts", "breaking-news"],
  primaryLink: prodLink("https://fronts.gutools.co.uk/breaking-news"),
  awsAccount: "cmsFronts",
  links: [
    githubLink("facia-tool"),
    codeLink("https://fronts.code.dev-gutools.co.uk/breaking-news"),
    {
      description: "PROD logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/kibana#/discover?_g=(filters:!())&_a=(columns:!(_source),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:app,negate:!f,params:(query:facia-tool),type:phrase,value:facia-tool),query:(match:(app:(query:facia-tool,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:cms-fronts),type:phrase,value:cms-fronts),query:(match:(stack:(query:cms-fronts,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:PROD),type:phrase,value:{PROD}),query:(match:(stage:(query:PROD,type:phrase))))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:''),sort:!('@timestamp',desc))`,
      ),
    },
    {
      description: "CODE logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/kibana#/discover?_g=(filters:!())&_a=(columns:!(_source),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:app,negate:!f,params:(query:facia-tool),type:phrase,value:facia-tool),query:(match:(app:(query:facia-tool,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:cms-fronts),type:phrase,value:cms-fronts),query:(match:(stack:(query:cms-fronts,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:CODE),type:phrase,value:CODE),query:(match:(stage:(query:CODE,type:phrase))))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:''),sort:!('@timestamp',desc))`,
      ),
    },
    riffRaffLink("cms-fronts::facia-tool"),
  ],
};

const AtomWorkshop: Tool = {
  name: "Atom Workshop",
  description: "Creating simple Atoms",
  team: "editorial-tools",
  keywords: ["atom", "cta"],
  primaryLink: prodLink("https://atomworkshop.gutools.co.uk"),
  awsAccount: "composer",
  links: [
    githubLink("atom-workshop"),
    codeLink("https://atomworkshop.code.dev-gutools.co.uk"),
    {
      description: "PROD logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/discover#/?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:app,negate:!f,params:(query:atom-workshop),type:phrase),query:(match_phrase:(app:(query:atom-workshop)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:flexible),type:phrase),query:(match_phrase:(stack:(query:flexible)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:PROD),type:phrase),query:(match_phrase:(stage:PROD)))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:''),sort:!('@timestamp',desc))`,
      ),
    },
    {
      description: "CODE logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/discover#/?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:app,negate:!f,params:(query:atom-workshop),type:phrase),query:(match_phrase:(app:(query:atom-workshop)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:flexible),type:phrase),query:(match_phrase:(stack:(query:flexible)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:CODE),type:phrase),query:(match_phrase:(stage:CODE)))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:''),sort:!('@timestamp',desc))`,
      ),
    },
    riffRaffLink("editorial-tools:atom-workshop"),
  ],
};

const TagManager: Tool = {
  name: "Tag Manager",
  description: "Managing Tags",
  team: "editorial-tools",
  keywords: ["tags"],
  primaryLink: prodLink("https://tagmanager.gutools.co.uk"),
  awsAccount: "composer",
  links: [
    githubLink("tagmanager"),
    codeLink("https://tagmanager.code.dev-gutools.co.uk"),
    {
      description: "PROD logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/kibana#/discover?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(_source),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:flexible,type:phrase),type:phrase,value:flexible),query:(match:(stack:(query:flexible,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:app,negate:!f,params:(query:tag-manager,type:phrase),type:phrase,value:tag-manager),query:(match:(app:(query:tag-manager,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:PROD,type:phrase),type:phrase,value:PROD),query:(match:(stage:(query:PROD,type:phrase))))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:''),sort:!('@timestamp',desc))`,
      ),
    },
    {
      description: "CODE logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/kibana#/discover?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(_source),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:flexible,type:phrase),type:phrase,value:flexible),query:(match:(stack:(query:flexible,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:app,negate:!f,params:(query:tag-manager,type:phrase),type:phrase,value:tag-manager),query:(match:(app:(query:tag-manager,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:CODE,type:phrase),type:phrase,value:CODE),query:(match:(stage:(query:CODE,type:phrase))))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:''),sort:!('@timestamp',desc))`,
      ),
    },
    riffRaffLink("editorial-tools:tag-manager"),
  ],
};

const Restorer: Tool = {
  name: "Restorer",
  description: "Restoring Composer from 5 minute snapshots",
  team: "editorial-tools",
  keywords: ["restore", "snapshot"],
  primaryLink: prodLink("https://restorer.gutools.co.uk"),
  awsAccount: "composer",
  links: [
    githubLink("flexible-restorer"),
    codeLink("https://restorer.code.dev-gutools.co.uk"),
    {
      description: "PROD logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/discover#/?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:flexible),type:phrase),query:(match_phrase:(stack:(query:flexible)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:app,negate:!f,params:(query:restorer2),type:phrase),query:(match_phrase:(app:(query:restorer2)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:PROD),type:phrase),query:(match_phrase:(stage:PROD)))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:restorer),sort:!('@timestamp',desc))`,
      ),
    },
    {
      description: "CODE logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/discover#/?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:flexible),type:phrase),query:(match_phrase:(stack:(query:flexible)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:CODE),type:phrase),query:(match_phrase:(stage:CODE))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:app,negate:!f,params:(query:restorer2),type:phrase),query:(match_phrase:(app:(query:restorer2))))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:restorer),sort:!('@timestamp',desc))`,
      ),
    },
    riffRaffLink("editorial-tools:flexible:restorer2"),
  ],
};

const Teleporter: Tool = {
  name: "Teleporter",
  description: "Jumping between Tools",
  team: "editorial-tools",
  keywords: ["gustaf"],
  primaryLink: {
    description: "install",
    url: new URL(
      "https://s3-eu-west-1.amazonaws.com/gustaf-dist/composer/index.html",
    ),
  },
  links: [
    githubLink("teleporter"),
    riffRaffLink("Editorial Tools::Teleporter"),
  ],
};

const QuizBuilder: Tool = {
  name: "Quiz Builder",
  description: "Building Quiz Atoms",
  team: "editorial-tools",
  keywords: ["quiz"],
  primaryLink: prodLink("https://quizzes.gutools.co.uk"),
  awsAccount: "composer",
  links: [
    githubLink("ten-four_quiz-builder"),
    codeLink("https://quizzes.code.dev-gutools.co.uk"),
    riffRaffLink("ten-four_quiz-builder"),
  ],
};

const Viewer: Tool = {
  name: "Viewer",
  description: "Previewing Composer Content",
  team: "editorial-tools",
  keywords: ["preview"],
  primaryLink: prodLink("https://viewer.gutools.co.uk"),
  awsAccount: "composer",
  links: [
    githubLink("editorial-viewer"),
    codeLink("https://viewer.code.dev-gutools.co.uk"),
    {
      description: "PROD logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/discover#/?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:flexible),type:phrase),query:(match_phrase:(stack:(query:flexible)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:app,negate:!f,params:(query:viewer),type:phrase),query:(match_phrase:(app:(query:viewer)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:PROD),type:phrase),query:(match_phrase:(stage:PROD)))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:viewer),sort:!('@timestamp',desc))`,
      ),
    },
    {
      description: "CODE logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/discover#/?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:flexible),type:phrase),query:(match_phrase:(stack:(query:flexible)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:app,negate:!f,params:(query:viewer),type:phrase),query:(match_phrase:(app:(query:viewer)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:CODE),type:phrase),query:(match_phrase:(stage:CODE)))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:viewer),sort:!('@timestamp',desc))`,
      ),
    },
    riffRaffLink("editorial-tools:viewer"),
  ],
};
const S3Uploader: Tool = {
  name: "S3 Uploader",
  description: "A place to upload files for use in Content",
  team: "editorial-tools",
  keywords: ["upload"],
  primaryLink: prodLink("https://s3-uploader.gutools.co.uk"),
  awsAccount: "media-service",
  links: [
    githubLink("s3-upload"),
    codeLink("https://s3-uploader.code.dev-gutools.co.uk"),
    riffRaffLink("media-service::s3-uploader"),
  ],
};

const Permissions: Tool = {
  name: "Permissions",
  description: "Managing permission to features in our Tools",
  team: "editorial-tools",
  primaryLink: prodLink("https://permissions.gutools.co.uk"),
  awsAccount: "workflow",
  links: [
    githubLink("permissions"),
    codeLink("https://permissions.code.dev-gutools.co.uk"),
    {
      description: "PROD logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/discover#/?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:app,negate:!f,params:(query:permissions),type:phrase),query:(match_phrase:(app:(query:permissions)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:workflow),type:phrase),query:(match_phrase:(stack:(query:workflow)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:PROD),type:phrase),query:(match_phrase:(stage:PROD)))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:permissions),sort:!('@timestamp',desc))`,
      ),
    },
    {
      description: "CODE logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/discover#/?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:app,negate:!f,params:(query:permissions),type:phrase),query:(match_phrase:(app:(query:permissions)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:workflow),type:phrase),query:(match_phrase:(stack:(query:workflow)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:CODE),type:phrase),query:(match_phrase:(stage:CODE)))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:permissions),sort:!('@timestamp',desc))`,
      ),
    },
    riffRaffLink("editorial-tools:permissions"),
  ],
};

const ProductionMonitoring: Tool = {
  name: "ProdMon",
  description: `Testing the Guardian's ability to publish`,
  team: "editorial-tools",
  primaryLink: prodLink("https://prodmon.gutools.co.uk"),
  awsAccount: "composer",
  keywords: ["prodmon"],
  links: [
    githubLink("editorial-tools-production-monitoring"),
    {
      description: "PROD logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/kibana#/discover?_g=(filters:!())&_a=(columns:!(_source),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:flexible),type:phrase,value:flexible),query:(match:(stack:(query:flexible,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:app,negate:!f,params:(query:production-monitoring),type:phrase,value:production-monitoring),query:(match:(app:(query:production-monitoring,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:PROD),type:phrase,value:PROD),query:(match:(stage:(query:PROD,type:phrase))))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:''),sort:!('@timestamp',desc))`,
      ),
    },
    riffRaffLink("editorial-tools:production-monitoring"),
  ],
};

const ProductionMonitoringSecondary: Tool = {
  name: "ProdMon Secondary",
  description: `Testing the Guardian's ability to publish against Composer Secondary`,
  team: "editorial-tools",
  primaryLink: prodLink("https://prodmon-secondary.gutools.co.uk"),
  awsAccount: "composer",
  keywords: ["prodmon", "secondary"],
  links: [
    githubLink("editorial-tools-production-monitoring"),
    {
      description: "PROD logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/kibana#/discover?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(columns:!(_source),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:flexible-secondary),type:phrase,value:flexible-secondary),query:(match:(stack:(query:flexible-secondary,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:app,negate:!f,params:(query:production-monitoring),type:phrase,value:production-monitoring),query:(match:(app:(query:production-monitoring,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:PROD),type:phrase,value:PROD),query:(match:(stage:(query:PROD,type:phrase))))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:''),sort:!('@timestamp',desc))`,
      ),
    },
    riffRaffLink("editorial-tools:production-monitoring"),
  ],
};

const Targeting: Tool = {
  name: "Targeting",
  description:
    "Manages associations between tags and embeds/targeted campaigns",
  team: "editorial-tools",
  primaryLink: prodLink("https://targeting.gutools.co.uk"),
  awsAccount: "composer",
  links: [
    githubLink("targeting"),
    codeLink("https://targeting.code.dev-gutools.co.uk"),
    {
      description: "PROD logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/kibana#/discover?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(_source),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:app,negate:!f,params:(query:targeting,type:phrase),type:phrase,value:targeting),query:(match:(app:(query:targeting,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:flexible,type:phrase),type:phrase,value:flexible),query:(match:(stack:(query:flexible,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:description,negate:!f,params:(query:PROD,type:phrase),type:phrase,value:PROD),query:(match:(description:(query:PROD,type:phrase))))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:''),sort:!('@timestamp',desc))`,
      ),
    },
    {
      description: "CODE logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/kibana#/discover?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(_source),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:app,negate:!f,params:(query:targeting,type:phrase),type:phrase,value:targeting),query:(match:(app:(query:targeting,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:flexible,type:phrase),type:phrase,value:flexible),query:(match:(stack:(query:flexible,type:phrase)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:description,negate:!f,params:(query:CODE,type:phrase),type:phrase,value:CODE),query:(match:(description:(query:CODE,type:phrase))))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:''),sort:!('@timestamp',desc))`,
      ),
    },
    riffRaffLink("editorial-tools:targeting"),
  ],
};

const StoryPackages: Tool = {
  name: "Story Packages",
  description: "Manages story packages",
  team: "editorial-tools",
  keywords: ["packages"],
  primaryLink: prodLink("https://packages.gutools.co.uk"),
  awsAccount: "cmsFronts",
  links: [
    githubLink("story-packages"),
    codeLink("https://packages.code.dev-gutools.co.uk"),
    {
      description: "PROD logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/discover#/?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:app,negate:!f,params:(query:story-packages),type:phrase),query:(match_phrase:(app:(query:story-packages)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:cms-fronts),type:phrase),query:(match_phrase:(stack:(query:cms-fronts)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:PROD),type:phrase),query:(match_phrase:(stage:PROD)))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:''),sort:!('@timestamp',desc))`,
      ),
    },
    {
      description: "CODE logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/discover#/?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:app,negate:!f,params:(query:story-packages),type:phrase),query:(match_phrase:(app:(query:story-packages)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:cms-fronts),type:phrase),query:(match_phrase:(stack:(query:cms-fronts)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:CODE),type:phrase),query:(match_phrase:(stage:CODE)))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:''),sort:!('@timestamp',desc))`,
      ),
    },
    riffRaffLink("cms-fronts::story-packages"),
  ],
};

const ComposerSecondary: Tool = {
  name: "Composer Secondary",
  description: "A secondary instance of Composer *FOR EMERGENCY USE ONLY*",
  team: "editorial-tools",
  keywords: ["cms", "article", "secondary"],
  primaryLink: prodLink("https://composer-secondary.gutools.co.uk"),
  awsAccount: "composer",
  links: [
    codeLink("https://composer-secondary.code.dev-gutools.co.uk"),
    {
      description: "PROD logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/discover#/?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:flexible-secondary),type:phrase),query:(match_phrase:(stack:(query:flexible-secondary)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:PROD),type:phrase),query:(match_phrase:(stage:PROD)))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:secondary),sort:!('@timestamp',desc))`,
      ),
    },
    {
      description: "CODE logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/discover#/?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stack,negate:!f,params:(query:flexible-secondary),type:phrase),query:(match_phrase:(stack:(query:flexible-secondary)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b95116a0-59d7-11e8-ba01-2b66550a44f2,key:stage,negate:!f,params:(query:CODE),type:phrase),query:(match_phrase:(stage:CODE)))),index:b95116a0-59d7-11e8-ba01-2b66550a44f2,interval:auto,query:(language:lucene,query:secondary),sort:!('@timestamp',desc))`,
      ),
    },
    riffRaffLink("Editorial Tools::Flexible Content"),
  ],
};

const SftpUserManager: Tool = {
  name: "SFTP User Manager",
  description: "Create and manages users for access to Guardian SFTP",
  team: "editorial-tools",
  keywords: ["sftp"],
  primaryLink: prodLink("https://sftp-user-manager.gutools.co.uk"),
  links: [
    githubLink("sftp-user-manager"),
    codeLink("https://sftp-user-manager.code.dev-gutools.co.uk/"),
  ],
};

const Birthdays: Tool = {
  name: "Birthdays",
  description: "View and curate database of famous people’s birthdays",
  team: "editorial-tools",
  keywords: ["birthdays"],
  primaryLink: prodLink("https://birthdays.gutools.co.uk/"),
  links: [
    githubLink("birthdays"),
    codeLink("https://birthdays.code.dev-gutools.co.uk/"),
  ],
};

const CrosswordV2: Tool = {
  name: "Crossword v2",
  description: "Upload and check crosswords",
  team: "editorial-tools",
  keywords: ["crosswords", "cms"],
  primaryLink: prodLink("https://crosswordv2.gutools.co.uk/"),
  links: [
    githubLink("crosswordv2"),
    codeLink("https://crosswordv2.code.dev-gutools.co.uk/"),
  ],
};

const ModTools: Tool = {
  name: "Mod Tools",
  description: "Moderate comments and users",
  team: "editorial-tools",
  keywords: ["discussions", "moderation"],
  primaryLink: prodLink("https://modtools.discussion.gutools.co.uk"),
  awsAccount: "discussion",
  links: [
    githubLink("discussion-modtools"),
    codeLink("https://modtools.discussion.code.dev-gutools.co.uk/"),
    {
      description: "PROD logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/discover#/?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'48952b00-6e4e-11e8-96ad-49dd90b99a91',key:app,negate:!f,params:(query:modtools-api),type:phrase),query:(match_phrase:(app:(query:modtools-api)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'48952b00-6e4e-11e8-96ad-49dd90b99a91',key:stage,negate:!f,params:(query:PROD),type:phrase),query:(match_phrase:(stage:PROD)))),index:'48952b00-6e4e-11e8-96ad-49dd90b99a91',interval:auto,query:(language:lucene,query:''),sort:!('@timestamp',desc))`,
      ),
    },
    {
      description: "CODE logs",
      url: new URL(
        `https://logs.gutools.co.uk/app/discover#/?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'48952b00-6e4e-11e8-96ad-49dd90b99a91',key:app,negate:!f,params:(query:modtools-api),type:phrase),query:(match_phrase:(app:(query:modtools-api)))),('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'48952b00-6e4e-11e8-96ad-49dd90b99a91',key:stage,negate:!f,params:(query:CODE),type:phrase),query:(match_phrase:(stage:CODE)))),index:'48952b00-6e4e-11e8-96ad-49dd90b99a91',interval:auto,query:(language:lucene,query:''),sort:!('@timestamp',desc))`,
      ),
    },
    riffRaffLink("Discussion::discussion-modtools-v2-frontend"),
  ],
};

const YouTubePfPPlayerDemo: Tool = {
  name: "YouTube PfP Player Demo",
  description: "A playground to test the YouTube PfP player",
  team: "editorial-tools",
  keywords: ["video", "youtube", "pfp"],
  primaryLink: prodLink("https://youtube-pfp-player-demo.gutools.co.uk"),
  links: [githubLink("youtube-pfp-player-demo")],
};

const EditionsCardBuilder: Tool = {
  name: "Editions Card Builder",
  description: "Create cards for the Editions app",
  team: "editorial-tools",
  keywords: ["editions", "image", "card"],
  primaryLink: prodLink("https://editions-card-builder.gutools.co.uk"),
  links: [githubLink("editions-card-builder")],
};

const Tools: Tool = {
  name: "Tools",
  description: "One-stop-shop for finding Guardian tools",
  team: "editorial-tools",
  keywords: ["tools"],
  primaryLink: prodLink("https://tools.gutools.co.uk"),
  links: [githubLink("tools-index")],
};

const Charts: Tool = {
  name: "Charts Tool",
  description: "Create basic charts",
  team: "editorial-tools",
  keywords: ["chart", "atom"],
  primaryLink: prodLink("https://charts.gutools.co.uk"),
  awsAccount: "composer",
  links: [
    githubLink("interactive-basichartool"),
    codeLink("https://charts.code.dev-gutools.co.uk"),
    riffRaffLink("basic-chart-tool"),
  ],
};

const Wires: Tool = {
  name: "Wires",
  description: "Editorial wires",
  team: "editorial-tools",
  keywords: ["wires"],
  primaryLink: prodLink("https://editorial-wires.gutools.co.uk/"),
  awsAccount: "editorial-feeds",
  links: [
    githubLink("editorial-wires"),
    codeLink("https://editorial-wires.code.dev-gutools.co.uk/"),
    riffRaffLink("Editorial Tools::Editorial wires"),
  ],
};

const RemoteMachines: Tool = {
  name: "Remote Machines",
  description: "Discover available remote machines (used for print production)",
  team: "editorial-tools",
  keywords: ["remote", "machine"],
  primaryLink: prodLink("https://remote-machines.gutools.co.uk"),
  awsAccount: "composer",
  links: [
    githubLink("remote-machines"),
    riffRaffLink("editorial-tools:remote-machines"),
  ],
};

const NewslettersTool: Tool = {
  name: "Newsletters Tool",
  description:
    "View and update information on the Guardian's editorial newsletters",
  team: "editorial-tools",
  keywords: ["newsletters"],
  primaryLink: prodLink("https://newsletters-tool.gutools.co.uk/"),
  awsAccount: "frontend",
  links: [
    githubLink("newsletters-nx"),
    riffRaffLink("newsletters::newsletters-tool"),
    codeLink("https://newsletters-tool.code.dev-gutools.co.uk/"),
  ],
};

const Typerighter: Tool = {
  name: "Typerighter",
  description: "Typerighter rule manager",
  team: "editorial-tools",
  keywords: ["typerighter"],
  primaryLink: prodLink("https://manager.typerighter.gutools.co.uk/"),
  awsAccount: "composer",
  links: [
    githubLink("typerighter"),
    codeLink("https://manager.typerighter.code.dev-gutools.co.uk/"),
    riffRaffLink("Editorial Tools::Typerighter"),
  ],
};

const All: Array<Tool> = [
  Composer,
  MediaAtomMaker,
  Grid,
  Workflow,
  FrontsTool,
  AtomWorkshop,
  TagManager,
  Typerighter,
  Restorer,
  Teleporter,
  QuizBuilder,
  Viewer,
  S3Uploader,
  Permissions,
  ProductionMonitoring,
  ProductionMonitoringSecondary,
  Targeting,
  StoryPackages,
  ComposerSecondary,
  Birthdays,
  CrosswordV2,
  ModTools,
  YouTubePfPPlayerDemo,
  EditionsCardBuilder,
  Tools,
  Charts,
  BreakingNewsTool,
  Wires,
  RemoteMachines,
  NewslettersTool,
  SftpUserManager,
];

export default All;
