import Docker from "dockerode";
import { getContainerMetadata, launchContainerFromFile, runCommandInContainer, stopContainerByConfigFile } from "../container/containerManager";
import Table from "cli-table3";
import { Column, extractJsonFromString, getNestedProperty, trimQuotes } from "./lib";

const docker = new Docker();
export class SQLEngine {
  private tables: { [tableName: string]: Column[] } = {};
  private data: { [tableName: string]: any[] } = {};

  createTable(tableName: string, columns: Column[]) {
    if (Object.keys(this.tables).includes(tableName)) {
      console.log(`Table with name ${tableName} already exists`);
      return;
    }
    this.tables[tableName] = columns;
    this.data[tableName] = [];
    console.log(`Table ${tableName} created with columns:`, columns);
  }

  insertData(tableName: string, values: any[]) {
    const table = this.tables[tableName];
    if (table) {
      const rowData: any = {};
      for (let index = 0; index < table.length; index++) {
        const col = table[index];
        rowData[col.name] = trimQuotes(values[index]);
      }
      this.data[tableName].push(rowData);
      console.log(`Inserted into ${tableName}:`, rowData);
    } else {
      console.log(`Table ${tableName} doesn't exist.`);
    }
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
              const metadata = await getContainerMetadata(
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
              const result = await runCommandInContainer(
                row[dockerColName],
                command
              );
              if (match) {
                const jsonResult = extractJsonFromString(result || "{}"); // Extract JSON from result
                const property = match[2];
                const propertyValue = jsonResult
                  ? getNestedProperty(jsonResult, property)
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
      await this.stopAndRemoveContainers(tableName);

      // Delete the table and its records
      delete this.tables[tableName];
      delete this.data[tableName];

      console.log(`Table ${tableName} and its records have been dropped.`);
    } else {
      console.log(`Table ${tableName} does not exist.`);
    }
  }

  async stopAndRemoveContainers(tableName: string) {
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
          stopContainerByConfigFile(dockerConfigPath);
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
        launchContainerFromFile(dockerConfigPath);
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
