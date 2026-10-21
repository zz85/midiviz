import{b as Tr}from"./chunk-ZN47ZYZR.js";var Nt=class{dims=[];paddedDims=[];layout="x";dataType="Float32";getByteSize(){let e=1;for(let t of this.paddedDims)e*=t;return this.dataType==="Float32"?e*=4:this.dataType==="Float16"&&(e*=2),e}},Mt=class{desc;data;constructor(e,t){this.desc=e,this.data=t}},Ut=class{_view;offset=0;constructor(e){this._view=e}read(e){let t=this._view,r=this.offset;switch(this.offset+=e,e){case 1:return t.getUint8(r);case 2:return t.getUint16(r,!0);case 4:return t.getUint32(r,!0);case 8:return Number(t.getBigUint64(r,!0));default:throw new Error("unsupported read size")}}};function kr(i){let e=new Uint8Array(i),t=new Ut(new DataView(i));if(t.read(2)!==16855)throw new Error("invalid or corrupted weights blob");let o=t.read(1),n=t.read(1);if(o!==2)throw new Error("unsupported weights blob version");let a=t.read(8);t.offset=a;let u=t.read(4),s=new Map;for(let l=0;l<u;++l){let p=new Nt,c=t.read(2),d=new TextDecoder().decode(e.subarray(t.offset,t.offset+c));t.offset+=c;let f=t.read(1);for(let m=0;m<f;++m)p.dims.push(t.read(4));p.paddedDims=[...p.dims],new TextDecoder().decode(e.subarray(t.offset,t.offset+f))==="oihw"&&(p.layout="oihw"),t.offset+=f;let g=String.fromCharCode(t.read(1));if(g==="f")p.dataType="Float32";else if(g==="h")p.dataType="Float16";else throw new Error("invalid tensor data type");let _=t.read(8),x=e.slice(_,_+p.getByteSize());s.set(d,new Mt(p,x))}return s}function Uo(i,e){return i.channels===e.channels}var et=8,he=class{autoUpdateOutputBuffer=!0;_label;_device;_outputBuffers={};_pipeline;_bindGroups=[];_needsUpdatePipeline=!0;_needsResizeBuffer=!0;_inputs=[];_outputs=[];_uniforms=[];_uniformBuffers={};_width=10;_height=10;_execWidth;_execHeight;_csCode="";_csMain;_csDefine;_groupOffsets={inputs:0,uniforms:1,outputs:2};constructor(e,t,r){this._label=e,this._device=t,this._csMain=r.csMain,this._csDefine=r.csDefine,this._inputs=r.inputs,this._outputs=r.outputs,this._uniforms=r.uniforms,this.autoUpdateOutputBuffer=r.autoUpdateOutputBuffer??!0,r.uniforms.forEach(o=>{this._uniformBuffers[o.label]=t.createBuffer({label:this._label,size:o.data.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this._device.queue.writeBuffer(this._uniformBuffers[o.label],0,o.data)})}setCSCode({csDefine:e,csMain:t}){this._csDefine=e,this._csMain=t,this._needsUpdatePipeline=!0}setSize(e,t){e=Math.ceil(e),t=Math.ceil(t);let r=e!==this._width||t!==this._height;this._width=e,this._height=t,r&&(this._needsResizeBuffer=!0,this._needsUpdatePipeline=!0)}setExecuteSize(e,t){e=Math.ceil(e),t=Math.ceil(t),this._execWidth=e,this._execHeight=t}setOutputParams(e){this.autoUpdateOutputBuffer&&this._updateOutputBuffers(e),this._needsUpdatePipeline=!0}setOutputBuffers(e){this._outputBuffers=Object.keys(e).reduce((t,r)=>(t[r]={buffer:e[r],params:{channels:4}},t),{})}setUniform(e,t){let r=this._uniformBuffers[e];this._device.queue.writeBuffer(r,0,t)}getOutput(e){return this._needsResizeBuffer&&this.autoUpdateOutputBuffer&&(this._resizeOutputBuffers(),this._needsResizeBuffer=!1),this._outputBuffers[e].buffer}dispose(e=!0){Object.keys(this._uniformBuffers).forEach(t=>{this._uniformBuffers[t].destroy()}),e&&Object.keys(this._outputBuffers).forEach(t=>{this._outputBuffers[t].buffer.destroy()})}_createBuffer(e){let t=this._width*this._height*4*4;return this._device.createBuffer({label:this._label,size:Math.max(t,80),usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC})}_resizeOutputBuffers(){let e=this._outputBuffers;for(let t in e){let{buffer:r,params:o}=e[t];r.destroy(),e[t].buffer=this._createBuffer(o)}}_updateOutputBuffers(e){let t=this._outputBuffers;for(let r in e){let o=e[r];if(!Uo(o,t[r]?.params||{})){t[r]?.buffer.destroy();let n=this._createBuffer(o);t[r]={buffer:n,params:o}}}}_updatePipeline(e,t){if(!this._needsUpdatePipeline)return;this._needsUpdatePipeline=!1;let r=this._device,o=this._getFullCs(e,t);o!==this._csCode&&(this._csCode=o,this._pipeline=r.createComputePipeline({label:this._label,layout:"auto",compute:{module:r.createShaderModule({label:this._label,code:o}),entryPoint:"main"}}),this._updateBindGroups())}_getFullCs(e,t){let r=this._inputs,o=this._uniforms,n=0,a=this._groupOffsets={inputs:0,uniforms:0,outputs:0};return r.length>0&&n++,o.length>0&&(a.uniforms=n,n++),a.outputs=n,`
${r.sort().map((s,l)=>{let p=`@group(${a.inputs}) @binding(${l}) `,c=`in_${s}`;return t[s]==="texture"?`${p} var ${c}: texture_2d<f32>;`:`${p} var<storage, read> ${c}: array<vec${e[s].channels}f>;`}).join(`
`)}
${this._uniforms.map((s,l)=>`@group(${a.uniforms}) @binding(${l}) var<uniform> ${s.label}: ${s.type};`).join(`
`)}

${this._outputs.map((s,l)=>`@group(${a.outputs}) @binding(${l}) var<storage, read_write> out_${s}: array<vec${this._outputBuffers[s].params.channels}f>;`).join(`
`)}
${this._csDefine??""}
@compute @workgroup_size(${et}, ${et}, 1)
fn main(@builtin(global_invocation_id) globalId: vec3u) {
${this._csMain}
}
`}_updateBindGroups(){let e=[],t=this._device,r=this._groupOffsets;this._uniforms.length>0&&(e[r.uniforms]=t.createBindGroup({label:this._label,layout:this._pipeline.getBindGroupLayout(r.uniforms),entries:this._uniforms.map((o,n)=>({binding:n,resource:{buffer:this._uniformBuffers[o.label]}}))})),this._bindGroups=e}createPass(e,t){this._needsResizeBuffer&&this.autoUpdateOutputBuffer&&(this._resizeOutputBuffers(),this._needsResizeBuffer=!1);let r=this._inputs.reduce((a,u)=>(a[u]=t[u].buffer?"buffer":"texture",a),{});this._updatePipeline(t,r);let o=this._groupOffsets;this._inputs.length>0&&(this._bindGroups[o.inputs]=this._device.createBindGroup({label:this._label,layout:this._pipeline.getBindGroupLayout(o.inputs),entries:this._inputs.map((a,u)=>({binding:u,resource:t[a].buffer?{buffer:t[a].buffer}:t[a].texture.createView()}))})),this._bindGroups[o.outputs]=this._device.createBindGroup({label:this._label,layout:this._pipeline.getBindGroupLayout(o.outputs),entries:this._outputs.map((a,u)=>({binding:u,resource:{buffer:this._outputBuffers[a].buffer}}))});let n=e.beginComputePass();n.setPipeline(this._pipeline),this._bindGroups.forEach((a,u)=>{n.setBindGroup(u,a)}),n.dispatchWorkgroups(Math.ceil((this._execWidth??this._width)/et),Math.ceil((this._execHeight??this._height)/et),1),n.end()}};var Pr=1412.83765,Sr=1.64593172,Br=.431384981,Er=-.00294139609,Cr=.192653254,Ar=.00626026094,Or=.998620152,Lo=15794576e-13,Do=.0322087631,Ro=.00223151711,Wo=.370974749,Nr=65504,Mr=Lr(Nr),zo=1/Mr,Go=Mr,Ur=Math.log(Nr+1),Fo=1/Ur;function Lr(i){return i<=Lo?Pr*i:i<=Do?Sr*Math.pow(i,Br)+Er:Cr*Math.log(i+Ar)+Or}function Yo(i){return i<=Ro?i/Pr:i<=Wo?Math.pow((i-Er)/Sr,1/Br):Math.exp((i-Or)/Cr)-Ar}function Xo(i,e){return e==="log"?Math.log(i+1)*Fo:Lr(i)*zo}function Ho(i,e){return e==="log"?Math.exp(i*Ur)-1:Yo(i*Go)}function Lt({data:i,channels:e,inputScale:t,transfer:r="pu"}){let o=new Float32Array(i);for(let n=0;n<o.length;n+=e)for(let a=0;a<3;a++)o[n+a]=Xo(o[n+a]*t,r);return o}function Dt({data:i,channels:e,inputScale:t,transfer:r="pu"}){let o=new Float32Array(i),n=1/t;for(let a=0;a<o.length;a+=e)for(let u=0;u<3;u++)o[a+u]=Ho(o[a+u],r)*n;return o}var Rr=1412.83765,Wr=1.64593172,zr=.431384981,Gr=-.00294139609,Fr=.192653254,Yr=.00626026094,Xr=.998620152,Hr=15794576e-13,Vr=.0322087631,Vo=.00223151711,Ko=.370974749;function jo(i){return i<=Hr?i=Rr*i:i<=Vr?i=Wr*Math.pow(i,zr)+Gr:i=Fr*Math.log(i+Yr)+Xr,i}var Kr=65504,jr=jo(Kr),qo=1/jr,Zo=jr,Rt=Math.log(Kr+1),Jo=1/Rt,$e=class{x;y;width;height;constructor(e,t,r,o){this.x=e,this.y=t,this.width=r,this.height=o}};function qr({data:i,channels:e}){let t=0;for(let a=0;a<i.length;a+=e){let u=i[a],s=i[a+1],l=i[a+2],p=.212671*u+.71516*s+.072169*l;t+=Math.log2(p+1e-4)}let r=i.length/e,o=t/r;return .18/Math.pow(2,o)}var Dr=`
const a = ${Rr};
const b = ${Wr};
const c = ${zr};
const d = ${Gr};
const e = ${Fr};
const f = ${Yr};
const g = ${Xr};
const y0 =${Hr};
const y1 =${Vr};
const x0 =${Vo};
const x1 =${Ko};

const normScale = ${qo};
const rcpNormScale = ${Zo};
`,tt=class{_device;_isHDR;_hdrTransfer;_inputPassAux;_inputPassColor;_outputPass;_copyPass;_isInputTexture;constructor(e,t,r="pu"){this._device=e,this._isHDR=t,this._hdrTransfer=r;let o=[{label:"inputScale",type:"f32",data:new Float32Array([1])},{label:"inputSize",type:"vec2i",data:new Int32Array(2)},{label:"outputSize",type:"vec2i",data:new Int32Array(2)},{label:"inputOffset",type:"vec2i",data:new Int32Array(2)}];this._inputPassAux=new he("inputPassAux",this._device,{inputs:["color","albedo","normal"],outputs:["color","albedo","normal"],uniforms:o,csDefine:"",csMain:""}),this._inputPassColor=new he("inputPassColor",this._device,{inputs:["color"],outputs:["color"],uniforms:o,csDefine:"",csMain:""}),this._outputPass=new he("outputPass",this._device,{inputs:["color","raw"],outputs:["color"],uniforms:[{label:"inputScale",type:"f32",data:new Float32Array([1])},{label:"inputSize",type:"vec2i",data:new Int32Array(2)},{label:"outputSize",type:"vec2i",data:new Int32Array(2)},{label:"imageSize",type:"vec2i",data:new Int32Array(2)},{label:"inputOffset",type:"vec2i",data:new Int32Array(2)},{label:"outputOffset",type:"vec2i",data:new Int32Array(2)}],csDefine:"",csMain:""}),this._copyPass=new he("copyPass",this._device,{inputs:["color"],outputs:["color"],autoUpdateOutputBuffer:!1,uniforms:[{label:"size",type:"vec2i",data:new Int32Array(2)}],csMain:`
let outIdx = i32(globalId.x + globalId.y * u32(size.x));
out_color[outIdx] = textureLoad(in_color, globalId.xy, 0);
`}),this._inputPassAux.setOutputParams({color:{channels:3},albedo:{channels:3},normal:{channels:3}}),this._inputPassColor.setOutputParams({color:{channels:3}}),this._outputPass.setOutputParams({color:{channels:4}})}_updatePasses(e,t=!1){if(this._isInputTexture!=null&&this._isInputTexture===e)return;this._isInputTexture=e;let r=this._isHDR,o=this._hdrTransfer==="log"?"fn HDRForward(y: f32) -> f32 { return log(y + 1.0) * logNormScale; }":`fn HDRForward(y: f32) -> f32 {
  if (y <= y0) { return a * y * normScale; }
  else if (y <= y1) { return (b * pow(y, c) + d) * normScale; }
  else { return (e * log(y + f) + g) * normScale; }
}`,n=this._hdrTransfer==="log"?"fn HDRInverse(x: f32) -> f32 { return exp(x * logXMax) - 1.0; }":`fn HDRInverse(x: f32) -> f32 {
  let y = x * rcpNormScale;
  if (y <= x0) { return y / a; }
  else if (y <= x1) { return pow((y - d) / b, 1 / c); }
  else { return exp((y - g) / e) - f; }
}`,a=`
${Dr}
const logXMax = ${Rt};
const logNormScale = ${Jo};
${o}`;function u(l){return e?`textureLoad(in_${l}, vec2u(inputPosition), 0)`:`in_${l}[inIdx]`}let s=`
let x = i32(globalId.x);
let y = i32(globalId.y);
let inputPosition = clamp(
  vec2i(x, y) + inputOffset,
  vec2i(0),
  inputSize - vec2i(1)
);
let inIdx = inputPosition.y * inputSize.x + inputPosition.x;
let col = ${u("color")};

let outIdx = y * outputSize.x + x;

if (${t}) {
  // Denoise the inversed alpha. Or the anti aliased edge will be too dark after denoised
  out_color[outIdx] = vec3f(1.0 - col.a);
}
else if (${r}) {
  out_color[outIdx] = vec3f(HDRForward(col.r * inputScale), HDRForward(col.g * inputScale), HDRForward(col.b * inputScale));
}
else {
  out_color[outIdx] = col.rgb;
}
`;this._inputPassAux.setCSCode({csDefine:a,csMain:`
${s}
let alb = ${u("albedo")};
let nor = ${u("normal")};
out_normal[outIdx] = nor.rgb;
out_albedo[outIdx] = alb.rgb;
  `}),this._inputPassColor.setCSCode({csDefine:a,csMain:`
${s}
`}),this._outputPass.setCSCode({csDefine:`
${Dr}
const logXMax = ${Rt};
${n}
`,csMain:`
let x = i32(globalId.x);
let y = i32(globalId.y);
if (x >= outputSize.x || y >= outputSize.y) {
  return;
}
let inIdx = (y + inputOffset.y) * inputSize.x + x + inputOffset.x;
let outIdx = (y + outputOffset.y) * imageSize.x + x + outputOffset.x;
let col = in_color[inIdx];
let raw = ${e?"textureLoad(in_raw, globalId.xy + vec2u(outputOffset), 0)":"in_raw[outIdx]"};

if (${t}) {
  out_color[outIdx] = vec4f(raw.rgb, 1.0 - col.r);
}
else if (${r}) {
  out_color[outIdx] = vec4f(
    vec3f(HDRInverse(col.r), HDRInverse(col.g), HDRInverse(col.b)) / inputScale,
    // Pick the alpha
    raw.a
  );
}
else {
  out_color[outIdx] = vec4f(col.rgb, raw.a);
}
`})}setImageSize(e,t){this._inputPassAux.setUniform("inputSize",new Int32Array([e,t])),this._inputPassColor.setUniform("inputSize",new Int32Array([e,t])),this._outputPass.setUniform("imageSize",new Int32Array([e,t])),this._outputPass.setSize(e,t),this._copyPass.setSize(e,t),this._copyPass.setUniform("size",new Int32Array([e,t]))}setInputTile(e){let t=new Int32Array([e.width,e.height]);[this._inputPassAux,this._inputPassColor].forEach(r=>{r.setUniform("inputOffset",new Int32Array([e.x,e.y])),r.setUniform("outputSize",t),r.setSize(t[0],t[1])}),this._outputPass.setUniform("inputSize",t)}setOutputTile(e,t){let r=this._outputPass,o=new Int32Array([e.width,e.height]),n=e.x-t.x,a=e.y-t.y;r.setUniform("outputSize",o),r.setUniform("inputOffset",new Int32Array([n,a])),r.setUniform("outputOffset",new Int32Array([e.x,e.y])),r.setExecuteSize(o[0],o[1])}forward(e,t,r,o){let n=e instanceof GPUTexture;this._updatePasses(n,o);let a=this._inputPassAux,u=this._inputPassColor,s=this._device.createCommandEncoder();function l(p){return p instanceof GPUTexture?{texture:p,channels:4}:{buffer:p,channels:4}}return t&&r?a.createPass(s,{color:l(e),albedo:l(t),normal:l(r)}):u.createPass(s,{color:l(e)}),this._device.queue.submit([s.finish()]),t&&r?{color:a.getOutput("color"),albedo:a.getOutput("albedo"),normal:a.getOutput("normal")}:{color:u.getOutput("color")}}inverse(e,t){let o=this._device.createCommandEncoder(),n=this._outputPass;return n.createPass(o,{color:{buffer:e,channels:4},raw:t instanceof GPUBuffer?{buffer:t,channels:4}:{texture:t,channels:4}}),this._device.queue.submit([o.finish()]),n.getOutput("color")}copyInputDataToOutput(e){let t=this._device.createCommandEncoder(),o=this._outputPass.getOutput("color"),n=this._copyPass;e instanceof GPUTexture?(n.setOutputBuffers({color:o}),n.createPass(t,{color:{texture:e,channels:4}})):t.copyBufferToBuffer(e,0,o,0,o.size),this._device.queue.submit([t.finish()])}dispose(){this._outputPass.dispose(),this._inputPassAux.dispose(),this._inputPassColor.dispose(),this._copyPass.dispose(!1)}};function Ie(i,e){return Math.ceil(i/e)*e}function Jr(i,e){return Math.floor(i/e)*e}function Zr(i,e,t){let r=Math.round(t*i/e),o=Math.round((t+1)*i/e);return{start:r,end:o}}function rt(i,e,t,r=0){let o=e-i,n=Math.max(r,Ie(o,16)),a=i-Math.floor((n-o)/2);return a=it(a,0,Math.max(0,t-n)),{start:a,end:a+n}}function nt(i,e,t,r){if(!Number.isInteger(i)||i<=0||!Number.isInteger(e)||e<=0)throw new Error("Tile grid dimensions must be positive integers");if(!Number.isFinite(t)||t<=0)throw new Error("Maximum tile size must be positive");if(!Number.isFinite(r)||r<0)throw new Error("Tile overlap must be non-negative");let o=Math.max(16,Jr(t,16)),n=Ie(r,16),a=Math.max(1,Math.ceil(i/o)),u=Math.max(1,Math.ceil(e/o)),s=[],l=0,p=0;for(let h=0;h<u;h++){let g=Zr(e,u,h);for(let _=0;_<a;_++){let x=Zr(i,a,_),m={start:_===0?x.start:Math.max(0,x.start-n),end:_===a-1?x.end:Math.min(i,x.end+n)},y={start:h===0?g.start:Math.max(0,g.start-n),end:h===u-1?g.end:Math.min(e,g.end+n)},S=rt(m.start,m.end,i),w=rt(y.start,y.end,e),T={x:x.start,y:g.start,width:x.end-x.start,height:g.end-g.start},$={x:S.start,y:w.start,width:S.end-S.start,height:w.end-w.start};l=Math.max(l,T.width),p=Math.max(p,T.height),s.push({column:_,row:h,input:$,output:T})}}let c=()=>new Set(s.map(({input:h})=>`${h.width}x${h.height}`));if(c().size>2){let h=Math.max(...s.map(({input:m})=>m.width)),g=Math.max(...s.map(({input:m})=>m.height)),_=s.reduce((m,{input:y})=>m+h*y.height,0),x=s.reduce((m,{input:y})=>m+y.width*g,0);if(_<=x)for(let m of s){let y=rt(m.input.x,m.input.x+m.input.width,i,h);m.input.x=y.start,m.input.width=y.end-y.start}else for(let m of s){let y=rt(m.input.y,m.input.y+m.input.height,e,g);m.input.y=y.start,m.input.height=y.end-y.start}}let d=c(),f=s.reduce((h,{input:g})=>h+g.width*g.height,0);return{columns:a,rows:u,overlap:n,maxOutputWidth:l,maxOutputHeight:p,inputPixelCount:f,inputShapeCount:d.size,tiles:s}}function it(i,e,t){return Math.min(Math.max(i,e),t)}function Qo(i,e){let t=[...i].sort((r,o)=>r-o);return t[Math.ceil(t.length*e)-1]}var ot=class{enabled;maxTileSize;minTileSize;targetTileTimeMs;_tileSize;_adjustmentStep;_smoothedTileTimeMs;_completeExecutionsSinceChange=0;constructor(e,t=!0){let r=typeof t=="object"?t:{};this.enabled=t!==!1,this.maxTileSize=Math.max(16,Jr(e,16)),this.minTileSize=it(Ie(r.minTileSize??256,16),16,this.maxTileSize),this.targetTileTimeMs=Math.max(1,r.targetTileTimeMs??16),this._adjustmentStep=Math.max(16,Ie(r.adjustmentStep??16,16)),this._tileSize=this.enabled?it(Ie(r.initialTileSize??432,16),this.minTileSize,this.maxTileSize):this.maxTileSize}get tileSize(){return this._tileSize}observe(e){if(!this.enabled||e.length===0)return!1;let t=e.filter(a=>Number.isFinite(a)&&a>=0);if(t.length===0)return!1;let r=t.length>=3?t.slice(1):t,o=Qo(r,.75);if(this._smoothedTileTimeMs=this._smoothedTileTimeMs===void 0?o:this._smoothedTileTimeMs*.65+o*.35,this._completeExecutionsSinceChange++,this._completeExecutionsSinceChange<2)return!1;let n=this._tileSize;return this._smoothedTileTimeMs>this.targetTileTimeMs*1.25?n-=this._adjustmentStep:this._smoothedTileTimeMs<this.targetTileTimeMs*.65&&(n+=this._adjustmentStep),n=it(Ie(n,16),this.minTileSize,this.maxTileSize),n===this._tileSize?!1:(this._tileSize=n,this._smoothedTileTimeMs=void 0,this._completeExecutionsSinceChange=0,!0)}};function b(i,e){return{op:"conv2d",id:i,input:e,weight:`${i}.weight`,bias:`${i}.bias`,activation:"relu",padding:"same"}}function se(i,e){return{op:"maxPool2d",id:i,input:e,size:2,stride:2,padding:"same"}}function ue(i,e){return{op:"upsample2d",id:i,input:e,scale:2,mode:"nearest"}}function ce(i,e,t){return{op:"concat",id:i,inputs:[e,t],axis:"channels"}}var ti={schemaVersion:1,id:"oidn-unet-small-v1",family:"oidn-unet-small",input:"input",output:"dec_conv0",receptiveField:174,nodes:[b("enc_conv0","input"),b("enc_conv1","enc_conv0"),se("pool1","enc_conv1"),b("enc_conv2","pool1"),se("pool2","enc_conv2"),b("enc_conv3","pool2"),se("pool3","enc_conv3"),b("enc_conv4","pool3"),se("pool4","enc_conv4"),b("enc_conv5a","pool4"),b("enc_conv5b","enc_conv5a"),ue("up4","enc_conv5b"),ce("concat4","up4","pool3"),b("dec_conv4a","concat4"),b("dec_conv4b","dec_conv4a"),ue("up3","dec_conv4b"),ce("concat3","up3","pool2"),b("dec_conv3a","concat3"),b("dec_conv3b","dec_conv3a"),ue("up2","dec_conv3b"),ce("concat2","up2","pool1"),b("dec_conv2a","concat2"),b("dec_conv2b","dec_conv2a"),ue("up1","dec_conv2b"),ce("concat1","up1","input"),b("dec_conv1a","concat1"),b("dec_conv1b","dec_conv1a"),b("dec_conv0","dec_conv1b")]},ri={schemaVersion:1,id:"oidn-unet-large-v1",family:"oidn-unet-large",input:"input",output:"dec_conv1c",receptiveField:202,nodes:[b("enc_conv1a","input"),b("enc_conv1b","enc_conv1a"),se("pool1","enc_conv1b"),b("enc_conv2a","pool1"),b("enc_conv2b","enc_conv2a"),se("pool2","enc_conv2b"),b("enc_conv3a","pool2"),b("enc_conv3b","enc_conv3a"),se("pool3","enc_conv3b"),b("enc_conv4a","pool3"),b("enc_conv4b","enc_conv4a"),se("pool4","enc_conv4b"),b("enc_conv5a","pool4"),b("enc_conv5b","enc_conv5a"),ue("up4","enc_conv5b"),ce("concat4","up4","pool3"),b("dec_conv4a","concat4"),b("dec_conv4b","dec_conv4a"),ue("up3","dec_conv4b"),ce("concat3","up3","pool2"),b("dec_conv3a","concat3"),b("dec_conv3b","dec_conv3a"),ue("up2","dec_conv3b"),ce("concat2","up2","pool1"),b("dec_conv2a","concat2"),b("dec_conv2b","dec_conv2a"),ue("up1","dec_conv2b"),ce("concat1","up1","input"),b("dec_conv1a","concat1"),b("dec_conv1b","dec_conv1a"),b("dec_conv1c","dec_conv1b")]},en=[ti,ri];function ii(i){let e=new Set;for(let t of i.nodes)t.op==="conv2d"&&(e.add(t.weight),e.add(t.bias));return e}function Qr(i){return i.desc.getByteSize()}function oi(i){return[...i].sort().join(", ")}function at(i,e=en){let t=e.filter(r=>{let o=ii(r);return[...o].some(n=>!i.has(n))?!1:r.allowAdditionalTensors===!0||[...i.keys()].every(n=>o.has(n))});if(t.length===1)return t[0];throw t.length>1?new Error(`Ambiguous OIDN model topology: ${t.map(r=>r.id).join(", ")}`):new Error(`Unsupported OIDN model topology. TZA tensors: ${oi(i.keys())}`)}function ei(i,e,t){let r=i.get(e);if(!r)throw new Error(`Model ${t} is missing tensor ${e}`);if(r.data.byteLength!==Qr(r))throw new Error(`Tensor ${e} has ${r.data.byteLength} bytes, expected ${Qr(r)}`);return r}function Wt(i,e=at(i)){if(e.schemaVersion!==1)throw new Error(`Unsupported model descriptor schema ${e.schemaVersion}`);let t=ii(e);if(!e.allowAdditionalTensors){let c=[...i.keys()].filter(d=>!t.has(d));if(c.length>0)throw new Error(`Model ${e.id} has unexpected tensors: ${oi(c)}`)}let r=new Map,o=new Map,n=new Map,a=new Set([e.input]),u,s,l=(c,d)=>{let f=r.get(c);if(f===void 0)throw new Error(`Model ${e.id} node ${d} reads unknown or forward value ${c}`);return f};for(let c of e.nodes){if(a.has(c.id))throw new Error(`Model ${e.id} produces duplicate value ${c.id}`);if(c.op==="conv2d"){let d=ei(i,c.weight,e.id),f=ei(i,c.bias,e.id),h=d.desc.dims;if(d.desc.layout!=="oihw"||h.length!==4)throw new Error(`Tensor ${c.weight} must use OIHW layout`);if(h[2]!==3||h[3]!==3)throw new Error(`Tensor ${c.weight} must use a 3x3 kernel`);if(f.desc.layout!=="x"||f.desc.dims.length!==1)throw new Error(`Tensor ${c.bias} must be a one-dimensional bias`);if(f.desc.dims[0]!==h[0])throw new Error(`Tensor ${c.bias} has ${f.desc.dims[0]} channels, expected ${h[0]}`);if(d.desc.dataType!==f.desc.dataType)throw new Error(`Weight and bias dtype differ for ${c.id}`);if(s&&s!==d.desc.dataType)throw new Error(`Mixed tensor dtypes are not supported by model ${e.id}`);s=d.desc.dataType,c.input===e.input&&u===void 0&&(u=h[1],r.set(e.input,u));let g=l(c.input,c.id);if(g!==h[1])throw new Error(`Tensor ${c.weight} expects ${h[1]} input channels, but ${c.input} provides ${g}`);r.set(c.id,h[0]),o.set(c.id,{weight:d,bias:f,inputChannels:h[1],outputChannels:h[0],kernelHeight:h[2],kernelWidth:h[3]}),n.set(c.id,{inputChannels:h[1],outputChannels:h[0]})}else if(c.op==="concat"){if(c.inputs.length<2)throw new Error(`Concat ${c.id} requires at least two inputs`);let d=c.inputs.reduce((f,h)=>f+l(h,c.id),0);r.set(c.id,d)}else r.set(c.id,l(c.input,c.id));a.add(c.id)}if(u===void 0||s===void 0)throw new Error(`Model ${e.id} has no convolution reading its input`);let p=r.get(e.output);if(p===void 0)throw new Error(`Model ${e.id} output ${e.output} is not produced`);if(p!==3)throw new Error(`Model ${e.id} must produce 3 channels, got ${p}`);return{spec:e,inputChannels:u,outputChannels:p,tensorDataType:s,channelsByValue:r,convChannels:n,convTensors:o}}var ni="This is not an object",ai="This is not a Float16Array object",zt="This constructor is not a subclass of Float16Array",st="The constructor property value is not an object",si="Species constructor didn't return TypedArray object",ui="Derived constructor created TypedArray object which was too small length",Te="Attempting to access detached ArrayBuffer",De="Cannot convert undefined or null to object",ut="Cannot mix BigInt and other types, use explicit conversions",Gt="@@iterator property is not callable",Ft="Reduce of empty array with no initial value",ci="The comparison function must be either a function or undefined",ct="Offset is out of bounds";function B(i){return(e,...t)=>Y(i,e,t)}function ke(i,e){return B(le(i,e).get)}var{apply:Y,construct:Pe,defineProperty:Xt,get:pt,getOwnPropertyDescriptor:le,getPrototypeOf:Se,has:Re,ownKeys:dt,set:Ht,setPrototypeOf:Vt}=Reflect,li=Proxy,{EPSILON:pi,MAX_SAFE_INTEGER:Kt,isFinite:ft,isNaN:ne}=Number,{iterator:K,species:di,toStringTag:ht,for:fi}=Symbol,ge=Object,{create:We,defineProperty:me,freeze:hi,is:jt}=ge,Yt=ge.prototype,gi=Yt.__lookupGetter__?B(Yt.__lookupGetter__):(i,e)=>{if(i==null)throw E(De);let t=ge(i);do{let r=le(t,e);if(r!==void 0)return ee(r,"get")?r.get:void 0}while((t=Se(t))!==null)},ee=ge.hasOwn||B(Yt.hasOwnProperty),mi=Array,qt=mi.isArray,gt=mi.prototype,_i=B(gt.join),yi=B(gt.push),xi=B(gt.toLocaleString),ze=gt[K],wi=B(ze),{abs:vi,trunc:mt}=Math,Be=ArrayBuffer,bi=Be.isView,$i=Be.prototype,Ii=B($i.slice),Ti=ke($i,"byteLength"),lt=typeof SharedArrayBuffer<"u"?SharedArrayBuffer:null,ki=lt&&ke(lt.prototype,"byteLength"),_t=Se(Uint8Array),tn=_t.from,L=_t.prototype,Pi=L[K],Si=B(L.keys),Bi=B(L.values),Ei=B(L.entries),Ci=B(L.set),Zt=B(L.reverse),Ai=B(L.fill),Oi=B(L.copyWithin),Jt=B(L.sort),Ee=B(L.slice),Ni=B(L.subarray),D=ke(L,"buffer"),pe=ke(L,"byteOffset"),I=ke(L,"length"),Qt=ke(L,ht),Mi=Uint8Array,X=Uint16Array,er=(...i)=>Y(tn,X,i),yt=Uint32Array,Ui=Float32Array,ae=Se([][K]()),Ce=B(ae.next),Li=B((function*(){})().next),Di=Se(ae),Ri=DataView.prototype,ea=B(Ri.getUint16),ta=B(Ri.setUint16),E=TypeError,xt=RangeError,tr=WeakSet,Wi=tr.prototype,zi=B(Wi.add),Gi=B(Wi.has),Ae=WeakMap,rr=Ae.prototype,Oe=B(rr.get),Fi=B(rr.has),Ge=B(rr.set);var Yi=new Ae,rn=We(null,{next:{value:function(){let e=Oe(Yi,this);return Ce(e)}},[K]:{value:function(){return this}}});function Fe(i){if(i[K]===ze&&ae.next===Ce)return i;let e=We(rn);return Ge(Yi,e,wi(i)),e}var Xi=new Ae,Hi=We(Di,{next:{value:function(){let e=Oe(Xi,this);return Li(e)},writable:!0,configurable:!0}});for(let i of dt(ae))i!=="next"&&me(Hi,i,le(ae,i));function ir(i){let e=We(Hi);return Ge(Xi,e,i),e}function _e(i){return i!==null&&typeof i=="object"||typeof i=="function"}function or(i){return i!==null&&typeof i=="object"}function Ye(i){return Qt(i)!==void 0}function wt(i){let e=Qt(i);return e==="BigInt64Array"||e==="BigUint64Array"}function on(i){try{return qt(i)?!1:(Ti(i),!0)}catch{return!1}}function nr(i){if(lt===null)return!1;try{return ki(i),!0}catch{return!1}}function Vi(i){return on(i)||nr(i)}function ar(i){return qt(i)?i[K]===ze&&ae.next===Ce:!1}function Ki(i){return Ye(i)?i[K]===Pi&&ae.next===Ce:!1}function Xe(i){if(typeof i!="string")return!1;let e=+i;return i!==e+""||!ft(e)?!1:e===mt(e)}var He=fi("__Float16Array__");function ji(i){if(!or(i))return!1;let e=Se(i);if(!or(e))return!1;let t=e.constructor;if(t===void 0)return!1;if(!_e(t))throw E(st);return Re(t,He)}var sr=1/pi;function nn(i){return i+sr-sr}var Zi=6103515625e-14,an=65504,Ji=.0009765625,qi=Ji*Zi,sn=Ji*sr;function un(i){let e=+i;if(!ft(e)||e===0)return e;let t=e>0?1:-1,r=vi(e);if(r<Zi)return t*nn(r/qi)*qi;let o=(1+sn)*r,n=o-(o-r);return n>an||ne(n)?t*(1/0):t*n}var Qi=new Be(4),eo=new Ui(Qi),to=new yt(Qi),q=new X(512),Z=new Mi(512);for(let i=0;i<256;++i){let e=i-127;e<-24?(q[i]=0,q[i|256]=32768,Z[i]=24,Z[i|256]=24):e<-14?(q[i]=1024>>-e-14,q[i|256]=1024>>-e-14|32768,Z[i]=-e-1,Z[i|256]=-e-1):e<=15?(q[i]=e+15<<10,q[i|256]=e+15<<10|32768,Z[i]=13,Z[i|256]=13):e<128?(q[i]=31744,q[i|256]=64512,Z[i]=24,Z[i|256]=24):(q[i]=31744,q[i|256]=64512,Z[i]=13,Z[i|256]=13)}function J(i){eo[0]=un(i);let e=to[0],t=e>>23&511;return q[t]+((e&8388607)>>Z[t])}var ur=new yt(2048);for(let i=1;i<1024;++i){let e=i<<13,t=0;for(;(e&8388608)===0;)e<<=1,t-=8388608;e&=-8388609,t+=947912704,ur[i]=e|t}for(let i=1024;i<2048;++i)ur[i]=939524096+(i-1024<<13);var Ne=new yt(64);for(let i=1;i<31;++i)Ne[i]=i<<23;Ne[31]=1199570944;Ne[32]=2147483648;for(let i=33;i<63;++i)Ne[i]=2147483648+(i-32<<23);Ne[63]=3347054592;var ro=new X(64);for(let i=1;i<64;++i)i!==32&&(ro[i]=1024);function P(i){let e=i>>10;return to[0]=ur[ro[e]+(i&1023)]+Ne[e],eo[0]}function te(i){let e=+i;return ne(e)||e===0?0:mt(e)}function vt(i){let e=te(i);return e<0?0:e<Kt?e:Kt}function Ve(i,e){if(!_e(i))throw E(ni);let t=i.constructor;if(t===void 0)return e;if(!_e(t))throw E(st);let r=t[di];return r??e}function Me(i){if(nr(i))return!1;try{return Ii(i,0,0),!1}catch{}return!0}function cr(i,e){let t=ne(i),r=ne(e);if(t&&r)return 0;if(t)return 1;if(r||i<e)return-1;if(i>e)return 1;if(i===0&&e===0){let o=jt(i,0),n=jt(e,0);if(!o&&n)return-1;if(o&&!n)return 1}return 0}var lr=2,$t=new Ae;function ye(i){return Fi($t,i)||!bi(i)&&ji(i)}function k(i){if(!ye(i))throw E(ai)}function bt(i,e){let t=ye(i),r=Ye(i);if(!t&&!r)throw E(si);if(typeof e=="number"){let o;if(t){let n=v(i);o=I(n)}else o=I(i);if(o<e)throw E(ui)}if(wt(i))throw E(ut)}function v(i){let e=Oe($t,i);if(e!==void 0){let o=D(e);if(Me(o))throw E(Te);return e}let t=i.buffer;if(Me(t))throw E(Te);let r=Pe(H,[t,i.byteOffset,i.length],i.constructor);return Oe($t,r)}function io(i){let e=I(i),t=[];for(let r=0;r<e;++r)t[r]=P(i[r]);return t}var oo=new tr;for(let i of dt(L)){if(i===ht)continue;let e=le(L,i);ee(e,"get")&&typeof e.get=="function"&&zi(oo,e.get)}var cn=hi({get(i,e,t){return Xe(e)&&ee(i,e)?P(pt(i,e)):Gi(oo,gi(i,e))?pt(i,e):pt(i,e,t)},set(i,e,t,r){return Xe(e)&&ee(i,e)?Ht(i,e,J(t)):Ht(i,e,t,r)},getOwnPropertyDescriptor(i,e){if(Xe(e)&&ee(i,e)){let t=le(i,e);return t.value=P(t.value),t}return le(i,e)},defineProperty(i,e,t){return Xe(e)&&ee(i,e)&&ee(t,"value")?(t.value=J(t.value),Xt(i,e,t)):Xt(i,e,t)}}),H=class i{constructor(e,t,r){let o;if(ye(e))o=Pe(X,[v(e)],new.target);else if(_e(e)&&!Vi(e)){let a,u;if(Ye(e)){a=e,u=I(e);let s=D(e);if(Me(s))throw E(Te);if(wt(e))throw E(ut);let l=new Be(u*lr);o=Pe(X,[l],new.target)}else{let s=e[K];if(s!=null&&typeof s!="function")throw E(Gt);s!=null?ar(e)?(a=e,u=e.length):(a=[...e],u=a.length):(a=e,u=vt(a.length)),o=Pe(X,[u],new.target)}for(let s=0;s<u;++s)o[s]=J(a[s])}else o=Pe(X,arguments,new.target);let n=new li(o,cn);return Ge($t,n,o),n}static from(e,...t){let r=this;if(!Re(r,He))throw E(zt);if(r===i){if(ye(e)&&t.length===0){let p=v(e),c=new X(D(p),pe(p),I(p));return new i(D(Ee(c)))}if(t.length===0)return new i(D(er(e,J)));let s=t[0],l=t[1];return new i(D(er(e,function(p,...c){return J(Y(s,this,[p,...Fe(c)]))},l)))}let o,n,a=e[K];if(a!=null&&typeof a!="function")throw E(Gt);if(a!=null)ar(e)?(o=e,n=e.length):Ki(e)?(o=e,n=I(e)):(o=[...e],n=o.length);else{if(e==null)throw E(De);o=ge(e),n=vt(o.length)}let u=new r(n);if(t.length===0)for(let s=0;s<n;++s)u[s]=o[s];else{let s=t[0],l=t[1];for(let p=0;p<n;++p)u[p]=Y(s,l,[o[p],p])}return u}static of(...e){let t=this;if(!Re(t,He))throw E(zt);let r=e.length;if(t===i){let n=new i(r),a=v(n);for(let u=0;u<r;++u)a[u]=J(e[u]);return n}let o=new t(r);for(let n=0;n<r;++n)o[n]=e[n];return o}keys(){k(this);let e=v(this);return Si(e)}values(){k(this);let e=v(this);return ir((function*(){for(let t of Bi(e))yield P(t)})())}entries(){k(this);let e=v(this);return ir((function*(){for(let[t,r]of Ei(e))yield[t,P(r)]})())}at(e){k(this);let t=v(this),r=I(t),o=te(e),n=o>=0?o:r+o;if(!(n<0||n>=r))return P(t[n])}with(e,t){k(this);let r=v(this),o=I(r),n=te(e),a=n>=0?n:o+n,u=+t;if(a<0||a>=o)throw xt(ct);let s=new X(D(r),pe(r),I(r)),l=new i(D(Ee(s))),p=v(l);return p[a]=J(u),l}map(e,...t){k(this);let r=v(this),o=I(r),n=t[0],a=Ve(r,i);if(a===i){let s=new i(o),l=v(s);for(let p=0;p<o;++p){let c=P(r[p]);l[p]=J(Y(e,n,[c,p,this]))}return s}let u=new a(o);bt(u,o);for(let s=0;s<o;++s){let l=P(r[s]);u[s]=Y(e,n,[l,s,this])}return u}filter(e,...t){k(this);let r=v(this),o=I(r),n=t[0],a=[];for(let l=0;l<o;++l){let p=P(r[l]);Y(e,n,[p,l,this])&&yi(a,p)}let u=Ve(r,i),s=new u(a);return bt(s),s}reduce(e,...t){k(this);let r=v(this),o=I(r);if(o===0&&t.length===0)throw E(Ft);let n,a;t.length===0?(n=P(r[0]),a=1):(n=t[0],a=0);for(let u=a;u<o;++u)n=e(n,P(r[u]),u,this);return n}reduceRight(e,...t){k(this);let r=v(this),o=I(r);if(o===0&&t.length===0)throw E(Ft);let n,a;t.length===0?(n=P(r[o-1]),a=o-2):(n=t[0],a=o-1);for(let u=a;u>=0;--u)n=e(n,P(r[u]),u,this);return n}forEach(e,...t){k(this);let r=v(this),o=I(r),n=t[0];for(let a=0;a<o;++a)Y(e,n,[P(r[a]),a,this])}find(e,...t){k(this);let r=v(this),o=I(r),n=t[0];for(let a=0;a<o;++a){let u=P(r[a]);if(Y(e,n,[u,a,this]))return u}}findIndex(e,...t){k(this);let r=v(this),o=I(r),n=t[0];for(let a=0;a<o;++a){let u=P(r[a]);if(Y(e,n,[u,a,this]))return a}return-1}findLast(e,...t){k(this);let r=v(this),o=I(r),n=t[0];for(let a=o-1;a>=0;--a){let u=P(r[a]);if(Y(e,n,[u,a,this]))return u}}findLastIndex(e,...t){k(this);let r=v(this),o=I(r),n=t[0];for(let a=o-1;a>=0;--a){let u=P(r[a]);if(Y(e,n,[u,a,this]))return a}return-1}every(e,...t){k(this);let r=v(this),o=I(r),n=t[0];for(let a=0;a<o;++a)if(!Y(e,n,[P(r[a]),a,this]))return!1;return!0}some(e,...t){k(this);let r=v(this),o=I(r),n=t[0];for(let a=0;a<o;++a)if(Y(e,n,[P(r[a]),a,this]))return!0;return!1}set(e,...t){k(this);let r=v(this),o=te(t[0]);if(o<0)throw xt(ct);if(e==null)throw E(De);if(wt(e))throw E(ut);if(ye(e))return Ci(v(this),v(e),o);if(Ye(e)){let s=D(e);if(Me(s))throw E(Te)}let n=I(r),a=ge(e),u=vt(a.length);if(o===1/0||u+o>n)throw xt(ct);for(let s=0;s<u;++s)r[s+o]=J(a[s])}reverse(){k(this);let e=v(this);return Zt(e),this}toReversed(){k(this);let e=v(this),t=new X(D(e),pe(e),I(e)),r=new i(D(Ee(t))),o=v(r);return Zt(o),r}fill(e,...t){k(this);let r=v(this);return Ai(r,J(e),...Fe(t)),this}copyWithin(e,t,...r){k(this);let o=v(this);return Oi(o,e,t,...Fe(r)),this}sort(e){k(this);let t=v(this),r=e!==void 0?e:cr;return Jt(t,(o,n)=>r(P(o),P(n))),this}toSorted(e){k(this);let t=v(this);if(e!==void 0&&typeof e!="function")throw new E(ci);let r=e!==void 0?e:cr,o=new X(D(t),pe(t),I(t)),n=new i(D(Ee(o))),a=v(n);return Jt(a,(u,s)=>r(P(u),P(s))),n}slice(e,t){k(this);let r=v(this),o=Ve(r,i);if(o===i){let h=new X(D(r),pe(r),I(r));return new i(D(Ee(h,e,t)))}let n=I(r),a=te(e),u=t===void 0?n:te(t),s;a===-1/0?s=0:a<0?s=n+a>0?n+a:0:s=n<a?n:a;let l;u===-1/0?l=0:u<0?l=n+u>0?n+u:0:l=n<u?n:u;let p=l-s>0?l-s:0,c=new o(p);if(bt(c,p),p===0)return c;let d=D(r);if(Me(d))throw E(Te);let f=0;for(;s<l;)c[f]=P(r[s]),++s,++f;return c}subarray(e,t){k(this);let r=v(this),o=Ve(r,i),n=new X(D(r),pe(r),I(r)),a=Ni(n,e,t),u=new o(D(a),pe(a),I(a));return bt(u),u}indexOf(e,...t){k(this);let r=v(this),o=I(r),n=te(t[0]);if(n===1/0)return-1;n<0&&(n+=o,n<0&&(n=0));for(let a=n;a<o;++a)if(ee(r,a)&&P(r[a])===e)return a;return-1}lastIndexOf(e,...t){k(this);let r=v(this),o=I(r),n=t.length>=1?te(t[0]):o-1;if(n===-1/0)return-1;n>=0?n=n<o-1?n:o-1:n+=o;for(let a=n;a>=0;--a)if(ee(r,a)&&P(r[a])===e)return a;return-1}includes(e,...t){k(this);let r=v(this),o=I(r),n=te(t[0]);if(n===1/0)return!1;n<0&&(n+=o,n<0&&(n=0));let a=ne(e);for(let u=n;u<o;++u){let s=P(r[u]);if(a&&ne(s)||s===e)return!0}return!1}join(e){k(this);let t=v(this),r=io(t);return _i(r,e)}toLocaleString(...e){k(this);let t=v(this),r=io(t);return xi(r,...Fe(e))}get[ht](){if(ye(this))return"Float16Array"}};me(H,"BYTES_PER_ELEMENT",{value:lr});me(H,He,{});Vt(H,_t);var It=H.prototype;me(It,"BYTES_PER_ELEMENT",{value:lr});me(It,K,{value:It.values,writable:!0,configurable:!0});Vt(It,L);function pr(i,e,t=!1){let r=i==="fp16"?2:4,o=100*e,n=t?9*e*4:0;return(o+n)*4*r}function ln(i){return i==="fp16"?"vec4<f16>":"vec4<f32>"}function pn(i){return i==="fp16"?`enable f16;
`:""}function dn(i,e,t){let r=o=>`${t}[weightBase + ${o}u]`;return i==="fp16"?`
        let inputValue = vec4<f16>(${e});
        var partial = vec4<f16>(0.0h);
        partial = fma(${r(0)}, vec4<f16>(inputValue.x), partial);
        partial = fma(${r(1)}, vec4<f16>(inputValue.y), partial);
        partial = fma(${r(2)}, vec4<f16>(inputValue.z), partial);
        partial = fma(${r(3)}, vec4<f16>(inputValue.w), partial);
        acc += vec4<f32>(partial);
`:`
        let inputValue = vec4<f32>(${e});
        acc = fma(vec4<f32>(${r(0)}), vec4<f32>(inputValue.x), acc);
        acc = fma(vec4<f32>(${r(1)}), vec4<f32>(inputValue.y), acc);
        acc = fma(vec4<f32>(${r(2)}), vec4<f32>(inputValue.z), acc);
        acc = fma(vec4<f32>(${r(3)}), vec4<f32>(inputValue.w), acc);
`}function no(i,e,t,r=!1){if(!Number.isInteger(t)||t<1)throw new Error(`Final RGB shader requires positive input blocks, got ${t}`);let o=ln(i),n="vec4<f32>",a=100*t,u=9*t*4,s=e==="relu"?"max(acc, vec4<f32>(0.0))":"acc",l=dn(i,"inputTile[patchBase + inputBlock]",r?"weightTile":"weights");return`${pn(i)}
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
${r?`var<workgroup> weightTile: array<${o}, ${u}>;`:""}

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
    let tilePixel = loadIndex / ${t}u;
    let inputBlock = loadIndex % ${t}u;
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
        ${t}u + inputBlock;
      value = inputData[inputIndex];
    }
    inputTile[loadIndex] = value;
  }

${r?`  for (
    var loadIndex = localLinear;
    loadIndex < ${u}u;
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
        ${t}u;
      for (var inputBlock = 0u; inputBlock < ${t}u; inputBlock++) {
        let weightBase =
          ((ky * 3u + kx) * ${t}u + inputBlock) * 4u;
        ${l}
      }
    }
  }

  let outputIndex =
    (gid.y * params.outputWidth + gid.x) * 1u + gid.z;
  outputData[outputIndex] = ${s};
}
`}function fn(i){return i.op==="concat"?i.inputs:[i.input]}function hn(i){let e=new Map;for(let t of i.nodes)for(let r of fn(t)){let o=e.get(r)??[];o.push(t),e.set(r,o)}return e}function dr(i,e,t){let r=i.get(e);if(!(r?.length!==1||r[0].op!==t))return r[0]}function Ke(i,e={}){let t=i.spec,r=hn(t),o=new Map(t.nodes.map(p=>[p.id,p])),n=new Set,a=new Map,u=0,s=0;if(e.fuseConvPool!==!1)for(let p of t.nodes){if(p.op!=="conv2d"||p.activation!=="relu")continue;let c=dr(r,p.id,"maxPool2d");!c||c.size!==2||c.stride!==2||(n.add(p.id),a.set(c.id,{op:"fusedConvReluMaxPool2d",id:c.id,input:p.input,conv:p,pool:c}),u++)}if(e.fuseUpsampleConcatConv!==!1)for(let p of t.nodes){if(p.op!=="conv2d")continue;let c=o.get(p.input);if(c?.op!=="concat"||c.inputs.length!==2||dr(r,c.id,"conv2d")!==p)continue;let d=i.channelsByValue.get(c.inputs[0]);if(d===void 0||d%4!==0)continue;let f=c.inputs.map(g=>{let _=o.get(g);return _?.op==="upsample2d"&&_.scale===2&&_.mode==="nearest"&&dr(r,_.id,"concat")===c?{value:_.input,upsample:_}:{value:g}});if(f.filter(g=>g.upsample).length===1){n.add(c.id);for(let g of c.inputs){let _=o.get(g);_?.op==="upsample2d"&&n.add(_.id)}a.set(p.id,{op:"fusedUpsampleConcatConv2d",id:p.id,inputs:f,conv:p}),s++}}let l=[];for(let p of t.nodes){let c=a.get(p.id);c?l.push(c):n.has(p.id)||l.push(p)}return{spec:t,nodes:l,fusions:{convPool:u,upsampleConcatConv:s}}}function gn(i){return i.op==="concat"?i.inputs:i.op==="fusedUpsampleConcatConv2d"?i.inputs.map(e=>e.value):[i.input]}function ao(i,e){return i.width===e.width&&i.height===e.height}function fr(i,e,t,r){if(!Number.isInteger(e)||e<=0||!Number.isInteger(t)||t<=0)throw new Error(`Invalid model input size ${e}x${t}`);let o=Ke(i,r),n={width:e,height:t,channels:i.inputChannels},a=new Map([[i.spec.input,n]]),u=[],s=(c,d)=>{let f=a.get(c);if(!f)throw new Error(`Planned node ${d} reads missing value ${c}`);return f};for(let c of o.nodes){let d;if(c.op==="conv2d"){let f=s(c.input,c.id);d={width:f.width,height:f.height,channels:i.convChannels.get(c.id).outputChannels}}else if(c.op==="maxPool2d"){let f=s(c.input,c.id);d={width:Math.ceil(f.width/2),height:Math.ceil(f.height/2),channels:f.channels}}else if(c.op==="upsample2d"){let f=s(c.input,c.id);d={width:f.width*2,height:f.height*2,channels:f.channels}}else if(c.op==="concat"){let f=c.inputs.map(h=>s(h,c.id));if(f.some(h=>!ao(h,f[0])))throw new Error(`Concat ${c.id} has mismatched spatial shapes`);d={width:f[0].width,height:f[0].height,channels:f.reduce((h,g)=>h+g.channels,0)}}else if(c.op==="fusedConvReluMaxPool2d"){let f=s(c.input,c.id);d={width:Math.ceil(f.width/2),height:Math.ceil(f.height/2),channels:i.convChannels.get(c.conv.id).outputChannels}}else{let f=c.inputs.map(h=>{let g=s(h.value,c.id);return h.upsample?{...g,width:g.width*2,height:g.height*2}:g});if(f.some(h=>!ao(h,f[0])))throw new Error(`Fused decoder ${c.id} has mismatched spatial shapes`);d={width:f[0].width,height:f[0].height,channels:i.convChannels.get(c.conv.id).outputChannels}}a.set(c.id,d),u.push(d)}let l=new Map;o.nodes.forEach((c,d)=>{for(let f of gn(c))l.set(f,d)}),l.set(i.spec.output,o.nodes.length);let p=o.nodes.map((c,d)=>({node:c,outputShape:u[d],lastUse:l.get(c.id)??d}));return{...o,inputShape:n,valueShapes:a,plannedNodes:p}}var Ue=class{_stats=new Map;track(e,t){let r=this._stats.get(e);return r||(r={created:0,destroyed:0,live:0,peakLive:0,resources:new Set},this._stats.set(e,r)),r.resources.has(t)||(r.resources.add(t),r.created++,r.live++,r.peakLive=Math.max(r.peakLive,r.live)),t}release(e,t,r){if(!t)return!1;let o=this._stats.get(e);if(!o?.resources.delete(t))return!1;try{r()}finally{o.destroyed++,o.live--}return!0}snapshot(e=0){let t=0,r=0,o=0,n=0,a={};for(let[u,s]of this._stats){let l={created:s.created,destroyed:s.destroyed,live:s.live,peakLive:s.peakLive};a[u]=l,t+=l.live,r+=l.created,o+=l.destroyed,n+=l.peakLive}return{live:t,created:r,destroyed:o,peakLive:n,pending:e,byKind:a}}};var so=new WeakMap;function mn(i){let e=so.get(i);return e||(e={ready:new Map,pending:new Map},so.set(i,e)),e}var R=8,po=8,N=8,j=N+2;function re(i){let[e,t]=i.workgroupSize;return{workgroupX:e,workgroupY:t,rowsPerThread:i.rowsPerThread,tileM:t*i.rowsPerThread,tileNBlocks:e,tileKBlocks:po}}function xe(i){let e=re(i),t=i.sharedLayout==="padded"||i.sharedLayout==="padded-input",r=i.sharedLayout==="padded"||i.sharedLayout==="padded-weights";return{input:e.tileM*e.tileKBlocks+(t?e.workgroupY:0),weights:e.tileKBlocks*e.tileNBlocks*(r?5:4)}}function Pt(i,e){return e.sharedLayout==="padded"||e.sharedLayout==="padded-input"?`(${i}) + (${i}) / ${e.rowsPerThread*po}u`:i}function fo(i,e){return e.sharedLayout==="padded"||e.sharedLayout==="padded-weights"?`(${i}) + (${i}) / 4u`:i}function gr(i,e){return Math.ceil(i/e)*e}function A(i){return Math.ceil(i/4)}function _n(i,e){return i.width*i.height*A(i.channels)*4*e}var je;function ho(i){let e=i&32768?-1:1,t=i>>>10&31,r=i&1023;return t===0?e*r*2**-24:t===31?r===0?e*(1/0):NaN:e*(1+r/1024)*2**(t-15)}function yn(){if(!je){je=new Float32Array(65536);for(let i=0;i<je.length;i++)je[i]=ho(i)}return je}function uo(i){if(i.desc.dataType==="Float32")return new Float32Array(i.data.buffer,i.data.byteOffset,i.data.byteLength/4);let e=new Uint16Array(i.data.buffer,i.data.byteOffset,i.data.byteLength/2),t=new Float32Array(e.length);if(e.length<4096)for(let r=0;r<e.length;r++)t[r]=ho(e[r]);else{let r=yn();for(let o=0;o<e.length;o++)t[o]=r[e[o]]}return t}function hr(i,e,t,r){let o=gr(t.byteLength,4),n=i.createBuffer({label:e,size:o,usage:r,mappedAtCreation:!0});return new Uint8Array(n.getMappedRange()).set(new Uint8Array(t.buffer,t.byteOffset,t.byteLength)),n.unmap(),n}function co(i,e,t){let r=new Uint32Array(gr(t.length,4));return r.set(t),hr(i,e,r,GPUBufferUsage.UNIFORM)}function xn(i,e,t,r,o){let n=A(t.inputChannels),a=A(t.outputChannels),u=a*t.kernelHeight*t.kernelWidth*n*4*4,s=r==="fp16"&&t.weight.desc.dataType==="Float16",l=s?new Uint16Array(u):r==="fp16"?new H(u):new Float32Array(u),p=s?new Uint16Array(t.weight.data.buffer,t.weight.data.byteOffset,t.weight.data.byteLength/2):uo(t.weight);for(let f=0;f<a;f++)for(let h=0;h<t.kernelHeight;h++)for(let g=0;g<t.kernelWidth;g++)for(let _=0;_<n;_++)for(let x=0;x<4;x++){let m=f*4+x;for(let y=0;y<4;y++){let S=_*4+y,T=(o==="k-major"?(((h*t.kernelWidth+g)*n+_)*a+f)*16:(((f*t.kernelHeight+h)*t.kernelWidth+g)*n+_)*16)+y*4+x;if(m<t.outputChannels&&S<t.inputChannels){let $=((m*t.inputChannels+S)*t.kernelHeight+h)*t.kernelWidth+g;l[T]=p[$]}}}let c=new Float32Array(a*4);c.set(uo(t.bias));let d=hr(i,`oidn/${e}/weights/${r}/${o}`,l,GPUBufferUsage.STORAGE);try{return{weights:d,weightLayout:o,bias:hr(i,`oidn/${e}/bias`,c,GPUBufferUsage.STORAGE)}}catch(f){throw d.destroy(),f}}function U(i){return i==="fp16"?"vec4<f16>":"vec4<f32>"}function ie(i){return i==="fp16"?`enable f16;
`:""}function oe(i,e){return e==="fp16"?`vec4<f16>(${i})`:i}function de(i,e){return e==="relu"?`max(${i}, vec4<f32>(0.0))`:i}function Je(i,e,t){return t==="fp32"?`
let inputValue = vec4<f32>(${i});
let weightBase = ${e};
acc = fma(vec4<f32>(weights[weightBase]), vec4<f32>(inputValue.x), acc);
acc = fma(vec4<f32>(weights[weightBase + 1u]), vec4<f32>(inputValue.y), acc);
acc = fma(vec4<f32>(weights[weightBase + 2u]), vec4<f32>(inputValue.z), acc);
acc = fma(vec4<f32>(weights[weightBase + 3u]), vec4<f32>(inputValue.w), acc);
`:`
let inputValue = vec4<f16>(${i});
let weightBase = ${e};
var partial = vec4<f16>(0.0h);
partial = fma(weights[weightBase], vec4<f16>(inputValue.x), partial);
partial = fma(weights[weightBase + 1u], vec4<f16>(inputValue.y), partial);
partial = fma(weights[weightBase + 2u], vec4<f16>(inputValue.z), partial);
partial = fma(weights[weightBase + 3u], vec4<f16>(inputValue.w), partial);
acc += vec4<f32>(partial);
`}function wn(i,e,t){let r=t==="fp16"?"vec4<f16>":"vec4<f32>",o=t==="fp16"?`var partial = vec4<f16>(0.0h);
partial = fma(subgroupBroadcast(weights[weightBase], 0u), ${r}(inputValue.x), partial);
partial = fma(subgroupBroadcast(weights[weightBase + 1u], 0u), ${r}(inputValue.y), partial);
partial = fma(subgroupBroadcast(weights[weightBase + 2u], 0u), ${r}(inputValue.z), partial);
partial = fma(subgroupBroadcast(weights[weightBase + 3u], 0u), ${r}(inputValue.w), partial);
acc += vec4<f32>(partial);`:`acc = fma(subgroupBroadcast(weights[weightBase], 0u), vec4<f32>(inputValue.x), acc);
acc = fma(subgroupBroadcast(weights[weightBase + 1u], 0u), vec4<f32>(inputValue.y), acc);
acc = fma(subgroupBroadcast(weights[weightBase + 2u], 0u), vec4<f32>(inputValue.z), acc);
acc = fma(subgroupBroadcast(weights[weightBase + 3u], 0u), vec4<f32>(inputValue.w), acc);`;return`
let inputValue = ${r}(${i});
let weightBase = ${e};
${o}
`}function kt(i,e,t){return i==="fp16"&&(e.loadMode==="packed-all"||t&&e.loadMode==="packed-weights")}function qe(i,e){return e?`bitcast<vec4<f16>>(${i})`:i}function go(i,e){let{rowsPerThread:t,tileNBlocks:r,tileKBlocks:o}=re(e),n=Pt(`tileSpatial * ${o}u + tileK`,e),a=`(tileK * ${r}u + localId.x) * ${e.sharedLayout==="padded"||e.sharedLayout==="padded-weights"?5:4}u`;if(e.accumulationOrder==="row-major"){let u=U(i),s=i==="fp16"?"partial":"acc[row]";return`
    for (var row = 0u; row < ${t}u; row++) {
      ${i==="fp16"?"var partial = vec4<f16>(0.0h);":""}
      let tileSpatial = localId.y * ${t}u + row;
      for (var tileK = 0u; tileK < ${o}u; tileK++) {
        let weightBase = ${a};
        let inputValue = inputTile[${n}];
        ${s} = fma(weightTile[weightBase], ${u}(inputValue.x), ${s});
        ${s} = fma(weightTile[weightBase + 1u], ${u}(inputValue.y), ${s});
        ${s} = fma(weightTile[weightBase + 2u], ${u}(inputValue.z), ${s});
        ${s} = fma(weightTile[weightBase + 3u], ${u}(inputValue.w), ${s});
      }
      ${i==="fp16"?"acc[row] += vec4<f32>(partial);":""}
    }
`}return i==="fp16"?`
    var partial: array<vec4<f16>, ${t}>;
    for (var row = 0u; row < ${t}u; row++) {
      partial[row] = vec4<f16>(0.0h);
    }
    for (var tileK = 0u; tileK < ${o}u; tileK++) {
      let weightBase =
        ${a};
      for (var row = 0u; row < ${t}u; row++) {
        let tileSpatial =
          localId.y * ${t}u + row;
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
    for (var row = 0u; row < ${t}u; row++) {
      acc[row] += vec4<f32>(partial[row]);
    }
`:`
    for (var tileK = 0u; tileK < ${o}u; tileK++) {
      let weightBase =
        ${a};
      for (var row = 0u; row < ${t}u; row++) {
        let tileSpatial =
          localId.y * ${t}u + row;
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
`}function vn(i,e,t,r,o){let n=U(i),a=U(i),u=U(e),s=oe(de("acc",t),e);return`${ie(i)}
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
@group(0) @binding(3) var<storage, read_write> outputData: array<${u}>;
@group(0) @binding(4) var<uniform> params: Params;

@compute @workgroup_size(${R}, ${R}, 1)
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
        ${Je("inputData[pixelBase + inputBlock]",`((((gid.z * 3u + ky) * 3u + kx) * ${r}u + inputBlock) * 4u)`,i)}
      }
    }
  }
  let outputIndex = (gid.y * params.outputWidth + gid.x) * ${o}u + gid.z;
  outputData[outputIndex] = ${s};
}
`}function bn(i,e,t,r,o){let n=U(i),a=U(i),u=U(e),s=oe(de("acc",t),e);return`${ie(i)}
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
@group(0) @binding(3) var<storage, read_write> outputData: array<${u}>;
@group(0) @binding(4) var<uniform> params: Params;

@compute @workgroup_size(${R}, ${R}, 1)
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
        ${wn(`select(${n}(0.0), inputData[pixelBase + inputBlock], inputInBounds)`,`((((gid.z * 3u + ky) * 3u + kx) * ${r}u + inputBlock) * 4u)`,i)}
      }
    }
  }
  if (outputInBounds) {
    let outputIndex =
      (gid.y * params.outputWidth + gid.x) * ${o}u + gid.z;
    outputData[outputIndex] = ${s};
  }
}
`}function $n(i,e,t,r,o){let n=U(i),a=U(e),u=oe(de("acc",t),e),s=j*j*r,l=N*N;return`${ie(i)}
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

