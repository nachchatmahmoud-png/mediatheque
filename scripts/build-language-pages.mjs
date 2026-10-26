import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';

export async function buildLanguagePages(root,output,{service=false}={}){
 const template=await readFile(join(root,'site/index.html'),'utf8');
 const pages={};
 const revision=createHash('sha256').update(await readFile(join(output,'assets/app-fr.js'))).update(await readFile(join(output,'assets/app-ar.js'))).digest('hex').slice(0,16);
 for(const language of ['fr','ar']){
  let html=template.replace('<head>','<head><base href="../">'+(service?'<meta name="mediatheque-service" content="enabled">':'')+'<link rel="alternate" hreflang="fr" href="fr/"><link rel="alternate" hreflang="ar" href="ar/">').replace('lang="fr"','lang="'+language+'" dir="'+(language==='ar'?'rtl':'ltr')+'"').replace('./assets/app.js','./assets/app-'+language+'.js');
  html=html.replace(/(\.\/assets\/[a-z-]+\.(?:js|css))"/g,'$1?v='+revision+'"');
  if(language==='ar')html=html.replace(/<title>.*?<\/title>/,'<title>المكتبة الإعلامية | الوزارة</title>').replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="أشرطة الفيديو والصور والبلاغات الصحفية لوزارة إعداد التراب الوطني والتعمير والإسكان وسياسة المدينة.">').replace('Activez JavaScript pour consulter et rechercher les publications de la médiathèque.','يرجى تفعيل جافاسكريبت للاطلاع على منشورات المكتبة الإعلامية والبحث فيها.');
  await mkdir(join(output,language),{recursive:true});await writeFile(join(output,language,'index.html'),html);pages[language]=html;
 }
 await writeFile(join(output,'index.html'),'<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=fr/"><title>Médiathèque</title></head><body><nav aria-label="Langue"><a href="fr/" lang="fr">Français</a> · <a href="ar/" lang="ar" dir="rtl">العربية</a></nav><script>const page=new URL("./fr/",location.href);page.search=location.search;page.hash=location.hash;location.replace(page);</script></body></html>');
 return pages;
}
