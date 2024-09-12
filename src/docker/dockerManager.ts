import Docker from 'dockerode';
import { exec } from 'child_process';
import fs from 'fs';

const docker = new Docker();

export async function launchDockerFromFile(filePath: string) {
  try {
    const dockerConfig = fs.readFileSync(filePath, 'utf8');
    const config = JSON.parse(dockerConfig); // Assuming config is a JSON file

    // Create and start a new container using the config
    const container = await docker.createContainer({
      Image: config.image, // Docker image from the file
      Cmd: config.command || ['/bin/bash'],
      name: config.name,
      Tty: true,                     // Allocates a TTY (equivalent to -t)
      AttachStdin: false,            // We don't need to attach stdin (since it's detached)
      OpenStdin: true,               // Keep stdin open (equivalent to -i)
    });

    await container.start();  // Start the newly created container
    console.log(`Container ${config.name} started with image ${config.image}!`);
  } catch (error) {
    console.error('Error launching Docker container:', error);
  }
}

// Open a new terminal window and connect to the Docker container on macOS
export function openDockerTerminal(filePath: string) {
  try {
    const dockerConfig = fs.readFileSync(filePath, 'utf8');
    const config = JSON.parse(dockerConfig);

    const containerName = config.name;

    console.log(`Opening terminal for Docker container ${containerName}...`);

    // For macOS, use osascript to open a new terminal window
    const command = `osascript -e 'tell application "Terminal" to do script "docker exec -it ${containerName} /bin/sh"'`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Error: ${stderr}`);
        return;
      }
      console.log(stdout);
    });
  } catch (error) {
    console.error('Error opening Docker terminal:', error);
  }
}
