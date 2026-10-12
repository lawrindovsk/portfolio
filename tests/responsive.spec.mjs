import { test, expect } from "@playwright/test";

// Erros de JS e recursos locais quebrados derrubam o teste; CDNs externas (logos) só geram aviso.
const watchErrors = (page) => {
	const errors = [];
	page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
	page.on("console", (m) => m.type() === "error" && !/simpleicons|Failed to load resource/.test(m.text()) && errors.push(`console: ${m.text()}`));
	page.on("response", (r) => r.url().startsWith("http://localhost") && r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
	return errors;
};

const isMobileWidth = (page) => page.viewportSize().width <= 768;

test.describe("layout responsivo", () => {
	test("carrega sem erros e sem rolagem horizontal", async ({ page }) => {
		const errors = watchErrors(page);
		await page.goto("/");
		await page.waitForLoadState("networkidle");
		// percorre a página inteira para disparar os reveals
		await page.evaluate(async () => {
			for (let y = 0; y < document.body.scrollHeight; y += 400) {
				window.scrollTo(0, y);
				await new Promise((r) => setTimeout(r, 30));
			}
		});
		const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
		expect(overflow, "página mais larga que a tela").toBeLessThanOrEqual(1);

		// nenhum elemento visível vaza para fora da tela na horizontal
		// (decorações dentro de um pai com overflow escondido não aparecem, então não contam)
		const offenders = await page.evaluate(() =>
			[...document.querySelectorAll("main *")]
				.filter((el) => {
					for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
						if (/hidden|clip/.test(getComputedStyle(p).overflowX)) return false;
					}
					const r = el.getBoundingClientRect();
					const st = getComputedStyle(el);
					return r.width > 0 && st.visibility !== "hidden" && st.display !== "none" && (r.right > window.innerWidth + 1 || r.left < -1) && !el.closest("canvas, .landscape, .hero-scene");
				})
				.slice(0, 5)
				.map((el) => `${el.tagName.toLowerCase()}.${el.className}`),
		);
		expect(offenders, "elementos cortados na lateral").toEqual([]);
		expect(errors).toEqual([]);
	});

	test("seções na ordem certa", async ({ page }) => {
		await page.goto("/");
		const ids = await page.$$eval("main section[id]", (s) => s.map((x) => x.id).filter((id) => !["home", "intro"].includes(id)));
		expect(ids).toEqual(["about", "experience", "skills", "projects", "certifications", "contact"]);
		const nav = await page.$$eval("#navLinks a", (a) => a.map((x) => x.getAttribute("href")));
		expect(nav).toEqual(["#home", "#about", "#experience", "#skills", "#projects", "#certifications", "#contact"]);
	});

	test("menu de navegação funciona", async ({ page }) => {
		await page.goto("/");
		const toggle = page.locator("#navToggle");
		if (isMobileWidth(page)) {
			await expect(toggle).toBeVisible();
			await toggle.click();
			await expect(toggle).toHaveAttribute("aria-expanded", "true");
			await page.locator('#navLinks a[href="#certifications"]').click();
			await expect(toggle).toHaveAttribute("aria-expanded", "false");
		} else {
			await page.locator('#navLinks a[href="#certifications"]').click();
		}
		await expect(page.locator("#certifications h2")).toBeInViewport();
	});
});

test.describe("CV", () => {
	test("botão Ver CV abre o PDF atual em nova aba", async ({ page, request }) => {
		await page.goto("/");
		const cv = page.getByRole("link", { name: /Ver CV/ });
		await expect(cv).toBeVisible();
		await expect(cv).toHaveAttribute("target", "_blank");
		const href = await cv.getAttribute("href");
		const res = await request.get(`/${href}`);
		expect(res.status(), href).toBe(200);
		expect((await res.body()).subarray(0, 5).toString()).toBe("%PDF-");
	});
});

test.describe("projetos", () => {
	test("lista sem filtros, com todos os projetos e links válidos", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator(".filter")).toHaveCount(0);
		const rows = page.locator("#projectsGrid .project-row");
		await expect(rows).toHaveCount(7);
		await expect(rows.first().locator("h3")).toHaveText("API REST para sistema de delivery");
		// cada linha cabe na tela e os links abrem em nova aba
		for (const row of await rows.all()) {
			const box = await row.boundingBox();
			expect(box.width).toBeLessThanOrEqual(page.viewportSize().width);
		}
		const links = await page.$$eval("#projectsGrid a", (a) => a.map((x) => ({ href: x.href, target: x.target })));
		expect(links.length).toBeGreaterThan(0);
		for (const l of links) {
			expect(l.href).toMatch(/^https:\/\//);
			expect(l.target).toBe("_blank");
		}
		await expect(page.locator('#projectsGrid a[href*="wokwi.com"]')).toHaveCount(1);
	});
});

