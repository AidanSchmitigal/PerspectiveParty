<script lang="ts">
	import PresenterScene from '$lib/components/PresenterScene.svelte';
	import { roomState } from '$lib/room.svelte';

	let myPlayer = $derived(roomState.gameState.players.find((p) => p.id === roomState.selfId)!);
</script>

<div class="frame">
	<div class="text-center font-title text-2xl font-bold mt-4 mb-2">How did you do?</div>
	<div
		class="h-48 flex items-center justify-center border-3 border-dashed border-ink rounded-2xl relative overlfow-clip stripes"
	>
		<PresenterScene />
		<PresenterScene ortho />
	</div>
	<div class="flex gap-2.5 mt-4 justify-center pt-1.5 px-1">
		<div class="relative">
			<div
				class="size-14 absolute -top-2 -left-2 border-3 border-ink flex items-center justify-center text-2xl shrink-0 overflow-clip blob1"
			>
				{#if myPlayer.avatar.drawing}
					<img src={myPlayer.avatar.drawing} alt={`${myPlayer.name}'s drawing`} />
				{:else}
					<div class="size-full bg-white"></div>
				{/if}
			</div>
			<div class="size-50 ink overflow-clip shrink-0">
				<img src={myPlayer.drawing} alt={`${myPlayer.name}'s drawing`} class="size-full" />
			</div>
		</div>
	</div>
</div>
