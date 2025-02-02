# Development Guide

This guide will help you set up your development environment and understand the project structure.

## Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- TypeScript knowledge
- Basic understanding of the Google Docs API

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/gdocify.git
cd gdocify
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Run tests:
```bash
npm test
```

## Project Structure

```
gdocify/
├── src/
│   ├── index.ts                   # Public API entry point
│   ├── GoogleDocConverter.ts      # Main converter class
│   ├── converters/
│   │   ├── htmlToGDoc.ts         # HTML to Google Docs conversion
│   │   └── mdToHtml.ts           # Markdown to HTML conversion
│   ├── types/
│   │   └── googleDocsTypes.ts    # Type definitions
│   └── utils/
│       ├── htmlParser.ts         # HTML parsing utilities
│       └── indexManager.ts       # Index management utilities
├── test/
│   ├── GoogleDocConverter.test.ts
│   ├── htmlToGDoc.test.ts
│   └── mdToHtml.test.ts
├── examples/
│   └── usage-example.ts
└── docs/
    ├── api.md                    # API documentation
    ├── development.md            # This guide
    └── testing.md               # Testing guide
```

## Development Workflow

1. **Making Changes**
   - Create a new branch for your feature/fix
   - Write tests for new functionality
   - Implement your changes
   - Ensure all tests pass
   - Update documentation as needed

2. **Code Style**
   - The project uses ESLint and Prettier for code formatting
   - Run `npm run lint` to check your code
   - Run `npm run format` to automatically format your code

3. **Testing**
   - Write unit tests for new functionality
   - Ensure all tests pass before committing
   - Run tests with `npm test`
   - See `docs/testing.md` for detailed testing guidelines

4. **Building**
   - Run `npm run build` to compile TypeScript
   - Check the `lib/` directory for compiled output
   - Verify that type definitions are generated correctly

## Configuration Files

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2019",
    "module": "commonjs",
    "declaration": true,
    "outDir": "./lib",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "test"]
}
```

### package.json Scripts
```json
{
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write \"src/**/*.ts\"",
    "prepare": "npm run build"
  }
}
```

## Best Practices

1. **Code Organization**
   - Keep modules focused and single-purpose
   - Use clear, descriptive names for functions and variables
   - Document complex logic with comments
   - Follow TypeScript best practices

2. **Error Handling**
   - Use custom error types for different scenarios
   - Provide meaningful error messages
   - Handle edge cases appropriately

3. **Performance**
   - Consider memory usage when processing large documents
   - Optimize DOM traversal operations
   - Use efficient data structures

4. **Documentation**
   - Document public APIs thoroughly
   - Include examples in documentation
   - Keep documentation up-to-date with changes

## Contributing

See `CONTRIBUTING.md` for detailed contribution guidelines.

## Troubleshooting

Common issues and their solutions:

1. **Build Errors**
   - Ensure all dependencies are installed
   - Check TypeScript version compatibility
   - Verify tsconfig.json settings

2. **Test Failures**
   - Run tests in isolation using `npm test -- -t "test name"`
   - Check test environment setup
   - Verify test data is correct

3. **Type Errors**
   - Ensure types are properly imported
   - Check interface implementations
   - Verify generic type parameters

## Additional Resources

- [Google Docs API Documentation](https://developers.google.com/docs/api)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)