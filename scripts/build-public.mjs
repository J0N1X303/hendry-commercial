import {cp,mkdir,copyFile} from 'node:fs/promises';
// Publish only web assets. Server modules, beta code and project files stay out.
await mkdir('dist',{recursive:true});
for(const file of ['index.html','styles.css','script.js','robots.txt','sitemap.xml','_headers','404.html',
 'buyer-readiness-check-social-hd.png','buyer-readiness-check-social-v3.jpg','buyer-readiness-check-social.svg',
 'linkedin-preview-hd-20260923-v2.png','social-preview.svg'])await copyFile(file,'dist/'+file);
for(const dir of ['assets','check','before-they-call-you'])await cp(dir,'dist/'+dir,{recursive:true});
await mkdir('dist/casey',{recursive:true});
for(const file of ['index.html','casey.js','casey.css'])await copyFile('casey/'+file,'dist/casey/'+file);
console.log('Built public web assets in dist; server modules and beta files excluded.');
