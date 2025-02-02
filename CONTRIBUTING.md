# Contributing to gdocify

Thank you for your interest in contributing to gdocify! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/gdocify.git
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Process

1. **Check Existing Issues**
   - Look for existing issues or create a new one
   - Comment on an issue to claim it
   - Discuss implementation approach if needed

2. **Make Changes**
   - Write tests for new functionality
   - Implement your changes
   - Follow the coding style guidelines
   - Keep commits focused and atomic

3. **Testing**
   - Ensure all tests pass: `npm test`
   - Add new tests as needed
   - Check code coverage: `npm run test:coverage`
   - See `docs/testing.md` for detailed testing guidelines

4. **Documentation**
   - Update documentation for any changed functionality
   - Add JSDoc comments for new functions/methods
   - Update README.md if needed
   - Add examples for new features

## Coding Guidelines

### TypeScript Style

- Use TypeScript's strict mode
- Properly type all parameters and return values
- Use interfaces for complex types
- Follow existing code style

### Naming Conventions

- Use descriptive names for variables and functions
- Use PascalCase for classes and interfaces
- Use camelCase for variables and functions
- Use UPPER_CASE for constants

### Code Organization

- Keep files focused and single-purpose
- Use meaningful directory structure
- Follow the established project structure
- Keep files under 300 lines when possible

### Comments and Documentation

- Use JSDoc for public APIs
- Add inline comments for complex logic
- Keep comments up-to-date
- Document edge cases and limitations

## Pull Request Process

1. **Update Your Fork**
   ```bash
   git remote add upstream https://github.com/original/gdocify.git
   git fetch upstream
   git rebase upstream/main
   ```

2. **Create Pull Request**
   - Use a clear, descriptive title
   - Reference related issues
   - Describe your changes in detail
   - List any breaking changes

3. **PR Template**
   ```markdown
   ## Description
   [Describe your changes]

   ## Related Issue
   Fixes #[issue number]

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   [Describe testing performed]

   ## Checklist
   - [ ] Tests added/updated
   - [ ] Documentation updated
   - [ ] Code follows style guidelines
   - [ ] All tests passing
   ```

4. **Review Process**
   - Address review comments
   - Make requested changes
   - Keep the PR updated

## Release Process

1. **Version Bumping**
   - Follow semantic versioning
   - Update CHANGELOG.md
   - Update package.json version

2. **Release Notes**
   - Document breaking changes
   - List new features
   - Mention bug fixes
   - Credit contributors

## Reporting Issues

### Bug Reports

Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Version information
- Environment details

### Feature Requests

Include:
- Clear description of the feature
- Use cases
- Expected behavior
- Examples if possible

## Community

- Join our discussions
- Help others in issues
- Share your experience
- Suggest improvements

## Additional Resources

- [Development Guide](development.md)
- [Testing Guide](testing.md)
- [API Documentation](api.md)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Google Docs API](https://developers.google.com/docs/api)

## License

By contributing, you agree that your contributions will be licensed under the project's license.

## Questions?

Feel free to ask questions in:
- GitHub issues
- Discussions
- Project chat channels

Thank you for contributing to gdocify!