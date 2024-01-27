<svelte:options customElement="cql-input" />

<script lang="ts">
	import Token from './Token.svelte';
	import { onMount, afterUpdate } from 'svelte';

	const exampleQuery = 'an (example AND query) +tag:tags-are-magic';

	onMount(async () => {
		console.log('mounted');
	});

	let cqlQuery = exampleQuery;
	let ast = '';
	let tokenisedChars = [];
	let overlayOffset = 0;
  let cursorOffset = 0;
  let typeaheadOffset = 0;
  let cursorMarker;

	const handleInput = (e: InputEvent) => {
    cursorOffset = e.target.selectionStart;
    fetchLanguageServer(e.target.value);
  }

  afterUpdate(() => {
    typeaheadOffset = cursorMarker?.getBoundingClientRect().left;
  });

	const fetchLanguageServer = async (query: string) => {
		cqlQuery = query;
		const urlParams = new URLSearchParams();
		urlParams.append('query', query);
		const request = await fetch(`http://localhost:5050/cql?${urlParams}`);

		ast = await request.json();

		tokenisedChars = addTokensToString(cqlQuery, ast.tokens);
	};

	const addTokensToString = (str: string, tokens) => {
		return [...str].map((char, index) => {
			return {
				char,
				token: tokens.find((token) => token.start <= index && token.end >= index)
			};
		});
	};

	const syncScrollState = (e: ScrollEvent) => {
		overlayOffset = e.target.scrollLeft;
	};

	fetchLanguageServer(exampleQuery);
</script>

<div class="Cql__input-container">
	<input class="Cql__input" value={cqlQuery} on:input={handleInput} on:scroll={syncScrollState} />
	<div class="Cql__overlay-container">
		<div class="Cql__overlay" contenteditable="true"  style="left: -{overlayOffset}px">
			{#each tokenisedChars || [] as { char, token }, index}
				<Token str={char} {token} />{#if index === cursorOffset - 1}<span class="Cql__cursor-marker" bind:this={cursorMarker}></span>{/if}
			{/each}
		</div>
	</div>
  <div class="Cql__typeahead" style="left: calc({typeaheadOffset}-1em)px"></div>
  {#if ast.queryResult}<div class="Cql__output">{ast.queryResult}</div>{/if}
  {#if ast.error}<div class="Cql__error">{ast.error}</div>{/if}
</div>
<div class="debug"><pre>{JSON.stringify(ast, null, '\t')}</pre></div>

<style>
  :root {
    --input-width: 400px;
  }

	.Cql__input-container {
		position: relative;
	}

  .Cql__overlay-container {
    position: absolute;
		pointer-events: none;
		top: 7px;
		left: 7px;
		width: var(--input-width);
    overflow: hidden;
		white-space: nowrap;
  }

  .Cql__overlay {
    position: relative;
  }

	.Cql__input {
		width: var(--input-width);
		border: 2px solid #666;
		margin: 0;
		padding: 5px;
		color: transparent;
		caret-color: #333;
	}

	.Cql__input,
	.Cql__overlay-container {
		font-family: sans-serif;
		font-size: 16px;
	}

	.debug {
		background-color: #ddd;
		margin-top: 10px;
		padding: 5px;
		font-family: monospace;
		color: #333;
		white-space: pre;
	}

  .Cql__output, .Cql__error {
    margin-top: 1rem;
  }

  .Cql__error {
    color: darkred;
  }

  .Cql__cursor-marker {
    display: inline;
    white-space: pre;
  }
  .Cql__typeahead {
    position: absolute;
    border: 2px solid grey;
    width: 100px;
    height: 300px;
  }
</style>
