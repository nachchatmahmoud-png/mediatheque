import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const portal=await readFile(new URL('../interface/portal.js',import.meta.url),'utf8');
const helpers=await readFile(new URL('../interface/components.js',import.meta.url),'utf8');
const base=await readFile(new URL('../site/assets/app.js',import.meta.url),'utf8');
const messages=JSON.parse(await readFile(new URL('../interface/translations-ar.json',import.meta.url),'utf8'));
const filterSource=base.slice(base.indexOf('function gg('),base.indexOf('function hg('));
const paginationSource=helpers.slice(helpers.indexOf('function MxCataloguePagination('),helpers.indexOf('function MxCatalogueFilters('));

function fixture(language='fr'){
  const states=[],memos=[],dependencies=[],cleanups=[],effects=[];
  let cursor=0,changed=false;
  const same=(left,right)=>left&&right&&left.length===right.length&&right.every((value,index)=>Object.is(value,left[index]));
  const runtime={
    useState(initial){const index=cursor++;if(!(index in states))states[index]=typeof initial==='function'?initial():initial;return [states[index],next=>{const value=typeof next==='function'?next(states[index]):next;if(!Object.is(value,states[index])){states[index]=value;changed=true;}}];},
    useRef(initial){const index=cursor++;return states[index]??={current:initial};},
    useMemo(callback,deps){const index=cursor++;if(!memos[index]||!same(memos[index].deps,deps))memos[index]={deps,value:callback()};return memos[index].value;},
    useCallback(callback,deps){return runtime.useMemo(()=>callback,deps);},
    useEffect(callback,deps){const index=cursor++;if(!same(dependencies[index],deps)){dependencies[index]=deps;effects.push(()=>{cleanups[index]?.();cleanups[index]=callback();});}}
  };
  const items=['fr','ar'].flatMap(locale=>Array.from({length:56},(_,index)=>({id:locale+'-'+(index+1),title:(locale==='fr'?'Publication ':'منشور ')+String(index+1).padStart(2,'0'),date:index<50?'2026-10-29':'2025-10-29',language:locale,status:'published',type:index<30?'photo':'video',topic:index<30?'Habitat':'Urbanisme',keywords:[]})));
  items.push({...items[0],id:'unpublished',status:'draft'});
  const location=new URL('https://example.test/mediatheque/'+language+'/');
  const names=['MxLanguageSwitch','Wi','du','$t','Oe','xa','$i','kl','MxHeroSearch','af','Oo','MxLatestPublications','Bo','Ta','pa','ma','MxCatalogueFilters','tu','Ji','ji','vt','Dl','su','au','wl'];
  const context=vm.createContext({O:runtime,$n:{authenticated:false},Ws:{ministryName:'Ministère'},MX_LOCALE:language,MxTestAdministration:null,el:['Habitat','Urbanisme'],nu:{video:'Vidéothèque',photo:'Photothèque',press:'Espace médias'},CL:{},URL,URLSearchParams,AbortController,window:{location,addEventListener(){},removeEventListener(){},scrollTo(){}},history:{replaceState(){}},document:{getElementById:()=>({scrollIntoView(){}})},setTimeout:()=>1,clearTimeout(){},mxStorage:{get:()=>null},mxT:value=>language==='ar'?(messages[value]||value):value,mxPlural:(number,word)=>number+' '+(language==='ar'?'منشورات':word+(number===1?'':'s')),Ea:value=>String(value).toLowerCase(),Eo:item=>[item.title,item.topic,...item.keywords].join(' '),Ho:async path=>path==='/api/auth/session'?{authenticated:false}:{items,settings:{ministryName:'Ministère'},isAdmin:false},...Object.fromEntries(names.map(name=>[name,()=>null]))});
  const jsx=(type,props={})=>type===context.MxCataloguePagination?type(props):({type,props,children:[props.children].flat(Infinity).filter(child=>child!==null&&child!==undefined&&child!==false)});
  context.d={jsx,jsxs:jsx,Fragment:'fragment'};
  context.mxElement=(type,props,...children)=>jsx(type,{...props,...(children.length?{children}: {})});
  vm.runInContext(filterSource+'\n'+paginationSource+'\n'+portal,context);
  const render=async()=>{for(let attempt=0;attempt<10;attempt++){cursor=0;changed=false;const tree=context.rf();while(effects.length)effects.shift()();await Promise.resolve();await Promise.resolve();await Promise.resolve();if(!changed)return tree;}throw Error('Unstable portal render');};
  const nodes=tree=>tree&&typeof tree==='object'?[tree,...tree.children.flatMap(nodes)]:[];
  const cards=tree=>nodes(tree).filter(node=>node.type===context.su);
  const nav=tree=>nodes(tree).find(node=>node.props.className==='mx-catalog-pagination');
  const button=(tree,label)=>nodes(tree).find(node=>node.type==='button'&&node.children.includes(label));
  const filters=tree=>nodes(tree).find(node=>node.type===context.MxCatalogueFilters).props;
  return {render,nodes,cards,nav,button,filters,next:language==='ar'?'التالية':'Suivante',previous:language==='ar'?'السابقة':'Précédente'};
}

test('public catalogue pages contain at most 25 publications with every result reachable in French and Arabic',async()=>{
  for(const language of ['fr','ar']){
    const f=fixture(language);let tree=await f.render();
    const seen=[];
    assert.equal(f.button(tree,f.previous).props.disabled,true);
    for(const [page,size] of [[1,25],[2,25],[3,6]]){
      assert.equal(f.cards(tree).length,size);
      assert.equal(f.nav(tree).children[1].children[0],(language==='ar'?'الصفحة':'Page')+' '+page+' / 3 · 56 '+(language==='ar'?'منشورات':'publications'));
      seen.push(...f.cards(tree).map(node=>node.props.item.id));
      if(page<3){f.button(tree,f.next).props.onClick();tree=await f.render();}
    }
    assert.equal(f.button(tree,f.next).props.disabled,true);
    assert.equal(new Set(seen).size,56);
    assert.deepEqual(seen,Array.from({length:56},(_,index)=>language+'-'+(index+1)));
    f.button(tree,f.previous).props.onClick();tree=await f.render();
    assert.equal(f.cards(tree).length,25);assert.equal(f.cards(tree)[0].props.item.id,language+'-26');
    assert.equal(f.nodes(tree).some(node=>node.children.includes('Voir plus de publications')),false);
  }
});

test('public catalogue returns to page one after search, year, domain, type or sort changes',async()=>{
  const cases=[
    {change:(f,tree)=>f.filters(tree).onQuery('Publication 56'),size:1,first:'fr-56'},
    {change:(f,tree)=>f.filters(tree).onYear('2025'),size:6,first:'fr-51'},
    {change:(f,tree)=>f.filters(tree).onTopic('Habitat'),size:25,first:'fr-1'},
    {change:(f,tree)=>f.button(tree,'Vidéothèque').props.onClick(),size:25,first:'fr-31'},
    {change:(f,tree)=>f.nodes(tree).find(node=>node.type==='select'&&node.props['aria-label']==='Trier les publications').props.onChange({target:{value:'oldest'}}),size:25,first:'fr-51'}
  ];
  for(const entry of cases){
    const f=fixture();let tree=await f.render();
    for(let page=1;page<3;page++){f.button(tree,f.next).props.onClick();tree=await f.render();}
    entry.change(f,tree);tree=await f.render();
    assert.equal(f.cards(tree).length,entry.size);assert.equal(f.cards(tree)[0].props.item.id,entry.first);
    assert.equal(f.button(tree,f.previous).props.disabled,true);
  }
});
