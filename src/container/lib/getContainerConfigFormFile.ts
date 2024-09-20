import assert from 'node:assert';
import fs from 'fs';

export const getContainerConfigFormFile =
  (filePath: string) => {
    const config = JSON.parse(fs.readFileSync(filePath, "utf8"));
    assert.ok(config.name || config.container_id, "Container name or ID not found in the config.")
    return config;
  }
