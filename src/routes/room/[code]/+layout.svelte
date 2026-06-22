<script lang="ts">
	import { roomState } from '$lib/room.svelte';
	import { onMount } from 'svelte';

	let { data, children } = $props();
	let roomCode = $derived(data.roomCode);

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
	{@render children()}
{/if}
