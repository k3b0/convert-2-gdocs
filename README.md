# convert-2-gdocs

A TypeScript library for converting HTML and Markdown content to Google Docs format using the Google Docs API.

## Installation

```bash
npm install convert-2-gdocs
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

### Converting Markdown to Google Docs

```typescript
import { GoogleDocConverter } from 'convert-2-gdocs';

// Initialize the converter
const converter = new GoogleDocConverter();

// Convert Markdown to Google Docs API requests
const markdown = '# Hello World\n\nThis is a **test**.';
const requests = await converter.convertMarkdown(markdown);

// Create a batch update request for a specific Google Doc
const docId = 'your-google-doc-id';
const batchRequest = GoogleDocConverter.createBatchUpdateRequest(docId, requests);

// Use the batchRequest with the Google Docs API to update your document
```

### Configuration

You can customize the converter's behavior by passing a configuration object:

```typescript
const converter = new GoogleDocConverter({
  defaultHeadingStyle: {
    namedStyleType: 'HEADING_1'
  },
  defaultParagraphStyle: {
    namedStyleType: 'NORMAL_TEXT'
  }
});

// Update configuration
converter.updateConfig({
  // new config options
});

// Get current configuration
const config = converter.getConfig();

// Reset configuration to defaults
converter.resetConfig();
```

## Features

- Convert HTML to Google Docs format
- Convert Markdown to Google Docs format
- Customizable styling through configuration
- TypeScript support with full type definitions
- Async/await support for Markdown conversion

## API Reference

### `GoogleDocConverter`

The main class for converting content to Google Docs format.

#### Methods

- `convertHtml(html: string): docs_v1.Schema$Request[]`
  - Converts HTML string to Google Docs API requests
  - Throws `ValidationError` if input is invalid

- `convertMarkdown(markdown: string): Promise<docs_v1.Schema$Request[]>`
  - Converts Markdown string to Google Docs API requests
  - Returns a Promise that resolves to an array of requests
  - Throws `ValidationError` if input is invalid

- `updateConfig(config: Partial<ConverterConfig>): void`
  - Updates the converter configuration
  - Merges new config with existing config

- `getConfig(): ConverterConfig`
  - Returns the current converter configuration

- `resetConfig(): void`
  - Resets the converter configuration to defaults

- `static createBatchUpdateRequest(docId: string, requests: docs_v1.Schema$Request[]): docs_v1.Schema$BatchUpdateDocumentRequest`
  - Creates a batch update request for a Google Doc
  - Requires a valid document ID and array of requests

## License

MIT