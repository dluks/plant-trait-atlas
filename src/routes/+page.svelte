<script lang="ts">
  // Paper landing page. PLACEHOLDER text in brackets, to be written with Daniel.
</script>

<svelte:head>
  <title>Beyond the mean: a global atlas of plant trait distributions</title>
  <meta name="description" content="Global 1 km maps of the full distribution of 37 plant traits. Research in preparation; data under embargo." />
</svelte:head>

<header>
  <span class="title">Beyond the mean: a global atlas of plant trait distributions</span>
  <nav>
    <a href="./" aria-current="page">The study</a>
    <a href="explore/">Explore the maps</a>
  </nav>
  <span class="embargo">In preparation · data under embargo</span>
</header>

<main>
  <p class="kicker">Manuscript in preparation</p>
  <h1>Beyond the mean: a global atlas of plant trait distributions</h1>
  <p class="authors">[Authors and affiliations]</p>
  <p><a class="cta" href="explore/">Explore the maps</a></p>

  <h2>Summary</h2>
  <p>[One-paragraph summary of the study.]</p>

  <h2>Key figures</h2>
  <p>[Figures with captions, each linking to the matching view in the explorer.]</p>

  <h2>Data</h2>
  <p>The data will be released with a DOI on publication.</p>

  <h2>Citation</h2>
  <p>[Citation once published.]</p>
</main>

<style>
  :global(body) { margin: 0; font-family: Inter, system-ui, sans-serif; color: #18181b; }
  header { height: 56px; display: flex; align-items: center; gap: 32px; padding: 0 24px; border-bottom: 1px solid #d4d4d8; }
  .title { font-size: 16px; font-weight: 600; }
  nav { display: flex; gap: 20px; font-size: 14px; }
  nav a { text-decoration: none; color: #52525b; }
  nav a[aria-current='page'] { color: #18181b; font-weight: 600; }
  .embargo { margin-left: auto; font-size: 12px; padding: 6px 10px; border-radius: 999px; background: #fef3c7; color: #78350f; white-space: nowrap; }
  main { max-width: 760px; margin: 0 auto; padding: 48px 16px 96px; line-height: 1.6; }
  .kicker { font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #52525b; margin: 0; }
  h1 { font-size: 36px; line-height: 1.2; margin: 8px 0 12px; }
  h2 { font-size: 20px; margin: 40px 0 8px; }
  .authors { color: #3f3f46; }
  a { color: #0b5c91; }
  .cta { display: inline-block; padding: 12px 20px; border-radius: 8px; background: #0072b2; color: #fff; text-decoration: none; font-weight: 500; }
  @media (max-width: 760px) {
    header { gap: 12px; padding: 0 12px; }
    .title, nav { display: none; }
    .embargo { margin: 0 auto; }
    h1 { font-size: 28px; }
  }
</style>
