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
      const status = await this.getStatus();
      if (status === "running" || status === "exited") {
        return `Container: ${this.config.name} is already running.`;
      }
    }

    this.container = await createContainer(this.config);
    await this.container.start();
    return `Container ${this.config.name} was successfully started.`;
  }

  async pause() {
    if (!this.container) {
      return `Unable to pause container: ${this.config.name}. Container: ${this.config.name} is not exists.`;
    }

    const status = await this.getStatus();
    if (status === "exited") {
      return `Unable to pause container: ${this.config.name}. Container: ${this.config.name} already stopped`;
    }

    await this.container.pause();
    return `Container ${this.config.name} was successfully paused.`;
  }

  async unpause() {
    if (!this.container) {
      return `Unable to unpause container: ${this.config.name}. Container: ${this.config.name} is not exists.`;
    }

    const status = await this.getStatus();
    if (status === "running") {
      return `Unable to unpause container: ${this.config.name}. Container: ${this.config.name} is already running.`;
    }

    await this.container.unpause();
    return `Container ${this.config.name} was successfully unpaused.`;
  }

  async remove() {
    if (!this.container) {
      return `Unable to remove container: ${this.config.name}. Container: ${this.config.name} is not exists.`;
    }

    const status = await this.getStatus();
    if (status === "running") {
      await this.container.stop();
    }

    try {
      await this.container.remove();
      this.container = undefined;
      console.log(`Container ${this.config.name} stopped and removed.`);
      return `Container ${this.config.name} stopped and removed.`;
    } catch (error) {
      console.error(
        `Error stopping or removing container ${this.configFilePath}`
      );
    }
  }

  async kill() {
    if (!this.container) {
      return `Unable to kill container: ${this.config.name}. Container: ${this.config.name} is not exists.`;
    }

    const status = await this.getStatus();
    if (status === "exited") {
      return `Cannot kill container: ${this.config.name}. Container: is not running.`;
    }

    try {
      await this.container.kill();
      console.log(`Container ${this.config.name} stopped and killed.`);
      return `Container ${this.config.name} stopped and killed.`;
    } catch (error) {
      console.error(
        `Error stopping or removing container ${this.configFilePath}`
      );
    }
  }

  async stop() {
    if (!this.container) {
      return `Unable to stop container: ${this.config.name}. Container: ${this.config.name} is not exists.`;
    }

    const status = await this.getStatus();
    if (status === "exited") {
      return `Container: ${this.config.name} is already stopped.`;
    }

    try {
      await this.container.stop();
      console.log(`Container ${this.config.name} stopped`);
      return `Container ${this.config.name} stopped`;
    } catch (error) {
      console.error(
        `Error stopping or removing container ${this.configFilePath}`
      );
    }
  }

  async restart() {
    if (!this.container) {
      return `Unable to restart container: ${this.config.name}. Container: ${this.config.name} is not exists.`;
    }

    const status = await this.getStatus();
    if (status === "running") {
      return `Unable to restart container: ${this.config.name}. Container: ${this.config.name} is already running.`;
    }

    try {
      await this.container.restart();
      console.log(`Container ${this.config.name} restarted`);
      return `Container ${this.config.name} restarted`;
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

    const containerInfo = await this.getInfo();
    const cmdArray =
      containerInfo?.image == "mongo"
        ? handleMongoCommand({ command, port: containerInfo.port })
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

  private async getStatus() {
    if (!this.container) {
      return;
    }
    const inspectData = await this.container.inspect();
    return inspectData.State.Status;
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
