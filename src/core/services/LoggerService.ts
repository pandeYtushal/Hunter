import { ExecutionLogger } from "../../debug/ExecutionLogger";

export class LoggerService {
  private static prefix = "[HUNTER]";

  static debug(message: string, ...args: unknown[]): void {
    console.debug(`${this.prefix} [DEBUG] ${message}`, ...args);
  }

  static info(message: string, ...args: unknown[]): void {
    console.info(`${this.prefix} [INFO] ${message}`, ...args);
    const parsedArgs = args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ");
    void ExecutionLogger.log({
      level: "info",
      message: `${message} ${parsedArgs}`.trim()
    });
  }

  static warn(message: string, ...args: unknown[]): void {
    console.warn(`${this.prefix} [WARN] ${message}`, ...args);
    const parsedArgs = args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ");
    void ExecutionLogger.log({
      level: "warn",
      message: `${message} ${parsedArgs}`.trim()
    });
  }

  static error(message: string, error?: unknown, ...args: unknown[]): void {
    const errorMsg = error instanceof Error ? error.message : String(error || "");
    const fullMessage = `${message}${errorMsg ? ` | Error: ${errorMsg}` : ""}`;
    console.error(`${this.prefix} [ERROR] ${fullMessage}`, ...args);
    const parsedArgs = args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ");
    void ExecutionLogger.log({
      level: "error",
      message: `${fullMessage} ${parsedArgs}`.trim()
    });
  }
}
