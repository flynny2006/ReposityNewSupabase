
export const SUPABASE_URL = 'https://ntateovfmppjmpljjict.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50YXRlb3ZmbXBwam1wbGpqaWN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3OTY4OTIsImV4cCI6MjA2NTM3Mjg5Mn0.5JTAqC7VPuaL8trpeAUqHX7Hm0q8ZfjRVPDXgp-iefg';

export const DEFAULT_FILES = {
  'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Awesome Site</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body class="bg-gray-100 text-gray-800">
    <div class="container mx-auto p-4 text-center">
        <h1 class="text-4xl font-bold text-blue-600">Hello, World!</h1>
        <p class="mt-2 text-lg">This is my QuickHost site.</p>
        <img src="https://picsum.photos/400/200" alt="Placeholder Image" class="mx-auto my-4 rounded shadow-lg">
        <button id="myButton" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700">Click Me</button>
    </div>
    <script src="script.js"></script>
</body>
</html>`,
  'styles.css': `body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    padding: 0;
    line-height: 1.6;
}

.container {
    max-width: 800px;
}

/* Example: Add Tailwind-like utility directly if needed, or rely on Tailwind in preview */
/* For this setup, Tailwind on main app won't affect iframe content unless explicitly added to index.html template */
`,
  'script.js': `console.log("Site script loaded!");

document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('myButton');
    if (button) {
        button.addEventListener('click', () => {
            alert('Button clicked!');
        });
    }
});
`,
};

export const NEW_SITE_COST = 5; // Credits
export const CREDIT_INTERVAL_MS = 5000; // 5 seconds
export const CREDIT_INCREMENT = 1;
