<svelte:options customElement="cql-input" />

<script lang="ts">
	import Token from './Token.svelte';
	import { onMount, afterUpdate } from 'svelte';
  import { fade } from 'svelte/transition';

	const TYPEAHEAD_TOKENS = ['QUERY_META_KEY', 'QUERY_META_VALUE'];

	const exampleQuery = 'an (example AND query) +tag:tags-are-magic';

	onMount(async () => {
		fetchLanguageServer(exampleQuery);
	});

	let overlayOffset = 0;
	let cqlQuery = exampleQuery;
	let ast = '';
	let tokenisedChars = [];
	let typeaheadTokens = [];
	let typeaheadOffsetChars: undefined | number = undefined;
	let typeaheadOffsetPx = 0;
	let inputElement: HTMLInputElement;
	let cursorMarker: HTMLSpanElement;
  let inputContainerElement: HTMLDivElement;
	let menuIndex = 0;
	let menuItems = [];

	const handleInput = (e: InputEvent) => {
		fetchLanguageServer(e.target.value);
	};

	const handleKeydown = (e) => {
		if (typeaheadOffsetChars === undefined) {
			// Only active when menu is active
			return;
		}

		let handled = true;

		switch (e.key) {
			case 'ArrowUp':
				if (menuIndex > 0) menuIndex--;
				break;
			case 'ArrowDown':
				if (menuIndex < menuItems.length - 1) menuIndex++;
				break;
			case 'Enter':
				replaceToken(menuIndex);
				break;
			case 'Escape':
				typeaheadOffsetChars = undefined;
				break;
			default:
				handled = false;
		}

		if (handled) {
			e.preventDefault();
		}
	};

	const replaceToken = (index: number) => {
		const token = typeaheadTokens.find((token) => token.start === typeaheadOffsetChars);
		if (!token) {
			console.log(`No token found at ${typeaheadOffsetChars}`);
			return;
		}
		// Assumption here: the +1s bake in the idea of a single + or : char leading the token.
		const strToInsert = menuItems[index].value;
		cqlQuery = `${cqlQuery.slice(0, token.start + 1)}${menuItems[index].value}${cqlQuery.slice(token.end + 1)}`;

		const newCaretPosition = token.start + 1 + strToInsert.length;

		// Is there a better way of waiting for Svelte to update the DOM?
		requestAnimationFrame(() => {
			inputElement.setSelectionRange(newCaretPosition, newCaretPosition);
		});

    typeaheadOffsetChars = undefined;

		fetchLanguageServer(cqlQuery);
	};

	const watchSelectionChange = () => {
		document.addEventListener('selectionchange', handleSelection);
	};

	const unwatchSelectionChange = (e) => {
    if (inputContainerElement.contains(e.relatedTarget)) {
      // We're within the input element – do not lose focus.
      return;
    }
		document.removeEventListener('selectionchange', handleSelection);
		typeaheadOffsetChars = undefined;
	};

	const handleSelection = (e: InputEvent) => {
		applyTypeahead(inputElement.selectionStart);
	};

	const applyTypeahead = (cursorOffset: number) => {
		const firstValidTypeaheadToken = typeaheadTokens.find(
			(token) => cursorOffset >= token.start && cursorOffset <= token.end
		);
		if (firstValidTypeaheadToken) {
			typeaheadOffsetChars = firstValidTypeaheadToken.start;
      const options = ast.suggestions[firstValidTypeaheadToken.tokenType]?.[firstValidTypeaheadToken.literal]
      menuItems = options || [];
		} else {
			typeaheadOffsetChars = undefined;
		}
	};

	afterUpdate(() => {
		typeaheadOffsetPx = cursorMarker?.getBoundingClientRect().left;
	});

	const fetchLanguageServer = async (query: string) => {
		cqlQuery = query;
		const urlParams = new URLSearchParams();
		urlParams.append('query', query);
		const request = await fetch(`http://localhost:5050/cql?${urlParams}`);

		ast = await request.json();
		typeaheadTokens = ast.tokens.filter((token) => TYPEAHEAD_TOKENS.includes(token.tokenType));
		applyTokens(cqlQuery, ast.tokens);
		applyTypeahead(inputElement.selectionStart);
	};

	const applyTokens = (query, tokens) => {
		tokenisedChars = addTokensToString(query, tokens);
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
</script>

<div class="Cql__input-container" bind:this={inputContainerElement}>
	<input
		class="Cql__input"
		value={cqlQuery}
		on:input={handleInput}
		on:keydown={handleKeydown}
		on:focus={watchSelectionChange}
		on:blur={unwatchSelectionChange}
		on:scroll={syncScrollState}
		bind:this={inputElement}
	/>
	<div class="Cql__overlay-container">
		<div class="Cql__overlay" contenteditable="true" style="left: -calc({overlayOffset}px - 1em)">
			{#each tokenisedChars || [] as { char, token }, index}
				<Token str={char} {token} />{#if index === typeaheadOffsetChars - 1}<span
						class="Cql__cursor-marker"
						bind:this={cursorMarker}
					></span>{/if}
			{/each}
		</div>
	</div>
	{#if typeaheadOffsetChars !== undefined}<div
			class="Cql__typeahead"
			style="left: {typeaheadOffsetPx - 7}px"
      transition:fade={{ duration: 100 }}
		>
			<ul>
				{#each menuItems as { label }, index}
					<li>
						<button class:--selected={menuIndex === index} on:click={() => replaceToken(index)}>{label}</button>
					</li>
				{/each}
			</ul>
		</div>{/if}
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

	.Cql__output,
	.Cql__error {
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
		background-color: white;
	}

	.Cql__typeahead ul,
  .Cql__typeahead li {
		list-style: none;
		padding: initial;
		margin: initial;
	}

	.Cql__typeahead li button:hover {
		background-color: #eee;
		cursor: pointer;
	}

  .Cql__typeahead li button {
    width: 100%;
    padding: 5px;
    border: none;
    outline: none;
    background-color: white;
    text-align: left;
    cursor: pointer;
  }

	.Cql__typeahead li button.--selected {
		background-color: #ddd;
	}
</style>
