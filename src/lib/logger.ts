import { createLogger, format, transports, type transport } from "winston";

const { combine, timestamp, printf, colorize, errors } = format;
const IS_PROD = process.env.NODE_ENV === "production";

const logFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return `${ts} [${level}]: ${stack || message}`;
});

const consoleTransport = new transports.Console({
  format: IS_PROD
    ? combine(timestamp({ format: "HH:mm:ss" }), logFormat)
    : combine(colorize(), timestamp({ format: "HH:mm:ss" }), logFormat),
});

// In production (Railway/Docker) log only to stdout/stderr -- the platform
// captures those streams. File transports are dev-only conveniences and
// would fail if the /app/logs directory does not exist in the container.
const logTransports: transport[] = [consoleTransport];

if (!IS_PROD) {
  logTransports.push(
    new transports.File({
      filename: "logs/error.log",
      level: "error",
      format: combine(timestamp(), logFormat),
    }),
    new transports.File({
      filename: "logs/combined.log",
      format: combine(timestamp(), logFormat),
    }),
  );
}

const logger = createLogger({
  level: IS_PROD ? "info" : "debug",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    logFormat,
  ),
  transports: logTransports,
});

export default logger;
