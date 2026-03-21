import React from "react";

export type DataSource = "content-api" | "tools-index" | "content-api-simple-input";

interface ConfigPanelProps {
  dataSource: DataSource;
  onDataSourceChange: (source: DataSource) => void;
  endpoint: string;
  onEndpointChange: (endpoint: string) => void;
  value: string;
  onValueChange: (value: string) => void;
}

export const ConfigPanel = ({
  dataSource,
  onDataSourceChange,
  endpoint,
  onEndpointChange,
  value,
  onValueChange: onvalueChange,
}: ConfigPanelProps) => (
  <div>
    <h2>Config</h2>
    <div className="Page__Config">
      <div>
        <select
          id="data-source"
          value={dataSource}
          onChange={(e) =>
            onDataSourceChange(
              (e.target as HTMLSelectElement).value as DataSource,
            )
          }
        >
          <option value="content-api">Search content API</option>
          <option value="tools-index">Search Tools Index</option>
          <option value="content-api-simple-input">
            Content API simple input
          </option>
        </select>
      </div>
      <div>
        <input
          id="programmatic-input"
          type="text"
          placeholder="Edit the search field programmatically"
          value={value}
          onInput={(e) =>
            onvalueChange((e.target as HTMLInputElement).value)
          }
        />
      </div>
      <div className="CqlSandbox__input-container">
        <input
          type="text"
          id="endpoint"
          placeholder="Add a CQL language server endpoint"
          value={endpoint}
          onInput={(e) =>
            onEndpointChange((e.target as HTMLInputElement).value)
          }
        />
      </div>
    </div>
  </div>
);
