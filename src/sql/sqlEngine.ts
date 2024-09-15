import Docker from "dockerode";
import { launchDockerFromFile } from "../docker/dockerManager";
import Table from "cli-table3";
import fs from "node:fs";

const docker = new Docker();

type Column = { name: string; type: string };

export class SQLEngine {
  private tables: { [tableName: string]: Column[] } = {};
  private data: { [tableName: string]: any[] } = {};

  createTable(tableName: string, columns: Column[]) {
    this.tables[tableName] = columns;
    this.data[tableName] = [];
    console.log(`Table ${tableName} created with columns:`, columns);
  }

  cleanValue(value: string): string {
    return value.replace(/^['"](.+)['"]$/, "$1");
  }

  insertData(tableName: string, values: any[]) {
    const table = this.tables[tableName];
    if (table) {
      const rowData: any = {};
      table.forEach((col, index) => {
        rowData[col.name] = this.cleanValue(values[index]);
      });
      this.data[tableName].push(rowData);
      console.log(`Inserted into ${tableName}:`, rowData);
    } else {
      console.log(`Table ${tableName} doesn't exist.`);
    }
  }

  // Utility to safely access nested properties, with exact casing
  getNestedProperty(obj: any, path: string) {
    return path.split(".").reduce((prev, curr) => prev && prev[curr], obj);
  }

  async getDockerMetadata(configPath: string, queryProperty?: string): Promise<any> {
    try {
      const dockerConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const containerName = dockerConfig.name || dockerConfig.container_id;
      if (!containerName) {
        throw new Error('Container name or ID not found in the config.');
      }
  
      const container = docker.getContainer(containerName);
      const inspectData = await container.inspect();
      const stats = await container.stats({ stream: false });
  
      // Create a full metadata object
      const metadata = {
        name: inspectData.Name,
        status: inspectData.State.Status,
        port: inspectData.NetworkSettings.Ports,
        cpuUsage: stats.cpu_stats?.cpu_usage?.total_usage ?? 'N/A',  // Use the checked cpuUsage value
        lastStarted: inspectData?.State?.StartedAt ?? 'N/A',         // Use the checked lastStarted value
      };
  
      // Define the valid keys for metadata
      type MetadataKey = keyof typeof metadata;
  
      // Mapping for lowercase queryProperty to camelCase metadata fields
      const metadataMapping: { [key: string]: MetadataKey } = {
        'name': 'name',
        'status': 'status',
        'port': 'port',
        'cpuusage': 'cpuUsage',
        'laststarted': 'lastStarted',
      };
  
      // If a specific property is requested (e.g., 'name', 'status', 'port', 'cpuUsage', 'lastStarted')
      if (queryProperty) {
        const lowerCaseQuery = queryProperty.toLowerCase();
  
        // Check if lowerCaseQuery is a valid key in metadataMapping
        if (lowerCaseQuery in metadataMapping) {
          const camelCaseKey = metadataMapping[lowerCaseQuery]; // Get the corresponding camelCase key
          return metadata[camelCaseKey]; // Return the specific metadata property
        } else {
          return 'Property not found'; // Return if the property doesn't exist
        }
      }
  
      // If no specific property requested, return the full metadata object
      return metadata;
    } catch (error) {
      console.error(`Error fetching metadata for container ${configPath}:`, error);
      return null;
    }
  }
  

  async runCommandInDocker(
    configPath: string,
    command: string
  ): Promise<string> {
    try {
      const dockerConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      const containerName = dockerConfig.name || dockerConfig.container_id;
      if (!containerName) {
        throw new Error("Container name or ID not found in the config.");
      }

      const container = docker.getContainer(containerName);
      const exec = await container.exec({
        Cmd: ["sh", "-c", command],
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({});

      return new Promise((resolve, reject) => {
        let output = "";
        stream.on("data", (data) => {
          output += data.toString();
        });

        stream.on("end", () => {
          resolve(output.trim());
        });

        stream.on("error", (err) => {
          reject(err);
        });
      });
    } catch (error) {
      console.error(
        `Error running command in Docker container ${configPath}:`,
        error
      );
      return "Error running command in Docker container";
    }
  }

  extractJsonFromString(str: string): any {
    const jsonStart = str.indexOf("{");
    const jsonEnd = str.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1) {
      try {
        const jsonString = str.substring(jsonStart, jsonEnd + 1);
        return JSON.parse(jsonString);
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  async selectData(
    tableName: string,
    columnsToSelect: string[],
    whereCondition?: { key: string; value: string | number }
  ) {
    const table = this.tables[tableName];
    const rows = this.data[tableName];

    if (table && rows) {
      let selectedColumns;

      if (columnsToSelect.length === 1 && columnsToSelect[0] === "*") {
        selectedColumns = table.map((col) => col.name);
      } else {
        selectedColumns = columnsToSelect;
      }

      let filteredRows = rows;

      if (whereCondition) {
        filteredRows = rows.filter(
          (row) => row[whereCondition.key] == whereCondition.value
        );
      }

      const cliTable = new Table({
        head: selectedColumns.map((col) => {
          if (col.includes("metadata(")) {
            const property = col.match(/metadata\((.*?)\)\.(.+)/);
            return property
              ? `${property[1]}.metadata.${property[2]}`
              : `${col.replace("metadata(", "").replace(")", "")}.metadata`;
          } else if (col.includes("run_cmd(")) {
            const dockerColName = col.split(".")[0];
            const property = col.match(/run_cmd\((.*?)\)\.(.+)/);
            return property
              ? `${dockerColName}.run_cmd.${property[2]}`
              : `${dockerColName}.run_cmd`;
          } else {
            return col;
          }
        }),
        colWidths: selectedColumns.map((col) =>
          col.includes("metadata(") || col.includes("run_cmd(") ? 50 : 20
        ), // Adjusted width for metadata/run_cmd columns
        wordWrap: true,
      });

      for (const row of filteredRows) {
        const rowData: string[] = [];

        for (const col of selectedColumns) {
          if (col.includes("metadata(")) {
            const propertyMatch = col.match(/metadata\((.*?)\)\.(.+)/);
            const colName = propertyMatch
              ? propertyMatch[1]
              : col.replace("metadata(", "").replace(")", "");
            const property = propertyMatch ? propertyMatch[2] : null;
            const dockerColumn = table.find(
              (c) => c.name === colName && c.type.toUpperCase() === "DOCKER"
            );
            if (dockerColumn) {
              // Handle special metadata cases for cpuUsage, lastStarted, name, status, port
              const metadata = await this.getDockerMetadata(
                row[colName],
                property?.toLowerCase()
              ); // Pass property as lowercase
              rowData.push(
                metadata !== undefined
                  ? JSON.stringify(metadata, null, 2)
                  : "Property not found"
              );
            } else {
              rowData.push("Invalid Docker column");
            }
          } else if (col.includes("run_cmd(")) {
            const match = col.match(/run_cmd\((.*?)\)\.(.+)/);
            const commandMatch = col.match(/run_cmd\("(.+)"\)/);
            const dockerColName = col.split(".")[0];
            const dockerColumn = table.find(
              (c) =>
                c.name === dockerColName && c.type.toUpperCase() === "DOCKER"
            );
            if (dockerColumn && commandMatch) {
              const command = commandMatch[1];
              const result = await this.runCommandInDocker(
                row[dockerColName],
                command
              );
              if (match) {
                const jsonResult = this.extractJsonFromString(result || "{}"); // Extract JSON from result
                const property = match[2];
                const propertyValue = jsonResult
                  ? this.getNestedProperty(jsonResult, property)
                  : null;
                rowData.push(
                  propertyValue !== undefined
                    ? JSON.stringify(propertyValue, null, 2)
                    : "Property not found"
                );
              } else {
                rowData.push(result || "No result");
              }
            } else {
              rowData.push("Invalid Docker column");
            }
          } else {
            rowData.push(String(row[col]));
          }
        }

        cliTable.push(rowData);
      }

      console.log(cliTable.toString());
      return filteredRows;
    } else {
      console.log(`Table ${tableName} doesn't exist.`);
    }
  }

  async dropTable(tableName: string) {
    if (this.tables[tableName]) {
      // Stop and remove Docker containers
      await this.stopAndRemoveDockerContainers(tableName);

      // Delete the table and its records
      delete this.tables[tableName];
      delete this.data[tableName];

      console.log(`Table ${tableName} and its records have been dropped.`);
    } else {
      console.log(`Table ${tableName} does not exist.`);
    }
  }

  async stopAndRemoveDockerContainers(tableName: string) {
    const table = this.tables[tableName];
    const rows = this.data[tableName];

    if (!table || !rows) {
      console.log(`Table ${tableName} doesn't exist.`);
      return;
    }

    for (const row of rows) {
      for (const col of table) {
        if (col.type.toUpperCase() === "DOCKER") {
          const dockerConfigPath = row[col.name];
          try {
            const dockerConfig = JSON.parse(
              fs.readFileSync(dockerConfigPath, "utf8")
            );
            const containerName =
              dockerConfig.name || dockerConfig.container_id;
            if (!containerName) continue;

            const container = docker.getContainer(containerName);
            await container.stop();
            await container.remove();
            console.log(`Container ${containerName} stopped and removed.`);
          } catch (error) {
            console.error(
              `Error stopping or removing Docker container ${dockerConfigPath}:`,
              error
            );
          }
        }
      }
    }
  }

  launchDocker(
    tableName: string,
    columnName: string,
    condition: { key: string; value: string | number }
  ) {
    const table = this.tables[tableName];
    const rows = this.data[tableName];

    if (table && rows) {
      const rowToLaunch = rows.find(
        (row) => row[condition.key] == condition.value
      );
      if (rowToLaunch && rowToLaunch[columnName]) {
        const dockerConfigPath = rowToLaunch[columnName].replace(/'/g, "");
        console.log(`Launching Docker for config file: ${dockerConfigPath}...`);
        launchDockerFromFile(dockerConfigPath);
      } else {
        console.log(
          `No matching row found for ${condition.key} = '${condition.value}'`
        );
      }
    } else {
      console.log(`Table ${tableName} or column ${columnName} doesn't exist.`);
    }
  }

  async parseQuery(query: string) {
    const lowerCaseQuery = query.toLowerCase().trim();
    const createTableRegex = /create table (\w+) \((.+)\)/;
    const insertRegex = /insert into (\w+) \((.+)\)/;
    const selectRegex = /select (.+) from (\w+)/;
    const whereRegex = /where (\w+) = ['"]?(.+?)['"]?/;
    const launchRegex = /launch (\w+) from (\w+) where (\w+) = ['"]?(.+?)['"]?/;
    const dropTableRegex = /drop table (\w+)/;

    const createTableMatch = lowerCaseQuery.match(createTableRegex);
    const insertMatch = lowerCaseQuery.match(insertRegex);
    const selectMatch = lowerCaseQuery.match(selectRegex);
    const whereMatch = lowerCaseQuery.match(whereRegex);
    const launchMatch = lowerCaseQuery.match(launchRegex);
    const dropTableMatch = lowerCaseQuery.match(dropTableRegex);

    if (createTableMatch) {
      const tableName = createTableMatch[1];
      const columns = createTableMatch[2].split(",").map((col) => {
        const [name, type] = col.trim().split(" ");
        return { name, type: type.toUpperCase() };
      });
      this.createTable(tableName, columns);
    } else if (insertMatch) {
      const tableName = insertMatch[1];
      const values = insertMatch[2].split(",").map((val) => val.trim());
      this.insertData(tableName, values);
    } else if (selectMatch) {
      const columns = selectMatch[1].split(",").map((col) => col.trim());
      const tableName = selectMatch[2];

      if (whereMatch) {
        const whereKey = whereMatch[1];
        const whereValue = whereMatch[2];
        await this.selectData(tableName, columns, {
          key: whereKey,
          value: whereValue,
        });
      } else {
        await this.selectData(tableName, columns);
      }
    } else if (launchMatch) {
      const columnName = launchMatch[1];
      const tableName = launchMatch[2];
      const conditionKey = launchMatch[3];
      const conditionValue = launchMatch[4];
      this.launchDocker(tableName, columnName, {
        key: conditionKey,
        value: conditionValue,
      });
    } else if (dropTableMatch) {
      const tableName = dropTableMatch[1];
      await this.dropTable(tableName);
    } else {
      console.log("Invalid query.");
    }
  }
}
