/*
 * Paisagem 3D do início: terreno de blocos (estética KoGaMa / voxel) com o cachorro passeando.
 * Tudo é feito com caixas simples do Three.js, sem modelos externos.
 */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const container = document.getElementById("hero3d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (container) {
	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	container.appendChild(renderer.domElement);

	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x8fd3ff);
	scene.fog = new THREE.Fog(0x8fd3ff, 24, 50);

	const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);

	/* ---------- Luz ---------- */
	scene.add(new THREE.HemisphereLight(0xffffff, 0x4a6b2a, 1.0));
	const sun = new THREE.DirectionalLight(0xfff2d6, 1.7);
	sun.position.set(8, 16, 8);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 16, bottom: -16 });
	scene.add(sun);

	const box = (w, h, d, color) => {
		const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
		m.castShadow = true;
		m.receiveShadow = true;
		return m;
	};

	/* ---------- Terreno ---------- */
	const W = 22; // meia largura
	const D = 10; // meia profundidade
	const PATH_A = 9; // raio x do caminho (elipse)
	const PATH_B = 4; // raio z do caminho
	const onPath = (x, z) => Math.abs(Math.hypot(x / PATH_A, z / PATH_B) - 1) < 0.14;
	const inLake = (x, z) => Math.abs(x) <= 2 && Math.abs(z) <= 1;

	const heights = new Map();
	const key = (x, z) => `${x},${z}`;
	for (let x = -W; x <= W; x++) {
		for (let z = -D; z <= D; z++) {
			// morrinhos no fundo e nas laterais, plano no meio
			const far = Math.max(0, -z - 4) * 0.6 + Math.max(0, Math.abs(x) - 13) * 0.45;
			const noise = Math.sin(x * 0.7) * Math.cos(z * 0.9) + Math.sin(x * 0.23 + z * 0.4);
			const hill = far > 0 ? Math.max(0, Math.round(far + noise * 0.8)) : 0;
			heights.set(key(x, z), inLake(x, z) ? 1 : 2 + hill);
		}
	}
	const groundAt = (x, z) => heights.get(key(Math.round(x), Math.round(z))) ?? 2;

	const cells = [...heights].map(([k, h]) => {
		const [x, z] = k.split(",").map(Number);
		return { x, z, h };
	});
	const total = cells.reduce((n, c) => n + c.h, 0);
	const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), total);
	blocks.castShadow = true;
	blocks.receiveShadow = true;
	const m4 = new THREE.Matrix4();
	const col = new THREE.Color();
	const grass = [0x7bc043, 0x6db33f, 0x86c94b, 0x74b843];
	let i = 0;
	for (const c of cells) {
		for (let y = 0; y < c.h; y++) {
			m4.setPosition(c.x, y - 0.5, c.z);
			blocks.setMatrixAt(i, m4);
			const top = y === c.h - 1;
			let color = 0x8a5f36;
			if (top) color = inLake(c.x, c.z) ? 0xd9c38c : onPath(c.x, c.z) && c.h === 2 ? 0xc9a66b : grass[(c.x * 7 + c.z * 13) & 3];
			blocks.setColorAt(i++, col.setHex(color));
		}
	}
	scene.add(blocks);

	/* ---------- Lago ---------- */
	const water = new THREE.Mesh(
		new THREE.BoxGeometry(5, 0.7, 3),
		new THREE.MeshLambertMaterial({ color: 0x3fa9f5, transparent: true, opacity: 0.8 }),
	);
	water.position.set(0, 1.25, 0);
	water.receiveShadow = true;
	scene.add(water);

	/* ---------- Árvores, flores e nuvens ---------- */
	const tree = (x, z, s = 1) => {
		const g = new THREE.Group();
		const trunk = box(0.6, 1.8, 0.6, 0x7a4f2a);
		trunk.position.y = 0.9;
		const l1 = box(2.2, 1, 2.2, 0x3f8f2f);
		l1.position.y = 2.2;
		const l2 = box(1.4, 1, 1.4, 0x4fa83a);
		l2.position.y = 3.1;
		g.add(trunk, l1, l2);
		g.scale.setScalar(s);
		g.position.set(x, groundAt(x, z) - 0.5, z);
		scene.add(g);
	};
	for (const [x, z, s] of [
		[-14, -3, 1.2], [-12, 5, 1], [14, -2, 1.1], [16, 4, 0.9], [-5, -8, 1.3],
		[6, -8, 1.1], [-18, -7, 1.2], [19, -6, 1.3], [17, 8, 0.9], [-17, 8, 0.8],
	]) tree(x, z, s);

	const flowers = [0xf4d03f, 0xff6b9d, 0xffffff, 0x9b59ff];
	for (let f = 0; f < 80; f++) {
		const x = Math.round((Math.random() * 2 - 1) * (W - 1));
		const z = Math.round((Math.random() * 2 - 1) * (D - 1));
		if (onPath(x, z) || Math.abs(x) < 4 && Math.abs(z) < 2) continue;
		const fl = box(0.2, 0.2, 0.2, flowers[f % 4]);
		fl.position.set(x + Math.random() * 0.6 - 0.3, groundAt(x, z) - 0.4, z + Math.random() * 0.6 - 0.3);
		scene.add(fl);
	}

	const clouds = [];
	for (let c = 0; c < 6; c++) {
		const g = new THREE.Group();
		for (let p = 0; p < 3; p++) {
			const puff = new THREE.Mesh(
				new THREE.BoxGeometry(2 + Math.random() * 1.5, 0.8, 1.6),
				new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }),
			);
			puff.position.set(p * 1.4, Math.random() * 0.4, Math.random() * 0.6);
			g.add(puff);
		}
		g.position.set(-26 + c * 9, 7 + Math.random() * 2, -10 - Math.random() * 4);
		scene.add(g);
		clouds.push(g);
	}

	/* ---------- Cachorro ---------- */
	const WHITE = 0xf4f1ea;
	const BLACK = 0x1b1b1b;
	const dog = new THREE.Group();
	const add = (parent, mesh, x, y, z, rx = 0) => {
		mesh.position.set(x, y, z);
		mesh.rotation.x = rx;
		parent.add(mesh);
		return mesh;
	};

	const body = add(dog, box(1.2, 0.6, 0.6, WHITE), 0, 0.75, 0);
	add(body, box(0.35, 0.05, 0.3, 0x9a9a9a), -0.25, 0.31, 0.05); // pintinha cinza nas costas

	const legs = [[0.42, 0.2], [0.42, -0.2], [-0.42, 0.2], [-0.42, -0.2]].map(([x, z]) => {
		const pivot = add(dog, new THREE.Group(), x, 0.5, z);
		add(pivot, box(0.18, 0.5, 0.18, WHITE), 0, -0.25, 0);
		return pivot;
	});

	const head = add(dog, new THREE.Group(), 0.75, 1.2, 0);
	add(head, box(0.55, 0.5, 0.5, WHITE), 0, 0, 0);
	add(head, box(0.3, 0.24, 0.3, WHITE), 0.38, -0.1, 0); // focinho
	add(head, box(0.1, 0.1, 0.14, BLACK), 0.54, -0.04, 0); // nariz
	add(head, box(0.12, 0.04, 0.1, 0xe8a3a3), 0.45, -0.24, 0); // língua
	add(head, box(0.3, 0.32, 0.04, BLACK), 0.12, 0.06, 0.255); // mancha no olho
	add(head, box(0.08, 0.08, 0.03, 0x4a2a12), 0.2, 0.06, 0.28); // olho
	add(head, box(0.08, 0.08, 0.03, 0x4a2a12), 0.2, 0.06, -0.265); // olho
	add(head, box(0.16, 0.28, 0.14, BLACK), -0.08, 0.34, 0.2, 0.35); // orelha preta
	add(head, box(0.16, 0.28, 0.14, WHITE), -0.08, 0.34, -0.2, -0.35); // orelha branca
	add(head, box(0.17, 0.1, 0.08, 0x555555), -0.08, 0.4, -0.21, -0.35); // pintas da orelha

	const tail = add(dog, new THREE.Group(), -0.6, 0.95, 0);
	add(tail, box(0.12, 0.45, 0.12, WHITE), 0, 0.2, 0);
	tail.rotation.z = 0.6;
	dog.scale.setScalar(1.2);
	scene.add(dog);

	/* ---------- Tamanho / câmera ---------- */
	let camZ = 17;
	let camY = 9;
	const resize = () => {
		const w = container.clientWidth;
		const h = container.clientHeight;
		renderer.setSize(w, h);
		camera.aspect = w / h;
		const narrow = w < 700;
		camY = narrow ? 12 : 8;
		camZ = narrow ? 28 : 20;
		camera.position.set(0, camY, camZ);
		camera.lookAt(0, 2.5, -2);
		camera.updateProjectionMatrix();
	};
	window.addEventListener("resize", resize);
	resize();

	/* ---------- Animação ---------- */
	const clock = new THREE.Clock();
	let mouseX = 0;
	window.addEventListener("pointermove", (e) => (mouseX = e.clientX / window.innerWidth - 0.5));

	const frame = () => {
		const t = clock.getElapsedTime();
		const a = t * 0.25;
		const x = Math.cos(a) * PATH_A;
		const z = Math.sin(a) * PATH_B;

		dog.position.set(x, groundAt(x, z) - 0.5, z);
		// aponta na direção do movimento (tangente da elipse)
		dog.rotation.y = Math.atan2(-Math.cos(a) * PATH_B, -Math.sin(a) * PATH_A);
		const step = Math.sin(t * 9);
		legs[0].rotation.z = legs[3].rotation.z = step * 0.6;
		legs[1].rotation.z = legs[2].rotation.z = -step * 0.6;
		body.position.y = 0.75 + Math.abs(step) * 0.04;
		head.rotation.z = Math.sin(t * 4.5) * 0.05;
		tail.rotation.x = Math.sin(t * 14) * 0.5;

		for (const c of clouds) c.position.x = ((c.position.x + 0.01 + 30) % 60) - 30;
		camera.position.x += (mouseX * 4 - camera.position.x) * 0.03;
		camera.lookAt(0, 2.5, -2);
		renderer.render(scene, camera);
	};

	if (reduceMotion) {
		frame();
	} else {
		// pausa quando o início sai da tela
		new IntersectionObserver(([e]) => renderer.setAnimationLoop(e.isIntersecting ? frame : null)).observe(container);
	}
}
