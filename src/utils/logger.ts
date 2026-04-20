const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

export const logger = {
  info: (message: string) => {
    console.log(\\${colors.blue}[INFO]\${colors.reset} \${message}\);
  },
  error: (message: string) => {
    console.log(\\${colors.red}[ERROR]\${colors.reset} \${message}\);
  },
  warn: (message: string) => {
    console.log(\\${colors.yellow}[WARN]\${colors.reset} \${message}\);
  },
  success: (message: string) => {
    console.log(\\${colors.green}[SUCCESS]\${colors.reset} \${message}\);
  },
};
