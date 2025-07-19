/// <reference types="vite-plugin-electron/electron-env" />

import type { api } from "./preload";

declare global {
	interface Window {
		Main: typeof api;
	}
}
