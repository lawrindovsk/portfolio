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

const rows = (doc) => [...doc.querySelectorAll("#projectsGrid .project-row")];

test("renderiza todos os projetos ao carregar, sem filtros", () => {
	const doc = load();
	assert.equal(rows(doc).length, doc.defaultView.run("PROJECTS.length"));
	assert.equal(doc.querySelectorAll(".filter").length, 0);
});

test("lista vazia mostra mensagem", () => {
	const doc = load("const PROJECTS = [];");
	assert.equal(rows(doc).length, 0);
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
	const row = rows(doc)[0];

	assert.equal(row.querySelector("h3").textContent, "<img src=x onerror=alert(1)>");
	assert.equal(row.querySelector("p").textContent, "<script>alert(1)</script>");
	assert.equal(row.querySelector(".chips li").textContent, "<b>tag</b>");
	assert.equal(row.querySelectorAll("img, script, b, [onerror], [onclick]").length, 0);
	assert.equal(row.querySelector(".project-links a").getAttribute("href"), 'https://x.com/" onclick="alert(1)');
});

test("mostra o tipo, destaca e omite links vazios", () => {
	const doc = load(`const PROJECTS = [{
		title: "Portal para Formandos de Enfermagem",
		description: "x",
		type: "cliente",
		tags: [],
		repo: "",
		demo: "https://exemplo.com",
		featured: true,
	}];`);
	const row = rows(doc)[0];

	assert.equal(row.querySelector(".project-type").textContent, "Cliente");
	assert.ok(row.classList.contains("is-featured"));

	const links = row.querySelectorAll(".project-links a");
	assert.equal(links.length, 1);
	assert.equal(links[0].getAttribute("href"), "https://exemplo.com");
	assert.equal(links[0].getAttribute("target"), "_blank");
});
