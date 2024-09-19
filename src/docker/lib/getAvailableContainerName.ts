import { ContainerInfo } from "dockerode";
import { isContainerNameTaken } from "./index";

export const getAvailableContainerName = (containers: Array<ContainerInfo>, config: any) => {
  let originalName = config.name;
  let name = originalName;
  let suffix = 0;
  while (isContainerNameTaken(containers, name)) {
    suffix += 1;
    name = `${originalName}_${suffix}`;
  }
  return name;
}