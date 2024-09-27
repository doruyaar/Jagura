import { ContainerAction } from "./types";

/**
 * Extracts the function name from the input string.
 * @param input - The input string containing the function call.
 * @param openParenthesisIdx - The index of the opening parenthesis.
 * @returns The function name as a string.
 */
const getFunctionName = (input: string, openParenthesisIdx: number): string => {
  return input.substring(0, openParenthesisIdx).trim();
};

/**
 * Splits the parameters string into individual arguments, handling quoted strings.
 * @param paramsString - The string containing the parameters.
 * @returns An array of parameter strings.
 */
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

/**
 * Extracts and cleans the function parameters from the input string.
 * @param input - The input string containing the function call.
 * @param openParenthesisIdx - The index of the opening parenthesis.
 * @returns An array of parameter strings.
 */
const getFunctionParams = (input: string, openParenthesisIdx: number): string[] => {
  const paramsString = input.substring(openParenthesisIdx + 1, input.length - 1).trim();

  const splitParams = splitArgs(paramsString);

  return splitParams.map(param => param.trim());
};

/**
 * Parses a container function call string and extracts its components.
 * @param input - The input string containing the function call.
 * @returns An object with `containerCol`, `command`, and `args`.
 * @throws Will throw an error if the input format is invalid.
 */
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