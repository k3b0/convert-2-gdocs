import { GoogleDocConverter } from '../dist/index.js';

// Example of converting HTML to test the build
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

// Run the example
htmlExample();