'use strict';
const $=s=>document.querySelector(s), key='oidc-lab-v1', txkey='oidc-lab-transaction';
const specs=[['authorize','Authorize URI','認証を始める URL','https://your-issuer.example/authorize','認証サービスの authorization_endpoint を入力します。',true],['redirect','Redirect URI','認証後の戻り先',location.origin+location.pathname,'認証サービスに登録した URI と完全に一致させてください。',true],['client','Client ID','アプリの識別子','your-client-id','認証サービスで発行された公開の識別子です。Client Secret とは異なります。',true],['scope','Scope','要求する情報・権限','openid profile email','openid は必須です。追加の scope は半角スペースで区切ります。',true],['state','State','リクエストと応答の照合','','送信した値と応答の値を照合します。テストでは test などの固定値も使えます。通常はランダムな値を使ってください。',false],['nonce','Nonce','ID トークンとの照合','','認証リクエストと ID トークンを結び付けるランダムな値です。',false]];
for(const [id,title,ja,placeholder,help,required] of specs){const div=document.createElement('div');div.className='field';div.innerHTML=`<label for="${id}">${title}<small>${ja}</small>${required?'<span class="required">必須</span>':''}</label><input id="${id}" ${required?'required':''} spellcheck="false"><p class="help">${help}</p>`;$('#fields').append(div);$('#'+id).placeholder=placeholder;}
function b64(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function random(){return b64(crypto.getRandomValues(new Uint8Array(32)));}
function readStore(k){try{return JSON.parse(sessionStorage.getItem(k)||'null');}catch{return null;}}
function writeStore(k,v){sessionStorage.setItem(k,JSON.stringify(v));}
let saved=readStore(key);for(const [id] of specs)$('#'+id).value=saved?.[id]??({redirect:location.origin+location.pathname,scope:'openid profile email',state:random(),nonce:random()}[id]||'');
$('#verifier').value=saved?.verifier||random();$('#mode').value=saved?.mode||'query';$('#pkce').checked=saved?.pkce??true;
if(saved?.types)document.querySelectorAll('[name=response]').forEach(e=>e.checked=saved.types.includes(e.value));
function types(){return [...document.querySelectorAll('[name=response]:checked')].map(e=>e.value);}
async function challenge(v){return b64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))));}
function endpoint(value){let u;try{u=new URL(value);}catch{throw Error('URL を正しく入力してください。');}if(u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)))throw Error('HTTPS の URL を入力してください（localhost は HTTP も使えます）。');if(u.username||u.password||u.hash)throw Error('URL にユーザー情報や # を含めることはできません。');return u;}
let revision=0,currentURL='';
async function update(){const rev=++revision;const v=$('#verifier').value;const c=await challenge(v);if(rev!==revision)return;$('#challenge').value=c;$('#pkcefields').hidden=!$('#pkce').checked;const data=Object.fromEntries(specs.map(([id])=>[id,$('#'+id).value.trim()]));Object.assign(data,{verifier:v,mode:$('#mode').value,pkce:$('#pkce').checked,types:types()});try{writeStore(key,data);}catch{}let url;try{url=new URL(data.authorize||'https://your-issuer.example/authorize');}catch{currentURL='';$('#preview').textContent='Authorize URI を入力すると、URL を表示します。';return;}for(const k of ['client_id','redirect_uri','scope','response_type','response_mode','state','nonce','code_challenge','code_challenge_method'])url.searchParams.delete(k);for(const [k,value] of Object.entries({client_id:data.client,redirect_uri:data.redirect,scope:data.scope,response_type:data.types.join(' '),response_mode:data.mode,state:data.state,nonce:data.nonce,...(data.pkce?{code_challenge:c,code_challenge_method:'S256'}:{})}))if(value)url.searchParams.set(k,value);currentURL=url.href;$('#preview').textContent=url.origin+url.pathname+'\n?'+[...url.searchParams].map(([k,v])=>k+'='+encodeURIComponent(v)).join('\n&');return data;}
$('#request').addEventListener('input',()=>{update().catch(e=>$('#error').textContent=e.message);});
$('#regen').onclick=()=>{$('#verifier').value=random();update();};
$('#demo').onclick=()=>{$('#authorize').value='https://your-issuer.example/authorize';$('#client').value='your-client-id';$('#scope').value='openid profile email';$('#state').value=random();$('#nonce').value=random();update();$('#error').textContent='サンプルは入力例です。Authorize URI と Client ID を実際の値に変更してください。';};
$('#copy').onclick=async()=>{try{const d=await update();if(!currentURL||!d)throw Error();endpoint(d.authorize);endpoint(d.redirect);await navigator.clipboard.writeText(currentURL);writeStore(txkey,{...d,time:Date.now(),used:false});$('#copy').textContent='コピーしました ✓';setTimeout(()=>$('#copy').textContent='URL をコピー ⧉',2000);}catch{$('#error').textContent='コピーできませんでした。プレビューから選択してコピーしてください。';}};
$('#request').onsubmit=async e=>{e.preventDefault();try{const d=await update();endpoint(d.authorize);endpoint(d.redirect);if(new URL(d.authorize).hostname.endsWith('.example')||d.client==='your-client-id')throw Error('サンプルの URL と Client ID を実際の値に変更してください。');if(!types().length)throw Error('Response type を選んでください。');if(!d.scope.split(/\s+/).includes('openid'))throw Error('Scope に openid を含めてください。');if(!d.state)throw Error('State を入力してください。');if(types().includes('id_token')&&!d.nonce)throw Error('id_token を要求する場合は Nonce が必要です。');if(types().some(t=>t==='id_token'||t==='token')&&d.mode==='query')throw Error('トークンを直接受け取る場合は fragment を選んでください。');if(d.pkce&&!types().includes('code'))throw Error('PKCE を使う場合は code を選んでください。');if(d.pkce&&!/^[A-Za-z0-9._~-]{43,128}$/.test(d.verifier))throw Error('Code verifier は43〜128文字の英数字、- . _ ~ で入力してください。');writeStore(txkey,{...d,time:Date.now(),used:false});location.assign(currentURL);}catch(err){$('#error').textContent=err.message;}};
function decodeJWT(t){try{const parts=t.split('.');if(parts.length!==3)return 'JWT 形式ではありません。';let s=parts[1].replace(/-/g,'+').replace(/_/g,'/');s+='='.repeat((4-s.length%4)%4);return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s),c=>c.charCodeAt(0))));}catch{return 'JWT をデコードできません。';}}
let parsed=null,matched=false;
function showResponseStatus(kind,title,detail){
  const status=$('#response-status');
  status.hidden=false;
  status.className='response-status '+kind;
  $('#response-title').textContent=title;
  $('#response-detail').textContent=detail;
}
function inspect(value){
  parsed=null;matched=false;
  $('#exchangebox').hidden=true;
  $('#tokens').textContent='';
  $('#authorization-code').hidden=true;
  $('#returned-state').textContent='';
  $('#result').textContent='';
  try{
    const u=new URL(value);
    const p=new URLSearchParams(u.search);
    for(const [k,v] of new URLSearchParams(u.hash.slice(1))){
      if(p.has(k))throw Error('同じ応答パラメータが複数あります。');
      p.set(k,v);
    }
    for(const k of new Set(p.keys()))if(p.getAll(k).length>1)throw Error('同じ応答パラメータが複数あります。');
    const obj=Object.fromEntries(p);
    const tx=readStore(txkey);
    const active=!!tx&&!tx.used&&Date.now()-tx.time>=0&&Date.now()-tx.time<3600000;
    matched=active&&!!obj.state&&obj.state===tx.state;
    parsed=obj;
    $('#authorization-code').hidden=!obj.code;
    $('#authorization-code-value').textContent=obj.code||'';
    $('#returned-state').textContent='返された State：'+(obj.state||'（なし）');
    $('#statecheck').className=matched?'state-ok':active?'state-warning':'state-info';
    $('#statecheck').textContent=matched?'✓ State が一致しました。':active?'State が送信時の値と一致しません。':'送信記録がないか、期限切れ・使用済みのため State は未照合です。同じタブでリクエストを送信するか、URL をコピーしてから認証を試してください。';
    $('#result').textContent=JSON.stringify(obj,null,2);
    if(obj.error){
      showResponseStatus('failure','認証サービスからエラーが返されました',obj.error+(obj.error_description?'：'+obj.error_description:''));
    }else if(!(obj.code||obj.id_token||obj.access_token)){
      showResponseStatus('neutral','認証の応答が見つかりません','code・id_token・access_token のいずれかを含む戻り先 URL を入力してください。');
    }else if(active&&!matched){
      showResponseStatus('failure','応答を確認できませんでした','State が一致しないため、このリクエストの成功とは判断できません。');
    }else if(matched){
      showResponseStatus('success','成功しました！','認証サービスから成功応答を受信し、State の一致を確認しました。ID Token の署名などは未検証です。');
    }else{
      showResponseStatus('neutral','成功応答を受信しました','応答の内容を表示しています。State は未照合のため、送信したリクエストとの対応は未確認です。');
    }
    $('#exchangebox').hidden=!(matched&&obj.code&&!obj.error&&u.origin+u.pathname===new URL(tx.redirect).origin+new URL(tx.redirect).pathname);
    if(obj.id_token){
      const payload=decodeJWT(obj.id_token);
      $('#result').textContent+='\n\nID Token（署名未検証）\n'+JSON.stringify(payload,null,2);
      if(tx?.nonce)$('#result').textContent+='\nNonce: '+(payload?.nonce===tx.nonce?'一致':'不一致');
    }
  }catch(e){
    parsed=null;matched=false;
    $('#exchangebox').hidden=true;
    $('#statecheck').textContent='';
    showResponseStatus('failure','応答を解析できませんでした',e.message);
  }
  $('#response').scrollIntoView({behavior:'smooth'});
}
$('#inspect').onclick=()=>inspect($('#responseurl').value);
$('#clear').onclick=()=>{$('#authorization-code').hidden=true;$('#authorization-code-value').textContent='';$('#returned-state').textContent='';$('#response-status').hidden=true;parsed=null;matched=false;$('#responseurl').value='';$('#result').textContent='まだ応答はありません。';$('#tokens').textContent='';$('#statecheck').textContent='';$('#exchangebox').hidden=true;history.replaceState(null,'',location.pathname);};
$('#copy-code').onclick=async()=>{
  try{
    if(!parsed?.code)throw Error();
    await navigator.clipboard.writeText(parsed.code);
    $('#copy-code').textContent='コピーしました ✓';
    setTimeout(()=>$('#copy-code').textContent='コードをコピー',2000);
  }catch{$('#statecheck').textContent='コピーできませんでした。認可コードを選択してコピーしてください。';}
};
$('#restart').onclick=()=>{
  $('#clear').onclick();
  $('#request').scrollIntoView({behavior:'smooth'});
  $('#authorize').focus();
};
$('#exchange').onclick=async()=>{const tx=readStore(txkey);try{if(!matched||!parsed?.code||!tx||tx.used)throw Error('未使用の、State が一致する応答が必要です。');const uri=endpoint($('#tokenuri').value).href;$('#exchange').disabled=true;tx.used=true;writeStore(txkey,tx);const body=new URLSearchParams({grant_type:'authorization_code',code:parsed.code,redirect_uri:tx.redirect,client_id:tx.client});if(tx.pkce)body.set('code_verifier',tx.verifier);const res=await fetch(uri,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,credentials:'omit',redirect:'error',signal:AbortSignal.timeout(20000)});const text=await res.text();let data;try{data=JSON.parse(text);}catch{throw Error('トークン応答が JSON ではありません。');}$('#tokens').textContent='HTTP '+res.status+'\n'+JSON.stringify(data,null,2);if(data.id_token)$('#tokens').textContent+='\n\nID Token（署名未検証）\n'+JSON.stringify(decodeJWT(data.id_token),null,2);}catch(e){$('#tokens').textContent=e.message+'\n通信エラーの場合は Token URI と CORS 設定を確認し、新しい認証リクエストからやり直してください。';}finally{$('#exchange').disabled=false;}};
update().catch(e=>$('#error').textContent=e.message);
if(/[?&#](code|id_token|access_token|error)=/.test(location.href)){const response=location.href;history.replaceState(null,'',location.pathname);$('#responseurl').value=response;inspect(response);}
