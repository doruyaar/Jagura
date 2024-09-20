import Docker from "dockerode";
import { getContainerMetadata, launchContainerFromFile, runCommandInContainer, stopContainerByConfigFile } from "../container/containerManager";
import Table from "cli-table3";
import { Column, extractJsonFromString, extractMetadataSelect, extractRunCmdSelect, getMetadataColTitle, getNestedProperty, trimQuotes } from "./lib";
import { getColsTitles } from "./lib/getColsTitles";
import { ContainerUtil } from "../container/ContainerUtil";

const docker = new Docker();
export class SQLEngine {
  private tables: { [tableName: string]: Column[] } = {};
  private data: { [tableName: string]: any[] } = {};

  getTable(name: string) {
    return this.tables[name];
  }

  getTableData(name: string) {
    return this.data[name];
  }

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
    const table = this.getTable(tableName);
    const tableData = this.getTableData(tableName);
    const rowData: any = {};
    const insertLog: any = {}

    for (let index = 0; index < table.length; index++) {
      const col = table[index];
      const key = col.name;
      const value = trimQuotes(values[index]);

      if(col.type === "DOCKER") {
        rowData[key] = new ContainerUtil(value)
      } else {
        rowData[key] = value;
      }

      insertLog[key] = value;
    }

    tableData.push(rowData);
    console.log(`Inserted into ${tableName}:`, insertLog);
  }

  async selectData(
    tableName: string,
    columnsToSelect: string[],
    whereCondition?: { key: string; value: string | number }
  ) {
    const table = this.tables[tableName];
    const rows = this.data[tableName];

    const isSelectAllColumns = columnsToSelect.length === 1 && columnsToSelect[0] === "*";

    if (table && rows) {
      const selectedColumns = isSelectAllColumns ? table.map((col) => col.name) : columnsToSelect;
      const filteredRows = whereCondition ? rows.filter(
        (row) => row[whereCondition.key] == whereCondition.value
      ): rows;


      const getColsTitlesWidth = (selectedColumns: Array<string>) => 
        selectedColumns.map((col) =>
          col.includes("metadata(") || col.includes("run_cmd(") ? 50 : 20
        )

      const cliTable = new Table({
        head: getColsTitles(selectedColumns),
        colWidths: getColsTitlesWidth(selectedColumns),
        wordWrap: true,
      });

      for (const row of filteredRows) {
        const rowData: string[] = [];

        for (const col of selectedColumns) {
          if (col.includes("metadata(")) {
            const { containerCol, field } = extractMetadataSelect(col);
            const isTableContainContainerCol = table.find(
              (c) => c.name === containerCol && c.type.toUpperCase() === "DOCKER"
            );
            if (isTableContainContainerCol) {
              const container: ContainerUtil = row[containerCol];
              const metadata = container.getMetadata(field?.toLowerCase());
              const value = metadata ? JSON.stringify(metadata, null, 2) : "Property not found"
              rowData.push(value);
            } else {
              rowData.push("Invalid Container column");
            }
          } else if (col.includes("run_cmd(")) {
            const {command, containerCol, nestedField} = extractRunCmdSelect(col);
            const isTableContainContainerCol = table.find(
              (c) =>
                c.name === containerCol && c.type.toUpperCase() === "DOCKER"
            );
            if (isTableContainContainerCol && command) {
              const container: ContainerUtil = row[containerCol];
              const cmdResult = await container.runCommand(command)
              if (nestedField) {
                const jsonResult = extractJsonFromString(cmdResult || "{}");
                const propertyValue = jsonResult
                  ? getNestedProperty(jsonResult, nestedField)
                  : null;
                rowData.push(
                  propertyValue !== undefined
                    ? JSON.stringify(propertyValue, null, 2)
                    : "Property not found"
                );
              } else {
                rowData.push(cmdResult || "No result");
              }
            } else {
              rowData.push("Invalid Docker column");
            }
          } else {
            const value = row[col].identifier ? row[col].identifier : String(row[col]);
            rowData.push(value);
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
      await this.stopAndRemoveContainers(tableName);
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

  async launchContainer(
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
        const container: ContainerUtil = rowToLaunch[columnName];
        await container.start();
        // const containerConfigPath = rowToLaunch[columnName].replace(/'/g, "");
        // launchContainerFromFile(containerConfigPath);
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
      await this.launchContainer(tableName, columnName, {
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
