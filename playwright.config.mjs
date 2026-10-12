import { defineConfig, devices } from "@playwright/test";

// Localmente usa o Edge do Windows; no CI (GitHub Actions) usa o Chromium do Playwright.
const channel = process.env.CI ? undefined : "msedge";
const asChromium = (d) => ({ ...d, defaultBrowserType: "chromium", channel });

export default defineConfig({
	testDir: "tests",
	// a máquina do CI não tem GPU (WebGL em software): mais tempo, menos paralelismo e 1 nova tentativa
	timeout: process.env.CI ? 90_000 : 45_000,
	workers: process.env.CI ? 2 : undefined,
	retries: process.env.CI ? 1 : 0,
	fullyParallel: true,
	reporter: [["list"]],
	// BASE_URL testa um site já publicado, ex.: BASE_URL=https://lawrindovsk.github.io/portfolio/
	use: { baseURL: process.env.BASE_URL ?? "http://localhost:4173", trace: "retain-on-failure" },
	webServer: process.env.BASE_URL ? undefined : { command: "node tests/serve.mjs", url: "http://localhost:4173", reuseExistingServer: true },
	projects: [
		{ name: "iphone-se", use: asChromium(devices["iPhone SE"]) },
		{ name: "iphone-14", use: asChromium(devices["iPhone 14"]) },
		{ name: "pixel-7", use: asChromium(devices["Pixel 7"]) },
		{ name: "galaxy-s9", use: asChromium(devices["Galaxy S9+"]) },
		{ name: "ipad-mini", use: asChromium(devices["iPad Mini"]) },
		{ name: "ipad-pro-landscape", use: asChromium(devices["iPad Pro 11 landscape"]) },
		{ name: "galaxy-tab", use: asChromium(devices["Galaxy Tab S4"]) },
		{ name: "desktop", use: { ...devices["Desktop Edge"], channel } },
	],
});
