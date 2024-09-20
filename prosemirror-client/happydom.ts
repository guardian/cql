import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach } from "bun:test";
const bunFetch = fetch;
GlobalRegistrator.register();
window.fetch = bunFetch;

// Apply Jest globals as necessary
global.afterEach = afterEach;
