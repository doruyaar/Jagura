import Table from "cli-table3";
import { launchDockerFromFile } from "../docker/dockerManager";

type Column = { name: string; type: string };

export class SQLEngine {
  private tables: { [tableName: string]: Column[] } = {};
  private data: { [tableName: string]: any[] } = {}; // In-memory storage

  // Create table logic
  createTable(tableName: string, columns: Column[]) {
    this.tables[tableName] = columns;
    this.data[tableName] = [];
    console.log(`Table ${tableName} created with columns:`, columns);
  }

  // Helper function to clean up quotes from a string
  cleanValue(value: string): string {
    // Remove enclosing single or double quotes if present
    return value.replace(/^['"](.+)['"]$/, "$1");
  }

  // Insert data logic
  insertData(tableName: string, values: any[]) {
    const table = this.tables[tableName];
    if (table) {
      const rowData: any = {};
      table.forEach((col, index) => {
        // Clean the value of quotes before inserting
        rowData[col.name] = this.cleanValue(values[index]);
      });
      this.data[tableName].push(rowData);
      console.log(`Inserted into ${tableName}:`, rowData);
    } else {
      console.log(`Table ${tableName} doesn't exist.`);
    }
  }

  // Select data and print using cli-table3 (with specific columns)
  selectData(tableName: string, columnsToSelect: string[]) {
    const table = this.tables[tableName];
    const rows = this.data[tableName];

    if (table && rows) {
      let validColumns;

      // Check if * is used in the SELECT query to select all columns
      if (columnsToSelect.length === 1 && columnsToSelect[0] === "*") {
        // Select all columns
        validColumns = table;
      } else {
        // Ensure selected columns exist in the table schema
        validColumns = table.filter((col) =>
          columnsToSelect.includes(col.name)
        );
      }

      if (validColumns.length === 0) {
        console.log(`Invalid columns in SELECT statement`);
        return;
      }

      // Initialize a new cli-table3 instance with the selected column headers
      const cliTable = new Table({
        head: validColumns.map((col) => col.name), // Only include selected columns in the headers
        colWidths: validColumns.map(() => 20), // Set default column width
        wordWrap: true, // Enable word wrapping
      });

      // Add each row to the table, only including the selected columns
      rows.forEach((row) => {
        const rowData = validColumns.map((col) => row[col.name]);
        cliTable.push(rowData); // Push only the selected column data
      });

      console.log(cliTable.toString()); // Print the formatted table
      return rows;
    } else {
      console.log(`Table ${tableName} doesn't exist.`);
    }
  }

  // Launch Docker container based on column and condition
  launchDocker(
    tableName: string,
    columnName: string,
    condition: { key: string; value: string }
  ) {
    const table = this.tables[tableName];
    const rows = this.data[tableName];

    if (table && rows) {
      const rowToLaunch = rows.find(
        (row) => row[condition.key] === condition.value
      );
      if (rowToLaunch && rowToLaunch[columnName]) {
        const dockerConfigPath = rowToLaunch[columnName].replace(/'/g, ""); // Strip quotes from path
        console.log(`Launching Docker for config file: ${dockerConfigPath}...`);
        launchDockerFromFile(dockerConfigPath); // Create and start Docker container
      } else {
        console.log(
          `No matching row found for ${condition.key} = '${condition.value}'`
        );
      }
    } else {
      console.log(`Table ${tableName} or column ${columnName} doesn't exist.`);
    }
  }

  // Parse the incoming query and route to the correct operation
  parseQuery(query: string) {
    // Convert the entire query to lowercase to handle case insensitivity
    const lowerCaseQuery = query.toLowerCase().trim();
  
    // Regular expressions for matching the query parts
    const createTableRegex = /create table (\w+) \((.+)\)/;
    const insertRegex = /insert into (\w+) \((.+)\)/;
    const selectRegex = /select (.+) from (\w+)/;  // Match SELECT with specific columns
    const launchRegex = /launch (\w+) from (\w+) where (\w+) = (\d+)/;  // Fix to handle numeric condition values
  
    const createTableMatch = lowerCaseQuery.match(createTableRegex);
    const insertMatch = lowerCaseQuery.match(insertRegex);
    const selectMatch = lowerCaseQuery.match(selectRegex);
    const launchMatch = lowerCaseQuery.match(launchRegex);
  
    if (createTableMatch) {
      const tableName = createTableMatch[1];
      const columns = createTableMatch[2]
        .split(',')
        .map((col) => {
          const [name, type] = col.trim().split(' ');
          return { name, type };
        });
      this.createTable(tableName, columns);
    } else if (insertMatch) {
      const tableName = insertMatch[1];
      const values = insertMatch[2].split(',').map((val) => val.trim());
      this.insertData(tableName, values);
    } else if (selectMatch) {
      const columns = selectMatch[1].split(',').map(col => col.trim());  // Extract columns from SELECT
      const tableName = selectMatch[2];
      this.selectData(tableName, columns);  // Pass the columns to the selectData method
    } else if (launchMatch) {
      const columnName = launchMatch[1];
      const tableName = launchMatch[2];
      const conditionKey = launchMatch[3];
      const conditionValue = launchMatch[4];
      this.launchDocker(tableName, columnName, { key: conditionKey, value: conditionValue });
    } else {
      console.log('Invalid query.');
    }
  }
  
}