var<workgroup> inputPatch: array<${n}, ${s}>;

@compute @workgroup_size(${N}, ${N}, 1)
fn main(
  @builtin(local_invocation_id) localId: vec3<u32>,
  @builtin(workgroup_id) workgroupId: vec3<u32>
) {
  let localLinear =
    localId.y * ${N}u + localId.x;
  for (
    var loadIndex = localLinear;
    loadIndex < ${s}u;
    loadIndex += ${l}u
  ) {
    let patchPixel = loadIndex / ${r}u;
    let inputBlock = loadIndex % ${r}u;
    let patchX = patchPixel % ${j}u;
    let patchY = patchPixel / ${j}u;
    let inputX =
      i32(workgroupId.x * ${N}u + patchX) - 1;
    let inputY =
      i32(workgroupId.y * ${N}u + patchY) - 1;
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
    workgroupId.x * ${N}u + localId.x;
  let outputY =
    workgroupId.y * ${N}u + localId.y;
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
        ((localId.y + ky) * ${j}u + localId.x + kx) *
        ${r}u;
      for (var inputBlock = 0u; inputBlock < ${r}u; inputBlock++) {
        ${Je("inputPatch[patchBase + inputBlock]",`((((outputBlock * 3u + ky) * 3u + kx) * ${r}u + inputBlock) * 4u)`,i)}
      }
    }
  }
  let outputIndex =
    (outputY * params.outputWidth + outputX) * ${o}u + outputBlock;
  outputData[outputIndex] = ${u};
}
`}function mo(i,e,t,r){let{workgroupX:o,workgroupY:n,tileM:a,tileKBlocks:u}=re(t),s=e?"params.outputWidth":"params.inputWidth",l=e?"params.outputHeight":"params.inputHeight",p=t.addressMode==="base-offset",c=r?r.blocks.map((f,h)=>`cachedBase${h}[load] = (${h===r.upsampled?"y / 2u":"y"} * params.source${h}Width + ${h===r.upsampled?"x / 2u":"x"}) * ${f}u;`).join(`
    `):`cachedBase0[load] = (y * params.inputWidth + x) * ${i}u;`,d=a*u/(o*n);return`
  ${p?`var cachedBase0: array<u32, ${d}>;
  ${r?`var cachedBase1: array<u32, ${d}>;`:""}`:`var cachedX: array<u32, ${d}>;
  var cachedY: array<u32, ${d}>;`}
  var cachedMask: array<u32, ${d}>;
  for (var load = 0u; load < ${d}u; load++) {
    let loadIndex = localLinear + load * ${o*n}u;
    let spatial = workgroupId.x * ${a}u + loadIndex / ${u}u;
    let x = spatial % params.outputWidth;
    let y = spatial / params.outputWidth;
    ${p?c:`cachedX[load] = x;
    cachedY[load] = y;`}
    let columns =
      select(0u, 0x049u, x > 0u && x - 1u < ${s}) |
      select(0u, 0x092u, x < ${s}) |
      select(0u, 0x124u, x + 1u < ${s});
    let rows =
      select(0u, 0x007u, y > 0u && y - 1u < ${l}) |
      select(0u, 0x038u, y < ${l}) |
      select(0u, 0x1c0u, y + 1u < ${l});
    cachedMask[load] = select(0u, columns & rows, spatial < spatialCount)${p&&r?" | ((x & 1u) << 9u) | ((y & 1u) << 10u)":""};
  }
  var channelBlock = (localLinear % ${u}u) % ${i}u;
  var filterPosition = (localLinear % ${u}u) / ${i}u;
