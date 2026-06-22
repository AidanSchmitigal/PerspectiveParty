<script lang="ts">
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
		<div class="perspective-midrange">
			<div class="size-32 relative transform-3d spin">
				<div class="face f1">?</div>
				<div class="face f2">?</div>
				<div class="face f3">?</div>
				<div class="face f4">?</div>
				<div class="face f5">?</div>
				<div class="face f6">?</div>
			</div>
		</div>
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

<style>
	.stripes {
		background: repeating-linear-gradient(
			135deg,
			rgba(82, 191, 238, 0.1) 0 14px,
			transparent 14px 28px
		);
	}

	.spin {
		/* animation: spin 7s linear infinite; */
	}
	@keyframes spin {
		from {
			transform: rotateX(0deg) rotateY(0deg);
		}
		to {
			transform: rotateX(360deg) rotateY(360deg);
		}
	}

	.face {
		position: absolute;
		width: 120px;
		height: 120px;
		border: 4px solid var(--ink);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 38px;
		font-family: 'Baloo 2', cursive;
		font-weight: 800;
	}
	.f1 {
		background: var(--coral);
		transform: translateZ(60px);
	}
	.f2 {
		background: var(--sky);
		transform: rotateY(180deg) translateZ(60px);
	}
	.f3 {
		background: var(--yellow);
		transform: rotateY(90deg) translateZ(60px);
	}
	.f4 {
		background: var(--grass);
		transform: rotateY(-90deg) translateZ(60px);
	}
	.f5 {
		background: var(--grape);
		transform: rotateX(90deg) translateZ(60px);
		color: #fff;
	}
	.f6 {
		background: var(--pink);
		transform: rotateX(-90deg) translateZ(60px);
	}
</style>
