import{b as pi}from"./chunk-EAEMA2E5.js";var lr=class{dims=[];paddedDims=[];layout="x";dataType="Float32";getByteSize(){let t=1;for(let e of this.paddedDims)t*=e;return this.dataType==="Float32"?t*=4:this.dataType==="Float16"&&(t*=2),t}},pr=class{desc;data;constructor(t,e){this.desc=t,this.data=e}},dr=class{_view;offset=0;constructor(t){this._view=t}read(t){let e=this._view,r=this.offset;switch(this.offset+=t,t){case 1:return e.getUint8(r);case 2:return e.getUint16(r,!0);case 4:return e.getUint32(r,!0);case 8:return Number(e.getBigUint64(r,!0));default:throw new Error("unsupported read size")}}};function di(i){let t=new Uint8Array(i),e=new dr(new DataView(i));if(e.read(2)!==16855)throw new Error("invalid or corrupted weights blob");let o=e.read(1),n=e.read(1);if(o!==2)throw new Error("unsupported weights blob version");let a=e.read(8);e.offset=a;let s=e.read(4),u=new Map;for(let p=0;p<s;++p){let l=new lr,c=e.read(2),d=new TextDecoder().decode(t.subarray(e.offset,e.offset+c));e.offset+=c;let f=e.read(1);for(let $=0;$<f;++$)l.dims.push(e.read(4));l.paddedDims=[...l.dims],new TextDecoder().decode(t.subarray(e.offset,e.offset+f))==="oihw"&&(l.layout="oihw"),e.offset+=f;let h=String.fromCharCode(e.read(1));if(h==="f")l.dataType="Float32";else if(h==="h")l.dataType="Float16";else throw new Error("invalid tensor data type");let m=e.read(8),_=t.slice(m,m+l.getByteSize());u.set(d,new pr(l,_))}return u}function pn(i,t){return i.channels===t.channels}var Ee=8,Ot=class{autoUpdateOutputBuffer=!0;_label;_device;_outputBuffers={};_pipeline;_bindGroups=[];_needsUpdatePipeline=!0;_needsResizeBuffer=!0;_inputs=[];_outputs=[];_uniforms=[];_uniformBuffers={};_width=10;_height=10;_execWidth;_execHeight;_csCode="";_csMain;_csDefine;_groupOffsets={inputs:0,uniforms:1,outputs:2};constructor(t,e,r){this._label=t,this._device=e,this._csMain=r.csMain,this._csDefine=r.csDefine,this._inputs=r.inputs,this._outputs=r.outputs,this._uniforms=r.uniforms,this.autoUpdateOutputBuffer=r.autoUpdateOutputBuffer??!0,r.uniforms.forEach(o=>{this._uniformBuffers[o.label]=e.createBuffer({label:this._label,size:o.data.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this._device.queue.writeBuffer(this._uniformBuffers[o.label],0,o.data)})}setCSCode({csDefine:t,csMain:e}){this._csDefine=t,this._csMain=e,this._needsUpdatePipeline=!0}setSize(t,e){t=Math.ceil(t),e=Math.ceil(e);let r=t!==this._width||e!==this._height;this._width=t,this._height=e,r&&(this._needsResizeBuffer=!0,this._needsUpdatePipeline=!0)}setExecuteSize(t,e){t=Math.ceil(t),e=Math.ceil(e),this._execWidth=t,this._execHeight=e}setOutputParams(t){this.autoUpdateOutputBuffer&&this._updateOutputBuffers(t),this._needsUpdatePipeline=!0}setOutputBuffers(t){this._outputBuffers=Object.keys(t).reduce((e,r)=>(e[r]={buffer:t[r],params:{channels:4}},e),{})}setUniform(t,e){let r=this._uniformBuffers[t];this._device.queue.writeBuffer(r,0,e)}getOutput(t){return this._needsResizeBuffer&&this.autoUpdateOutputBuffer&&(this._resizeOutputBuffers(),this._needsResizeBuffer=!1),this._outputBuffers[t].buffer}dispose(t=!0){Object.keys(this._uniformBuffers).forEach(e=>{this._uniformBuffers[e].destroy()}),t&&Object.keys(this._outputBuffers).forEach(e=>{this._outputBuffers[e].buffer.destroy()})}_createBuffer(t){let e=this._width*this._height*4*4;return this._device.createBuffer({label:this._label,size:Math.max(e,80),usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC})}_resizeOutputBuffers(){let t=this._outputBuffers;for(let e in t){let{buffer:r,params:o}=t[e];r.destroy(),t[e].buffer=this._createBuffer(o)}}_updateOutputBuffers(t){let e=this._outputBuffers;for(let r in t){let o=t[r];if(!pn(o,e[r]?.params||{})){e[r]?.buffer.destroy();let n=this._createBuffer(o);e[r]={buffer:n,params:o}}}}_updatePipeline(t,e){if(!this._needsUpdatePipeline)return;this._needsUpdatePipeline=!1;let r=this._device,o=this._getFullCs(t,e);o!==this._csCode&&(this._csCode=o,this._pipeline=r.createComputePipeline({label:this._label,layout:"auto",compute:{module:r.createShaderModule({label:this._label,code:o}),entryPoint:"main"}}),this._updateBindGroups())}_getFullCs(t,e){let r=this._inputs,o=this._uniforms,n=0,a=this._groupOffsets={inputs:0,uniforms:0,outputs:0};return r.length>0&&n++,o.length>0&&(a.uniforms=n,n++),a.outputs=n,`
${r.sort().map((u,p)=>{let l=`@group(${a.inputs}) @binding(${p}) `,c=`in_${u}`;return e[u]==="texture"?`${l} var ${c}: texture_2d<f32>;`:`${l} var<storage, read> ${c}: array<vec${t[u].channels}f>;`}).join(`
`)}
${this._uniforms.map((u,p)=>`@group(${a.uniforms}) @binding(${p}) var<uniform> ${u.label}: ${u.type};`).join(`
`)}

${this._outputs.map((u,p)=>`@group(${a.outputs}) @binding(${p}) var<storage, read_write> out_${u}: array<vec${this._outputBuffers[u].params.channels}f>;`).join(`
`)}
${this._csDefine??""}
@compute @workgroup_size(${Ee}, ${Ee}, 1)
fn main(@builtin(global_invocation_id) globalId: vec3u) {
${this._csMain}
}
`}_updateBindGroups(){let t=[],e=this._device,r=this._groupOffsets;this._uniforms.length>0&&(t[r.uniforms]=e.createBindGroup({label:this._label,layout:this._pipeline.getBindGroupLayout(r.uniforms),entries:this._uniforms.map((o,n)=>({binding:n,resource:{buffer:this._uniformBuffers[o.label]}}))})),this._bindGroups=t}createPass(t,e){this._needsResizeBuffer&&this.autoUpdateOutputBuffer&&(this._resizeOutputBuffers(),this._needsResizeBuffer=!1);let r=this._inputs.reduce((a,s)=>(a[s]=e[s].buffer?"buffer":"texture",a),{});this._updatePipeline(e,r);let o=this._groupOffsets;this._inputs.length>0&&(this._bindGroups[o.inputs]=this._device.createBindGroup({label:this._label,layout:this._pipeline.getBindGroupLayout(o.inputs),entries:this._inputs.map((a,s)=>({binding:s,resource:e[a].buffer?{buffer:e[a].buffer}:e[a].texture.createView()}))})),this._bindGroups[o.outputs]=this._device.createBindGroup({label:this._label,layout:this._pipeline.getBindGroupLayout(o.outputs),entries:this._outputs.map((a,s)=>({binding:s,resource:{buffer:this._outputBuffers[a].buffer}}))});let n=t.beginComputePass();n.setPipeline(this._pipeline),this._bindGroups.forEach((a,s)=>{n.setBindGroup(s,a)}),n.dispatchWorkgroups(Math.ceil((this._execWidth??this._width)/Ee),Math.ceil((this._execHeight??this._height)/Ee),1),n.end()}};var Ht=34028234663852886e22;function Vt(i,t,e){return Number.isNaN(i)?0:Math.min(Math.max(i,t),e)}var fr=`
const FLT_MAX = 3.4028234663852886e38;
fn sanitize(v: vec3f, lo: f32, hi: f32) -> vec3f {
  let bits = bitcast<vec3u>(v);
  let magnitude = bits & vec3u(0x7fffffffu);
  let negative = (bits & vec3u(0x80000000u)) != vec3u(0u);
  let infinite = select(vec3f(hi), vec3f(lo), negative);
  let clamped = select(clamp(v, vec3f(lo), vec3f(hi)), infinite, magnitude == vec3u(0x7f800000u));
  return select(clamped, vec3f(0.0), magnitude > vec3u(0x7f800000u));
}
`;var hr=1412.83765,gr=1.64593172,mr=.431384981,_r=-.00294139609,yr=.192653254,xr=.00626026094,$r=.998620152,fi=15794576e-13,hi=.0322087631,gi=.00223151711,mi=.370974749,_i=65504,yi=vi(_i),xi=1/yi,$i=yi,Ae=Math.log(_i+1),wi=1/Ae;function vi(i){return i<=fi?hr*i:i<=hi?gr*Math.pow(i,mr)+_r:yr*Math.log(i+xr)+$r}function dn(i){return i<=gi?i/hr:i<=mi?Math.pow((i-_r)/gr,1/mr):Math.exp((i-$r)/yr)-xr}function fn(i,t){return t==="log"?Math.log(i+1)*wi:vi(i)*xi}function hn(i,t){return t==="log"?Math.exp(i*Ae)-1:dn(i*$i)}function wr({data:i,channels:t,inputScale:e,transfer:r="pu"}){let o=new Float32Array(i);for(let n=0;n<o.length;n+=t)for(let a=0;a<3;a++)o[n+a]=fn(Vt(o[n+a]*e,0,Ht),r);return o}function vr({data:i,channels:t,inputScale:e,transfer:r="pu"}){let o=new Float32Array(i),n=1/e;for(let a=0;a<o.length;a+=t)for(let s=0;s<3;s++)o[a+s]=hn(Vt(o[a+s],0,Ht),r)*n;return o}function br({data:i,channels:t}){let e=0;for(let a=0;a<i.length;a+=t){let s=Vt(i[a],0,Ht),u=Vt(i[a+1],0,Ht),p=Vt(i[a+2],0,Ht),l=.212671*s+.71516*u+.072169*p;e+=Math.log2(l+1e-4)}let r=i.length/t,o=e/r;return .18/Math.pow(2,o)}var bi=`
const a = ${hr};
const b = ${gr};
const c = ${mr};
const d = ${_r};
const e = ${yr};
const f = ${xr};
const g = ${$r};
const y0 =${fi};
const y1 =${hi};
const x0 =${gi};
const x1 =${mi};

const normScale = ${xi};
const rcpNormScale = ${$i};
`;function ki(i){return`
${bi}
const logXMax = ${Ae};
const logNormScale = ${wi};
${i==="log"?"fn HDRForward(y: f32) -> f32 { return log(y + 1.0) * logNormScale; }":`fn HDRForward(y: f32) -> f32 {
  if (y <= y0) { return a * y * normScale; }
  else if (y <= y1) { return (b * pow(y, c) + d) * normScale; }
  else { return (e * log(y + f) + g) * normScale; }
}`}`}function Ti(i){return`
${bi}
const logXMax = ${Ae};
${i==="log"?"fn HDRInverse(x: f32) -> f32 { return exp(x * logXMax) - 1.0; }":`fn HDRInverse(x: f32) -> f32 {
  let y = x * rcpNormScale;
  if (y <= x0) { return y / a; }
  else if (y <= x1) { return pow((y - d) / b, 1 / c); }
  else { return exp((y - g) / e) - f; }
}`}
`}var jt=class{x;y;width;height;constructor(t,e,r,o){this.x=t,this.y=e,this.width=r,this.height=o}},Oe=class{_device;_isHDR;_hdrTransfer;_inputPassAux;_inputPassColor;_outputPass;_copyPass;_isInputTexture;constructor(t,e,r="pu"){this._device=t,this._isHDR=e,this._hdrTransfer=r;let o=[{label:"inputScale",type:"f32",data:new Float32Array([1])},{label:"inputSize",type:"vec2i",data:new Int32Array(2)},{label:"outputSize",type:"vec2i",data:new Int32Array(2)},{label:"inputOffset",type:"vec2i",data:new Int32Array(2)}];this._inputPassAux=new Ot("inputPassAux",this._device,{inputs:["color","albedo","normal"],outputs:["color","albedo","normal"],uniforms:o,csDefine:"",csMain:""}),this._inputPassColor=new Ot("inputPassColor",this._device,{inputs:["color"],outputs:["color"],uniforms:o,csDefine:"",csMain:""}),this._outputPass=new Ot("outputPass",this._device,{inputs:["color","raw"],outputs:["color"],uniforms:[{label:"inputScale",type:"f32",data:new Float32Array([1])},{label:"inputSize",type:"vec2i",data:new Int32Array(2)},{label:"outputSize",type:"vec2i",data:new Int32Array(2)},{label:"imageSize",type:"vec2i",data:new Int32Array(2)},{label:"inputOffset",type:"vec2i",data:new Int32Array(2)},{label:"outputOffset",type:"vec2i",data:new Int32Array(2)}],csDefine:"",csMain:""}),this._copyPass=new Ot("copyPass",this._device,{inputs:["color"],outputs:["color"],autoUpdateOutputBuffer:!1,uniforms:[{label:"size",type:"vec2i",data:new Int32Array(2)}],csMain:`
let outIdx = i32(globalId.x + globalId.y * u32(size.x));
out_color[outIdx] = textureLoad(in_color, globalId.xy, 0);
`}),this._inputPassAux.setOutputParams({color:{channels:3},albedo:{channels:3},normal:{channels:3}}),this._inputPassColor.setOutputParams({color:{channels:3}}),this._outputPass.setOutputParams({color:{channels:4}})}_updatePasses(t,e=!1){if(this._isInputTexture!=null&&this._isInputTexture===t)return;this._isInputTexture=t;let r=this._isHDR,o=ki(this._hdrTransfer)+fr;function n(s){return t?`textureLoad(in_${s}, vec2u(inputPosition), 0)`:`in_${s}[inIdx]`}let a=`
let x = i32(globalId.x);
let y = i32(globalId.y);
let inputPosition = clamp(
  vec2i(x, y) + inputOffset,
  vec2i(0),
  inputSize - vec2i(1)
);
let inIdx = inputPosition.y * inputSize.x + inputPosition.x;
let col = ${n("color")};

let outIdx = y * outputSize.x + x;

if (${e}) {
  // Denoise the inversed alpha. Or the anti aliased edge will be too dark after denoised
  out_color[outIdx] = sanitize(vec3f(1.0 - col.a), 0.0, 1.0);
}
else if (${r}) {
  let scaled = sanitize(col.rgb * inputScale, 0.0, FLT_MAX);
  out_color[outIdx] = vec3f(HDRForward(scaled.r), HDRForward(scaled.g), HDRForward(scaled.b));
}
else {
  out_color[outIdx] = sanitize(col.rgb, 0.0, 1.0);
}
`;this._inputPassAux.setCSCode({csDefine:o,csMain:`
${a}
let alb = ${n("albedo")};
let nor = ${n("normal")};
// Normals arrive [0, 1]-encoded, so OIDN's [-1, 1] clamp becomes [0, 1].
out_normal[outIdx] = sanitize(nor.rgb, 0.0, 1.0);
out_albedo[outIdx] = sanitize(alb.rgb, 0.0, 1.0);
  `}),this._inputPassColor.setCSCode({csDefine:o,csMain:`
${a}
`}),this._outputPass.setCSCode({csDefine:Ti(this._hdrTransfer)+fr,csMain:`
let x = i32(globalId.x);
let y = i32(globalId.y);
if (x >= outputSize.x || y >= outputSize.y) {
  return;
}
let inIdx = (y + inputOffset.y) * inputSize.x + x + inputOffset.x;
let outIdx = (y + outputOffset.y) * imageSize.x + x + outputOffset.x;
let col = in_color[inIdx];
let raw = ${t?"textureLoad(in_raw, globalId.xy + vec2u(outputOffset), 0)":"in_raw[outIdx]"};

// The network output may contain negative values or NaNs.
let denoised = sanitize(col.rgb, 0.0, ${r&&!e?"FLT_MAX":"1.0"});
if (${e}) {
  out_color[outIdx] = vec4f(raw.rgb, 1.0 - denoised.r);
}
else if (${r}) {
  out_color[outIdx] = vec4f(
    vec3f(HDRInverse(denoised.r), HDRInverse(denoised.g), HDRInverse(denoised.b)) / inputScale,
    // Pick the alpha
    raw.a
  );
}
else {
  out_color[outIdx] = vec4f(denoised, raw.a);
}
`})}setImageSize(t,e){this._inputPassAux.setUniform("inputSize",new Int32Array([t,e])),this._inputPassColor.setUniform("inputSize",new Int32Array([t,e])),this._outputPass.setUniform("imageSize",new Int32Array([t,e])),this._outputPass.setSize(t,e),this._copyPass.setSize(t,e),this._copyPass.setUniform("size",new Int32Array([t,e]))}setInputTile(t){let e=new Int32Array([t.width,t.height]);[this._inputPassAux,this._inputPassColor].forEach(r=>{r.setUniform("inputOffset",new Int32Array([t.x,t.y])),r.setUniform("outputSize",e),r.setSize(e[0],e[1])}),this._outputPass.setUniform("inputSize",e)}setOutputTile(t,e){let r=this._outputPass,o=new Int32Array([t.width,t.height]),n=t.x-e.x,a=t.y-e.y;r.setUniform("outputSize",o),r.setUniform("inputOffset",new Int32Array([n,a])),r.setUniform("outputOffset",new Int32Array([t.x,t.y])),r.setExecuteSize(o[0],o[1])}forward(t,e,r,o){let n=t instanceof GPUTexture;this._updatePasses(n,o);let a=this._inputPassAux,s=this._inputPassColor,u=this._device.createCommandEncoder();function p(l){return l instanceof GPUTexture?{texture:l,channels:4}:{buffer:l,channels:4}}return e&&r?a.createPass(u,{color:p(t),albedo:p(e),normal:p(r)}):s.createPass(u,{color:p(t)}),this._device.queue.submit([u.finish()]),e&&r?{color:a.getOutput("color"),albedo:a.getOutput("albedo"),normal:a.getOutput("normal")}:{color:s.getOutput("color")}}inverse(t,e){let o=this._device.createCommandEncoder(),n=this._outputPass;return n.createPass(o,{color:{buffer:t,channels:4},raw:e instanceof GPUBuffer?{buffer:e,channels:4}:{texture:e,channels:4}}),this._device.queue.submit([o.finish()]),n.getOutput("color")}copyInputDataToOutput(t){let e=this._device.createCommandEncoder(),o=this._outputPass.getOutput("color"),n=this._copyPass;t instanceof GPUTexture?(n.setOutputBuffers({color:o}),n.createPass(e,{color:{texture:t,channels:4}})):e.copyBufferToBuffer(t,0,o,0,o.size),this._device.queue.submit([e.finish()])}dispose(){this._outputPass.dispose(),this._inputPassAux.dispose(),this._inputPassColor.dispose(),this._copyPass.dispose(!1)}};function Kt(i,t){return Math.ceil(i/t)*t}function Bi(i,t){return Math.floor(i/t)*t}function Ii(i,t,e){let r=Math.round(e*i/t),o=Math.round((e+1)*i/t);return{start:r,end:o}}function Me(i,t,e,r=0){let o=t-i,n=Math.max(r,Kt(o,16)),a=i-Math.floor((n-o)/2);return a=Ne(a,0,Math.max(0,e-n)),{start:a,end:a+n}}function Ue(i,t,e,r){if(!Number.isInteger(i)||i<=0||!Number.isInteger(t)||t<=0)throw new Error("Tile grid dimensions must be positive integers");if(!Number.isFinite(e)||e<=0)throw new Error("Maximum tile size must be positive");if(!Number.isFinite(r)||r<0)throw new Error("Tile overlap must be non-negative");let o=Math.max(16,Bi(e,16)),n=Kt(r,16),a=Math.max(1,Math.ceil(i/o)),s=Math.max(1,Math.ceil(t/o)),u=[],p=0,l=0;for(let g=0;g<s;g++){let h=Ii(t,s,g);for(let m=0;m<a;m++){let _=Ii(i,a,m),$={start:m===0?_.start:Math.max(0,_.start-n),end:m===a-1?_.end:Math.min(i,_.end+n)},x={start:g===0?h.start:Math.max(0,h.start-n),end:g===s-1?h.end:Math.min(t,h.end+n)},k=Me($.start,$.end,i),y=Me(x.start,x.end,t),w={x:_.start,y:h.start,width:_.end-_.start,height:h.end-h.start},b={x:k.start,y:y.start,width:k.end-k.start,height:y.end-y.start};p=Math.max(p,w.width),l=Math.max(l,w.height),u.push({column:m,row:g,input:b,output:w})}}let c=()=>new Set(u.map(({input:g})=>`${g.width}x${g.height}`));if(c().size>2){let g=Math.max(...u.map(({input:$})=>$.width)),h=Math.max(...u.map(({input:$})=>$.height)),m=u.reduce(($,{input:x})=>$+g*x.height,0),_=u.reduce(($,{input:x})=>$+x.width*h,0);if(m<=_)for(let $ of u){let x=Me($.input.x,$.input.x+$.input.width,i,g);$.input.x=x.start,$.input.width=x.end-x.start}else for(let $ of u){let x=Me($.input.y,$.input.y+$.input.height,t,h);$.input.y=x.start,$.input.height=x.end-x.start}}let d=c(),f=u.reduce((g,{input:h})=>g+h.width*h.height,0);return{columns:a,rows:s,overlap:n,maxOutputWidth:p,maxOutputHeight:l,inputPixelCount:f,inputShapeCount:d.size,tiles:u}}function Ne(i,t,e){return Math.min(Math.max(i,t),e)}function gn(i,t){let e=[...i].sort((r,o)=>r-o);return e[Math.ceil(e.length*t)-1]}var Le=class{enabled;maxTileSize;minTileSize;targetTileTimeMs;_tileSize;_adjustmentStep;_smoothedTileTimeMs;_completeExecutionsSinceChange=0;constructor(t,e=!0){let r=typeof e=="object"?e:{};this.enabled=e!==!1,this.maxTileSize=Math.max(16,Bi(t,16)),this.minTileSize=Ne(Kt(r.minTileSize??256,16),16,this.maxTileSize),this.targetTileTimeMs=Math.max(1,r.targetTileTimeMs??16),this._adjustmentStep=Math.max(16,Kt(r.adjustmentStep??16,16)),this._tileSize=this.enabled?Ne(Kt(r.initialTileSize??432,16),this.minTileSize,this.maxTileSize):this.maxTileSize}get tileSize(){return this._tileSize}observe(t){if(!this.enabled||t.length===0)return!1;let e=t.filter(a=>Number.isFinite(a)&&a>=0);if(e.length===0)return!1;let r=e.length>=3?e.slice(1):e,o=gn(r,.75);if(this._smoothedTileTimeMs=this._smoothedTileTimeMs===void 0?o:this._smoothedTileTimeMs*.65+o*.35,this._completeExecutionsSinceChange++,this._completeExecutionsSinceChange<2)return!1;let n=this._tileSize;return this._smoothedTileTimeMs>this.targetTileTimeMs*1.25?n-=this._adjustmentStep:this._smoothedTileTimeMs<this.targetTileTimeMs*.65&&(n+=this._adjustmentStep),n=Ne(Kt(n,16),this.minTileSize,this.maxTileSize),n===this._tileSize?!1:(this._tileSize=n,this._smoothedTileTimeMs=void 0,this._completeExecutionsSinceChange=0,!0)}};function P(i,t){return{op:"conv2d",id:i,input:t,weight:`${i}.weight`,bias:`${i}.bias`,activation:"relu",padding:"same"}}function Tt(i,t){return{op:"maxPool2d",id:i,input:t,size:2,stride:2,padding:"same"}}function It(i,t){return{op:"upsample2d",id:i,input:t,scale:2,mode:"nearest"}}function Bt(i,t,e){return{op:"concat",id:i,inputs:[t,e],axis:"channels"}}var Ci={schemaVersion:1,id:"oidn-unet-small-v1",family:"oidn-unet-small",input:"input",output:"dec_conv0",receptiveField:174,nodes:[P("enc_conv0","input"),P("enc_conv1","enc_conv0"),Tt("pool1","enc_conv1"),P("enc_conv2","pool1"),Tt("pool2","enc_conv2"),P("enc_conv3","pool2"),Tt("pool3","enc_conv3"),P("enc_conv4","pool3"),Tt("pool4","enc_conv4"),P("enc_conv5a","pool4"),P("enc_conv5b","enc_conv5a"),It("up4","enc_conv5b"),Bt("concat4","up4","pool3"),P("dec_conv4a","concat4"),P("dec_conv4b","dec_conv4a"),It("up3","dec_conv4b"),Bt("concat3","up3","pool2"),P("dec_conv3a","concat3"),P("dec_conv3b","dec_conv3a"),It("up2","dec_conv3b"),Bt("concat2","up2","pool1"),P("dec_conv2a","concat2"),P("dec_conv2b","dec_conv2a"),It("up1","dec_conv2b"),Bt("concat1","up1","input"),P("dec_conv1a","concat1"),P("dec_conv1b","dec_conv1a"),P("dec_conv0","dec_conv1b")]},Ei={schemaVersion:1,id:"oidn-unet-large-v1",family:"oidn-unet-large",input:"input",output:"dec_conv1c",receptiveField:202,nodes:[P("enc_conv1a","input"),P("enc_conv1b","enc_conv1a"),Tt("pool1","enc_conv1b"),P("enc_conv2a","pool1"),P("enc_conv2b","enc_conv2a"),Tt("pool2","enc_conv2b"),P("enc_conv3a","pool2"),P("enc_conv3b","enc_conv3a"),Tt("pool3","enc_conv3b"),P("enc_conv4a","pool3"),P("enc_conv4b","enc_conv4a"),Tt("pool4","enc_conv4b"),P("enc_conv5a","pool4"),P("enc_conv5b","enc_conv5a"),It("up4","enc_conv5b"),Bt("concat4","up4","pool3"),P("dec_conv4a","concat4"),P("dec_conv4b","dec_conv4a"),It("up3","dec_conv4b"),Bt("concat3","up3","pool2"),P("dec_conv3a","concat3"),P("dec_conv3b","dec_conv3a"),It("up2","dec_conv3b"),Bt("concat2","up2","pool1"),P("dec_conv2a","concat2"),P("dec_conv2b","dec_conv2a"),It("up1","dec_conv2b"),Bt("concat1","up1","input"),P("dec_conv1a","concat1"),P("dec_conv1b","dec_conv1a"),P("dec_conv1c","dec_conv1b")]},mn=[Ci,Ei];function Ai(i){let t=new Set;for(let e of i.nodes)e.op==="conv2d"&&(t.add(e.weight),t.add(e.bias));return t}function Si(i){return i.desc.getByteSize()}function Oi(i){return[...i].sort().join(", ")}function De(i,t=mn){let e=t.filter(r=>{let o=Ai(r);return[...o].some(n=>!i.has(n))?!1:r.allowAdditionalTensors===!0||[...i.keys()].every(n=>o.has(n))});if(e.length===1)return e[0];throw e.length>1?new Error(`Ambiguous OIDN model topology: ${e.map(r=>r.id).join(", ")}`):new Error(`Unsupported OIDN model topology. TZA tensors: ${Oi([...i.keys()])}`)}function Pi(i,t,e){let r=i.get(t);if(!r)throw new Error(`Model ${e} is missing tensor ${t}`);if(r.data.byteLength!==Si(r))throw new Error(`Tensor ${t} has ${r.data.byteLength} bytes, expected ${Si(r)}`);return r}function kr(i,t=De(i)){if(t.schemaVersion!==1)throw new Error(`Unsupported model descriptor schema ${t.schemaVersion}`);let e=Ai(t);if(!t.allowAdditionalTensors){let c=[...i.keys()].filter(d=>!e.has(d));if(c.length>0)throw new Error(`Model ${t.id} has unexpected tensors: ${Oi(c)}`)}let r=new Map,o=new Map,n=new Map,a=new Set([t.input]),s,u,p=(c,d)=>{let f=r.get(c);if(f===void 0)throw new Error(`Model ${t.id} node ${d} reads unknown or forward value ${c}`);return f};for(let c of t.nodes){if(a.has(c.id))throw new Error(`Model ${t.id} produces duplicate value ${c.id}`);if(c.op==="conv2d"){let d=Pi(i,c.weight,t.id),f=Pi(i,c.bias,t.id),g=d.desc.dims;if(d.desc.layout!=="oihw"||g.length!==4)throw new Error(`Tensor ${c.weight} must use OIHW layout`);if(g[2]!==3||g[3]!==3)throw new Error(`Tensor ${c.weight} must use a 3x3 kernel`);if(f.desc.layout!=="x"||f.desc.dims.length!==1)throw new Error(`Tensor ${c.bias} must be a one-dimensional bias`);if(f.desc.dims[0]!==g[0])throw new Error(`Tensor ${c.bias} has ${f.desc.dims[0]} channels, expected ${g[0]}`);if(d.desc.dataType!==f.desc.dataType)throw new Error(`Weight and bias dtype differ for ${c.id}`);if(u&&u!==d.desc.dataType)throw new Error(`Mixed tensor dtypes are not supported by model ${t.id}`);u=d.desc.dataType,c.input===t.input&&s===void 0&&(s=g[1],r.set(t.input,s));let h=p(c.input,c.id);if(h!==g[1])throw new Error(`Tensor ${c.weight} expects ${g[1]} input channels, but ${c.input} provides ${h}`);r.set(c.id,g[0]),o.set(c.id,{weight:d,bias:f,inputChannels:g[1],outputChannels:g[0],kernelHeight:g[2],kernelWidth:g[3]}),n.set(c.id,{inputChannels:g[1],outputChannels:g[0]})}else if(c.op==="concat"){if(c.inputs.length<2)throw new Error(`Concat ${c.id} requires at least two inputs`);let d=c.inputs.reduce((f,g)=>f+p(g,c.id),0);r.set(c.id,d)}else r.set(c.id,p(c.input,c.id));a.add(c.id)}if(s===void 0||u===void 0)throw new Error(`Model ${t.id} has no convolution reading its input`);let l=r.get(t.output);if(l===void 0)throw new Error(`Model ${t.id} output ${t.output} is not produced`);if(l!==3)throw new Error(`Model ${t.id} must produce 3 channels, got ${l}`);return{spec:t,inputChannels:s,outputChannels:l,tensorDataType:u,channelsByValue:r,convChannels:n,convTensors:o}}function _n(i){return i.op==="concat"?i.inputs:[i.input]}function yn(i){let t=new Map;for(let e of i.nodes)for(let r of _n(e)){let o=t.get(r)??[];o.push(e),t.set(r,o)}return t}function Tr(i,t,e){let r=i.get(t);if(!(r===void 0||r.length!==1||r[0].op!==e))return r[0]}function qt(i,t={}){let e=i.spec,r=yn(e),o=new Map(e.nodes.map(l=>[l.id,l])),n=new Set,a=new Map,s=0,u=0;if(t.fuseConvPool!==!1)for(let l of e.nodes){if(l.op!=="conv2d"||l.activation!=="relu")continue;let c=Tr(r,l.id,"maxPool2d");!c||c.op!=="maxPool2d"||c.size!==2||c.stride!==2||(n.add(l.id),a.set(c.id,{op:"fusedConvReluMaxPool2d",id:c.id,input:l.input,conv:l,pool:c}),s++)}if(t.fuseUpsampleConcatConv!==!1)for(let l of e.nodes){if(l.op!=="conv2d")continue;let c=o.get(l.input);if(c?.op!=="concat"||c.inputs.length!==2||Tr(r,c.id,"conv2d")?.id!==l.id)continue;let d=i.channelsByValue.get(c.inputs[0]);if(d===void 0||d%4!==0)continue;let f=c.inputs.map(h=>{let m=o.get(h);return m?.op==="upsample2d"&&m.scale===2&&m.mode==="nearest"&&Tr(r,m.id,"concat")?.id===c.id?{value:m.input,upsample:m}:{value:h}});if(f.filter(h=>h.upsample).length===1){n.add(c.id);for(let h of c.inputs){let m=o.get(h);m?.op==="upsample2d"&&n.add(m.id)}a.set(l.id,{op:"fusedUpsampleConcatConv2d",id:l.id,inputs:f,conv:l}),u++}}let p=[];for(let l of e.nodes){let c=a.get(l.id);c?p.push(c):n.has(l.id)||p.push(l)}return{spec:e,nodes:p,fusions:{convPool:s,upsampleConcatConv:u}}}function xn(i){return i.op==="concat"?i.inputs:i.op==="fusedUpsampleConcatConv2d"?i.inputs.map(t=>t.value):[i.input]}function Mi(i,t){return i.width===t.width&&i.height===t.height}function Ir(i,t,e,r){if(!Number.isInteger(t)||t<=0||!Number.isInteger(e)||e<=0)throw new Error(`Invalid model input size ${t}x${e}`);let o=qt(i,r),n={width:t,height:e,channels:i.inputChannels},a=new Map([[i.spec.input,n]]),s=[],u=(c,d)=>{let f=a.get(c);if(!f)throw new Error(`Planned node ${d} reads missing value ${c}`);return f};for(let c of o.nodes){let d;if(c.op==="conv2d"){let f=u(c.input,c.id);d={width:f.width,height:f.height,channels:i.convChannels.get(c.id).outputChannels}}else if(c.op==="maxPool2d"){let f=u(c.input,c.id);d={width:Math.ceil(f.width/2),height:Math.ceil(f.height/2),channels:f.channels}}else if(c.op==="upsample2d"){let f=u(c.input,c.id);d={width:f.width*2,height:f.height*2,channels:f.channels}}else if(c.op==="concat"){let f=c.inputs.map(g=>u(g,c.id));if(f.some(g=>!Mi(g,f[0])))throw new Error(`Concat ${c.id} has mismatched spatial shapes`);d={width:f[0].width,height:f[0].height,channels:f.reduce((g,h)=>g+h.channels,0)}}else if(c.op==="fusedConvReluMaxPool2d"){let f=u(c.input,c.id);d={width:Math.ceil(f.width/2),height:Math.ceil(f.height/2),channels:i.convChannels.get(c.conv.id).outputChannels}}else{let f=c.inputs.map(g=>{let h=u(g.value,c.id);return g.upsample?{...h,width:h.width*2,height:h.height*2}:h});if(f.some(g=>!Mi(g,f[0])))throw new Error(`Fused decoder ${c.id} has mismatched spatial shapes`);d={width:f[0].width,height:f[0].height,channels:i.convChannels.get(c.conv.id).outputChannels}}a.set(c.id,d),s.push(d)}let p=new Map;o.nodes.forEach((c,d)=>{for(let f of xn(c))p.set(f,d)}),p.set(i.spec.output,o.nodes.length);let l=o.nodes.map((c,d)=>({node:c,outputShape:s[d],lastUse:p.get(c.id)??d}));return{...o,inputShape:n,valueShapes:a,plannedNodes:l}}var Q={MAP_READ:1,MAP_WRITE:2,COPY_SRC:4,COPY_DST:8,INDEX:16,VERTEX:32,UNIFORM:64,STORAGE:128,INDIRECT:256,QUERY_RESOLVE:512},Br={READ:1,WRITE:2};function Sr(i,t,e=!1){let r=i==="fp16"?2:4,o=100*t,n=e?9*t*4:0;return(o+n)*4*r}function $n(i){return i==="fp16"?"vec4<f16>":"vec4<f32>"}function wn(i){return i==="fp16"?`enable f16;
`:""}function vn(i,t,e){let r=o=>`${e}[weightBase + ${o}u]`;return i==="fp16"?`
        let inputValue = vec4<f16>(${t});
        var partial = vec4<f16>(0.0h);
        partial = fma(${r(0)}, vec4<f16>(inputValue.x), partial);
        partial = fma(${r(1)}, vec4<f16>(inputValue.y), partial);
        partial = fma(${r(2)}, vec4<f16>(inputValue.z), partial);
        partial = fma(${r(3)}, vec4<f16>(inputValue.w), partial);
        acc += vec4<f32>(partial);
`:`
        let inputValue = vec4<f32>(${t});
        acc = fma(vec4<f32>(${r(0)}), vec4<f32>(inputValue.x), acc);
        acc = fma(vec4<f32>(${r(1)}), vec4<f32>(inputValue.y), acc);
        acc = fma(vec4<f32>(${r(2)}), vec4<f32>(inputValue.z), acc);
        acc = fma(vec4<f32>(${r(3)}), vec4<f32>(inputValue.w), acc);
`}function Ni(i,t,e,r=!1){if(!Number.isInteger(e)||e<1)throw new Error(`Final RGB shader requires positive input blocks, got ${e}`);let o=$n(i),n="vec4<f32>",a=100*e,s=9*e*4,u=t==="relu"?"max(acc, vec4<f32>(0.0))":"acc",p=vn(i,"inputTile[patchBase + inputBlock]",r?"weightTile":"weights");return`${wn(i)}
struct Params {
  inputWidth: u32,
  inputHeight: u32,
  outputWidth: u32,
  outputHeight: u32,
  inputBlocks: u32,
  outputBlocks: u32,
}

@group(0) @binding(0) var<storage, read> inputData: array<${o}>;
@group(0) @binding(1) var<storage, read> weights: array<${o}>;
@group(0) @binding(2) var<storage, read> bias: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> outputData: array<${n}>;
@group(0) @binding(4) var<uniform> params: Params;

var<workgroup> inputTile: array<${o}, ${a}>;
${r?`var<workgroup> weightTile: array<${o}, ${s}>;`:""}

@compute @workgroup_size(8, 8, 1)
fn main(
  @builtin(local_invocation_id) localId: vec3<u32>,
  @builtin(global_invocation_id) gid: vec3<u32>,
  @builtin(workgroup_id) workgroupId: vec3<u32>
) {
  let localLinear = localId.y * 8u + localId.x;
  for (
    var loadIndex = localLinear;
    loadIndex < ${a}u;
    loadIndex += 64u
  ) {
    let tilePixel = loadIndex / ${e}u;
    let inputBlock = loadIndex % ${e}u;
    let tileX = tilePixel % 10u;
    let tileY = tilePixel / 10u;
    let inputX = i32(workgroupId.x * 8u + tileX) - 1;
    let inputY = i32(workgroupId.y * 8u + tileY) - 1;
    var value = ${o}(0.0);
    if (
      inputX >= 0 && inputX < i32(params.inputWidth) &&
      inputY >= 0 && inputY < i32(params.inputHeight)
    ) {
      let inputIndex =
        (u32(inputY) * params.inputWidth + u32(inputX)) *
        ${e}u + inputBlock;
      value = inputData[inputIndex];
    }
    inputTile[loadIndex] = value;
  }

${r?`  for (
    var loadIndex = localLinear;
    loadIndex < ${s}u;
    loadIndex += 64u
  ) {
    weightTile[loadIndex] = weights[loadIndex];
  }

`:""}  // Out-of-range invocations must reach this barrier before returning.
  workgroupBarrier();

  let outputInBounds =
    gid.x < params.outputWidth &&
    gid.y < params.outputHeight &&
    gid.z < params.outputBlocks;
  if (!outputInBounds) {
    return;
  }

  var acc = bias[gid.z];
  for (var ky = 0u; ky < 3u; ky++) {
    let inputY = i32(gid.y) + i32(ky) - 1;
    if (inputY < 0 || inputY >= i32(params.inputHeight)) {
      continue;
    }
    for (var kx = 0u; kx < 3u; kx++) {
      let inputX = i32(gid.x) + i32(kx) - 1;
      if (inputX < 0 || inputX >= i32(params.inputWidth)) {
        continue;
      }
      let patchBase =
        ((localId.y + ky) * 10u + localId.x + kx) *
        ${e}u;
      for (var inputBlock = 0u; inputBlock < ${e}u; inputBlock++) {
        let weightBase =
          ((ky * 3u + kx) * ${e}u + inputBlock) * 4u;
        ${p}
      }
    }
  }

  let outputIndex =
    (gid.y * params.outputWidth + gid.x) * 1u + gid.z;
  outputData[outputIndex] = ${u};
}
`}var Zt=class{_stats=new Map;track(t,e){let r=this._stats.get(t);return r||(r={created:0,destroyed:0,live:0,peakLive:0,resources:new Set},this._stats.set(t,r)),r.resources.has(e)||(r.resources.add(e),r.created++,r.live++,r.peakLive=Math.max(r.peakLive,r.live)),e}release(t,e,r){if(!e)return!1;let o=this._stats.get(t);if(!o?.resources.delete(e))return!1;try{r()}finally{o.destroyed++,o.live--}return!0}snapshot(t=0){let e=0,r=0,o=0,n=0,a={};for(let[s,u]of this._stats){let p={created:u.created,destroyed:u.destroyed,live:u.live,peakLive:u.peakLive};a[s]=p,e+=p.live,r+=p.created,o+=p.destroyed,n+=p.peakLive}return{live:e,created:r,destroyed:o,peakLive:n,pending:t,byKind:a}}};var Li=new WeakMap;function bn(i){let t=Li.get(i);return t||(t=new Map,Li.set(i,t)),t}var q=8,Wi=8,H=8,st=H+2;function ct(i){let[t,e]=i.workgroupSize;return{workgroupX:t,workgroupY:e,rowsPerThread:i.rowsPerThread,tileM:e*i.rowsPerThread,tileNBlocks:t,tileKBlocks:Wi}}function $t(i){let t=ct(i),e=i.sharedLayout==="padded"||i.sharedLayout==="padded-input",r=i.sharedLayout==="padded"||i.sharedLayout==="padded-weights";return{input:t.tileM*t.tileKBlocks+(e?t.workgroupY:0),weights:t.tileKBlocks*t.tileNBlocks*(r?5:4)}}function ee(i,t){return t.sharedLayout==="padded"||t.sharedLayout==="padded-input"?`(${i}) + (${i}) / ${t.rowsPerThread*Wi}u`:i}function Cr(i,t){return t.sharedLayout==="padded"||t.sharedLayout==="padded-weights"?`(${i}) + (${i}) / 4u`:i}function Er(i,t){return Math.ceil(i/t)*t}function E(i){return Math.ceil(i/4)}function kn(i,t){return i.width*i.height*E(i.channels)*4*t}var ge;function zi(i){let t=i&32768?-1:1,e=i>>>10&31,r=i&1023;return e===0?t*r*2**-24:e===31?r===0?t*(1/0):NaN:t*(1+r/1024)*2**(e-15)}var Ui=new DataView(new ArrayBuffer(4));function Fi(i){Ui.setFloat32(0,i);let t=Ui.getUint32(0),e=t>>>16&32768,r=t>>>23&255,o=t&8388607;if(r===255)return e|31744|(o?512:0);let n=r-127+15;if(n>=31)return e|31744;if(n<=0){if(n<-10)return e;let u=o|8388608,p=14-n,l=u>>>p,c=u&(1<<p)-1,d=1<<p-1,f=c>d||c===d&&l&1?l+1:l;return e|f}let a=n<<10|o>>>13,s=o&8191;return e|(s>4096||s===4096&&a&1?a+1:a)}function Tn(){if(!ge){ge=new Float32Array(65536);for(let i=0;i<ge.length;i++)ge[i]=zi(i)}return ge}function ze(i){if(i.desc.dataType==="Float32")return new Float32Array(i.data.buffer,i.data.byteOffset,i.data.byteLength/4);let t=new Uint16Array(i.data.buffer,i.data.byteOffset,i.data.byteLength/2),e=new Float32Array(t.length);if(t.length<4096)for(let r=0;r<t.length;r++)e[r]=zi(t[r]);else{let r=Tn();for(let o=0;o<t.length;o++)e[o]=r[t[o]]}return e}function _e(i,t,e,r){let o=Er(e.byteLength,4),n=i.createBuffer({label:t,size:o,usage:r,mappedAtCreation:!0});return new Uint8Array(n.getMappedRange()).set(e),n.unmap(),n}function Di(i,t,e){let r=new Uint32Array(Er(e.length,4));return r.set(e),_e(i,t,new Uint8Array(r.buffer,r.byteOffset,r.byteLength),Q.UNIFORM)}function In(i,t,e,r,o){let n=E(e.inputChannels),a=E(e.outputChannels),s=a*e.kernelHeight*e.kernelWidth*n*4*4,u=r==="fp16"&&e.weight.desc.dataType==="Float16",p=r==="fp16"?new Uint16Array(s):void 0,l=p?void 0:new Float32Array(s),c=u?new Uint16Array(e.weight.data.buffer,e.weight.data.byteOffset,e.weight.data.byteLength/2):void 0,d=c?void 0:ze(e.weight);for(let h=0;h<a;h++)for(let m=0;m<e.kernelHeight;m++)for(let _=0;_<e.kernelWidth;_++)for(let $=0;$<n;$++)for(let x=0;x<4;x++){let k=h*4+x;for(let y=0;y<4;y++){let w=$*4+y,v=(o==="k-major"?(((m*e.kernelWidth+_)*n+$)*a+h)*16:(((h*e.kernelHeight+m)*e.kernelWidth+_)*n+$)*16)+y*4+x;if(k<e.outputChannels&&w<e.inputChannels){let I=((k*e.inputChannels+w)*e.kernelHeight+m)*e.kernelWidth+_;p?p[v]=c?c[I]:Fi(d[I]):l[v]=d[I]}}}let f=new Float32Array(a*4);f.set(ze(e.bias));let g=_e(i,`oidn/${t}/weights/${r}/${o}`,p?new Uint8Array(p.buffer):new Uint8Array(l.buffer),Q.STORAGE);try{return{weights:g,weightLayout:o,bias:_e(i,`oidn/${t}/bias`,new Uint8Array(f.buffer),Q.STORAGE)}}catch(h){throw g.destroy(),h}}function R(i){return i==="fp16"?"vec4<f16>":"vec4<f32>"}function dt(i){return i==="fp16"?`enable f16;
`:""}function nt(i,t){return t==="fp16"?`vec4<f16>(${i})`:i}function lt(i,t){return t==="relu"?`max(${i}, vec4<f32>(0.0))`:i}function ye(i,t,e){return e==="fp32"?`
let inputValue = vec4<f32>(${i});
let weightBase = ${t};
acc = fma(vec4<f32>(weights[weightBase]), vec4<f32>(inputValue.x), acc);
acc = fma(vec4<f32>(weights[weightBase + 1u]), vec4<f32>(inputValue.y), acc);
acc = fma(vec4<f32>(weights[weightBase + 2u]), vec4<f32>(inputValue.z), acc);
acc = fma(vec4<f32>(weights[weightBase + 3u]), vec4<f32>(inputValue.w), acc);
`:`
let inputValue = vec4<f16>(${i});
let weightBase = ${t};
var partial = vec4<f16>(0.0h);
partial = fma(weights[weightBase], vec4<f16>(inputValue.x), partial);
partial = fma(weights[weightBase + 1u], vec4<f16>(inputValue.y), partial);
partial = fma(weights[weightBase + 2u], vec4<f16>(inputValue.z), partial);
partial = fma(weights[weightBase + 3u], vec4<f16>(inputValue.w), partial);
acc += vec4<f32>(partial);
`}function Bn(i,t,e){let r=e==="fp16"?"vec4<f16>":"vec4<f32>",o=e==="fp16"?`var partial = vec4<f16>(0.0h);
partial = fma(subgroupBroadcast(weights[weightBase], 0u), ${r}(inputValue.x), partial);
partial = fma(subgroupBroadcast(weights[weightBase + 1u], 0u), ${r}(inputValue.y), partial);
partial = fma(subgroupBroadcast(weights[weightBase + 2u], 0u), ${r}(inputValue.z), partial);
partial = fma(subgroupBroadcast(weights[weightBase + 3u], 0u), ${r}(inputValue.w), partial);
acc += vec4<f32>(partial);`:`acc = fma(subgroupBroadcast(weights[weightBase], 0u), vec4<f32>(inputValue.x), acc);
acc = fma(subgroupBroadcast(weights[weightBase + 1u], 0u), vec4<f32>(inputValue.y), acc);
acc = fma(subgroupBroadcast(weights[weightBase + 2u], 0u), vec4<f32>(inputValue.z), acc);
acc = fma(subgroupBroadcast(weights[weightBase + 3u], 0u), vec4<f32>(inputValue.w), acc);`;return`
let inputValue = ${r}(${i});
let weightBase = ${t};
${o}
`}function Jt(i,t,e){return i==="fp16"&&(t.loadMode==="packed-all"||e&&t.loadMode==="packed-weights")}function Mt(i,t){return t?`bitcast<vec4<f16>>(${i})`:i}function Ar(i,t){let{rowsPerThread:e,tileNBlocks:r,tileKBlocks:o}=ct(t);if(!t.unrollRows||t.accumulationOrder==="row-major")return Sn(i,t);let n=`(tileK * ${r}u + localId.x) * ${t.sharedLayout==="padded"||t.sharedLayout==="padded-weights"?5:4}u`,a=Array.from({length:e},(u,p)=>p),s=R(i);return`
    ${i==="fp16"?a.map(u=>`var partial${u} = vec4<f16>(0.0h);`).join(`
    `):""}
    for (var tileK = 0u; tileK < ${o}u; tileK++) {
      let weightBase = ${n};
      let w0 = weightTile[weightBase];
      let w1 = weightTile[weightBase + 1u];
      let w2 = weightTile[weightBase + 2u];
      let w3 = weightTile[weightBase + 3u];
      ${a.map(u=>{let p=ee(`(localId.y * ${e}u + ${u}u) * ${o}u + tileK`,t),l=i==="fp16"?`partial${u}`:`acc[${u}]`;return`let v${u} = inputTile[${p}];
      `+["x","y","z","w"].map((c,d)=>`${l} = fma(w${d}, ${s}(v${u}.${c}), ${l});`).join(`
      `)}).join(`
      `)}
    }
    ${i==="fp16"?a.map(u=>`acc[${u}] += vec4<f32>(partial${u});`).join(`
    `):""}
`}function Sn(i,t){let{rowsPerThread:e,tileNBlocks:r,tileKBlocks:o}=ct(t),n=ee(`tileSpatial * ${o}u + tileK`,t),a=`(tileK * ${r}u + localId.x) * ${t.sharedLayout==="padded"||t.sharedLayout==="padded-weights"?5:4}u`;if(t.accumulationOrder==="row-major"){let s=R(i),u=i==="fp16"?"partial":"acc[row]";return`
    for (var row = 0u; row < ${e}u; row++) {
      ${i==="fp16"?"var partial = vec4<f16>(0.0h);":""}
      let tileSpatial = localId.y * ${e}u + row;
      for (var tileK = 0u; tileK < ${o}u; tileK++) {
        let weightBase = ${a};
        let inputValue = inputTile[${n}];
        ${u} = fma(weightTile[weightBase], ${s}(inputValue.x), ${u});
        ${u} = fma(weightTile[weightBase + 1u], ${s}(inputValue.y), ${u});
        ${u} = fma(weightTile[weightBase + 2u], ${s}(inputValue.z), ${u});
        ${u} = fma(weightTile[weightBase + 3u], ${s}(inputValue.w), ${u});
      }
      ${i==="fp16"?"acc[row] += vec4<f32>(partial);":""}
    }
`}return i==="fp16"?`
    var partial: array<vec4<f16>, ${e}>;
    for (var row = 0u; row < ${e}u; row++) {
      partial[row] = vec4<f16>(0.0h);
    }
    for (var tileK = 0u; tileK < ${o}u; tileK++) {
      let weightBase =
        ${a};
      for (var row = 0u; row < ${e}u; row++) {
        let tileSpatial =
          localId.y * ${e}u + row;
        let inputValue =
          inputTile[${n}];
        partial[row] = fma(
          weightTile[weightBase],
          vec4<f16>(inputValue.x),
          partial[row]
        );
        partial[row] = fma(
          weightTile[weightBase + 1u],
          vec4<f16>(inputValue.y),
          partial[row]
        );
        partial[row] = fma(
          weightTile[weightBase + 2u],
          vec4<f16>(inputValue.z),
          partial[row]
        );
        partial[row] = fma(
          weightTile[weightBase + 3u],
          vec4<f16>(inputValue.w),
          partial[row]
        );
      }
    }
    for (var row = 0u; row < ${e}u; row++) {
      acc[row] += vec4<f32>(partial[row]);
    }
`:`
    for (var tileK = 0u; tileK < ${o}u; tileK++) {
      let weightBase =
        ${a};
      for (var row = 0u; row < ${e}u; row++) {
        let tileSpatial =
          localId.y * ${e}u + row;
        let inputValue =
          inputTile[${n}];
        acc[row] = fma(
          weightTile[weightBase],
          vec4<f32>(inputValue.x),
          acc[row]
        );
        acc[row] = fma(
          weightTile[weightBase + 1u],
          vec4<f32>(inputValue.y),
          acc[row]
        );
        acc[row] = fma(
          weightTile[weightBase + 2u],
          vec4<f32>(inputValue.z),
          acc[row]
        );
        acc[row] = fma(
          weightTile[weightBase + 3u],
          vec4<f32>(inputValue.w),
          acc[row]
        );
      }
    }
`}function Pn(i,t,e,r,o){let n=R(i),a=R(i),s=R(t),u=nt(lt("acc",e),t);return`${dt(i)}
struct Params {
  inputWidth: u32,
  inputHeight: u32,
  outputWidth: u32,
  outputHeight: u32,
  inputBlocks: u32,
  outputBlocks: u32,
}

@group(0) @binding(0) var<storage, read> inputData: array<${n}>;
@group(0) @binding(1) var<storage, read> weights: array<${a}>;
@group(0) @binding(2) var<storage, read> bias: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> outputData: array<${s}>;
@group(0) @binding(4) var<uniform> params: Params;

@compute @workgroup_size(${q}, ${q}, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.outputWidth || gid.y >= params.outputHeight || gid.z >= ${o}u) {
    return;
  }
  var acc = bias[gid.z];
  for (var ky = 0u; ky < 3u; ky++) {
    let inputY = i32(gid.y) + i32(ky) - 1;
    if (inputY < 0 || inputY >= i32(params.inputHeight)) { continue; }
    for (var kx = 0u; kx < 3u; kx++) {
      let inputX = i32(gid.x) + i32(kx) - 1;
      if (inputX < 0 || inputX >= i32(params.inputWidth)) { continue; }
      let pixelBase = (u32(inputY) * params.inputWidth + u32(inputX)) * ${r}u;
      for (var inputBlock = 0u; inputBlock < ${r}u; inputBlock++) {
        ${ye("inputData[pixelBase + inputBlock]",`((((gid.z * 3u + ky) * 3u + kx) * ${r}u + inputBlock) * 4u)`,i)}
      }
    }
  }
  let outputIndex = (gid.y * params.outputWidth + gid.x) * ${o}u + gid.z;
  outputData[outputIndex] = ${u};
}
`}function Cn(i,t,e,r,o){let n=R(i),a=R(i),s=R(t),u=nt(lt("acc",e),t);return`${dt(i)}
enable subgroups;
struct Params {
  inputWidth: u32,
  inputHeight: u32,
  outputWidth: u32,
  outputHeight: u32,
  inputBlocks: u32,
  outputBlocks: u32,
}
@group(0) @binding(0) var<storage, read> inputData: array<${n}>;
@group(0) @binding(1) var<storage, read> weights: array<${a}>;
@group(0) @binding(2) var<storage, read> bias: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> outputData: array<${s}>;
@group(0) @binding(4) var<uniform> params: Params;

@compute @workgroup_size(${q}, ${q}, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let outputInBounds =
    gid.x < params.outputWidth && gid.y < params.outputHeight;
  var acc = bias[gid.z];
  for (var ky = 0u; ky < 3u; ky++) {
    let inputY = i32(gid.y) + i32(ky) - 1;
    let clampedY = u32(clamp(inputY, 0, i32(params.inputHeight) - 1));
    for (var kx = 0u; kx < 3u; kx++) {
      let inputX = i32(gid.x) + i32(kx) - 1;
      let clampedX = u32(clamp(inputX, 0, i32(params.inputWidth) - 1));
      let inputInBounds =
        outputInBounds && inputX >= 0 && inputY >= 0 &&
        inputX < i32(params.inputWidth) && inputY < i32(params.inputHeight);
      let pixelBase =
        (clampedY * params.inputWidth + clampedX) * ${r}u;
      for (var inputBlock = 0u; inputBlock < ${r}u; inputBlock++) {
        ${Bn(`select(${n}(0.0), inputData[pixelBase + inputBlock], inputInBounds)`,`((((gid.z * 3u + ky) * 3u + kx) * ${r}u + inputBlock) * 4u)`,i)}
      }
    }
  }
  if (outputInBounds) {
    let outputIndex =
      (gid.y * params.outputWidth + gid.x) * ${o}u + gid.z;
    outputData[outputIndex] = ${u};
  }
}
`}function En(i,t,e,r,o){let n=R(i),a=R(t),s=nt(lt("acc",e),t),u=st*st*r,p=H*H;return`${dt(i)}
struct Params {
  inputWidth: u32,
  inputHeight: u32,
  outputWidth: u32,
  outputHeight: u32,
  inputBlocks: u32,
  outputBlocks: u32,
}
@group(0) @binding(0) var<storage, read> inputData: array<${n}>;
@group(0) @binding(1) var<storage, read> weights: array<${n}>;
@group(0) @binding(2) var<storage, read> bias: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> outputData: array<${a}>;
@group(0) @binding(4) var<uniform> params: Params;

var<workgroup> inputPatch: array<${n}, ${u}>;

@compute @workgroup_size(${H}, ${H}, 1)
fn main(
  @builtin(local_invocation_id) localId: vec3<u32>,
  @builtin(workgroup_id) workgroupId: vec3<u32>
) {
  let localLinear =
    localId.y * ${H}u + localId.x;
  for (
    var loadIndex = localLinear;
    loadIndex < ${u}u;
    loadIndex += ${p}u
  ) {
    let patchPixel = loadIndex / ${r}u;
    let inputBlock = loadIndex % ${r}u;
    let patchX = patchPixel % ${st}u;
    let patchY = patchPixel / ${st}u;
    let inputX =
      i32(workgroupId.x * ${H}u + patchX) - 1;
    let inputY =
      i32(workgroupId.y * ${H}u + patchY) - 1;
    var value = ${n}(0.0);
    if (
      inputX >= 0 && inputX < i32(params.inputWidth) &&
      inputY >= 0 && inputY < i32(params.inputHeight)
    ) {
      let inputIndex =
        (u32(inputY) * params.inputWidth + u32(inputX)) *
        ${r}u + inputBlock;
      value = inputData[inputIndex];
    }
    inputPatch[loadIndex] = value;
  }
  workgroupBarrier();

  let outputX =
    workgroupId.x * ${H}u + localId.x;
  let outputY =
    workgroupId.y * ${H}u + localId.y;
  let outputBlock = workgroupId.z;
  if (
    outputX >= params.outputWidth || outputY >= params.outputHeight ||
    outputBlock >= ${o}u
  ) {
    return;
  }

  var acc = bias[outputBlock];
  for (var ky = 0u; ky < 3u; ky++) {
    for (var kx = 0u; kx < 3u; kx++) {
      let patchBase =
        ((localId.y + ky) * ${st}u + localId.x + kx) *
        ${r}u;
      for (var inputBlock = 0u; inputBlock < ${r}u; inputBlock++) {
        ${ye("inputPatch[patchBase + inputBlock]",`((((outputBlock * 3u + ky) * 3u + kx) * ${r}u + inputBlock) * 4u)`,i)}
      }
    }
  }
  let outputIndex =
    (outputY * params.outputWidth + outputX) * ${o}u + outputBlock;
  outputData[outputIndex] = ${s};
}
`}function Yi(i,t,e,r){let{workgroupX:o,workgroupY:n,tileM:a,tileKBlocks:s}=ct(e),u=t?"params.outputWidth":"params.inputWidth",p=t?"params.outputHeight":"params.inputHeight",l=e.addressMode==="base-offset",c=r?r.blocks.map((f,g)=>`cachedBase${g}[load] = (${g===r.upsampled?"y / 2u":"y"} * params.source${g}Width + ${g===r.upsampled?"x / 2u":"x"}) * ${f}u;`).join(`
    `):`cachedBase0[load] = (y * params.inputWidth + x) * ${i}u;`,d=a*s/(o*n);return`
  ${l?`var cachedBase0: array<u32, ${d}>;
  ${r?`var cachedBase1: array<u32, ${d}>;`:""}`:`var cachedX: array<u32, ${d}>;
  var cachedY: array<u32, ${d}>;`}
  var cachedMask: array<u32, ${d}>;
  for (var load = 0u; load < ${d}u; load++) {
    let loadIndex = localLinear + load * ${o*n}u;
    let spatial = workgroupId.x * ${a}u + loadIndex / ${s}u;
    let x = spatial % params.outputWidth;
    let y = spatial / params.outputWidth;
    ${l?c:`cachedX[load] = x;
    cachedY[load] = y;`}
    let columns =
      select(0u, 0x049u, x > 0u && x - 1u < ${u}) |
      select(0u, 0x092u, x < ${u}) |
      select(0u, 0x124u, x + 1u < ${u});
    let rows =
      select(0u, 0x007u, y > 0u && y - 1u < ${p}) |
      select(0u, 0x038u, y < ${p}) |
      select(0u, 0x1c0u, y + 1u < ${p});
    cachedMask[load] = select(0u, columns & rows, spatial < spatialCount)${l&&r?" | ((x & 1u) << 9u) | ((y & 1u) << 10u)":""};
  }
  var channelBlock = (localLinear % ${s}u) % ${i}u;
  var filterPosition = (localLinear % ${s}u) / ${i}u;
`}function Gi(i,t){let{tileKBlocks:e}=ct(t);return`
    channelBlock += ${e%i}u;
    let carry = channelBlock >= ${i}u;
    channelBlock -= select(0u, ${i}u, carry);
    filterPosition += ${Math.floor(e/i)}u + select(0u, 1u, carry);
`}function We(i,t,e){let{workgroupX:r,workgroupY:o,tileM:n,tileKBlocks:a}=ct(e);return`
    let inputBlock = channelBlock;
    let kernelY = filterPosition / 3u;
    let kernelX = filterPosition % 3u;
    for (var load = 0u; load < ${n*a/(r*o)}u; load++) {
      let loadIndex = localLinear + load * ${r*o}u;
      var value = ${i}(0.0);
      if (filterPosition < 9u && (cachedMask[load] & (1u << filterPosition)) != 0u) {
        ${e.addressMode==="base-offset"?"":`let inputX = i32(cachedX[load]) + i32(kernelX) - 1;
        let inputY = i32(cachedY[load]) + i32(kernelY) - 1;`}
        ${t}
      }
      inputTile[${ee("loadIndex",e)}] = value;
    }
`}function An(i,t,e,r,o,n){let{workgroupX:a,workgroupY:s,rowsPerThread:u,tileM:p,tileNBlocks:l,tileKBlocks:c}=ct(n),{addressMode:d,weightLayout:f}=n,g=R(i),h=R(t),m=Jt(i,n,!1),_=Jt(i,n,!0),$=m?"vec2<u32>":g,x=_?"vec2<u32>":g,k=nt(lt("acc",e),t),y=a*s,w=p*c,b=c*l*4;return`${dt(i)}
struct Params {
  inputWidth: u32,
  inputHeight: u32,
  outputWidth: u32,
  outputHeight: u32,
  inputBlocks: u32,
  outputBlocks: u32,
}
@group(0) @binding(0) var<storage, read> inputData: array<${$}>;
@group(0) @binding(1) var<storage, read> weights: array<${x}>;
@group(0) @binding(2) var<storage, read> bias: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> outputData: array<${h}>;
@group(0) @binding(4) var<uniform> params: Params;

var<workgroup> inputTile: array<${g}, ${$t(n).input}>;
var<workgroup> weightTile: array<${g}, ${$t(n).weights}>;

@compute @workgroup_size(${a}, ${s}, 1)
fn main(
  @builtin(local_invocation_id) localId: vec3<u32>,
  @builtin(workgroup_id) workgroupId: vec3<u32>
) {
  let spatialBase =
    workgroupId.x * ${p}u +
    localId.y * ${u}u;
  let outputBlock =
    workgroupId.y * ${l}u + localId.x;
  let spatialCount = params.outputWidth * params.outputHeight;
  var acc: array<vec4<f32>, ${u}>;
  if (outputBlock < ${o}u) {
    for (var row = 0u; row < ${u}u; row++) {
      acc[row] = bias[outputBlock];
    }
  }

  let localLinear =
    localId.y * ${a}u + localId.x;
  ${d!=="analytic"?Yi(r,!1,n):""}
  let totalK = ${r*9}u;
  for (var kBase = 0u; kBase < totalK; kBase += ${c}u) {
    ${d!=="analytic"?We(g,`
        ${d==="base-offset"?`let offset = (i32(kernelY) - 1) * i32(params.inputWidth) + i32(kernelX) - 1;
        let inputIndex = cachedBase0[load] + u32(offset * ${r}) + inputBlock;`:`let inputIndex = (u32(inputY) * params.inputWidth + u32(inputX)) *
          ${r}u + inputBlock;`}
        value = ${Mt("inputData[inputIndex]",m)};
    `,n):`
    for (
      var loadIndex = localLinear;
      loadIndex < ${w}u;
      loadIndex += ${y}u
    ) {
      let tileSpatial = loadIndex / ${c}u;
      let tileK = loadIndex % ${c}u;
      let inputSpatialIndex =
        workgroupId.x * ${p}u + tileSpatial;
      let kIndex = kBase + tileK;
      var value = ${g}(0.0);
      if (inputSpatialIndex < spatialCount && kIndex < totalK) {
        let outputY = inputSpatialIndex / params.outputWidth;
        let outputX = inputSpatialIndex % params.outputWidth;
        let inputBlock = kIndex % ${r}u;
        let kernelIndex = kIndex / ${r}u;
        let kernelY = kernelIndex / 3u;
        let kernelX = kernelIndex % 3u;
        let inputY = i32(outputY) + i32(kernelY) - 1;
        let inputX = i32(outputX) + i32(kernelX) - 1;
        if (
          inputY >= 0 && inputY < i32(params.inputHeight) &&
          inputX >= 0 && inputX < i32(params.inputWidth)
        ) {
          let inputIndex =
            (u32(inputY) * params.inputWidth + u32(inputX)) *
            ${r}u + inputBlock;
          value = ${Mt("inputData[inputIndex]",m)};
        }
      }
      inputTile[${ee("loadIndex",n)}] = value;
    }
    `}

    for (
      var loadIndex = localLinear;
      loadIndex < ${b}u;
      loadIndex += ${y}u
    ) {
      let tileK = loadIndex / ${l*4}u;
      let outputRemainder = loadIndex % ${l*4}u;
      let tileOutputBlock = outputRemainder / 4u;
      let outputLane = outputRemainder % 4u;
      let loadedOutputBlock =
        workgroupId.y * ${l}u + tileOutputBlock;
      let kIndex = kBase + tileK;
      var value = ${g}(0.0);
      if (loadedOutputBlock < ${o}u && kIndex < totalK) {
        ${f==="k-major"?`
        let weightIndex = (kIndex * ${o}u + loadedOutputBlock) * 4u + outputLane;
        `:d!=="analytic"?`
        let weightIndex = (loadedOutputBlock * ${r*9}u + kIndex) * 4u + outputLane;
        `:`
        let inputBlock = kIndex % ${r}u;
        let kernelIndex = kIndex / ${r}u;
        let kernelY = kernelIndex / 3u;
        let kernelX = kernelIndex % 3u;
        let weightIndex =
          ((((loadedOutputBlock * 3u + kernelY) * 3u + kernelX) *
            ${r}u + inputBlock) * 4u + outputLane);
        `}
        value = ${Mt("weights[weightIndex]",_)};
      }
      weightTile[${Cr("loadIndex",n)}] = value;
    }

    workgroupBarrier();
    ${Ar(i,n)}
    workgroupBarrier();
    ${d!=="analytic"?Gi(r,n):""}
  }

  if (outputBlock < ${o}u) {
    for (var row = 0u; row < ${u}u; row++) {
      let spatialIndex = spatialBase + row;
      if (spatialIndex < spatialCount) {
        let outputIndex = spatialIndex * ${o}u + outputBlock;
        outputData[outputIndex] = ${k.replaceAll("acc","acc[row]")};
      }
    }
  }
}
`}function On(i,t,e,r){let o=R(i),n=lt("acc",t);return`${dt(i)}
struct Params {
  inputWidth: u32,
  inputHeight: u32,
  outputWidth: u32,
  outputHeight: u32,
  inputBlocks: u32,
  outputBlocks: u32,
}
@group(0) @binding(0) var<storage, read> inputData: array<${o}>;
@group(0) @binding(1) var<storage, read> weights: array<${o}>;
@group(0) @binding(2) var<storage, read> bias: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> outputData: array<${o}>;
@group(0) @binding(4) var<uniform> params: Params;

@compute @workgroup_size(${q}, ${q}, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.outputWidth || gid.y >= params.outputHeight || gid.z >= ${r}u) {
    return;
  }
  var pooled = vec4<f32>(-3.402823466e+38);
  for (var py = 0u; py < 2u; py++) {
    let centerY = gid.y * 2u + py;
    if (centerY >= params.inputHeight) { continue; }
    for (var px = 0u; px < 2u; px++) {
      let centerX = gid.x * 2u + px;
      if (centerX >= params.inputWidth) { continue; }
      var acc = bias[gid.z];
      for (var ky = 0u; ky < 3u; ky++) {
        let inputY = i32(centerY) + i32(ky) - 1;
        if (inputY < 0 || inputY >= i32(params.inputHeight)) { continue; }
        for (var kx = 0u; kx < 3u; kx++) {
          let inputX = i32(centerX) + i32(kx) - 1;
          if (inputX < 0 || inputX >= i32(params.inputWidth)) { continue; }
          let pixelBase = (u32(inputY) * params.inputWidth + u32(inputX)) * ${e}u;
          for (var inputBlock = 0u; inputBlock < ${e}u; inputBlock++) {
            ${ye("inputData[pixelBase + inputBlock]",`((((gid.z * 3u + ky) * 3u + kx) * ${e}u + inputBlock) * 4u)`,i)}
          }
        }
      }
      pooled = max(pooled, ${n});
    }
  }
  let outputIndex = (gid.y * params.outputWidth + gid.x) * ${r}u + gid.z;
  outputData[outputIndex] = ${nt("pooled",i)};
}
`}function Mn(i,t,e){let r=R(i);return`${dt(i)}
struct Params {
  inputWidth: u32,
  inputHeight: u32,
  outputWidth: u32,
  outputHeight: u32,
  outputBlocks: u32,
}
@group(0) @binding(0) var<storage, read> inputData: array<${r}>;
@group(0) @binding(1) var<storage, read_write> outputData: array<${r}>;
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(${q}, ${q}, 1)
fn main(
  @builtin(global_invocation_id) gid: vec3<u32>${e?`,
  @builtin(num_workgroups) groupCount: vec3<u32>`:""}
) {
  ${e?`let linearX = gid.x + gid.z * groupCount.x * ${q}u;
  let outputBlock = linearX % ${t}u;
  let outputX = linearX / ${t}u;`:`let outputBlock = gid.z;
  let outputX = gid.x;`}
  if (
    outputX >= params.outputWidth ||
    gid.y >= params.outputHeight ||
    outputBlock >= ${t}u
  ) {
    return;
  }
  var pooled = vec4<f32>(-3.402823466e+38);
  for (var py = 0u; py < 2u; py++) {
    let inputY = gid.y * 2u + py;
    if (inputY >= params.inputHeight) { continue; }
    for (var px = 0u; px < 2u; px++) {
      let inputX = outputX * 2u + px;
      if (inputX >= params.inputWidth) { continue; }
      let inputIndex =
        (inputY * params.inputWidth + inputX) * ${t}u + outputBlock;
      pooled = max(pooled, vec4<f32>(inputData[inputIndex]));
    }
  }
  let outputIndex =
    (gid.y * params.outputWidth + outputX) * ${t}u + outputBlock;
  outputData[outputIndex] = ${nt("pooled",i)};
}
`}function Nn(i,t,e,r,o,n,a){let{workgroupX:s,workgroupY:u,rowsPerThread:p,tileM:l,tileNBlocks:c,tileKBlocks:d}=ct(a),{addressMode:f,weightLayout:g}=a,h=R(i),m=R(t),_=Jt(i,a,!1),$=Jt(i,a,!0),x=_?"vec2<u32>":h,k=$?"vec2<u32>":h,y=r[0]+r[1],w=nt(lt("acc[row]",e),t),b=s*u,v=l*d,I=d*c*4,S=(T,U)=>`
          {
            let sourceBlock = ${U};
            ${f==="base-offset"?`let dx = ${T===o?"(i32((cachedMask[load] >> 9u) & 1u) + i32(kernelX) - 1) >> 1u":"i32(kernelX) - 1"};
            let dy = ${T===o?"(i32((cachedMask[load] >> 10u) & 1u) + i32(kernelY) - 1) >> 1u":"i32(kernelY) - 1"};
            let offset = (dy * i32(params.source${T}Width) + dx) * ${r[T]};
            let sourceIndex = cachedBase${T}[load] + u32(offset) + sourceBlock;`:`let sourceX = ${T===o?"u32(inputX) / 2u":"u32(inputX)"};
            let sourceY = ${T===o?"u32(inputY) / 2u":"u32(inputY)"};
            let sourceIndex =
              (sourceY * params.source${T}Width + sourceX) *
              ${r[T]}u + sourceBlock;`}
            value = ${Mt(`input${T}[sourceIndex]`,_)};
          }`;return`${dt(i)}
struct Params {
  outputWidth: u32,
  outputHeight: u32,
  outputBlocks: u32,
  inputBlocks: u32,
  source0Width: u32,
  source0Height: u32,
  source1Width: u32,
  source1Height: u32,
}
@group(0) @binding(0) var<storage, read> input0: array<${x}>;
@group(0) @binding(1) var<storage, read> input1: array<${x}>;
@group(0) @binding(2) var<storage, read> weights: array<${k}>;
@group(0) @binding(3) var<storage, read> bias: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> outputData: array<${m}>;
@group(0) @binding(5) var<uniform> params: Params;

var<workgroup> inputTile: array<${h}, ${$t(a).input}>;
var<workgroup> weightTile: array<${h}, ${$t(a).weights}>;

@compute @workgroup_size(${s}, ${u}, 1)
fn main(
  @builtin(local_invocation_id) localId: vec3<u32>,
  @builtin(workgroup_id) workgroupId: vec3<u32>
) {
  let spatialBase =
    workgroupId.x * ${l}u +
    localId.y * ${p}u;
  let outputBlock =
    workgroupId.y * ${c}u + localId.x;
  let spatialCount = params.outputWidth * params.outputHeight;
  var acc: array<vec4<f32>, ${p}>;
  if (outputBlock < ${n}u) {
    for (var row = 0u; row < ${p}u; row++) {
      acc[row] = bias[outputBlock];
    }
  }

  let localLinear =
    localId.y * ${s}u + localId.x;
  ${f!=="analytic"?Yi(y,!0,a,{blocks:r,upsampled:o}):""}
  let totalK = ${y*9}u;
  for (var kBase = 0u; kBase < totalK; kBase += ${d}u) {
    ${f!=="analytic"?a.decoderLoad==="source-first"?`
    if (channelBlock < ${r[0]}u) {
      ${We(h,S(0,"inputBlock"),a)}
    } else {
      ${We(h,S(1,`inputBlock - ${r[0]}u`),a)}
    }
    `:We(h,`
        if (inputBlock < ${r[0]}u) {
          ${S(0,"inputBlock")}
        } else {
          ${S(1,`inputBlock - ${r[0]}u`)}
        }
    `,a):`
    for (
      var loadIndex = localLinear;
      loadIndex < ${v}u;
      loadIndex += ${b}u
    ) {
      let tileSpatial = loadIndex / ${d}u;
      let tileK = loadIndex % ${d}u;
      let outputSpatialIndex =
        workgroupId.x * ${l}u + tileSpatial;
      let kIndex = kBase + tileK;
      var value = ${h}(0.0);
      if (outputSpatialIndex < spatialCount && kIndex < totalK) {
        let outputY = outputSpatialIndex / params.outputWidth;
        let outputX = outputSpatialIndex % params.outputWidth;
        let inputBlock = kIndex % ${y}u;
        let kernelIndex = kIndex / ${y}u;
        let kernelY = kernelIndex / 3u;
        let kernelX = kernelIndex % 3u;
        let inputY = i32(outputY) + i32(kernelY) - 1;
        let inputX = i32(outputX) + i32(kernelX) - 1;
        if (
          inputY >= 0 && inputY < i32(params.outputHeight) &&
          inputX >= 0 && inputX < i32(params.outputWidth)
        ) {
          if (inputBlock < ${r[0]}u) {
            ${S(0,"inputBlock")}
          } else {
            ${S(1,`inputBlock - ${r[0]}u`)}
          }
        }
      }
      inputTile[${ee("loadIndex",a)}] = value;
    }
    `}

    for (
      var loadIndex = localLinear;
      loadIndex < ${I}u;
      loadIndex += ${b}u
    ) {
      let tileK = loadIndex / ${c*4}u;
      let outputRemainder = loadIndex % ${c*4}u;
      let tileOutputBlock = outputRemainder / 4u;
      let outputLane = outputRemainder % 4u;
      let loadedOutputBlock =
        workgroupId.y * ${c}u + tileOutputBlock;
      let kIndex = kBase + tileK;
      var value = ${h}(0.0);
      if (loadedOutputBlock < ${n}u && kIndex < totalK) {
        ${g==="k-major"?`
        let weightIndex = (kIndex * ${n}u + loadedOutputBlock) * 4u + outputLane;
        `:f!=="analytic"?`
        let weightIndex = (loadedOutputBlock * ${y*9}u + kIndex) * 4u + outputLane;
        `:`
        let inputBlock = kIndex % ${y}u;
        let kernelIndex = kIndex / ${y}u;
        let kernelY = kernelIndex / 3u;
        let kernelX = kernelIndex % 3u;
        let weightIndex =
          ((((loadedOutputBlock * 3u + kernelY) * 3u + kernelX) *
            ${y}u + inputBlock) * 4u + outputLane);
        `}
        value = ${Mt("weights[weightIndex]",$)};
      }
      weightTile[${Cr("loadIndex",a)}] = value;
    }

    workgroupBarrier();
    ${Ar(i,a)}
    workgroupBarrier();
    ${f!=="analytic"?Gi(y,a):""}
  }

  if (outputBlock < ${n}u) {
    for (var row = 0u; row < ${p}u; row++) {
      let spatialIndex = spatialBase + row;
      if (spatialIndex < spatialCount) {
        let outputIndex = spatialIndex * ${n}u + outputBlock;
        outputData[outputIndex] = ${w};
      }
    }
  }
}
`}function Ln(i,t,e,r,o,n,a){let s=ct(a),{workgroupX:u,workgroupY:p,rowsPerThread:l,tileM:c,tileNBlocks:d,tileKBlocks:f}=s,g=u*p,h=c*f/g,m=R(i),_=Jt(i,a,!1),$=Jt(i,a,!0),x=r[o],k=1-o,y=r[k],w=(v,I)=>{let S=r[v],T=I?4:9,U=I?`phase * ${4*x*n*4}u`:`${me*x*n*4}u`,G=I?`(i32(tap / 2u) + i32(phaseY) - 1) * i32(params.source${v}Width) + i32(tap % 2u) + i32(phaseX) - 1`:`(i32(tap / 3u) - 1) * i32(params.source${v}Width) + i32(tap % 3u) - 1`;return`
  for (var kBase = 0u; kBase < ${T*S}u; kBase += ${f}u) {
    let inputK = kBase + localLinear % ${f}u;
    let tap = inputK / ${S}u;
    let channel = inputK % ${S}u;
    for (var load = 0u; load < ${h}u; load++) {
      let i = localLinear + load * ${g}u;
      var value = ${m}(0.0);
      if (tap < ${T}u && (mask${v}[load] & (1u << tap)) != 0u) {
        let offset = ${G};
        let index = u32(base${v}[load] + offset) * ${S}u + channel;
        value = ${Mt(`input${v}[index]`,_)};
      }
      inputTile[${ee("i",a)}] = value;
    }
    for (var i = localLinear; i < ${f*d*4}u; i += ${g}u) {
      let k = kBase + i / ${d*4}u;
      let outputBlock = workgroupId.y * ${d}u + (i % ${d*4}u) / 4u;
      var value = ${m}(0.0);
      if (k < ${T*S}u && outputBlock < ${n}u) {
        let index = ${U} + (k * ${n}u + outputBlock) * 4u + i % 4u;
        value = ${Mt("weights[index]",$)};
      }
      weightTile[${Cr("i",a)}] = value;
    }
    workgroupBarrier();
    ${Ar(i,a)}
    workgroupBarrier();
  }`},b=(v,I)=>{let S=I?4:9,T=I?2:3;return`
    let x${v} = i32(${I?"x":"x * 2u + phaseX"});
    let y${v} = i32(${I?"y":"y * 2u + phaseY"});
    base${v}[load] = y${v} * i32(params.source${v}Width) + x${v};
    var bits${v} = 0u;
    for (var tap = 0u; tap < ${S}u; tap++) {
      let sx = x${v} + i32(tap % ${T}u) ${I?"+ i32(phaseX)":""} - 1;
      let sy = y${v} + i32(tap / ${T}u) ${I?"+ i32(phaseY)":""} - 1;
      if (valid && sx >= 0 && sy >= 0 && sx < i32(params.source${v}Width) && sy < i32(params.source${v}Height)) {
        bits${v} |= 1u << tap;
      }
    }
    mask${v}[load] = bits${v};`};return`${dt(i)}
struct Params {
  outputWidth: u32, outputHeight: u32, outputBlocks: u32, inputBlocks: u32,
  source0Width: u32, source0Height: u32, source1Width: u32, source1Height: u32,
}
@group(0) @binding(0) var<storage, read> input0: array<${_?"vec2<u32>":m}>;
@group(0) @binding(1) var<storage, read> input1: array<${_?"vec2<u32>":m}>;
@group(0) @binding(2) var<storage, read> weights: array<${$?"vec2<u32>":m}>;
@group(0) @binding(3) var<storage, read> bias: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> outputData: array<${R(t)}>;
@group(0) @binding(5) var<uniform> params: Params;
var<workgroup> inputTile: array<${m}, ${$t(a).input}>;
var<workgroup> weightTile: array<${m}, ${$t(a).weights}>;

@compute @workgroup_size(${u}, ${p}, 1)
fn main(@builtin(local_invocation_id) localId: vec3<u32>, @builtin(workgroup_id) workgroupId: vec3<u32>) {
  let phase = workgroupId.z;
  let phaseX = phase & 1u;
  let phaseY = phase >> 1u;
  let phaseWidth = (params.outputWidth + 1u) / 2u;
  let localLinear = localId.y * ${u}u + localId.x;
  let outputBlock = workgroupId.y * ${d}u + localId.x;
  var acc: array<vec4<f32>, ${l}>;
  if (outputBlock < ${n}u) {
    for (var row = 0u; row < ${l}u; row++) { acc[row] = bias[outputBlock]; }
  }
  var base0: array<i32, ${h}>;
  var base1: array<i32, ${h}>;
  var mask0: array<u32, ${h}>;
  var mask1: array<u32, ${h}>;
  for (var load = 0u; load < ${h}u; load++) {
    let spatial = workgroupId.x * ${c}u + (localLinear + load * ${g}u) / ${f}u;
    let x = spatial % phaseWidth;
    let y = spatial / phaseWidth;
    let valid = x * 2u + phaseX < params.outputWidth && y * 2u + phaseY < params.outputHeight;
    ${b(o,!0)}
    ${b(k,!1)}
  }
  ${w(o,!0)}
  ${w(k,!1)}
  if (outputBlock < ${n}u) {
    for (var row = 0u; row < ${l}u; row++) {
      let spatial = workgroupId.x * ${c}u + localId.y * ${l}u + row;
      let x = (spatial % phaseWidth) * 2u + phaseX;
      let y = (spatial / phaseWidth) * 2u + phaseY;
      if (x < params.outputWidth && y < params.outputHeight) {
        outputData[(y * params.outputWidth + x) * ${n}u + outputBlock] = ${nt(lt("acc[row]",e),t)};
      }
    }
  }
}
`}function Un(i,t,e,r,o,n){let a=R(i),s=R(t),u=r[0]+r[1],p=(c,d)=>{let f=c===o;return`
      {
        let sourceX = ${f?"u32(inputX) / 2u":"u32(inputX)"};
        let sourceY = ${f?"u32(inputY) / 2u":"u32(inputY)"};
        let sourcePixelBase = (sourceY * params.source${c}Width + sourceX) * ${r[c]}u;
        for (var sourceBlock = 0u; sourceBlock < ${r[c]}u; sourceBlock++) {
          let inputBlock = ${d}u + sourceBlock;
          ${ye(`input${c}[sourcePixelBase + sourceBlock]`,`((((gid.z * 3u + ky) * 3u + kx) * ${u}u + inputBlock) * 4u)`,i)}
        }
      }
`},l=nt(lt("acc",e),t);return`${dt(i)}
struct Params {
  outputWidth: u32,
  outputHeight: u32,
  outputBlocks: u32,
  inputBlocks: u32,
  source0Width: u32,
  source0Height: u32,
  source1Width: u32,
  source1Height: u32,
}
@group(0) @binding(0) var<storage, read> input0: array<${a}>;
@group(0) @binding(1) var<storage, read> input1: array<${a}>;
@group(0) @binding(2) var<storage, read> weights: array<${a}>;
@group(0) @binding(3) var<storage, read> bias: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> outputData: array<${s}>;
@group(0) @binding(5) var<uniform> params: Params;

@compute @workgroup_size(${q}, ${q}, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.outputWidth || gid.y >= params.outputHeight || gid.z >= ${n}u) {
    return;
  }
  var acc = bias[gid.z];
  for (var ky = 0u; ky < 3u; ky++) {
    let inputY = i32(gid.y) + i32(ky) - 1;
    if (inputY < 0 || inputY >= i32(params.outputHeight)) { continue; }
    for (var kx = 0u; kx < 3u; kx++) {
      let inputX = i32(gid.x) + i32(kx) - 1;
      if (inputX < 0 || inputX >= i32(params.outputWidth)) { continue; }
      ${p(0,0)}
      ${p(1,r[0])}
    }
  }
  let outputIndex = (gid.y * params.outputWidth + gid.x) * ${n}u + gid.z;
  outputData[outputIndex] = ${l};
}
`}function Dn(i,t,e,r,o,n){let a=R(i),s=R(t),u=r[0]+r[1],p=st*st*u,l=H*H,c=nt(lt("acc",e),t),d=(f,g)=>`
      let sourceBlock = ${g};
      let sourceIndex =
        (${f===o?"u32(inputY) / 2u":"u32(inputY)"} * params.source${f}Width + ${f===o?"u32(inputX) / 2u":"u32(inputX)"}) *
        ${r[f]}u + sourceBlock;
      value = input${f}[sourceIndex];`;return`${dt(i)}
struct Params {
  outputWidth: u32,
  outputHeight: u32,
  outputBlocks: u32,
  inputBlocks: u32,
  source0Width: u32,
  source0Height: u32,
  source1Width: u32,
  source1Height: u32,
}
@group(0) @binding(0) var<storage, read> input0: array<${a}>;
@group(0) @binding(1) var<storage, read> input1: array<${a}>;
@group(0) @binding(2) var<storage, read> weights: array<${a}>;
@group(0) @binding(3) var<storage, read> bias: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> outputData: array<${s}>;
@group(0) @binding(5) var<uniform> params: Params;

var<workgroup> inputPatch: array<${a}, ${p}>;

@compute @workgroup_size(${H}, ${H}, 1)
fn main(
  @builtin(local_invocation_id) localId: vec3<u32>,
  @builtin(workgroup_id) workgroupId: vec3<u32>
) {
  let localLinear =
    localId.y * ${H}u + localId.x;
  for (
    var loadIndex = localLinear;
    loadIndex < ${p}u;
    loadIndex += ${l}u
  ) {
    let patchPixel = loadIndex / ${u}u;
    let inputBlock = loadIndex % ${u}u;
    let patchX = patchPixel % ${st}u;
    let patchY = patchPixel / ${st}u;
    let inputX =
      i32(workgroupId.x * ${H}u + patchX) - 1;
    let inputY =
      i32(workgroupId.y * ${H}u + patchY) - 1;
    var value = ${a}(0.0);
    if (
      inputX >= 0 && inputX < i32(params.outputWidth) &&
      inputY >= 0 && inputY < i32(params.outputHeight)
    ) {
      if (inputBlock < ${r[0]}u) {
        ${d(0,"inputBlock")}
      } else {
        ${d(1,`inputBlock - ${r[0]}u`)}
      }
    }
    inputPatch[loadIndex] = value;
  }
  workgroupBarrier();

  let outputX =
    workgroupId.x * ${H}u + localId.x;
  let outputY =
    workgroupId.y * ${H}u + localId.y;
  let outputBlock = workgroupId.z;
  if (
    outputX >= params.outputWidth || outputY >= params.outputHeight ||
    outputBlock >= ${n}u
  ) {
    return;
  }

  var acc = bias[outputBlock];
  for (var ky = 0u; ky < 3u; ky++) {
    for (var kx = 0u; kx < 3u; kx++) {
      let patchBase =
        ((localId.y + ky) * ${st}u + localId.x + kx) *
        ${u}u;
      for (var inputBlock = 0u; inputBlock < ${u}u; inputBlock++) {
        ${ye("inputPatch[patchBase + inputBlock]",`((((outputBlock * 3u + ky) * 3u + kx) * ${u}u + inputBlock) * 4u)`,i)}
      }
    }
  }
  let outputIndex =
    (outputY * params.outputWidth + outputX) * ${n}u + outputBlock;
  outputData[outputIndex] = ${c};
}
`}function Or(i,t){let e=R(i),r=Array.from({length:t},(s,u)=>`@group(0) @binding(${u}) var<storage, read> input${u}: array<vec4<f32>>;`).join(`
`),o=Array.from({length:t},(s,u)=>{let p=u*3;return`if (channel < ${p+3}u) { return input${u}[pixel][channel - ${p}u]; }`}).join(`
  `),n=t,a=t+1;return`${dt(i)}
struct Params {
  width: u32,
  height: u32,
  outputBlocks: u32,
  inputChannels: u32,
}
${r}
@group(0) @binding(${n}) var<storage, read_write> outputData: array<${e}>;
@group(0) @binding(${a}) var<uniform> params: Params;

fn readChannel(pixel: u32, channel: u32) -> f32 {
  ${o}
  return 0.0;
}

@compute @workgroup_size(${q}, ${q}, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.width || gid.y >= params.height || gid.z >= params.outputBlocks) {
    return;
  }
  let pixel = gid.y * params.width + gid.x;
  let firstChannel = gid.z * 4u;
  let value = vec4<f32>(
    readChannel(pixel, firstChannel),
    readChannel(pixel, firstChannel + 1u),
    readChannel(pixel, firstChannel + 2u),
    readChannel(pixel, firstChannel + 3u)
  );
  outputData[pixel * params.outputBlocks + gid.z] = ${nt("value",i)};
}
`}var Rn="chromium-experimental-subgroup-matrix",Wn="wgpu-cooperative-matrix",Qt=32,te=8,Nt=4,zn=1024;function Xi(i,t="f32"){let e=i.features.has(Rn)?"tint":i.features.has(Wn)?"naga":void 0;if(!e||!i.features.has("subgroups"))return;let r=i.adapterInfo,o=r?.subgroupMaxSize??0;if(!r||!o||r.subgroupMinSize!==o)return;let n=t==="f16"?[["f16","f16"],["f16","f32"],["f32","f32"]]:[["f16","f32"],["f32","f32"],["f16","f16"]],a=i.features.has("shader-f16");for(let[s,u]of n)if(!(!a&&(s==="f16"||u==="f16"))){for(let p of[8,16])if(r.subgroupMatrixConfigs?.find(c=>c.componentType===s&&c.resultComponentType===u&&c.M===p&&c.N===p&&c.K===p))return{componentType:s,resultType:u,size:p,subgroupSize:o,dialect:e}}}function Fn(i,t){return t.outputFragments??2}function Yn(i,t,e,r){let o=i.componentType==="f16"?2:4,n=i.resultType==="f16"?2:4,a=i.size,s=(te+2)*(Qt+2)*a,u=e?16:9;return o*(r?2:1)*(s+u*a*a*t)+n*Nt*Qt*a}function Hi(i){let t=i.size,e=i.dialect==="naga",r=(n,a,s)=>e?`coop_mat${t}x${t}<${n}, ${s}>`:`subgroup_matrix_${a}<${n}, ${t}, ${t}>`,o=r(i.resultType,"result","C");return{left:r(i.componentType,"left","A"),right:r(i.componentType,"right","B"),result:o,load:(n,a,s,u)=>e?`coopLoadT<${n}>(&${a}[${s}], ${u})`:`subgroupMatrixLoad<${n}, row_major>(&${a}, ${s}, ${u})`,store:(n,a,s,u)=>e?`coopStoreT(${s}, &${n}[${a}], ${u});`:`subgroupMatrixStore<row_major>(&${n}, ${a}, ${s}, ${u});`,multiplyAdd:e?"coopMultiplyAdd":"subgroupMatrixMultiplyAccumulate",declare:n=>e?`var ${n}: ${o};`:`var ${n} = ${o}();`,extensions:e?"enable wgpu_cooperative_matrix;":`enable subgroups;
enable chromium_experimental_subgroup_matrix;
diagnostic(off, chromium_experimental.subgroup_matrix_uniformity);`}}function Pr(i,t,e,r,o,n,a){let s=(g,h,m)=>`{
        let staged = vec4<${n}>(${h});
        let base = ${m} + i * 4u;
        ${g.array}[base] = staged.x;
        ${g.array}[base + 1u] = staged.y;
        ${g.array}[base + 2u] = staged.z;
        ${g.array}[base + 3u] = staged.w;
      }`,u=g=>t.map(h=>`
    for (var batch = 0u; batch < ${Math.ceil(h.vectors/r)}u; batch++) {
      let i = localIndex + batch * ${r}u;
      if (i < ${h.vectors}u) {
        var value = ${o}(0.0);
        ${h.read}
        ${s(h,"value",g(h))}
      }
    }`).join(""),p=g=>t.map(h=>`let ${h.array}Base = ${g} * ${(h.stride??h.vectors)*4}u;`).join(`
    `);if(!a||i<2)return`
  for (var chunk = 0u; chunk < ${i}u; chunk++) {
    let stageChunk = chunk;
    ${p("0u")}
    ${u(g=>`${g.array}Base`)}
    workgroupBarrier();
    ${e}
    workgroupBarrier();
  }`;let l=t.map(g=>Math.ceil(g.vectors/r)),c=t.map((g,h)=>Array.from({length:l[h]},(m,_)=>`
      {
        let i = localIndex + ${_*r}u;
        var value = ${o}(0.0);
        if (i < ${g.vectors}u) {
          ${g.read}
        }
        prefetch${h}_${_} = value;
      }`).join("")).join(""),d=t.map((g,h)=>Array.from({length:l[h]},(m,_)=>`var prefetch${h}_${_} = ${o}(0.0);`).join(`
    `)).join(`
    `),f=t.map((g,h)=>Array.from({length:l[h]},(m,_)=>`
      {
        let i = localIndex + ${_*r}u;
        if (i < ${g.vectors}u) ${s(g,`prefetch${h}_${_}`,`next * ${(g.stride??g.vectors)*4}u`)}
      }`).join("")).join("");return`
  {
    let stageChunk = 0u;
    ${u(()=>"0u")}
  }
  workgroupBarrier();
  for (var chunk = 0u; chunk < ${i}u; chunk++) {
    let buffer = chunk & 1u;
    let next = 1u - buffer;
    ${p("buffer")}
    ${d}
    if (chunk + 1u < ${i}u) {
      let stageChunk = chunk + 1u;
      ${c}
    }
    ${e}
    if (chunk + 1u < ${i}u) {
      ${f}
    }
    workgroupBarrier();
  }`}function Vi(i,t){return i.dialect==="naga"?Array.from({length:9},(e,r)=>`{ let tap = ${r}u; ${t} }`).join(`
`):`for (var tap = 0u; tap < 9u; tap++) { ${t} }`}function Gn(i,t,e,r,o,n,a,s,u,p=!1){let l=n.size,c=n.componentType,d=n.resultType,f=Qt,g=f+2,h=te+2,m=s?2:1,_=l/4,$=Math.ceil(r/_),x=a*l,k=f/l,y=Nt*n.subgroupSize,w=R(i),b=R(t),{left:v,right:I,load:S,store:T,multiplyAdd:U,declare:G,extensions:ot}=Hi(n),et=[];for(let O=0;O<2;O++)for(let Y=0;Y<k;Y++)for(let D=0;D<a;D++)et.push(`acc${O}_${Y}_${D}`);let pt=et.map(G).join(`
  `),j=Array.from({length:a},(O,Y)=>`let b${Y} = ${S(I,"weightTile",`weightTileBase + tap * ${l*x}u + ${Y*l}u`,`${x}u`)};`).join(`
      `),tt=[];for(let O=0;O<2;O++)for(let Y=0;Y<k;Y++)tt.push(`{
        let a = ${S(v,"inputTile",`inputTileBase + ((rowBase + ${O}u + ky) * ${g}u + ${Y*l}u + kx) * ${l}u`,`${l}u`)};
        ${Array.from({length:a},(D,X)=>`acc${O}_${Y}_${X} = ${U}(a, b${X}, acc${O}_${Y}_${X});`).join(`
        `)}
      }`);let bt=`let ky = tap / 3u;
      let kx = tap % 3u;
      ${j}
      ${tt.join(`
      `)}`,Ft=Vi(n,bt),F=[];if(p)for(let O=0;O<a;O++)F.push(`{
    var pooled = vec4<f32>(-3.402823e38);
    let pixel = lane / ${_}u;
    let outputBlock = blockBase + ${O*_}u + lane % ${_}u;
    ${Array.from({length:2},(Y,D)=>`
    ${Array.from({length:k},(X,At)=>T("resultTile",`resultBase + ${At*l*l}u`,`acc${D}_${At}_${O}`,`${l}u`)).join(`
    `)}
    workgroupBarrier();
    {
      let base = resultBase + pixel * ${l*2}u + (lane % ${_}u) * 4u;
      let first = vec4<f32>(resultTile[base], resultTile[base + 1u], resultTile[base + 2u], resultTile[base + 3u]);
      let second = vec4<f32>(resultTile[base + ${l}u], resultTile[base + ${l+1}u], resultTile[base + ${l+2}u], resultTile[base + ${l+3}u]);
      if (tileY + rowBase + ${D}u < params.inputHeight) {
        pooled = max(pooled, first);
        if (tileX + pixel * 2u + 1u < params.inputWidth) { pooled = max(pooled, second); }
      }
    }
    workgroupBarrier();`).join(`
    `)}
    let outputX = tileX / 2u + pixel;
    let outputY = (tileY + rowBase) / 2u;
    if (outputX < params.outputWidth && outputY < params.outputHeight && outputBlock < ${o}u) {
      let acc = pooled + bias[outputBlock];
      outputData[(outputY * params.outputWidth + outputX) * ${o}u + outputBlock] = ${nt(lt("acc",e),t)};
    }
  }`);else for(let O=0;O<2;O++)for(let Y=0;Y<a;Y++)F.push(`{
    ${Array.from({length:k},(D,X)=>T("resultTile",`resultBase + ${X*l*l}u`,`acc${O}_${X}_${Y}`,`${l}u`)).join(`
    `)}
    workgroupBarrier();
    let outputY = tileY + rowBase + ${O}u;
    for (var e = lane; e < ${f*_}u; e += ${n.subgroupSize}u) {
      let pixel = e / ${_}u;
      let outputX = tileX + pixel;
      let outputBlock = blockBase + ${Y*_}u + e % ${_}u;
      if (outputX < params.outputWidth && outputY < params.outputHeight && outputBlock < ${o}u) {
        let base = resultBase + pixel * ${l}u + (e % ${_}u) * 4u;
        let acc = vec4<f32>(f32(resultTile[base]), f32(resultTile[base + 1u]),
          f32(resultTile[base + 2u]), f32(resultTile[base + 3u])) + bias[outputBlock];
        outputData[(outputY * params.outputWidth + outputX) * ${o}u + outputBlock] = ${nt(lt("acc",e),t)};
      }
    }
    workgroupBarrier();
  }`);let V=u?(()=>{let[O,Y]=u.sourceBlocks,D=X=>X===u.upsampledSource?`min(u32(inputY) / 2u, params.source${X}Height - 1u) * params.source${X}Width + min(u32(inputX) / 2u, params.source${X}Width - 1u)`:`u32(inputY) * params.source${X}Width + u32(inputX)`;return`if (block < ${O}u) {
          value = input0[(${D(0)}) * ${O}u + block];
        } else {
          value = input1[(${D(1)}) * ${Y}u + block - ${O}u];
        }`})():`value = inputData[(u32(inputY) * params.inputWidth + u32(inputX)) * ${r}u + block];`,Et=u?`struct Params {
  outputWidth: u32,
  outputHeight: u32,
  outputBlocks: u32,
  inputBlocks: u32,
  source0Width: u32,
  source0Height: u32,
  source1Width: u32,
  source1Height: u32,
}
@group(0) @binding(0) var<storage, read> input0: array<${w}>;
@group(0) @binding(1) var<storage, read> input1: array<${w}>;
@group(0) @binding(2) var<storage, read> weights: array<${w}>;
@group(0) @binding(3) var<storage, read> bias: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> outputData: array<${b}>;
@group(0) @binding(5) var<uniform> params: Params;`:`struct Params {
  inputWidth: u32,
  inputHeight: u32,
  outputWidth: u32,
  outputHeight: u32,
  inputBlocks: u32,
  outputBlocks: u32,
}
@group(0) @binding(0) var<storage, read> inputData: array<${w}>;
@group(0) @binding(1) var<storage, read> weights: array<${w}>;
@group(0) @binding(2) var<storage, read> bias: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> outputData: array<${b}>;
@group(0) @binding(4) var<uniform> params: Params;`,Yt=u?"params.outputWidth":"params.inputWidth",Gt=u?"params.outputHeight":"params.inputHeight";return`${i==="fp16"||t==="fp16"||c==="f16"||d==="f16"?`enable f16;
`:""}${ot}
${Et}

var<workgroup> inputTile: array<${c}, ${m*h*g*l}>;
var<workgroup> weightTile: array<${c}, ${m*9*l*x}>;
var<workgroup> resultTile: array<${d}, ${Nt*f*l}>;

@compute @workgroup_size(${y})
fn main(
  @builtin(local_invocation_index) localIndex: u32,
  @builtin(workgroup_id) workgroupId: vec3<u32>,
  @builtin(subgroup_id) subgroup: u32,
  @builtin(subgroup_invocation_id) lane: u32
) {
  let tileX = workgroupId.x * ${f}u;
  let tileY = workgroupId.y * ${te}u;
  let blockBase = workgroupId.z * ${x/4}u;
  let rowBase = subgroup * 2u;
  let resultBase = subgroup * ${f*l}u;
  ${pt}

  ${Pr($,[{array:"inputTile",vectors:h*g*_,read:`let pixel = i / ${_}u;
      let block = stageChunk * ${_}u + i % ${_}u;
      let inputX = i32(tileX + pixel % ${g}u) - 1;
      let inputY = i32(tileY + pixel / ${g}u) - 1;
      if (block < ${r}u && inputX >= 0 && inputY >= 0 &&
          inputX < i32(${Yt}) && inputY < i32(${Gt})) {
        ${V}
      }`},{array:"weightTile",vectors:9*l*x/4,read:`let quad = i % ${x/4}u;
      let row = i / ${x/4}u;
      let tap = row / ${l}u;
      let inputChannel = stageChunk * ${l}u + row % ${l}u;
      let outputBlock = blockBase + quad;
      if (inputChannel < ${r*4}u && outputBlock < ${o}u) {
        value = weights[((tap * ${r}u + inputChannel / 4u) * ${o}u + outputBlock) * 4u + inputChannel % 4u];
      }`}],Ft,y,w,c,s)}

  ${F.join(`
  `)}
}
`}var Re=[[-1,0],[0,1]],Ri=[[[0],[1,2]],[[0,1],[2]]],me=16;function Xn(i,t,e,r,o,n){let a=E(e.outputChannels),s=o[n],u=o[1-n],p=n===0?0:o[0]*4,l=n===0?o[0]*4:0,c=me*s*a*16,d=new Float32Array(c+9*u*a*16),f=ze(e.weight),g=($,x,k,y)=>$<e.outputChannels&&x<e.inputChannels?f[(($*e.inputChannels+x)*3+k)*3+y]:0;for(let $=0;$<a*4;$++){let x=$>>2,k=$&3;for(let y=0;y<s*4;y++)for(let w=0;w<4;w++)for(let b=0;b<4;b++){let v=0;for(let S of Ri[w>>1][b>>1])for(let T of Ri[w&1][b&1])v+=g($,p+y,S,T);let I=((w*4+b)*s+(y>>2))*a+x;d[I*16+(y&3)*4+k]=v}for(let y=0;y<u*4;y++)for(let w=0;w<9;w++){let b=(w*u+(y>>2))*a+x;d[c+b*16+(y&3)*4+k]=g($,l+y,w/3|0,w%3)}}let h;if(r==="fp16"){let $=new Uint16Array(d.length);for(let x=0;x<d.length;x++)$[x]=Fi(d[x]);h=new Uint8Array($.buffer)}else h=new Uint8Array(d.buffer);let m=new Float32Array(a*4);m.set(ze(e.bias));let _=_e(i,`oidn/${t}/weights/${r}/subpixel`,h,Q.STORAGE);try{return{weights:_,weightLayout:"k-major",bias:_e(i,`oidn/${t}/bias`,new Uint8Array(m.buffer),Q.STORAGE)}}catch($){throw _.destroy(),$}}function Hn(i,t,e,r,o,n,a,s,u){let p=o.size,l=u?2:1,c=o.componentType,d=o.resultType,f=Qt,g=te,h=f+2,m=g+2,_=f/2+2,$=g/2+2,x=p/4,k=a[s],y=a[1-s],w=Math.ceil(k/x),b=Math.ceil(y/x),v=n*p,I=g/2,S=f/2/p,T=Nt*o.subgroupSize,U=R(i),G=R(t),{left:ot,right:et,load:pt,store:j,multiplyAdd:tt,declare:bt,extensions:Ft}=Hi(o),F=(M,L,K)=>`acc${M}_${L}_${K}`,V=[];for(let M=0;M<I;M++)for(let L=0;L<S;L++)for(let K=0;K<n;K++)V.push(bt(F(M,L,K)));let Et=(M,L)=>{let K=[];for(let _t=0;_t<I;_t++)for(let he=0;he<S;he++)K.push(`{
        let a = ${pt(ot,"inputTile",`inputTileBase + ${M(_t,he)}`,L)};
        ${Array.from({length:n},(ga,cr)=>`${F(_t,he,cr)} = ${tt}(a, b${cr}, ${F(_t,he,cr)});`).join(`
        `)}
      }`);return K.join(`
      `)},Yt=M=>Array.from({length:n},(L,K)=>`let b${K} = ${pt(et,"weightTile",`weightTileBase + ${M} * ${p*v}u + ${K*p}u`,`${v}u`)};`).join(`
      `),Gt=(M,L,K)=>`(${K} * params.source${M}Width + ${L}) * ${a[M]}u`,Xt=Math.max(m*h,$*_)*x,O=me*p*v/4,Y=(M,L,K)=>({array:"weightTile",vectors:M*p*v/4,stride:O,read:`let quad = i % ${v/4}u;
      let row = i / ${v/4}u;
      let matrix = row / ${p}u;
      let inputChannel = stageChunk * ${p}u + row % ${p}u;
      let outputBlock = blockBase + quad;
      if (inputChannel < ${L*4}u && outputBlock < ${r}u) {
        value = weights[${K}u + ((matrix * ${L}u + inputChannel / 4u) * ${r}u + outputBlock) * 4u + inputChannel % 4u];
      }`}),D=(M,L,K)=>({array:"inputTile",vectors:M*L*x,stride:Xt,read:`let pixel = i / ${x}u;
      let block = stageChunk * ${x}u + i % ${x}u;
      ${K}`}),X=`let inputX = i32(tileX / 2u + pixel % ${_}u) - 1;
      let inputY = i32(tileY / 2u + pixel / ${_}u) - 1;
      if (block < ${k}u && inputX >= 0 && inputY >= 0 &&
          inputX < i32(params.source${s}Width) && inputY < i32(params.source${s}Height)) {
        value = input${s}[${Gt(s,"u32(inputX)","u32(inputY)")} + block];
      }`,At=1-s,kt=`let inputX = i32(tileX + pixel % ${h}u) - 1;
      let inputY = i32(tileY + pixel / ${h}u) - 1;
      if (block < ${y}u && inputX >= 0 && inputY >= 0 &&
          inputX < i32(params.outputWidth) && inputY < i32(params.outputHeight)) {
        value = input${At}[${Gt(At,"u32(inputX)","u32(inputY)")} + block];
      }`,mt=[];for(let M=0;M<2;M++)for(let L=0;L<2;L++)mt.push(`{
      let matrix = phase * 4u + ${M*2+L}u;
      let offsetY = select(${Re[0][M]+1}u, ${Re[1][M]+1}u, phaseY == 1u);
      let offsetX = select(${Re[0][L]+1}u, ${Re[1][L]+1}u, phaseX == 1u);
      ${Yt("matrix")}
      ${Et((K,_t)=>`((${K}u + offsetY) * ${_}u + ${_t*p}u + offsetX) * ${p}u`,`${p}u`)}
    }`);let fe=`let ky = tap / 3u;
      let kx = tap % 3u;
      ${Yt("tap")}
      ${Et((M,L)=>`((phaseY + ${M*2}u + ky) * ${h}u + phaseX + kx + ${L*p*2}u) * ${p}u`,`${p*2}u`)}`,ln=Vi(o,fe),li=[];for(let M=0;M<I;M++)for(let L=0;L<n;L++)li.push(`{
    ${Array.from({length:S},(K,_t)=>j("resultTile",`resultBase + ${_t*p*p}u`,F(M,_t,L),`${p}u`)).join(`
    `)}
    workgroupBarrier();
    let outputY = tileY + phaseY + ${M*2}u;
    for (var e = lane; e < ${f/2*x}u; e += ${o.subgroupSize}u) {
      let pixel = e / ${x}u;
      let outputX = tileX + phaseX + pixel * 2u;
      let outputBlock = blockBase + ${L*x}u + e % ${x}u;
      if (outputX < params.outputWidth && outputY < params.outputHeight && outputBlock < ${r}u) {
        let base = resultBase + pixel * ${p}u + (e % ${x}u) * 4u;
        let acc = vec4<f32>(f32(resultTile[base]), f32(resultTile[base + 1u]),
          f32(resultTile[base + 2u]), f32(resultTile[base + 3u])) + bias[outputBlock];
        outputData[(outputY * params.outputWidth + outputX) * ${r}u + outputBlock] = ${nt(lt("acc",e),t)};
      }
    }
    workgroupBarrier();
  }`);return`${i==="fp16"||t==="fp16"||c==="f16"||d==="f16"?`enable f16;
`:""}${Ft}
struct Params {
  outputWidth: u32,
  outputHeight: u32,
  outputBlocks: u32,
  inputBlocks: u32,
  source0Width: u32,
  source0Height: u32,
  source1Width: u32,
  source1Height: u32,
}
@group(0) @binding(0) var<storage, read> input0: array<${U}>;
@group(0) @binding(1) var<storage, read> input1: array<${U}>;
@group(0) @binding(2) var<storage, read> weights: array<${U}>;
@group(0) @binding(3) var<storage, read> bias: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> outputData: array<${G}>;
@group(0) @binding(5) var<uniform> params: Params;

var<workgroup> inputTile: array<${c}, ${l*Xt*4}>;
var<workgroup> weightTile: array<${c}, ${l*O*4}>;
var<workgroup> resultTile: array<${d}, ${Nt*(f/2)*p}>;

@compute @workgroup_size(${T})
fn main(
  @builtin(local_invocation_index) localIndex: u32,
  @builtin(workgroup_id) workgroupId: vec3<u32>,
  @builtin(subgroup_id) subgroup: u32,
  @builtin(subgroup_invocation_id) lane: u32
) {
  let tileX = workgroupId.x * ${f}u;
  let tileY = workgroupId.y * ${g}u;
  let blockBase = workgroupId.z * ${v/4}u;
  let phase = subgroup;
  let phaseY = subgroup >> 1u;
  let phaseX = subgroup & 1u;
  let resultBase = subgroup * ${f/2*p}u;
  ${V.join(`
  `)}

  ${Pr(w,[D($,_,X),Y(me,k,0)],mt.join(`
    `),T,U,c,u)}

  ${Pr(b,[D(m,h,kt),Y(9,y,me*k*r*4)],ln,T,U,c,u)}

  ${li.join(`
  `)}
}
`}function Vn(i){return i.op==="concat"?i.inputs:i.op==="fusedUpsampleConcatConv2d"?i.inputs.map(t=>t.value):[i.input]}function ji(i,t="auto"){let e=i.features.has("shader-f16");if(t==="fp16"&&!e)throw new Error("OIDN FP16 was requested but the OIDNGPUDevice does not have shader-f16 enabled");return t==="auto"?e?"fp16":"fp32":t}var Fe=class{_device;usedKernels=new Set;get weightBuffers(){return[...this._packedConvs.values()].flatMap(t=>[t.weights,t.bias])}precision;kernelSetting;gemm;maxSpatialInputBlocks;subgroupsAvailable;subgroupMatrix;subgroupMatrixOutputFragments;subgroupMatrixSubPixel;subgroupMatrixDoubleBuffer;_subgroupMatrixFixedFragments;_model;_gemmByOutputBlocks=new Map;_packedConvs=new Map;_pipelineCache;_executionCache=new Map;_retiredExecutions=new Set;_clock=0;_shapeCacheSize;_profileNextExecution=!1;_profileOperations=0;_resources=new Zt;_disposed=!1;constructor(t,e,r={}){this._device=t,this._pipelineCache=bn(t),this.precision=ji(t,r.precision??"auto"),this.kernelSetting=r.kernel??"auto";let o=r.gemm?.workgroupSize??[8,8];if(this.gemm=Object.freeze({tilePolicy:r.gemm?.tilePolicy??(r.gemm?.workgroupSize?"fixed":"output-aligned"),decoderLoad:r.gemm?.decoderLoad??"per-load",decoderSubPixel:r.gemm?.decoderSubPixel??this.precision==="fp16",unrollRows:r.gemm?.unrollRows??!1,poolLayout:r.gemm?.poolLayout??"channels",sharedLayout:r.gemm?.sharedLayout??(this.precision==="fp16"?"padded-input":"padded"),accumulationOrder:r.gemm?.accumulationOrder??"k-major",finalLayer:r.gemm?.finalLayer??"shared-auto",loadMode:r.gemm?.loadMode??"native",addressMode:r.gemm?.addressMode??"incremental",weightLayout:r.gemm?.weightLayout??"k-major",rowsPerThread:r.gemm?.rowsPerThread??8,workgroupSize:Object.freeze([o[0],o[1]])}),!["fixed","output-aligned"].includes(this.gemm.tilePolicy))throw new Error(`Unsupported GEMM tile policy: ${this.gemm.tilePolicy}`);if(!["per-load","source-first"].includes(this.gemm.decoderLoad))throw new Error(`Unsupported GEMM decoder load: ${this.gemm.decoderLoad}`);if(!["spatial","channels"].includes(this.gemm.poolLayout))throw new Error(`Unsupported GEMM pool layout: ${this.gemm.poolLayout}`);if(!["linear","padded","padded-input","padded-weights"].includes(this.gemm.sharedLayout))throw new Error(`Unsupported GEMM shared layout: ${this.gemm.sharedLayout}`);if(!["k-major","row-major"].includes(this.gemm.accumulationOrder))throw new Error(`Unsupported GEMM accumulation order: ${this.gemm.accumulationOrder}`);if(!["direct","shared-input","shared-input-weights","shared-auto"].includes(this.gemm.finalLayer))throw new Error(`Unsupported GEMM final layer: ${this.gemm.finalLayer}`);if(!["native","packed-weights","packed-all"].includes(this.gemm.loadMode))throw new Error(`Unsupported GEMM load mode: ${this.gemm.loadMode}`);if(!["analytic","incremental","base-offset"].includes(this.gemm.addressMode))throw new Error(`Unsupported GEMM address mode: ${this.gemm.addressMode}`);if(!["output-major","k-major"].includes(this.gemm.weightLayout))throw new Error(`Unsupported GEMM weight layout: ${this.gemm.weightLayout}`);let n=ct(this.gemm),a=($t(this.gemm).input+$t(this.gemm).weights)*4*(this.precision==="fp16"?2:4);if(![2,4,8].includes(n.rowsPerThread)||![4,8,16].includes(n.workgroupX)||![4,8].includes(n.workgroupY)||o.length!==2||n.workgroupX>t.limits.maxComputeWorkgroupSizeX||n.workgroupY>t.limits.maxComputeWorkgroupSizeY||n.workgroupX*n.workgroupY>t.limits.maxComputeInvocationsPerWorkgroup||a>t.limits.maxComputeWorkgroupStorageSize)throw new Error("Unsupported GEMM tile configuration for this OIDNGPUDevice");this.subgroupsAvailable=t.features.has("subgroups");let s=r.subgroupMatrix??{},u=this.kernelSetting==="subgroup-matrix"?Xi(t,s.accumulation):void 0;this.subgroupMatrixOutputFragments=u?Fn(u,s):0,this.subgroupMatrixSubPixel=s.subPixel??!0,this._subgroupMatrixFixedFragments=s.outputFragments!==void 0;let p=c=>u!==void 0&&Yn(u,this.subgroupMatrixOutputFragments,this.subgroupMatrixSubPixel,c)<=t.limits.maxComputeWorkgroupStorageSize;if(u&&s.outputFragments===void 0&&!p(!1)&&(this.subgroupMatrixOutputFragments=1),this.subgroupMatrixDoubleBuffer=(s.doubleBuffer??!1)&&p(!0),u&&Nt*u.subgroupSize<=t.limits.maxComputeInvocationsPerWorkgroup&&Nt*u.subgroupSize<=t.limits.maxComputeWorkgroupSizeX&&p(this.subgroupMatrixDoubleBuffer)&&(this.subgroupMatrix=u),this.maxSpatialInputBlocks=this.precision==="fp16"&&t.limits.maxComputeInvocationsPerWorkgroup>=H*H&&t.limits.maxComputeWorkgroupSizeX>=H&&t.limits.maxComputeWorkgroupSizeY>=H?Math.floor(t.limits.maxComputeWorkgroupStorageSize/(st*st*4*2)):0,this._shapeCacheSize=Math.max(1,r.shapeCacheSize??2),e.inputChannels%3!==0||e.inputChannels<3||e.inputChannels>9)throw new Error(`Native OIDN expects 3, 6, or 9 input channels, got ${e.inputChannels}`);this._model={spec:e.spec,inputChannels:e.inputChannels,outputChannels:e.outputChannels,channelsByValue:new Map(e.channelsByValue),convChannels:new Map(e.convChannels)};let l=new Map;for(let c of qt(this._model,{fuseConvPool:this._matrixPool()}).nodes){if(c.op==="fusedUpsampleConcatConv2d"){let d=this._subPixelDecoder(c);d&&l.set(c.conv.id,d)}if(c.op!=="conv2d"&&c.op!=="maxPool2d"&&c.op!=="fusedConvReluMaxPool2d"&&c.op!=="fusedUpsampleConcatConv2d")throw new Error(`Native OIDN descriptor ${e.spec.id} leaves unsupported ${c.op} node ${c.id} after graph optimization`)}try{for(let[c,d]of e.convTensors){let f=this._selectConvKernel(E(d.inputChannels),c===e.spec.output),g=f==="implicit-gemm"?this.gemm.weightLayout:f==="subgroup-matrix"?"k-major":"output-major",h=l.get(c),m=h?Xn(t,c,d,this.precision,h.sourceBlocks,h.upsampledSource):In(t,c,d,this.precision,g);this._resources.track("gpu-buffer",m.weights),this._resources.track("gpu-buffer",m.bias),this._packedConvs.set(c,m)}}catch(c){for(let d of this._packedConvs.values())this._releaseBuffer(d.weights),this._releaseBuffer(d.bias);throw this._packedConvs.clear(),c}}_pipeline(t,e){let r=this._pipelineCache.get(t);return r||(r=this._device.createComputePipeline({label:`oidn/${t}`,layout:"auto",compute:{module:this._device.createShaderModule({label:`oidn/${t}`,code:e}),entryPoint:"main"}}),this._pipelineCache.set(t,r)),r}_nodePipelineSpec(t,e,r=this.subgroupMatrixOutputFragments){if(t.op==="conv2d"){let o=e?"fp32":this.precision,n=E(this._model.convChannels.get(t.id).inputChannels),a=E(this._model.convChannels.get(t.id).outputChannels),s=this._gemmForOutput(a),u=this._selectConvKernel(n,e),p=s.finalLayer==="shared-input-weights"||s.finalLayer==="shared-auto"&&Sr(this.precision,n,!0)<=this._device.limits.maxComputeWorkgroupStorageSize;return u!=="subgroup-matrix"&&e&&this._model.convChannels.get(t.id).outputChannels===3&&(this.kernelSetting==="auto"||this.kernelSetting==="implicit-gemm"||this.kernelSetting==="subgroup-matrix")&&s.finalLayer!=="direct"&&this._device.limits.maxComputeWorkgroupSizeX>=8&&this._device.limits.maxComputeWorkgroupSizeY>=8&&this._device.limits.maxComputeInvocationsPerWorkgroup>=64&&Sr(this.precision,n,p)<=this._device.limits.maxComputeWorkgroupStorageSize?{key:`conv-final-rgb/${this.precision}/${t.activation}/in${n}/weights-${p?"shared":"storage"}`,kernel:"direct",code:Ni(this.precision,t.activation,n,p)}:u==="subgroup-matrix"?this._subgroupMatrixSpec(`conv/${t.activation}/in${n}/out${a}`,o,t.activation,n,a,r):{key:`conv-${u}/${this.precision}/${o}/${t.activation}/in${n}/out${a}`+(u==="implicit-gemm"?`/address-${s.addressMode}/weights-${s.weightLayout}-v1/tile-${s.workgroupSize.join("x")}-r${s.rowsPerThread}/loads-${s.loadMode}/shared-${s.sharedLayout}/acc-${s.accumulationOrder}/unroll-${Number(s.unrollRows)}`:""),kernel:u,code:u==="implicit-gemm"?An(this.precision,o,t.activation,n,a,s):u==="spatial"?En(this.precision,o,t.activation,n,a):u==="subgroup"?Cn(this.precision,o,t.activation,n,a):Pn(this.precision,o,t.activation,n,a)}}if(t.op==="maxPool2d"){let o=E(this._model.channelsByValue.get(t.id)),n=this._coalescedPool();return{key:`max-pool/${this.precision}/out${o}/${n?"channels":"spatial"}`,kernel:"direct",code:Mn(this.precision,o,n)}}if(t.op==="fusedConvReluMaxPool2d"){let o=E(this._model.convChannels.get(t.conv.id).inputChannels),n=E(this._model.convChannels.get(t.conv.id).outputChannels);return this._matrixPool()?this._subgroupMatrixSpec(`conv-pool/${t.conv.activation}/in${o}/out${n}`,this.precision,t.conv.activation,o,n,r,void 0,!0):{key:`conv-pool/${this.precision}/${t.conv.activation}/in${o}/out${n}`,kernel:"direct",code:On(this.precision,t.conv.activation,o,n)}}if(t.op==="fusedUpsampleConcatConv2d"){if(t.inputs.length!==2)throw new Error(`Native fused decoder ${t.id} requires two inputs`);let o=t.inputs.map(f=>E(this._model.channelsByValue.get(f.value))),n=t.inputs.findIndex(f=>f.upsample);if(n!==0&&n!==1)throw new Error(`Native fused decoder ${t.id} has no upsample input`);let a=o[0]+o[1],s=e?"fp32":this.precision,u=this._selectConvKernel(a,e),p=u==="subgroup"?"direct":u,l=E(this._model.convChannels.get(t.conv.id).outputChannels);if(p==="subgroup-matrix"&&this._subPixelDecoder(t)){let f=this.subgroupMatrix;return{key:`subgroup-matrix-subpixel/${this.precision}/${s}/${f.dialect}/${f.componentType}-${f.resultType}-${f.size}-sg${f.subgroupSize}/n${r}${this.subgroupMatrixDoubleBuffer?"-db":""}/${t.conv.activation}/${o.join("+")}/out${l}/up${n}`,kernel:"subgroup-matrix",code:Hn(this.precision,s,t.conv.activation,l,f,r,o,n,this.subgroupMatrixDoubleBuffer)}}if(p==="subgroup-matrix")return this._subgroupMatrixSpec(`decoder/${t.conv.activation}/${o.join("+")}/out${l}/up${n}`,s,t.conv.activation,a,l,r,{sourceBlocks:o,upsampledSource:n});let c=this._gemmForOutput(l);return{key:`decoder-${p}${p==="implicit-gemm"&&this._subPixelDecoder(t)?"-subpixel":""}/${this.precision}/${s}/${t.conv.activation}/${o.join("+")}/out${l}/up${n}`+(p==="implicit-gemm"?`/address-${c.addressMode}/weights-${c.weightLayout}-v1/tile-${c.workgroupSize.join("x")}-r${c.rowsPerThread}/loads-${c.loadMode}/shared-${c.sharedLayout}/acc-${c.accumulationOrder}/unroll-${Number(c.unrollRows)}/decoder-${c.decoderLoad}`:""),kernel:p,code:p==="implicit-gemm"?(this._subPixelDecoder(t)?Ln:Nn)(this.precision,s,t.conv.activation,o,n,l,c):p==="spatial"?Dn(this.precision,s,t.conv.activation,o,n,l):Un(this.precision,s,t.conv.activation,o,n,l)}}throw new Error(`Native OIDN does not implement unfused ${t.op} node ${t.id}`)}_subPixelDecoder(t){if(t.id===this._model.spec.output||t.inputs.length!==2)return;let e=this._selectConvKernel(E(this._model.convChannels.get(t.conv.id).inputChannels),!1);if(!(e==="subgroup-matrix"&&this.subgroupMatrixSubPixel)&&!(e==="implicit-gemm"&&this.gemm.decoderSubPixel&&this.gemm.weightLayout==="k-major"))return;let r=t.inputs[0].upsample?0:t.inputs[1].upsample?1:-1;if(r!==-1)return{sourceBlocks:t.inputs.map(o=>E(this._model.channelsByValue.get(o.value))),upsampledSource:r}}_subgroupMatrixSpec(t,e,r,o,n,a,s,u=!1){let p=this.subgroupMatrix;return{key:`subgroup-matrix/${this.precision}/${e}/${p.dialect}/${p.componentType}-${p.resultType}-${p.size}-sg${p.subgroupSize}/n${a}${this.subgroupMatrixDoubleBuffer?"-db":""}/${t}`,kernel:"subgroup-matrix",code:Gn(this.precision,e,r,o,n,p,a,this.subgroupMatrixDoubleBuffer,s,u)}}_subgroupMatrixFragmentsFor(t){let e=Math.min(this.subgroupMatrixOutputFragments,Math.ceil(E(t.channels)*4/this.subgroupMatrix.size));return this._subgroupMatrixFixedFragments||e===1?e:Math.ceil(t.width/Qt)*Math.ceil(t.height/te)*Math.ceil(E(t.channels)*4/(e*this.subgroupMatrix.size))<zn?1:e}_gemmForOutput(t){if(this.gemm.tilePolicy!=="output-aligned"||this.gemm.workgroupSize[0]!==8||t<=0||t%16!==0)return this.gemm;let e=this._gemmByOutputBlocks.get(t);if(e)return e;let r=Object.freeze({...this.gemm,workgroupSize:Object.freeze([16,this.gemm.workgroupSize[1]])}),o=ct(r),n=$t(r),a=this._device.limits,u=o.workgroupX<=a.maxComputeWorkgroupSizeX&&o.workgroupY<=a.maxComputeWorkgroupSizeY&&o.workgroupX*o.workgroupY<=a.maxComputeInvocationsPerWorkgroup&&(n.input+n.weights)*4*(this.precision==="fp16"?2:4)<=a.maxComputeWorkgroupStorageSize?r:this.gemm;return this._gemmByOutputBlocks.set(t,u),u}_matrixPool(){let t=this.subgroupMatrix;return this._model.spec.family==="oidn-unet-large"&&this.precision==="fp16"&&t?.dialect==="naga"&&t.size===8&&t.subgroupSize===32&&t.componentType==="f16"&&t.resultType==="f32"}_coalescedPool(){return this.gemm.poolLayout==="channels"&&(this.kernelSetting==="auto"||this.kernelSetting==="implicit-gemm"||this.kernelSetting==="subgroup-matrix")}_selectConvKernel(t,e){let r=this.precision==="fp16"&&t<=this.maxSpatialInputBlocks;return this.kernelSetting==="direct"?"direct":this.kernelSetting==="spatial"?r?"spatial":"direct":this.kernelSetting==="implicit-gemm"?e?"direct":"implicit-gemm":this.kernelSetting==="subgroup"?this.subgroupsAvailable?"subgroup":"direct":this.kernelSetting==="subgroup-matrix"?e?this.subgroupMatrix?.dialect==="naga"?"subgroup-matrix":"direct":this.subgroupMatrix?"subgroup-matrix":"implicit-gemm":e?"direct":"implicit-gemm"}_nodePipeline(t,e){let{key:r,code:o}=this._nodePipelineSpec(t,e);return this._pipeline(r,o)}_createExecution(t,e){let r=this._matrixPool(),o=Ir(this._model,t,e,{fuseConvPool:r}),n=new Map,a=[],s=[],u=new Map;o.nodes.forEach((c,d)=>{for(let f of Vn(c))u.set(f,d)}),u.set(o.spec.output,o.nodes.length);let p=[],l=c=>(p.push(c),this._resources.track("gpu-buffer",c));try{let c=(y,w,b,v)=>{let I=kn(w,b),S=s.filter(U=>U.lastUse<v),T=S.filter(U=>U.capacity>=I).sort((U,G)=>U.capacity-G.capacity)[0];!T&&r&&(T=S.sort((U,G)=>G.capacity-U.capacity)[0]),T||(T={capacity:0,lastUse:-2,values:[]},s.push(T)),T.capacity=Math.max(T.capacity,I),T.lastUse=u.get(y)??-1,T.values.push(y)};c(o.spec.input,o.inputShape,this.precision==="fp16"?2:4,-1),o.plannedNodes.forEach(({node:y,outputShape:w},b)=>{let v=y.id===o.spec.output;c(y.id,w,v||this.precision==="fp32"?4:2,b)}),s.forEach((y,w)=>{let b=l(this._device.createBuffer({label:`oidn/activation/${t}x${e}/${w}`,size:Er(y.capacity,4),usage:Q.STORAGE|Q.COPY_SRC|Q.COPY_DST}));a.push({buffer:b,capacity:y.capacity});for(let v of y.values)n.set(v,b)});let d=this._model.inputChannels/3,f=`pack/${this.precision}/${d}`,g=this._pipeline(f,Or(this.precision,d)),h=[],m=[],_=[],$=[],x=[];o.plannedNodes.forEach(({node:y,outputShape:w},b)=>{let v=y.id===o.spec.output,I=this.subgroupMatrix?this._subgroupMatrixFragmentsFor(w):0,S=this._nodePipelineSpec(y,v,I);S.kernel&&this.usedKernels.add(S.kernel);let T=this._pipeline(S.key,S.code);h.push(T),m.push(S.kernel??"direct"),_.push(S.kernel==="subgroup-matrix"?I:0);let U=n.get(y.id),G,ot,et;if(y.op==="conv2d"){let j=o.valueShapes.get(y.input);et=y.id,ot=[j.width,j.height,w.width,w.height,E(j.channels),E(w.channels)];let tt=this._packedConvs.get(et);G=[{binding:0,resource:{buffer:n.get(y.input)}},{binding:1,resource:{buffer:tt.weights}},{binding:2,resource:{buffer:tt.bias}},{binding:3,resource:{buffer:U}}]}else if(y.op==="maxPool2d"){let j=o.valueShapes.get(y.input);ot=[j.width,j.height,w.width,w.height,E(w.channels)],G=[{binding:0,resource:{buffer:n.get(y.input)}},{binding:1,resource:{buffer:U}}]}else if(y.op==="fusedConvReluMaxPool2d"){let j=o.valueShapes.get(y.input);et=y.conv.id,ot=[j.width,j.height,w.width,w.height,E(j.channels),E(w.channels)];let tt=this._packedConvs.get(et);G=[{binding:0,resource:{buffer:n.get(y.input)}},{binding:1,resource:{buffer:tt.weights}},{binding:2,resource:{buffer:tt.bias}},{binding:3,resource:{buffer:U}}]}else if(y.op==="fusedUpsampleConcatConv2d"){et=y.conv.id;let j=o.valueShapes.get(y.inputs[0].value),tt=o.valueShapes.get(y.inputs[1].value);ot=[w.width,w.height,E(w.channels),E(this._model.convChannels.get(et).inputChannels),j.width,j.height,tt.width,tt.height];let bt=this._packedConvs.get(et);G=[{binding:0,resource:{buffer:n.get(y.inputs[0].value)}},{binding:1,resource:{buffer:n.get(y.inputs[1].value)}},{binding:2,resource:{buffer:bt.weights}},{binding:3,resource:{buffer:bt.bias}},{binding:4,resource:{buffer:U}}]}else throw new Error(`Unexpected native node ${y.op}`);let pt=l(Di(this._device,`oidn/${y.id}/params/${t}x${e}`,ot));x.push(pt),G.push({binding:G.length,resource:{buffer:pt}}),$.push(this._device.createBindGroup({label:`oidn/${y.id}/bindings`,layout:T.getBindGroupLayout(0),entries:G}))});let k=l(Di(this._device,`oidn/input/params/${t}x${e}`,[t,e,E(this._model.inputChannels),this._model.inputChannels]));return x.push(k),{plan:o,valueBuffers:n,slots:a,nodeBindings:$,nodePipelines:h,nodeKernels:m,nodeFragments:_,inputPipeline:g,inputUniform:k,ownedBuffers:x,lastUsed:++this._clock}}catch(c){for(let d of p)this._releaseBuffer(d);throw c}}_execution(t,e){if(this._disposed)throw new Error("Native OIDN executor is disposed");let r=`${t}x${e}`,o=this._executionCache.get(r);if(!o&&(o=this._createExecution(t,e),this._executionCache.set(r,o),this._executionCache.size>this._shapeCacheSize)){let n=[...this._executionCache.entries()].filter(([a])=>a!==r).sort((a,s)=>a[1].lastUsed-s[1].lastUsed)[0];n&&(this._executionCache.delete(n[0]),this._retireExecution(n[1]))}return o.lastUsed=++this._clock,o}_retireExecution(t){this._destroyExecution(t)}prewarm(t){for(let e of t)this._execution(e.width,e.height)}profileNextExecution(){return this._device.features.has("timestamp-query")?(this._profileNextExecution=!0,!0):!1}packedInputBuffer(t,e){let r=this._execution(t,e);return r.valueBuffers.get(r.plan.spec.input)}executePacked(t,e){return this._execute([],t,e,!0)}execute(t,e,r){return this._execute(t,e,r,!1)}_execute(t,e,r,o){let n=this._model.inputChannels/3;if(!o&&t.length!==n)throw new Error(`Native OIDN expected ${n} input buffers, got ${t.length}`);let a=this._execution(e,r),s=[...o?[]:["input-pack"],...a.plan.nodes.map(h=>h.id)],u=this._profileNextExecution&&this._device.features.has("timestamp-query");this._profileNextExecution=!1;let p=s.length*2,l=u?this._resources.track("gpu-query-set",this._device.createQuerySet({type:"timestamp",count:p})):void 0,c=p*8,d,f;try{d=u?this._resources.track("gpu-buffer",this._device.createBuffer({label:`oidn/profile/resolve/${e}x${r}`,size:c,usage:Q.QUERY_RESOLVE|Q.COPY_SRC})):void 0,f=u?this._resources.track("gpu-buffer",this._device.createBuffer({label:`oidn/profile/readback/${e}x${r}`,size:c,usage:Q.COPY_DST|Q.MAP_READ})):void 0}catch(h){throw this._releaseBuffer(f),this._releaseBuffer(d),this._releaseQuerySet(l),h}let g=(h,m)=>({label:h,...l?{timestampWrites:{querySet:l,beginningOfPassWriteIndex:m*2,endOfPassWriteIndex:m*2+1}}:{}});try{let h=this._device.createCommandEncoder({label:`oidn/native/${e}x${r}`});if(!o){let m=t.map((x,k)=>({binding:k,resource:{buffer:x}}));m.push({binding:n,resource:{buffer:a.valueBuffers.get(a.plan.spec.input)}}),m.push({binding:n+1,resource:{buffer:a.inputUniform}});let _=this._device.createBindGroup({label:"oidn/input/bindings",layout:a.inputPipeline.getBindGroupLayout(0),entries:m}),$=h.beginComputePass(g("oidn/input-pack",0));$.setPipeline(a.inputPipeline),$.setBindGroup(0,_),$.dispatchWorkgroups(Math.ceil(e/q),Math.ceil(r/q),E(this._model.inputChannels)),$.end()}a.plan.plannedNodes.forEach(({node:m,outputShape:_},$)=>{let x=h.beginComputePass(g(`oidn/${a.plan.nodes[$].id}`,$+(o?0:1)));if(x.setPipeline(a.nodePipelines[$]),x.setBindGroup(0,a.nodeBindings[$]),m.op==="maxPool2d"&&this._coalescedPool()){let k=Math.ceil(_.width*E(_.channels)/q),y=this._device.limits.maxComputeWorkgroupsPerDimension;x.dispatchWorkgroups(Math.min(k,y),Math.ceil(_.height/q),Math.ceil(k/y))}else if(a.nodeKernels[$]==="subgroup-matrix")x.dispatchWorkgroups(Math.ceil(_.width*(m.op==="fusedConvReluMaxPool2d"?2:1)/Qt),Math.ceil(_.height*(m.op==="fusedConvReluMaxPool2d"?2:1)/te),Math.ceil(E(_.channels)/(a.nodeFragments[$]*this.subgroupMatrix.size/4)));else if(a.nodeKernels[$]==="implicit-gemm"){let k=ct(this._gemmForOutput(E(_.channels))),y=m.op==="fusedUpsampleConcatConv2d"&&this._subPixelDecoder(m)!==void 0;x.dispatchWorkgroups(Math.ceil((y?Math.ceil(_.width/2)*Math.ceil(_.height/2):_.width*_.height)/k.tileM),Math.ceil(E(_.channels)/k.tileNBlocks),y?4:1)}else x.dispatchWorkgroups(Math.ceil(_.width/q),Math.ceil(_.height/q),E(_.channels));x.end()}),l&&(h.resolveQuerySet(l,0,p,d,0),h.copyBufferToBuffer(d,0,f,0,c)),this._device.queue.submit([h.finish()])}catch(h){throw this._releaseBuffer(f),this._releaseBuffer(d),this._releaseQuerySet(l),h}return l&&(this._profileOperations++,this._readProfile(l,d,f,s)),a.valueBuffers.get(a.plan.spec.output)}_readProfile(t,e,r,o){this._releaseQuerySet(t),this._releaseBuffer(e),this._releaseBuffer(r),this._profileOperations--}_releaseBuffer(t){this._resources.release("gpu-buffer",t,()=>t.destroy())}_releaseQuerySet(t){this._resources.release("gpu-query-set",t,()=>t.destroy())}_destroyExecution(t){t.slots.forEach(e=>this._releaseBuffer(e.buffer)),t.ownedBuffers.forEach(e=>this._releaseBuffer(e))}getResourceInfo(){return this._resources.snapshot(this._retiredExecutions.size+this._profileOperations)}dispose(){if(!this._disposed){this._disposed=!0;for(let t of this._packedConvs.values())this._releaseBuffer(t.weights),this._releaseBuffer(t.bias);this._packedConvs.clear();for(let t of this._executionCache.values())this._destroyExecution(t);this._executionCache.clear();for(let t of this._retiredExecutions)this._destroyExecution(t);this._retiredExecutions.clear()}}};var Ki=new WeakMap,xe=class extends Fe{_lastExecutionProfile;constructor(t,e,r){super(t,e,r)}execute(t,e,r){return super.execute(t,e,r)}get _asyncDevice(){return this._device}get _pipelinePromises(){let t=Ki.get(this._device);return t||(t=new Map,Ki.set(this._device,t)),t}getLastExecutionProfile(){return this._lastExecutionProfile}_pipelineAsync(t,e){let r=this._pipelineCache.get(t);if(r)return Promise.resolve(r);let o=this._pipelinePromises.get(t);if(o)return o;let n=this._asyncDevice.createComputePipelineAsync({label:`oidn/${t}`,layout:"auto",compute:{module:this._device.createShaderModule({label:`oidn/${t}`,code:e}),entryPoint:"main"}}).then(a=>(this._pipelineCache.set(t,a),this._pipelinePromises.delete(t),a),a=>{throw this._pipelinePromises.delete(t),a});return this._pipelinePromises.set(t,n),n}_retireExecution(t){this._retiredExecutions.add(t),this._asyncDevice.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>{this._retiredExecutions.delete(t),this._destroyExecution(t)})}async prepare(){if(this._disposed)throw new Error("Native OIDN executor is disposed");let t=qt(this._model,{fuseConvPool:!1}),e=this._model.inputChannels/3,r=[{key:`pack/${this.precision}/${e}`,code:Or(this.precision,e)},...t.nodes.map(o=>this._nodePipelineSpec(o,o.id===t.spec.output))];await Promise.all(r.map(({key:o,code:n})=>this._pipelineAsync(o,n)))}_readProfile(t,e,r,o){this._lastExecutionProfile=(async()=>{try{await r.mapAsync(Br.READ);let n=new Uint32Array(r.getMappedRange()),a=u=>n[u*2+1]*4294967296+n[u*2],s=o.map((u,p)=>({id:u,durationMs:(a(p*2+1)-a(p*2))/1e6}));return{totalMs:s.reduce((u,p)=>u+p.durationMs,0),layers:s}}finally{r.mapState==="mapped"&&r.unmap(),this._releaseQuerySet(t),this._releaseBuffer(e),this._releaseBuffer(r),this._profileOperations--}})()}async executeCPU(t,e,r){let o=e*r*this._model.inputChannels;if(t.length!==o)throw new Error(`Native OIDN CPU input has ${t.length} values, expected ${o}`);let n=this._execution(e,r),a=this._model.inputChannels/3,s=e*r;n.cpuInputBuffers||(n.cpuInputBuffers=Array.from({length:a},(d,f)=>{let g=this._device.createBuffer({label:`oidn/cpu-input/${e}x${r}/${f}`,size:s*16,usage:Q.STORAGE|Q.COPY_DST});return this._resources.track("gpu-buffer",g),n.ownedBuffers.push(g),g}),n.cpuReadbackBuffer=this._device.createBuffer({label:`oidn/cpu-readback/${e}x${r}`,size:s*16,usage:Q.COPY_DST|Q.MAP_READ}),this._resources.track("gpu-buffer",n.cpuReadbackBuffer),n.ownedBuffers.push(n.cpuReadbackBuffer));for(let d=0;d<a;d++){let f=new Float32Array(s*4);for(let g=0;g<s;g++){let h=g*this._model.inputChannels+d*3,m=g*4;f[m]=t[h],f[m+1]=t[h+1],f[m+2]=t[h+2]}this._device.queue.writeBuffer(n.cpuInputBuffers[d],0,new Uint8Array(f.buffer,f.byteOffset,f.byteLength))}let u=super.execute(n.cpuInputBuffers,e,r),p=this._device.createCommandEncoder({label:`oidn/cpu-readback/${e}x${r}`});p.copyBufferToBuffer(u,0,n.cpuReadbackBuffer,0,s*16),this._device.queue.submit([p.finish()]),await n.cpuReadbackBuffer.mapAsync(Br.READ);let l=new Float32Array(n.cpuReadbackBuffer.getMappedRange()),c=new Float32Array(s*3);for(let d=0;d<s;d++)c[d*3]=l[d*4],c[d*3+1]=l[d*4+1],c[d*3+2]=l[d*4+2];return n.cpuReadbackBuffer.unmap(),c}};var qi="This is not an object",Zi="This is not a Float16Array object",Mr="This constructor is not a subclass of Float16Array",Ye="The constructor property value is not an object",Ji="Species constructor didn't return TypedArray object",Qi="Derived constructor created TypedArray object which was too small length",re="Attempting to access detached ArrayBuffer",$e="Cannot convert undefined or null to object",Ge="Cannot mix BigInt and other types, use explicit conversions",Nr="@@iterator property is not callable",Lr="Reduce of empty array with no initial value",to="The comparison function must be either a function or undefined",Xe="Offset is out of bounds";function W(i){return(t,...e)=>rt(i,t,e)}function ie(i,t){return W(St(i,t).get)}var{apply:rt,construct:oe,defineProperty:Dr,get:Ve,getOwnPropertyDescriptor:St,getPrototypeOf:ne,has:we,ownKeys:je,set:Rr,setPrototypeOf:Wr}=Reflect,eo=Proxy,{EPSILON:ro,MAX_SAFE_INTEGER:zr,isFinite:Ke,isNaN:wt}=Number,{iterator:at,species:io,toStringTag:qe,for:oo}=Symbol,Lt=Object,{create:ve,defineProperty:Ut,freeze:no,is:Fr}=Lt,Ur=Lt.prototype,ao=Ur.__lookupGetter__?W(Ur.__lookupGetter__):(i,t)=>{if(i==null)throw z($e);let e=Lt(i);do{let r=St(e,t);if(r!==void 0)return yt(r,"get")?r.get:void 0}while((e=ne(e))!==null)},yt=Lt.hasOwn||W(Ur.hasOwnProperty),uo=Array,Yr=uo.isArray,Ze=uo.prototype,so=W(Ze.join),co=W(Ze.push),lo=W(Ze.toLocaleString),be=Ze[at],po=W(be),{abs:fo,trunc:Je}=Math,ae=ArrayBuffer,ho=ae.isView,go=ae.prototype,mo=W(go.slice),_o=ie(go,"byteLength"),He=typeof SharedArrayBuffer<"u"?SharedArrayBuffer:null,yo=He&&ie(He.prototype,"byteLength"),Qe=ne(Uint8Array),jn=Qe.from,Z=Qe.prototype,xo=Z[at],$o=W(Z.keys),wo=W(Z.values),vo=W(Z.entries),bo=W(Z.set),Gr=W(Z.reverse),ko=W(Z.fill),To=W(Z.copyWithin),Xr=W(Z.sort),ue=W(Z.slice),Io=W(Z.subarray),J=ie(Z,"buffer"),Pt=ie(Z,"byteOffset"),C=ie(Z,"length"),Hr=ie(Z,qe),Bo=Uint8Array,it=Uint16Array,Vr=(...i)=>rt(jn,it,i),tr=Uint32Array,So=Float32Array,vt=ne([][at]()),se=W(vt.next),Po=W((function*(){})().next),Co=ne(vt),Eo=DataView.prototype,Ga=W(Eo.getUint16),Xa=W(Eo.setUint16),z=TypeError,er=RangeError,jr=WeakSet,Ao=jr.prototype,Oo=W(Ao.add),Mo=W(Ao.has),ce=WeakMap,Kr=ce.prototype,le=W(Kr.get),No=W(Kr.has),ke=W(Kr.set);var Lo=new ce,Kn=ve(null,{next:{value:function(){let t=le(Lo,this);return se(t)}},[at]:{value:function(){return this}}});function Te(i){if(i[at]===be&&vt.next===se)return i;let t=ve(Kn);return ke(Lo,t,po(i)),t}var Uo=new ce,Do=ve(Co,{next:{value:function(){let t=le(Uo,this);return Po(t)},writable:!0,configurable:!0}});for(let i of je(vt))i!=="next"&&Ut(Do,i,St(vt,i));function qr(i){let t=ve(Do);return ke(Uo,t,i),t}function Dt(i){return i!==null&&typeof i=="object"||typeof i=="function"}function Zr(i){return i!==null&&typeof i=="object"}function Ie(i){return Hr(i)!==void 0}function rr(i){let t=Hr(i);return t==="BigInt64Array"||t==="BigUint64Array"}function qn(i){try{return Yr(i)?!1:(_o(i),!0)}catch{return!1}}function Jr(i){if(He===null)return!1;try{return yo(i),!0}catch{return!1}}function Ro(i){return qn(i)||Jr(i)}function Qr(i){return Yr(i)?i[at]===be&&vt.next===se:!1}function Wo(i){return Ie(i)?i[at]===xo&&vt.next===se:!1}function Be(i){if(typeof i!="string")return!1;let t=+i;return i!==t+""||!Ke(t)?!1:t===Je(t)}var Se=oo("__Float16Array__");function zo(i){if(!Zr(i))return!1;let t=ne(i);if(!Zr(t))return!1;let e=t.constructor;if(e===void 0)return!1;if(!Dt(e))throw z(Ye);return we(e,Se)}var ti=1/ro;function Zn(i){return i+ti-ti}var Yo=6103515625e-14,Jn=65504,Go=.0009765625,Fo=Go*Yo,Qn=Go*ti;function ta(i){let t=+i;if(!Ke(t)||t===0)return t;let e=t>0?1:-1,r=fo(t);if(r<Yo)return e*Zn(r/Fo)*Fo;let o=(1+Qn)*r,n=o-(o-r);return n>Jn||wt(n)?e*(1/0):e*n}var Xo=new ae(4),Ho=new So(Xo),Vo=new tr(Xo),ft=new it(512),ht=new Bo(512);for(let i=0;i<256;++i){let t=i-127;t<-24?(ft[i]=0,ft[i|256]=32768,ht[i]=24,ht[i|256]=24):t<-14?(ft[i]=1024>>-t-14,ft[i|256]=1024>>-t-14|32768,ht[i]=-t-1,ht[i|256]=-t-1):t<=15?(ft[i]=t+15<<10,ft[i|256]=t+15<<10|32768,ht[i]=13,ht[i|256]=13):t<128?(ft[i]=31744,ft[i|256]=64512,ht[i]=24,ht[i|256]=24):(ft[i]=31744,ft[i|256]=64512,ht[i]=13,ht[i|256]=13)}function gt(i){Ho[0]=ta(i);let t=Vo[0],e=t>>23&511;return ft[e]+((t&8388607)>>ht[e])}var ei=new tr(2048);for(let i=1;i<1024;++i){let t=i<<13,e=0;for(;(t&8388608)===0;)t<<=1,e-=8388608;t&=-8388609,e+=947912704,ei[i]=t|e}for(let i=1024;i<2048;++i)ei[i]=939524096+(i-1024<<13);var pe=new tr(64);for(let i=1;i<31;++i)pe[i]=i<<23;pe[31]=1199570944;pe[32]=2147483648;for(let i=33;i<63;++i)pe[i]=2147483648+(i-32<<23);pe[63]=3347054592;var jo=new it(64);for(let i=1;i<64;++i)i!==32&&(jo[i]=1024);function N(i){let t=i>>10;return Vo[0]=ei[jo[t]+(i&1023)]+pe[t],Ho[0]}function xt(i){let t=+i;return wt(t)||t===0?0:Je(t)}function ir(i){let t=xt(i);return t<0?0:t<zr?t:zr}function Pe(i,t){if(!Dt(i))throw z(qi);let e=i.constructor;if(e===void 0)return t;if(!Dt(e))throw z(Ye);let r=e[io];return r??t}function de(i){if(Jr(i))return!1;try{return mo(i,0,0),!1}catch{}return!0}function ri(i,t){let e=wt(i),r=wt(t);if(e&&r)return 0;if(e)return 1;if(r||i<t)return-1;if(i>t)return 1;if(i===0&&t===0){let o=Fr(i,0),n=Fr(t,0);if(!o&&n)return-1;if(o&&!n)return 1}return 0}var ii=2,nr=new ce;function Rt(i){return No(nr,i)||!ho(i)&&zo(i)}function A(i){if(!Rt(i))throw z(Zi)}function or(i,t){let e=Rt(i),r=Ie(i);if(!e&&!r)throw z(Ji);if(typeof t=="number"){let o;if(e){let n=B(i);o=C(n)}else o=C(i);if(o<t)throw z(Qi)}if(rr(i))throw z(Ge)}function B(i){let t=le(nr,i);if(t!==void 0){let o=J(t);if(de(o))throw z(re);return t}let e=i.buffer;if(de(e))throw z(re);let r=oe(ut,[e,i.byteOffset,i.length],i.constructor);return le(nr,r)}function Ko(i){let t=C(i),e=[];for(let r=0;r<t;++r)e[r]=N(i[r]);return e}var qo=new jr;for(let i of je(Z)){if(i===qe)continue;let t=St(Z,i);yt(t,"get")&&typeof t.get=="function"&&Oo(qo,t.get)}var ea=no({get(i,t,e){return Be(t)&&yt(i,t)?N(Ve(i,t)):Mo(qo,ao(i,t))?Ve(i,t):Ve(i,t,e)},set(i,t,e,r){return Be(t)&&yt(i,t)?Rr(i,t,gt(e)):Rr(i,t,e,r)},getOwnPropertyDescriptor(i,t){if(Be(t)&&yt(i,t)){let e=St(i,t);return e.value=N(e.value),e}return St(i,t)},defineProperty(i,t,e){return Be(t)&&yt(i,t)&&yt(e,"value")?(e.value=gt(e.value),Dr(i,t,e)):Dr(i,t,e)}}),ut=class i{constructor(t,e,r){let o;if(Rt(t))o=oe(it,[B(t)],new.target);else if(Dt(t)&&!Ro(t)){let a,s;if(Ie(t)){a=t,s=C(t);let u=J(t);if(de(u))throw z(re);if(rr(t))throw z(Ge);let p=new ae(s*ii);o=oe(it,[p],new.target)}else{let u=t[at];if(u!=null&&typeof u!="function")throw z(Nr);u!=null?Qr(t)?(a=t,s=t.length):(a=[...t],s=a.length):(a=t,s=ir(a.length)),o=oe(it,[s],new.target)}for(let u=0;u<s;++u)o[u]=gt(a[u])}else o=oe(it,arguments,new.target);let n=new eo(o,ea);return ke(nr,n,o),n}static from(t,...e){let r=this;if(!we(r,Se))throw z(Mr);if(r===i){if(Rt(t)&&e.length===0){let l=B(t),c=new it(J(l),Pt(l),C(l));return new i(J(ue(c)))}if(e.length===0)return new i(J(Vr(t,gt)));let u=e[0],p=e[1];return new i(J(Vr(t,function(l,...c){return gt(rt(u,this,[l,...Te(c)]))},p)))}let o,n,a=t[at];if(a!=null&&typeof a!="function")throw z(Nr);if(a!=null)Qr(t)?(o=t,n=t.length):Wo(t)?(o=t,n=C(t)):(o=[...t],n=o.length);else{if(t==null)throw z($e);o=Lt(t),n=ir(o.length)}let s=new r(n);if(e.length===0)for(let u=0;u<n;++u)s[u]=o[u];else{let u=e[0],p=e[1];for(let l=0;l<n;++l)s[l]=rt(u,p,[o[l],l])}return s}static of(...t){let e=this;if(!we(e,Se))throw z(Mr);let r=t.length;if(e===i){let n=new i(r),a=B(n);for(let s=0;s<r;++s)a[s]=gt(t[s]);return n}let o=new e(r);for(let n=0;n<r;++n)o[n]=t[n];return o}keys(){A(this);let t=B(this);return $o(t)}values(){A(this);let t=B(this);return qr((function*(){for(let e of wo(t))yield N(e)})())}entries(){A(this);let t=B(this);return qr((function*(){for(let[e,r]of vo(t))yield[e,N(r)]})())}at(t){A(this);let e=B(this),r=C(e),o=xt(t),n=o>=0?o:r+o;if(!(n<0||n>=r))return N(e[n])}with(t,e){A(this);let r=B(this),o=C(r),n=xt(t),a=n>=0?n:o+n,s=+e;if(a<0||a>=o)throw er(Xe);let u=new it(J(r),Pt(r),C(r)),p=new i(J(ue(u))),l=B(p);return l[a]=gt(s),p}map(t,...e){A(this);let r=B(this),o=C(r),n=e[0],a=Pe(r,i);if(a===i){let u=new i(o),p=B(u);for(let l=0;l<o;++l){let c=N(r[l]);p[l]=gt(rt(t,n,[c,l,this]))}return u}let s=new a(o);or(s,o);for(let u=0;u<o;++u){let p=N(r[u]);s[u]=rt(t,n,[p,u,this])}return s}filter(t,...e){A(this);let r=B(this),o=C(r),n=e[0],a=[];for(let p=0;p<o;++p){let l=N(r[p]);rt(t,n,[l,p,this])&&co(a,l)}let s=Pe(r,i),u=new s(a);return or(u),u}reduce(t,...e){A(this);let r=B(this),o=C(r);if(o===0&&e.length===0)throw z(Lr);let n,a;e.length===0?(n=N(r[0]),a=1):(n=e[0],a=0);for(let s=a;s<o;++s)n=t(n,N(r[s]),s,this);return n}reduceRight(t,...e){A(this);let r=B(this),o=C(r);if(o===0&&e.length===0)throw z(Lr);let n,a;e.length===0?(n=N(r[o-1]),a=o-2):(n=e[0],a=o-1);for(let s=a;s>=0;--s)n=t(n,N(r[s]),s,this);return n}forEach(t,...e){A(this);let r=B(this),o=C(r),n=e[0];for(let a=0;a<o;++a)rt(t,n,[N(r[a]),a,this])}find(t,...e){A(this);let r=B(this),o=C(r),n=e[0];for(let a=0;a<o;++a){let s=N(r[a]);if(rt(t,n,[s,a,this]))return s}}findIndex(t,...e){A(this);let r=B(this),o=C(r),n=e[0];for(let a=0;a<o;++a){let s=N(r[a]);if(rt(t,n,[s,a,this]))return a}return-1}findLast(t,...e){A(this);let r=B(this),o=C(r),n=e[0];for(let a=o-1;a>=0;--a){let s=N(r[a]);if(rt(t,n,[s,a,this]))return s}}findLastIndex(t,...e){A(this);let r=B(this),o=C(r),n=e[0];for(let a=o-1;a>=0;--a){let s=N(r[a]);if(rt(t,n,[s,a,this]))return a}return-1}every(t,...e){A(this);let r=B(this),o=C(r),n=e[0];for(let a=0;a<o;++a)if(!rt(t,n,[N(r[a]),a,this]))return!1;return!0}some(t,...e){A(this);let r=B(this),o=C(r),n=e[0];for(let a=0;a<o;++a)if(rt(t,n,[N(r[a]),a,this]))return!0;return!1}set(t,...e){A(this);let r=B(this),o=xt(e[0]);if(o<0)throw er(Xe);if(t==null)throw z($e);if(rr(t))throw z(Ge);if(Rt(t))return bo(B(this),B(t),o);if(Ie(t)){let u=J(t);if(de(u))throw z(re)}let n=C(r),a=Lt(t),s=ir(a.length);if(o===1/0||s+o>n)throw er(Xe);for(let u=0;u<s;++u)r[u+o]=gt(a[u])}reverse(){A(this);let t=B(this);return Gr(t),this}toReversed(){A(this);let t=B(this),e=new it(J(t),Pt(t),C(t)),r=new i(J(ue(e))),o=B(r);return Gr(o),r}fill(t,...e){A(this);let r=B(this);return ko(r,gt(t),...Te(e)),this}copyWithin(t,e,...r){A(this);let o=B(this);return To(o,t,e,...Te(r)),this}sort(t){A(this);let e=B(this),r=t!==void 0?t:ri;return Xr(e,(o,n)=>r(N(o),N(n))),this}toSorted(t){A(this);let e=B(this);if(t!==void 0&&typeof t!="function")throw new z(to);let r=t!==void 0?t:ri,o=new it(J(e),Pt(e),C(e)),n=new i(J(ue(o))),a=B(n);return Xr(a,(s,u)=>r(N(s),N(u))),n}slice(t,e){A(this);let r=B(this),o=Pe(r,i);if(o===i){let g=new it(J(r),Pt(r),C(r));return new i(J(ue(g,t,e)))}let n=C(r),a=xt(t),s=e===void 0?n:xt(e),u;a===-1/0?u=0:a<0?u=n+a>0?n+a:0:u=n<a?n:a;let p;s===-1/0?p=0:s<0?p=n+s>0?n+s:0:p=n<s?n:s;let l=p-u>0?p-u:0,c=new o(l);if(or(c,l),l===0)return c;let d=J(r);if(de(d))throw z(re);let f=0;for(;u<p;)c[f]=N(r[u]),++u,++f;return c}subarray(t,e){A(this);let r=B(this),o=Pe(r,i),n=new it(J(r),Pt(r),C(r)),a=Io(n,t,e),s=new o(J(a),Pt(a),C(a));return or(s),s}indexOf(t,...e){A(this);let r=B(this),o=C(r),n=xt(e[0]);if(n===1/0)return-1;n<0&&(n+=o,n<0&&(n=0));for(let a=n;a<o;++a)if(yt(r,a)&&N(r[a])===t)return a;return-1}lastIndexOf(t,...e){A(this);let r=B(this),o=C(r),n=e.length>=1?xt(e[0]):o-1;if(n===-1/0)return-1;n>=0?n=n<o-1?n:o-1:n+=o;for(let a=n;a>=0;--a)if(yt(r,a)&&N(r[a])===t)return a;return-1}includes(t,...e){A(this);let r=B(this),o=C(r),n=xt(e[0]);if(n===1/0)return!1;n<0&&(n+=o,n<0&&(n=0));let a=wt(t);for(let s=n;s<o;++s){let u=N(r[s]);if(a&&wt(u)||u===t)return!0}return!1}join(t){A(this);let e=B(this),r=Ko(e);return so(r,t)}toLocaleString(...t){A(this);let e=B(this),r=Ko(e);return lo(r,...Te(t))}get[qe](){if(Rt(this))return"Float16Array"}};Ut(ut,"BYTES_PER_ELEMENT",{value:ii});Ut(ut,Se,{});Wr(ut,Qe);var ar=ut.prototype;Ut(ar,"BYTES_PER_ELEMENT",{value:ii});Ut(ar,at,{value:ar.values,writable:!0,configurable:!0});Wr(ar,Z);var Zo=new WeakMap;function ra(i,t){let e=Zo.get(i);e||(e=new Map,Zo.set(i,e));let r=e.get(t);if(!r){let o=i.createShaderModule({label:`oidn/webnn/input-pack/${t}`,code:na(t)}),n=i.createShaderModule({label:"oidn/webnn/output-unpack",code:aa()});r={input:i.createComputePipeline({label:`oidn/webnn/input-pack/${t}`,layout:"auto",compute:{module:o,entryPoint:"main"}}),output:i.createComputePipeline({label:"oidn/webnn/output-unpack",layout:"auto",compute:{module:n,entryPoint:"main"}})},e.set(t,r)}return r}var Ct=8;function Qo(i,t){return Math.ceil(i/t)*t}function ia(i,t,e,r){let o=i.createBuffer({label:t,size:Qo(e.byteLength,4),usage:r,mappedAtCreation:!0});return new Uint8Array(o.getMappedRange()).set(new Uint8Array(e.buffer,e.byteOffset,e.byteLength)),o.unmap(),o}function Jo(i,t,e){let r=new Uint32Array(Qo(e.length,4));return r.set(e),ia(i,t,r,GPUBufferUsage.UNIFORM)}function oi(i,t,e,r){return!!i?.[t]?.[e]?.dataTypes?.includes?.(r)}function oa(i,t){if(t==="fp16"&&i.desc.dataType==="Float16")return new Uint8Array(i.data.buffer,i.data.byteOffset,i.data.byteLength);if(t==="fp32"&&i.desc.dataType==="Float32")return new Uint8Array(i.data.buffer,i.data.byteOffset,i.data.byteLength);let e=i.desc.dataType==="Float32"?new Float32Array(i.data.buffer,i.data.byteOffset,i.data.byteLength/4):new ut(i.data.buffer,i.data.byteOffset,i.data.byteLength/2),r=t==="fp16"?new ut(e):new Float32Array(e);return new Uint8Array(r.buffer,r.byteOffset,r.byteLength)}function na(i){let t=Array.from({length:i},(r,o)=>`@group(0) @binding(${o}) var<storage, read> input${o}: array<vec4<f32>>;`).join(`
`),e=Array.from({length:i},(r,o)=>{let n=o*3;return`if (channel < ${n+3}u) {
      return input${o}[pixel][channel - ${n}u];
    }`}).join(`
  `);return`enable f16;
struct Params { width: u32, height: u32, channels: u32, padding: u32 }
${t}
@group(0) @binding(${i}) var<storage, read_write> outputData: array<f16>;
@group(0) @binding(${i+1}) var<uniform> params: Params;

fn readChannel(pixel: u32, channel: u32) -> f32 {
  ${e}
  return 0.0;
}

@compute @workgroup_size(${Ct}, ${Ct}, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.width || gid.y >= params.height || gid.z >= params.channels) {
    return;
  }
  let pixel = gid.y * params.width + gid.x;
  let outputIndex = (gid.z * params.height + gid.y) * params.width + gid.x;
  outputData[outputIndex] = f16(readChannel(pixel, gid.z));
}
`}function aa(){return`enable f16;
struct Params { width: u32, height: u32, padding0: u32, padding1: u32 }
@group(0) @binding(0) var<storage, read> inputData: array<f16>;
@group(0) @binding(1) var<storage, read_write> outputData: array<vec4<f32>>;
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(${Ct}, ${Ct}, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.width || gid.y >= params.height) { return; }
  let pixel = gid.y * params.width + gid.x;
  let plane = params.width * params.height;
  outputData[pixel] = vec4<f32>(
    f32(inputData[pixel]),
    f32(inputData[plane + pixel]),
    f32(inputData[plane * 2u + pixel]),
    0.0
  );
}
`}function ua(i,t){if(t==="fp32")throw new Error("OIDN WebNN GPU interop currently requires FP16 exportable tensors");if(!i.features.has("shader-f16"))throw new Error("OIDN WebNN requires shader-f16 on the shared GPUDevice");return"fp16"}function sa(i,t,e){return e==="relu"?i.relu(t):t}var Ce=class{_device;_model;precision;support;_context;_builderConstructor;_shapeCache=new Map;_shapePromises=new Map;_retiredExecutions=new Set;_pendingCreationCount=0;_shapeCacheSize;_clock=0;_inputPipeline;_outputPipeline;_resources=new Zt;_disposed=!1;constructor(t,e,r={}){this._device=t,this._model=e,this.precision=ua(t,r.precision??"auto"),this._shapeCacheSize=Math.max(1,r.shapeCacheSize??2),this.support={available:!1,fp16Conv:!1,gpuInterop:!1};let o=ra(t,e.inputChannels/3);this._inputPipeline=o.input,this._outputPipeline=o.output}async prepare(){if(this._disposed)throw new Error("OIDN WebNN executor is disposed");let t=globalThis.navigator?.ml,e=globalThis.MLGraphBuilder;if(!t?.createContext||typeof e!="function")throw this.support.reason="WebNN is not exposed by this browser",new Error(this.support.reason);this._builderConstructor=e;try{try{this._context=await t.createContext({deviceType:"gpu",powerPreference:"high-performance"})}catch{this._context=await t.createContext({deviceType:"gpu"})}if(this._resources.track("ml-context",this._context),this._disposed)throw new Error("OIDN WebNN executor is disposed");if(typeof this._context.createExportableTensor!="function"||typeof this._context.exportToGPU!="function")throw this.support.reason="WebNN WebGPU tensor interop is unavailable",new Error(this.support.reason);let r=this._context.opSupportLimits?.()??{};if(this.support.fp16Conv=oi(r,"conv2d","input","float16")&&oi(r,"conv2d","filter","float16")&&oi(r,"conv2d","output","float16"),!this.support.fp16Conv)throw this.support.reason="WebNN does not support FP16 conv2d",new Error(this.support.reason);let o,n;try{o=this._resources.track("ml-tensor",await this._context.createExportableTensor({dataType:"float16",shape:[4]},this._device)),n=this._resources.track("gpu-buffer",await this._context.exportToGPU(o)),this.support.gpuInterop=!0}catch(a){throw this.support.reason=`WebNN FP16 WebGPU interop failed: ${String(a)}`,new Error(this.support.reason)}finally{this._releaseBuffer(n),this._releaseTensor(o)}this.support.available=!0}catch(r){throw this._releaseContext(),r}}_constant(t,e){return t.constant({dataType:"float16",shape:[...e.desc.dims]},oa(e,this.precision))}async _createExecution(t,e){if(this._disposed)throw new Error("OIDN WebNN executor is disposed");let r=new this._builderConstructor(this._context),o=new Map,n=new Map;o.set(this._model.spec.input,r.input("input",{dataType:"float16",shape:[1,this._model.inputChannels,e,t]})),n.set(this._model.spec.input,[this._model.inputChannels,e,t]);for(let d of this._model.spec.nodes){let f,g;if(d.op==="conv2d"){let h=n.get(d.input),m=this._model.convTensors.get(d.id),_=r.conv2d(o.get(d.input),this._constant(r,m.weight),{bias:this._constant(r,m.bias),padding:[1,1,1,1],inputLayout:"nchw",filterLayout:"oihw"});f=sa(r,_,d.activation),g=[m.outputChannels,h[1],h[2]]}else if(d.op==="maxPool2d"){let h=n.get(d.input);f=r.maxPool2d(o.get(d.input),{windowDimensions:[2,2],strides:[2,2],padding:[0,h[1]%2,0,h[2]%2],layout:"nchw"}),g=[h[0],Math.ceil(h[1]/2),Math.ceil(h[2]/2)]}else if(d.op==="upsample2d"){let h=n.get(d.input);f=r.resample2d(o.get(d.input),{mode:"nearest-neighbor",axes:[2,3],scales:[2,2]}),g=[h[0],h[1]*2,h[2]*2]}else{let h=d.inputs.map(m=>n.get(m));if(h.some(m=>m[1]!==h[0][1]||m[2]!==h[0][2]))throw new Error(`WebNN concat ${d.id} has mismatched spatial shapes`);f=r.concat(d.inputs.map(m=>o.get(m)),1),g=[h.reduce((m,_)=>m+_[0],0),h[0][1],h[0][2]]}o.set(d.id,f),n.set(d.id,g)}let a,s,u,p,l,c;try{return a=this._resources.track("ml-graph",await r.build({output:o.get(this._model.spec.output)})),s=this._resources.track("ml-tensor",await this._context.createExportableTensor({dataType:"float16",shape:[1,this._model.inputChannels,e,t],writable:!0},this._device)),u=this._resources.track("ml-tensor",await this._context.createExportableTensor({dataType:"float16",shape:[1,this._model.outputChannels,e,t],readable:!0},this._device)),p=this._resources.track("gpu-buffer",this._device.createBuffer({label:`oidn/webnn/output/${t}x${e}`,size:t*e*4*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST})),l=this._resources.track("gpu-buffer",Jo(this._device,`oidn/webnn/input/${t}x${e}`,[t,e,this._model.inputChannels])),c=this._resources.track("gpu-buffer",Jo(this._device,`oidn/webnn/output/${t}x${e}`,[t,e])),{graph:a,inputTensor:s,outputTensor:u,outputBuffer:p,inputUniform:l,outputUniform:c,width:t,height:e,lastUsed:++this._clock}}catch(d){throw this._releaseBuffer(c),this._releaseBuffer(l),this._releaseBuffer(p),this._releaseTensor(u),this._releaseTensor(s),this._releaseGraph(a),d}}async _execution(t,e){let r=`${t}x${e}`,o=this._shapeCache.get(r);if(!o){let n=this._shapePromises.get(r);n||(n=(async()=>{this._pendingCreationCount++;try{return await this._createExecution(t,e)}finally{this._pendingCreationCount--}})(),this._shapePromises.set(r,n));try{if(o=await n,this._disposed)throw this._destroyExecution(o),new Error("OIDN WebNN executor is disposed");this._shapeCache.set(r,o)}finally{this._shapePromises.get(r)===n&&this._shapePromises.delete(r)}if(this._shapeCache.size>this._shapeCacheSize){let a=[...this._shapeCache.entries()].filter(([s])=>s!==r).sort((s,u)=>s[1].lastUsed-u[1].lastUsed)[0];a&&(this._shapeCache.delete(a[0]),this._retireExecution(a[1]))}}return o.lastUsed=++this._clock,o}async prewarm(t){for(let e of t)await this._execution(e.width,e.height)}async execute(t,e,r){let o=this._model.inputChannels/3;if(t.length!==o)throw new Error(`OIDN WebNN expected ${o} input buffers, got ${t.length}`);let n=await this._execution(e,r),a=this._resources.track("gpu-buffer",await this._context.exportToGPU(n.inputTensor));try{let u=t.map((d,f)=>({binding:f,resource:{buffer:d}}));u.push({binding:o,resource:{buffer:a}}),u.push({binding:o+1,resource:{buffer:n.inputUniform}});let p=this._device.createBindGroup({label:"oidn/webnn/input-bindings",layout:this._inputPipeline.getBindGroupLayout(0),entries:u}),l=this._device.createCommandEncoder({label:"oidn/webnn/input-pack"}),c=l.beginComputePass();c.setPipeline(this._inputPipeline),c.setBindGroup(0,p),c.dispatchWorkgroups(Math.ceil(e/Ct),Math.ceil(r/Ct),this._model.inputChannels),c.end(),this._device.queue.submit([l.finish()])}finally{this._releaseBuffer(a)}this._context.dispatch(n.graph,{input:n.inputTensor},{output:n.outputTensor});let s=this._resources.track("gpu-buffer",await this._context.exportToGPU(n.outputTensor));try{let u=this._device.createBindGroup({label:"oidn/webnn/output-bindings",layout:this._outputPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:s}},{binding:1,resource:{buffer:n.outputBuffer}},{binding:2,resource:{buffer:n.outputUniform}}]}),p=this._device.createCommandEncoder({label:"oidn/webnn/output-unpack"}),l=p.beginComputePass();l.setPipeline(this._outputPipeline),l.setBindGroup(0,u),l.dispatchWorkgroups(Math.ceil(e/Ct),Math.ceil(r/Ct)),l.end(),this._device.queue.submit([p.finish()])}finally{this._releaseBuffer(s)}return n.outputBuffer}async executeCPU(t,e,r){let o=await this._execution(e,r),n=e*r,a=new ut(n*this._model.inputChannels);for(let p=0;p<n;p++)for(let l=0;l<this._model.inputChannels;l++)a[l*n+p]=t[p*this._model.inputChannels+l];this._context.writeTensor(o.inputTensor,a),this._context.dispatch(o.graph,{input:o.inputTensor},{output:o.outputTensor});let s=new ut(await this._context.readTensor(o.outputTensor)),u=new Float32Array(n*this._model.outputChannels);for(let p=0;p<n;p++)for(let l=0;l<this._model.outputChannels;l++)u[p*this._model.outputChannels+l]=s[l*n+p];return u}_destroyExecution(t){this._releaseGraph(t.graph),this._releaseTensor(t.inputTensor),this._releaseTensor(t.outputTensor),this._releaseBuffer(t.outputBuffer),this._releaseBuffer(t.inputUniform),this._releaseBuffer(t.outputUniform)}_retireExecution(t){this._retiredExecutions.add(t),this._device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>{this._retiredExecutions.delete(t),this._destroyExecution(t)})}_releaseBuffer(t){this._resources.release("gpu-buffer",t,()=>t.destroy())}_releaseTensor(t){this._resources.release("ml-tensor",t,()=>t.destroy())}_releaseGraph(t){this._resources.release("ml-graph",t,()=>t.destroy?.())}_releaseContext(){this._resources.release("ml-context",this._context,()=>this._context.destroy?.())}getResourceInfo(){return this._resources.snapshot(this._pendingCreationCount+this._retiredExecutions.size)}dispose(){if(!this._disposed){this._disposed=!0;for(let t of this._shapeCache.values())this._destroyExecution(t);this._shapeCache.clear();for(let t of this._retiredExecutions)this._destroyExecution(t);this._retiredExecutions.clear(),this._shapePromises.clear(),this._releaseContext()}}};var ca=100;function zt(i,t){return Math.ceil(i/t)*t}function ur(i){return i.data instanceof GPUBuffer||i.data instanceof GPUTexture}var ni=class{_device;_aux;_hdr;_hdrTransfer;_dataProcessGPU;_nativeExecutor;_webNNExecutor;_modelSpec;_inputChannels;_engine;_dynamicTileController;_lastExecution;_profileNextImage=!1;_lastImageProfile;_activeExecutionFailures=new Set;_deviceLostObserved=!1;_deviceLostSettled=!1;_deviceLostReason;constructor(t,e,r={}){this._aux=r.aux||!1,this._hdr=r.hdr||!1,this._hdrTransfer=r.hdrTransfer??"pu",this._engine=r.engine??"auto";let o=r.modelSpec??De(t),n=kr(t,o);this._modelSpec=n.spec,this._inputChannels=n.inputChannels;let a=this._aux?9:3;if(n.inputChannels!==a)throw new Error(`OIDN model expects ${n.inputChannels} input channels, but aux=${this._aux} provides ${a}`);this._dynamicTileController=new Le(r.maxTileSize??512,r.dynamicTile),this._device=e,this._observeDeviceLoss(),this._engine==="webnn"?this._webNNExecutor=new Ce(this._device,n,{precision:r.precision}):this._nativeExecutor=new xe(this._device,n,{precision:r.precision,kernel:r.kernel,gemm:r.gemm,subgroupMatrix:r.subgroupMatrix})}getDevice(){return this._device}async prepare(){if(this._webNNExecutor){await this._webNNExecutor.prepare();let t=zt(this._modelSpec.receptiveField/2,16),e=[this._dynamicTileController.tileSize,this._dynamicTileController.minTileSize];await this._webNNExecutor.prewarm([...new Set(e)].map(r=>({width:r+2*t,height:r+2*t})));return}await this._nativeExecutor.prepare()}async prepareForImage(t,e,r={}){let o=zt(this._modelSpec.receptiveField/2,16),n=r.tileOverlap===void 0?o:zt(Math.max(0,r.tileOverlap),16),a=Ue(t,e,r.wholeImage?zt(Math.max(t,e),16):this._dynamicTileController.tileSize,n),s=[...new Map(a.tiles.map(({input:u})=>[`${u.width}x${u.height}`,{width:u.width,height:u.height}])).values()];await this._webNNExecutor?.prewarm(s),this._nativeExecutor?.prewarm(s)}getRuntimeInfo(){return{configuredEngine:this._engine,gpuEngine:this._webNNExecutor?"webnn":"wgsl",precision:(this._webNNExecutor??this._nativeExecutor).precision,kernel:this._nativeExecutor?{configured:this._nativeExecutor.kernelSetting,gemm:this._nativeExecutor.gemm,maxSpatialInputBlocks:this._nativeExecutor.maxSpatialInputBlocks,subgroupsAvailable:this._nativeExecutor.subgroupsAvailable,subgroupMatrix:this._nativeExecutor.subgroupMatrix}:void 0,webnn:this._webNNExecutor?.support,resources:(this._webNNExecutor??this._nativeExecutor).getResourceInfo(),model:this._modelSpec.id,modelFamily:this._modelSpec.family,inputChannels:this._inputChannels,hdrTransfer:this._hdrTransfer,dynamicTile:{enabled:this._dynamicTileController.enabled,currentTileSize:this._dynamicTileController.tileSize,minTileSize:this._dynamicTileController.minTileSize,maxTileSize:this._dynamicTileController.maxTileSize,targetTileTimeMs:this._dynamicTileController.targetTileTimeMs},lastExecution:this._lastExecution,activeExecutionCount:this._activeExecutionFailures.size}}_observeDeviceLoss(){if(this._activeExecutionFailures??=new Set,this._deviceLostObserved)return;this._deviceLostObserved=!0;let t=this._device.lost;if(!t)return;let e=r=>{if(this._deviceLostSettled)return;this._deviceLostSettled=!0,this._deviceLostReason=r;let o=[...this._activeExecutionFailures];this._activeExecutionFailures.clear();for(let n of o)n(r)};t.then(r=>e(new Error(`WebGPU device lost: ${r.message}`)),e)}_registerExecutionFailure(t){return this._observeDeviceLoss(),this._activeExecutionFailures.add(t),this._deviceLostSettled&&(this._activeExecutionFailures.delete(t),queueMicrotask(()=>t(this._deviceLostReason))),()=>this._activeExecutionFailures.delete(t)}profileNextExecution(){return!this._nativeExecutor||!this._device.features.has("timestamp-query")?!1:(this._profileNextImage=!0,!0)}getLastExecutionProfile(){return this._lastImageProfile?Promise.resolve(this._lastImageProfile):void 0}_processImageData(t,e,r,o){let n=t.data,a=n.length/4,s=this._aux?9:3,u=new Float32Array(a*s);if(e&&!r||r&&!e)throw new Error("Normal map and albedo map are both required");if(e&&r&&(e.width!==r.width||e.height!==r.height||t.width!==e.width||t.height!==e.height))throw new Error("Image size mismatch");let p=e?.data,l=r?.data,c=p instanceof Float32Array?1:255,d=l instanceof Float32Array?1:255;for(let f=0;f<n.length;f+=4){let g=f/4*s;for(let h=0;h<3;h++)o?u[g+h]=n[f+h]:u[g+h]=n[f+h]/255,p&&(u[g+h+3]=p[f+h]/c),l&&(u[g+h+6]=l[f+h]/d)}return u}_readTile(t,e,r,o){let n=new Float32Array(r.width*r.height*e),a=t.length/(o*e);for(let s=0;s<r.height;s++)for(let u=0;u<r.width;u++){let p=Math.min(o-1,u+r.x),c=(Math.min(a-1,s+r.y)*o+p)*e,d=(s*r.width+u)*e;for(let f=0;f<e;f++)n[d+f]=t[c+f]}return n}_writeTile(t,e,r,o,n,a){let{data:s,width:u}=t,p=r.x-e.x,l=r.y-e.y;for(let c=0;c<r.height;c++)for(let d=0;d<r.width;d++){let f=((c+l)*n+d+p)*3,g=((c+r.y)*u+(d+r.x))*4;for(let h=0;h<3;h++)a?s[g+h]=o[f+h]:s[g+h]=Math.min(Math.max(o[f+h]*255,0),255);t.data[g+3]=a?1:255}}async _executeTile(t,e,r,o,n,a,s,u,p){let l=this._aux?9:3,c=new jt(o.input.x,o.input.y,o.input.width,o.input.height),d=new jt(o.output.x,o.output.y,o.output.width,o.output.height),f=c.width,g=c.height,h,m,_=1,$=this._device,x=this._dataProcessGPU;if(t instanceof Float32Array){let y=this._readTile(t,l,c,a);u&&(_=br({data:y,channels:l}),y=wr({data:y,channels:l,inputScale:_,transfer:this._hdrTransfer})),m=await(this._webNNExecutor??this._nativeExecutor).executeCPU(y,f,g)}else{x||(x=this._dataProcessGPU=new Oe($,u,this._hdrTransfer)),x.setImageSize(a,s),x.setInputTile(c),n&&x.copyInputDataToOutput(t.color);let{color:y,albedo:w,normal:b}=x.forward(t.color,this._aux?t.albedo:void 0,this._aux?t.normal:void 0,p);h=await(this._webNNExecutor??this._nativeExecutor).execute(this._aux?[y,w,b]:[y],f,g)}let k;if(t instanceof Float32Array){u&&(m=vr({data:m,channels:3,inputScale:_,transfer:this._hdrTransfer})),this._writeTile(r,c,d,m,c.width,u);for(let y=0;y<d.height;y++)for(let w=0;w<d.width;w++){let b=(y*d.width+w)*4,v=((y+d.y)*a+(w+d.x))*4;for(let I=0;I<4;I++)e.data[b+I]=r.data[v+I]}}else x.setOutputTile(d,c),k=x.inverse(h,t.color);return k}tileExecute({color:t,albedo:e,normal:r,done:o,progress:n,denoiseAlpha:a,tileOverlap:s,wholeImage:u,scheduling:p="event-loop",error:l}){if(this._aux&&(!e||!r))throw new Error("Normal map and albedo map are both required");if(!this._aux&&(e||r))throw new Error("Normal map and albedo map are not required");let c=t.width,d=t.height,f=this._dynamicTileController.tileSize,g=u?zt(Math.max(c,d),16):f,h=zt(this._modelSpec.receptiveField/2,16),m=s===void 0?h:zt(Math.max(0,s),16),_=Ue(c,d,g,m),$=_.tiles.length>1,x=this._hdr||!1,k;ur(t)||(k=this._processImageData(t,e,r,x));function y(F,V){return x?{data:new Float32Array(F*V*4),width:F,height:V}:new ImageData(F,V)}let w=ur(t)?void 0:y(c,d),b="active",v,I,S=()=>!1,T=()=>typeof performance>"u"?Date.now():performance.now(),U=T(),G=[],ot=this._profileNextImage===!0;this._profileNextImage=!1;let et=new Map,pt=()=>{v!==void 0&&(clearTimeout(v),v=void 0),I!==void 0&&typeof cancelAnimationFrame<"u"&&(cancelAnimationFrame(I),I=void 0)},j=F=>{console.error("OIDN error callback failed",F)},tt=F=>{if(b==="active")if(b="settled",pt(),S(),l)try{Promise.resolve(l(F)).catch(j)}catch(V){j(V)}else console.error("OIDN execution failed",F)},bt=F=>{if(p==="event-loop"||typeof requestAnimationFrame>"u")v=setTimeout(()=>{v=void 0,F()},0);else{let V=()=>{pt(),F()};I=requestAnimationFrame(V),v=setTimeout(V,ca)}},Ft=async F=>{if(b!=="active")return;let V=_.tiles[F],Et=ur(t)?void 0:y(V.output.width,V.output.height),Yt=T();ot&&this._nativeExecutor.profileNextExecution();let Gt=await this._executeTile(ur(t)?{color:t.data,albedo:e?.data,normal:r?.data}:k,Et,w,V,F===0,c,d,x,a);if(ot){let D=await this._nativeExecutor.getLastExecutionProfile();for(let X of D?.layers??[])et.set(X.id,(et.get(X.id)??0)+X.durationMs)}if(b!=="active")return;let Xt=w||{data:Gt,width:c,height:d};if(n&&await n(Xt,Et,new jt(V.output.x,V.output.y,V.output.width,V.output.height),F,_.tiles.length),b!=="active")return;let O=F+1<_.tiles.length;if(await this._device.queue.onSubmittedWorkDone(),b!=="active")return;await(async()=>{if(G.push(T()-Yt),b==="active")if(O)bt(()=>{b==="active"&&Ft(F+1).catch(tt)});else{let D=[...G].sort((kt,mt)=>kt-mt),X=Math.floor(D.length/2),At=D.length%2?D[X]:(D[X-1]+D[X])/2;if(this._lastExecution={width:c,height:d,tileCount:_.tiles.length,tileColumns:_.columns,tileRows:_.rows,tileOverlap:_.overlap,inputPixelCount:_.inputPixelCount,inputShapeCount:_.inputShapeCount,durationMs:T()-U,tileTimeMs:{min:D[0],median:At,mean:D.reduce((kt,mt)=>kt+mt,0)/D.length,max:D[D.length-1]}},$&&this._dynamicTileController.observe(G),S(),ot){let kt=[...et].map(([mt,fe])=>({id:mt,durationMs:fe}));this._lastImageProfile={totalMs:kt.reduce((mt,fe)=>mt+fe.durationMs,0),layers:kt}}await o(Xt),b==="active"&&(b="settled")}})()};return S=this._registerExecutionFailure(tt),Ft(0).catch(tt),()=>{b==="active"&&(b="aborted",pt(),S())}}dispose(){this._dataProcessGPU?.dispose(),this._nativeExecutor?.dispose(),this._webNNExecutor?.dispose()}},tn=ni;async function en(){if(!navigator.gpu)throw new Error("WebGPU is not available");let i={powerPreference:"high-performance"},t=await navigator.gpu.requestAdapter(i);if(!t)throw new Error("No WebGPU adapter is available");let e={},r=[];t.features.has("timestamp-query")&&r.push("timestamp-query"),t.features.has("bgra8unorm-storage")&&r.push("bgra8unorm-storage"),t.features.has("shader-f16")&&r.push("shader-f16");for(let n of["subgroups","chromium-experimental-subgroup-matrix"])t.features.has(n)&&r.push(n);e.requiredFeatures=r;let o=t.limits;return e.requiredLimits={maxComputeWorkgroupStorageSize:o.maxComputeWorkgroupStorageSize,maxComputeWorkgroupsPerDimension:o.maxComputeWorkgroupsPerDimension,maxStorageBufferBindingSize:o.maxStorageBufferBindingSize,maxBufferSize:o.maxBufferSize,maxComputeWorkgroupSizeX:o.maxComputeWorkgroupSizeX,maxComputeInvocationsPerWorkgroup:o.maxComputeInvocationsPerWorkgroup},t.requestDevice(e)}async function sr(i,t,e){let r=t?.device??await en(),o=di(i),n=new tn(o,r,e);return await n.prepare(),n}var rn=new URL("../oidn/weights/rt_hdr_alb_nrm.tza",import.meta.url),on=new URL("../oidn/weights/rt_hdr_alb_nrm_small.tza",import.meta.url);var la={small:"rt_hdr_alb_nrm_small.tza",standard:"rt_hdr_alb_nrm.tza",cleanAuxLarge:"rt_hdr_calb_cnrm_large.tza"},nn={albedo:"rt_alb_large.tza",normal:"rt_nrm_large.tza"},ai="oidn-weights",pa="2.3.0-1",an=`https://cdn.jsdelivr.net/npm/${ai}@${pa}/`,un=`https://cdn.jsdelivr.net/npm/@meimu/mutracer@${pi}/oidn/weights/`;function ui(i,t){if(t===void 0){if(i==="standard")return String(rn);if(i==="small")return String(on)}let e=t??an,r=typeof e=="string"?e:String(e);return`${r}${r.endsWith("/")?"":"/"}${la[i]}`}function si(i=an){let t=typeof i=="string"?i:String(i),e=`${t}${t.endsWith("/")?"":"/"}`;return{albedo:`${e}${nn.albedo}`,normal:`${e}${nn.normal}`}}async function ci(i,t){let e=await fetch(String(i),{signal:t});if(!e.ok)throw new Error(`Failed to load OIDN weights from ${i}: ${e.status} ${e.statusText}`);let r=await e.arrayBuffer(),o=new Uint8Array(r);if(o[0]!==215||o[1]!==65)throw new Error(`Invalid OIDN TZA weights from ${i}: expected magic D7 41 (received non-TZA content).`);return r}async function cn(i,t,e={},r=ci){await i.init();let o=i.device;if(i.backend!=="webgpu"||!o)throw new Error("OIDN requires a WebGPU engine.");let n=e.auxiliaryModelUrls,a=await Promise.all([i._getWeights(String(t),()=>r(t,e.signal)),...n?[i._getWeights(String(n.albedo),()=>r(n.albedo,e.signal)),i._getWeights(String(n.normal),()=>r(n.normal,e.signal))]:[]]),s={device:o},u={hdrTransfer:e.hdrTransfer??"pu",maxTileSize:e.maxTileSize,engine:e.engine,precision:e.precision,dynamicTile:e.dynamicTile},p,l;try{if(p=await sr(a[0],s,{aux:e.aux??!0,hdr:e.hdr??!0,...u}),n){l=await sr(a[1],s,{aux:!1,hdr:!1,...u});let c=await sr(a[2],s,{aux:!1,hdr:!1,...u});p.auxiliaryDenoisers={albedo:l,normal:c}}}catch(c){throw l?.dispose(),p?.dispose(),c}return p}function da(i,t,e={}){return cn(i,t,e)}var sn=!1;function fa(i,t={}){let{model:e="standard",weightsBaseUrl:r,auxiliaryModelUrls:o,...n}=t,a=ui(e,r),s=r===void 0&&e!=="cleanAuxLarge",u=new Set(r===void 0&&e==="cleanAuxLarge"?[a,...o?[]:Object.values(si()).map(String)]:[]),p=async(l,c)=>{try{return await ci(l,c)}catch(d){if(c?.aborted)throw d;if(s&&String(l)===a)return sn||(sn=!0,console.warn('Bundled OIDN weights failed to load; falling back to jsDelivr. In Vite development add optimizeDeps: { exclude: ["@meimu/mutracer"] }, or pass weightsBaseUrl to self-host the weights.',d)),ci(ui(e,un),c);throw u.has(String(l))?new Error(`Failed to load ${ai} network from ${l}. Self-host node_modules/oidn-weights/*.tza and pass weightsBaseUrl. ${d instanceof Error?d.message:String(d)}`):d}};return cn(i,a,{...n,auxiliaryModelUrls:o??(e==="cleanAuxLarge"?si(r):void 0)},p)}function Gu(i,t){return t.weightsUrl!==void 0?da(i,t.weightsUrl,t):fa(i,t)}export{Gu as loadOIDNNetwork};
