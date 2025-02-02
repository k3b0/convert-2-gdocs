import { GoogleDocConverter } from '../src';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

async function main() {
  // Example markdown content
  const markdown = `
# My Document

This is a paragraph with **bold** and *italic* text.

## Lists

Unordered list:
- Item 1
- Item 2
  - Nested item
- Item 3

Ordered list:
1. First item
2. Second item
3. Third item

## Table

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
`;

  try {
    // Initialize the converter
    const converter = new GoogleDocConverter({
      defaultTextStyle: {
        fontSize: { magnitude: 11, unit: 'PT' },
        weightedFontFamily: { fontFamily: 'Arial' }
      }
    });

    // Convert markdown to Google Docs requests
    console.log('Converting markdown to Google Docs requests...');
    const requests = await converter.convertMarkdown(markdown);

    // Initialize Google Docs API
    const auth = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: 'http://localhost'
    });

    // Set credentials (you would need to implement OAuth2 flow to get these)
    auth.setCredentials({
      access_token: process.env.GOOGLE_ACCESS_TOKEN,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    const docs = google.docs({ version: 'v1', auth });

    // Create a new document
    console.log('Creating new Google Doc...');
    const document = await docs.documents.create({
      requestBody: {
        title: 'Generated from Markdown'
      }
    });

    const documentId = document.data.documentId;
    if (!documentId) {
      throw new Error('Failed to create document');
    }

    // Create batch update request
    const batchUpdateRequest = GoogleDocConverter.createBatchUpdateRequest(
      documentId,
      requests
    );

    // Apply the updates
    console.log('Applying updates to document...');
    await docs.documents.batchUpdate({
      documentId,
      requestBody: batchUpdateRequest
    });

    console.log(`Document created successfully! ID: ${documentId}`);
    console.log(`View it at: https://docs.google.com/document/d/${documentId}/edit`);

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

// Example of converting HTML directly
function htmlExample() {
  const converter = new GoogleDocConverter();
  
  const html = `
<h1>My Document</h1>
<p>This is a paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
<h2>Lists</h2>
<ul>
  <li>Item 1</li>
  <li>Item 2
    <ul>
      <li>Nested item</li>
    </ul>
  </li>
  <li>Item 3</li>
</ul>
`;

  const requests = converter.convertHtml(html);
  console.log('Generated requests:', JSON.stringify(requests, null, 2));
}

// Run the examples
if (require.main === module) {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    main().catch(console.error);
  } else {
    console.log('Running HTML example (no Google credentials provided)...');
    htmlExample();
  }
}