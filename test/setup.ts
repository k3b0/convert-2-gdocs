import { jest } from '@jest/globals';

// Mock the marked package
jest.mock('marked', () => ({
  marked: jest.fn((...args: unknown[]) => {
    // Simple mock implementation for testing
    const markdown = args[0] as string;
    return markdown
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
      .replace(/^- (.+)$/gm, '<ul><li>$1</li></ul>');
  }),
}));

// Mock the googleapis package
jest.mock('googleapis', () => ({
  google: {
    docs: jest.fn(() => ({
      documents: {
        create: jest.fn(),
        batchUpdate: jest.fn(),
      },
    })),
    auth: {
      GoogleAuth: jest.fn(),
    },
  },
}));

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});