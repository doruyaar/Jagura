import { ContainerAction } from "./types";

const getFunctionName = (input: string, openParenthesisIdx: number): string => {
  return input.substring(0, openParenthesisIdx).trim();
};

const splitArgs = (paramsString: string): string[] => {
  const args: string[] = [];
  let currentArg = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < paramsString.length; i++) {
    const char = paramsString[i];

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue; // Skip the quote
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue; // Skip the quote
    }

    if (char === ',' && !inSingleQuote && !inDoubleQuote) {
      args.push(currentArg.trim());
      currentArg = '';
      continue;
    }

    currentArg += char;
  }

  if (currentArg) {
    args.push(currentArg.trim());
  }

  return args;
};


const getFunctionParams = (input: string, openParenthesisIdx: number): string[] => {
  const paramsString = input.substring(openParenthesisIdx + 1, input.length - 1).trim();

  const splitParams = splitArgs(paramsString);

  return splitParams.map(param => param.trim());
};

export const extractContainerFunc = (input: string) => {
  input = input.trim();
  const openParenthesisIdx = input.indexOf('(');

  if (openParenthesisIdx === -1 || !input.endsWith(')')) {
    throw new Error(`Invalid input format: ${input}`);
  }

  const command = getFunctionName(input, openParenthesisIdx) as ContainerAction;
  const params = getFunctionParams(input, openParenthesisIdx);

  if (params.length < 1) {
    throw new Error(`Insufficient parameters in input: ${input}`);
  }

  const [containerCol, ...args] = params;

  return {
    containerCol,
    command,
    args,
  };
};