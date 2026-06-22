<script lang="ts">
	import DrawingCanvas from '$lib/components/DrawingCanvas.svelte';
	import { makeAvatar, sanitizeName, type Avatar } from '$lib/game';
	import { roomState } from '$lib/room.svelte';
	import { onMount } from 'svelte';

	let name = $state('');
	let avatar = $state<Avatar>(makeAvatar());

	onMount(() => {
		const cleanName = sanitizeName(name || localStorage.getItem('perspective-party-name') || '');
		name = cleanName;
		localStorage.setItem('perspective-party-name', cleanName);
		localStorage.setItem('perspective-party-avatar', JSON.stringify(avatar));

		roomState.send({ type: 'join', name, avatar });
	});

	$effect(() => {
		localStorage.setItem('perspective-party-name', name);
		roomState.send({ type: 'set-player', name });
	});
</script>

{#if roomState.gameState.phase == 'lobby'}
	<div class="frame">
		<div class="w-18 h-2 bg-ink rounded mx-auto mb-2"></div>
		<div class="text-center">
			<h2 class="text-xl mt-1 mb-2">make your doodler</h2>

			<DrawingCanvas
				initialDrawing={avatar.drawing}
				oninstant={(url) => {
					avatar.drawing = url;
					roomState.send({ type: 'set-player', avatar });
				}}
				onupdate={(url) => {
					avatar.drawing = url;
					localStorage.setItem('perspective-party-avatar', JSON.stringify(avatar));
					roomState.send({ type: 'set-player', avatar });
				}}
			/>

			<div class="font-title font-bold mt-2 mb-1">name your doodler</div>
			<input type="text" id="ccName" placeholder="Lentil" maxlength="14" bind:value={name} />
		</div>
	</div>
{:else if roomState.gameState.phase == 'study'}

{:else if roomState.gameState.phase == 'draw'}

{:else if roomState.gameState.phase == 'reveal'}

{:else if roomState.gameState.phase == 'vote'}

{/if}
