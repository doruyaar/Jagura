import Table from "cli-table3";
import ContainerUtil from "../container/ContainerUtil";
import { 
  Column,
  extractJsonFromString,
  extractMetadataSelect,
  extractRunCmdSelect,
  getColsTitles,
  getNestedProperty,
  parseColumns,
  prepareColsToPrint,
  trimQuotes 
} from "./lib";

export default class SqlUtil {
  private tables: { [tableName: string]: Column[] } = {};
  private data: { [tableName: string]: any[] } = {};

  private getTable(name: string) {
    return this.tables[name];
  }

  private getTableData(name: string) {
    return this.data[name];
  }

  createTable(tableName: string, columns: Column[]) {
    if (Object.keys(this.tables).includes(tableName)) {
      console.log(`[TABLE_OR_VIEW_ALREADY_EXISTS] Cannot create table or view ${tableName} because it already exists.`);
      return [[""], [`[TABLE_OR_VIEW_ALREADY_EXISTS] Cannot create table or view ${tableName} because it already exists.`]];
    }
    this.tables[tableName] = columns;
    this.data[tableName] = [];
    return [["result"], [`create table ${tableName} ${prepareColsToPrint(columns)} was successfully executed.`]]
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

      if(col.type === "CONTAINER") {
        rowData[key] = new ContainerUtil(value)
      } else if(col.type === "NUMBER") {
        rowData[key] = Number(value)
      }else {
        rowData[key] = value;
      }

      insertLog[key] = value;
    }

