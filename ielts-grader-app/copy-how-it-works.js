import fs from 'fs';
import path from 'path';

const mappings = [
  { src: 'Index Images/Background+Border+Shadow.png', dest: 'public/images/how-it-works/step1-v2.png' },
  { src: 'Index Images/Background+Border+Shadow-1.png', dest: 'public/images/how-it-works/step2-v2.png' },
  { src: 'Index Images/Background+Border+Shadow-2.png', dest: 'public/images/how-it-works/step3-v2.png' }
];

mappings.forEach(m => {
  if (fs.existsSync(m.src)) {
    fs.copyFileSync(m.src, m.dest);
    console.log(`Copied ${m.src} to ${m.dest}`);
  } else {
    console.error(`Source not found: ${m.src}`);
  }
});
