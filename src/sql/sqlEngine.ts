import Docker from "dockerode";
import { launchDockerFromFile } from "../docker/dockerManager";
import Table from "cli-table3";
import fs from 'node:fs';

const docker = new Docker();

type Column = { name: string, type: string };

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

  // Fetch Docker container metadata
  async getDockerMetadata(configPath: string, queryProperty?: string): Promise<any> {
    try {
      const dockerConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const containerName = dockerConfig.name || dockerConfig.container_id;
      if (!containerName) {
        throw new Error('Container name or ID not found in the config.');
      }

      const container = docker.getContainer(containerName);

      // Check if the container is running
      const inspectData = await container.inspect();
      if (!inspectData.State.Running) {
        throw new Error(`Container ${containerName} is not running.`);
      }

      const stats = await container.stats({ stream: false });

      // Create a full metadata object
      const metadata = {
        name: inspectData.Name,
        status: inspectData.State.Status,
        port: inspectData.NetworkSettings.Ports,
        cpuUsage: stats.cpu_stats?.cpu_usage?.total_usage ?? 'N/A',
        lastStarted: inspectData?.State?.StartedAt ?? 'N/A',
      };

      // Handle specific property query
      if (queryProperty) {
        const lowerCaseQuery = queryProperty.toLowerCase();
        const metadataMapping: { [key: string]: keyof typeof metadata } = {
          'name': 'name',
          'status': 'status',
          'port': 'port',
          'cpuusage': 'cpuUsage',
          'laststarted': 'lastStarted',
        };

        if (lowerCaseQuery in metadataMapping) {
          const camelCaseKey = metadataMapping[lowerCaseQuery];
          return metadata[camelCaseKey];
        } else {
          return 'Property not found';
        }
      }

      return metadata;
    } catch (error: any) {
      console.error(`Error fetching metadata for container ${configPath}:`, error.message);
      return null;
    }
  }

  // Docker Container Operations (Stop, Kill, Remove)
  async stopDockerContainer(configPath: string): Promise<void> {
    try {
      const dockerConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const containerName = dockerConfig.name || dockerConfig.container_id;
      if (!containerName) {
        throw new Error('Container name or ID not found in the config.');
      }

      const container = docker.getContainer(containerName);
      await container.stop();
      console.log(`Container ${containerName} stopped.`);
    } catch (error) {
      console.error(`Error stopping Docker container ${configPath}:`, error);
    }
  }

  async killDockerContainer(configPath: string): Promise<void> {
    try {
      const dockerConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const containerName = dockerConfig.name || dockerConfig.container_id;
      if (!containerName) {
        throw new Error('Container name or ID not found in the config.');
      }

      const container = docker.getContainer(containerName);
      await container.kill();
      console.log(`Container ${containerName} killed.`);
    } catch (error) {
      console.error(`Error killing Docker container ${configPath}:`, error);
    }
  }

  async removeDockerContainer(configPath: string): Promise<void> {
    try {
      const dockerConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const containerName = dockerConfig.name || dockerConfig.container_id;
      if (!containerName) {
        throw new Error('Container name or ID not found in the config.');
      }

      const container = docker.getContainer(containerName);
      await container.remove();
      console.log(`Container ${containerName} removed.`);
    } catch (error) {
      console.error(`Error removing Docker container ${configPath}:`, error);
    }
  }

  // Utility function to get a row by condition
  getRowByCondition(tableName: string, columnName: string, conditionKey: string, conditionValue: string | number): any {
    const table = this.tables[tableName];
    const rows = this.data[tableName];
    if (!table || !rows) {
      console.log(`Table ${tableName} or column ${columnName} doesn't exist.`);
      return null;
    }
    return rows.find(row => row[conditionKey] == conditionValue);
  }

  // Query Parser
  async parseQuery(query: string) {
    const lowerCaseQuery = query.toLowerCase().trim();
    const createTableRegex = /create table (\w+) \((.+)\)/;
    const insertRegex = /insert into (\w+) \((.+)\)/;
    const selectRegex = /select (.+) from (\w+)/;
    const whereRegex = /where (\w+) = ['"]?(.+?)['"]?/;
    const startRegex = /start (\w+) from (\w+) where (\w+) = ['"]?(.+?)['"]?/;
    const stopRegex = /stop (\w+) from (\w+) where (\w+) = ['"]?(.+?)['"]?/;
    const killRegex = /kill (\w+) from (\w+) where (\w+) = ['"]?(.+?)['"]?/;
    const removeRegex = /remove (\w+) from (\w+) where (\w+) = ['"]?(.+?)['"]?/;
    const dropTableRegex = /drop table (\w+)/;

    const createTableMatch = lowerCaseQuery.match(createTableRegex);
    const insertMatch = lowerCaseQuery.match(insertRegex);
    const selectMatch = lowerCaseQuery.match(selectRegex);
    const whereMatch = lowerCaseQuery.match(whereRegex);
    const startMatch = lowerCaseQuery.match(startRegex);
    const stopMatch = lowerCaseQuery.match(stopRegex);
    const killMatch = lowerCaseQuery.match(killRegex);
    const removeMatch = lowerCaseQuery.match(removeRegex);
    const dropTableMatch = lowerCaseQuery.match(dropTableRegex);

    if (createTableMatch) {
      const tableName = createTableMatch[1];
      const columns = createTableMatch[2]
        .split(',')
        .map((col) => {
          const [name, type] = col.trim().split(' ');
          return { name, type: type.toUpperCase() };
        });
      this.createTable(tableName, columns);
    } else if (insertMatch) {
      const tableName = insertMatch[1];
      const values = insertMatch[2].split(',').map((val) => val.trim());
      this.insertData(tableName, values);
    } else if (selectMatch) {
      const columns = selectMatch[1].split(',').map(col => col.trim());
      const tableName = selectMatch[2];

      if (whereMatch) {
        const whereKey = whereMatch[1];
        const whereValue = whereMatch[2];
        await this.selectData(tableName, columns, { key: whereKey, value: whereValue });
      } else {
        await this.selectData(tableName, columns);
      }
    } else if (startMatch) {
      const columnName = startMatch[1];
      const tableName = startMatch[2];
      const conditionKey = startMatch[3];
      const conditionValue = startMatch[4];
      this.startDocker(tableName, columnName, { key: conditionKey, value: conditionValue });
    } else if (stopMatch) {
      const columnName = stopMatch[1];
      const tableName = stopMatch[2];
      const conditionKey = stopMatch[3];
      const conditionValue = stopMatch[4];
      const row = this.getRowByCondition(tableName, columnName, conditionKey, conditionValue);
      if (row) await this.stopDockerContainer(row[columnName]);
    } else if (killMatch) {
      const columnName = killMatch[1];
      const tableName = killMatch[2];
      const conditionKey = killMatch[3];
      const conditionValue = killMatch[4];
      const row = this.getRowByCondition(tableName, columnName, conditionKey, conditionValue);
      if (row) await this.killDockerContainer(row[columnName]);
    } else if (removeMatch) {
      const columnName = removeMatch[1];
      const tableName = removeMatch[2];
      const conditionKey = removeMatch[3];
      const conditionValue = removeMatch[4];
      const row = this.getRowByCondition(tableName, columnName, conditionKey, conditionValue);
      if (row) await this.removeDockerContainer(row[columnName]);
    } else if (dropTableMatch) {
      const tableName = dropTableMatch[1];
      await this.dropTable(tableName);
    } else {
      console.log('Invalid query.');
    }
  }

  // Docker start operation (replaces launch)
  startDocker(tableName: string, columnName: string, condition: { key: string, value: string | number }) {
    const table = this.tables[tableName];
    const rows = this.data[tableName];

    if (table && rows) {
      const rowToStart = rows.find(row => row[condition.key] == condition.value);
      if (rowToStart && rowToStart[columnName]) {
        const dockerConfigPath = rowToStart[columnName].replace(/'/g, "");
        console.log(`Starting Docker for config file: ${dockerConfigPath}...`);
        launchDockerFromFile(dockerConfigPath);
      } else {
        console.log(`No matching row found for ${condition.key} = '${condition.value}'`);
      }
    } else {
      console.log(`Table ${tableName} or column ${columnName} doesn't exist.`);
    }
  }

  async selectData(tableName: string, columnsToSelect: string[], whereCondition?: { key: string, value: string | number }) {
    const table = this.tables[tableName];
    const rows = this.data[tableName];
  
    if (table && rows) {
      let selectedColumns;
  
      if (columnsToSelect.length === 1 && columnsToSelect[0] === '*') {
        selectedColumns = table.map(col => col.name);
      } else {
        selectedColumns = columnsToSelect;
      }
  
      let filteredRows = rows;
  
      if (whereCondition) {
        filteredRows = rows.filter(row => row[whereCondition.key] == whereCondition.value);
      }
  
      const cliTable = new Table({
        head: selectedColumns,
        colWidths: selectedColumns.map(() => 20),
        wordWrap: true,
      });
  
      for (const row of filteredRows) {
        const rowData: string[] = [];
  
        for (const col of selectedColumns) {
          if (col.includes('metadata(')) {
            const metadataMatch = col.match(/metadata\((.*?)\)\.?(.*)?/);
            const dockerColName = metadataMatch ? metadataMatch[1] : col;
            const metadataProperty = metadataMatch && metadataMatch[2] ? metadataMatch[2] : undefined;  // Handle null or empty string
            const dockerColumn = table.find(c => c.name === dockerColName && c.type.toUpperCase() === "DOCKER");
  
            if (dockerColumn) {
              const metadata = await this.getDockerMetadata(row[dockerColName], metadataProperty);
              if (metadataProperty) {
                rowData.push(metadata ? String(metadata) : "Property not found");
              } else {
                rowData.push(metadata ? JSON.stringify(metadata, null, 2) : "No metadata");
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
        if (col.type.toUpperCase() === 'DOCKER') {
          const dockerConfigPath = row[col.name];
          try {
            const dockerConfig = JSON.parse(fs.readFileSync(dockerConfigPath, 'utf8'));
            const containerName = dockerConfig.name || dockerConfig.container_id;
            if (!containerName) continue;

            const container = docker.getContainer(containerName);
            await container.stop();
            await container.remove();
            console.log(`Container ${containerName} stopped and removed.`);
          } catch (error) {
            console.error(`Error stopping or removing Docker container ${dockerConfigPath}:`, error);
          }
        }
      }
    }
  }
}
