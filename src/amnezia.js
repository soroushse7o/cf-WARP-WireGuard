// AmneziaWG page (Persian, RTL). Served at "/amnezia".
// Fetches a fresh WARP account from this worker's own /conf, then merges AmneziaWG
// obfuscation parameters (Jc/Jmin/Jmax/S1/S2/H1-H4, optional I1-I5) client-side.
const DEFAULT_I1 = '<b 0xc70000000108ce1bf31eec7d93360000449e227e4596ed7f75c4d35ce31880b4133107c822c6355b51f0d7c1bba96d5c210a48aca01885fed0871cfc37d59137d73b506dc013bb4a13c060ca5b04b7ae215af71e37d6e8ff1db235f9fe0c25cb8b492471054a7c8d0d6077d430d07f6e87a8699287f6e69f54263c7334a8e144a29851429bf2e350e519445172d36953e96085110ce1fb641e5efad42c0feb4711ece959b72cc4d6f3c1e83251adb572b921534f6ac4b10927167f41fe50040a75acef62f45bded67c0b45b9d655ce374589cad6f568b8475b2e8921ff98628f86ff2eb5bcce6f3ddb7dc89e37c5b5e78ddc8d93a58896e530b5f9f1448ab3b7a1d1f24a63bf981634f6183a21af310ffa52e9ddf5521561760288669de01a5f2f1a4f922e68d0592026bbe4329b654d4f5d6ace4f6a23b8560b720a5350691c0037b10acfac9726add44e7d3e880ee6f3b0d6429ff33655c297fee786bb5ac032e48d2062cd45e305e6d8d8b82bfbf0fdbc5ec09943d1ad02b0b5868ac4b24bb10255196be883562c35a713002014016b8cc5224768b3d330016cf8ed9300fe6bf39b4b19b3667cddc6e7c7ebe4437a58862606a2a66bd4184b09ab9d2cd3d3faed4d2ab71dd821422a9540c4c5fa2a9b2e6693d411a22854a8e541ed930796521f03a54254074bc4c5bca152a1723260e7d70a24d49720acc544b41359cfc252385bda7de7d05878ac0ea0343c77715e145160e6562161dfe2024846dfda3ce99068817a2418e66e4f37dea40a21251c8a034f83145071d93baadf050ca0f95dc9ce2338fb082d64fbc8faba905cec66e65c0e1f9b003c32c943381282d4ab09bef9b6813ff3ff5118623d2617867e25f0601df583c3ac51bc6303f79e68d8f8de4b8363ec9c7728b3ec5fcd5274edfca2a42f2727aa223c557afb33f5bea4f64aeb252c0150ed734d4d8eccb257824e8e090f65029a3a042a51e5cc8767408ae07d55da8507e4d009ae72c47ddb138df3cab6cc023df2532f88fb5a4c4bd917fafde0f3134be09231c389c70bc55cb95a779615e8e0a76a2b4d943aabfde0e394c985c0cb0376930f92c5b6998ef49ff4a13652b787503f55c4e3d8eebd6e1bc6db3a6d405d8405bd7a8db7cefc64d16e0d105a468f3d33d29e5744a24c4ac43ce0eb1bf6b559aed520b91108cda2de6e2c4f14bc4f4dc58712580e07d217c8cca1aaf7ac04bab3e7b1008b966f1ed4fba3fd93a0a9d3a27127e7aa587fbcc60d548300146bdc126982a58ff5342fc41a43f83a3d2722a26645bc961894e339b953e78ab395ff2fb854247ad06d446cc2944a1aefb90573115dc198f5c1efbc22bc6d7a74e41e666a643d5f85f57fde81b87ceff95353d22ae8bab11684180dd142642894d8dc34e402f802c2fd4a73508ca99124e428d67437c871dd96e506ffc39c0fc401f666b437adca41fd563cbcfd0fa22fbbf8112979c4e677fb533d981745cceed0fe96da6cc0593c430bbb71bcbf924f70b4547b0bb4d41c94a09a9ef1147935a5c75bb2f721fbd24ea6a9f5c9331187490ffa6d4e34e6bb30c2c54a0344724f01088fb2751a486f425362741664efb287bce66c4a544c96fa8b124d3c6b9eaca170c0b530799a6e878a57f402eb0016cf2689d55c76b2a91285e2273763f3afc5bc9398273f5338a06d>';

