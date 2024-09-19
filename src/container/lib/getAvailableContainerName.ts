import { ContainerInfo } from "dockerode";

export const getAvailableContainerName = (containers: Array<ContainerInfo>, config: Record<string, any>) => {
  const originalName = config.name;

  let name = originalName;
  let suffix = 0;
  while (isContainerNameTaken(containers, name)) {
    suffix += 1;
    name = `${originalName}_${suffix}`;
  }
  return name;
}

function isContainerNameTaken (containers: Array<ContainerInfo>, name: string) {
  return containers.some(container => container.Names.includes(`/${name}`));
};