`}function _o(i,e){let{tileKBlocks:t}=re(e);return`
    channelBlock += ${t%i}u;
    let carry = channelBlock >= ${i}u;
    channelBlock -= select(0u, ${i}u, carry);
    filterPosition += ${Math.floor(t/i)}u + select(0u, 1u, carry);
`}function Tt(i,e,t){let{workgroupX:r,workgroupY:o,tileM:n,tileKBlocks:a}=re(t);return`
    let inputBlock = channelBlock;
    let kernelY = filterPosition / 3u;
    let kernelX = filterPosition % 3u;
    for (var load = 0u; load < ${n*a/(r*o)}u; load++) {
      let loadIndex = localLinear + load * ${r*o}u;
      var value = ${i}(0.0);
      if (filterPosition < 9u && (cachedMask[load] & (1u << filterPosition)) != 0u) {
        ${t.addressMode==="base-offset"?"":`let inputX = i32(cachedX[load]) + i32(kernelX) - 1;
        let inputY = i32(cachedY[load]) + i32(kernelY) - 1;`}
        ${e}
      }
      inputTile[${Pt("loadIndex",t)}] = value;
    }
`}function In(i,e,t,r,o,n){let{workgroupX:a,workgroupY:u,rowsPerThread:s,tileM:l,tileNBlocks:p,tileKBlocks:c}=re(n),{addressMode:d,weightLayout:f}=n,h=U(i),g=U(e),_=kt(i,n,!1),x=kt(i,n,!0),m=_?"vec2<u32>":h,y=x?"vec2<u32>":h,S=oe(de("acc",t),e),w=a*u,T=l*c,$=c*p*4;return`${ie(i)}
struct Params {
  inputWidth: u32,
  inputHeight: u32,
  outputWidth: u32,
  outputHeight: u32,
  inputBlocks: u32,
  outputBlocks: u32,
}
@group(0) @binding(0) var<storage, read> inputData: array<${m}>;
@group(0) @binding(1) var<storage, read> weights: array<${y}>;
@group(0) @binding(2) var<storage, read> bias: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> outputData: array<${g}>;
@group(0) @binding(4) var<uniform> params: Params;

