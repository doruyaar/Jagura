type MetadataKey = "name" | "image" | "status" | "port" | "cpuUsage" | "lastStarted"

const metadataMapping: { [key: string]: MetadataKey } = {
  "name": "name",
  "image": "image",
  "status": "status",
  "port": "port",
  "cpuusage": "cpuUsage",
  "laststarted": "lastStarted",
};

export const extractMetadataField = (metadata: Record<string, any>, queryProperty: string) => {  
  const lowerCaseQuery = queryProperty.toLowerCase();
  if (lowerCaseQuery in metadataMapping) {
    const camelCaseKey = metadataMapping[lowerCaseQuery];
    return metadata[camelCaseKey];
  } else {
    return "Property not found";
  }
}