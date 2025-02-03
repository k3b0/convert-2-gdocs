interface TextAggregatorOptions {
  preserveWhitespace?: boolean;
}

interface FormattingRange {
  startIndex: number;
  endIndex: number;
  style: Record<string, unknown>;
}

/**
 * TextAggregator accumulates text segments and manages their formatting ranges.
 * It helps consolidate multiple text nodes into single insertText requests while
 * maintaining proper formatting and indices.
 */
export class TextAggregator {
  private buffer: string = '';
  private startIndex: number;
  private formattingRanges: FormattingRange[] = [];
  private options: TextAggregatorOptions;
  private lastCharWasNewline: boolean = false;
  private isBlockStart: boolean = true;
  private needsBlockBoundary: boolean = false;
  private pendingSpace: boolean = false;

  constructor(startIndex: number = 0, options: TextAggregatorOptions = {}) {
    this.startIndex = startIndex;
    this.options = options;
  }

  /**
   * Appends a text segment to the buffer.
   * @param text The text segment to append
   */
  append(text: string): void {
    if (!text) return;

    let processedText = text;
    
    if (this.options.preserveWhitespace) {
      // When preserving whitespace, keep everything as is
      processedText = text;
    } else {
      // Split by newlines to preserve them while normalizing other whitespace
      processedText = text
        .split(/(\n)/)
        .map(segment => {
          if (segment === '\n') return '\n';
          return segment.trim().replace(/\s+/g, ' ');
        })
        .filter(Boolean)
        .join('');
    }

    if (processedText) {
      // Handle block boundaries
      if (this.needsBlockBoundary && !this.isBlockStart) {
        this.buffer += '\n';
        this.lastCharWasNewline = true;
        this.needsBlockBoundary = false;
        this.pendingSpace = false;
      }

      // Handle spacing between segments
      if (!this.isBlockStart && !this.lastCharWasNewline && !processedText.startsWith('\n')) {
        const needsSpace = !this.options.preserveWhitespace &&
                          !this.buffer.endsWith(' ') && 
                          !processedText.startsWith(' ') &&
                          this.pendingSpace;
        
        if (needsSpace) {
          this.buffer += ' ';
        }
      }

      this.buffer += processedText;
      this.lastCharWasNewline = processedText.endsWith('\n');
      this.isBlockStart = false;
      this.pendingSpace = !this.lastCharWasNewline && 
                         !this.options.preserveWhitespace && 
                         !processedText.endsWith(' ');
    }
  }

  /**
   * Marks a block boundary by ensuring a newline separator.
   */
  markBlockBoundary(): void {
    if (!this.lastCharWasNewline) {
      this.needsBlockBoundary = true;
    }
  }

  /**
   * Gets the current buffer content.
   */
  getBuffer(): string {
    return this.buffer;
  }

  /**
   * Gets the current length of the buffer.
   */
  getLength(): number {
    return this.buffer.length;
  }

  /**
   * Gets the starting index of the current buffer.
   */
  getStartIndex(): number {
    return this.startIndex;
  }

  /**
   * Gets the ending index of the current buffer.
   */
  getEndIndex(): number {
    return this.startIndex + this.buffer.length;
  }

  /**
   * Gets the array of formatting ranges.
   */
  getFormattingRanges(): FormattingRange[] {
    return this.formattingRanges;
  }

  /**
   * Adds a formatting range to the current buffer.
   * @param startOffset The start offset from the current buffer position
   * @param endOffset The end offset from the current buffer position
   * @param style The style to apply
   */
  addFormattingRange(startOffset: number, endOffset: number, style: Record<string, unknown>): void {
    // Calculate actual offsets based on the current buffer state
    const bufferBeforeStart = this.buffer.substring(0, startOffset);
    
    // Count only spaces that were added between words
    const addedSpaces = (bufferBeforeStart.match(/(?<=[^\s])\s(?=[^\s])/g) || []).length;
    const textInRange = this.buffer.substring(startOffset, endOffset);
    const rangeSpaces = (textInRange.match(/(?<=[^\s])\s(?=[^\s])/g) || []).length;
    
    const actualStartOffset = startOffset + addedSpaces;
    const actualEndOffset = actualStartOffset + (endOffset - startOffset) + rangeSpaces;
    
    // Find overlapping styles
    const overlappingRanges = this.formattingRanges.filter(range => 
      range.startIndex <= actualEndOffset && range.endIndex >= actualStartOffset
    );

    if (overlappingRanges.length > 0) {
      // Create a new range that combines all overlapping styles
      const mergedStyle = overlappingRanges.reduce(
        (acc, range) => ({ ...acc, ...range.style }),
        style
      );

      // Remove overlapping ranges
      overlappingRanges.forEach(range => {
        const index = this.formattingRanges.indexOf(range);
        if (index !== -1) {
          this.formattingRanges.splice(index, 1);
        }
      });

      // Add new merged range
      this.formattingRanges.push({
        startIndex: actualStartOffset,
        endIndex: actualEndOffset,
        style: mergedStyle
      });
    } else {
      // Add new range
      this.formattingRanges.push({
        startIndex: actualStartOffset,
        endIndex: actualEndOffset,
        style
      });
    }
  }

  /**
   * Flushes the buffer and updates indices.
   * @returns The current buffer content
   */
  flush(): string {
    const content = this.buffer;
    this.startIndex += this.buffer.length;
    this.buffer = '';
    this.formattingRanges = [];
    this.lastCharWasNewline = false;
    this.isBlockStart = true;
    this.needsBlockBoundary = false;
    this.pendingSpace = false;
    return content;
  }

  /**
   * Removes any trailing newlines from the buffer.
   */
  trimTrailingNewlines(): void {
    this.buffer = this.buffer.replace(/\n+$/, '');
    this.lastCharWasNewline = false;
    this.pendingSpace = !this.options.preserveWhitespace;
  }
}