var<workgroup> inputTile: array<${h}, ${xe(n).input}>;
var<workgroup> weightTile: array<${h}, ${xe(n).weights}>;

@compute @workgroup_size(${a}, ${u}, 1)
fn main(
  @builtin(local_invocation_id) localId: vec3<u32>,
  @builtin(workgroup_id) workgroupId: vec3<u32>
) {
  let spatialBase =
    workgroupId.x * ${l}u +
    localId.y * ${s}u;
  let outputBlock =
    workgroupId.y * ${p}u + localId.x;
  let spatialCount = params.outputWidth * params.outputHeight;
  var acc: array<vec4<f32>, ${s}>;
  if (outputBlock < ${o}u) {
    for (var row = 0u; row < ${s}u; row++) {
      acc[row] = bias[outputBlock];
    }
  }

  let localLinear =
    localId.y * ${a}u + localId.x;
  ${d!=="analytic"?mo(r,!1,n):""}
  let totalK = ${r*9}u;
  for (var kBase = 0u; kBase < totalK; kBase += ${c}u) {
    ${d!=="analytic"?Tt(h,`
        ${d==="base-offset"?`let offset = (i32(kernelY) - 1) * i32(params.inputWidth) + i32(kernelX) - 1;
        let inputIndex = cachedBase0[load] + u32(offset * ${r}) + inputBlock;`:`let inputIndex = (u32(inputY) * params.inputWidth + u32(inputX)) *
          ${r}u + inputBlock;`}
        value = ${qe("inputData[inputIndex]",_)};
    `,n):`
    for (
      var loadIndex = localLinear;
      loadIndex < ${T}u;
      loadIndex += ${w}u
    ) {
      let tileSpatial = loadIndex / ${c}u;
      let tileK = loadIndex % ${c}u;
      let inputSpatialIndex =
        workgroupId.x * ${l}u + tileSpatial;
      let kIndex = kBase + tileK;
      var value = ${h}(0.0);
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
          value = ${qe("inputData[inputIndex]",_)};
        }
      }
      inputTile[${Pt("loadIndex",n)}] = value;
    }
    `}

    for (
      var loadIndex = localLinear;
      loadIndex < ${$}u;
      loadIndex += ${w}u
    ) {
      let tileK = loadIndex / ${p*4}u;
      let outputRemainder = loadIndex % ${p*4}u;
      let tileOutputBlock = outputRemainder / 4u;
      let outputLane = outputRemainder % 4u;
      let loadedOutputBlock =
        workgroupId.y * ${p}u + tileOutputBlock;
      let kIndex = kBase + tileK;
      var value = ${h}(0.0);
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
        value = ${qe("weights[weightIndex]",x)};
      }
      weightTile[${fo("loadIndex",n)}] = value;
    }

    workgroupBarrier();
    ${go(i,n)}
    workgroupBarrier();
    ${d!=="analytic"?_o(r,n):""}
  }

  if (outputBlock < ${o}u) {
    for (var row = 0u; row < ${s}u; row++) {
      let spatialIndex = spatialBase + row;
      if (spatialIndex < spatialCount) {
        let outputIndex = spatialIndex * ${o}u + outputBlock;
        outputData[outputIndex] = ${S.replaceAll("acc","acc[row]")};
      }
    }
  }
}
`}function Tn(i,e,t,r){let o=U(i),n=de("acc",e);return`${ie(i)}
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

