import fs from 'fs';
import path from 'path';

const source = 'SVG - Call to action banner image.svg';
const target = 'public/images/SVG - Call to action banner image.svg';

if (fs.existsSync(source)) {
  fs.copyFileSync(source, target);
  console.log('File copied successfully');
} else {
  console.error('Source file not found');
}
