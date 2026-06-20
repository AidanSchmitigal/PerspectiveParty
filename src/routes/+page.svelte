<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { makeRoomCode } from '$lib/game';

	let roomInput = $state('');

	function createRoom() {
		const code = makeRoomCode();
		goto(resolve(`/room/${code}`));
	}

	function joinRoom() {
		const code = roomInput
			.trim()
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, '')
			.slice(0, 8);
		if (!code) return;
		goto(resolve(`/room/${code}`));
	}
</script>

<svelte:head>
	<title>Perspective Party</title>
	<meta name="description" content="A Jackbox-like spatial reasoning drawing game." />
</svelte:head>

<section class="flex flex-col">
	<div class="flex">
		<button class="btn coral" onclick={createRoom}>Create room</button>
		<div class="join-box">
			<input
				class="name-input"
				placeholder="ROOM"
				bind:value={roomInput}
				onkeydown={(event) => event.key === 'Enter' && joinRoom()}
			/>
			<button class="btn sky" onclick={joinRoom}>Join</button>
		</div>
	</div>
	<div class="mini-scene" aria-label="Spinning cube preview">
		<div class="cube cube-large">
			<div class="face front">?</div>
			<div class="face back"></div>
			<div class="face right"></div>
			<div class="face left"></div>
			<div class="face top"></div>
			<div class="face bottom"></div>
		</div>
	</div>
</section>
