import { Container } from "dockerode";
import {
  createContainer,
  getContainerConfigFormFile,
  extractMetadataField,
  handleMongoCommand,
  extractPort,
  extractHostPort,
} from "./lib";

export default class ContainerUtil {
  private container: Container | undefined;
  private config: Record<string, any>;
  private identifier: string;

  constructor(private configFilePath: string) {
    this.config = getContainerConfigFormFile(configFilePath);
    this.identifier = this.config.name || this.config.container_id;
  }

  async start() {
    if (this.container) {
      return;
    }

    this.container = await createContainer(this.config);
    await this.container.start()
    return `launch container ${this.config.name} was successfully executed.`
  }

  async remove() {
    if (!this.container) {
      return;
    }

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
      if (metadata && queryProperty) {
        return extractMetadataField(metadata, queryProperty);
      }
  
      return metadata;
    } catch (error) {
      console.error(`Error fetching metadata for container ${this.identifier}`);
    }
  }

  async runCommand(command: string) {
    if (!this.container) {
      return;
    }

    const containerInfo = await this.getInfo()
    const cmdArray = 
      containerInfo?.image == "mongo"
      ? handleMongoCommand({ command, port: containerInfo.port})
      : ["sh", "-c", command];

    try {
      const exec = await this.container.exec({
        Cmd: cmdArray,
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
    if (!this.container) {
      return;
    }

    const inspectData = await this.container.inspect();
    const stats = await this.container.stats({ stream: false });


    const port = extractPort(inspectData.NetworkSettings.Ports);
    const hostPort = extractHostPort(inspectData.NetworkSettings.Ports, port);

    return {
      name: inspectData.Name,
      image: inspectData.Config.Image,
      status: inspectData.State.Status,
      port,
      hostPort,
      cpuUsage: stats.cpu_stats?.cpu_usage?.total_usage ?? "N/A",
      lastStarted: inspectData?.State?.StartedAt ?? "N/A",
    };
  }
}
