import { ContainerInfo } from "dockerode";
import { isPortTaken } from "./index";


export const getAvailableHostPort = (containers: Array<ContainerInfo>, config: any) => {
  let hostPort = parseInt(config.hostConfig?.PortBindings?.["80/tcp"]?.[0]?.HostPort || '0');

  if(!hostPort) {
    return {}
  }

  while (isPortTaken(containers, hostPort)) {
    hostPort += 1;
  }

  return {
    PortBindings: {
      "80/tcp": [
        {
          HostPort: hostPort.toString()
        }
      ]
    }
  }
}