@compute @workgroup_size(${R}, ${R}, 1)
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
          let pixelBase = (u32(inputY) * params.inputWidth + u32(inputX)) * ${t}u;
          for (var inputBlock = 0u; inputBlock < ${t}u; inputBlock++) {
            ${Je("inputData[pixelBase + inputBlock]",`((((gid.z * 3u + ky) * 3u + kx) * ${t}u + inputBlock) * 4u)`,i)}
          }
        }
      }
      pooled = max(pooled, ${n});
    }
  }
  let outputIndex = (gid.y * params.outputWidth + gid.x) * ${r}u + gid.z;
  outputData[outputIndex] = ${oe("pooled",i)};
}
`}function kn(i,e,t){let r=U(i);return`${ie(i)}
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

@compute @workgroup_size(${R}, ${R}, 1)
fn main(
  @builtin(global_invocation_id) gid: vec3<u32>${t?`,
  @builtin(num_workgroups) groupCount: vec3<u32>`:""}
) {
  ${t?`let linearX = gid.x + gid.z * groupCount.x * ${R}u;
  let outputBlock = linearX % ${e}u;
  let outputX = linearX / ${e}u;`:`let outputBlock = gid.z;
  let outputX = gid.x;`}
  if (
    outputX >= params.outputWidth ||
    gid.y >= params.outputHeight ||
    outputBlock >= ${e}u
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
        (inputY * params.inputWidth + inputX) * ${e}u + outputBlock;
      pooled = max(pooled, vec4<f32>(inputData[inputIndex]));
    }
  }
  let outputIndex =
    (gid.y * params.outputWidth + outputX) * ${e}u + outputBlock;
  outputData[outputIndex] = ${oe("pooled",i)};
}
`}function Pn(i,e,t,r,o,n,a){let{workgroupX:u,workgroupY:s,rowsPerThread:l,tileM:p,tileNBlocks:c,tileKBlocks:d}=re(a),{addressMode:f,weightLayout:h}=a,g=U(i),_=U(e),x=kt(i,a,!1),m=kt(i,a,!0),y=x?"vec2<u32>":g,S=m?"vec2<u32>":g,w=r[0]+r[1],T=oe(de("acc[row]",t),e),$=u*s,C=p*d,M=d*c*4,z=(O,be)=>`
          {
            let sourceBlock = ${be};
            ${f==="base-offset"?`let dx = ${O===o?"(i32((cachedMask[load] >> 9u) & 1u) + i32(kernelX) - 1) >> 1u":"i32(kernelX) - 1"};
            let dy = ${O===o?"(i32((cachedMask[load] >> 10u) & 1u) + i32(kernelY) - 1) >> 1u":"i32(kernelY) - 1"};
            let offset = (dy * i32(params.source${O}Width) + dx) * ${r[O]};
            let sourceIndex = cachedBase${O}[load] + u32(offset) + sourceBlock;`:`let sourceX = ${O===o?"u32(inputX) / 2u":"u32(inputX)"};
            let sourceY = ${O===o?"u32(inputY) / 2u":"u32(inputY)"};
            let sourceIndex =
              (sourceY * params.source${O}Width + sourceX) *
              ${r[O]}u + sourceBlock;`}
            value = ${qe(`input${O}[sourceIndex]`,x)};
          }`;return`${ie(i)}
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
@group(0) @binding(0) var<storage, read> input0: array<${y}>;
@group(0) @binding(1) var<storage, read> input1: array<${y}>;
@group(0) @binding(2) var<storage, read> weights: array<${S}>;
@group(0) @binding(3) var<storage, read> bias: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> outputData: array<${_}>;
@group(0) @binding(5) var<uniform> params: Params;

var<workgroup> inputTile: array<${g}, ${xe(a).input}>;
var<workgroup> weightTile: array<${g}, ${xe(a).weights}>;

@compute @workgroup_size(${u}, ${s}, 1)
fn main(
  @builtin(local_invocation_id) localId: vec3<u32>,
  @builtin(workgroup_id) workgroupId: vec3<u32>
) {
  let spatialBase =
    workgroupId.x * ${p}u +
    localId.y * ${l}u;
  let outputBlock =
    workgroupId.y * ${c}u + localId.x;
  let spatialCount = params.outputWidth * params.outputHeight;
  var acc: array<vec4<f32>, ${l}>;
  if (outputBlock < ${n}u) {
    for (var row = 0u; row < ${l}u; row++) {
      acc[row] = bias[outputBlock];
    }
  }

  let localLinear =
    localId.y * ${u}u + localId.x;
  ${f!=="analytic"?mo(w,!0,a,{blocks:r,upsampled:o}):""}
  let totalK = ${w*9}u;
  for (var kBase = 0u; kBase < totalK; kBase += ${d}u) {
    ${f!=="analytic"?a.decoderLoad==="source-first"?`
    if (channelBlock < ${r[0]}u) {
      ${Tt(g,z(0,"inputBlock"),a)}
    } else {
      ${Tt(g,z(1,`inputBlock - ${r[0]}u`),a)}
    }
    `:Tt(g,`
        if (inputBlock < ${r[0]}u) {
          ${z(0,"inputBlock")}
        } else {
          ${z(1,`inputBlock - ${r[0]}u`)}
        }
    `,a):`
    for (
      var loadIndex = localLinear;
      loadIndex < ${C}u;
      loadIndex += ${$}u
    ) {
      let tileSpatial = loadIndex / ${d}u;
      let tileK = loadIndex % ${d}u;
      let outputSpatialIndex =
        workgroupId.x * ${p}u + tileSpatial;
      let kIndex = kBase + tileK;
      var value = ${g}(0.0);
      if (outputSpatialIndex < spatialCount && kIndex < totalK) {
        let outputY = outputSpatialIndex / params.outputWidth;
        let outputX = outputSpatialIndex % params.outputWidth;
        let inputBlock = kIndex % ${w}u;
        let kernelIndex = kIndex / ${w}u;
        let kernelY = kernelIndex / 3u;
        let kernelX = kernelIndex % 3u;
        let inputY = i32(outputY) + i32(kernelY) - 1;
        let inputX = i32(outputX) + i32(kernelX) - 1;
        if (
          inputY >= 0 && inputY < i32(params.outputHeight) &&
          inputX >= 0 && inputX < i32(params.outputWidth)
        ) {
          if (inputBlock < ${r[0]}u) {
            ${z(0,"inputBlock")}
          } else {
            ${z(1,`inputBlock - ${r[0]}u`)}
          }
        }
      }
      inputTile[${Pt("loadIndex",a)}] = value;
    }
    `}

    for (
      var loadIndex = localLinear;
      loadIndex < ${M}u;
      loadIndex += ${$}u
    ) {
      let tileK = loadIndex / ${c*4}u;
      let outputRemainder = loadIndex % ${c*4}u;
      let tileOutputBlock = outputRemainder / 4u;
      let outputLane = outputRemainder % 4u;
      let loadedOutputBlock =
        workgroupId.y * ${c}u + tileOutputBlock;
      let kIndex = kBase + tileK;
      var value = ${g}(0.0);
      if (loadedOutputBlock < ${n}u && kIndex < totalK) {
        ${h==="k-major"?`
        let weightIndex = (kIndex * ${n}u + loadedOutputBlock) * 4u + outputLane;
        `:f!=="analytic"?`
        let weightIndex = (loadedOutputBlock * ${w*9}u + kIndex) * 4u + outputLane;
        `:`
        let inputBlock = kIndex % ${w}u;
        let kernelIndex = kIndex / ${w}u;
        let kernelY = kernelIndex / 3u;
        let kernelX = kernelIndex % 3u;
        let weightIndex =
          ((((loadedOutputBlock * 3u + kernelY) * 3u + kernelX) *
            ${w}u + inputBlock) * 4u + outputLane);
        `}
        value = ${qe("weights[weightIndex]",m)};
      }
      weightTile[${fo("loadIndex",a)}] = value;
    }

    workgroupBarrier();
    ${go(i,a)}
    workgroupBarrier();
    ${f!=="analytic"?_o(w,a):""}
  }

  if (outputBlock < ${n}u) {
    for (var row = 0u; row < ${l}u; row++) {
      let spatialIndex = spatialBase + row;
      if (spatialIndex < spatialCount) {
        let outputIndex = spatialIndex * ${n}u + outputBlock;
        outputData[outputIndex] = ${T};
      }
    }
  }
}
`}function Sn(i,e,t,r,o,n){let a=U(i),u=U(e),s=r[0]+r[1],l=(c,d)=>{let f=c===o;return`
      {
        let sourceX = ${f?"u32(inputX) / 2u":"u32(inputX)"};
        let sourceY = ${f?"u32(inputY) / 2u":"u32(inputY)"};
        let sourcePixelBase = (sourceY * params.source${c}Width + sourceX) * ${r[c]}u;
        for (var sourceBlock = 0u; sourceBlock < ${r[c]}u; sourceBlock++) {
          let inputBlock = ${d}u + sourceBlock;
          ${Je(`input${c}[sourcePixelBase + sourceBlock]`,`((((gid.z * 3u + ky) * 3u + kx) * ${s}u + inputBlock) * 4u)`,i)}
        }
      }
`},p=oe(de("acc",t),e);return`${ie(i)}
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
@group(0) @binding(4) var<storage, read_write> outputData: array<${u}>;
@group(0) @binding(5) var<uniform> params: Params;

@compute @workgroup_size(${R}, ${R}, 1)
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
      ${l(0,0)}
      ${l(1,r[0])}
    }
  }
  let outputIndex = (gid.y * params.outputWidth + gid.x) * ${n}u + gid.z;
  outputData[outputIndex] = ${p};
}
`}function Bn(i,e,t,r,o,n){let a=U(i),u=U(e),s=r[0]+r[1],l=j*j*s,p=N*N,c=oe(de("acc",t),e),d=(f,h)=>`
      let sourceBlock = ${h};
      let sourceIndex =
        (${f===o?"u32(inputY) / 2u":"u32(inputY)"} * params.source${f}Width + ${f===o?"u32(inputX) / 2u":"u32(inputX)"}) *
        ${r[f]}u + sourceBlock;
      value = input${f}[sourceIndex];`;return`${ie(i)}
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
@group(0) @binding(4) var<storage, read_write> outputData: array<${u}>;
@group(0) @binding(5) var<uniform> params: Params;

var<workgroup> inputPatch: array<${a}, ${l}>;

@compute @workgroup_size(${N}, ${N}, 1)
fn main(
  @builtin(local_invocation_id) localId: vec3<u32>,
  @builtin(workgroup_id) workgroupId: vec3<u32>
) {
  let localLinear =
    localId.y * ${N}u + localId.x;
  for (
    var loadIndex = localLinear;
    loadIndex < ${l}u;
    loadIndex += ${p}u
  ) {
    let patchPixel = loadIndex / ${s}u;
    let inputBlock = loadIndex % ${s}u;
    let patchX = patchPixel % ${j}u;
    let patchY = patchPixel / ${j}u;
    let inputX =
      i32(workgroupId.x * ${N}u + patchX) - 1;
    let inputY =
      i32(workgroupId.y * ${N}u + patchY) - 1;
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
    workgroupId.x * ${N}u + localId.x;
  let outputY =
    workgroupId.y * ${N}u + localId.y;
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
        ((localId.y + ky) * ${j}u + localId.x + kx) *
        ${s}u;
      for (var inputBlock = 0u; inputBlock < ${s}u; inputBlock++) {
        ${Je("inputPatch[patchBase + inputBlock]",`((((outputBlock * 3u + ky) * 3u + kx) * ${s}u + inputBlock) * 4u)`,i)}
      }
    }
  }
  let outputIndex =
    (outputY * params.outputWidth + outputX) * ${n}u + outputBlock;
  outputData[outputIndex] = ${c};
}
`}function lo(i,e){let t=U(i),r=Array.from({length:e},(u,s)=>`@group(0) @binding(${s}) var<storage, read> input${s}: array<vec4<f32>>;`).join(`
`),o=Array.from({length:e},(u,s)=>{let l=s*3;return`if (channel < ${l+3}u) { return input${s}[pixel][channel - ${l}u]; }`}).join(`
  `),n=e,a=e+1;return`${ie(i)}
struct Params {
  width: u32,
  height: u32,
  outputBlocks: u32,
  inputChannels: u32,
}
${r}
@group(0) @binding(${n}) var<storage, read_write> outputData: array<${t}>;
@group(0) @binding(${a}) var<uniform> params: Params;

fn readChannel(pixel: u32, channel: u32) -> f32 {
  ${o}
  return 0.0;
}

