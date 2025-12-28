
// Augment the existing NodeJS namespace provided by @types/node
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    [key: string]: string | undefined;
  }
}
