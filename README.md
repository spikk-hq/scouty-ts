# scouty

TypeScript client for the Scouty search API.

## Installation

```bash
npm install scouty
```

## Usage

```ts
import { ScoutyClient } from "scouty";

const client = new ScoutyClient({
  apiKey: process.env.SCOUTY_API_KEY,
});

const response = await client.search.text({
  query: "weather",
  backend: ["brave", "bing"],
  maxResults: 10,
});

console.log(response.results);
```

## Configuration

`ScoutyClient` accepts:

- `apiKey`
- `baseUrl`
- `fetch`
- `headers`
- `apiKeyHeader`

If `apiKey` is not passed explicitly, the client falls back to `SCOUTY_API_KEY` environment varibale.

## Text Search

`client.search.text()` accepts:

- `query`
- `region`
- `safesearch`
- `timelimit`
- `maxResults`
- `page`
- `backend`

`backend` can be a single engine or an array of engines. Supported engines:

- `auto`
- `bing`
- `brave`
- `duckduckgo`
<!-- - `google` -->
- `wikipedia`
- `yahoo`
- `yandex`

## License

MIT
