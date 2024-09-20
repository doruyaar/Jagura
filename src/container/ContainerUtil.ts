import { Container } from "dockerode";
import {
  createContainer,
  getContainerConfigFormFile,
  extractMetadataField,
} from "./lib";

export class ContainerUtil {
  private container: Container = {} as Container;
  private config: Record<string, any>;
  private identifier: string;

  constructor(private configFilePath: string) {
    this.config = getContainerConfigFormFile(configFilePath);
    this.identifier = this.config.name || this.config.container_id;
  }

  async start() {
    this.container = await createContainer(this.config);
    await this.container.start()
  }

  async remove() {
    try {
      await this.container.stop();
      await this.container.remove();
      console.log(`Container ${this.config.name} stopped and removed.`);
    } catch (error) {
      console.error(
        `Error stopping or removing container ${this.configFilePath}`
      );
    }
  }

  async getMetadata(queryProperty?: string) {
    try {
      const metadata = await this.getInfo();
      if (queryProperty) {
        return extractMetadataField(metadata, queryProperty);
      }
  
      return metadata;
    } catch (error) {
      console.error(`Error fetching metadata for container ${this.identifier}`);
    }
  }

  async runCommand(command: string) {
    try {
      const exec = await this.container.exec({
        Cmd: ["sh", "-c", command],
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({});

      let output = "";
      try {
        for await (const chunk of stream) {
          output += chunk.toString();
        }
      } catch (err) {
        throw err;
      }

      return output.trim();
    } catch (error) {
      console.error(`Error running command in container ${this.identifier}:`);
      return "Error running command in container";
    }
  }

  async getInfo() {
    const inspectData = await this.container.inspect();
    const stats = await this.container.stats({ stream: false });

    return {
      name: inspectData.Name,
      status: inspectData.State.Status,
      port: inspectData.NetworkSettings.Ports,
      cpuUsage: stats.cpu_stats?.cpu_usage?.total_usage ?? "N/A",
      lastStarted: inspectData?.State?.StartedAt ?? "N/A",
    };
  }
}
