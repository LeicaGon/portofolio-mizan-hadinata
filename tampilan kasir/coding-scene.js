const canvas = document.getElementById('coding-canvas');
const fallback = document.getElementById('coding-fallback');
const greetButton = document.getElementById('coding-interact');
const sceneSection = canvas?.parentElement;

async function loadScene() {
	try {
		const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');
		createScene(THREE);
	} catch {
		fallback.hidden = false;
		canvas.hidden = true;
		greetButton.hidden = true;
	}
}

function createScene(THREE) {
	let renderer;
	try {
		renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
	} catch {
		fallback.hidden = false;
		canvas.hidden = true;
		greetButton.hidden = true;
		return;
	}

	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.3));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.15;
	renderer.setClearColor(0x000000, 0);

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(34, 1, .1, 60);
	const cameraHome = new THREE.Vector3();
	const cameraTarget = new THREE.Vector3();
	const pointerTarget = new THREE.Vector2();
	const pointer = new THREE.Vector2();
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	scene.add(new THREE.HemisphereLight(0xf2f4e8, 0x34443d, 2.1));
	const keyLight = new THREE.DirectionalLight(0xffe4bd, 3.2);
	keyLight.position.set(-3, 6, 5);
	keyLight.castShadow = true;
	keyLight.shadow.mapSize.set(512, 512);
	keyLight.shadow.camera.left = -5;
	keyLight.shadow.camera.right = 5;
	keyLight.shadow.camera.top = 5;
	keyLight.shadow.camera.bottom = -3;
	scene.add(keyLight);
	const rimLight = new THREE.PointLight(0xd9f53f, 22, 8);
	rimLight.position.set(2.5, 3.4, -1.5);
	scene.add(rimLight);

	const mat = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: .62, ...options });
	const materials = {
		desk: mat(0xd85f49, { roughness: .45 }),
		deskEdge: mat(0x9e4038),
		metal: mat(0x9aa69d, { metalness: .7, roughness: .3 }),
		charcoal: mat(0x18231f, { roughness: .32 }),
		hoodie: mat(0x8da941),
		hoodieDark: mat(0x687e31),
		skin: mat(0xd49a76),
		hair: mat(0x202522),
		glasses: mat(0x26322d, { metalness: .42, roughness: .28 }),
		pants: mat(0x42534b),
		shoe: mat(0x202b27),
		white: mat(0xf3f0e8),
		screen: mat(0x101d1a, { emissive: 0x173b34, emissiveIntensity: .7, roughness: .24 }),
		code: mat(0xd9f53f, { emissive: 0x8fae1e, emissiveIntensity: .7 }),
		codeSoft: mat(0x89cbb0, { emissive: 0x236e59, emissiveIntensity: .65 }),
		codeWarm: mat(0xff8064, { emissive: 0x8a302a, emissiveIntensity: .65 })
	};

	function box(parent, size, position, material, castShadow = true) {
		const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
		mesh.position.set(...position);
		mesh.castShadow = castShadow;
		mesh.receiveShadow = true;
		parent.add(mesh);
		return mesh;
	}

	function sphere(parent, radius, position, material, scale = [1, 1, 1]) {
		const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 10), material);
		mesh.position.set(...position);
		mesh.scale.set(...scale);
		mesh.castShadow = true;
		parent.add(mesh);
		return mesh;
	}

	function cylinder(parent, radiusTop, radiusBottom, height, position, material, segments = 12) {
		const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
		mesh.position.set(...position);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		parent.add(mesh);
		return mesh;
	}

	function limb(parent, from, to, radius, material) {
		const start = new THREE.Vector3(...from);
		const end = new THREE.Vector3(...to);
		const direction = new THREE.Vector3().subVectors(end, start);
		const mesh = cylinder(parent, radius * .82, radius, direction.length(), start.clone().add(end).multiplyScalar(.5).toArray(), material, 10);
		mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
		sphere(parent, radius, from, material, [1, 1, 1]);
		sphere(parent, radius * .78, to, material, [1, 1, 1]);
		return mesh;
	}

	function hairStrand(parent, points, radius) {
		const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
		const segments = 18;
		const sides = 8;
		const frames = curve.computeFrenetFrames(segments, false);
		const vertices = [];
		const indices = [];
		for (let i = 0; i <= segments; i++) {
			const progress = i / segments;
			const center = curve.getPointAt(progress);
			const strandRadius = radius * Math.pow(1 - progress, .7) + .0015;
			for (let j = 0; j < sides; j++) {
				const angle = j / sides * Math.PI * 2;
				const vertex = center.clone()
					.addScaledVector(frames.normals[i], Math.cos(angle) * strandRadius)
					.addScaledVector(frames.binormals[i], Math.sin(angle) * strandRadius);
				vertices.push(vertex.x, vertex.y, vertex.z);
			}
		}
		for (let i = 0; i < segments; i++) {
			for (let j = 0; j < sides; j++) {
				const next = (j + 1) % sides;
				const a = i * sides + j;
				const b = i * sides + next;
				const c = (i + 1) * sides + next;
				const d = (i + 1) * sides + j;
				indices.push(a, b, d, b, c, d);
			}
		}
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
		geometry.setIndex(indices);
		geometry.computeVertexNormals();
		const strand = new THREE.Mesh(geometry, materials.hair);
		strand.castShadow = true;
		parent.add(strand);
		return strand;
	}

	const stage = new THREE.Group();
	stage.position.x = 1.05;
	scene.add(stage);

	const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), mat(0x1d2924, { roughness: 1 }));
	floor.rotation.x = -Math.PI / 2;
	floor.position.y = -.04;
	floor.receiveShadow = true;
	scene.add(floor);

	box(stage, [3.8, .14, 1.65], [0, .88, .25], materials.desk);
	box(stage, [3.8, .035, 1.65], [0, .78, .25], materials.deskEdge, false);
	for (const x of [-1.62, 1.62]) {
		for (const z of [-.34, .84]) box(stage, [.13, .78, .13], [x, .38, z], materials.metal);
	}

	const chair = new THREE.Group();
	stage.add(chair);
	box(chair, [.95, .14, .82], [0, .72, -.84], materials.charcoal);
	box(chair, [1.02, .8, .13], [0, 1.18, -1.2], materials.pants);
	cylinder(chair, .06, .08, .72, [0, .34, -.84], materials.metal);
	for (const x of [-.38, .38]) box(chair, [.09, .05, .72], [x, .05, -.84], materials.metal);

	const person = new THREE.Group();
	stage.add(person);
	limb(person, [-.28, .79, -.46], [-.46, .28, .2], .16, materials.pants);
	limb(person, [.28, .79, -.46], [.46, .28, .2], .16, materials.pants);
	box(person, [.3, .16, .42], [-.45, .2, .02], materials.shoe);
	box(person, [.3, .16, .42], [.45, .2, .02], materials.shoe);
	cylinder(person, .13, .16, .28, [0, 1.75, -.55], materials.skin);
	const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.39, .68, 5, 12), materials.hoodie);
	torso.position.set(0, 1.37, -.58);
	torso.castShadow = true;
	person.add(torso);
	box(person, [.12, .3, .06], [0, 1.24, -.16], materials.hoodieDark, false);

	const head = new THREE.Group();
	head.position.set(0, 2.13, -.49);
	person.add(head);
	sphere(head, .34, [0, 0, 0], materials.skin, [.9, 1, .88]);
	sphere(head, .33, [0, .09, -.045], materials.hair, [1.04, .78, 1.02]);
	for (const side of [-1, 1]) {
		const curtainShape = new THREE.Shape();
		curtainShape.moveTo(side * .055, .3);
		curtainShape.quadraticCurveTo(side * .18, .3, side * .25, .18);
		curtainShape.quadraticCurveTo(side * .34, .04, side * .31, .015);
		curtainShape.quadraticCurveTo(side * .3, -.045, side * .24, -.07);
		curtainShape.quadraticCurveTo(side * .19, -.035, side * .2, .015);
		curtainShape.quadraticCurveTo(side * .21, .015, side * .14, .13);
		curtainShape.quadraticCurveTo(side * .1, .21, side * .055, .3);
		curtainShape.closePath();
		const curtain = new THREE.Mesh(new THREE.ExtrudeGeometry(curtainShape, {
			depth: .07,
			bevelEnabled: true,
			bevelSegments: 3,
			steps: 1,
			bevelSize: .018,
			bevelThickness: .018,
			curveSegments: 10
		}), materials.hair);
		curtain.position.z = .17;
		curtain.castShadow = true;
		curtain.rotation.y = side * -.12;
		head.add(curtain);
		hairStrand(head, [
			[side * .075, .29, .19],
			[side * .15, .2, .252],
			[side * .23, .07, .24],
			[side * .28, -.025, .2],
			[side * .25, -.06, .16]
		], .012);
	}
	for (const side of [-1, 1]) sphere(head, .065, [side * .29, -.02, -.005], materials.skin, [.48, .78, .55]);
	const eyes = [];
	for (const x of [-.115, .115]) eyes.push(sphere(head, .026, [x, -.015, .292], materials.charcoal, [1, .9, .45]));
	sphere(head, .033, [0, -.07, .319], materials.skin, [.72, 1, .7]);
	box(head, [.085, .014, .016], [0, -.145, .309], materials.deskEdge, false);
	const glasses = new THREE.Group();
	head.add(glasses);
	const lensMaterial = new THREE.MeshPhysicalMaterial({ color: 0xa7d5c9, roughness: .12, transparent: true, opacity: .12, depthWrite: false });
	for (const x of [-.115, .115]) {
		const lens = new THREE.Mesh(new THREE.BoxGeometry(.17, .105, .006), lensMaterial);
		lens.position.set(x, -.015, .309);
		glasses.add(lens);
		for (const y of [-.078, .048]) box(glasses, [.2, .014, .018], [x, y, .324], materials.glasses, false);
		for (const side of [-1, 1]) box(glasses, [.014, .126, .018], [x + side * .093, -.015, .324], materials.glasses, false);
	}
	box(glasses, [.044, .014, .018], [0, -.015, .324], materials.glasses, false);
	limb(glasses, [-.215, -.015, .324], [-.34, -.025, .08], .012, materials.glasses);
	limb(glasses, [.215, -.015, .324], [.34, -.025, .08], .012, materials.glasses);

	const arms = new THREE.Group();
	person.add(arms);
	limb(arms, [-.31, 1.57, -.5], [-.59, 1.19, .04], .16, materials.hoodieDark);
	limb(arms, [-.59, 1.19, .04], [-.42, 1.01, .55], .12, materials.skin);
	const wavingArm = new THREE.Group();
	wavingArm.position.set(.31, 1.57, -.5);
	arms.add(wavingArm);
	limb(wavingArm, [0, 0, 0], [.28, -.38, .54], .16, materials.hoodieDark);
	const wavingForearm = new THREE.Group();
	wavingForearm.position.set(.28, -.38, .54);
	wavingArm.add(wavingForearm);
	limb(wavingForearm, [0, 0, 0], [-.12, -.13, .36], .12, materials.skin);
	const wavingHand = new THREE.Group();
	wavingHand.position.set(-.17, -.18, .51);
	wavingForearm.add(wavingHand);
	const handAlignment = Math.atan2(-.18, -.17) - Math.PI / 2;
	wavingHand.rotation.z = handAlignment;
	sphere(wavingHand, .09, [0, 0, 0], materials.skin, [.78, 1.05, .55]);
	for (const x of [-.045, -.015, .015, .045]) {
		limb(wavingHand, [x, .045, 0], [x * 1.2, .13, 0], .018, materials.skin);
	}
	limb(wavingHand, [-.07, -.01, 0], [-.13, .055, 0], .025, materials.skin);

	const laptop = new THREE.Group();
	stage.add(laptop);
	box(laptop, [1.5, .09, .9], [0, 1.005, .48], materials.metal);
	box(laptop, [1.39, .025, .72], [0, 1.062, .46], materials.charcoal, false);
	for (let row = 0; row < 3; row++) {
		for (let column = 0; column < 11; column++) {
			const x = -.59 + column * .118;
			const z = .2 + row * .12;
			box(laptop, [.075, .012, .065], [x, 1.08, z], materials.white, false);
		}
	}
	box(laptop, [1.46, .88, .075], [0, 1.52, .91], materials.charcoal);
	box(laptop, [1.32, .72, .018], [0, 1.53, .864], materials.screen, false);
	const codeLines = [];
	const lineMaterials = [materials.codeSoft, materials.code, materials.codeWarm];
	for (let row = 0; row < 7; row++) {
		const width = .4 + ((row * 7) % 5) * .12;
		const line = box(laptop, [width, .022, .012], [-.52 + width / 2, 1.79 - row * .09, .849], lineMaterials[row % lineMaterials.length], false);
		codeLines.push(line);
	}
	for (let row = 0; row < 3; row++) {
		box(laptop, [.055, .022, .012], [-.57, 1.79 - row * .09, .849], materials.code, false);
	}

	const mug = new THREE.Group();
	mug.position.set(1.48, .96, .48);
	stage.add(mug);
	cylinder(mug, .13, .16, .3, [0, .15, 0], materials.white);
	const handle = new THREE.Mesh(new THREE.TorusGeometry(.11, .025, 8, 16, Math.PI), materials.white);
	handle.rotation.z = Math.PI / 2;
	handle.position.set(.13, .16, 0);
	mug.add(handle);

	const book = new THREE.Group();
	book.position.set(-1.48, .98, .52);
	stage.add(book);
	box(book, [.42, .07, .58], [0, 0, 0], materials.hoodieDark);
	box(book, [.4, .015, .54], [0, .04, 0], materials.white, false);

	let visible = false;
	let animationRunning = false;
	let animationFrame;
	let greetingStarted = -Infinity;
	let greetingUntil = -Infinity;
	let frame = 0;
	const clock = new THREE.Clock();

	function resize() {
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;
		if (!width || !height) return;
		camera.aspect = width / height;
		if (camera.aspect < 1.05) {
			camera.position.set(1.05, 3.6, 10.5);
			cameraTarget.set(1.05, 1.78, 0);
		} else {
			camera.position.set(.05, 2.9, 8.1);
			cameraTarget.set(.18, 1.38, 0);
		}
		cameraHome.copy(camera.position);
		camera.lookAt(cameraTarget);
		camera.updateProjectionMatrix();
		renderer.setSize(width, height, false);
		renderOnce();
	}

	const resizeObserver = new ResizeObserver(resize);
	resizeObserver.observe(canvas.parentElement);
	resize();

	function renderOnce() {
		if (!visible || document.hidden) return;
		renderer.render(scene, camera);
		frame++;
		if (frame === 1) canvas.dataset.ready = 'true';
		canvas.dataset.frame = String(frame);
		canvas.dataset.drawCalls = String(renderer.info.render.calls);
	}

	function drawFrame() {
		animationFrame = undefined;
		if (!visible || document.hidden) {
			animationRunning = false;
			return;
		}
		const time = clock.getElapsedTime();
		pointer.lerp(pointerTarget, .035);
		camera.position.x = cameraHome.x + pointer.x * .12;
		camera.position.y = cameraHome.y - pointer.y * .08;
		camera.lookAt(cameraTarget);
		arms.position.y = Math.sin(time * 12) * .04 + Math.sin(time * 6) * .015;
		arms.rotation.z = Math.sin(time * 6) * .012;
		torso.rotation.z = Math.sin(time * .75) * .018;
		const sway = Math.sin(time * .5);
		stage.position.x = 1.05 + sway * .14;
		stage.position.y = Math.abs(sway) * .025;
		stage.rotation.y = sway * .045;
		person.position.x = sway * .025;
		person.rotation.y = sway * .08;
		head.rotation.y = Math.sin(time * .72) * .07 + pointer.x * .05;
		const blink = Math.pow(Math.max(0, Math.sin(time * .72 - 1.1)), 28);
		eyes.forEach(eye => { eye.scale.y = .9 - blink * .82; });
		codeLines.forEach((line, index) => {
			line.material.emissiveIntensity = .45 + Math.sin(time * 2.2 + index * .9) * .18;
		});
		const rise = Math.max(0, Math.min(1, (time - greetingStarted) / .35));
		const fall = Math.max(0, Math.min(1, (greetingUntil - time) / .45));
		const smoothRise = rise * rise * (3 - 2 * rise);
		const smoothFall = fall * fall * (3 - 2 * fall);
		const greeting = Number.isFinite(greetingStarted) ? Math.min(smoothRise, smoothFall) : 0;
		const waveTime = greeting ? time - greetingStarted : 0;
		wavingArm.rotation.z = greeting * 1.8;
		wavingForearm.rotation.z = greeting * (1.35 + Math.sin(waveTime * 8) * .12);
		wavingHand.rotation.z = handAlignment + greeting * Math.sin(waveTime * 10) * .48;
		const nodProgress = Number.isFinite(greetingStarted)
			? Math.max(0, Math.min(1, (time - greetingStarted) / .3))
			: 1;
		head.rotation.x = -Math.sin(nodProgress * Math.PI) * .08;
		renderOnce();
		animationFrame = window.requestAnimationFrame(drawFrame);
	}

	function startAnimation() {
		if (reducedMotion || animationRunning || !visible || document.hidden) return;
		animationRunning = true;
		animationFrame = window.requestAnimationFrame(drawFrame);
	}

	function stopAnimation() {
		animationRunning = false;
		if (animationFrame !== undefined) {
			window.cancelAnimationFrame(animationFrame);
			animationFrame = undefined;
		}
	}

	canvas.addEventListener('pointermove', event => {
		const bounds = canvas.getBoundingClientRect();
		pointerTarget.x = ((event.clientX - bounds.left) / bounds.width - .5) * 2;
		pointerTarget.y = ((event.clientY - bounds.top) / bounds.height - .5) * 2;
		if (reducedMotion) {
			pointer.copy(pointerTarget);
			camera.position.x = cameraHome.x + pointer.x * .12;
			camera.position.y = cameraHome.y - pointer.y * .08;
			camera.lookAt(cameraTarget);
			head.rotation.y = pointer.x * .05;
			renderOnce();
		}
	});
	canvas.addEventListener('pointerleave', () => {
		pointerTarget.set(0, 0);
		if (reducedMotion) {
			pointer.set(0, 0);
			camera.position.copy(cameraHome);
			camera.lookAt(cameraTarget);
			head.rotation.y = 0;
			renderOnce();
		}
	});
	greetButton.addEventListener('click', () => {
		greetingStarted = clock.getElapsedTime();
		greetingUntil = greetingStarted + 2.4;
		if (reducedMotion) {
			wavingArm.rotation.z = 1.8;
			wavingForearm.rotation.z = 1.35;
			wavingHand.rotation.z = handAlignment;
			renderOnce();
		} else {
			startAnimation();
		}
	});
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) stopAnimation();
		else if (reducedMotion) renderOnce();
		else startAnimation();
	});

	const visibilityObserver = new IntersectionObserver(([entry]) => {
		visible = entry.isIntersecting;
		if (visible && reducedMotion) renderOnce();
		else if (visible) startAnimation();
		else stopAnimation();
	});
	visibilityObserver.observe(sceneSection);
}

if (canvas && sceneSection) {
	const loadObserver = new IntersectionObserver(([entry]) => {
		if (!entry.isIntersecting) return;
		loadObserver.disconnect();
		loadScene();
	}, { rootMargin: '240px' });
	loadObserver.observe(sceneSection);
} else if (canvas) {
	loadScene();
}