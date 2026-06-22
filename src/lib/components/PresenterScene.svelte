<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

	let {
		model = '/models/01.glb',
		phase = 'study',
		timerLabel = ''
	}: {
		model?: string;
		phase?: string;
		timerLabel?: string;
	} = $props();

	let container: HTMLDivElement;
	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let renderer: THREE.WebGLRenderer;
	let modelGroup: THREE.Group;
	let pivot: THREE.Group;
	let animId: number;

	onMount(() => {
		setupScene();
		return () => cancelAnimationFrame(animId);
	});

	function setupScene() {
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0xf5efe1);

		camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, 0.1, 100);
		camera.position.set(3, 2, 5);
		camera.lookAt(0, 0, 0);

		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(container.clientWidth, container.clientHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.2;
		container.appendChild(renderer.domElement);

		setupLights();
		loadModel();

		animate();
	}

	function setupLights() {
		const ambient = new THREE.AmbientLight(0x404060, 0.5);
		scene.add(ambient);

		const hemi = new THREE.HemisphereLight(0xffeedd, 0x080820, 0.8);
		scene.add(hemi);

		const key = new THREE.DirectionalLight(0xffeedd, 2.5);
		key.position.set(4, 6, 4);
		key.castShadow = true;
		key.shadow.mapSize.width = 1024;
		key.shadow.mapSize.height = 1024;
		scene.add(key);

		const fill = new THREE.DirectionalLight(0x4488ff, 0.6);
		fill.position.set(-3, 1, 3);
		scene.add(fill);

		const rim = new THREE.DirectionalLight(0xffffff, 0.8);
		rim.position.set(-1, 3, -5);
		scene.add(rim);

		const point = new THREE.PointLight(0xff8844, 0.6, 10);
		point.position.set(-2, 3, 2);
		scene.add(point);
	}

	function loadModel() {
		modelGroup = new THREE.Group();
		pivot = new THREE.Group();
		modelGroup.add(pivot);
		scene.add(modelGroup);

		const loader = new GLTFLoader();
		loader.load(
			model,
			(gltf) => {
				gltf.scene.traverse((child) => {
					if (child instanceof THREE.Mesh) {
						child.castShadow = true;
						child.receiveShadow = true;
						child.material = new THREE.MeshPhysicalMaterial({
							color: child.material.color ?? new THREE.Color(0x88bbdd),
							metalness: 0.1,
							roughness: 0.25,
							clearcoat: 0.6,
							clearcoatRoughness: 0.2,
							sheen: 0.3,
							sheenColor: new THREE.Color(0x88aaff),
							sheenRoughness: 0.4,
							envMapIntensity: 0.8,
						});
					}
				});

				pivot.add(gltf.scene);

				const box = new THREE.Box3().setFromObject(pivot);
				const center = box.getCenter(new THREE.Vector3());
				const size = box.getSize(new THREE.Vector3());
				const maxDim = Math.max(size.x, size.y, size.z);
				const scale = 2 / maxDim;

				gltf.scene.position.sub(center);
				modelGroup.scale.set(scale, scale, scale);
			},
			undefined,
			(err) => console.error('Model load error:', err)
		);
	}

	function animate() {
		animId = requestAnimationFrame(animate);

		if (pivot && phase === 'study') {
			pivot.rotation.y += 0.008;
		}

		if (pivot) {
			pivot.visible = phase === 'study';
		}

		renderer.render(scene, camera);
	}
</script>

<div bind:this={container} class="scene-container">
	{#if timerLabel}
		<div class="timer-pill">{timerLabel}</div>
	{/if}
	{#if phase !== 'study'}
		<div class="phase-overlay">
			<p class="phase-text">{phase === 'draw' ? 'Draw!' : phase === 'reveal' ? 'Reveal' : phase}</p>
		</div>
	{/if}
</div>

<style>
	.scene-container {
		width: 100%;
		height: 100%;
		min-height: 340px;
		position: relative;
		overflow: hidden;
		border-radius: 18px;
		border: 3px dashed var(--ink);
	}
	.scene-container :global(canvas) {
		display: block;
		width: 100% !important;
		height: 100% !important;
	}
	.timer-pill {
		position: absolute;
		top: 14px;
		right: 14px;
		background: #fff;
		border: 3px solid var(--ink);
		border-radius: 30px;
		padding: 6px 18px;
		font-family: 'Baloo 2', cursive;
		font-weight: 800;
		font-size: 20px;
		box-shadow: 3px 3px 0 var(--ink);
		transform: rotate(3deg);
		z-index: 10;
	}
	.phase-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: repeating-linear-gradient(
			135deg,
			rgba(82, 191, 238, 0.1) 0 14px,
			transparent 14px 28px
		);
		z-index: 5;
	}
	.phase-text {
		font-family: 'Baloo 2', cursive;
		font-size: 42px;
		font-weight: 800;
		margin: 0;
		text-shadow: 3px 3px 0 rgba(0,0,0,0.1);
		transform: rotate(-2deg);
	}
</style>
