# convert-2-gdocs

A TypeScript library for converting HTML content to Google Docs format so it can be used with the Google Docs API.

This is still WIP. 
- It current supports main header, paragraph and list styles. 
- Support for other formatting like tables will be added shortly.
- Markdown to Google Docs format coming soon

## Installation

```bash
npm install convert-2-gdocs
```

```bash
yarn add convert-2-gdocs
```

```bash
pnpm add convert-2-gdocs
```

## Usage

### Converting HTML to Google Docs

```typescript
import { GoogleDocConverter } from 'convert-2-gdocs';

// Initialize the converter
const converter = new GoogleDocConverter();

// Convert HTML to Google Docs API requests
const html = '<h1>Hello World</h1><p>This is a <strong>test</strong>.</p>';
const requests = converter.convertHtml(html);

// Create a batch update request for a specific Google Doc
const docId = 'your-google-doc-id';
const batchRequest = GoogleDocConverter.createBatchUpdateRequest(docId, requests);

// Use the batchRequest with the Google Docs API to update your document
```

## Features

- Convert HTML to Google Docs format
- TypeScript support with full type definitions
- Input validation with detailed error messages
- Generates Google Docs API-compatible requests
- Static helper method for creating batch update requests

## API Reference

### `GoogleDocConverter`

The main class for converting HTML content to Google Docs format.

#### Methods

- `convertHtml(html: string): docs_v1.Schema$Request[]`
  - Converts HTML string to Google Docs API requests
  - Throws `ValidationError` if input is invalid or empty
  - Returns an array of Google Docs API requests

- `static createBatchUpdateRequest(docId: string, requests: docs_v1.Schema$Request[]): docs_v1.Schema$BatchUpdateDocumentRequest`
  - Creates a batch update request for a Google Doc
  - Requires a valid document ID and non-empty array of requests
  - Throws `ValidationError` if parameters are invalid
  - Returns a properly formatted batch update request object

## License

MIT