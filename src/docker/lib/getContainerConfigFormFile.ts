import fs from 'fs';

export const getContainerConfigFormFile =
  (filePath: string) => JSON.parse(fs.readFileSync(filePath, "utf8"));
