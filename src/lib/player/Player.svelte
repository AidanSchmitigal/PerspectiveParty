<script lang="ts">
	import { roomState } from '$lib/room.svelte';
	import { type Avatar } from '$lib/game';
	import Lobby from './Lobby.svelte';
	import Study from './Study.svelte';
	import Draw from './Draw.svelte';
	import Reveal from './Reveal.svelte';

	let joined = $state(false);
	let phase = $derived(roomState.gameState.phase);

	$effect(() => {
		if (phase === 'lobby') joined = true;
	});

	function handleJoin(name: string, avatar: Avatar) {
		roomState.send({ type: 'join', name, avatar });
		joined = true;
	}
</script>

{#if phase == 'lobby'}
	<Lobby autoJoin />
{:else if !joined}
	<Lobby onjoin={handleJoin} />
{:else if phase == 'study'}
	<Study />
{:else if phase == 'draw'}
	<Draw />
{:else if phase == 'reveal'}
	<Reveal />
{/if}
