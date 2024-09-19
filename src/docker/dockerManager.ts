import Docker from 'dockerode';
import { getContainerConfigFormFile, getContainerOptions } from './lib';

const docker = new Docker();

export async function launchDockerFromFile(filePath: string) {
  try {
    const config = getContainerConfigFormFile(filePath);
    const containerOptions = await getContainerOptions(config)

    const container = await docker.createContainer(containerOptions);
    await container.start();
    console.log(`Container ${config.name} started with image ${config.image}.`);
  } catch (error) {
    console.error("Error launching Docker container:", error);
  }
}
