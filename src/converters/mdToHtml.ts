import { marked } from 'marked';
import { ConversionError } from '../types/googleDocsTypes';

/**
 * Convert Markdown string to HTML
 * @param markdown The markdown string to convert
 * @returns HTML string
 * @throws {ConversionError} If markdown conversion fails
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  if (!markdown) {
    return '';
  }

  try {
    // Configure marked options for GitHub-flavored markdown
    marked.setOptions({
      gfm: true, // GitHub-flavored markdown
      breaks: true, // Convert line breaks to <br>
    });

    return await marked(markdown);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new ConversionError(`Failed to convert Markdown to HTML: ${errorMessage}`);
  }
}

/**
 * Convert Markdown string to HTML with custom options
 * @param markdown The markdown string to convert
 * @param options Options to customize conversion
 * @returns HTML string
 * @throws {ConversionError} If markdown conversion fails
 */
export async function markdownToHtmlWithOptions(
  markdown: string,
  options: Partial<typeof marked.options>
): Promise<string> {
  if (!markdown) {
    return '';
  }

  const defaultOptions = {
    gfm: true,
    breaks: true,
  };

  try {
    // Apply custom options while preserving defaults
    marked.setOptions({ ...defaultOptions, ...options });
    return await marked(markdown);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new ConversionError(`Failed to convert Markdown to HTML: ${errorMessage}`);
  } finally {
    // Reset to default options
    marked.setOptions(defaultOptions);
  }
}