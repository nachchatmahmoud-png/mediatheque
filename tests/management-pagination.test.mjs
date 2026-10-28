import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../interface/components.js',import.meta.url),'utf8');
function fixture(){
 const states=[],dependencies=[],effects=[];let cursor=0,changed=false;
 const h=(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity).filter(Boolean)});
 const runtime={useState(initial){const index=cursor++;if(!(index in states))states[index]=typeof initial==='function'?initial():initial;return [states[index],next=>{const value=typeof next==='function'?next(states[index]):next;if(value!==states[index]){states[index]=value;changed=true;}}];},useEffect(callback,deps){const index=cursor++;if(!dependencies[index]||deps.some((value,i)=>value!==dependencies[index][i])){dependencies[index]=deps;effects.push(callback);}},useRef(){const index=cursor++;return states[index]??=( {current:null});},Fragment:'fragment'};
 const context=vm.createContext({O:runtime,mxElement:h,URLSearchParams,window:{location:{search:''}},mxManagementClient:()=>({current:()=>({})}),MxTestAdministration:null,mxPlural:(n,word)=>n+' '+word,mxT:s=>s,Ea:s=>s.toLowerCase(),nu:{video:'Vidéo'},Ya:s=>s,MxPublicationTrash(){},MxPublicationCorrection(){}});
 vm.runInContext(source.slice(source.indexOf('function MxPublishedList('),source.indexOf('function MxPublicationCorrection(')),context);
 let items=Array.from({length:25},(_,i)=>({id:'item-'+i,title:'Publication '+String(i+1).padStart(2,'0'),date:'2026-10-28',language:'fr',status:'published',type:'video',topic:'Habitat',keywords:[]}));
 const render=()=>{let tree;for(let i=0;i<4;i++){cursor=0;changed=false;tree=context.MxPublishedList({items,onOpen(){},onRefresh(){}});while(effects.length)effects.shift()();if(!changed)return tree;}throw Error('Unstable render');};
 const nodes=tree=>[tree,...tree.children.flatMap(child=>typeof child==='object'?nodes(child):[])];
 const button=(tree,label)=>nodes(tree).find(node=>node.type==='button'&&node.children.includes(label));
 return {render,nodes,button,setItems:next=>items=next};
}
test('management pagination reaches every result and resets when the search changes',()=>{
 const f=fixture();let tree=f.render();const rows=()=>f.nodes(tree).filter(node=>node.type==='article');
 assert.equal(rows().length,10);assert.equal(f.button(tree,'Précédente').props.disabled,true);
 f.button(tree,'Suivante').props.onClick();tree=f.render();assert.equal(rows().length,10);assert.equal(rows()[0].children[0].children[1].children[0],'Publication 11');
 f.button(tree,'Suivante').props.onClick();tree=f.render();assert.equal(rows().length,5);assert.equal(f.button(tree,'Suivante').props.disabled,true);
 f.nodes(tree).find(node=>node.type==='input'&&node.props.type==='search').props.onChange({target:{value:'Publication 01'}});tree=f.render();assert.equal(rows().length,1);assert.equal(f.button(tree,'Précédente').props.disabled,true);assert.equal(f.button(tree,'Suivante').props.disabled,true);
});
