import {Configuration, configurationValue, HandlerContext} from "@atomist/automation-client";
import {ProgressLog, ProgressLogFactory, SdmGoalEvent} from "@atomist/sdm";
import * as path from "path";
import {FileProgressLogger} from "../log/fileProgressLogger";

/**
 * This function determines if Rolar was disabled (via env var).  If it has been it will enable file based progress logging to the basedir of the
 * running SDM.  Use for debugging.
 */
export function getProgressLog(): ProgressLogFactory | undefined {
    if (process.env.DISABLE_ROLAR === "true")  {
        process.stdout.write(`getProgressLog => DISABLE_ROLAR is set, starting file goal logging\n`);
        // Write to local log
        return async (context: HandlerContext, goal: SdmGoalEvent) =>
            new FileProgressLogger(configurationValue<Configuration>().name, goal.name, path.join(__dirname, "log"));
    } else {
        return undefined;
    }
}

/**
 * This Progress Log option discards all messages - used for debugging
 */
export class NoOpLoggingProgressLog implements ProgressLog {
    public log: string = "";
    constructor(public name: string) {
    }
    public write(pWhat: string): void {
        return;
    }
    public async isAvailable(): Promise<boolean> {
        return true;
    }
    public flush(): Promise<void> {
        return Promise.resolve();
    }
    public close(): Promise<void> {
        return Promise.resolve();
    }
}
