import Docker from "dockerode"; // Docker API
import { launchDockerFromFile } from "../docker/dockerManager";
import Table from "cli-table3"; // Importing cli-table3
import fs from 'node:fs';

const docker = new Docker(); // Initialize Docker

type Column = { name: string, type: string };

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
    return value.replace(/^['"](.+)['"]$/, "$1"); // Remove enclosing single or double quotes if present
  }

  // Insert data logic
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

  // Helper function to get Docker metadata
  async getDockerMetadata(configPath: string): Promise<any> {
    try {
      // Read the Docker config file and extract the container name
      const dockerConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const containerName = dockerConfig.name || dockerConfig.container_id;  // Use container name or ID
  
      if (!containerName) {
        throw new Error('Container name or ID not found in the config.');
      }
  
      const container = docker.getContainer(containerName);  // Get the Docker container by name or ID
      const inspectData = await container.inspect();  // Inspect container details
      const stats = await container.stats({ stream: false });  // Fetch container stats
  
      const metadata = {
        name: inspectData.Name,
        status: inspectData.State.Status,
        port: inspectData.NetworkSettings.Ports,
        cpuUsage: stats.cpu_stats.cpu_usage.total_usage,
        lastStarted: inspectData.State.StartedAt,
      };
  
      return metadata;
    } catch (error) {
      console.error(`Error fetching metadata for container ${configPath}:`, error);
      return null;
    }
  }

  // Select data and print using cli-table3 (with specific columns)
  async selectData(tableName: string, columnsToSelect: string[]) {
    const table = this.tables[tableName];
    const rows = this.data[tableName];

    if (table && rows) {
      let validColumns;

      // Check if * is used in the SELECT query to select all columns
      if (columnsToSelect.length === 1 && columnsToSelect[0] === "*") {
        validColumns = table; // Select all columns
      } else {
        validColumns = table.filter((col) =>
          columnsToSelect.includes(col.name)
        ); // Ensure selected columns exist in the table schema
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
      for (const row of rows) {
        const rowData: string[] = [];

        for (const col of validColumns) {
          if (col.type === "DOCKER") {
            const metadata = await this.getDockerMetadata(row[col.name]);
            rowData.push(
              metadata ? JSON.stringify(metadata, null, 2) : "No metadata"
            );
          } else {
            rowData.push(row[col.name]);
          }
        }

        cliTable.push(rowData); // Push the row data into the table
      }

      console.log(cliTable.toString()); // Print the formatted table
      return rows;
    } else {
      console.log(`Table ${tableName} doesn't exist.`);
    }
  }

  // Launch Docker container based on column and condition
 // Launch Docker container based on column and condition
launchDocker(tableName: string, columnName: string, condition: { key: string; value: string | number }) {
  const table = this.tables[tableName];
  const rows = this.data[tableName];

  if (!table || !rows) {
    console.log(`Table ${tableName} doesn't exist.`);
    return;
  }

  const rowToLaunch = rows.find(row => row[condition.key] == condition.value);  // Compare string/number without strict equality
  if (rowToLaunch && rowToLaunch[columnName]) {
    const dockerConfigPath = rowToLaunch[columnName].replace(/'/g, ""); // Strip quotes from path
    console.log(`Launching Docker for config file: ${dockerConfigPath}...`);
    launchDockerFromFile(dockerConfigPath);  // Create and start Docker container
  } else {
    console.log(`No matching row found for ${condition.key} = '${condition.value}'`);
  }
}


  // Parse the incoming query and route to the correct operation
  parseQuery(query: string) {
    const lowerCaseQuery = query.toLowerCase().trim();
  
    // Regular expressions for matching the query parts
    const createTableRegex = /create table (\w+) \((.+)\)/;
    const insertRegex = /insert into (\w+) \((.+)\)/;
    const selectRegex = /select (.+) from (\w+)/;
    const metadataRegex = /select metadata\((\w+)\) from (\w+)/;  // Regex for metadata
    const launchRegex = /launch (\w+) from (\w+) where (\w+) = ['"]?(.+?)['"]?/;  // Regex for LAUNCH query with support for numbers and strings
  
    const createTableMatch = lowerCaseQuery.match(createTableRegex);
    const insertMatch = lowerCaseQuery.match(insertRegex);
    const selectMatch = lowerCaseQuery.match(selectRegex);
    const metadataMatch = lowerCaseQuery.match(metadataRegex);
    const launchMatch = lowerCaseQuery.match(launchRegex);
  
    if (createTableMatch) {
      const tableName = createTableMatch[1];
      const columns = createTableMatch[2]
        .split(',')
        .map((col) => {
          const [name, type] = col.trim().split(' ');
          return { name, type: type.toUpperCase() };  // Normalize column types to uppercase
        });
      this.createTable(tableName, columns);
    } else if (insertMatch) {
      const tableName = insertMatch[1];
      const values = insertMatch[2].split(',').map((val) => val.trim());
      this.insertData(tableName, values);
    } else if (metadataMatch) {
      const columnName = metadataMatch[1];
      const tableName = metadataMatch[2];
      this.selectMetadata(tableName, columnName);  // Call the method to handle metadata queries
    } else if (launchMatch) {
      const columnName = launchMatch[1];
      const tableName = launchMatch[2];
      const conditionKey = launchMatch[3];
      const conditionValue = launchMatch[4];
      this.launchDocker(tableName, columnName, { key: conditionKey, value: conditionValue });
    } else if (selectMatch) {
      const columns = selectMatch[1].split(',').map(col => col.trim());
      const tableName = selectMatch[2];
      this.selectData(tableName, columns);  // Handle regular SELECT queries
    } else {
      console.log('Invalid query.');
    }
  }
  

  // Select metadata for Docker columns
  // Select metadata for Docker columns
async selectMetadata(tableName: string, columnName: string) {
  const table = this.tables[tableName];
  const rows = this.data[tableName];

  if (!table || !rows) {
    console.log(`Table ${tableName} doesn't exist.`);
    return;
  }

  // Find the Docker column, case-insensitive type check
  const dockerColumn = table.find(col => col.name === columnName && col.type.toUpperCase() === "DOCKER");
  if (!dockerColumn) {
    console.log(`Column ${columnName} is not a valid DOCKER column.`);
    return;
  }

  // Initialize a new cli-table3 instance with the metadata header
  const cliTable = new Table({
    head: [`${columnName}.metadata`],  // Metadata column header
    colWidths: [50],  // Set a reasonable column width
    wordWrap: true,  // Enable word wrapping
  });

  // Add each row's metadata to the table
  for (const row of rows) {
    const dockerConfigPath = row[columnName];
    const metadata = await this.getDockerMetadata(dockerConfigPath);  // Fetch live metadata
    cliTable.push([JSON.stringify(metadata, null, 2)]);  // Stringify the metadata object
  }

  console.log(cliTable.toString());  // Print the formatted table
}

}
