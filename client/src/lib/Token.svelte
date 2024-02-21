<script lang="ts">
	export let token;
	export let str;
</script>

<span class={`Char Token__${token?.tokenType || 'None'}`}>{str}</span>

<style>
  .Char {
    display: inline;
    white-space: pre;
  }

	.Token__STRING {
		color: #3043a2;
	}
	.Token__LEFT_BRACKET,
	.Token__RIGHT_BRACKET {
		color: #cc6b6b;
	}
	.Token__AND,
	.Token__OR {
		color: purple;
	}

	.Token__QUERY_FIELD_KEY, .Token__QUERY_OUTPUT_MODIFIER_KEY {
		color: #977e0a;
	}

	.Token__QUERY_VALUE {
		color: darkgreen;
	}
</style>
