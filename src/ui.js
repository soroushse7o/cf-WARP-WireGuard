// Single-page UI (Persian, RTL). Served at "/". Endpoints live in the user's browser (localStorage).
export const UI_HTML = `<!doctype html>
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
