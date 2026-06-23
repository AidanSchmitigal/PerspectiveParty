<script lang="ts">
	import { onMount } from 'svelte';
	import { play } from '$lib/feedback.svelte';
	import { roomState } from '$lib/room.svelte';

	let { data, children } = $props();
	let roomCode = $derived(data.roomCode);
	let noPresenter = $derived(roomState.ready && roomState.gameState.presenterId === null);

	let prevPhase = $state('');

	$effect(() => {
		const phase = roomState.gameState?.phase;
		if (!phase) return;
		if (prevPhase && prevPhase !== phase) {
			navigator.vibrate?.(15);
			play('honk');
		}
		prevPhase = phase;
	});

	onMount(() => {
		roomState.connect(roomCode);
	});
</script>

<svelte:head>
	<title>Perspective Party — {roomCode}</title>
	<meta name="description" content="Perspective Party room {roomCode}." />
</svelte:head>

{#if !roomState.ready}
	Connecting...
{:else}
	{#if noPresenter}
		<div class="text-center font-title font-bold text-lg color-ink bg-coral ink px-5 py-2 mb-4">
			No presenter connected
		</div>
	{/if}
	{@render children()}
{/if}
