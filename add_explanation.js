const fs = require('fs');

const filePath = './src/data/examQuestions.ts';
let content = fs.readFileSync(filePath, 'utf8');

// "answer": "X" 또는 "answer": ["X", "Y"] 뒤에 explanation이 없으면 추가
content = content.replace(
  /"answer":\s*"[A-F]"\s*\n(\s*)\}/g,
  (match, indent) => match.slice(0, -indent.length - 1) + `,\n${indent}"explanation": ""\n${indent}}`
);

content = content.replace(
  /"answer":\s*\[[^\]]+\]\s*\n(\s*)\}/g,
  (match, indent) => match.slice(0, -indent.length - 1) + `,\n${indent}"explanation": ""\n${indent}}`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ explanation 필드 추가 완료!');
