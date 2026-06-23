<script lang="ts">
	import PresenterScene from '$lib/components/PresenterScene.svelte';
	import { roomState } from '$lib/room.svelte';

	function next() {
		roomState.send({ type: 'next-round' });
	}
</script>

<div class="frame relative">
	<div class="text-center font-title text-2xl font-bold mt-4 mb-2">How did you do?</div>
	<div
		class="h-48 flex items-center justify-center border-3 border-dashed border-ink rounded-2xl relative overlfow-clip stripes"
	>
		<PresenterScene />
		<PresenterScene ortho />
	</div>

	<div class="flex gap-2.5 mt-4 flex-wrap pt-1.5 px-1">
		{#each roomState.gameState.players as player, i (player.id)}
			<div class="shrink-0 flex flex-col items-center">
				<div class="relative">
					<div
						class="size-14 absolute -top-2 -left-2 border-3 border-ink flex items-center justify-center text-2xl shrink-0 overflow-clip {[
							'blob1',
							'blob2',
							'blob3'
						][i % 3]}"
					>
						{#if player.avatar.drawing}
							<img src={player.avatar.drawing} alt={`${player.name}'s drawing`} />
						{:else}
							<div class="size-full bg-white"></div>
						{/if}
					</div>
					<div class="size-50 ink overflow-clip shrink-0">
						<img src={player.drawing} alt={`${player.name}'s drawing`} class="size-full" />
					</div>
				</div>
			</div>
		{/each}
	</div>

	<button class="btn coral text-lg absolute -top-4 -right-4" onclick={next}>next</button>
</div>
