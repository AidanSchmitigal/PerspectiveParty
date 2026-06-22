<script lang="ts">
	import { roomState } from '$lib/room.svelte';

	import Player from './Player.svelte';
	import Presenter from './Presenter.svelte';

	let isPresenter = $derived(roomState.gameState.presenterId === roomState.selfId);
</script>

{#if isPresenter}
	<Presenter />
{:else}
	<Player />
{/if}
