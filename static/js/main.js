(() => {
	const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	/* ---------- Reveal ao rolar ---------- */
	const revealObserver = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (!entry.isIntersecting) return;
				entry.target.classList.add("is-visible");
				revealObserver.unobserve(entry.target);
			});
		},
		{ threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
	);
	const observeReveals = (root = document) =>
		root.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => revealObserver.observe(el));

	/* ---------- Projetos ---------- */
	const grid = document.getElementById("projectsGrid");

	const escapeHtml = (str) =>
		String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

	const stopwords = new Set(["de", "da", "do", "das", "dos", "e", "para", "com", "o", "a"]);
	const initials = (title) =>
		title
			.split(/\s+/)
			.filter((w) => !stopwords.has(w.toLowerCase()))
			.slice(0, 2)
			.map((w) => w[0].toUpperCase())
			.join("");

	const icons = {
		github:
			'<svg viewBox="0 0 24 24" class="fill" aria-hidden="true"><path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.2 1.9 1.2 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z"/></svg>',
		external:
			'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
	};

	const typeLabels = { pessoal: "Pessoal", cliente: "Cliente", academico: "Acadêmico" };

	const projectCard = (p, i) => {
		const thumb = p.image
			? `<img src="${escapeHtml(p.image)}" alt="" loading="lazy" />`
			: `<span class="thumb-placeholder">${escapeHtml(initials(p.title))}</span>`;

		const links = [
			p.repo && `<a href="${escapeHtml(p.repo)}" target="_blank" rel="noopener" aria-label="Código de ${escapeHtml(p.title)}">${icons.github}</a>`,
			p.demo && `<a href="${escapeHtml(p.demo)}" target="_blank" rel="noopener" aria-label="Abrir ${escapeHtml(p.title)}">${icons.external}</a>`,
		]
			.filter(Boolean)
			.join("");

		return `
			<article class="project-card reveal${p.featured ? " is-featured" : ""}" data-type="${escapeHtml(p.type)}" style="--delay:${(i % 3) * 0.1}s">
				<div class="project-thumb">${thumb}</div>
				<div class="project-body">
					<div class="project-head">
						<span class="project-type">${typeLabels[p.type] || "Pessoal"}</span>
						<div class="project-links">${links}</div>
					</div>
					<h3>${escapeHtml(p.title)}</h3>
					<p>${escapeHtml(p.description)}</p>
					<ul class="chips small">${p.tags.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
				</div>
			</article>`;
	};

	const renderProjects = (filter = "all") => {
		const list = PROJECTS.filter((p) => filter === "all" || p.type === filter);
		grid.innerHTML = list.length
			? list.map(projectCard).join("")
			: '<p class="empty">Nenhum projeto nesta categoria ainda. Em breve!</p>';
		observeReveals(grid);
	};

	document.querySelectorAll(".filter").forEach((btn) => {
		btn.addEventListener("click", () => {
			document.querySelectorAll(".filter").forEach((b) => {
				b.classList.toggle("is-active", b === btn);
				b.setAttribute("aria-selected", b === btn);
			});
			renderProjects(btn.dataset.filter);
		});
	});

	// Brilho que segue o mouse e leve inclinação 3D nos cards
	const hoverCards = ".project-card, .skill-card, .cert-card";
	document.addEventListener("pointermove", (e) => {
		const card = e.target.closest?.(hoverCards);
		if (!card) return;
		const rect = card.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		card.style.setProperty("--mx", `${x}px`);
		card.style.setProperty("--my", `${y}px`);
		const rx = (0.5 - y / rect.height) * 8;
		const ry = (x / rect.width - 0.5) * 8;
		card.style.setProperty("--tilt", `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-6px)`);
	});
	document.addEventListener("pointerout", (e) => {
		const card = e.target.closest?.(hoverCards);
		if (card && !card.contains(e.relatedTarget)) card.style.removeProperty("--tilt");
	});

	renderProjects();

	/* ---------- Header, menu mobile e link ativo ---------- */
	const header = document.getElementById("header");
	const toggle = document.getElementById("navToggle");
	const navLinks = document.getElementById("navLinks");
	const progress = document.querySelector(".scroll-progress");

	const onScroll = () => {
		header.classList.toggle("is-scrolled", window.scrollY > 20);
		const max = document.documentElement.scrollHeight - window.innerHeight;
		progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
	};
	window.addEventListener("scroll", onScroll, { passive: true });
	onScroll();

	const setMenu = (open) => {
		document.body.classList.toggle("menu-open", open);
		toggle.setAttribute("aria-expanded", open);
		toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
	};
	toggle.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
	navLinks.addEventListener("click", (e) => e.target.closest("a") && setMenu(false));
	document.addEventListener("keydown", (e) => e.key === "Escape" && setMenu(false));

	const linkFor = (id) => navLinks.querySelector(`a[href="#${id}"]`);
	const sectionObserver = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (!entry.isIntersecting) return;
				navLinks.querySelectorAll(".nav-link").forEach((a) => a.classList.remove("is-active"));
				linkFor(entry.target.id)?.classList.add("is-active");
			});
		},
		{ rootMargin: "-45% 0px -50% 0px" }
	);
	document.querySelectorAll("main section[id]").forEach((s) => sectionObserver.observe(s));

	/* ---------- Efeito de digitação ---------- */
	const typed = document.getElementById("typed");
	const roles = ["Suporte & Infraestrutura", "Desenvolvedor em formação", "Engenharia da Computação"];

	if (reduceMotion) {
		typed.textContent = roles[0];
	} else {
		let role = 0;
		let char = 0;
		let deleting = false;
		const tick = () => {
			const word = roles[role];
			char += deleting ? -1 : 1;
			typed.textContent = word.slice(0, char);

			let wait = deleting ? 40 : 85;
			if (!deleting && char === word.length) {
				deleting = true;
				wait = 1800;
			} else if (deleting && char === 0) {
				deleting = false;
				role = (role + 1) % roles.length;
				wait = 400;
			}
			setTimeout(tick, wait);
		};
		setTimeout(tick, 700);
	}

	/* ---------- Contadores ---------- */
	const countObserver = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (!entry.isIntersecting) return;
				const el = entry.target;
				const target = Number(el.dataset.count);
				countObserver.unobserve(el);

				if (reduceMotion) {
					el.textContent = target;
					return;
				}
				const start = performance.now();
				const duration = 1200;
				const step = (now) => {
					const t = Math.min((now - start) / duration, 1);
					el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
					if (t < 1) requestAnimationFrame(step);
				};
				requestAnimationFrame(step);
			});
		},
		{ threshold: 0.6 }
	);
	document.querySelectorAll("[data-count]").forEach((el) => countObserver.observe(el));

	/* ---------- Diversos ---------- */
	document.getElementById("year").textContent = new Date().getFullYear();
	observeReveals();
})();
