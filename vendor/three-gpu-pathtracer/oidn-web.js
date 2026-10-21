import"./chunk-WOT6VMZA.js";var Pe=class{dims=[];paddedDims=[];layout="x";dataType="Float32";getByteSize(){let t=1;for(let e of this.paddedDims)t*=e;return this.dataType==="Float32"?t*=4:this.dataType==="Float16"&&(t*=2),t}},Be=class{desc;data;constructor(t,e){this.desc=t,this.data=e}},ke=class{_view;offset=0;constructor(t){this._view=t}read(t){let e=this._view,r=this.offset;switch(this.offset+=t,t){case 1:return e.getUint8(r);case 2:return e.getUint16(r,!0);case 4:return e.getUint32(r,!0);case 8:return Number(e.getBigUint64(r,!0));default:throw new Error("unsupported read size")}}};function _r(i){let t=new Uint8Array(i),e=new ke(new DataView(i));if(e.read(2)!==16855)throw new Error("invalid or corrupted weights blob");let n=e.read(1),o=e.read(1);if(n!==2)throw new Error("unsupported weights blob version");let a=e.read(8);e.offset=a;let s=e.read(4),u=new Map;for(let l=0;l<s;++l){let p=new Pe,c=e.read(2),f=new TextDecoder().decode(t.subarray(e.offset,e.offset+c));e.offset+=c;let d=e.read(1);for(let y=0;y<d;++y)p.dims.push(e.read(4));p.paddedDims=[...p.dims],new TextDecoder().decode(t.subarray(e.offset,e.offset+d))==="oihw"&&(p.layout="oihw"),e.offset+=d;let g=String.fromCharCode(e.read(1));if(g==="f")p.dataType="Float32";else if(g==="h")p.dataType="Float16";else throw new Error("invalid tensor data type");let _=e.read(8),w=t.slice(_,_+p.getByteSize());u.set(f,new Be(p,w))}return u}function Ji(i,t){return i.channels===t.channels}var ee=8,mt=class{autoUpdateOutputBuffer=!0;_label;_device;_outputBuffers={};_pipeline;_bindGroups=[];_needsUpdatePipeline=!0;_needsResizeBuffer=!0;_inputs=[];_outputs=[];_uniforms=[];_uniformBuffers={};_width=10;_height=10;_execWidth;_execHeight;_csCode="";_csMain;_csDefine;_groupOffsets={inputs:0,uniforms:1,outputs:2};constructor(t,e,r){this._label=t,this._device=e,this._csMain=r.csMain,this._csDefine=r.csDefine,this._inputs=r.inputs,this._outputs=r.outputs,this._uniforms=r.uniforms,this.autoUpdateOutputBuffer=r.autoUpdateOutputBuffer??!0,r.uniforms.forEach(n=>{this._uniformBuffers[n.label]=e.createBuffer({label:this._label,size:n.data.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this._device.queue.writeBuffer(this._uniformBuffers[n.label],0,n.data)})}setCSCode({csDefine:t,csMain:e}){this._csDefine=t,this._csMain=e,this._needsUpdatePipeline=!0}setSize(t,e){t=Math.ceil(t),e=Math.ceil(e);let r=t!==this._width||e!==this._height;this._width=t,this._height=e,r&&(this._needsResizeBuffer=!0,this._needsUpdatePipeline=!0)}setExecuteSize(t,e){t=Math.ceil(t),e=Math.ceil(e),this._execWidth=t,this._execHeight=e}setOutputParams(t){this.autoUpdateOutputBuffer&&this._updateOutputBuffers(t),this._needsUpdatePipeline=!0}setOutputBuffers(t){this._outputBuffers=Object.keys(t).reduce((e,r)=>(e[r]={buffer:t[r],params:{channels:4}},e),{})}setUniform(t,e){let r=this._uniformBuffers[t];this._device.queue.writeBuffer(r,0,e)}getOutput(t){return this._needsResizeBuffer&&this.autoUpdateOutputBuffer&&(this._resizeOutputBuffers(),this._needsResizeBuffer=!1),this._outputBuffers[t].buffer}dispose(t=!0){Object.keys(this._uniformBuffers).forEach(e=>{this._uniformBuffers[e].destroy()}),t&&Object.keys(this._outputBuffers).forEach(e=>{this._outputBuffers[e].buffer.destroy()})}_createBuffer(t){let e=this._width*this._height*4*4;return this._device.createBuffer({label:this._label,size:Math.max(e,80),usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC})}_resizeOutputBuffers(){let t=this._outputBuffers;for(let e in t){let{buffer:r,params:n}=t[e];r.destroy(),t[e].buffer=this._createBuffer(n)}}_updateOutputBuffers(t){let e=this._outputBuffers;for(let r in t){let n=t[r];if(!Ji(n,e[r]?.params||{})){e[r]?.buffer.destroy();let o=this._createBuffer(n);e[r]={buffer:o,params:n}}}}_updatePipeline(t,e){if(!this._needsUpdatePipeline)return;this._needsUpdatePipeline=!1;let r=this._device,n=this._getFullCs(t,e);n!==this._csCode&&(this._csCode=n,this._pipeline=r.createComputePipeline({label:this._label,layout:"auto",compute:{module:r.createShaderModule({label:this._label,code:n}),entryPoint:"main"}}),this._updateBindGroups())}_getFullCs(t,e){let r=this._inputs,n=this._uniforms,o=0,a=this._groupOffsets={inputs:0,uniforms:0,outputs:0};return r.length>0&&o++,n.length>0&&(a.uniforms=o,o++),a.outputs=o,`
${r.sort().map((u,l)=>{let p=`@group(${a.inputs}) @binding(${l}) `,c=`in_${u}`;return e[u]==="texture"?`${p} var ${c}: texture_2d<f32>;`:`${p} var<storage, read> ${c}: array<vec${t[u].channels}f>;`}).join(`
`)}
${this._uniforms.map((u,l)=>`@group(${a.uniforms}) @binding(${l}) var<uniform> ${u.label}: ${u.type};`).join(`
`)}

${this._outputs.map((u,l)=>`@group(${a.outputs}) @binding(${l}) var<storage, read_write> out_${u}: array<vec${this._outputBuffers[u].params.channels}f>;`).join(`
`)}
${this._csDefine??""}
@compute @workgroup_size(${ee}, ${ee}, 1)
fn main(@builtin(global_invocation_id) globalId: vec3u) {
${this._csMain}
}
`}_updateBindGroups(){let t=[],e=this._device,r=this._groupOffsets;this._uniforms.length>0&&(t[r.uniforms]=e.createBindGroup({label:this._label,layout:this._pipeline.getBindGroupLayout(r.uniforms),entries:this._uniforms.map((n,o)=>({binding:o,resource:{buffer:this._uniformBuffers[n.label]}}))})),this._bindGroups=t}createPass(t,e){this._needsResizeBuffer&&this.autoUpdateOutputBuffer&&(this._resizeOutputBuffers(),this._needsResizeBuffer=!1);let r=this._inputs.reduce((a,s)=>(a[s]=e[s].buffer?"buffer":"texture",a),{});this._updatePipeline(e,r);let n=this._groupOffsets;this._inputs.length>0&&(this._bindGroups[n.inputs]=this._device.createBindGroup({label:this._label,layout:this._pipeline.getBindGroupLayout(n.inputs),entries:this._inputs.map((a,s)=>({binding:s,resource:e[a].buffer?{buffer:e[a].buffer}:e[a].texture.createView()}))})),this._bindGroups[n.outputs]=this._device.createBindGroup({label:this._label,layout:this._pipeline.getBindGroupLayout(n.outputs),entries:this._outputs.map((a,s)=>({binding:s,resource:{buffer:this._outputBuffers[a].buffer}}))});let o=t.beginComputePass();o.setPipeline(this._pipeline),this._bindGroups.forEach((a,s)=>{o.setBindGroup(s,a)}),o.dispatchWorkgroups(Math.ceil((this._execWidth??this._width)/ee),Math.ceil((this._execHeight??this._height)/ee),1),o.end()}};var Ae=1412.83765,Ce=1.64593172,Se=.431384981,Ee=-.00294139609,Oe=.192653254,Ne=.00626026094,Ue=.998620152,mr=15794576e-13,xr=.0322087631,vr=.00223151711,wr=.370974749;function br(i){return i<=mr?i=Ae*i:i<=xr?i=Ce*Math.pow(i,Se)+Ee:i=Oe*Math.log(i+Ne)+Ue,i}function Zi(i){return i<=vr?i=i/Ae:i<=wr?i=Math.pow((i-Ee)/Ce,1/Se):i=Math.exp((i-Ue)/Oe)-Ne,i}var Qi=65504,Tr=br(Qi),Ir=1/Tr,$r=Tr,$t=class{x;y;width;height;constructor(t,e,r,n){this.x=t,this.y=e,this.width=r,this.height=n}};function Pr({data:i,channels:t}){let e=0;for(let a=0;a<i.length;a+=t){let s=i[a],u=i[a+1],l=i[a+2],p=.212671*s+.71516*u+.072169*l;e+=Math.log2(p+1e-4)}let r=i.length/t,n=e/r;return .18/Math.pow(2,n)}function Br({data:i,channels:t,inputScale:e}){let r=new Float32Array(i.length);r.set(i);for(let n=0;n<r.length;n+=t)for(let o=0;o<3;o++){let a=r[n+o]*e;r[n+o]=br(a)*Ir}return r}function kr({data:i,channels:t,inputScale:e}){let r=new Float32Array(i.length);r.set(i);let n=1/e;for(let o=0;o<r.length;o+=t)for(let a=0;a<3;a++){let s=r[o+a]*$r;r[o+a]=Zi(s)*n}return r}var yr=`
const a = ${Ae};
const b = ${Ce};
const c = ${Se};
const d = ${Ee};
const e = ${Oe};
const f = ${Ne};
const g = ${Ue};
const y0 =${mr};
const y1 =${xr};
const x0 =${vr};
const x1 =${wr};

const normScale = ${Ir};
const rcpNormScale = ${$r};
`,re=class{_device;_isHDR;_inputPassAux;_inputPassColor;_outputPass;_copyPass;_isInputTexture;constructor(t,e){this._device=t,this._isHDR=e;let r=[{label:"inputScale",type:"f32",data:new Float32Array([1])},{label:"inputSize",type:"vec2i",data:new Int32Array(2)},{label:"outputSize",type:"vec2i",data:new Int32Array(2)},{label:"inputOffset",type:"vec2i",data:new Int32Array(2)}];this._inputPassAux=new mt("inputPassAux",this._device,{inputs:["color","albedo","normal"],outputs:["color","albedo","normal"],uniforms:r,csDefine:"",csMain:""}),this._inputPassColor=new mt("inputPassColor",this._device,{inputs:["color"],outputs:["color"],uniforms:r,csDefine:"",csMain:""}),this._outputPass=new mt("outputPass",this._device,{inputs:["color","raw"],outputs:["color"],uniforms:[{label:"inputScale",type:"f32",data:new Float32Array([1])},{label:"inputSize",type:"vec2i",data:new Int32Array(2)},{label:"outputSize",type:"vec2i",data:new Int32Array(2)},{label:"imageSize",type:"vec2i",data:new Int32Array(2)},{label:"inputOffset",type:"vec2i",data:new Int32Array(2)},{label:"outputOffset",type:"vec2i",data:new Int32Array(2)}],csDefine:"",csMain:""}),this._copyPass=new mt("copyPass",this._device,{inputs:["color"],outputs:["color"],autoUpdateOutputBuffer:!1,uniforms:[{label:"size",type:"vec2i",data:new Int32Array(2)}],csMain:`
let outIdx = i32(globalId.x + globalId.y * u32(size.x));
out_color[outIdx] = textureLoad(in_color, globalId.xy, 0);
`}),this._inputPassAux.setOutputParams({color:{channels:3},albedo:{channels:3},normal:{channels:3}}),this._inputPassColor.setOutputParams({color:{channels:3}}),this._outputPass.setOutputParams({color:{channels:4}})}_updatePasses(t,e=!1){if(this._isInputTexture!=null&&this._isInputTexture===t)return;this._isInputTexture=t;let r=this._isHDR,n=`
${yr}
fn PUForward(y: f32) -> f32 {
  if (y <= y0) {
    return a * y;
  } else if (y <= y1) {
    return b * pow(y, c) + d;
  } else {
    return e * log(y + f) + g;
  }
}`;function o(s){return t?`textureLoad(in_${s}, globalId.xy + vec2u(inputOffset), 0)`:`in_${s}[inIdx]`}let a=`
let x = i32(globalId.x);
let y = i32(globalId.y);
let inIdx = (y + inputOffset.y) * inputSize.x + (x + inputOffset.x);
let col = ${o("color")};

let outIdx = y * outputSize.x + x;

if (${e}) {
  // Denoise the inversed alpha. Or the anti aliased edge will be too dark after denoised
  out_color[outIdx] = vec3f(1.0 - col.a);
}
else if (${r}) {
  out_color[outIdx] = vec3f(PUForward(col.r * inputScale), PUForward(col.g * inputScale), PUForward(col.b * inputScale)) * normScale;
}
else {
  out_color[outIdx] = col.rgb;
}
`;this._inputPassAux.setCSCode({csDefine:n,csMain:`
${a}
let alb = ${o("albedo")};
let nor = ${o("normal")};
out_normal[outIdx] = nor.rgb;
out_albedo[outIdx] = alb.rgb;
  `}),this._inputPassColor.setCSCode({csDefine:n,csMain:`
${a}
`}),this._outputPass.setCSCode({csDefine:`
${yr}
fn PUInverse(y: f32) -> f32 {
  if (y <= x0) {
    return y / a;
  } else if (y <= x1) {
    return pow((y - d) / b, 1 / c);
  } else {
    return exp((y - g) / e) - f;
  }
}
`,csMain:`
let x = i32(globalId.x);
let y = i32(globalId.y);
if (x >= outputSize.x || y >= outputSize.y) {
  return;
}
let inIdx = (y + inputOffset.y) * inputSize.x + x + inputOffset.x;
let outIdx = (y + outputOffset.y) * imageSize.x + x + outputOffset.x;
let col = in_color[inIdx];
let raw = ${t?"textureLoad(in_raw, globalId.xy + vec2u(outputOffset), 0)":"in_raw[outIdx]"};

if (${e}) {
  out_color[outIdx] = vec4f(raw.rgb, 1.0 - col.r);
}
else if (${r}) {
  out_color[outIdx] = vec4f(
    vec3f(PUInverse(col.r * rcpNormScale), PUInverse(col.g * rcpNormScale), PUInverse(col.b * rcpNormScale)) / inputScale,
    // Pick the alpha
    raw.a
  );
}
else {
  out_color[outIdx] = vec4f(col.rgb, raw.a);
}
`})}setImageSize(t,e){this._inputPassAux.setUniform("inputSize",new Int32Array([t,e])),this._inputPassColor.setUniform("inputSize",new Int32Array([t,e])),this._outputPass.setUniform("imageSize",new Int32Array([t,e])),this._outputPass.setSize(t,e),this._copyPass.setSize(t,e),this._copyPass.setUniform("size",new Int32Array([t,e]))}setInputTile(t){let e=new Int32Array([t.width,t.height]);[this._inputPassAux,this._inputPassColor].forEach(r=>{r.setUniform("inputOffset",new Int32Array([t.x,t.y])),r.setUniform("outputSize",e),r.setSize(e[0],e[1])}),this._outputPass.setUniform("inputSize",e)}setOutputTile(t,e){let r=this._outputPass,n=new Int32Array([t.width,t.height]),o=t.x-e.x,a=t.y-e.y;r.setUniform("outputSize",n),r.setUniform("inputOffset",new Int32Array([o,a])),r.setUniform("outputOffset",new Int32Array([t.x,t.y])),r.setExecuteSize(n[0],n[1])}forward(t,e,r,n){let o=t instanceof GPUTexture;this._updatePasses(o,n);let a=this._inputPassAux,s=this._inputPassColor,u=this._device.createCommandEncoder();function l(p){return p instanceof GPUTexture?{texture:p,channels:4}:{buffer:p,channels:4}}return e&&r?a.createPass(u,{color:l(t),albedo:l(e),normal:l(r)}):s.createPass(u,{color:l(t)}),this._device.queue.submit([u.finish()]),e&&r?{color:a.getOutput("color"),albedo:a.getOutput("albedo"),normal:a.getOutput("normal")}:{color:s.getOutput("color")}}inverse(t,e){let n=this._device.createCommandEncoder(),o=this._outputPass;return o.createPass(n,{color:{buffer:t,channels:4},raw:e instanceof GPUBuffer?{buffer:e,channels:4}:{texture:e,channels:4}}),this._device.queue.submit([n.finish()]),o.getOutput("color")}copyInputDataToOutput(t){let e=this._device.createCommandEncoder(),n=this._outputPass.getOutput("color"),o=this._copyPass;t instanceof GPUTexture?(o.setOutputBuffers({color:n}),o.createPass(e,{color:{texture:t,channels:4}})):e.copyBufferToBuffer(t,0,n,0,n.size),this._device.queue.submit([e.finish()])}dispose(){this._outputPass.dispose(),this._inputPassAux.dispose(),this._inputPassColor.dispose(),this._copyPass.dispose(!1)}};function Lt(i,t){return Math.ceil(i/t)*t}function tn(i,t){return Math.floor(i/t)*t}function Me(i,t,e){return Math.min(Math.max(i,t),e)}function en(i){let t=[...i].sort((r,n)=>r-n),e=Math.floor(t.length/2);return t.length%2?t[e]:(t[e-1]+t[e])/2}function De(i,t){return i<=t?Math.min(Lt(i,16),t):t}var ie=class{enabled;maxTileSize;minTileSize;targetTileTimeMs;_tileSize;_adjustmentStep;constructor(t,e=!0){let r=typeof e=="object"?e:{};this.enabled=e!==!1,this.maxTileSize=Math.max(16,tn(t,16)),this.minTileSize=Me(Lt(r.minTileSize??256,16),16,this.maxTileSize),this.targetTileTimeMs=Math.max(1,r.targetTileTimeMs??16),this._adjustmentStep=Math.max(16,Lt(r.adjustmentStep??128,16)),this._tileSize=this.enabled?Me(Lt(r.initialTileSize??384,16),this.minTileSize,this.maxTileSize):this.maxTileSize}get tileSize(){return this._tileSize}observe(t){if(!this.enabled||t.length===0)return!1;let e=t.filter(o=>Number.isFinite(o)&&o>=0);if(e.length===0)return!1;let r=en(e),n=this._tileSize;return r>this.targetTileTimeMs*1.25?n-=this._adjustmentStep:r<this.targetTileTimeMs*.65&&(n+=this._adjustmentStep),n=Me(Lt(n,16),this.minTileSize,this.maxTileSize),n===this._tileSize?!1:(this._tileSize=n,!0)}};async function Ar(i){try{await i.onSubmittedWorkDone()}catch{}}function x(i,t){return{op:"conv2d",id:i,input:t,weight:`${i}.weight`,bias:`${i}.bias`,activation:"relu",padding:"same"}}function lt(i,t){return{op:"maxPool2d",id:i,input:t,size:2,stride:2,padding:"same"}}function ft(i,t){return{op:"upsample2d",id:i,input:t,scale:2,mode:"nearest"}}function dt(i,t,e){return{op:"concat",id:i,inputs:[t,e],axis:"channels"}}var Er={schemaVersion:1,id:"oidn-unet-small-v1",family:"oidn-unet-small",input:"input",output:"dec_conv0",receptiveField:174,nodes:[x("enc_conv0","input"),x("enc_conv1","enc_conv0"),lt("pool1","enc_conv1"),x("enc_conv2","pool1"),lt("pool2","enc_conv2"),x("enc_conv3","pool2"),lt("pool3","enc_conv3"),x("enc_conv4","pool3"),lt("pool4","enc_conv4"),x("enc_conv5a","pool4"),x("enc_conv5b","enc_conv5a"),ft("up4","enc_conv5b"),dt("concat4","up4","pool3"),x("dec_conv4a","concat4"),x("dec_conv4b","dec_conv4a"),ft("up3","dec_conv4b"),dt("concat3","up3","pool2"),x("dec_conv3a","concat3"),x("dec_conv3b","dec_conv3a"),ft("up2","dec_conv3b"),dt("concat2","up2","pool1"),x("dec_conv2a","concat2"),x("dec_conv2b","dec_conv2a"),ft("up1","dec_conv2b"),dt("concat1","up1","input"),x("dec_conv1a","concat1"),x("dec_conv1b","dec_conv1a"),x("dec_conv0","dec_conv1b")]},Or={schemaVersion:1,id:"oidn-unet-large-v1",family:"oidn-unet-large",input:"input",output:"dec_conv1c",receptiveField:202,nodes:[x("enc_conv1a","input"),x("enc_conv1b","enc_conv1a"),lt("pool1","enc_conv1b"),x("enc_conv2a","pool1"),x("enc_conv2b","enc_conv2a"),lt("pool2","enc_conv2b"),x("enc_conv3a","pool2"),x("enc_conv3b","enc_conv3a"),lt("pool3","enc_conv3b"),x("enc_conv4a","pool3"),x("enc_conv4b","enc_conv4a"),lt("pool4","enc_conv4b"),x("enc_conv5a","pool4"),x("enc_conv5b","enc_conv5a"),ft("up4","enc_conv5b"),dt("concat4","up4","pool3"),x("dec_conv4a","concat4"),x("dec_conv4b","dec_conv4a"),ft("up3","dec_conv4b"),dt("concat3","up3","pool2"),x("dec_conv3a","concat3"),x("dec_conv3b","dec_conv3a"),ft("up2","dec_conv3b"),dt("concat2","up2","pool1"),x("dec_conv2a","concat2"),x("dec_conv2b","dec_conv2a"),ft("up1","dec_conv2b"),dt("concat1","up1","input"),x("dec_conv1a","concat1"),x("dec_conv1b","dec_conv1a"),x("dec_conv1c","dec_conv1b")]},rn=[Er,Or];function Nr(i){let t=new Set;for(let e of i.nodes)e.op==="conv2d"&&(t.add(e.weight),t.add(e.bias));return t}function Cr(i){return i.desc.getByteSize()}function Ur(i){return[...i].sort().join(", ")}function ne(i,t=rn){let e=t.filter(r=>{let n=Nr(r);return[...n].some(o=>!i.has(o))?!1:r.allowAdditionalTensors===!0||[...i.keys()].every(o=>n.has(o))});if(e.length===1)return e[0];throw e.length>1?new Error(`Ambiguous OIDN model topology: ${e.map(r=>r.id).join(", ")}`):new Error(`Unsupported OIDN model topology. TZA tensors: ${Ur(i.keys())}`)}function Sr(i,t,e){let r=i.get(t);if(!r)throw new Error(`Model ${e} is missing tensor ${t}`);if(r.data.byteLength!==Cr(r))throw new Error(`Tensor ${t} has ${r.data.byteLength} bytes, expected ${Cr(r)}`);return r}function Re(i,t=ne(i)){if(t.schemaVersion!==1)throw new Error(`Unsupported model descriptor schema ${t.schemaVersion}`);let e=Nr(t);if(!t.allowAdditionalTensors){let c=[...i.keys()].filter(f=>!e.has(f));if(c.length>0)throw new Error(`Model ${t.id} has unexpected tensors: ${Ur(c)}`)}let r=new Map,n=new Map,o=new Map,a=new Set([t.input]),s,u,l=(c,f)=>{let d=r.get(c);if(d===void 0)throw new Error(`Model ${t.id} node ${f} reads unknown or forward value ${c}`);return d};for(let c of t.nodes){if(a.has(c.id))throw new Error(`Model ${t.id} produces duplicate value ${c.id}`);if(c.op==="conv2d"){let f=Sr(i,c.weight,t.id),d=Sr(i,c.bias,t.id),h=f.desc.dims;if(f.desc.layout!=="oihw"||h.length!==4)throw new Error(`Tensor ${c.weight} must use OIHW layout`);if(h[2]!==3||h[3]!==3)throw new Error(`Tensor ${c.weight} must use a 3x3 kernel`);if(d.desc.layout!=="x"||d.desc.dims.length!==1)throw new Error(`Tensor ${c.bias} must be a one-dimensional bias`);if(d.desc.dims[0]!==h[0])throw new Error(`Tensor ${c.bias} has ${d.desc.dims[0]} channels, expected ${h[0]}`);if(f.desc.dataType!==d.desc.dataType)throw new Error(`Weight and bias dtype differ for ${c.id}`);if(u&&u!==f.desc.dataType)throw new Error(`Mixed tensor dtypes are not supported by model ${t.id}`);u=f.desc.dataType,c.input===t.input&&s===void 0&&(s=h[1],r.set(t.input,s));let g=l(c.input,c.id);if(g!==h[1])throw new Error(`Tensor ${c.weight} expects ${h[1]} input channels, but ${c.input} provides ${g}`);r.set(c.id,h[0]),n.set(c.id,{weight:f,bias:d,inputChannels:h[1],outputChannels:h[0],kernelHeight:h[2],kernelWidth:h[3]}),o.set(c.id,{inputChannels:h[1],outputChannels:h[0]})}else if(c.op==="concat"){if(c.inputs.length<2)throw new Error(`Concat ${c.id} requires at least two inputs`);let f=c.inputs.reduce((d,h)=>d+l(h,c.id),0);r.set(c.id,f)}else r.set(c.id,l(c.input,c.id));a.add(c.id)}if(s===void 0||u===void 0)throw new Error(`Model ${t.id} has no convolution reading its input`);let p=r.get(t.output);if(p===void 0)throw new Error(`Model ${t.id} output ${t.output} is not produced`);if(p!==3)throw new Error(`Model ${t.id} must produce 3 channels, got ${p}`);return{spec:t,inputChannels:s,outputChannels:p,tensorDataType:u,channelsByValue:r,convChannels:o,convTensors:n}}var Mr="This is not an object",Dr="This is not a Float16Array object",Le="This constructor is not a subclass of Float16Array",oe="The constructor property value is not an object",Rr="Species constructor didn't return TypedArray object",Lr="Derived constructor created TypedArray object which was too small length",Pt="Attempting to access detached ArrayBuffer",zt="Cannot convert undefined or null to object",ae="Cannot mix BigInt and other types, use explicit conversions",ze="@@iterator property is not callable",We="Reduce of empty array with no initial value",zr="The comparison function must be either a function or undefined",se="Offset is out of bounds";function P(i){return(t,...e)=>Y(i,t,e)}function Bt(i,t){return P(ht(i,t).get)}var{apply:Y,construct:kt,defineProperty:Fe,get:ce,getOwnPropertyDescriptor:ht,getPrototypeOf:At,has:Wt,ownKeys:pe,set:Ye,setPrototypeOf:He}=Reflect,Wr=Proxy,{EPSILON:Gr,MAX_SAFE_INTEGER:Xe,isFinite:le,isNaN:ut}=Number,{iterator:q,species:Fr,toStringTag:fe,for:Yr}=Symbol,xt=Object,{create:Gt,defineProperty:vt,freeze:Hr,is:Ve}=xt,Ge=xt.prototype,Xr=Ge.__lookupGetter__?P(Ge.__lookupGetter__):(i,t)=>{if(i==null)throw B(zt);let e=xt(i);do{let r=ht(e,t);if(r!==void 0)return it(r,"get")?r.get:void 0}while((e=At(e))!==null)},it=xt.hasOwn||P(Ge.hasOwnProperty),Vr=Array,Ke=Vr.isArray,de=Vr.prototype,Kr=P(de.join),jr=P(de.push),qr=P(de.toLocaleString),Ft=de[q],Jr=P(Ft),{abs:Zr,trunc:he}=Math,Ct=ArrayBuffer,Qr=Ct.isView,ti=Ct.prototype,ei=P(ti.slice),ri=Bt(ti,"byteLength"),ue=typeof SharedArrayBuffer<"u"?SharedArrayBuffer:null,ii=ue&&Bt(ue.prototype,"byteLength"),ge=At(Uint8Array),nn=ge.from,U=ge.prototype,ni=U[q],oi=P(U.keys),ai=P(U.values),si=P(U.entries),ui=P(U.set),je=P(U.reverse),ci=P(U.fill),pi=P(U.copyWithin),qe=P(U.sort),St=P(U.slice),li=P(U.subarray),M=Bt(U,"buffer"),gt=Bt(U,"byteOffset"),b=Bt(U,"length"),Je=Bt(U,fe),fi=Uint8Array,H=Uint16Array,Ze=(...i)=>Y(nn,H,i),_e=Uint32Array,di=Float32Array,ct=At([][q]()),Et=P(ct.next),hi=P((function*(){})().next),gi=At(ct),_i=DataView.prototype,Xn=P(_i.getUint16),Vn=P(_i.setUint16),B=TypeError,ye=RangeError,Qe=WeakSet,yi=Qe.prototype,mi=P(yi.add),xi=P(yi.has),Ot=WeakMap,tr=Ot.prototype,Nt=P(tr.get),vi=P(tr.has),Yt=P(tr.set);var wi=new Ot,on=Gt(null,{next:{value:function(){let t=Nt(wi,this);return Et(t)}},[q]:{value:function(){return this}}});function Ht(i){if(i[q]===Ft&&ct.next===Et)return i;let t=Gt(on);return Yt(wi,t,Jr(i)),t}var bi=new Ot,Ti=Gt(gi,{next:{value:function(){let t=Nt(bi,this);return hi(t)},writable:!0,configurable:!0}});for(let i of pe(ct))i!=="next"&&vt(Ti,i,ht(ct,i));function er(i){let t=Gt(Ti);return Yt(bi,t,i),t}function wt(i){return i!==null&&typeof i=="object"||typeof i=="function"}function rr(i){return i!==null&&typeof i=="object"}function Xt(i){return Je(i)!==void 0}function me(i){let t=Je(i);return t==="BigInt64Array"||t==="BigUint64Array"}function an(i){try{return Ke(i)?!1:(ri(i),!0)}catch{return!1}}function ir(i){if(ue===null)return!1;try{return ii(i),!0}catch{return!1}}function Ii(i){return an(i)||ir(i)}function nr(i){return Ke(i)?i[q]===Ft&&ct.next===Et:!1}function $i(i){return Xt(i)?i[q]===ni&&ct.next===Et:!1}function Vt(i){if(typeof i!="string")return!1;let t=+i;return i!==t+""||!le(t)?!1:t===he(t)}var Kt=Yr("__Float16Array__");function Pi(i){if(!rr(i))return!1;let t=At(i);if(!rr(t))return!1;let e=t.constructor;if(e===void 0)return!1;if(!wt(e))throw B(oe);return Wt(e,Kt)}var or=1/Gr;function sn(i){return i+or-or}var ki=6103515625e-14,un=65504,Ai=.0009765625,Bi=Ai*ki,cn=Ai*or;function pn(i){let t=+i;if(!le(t)||t===0)return t;let e=t>0?1:-1,r=Zr(t);if(r<ki)return e*sn(r/Bi)*Bi;let n=(1+cn)*r,o=n-(n-r);return o>un||ut(o)?e*(1/0):e*o}var Ci=new Ct(4),Si=new di(Ci),Ei=new _e(Ci),tt=new H(512),et=new fi(512);for(let i=0;i<256;++i){let t=i-127;t<-24?(tt[i]=0,tt[i|256]=32768,et[i]=24,et[i|256]=24):t<-14?(tt[i]=1024>>-t-14,tt[i|256]=1024>>-t-14|32768,et[i]=-t-1,et[i|256]=-t-1):t<=15?(tt[i]=t+15<<10,tt[i|256]=t+15<<10|32768,et[i]=13,et[i|256]=13):t<128?(tt[i]=31744,tt[i|256]=64512,et[i]=24,et[i|256]=24):(tt[i]=31744,tt[i|256]=64512,et[i]=13,et[i|256]=13)}function rt(i){Si[0]=pn(i);let t=Ei[0],e=t>>23&511;return tt[e]+((t&8388607)>>et[e])}var ar=new _e(2048);for(let i=1;i<1024;++i){let t=i<<13,e=0;for(;(t&8388608)===0;)t<<=1,e-=8388608;t&=-8388609,e+=947912704,ar[i]=t|e}for(let i=1024;i<2048;++i)ar[i]=939524096+(i-1024<<13);var Ut=new _e(64);for(let i=1;i<31;++i)Ut[i]=i<<23;Ut[31]=1199570944;Ut[32]=2147483648;for(let i=33;i<63;++i)Ut[i]=2147483648+(i-32<<23);Ut[63]=3347054592;var Oi=new H(64);for(let i=1;i<64;++i)i!==32&&(Oi[i]=1024);function I(i){let t=i>>10;return Ei[0]=ar[Oi[t]+(i&1023)]+Ut[t],Si[0]}function nt(i){let t=+i;return ut(t)||t===0?0:he(t)}function xe(i){let t=nt(i);return t<0?0:t<Xe?t:Xe}function jt(i,t){if(!wt(i))throw B(Mr);let e=i.constructor;if(e===void 0)return t;if(!wt(e))throw B(oe);let r=e[Fr];return r??t}function Mt(i){if(ir(i))return!1;try{return ei(i,0,0),!1}catch{}return!0}function sr(i,t){let e=ut(i),r=ut(t);if(e&&r)return 0;if(e)return 1;if(r||i<t)return-1;if(i>t)return 1;if(i===0&&t===0){let n=Ve(i,0),o=Ve(t,0);if(!n&&o)return-1;if(n&&!o)return 1}return 0}var ur=2,we=new Ot;function bt(i){return vi(we,i)||!Qr(i)&&Pi(i)}function T(i){if(!bt(i))throw B(Dr)}function ve(i,t){let e=bt(i),r=Xt(i);if(!e&&!r)throw B(Rr);if(typeof t=="number"){let n;if(e){let o=m(i);n=b(o)}else n=b(i);if(n<t)throw B(Lr)}if(me(i))throw B(ae)}function m(i){let t=Nt(we,i);if(t!==void 0){let n=M(t);if(Mt(n))throw B(Pt);return t}let e=i.buffer;if(Mt(e))throw B(Pt);let r=kt(X,[e,i.byteOffset,i.length],i.constructor);return Nt(we,r)}function Ni(i){let t=b(i),e=[];for(let r=0;r<t;++r)e[r]=I(i[r]);return e}var Ui=new Qe;for(let i of pe(U)){if(i===fe)continue;let t=ht(U,i);it(t,"get")&&typeof t.get=="function"&&mi(Ui,t.get)}var ln=Hr({get(i,t,e){return Vt(t)&&it(i,t)?I(ce(i,t)):xi(Ui,Xr(i,t))?ce(i,t):ce(i,t,e)},set(i,t,e,r){return Vt(t)&&it(i,t)?Ye(i,t,rt(e)):Ye(i,t,e,r)},getOwnPropertyDescriptor(i,t){if(Vt(t)&&it(i,t)){let e=ht(i,t);return e.value=I(e.value),e}return ht(i,t)},defineProperty(i,t,e){return Vt(t)&&it(i,t)&&it(e,"value")?(e.value=rt(e.value),Fe(i,t,e)):Fe(i,t,e)}}),X=class i{constructor(t,e,r){let n;if(bt(t))n=kt(H,[m(t)],new.target);else if(wt(t)&&!Ii(t)){let a,s;if(Xt(t)){a=t,s=b(t);let u=M(t);if(Mt(u))throw B(Pt);if(me(t))throw B(ae);let l=new Ct(s*ur);n=kt(H,[l],new.target)}else{let u=t[q];if(u!=null&&typeof u!="function")throw B(ze);u!=null?nr(t)?(a=t,s=t.length):(a=[...t],s=a.length):(a=t,s=xe(a.length)),n=kt(H,[s],new.target)}for(let u=0;u<s;++u)n[u]=rt(a[u])}else n=kt(H,arguments,new.target);let o=new Wr(n,ln);return Yt(we,o,n),o}static from(t,...e){let r=this;if(!Wt(r,Kt))throw B(Le);if(r===i){if(bt(t)&&e.length===0){let p=m(t),c=new H(M(p),gt(p),b(p));return new i(M(St(c)))}if(e.length===0)return new i(M(Ze(t,rt)));let u=e[0],l=e[1];return new i(M(Ze(t,function(p,...c){return rt(Y(u,this,[p,...Ht(c)]))},l)))}let n,o,a=t[q];if(a!=null&&typeof a!="function")throw B(ze);if(a!=null)nr(t)?(n=t,o=t.length):$i(t)?(n=t,o=b(t)):(n=[...t],o=n.length);else{if(t==null)throw B(zt);n=xt(t),o=xe(n.length)}let s=new r(o);if(e.length===0)for(let u=0;u<o;++u)s[u]=n[u];else{let u=e[0],l=e[1];for(let p=0;p<o;++p)s[p]=Y(u,l,[n[p],p])}return s}static of(...t){let e=this;if(!Wt(e,Kt))throw B(Le);let r=t.length;if(e===i){let o=new i(r),a=m(o);for(let s=0;s<r;++s)a[s]=rt(t[s]);return o}let n=new e(r);for(let o=0;o<r;++o)n[o]=t[o];return n}keys(){T(this);let t=m(this);return oi(t)}values(){T(this);let t=m(this);return er((function*(){for(let e of ai(t))yield I(e)})())}entries(){T(this);let t=m(this);return er((function*(){for(let[e,r]of si(t))yield[e,I(r)]})())}at(t){T(this);let e=m(this),r=b(e),n=nt(t),o=n>=0?n:r+n;if(!(o<0||o>=r))return I(e[o])}with(t,e){T(this);let r=m(this),n=b(r),o=nt(t),a=o>=0?o:n+o,s=+e;if(a<0||a>=n)throw ye(se);let u=new H(M(r),gt(r),b(r)),l=new i(M(St(u))),p=m(l);return p[a]=rt(s),l}map(t,...e){T(this);let r=m(this),n=b(r),o=e[0],a=jt(r,i);if(a===i){let u=new i(n),l=m(u);for(let p=0;p<n;++p){let c=I(r[p]);l[p]=rt(Y(t,o,[c,p,this]))}return u}let s=new a(n);ve(s,n);for(let u=0;u<n;++u){let l=I(r[u]);s[u]=Y(t,o,[l,u,this])}return s}filter(t,...e){T(this);let r=m(this),n=b(r),o=e[0],a=[];for(let l=0;l<n;++l){let p=I(r[l]);Y(t,o,[p,l,this])&&jr(a,p)}let s=jt(r,i),u=new s(a);return ve(u),u}reduce(t,...e){T(this);let r=m(this),n=b(r);if(n===0&&e.length===0)throw B(We);let o,a;e.length===0?(o=I(r[0]),a=1):(o=e[0],a=0);for(let s=a;s<n;++s)o=t(o,I(r[s]),s,this);return o}reduceRight(t,...e){T(this);let r=m(this),n=b(r);if(n===0&&e.length===0)throw B(We);let o,a;e.length===0?(o=I(r[n-1]),a=n-2):(o=e[0],a=n-1);for(let s=a;s>=0;--s)o=t(o,I(r[s]),s,this);return o}forEach(t,...e){T(this);let r=m(this),n=b(r),o=e[0];for(let a=0;a<n;++a)Y(t,o,[I(r[a]),a,this])}find(t,...e){T(this);let r=m(this),n=b(r),o=e[0];for(let a=0;a<n;++a){let s=I(r[a]);if(Y(t,o,[s,a,this]))return s}}findIndex(t,...e){T(this);let r=m(this),n=b(r),o=e[0];for(let a=0;a<n;++a){let s=I(r[a]);if(Y(t,o,[s,a,this]))return a}return-1}findLast(t,...e){T(this);let r=m(this),n=b(r),o=e[0];for(let a=n-1;a>=0;--a){let s=I(r[a]);if(Y(t,o,[s,a,this]))return s}}findLastIndex(t,...e){T(this);let r=m(this),n=b(r),o=e[0];for(let a=n-1;a>=0;--a){let s=I(r[a]);if(Y(t,o,[s,a,this]))return a}return-1}every(t,...e){T(this);let r=m(this),n=b(r),o=e[0];for(let a=0;a<n;++a)if(!Y(t,o,[I(r[a]),a,this]))return!1;return!0}some(t,...e){T(this);let r=m(this),n=b(r),o=e[0];for(let a=0;a<n;++a)if(Y(t,o,[I(r[a]),a,this]))return!0;return!1}set(t,...e){T(this);let r=m(this),n=nt(e[0]);if(n<0)throw ye(se);if(t==null)throw B(zt);if(me(t))throw B(ae);if(bt(t))return ui(m(this),m(t),n);if(Xt(t)){let u=M(t);if(Mt(u))throw B(Pt)}let o=b(r),a=xt(t),s=xe(a.length);if(n===1/0||s+n>o)throw ye(se);for(let u=0;u<s;++u)r[u+n]=rt(a[u])}reverse(){T(this);let t=m(this);return je(t),this}toReversed(){T(this);let t=m(this),e=new H(M(t),gt(t),b(t)),r=new i(M(St(e))),n=m(r);return je(n),r}fill(t,...e){T(this);let r=m(this);return ci(r,rt(t),...Ht(e)),this}copyWithin(t,e,...r){T(this);let n=m(this);return pi(n,t,e,...Ht(r)),this}sort(t){T(this);let e=m(this),r=t!==void 0?t:sr;return qe(e,(n,o)=>r(I(n),I(o))),this}toSorted(t){T(this);let e=m(this);if(t!==void 0&&typeof t!="function")throw new B(zr);let r=t!==void 0?t:sr,n=new H(M(e),gt(e),b(e)),o=new i(M(St(n))),a=m(o);return qe(a,(s,u)=>r(I(s),I(u))),o}slice(t,e){T(this);let r=m(this),n=jt(r,i);if(n===i){let h=new H(M(r),gt(r),b(r));return new i(M(St(h,t,e)))}let o=b(r),a=nt(t),s=e===void 0?o:nt(e),u;a===-1/0?u=0:a<0?u=o+a>0?o+a:0:u=o<a?o:a;let l;s===-1/0?l=0:s<0?l=o+s>0?o+s:0:l=o<s?o:s;let p=l-u>0?l-u:0,c=new n(p);if(ve(c,p),p===0)return c;let f=M(r);if(Mt(f))throw B(Pt);let d=0;for(;u<l;)c[d]=I(r[u]),++u,++d;return c}subarray(t,e){T(this);let r=m(this),n=jt(r,i),o=new H(M(r),gt(r),b(r)),a=li(o,t,e),s=new n(M(a),gt(a),b(a));return ve(s),s}indexOf(t,...e){T(this);let r=m(this),n=b(r),o=nt(e[0]);if(o===1/0)return-1;o<0&&(o+=n,o<0&&(o=0));for(let a=o;a<n;++a)if(it(r,a)&&I(r[a])===t)return a;return-1}lastIndexOf(t,...e){T(this);let r=m(this),n=b(r),o=e.length>=1?nt(e[0]):n-1;if(o===-1/0)return-1;o>=0?o=o<n-1?o:n-1:o+=n;for(let a=o;a>=0;--a)if(it(r,a)&&I(r[a])===t)return a;return-1}includes(t,...e){T(this);let r=m(this),n=b(r),o=nt(e[0]);if(o===1/0)return!1;o<0&&(o+=n,o<0&&(o=0));let a=ut(t);for(let s=o;s<n;++s){let u=I(r[s]);if(a&&ut(u)||u===t)return!0}return!1}join(t){T(this);let e=m(this),r=Ni(e);return Kr(r,t)}toLocaleString(...t){T(this);let e=m(this),r=Ni(e);return qr(r,...Ht(t))}get[fe](){if(bt(this))return"Float16Array"}};vt(X,"BYTES_PER_ELEMENT",{value:ur});vt(X,Kt,{});He(X,ge);var be=X.prototype;vt(be,"BYTES_PER_ELEMENT",{value:ur});vt(be,q,{value:be.values,writable:!0,configurable:!0});He(be,U);function fn(i){return i.op==="concat"?i.inputs:[i.input]}function dn(i){let t=new Map;for(let e of i.nodes)for(let r of fn(e)){let n=t.get(r)??[];n.push(e),t.set(r,n)}return t}function cr(i,t,e){let r=i.get(t);if(!(r?.length!==1||r[0].op!==e))return r[0]}function qt(i,t={}){let e=i.spec,r=dn(e),n=new Map(e.nodes.map(p=>[p.id,p])),o=new Set,a=new Map,s=0,u=0;if(t.fuseConvPool!==!1)for(let p of e.nodes){if(p.op!=="conv2d"||p.activation!=="relu")continue;let c=cr(r,p.id,"maxPool2d");!c||c.size!==2||c.stride!==2||(o.add(p.id),a.set(c.id,{op:"fusedConvReluMaxPool2d",id:c.id,input:p.input,conv:p,pool:c}),s++)}if(t.fuseUpsampleConcatConv!==!1)for(let p of e.nodes){if(p.op!=="conv2d")continue;let c=n.get(p.input);if(c?.op!=="concat"||c.inputs.length!==2||cr(r,c.id,"conv2d")!==p)continue;let f=i.channelsByValue.get(c.inputs[0]);if(f===void 0||f%4!==0)continue;let d=c.inputs.map(g=>{let _=n.get(g);return _?.op==="upsample2d"&&_.scale===2&&_.mode==="nearest"&&cr(r,_.id,"concat")===c?{value:_.input,upsample:_}:{value:g}});if(d.filter(g=>g.upsample).length===1){o.add(c.id);for(let g of c.inputs){let _=n.get(g);_?.op==="upsample2d"&&o.add(_.id)}a.set(p.id,{op:"fusedUpsampleConcatConv2d",id:p.id,inputs:d,conv:p}),u++}}let l=[];for(let p of e.nodes){let c=a.get(p.id);c?l.push(c):o.has(p.id)||l.push(p)}return{spec:e,nodes:l,fusions:{convPool:s,upsampleConcatConv:u}}}function hn(i){return i.op==="concat"?i.inputs:i.op==="fusedUpsampleConcatConv2d"?i.inputs.map(t=>t.value):[i.input]}function Mi(i,t){return i.width===t.width&&i.height===t.height}function pr(i,t,e,r){if(!Number.isInteger(t)||t<=0||!Number.isInteger(e)||e<=0)throw new Error(`Invalid model input size ${t}x${e}`);let n=qt(i,r),o={width:t,height:e,channels:i.inputChannels},a=new Map([[i.spec.input,o]]),s=[],u=(c,f)=>{let d=a.get(c);if(!d)throw new Error(`Planned node ${f} reads missing value ${c}`);return d};for(let c of n.nodes){let f;if(c.op==="conv2d"){let d=u(c.input,c.id);f={width:d.width,height:d.height,channels:i.convChannels.get(c.id).outputChannels}}else if(c.op==="maxPool2d"){let d=u(c.input,c.id);f={width:Math.ceil(d.width/2),height:Math.ceil(d.height/2),channels:d.channels}}else if(c.op==="upsample2d"){let d=u(c.input,c.id);f={width:d.width*2,height:d.height*2,channels:d.channels}}else if(c.op==="concat"){let d=c.inputs.map(h=>u(h,c.id));if(d.some(h=>!Mi(h,d[0])))throw new Error(`Concat ${c.id} has mismatched spatial shapes`);f={width:d[0].width,height:d[0].height,channels:d.reduce((h,g)=>h+g.channels,0)}}else if(c.op==="fusedConvReluMaxPool2d"){let d=u(c.input,c.id);f={width:Math.ceil(d.width/2),height:Math.ceil(d.height/2),channels:i.convChannels.get(c.conv.id).outputChannels}}else{let d=c.inputs.map(h=>{let g=u(h.value,c.id);return h.upsample?{...g,width:g.width*2,height:g.height*2}:g});if(d.some(h=>!Mi(h,d[0])))throw new Error(`Fused decoder ${c.id} has mismatched spatial shapes`);f={width:d[0].width,height:d[0].height,channels:i.convChannels.get(c.conv.id).outputChannels}}a.set(c.id,f),s.push(f)}let l=new Map;n.nodes.forEach((c,f)=>{for(let d of hn(c))l.set(d,f)}),l.set(i.spec.output,n.nodes.length);let p=n.nodes.map((c,f)=>({node:c,outputShape:s[f],lastUse:l.get(c.id)??f}));return{...n,inputShape:o,valueShapes:a,plannedNodes:p}}var Dt=class{_stats=new Map;track(t,e){let r=this._stats.get(t);return r||(r={created:0,destroyed:0,live:0,peakLive:0,resources:new Set},this._stats.set(t,r)),r.resources.has(e)||(r.resources.add(e),r.created++,r.live++,r.peakLive=Math.max(r.peakLive,r.live)),e}release(t,e,r){if(!e)return!1;let n=this._stats.get(t);if(!n?.resources.delete(e))return!1;try{r()}finally{n.destroyed++,n.live--}return!0}snapshot(t=0){let e=0,r=0,n=0,o=0,a={};for(let[s,u]of this._stats){let l={created:u.created,destroyed:u.destroyed,live:u.live,peakLive:u.peakLive};a[s]=l,e+=l.live,r+=l.created,n+=l.destroyed,o+=l.peakLive}return{live:e,created:r,destroyed:n,peakLive:o,pending:t,byKind:a}}};var Di=new WeakMap;function gn(i){let t=Di.get(i);return t||(t={ready:new Map,pending:new Map},Di.set(i,t)),t}var W=8,Z=8,z=4,Tt=Z*z,J=Z,j=8,k=8,Q=k+2;function fr(i,t){return Math.ceil(i/t)*t}function E(i){return Math.ceil(i/4)}function _n(i,t){return i.width*i.height*E(i.channels)*4*t}var Jt;function Wi(i){let t=i&32768?-1:1,e=i>>>10&31,r=i&1023;return e===0?t*r*2**-24:e===31?r===0?t*(1/0):NaN:t*(1+r/1024)*2**(e-15)}function yn(){if(!Jt){Jt=new Float32Array(65536);for(let i=0;i<Jt.length;i++)Jt[i]=Wi(i)}return Jt}function Ri(i){if(i.desc.dataType==="Float32")return new Float32Array(i.data.buffer,i.data.byteOffset,i.data.byteLength/4);let t=new Uint16Array(i.data.buffer,i.data.byteOffset,i.data.byteLength/2),e=new Float32Array(t.length);if(t.length<4096)for(let r=0;r<t.length;r++)e[r]=Wi(t[r]);else{let r=yn();for(let n=0;n<t.length;n++)e[n]=r[t[n]]}return e}function lr(i,t,e,r){let n=fr(e.byteLength,4),o=i.createBuffer({label:t,size:n,usage:r,mappedAtCreation:!0});return new Uint8Array(o.getMappedRange()).set(new Uint8Array(e.buffer,e.byteOffset,e.byteLength)),o.unmap(),o}function Li(i,t,e){let r=new Uint32Array(fr(e.length,4));return r.set(e),lr(i,t,r,GPUBufferUsage.UNIFORM)}function mn(i,t,e,r){let n=E(e.inputChannels),o=E(e.outputChannels),a=o*e.kernelHeight*e.kernelWidth*n*4*4,s=r==="fp16"&&e.weight.desc.dataType==="Float16",u=s?new Uint16Array(a):r==="fp16"?new X(a):new Float32Array(a),l=s?new Uint16Array(e.weight.data.buffer,e.weight.data.byteOffset,e.weight.data.byteLength/2):Ri(e.weight);for(let f=0;f<o;f++)for(let d=0;d<e.kernelHeight;d++)for(let h=0;h<e.kernelWidth;h++)for(let g=0;g<n;g++)for(let _=0;_<4;_++){let w=f*4+_;for(let y=0;y<4;y++){let v=g*4+y,D=(((f*e.kernelHeight+d)*e.kernelWidth+h)*n+g)*16+y*4+_;if(w<e.outputChannels&&v<e.inputChannels){let V=((w*e.inputChannels+v)*e.kernelHeight+d)*e.kernelWidth+h;u[D]=l[V]}}}let p=new Float32Array(o*4);p.set(Ri(e.bias));let c=lr(i,`oidn/${t}/weights/${r}`,u,GPUBufferUsage.STORAGE);try{return{weights:c,bias:lr(i,`oidn/${t}/bias`,p,GPUBufferUsage.STORAGE)}}catch(f){throw c.destroy(),f}}function G(i){return i==="fp16"?"vec4<f16>":"vec4<f32>"}function ot(i){return i==="fp16"?`enable f16;
`:""}function at(i,t){return t==="fp16"?`vec4<f16>(${i})`:i}function _t(i,t){return t==="relu"?`max(${i}, vec4<f32>(0.0))`:i}function Qt(i,t,e){return e==="fp32"?`
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
`}function xn(i,t,e){let r=e==="fp16"?"vec4<f16>":"vec4<f32>",n=e==="fp16"?`var partial = vec4<f16>(0.0h);
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
${n}
`}function Gi(i){return i==="fp16"?`
    var partial: array<vec4<f16>, ${z}>;
    for (var row = 0u; row < ${z}u; row++) {
      partial[row] = vec4<f16>(0.0h);
    }
    for (var tileK = 0u; tileK < ${j}u; tileK++) {
      let weightBase =
        (tileK * ${J}u + localId.x) * 4u;
      for (var row = 0u; row < ${z}u; row++) {
        let tileSpatial =
          localId.y * ${z}u + row;
        let inputValue =
          inputTile[tileSpatial * ${j}u + tileK];
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
    for (var row = 0u; row < ${z}u; row++) {
      acc[row] += vec4<f32>(partial[row]);
    }
`:`
    for (var tileK = 0u; tileK < ${j}u; tileK++) {
      let weightBase =
        (tileK * ${J}u + localId.x) * 4u;
      for (var row = 0u; row < ${z}u; row++) {
        let tileSpatial =
          localId.y * ${z}u + row;
        let inputValue =
          inputTile[tileSpatial * ${j}u + tileK];
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
`}function vn(i,t,e,r,n){let o=G(i),a=G(i),s=G(t),u=at(_t("acc",e),t);return`${ot(i)}
struct Params {
  inputWidth: u32,
  inputHeight: u32,
  outputWidth: u32,
  outputHeight: u32,
  inputBlocks: u32,
  outputBlocks: u32,
}

@group(0) @binding(0) var<storage, read> inputData: array<${o}>;
@group(0) @binding(1) var<storage, read> weights: array<${a}>;
@group(0) @binding(2) var<storage, read> bias: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> outputData: array<${s}>;
@group(0) @binding(4) var<uniform> params: Params;

@compute @workgroup_size(${W}, ${W}, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.outputWidth || gid.y >= params.outputHeight || gid.z >= ${n}u) {
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
        ${Qt("inputData[pixelBase + inputBlock]",`((((gid.z * 3u + ky) * 3u + kx) * ${r}u + inputBlock) * 4u)`,i)}
      }
    }
  }
  let outputIndex = (gid.y * params.outputWidth + gid.x) * ${n}u + gid.z;
  outputData[outputIndex] = ${u};
}
`}function wn(i,t,e,r,n){let o=G(i),a=G(i),s=G(t),u=at(_t("acc",e),t);return`${ot(i)}
enable subgroups;
struct Params {
  inputWidth: u32,
  inputHeight: u32,
  outputWidth: u32,
  outputHeight: u32,
  inputBlocks: u32,
  outputBlocks: u32,
}
@group(0) @binding(0) var<storage, read> inputData: array<${o}>;
@group(0) @binding(1) var<storage, read> weights: array<${a}>;
@group(0) @binding(2) var<storage, read> bias: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> outputData: array<${s}>;
@group(0) @binding(4) var<uniform> params: Params;

@compute @workgroup_size(${W}, ${W}, 1)
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
        ${xn(`select(${o}(0.0), inputData[pixelBase + inputBlock], inputInBounds)`,`((((gid.z * 3u + ky) * 3u + kx) * ${r}u + inputBlock) * 4u)`,i)}
      }
    }
  }
  if (outputInBounds) {
    let outputIndex =
      (gid.y * params.outputWidth + gid.x) * ${n}u + gid.z;
    outputData[outputIndex] = ${u};
  }
}
`}function bn(i,t,e,r,n){let o=G(i),a=G(t),s=at(_t("acc",e),t),u=Q*Q*r,l=k*k;return`${ot(i)}
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
@group(0) @binding(3) var<storage, read_write> outputData: array<${a}>;
@group(0) @binding(4) var<uniform> params: Params;

var<workgroup> inputPatch: array<${o}, ${u}>;

@compute @workgroup_size(${k}, ${k}, 1)
fn main(
  @builtin(local_invocation_id) localId: vec3<u32>,
  @builtin(workgroup_id) workgroupId: vec3<u32>
) {
  let localLinear =
    localId.y * ${k}u + localId.x;
  for (
    var loadIndex = localLinear;
    loadIndex < ${u}u;
    loadIndex += ${l}u
  ) {
    let patchPixel = loadIndex / ${r}u;
    let inputBlock = loadIndex % ${r}u;
    let patchX = patchPixel % ${Q}u;
    let patchY = patchPixel / ${Q}u;
    let inputX =
      i32(workgroupId.x * ${k}u + patchX) - 1;
    let inputY =
      i32(workgroupId.y * ${k}u + patchY) - 1;
    var value = ${o}(0.0);
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
    workgroupId.x * ${k}u + localId.x;
  let outputY =
    workgroupId.y * ${k}u + localId.y;
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
        ((localId.y + ky) * ${Q}u + localId.x + kx) *
        ${r}u;
      for (var inputBlock = 0u; inputBlock < ${r}u; inputBlock++) {
        ${Qt("inputPatch[patchBase + inputBlock]",`((((outputBlock * 3u + ky) * 3u + kx) * ${r}u + inputBlock) * 4u)`,i)}
      }
    }
  }
  let outputIndex =
    (outputY * params.outputWidth + outputX) * ${n}u + outputBlock;
  outputData[outputIndex] = ${s};
}
`}function Tn(i,t,e,r,n){let o=G(i),a=G(t),s=at(_t("acc",e),t),u=Z*Z,l=Tt*j,p=j*J*4;return`${ot(i)}
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
@group(0) @binding(3) var<storage, read_write> outputData: array<${a}>;
@group(0) @binding(4) var<uniform> params: Params;

var<workgroup> inputTile: array<${o}, ${l}>;
var<workgroup> weightTile: array<${o}, ${p}>;

@compute @workgroup_size(${Z}, ${Z}, 1)
fn main(
  @builtin(local_invocation_id) localId: vec3<u32>,
  @builtin(workgroup_id) workgroupId: vec3<u32>
) {
  let spatialBase =
    workgroupId.x * ${Tt}u +
    localId.y * ${z}u;
  let outputBlock =
    workgroupId.y * ${J}u + localId.x;
  let spatialCount = params.outputWidth * params.outputHeight;
  var acc: array<vec4<f32>, ${z}>;
  if (outputBlock < ${n}u) {
    for (var row = 0u; row < ${z}u; row++) {
      acc[row] = bias[outputBlock];
    }
  }

  let localLinear =
    localId.y * ${Z}u + localId.x;
  let totalK = ${r*9}u;
  for (var kBase = 0u; kBase < totalK; kBase += ${j}u) {
    for (
      var loadIndex = localLinear;
      loadIndex < ${l}u;
      loadIndex += ${u}u
    ) {
      let tileSpatial = loadIndex / ${j}u;
      let tileK = loadIndex % ${j}u;
      let inputSpatialIndex =
        workgroupId.x * ${Tt}u + tileSpatial;
      let kIndex = kBase + tileK;
      var value = ${o}(0.0);
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
          value = inputData[inputIndex];
        }
      }
      inputTile[loadIndex] = value;
    }

    for (
      var loadIndex = localLinear;
      loadIndex < ${p}u;
      loadIndex += ${u}u
    ) {
      let tileK = loadIndex / ${J*4}u;
      let outputRemainder = loadIndex % ${J*4}u;
      let tileOutputBlock = outputRemainder / 4u;
      let outputLane = outputRemainder % 4u;
      let loadedOutputBlock =
        workgroupId.y * ${J}u + tileOutputBlock;
      let kIndex = kBase + tileK;
      var value = ${o}(0.0);
      if (loadedOutputBlock < ${n}u && kIndex < totalK) {
        let inputBlock = kIndex % ${r}u;
        let kernelIndex = kIndex / ${r}u;
        let kernelY = kernelIndex / 3u;
        let kernelX = kernelIndex % 3u;
        let weightIndex =
          ((((loadedOutputBlock * 3u + kernelY) * 3u + kernelX) *
            ${r}u + inputBlock) * 4u + outputLane);
        value = weights[weightIndex];
      }
      weightTile[loadIndex] = value;
    }

    workgroupBarrier();
    ${Gi(i)}
    workgroupBarrier();
  }

  if (outputBlock < ${n}u) {
    for (var row = 0u; row < ${z}u; row++) {
      let spatialIndex = spatialBase + row;
      if (spatialIndex < spatialCount) {
        let outputIndex = spatialIndex * ${n}u + outputBlock;
        outputData[outputIndex] = ${s.replaceAll("acc","acc[row]")};
      }
    }
  }
}
`}function In(i,t,e,r){let n=G(i),o=_t("acc",t);return`${ot(i)}
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
@group(0) @binding(3) var<storage, read_write> outputData: array<${n}>;
@group(0) @binding(4) var<uniform> params: Params;

@compute @workgroup_size(${W}, ${W}, 1)
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
            ${Qt("inputData[pixelBase + inputBlock]",`((((gid.z * 3u + ky) * 3u + kx) * ${e}u + inputBlock) * 4u)`,i)}
          }
        }
      }
      pooled = max(pooled, ${o});
    }
  }
  let outputIndex = (gid.y * params.outputWidth + gid.x) * ${r}u + gid.z;
  outputData[outputIndex] = ${at("pooled",i)};
}
`}function $n(i,t){let e=G(i);return`${ot(i)}
struct Params {
  inputWidth: u32,
  inputHeight: u32,
  outputWidth: u32,
  outputHeight: u32,
  outputBlocks: u32,
}
@group(0) @binding(0) var<storage, read> inputData: array<${e}>;
@group(0) @binding(1) var<storage, read_write> outputData: array<${e}>;
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(${W}, ${W}, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (
    gid.x >= params.outputWidth ||
    gid.y >= params.outputHeight ||
    gid.z >= ${t}u
  ) {
    return;
  }
  var pooled = vec4<f32>(-3.402823466e+38);
  for (var py = 0u; py < 2u; py++) {
    let inputY = gid.y * 2u + py;
    if (inputY >= params.inputHeight) { continue; }
    for (var px = 0u; px < 2u; px++) {
      let inputX = gid.x * 2u + px;
      if (inputX >= params.inputWidth) { continue; }
      let inputIndex =
        (inputY * params.inputWidth + inputX) * ${t}u + gid.z;
      pooled = max(pooled, vec4<f32>(inputData[inputIndex]));
    }
  }
  let outputIndex =
    (gid.y * params.outputWidth + gid.x) * ${t}u + gid.z;
  outputData[outputIndex] = ${at("pooled",i)};
}
`}function Pn(i,t,e,r,n){let o=G(i),a=e[0]+e[1],s=at(_t("acc[row]",t),i),u=Z*Z,l=Tt*j,p=j*J*4,c=(f,d)=>`
          {
            let sourceBlock = ${d};
            let sourceX = ${f===r?"u32(inputX) / 2u":"u32(inputX)"};
            let sourceY = ${f===r?"u32(inputY) / 2u":"u32(inputY)"};
            let sourceIndex =
              (sourceY * params.source${f}Width + sourceX) *
              ${e[f]}u + sourceBlock;
            value = input${f}[sourceIndex];
          }`;return`${ot(i)}
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
@group(0) @binding(0) var<storage, read> input0: array<${o}>;
@group(0) @binding(1) var<storage, read> input1: array<${o}>;
@group(0) @binding(2) var<storage, read> weights: array<${o}>;
@group(0) @binding(3) var<storage, read> bias: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> outputData: array<${o}>;
@group(0) @binding(5) var<uniform> params: Params;

var<workgroup> inputTile: array<${o}, ${l}>;
var<workgroup> weightTile: array<${o}, ${p}>;

@compute @workgroup_size(${Z}, ${Z}, 1)
fn main(
  @builtin(local_invocation_id) localId: vec3<u32>,
  @builtin(workgroup_id) workgroupId: vec3<u32>
) {
  let spatialBase =
    workgroupId.x * ${Tt}u +
    localId.y * ${z}u;
  let outputBlock =
    workgroupId.y * ${J}u + localId.x;
  let spatialCount = params.outputWidth * params.outputHeight;
  var acc: array<vec4<f32>, ${z}>;
  if (outputBlock < ${n}u) {
    for (var row = 0u; row < ${z}u; row++) {
      acc[row] = bias[outputBlock];
    }
  }

  let localLinear =
    localId.y * ${Z}u + localId.x;
  let totalK = ${a*9}u;
  for (var kBase = 0u; kBase < totalK; kBase += ${j}u) {
    for (
      var loadIndex = localLinear;
      loadIndex < ${l}u;
      loadIndex += ${u}u
    ) {
      let tileSpatial = loadIndex / ${j}u;
      let tileK = loadIndex % ${j}u;
      let outputSpatialIndex =
        workgroupId.x * ${Tt}u + tileSpatial;
      let kIndex = kBase + tileK;
      var value = ${o}(0.0);
      if (outputSpatialIndex < spatialCount && kIndex < totalK) {
        let outputY = outputSpatialIndex / params.outputWidth;
        let outputX = outputSpatialIndex % params.outputWidth;
        let inputBlock = kIndex % ${a}u;
        let kernelIndex = kIndex / ${a}u;
        let kernelY = kernelIndex / 3u;
        let kernelX = kernelIndex % 3u;
        let inputY = i32(outputY) + i32(kernelY) - 1;
        let inputX = i32(outputX) + i32(kernelX) - 1;
        if (
          inputY >= 0 && inputY < i32(params.outputHeight) &&
          inputX >= 0 && inputX < i32(params.outputWidth)
        ) {
          if (inputBlock < ${e[0]}u) {
            ${c(0,"inputBlock")}
          } else {
            ${c(1,`inputBlock - ${e[0]}u`)}
          }
        }
      }
      inputTile[loadIndex] = value;
    }

    for (
      var loadIndex = localLinear;
      loadIndex < ${p}u;
      loadIndex += ${u}u
    ) {
      let tileK = loadIndex / ${J*4}u;
      let outputRemainder = loadIndex % ${J*4}u;
      let tileOutputBlock = outputRemainder / 4u;
      let outputLane = outputRemainder % 4u;
      let loadedOutputBlock =
        workgroupId.y * ${J}u + tileOutputBlock;
      let kIndex = kBase + tileK;
      var value = ${o}(0.0);
      if (loadedOutputBlock < ${n}u && kIndex < totalK) {
        let inputBlock = kIndex % ${a}u;
        let kernelIndex = kIndex / ${a}u;
        let kernelY = kernelIndex / 3u;
        let kernelX = kernelIndex % 3u;
        let weightIndex =
          ((((loadedOutputBlock * 3u + kernelY) * 3u + kernelX) *
            ${a}u + inputBlock) * 4u + outputLane);
        value = weights[weightIndex];
      }
      weightTile[loadIndex] = value;
    }

    workgroupBarrier();
    ${Gi(i)}
    workgroupBarrier();
  }

  if (outputBlock < ${n}u) {
    for (var row = 0u; row < ${z}u; row++) {
      let spatialIndex = spatialBase + row;
      if (spatialIndex < spatialCount) {
        let outputIndex = spatialIndex * ${n}u + outputBlock;
        outputData[outputIndex] = ${s};
      }
    }
  }
}
`}function Bn(i,t,e,r,n){let o=G(i),a=e[0]+e[1],s=(l,p)=>{let c=l===r;return`
      {
        let sourceX = ${c?"u32(inputX) / 2u":"u32(inputX)"};
        let sourceY = ${c?"u32(inputY) / 2u":"u32(inputY)"};
        let sourcePixelBase = (sourceY * params.source${l}Width + sourceX) * ${e[l]}u;
        for (var sourceBlock = 0u; sourceBlock < ${e[l]}u; sourceBlock++) {
          let inputBlock = ${p}u + sourceBlock;
          ${Qt(`input${l}[sourcePixelBase + sourceBlock]`,`((((gid.z * 3u + ky) * 3u + kx) * ${a}u + inputBlock) * 4u)`,i)}
        }
      }
`},u=at(_t("acc",t),i);return`${ot(i)}
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
@group(0) @binding(0) var<storage, read> input0: array<${o}>;
@group(0) @binding(1) var<storage, read> input1: array<${o}>;
@group(0) @binding(2) var<storage, read> weights: array<${o}>;
@group(0) @binding(3) var<storage, read> bias: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> outputData: array<${o}>;
@group(0) @binding(5) var<uniform> params: Params;

@compute @workgroup_size(${W}, ${W}, 1)
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
      ${s(0,0)}
      ${s(1,e[0])}
    }
  }
  let outputIndex = (gid.y * params.outputWidth + gid.x) * ${n}u + gid.z;
  outputData[outputIndex] = ${u};
}
`}function kn(i,t,e,r,n){let o=G(i),a=e[0]+e[1],s=Q*Q*a,u=k*k,l=at(_t("acc",t),i),p=(c,f)=>`
      let sourceBlock = ${f};
      let sourceIndex =
        (${c===r?"u32(inputY) / 2u":"u32(inputY)"} * params.source${c}Width + ${c===r?"u32(inputX) / 2u":"u32(inputX)"}) *
        ${e[c]}u + sourceBlock;
      value = input${c}[sourceIndex];`;return`${ot(i)}
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
@group(0) @binding(0) var<storage, read> input0: array<${o}>;
@group(0) @binding(1) var<storage, read> input1: array<${o}>;
@group(0) @binding(2) var<storage, read> weights: array<${o}>;
@group(0) @binding(3) var<storage, read> bias: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> outputData: array<${o}>;
@group(0) @binding(5) var<uniform> params: Params;

var<workgroup> inputPatch: array<${o}, ${s}>;

@compute @workgroup_size(${k}, ${k}, 1)
fn main(
  @builtin(local_invocation_id) localId: vec3<u32>,
  @builtin(workgroup_id) workgroupId: vec3<u32>
) {
  let localLinear =
    localId.y * ${k}u + localId.x;
  for (
    var loadIndex = localLinear;
    loadIndex < ${s}u;
    loadIndex += ${u}u
  ) {
    let patchPixel = loadIndex / ${a}u;
    let inputBlock = loadIndex % ${a}u;
    let patchX = patchPixel % ${Q}u;
    let patchY = patchPixel / ${Q}u;
    let inputX =
      i32(workgroupId.x * ${k}u + patchX) - 1;
    let inputY =
      i32(workgroupId.y * ${k}u + patchY) - 1;
    var value = ${o}(0.0);
    if (
      inputX >= 0 && inputX < i32(params.outputWidth) &&
      inputY >= 0 && inputY < i32(params.outputHeight)
    ) {
      if (inputBlock < ${e[0]}u) {
        ${p(0,"inputBlock")}
      } else {
        ${p(1,`inputBlock - ${e[0]}u`)}
      }
    }
    inputPatch[loadIndex] = value;
  }
  workgroupBarrier();

  let outputX =
    workgroupId.x * ${k}u + localId.x;
  let outputY =
    workgroupId.y * ${k}u + localId.y;
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
        ((localId.y + ky) * ${Q}u + localId.x + kx) *
        ${a}u;
      for (var inputBlock = 0u; inputBlock < ${a}u; inputBlock++) {
        ${Qt("inputPatch[patchBase + inputBlock]",`((((outputBlock * 3u + ky) * 3u + kx) * ${a}u + inputBlock) * 4u)`,i)}
      }
    }
  }
  let outputIndex =
    (outputY * params.outputWidth + outputX) * ${n}u + outputBlock;
  outputData[outputIndex] = ${l};
}
`}function zi(i,t){let e=G(i),r=Array.from({length:t},(s,u)=>`@group(0) @binding(${u}) var<storage, read> input${u}: array<vec4<f32>>;`).join(`
`),n=Array.from({length:t},(s,u)=>{let l=u*3;return`if (channel < ${l+3}u) { return input${u}[pixel][channel - ${l}u]; }`}).join(`
  `),o=t,a=t+1;return`${ot(i)}
struct Params {
  width: u32,
  height: u32,
  outputBlocks: u32,
  inputChannels: u32,
}
${r}
@group(0) @binding(${o}) var<storage, read_write> outputData: array<${e}>;
@group(0) @binding(${a}) var<uniform> params: Params;

fn readChannel(pixel: u32, channel: u32) -> f32 {
  ${n}
  return 0.0;
}

@compute @workgroup_size(${W}, ${W}, 1)
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
  outputData[pixel * params.outputBlocks + gid.z] = ${at("value",i)};
}
`}function An(i){return i.op==="concat"?i.inputs:i.op==="fusedUpsampleConcatConv2d"?i.inputs.map(t=>t.value):[i.input]}function Fi(i,t="auto"){let e=i.features.has("shader-f16");if(t==="fp16"&&!e)throw new Error("OIDN FP16 was requested but the GPUDevice does not have shader-f16 enabled");return t==="auto"?e?"fp16":"fp32":t}var Zt=class{_device;precision;kernelSetting;maxSpatialInputBlocks;subgroupsAvailable;_model;_packedConvs=new Map;_pipelineCache;_pipelinePromises;_executionCache=new Map;_retiredExecutions=new Set;_clock=0;_shapeCacheSize;_profileNextExecution=!1;_lastExecutionProfile;_profileOperations=0;_resources=new Dt;_disposed=!1;constructor(t,e,r={}){this._device=t;let n=gn(t);if(this._pipelineCache=n.ready,this._pipelinePromises=n.pending,this.precision=Fi(t,r.precision??"auto"),this.kernelSetting=r.kernel??"auto",this.subgroupsAvailable=t.features.has("subgroups"),this.maxSpatialInputBlocks=this.precision==="fp16"&&t.limits.maxComputeInvocationsPerWorkgroup>=k*k&&t.limits.maxComputeWorkgroupSizeX>=k&&t.limits.maxComputeWorkgroupSizeY>=k?Math.floor(t.limits.maxComputeWorkgroupStorageSize/(Q*Q*4*2)):0,this._shapeCacheSize=Math.max(1,r.shapeCacheSize??2),e.inputChannels%3!==0||e.inputChannels<3||e.inputChannels>9)throw new Error(`Native OIDN expects 3, 6, or 9 input channels, got ${e.inputChannels}`);this._model={spec:e.spec,inputChannels:e.inputChannels,outputChannels:e.outputChannels,channelsByValue:new Map(e.channelsByValue),convChannels:new Map(e.convChannels)};for(let o of qt(this._model,{fuseConvPool:!1}).nodes)if(o.op!=="conv2d"&&o.op!=="maxPool2d"&&o.op!=="fusedConvReluMaxPool2d"&&o.op!=="fusedUpsampleConcatConv2d")throw new Error(`Native OIDN descriptor ${e.spec.id} leaves unsupported ${o.op} node ${o.id} after graph optimization`);try{for(let[o,a]of e.convTensors){let s=mn(t,o,a,this.precision);this._resources.track("gpu-buffer",s.weights),this._resources.track("gpu-buffer",s.bias),this._packedConvs.set(o,s)}}catch(o){for(let a of this._packedConvs.values())this._releaseBuffer(a.weights),this._releaseBuffer(a.bias);throw this._packedConvs.clear(),o}}_pipeline(t,e){let r=this._pipelineCache.get(t);return r||(r=this._device.createComputePipeline({label:`oidn/${t}`,layout:"auto",compute:{module:this._device.createShaderModule({label:`oidn/${t}`,code:e}),entryPoint:"main"}}),this._pipelineCache.set(t,r)),r}_pipelineAsync(t,e){let r=this._pipelineCache.get(t);if(r)return Promise.resolve(r);let n=this._pipelinePromises.get(t);if(n)return n;let o=this._device.createComputePipelineAsync({label:`oidn/${t}`,layout:"auto",compute:{module:this._device.createShaderModule({label:`oidn/${t}`,code:e}),entryPoint:"main"}}).then(a=>(this._pipelineCache.set(t,a),this._pipelinePromises.delete(t),a),a=>{throw this._pipelinePromises.delete(t),a});return this._pipelinePromises.set(t,o),o}_nodePipelineSpec(t,e){if(t.op==="conv2d"){let r=e?"fp32":this.precision,n=E(this._model.convChannels.get(t.id).inputChannels),o=E(this._model.convChannels.get(t.id).outputChannels),a=this._selectConvKernel(n,e);return{key:`conv-${a}/${this.precision}/${r}/${t.activation}/in${n}/out${o}`,kernel:a,code:a==="implicit-gemm"?Tn(this.precision,r,t.activation,n,o):a==="spatial"?bn(this.precision,r,t.activation,n,o):a==="subgroup"?wn(this.precision,r,t.activation,n,o):vn(this.precision,r,t.activation,n,o)}}if(t.op==="maxPool2d"){let r=E(this._model.channelsByValue.get(t.id));return{key:`max-pool/${this.precision}/out${r}`,kernel:"direct",code:$n(this.precision,r)}}if(t.op==="fusedConvReluMaxPool2d"){let r=E(this._model.convChannels.get(t.conv.id).inputChannels),n=E(this._model.convChannels.get(t.conv.id).outputChannels);return{key:`conv-pool/${this.precision}/${t.conv.activation}/in${r}/out${n}`,kernel:"direct",code:In(this.precision,t.conv.activation,r,n)}}if(t.op==="fusedUpsampleConcatConv2d"){if(t.inputs.length!==2)throw new Error(`Native fused decoder ${t.id} requires two inputs`);let r=t.inputs.map(p=>E(this._model.channelsByValue.get(p.value))),n=t.inputs.findIndex(p=>p.upsample);if(n!==0&&n!==1)throw new Error(`Native fused decoder ${t.id} has no upsample input`);let o=r[0]+r[1],a=this._selectConvKernel(o,!1),s=a==="subgroup"?"direct":a,u=E(this._model.convChannels.get(t.conv.id).outputChannels);return{key:`decoder-${s}/${this.precision}/${t.conv.activation}/${r.join("+")}/out${u}/up${n}`,kernel:s,code:s==="implicit-gemm"?Pn(this.precision,t.conv.activation,r,n,u):s==="spatial"?kn(this.precision,t.conv.activation,r,n,u):Bn(this.precision,t.conv.activation,r,n,u)}}throw new Error(`Native OIDN does not implement unfused ${t.op} node ${t.id}`)}_selectConvKernel(t,e){let r=this.precision==="fp16"&&t<=this.maxSpatialInputBlocks;return this.kernelSetting==="direct"?"direct":this.kernelSetting==="spatial"?r?"spatial":"direct":this.kernelSetting==="implicit-gemm"?e?"direct":"implicit-gemm":this.kernelSetting==="subgroup"?this.subgroupsAvailable?"subgroup":"direct":this.precision==="fp32"&&!e?"implicit-gemm":"direct"}_nodePipeline(t,e){let{key:r,code:n}=this._nodePipelineSpec(t,e);return this._pipeline(r,n)}async prepare(){if(this._disposed)throw new Error("Native OIDN executor is disposed");let t=qt(this._model,{fuseConvPool:!1}),e=this._model.inputChannels/3,r=[{key:`pack/${this.precision}/${e}`,code:zi(this.precision,e)},...t.nodes.map(n=>this._nodePipelineSpec(n,n.id===t.spec.output))];await Promise.all(r.map(({key:n,code:o})=>this._pipelineAsync(n,o)))}_createExecution(t,e){let r=pr(this._model,t,e,{fuseConvPool:!1}),n=new Map,o=[],a=new Map;r.nodes.forEach((l,p)=>{for(let c of An(l))a.set(c,p)}),a.set(r.spec.output,r.nodes.length);let s=[],u=l=>(s.push(l),this._resources.track("gpu-buffer",l));try{let l=(y,v,S,D)=>{for(let O of o)O.activeValue&&(a.get(O.activeValue)??-1)<D&&(O.activeValue=void 0);let V=_n(v,S),R=o.filter(O=>!O.activeValue&&O.capacity>=V).sort((O,F)=>O.capacity-F.capacity)[0];R||(R={buffer:u(this._device.createBuffer({label:`oidn/activation/${t}x${e}/${o.length}`,size:fr(V,4),usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST})),capacity:V},o.push(R)),R.activeValue=y,n.set(y,R.buffer)};l(r.spec.input,r.inputShape,this.precision==="fp16"?2:4,-1),r.plannedNodes.forEach(({node:y,outputShape:v},S)=>{let D=y.id===r.spec.output;l(y.id,v,D||this.precision==="fp32"?4:2,S)});let p=this._model.inputChannels/3,c=`pack/${this.precision}/${p}`,f=this._pipeline(c,zi(this.precision,p)),d=[],h=[],g=[],_=[];r.plannedNodes.forEach(({node:y,outputShape:v},S)=>{let D=y.id===r.spec.output,V=this._nodePipelineSpec(y,D),R=this._pipeline(V.key,V.code);d.push(R),h.push(V.kernel??"direct");let O=n.get(y.id),F,$,A;if(y.op==="conv2d"){let N=r.valueShapes.get(y.input);A=y.id,$=[N.width,N.height,v.width,v.height,E(N.channels),E(v.channels)];let C=this._packedConvs.get(A);F=[{binding:0,resource:{buffer:n.get(y.input)}},{binding:1,resource:{buffer:C.weights}},{binding:2,resource:{buffer:C.bias}},{binding:3,resource:{buffer:O}}]}else if(y.op==="maxPool2d"){let N=r.valueShapes.get(y.input);$=[N.width,N.height,v.width,v.height,E(v.channels)],F=[{binding:0,resource:{buffer:n.get(y.input)}},{binding:1,resource:{buffer:O}}]}else if(y.op==="fusedConvReluMaxPool2d"){let N=r.valueShapes.get(y.input);A=y.conv.id,$=[N.width,N.height,v.width,v.height,E(N.channels),E(v.channels)];let C=this._packedConvs.get(A);F=[{binding:0,resource:{buffer:n.get(y.input)}},{binding:1,resource:{buffer:C.weights}},{binding:2,resource:{buffer:C.bias}},{binding:3,resource:{buffer:O}}]}else if(y.op==="fusedUpsampleConcatConv2d"){A=y.conv.id;let N=r.valueShapes.get(y.inputs[0].value),C=r.valueShapes.get(y.inputs[1].value);$=[v.width,v.height,E(v.channels),E(this._model.convChannels.get(A).inputChannels),N.width,N.height,C.width,C.height];let L=this._packedConvs.get(A);F=[{binding:0,resource:{buffer:n.get(y.inputs[0].value)}},{binding:1,resource:{buffer:n.get(y.inputs[1].value)}},{binding:2,resource:{buffer:L.weights}},{binding:3,resource:{buffer:L.bias}},{binding:4,resource:{buffer:O}}]}else throw new Error(`Unexpected native node ${y.op}`);let st=u(Li(this._device,`oidn/${y.id}/params/${t}x${e}`,$));_.push(st),F.push({binding:F.length,resource:{buffer:st}}),g.push(this._device.createBindGroup({label:`oidn/${y.id}/bindings`,layout:R.getBindGroupLayout(0),entries:F}))});let w=u(Li(this._device,`oidn/input/params/${t}x${e}`,[t,e,E(this._model.inputChannels),this._model.inputChannels]));return _.push(w),{plan:r,valueBuffers:n,slots:o,nodeBindings:g,nodePipelines:d,nodeKernels:h,inputPipeline:f,inputUniform:w,ownedBuffers:_,lastUsed:++this._clock}}catch(l){for(let p of s)this._releaseBuffer(p);throw l}}_execution(t,e){if(this._disposed)throw new Error("Native OIDN executor is disposed");let r=`${t}x${e}`,n=this._executionCache.get(r);if(!n&&(n=this._createExecution(t,e),this._executionCache.set(r,n),this._executionCache.size>this._shapeCacheSize)){let o=[...this._executionCache.entries()].filter(([a])=>a!==r).sort((a,s)=>a[1].lastUsed-s[1].lastUsed)[0];o&&(this._executionCache.delete(o[0]),this._retiredExecutions.add(o[1]),this._device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>{this._retiredExecutions.delete(o[1]),this._destroyExecution(o[1])}))}return n.lastUsed=++this._clock,n}profileNextExecution(){return this._device.features.has("timestamp-query")?(this._profileNextExecution=!0,!0):!1}getLastExecutionProfile(){return this._lastExecutionProfile}execute(t,e,r){let n=this._model.inputChannels/3;if(t.length!==n)throw new Error(`Native OIDN expected ${n} input buffers, got ${t.length}`);let o=this._execution(e,r),a=["input-pack",...o.plan.nodes.map(h=>h.id)],s=this._profileNextExecution&&this._device.features.has("timestamp-query");this._profileNextExecution=!1;let u=a.length*2,l=s?this._resources.track("gpu-query-set",this._device.createQuerySet({type:"timestamp",count:u})):void 0,p=u*8,c,f;try{c=s?this._resources.track("gpu-buffer",this._device.createBuffer({label:`oidn/profile/resolve/${e}x${r}`,size:p,usage:GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC})):void 0,f=s?this._resources.track("gpu-buffer",this._device.createBuffer({label:`oidn/profile/readback/${e}x${r}`,size:p,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ})):void 0}catch(h){throw this._releaseBuffer(f),this._releaseBuffer(c),this._releaseQuerySet(l),h}let d=(h,g)=>({label:h,...l?{timestampWrites:{querySet:l,beginningOfPassWriteIndex:g*2,endOfPassWriteIndex:g*2+1}}:{}});try{let h=this._device.createCommandEncoder({label:`oidn/native/${e}x${r}`}),g=t.map((w,y)=>({binding:y,resource:{buffer:w}}));g.push({binding:n,resource:{buffer:o.valueBuffers.get(o.plan.spec.input)}}),g.push({binding:n+1,resource:{buffer:o.inputUniform}});let _=this._device.createBindGroup({label:"oidn/input/bindings",layout:o.inputPipeline.getBindGroupLayout(0),entries:g});{let w=h.beginComputePass(d("oidn/input-pack",0));w.setPipeline(o.inputPipeline),w.setBindGroup(0,_),w.dispatchWorkgroups(Math.ceil(e/W),Math.ceil(r/W),E(this._model.inputChannels)),w.end()}o.plan.plannedNodes.forEach(({node:w,outputShape:y},v)=>{let S=h.beginComputePass(d(`oidn/${o.plan.nodes[v].id}`,v+1));S.setPipeline(o.nodePipelines[v]),S.setBindGroup(0,o.nodeBindings[v]),o.nodeKernels[v]==="implicit-gemm"?S.dispatchWorkgroups(Math.ceil(y.width*y.height/Tt),Math.ceil(E(y.channels)/J),1):S.dispatchWorkgroups(Math.ceil(y.width/W),Math.ceil(y.height/W),E(y.channels)),S.end()}),l&&(h.resolveQuerySet(l,0,u,c,0),h.copyBufferToBuffer(c,0,f,0,p)),this._device.queue.submit([h.finish()])}catch(h){throw this._releaseBuffer(f),this._releaseBuffer(c),this._releaseQuerySet(l),h}return l&&(this._profileOperations++,this._lastExecutionProfile=(async()=>{try{await f.mapAsync(GPUMapMode.READ);let h=new BigUint64Array(f.getMappedRange()),g=a.map((_,w)=>({id:_,durationMs:Number(h[w*2+1]-h[w*2])/1e6}));return{totalMs:g.reduce((_,w)=>_+w.durationMs,0),layers:g}}finally{f.mapState==="mapped"&&f.unmap(),this._releaseQuerySet(l),this._releaseBuffer(c),this._releaseBuffer(f),this._profileOperations--}})()),o.valueBuffers.get(o.plan.spec.output)}async executeCPU(t,e,r){let n=e*r*this._model.inputChannels;if(t.length!==n)throw new Error(`Native OIDN CPU input has ${t.length} values, expected ${n}`);let o=this._execution(e,r),a=this._model.inputChannels/3,s=e*r;o.cpuInputBuffers||(o.cpuInputBuffers=Array.from({length:a},(f,d)=>{let h=this._device.createBuffer({label:`oidn/cpu-input/${e}x${r}/${d}`,size:s*16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});return this._resources.track("gpu-buffer",h),o.ownedBuffers.push(h),h}),o.cpuReadbackBuffer=this._device.createBuffer({label:`oidn/cpu-readback/${e}x${r}`,size:s*16,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),this._resources.track("gpu-buffer",o.cpuReadbackBuffer),o.ownedBuffers.push(o.cpuReadbackBuffer));for(let f=0;f<a;f++){let d=new Float32Array(s*4);for(let h=0;h<s;h++){let g=h*this._model.inputChannels+f*3,_=h*4;d[_]=t[g],d[_+1]=t[g+1],d[_+2]=t[g+2]}this._device.queue.writeBuffer(o.cpuInputBuffers[f],0,d)}let u=this.execute(o.cpuInputBuffers,e,r),l=this._device.createCommandEncoder({label:`oidn/cpu-readback/${e}x${r}`});l.copyBufferToBuffer(u,0,o.cpuReadbackBuffer,0,s*16),this._device.queue.submit([l.finish()]),await o.cpuReadbackBuffer.mapAsync(GPUMapMode.READ);let p=new Float32Array(o.cpuReadbackBuffer.getMappedRange()),c=new Float32Array(s*3);for(let f=0;f<s;f++)c[f*3]=p[f*4],c[f*3+1]=p[f*4+1],c[f*3+2]=p[f*4+2];return o.cpuReadbackBuffer.unmap(),c}_releaseBuffer(t){this._resources.release("gpu-buffer",t,()=>t.destroy())}_releaseQuerySet(t){this._resources.release("gpu-query-set",t,()=>t.destroy())}_destroyExecution(t){t.slots.forEach(e=>this._releaseBuffer(e.buffer)),t.ownedBuffers.forEach(e=>this._releaseBuffer(e))}getResourceInfo(){return this._resources.snapshot(this._retiredExecutions.size+this._profileOperations)}dispose(){if(!this._disposed){this._disposed=!0;for(let t of this._packedConvs.values())this._releaseBuffer(t.weights),this._releaseBuffer(t.bias);this._packedConvs.clear();for(let t of this._executionCache.values())this._destroyExecution(t);this._executionCache.clear();for(let t of this._retiredExecutions)this._destroyExecution(t);this._retiredExecutions.clear()}}};var Yi=new WeakMap;function Cn(i,t){let e=Yi.get(i);e||(e=new Map,Yi.set(i,e));let r=e.get(t);if(!r){let n=i.createShaderModule({label:`oidn/webnn/input-pack/${t}`,code:On(t)}),o=i.createShaderModule({label:"oidn/webnn/output-unpack",code:Nn()});r={input:i.createComputePipeline({label:`oidn/webnn/input-pack/${t}`,layout:"auto",compute:{module:n,entryPoint:"main"}}),output:i.createComputePipeline({label:"oidn/webnn/output-unpack",layout:"auto",compute:{module:o,entryPoint:"main"}})},e.set(t,r)}return r}var yt=8;function Xi(i,t){return Math.ceil(i/t)*t}function Sn(i,t,e,r){let n=i.createBuffer({label:t,size:Xi(e.byteLength,4),usage:r,mappedAtCreation:!0});return new Uint8Array(n.getMappedRange()).set(new Uint8Array(e.buffer,e.byteOffset,e.byteLength)),n.unmap(),n}function Hi(i,t,e){let r=new Uint32Array(Xi(e.length,4));return r.set(e),Sn(i,t,r,GPUBufferUsage.UNIFORM)}function dr(i,t,e,r){return!!i?.[t]?.[e]?.dataTypes?.includes?.(r)}function En(i,t){if(t==="fp16"&&i.desc.dataType==="Float16")return new Uint8Array(i.data.buffer,i.data.byteOffset,i.data.byteLength);if(t==="fp32"&&i.desc.dataType==="Float32")return new Uint8Array(i.data.buffer,i.data.byteOffset,i.data.byteLength);let e=i.desc.dataType==="Float32"?new Float32Array(i.data.buffer,i.data.byteOffset,i.data.byteLength/4):new X(i.data.buffer,i.data.byteOffset,i.data.byteLength/2),r=t==="fp16"?new X(e):new Float32Array(e);return new Uint8Array(r.buffer,r.byteOffset,r.byteLength)}function On(i){let t=Array.from({length:i},(r,n)=>`@group(0) @binding(${n}) var<storage, read> input${n}: array<vec4<f32>>;`).join(`
`),e=Array.from({length:i},(r,n)=>{let o=n*3;return`if (channel < ${o+3}u) {
      return input${n}[pixel][channel - ${o}u];
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

@compute @workgroup_size(${yt}, ${yt}, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.width || gid.y >= params.height || gid.z >= params.channels) {
    return;
  }
  let pixel = gid.y * params.width + gid.x;
  let outputIndex = (gid.z * params.height + gid.y) * params.width + gid.x;
  outputData[outputIndex] = f16(readChannel(pixel, gid.z));
}
`}function Nn(){return`enable f16;
struct Params { width: u32, height: u32, padding0: u32, padding1: u32 }
@group(0) @binding(0) var<storage, read> inputData: array<f16>;
@group(0) @binding(1) var<storage, read_write> outputData: array<vec4<f32>>;
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(${yt}, ${yt}, 1)
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
`}function Un(i,t){if(t==="fp32")throw new Error("OIDN WebNN GPU interop currently requires FP16 exportable tensors");if(!i.features.has("shader-f16"))throw new Error("OIDN WebNN requires shader-f16 on the shared GPUDevice");return"fp16"}function Mn(i,t,e){return e==="relu"?i.relu(t):t}var te=class{_device;_model;precision;support;_context;_builderConstructor;_shapeCache=new Map;_shapePromises=new Map;_retiredExecutions=new Set;_pendingCreationCount=0;_shapeCacheSize;_clock=0;_inputPipeline;_outputPipeline;_resources=new Dt;_disposed=!1;constructor(t,e,r={}){this._device=t,this._model=e,this.precision=Un(t,r.precision??"auto"),this._shapeCacheSize=Math.max(1,r.shapeCacheSize??2),this.support={available:!1,fp16Conv:!1,gpuInterop:!1};let n=Cn(t,e.inputChannels/3);this._inputPipeline=n.input,this._outputPipeline=n.output}async prepare(){if(this._disposed)throw new Error("OIDN WebNN executor is disposed");let t=globalThis.navigator?.ml,e=globalThis.MLGraphBuilder;if(!t?.createContext||typeof e!="function")throw this.support.reason="WebNN is not exposed by this browser",new Error(this.support.reason);this._builderConstructor=e;try{try{this._context=await t.createContext({deviceType:"gpu",powerPreference:"high-performance"})}catch{this._context=await t.createContext({deviceType:"gpu"})}if(this._resources.track("ml-context",this._context),this._disposed)throw new Error("OIDN WebNN executor is disposed");if(typeof this._context.createExportableTensor!="function"||typeof this._context.exportToGPU!="function")throw this.support.reason="WebNN WebGPU tensor interop is unavailable",new Error(this.support.reason);let r=this._context.opSupportLimits?.()??{};if(this.support.fp16Conv=dr(r,"conv2d","input","float16")&&dr(r,"conv2d","filter","float16")&&dr(r,"conv2d","output","float16"),!this.support.fp16Conv)throw this.support.reason="WebNN does not support FP16 conv2d",new Error(this.support.reason);let n,o;try{n=this._resources.track("ml-tensor",await this._context.createExportableTensor({dataType:"float16",shape:[4]},this._device)),o=this._resources.track("gpu-buffer",await this._context.exportToGPU(n)),this.support.gpuInterop=!0}catch(a){throw this.support.reason=`WebNN FP16 WebGPU interop failed: ${String(a)}`,new Error(this.support.reason)}finally{this._releaseBuffer(o),this._releaseTensor(n)}this.support.available=!0}catch(r){throw this._releaseContext(),r}}_constant(t,e){return t.constant({dataType:"float16",shape:[...e.desc.dims]},En(e,this.precision))}async _createExecution(t,e){if(this._disposed)throw new Error("OIDN WebNN executor is disposed");let r=new this._builderConstructor(this._context),n=new Map,o=new Map;n.set(this._model.spec.input,r.input("input",{dataType:"float16",shape:[1,this._model.inputChannels,e,t]})),o.set(this._model.spec.input,[this._model.inputChannels,e,t]);for(let f of this._model.spec.nodes){let d,h;if(f.op==="conv2d"){let g=o.get(f.input),_=this._model.convTensors.get(f.id),w=r.conv2d(n.get(f.input),this._constant(r,_.weight),{bias:this._constant(r,_.bias),padding:[1,1,1,1],inputLayout:"nchw",filterLayout:"oihw"});d=Mn(r,w,f.activation),h=[_.outputChannels,g[1],g[2]]}else if(f.op==="maxPool2d"){let g=o.get(f.input);d=r.maxPool2d(n.get(f.input),{windowDimensions:[2,2],strides:[2,2],padding:[0,g[1]%2,0,g[2]%2],layout:"nchw"}),h=[g[0],Math.ceil(g[1]/2),Math.ceil(g[2]/2)]}else if(f.op==="upsample2d"){let g=o.get(f.input);d=r.resample2d(n.get(f.input),{mode:"nearest-neighbor",axes:[2,3],scales:[2,2]}),h=[g[0],g[1]*2,g[2]*2]}else{let g=f.inputs.map(_=>o.get(_));if(g.some(_=>_[1]!==g[0][1]||_[2]!==g[0][2]))throw new Error(`WebNN concat ${f.id} has mismatched spatial shapes`);d=r.concat(f.inputs.map(_=>n.get(_)),1),h=[g.reduce((_,w)=>_+w[0],0),g[0][1],g[0][2]]}n.set(f.id,d),o.set(f.id,h)}let a,s,u,l,p,c;try{return a=this._resources.track("ml-graph",await r.build({output:n.get(this._model.spec.output)})),s=this._resources.track("ml-tensor",await this._context.createExportableTensor({dataType:"float16",shape:[1,this._model.inputChannels,e,t],writable:!0},this._device)),u=this._resources.track("ml-tensor",await this._context.createExportableTensor({dataType:"float16",shape:[1,this._model.outputChannels,e,t],readable:!0},this._device)),l=this._resources.track("gpu-buffer",this._device.createBuffer({label:`oidn/webnn/output/${t}x${e}`,size:t*e*4*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST})),p=this._resources.track("gpu-buffer",Hi(this._device,`oidn/webnn/input/${t}x${e}`,[t,e,this._model.inputChannels])),c=this._resources.track("gpu-buffer",Hi(this._device,`oidn/webnn/output/${t}x${e}`,[t,e])),{graph:a,inputTensor:s,outputTensor:u,outputBuffer:l,inputUniform:p,outputUniform:c,width:t,height:e,lastUsed:++this._clock}}catch(f){throw this._releaseBuffer(c),this._releaseBuffer(p),this._releaseBuffer(l),this._releaseTensor(u),this._releaseTensor(s),this._releaseGraph(a),f}}async _execution(t,e){let r=`${t}x${e}`,n=this._shapeCache.get(r);if(!n){let o=this._shapePromises.get(r);o||(o=(async()=>{this._pendingCreationCount++;try{return await this._createExecution(t,e)}finally{this._pendingCreationCount--}})(),this._shapePromises.set(r,o));try{if(n=await o,this._disposed)throw this._destroyExecution(n),new Error("OIDN WebNN executor is disposed");this._shapeCache.set(r,n)}finally{this._shapePromises.get(r)===o&&this._shapePromises.delete(r)}if(this._shapeCache.size>this._shapeCacheSize){let a=[...this._shapeCache.entries()].filter(([s])=>s!==r).sort((s,u)=>s[1].lastUsed-u[1].lastUsed)[0];a&&(this._shapeCache.delete(a[0]),this._retireExecution(a[1]))}}return n.lastUsed=++this._clock,n}async prewarm(t){for(let e of t)await this._execution(e.width,e.height)}async execute(t,e,r){let n=this._model.inputChannels/3;if(t.length!==n)throw new Error(`OIDN WebNN expected ${n} input buffers, got ${t.length}`);let o=await this._execution(e,r),a=this._resources.track("gpu-buffer",await this._context.exportToGPU(o.inputTensor));try{let u=t.map((f,d)=>({binding:d,resource:{buffer:f}}));u.push({binding:n,resource:{buffer:a}}),u.push({binding:n+1,resource:{buffer:o.inputUniform}});let l=this._device.createBindGroup({label:"oidn/webnn/input-bindings",layout:this._inputPipeline.getBindGroupLayout(0),entries:u}),p=this._device.createCommandEncoder({label:"oidn/webnn/input-pack"}),c=p.beginComputePass();c.setPipeline(this._inputPipeline),c.setBindGroup(0,l),c.dispatchWorkgroups(Math.ceil(e/yt),Math.ceil(r/yt),this._model.inputChannels),c.end(),this._device.queue.submit([p.finish()])}finally{this._releaseBuffer(a)}this._context.dispatch(o.graph,{input:o.inputTensor},{output:o.outputTensor});let s=this._resources.track("gpu-buffer",await this._context.exportToGPU(o.outputTensor));try{let u=this._device.createBindGroup({label:"oidn/webnn/output-bindings",layout:this._outputPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:s}},{binding:1,resource:{buffer:o.outputBuffer}},{binding:2,resource:{buffer:o.outputUniform}}]}),l=this._device.createCommandEncoder({label:"oidn/webnn/output-unpack"}),p=l.beginComputePass();p.setPipeline(this._outputPipeline),p.setBindGroup(0,u),p.dispatchWorkgroups(Math.ceil(e/yt),Math.ceil(r/yt)),p.end(),this._device.queue.submit([l.finish()])}finally{this._releaseBuffer(s)}return o.outputBuffer}async executeCPU(t,e,r){let n=await this._execution(e,r),o=e*r,a=new X(o*this._model.inputChannels);for(let l=0;l<o;l++)for(let p=0;p<this._model.inputChannels;p++)a[p*o+l]=t[l*this._model.inputChannels+p];this._context.writeTensor(n.inputTensor,a),this._context.dispatch(n.graph,{input:n.inputTensor},{output:n.outputTensor});let s=new X(await this._context.readTensor(n.outputTensor)),u=new Float32Array(o*this._model.outputChannels);for(let l=0;l<o;l++)for(let p=0;p<this._model.outputChannels;p++)u[l*this._model.outputChannels+p]=s[p*o+l];return u}_destroyExecution(t){this._releaseGraph(t.graph),this._releaseTensor(t.inputTensor),this._releaseTensor(t.outputTensor),this._releaseBuffer(t.outputBuffer),this._releaseBuffer(t.inputUniform),this._releaseBuffer(t.outputUniform)}_retireExecution(t){this._retiredExecutions.add(t),this._device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>{this._retiredExecutions.delete(t),this._destroyExecution(t)})}_releaseBuffer(t){this._resources.release("gpu-buffer",t,()=>t.destroy())}_releaseTensor(t){this._resources.release("ml-tensor",t,()=>t.destroy())}_releaseGraph(t){this._resources.release("ml-graph",t,()=>t.destroy?.())}_releaseContext(){this._resources.release("ml-context",this._context,()=>this._context.destroy?.())}getResourceInfo(){return this._resources.snapshot(this._pendingCreationCount+this._retiredExecutions.size)}dispose(){if(!this._disposed){this._disposed=!0;for(let t of this._shapeCache.values())this._destroyExecution(t);this._shapeCache.clear();for(let t of this._retiredExecutions)this._destroyExecution(t);this._retiredExecutions.clear(),this._shapePromises.clear(),this._releaseContext()}}};function Ki(i,t){return Math.ceil(i/t)*t}function Te(i){return i.data instanceof GPUBuffer||i.data instanceof GPUTexture}var hr=class{_device;_tileWidth=0;_tileHeight=0;_tileOverlapX=0;_tileOverlapY=0;_aux;_hdr;_dataProcessGPU;_nativeExecutor;_webNNExecutor;_modelSpec;_inputChannels;_engine;_dynamicTileController;_lastExecution;constructor(t,e,r={}){this._aux=r.aux||!1,this._hdr=r.hdr||!1,this._engine=r.engine??"auto";let n=r.modelSpec??ne(t),o=Re(t,n);this._modelSpec=o.spec,this._inputChannels=o.inputChannels;let a=this._aux?9:3;if(o.inputChannels!==a)throw new Error(`OIDN model expects ${o.inputChannels} input channels, but aux=${this._aux} provides ${a}`);this._dynamicTileController=new ie(r.maxTileSize??512,r.dynamicTile),this._device=e.device,this._engine==="webnn"?this._webNNExecutor=new te(this._device,o,{precision:r.precision}):this._nativeExecutor=new Zt(this._device,o,{precision:r.precision,kernel:r.kernel})}getDevice(){return this._device}async prepare(){if(this._webNNExecutor){await this._webNNExecutor.prepare();let t=Ki(this._modelSpec.receptiveField/2,16),e=[this._dynamicTileController.tileSize,this._dynamicTileController.minTileSize];await this._webNNExecutor.prewarm([...new Set(e)].map(r=>({width:r+2*t,height:r+2*t})));return}await this._nativeExecutor.prepare()}getRuntimeInfo(){return{configuredEngine:this._engine,gpuEngine:this._webNNExecutor?"webnn":"wgsl",precision:(this._webNNExecutor??this._nativeExecutor).precision,kernel:this._nativeExecutor?{configured:this._nativeExecutor.kernelSetting,maxSpatialInputBlocks:this._nativeExecutor.maxSpatialInputBlocks,subgroupsAvailable:this._nativeExecutor.subgroupsAvailable}:void 0,webnn:this._webNNExecutor?.support,resources:(this._webNNExecutor??this._nativeExecutor).getResourceInfo(),model:this._modelSpec.id,modelFamily:this._modelSpec.family,inputChannels:this._inputChannels,dynamicTile:{enabled:this._dynamicTileController.enabled,currentTileSize:this._dynamicTileController.tileSize,minTileSize:this._dynamicTileController.minTileSize,maxTileSize:this._dynamicTileController.maxTileSize,targetTileTimeMs:this._dynamicTileController.targetTileTimeMs},lastExecution:this._lastExecution}}profileNextExecution(){return this._nativeExecutor?.profileNextExecution()??!1}getLastExecutionProfile(){return this._nativeExecutor?.getLastExecutionProfile()}_updateModel(t,e){let r=this._dynamicTileController.tileSize,n=De(t,r),o=De(e,r),a=Ki(this._modelSpec.receptiveField/2,16),s=a,u=a;t<=r&&(s=0),e<=r&&(u=0);let l=Math.max(n,o),p=Math.max(s,u);n=l,o=l,s=p,u=p,(n!==this._tileWidth||o!==this._tileHeight||s!==this._tileOverlapX||u!==this._tileOverlapY)&&(this._tileWidth=n,this._tileHeight=o,this._tileOverlapX=s,this._tileOverlapY=u)}_getTileSizeWithOverlap(){return{width:this._tileWidth+2*this._tileOverlapX,height:this._tileHeight+2*this._tileOverlapY}}_processImageData(t,e,r,n){let o=t.data,a=o.length/4,s=this._aux?9:3,u=new Float32Array(a*s);if(e&&!r||r&&!e)throw new Error("Normal map and albedo map are both required");if(e&&r&&(e.width!==r.width||e.height!==r.height||t.width!==e.width||t.height!==e.height))throw new Error("Image size mismatch");let l=e?.data,p=r?.data;for(let c=0;c<o.length;c+=4){let f=c/4*s;for(let d=0;d<3;d++)n?u[f+d]=o[c+d]:u[f+d]=o[c+d]/255,l&&(u[f+d+3]=l[c+d]/255),p&&(u[f+d+6]=p[c+d]/255)}return u}_readTile(t,e,r,n){let o=new Float32Array(r.width*r.height*e);for(let a=0;a<r.height;a++)for(let s=0;s<r.width;s++){let u=((a+r.y)*n+(s+r.x))*e,l=(a*r.width+s)*e;for(let p=0;p<e;p++)o[l+p]=t[u+p]}return o}_writeTile(t,e,r,n,o,a){let{data:s,width:u}=t,l=r.x-e.x,p=r.y-e.y;for(let c=0;c<r.height;c++)for(let f=0;f<r.width;f++){let d=((c+p)*o+f+l)*3,h=((c+r.y)*u+(f+r.x))*4;for(let g=0;g<3;g++)a?s[h+g]=n[d+g]:s[h+g]=Math.min(Math.max(n[d+g]*255,0),255);t.data[h+3]=a?1:255}}async _executeTile(t,e,r,n,o,a,s,u,l){let p=this._aux?9:3,c=this._tileOverlapX,f=this._tileOverlapY,d=this._getTileSizeWithOverlap(),h={width:this._tileWidth,height:this._tileHeight},g=n>0?n*h.width-c:0,_=Math.min(g+d.width,a);g=Math.max(_-d.width,0);let w=o>0?o*h.height-f:0,y=Math.min(w+d.height,s);w=Math.max(y-d.height,0);let v=d.width,S=d.height,D=new $t(g,w,v,S),V,R,O=1,F=this._device,$=this._dataProcessGPU;if(t instanceof Float32Array){let L=this._readTile(t,p,D,a);u&&(O=Pr({data:L,channels:p}),L=Br({data:L,channels:p,inputScale:O})),R=await(this._webNNExecutor??this._nativeExecutor).executeCPU(L,v,S)}else{$||($=this._dataProcessGPU=new re(F,u)),$.setImageSize(a,s),$.setInputTile(D),n===0&&o===0&&$.copyInputDataToOutput(t.color);let{color:L,albedo:pt,normal:K}=$.forward(t.color,this._aux?t.albedo:void 0,this._aux?t.normal:void 0,l);V=await(this._webNNExecutor??this._nativeExecutor).execute(this._aux?[L,pt,K]:[L],v,S)}let A,st=Math.min(h.width,a),N=Math.min(h.height,s),C=new $t(n*st,o*N,st,N);if(C.width=Math.min(C.width,a-C.x),C.height=Math.min(C.height,s-C.y),t instanceof Float32Array){u&&(R=kr({data:R,channels:3,inputScale:O})),this._writeTile(r,D,C,R,d.width,u);for(let L=0;L<N;L++)for(let pt=0;pt<st;pt++){let K=(L*st+pt)*4,Rt=((L+C.y)*a+(pt+C.x))*4;for(let It=0;It<4;It++)e.data[K+It]=r.data[Rt+It]}}else $.setOutputTile(C,D),A=$.inverse(V,t.color);return A}tileExecute({color:t,albedo:e,normal:r,done:n,progress:o,denoiseAlpha:a}){if(this._aux&&(!e||!r))throw new Error("Normal map and albedo map are both required");if(!this._aux&&(e||r))throw new Error("Normal map and albedo map are not required");let s=t.width,u=t.height,l=this._dynamicTileController.tileSize,p=s>l||u>l;this._updateModel(s,u);let c=this._hdr||!1,f;Te(t)||(f=this._processImageData(t,e,r,c));let d=this._tileWidth,h=this._tileHeight,g=Math.ceil(u/h),_=Math.ceil(s/d);function w($,A){return c?{data:new Float32Array($*A*4),width:$,height:A}:new ImageData($,A)}let y=Te(t)?void 0:w(s,u),v=Te(t)?void 0:w(Math.min(d,s),Math.min(h,u)),S=!1,D=()=>typeof performance>"u"?Date.now():performance.now(),V=D(),R=[],O=$=>{typeof requestAnimationFrame>"u"?setTimeout($,0):requestAnimationFrame($)},F=async($,A)=>{if(S)return;let st=D(),N=await this._executeTile(Te(t)?{color:t.data,albedo:e?.data,normal:r?.data}:f,v,y,$,A,s,u,c,a);if(S)return;let C=y||{data:N,width:s,height:u};o?.(C,v,new $t($*d,A*h,d,h),$+A*_,_*g);let L=$+1<_||A+1<g,pt=()=>{if(R.push(D()-st),!S)if(L)O(()=>{S||($+1<_?F($+1,A):A+1<g&&F(0,A+1))});else{let K=[...R].sort((Ie,$e)=>Ie-$e),Rt=Math.floor(K.length/2),It=K.length%2?K[Rt]:(K[Rt-1]+K[Rt])/2;this._lastExecution={width:s,height:u,tileWidth:d,tileHeight:h,tileCount:_*g,durationMs:D()-V,tileTimeMs:{min:K[0],median:It,mean:K.reduce((Ie,$e)=>Ie+$e,0)/K.length,max:K[K.length-1]}},p&&this._dynamicTileController.observe(R),n(C)}};Ar(this._device.queue).then(pt)};return F(0,0),()=>{S=!0}}dispose(){this._dataProcessGPU?.dispose(),this._nativeExecutor?.dispose(),this._webNNExecutor?.dispose()}},ji=hr;async function qi(){if(!navigator.gpu)throw new Error("WebGPU is not available");let i={powerPreference:"high-performance"},t=await navigator.gpu.requestAdapter(i);if(!t)throw new Error("No WebGPU adapter is available");let e={},r=[];t.features.has("timestamp-query")&&r.push("timestamp-query"),t.features.has("bgra8unorm-storage")&&r.push("bgra8unorm-storage"),t.features.has("shader-f16")&&r.push("shader-f16"),e.requiredFeatures=r;let n=t.limits;e.requiredLimits={maxComputeWorkgroupStorageSize:n.maxComputeWorkgroupStorageSize,maxComputeWorkgroupsPerDimension:n.maxComputeWorkgroupsPerDimension,maxStorageBufferBindingSize:n.maxStorageBufferBindingSize,maxBufferSize:n.maxBufferSize,maxComputeWorkgroupSizeX:n.maxComputeWorkgroupSizeX,maxComputeInvocationsPerWorkgroup:n.maxComputeInvocationsPerWorkgroup};let o=await t.requestDevice(e),a=t.info??await t.requestAdapterInfo?.();return gr(o,a)}async function gr(i,t){return{device:i,adapterInfo:t}}async function Dn(i,t,e){let r=await(t?gr(t.device,t.adapterInfo):qi()),n=_r(i),o=new ji(n,r,e);return await o.prepare(),o}async function Lo(i,t,e){return fetch(i).then(r=>r.arrayBuffer()).then(r=>Dn(r,t,e))}export{Zt as NativeUNetExecutor,Or as OIDN_UNET_LARGE_SPEC,Er as OIDN_UNET_SMALL_SPEC,ji as UNet,te as WebNNUNetExecutor,ne as detectUNetModelSpec,Dn as initUNetFromBuffer,Lo as initUNetFromURL,qt as optimizeModelGraph,_r as parseTZA,pr as planModelExecution,Fi as resolveNativeUNetPrecision,Re as validateUNetModel};
