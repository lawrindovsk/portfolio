import { defineConfig, devices } from "@playwright/test";

// Celulares e tablets rodam no Chromium (Edge instalado no Windows) com viewport, toque e DPR de cada aparelho.
const asChromium = (d) => ({ ...d, defaultBrowserType: "chromium", channel: "msedge" });

export default defineConfig({
	testDir: "tests",
	timeout: 45_000,
	fullyParallel: true,
	reporter: [["list"]],
	use: { baseURL: "http://localhost:4173", trace: "retain-on-failure" },
	webServer: { command: "node tests/serve.mjs", url: "http://localhost:4173", reuseExistingServer: true },
	projects: [
		{ name: "iphone-se", use: asChromium(devices["iPhone SE"]) },
		{ name: "iphone-14", use: asChromium(devices["iPhone 14"]) },
		{ name: "pixel-7", use: asChromium(devices["Pixel 7"]) },
		{ name: "galaxy-s9", use: asChromium(devices["Galaxy S9+"]) },
		{ name: "ipad-mini", use: asChromium(devices["iPad Mini"]) },
		{ name: "ipad-pro-landscape", use: asChromium(devices["iPad Pro 11 landscape"]) },
		{ name: "galaxy-tab", use: asChromium(devices["Galaxy Tab S4"]) },
		{ name: "desktop", use: { ...devices["Desktop Edge"], channel: "msedge" } },
	],
});
