# API Documentation

## GoogleDocConverter

The main class that provides methods to convert Markdown or HTML content into Google Docs API requests.

### Constructor

```typescript
constructor(config?: ConverterConfig)
```

#### Parameters

- `config` (optional): Configuration options for the converter
  - `defaultHeadingStyle`: Default style for headings
  - Additional configuration options as needed

### Methods

#### convertHtml

```typescript
public convertHtml(html: string): docs_v1.Schema$Request[]
```

Converts an HTML string into an array of Google Docs API batchUpdate requests.

**Parameters:**
- `html`: The HTML string to convert

**Returns:**
- An array of Google Docs API batchUpdate requests

**Example:**
```typescript
const converter = new GoogleDocConverter();
const html = '<h1>Title</h1><p>This is <strong>bold</strong> text.</p>';
const requests = converter.convertHtml(html);
```

#### convertMarkdown

```typescript
public convertMarkdown(md: string): docs_v1.Schema$Request[]
```

Converts a Markdown string into an array of Google Docs API batchUpdate requests.

**Parameters:**
- `md`: The Markdown string to convert

**Returns:**
- An array of Google Docs API batchUpdate requests

**Example:**
```typescript
const converter = new GoogleDocConverter();
const markdown = '# Title\n\nThis is **bold** text.';
const requests = converter.convertMarkdown(markdown);
```

## Types

### ConverterConfig

Configuration options for the GoogleDocConverter.

```typescript
interface ConverterConfig {
  defaultHeadingStyle?: docs_v1.Schema$ParagraphStyle;
  // Additional configuration options
}
```

## Supported Features

### HTML Elements

The following HTML elements are supported:

- Headers (`<h1>` through `<h6>`)
- Paragraphs (`<p>`)
- Lists
  - Unordered lists (`<ul>`)
  - Ordered lists (`<ol>`)
- Text formatting
  - Bold (`<strong>`, `<b>`)
  - Italic (`<em>`, `<i>`)
  - Underline (`<u>`)
- Tables (`<table>`)
- Links (`<a>`)

### Markdown Features

The following Markdown features are supported:

- Headers (`# H1` through `###### H6`)
- Paragraphs (blank line separation)
- Lists
  - Unordered (`-`, `*`, `+`)
  - Ordered (`1.`, `2.`, etc.)
- Text formatting
  - Bold (`**text**` or `__text__`)
  - Italic (`*text*` or `_text_`)
  - Combined formatting (`***bold italic***`)
- Links (`[text](url)`)
- Tables (GitHub-flavored Markdown tables)