@compute @workgroup_size(${R}, ${R}, 1)
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
  outputData[pixel * params.outputBlocks + gid.z] = ${oe("value",i)};
}
`}function En(i){return i.op==="concat"?i.inputs:i.op==="fusedUpsampleConcatConv2d"?i.inputs.map(e=>e.value):[i.input]}function yo(i,e="auto"){let t=i.features.has("shader-f16");if(e==="fp16"&&!t)throw new Error("OIDN FP16 was requested but the GPUDevice does not have shader-f16 enabled");return e==="auto"?t?"fp16":"fp32":e}var Ze=class{_device;precision;kernelSetting;gemm;maxSpatialInputBlocks;subgroupsAvailable;_model;_gemmByOutputBlocks=new Map;_packedConvs=new Map;_pipelineCache;_pipelinePromises;_executionCache=new Map;_retiredExecutions=new Set;_clock=0;_shapeCacheSize;_profileNextExecution=!1;_lastExecutionProfile;_profileOperations=0;_resources=new Ue;_disposed=!1;constructor(e,t,r={}){this._device=e;let o=mn(e);this._pipelineCache=o.ready,this._pipelinePromises=o.pending,this.precision=yo(e,r.precision??"auto"),this.kernelSetting=r.kernel??"auto";let n=r.gemm?.workgroupSize??[8,8];if(this.gemm=Object.freeze({tilePolicy:r.gemm?.tilePolicy??(r.gemm?.workgroupSize?"fixed":"output-aligned"),decoderLoad:r.gemm?.decoderLoad??"per-load",poolLayout:r.gemm?.poolLayout??"channels",sharedLayout:r.gemm?.sharedLayout??(this.precision==="fp16"?"padded-input":"padded"),accumulationOrder:r.gemm?.accumulationOrder??"k-major",finalLayer:r.gemm?.finalLayer??"shared-auto",loadMode:r.gemm?.loadMode??"native",addressMode:r.gemm?.addressMode??"incremental",weightLayout:r.gemm?.weightLayout??"k-major",rowsPerThread:r.gemm?.rowsPerThread??8,workgroupSize:Object.freeze([n[0],n[1]])}),!["fixed","output-aligned"].includes(this.gemm.tilePolicy))throw new Error(`Unsupported GEMM tile policy: ${this.gemm.tilePolicy}`);if(!["per-load","source-first"].includes(this.gemm.decoderLoad))throw new Error(`Unsupported GEMM decoder load: ${this.gemm.decoderLoad}`);if(!["spatial","channels"].includes(this.gemm.poolLayout))throw new Error(`Unsupported GEMM pool layout: ${this.gemm.poolLayout}`);if(!["linear","padded","padded-input","padded-weights"].includes(this.gemm.sharedLayout))throw new Error(`Unsupported GEMM shared layout: ${this.gemm.sharedLayout}`);if(!["k-major","row-major"].includes(this.gemm.accumulationOrder))throw new Error(`Unsupported GEMM accumulation order: ${this.gemm.accumulationOrder}`);if(!["direct","shared-input","shared-input-weights","shared-auto"].includes(this.gemm.finalLayer))throw new Error(`Unsupported GEMM final layer: ${this.gemm.finalLayer}`);if(!["native","packed-weights","packed-all"].includes(this.gemm.loadMode))throw new Error(`Unsupported GEMM load mode: ${this.gemm.loadMode}`);if(!["analytic","incremental","base-offset"].includes(this.gemm.addressMode))throw new Error(`Unsupported GEMM address mode: ${this.gemm.addressMode}`);if(!["output-major","k-major"].includes(this.gemm.weightLayout))throw new Error(`Unsupported GEMM weight layout: ${this.gemm.weightLayout}`);let a=re(this.gemm),u=(xe(this.gemm).input+xe(this.gemm).weights)*4*(this.precision==="fp16"?2:4);if(![2,4,8].includes(a.rowsPerThread)||![4,8,16].includes(a.workgroupX)||![4,8].includes(a.workgroupY)||n.length!==2||a.workgroupX>e.limits.maxComputeWorkgroupSizeX||a.workgroupY>e.limits.maxComputeWorkgroupSizeY||a.workgroupX*a.workgroupY>e.limits.maxComputeInvocationsPerWorkgroup||u>e.limits.maxComputeWorkgroupStorageSize)throw new Error("Unsupported GEMM tile configuration for this GPUDevice");if(this.subgroupsAvailable=e.features.has("subgroups"),this.maxSpatialInputBlocks=this.precision==="fp16"&&e.limits.maxComputeInvocationsPerWorkgroup>=N*N&&e.limits.maxComputeWorkgroupSizeX>=N&&e.limits.maxComputeWorkgroupSizeY>=N?Math.floor(e.limits.maxComputeWorkgroupStorageSize/(j*j*4*2)):0,this._shapeCacheSize=Math.max(1,r.shapeCacheSize??2),t.inputChannels%3!==0||t.inputChannels<3||t.inputChannels>9)throw new Error(`Native OIDN expects 3, 6, or 9 input channels, got ${t.inputChannels}`);this._model={spec:t.spec,inputChannels:t.inputChannels,outputChannels:t.outputChannels,channelsByValue:new Map(t.channelsByValue),convChannels:new Map(t.convChannels)};for(let s of Ke(this._model,{fuseConvPool:!1}).nodes)if(s.op!=="conv2d"&&s.op!=="maxPool2d"&&s.op!=="fusedConvReluMaxPool2d"&&s.op!=="fusedUpsampleConcatConv2d")throw new Error(`Native OIDN descriptor ${t.spec.id} leaves unsupported ${s.op} node ${s.id} after graph optimization`);try{for(let[s,l]of t.convTensors){let c=this._selectConvKernel(A(l.inputChannels),s===t.spec.output)==="implicit-gemm"?this.gemm.weightLayout:"output-major",d=xn(e,s,l,this.precision,c);this._resources.track("gpu-buffer",d.weights),this._resources.track("gpu-buffer",d.bias),this._packedConvs.set(s,d)}}catch(s){for(let l of this._packedConvs.values())this._releaseBuffer(l.weights),this._releaseBuffer(l.bias);throw this._packedConvs.clear(),s}}_pipeline(e,t){let r=this._pipelineCache.get(e);return r||(r=this._device.createComputePipeline({label:`oidn/${e}`,layout:"auto",compute:{module:this._device.createShaderModule({label:`oidn/${e}`,code:t}),entryPoint:"main"}}),this._pipelineCache.set(e,r)),r}_pipelineAsync(e,t){let r=this._pipelineCache.get(e);if(r)return Promise.resolve(r);let o=this._pipelinePromises.get(e);if(o)return o;let n=this._device.createComputePipelineAsync({label:`oidn/${e}`,layout:"auto",compute:{module:this._device.createShaderModule({label:`oidn/${e}`,code:t}),entryPoint:"main"}}).then(a=>(this._pipelineCache.set(e,a),this._pipelinePromises.delete(e),a),a=>{throw this._pipelinePromises.delete(e),a});return this._pipelinePromises.set(e,n),n}_nodePipelineSpec(e,t){if(e.op==="conv2d"){let r=t?"fp32":this.precision,o=A(this._model.convChannels.get(e.id).inputChannels),n=A(this._model.convChannels.get(e.id).outputChannels),a=this._gemmForOutput(n),u=this._selectConvKernel(o,t),s=a.finalLayer==="shared-input-weights"||a.finalLayer==="shared-auto"&&pr(this.precision,o,!0)<=this._device.limits.maxComputeWorkgroupStorageSize;return t&&this._model.convChannels.get(e.id).outputChannels===3&&(this.kernelSetting==="auto"||this.kernelSetting==="implicit-gemm")&&a.finalLayer!=="direct"&&this._device.limits.maxComputeWorkgroupSizeX>=8&&this._device.limits.maxComputeWorkgroupSizeY>=8&&this._device.limits.maxComputeInvocationsPerWorkgroup>=64&&pr(this.precision,o,s)<=this._device.limits.maxComputeWorkgroupStorageSize?{key:`conv-final-rgb/${this.precision}/${e.activation}/in${o}/weights-${s?"shared":"storage"}`,kernel:"direct",code:no(this.precision,e.activation,o,s)}:{key:`conv-${u}/${this.precision}/${r}/${e.activation}/in${o}/out${n}`+(u==="implicit-gemm"?`/address-${a.addressMode}/weights-${a.weightLayout}-v1/tile-${a.workgroupSize.join("x")}-r${a.rowsPerThread}/loads-${a.loadMode}/shared-${a.sharedLayout}/acc-${a.accumulationOrder}`:""),kernel:u,code:u==="implicit-gemm"?In(this.precision,r,e.activation,o,n,a):u==="spatial"?$n(this.precision,r,e.activation,o,n):u==="subgroup"?bn(this.precision,r,e.activation,o,n):vn(this.precision,r,e.activation,o,n)}}if(e.op==="maxPool2d"){let r=A(this._model.channelsByValue.get(e.id)),o=this._coalescedPool();return{key:`max-pool/${this.precision}/out${r}/${o?"channels":"spatial"}`,kernel:"direct",code:kn(this.precision,r,o)}}if(e.op==="fusedConvReluMaxPool2d"){let r=A(this._model.convChannels.get(e.conv.id).inputChannels),o=A(this._model.convChannels.get(e.conv.id).outputChannels);return{key:`conv-pool/${this.precision}/${e.conv.activation}/in${r}/out${o}`,kernel:"direct",code:Tn(this.precision,e.conv.activation,r,o)}}if(e.op==="fusedUpsampleConcatConv2d"){if(e.inputs.length!==2)throw new Error(`Native fused decoder ${e.id} requires two inputs`);let r=e.inputs.map(d=>A(this._model.channelsByValue.get(d.value))),o=e.inputs.findIndex(d=>d.upsample);if(o!==0&&o!==1)throw new Error(`Native fused decoder ${e.id} has no upsample input`);let n=r[0]+r[1],a=t?"fp32":this.precision,u=this._selectConvKernel(n,t),s=u==="subgroup"?"direct":u,l=A(this._model.convChannels.get(e.conv.id).outputChannels),p=this._gemmForOutput(l);return{key:`decoder-${s}/${this.precision}/${a}/${e.conv.activation}/${r.join("+")}/out${l}/up${o}`+(s==="implicit-gemm"?`/address-${p.addressMode}/weights-${p.weightLayout}-v1/tile-${p.workgroupSize.join("x")}-r${p.rowsPerThread}/loads-${p.loadMode}/shared-${p.sharedLayout}/acc-${p.accumulationOrder}/decoder-${p.decoderLoad}`:""),kernel:s,code:s==="implicit-gemm"?Pn(this.precision,a,e.conv.activation,r,o,l,p):s==="spatial"?Bn(this.precision,a,e.conv.activation,r,o,l):Sn(this.precision,a,e.conv.activation,r,o,l)}}throw new Error(`Native OIDN does not implement unfused ${e.op} node ${e.id}`)}_gemmForOutput(e){if(this.gemm.tilePolicy!=="output-aligned"||this.gemm.workgroupSize[0]!==8||e<=0||e%16!==0)return this.gemm;let t=this._gemmByOutputBlocks.get(e);if(t)return t;let r=Object.freeze({...this.gemm,workgroupSize:Object.freeze([16,this.gemm.workgroupSize[1]])}),o=re(r),n=xe(r),a=this._device.limits,s=o.workgroupX<=a.maxComputeWorkgroupSizeX&&o.workgroupY<=a.maxComputeWorkgroupSizeY&&o.workgroupX*o.workgroupY<=a.maxComputeInvocationsPerWorkgroup&&(n.input+n.weights)*4*(this.precision==="fp16"?2:4)<=a.maxComputeWorkgroupStorageSize?r:this.gemm;return this._gemmByOutputBlocks.set(e,s),s}_coalescedPool(){return this.gemm.poolLayout==="channels"&&(this.kernelSetting==="auto"||this.kernelSetting==="implicit-gemm")}_selectConvKernel(e,t){let r=this.precision==="fp16"&&e<=this.maxSpatialInputBlocks;return this.kernelSetting==="direct"?"direct":this.kernelSetting==="spatial"?r?"spatial":"direct":this.kernelSetting==="implicit-gemm"?t?"direct":"implicit-gemm":this.kernelSetting==="subgroup"?this.subgroupsAvailable?"subgroup":"direct":t?"direct":"implicit-gemm"}_nodePipeline(e,t){let{key:r,code:o}=this._nodePipelineSpec(e,t);return this._pipeline(r,o)}async prepare(){if(this._disposed)throw new Error("Native OIDN executor is disposed");let e=Ke(this._model,{fuseConvPool:!1}),t=this._model.inputChannels/3,r=[{key:`pack/${this.precision}/${t}`,code:lo(this.precision,t)},...e.nodes.map(o=>this._nodePipelineSpec(o,o.id===e.spec.output))];await Promise.all(r.map(({key:o,code:n})=>this._pipelineAsync(o,n)))}_createExecution(e,t){let r=fr(this._model,e,t,{fuseConvPool:!1}),o=new Map,n=[],a=new Map;r.nodes.forEach((l,p)=>{for(let c of En(l))a.set(c,p)}),a.set(r.spec.output,r.nodes.length);let u=[],s=l=>(u.push(l),this._resources.track("gpu-buffer",l));try{let l=(m,y,S,w)=>{for(let C of n)C.activeValue&&(a.get(C.activeValue)??-1)<w&&(C.activeValue=void 0);let T=_n(y,S),$=n.filter(C=>!C.activeValue&&C.capacity>=T).sort((C,M)=>C.capacity-M.capacity)[0];$||($={buffer:s(this._device.createBuffer({label:`oidn/activation/${e}x${t}/${n.length}`,size:gr(T,4),usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST})),capacity:T},n.push($)),$.activeValue=m,o.set(m,$.buffer)};l(r.spec.input,r.inputShape,this.precision==="fp16"?2:4,-1),r.plannedNodes.forEach(({node:m,outputShape:y},S)=>{let w=m.id===r.spec.output;l(m.id,y,w||this.precision==="fp32"?4:2,S)});let p=this._model.inputChannels/3,c=`pack/${this.precision}/${p}`,d=this._pipeline(c,lo(this.precision,p)),f=[],h=[],g=[],_=[];r.plannedNodes.forEach(({node:m,outputShape:y},S)=>{let w=m.id===r.spec.output,T=this._nodePipelineSpec(m,w),$=this._pipeline(T.key,T.code);f.push($),h.push(T.kernel??"direct");let C=o.get(m.id),M,z,O;if(m.op==="conv2d"){let W=r.valueShapes.get(m.input);O=m.id,z=[W.width,W.height,y.width,y.height,A(W.channels),A(y.channels)];let V=this._packedConvs.get(O);M=[{binding:0,resource:{buffer:o.get(m.input)}},{binding:1,resource:{buffer:V.weights}},{binding:2,resource:{buffer:V.bias}},{binding:3,resource:{buffer:C}}]}else if(m.op==="maxPool2d"){let W=r.valueShapes.get(m.input);z=[W.width,W.height,y.width,y.height,A(y.channels)],M=[{binding:0,resource:{buffer:o.get(m.input)}},{binding:1,resource:{buffer:C}}]}else if(m.op==="fusedConvReluMaxPool2d"){let W=r.valueShapes.get(m.input);O=m.conv.id,z=[W.width,W.height,y.width,y.height,A(W.channels),A(y.channels)];let V=this._packedConvs.get(O);M=[{binding:0,resource:{buffer:o.get(m.input)}},{binding:1,resource:{buffer:V.weights}},{binding:2,resource:{buffer:V.bias}},{binding:3,resource:{buffer:C}}]}else if(m.op==="fusedUpsampleConcatConv2d"){O=m.conv.id;let W=r.valueShapes.get(m.inputs[0].value),V=r.valueShapes.get(m.inputs[1].value);z=[y.width,y.height,A(y.channels),A(this._model.convChannels.get(O).inputChannels),W.width,W.height,V.width,V.height];let Le=this._packedConvs.get(O);M=[{binding:0,resource:{buffer:o.get(m.inputs[0].value)}},{binding:1,resource:{buffer:o.get(m.inputs[1].value)}},{binding:2,resource:{buffer:Le.weights}},{binding:3,resource:{buffer:Le.bias}},{binding:4,resource:{buffer:C}}]}else throw new Error(`Unexpected native node ${m.op}`);let be=s(co(this._device,`oidn/${m.id}/params/${e}x${t}`,z));_.push(be),M.push({binding:M.length,resource:{buffer:be}}),g.push(this._device.createBindGroup({label:`oidn/${m.id}/bindings`,layout:$.getBindGroupLayout(0),entries:M}))});let x=s(co(this._device,`oidn/input/params/${e}x${t}`,[e,t,A(this._model.inputChannels),this._model.inputChannels]));return _.push(x),{plan:r,valueBuffers:o,slots:n,nodeBindings:g,nodePipelines:f,nodeKernels:h,inputPipeline:d,inputUniform:x,ownedBuffers:_,lastUsed:++this._clock}}catch(l){for(let p of u)this._releaseBuffer(p);throw l}}_execution(e,t){if(this._disposed)throw new Error("Native OIDN executor is disposed");let r=`${e}x${t}`,o=this._executionCache.get(r);if(!o&&(o=this._createExecution(e,t),this._executionCache.set(r,o),this._executionCache.size>this._shapeCacheSize)){let n=[...this._executionCache.entries()].filter(([a])=>a!==r).sort((a,u)=>a[1].lastUsed-u[1].lastUsed)[0];n&&(this._executionCache.delete(n[0]),this._retiredExecutions.add(n[1]),this._device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>{this._retiredExecutions.delete(n[1]),this._destroyExecution(n[1])}))}return o.lastUsed=++this._clock,o}prewarm(e){for(let t of e)this._execution(t.width,t.height)}profileNextExecution(){return this._device.features.has("timestamp-query")?(this._profileNextExecution=!0,!0):!1}getLastExecutionProfile(){return this._lastExecutionProfile}execute(e,t,r){let o=this._model.inputChannels/3;if(e.length!==o)throw new Error(`Native OIDN expected ${o} input buffers, got ${e.length}`);let n=this._execution(t,r),a=["input-pack",...n.plan.nodes.map(h=>h.id)],u=this._profileNextExecution&&this._device.features.has("timestamp-query");this._profileNextExecution=!1;let s=a.length*2,l=u?this._resources.track("gpu-query-set",this._device.createQuerySet({type:"timestamp",count:s})):void 0,p=s*8,c,d;try{c=u?this._resources.track("gpu-buffer",this._device.createBuffer({label:`oidn/profile/resolve/${t}x${r}`,size:p,usage:GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC})):void 0,d=u?this._resources.track("gpu-buffer",this._device.createBuffer({label:`oidn/profile/readback/${t}x${r}`,size:p,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ})):void 0}catch(h){throw this._releaseBuffer(d),this._releaseBuffer(c),this._releaseQuerySet(l),h}let f=(h,g)=>({label:h,...l?{timestampWrites:{querySet:l,beginningOfPassWriteIndex:g*2,endOfPassWriteIndex:g*2+1}}:{}});try{let h=this._device.createCommandEncoder({label:`oidn/native/${t}x${r}`}),g=e.map((x,m)=>({binding:m,resource:{buffer:x}}));g.push({binding:o,resource:{buffer:n.valueBuffers.get(n.plan.spec.input)}}),g.push({binding:o+1,resource:{buffer:n.inputUniform}});let _=this._device.createBindGroup({label:"oidn/input/bindings",layout:n.inputPipeline.getBindGroupLayout(0),entries:g});{let x=h.beginComputePass(f("oidn/input-pack",0));x.setPipeline(n.inputPipeline),x.setBindGroup(0,_),x.dispatchWorkgroups(Math.ceil(t/R),Math.ceil(r/R),A(this._model.inputChannels)),x.end()}n.plan.plannedNodes.forEach(({node:x,outputShape:m},y)=>{let S=h.beginComputePass(f(`oidn/${n.plan.nodes[y].id}`,y+1));if(S.setPipeline(n.nodePipelines[y]),S.setBindGroup(0,n.nodeBindings[y]),x.op==="maxPool2d"&&this._coalescedPool()){let w=Math.ceil(m.width*A(m.channels)/R),T=this._device.limits.maxComputeWorkgroupsPerDimension;S.dispatchWorkgroups(Math.min(w,T),Math.ceil(m.height/R),Math.ceil(w/T))}else if(n.nodeKernels[y]==="implicit-gemm"){let w=re(this._gemmForOutput(A(m.channels)));S.dispatchWorkgroups(Math.ceil(m.width*m.height/w.tileM),Math.ceil(A(m.channels)/w.tileNBlocks),1)}else S.dispatchWorkgroups(Math.ceil(m.width/R),Math.ceil(m.height/R),A(m.channels));S.end()}),l&&(h.resolveQuerySet(l,0,s,c,0),h.copyBufferToBuffer(c,0,d,0,p)),this._device.queue.submit([h.finish()])}catch(h){throw this._releaseBuffer(d),this._releaseBuffer(c),this._releaseQuerySet(l),h}return l&&(this._profileOperations++,this._lastExecutionProfile=(async()=>{try{await d.mapAsync(GPUMapMode.READ);let h=new BigUint64Array(d.getMappedRange()),g=a.map((_,x)=>({id:_,durationMs:Number(h[x*2+1]-h[x*2])/1e6}));return{totalMs:g.reduce((_,x)=>_+x.durationMs,0),layers:g}}finally{d.mapState==="mapped"&&d.unmap(),this._releaseQuerySet(l),this._releaseBuffer(c),this._releaseBuffer(d),this._profileOperations--}})()),n.valueBuffers.get(n.plan.spec.output)}async executeCPU(e,t,r){let o=t*r*this._model.inputChannels;if(e.length!==o)throw new Error(`Native OIDN CPU input has ${e.length} values, expected ${o}`);let n=this._execution(t,r),a=this._model.inputChannels/3,u=t*r;n.cpuInputBuffers||(n.cpuInputBuffers=Array.from({length:a},(d,f)=>{let h=this._device.createBuffer({label:`oidn/cpu-input/${t}x${r}/${f}`,size:u*16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});return this._resources.track("gpu-buffer",h),n.ownedBuffers.push(h),h}),n.cpuReadbackBuffer=this._device.createBuffer({label:`oidn/cpu-readback/${t}x${r}`,size:u*16,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),this._resources.track("gpu-buffer",n.cpuReadbackBuffer),n.ownedBuffers.push(n.cpuReadbackBuffer));for(let d=0;d<a;d++){let f=new Float32Array(u*4);for(let h=0;h<u;h++){let g=h*this._model.inputChannels+d*3,_=h*4;f[_]=e[g],f[_+1]=e[g+1],f[_+2]=e[g+2]}this._device.queue.writeBuffer(n.cpuInputBuffers[d],0,f)}let s=this.execute(n.cpuInputBuffers,t,r),l=this._device.createCommandEncoder({label:`oidn/cpu-readback/${t}x${r}`});l.copyBufferToBuffer(s,0,n.cpuReadbackBuffer,0,u*16),this._device.queue.submit([l.finish()]),await n.cpuReadbackBuffer.mapAsync(GPUMapMode.READ);let p=new Float32Array(n.cpuReadbackBuffer.getMappedRange()),c=new Float32Array(u*3);for(let d=0;d<u;d++)c[d*3]=p[d*4],c[d*3+1]=p[d*4+1],c[d*3+2]=p[d*4+2];return n.cpuReadbackBuffer.unmap(),c}_releaseBuffer(e){this._resources.release("gpu-buffer",e,()=>e.destroy())}_releaseQuerySet(e){this._resources.release("gpu-query-set",e,()=>e.destroy())}_destroyExecution(e){e.slots.forEach(t=>this._releaseBuffer(t.buffer)),e.ownedBuffers.forEach(t=>this._releaseBuffer(t))}getResourceInfo(){return this._resources.snapshot(this._retiredExecutions.size+this._profileOperations)}dispose(){if(!this._disposed){this._disposed=!0;for(let e of this._packedConvs.values())this._releaseBuffer(e.weights),this._releaseBuffer(e.bias);this._packedConvs.clear();for(let e of this._executionCache.values())this._destroyExecution(e);this._executionCache.clear();for(let e of this._retiredExecutions)this._destroyExecution(e);this._retiredExecutions.clear()}}};var xo=new WeakMap;function Cn(i,e){let t=xo.get(i);t||(t=new Map,xo.set(i,t));let r=t.get(e);if(!r){let o=i.createShaderModule({label:`oidn/webnn/input-pack/${e}`,code:Nn(e)}),n=i.createShaderModule({label:"oidn/webnn/output-unpack",code:Mn()});r={input:i.createComputePipeline({label:`oidn/webnn/input-pack/${e}`,layout:"auto",compute:{module:o,entryPoint:"main"}}),output:i.createComputePipeline({label:"oidn/webnn/output-unpack",layout:"auto",compute:{module:n,entryPoint:"main"}})},t.set(e,r)}return r}var fe=8;function vo(i,e){return Math.ceil(i/e)*e}function An(i,e,t,r){let o=i.createBuffer({label:e,size:vo(t.byteLength,4),usage:r,mappedAtCreation:!0});return new Uint8Array(o.getMappedRange()).set(new Uint8Array(t.buffer,t.byteOffset,t.byteLength)),o.unmap(),o}function wo(i,e,t){let r=new Uint32Array(vo(t.length,4));return r.set(t),An(i,e,r,GPUBufferUsage.UNIFORM)}function mr(i,e,t,r){return!!i?.[e]?.[t]?.dataTypes?.includes?.(r)}function On(i,e){if(e==="fp16"&&i.desc.dataType==="Float16")return new Uint8Array(i.data.buffer,i.data.byteOffset,i.data.byteLength);if(e==="fp32"&&i.desc.dataType==="Float32")return new Uint8Array(i.data.buffer,i.data.byteOffset,i.data.byteLength);let t=i.desc.dataType==="Float32"?new Float32Array(i.data.buffer,i.data.byteOffset,i.data.byteLength/4):new H(i.data.buffer,i.data.byteOffset,i.data.byteLength/2),r=e==="fp16"?new H(t):new Float32Array(t);return new Uint8Array(r.buffer,r.byteOffset,r.byteLength)}function Nn(i){let e=Array.from({length:i},(r,o)=>`@group(0) @binding(${o}) var<storage, read> input${o}: array<vec4<f32>>;`).join(`
`),t=Array.from({length:i},(r,o)=>{let n=o*3;return`if (channel < ${n+3}u) {
      return input${o}[pixel][channel - ${n}u];
    }`}).join(`
  `);return`enable f16;