    tableData.push(rowData);
    console.log(`Inserted into ${tableName}:`, insertLog);
    return [["num_affected_rows", "num_inserted_rows"], [1, 1]]
  }

  async selectData(
    tableName: string,
    columnsToSelect: string[],
    whereCondition?: { key: string; value: string | number }
  ) {
    const result: Array<Array<any>> = [];
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

      const colsTitlesWithTypes = [...table.filter(col => selectedColumns.includes(col.name)), ...getColsTitles(selectedColumns).filter(c => c.includes('(')).map(c => ({"name": c, "type": c.includes("metadata(") ? "METADATA" : "RUN"}))];
      const colsTitlesOrders = selectedColumns.map(c => colsTitlesWithTypes.find(ct => ct.name == c))
      result.push(colsTitlesOrders);

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
              (c) => c.name === containerCol && c.type.toUpperCase() === "CONTAINER"
            );
            if (isTableContainContainerCol) {
              const container: ContainerUtil = row[containerCol];
              const metadata = await container.getMetadata(field?.toLowerCase());
              const value = metadata ? JSON.stringify(metadata, null, 2) : "Property not found"
              rowData.push(value);
            } else {
              rowData.push("Invalid Container column");
            }
          } else if (col.includes("run_cmd(")) {
            const {command, containerCol, nestedField} = extractRunCmdSelect(col);
            const isTableContainContainerCol = table.find(
              (c) =>
                c.name === containerCol && c.type.toUpperCase() === "CONTAINER"
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
              rowData.push("Invalid CONTAINER column");
            }
          } else {
            const value = row[col].identifier ? row[col].identifier : String(row[col]);
            rowData.push(value);
          }
        }

        result.push(rowData);
        cliTable.push(rowData);
      }

      console.log(cliTable.toString());
      console.log(result);
      return result;
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
      console.log(`[TABLE_OR_VIEW_NOT_FOUND] The table or view ${tableName} cannot be found.`);
    }

    return [["result"], [`drop table ${tableName} was successfully executed.`]]
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
        if (col.type.toUpperCase() === "CONTAINER") {
          const container: ContainerUtil = row[col.name];
          await container.remove()
        }
      }
    }
  }

  private showTables() {
    const result: [string, any][] = [["tableName", "columns"]];
    for (const tableName in this.tables) {
      result.push([tableName, JSON.stringify(this.tables[tableName])]);
    }

    return result;
  }

  async launchContainer(
    tableName: string,
    columnName: string,
    condition?: { key: string; value: string | number }
  ) {
    const result: Array<any> = [];
    const table = this.tables[tableName];
    const rows = this.data[tableName];

    if (!condition) {
      for (const row of rows) {
        if (row[columnName] instanceof ContainerUtil) {
          const res = await row[columnName].start();
          result.push([res]);
        }
      }
    } else if (table && rows) {
      const rowToLaunch = condition ? rows.find(
        (row) => row[condition.key] == condition.value
      ) : rows;
      if (rowToLaunch && rowToLaunch[columnName]) {
        const container: ContainerUtil = rowToLaunch[columnName];
        result.push(
          [await container.start()]
        );
      } else {
        result.push(`No matching row found for ${condition!.key} = '${condition!.value}'`);
      }
    } else {
      result.push(`Table ${tableName} or column ${columnName} doesn't exist.`);
    }

    return [["result"], ...result];
  }

  async parseQuery(query: string) {
    const createTableRegex = /create table (\w+) \((.+)\)/;
    const dropTableRegex = /drop table (\w+)/;
    const insertRegex = /insert into (\w+) \((.+)\)/;
    const launchRegex = /launch (\w+) from (\w+)/;// (\w+) where (\w+) = ['"]?(.+?)['"]?/;
    const lowerCaseQuery = query.toLowerCase().trim();
    const selectRegex = /select (.+) from (\w+)/;
    const showTablesRegex = /show tables/;
    const whereRegex = /where (\w+) = ['"]?(.+?)['"]?/;

    const createTableMatch = lowerCaseQuery.match(createTableRegex);
    const dropTableMatch = lowerCaseQuery.match(dropTableRegex);
    const insertMatch = lowerCaseQuery.match(insertRegex);
    const launchMatch = lowerCaseQuery.match(launchRegex);
    const selectMatch = lowerCaseQuery.match(selectRegex);
    const showTablesMatch = lowerCaseQuery.match(showTablesRegex);
    const whereMatch = lowerCaseQuery.match(whereRegex);

    if (createTableMatch) {
      const tableName = createTableMatch[1];
      const columns = createTableMatch[2].split(",").map((col) => {
        const [name, type] = col.trim().split(" ");
        return { name, type: type.toUpperCase() };
      });
      return this.createTable(tableName, columns);
    } else if (insertMatch) {
      const tableName = insertMatch[1];
      const values = insertMatch[2].split(",").map((val) => val.trim());
      return this.insertData(tableName, values);
    } else if (selectMatch) {
      const columns = parseColumns(selectMatch[1]);
      const tableName = selectMatch[2];

      if (whereMatch) {
        const whereKey = whereMatch[1];
        const whereValue = whereMatch[2];
        return await this.selectData(tableName, columns, {
          key: whereKey,
          value: whereValue,
        });
      } else {
        return await this.selectData(tableName, columns);
      }
    } else if (launchMatch) {
      const column = launchMatch[1];
      const tableName = launchMatch[2];

      if (whereMatch) {
        const whereKey = whereMatch[1];
        const whereValue = whereMatch[2];
        return await this.launchContainer(tableName, column, {
          key: whereKey,
          value: whereValue,
        });
      }
      else {
        return await this.launchContainer(tableName, column);
      }
      // const columnName = launchMatch[1];
      // const tableName = launchMatch[2];
      // const conditionKey = launchMatch[3];
      // const conditionValue = launchMatch[4];
      // return await this.launchContainer(tableName, columnName, {
      //   key: conditionKey,
      //   value: conditionValue,
      // });
    } else if (dropTableMatch) {
      const tableName = dropTableMatch[1];
      return await this.dropTable(tableName);
    } else if (showTablesMatch) {
      return this.showTables();
    }
    else {
      console.log("Invalid query.");
    }
  }
}
