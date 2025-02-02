# Implementation Plan for gdocify Library

## 1. Project Initialization and Structure

- Create a new repository (e.g., "gdocify") and initialize it with npm and TypeScript.
- Set up a clear directory layout:
  - `src/`
    - `index.ts` – Public API entry point.
    - `GoogleDocConverter.ts` – Main class exposing conversion methods.
    - `converters/`
      - `htmlToGDoc.ts` – Converts HTML to Google Docs API batchUpdate requests.
      - `mdToHtml.ts` – Converts Markdown to HTML using a parser (e.g., "marked").
    - `types/`
      - `googleDocsTypes.ts` – Re-export or define custom types for Google Docs API requests.
    - `utils/`
      - `htmlParser.ts` – Helper functions for parsing and traversing HTML.
      - `indexManager.ts` – Functions for managing insertion indices.
- `test/` – Contains integration and unit tests (using Jest).
- `examples/` – Contains `usage-example.ts` demonstrating library usage.
- Other configuration files: `package.json`, `tsconfig.json`, `.eslintrc.js`, `.prettierrc`, `README.md`, etc.

## 2. TypeScript Configuration and Build Tools

- Configure `tsconfig.json` with:
  - `target`: ES2019
  - `module`: commonjs (or dual outputs as needed)
  - `declaration`: true
  - `outDir`: "./lib"
  - Enable strict mode.
- Set up npm scripts for building (using tsc), testing (using Jest), and linting (with ESLint and Prettier).

## 3. Core Module Implementation

### A. Public API (`src/index.ts`)
- Expose the `GoogleDocConverter` class and optional helper functions or type definitions.

### B. GoogleDocConverter Class (`src/GoogleDocConverter.ts`)
- Provide a class-based interface with an optional configuration (e.g., default heading style).
- Methods:
  - `convertHtml(html: string)`: Delegates to the HTML-to-GDoc conversion module.
  - `convertMarkdown(md: string)`: Converts Markdown to HTML (via `mdToHtml.ts`) then converts it to Google Docs API requests.

### C. Markdown-to-HTML Converter (`src/converters/mdToHtml.ts`)
- Implement a function that uses a parser (such as "marked") to convert Markdown to HTML.

### D. HTML-to-GDoc Converter (`src/converters/htmlToGDoc.ts`)
- Use an HTML parser (e.g., Cheerio or JSDOM) to parse the HTML into a DOM-like structure.
- Map HTML elements (headings, paragraphs, lists, tables, and inline formatting such as bold, italics, and underline) to Google Docs API batchUpdate requests.
- Handle nested formatting and compute insertion indices using helper functions.

### E. Type Definitions (`src/types/googleDocsTypes.ts`)
- Re-export relevant Google Docs API types or define custom types for a lean public interface.

### F. Utility Modules (`src/utils/`)
- `htmlParser.ts`: Contains functions for traversing HTML nodes, extracting inline styles, and mapping HTML nodes to conversion instructions.
- `indexManager.ts`: Implements functions for calculating insertion indices in the continuous text of a Google Doc.

## 4. Testing and Code Examples

### A. Testing
- Create unit tests for individual converters (`mdToHtml` and `htmlToGDoc`) in the `test/` directory.
- Develop integration tests for `GoogleDocConverter` to verify that both Markdown and HTML inputs produce valid batchUpdate requests.
- Use Jest as the test runner with comprehensive assertions.

### B. Usage Example
- Provide a usage example in `examples/usage-example.ts` demonstrating:
  - Instantiation of `GoogleDocConverter`.
  - Conversion of sample Markdown (or HTML) and logging the generated Google Docs API requests.
- This example will serve as both documentation and a test case.

## 5. Build, Linting, and Continuous Integration

- Define npm scripts:
  - **build**: Runs `tsc` to compile TypeScript code.
  - **test**: Runs tests using Jest.
  - **lint**: Runs ESLint and Prettier for code style checks.
- Set up a CI/CD pipeline (e.g., GitHub Actions) to automatically run tests, lint checks, and builds on every commit or pull request.
- Configure automated publishing following semantic versioning guidelines.

## 6. Documentation and Publishing

- Provide detailed documentation in the `README.md` file covering installation, configuration, and usage.
- Maintain a `CHANGELOG` for tracking breaking changes, new features, and bug fixes.
- Ensure that dependencies (such as googleapis, marked, Cheerio/JSDOM) are correctly declared in `package.json`.
- Follow best practices for npm publishing.

## 7. Additional Considerations

- **Error Handling**: Validate input strings to handle empty or malformed data gracefully.
- **Modular Design**: Keep modules decoupled and extensible for future enhancements (e.g., additional input formats or custom styling).
- **Performance Optimization**: Benchmark and optimize conversion logic for processing large documents efficiently.
- **Documentation Generation**: Optionally, integrate TypeDoc for generating API documentation directly from TypeScript annotations.

---

This implementation plan outlines how to build a robust, maintainable, and user-friendly library to convert Markdown or HTML into Google Docs API requests.