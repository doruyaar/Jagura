// import { createContainer, execCmdInContainer, getContainerConfigFormFile, getContainerFromConfig, getContainerInfo, extractMetadataField } from './lib';

// export const launchContainerFromFile = async (configPath: string) => {
//   try {
//     const config = getContainerConfigFormFile(configPath);
//     const container = await createContainer(config)
//     console.log(`Launching Container: ${config.name}...`);
//     await container.start();
//     console.log(`Container ${config.name} started with image ${config.image}.`);
//   } catch (error) {
//     console.error("Error launching container:", error);
//   }
// }

// export const getContainerMetadata = async (configPath: string, queryProperty?: string): Promise<any> => {
//   try {
//     const config = getContainerConfigFormFile(configPath);
    
//     const metadata = await getContainerInfo(config);
//     if (queryProperty) {
//       return extractMetadataField(metadata, queryProperty);
//     }

//     return metadata;
//   } catch (error) {
//     console.error(`Error fetching metadata for container ${configPath}`);
//   }
// }

// export const runCommandInContainer = async (
//   configPath: string,
//   command: string
// ): Promise<string> => {
//   try {
//     const config = getContainerConfigFormFile(configPath);
//     const container = getContainerFromConfig(config);
//     return await execCmdInContainer(container, command)
//   } catch (error) {
//     console.error(
//       `Error running command in Docker container ${configPath}:`
//     );
//     return "Error running command in Docker container";
//   }
// }

// export const stopContainerByConfigFile = async (configPath: string) => {
//   try {
//     const config = getContainerConfigFormFile(configPath);
//     const container = getContainerFromConfig(config);
//     await container.stop();
//     await container.remove();
//     console.log(`Container ${config.name} stopped and removed.`);
//   } catch (error) {
//     console.error(
//       `Error stopping or removing Docker container ${configPath}`
//     );
//   }
// }