test.describe("certificações", () => {
	test("logos, botões e selo 'em breve'", async ({ page }) => {
		await page.goto("/");
		const cards = page.locator(".cert-card");
		await expect(cards).toHaveCount(9);
		await expect(page.locator(".cert-card .cert-logo")).toHaveCount(9);
		await expect(page.locator(".cert-card-progress .cert-soon")).toHaveText("em breve");
		// alvo de toque dos botões com tamanho razoável
		for (const btn of await page.locator(".cert-verify").all()) {
			const b = await btn.boundingBox();
			expect(b.width).toBeGreaterThanOrEqual(28);
			expect(b.height).toBeGreaterThanOrEqual(28);
		}
	});

	test("todas as imagens de certificado existem", async ({ page, request }) => {
		await page.goto("/");
		const srcs = await page.$$eval("[data-cert]", (a) => a.map((x) => x.dataset.cert));
		expect(srcs.length).toBe(5);
		for (const s of srcs) expect((await request.get(`/${s}`)).status(), s).toBe(200);
	});

	test("pop-up abre centralizado, mostra a imagem e fecha", async ({ page }) => {
		await page.goto("/");
		const btn = page.locator('[data-cert-title="IT Essentials"]');
		await btn.scrollIntoViewIfNeeded();
		await btn.click();
		const dialog = page.locator("#certModal");
		await expect(dialog).toBeVisible();
		await expect(page.locator("#certModalTitle")).toHaveText("IT Essentials");
		await expect.poll(() => page.$eval("#certModalImg", (i) => i.complete && i.naturalWidth)).toBeGreaterThan(0);
		await page.waitForTimeout(500); // fim da animação de entrada

		const vp = page.viewportSize();
		const box = await dialog.boundingBox();
		expect(box.x).toBeGreaterThanOrEqual(0);
		expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1);
		expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 1);
		expect(Math.abs(box.x + box.width / 2 - vp.width / 2), "centralizado na horizontal").toBeLessThan(4);
		expect(Math.abs(box.y + box.height / 2 - vp.height / 2), "centralizado na vertical").toBeLessThan(4);

		await page.keyboard.press("Escape");
		await expect(dialog).toBeHidden();

		// fecha também pelo X
		await btn.click();
		await expect(dialog).toBeVisible();
		await page.locator(".cert-modal-close").click();
		await expect(dialog).toBeHidden();
	});
});

test.describe("Pyter (cena 3D)", () => {
	const ready = async (page, hora) => {
		await page.goto(`/?debug&hora=${hora}`);
		await page.waitForFunction(() => window.pyter && window.pyter.task() !== undefined);
		await page.waitForTimeout(1200);
	};

	test("canvas ocupa o topo da tela", async ({ page }) => {
		await ready(page, 12);
		const box = await page.locator("#home canvas").boundingBox();
		expect(box.width).toBeGreaterThan(page.viewportSize().width * 0.9);
		expect(box.height).toBeGreaterThan(150);
	});

	test("nasce em posição aleatória a cada carregamento", async ({ page }) => {
		const spots = [];
		for (let i = 0; i < 4; i++) {
			await ready(page, 12);
			spots.push(await page.evaluate(() => window.pyter.pos()));
		}
		const distinct = new Set(spots.map((p) => `${p.x.toFixed(2)},${p.z.toFixed(2)}`));
		expect(distinct.size).toBeGreaterThan(1);
	});

	test("de dia responde ao toque com um balão de reação", async ({ page }) => {
		await ready(page, 12);
		await page.waitForFunction(() => window.pyter.task() !== "exit");
		// ele pode estar correndo: lê a posição e toca de novo até acertar
		await expect
			.poll(async () => {
				const p = await page.evaluate(() => window.pyter.screen());
				await page.mouse.click(p.x, p.y);
				await page.waitForTimeout(100);
				return page.evaluate(() => window.pyter.bubble());
			})
			.toMatch(/feliz|coracao|estrela|musica|susto|amor/);
	});

	test("à noite dorme e só acorda com insistência", async ({ page }) => {
		await ready(page, 23);
		// espera ele chegar ao lugar escolhido e deitar
		await expect.poll(() => page.evaluate(() => window.pyter.task()), { timeout: 25_000 }).toBe("sleep");
		await expect.poll(() => page.evaluate(() => window.pyter.bubble()), { timeout: 25_000 }).toBe("zzz");

		// onde quer que durma, precisa estar visível para dar para acordá-lo
		let p = await page.evaluate(() => window.pyter.screen());
		const vp = page.viewportSize();
		expect(p.x, "Pyter dormindo fora da tela").toBeGreaterThan(10);
		expect(p.x).toBeLessThan(vp.width - 10);

		// um toque só não basta: continua dormindo
		await page.mouse.click(p.x, p.y);
		await page.waitForTimeout(200);
		expect(await page.evaluate(() => window.pyter.task())).toBe("sleep");

		// insistindo (até 6 toques seguidos) ele acorda
		for (let i = 0; i < 6 && (await page.evaluate(() => window.pyter.task())) === "sleep"; i++) {
			p = await page.evaluate(() => window.pyter.screen());
			await page.mouse.click(p.x, p.y);
			await page.waitForTimeout(250);
		}
		expect(await page.evaluate(() => window.pyter.task())).not.toBe("sleep");
	});

	test("não atravessa potes, patinho nem casinha", async ({ page }) => {
		await ready(page, 12);
		let worst = Infinity;
		for (let i = 0; i < 60; i++) {
			const { task, c } = await page.evaluate(() => ({ task: window.pyter.task(), c: window.pyter.clearance() }));
			// entrar/sair da casinha atravessa a porta de propósito
			if (task !== "exit" && task !== "sleep") worst = Math.min(worst, c);
			await page.waitForTimeout(150);
		}
		expect(worst, "Pyter entrou dentro de um obstáculo").toBeGreaterThan(-0.05);
	});
});
