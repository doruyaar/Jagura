import { createContainer, getContainerConfigFormFile, getContainerInfo, getMetadataField } from './lib';

export const launchContainerFromFile = async (configPath: string) => {
  try {
    const config = getContainerConfigFormFile(configPath);
    const container = await createContainer(config)
    await container.start();
    console.log(`Container ${config.name} started with image ${config.image}.`);
  } catch (error) {
    console.error("Error launching container:", error);
  }
}

export const getContainerMetadata = async (configPath: string, queryProperty?: string): Promise<any> => {
  try {
    const config = getContainerConfigFormFile(configPath);

    const containerName = config.name || config.container_id;
    if (!containerName) {
      console.error('Container name or ID not found in the config.');
      return;
    }

    const metadata = await getContainerInfo(containerName);
    if (queryProperty) {
      return getMetadataField(metadata, queryProperty);
    }

    return metadata;
  } catch (error) {
    console.error(`Error fetching metadata for container ${configPath}`);
  }
}
