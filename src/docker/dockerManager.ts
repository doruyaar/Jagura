import Docker from "dockerode";
import fs from "fs";

const docker = new Docker();

export async function launchDockerFromFile(filePath: string) {
  try {
    const dockerConfig = fs.readFileSync(filePath, "utf8");
    const config = JSON.parse(dockerConfig);

    const container = await docker.createContainer({
      Image: config.image,
      Cmd: config.command || ["/bin/bash"],
      name: config.name,
      Tty: true,
      AttachStdin: false,
      OpenStdin: true,
    });

    await container.start();
    console.log(`Container ${config.name} started with image ${config.image}!`);
  } catch (error) {
    console.error("Error launching Docker container:", error);
  }
}