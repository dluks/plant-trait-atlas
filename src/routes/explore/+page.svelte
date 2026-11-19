<script lang="ts">
  import { onMount } from 'svelte';
  import { DEFAULT_VIEW, view } from '#lib/app.svelte.ts';
  import LayerControl from '#lib/components/LayerControl.svelte';
  import MapView from '#lib/components/MapView.svelte';
  import Panel from '#lib/components/Panel.svelte';
  import { fromQuery, toQuery } from '#lib/selection.ts';

  let ready = $state(false);

  onMount(() => {
    Object.assign(view, fromQuery(location.search, DEFAULT_VIEW));
    ready = true;
  });

  // Keep the URL in step with the view, so any view can be shared.
  $effect(() => {
    const q = toQuery(view);
    if (ready) history.replaceState(history.state, '', q ? `?${q}` : location.pathname);
  });
</script>

<svelte:head>
  <title>Explore the maps · Plant trait atlas</title>
  <meta name="description" content="Explore global 1 km maps of plant trait distributions. Research in preparation; data under embargo." />
</svelte:head>

<div class="app">
  <header>
    <a class="title" href="../">Beyond the mean: a global atlas of plant trait distributions</a>
    <nav>
      <a href="../">The study</a>
      <a href="./" aria-current="page">Explore the maps</a>
    </nav>
    <span class="embargo">In preparation · data under embargo</span>
  </header>
  <main>
    <div class="mapwrap">
      <MapView />
      <LayerControl />
    </div>
    <Panel />
  </main>
</div>

<style>
  :global(body) { margin: 0; font-family: Inter, system-ui, sans-serif; color: #18181b; }
  .app { height: 100dvh; display: flex; flex-direction: column; }
  header { height: 56px; flex-shrink: 0; display: flex; align-items: center; gap: 32px; padding: 0 24px; border-bottom: 1px solid #d4d4d8; }
  .title { font-size: 16px; font-weight: 600; color: inherit; text-decoration: none; }
  nav { display: flex; gap: 20px; font-size: 14px; }
  nav a { text-decoration: none; color: #52525b; }
  nav a[aria-current='page'] { color: #18181b; font-weight: 600; }
  .embargo { margin-left: auto; font-size: 12px; padding: 6px 10px; border-radius: 999px; background: #fef3c7; color: #78350f; white-space: nowrap; }
  main { flex: 1; display: flex; min-height: 0; }
  .mapwrap { flex: 1; position: relative; min-width: 0; background: #dceaf5; }
  @media (max-width: 760px) {
    header { gap: 12px; padding: 0 12px; }
    .title, nav { display: none; }
    .embargo { margin: 0 auto; }
    main { flex-direction: column; }
    .mapwrap { min-height: 40vh; }
  }
</style>
