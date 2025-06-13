
import React from 'react';
import Editor from 'react-simple-code-editor';
// import { highlight, languages } from 'prismjs/components/prism-core'; // Old import
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup'; // For HTML
// Import a theme for PrismJS. You can choose from 'prismjs/themes/prism-okaidia.css' etc.
// For this setup, we'll use a simple custom style to match dark mode.

interface CodeEditorProps {
  value: string;
  onValueChange: (value: string) => void;
  language: 'html' | 'css' | 'javascript';
  height?: string;
}

// Minimal theme for PrismJS dark mode
const prismThemeStyle = `
.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
	color: slategray;
}

.token.punctuation {
	color: #999;
}

.token.namespace {
	opacity: .7;
}

.token.property,
.token.tag,
.token.boolean,
.token.number,
.token.constant,
.token.symbol,
.token.deleted {
	color: #905;
}

.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted {
	color: #690;
}

.token.operator,
.token.entity,
.token.url,
.language-css .token.string,
.style .token.string {
	color: #a67f59;
}

.token.atrule,
.token.attr-value,
.token.keyword {
	color: #07a;
}

.token.function,
.token.class-name {
	color: #DD4A68;
}

.token.regex,
.token.important,
.token.variable {
	color: #e90;
}

.token.important,
.token.bold {
	font-weight: bold;
}
.token.italic {
	font-style: italic;
}

.token.entity {
	cursor: help;
}
`;


const CodeEditor: React.FC<CodeEditorProps> = ({ value, onValueChange, language, height = '400px' }) => {
  const getPrismGrammar = () => {
    switch (language) {
      case 'html': return Prism.languages.markup;
      case 'css': return Prism.languages.css;
      case 'javascript': return Prism.languages.javascript;
      default: return Prism.languages.clike; // fallback
    }
  };
  
  return (
    <>
      <style>{prismThemeStyle}</style>
      <div className="bg-gray-900 border border-gray-700 rounded-md overflow-hidden" style={{ height }}>
        <Editor
          value={value}
          onValueChange={onValueChange}
          highlight={code => {
            const grammar = getPrismGrammar();
            if (grammar) {
              return Prism.highlight(code, grammar, language);
            }
            return code; // Fallback if grammar not found
          }}
          padding={10}
          className="font-mono text-sm !bg-gray-950 !text-gray-200 outline-none"
          style={{
            fontFamily: '"Fira Code", "Fira Mono", monospace',
            fontSize: 14,
            minHeight: height,
          }}
          textareaClassName="focus:outline-none"
        />
      </div>
    </>
  );
};

export default CodeEditor;
