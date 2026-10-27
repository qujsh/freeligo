const {chromium}=require('/Users/mainto/frontfile/freeligo/node_modules/playwright');
const fs=require('fs'); const path=require('path');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage({deviceScaleFactor:2});
for(const f of fs.readdirSync(path.join(__dirname,'images')).filter(f=>f.endsWith('.svg'))){await p.goto('file://'+path.join(__dirname,'images',f));let z=await p.locator('svg').boundingBox();await p.setViewportSize({width:1080,height:Math.ceil(z.height)});await p.locator('svg').screenshot({path:path.join(__dirname,'images',f.replace('.svg','.png'))});}await b.close();})();
