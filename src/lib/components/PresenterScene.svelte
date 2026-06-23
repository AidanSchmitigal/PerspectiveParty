<script lang="ts">
	import { Counter } from '$lib/counter.svelte';
	import { roomState } from '$lib/room.svelte';
	import { Canvas, T } from '@threlte/core';
	import { GLTF, OrbitControls } from '@threlte/extras';
	import type { ThrelteGltf } from '@threlte/extras';
	import { Spring } from 'svelte/motion';
	import * as THREE from 'three';

	const cardinalColors = [
		new THREE.Color(0xff4444), // +X: Red
		new THREE.Color(0x44ffff), // -X: Cyan
		new THREE.Color(0x44ff44), // +Y: Green
		new THREE.Color(0xff44ff), // -Y: Magenta
		new THREE.Color(0x4444ff), // +Z: Blue
		new THREE.Color(0xffff44) // -Z: Yellow
	];

	function setupCardinalMaterial(mat: THREE.MeshStandardMaterial): void {
		const originalOnBeforeCompile = mat.onBeforeCompile;
		mat.onBeforeCompile = (shader, renderer) => {
			originalOnBeforeCompile?.(shader, renderer);

			shader.vertexShader = shader.vertexShader.replace(
				'#include <common>',
				`#include <common>
				varying vec3 vWorldNormal;`
			);

			shader.vertexShader = shader.vertexShader.replace(
				'#include <defaultnormal_vertex>',
				`#include <defaultnormal_vertex>
				vWorldNormal = normalize(transpose(mat3(viewMatrix)) * transformedNormal);`
			);

			shader.fragmentShader = shader.fragmentShader.replace(
				'#include <common>',
				`#include <common>
				uniform vec3 uCardinalColors[6];
				varying vec3 vWorldNormal;`
			);

			shader.fragmentShader = shader.fragmentShader.replace(
				'#include <color_fragment>',
				`#include <color_fragment>
				vec3 _cardinalNormal = normalize(vWorldNormal);
				vec3 _absN = abs(_cardinalNormal);
				vec3 _cardinalColor;
				if (_absN.x >= _absN.y && _absN.x >= _absN.z) {
					_cardinalColor = uCardinalColors[_cardinalNormal.x >= 0.0 ? 0 : 1];
				} else if (_absN.y >= _absN.x && _absN.y >= _absN.z) {
					_cardinalColor = uCardinalColors[_cardinalNormal.y >= 0.0 ? 2 : 3];
				} else {
					_cardinalColor = uCardinalColors[_cardinalNormal.z >= 0.0 ? 4 : 5];
				}
				diffuseColor.rgb *= _cardinalColor;`
			);

			shader.uniforms.uCardinalColors = { value: cardinalColors };
		};
		mat.needsUpdate = true;
	}

	function applyCardinalColors(root: THREE.Object3D): void {
		root.traverse((child) => {
			if (!(child instanceof THREE.Mesh)) return;

			const materials = Array.isArray(child.material) ? child.material : [child.material];

			for (const mat of materials) {
				if (!(mat instanceof THREE.MeshStandardMaterial)) continue;
				setupCardinalMaterial(mat);
			}
		});
	}

	let hideModel = $derived(roomState.gameState.phase === 'draw');

	let model = $derived(roomState.gameState.challenge.model);
	let angle = new Spring(0.6, { stiffness: 0.001, damping: 0 });
	angle.target = 0;
	let spin = new Counter(0, { autoStart: true, rate: 1 });

	let h = $derived(Math.sin(angle.current) * 5);
	let w = $derived(Math.cos(angle.current) * 5);

	/*
  Ry = [ cos t   0   sin t   [ w       [  w cos t
           0     1     0       h    =     h
        -sin t   0   cos t ]   0 ]        -w sin t ]
  */

	let x = $derived(Math.cos(spin.current) * w);
	let z = $derived(Math.sin(spin.current) * w);

	function handleGltfLoad(gltf: ThrelteGltf): void {
		applyCardinalColors(gltf.scene);
	}
</script>

<div class="size-full">
	<Canvas toneMapping={THREE.ACESFilmicToneMapping} shadows dpr={[1, 2]}>
		<T.PerspectiveCamera
			makeDefault
			fov={35}
			near={0.1}
			far={100}
			position={[x, h, z]}
			oncreate={(c) => c.lookAt(0, 0, 0)}
		/>
		<OrbitControls
			autoRotate
			autoRotateSpeed={4}
			enableDamping={false}
			enablePan={false}
			enableZoom={false}
			enableRotate={false}
			enabled={false}
		/>

		<T.AmbientLight color="#404060" intensity={0.5} />
		<!-- <T.HemisphereLight color="#ffeedd" groundColor="#080820" intensity={800} /> -->

		<T.DirectionalLight
			color="#ffeedd"
			intensity={2.5}
			position={[4, 6, 4]}
			castShadow
			shadow-mapSize-width={1024}
			shadow-mapSize-height={1024}
		/>

		<T.DirectionalLight color="#4488ff" intensity={0.6} position={[-3, 1, 3]} />
		<T.DirectionalLight color="#ffffff" intensity={0.8} position={[-1, 3, -5]} />

		<T.PointLight color="#ff8844" intensity={0.6} distance={10} position={[-2, 3, 2]} />

		<T.DirectionalLight color="#4488ff" intensity={0.6} position={[-3, -1, 3]} />
		<T.DirectionalLight color="#ffffff" intensity={0.8} position={[-1, -3, -5]} />
		<T.DirectionalLight color="#4488ff" intensity={0.6} position={[3, -1, -3]} />
		<T.DirectionalLight color="#ffffff" intensity={0.8} position={[1, -3, 5]} />

		<!-- <T.GridHelper args={[10, 10]} /> -->
		{#if !hideModel}
			<GLTF url={model} position={[0, 0, 0]} onload={handleGltfLoad} />
		{:else}
			<T.Mesh scale={[1.5, 1.5, 1.5]}>
				<T.BoxGeometry />
				<T.MeshStandardMaterial oncreate={(mat) => setupCardinalMaterial(mat)} />
			</T.Mesh>
		{/if}
	</Canvas>
</div>
