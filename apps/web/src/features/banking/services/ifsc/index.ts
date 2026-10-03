import { createIFSCService } from "./createIFSCService";

export * from "./types";
export * from "./ifscValidation";
export * from "./createIFSCService";

const defaultService = createIFSCService();

export const lookupIFSC = defaultService.lookupIFSC;
export const clearIFSCCache = defaultService.clearIFSCCache;
export const getCacheStats = defaultService.getCacheStats;
