<script lang="ts">
	import { roomState } from '$lib/room.svelte';
	import { Canvas, T } from '@threlte/core';
	import { GLTF, OrbitControls } from '@threlte/extras';
	import { Spring } from 'svelte/motion';
	import * as THREE from 'three';

	let hideModel = $derived(roomState.gameState.phase === 'draw');

	let model = $derived(roomState.gameState.challenge.model);
	let angle = new Spring(0.6, { stiffness: 0.001, damping: 0 });
	angle.target = 0;

	let h = $derived(Math.sin(angle.current) * 5);
	let w = $derived(Math.cos(angle.current) * 5);
</script>

<div class="size-full">
	<Canvas toneMapping={THREE.ACESFilmicToneMapping} shadows dpr={[1, 2]}>
		<T.PerspectiveCamera
			makeDefault
			fov={35}
			near={0.1}
			far={100}
			position={[w, h, 0]}
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
		<T.HemisphereLight color="#ffeedd" groundColor="#080820" intensity={0.8} />

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

		{#if !hideModel}
			<GLTF url={model} position={[0, 0, 0]} />
		{:else}
			<T.GridHelper args={[10, 10]} />
		{/if}
	</Canvas>
</div>
