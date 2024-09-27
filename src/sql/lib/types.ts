export type Column = { name: string; type: string };

export type ContainerAction =
  | "start"
  | "stop"
  | "pause"
  | "unpause"
  | "remove"
  | "restart"
  | "kill";
