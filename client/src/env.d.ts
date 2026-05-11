declare global {
  const __APP_VERSION__: string;
  const __APP_BUILD_ID__: string;
  const __APP_BUILD_LABEL__: string;

  interface Window {
    __FITAI_SW_REG__?: ServiceWorkerRegistration;
  }
}

export {};
