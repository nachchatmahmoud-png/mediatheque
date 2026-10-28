import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {keywordCatalog,documentaryTopics,keywordMatchesTopic,canonicalKeyword,normalizeKeyword,validateDocumentaryKeywords,preferredKeywordTopic,suggestKeywords} from '../app/lib/keyword-catalog.ts';
import {preparePublication} from '../administration/server/publication.ts';
import {publicationToCatalogue} from '../github-pages/catalogue.ts';
import {filterMedia} from '../app/lib/model.ts';
const habitat='Habitat et logement',life='Vie institutionnelle';

test('organizations use one bilingual descriptor across their associated domains',()=>{
 const organizations=keywordCatalog.filter(term=>term.kind==='organization');assert.equal(organizations.length,13);
 for(const term of organizations){assert.equal(canonicalKeyword(term.arabic),term.label);assert.ok([term.topic,...term.relatedTopics].every(topic=>documentaryTopics.includes(topic)));assert.ok(term.label.length<=80);}
 const omrane=organizations.find(term=>term.label==='Groupe Al Omrane');
 for(const topic of [habitat,life,'Urbanisme et planification urbaine'])assert.equal(keywordMatchesTopic(omrane,topic),true);
 assert.equal(keywordMatchesTopic(omrane,'Interventions et questions parlementaires'),false);
 assert.equal(canonicalKeyword('العمران'),omrane.label);assert.equal(canonicalKeyword('Alomrane'),omrane.label);
 assert.equal(preferredKeywordTopic(['Al Omrane']),null);
 assert.ok(suggestKeywords({topic:life,text:'',query:'العمران'}).includes(omrane.label));
 assert.throws(()=>validateDocumentaryKeywords(habitat,['Groupe Al Omrane']),/domaine principal/);
 assert.deepEqual(validateDocumentaryKeywords(life,['Conseils de surveillance','العمران']),['Conseils de surveillance','Groupe Al Omrane']);
});

test('the shared publication pipeline preserves organizations and searches by Arabic name or acronym',async()=>{
 const prepared=await preparePublication({requestId:'12345678-1234-4234-8234-123456789abc',type:'press',title:'Conseil de surveillance',date:'2026-10-28',topic:life,language:'fr',keywords:['Conseils de surveillance','Al Omrane'],content:'Réunion du conseil.',translations:{fr:{title:'Conseil de surveillance',content:'Réunion du conseil.'},ar:{title:'مجلس الرقابة',content:'اجتماع المجلس.'}}},'00000000-0000-4000-8000-000000000001',async()=>null);
 const catalogue=publicationToCatalogue(prepared.record,prepared.folder);assert.equal(catalogue.items.length,2);
 for(const query of ['Alomrane','مجموعة العمران','العمران','HAO'])assert.equal(filterMedia(catalogue.items,{type:'all',query,year:'',topic:'',sort:'newest'}).length,2);
 for(const item of catalogue.items)assert.deepEqual(item.keywords,['Conseils de surveillance','Groupe Al Omrane']);
});

test('the editor presents relevant organizations separately and selects them only after a click',async()=>{
 const source=await readFile(new URL('../interface/documentary.js',import.meta.url),'utf8');
 const render=(topic,value=[],query='')=>{const selections=[];const h=(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity).filter(Boolean)});
  const context=vm.createContext({mxElement:h,O:{Fragment:'fragment',useState:initial=>[typeof initial==='string'?query:initial,()=>{}],useEffect(){}},MX_DOC_RUNTIME:{keywordCatalog,keywordMatchesTopic,normalizeKeyword}});vm.runInContext(source,context);
  const tree=context.MxDocumentaryFields({topic,value,onChange:next=>selections.push(next)});
  const nodes=tree=>[tree,...tree.children.flatMap(child=>typeof child==='object'?nodes(child):[])];
  const group=nodes(tree).find(node=>node.props['aria-label']==='Institutions et partenaires');
  return {tree,nodes,group,selections};
 };
 for(const topic of [habitat,life]){const f=render(topic);assert.ok(f.group);assert.equal(f.selections.length,0);const choice=f.nodes(f.group).find(node=>node.props['aria-label']==='Ajouter le mot-clé Groupe Al Omrane');assert.ok(choice);choice.props.onClick();assert.equal(f.selections[0][0],'Groupe Al Omrane');}
 const arabic=render(habitat,[],'العمران');assert.ok(arabic.group);assert.equal(arabic.nodes(arabic.group).filter(node=>node.type==='button').length,1);
 const full=render(habitat,Array.from({length:8},(_,index)=>'selected-'+index));assert.ok(full.nodes(full.group).filter(node=>node.type==='button').every(node=>node.props.disabled));
});