struct Params { width: u32, height: u32, channels: u32, padding: u32 }
${e}
@group(0) @binding(${i}) var<storage, read_write> outputData: array<f16>;
@group(0) @binding(${i+1}) var<uniform> params: Params;

fn readChannel(pixel: u32, channel: u32) -> f32 {
  ${t}
  return 0.0;
}

@compute @workgroup_size(${fe}, ${fe}, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.width || gid.y >= params.height || gid.z >= params.channels) {
    return;
  }
  let pixel = gid.y * params.width + gid.x;
  let outputIndex = (gid.z * params.height + gid.y) * params.width + gid.x;
  outputData[outputIndex] = f16(readChannel(pixel, gid.z));
}
`}function Mn(){return`enable f16;
struct Params { width: u32, height: u32, padding0: u32, padding1: u32 }
@group(0) @binding(0) var<storage, read> inputData: array<f16>;
@group(0) @binding(1) var<storage, read_write> outputData: array<vec4<f32>>;
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(${fe}, ${fe}, 1)
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
`}function Un(i,e){if(e==="fp32")throw new Error("OIDN WebNN GPU interop currently requires FP16 exportable tensors");if(!i.features.has("shader-f16"))throw new Error("OIDN WebNN requires shader-f16 on the shared GPUDevice");return"fp16"}function Ln(i,e,t){return t==="relu"?i.relu(e):e}var Qe=class{_device;_model;precision;support;_context;_builderConstructor;_shapeCache=new Map;_shapePromises=new Map;_retiredExecutions=new Set;_pendingCreationCount=0;_shapeCacheSize;_clock=0;_inputPipeline;_outputPipeline;_resources=new Ue;_disposed=!1;constructor(e,t,r={}){this._device=e,this._model=t,this.precision=Un(e,r.precision??"auto"),this._shapeCacheSize=Math.max(1,r.shapeCacheSize??2),this.support={available:!1,fp16Conv:!1,gpuInterop:!1};let o=Cn(e,t.inputChannels/3);this._inputPipeline=o.input,this._outputPipeline=o.output}async prepare(){if(this._disposed)throw new Error("OIDN WebNN executor is disposed");let e=globalThis.navigator?.ml,t=globalThis.MLGraphBuilder;if(!e?.createContext||typeof t!="function")throw this.support.reason="WebNN is not exposed by this browser",new Error(this.support.reason);this._builderConstructor=t;try{try{this._context=await e.createContext({deviceType:"gpu",powerPreference:"high-performance"})}catch{this._context=await e.createContext({deviceType:"gpu"})}if(this._resources.track("ml-context",this._context),this._disposed)throw new Error("OIDN WebNN executor is disposed");if(typeof this._context.createExportableTensor!="function"||typeof this._context.exportToGPU!="function")throw this.support.reason="WebNN WebGPU tensor interop is unavailable",new Error(this.support.reason);let r=this._context.opSupportLimits?.()??{};if(this.support.fp16Conv=mr(r,"conv2d","input","float16")&&mr(r,"conv2d","filter","float16")&&mr(r,"conv2d","output","float16"),!this.support.fp16Conv)throw this.support.reason="WebNN does not support FP16 conv2d",new Error(this.support.reason);let o,n;try{o=this._resources.track("ml-tensor",await this._context.createExportableTensor({dataType:"float16",shape:[4]},this._device)),n=this._resources.track("gpu-buffer",await this._context.exportToGPU(o)),this.support.gpuInterop=!0}catch(a){throw this.support.reason=`WebNN FP16 WebGPU interop failed: ${String(a)}`,new Error(this.support.reason)}finally{this._releaseBuffer(n),this._releaseTensor(o)}this.support.available=!0}catch(r){throw this._releaseContext(),r}}_constant(e,t){return e.constant({dataType:"float16",shape:[...t.desc.dims]},On(t,this.precision))}async _createExecution(e,t){if(this._disposed)throw new Error("OIDN WebNN executor is disposed");let r=new this._builderConstructor(this._context),o=new Map,n=new Map;o.set(this._model.spec.input,r.input("input",{dataType:"float16",shape:[1,this._model.inputChannels,t,e]})),n.set(this._model.spec.input,[this._model.inputChannels,t,e]);for(let d of this._model.spec.nodes){let f,h;if(d.op==="conv2d"){let g=n.get(d.input),_=this._model.convTensors.get(d.id),x=r.conv2d(o.get(d.input),this._constant(r,_.weight),{bias:this._constant(r,_.bias),padding:[1,1,1,1],inputLayout:"nchw",filterLayout:"oihw"});f=Ln(r,x,d.activation),h=[_.outputChannels,g[1],g[2]]}else if(d.op==="maxPool2d"){let g=n.get(d.input);f=r.maxPool2d(o.get(d.input),{windowDimensions:[2,2],strides:[2,2],padding:[0,g[1]%2,0,g[2]%2],layout:"nchw"}),h=[g[0],Math.ceil(g[1]/2),Math.ceil(g[2]/2)]}else if(d.op==="upsample2d"){let g=n.get(d.input);f=r.resample2d(o.get(d.input),{mode:"nearest-neighbor",axes:[2,3],scales:[2,2]}),h=[g[0],g[1]*2,g[2]*2]}else{let g=d.inputs.map(_=>n.get(_));if(g.some(_=>_[1]!==g[0][1]||_[2]!==g[0][2]))throw new Error(`WebNN concat ${d.id} has mismatched spatial shapes`);f=r.concat(d.inputs.map(_=>o.get(_)),1),h=[g.reduce((_,x)=>_+x[0],0),g[0][1],g[0][2]]}o.set(d.id,f),n.set(d.id,h)}let a,u,s,l,p,c;try{return a=this._resources.track("ml-graph",await r.build({output:o.get(this._model.spec.output)})),u=this._resources.track("ml-tensor",await this._context.createExportableTensor({dataType:"float16",shape:[1,this._model.inputChannels,t,e],writable:!0},this._device)),s=this._resources.track("ml-tensor",await this._context.createExportableTensor({dataType:"float16",shape:[1,this._model.outputChannels,t,e],readable:!0},this._device)),l=this._resources.track("gpu-buffer",this._device.createBuffer({label:`oidn/webnn/output/${e}x${t}`,size:e*t*4*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST})),p=this._resources.track("gpu-buffer",wo(this._device,`oidn/webnn/input/${e}x${t}`,[e,t,this._model.inputChannels])),c=this._resources.track("gpu-buffer",wo(this._device,`oidn/webnn/output/${e}x${t}`,[e,t])),{graph:a,inputTensor:u,outputTensor:s,outputBuffer:l,inputUniform:p,outputUniform:c,width:e,height:t,lastUsed:++this._clock}}catch(d){throw this._releaseBuffer(c),this._releaseBuffer(p),this._releaseBuffer(l),this._releaseTensor(s),this._releaseTensor(u),this._releaseGraph(a),d}}async _execution(e,t){let r=`${e}x${t}`,o=this._shapeCache.get(r);if(!o){let n=this._shapePromises.get(r);n||(n=(async()=>{this._pendingCreationCount++;try{return await this._createExecution(e,t)}finally{this._pendingCreationCount--}})(),this._shapePromises.set(r,n));try{if(o=await n,this._disposed)throw this._destroyExecution(o),new Error("OIDN WebNN executor is disposed");this._shapeCache.set(r,o)}finally{this._shapePromises.get(r)===n&&this._shapePromises.delete(r)}if(this._shapeCache.size>this._shapeCacheSize){let a=[...this._shapeCache.entries()].filter(([u])=>u!==r).sort((u,s)=>u[1].lastUsed-s[1].lastUsed)[0];a&&(this._shapeCache.delete(a[0]),this._retireExecution(a[1]))}}return o.lastUsed=++this._clock,o}async prewarm(e){for(let t of e)await this._execution(t.width,t.height)}async execute(e,t,r){let o=this._model.inputChannels/3;if(e.length!==o)throw new Error(`OIDN WebNN expected ${o} input buffers, got ${e.length}`);let n=await this._execution(t,r),a=this._resources.track("gpu-buffer",await this._context.exportToGPU(n.inputTensor));try{let s=e.map((d,f)=>({binding:f,resource:{buffer:d}}));s.push({binding:o,resource:{buffer:a}}),s.push({binding:o+1,resource:{buffer:n.inputUniform}});let l=this._device.createBindGroup({label:"oidn/webnn/input-bindings",layout:this._inputPipeline.getBindGroupLayout(0),entries:s}),p=this._device.createCommandEncoder({label:"oidn/webnn/input-pack"}),c=p.beginComputePass();c.setPipeline(this._inputPipeline),c.setBindGroup(0,l),c.dispatchWorkgroups(Math.ceil(t/fe),Math.ceil(r/fe),this._model.inputChannels),c.end(),this._device.queue.submit([p.finish()])}finally{this._releaseBuffer(a)}this._context.dispatch(n.graph,{input:n.inputTensor},{output:n.outputTensor});let u=this._resources.track("gpu-buffer",await this._context.exportToGPU(n.outputTensor));try{let s=this._device.createBindGroup({label:"oidn/webnn/output-bindings",layout:this._outputPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:u}},{binding:1,resource:{buffer:n.outputBuffer}},{binding:2,resource:{buffer:n.outputUniform}}]}),l=this._device.createCommandEncoder({label:"oidn/webnn/output-unpack"}),p=l.beginComputePass();p.setPipeline(this._outputPipeline),p.setBindGroup(0,s),p.dispatchWorkgroups(Math.ceil(t/fe),Math.ceil(r/fe)),p.end(),this._device.queue.submit([l.finish()])}finally{this._releaseBuffer(u)}return n.outputBuffer}async executeCPU(e,t,r){let o=await this._execution(t,r),n=t*r,a=new H(n*this._model.inputChannels);for(let l=0;l<n;l++)for(let p=0;p<this._model.inputChannels;p++)a[p*n+l]=e[l*this._model.inputChannels+p];this._context.writeTensor(o.inputTensor,a),this._context.dispatch(o.graph,{input:o.inputTensor},{output:o.outputTensor});let u=new H(await this._context.readTensor(o.outputTensor)),s=new Float32Array(n*this._model.outputChannels);for(let l=0;l<n;l++)for(let p=0;p<this._model.outputChannels;p++)s[l*this._model.outputChannels+p]=u[p*n+l];return s}_destroyExecution(e){this._releaseGraph(e.graph),this._releaseTensor(e.inputTensor),this._releaseTensor(e.outputTensor),this._releaseBuffer(e.outputBuffer),this._releaseBuffer(e.inputUniform),this._releaseBuffer(e.outputUniform)}_retireExecution(e){this._retiredExecutions.add(e),this._device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>{this._retiredExecutions.delete(e),this._destroyExecution(e)})}_releaseBuffer(e){this._resources.release("gpu-buffer",e,()=>e.destroy())}_releaseTensor(e){this._resources.release("ml-tensor",e,()=>e.destroy())}_releaseGraph(e){this._resources.release("ml-graph",e,()=>e.destroy?.())}_releaseContext(){this._resources.release("ml-context",this._context,()=>this._context.destroy?.())}getResourceInfo(){return this._resources.snapshot(this._pendingCreationCount+this._retiredExecutions.size)}dispose(){if(!this._disposed){this._disposed=!0;for(let e of this._shapeCache.values())this._destroyExecution(e);this._shapeCache.clear();for(let e of this._retiredExecutions)this._destroyExecution(e);this._retiredExecutions.clear(),this._shapePromises.clear(),this._releaseContext()}}};var Dn=100;function ve(i,e){return Math.ceil(i/e)*e}function St(i){return i.data instanceof GPUBuffer||i.data instanceof GPUTexture}var _r=class{_device;_aux;_hdr;_hdrTransfer;_dataProcessGPU;_nativeExecutor;_webNNExecutor;_modelSpec;_inputChannels;_engine;_dynamicTileController;_lastExecution;_activeExecutionFailures=new Set;_deviceLostObserved=!1;_deviceLostSettled=!1;_deviceLostReason;constructor(e,t,r={}){this._aux=r.aux||!1,this._hdr=r.hdr||!1,this._hdrTransfer=r.hdrTransfer??"pu",this._engine=r.engine??"auto";let o=r.modelSpec??at(e),n=Wt(e,o);this._modelSpec=n.spec,this._inputChannels=n.inputChannels;let a=this._aux?9:3;if(n.inputChannels!==a)throw new Error(`OIDN model expects ${n.inputChannels} input channels, but aux=${this._aux} provides ${a}`);this._dynamicTileController=new ot(r.maxTileSize??512,r.dynamicTile),this._device=t,this._observeDeviceLoss(),this._engine==="webnn"?this._webNNExecutor=new Qe(this._device,n,{precision:r.precision}):this._nativeExecutor=new Ze(this._device,n,{precision:r.precision,kernel:r.kernel,gemm:r.gemm})}getDevice(){return this._device}async prepare(){if(this._webNNExecutor){await this._webNNExecutor.prepare();let e=ve(this._modelSpec.receptiveField/2,16),t=[this._dynamicTileController.tileSize,this._dynamicTileController.minTileSize];await this._webNNExecutor.prewarm([...new Set(t)].map(r=>({width:r+2*e,height:r+2*e})));return}await this._nativeExecutor.prepare()}async prepareForImage(e,t,r={}){let o=ve(this._modelSpec.receptiveField/2,16),n=r.tileOverlap===void 0?o:ve(Math.max(0,r.tileOverlap),16),a=nt(e,t,r.wholeImage?ve(Math.max(e,t),16):this._dynamicTileController.tileSize,n),u=[...new Map(a.tiles.map(({input:s})=>[`${s.width}x${s.height}`,{width:s.width,height:s.height}])).values()];await this._webNNExecutor?.prewarm(u),this._nativeExecutor?.prewarm(u)}getRuntimeInfo(){return{configuredEngine:this._engine,gpuEngine:this._webNNExecutor?"webnn":"wgsl",precision:(this._webNNExecutor??this._nativeExecutor).precision,kernel:this._nativeExecutor?{configured:this._nativeExecutor.kernelSetting,gemm:this._nativeExecutor.gemm,maxSpatialInputBlocks:this._nativeExecutor.maxSpatialInputBlocks,subgroupsAvailable:this._nativeExecutor.subgroupsAvailable}:void 0,webnn:this._webNNExecutor?.support,resources:(this._webNNExecutor??this._nativeExecutor).getResourceInfo(),model:this._modelSpec.id,modelFamily:this._modelSpec.family,inputChannels:this._inputChannels,hdrTransfer:this._hdrTransfer,dynamicTile:{enabled:this._dynamicTileController.enabled,currentTileSize:this._dynamicTileController.tileSize,minTileSize:this._dynamicTileController.minTileSize,maxTileSize:this._dynamicTileController.maxTileSize,targetTileTimeMs:this._dynamicTileController.targetTileTimeMs},lastExecution:this._lastExecution,activeExecutionCount:this._activeExecutionFailures.size}}_observeDeviceLoss(){if(this._activeExecutionFailures??=new Set,this._deviceLostObserved)return;this._deviceLostObserved=!0;let e=this._device.lost;if(!e)return;let t=r=>{if(this._deviceLostSettled)return;this._deviceLostSettled=!0,this._deviceLostReason=r;let o=[...this._activeExecutionFailures];this._activeExecutionFailures.clear();for(let n of o)n(r)};e.then(r=>t(new Error(`WebGPU device lost: ${r.message}`)),t)}_registerExecutionFailure(e){return this._observeDeviceLoss(),this._activeExecutionFailures.add(e),this._deviceLostSettled&&(this._activeExecutionFailures.delete(e),queueMicrotask(()=>e(this._deviceLostReason))),()=>this._activeExecutionFailures.delete(e)}profileNextExecution(){return this._nativeExecutor?.profileNextExecution()??!1}getLastExecutionProfile(){return this._nativeExecutor?.getLastExecutionProfile()}_processImageData(e,t,r,o){let n=e.data,a=n.length/4,u=this._aux?9:3,s=new Float32Array(a*u);if(t&&!r||r&&!t)throw new Error("Normal map and albedo map are both required");if(t&&r&&(t.width!==r.width||t.height!==r.height||e.width!==t.width||e.height!==t.height))throw new Error("Image size mismatch");let l=t?.data,p=r?.data;for(let c=0;c<n.length;c+=4){let d=c/4*u;for(let f=0;f<3;f++)o?s[d+f]=n[c+f]:s[d+f]=n[c+f]/255,l&&(s[d+f+3]=l[c+f]/255),p&&(s[d+f+6]=p[c+f]/255)}return s}_readTile(e,t,r,o){let n=new Float32Array(r.width*r.height*t),a=e.length/(o*t);for(let u=0;u<r.height;u++)for(let s=0;s<r.width;s++){let l=Math.min(o-1,s+r.x),c=(Math.min(a-1,u+r.y)*o+l)*t,d=(u*r.width+s)*t;for(let f=0;f<t;f++)n[d+f]=e[c+f]}return n}_writeTile(e,t,r,o,n,a){let{data:u,width:s}=e,l=r.x-t.x,p=r.y-t.y;for(let c=0;c<r.height;c++)for(let d=0;d<r.width;d++){let f=((c+p)*n+d+l)*3,h=((c+r.y)*s+(d+r.x))*4;for(let g=0;g<3;g++)a?u[h+g]=o[f+g]:u[h+g]=Math.min(Math.max(o[f+g]*255,0),255);e.data[h+3]=a?1:255}}async _executeTile(e,t,r,o,n,a,u,s,l){let p=this._aux?9:3,c=new $e(o.input.x,o.input.y,o.input.width,o.input.height),d=new $e(o.output.x,o.output.y,o.output.width,o.output.height),f=c.width,h=c.height,g,_,x=1,m=this._device,y=this._dataProcessGPU;if(e instanceof Float32Array){let w=this._readTile(e,p,c,a);s&&(x=qr({data:w,channels:p}),w=Lt({data:w,channels:p,inputScale:x,transfer:this._hdrTransfer})),_=await(this._webNNExecutor??this._nativeExecutor).executeCPU(w,f,h)}else{y||(y=this._dataProcessGPU=new tt(m,s,this._hdrTransfer)),y.setImageSize(a,u),y.setInputTile(c),n&&y.copyInputDataToOutput(e.color);let{color:w,albedo:T,normal:$}=y.forward(e.color,this._aux?e.albedo:void 0,this._aux?e.normal:void 0,l);g=await(this._webNNExecutor??this._nativeExecutor).execute(this._aux?[w,T,$]:[w],f,h)}let S;if(e instanceof Float32Array){s&&(_=Dt({data:_,channels:3,inputScale:x,transfer:this._hdrTransfer})),this._writeTile(r,c,d,_,c.width,s);for(let w=0;w<d.height;w++)for(let T=0;T<d.width;T++){let $=(w*d.width+T)*4,C=((w+d.y)*a+(T+d.x))*4;for(let M=0;M<4;M++)t.data[$+M]=r.data[C+M]}}else y.setOutputTile(d,c),S=y.inverse(g,e.color);return S}tileExecute({color:e,albedo:t,normal:r,done:o,progress:n,denoiseAlpha:a,tileOverlap:u,wholeImage:s,scheduling:l="event-loop",error:p}){if(this._aux&&(!t||!r))throw new Error("Normal map and albedo map are both required");if(!this._aux&&(t||r))throw new Error("Normal map and albedo map are not required");let c=e.width,d=e.height,f=this._dynamicTileController.tileSize,h=s?ve(Math.max(c,d),16):f,g=ve(this._modelSpec.receptiveField/2,16),_=u===void 0?g:ve(Math.max(0,u),16),x=nt(c,d,h,_),m=x.tiles.length>1,y=this._hdr||!1,S;St(e)||(S=this._processImageData(e,t,r,y));function w(G,F){return y?{data:new Float32Array(G*F*4),width:G,height:F}:new ImageData(G,F)}let T=St(e)?void 0:w(c,d),$="active",C,M,z=()=>!1,O=()=>typeof performance>"u"?Date.now():performance.now(),be=O(),W=[],V=()=>{C!==void 0&&(clearTimeout(C),C=void 0),M!==void 0&&typeof cancelAnimationFrame<"u"&&(cancelAnimationFrame(M),M=void 0)},Le=G=>{console.error("OIDN error callback failed",G)},Et=G=>{if($==="active")if($="settled",V(),z(),p)try{Promise.resolve(p(G)).catch(Le)}catch(F){Le(F)}else console.error("OIDN execution failed",G)},Co=G=>{if(l==="event-loop"||typeof requestAnimationFrame>"u")C=setTimeout(()=>{C=void 0,G()},0);else{let F=()=>{V(),G()};M=requestAnimationFrame(F),C=setTimeout(F,Dn)}},br=async G=>{if($!=="active")return;let F=x.tiles[G],$r=St(e)?void 0:w(F.output.width,F.output.height),Ao=O(),Oo=await this._executeTile(St(e)?{color:e.data,albedo:t?.data,normal:r?.data}:S,$r,T,F,G===0,c,d,y,a);if($!=="active")return;let Ir=T||{data:Oo,width:c,height:d};if(n&&await n(Ir,$r,new $e(F.output.x,F.output.y,F.output.width,F.output.height),G,x.tiles.length),$!=="active")return;let No=G+1<x.tiles.length;if(await this._device.queue.onSubmittedWorkDone(),$!=="active")return;await(async()=>{if(W.push(O()-Ao),$==="active")if(No)Co(()=>{$==="active"&&br(G+1).catch(Et)});else{let Q=[...W].sort((At,Ot)=>At-Ot),Ct=Math.floor(Q.length/2),Mo=Q.length%2?Q[Ct]:(Q[Ct-1]+Q[Ct])/2;this._lastExecution={width:c,height:d,tileCount:x.tiles.length,tileColumns:x.columns,tileRows:x.rows,tileOverlap:x.overlap,inputPixelCount:x.inputPixelCount,inputShapeCount:x.inputShapeCount,durationMs:O()-be,tileTimeMs:{min:Q[0],median:Mo,mean:Q.reduce((At,Ot)=>At+Ot,0)/Q.length,max:Q[Q.length-1]}},m&&this._dynamicTileController.observe(W),z(),await o(Ir),$==="active"&&($="settled")}})()};return z=this._registerExecutionFailure(Et),br(0).catch(Et),()=>{$==="active"&&($="aborted",V(),z())}}dispose(){this._dataProcessGPU?.dispose(),this._nativeExecutor?.dispose(),this._webNNExecutor?.dispose()}},bo=_r;async function $o(){if(!navigator.gpu)throw new Error("WebGPU is not available");let i={powerPreference:"high-performance"},e=await navigator.gpu.requestAdapter(i);if(!e)throw new Error("No WebGPU adapter is available");let t={},r=[];e.features.has("timestamp-query")&&r.push("timestamp-query"),e.features.has("bgra8unorm-storage")&&r.push("bgra8unorm-storage"),e.features.has("shader-f16")&&r.push("shader-f16"),t.requiredFeatures=r;let o=e.limits;return t.requiredLimits={maxComputeWorkgroupStorageSize:o.maxComputeWorkgroupStorageSize,maxComputeWorkgroupsPerDimension:o.maxComputeWorkgroupsPerDimension,maxStorageBufferBindingSize:o.maxStorageBufferBindingSize,maxBufferSize:o.maxBufferSize,maxComputeWorkgroupSizeX:o.maxComputeWorkgroupSizeX,maxComputeInvocationsPerWorkgroup:o.maxComputeInvocationsPerWorkgroup},e.requestDevice(t)}async function Bt(i,e,t){let r=e?.device??await $o(),o=kr(i),n=new bo(o,r,t);return await n.prepare(),n}var Io=new URL("../oidn/weights/rt_hdr_alb_nrm.tza",import.meta.url),To=new URL("../oidn/weights/rt_hdr_alb_nrm_small.tza",import.meta.url);var Rn={small:"rt_hdr_alb_nrm_small.tza",standard:"rt_hdr_alb_nrm.tza",cleanAuxLarge:"rt_hdr_calb_cnrm_large.tza"},ko={albedo:"rt_alb_large.tza",normal:"rt_nrm_large.tza"},yr="oidn-weights",Wn="2.3.0-1",Po=`https://cdn.jsdelivr.net/npm/${yr}@${Wn}/`,So=`https://cdn.jsdelivr.net/npm/@meimu/mutracer@${Tr}/oidn/weights/`;function xr(i,e){if(e===void 0){if(i==="standard")return String(Io);if(i==="small")return String(To)}let t=String(e??Po);return`${t}${t.endsWith("/")?"":"/"}${Rn[i]}`}function wr(i=Po){let e=String(i),t=`${e}${e.endsWith("/")?"":"/"}`;return{albedo:`${t}${ko.albedo}`,normal:`${t}${ko.normal}`}}async function vr(i,e){let t=await fetch(String(i),{signal:e});if(!t.ok)throw new Error(`Failed to load OIDN weights from ${i}: ${t.status} ${t.statusText}`);let r=await t.arrayBuffer(),o=new Uint8Array(r);if(o[0]!==215||o[1]!==65)throw new Error(`Invalid OIDN TZA weights from ${i}: expected magic D7 41 (received non-TZA content).`);return r}async function Eo(i,e,t={},r=vr){await i.init();let o=i.device;if(i.backend!=="webgpu"||!o)throw new Error("OIDN requires a WebGPU engine.");let n=t.auxiliaryModelUrls,a=await Promise.all([i._getWeights(String(e),()=>r(e,t.signal)),...n?[i._getWeights(String(n.albedo),()=>r(n.albedo,t.signal)),i._getWeights(String(n.normal),()=>r(n.normal,t.signal))]:[]]),u={device:o},s={hdrTransfer:t.hdrTransfer??"pu",maxTileSize:t.maxTileSize,engine:t.engine,precision:t.precision,dynamicTile:t.dynamicTile},l,p;try{if(l=await Bt(a[0],u,{aux:t.aux??!0,hdr:t.hdr??!0,...s}),n){p=await Bt(a[1],u,{aux:!1,hdr:!1,...s});let c=await Bt(a[2],u,{aux:!1,hdr:!1,...s});l.auxiliaryDenoisers={albedo:p,normal:c}}}catch(c){throw p?.dispose(),l?.dispose(),c}return l}function zn(i,e,t={}){return Eo(i,e,t)}var Bo=!1;function Gn(i,e={}){let{model:t="standard",weightsBaseUrl:r,auxiliaryModelUrls:o,...n}=e,a=xr(t,r),u=r===void 0&&t!=="cleanAuxLarge",s=new Set(r===void 0&&t==="cleanAuxLarge"?[a,...o?[]:Object.values(wr()).map(String)]:[]),l=async(p,c)=>{try{return await vr(p,c)}catch(d){if(c?.aborted)throw d;if(u&&String(p)===a)return Bo||(Bo=!0,console.warn('Bundled OIDN weights failed to load; falling back to jsDelivr. In Vite development add optimizeDeps: { exclude: ["@meimu/mutracer"] }, or pass weightsBaseUrl to self-host the weights.',d)),vr(xr(t,So),c);throw s.has(String(p))?new Error(`Failed to load ${yr} network from ${p}. Self-host node_modules/oidn-weights/*.tza and pass weightsBaseUrl. ${d instanceof Error?d.message:String(d)}`):d}};return Eo(i,a,{...n,auxiliaryModelUrls:o??(t==="cleanAuxLarge"?wr(r):void 0)},l)}function as(i,e){return e.weightsUrl!==void 0?zn(i,e.weightsUrl,e):Gn(i,e)}export{as as loadOIDNNetwork};
