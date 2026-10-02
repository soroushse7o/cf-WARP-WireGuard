/**
 * Cloudflare WARP -> WireGuard config generator (Cloudflare Worker, ES module)
 * Original idea: Peyman — https://github.com/Ptechgithub
 *
 * Changes vs. the original:
 *  - ES Modules syntax (`export default { fetch }`) instead of the legacy
 *    service-worker `addEventListener('fetch')`.
 *  - tweetnacl (~18 KB) removed: X25519 keys come from the native WebCrypto API.
 *  - Unknown routes / methods are rejected BEFORE any upstream call is made.
 *  - Device registration and endpoint-list lookup run in parallel.
 *  - Endpoint list is cached at the edge (cf.cacheTtl) and has a timeout.
 *  - No stack traces leaked to clients; responses are `no-store`.
 */

// Single-page UI (Persian, RTL). Served at "/". Endpoints live in the user's browser (localStorage).
const UI_HTML = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f6821f">
<title>WARP WireGuard</title>
<style>
:root{--bg:#f5f6f8;--card:#fff;--fg:#1c2230;--mut:#667085;--bd:#dfe3ea;--ac:#f6821f;--ac2:#d96a0b}
@media(prefers-color-scheme:dark){:root{--bg:#10141b;--card:#181e28;--fg:#e8ecf3;--mut:#93a0b4;--bd:#2a3342}}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.7 system-ui,Tahoma,sans-serif}
main{max-width:640px;margin:0 auto;padding:12px 14px calc(16px + env(safe-area-inset-bottom))}
h1{font-size:19px;margin:6px 0 2px}
.sub{color:var(--mut);margin:0 0 12px;font-size:13px}
.tabs{display:flex;gap:6px;background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:4px;margin:6px 0 8px}
.tabs a{flex:1;text-align:center;padding:10px 4px;border-radius:9px;color:var(--fg);text-decoration:none;font-weight:600;font-size:15px}
.tabs a.on{background:var(--ac);color:#fff}
.tip{font-size:13px;color:var(--mut);margin:0 2px 12px}.tip a{color:var(--ac)}
.card{background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:14px;margin-bottom:12px}
h2{font-size:15px;margin:0 0 6px}
label{display:block;margin:10px 0 4px;color:var(--mut);font-size:13px}
select,textarea,input{width:100%;min-height:46px;padding:10px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--fg);font:inherit;font-size:16px}
input{direction:ltr;text-align:left}
textarea{direction:ltr;text-align:left;font-family:ui-monospace,Consolas,monospace;font-size:14px;line-height:1.5;min-height:130px;resize:vertical}
.hint{font-size:13px;color:var(--mut);margin-top:6px}
.row{display:flex;gap:8px;margin-top:10px}
button{flex:1;min-height:48px;padding:10px;border:0;border-radius:10px;background:var(--ac);color:#fff;font:inherit;font-weight:700;cursor:pointer;touch-action:manipulation}
button:active{background:var(--ac2)}button.sec{background:transparent;color:var(--fg);border:1px solid var(--bd)}
button.big{width:100%;min-height:52px;font-size:17px}
button:disabled{opacity:.5;cursor:wait}
.st{font-size:13px;color:var(--mut);margin-top:6px;min-height:20px}.err{color:#d92d20}
details.card summary{cursor:pointer;font-weight:600;font-size:15px;min-height:30px;list-style-position:inside}
details[open] summary{margin-bottom:6px}
footer{text-align:center;color:var(--mut);font-size:12px;padding:8px}footer a{color:var(--ac)}
</style>
</head>
<body><main>
<h1>کانفیگ رایگان Cloudflare WARP</h1>
<nav class="tabs"><a class="on" href="/">WireGuard</a><a href="/amnezia">AmneziaWG</a></nav>
<p class="tip">اگر اپراتور شما اتصال WireGuard معمولی را مسدود می‌کند، به تب <a href="/amnezia">AmneziaWG</a> بروید؛ آن کانفیگ مبهم‌سازی شده است و فقط با کلاینت Amnezia کار می‌کند.</p>
<p class="tip">برای پیدا کردن Endpoint مناسب اینترنت خودتان، از <a href="https://github.com/soroushse7o/warp-endpoint-scanner" target="_blank" rel="noopener noreferrer">اسکنر Endpoint وارپ</a> استفاده کنید.</p>

<section class="card">
<h2>۱. اندپوینت و کلاینت را انتخاب کنید</h2>
<label for="src">نوع Endpoint</label>
<select id="src">
<option value="public">لیست عمومی (یک کانفیگ با Endpoint تصادفی)</option>
<option value="ipv4-recommended">IPv4 پیشنهادی (یک کانفیگ برای هر Endpoint)</option>
<option value="ipv6-recommended">IPv6 پیشنهادی (یک کانفیگ برای هر Endpoint)</option>
<option value="mine">لیست من (یک کانفیگ برای هر Endpoint ذخیره‌شده)</option>
</select>
<label for="fmt">کلاینت</label>
<select id="fmt" aria-label="کلاینت">
<option value="v2ray">v2rayNG / NekoBox / Hiddify (لینک)</option>
<option value="conf">WireGuard رسمی (فایل .conf)</option>
<option value="raw">پیشرفته: JSON خلاصه</option>
<option value="full">پیشرفته: JSON کامل کلودفلیر</option>
</select>
<div class="hint" id="hint"></div>
<div class="row"><button class="big" id="gen">ساخت کانفیگ جدید</button></div>
<div class="st" id="st1"></div>
<label for="out">خروجی</label>
<textarea id="out" readonly placeholder="نتیجه اینجا نمایش داده می‌شود"></textarea>
<div class="row">
<button class="sec" id="copy">کپی</button>
<button class="sec" id="dl">دانلود</button>
</div>
</section>

<details class="card">
<summary>تنظیمات بیشتر (Endpoint شخصی و نام)</summary>
<label for="name">نام کانفیگ</label>
<input id="name" value="sevo-wg" maxlength="32" spellcheck="false" autocapitalize="off" autocomplete="off">
<label for="eps">Endpointهای من (خروجی اسکنر؛ هر خط <bdi dir="ltr">IP:PORT</bdi>)</label>
<textarea id="eps" placeholder="162.159.192.1:2408&#10;188.114.97.5:864 ping 45ms&#10;[2606:4700:d0::1]:2408" spellcheck="false"></textarea>
<div class="hint">متن اضافه مثل پینگ نادیده گرفته می‌شود. ذخیره‌سازی فقط در مرورگر شما انجام می‌شود.</div>
<div class="row">
<button id="save">افزودن و ذخیره</button>
<button class="sec" id="clear">پاک کردن</button>
</div>
<div class="st" id="st2"></div>
</details>

<footer>by&gt; <a href="https://github.com/soroushse7o">soroushse7o</a> · <a href="/help">/help</a></footer>
</main>
<script>
(function(){
var $=function(i){return document.getElementById(i)};
var KEY='warp_my_endpoints',NL=String.fromCharCode(10),files=[];
var IPV4_RECOMMENDED=['8.6.112.25:1701','8.6.112.25:891','8.6.112.172:1701','8.6.112.172:891'];
var IPV6_RECOMMENDED=['[2606:4700:d0::16f7:d0dd:8281:53b]:968','[2606:4700:d0::8b46:3a14:4fbf:5029]:968','[2606:4700:d1::c4d9:8f0a:e48b:e30b]:864','[2606:4700:d0::993f:bdac:1b5:c8db]:864','[2606:4700:d0::e87b:ff64:583a:9fa9]:864','[2606:4700:d1::9ea9:b1b8:2dbe:9f20]:864','[2606:4700:d0::18cf:fd24:173b:cfa8]:968','[2606:4700:d0::1ada:7cde:7e9c:3d1]:968','[2606:4700:d0::993f:bdac:1b5:c8db]:968','[2606:4700:d0::fb69:3fcb:e206:536c]:864','[2606:4700:d1::19f6:a965:61f3:d5db]:968','[2606:4700:d1::2800:5dd3:57d7:164d]:864','[2606:4700:d1::356:5fe1:68ff:a119]:968','[2606:4700:d1::4553:1aa8:92f6:474d]:968','[2606:4700:d1::4649:aa7a:ea12:cd24]:864','[2606:4700:d1::4649:aa7a:ea12:cd24]:968','[2606:4700:d1::5834:b99b:7572:3479]:864','[2606:4700:d1::a385:14f:35e2:ba7f]:968','[2606:4700:d1::bea9:c03:9233:41af]:968','[2606:4700:d1::f781:bbbe:5c06:d311]:864','[2606:4700:d1::f781:bbbe:5c06:d311]:968','[2606:4700:d0::11a8:8330:b3e3:1ab3]:864','[2606:4700:d0::42d9:f53a:714c:6c11]:968','[2606:4700:d0::5a1a:c2cb:d29d:3e6b]:968','[2606:4700:d0::8ad9:3336:7c62:3a7f]:968'];
var V4=/(\\b(?:\\d{1,3}\\.){3}\\d{1,3}):(\\d{1,5})\\b/g;
var V6=/\\[([0-9a-fA-F:]+)\\]:(\\d{1,5})\\b/g;
function load(){try{return JSON.parse(localStorage.getItem(KEY))||[]}catch(e){return[]}}
function store(a){try{localStorage.setItem(KEY,JSON.stringify(a))}catch(e){}}
function okV4(ip){return ip.split('.').every(function(o){return +o<=255})}
function parse(t){
  var r=[],m;V4.lastIndex=0;V6.lastIndex=0;
  while((m=V4.exec(t))){if(okV4(m[1])&&+m[2]>0&&+m[2]<65536)r.push(m[1]+':'+m[2])}
  while((m=V6.exec(t))){if(+m[2]>0&&+m[2]<65536)r.push('['+m[1]+']:'+m[2])}
  return r;
}
function show(){var a=load();$('eps').value=a.join(NL);$('st2').className='st';$('st2').textContent=a.length+' Endpoint ذخیره شده است.'}
$('save').onclick=function(){
  var seen={},all=[];
  parse($('eps').value).forEach(function(e){if(!seen[e]){seen[e]=1;all.push(e)}});
  if(!all.length){$('st2').className='st err';$('st2').textContent='هیچ Endpoint معتبری پیدا نشد.';return}
  store(all);show();$('st2').textContent='ذخیره شد: '+all.length+' Endpoint معتبر.';
};
$('clear').onclick=function(){store([]);show()};

var ext={v2ray:'txt',conf:'conf',raw:'json',full:'json'};
$('gen').onclick=async function(){
  var st=$('st1'),btn=$('gen'),fmt=$('fmt').value,mode=$('src').value;
  var name=$('name').value.trim()||'sevo-wg',nq='name='+encodeURIComponent(name);
  st.className='st';files=[];
  var mine=load();
  var recommended=mode==='ipv4-recommended'?IPV4_RECOMMENDED:mode==='ipv6-recommended'?IPV6_RECOMMENDED:[];
  if((mode==='mine'||recommended.length)&&!mine.length&&mode==='mine'){st.className='st err';st.textContent='لیست شما خالی است. ابتدا Endpoint اضافه کنید.';return}
  btn.disabled=true;st.textContent='در حال ساخت...';
  try{
    var batch=(mode==='mine'||recommended.length>0)&&(fmt==='v2ray'||fmt==='conf'),r,t;
    if(batch){
      var batchEndpoints=recommended.length?recommended:mine;
      r=await fetch('/batch?'+nq,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoints:batchEndpoints,name:name}),cache:'no-store'});
      t=await r.text();if(!r.ok)throw new Error(t);
      var j=JSON.parse(t);
      if(fmt==='v2ray')t=j.configs.map(function(c){return c.link}).join(NL);
      else{files=j.configs.map(function(c){return{name:c.name+'.conf',data:c.conf}});
        t=j.configs.map(function(c){return '# ===== '+c.name+'.conf ====='+NL+c.conf}).join(NL)}
      st.textContent=j.configs.length+' کانفیگ ساخته شد ('+j.configs[0].name+' تا '+j.configs[j.configs.length-1].name+').';
    }else{
      var q='?'+nq;
      if(mode==='mine')q+='&endpoint='+encodeURIComponent(mine[0]);
      if(mode==='ipv4-recommended')q+='&endpoint='+encodeURIComponent(IPV4_RECOMMENDED[Math.floor(Math.random()*IPV4_RECOMMENDED.length)]);
      if(mode==='ipv6-recommended')q+='&endpoint='+encodeURIComponent(IPV6_RECOMMENDED[Math.floor(Math.random()*IPV6_RECOMMENDED.length)]);
      r=await fetch('/'+fmt+q,{cache:'no-store'});t=await r.text();if(!r.ok)throw new Error(t);
      st.textContent='آماده شد.';
    }
    $('out').value=t;
  }catch(e){st.className='st err';st.textContent='خطا: '+e.message}
  btn.disabled=false;
};
$('copy').onclick=function(){
  var v=$('out').value;if(!v)return;
  (navigator.clipboard?navigator.clipboard.writeText(v):Promise.reject()).then(function(){$('st1').textContent='کپی شد.'},function(){$('out').select();document.execCommand('copy')});
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
  var nm=$('name').value.trim()||'sevo-wg';
  if(files.length>1)save(zip(files),nm+'.zip');
  else save(new Blob([v],{type:'text/plain'}),(files.length?files[0].name:nm+'.'+ext[$('fmt').value]));
};
var H={v2ray:'لینک را کپی کنید و در برنامه از مسیر «افزودن از کلیپ‌بورد» وارد کنید.',conf:'فایل را دانلود و در برنامه‌ی WireGuard با «Import from file» وارد کنید.',raw:'فقط برای توسعه‌دهندگان و ابزارهای دیگر.',full:'پاسخ خام کلودفلیر؛ برای استفاده‌ی عادی لازم نیست.'};
function hint(){$('hint').textContent=H[$('fmt').value]}
$('fmt').onchange=hint;hint();
show();
})();
</script>
</body></html>
`;
// AmneziaWG page (Persian, RTL). Served at "/amnezia".
// Fetches a fresh WARP account from this worker's own /conf, then merges AmneziaWG
// obfuscation parameters (Jc/Jmin/Jmax/S1/S2/H1-H4, optional I1-I5) client-side.
const DEFAULT_I1 = '<b 0xc70000000108ce1bf31eec7d93360000449e227e4596ed7f75c4d35ce31880b4133107c822c6355b51f0d7c1bba96d5c210a48aca01885fed0871cfc37d59137d73b506dc013bb4a13c060ca5b04b7ae215af71e37d6e8ff1db235f9fe0c25cb8b492471054a7c8d0d6077d430d07f6e87a8699287f6e69f54263c7334a8e144a29851429bf2e350e519445172d36953e96085110ce1fb641e5efad42c0feb4711ece959b72cc4d6f3c1e83251adb572b921534f6ac4b10927167f41fe50040a75acef62f45bded67c0b45b9d655ce374589cad6f568b8475b2e8921ff98628f86ff2eb5bcce6f3ddb7dc89e37c5b5e78ddc8d93a58896e530b5f9f1448ab3b7a1d1f24a63bf981634f6183a21af310ffa52e9ddf5521561760288669de01a5f2f1a4f922e68d0592026bbe4329b654d4f5d6ace4f6a23b8560b720a5350691c0037b10acfac9726add44e7d3e880ee6f3b0d6429ff33655c297fee786bb5ac032e48d2062cd45e305e6d8d8b82bfbf0fdbc5ec09943d1ad02b0b5868ac4b24bb10255196be883562c35a713002014016b8cc5224768b3d330016cf8ed9300fe6bf39b4b19b3667cddc6e7c7ebe4437a58862606a2a66bd4184b09ab9d2cd3d3faed4d2ab71dd821422a9540c4c5fa2a9b2e6693d411a22854a8e541ed930796521f03a54254074bc4c5bca152a1723260e7d70a24d49720acc544b41359cfc252385bda7de7d05878ac0ea0343c77715e145160e6562161dfe2024846dfda3ce99068817a2418e66e4f37dea40a21251c8a034f83145071d93baadf050ca0f95dc9ce2338fb082d64fbc8faba905cec66e65c0e1f9b003c32c943381282d4ab09bef9b6813ff3ff5118623d2617867e25f0601df583c3ac51bc6303f79e68d8f8de4b8363ec9c7728b3ec5fcd5274edfca2a42f2727aa223c557afb33f5bea4f64aeb252c0150ed734d4d8eccb257824e8e090f65029a3a042a51e5cc8767408ae07d55da8507e4d009ae72c47ddb138df3cab6cc023df2532f88fb5a4c4bd917fafde0f3134be09231c389c70bc55cb95a779615e8e0a76a2b4d943aabfde0e394c985c0cb0376930f92c5b6998ef49ff4a13652b787503f55c4e3d8eebd6e1bc6db3a6d405d8405bd7a8db7cefc64d16e0d105a468f3d33d29e5744a24c4ac43ce0eb1bf6b559aed520b91108cda2de6e2c4f14bc4f4dc58712580e07d217c8cca1aaf7ac04bab3e7b1008b966f1ed4fba3fd93a0a9d3a27127e7aa587fbcc60d548300146bdc126982a58ff5342fc41a43f83a3d2722a26645bc961894e339b953e78ab395ff2fb854247ad06d446cc2944a1aefb90573115dc198f5c1efbc22bc6d7a74e41e666a643d5f85f57fde81b87ceff95353d22ae8bab11684180dd142642894d8dc34e402f802c2fd4a73508ca99124e428d67437c871dd96e506ffc39c0fc401f666b437adca41fd563cbcfd0fa22fbbf8112979c4e677fb533d981745cceed0fe96da6cc0593c430bbb71bcbf924f70b4547b0bb4d41c94a09a9ef1147935a5c75bb2f721fbd24ea6a9f5c9331187490ffa6d4e34e6bb30c2c54a0344724f01088fb2751a486f425362741664efb287bce66c4a544c96fa8b124d3c6b9eaca170c0b530799a6e878a57f402eb0016cf2689d55c76b2a91285e2273763f3afc5bc9398273f5338a06d>';

const AMNEZIA_HTML = `<!doctype html>
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

const WARP_REG_URL = 'https://api.cloudflareclient.com/v0a4005/reg';
const ENDPOINTS_URL =
  'https://raw.githubusercontent.com/ircfspace/endpoint/refs/heads/main/ip.json';

const FALLBACK_ENDPOINT = { ip: '8.39.204.72', port: 7156 };
const LOCAL_IPV4 = '172.16.0.2/32';
const MTU = 1280;
const DEFAULT_NAME = 'sevo-wg';
const MAX_BATCH = 200;
const NAME_RE = /^[A-Za-z0-9_-]{1,32}$/;
const UPSTREAM_TIMEOUT_MS = 5000;

const HELP_TEXT = `Cloudflare WARP WireGuard API Worker
-------------------------------------
by> soroushse7o

https://github.com/soroushse7o
-------------------------------------

Available endpoints:

/v2ray   →  Generate WireGuard URL format (wireguard://...)
/conf    →  WireGuard .conf file format
/full    →  Return full Cloudflare JSON response
/raw     →  Return compact config (PrivateKey, PublicKey, Reserved, IPv6)
/batch   →  POST {"endpoints":["ip:port",...]} : one config per endpoint (sevo-wg-1, sevo-wg-2, ...)
/amnezia →  AmneziaWG config page (UI)
/help    →  Show this help message

Optional: ?endpoint=IP:PORT (your own endpoint) and ?name=NAME (default: sevo-wg)

All keys are generated dynamically on each request.

=====================================
راهنمای فارسی
=====================================

این ورکر با هر بار فراخوانی، یک کانفیگ جدید WireGuard برای Cloudflare WARP می‌سازد.

مسیرهای موجود:

/v2ray   →  ساخت لینک WireGuard به‌صورت wireguard://... (برای وارد کردن مستقیم در کلاینت)
/conf    →  فایل کانفیگ استاندارد WireGuard (.conf)
/full    →  نمایش پاسخ کامل و خام کلودفلیر (JSON)
/raw     →  نمایش کانفیگ خلاصه (کلید خصوصی، کلید عمومی، Reserved و IPv6)
/batch   →  (POST) ساخت یک کانفیگ برای هر Endpoint با نام‌های sevo-wg-1 ، sevo-wg-2 ، ...
/help    →  نمایش همین راهنما

اختیاری: با ?endpoint=IP:PORT می‌توانید Endpoint دلخواه بدهید و با ?name=NAME نام کانفیگ را تعیین کنید (پیش‌فرض: sevo-wg).

نکته‌ها:
- کلیدها در هر درخواست به‌صورت تصادفی و جدید ساخته می‌شوند.
- آدرس و پورت سرور (Endpoint) به‌صورت تصادفی از یک لیست انتخاب می‌شود.
- اگر خطای 502 دیدید، چند لحظه بعد دوباره امتحان کنید.`;

/* ---------- helpers ---------- */

const toBase64 = (u8) => btoa(String.fromCharCode(...u8));
const fromBase64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

const BASE_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

const text = (body, status = 200) =>
  new Response(body, {
    status,
    headers: { ...BASE_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
  });

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { ...BASE_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
  });

/** X25519 key pair via native WebCrypto (no external library). */
async function generateKeys() {
  const { publicKey, privateKey } = await crypto.subtle.generateKey(
    { name: 'X25519' },
    true,
    ['deriveBits'],
  );
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', publicKey));
  // Raw export of private keys isn't defined for X25519; PKCS#8 = 16-byte header + 32-byte key.
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', privateKey));
  return { publicKey: toBase64(pub), privateKey: toBase64(pkcs8.slice(-32)) };
}

async function registerDevice(publicKey) {
  const resp = await fetch(WARP_REG_URL, {
    method: 'POST',
    headers: { 'User-Agent': 'okhttp/4.9.0', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      install_id: '',
      fcm_token: '',
      tos: new Date().toISOString(),
      type: 'Android',
      model: 'PC',
      locale: 'en_US',
      warp_enabled: true,
      key: publicKey,
    }),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!resp.ok) throw new Error(`WARP registration failed: HTTP ${resp.status}`);
  return resp.json();
}

/** Random endpoint from the community list; falls back to a fixed one on any error. */
async function pickEndpoint() {
  try {
    const resp = await fetch(ENDPOINTS_URL, {
      cf: { cacheTtl: 300, cacheEverything: true },
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) return FALLBACK_ENDPOINT;
    const { ipv4 } = await resp.json();
    if (!Array.isArray(ipv4) || ipv4.length === 0) return FALLBACK_ENDPOINT;
    const [ip, portStr] = ipv4[Math.floor(Math.random() * ipv4.length)].split(':');
    const port = Number.parseInt(portStr, 10);
    return ip && port > 0 && port < 65536 ? { ip, port } : FALLBACK_ENDPOINT;
  } catch {
    return FALLBACK_ENDPOINT;
  }
}

/** Validates a user-supplied "ip:port" or "[ipv6]:port". Returns {ip, port} or null. */
function parseEndpoint(value) {
  const m = /^(?:(\d{1,3}(?:\.\d{1,3}){3})|\[([0-9a-fA-F:]+)\]):(\d{1,5})$/.exec(value ?? '');
  if (!m) return null;
  const port = Number(m[3]);
  if (port < 1 || port > 65535) return null;
  if (m[1]) {
    if (m[1].split('.').some((o) => Number(o) > 255)) return null;
    return { ip: m[1], port };
  }
  return { ip: `[${m[2]}]`, port };
}

function wireGuardConf({ privateKey, peerPublicKey, reserved, ipv6, endpoint, name }) {
  return `# ${name}
[Interface]
PrivateKey = ${privateKey}
Address = ${LOCAL_IPV4}, ${ipv6}
DNS = 1.1.1.1, 1.0.0.1
MTU = ${MTU}
# Reserved = ${reserved.join(',')}

[Peer]
PublicKey = ${peerPublicKey}
AllowedIPs = 0.0.0.0/0, ::/0
Endpoint = ${endpoint.ip}:${endpoint.port}
`;
}

function wireGuardURL({ privateKey, peerPublicKey, reserved, ipv6, endpoint, name }) {
  const e = encodeURIComponent;
  return (
    `wireguard://${e(privateKey)}@${endpoint.ip}:${endpoint.port}` +
    `?address=${e(LOCAL_IPV4)},${e(ipv6)}` +
    `&presharedkey=&reserved=${e(reserved.join(','))}` +
    `&publickey=${e(peerPublicKey)}&mtu=${MTU}#${e(name)}`
  );
}

/* ---------- routes ---------- */

const SINGLE_ROUTES = {
  '/v2ray': (ctx) => text(wireGuardURL(ctx)),
  '/conf': (ctx) => text(wireGuardConf(ctx)),
  '/full': (ctx) => json(ctx.data),
  '/raw': (ctx) =>
    json({
      IPv6: ctx.ipv6,
      ClientID: ctx.clientId,
      Reserved: ctx.reserved,
      PeerPublicKey: ctx.peerPublicKey,
      PrivateKey: ctx.privateKey,
    }),
};

/** Generates keys, registers one WARP device, returns everything except the endpoint. */
async function createAccount() {
  let keys;
  try {
    keys = await generateKeys();
  } catch (e) {
    throw new Error(`Key generation failed: ${e.message}`);
  }
  const data = await registerDevice(keys.publicKey);
  const clientId = data.config.client_id;
  return {
    data,
    privateKey: keys.privateKey,
    clientId,
    reserved: Array.from(fromBase64(clientId).slice(0, 3)),
    peerPublicKey: data.config.peers[0].public_key,
    ipv6: `${data.config.interface.addresses.v6}/128`,
  };
}

const UI_HEADERS = {
  ...BASE_HEADERS,
  'Content-Type': 'text/html; charset=utf-8',
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'",
};

/**
 * POST /batch  { "endpoints": ["ip:port", ...], "name": "sevo-wg" }
 * One WARP account, one config per endpoint, named <name>-1, <name>-2, ...
 */
async function handleBatch(request, name) {
  let body;
  try {
    body = await request.json();
  } catch {
    return text('400 Bad Request: body must be JSON', 400);
  }
  const list = Array.isArray(body?.endpoints) ? body.endpoints : [];
  const endpoints = [];
  const seen = new Set();
  for (const raw of list) {
    const ep = parseEndpoint(String(raw).trim());
    if (!ep) return text(`400 Bad Request: invalid endpoint "${String(raw).slice(0, 60)}"`, 400);
    const key = `${ep.ip}:${ep.port}`;
    if (!seen.has(key)) {
      seen.add(key);
      endpoints.push(ep);
    }
  }
  if (endpoints.length === 0) return text('400 Bad Request: no endpoints provided', 400);
  if (endpoints.length > MAX_BATCH) {
    return text(`400 Bad Request: at most ${MAX_BATCH} endpoints per request`, 400);
  }

  const account = await createAccount();
  const configs = endpoints.map((endpoint, i) => {
    const ctx = { ...account, endpoint, name: `${name}-${i + 1}` };
    return {
      name: ctx.name,
      endpoint: `${endpoint.ip}:${endpoint.port}`,
      link: wireGuardURL(ctx),
      conf: wireGuardConf(ctx),
    };
  });
  const { data: _data, ...info } = account;
  return json({ account: info, configs });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === '/batch') {
      if (request.method !== 'POST') return text('405 Method Not Allowed (use POST)', 405);
    } else if (request.method !== 'GET' && request.method !== 'HEAD') {
      return text('405 Method Not Allowed', 405);
    }

    if (pathname === '/') return new Response(UI_HTML, { headers: UI_HEADERS });
    if (pathname === '/amnezia') return new Response(AMNEZIA_HTML, { headers: UI_HEADERS });
    if (pathname === '/help') return text(HELP_TEXT);

    const single = SINGLE_ROUTES[pathname];
    if (pathname !== '/batch' && !single) {
      return text('404 Not Found\n\nUse /help for usage info.', 404);
    }

    const name = url.searchParams.get('name') ?? DEFAULT_NAME;
    if (!NAME_RE.test(name)) {
      return text('400 Bad Request: name must be 1-32 chars of A-Z a-z 0-9 _ -', 400);
    }

    try {
      if (pathname === '/batch') return await handleBatch(request, name);

      // Optional user-supplied endpoint (e.g. from their own scanner).
      const epParam = url.searchParams.get('endpoint');
      const customEndpoint = epParam ? parseEndpoint(epParam) : null;
      if (epParam && !customEndpoint) {
        return text('400 Bad Request: endpoint must look like 1.2.3.4:2408 or [ipv6]:2408', 400);
      }

      // Independent upstream calls -> run concurrently.
      const [account, endpoint] = await Promise.all([
        createAccount(),
        customEndpoint ?? pickEndpoint(),
      ]);
      return single({ ...account, endpoint, name });
    } catch (err) {
      console.error(err instanceof Error ? (err.stack ?? err.message) : err);
      // Only the message is returned (no stack trace) so failures are diagnosable.
      return text(`502 Bad Gateway: ${err instanceof Error ? err.message : err}`, 502);
    }
  },
};
