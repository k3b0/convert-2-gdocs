import { describe, expect, it, beforeEach } from 'vitest';
import { TextAggregator } from '../src/utils/textAggregator';

describe('TextAggregator', () => {
  let aggregator: TextAggregator;

  beforeEach(() => {
    aggregator = new TextAggregator();
  });

  it('should accumulate text segments', () => {
    aggregator.append('Hello');
    aggregator.append(' ');
    aggregator.append('world');
    expect(aggregator.getBuffer()).toBe('Hello world');
  });

  it('should track start and end indices correctly', () => {
    const startIndex = 10; // Simulate starting at index 10
    aggregator = new TextAggregator(startIndex);
    
    aggregator.append('Hello');
    expect(aggregator.getStartIndex()).toBe(10);
    expect(aggregator.getEndIndex()).toBe(15);
    
    aggregator.append(' world');
    expect(aggregator.getStartIndex()).toBe(10);
    expect(aggregator.getEndIndex()).toBe(21);
  });

  it('should handle newlines correctly', () => {
    aggregator.append('Line 1');
    aggregator.append('\n');
    aggregator.append('Line 2');
    expect(aggregator.getBuffer()).toBe('Line 1\nLine 2');
  });

  it('should preserve whitespace when specified', () => {
    aggregator = new TextAggregator(0, { preserveWhitespace: true });
    aggregator.append('  indented');
    aggregator.append('\t');
    aggregator.append('text  ');
    expect(aggregator.getBuffer()).toBe('  indented\ttext  ');
  });

  it('should normalize whitespace by default', () => {
    aggregator.append('  multiple    spaces  ');
    aggregator.append('\t');
    aggregator.append('and\ttabs  ');
    expect(aggregator.getBuffer()).toBe('multiple spaces and tabs');
  });

  it('should clear buffer after flushing', () => {
    aggregator.append('Hello');
    const content = aggregator.flush();
    expect(content).toBe('Hello');
    expect(aggregator.getBuffer()).toBe('');
    expect(aggregator.getLength()).toBe(0);
  });

  it('should maintain correct indices after flush', () => {
    const startIndex = 5;
    aggregator = new TextAggregator(startIndex);
    
    aggregator.append('First');
    aggregator.flush();
    
    // After flush, the start index should be updated to the previous end index
    expect(aggregator.getStartIndex()).toBe(10);
    
    aggregator.append('Second');
    expect(aggregator.getStartIndex()).toBe(10);
    expect(aggregator.getEndIndex()).toBe(16);
  });

  it('should handle empty text segments', () => {
    aggregator.append('');
    aggregator.append('   ');
    expect(aggregator.getBuffer()).toBe('');
    expect(aggregator.getLength()).toBe(0);
  });

  it('should support block boundaries', () => {
    aggregator.append('First block');
    aggregator.markBlockBoundary();
    aggregator.append('Second block');
    expect(aggregator.getBuffer()).toBe('First block\nSecond block');
  });

  it('should not add extra newlines at block boundaries', () => {
    aggregator.append('First block\n');
    aggregator.markBlockBoundary();
    aggregator.append('Second block');
    expect(aggregator.getBuffer()).toBe('First block\nSecond block');
  });

  it('should track formatting ranges', () => {
    aggregator.append('Normal ');
    aggregator.append('bold');
    
    // Add formatting range for "bold"
    aggregator.addFormattingRange(7, 11, { bold: true });
    
    expect(aggregator.getFormattingRanges()).toContainEqual({
      startIndex: 7,
      endIndex: 11,
      style: { bold: true }
    });
  });

  it('should adjust formatting ranges after flush', () => {
    aggregator.append('Normal ');
    aggregator.append('bold');
    aggregator.addFormattingRange(7, 11, { bold: true });
    
    aggregator.flush();
    aggregator.append('More ');
    aggregator.append('italic');
    aggregator.addFormattingRange(5, 11, { italic: true });
    
    expect(aggregator.getFormattingRanges()).toContainEqual({
      startIndex: 5,
      endIndex: 11,
      style: { italic: true }
    });
  });
});