export const AMNEZIA_HTML = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>WARP AmneziaWG</title>
<style>
:root{--bg:#f5f6f8;--card:#fff;--fg:#1c2230;--mut:#667085;--bd:#dfe3ea;--ac:#f6821f;--ac2:#d96a0b}
@media(prefers-color-scheme:dark){:root{--bg:#10141b;--card:#181e28;--fg:#e8ecf3;--mut:#93a0b4;--bd:#2a3342}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.7 system-ui,Tahoma,sans-serif}
main{max-width:720px;margin:0 auto;padding:16px}
h1{font-size:20px;margin:8px 0 2px}
.sub{color:var(--mut);margin:0 0 14px;font-size:13px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:14px;margin-bottom:14px}
h2{font-size:15px;margin:0 0 10px}
label{display:block;margin:8px 0 4px;color:var(--mut);font-size:13px}
select,textarea,input[type=text],input[type=number]{width:100%;min-height:46px;padding:10px;font-size:16px;border:1px solid var(--bd);border-radius:8px;background:var(--bg);color:var(--fg);font:inherit}
input,textarea{direction:ltr;text-align:left}
textarea{font-family:ui-monospace,Consolas,monospace;font-size:13px;min-height:200px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.chk{display:flex;gap:8px;align-items:center;margin-top:10px;color:var(--fg);font-size:14px}.chk input{width:auto}
.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
button{flex:1;min-width:120px;min-height:48px;padding:10px;touch-action:manipulation;border:0;border-radius:8px;background:var(--ac);color:#fff;font:inherit;font-weight:600;cursor:pointer}
button:hover{background:var(--ac2)}button.sec{background:transparent;color:var(--fg);border:1px solid var(--bd)}
button:disabled{opacity:.5;cursor:wait}
.st{font-size:13px;color:var(--mut);margin-top:6px;min-height:20px}.err{color:#d92d20}
.hid{display:none}
.tabs{display:flex;gap:6px;background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:4px;margin:6px 0 12px}.tabs a{flex:1;text-align:center;padding:10px 4px;border-radius:9px;color:var(--fg);text-decoration:none;font-weight:600}.tabs a.on{background:var(--ac);color:#fff}
footer{text-align:center;color:var(--mut);font-size:12px;padding:8px}footer a{color:var(--ac)}
</style>
</head>
<body><main>
<h1>کانفیگ رایگان Cloudflare WARP</h1>
<nav class="tabs"><a href="/">WireGuard</a><a class="on" href="/amnezia">AmneziaWG</a></nav>
<p class="sub">این کانفیگ فقط با کلاینت AmneziaWG کار می‌کند، نه برنامه‌ی WireGuard معمولی.</p>

<section class="card">
<h2>۱. Endpoint و MTU</h2>
<label for="ep">Endpoint (خالی = انتخاب تصادفی از لیست عمومی)</label>
<input id="ep" type="text" list="eps" placeholder="162.159.192.1:2408" spellcheck="false" autocomplete="off">
<datalist id="eps"></datalist>
<label for="src">منبع</label>
<select id="src">
<option value="one">یک کانفیگ (Endpoint بالا یا تصادفی)</option>
<option value="all">همه Endpointهای ذخیره‌شده (یک فایل ZIP)</option>
</select>
<div class="st" id="epst"></div>
<details style="margin-top:8px"><summary>Endpointهای من (خروجی اسکنر)</summary>
<textarea id="eps2" style="min-height:110px" placeholder="162.159.192.1:2408&#10;188.114.97.5:864 ping 45ms" spellcheck="false"></textarea>
<div class="row"><button id="save" type="button">افزودن و ذخیره</button><button class="sec" id="clear" type="button">پاک کردن</button></div>
</details>
<label for="mtu">MTU</label>
<input id="mtu" type="number" value="1280" min="576" max="1500">
<label for="name">نام کانفیگ</label>
<input id="name" type="text" value="sevo-awg" maxlength="32" spellcheck="false">
</section>

<section class="card">
<h2>۲. پارامترهای AmneziaWG</h2>
<label for="junk">پکت‌های Junk (Jc / Jmin / Jmax)</label>
<select id="junk">
<option value="light">سبک (3 / 1 / 3)</option>
<option value="heavy">سنگین (5 / 10 / 40)</option>
<option value="custom">دلخواه</option>
</select>
<div id="cust" class="g3 hid">
<div><label for="jc">Jc</label><input id="jc" type="number" value="3" min="1" max="128"></div>
<div><label for="jmin">Jmin</label><input id="jmin" type="number" value="1" min="1" max="1279"></div>
<div><label for="jmax">Jmax</label><input id="jmax" type="number" value="3" min="2" max="1280"></div>
</div>
<div class="row"><button class="sec" id="rnd" type="button">مقادیر تصادفی</button></div>
<label class="chk"><input type="checkbox" id="v15"> فعال‌سازی پارامترهای Amnezia 1.5 (I1–I5)</label>
<div id="i15" class="hid">
<label for="i1">I1</label><textarea id="i1" style="min-height:90px" spellcheck="false"></textarea>
<label for="i2">I2</label><input id="i2" type="text" spellcheck="false">
<label for="i3">I3</label><input id="i3" type="text" spellcheck="false">
<label for="i4">I4</label><input id="i4" type="text" spellcheck="false">
<label for="i5">I5</label><input id="i5" type="text" spellcheck="false">
</div>
</section>

<section class="card">
<h2>۳. ساخت کانفیگ</h2>
<div class="row"><button id="gen" type="button">ساخت کانفیگ AmneziaWG</button></div>
<div class="st" id="st"></div>
<label for="out">خروجی</label>
<textarea id="out" readonly placeholder="نتیجه اینجا نمایش داده می‌شود"></textarea>
<div class="row">
<button class="sec" id="copy" type="button">کپی</button>
<button class="sec" id="dl" type="button">دانلود</button>
</div>
</section>

<footer><a href="/">WireGuard</a> · <a href="/help">/help</a></footer>
</main>
<script>
(function(){
var $=function(i){return document.getElementById(i)};
var NL=String.fromCharCode(10),CR=String.fromCharCode(13);
var KEY='warp_my_endpoints'; // shared with the main page's saved list
var DEF_I1='${DEFAULT_I1}';
var AK=['jc','jmin','jmax','s1','s2','h1','h2','h3','h4'],IK=['i1','i2','i3','i4','i5'];
var PRESETS={light:{jc:3,jmin:1,jmax:3},heavy:{jc:5,jmin:10,jmax:40}};
var ri=function(a,b){return Math.floor(Math.random()*(b-a+1))+a};

var V4=/(\\b(?:\\d{1,3}\\.){3}\\d{1,3}):(\\d{1,5})\\b/g;
var V6=/\\[([0-9a-fA-F:]+)\\]:(\\d{1,5})\\b/g;
function load(){try{return JSON.parse(localStorage.getItem(KEY))||[]}catch(e){return[]}}
function store(a){try{localStorage.setItem(KEY,JSON.stringify(a))}catch(e){}}
function okV4(ip){return ip.split('.').every(function(o){return +o<=255})}
function parseEps(t){
  var r=[],m;V4.lastIndex=0;V6.lastIndex=0;
  while((m=V4.exec(t))){if(okV4(m[1])&&+m[2]>0&&+m[2]<65536)r.push(m[1]+':'+m[2])}
  while((m=V6.exec(t))){if(+m[2]>0&&+m[2]<65536)r.push('['+m[1]+']:'+m[2])}
  return r;
}

function refresh(){
  var a=load(),dl=$('eps');dl.innerHTML='';
  a.forEach(function(e){var o=document.createElement('option');o.value=e;dl.appendChild(o)});
  $('eps2').value=a.join(NL);
  $('epst').textContent=a.length+' Endpoint ذخیره شده است (با صفحه‌ی اصلی مشترک).';
}
$('save').onclick=function(){
  var seen={},all=[];
  parseEps($('eps2').value).forEach(function(e){if(!seen[e]){seen[e]=1;all.push(e)}});
  if(!all.length){$('epst').className='st err';$('epst').textContent='هیچ Endpoint معتبری پیدا نشد.';return}
  store(all);$('epst').className='st';refresh();
};
$('clear').onclick=function(){store([]);refresh()};
refresh();

$('i1').value=DEF_I1;
$('junk').onchange=function(){$('cust').classList.toggle('hid',this.value!=='custom')};
$('v15').onchange=function(){$('i15').classList.toggle('hid',!this.checked)};
$('rnd').onclick=function(){
  var jmin=ri(1,1279);
  $('jc').value=ri(1,128);$('jmin').value=jmin;$('jmax').value=ri(jmin+1,1280);
  $('junk').value='custom';$('cust').classList.remove('hid');
};

function params(){
  var k=$('junk').value,p;
  if(PRESETS[k])p={jc:PRESETS[k].jc,jmin:PRESETS[k].jmin,jmax:PRESETS[k].jmax};
  else p={jc:+$('jc').value||3,jmin:+$('jmin').value||1,jmax:+$('jmax').value||3};
  if(p.jmax<=p.jmin)p.jmax=p.jmin+1;
  p.s1=0;p.s2=0;p.h1=1;p.h2=2;p.h3=3;p.h4=4;
  if($('v15').checked)IK.forEach(function(i){var v=$(i).value.trim();if(v)p[i]=v});
  return p;
}

// Parse a plain WireGuard .conf into {iface:{}, peer:{}, extra:[comments]}
function parse(t){
  var c={iface:{},peer:{},note:[]},sec=null;
  t.replace(new RegExp(CR,'g'),'').split(NL).forEach(function(l){
    l=l.trim();if(!l)return;
    if(l.charAt(0)==='#'){c.note.push(l);return}
    if(l.charAt(0)==='['){sec=l.slice(1,-1).toLowerCase();return}
    var i=l.indexOf('=');if(i<0)return;
    var k=l.slice(0,i).trim().toLowerCase(),v=l.slice(i+1).trim();
    if(sec==='interface')c.iface[k]=v;else if(sec==='peer')c.peer[k]=v;
  });
  return c;
}

// Merge Amnezia params into the WG structure and serialize.
function build(c,p,mtu,name){
  var L=['# '+name+' (AmneziaWG)'].concat(c.note.filter(function(n){return /reserved/i.test(n)}));
  L.push('[Interface]','PrivateKey = '+c.iface.privatekey,'Address = '+c.iface.address);
  if(c.iface.dns)L.push('DNS = '+c.iface.dns);
  L.push('MTU = '+mtu);
  AK.forEach(function(k){L.push(k.charAt(0).toUpperCase()+k.slice(1)+' = '+p[k])});
  IK.forEach(function(k){if(p[k])L.push(k.toUpperCase()+' = '+p[k])});
  L.push('','[Peer]','PublicKey = '+c.peer.publickey);
  if(c.peer.presharedkey)L.push('PresharedKey = '+c.peer.presharedkey);
  L.push('AllowedIPs = '+c.peer.allowedips,'Endpoint = '+c.peer.endpoint);
  return L.join(NL);
}

var files=[];
async function fetchText(url,opt){var r=await fetch(url,opt),x=await r.text();if(!r.ok)throw new Error(x);return x}
$('gen').onclick=async function(){
  var st=$('st'),b=$('gen'),ep=$('ep').value.trim(),all=$('src').value==='all';
  var name=($('name').value.trim()||'sevo-awg').replace(/[^A-Za-z0-9_-]/g,'-');
  var mtu=parseInt($('mtu').value,10)||1280,p=params(),list=load();
  st.className='st';files=[];
  if(all&&!list.length){st.className='st err';st.textContent='لیست Endpoint خالی است. ابتدا Endpoint اضافه کنید.';return}
  b.disabled=true;st.textContent='در حال ساخت...';
  try{
    var q='?name='+encodeURIComponent(name);
    if(all){
      var used=list.slice(0,200);
      var j=JSON.parse(await fetchText('/batch'+q,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoints:used,name:name}),cache:'no-store'}));
      files=j.configs.map(function(c){
        var w=parse(c.conf);
        if(!w.iface.privatekey||!w.peer.publickey||!w.peer.endpoint)throw new Error('کانفیگ پایه نامعتبر است');
        return{name:c.name+'.conf',data:build(w,p,mtu,c.name)};
      });
      $('out').value=files.map(function(f){return '# ===== '+f.name+' ====='+NL+f.data}).join(NL+NL);
      st.textContent=files.length+' کانفیگ ساخته شد'+(list.length>200?' (حداکثر ۲۰۰ تا در هر بار)':'')+'. برای دریافت همه، دانلود را بزنید (ZIP).';
    }else{
      if(ep)q+='&endpoint='+encodeURIComponent(ep);
      var c=parse(await fetchText('/conf'+q,{cache:'no-store'}));
      if(!c.iface.privatekey||!c.peer.publickey||!c.peer.endpoint)throw new Error('کانفیگ پایه نامعتبر است');
      $('out').value=build(c,p,mtu,name);
      st.textContent='کانفیگ AmneziaWG ساخته شد.';
    }
  }catch(e){st.className='st err';st.textContent='خطا: '+e.message}
  b.disabled=false;
};
$('copy').onclick=function(){
  var v=$('out').value;if(!v)return;
  (navigator.clipboard?navigator.clipboard.writeText(v):Promise.reject()).then(function(){$('st').textContent='کپی شد.'},function(){$('out').select();document.execCommand('copy')});
};
function crc(b){var t=crc.t,c,i,k,r=-1;if(!t){t=crc.t=[];for(i=0;i<256;i++){c=i;for(k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[i]=c>>>0}}
  for(i=0;i<b.length;i++)r=t[(r^b[i])&255]^(r>>>8);return(r^-1)>>>0}
function zip(list){ // store-only ZIP, no compression
  var enc=new TextEncoder(),parts=[],cd=[],off=0,size=0;
  list.forEach(function(f){
    var n=enc.encode(f.name),d=enc.encode(f.data),c=crc(d),h=new DataView(new ArrayBuffer(30)),e=new DataView(new ArrayBuffer(46));
    h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);h.setUint16(12,0x21,true);
    h.setUint32(14,c,true);h.setUint32(18,d.length,true);h.setUint32(22,d.length,true);h.setUint16(26,n.length,true);
    e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint16(8,0x800,true);e.setUint16(14,0x21,true);
    e.setUint32(16,c,true);e.setUint32(20,d.length,true);e.setUint32(24,d.length,true);e.setUint16(28,n.length,true);e.setUint32(42,off,true);
    parts.push(h.buffer,n,d);cd.push(e.buffer,n);off+=30+n.length+d.length;
  });
  cd.forEach(function(p){size+=p.byteLength});
  var end=new DataView(new ArrayBuffer(22));
  end.setUint32(0,0x06054b50,true);end.setUint16(8,list.length,true);end.setUint16(10,list.length,true);end.setUint32(12,size,true);end.setUint32(16,off,true);
  return new Blob(parts.concat(cd,[end.buffer]),{type:'application/zip'});
}

function save(blob,fn){var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fn;a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},1000)}
$('dl').onclick=function(){
  var v=$('out').value;if(!v)return;
  var nm=($('name').value.trim()||'sevo-awg');
  if(files.length>1)save(zip(files),nm+'.zip');
  else save(new Blob([v],{type:'text/plain'}),(files.length?files[0].name:nm+'.conf'));
};
})();
</script>
</body></html>
`;
