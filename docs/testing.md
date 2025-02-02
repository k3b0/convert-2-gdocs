# Testing Guide

This guide outlines the testing strategy and practices for the gdocify library.

## Testing Stack

- **Jest**: Main testing framework
- **ts-jest**: TypeScript support for Jest
- **@types/jest**: TypeScript type definitions for Jest

## Test Structure

```
test/
├── GoogleDocConverter.test.ts    # Integration tests
├── converters/
│   ├── htmlToGDoc.test.ts       # HTML conversion tests
│   └── mdToHtml.test.ts         # Markdown conversion tests
└── utils/
    ├── htmlParser.test.ts       # HTML parser utility tests
    └── indexManager.test.ts     # Index management tests
```

## Types of Tests

### 1. Unit Tests

Unit tests focus on testing individual components in isolation.

Example unit test for Markdown conversion:

```typescript
import { markdownToHtml } from '../src/converters/mdToHtml';

describe('markdownToHtml', () => {
  test('converts basic markdown to html', () => {
    const markdown = '# Title\n\nThis is **bold** text.';
    const html = markdownToHtml(markdown);
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<strong>bold</strong>');
  });

  test('handles empty input', () => {
    const html = markdownToHtml('');
    expect(html).toBe('');
  });
});
```

### 2. Integration Tests

Integration tests verify that different components work together correctly.

Example integration test:

```typescript
import { GoogleDocConverter } from '../src/GoogleDocConverter';
import { docs_v1 } from 'googleapis';

describe('GoogleDocConverter', () => {
  let converter: GoogleDocConverter;

  beforeEach(() => {
    converter = new GoogleDocConverter();
  });

  test('converts markdown to valid Google Docs requests', () => {
    const markdown = '# Heading\nParagraph with **bold** text.';
    const requests = converter.convertMarkdown(markdown);

    expect(requests).toHaveLength(3); // Heading, paragraph, and text style
    expect(requests[0]).toHaveProperty('insertText');
    expect(requests[1]).toHaveProperty('updateParagraphStyle');
    expect(requests[2]).toHaveProperty('updateTextStyle');
  });
});
```

### 3. Edge Case Tests

Tests that verify the library handles unusual or extreme inputs correctly.

```typescript
describe('edge cases', () => {
  test('handles nested formatting', () => {
    const html = '<p><strong><em>Bold and italic</em></strong></p>';
    const requests = converter.convertHtml(html);
    // Verify correct nesting of text styles
  });

  test('handles malformed input', () => {
    const html = '<p>Unclosed paragraph';
    expect(() => converter.convertHtml(html)).not.toThrow();
  });
});
```

## Test Coverage

We aim for high test coverage to ensure reliability:

- Minimum 90% line coverage
- 100% coverage of core conversion logic
- All edge cases covered

Run coverage report:
```bash
npm run test:coverage
```

## Writing Good Tests

### Best Practices

1. **Arrange-Act-Assert Pattern**
   ```typescript
   test('converts bold text', () => {
     // Arrange
     const html = '<strong>bold text</strong>';
     
     // Act
     const requests = converter.convertHtml(html);
     
     // Assert
     expect(requests[0]).toMatchObject({
       updateTextStyle: {
         style: { bold: true }
       }
     });
   });
   ```

2. **Descriptive Test Names**
   - Use clear, descriptive names that explain the test's purpose
   - Follow the pattern: "should [expected behavior] when [condition]"

3. **Test Independence**
   - Each test should be independent and not rely on other tests
   - Use `beforeEach` to set up fresh test instances

4. **Meaningful Assertions**
   - Test the actual behavior, not implementation details
   - Use specific assertions rather than generic ones

## Test Data

### Fixtures

Store test data in `test/fixtures/` directory:

```
test/fixtures/
├── markdown/
│   ├── basic.md
│   └── complex.md
└── html/
    ├── basic.html
    └── complex.html
```

Example fixture usage:

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

const loadFixture = (path: string) => 
  readFileSync(join(__dirname, 'fixtures', path), 'utf-8');

test('converts complex document', () => {
  const html = loadFixture('html/complex.html');
  const requests = converter.convertHtml(html);
  // Test assertions
});
```

## Running Tests

### Commands

- Run all tests: `npm test`
- Run specific test file: `npm test -- path/to/test.ts`
- Watch mode: `npm test -- --watch`
- Coverage report: `npm run test:coverage`

### Continuous Integration

Tests are automatically run in CI:
- On pull requests
- On pushes to main branch
- Nightly builds

## Debugging Tests

1. **Using VS Code**
   - Set breakpoints in test files
   - Use the JavaScript Debug Terminal
   - Run tests in debug mode

2. **Console Output**
   - Use `console.log()` for temporary debugging
   - Jest's `--verbose` flag for detailed output

## Test Maintenance

- Review and update tests when adding new features
- Remove obsolete tests
- Keep test data up-to-date
- Regularly check test coverage

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [TypeScript Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)