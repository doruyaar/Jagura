import fs from 'fs';
import Docker from 'dockerode';

const docker = new Docker();

export async function launchDockerFromFile(filePath: string) {
  try {
    const dockerConfig = fs.readFileSync(filePath, "utf8");
    const config = JSON.parse(dockerConfig);
    
    let containerName = config.name;
    let hostPort = parseInt(config.hostConfig?.PortBindings?.["80/tcp"]?.[0]?.HostPort || '0');
    let newHostPort = hostPort;

    // List all containers to check for name and port conflicts
    const containers = await docker.listContainers({ all: true });

    // Helper function to check if a container with the same name exists
    const isContainerNameTaken = (name: string) => {
      return containers.some(container => container.Names.includes(`/${name}`));
    };

    // Helper function to check if a port is already in use
    const isPortTaken = (port: number) => {
      return containers.some(container => {
        const ports = container.Ports || [];
        return ports.some(p => p.PublicPort === port);
      });
    };

    // Resolve name conflict by appending _1, _2, etc., to the container name
    let suffix = 0;
    while (isContainerNameTaken(containerName)) {
      suffix += 1;
      containerName = `${config.name}_${suffix}`;
    }

    // Resolve port conflict by incrementing the host port (e.g., 8080 -> 8081)
    while (isPortTaken(newHostPort)) {
      newHostPort += 1;
    }

    // Update the host port in the config if necessary
    if (newHostPort !== hostPort) {
      config.hostConfig.PortBindings["80/tcp"][0].HostPort = newHostPort.toString();
    }

    // Create and start the container with the updated name and port
    const container = await docker.createContainer({
      Image: config.image,
      Cmd: config.command,
      name: containerName,
      Tty: true,
      AttachStdin: false,
      OpenStdin: true,
      ExposedPorts: config.exposedPorts || {},
      HostConfig: config.hostConfig || {},
    });

    await container.start();
    console.log(`Container ${containerName} started with image ${config.image} on port ${newHostPort}!`);
  } catch (error) {
    console.error("Error launching Docker container:", error);
  }
}
