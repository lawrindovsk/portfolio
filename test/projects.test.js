const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

/*
 * Carrega o index.html com projects.js e main.js, como no navegador.
 * `projectsSource` permite trocar a lista de projetos por uma de teste.
 */
const load = (projectsSource = read("static/js/projects.js")) => {
	const dom = new JSDOM(read("index.html"), { runScripts: "outside-only", pretendToBeVisual: true });
	const { window } = dom;

	// APIs que o jsdom não implementa
	window.IntersectionObserver = class {
		observe() {}
		unobserve() {}
	};
	window.matchMedia = () => ({ matches: true }); // reduce motion: sem timers de digitação

	// Scripts clássicos, como <script src>: o `const PROJECTS` fica visível para o main.js
	const context = dom.getInternalVMContext();
	const run = (source) => new vm.Script(source).runInContext(context);
	run(projectsSource);
	run(read("static/js/main.js"));
	window.run = run;
	return window.document;
};

const cards = (doc) => [...doc.querySelectorAll("#projectsGrid .project-card")];
const click = (doc, filter) => doc.querySelector(`.filter[data-filter="${filter}"]`).click();

test("renderiza todos os projetos ao carregar", () => {
	const doc = load();
	assert.equal(cards(doc).length, doc.defaultView.run("PROJECTS.length"));
});

test("filtros mostram só o tipo escolhido e atualizam o estado dos botões", () => {
	const doc = load();

	for (const type of ["pessoal", "cliente"]) {
		click(doc, type);
		const shown = cards(doc);
		assert.equal(shown.length, doc.defaultView.run(`PROJECTS.filter((p) => p.type === "${type}").length`));
		assert.ok(shown.every((c) => c.dataset.type === type));

		const active = doc.querySelectorAll(".filter.is-active");
		assert.equal(active.length, 1);
		assert.equal(active[0].dataset.filter, type);
		assert.equal(active[0].getAttribute("aria-selected"), "true");
	}

	click(doc, "all");
	assert.equal(cards(doc).length, doc.defaultView.run("PROJECTS.length"));
});

test("categoria vazia mostra mensagem", () => {
	const doc = load(`const PROJECTS = [
		{ title: "Só pessoal", description: "x", type: "pessoal", tags: [] },
	];`);
	click(doc, "cliente");
	assert.equal(cards(doc).length, 0);
	assert.ok(doc.querySelector("#projectsGrid .empty"));
});

test("escapa HTML vindo dos dados do projeto", () => {
	const doc = load(`const PROJECTS = [{
		title: "<img src=x onerror=alert(1)>",
		description: "<script>alert(1)</script>",
		type: "pessoal",
		tags: ["<b>tag</b>"],
		repo: 'https://x.com/" onclick="alert(1)',
	}];`);
	const card = cards(doc)[0];

	assert.equal(card.querySelector("h3").textContent, "<img src=x onerror=alert(1)>");
	assert.equal(card.querySelector("p").textContent, "<script>alert(1)</script>");
	assert.equal(card.querySelector(".chips li").textContent, "<b>tag</b>");
	assert.equal(card.querySelectorAll("img, script, b, [onerror], [onclick]").length, 0);
	assert.equal(card.querySelector(".project-links a").getAttribute("href"), 'https://x.com/" onclick="alert(1)');
});

test("sem imagem mostra iniciais (ignorando preposições) e omite links vazios", () => {
	const doc = load(`const PROJECTS = [{
		title: "Portal para Formandos de Enfermagem",
		description: "x",
		type: "cliente",
		tags: [],
		image: "",
		repo: "",
		demo: "https://exemplo.com",
		featured: true,
	}];`);
	const card = cards(doc)[0];

	assert.equal(card.querySelector(".thumb-placeholder").textContent, "PF");
	assert.equal(card.querySelector(".project-type").textContent, "Cliente");
	assert.ok(card.classList.contains("is-featured"));

	const links = card.querySelectorAll(".project-links a");
	assert.equal(links.length, 1);
	assert.equal(links[0].getAttribute("href"), "https://exemplo.com");
});
