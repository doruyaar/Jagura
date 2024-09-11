import { launchDockerFromFile } from '../docker/dockerManager';

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

  // Insert data logic
  insertData(tableName: string, values: any[]) {
    const table = this.tables[tableName];
    if (table) {
      const rowData: any = {};
      table.forEach((col, index) => {
        rowData[col.name] = values[index];
      });
      this.data[tableName].push(rowData);
      console.log(`Inserted into ${tableName}:`, rowData);
    } else {
      console.log(`Table ${tableName} doesn't exist.`);
    }
  }

  // Select data and print using console.table()
  selectData(tableName: string) {
    const table = this.tables[tableName];
    const rows = this.data[tableName];

    if (table && rows) {
      console.table(rows); // Display the table data
      return rows;
    } else {
      console.log(`Table ${tableName} doesn't exist.`);
    }
  }

  // Launch Docker container based on column and condition
  launchDocker(tableName: string, columnName: string, condition: { key: string, value: string }) {
    const table = this.tables[tableName];
    const rows = this.data[tableName];

    if (table && rows) {
      const rowToLaunch = rows.find((row) => row[condition.key] === condition.value);
      if (rowToLaunch && rowToLaunch[columnName]) {
        const dockerConfigPath = rowToLaunch[columnName].replace(/'/g, ''); // Strip quotes from path
        console.log(`Launching Docker for config file: ${dockerConfigPath}...`);
        launchDockerFromFile(dockerConfigPath);  // Create and start Docker container
      } else {
        console.log(`No matching row found for ${condition.key} = '${condition.value}'`);
      }
    } else {
      console.log(`Table ${tableName} or column ${columnName} doesn't exist.`);
    }
  }

  // Parse the incoming query and route to the correct operation
  parseQuery(query: string) {
    const createTableRegex = /CREATE TABLE (\w+) \((.+)\)/;
    const insertRegex = /INSERT INTO (\w+) \((.+)\)/;
    const selectRegex = /SELECT \* FROM (\w+)/;
    const launchRegex = /LAUNCH (\w+) FROM (\w+) WHERE (\w+) = '(.+)'/;

    const createTableMatch = query.match(createTableRegex);
    const insertMatch = query.match(insertRegex);
    const selectMatch = query.match(selectRegex);
    const launchMatch = query.match(launchRegex);

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
      const tableName = selectMatch[1];
      this.selectData(tableName);
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
