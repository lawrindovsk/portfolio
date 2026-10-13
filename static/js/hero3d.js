/*
 * Paisagem 3D do início: terreno de blocos (estética KoGaMa / voxel) com o Pyter passeando.
 * - Ele anda sozinho, come, bebe água, brinca com a bola, o osso e o patinho, senta e dorme à noite.
 * - Clicar num brinquedo ou num pote manda ele até lá.
 * - O céu segue o horário de São Paulo (dia, pôr do sol, noite com estrelas e postes acesos).
 *   Para testar outro horário: ?hora=20 (ou 6.5, 18, ...).
 * Tudo é feito com caixas simples do Three.js, sem modelos externos.
 */
import * as THREE from "../vendor/three.module.js"; // Three.js 0.160 (cópia local, sem depender de CDN)
import { PIXEL_ICONS, REACTIONS } from "./hero/pixel-icons.js";

const container = document.getElementById("hero3d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (container) {
	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	container.appendChild(renderer.domElement);

	const scene = new THREE.Scene();
	scene.background = new THREE.Color();
	scene.fog = new THREE.Fog(0xffffff, 38, 75);
	const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 150);

	const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
	const box = (w, h, d, color, extra) => {
		const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color, extra));
		m.castShadow = true;
		m.receiveShadow = true;
		return m;
	};
	const place = (parent, mesh, x, y, z) => {
		mesh.position.set(x, y, z);
		parent.add(mesh);
		return mesh;
	};

	// caixa invisível que aumenta a área de clique/toque de um objeto
	const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
	const hitbox = (parent, w, h, d, y = h / 2) => place(parent, new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hitMat), 0, y, 0);

	/* =========================================================
	   Terreno
	   ========================================================= */
	const W = 22;
	const D = 10;
	// área plana onde o Pyter circula (superfície em y = 1)
	const FLAT = { x0: -11, x1: 11, z0: -3, z1: 7.5 };
	const S = 1;
	const LAKE = { x0: 7, x1: 10, z0: 1, z1: 4 };
	const inLake = (x, z) => x >= LAKE.x0 && x <= LAKE.x1 && z >= LAKE.z0 && z <= LAKE.z1;
	const nearLake = (x, z, m = 0.9) => x > LAKE.x0 - m && x < LAKE.x1 + m && z > LAKE.z0 - m && z < LAKE.z1 + m;
	const dirtPatch = (x, z) => x >= -6 && x <= -1 && z >= 2 && z <= 4;

	const heights = new Map();
	const key = (x, z) => `${x},${z}`;
	for (let x = -W; x <= W; x++) {
		// o terreno se estende para a frente para cobrir a parte de baixo em telas em pé
		for (let z = -D; z <= D + 10; z++) {
			const far = Math.max(0, -z - 4) * 0.6 + Math.max(0, Math.abs(x) - 13) * 0.45;
			const noise = Math.sin(x * 0.7) * Math.cos(z * 0.9) + Math.sin(x * 0.23 + z * 0.4);
			const hill = far > 0 ? Math.max(0, Math.round(far + noise * 0.8)) : 0;
			heights.set(key(x, z), inLake(x, z) ? 1 : 2 + hill);
		}
	}
	// altura da superfície (topo do bloco mais alto) naquela coluna
	const surfaceAt = (x, z) => (heights.get(key(Math.round(x), Math.round(z))) ?? 2) - 1;

	const cells = [...heights].map(([k, h]) => {
		const [x, z] = k.split(",").map(Number);
		return { x, z, h };
	});
	const blocks = new THREE.InstancedMesh(
		new THREE.BoxGeometry(1, 1, 1),
		new THREE.MeshLambertMaterial(),
		cells.reduce((n, c) => n + c.h, 0),
	);
	blocks.castShadow = true;
	blocks.receiveShadow = true;
	{
		const m4 = new THREE.Matrix4();
		const col = new THREE.Color();
		const grass = [0x7bc043, 0x6db33f, 0x86c94b, 0x74b843];
		let i = 0;
		for (const c of cells) {
			for (let y = 0; y < c.h; y++) {
				m4.setPosition(c.x, y - 0.5, c.z);
				blocks.setMatrixAt(i, m4);
				let color = 0x8a5f36;
				if (y === c.h - 1) {
					if (inLake(c.x, c.z)) color = 0xd9c38c;
					else if (dirtPatch(c.x, c.z)) color = 0xc9a66b;
					else color = grass[(c.x * 7 + c.z * 13) & 3];
				}
				blocks.setColorAt(i++, col.setHex(color));
			}
		}
	}
	scene.add(blocks);

	const water = place(
		scene,
		new THREE.Mesh(
			new THREE.BoxGeometry(LAKE.x1 - LAKE.x0 + 1, 0.8, LAKE.z1 - LAKE.z0 + 1),
			lambert(0x3fa9f5, { transparent: true, opacity: 0.8 }),
		),
		(LAKE.x0 + LAKE.x1) / 2,
		0.45,
		(LAKE.z0 + LAKE.z1) / 2,
	);
	water.receiveShadow = true;

	/* =========================================================
	   Vegetação
	   ========================================================= */
	const rand = (a, b) => a + Math.random() * (b - a);
	const keepClear = (x, z) =>
		(x > FLAT.x0 + 1 && x < FLAT.x1 - 1 && z > FLAT.z0 + 0.5 && z < FLAT.z1 - 1.5) || nearLake(x, z, 0.6);

	const tree = (x, z, s = 1) => {
		const g = new THREE.Group();
		place(g, box(0.6, 1.8, 0.6, 0x7a4f2a), 0, 0.9, 0);
		place(g, box(2.2, 1, 2.2, 0x3f8f2f), 0, 2.2, 0);
		place(g, box(1.4, 1, 1.4, 0x4fa83a), 0, 3.1, 0);
		g.scale.setScalar(s);
		g.position.set(x, surfaceAt(x, z), z);
		scene.add(g);
	};
	for (const [x, z, s] of [
		[-14, -3, 1.2], [-13, 6, 1], [14, -2, 1.1], [16, 5, 0.9], [-5, -8, 1.3],
		[6, -8, 1.1], [-18, -7, 1.2], [19, -6, 1.3], [18, 9, 0.9], [-18, 9, 0.8],
	]) tree(x, z, s);

	const bush = (x, z) => {
		const g = new THREE.Group();
		const greens = [0x4fa83a, 0x5cb846, 0x3f8f2f];
		for (let b = 0; b < 3; b++) {
			const s = rand(0.5, 0.8);
			place(g, box(s, s, s, greens[b]), rand(-0.35, 0.35), s / 2, rand(-0.35, 0.35));
		}
		if (Math.random() < 0.5) place(g, box(0.14, 0.14, 0.14, 0xff6b6b), 0.2, 0.75, 0.1); // frutinha
		g.position.set(x, surfaceAt(x, z), z);
		scene.add(g);
	};
	const sprout = (x, z) => {
		// plantinha: talinho com duas folhas
		const g = new THREE.Group();
		place(g, box(0.06, 0.35, 0.06, 0x3f8f2f), 0, 0.17, 0);
		const l1 = place(g, box(0.22, 0.05, 0.12, 0x6fcf4a), 0.1, 0.3, 0);
		l1.rotation.z = 0.4;
		const l2 = place(g, box(0.22, 0.05, 0.12, 0x6fcf4a), -0.1, 0.24, 0);
		l2.rotation.z = -0.4;
		g.rotation.y = rand(0, Math.PI);
		g.position.set(x, surfaceAt(x, z), z);
		scene.add(g);
	};
	const flower = (x, z, color) => {
		const g = new THREE.Group();
		place(g, box(0.05, 0.3, 0.05, 0x3f8f2f), 0, 0.15, 0);
		place(g, box(0.2, 0.2, 0.2, color), 0, 0.38, 0);
		place(g, box(0.08, 0.08, 0.22, 0xf4d03f), 0, 0.38, 0);
		g.position.set(x, surfaceAt(x, z), z);
		scene.add(g);
	};
	const vasinho = (x, z) => {
		// vaso de planta perto dos potes
		const g = new THREE.Group();
		place(g, box(0.45, 0.4, 0.45, 0xc8693c), 0, 0.2, 0);
		place(g, box(0.4, 0.05, 0.4, 0x5a3a1e), 0, 0.41, 0);
		place(g, box(0.12, 0.5, 0.12, 0x3f8f2f), 0, 0.65, 0);
		place(g, box(0.4, 0.12, 0.18, 0x5cb846), 0.12, 0.8, 0);
		place(g, box(0.18, 0.12, 0.4, 0x6fcf4a), -0.05, 0.95, 0.05);
		g.position.set(x, surfaceAt(x, z), z);
		scene.add(g);
	};

	const flowerColors = [0xff6b9d, 0xffffff, 0x9b59ff, 0xff9f43];
	for (let n = 0, tries = 0; n < 60 && tries < 600; tries++) {
		const x = Math.round(rand(-W + 1, W - 1)) + rand(-0.3, 0.3);
		const z = Math.round(rand(-D + 1, D - 1)) + rand(-0.3, 0.3);
		if (keepClear(x, z)) continue;
		const r = Math.random();
		if (r < 0.25) bush(x, z);
		else if (r < 0.6) sprout(x, z);
		else flower(x, z, flowerColors[n % 4]);
		n++;
	}
	// algumas plantinhas na grama da área central, longe do caminho dos brinquedos
	const CENTER_SPROUTS = [[-9, -1.5], [-8, 6], [2, 6.5], [10, -2], [-10, 3], [5, -2.4]];
	for (const [x, z] of CENTER_SPROUTS) sprout(x, z);
	bush(-10.5, 6.8);
	bush(10.5, 6.5);

	/* =========================================================
	   Postes (acendem à noite)
	   ========================================================= */
	const lamps = [];
	const lampPost = (x, z) => {
		const g = new THREE.Group();
		place(g, box(0.2, 2.6, 0.2, 0x3a3a3a), 0, 1.3, 0);
		const bulb = place(g, box(0.45, 0.45, 0.45, 0xfff1c1, { emissive: 0xffc861, emissiveIntensity: 0 }), 0, 2.75, 0);
		place(g, box(0.6, 0.12, 0.6, 0x2a2a2a), 0, 3.03, 0);
		const light = new THREE.PointLight(0xffc861, 0, 12, 1.6);
		light.position.y = 2.6;
		g.add(light);
		g.position.set(x, surfaceAt(x, z), z);
		scene.add(g);
		lamps.push({ bulb, light });
	};
	lampPost(-9, 0);
	lampPost(5, 6.5);

	/* =========================================================
	   Potes e brinquedos
	   ========================================================= */
	const interactive = []; // objetos clicáveis

	const bowl = (x, z, rimColor, fillColor) => {
		const g = new THREE.Group();
		const rim = rimColor;
		place(g, box(0.7, 0.08, 0.7, rim), 0, 0.04, 0);
		place(g, box(0.7, 0.25, 0.1, rim), 0, 0.16, 0.3);
		place(g, box(0.7, 0.25, 0.1, rim), 0, 0.16, -0.3);
		place(g, box(0.1, 0.25, 0.5, rim), 0.3, 0.16, 0);
		place(g, box(0.1, 0.25, 0.5, rim), -0.3, 0.16, 0);
		const fill = place(g, box(0.5, 0.18, 0.5, fillColor), 0, 0.13, 0);
		g.position.set(x, S, z);
		scene.add(g);
		return { group: g, fill, level: 1 };
	};
	const food = bowl(-4.5, 3, 0xe74c3c, 0x9c5a2c);
	const drink = bowl(-2.8, 3, 0x3b82f6, 0x7cc7f5);
	food.fill.material.transparent = false;
	drink.fill.material = lambert(0x7cc7f5, { transparent: true, opacity: 0.9 });
	// granulado de ração
	for (let k = 0; k < 6; k++) place(food.fill, box(0.09, 0.09, 0.09, 0x7a4320), rand(-0.18, 0.18), 0.1, rand(-0.18, 0.18));

	const ball = new THREE.Group();
	place(ball, box(0.42, 0.42, 0.42, 0xe63946), 0, 0, 0);
	place(ball, box(0.44, 0.1, 0.44, 0xffffff), 0, 0, 0);
	ball.position.set(2.5, S + 0.21, 0.5);
	scene.add(ball);
	ball.userData = { vel: new THREE.Vector3(), r: 0.21 };

	const bone = new THREE.Group();
	place(bone, box(0.6, 0.12, 0.12, 0xf5f0e1), 0, 0, 0);
	for (const sx of [-0.32, 0.32]) {
		place(bone, box(0.14, 0.14, 0.14, 0xf5f0e1), sx, 0, 0.08);
		place(bone, box(0.14, 0.14, 0.14, 0xf5f0e1), sx, 0, -0.08);
	}
	bone.position.set(-7, S + 0.08, 4.5);
	bone.rotation.y = 0.6;
	scene.add(bone);

	const duck = new THREE.Group();
	place(duck, box(0.4, 0.28, 0.32, 0xffd23f), 0, 0.14, 0);
	place(duck, box(0.22, 0.22, 0.22, 0xffd23f), 0.14, 0.38, 0);
	place(duck, box(0.12, 0.06, 0.12, 0xff8c1a), 0.3, 0.36, 0);
	place(duck, box(0.04, 0.05, 0.05, 0x111111), 0.22, 0.43, 0.1);
	place(duck, box(0.04, 0.05, 0.05, 0x111111), 0.22, 0.43, -0.1);
	duck.position.set(4, S, 3.5);
	duck.rotation.y = -0.8;
	scene.add(duck);

	/* ---------- Casinha do Pyter (base cinza, telhado vermelho), porta virada para a frente ---------- */
	const house = new THREE.Group();
	{
		const GRAY = 0x9a9a9a;
		const RED = 0xc0392b;
		place(house, box(1.9, 0.08, 1.8, 0x7d7d7d), 0, 0.04, 0); // piso
		place(house, box(1.9, 1.5, 0.12, GRAY), 0, 0.75, -0.84); // fundo
		place(house, box(0.12, 1.5, 1.8, GRAY), -0.89, 0.75, 0); // laterais
		place(house, box(0.12, 1.5, 1.8, GRAY), 0.89, 0.75, 0);
		place(house, box(0.45, 1.5, 0.12, 0x8f8f8f), -0.72, 0.75, 0.84); // frente, com a porta no meio
		place(house, box(0.45, 1.5, 0.12, 0x8f8f8f), 0.72, 0.75, 0.84);
		place(house, box(1.0, 0.25, 0.12, 0x8f8f8f), 0, 1.38, 0.84);
		// oitões (triângulo em degraus) na frente e no fundo
		for (const z of [0.84, -0.84]) {
			place(house, box(1.5, 0.25, 0.12, GRAY), 0, 1.62, z);
			place(house, box(1.0, 0.25, 0.12, GRAY), 0, 1.87, z);
			place(house, box(0.5, 0.2, 0.12, GRAY), 0, 2.08, z);
		}
		const roofL = place(house, box(1.35, 0.14, 2.1, RED), -0.52, 1.88, 0);
		roofL.rotation.z = 0.62;
		const roofR = place(house, box(1.35, 0.14, 2.1, RED), 0.52, 1.88, 0);
		roofR.rotation.z = -0.62;
		place(house, box(0.22, 0.18, 2.14, 0x962d22), 0, 2.27, 0); // cumeeira
		place(house, box(0.5, 0.14, 0.04, 0xf5f0e1), 0, 1.38, 0.91); // plaquinha
	}
	house.position.set(-5.5, S, -1.6);
	scene.add(house);
	const HOUSE_IN = { x: house.position.x, z: house.position.z + 0.05 };
	const HOUSE_DOOR = { x: house.position.x, z: house.position.z + 1.8 };

	/* ---------- Mantas: bege (quentinha, felpuda) e azul (simples, com patinhas) ---------- */
	const blanket = (color, decorate) => {
		const g = new THREE.Group();
		place(g, box(1.05, 0.06, 0.95, color), 0, 0.03, 0);
		decorate(g);
		scene.add(g);
		return { g, inHouse: false };
	};
	const beige = blanket(0xeadcbc, (g) => {
		// borda mais grossa e tufinhos: manta felpuda
		place(g, box(1.09, 0.09, 0.1, 0xf6ecd4), 0, 0.045, 0.45);
		place(g, box(1.09, 0.09, 0.1, 0xf6ecd4), 0, 0.045, -0.45);
		for (const [x, z] of [[-0.25, -0.15], [0.2, 0.2], [0.3, -0.25], [-0.3, 0.25]]) place(g, box(0.12, 0.08, 0.12, 0xf6ecd4), x, 0.05, z);
	});
	const blue = blanket(0x4f86d9, (g) => {
		const paw = (x, z) => {
			place(g, box(0.14, 0.07, 0.12, 0xffffff), x, 0.04, z);
			for (const dx of [-0.08, 0, 0.08]) place(g, box(0.05, 0.07, 0.05, 0xffffff), x + dx, 0.04, z - 0.12);
		};
		paw(-0.25, 0.2);
		paw(0.25, -0.1);
	});
	const blankets = [beige, blue];
	// dentro da casa as mantas empilham; fora, ficam onde o Pyter largou
	const layoutHouse = () => {
		let layer = 0;
		for (const b of blankets) {
			if (!b.inHouse || b === carriedBlanket) continue;
			b.g.position.set(HOUSE_IN.x, S + 0.08 + layer * 0.06, HOUSE_IN.z);
			b.g.rotation.set(0, 0, 0);
			layer++;
		}
	};
	let carriedBlanket = null;
	beige.inHouse = true;
	blue.g.position.set(-3.3, S, -1.2);
	blue.g.rotation.y = 0.3;
	layoutHouse();

	for (const o of [food.group, drink.group, bone, duck]) hitbox(o, 1.1, 0.9, 1.1);
	hitbox(ball, 0.9, 0.9, 0.9, 0);

	interactive.push(
		{ obj: food.group, task: "eat" },
		{ obj: drink.group, task: "drink" },
		{ obj: ball, task: "ball" },
		{ obj: bone, task: "bone" },
		{ obj: duck, task: "duck" },
	);

	/* =========================================================
	   Pyter
	   ========================================================= */
	const WHITE = 0xf7f4ee;
	const BLACK = 0x1d1d1d;
	const dog = new THREE.Group(); // posição e direção
	const rig = new THREE.Group(); // pose (sentar, deitar, pular)
	dog.add(rig);

	const LEG = 0.38;
	const body = place(rig, box(1.0, 0.55, 0.56, WHITE), 0, LEG + 0.27, 0);
	place(body, box(0.3, 0.3, 0.57, 0xeee8dc), -0.36, 0.06, 0); // anca levemente creme

	const legs = [[0.34, 0.18], [0.34, -0.18], [-0.34, 0.18], [-0.34, -0.18]].map(([x, z]) => {
		const pivot = place(rig, new THREE.Group(), x, LEG, z);
		place(pivot, box(0.17, LEG, 0.17, WHITE), 0, -LEG / 2, 0);
		place(pivot, box(0.19, 0.07, 0.2, 0xe9e2d6), 0.01, -LEG + 0.035, 0); // patinha
		return pivot;
	});

	const head = place(rig, new THREE.Group(), 0.5, LEG + 0.62, 0);
	place(head, box(0.62, 0.56, 0.58, WHITE), 0.08, 0.05, 0);
	place(head, box(0.3, 0.24, 0.34, WHITE), 0.48, -0.1, 0); // focinho
	place(head, box(0.12, 0.1, 0.16, BLACK), 0.66, -0.02, 0); // nariz
	place(head, box(0.04, 0.03, 0.06, 0x555555), 0.72, 0.0, 0.03); // brilho do nariz
	const tongue = place(head, box(0.12, 0.04, 0.12, 0xf28b8b), 0.55, -0.24, 0);
	place(head, box(0.34, 0.36, 0.05, BLACK), 0.22, 0.1, 0.28); // mancha preta no olho
	const eyes = [0.31, -0.31].map((z) => {
		const e = place(head, new THREE.Group(), 0.3, 0.11, z);
		place(e, box(0.1, 0.11, 0.03, 0x3b2010), 0, 0, 0);
		place(e, box(0.035, 0.035, 0.035, 0xffffff), 0.025, 0.03, Math.sign(z) * 0.005); // brilho
		return e;
	});
	place(head, box(0.1, 0.06, 0.02, 0xf2a7a7), 0.32, -0.08, -0.3); // bochecha
	const earL = place(head, new THREE.Group(), -0.06, 0.33, 0.22);
	place(earL, box(0.18, 0.3, 0.14, BLACK), 0, 0.12, 0);
	earL.rotation.x = 0.35;
	const earR = place(head, new THREE.Group(), -0.06, 0.33, -0.22);
	place(earR, box(0.18, 0.3, 0.14, WHITE), 0, 0.12, 0);
	place(earR, box(0.19, 0.08, 0.1, 0x6b6b6b), 0, 0.2, -0.01); // pintinhas
	place(earR, box(0.08, 0.06, 0.15, 0x8a8a8a), 0.04, 0.08, 0);
	earR.rotation.x = -0.35;

	const tail = place(rig, new THREE.Group(), -0.5, LEG + 0.45, 0);
	place(tail, box(0.12, 0.3, 0.12, WHITE), 0, 0.15, 0);
	place(tail, box(0.11, 0.18, 0.11, WHITE), -0.06, 0.34, 0).rotation.z = 0.5;
	tail.rotation.z = 0.7;

	hitbox(dog, 1.9, 1.9, 1.3); // área de clique/toque generosa, boa para o dedo no celular
	dog.scale.setScalar(1.15);
	dog.position.set(0, S, 1.5);
	scene.add(dog);

	/* =========================================================
	   Reações ao carinho (clique/toque no Pyter)
	   Cada clique seguido avança uma reação: feliz, coração, estrelinha, música, susto, amor.
	   ========================================================= */

	// desenha o balão de fala em pixel art num canvas 24x24 (ampliado sem suavizar)
	const bubbleTexture = (iconName) => {
		const c = document.createElement("canvas");
		c.width = c.height = 24;
		const g = c.getContext("2d");
		const px = (x, y, w, h, color) => {
			g.fillStyle = color;
			g.fillRect(x, y, w, h);
		};
		px(3, 1, 18, 1, "#222");
		px(3, 18, 18, 1, "#222");
		px(2, 2, 1, 16, "#222");
		px(21, 2, 1, 16, "#222");
		px(3, 2, 18, 16, "#fff");
		// rabinho do balão
		px(9, 19, 4, 1, "#222");
		px(10, 19, 2, 1, "#fff");
		px(10, 20, 3, 1, "#222");
		px(11, 20, 1, 1, "#fff");
		px(11, 21, 2, 1, "#222");
		const icon = PIXEL_ICONS[iconName];
		icon.rows.forEach((row, y) =>
			[...row].forEach((ch, x) => {
				if (icon.colors[ch]) px(7 + x, 5 + y, 1, 1, icon.colors[ch]);
			}),
		);
		const tex = new THREE.CanvasTexture(c);
		tex.magFilter = THREE.NearestFilter;
		tex.minFilter = THREE.NearestFilter;
		tex.colorSpace = THREE.SRGBColorSpace;
		return tex;
	};
	const bubbleTextures = Object.fromEntries(Object.keys(PIXEL_ICONS).map((r) => [r, bubbleTexture(r)]));
	const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTextures.feliz, depthTest: false, transparent: true, fog: false }));
	bubble.renderOrder = 10;
	bubble.visible = false;
	scene.add(bubble);
	const bubbleState = { t: 0, life: 0 };

	const showBubble = (name) => {
		bubble.material.map = bubbleTextures[name];
		bubble.material.needsUpdate = true;
		bubble.visible = true;
		bubbleState.t = 0;
		bubbleState.life = 2.2;
	};
	const updateBubble = (dt) => {
		if (!bubble.visible) return;
		bubbleState.t += dt;
		const t = bubbleState.t;
		// "pop" com leve exagero, depois flutua e some
		const pop = t < 0.25 ? THREE.MathUtils.lerp(0, 1.15, t / 0.25) : t < 0.4 ? THREE.MathUtils.lerp(1.15, 1, (t - 0.25) / 0.15) : 1;
		bubble.scale.setScalar(1.8 * pop);
		bubble.position.set(dog.position.x, dog.position.y + 2.8 + t * 0.15, dog.position.z);
		bubble.material.opacity = t > bubbleState.life - 0.4 ? Math.max(0, (bubbleState.life - t) / 0.4) : 1;
		if (t > bubbleState.life) bubble.visible = false;
	};

	let petCount = 0;
	let lastPet = -10;

	/* =========================================================
	   Comportamento
	   ========================================================= */
	const flat = (x, z) => ({ x: THREE.MathUtils.clamp(x, FLAT.x0, FLAT.x1), z: THREE.MathUtils.clamp(z, FLAT.z0, FLAT.z1) });
	const inside = (v) => ({
		get x() { return THREE.MathUtils.clamp(v.x, FLAT.x0 + 0.6, FLAT.x1 - 0.6); },
		get z() { return THREE.MathUtils.clamp(v.z, FLAT.z0 + 0.6, FLAT.z1 - 0.6); },
	});
	// objetos sólidos: o Pyter contorna em vez de passar por cima (raio já conta o tamanho dele)
	const OBSTACLES = [
		// raio = metade do objeto + ~0,6 (meio corpo do Pyter), para nem a cabeça nem o rabo encostarem
		{ pos: food.group.position, r: 0.95 },
		{ pos: drink.group.position, r: 0.95 },
		{ pos: duck.position, r: 0.8 },
		{ pos: house.position, r: 1.6 },
		{ pos: { x: -9, z: 0 }, r: 0.7 }, // postes
		{ pos: { x: 5, z: 6.5 }, r: 0.7 },
		{ pos: { x: -10.5, z: 6.8 }, r: 1.0 }, // arbustos
		{ pos: { x: 10.5, z: 6.5 }, r: 1.0 },
		...CENTER_SPROUTS.map(([x, z]) => ({ pos: { x, z }, r: 0.6 })), // plantinhas
	];
	const blocked = (x, z, extra = 0) => OBSTACLES.some((o) => Math.hypot(x - o.pos.x, z - o.pos.z) < o.r + extra);
	// empurra o ponto para fora de qualquer obstáculo, deslizando pela borda dele
	const pushOut = (p) => {
		for (const o of OBSTACLES) {
			const dx = p.x - o.pos.x;
			const dz = p.z - o.pos.z;
			const d = Math.hypot(dx, dz) || 0.001;
			if (d < o.r) {
				p.x = o.pos.x + (dx / d) * o.r;
				p.z = o.pos.z + (dz / d) * o.r;
			}
		}
		return p;
	};
	// desvia antes de encostar: se o caminho reto cruza um obstáculo, mira na lateral dele
	const steerAround = (target) => {
		for (const o of OBSTACLES) {
			const ax = target.x - dog.position.x;
			const az = target.z - dog.position.z;
			const len = Math.hypot(ax, az);
			if (len < 0.01) continue;
			const ox = o.pos.x - dog.position.x;
			const oz = o.pos.z - dog.position.z;
			const along = (ox * ax + oz * az) / len;
			if (along <= 0 || along > len) continue;
			// o obstáculo fica a -side da linha (na normal n); o desvio passa pelo lado oposto
			const side = (ox * az - oz * ax) / len;
			if (Math.abs(side) >= o.r + 0.15) continue;
			const k = (side >= 0 ? 1 : -1) * (o.r + 0.4);
			return { x: o.pos.x + (-az / len) * k, z: o.pos.z + (ax / len) * k };
		}
		return target;
	};
	const randomSpot = () => {
		for (;;) {
			// em telas em pé a câmera enxerga menos dos lados: passeia só pelo miolo visível
			const spanX = container.clientWidth < container.clientHeight * 1.2 ? 5 : FLAT.x1 - 1;
			const p = { x: rand(-spanX, spanX), z: rand(FLAT.z0 + 0.5, FLAT.z1 - 0.5) };
			if (!nearLake(p.x, p.z, 1.2) && !blocked(p.x, p.z, 0.3)) return p;
		}
	};
	const bowlFront = (b) => ({ x: b.group.position.x, z: b.group.position.z + 1.1 });

	let heading = 0;
	let carrying = null;
	let task = null; // { type, target, phase, t }
	let idleFor = 1.5;
	let isNight = false;
	// à noite o Pyter dorme; um clique o acorda por um tempo sorteado
	let awakeUntil = 0;
	let nowT = 0;
	const sleepy = () => isNight && nowT > awakeUntil;

	let inHouse = false;
	let lastBlanketMove = -99;
	const outsideBlankets = () => blankets.filter((b) => !b.inHouse && b !== carriedBlanket);

	const grabBlanket = (b) => {
		carriedBlanket = b;
		head.add(b.g);
		b.g.position.set(0.62, -0.32, 0); // dobrada na boca
		b.g.rotation.set(0, 0, 0);
		b.g.scale.set(0.42, 1.6, 0.5);
		layoutHouse();
	};
	const dropBlanket = (intoHouse) => {
		const b = carriedBlanket;
		if (!b) return;
		carriedBlanket = null;
		scene.add(b.g);
		b.g.scale.set(1, 1, 1);
		b.inHouse = intoHouse;
		if (intoHouse) return layoutHouse();
		// estende a manta no chão logo à frente dele
		const p = pushOut({ x: dog.position.x + Math.cos(heading) * 0.7, z: dog.position.z - Math.sin(heading) * 0.7 });
		b.g.position.set(p.x, S, p.z);
		b.g.rotation.set(0, heading + rand(-0.3, 0.3), 0);
	};

	// onde dormir é sorteado: casinha, uma manta lá fora ou qualquer cantinho
	const sleepSpot = () => {
		if (inHouse) return null;
		const outside = outsideBlankets();
		const r = Math.random();
		if (r < 0.5) return { house: true, target: HOUSE_DOOR };
		if (r < 0.85 && outside.length) {
			const b = outside[Math.floor(Math.random() * outside.length)];
			return { target: { x: b.g.position.x, z: b.g.position.z } };
		}
		return null;
	};

	const setTask = (type) => {
		if (carrying && type !== "bone") dropBone();
		if (carriedBlanket && type !== "blanketDrop") dropBlanket(false);
		// dentro da casinha, qualquer coisa que não seja dormir/reagir começa saindo pela porta
		if (inHouse && !["sleep", "react", "exit"].includes(type)) {
			task = { type: "exit", phase: "do", t: 0, next: type };
			return;
		}
		switch (type) {
			case "eat": task = { type, target: bowlFront(food), face: food.group.position }; break;
			case "drink": task = { type, target: bowlFront(drink), face: drink.group.position }; break;
			case "ball": task = { type, target: inside(ball.position), run: true, face: ball.position }; break;
			case "duck": task = { type, target: { x: duck.position.x - 1.0, z: duck.position.z }, face: duck.position }; break;
			case "bone": task = { type, target: carrying ? randomSpot() : inside(bone.position), face: bone.position }; break;
			case "sit": task = { type, dur: rand(3, 5) }; break;
			// need: quantos cliques seguidos para acordar (sorteado); pose: ângulo de rolagem do corpo
			case "sleep": {
				const spot = sleepSpot();
				task = { type, dur: rand(12, 20), need: 3 + Math.floor(rand(0, 4)), pokes: 0, lastPoke: -10, pose: 0, shiftIn: rand(4, 9), dream: 0, stir: 0 };
				if (spot) {
					task.target = spot.target;
					task.enter = !!spot.house;
				}
				break;
			}
			case "exit": task = { type, next: null }; break;
			case "blanket": {
				// leva uma manta para dentro ou para fora da casinha (sorteado)
				const b = blankets[Math.floor(Math.random() * blankets.length)];
				lastBlanketMove = nowT;
				task = b.inHouse
					? { type, b, target: HOUSE_DOOR, face: house.position }
					: { type, b, target: { x: b.g.position.x, z: b.g.position.z } };
				break;
			}
			case "react": task = { type, dur: 2 }; break;
			default: task = { type: "walk", target: randomSpot() };
		}
		task.t = 0;
		task.phase = task.target ? "go" : "do";
	};

	const SLEEP_POSES = [0, Math.PI / 2, -Math.PI / 2, Math.PI]; // enrolado, de lado (2) e de barriga pra cima
	const otherSleepPose = (cur) => {
		const options = SLEEP_POSES.filter((p) => p !== cur);
		return options[Math.floor(Math.random() * options.length)];
	};

	const petDog = (now) => {
		if (task?.type === "sleep") {
			// precisa insistir: cliques espaçados demais não contam (ele volta ao sono pesado)
			task.pokes = now - task.lastPoke < 3 ? task.pokes + 1 : 1;
			task.lastPoke = now;
			if (task.pokes < task.need) {
				task.stir = 0.8; // resmunga, mexe a orelha
				if (Math.random() < 0.45) task.pose = otherSleepPose(task.pose); // às vezes rola para o outro lado
				showBubble("zzz");
				return;
			}
			petCount = 0;
		}
		// acordou (ou ganhou mais carinho): à noite fica de pé por 25 a 60 s antes de voltar a dormir
		if (isNight) awakeUntil = Math.max(awakeUntil, now + rand(25, 60));
		petCount = now - lastPet < 1.6 ? petCount + 1 : 1;
		lastPet = now;
		const kind = REACTIONS[(petCount - 1) % REACTIONS.length];
		showBubble(kind);
		setTask("react");
		task.kind = kind;
	};

	let pendingStart = null; // primeira atividade sorteada no carregamento
	const chooseNext = () => {
		const r = Math.random();
		if (pendingStart) {
			const first = pendingStart;
			pendingStart = null;
			// à noite ele já pode ser encontrado dormindo
			if (sleepy() || (isNight && Math.random() < 0.7)) return setTask("sleep");
			return setTask(first);
		}
		const canMoveBlanket = nowT - lastBlanketMove > 25;
		if (sleepy()) {
			// antes de deitar, às vezes arruma as mantas do jeito dele
			if (!inHouse && canMoveBlanket && r < 0.3) return setTask("blanket");
			return setTask("sleep");
		}
		if (inHouse) return setTask("exit");
		if (canMoveBlanket && r < 0.07) return setTask("blanket");
		if (food.level > 0.15 && r < 0.18) return setTask("eat");
		if (drink.level > 0.15 && r < 0.32) return setTask("drink");
		if (r < 0.5) return setTask("ball");
		if (r < 0.6) return setTask("bone");
		if (r < 0.7) return setTask("duck");
		if (r < 0.8) return setTask("sit");
		setTask("walk");
	};

	// a cada carregamento: Pyter nasce num lugar, direção e atividade sorteados, e as mantas também mudam de lugar
	{
		const p = randomSpot();
		dog.position.set(p.x, S, p.z);
		heading = rand(-Math.PI, Math.PI);
		for (const b of blankets) {
			if (Math.random() < 0.5) continue;
			b.inHouse = !b.inHouse;
			if (!b.inHouse) {
				const q = randomSpot();
				b.g.position.set(q.x, S, q.z);
				b.g.rotation.y = rand(0, Math.PI);
			}
		}
		layoutHouse();
		const starts = ["sit", "walk", "ball", "bone", "duck", "eat", "drink"];
		idleFor = 0.4;
		pendingStart = starts[Math.floor(Math.random() * starts.length)];
	}

	const pickBone = () => {
		carrying = bone;
		head.add(bone);
		bone.position.set(0.6, -0.22, 0);
		bone.rotation.set(0, Math.PI / 2, 0);
	};
	function dropBone() {
		if (!carrying) return;
		const p = head.localToWorld(new THREE.Vector3(0.6, 0, 0));
		scene.add(bone);
		bone.position.set(p.x, S + 0.08, p.z);
		bone.rotation.set(0, heading + Math.PI / 2, 0);
		carrying = null;
	}

	const kickBall = (power = 4.5) => {
		const a = heading + rand(-0.5, 0.5);
		ball.userData.vel.set(Math.cos(a) * power, rand(2, 3.5), -Math.sin(a) * power);
	};

	const duckSquish = { t: 0 };

	const angleTo = (from, to) => Math.atan2(-(to.z - from.z), to.x - from.x);
	const turnToward = (target, dt, rate = 6) => {
		let diff = target - heading;
		diff = Math.atan2(Math.sin(diff), Math.cos(diff));
		heading += diff * Math.min(1, rate * dt);
		return Math.abs(diff);
	};

	// pose atual, suavizada a cada frame
	const pose = { sit: 0, lie: 0, eat: 0, jump: 0, walk: 0, eyes: 1, tilt: 0, wag: 0, sway: 0 };
	let spin = 0; // giro extra (estrelinha)
	let roll = 0; // cambalhota (amor)
	let sleepRoll = 0; // posição de sono: de lado / barriga pra cima
	// fases acumuladas: mudar de ritmo (andar/correr/parar) não faz as patas "pularem"
	let gait = 0;
	let wagPhase = 0;
	let hovering = false;
	let shake = 0; // sacudida de cabeça ao bater na parede
	const goal = { ...pose };

	const updateDog = (dt, t) => {
		nowT = t;
		for (const k in goal) goal[k] = 0;
		goal.eyes = 1;

		if (!task) {
			idleFor -= dt;
			if (idleFor <= 0) chooseNext();
		} else if (task.phase === "go") {
			const dx = task.target.x - dog.position.x;
			const dz = task.target.z - dog.position.z;
			const dist = Math.hypot(dx, dz);
			const reach = task.type === "ball" ? 0.75 : task.type === "bone" && !carrying ? 0.7 : 0.2;
			if (dist < reach) {
				task.phase = "do";
				task.t = 0;
			} else {
				const via = steerAround(task.target);
				turnToward(Math.atan2(-(via.z - dog.position.z), via.x - dog.position.x), dt);
				const speed = task.run ? 3.4 : 1.9;
				let nx = dog.position.x + Math.cos(heading) * speed * dt;
				let nz = dog.position.z - Math.sin(heading) * speed * dt;
				// contorna o lago deslizando pela borda
				if (nearLake(nx, nz, 0.7)) {
					if (!nearLake(nx, dog.position.z, 0.7)) nz = dog.position.z;
					else if (!nearLake(dog.position.x, nz, 0.7)) nx = dog.position.x;
					else {
						nx = dog.position.x;
						nz = dog.position.z + speed * dt;
					}
				}
				const p = flat(...Object.values(pushOut({ x: nx, z: nz })));
				const moved = Math.hypot(p.x - dog.position.x, p.z - dog.position.z);
				dog.position.x = p.x;
				dog.position.z = p.z;
				goal.walk = task.run ? 1.6 : 1;
				// bateu na parede (borda da área ou lago): para de "andar no lugar" e reage
				task.stuck = moved < speed * dt * 0.35 ? (task.stuck || 0) + dt : 0;
				if (task.stuck > 0.2) {
					if (carrying) dropBone();
					showBubble("duvida");
					task = { type: "bump", phase: "do", t: 0, dur: 1.8, back: heading + Math.PI };
				}
			}
		} else {
			task.t += dt;
			if (task.face) turnToward(angleTo(dog.position, task.face), dt, 4);
			switch (task.type) {
				case "eat":
				case "drink": {
					goal.eat = 1;
					const b = task.type === "eat" ? food : drink;
					b.level = Math.max(0, b.level - dt * 0.05);
					if (task.t > 4) task = null;
					break;
				}
				case "ball":
					kickBall();
					// às vezes corre atrás de novo
					if (Math.random() < 0.5) setTask("ball");
					else task = null;
					break;
				case "duck":
					if (task.t < 0.05) duckSquish.t = 0.6;
					goal.jump = task.t < 0.9 ? 1 : 0;
					if (task.t > 1.6) task = null;
					break;
				case "bone":
					if (!carrying) {
						goal.eat = 1;
						if (task.t > 0.5) {
							pickBone();
							task = { type: "bone", target: randomSpot(), phase: "go", t: 0 };
						}
					} else {
						dropBone();
						task = { type: "sit", phase: "do", dur: 2.5, t: 0 };
					}
					break;
				case "bump": {
					// passinho para trás, sacode a cabeça, senta e vira para o outro lado
					if (task.t < 0.35) {
						const q = flat(dog.position.x - Math.cos(heading) * dt * 1.2, dog.position.z + Math.sin(heading) * dt * 1.2);
						if (!nearLake(q.x, q.z, 0.6) && !blocked(q.x, q.z)) {
							dog.position.x = q.x;
							dog.position.z = q.z;
						}
						goal.walk = 0.5;
					} else if (task.t < 1.1) {
						goal.sit = 0.6;
						shake = Math.sin(task.t * 22) * 0.35;
					} else {
						turnToward(task.back, dt, 5);
					}
					if (task.t > task.dur) setTask("walk");
					break;
				}
				case "react": {
					// vira para quem clicou (a câmera)
					turnToward(angleTo(dog.position, camera.position), dt, 8);
					goal.wag = 1;
					const k = task.kind;
					if (k === "feliz") goal.jump = task.t < 0.8 ? 1 : 0;
					if (k === "coracao") {
						goal.sit = 1;
						goal.tilt = 1;
						goal.eyes = 0.35; // olhinhos fechados de felicidade
					}
					if (k === "estrela") spin = Math.min(1, task.t / 0.9) * Math.PI * 2;
					if (k === "musica") goal.sway = 1;
					if (k === "susto") goal.jump = task.t < 0.5 ? 1.6 : 0;
					if (k === "amor") {
						goal.lie = task.t > 0.3 && task.t < 1.7 ? 1 : 0;
						roll = THREE.MathUtils.clamp((task.t - 0.4) / 1.1, 0, 1) * Math.PI * 2;
						goal.eyes = 0.35;
					}
					if (task.t > task.dur) {
						spin = 0;
						roll = 0;
						task = null;
					}
					break;
				}
				case "sit":
					goal.sit = 1;
					if (task.t > task.dur) task = null;
					break;
				case "exit": {
					// sai pela porta, de frente para fora
					const k = Math.min(1, task.t / 1.1);
					turnToward(-Math.PI / 2, dt, 8);
					dog.position.x = THREE.MathUtils.lerp(HOUSE_IN.x, HOUSE_DOOR.x, k);
					dog.position.z = THREE.MathUtils.lerp(HOUSE_IN.z, HOUSE_DOOR.z, k);
					goal.walk = 1;
					if (k >= 1) {
						inHouse = false;
						const next = task.next;
						task = null;
						if (next) setTask(next);
					}
					break;
				}
				case "blanket":
					// pega a manta com a boca (abaixa a cabeça) e leva para o outro lugar
					goal.eat = 1;
					if (task.t > 0.6) {
						const b = task.b;
						const toHouse = !b.inHouse;
						grabBlanket(b);
						task = { type: "blanketDrop", toHouse, target: toHouse ? HOUSE_DOOR : randomSpot(), phase: "go", t: 0 };
					}
					break;
				case "blanketDrop":
					goal.eat = task.t < 0.5 ? 1 : 0;
					if (task.t > 0.5) {
						dropBlanket(task.toHouse);
						task = { type: "sit", phase: "do", dur: 1.5, t: 0 };
					}
					break;
				case "sleep":
					if (task.enter && !inHouse) {
						// entra na casinha e se vira para a porta
						const k = Math.min(1, task.t / 1.1);
						turnToward(Math.PI / 2, dt, 8);
						dog.position.x = THREE.MathUtils.lerp(HOUSE_DOOR.x, HOUSE_IN.x, k);
						dog.position.z = THREE.MathUtils.lerp(HOUSE_DOOR.z, HOUSE_IN.z, k);
						goal.walk = 1;
						if (k >= 1) {
							inHouse = true;
							task.t = 0;
						}
						break;
					}
					if (inHouse && task.t < 1.5) turnToward(-Math.PI / 2, dt, 3);
					goal.lie = 1;
					goal.eyes = task.stir > 0 ? 0.3 : 0;
					task.stir = Math.max(0, task.stir - dt);
					if (task.stir > 0) shake = Math.sin(task.t * 18) * 0.15;
					// muda de posição sozinho de tempos em tempos (RNG)
					task.shiftIn -= dt;
					if (task.shiftIn <= 0) {
						task.pose = Math.random() < 0.6 ? otherSleepPose(task.pose) : task.pose;
						task.shiftIn = rand(5, 12);
						if (Math.random() < 0.35) task.dream = rand(1.5, 3); // sonhando: patinhas correndo
					}
					task.dream = Math.max(0, task.dream - dt);
					if (task.dream > 0) goal.walk = 0.25;
					if (!bubble.visible && task.t > 1) showBubble("zzz");
					// de noite só levanta quando alguém o acorda
					if (task.t > task.dur && !sleepy()) task = null;
					break;
				default:
					task = null;
			}
			if (!task) idleFor = rand(0.8, 2.5);
		}

		// suaviza a pose
		const k = Math.min(1, dt * 6);
		for (const p in pose) pose[p] += (goal[p] - pose[p]) * k;

		if (hovering && !task) goal.wag = 1;
		gait += dt * (7 + pose.walk * 3.5);
		const stride = Math.sin(gait) * Math.min(1, pose.walk);
		const lie = pose.lie;
		legs[0].rotation.z = stride * 0.65 + lie * 1.35;
		legs[1].rotation.z = -stride * 0.65 + lie * 1.35;
		legs[2].rotation.z = -stride * 0.65 - lie * 1.35 - pose.sit * 1.2;
		legs[3].rotation.z = stride * 0.65 - lie * 1.35 - pose.sit * 1.2;

		const hop = pose.jump * Math.abs(Math.sin(t * 9)) * 0.45;
		rig.position.y = Math.abs(Math.sin(gait)) * 0.04 * Math.min(1, pose.walk) - lie * 0.3 - pose.sit * 0.12 + hop;
		rig.rotation.z = pose.sit * 0.42;
		// rola devagar até a pose sorteada; sobe o corpo para não afundar no chão ao girar
		const sleeping = task?.type === "sleep" && task.phase === "do";
		sleepRoll += ((sleeping ? task.pose : 0) - sleepRoll) * Math.min(1, dt * 2.2);
		rig.position.y += 0.65 * (1 - Math.cos(sleepRoll));
		rig.rotation.x = roll + sleepRoll + Math.sin(t * 8) * 0.18 * pose.sway;
		rig.position.x = Math.sin(t * 8) * 0.12 * pose.sway;
		// respiração lenta enquanto dorme
		body.scale.y = 1 + (sleeping ? Math.sin(t * 2.2) * 0.04 : 0);

		head.rotation.z = -pose.eat * 0.75 + Math.sin(t * 7) * 0.07 * pose.eat - pose.sit * 0.3 + Math.sin(t * 2) * 0.04;
		head.position.y = LEG + 0.62 - pose.eat * 0.12 - lie * 0.05;
		head.rotation.y = lie * 0.25 + shake;
		shake *= 0.8;
		head.rotation.x = pose.tilt * 0.35; // cabecinha de lado
		wagPhase += dt * (lie > 0.5 ? 2 : 13 + pose.wag * 9);
		tail.rotation.x = Math.sin(wagPhase) * (lie > 0.5 ? 0.1 : 0.5 + pose.wag * 0.25);
		tongue.visible = pose.walk > 0.5 || pose.jump > 0.3 || pose.sit > 0.5;
		const blink = Math.sin(t * 1.3) > 0.985 ? 0.1 : 1;
		for (const e of eyes) e.scale.y = Math.min(pose.eyes, blink);
		earL.rotation.x = 0.35 + Math.sin(gait * 2) * 0.06 * Math.min(1, pose.walk);
		earR.rotation.x = -0.35 - Math.sin(gait * 2) * 0.06 * Math.min(1, pose.walk);

		dog.position.y = S;
		dog.rotation.y = heading + spin;
	};

	const updateToys = (dt) => {
		// bola: quica, rola e para
		const v = ball.userData.vel;
		if (v.lengthSq() > 0.0004 || ball.position.y > S + ball.userData.r + 0.001) {
			v.y -= 12 * dt;
			ball.position.addScaledVector(v, dt);
			if (ball.position.y < S + ball.userData.r) {
				ball.position.y = S + ball.userData.r;
				v.y = Math.abs(v.y) > 1 ? -v.y * 0.45 : 0;
			}
			v.x *= 1 - 1.6 * dt;
			v.z *= 1 - 1.6 * dt;
			if (ball.position.x < FLAT.x0 || ball.position.x > FLAT.x1) v.x *= -1;
			if (ball.position.z < FLAT.z0 || ball.position.z > FLAT.z1) v.z *= -1;
			if (nearLake(ball.position.x, ball.position.z, 0.3)) {
				v.x *= -1;
				v.z *= -1;
			}
			const p = flat(ball.position.x, ball.position.z);
			ball.position.x = p.x;
			ball.position.z = p.z;
			ball.rotation.z -= v.x * dt * 4;
			ball.rotation.x += v.z * dt * 4;
		}
		// patinho: amassa quando ele pula
		if (duckSquish.t > 0) {
			duckSquish.t -= dt;
			const s = 1 - Math.sin((duckSquish.t / 0.6) * Math.PI) * 0.35;
			duck.scale.set(1 + (1 - s) * 0.5, s, 1 + (1 - s) * 0.5);
		}
		// potes enchem devagar
		for (const b of [food, drink]) {
			b.level = Math.min(1, b.level + dt * 0.01);
			b.fill.scale.y = 0.15 + b.level * 0.85;
			b.fill.position.y = 0.04 + 0.09 * b.fill.scale.y;
		}
	};

	/* =========================================================
	   Céu: dia e noite pelo horário de São Paulo
	   ========================================================= */
	const forcedHour = parseFloat(new URLSearchParams(location.search).get("hora"));
	const spTime = () => {
		const parts = new Intl.DateTimeFormat("pt-BR", {
			timeZone: "America/Sao_Paulo",
			hour: "2-digit",
			minute: "2-digit",
			hourCycle: "h23",
		}).formatToParts(new Date());
		const get = (type) => Number(parts.find((p) => p.type === type).value);
		return get("hour") + get("minute") / 60;
	};

	// [hora, céu, luz do sol]
	const skyKeys = [
		[0, 0x0b1430, 0x2b3a6b],
		[4.8, 0x101c42, 0x2b3a6b],
		[6, 0xf3a072, 0xffb37a],
		[7.2, 0x8fd3ff, 0xfff2d6],
		[16.8, 0x8fd3ff, 0xfff2d6],
		[18, 0xf28c5c, 0xff9a5c],
		[19.2, 0x1d2452, 0x2b3a6b],
		[24, 0x0b1430, 0x2b3a6b],
	];
	const skyAt = (h) => {
		for (let i = 0; i < skyKeys.length - 1; i++) {
			const [h0, s0, l0] = skyKeys[i];
			const [h1, s1, l1] = skyKeys[i + 1];
			if (h >= h0 && h <= h1) {
				const f = (h - h0) / (h1 - h0);
				return [new THREE.Color(s0).lerp(new THREE.Color(s1), f), new THREE.Color(l0).lerp(new THREE.Color(l1), f)];
			}
		}
		return [new THREE.Color(skyKeys[0][1]), new THREE.Color(skyKeys[0][2])];
	};
	const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
	const daylight = (h) => smooth(5.4, 7, h) * (1 - smooth(17.2, 19, h));

	const hemi = new THREE.HemisphereLight(0xffffff, 0x4a6b2a, 1);
	scene.add(hemi);
	const sun = new THREE.DirectionalLight(0xffffff, 1.6);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 16, bottom: -16, far: 80 });
	scene.add(sun);

	const sunMesh = place(scene, new THREE.Mesh(new THREE.BoxGeometry(3, 3, 0.5), new THREE.MeshBasicMaterial({ color: 0xffe066, fog: false })), 0, 0, 0);
	const moonMesh = place(scene, new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 0.5), new THREE.MeshBasicMaterial({ color: 0xf2f4ff, fog: false })), 0, 0, 0);
	place(moonMesh, new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), new THREE.MeshBasicMaterial({ color: 0xc9cde0, fog: false })), 0.4, 0.3, 0.3);

	const starGeo = new THREE.BufferGeometry();
	const starPos = [];
	for (let s = 0; s < 400; s++) {
		const a = rand(0, Math.PI * 2);
		const e = rand(0.08, 1.2);
		starPos.push(Math.cos(a) * Math.cos(e) * 70, Math.sin(e) * 45 + 4, -Math.abs(Math.sin(a) * Math.cos(e) * 70) - 10);
	}
	starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
	const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, transparent: true, fog: false }));
	scene.add(stars);

	const fireflies = Array.from({ length: 18 }, () => {
		const f = place(scene, new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: 0xfff27a, transparent: true })), rand(-12, 12), rand(1.5, 3), rand(-3, 8));
		f.userData.seed = rand(0, 100);
		return f;
	});

	const clouds = [];
	for (let c = 0; c < 6; c++) {
		const g = new THREE.Group();
		for (let p = 0; p < 3; p++) {
			place(g, new THREE.Mesh(new THREE.BoxGeometry(rand(2, 3.5), 0.8, 1.6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, fog: false })), p * 1.4, rand(0, 0.4), rand(0, 0.6));
		}
		g.position.set(-26 + c * 9, rand(7, 9), rand(-14, -10));
		scene.add(g);
		clouds.push(g);
	}

	let hourNow = Number.isFinite(forcedHour) ? forcedHour : spTime();
	let night = 0;

	const applySky = () => {
		const h = hourNow;
		const day = daylight(h);
		night = 1 - day;
		isNight = h >= 21 || h < 5.5;
		const [sky, light] = skyAt(h);
		scene.background.copy(sky);
		scene.fog.color.copy(sky);
		container.style.background = `#${sky.getHexString()}`;

		// sol nasce à esquerda e se põe à direita; a lua faz o caminho oposto
		const arc = (a, r, y0) => new THREE.Vector3(-Math.cos(a) * r, Math.sin(a) * 18 + y0, -40);
		const sunA = ((h - 6) / 12) * Math.PI;
		sunMesh.position.copy(arc(sunA, 32, 0));
		moonMesh.position.copy(arc(sunA + Math.PI, 32, 0));
		sunMesh.visible = sunMesh.position.y > -2;
		moonMesh.visible = moonMesh.position.y > -2;

		const src = day > 0.5 ? sunMesh.position : moonMesh.position;
		sun.position.set(src.x * 0.4, Math.max(src.y, 6) * 0.9, 18);
		sun.color.copy(light);
		sun.intensity = 0.35 + day * 1.35;
		hemi.intensity = 0.35 + day * 0.7;
		hemi.color.copy(light).lerp(new THREE.Color(0xffffff), day * 0.6);

		stars.material.opacity = smooth(0.4, 1, night);
		for (const c of clouds) for (const p of c.children) p.material.opacity = 0.25 + day * 0.75;
		for (const { bulb, light: l } of lamps) {
			bulb.material.emissiveIntensity = night * 1.4;
			l.intensity = night * 14;
		}
	};
	applySky();
	setInterval(() => {
		if (!Number.isFinite(forcedHour)) hourNow = spTime();
		applySky();
	}, 30000);

	/* =========================================================
	   Clique nos brinquedos
	   ========================================================= */
	const raycaster = new THREE.Raycaster();
	const pointer = new THREE.Vector2();
	const pick = (e) => {
		const r = renderer.domElement.getBoundingClientRect();
		pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
		raycaster.setFromCamera(pointer, camera);
		const hits = raycaster.intersectObjects(interactive.map((i) => i.obj), true);
		if (!hits.length) return null;
		return interactive.find((i) => {
			let o = hits[0].object;
			while (o && o !== i.obj) o = o.parent;
			return o === i.obj;
		});
	};
	interactive.push({ obj: dog, task: "pet" });
	renderer.domElement.addEventListener("pointermove", (e) => {
		if (e.pointerType !== "mouse") return;
		const hit = pick(e);
		hovering = hit?.task === "pet";
		renderer.domElement.style.cursor = hit ? "pointer" : "";
	});
	renderer.domElement.addEventListener("pointerleave", () => (hovering = false));
	// "click" funciona com mouse e com toque (tap) no celular, sem atrapalhar a rolagem
	renderer.domElement.addEventListener("click", (e) => {
		const hit = pick(e);
		if (!hit) return;
		if (hit.task === "pet") petDog(clock.elapsedTime);
		else setTask(hit.task);
	});

	/* =========================================================
	   Câmera, tamanho e loop
	   ========================================================= */
	let camY = 8;
	let camZ = 20;
	const resize = () => {
		const w = container.clientWidth;
		const h = container.clientHeight;
		renderer.setSize(w, h);
		camera.aspect = w / h;
		// telas em pé enxergam menos na horizontal: afasta a câmera para caber a área do Pyter
		const aspect = w / h;
		const back = aspect < 1.3 ? Math.min(12, (1.3 - aspect) * 13) : 0;
		camY = 8 + back * 0.55;
		camZ = 20 + back;
		camera.position.set(0, camY, camZ);
		camera.lookAt(0, 2.5, -2);
		camera.updateProjectionMatrix();
	};
	window.addEventListener("resize", resize);
	resize();

	let mouseX = 0;
	window.addEventListener("pointermove", (e) => (mouseX = e.clientX / window.innerWidth - 0.5));

	const clock = new THREE.Clock();
	// qualidade adaptativa: se os primeiros quadros forem lentos (celular fraco, máquina sem GPU),
	// baixa a resolução e desliga as sombras para a página continuar fluida
	const perf = { frames: 0, time: 0, low: false };
	const adaptQuality = (raw) => {
		if (perf.low || perf.frames > 90) return;
		perf.frames++;
		if (perf.frames > 10) perf.time += raw; // ignora os primeiros quadros (compilação de shaders)
		if (perf.frames === 90 && perf.time / 80 > 1 / 30) {
			perf.low = true;
			renderer.setPixelRatio(1);
			renderer.shadowMap.enabled = false;
			scene.traverse((o) => o.material && (o.material.needsUpdate = true));
			resize();
		}
	};

	const frame = () => {
		const raw = clock.getDelta();
		adaptQuality(raw);
		const dt = Math.min(raw, 0.05);
		const t = clock.elapsedTime;
		updateDog(dt, t);
		updateToys(dt);
		updateBubble(dt);
		for (const c of clouds) c.position.x = ((c.position.x + dt * 0.6 + 30) % 60) - 30;
		for (const f of fireflies) {
			const s = f.userData.seed;
			f.position.x += Math.sin(t * 0.7 + s) * dt * 0.4;
			f.position.y = 1.8 + Math.sin(t * 1.3 + s) * 0.5;
			f.material.opacity = smooth(0.5, 1, night) * (0.5 + 0.5 * Math.sin(t * 3 + s));
		}
		if (!reduceMotion) camera.position.x += (mouseX * 4 - camera.position.x) * 0.03;
		camera.lookAt(0, 2.5, -2);
		renderer.render(scene, camera);
	};

	// ?debug expõe a posição do Pyter na tela para testes
	if (new URLSearchParams(location.search).has("debug")) {
		window.pyter = {
			screen: () => {
				const v = dog.position.clone().add(new THREE.Vector3(0, 0.8, 0)).project(camera);
				const r = renderer.domElement.getBoundingClientRect();
				return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
			},
			bubble: () => (bubble.visible ? Object.keys(bubbleTextures).find((k) => bubbleTextures[k] === bubble.material.map) : null),
			task: () => task?.type ?? null,
			pos: () => ({ x: dog.position.x, z: dog.position.z, heading }),
			inHouse: () => inHouse,
			// menor distância entre o Pyter e o centro de cada obstáculo (descontado o raio)
			clearance: () => Math.min(...OBSTACLES.filter((o) => !(inHouse && o.pos === house.position)).map((o) => Math.hypot(dog.position.x - o.pos.x, dog.position.z - o.pos.z) - o.r)),
		};
	}

	// pausa quando o início sai da tela
	new IntersectionObserver(([e]) => renderer.setAnimationLoop(e.isIntersecting ? frame : null)).observe(container);
}
