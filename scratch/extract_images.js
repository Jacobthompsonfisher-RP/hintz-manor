const fs = require('fs');
const path = require('path');

const mapsDir = 'src/assets/maps';
const files = ['Hintz1f', 'Hintz2fa', 'HintzBasement', 'HintzRoof'];

for (const name of files) {
  const jsonPath = path.join(mapsDir, `${name}.dd2vtt`);
  const pngPath = path.join(mapsDir, `${name}.png`);
  
  if (fs.existsSync(jsonPath)) {
    console.log(`Extracting image for ${name}...`);
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (data.image) {
      const base64Data = data.image.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(pngPath, buffer);
      console.log(`Saved ${pngPath} (${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`);
    }
  }
}
