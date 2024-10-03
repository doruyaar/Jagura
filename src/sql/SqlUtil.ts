import Table from "cli-table3";
import ContainerUtil from "../container/ContainerUtil";
import {
  cleanInput,
  Column,
  ContainerAction,
  extractContainerFunc,
  extractJsonFromString,
  getColsTitles,
  getNestedProperty,
  parseColumns,
  prepareColsToPrint,
  trimQuotes,
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

  private createTable(tableName: string, columns: Column[]) {
    if (Object.keys(this.tables).includes(tableName)) {
      console.log(
        `[TABLE_OR_VIEW_ALREADY_EXISTS] Cannot create table or view ${tableName} because it already exists.`
      );
      return [
        [""],
        [
          `[TABLE_OR_VIEW_ALREADY_EXISTS] Cannot create table or view ${tableName} because it already exists.`,
        ],
      ];
    }
    this.tables[tableName] = columns;
    this.data[tableName] = [];
    return [
      ["result"],
      [
        `create table ${tableName} ${prepareColsToPrint(
          columns
        )} was successfully executed.`,
      ],
    ];
  }

  private insertData(tableName: string, values: any[]) {
    const table = this.getTable(tableName);
    const tableData = this.getTableData(tableName);
    const rowData: any = {};
    const insertLog: any = {};

    for (let index = 0; index < table.length; index++) {
      const col = table[index];
      const key = col.name;
      const value = trimQuotes(values[index]);

      if (col.type === "CONTAINER") {
        rowData[key] = new ContainerUtil(value);
      } else if (col.type === "NUMBER") {
        rowData[key] = Number(value);
      } else {
        rowData[key] = value;
      }

      insertLog[key] = value;
    }

    tableData.push(rowData);
    console.log(`Inserted into ${tableName}:`, insertLog);
    return [
      ["num_affected_rows", "num_inserted_rows"],
      [1, 1],
    ];
  }

  async selectData(
    tableName: string,
    columnsToSelect: string[],
    whereCondition?: { key: string; value: string | number }
  ) {

    const containerActionMap: Record<ContainerAction, (container: ContainerUtil) => Promise<any>> = {
      "start": (container: ContainerUtil) => container.start(),
      "stop": (container: ContainerUtil) => container.stop(),
      "pause": (container: ContainerUtil) => container.pause(),
      "unpause": (container: ContainerUtil) => container.unpause(),
      "remove": (container: ContainerUtil) => container.remove(),
      "restart": (container: ContainerUtil) => container.restart(),
      "kill": (container: ContainerUtil) => container.kill()
    }

    const result: Array<Array<any>> = [];
    const table = this.tables[tableName];
    const rows = this.data[tableName];
    let sum = 0;

    const isSelectAllColumns =
      columnsToSelect.length === 1 && columnsToSelect[0] === "*";

    if (table && rows) {
      const selectedColumns = isSelectAllColumns
        ? table.map((col) => col.name)
        : columnsToSelect;
      const filteredRows = whereCondition
        ? rows.filter((row) => row[whereCondition.key] == whereCondition.value)
        : rows;

      const getColsTitlesWidth = (selectedColumns: Array<string>) =>
        selectedColumns.map((col) =>
          col.includes("metadata(") || col.includes("run_cmd(") ? 50 : 20
        );

      const getType = (colName: string) => {
        return colName.split("(")[0].toUpperCase();
      }

      const colsTitlesWithTypes = [
        ...table.filter((col) => selectedColumns.includes(col.name)),
        ...selectedColumns
          .filter((c) => c.includes("("))
          .map((c) => ({
            name: c,
            type: getType(c),
          })),
      ];
      const colsTitlesOrders = selectedColumns.map((c) =>
        colsTitlesWithTypes.find((ct) => ct.name == c)
      );
      result.push(colsTitlesOrders);

      const cliTable = new Table({
        head: getColsTitles(selectedColumns),
        colWidths: getColsTitlesWidth(selectedColumns),
        wordWrap: true,
      });

      for (const row of filteredRows) {
        const rowData: string[] = [];

        for (const col of selectedColumns) {
          if (col.includes("count(")) {
            rowData.push(filteredRows.length.toString());
            result.push(rowData);
            return result;
          } else if (col.includes("sum(")) {
            const extractColumn = col.split("(")[1].split(")")[0];
            const value = row[extractColumn].identifier
              ? row[extractColumn].identifier
              : String(row[extractColumn]);
            sum = sum + Number(value)
            continue;
          } else if (col.includes("length(")) {
            const extractColumn = col.split("(")[1].split(")")[0];
            const value = row[extractColumn].identifier
              ? row[extractColumn].identifier
              : String(row[extractColumn]);
            rowData.push(value.length);
          } else if (col.includes("metadata(")) {
            const { command, containerCol, args } =
              extractContainerFunc(col);
            const isTableContainContainerCol = table.find(
              (c) =>
                c.name === containerCol && c.type.toUpperCase() === "CONTAINER"
            );
            if (isTableContainContainerCol) {
              const container: ContainerUtil = row[containerCol];
              const metadata = await container.getMetadata(
                args[0]?.toLowerCase()
              );
              const value = metadata
                ? JSON.stringify(metadata, null, 2)
                : "Property not found";
              rowData.push(value);
            } else {
              rowData.push("Invalid Container column");
            }
          } else if (col.includes("run_cmd(")) {
            const { command, containerCol, args } =
              extractContainerFunc(col);
            const isTableContainContainerCol = table.find(
              (c) =>
                c.name === containerCol && c.type.toUpperCase() === "CONTAINER"
            );
            if (isTableContainContainerCol && command) {
              const container: ContainerUtil = row[containerCol];
              const cmdResult = await container.runCommand(args[0]);
              if (args[1]) {
                const jsonResult = extractJsonFromString(cmdResult || "{}");
                const propertyValue = jsonResult
                  ? getNestedProperty(jsonResult, args[1])
                  : null;
                rowData.push(
                  propertyValue !== undefined
                    ? JSON.stringify(propertyValue, null, 2)
                    : "Property not found"
                );
              } else {
                rowData.push(cmdResult || "No result");
              }
            } 
            else {
              rowData.push("Invalid CONTAINER column");
            }
          } else if (col.includes("(")) {
            const { command, containerCol, args } =
              extractContainerFunc(col);
            const isTableContainContainerCol = table.find(
              (c) =>
                c.name === containerCol && c.type.toUpperCase() === "CONTAINER"
            );
            if (isTableContainContainerCol && command) {
              const container: ContainerUtil = row[containerCol];
              const actionFn = containerActionMap[command];
              const cmdResult = await actionFn(container);
              if (args[2]) {
                const jsonResult = extractJsonFromString(cmdResult || "{}");
                const propertyValue = jsonResult
                  ? getNestedProperty(jsonResult, args[2])
                  : null;
                rowData.push(
                  propertyValue !== undefined
                    ? JSON.stringify(propertyValue, null, 2)
                    : "Property not found"
                );
              } else {
                rowData.push(cmdResult || "No result");
              }
            } 
            else {
              rowData.push("Invalid CONTAINER column");
            }
          } 
          else {
            const value = row[col].identifier
              ? row[col].identifier
              : String(row[col]);
            rowData.push(value);
          }
        }

        result.push(rowData);
        cliTable.push(rowData);
      }

      if (sum) {
        result.push([sum])
      }

      console.log(cliTable.toString());
      console.log(result);
      return result;
    } else {
      console.log(`Table ${tableName} doesn't exist.`);
      return [[""], [`[TABLE_OR_VIEW_NOT_FOUND] The table or view ${tableName} doesn't exist.`]];
    }
  }

  async dropTable(tableName: string) {
    if (this.tables[tableName]) {
      await this.stopAndRemoveContainers(tableName);
      delete this.tables[tableName];
      delete this.data[tableName];
      console.log(`Table ${tableName} and its records have been dropped.`);
    } else {
      console.log(
        `[TABLE_OR_VIEW_NOT_FOUND] The table or view ${tableName} doesn't exist.`
      );
      return [[""], [`[TABLE_OR_VIEW_NOT_FOUND] The table or view ${tableName} doesn't exist.`]];
    }

    return [["result"], [`drop table ${tableName} was successfully executed.`]];
  }

  private async stopAndRemoveContainers(tableName: string) {
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
          await container.remove();
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

  async parseQuery(input: string) {  
    const query = cleanInput(input);

    const createTableRegex = /create table (\w+) \((.+)\)/;
    const dropTableRegex = /drop table (\w+)/;
    const insertRegex = /insert into (\w+) \((.+)\)/;
    const selectRegex = /select (.+) from (\w+)/;
    const showTablesRegex = /show tables/;
    const whereRegex = /where\s+(\w+)\s*=\s*['"]?([^'"]+)['"]?/;

    const createTableMatch = query.match(createTableRegex);
    const dropTableMatch = query.match(dropTableRegex);
    const insertMatch = query.match(insertRegex);
    const selectMatch = query.match(selectRegex);
    const showTablesMatch = query.match(showTablesRegex);
    const whereMatch = query.match(whereRegex);

    const handlers = {
      createTable: (match: RegExpMatchArray) => {
        const tableName = match[1];
        const columns = match[2].split(",").map((col) => {
          const [name, type] = col.trim().split(" ");
          return { name, type: type.toUpperCase() };
        });
        return this.createTable(tableName, columns);
      },

      insert: (match: RegExpMatchArray) => {
        const tableName = match[1];
        const values = match[2].split(",").map((val) => val.trim());
        return this.insertData(tableName, values);
      },

      select: async (match: RegExpMatchArray, whereMatch: RegExpMatchArray | null) => {
        const columns = parseColumns(match[1]);
        const tableName = match[2];
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
      },

      dropTable: async (match: RegExpMatchArray) => {
        const tableName = match[1];
        return await this.dropTable(tableName);
      },

      showTables: () => {
        return this.showTables();
      },
    };

    const matchTypes: Array<{ type: keyof typeof handlers, match: RegExpMatchArray | null }> = [
      { type: "createTable", match: createTableMatch },
      { type: "insert", match: insertMatch },
      { type: "select", match: selectMatch },
      { type: "dropTable", match: dropTableMatch },
      { type: "showTables", match: showTablesMatch },
    ];

    for (const { type, match } of matchTypes) {
      if (match) {
        const handler = handlers[type];
        if (handler) {
          const result = await handler(match, whereMatch);
          return result;
        }
      }
    }

    console.log("Invalid query.");
    return [[""], [`Invalid query: ${input}`]]
  }
}
