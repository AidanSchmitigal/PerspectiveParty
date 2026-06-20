<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<main class="app-shell">
	<header class="topbar">
		<div>
			<p class="eyebrow">Perspective Party</p>
			<h1>Draw the shape!</h1>
		</div>
	</header>
	{@render children()}
</main>
