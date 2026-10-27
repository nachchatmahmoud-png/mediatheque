import test from 'node:test';
import assert from 'node:assert/strict';
import {documentaryTopics,keywordCatalog,documentaryTranslations,validateDocumentaryKeywords,parseKeywordText,preferredKeywordTopic} from '../app/lib/keyword-catalog.ts';
import {preparePublication} from '../administration/server/publication.ts';
import {publicationToCatalogue} from '../github-pages/catalogue.ts';
import {filterMedia} from '../app/lib/model.ts';

const housing='Habitat et logement',urbanism='Urbanisme et planification urbaine';
const base={requestId:'12345678-1234-4234-8234-123456789abc',type:'press',title:'Aide au logement',date:'2026-10-27',topic:housing,language:'fr',content:'Modalités du programme',keywords:['Daam Sakane','Logement social']};
const account='00000000-0000-4000-8000-000000000001';

test('documentary domains describe subjects and each descriptor has an Arabic label',()=>{
 for(const context of ['Vie institutionnelle','Parlement','Coopération et partenariats'])assert.equal(documentaryTopics.includes(context),false);
 for(const generic of ['Visite de terrain','Réunion de coordination','Gouvernance','Communication institutionnelle'])assert.equal(keywordCatalog.some(term=>term.label===generic),false);
 assert.equal(new Set(keywordCatalog.map(term=>term.label)).size,keywordCatalog.length);
 assert.ok(keywordCatalog.every(term=>documentaryTopics.includes(term.topic)&&/\p{Script=Arabic}/u.test(documentaryTranslations[term.label])));
});

test('synonyms and Arabic terms resolve to one descriptor, while broad labels are rejected',()=>{
 assert.deepEqual(validateDocumentaryKeywords(housing,['Daamsakane','دعم السكن','Logement social']),['Aide directe au logement','Logement social']);
 assert.deepEqual(parseKeywordText('Daam Sakane; دعم السكن; SDAU'),['Aide directe au logement','Schéma directeur d’aménagement urbain']);
 assert.equal(preferredKeywordTopic(['VSB','Logement social']),housing);
 assert.throws(()=>validateDocumentaryKeywords(housing,[]),/1 à 8/);
 assert.throws(()=>validateDocumentaryKeywords(housing,[housing]),/référentiel/);
 assert.throws(()=>validateDocumentaryKeywords(housing,['Réunion de coordination']),/référentiel/);
 assert.throws(()=>validateDocumentaryKeywords(housing,['SDAU']),/domaine principal/);
 assert.deepEqual(validateDocumentaryKeywords(housing,['Logement social','SDAU']),['Logement social','Schéma directeur d’aménagement urbain']);
 assert.throws(()=>validateDocumentaryKeywords(urbanism,keywordCatalog.filter(term=>term.topic===urbanism).slice(0,9).map(term=>term.label)),/1 à 8/);
});

test('publication preserves the selected descriptors instead of replacing them with the domain',async()=>{
 const prepared=await preparePublication(base,account,async()=>null);
 assert.deepEqual(prepared.record.keywords,['Aide directe au logement','Logement social']);
 const catalogue=publicationToCatalogue(prepared.record,prepared.folder);
 for(const query of ['Daam Sakane','دعم السكن','logement social'])assert.equal(filterMedia(catalogue.items,{type:'all',query,year:'',topic:'',sort:'newest'}).length,1);
 for(const keywords of [undefined,[],['Vie institutionnelle'],[housing],['SDAU']])await assert.rejects(preparePublication({...base,keywords},account,async()=>null));
});

test('one bilingual video keeps its subject descriptors in both language records',async()=>{
 const translations={fr:{title:'Aide directe au logement'},ar:{title:'الدعم المباشر للسكن'}};
 const prepared=await preparePublication({...base,type:'video',content:'',spokenLanguage:'ar',mediaUrl:'https://www.youtube.com/watch?v=abcdefghijk',translations},account,async()=>null);
 const catalogue=publicationToCatalogue(prepared.record,prepared.folder);
 assert.equal(catalogue.items.length,2);
 for(const item of catalogue.items){assert.equal(item.topic,housing);assert.deepEqual(item.keywords,['Aide directe au logement','Logement social']);}
 assert.deepEqual(catalogue.items[1].keywords.map(term=>documentaryTranslations[term]),['الدعم المباشر للسكن','السكن الاجتماعي']);
});

test('parliamentary replies retain their parliamentary form and the ministerial subject addressed',async()=>{
 const topic='Interventions et questions parlementaires';
 const keywords=['Réponse à une question orale','Aide directe au logement'];
 assert.ok(documentaryTopics.includes(topic));
 assert.deepEqual(validateDocumentaryKeywords(topic,keywords),['Réponses aux questions orales','Aide directe au logement']);
 assert.deepEqual(validateDocumentaryKeywords(housing,keywords),['Réponses aux questions orales','Aide directe au logement']);
 const prepared=await preparePublication({...base,topic,keywords},account,async()=>null);
 const catalogue=publicationToCatalogue(prepared.record,prepared.folder);
 for(const query of ['questions orales','aide au logement','الأسئلة الشفهية'])assert.equal(filterMedia(catalogue.items,{type:'all',query,year:'',topic:'',sort:'newest'}).length,1);
 assert.equal(documentaryTranslations['Réponses aux questions écrites'],'الأجوبة عن الأسئلة الكتابية');
});
