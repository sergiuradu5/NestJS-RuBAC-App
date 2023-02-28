import { registerAs } from "@nestjs/config";

export interface IRulesConfig {
  folderPath: string;
}

export default registerAs('rules', () => ({
  folderPath: process.env.RULES_FOLDER,
}));