
// Fix: Using namespace extension for NodeJS to avoid 'Cannot redeclare block-scoped variable' error for 'process'
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    [key: string]: string | undefined;
  }
}
