import Docker from 'dockerode';

const docker = new Docker();

export const getContainerFromConfig = (config: Record<string, any>) => 
    docker.getContainer(config.name || config.container_id);