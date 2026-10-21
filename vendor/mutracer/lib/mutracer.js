import{A as SA,B as ma,a as oa,b as Ue,c as ae,d as y,e as mt,f as Dr,g as ie,h as wi,i as la,j as ca,k as ns,l as _i,m as z,n as Ge,o as St,p as PA,q as fa,r as ua,s as Y,u as da,v as IA,w as qt,x as rA,y as pa,z as DA}from"./chunk-AKAFBJ6M.js";import{b as Ll}from"./chunk-ZN47ZYZR.js";var Qi=Object.freeze({strength:1,searchRadius:5,patchRadius:1,albedoBandwidth:.4,normalBandwidth:.05,iterations:2}),nA={searchRadius:5,patchRadius:1,albedoBandwidth:.4,normalBandwidth:.05,iterations:2};function Sr(i={}){let e={...Qi};for(let a of Object.keys(e)){let r=i[a];r!==void 0&&(e[a]=r)}if(!Number.isFinite(e.strength)||e.strength<=0)throw new Error("strength must be finite and positive");for(let[a,r,n]of[["searchRadius",1,16],["patchRadius",0,3],["iterations",1,4]])if(!Number.isInteger(e[a])||e[a]<r||e[a]>n)throw new Error(`${a} must be an integer from ${r} to ${n}`);for(let a of["albedoBandwidth","normalBandwidth"])if(!Number.isFinite(e[a])||e[a]<1e-4||e[a]>10)throw new Error(`${a} must be finite and from 0.0001 to 10`);let{strength:t,...A}=e;return{type:"jnlm",strength:t,shape:A,dispose(){}}}function ga(i){return 2**i}var sA=class i extends mt{projection="perspective";fStop=0;focusDistance=10;sensorHeight=24;metersPerUnit=1;fov=45;near;far;aspect=void 0;left=-1;right=1;top=1;bottom=-1;zoom=1;constructor(e){super(),this.projection=e.projection,this.near=e.near??.1,this.far=e.far??2e3,e.projection==="perspective"?(this.fov=e.fov??45,this.aspect=e.aspect):(this.left=e.left??-1,this.right=e.right??1,this.bottom=e.bottom??-1,this.top=e.top??1)}copy(e){let t=this;return t.projection=e.projection,t.fov=e.fov,t.near=e.near,t.far=e.far,t.aspect=e.aspect,t.zoom=e.zoom,t.fStop=e.fStop,t.focusDistance=e.focusDistance,t.sensorHeight=e.sensorHeight,t.metersPerUnit=e.metersPerUnit,t.left=e.left,t.right=e.right,t.top=e.top,t.bottom=e.bottom,Ue.copy(t.transform,e.transform),this}clone(){return new i({projection:this.projection}).copy(this)}getProjectionMatrix(e=1){let t=this;if(t.projection==="perspective"){let A=t.fov*Math.PI/180,a=2*Math.atan(Math.tan(A/2)/Math.max(t.zoom,Number.EPSILON));return Ue.perspective([],a,t.aspect??e,t.near,t.far)}return Ue.ortho([],(t.left+t.right)/2-(t.right-t.left)/(2*t.zoom),(t.left+t.right)/2+(t.right-t.left)/(2*t.zoom),(t.bottom+t.top)/2-(t.top-t.bottom)/(2*t.zoom),(t.bottom+t.top)/2+(t.top-t.bottom)/(2*t.zoom),t.near,t.far)}};var He=class{image;source;version=0;flipY=!1;uvScale=[1,1];uvOffset=[0,0];uvChannel=0;constructor(e){this.image=e}markUpdated(){return this.version++,this}};function gt(i){return!!(i&&i.data)}function TA(i){if(i==="openpbr")return 0;if(i==="gltf")return 1;throw new Error(`Invalid specularAnisotropyModel: ${String(i)}. Expected openpbr or gltf.`)}function Tr(i,e){return Number.isFinite(i)?Math.min(1,Math.max(0,i)):e}var Ol=["r","g","b","a"];function RA(i){let e=Ol.indexOf(i);if(e<0)throw new Error(`Invalid thinFilmMapChannel: ${String(i)}; expected r, g, b or a`);return e}function Rr(i,e){return Number.isFinite(i)?Math.max(0,i):e}var ss={specularRoughnessAnisotropy:"specularAnisotropy",coatRoughnessAnisotropy:"coatAnisotropy",subsurfaceScatterAnisotropy:"subsurfaceAnisotropy",geometryOpacity:"opacity",geometryThinWalled:"thinWalled"};function Lr(i){let e={...i};for(let t of Object.keys(ss)){let A=ss[t];if(i[t]!==void 0){if(i[A]!==void 0&&i[A]!==i[t])throw new Error(`Conflicting OpenPBR material parameters: ${t} and ${A}`);Object.assign(e,{[A]:i[t]}),delete e[t]}}return e}var oA=[{key:"baseWeight",type:"float",default:1,category:"param"},{key:"baseColor",type:"color",default:[.8,.8,.8],category:"param"},{key:"baseDiffuseRoughness",type:"float",default:0,category:"param"},{key:"baseMetalness",type:"float",default:0,category:"param"},{key:"specularWeight",type:"float",default:1,category:"param"},{key:"specularColor",type:"color",default:[1,1,1],category:"param"},{key:"specularRoughness",type:"float",default:.3,category:"param"},{key:"specularIor",type:"float",default:1.5,category:"param"},{key:"specularAnisotropy",type:"float",default:0,category:"param"},{key:"transmissionWeight",type:"float",default:0,category:"param"},{key:"transmissionColor",type:"color",default:[1,1,1],category:"param"},{key:"transmissionDepth",type:"float",default:0,category:"param"},{key:"transmissionScatter",type:"color",default:[0,0,0],category:"param"},{key:"transmissionScatterAnisotropy",type:"float",default:0,category:"param"},{key:"transmissionDispersionScale",type:"float",default:0,category:"param"},{key:"transmissionDispersionAbbeNumber",type:"float",default:20,category:"param"},{key:"subsurfaceWeight",type:"float",default:0,category:"param"},{key:"subsurfaceColor",type:"color",default:[.8,.8,.8],category:"param"},{key:"subsurfaceRadius",type:"float",default:1,category:"param"},{key:"subsurfaceRadiusScale",type:"color",default:[1,.5,.25],category:"param"},{key:"subsurfaceAnisotropy",type:"float",default:0,category:"param"},{key:"fuzzWeight",type:"float",default:0,category:"param"},{key:"fuzzColor",type:"color",default:[1,1,1],category:"param"},{key:"fuzzRoughness",type:"float",default:.5,category:"param"},{key:"coatWeight",type:"float",default:0,category:"param"},{key:"coatColor",type:"color",default:[1,1,1],category:"param"},{key:"coatRoughness",type:"float",default:0,category:"param"},{key:"coatAnisotropy",type:"float",default:0,category:"param"},{key:"coatIor",type:"float",default:1.6,category:"param"},{key:"coatDarkening",type:"float",default:1,category:"param"},{key:"thinFilmWeight",type:"float",default:0,category:"param"},{key:"thinFilmThickness",type:"float",default:.5,category:"param"},{key:"thinFilmIor",type:"float",default:1.4,category:"param"},{key:"emissionColor",type:"color",default:[1,1,1],category:"param"},{key:"emissionLuminance",type:"float",default:0,category:"param"},{key:"opacity",type:"float",default:1,category:"param"},{key:"thinWalled",type:"bool",default:!1,category:"param"},{key:"doubleSided",type:"bool",default:!1,category:"param"},{key:"map",type:"texture",default:void 0,category:"texture"},{key:"alphaMap",type:"texture",default:void 0,category:"texture"},{key:"alphaMode",type:"enum",default:"auto",category:"param"},{key:"alphaCutoff",type:"float",default:0,category:"param"},{key:"emissiveMap",type:"texture",default:void 0,category:"texture"},{key:"normalMap",type:"texture",default:void 0,category:"texture"},{key:"normalScale",type:"vec2",default:[1,1],category:"param"},{key:"metallicRoughnessMap",type:"texture",default:void 0,category:"texture"},{key:"roughnessMap",type:"texture",default:void 0,category:"texture"},{key:"metalnessMap",type:"texture",default:void 0,category:"texture"},{key:"transmissionMap",type:"texture",default:void 0,category:"texture"},{key:"thinFilmMap",type:"texture",default:void 0,category:"texture"},{key:"shadowCatcher",type:"bool",default:!1,category:"param"},{key:"unlit",type:"bool",default:!1,category:"param"},{key:"bevelSize",type:"float",default:0,category:"param"},{key:"mapAlphaUsage",type:"enum",default:"opaque",category:"param"},{key:"uvProjection",type:"enum",default:"none",category:"param"},{key:"uvProjectionScale",type:"vec2",default:[1,1],category:"param"},{key:"displacementUvProjection",type:"enum",default:"none",category:"geometry"},{key:"displacementUvProjectionScale",type:"float",default:1,category:"geometry"},{key:"displacementMap",type:"texture",default:void 0,category:"texture"},{key:"displacementScale",type:"float",default:.1,category:"geometry"},{key:"displacementStepSize",type:"float",default:0,category:"geometry"},{key:"thinFilmThicknessMinimum",type:"float",default:0,category:"param"},{key:"thinFilmMapChannel",type:"enum",default:"r",category:"param"},{key:"coatWeightMap",type:"texture",default:void 0,category:"texture"},{key:"coatRoughnessMap",type:"texture",default:void 0,category:"texture"},{key:"fuzzColorMap",type:"texture",default:void 0,category:"texture"},{key:"fuzzRoughnessMap",type:"texture",default:void 0,category:"texture"},{key:"specularWeightMap",type:"texture",default:void 0,category:"texture"},{key:"specularColorMap",type:"texture",default:void 0,category:"texture"},{key:"anisotropyMap",type:"texture",default:void 0,category:"texture"},{key:"specularAnisotropyRotation",type:"float",default:0,category:"param"},{key:"coatAnisotropyRotation",type:"float",default:0,category:"param"},{key:"specularAnisotropyModel",type:"enum",default:"openpbr",category:"param"},{key:"coatNormalMap",type:"texture",default:void 0,category:"texture"},{key:"coatNormalScale",type:"vec2",default:[1,1],category:"param"},{key:"displacementBias",type:"float",default:0,category:"geometry"}];var ha=oA.map(i=>i.key);function Or(i){return oA.filter(e=>e.category===i).map(e=>e.key)}var bi=Or("texture"),Fr=Or("geometry"),Nr=Or("param"),Fl=new Map(oA.map(i=>[i.key,i.default]));function j(i){let e=Fl.get(i);return Array.isArray(e)?e.slice():e}function os(i,e){let t=Lr(e);t.thinFilmMapChannel!==void 0&&RA(t.thinFilmMapChannel),t.specularAnisotropyModel!==void 0&&TA(t.specularAnisotropyModel);for(let{key:A}of oA)t[A]!==void 0&&Object.assign(i,{[A]:t[A]})}var ls=1,Ur=new WeakMap;function zr(){ls=1}function rt(i){return oA.map(({key:e})=>{let t=i[e];return t==null?"$":t instanceof He?(Ur.has(t)||Ur.set(t,ls++),`${Ur.get(t)}@${t.version}`):typeof t=="string"?t:typeof t=="object"&&"length"in t?Array.from(t).join("_"):t}).join("_")}var lA=class{constructor(e={}){os(this,e)}baseWeight=j("baseWeight");baseColor=j("baseColor");baseDiffuseRoughness=j("baseDiffuseRoughness");baseMetalness=j("baseMetalness");specularWeight=j("specularWeight");specularColor=j("specularColor");specularRoughness=j("specularRoughness");specularIor=j("specularIor");specularAnisotropy=j("specularAnisotropy");transmissionWeight=j("transmissionWeight");transmissionColor=j("transmissionColor");transmissionDepth=j("transmissionDepth");transmissionScatter=j("transmissionScatter");transmissionScatterAnisotropy=j("transmissionScatterAnisotropy");transmissionDispersionScale=j("transmissionDispersionScale");transmissionDispersionAbbeNumber=j("transmissionDispersionAbbeNumber");subsurfaceWeight=j("subsurfaceWeight");subsurfaceColor=j("subsurfaceColor");subsurfaceRadius=j("subsurfaceRadius");subsurfaceRadiusScale=j("subsurfaceRadiusScale");subsurfaceAnisotropy=j("subsurfaceAnisotropy");fuzzWeight=j("fuzzWeight");fuzzColor=j("fuzzColor");fuzzRoughness=j("fuzzRoughness");coatWeight=j("coatWeight");coatColor=j("coatColor");coatRoughness=j("coatRoughness");coatAnisotropy=j("coatAnisotropy");coatIor=j("coatIor");coatDarkening=j("coatDarkening");thinFilmWeight=j("thinFilmWeight");thinFilmThickness=j("thinFilmThickness");thinFilmIor=j("thinFilmIor");thinFilmThicknessMinimum=j("thinFilmThicknessMinimum");thinFilmMapChannel=j("thinFilmMapChannel");emissionColor=j("emissionColor");emissionLuminance=j("emissionLuminance");opacity=j("opacity");thinWalled=j("thinWalled");doubleSided=j("doubleSided");map;alphaMap;alphaMode=j("alphaMode");alphaCutoff=j("alphaCutoff");emissiveMap;normalMap;normalScale=j("normalScale");metallicRoughnessMap;roughnessMap;metalnessMap;transmissionMap;thinFilmMap;coatWeightMap;coatRoughnessMap;fuzzColorMap;fuzzRoughnessMap;specularWeightMap;specularColorMap;specularAnisotropyModel="openpbr";anisotropyMap;coatNormalMap;coatNormalScale=j("coatNormalScale");specularAnisotropyRotation=0;coatAnisotropyRotation=0;get specularRoughnessAnisotropy(){return this.specularAnisotropy}set specularRoughnessAnisotropy(e){this.specularAnisotropy=e}get coatRoughnessAnisotropy(){return this.coatAnisotropy}set coatRoughnessAnisotropy(e){this.coatAnisotropy=e}get subsurfaceScatterAnisotropy(){return this.subsurfaceAnisotropy}set subsurfaceScatterAnisotropy(e){this.subsurfaceAnisotropy=e}get geometryOpacity(){return this.opacity}set geometryOpacity(e){this.opacity=e}get geometryThinWalled(){return this.thinWalled}set geometryThinWalled(e){this.thinWalled=e}shadowCatcher=j("shadowCatcher");unlit=j("unlit");bevelSize=j("bevelSize");mapAlphaUsage=j("mapAlphaUsage");uvProjection=j("uvProjection");uvProjectionScale=j("uvProjectionScale");displacementMap;displacementUvProjection=j("displacementUvProjection");displacementUvProjectionScale=j("displacementUvProjectionScale");displacementScale=j("displacementScale");displacementBias=j("displacementBias");displacementStepSize=j("displacementStepSize")},dt={opaque:0,mask:1,blend:2};function Jt(i){return i.alphaMode!=="auto"?i.alphaMode:i.alphaCutoff>0?"mask":i.opacity<1||i.mapAlphaUsage==="alpha"||i.alphaMap?"blend":"opaque"}var UA=class{type="AmbientLight";color=[1,1,1];intensity=1;constructor(e={}){this.color=e.color??[1,1,1],this.intensity=e.intensity??1}};var LA=class extends mt{type="DirectionalLight";color=[1,1,1];intensity=1;constructor(e={}){super(),this.color=e.color??[1,1,1],this.intensity=e.intensity??1}};var OA=class extends mt{type="RectLight";size=[1,1];color=[1,1,1];intensity=1;texture=void 0;spread=1;constructor(e={}){super(),this.size=e.size??[1,1],this.color=e.color??[1,1,1],this.intensity=e.intensity??1,this.texture=e.texture??void 0,this.spread=e.spread??1}};var FA=class extends mt{type="SphereLight";color=[1,1,1];intensity=1;radius=1;constructor(e={}){super(),this.color=e.color??[1,1,1],this.intensity=e.intensity??1,this.radius=e.radius??1}};var NA=class extends mt{type="SpotLight";color=[1,1,1];intensity=1;radius=.01;innerAngle=30;outerAngle=45;iesProfile=void 0;constructor(e={}){super(),this.color=e.color??[1,1,1],this.intensity=e.intensity??1,this.radius=e.radius??.01,this.innerAngle=e.innerAngle??30,this.outerAngle=e.outerAngle??45,this.iesProfile=e.iesProfile??void 0}};var zA=class{type="EnvironmentLight";map;constructor(e){this.map=e.map}};var tt=class extends Error{constructor(e,t="IES profile"){super(`${t}: ${e}`),this.name="IESParseError"}};function cs(i,e){if(e.length===1||i<=e[0])return 0;let t=e.length-1;if(i>=e[t])return t;for(let A=1;A<=t;A++)if(i<=e[A])return A-1+(i-e[A-1])/(e[A]-e[A-1]);return t}function kA(i,e,t){return i+(e-i)*t}var cA=class{name;verticalAngles;horizontalAngles;candelaValues;peakCandela;data;type="IESProfile";size=128;constructor(e,t,A,a,r,n){this.name=e,this.verticalAngles=t,this.horizontalAngles=A,this.candelaValues=a,this.peakCandela=r,this.data=n}evaluateAngles(e,t){if(e>this.verticalAngles[this.verticalAngles.length-1])return 0;let A=t,a=this.horizontalAngles[this.horizontalAngles.length-1];a<=180?(A=Math.abs(A),a===90&&A>90&&(A=180-A)):A<0&&(A+=360);let r=cs(e,this.verticalAngles),n=cs(A,this.horizontalAngles),o=Math.floor(r),s=Math.ceil(r),l=Math.floor(n),c=Math.ceil(n),u=r-o,p=n-l,d=this.verticalAngles.length,f=this.candelaValues[l*d+o],m=this.candelaValues[l*d+s],g=this.candelaValues[c*d+o],h=this.candelaValues[c*d+s];return kA(kA(f,m,u),kA(g,h,u),p)/this.peakCandela}sampleBaked(e,t,A=0){let a=e/Math.PI,r=(t-A)/(2*Math.PI)+.5,n=a*128-.5,o=r*128-.5,s=Math.floor(n),l=Math.floor(o),c=n-s,u=o-l,p=f=>(f%128+128)%128,d=(f,m)=>this.data[p(m)*128+p(f)];return kA(kA(d(s,l),d(s+1,l),c),kA(d(s,l+1),d(s+1,l+1),c),u)}},Nl=["IESNA:LM-63-1986","IESNA:LM-63-1991","IESNA91","IESNA:LM-63-1995","IESNA:LM-63-2002","ERCO Leuchten"];function zl(i,e="IES profile"){let t=i.replace(/\r/g,"").split(`
`),A=t[0]?.trim();if(!Nl.includes(A))throw new tt(`unsupported LM-63 header "${A||"<empty>"}"`,e);let a=t.findIndex(h=>h.trim().startsWith("TILT="));if(a<0)throw new tt("missing TILT record",e);if(t[a].trim()!=="TILT=NONE")throw new tt("only TILT=NONE is supported",e);let r=t.slice(a+1).join(" ").trim().split(/[\s,]+/).filter(Boolean),n=r.map(h=>Number(h)),o=n.findIndex(h=>!Number.isFinite(h));if(o>=0)throw new tt(`invalid numeric token "${r[o]}"`,e);if(n.length<13)throw new tt("incomplete numeric header",e);let s=n[3],l=n[4];if(!Number.isInteger(s)||s<1||!Number.isInteger(l)||l<1)throw new tt("angle counts must be positive integers",e);if(n[5]!==1)throw new tt("only Type C photometry is supported",e);let c=13+s+l+s*l;if(n.length!==c)throw new tt(`numeric data size is ${n.length}, expected ${c}`,e);let u=n.slice(13,13+s),p=n.slice(13+s,13+s+l),d=n.slice(13+s+l),f=(h,B,_)=>{if(h.some((E,Q)=>E<0||E>_||Q>0&&E<=h[Q-1]))throw new tt(`${B} angles must be finite, strictly increasing, and within 0..${_}`,e)};if(f(u,"vertical",180),f(p,"horizontal",360),u[0]!==0||p[0]!==0)throw new tt("Type C angle tables must begin at 0 degrees",e);if(d.some(h=>h<0))throw new tt("candela values must be non-negative",e);let m=Math.max(...d);if(!(m>0))throw new tt("candela peak must be greater than zero",e);let g=new cA(e,u,p,d,m,new Float32Array(16384));for(let h=0;h<128;h++){let B=h*360/128-180;for(let _=0;_<128;_++)g.data[h*128+_]=g.evaluateAngles(_*180/128,B)}return g}var Ba=String.fromCharCode,kl=8,Gl=32767;function Hl(i,e,t,A){if(i[3]>0){let a=Math.pow(2,i[3]-128-8+A);e[t+0]=i[0]*a,e[t+1]=i[1]*a,e[t+2]=i[2]*a}else e[t+0]=0,e[t+1]=0,e[t+2]=0;return e[t+3]=1,e}function Wl(i,e,t){let A="";for(let a=e;a<t;a++)A+=Ba(i[a]);return A}function Yl(i,e){e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3]}function fs(i,e,t,A){let a=0,r=0,n=A;for(;n>0;)if(i[r][0]=e[t++],i[r][1]=e[t++],i[r][2]=e[t++],i[r][3]=e[t++],i[r][0]===1&&i[r][1]===1&&i[r][2]===1){for(let o=i[r][3]<<a>>>0;o>0;o--)Yl(i[r-1],i[r]),r++,n--;a+=8}else r++,n--,a=0;return t}function jl(i,e,t,A){if(A<kl||A>Gl)return fs(i,e,t,A);let a=e[t++];if(a!=2)return fs(i,e,t-1,A);if(i[0][1]=e[t++],i[0][2]=e[t++],a=e[t++],(i[0][2]<<8>>>0|a)>>>0!==A)return null;for(let r=0;r<4;r++)for(let n=0;n<A;){let o=e[t++];if(o>128){o=(o&127)>>>0;let s=e[t++];for(;o--;)i[n++][r]=s}else for(;o--;)i[n++][r]=e[t++]}return t}function us(i,e=0){let t=new Uint8Array(i),A=t.length;if(Wl(t,0,2)!=="#?")return;let a;for(a=2;a<A&&!(Ba(t[a])===`
`&&Ba(t[a+1])===`
`);a++);if(a>=A)return;a+=2;let r="";for(;a<A;a++){let d=Ba(t[a]);if(d===`
`)break;r+=d}let n=r.split(" "),o=parseInt(n[1]),s=parseInt(n[3]);if(!s||!o)return;let l=a+1,c=[];for(let d=0;d<s;d++){c[d]=[];for(let f=0;f<4;f++)c[d][f]=0}let u=new Float32Array(s*o*4),p=0;for(let d=0;d<o;d++){if(l=jl(c,t,l,s),!l)return;for(let f=0;f<s;f++)Hl(c[f],u,p,e),p+=4}return new He({data:u,width:s,height:o})}function Vl(i,e){return fetch(i).then(t=>t.arrayBuffer()).then(t=>us(t,e))}function K(i,e){if(!Array.isArray(i)&&!ArrayBuffer.isView(i))return!1;let t=i;if(!Array.isArray(e)||t.length!==e.length)return!1;for(let A=0;A<t.length;A++)if(!Object.is(t[A],e[A]))return!1;return!0}function xi(i,e){{let t=i.baseWeight,A=e[0];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.baseColor,A=e[1];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.baseDiffuseRoughness,A=e[2];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.baseMetalness,A=e[3];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.specularWeight,A=e[4];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.specularColor,A=e[5];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.specularRoughness,A=e[6];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.specularIor,A=e[7];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.specularAnisotropy,A=e[8];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.transmissionWeight,A=e[9];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.transmissionColor,A=e[10];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.transmissionDepth,A=e[11];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.transmissionScatter,A=e[12];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.transmissionScatterAnisotropy,A=e[13];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.transmissionDispersionScale,A=e[14];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.transmissionDispersionAbbeNumber,A=e[15];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.subsurfaceWeight,A=e[16];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.subsurfaceColor,A=e[17];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.subsurfaceRadius,A=e[18];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.subsurfaceRadiusScale,A=e[19];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.subsurfaceAnisotropy,A=e[20];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.fuzzWeight,A=e[21];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.fuzzColor,A=e[22];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.fuzzRoughness,A=e[23];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.coatWeight,A=e[24];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.coatColor,A=e[25];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.coatRoughness,A=e[26];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.coatAnisotropy,A=e[27];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.coatIor,A=e[28];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.coatDarkening,A=e[29];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.thinFilmWeight,A=e[30];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.thinFilmThickness,A=e[31];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.thinFilmIor,A=e[32];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.emissionColor,A=e[33];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.emissionLuminance,A=e[34];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.opacity,A=e[35];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.thinWalled,A=e[36];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.doubleSided,A=e[37];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.alphaMode,A=e[38];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.alphaCutoff,A=e[39];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.normalScale,A=e[40];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.shadowCatcher,A=e[41];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.unlit,A=e[42];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.bevelSize,A=e[43];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.mapAlphaUsage,A=e[44];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.uvProjection,A=e[45];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.uvProjectionScale,A=e[46];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.displacementUvProjection,A=e[47];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.displacementUvProjectionScale,A=e[48];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.displacementScale,A=e[49];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.displacementStepSize,A=e[50];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.thinFilmThicknessMinimum,A=e[51];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.thinFilmMapChannel,A=e[52];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.specularAnisotropyRotation,A=e[53];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.coatAnisotropyRotation,A=e[54];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.specularAnisotropyModel,A=e[55];if(!Object.is(t,A)&&!K(t,A))return!1}{let t=i.coatNormalScale,A=e[56];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.displacementBias,A=e[57];if(!Object.is(t,A)&&!K(t,A))return!1}return!0}function ds(i,e){let t=0;{let A=i.map;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.alphaMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.emissiveMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.normalMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.metallicRoughnessMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.roughnessMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.metalnessMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.transmissionMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.thinFilmMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.displacementMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.coatWeightMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.coatRoughnessMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.fuzzColorMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.fuzzRoughnessMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.specularWeightMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.specularColorMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.anisotropyMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.coatNormalMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel)return!0}else if(e[t++]!==void 0)return!0}}return t!==e.length}function Qt(i){let e=[i];for(let t of Object.keys(i)){let A=i[t];e.push(t),A instanceof He?e.push(...ps(A)):Array.isArray(A)||ArrayBuffer.isView(A)?e.push(...Array.from(A)):e.push(A)}return e}function ps(i){return i?[i,i.version,i.image,i.flipY,i.uvScale,i.uvOffset,i.uvChannel]:[void 0]}function Ve(i,e){return i.length===e.length&&i.every((t,A)=>Object.is(t,e[A]))}function ql(i){return i instanceof He?ps(i):Array.isArray(i)?[i,...i]:i?Qt(i):[void 0]}function Jl(i,e){let t=0;for(let A of bi){let a=i[A];if(typeof a!="number"){if(!a){e[t++]=void 0;continue}e[t++]=a,e[t++]=a.version,e[t++]=a.image,e[t++]=a.flipY,e[t++]=a.uvScale,e[t++]=a.uvOffset,e[t++]=a.uvChannel}}e.length=t}var Kl=oA.filter(i=>i.type!=="texture").map(i=>i.key);function kr(i,e){return Kl.map((t,A)=>{let a=i[t];if(Array.isArray(a)||ArrayBuffer.isView(a)){let r=a,n=e?.[A];if(Array.isArray(n)&&n.length===r.length){let o=!0;for(let s=0;s<r.length;s++)if(!Object.is(r[s],n[s])){o=!1;break}if(o)return n}return Array.from(r)}return a})}var ms=["position","normal","tangent","uv","uv1","color","indices","materialIndex"];function Xl(i,e){let t=0;for(let A of ms){let a=i[A];e[t++]=a?.array,e[t++]=a?.array.length,e[t++]=a?.itemSize}}function $l(i,e){let t=0;for(let A of ms){let a=i[A];if(e[t++]!==a?.array||e[t++]!==a?.array.length||e[t++]!==a?.itemSize)return!1}return!0}var va=class{_snapshot;_pending;_spare;_seen=new Set;detect(e){let t=this._snapshot,A=!t||t.meshList!==e.meshes||t.meshes.length!==e.meshes.length,a=[],r=[],n=new Set,o=[],s=this._seen;s.clear();for(let p=0;p<e.meshes.length;p++){let d=e.meshes[p],f=t?.meshes[p],m=!1;if(d instanceof ie&&(d.validate(),f?.instanceCount!==d.count&&(A=!0),f?.mesh===d&&(f.colorVersion!==d.colorsVersion||f.instanceColors!==d.colors)&&r.push(d),f?.mesh===d&&(f.instanceVersion!==d.transformsVersion||f.instanceTransforms!==d.transforms)&&(a.push(d),m=!0)),(!f||f.mesh!==d||f.geometry!==d.geometry||f.dynamic!==d.geometry.dynamic||!$l(d.geometry,f.storage)||f.materials.length!==d.materials.length||f.materials.some((g,h)=>g!==d.materials[h]))&&(A=!0),f?.geometry===d.geometry&&f.version!==d.geometry.version&&n.add(d.geometry),f?.mesh===d){for(let g=0;g<16;g++)if(!Object.is(d.transform[g],t.matrices[p*16+g])){m||a.push(d);break}}for(let g of d.materials){if(s.has(g))continue;s.add(g);let h=t?.materials.get(g);(!h||!xi(g,h.values)||ds(g,h.textures))&&o.push(g)}}let l=e.lights.map(Qt),c=ql(e.background),u={meshes:A?"full":a.length||r.length||o.length||n.size?"incremental":"none",transforms:a,colors:r,materials:o,geometries:[...n],lights:!t||t.lightList!==e.lights||l.length!==t.lights.length||l.some((p,d)=>!Ve(p,t.lights[d])),background:!t||!Ve(c,t.background)};if(u.meshes!=="none"||u.lights||u.background){let p=this._spare;(!p||p.meshList!==e.meshes||p.meshes.length!==e.meshes.length)&&(p={meshList:e.meshes,meshes:[],matrices:new Float64Array(e.meshes.length*16),materials:new Map,lightList:e.lights,lights:[],background:[]},this._spare=p),e.meshes.forEach((f,m)=>{let g=p.meshes[m];g||(g={mesh:f,geometry:f.geometry,version:f.geometry.version,dynamic:f.geometry.dynamic,storage:[],materials:[]},p.meshes[m]=g),g.mesh=f,g.geometry=f.geometry,g.version=f.geometry.version,g.instanceVersion=f instanceof ie?f.transformsVersion:void 0,g.colorVersion=f instanceof ie?f.colorsVersion:void 0,g.instanceColors=f instanceof ie?f.colors:void 0,g.instanceCount=f instanceof ie?f.count:void 0,g.instanceTransforms=f instanceof ie?f.transforms:void 0,g.dynamic=f.geometry.dynamic,Xl(f.geometry,g.storage),g.materials.length=f.materials.length;for(let h=0;h<f.materials.length;h++)g.materials[h]=f.materials[h];p.matrices.set(f.transform,m*16)});for(let f of p.materials.keys())s.has(f)||p.materials.delete(f);let d=new Set(o);for(let f of s){let m=t?.materials.get(f);if(m&&!d.has(f))p.materials.set(f,m);else{let g=p.materials.get(f);(!g||g===m)&&(g={values:[],textures:[]}),g.values=kr(f,m?.values),Jl(f,g.textures),p.materials.set(f,g)}}p.lightList=e.lights,p.lights=l,p.background=c,this._pending=p}else this._pending=t;return u}commit(){this._pending&&this._pending!==this._snapshot&&(this._spare=this._snapshot,this._snapshot=this._pending),this._pending=void 0}reset(){this._snapshot=this._pending=this._spare=void 0,this._seen.clear()}};var GA=class{engine;_active=!1;_activeUntil=-1/0;constructor(e){this.engine=e}get active(){return this._active||performance.now()<this._activeUntil}setActive(e){this._active=e}activateFor(e){this._activeUntil=Math.max(this._activeUntil,performance.now()+Math.max(0,e))}dispose(){this._active=!1,this._activeUntil=-1/0}};var Ea=new WeakMap;function gs(i){i.markVerticesUpdated(),Ea.set(i,i.version)}function Gr(i){return Ea.get(i)===i.version}function hs(i,e){Gr(i)?Ea.set(e,e.version):Ea.delete(e)}var Zl=["position","normal","tangent","skinIndex","skinWeight"];function fA(i){let e=i,t=e.isInterleavedBufferAttribute?e.data.array:i.array,A=e.isInterleavedBufferAttribute?e.data.stride:i.itemSize,a=e.isInterleavedBufferAttribute?e.offset:0;if(!i.normalized&&!i.isFloat16BufferAttribute)return{array:t,stride:A,offset:a};let r=new Float64Array(i.count*i.itemSize),n=1,o=!1;i.normalized&&(t instanceof Uint8Array||t instanceof Uint8ClampedArray?n=255:t instanceof Uint16Array?n=65535:t instanceof Uint32Array?n=4294967295:t instanceof Int8Array?(n=127,o=!0):t instanceof Int16Array?(n=32767,o=!0):t instanceof Int32Array&&(n=2147483647,o=!0));let s=i.isFloat16BufferAttribute;for(let l=0;l<i.count;l++)for(let c=0;c<i.itemSize;c++){let u=t[l*A+a+c];if(s){let p=u>>10&31,d=u&1023;u=(u&32768?-1:1)*(p===31?d?NaN:1/0:p===0?d*2**-24:(1+d/1024)*2**(p-15))}u/=n,r[l*i.itemSize+c]=o?Math.max(-1,u):u}return{array:r,stride:i.itemSize,offset:0}}function HA(i,e,t){return i.array[e*i.stride+i.offset+t]}function Bs(i){return!!i.isSkinnedMesh||!!i.morphTargetInfluences&&(!!i.geometry.morphAttributes.position?.length||!!i.geometry.morphAttributes.normal?.length)}var wa=class{geometry;position;normal;tangent;_accepted=[];_next=[];_bones=new Float32Array(0);_boundBones=new Float64Array(0);_temporary=new Float64Array(16);_skin=new Float64Array(16);_vector=new Float64Array(3);_initialized=!1;constructor(e){this.geometry=e;let t=e.attributes.position.count;this.position=new Float32Array(t*3),e.attributes.normal&&(this.normal=new Float32Array(t*3)),e.attributes.tangent&&(this.tangent=new Float32Array(t*Math.min(4,e.attributes.tangent.itemSize)))}matches(e){return this.geometry===e&&this.position.length===e.attributes.position.count*3&&!!this.normal==!!e.attributes.normal&&!!this.tangent==!!e.attributes.tangent&&(!this.tangent||this.tangent.length===e.attributes.position.count*Math.min(4,e.attributes.tangent.itemSize))}update(e){let t=e.geometry,A=e;A.isSkinnedMesh&&A.skeleton.update();let a=this._next;a.length=0,a.push(t,t.morphTargetsRelative);let r=B=>{if(!B){a.push(void 0);return}let _=B,E=_.isInterleavedBufferAttribute?_.data:B;a.push(B,E.array,E.version,B.count,B.itemSize,B.normalized,_.offset,_.data?.stride)};for(let B of Zl)r(t.getAttribute(B));for(let B of["position","normal"]){let _=t.morphAttributes[B];if(a.push(_?.length),_)for(let E of _)r(E)}let n=e.morphTargetInfluences;if(a.push(n?.length),n)for(let B of n)a.push(B);if(A.isSkinnedMesh){a.push(A.skeleton,A.skeleton.boneMatrices.length);for(let B of A.bindMatrix.elements)a.push(B);for(let B of A.bindMatrixInverse.elements)a.push(B)}let o=A.isSkinnedMesh?A.skeleton.boneMatrices:void 0,s=!!o&&o.length!==this._bones.length;if(o&&!s){for(let B=0;B<o.length;B++)if(!Object.is(o[B],this._bones[B])){s=!0;break}}if(this._initialized&&!s&&a.length===this._accepted.length&&a.every((B,_)=>Object.is(B,this._accepted[_])))return!1;let l=fA(t.getAttribute("position")),c=this.normal&&fA(t.getAttribute("normal")),u=this.tangent&&fA(t.getAttribute("tangent")),p=o&&fA(t.getAttribute("skinIndex")),d=o&&fA(t.getAttribute("skinWeight")),f=t.morphAttributes.position?.map(fA),m=t.morphAttributes.normal?.map(fA);if(o){this._bones.length!==o.length&&(this._bones=new Float32Array(o.length),this._boundBones=new Float64Array(o.length)),this._bones.set(o);for(let B=0;B<o.length;B+=16)Ue.multiply(this._temporary,o.subarray(B,B+16),A.bindMatrix.elements),Ue.multiply(this._boundBones.subarray(B,B+16),A.bindMatrixInverse.elements,this._temporary)}let g=(B,_,E)=>{for(let Q=0;Q<3;Q++){let w=HA(B,E,Q),x=w;if(n&&_)for(let M=0;M<_.length;M++){let P=n[M]??0;P&&(x+=P*(HA(_[M],E,Q)-(t.morphTargetsRelative?0:w)))}this._vector[Q]=x}},h=(B,_,E,Q=3)=>{let w=this._vector[0],x=this._vector[1],M=this._vector[2];if(A.isSkinnedMesh){let P=this._skin,D=P[0]*w+P[4]*x+P[8]*M+(E?P[12]:0),V=P[1]*w+P[5]*x+P[9]*M+(E?P[13]:0),$=P[2]*w+P[6]*x+P[10]*M+(E?P[14]:0);if(w=D,x=V,M=$,!E){let v=Math.hypot(w,x,M);v&&(w/=v,x/=v,M/=v)}}B[_*Q]=w,B[_*Q+1]=x,B[_*Q+2]=M};for(let B=0;B<this.position.length/3;B++){if(A.isSkinnedMesh){this._skin.fill(0);for(let _=0;_<4;_++){let E=HA(p,B,_),Q=HA(d,B,_);if(!Q)continue;let w=E*16;for(let x=0;x<16;x++)this._skin[x]+=Q*this._boundBones[w+x]}}if(g(l,f,B),h(this.position,B,!0),this.normal&&(g(c,m,B),h(this.normal,B,!1)),this.tangent){for(let E=0;E<3;E++)this._vector[E]=HA(u,B,E);let _=this.tangent.length/(this.position.length/3);h(this.tangent,B,!1,_),_===4&&(this.tangent[B*4+3]=HA(u,B,3))}}return this._next=this._accepted,this._accepted=a,this._initialized=!0,!0}};function Ie(i,e){if(!i)return;let t=[i.version,i.image,i.flipY,i.repeat.x,i.repeat.y,i.offset.x,i.offset.y,i.channel],A=e.get(i);if(A&&Ve(A.state,t))return A.texture;let a=i.image,r=A?.texture??new He(a);return r.image=a,r.source=i,r.flipY=i.flipY,r.uvScale=[i.repeat.x,i.repeat.y],r.uvOffset=[i.offset.x,i.offset.y],r.uvChannel=i.channel===1?1:0,A?r.markUpdated():r.version=i.version,e.set(i,{texture:r,state:t}),r}function ec(i){let e=i&32768?-1:1,t=i>>10&31,A=i&1023;return t===0?e*Math.pow(2,-14)*(A/1024):t===31?A?NaN:e*(1/0):e*Math.pow(2,t-15)*(1+A/1024)}function Hr(i,e){if(!i?.image?.data||!i.image.width||!i.image.height)return;let t=e.get(i),A=Ie(i,e);if(t?.state===e.get(i)?.state)return A;let a=i.image.data,r=a instanceof Uint16Array?Float32Array.from(a,ec):a instanceof Float32Array||a instanceof Uint8Array||a instanceof Int32Array?a:Float32Array.from(a);return A.image={data:r,width:i.image.width,height:i.image.height},A}function tc(i,e){let t=new lA;if(i.userData.mutracerShadowCatcher===!0)return t.shadowCatcher=!0,t;if(i.isMeshBasicMaterial){let w=i;return t.unlit=!0,t.baseWeight=0,t.specularWeight=0,t.baseColor=w.color.toArray(),t.emissionColor=t.baseColor,t.emissionLuminance=1,t.map=Ie(w.map,e),t.emissiveMap=t.map,t.alphaMap=Ie(w.alphaMap,e),t.geometryOpacity=w.opacity,t.alphaCutoff=Math.max(0,w.alphaTest),t.alphaMode=w.alphaTest>0?"mask":w.transparent||w.opacity<1||w.alphaMap?"blend":"opaque",t.mapAlphaUsage=t.alphaMode==="opaque"?"opaque":"alpha",t.doubleSided=w.side===2,t}let A=i;t.baseColor=A.color.toArray(),t.emissionColor=A.emissive&&A.emissive.toArray(),t.specularRoughness=A.roughness,t.baseMetalness=A.metalness,t.emissionLuminance=A.emissiveIntensity,t.normalScale=A.normalScale&&A.normalScale.toArray();let a=A.userData.mutracerUvProjection;(a==="triplanar"||a==="spherical"||a==="cylindrical"||a==="none")&&(t.uvProjection=a);let r=A.userData.mutracerUvProjectionScale;if(Array.isArray(r)&&r.length>=2){let w=Math.max(Number(A.userData.mutracerUvReferenceLength)||1,1e-6),x=Math.max(Number(r[0])||1e-6,1e-6),M=Math.max(Number(r[1])||1e-6,1e-6);t.uvProjectionScale=t.uvProjection==="triplanar"?[x/w,M/w]:t.uvProjection==="cylindrical"?[x,M/w]:[x,M]}t.map=Ie(A.map,e),t.alphaMap=Ie(A.alphaMap,e),t.alphaCutoff=Math.max(0,Number.isFinite(A.alphaTest)?A.alphaTest:0),t.emissiveMap=Ie(A.emissiveMap,e),t.normalMap=Ie(A.normalMap,e),t.displacementMap=Ie(A.displacementMap,e);let n=Number(A.displacementBias);Number.isFinite(n)&&(t.displacementBias=n);let o=Number(A.displacementScale);t.displacementScale=Number.isFinite(o)&&(A.displacementMap!=null||o!==1)?o:t.displacementScale;let s=Number(A.userData.mutracerDisplacementStepSize);Number.isFinite(s)&&(t.displacementStepSize=Math.max(0,s));let l=A.userData.mutracerDisplacementUvProjection;(l==="triplanar"||l==="spherical"||l==="cylindrical"||l==="none")&&(t.displacementUvProjection=l);let c=Number(A.userData.mutracerDisplacementUvProjectionScale);Number.isFinite(c)&&(t.displacementUvProjectionScale=Math.max(c,1e-6)),A.roughnessMap&&A.roughnessMap===A.metalnessMap?t.metallicRoughnessMap=Ie(A.roughnessMap,e):(t.roughnessMap=Ie(A.roughnessMap,e),t.metalnessMap=Ie(A.metalnessMap,e));let u=A;u.type==="MeshPhysicalMaterial"&&(t.transmissionWeight=u.transmission,t.transmissionMap=Ie(u.transmissionMap,e),t.specularIor=u.ior,t.specularWeight=u.specularIntensity,u.specularColor&&(t.specularColor=u.specularColor.toArray()),t.coatWeightMap=Ie(u.clearcoatMap,e),t.coatRoughnessMap=Ie(u.clearcoatRoughnessMap,e),t.coatNormalMap=Ie(u.clearcoatNormalMap,e),t.coatNormalScale=u.clearcoatNormalScale.toArray(),t.fuzzColorMap=Ie(u.sheenColorMap,e),t.fuzzRoughnessMap=Ie(u.sheenRoughnessMap,e),t.specularWeightMap=Ie(u.specularIntensityMap,e),t.specularColorMap=Ie(u.specularColorMap,e),t.coatWeight=u.clearcoat,t.coatRoughness=u.clearcoatRoughness,t.coatIor=1.5,t.coatDarkening=0,t.fuzzWeight=u.sheen,t.fuzzRoughness=u.sheenRoughness,u.sheenColor&&(t.fuzzColor=u.sheenColor.toArray()),u.attenuationColor&&(t.transmissionColor=u.attenuationColor.toArray()),Number.isFinite(u.attenuationDistance)&&(t.transmissionDepth=Math.max(0,u.attenuationDistance)));let p=Number(u.dispersion);t.transmissionDispersionScale=Number.isFinite(p)?Math.min(1,Math.max(0,p)):0;let d=u;t.thinFilmThickness=Math.min(20,Math.max(0,(d.iridescenceThicknessRange?.[1]??500)/1e3)),t.thinFilmWeight=Math.min(1,Math.max(0,d.iridescence??0)),t.thinFilmIor=Math.min(2.5,Math.max(1,d.iridescenceIOR??1.4));let f=A.userData.mutracerThinFilmMap,m=A.userData.mutracerThinFilmMap??d.iridescenceThicknessMap??void 0;m&&(t.thinFilmMap=Ie(m,e),f||(t.thinFilmThicknessMinimum=Math.min(20,Math.max(0,(d.iridescenceThicknessRange?.[0]??0)/1e3)),t.thinFilmMapChannel="g"));let g=Number(u.anisotropy);if(t.specularRoughnessAnisotropy=Number.isFinite(g)?Math.min(1,Math.max(0,g)):0,u.isMeshPhysicalMaterial){t.specularAnisotropyModel="gltf",t.anisotropyMap=Ie(u.anisotropyMap,e);let w=Number(u.anisotropyRotation);t.specularAnisotropyRotation=Number.isFinite(w)?w:0}let h=A.userData.mutracerOpenPBR,B=h?Lr(h):void 0,_=(w,x,M=0,P=1)=>{let D=Number(w);return Number.isFinite(D)?Math.min(P,Math.max(M,D)):x},E=(w,x)=>{let M=w;return M&&M.length>=3?[_(M[0],x[0]),_(M[1],x[1]),_(M[2],x[2])]:x};if(B){for(let x of["displacementScale","displacementBias","displacementStepSize"]){let M=B[x];typeof M=="number"&&Number.isFinite(M)&&(t[x]=x==="displacementStepSize"?Math.max(0,M):M)}B.specularAnisotropyModel!==void 0&&(TA(B.specularAnisotropyModel),t.specularAnisotropyModel=B.specularAnisotropyModel),B.specularAnisotropy!==void 0&&B.specularAnisotropyModel!=="gltf"&&(t.specularAnisotropyModel="openpbr",t.anisotropyMap=void 0,t.specularAnisotropyRotation=0);for(let x of["coatWeightMap","coatRoughnessMap","fuzzColorMap","fuzzRoughnessMap","specularWeightMap","specularColorMap","anisotropyMap","coatNormalMap"]){let M=B[x];M===null?t[x]=void 0:M instanceof He?t[x]=M:M&&M.isTexture&&typeof M.clone=="function"&&(t[x]=Ie(M,e))}t.specularAnisotropyRotation=_(B.specularAnisotropyRotation,t.specularAnisotropyRotation,-1/0,1/0),t.coatAnisotropyRotation=_(B.coatAnisotropyRotation,t.coatAnisotropyRotation,-1/0,1/0);let w=B.coatNormalScale;w&&w.length>=2&&(t.coatNormalScale=[_(w[0],t.coatNormalScale[0],-1/0,1/0),_(w[1],t.coatNormalScale[1],-1/0,1/0)]),t.baseWeight=_(B.baseWeight,t.baseWeight),t.baseDiffuseRoughness=_(B.baseDiffuseRoughness,t.baseDiffuseRoughness),t.specularWeight=_(B.specularWeight,t.specularWeight),t.specularColor=E(B.specularColor,t.specularColor),t.transmissionScatter=E(B.transmissionScatter,t.transmissionScatter),t.transmissionScatterAnisotropy=_(B.transmissionScatterAnisotropy,t.transmissionScatterAnisotropy,-.95,.95),t.transmissionDispersionScale=_(B.transmissionDispersionScale,t.transmissionDispersionScale),t.transmissionDispersionAbbeNumber=_(B.transmissionDispersionAbbeNumber,t.transmissionDispersionAbbeNumber,1,100),t.subsurfaceWeight=_(B.subsurfaceWeight,t.subsurfaceWeight),t.subsurfaceColor=E(B.subsurfaceColor,t.subsurfaceColor),t.subsurfaceRadius=_(B.subsurfaceRadius,t.subsurfaceRadius,0,1/0),t.subsurfaceRadiusScale=E(B.subsurfaceRadiusScale,t.subsurfaceRadiusScale),t.subsurfaceScatterAnisotropy=_(B.subsurfaceAnisotropy,t.subsurfaceAnisotropy,-.95,.95),t.coatWeight=_(B.coatWeight,t.coatWeight),t.coatColor=E(B.coatColor,t.coatColor),t.coatRoughness=_(B.coatRoughness,t.coatRoughness),t.coatRoughnessAnisotropy=_(B.coatAnisotropy,t.coatAnisotropy),t.coatIor=_(B.coatIor,t.coatIor,1,2.5),t.coatDarkening=_(B.coatDarkening,t.coatDarkening),t.fuzzWeight=_(B.fuzzWeight,t.fuzzWeight),t.fuzzColor=E(B.fuzzColor,t.fuzzColor),t.fuzzRoughness=_(B.fuzzRoughness,t.fuzzRoughness),"thinWalled"in B&&(t.geometryThinWalled=B.thinWalled===!0),t.thinFilmWeight=_(B.thinFilmWeight,t.thinFilmWeight),t.thinFilmThickness=_(B.thinFilmThickness,t.thinFilmThickness,0,20),t.thinFilmThicknessMinimum=_(B.thinFilmThicknessMinimum,t.thinFilmThicknessMinimum,0,20),B.thinFilmMapChannel!==void 0&&(t.thinFilmMapChannel=["r","g","b","a"][RA(B.thinFilmMapChannel)]),B.thinFilmMap instanceof He?t.thinFilmMap=B.thinFilmMap:B.thinFilmMap&&B.thinFilmMap.isTexture&&(t.thinFilmMap=Ie(B.thinFilmMap,e)),t.thinFilmIor=_(B.thinFilmIor,t.thinFilmIor,1,2.5)}t.geometryOpacity=A.opacity,t.doubleSided=A.side===2,B&&(t.specularRoughnessAnisotropy=_(B.specularAnisotropy,t.specularRoughnessAnisotropy),t.geometryOpacity=_(B.opacity,t.geometryOpacity));let Q=Number(A.userData.mutracerBevelSize);return t.bevelSize=Number.isFinite(Q)?Math.max(0,Q):0,t.mapAlphaUsage=A.transparent||A.alphaMap||A.alphaTest>0?"alpha":"opaque",t.alphaMode=A.alphaTest>0?"mask":A.transparent||t.geometryOpacity<1||A.alphaMap?"blend":"opaque",t}function Ci(i,e=i.itemSize){let t=new Float32Array(i.count*e);if(i.array instanceof Float32Array&&!i.normalized){let a=i;if(!a.isInterleavedBufferAttribute&&e===i.itemSize)t.set(i.array.subarray(0,t.length));else{let r=a.isInterleavedBufferAttribute?a.data.stride:i.itemSize,n=a.isInterleavedBufferAttribute?a.offset:0;for(let o=0;o<i.count;o++){let s=o*r+n,l=o*e;for(let c=0;c<e;c++)t[l+c]=i.array[s+c]}}return t}let A=[i.getX,i.getY,i.getZ,i.getW];for(let a=0;a<i.count;a++)for(let r=0;r<e;r++)t[a*e+r]=A[r].call(i,a);return t}function Ac(i,e){let t=i.getAttribute("position"),A=i.getAttribute("normal"),a=i.getAttribute("tangent"),r=i.getAttribute("uv"),n=i.getAttribute("uv1"),o=i.getIndex(),s=o?o.array.length:t.count,l=m=>{let g=Math.trunc(m)||0;return g<0?Math.max(s+g,0):Math.min(g,s)},c=e?l(e.start):0,u=e?l(e.start+e.count):s,p=Math.max(u-c,0);if(p-=p%3,p===0)return null;let d=new Uint32Array(p);if(o)d.set(o.array.subarray(c,c+p));else for(let m=0;m<p;m++)d[m]=c+m;let f=new Ge({position:new z(Ci(t),t.itemSize),normal:A&&new z(Ci(A),A.itemSize),tangent:a&&new z(Ci(a,Math.min(4,a.itemSize)),Math.min(4,a.itemSize)),uv:r&&new z(Ci(r),r.itemSize),uv1:n&&new z(Ci(n),n.itemSize),indices:new z(d,1)});return f.normal||wi(f),_i(f),f}function Yr(){return{updateId:0,textures:new WeakMap,materials:new WeakMap,geometries:new WeakMap,materialHooks:new WeakMap,lightHooks:new WeakMap,poseChanged:!1,meshes:new WeakMap,lights:new WeakMap,deformedGeometries:new WeakMap,deformations:new WeakMap,instanceMeshes:new WeakMap,projectionVariants:new Map,warned:new WeakSet}}var _a=["position","normal","tangent","uv","uv1","index"];function ic(i,e){let t=[];for(let A=0;A<_a.length;A++){let a=_a[A],r=a==="index"?i.index:i.getAttribute(a);if(!r){t.push(void 0);continue}let n=r,o=n.isInterleavedBufferAttribute?n.data:r;t.push(r,o,e&&A<3?void 0:o.version,o.array,r.count,r.itemSize,r.normalized,n.offset,n.data?.stride)}return t}function ac(i,e,t){let A=0;for(let a=0;a<_a.length;a++){let r=_a[a],n=r==="index"?i.index:i.getAttribute(r);if(!n){if(e[A++]!==void 0)return!1;continue}let o=n,s=o.isInterleavedBufferAttribute?o.data:n;if(e[A++]!==n||e[A++]!==s||!Object.is(e[A++],t&&a<3?void 0:s.version)||e[A++]!==s.array||!Object.is(e[A++],n.count)||!Object.is(e[A++],n.itemSize)||!Object.is(e[A++],n.normalized)||!Object.is(e[A++],o.offset)||!Object.is(e[A++],o.data?.stride))return!1}return A===e.length}function WA(i,e,t){let A=i.lights.get(e);if(!A||A.type!==t.type)return i.lights.set(e,t),t;for(let a of Object.keys(t)){let r=A[a],n=t[a];Array.isArray(r)&&Array.isArray(n)&&Ve(r,n)||(A[a]=n)}return A}function rc(i,e={}){return vs(i,e,Yr())}function vs(i,e,t){let A=++t.updateId,a=[],r=[],n=t.textures,o=new Set,s=new Map;function l(v,U){let I=s.get(U);if(I===void 0&&(I=rt(U),s.set(U,I)),!(v.base===U&&v.hash===I&&xi(U,v.parameters))){for(let N of ha)v.material[N]=U[N];v.autoUvProjection&&(v.material.uvProjection="triplanar"),v.autoDisplacementUvProjection&&(v.material.displacementUvProjection="triplanar"),v.parameters=kr(U),v.hash=I,v.base=U}}function c(v,U,I,N){if(!I&&!N)return U;let q=t.projectionVariants.get(v);q||(q=new Map,t.projectionVariants.set(v,q));let O=`${+I}:${+N}`,te=q.get(O);return te||(te={material:new lA,parameters:[],autoUvProjection:I,autoDisplacementUvProjection:N},q.set(O,te)),l(te,U),te.material}function u(v){if(!e.convertMaterial)return;let U=t.materialHooks.get(v);return(!U||U.version!==v.version)&&(U={version:v.version,value:e.convertMaterial(v)},t.materialHooks.set(v,U)),U.value}function p(v){if(!e.convertLight)return;let U=v.userData.mutracerVersion,I=typeof U=="number"?U:void 0,N=t.lightHooks.get(v);return(!N||N.version!==I)&&(N={version:I,value:e.convertLight(v)},t.lightHooks.set(v,N)),N.value}function d(v){let U=u(v);if(U!==void 0)return U;let I=t.materials.get(v);if(o.has(v))return I.material;let N=tc(v,n),q=rt(N),O=N;if(I){if(I.hash!==q){for(let te of ha)I.material[te]=N[te];I.hash=q}O=I.material}else t.materials.set(v,{material:O,hash:q});return o.add(v),O}function f(v){return v.isMesh}function m(v){return v.isDirectionalLight}function g(v){return v.isAmbientLight}function h(v){return v.isRectAreaLight}function B(v){return v.type==="PointLight"}function _(v){return v.type==="SpotLight"}i.updateMatrixWorld(!0),i.traverseVisible(v=>{if(v.isLight){let U=p(v);if(U!==void 0){U!==null&&r.push(U);return}}if(f(v)){if(v.userData.viewerEnvironment||v.userData.viewerRealtimeDisplacement)return;let U=Array.isArray(v.material)?v.material:[v.material];if(U.some(I=>u(I)===null))return;if(!v.geometry)console.warn(v,"must have a geometry property");else if(U.some(I=>u(I)===void 0&&!I.isMeshStandardMaterial&&!I.isMeshBasicMaterial&&I.userData.mutracerShadowCatcher!==!0))console.warn(v,"must use MeshStandardMaterial or MeshBasicMaterial in order to be rendered.");else{let I=v,N=v.isBatchedMesh||I.isInstancedMesh&&(!!I.morphTexture||v.isSkinnedMesh);N&&!t.warned.has(v)&&(console.warn("MuTracer: BatchedMesh, instanced morph targets and skinned instancing are not supported; converting as an ordinary mesh.",v),t.warned.add(v));let q=I.isInstancedMesh&&!N,O,te=!1;!N&&Bs(v)&&(O=t.deformations.get(v),O?.matches(v.geometry)||(O=new wa(v.geometry),t.deformations.set(v,O),t.deformedGeometries.delete(v)),te=O.update(v),t.poseChanged||=te);let le=U,Le=le.length>1&&v.geometry.groups.length?v.geometry.groups:[{start:0,count:1/0,materialIndex:0}],ge=O?t.deformedGeometries.get(v):t.geometries.get(v.geometry);(!ge||ge.checkedAt!==A)&&((!ge||!ac(v.geometry,ge.state,!!O))&&(ge={state:ic(v.geometry,!!O),groups:new Map,checkedAt:A},O?t.deformedGeometries.set(v,ge):t.geometries.set(v.geometry,ge)),ge.checkedAt=A);let xe=ge;Le.forEach((Be,oe)=>{let ue=Number.isFinite(Be.count)?Be.count:v.geometry.getIndex()?.count??v.geometry.getAttribute("position").count,De=`${Be.start}:${ue}`,X=xe.groups.get(De),ve=!X;if(!X){let ye=Ac(v.geometry,{start:Be.start,count:ue});if(!ye)return;X=ye,xe.groups.set(De,X)}O&&(te||ve)&&(X.dynamic=!0,X.position.array.set(O.position),O.normal&&X.normal.array.set(O.normal),O.tangent&&X.tangent&&X.tangent.array.set(O.tangent),v.geometry.getAttribute("tangent")||ns(X),_i(X),ve||gs(X));let Oe=le[Be.materialIndex??0],de=d(Oe),re=de,ze=!X.uv&&re.uvProjection==="none"&&!!(re.map||re.normalMap||re.emissiveMap||re.metallicRoughnessMap||re.roughnessMap||re.metalnessMap||re.thinFilmMap||re.coatWeightMap||re.coatRoughnessMap||re.fuzzColorMap||re.fuzzRoughnessMap||re.specularWeightMap||re.specularColorMap||re.anisotropyMap||re.coatNormalMap),Fe=!X.uv&&!!re.displacementMap&&re.displacementUvProjection==="none",Ce=q?I.count:1;if(q){let ye=t.instanceMeshes.get(v);ye||(ye=new Map,t.instanceMeshes.set(v,ye));let ne=c(Oe,re,ze,Fe),Z=ye.get(oe);Z||(Z=new ie(X,ne,{count:Ce}),Z.transform=v.matrixWorld.elements.slice(),ye.set(oe,Z)),Z.geometry=X,Z.materials[0]!==ne&&(Z.materials=[ne]);let Ne=Z.count!==Ce;Z.transforms.length<Ce*16&&(Z.transforms=new Float32Array(Ce*16),Ne=!0);let at=I.instanceColor,vt=!1;if(at){(!Z.colors||Z.colors.length<Ce*3)&&(Z.colors=new Float32Array(Ce*3));for(let ee=0;ee<Ce;ee++)for(let Re=0;Re<3;Re++){let Ye=Math.fround(Re===0?at.getX(ee):Re===1?at.getY(ee):at.getZ(ee));Object.is(Z.colors[ee*3+Re],Ye)||(Z.colors[ee*3+Re]=Ye,vt=!0)}}else Z.colors=void 0;Z.count=Ce;let AA=I.instanceMatrix;for(let ee=0;ee<Ce;ee++)for(let Re=0;Re<16;Re++){let Ye=Math.fround(AA.array[ee*AA.itemSize+Re]);Object.is(Z.transforms[ee*16+Re],Ye)||(Z.transforms[ee*16+Re]=Ye,Ne=!0)}for(let ee=0;ee<16;ee++)Z.transform[ee]=v.matrixWorld.elements[ee];Ne&&Z.markTransformsUpdated(),vt&&Z.markColorsUpdated(),Z.name=v.name||`Mesh ${a.length+1}${Le.length>1?`.${oe+1}`:""}`,Ce>0&&(a.push(Z),e.onMeshConverted?.(Z,v,Be,oe))}else{de=c(Oe,re,ze,Fe);let ye=t.meshes.get(v);ye||(ye=new Map,t.meshes.set(v,ye));let ne=ye.get(oe);ne||(ne=new Dr(X,de),ne.transform=v.matrixWorld.elements.slice(),ye.set(oe,ne)),ne.geometry=X,ne.materials[0]!==de&&(ne.materials=[de]),ne.name=v.name||`Mesh ${a.length+1}${Le.length>1?`.${oe+1}`:""}`;for(let Z=0;Z<16;Z++)ne.transform[Z]=v.matrixWorld.elements[Z];a.push(ne),e.onMeshConverted?.(ne,v,Be,oe)}})}}else if(m(v)){let U=new LA({color:v.color.toArray(),intensity:v.intensity});U.transform=Array.from(U.transform),U.position=v.getWorldPosition(v.position.clone()).toArray(),U.lookAt(v.target.getWorldPosition(v.target.position.clone()).toArray()),r.push(WA(t,v,U))}else if(h(v)){let U=v.matrixWorld.clone(),I=v.getWorldQuaternion(v.quaternion.clone()).normalize(),N=v.getWorldPosition(v.position.clone()),q=U.elements,O=Math.hypot(q[0],q[1],q[2]),te=Math.hypot(q[4],q[5],q[6]),le=new OA({size:[v.width*O,v.height*te],color:v.color.toArray(),intensity:v.intensity});U.compose(N,I,v.scale.clone().set(1,1,1)),le.transform=U.elements.slice(),r.push(WA(t,v,le))}else if(_(v)){let U=v.getWorldPosition(v.position.clone()),I=v.target.getWorldPosition(v.target.position.clone()),N=v.angle*180/Math.PI,q=v.userData.mutracerIesProfile;if(q!=null&&!(q instanceof cA))throw new Error(`THREE.SpotLight "${v.name||"<unnamed>"}" has an invalid mutracerIesProfile`);let O=new NA({color:v.color.toArray(),intensity:v.intensity,radius:v.userData.mutracerRadius??.01,innerAngle:N*(1-v.penumbra),outerAngle:N,iesProfile:q});O.transform=Array.from(O.transform),O.position=U.toArray(),O.lookAt(I.toArray());let te=-(v.userData.mutracerIesRotation??0)*Math.PI/180;te&&Ue.rotateZ(O.transform,O.transform,te),r.push(WA(t,v,O))}else if(B(v)){let U=v.matrixWorld.elements,I=[U[12],U[13],U[14]];r.push(WA(t,v,Object.assign(new FA({color:v.color.toArray(),intensity:v.intensity,radius:v.userData.mutracerRadius??.25}),{transform:[1,0,0,0,0,1,0,0,0,0,1,0,...I,1]})))}else g(v)&&r.push(WA(t,v,new UA({color:v.color.toArray(),intensity:v.intensity})))});let E=i.environment,Q=Hr(E,n),w=E&&Q?WA(t,E,new zA({map:Q})):void 0;w&&r.push(w);let x=i.userData.mutracerGroundedSkybox,M=x&&Hr(x.texture,n),D=i.userData.mutracerHiddenBackground===!0?[0,0,0,0]:x&&M?{type:"GroundedSkybox",map:M,height:x.height,radius:x.radius,groundHeight:x.groundHeight,center:x.center}:i.background?i.background.isColor?[...i.background.toArray(),1]:i.background===i.environment&&w?w.map:Hr(i.background,n):void 0,V=t.background;Array.isArray(D)&&Array.isArray(V)&&Ve(D,V)?D=V:D&&V&&!Array.isArray(D)&&!Array.isArray(V)&&!(D instanceof He)&&!(V instanceof He)&&(Ve(Qt(D).slice(1),Qt(V).slice(1))||Object.assign(V,D),D=V),t.background=D;let $=new Set(a.flatMap(v=>v.materials));for(let[v,U]of t.projectionVariants){for(let[I,N]of U)$.has(N.material)||U.delete(I);U.size||t.projectionVariants.delete(v)}return{background:D,meshes:a,lights:r}}function Wr(i,e){if(!i||!e.getPolarAngle||!e.getAzimuthalAngle)return;i.parent?.updateWorldMatrix(!0,!1);let t=[i,e.update,i.parent,...i.position.toArray(),...i.quaternion.toArray(),...i.scale.toArray(),...i.up.toArray(),i.zoom,...i.parent?.matrixWorld.elements??[]];for(let[A,a]of Object.entries(e)){if(A.startsWith("_")||A==="state")continue;let r=a;r?.isVector3?t.push(A,...r.toArray()):(typeof a=="number"||typeof a=="boolean"||typeof a=="string")&&t.push(A,a)}return t}var jr=class extends GA{_options;scene;_camera;_store=Yr();_disposed=!1;_started=!1;_gestureChanged=!1;_cameraState=[];_lastUpdate;_idleControlsState;_start=()=>{this._started=!0,this._gestureChanged=!1};_end=()=>{this._started=!1};constructor(e,t={}){super(e),this._options=t,t.scene&&(this.scene={meshes:[],lights:[]}),t.controls?.addEventListener("start",this._start),t.controls?.addEventListener("end",this._end)}update(){if(this._disposed)throw new Error("THREESync has been disposed");let e=performance.now(),t=this._options.controls,A=this._options.camera,a=this._lastUpdate===void 0?0:Math.max(0,(e-this._lastUpdate)/1e3),r=Math.min(.1,a);this._lastUpdate=e;let n=!1,o=!1;if(t&&this._options.updateControls!==!1){let l=Wr(A,t);if(!((!this._started||!this._gestureChanged)&&!t.autoRotate&&l&&this._idleControlsState&&Ve(l,this._idleControlsState))){this._idleControlsState=void 0;let u=A?.position.clone(),p=A?.quaternion.clone(),d=A?.zoom,f=t.target?.clone(),m=t.dampingFactor,g=t.enableDamping&&m!==void 0&&m>=0&&m<=1?1-Math.pow(1-m,a*60):void 0;g!==void 0&&(t.dampingFactor=g);try{n=!!t.update(r)}finally{g!==void 0&&(t.dampingFactor=m)}if(!this._started&&!t.autoRotate&&t.enableDamping&&u&&A&&t.target){let h=g?m/g:1,B=u.distanceTo(A.position)*h,_=Math.abs(Math.log(A.zoom/d))*h,E=B>0||A.zoom!==d||!!(l&&(!p.equals(A.quaternion)||!f.equals(t.target)));if((n||E)&&B<5e-4*A.position.distanceTo(t.target)&&_<5e-4){t.enableDamping=!1;try{t.update(0)}finally{t.enableDamping=!0}n=!1,o=!0}l&&(o||!n&&!E)&&(this._idleControlsState=Wr(A,t))}else l&&!this._started&&!t.autoRotate&&!n&&(this._idleControlsState=Wr(A,t))}}if(this._store.poseChanged=!1,this._options.scene&&this.scene){let l=vs(this._options.scene,this._options,this._store);Ve(this.scene.meshes,l.meshes)||(this.scene.meshes=l.meshes),Ve(this.scene.lights,l.lights)||(this.scene.lights=l.lights),this.scene.background=l.background,this.engine.scene=this.scene}let s=!1;if(A){A.updateWorldMatrix(!0,!1);let l=Es(A),c=Qt(l).slice(1);s=this._cameraState.length>0&&!Ve(c,this._cameraState),this._cameraState=c,this._camera?this._camera.copy(l):this._camera=l,this.engine.camera=this._camera}this._started&&(n||s)&&(this._gestureChanged=!0),this.setActive(this._started&&this._gestureChanged||n||this._store.poseChanged||s&&!o)}dispose(){this._disposed||(this._options.controls?.removeEventListener("start",this._start),this._options.controls?.removeEventListener("end",this._end),this._store=Yr(),this._idleControlsState=void 0,this._disposed=!0,super.dispose())}};function Es(i,e={}){let t=i.fov?new sA({projection:"perspective",fov:i.fov,aspect:i.aspect,near:i.near,far:i.far}):new sA({projection:"orthographic",left:i.left,right:i.right,bottom:i.bottom,top:i.top,near:i.near,far:i.far});i.updateWorldMatrix(!0,!1),t.zoom=i.zoom,t.transform=i.matrixWorld.elements.slice();let A=i;if(A.isPerspectiveCamera){A.focus>0&&(t.focusDistance=A.focus);let a=A.getFilmHeight();a>0&&(t.sensorHeight=a)}return e.fStop!==void 0&&(t.fStop=e.fStop),e.focusDistance!==void 0&&(t.focusDistance=e.focusDistance),e.metersPerUnit!==void 0&&(t.metersPerUnit=e.metersPerUnit),t}function nc(i=40,e=20,t=0,A=Math.PI*2,a=0,r=Math.PI){let n=[],o=[],s=[],l=[];for(let _=0;_<=e;_++)for(let E=0;E<=i;E++){let Q=E/i,w=_/e,x=-1*Math.cos(t+Q*A)*Math.sin(a+w*r),M=1*Math.cos(a+w*r),P=1*Math.sin(t+Q*A)*Math.sin(a+w*r);n.push(x,M,P),o.push(Q,w),s.push(x*1,M*1,P*1)}let p,d,f,m,g=i+1,h=0;for(let _=0;_<e;_++)for(let E=0;E<i;E++)d=_*g+E,p=_*g+E+1,m=(_+1)*g+E+1,f=(_+1)*g+E,l[h++]=p,l[h++]=d,l[h++]=m,l[h++]=d,l[h++]=f,l[h++]=m;let B=new Ge({uv:new z(new Float32Array(o),2),position:new z(new Float32Array(n),3),normal:new z(new Float32Array(s),3),indices:new z(new Uint32Array(l),1)});return y.set(B.boundingBox.min,-1,-1,-1),y.set(B.boundingBox.max,1,1,1),B}function sc(i=1,e=1,t="horizontal"){let A=[],a=[],r=[],n=[],o=t==="vertical";for(let l=0;l<=e;l++){let c=l/e;for(let u=0;u<=i;u++){let p=u/i;if(o?(A.push(2*p-1,2*c-1,0),r&&r.push(0,0,1)):(A.push(2*c-1,0,2*p-1),r&&r.push(0,1,0)),a&&a.push(p,c),u<i&&l<e){let d=u+l*(i+1);n.push(d,d+1,d+i+1),n.push(d+i+1,d+1,d+i+2)}}}let s=new Ge({uv:new z(new Float32Array(a),2),position:new z(new Float32Array(A),3),normal:new z(new Float32Array(r),3),indices:new z(new Uint32Array(n),1)});return o?(y.set(s.boundingBox.min,-1,-1,0),y.set(s.boundingBox.max,1,1,0)):(y.set(s.boundingBox.min,-1,0,-1),y.set(s.boundingBox.max,1,0,1)),s}function oc(i=1,e=1,t=1){let A=[],a=[],r=[],n=[],o=0,s=1,l=1,c=1;u(2,1,0,-1,-1,c,l,s,t,e),u(2,1,0,1,-1,c,l,-s,t,e),u(0,2,1,1,1,s,c,l,i,t),u(0,2,1,1,-1,s,c,-l,i,t),u(0,1,2,1,-1,s,l,c,i,e),u(0,1,2,-1,-1,s,l,-c,i,e);function u(d,f,m,g,h,B,_,E,Q,w){let x=B/Q,M=_/w,P=B/2,D=_/2,V=E/2,$=Q+1,v=w+1,U=0,I=y.create();for(let N=0;N<v;N++){let q=N*M-D;for(let O=0;O<$;O++){let te=O*x-P;I[d]=te*g,I[f]=q*h,I[m]=V,a.push(I[0],I[1],I[2]),I[d]=0,I[f]=0,I[m]=E>0?1:-1,r.push(I[0],I[1],I[2]),n.push(O/Q),n.push(1-N/w),U+=1}}for(let N=0;N<w;N++)for(let q=0;q<Q;q++){let O=o+q+$*N,te=o+q+$*(N+1),le=o+(q+1)+$*(N+1),Le=o+(q+1)+$*N;A.push(O,te,Le),A.push(te,le,Le)}o+=U}let p=new Ge({uv:new z(new Float32Array(n),2),position:new z(new Float32Array(a),3),normal:new z(new Float32Array(r),3),indices:new z(new Uint32Array(A),1)});return y.set(p.boundingBox.min,-1,-1,-1),y.set(p.boundingBox.max,1,1,1),p}function lc(i=.2){let e=[],t=[],r=[],n=i/Math.PI*2,o=(1-i)/2,s=0;for(let c=0;c<=200;c++){let u,p,d=c/200;if(!(d>0&&d<=o-1/200||d>=o+i+1/200&&d<1)){if(d<=o)u=0,p=n+o-d;else if(d>=o+i)u=d-o-i+n,p=0;else{let f=(d-o)/i*Math.PI/2;u=(1-Math.cos(f))*n,p=(1-Math.sin(f))*n}for(let f=0;f<=5;f++){let m=f/5,g=2*m-1;if(t.push([g,u*2,p*2]),r.push([m,d]),f<5&&c<200){let h=f+s*6;e.push([h,h+1,h+5+1]),e.push([h+5+1,h+1,h+5+2])}}s++}}let l=new Ge({uv:new z(new Float32Array(r.flat()),2),position:new z(new Float32Array(t.flat()),3),indices:new z(new Uint32Array(e.flat()),1)});return _i(l),wi(l),l}var Tt=y.create(),Rt=y.create(),Ut=y.create(),Lt=y.create(),Ot=y.create(),Ft=y.create(),Nt=Math.min,zt=Math.max;function ws(i,e,t){let A=e.min,a=e.max;Tt[0]=t[0]*A[0],Tt[1]=t[1]*A[0],Tt[2]=t[2]*A[0],Rt[0]=t[0]*a[0],Rt[1]=t[1]*a[0],Rt[2]=t[2]*a[0],Ut[0]=t[4]*A[1],Ut[1]=t[5]*A[1],Ut[2]=t[6]*A[1],Lt[0]=t[4]*a[1],Lt[1]=t[5]*a[1],Lt[2]=t[6]*a[1],Ot[0]=t[8]*A[2],Ot[1]=t[9]*A[2],Ot[2]=t[10]*A[2],Ft[0]=t[8]*a[2],Ft[1]=t[9]*a[2],Ft[2]=t[10]*a[2],A=i.min,a=i.max,A[0]=Nt(Tt[0],Rt[0])+Nt(Ut[0],Lt[0])+Nt(Ot[0],Ft[0])+t[12],A[1]=Nt(Tt[1],Rt[1])+Nt(Ut[1],Lt[1])+Nt(Ot[1],Ft[1])+t[13],A[2]=Nt(Tt[2],Rt[2])+Nt(Ut[2],Lt[2])+Nt(Ot[2],Ft[2])+t[14],a[0]=zt(Tt[0],Rt[0])+zt(Ut[0],Lt[0])+zt(Ot[0],Ft[0])+t[12],a[1]=zt(Tt[1],Rt[1])+zt(Ut[1],Lt[1])+zt(Ot[1],Ft[1])+t[13],a[2]=zt(Tt[2],Rt[2])+zt(Ut[2],Lt[2])+zt(Ot[2],Ft[2])+t[14]}function cc(i){let e={min:y.fromValues(1/0,1/0,1/0),max:y.fromValues(-1/0,-1/0,-1/0)},t={min:y.create(),max:y.create()};return i.forEach(A=>{ws(t,A.geometry.boundingBox,A.transform),y.min(e.min,e.min,t.min),y.max(e.max,e.max,t.max)}),e}var Vr=["map","alphaMap","normalMap","emissiveMap","metallicRoughnessMap","roughnessMap","metalnessMap","transmissionMap","thinFilmMap","displacementMap","coatWeightMap","coatRoughnessMap","fuzzColorMap","fuzzRoughnessMap","specularWeightMap","specularColorMap","anisotropyMap","coatNormalMap"];function L(i,e,t,A=!1){return{name:i,source:e,type:t,reserved:A}}var Mi=[{name:"COLOR",fields:[L("color","color","vec3f"),L("matType","type","f32")]},{name:"ROUGHNESS_NORMAL",fields:[L("roughness","roughness","f32"),L("normalMapIndex","normalMapIndex","f32"),L("normalMapScale","normalScale","vec2f")]},{name:"METALLIC_MAPS",fields:[L("metallic","metallic","f32"),L("anisotropy","anisotropy","f32"),L("diffuseMapIndex","diffuseMapIndex","f32"),L("mrtMapIndex","metallicRoughnessMapIndex","f32")]},{name:"EMISSION",fields:[L("emission","emission","vec3f"),L("emissiveMapIndex","emissiveMapIndex","f32")]},{name:"IOR_TRANSMISSION",fields:[L("ior","ior","f32"),L("transmission","transmission","f32"),L("mediumType","mediumType","f32",!0),L("thin","thin","f32")]},{name:"MISC",fields:[L("bevel","bevelSize","f32"),L("dispersion","dispersion","f32"),L("thinFilmThickness","thinFilmThickness","f32"),L("mapAlphaUsage","mapAlphaUsage","f32")]},{name:"LAYER_MAPS",fields:[L("coatWeightMapIndex","coatWeightMapIndex","f32"),L("coatRoughnessMapIndex","coatRoughnessMapIndex","f32"),L("coatNormalMapIndex","coatNormalMapIndex","f32"),L("fuzzColorMapIndex","fuzzColorMapIndex","f32")]},{name:"UV",fields:[L("uvProjection","uvProjection","f32"),L("displacementMapIndex","displacementMapIndex","f32"),L("uvScale","uvScale","vec2f")]},{name:"DISPLACEMENT",fields:[L("displacementStepSize","displacementStepSize","f32"),L("displacementBias","displacementBias","f32"),L("displacementUvProjection","displacementUvProjection","f32"),L("displacementUvProjectionScale","displacementUvProjectionScale","f32")]},{name:"ALPHA_FILM",fields:[L("alpha","alpha","f32"),L("thinFilmMapIndex","thinFilmMapIndex","f32"),L("thinFilmIor","thinFilmIor","f32"),L("transmissionMapIndex","transmissionMapIndex","f32")]},{name:"BASE_CONTROLS",fields:[L("baseWeight","baseWeight","f32"),L("baseDiffuseRoughness","baseDiffuseRoughness","f32"),L("specularWeight","specularWeight","f32"),L("subsurfaceWeight","subsurfaceWeight","f32")]},{name:"SPECULAR_FUZZ",fields:[L("specularColor","specularColor","vec3f"),L("fuzzWeight","fuzzWeight","f32")]},{name:"TRANSMISSION_COLOR",fields:[L("transmissionColor","transmissionColor","vec3f"),L("transmissionDepth","transmissionDepth","f32")]},{name:"TRANSMISSION_SCATTER",fields:[L("transmissionScatter","transmissionScatter","vec3f"),L("transmissionScatterAnisotropy","transmissionScatterAnisotropy","f32")]},{name:"SUBSURFACE",fields:[L("subsurfaceColor","subsurfaceColor","vec3f"),L("subsurfaceRadius","subsurfaceRadius","f32")]},{name:"FUZZ",fields:[L("fuzzColor","fuzzColor","vec3f"),L("fuzzRoughness","fuzzRoughness","f32")]},{name:"COAT",fields:[L("coatColor","coatColor","vec3f"),L("coatWeight","coatWeight","f32")]},{name:"COAT_CONTROLS",fields:[L("coatRoughness","coatRoughness","f32"),L("coatAnisotropy","coatAnisotropy","f32"),L("coatIor","coatIor","f32"),L("coatDarkening","coatDarkening","f32")]},{name:"FILM_DISPERSION",fields:[L("thinFilmWeight","thinFilmWeight","f32"),L("dispersionAbbeNumber","dispersionAbbeNumber","f32"),L("subsurfaceScatterAnisotropy","subsurfaceScatterAnisotropy","f32"),L("fuzzRoughnessMapIndex","fuzzRoughnessMapIndex","f32")]},{name:"SUBSURFACE_RADIUS",fields:[L("subsurfaceRadiusScale","subsurfaceRadiusScale","vec3f"),L("specularWeightMapIndex","specularWeightMapIndex","f32")]},{name:"MEDIUM_EXTINCTION",fields:[L("mediumExtinction","mediumExtinction","vec3f"),L("mediumAnisotropy","mediumAnisotropy","f32")]},{name:"MEDIUM_SCATTERING",fields:[L("mediumScattering","mediumScattering","vec3f"),L("specularColorMapIndex","specularColorMapIndex","f32")]},{name:"STANDALONE_MAPS",fields:[L("roughnessMapIndex","roughnessMapIndex","f32"),L("metalnessMapIndex","metalnessMapIndex","f32"),L("alphaMapIndex","alphaMapIndex","f32"),L("alphaCutoff","alphaCutoff","f32")]},{name:"ALPHA",fields:[L("_padding1",null,"f32",!0),L("_padding2",null,"f32",!0),L("doubleSided","doubleSided","f32"),L("alphaMode","alphaMode","f32")]},{name:"DIRECTION_NORMAL",fields:[L("anisotropyMapIndex","anisotropyMapIndex","f32"),L("specularAnisotropyRotation","specularAnisotropyRotation","f32"),L("coatNormalScale","coatNormalScale","vec2f")]},{name:"FILM_TEXTURE",fields:[L("coatAnisotropyRotation","coatAnisotropyRotation","f32"),L("specularAnisotropyModel","specularAnisotropyModel","f32"),L("thinFilmThicknessMinimum","thinFilmThicknessMinimum","f32"),L("thinFilmMapChannel","thinFilmMapChannel","f32")]}],qr=Mi.length,yi=qr*4,Qa={f32:1,vec2f:2,vec3f:3};function ba(){return Mi.flatMap((i,e)=>{let t=0;return i.fields.map(A=>{let a=e*16+t*4;return t+=Qa[A.type],{...A,row:e,component:a%16/4,offset:a}})})}function _s(i){let e=ba().map(A=>({...A,values:A.source===null?i.type.map(()=>0):i[A.source]?.flat()??[]})),t=new Float32Array(i.type.length*yi);for(let A=0;A<i.type.length;A++)for(let a of e){let r=Qa[a.type];for(let n=0;n<r;n++)t[A*yi+a.offset/4+n]=Number(a.values[A*r+n]??-1)}return t}function Qs(){let i=0,e=ba().map(t=>{let A=t.type==="vec3f"?16:Qa[t.type]*4,a=Math.ceil(i/A)*A;if(a!==t.offset)throw new Error(`Misaligned material field: ${t.name}`);return i=a+Qa[t.type]*4,`  ${t.name}: ${t.type},`});if(Math.ceil(i/16)*16!==qr*16)throw new Error("Invalid material buffer size");return`struct MaterialBuffer {
${e.join(`
`)}
};`}function bs(){return[`const int MAT_DATA_SIZE = ${qr};`,...Mi.map((i,e)=>`const int MAT_ROW_${i.name} = ${e};`)].join(`
`)}var Jr=[{property:"map",index:"diffuseMapIndex",target:"baseColor/alpha/transmissionWeight",channel:"rgb/a",colorSpace:"srgb",operation:"custom",define:"NUM_DIFFUSE_MAPS",feature:"USE_DIFFUSE_MAPS",featureBit:2**1,sampling:"manual"},{property:"alphaMap",index:"alphaMapIndex",target:"alpha",channel:"g",colorSpace:"linear",operation:"multiply",define:"NUM_ALPHA_MAPS",feature:"USE_ALPHA_MAPS",featureBit:2**2,sampling:"multiply"},{property:"normalMap",index:"normalMapIndex",target:"normal",channel:"rgb",colorSpace:"linear",operation:"custom",define:"NUM_NORMAL_MAPS",feature:"USE_NORMAL_MAPS",featureBit:2**9,sampling:"manual"},{property:"emissiveMap",index:"emissiveMapIndex",target:"emission",channel:"rgb",colorSpace:"srgb",operation:"custom",define:"NUM_EMISSIVE_MAPS",feature:"USE_EMISSIVE_MAPS",featureBit:2**7,sampling:"manual"},{property:"metallicRoughnessMap",index:"metallicRoughnessMapIndex",target:"baseMetalness/specularRoughness",channel:"b/g",colorSpace:"linear",operation:"custom",define:"NUM_METALLIC_ROUGHNESS_MAPS",feature:"USE_METALLIC_ROUGHNESS_MAPS",featureBit:2**3,sampling:"manual"},{property:"roughnessMap",index:"roughnessMapIndex",target:"specularRoughness",channel:"g",colorSpace:"linear",operation:"multiply",define:"NUM_ROUGHNESS_MAPS",feature:"USE_ROUGHNESS_MAPS",featureBit:2**4,sampling:"multiply"},{property:"metalnessMap",index:"metalnessMapIndex",target:"baseMetalness",channel:"b",colorSpace:"linear",operation:"multiply",define:"NUM_METALNESS_MAPS",feature:"USE_METALNESS_MAPS",featureBit:2**5,sampling:"multiply"},{property:"transmissionMap",index:"transmissionMapIndex",target:"transmissionWeight",channel:"r",colorSpace:"linear",operation:"multiply",define:"NUM_TRANSMISSION_MAPS",feature:"USE_TRANSMISSION_MAPS",featureBit:2**6,sampling:"multiply"},{property:"thinFilmMap",index:"thinFilmMapIndex",target:"thinFilmThickness",channel:"per-material",colorSpace:"linear",operation:"custom",define:"NUM_THIN_FILM_MAPS",feature:"USE_THIN_FILM_MAPS",featureBit:2**8,sampling:"manual"},{property:"displacementMap",index:"displacementMapIndex",target:"displacement",channel:"r",colorSpace:"linear",operation:"custom",define:null,feature:null,featureBit:0,sampling:"manual"},{property:"coatWeightMap",index:"coatWeightMapIndex",target:"coatWeight",channel:"r",colorSpace:"linear",operation:"multiply",define:"NUM_COAT_WEIGHT_MAPS",feature:"USE_COAT_WEIGHT_MAPS",featureBit:2**15,sampling:"multiply"},{property:"coatRoughnessMap",index:"coatRoughnessMapIndex",target:"coatRoughness",channel:"g",colorSpace:"linear",operation:"multiply",define:"NUM_COAT_ROUGHNESS_MAPS",feature:"USE_COAT_ROUGHNESS_MAPS",featureBit:2**16,sampling:"multiply"},{property:"fuzzColorMap",index:"fuzzColorMapIndex",target:"fuzzColor",channel:"rgb",colorSpace:"srgb",operation:"multiply",define:"NUM_FUZZ_COLOR_MAPS",feature:"USE_FUZZ_COLOR_MAPS",featureBit:2**18,sampling:"multiply"},{property:"fuzzRoughnessMap",index:"fuzzRoughnessMapIndex",target:"fuzzRoughness",channel:"a",colorSpace:"linear",operation:"multiply",define:"NUM_FUZZ_ROUGHNESS_MAPS",feature:"USE_FUZZ_ROUGHNESS_MAPS",featureBit:2**19,sampling:"multiply"},{property:"specularWeightMap",index:"specularWeightMapIndex",target:"specularWeight",channel:"a",colorSpace:"linear",operation:"multiply",define:"NUM_SPECULAR_WEIGHT_MAPS",feature:"USE_SPECULAR_WEIGHT_MAPS",featureBit:2**20,sampling:"multiply"},{property:"specularColorMap",index:"specularColorMapIndex",target:"specularColor",channel:"rgb",colorSpace:"srgb",operation:"multiply",define:"NUM_SPECULAR_COLOR_MAPS",feature:"USE_SPECULAR_COLOR_MAPS",featureBit:2**21,sampling:"multiply"},{property:"anisotropyMap",index:"anisotropyMapIndex",target:"specularAnisotropy/direction",channel:"rg/b",colorSpace:"linear",operation:"custom",define:"NUM_ANISOTROPY_MAPS",feature:"USE_ANISOTROPY_MAPS",featureBit:2**22,sampling:"manual"},{property:"coatNormalMap",index:"coatNormalMapIndex",target:"coatNormal",channel:"rgb",colorSpace:"linear",operation:"custom",define:"NUM_COAT_NORMAL_MAPS",feature:"USE_COAT_NORMAL_MAPS",featureBit:2**17,sampling:"manual"}];var YA=Jr.map(i=>{let e=ba().find(t=>t.source===i.index);if(!e)throw new Error(`Missing packed texture index: ${i.property}`);return{...i,packed:{row:e.row,component:e.component,wgslField:e.name,glslRow:`MAT_ROW_${Mi[e.row].name}`,glslComponent:"xyzw"[e.component]}}}),xs=Object.fromEntries(Jr.flatMap(i=>i.feature?[[i.feature,i.featureBit]]:[])),Cs=Jr.flatMap(i=>i.define?[i.define]:[]);function ys(i){return Object.fromEntries(YA.flatMap(e=>e.feature&&e.define?[[e.feature,+i[e.define]>0]]:[]))}function Se(i,e){let t=YA.find(r=>r.property===i);if(!t||t.sampling!=="multiply")throw new Error(`Handwritten texture slot: ${i}`);let A=t.index,a=r=>t.colorSpace==="srgb"?`decodeMapColor(${A}, ${r})`:r;return e==="wgsl"?`
  if (${t.feature}) {
    let ${A} = i32(matData.${t.packed.wgslField});
    if (${A} >= 0) {
      (*ma).${t.target} *= ${a(`sampleMap(
        ${A}, getMapUvSet(${A}, uv, uv1)
      ).${t.channel}`)};
    }
  }
`:`
  #ifdef ${t.define}
    int ${A} = int(fetchMatData(i + ${t.packed.glslRow}).${t.packed.glslComponent});
    if (${A} >= 0) {
      mat.${t.target} *= ${a(`sampleMap(
        ${A}, getMapUvSet(${A}, uv, uv1)
      ).${t.channel}`)};
    }
  #endif
`}function xa(i){let e=YA.find(t=>t.property==="thinFilmMap");return i==="wgsl"?`
  if (${e.feature}) {
    let thinFilmMapIndex = i32(matData.${e.packed.wgslField});
    if (thinFilmMapIndex >= 0) {
      let filmTexel = sampleMap(thinFilmMapIndex, getMapUvSet(thinFilmMapIndex, uv, uv1));
      // Preserve the legacy nm conversion followed by R multiplication exactly.
      if (matData.thinFilmThicknessMinimum == 0.0 && matData.thinFilmMapChannel == 0.0) {
        (*ma).thinFilmThickness *= filmTexel.r;
      } else {
        (*ma).thinFilmThickness = mix(matData.thinFilmThicknessMinimum,
          matData.thinFilmThickness, filmTexel[i32(matData.thinFilmMapChannel)]) * 1000.0;
      }
    }
  }
`:`
  #ifdef ${e.define}
    int thinFilmMapIndex = int(fetchMatData(i + ${e.packed.glslRow}).${e.packed.glslComponent});
    if (thinFilmMapIndex >= 0) {
      vec4 filmTexel = sampleMap(thinFilmMapIndex, getMapUvSet(thinFilmMapIndex, uv, uv1));
      vec4 filmTextureParams = fetchMatData(i + MAT_ROW_FILM_TEXTURE);
      if (filmTextureParams.z == 0.0 && filmTextureParams.w == 0.0) {
        mat.thinFilmThickness *= filmTexel.r;
      } else {
        mat.thinFilmThickness = mix(filmTextureParams.z, misc.b,
          filmTexel[int(filmTextureParams.w)]) * 1000.0;
      }
    }
  #endif
`}function Ms(i){let e=Math.floor(i),t=i-e;return e+ +(t>.5||t===.5&&e%2===1)}function Kr(i){let e=i<0||Object.is(i,-0)?32768:0,t=Math.abs(i);if(Number.isNaN(t))return 32256;if(t>=65520)return e|31744;if(t<2**-14)return e|Ms(t*2**24);let A=Math.floor(Math.log2(t));return e|(A+14)*1024+Ms(t/2**(A-10))}function nt(i=300,e=150,t=!1){if(!t&&typeof document<"u"){let A=document.createElement("canvas");return A.width=i,A.height=e,A}if(typeof OffscreenCanvas<"u")return new OffscreenCanvas(i,e);throw new Error("Canvas creation requires document or OffscreenCanvas.")}var pt={opaque:0,alpha:2,transmission:3};function Kt(i){let e=[i.emissionColor[0]*i.emissionLuminance,i.emissionColor[1]*i.emissionLuminance,i.emissionColor[2]*i.emissionLuminance];if(i.unlit||i.shadowCatcher||i.coatWeight<=0||i.coatWeightMap)return e;let t=Math.min(i.coatWeight,1);for(let A=0;A<3;A++)e[A]*=1+t*(Math.sqrt(Math.max(i.coatColor[A],0))-1);return e}function G(i,...e){return i.reduce((t,A,a)=>t+(a?String(e[a-1]??""):"")+A,"")}function bt(i){return typeof i=="string"&&(i={main:i}),{defines:i.defines||{},uniforms:i.uniforms||{},main:i.main||"",functions:i.functions||[]}}var C=class{static uniform(e,t){return{type:e,value:t}}static arrayUniform(e,t,A){return{type:e,len:t,value:A,array:!0}}},_e=class{name;outputs;defines;uniforms;functions;main;parallelCompile=!1;constructor(e){let t=e.includes||[];this.name=e.name||"",this.outputs=e.outputs||["color"],this.defines=Object.assign({},...t.map(A=>A.defines),e.defines||{}),this.uniforms=Object.assign({},...t.map(A=>A.uniforms),e.uniforms||{}),this.functions=t.flatMap(A=>A.functions||[]),this.main=e.main}};var k={FLOAT:5126,HALF_FLOAT:5131,UNSIGNED_BYTE:5121,RGBA:6408,LINEAR:9729,NEAREST:9728,REPEAT:10497,CLAMP_TO_EDGE:33071,SCISSOR_TEST:3089,COLOR_BUFFER_BIT:16384,DEPTH_BUFFER_BIT:256,LINES:1,TEXTURE_2D:3553,TEXTURE_2D_ARRAY:35866};function Ca(i){return!!i&&typeof i=="object"&&"data"in i}var we=class{_source;width=1;height=1;target=k.TEXTURE_2D;_options;_texture;_dirty=!0;_allocated=!1;constructor(e={}){this._options=e,this.source=e.source,this.width=e.width||1,this.height=e.height||1}get storageType(){return this._options.type??k.UNSIGNED_BYTE}get isByteEncoded(){return(this._options.type??k.UNSIGNED_BYTE)===k.UNSIGNED_BYTE}getMemoryBytes(){if(!this._allocated)return 0;let e=this._options.type===k.FLOAT?4:this._options.type===k.HALF_FLOAT?2:1;return this.width*this.height*4*e}get source(){return this._source}set source(e){this._source!==e&&(this._source=e,this._dirty=!0,this._allocated=!1)}dirty(){this._dirty=!0}resize(e,t){(this.width!==e||this.height!==t)&&(this.width=e,this.height=t,this._dirty=!0,this._allocated=!1)}ensureStorage(e,t,A,a=this._options){let r=(this._options.type??k.UNSIGNED_BYTE)!==(a.type??this._options.type??k.UNSIGNED_BYTE)||this._options.sRGB!==(a.sRGB??this._options.sRGB);if(this._options={...this._options,...a},r&&(this._dirty=!0,this._allocated=!1),this.resize(Math.max(1,t),Math.max(1,A)),this._ensureTexture(e),!this._allocated||this._dirty){this._bindAndConfigure(e);let{internalFormat:n,format:o,type:s}=this._format(e);e.texImage2D(e.TEXTURE_2D,0,n,this.width,this.height,0,o,s,null),this._allocated=!0,this._dirty=!1}return this}bind(e,t){this._ensureTexture(e),e.activeTexture(e.TEXTURE0+t),this._bindAndConfigure(e),(this._dirty||!this._allocated)&&this._upload(e)}updateDataRange(e,t,A,a){if(!a)return;let r=this.source;if(!Ca(r)||A<0||a<0||A%t.BYTES_PER_ELEMENT||a%t.BYTES_PER_ELEMENT||A+a>t.byteLength||A+a>r.data.byteLength)throw new RangeError("Invalid data texture byte range");if(r.data.set(t.subarray(A/t.BYTES_PER_ELEMENT,(A+a)/t.BYTES_PER_ELEMENT),A/r.data.BYTES_PER_ELEMENT),this._ensureTexture(e),this._bindAndConfigure(e),this._dirty||!this._allocated){this._upload(e);return}let n=r.data.length/(r.width*r.height),o=r.width*n*r.data.BYTES_PER_ELEMENT,s=Math.floor(A/o),l=Math.ceil((A+a)/o),{format:c,type:u}=this._format(e,n);e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,this._options.flipY?1:0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,this._options.premultiplyAlpha?1:0),e.texSubImage2D(e.TEXTURE_2D,0,0,s,r.width,l-s,c,u,r.data.subarray(s*r.width*n,l*r.width*n))}getWebGLTexture(e){return this._ensureTexture(e),this._texture}dispose(e){this._texture&&e.deleteTexture(this._texture),this._texture=void 0,this._allocated=!1,this._dirty=!0}_ensureTexture(e){this._texture||(this._texture=e.createTexture(),this._dirty=!0,this._allocated=!1)}_bindAndConfigure(e){e.bindTexture(e.TEXTURE_2D,this._texture),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,this._options.minFilter||e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,this._options.magFilter||e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,this._options.wrapS||e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,this._options.wrapT||e.CLAMP_TO_EDGE)}_format(e,t=4){let A=this._options.type||e.UNSIGNED_BYTE,a=[e.RED,e.RG,e.RGB,e.RGBA],r=[e.R32F,e.RG32F,e.RGB32F,e.RGBA32F],n=[e.R16F,e.RG16F,e.RGB16F,e.RGBA16F];return{type:A,format:a[t-1],internalFormat:A===e.FLOAT?r[t-1]:A===e.HALF_FLOAT?n[t-1]:this._options.sRGB?e.SRGB8_ALPHA8:e.RGBA8}}_upload(e){let t=this.source,A=t&&Ca(t)?t.data.byteLength/t.data.BYTES_PER_ELEMENT/(t.width*t.height):4,{internalFormat:a,format:r,type:n}=this._format(e,A);e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,this._options.flipY?1:0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,this._options.premultiplyAlpha?1:0),t&&Ca(t)?(this.width=t.width,this.height=t.height,e.texImage2D(e.TEXTURE_2D,0,a,t.width,t.height,0,r,n,t.data)):t&&!Array.isArray(t)?(this.width=t.width,this.height=t.height,e.texImage2D(e.TEXTURE_2D,0,a,r,n,t)):e.texImage2D(e.TEXTURE_2D,0,a,this.width,this.height,0,r,n,null),this._options.useMipmap&&e.generateMipmap(e.TEXTURE_2D),this._dirty=!1,this._allocated=!0}},Pi=class extends we{target=k.TEXTURE_2D_ARRAY;get flipYArray(){return this._options.flipYArray||[]}_bindAndConfigure(e){e.bindTexture(e.TEXTURE_2D_ARRAY,this._texture),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_MIN_FILTER,this._options.minFilter||e.LINEAR),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_MAG_FILTER,this._options.magFilter||e.LINEAR),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_WRAP_S,this._options.wrapS||e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_WRAP_T,this._options.wrapT||e.CLAMP_TO_EDGE)}_upload(e){let t=this.source||[],A=Math.max(1,t.length),a=e.getParameter(e.MAX_TEXTURE_SIZE),r=e.getParameter(e.MAX_ARRAY_TEXTURE_LAYERS);if(this.width>a||this.height>a||A>r)throw new Error(`Texture array ${this.width}x${this.height}x${A} exceeds WebGL limits ${a}x${a}x${r}.`);let n=this.storageType,o=n===e.HALF_FLOAT?e.RGBA16F:n===e.FLOAT?e.RGBA32F:this._options.sRGB?e.SRGB8_ALPHA8:e.RGBA8;for(;e.getError()!==e.NO_ERROR;);e.texImage3D(e.TEXTURE_2D_ARRAY,0,o,this.width,this.height,A,0,e.RGBA,n,null);let s=e.getError();if(s!==e.NO_ERROR)throw new Error(`WebGL could not allocate texture array ${this.width}x${this.height}x${A} (error 0x${s.toString(16)}).`);t.forEach((l,c)=>{e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,this._options.flipYArray?.[c]??this._options.flipY?1:0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,0),e.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,c,l.width,l.height,1,e.RGBA,n,Ca(l)?l.data:l);let u=e.getError();if(u!==e.NO_ERROR)throw new Error(`WebGL could not upload texture array layer ${c} (error 0x${u.toString(16)}).`)}),this._dirty=!1,this._allocated=!0}bind(e,t){this._ensureTexture(e),e.activeTexture(e.TEXTURE0+t),this._bindAndConfigure(e),(this._dirty||!this._allocated)&&this._upload(e)}},Ii=class{shader;uniforms;defines;_programs=new Map;constructor(e){this.shader=e,this.uniforms=Object.fromEntries(Object.entries(e.uniforms).map(([t,A])=>[t,{...A,value:fc(A.value)}])),this.defines={...e.defines}}set(e,t){if(t===void 0||!this.uniforms[e])return!1;let A=this.uniforms[e].value!==t;return this.uniforms[e].value=t,A}setUniforms(e){Object.entries(e).forEach(([t,A])=>this.set(t,A))}get(e){return this.uniforms[e]?.value}setDefine(e,t){this.defines[e]=t}deleteDefine(e){delete this.defines[e]}getProgram(e){let t={};for(let[n,o]of Object.entries(this.uniforms))Ps(o.type)&&o.value&&(t[`${n.toUpperCase()}_ENABLED`]=null);let A={...this.defines,...t},a=JSON.stringify(A),r=this._programs.get(a);return r||(r=e.createProgram(this.shader,A),this._programs.set(a,r)),r}bind(e){let t=e.gl,A=this.getProgram(e);t.useProgram(A);let a=0;for(let[r,n]of Object.entries(this.uniforms)){let o=t.getUniformLocation(A,r);if(o===null)continue;let s=n.value;Ps(n.type)?((s||e.emptyTexture).bind(t,a),t.uniform1i(o,a++)):dc(t,o,n,s)}}};function fc(i){return Array.isArray(i)?i.slice():i}function Ps(i){return i.includes("sampler")}function uc(i){return i?ArrayBuffer.isView(i)?i:Array.isArray(i)?i.flat(1/0):[i]:[]}function dc(i,e,t,A){if(A==null)return;let a=uc(A);if(t.array){t.type==="int"?i.uniform1iv(e,a):t.type==="vec2"?i.uniform2fv(e,a):t.type==="vec3"?i.uniform3fv(e,a):t.type==="vec4"?i.uniform4fv(e,a):i.uniform1fv(e,a);return}switch(t.type){case"bool":case"int":i.uniform1i(e,Number(A));break;case"float":i.uniform1f(e,Number(A));break;case"vec2":i.uniform2fv(e,a);break;case"vec3":i.uniform3fv(e,a);break;case"vec4":i.uniform4fv(e,a);break;case"ivec2":i.uniform2iv(e,a);break;case"ivec3":i.uniform3iv(e,a);break;case"ivec4":i.uniform4iv(e,a);break;case"mat3":i.uniformMatrix3fv(e,!1,a);break;case"mat4":i.uniformMatrix4fv(e,!1,a);break}}var Is=`#version 300 es
precision highp float;
out vec2 v_Texcoord;
void main() {
vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
v_Texcoord = p;
gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;function pc(i,e){let t=Object.entries(e).filter(([,r])=>r!==!1&&r!==void 0).map(([r,n])=>n===null||n===!0?`#define ${r}`:`#define ${r} ${n}`).join(`
`),A=Object.entries(i.uniforms).map(([r,n])=>{let o=n.array&&isNaN(Number(n.len)),s=`uniform ${n.type} ${r}${n.array?`[${n.len}]`:""};`;return o?`#ifdef ${n.len}
${s}
#endif`:s}).join(`
`),a=i.outputs.map((r,n)=>`layout(location=${n}) out highp vec4 out_${r};`).join(`
`);return`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp sampler2DArray;
${t}
${a}
${A}
in vec2 v_Texcoord;
${i.functions.map(r=>r()).join(`
`)}
${i.main}`}var ya=class{canvas;gl;emptyTexture=new we;_viewport=[0,0,1,1];_viewportStack=[];_programs=new Set;_parallel;_compilationStart=0;_compilationRecords=[];constructor(e){this.canvas=e.canvas;let t=e.canvas.getContext("webgl2",e);if(!t)throw new Error("WebGL 2.0 is required");this.gl=t,t.getExtension("EXT_color_buffer_float"),t.getExtension("OES_texture_float_linear"),this._parallel=e.parallelShaderCompile&&t.getExtension("KHR_parallel_shader_compile")||void 0,this.resize(this.canvas.width,this.canvas.height)}createProgram(e,t){let A=this.gl,a=performance.now();this._compilationRecords.length||(this._compilationStart=a);let r=pc(e,t),n=performance.now()-a,o=Is+r,s=2166136261;for(let p=0;p<o.length;p++)s=Math.imul(s^o.charCodeAt(p),16777619);let l=performance.now(),c=A.createProgram(),u=(p,d)=>{let f=A.createShader(p);if(A.shaderSource(f,d),A.compileShader(f),!A.getShaderParameter(f,A.COMPILE_STATUS)){let m=A.getShaderInfoLog(f);throw A.deleteShader(f),new Error(`${e.name||"WebGL shader"}: ${m}
${d}`)}A.attachShader(c,f),A.deleteShader(f)};if(u(A.VERTEX_SHADER,Is),u(A.FRAGMENT_SHADER,r),A.linkProgram(c),!A.getProgramParameter(c,A.LINK_STATUS))throw new Error(`${e.name||"WebGL program"}: ${A.getProgramInfoLog(c)}`);return this._programs.add(c),this._compilationRecords.push({program:c,label:e.name||"WebGL program",bytes:new TextEncoder().encode(o).byteLength,lines:o.split(`
`).length,fingerprint:(s>>>0).toString(16).padStart(8,"0"),startedAt:a,generationMs:n,creationMs:performance.now()-l,completedAt:this._parallel?void 0:performance.now()}),c}getShaderCompilationDiagnostics(){let e=performance.now(),t=this._compilationRecords;for(let s of t)s.completedAt===void 0&&(!this._parallel||this.gl.getProgramParameter(s.program,this._parallel.COMPLETION_STATUS_KHR))&&(s.completedAt=e);let A=t.filter(s=>s.completedAt!==void 0),a=A.length===t.length&&t.length>0?Math.max(...A.map(s=>s.completedAt))-this._compilationStart:void 0,r=t.flatMap(s=>[{time:s.startedAt,change:1},...s.completedAt===void 0?[]:[{time:s.completedAt,change:-1}]]).sort((s,l)=>s.time-l.time||s.change-l.change),n=0,o=0;for(let s of r)n+=s.change,o=Math.max(o,n);return{status:A.length===t.length?"ready":"compiling",sourceBytes:t.reduce((s,l)=>s+l.bytes,0),sourceLines:t.reduce((s,l)=>s+l.lines,0),pipelineCount:t.length,completedPipelineCount:A.length,sourceGenerationTimeMs:t.reduce((s,l)=>s+l.generationMs,0),moduleCreationTimeMs:t.reduce((s,l)=>s+l.creationMs,0),modules:t.map(s=>({label:s.label,sourceBytes:s.bytes,sourceLines:s.lines,sourceFingerprint:s.fingerprint})),pipelines:t.map(s=>({label:s.label,entryPoint:"main",firstFrameRequired:!0,status:s.completedAt===void 0?"compiling":"ready",startedAtMs:s.startedAt-this._compilationStart,endedAtMs:s.completedAt===void 0?void 0:s.completedAt-this._compilationStart,durationMs:s.completedAt===void 0?void 0:s.completedAt-s.startedAt})),maximumConcurrentPipelineCount:this._parallel?t.length:Math.min(t.length,1),peakConcurrentPipelineCount:o,pipelineCompilationTimeMs:a,totalTimeMs:a}}isAllProgramCompiled(){if(!this._parallel)return!0;for(let e of this._programs)if(!this.gl.getProgramParameter(e,this._parallel.COMPLETION_STATUS_KHR))return!1;return!0}resize(e,t){this.canvas.width=e,this.canvas.height=t,this.setViewport(0,0,e,t)}getWidth(){return this.canvas.width}getHeight(){return this.canvas.height}saveViewport(){this._viewportStack.push([...this._viewport])}restoreViewport(){let e=this._viewportStack.pop();e&&this.setViewport(...e)}setViewport(e,t,A,a){this._viewport=[e,t,A,a],this.gl.viewport(e,t,A,a)}dispose(){this._programs.forEach(e=>this.gl.deleteProgram(e)),this._programs.clear(),this._compilationRecords=[],this.emptyTexture.dispose(this.gl)}},uA=class{_frameBuffer;_attachments=[];attach(e){this._attachments=[e]}bind(e,t,A=e.gl.FRAMEBUFFER){let a=e.gl,r=this._attachments.length;t&&(this._attachments=t),t=this._attachments,this._frameBuffer||=a.createFramebuffer(),a.bindFramebuffer(A,this._frameBuffer);for(let n=t.length;n<r;n++)a.framebufferTexture2D(A,a.COLOR_ATTACHMENT0+n,a.TEXTURE_2D,null,0);t.forEach((n,o)=>{n.bind(a,0),a.framebufferTexture2D(A,a.COLOR_ATTACHMENT0+o,a.TEXTURE_2D,n.getWebGLTexture(a),0)}),A!==a.READ_FRAMEBUFFER&&a.drawBuffers(t.map((n,o)=>a.COLOR_ATTACHMENT0+o))}dispose(e){this._frameBuffer&&e.gl.deleteFramebuffer(this._frameBuffer),this._frameBuffer=void 0}};function Ds(i,e){let t={textures:[],indices:{}};for(let A of e)t.indices[A]=mc(i,A,t.textures);return t}function mc(i,e,t){let A=[];for(let a of i)if(!(a[e]&&a[e].image))A.push(-1);else{let n=t.indexOf(a[e]);n>=0?A.push(n):(A.push(t.length),t.push(a[e]))}return A}function gc(i,e){let t=new i.constructor(e);return t.set(i),t}function Xt(i){let e=Math.round(Math.log2(Math.sqrt(i))),t=2**e,A=Math.ceil(i/t);return{columnsLog:e,columns:t,rows:A,size:A*t}}function qe(i,e,t){let A=Xt(e.length/t);return i.source={data:gc(e,A.size*t),width:A.columns,height:A.rows},A}var Ma={wrapS:k.CLAMP_TO_EDGE,wrapT:k.CLAMP_TO_EDGE,type:k.FLOAT,minFilter:k.LINEAR,magFilter:k.LINEAR,flipY:!1,useMipmap:!1},Je={wrapS:k.CLAMP_TO_EDGE,wrapT:k.CLAMP_TO_EDGE,minFilter:k.NEAREST,magFilter:k.NEAREST,type:k.FLOAT,flipY:!1,useMipmap:!1};var Bt=384*1024*1024;function Di(i){return!i.thinWalled&&(i.transmissionWeight>0&&i.transmissionDepth>0||i.subsurfaceWeight>0)}var Ke={none:0,spherical:1,cylindrical:2,triplanar:3};function Ss(i,e,t){let A=[],a=new Array(i.length),r=i.map((n,o)=>({height:Math.max(1,Math.floor(n.image.height*t)),index:o,width:Math.max(1,Math.floor(n.image.width*t))})).sort((n,o)=>o.height-n.height||o.width-n.width);for(let n of r){let o;for(let s=0;s<A.length&&!o;s++){let l=A[s];for(let c of l.shelves)if(n.height<=c.height&&c.x+n.width<=e){o={...n,layer:s,x:c.x,y:c.y},c.x+=n.width;break}!o&&l.nextY+n.height<=e&&(o={...n,layer:s,x:0,y:l.nextY},l.shelves.push({height:n.height,x:n.width,y:l.nextY}),l.nextY+=n.height)}if(!o){let s=A.length;o={...n,layer:s,x:0,y:0},A.push({nextY:n.height,placements:[],shelves:[{height:n.height,x:n.width,y:0}]})}A[o.layer].placements.push(o),a[n.index]=o}return{pages:A,placements:a}}function Us(i,e){return nt(i,e)}function hc(i,e,t,A,a){let r=a?new Uint16Array(i*e*4):new Uint8Array(i*e*4),n=t.placements.filter(o=>!gt(A[o.index].image));if(n.length){let s=Us(i,e).getContext("2d");if(!s)throw new Error("Unable to create a canvas for the texture atlas.");for(let c of n)Ls(s,c,A[c.index]);let l=s.getImageData(0,0,i,e).data;for(let c=0;c<l.length;c++)r[c]=a?Kr(l[c]/255):l[c]}for(let o of t.placements){let s=A[o.index],l=s.image;if(!gt(l))continue;let c=l.data instanceof Uint8Array||l.data instanceof Uint8ClampedArray;if(!c&&!(l.data instanceof Float32Array)&&!(l.data instanceof Int32Array))throw new Error("Material texture data must be Uint8Array, Uint8ClampedArray, Float32Array or Int32Array.");if(l.data.length!==l.width*l.height*4)throw new Error("Material texture RGBA source length does not match its dimensions.");for(let u=0;u<o.height;u++){let p=Math.min(l.height-1,Math.floor((u+.5)*l.height/o.height));s.flipY&&(p=l.height-1-p);for(let d=0;d<o.width;d++){let f=Math.min(l.width-1,Math.floor((d+.5)*l.width/o.width)),m=(p*l.width+f)*4,g=((o.y+u)*i+o.x+d)*4;for(let h=0;h<4;h++){let B=l.data[m+h];r[g+h]=a?Kr(c?B/255:B):B}}}}return{data:r,width:i,height:e}}function Ls(i,e,t){t.flipY?(i.save(),i.translate(e.x,e.y+e.height),i.scale(1,-1),i.drawImage(t.image,0,0,e.width,e.height),i.restore()):i.drawImage(t.image,e.x,e.y,e.width,e.height)}function Bc(i,e=!1,t={}){let A=performance.now();if(!i.length)return{mapInfo:[],mapTransform:[],mapUvChannel:[],mapColorLinear:[],stats:{estimatedBytes:0,height:1,layers:0,packTimeMs:performance.now()-A,scale:1,sourcePixels:0,textureCount:0,width:1},texture:new Pi({width:1,height:1,sRGB:e,source:[],minFilter:k.LINEAR,magFilter:k.LINEAR,wrapS:k.CLAMP_TO_EDGE,wrapT:k.CLAMP_TO_EDGE})};let a=i.some(P=>gt(P.image)),r=i.map(P=>{let D=P.image;return Number(gt(D)&&!(D.data instanceof Uint8Array)&&!(D.data instanceof Uint8ClampedArray))}),n=r.some(Boolean),o=n?8:4,s=t.maxTextureArrayLayers??1/0,l=t.maxTextureDimension2D??1/0,c=t.maxTextureArrayBytes??Bt,u=i.reduce((P,D)=>P+D.image.width*D.image.height,0),p=i.reduce((P,D)=>Math.max(P,D.image.width,D.image.height),1),d=Math.max(1,Math.floor(Math.sqrt(c/o))),f=Math.max(1,Math.floor(Math.min(p,l,d))),m=f*f*o,g=Math.max(1,Math.min(s,Math.floor(c/m))),h=Math.min(1,f/p),B=Ss(i,f,h),_=h;if(B.pages.length>g){let P=0,D=h,V,$=0;for(let v=0;v<14;v++){let U=(P+D)/2,I=Ss(i,f,U);I.pages.length<=g?(P=U,$=U,V=I):D=U}if(!V)throw new Error(`Unable to fit ${i.length} textures into ${g} atlas layers.`);B=V,_=$}let E=Math.max(1,...B.placements.map(P=>P.x+P.width)),Q=Math.max(1,...B.placements.map(P=>P.y+P.height)),w=B.pages.map(P=>{if(a)return hc(E,Q,P,i,n);let D=Us(E,Q),V=D.getContext("2d");if(!V)throw new Error("Unable to create a canvas for the texture atlas.");for(let $ of P.placements)Ls(V,$,i[$.index]);return D});_<.999&&console.warn(`Texture atlas downscaled to ${(_*100).toFixed(1)}% to fit the GPU budget.`);let x=B.placements.flatMap(P=>{let D=(P.x+.5)/E,V=(P.y+.5)/Q;return[Math.max(P.width-1,0)/E,Math.max(P.height-1,0)/Q,P.layer+D,V]});return{texture:new Pi({width:E,height:Q,sRGB:e,type:n?k.HALF_FLOAT:k.UNSIGNED_BYTE,source:w,flipY:!1,flipYArray:w.map(()=>!1),minFilter:k.LINEAR,magFilter:k.LINEAR,wrapS:k.CLAMP_TO_EDGE,wrapT:k.CLAMP_TO_EDGE}),mapInfo:x,mapTransform:i.flatMap(P=>[P.uvScale[0],P.uvScale[1],P.uvOffset[0],P.uvOffset[1]]),mapUvChannel:i.map(P=>P.uvChannel),mapColorLinear:r,stats:{estimatedBytes:E*Q*w.length*o,height:Q,layers:w.length,packTimeMs:performance.now()-A,scale:_,sourcePixels:u,textureCount:i.length,width:E}}}function ht(i,e=0){return[0,1,2].map(t=>{let A=Number(i[t]);return Number.isFinite(A)?Math.min(1,Math.max(0,A)):e})}function vc(){return{anisotropy:0,extinction:[0,0,0],scattering:[0,0,0]}}function Ec(i){let e=Math.min(1,Math.max(0,i.transmissionWeight)),t=Math.max(0,i.transmissionDepth);if(e<=0||t<=0||i.thinWalled)return;let A=ht(i.transmissionColor,1),a=ht(i.transmissionScatter),r=A.map(o=>Math.max(0,-Math.log(Math.max(o,1e-6))/t)),n=a.map((o,s)=>r[s]*o);return{anisotropy:Math.min(.999,Math.max(-.999,i.transmissionScatterAnisotropy)),extinction:r,scattering:n}}function wc(i){if(Math.min(1,Math.max(0,i.subsurfaceWeight))<=0||i.thinWalled)return;let t=Math.max(i.subsurfaceRadius,.001),A=ht(i.subsurfaceRadiusScale,1),a=ht(i.subsurfaceColor),r=Math.min(.999,Math.max(-.999,i.subsurfaceAnisotropy)),n=A.map(s=>1/Math.max(t*s,.001)),o=a.map((s,l)=>{let c=4.09712+4.20863*s-Math.sqrt(9.59217+41.6808*s+17.7126*s*s),u=c*c,p=Math.min(1,Math.max(0,(1-u)/(1-r*u)));return n[l]*p});return{anisotropy:r,extinction:n,scattering:o}}function _c(i,e,t){let A=e?Math.min(1,Math.max(0,i.transmissionWeight)):0,a=t?(1-A)*Math.min(1,Math.max(0,i.subsurfaceWeight)):0,r=A+a;if(r<=0)return;let n=A/r,o=a/r,s=[0,1,2].map(u=>{let p=e?e.extinction[u]-e.scattering[u]:0,d=t?t.extinction[u]-t.scattering[u]:0,f=p*n+d*o,m=(e?.scattering[u]||0)*n+(t?.scattering[u]||0)*o;return Math.max(0,f+m)}),l=[0,1,2].map(u=>(e?.scattering[u]||0)*n+(t?.scattering[u]||0)*o);return{anisotropy:(e?.anisotropy||0)*n+(t?.anisotropy||0)*o,extinction:s,scattering:l}}function Qc(i){return _c(i,Ec(i),wc(i))??vc()}var Xr=class{texture;textureAtlasStats;defines={};bufferData;_matBufferTex=new we(Je);_materialBufferColumnsLog=0;_displacementMaps=[];_lightTexturesIndices=[];constructor(e,t,A={}){let a=Ds(e,Vr);this._displacementMaps=a.indices.displacementMap.map(m=>a.textures[m]).filter(m=>!!m);let r=this._packParams(e),n=a.textures.slice(),o=[];for(let m=0;m<t.length;m++){let g=t[m];g.type==="RectLight"&&g.texture?(o.push(n.length),n.push(g.texture)):o.push(-1)}let{mapInfo:s,mapTransform:l,mapUvChannel:c,mapColorLinear:u,stats:p,texture:d}=Bc(n,!1,A);this.texture=d,this.textureAtlasStats=p,r.mapInfo=s,r.mapTransform=l,r.mapUvChannel=c,r.mapColorLinear=u;for(let m of YA)r[m.index]=a.indices[m.property];this.bufferData=r,this._lightTexturesIndices=o;function f(m){return m.filter(g=>g>=0).length}this.defines={NUM_MAPS:n.length,...Object.fromEntries(YA.flatMap(m=>m.define?[[m.define,f(a.indices[m.property])]]:[]))},this._updateBuffer()}_packParams(e){let t=e.map(Qc);return{color:e.map(A=>A.baseColor.slice(0,3)),roughness:e.map(A=>A.specularAnisotropyModel==="gltf"?Tr(A.specularRoughness,.3):A.specularRoughness),emission:e.map(Kt),metallic:e.map(A=>A.baseMetalness),ior:e.map(A=>A.specularIor),dispersion:e.map(A=>A.transmissionDispersionScale),thin:e.map(A=>+A.thinWalled),bevelSize:e.map(A=>A.bevelSize),transmission:e.map(A=>A.transmissionWeight),anisotropy:e.map(A=>A.specularAnisotropyModel==="gltf"?Tr(A.specularAnisotropy,0):A.specularAnisotropy),specularAnisotropyModel:e.map(A=>TA(A.specularAnisotropyModel)),thinFilmThickness:e.map(A=>Rr(A.thinFilmThickness,.5)),thinFilmThicknessMinimum:e.map(A=>Rr(A.thinFilmThicknessMinimum,0)),thinFilmMapChannel:e.map(A=>RA(A.thinFilmMapChannel)),thinFilmIor:e.map(A=>A.thinFilmIor),normalScale:e.map(A=>A.normalScale),mapAlphaUsage:e.map(A=>pt[A.mapAlphaUsage]),type:e.map(A=>A.shadowCatcher?3:A.unlit?2:0),mediumType:e.map(A=>Number(Di(A))),specularAnisotropyRotation:e.map(A=>Number.isFinite(A.specularAnisotropyRotation)?A.specularAnisotropyRotation:0),coatAnisotropyRotation:e.map(A=>Number.isFinite(A.coatAnisotropyRotation)?A.coatAnisotropyRotation:0),coatNormalScale:e.map(A=>A.coatNormalScale),uvProjection:e.map(A=>Ke[A.uvProjection]||0),uvScale:e.map(A=>A.uvProjectionScale||[1,1]),displacementUvProjection:e.map(A=>Ke[A.displacementUvProjection]||0),displacementUvProjectionScale:e.map(A=>A.displacementUvProjectionScale||1),displacementBias:e.map(A=>A.displacementBias),displacementStepSize:e.map(A=>Number.isFinite(A.displacementStepSize)&&A.displacementStepSize>0?A.displacementStepSize:0),alpha:e.map(A=>A.opacity),alphaMode:e.map(A=>dt[Jt(A)]),alphaCutoff:e.map(A=>Math.max(0,A.alphaCutoff)),doubleSided:e.map(A=>Number(A.doubleSided)),baseWeight:e.map(A=>A.baseWeight),baseDiffuseRoughness:e.map(A=>A.baseDiffuseRoughness),specularWeight:e.map(A=>A.specularWeight),specularColor:e.map(A=>ht(A.specularColor,1)),transmissionColor:e.map(A=>ht(A.transmissionColor,1)),transmissionDepth:e.map(A=>Math.max(0,A.transmissionDepth)),transmissionScatter:e.map(A=>ht(A.transmissionScatter)),transmissionScatterAnisotropy:e.map(A=>A.transmissionScatterAnisotropy),subsurfaceWeight:e.map(A=>A.subsurfaceWeight),subsurfaceColor:e.map(A=>ht(A.subsurfaceColor)),subsurfaceRadius:e.map(A=>Math.max(0,A.subsurfaceRadius)),subsurfaceRadiusScale:e.map(A=>ht(A.subsurfaceRadiusScale)),subsurfaceScatterAnisotropy:e.map(A=>A.subsurfaceAnisotropy),fuzzWeight:e.map(A=>A.fuzzWeight),fuzzColor:e.map(A=>ht(A.fuzzColor,1)),fuzzRoughness:e.map(A=>A.fuzzRoughness),coatWeight:e.map(A=>A.coatWeight),coatColor:e.map(A=>ht(A.coatColor,1)),coatRoughness:e.map(A=>A.coatRoughness),coatAnisotropy:e.map(A=>A.coatAnisotropy),coatIor:e.map(A=>A.coatIor),coatDarkening:e.map(A=>A.coatDarkening),thinFilmWeight:e.map(A=>A.thinFilmWeight),dispersionAbbeNumber:e.map(A=>A.transmissionDispersionAbbeNumber),mediumExtinction:t.map(A=>A.extinction),mediumScattering:t.map(A=>A.scattering),mediumAnisotropy:t.map(A=>A.anisotropy)}}repackParams(e){Object.assign(this.bufferData,this._packParams(e)),this._updateBuffer()}getBufferArray(){return _s(this.bufferData)}getDisplacementMaps(){return this._displacementMaps}getLightTexturesIndices(){return this._lightTexturesIndices}_updateBuffer(){this._materialBufferColumnsLog=qe(this._matBufferTex,this.getBufferArray(),4).columnsLog}setToPass(e){e.setUniform("map",this.texture||null),e.setUniform("mapInfo",this.bufferData.mapInfo),e.setUniform("mapTransform",this.bufferData.mapTransform),e.setUniform("mapUvChannel",this.bufferData.mapUvChannel),e.setUniform("mapColorLinear",this.bufferData.mapColorLinear),e.setUniforms({materialBuffer:this._matBufferTex,materialBufferColumns:this._materialBufferColumnsLog})}dispose(e){this.texture?.dispose(e),this._matBufferTex.dispose(e)}},jA=Xr;var xt=class extends Error{constructor(e){super(e),this.name="BvhWorkerUnavailableError"}},$t=class extends Error{constructor(){super("BVH worker pool was disposed."),this.name="BvhWorkerDisposedError"}};function Si(i){if(i!=="auto"){if(!Number.isSafeInteger(i)||i<1)throw new RangeError('bvhWorkerCount must be "auto" or a positive safe integer.');return i}let e=typeof navigator>"u"?2:navigator.hardwareConcurrency;return Number.isFinite(e)?Math.max(1,Math.min(4,Math.floor(e)-1)):1}var $r=class{worker;nextId=0;pending=new Map;failed=!1;constructor(e){this.worker=e,e.onmessage=({data:t})=>{let A=this.pending.get(t.id);A&&(this.pending.delete(t.id),"error"in t?A.reject(new Error(t.error)):A.resolve(t.bvh))},e.onerror=t=>{t.preventDefault(),this.fail(new xt(t.message||"BVH worker failed."))},e.onmessageerror=()=>this.fail(new xt("Unable to receive BVH worker result."))}fail(e){this.failed||(this.failed=!0,this.worker.onmessage=this.worker.onerror=this.worker.onmessageerror=null,this.worker.terminate(),this.pending.forEach(t=>t.reject(e)),this.pending.clear())}dispose(){this.fail(new $t)}build(e){if(this.failed)return Promise.reject(new xt("BVH worker is unavailable."));let t=this.nextId++;return new Promise((A,a)=>{this.pending.set(t,{resolve:A,reject:a});try{let r={...e.position,array:e.position.array.slice()},n={...e.indices,array:e.indices.array.slice()},o=e.normal&&{...e.normal,array:e.normal.array.slice()},s=e.trianglesDisplacement?.slice(),l=[r.array.buffer,n.array.buffer];o&&l.push(o.array.buffer),s&&l.push(s.buffer),this.worker.postMessage({...e,id:t,position:r,indices:n,normal:o,trianglesDisplacement:s},l)}catch(r){this.fail(new xt(r instanceof Error?r.message:String(r)))}})}},dA=class{size;slots=[];queue=[];stopped;constructor(e){this.size=e,Si(e)}build(e){return this.stopped?Promise.reject(this.stopped):new Promise((t,A)=>{this.queue.push({request:e,resolve:t,reject:A}),this.dispatch()})}stop(e){this.stopped??=e;for(let t of this.queue.splice(0))t.reject(this.stopped)}dispatch(){for(;this.queue.length&&!this.stopped;){let e=this.slots.find(a=>!a.busy);if(!e){if(this.slots.length>=this.size)return;try{e={client:new $r(new Worker(new URL("./bvh.worker.js",import.meta.url),{type:"module"})),busy:!1},this.slots.push(e)}catch(a){this.stop(new xt(a instanceof Error?a.message:String(a)));return}}let t=this.queue.shift(),A=e;A.busy=!0,A.client.build(t.request).then(t.resolve,a=>{a instanceof xt&&this.stop(a),t.reject(a)}).finally(()=>{A.busy=!1,this.dispatch()})}}dispose(){this.stop(new $t);for(let e of this.slots)e.client.dispose();this.slots=[]}};function Zr(){return typeof Worker<"u"}async function Os(i,e=0,t,A="builtin",a="bvh2",r=!1,n){let o=n??new dA(1);try{return await o.build({position:i.position,normal:t?i.normal:void 0,indices:i.indices,dynamic:i.dynamic,builder:A,layout:a,displacementScale:e,trianglesDisplacement:t,spatialSplits:r})}finally{n||o.dispose()}}var Ti=["webgpu","webgl"],Pa=[{key:"bvhBuilder",default:"builtin",kind:"bvh",backends:Ti,parameter:"builder"},{key:"bvhLayout",default:"bvh2",kind:"bvh",backends:Ti,parameter:"layout"},{key:"bvhSpatialSplits",default:!1,kind:"bvh",backends:Ti,parameter:"spatialSplits"},{key:"bvhWorkerCount",default:"auto",kind:"bvh",backends:Ti,normalize:Si},{key:"textureAtlasBudgetBytes",default:Bt,kind:"resources",backends:Ti}];function Fs(i){return Object.fromEntries(Pa.flatMap(e=>"parameter"in e?[[e.parameter,i[e.key]]]:[]))}function Ns(i,e){return JSON.stringify(Pa.filter(t=>t.kind===e&&!("normalize"in t)).map(t=>i[t.key]))}function zs(i){let e=Pa.find(t=>"normalize"in t);return"normalize"in e?e.normalize(i.bvhWorkerCount):1}function Ia(i){let e=Pa.find(t=>t.kind==="resources");return i[e.key]}var bc={maxStorageBuffersPerShaderStage:8,maxStorageBufferBindingSize:12288,maxBufferSize:12288,maxSampledTexturesPerShaderStage:8,maxStorageTexturesPerShaderStage:1,maxComputeWorkgroupStorageSize:0,maxComputeWorkgroupSizeX:64,maxComputeWorkgroupSizeY:16,maxComputeInvocationsPerWorkgroup:256,maxBindGroups:4};function en(i){let e=[];for(let[t,A]of Object.entries(bc)){let a=i.limits[t];(typeof a!="number"||a<A)&&e.push(`${t}: requires ${A}, actual ${a}`)}if(e.length)throw new Error(`GPUDevice does not meet MuTracer requirements:
${e.join(`
`)}`)}function tn(i){let e=[];for(let a of["timestamp-query","bgra8unorm-storage","shader-f16","subgroups","texture-formats-tier1","texture-formats-tier2","float32-filterable"])i.features.has(a)&&e.push(a);let t=i.limits,A={};for(let a of["maxComputeWorkgroupStorageSize","maxComputeWorkgroupsPerDimension","maxStorageBufferBindingSize","maxStorageBuffersPerShaderStage","maxSampledTexturesPerShaderStage","maxStorageTexturesPerShaderStage","maxBufferSize","maxTextureArrayLayers","maxComputeWorkgroupSizeX","maxComputeInvocationsPerWorkgroup"])A[a]=t[a];return{requiredFeatures:e,requiredLimits:A}}function Ri(i){let e=i.clone();return e.transform=i.transform.slice(),e}var lt=["webgpu","webgl"],xc={toneMapping:{key:"toneMapping",default:"agx",kind:"display",backends:lt,group:"toneMapping",parameter:"toneMapping"},toneMappingExposure:{key:"toneMappingExposure",default:1,kind:"display",backends:lt,group:"toneMapping",parameter:"exposure"},contrast:{key:"contrast",default:1,kind:"display",backends:lt,group:"toneMapping",parameter:"contrast"},saturation:{key:"saturation",default:1,kind:"display",backends:lt,group:"toneMapping",parameter:"saturation"},temperature:{key:"temperature",default:0,kind:"display",backends:lt,group:"toneMapping",parameter:"temperature"},tint:{key:"tint",default:0,kind:"display",backends:lt,group:"toneMapping",parameter:"tint"},vignette:{key:"vignette",default:0,kind:"display",backends:lt,group:"toneMapping",parameter:"vignette"},bloomIntensity:{key:"bloomIntensity",default:0,kind:"display",backends:lt,group:"bloom",parameter:"intensity"},bloomThreshold:{key:"bloomThreshold",default:1,kind:"display",backends:lt,group:"bloom",parameter:"threshold"},bloomRadius:{key:"bloomRadius",default:.6,kind:"display",backends:lt,group:"bloom",parameter:"radius"},hdrOutputEnabled:{key:"hdrOutputEnabled",default:!1,kind:"display",backends:["webgpu"],group:"hdr",parameter:"enabled"},channel:{key:"channel",default:"final",kind:"display",backends:lt,group:"channel",parameter:"channel"},shadowCatcherColor:{key:"shadowCatcherColor",default:[0,0,0],kind:"display",backends:lt,group:"catcher",parameter:"color"},shadowCatcherAlpha:{key:"shadowCatcherAlpha",default:1,kind:"display",backends:lt,group:"catcher",parameter:"alpha"}},ks=Object.values(xc);function Gs(i){return JSON.stringify(ks.map(e=>i[e.key]))}function Hs(i,e){let t=new Map;for(let A of ks){let a=t.get(A.group);a||t.set(A.group,a={}),a[A.parameter]=i[A.key]}e.setToneMappingParams(t.get("toneMapping")),e.setBloomParams(t.get("bloom")),e.setHDROutputEnabled?.(t.get("hdr").enabled),e.setOutput(t.get("channel").channel),e.setShadowCatcherParams(t.get("catcher").color,t.get("catcher").alpha)}var VA=class i{engine;canvas;toneMapping="agx";toneMappingExposure=1;contrast=1;saturation=1;temperature=0;tint=0;vignette=0;bloomIntensity=0;bloomThreshold=1;bloomRadius=.6;hdrOutputEnabled=!1;channel="final";shadowCatcherColor=[0,0,0];shadowCatcherAlpha=1;constructor(e,t){this.engine=e,this.canvas=t}static _create(e,t){return new i(e,t)}setSize(e,t){if(!Number.isFinite(e)||!Number.isFinite(t)||e<1||t<1)throw new Error("Display dimensions must be positive.");e=Math.round(e),t=Math.round(t),this.canvas.width!==e&&(this.canvas.width=e),this.canvas.height!==t&&(this.canvas.height=t)}settings=new WeakMap;_configure(e){if(e._engine!==this.engine)throw new Error("Render belongs to another engine.");let t=e._output;if(!t)return;let A=Gs(this),a=this.settings.get(e);a!==A&&(this.settings.set(e,A),a!==void 0&&e._displayChanged()),t.activate(),Hs(this,t)}_postProcesses=[];_warnedPostProcess=!1;addPostProcess(e){let t={pass:e};return this._postProcesses.push(t),this.engine.backend==="webgl"&&this.warnPostProcess(),()=>{let A=this._postProcesses.indexOf(t);A>=0&&this._postProcesses.splice(A,1)}}warnPostProcess(){this._warnedPostProcess||(this._warnedPostProcess=!0,console.warn("Display post-processing requires WebGPU; passes are ignored on WebGL."))}compose(e){if(e._engine!==this.engine)throw new Error("Render belongs to another engine.");let t=e._output;if(t?.presentationComplete){this._configure(e),t.drawPostProcess(),this._postProcesses.length&&this.engine.backend==="webgl"&&this.warnPostProcess();try{t.applyPostProcesses?.(this._postProcesses.map(A=>A.pass),e)}catch(A){this.engine._notifyError(A)}return t}}present(e){if(e._engine!==this.engine)throw new Error("Render belongs to another engine.");let t=this.channel==="final"&&e.fallback?e._presentable:e._complete,A=e.fallback,a=t?e:A&&(this.channel==="final"?A._presentable:A._complete)?A:void 0;if(!a)return;let r=this.compose(a);if(r)return this.engine._present(r),a}async toBlob(e,t={}){let A=this.compose(e);if(!A)throw new Error("Render has no complete image.");let a=await A.readPresentation(),r=nt(a.width,a.height,"convertToBlob"in this.canvas),n=r.getContext("2d");if(!n)throw new Error("The image encoding context is not available.");let o=new Uint8ClampedArray(a.data.length);for(let s=0;s<o.length;s++)o[s]=Math.round(Math.min(1,Math.max(0,a.data[s]))*255);return n.putImageData(new ImageData(o,a.width,a.height),0,0),"convertToBlob"in r?r.convertToBlob({type:t.type??"image/png",quality:t.quality}):new Promise((s,l)=>r.toBlob(c=>c?s(c):l(new Error("The image could not be encoded")),t.type??"image/png",t.quality))}};var Zt=class{listeners=new Map;on(e,t){let A=this.listeners.get(e);return A||this.listeners.set(e,A=new Set),A.add(t),()=>{A.delete(t)}}emit(e,t){for(let A of[...this.listeners.get(e)??[]])try{A(t)}catch(a){console.error("Event listener failed.",a)}}clear(){this.listeners.clear()}};var Da=new WeakMap;function Ws(i,e){let t=me(i),A=Da.get(i)??(t?{builder:t.builder??"builtin",layout:t.layout??"bvh2",spatialSplits:!1}:void 0);return!!A&&A.builder===e.builder&&A.layout===e.layout&&A.spatialSplits===e.spatialSplits}var An=new WeakMap;function me(i){return An.get(i)}function Xe(i,e,t){e?(An.set(i,e),t?Da.set(i,{...t}):Da.delete(i)):(An.delete(i),Da.delete(i))}var Sa=class{copies=new WeakMap;geometryVersions=new WeakMap;instanceVersions=new WeakMap;value;copying=new WeakSet;copy(e,t=!1){if(!e||typeof e!="object")return e;let A=e;if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&A instanceof HTMLCanvasElement||typeof OffscreenCanvas<"u"&&A instanceof OffscreenCanvas||typeof ImageBitmap<"u"&&A instanceof ImageBitmap){let r=A,n=this.copies.get(A);n||(n=nt(r.width,r.height),this.copies.set(A,n)),n.width=r.width,n.height=r.height;let o=n.getContext("2d");if(!o)throw new Error("Texture snapshot context is not available.");return o.drawImage(r,0,0),n}if(typeof Node<"u"&&A instanceof Node)return e;if(e instanceof Ge&&this.geometryVersions.get(e)===e.version)return this.copies.get(e);if(ArrayBuffer.isView(e)){let r=this.copies.get(A);if(r?.constructor===e.constructor&&r.length===e.length)return r.set(e),r;let n=e.slice();return this.copies.set(A,n),n}if(e instanceof ArrayBuffer)return e.slice(0);let a=this.copies.get(A);if(a||(a=Array.isArray(e)?[]:Object.create(Object.getPrototypeOf(e)),this.copies.set(A,a)),this.copying.has(A))return a;this.copying.add(A);try{for(let r of Object.keys(e))if(e instanceof ie&&(r==="transforms"||r==="colors")){let n=this.instanceVersions.get(e),o=r==="transforms"?e.transformsVersion:e.colorsVersion,s=r==="transforms"?n?.transformsVersion:n?.colorsVersion,l=e[r];(!n||s!==o||n[r]!==l)&&(l?n?.[r]===l&&a[r]?.length===l.length?a[r].set(l):a[r]=l.slice():a[r]=void 0)}else a[r]=e instanceof He&&r==="source"?e.source:this.copy(e[r],t)}finally{this.copying.delete(A)}if(Array.isArray(e)&&(a.length=e.length),e instanceof ie&&this.instanceVersions.set(e,{transformsVersion:e.transformsVersion,transforms:e.transforms,colorsVersion:e.colorsVersion,colors:e.colors}),e instanceof Ge){this.geometryVersions.set(e,e.version);let r=me(e);(r||!t)&&Xe(a,r),hs(e,a)}return a}mirror(e){return this.copies.get(e)}capture(e,t){if(!this.value||t.meshes==="full")this.value={meshes:this.copy(e.meshes),lights:this.copy(e.lights),background:this.copy(e.background)};else{for(let A of t.transforms)this.copy(A.transform),A instanceof ie&&this.copy(A,!0);for(let A of t.colors)this.copy(A,!0);for(let A of t.geometries)this.copy(A,!0);for(let A of t.materials)this.copy(A);t.lights&&(this.value.lights=this.copy(e.lights)),t.background&&(this.value.background=this.copy(e.background))}return this.value}};function js(i,e,t=[],A=[],a=[]){Gi(i);let r=i.length,n=6,o=new Float32Array(r*n*4);function s(l,c){for(let u=0;u<3;u++)o[u+l*4]=c[u]}for(let l=0;l<r;l++){let c=i[l],u=c.color,p=c.intensity,d=l*n;s(d,c.position),o[d*4+3]=t[l]??1/Math.max(r,1);let f=c.type==="SpotLight"?ki(c):p;s(d+1,[u[0]*f,u[1]*f,u[2]*f]),o[(d+1)*4+3]=A[l]??(l+1)/r,c.type==="RectLight"?(s(d+2,Li(c,0)),o[(d+2)*4+3]=c.spread,s(d+3,Li(c,1)),o[(d+3)*4+3]=e[l]??-1,s(d+4,[c.spread,Fi(c),3])):c.type==="SphereLight"?s(d+4,[c.radius,Ni(c),2]):c.type==="SpotLight"?(s(d+2,Ui(c)),s(d+3,[Math.cos(c.outerAngle*Math.PI/180),Math.min(1,Math.max(0,1-c.innerAngle/c.outerAngle)),0]),o[(d+3)*4+3]=a[l]??-1,s(d+4,[c.radius,zi(c),4])):c.type==="DirectionalLight"&&(s(d+2,Ui(c)),s(d+4,[0,0,1])),s(d+5,Oi(c).x)}return o}function Oi(i){let e=i.transform,t=(o,s)=>{let l=Math.hypot(o[0],o[1],o[2]);return l>1e-12?[o[0]/l,o[1]/l,o[2]/l]:s},A=t([e[8],e[9],e[10]],[0,0,1]),a=e[0]*A[0]+e[1]*A[1]+e[2]*A[2],r=[e[0]-a*A[0],e[1]-a*A[1],e[2]-a*A[2]];Math.hypot(...r)<=1e-12&&(r=Math.abs(A[1])<.99?[A[2],0,-A[0]]:[1,0,0]),r=t(r,[1,0,0]);let n=[A[1]*r[2]-A[2]*r[1],A[2]*r[0]-A[0]*r[2],A[0]*r[1]-A[1]*r[0]];return{x:r,y:n,direction:[-A[0]||0,-A[1]||0,-A[2]||0]}}function Ui(i){return Oi(i).direction}function Li(i,e){let t=Oi(i),A=e?t.y:t.x,a=i.size[e]*(e?-1:1);return[A[0]*a,A[1]*a,A[2]*a]}function Fi(i){return i.size[0]*i.size[1]}function Ni(i){return 4*Math.PI*i.radius**2}function zi(i){return 4*Math.PI*i.radius**2}function ki(i){return i.radius===0?i.intensity:i.intensity/(Math.PI*i.radius**2)}function an(i){let e=Math.cos(i.outerAngle*Math.PI/180),t=Math.min(1,Math.max(0,1-i.innerAngle/i.outerAngle));return(1-e)*(1-.5*t)*.5}var Ys=new WeakSet;function Gi(i,e){for(let t of i){if(t.type==="EnvironmentLight")continue;let A=!1,a=(r,n,o,s)=>{let l=Math.min(o,Math.max(n,Number.isFinite(r)?r:s));return A||=!Object.is(l,r),l};t.intensity=a(t.intensity,0,Number.MAX_VALUE,1);for(let r=0;r<3;r++)t.color[r]=a(t.color[r],0,Number.MAX_VALUE,1);if(t.type!=="AmbientLight")for(let r=0;r<16;r++)Number.isFinite(t.transform[r])||(t.transform[r]=r%5===0?1:0,A=!0);if(t.type==="RectLight"){for(let r=0;r<2;r++)t.size[r]=a(t.size[r],0,Number.MAX_VALUE,1);t.spread=a(t.spread,0,1,1)}if((t.type==="SphereLight"||t.type==="SpotLight")&&(t.radius=a(t.radius,0,Number.MAX_VALUE,t.type==="SpotLight"?.01:1)),t.type==="SpotLight"&&(t.outerAngle=a(t.outerAngle,Number.EPSILON,180,45),t.innerAngle=a(t.innerAngle,0,t.outerAngle,30)),A&&!Ys.has(t)){Ys.add(t);let r=new Error(`Invalid ${t.type} values were clamped.`);console.warn(r.message),e?.(r)}}}var Vs=new WeakSet;function rn(i,e,t){let A=i.materialIndex;if(!A)return 0;let a=A.array[e];return A.itemSize===1&&Number.isInteger(a)&&a>=0&&a<t?a:(Vs.has(A.array)||(Vs.add(A.array),console.warn("Invalid geometry.materialIndex; expected itemSize 1 and an index within mesh.materials. Falling back to material 0.")),0)}function qA(i,e,t,A=0,a=!1){let r=i.vertexCount;if(t.fill(0,A*4,(A+r)*4),!(!i.materialIndex&&!a))for(let n=0;n<r;n++){let o=rn(i,n,e.length);t[(A+n)*4]=Hi(e[o]??0,1)}}function Hi(i,e){return Math.round(e*255)+(i<<8)}var KA=1,XA=2,Ta=3,Js=0,Ks=1,Xs=2,nn=[.2126,.7152,.0722];function Ct(i){return Math.max(i[0]*nn[0]+i[1]*nn[1]+i[2]*nn[2],0)}function Ra(i){let e=Ct(i.color)*i.intensity;if(!(e>0))return 0;if(i.type==="RectLight")return e*Math.PI*Math.max(Fi(i),0);if(i.type==="SphereLight")return i.radius===0?e*4*Math.PI:e*Math.PI*Math.max(Ni(i),0);if(i.type==="SpotLight"){let t=Ct(i.color)*ki(i);return i.radius===0?e*4*Math.PI*an(i):t*Math.PI*zi(i)*an(i)}return e*4*Math.PI}function Ua(i,e=0){let t=new Int32Array(i.length).fill(-1),A=[],a=new Map;i.forEach((n,o)=>{if(n.type!=="SpotLight"||!n.iesProfile)return;let s=a.get(n.iesProfile);s==null&&(s=A.length,a.set(n.iesProfile,s),A.push(n.iesProfile)),t[o]=e+s*(16384/4)});let r=new Float32Array(A.length*128*128);return A.forEach((n,o)=>r.set(n.data,o*128*128)),{data:r,offsets:t,texelCount:r.length/4}}var qs=new WeakMap;function La(i){if(!i?.data||!i.width||!i.height)return 0;let e=qs.get(i);if(e!==void 0)return e;let{data:t,width:A,height:a}=i,r=Math.max(Math.floor(t.length/(A*a)),1),n=0;for(let s=0;s<a;s++){let l=Math.sin(Math.PI*(s+.5)/a);for(let c=0;c<A;c++){let u=(s*A+c)*r,p=t instanceof Uint8Array||t instanceof Uint8ClampedArray?1/255:1;n+=Ct([t[u]*p,t[u+Math.min(1,r-1)]*p,t[u+Math.min(2,r-1)]*p])*l}}let o=n*(2*Math.PI*Math.PI)/(A*a);return qs.set(i,o),o}var JA=class{count=0;sourceTypes=new Uint32Array(0);sourceIndices=new Uint32Array(0);weights=new Float64Array(0);reserve(e){this.count=0,this.weights.length<e&&(this.sourceTypes=new Uint32Array(e),this.sourceIndices=new Uint32Array(e),this.weights=new Float64Array(e))}push(e,t,A){if(!(A>0)||!isFinite(A))return;let a=this.count++;this.sourceTypes[a]=e,this.sourceIndices[a]=t,this.weights[a]=A}};function $s(i){let e;if(i instanceof JA)e=i;else{e=new JA,e.reserve(i.length);for(let d of i)e.push(d.sourceType,d.sourceIndex,d.weight)}let t=e.count,A=0;for(let d=0;d<t;d++)A+=e.weights[d];if(!t||!(A>0))return{choices:new Uint32Array(4),pmfs:new Float32Array(0),totalWeight:0};let a=new Float32Array(t),r=new Float64Array(t),n=new Uint32Array(t),o=new Uint32Array(t),s=0,l=0;for(let d=0;d<t;d++)a[d]=e.weights[d]/A,r[d]=a[d]*t,r[d]<1?n[s++]=d:o[l++]=d;let c=new ArrayBuffer(t*16),u=new Float32Array(c),p=new Int32Array(c);for(;s&&l;){let d=n[--s],f=o[--l];u[d*4]=r[d],p[d*4+1]=f,r[f]=r[f]+r[d]-1,r[f]<1?n[s++]=f:o[l++]=f}for(let d=0;d<s;d++){let f=n[d];u[f*4]=1,p[f*4+1]=f}for(let d=0;d<l;d++){let f=o[d];u[f*4]=1,p[f*4+1]=f}for(let d=0;d<t;d++)p[d*4+2]=e.sourceTypes[d],p[d*4+3]=e.sourceIndices[d];return{choices:new Uint32Array(c),pmfs:a,totalWeight:A}}function Cc(i,e,t){return rn(i,i.indices.array[e],t)}function yc(i,e){let t=[],A=[y.create(),y.create(),y.create()],a=[y.create(),y.create(),y.create()],r=y.create(),n=y.create(),o=y.create();for(let{mesh:s,geometry:l,materialIndices:c}of i){let u=Array(16).fill(0);for(let p=0;p<St(s);p++){PA(s,p,u);let d=l.indices.array,f=l.position.array,m=l.uv?.array,g=l.uv1?.array??m;for(let h=0;h<d.length;h+=3){let B=Cc(l,h,c.length),_=c[B]??c[0]??0,E=e[_];if(!E||E.shadowCatcher||E.unlit)continue;let Q=Ct(Kt(E));if(!(Q>1e-8))continue;let w=[d[h],d[h+1],d[h+2]];for(let D=0;D<3;D++){let V=w[D];y.set(A[D],f[V*l.position.itemSize],f[V*l.position.itemSize+1],f[V*l.position.itemSize+2]),y.transformMat4(a[D],A[D],u)}y.sub(r,a[1],a[0]),y.sub(n,a[2],a[0]),y.cross(o,r,n);let x=.5*y.length(o);if(!(x>1e-10)||!isFinite(x))continue;let M=w.map(D=>m?[m[D*2],m[D*2+1]]:[0,0]),P=w.map(D=>g?[g[D*2],g[D*2+1]]:[0,0]);t.push({p0:y.clone(a[0]),p1:y.clone(a[1]),p2:y.clone(a[2]),uv0:M[0],uv1:M[1],uv2:M[2],secondaryUv0:P[0],secondaryUv1:P[1],secondaryUv2:P[2],materialIndex:_,area:x,samplingLuminance:Q,selectionPmf:0})}}}return t}function Zs(i,e=new Float32Array(Math.max(i.length,1)*24)){return i.forEach((t,A)=>{let a=A*24;e.set(t.p0,a),e[a+3]=t.selectionPmf,e.set(t.p1,a+4),e[a+7]=t.area,e.set(t.p2,a+8),e[a+11]=t.materialIndex,e.set(t.uv0,a+12),e.set(t.uv1,a+14),e.set(t.uv2,a+16),e.set(t.secondaryUv0,a+18),e.set(t.secondaryUv1,a+20),e.set(t.secondaryUv2,a+22)}),e}var Wi=class{_bindings=new WeakMap;_triangles=[];collect(e,t){this._triangles.length=0;for(let A of e){let{mesh:a,geometry:r,materialIndices:n}=A,o=p=>{let d=t[p];return!!d&&!d.unlit&&!d.shadowCatcher&&Ct(Kt(d))>1e-8},s=a instanceof ie?a.transformsVersion:0,l=St(a),c=a instanceof ie?a.transforms:void 0,u=this._bindings.get(a);if(!u||u.geometry!==r||u.version!==r.version||u.instanceVersion!==s||u.instanceCount!==l||u.instanceTransforms!==c||u.indices.length!==n.length||n.some((p,d)=>u.indices[d]!==p||u.activity[d]!==o(p))||a.transform.some((p,d)=>!Object.is(p,u.matrix[d])))u={geometry:r,version:r.version,instanceVersion:s,instanceCount:l,instanceTransforms:c,matrix:Float64Array.from(a.transform),indices:n.slice(),activity:n.map(o),triangles:yc([A],t)},this._bindings.set(a,u);else for(let p of u.triangles){let d=t[p.materialIndex];p.samplingLuminance=Ct(Kt(d))}for(let p of u.triangles)this._triangles.push(p)}return this._triangles}};function Mc(i){let e=y.fromValues(1/0,1/0,1/0),t=y.fromValues(-1/0,-1/0,-1/0),A=i.position.array,a=i.position.itemSize;for(let r=0;r+2<A.length;r+=a){let n=A[r],o=A[r+1],s=A[r+2];!Number.isFinite(n)||!Number.isFinite(o)||!Number.isFinite(s)||(e[0]=Math.min(e[0],n),e[1]=Math.min(e[1],o),e[2]=Math.min(e[2],s),t[0]=Math.max(t[0],n),t[1]=Math.max(t[1],o),t[2]=Math.max(t[2],s))}return[e,t]}function ji(i){let e=me(i),t=new Float32Array(e.buffer);if(e.layout==="bvh4")return[[t[0],t[1],t[2]],[t[0]+t[3],t[1]+t[4],t[2]+t[5]]];if(e.layout==="bvh-gpu")return new Uint32Array(e.buffer)[11]===0?[[Math.min(t[0],t[8]),Math.min(t[1],t[9]),Math.min(t[2],t[10])],[Math.max(t[4],t[12]),Math.max(t[5],t[13]),Math.max(t[6],t[14])]]:Mc(i);if(e.layout==="cwbvh"){let A=new Uint32Array(e.buffer),a=A[3],r=l=>l<<24>>24,n=[2**r(a),2**r(a>>8),2**r(a>>16)],o=[t[0],t[1],t[2]],s=[...o];for(let l=0;l<8;l++){if(!(A[6+(l>>2)]>>(l&3)*8&255))continue;let u=(l&3)*8,p=l>>2;s[0]=Math.max(s[0],o[0]+(A[14+p]>>u&255)*n[0]),s[1]=Math.max(s[1],o[1]+(A[16+p]>>u&255)*n[1]),s[2]=Math.max(s[2],o[2]+(A[18+p]>>u&255)*n[2])}return[o,s]}return[[t[0],t[1],t[2]],[t[4],t[5],t[6]]]}function ln(i,e,t,A={min:y.create(),max:y.create()},a=y.create()){let{min:r,max:n}=A;y.set(r,1/0,1/0,1/0),y.set(n,-1/0,-1/0,-1/0);for(let o=0;o<8;o++)y.set(a,t[o>>0&1][0],t[o>>1&1][1],t[o>>2&1][2]),y.transformMat4(a,a,e),a.every(isFinite)&&(y.min(r,r,a),y.max(n,n,a));return A}function yt(i,e,t){if(i.some(r=>r.mesh instanceof ie)){let r=new fa(i.reduce((c,u)=>c+St(u.mesh),0)),n=Array(16).fill(0),o={min:y.create(),max:y.create()},s=y.create(),l=0;for(let c of i){let{mesh:u,geometry:p,bvhBounds:d,blasIndex:f,materialIndices:m,displacementScale:g}=c;for(let h=0;h<St(u);h++,l++){PA(u,h,n);let B=ln(p,n,d,o,s);if(!B.min.every(Number.isFinite)||!B.max.every(Number.isFinite)||!n.every(Number.isFinite))continue;let _=r.length++;r.sourceIndices[_]=l,r.transforms.set(n,_*16),r.bounds.set(B.min,_*6),r.bounds.set(B.max,_*6+3),r.blasIndices[_]=f,r.materials[_]=Hi(m[0],1),r.displacement[_]=g;let E=u instanceof ie?u.colors:void 0;for(let Q=0;Q<3;Q++)r.colors[_*3+Q]=E?.[h*3+Q]??1}}return r}let A=({mesh:r,geometry:n,blasIndex:o,materialIndices:s,displacementScale:l,bvhBounds:c})=>({bounds:ln(n,r.transform,c),blasIndex:o,transform:r.transform,materialsIndices:s.map(u=>Hi(u,1)),displacementScale:l});if(!e||!t)return i.map(A);let a=e.slice();return t.forEach(r=>{let n=i[r];n&&(a[r]=A(n))}),a}function Oa(i){return i.materials[0]}function Fa(i){return Oa(i).displacementMap}function Vi(i){return i.materials[0].displacementScale}var cn=new WeakMap,Pc=1,eo=new WeakMap;function to(i){let e=eo.get(i);return e==null&&(e=Pc++,eo.set(i,e)),e}function Na(i){let e=i.image;return[to(i.source??i),to(e),i.version,e.width,e.height].join("|")}var Ic=1e5,Yi=new Map;function za(i){let e=i.geometry,t=Oa(i),A=t?.displacementMap;if(!t)return;let a=Vi(i);if(A&&(a!==0||t.displacementBias!==0))return["displacement",e.version,Na(A),+A.flipY,A.uvScale.join(","),A.uvOffset.join(","),A.uvChannel,a,t.displacementBias,t.displacementUvProjectionScale,t.displacementUvProjection].join("|")}function Dc(i){let e=za(i);if(e==null)return i.geometry;let t=cn.get(i.geometry)?.get(e);if(!t){let A=new Ge(i.geometry);return A.dynamic=i.geometry.dynamic,A.version=i.geometry.version,Sc(i,A)}return t}function Sc(i,e){let t=za(i);if(t==null)return i.geometry;let A=cn.get(i.geometry);return A||(A=new Map,cn.set(i.geometry,A)),A.size>=4&&!A.has(t)&&A.clear(),A.set(t,e),e}function pA(i){return Dc(i)??i.geometry}function Tc(i,e){let t=e.width,A=[],a=Math.log2(t),r,n,o;if(gt(e))r=e.data,n=Math.max(1,Math.floor(e.data.length/(e.width*e.height))),o=e.data instanceof Uint8Array||e.data instanceof Uint8ClampedArray?c=>c:c=>Math.round(Math.min(Math.max(c,0),1)*255);else{let l=nt(),c=l.getContext("2d");if(!c)throw new Error("The displacement texture is not CPU-readable.");l.width=t,l.height=t,c.drawImage(e,0,0,t,t),r=c.getImageData(0,0,t,t).data,n=4,o=u=>u}let s=t;for(let l=0;l<=a;l++){let c=A[Math.max(0,l-1)],u=new Uint8Array(s*s*2);A.push(u);let p=l===0?n:2;for(let d=0;d<s;d++)for(let f=0;f<s;f++){let m=d*s+f,g=m*p,h=0,B=0;if(l==0){if(h=o(r[g]),B=h,d<s-1&&f<s-1){let _=o(r[g+(s+1)*p]);h=Math.min(h,_),B=Math.max(B,_)}if(d<s-1){let _=o(r[g+s*p]);h=Math.min(h,_),B=Math.max(B,_)}if(f<s-1){let _=o(r[g+p]);h=Math.min(h,_),B=Math.max(B,_)}}else{let _=f*2,E=d*2,Q=s*2,w=(E*Q+_)*p,x=w,M=w+p,P=w+Q*p,D=w+Q*p+p;h=Math.min(c[x],c[M],c[P],c[D]),B=Math.max(c[x+1],c[M+1],c[P+1],c[D+1])}u[m*2]=h,u[m*2+1]=B}s=s/2}return A}function sn(i,e){let t=Math.atan2(i[0],i[2])/(2*Math.PI)+.5,A=Math.acos(i[1])/Math.PI;ae.set(e,t,1-A)}function Rc(i,e,t,A,a,r){sn(i,A),sn(e,a),sn(t,r);let n=!1;for(let o=0;o<2;o++)if(Math.abs(A[o]-a[o])>.5||Math.abs(A[o]-r[o])>.5||Math.abs(a[o]-r[o])>.5){let s=Math.max(A[o],a[o],r[o]);s-A[o]>.5&&(A[o]+=1,n=!0),s-a[o]>.5&&(a[o]+=1,n=!0),s-r[o]>.5&&(r[o]+=1,n=!0)}return n}function on(i){let e=Math.abs(i[0]),t=Math.abs(i[1]),A=Math.abs(i[2]);return e>t&&e>A?0:t>A?1:2}function Uc(i,e,t,A,a,r,n,o,s){let l=Math.max(Math.abs(A[0]),Math.abs(a[0]),Math.abs(r[0])),c=Math.max(Math.abs(A[1]),Math.abs(a[1]),Math.abs(r[1])),u=Math.max(Math.abs(A[2]),Math.abs(a[2]),Math.abs(r[2]));l>c&&l>u?(ae.set(n,i[1],i[2]),ae.set(o,e[1],e[2]),ae.set(s,t[1],t[2])):c>l&&c>u?(ae.set(n,i[0],i[2]),ae.set(o,e[0],e[2]),ae.set(s,t[0],t[2])):(ae.set(n,i[0],i[1]),ae.set(o,e[0],e[1]),ae.set(s,t[0],t[1]))}function Lc(i,e,t,A){let a=ae.sub(ae.create(),e,i),r=Math.max(a[0],a[1]),n=t-Math.floor(Math.log2(Math.floor(1/r)))-1;isFinite(n)||(n=t),n=Math.max(n,0);let o=0;for(;;){let s=Math.pow(2,t-n),l=Math.floor(s*i[0]),c=Math.floor(s*i[1]),u=Math.floor(s*e[0]),p=Math.floor(s*e[1]);if(u-l<2&&p-c<2&&n>=0||n>=t){for(let d=c;d<=p;d++)for(let f=l;f<=u;f++)o<A.length&&(y.set(A[o],Math.floor(f),Math.floor(d),n),o++);break}n++}return o}function Oc(i,e,t){let A=i.indices.array,a=i.uv?.array,r=t.displacementUvProjection;if(!e)return;if(!a&&r==="none")throw new Error("UV displacement requires texture coordinates; use triplanar, spherical, or cylindrical projection for a UV-less mesh.");let n=e.image,o=e.flipY;if(!n.width||!n.height)return;let s=A.length/3;if(s>=Ic){let I=new Float32Array(s*2);for(let N=0;N<s;N++)I[N*2+1]=1;return I}let l=Na(e),c=Yi.get(l);c||(c=Tc(i,n),Yi.size>=4&&Yi.delete(Yi.keys().next().value),Yi.set(l,c));let u=Math.log2(n.width),p=new Float32Array(A.length/3*2),d=i.normal.array,f=i.position.array,m=ae.create(),g=ae.create(),h=ae.create(),B=y.create(),_=y.create(),E=y.create(),Q=y.create(),w=y.create(),x=y.create(),M=r==="triplanar",P=r==="spherical",D=r==="cylindrical",V=t.displacementUvProjectionScale,$=ae.create(),v=ae.create(),U=[];for(let I=0;I<100;I++)U.push([0,0,0]);for(let I=0;I<A.length;I+=3){let N=A[I],q=A[I+1],O=A[I+2],te=N*2,le=q*2,Le=O*2,ge=N*3,xe=q*3,Be=O*3;a?(ae.set(m,a[te],a[te+1]),ae.set(g,a[le],a[le+1]),ae.set(h,a[Le],a[Le+1])):(ae.set(m,0,0),ae.set(g,0,0),ae.set(h,0,0));let oe=!1;if(M||P||D)if(y.set(Q,d[ge],d[ge+1],d[ge+2]),y.set(w,d[xe],d[xe+1],d[xe+2]),y.set(x,d[Be],d[Be+1],d[Be+2]),y.normalize(Q,Q),y.normalize(w,w),y.normalize(x,x),(M||P||D)&&(y.set(B,f[ge],f[ge+1],f[ge+2]),y.set(_,f[xe],f[xe+1],f[xe+2]),y.set(E,f[Be],f[Be+1],f[Be+2])),M){let X=on(Q),ve=on(w),Oe=on(x);X===ve&&ve===Oe||(oe=!0),Uc(B,_,E,Q,w,x,m,g,h)}else if(P)y.normalize(B,B),y.normalize(_,_),y.normalize(E,E),oe=Rc(B,_,E,m,g,h);else{let X=Math.atan2(B[2],B[0])/(Math.PI*2)+.5,ve=Math.atan2(_[2],_[0])/(Math.PI*2)+.5,Oe=Math.atan2(E[2],E[0])/(Math.PI*2)+.5;ae.set(m,X,B[1]),ae.set(g,ve,_[1]),ae.set(h,Oe,E[1]),oe=Math.max(X,ve,Oe)-Math.min(X,ve,Oe)>.5}ae.scale(m,m,V),ae.scale(g,g,V),ae.scale(h,h,V);let ue=1/0,De=-1/0;if(oe)ue=0,De=255;else{ae.copy(v,m),ae.copy($,m),ae.min($,$,g),ae.min($,$,h),ae.max(v,v,g),ae.max(v,v,h);let X=Lc($,v,u,U);for(let ve=0;ve<X;ve++){let Oe=U[ve][2],de=Math.pow(2,u-Oe),re=c[Oe],ze=(U[ve][0]%de+de)%de,Fe=(U[ve][1]%de+de)%de;o&&(Fe=de-Fe-1);let Ce=(Fe*de+ze)*2;ue=Math.min(ue,re[Ce]),De=Math.max(De,re[Ce+1])}}p[I/3*2]=Math.max((Math.floor(ue)-4)/255,0),p[I/3*2+1]=Math.min((Math.ceil(De)+4)/255,1)}return p}var Ao=new WeakSet;function io(i){for(let{geometry:e,materials:t}of i)!e.tangent&&!Ao.has(e)&&t.some(A=>A.anisotropyMap||A.specularAnisotropyRotation!==0||A.coatAnisotropyRotation!==0||A.specularAnisotropyModel==="gltf"&&A.specularAnisotropy>0)&&(console.warn("MuTracer: anisotropy direction has no vertex tangent; deriving a frame from the selected UV set with a stable fallback for degenerate UVs."),Ao.add(e)),e.position?.array.length&&(e.normal||no(e),!e.tangent&&e.uv&&ca(e))}function ao(i,e=!0){let t=e?pA(i):i.geometry;return t.normal||no(t),!t.tangent&&t.uv&&ca(t),t}function fn(i){let e=ao(i),t=Fa(i),A=t?Vi(i):0,a=A!==0?Oc(e,t,Oa(i)):void 0,r=t?Oa(i).displacementBias:0;if(r!==0){let n=e.position.array.slice(),o=e.normal.array;for(let s=0;s<e.vertexCount;s++){let l=s*e.position.itemSize,c=s*e.normal.itemSize,u=Math.hypot(o[c],o[c+1],o[c+2]);if(u>0)for(let p=0;p<3;p++)n[l+p]+=o[c+p]/u*r}return{geometry:new Ge({...e,position:new z(n,e.position.itemSize)}),displacementScale:A,trianglesDisplacement:a}}return{geometry:e,displacementScale:A,trianglesDisplacement:a}}function qi(i,e){return!!i.geometry.position?.array.length&&!i.geometry.dynamic&&(!me(pA(i))||!!e&&!Ws(pA(i),e))}function ro(i,e){let t=Fa(i);return{geometry:i.geometry,version:i.geometry.version,cacheKey:za(i),bvh:me(e),displacementMap:t,displacementScale:Vi(i),displacementTextureKey:t?Na(t):void 0}}function un(i,e,t){return i.geometry===t.geometry&&i.geometry.version===t.version&&za(i)===t.cacheKey&&me(e)===t.bvh&&Fa(i)===t.displacementMap&&Vi(i)===t.displacementScale&&(!t.displacementMap||Na(t.displacementMap)===t.displacementTextureKey)}function Fc(i,e=!0){let t=ao(i,e),A=e&&Fa(i)?Vi(i):0;if(t.dynamic&&me(t)?.builder!=="builtin"&&Xe(t,void 0),!me(t)){let a=e?fn(i):{geometry:t,displacementScale:A,trianglesDisplacement:void 0};Xe(t,qt(a.geometry,a.displacementScale,a.trianglesDisplacement))}return{geometry:t,displacementScale:A}}function ka(i,e={}){let t=new Map,A=new Map,a=[],r=[],n=[],o=[],s=[],l=i.filter(p=>p.geometry.position?.array.length>0).map(p=>{let{geometry:d,displacementScale:f}=Fc(p,e.displacement!==!1),m=ji(d),g=ln(d,p.transform,m),h=A.get(d),B=p.materials.map(E=>{let Q=E;return t.has(Q)||(t.set(Q,r.length),r.push(E)),t.get(Q)});if(h!=null&&d.materialIndex&&(B.length!==n[h].length||B.some((E,Q)=>E!==n[h][Q]))){let E=me(d);d=new Ge(d),Xe(d,E),h=void 0}h==null&&(h=a.length,A.set(d,a.length),a.push(d),n.push(B));let _={bounds:g,blasIndex:h,transform:p.transform,materialsIndices:B.map(E=>Hi(E,1)),displacementScale:f};if(!(!(p instanceof ie)&&(!g.min.every(isFinite)||!g.max.every(isFinite)||!p.transform.every(isFinite))))return p.materials.some(E=>!E.unlit&&!E.shadowCatcher&&Ct(E.emissionColor)*E.emissionLuminance>1e-8)&&o.push({mesh:p,geometry:d,materialIndices:B}),s.push({mesh:p,geometry:d,blasIndex:h,materialIndices:B,displacementScale:f,bvhBounds:m}),_}).filter(p=>p!=null),c=new Map;return{geometry:Nc(a,n,c),geometries:a,geometryRegions:c,geometryStates:new Map(s.map(p=>{let d=p.mesh.geometry;return[d,{topologyVersion:d.topologyVersion,indices:d.indices.array,indexCount:d.indices.array.length}]})),instances:i.some(p=>p instanceof ie)?yt(s):l,materials:r,instanceBindings:s,emissiveBindings:o,blases:a.map(p=>({bvh:me(p),verticesCount:p.vertexCount,trainglesCount:p.indices.array.length/3}))}}function Nc(i,e,t){let A=i.reduce((g,h)=>g+h.vertexCount,0),a=i.reduce((g,h)=>g+h.indices.array.length,0),r=new z(new Float32Array(3*A),3),n=new z(new Float32Array(3*A),3),o=new z(new Float32Array(2*A),2),s=new z(new Float32Array(2*A),2),l=new z(new Uint32Array(a),1),c=new z(new Int32Array(4*A),4),u=i.some(g=>g.color),p=i.some(g=>g.tangent),d=new Ge({position:r,normal:n,uv:o,uv1:s,materialIndex:c,color:u?new z(new Float32Array(3*A),3):void 0,tangent:p?new z(new Float32Array(4*A),4):void 0,indices:l}),f=0,m=0;return i.forEach((g,h)=>{let B=g.vertexCount,_=e[h];if(t.set(g,{vertexOffset:f,indexOffset:m,materialIndices:_}),r.array.set(g.position.array,f*3),n.array.set(g.normal.array,f*3),g.uv&&o.array.set(g.uv.array,f*2),s.array.set((g.uv1??g.uv)?.array??new Float32Array(B*2),f*2),g.color&&d.color.array.set(g.color.array,f*3),g.tangent){let Q=g.tangent;for(let w=0;w<B;w++)for(let x=0;x<4;x++)d.tangent.array[(f+w)*4+x]=x<Q.itemSize?Q.array[w*Q.itemSize+x]:la(g)?0:2}qA(g,_,c.array,f);let E=g.indices.array;for(let Q=0;Q<E.length;Q++)l.array[m+Q]=f+E[Q];f+=B,m+=E.length}),d}function no(i){let e=i.indices,t=i.position.array;i.normal=new z(new Float32Array(t.length),3);let A=i.normal.array,a=y.create(),r=y.create(),n=y.create(),o=y.create(),s=y.create(),l=y.create(),c=e?e.array.length:i.vertexCount,u,p,d;for(let f=0;f<c;){e?(u=e.array[f++],p=e.array[f++],d=e.array[f++]):(u=f++,p=f++,d=f++),y.set(a,t[u*3],t[u*3+1],t[u*3+2]),y.set(r,t[p*3],t[p*3+1],t[p*3+2]),y.set(n,t[d*3],t[d*3+1],t[d*3+2]),y.sub(o,a,r),y.sub(s,r,n),y.cross(l,o,s);for(let m=0;m<3;m++)A[u*3+m]=A[u*3+m]+l[m],A[p*3+m]=A[p*3+m]+l[m],A[d*3+m]=A[d*3+m]+l[m]}for(let f=0;f<A.length;)y.set(l,A[f],A[f+1],A[f+2]),y.normalize(l,l),A[f++]=l[0],A[f++]=l[1],A[f++]=l[2]}function Ga(i,e,t){return t instanceof fa?new Set(Array.from({length:t.length},(A,a)=>a)):new Set(i.flatMap((A,a)=>e.has(A.mesh)?[a]:[]))}function Ha(i,e,t){let A=new Set;if(!(e instanceof fa))return A;let a=0,r=0;for(let{mesh:n}of i){let o=St(n),s=a+o;for(;r<e.length&&e.sourceIndices[r]<s;){if(t.has(n)){let l=e.sourceIndices[r]-a,c=n instanceof ie?n.colors:void 0;for(let u=0;u<3;u++)e.colors[r*3+u]=c?.[l*3+u]??1;A.add(r)}r++}a=s}return A}async function so(i,e){let t={geometryCount:0,bvhTimeMs:0,failedMeshes:[],workerUnavailable:!1,tinyBvhUnavailable:!1},A=new Map;for(let u of i){if(!u.geometry.position?.array.length||u.geometry.dynamic)continue;let p=pA(u);if(!(A.has(p)||!qi(u,e.config??e)&&!e.rebuild))try{A.set(p,{mesh:u,snapshot:ro(u,p)})}catch{t.failedMeshes.push(u)}}let a=e.useWorker?e.workerPool??new dA(1):void 0;async function r(u,p,d){let{geometry:f,displacementScale:m,trianglesDisplacement:g}=u,h;if(d)h=await Os(f,m,g,p,p==="tinybvh"?e.layout:"bvh2",e.spatialSplits,a);else if(p==="tinybvh"){let{buildTinyBvh:B}=await import("./chunk-MORFZRJ5.js");h=await B(f,m,g,e.layout,e.spatialSplits)}else{let B=performance.now();h={...qt(f,m,g),bvhTimeMs:performance.now()-B}}if(p==="tinybvh"&&(h.builder!=="tinybvh"||!h.buffer.byteLength))throw new Error("TinyBVH did not build every scene geometry.");return t.bvhTimeMs+=h.bvhTimeMs??0,h}async function n(u){let p=e.builder,d=e.useWorker&&!t.workerUnavailable;for(;;){if(e.isCancelled?.())throw new $t;try{return await r(u,p,d)}catch(f){if(f instanceof $t)throw f;if(f instanceof xt&&d)t.workerUnavailable=!0,d=!1;else if(p==="tinybvh")t.tinyBvhUnavailable=!0,p="builtin",d=e.useWorker&&!t.workerUnavailable;else throw f}}}let o=0,s=[...A].sort(([u],[p])=>(p.indices?.array.length??0)-(u.indices?.array.length??0)),l=0;async function c(){for(;l<s.length&&!e.isCancelled?.();){let[u,{mesh:p,snapshot:d}]=s[l++];try{if(!un(p,u,d))continue;let f=fn(p),m=await n(f);!e.isCancelled?.()&&un(p,u,d)&&(Xe(u,m,e.config??e),t.geometryCount++)}catch(f){f instanceof $t||t.failedMeshes.push(p)}finally{if(!e.isCancelled?.())try{e.onProgress?.(++o/A.size)}catch{}}}}try{await Promise.allSettled(Array.from({length:Math.min(a?.size??1,A.size)},c))}finally{e.workerPool||a?.dispose()}return t}function $A(i,e){if(![i.x,i.y,i.size,e].every(Number.isFinite)||i.x<0||i.x>1||i.y<0||i.y>1||i.size<0||e<=0)throw new RangeError("Depth sampling requires a viewport center in 0..1, a non-negative size and a positive aspect.");return new Float32Array([i.x,1-i.y,i.size/e,i.size])}function Wa(i){return Float32Array.from({length:49},(e,t)=>i[t*4])}function Mt(i){if(!i)return 0;let e=i.format==="rgba32float"?16:i.format==="rgba16float"?8:(i.format==="r32float",4);return i.width*i.height*i.depthOrArrayLayers*e}var Ya=class{device;textures=[];image;constructor(e){this.device=e}get output(){return this.image}reset(){this.image=void 0}getMemoryBytes(){return this.textures.reduce((e,t)=>e+Mt(t),0)}retire(e){e.length&&this.device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>e.forEach(t=>t.destroy()))}dispose(){this.reset(),this.retire(this.textures),this.textures=[]}run(e,t,A){if(this.reset(),!t.length)return;(this.textures.length===0||this.textures[0].width!==e.width||this.textures[0].height!==e.height||this.textures[0].format!==e.format)&&(this.retire(this.textures),this.textures=Array.from({length:2},(n,o)=>this.device.createTexture({label:`Display post-process ${o}`,size:{width:e.width,height:e.height},format:e.format,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST})));let a=this.device.createCommandEncoder(),r=e;for(let n=0;n<t.length;n++){let o=this.textures[n%2];t[n]({device:this.device,encoder:a,input:r,output:o,width:e.width,height:e.height,render:A}),r=o}this.device.queue.submit([a.finish()]),this.image=r}};var oo=`
let original = load_originalTex(uv, 0).rgb;
let filtered = load_filteredTex(uv, 0).rgb;
let foreground = load_foregroundTex(uv, 0);
let background = load_backgroundTex(uv, 0);

var mh = foreground;
var mg = background;
if (any(filtered != original)) {
let uq = abs(original) > vec3f(0.000001);
let ap = select(vec3f(1.0), original, uq);
let scale = select(vec3f(1.0), filtered / ap, uq);
let tU = select(filtered - original, vec3f(0.0), uq);
mh = vec4f(foreground.rgb * scale + tU, foreground.a);

mg = vec4f(background.rgb * scale + tU * background.a, background.a);
}
output.foreground = mh;
output.background = mg;
`,lo=`
if (globalId.x >= u32(imageSize.x) || globalId.y >= u32(imageSize.y)) { return; }
let index = globalId.x + globalId.y * u32(imageSize.x);
out_color[index] = vec4f(in_filtered[index].rgb, in_original[index].a);
`;var ja=class{device;standardFormat;context;hdr=!1;compatibleHDR;constructor(e,t,A){this.device=t,this.standardFormat=A,this.context=e.getContext("webgpu"),this.context.configure({device:t,format:A,alphaMode:"premultiplied"})}get format(){return this.hdr?"rgba16float":this.standardFormat}get supportsHDR(){if(this.compatibleHDR!==void 0)return this.compatibleHDR;this.compatibleHDR=!1;let e=null;try{if(e=nt().getContext("webgpu"),!e)return!1;e.configure({device:this.device,format:"rgba16float",alphaMode:"premultiplied",colorSpace:"srgb",toneMapping:{mode:"extended"}});let t=e.getConfiguration?.();this.compatibleHDR=t?.format==="rgba16float"&&t.toneMapping?.mode==="extended"}catch{this.compatibleHDR=!1}finally{e?.unconfigure?.()}return this.compatibleHDR}configure(e){let t=e&&this.supportsHDR;t!==this.hdr&&(this.hdr=t,this.context.configure(t?{device:this.device,format:"rgba16float",alphaMode:"premultiplied",colorSpace:"srgb",toneMapping:{mode:"extended"}}:{device:this.device,format:this.standardFormat,alphaMode:"premultiplied"}))}dispose(){this.context.unconfigure?.()}};var ZA=class{device;buffer;constructor(e){this.device=e}get(e,t=!1){if(!this.buffer||(t?this.buffer.size!==e:this.buffer.size<e)){let A=this.buffer;this.buffer=this.device.createBuffer({label:"Shared inference input",size:e,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC}),A&&this.device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>A.destroy())}return this.buffer}getMemoryBytes(){return this.buffer?.size??0}dispose(){this.buffer?.destroy()}};var co=new WeakMap;function ei(i,e,t){co.set(i,{width:e,height:t})}function Va(i){return co.get(i)??{width:i.width,height:i.height}}var qa=class{device;texture;constructor(e){this.device=e}get(e,t){if(!this.texture||e>this.texture.width||t>this.texture.height){e=Math.max(e,this.texture?.width??0),t=Math.max(t,this.texture?.height??0);let A=this.texture;this.texture=this.device.createTexture({label:"Shared denoised conversion",size:{width:e,height:t},format:"rgba32float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.COPY_SRC}),A&&this.device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>A.destroy())}return this.texture}setRegion(e,t){this.texture&&ei(this.texture,e,t)}getMemoryBytes(){return Mt(this.texture)}dispose(){this.texture?.destroy()}};var ti=class{release;constructor(e=t=>t()){this.release=e}resources=new Map;get(e,t){let A=this.resources.get(e);return A||(A=t(),A.reserveCapacity?.(),this.resources.set(e,A)),A}getMemoryBytes(){return Array.from(this.resources.values()).reduce((e,t)=>e+(t.getMemoryBytes?.()??0),0)}dispose(){let e=Array.from(this.resources.values());this.resources.clear(),this.release(()=>{for(let t of e)t.dispose()})}};function Ja(i,e,t=!1,A){let a=new Set,r=new Map,n,o;return{getSharedMemoryBytes:()=>A?.getMemoryBytes()??0,createTarget(s){let l=e(),c={...l,get presentationComplete(){return l.presentationComplete},get presentationDenoised(){return l.presentationDenoised},label:s,configure(u){r.set(c,{...u}),l.configure(u)},activate(){n=c,t&&i.setBounce(Math.max(1,...Array.from(r.values(),u=>u.bounces))),l.activate()}};return c.synchronizeBackground(o),a.add(c),c},releaseTarget(s){a.delete(s)&&(r.delete(s),s.dispose())},setMeshes:(s,l)=>i.setMeshes(s,l),setLights:s=>i.setLights(s),setBackground(s){o=s,i.setBackground(s);for(let l of a)l.synchronizeBackground(s)},setTextureAtlasBudget:s=>i.setTextureAtlasBudget(s),async readDepthSamples(s,l){return i.setCamera(s),i.readDepthSamples(l,s.aspect)},getDiagnostics(){return{...i.getDiagnostics(),...n?.getDiagnostics(),targets:Array.from(a,s=>({label:s.label,...s.getMemory()}))}},dispose(){for(let s of a)s.dispose();a.clear(),r.clear(),i.dispose(),A?.dispose()}}}function fo(i,e,t=!1){return i.map((A,a)=>`
fn ${A}Region() -> vec2u {
return ${t?`imageRegions[${a}].xy`:`textureDimensions(${A})`};
}
fn load_${A}(fM: vec2i, level: i32) -> vec4f {
${t?`if (any(fM < vec2i(0)) || any(fM >= vec2i(${A}Region()))) { return vec4f(0.0); }`:""}
return textureLoad(${A}, fM, level);
}
${e.map(r=>`
fn sample_${A}_${r}(fD: vec2f) -> vec4f {
${t?`
let jV = textureDimensions(${A});
if (all(jV == ${A}Region())) { return textureSampleLevel(${A}, ${r}, fD, 0.0); }
let fM = clamp(fD * vec2f(${A}Region()), vec2f(0.5), vec2f(${A}Region()) - vec2f(0.5));
return textureSampleLevel(${A}, ${r}, fM / vec2f(jV), 0.0);`:`return textureSample(${A}, ${r}, fD);`}
}`).join("")}`).join("")}function uo(i,e=!1){return i.map(t=>`
ivec2 ${t}Region() {
return ${e?`${t}RegionSize`:`textureSize(${t}, 0)`};
}
vec4 load_${t}(ivec2 fM, int level) {
${e?`if (any(lessThan(fM, ivec2(0))) || any(greaterThanEqual(fM, ${t}Region()))) return vec4(0.0);`:""}
return texelFetch(${t}, fM, level);
}
vec4 sample_${t}(vec2 fD) {
${e?`
ivec2 jV = textureSize(${t}, 0);
if (all(equal(jV, ${t}Region()))) return texture(${t}, fD);
vec2 fM = clamp(fD * vec2(${t}Region()), vec2(0.5), vec2(${t}Region()) - vec2(0.5));
return texture(${t}, fM / vec2(jV));`:`return texture(${t}, fD);`}
}`).join("")}var Ji=class{device;modules=new Map;bindGroupLayouts=new Map;layouts=new Map;pipelines=new Map;renderPipelines=new Map;computePipelines=new Map;ids=new WeakMap;nextId=0;constructor(e){this.device=e}id(e){let t=this.ids.get(e);return t===void 0&&(t=++this.nextId,this.ids.set(e,t)),t}remember(e,t,A,a){return e.delete(t),e.set(t,A),e.size>a&&e.delete(e.keys().next().value),A}createShaderModule(e){let t=e.code;return this.remember(this.modules,t,this.modules.get(t)??this.device.createShaderModule(e),8)}createBindGroupLayout(e){let t=Array.from(e.entries),A=JSON.stringify(t);return this.remember(this.bindGroupLayouts,A,this.bindGroupLayouts.get(A)??this.device.createBindGroupLayout({...e,entries:t}),32)}createPipelineLayout(e){let t=Array.from(e.bindGroupLayouts),{bindGroupLayouts:A,label:a,...r}=e,n=JSON.stringify([r,t.map(o=>o==null?null:this.id(o))]);return this.remember(this.layouts,n,this.layouts.get(n)??this.device.createPipelineLayout({...e,bindGroupLayouts:t}),16)}createComputePipelineAsync(e){let{compute:t,layout:A}=e,a=JSON.stringify([this.id(t.module),A==="auto"?"auto":this.id(A),t.entryPoint,Object.entries(t.constants??{}).sort(([n],[o])=>n.localeCompare(o))]),r=this.pipelines.get(a);if(!r){r=this.device.createComputePipelineAsync(e);let n=r;n.catch(()=>{this.pipelines.get(a)===n&&this.pipelines.delete(a)})}return this.remember(this.pipelines,a,r,128)}createRenderPipeline(e){let{label:t,vertex:A,fragment:a,...r}=e,n=JSON.stringify([r,{...A,module:this.id(A.module)},a&&{...a,module:this.id(a.module)}]);return this.remember(this.renderPipelines,n,this.renderPipelines.get(n)??this.device.createRenderPipeline(e),128)}createComputePipeline(e){let{label:t,compute:A,...a}=e,r=JSON.stringify([a,{...A,module:this.id(A.module)}]);return this.remember(this.computePipelines,r,this.computePipelines.get(r)??this.device.createComputePipeline(e),128)}clear(){this.modules.clear(),this.bindGroupLayouts.clear(),this.layouts.clear(),this.pipelines.clear(),this.renderPipelines.clear(),this.computePipelines.clear()}};function Ai(i,e=0,t=8){return Math.max(e,t,2**Math.ceil(Math.log2(Math.max(1,i))))}var po=new WeakMap;function je(i){let e=po.get(i);return e||po.set(i,e=new Ji(i)),e}var Ka=`
@vertex
fn main(
@builtin(vertex_index) vertexIndex: u32
) -> @builtin(position) vec4f {
const pos = array(
vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0),
vec2(-1.0, 1.0), vec2(1.0, -1.0), vec2(1.0, 1.0),
);

return vec4<f32>(pos[vertexIndex], 0.0, 1.0);
}
`;function zc(i,e){return i.format===e.format}function Ki(i,e){return i instanceof Float32Array||i instanceof Int32Array||i instanceof Uint32Array?i:(typeof i=="number"&&(i=[i]),e==="i32"||e.endsWith("i")?new Int32Array(i):e==="u32"||e.endsWith("u")?new Uint32Array(i):new Float32Array(i))}var st=class{_label;_device;_outputTextures={};_outputParams={};_pipeline;_bindGroups=[];_needsUpdatePipeline=!0;_needsUpdateOutputTextures=!0;_renderToScreen;_inputs=[];_inputViewDimensions={};_outputs=[];_uniforms=[];_uniformsMap={};_uniformBuffers={};_samplers={};_capacityWidth=0;_capacityHeight=0;_reserveCapacity=!1;_regionNames=[];_width=10;_height=10;_fsCode="";_fsMain;_fsDefine;_textureWillBeRead;constructor(e,t,A){this._label=e,this._device=t,this._fsMain=A.fsMain,this._fsDefine=A.fsDefine,this._inputs=A.inputs,this._inputViewDimensions=A.inputViewDimensions||{},this._outputs=A.outputs,this._uniforms=(A.uniforms||[]).concat({label:"viewportSize",type:"vec2f",data:[0,0]}),this._samplers=A.samplers||{},this._uniformsMap=this._uniforms.reduce((a,r)=>(a[r.label]=r,a),{}),this._textureWillBeRead=A.textureWillBeRead||!1,this._uniforms.forEach(a=>{let r=Ki(a.data,a.type);this._uniformBuffers[a.label]=t.createBuffer({label:this._label,size:r.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this._device.queue.writeBuffer(this._uniformBuffers[a.label],0,r)})}reserveCapacity(){if(this._reserveCapacity)return;this._reserveCapacity=!0,this._capacityWidth=this._width,this._capacityHeight=this._height;let e=this._inputs.filter(t=>!this._inputViewDimensions[t]||this._inputViewDimensions[t]==="2d");if(this._regionNames=e,e.length){let t={label:"imageRegions",type:`array<vec4u, ${e.length}>`,data:new Uint32Array(e.length*4)};this._uniforms.push(t),this._uniformsMap[t.label]=t,this._uniformBuffers[t.label]=this._device.createBuffer({label:`${this._label}.${t.label}`,size:e.length*16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})}this._needsUpdatePipeline=!0,this._fsCode=""}setSize(e,t){e=Math.max(1,Math.ceil(e)),t=Math.max(1,Math.ceil(t));let A=e!==this._width||t!==this._height;if(this._width=e,this._height=t,A){let a=Math.max(this._capacityWidth,e),r=Math.max(this._capacityHeight,t);this._needsUpdateOutputTextures||=!this._reserveCapacity||a!==this._capacityWidth||r!==this._capacityHeight,this._capacityWidth=a,this._capacityHeight=r,this._needsUpdatePipeline=!0,this.setUniform("viewportSize",[e,t])}}setOutputParams(e){this._renderToScreen=void 0;let t=Object.keys(e).some(A=>!zc(e[A],this._outputParams[A]||{}));this._needsUpdateOutputTextures||=t,this._needsUpdatePipeline||=t,t&&(this._fsCode=""),this._outputParams=e}setRenderToScreen(e,t){this._renderToScreen&&this._renderToScreen.presentationFormat!==t&&(this._needsUpdatePipeline=!0,this._fsCode=""),this._renderToScreen={screenTexture:e,presentationFormat:t}}setUniform(e,t){let A=this._uniformBuffers[e];this._device.queue.writeBuffer(A,0,Ki(t,this._uniformsMap[e].type))}_retainedOutputs=new Set;retainOutput(e){Object.values(this._outputTextures).includes(e)&&this._retainedOutputs.add(e)}releaseOutput(e){this._retainedOutputs.delete(e)&&(Object.values(this._outputTextures).includes(e)||this._device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>e.destroy()))}getOutput(e){return this._outputTextures[e]}getMemoryBytes(){return Object.values(this._uniformBuffers).reduce((e,t)=>e+t.size,0)+Array.from(new Set([...Object.values(this._outputTextures),...this._retainedOutputs])).reduce((e,t)=>e+Mt(t),0)}dispose(){Object.keys(this._uniformBuffers).forEach(e=>{this._uniformBuffers[e].destroy()}),new Set([...Object.values(this._outputTextures),...this._retainedOutputs]).forEach(e=>e.destroy()),this._retainedOutputs.clear()}_createTexture(e){return this._device.createTexture({label:this._label,size:{width:this._reserveCapacity?this._capacityWidth:this._width,height:this._reserveCapacity?this._capacityHeight:this._height,depthOrArrayLayers:1},format:e.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|(this._textureWillBeRead?GPUTextureUsage.COPY_SRC:0)})}_updateOutputTextures(e){let t=this._outputParams;for(let A in t){if(e?.includes(A))continue;let a=t[A];this._retainedOutputs.has(this._outputTextures[A])||this._outputTextures[A]?.destroy(),this._outputTextures[A]=this._createTexture(a)}}_updatePipeline(){if(!this._needsUpdatePipeline)return;this._needsUpdatePipeline=!1;let e=this._outputParams,t=this._device,A=this._getFullFs();if(A===this._fsCode)return;let{screenTexture:a,presentationFormat:r}=this._renderToScreen||{};this._fsCode=A,this._pipeline=je(t).createRenderPipeline({label:this._label,layout:"auto",vertex:{module:je(t).createShaderModule({label:this._label,code:Ka}),entryPoint:"main"},fragment:{module:je(t).createShaderModule({label:this._label,code:A}),entryPoint:"main",targets:a?[{format:r}]:this._outputs.map(n=>({format:e[n].format}))},primitive:{topology:"triangle-list"}}),this._updateBindGroups()}_getFullFs(){let e=this._inputs,t=e.length,A=t>0;return`
${e.sort().map((r,n)=>{let s=this._inputViewDimensions[r]==="3d"?"texture_3d":"texture_2d";return`@group(0) @binding(${n}) var ${r}: ${s}<f32>;`}).join(`
`)}

${A?Object.keys(this._samplers).sort().map((r,n)=>`@group(0) @binding(${n+t}) var ${r}: sampler;`).join(`
`):""}
${this._uniforms.map((r,n)=>`@group(${A?1:0}) @binding(${n}) var<uniform> ${r.label}: ${r.type};`).join(`
`)}
struct oU {
${this._outputs.map((r,n)=>`@location(${n}) ${r}: vec4f,`).join(`
`)}
}
${fo(this._reserveCapacity?this._regionNames:e.filter(r=>!this._inputViewDimensions[r]||this._inputViewDimensions[r]==="2d"),Object.keys(this._samplers),this._reserveCapacity)}
${this._fsDefine??""}
@fragment
fn main(
@builtin(position) fD: vec4f
) -> oU {
let uv = vec2i(floor(fD.xy));
let uv2 = fD.xy / viewportSize;
var output: oU;
${this._fsMain}
return output;
}
`}_updateBindGroups(){let e=[],t=this._device,A=this._inputs.length>0?1:0;this._uniforms.length>0&&(e[A]=t.createBindGroup({label:this._label,layout:this._pipeline.getBindGroupLayout(A),entries:this._uniforms.map((a,r)=>({binding:r,resource:{buffer:this._uniformBuffers[a.label]}}))})),this._bindGroups=e}createPass(e,t,A){if(this._needsUpdateOutputTextures&&!this._renderToScreen&&(this._updateOutputTextures(Object.keys(A||{})),this._needsUpdateOutputTextures=!1),this._regionNames.length){let o=new Uint32Array(this._regionNames.length*4);for(let[s,l]of this._regionNames.entries()){let c=Va(t[l]);o.set([c.width,c.height],s*4)}this.setUniform("imageRegions",o)}for(let o of Object.values(this._outputTextures))ei(o,this._width,this._height);this._updatePipeline();let a=this._inputs.length;a>0&&(this._bindGroups[0]=this._device.createBindGroup({label:this._label,layout:this._pipeline.getBindGroupLayout(0),entries:[...this._inputs.map((o,s)=>({binding:s,resource:t[o].createView(this._inputViewDimensions[o]?{dimension:this._inputViewDimensions[o]}:void 0)})),...Object.keys(this._samplers).map((o,s)=>({binding:s+a,resource:this._samplers[o]}))]}));let r={...this._outputTextures,...A},n=e.beginRenderPass({colorAttachments:this._renderToScreen?[{view:this._renderToScreen.screenTexture.createView(),clearValue:{r:0,g:0,b:0,a:0},storeOp:"store",loadOp:"clear"}]:this._outputs.map(o=>({view:r[o].createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:"clear",storeOp:"store"}))});n.setViewport(0,0,this._width,this._height,0,1),n.setScissorRect(0,0,this._width,this._height),n.setPipeline(this._pipeline),this._bindGroups.forEach((o,s)=>{n.setBindGroup(s,o)}),n.draw(6,1,0,0),n.end()}};function ii(i){return Math.min(20,Math.max(1,Number.isNaN(i)?1:Math.round(i)))}function kc(i){return i.projection!=="perspective"?0:.5*i.sensorHeight*Math.max(i.zoom,Number.EPSILON)/Math.tan(i.fov*Math.PI/360)}function ai(i){if(!(i.fStop>0)||!(i.metersPerUnit>0))return 0;let e=kc(i)/(2*i.fStop)/1e3/i.metersPerUnit;return Number.isFinite(e)&&e>0?e:0}var ri=`
struct ShadowCatcherAccumulation {

mask: vec4f,
background: vec4f,

moments: vec4f,
}
`;function Xa(i){let e={sobol:0,zsobol:1,random:2}[i];if(e===void 0)throw new Error(`Unknown sampling pattern: ${i}`);return e}function $a(i){return Number.isFinite(i)?Math.min(16,Math.max(0,Math.ceil(Math.log2(Math.max(1,i))))):16}var Gc=[[0,1,2,3],[0,1,3,2],[0,2,1,3],[0,2,3,1],[0,3,2,1],[0,3,1,2],[1,0,2,3],[1,0,3,2],[1,2,0,3],[1,2,3,0],[1,3,2,0],[1,3,0,2],[2,1,0,3],[2,1,3,0],[2,0,1,3],[2,0,3,1],[2,3,0,1],[2,3,1,0],[3,1,2,0],[3,1,0,2],[3,2,1,0],[3,2,0,1],[3,0,2,1],[3,0,1,2]].map(i=>i.reduce((e,t,A)=>e|t<<2*A,0)),Za=Array.from({length:6},(i,e)=>Gc.slice(e*4,e*4+4).reduce((t,A,a)=>t|A<<a*8,0)>>>0),er=[[1,2863311530],[2,3435973836],[4,4042322160],[8,4278255360],[16,4294901760]];var ni=new WeakMap,mo=1;function tr(i){return i?(ni.has(i)||ni.set(i,mo++),ni.has(i.image)||ni.set(i.image,mo++),[ni.get(i),ni.get(i.image),i.version,i.uvScale.join(","),i.uvOffset.join(","),i.uvChannel,i.flipY].join(":")):"-"}function dn(i,e){return JSON.stringify(e.map(t=>i[t]))}function go(i){return{paramKey:dn(i,Nr),textureKey:bi.map(e=>{let t=i[e];return typeof t=="number"?String(t):tr(t)}).join("|"),geometryKey:dn(i,Fr)+"|"+tr(i.displacementMap),emissive:dn(i,["emissionColor","emissionLuminance","coatWeight","coatColor","unlit","shadowCatcher"])+"|"+tr(i.coatWeightMap),emissiveMap:tr(i.emissiveMap)}}function mA(i){return!i.unlit&&!i.shadowCatcher&&Ct(Kt(i))>1e-8}var si=class{_snapshots=new WeakMap;capture(e){for(let t of e)this._snapshots.set(t,go(t))}classify(e){let t="params",A=!1,a=!1,r={params:0,emission:1,textures:2,geometry:3};for(let n of e){let o=this._snapshots.get(n),s=go(n),l=!o||o.emissive!==s.emissive;A||=l,a||=!o||o.emissiveMap!==s.emissiveMap;let c=!o||s.geometryKey!==o.geometryKey?"geometry":s.textureKey!==o.textureKey?"textures":l?"emission":"params";r[c]>r[t]&&(t=c)}return{level:t,emission:A,emissiveMap:a}}};var Hc=["position","normal","tangent","color","uv","uv1","indices","materialIndex"];function ho(i){return[i.version,i.dynamic,me(i),...Hc.flatMap(e=>{let t=i[e];return[t?.array,t?.array.length,t?.itemSize]})]}var oi=class{_states=new Map;capture(e){this._states.clear();for(let t of e.instanceBindings)t.mesh.geometry===t.geometry&&this._states.set(t.geometry,ho(t.geometry))}update(e,t){let A=new Map(e.geometries.map((d,f)=>[d,f])),a=new Set;for(let d of t){let f=this._states.get(d.geometry);if(!f||d.materials.length!==1||d.geometry.materialIndex||d.materials[0].displacementMap)return;if(!a.has(d.geometry)){if(ho(d.geometry).some((g,h)=>g!==f[h]))return;a.add(d.geometry)}}let r=[],n=new Map,o=new Map(e.instanceBindings.map(d=>[d.geometry,d])),s=t.filter(d=>d.geometry.position.array.length>0).map(d=>{let f=d.materials[0],m=n.get(f);m==null&&(m=r.length,r.push(f),n.set(f,m));let g=o.get(d.geometry);return{mesh:d,geometry:d.geometry,blasIndex:A.get(d.geometry),materialIndices:[m],displacementScale:0,bvhBounds:g?.bvhBounds??ji(d.geometry)}}),l=yt(s);if(t.some(d=>d instanceof ie))return{...e,materials:r,instances:l,instanceBindings:s,emissiveBindings:s.filter(d=>mA(r[d.materialIndices[0]]))};let c=l,u=c.map((d,f)=>d.bounds.min.every(Number.isFinite)&&d.bounds.max.every(Number.isFinite)&&d.transform.every(Number.isFinite)?f:-1).filter(d=>d>=0),p=u.map(d=>s[d]);return{...e,materials:r,instances:u.map(d=>c[d]),instanceBindings:p,emissiveBindings:p.filter(d=>mA(r[d.materialIndices[0]]))}}};var pn=["position","normal","uv","uv1","color","tangent","materialIndex"],Bo=new WeakMap;function mn(i){let e=Bo.get(i);if(!e){e={source:new Map,prepared:new Map};for(let t of i.instanceBindings)for(let[A,a]of[[e.source,t.mesh.geometry],[e.prepared,t.geometry]]){let r=A.get(a);r||A.set(a,r=[]),r.push(t)}Bo.set(i,e)}return e}function Ar(i,e){return e.every(t=>{let A=mn(i).source.get(t)??[];return A.length>0&&A.every(a=>!a.mesh.materials.some(r=>r.displacementMap)&&a.geometry.position.array===t.position.array)})}function Wc(i,e,t,A,a){let{vertexOffset:r,indexOffset:n,materialIndices:o}=t,s=i.vertexCount;for(let l of pn){if(l==="materialIndex"||a&&l!=="position"&&l!=="normal"&&l!=="tangent")continue;let c=e[l];if(!c)continue;let u=l==="uv1"?i.uv1??i.uv:i[l],p=r*c.itemSize;if(u&&u.itemSize!==c.itemSize)for(let d=0;d<s;d++)for(let f=0;f<c.itemSize;f++)c.array[p+d*c.itemSize+f]=f<u.itemSize?u.array[d*u.itemSize+f]:l==="tangent"&&!la(i)?2:0;else u?c.array.set(u.array,p):c.array.fill(0,p,p+s*c.itemSize)}if(A){qA(i,o,e.materialIndex.array,r);for(let l=0;l<i.indices.array.length;l++)e.indices.array[n+l]=i.indices.array[l]+r}}function Xi(i,e){let t=i?.geometryStates.get(e);return!!t&&(t.topologyVersion!==e.topologyVersion||t.indices!==e.indices.array||t.indexCount!==e.indices.array.length)}function ir(i,e){let t=[],A=[],a=new Set,r=!1,n=!1,o=0,s=new Map;i.geometries.forEach((l,c)=>{let u=mn(i).prepared.get(l)?.[0].mesh.geometry??l,p=i.blases[c].bvh;if(e.has(u)){let d=i.geometryRegions.get(l),f=Xi(i,u),m=!f&&Gr(u),g=s.get(u);g||(g=me(u),(f||!g||u.dynamic&&g.builder!=="builtin"||!SA(g,u))&&(g=qt(u)),Xe(u,g),s.set(u,g)),Xe(l,g),l.version=u.version,i.blases[c].bvh=g,r||=p.buffer.byteLength!==g.buffer.byteLength,n||=p.buffer.byteLength!==g.buffer.byteLength||p.layout!==g.layout,Wc(u,i.geometry,d,f,m);let h=u.vertexCount,B=t[t.length-1];B&&B.first+B.count===d.vertexOffset&&B.topologyChanged===f&&B.deformationOnly===m?B.count+=h:t.push({first:d.vertexOffset,count:h,topologyChanged:f,deformationOnly:m}),A.push({blas:g,offset:o});for(let _ of mn(i).prepared.get(l)??[])_.bvhBounds=ji(l),a.add(_.mesh)}o+=i.blases[c].bvh.buffer.byteLength});for(let l of e)i.geometryStates.set(l,{topologyVersion:l.topologyVersion,indices:l.indices.array,indexCount:l.indices.array.length});return{vertices:t,blases:A,meshes:a,resized:r,relocated:n}}function gn(i,e,t,A,a,r,n=!0,o=!1){for(let s=0;s<pn.length;s++){if(s===6&&!n||o&&s>=2&&s<=4)continue;let l=i[pn[s]];if(!l)continue;let c=l.array,u=l.itemSize,p=a*t+A[s],d=a*u;for(let f=0;f<r;f++,p+=t,d+=u)for(let m=0;m<u;m++)e[p+m]=c[d+m]}}var vo={width:8,height:4};function ar(i){let e;if(Array.isArray(i))e=wo(1,1,i);else{let t="map"in i?i.map:i;if(!gt(t.image))return;e={width:t.image.width,height:t.image.height,data:t.image.data}}return e}function Eo(i,e){let t=Yc(e);return i.length>0&&e.length>0&&(t={width:t.width,height:t.height,data:t.data.slice()}),i.forEach(A=>{Vc(A,t)}),t}function Yc(i){let e;if(i.length>0){let t=i[0];e={width:t.map.image.width,height:t.map.image.height,data:t.map.image.data,distributionCacheKey:t.map.source??t.map.image.data,distributionCacheVersion:t.map.version}}else e=wo(vo.width,vo.height,[0,0,0,1]);return e}function wo(i,e,t,A){let a=i*e,r=new Float32Array(a*4);return t&&Array.isArray(t)&&jc(r,t,A),{width:i,height:e,data:r}}function jc(i,e,t=1){for(let A=0;A<i.length;)i[A++]=e[0]*t,i[A++]=e[1]*t,i[A++]=e[2]*t,i[A++]=e[3];return i}function Vc(i,e){let t=i.color,A=i.intensity,a=e.data;for(let r=0;r<a.length;)a[r++]+=t[0]*A,a[r++]+=t[1]*A,a[r++]+=t[2]*A,r++}var li=class{_snapshot=[];_image;update(e){let t=e.filter(r=>r.type==="AmbientLight"),A=e.filter(r=>r.type==="EnvironmentLight"),a=[...t,...A].map(Qt);return(a.length!==this._snapshot.length||a.some((r,n)=>!Ve(r,this._snapshot[n])))&&(this._image=a.length?Eo(t,A):void 0,this._snapshot=a),this._image}},ci=class{_snapshot=[];_hadTexture=!1;update(e){let t=e.map(n=>n.type==="RectLight"?n.texture:void 0),A=t.flatMap(n=>n?[n,n.version,n.image,n.flipY,...n.uvScale,...n.uvOffset,n.uvChannel]:[void 0]),a=t.some(n=>!!n),r=(this._hadTexture||a)&&!Ve(A,this._snapshot);return this._snapshot=A,this._hadTexture=a,r}};var fi={USE_ENVMAP:1,...xs,HAS_THIN_FILM:2**10,HAS_COAT:2**11,HAS_FUZZ:2**12,HAS_SUBSURFACE:2**13,HAS_SHADOW_CATCHER:2**14};function _o(i){let e=0;for(let[t,A]of Object.entries(fi))i[t]&&(e|=A);return e}function hn(i,e,t){return Math.min(Math.max(i,e),t)}function rr(i,e,t=1e-4){for(let A=0;A<i.length;A++)if(Math.abs(i[A]-e[A])>t)return!1;return!0}var qc=typeof navigator<"u"&&navigator.userAgent.match("Macintosh"),$i;function nr(){if($i!==void 0)return $i;if($i=!1,qc)try{let i=nt().getContext("webgl"),e=i&&i.getExtension("WEBGL_debug_renderer_info"),t=e&&i.getParameter(e.UNMASKED_RENDERER_WEBGL)||"";t.match(/Apple M/)||t.match(/Apple GPU/)||($i=!0)}catch{}return $i}var Jc=.125;function Qo(i,e,t,A,a=i,r=Jc){let n=i*Math.sqrt(t/Math.max(e,.1)),o=n<.25?128:16,s=hn(Math.round(n*o)/o,r,Math.max(r,A));return Math.abs(Math.log(s/a))>=Math.log(1.15)?s:a}var bo=`
@group(3) @binding(4) var<uniform> depthArea: vec4f;

@compute @workgroup_size(${7}, ${7})
fn depthQuery(@builtin(global_invocation_id) id: vec3u) {
let index = id.x + id.y * ${7}u;
let offset = vec2f(id.xy) / ${6}.0 * 2.0 - 1.0;
let uv = depthArea.xy + depthArea.zw * offset * vec2f(1.0, -1.0);
outColor[index] = vec4f(0.0);
if (any(uv < vec2f(0.0)) || any(uv > vec2f(1.0))) { return; }
var ray = hy(uv);
let eye = cameraUniform.viewInv[3].xyz;
let nY = -normalize(cameraUniform.viewInv[2].xyz);
var si: ad;
si.triangleIndex = -1;



for (var layer = 0; layer < 32; layer++) {
cY(ray, &si, 0, false, false);
if (!si.hit) { return; }
var material: J;
eT(&material, si.materialIndex, si.uv, si.uv1, si.instanceIndex);
if (material.materialType != SHADOW_CATCHER && material.alpha > 0.0) {
outColor[index] = vec4f(max(dot(si.position - eye, nY), 0.0), 0.0, 0.0, 0.0);
return;
}
ray.o = si.position + ray.d * (EPS * 0.02);
}
}
`;var xo=`

const PI = 3.14159265359;
const TWOPI = 6.28318530718;
const INVPI = 0.31830988618;
const INVPI2 = 0.10132118364;
const EPS = 0.0005;
const INV4PI = 0.07957747154594766;
const INF = 1.0e+38;
const ROUGHNESS_MIN = 0.001;



fn rI(position: vec3f, geometricNormal: vec3f, direction: vec3f) -> vec3f {
let normal = select(-geometricNormal, geometricNormal, dot(geometricNormal, direction) >= 0.0);
let qc = vec3i(256.0 * normal);
let bits = bitcast<vec3i>(position);
let vH = bitcast<vec3f>(bits + select(qc, -qc, position < vec3f(0.0)));
return select(vH, position + normal / 65536.0, abs(position) < vec3f(1.0 / 32.0));
}

`;function wn({hasAnisotropyDirections:i=!0,hasCoatNormals:e=!1,hasSceneAlpha:t=!0}){return`

const luminance = vec3f(0.2126, 0.7152, 0.0722);
const RAY_MAX_DISTANCE = 9999.0;

const STANDARD = 0;
const UNLIT = ${2};
const SHADOW_CATCHER = ${3};

const RECT_LIGHT = ${3};
const SPHERE_LIGHT = ${2};
const DIRECTIONAL_LIGHT = ${1};
const SPOT_LIGHT = ${4};

struct Ray {
o: vec3f,
d: vec3f,
};

struct ad {
position: vec3f,



albedoSampled: bool,

normal: vec3f, 
${e?`
coatNormal: vec3f, 
`:""}
vertexNormal: vec3f, 
shadowOffset: vec3f, 

faceNormal: vec3f, 
hit: bool,

tangent: vec3f,
${i?`
directionTangent: vec3f,
directionBitangent: vec3f,
geometryTangent: vec3f,
geometryBitangent: vec3f,
`:""}
uv: vec2f,
uv1: vec2f,

triangleIndex: i32,
instanceIndex: i32,
materialIndex: i32,
barycentrics: vec2f,

wavelength: f32,

mediumType: i32,
mediumExtinction: vec3f,
mediumScattering: vec3f,
mediumAnisotropy: f32,

};




struct J {
baseColor: vec3f,
transmissionWeight: f32,

emission: vec3f,
specularAnisotropy: f32,

baseMetalness: f32,
specularIor: f32,
specularRoughness: f32,

transmissionDispersionScale: f32,
dispersionAbbeNumber: f32,
thinFilmThickness: f32,
thinFilmIor: f32,
thinFilmWeight: f32,


mediumType: i32,
mediumExtinction: vec3f,
mediumScattering: vec3f,
mediumAnisotropy: f32,

baseWeight: f32,
diffuseRoughness: f32,
specularWeight: f32,
specularColor: vec3f,
subsurfaceWeight: f32,
subsurfaceColor: vec3f,
transmissionColor: vec3f,
fuzzWeight: f32,
fuzzColor: vec3f,
fuzzRoughness: f32,
coatWeight: f32,
coatColor: vec3f,
coatRoughness: f32,
coatAnisotropy: f32,
${i?`
anisotropyDirection: vec2f,
anisotropyDirectionEnabled: bool,
coatAnisotropyRotation: f32,
${i?`
directionTangent: vec3f,
directionBitangent: vec3f,
geometryTangent: vec3f,
geometryBitangent: vec3f,
`:""}
`:""}
${e?`
coatNormal: vec3f,
coatNormalEnabled: bool,
geometricNormal: vec3f, 
`:""}
coatIor: f32,
coatDarkening: f32,


alpha: f32,
${t?"alphaMode: i32,":""}

materialType: i32,

bevel: f32,

relativeIor: f32,
inside: bool,

alphaX: f32,
alphaY: f32,
thinWalled: bool,
};

struct Path {
ray: Ray,
li: vec3f,
alpha: f32,
beta: vec3f,
fromEye: bool,
abort: bool,
scatteringPdf: f32,
scatteringIsDelta: bool,
isNextRefraction: bool,
};

struct LightSampleRec {
normal: vec3f,
emission: vec3f,
direction: vec3f,
dist: f32,
pdf: f32,



selectionPmf: f32,
isDelta: bool,

sourceType: u32,
sourceIndex: u32,
};

struct Light {
position: vec3f,
litType: f32,

emission: vec3f,
area: f32,

u: vec3f,

radiusOrSpread: f32,

v: vec3f,
textureIndex: f32,

selectionPmf: f32,
_samplingPadding0: f32,
_samplingPadding1: f32,
_samplingPadding2: f32,
iesReference: vec3f,
_iesPadding: f32,
};

struct EmissiveTriangle {
p0: vec3f,
selectionPmf: f32,
p1: vec3f,
area: f32,
p2: vec3f,
materialIndex: f32,
uv0: vec2f,
uv1: vec2f,
uv2: vec2f,
secondaryUv0: vec2f,
secondaryUv1: vec2f,
secondaryUv2: vec2f,
};

struct oV {
probability: f32,
aliasIndex: i32,
sourceType: i32,
sourceIndex: i32,
};

${Qs()}

struct CameraUniform {
viewProjectionInv: mat4x4<f32>,
viewInv: mat4x4<f32>,
apertureRadius: f32,
focusDistance: f32,
};

struct RayTraceUniform {
outputSize: vec2f,
sampleCount: f32,
scaleOffset: vec4f,
lightsCount: i32,
transmissiveOutputAlphaMin: f32,
jitter: vec2f,
backgroundColor: vec4f,
groundedBackgroundParams: vec4f,
groundedBackgroundCenter: vec2f,
blasOffset: i32,
isEmpty: i32,
bevel: i32,
dispersionWavelengths: i32,
envLightPmf: f32,
lightChoiceCount: i32,
lightWeightTotal: f32,
lightSamplingTextureWidth: i32,
lightChoiceTexelOffset: i32,
bounces: i32,
varianceMoments: i32,
adaptiveSampling: i32,
clamping: f32,
directLightCandidates: i32,
backgroundFlags: i32,

loopUnrollGuard: u32,
sceneFeatureFlags: u32,
sequenceSeed: u32,
zSobolLogSPP: u32,
sampleSequenceOffset: u32,
}


@group(0) @binding(0) var<storage, read> bvhBuffer: array<vec4f>;
@group(0) @binding(1) var<storage, read> instancesBuffer: array<vec4f>;
@group(0) @binding(2) var<storage, read> attrBuffers: array<${i?"vec4f":"vec3f"}>;
@group(0) @binding(3) var<storage, read> materialsBuffer: array<MaterialBuffer>;


@group(1) @binding(0) var mapSampler: sampler;
@group(1) @binding(1) var map: texture_2d_array<f32>;


@group(1) @binding(3) var<uniform> mapInfo: array<vec4f, NUM_MAPS * 3>;
@group(1) @binding(4) var envMap: texture_2d<f32>;
@group(1) @binding(5) var envMapDistribution: texture_2d<f32>;
@group(1) @binding(6) var backgroundMap: texture_2d<f32>;
@group(1) @binding(8) var lightSamplingData: texture_2d<f32>;
@group(1) @binding(9) var openPbrEnergyLut: texture_2d<f32>;
@group(1) @binding(10) var adaptiveSampleTargets: texture_2d<f32>;

fn cL(dV: i32, lh: i32) -> f32 {
let ih = dV + lh / 4;
let width = rtUniform.lightSamplingTextureWidth;
let packed = textureLoad(lightSamplingData, vec2i(ih % width, ih / width), 0);
return packed[lh % 4];
}

fn kI(dV: i32, uv: vec2f) -> f32 {
if (dV < 0) { return 1.0; }
let fM = fract(uv) * 128.0 - vec2f(0.5);
let x0 = i32(floor(fM.x));
let y0 = i32(floor(fM.y));
let fx = fract(fM.x);
let fy = fract(fM.y);
let xa = select(x0, 127, x0 < 0);
let xb = select(x0 + 1, 0, x0 >= 127);
let ya = select(y0, 127, y0 < 0);
let yb = select(y0 + 1, 0, y0 >= 127);
let a = cL(dV, ya * 128 + xa);
let b = cL(dV, ya * 128 + xb);
let c = cL(dV, yb * 128 + xa);
let d = cL(dV, yb * 128 + xb);
return mix(mix(a, b, fx), mix(c, d, fx), fy);
}

fn bL(light: Light, dJ: vec3f) -> f32 {
let axis = normalize(light.u);
let cc = dot(axis, dJ);
var tI = select(0.0, 1.0, cc >= light.v.x);
if (light.v.y > 1e-6) {
tI = smoothstep(light.v.x, light.v.x + light.v.y, cc);
}
if (tI <= 0.0 || light.textureIndex < 0.0) { return tI; }
let uc = light.iesReference;
let vu = cross(axis, uc);
let vertical = acos(clamp(cc, -1.0, 1.0));
let horizontal = atan2(dot(dJ, vu), dot(dJ, uc));
return tI * kI(i32(light.textureIndex), vec2f(vertical / PI, horizontal / TWOPI + 0.5));
}




@group(2) @binding(0) var<uniform> cameraUniform: CameraUniform;
@group(2) @binding(1) var<uniform> rtUniform: RayTraceUniform;

@group(2) @binding(2) var<uniform> analyticLights: array<Light, NUM_UNIFORM_LIGHTS>;


fn iw(ray: ptr<function, Ray>, origin: vec3f, direction: vec3f) {
(*ray).o = origin;
(*ray).d = direction;
}
`}function _n({hasAnisotropyDirections:i=!0,hasCoatNormals:e=!1,hasSceneAlpha:t=!0}={}){let A=t?"(*ma).alphaMode = i32(matData.alphaMode);":"",a=t?`
if ((*ma).alphaMode == ${dt.opaque}) {
(*ma).alpha = 1.0;
}
else if ((*ma).alphaMode == ${dt.mask}) {
(*ma).alpha = select(0.0, 1.0, (*ma).alpha >= matData.alphaCutoff);
}`:"(*ma).alpha = 1.0;";return`

${i?`fn fb(roughness: f32, strength: f32) -> vec2f {
if (strength == 0.0) { return vec2f(roughness, 0.0); }
let u = roughness * roughness;
let a = u + (1.0 - u) * strength * strength;
if (a == 0.0) { return vec2f(0.0); }
return vec2f(pow((a*a + u*u) * 0.5, 0.25), clamp(1.0 - u/a, 0.0, 1.0));
}
`:""}

fn oB(c: vec3f) -> vec3f {
return mix(pow(c * 0.9478672986 + 0.0521327014, vec3f(2.4)), c * 0.0773993808, vec3f(c < vec3f(0.04045)));
}

fn decodeMapColor(idx: i32, c: vec3f) -> vec3f {
if (mapInfo[idx + NUM_MAPS * 2].y > 0.5) { return c; }
return oB(c);
}

fn ae(val: i32) -> vec2f {
return vec2f(f32(val >> 8), f32(val & 0xff) / 255.0);
}

fn oa(idx: i32) -> vec2f {
return mapInfo[idx].xy;
}

fn pj(idx: i32) -> i32 {
return i32(floor(mapInfo[idx].z));
}

fn nZ(idx: i32) -> vec2f {
return vec2f(fract(mapInfo[idx].z), mapInfo[idx].w);
}

fn sg(idx: i32, uv: vec2f) -> vec2f {
let transform = mapInfo[idx + NUM_MAPS];
let qz = fract(uv * transform.xy + transform.zw);
let jg = 1.0 / vec2f(textureDimensions(map).xy);
let dZ = nZ(idx);
let kg = oa(idx) + jg;
let oE = dZ - 0.5 * jg;
let lr = dZ + kg - jg;
return clamp(
oE + qz * kg,
dZ,
lr
);
}

fn getMapUvSet(idx: i32, uv: vec2f, uv1: vec2f) -> vec2f {
return select(uv, uv1, mapInfo[idx + NUM_MAPS * 2].x > 0.5);
}

fn sampleMap(idx: i32, uv: vec2f) -> vec4f {
return textureSampleLevel(map, mapSampler, sg(idx, uv), pj(idx), 0.0);
}


fn lE(materialIndex: i32, uv: vec2f, uv1: vec2f) -> vec3f {
let matData = materialsBuffer[materialIndex];
var emission = matData.emission;
if (USE_EMISSIVE_MAPS) {
let emissiveMapIndex = i32(matData.emissiveMapIndex);
if (emissiveMapIndex >= 0) {
emission *= decodeMapColor(emissiveMapIndex, sampleMap(
emissiveMapIndex, getMapUvSet(emissiveMapIndex, uv, uv1)
).rgb);
}
}
if (USE_COAT_WEIGHT_MAPS && matData.matType == 0.0) {
let coatWeightMapIndex = i32(matData.coatWeightMapIndex);
if (coatWeightMapIndex >= 0) {
let coatWeight = clamp(matData.coatWeight, 0.0, 1.0) * sampleMap(
coatWeightMapIndex, getMapUvSet(coatWeightMapIndex, uv, uv1)
).r;
emission *= mix(vec3f(1.0), sqrt(max(matData.coatColor, vec3f(0.0))), coatWeight);
}
}
return emission;
}


fn aK(roughness: f32, anisotropy: f32) -> vec2f {
let alpha = roughness * roughness;
let oX = ROUGHNESS_MIN * ROUGHNESS_MIN;
if (anisotropy == 0.0) { return vec2f(max(oX, alpha)); }
let dg = 1.0 - anisotropy;
let rZ = alpha * sqrt(2.0 / (1.0 + dg * dg));
return max(vec2f(oX), vec2f(rZ, dg * rZ));
}

fn kA(instanceIndex: i32) -> vec3f {
if (instanceIndex < 0) { return vec3f(1.0); }
return instancesBuffer[instanceIndex * ${Y} + 9].xyz;
}

fn eT(
ma: ptr<function, J>,
materialIndex: i32,
uv: vec2f,
uv1: vec2f,
instanceIndex: i32
) {
let matData = materialsBuffer[materialIndex];

(*ma).baseColor = matData.color;
(*ma).materialType = i32(matData.matType);
(*ma).specularRoughness = matData.roughness;
(*ma).baseMetalness = matData.metallic;
(*ma).specularAnisotropy = clamp(matData.anisotropy, 0.0, 1.0);
(*ma).emission = lE(materialIndex, uv, uv1);
(*ma).inside = false;
(*ma).specularIor = matData.ior;
(*ma).transmissionWeight = matData.transmission;
(*ma).thinWalled = matData.thin > 0.5;
(*ma).bevel = matData.bevel;
(*ma).transmissionDispersionScale = matData.dispersion;
(*ma).dispersionAbbeNumber = max(matData.dispersionAbbeNumber, 1e-6);
(*ma).mediumExtinction = max(matData.mediumExtinction, vec3f(0.0));
(*ma).mediumScattering = max(matData.mediumScattering, vec3f(0.0));
(*ma).mediumAnisotropy = clamp(matData.mediumAnisotropy, -1.0, 1.0);
(*ma).mediumType = select(0, 1, max(max((*ma).mediumExtinction.x, (*ma).mediumExtinction.y), (*ma).mediumExtinction.z) > 0.0);
(*ma).alpha = matData.alpha;
${A}

(*ma).thinFilmThickness = matData.thinFilmThickness * 1000.0;
(*ma).thinFilmIor = matData.thinFilmIor;
(*ma).thinFilmWeight = select(0.0, clamp(matData.thinFilmWeight, 0.0, 1.0), HAS_THIN_FILM);
(*ma).baseWeight = clamp(matData.baseWeight, 0.0, 1.0);
(*ma).diffuseRoughness = clamp(matData.baseDiffuseRoughness, 0.0, 1.0);
(*ma).specularWeight = max(matData.specularWeight, 0.0);
(*ma).specularColor = max(matData.specularColor, vec3f(0.0));
(*ma).subsurfaceWeight = select(0.0, clamp(matData.subsurfaceWeight, 0.0, 1.0), HAS_SUBSURFACE);
(*ma).subsurfaceColor = max(matData.subsurfaceColor, vec3f(0.0));
(*ma).transmissionColor = max(matData.transmissionColor, vec3f(0.0));
(*ma).fuzzWeight = select(0.0, clamp(matData.fuzzWeight, 0.0, 1.0), HAS_FUZZ);
(*ma).fuzzColor = max(matData.fuzzColor, vec3f(0.0));
(*ma).fuzzRoughness = clamp(matData.fuzzRoughness, 0.0, 1.0);
(*ma).coatWeight = select(0.0, clamp(matData.coatWeight, 0.0, 1.0), HAS_COAT);
(*ma).coatColor = max(matData.coatColor, vec3f(0.0));
(*ma).coatRoughness = clamp(matData.coatRoughness, ROUGHNESS_MIN, 1.0);
(*ma).coatAnisotropy = clamp(matData.coatAnisotropy, 0.0, 1.0);
(*ma).coatIor = max(matData.coatIor, 1.0);
(*ma).coatDarkening = clamp(matData.coatDarkening, 0.0, 1.0);

if (USE_DIFFUSE_MAPS) {
let diffuseMapIndex = i32(matData.diffuseMapIndex);
if (diffuseMapIndex >= 0) {

let nQ = sampleMap(
diffuseMapIndex, getMapUvSet(diffuseMapIndex, uv, uv1)
);


(*ma).baseColor *= decodeMapColor(diffuseMapIndex, nQ.rgb);


if (matData.mapAlphaUsage == ${pt.transmission}) {
(*ma).transmissionWeight = 1.0 - nQ.a;
}
else if (matData.mapAlphaUsage == ${pt.alpha}) {
(*ma).alpha *= nQ.a;
}
}
}

${Se("alphaMap","wgsl")}

${a}

${Se("transmissionMap","wgsl")}

if (USE_METALLIC_ROUGHNESS_MAPS) {

let mrtMapIndex = i32(matData.mrtMapIndex);
if (mrtMapIndex >= 0) {
let fK = sampleMap(
mrtMapIndex, getMapUvSet(mrtMapIndex, uv, uv1)
);
(*ma).baseMetalness *= fK.b;
(*ma).specularRoughness *= fK.g;
}
}

${Se("roughnessMap","wgsl")}

${Se("metalnessMap","wgsl")}

${xa("wgsl")}

${Se("coatWeightMap","wgsl")}

${e?`
(*ma).coatNormalEnabled = USE_COAT_NORMAL_MAPS && matData.coatNormalMapIndex >= 0.0 && (*ma).coatWeight > 0.0;
`:""}

${Se("coatRoughnessMap","wgsl")}

${Se("fuzzColorMap","wgsl")}

${Se("fuzzRoughnessMap","wgsl")}

${Se("specularWeightMap","wgsl")}

${Se("specularColorMap","wgsl")}

${i?`
(*ma).anisotropyDirection = vec2f(1.0, 0.0);
(*ma).anisotropyDirectionEnabled = matData.specularAnisotropyRotation != 0.0;
(*ma).coatAnisotropyRotation = matData.coatAnisotropyRotation;
if (USE_ANISOTROPY_MAPS && matData.anisotropyMapIndex >= 0.0) {
let index = i32(matData.anisotropyMapIndex);
let iX = sampleMap(index, getMapUvSet(index, uv, uv1));
(*ma).specularAnisotropy *= iX.b;
let direction = iX.rg * 2.0 - 1.0;
if (dot(direction, direction) > 1e-4) { (*ma).anisotropyDirection = normalize(direction); }
(*ma).anisotropyDirectionEnabled = true;
}
if (matData.specularAnisotropyModel > 0.5 && (*ma).specularAnisotropy > 0.0) {
let sv = fb(clamp((*ma).specularRoughness, 0.0, 1.0), (*ma).specularAnisotropy);
(*ma).specularRoughness = sv.x;
(*ma).specularAnisotropy = sv.y;
}
if ((*ma).anisotropyDirectionEnabled) {
let theta = matData.specularAnisotropyRotation;
let d = (*ma).anisotropyDirection;
(*ma).anisotropyDirection = vec2f(cos(theta)*d.x - sin(theta)*d.y, sin(theta)*d.x + cos(theta)*d.y);
}

`:""}


if ((*ma).coatWeight > 0.0 && (*ma).coatRoughness > 0.0) {
let hI = (*ma).specularRoughness * (*ma).specularRoughness;
let hJ = (*ma).coatRoughness * (*ma).coatRoughness;
(*ma).specularRoughness = mix((*ma).specularRoughness,
pow(min(1.0, hI * hI + 2.0 * hJ * hJ), 0.25), (*ma).coatWeight);
}
let instanceColor = kA(instanceIndex);
(*ma).baseColor *= instanceColor;
if ((*ma).materialType == UNLIT) { (*ma).emission *= instanceColor; }

(*ma).specularRoughness = clamp((*ma).specularRoughness, ROUGHNESS_MIN, 1.0);
(*ma).baseMetalness = clamp((*ma).baseMetalness, 0.0, 1.0);
let specularAlpha = aK((*ma).specularRoughness, (*ma).specularAnisotropy);
(*ma).alphaX = specularAlpha.x;
(*ma).alphaY = specularAlpha.y;
}

fn ob(materialIndex: i32, uv: vec2f, normal: vec3f, dp1: vec3f, dp2: vec3f, nS: vec2f, nT: vec2f) -> vec3f {
let matData = materialsBuffer[materialIndex];
let normalMapIndex = i32(matData.normalMapIndex);
if (normalMapIndex >= 0) {



let qO = cross(dp2, normal);
let qM = cross(normal, dp1);
var dpdu = qO * nS.x + qM * nT.x;
var se = qO * nS.y + qM * nT.y;
let dS = max(dot(dpdu, dpdu), dot(se, se));
if (dS > 1e-12) {
let sn = inverseSqrt(dS);
dpdu *= sn;
se *= sn;
}
else {


let nf = select(
vec3f(0.0, 1.0, 0.0),
vec3f(0.0, 0.0, 1.0),
abs(normal.z) < 0.999
);
dpdu = normalize(cross(nf, normal));
se = cross(normal, dpdu);
}

var n = 2.0 * sampleMap(normalMapIndex, uv).rgb - 1.0;
n = normalize(vec3(n.xy * matData.normalMapScale, n.z));

let tbn = mat3x3(dpdu, se, normal);

return normalize(tbn * n);
} else {
return normal;
}
}
`}var Nm=_n();var Kc=`


struct jx {
barycentric: vec3f,
t: f32,
normal: vec3f,

}

fn uQ(
uu: f32,
tQ: vec3f, tR: vec3f,
eAC: vec3f, eBD: vec3f,
iJ: vec3f,
pP: f32,
pR: ptr<function, f32>
) -> bool {
if (uu >= 0.0 && uu <= 1.0) {
let pAB = mix(tQ, tR, uu);
let pCD = mix(eAC, eBD, uu);
var n = cross(iJ, pCD);
let vq = 1.0 / dot(n, n);
n = cross(n, pAB);
let tt = dot(n, pCD) * vq;
let vv = dot(n, iJ) * vq;
if (vv >= 0.0 && vv <= 1.0 && tt > pP && tt < *pR) {
*pR = tt;
return true;
}
}
return false;
}

fn he(
pH: vec3f, iJ: vec3f, pP: f32, tf: f32,
pA: vec3f, pB: vec3f, pC: vec3f, pD: vec3f,
pR: ptr<function, f32>
) -> bool {
let eAB = pB - pA;
let eAC = pC - pA;
let eBD = pD - pB;
let eCD = pD - pC;
let tQ = pA - pH;
let tR = pB - pH;

var u1: f32;
var u2: f32;
{
let qN = cross(eAB, -eCD);
let a = dot(qN, iJ);
var b = dot(cross(tR, iJ), eBD);
let c = dot(cross(tQ, iJ), eAC);
b -= a + c;

let det = b * b - 4.0 * a * c;
if (det < 0.0) {
return false;
}

if (a == 0.0) {
u1 = -c / b;
u2 = -1.0;
} else {
let vJ = sqrt(det);
let wC = -0.5 * (b + sign(b) * vJ);
u1 = wC / a;
u2 = c / wC;
}
}

*pR = tf;

var hit = false;

hit = uQ(u1, tQ, tR, eAC, eBD, iJ, pP, pR) || 
uQ(u2, tQ, tR, eAC, eBD, iJ, pP, pR);
if (!hit) {
return false;
}

return true;
}

fn sl(
pH: vec3f, iJ: vec3f, pP: f32, tf: f32,
pA: vec3f, pB: vec3f, pC: vec3f,
pD: vec3f, pE: vec3f, pF: vec3f,

bT: ptr<function, f32>,
bS: ptr<function, f32>
) -> bool {
*bT = INF;
*bS = -INF;

let vW = maxDimension(abs(iJ));
let gL = mj(iJ, vW);
var tt: f32;

tt = fI(
pH, iJ,
fu(pC, pB, pA), vW, gL, INF
).t;
if (tt > 0.0) {
*bT = min(*bT, tt);
*bS = max(*bS, tt);
}
tt = fI(
pH, iJ,
fu(pD, pE, pF), vW, gL, INF
).t;
if (tt > 0.0) {
*bT = min(*bT, tt);
*bS = max(*bS, tt);
}
if (he(
pH, iJ, -INF, INF,
pA, pB, pD, pE,
&tt)) {
*bT = min(*bT, tt);
*bS = max(*bS, tt);
}
if (he(
pH, iJ, -INF, INF,
pB, pC, pE, pF,
&tt)) {
*bT = min(*bT, tt);
*bS = max(*bS, tt);
}
if (he(
pH, iJ, -INF, INF,
pC, pA, pF, pD,
&tt)) {
*bT = min(*bT, tt);
*bS = max(*bS, tt);
}

*bT = max(*bT, pP);
*bS = min(*bS, tf);

return *bT <= *bS && *bS > 0.0;
}
`,yo=`

${Kc}

fn lG(p: vec3f, p0: vec3f, p1: vec3f, p2: vec3f) -> vec3f {
let v0 = p1 - p0;
let v1 = p2 - p0;
let v2 = p - p0;

let d00 = dot(v0, v0);
let d01 = dot(v0, v1);
let d11 = dot(v1, v1);
let d20 = dot(v2, v0);
let d21 = dot(v2, v1);

let tM = 1.0 / (d00 * d11 - d01 * d01);
let v = clamp((d11 * d20 - d01 * d21) * tM, 0.0, 1.0);
let w = clamp((d00 * d21 - d01 * d20) * tM, 0.0, 1.0);
let u = 1.0 - v - w;

return vec3f(u, v, w);
}

fn sO(uv: vec2f) -> vec2f {
return (uv % 1.0 + 1.0) % 1.0;
}


fn oT(
qj: vec3f, qE: vec3f, wJ: f32,
_pA: vec3f, _pB: vec3f, _pC: vec3f,
_nA: vec3f, _nB: vec3f, _nC: vec3f,
vy: vec2f, vA: vec2f, vB: vec2f,

jJ: i32,
vx: vec2f,

wc: f32, wb: f32,
hScale: f32,
uC: f32,
tY: f32,
uvProjection: i32,
uvScale: vec2f,
vO: bool,
qU: bool
) -> jx {



let DT = select(max(abs(hScale) / 32.0, 1e-12), tY, tY > 0.0);
let dt = DT / length(qE);
let dbx = 0.001;
let dby = 0.001;

var result: jx;
result.t = INF;

var bT = INF;
var bS = -INF;

let qS = sign(hScale);
let uI = abs(hScale);

let sX = qS * normalize(cross(_pB - _pA, _pC - _pA));


let dA = dot(_nA, sX);
let dB = dot(_nB, sX);
let dC = dot(_nC, sX);

var minH = wc * hScale * min(min(dA, dB), dC);
var maxH = wb * hScale * max(max(dA, dB), dC);




let tS = abs(maxH) - abs(minH);


minH = sign(minH) * max(abs(minH) - DT * 2.0, 0.0);
if (tS < DT * 2.0) {
maxH = sign(maxH) * min(abs(maxH) + DT * 2.0, abs(hScale));
}

let pA = _pA + _nA * minH / dA;
let pB = _pB + _nB * minH / dB;
let pC = _pC + _nC * minH / dC;

let pD = _pA + _nA * maxH / dA;
let pE = _pB + _nB * maxH / dB;
let pF = _pC + _nC * maxH / dC;

if (!sl(
qj, qE, 0.0, INF,
pA, pB, pC,
pD, pE, pF,

&bT, &bS
)) {
return result;
}

var wE = false;

if (bS == bT) {
bT = 0.0;
}

var t = bT + dt * eo(2u);
var s = qj + qE * t;
var tL = dot(s - _pA, sX);
var uW = select(0.0, INF, qS < 0.0);

var c0 = _pA + _nA * tL / dA;
var c1 = _pB + _nB * tL / dB;
var c2 = _pC + _nC * tL / dC;

var tv: vec3f;

tL = abs(tL);

var qR = tL - uW;
var pQ = qR;
var step = 0;

while (true) {

let b = lG(s, c0, c1, c2);

tv = _pA * b.x + _pB * b.y + _pC * b.z;

tL = distance(tv, s);

var uv: vec2f;
if (uvProjection > 0) {
let n = normalize(_nA * b.x + _nB * b.y + _nC * b.z);
uv = sO(gC(uvProjection, tv - (_nA * b.x + _nB * b.y + _nC * b.z) * uC, n) * uvScale);
}
else {
uv = sO(vy * b.x + vA * b.y + vB * b.z);
}
let h = sampleMap(jJ, uv).x;

uW = max(uI * h, DT);


let dh = dot(sX, s - c0);
c0 = c0 + _nA * dh / dA;
c1 = c1 + _nB * dh / dB;
c2 = c2 + _nC * dh / dC;

pQ = qR;
qR = tL - uW;

if (!(select(qR * qS, qR * pQ, qU) > 0.0
&& t < bS + dt) 

&& step > 0) {
break;
}

step++;
t = t + dt;
s = s + qE * dt;
}

if (select(qR * qS, qR * pQ, qU) <= 0.0) {
let dtt = dt * (abs(qR) / (abs(pQ) + abs(qR) + EPS));
t = t - dtt;

let wG = qj + qE * t;
let b = lG(wG, c0, c1, c2);

let N = normalize(_nA * b.x + _nB * b.y + _nC * b.z);

let p_a = _pA * b.x + _pB * b.y + _pC * b.z;
let p_b = _pA * (b.x + dbx) + _pB * b.y + _pC * (b.z - dbx);
let p_c = _pA * b.x + _pB * (b.y + dby) + _pC * (b.z - dby);

var vY: vec2f;
var vZ: vec2f;
var wa: vec2f;

if (uvProjection > 0) {
let NA = normalize(_nA * b.x + _nB * b.y + _nC * b.z);
let NB = normalize(_nA * (b.x + dbx) + _nB * b.y + _nC * (b.z - dbx));
let NC = normalize(_nA * b.x + _nB * (b.y + dby) + _nC * (b.z - dby));  
vY = gC(uvProjection, p_a - (_nA * b.x + _nB * b.y + _nC * b.z) * uC, NA) * uvScale;
vZ = gC(uvProjection, p_b - (_nA * (b.x + dbx) + _nB * b.y + _nC * (b.z - dbx)) * uC, NB) * uvScale;
wa = gC(uvProjection, p_c - (_nA * b.x + _nB * (b.y + dby) + _nC * (b.z - dby)) * uC, NC) * uvScale;
}
else {
vY = vy * b.x + vA * b.y + vB * b.z;
vZ = vy * (b.x + dbx) + vA * b.y + vB * (b.z - dbx);
wa = vy * b.x + vA * (b.y + dby) + vB * (b.z - dby);
}

let s_a = p_a + qS * N * sampleMap(jJ, sO(vY)).x * hScale;
let s_b = p_b + qS * N * sampleMap(jJ, sO(vZ)).x * hScale;
let s_c = p_c + qS * N * sampleMap(jJ, sO(wa)).x * hScale;

let N_s = -qS * normalize(cross(s_c - s_a, s_b - s_a));

result.t = t;
result.barycentric = b;
result.normal = normalize(N_s - sX + qS * N);
}

return result;

}
`;function Qn(i=!0){return`
fn nr(
pl: i32,
index: vec3i,
aB: vec3f,
eU: vec3f,
eC: vec3f
) -> bool {
var materialIndex = pl;
let m0 = vec3i(attrBuffers[index.x * ATTR_STRIDE + MATERIALINDEX_OFF]${i?".xyz":""});
let m1 = vec3i(attrBuffers[index.y * ATTR_STRIDE + MATERIALINDEX_OFF]${i?".xyz":""});
let m2 = vec3i(attrBuffers[index.z * ATTR_STRIDE + MATERIALINDEX_OFF]${i?".xyz":""});

if (m0.x > 0 || m1.x > 0 || m2.x > 0) {
materialIndex = fj(m0, m1, m2, aB);
}

let ma = materialsBuffer[materialIndex];
var alpha = ma.alpha;
if (USE_DIFFUSE_MAPS &&
ma.mapAlphaUsage == ${pt.alpha}) {
let diffuseMapIndex = i32(ma.diffuseMapIndex);
if (diffuseMapIndex >= 0) {
let uvProjection = i32(ma.uvProjection);
let uv0 = attrBuffers[index.x * ATTR_STRIDE + UV_OFF].xy;
let uv1 = attrBuffers[index.y * ATTR_STRIDE + UV_OFF].xy;
let uv2 = attrBuffers[index.z * ATTR_STRIDE + UV_OFF].xy;
var uv = aB.x * uv0 +
aB.y * uv1 + aB.z * uv2;
if (uvProjection > 0) {
uv = gC(uvProjection, eU, eC);
}
uv *= ma.uvScale;
if (uvProjection == ${Ke.triplanar}) {
uv = fract(uv);
}
alpha *= sampleMap(diffuseMapIndex, uv).a;
}
}

if (USE_ALPHA_MAPS) {
let alphaMapIndex = i32(ma.alphaMapIndex);
if (alphaMapIndex >= 0) {
let uvProjection = i32(ma.uvProjection);
let uv0 = attrBuffers[index.x * ATTR_STRIDE + UV_OFF].xy;
let uv1 = attrBuffers[index.y * ATTR_STRIDE + UV_OFF].xy;
let uv2 = attrBuffers[index.z * ATTR_STRIDE + UV_OFF].xy;
var uv = aB.x * uv0 +
aB.y * uv1 + aB.z * uv2;
if (uvProjection > 0) {
uv = gC(uvProjection, eU, eC);
}
uv *= ma.uvScale;
if (uvProjection == ${Ke.triplanar}) {
uv = fract(uv);
}
alpha *= sampleMap(alphaMapIndex, uv).g;
}
}

let alphaMode = i32(ma.alphaMode);
if (alphaMode == ${dt.opaque}) {
alpha = 1.0;
}
else if (alphaMode == ${dt.mask}) {
alpha = select(0.0, 1.0, alpha >= ma.alphaCutoff);
}
if (alphaMode == ${dt.blend}) {
return eo(1u) <= alpha;
}
return alpha >= 1.0;
}
`}var Ym=Qn();var Xc=yo,Mo=function(){return`
let hit = fI(o, d, tri, ey, gL, tMax);
if (hit.t > 0.0) {
let e1 = tri.p1 - tri.p0;
let e2 = tri.p2 - tri.p0;
eC = normalize(cross(e1, e2));
let kd = i32(ae(bitcast<i32>(oh.z)).x);
let iI = materialsBuffer[kd].doubleSided > 0.5;
if (!doubleSided && !iI && dot(eC, d) > 0.0) {
eC = vec3f(0.0);
continue;
}

tMax = hit.t;
qT = true;
ol = true;
eU = o + tMax * d;
aB = hit.barycentric;
}
`};function $c(i){return`
let kO = oT(
o, d, tMax,
tri.p0, tri.p1, tri.p2,
n0, n1, n2,
uv0, uv1, uv2,
displacementMapIndex,
oa(displacementMapIndex),
minH, maxH,
hScale,
matData.displacementBias,
matData.displacementStepSize,
i32(matData.displacementUvProjection),
displacementUvProjectionScale,
${i?"true":"false"},
lq
);
`}var Zc=function(i,e){return`

let hScale = oh.w;
let tn = bitcast<i32>(r3.w);

let materialIndex = i32(ae(bitcast<i32>(oh.z)).x);
let matData = materialsBuffer[materialIndex];
let n0 = normalize(attrBuffers[index.x * ATTR_STRIDE + NORMAL_OFF]${e?".xyz":""});
let n1 = normalize(attrBuffers[index.y * ATTR_STRIDE + NORMAL_OFF]${e?".xyz":""});
let n2 = normalize(attrBuffers[index.z * ATTR_STRIDE + NORMAL_OFF]${e?".xyz":""});
if (matData.displacementMapIndex >= 0.0 && matData.displacementBias != 0.0) {
tri.p0 += n0 * matData.displacementBias;
tri.p1 += n1 * matData.displacementBias;
tri.p2 += n2 * matData.displacementBias;
}
if (abs(hScale) > 0.0 && tn > 0) {
let minH = f32(tn >> 8) / 255.0;
let maxH = f32(tn & 0xff) / 255.0;
let displacementUvProjectionScale = vec2f(matData.displacementUvProjectionScale);
let displacementMapIndex = i32(matData.displacementMapIndex);


var uv0 = attrBuffers[index.x * ATTR_STRIDE + UV_OFF].xy;
var uv1 = attrBuffers[index.y * ATTR_STRIDE + UV_OFF].xy;
var uv2 = attrBuffers[index.z * ATTR_STRIDE + UV_OFF].xy;

${$c(i)}

if (kO.t < tMax) {
eC = kO.normal;


tMax = kO.t;

aB = kO.barycentric;
eU = o + tMax * d;

bU = true;
qT = true;
ol = true;
}
}
else {
${Mo()}
}
`},ef=`
fn bp(value: u32) -> vec4f {
return vec4f(
f32(value & 0xffu),
f32((value >> 8u) & 0xffu),
f32((value >> 16u) & 0xffu),
f32(value >> 24u)
);
}







fn kn(value: u32) -> u32 {
return (bitcast<u32>(f32(value)) >> 23u) - 127u;
}

fn nO(value: u32) -> u32 {
return (bitcast<u32>(f32(value)) >> 23u) - 127u;
}

fn oi(
node: i32,
tc: i32,
n0: vec4f,
o: vec3f,
gx: vec3f,
tMax: f32
) -> u32 {
let i = node + tc;
let n2 = bvhBuffer[i + 2];
let n3 = bvhBuffer[i + 3];
let n4 = bvhBuffer[i + 4];
let header = bitcast<u32>(n0.w);
let rv = bitcast<i32>((header & 0xffu) << 24u) >> 24;
let rw = bitcast<i32>(((header >> 8u) & 0xffu) << 24u) >> 24;
let rA = bitcast<i32>(((header >> 16u) & 0xffu) << 24u) >> 24;
let hF = vec3f(
bitcast<f32>(u32(rv + 127) << 23u),
bitcast<f32>(u32(rw + 127) << 23u),
bitcast<f32>(u32(rA + 127) << 23u)
);
let bJ = eV(gx, o);
let eH = (n0.xyz - o) * gx;
let da = hF * gx;
let wr = bp(bitcast<u32>(n2.x));
let ws = bp(bitcast<u32>(n2.y));
let wt = bp(bitcast<u32>(n2.z));
let wu = bp(bitcast<u32>(n2.w));
let wv = bp(bitcast<u32>(n3.x));
let ww = bp(bitcast<u32>(n3.y));
let wl = bp(bitcast<u32>(n3.z));
let wm = bp(bitcast<u32>(n3.w));
let wn = bp(bitcast<u32>(n4.x));
let wo = bp(bitcast<u32>(n4.y));
let wp = bp(bitcast<u32>(n4.z));
let wq = bp(bitcast<u32>(n4.w));

let vh = wr * da.x + eH.x;
let vk = wt * da.y + eH.y;
let vm = wv * da.z + eH.z;
let va = wl * da.x + eH.x;
let vc = wn * da.y + eH.y;
let ve = wp * da.z + eH.z;
let wx = max(
max((min(vh, va) - vec4f(bJ.x)), (min(vk, vc) - vec4f(bJ.y))),
(min(vm, ve) - vec4f(bJ.z))
);
let wg = min(
min((max(vh, va) + vec4f(bJ.x)), (max(vk, vc) + vec4f(bJ.y))),
(max(vm, ve) + vec4f(bJ.z))
);

let vj = ws * da.x + eH.x;
let vl = wu * da.y + eH.y;
let vn = ww * da.z + eH.z;
let vb = wm * da.x + eH.x;
let vd = wo * da.y + eH.y;
let vg = wq * da.z + eH.z;
let wy = max(
max((min(vj, vb) - vec4f(bJ.x)), (min(vl, vd) - vec4f(bJ.y))),
(min(vn, vg) - vec4f(bJ.z))
);
let wh = min(
min((max(vj, vb) + vec4f(bJ.x)), (max(vl, vd) + vec4f(bJ.y))),
(max(vn, vg) + vec4f(bJ.z))
);

let uD = (wx <= min(wg, vec4f(tMax))) & (wg > vec4f(0.0));
let uE = (wy <= min(wh, vec4f(tMax))) & (wh > vec4f(0.0));
return select(0u, 1u, uD.x)
| select(0u, 2u, uD.y)
| select(0u, 4u, uD.z)
| select(0u, 8u, uD.w)
| select(0u, 16u, uE.x)
| select(0u, 32u, uE.y)
| select(0u, 64u, uE.z)
| select(0u, 128u, uE.w);
}

`;function bn(i,e,t,A,a,r=""){let n=`
let oh = instancesBuffer[cf * ${Y}];
let vertexOffset = vec3i(bitcast<i32>(oh.y));
for (var k = 0; k < bh; k++) {
let triangleIndex = primitiveOffset + k;
${r}
if (bounces > 0 && triangleIndex == hK) {
continue;
}

let r3 = bvhBuffer[triangleIndex];
let index = bitcast<vec3i>(r3.xyz) + vertexOffset;
var tri = fu(
attrBuffers[index.x * ATTR_STRIDE + POSITION_OFF]${a?".xyz":""},
attrBuffers[index.y * ATTR_STRIDE + POSITION_OFF]${a?".xyz":""},
attrBuffers[index.z * ATTR_STRIDE + POSITION_OFF]${a?".xyz":""}
);
var ol = false;

${e?Zc(t,a):Mo()}
if (ol) {
${i}
}
}
`;return`
var d = ray.d;
var o = ray.o;
var lQ: array<i32, TLAS_STACK_SIZE>;
var jd = -1;
var gx = eX(d);
var bU = false;
var qT = false;
var eU: vec3f;
var eC: vec3f;
var aB: vec3f;


if (cM(o, bvhBuffer[0].xyz, bvhBuffer[1].xyz, gx, tMax) > 0.0) {
jd = 0;
lQ[0] = 0;
}
while (jd >= 0) {
let sN = lQ[jd];
jd--;
o = ray.o;
d = ray.d;
gx = eX(d);

let vX = bvhBuffer[sN];
let eR = bitcast<i32>(vX.w);
if (eR >= 0) {
let left = sN + 2;
let right = eR;
let d0 = cM(
o,
bvhBuffer[left].xyz,
bvhBuffer[left + 1].xyz,
gx,
tMax
);
let d1 = cM(
o,
bvhBuffer[right].xyz,
bvhBuffer[right + 1].xyz,
gx,
tMax
);

if (d0 > d1) {
if (d0 > 0.0) { jd++; lQ[jd] = left; }
if (d1 > 0.0) { jd++; lQ[jd] = right; }
}
else {
if (d1 > 0.0) { jd++; lQ[jd] = right; }
if (d0 > 0.0) { jd++; lQ[jd] = left; }
}
}
else {
let qB = -eR;


for (
var ml = qB - 1;
ml >= 0;
ml--
) {
let pq = bvhBuffer[sN + 2 + ml];
let cf = bitcast<i32>(pq.x);
let uN = bitcast<i32>(pq.y);
let oh = instancesBuffer[cf * ${Y}];
let w2l = mat4x4<f32>(
instancesBuffer[cf * ${Y} + 1],
instancesBuffer[cf * ${Y} + 2],
instancesBuffer[cf * ${Y} + 3],
instancesBuffer[cf * ${Y} + 4]
);
o = (w2l * vec4f(ray.o, 1.0)).xyz;
d = (w2l * vec4f(ray.d, 0.0)).xyz;
gx = eX(d);
ey = maxDimension(abs(d));
gL = mj(d, ey);

let fG = bitcast<u32>(oh.x);
let gN = fG >> 30u;
let blasOffset = i32(fG & 0x3fffffffu);
let bo = rtUniform.blasOffset;

${(A&8)!==0?`
if (gN == 3u) {




var sd: array<vec2u, BLAS_STACK_SIZE>;
var pe = -1;
var rP = 0u;
var kQ = 0u;

var ep = 0x80000000u;
let ul = select(0u, 4u, d.x < 0.0)
| select(0u, 2u, d.y < 0.0)
| select(0u, 1u, d.z < 0.0);
let qd = 7u - ul;




while (rP < 4096u) {
rP++;

let internalMask = ep & 0xffu;
let pZ =
kn(ep >> 24u) + 24u;
ep &= ~(1u << pZ);
if ((ep & 0xff000000u) != 0u) {
pe++;

sd[pe] = vec2u(kQ, ep);
}

let slot = (pZ - 24u) ^ qd;
let ne = (1u << slot) - 1u;
let relativeIndex = countOneBits(internalMask & ne);
let sb = kQ + relativeIndex;
let node = blasOffset + i32(sb * 5u);
let ju = bvhBuffer[node + bo];
let tX = oi(
node, bo, ju, o, gx, tMax
);


ep = 0u;
if (tX != 0u) {
let fC = bvhBuffer[node + bo + 1];
let rG = bitcast<u32>(ju.w) >> 24u;
var tl = 0u;
var jZ = tX;
while (jZ != 0u) {
let rr = kn(jZ);
jZ &= ~(1u << rr);
let su = select(
bitcast<u32>(fC.z),
bitcast<u32>(fC.w),
rr >= 4u
);
let sW =
(su >> ((rr & 3u) * 8u)) & 0xffu;
let jw = sW & 0x1fu;
let uM = select(
jw,
jw ^ qd,
jw >= 24u
);
let uH = (sW >> 5u) & 0x7u;
tl |= uH << uM;
}

kQ = bitcast<u32>(fC.x);
ep = (tl & 0xff000000u) | rG;
let oH = bitcast<u32>(fC.y);
var oI = tl & 0x00ffffffu;
while (oI != 0u) {
let nI = nO(oI);
oI &= ~(1u << nI);
let bh = 1;
let primitiveOffset = bo + blasOffset
+ i32(oH + nI);
${n}
}
}

if ((ep & 0xff000000u) != 0u) { continue; }
if (pe >= 0) {
let qe = sd[pe];
kQ = qe.x;
ep = qe.y;
pe--;
}
else { break; }
}
}
`:""}

var gp: array<i32, BLAS_STACK_SIZE>;
var dR = -1;
if (gN != 3u) {
dR = 0;

gp[0] = uN;
}

while (dR >= 0) {

let node = gp[dR];
dR--;
var bh = 0;
var primitiveOffset = 0;

${(A&4)!==0?`
if (gN == 2u) {
let i = node + bo;
let uR = bvhBuffer[i];
let uS = bvhBuffer[i + 1];
let uT = bvhBuffer[i + 2];
let uU = bvhBuffer[i + 3];
bh = i32(bitcast<u32>(uT.w));
if (bh > 0) {
primitiveOffset = bo + blasOffset
+ i32(bitcast<u32>(uU.w));
}
else {
let left = blasOffset + i32(bitcast<u32>(uR.w) * 4u);
let right = blasOffset + i32(bitcast<u32>(uS.w) * 4u);
let om = cM(
o, uR.xyz, uS.xyz, gx, tMax
);
let ng = cM(
o, uT.xyz, uU.xyz, gx, tMax
);
if (om > ng) {
if (om > 0.0) {
dR++; gp[dR] = left;
}
if (ng > 0.0) {
dR++; gp[dR] = right;
}
}
else {
if (ng > 0.0) {
dR++; gp[dR] = right;
}
if (om > 0.0) {
dR++; gp[dR] = left;
}
}
}
}
`:""}
${(A&2)!==0?`
if (gN == 1u) {
let hS = bitcast<u32>(node);
if ((hS & 0x80000000u) != 0u) {
bh = i32((hS >> 23u) & 0xffu);
primitiveOffset = bo + blasOffset
+ i32(hS & 0x007fffffu);
}
else {
let i = node + bo;
let ub = bvhBuffer[i];
let rf = bvhBuffer[i + 1];
let rh = bvhBuffer[i + 2];
let ri = bvhBuffer[i + 3];
let nodeMin = ub.xyz;
let ec = vec3f(ub.w, rf.x, rf.y);
let lV = array<u32, 4>(
bitcast<u32>(rf.z), bitcast<u32>(rf.w),
bitcast<u32>(rh.x), bitcast<u32>(rh.y)
);
let ro = unpack4x8unorm(bitcast<u32>(rh.z));
let rp = unpack4x8unorm(bitcast<u32>(rh.w));
let rq = unpack4x8unorm(bitcast<u32>(ri.x));
let rl = unpack4x8unorm(bitcast<u32>(ri.y));
let rm = unpack4x8unorm(bitcast<u32>(ri.z));
let rn = unpack4x8unorm(bitcast<u32>(ri.w));
let tx0 = (nodeMin.x + ro * ec.x - o.x) * gx.x;
let tx1 = (nodeMin.x + rl * ec.x - o.x) * gx.x;
let ty0 = (nodeMin.y + rp * ec.y - o.y) * gx.y;
let ty1 = (nodeMin.y + rm * ec.y - o.y) * gx.y;
let tz0 = (nodeMin.z + rq * ec.z - o.z) * gx.z;
let tz1 = (nodeMin.z + rn * ec.z - o.z) * gx.z;
let bJ = eV(gx, o);
let mB = max(
max((min(tx0, tx1) - vec4f(bJ.x)), (min(ty0, ty1) - vec4f(bJ.y))),
(min(tz0, tz1) - vec4f(bJ.z))
);
let rM = min(
min((max(tx0, tx1) + vec4f(bJ.x)), (max(ty0, ty1) + vec4f(bJ.y))),
(max(tz0, tz1) + vec4f(bJ.z))
);
var distance = select(rM, mB, mB > vec4f(0.0));
distance = select(
distance,
vec4f(-1.0),
mB > min(rM, vec4f(tMax))
);
var fa = array<f32, 4>(
distance.x,
distance.y,
distance.z,
distance.w
);


for (var order = 0; order < 4; order++) {
var dX = -1.0;
var el = -1;
for (var child = 0; child < 4; child++) {
if (
lV[child] != 0u &&
fa[child] > dX
) {
dX = fa[child];
el = child;
}
}
if (el >= 0 && dX > 0.0) {
let nl = lV[el];
var jD = bitcast<i32>(nl);
if ((nl & 0x80000000u) == 0u) {
jD += blasOffset;
}
dR++;
gp[dR] = jD;
fa[el] = -1.0;
}
}
}
}
`:""}
${(A&1)!==0?`
if (gN == 0u) {
let i = node + bo;
let r1 = bvhBuffer[i];
let bb = bitcast<i32>(r1.w);

if (bb >= 0) {
let left = node + 2;
let right = bb + blasOffset;
let d0 = cM(
o,
bvhBuffer[left + bo].xyz,
bvhBuffer[left + 1 + bo].xyz,
gx,
tMax
);
let d1 = cM(
o,
bvhBuffer[right + bo].xyz,
bvhBuffer[right + 1 + bo].xyz,
gx,
tMax
);

if (d0 > d1) {
if (d0 > 0.0) {
dR++; gp[dR] = left;

}
if (d1 > 0.0) {
dR++; gp[dR] = right;

}
}
else {
if (d1 > 0.0) {
dR++; gp[dR] = right;

}
if (d0 > 0.0) {
dR++; gp[dR] = left;

}
}
}
else {
bh = -bb;
primitiveOffset = i + 2;
}
}
`:""}
if (bh > 0) {
${n}
}
}
}
}
}

`}function xn({hasDisplacement:i,hasAnisotropyDirections:e=!0,hasCoatNormals:t=!1,blasLayoutMask:A=1}){return`

${i?Xc:""}
${(A&8)!==0?ef:""}

struct fu {
p0: vec3f,
p1: vec3f,
p2: vec3f,
};

fn ht(rad: f32, pos: vec3f, r: Ray) -> f32 {
let op: vec3f = pos - r.o;
let eps: f32 = 0.001;
let b: f32 = dot(op, r.d);
var det: f32 = b * b - dot(op, op) + rad * rad;
if (det < 0.0) {
return INF;
}

det = sqrt(det);
let t1: f32 = b - det;
if (t1 > eps) {
return t1;
}

let t2: f32 = b + det;
if (t2 > eps) {
return t2;
}

return INF;
}

fn mU(pos: vec3f, u: vec3f, v: vec3f, n: vec3f, r: Ray) -> f32 {
let dt: f32 = dot(r.d, n);
let t: f32 = (dot(n, pos) - dot(n, r.o)) / dt;

if (t > EPS) {
let p: vec3f = r.o + r.d * t;
let vi: vec3f = p - pos;
let a1: f32 = dot(u / dot(u, u), vi);
if (a1 >= 0.0 && a1 <= 1.0) {
let a2: f32 = dot(v / dot(v, v), vi);
if (a2 >= 0.0 && a2 <= 1.0) {
return t;
}
}
}

return INF;
}

fn sphereSolidAnglePdf(origin: vec3f, center: vec3f, radius: f32) -> f32 {
let aj = distance(origin, center);
if (aj <= radius) { return INV4PI; }
let jp = min(1.0, radius * radius / (aj * aj));
let cosThetaMax = sqrt(max(0.0, 1.0 - jp));
return 1.0 / max(TWOPI * (1.0 - cosThetaMax), 1e-8);
}

fn mo(r: Ray, light: Light, lightSample: ptr<function, LightSampleRec>) -> f32 {


var d: f32 = INF;
(*lightSample).direction = r.d;
(*lightSample).normal = -r.d;
(*lightSample).dist = INF;
(*lightSample).pdf = 0.0;
(*lightSample).emission = vec3f(0.0);
(*lightSample).isDelta = false;
var u = light.u;
var v = light.v;
var dO = i32(light.litType);

if (dO == RECT_LIGHT) {

var pos = light.position - u * 0.5 - v * 0.5;
var normal = normalize(cross(u, v));
if (dot(normal, r.d) > 0.0) { 
return INF;
}

d = mU(pos, u, v, normal, r);
if (d < 0.0) {
d = INF;
}
else {
var cc: f32 = dot(-r.d, normal);
let spread = light.radiusOrSpread;
if (cc >= cos(spread * PI / 2.0)) {
(*lightSample).direction = r.d;
(*lightSample).normal = normal;
(*lightSample).dist = d;
(*lightSample).pdf = (d * d) / (light.area * cc);
(*lightSample).emission = light.emission;
(*lightSample).isDelta = false;
}
else {
d = INF;
}
}
}

else if (dO == SPHERE_LIGHT) {
if (light.radiusOrSpread <= 0.0) {
let kh = light.position - r.o;
let projection = dot(kh, r.d);
let ba = kh - projection * r.d;
if (projection <= EPS || dot(ba, ba) > 1e-8) {
return INF;
}
d = projection;
(*lightSample).direction = r.d;
(*lightSample).normal = -r.d;
(*lightSample).dist = d;
(*lightSample).pdf = 1.0;
(*lightSample).isDelta = true;
}
else {
d = ht(light.radiusOrSpread, light.position, r);
(*lightSample).isDelta = false;
if (d > 0.0 && d != INF) {
(*lightSample).direction = r.d;
(*lightSample).dist = d;
(*lightSample).normal = normalize(
r.o + r.d * d - light.position
);
(*lightSample).pdf = sphereSolidAnglePdf(
r.o,
light.position,
light.radiusOrSpread
);
}
}
if (d < 0.0) {
d = INF;
}
else {
(*lightSample).direction = r.d;
(*lightSample).dist = d;
(*lightSample).emission = select(
light.emission,
light.emission / max(d * d, 1e-8),
light.radiusOrSpread <= 0.0
);
}
}

else if (dO == SPOT_LIGHT) {
if (light.radiusOrSpread <= 0.0) {
let kh = light.position - r.o;
let projection = dot(kh, r.d);
let ba = kh - projection * r.d;
if (projection <= EPS || dot(ba, ba) > 1e-8) {
return INF;
}
d = projection;
(*lightSample).direction = r.d;
(*lightSample).normal = -r.d;
(*lightSample).dist = d;
(*lightSample).pdf = 1.0;
(*lightSample).isDelta = true;
}
else {
d = ht(light.radiusOrSpread, light.position, r);
(*lightSample).isDelta = false;
}
if (d != INF) {
let uX = r.o + d * r.d;
let mr = bL(light, normalize(r.o - uX));
if (mr <= 0.0) { return INF; }
if (light.radiusOrSpread > 0.0) {
(*lightSample).direction = r.d;
(*lightSample).dist = d;
(*lightSample).normal = normalize(
r.o + r.d * d - light.position
);
(*lightSample).pdf = sphereSolidAnglePdf(r.o, light.position, light.radiusOrSpread);
}
(*lightSample).emission = light.emission * mr * select(
1.0,
1.0 / max(d * d, 1e-8),
light.radiusOrSpread <= 0.0
);
}
}

else if (dO != RECT_LIGHT && dO != SPHERE_LIGHT && dO != SPOT_LIGHT) {

d = INF;
}

return d;
}

fn fj(m0: vec3i, m1: vec3i, m2: vec3i, eZ: vec3f) -> i32 {
let m00 = ae(m0.x);
let m01 = ae(m0.y);
let m02 = ae(m0.z);
let m10 = ae(m1.x);
let m11 = ae(m1.y);
let m12 = ae(m1.z);
let m20 = ae(m2.x);
let m21 = ae(m2.y);
let m22 = ae(m2.z);
var w00 = m00.y * eZ.x;
var w01 = m01.y * eZ.x;
var w02 = m02.y * eZ.x;
var w10 = m10.y * eZ.y;
var w11 = m11.y * eZ.y;
var w12 = m12.y * eZ.y;
var w20 = m20.y * eZ.z;
var w21 = m21.y * eZ.z;
var w22 = m22.y * eZ.z;

var hg = w00 + w01 + w02 + w10 + w11 + w12 + w20 + w21 + w22;

w00 = w00 / hg;
w01 = w01 / hg + w00;
w02 = w02 / hg + w01;
w10 = w10 / hg + w02;
w11 = w11 / hg + w10;
w12 = w12 / hg + w11;
w20 = w20 / hg + w12;
w21 = w21 / hg + w20;
w22 = w22 / hg + w21;

let rand = eo(0u);
var mV: f32;
if (rand < w00) {
mV = m00.x;
} else if (rand < w01) {
mV = m01.x;
} else if (rand < w02) {
mV = m02.x;
} else if (rand < w10) {
mV = m10.x;
} else if (rand < w11) {
mV = m11.x;
} else if (rand < w12) {
mV = m12.x;
} else if (rand < w20) {
mV = m20.x;
} else if (rand < w21) {
mV = m21.x;
} else {
mV = m22.x;
}
return i32(mV);
}

fn lM(
oR: i32,
index: vec3i,
eZ: vec3f
) -> i32 {
let m0 = vec3i(attrBuffers[index.x * ATTR_STRIDE + MATERIALINDEX_OFF]${e?".xyz":""});
let m1 = vec3i(attrBuffers[index.y * ATTR_STRIDE + MATERIALINDEX_OFF]${e?".xyz":""});
let m2 = vec3i(attrBuffers[index.z * ATTR_STRIDE + MATERIALINDEX_OFF]${e?".xyz":""});
if (m0.x > 0 || m1.x > 0 || m2.x > 0) {
return fj(m0, m1, m2, eZ);
}
return oR;
}



${e?`
fn eD(normal: vec3f, dp1: vec3f, dp2: vec3f, nS: vec2f, nT: vec2f, input: vec4f) -> mat2x3f {
let determinant = nS.x * nT.y - nS.y * nT.x;
var t = input.xyz;
var b = vec3f(0.0);

var sign = select(input.w, 0.0, abs(input.w) > 1.5);
if (abs(determinant) > 1e-12) {
let dt = (dp1 * nT.y - dp2 * nS.y) / determinant;
let db = (dp2 * nS.x - dp1 * nT.x) / determinant;
if (dot(t, t) < 1e-8) { t = dt; }
if (sign == 0.0) { sign = select(1.0, -1.0, dot(cross(normal, dt), db) < 0.0); }
}
t -= normal * dot(normal, t);
if (dot(t, t) < 1e-8) {
let ie = select(-1.0, 1.0, normal.z >= 0.0);
let dW = -1.0 / (ie + normal.z);
let xy = normal.x * normal.y * dW;
t = vec3f(1.0 + ie * normal.x * normal.x * dW, ie * xy, -ie * normal.x);
b = vec3f(xy, ie + normal.y * normal.y * dW, -normal.y);
}
else { t = normalize(t); b = normalize(cross(normal, t)); }
return mat2x3f(t, b * select(1.0, -1.0, sign < 0.0));
}

`:""}
fn hp(
si: ptr<function, ad>,
tri: fu,
eZ: vec3f,
index: vec3i,
bU: bool,
fq: i32
) {
(*si).hit = true;

let material = materialsBuffer[(*si).materialIndex];
let uvProjection = i32(material.uvProjection);

let i0 = index.x;
let i1 = index.y;
let i2 = index.z;
let oP = uvProjection == ${Ke.spherical};

var normal: vec3f = (*si).normal;
var gV: vec3f;
var n0 = vec3f(0.0);
var n1 = vec3f(0.0);
var n2 = vec3f(0.0);


if (!bU || oP) {
n0 = attrBuffers[i0 * ATTR_STRIDE + NORMAL_OFF]${e?".xyz":""};
n1 = attrBuffers[i1 * ATTR_STRIDE + NORMAL_OFF]${e?".xyz":""};
n2 = attrBuffers[i2 * ATTR_STRIDE + NORMAL_OFF]${e?".xyz":""};
gV = normalize(eZ.x * n0 + eZ.y * n1 + eZ.z * n2);
if (!bU) {
normal = gV;
}
}

var uv: vec2f;
var uv0: vec2f;
var uv1: vec2f;
var uv2: vec2f;
var cX = vec2f(0.0);
if (USE_UV) {
uv0 = attrBuffers[i0 * ATTR_STRIDE + UV_OFF].xy;
uv1 = attrBuffers[i1 * ATTR_STRIDE + UV_OFF].xy;
uv2 = attrBuffers[i2 * ATTR_STRIDE + UV_OFF].xy;
uv = eZ.x * uv0 + eZ.y * uv1 + eZ.z * uv2;
if (USE_UV1) {
let secondaryUv0 = attrBuffers[i0 * ATTR_STRIDE + UV1_OFF].xy;
let secondaryUv1 = attrBuffers[i1 * ATTR_STRIDE + UV1_OFF].xy;
let secondaryUv2 = attrBuffers[i2 * ATTR_STRIDE + UV1_OFF].xy;
cX = eZ.x * secondaryUv0
+ eZ.y * secondaryUv1
+ eZ.z * secondaryUv2;
}
}

if (USE_TANGENT) {
let t0 = attrBuffers[i0 * ATTR_STRIDE + TANGENT_OFF]${e?".xyz":""};
let t1 = attrBuffers[i1 * ATTR_STRIDE + TANGENT_OFF]${e?".xyz":""};
let t2 = attrBuffers[i2 * ATTR_STRIDE + TANGENT_OFF]${e?".xyz":""};
(*si).tangent = normalize(eZ.x * t0 + eZ.y * t1 + eZ.z * t2);
}

if (fq >= 0) {
(*si).materialIndex = fq;
}
else {
(*si).materialIndex = lM(
(*si).materialIndex,
index,
eZ
);
}

if (uvProjection > 0) {

uv = gC(uvProjection, (*si).position, select(normal, gV, oP));
cX = uv;
}

uv = uv * material.uvScale;
cX = cX * material.uvScale;


if (uvProjection == ${Ke.triplanar}) {
uv = fract(uv);
}

${e?`
${t?"  (*si).coatNormal = normal;":""}
let directionMaterial = materialsBuffer[(*si).materialIndex];
if (directionMaterial.anisotropyMapIndex >= 0.0 || directionMaterial.specularAnisotropyRotation != 0.0 || directionMaterial.coatAnisotropyRotation != 0.0${t?" || (USE_COAT_NORMAL_MAPS && directionMaterial.coatNormalMapIndex >= 0.0)":""}) {
let dp1 = tri.p0 - tri.p2;
let dp2 = tri.p1 - tri.p2;
var aU = vec4f(0.0);
if (USE_TANGENT) {
aU = eZ.x * attrBuffers[i0 * ATTR_STRIDE + TANGENT_OFF]
+ eZ.y * attrBuffers[i1 * ATTR_STRIDE + TANGENT_OFF]
+ eZ.z * attrBuffers[i2 * ATTR_STRIDE + TANGENT_OFF];
}
let eP = eD(normal, dp1, dp2, uv0-uv2, uv1-uv2, aU);
(*si).geometryTangent = eP[0];
(*si).geometryBitangent = eP[1];
var fU = eP;
if (USE_UV1 && directionMaterial.anisotropyMapIndex >= 0.0 && mapInfo[i32(directionMaterial.anisotropyMapIndex) + NUM_MAPS * 2].x > 0.5) {
let a = attrBuffers[i0 * ATTR_STRIDE + UV1_OFF].xy;
let b = attrBuffers[i1 * ATTR_STRIDE + UV1_OFF].xy;
let c = attrBuffers[i2 * ATTR_STRIDE + UV1_OFF].xy;
fU = eD(normal, dp1, dp2, a-c, b-c, select(aU, vec4f(0.0), aU.w == 0.0));
}
(*si).directionTangent = fU[0];
(*si).directionBitangent = fU[1];
${t?`
if (USE_COAT_NORMAL_MAPS && directionMaterial.coatNormalMapIndex >= 0.0) {
let ku = i32(directionMaterial.coatNormalMapIndex);
var lW = eP;
if (USE_UV1 && mapInfo[ku + NUM_MAPS * 2].x > 0.5) {
let a = attrBuffers[i0 * ATTR_STRIDE + UV1_OFF].xy;
let b = attrBuffers[i1 * ATTR_STRIDE + UV1_OFF].xy;
let c = attrBuffers[i2 * ATTR_STRIDE + UV1_OFF].xy;
lW = eD(normal, dp1, dp2, a-c, b-c,
select(aU, vec4f(0.0), aU.w == 0.0));
}


let decoded = sampleMap(ku, getMapUvSet(ku, uv,
select(cX, uv, uvProjection > 0))).rgb * 2.0 - 1.0;
let mapped = lW[0] * decoded.x * directionMaterial.coatNormalScale.x
+ lW[1] * decoded.y * directionMaterial.coatNormalScale.y + normal * decoded.z;
if (dot(mapped, mapped) > 1e-12) { (*si).coatNormal = normalize(mapped); }
}
`:""}
}

`:""}
(*si).normal = normal;
(*si).vertexNormal = normal;
(*si).shadowOffset = vec3f(0.0);
if (!bU) {



let geometricNormal = normalize(cross(tri.p1 - tri.p0, tri.p2 - tri.p0));
let kf = eZ.x * n0 + eZ.y * n1 + eZ.z * n2;
let a = dot(n2 - n0, tri.p0 - tri.p2);
let b = dot(n2 - n1, tri.p1 - tri.p2);
let c = dot(n1 - n0, tri.p1 - tri.p0);
var h = a * eZ.x * (eZ.x - 1.0)
+ (a + b + c) * eZ.x * eZ.y
+ b * eZ.y * (eZ.y - 1.0);
if (dot(kf, geometricNormal) > 0.0) {
var h0 = max(max(dot(tri.p1 - tri.p0, n0), dot(tri.p2 - tri.p0, n0)), 0.0);
var h1 = max(max(dot(tri.p0 - tri.p1, n1), dot(tri.p2 - tri.p1, n1)), 0.0);
var h2 = max(max(dot(tri.p0 - tri.p2, n2), dot(tri.p1 - tri.p2, n2)), 0.0);
h0 = max(dot(tri.p0 - (*si).position, n0) + h0, 0.0);
h1 = max(dot(tri.p1 - (*si).position, n1) + h1, 0.0);
h2 = max(dot(tri.p2 - (*si).position, n2) + h2, 0.0);
h = max(min(min(h0, h1), h2), h * 0.5);
}
else {
var h0 = max(max(dot(tri.p0 - tri.p1, n0), dot(tri.p0 - tri.p2, n0)), 0.0);
var h1 = max(max(dot(tri.p1 - tri.p0, n1), dot(tri.p1 - tri.p2, n1)), 0.0);
var h2 = max(max(dot(tri.p2 - tri.p0, n2), dot(tri.p2 - tri.p1, n2)), 0.0);
h0 = max(dot((*si).position - tri.p0, n0) + h0, 0.0);
h1 = max(dot((*si).position - tri.p1, n1) + h1, 0.0);
h2 = max(dot((*si).position - tri.p2, n2) + h2, 0.0);
h = min(-min(min(h0, h1), h2), h * 0.5);
}
(*si).shadowOffset = kf * h;
}
(*si).uv = uv;
(*si).uv1 = cX;
if (USE_NORMAL_MAPS) {
let dp1 = tri.p0 - tri.p2;
let dp2 = tri.p1 - tri.p2;
let nS = uv0 - uv2;
let nT = uv1 - uv2;
(*si).normal = ob(
(*si).materialIndex, uv, normal, dp1, dp2, nS, nT
);
}
}

struct eB {
t: f32,
barycentric: vec3f,
};





fn fI(o: vec3f, d: vec3f, tri: fu, ey: i32, gL: vec3f, tMax: f32) -> eB {
var ti: eB;


var p0t = tri.p0 - o;
var p1t = tri.p1 - o;
var p2t = tri.p2 - o;


if (ey == 0) {
p0t = p0t.yzx;
p1t = p1t.yzx;
p2t = p2t.yzx;
} else if (ey == 1) {
p0t = p0t.zxy;
p1t = p1t.zxy;
p2t = p2t.zxy;
}



p0t = vec3f(p0t.xy + gL.xy * p0t.z, p0t.z);
p1t = vec3f(p1t.xy + gL.xy * p1t.z, p1t.z);
p2t = vec3f(p2t.xy + gL.xy * p2t.z, p2t.z);


var e = vec3f(
p1t.x * p2t.y - p1t.y * p2t.x,
p2t.x * p0t.y - p2t.y * p0t.x,
p0t.x * p1t.y - p0t.y * p1t.x
);

if (DEPTH_QUERY_MODE) {


let rt = abs(vec3f(p1t.x * p2t.y, p2t.x * p0t.y, p0t.x * p1t.y))
+ abs(vec3f(p1t.y * p2t.x, p2t.y * p0t.x, p0t.y * p1t.x));
e = select(e, vec3f(0.0), abs(e) <= rt * 1e-6);
}


if (any(e < vec3f(0)) && any(e > vec3f(0))) {
return ti;
}

let det = e.x + e.y + e.z;
if (DEPTH_QUERY_MODE && det == 0.0) { return ti; }

p0t.z *= gL.z;
p1t.z *= gL.z;
p2t.z *= gL.z;
let rd = (e.x * p0t.z + e.y * p1t.z + e.z * p2t.z);


if (abs(rd) > abs(tMax * det)) {
return ti;
}

let sm = 1. / det;
ti.t = rd * sm;
ti.barycentric = e * sm;

return ti;
}




override DEPTH_QUERY_MODE: bool = false;

fn eX(d: vec3f) -> vec3f {
if (!DEPTH_QUERY_MODE) { return 1.0 / d; }
return 1.0 / select(d, select(vec3f(1e-20), vec3f(-1e-20), d < vec3f(0.0)), abs(d) < vec3f(1e-20));
}

fn eV(gx: vec3f, o: vec3f) -> vec3f {
if (!DEPTH_QUERY_MODE) { return vec3f(0.0); }
return abs(gx) * max(vec3f(1.0), abs(o)) * 1e-6;
}



fn cM(o: vec3f, vD: vec3f, vC: vec3f, gx: vec3f, tMax: f32) -> f32 {
let uK = (vD - o) * gx;
let uL = (vC - o) * gx;
let bJ = eV(gx, o);
let mB = min(uK, uL) - bJ;
let rM = max(uK, uL) + bJ;
let t0 = max(mB.x, max(mB.y, mB.z));
let t1 = min(rM.x, min(rM.y, rM.z));
return select(select(t1, t0, t0 > 0.0), -1.0, (t0 > t1 || t0 > tMax));
}

fn maxDimension(v: vec3f) -> i32 {
return select(select(2, 1, v.y > v.z), select(2, 0, v.x > v.z), v.x > v.y);
}

fn mj(d: vec3f, ey: i32) -> vec3f {


if (ey == 0) {
return vec3f(-d.y, -d.z, 1.0) / d.x;
} else if (ey == 1) {
return vec3f(-d.z, -d.x, 1.0) / d.y;
} else {
return vec3f(-d.x, -d.y, 1.0) / d.z;
}
}

fn lX(
si: ptr<function, ad>,
lp: fu,
aB: vec3f,
hs: vec3i,
bU: bool,
ao: i32,
eC: vec3f,
eU: vec3f,
fq: i32
) {
(*si).instanceIndex = ao;
(*si).barycentrics = aB.xy;
(*si).normal = eC;
(*si).position = eU;
(*si).materialIndex = i32(ae(
bitcast<i32>(instancesBuffer[ao * ${Y}].z)
).x);


hp(
si,
lp,
aB,
hs,
bU,
fq
);

let l2w = mat4x4<f32>(
instancesBuffer[ao * ${Y} + 5],
instancesBuffer[ao * ${Y} + 6],
instancesBuffer[ao * ${Y} + 7],
instancesBuffer[ao * ${Y} + 8]
);
let w2l = mat4x4<f32>(
instancesBuffer[ao * ${Y} + 1],
instancesBuffer[ao * ${Y} + 2],
instancesBuffer[ao * ${Y} + 3],
instancesBuffer[ao * ${Y} + 4]
);
let aD = transpose(mat3x3<f32>(
w2l[0].xyz,
w2l[1].xyz,
w2l[2].xyz
));

(*si).faceNormal = normalize(aD * eC);
(*si).vertexNormal = normalize(aD * (*si).vertexNormal);
(*si).normal = normalize(aD * (*si).normal);
${t?"  (*si).coatNormal = normalize(aD * (*si).coatNormal);":""}
if (USE_TANGENT && dot((*si).tangent, (*si).tangent) > 0.0) {
(*si).tangent = normalize((l2w * vec4f((*si).tangent, 0.0)).xyz);
}
${e?`
(*si).directionTangent = (l2w * vec4f((*si).directionTangent, 0.0)).xyz;
(*si).directionBitangent = (l2w * vec4f((*si).directionBitangent, 0.0)).xyz;
(*si).geometryTangent = (l2w * vec4f((*si).geometryTangent, 0.0)).xyz;
(*si).geometryBitangent = (l2w * vec4f((*si).geometryBitangent, 0.0)).xyz;
`:""}
(*si).shadowOffset = (l2w * vec4f((*si).shadowOffset, 0.0)).xyz;
(*si).position = (l2w * vec4((*si).position, 1.0)).xyz;
}


${Qn(e)}




fn cY(ray: Ray, si: ptr<function, ad>, bounces: i32, doubleSided: bool, lq: bool) {

(*si).hit = false;

if (rtUniform.isEmpty > 0) {
return;
}

var tMax = RAY_MAX_DISTANCE;
var ey: i32;
var gL: vec3f;

var hs: vec3i;
var lp: fu;
var ao: i32;
var hK: i32 = (*si).triangleIndex;

${bn(`
(*si).triangleIndex = triangleIndex;
lp = tri;
hs = index;
ao = cf;
`,i,!1,A,e)}

if (qT) {
lX(
si,
lp,
aB,
hs,
bU,
ao,
eC,
eU,
-1
);
}
}


fn iH(ray: Ray, si: ptr<function, ad>, instanceIndex: i32, maxDistance: f32) {
(*si).hit = false;

if (rtUniform.isEmpty > 0) {
return;
}

let bounces = 0;
let doubleSided = true;
let lq = false;
var tMax = maxDistance;
var ey: i32;
var gL: vec3f;
var hs: vec3i;
var lp: fu;
var ao: i32;
var hK: i32 = -1;

${bn(`
(*si).triangleIndex = triangleIndex;
lp = tri;
hs = index;
ao = cf;
`,i,!1,A,e,`
if (cf != instanceIndex) {
continue;
}
`)}

if (qT) {
(*si).instanceIndex = ao;
(*si).normal = eC;
(*si).position = eU;
(*si).materialIndex = i32(ae(bitcast<i32>(instancesBuffer[ao * ${Y}].z)).x);
hp(
si,
lp,
aB,
hs,
bU,
-1
);

let l2w = mat4x4<f32>(
instancesBuffer[ao * ${Y} + 5],
instancesBuffer[ao * ${Y} + 6],
instancesBuffer[ao * ${Y} + 7],
instancesBuffer[ao * ${Y} + 8]
);
let w2l = mat4x4<f32>(
instancesBuffer[ao * ${Y} + 1],
instancesBuffer[ao * ${Y} + 2],
instancesBuffer[ao * ${Y} + 3],
instancesBuffer[ao * ${Y} + 4]
);
let aD = transpose(mat3x3<f32>(
w2l[0].xyz,
w2l[1].xyz,
w2l[2].xyz
));
(*si).faceNormal = normalize(aD * eC);
(*si).vertexNormal = normalize(aD * (*si).vertexNormal);
(*si).normal = normalize(aD * (*si).normal);
${t?"  (*si).coatNormal = normalize(aD * (*si).coatNormal);":""}
if (USE_TANGENT && dot((*si).tangent, (*si).tangent) > 0.0) {
(*si).tangent = normalize((l2w * vec4f((*si).tangent, 0.0)).xyz);
}
${e?`
(*si).directionTangent = (l2w * vec4f((*si).directionTangent, 0.0)).xyz;
(*si).directionBitangent = (l2w * vec4f((*si).directionBitangent, 0.0)).xyz;
(*si).geometryTangent = (l2w * vec4f((*si).geometryTangent, 0.0)).xyz;
(*si).geometryBitangent = (l2w * vec4f((*si).geometryBitangent, 0.0)).xyz;
`:""}
(*si).shadowOffset = (l2w * vec4f((*si).shadowOffset, 0.0)).xyz;
(*si).position = (l2w * vec4((*si).position, 1.0)).xyz;
}
}

fn ex(ray: Ray, lightDistance: f32, jG: i32) -> bool {
if (rtUniform.isEmpty > 0) {
return false;
}

let doubleSided = true;
let qg = min(max(lightDistance, 0.0), RAY_MAX_DISTANCE);
var tMax = qg;
var ey: i32;
var gL: vec3f;

let bounces = 1;
var lq = false;
var hK: i32 = jG;

${bn(`



var jn = true;

if (jn) {
if (HAS_ALPHA) {
let materialIndex = i32(ae(bitcast<i32>(oh.z)).x);
if (!nr(
materialIndex,
index,
aB,
eU,
eC
)) {

tMax = qg;
jn = false;
}
}
}
if (jn) {
return true;
}
`,i,!0,A,e)}

return false;
}

`}var Cn=`
const CAMERA_PIXEL = 0u;
const CAMERA_LENS = 1u;
const CAMERA_WAVELENGTH = 2u;
const CAMERA_BEVEL_BASE = 3u;
const LIGHT_SELECT = 0u;
const LIGHT_POSITION = 1u;
const BSDF_LOBE = 2u;
const BSDF_DIRECTION = 3u;
const MEDIUM_CHANNEL = 4u;
const MEDIUM_DISTANCE = 5u;
const PHASE_DIRECTION = 6u;
const RUSSIAN_ROULETTE = 7u;
const BOUNCE_STRIDE = 64u;



var<private> bc: vec2u;
var<private> bd: u32;
var<private> cF: u32 = 0u;
var<private> em: u32 = 0u;
fn eg(kk: u32) -> u32 {
var x = kk;
x ^= x >> 16u; x *= 0x7feb352du;
x ^= x >> 15u; x *= 0x846ca68bu;
return x ^ (x >> 16u);
}
fn aq(a: u32, b: u32) -> u32 {
return eg(a ^ eg(b + 0x9e3779b9u));
}
fn iA(kk: u32, ic: u32) -> u32 {
var x = kk + ic;
x ^= x * 0x6c50b47cu; x ^= x * 0xb82f1e52u;
x ^= x * 0xc7afe638u; x ^= x * 0x8d22f6e6u;
return x;
}
fn sC(x: u32, ic: u32) -> u32 {
return reverseBits(iA(reverseBits(x), ic));
}

fn rb(kk: u32) -> u32 {
var r = reverseBits(kk);
${er.map(([i,e])=>`r ^= (r << ${i}u) & 0x${e.toString(16)}u;`).join(`
  `)}
return r;
}
fn vI(index: u32, ic: u32) -> vec2f {
let i = sC(index, aq(ic, 0u));
let x = reverseBits(iA(i, aq(ic, 1u)));
let y = sC(rb(i), aq(ic, 2u));
return vec2f(f32(x >> 8u), f32(y >> 8u)) * (1.0 / 16777216.0);
}
fn tp(p: vec2u) -> u32 {
var v = p & vec2u(255u);
v = (v | (v << vec2u(4u))) & vec2u(0x0f0fu);
v = (v | (v << vec2u(2u))) & vec2u(0x3333u);
v = (v | (v << vec2u(1u))) & vec2u(0x5555u);
return v.x | (v.y << 1u);
}
${Za.map((i,e)=>`const Z_PERM_${e} = ${i}u;`).join(`
`)}
fn km(tu: u32) -> u32 {
let group = tu >> 2u;
var word = Z_PERM_5;
${[0,1,2,3,4].map(i=>`word = select(word, Z_PERM_${i}, group == ${i}u);`).join(`
  `)}
return (word >> ((tu & 3u) * 8u)) & 255u;
}
fn pO(kE: u32, dim: u32, logSPP: u32) -> u32 {
let odd = logSPP & 1u;
let uf = 8u + ((logSPP + 1u) >> 1u);
var result = 0u;
for (var digit = i32(uf) - 1; digit >= i32(odd); digit--) {
let shift = 2u*u32(digit) - odd;

var sj = 0u;
if (shift < 30u) { sj = kE >> (shift + 2u); }
let tu = (eg(sj ^ (0x55555555u * dim)) >> 24u) % 24u;
let d = (kE >> shift) & 3u;
result |= ((km(tu) >> (2u*d)) & 3u) << shift;
}
if (odd != 0u) {
result |= (kE & 1u) ^ (eg((kE >> 1u) ^ (0x55555555u * dim)) & 1u);
}
return result;
}



fn cw(slot: u32) -> u32 {
return CAMERA_BEVEL_BASE + u32(BEVEL_SAMPLES) + cF * BOUNCE_STRIDE + slot;
}
fn qV(candidate: u32, slot: u32) -> u32 {
if (candidate == 0u) {
if (slot == 2u) { return cw(8u); }
return cw(slot);
}
return cw(9u + (candidate - 1u) * 3u + slot);
}


var<private> hh: vec4u;
var<private> hi: u32;
var<private> fv: bool = false;
var<private> df: bool = false;
var<private> dE: u32;
var<private> gq: u32;
var<private> eN: vec2f;
fn dw(dim: u32) {

let jW = bc.x + bc.y * u32(rtUniform.outputSize.x);
let key = vec4u(dim, bd, jW, rtUniform.sequenceSeed);
if (fv && all(hh == key) && hi == rtUniform.zSobolLogSPP) { return; }
hh = key; hi = rtUniform.zSobolLogSPP;
fv = true; df = false;
var ic = aq(aq(jW, dim), rtUniform.sequenceSeed);
var index = bd;
if (SAMPLING_PATTERN == 1) {
var logSPP = rtUniform.zSobolLogSPP;
if (index == 0u) { logSPP = 0u; }
else { index -= 1u; }

var iW = index >> logSPP;
let mask = (1u << logSPP) - 1u;
let kE = (tp(bc) << logSPP) | (index & mask);
index = pO(kE, dim, logSPP);
let tile = bc >> vec2u(8u);
ic = aq(aq(dim, rtUniform.sequenceSeed), aq(tile.x, tile.y));

if (bd != 0u) { iW += 1u; }
ic = aq(ic, iW);
}
dE = sC(index, aq(ic, 0u));
gq = ic;
let x = reverseBits(iA(dE, aq(ic, 1u)));
eN.x = f32(x >> 8u) * (1.0 / 16777216.0);
}
fn kJ(dim: u32) -> vec2f {
dw(dim);
if (!df) {
let y = sC(rb(dE), aq(gq, 2u));
eN.y = f32(y >> 8u) * (1.0 / 16777216.0);
df = true;
}
return EPS + (1.0 - 2.0*EPS) * eN;
}
fn dz(dim: u32) -> f32 {
if (SAMPLING_PATTERN == 2) { return EPS + (1.0 - 2.0*EPS)*rand(); }
dw(dim);
return EPS + (1.0 - 2.0*EPS) * eN.x;
}
fn fk(dim: u32) -> vec2f {
if (SAMPLING_PATTERN == 2) {
let x = dz(dim); let y = dz(dim);
return vec2f(x,y);
}
return kJ(dim);
}

fn eo(slot: u32) -> f32 {
let dim = aq(aq(cF, slot), em) | 0x80000000u;
em += 1u;
if (SAMPLING_PATTERN == 2) { return EPS + (1.0 - 2.0*EPS)*rand(); }

let jW = bc.x + bc.y * u32(rtUniform.outputSize.x);
let ic = aq(aq(jW, dim), rtUniform.sequenceSeed);
let i = sC(bd, aq(ic, 0u));
let x = reverseBits(iA(i, aq(ic, 1u)));
return EPS + (1.0 - 2.0*EPS) * (f32(x >> 8u) * (1.0 / 16777216.0));
}
`;var Po=`
var<private> s0: vec4u;

fn ka(p: vec2u, frame: i32) {

s0 = vec4u(p, u32(frame), u32(p.x) + u32(p.y));
}


fn vo() {
s0 = s0 * 1664525u + 1013904223u;
s0.x += s0.y*s0.w; s0.y += s0.z*s0.x; s0.z += s0.x*s0.y; s0.w += s0.y*s0.z;
s0 = s0 ^ (s0>>vec4(16u));
s0.x += s0.y*s0.w; s0.y += s0.z*s0.x; s0.z += s0.x*s0.y; s0.w += s0.y*s0.z;
}

fn rand() -> f32 {
vo(); return f32(s0.x)/f32(0xffffffffu);
}

`;function yn(i=!0,e=!1){return`

struct mR {
ray: Ray,
maxDistance: f32,
triangleIndex: i32,
contribution: vec3f,


risTarget: f32,
lightSelectionPmf: f32,
valid: bool,
}

fn qi(
si: ptr<function, ad>,
ma: J,
prepared: ag,
aa: ptr<function, Path>,
ffnormal: vec3f,
gy: bool,
ca: u32,
aW: u32,
ge: ptr<function, mR>
) -> bool {
(*ge).valid = false;
(*ge).lightSelectionPmf = 0.0;
(*ge).risTarget = 0.0;
let lc = vec3f(fk(qV(ca, 1u)), dz(qV(ca, 0u)));

var lightSample: LightSampleRec;
my(
(*si).position,
lc,
ca,
aW,
&lightSample
);
var Li = lightSample.emission;

let lightDir = lightSample.direction;
let oK = -(*aa).ray.d;
let fd = lightSample.pdf;
let lightSelectionPmf = lightSample.selectionPmf;


${e?`var cosThetaL = dot(ffnormal, lightDir);
if (gy && ma.coatNormalEnabled) { cosThetaL = dot(ma.geometricNormal, lightDir); }`:"let cosThetaL = dot(ffnormal, lightDir);"}

if (fd <= 0.0 || lightSelectionPmf <= 0.0 ||
max(max(Li.x, Li.y), Li.z) <= 0.0) {
return false;
}

var scatteringPdf = 0.0;
var f = vec3f(0.0);
if (gy) {


if (cosThetaL <= 0.0 && ma.transmissionWeight <= 0.0 && ma.subsurfaceWeight <= 0.0) {
return false;
}
f = bI(prepared, lightDir, &scatteringPdf);
}
else {
scatteringPdf = bD(
dot(oK, lightDir),
(*si).mediumAnisotropy
);
f = vec3f(scatteringPdf);
}

if (scatteringPdf <= 0.0 || max(max(f.x, f.y), f.z) <= 0.0) {
return false;
}

var mp: Ray;
var hd = (*si).position + EPS * lightDir;
if (gy) {
hd = rI((*si).position, (*si).faceNormal, lightDir);
let bZ = 0.1;
var dr = dot((*si).normal, lightDir);
${e?"    if (ma.coatNormalEnabled) { dr = dot((*si).faceNormal, lightDir); }":""}
let geometricNormal = select(
(*si).faceNormal,
-(*si).faceNormal,
dr < 0.0
);
dr = abs(dr);
let hO = dot(geometricNormal, lightDir);
let ot = select(
clamp(1.0 - hO / bZ, 0.0, 1.0),
clamp(
2.0 - (hO + dr) / bZ,
0.0,
1.0
),
dr < bZ
);
hd += (*si).shadowOffset * ot;
}




var lH = lightDir;
var mF = lightSample.dist - EPS;
if (lightSample.sourceType == 1u) {
let sR =
(*si).position + lightSample.direction * lightSample.dist;
let pW = sR + EPS * lightSample.normal;
let qh = pW - hd;
mF = length(qh);
lH = normalize(qh);
}
iw(&mp, hd, lH);




if (gy && cosThetaL < 0.0 && lightSample.sourceType == 0u) {
let background = hD(mp);
Li = background.rgb * background.a;
}
if (SPECTRAL) {
Li = ai(Li, (*si).wavelength);
}



let eW = select(
tq(fd, scatteringPdf),
1.0,
lightSample.isDelta
);
if (eW > 0.0) {
let kj = Li * f / fd * (*aa).beta;
(*ge).risTarget = max(
dot(max(kj * lightSelectionPmf, vec3f(0.0)), luminance),
0.0
);
(*ge).ray = mp;
(*ge).maxDistance = mF;
(*ge).triangleIndex = (*si).triangleIndex;
(*ge).contribution = eW * kj;
(*ge).lightSelectionPmf = lightSelectionPmf;
(*ge).valid = true;
return true;
}
return false;
}

fn mJ(
si: ptr<function, ad>,
ma: J,
prepared: ag,
aa: ptr<function, Path>,
ffnormal: vec3f,
gy: bool
) {
let aW = jQ();
var selected: mR;
selected.valid = false;
var mz = 0.0;
var lv = 0.0;


for (var ca = 0u; ca < aW; ca++) {
var candidate: mR;
let pa = qi(
si, ma, prepared, aa, ffnormal, gy,
ca, aW, &candidate);
if (aW == 1u) {
if (!pa) { return; }
selected = candidate;
break;
}
if (!pa) { continue; }
let kc = candidate.risTarget / max(candidate.lightSelectionPmf, 1e-20);
if (!(kc > 0.0) || kc != kc) { continue; }
lv += kc;
if (!selected.valid ||
ps(ca) * lv <= kc) {
selected = candidate;
mz = candidate.risTarget;
}
}
var qG = 1.0;
if (aW > 1u) {
if (!selected.valid || mz <= 0.0) { return; }


qG = selected.lightSelectionPmf * lv /
(f32(aW) * mz);
}
if (selected.valid &&
!ex(selected.ray, selected.maxDistance, selected.triangleIndex)) {
(*aa).li += selected.contribution * qG;
}
}

fn pg(
si: ptr<function, ad>,
aa: ptr<function, Path>
) -> f32 {
if ((*aa).fromEye || rtUniform.lightWeightTotal <= 0.0 ||
i32(materialsBuffer[(*si).materialIndex].matType) == UNLIT) {
return 1.0;
}
let samplingLuminance = dot(
materialsBuffer[(*si).materialIndex].emission,
luminance
);
let pd = dot((*si).faceNormal, -(*aa).ray.d);
if (samplingLuminance <= 0.0 || pd <= 0.0) {
return 1.0;
}
let rQ = distance((*si).position, (*aa).ray.o);
let fd = samplingLuminance / rtUniform.lightWeightTotal *
rQ * rQ / max(pd, 1e-8);
return fS((*aa).scatteringPdf, fd);
}

${e?`


fn fB(input: vec3f, th: vec3f, view: vec3f) -> vec3f {
let qQ = dot(th, view) >= 0.0;
let uh = select(-th, th, qQ);
let qP = select(-input, input, qQ);
if (dot(input, th) <= 0.0 || dot(qP, view) <= 1e-6) { return uh; }
return qP;
}
`:""}
fn lR(
si: ptr<function, ad>,
ma: ptr<function, J>,
aa: ptr<function, Path>
) {
${e?`
let bC = (*si).faceNormal;
let mv = (*si).normal;
`:""}
var rF: f32 = -dot((*si).faceNormal, (*aa).ray.d);
var sw: f32 = -dot((*si).normal, (*aa).ray.d);
if (((*ma).transmissionWeight > 0.0 || (*ma).subsurfaceWeight > 0.0) && (*ma).thinWalled) {

if (rF < 0.0) {
(*si).faceNormal = -(*si).faceNormal;
rF = -rF;
}
if (sw < 0.0) {
(*si).normal = -(*si).normal;
sw = -sw;
}
}


var pM: bool = rF >= 0.0 && sw < 0.0;
var ndv: f32 = select(sw, rF, pM);
var N: vec3f = select((*si).normal, (*si).faceNormal, pM);

(*ma).inside = ndv <= 0.0 && !(*ma).thinWalled;

(*ma).relativeIor = select((*ma).specularIor, (1.0 / (*ma).specularIor), ndv > 0.0);
var ffnormal = select(-N, N, ndv >= 0.0);
${e?`
if ((*ma).coatNormalEnabled) {
let view = -(*aa).ray.d;
let fW = dot(bC, view);
(*ma).geometricNormal = select(-bC, bC, fW >= 0.0);
ffnormal = fB(mv, bC, view);
(*ma).coatNormal = fB((*si).coatNormal, bC, view);
(*ma).inside = fW <= 0.0 && !(*ma).thinWalled;
(*ma).relativeIor = select((*ma).specularIor, 1.0 / (*ma).specularIor, fW > 0.0 || (*ma).thinWalled);
}
`:""}

(*aa).scatteringIsDelta = false;
var bl = false;
var hj = false;
let mediumType = (*si).mediumType;

var scatteringPdf: f32;
var cG: vec3f;

if (HAS_MEDIUM) {
let d = distance((*si).position, (*aa).ray.o);
let nh = (*aa).ray.o;
let extinction = (*si).mediumExtinction;
let scattering = min((*si).mediumScattering, extinction);
let sr = max(max(extinction.x, extinction.y), extinction.z);
if (mediumType > 0 && sr > 0.0) {


let mW = min(i32(dz(cw(MEDIUM_CHANNEL)) * 3.0), 2);
let fA = extinction[mW];
let ib = select(
d,
min(-log(max(dz(cw(MEDIUM_DISTANCE)), 1e-7)) / fA, d),
fA > 0.0
);
bl = ib < d;
let ew = exp(-extinction * ib);
let nP = select(
ew,
extinction * ew,
bl
);
let nA = max((nP.x + nP.y + nP.z) / 3.0, 1e-8);
if (bl) {
(*aa).beta *= ew * scattering / nA;

(*aa).ray.o = nh + ib * (*aa).ray.d;
(*si).position = (*aa).ray.o;
}
else {
(*aa).beta *= ew / nA;
}
}
}

if (!bl) {
(*aa).li += pg(si, aa) * (*ma).emission * (*aa).beta;
}
if ((*ma).materialType == UNLIT) {
(*aa).abort = true;
return;
}


var prepared: ag;
if (!bl) {
${i?`
(*ma).directionTangent = (*si).directionTangent;
(*ma).directionBitangent = (*si).directionBitangent;
(*ma).geometryTangent = (*si).geometryTangent;
(*ma).geometryBitangent = (*si).geometryBitangent;
`:""}
prepared = eG((*si).tangent, *ma, -(*aa).ray.d, ffnormal);
}
mJ(si, *ma, prepared, aa, ffnormal, !bl);
if (bl) {

cG = fl(
-(*aa).ray.d,
(*si).mediumAnisotropy,
fk(cw(PHASE_DIRECTION))
);
scatteringPdf = bD(
dot(cG, -(*aa).ray.d),
(*si).mediumAnisotropy
);
}
else {

var isNextRefraction: bool;
var aA = 1.0;
var aT = false;
var bE = true;
var aR = u32(OPENPBR_LOBE_DIFFUSE);
var qA = 0.0;
let uj = vec3f(fk(cw(BSDF_DIRECTION)), dz(cw(BSDF_LOBE)));
var gT = vec3f(0.0);
let f = dv(
prepared,
uj,
&cG,
&scatteringPdf,
&isNextRefraction,
&aA,
&aT,
&bE,
&aR,
&qA,
&gT
);




if (!(scatteringPdf > 0.0) ||
!all(f == f) || !all(abs(f) < vec3f(3.402823e38)) ||
dot(cG, cG) < 0.5) {
(*aa).scatteringPdf = 0.0;
(*aa).abort = true;
return;
}


(*aa).scatteringIsDelta = !prepared.material.thinWalled &&
abs(prepared.material.relativeIor - 1.0) <= 1e-6 &&
prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] >= 1.0 - 1e-6;
(*aa).beta *= f / scatteringPdf;

hj = isNextRefraction && !(*ma).thinWalled;
(*aa).isNextRefraction = isNextRefraction;


(*aa).ray.o = (*si).position + EPS * cG;
${e?`
if ((*ma).coatNormalEnabled) { (*aa).ray.o = (*si).position + EPS * select(-bC, bC, dot(bC, cG) >= 0.0); }
`:""}
}
(*aa).scatteringPdf = scatteringPdf;
(*aa).ray.d = cG;
if (bl) {
(*aa).isNextRefraction = false;
}

(*aa).fromEye = false;

if (HAS_MEDIUM) {


if (!bl && hj && (*ma).mediumType > 0) {
if (rF >= 0.0) {
(*si).mediumType = (*ma).mediumType;
(*si).mediumExtinction = (*ma).mediumExtinction;
(*si).mediumScattering = (*ma).mediumScattering;
(*si).mediumAnisotropy = (*ma).mediumAnisotropy;
}
else {
(*si).mediumType = 0;
(*si).mediumExtinction = vec3f(0.0);
(*si).mediumScattering = vec3f(0.0);
(*si).mediumAnisotropy = 0.0;
}
}
}
}
`}var ig=yn();var Io=`
fn eJ(light: Light, fm: vec3f, iU: vec2f, lightSample: ptr<function, LightSampleRec>) {
let iq = light.position - fm;
let aj = length(iq);
if (light.radiusOrSpread <= 0.0) {



if (aj <= 1e-6) {
(*lightSample).direction = vec3f(0.0, 0.0, 1.0);
(*lightSample).normal = vec3f(0.0, 0.0, -1.0);
(*lightSample).dist = 0.0;
(*lightSample).pdf = 1.0;
(*lightSample).emission = vec3f(0.0);
(*lightSample).isDelta = true;
return;
}
(*lightSample).direction = iq / aj;
(*lightSample).normal = -(*lightSample).direction;
(*lightSample).dist = aj;
(*lightSample).pdf = 1.0;
(*lightSample).emission = light.emission /
max(aj * aj, 1e-8);
(*lightSample).isDelta = true;
return;
}
let radius = max(light.radiusOrSpread, 1e-6);
(*lightSample).isDelta = false;
var gF: vec3f;

if (aj <= radius) {
let z = 1.0 - 2.0 * iU.x;
let fi = sqrt(max(0.0, 1.0 - z * z));
let br = TWOPI * iU.y;
gF = vec3f(
fi * cos(br),
fi * sin(br),
z
);
(*lightSample).pdf = INV4PI;
}
else {
let sK = iq / aj;
let jp = min(
1.0,
radius * radius / (aj * aj)
);
let cosThetaMax = sqrt(max(0.0, 1.0 - jp));
let cc = mix(1.0, cosThetaMax, iU.x);
let sinTheta = sqrt(max(0.0, 1.0 - cc * cc));
let br = TWOPI * iU.y;
var tangent: vec3f;
var bitangent: vec3f;
aL(sK, &tangent, &bitangent);
gF = sK * cc
+ tangent * (sinTheta * cos(br))
+ bitangent * (sinTheta * sin(br));
(*lightSample).pdf = 1.0 / max(
TWOPI * (1.0 - cosThetaMax),
1e-8
);
}

let ir = dot(gF, iq);
let pU = dot(iq, iq);
let ej = ir * ir
- pU + radius * radius;
let cN = ir - sqrt(max(0.0, ej));
let cC = ir + sqrt(max(0.0, ej));
(*lightSample).dist = select(cC, cN, cN > 1e-6);
(*lightSample).direction = gF;
let rV = fm + gF * (*lightSample).dist;
(*lightSample).normal = normalize(rV - light.position);
(*lightSample).emission = light.emission;
}

fn cZ(
light: Light,
surfacePoint: vec3f,
lowerLeft: vec3f,
result: ptr<function, LightSampleRec>
) {
if (light.textureIndex < 0.0) {
return;
}
let width = length(light.u);
let height = length(light.v);
let hX = surfacePoint - lowerLeft;
let uv = vec2f(
dot(hX, light.u / width) / width,
dot(hX, light.v / height) / height
);
(*result).emission *= sampleMap(i32(light.textureIndex), uv).rgb;
}

fn jL(
light: Light,
shadingPoint: vec3f,
samplePoint: vec2f,
result: ptr<function, LightSampleRec>
) {
let normal = normalize(cross(light.u, light.v));
let lowerLeft = light.position - 0.5 * (light.u + light.v);
let spread = clamp(light.radiusOrSpread, 0.0, 1.0);

if (spread <= 0.001) {
let gb = dot(normal, shadingPoint - light.position);
let surfacePoint = shadingPoint - normal * gb;
let hX = surfacePoint - lowerLeft;
let width = length(light.u);
let height = length(light.v);
let uv = vec2f(
dot(hX, light.u / width) / width,
dot(hX, light.v / height) / height
);
if (gb <= 0.0 || any(uv < vec2f(0.0)) || any(uv > vec2f(1.0))) {
(*result).emission = vec3f(0.0);
(*result).pdf = 0.0;
return;
}
(*result).direction = -normal;
(*result).dist = gb;
(*result).normal = normal;
(*result).emission = light.emission;
(*result).pdf = 1.0;
(*result).isDelta = true;
cZ(light, surfacePoint, lowerLeft, result);
return;
}

let surfacePoint = lowerLeft
+ light.u * samplePoint.x
+ light.v * samplePoint.y;
let offset = surfacePoint - shadingPoint;
let hl = dot(offset, offset);
(*result).dist = sqrt(hl);
(*result).direction = offset / (*result).dist;
(*result).normal = normal;
let fV = dot(-(*result).direction, normal);
let oF = cos(0.5 * PI * spread);
if (fV <= 0.0 || fV < oF) {
(*result).emission = vec3f(0.0);
(*result).pdf = 0.0;
return;
}
(*result).emission = light.emission;
(*result).pdf = hl / max(light.area * fV, 1e-8);
cZ(light, surfacePoint, lowerLeft, result);
}

fn fY(
light: Light,
result: ptr<function, LightSampleRec>
) {
(*result).direction = normalize(-light.u);
(*result).normal = -(*result).direction;
(*result).emission = light.emission;
(*result).dist = INF;
(*result).pdf = 1.0;
(*result).isDelta = true;
}

fn jM(
light: Light,
shadingPoint: vec3f,
samplePoint: vec2f,
result: ptr<function, LightSampleRec>
) {
eJ(light, shadingPoint, samplePoint, result);
let surfacePoint = shadingPoint + (*result).direction * (*result).dist;
let dJ = normalize(shadingPoint - surfacePoint);
(*result).emission *= bL(light, dJ);
}

fn iL(
light: Light,
shadingPoint: vec3f,
samplePoint: vec2f,
result: ptr<function, LightSampleRec>
) {
let dO = i32(light.litType);
if (dO == RECT_LIGHT) {
jL(light, shadingPoint, samplePoint, result);
return;
}
if (dO == SPHERE_LIGHT) {
eJ(light, shadingPoint, samplePoint, result);
return;
}
if (dO == SPOT_LIGHT) {
jM(light, shadingPoint, samplePoint, result);
return;
}
if (dO == DIRECTIONAL_LIGHT) {
fY(light, result);
}
}

fn mx(iU: vec2f, lightSample: ptr<function, LightSampleRec>) {
var uv: vec2f;
(*lightSample).direction = oD(iU, &uv, &(*lightSample).pdf);
(*lightSample).emission = textureLinear(envMap, uv).rgb;
(*lightSample).dist = INF;
}

fn bV(ih: i32) -> vec4f {
let width = rtUniform.lightSamplingTextureWidth;
return textureLoad(
lightSamplingData,
vec2i(ih % width, ih / width),
0
);
}

fn pV(index: i32) -> EmissiveTriangle {
let offset = index * 6;
let a = bV(offset);
let b = bV(offset + 1);
let c = bV(offset + 2);
let d = bV(offset + 3);
let e = bV(offset + 4);
let f = bV(offset + 5);
return EmissiveTriangle(
a.xyz, a.w,
b.xyz, b.w,
c.xyz, c.w,
d.xy, d.zw, e.xy,
e.zw, f.xy, f.zw
);
}

fn sf(index: i32) -> oV {
let data = bV(rtUniform.lightChoiceTexelOffset + index);
return oV(
data.x,
bitcast<i32>(data.y),
bitcast<i32>(data.z),
bitcast<i32>(data.w)
);
}

fn jv(mQ: i32, index: i32) -> oV {
return sf(mQ + index);
}

fn mI(
rnd: vec3f,
ca: u32,
aW: u32
) -> vec3f {
var sM = rnd;
let count = max(aW, 1u);
sM.z = (rnd.z + f32(min(ca, count - 1u))) /
f32(count);
return sM;
}

fn lN(
triangle: EmissiveTriangle,
fm: vec3f,
iU: vec2f,
lightSample: ptr<function, LightSampleRec>
) {
let vt = sqrt(iU.x);
let barycentric = vec3f(
1.0 - vt,
vt * (1.0 - iU.y),
vt * iU.y
);
let sS =
barycentric.x * triangle.p0 +
barycentric.y * triangle.p1 +
barycentric.z * triangle.p2;
let uv =
barycentric.x * triangle.uv0 +
barycentric.y * triangle.uv1 +
barycentric.z * triangle.uv2;
let cX =
barycentric.x * triangle.secondaryUv0 +
barycentric.y * triangle.secondaryUv1 +
barycentric.z * triangle.secondaryUv2;
let normal = normalize(cross(triangle.p1 - triangle.p0, triangle.p2 - triangle.p0));
(*lightSample).direction = sS - fm;
(*lightSample).dist = length((*lightSample).direction);
if ((*lightSample).dist <= EPS) {
(*lightSample).emission = vec3f(0.0);
(*lightSample).pdf = 0.0;
return;
}
(*lightSample).direction /= (*lightSample).dist;
(*lightSample).normal = normal;
let pd = dot(normal, -(*lightSample).direction);
if (pd <= 0.0) {
(*lightSample).emission = vec3f(0.0);
(*lightSample).pdf = 0.0;
return;
}
(*lightSample).emission = lE(
i32(triangle.materialIndex), uv, cX
);
(*lightSample).selectionPmf = triangle.selectionPmf;
(*lightSample).pdf = triangle.selectionPmf *
((*lightSample).dist * (*lightSample).dist) /
max(triangle.area * pd, 1e-8);
}

fn kb(
fm: vec3f,
rnd: vec3f,
mQ: i32,
pc: i32,
mP: f32,
lightSample: ptr<function, LightSampleRec>
) {
(*lightSample).emission = vec3f(0.0);
(*lightSample).pdf = 0.0;
(*lightSample).selectionPmf = 0.0;
(*lightSample).dist = INF;
(*lightSample).isDelta = false;
(*lightSample).sourceType = 0u;
(*lightSample).sourceIndex = 0xffffffffu;
if (pc <= 0) {
return;
}

let qZ = rnd.z * f32(pc);
let column = min(i32(qZ), pc - 1);
let qJ = jv(mQ, column);
let kT = select(
qJ.aliasIndex,
column,
fract(qZ) < qJ.probability
);
let pb = jv(mQ, kT);
if (pb.sourceType == ${KA}) {
(*lightSample).sourceType = 0u;
(*lightSample).sourceIndex = u32(pb.sourceIndex);
mx(rnd.xy, lightSample);
(*lightSample).selectionPmf = rtUniform.envLightPmf;
(*lightSample).pdf *= rtUniform.envLightPmf;
}
else if (pb.sourceType == ${XA}) {
(*lightSample).sourceType = 2u;
(*lightSample).sourceIndex = u32(pb.sourceIndex);
let light = analyticLights[pb.sourceIndex];
iL(light, fm, rnd.xy, lightSample);
(*lightSample).selectionPmf = light.selectionPmf;
(*lightSample).pdf *= light.selectionPmf;
}
else if (pb.sourceType == ${Ta}) {
(*lightSample).sourceType = 1u;
(*lightSample).sourceIndex = u32(pb.sourceIndex);
lN(
pV(pb.sourceIndex),
fm,
rnd.xy,
lightSample
);
}
(*lightSample).selectionPmf *= mP;
(*lightSample).pdf *= mP;
}

fn sampleLight(
fm: vec3f,
rnd: vec3f,
lightSample: ptr<function, LightSampleRec>,
rU: bool
) {
kb(
fm,
rnd,
0,
rtUniform.lightChoiceCount,
1.0,
lightSample
);
}



fn my(
fm: vec3f,
rnd: vec3f,
ca: u32,
aW: u32,
lightSample: ptr<function, LightSampleRec>
) {
kb(
fm,
mI(rnd, ca, aW),
0,
rtUniform.lightChoiceCount,
1.0,
lightSample
);
}
`;var tf="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AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABz8AAAD+////////////////////////////////////////YEsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEkAAAD+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALhwAAAD8/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA3QkAAAD5AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAMAAAD6/v8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcQEAAAD5/v//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAD7/wD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASgAAAAD7/f8CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJAAAAAD6/v4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAD8AvwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAC+gkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAAAAD69gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAPGQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAADxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAADeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAADWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAB/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAdgJr/wBCdZm0yNbg6O7y9fj5+/z9/f7+/v7/////////////EiQAAADh6e/09vn7/P3+//7/////AP8AAAAAAAAAAAAAAAAAEw4AAAD39vn6/P3+/v///wAAAAAAAAAAAAAAAAAAAAAAAAAA0xYAAAD38fL1+Pr7/f3+/v////8A/wAAAAD/AAAAAAAAAAAASRgAAAD/8vHz9ff6+/z9/v7//wD/AAD/AAAAAAAAAAAAAAAA5xYAAAAA+PTz9ff4+vz8/f7+//////8AAAAA/wAAAAAAAAAAlBQAAAD//ff19fb4+fr8/f3+/v//AAAA/wAAAAAAAAAAAAAA+REBAAD//vr49vf4+fr7/P3+/v7/////AP8AAP8AAAAAAAAAag8AAAAA/v36+fj4+fr7/P39/v7//////wAAAAAAAAAAAAAADQ0AAAAA//78+vn5+vr7+/z9/v7+/v8AAAD/AAD/AAAAAAAA8goAAAAAAP79/Pv7+vv7/Pz9/f7+//////8A/wAA/wAAAAAAIAkBAAABAP/+/fz7+/v7/Pz8/f7+/v//////AAAAAAAAAAAAkwcBAAABAP/+/v38/Pz8/P39/f3+//7+/wAAAP8AAP8AAAAARQYBAAABAAD//v7+/f39/f39/v7+/v///////wD/AAAAAAAALwUCAAABAQAA//79/v39/f3+/f7+/v7///////8AAAD/AAAASQQCAAAAAQD//////v7+/v7+/v7///////8AAAAA/wAAAAAAjAMDAAABAQEAAP///v7+/v7+/v7+/v///////wD/AAAAAAAA7wIDAAABAQEBAAD//////v7+/////////wD/AP8AAAAAAAAAcAIEAAABAQEBAAD/AP//////////////AP8A/wAAAP8A/wAACAIFAAABAQEAAAAA////////////////////AP///wAAAAAAsQEGAAABAQEBAQAAAAD//////////////wAA/wAAAAAAAAAAbAEGAAAAAQEBAQEBAAAAAAAA//////8A////AP8AAAD/AAAAMQEGAAABAQEBAQAAAAAAAAD/AAAAAAD/AAAAAAAAAAAAAAAAAQEHAAABAgICAQEBAQAAAP8A////AP8AAP///wD///8AAAAA2gAHAAABAQEBAQEBAQEBAAAAAAAA/wD//wAAAP8AAAAAAP8AugAHAAABAQEBAQIBAAAAAAAAAAAAAAAAAP8AAAAAAAAAAAAAngAHAAAAAQICAgEBAQEAAAAAAP//AP8A/wD//wD/AAAAAAEAiAAHAAABAQEBAQEBAQEBAQEAAAAA/wD/AAAAAP8A/wAA//8AdQAGAAABAQEBAQEBAQAAAAAAAAAAAAAAAP8AAAAAAAAAAAAAZAAHAAABAgICAgEBAQEBAQAAAAAAAP8A/wD//wAAAP//AAAAWAAFAAAAAQECAQIBAQEBAAEAAAAAAAAAAAAAAAD/AAAAAAAATAAGAAABAQIBAgEBAQEAAAAAAAAAAAD/AP8AAP8A/wAAAAAAZAQT/gAWJC0yNDU0MS4sKSUiHxwYFhQRDw4LCQgHBgQDAgEA7iIAAADf5+zw9Pb4+vv8/f3+/v7///8AAP8AAAAAAAAAAAAAIAoAAAD6+Pn7+/z9/v7+////AAAAAAAAAAAAAAAAAAAAAAAA8BIAAAD78/T1+Pn6+/39/f///v///////wAAAAAAAAAAAAAAMBUAAAAB9fLz9Pf5+vv8/f3+/////wAAAAD/AAD/AAAAAAAAtxQAAAAC+/X09PX3+Pr7/P39/v7///////8AAAAAAAAAAAAAPxMAAAD//vn29vb2+Pn7+/z9/f7+//8AAAAA/wAA/wAAAAAAYBECAAD///z59/f3+Pn6+/z9/f7+/v//////AAAAAAAAAAAAZA///wAA//77+fj4+Pn5+/v8/f3+//7//wAAAP8AAAAAAAAAdA0CAAAAAP/+/Pr6+vn6+vv7/P3+/v/+/////wAAAP8AAAAApgsCAAAA///+/fz7+vr7+/v8/f39/f7/////AAD/AAAAAAAAAwoCAAABAP///v38/Pz7+/z8/P39/v7+//8A//8AAAD/AAAAkQgEAAAAAQD//v79/Pz8/Pz9/f3+/v7+/v///////wAAAAAATQcEAAABAQAAAP///v39/f38/f39/f7///7//wAAAAAAAAAANQYHAAABAQEA///+/v79/v3+/f7+/v7+/v//AP//AP8A/wAARgUIAAABAQEAAAAA/////v7+/v3+//7//////wAA/wAAAAAAegQLAAABAQEBAQD/AP///v/+/v/+/v/+////////AAAAAAAAzwMNAAABAQEBAAAA//////////7///////////8A/wD/AAAAPQMQAAABAQEBAQABAAD/AP//////////////AAAAAP8AAAAAwwISAAABAQIBAQEAAQAA/////wD//////wAA////AAAAAP8AWwIVAAAAAgECAgEBAAAAAAAAAP8A//8A/////wAA/wAAAAAABgIWAAABAQIBAQEBAQEBAAAAAAD/AAD/AP//AP//AP8AAAAAvAEYAAABAQECAQIBAQAAAQAA//8A//8A/wAAAAAAAAD//wAAfwEZAAABAQEBAgEBAQEBAAAAAAD/AAD/AP///////wAAAAAASwEZAAABAgICAQEBAQEAAAAAAAAA//8A/wAAAAAAAAAAAAAAHwEZAAAAAQEBAgIBAQEBAQEAAAAAAAD/AP8A/wAAAP8AAAAA+wAZAAABAQICAQEBAQAAAAAAAAD/AP8AAAD/AP///wD/AAAA2wAZAAABAQEBAQEBAAEBAAAAAP8A/wD///8A/wAAAAAAAAAAwAAXAAAAAQEBAgECAQEAAQAAAAAAAAAAAAD/AP8AAP8A/wAAqQAWAAABAQICAQIBAQEBAAEAAAAAAAAA/wAA/wD//wAAAAAAlgAVAAAAAQEBAQEBAQEBAQABAAAAAP//AP//AAAAAAAAAAAAhAATAAABAQEBAgEBAQEBAQEAAQEAAAAAAAAAAAAAAAD/AAAAwQZW/AAVJS41ODo5OTYzMC0qJyMhHRsYFRMQDgsJCAYFAwEAdiIAAADf5evu8fT3+Pn7/P3+/v/+//////8AAAAAAAAAAAAAbQgAAAD8+fr7/P39/v////////8AAAAAAAAA/wAAAAAAAAAAKBEAAAD89PT29/j6+vv8/f7+/v////8AAAAAAAAA/wAAAAAApRMAAAAC9vPz9fb4+vv8/P39/v7//////wD/AAAAAAAAAAAAgBMAAAAC/PX09Pb2+Pn6/Pz9/v7+////AP8AAP8AAAAAAAAAXxL//wAA//r39vX39/n6+vv9/f7+/v////8AAAAAAAAAAAAAzxAFAAD/AP359/f3+Pj5+/v8/P39/v7//wD//wAAAP8AAAAAGA/+/wD////9+vn4+Pn5+vv7/P3+/v/+////AAD/AAAAAAAAYA0EAAAAAP/+/fv6+fn6+vv7/Pz9/v7///////8AAAD/AAAAvQsEAAAAAAD+/fz7+/v6+vv8/P39/f3+/v4A//8A/wAAAAAAOgoFAAABAP8A//79/Pv8/Pv8/Pz9/f7+/v/+/wD/AAAAAAAA3QgIAAABAAD///7+/f38/P38/f39/v7+////////AP8A/wAAqAcKAAABAQEAAAD///79/f39/f39/f7+/v7///8A/wAAAAAAmQYOAAAAAQEBAP////7//v39/v7+/v7+////AAD/AAAAAAAArgUTAAABAQEBAAAA///+/v///v7+/v7//v////8A////AAAA4gQXAAABAQEBAQEAAAAAAP7+/v7+////////////AAAAAAAANAQcAAABAgEBAQEAAAD//wD///////7+//////8A/wAAAP8AoAMgAAABAQIBAQABAAAAAP8AAP8A/wAA/////wD/AP8AAAAAIAMmAAABAQECAQIBAQABAAAA/wD///////8AAP8AAAD/AAAAtQIqAAABAgIBAgEBAQEAAAAAAAAAAP//AAD//wD//wAA/wAAWAIvAAABAQECAQEBAQEBAAAAAP///wAA//8AAP8AAP8AAAAACwIxAAAAAQIBAgEBAQAAAQEAAAAAAP//AAD//wD//wAAAAAAyAEzAAABAQECAQIBAQEBAAAAAAD//wAA//8AAP8AAAAAAAAAkAE0AAABAgEBAgEBAQEAAQAAAAAAAP//AP///wD/AAD/AAAAXwE0AAABAQIBAQECAQEBAAAA//8AAAAA/wD/AP8A//8A/wAANgEzAAAAAQECAQIBAQAAAAAAAAD///////8A/wD/AAAAAAAAEwEyAAABAQEBAgEBAAEBAQAAAAAAAAAAAAD///8A////AAAA9AAwAAAAAQEBAQEBAQEAAAEAAAAA////////AAD/AAAAAP8A2gAtAAABAQEBAQEBAQABAAAAAP//AAD/AAAA//8A/wAAAAAAxAAqAAAAAAEBAQEAAQEAAQAAAAAAAAAA//8AAAD/AP///wAArwAnAAABAQECAQEBAQEBAAAAAAAAAP8AAAD/AAAAAAAAAAAAHAlM+gAVJC81Ojs8Ozo4NTMvLCkmIh8cGRYUEA4MCQgGBAIANyIAAADe5ent8PT29/j6+/z9/f7+/v//////AAAAAAAAAAAAgwcAAAD8+vv8/Pz9/v/+////AP//AAAAAAAAAAAAAAAAAAAAJRAAAAD99PT19/n6+/v8/f3+/v//////AAAAAP8AAAAAAAAAuRIAAAAE9/P09fb3+fr7/P39/v7//////wAAAAAAAAAAAAAAuRL//wAC/ff09PX39/n7+/z9/f7+/v///////wAAAP8AAAAAwRH//wAA//r39vb2+Pj5+vv8/P3+/v////8AAAD/AAAAAAAAWxAIAAD/AP76+Pf39/n5+vr7/f39/v7///////8AAAAAAAAAyA7+/wD/AP/9+vn4+Pj5+vv7+/z9/v7+////AAAAAAD/AAAAMA0HAAAA///+/fv7+vr6+vr7/P39/f7+/v///////wAAAAAApwsGAAAAAAD//v37+/r6+vv8/Pz9/f3+/////wAAAAAAAAAAOgoIAAAAAAAA//7+/Pz8/Pz8/Pz8/f7+/v7///////8AAAAA7QgPAAABAQAAAP/+/v38/Pz8/P39/v3+/v////8AAAAA/wAAxQcRAAABAQAAAAD///7+/v39/v3+/f7+//7+////AAAAAAAAvgYYAAABAQEBAAAA/////v7+/f79/v7+/v//////////AAAA2AUfAAABAQEAAAAAAAD////+//7//////////wAAAAAAAAAAEgUmAAABAQICAQEAAAD////////+/v7//v///////wAAAAAAZQQuAAABAQEBAgEBAAABAAAA//8A////AP//AP8AAP8AAP8A0gM2AAAAAgEBAQEBAQAAAAAAAAD/AAD///8A/wD//wD/AAAAUwM/AAABAQICAQEBAQEAAQAA//8A//////////8AAAAA/wAA5gJFAAABAQIBAgEBAQEBAAAAAAD/AAAAAAAAAAD/AP8AAAAAigJMAAABAgECAQIBAQEBAAAAAAAA//////////8A/wAAAAAAOgJQAAABAQEBAgEBAQAAAQEAAAAAAAAAAAAAAAD/AAD/AAAA9wFTAAAAAQICAQECAQEBAAAAAP//AP////////8A//8AAAAAvAFVAAABAQEBAQEBAQEAAAAAAAAA/wAA////AAD/AAAA/wAAiwFVAAABAQEBAQEAAAAAAAD//wD//////wD///8A////AAAAYAFUAAAAAQECAgEBAQEAAAAAAP//////AP8A/////wAAAAAAOwFRAAABAQEBAQEBAAABAAAA//8AAP//////////AP8AAP8AGwFNAAAAAQEBAAEBAQAAAf8AAAD//wD//////wAA/wD//wAAAAFJAAABAAEAAQEAAQEAAAD/AAAAAP8A////AP//AP8AAAAA5wBEAAAAAQEBAQEBAAABAAEAAP8A/wD/AAAA/wAAAAAAAAAA0gBAAAABAQEBAQEBAQEAAAAAAAD/AP8A/wD/AP///wD/AAAAcAsJ+AAVJC83Oz0+Pj07OTUzLywpJiIfHBgWExEOCwkHBAIAFCIAAADe5Ons8PP19/j5+vz8/f7+/v//AAAAAP8AAAAAAAAA+QYAAAD8+/v8/Pz9/f7///8A//8AAAAA/wAAAAAAAAAAAAAAhw8AAAD+9PT29/n6+/v8/f39////////AP8A/wAAAAAAAAAAHxIAAAAD+PTz9fb3+Pr7+/39/f7+/v///wD/AAAAAP8AAAAALxL//wAD/fb19PX3+Pn6+/v9/f3+//////8AAAD/AAAAAAAATBH//wAA//v39vb29/j5+vv7/P39/v7///////8AAAAAAAAA+g8LAAD/Af77+Pf3+Pj5+vv8/P3+/f7+////AAAAAAAAAAAAfQ7+/wD////9+/n4+Pn4+vr7/Pz8/v7//////////wD/AAAA+AwKAAAAAAD+/fz7+vn6+vr7/Pz9/f7+/v///wAAAAAAAAAAgAsJAAAAAAD///38+/v7+vv7+/39/f39/v7/////AP8AAAAAIQoNAAAAAAAA//79/fz8/Pz8/Pz8/f3+/v////8A/wAA/wAA4QgVAAABAAAAAP///v79/fz8/f39/f7+//7+////AAAAAAAAwgcbAAABAQEBAAD//v7+/f7+/f3+/v7+/v///wAA////AAAAxAYiAAABAQAAAAAAAP/+//7+/v7+/v7+/v7/////AAAAAAAA5QUuAAABAQIBAQEBAAAA///+//7+/v///////////wAAAAAAIgU3AAAAAgEBAQEAAQAAAAAA/wD///7/////AP8AAP8AAP8AewREAAABAQECAQEBAAEAAAAAAP8AAAD//wD//wD//wD/AAAA6QNPAAABAQIBAgEBAQEBAAAAAAD///8AAP8A//8AAAAA/wAAbQNaAAABAgECAQIBAQAAAQAAAAAAAAD//wD/AAD/AAAAAAAAAgNkAAABAQIBAgECAQEBAAAAAAAAAP8AAP8A//8A//8AAAAApgJtAAABAQECAQEBAQEBAQEAAP8A/wD//wD/AAAAAAAAAAAAWQJ0AAAAAQIBAQEBAQEAAAAA/wD/AP8AAP8A////////AAAAFAJ4AAABAQECAQEBAQAAAAAAAAAA/wD//////wD/AAAA/wAA3AF6AAABAQEBAQEAAAABAP//////////////AP8A////AAAAqQF6AAAAAQEBAQEBAQEAAAAAAP//////////////AAAAAAAAfwF4AAABAQEBAQEAAAD//wD/////////////////////AP8AWgF0AAAAAAAAAQABAAAAAP8A/////////////////wAA/wAAOgFvAAAAAQEBAQEAAAAAAAD/AAD///////////////8AAAAAHQFpAAABAQEBAAABAQAAAAAA//////////////8AAAD/AAAABgFiAAAAAAEAAQEAAAAAAP//AAAAAP///////wD///8A/wAA7wBbAAABAQABAAEBAQAAAAAAAP8A/wAAAAAAAP8AAAAAAAAAvA2e9QAVJjE5PkBAQEA+Ozk2Mi8rKSUiHhsYFRIPDAoHBQIAASIAAADe4+js7/L19vj5+vv8/f7+/v7+//8A/wAAAAAAAAAAqAYAAAD9+/v7/Pz9/v7///////8AAAAAAAD/AAAAAP8AAAAAIQ8AAAD+9PX29/n6+/v8/f3+/v/+//8A/wAAAAAAAAAAAAAAtxEAAAAE+PT09fb3+Pr7+/39/v3//v//AP8AAAD/AAAAAAAAyhH//wAC/fb09PX2+Pn5+/v8/P7+/v/+/wD///8AAAAAAAAA7xD//wAAAPz49vb29/j5+vv7/f39/v7/////AAAAAAAAAAAAqA8OAAD/Af76+ff39/j5+fr8+/z9/v7+/v8A/wAA/wD/AAAANw7//wD////++/n5+Pj5+vr6/Pz9/f7+//7/////AAAAAAAAvQwNAAAAAAD+/fz7+vr6+vv7+/z8/f3+/v//AP8AAAAAAAAAUAsNAAAAAAAA//38/Pv6+/v8/Pz9/f7+/v/+/wD///8A/wAA/AkSAAABAAAA///+/fz8/Pz7/P38/f3+/v7/////AAAAAAAAxggdAAAAAQAAAP///v7+/Pz9/f3+/f7+/v7///8A/wAAAAAArwcjAAABAAEAAAH///7+/v7+/f39/v3+///+/v//AP//AAAAtwYwAAABAQABAQAAAAD////+//7+/v/+/v//AP8A/wAAAAAA3wU9AAABAQIBAQEBAAAAAP///////////////wD/AAAAAAAAIgVLAAABAgECAQEBAQEAAAAA/wD///////8A//8AAP8AAP8AfwRaAAAAAQEBAQEBAQABAAAAAP8AAP8AAP//AAD//wD/AAAA8QNqAAABAQIBAgEBAQEBAQAAAAAAAAD//wAA//8AAAAA/wAAeAN5AAABAgECAQIBAQEAAAEAAAAAAAAAAP//AAD/AAAAAAAAEAOGAAABAQIBAQEBAQEBAQABAAAA//8AAAAA//8A//8AAAAAtgKSAAABAQECAgEBAQAAAAAAAAD/AAD/////AAAAAAAAAAAAawKaAAAAAQEBAQEBAAEAAAD/AP8A/////wAA////////AAAAKQKgAAABAQEBAQEBAQAAAAAA/wD/////////////AAAA/wAA8AGiAAAAAQEBAQAAAAAAAP////////////7+////////AAAAwAGjAAABAAEBAAEAAAAA//////7+//7///////////8AAP8AlwGfAAAAAQEAAQAAAAD//////////v/+/v///////wD//wAAcgGaAAABAQABAAABAP8AAAD///////////7//v////8AAAAAUgGTAAAAAAEAAQEAAAD///////////7////+////////AAAAOAGLAAAAAAABAAAAAAAAAP8A//////////////8AAAAA/wAAHgGCAAAAAQEAAAAAAAAA/wD/AAD//wD///8AAP//////AAAACQF4AAABAAABAQEAAAAAAAAA//8AAP///wD//wAAAAAAAP8AAxAZ8wAWKDM7QEJEREJAPjs4NTIuKickIR0aFxMQDQsIBQMA9iEAAADd4+jr7/L09vj6+/v8/f3+/////////wAAAP8AAAAAegYAAAD9+vv8/P39/f7+/v///wD//wAAAAAAAAAAAAAAAAAA4A4AAAD/9fX29/j6+/v8/f3+/v7//////wAAAAD/AAAAAAAAbhEAAAAE+PPz9Pb3+Pr7+/39/v7+////////AAAAAAAAAAAAfhH//wAD/ff19fX2+Pj5+/v8/P3+/v7///8A//8AAAAAAAAApBD//wAAAfz39vb29/j5+vv7/f39/f7+////AAAAAAD/AAAAYA8SAAD/AP77+Pf39/j5+fr7+/z9/v7//////////wAAAAAA9Q3+/wD/AP/++/r5+Pn5+vr7/Pz9/f7+/v///wAAAAAAAAAAggwRAAD/AAD//vz7+vn5+vv7+/z8/f3+/v7/////AP8AAAAAHAsRAAAA/wD///38/Pz7+/v7/Pz9/f79/v////8A/wAA/wAA0AkXAAABAQAA///+/fz8+/v8/P38/f3+//7/////AAAAAAAAoQglAAAAAAEBAAAA//7+/v39/f3+/v7+/v/+/wAA/wD/AAAAkQcvAAABAQAAAQD//////v7+/v39/f7+/v7/////AP8AAAAAoAY8AAABAQEBAQEBAAD//////v////7//////////wAAAAAAzgVOAAABAQEBAQABAQEAAAD/AP//////////AP8AAAAAAAAAFgVgAAABAQIBAQIBAQABAAAA/wD//wD//wAA/wAAAP8AAP8AdwRzAAABAgECAQEBAQEBAQEAAQAAAP8AAP//AAD//wAAAAAA7wOGAAABAQEBAQEBAQEAAQABAAAAAAAAAAAAAP8AAAD/AAAAeQOZAAAAAQICAgEBAQEBAAEAAAAAAAAAAAAA/wAAAAAA/wAAFQOqAAABAQEBAQEBAQEBAQAAAAAAAAD//wD/AAD/AAAAAAAAvgK4AAABAQEBAQEBAAAAAAAAAAAA//8A//8A//8A//8AAAAAdQLDAAAAAQIBAQEAAQAA//8A////////////////AAD/AAAANgLKAAABAQABAQEBAAD/AAD////////+//////////8A/wAA/wHNAAAAAQEBAAAA//8A///+//7+/v7///7+////////AAAA0gHMAAABAAEAAAD/AAD///7//v/+///+/v7//v////8AAP8AqAHJAAAAAQAAAQAAAP///////v7//v7+/v/+//7//////wAAhgHCAAAAAAABAAAA///////+//7+/v7//v7+/v/+/wD/AAAAaAG5AAABAAEAAAAAAAD////////////+//////////8A/wAATQGvAAAAAAAAAAAA//8A///////+//7///////8A////AAAANQGjAAAAAQAAAAAAAAD/AP8A//8A/////////////wAAAP8AIAGXAAAAAAEBAQAAAAAAAAD/AAD//wD///8AAAD/AP8A/wAAQRKD8AAYKjU9QkZGR0VDQD47NzQxLSkmIx8bGBQSDgwIBgMA8yEAAADc4ujs7/H09vj5+vv8/f39/v///////wAAAP8AAAAAYwYAAAD9+/v7/P3+/f7///////8AAP8A/wAAAAAAAAAAAAAAuQ4AAAD/9fT29/j5+/v8/f3+/v/+/wD/AP8AAAD/AAAAAAAAOhEAAAAE9/T09fb3+Pr6+/z8/f3//v7//wD///8AAAAAAAAAQxEAAAAD/vf09PX29/j6+vz8/f79/v////8AAAAAAAAAAAAAZBD+/wAAAPv49vb29/j5+vr8/Pz+/v7+/////wAA/wD/AAAAIA8WAAD/Af/7+ff3+Pj4+vr7/P38/f7+/v//AP//AAAAAAAAtg3+/wD/AP/9+/r5+Pj5+fv7+/z9/v3+/////wAAAAAAAAAARwwVAAAAAAAA/vz7+vr6+vr6/Pz9/f7+/v7///////8AAAAA5woWAAAA/wD///79/Pz7+/v8+/z8/f3+/v////8AAAAA/wAAnwkcAAAAAAAA///+/v38/Pz8/fz9/f7+/v7+////AAAAAAAAdgguAAABAQEBAQD///7+/v39/f79/f3+////////////AAAAbQc5AAABAQAAAAAB/////v/+/v3+/v/+/v7//wAAAAAAAAAAggZKAAAAAQEBAQEAAQAAAP////////7//////////wAAAAAAtQVgAAABAQEBAQEBAQEBAAAA/wD//wD//wD/AAAAAAAAAAAAAgV1AAABAQICAQEBAQEAAQEAAAAAAP8AAP8A//8AAAAAAAAAaQSMAAABAQEBAgICAQEBAQABAQAAAAAAAAAAAAAAAP8AAAAA5QOkAAABAgICAQEBAQEBAAEAAAABAAAAAAAAAAAAAAAAAAAAdAO7AAABAQEBAQEBAQEBAQABAQAAAAAA/wAAAAD//wAAAP8AEwPPAAABAQEBAQEBAAAAAAAA/wAAAAD/AP//AP8AAAD/AAAAwQLgAAAAAQEBAQEAAQAAAAD/AAD//////wD//wD/AP8A/wAAegLsAAABAQEBAQAAAAAA//////7///////7///8A/wAAAAAAPgL1AAAAAAEAAAAA/////////v/+/v7//v///v/+////AAAACgL5AAAAAQABAAAA///+//7+/v7+/v7+/v7+//7//////wAA3gH4AAABAAAAAP//AP///v/+/v7+/v79/v7+/v7/////AP8AtwH0AAAAAAEAAAD///////7+/v7+/v7+/v7+/v/+/v8A/wAAlwHrAAAAAAAAAAAA/////v7///7+/v7+/v7+//7//////wAAegHgAAAAAQAAAP/////+///+/v7+/v7///7//v//////AAAAYAHUAAAAAAAA/wAAAP8A///////////+/v///////wAAAP8ASQHGAAAAAAAAAAAA/wD/////////////////////AP///wAANQG3AAABAAAAAQAAAAAAAAAA//////8AAAD/AAAA/wAAAAAAeBTj7QAZLDlBRUlJSkhGREA9OjczLysnIyAdGRUSDwwJBgMA9CEAAADc4ufr7/H09ff5+vv8/f39/v//AP///wAAAP8AAAAAXQYAAAD9+/v8/P39/v/+/v////8AAP///wAAAAAAAAAAAAAAow4AAAD+9PT19/j6+vv8/f3+/v/+//8AAP8AAAD/AAAAAAAAFhEAAAAF+PT09fb3+fn7+/z8/f3//v///wD///8AAAAAAAAAExH//wAD/vf09PX29/n5+/z8/f39/v/+//8AAAAAAAAAAAAALRD//wAAAPv49vb29/f5+fr8/P39/v7//////wAA/wD/AAAA5g4ZAAD/Af/7+ff39/j5+vr7/Pz9/f7+/v//AP//AAAAAAAAeg3//wD/AP/++/r5+fn4+fv7+/39/f3+//7///8AAAAAAAAADQwZAAAAAAH//vz7+vr6+vr6/Pz8/f7+/v///wD///8AAAAArwoaAAAA/wAA//79/Pv8/Pv8+/z9/f3+/v7+//8AAAAA/wAAbAkiAAAAAQAAAP/+/v78/P38/fz9/v7+/v//////AAAAAAAASAg3AAAAAAABAAEA//7+/v3+/f7+/f7+////////////AAAARAdEAAABAQEAAQABAAAA///+//7+//7+/v7//wAAAAAAAAAAXgZZAAABAQEBAQEAAQAAAP///////////wD/AP8A/wAAAAAAlwVxAAABAQEBAQECAQEBAAEBAAAA//8AAP8A/wD/AAAAAAAA6wSLAAABAQECAQIBAQEBAQEAAAAAAAAAAAAAAAAAAAAAAAAAVQSnAAABAQIBAgEBAQIBAQEBAQEAAQEAAAAAAAAAAAAAAAAA1wPCAAABAgEBAQEBAQABAQABAAABAAAAAAAAAAAAAAAAAAAAagPdAAAAAQECAQEBAQEAAAEAAQEAAAAAAAAAAAAAAAAAAAAADQP0AAABAQEBAQEBAAAAAAAA////AAAA/wD///8AAP8AAAAAvgIIAQABAQEAAQAAAAAAAP//AP//////AP//AAD//wD/AP8AfAIYAQAAAAEBAAD/AP///////v///v7+/v7//v7///8A/wAAQgIhAQAAAQAAAAAA///+/v7+/v7+/v7+/v7+////////AAAAEgIlAQABAAAA/////////v79/v39/v3+/v7+/v7+/////wAA5wElAQAAAAAAAP///v7+/v3+/f79/f79/f7+/v7//v////8AxAEfAQAAAAD//wD///7+/v7+/v3+/f3+/v3+/v7+////AAAApQEVAQAAAAAAAP/////+/v7+/f7+/v79/f7+/v/+//8A/wAAigEIAQAAAAAA/////////v7+//7+/v7+//7+/v7//v//AP8AcQH5AAAAAAAAAAD////////+/v7+/v7//v//////AP///wAAXAHpAAAAAAAAAP8A//////////////////////////8AAAAASAHXAAAAAAAAAAEAAAAAAAAA/wD/AP///////wAAAAAAAAAAphZB6wAbLjtESUtNTUtJRkNAPTg1MC0pJiIeGxYTDw0JBgMA+SEAAADb4ufr7/L09vj5+vv7/P3+/v///////wAAAP8AAAAAZAYAAAD9+/v7/P39/f7+//8A/wD/AP8A/wAAAAAAAAAAAAAAmQ4AAAD+9PX29/j5+/v8/f39/v7//wD/AP8AAAD/AAAAAAAA/RAAAAAF+PPz9PX3+Pn6+/z9/v3+/v7//wD///8AAAAAAAAA7BAAAAAD/vf09PX29/n6+vv8/P79/v/+//8AAAAAAAAAAAAA/Q/+/wABAPv49vb29/f5+vv7/Pz+/v7//////wAA/wD/AAAArw4dAAD/Af/7+ff39/j4+fr7/P38/f7+/v//AP//AAAAAAAAQQ0AAAD/AAD+/Pr5+fn5+vr7+/z9/v3+//7///8AAAAAAAAA0gscAAD/AAAA/v37+vr6+vv7/Pz9/f7+/v///wD///8AAAAAdwofAAAAAAAA//7+/fz8/Pv8/Pz8/f3+/v7+//8AAAAA/wAAOAkoAAABAAEAAAD+/v39/P38/f39/f7+/v//////AAAAAAAAFwhAAAAAAAABAQAA///+/v7+/f7+/v7+/////wAA/wAAAAAAGAdPAAABAQEAAQEBAAAAAP////7/////////////AP//AAAAOAZnAAABAQEBAQEBAgEAAAD//wD///////8AAAAAAAAAAAAAdgWEAAABAQECAQECAQEBAQABAQAAAAAAAAAAAP8AAAAAAAAAzgShAAAAAQEBAQIBAQECAQEBAQEBAAAAAAAAAAEAAAAAAAAAPwTBAAABAgEBAQEBAgIBAQIBAQAAAQEBAAAAAAAAAAAAAAAAxQPhAAABAQICAgEBAAEBAQABAAEBAAAAAQEAAAAAAAAAAAAAXAP/AAABAQEBAQEBAQAAAAEAAQAAAQAAAAAAAAAAAAAAAAAABQMaAQABAQEAAAAAAAAAAP8A/wAA/wAA//8AAP8A/wAAAAAAuQIyAQAAAAABAAAAAP/////+//7+//7+/////wD/AP8AAAAAegJCAQAAAQEAAAD//v///v7+/v7+/v7//v7+/v7//wD///8ARQJOAQABAAAAAP////79/v7+/f7+/f79/v7+/v7+////AAAAFwJSAQAAAAD////+/v7+/v39/f39/f39/f39/v7+/v7//wAA7wFRAQAAAP8A//7//v7+/f39/fz8/f39/f7+/v7+/v////8AzgFLAQAAAAD////+/v79/f79/f39/f39/f39/f7/////AAAAsgE/AQAAAAAA//////7+/v3+/f7+/f3+/v7+/v7+/v7//wAAlwEwAQAAAAD/AP////7//v79/v79/v79/v7+///+//8AAP8AggEgAQAAAP8A/////v/+//////7//v7//v7//v7//wD//wAAbQELAQAAAAAAAAD/AP8A/////v/+///+//////////8AAAAAWgH4AAAAAAAAAAAAAAD/////AP8A//8A////AAAAAAD/AAAAyhig6AAcMD9HTE9QT05MSUZCPjo2My8qJyMfGxcUEA0KBgMAASIAAADb4ubr7/L09vj5+vv8/f7+/v7//////wAAAP8AAAAAcwYAAAD9+vv7/P3+/v7+/////////wAA/wAAAAAAAAAAAAAAmg4AAAD+9fT29/j5+vv8/f3+/v7/////AP8AAAD/AAAAAAAA7BAAAAAF9/Tz9PX3+fr7+/z8/f7+//7//wD///8AAAAAAAAAzBAAAAAD/vb09PX29/j5+vv8/f3+/v////8AAAAAAAAAAAAA0Q///wAAAfz49vb29/j5+vv8/P39/f7+/////wAA/wD/AAAAfA4gAAD/Af/7+ff39/j5+vr7/Pz9/v7+/v//AP//AAAAAAAACQ0AAAAAAAD+/Pr5+fn5+fr7+/z9/f3+/////wAAAAAAAAAAmQsgAAD//wAA/v37+vr6+/v7/Pz8/f7+/v7///////8AAAAAPgokAAAAAAAA//7+/fz7+/v8/P39/f7+/v////8AAAAA/wAAAgkuAAAAAAEBAQD//v3+/f39/f39/v3+//7/////AAAAAAAA5QdJAAABAQAAAAEAAAD+/v79/v7+/v///v///wAA/wAAAAAA6gZaAAABAQEBAQEBAQAAAAAA////////////AP//AP//AAAAEAZ2AAAAAQEBAgECAQEBAQAAAAAA////AAAAAAAAAAAAAAAAUgWWAAABAQEBAQIBAQICAQEBAAAAAQEBAAAAAAAAAAABAAAAsAS4AAABAQECAQECAgEBAgIBAgEBAQAAAQEAAAABAAEAAAAAJgTbAAABAQIBAgEBAQICAQEBAQEBAQEBAAABAAEAAAAAAAAAsQP/AAABAQEBAQEBAQEBAQEBAQEBAAEBAQEAAQAAAQAAAQAATQMiAQABAQEBAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+QJAAQAAAQAAAQAA//////8A/wD/AP///////wAA/wAA/wAAsgJbAQABAAEA///////////+/v7//v7+////////AP//AAAAdwJtAQAAAQAAAP///v7+/f39/v39/f7+/v7+/v7+/v8AAP8ARQJ6AQAAAAAA///+/v39/f39/P39/f39/f3+/v7//////wAAGgJ/AQAA//////7+/v79/f39/fz8/Pz9/P39/f7+/v7//wAA9gF+AQAAAAD//v7+/f39/fz8/P38/f38/f39/v39/v/+//8A1wF2AQAAAP/////+/v39/f39/fz9/Pz9/f39/f7+////AAAAvAFqAQAAAP////7+/v7+/f39/f39/f39/f39/v7+/v7//wAApQFYAQAA/wD//////v7+/v79/f39/v79/v7+/v7///////8AkAFFAQD/AAAA///////+/v7+/v7+/v7//v7//v////8AAAAAfQEvAQAAAAAAAAD//////////////v7+/////////wD/AAAAbAEZAQAAAP8AAAAAAAD/AP8A////AAD/////AP////8A/wAA5RoE5gAfM0JKUFJTU1FPTElEQT05NDAsKCQgHBgVEQ4KBwMACiIAAADa4ufr7vL09vj5+vv8/f39/v7//////wAAAP8AAAAAigYAAAD8+vr8/f3+/v7//v///wAAAAAAAAAAAAAAAAAAAAAAog4AAAD+9PT19vj5+vv8/f3+/v7//////wAAAAD/AAAAAAAA4BAAAAAG9/Pz9Pb3+Pn6+/z8/f7+/v//////AP8AAAAAAAAAsRAAAAAD/vf09fT2+Pn6+/v8/f39/v7///8A/wAAAAAAAAAAqQ///wAAAfz49fb29/j5+vv8/P3+/v7+////AAAA/wD/AAAASw4kAAD/Af/7+fj39/j4+fr7+/z8/f7/////////AAAAAAAA0gwAAAD/AAD//Pr5+fj5+vv7/Pz9/f7+/v///wAAAAAAAAAAYQskAAAAAAD//vz8+vv7+vr7/Pz9/v3+/v7/////AP8AAAAABgooAAAAAAEBAP/+/fz8/Pz8/P39/f7+//////8A/wAA/wAAywg0AAAAAAAAAQD///79/f39/f39/v7+/v///wD/AAAAAAAAsgdSAAABAQEBAQEBAAD//////v7//v//////AP8AAAAAAAAAuwZmAAABAAABAQEBAQABAAD/AAD///////8A/wAA/wAAAAAA5gWEAAAAAQEBAQICAgIBAQABAAAAAAAAAAAAAAAAAAAAAAAALQWpAAABAQICAgIBAgICAgIBAgEBAQEBAQEAAQAAAQAAAAAAkQTNAAABAgEBAQECAQICAgICAQIBAQEBAQABAAEAAAAAAQAACwT3AAABAQEBAQEBAgEBAQECAgECAgEBAQEAAQABAAAAAAAAmwMfAQABAQEBAQEBAAEBAQEAAQEBAAEAAAEBAAAAAQEAAAAAPANEAQAAAQEBAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAA7AJlAQABAAAAAAD/AP///////v//AP//AP//AP8A//8AAAAAqwKCAQAAAAD/AP///v7+/v7+/v79/f7//v//////AAAA/wAAcgKYAQAAAAAA/v7+/f39/fz9/fz9/f39/f39/f7+/v//AAAARAKnAQAAAP////79/v38/P38/Pz8/Pz8/f39/v7+/v7///8AHAKsAQAAAAD+/v7+/f39/Pv7+/z8/Pz8/Pz9/f3+/v///wAA+wGqAQAA/////v79/fz8/Pz8/Pz7/Pz8/P39/f39/v7+//8A3wGhAQAAAP////7+/f39/f38/Pz9/Pz8/fz9/f7+/v7/AAAAxgGUAQAA/////v7+/f79/P39/fz8/f39/P39/f3+//////8AsAGAAQD/AAD////+//3+/v39/f39/f3+/v7+/v7+/v///wAAngFrAQAAAP////7//v/+/v7+/v7+/v7+/v7+////////AAAAjAFSAQAAAAAAAAD//////////////v7+//////////8A/wAAfAE4AQAAAAAAAAAAAP//////////AAD///////8AAAAAAAAA9hxx4wAgNkVOU1ZXVlVST0tHQz86NTEuKSUhHRkVEQ4KBwMAFSIAAADa4ebr7/L09vj5+vv8/P3+/////////wAAAP8AAAAApgYAAAD8+vv7/Pz9/v7+////AP//////AAAAAAAAAAAAAAAArw4AAAD+9PT29/j5+vv8/P3+/v////8A/wAAAAD/AAAAAAAA2xAAAAAF9/Pz9Pb3+fn7/Pz8/f3+/v//AP8AAAAAAAAAAAAAmRD//wAE/fb09PX29/n5+vz9/f7+///+/v////8AAAAAAAAAhA///wAAAvz39vX39/j5+vr7/Pz9/f7/////AAAAAAD/AAAAGw4oAAD/Af/8+fj39/j5+vv7/P39/v7+/////////wAAAAAAnQwBAAD/AAD+/Pr5+fn5+vr7+/z9/f7+/v///wAAAAAAAAAAKQsoAAAAAAEA/v38+/r7+vv8/Pz9/f3+////////AP8AAAAAzgktAAAAAAABAP/+/f38/Pz8/f39/v7+/v7/AP8A/wAA/wAAlAg5AAAAAAEBAQEA//7+/v79/f7+/v7//////wAAAAAAAAAAfgdbAAABAQABAQEAAQAA//7///7+/////wAA////AAAAAAAAjAZyAAABAAEBAgICAQEBAQEAAAAA/wD/AP//AAAAAAAAAAAAuwWSAAAAAQEBAQECAgIBAQEBAQEBAQABAAEBAAEAAAAAAQAACAW7AAABAQIBAgICAwMDAwICAQIBAQEBAQAAAQABAAAAAAAAcATmAAABAgEBAQICAQICAgMCAgECAgIBAQEBAQEAAQEAAAAA8AMTAQABAQECAQEBAgEBAQECAgIBAQEBAQEBAAABAAABAAAAhAM+AQABAQEAAQAAAAEBAQEBAQEBAQEBAQEBAQEAAQAAAAAAKgNnAQAAAAAAAAAAAP//AAAAAAAAAAAAAAAAAAAAAAAAAAAA3wKIAQABAQAA/////v///v7+/v7/////////AP8A/wAAAAAAoAKnAQAAAAAA//7+/v39/f39/f79/f3+/v///v///wD/AAAAbQLCAQAA///+/v79/f38/Pz8/Pz8/P38/f39/v7+//7//wAAQgLSAQAAAP///v39/Pv8/Pv7+/v7/Pv8/Pz8/f3+/v////8AHQLYAQD////+/v79/Pz8+/v7+/v8+/z8/Pz9/P39/v7//wAA/wHWAQAA///+/v38/fz7+/z7+/v7+/v7+/z8/f3+/f7+//8A5gHNAQAAAP///v7+/f38/Pv8/Pv7/Pz8/Pz9/f39/v7/AAAAzwG9AQD////+/v39/f39/f38/P38/Pz9/f39/f7+/v////8AvAGnAQAAAP/////+/v7+/f39/f39/f39/f39/v7+//7//wAAqwGQAQAA/wAA/////v7+/v7+/v3+/v7+/v7+/v7/////AAAAmgF1AQAAAP///////////////v///v7+/////////wAA/wAAjAFYAQAAAAAAAAAAAP//////AP///wAA/////wD/////AAAA/B7n4AAiOUhSV1paWVhVUU1JRUA8ODMuKiYiHhkWEg8LBwMAISIAAADZ4efr7/L09/j5+/v8/P7+/v7//wAA/wAAAP8AAAAAxwYAAAD8+vr7/Pz+/f7+/v//AP//AAAAAP8AAAAAAAAAAAAAwQ4AAAD+9PT19/j5+/v8/f7+/v//////AAD/AAAAAAAAAAAA1xD//wAF9vPz9Pb3+Pr7+/z9/f3+/v////8AAAD/AAAAAAAAhRAAAAAE/vb09PX29/j5+/v8/f7+/v7//wD///8AAAAAAAAAYQ///wAAAfz49vX29/j5+vv8/P39/v7+////AAAAAAD/AAAA7Q0sAAAAAv/7+fj4+Pj5+vr7/Pz9/v7//v///////wAAAAAAaQwBAAD/AAH//Pr5+fn6+vv7/Pz9/f7+//4A/wAAAAAAAAAA8QosAAD/AAEA//78+/v7+/v8/P39/f7+/v//AP8AAAAAAAAAlgkxAAAAAAABAP/+/v38/Pz8/P39/v7+/////wD///8AAAAAXghAAAAAAAEBAQEA///+/v7+/v7+/v7///////8AAAAAAAAASwdkAAABAQEBAgECAQAA/wD/////////////AAAAAAAA/wAAXAZ8AAABAQACAQICAgICAgEBAQAAAAAAAAAAAAAAAAAAAQAAkAWhAAAAAQIBAgICAwMCAgIBAQECAQEBAQEBAAAAAAEAAAAA4QTQAAABAQEBAgICAgIDAwIDAgICAgIBAQEBAQEBAQAAAAAATwT9AAABAQECAQICAgICAgMCAwMCAgICAQIBAQEAAQABAAAA0wMwAQABAQEAAQEBAQICAgECAgICAgEBAgEBAQEBAAEAAAD/bQNgAQABAQEBAAAAAAAAAAEBAQAAAQEBAQABAQAAAAAAAAAAFwOIAQAAAAAA/////////////wAA/wAA/wAAAAAAAAAAAAAA0QKrAQAAAP/////+/v7+/v7+/v7+/////////wAAAAAAAAAAlwLJAQAAAAD///3+/fz8/Pz8/P39/f39/v7+//////8AAAABZgLoAQAA///+/f38/Pz8/Pz7/Pv8+/z8/f39/f3+////AAAAPwL9AQAAAP7+/f38/Pv7+vr7+vr6+/v8+/z8/f3+/v7///8AHgIEAgAA///+/vz8+/v6+/r6+vv6+/r6+/v8/P39/f7+/wAAAwIBAgD///7+/f39/Pz8+/v7+/r7+vv7+/z8/Pz9/f7+//8A7AH3AQAA///+/v38/Pz7+/v7+/v7+/v8/Pz8/P39/v7//wAA2AHmAQD////+/v7+/fz9/Pz8/Pz8/Pz8/Pz9/v7+/v////8AxgHOAQAAAP///v7+/v79/f39/P39/f39/v7+/f7+//7//wAAtwG0AQAA///////+/v7+/v79/v39/v7+/f7+/v7+/v///wAAqQGXAQAAAAD//////////////v///v7+//7+////AAD/AAAAmwF4AQAAAAAAAAD/AP//////AP///wAA/wAAAP8A//8AAAAA9yBo3gAjPEtWW11fXFtXVE9LR0I+OTQvLCciHhsWEg8LBwMALiIAAADZ4Ofr7/P09/j6+vz9/P79//////8AAP8AAAAAAAAA6wYAAAD8+vr7/Pz9/v7+////AP8A//8AAAAAAAAAAP8AAAAA1Q4AAAD+8/T19/j6+vv8/f39/v7//wD//////wAAAAAAAAAA2BAAAAAF9/Lz9Pb3+fr7+/z9/f7+//7//wAAAAD/AAAAAAAAchAAAAAE/vf09PX29/j6+/z8/f7+/v////////8AAAAAAAAAPw///wABAfv49vX29/n5+vv8/P39/v7///8AAAAAAAAAAAAAwg0vAAD/AgD7+fj4+Pj5+vr7/Pz9/f7+/////wAA/wD/AAAANQwBAAD/AAH//Pv5+fn5+vv8/P39/v7//v//AP//AAAAAAAAugoxAAD/AAEB//38+/v7+/v8/Pz9/f7+//////8AAAAAAAAAXwk1AAAAAAABAQD//v39/f38/f7+/v7+/////wD/AP8AAAAAJwhGAAABAQEBAQEBAAD//v7+//7+//////8AAAAA/wAAAAAAFwdsAAAAAAECAgICAgEBAAAA//8A//8A/wD/AAAAAAAAAAAALQaHAAABAQEBAgMCAgICAgIBAQEAAQEAAQABAAAAAQEAAAAAZAWzAAABAQEBAgIDAwMDAwIDAgICAQEBAQEAAQABAAABAAAAuwTiAAABAQECAgICAwMDAwQDAwMDAwICAQECAQEBAQAAAAAALgQYAQAAAQEBAQICAgMDAwIDAwICAgICAgIBAQEAAAEAAAD/twNPAQABAQEBAQABAQEBAgICAgICAgICAgEBAQEBAQAAAP8AVQOAAQABAQAA/wAAAAAAAAAAAAEBAQEAAAEBAAEAAAAAAAD/BAOpAQAAAAD///7+/v7+/v////////8AAAAAAP8AAAAAAAAAwgLLAQAAAAD///79/f39/f39/v7+/v/+////AAAAAAAAAAABjALrAQAA///+/f39/Pz8/Pz8/Pz8/fz+/f3+/v///wAAAAEAYAIKAgAA//7+/f38/Pv7+vr6+vr7+/z7/P39/f3+////AAABPAImAgD///79/fv7+vr5+vr6+vr6+vr7+/v7/P39/f7//wAAHgIvAgAA//79/Pz7+/r6+vn5+fn5+fr6+/v8/Pz9/f3+//8ABgIsAgD///7+/f38/Pv7+vr6+vr6+vr7+/v7/P39/v7+/v8A8gEgAgAA///+/vz8+/z7+/v7+/v7+/v7+/z8/Pz9/f7/AAAA3wEOAgD///7+/f79/fz8/Pz7+/v7/Pz8/Pz9/f39/v7///8A0QH1AQAA//////7+/f39/fz9/f39/P38/f39/v7+/v/+/wAAwwHYAQAAAAD+/v7+//7+/f79/f39/v3+/v7+/v7///8A/wAAtgG4AQAAAP8A/////v///////////v///v//////////AAAAqQGXAQAA/wAAAAAAAP//////////AP//AP///wD/AAAAAP8AIUFmxwDu3s7As6idlY6IhIKBgYOHi5GYn6ixusPN1t/o8PkAOwNDAgAAAAAAAAAAAAABAQAAAQEAAQEBAQEBAQEBAQEBAQAAswOTAgAAAAAAAAAAAAAAAAABAAEBAQEBAQEBAQEBAQEAAAAAQQThAgAAAAAAAAABAAEAAAEAAQEBAQEBAgEBAQEBAAABAAEA7QQ7AwAAAAAAAAAAAAAAAQEBAQECAQICAQICAgIBAgEAAQAAvgWmAwAAAAAAAAAAAQABAAABAQEBAgECAgICAgECAQEBAQAAvAYYBAAAAAAAAQAAAAEAAQEBAQECAgICAgICAgICAQIBAAEA9gejBAAAAAAAAAAAAAABAQECAgICAgMCAwMDAgMCAgEBAQAAgQkuBQAAAAAAAAABAQEBAQIBAgMDAwMEAwMDBAMDAwICAQAAdAvDBQAAAAAAAAAAAAEBAgIDAwMDBAQEBQUEBAMDAgICAQEA9Q1nBgAAAAAAAAEAAQECAgIDBAQFBQYFBQUGBQUEBAMCAgEAPxELBwAAAAAAAAABAQECAwQEBQYGBwcICAcGBgYFBAQCAQAApBVoBwAAAAAAAQEBAgMEBQYHCAkKCgsLCwsKCQgHBgQEAgIArxtIBwAAAAEBAQEDBAUGCAoNDg8QEREREA8ODAsJCAYEAwEAWCQXBgAAAAABAgUGCQ4SFRkcHiAhIB8dGxkWFBAOCggGBAIAsTGkAgAARIfJ6OPu5dnMvq6djX1tX1FFOjAoIBoUEAwIBQIADQAAAAAAPPgzEREAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkfmS/wAAgYQMFSEwP1BhcYCPnKizvcbO1dzh5uvv8/b5/P4AG/ss/wAAAP/8+vfz8e3r6uno6Onq6+zu8PHz9fb4+fv8/f8AsPv1/gAAAP///fz6+Pf18/Py8vLy8vPz9PT29/j5+vv9/v8A/PvS/gAA/wD///38+/r5+Pb29vX19fX29vj4+Pr6/P39/v8AK/y7/gAAAAD//v79/Pv6+fn49/f39/j3+Pj5+vr7/Pz+//8ATPyq/gAAAAAAAP/+/fz7+/r6+fn5+fj5+fr6+/v8/P7+/v8AZvyh/gAAAP///////v39/Pv6+/r5+vr6+vr6+/z9/f3+/wAAfPyb/gAAAAAA///+/v79/Pz8+/v7+vr7+/v8/Pz8/f7+//8AkPyZ/gAAAAAAAP///v79/f38+/v7+/v7+/v8/P39/v7//wAApPya/gAAAAAA//////7+/fz8/Pz8/Pz8/P38/P3+/v7+//8AuPyc/gAAAAD/AP////7+/v79/fz8/Pz8/Pz9/f3+/v///wAAyvyg/gAAAAAAAAD////+/v39/f39/f38/f39/v79/v7///8A3fyl/gAAAAAA/wAA///+/v7+/f39/P39/f39/f7//v//AAAA8Pyr/gAAAAAAAP////7//v7+/v79/v3+/f7+/v7+/////wAAAv2x/gAAAAAAAAD///////7+/v39/f39/v3+/v7+////AAAA",Af="zThrEgAAAP/+/Pn28ezl3tfOxbyyp5yQhHhrX1JGOS0iFgsBAABVHv8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC39wAcBwIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADX/ACBJREJBgQCAQEBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAACABMNhPR8SCwgGBQQDAgIBAQEBAAAAAAAAAAAAAAAAAAAAAAAXBtQANigaEgwJBwUEAwMEAwMCAwIBAQEAAAAAAAAAAAAABAD4APoAODotIRkTDgwJCAcFBQMDAgMDAwMDAwMCAgEAAAAA/wCI///7KDs4LiQcFhANCgcGBAQDAgEBAP////7//wAAAAAAEQBXAfvnABwpLCgjHhoWEhANCwoICAcGBQUEAwQDAgEBAQAADQFAAP7y/xQkKywpJSAbGBQRDwwLCAcGBQQEAwIBAQEBAAAALwEwAfvv8QAQGyEkIyEfHBkWExAODQsJCAcFBQMDAwIBAQEAiQEaAfz08/sHEhsgIiMhHx0aGBYTEQ4NCwkJBwYFAwMDAgEAXwJbAfjy8vcACREYHR4gHx4dGhgWExIPDgwKCAcGBQMCAQAA8QLnAfXy7/L4AAgOFBkbHR0cGxoYFxQTEA4MCwkHBgUDAgEAzgNTAvDu7u/z+gEIDhIWGBobGxoZFxYUExEPDQwKCAYFAwIAzQTQAujo6evw9PsBBgwRFRcYGhoaGRgWFBMRDwwLCQcFBAIA1QVrA9ze4OTo7vP6AAYKDhIVFxgYGRgXFhQTEQ8NCgkGBAIALwUYBODh4uPl6e7y+f4ECQ4TFRkcHR8gICEgICAeHhwbGRgX6QLMBAD79vLv7u/x9Pj8AgYLERUaHyImKiwvMTM1Njc4OTk5RgOjBQD79/Tx8O7v8PP2+f4CBgoOEhcbHiEkJyksLjAyMzQ2owORBgD8+PXz8O/v8PDz9ff6/gEFCAwPEhYZHB8hIyYoKiwt/wOTBwD9+fbz8fHw7/Dw8fP19/r9AAIFCAsOEBMWGRsdICIkWQS4CAD8+vf18/Hv7+/v8PHy8/X2+Pv9AAIEBwkLDQ8SFBYYrwT7CQD++vf19PLx8O/v7+/v8PHz9PX3+Pr8/gACBAYICQsNAAVjCwD9+/n39PPy8PDv7u7v7/Dv8PHy8/T29/j5+/3+AAIDTAXMCwD+/Pv5+Pb19PPz8/Ly8vLz8/P09fb29/j6+vv8/v4AjwWNCwD//vz7+vn5+Pf39vf29vb29/f3+Pj5+fv7/P3+/v8AywUlCwD//v38/Pz6+/r6+vn6+vn6+fr6+vr7/Pv8/f3+/gAA/QWbCgD///7+/f39/P37/Pz7+/z7/Pz8/P38/f79/v7+//8AJwb+CQAA//////7+/v3+/f39/f39/f39/v3+/v7///8AAAAARQZSCQAAAAD//////////////////////v///v///wD/AAAAWwacCAD//wAA//8A//////////////8AAAAAAP8AAP8A/wAA",af="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uQHZ/wD8/f7+/v/+/v8AAAAAAAAAAAAAAAD/////AP////7/MALQ/wD0+/z9//7/AP///wAAAAAAAAAAAAAAAAD//////v/+qAG6/wD8/f/+/f7+/v//AAAAAAAAAAAA/wAAAP/////+//7/QQKn/wD8/P39/v3///8AAP8AAAAAAAAAAP///////v///v79xAGO/wD7/fz9/f7+/////wD//wAAAP//AAD///////7+/v7+wgGf/wAC+/v8/f79/f7+//8AAQAAAAAA//7//v7+/v39/fz8VQJGAAD4+fr7+/v8/f3+/wAA/wAA/////v79/Pz8+/v7+vv72gF2AADv9vr6+vr8/f8A/wAAAAAAAAD////+/vz6+vr5+fn4uwG/AAAA+PX4+fv9/wAAAQAAAQD/AP///v79/Pz8+vj39/b2PwHdAADo9vb2/P8AAAABAAEBAAAA///+/v39/fz7+/r59vTz0P8GAQDz7/n/AQICAgIBAgEAAP///v39/fz7+vr5+Pn49/b1//2CAADx+AIEBAUFBQQEAgIBAAD+/f37+vn5+Pf39/X09fTzKPqh/wDpCQ0MCQkJBwcEBAEA/vz7+vj39fTz8vHw7+/v7u7u6fFT/QAhFBEUExENCwcFAP359vLv6+jl4+Hf3t3c29vc3N3e4NwFyACnYf2fYTojFAwHBgcKDhUbJC03QUtVX2lzfYaOl5+mRP96cAABDVGXxN3r8/f6/P3+//8AABQ9ZYScr8DQ2eLr8vr/VQGjSf8JBgQDAgEBAAAAAAAAAQEBAu7GnoBpVkY2LiUdFg8KswGmJgAaBAMDAgIBAQEAAAAA//8A/wD/AP//AP8AAAEAAQEBRQKgGAAiBQUDAwICAgEBAQAAAAD/AP8AAAAAAAEBAQECAgID+AJTEQAZGAUFAwMCAQEBAAEAAAAAAAAAAAEBAQEBAQECAgIC0APFDAALEBcGBAMDAgEBAQAAAAAAAAAAAAAAAQEBAgICAwMHpwSLCgD3Dg8SCQQCAgIBAAABAAAAAAAAAAEBAQECAgMECA0OkgVwCAAOCAYLDAoEAwIBAQEAAAAAAAABAQABAQICBQgLCgkIdgbNBgD3AAYGCAgJBQICAQAAAAAAAAEAAAEBAgUIBwcGBgUFZgciBgD9/wACAgIEBQUDAgEAAAAAAAAAAgMFBQUEBAMDAgICtwihBAAE/f3+/wEAAAEBAQEBAQAAAAECAQEBAQAAAAD////+pggFBAD7/fz9/f7+/////wD//wAAAP//AAD///////7+/v7+dQcKBAD8/P39/v3///8AAP8AAAAAAAAAAP///////v///v79hwYVAwD8/f/+/f7+/v//AAAAAAAAAAAA/wAAAP/////+//7/0gVIAwD0+/z9//7/AP///wAAAAAAAAAAAAD/AAD//////v/+NwWeAgD8/f7+/v/+/v8AAAAAAAAAAAAAAAAA////AP////7/",rf="AAAAAAcAHgBVALwAYQFXAq8DfAXJB6EKDw4WEr8WCRzvIXAogi8VNxk/gEc8UDNZUGJ8a6N0r32Ohi6Pgpd/nw==",nf="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",Mn;function sr(){if(Mn)return Mn;let i=atob(tf)+atob(Af)+atob(af),e=new Float32Array(32*2177),t=0,A=0,a=new Uint8Array(32),r=0;for(let o=0;o<2177;o++){if(o===1088||o>=2113&&o<2145)continue;let s=r++*36;t=t+(i.charCodeAt(s)|i.charCodeAt(s+1)<<8)&65535,A=A+(i.charCodeAt(s+2)|i.charCodeAt(s+3)<<8)&65535;for(let l=0;l<32;l++){let c=a[l]+i.charCodeAt(s+4+l)&255;a[l]=c,e[o*32+l]=(t+(A-t)*c/255)/65535}}let n=atob(rf)+atob(nf);for(let o=0;o<1056;o++){let s=(n.charCodeAt(o*2)|n.charCodeAt(o*2+1)<<8)/65535,l=o<32?1088*32+o:2113*32+o-32;e[l]=s}return Mn=e,e}function In(i=!0,e=!1){return`
const OPENPBR_LOBE_FUZZ: i32 = 0;
const OPENPBR_LOBE_COAT: i32 = 1;
const OPENPBR_LOBE_METAL: i32 = 2;
const OPENPBR_LOBE_SPECULAR: i32 = 3;
const OPENPBR_LOBE_TRANSMISSION: i32 = 4;
const OPENPBR_LOBE_DIFFUSE: i32 = 5;
const OPENPBR_LOBE_SUBSURFACE: i32 = 6;
const OPENPBR_LOBE_COUNT: i32 = 7;

struct bj {
tangent: vec3f,
bitangent: vec3f,
normal: vec3f,
};

struct ag {
material: J,
basis: bj,
${i?`
coatBasis: bj,
directionFrames: bool,
`:""}
${e?"    coatViewLocal: vec3f,":""}
viewLocal: vec3f,
diffuseColor: vec3f,
specularEtaTOverEtaI: f32,
refractionEtaTOverEtaI: f32,
transmissionReflectionIor: f32,
thinFilmExteriorIor: f32,
thinFilmBaseIor: f32,
specularAlpha: f32,
diffuseSpecularEnergyCompensation: f32,
coatBaseScale: vec3f,
metalMsScale: vec3f,
metalMsFactor: f32,
metalMsProbability: f32,

dielectricMsReflectionScale: vec3f,
dielectricMsTransmissionScale: vec3f,
dielectricMsViewLoss: f32,
dielectricMsReflectionRatio: f32,
dielectricMsProbability: f32,

weights: array<f32, OPENPBR_LOBE_COUNT>,
probabilities: array<f32, OPENPBR_LOBE_COUNT>,
};

fn aw(color: vec3f) -> f32 {
return dot(color, vec3f(0.212671, 0.715160, 0.072169));
}

fn cV(bu: f32) -> f32 {
let value = (bu - 1.0) / (bu + 1.0);
return value * value;
}

fn aY(
bu: f32,
specularWeight: f32
) -> f32 {
let sJ = min(
cV(bu) * specularWeight,
0.9999
);
let sL = sqrt(sJ);
let kY = (1.0 + sL) / (1.0 - sL);
return select(kY, 1.0 / kY, bu < 1.0);
}

fn af(cc: f32, relativeIor: f32) -> f32 {
if (abs(relativeIor - 1.0) < 1e-6) {
return 0.0;
}
return cu(cc, relativeIor);
}

fn aC(ior: f32) -> f32 {
if (ior < 1.0) {
return 15.0 - ((1.0 / ior - 1.0) / 1.5) * 15.0;
}
return 16.0 + ((ior - 1.0) / 1.5) * 15.0;
}

fn F(sc: i32, row: i32) -> f32 {
return textureLoad(openPbrEnergyLut, vec2i(sc, row), 0).r;
}

fn fZ(
dI: f32,
bR: f32,
hN: f32
) -> f32 {
let bA = clamp(dI, 0.0, 31.0);
let aH = clamp(bR, 0.0, 31.0);
let bt = clamp(hN, 0.0, 31.0);
let dP = i32(floor(bA));
let aN = i32(floor(aH));
let cI = i32(floor(bt));
let hA = min(dP + 1, 31);
let cp = min(aN + 1, 31);
let eO = min(cI + 1, 31);
let cq = bA - f32(dP);
let cz = aH - f32(aN);
let kw = bt - f32(cI);

let ur = F(cI, dP * 32 + aN);
let us = F(eO, dP * 32 + aN);
let ut = F(cI, dP * 32 + cp);
let uw = F(eO, dP * 32 + cp);
let ux = F(cI, hA * 32 + aN);
let uy = F(eO, hA * 32 + aN);
let uz = F(cI, hA * 32 + cp);
let uA = F(eO, hA * 32 + cp);
let v00 = mix(ur, ux, cq);
let v01 = mix(us, uy, cq);
let v10 = mix(ut, uz, cq);
let v11 = mix(uw, uA, cq);
return mix(
mix(v00, v10, cz),
mix(v01, v11, cz),
kw
);
}

fn gz(dI: f32, bR: f32) -> f32 {
let bA = clamp(dI, 0.0, 31.0);
let aH = clamp(bR, 0.0, 31.0);
let dP = i32(floor(bA));
let aN = i32(floor(aH));
let hA = min(dP + 1, 31);
let cp = min(aN + 1, 31);
let cq = bA - f32(dP);
let cz = aH - f32(aN);
let v00 = F(aN, 1024 + dP);
let v01 = F(cp, 1024 + dP);
let v10 = F(aN, 1024 + hA);
let v11 = F(cp, 1024 + hA);
return mix(
mix(v00, v10, cq),
mix(v01, v11, cq),
cz
);
}



fn ef(
dI: f32,
bR: f32,
hN: f32
) -> f32 {
let bA = clamp(dI, 0.0, 31.0);
let aH = clamp(bR, 0.0, 31.0);
let bt = clamp(hN, 0.0, 31.0);
let dP = i32(floor(bA));
let aN = i32(floor(aH));
let cI = i32(floor(bt));
let hA = min(dP + 1, 31);
let cp = min(aN + 1, 31);
let eO = min(cI + 1, 31);
let cq = bA - f32(dP);
let cz = aH - f32(aN);
let kw = bt - f32(cI);

let ur = F(cI, ${1089} + dP * 32 + aN);
let us = F(eO, ${1089} + dP * 32 + aN);
let ut = F(cI, ${1089} + dP * 32 + cp);
let uw = F(eO, ${1089} + dP * 32 + cp);
let ux = F(cI, ${1089} + hA * 32 + aN);
let uy = F(eO, ${1089} + hA * 32 + aN);
let uz = F(cI, ${1089} + hA * 32 + cp);
let uA = F(eO, ${1089} + hA * 32 + cp);
let v00 = mix(ur, ux, cq);
let v01 = mix(us, uy, cq);
let v10 = mix(ut, uz, cq);
let v11 = mix(uw, uA, cq);
return mix(
mix(v00, v10, cz),
mix(v01, v11, cz),
kw
);
}

fn ee(dI: f32, bR: f32) -> f32 {
let bA = clamp(dI, 0.0, 31.0);
let aH = clamp(bR, 0.0, 31.0);
let dP = i32(floor(bA));
let aN = i32(floor(aH));
let hA = min(dP + 1, 31);
let cp = min(aN + 1, 31);
let cq = bA - f32(dP);
let cz = aH - f32(aN);
let v00 = F(aN, ${2113} + dP);
let v01 = F(cp, ${2113} + dP);
let v10 = F(aN, ${2113} + hA);
let v11 = F(cp, ${2113} + hA);
return mix(
mix(v00, v10, cq),
mix(v01, v11, cq),
cz
);
}

fn eF(dI: f32, bR: f32) -> f32 {
let bA = clamp(dI, 0.0, 31.0);
let aH = clamp(bR, 0.0, 31.0);
let dP = i32(floor(bA));
let aN = i32(floor(aH));
let hA = min(dP + 1, 31);
let cp = min(aN + 1, 31);
let cq = bA - f32(dP);
let cz = aH - f32(aN);
let v00 = F(aN, ${2145} + dP);
let v01 = F(cp, ${2145} + dP);
let v10 = F(aN, ${2145} + hA);
let v11 = F(cp, ${2145} + hA);
return mix(
mix(v00, v10, cq),
mix(v01, v11, cq),
cz
);
}

fn bO(ior: f32, alpha: f32, au: f32) -> f32 {
return ef(aC(ior), sqrt(alpha) * 31.0, au * 31.0);
}
fn cO(ior: f32, alpha: f32) -> f32 {
return ee(aC(ior), sqrt(alpha) * 31.0);
}
fn ch(ior: f32, alpha: f32) -> f32 {
return eF(aC(ior), sqrt(alpha) * 31.0);
}



fn bH(alpha: f32, au: f32) -> f32 {
let hZ = clamp(sqrt(alpha) * 31.0, 0.0, 31.0);
let bt = clamp(au * 31.0, 0.0, 31.0);
let r0 = i32(floor(hZ));
let c0 = i32(floor(bt));
let r1 = min(r0 + 1, 31);
let c1 = min(c0 + 1, 31);
return mix(
mix(F(c0, ${1056} + r0), F(c1, ${1056} + r0), fract(bt)),
mix(F(c0, ${1056} + r1), F(c1, ${1056} + r1), fract(bt)),
fract(hZ));
}

fn cv(alpha: f32) -> f32 {
let index = clamp(sqrt(alpha) * 31.0, 0.0, 31.0);
let i0 = i32(floor(index));
return mix(F(i0, ${1088}),
F(min(i0 + 1, 31), ${1088}), fract(index));
}

fn aX(value: f32, ior: f32) -> f32 {
if (ior > 2.5 || ior < 0.4) {
let tN = cV(2.5);
let progress = (cV(ior) - tN) / (1.0 - tN);
return (1.0 - progress) * value;
}
return value;
}

fn aJ(
ior: f32,
alpha: f32,
au: f32
) -> f32 {
let value = fZ(
aC(ior),
sqrt(alpha) * 31.0,
au * 31.0
);
return aX(value, ior);
}

fn cr(ior: f32, alpha: f32) -> f32 {
let value = gz(
aC(ior),
sqrt(alpha) * 31.0
);
return aX(value, ior);
}

fn openpbr_to_world(basis: bj, direction: vec3f) -> vec3f {
return direction.x * basis.tangent
+ direction.y * basis.bitangent
+ direction.z * basis.normal;
}

fn openpbr_to_local(basis: bj, direction: vec3f) -> vec3f {
return vec3f(
dot(direction, basis.tangent),
dot(direction, basis.bitangent),
dot(direction, basis.normal)
);
}

fn fg(
aU: vec3f,
normal: vec3f,
anisotropy: f32
) -> bj {
var basis: bj;
basis.normal = normal;
var tangent = aU;
var bitangent = vec3f(0.0);
if (dot(tangent, tangent) < 0.001 || anisotropy <= 0.0) {
aL(normal, &tangent, &bitangent);
}
else {
bitangent = normalize(cross(normal, tangent));
tangent = normalize(cross(bitangent, normal));
}
basis.tangent = tangent;
basis.bitangent = bitangent;
return basis;
}

fn jT(
av: f32,
ak: f32,
L: f32,
S: f32
) -> f32 {
return (av * L - ak * S)
/ (av * L + ak * S);
}

fn jS(
av: f32,
ak: f32,
L: f32,
S: f32
) -> f32 {
return (ak * L - av * S)
/ (av * S + ak * L);
}

fn gY(
av: f32,
ak: f32,
L: f32,
S: f32
) -> f32 {
return 2.0 * av * L
/ (av * L + ak * S);
}

fn gX(
av: f32,
ak: f32,
L: f32,
S: f32
) -> f32 {
return 2.0 * av * L
/ (av * S + ak * L);
}

fn aV(a: vec2f, b: vec2f) -> vec2f {
return vec2f(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

fn aZ(a: vec2f, b: vec2f) -> vec2f {
let ap = max(dot(b, b), 1e-9);
return vec2f(
(a.x * b.x + a.y * b.y) / ap,
(a.y * b.x - a.x * b.y) / ap
);
}

fn hT(value: vec2f) -> vec2f {
let nv = length(value);
let sH = sqrt(max(0.0, 0.5 * (nv + value.x)));
let fc = sqrt(max(0.0, 0.5 * (nv - value.x)));
return vec2f(sH, select(-fc, fc, value.y >= 0.0));
}

fn bX(
L: f32,
av: f32,
ak: vec2f,
qy: bool
) -> vec2f {
let oe = sqrt(max(0.0, 1.0 - L * L));
let sp = aZ(vec2f(av, 0.0), ak);
let hw = sp * oe;
var S = hT(
vec2f(1.0, 0.0) - aV(hw, hw)
);
if (aV(ak, S).y < 0.0) {
S = -S;
}

let fH = vec2f(av * L, 0.0);
let eA = aV(ak, S);
if (qy) {
let ci = ak * L;
let ce = S * av;
return aZ(
ci - ce,
ci + ce
);
}
return aZ(
fH - eA,
fH + eA
);
}

fn eq(
iD: f32,
gI: f32,
oy: f32,
mD: f32,
jY: vec2f,
phase: f32
) -> f32 {
let nd = vec2f(cos(phase), sin(phase));
let hW = aV(jY, nd);
let kF = hW * (gI * mD);
let ap = vec2f(1.0, 0.0) - hW * oy;
let hv = vec2f(iD, 0.0)
+ aZ(kF, ap);
return dot(hv, hv);
}

fn ar(
L: f32,
wavelength: f32,
cn: f32,
aM: f32,
ck: f32,
eu: vec2f
) -> f32 {
let dl = clamp(abs(L), 1e-5, 1.0);
let hq = pow(aM / ck, 2.0)
* (1.0 - dl * dl);
if (hq >= 1.0) {
return 1.0;
}
let cU = sqrt(1.0 - hq);
let kS = jT(
aM, ck, dl, cU
);
let kR = jS(
aM, ck, dl, cU
);
let jf = gY(
aM, ck, dl, cU
);
let je = gX(
aM, ck, dl, cU
);
let gk = ck * cU
/ max(aM * dl, 1e-9);
let phase = 2.0 * PI * (2.0 * ck * cn * cU) / wavelength;
var rT = 0.0;

for (var jX = 0u; jX < (rtUniform.loopUnrollGuard >> 1u); jX++) {
let iD = select(kS, kR, jX == 1u);
let gI = select(jf, je, jX == 1u);
let jY = bX(
cU, ck, eu, jX == 1u);
rT += eq(iD, gI,
-iD, gI * gk, jY, phase);
}
return clamp(0.5 * rT, 0.0, 1.0);
}




fn dT(au: f32, f0: vec3f, tint: vec3f) -> vec3f {
let ra = mix(f0, vec3f(1.0), aE(au));
if (all(tint == vec3f(1.0))) { return ra; }
let dj = 1.0 / 7.0;
let lZ = 1.0 - dj;
let fF = mix(f0, vec3f(1.0), aE(dj));
let dg = 1.0 - au;
let ql = au * aE(au) * dg
/ (dj * pow(lZ, 6.0));
return clamp(ra - ql * (fF - tint * fF), vec3f(0.0), vec3f(1.0));
}

fn cQ(f0: f32, tg: f32) -> vec2f {
let dM = clamp(f0, 0.0, 0.99);
let gH = sqrt(dM);
let qx = (1.0 - dM) / (1.0 + dM);
let qv = (1.0 + gH) / max(1.0 - gH, 1e-9);
let ior = mix(qv, qx, clamp(tg, 0.0, 1.0));
let jI = (
(ior + 1.0) * (ior + 1.0) * dM
- (ior - 1.0) * (ior - 1.0)
) / max(1.0 - dM, 1e-9);
return vec2f(ior, sqrt(max(jI, 0.0)));
}


fn bN(cn: f32, weight: f32) -> f32 {
return clamp(weight, 0.0, 1.0) * smoothstep(1e-9, 30.0, cn);
}



fn cE(
material: J,
color: vec3f,
viewLocal: vec3f,
lightLocal: vec3f,
fo: f32,
pdf: ptr<function, f32>
) -> vec3f {
*pdf = 0.0;
if (lightLocal.z <= 0.0) {
return vec3f(0.0);
}

let roughness = material.diffuseRoughness;
let gS = 0.5 - 2.0 / (3.0 * PI);
let nX = 2.0 / 3.0 - 28.0 / (15.0 * PI);
let os = lightLocal.z;
let mq = viewLocal.z;
let hL = dot(lightLocal, viewLocal) - os * mq;
let gP = select(
hL,
hL / max(max(os, mq), 1e-7),
hL > 0.0
);
let ig = 1.0 / (1.0 + gS * roughness);
let ni = color * INVPI * ig
* (1.0 + roughness * gP);

let dc = 1.0 - os;
let cP = 1.0 - mq;
let og = dc * (
0.0571085289 + dc * (
0.491881867 + dc * (
-0.332181442 + dc * 0.0714429953
)
)
);
let mZ = cP * (
0.0571085289 + cP * (
0.491881867 + cP * (
-0.332181442 + cP * 0.0714429953
)
)
);
let pm = (1.0 + roughness * og)
/ (1.0 + gS * roughness);
let ou = (1.0 + roughness * mZ)
/ (1.0 + gS * roughness);
let fQ = ig * (1.0 + nX * roughness);
let hB = color * color * fQ
/ max(vec3f(1e-7), vec3f(1.0) - color * (1.0 - fQ));
let ls = hB * INVPI
* max(1e-7, 1.0 - ou)
* max(1e-7, 1.0 - pm)
/ max(1e-7, 1.0 - fQ);
*pdf = lightLocal.z * INVPI;
return (ni + ls) * fo;
}

fn aO(viewCosine: f32, roughness: f32) -> f32 {
let x = clamp(viewCosine, 0.0, 1.0);
let y = clamp(roughness, 0.01, 1.0);
let scale = y * (0.0206607 + 1.58491 * y)
/ (0.0379424 + y * (1.32227 + y));
let mean = y * (-0.193854 + y * (-1.14885 + y * (1.7932 - 0.95943 * y * y)))
/ (0.046391 + y);
let offset = y * (0.000654023 + (-0.0207818 + 0.119681 * y) * y)
/ (1.26264 + y * (-1.92021 + y));
let gaussian = exp(-0.5 * pow((x - mean) / scale, 2.0))
/ (scale * sqrt(2.0 * PI));
return max(gaussian + offset, 0.0);
}

fn jR(
material: J,
viewLocal: vec3f,
lightLocal: vec3f,
pdf: ptr<function, f32>
) -> vec3f {
*pdf = 0.0;
if (viewLocal.z <= 0.0 || lightLocal.z <= 0.0) {
return vec3f(0.0);
}
let albedo = aO(
viewLocal.z,
material.fuzzRoughness
);
*pdf = lightLocal.z * INVPI;
return material.fuzzColor * albedo * INVPI;
}

fn am(
material: J,
viewLocal: vec3f,
lightLocal: vec3f,
V: vec3f,
cK: vec3f,
pdf: ptr<function, f32>
) -> vec3f {
*pdf = 0.0;
if (lightLocal.z <= 0.0) {
return vec3f(0.0);
}

let alpha = vec2f(material.alphaX, material.alphaY);
let distribution = gG(V, alpha);
let jO = bk(viewLocal, alpha);
let ea = jO
* bk(lightLocal, alpha);

*pdf = jO * distribution / (4.0 * max(viewLocal.z, 1e-8));
return cK * distribution * ea
/ (4.0 * max(lightLocal.z * viewLocal.z, 1e-8));
}

fn dk(
material: J,
relativeIor: f32,
tint: vec3f,
viewLocal: vec3f,
lightLocal: vec3f,
V: vec3f,
cK: vec3f,
pdf: ptr<function, f32>
) -> vec3f {
*pdf = 0.0;
if (lightLocal.z >= 0.0) {
return vec3f(0.0);
}

let kC = dot(lightLocal, V);
let bQ = dot(viewLocal, V);


if (bQ <= 0.0 || kC >= 0.0) {
return vec3f(0.0);
}
let alpha = vec2f(material.alphaX, material.alphaY);
let distribution = gG(V, alpha);
let jO = bk(viewLocal, alpha);
let ea = jO
* bk(lightLocal, alpha);
var ap = kC + bQ * relativeIor;
ap *= ap;
let pr = abs(kC) / max(ap, 1e-8);
let jo = relativeIor * relativeIor;

*pdf = jO * max(0.0, bQ) * distribution * pr
/ max(viewLocal.z, 1e-8);
return tint * (vec3f(1.0) - cK) * distribution * ea
* abs(bQ) * pr * jo
/ max(abs(lightLocal.z * viewLocal.z), 1e-8);
}

fn bn(material: J) -> vec3f {
if (HAS_MEDIUM && material.mediumType > 0) {
return vec3f(1.0);
}
return material.transmissionColor;
}

fn cS(ah: f32) -> f32 {
return 2.0 * ah / (1.0 + ah);
}

fn aP(
ah: vec3f,
transmissionWeight: f32
) -> vec3f {
let gg = 2.0 * ah
/ (vec3f(1.0) + ah);
return mix(
ah,
gg,
clamp(transmissionWeight, 0.0, 1.0)
);
}

fn bG(
material: J,
L: f32,
bu: f32
) -> vec3f {
let tint = bn(material);
if (!material.thinWalled) {
return tint;
}
let iG = max(0.0, 1.0 - L * L);
let dN = iG
/ max(bu * bu, 1e-9);
if (dN >= 1.0) {
return vec3f(0.0);
}
let S = sqrt(1.0 - dN);
return pow(max(tint, vec3f(0.0)), vec3f(1.0 / max(S, 1e-5)));
}

fn dL(
material: J,
viewLocal: vec3f,
lightLocal: vec3f,
pdf: ptr<function, f32>
) -> vec3f {
*pdf = 0.0;
if (viewLocal.z <= 0.0 || lightLocal.z >= 0.0) {
return vec3f(0.0);
}
let S = -lightLocal.z;
let nU = cu(
viewLocal.z,
material.relativeIor
);
*pdf = S * INVPI;
return vec3f(1.0 - nU) * INVPI;
}

fn dQ(prepared: ptr<function, ag>) {


let nu = min(OPENPBR_LOBE_COUNT, i32(rtUniform.loopUnrollGuard * 2u));
var total = (*prepared).probabilities[OPENPBR_LOBE_FUZZ];
for (var hQ = 1; hQ < nu; hQ++) {
total += (*prepared).probabilities[hQ];
}
if (total <= 1e-8) {
for (var hQ = 0; hQ < nu; hQ++) {
(*prepared).probabilities[hQ] = 0.0;
}
return;
}
let oj = 1.0 / total;
for (var hQ = 0; hQ < nu; hQ++) {
(*prepared).probabilities[hQ] *= oj;
}
}



fn bM(eta: f32) -> f32 {
if (abs(eta - 1.0) < 1e-6) { return 0.0; }
if (eta > 1.0) { return (eta - 1.0) / (4.08567 + 1.00071 * eta); }
return 0.997118 + 0.1014 * eta - 0.965241 * eta * eta - 0.130607 * eta * eta * eta;
}

fn bP(f0: vec3f, tint: vec3f) -> vec3f {
let dj = 1.0 / 7.0;
let fF = mix(f0, vec3f(1.0), aE(dj));
let b = fF * (vec3f(1.0) - tint) / (dj * pow(1.0 - dj, 6.0));
return clamp(f0 + (vec3f(1.0) - f0) / 21.0 - b / 126.0, vec3f(0.0), vec3f(1.0));
}



fn cD(material: J, au: f32) -> vec3f {
if (au <= 0.0) { return vec3f(1.0); }
let lu = sqrt(max(0.0, 1.0 - (1.0 - au * au) / (material.coatIor * material.coatIor)));
let tr = pow(max(material.coatColor, vec3f(0.0)), vec3f(0.5 / max(lu, 1e-5)));
return mix(vec3f(1.0), tr, material.coatWeight);
}

fn gj(material: J, au: f32) -> f32 {
if (material.coatRoughness <= ROUGHNESS_MIN) {
return af(au, 1.0 / material.coatIor);
}


return clamp(1.0 - aJ(material.coatIor,
material.coatRoughness * material.coatRoughness, au), 0.0, 1.0);
}

fn gW(prepared: ag) -> vec3f {
let material = prepared.material;
let dielectric = 1.0 - material.baseMetalness;
let opaque = dielectric * (1.0 - material.transmissionWeight) * (1.0 - material.subsurfaceWeight);
let sss = dielectric * (1.0 - material.transmissionWeight) * material.subsurfaceWeight;
let tZ = dielectric * material.transmissionWeight;
let fL = bM(prepared.specularEtaTOverEtaI);
let kL = bM(1.0 / prepared.transmissionReflectionIor);
let pJ = clamp(opaque * fL + (sss + tZ) * kL + material.baseMetalness, 0.0, 1.0);
let jk = mix(1.0, material.specularRoughness, pJ);
let ks = bM(material.coatIor);
let kr = 1.0 - (1.0 - ks) / (material.coatIor * material.coatIor);
let k = mix(ks, kr, jk);
let eb = material.baseMetalness * material.specularWeight * bP(material.baseWeight * material.baseColor, material.specularColor)
+ opaque * mix(material.baseWeight * material.baseColor, vec3f(1.0), fL)
+ sss * material.subsurfaceColor + vec3f(tZ);
let qL = vec3f(1.0 - k) / max(vec3f(1.0) - eb * k, vec3f(1e-6));
return mix(vec3f(1.0), qL, material.coatWeight * material.coatDarkening);
}

fn ds(prepared: ag, lb: f32) -> vec3f {
if (prepared.material.coatWeight <= 0.0) { return vec3f(1.0); }
if (prepared.material.inside) {

return cD(prepared.material, -lb);
}

return prepared.coatBaseScale * cD(prepared.material, lb);
}


${i?`
fn du(fallback: bj, tangent: vec3f, bitangent: vec3f, direction: vec2f) -> bj {
var t = tangent - fallback.normal * dot(fallback.normal, tangent);
if (dot(t, t) < 1e-8) { t = fallback.tangent; }
t = normalize(t);
let b = cross(fallback.normal, t) * select(1.0, -1.0, dot(cross(fallback.normal, t), bitangent) < 0.0);
t = t * direction.x + b * direction.y;
if (dot(t, t) < 1e-8) { return fallback; }
var basis = fallback;
basis.tangent = normalize(t);
basis.bitangent = normalize(cross(basis.normal, basis.tangent));
basis.tangent = normalize(cross(basis.bitangent, basis.normal));
return basis;
}

`:""}
fn eG(
tangent: vec3f,
material: J,
bF: vec3f,
normal: vec3f
) -> ag {
var prepared: ag;
prepared.material = material;
prepared.basis = fg(
tangent,
normal,
max(material.specularAnisotropy, material.coatAnisotropy)
);
${i?`
prepared.coatBasis = prepared.basis;
prepared.directionFrames = false;
${e?`


if (material.coatNormalEnabled) {
prepared.coatBasis = fg(material.geometryTangent, material.coatNormal, material.coatAnisotropy);
prepared.directionFrames = true;
}
`:""}
if (material.specularAnisotropy > 0.0 && material.anisotropyDirectionEnabled) {
prepared.basis = du(prepared.basis, material.directionTangent, material.directionBitangent, material.anisotropyDirection);
prepared.directionFrames = true;
}
if (material.coatAnisotropy > 0.0 && material.coatAnisotropyRotation != 0.0) {
prepared.coatBasis = du(prepared.coatBasis, material.geometryTangent, material.geometryBitangent, vec2f(cos(material.coatAnisotropyRotation), sin(material.coatAnisotropyRotation)));
prepared.directionFrames = true;
}
`:""}
prepared.viewLocal = openpbr_to_local(prepared.basis, bF);
${e?"    prepared.coatViewLocal = openpbr_to_local(prepared.coatBasis, bF);":""}
prepared.diffuseColor = material.baseColor;

let cB = 1.0 - material.baseMetalness;
let dK = cB
* (1.0 - material.transmissionWeight);
prepared.weights[OPENPBR_LOBE_FUZZ] = material.fuzzWeight;
prepared.weights[OPENPBR_LOBE_COAT] = material.coatWeight;
if (material.inside) { prepared.weights[OPENPBR_LOBE_COAT] = 0.0; }
prepared.weights[OPENPBR_LOBE_METAL] = material.baseMetalness;
prepared.weights[OPENPBR_LOBE_SPECULAR] = cB;
prepared.weights[OPENPBR_LOBE_TRANSMISSION] = cB
* material.transmissionWeight;
prepared.weights[OPENPBR_LOBE_DIFFUSE] = dK
* (1.0 - material.subsurfaceWeight) * material.baseWeight;
prepared.weights[OPENPBR_LOBE_SUBSURFACE] = dK
* material.subsurfaceWeight;

prepared.specularEtaTOverEtaI = aY(
1.0 / material.relativeIor,
material.specularWeight
);
prepared.material.relativeIor = 1.0 / prepared.specularEtaTOverEtaI;
prepared.refractionEtaTOverEtaI = prepared.specularEtaTOverEtaI;
prepared.transmissionReflectionIor = prepared.material.relativeIor;


if (material.coatWeight > 0.0) {
var cj = 1.0;
if (!material.inside) { cj = mix(1.0, material.coatIor, material.coatWeight); }
let bq = cj * aY(
material.specularIor / cj, material.specularWeight);
var er = bq / cj;
if (cj > bq && bq >= 1.0) {
er = 1.0 / er;
}
prepared.specularEtaTOverEtaI = er;
prepared.transmissionReflectionIor = 1.0 / er;
prepared.refractionEtaTOverEtaI = bq;
if (material.inside) {
prepared.refractionEtaTOverEtaI = 1.0 / bq;
prepared.transmissionReflectionIor = bq;
}
prepared.material.relativeIor = 1.0 / prepared.refractionEtaTOverEtaI;
}



prepared.thinFilmExteriorIor = 1.0;
prepared.thinFilmBaseIor = prepared.specularEtaTOverEtaI;
if (material.coatWeight > 0.0) {
if (material.inside) {
prepared.thinFilmExteriorIor = 1.0 / prepared.refractionEtaTOverEtaI;
prepared.thinFilmBaseIor = 1.0;
}
else {
prepared.thinFilmExteriorIor = mix(1.0, material.coatIor, material.coatWeight);
prepared.thinFilmBaseIor = prepared.refractionEtaTOverEtaI;
}
}
prepared.specularAlpha = material.specularRoughness
* material.specularRoughness;
let viewCosine = abs(prepared.viewLocal.z);
let ah = af(
viewCosine,
1.0 / prepared.specularEtaTOverEtaI
);
let ft = material.specularColor * select(
ah,
mix(
ah,
cS(ah),
material.transmissionWeight
),
material.thinWalled
);
let hR = material.specularWeight * dT(
viewCosine,
material.baseWeight * material.baseColor,
material.specularColor
);
let eL = select(
af(viewCosine, prepared.transmissionReflectionIor),
cS(af(viewCosine, prepared.transmissionReflectionIor)),
material.thinWalled
);
let gJ = bG(
material,
viewCosine,
prepared.refractionEtaTOverEtaI
);
let il = aJ(
prepared.specularEtaTOverEtaI,
prepared.specularAlpha,
viewCosine
);
let gm = cr(
prepared.specularEtaTOverEtaI,
prepared.specularAlpha
);
prepared.diffuseSpecularEnergyCompensation = il
/ max(gm, 1e-12);

prepared.probabilities[OPENPBR_LOBE_FUZZ] = prepared.weights[OPENPBR_LOBE_FUZZ]
* aw(material.fuzzColor)
* max(aO(
viewCosine,
material.fuzzRoughness
), 0.02);
prepared.probabilities[OPENPBR_LOBE_COAT] = 0.0;
prepared.coatBaseScale = vec3f(1.0);
if (material.coatWeight > 0.0 && !material.inside) {
${e?"let coatViewCosine = select(viewCosine, max(prepared.coatViewLocal.z, 0.0), material.coatNormalEnabled);":""}
let kt = gj(material, ${e?"coatViewCosine":"viewCosine"});
prepared.probabilities[OPENPBR_LOBE_COAT] = prepared.weights[OPENPBR_LOBE_COAT] * kt;
prepared.coatBaseScale = cD(material, ${e?"coatViewCosine":"viewCosine"})
* (1.0 - prepared.weights[OPENPBR_LOBE_COAT] * kt) * gW(prepared);
}
prepared.probabilities[OPENPBR_LOBE_METAL] = prepared.weights[OPENPBR_LOBE_METAL]
* aw(hR);
prepared.metalMsScale = vec3f(0.0);
prepared.metalMsFactor = 0.0;
prepared.metalMsProbability = 0.0;


if (material.specularRoughness >= 0.04 && prepared.weights[OPENPBR_LOBE_METAL] > 0.0) {
let hH = bP(material.baseWeight * material.baseColor, material.specularColor);
prepared.metalMsScale = material.specularWeight * hH * hH;
let pN = bH(prepared.specularAlpha, viewCosine);
prepared.metalMsFactor = pN / max(cv(prepared.specularAlpha), 1e-12);
let ff = prepared.weights[OPENPBR_LOBE_METAL] * aw(prepared.metalMsScale) * pN;
prepared.probabilities[OPENPBR_LOBE_METAL] += ff;
prepared.metalMsProbability = ff / max(prepared.probabilities[OPENPBR_LOBE_METAL], 1e-12);
}
prepared.probabilities[OPENPBR_LOBE_SPECULAR] = prepared.weights[OPENPBR_LOBE_SPECULAR]
* aw(ft);
prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] = prepared.weights[OPENPBR_LOBE_TRANSMISSION]
* (1.0 - eL)
* aw(gJ);






prepared.dielectricMsReflectionScale = vec3f(0.0);
prepared.dielectricMsTransmissionScale = vec3f(0.0);
prepared.dielectricMsViewLoss = 0.0;
prepared.dielectricMsReflectionRatio = 0.0;
prepared.dielectricMsProbability = 0.0;
if (!material.thinWalled && material.transmissionWeight > 0.0 &&
prepared.specularAlpha >= 0.0016 && prepared.weights[OPENPBR_LOBE_TRANSMISSION] > 0.0 &&
abs(prepared.refractionEtaTOverEtaI - 1.0) > 1e-6) {
let lt = prepared.weights[OPENPBR_LOBE_TRANSMISSION] + prepared.weights[OPENPBR_LOBE_SUBSURFACE];
prepared.dielectricMsReflectionScale = select(material.specularColor, vec3f(1.0), material.inside) * lt;
prepared.dielectricMsTransmissionScale = gJ * prepared.weights[OPENPBR_LOBE_TRANSMISSION]
+ vec3f(prepared.weights[OPENPBR_LOBE_SUBSURFACE]);
prepared.dielectricMsReflectionRatio = ch(prepared.refractionEtaTOverEtaI, prepared.specularAlpha);
prepared.dielectricMsViewLoss = bO(prepared.refractionEtaTOverEtaI, prepared.specularAlpha, viewCosine);
let nL = mix(prepared.dielectricMsTransmissionScale, prepared.dielectricMsReflectionScale, prepared.dielectricMsReflectionRatio);
let ff = aw(nL) * prepared.dielectricMsViewLoss;
prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] += ff;
prepared.dielectricMsProbability = ff / max(prepared.probabilities[OPENPBR_LOBE_TRANSMISSION], 1e-12);
}
prepared.probabilities[OPENPBR_LOBE_DIFFUSE] = prepared.weights[OPENPBR_LOBE_DIFFUSE]
* aw(prepared.diffuseColor)
* prepared.diffuseSpecularEnergyCompensation;
prepared.probabilities[OPENPBR_LOBE_SUBSURFACE] = prepared.weights[OPENPBR_LOBE_SUBSURFACE]
* (1.0 - eL)
* aw(material.subsurfaceColor)
* prepared.diffuseSpecularEnergyCompensation;


if (material.coatWeight > 0.0 && HAS_THIN_FILM && material.thinFilmWeight > 0.0) {
let kZ = 0.02 * bN(material.thinFilmThickness, material.thinFilmWeight);
prepared.probabilities[OPENPBR_LOBE_SPECULAR] = max(prepared.probabilities[OPENPBR_LOBE_SPECULAR], prepared.weights[OPENPBR_LOBE_SPECULAR] * kZ);
prepared.probabilities[OPENPBR_LOBE_METAL] = max(prepared.probabilities[OPENPBR_LOBE_METAL], prepared.weights[OPENPBR_LOBE_METAL] * material.specularWeight * kZ);
}
if (material.coatWeight > 0.0 && !material.inside) {
let gn = max(max(prepared.coatBaseScale.x, prepared.coatBaseScale.y), prepared.coatBaseScale.z);
prepared.probabilities[OPENPBR_LOBE_METAL] *= gn;
prepared.probabilities[OPENPBR_LOBE_SPECULAR] *= gn;
prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] *= gn;
prepared.probabilities[OPENPBR_LOBE_DIFFUSE] *= gn;
prepared.probabilities[OPENPBR_LOBE_SUBSURFACE] *= gn;
}
dQ(&prepared);
return prepared;
}


fn cR(prepared: ag, au: f32, reflection: bool) -> f32 {
if (prepared.material.coatWeight <= 0.0) {
return af(au, prepared.material.relativeIor);
}
let ki = af(au, prepared.transmissionReflectionIor);
if (!reflection) { return ki; }
let mX = af(au, 1.0 / prepared.specularEtaTOverEtaI);
let rH = prepared.material.transmissionWeight + (1.0 - prepared.material.transmissionWeight) * prepared.material.subsurfaceWeight;
return mix(mX, ki, rH);
}

fn mu(
prepared: ag,
lightDirection: vec3f,
gK: i32,
pdf: ptr<function, f32>
) -> vec3f {
let material = prepared.material;
let viewLocal = prepared.viewLocal;
let lightLocal = openpbr_to_local(prepared.basis, lightDirection);
let reflection = lightLocal.z * viewLocal.z > 0.0;
${e?`
let independentCoat = material.coatNormalEnabled;
let geometricReflection = dot(material.geometricNormal, lightDirection) > 0.0;
let coatLightCosine = dot(prepared.coatBasis.normal, lightDirection);
let coatReflection = geometricReflection && prepared.coatViewLocal.z > 0.0 && coatLightCosine > 0.0;
`:""}

var V: vec3f;
if (reflection) {
V = normalize(lightLocal + viewLocal);
}
else {
V = normalize(lightLocal + viewLocal * material.relativeIor);
}
if (V.z < 0.0) {
V = -V;
}

var response = vec3f(0.0);
*pdf = 0.0;
var aI = 0.0;
let lT = gK < 0;
let uG = lT || gK == OPENPBR_LOBE_FUZZ;
let sV = lT || gK == OPENPBR_LOBE_COAT;
let rY = lT || gK == OPENPBR_LOBE_METAL;
let pX = lT || gK == OPENPBR_LOBE_SPECULAR;
let jB = lT ||
gK == OPENPBR_LOBE_TRANSMISSION;
let ta = lT || gK == OPENPBR_LOBE_DIFFUSE;
let oL = lT ||
gK == OPENPBR_LOBE_SUBSURFACE;
let bQ = abs(dot(viewLocal, V));



var dd = V;
var ji = bQ;
if (!reflection && material.thinWalled) {
dd = normalize(vec3f(lightLocal.xy, -lightLocal.z) + viewLocal);
if (dd.z < 0.0) { dd = -dd; }
ji = abs(dot(viewLocal, dd));
}
let me =
(reflection && prepared.weights[OPENPBR_LOBE_SPECULAR] > 0.0 && pX) ||
(!reflection && prepared.weights[OPENPBR_LOBE_TRANSMISSION] > 0.0 && jB);
let qb = reflection && prepared.weights[OPENPBR_LOBE_METAL] > 0.0 && rY;
var np: array<vec3f, 2>;
if (me) {
np[0] = vec3f(cR(prepared, ji, reflection));
}
if (qb) {
np[1] = dT(bQ, material.baseWeight * material.baseColor, material.specularColor);
}
if (HAS_THIN_FILM && material.thinFilmWeight > 0.0) {
let wavelengths = vec3f(620.0, 540.0, 450.0);

for (var kK = 0u; kK < (rtUniform.loopUnrollGuard >> 1u); kK++) {
if (!select(me, qb, kK == 1u)) { continue; }
var wi = vec3f(0.0);
let L = select(ji, bQ, kK == 1u);
for (var channel = 0u; channel + 1u < rtUniform.loopUnrollGuard; channel++) {
var ior = vec2f(prepared.thinFilmBaseIor, 0.0);
if (kK == 1u) {
ior = cQ(material.baseWeight * material.baseColor[channel], material.specularColor[channel]);
}
wi[channel] = ar(L,
wavelengths[channel], material.thinFilmThickness, prepared.thinFilmExteriorIor, material.thinFilmIor, ior);
}
np[kK] = mix(np[kK], wi,
bN(material.thinFilmThickness, material.thinFilmWeight));
}
}
let ei = np[0];
let diffuseSpecularEnergyCompensation =
prepared.diffuseSpecularEnergyCompensation
* aJ(
prepared.specularEtaTOverEtaI,
prepared.specularAlpha,
abs(lightLocal.z)
);

${e?`

if (!independentCoat || (lightLocal.z != 0.0 && reflection == geometricReflection)) {
`:""}
if (reflection) {
if (prepared.weights[OPENPBR_LOBE_DIFFUSE] > 0.0 && ta) {
response += prepared.weights[OPENPBR_LOBE_DIFFUSE] * cE(
material,
prepared.diffuseColor,
viewLocal,
lightLocal,
diffuseSpecularEnergyCompensation,
&aI
);
*pdf += prepared.probabilities[OPENPBR_LOBE_DIFFUSE] * aI;
}

if (prepared.weights[OPENPBR_LOBE_SUBSURFACE] > 0.0 && material.thinWalled &&
oL) {
response += 0.5 * prepared.weights[OPENPBR_LOBE_SUBSURFACE] * cE(
material,
material.subsurfaceColor,
viewLocal,
lightLocal,
diffuseSpecularEnergyCompensation,
&aI
);
*pdf += prepared.probabilities[OPENPBR_LOBE_SUBSURFACE] * 0.5 * aI;
}

if (prepared.weights[OPENPBR_LOBE_SPECULAR] > 0.0 && pX) {
var ct = ei;
if (material.thinWalled) {
ct = aP(
ct,
material.transmissionWeight
);
}
let cK = material.specularColor * ct;
response += prepared.weights[OPENPBR_LOBE_SPECULAR] * am(
material,
viewLocal,
lightLocal,
V,
cK,
&aI
);
*pdf += prepared.probabilities[OPENPBR_LOBE_SPECULAR] * aI;
}

if (prepared.weights[OPENPBR_LOBE_METAL] > 0.0 && rY) {
let cK = material.specularWeight * np[1];
response += prepared.weights[OPENPBR_LOBE_METAL] * am(
material,
viewLocal,
lightLocal,
V,
cK,
&aI
);
if (prepared.metalMsFactor > 0.0) {
let dW = min(prepared.metalMsFactor * bH(prepared.specularAlpha, lightLocal.z), 1.0 / max(lightLocal.z, 1e-8));
response += prepared.weights[OPENPBR_LOBE_METAL] * prepared.metalMsScale * dW * INVPI;
aI = mix(aI, 0.5 * INVPI, prepared.metalMsProbability);
}
*pdf += prepared.probabilities[OPENPBR_LOBE_METAL] * aI;
}
}
else {
let cK = ei;
if (prepared.weights[OPENPBR_LOBE_TRANSMISSION] > 0.0 && jB) {
if (material.thinWalled) {
let kP = vec3f(lightLocal.xy, -lightLocal.z);
let gg = aP(
ei,
1.0
);
let tint = bG(
material,
abs(viewLocal.z),
prepared.refractionEtaTOverEtaI
);
response += prepared.weights[OPENPBR_LOBE_TRANSMISSION]
* am(
material,
viewLocal,
kP,
dd,
tint * (vec3f(1.0) - gg),
&aI
);
}
else {
response += prepared.weights[OPENPBR_LOBE_TRANSMISSION]
* dk(
material,
material.relativeIor,
bn(material),
viewLocal,
lightLocal,
V,
cK,
&aI
);
}
if (prepared.dielectricMsProbability > 0.0) {
aI *= 1.0 - prepared.dielectricMsProbability;
}
*pdf += prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] * aI;
}
if (prepared.weights[OPENPBR_LOBE_SUBSURFACE] > 0.0 && oL) {
if (material.thinWalled) {
let nW = vec3f(lightLocal.xy, -lightLocal.z);
response += 0.5 * prepared.weights[OPENPBR_LOBE_SUBSURFACE]
* cE(
material,
material.subsurfaceColor,
viewLocal,
nW,
diffuseSpecularEnergyCompensation,
&aI
);
aI *= 0.5;
}
else {
response += prepared.weights[OPENPBR_LOBE_SUBSURFACE] * dL(
material,
viewLocal,
lightLocal,
&aI
);
}
*pdf += prepared.probabilities[OPENPBR_LOBE_SUBSURFACE] * aI;
}
}




if (prepared.dielectricMsProbability > 0.0 && jB) {
let au = abs(lightLocal.z);
if (au > 0.0) {
let ior = select(1.0 / prepared.refractionEtaTOverEtaI, prepared.refractionEtaTOverEtaI, reflection);
let iV = select(1.0 - prepared.dielectricMsReflectionRatio, prepared.dielectricMsReflectionRatio, reflection);
let tj = prepared.dielectricMsViewLoss * bO(ior, prepared.specularAlpha, au)
/ max(cO(ior, prepared.specularAlpha), 1e-12);
let dW = min(tj * iV, 1.0 / au);
let scale = select(prepared.dielectricMsTransmissionScale, prepared.dielectricMsReflectionScale, reflection);
response += scale * dW * INVPI;
*pdf += prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] * prepared.dielectricMsProbability * iV * 0.5 * INVPI;
}
}

${e?"    } ":""}
if (material.coatWeight > 0.0) {
response *= ds(prepared, ${e?"select(lightLocal.z, coatLightCosine, independentCoat)":"lightLocal.z"});
}
${e?`

if (independentCoat) { response *= abs(lightLocal.z); }
`:""}

${i?`
if (${e?"select(reflection, coatReflection, independentCoat)":"reflection"} && prepared.weights[OPENPBR_LOBE_COAT] > 0.0) {
var dH = viewLocal;
var kv = lightLocal;
var gr = V;
var jF = bQ;
if (prepared.directionFrames) {
dH = ${e?"select(openpbr_to_local(prepared.coatBasis, openpbr_to_world(prepared.basis, viewLocal)), prepared.coatViewLocal, independentCoat)":"openpbr_to_local(prepared.coatBasis, openpbr_to_world(prepared.basis, viewLocal))"};
kv = openpbr_to_local(prepared.coatBasis, lightDirection);
gr = normalize(kv + dH);
if (gr.z < 0.0) { gr = -gr; }
jF = abs(dot(dH, gr));
}

let kX = vec3f(af(
jF,
1.0 / material.coatIor
));
var dG = material;
let jr = aK(material.coatRoughness, material.coatAnisotropy);
dG.alphaX = jr.x;
dG.alphaY = jr.y;
if (sV) {
response += prepared.weights[OPENPBR_LOBE_COAT]${e?" * select(1.0, max(coatLightCosine, 0.0), independentCoat)":""} * am(
dG,
dH,
kv,
gr,
kX,
&aI
);
*pdf += prepared.probabilities[OPENPBR_LOBE_COAT] * aI;
}
}
`:`
if (${e?"select(reflection, coatReflection, independentCoat)":"reflection"} && prepared.weights[OPENPBR_LOBE_COAT] > 0.0) {
let kX = vec3f(af(
bQ,
1.0 / material.coatIor
));
var dG = material;
let jr = aK(material.coatRoughness, material.coatAnisotropy);
dG.alphaX = jr.x;
dG.alphaY = jr.y;
if (sV) {
response += prepared.weights[OPENPBR_LOBE_COAT]${e?" * select(1.0, max(coatLightCosine, 0.0), independentCoat)":""} * am(
dG,
viewLocal,
lightLocal,
V,
kX,
&aI
);
*pdf += prepared.probabilities[OPENPBR_LOBE_COAT] * aI;
}
}
`}

if (${e?"select(reflection, geometricReflection, independentCoat)":"reflection"} && prepared.weights[OPENPBR_LOBE_FUZZ] > 0.0) {
let qr = aO(
abs(viewLocal.z),
material.fuzzRoughness
);
response *= max(
vec3f(0.0),
vec3f(1.0 - prepared.weights[OPENPBR_LOBE_FUZZ] * qr)
);
if (uG) {
response += prepared.weights[OPENPBR_LOBE_FUZZ]${e?" * select(1.0, max(lightLocal.z, 0.0), independentCoat)":""} * jR(
material,
viewLocal,
lightLocal,
&aI
);
*pdf += prepared.probabilities[OPENPBR_LOBE_FUZZ] * aI;
}
}

return response * ${e?"select(abs(lightLocal.z), 1.0, independentCoat)":"abs(lightLocal.z)"};
}

fn bI(
prepared: ag,
lightDirection: vec3f,
pdf: ptr<function, f32>
) -> vec3f {
return mu(prepared, lightDirection, -1, pdf);
}





fn qY(
tangent: vec3f,
material: J,
bF: vec3f,
normal: vec3f,
lightDirection: vec3f,
pdf: ptr<function, f32>
) -> vec3f {
let prepared = eG(
tangent,
material,
bF,
normal
);
return bI(prepared, lightDirection, pdf);
}





fn mY(
prepared: ag, cm: vec3f,
lightDirection: ptr<function, vec3f>, isTransmissionEvent: ptr<function, bool>,
aA: ptr<function, f32>, aT: ptr<function, bool>,
bE: ptr<function, bool>, aR: ptr<function, u32>
) -> bool {
let material = prepared.material;
let viewLocal = prepared.viewLocal;
var cy = cm.x;
let fp = cm.y;
let bm = cm.z;
*isTransmissionEvent = false;
*aA = 1.0;
*aT = false;
*bE = false;
*aR = u32(OPENPBR_LOBE_DIFFUSE);
*lightDirection = prepared.basis.normal;

var cdf: array<f32, OPENPBR_LOBE_COUNT>;
cdf[OPENPBR_LOBE_FUZZ] = prepared.probabilities[OPENPBR_LOBE_FUZZ];
let nu = min(OPENPBR_LOBE_COUNT, i32(rtUniform.loopUnrollGuard * 2u));
for (var hQ = 1; hQ < nu; hQ++) {
cdf[hQ] = cdf[hQ - 1] + prepared.probabilities[hQ];
}
if (cdf[OPENPBR_LOBE_SUBSURFACE] <= 0.0) {
return false;
}

var lightLocal: vec3f;
if (bm < cdf[OPENPBR_LOBE_FUZZ] || (
bm >= cdf[OPENPBR_LOBE_TRANSMISSION] && bm < cdf[OPENPBR_LOBE_DIFFUSE]
)) {
let pI = bm < cdf[OPENPBR_LOBE_FUZZ];
*aA = select(
1.0,
material.fuzzRoughness,
pI
);
*bE = !pI;
*aR = select(
u32(OPENPBR_LOBE_DIFFUSE),
u32(OPENPBR_LOBE_FUZZ),
pI
);
lightLocal = bi(vec2f(cy, fp));
}
${i?`
else if (bm < cdf[OPENPBR_LOBE_COAT]) {
*aA = material.coatRoughness;
*aT = true;
*aR = u32(OPENPBR_LOBE_COAT);
var dH = viewLocal;
if (prepared.directionFrames) { dH = ${e?"select(openpbr_to_local(prepared.coatBasis, openpbr_to_world(prepared.basis, viewLocal)), prepared.coatViewLocal, material.coatNormalEnabled)":"openpbr_to_local(prepared.coatBasis, openpbr_to_world(prepared.basis, viewLocal))"}; }
var V = aQ(
dH,

aK(material.coatRoughness, material.coatAnisotropy),
vec2f(cy, fp)
);
if (V.z < 0.0) {
V = -V;
}
lightLocal = normalize(reflect(-dH, V));
${e?`
if (material.coatNormalEnabled) {

*lightDirection = openpbr_to_world(prepared.coatBasis, lightLocal);
return lightLocal.z > 0.0 && dot(material.geometricNormal, *lightDirection) > 0.0;
}
`:""}
if (prepared.directionFrames) { lightLocal = openpbr_to_local(prepared.basis, openpbr_to_world(prepared.coatBasis, lightLocal)); }
}
`:`
else if (bm < cdf[OPENPBR_LOBE_COAT]) {
*aA = material.coatRoughness;
*aT = true;
*aR = u32(OPENPBR_LOBE_COAT);
var V = aQ(
viewLocal,

aK(material.coatRoughness, material.coatAnisotropy),
vec2f(cy, fp)
);
if (V.z < 0.0) {
V = -V;
}
lightLocal = normalize(reflect(-viewLocal, V));
}
`}
else if (bm < cdf[OPENPBR_LOBE_SPECULAR]) {
*aA = material.specularRoughness;
*aT = true;
*aR = select(
u32(OPENPBR_LOBE_SPECULAR),
u32(OPENPBR_LOBE_METAL),
bm < cdf[OPENPBR_LOBE_METAL]
);
let tm = bm < cdf[OPENPBR_LOBE_METAL];
let rE = (bm - cdf[OPENPBR_LOBE_COAT]) / max(prepared.probabilities[OPENPBR_LOBE_METAL], 1e-12);
if (tm && rE < prepared.metalMsProbability) {
let z = cy;
let fi = sqrt(max(0.0, 1.0 - z * z));
let br = TWOPI * fp;
lightLocal = vec3f(fi * cos(br), fi * sin(br), z);
}
else {
var V = aQ(
viewLocal,
vec2f(material.alphaX, material.alphaY),
vec2f(cy, fp)
);
if (V.z < 0.0) {
V = -V;
}
lightLocal = normalize(reflect(-viewLocal, V));
}
}
else if (bm < cdf[OPENPBR_LOBE_TRANSMISSION]) {
*aA = material.specularRoughness;
*aT = true;
*isTransmissionEvent = true;
*aR = u32(OPENPBR_LOBE_TRANSMISSION);


let uk = (bm - cdf[OPENPBR_LOBE_SPECULAR]) / max(prepared.probabilities[OPENPBR_LOBE_TRANSMISSION], 1e-12);
if (prepared.dielectricMsProbability > 0.0 && uk < prepared.dielectricMsProbability) {
let iV = prepared.dielectricMsReflectionRatio;
let lP = cy < iV;
var z: f32;
if (lP) { z = min(cy / iV, 0.99999994); }
else { z = -min((cy - iV) / (1.0 - iV), 0.99999994); }
let fi = sqrt(max(0.0, 1.0 - z * z));
let br = TWOPI * fp;
lightLocal = vec3f(fi * cos(br), fi * sin(br), z);
*isTransmissionEvent = !lP;
*aR = select(u32(OPENPBR_LOBE_TRANSMISSION), u32(OPENPBR_LOBE_SPECULAR), lP);
}
else {
var V = aQ(
viewLocal,
vec2f(material.alphaX, material.alphaY),
vec2f(cy, fp)
);
if (V.z < 0.0) {
V = -V;
}
if (material.thinWalled) {
let hV = normalize(reflect(-viewLocal, V));
lightLocal = vec3f(hV.xy, -hV.z);
}
else {
lightLocal = refract(
-viewLocal,
V,
prepared.material.relativeIor
);
if (dot(lightLocal, lightLocal) <= 1e-8) {
*isTransmissionEvent = false;
return false;
}
lightLocal = normalize(lightLocal);
}
}
}
else {
*aA = 1.0;
*bE = true;
*isTransmissionEvent = true;
*aR = u32(OPENPBR_LOBE_SUBSURFACE);
if (material.thinWalled) {
let pL = cy >= 0.5;
if (pL) {
cy = (cy - 0.5) * 2.0;
}
else {
cy *= 2.0;
}
lightLocal = bi(vec2f(cy, fp));
if (pL) {
lightLocal.z = -lightLocal.z;
}
else {
*isTransmissionEvent = false;
}
}
else {
lightLocal = bi(vec2f(cy, fp));
lightLocal.z = -lightLocal.z;
}
}

*lightDirection = openpbr_to_world(prepared.basis, lightLocal);



if (lightLocal.z == 0.0 || (lightLocal.z < 0.0) != *isTransmissionEvent) {
return false;
}
${e?`
if (material.coatNormalEnabled &&
((dot(material.geometricNormal, *lightDirection) <= 0.0) != *isTransmissionEvent)) { return false; }
`:""}
return true;
}

fn dv(
prepared: ag,
cm: vec3f,
lightDirection: ptr<function, vec3f>,
pdf: ptr<function, f32>,
isTransmissionEvent: ptr<function, bool>,
aA: ptr<function, f32>,
aT: ptr<function, bool>,
bE: ptr<function, bool>,
aR: ptr<function, u32>,
ld: ptr<function, f32>,
gT: ptr<function, vec3f>
) -> vec3f {
*pdf = 0.0;
*ld = 0.0;
*gT = vec3f(0.0);




if (!prepared.material.thinWalled &&
abs(prepared.material.relativeIor - 1.0) <= 1e-6 &&
prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] >= 1.0 - 1e-6) {
*lightDirection = openpbr_to_world(
prepared.basis,
-prepared.viewLocal
);
let nB = bn(prepared.material)
* ds(prepared, ${e?"select(-prepared.viewLocal.z, dot(prepared.coatBasis.normal, *lightDirection), prepared.material.coatNormalEnabled)":"-prepared.viewLocal.z"});
*pdf = 1.0;
*ld = 1.0;
*gT = nB;
*isTransmissionEvent = true;
*aA = 0.0;
*aT = true;
*bE = false;
*aR = u32(OPENPBR_LOBE_TRANSMISSION);
return nB;
}
if (!mY(prepared, cm, lightDirection,
isTransmissionEvent, aA, aT,
bE, aR)) { return vec3f(0.0); }
let response = bI(prepared, *lightDirection, pdf);
*ld = *pdf;
*gT = response;
return response;
}

fn sB(
tangent: vec3f,
material: J,
cm: vec3f,
bF: vec3f,
normal: vec3f,
lightDirection: ptr<function, vec3f>,
pdf: ptr<function, f32>,
isTransmissionEvent: ptr<function, bool>,
aA: ptr<function, f32>,
aT: ptr<function, bool>,
bE: ptr<function, bool>,
aR: ptr<function, u32>,
ld: ptr<function, f32>
) -> vec3f {
let prepared = eG(
tangent,
material,
bF,
normal
);
var gT = vec3f(0.0);
return dv(
prepared,
cm,
lightDirection,
pdf,
isTransmissionEvent,
aA,
aT,
bE,
aR,
ld,
&gT
);
}`}var og=In();var Do=`




fn aQ(view: vec3f, alpha: vec2f, samplePoint: vec2f) -> vec3f {
let rc = vec3f(alpha, 1.0);
let gf = normalize(rc * view);
let ua = min(gf.z, 1.0);
let qH = 1.0 + ua;
let qX = (1.0 - samplePoint.y) * qH;
let rJ = samplePoint.y * qH;
let sA = qX + (1.0 - ua);
let fi = sqrt(max(0.0, sA * rJ));
let br = TWOPI * samplePoint.x;
let lw = vec3f(
gf.x + fi * cos(br),
gf.y + fi * sin(br),
qX
);
return normalize(rc * lw);
}

fn gG(od: vec3f, alpha: vec2f) -> f32 {
let hm = vec3f(
od.x / alpha.x,
od.y / alpha.y,
od.z
);
let ap = dot(hm, hm);
return 1.0 / (
PI * alpha.x * alpha.y * ap * ap
);
}

fn bk(direction: vec3f, alpha: vec2f) -> f32 {
let eE = abs(direction.z);
if (eE <= 1e-8) {
return 0.0;
}
let hY = alpha * direction.xy;
let lA = dot(hY, hY)
/ (eE * eE);
return 2.0 / (1.0 + sqrt(1.0 + lA));
}

fn aE(au: f32) -> f32 {
let dg = clamp(1.0 - au, 0.0, 1.0);
return pow(dg, 5.0);
}

fn cu(L: f32, cJ: f32) -> f32 {
let iu = clamp(abs(L), 0.0, 1.0);
let ke = cJ * cJ
* max(0.0, 1.0 - iu * iu);
if (ke >= 1.0) {
return 1.0;
}

let lK = sqrt(max(0.0, 1.0 - ke));
let ba = (iu - cJ * lK)
/ max(iu + cJ * lK, 1e-8);
let pw = (cJ * iu - lK)
/ max(cJ * iu + lK, 1e-8);
return 0.5 * (
ba * ba + pw * pw
);
}

fn gd(samplePoint: vec2f) -> vec2f {
let offset = 2.0 * samplePoint - vec2f(1.0);
if (offset.x == 0.0 && offset.y == 0.0) {
return vec2f(0.0);
}

var radius: f32;
var angle: f32;
if (abs(offset.x) > abs(offset.y)) {
radius = offset.x;
angle = 0.25 * PI * (offset.y / offset.x);
}
else {
radius = offset.y;
angle = 0.5 * PI - 0.25 * PI * (offset.x / offset.y);
}
return radius * vec2f(cos(angle), sin(angle));
}

fn bi(samplePoint: vec2f) -> vec3f {
let kx = gd(samplePoint);
return vec3f(
kx,
sqrt(max(0.0, 1.0 - dot(kx, kx)))
);
}

fn aG(pi: f32, nD: f32) -> f32 {
let scale = max(pi, nD);
if (scale <= 0.0) {
return 0.0;
}
let normalized = vec2f(pi, nD) / scale;
let oG = normalized * normalized;
return oG.x / (oG.x + oG.y);
}

fn aL(
normal: vec3f,
tangent: ptr<function, vec3f>,
bitangent: ptr<function, vec3f>
) {
let ie = select(-1.0, 1.0, normal.z >= 0.0);
let dW = -1.0 / (ie + normal.z);
let xy = normal.x * normal.y * dW;
*tangent = vec3f(
1.0 + ie * normal.x * normal.x * dW,
ie * xy,
-ie * normal.x
);
*bitangent = vec3f(
xy,
ie + normal.y * normal.y * dW,
-normal.y
);
}

fn ai(rgb: vec3f, wavelength: f32) -> vec3f {
if (wavelength == 0.0) {
return rgb;
}
if (wavelength > 600.0) {
return vec3f(rgb.r, 0.0, 0.0);
}
if (wavelength > 500.0) {
return vec3f(0.0, rgb.g, 0.0);
}
return vec3f(0.0, 0.0, rgb.b);
}

fn eK(
wavelength: f32,
hb: f32,
hk: f32,
qk: f32
) -> f32 {
if (wavelength == 0.0 || hk <= 0.0) {
return hb;
}

let FRAUNHOFER_C = 656.3;
let FRAUNHOFER_D = 587.6;
let FRAUNHOFER_F = 486.1;
let jK = 1.0 / (
1.0 / (FRAUNHOFER_F * FRAUNHOFER_F)
- 1.0 / (FRAUNHOFER_C * FRAUNHOFER_C)
);
let mT = max(qk / hk, 1e-6);
let qI = (hb - 1.0) * jK / mT;
let td = hb
- qI / (FRAUNHOFER_D * FRAUNHOFER_D);
return td + qI / (wavelength * wavelength);
}

fn fl(
gu: vec3f,
anisotropy: f32,
samplePoint: vec2f
) -> vec3f {
var au: f32;
if (abs(anisotropy) < 0.001) {
au = 1.0 - 2.0 * samplePoint.y;
}
else {
let iV = (1.0 - anisotropy * anisotropy)
/ (1.0 + anisotropy - 2.0 * anisotropy * samplePoint.y);
au = (
iV * iV - 1.0 - anisotropy * anisotropy
) / (2.0 * anisotropy);
}

let tW = sqrt(max(0.0, 1.0 - au * au));
let br = TWOPI * samplePoint.x;
var tangent: vec3f;
var bitangent: vec3f;
aL(gu, &tangent, &bitangent);
return tangent * (tW * cos(br))
+ bitangent * (tW * sin(br))
+ gu * au;
}

fn bD(au: f32, anisotropy: f32) -> f32 {
let ap = 1.0 + anisotropy * anisotropy
+ 2.0 * anisotropy * au;
return INV4PI * (1.0 - anisotropy * anisotropy)
/ (ap * sqrt(ap));
}
`;var So=`




const SHADOW_CATCHER_LIGHT_SAMPLES = 4u;

fn sampleShadowCatcher(si: ad, bounce: i32, aa: ptr<function, Path>) {
let oK = -(*aa).ray.d;


if (rtUniform.lightChoiceCount > 0) {
var shadow = 0.0;
for (var candidate = 0u; candidate < SHADOW_CATCHER_LIGHT_SAMPLES; candidate++) {
var lightSample: LightSampleRec;
let lc = vec3f(fk(qV(candidate, 1u)), dz(qV(candidate, 0u)));
sampleLight(si.position, lc, &lightSample, false);
let lightDir = lightSample.direction;
let cosThetaL = dot(si.normal, lightDir);
let pv = dot(si.normal, oK) * cosThetaL;
if (lightSample.pdf > 0.0 && pv >= 0.0) {
var ray: Ray;
iw(&ray, si.position + EPS * lightDir, lightDir);
if (ex(ray, lightSample.dist - EPS, si.triangleIndex)) {
shadow += 1.0;
}
}
}

(*aa).alpha = shadow / f32(SHADOW_CATCHER_LIGHT_SAMPLES);
}
(*aa).fromEye = false;
}
`;var To=`

fn textureLinear(tex: texture_2d<f32>, _uv: vec2f) -> vec4f {



let size = vec2f(textureDimensions(tex, 0));

let wF = _uv * size - vec2f(0.5);
let vM = floor(wF);
let f = fract(wF);
let vL = vec2i(vM);
let maximum = vec2i(size) - vec2i(1);


let s1 = textureLoad(tex, clamp(vL + vec2i(0, 0), vec2i(0), maximum), 0);
let s2 = textureLoad(tex, clamp(vL + vec2i(1, 0), vec2i(0), maximum), 0);
let s3 = textureLoad(tex, clamp(vL + vec2i(0, 1), vec2i(0), maximum), 0);
let s4 = textureLoad(tex, clamp(vL + vec2i(1, 1), vec2i(0), maximum), 0);

return mix(mix(s1, s2, f.x), mix(s3, s4, f.x), f.y);

}

fn aS(gc: vec3f) -> vec2f {
var phi = atan2(-gc.z, -gc.x);
if (phi < 0.0) {
phi += TWOPI;
}
let theta = acos(gc.y);
return vec2f(phi * 0.5 * INVPI, theta * INVPI);
}

fn qt(u: f32, vOffset: ptr<function, i32>, pdf: ptr<function, vec2f>) -> f32 {
let size = vec2i(textureDimensions(envMap, 0));

var left = 0;
var right = size.y + 1; 
while (left < right) {
let mid = (left + right) >> 1;
let s = textureLoad(envMapDistribution, vec2i(0, mid), 0).x;
if (s <= u) {
left = mid + 1;
} else {
right = mid;
}
}
*vOffset = left - 1;



let s0 = textureLoad(envMapDistribution, vec2i(0, *vOffset), 0).xy;
let s1 = textureLoad(envMapDistribution, vec2i(0, *vOffset + 1), 0).xy;

(*pdf).y = s0.y;

return (f32(*vOffset) +  (u - s0.x) / (s1.x - s0.x)) / f32(size.y);
}

fn qs(u: f32, vOffset: i32, pdf: ptr<function, vec2f>) -> f32 {
let size = vec2i(textureDimensions(envMap, 0));

var left = 0;
var right = size.x + 1; 
while (left < right) {
let mid = (left + right) >> 1;
let s = textureLoad(envMapDistribution, vec2i(1 + mid, vOffset), 0).x;
if (s <= u) {
left = mid + 1;
} else {
right = mid;
}
}
let oJ = left - 1;



let s0 = textureLoad(envMapDistribution, vec2i(1 + oJ, vOffset), 0).xy;
let s1 = textureLoad(envMapDistribution, vec2i(1 + oJ + 1, vOffset), 0).xy;

(*pdf).x = s0.y;

return (f32(oJ) + (u - s0.x) / (s1.x - s0.x)) / f32(size.x);
}


fn oD(random: vec2f, uv: ptr<function, vec2f>, pdf: ptr<function, f32>) -> vec3f {
var gZ: vec2f;
var vOffset: i32;

(*uv).y = qt(random.x, &vOffset, &gZ);
(*uv).x = qs(random.y, vOffset, &gZ);

let phi = (*uv).x * TWOPI;
let theta = (*uv).y * PI;
let cc = cos(theta);
let sinTheta = sin(theta);
let ue = cos(phi);
let um = sin(phi);

let dir = vec3f(-sinTheta * ue, cc, -sinTheta * um);

*pdf = gZ.x * gZ.y * INVPI2 / (2.0 * sinTheta);

return dir;
}

fn iv(_uv: vec2f) -> f32 {
let size = vec2f(textureDimensions(envMap, 0));

let sinTheta = sin(_uv.y * PI);

let vQ = vec2i(_uv * size);

let sD = textureLoad(envMapDistribution, vec2i(1 + vQ.x, vQ.y), 0).y;
let sE = textureLoad(envMapDistribution, vec2i(0, vQ.y), 0).y;

return sD * sE * INVPI2 / (2.0 * sinTheta);
}


`;var Ro=`

fn sphericalProjection(pos: vec3f) -> vec2f {
let n = normalize(pos);
let theta = atan2(n.x, n.z) / (2.0 * PI) + 0.5;
let phi = acos(n.y) / PI;
return vec2f(theta, 1.0 - phi);
}
fn iM(pos: vec3f, normal: vec3f) -> vec2f {
let dm = abs(normal);
var uv = vec2f(0.0);
if (dm.x > dm.y && dm.x > dm.z) {
uv = pos.yz;
} else if (dm.y > dm.x && dm.y > dm.z) {
uv = pos.xz;
} else {
uv = pos.xy;
}
return uv;
}




fn hz(pos: vec3f, normal: vec3f) -> vec2f {
let theta = atan2(pos.z, pos.x) / (2.0 * PI) + 0.5;
return vec2f(theta, pos.y);
}

fn gC(fh: i32, pos: vec3f, normal: vec3f) -> vec2f {
if (fh == ${Ke.triplanar}) {
return iM(pos, normal);
} else if (fh == ${Ke.spherical}) {
return sphericalProjection(pos);
} else if (fh == ${Ke.cylindrical}) {
return hz(pos, normal);
}
return vec2f(0.0);
}
`;var Zi=8;function Dn({hasDisplacement:i,hasAnisotropyDirections:e=!1,hasCoatNormals:t=!1,hasAlpha:A=!0,hasSceneAlpha:a=!0,blasLayoutMask:r=1}){e||=t;let n=A,s=`

${xo}

${wn({hasSceneAlpha:a,hasAnisotropyDirections:e,hasCoatNormals:t})}

${Ro}

${_n({hasSceneAlpha:a,hasAnisotropyDirections:e,hasCoatNormals:t})}

${xn({hasDisplacement:i,blasLayoutMask:r,hasAnisotropyDirections:e,hasCoatNormals:t})}
${Po}
${Cn}
${To}

${Do}
${In(e,t)}
${Io}


var<private> tE: u32 = 0u;



fn jQ() -> u32 {
return u32(max(rtUniform.directLightCandidates, 1));
}




fn ps(wI: u32) -> f32 {




if (SAMPLING_PATTERN == 2) { _ = rand(); }
let jW = bc.x + bc.y * u32(rtUniform.outputSize.x);
let key = aq(aq(jW, bd), rtUniform.sequenceSeed);
let dimension = aq(cF, wI) ^ 0xa511e9b3u;
return f32(eg(key ^ dimension) >> 8u) * (1.0 / 16777216.0);
}



fn tq(fd: f32, scatteringPdf: f32) -> f32 {
let aW = jQ();
if (aW <= 1u) {
return aG(fd, scatteringPdf);
}
let iF = f32(aW) * fd;
return iF /
max(iF + scatteringPdf, 1e-20);
}


fn fS(scatteringPdf: f32, fd: f32) -> f32 {
let aW = jQ();
if (aW <= 1u) {
return aG(scatteringPdf, fd);
}
let iF = f32(aW) * fd;
return scatteringPdf /
max(scatteringPdf + iF, 1e-20);
}

${yn(e,t)}
${So}


@group(3) @binding(0) var<storage, read_write> outColor: array<vec4f>;
@group(3) @binding(1) var<storage, read_write> outNormal: array<vec4f>;
@group(3) @binding(2) var<storage, read_write> outAlbedo: array<vec4f>;

${ri}
@group(3) @binding(3) var<storage, read_write> outShadowCatcher: array<ShadowCatcherAccumulation>;


fn hG(
ha: u32,
vp: vec3f,
normal: vec3f
) {
if (rtUniform.varianceMoments != 0) {
let value = dot(vp, luminance);
outNormal[ha] += vec4f(value * value, 0.0, 0.0, 1.0);
}
else {
outNormal[ha] += vec4f(normal, 1.0);
}
}



fn iN(ha: u32, value: f32) {
outShadowCatcher[ha].moments += vec4f(value, value * value, 0.0, 0.0);
}


struct RayTraceAuxiliary {

albedo: vec3f,
isShadowCatcher: bool,
normal: vec3f,
isBlank: bool,
}

fn dq(sF: vec3f, height: f32, radius: f32) -> f32 {
let fN = length(sF);
if (fN < 0.00001) {
return -radius;
}

let iC = radius * sF.y / fN;
let ij = -1.5 * height;
var ev: f32;
if (iC >= 0.0) {
ev = radius;
}
else if (iC < ij) {
ev = -height * fN / sF.y;
}
else {
let dW = 1.0
- iC * iC / (3.0 * ij * ij);
ev = radius * dW;
}
return fN - ev;
}

fn eQ(origin: vec3f, direction: vec3f) -> vec3f {
if (!USE_GROUNDED_BACKGROUND) {
return direction;
}
let params = rtUniform.groundedBackgroundParams;
let bY = normalize(direction);
let center = vec3f(
rtUniform.groundedBackgroundCenter.x,
params.z + params.x,
rtUniform.groundedBackgroundCenter.y
);
let bB = origin - center;
let eI = dot(bB, bY);
let ej = eI * eI
- dot(bB, bB) + params.y * params.y;
if (
ej <= 0.0
|| dq(bB, params.x, params.y) > 0.0
) {
return direction;
}

var cC = -eI + sqrt(ej);
if (cC <= 0.0) {
return direction;
}

let nE = bB + bY * cC;
if (nE.y >= 0.0) {
return normalize(nE);
}

if (bY.y < -0.00001 && params.y > 1.5 * params.x) {
let hP = (-params.x - bB.y) / bY.y;
let nq = bB + bY * hP;
let oc = (2.0 / 3.0)
* sqrt(params.y * params.y - 2.25 * params.x * params.x);
if (hP > 0.0 && length(nq.xz) <= oc) {
return normalize(nq);
}
}

var cN = 0.0;
for (var i = 0; i < 14; i++) {
let fe = (cN + cC) * 0.5;
let pt = bB + bY * fe;
if (dq(pt, params.x, params.y) > 0.0) {
cC = fe;
}
else {
cN = fe;
}
}
let hit = bB + bY * ((cN + cC) * 0.5);
return normalize(hit);
}

fn hD(ray: Ray) -> vec4f {
var bg = vec4f(0.0);
if (USE_BACKGROUND_MAP) {
let pT = eQ(ray.o, ray.d);
bg = textureLinear(backgroundMap, aS(pT));
}
else if (USE_BACKGROUND) {
bg = rtUniform.backgroundColor;
}
else if (USE_ENVMAP) {
bg = textureLinear(envMap, aS(ray.d));
}
return bg;
}

fn cW(ray: Ray, wavelength: f32) -> vec4f {
let bg = hD(ray);
if (SPECTRAL) {
return vec4f(ai(bg.rgb, wavelength), bg.a);
}
return bg;
}

fn bounce(uv: vec2f, aa: ptr<function, Path>, depth: ptr<function, i32>, si: ptr<function, ad>, ma: ptr<function, J>, outAux: ptr<function, RayTraceAuxiliary>) {
cF = u32(max(*depth, 0));
let matType = (*ma).materialType;
let isShadowCatcher = matType == SHADOW_CATCHER;
if (isShadowCatcher) {
if ((*aa).fromEye) {
(*si).hit = false;
}
else {



if (USE_ENVMAP) {
if ((*aa).isNextRefraction) {


let bg = cW(
(*aa).ray,
(*si).wavelength
);
let cT = select(fS((*aa).scatteringPdf,
iv(aS((*aa).ray.d)) * rtUniform.envLightPmf),
1.0, (*aa).scatteringIsDelta);
(*aa).li += cT * (*aa).beta * bg.rgb * bg.a;
(*aa).alpha = max((*aa).alpha, bg.a);
}
else {
let tJ = aS((*aa).ray.d);
var emission = textureLinear(envMap, tJ).rgb;
if (SPECTRAL) {
emission = ai(emission, (*si).wavelength);
}
(*aa).li += (*aa).beta * emission *
fS((*aa).scatteringPdf, iv(tJ));
}
}
else {
let bg = cW(
(*aa).ray,
(*si).wavelength
);
(*aa).li += (*aa).beta * bg.rgb * bg.a;
}
(*aa).abort = true;
return;
}
}
if (!(*si).hit) {



let bg = cW(
(*aa).ray,
(*si).wavelength
);
if ((*aa).fromEye) {

(*aa).li = (*aa).beta * bg.rgb * bg.a;
(*aa).alpha = bg.a;

(*outAux).isBlank = bg.a < 0.001 ||
(USE_BACKGROUND && !USE_BACKGROUND_MAP);
}
else {
let cam = hy(uv);
let mC = dot(cam.d, (*aa).ray.d) > 0.0;
if (rtUniform.transmissiveOutputAlphaMin < 1.0) {
if (mC) {
(*aa).alpha = max((*aa).alpha, bg.a);
} else {
(*aa).alpha = 1.0;
}
}
if (!USE_ENVMAP) {


if (mC) {


(*aa).li += (*aa).beta *
fS((*aa).scatteringPdf, 1.0) * bg.rgb;
}
}
}
(*aa).abort = true;
return;
}

var cH = false;
if ((matType == STANDARD || matType == UNLIT)) {
let alpha = clamp((*ma).alpha, 0.0, 1.0);

if (alpha < 1.0) {


if (alpha <= 0.0 || eo(3u) > alpha) {
cH = true;
}
}
if (!cH && rtUniform.transmissiveOutputAlphaMin < 1.0) {


let tP = max(1.0 - (*ma).transmissionWeight, 1.0 - pow(1.0 - rtUniform.transmissiveOutputAlphaMin, f32(*depth)));
(*aa).alpha = max(tP, (*aa).alpha);
}
if (!cH) {
tE = u32(max(*depth, 0));
lR(si, ma, aa);
}
else {


(*aa).ray.o = (*si).position + (*aa).ray.d * EPS;
}
}

if (!(*si).albedoSampled && !cH) {

if ((matType == STANDARD || matType == UNLIT)) {
if (!((*ma).transmissionWeight > 0.5 ||
((*ma).specularRoughness <= 0.02 && (*ma).baseMetalness > 0.98))) {
(*outAux).albedo = (*ma).baseColor;
(*outAux).normal = select(
(*si).normal,
-(*si).normal,
dot(
(*si).normal,
(*si).position - cameraUniform.viewInv[3].xyz
) > 0.0
);
(*si).albedoSampled = true;
}

if (*depth > 4) {
(*si).albedoSampled = true;
}
}
}


if (USE_RR) {
if (*depth >= RR_MAX && !cH) {
let oz = (*aa).beta;

let oo = max(max(oz.x, oz.y), oz.z);
let q: f32 = max(0.0, 1.0 - oo);
if (dz(cw(RUSSIAN_ROULETTE)) < q) {


(*aa).alpha = 1.0;
(*aa).abort = true;
}
else {
(*aa).beta /= 1.0 - q;
}
}
}
if ((*aa).abort) {
return;
}

cY((*aa).ray, si, *depth, true, (*aa).isNextRefraction);
eT(ma, (*si).materialIndex, (*si).uv, (*si).uv1, (*si).instanceIndex);

if (SPECTRAL) {

if ((*ma).transmissionWeight > 0.001) {
(*ma).specularIor = eK(
(*si).wavelength,
(*ma).specularIor,
(*ma).transmissionDispersionScale,
(*ma).dispersionAbbeNumber
);
}
}

if (cH) {
return;
}


var lightSample: LightSampleRec;
let hu = eo(3u) < (*ma).alpha;
for (var i = 0; i < rtUniform.lightsCount; i++) {

let light: Light = analyticLights[i];
let d = mo((*aa).ray, light, &lightSample);
lightSample.pdf *= light.selectionPmf;
let mt = (*si).hit && d > distance((*si).position, (*aa).ray.o);
if (d != INF && !(mt && hu)) {
let eW = fS((*aa).scatteringPdf, lightSample.pdf);
if (SPECTRAL) {
lightSample.emission = ai(lightSample.emission, (*si).wavelength);
}
(*aa).li += eW * (*aa).beta * lightSample.emission;
(*aa).alpha = 1.0;
(*aa).abort = true;
}
}

if (USE_ENVMAP) {
if (!((*si).hit && hu)) {
if ((*aa).isNextRefraction) {



let bg = cW(
(*aa).ray,
(*si).wavelength
);
let cT = select(fS((*aa).scatteringPdf,
iv(aS((*aa).ray.d)) * rtUniform.envLightPmf),
1.0, (*aa).scatteringIsDelta);
(*aa).li += cT * (*aa).beta * bg.rgb * bg.a;
(*aa).alpha = max((*aa).alpha, bg.a);
(*aa).abort = true;
return;
}
let _uv = aS((*aa).ray.d);
var emission = textureLinear(envMap, _uv).rgb;
let eW = fS(
(*aa).scatteringPdf,
iv(_uv) * rtUniform.envLightPmf
);
if (SPECTRAL) {
emission = ai(emission, (*si).wavelength);
}

if (!USE_BACKGROUND) {
(*aa).alpha = 1.0;
}
(*aa).li += (*aa).beta * emission * eW;
(*aa).abort = true;
}
}

*depth = *depth + 1;
}

fn hy(fD: vec2f) -> Ray {
let origin = cameraUniform.viewProjectionInv * vec4f(fD * 2.0 - 1.0, -1.0, 1.0);
let center = cameraUniform.viewProjectionInv * vec4f(fD * 2.0 - 1.0, 1.0, 1.0);
var cam: Ray;
iw(&cam, origin.xyz / origin.w, normalize(center.xyz * origin.w - origin.xyz * center.w));

return cam;
}


fn kp(radius: f32, xi: f32) -> vec2f {
var x = 0.25;
for (var ns = 0; ns < 10; ns++) {
let x2 = x * x;
let x3 = x2 * x;
let kG = 1.0 - x;
let value = 10.0 * x2 - 20.0 * x3 + 15.0 * x2 * x2 -
4.0 * x2 * x3 - xi;
let lY = 20.0 * x * kG * kG * kG;
if (abs(value) < 1e-6 || lY == 0.0) { break; }
x = clamp(x - value / lY, 0.0, 1.0);
}
let jj = x * radius;
return vec2f(jj, sqrt(max(radius * radius - jj * jj, 0.0)));
}

fn iO(radius: f32, gs: f32) -> f32 {
if (gs >= radius) { return 0.0; }
let nV = radius - gs;
return nV * nV * nV;
}


fn mi(source: ad, radius: f32) -> vec3f {
var geometricNormal = source.faceNormal;
if (dot(geometricNormal, source.vertexNormal) < 0.0) {
geometricNormal = -geometricNormal;
}
var tangent: vec3f;
var bitangent: vec3f;
aL(geometricNormal, &tangent, &bitangent);
var iB = vec3f(0.0);

for (var ia = 0; ia < BEVEL_SAMPLES; ia++) {
let oY = fk(CAMERA_BEVEL_BASE + u32(ia));
var cA = oY.x;
let ox = oY.y;
var di = geometricNormal;
var fE = tangent;
var ek = bitangent;
var ga = 0.5;
var hU = 0.25;
var gA = 0.25;
if (cA < 0.5) {
cA *= 2.0;
}
else if (cA < 0.75) {
let mA = di;
di = fE;
fE = mA;
ga = 0.25;
hU = 0.5;
cA = (cA - 0.5) * 4.0;
}
else {
let mA = di;
di = ek;
ek = mA;
ga = 0.25;
gA = 0.5;
cA = (cA - 0.75) * 4.0;
}

let gQ = kp(radius, ox);
let phi = TWOPI * cA;
let qn = gQ.x *
(cos(phi) * fE + sin(phi) * ek);
var ray: Ray;
iw(
&ray,
source.position + di * gQ.y + qn,
-di
);
var hit: ad;
iH(
ray,
&hit,
source.instanceIndex,
max(2.0 * gQ.y, EPS)
);
if (!hit.hit) { continue; }

let kH = ga * abs(dot(di, hit.faceNormal));
let mw = hU * abs(dot(fE, hit.faceNormal));
let jU = gA * abs(dot(ek, hit.faceNormal));
var weight = kH / max(
kH * kH + mw * mw +
jU * jU,
1e-8
);
weight *= iO(radius, distance(hit.position, source.position)) /
max(iO(radius, gQ.x), 1e-8);
iB += weight * hit.vertexNormal;
}

if (dot(iB, iB) <= 1e-12) { return source.normal; }
let jC = normalize(iB);
let result = source.normal + jC - source.vertexNormal;
if (dot(result, result) > 1e-12) { return normalize(result); }
return source.normal;
}

fn bw(uv: vec2f, si: ptr<function, ad>, ray: Ray, ma: ptr<function, J>, outAux: ptr<function, RayTraceAuxiliary>) -> vec4f {
var aa: Path;
aa.ray = ray;
aa.li = vec3f(0.0);
aa.alpha = select(1.0, 0.0, rtUniform.transmissiveOutputAlphaMin < 1.0);
aa.beta = vec3f(1.0);
aa.fromEye = true;
aa.scatteringPdf = 0.0;
aa.scatteringIsDelta = false;
aa.isNextRefraction = false;
aa.abort = false;

let rB = (*ma).transmissionWeight < 0.001 && (*ma).subsurfaceWeight < 0.001 && (*ma).alpha > 0.99;
let bounceLimit = max(rtUniform.bounces, 0);
var depth = 0;

for (var idx: i32 = 0; idx < min(bounceLimit * 3, ${20}); idx = idx + 1) {
if (rB && idx > bounceLimit) {
aa.abort = true;
}
if (aa.abort) {
break;
}
bounce(uv, &aa, &depth, si, ma, outAux);
}

return vec4f(aa.li, aa.alpha);
}

fn iz(uv: vec2f, si: ptr<function, ad>, ray: Ray, ma: ptr<function, J>, outAux: ptr<function, RayTraceAuxiliary>) -> vec4f {
${n?`let coverage = clamp((*ma).alpha, 0.0, 1.0);
if (!(*si).hit || ((*ma).materialType != STANDARD && (*ma).materialType != UNLIT) || coverage >= 1.0) {
return bw(uv, si, ray, ma, outAux);
}





var nN = ray;
nN.o = (*si).position + ray.d * (EPS * 0.02);
var dU = *si;
dU.albedoSampled = false;
cY(nN, &dU, 0, false, false);
var rj: J;
eT(&rj, dU.materialIndex, dU.uv, dU.uv1, dU.instanceIndex);
var gh = *outAux;
if (dU.hit && rj.materialType == STANDARD) {
gh.albedo = select(
rj.baseColor,
vec3f(1.0),
rj.transmissionWeight > 0.5
);
gh.normal = select(
dU.normal,
-dU.normal,
dot(
dU.normal,
dU.position - cameraUniform.viewInv[3].xyz
) > 0.0
);
dU.albedoSampled = rj.transmissionWeight > 0.5;
}
let back = bw(
uv, &dU, nN, &rj, &gh
);
if (coverage <= 0.0) {
*outAux = gh;
return back;
}

var tk = *si;
var uB = *ma;
uB.alpha = 1.0;
var iR = *outAux;
let qQ = bw(
uv, &tk, ray, &uB, &iR
);
(*outAux).albedo = mix(gh.albedo, iR.albedo, coverage);
let fR = mix(gh.normal, iR.normal, coverage);
(*outAux).normal = select(
vec3f(0.0),
normalize(fR),
dot(fR, fR) > 1e-12
);
(*outAux).isBlank = gh.isBlank && iR.isBlank;
(*outAux).isShadowCatcher = gh.isShadowCatcher && iR.isShadowCatcher;
return mix(back, qQ, coverage);`:"return bw(uv, si, ray, ma, outAux);"}
}



fn mn(uv: vec2f, ray: Ray, outAux: ptr<function, RayTraceAuxiliary>) -> vec4f {
var si: ad;
var ma: J;
si.albedoSampled = false;
si.mediumType = 0;
si.mediumExtinction = vec3f(0.0);
si.mediumScattering = vec3f(0.0);
si.mediumAnisotropy = 0.0;
si.barycentrics = vec2f(0.0);


cY(ray, &si, 0, false, false);
eT(&ma, si.materialIndex, si.uv, si.uv1, si.instanceIndex);

if (si.hit && ma.materialType == SHADOW_CATCHER) {
(*outAux).isShadowCatcher = true;


(*outAux).albedo = vec3f(1.0);
(*outAux).normal = select(si.normal, -si.normal, dot(si.normal, ray.d) > 0.0);
var aa: Path;
aa.ray = ray;
aa.fromEye = true;
sampleShadowCatcher(si, 0, &aa);



return vec4f(vec3f(1.0), aa.alpha);
}
else {
if (HAS_BEVEL && rtUniform.bevel != 0) {
if (ma.bevel > 0.0) {
si.normal = mi(si, ma.bevel);
}
}



if (si.hit && (ma.materialType == STANDARD || ma.materialType == UNLIT)) {
(*outAux).albedo = select(ma.baseColor, vec3f(1.0), ma.transmissionWeight > 0.5);
(*outAux).normal = select(
si.normal,
-si.normal,
dot(si.normal, si.position - cameraUniform.viewInv[3].xyz) > 0.0
);



si.albedoSampled = ma.transmissionWeight > 0.5;
}

(*outAux).isShadowCatcher = false;

if (SPECTRAL) {




let sI = array<f32, 3>(650.0, 510.0, 475.0);
var tH = vec3f(0.0);
var alpha = 0.0;
var jz = vec3f(0.0);
var jA = vec3f(0.0);
var rX = true;
var si2 = si;
var ma2 = ma;
let qD = s0;
let nJ = em;
let eh = rtUniform.dispersionWavelengths == 1;
let jH = si.hit &&
ma.transmissionWeight > 0.001 &&
ma.transmissionDispersionScale > 0.001;
let rW = select(3, 1, eh);
var lF = 0;
if (eh && jH) {


lF = min(i32(floor(dz(CAMERA_WAVELENGTH) * 3.0)), 2);
}
for (var i = 0; i < rW; i++) {



if (!eh) {
s0 = qD;
em = nJ;
cF = 0u;
}
si.wavelength = 0.0;
if (!eh || jH) {
si.wavelength = sI[select(i, lF, eh)];
ma.specularIor = eK(
si.wavelength,
ma.specularIor,
ma.transmissionDispersionScale,
ma.dispersionAbbeNumber
);
}
var dD: RayTraceAuxiliary;
if (eh) {
dD = *outAux;
} else {
dD.albedo = (*outAux).albedo;
dD.normal = (*outAux).normal;
dD.isBlank = false;
dD.isShadowCatcher = false;
}
let res = iz(uv, &si, ray, &ma, &dD);
if (eh) {
*outAux = dD;
let scale = select(1.0, 3.0, jH);
return vec4f(res.rgb * scale, res.a);
}
tH += res.rgb;
alpha = max(alpha, res.a);
jz += dD.albedo;
jA += dD.normal;
rX = rX && dD.isBlank;
si = si2;
ma = ma2;
}
(*outAux).albedo = jz / 3.0;
(*outAux).normal = jA / 3.0;
(*outAux).isBlank = rX;
return vec4f(tH, alpha);
}
else {
return iz(uv, &si, ray, &ma, outAux);
}
}
}

fn oC(ip: vec2f) -> vec2f {
let p = 2.0 * ip - 1.0;
let greater = abs(p.x) > abs(p.y);
let r = select(p.y, p.x, greater);
let theta = select(PI * (0.5 - 0.25 * p.x / p.y), 0.25 * PI * p.y / p.x, greater);
return r * vec2f(cos(theta), sin(theta));
}


@compute @workgroup_size(${Zi}, ${Zi}, 1)
fn main(@builtin(global_invocation_id) globalId: vec3u) {
let outputSize = rtUniform.outputSize;
let scaleOffset = rtUniform.scaleOffset;
var jitter = rtUniform.jitter;

let fD = globalId.xy * vec2u(scaleOffset.xy) + vec2u(scaleOffset.zw);
if (fD.x >= u32(outputSize.x) || fD.y >= u32(outputSize.y)) {
return;
}
let idx = fD.x + fD.y * u32(outputSize.x);

if (
rtUniform.adaptiveSampling != 0 &&
outNormal[idx].a >= textureLoad(
adaptiveSampleTargets,
vec2i(fD),
0
).r
) {
return;
}




let uv = (vec2<f32>(f32(fD.x), f32(fD.y)) + vec2f(0.5)) / outputSize;

bc = fD;
bd = u32(outNormal[idx].a) + rtUniform.sampleSequenceOffset;
cF = 0u; em = 0u;
if (SAMPLING_PATTERN == 0 || SAMPLING_PATTERN == 1) {
jitter = (fk(CAMERA_PIXEL) - 0.5) / outputSize;
}
ka(fD, i32(bd ^ eg(rtUniform.sequenceSeed)));
var cam = hy(uv + jitter);

if (cameraUniform.apertureRadius > 0.0) {

let eye = cameraUniform.viewInv[3].xyz;
let nY = -normalize(cameraUniform.viewInv[2].xyz);
let qq = eye + cam.d * (cameraUniform.focusDistance / dot(cam.d, nY));
let rC = cameraUniform.apertureRadius * oC(fk(CAMERA_LENS));
let origin = (cameraUniform.viewInv * vec4f(rC, 0.0, 1.0)).xyz;
let dir = normalize(qq - origin);
iw(&cam, origin, dir);
}

var outAux: RayTraceAuxiliary;
outAux.albedo = vec3f(0.0);
outAux.normal = vec3f(0.0);
outAux.isBlank = false;
outAux.isShadowCatcher = false;
var aF = mn(uv + jitter, cam, &outAux);



if (rtUniform.clamping > 0.0) {
let clamping = rtUniform.clamping;
aF = vec4(clamp(aF.rgb, -vec3f(clamping), vec3f(clamping)), aF.a);
}
if (!(aF.x < INF && aF.x > -EPS)) {
aF = vec4f(0.0, 0.0, 0.0, 1.0);
}

if (outAux.isShadowCatcher) {


let dn = hD(cam);
let pY = select(0.0, 1.0, dn.a >= 0.01);
let jq = vec4f(dn.rgb * dn.a, dn.a);


outShadowCatcher[idx].mask += vec4f(1.0, dn.a, pY, aF.a);
outShadowCatcher[idx].background += jq;
outColor[idx] += jq;
outAlbedo[idx] += vec4f(outAux.albedo, pY);
hG(idx, dn.rgb, outAux.normal);


let visibility = 1.0 - aF.a;
iN(idx, visibility * select(
1.0, dot(dn.rgb, luminance), dn.a >= 0.01
));
}
else {
if (HAS_SHADOW_CATCHER && outAux.isBlank && USE_BACKGROUND && !USE_BACKGROUND_MAP && rtUniform.backgroundColor.a >= 0.99999) {





outShadowCatcher[idx].background += aF;
outShadowCatcher[idx].mask.g += aF.a;
}
outColor[idx] += aF;
outAlbedo[idx] += vec4f(outAux.albedo, select(1.0, 0.0, outAux.isBlank));
hG(idx, aF.rgb, outAux.normal);
iN(idx, dot(aF.rgb, luminance));
}
}
`+bo,l={USE_BACKGROUND:1,USE_BACKGROUND_MAP:2,USE_GROUNDED_BACKGROUND:4};return s=s.replace(/\b(?:USE_BACKGROUND|USE_BACKGROUND_MAP|USE_GROUNDED_BACKGROUND)\b/g,c=>`((rtUniform.backgroundFlags & ${l[c]}) != 0)`),s=s.replace(new RegExp(`\\b(?:${Object.keys(fi).join("|")})\\b`,"g"),c=>`((rtUniform.sceneFeatureFlags & ${fi[c]}u) != 0u)`),s}var Uo=new WeakMap;function Sn(i){return i.distributionCacheKey??i.data}function or(i,e){return i===e?!0:!i||!e?!1:Sn(i)===Sn(e)&&i.width===e.width&&i.height===e.height&&(i.distributionCacheVersion??0)===(e.distributionCacheVersion??0)}function lr(i){let e=Sn(i),t=i.distributionCacheVersion??0,A=Uo.get(e);if(A&&A.width===i.width&&A.height===i.height&&A.version===t)return A.distribution;let a=i.data,r={width:i.width+2,height:i.height+1},n=of(r.width,r.height,2),o=Math.max(Math.floor(a.length/(i.width*i.height)),1),s=a instanceof Uint8Array||a instanceof Uint8ClampedArray?1/255:1,l=new Float32Array(i.width*i.height);for(let p=0;p<i.height;p++)for(let d=0;d<i.width;d++){let f=o*(p*i.width+d);l[p*i.width+d]=s*(.2126*a[f]+.7152*a[f+Math.min(1,o-1)]+.0722*a[f+Math.min(2,o-1)])}let c=(p,d)=>{let f=0;for(let m=-1;m<=1;m++){let g=Math.min(i.height-1,Math.max(0,d+m));for(let h=-1;h<=1;h++){let B=Math.min(i.width-1,Math.max(0,p+h));f=Math.max(f,l[g*i.width+B])}}return Math.max(f,1e-12)};for(let p=0;p<i.height;p++){let d=Math.sin(Math.PI*(p+.5)/i.height);for(let m=0;m<i.width;m++){let g=c(m,p)*d;n.set(m+2,p,0,n.get(m+1,p,0)+g/i.width),n.set(m+1,p,1,g)}let f=n.get(r.width-1,p,0);for(let m=1;m<n.width;m++)n.set(m,p,0,n.get(m,p,0)/f),n.set(m,p,1,n.get(m,p,1)/f);n.set(0,p+1,0,n.get(0,p,0)+f/i.height),n.set(0,p,1,f)}let u=n.get(0,n.height-1,0);for(let p=0;p<n.height;p++)n.set(0,p,0,n.get(0,p,0)/u),n.set(0,p,1,n.get(0,p,1)/u);return r.data=n.array,Uo.set(e,{width:i.width,height:i.height,version:t,distribution:r}),r}function of(i,e,t){let A=new Float32Array(t*i*e);return{set(a,r,n,o){A[t*(r*i+a)+n]=o},get(a,r,n){return A[t*(r*i+a)+n]},width:i,height:e,channels:t,array:A}}function ea(i){return Number.isFinite(i)?Math.min(16,Math.max(1,Math.round(i))):4}function ui(i){return Number.isFinite(i)?Math.min(32,Math.max(1,Math.round(i))):8}var Lo=`
struct OfflineAdaptiveParams {
width: u32,
height: u32,
tileSize: u32,
columns: u32,
rows: u32,
maxSamples: u32,
minSamples: u32,
hasPrevious: u32,
absoluteError: f32,
relativeError: f32,
confidence: f32,
_padding: f32,
}

@group(0) @binding(0) var<uniform> params: OfflineAdaptiveParams;
@group(0) @binding(1) var<storage, read> pilotColor: array<f32>;
@group(0) @binding(2) var<storage, read> pilotMoments: array<f32>;
@group(0) @binding(3) var<storage, read> previousVariance: array<f32>;
@group(0) @binding(4) var<storage, read_write> tileMeans: array<f32>;
@group(0) @binding(5) var<storage, read_write> tileVariances: array<f32>;
@group(0) @binding(6) var<storage, read_write> tileTargets: array<u32>;
@group(0) @binding(7) var targetTexture: texture_storage_2d<r32float, write>;

const LUMINANCE = vec3f(0.2126, 0.7152, 0.0722);

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) ui: vec3u) {
let tile = ui.x;
let tileCount = params.columns * params.rows;
if (tile >= tileCount) {
return;
}

let tileX = tile % params.columns;
let tileY = tile / params.columns;
let un = tileX * params.tileSize;
let uo = tileY * params.tileSize;
let wd = min(un + params.tileSize, params.width);
let wf = min(uo + params.tileSize, params.height);
var mO = 0.0;
var ja = 0.0;
var count = 0u;

for (var y = uo; y < wf; y++) {
for (var x = un; x < wd; x++) {
let fM = y * params.width + x;
let offset = fM * 4u;
let samples = pilotMoments[offset + 3u];
if (samples <= 0.0) {
continue;
}
let mean = dot(
vec3f(
pilotColor[offset],
pilotColor[offset + 1u],
pilotColor[offset + 2u]
),
LUMINANCE
) / samples;
let tD = pilotMoments[offset] / samples;
let oZ = max(tD - mean * mean, 0.0);
var variance = oZ;
if (samples > 1.0) {
variance = oZ * samples / (samples - 1.0);
}
mO += mean;
ja = max(ja, variance);
count += 1u;
}
}

let mean = mO / f32(max(count, 1u));
var oO = 0.0;
if (params.hasPrevious != 0u) {
oO = previousVariance[tile];
}
let sa = max(ja, oO);
let sY = params.absoluteError + params.relativeError * abs(mean);
let required = ceil(
params.confidence * params.confidence * sa /
max(sY * sY, 1e-16)
);
let targetSamples = u32(min(
f32(params.maxSamples),
max(f32(params.minSamples), required)
));

tileMeans[tile] = mean;


tileVariances[tile] = ja;
tileTargets[tile] = targetSamples;

for (var y = uo; y < wf; y++) {
for (var x = un; x < wd; x++) {
textureStore(
targetTexture,
vec2i(i32(x), i32(y)),
vec4f(f32(targetSamples), 0.0, 0.0, 0.0)
);
}
}
}
`;function Tn(i,e){return Number.isFinite(i)?Math.max(1,Math.round(i)):e}function lf(i,e,t,A,a,r){return!!i&&i.width===e&&i.height===t&&i.tileSize===A&&i.columns===a&&i.rows===r&&i.variance.length===a*r}function Oo(i,e,t){let A=Tn(i.maxSamples,1),a=Math.min(A,Tn(i.minSamples,Math.min(A,16))),r=Tn(i.tileSize,16),n=Math.ceil(e/r),o=Math.ceil(t/r);return{maxSamples:A,minSamples:a,tileSize:r,columns:n,rows:o,absoluteError:Math.max(i.absoluteError??.002,1e-8),relativeError:Math.max(i.relativeError??.03,0),confidence:Math.max(i.confidence??1.96,.01),previous:lf(i.previous,e,t,r,n,o)?i.previous:void 0}}var cr=Float32Array,vA=64,Rn=6;function dr(i){if(i instanceof Error)return i.message;if(typeof i=="string")return i;if(i&&typeof i=="object"&&"message"in i){let e=i.message;if(typeof e=="string"&&e.length>0)return e}return String(i)}function Fo(...i){return[...new Set(i.filter(e=>e!=null).map(dr).filter(Boolean))].join(`
`)}function Pt(){return typeof performance>"u"?Date.now():performance.now()}function uf(i){let e=1;for(let t=i.indexOf(`
`);t>=0;t=i.indexOf(`
`,t+1))e++;return e}function df(i){let e=2166136261;for(let t=0;t<i.length;t++)e=Math.imul(e^i.charCodeAt(t),16777619);return(e>>>0).toString(16).padStart(8,"0")}function pf(...i){return i.some(e=>/(?:compute )?library failed creation/i.test(dr(e)))}function mf(){let i=new ArrayBuffer(176),e={outputSize:new Float32Array(i,0,2),sampleCount:new Float32Array(i,8,1),scaleOffset:new Float32Array(i,16,4),lightsCount:new Int32Array(i,32,1),transmissiveOutputAlphaMin:new Float32Array(i,36,1),jitter:new Float32Array(i,40,2),backgroundColor:new Float32Array(i,48,4),groundedBackgroundParams:new Float32Array(i,64,4),groundedBackgroundCenter:new Float32Array(i,80,2),blasOffset:new Int32Array(i,88,1),isEmpty:new Int32Array(i,92,1),bevel:new Int32Array(i,96,1),dispersionWavelengths:new Int32Array(i,100,1),envLightPmf:new Float32Array(i,104,1),lightChoiceCount:new Int32Array(i,108,1),lightWeightTotal:new Float32Array(i,112,1),lightSamplingTextureWidth:new Int32Array(i,116,1),lightChoiceTexelOffset:new Int32Array(i,120,1),bounces:new Int32Array(i,124,1),varianceMoments:new Int32Array(i,128,1),adaptiveSampling:new Int32Array(i,132,1),clamping:new Float32Array(i,136,1),directLightCandidates:new Int32Array(i,140,1),backgroundFlags:new Int32Array(i,144,1),loopUnrollGuard:new Uint32Array(i,148,1),sceneFeatureFlags:new Uint32Array(i,152,1),sequenceSeed:new Uint32Array(i,156,1),zSobolLogSPP:new Uint32Array(i,160,1),sampleSequenceOffset:new Uint32Array(i,164,1)};return e.loopUnrollGuard[0]=4,e.bevel[0]=1,e.dispersionWavelengths[0]=3,{buffer:i,views:e}}function gf(i,e,t,A=[]){Gi(i);let a=i.length;a>vA&&console.warn(`Too many lights, only the first ${vA} lights will be used.`);let r=new Float32Array(a*Rn*4);function n(s,l){for(let c=0;c<3;c++)r[c+s*4]=l[c]}let o={DirectionalLight:1,SphereLight:2,RectLight:3,SpotLight:4};for(let s=0;s<a;s++){let l=i[s],c=l.color,u=l.intensity,p=s*Rn;n(p,l.position),r[p*4+3]=o[l.type];let d=l.type==="SpotLight"?ki(l):u;n(p+1,[c[0]*d,c[1]*d,c[2]*d]),l.type==="RectLight"?(r[(p+1)*4+3]=Fi(l),n(p+2,Li(l,0)),r[(p+2)*4+3]=l.spread,n(p+3,Li(l,1))):l.type==="SphereLight"?(r[(p+1)*4+3]=Ni(l),r[(p+2)*4+3]=l.radius):l.type==="SpotLight"?(r[(p+1)*4+3]=zi(l),n(p+2,Ui(l)),r[(p+2)*4+3]=l.radius,n(p+3,[Math.cos(l.outerAngle*Math.PI/180),Math.min(1,Math.max(0,1-l.innerAngle/l.outerAngle)),0])):l.type==="DirectionalLight"&&n(p+2,Ui(l)),r[(p+3)*4+3]=l.type==="SpotLight"?A[s]??-1:e[s]??-1,r[(p+4)*4]=t[s]??0,n(p+5,Oi(l).x)}return r}var Un=class{_device;_rayTracePipeline;_targetAspect=1;_width=0;_height=0;_meshes=[];_sceneEnvironment=new li;_rectLightTextures=new ci;_analyticLights=[];_iesProfileTexelOffsets=new Int32Array(0);_materialChanges=new si;_pendingMaterialUpdate;_materialData;_maxTextureArrayBytes=Bt;_pendingGeometryUpdates=new Set;_needsUpdateMeshData=!0;_needsUpdateMeshMembership=!1;_needsRefitTLAS=!1;_preparedMeshData;_membershipCache=new oi;_pendingMembershipData;_residentPreparedMeshData;_tlas;_meshSnapshot=[];_snapshotByMesh=new WeakMap;_residentSnapshotByMesh=new WeakMap;_dirtyTransformMeshes=new Set;_dirtyColorMeshes=new Set;_geometriesNeedRefit=new Set;_needsUpdateAnalyticLightsBuffer=!0;_activeTarget={};_targetOutputs=new Map;releaseTarget(e){let t=this._targetOutputs.get(e);if(t){this._targetOutputs.delete(e);for(let A of t.buffers)A.destroy();this._activeTarget===e&&(this._rayTraceBindGroups=void 0,this._needsUpdateBindGroups=!0)}}getTargetMemoryBytes(e){return this._targetOutputs.get(e)?.buffers.reduce((t,A)=>t+A.size,0)??0}useTarget(e){this._activeTarget=e;let t=this._targetOutputs.get(e);[this._outColorBuffer,this._outNormalBuffer,this._outAlbedoBuffer,this._outShadowCatcherBuffer]=t?.buffers??[],t?.bindGroup&&t.pipeline===this._rayTracePipeline&&this._rayTraceBindGroups?this._rayTraceBindGroups[3]=t.bindGroup:this._needsUpdateBindGroups=!0}_outColorBuffer;_outNormalBuffer;_outAlbedoBuffer;_outShadowCatcherBuffer;_uniforms;_rtUniform=mf();_mapInfoUniform;_attributeData;_attributeStride=0;_attributeOffsets=[];_attrBuffers;_materialsBuffer;_lightSamplingTexture;_lightSamplingTextureSize=[0,0];_lightDomainDiagnostics={environment:{count:0,weight:0,pmf:0},infinite:{count:0,weight:0,pmf:0},localAndEmissive:{count:0,weight:0,pmf:0}};_openPbrEnergyLut;_bvhBuffer;_instancesBuffer;_emissiveCache=new Wi;_lightChoices=new JA;_lightSamplingData;_lightSamplingScratch;_lightSamplingTriangleCount=-1;_emissiveTriangles=[];_analyticLightSelectionPmfs=[];_needsUpdateLightSamplingData=!0;_adaptiveSamplingTexture;_adaptiveSamplingTextureSize=[1,1];_offlineAdaptivePipeline;_offlineAdaptiveHistory;_mapsSampler;_maps;_envImageSource;_envTex;_envDistributionTex;_backgroundImageSource;_backgroundTex;_rayTracePipelineLayout;_rayTraceBindGroups;_blasLayoutMask=1;_compiledBlasLayoutMask=0;_compiledAnisotropyDirections=!1;_compiledCoatNormals=!1;_compiledHasAlpha=!0;_compiledSceneHasAlpha=!0;_alphaBlendStrategy="stochastic";_constants={USE_BACKGROUND:!1,USE_BACKGROUND_MAP:!1,USE_GROUNDED_BACKGROUND:!1,SAMPLING_PATTERN:0,BEVEL_SAMPLES:8};_prevPipelineConstants={};_prevDefinesCode="";_hasTransmission=!1;_hasShadowCatcher=!1;_hasDisplacement=!1;_bounces=-1;_bevelSamples=8;_directLightCandidates=4;_clamping;_transmissiveAlphaMin=1;_viewProjInv=Ue.create();_cameraWorld=Ue.create();_apertureRadius=0;_focusDistance=10;_needsUpdateBindGroups=!0;_computeShaderModule;_depthCompute;_depthTracePipeline;_depthPipeline;_shaderCache;_debugBVHBuffer;_isCompilingShader=!1;_shaderCompilationDiagnostics;_pipelineError;_bakePipelineConstants=!0;_failedPipelineSignature;constructor(e){this._device=e,this._shaderCache=new Ji(e),this._uniforms={cameraUniform:this._uniformBuffer(144),rtUniform:this._uniformBuffer(this._rtUniform.buffer.byteLength),analyticLights:this._uniformBuffer(vA*Rn*4*4)},this._mapInfoUniform=this._uniformBuffer(16),this._openPbrEnergyLut=e.createTexture({format:"r32float",label:"OpenPBR opaque dielectric energy compensation",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST,size:{width:32,height:2177}}),e.queue.writeTexture({texture:this._openPbrEnergyLut},sr(),{bytesPerRow:32*Float32Array.BYTES_PER_ELEMENT},{width:32,height:2177}),this._mapsSampler=e.createSampler({minFilter:"linear",magFilter:"linear",addressModeU:"clamp-to-edge",addressModeV:"clamp-to-edge"}),this._setBackgroundMap(void 0),this._adaptiveSamplingTexture=e.createTexture({format:"r32float",label:"Adaptive sample targets placeholder",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.STORAGE_BINDING,size:[1,1]}),e.queue.writeTexture({texture:this._adaptiveSamplingTexture},new Float32Array([Number.MAX_SAFE_INTEGER]),{bytesPerRow:4},[1,1])}getOutputBuffer(){return{color:this._outColorBuffer,normal:this._outNormalBuffer,albedo:this._outAlbedoBuffer,shadowCatcher:this._outShadowCatcherBuffer}}_ensureAdaptiveSamplingTexture(e,t){this._adaptiveSamplingTextureSize[0]===e&&this._adaptiveSamplingTextureSize[1]===t||(this._adaptiveSamplingTexture.destroy(),this._adaptiveSamplingTexture=this._device.createTexture({format:"r32float",label:"Adaptive sample targets",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.STORAGE_BINDING,size:[e,t]}),this._adaptiveSamplingTextureSize=[e,t],this._needsUpdateBindGroups=!0)}async prepareOfflineAdaptiveSampling(e){let t=this._width,A=this._height;if(!t||!A||!this._outColorBuffer||!this._outNormalBuffer)return;let a=Oo(e,t,A),{maxSamples:r,minSamples:n,tileSize:o,columns:s,rows:l,absoluteError:c,relativeError:u,confidence:p,previous:d}=a,f=s*l,m=f*Float32Array.BYTES_PER_ELEMENT,g=this._offlineAdaptiveHistory,h=!1,B;d&&g?.history===d?B=g.varianceBuffer:(B=this._device.createBuffer({label:d?"Offline previous tile variance upload":"Offline empty tile variance",size:d?m:Float32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),this._device.queue.writeBuffer(B,0,d?.variance??new Float32Array(1)),h=!0);let _=this._device.createBuffer({label:"Offline adaptive sampling parameters",size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),E=new ArrayBuffer(48);new Uint32Array(E,0,8).set([t,A,o,s,l,r,n,d?1:0]),new Float32Array(E,32,4).set([c,u,p,0]),this._device.queue.writeBuffer(_,0,E);let Q=this._device.createBuffer({label:"Offline tile mean luminance",size:m,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),w=this._device.createBuffer({label:"Offline current tile variance",size:m,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),x=this._device.createBuffer({label:"Offline tile sample targets",size:m,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),M=this._device.createBuffer({label:"Offline compact tile history readback",size:m*3,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});this._ensureAdaptiveSamplingTexture(t,A),this._offlineAdaptivePipeline??=await this._device.createComputePipelineAsync({label:"Offline adaptive sampling planner",layout:"auto",compute:{module:this._device.createShaderModule({label:"Offline adaptive sampling planner",code:Lo}),entryPoint:"main"}});let P=this._device.createBindGroup({label:"Offline adaptive sampling planner",layout:this._offlineAdaptivePipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:_}},{binding:1,resource:{buffer:this._outColorBuffer}},{binding:2,resource:{buffer:this._outNormalBuffer}},{binding:3,resource:{buffer:B}},{binding:4,resource:{buffer:Q}},{binding:5,resource:{buffer:w}},{binding:6,resource:{buffer:x}},{binding:7,resource:this._adaptiveSamplingTexture.createView()}]}),D=this._device.createCommandEncoder({label:"Offline adaptive sampling planner"}),V=D.beginComputePass({label:"Offline adaptive sampling planner"});V.setPipeline(this._offlineAdaptivePipeline),V.setBindGroup(0,P),V.dispatchWorkgroups(Math.ceil(f/64)),V.end(),D.copyBufferToBuffer(Q,0,M,0,m),D.copyBufferToBuffer(w,0,M,m,m),D.copyBufferToBuffer(x,0,M,m*2,m),this._device.queue.submit([D.finish()]);let $=!1;try{await M.mapAsync(GPUMapMode.READ);let v=M.getMappedRange(),U=new Float32Array(v,0,f).slice(),I=new Float32Array(v,m,f).slice(),N=new Uint32Array(v,m*2,f).slice(),q={width:t,height:A,tileSize:o,columns:s,rows:l,meanLuminance:U,variance:I,sampleTargets:N},O=n,te=0;for(let le=0;le<f;le++){let Le=N[le];O=Math.max(O,Le);let ge=le%s,xe=Math.floor(le/s),Be=Math.min(o,t-ge*o),oe=Math.min(o,A-xe*o);te+=Le*Be*oe}return this._offlineAdaptiveHistory={history:q,varianceBuffer:w},this._rtUniform.views.adaptiveSampling[0]=1,$=!0,g?.varianceBuffer!==w&&g?.varianceBuffer.destroy(),{maximumTarget:O,averageTarget:te/(t*A),history:q}}finally{M.mapState==="mapped"&&M.unmap(),M.destroy(),Q.destroy(),x.destroy(),_.destroy(),h&&B.destroy(),$||w.destroy()}}_createPipelineLayout(){let e=Array.from({length:4},(o,s)=>({binding:s,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}})),t=this._shaderCache.createBindGroupLayout({label:"Buffers",entries:e}),A=[{binding:0,visibility:GPUShaderStage.COMPUTE,sampler:{}},{binding:1,visibility:GPUShaderStage.COMPUTE,texture:{viewDimension:"2d-array"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:4,visibility:GPUShaderStage.COMPUTE,texture:{viewDimension:"2d",sampleType:"unfilterable-float"}},{binding:5,visibility:GPUShaderStage.COMPUTE,texture:{viewDimension:"2d",sampleType:"unfilterable-float"}},{binding:6,visibility:GPUShaderStage.COMPUTE,texture:{viewDimension:"2d",sampleType:"unfilterable-float"}},{binding:8,visibility:GPUShaderStage.COMPUTE,texture:{viewDimension:"2d",sampleType:"unfilterable-float"}},{binding:9,visibility:GPUShaderStage.COMPUTE,texture:{viewDimension:"2d",sampleType:"unfilterable-float"}},{binding:10,visibility:GPUShaderStage.COMPUTE,texture:{viewDimension:"2d",sampleType:"unfilterable-float"}}],a=this._shaderCache.createBindGroupLayout({label:"Textures",entries:A}),r=this._shaderCache.createBindGroupLayout({label:"Uniforms",entries:[...Array.from({length:Object.keys(this._uniforms).length},(o,s)=>({binding:s,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}))]}),n=this._shaderCache.createBindGroupLayout({label:"Ray Trace Out Buffers",entries:[...Array.from({length:4},(o,s)=>({binding:s,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}}))]});this._rayTracePipelineLayout=this._shaderCache.createPipelineLayout({label:"Ray Trace Pipeline Layout",bindGroupLayouts:[t,a,r,n]})}_updateGPUBuffer(e,t,A,a=200){let r=this._device,n=Math.max(A.byteLength,a);return(t==null||t.size<n)&&(this._needsUpdateBindGroups=!0,t&&t.destroy(),t=r.createBuffer({label:e,size:n,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC})),this._device.queue.writeBuffer(t,0,A.buffer),t}_uniformBuffer(e){return this._needsUpdateBindGroups=!0,this._device.createBuffer({size:e,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})}async updatePipeline(){if(this._isCompilingShader)return;this._isCompilingShader=!0;let e,t,A;try{this._needsUpdateMeshData?this._updateMeshData():this._needsUpdateMeshMembership&&this._updateMeshMembership(),this._pendingGeometryUpdates.size&&this._updateGeometryData(),this._needsRefitTLAS&&this._refitMeshInstances(),this._dirtyColorMeshes.size&&this._updateMeshColors(),this._pendingMaterialUpdate&&this._updateMaterialData(),this._needsUpdateLightSamplingData&&this._updateLightSamplingData();let a=this._device,r=this._constants;this._rtUniform.views.sceneFeatureFlags[0]=_o(r);let n=!!r.HAS_ALPHA_BLEND&&this._alphaBlendStrategy==="deterministic-source-over",o=!!r.HAS_ALPHA,s=JSON.stringify({constants:Object.keys(r).sort().map(w=>[w,r[w]]),hasDisplacement:this._hasDisplacement,hasAlpha:n,hasSceneAlpha:o,hasAnisotropyDirections:!!r.USE_ANISOTROPY_DIRECTIONS,hasCoatNormals:!!r.USE_COAT_NORMAL_FRAMES,blasLayoutMask:this._blasLayoutMask,bakePipelineConstants:this._bakePipelineConstants});if(e=s,s===this._failedPipelineSignature)return;this._pipelineError=void 0;let l=["NUM_MAPS","TLAS_STACK_SIZE","BLAS_STACK_SIZE","NUM_UNIFORM_LIGHTS"],c=[...Object.keys(fi),"USE_BACKGROUND","USE_BACKGROUND_MAP","USE_GROUNDED_BACKGROUND",...Cs,"USE_ANISOTROPY_DIRECTIONS","USE_COAT_NORMAL_FRAMES","COLOR_OFF","USE_VERTEX_COLOR","HAS_ALPHA_BLEND","HAS_ALPHA_MASK"],u=l.reduce((w,x)=>(w[x]=r[x],w),{}),p=Object.keys(r).sort().filter(w=>!l.includes(w)&&!c.includes(w)),d=l.map(w=>`const ${w} = ${u[w]};`).join(`
`),f=Object.keys(this._prevPipelineConstants).filter(w=>!l.includes(w)&&!c.includes(w)).sort(),m=!this._rayTracePipelineLayout||!this._computeShaderModule||p.join(",")!==f.join(",")||d!==this._prevDefinesCode||n!==this._compiledHasAlpha||o!==this._compiledSceneHasAlpha||!!r.USE_ANISOTROPY_DIRECTIONS!==this._compiledAnisotropyDirections||!!r.USE_COAT_NORMAL_FRAMES!==this._compiledCoatNormals||this._blasLayoutMask!==this._compiledBlasLayoutMask||this._bakePipelineConstants&&p.some(w=>r[w]!==this._prevPipelineConstants[w]),g=m||p.some(w=>r[w]!==this._prevPipelineConstants[w]);t=g?Pt():void 0;let h=0,B=0,_=this._shaderCompilationDiagnostics?.sourceBytes??0,E=this._shaderCompilationDiagnostics?.sourceLines??0,Q=this._shaderCompilationDiagnostics?.modules[0]?.sourceFingerprint??"";if(m){let w=Pt(),x=p.map(D=>`${this._bakePipelineConstants?"const":"override"} ${D} = ${r[D].toString()};`).join(`
`),M=`
${d}
${x}
${Dn({hasDisplacement:this._hasDisplacement,hasAlpha:n,hasSceneAlpha:o,hasAnisotropyDirections:!!r.USE_ANISOTROPY_DIRECTIONS,hasCoatNormals:!!r.USE_COAT_NORMAL_FRAMES,blasLayoutMask:this._blasLayoutMask})}`;_=M.length,E=uf(M),Q=df(M),h=Pt()-w;let P=Pt();this._computeShaderModule=this._shaderCache.createShaderModule({label:"Ray Trace",code:M}),B=Pt()-P,this._compiledHasAlpha=n,this._compiledSceneHasAlpha=o,this._compiledAnisotropyDirections=!!r.USE_ANISOTROPY_DIRECTIONS,this._compiledCoatNormals=!!r.USE_COAT_NORMAL_FRAMES,this._compiledBlasLayoutMask=this._blasLayoutMask}if(g){if(!this._rayTracePipelineLayout){a.pushErrorScope("validation");let x=!0;try{this._createPipelineLayout();let M=await a.popErrorScope();if(x=!1,M)throw M}catch(M){let P=x?await a.popErrorScope().catch(()=>null):null;this._rayTracePipelineLayout=void 0;let D=Fo(M,P);throw new Error(`Unable to create the ray tracing pipeline layout: ${D}`)}}this._prevPipelineConstants={...this._constants},this._prevDefinesCode=d,this._needsUpdateBindGroups=!0,a.pushErrorScope("validation");let w=!0;try{let x=this._bakePipelineConstants?void 0:p.reduce(($,v)=>($[v]=+this._constants[v],$),{}),M={label:"Ray Trace",entryPoint:"main",firstFrameRequired:!0,status:"compiling"};A=Pt(),M.startedAtMs=0,M.concurrentCompilationCount=1,this._shaderCompilationDiagnostics={status:"compiling",sourceBytes:_,sourceLines:E,pipelineCount:1,completedPipelineCount:0,sourceGenerationTimeMs:h,moduleCreationTimeMs:B,modules:[{label:"Ray Trace",sourceBytes:_,sourceLines:E,sourceFingerprint:Q}],pipelines:[{...M}],maximumConcurrentPipelineCount:1,peakConcurrentPipelineCount:1};let P;try{P=await this._shaderCache.createComputePipelineAsync({label:"Ray Trace",layout:this._rayTracePipelineLayout,compute:{module:this._computeShaderModule,entryPoint:"main",constants:x}}),M.status="ready"}catch($){M.status="failed",M.error=dr($);let U=((await this._computeShaderModule.getCompilationInfo().catch(()=>{}))?.messages??[]).filter(I=>I.type==="error");throw U.length?new Error(U.map(I=>`Ray Trace WGSL ${I.lineNum}:${I.linePos} ${I.message}`).join(`
`)):$}finally{M.endedAtMs=Pt()-A,M.durationMs=M.endedAtMs}this._rayTracePipeline=P,this._depthCompute={module:this._computeShaderModule,constants:x};let D=await a.popErrorScope();if(w=!1,D)throw D;let V=Pt();this._shaderCompilationDiagnostics={...this._shaderCompilationDiagnostics,status:"ready",completedPipelineCount:1,pipelines:[{...M}],pipelineCompilationTimeMs:V-A,totalTimeMs:V-t}}catch(x){let M=w?await a.popErrorScope().catch(()=>null):null,P=Fo(x,M);if(!this._bakePipelineConstants&&pf(x,M)){let D=Pt();this._shaderCompilationDiagnostics?.status==="compiling"&&(this._shaderCompilationDiagnostics={...this._shaderCompilationDiagnostics,status:"failed",pipelineCompilationTimeMs:A==null?void 0:D-A,totalTimeMs:t==null?void 0:D-t,error:P}),this._bakePipelineConstants=!0,this._rayTracePipeline=void 0,this._rayTraceBindGroups=void 0,this._computeShaderModule=void 0,this._prevPipelineConstants={},console.warn("WebGPU pipeline specialization failed; retrying with constants baked into WGSL.");return}throw new Error(P)}}this._needsUpdateBindGroups&&(this._needsUpdateBindGroups=!1,this._updateBindGroups()),this._failedPipelineSignature=void 0}catch(a){this._pipelineError=a;let r=Pt();this._shaderCompilationDiagnostics?.status==="compiling"&&(this._shaderCompilationDiagnostics={...this._shaderCompilationDiagnostics,status:"failed",pipelineCompilationTimeMs:A==null?void 0:r-A,totalTimeMs:t==null?void 0:r-t,error:dr(a)}),this._failedPipelineSignature=e,this._rayTracePipeline=void 0,this._rayTraceBindGroups=void 0,this._prevPipelineConstants={},this._needsUpdateBindGroups=!0,console.error("Failed to update WebGPU ray tracing pipeline.",a)}finally{this._isCompilingShader=!1}}async readDepthSamples(e,t){let A=this._rayTracePipeline,a=this._rayTraceBindGroups;if(!A||!a||!this._depthCompute||this._isCompilingShader)return;let r=$A(e,t??this._width/this._height);if(this._depthTracePipeline!==A||!this._depthPipeline){let p=this._shaderCache.createBindGroupLayout({label:"Depth query output",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),d=this._shaderCache.createPipelineLayout({label:"Depth query layout",bindGroupLayouts:[0,1,2].map(f=>A.getBindGroupLayout(f)).concat(p)});this._depthTracePipeline=A,this._depthPipeline=this._shaderCache.createComputePipelineAsync({label:"Depth query",layout:d,compute:{...this._depthCompute,entryPoint:"depthQuery",constants:{...this._depthCompute.constants,DEPTH_QUERY_MODE:1}}})}let n=await this._depthPipeline;if(A!==this._rayTracePipeline||a!==this._rayTraceBindGroups)return;let o=this._device,s=784,l=o.createBuffer({label:"Depth samples",size:s,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),c=o.createBuffer({label:"Depth readback",size:s,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),u=o.createBuffer({label:"Depth area",size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});try{o.queue.writeBuffer(u,0,r);let p=o.createBindGroup({layout:n.getBindGroupLayout(3),entries:[{binding:0,resource:{buffer:l}},{binding:4,resource:{buffer:u}}]}),d=o.createCommandEncoder({label:"Depth query"}),f=d.beginComputePass();f.setPipeline(n);for(let m=0;m<3;m++)f.setBindGroup(m,a[m]);return f.setBindGroup(3,p),f.dispatchWorkgroups(1),f.end(),d.copyBufferToBuffer(l,0,c,0,s),o.queue.submit([d.finish()]),await c.mapAsync(GPUMapMode.READ),Wa(new Float32Array(c.getMappedRange()))}finally{c.mapState==="mapped"&&c.unmap(),c.destroy(),l.destroy(),u.destroy()}}isCompilingShader(){return this._isCompilingShader}isPipelineReady(){return!!this._rayTracePipeline&&!!this._rayTraceBindGroups}getPipelineError(){return this._pipelineError}_updateBindGroups(){let{_device:e}=this,t=this._rayTracePipeline;if(!t)throw new Error("WebGPU ray tracing bind-group pipeline is not ready.");if(!this._bvhBuffer||!this._instancesBuffer)throw new Error("WebGPU BVH buffers are not ready.");let A=e.createBindGroup({layout:t.getBindGroupLayout(0),entries:[this._bvhBuffer,this._instancesBuffer,this._attrBuffers,this._materialsBuffer].map((s,l)=>({binding:l,resource:{buffer:s}}))}),a=e.createBindGroup({layout:t.getBindGroupLayout(1),entries:[{binding:0,resource:this._mapsSampler},{binding:1,resource:this._maps.createView()},{binding:3,resource:{buffer:this._mapInfoUniform}},{binding:4,resource:this._envTex.createView()},{binding:5,resource:this._envDistributionTex.createView()},{binding:6,resource:this._backgroundTex.createView()},{binding:8,resource:this._lightSamplingTexture.createView()},{binding:9,resource:this._openPbrEnergyLut.createView()},{binding:10,resource:this._adaptiveSamplingTexture.createView()}]}),r=e.createBindGroup({layout:t.getBindGroupLayout(2),entries:Object.keys(this._uniforms).map((s,l)=>({binding:l,resource:{buffer:this._uniforms[s]}}))}),n=this._targetOutputs.get(this._activeTarget),o=n.pipeline===t&&n.bindGroup||e.createBindGroup({layout:t.getBindGroupLayout(3),entries:[this._outColorBuffer,this._outNormalBuffer,this._outAlbedoBuffer,this._outShadowCatcherBuffer].map((s,l)=>({binding:l,resource:{buffer:s}}))});n.bindGroup=o,n.pipeline=t,this._rayTraceBindGroups=[A,a,r,o]}createPass(e,t,A,a){if(this._needsUpdateAnalyticLightsBuffer){let c=gf(this._analyticLights,this._materialData.getLightTexturesIndices(),this._analyticLightSelectionPmfs,this._iesProfileTexelOffsets);this._device.queue.writeBuffer(this._uniforms.analyticLights,0,c.buffer,0,c.buffer.byteLength),this._needsUpdateAnalyticLightsBuffer=!1}let r=Math.ceil(this._width/A[0]),n=Math.ceil(this._height/A[1]);this._device.queue.writeBuffer(this._uniforms.rtUniform,0,this._rtUniform.buffer),t&&(e.clearBuffer(this._outColorBuffer),e.clearBuffer(this._outNormalBuffer),e.clearBuffer(this._outAlbedoBuffer),e.clearBuffer(this._outShadowCatcherBuffer));let o={},s=a?.querySet;s&&(o.timestampWrites={querySet:s,beginningOfPassWriteIndex:0,endOfPassWriteIndex:1});let l=e.beginComputePass(o);if(!this._rayTracePipeline||!this._rayTraceBindGroups)throw new Error("WebGPU ray tracing pass was submitted before it was ready.");l.setPipeline(this._rayTracePipeline),this._rayTraceBindGroups.forEach((c,u)=>{l.setBindGroup(u,c)}),l.dispatchWorkgroups(Math.ceil(r/Zi),Math.ceil(n/Zi),1),l.end()}async getDebugBVHData(){if(!this._debugBVHBuffer)throw new Error("software-bvh exposes no CPU-readable BVH debug buffer");return{buffer:this._debugBVHBuffer}}getDiagnostics(){return{textureAtlas:this._materialData?.textureAtlasStats,shaderCompilation:this._shaderCompilationDiagnostics,lightSampling:{emissiveTriangles:this._emissiveTriangles.length,activeChoices:this._rtUniform.views.lightChoiceCount[0],totalWeight:this._rtUniform.views.lightWeightTotal[0],domains:this._lightDomainDiagnostics},bvh:{tlasTraversalStackSize:this._constants.TLAS_STACK_SIZE,blasTraversalStackSize:this._constants.BLAS_STACK_SIZE}}}setAlphaBlendStrategy(e){let t=e==="deterministic-source-over"?e:"stochastic";return t===this._alphaBlendStrategy?!1:(this._alphaBlendStrategy=t,this._constants.HAS_ALPHA_BLEND&&(this._computeShaderModule=void 0,this._rayTracePipeline=void 0,this._rayTracePipelineLayout=void 0,this._rayTraceBindGroups=void 0,this._prevPipelineConstants={},this._failedPipelineSignature=void 0,this._needsUpdateBindGroups=!0),!0)}hasDepthOfField(){return this._apertureRadius>0}setBounce(e){let t=ii(e),A=this._bounces!==t;return this._bounces=t,this._rtUniform.views.bounces[0]=t,A}setDirectLightCandidates(e){let t=ea(e),A=this._directLightCandidates!==t;return this._directLightCandidates=t,this._rtUniform.views.directLightCandidates[0]=t,A}setClamping(e){let t=this._clamping!==e;return this._rtUniform.views.clamping[0]=e??0,this._clamping=e,t}setBevelSamples(e){let t=ui(e),A=this._bevelSamples!==t;return A&&(this._bevelSamples=t,this._constants.BEVEL_SAMPLES=t),A}setSamplingPattern(e,t,A=0){let a=Xa(e),r=$a(a===1?t-1:t),n=this._rtUniform.views,o=this._constants.SAMPLING_PATTERN!==a||n.sequenceSeed[0]!==A>>>0||a===1&&n.zSobolLogSPP[0]!==r;return this._constants.SAMPLING_PATTERN=a,n.sequenceSeed[0]=A,n.zSobolLogSPP[0]=r,o}setSampleSequenceOffset(e){this._rtUniform.views.sampleSequenceOffset[0]=e}setVarianceMoments(e){this._rtUniform.views.varianceMoments[0]=e?1:0}setAdaptiveSamplingTargets(e){if(this._rtUniform.views.adaptiveSampling[0]=e?1:0,!e)return;let{width:t,height:A,data:a}=e;if(t<=0||A<=0||a.length!==t*A)throw new Error("Adaptive sample targets do not match their dimensions.");this._ensureAdaptiveSamplingTexture(t,A),this._device.queue.writeTexture({texture:this._adaptiveSamplingTexture},a,{bytesPerRow:t*Float32Array.BYTES_PER_ELEMENT},[t,A])}setQuality(e){this._rtUniform.views.bounces[0]=ii(e.bounces),this._rtUniform.views.bevel[0]=+e.bevel,this._rtUniform.views.dispersionWavelengths[0]=e.dispersionWavelengths,this._rtUniform.views.directLightCandidates[0]=ea(e.directLightCandidates)}_setEnvMap(e){let t=this._device;if(!or(e,this._envImageSource)||!this._envTex){this._envImageSource=e,this._envTex?.destroy(),this._envDistributionTex?.destroy();let A=e&&lr(e),a=GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT;this._envTex=t.createTexture({format:"rgba32float",usage:a,label:"Env",size:{width:e?e.width:1,height:e?e.height:1,depthOrArrayLayers:1}}),this._envDistributionTex=t.createTexture({format:"rg32float",usage:a,label:"Env Distribution",size:{width:A?A.width:1,height:A?A.height:1,depthOrArrayLayers:1}}),e&&A&&(t.queue.writeTexture({texture:this._envTex},e.data.buffer,{bytesPerRow:e.width*4*4},{width:e.width,height:e.height,depthOrArrayLayers:1}),t.queue.writeTexture({texture:this._envDistributionTex},A.data.buffer,{bytesPerRow:A.width*4*2},{width:A.width,height:A.height,depthOrArrayLayers:1})),this._needsUpdateBindGroups=!0}this._constants.USE_ENVMAP=!!e}setMeshes(e,t){for(let f of t?.colors??[])this._dirtyColorMeshes.add(f);if(t&&this._preparedMeshData&&this._materialData&&!this._needsUpdateMeshData&&!this._needsUpdateMeshMembership&&e===this._meshes){let f=this._materialChanges.classify(t.materials??[]);if(f.level!=="geometry"&&Ar(this._preparedMeshData,t.geometries??[])){if(t.materials?.length){let m=this._pendingMaterialUpdate;this._pendingMaterialUpdate={level:m?.level==="textures"?"textures":f.level,emission:!!m?.emission||f.emission,emissiveMap:!!m?.emissiveMap||f.emissiveMap,materials:new Set([...m?.materials??[],...t.materials])},this._meshSnapshot.forEach(g=>{g.materialKeys=g.materials.map(rt)})}for(let m of t.geometries??[])this._pendingGeometryUpdates.add(m);for(let m of this._meshSnapshot)this._pendingGeometryUpdates.has(m.geometry)&&(m.geometryVersion=m.geometry.version);for(let m of t.transforms??[]){let g=this._snapshotByMesh.get(m);g&&(g.matrix=Array.from(m.transform),this._dirtyTransformMeshes.add(m),this._needsRefitTLAS=!0)}return!!t.materials?.length||!!t.transforms?.length||!!t.colors?.length||!!t.geometries?.length}}let A=t?.materials?.length||t?.colors?.length?void 0:t?.transforms,a=!!t?.materials?.length;if(A&&!A.some(f=>f instanceof ie)&&e===this._meshes&&this._meshSnapshot.length===e.length&&this._meshSnapshot.every(f=>f.geometryVersion===f.geometry.version&&f.bvh===me(f.geometry))){let f=!1;for(let m of A){let g=this._snapshotByMesh.get(m);if(!g)continue;let h=m.transform;g.matrix.length===h.length&&g.matrix.every((B,_)=>B===h[_])||(g.matrix=Array.from(h),this._dirtyTransformMeshes.add(m),f=!0)}return f&&(this._needsRefitTLAS=!0),f}let r=this._meshSnapshot,n=e.map(f=>({mesh:f,instanceCount:f instanceof ie?f.count:1,instanceVersion:f instanceof ie?f.transformsVersion:0,instanceTransforms:f instanceof ie?f.transforms:void 0,instanceColors:f instanceof ie?f.colors:void 0,colorVersion:f instanceof ie?f.colorsVersion:0,geometry:f.geometry,bvh:me(f.geometry),materials:f.materials.slice(),materialKeys:f.materials.map(rt),geometryVersion:f.geometry.version,positionArray:f.geometry.position.array,positionItemSize:f.geometry.position.itemSize,indexArray:f.geometry.indices.array,indexItemSize:f.geometry.indices.itemSize,materialIndexArray:f.geometry.materialIndex?.array,materialIndexItemSize:f.geometry.materialIndex?.itemSize,matrix:Array.from(f.transform)})),o=n.length!==r.length||n.some((f,m)=>f.mesh!==r[m]?.mesh||f.instanceCount!==r[m]?.instanceCount||f.materials.some((g,h)=>g!==r[m]?.materials[h])),s=!this._needsUpdateMeshData&&o&&this._preparedMeshData?this._membershipCache.update(this._preparedMeshData,e):void 0;if(s){let f=new Map(r.flatMap(g=>g.materials.map((h,B)=>[h,g.materialKeys[B]]))),m=s.materials.length!==this._preparedMeshData.materials.length||s.materials.some((g,h)=>g!==this._preparedMeshData.materials[h]||f.has(g)&&rt(g)!==f.get(g));return this._pendingMembershipData=s,this._meshes=e,this._meshSnapshot=n,this._snapshotByMesh=new WeakMap,n.forEach(g=>this._snapshotByMesh.set(g.mesh,g)),this._needsUpdateMeshMembership=!0,this._needsRefitTLAS=!1,this._dirtyTransformMeshes.clear(),m&&(this._pendingMaterialUpdate={level:"textures",emission:!0,emissiveMap:!0,materials:new Set(s.materials)}),!0}if(!!this._residentPreparedMeshData&&(n.length!==r.length||n.some((f,m)=>f.mesh!==r[m]?.mesh))&&n.every(f=>{let m=this._residentSnapshotByMesh.get(f.mesh);return!!m&&f.colorVersion===m.colorVersion&&f.instanceColors===m.instanceColors&&f.geometry===m.geometry&&f.bvh===m.bvh&&f.materials.length===m.materials.length&&f.materials.every((g,h)=>g===m.materials[h])&&f.materialKeys.every((g,h)=>g===m.materialKeys[h])&&f.geometryVersion===m.geometryVersion&&this._materialChanges.classify(f.materials).level==="params"&&f.positionArray===m.positionArray&&f.indexArray===m.indexArray&&f.materialIndexArray===m.materialIndexArray&&f.matrix.every((g,h)=>g===m.matrix[h])}))return this._meshes=e,this._meshSnapshot=n,this._snapshotByMesh=new WeakMap,n.forEach(f=>{this._snapshotByMesh.set(f.mesh,f)}),this._needsUpdateMeshMembership=!0,this._needsRefitTLAS=!1,this._dirtyTransformMeshes.clear(),!0;let c=n.length!==r.length||n.some((f,m)=>{let g=r[m];return!g||f.mesh!==g.mesh||f.instanceCount!==g.instanceCount||f.geometry!==g.geometry||f.bvh!==g.bvh||f.colorVersion!==g.colorVersion||f.instanceColors!==g.instanceColors||f.materials.length!==g.materials.length||f.materials.some((h,B)=>h!==g.materials[B])||f.materialKeys.some((h,B)=>h!==g.materialKeys[B])||f.positionArray!==g.positionArray||f.positionArray.length!==g.positionArray.length||f.positionItemSize!==g.positionItemSize||f.indexArray!==g.indexArray||f.indexArray.length!==g.indexArray.length||f.indexItemSize!==g.indexItemSize||f.materialIndexArray!==g.materialIndexArray||f.materialIndexArray?.length!==g.materialIndexArray?.length||f.materialIndexItemSize!==g.materialIndexItemSize}),u=!c&&n.some((f,m)=>f.geometryVersion!==r[m].geometryVersion),p=c||u,d=!c&&n.some((f,m)=>f.instanceVersion!==r[m].instanceVersion||f.instanceTransforms!==r[m].instanceTransforms||f.matrix.some((g,h)=>g!==r[m].matrix[h]));return this._meshes=e,n.forEach((f,m)=>{let g=r[m];g?.geometry===f.geometry&&(g.positionArray!==f.positionArray||g.indexArray!==f.indexArray)&&(Xe(f.geometry,void 0),this._geometriesNeedRefit.add(f.geometry)),f.geometryVersion>0&&(!g||f.geometry!==g.geometry||f.geometryVersion!==g.geometryVersion)&&this._geometriesNeedRefit.add(f.geometry)}),this._meshSnapshot=n,this._snapshotByMesh=new WeakMap,n.forEach(f=>{this._snapshotByMesh.set(f.mesh,f)}),p?(this._needsUpdateMeshData=!0,this._needsUpdateMeshMembership=!1,this._needsRefitTLAS=!1,this._dirtyTransformMeshes.clear()):d&&(this._needsRefitTLAS=!0,n.forEach((f,m)=>{(f.instanceVersion!==r[m].instanceVersion||f.instanceTransforms!==r[m].instanceTransforms||f.matrix.some((g,h)=>g!==r[m]?.matrix[h]))&&this._dirtyTransformMeshes.add(f.mesh)})),(a||!t&&!p&&!d)&&(this._needsUpdateMeshData=!0),p||d||a||!t}setTextureAtlasBudget(e){let t=Number.isFinite(e)?Math.max(4,Math.floor(e)):Bt;return t===this._maxTextureArrayBytes?!1:(this._maxTextureArrayBytes=t,this._needsUpdateMeshData=!0,!0)}setBackground(e){this._constants.USE_BACKGROUND=!!e;let t=e&&!Array.isArray(e)?ar(e):void 0;this._constants.USE_BACKGROUND_MAP=!!t,Array.isArray(e)&&this._rtUniform.views.backgroundColor.set(new cr(e));let A=e&&!Array.isArray(e)&&"type"in e&&e.type==="GroundedSkybox"?e:void 0;this._rtUniform.views.groundedBackgroundParams.set(A?[Math.max(A.height,1e-4),Math.max(A.radius,1e-4),A.groundHeight??0,1]:[0,0,0,0]),this._rtUniform.views.groundedBackgroundCenter.set(A?.center??[0,0]),this._constants.USE_GROUNDED_BACKGROUND=!!A,this._rtUniform.views.backgroundFlags[0]=(e?1:0)|(t?2:0)|(A?4:0)|this._rtUniform.views.backgroundFlags[0]&2147483648,this._setBackgroundMap(t)}_setBackgroundMap(e){if(e===this._backgroundImageSource&&this._backgroundTex)return;this._backgroundImageSource=e,this._backgroundTex?.destroy();let t=e?.width??1,A=e?.height??1;if(this._backgroundTex=this._device.createTexture({format:"rgba32float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Background",size:{width:t,height:A,depthOrArrayLayers:1}}),e){let a=e.data,r=a instanceof Float32Array?a:Float32Array.from(a,n=>a instanceof Uint8Array||a instanceof Uint8ClampedArray?n/255:n);this._device.queue.writeTexture({texture:this._backgroundTex},r.buffer,{bytesPerRow:t*4*4},{width:t,height:A,depthOrArrayLayers:1})}this._needsUpdateBindGroups=!0}_updateLightSamplingData(){let e=this._lightChoices;e.reserve(1+this._analyticLights.length+this._emissiveTriangles.length),e.push(KA,0,La(this._envImageSource)),this._analyticLights.forEach((E,Q)=>e.push(XA,Q,Ra(E))),this._emissiveTriangles.forEach((E,Q)=>e.push(Ta,Q,E.area*E.samplingLuminance));let t=$s(e),A={environment:{count:0,weight:0,pmf:0},infinite:{count:0,weight:0,pmf:0},localAndEmissive:{count:0,weight:0,pmf:0}};this._analyticLightSelectionPmfs=new Array(this._analyticLights.length).fill(0),this._rtUniform.views.envLightPmf[0]=0;let a=[A.environment,A.infinite,A.localAndEmissive];for(let E=0;E<e.count;E++){let Q=e.sourceTypes[E],w=e.sourceIndices[E],x=t.pmfs[E],M=Q===KA?Js:Q===XA&&this._analyticLights[w]?.type==="DirectionalLight"?Ks:Xs,P=a[M];P.count++,P.weight+=e.weights[E],P.pmf+=x,Q===KA?this._rtUniform.views.envLightPmf[0]=x:Q===XA?this._analyticLightSelectionPmfs[w]=x:this._emissiveTriangles[w].selectionPmf=x}this._lightDomainDiagnostics=A,this._rtUniform.views.lightChoiceCount[0]=e.count,this._rtUniform.views.lightWeightTotal[0]=t.totalWeight;let r=this._emissiveTriangles.length*6,n=Math.max(e.count,1),o=r+n,s=Ua(this._analyticLights,o);this._iesProfileTexelOffsets=s.offsets;let l=Math.max(o+s.texelCount,1),c=this._device.limits.maxTextureDimension2D,u=Math.min(c,Math.max(16,Math.ceil(Math.sqrt(l)/16)*16)),p=Math.ceil(l/u);if(p>c)throw new Error("Too many emissive triangles for the light sampling texture.");let d=!this._lightSamplingTexture||u!==this._lightSamplingTextureSize[0]||p!==this._lightSamplingTextureSize[1];(!this._lightSamplingTexture||u!==this._lightSamplingTextureSize[0]||p!==this._lightSamplingTextureSize[1])&&(this._lightSamplingTexture?.destroy(),this._lightSamplingTexture=this._device.createTexture({label:"Light sampling data",size:[u,p],format:"rgba32float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST}),this._lightSamplingTextureSize=[u,p],this._needsUpdateBindGroups=!0);let f=this._lightSamplingScratch?.length===u*p*4?this._lightSamplingScratch:new Float32Array(u*p*4);f.fill(0),this._emissiveTriangles.length&&Zs(this._emissiveTriangles,f),new Uint32Array(f.buffer).set(t.choices,r*4),f.set(s.data,o*4);let m=this._lightSamplingData,g=d||!m||this._lightSamplingTriangleCount!==this._emissiveTriangles.length,h=new Uint32Array(f.buffer),B=m&&new Uint32Array(m.buffer),_=-1;for(let E=0;E<=p;E++){let Q=E<p&&g;if(E<p&&!g){for(let w=E*u*4;w<(E+1)*u*4;w++)if(h[w]!==B[w]){Q=!0;break}}Q&&_<0&&(_=E),!Q&&_>=0&&(this._device.queue.writeTexture({texture:this._lightSamplingTexture,origin:[0,_]},f.subarray(_*u*4,E*u*4),{bytesPerRow:u*16},{width:u,height:E-_}),_=-1)}this._lightSamplingScratch=m,this._lightSamplingData=f,this._lightSamplingTriangleCount=this._emissiveTriangles.length,this._rtUniform.views.lightSamplingTextureWidth[0]=u,this._rtUniform.views.lightChoiceTexelOffset[0]=r,this._needsUpdateAnalyticLightsBuffer=!0,this._needsUpdateLightSamplingData=!1}_uploadBVH(e,t){let A=da(e,t);this._constants.TLAS_STACK_SIZE=Ai(A.tlas,Number(this._constants.TLAS_STACK_SIZE??0)),this._constants.BLAS_STACK_SIZE=Ai(A.blas,Number(this._constants.BLAS_STACK_SIZE??0),32);let a=new Float32Array(e.buffer),r=new Float32Array(IA(t)),n=new Float32Array(a.length+r.length),o=a.length/4;n.set(a),n.set(r,o*4);let s=this._updateGPUBuffer("BVH",this._bvhBuffer,n),l=this._updateGPUBuffer("Instances",this._instancesBuffer,new Float32Array(e.instancesBuffer));(s!==this._bvhBuffer||l!==this._instancesBuffer)&&(this._needsUpdateBindGroups=!0),this._bvhBuffer=s,this._instancesBuffer=l,this._debugBVHBuffer=n.buffer.slice(0),this._rtUniform.views.blasOffset.set([o])}_updateMeshData(){this._pendingGeometryUpdates.clear(),this._emissiveCache=new Wi;let e=this._meshes;for(let g of this._geometriesNeedRefit)(e.some(B=>B.geometry===g&&!!B.materials[0]?.displacementMap&&(B.materials[0].displacementScale!==0||B.materials[0].displacementBias!==0))||Xi(this._preparedMeshData,g)||!me(g)||!SA(me(g),g))&&Xe(g,void 0);this._geometriesNeedRefit.clear();let t=ka(e);this._preparedMeshData=t,this._membershipCache.capture(t),this._pendingMembershipData=void 0,this._needsUpdateMeshMembership=!1;let A=t.geometry,a=t.materials,r=e.length===0||t.instances.length===0,n=rA(t.instances,t.blases);this._tlas=n,this._uploadBVH(n,t.blases);let o=this._materialData=new jA(a,this._analyticLights,{maxTextureArrayBytes:this._maxTextureArrayBytes,maxTextureArrayLayers:this._device.limits.maxTextureArrayLayers,maxTextureDimension2D:this._device.limits.maxTextureDimension2D});this._emissiveTriangles=this._emissiveCache.collect(t.emissiveBindings,a),this._needsUpdateLightSamplingData=!0;let s=["position","normal","uv","uv1","color","tangent","materialIndex"],l=s.map(g=>A[g]),c=4,u=0,p=s.map((g,h)=>{let B=l[h],_=u;return B&&(u+=c),_}),d=new cr(A.vertexCount*u);gn(A,d,u,p,0,A.vertexCount),this._attributeData=d,this._attributeStride=u,this._attributeOffsets=p,this._attrBuffers=this._updateGPUBuffer("Attributes",this._attrBuffers,d),this._materialsBuffer=this._updateGPUBuffer("Materials",this._materialsBuffer,o.getBufferArray(),yi*4);let f=da(n,t.blases),m={bvh2:1,bvh4:2,"bvh-gpu":4,cwbvh:8};this._blasLayoutMask=t.blases.reduce((g,h)=>g|m[h.bvh.layout??"bvh2"],0),Object.assign(this._constants,{TLAS_STACK_SIZE:Ai(f.tlas,Number(this._constants.TLAS_STACK_SIZE??0)),BLAS_STACK_SIZE:Ai(f.blas,Number(this._constants.BLAS_STACK_SIZE??0),32),USE_UV:A.uv!=null,USE_VERTEX_COLOR:A.color!=null,ATTR_STRIDE:u/c,...p.reduce((g,h,B)=>(g[s[B].toUpperCase()+"_OFF"]=h/c,g),{})}),this._updateMaterialConstants(a,o,A),this._updateTextures(o),this._needsUpdateBindGroups=!0,this._rtUniform.views.isEmpty[0]=+r,this._meshSnapshot.forEach(g=>{g.bvh=me(g.geometry)}),this._residentPreparedMeshData=t,this._residentSnapshotByMesh=new WeakMap,this._meshSnapshot.forEach(g=>{this._residentSnapshotByMesh.set(g.mesh,g)}),this._materialChanges.capture(a),this._pendingMaterialUpdate=void 0,this._needsUpdateMeshData=!1,this._needsUpdateMeshMembership=!1,this._needsRefitTLAS=!1}_updateMaterialConstants(e,t,A){let a=e.some(c=>c.transmissionWeight>0);a!==this._hasTransmission&&(this._hasTransmission=a),this._hasShadowCatcher=e.some(c=>c.shadowCatcher);let r=t.getDisplacementMaps().length>0;r!==this._hasDisplacement&&(this._hasDisplacement=r,this._rayTracePipelineLayout=void 0);let n=e.some(c=>c.bevelSize>0),o=e.some(c=>c.transmissionDispersionScale>0),s=e.some(Di),l=Math.max(Math.ceil(+t.defines.NUM_MAPS/10)*10,Number(this._constants.NUM_MAPS??0),20);Object.assign(this._constants,{USE_UV1:t.bufferData.mapUvChannel.some(c=>c>.5),USE_TANGENT:A.tangent!=null&&e.some(c=>c.specularAnisotropy>0||c.coatAnisotropy>0||!!c.coatNormalMap&&c.coatWeight>0),USE_COAT_NORMAL_FRAMES:e.some(c=>!!c.coatNormalMap&&c.coatWeight>0),USE_ANISOTROPY_DIRECTIONS:e.some(c=>!!c.coatNormalMap&&c.coatWeight>0||c.specularAnisotropy>0&&(c.specularAnisotropyModel==="gltf"||!!c.anisotropyMap||c.specularAnisotropyRotation!==0)||c.coatAnisotropy>0&&c.coatAnisotropyRotation!==0),HAS_MEDIUM:s,HAS_SHADOW_CATCHER:this._hasShadowCatcher,HAS_THIN_FILM:e.some(c=>c.thinFilmWeight>0),HAS_COAT:e.some(c=>c.coatWeight>0),HAS_FUZZ:e.some(c=>c.fuzzWeight>0),HAS_SUBSURFACE:e.some(c=>c.subsurfaceWeight>0),HAS_BEVEL:n,HAS_ALPHA_MASK:e.some(c=>Jt(c)==="mask"),HAS_ALPHA_BLEND:e.some(c=>Jt(c)==="blend"),HAS_ALPHA:e.some(c=>Jt(c)!=="opaque"),SPECTRAL:o,BEVEL_SAMPLES:this._bevelSamples,USE_RR:!0,RR_MAX:s?12:2,NUM_UNIFORM_LIGHTS:vA,...t.defines,NUM_MAPS:l,...ys(t.defines),USE_NORMAL_MAPS:+t.defines.NUM_NORMAL_MAPS>0})}_updateGeometryData(){let e=this._preparedMeshData,t=this._tlas,A=ir(e,this._pendingGeometryUpdates);for(let{first:n,count:o,topologyChanged:s,deformationOnly:l}of A.vertices){gn(e.geometry,this._attributeData,this._attributeStride,this._attributeOffsets,n,o,s,l);let c=n*this._attributeStride*4,u=o*this._attributeStride*4;this._device.queue.writeBuffer(this._attrBuffers,c,this._attributeData.buffer,c,u)}for(let n of A.meshes)this._dirtyTransformMeshes.add(n);if(A.relocated)for(let n of e.instanceBindings)this._dirtyTransformMeshes.add(n.mesh);if(A.resized)e.instances=yt(e.instanceBindings),DA(t,e.instances,e.blases),this._uploadBVH(t,e.blases);else{let n=new Uint8Array(this._debugBVHBuffer),o=[];for(let{blas:s,offset:l}of A.blases){let c=t.buffer.byteLength+l;n.set(new Uint8Array(s.buffer),c),o.push({offset:c,size:s.buffer.byteLength})}for(let{offset:s,size:l}of pa(o))this._device.queue.writeBuffer(this._bvhBuffer,s,this._debugBVHBuffer,s,l)}let a={bvh2:1,bvh4:2,"bvh-gpu":4,cwbvh:8};this._blasLayoutMask=e.blases.reduce((n,o)=>n|a[o.bvh.layout??"bvh2"],0);let r=da(t,e.blases);this._constants.BLAS_STACK_SIZE=Ai(r.blas,Number(this._constants.BLAS_STACK_SIZE??0),32),this._meshSnapshot.forEach(n=>{n.bvh=me(n.geometry)}),this._needsRefitTLAS=!0,this._pendingGeometryUpdates.clear()}_updateMaterialData(){let e=this._pendingMaterialUpdate,t=this._preparedMeshData,A=this._materialData;if(e.level==="textures"?(A=this._materialData=new jA(t.materials,this._analyticLights,{maxTextureArrayBytes:this._maxTextureArrayBytes,maxTextureArrayLayers:this._device.limits.maxTextureArrayLayers,maxTextureDimension2D:this._device.limits.maxTextureDimension2D}),this._updateTextures(A)):A.repackParams(t.materials),this._materialsBuffer=this._updateGPUBuffer("Materials",this._materialsBuffer,A.getBufferArray(),yi*4),this._updateMaterialConstants(t.materials,A,t.geometry),e.emission||e.emissiveMap){let a=this._residentPreparedMeshData;a.emissiveBindings=a.instanceBindings.filter(n=>n.materialIndices.some(o=>mA(t.materials[o])));let r=new Set(this._meshes);t.emissiveBindings=a.emissiveBindings.filter(n=>r.has(n.mesh)),this._emissiveTriangles=this._emissiveCache.collect(t.emissiveBindings,t.materials),this._needsUpdateLightSamplingData=!0}this._needsUpdateBindGroups=!0,this._materialChanges.capture([...e.materials]),this._pendingMaterialUpdate=void 0}_updateMeshMembership(){let e=this._pendingMembershipData??this._residentPreparedMeshData,t=this._pendingMembershipData;if(!e){this._needsUpdateMeshData=!0,this._needsUpdateMeshMembership=!1;return}let A=new Set(this._meshes),a=e.instanceBindings.filter(({mesh:l})=>A.has(l)),r=e.emissiveBindings.filter(({mesh:l})=>A.has(l)),n=yt(a),o={...e,instances:n,instanceBindings:a,emissiveBindings:r};this._preparedMeshData=o,t&&(this._residentPreparedMeshData=o),this._pendingMembershipData=void 0;let s=rA(n,o.blases);this._tlas=s,this._uploadBVH(s,o.blases),this._emissiveTriangles=this._emissiveCache.collect(r,o.materials),this._needsUpdateLightSamplingData=!0,this._rtUniform.views.isEmpty[0]=+(n.length===0),this._meshSnapshot.forEach(l=>{l.bvh=me(l.geometry)}),this._needsUpdateMeshMembership=!1}_updateMeshColors(){let e=this._preparedMeshData,t=this._tlas;if(e&&t){let A=Ha(e.instanceBindings,e.instances,this._dirtyColorMeshes),a=ma(t,e.instances,A);if(this._instancesBuffer)for(let{offset:r,size:n}of a)this._device.queue.writeBuffer(this._instancesBuffer,r,t.instancesBuffer,r,n)}this._dirtyColorMeshes.clear()}_refitMeshInstances(){let e=this._preparedMeshData,t=this._tlas;if(!e||!t||!this._bvhBuffer||!this._instancesBuffer){this._needsUpdateMeshData=!0,this._needsRefitTLAS=!1;return}let A=Ga(e.instanceBindings,this._dirtyTransformMeshes,e.instances),a=A.size>0,r=e.instances;if(e.instances=yt(e.instanceBindings,a?e.instances:void 0,a?A:void 0),!ua(r,e.instances)){this._tlas=rA(e.instances,e.blases),this._uploadBVH(this._tlas,e.blases),this._emissiveTriangles=this._emissiveCache.collect(e.emissiveBindings,e.materials),this._needsUpdateLightSamplingData=!0,this._rtUniform.views.isEmpty[0]=+(e.instances.length===0),this._dirtyTransformMeshes.clear(),this._needsRefitTLAS=!1;return}let n=DA(t,e.instances,e.blases,a?A:void 0),o=new Float32Array(t.buffer);for(let{offset:s,size:l}of n.tlasRanges)this._device.queue.writeBuffer(this._bvhBuffer,s,t.buffer,s,l);for(let{offset:s,size:l}of n.instanceRanges)this._device.queue.writeBuffer(this._instancesBuffer,s,t.instancesBuffer,s,l);this._debugBVHBuffer&&new Float32Array(this._debugBVHBuffer).set(o),(!a||e.emissiveBindings.some(({mesh:s})=>this._dirtyTransformMeshes.has(s)))&&(this._emissiveTriangles=this._emissiveCache.collect(e.emissiveBindings,e.materials),this._needsUpdateLightSamplingData=!0),this._dirtyTransformMeshes.clear(),this._needsRefitTLAS=!1}_updateTextures(e){let t=e.bufferData.mapInfo??[0,0,0,0],A=e.bufferData.mapTransform??[1,1,0,0],a=e.bufferData.mapUvChannel??[0],r=e.bufferData.mapColorLinear,n=+this._constants.NUM_MAPS,o=new cr(n*12);for(let h=0;h<t.length;h++)o[h]=t[h];for(let h=0;h<A.length;h++)o[n*4+h]=A[h];for(let h=0;h<a.length;h++)o[n*8+h*4]=a[h],o[n*8+h*4+1]=r[h];let s=this._mapInfoUniform;(!s||s.size!==o.byteLength)&&(s?.destroy(),s=this._uniformBuffer(o.byteLength),this._mapInfoUniform=s),this._device.queue.writeBuffer(s,0,o);let l=e.texture,c=this._maps,u=l?.storageType===k.HALF_FLOAT?"rgba16float":"rgba8unorm",p=u==="rgba16float"?8:4,d=Math.max(l?.width??1,1),f=Math.max(l?.height??1,1),m=Math.max(l?.source.length??1,2),g=this._device.limits.maxTextureArrayLayers;if(m>g)throw new Error(`The scene needs ${m} texture-array layers, but this GPU device supports ${g}.`);(!c||u!==c.format||d!==c.width||f!==c.height||m!==c.depthOrArrayLayers)&&(c&&c.destroy(),this._maps=this._device.createTexture({format:u,label:"Maps",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,size:{width:d,height:f,depthOrArrayLayers:m}}),this._needsUpdateBindGroups=!0),l?.source.forEach((h,B)=>{if(gt(h)){if(!(h.data instanceof Uint8Array)&&!(h.data instanceof Uint16Array))throw new Error("Material texture atlas GPU upload requires RGBA8 or RGBA16F data.");this._device.queue.writeTexture({texture:this._maps,origin:[0,0,B]},h.data,{bytesPerRow:h.width*p,rowsPerImage:h.height},{width:h.width,height:h.height,depthOrArrayLayers:1});return}this._device.queue.copyExternalImageToTexture({source:h,flipY:l.flipYArray[B]},{texture:this._maps,origin:[0,0,B]},[h.width,h.height])})}setLights(e){let t=e.filter(o=>o.type==="DirectionalLight"||o.type==="SphereLight"||o.type==="SpotLight"||o.type==="RectLight");t.length>vA&&console.warn(`Too many lights, only the first ${vA} lights will be used.`);let A=t.slice(0,vA),a=A.length,r=this._sceneEnvironment.update(e);this._rtUniform.views.lightsCount[0]=a,this._setEnvMap(r);let n=this._rectLightTextures.update(A);this._analyticLights=A,n&&(this._needsUpdateMeshData=!0),this._needsUpdateAnalyticLightsBuffer=!0,this._needsUpdateLightSamplingData=!0}_updateViewProjInv(e,t){Ue.invert(t,e.getProjectionMatrix(this._targetAspect)),Ue.mul(t,e.transform,t)}setCamera(e){let t=this._viewProjInv;this._apertureRadius=ai(e),this._focusDistance=e.focusDistance,this._updateViewProjInv(e,t),Ue.copy(this._cameraWorld,e.transform)}cameraChanged(e){let t=Ue.create();return this._updateViewProjInv(e,t),!rr(this._viewProjInv,t)||ai(e)!==this._apertureRadius||e.focusDistance!==this._focusDistance}setSize(e,t,A=e/t){this._targetAspect=A,this._width=e,this._height=t;let a=this._rtUniform.views.outputSize;a[0]=e,a[1]=t;let r=this._outColorBuffer,n=e*t*4*4;if(r&&r.size===n)return;this._needsUpdateBindGroups=!0;let o=[];for(let s of["Color","Normal","Albedo","ShadowCatcher"]){let l=this[`_out${s}Buffer`];l&&o.push(l),this[`_out${s}Buffer`]=this._device.createBuffer({label:"Ray Trace "+s,size:s==="ShadowCatcher"?e*t*48:n,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC})}this._targetOutputs.set(this._activeTarget,{buffers:[this._outColorBuffer,this._outNormalBuffer,this._outAlbedoBuffer,this._outShadowCatcherBuffer]}),this._device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>o.forEach(s=>s.destroy()))}setJitter(e,t){let A=this._rtUniform.views.jitter;A[0]=e,A[1]=t,this._device.queue.writeBuffer(this._uniforms.cameraUniform,0,new cr([...this._viewProjInv,...this._cameraWorld,this._apertureRadius,this._focusDistance,0,0]))}setSampleTiles(e,t,A,a){let r=this._rtUniform.views.scaleOffset;r[0]=e,r[1]=t,r[2]=A,r[3]=a}setSampleCount(e){this._rtUniform.views.sampleCount[0]=e}setTransmissiveOutputAlphaMin(e){this._rtUniform.views.transmissiveOutputAlphaMin[0]=e;let t=this._transmissiveAlphaMin!==e;return this._transmissiveAlphaMin=e,t}needsDenoiseAlpha(){return this._hasShadowCatcher||this._transmissiveAlphaMin<1&&this._hasTransmission}hasShadowCatcher(){return this._hasShadowCatcher}dispose(){this._shaderCache.clear(),new Set([...Array.from(this._targetOutputs.values()).flatMap(A=>A.buffers),this._mapInfoUniform,this._attrBuffers,this._materialsBuffer,this._bvhBuffer,this._instancesBuffer,this._offlineAdaptiveHistory?.varianceBuffer,...Object.values(this._uniforms)]).forEach(A=>A?.destroy()),new Set([this._maps,this._lightSamplingTexture,this._openPbrEnergyLut,this._envTex,this._envDistributionTex,this._backgroundTex,this._adaptiveSamplingTexture]).forEach(A=>A?.destroy()),this._rayTracePipeline=void 0,this._rayTraceBindGroups=void 0}},No=Un;var Ln=`
fn fJ(color: vec3f) -> vec3f {
let linear = max(color, vec3f(0.0));
let low = linear * 12.92;
let high = 1.055 * pow(linear, vec3f(1.0 / 2.4)) - 0.055;
return select(high, low, linear <= vec3f(0.0031308));
}
`,zo=`

fn jN(color: vec3f) -> vec3f {
return clamp(color, vec3f(0.0), vec3f(1.0));
}
fn iK(color: vec3f) -> vec3f {
return clamp(color / (vec3f(1.0) + color), vec3f(0.0), vec3f(1.0));
}
fn jE(jm: vec3f) -> vec3f {
let color = max(vec3f(0.0), jm - 0.004);
return pow((color * (6.2 * color + 0.5)) /
(color * (6.2 * color + 1.7) + 0.06), vec3f(2.2));
}
fn oA(value: vec3f) -> vec3f {
let kF = value * (value + 0.0245786) - 0.000090537;
let ap = value * (0.983729 * value + 0.4329510) + 0.238081;
return kF / ap;
}
fn ll(jm: vec3f) -> vec3f {
let pn = mat3x3f(
vec3f(0.59719, 0.07600, 0.02840),
vec3f(0.35458, 0.90834, 0.13383),
vec3f(0.04823, 0.01566, 0.83777)
);
let ov = mat3x3f(
vec3f(1.60475, -0.10208, -0.00327),
vec3f(-0.53108, 1.10813, -0.07276),
vec3f(-0.07367, -0.00605, 1.07602)
);
let color = pn * (jm / 0.6);
return clamp(ov * oA(color), vec3f(0.0), vec3f(1.0));
}
fn fP(value: vec3f) -> vec3f {
let mE = value * value;
let qC = mE * mE;
return 15.5 * qC * mE - 40.14 * qC * value
+ 31.96 * qC - 6.868 * mE * value
+ 0.4298 * mE + 0.1191 * value - 0.00232;
}
fn lS(jm: vec3f) -> vec3f {
let mG = mat3x3f(
vec3f(1.6605, -0.1246, -0.0182),
vec3f(-0.5876, 1.1329, -0.1006),
vec3f(-0.0728, -0.0083, 1.1187)
);
let mH = mat3x3f(
vec3f(0.6274, 0.0691, 0.0164),
vec3f(0.3293, 0.9195, 0.0880),
vec3f(0.0433, 0.0113, 0.8956)
);
let pp = mat3x3f(
vec3f(0.856627153315983, 0.137318972929847, 0.11189821299995),
vec3f(0.0951212405381588, 0.761241990602591, 0.0767994186031903),
vec3f(0.0482516061458583, 0.101439036467562, 0.811302368396859)
);
let ow = mat3x3f(
vec3f(1.1271005818144368, -0.1413297634984383, -0.14132976349843826),
vec3f(-0.11060664309660323, 1.157823702216272, -0.11060664309660294),
vec3f(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405)
);
var color = pp * (mH * jm);
color = clamp((log2(max(color, vec3f(1e-10))) + 12.47393) / 16.5, vec3f(0.0), vec3f(1.0));
color = ow * fP(color);
color = pow(max(color, vec3f(0.0)), vec3f(2.2));
return clamp(mG * color, vec3f(0.0), vec3f(1.0));
}
fn cl(color: vec3f) -> vec3f {
let toneMappingMode = i32(toneMappingParams.x);
if (toneMappingMode == 1) { return ll(color); }
if (toneMappingMode == 2) { return jE(color); }
if (toneMappingMode == 3) { return iK(color); }
if (toneMappingMode == 4) { return jN(color); }
return lS(color);
}
${Ln}
fn fX(jm: vec3f) -> vec3f {
let contrast = colorGradingParams.x;
let saturation = colorGradingParams.y;
let temperature = colorGradingParams.z;
let tint = colorGradingParams.w;
let tb = vec3f(
1.0 + temperature * 0.16 + tint * 0.04,
1.0 - tint * 0.12,
1.0 - temperature * 0.16 + tint * 0.04
);
var color = max(jm * tb, vec3f(0.0));
color = max((color - 0.18) * contrast + 0.18, vec3f(0.0));
let luminance = dot(color, vec3f(0.2126, 0.7152, 0.0722));
return max(mix(vec3f(luminance), color, saturation), vec3f(0.0));
}
`,ko=`

var dY = load_colorTex(uv, 0);
var jh = vec4(0.0);
if (bloomIntensity > 0.0) {
jh = load_bloomTex(uv, 0) * bloomIntensity;
dY = vec4f(dY.rgb + jh.rgb, dY.a);
}

var la = fX(dY.rgb * exposure);
let iE = smoothstep(0.2, 0.72, distance(vec2f(uv) / vec2f(colorTexRegion()), vec2f(0.5)));
la *= 1.0 - toneMappingParams.y * iE;
let gw = hdrOutputEnabled > 0.5;
if (!gw) {
la = cl(la);
}
let mb = select(
pow(max(la, vec3f(0.0)), vec3f(1.0 / 2.2)),
fJ(la),
gw
);
var nR = mb;
if (flatBackgroundColor.a > 0.5) {
let jc = clamp(
load_flatBackgroundMaskTex(uv, 0).a,
0.0,
1.0
);
let oS = fJ(max(flatBackgroundColor.rgb, vec3f(0.0)));
nR = mix(oS, mb, jc);
if (bloomIntensity > 0.0) {
var ik = fX(
max(dY.rgb - jh.rgb, vec3f(0.0))
* exposure
);
ik *= 1.0 - toneMappingParams.y * iE;
if (!gw) {
ik = cl(ik);
}
let ru = select(
pow(max(ik, vec3f(0.0)), vec3f(1.0 / 2.2)),
fJ(ik),
gw
);
nR += max(mb - ru, vec3f(0.0))
* (1.0 - jc);
}
}
dY = vec4f(nR, dY.a);
if (bloomIntensity > 0.0) {
dY.a = max(dY.a, min(dot(jh.rgb, vec3f(0.2125, 0.7154, 0.0721)), 1.0));
}

if (shadowCatcherEnabled > 0.5) {
let shadowCatcher = load_shadowCatcherTex(uv, 0);
let coverage = clamp(shadowCatcher.r, 0.0, 1.0);
let opacity = max(clamp(shadowCatcher.a / max(coverage, 0.000001), 0.0, 1.0) - (1.0 - shadowCatcherAlpha), 0.0);
if (coverage > 0.0 || flatBackgroundColor.a > 0.5) {
let foreground = load_foregroundTex(uv, 0);
let background = load_catcherBackgroundTex(uv, 0);




let kz = select(0.0, clamp(background.a - coverage, 0.0, 1.0 - coverage), flatBackgroundColor.a > 0.5);
var bK = fX((foreground.rgb + jh.rgb) * exposure);
var backgroundColor = fX((background.rgb / max(background.a, 0.000001) + jh.rgb) * exposure);
bK *= 1.0 - toneMappingParams.y * iE;
backgroundColor *= 1.0 - toneMappingParams.y * iE;
if (!gw) {
bK = cl(bK);
backgroundColor = cl(backgroundColor);
}
bK = select(pow(max(bK, vec3f(0.0)), vec3f(1.0 / 2.2)), fJ(bK), gw);
backgroundColor = select(pow(max(backgroundColor, vec3f(0.0)), vec3f(1.0 / 2.2)), fJ(backgroundColor), gw);
if (flatBackgroundColor.a > 0.5) {
var eM = fX(background.rgb / max(background.a, 0.000001) * exposure);
eM *= 1.0 - toneMappingParams.y * iE;
if (!gw) { eM = cl(eM); }
let mc = select(pow(max(eM, vec3f(0.0)), vec3f(1.0 / 2.2)), fJ(eM), gw);
let ud = select(vec3f(0.0), max(backgroundColor - mc, vec3f(0.0)), bloomIntensity > 0.0);
backgroundColor = fJ(max(flatBackgroundColor.rgb, vec3f(0.0))) + ud;
}


let fO = coverage * opacity;
let lU = clamp(dot(jh.rgb, vec3f(0.2125, 0.7154, 0.0721)), 0.0, 1.0);
let hr = max(foreground.a, lU * (1.0 - coverage - kz));
let iZ = max(background.a, lU * coverage);
let kl = (iZ - kz) * (1.0 - opacity) + kz;
let alpha = hr + kl + fO;
let premultiplied = bK * hr
+ backgroundColor * kl
+ shadowCatcherColor * fO;
dY = vec4f(premultiplied / max(alpha, 0.000001), alpha);
}
}

output.color = dY;


`,Go=`
let encoded = max(dY.rgb, vec3f(0.0));
let sP = select(
pow(encoded, vec3f(2.2)),
select(pow((encoded + 0.055) / 1.055, vec3f(2.4)), encoded / 12.92,
encoded <= vec3f(0.04045)),
gw
);
output.denoiseColor = vec4f(sP, dY.a);





let rawAlbedo = load_flatBackgroundMaskTex(uv, 0);
var oN = rawAlbedo.rgb;
if (shadowCatcherEnabled > 0.5 && flatBackgroundColor.a < 0.5) {
let coverage = clamp(load_shadowCatcherTex(uv, 0).r, 0.0, 1.0);
let background = load_catcherBackgroundTex(uv, 0);
if (coverage > 0.0 && background.a > 0.0) {
var im = fX(background.rgb / background.a * exposure);
im *= 1.0 - toneMappingParams.y * iE;
if (!gw) { im = cl(im); }



let rk = clamp(background.a, 0.0, coverage);
oN += rk * (clamp(im, vec3f(0.0), vec3f(1.0)) - vec3f(1.0));
}
}
output.denoiseAlbedo = vec4f(clamp(oN, vec3f(0.0), vec3f(1.0)), rawAlbedo.a);
`,Ho=`
let denoised = load_colorTex(uv, 0);



let alpha = select(load_composedTex(uv, 0).a, clamp(denoised.a, 0.0, 1.0), denoisedAlpha > 0.5);
let linear = max(denoised.rgb, vec3f(0.0));
let encoded = select(pow(linear, vec3f(1.0 / 2.2)), fJ(linear), hdrOutputEnabled > 0.5);
output.color = vec4f(select(vec3f(0.0), encoded, alpha > 0.0), alpha);
`;function EA(i,e){for(var t=0,A=1/e,a=i;a>0;)t=t+A*(a%e),a=Math.floor(a/e),A=A/e;return t}function pr(i){let e=21,t=1/0,A=-1,a=1,r=1,n,o,s,l,c=0,u=0,p=0,d=0,f=i?vf(i):6e5;function m(){A=-1,p=0,d=0}function g(E,Q){c=E,u=Q,m(),h()}function h(){let Q=c/u;n=Math.ceil(3e3/Math.max(Math.round(3e3/Math.sqrt(f*Q)),1)),o=Math.ceil(n/Q),n>c&&o>u?(s=1,l=1,a=1,r=Math.round(n/c)*Math.round(o/u)):(r=1,s=Math.ceil(c/n),l=Math.ceil(u/o),a=s*l),a>t&&(a=t,s=Math.ceil(Math.sqrt(a)),l=Math.ceil(a/s),a=s*l,n=Math.ceil(c/s),o=Math.ceil(u/l))}function B(){let E=p/d,Q=e-E;f+=5e3*Math.sign(Q)*Math.sqrt(Math.abs(Q)),f=Math.max(f,8192)}function _(E){A>=0&&E!=null&&Number.isFinite(E)&&E>0&&(p+=E,d++),A++,A%a===0&&(d&&(B(),h()),p=0,d=0,A=0);let Q=A===a-1,w=A%s,x=Math.floor(A/s)%l;return{xIndex:w,yIndex:x,columns:s,rows:l,x:w*n,y:x*o,tileWidth:n,tileHeight:o,isFirstTile:A===0,isLastTile:Q,samplesPerFrame:r}}return{nextTile:_,reset:m,setSize:g,setMaxTiles(E){t=E},setDesiredMsPerTile(E){e=E},getDesiredMsPerTile(){return e}}}function hf(i,e,t,A,a,r){let n=[i,e],o=t>0?A/t:1,s=hn(o,.25,4),l=Math.sqrt(s),c=s/l,u=Math.ceil(l*a[0]),p=Math.ceil(c*a[1]),d=1;u>n[0]*2&&(d*=Math.floor(u/n[0])),u=Math.min(u,n[0]),p>n[1]*2&&(d*=Math.floor(p/n[1])),p=Math.min(p,n[1]);let f=Math.round(i/u),m=Math.round(e/p);u=Math.ceil(i/f),p=Math.ceil(e/m);let g=m*f;return g>r&&(g=r,f=Math.ceil(Math.sqrt(g)),m=Math.ceil(g/f),g=f*m,u=Math.ceil(i/f),p=Math.ceil(e/m)),{tileWidth:u,tileHeight:p,columns:f,rows:m,numTiles:g,samplesPerFrame:d}}var Wo=262144;function Bf(i,e){let t=i>0&&e>0?i/e:1;return[Math.min(i,Math.max(1,Math.round(Math.sqrt(Wo*t)))),Math.min(e,Math.max(1,Math.round(Math.sqrt(Wo/t))))]}function Yo(){let i=1,e=-1,t=-1,A=0,a=0,r=[64,64],n=0,o=0,s=0,l=0,c=0,u=1,p=0,d=0,f=1/0;function m(){e++;let g=a>0?A/a:t;if(e%i===0&&(e=0),e===0){let E=hf(n,o,g,s,t>=0?r:Bf(n,o),f);A=0,a=0,l=E.tileWidth,c=E.tileHeight,p=E.columns,d=E.rows,i=E.numTiles,u=E.samplesPerFrame}let h=e%p,B=Math.floor(e/p)%d,_=e===i-1;return r=[l,c],{xIndex:h,yIndex:B,columns:p,rows:d,x:h*l,y:B*c,tileWidth:l,tileHeight:c,isFirstTile:e===0,isLastTile:_,samplesPerFrame:u}}return{nextTile:m,reset(){e=-1},setSize(g,h){n=g,o=h},setMaxTiles(g){f=g},setDesiredMsPerTile(g){s=g},needsUpdatePredicting(){t=-1,A=0,a=0},setLastTraceTime(g){t=g,a++,A+=g},getLastTraceTime(){return t},getDesiredMsPerTile(){return s}}}function vf(i){return i.getParameter(i.MAX_RENDERBUFFER_SIZE)<=8192?2e5:1e6}function jo(i=!1,e=!0){return`
@group(0) @binding(0) var<storage, read> colorBuffer: array<vec4f>;
@group(0) @binding(1) var<storage, read> normalBuffer: array<vec4f>;
@group(0) @binding(2) var<storage, read> albedoBuffer: array<vec4f>;
${ri}
@group(0) @binding(3) var<storage, read> shadowCatcherBuffer: array<ShadowCatcherAccumulation>;

@group(1) @binding(0) var<uniform> sampleCount: f32;
@group(1) @binding(1) var<uniform> sampleTileGrid: vec2u;

override outputWidth: f32;
override outputHeight: f32;

struct oU {
${i?`@location(0) foreground: vec4f,
@location(1) catcherBackground: vec4f`:`@location(0) color: vec4f,
@location(1) normal: vec4f,
@location(2) albedo: vec4f${e?`,
  @location(3) shadowCatcher: vec4f`:""}`}
}
@fragment
fn main(@builtin(position) fD: vec4f) -> oU {
let size = vec2u(u32(outputWidth), u32(outputHeight));
let fM = vec2u(u32(fD.x), size.y - u32(fD.y) - 1u);
var idx = fM.x + fM.y * size.x;




if (sampleCount < 1.0 && normalBuffer[idx].a <= 0.0) {
let uV = max(sampleTileGrid, vec2u(1u));
let uF = min(
((fM + uV / 2u) / uV) * uV,
((size - vec2u(1u)) / uV) * uV
);
let sz = uF.x + uF.y * size.x;
if (normalBuffer[sz].a > 0.0) {
idx = sz;
}
}
var output: oU;
if (normalBuffer[idx].a <= 0.0) {
${i?`output.foreground = vec4f(0.0);
output.catcherBackground = vec4f(0.0);`:`output.color = vec4f(0.0);
output.normal = vec4f(0.0);
output.albedo = vec4f(0.0);
${e?"output.shadowCatcher = vec4f(0.0);":""}`}
return output;
}
let color = colorBuffer[idx];
let normal = normalBuffer[idx];
let albedo = albedoBuffer[idx];
let hit = albedo.a;




let total = max(normal.a, 1.0);
${i?`
let shadow = shadowCatcherBuffer[idx];
let iQ = max(hit - shadow.mask.b, 0.0);


output.foreground = vec4f(
(color.rgb - shadow.background.rgb)
/ select(total, iQ, iQ > 0.0),
clamp((color.a - shadow.mask.g) / total, 0.0, 1.0)
);
output.catcherBackground = shadow.background / total;
`:`output.color = vec4f(


color.rgb / select(total, hit, hit > 0.0),
color.a / total
);

output.normal = vec4f(0.0);

if (dot(normal.rgb, normal.rgb) > 0.1) {
output.normal = vec4f(normal.rgb / total * 0.5 + 0.5, 1.0);
}
output.albedo = vec4f(albedo.rgb / total, clamp(hit / total, 0.0, 1.0));
${e?"output.shadowCatcher = shadowCatcherBuffer[idx].mask / total;":""}
`}
return output;
}
`}var mr=class{zeroTexture;_device;_pipeline;_layersPipeline;_foregroundTexture;_catcherBackgroundTexture;_colorTexture;_normalTexture;_albedoTexture;_shadowCatcherTexture;_uniformBindGroup;_uniformsBuffers;_width=1;_height=1;_hasCatcher=!1;_needsUpdatePipeline=!0;constructor(e,t){this.zeroTexture=t,this._device=e,this._uniformsBuffers={sampleCount:e.createBuffer({size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),sampleTileGrid:e.createBuffer({size:8,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})}}_retainedOutputs=new Set;retainOutput(e){["color","normal","albedo","shadowCatcher","foreground","catcherBackground"].some(A=>this.getOutput(A)===e)&&this._retainedOutputs.add(e)}releaseOutput(e){if(!this._retainedOutputs.delete(e))return;["color","normal","albedo","shadowCatcher","foreground","catcherBackground"].some(A=>this.getOutput(A)===e)||this._device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>e.destroy())}getOutput(e){return this[`_${e}Texture`]??this.zeroTexture}_createTextures(){let{_device:e,_width:t,_height:A}=this,a={size:{width:t,height:A,depthOrArrayLayers:1},format:"rgba8unorm",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC};this._destroyTextures(),this._colorTexture=e.createTexture({...a,label:"Ray Trace Color",format:"rgba16float",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC}),this._normalTexture=e.createTexture({...a,label:"Ray Trace Normal",usage:a.usage|GPUTextureUsage.COPY_SRC}),this._albedoTexture=e.createTexture({...a,label:"Ray Trace Albedo"}),this._hasCatcher?(this._foregroundTexture=e.createTexture({...a,label:"Ray Trace Foreground",format:"rgba16float"}),this._catcherBackgroundTexture=e.createTexture({...a,label:"Ray Trace Catcher Background",format:"rgba16float"}),this._shadowCatcherTexture=e.createTexture({...a,label:"Ray Trace Shadow Catcher",format:"rgba16float"})):this._foregroundTexture=this._catcherBackgroundTexture=this._shadowCatcherTexture=void 0}_updateBindGroups(){let e=this._device;this._uniformBindGroup=e.createBindGroup({layout:this._pipeline.getBindGroupLayout(1),entries:[{binding:0,resource:{buffer:this._uniformsBuffers.sampleCount}},{binding:1,resource:{buffer:this._uniformsBuffers.sampleTileGrid}}]})}_updatePipeline(){if(!this._needsUpdatePipeline)return;this._needsUpdatePipeline=!1;let e=this._device;this._pipeline=je(e).createRenderPipeline({label:"rayTraceOutput",layout:"auto",vertex:{module:je(e).createShaderModule({code:Ka}),entryPoint:"main"},fragment:{module:je(e).createShaderModule({code:jo(!1,this._hasCatcher)}),entryPoint:"main",targets:[{format:"rgba16float"},{format:"rgba8unorm"},{format:"rgba8unorm"},...this._hasCatcher?[{format:"rgba16float"}]:[]],constants:{outputWidth:this._width,outputHeight:this._height}}}),this._hasCatcher&&(this._layersPipeline=je(e).createRenderPipeline({label:"rayTraceLayers",layout:"auto",vertex:{module:je(e).createShaderModule({code:Ka}),entryPoint:"main"},fragment:{module:je(e).createShaderModule({code:jo(!0)}),entryPoint:"main",targets:[{format:"rgba16float"},{format:"rgba16float"}],constants:{outputWidth:this._width,outputHeight:this._height}}})),this._updateBindGroups()}setSize(e,t){(this._width!==e||this._height!==t||!this._colorTexture)&&(this._width=e,this._height=t,this._createTextures(),this._needsUpdatePipeline=!0)}setSampleCount(e){this._device.queue.writeBuffer(this._uniformsBuffers.sampleCount,0,new Float32Array([e]))}setSampleTileGrid(e,t){this._device.queue.writeBuffer(this._uniformsBuffers.sampleTileGrid,0,new Uint32Array([e,t]))}createPass(e,t,A=!1){this._hasCatcher!==A&&(this._hasCatcher=A,this._createTextures(),this._needsUpdatePipeline=!0),this._updatePipeline(),this._createOutputPass(e,t,!1),A&&this._createOutputPass(e,t,!0)}_createOutputPass(e,t,A){let a=A?this._layersPipeline:this._pipeline,r=A?[this._foregroundTexture,this._catcherBackgroundTexture]:[this._colorTexture,this._normalTexture,this._albedoTexture,...this._hasCatcher?[this._shadowCatcherTexture]:[]],n=e.beginRenderPass({colorAttachments:r.map(o=>({view:o.createView(),loadValue:{r:0,g:0,b:0,a:0},storeOp:"store",loadOp:"clear"}))});n.setPipeline(a),n.setBindGroup(0,this._device.createBindGroup({label:"rayTraceOutput",layout:a.getBindGroupLayout(0),entries:[t.color,t.normal,t.albedo,t.shadowCatcher].map((o,s)=>({binding:s,resource:{buffer:o,...s===3?{offset:t.shadowCatcherOffset??0}:{}}})).filter(o=>o.binding<3||this._hasCatcher||A)})),n.setBindGroup(1,A?this._device.createBindGroup({layout:a.getBindGroupLayout(1),entries:Object.values(this._uniformsBuffers).map((o,s)=>({binding:s,resource:{buffer:o}}))}):this._uniformBindGroup),n.draw(6,1,0,0),n.end()}_destroyTextures(){if(!this._colorTexture)return;let e=[this._colorTexture,this._normalTexture,this._albedoTexture,this._shadowCatcherTexture,this._foregroundTexture,this._catcherBackgroundTexture].filter(t=>!!t&&!this._retainedOutputs.has(t));this._device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>e.forEach(t=>t.destroy()))}getMemoryBytes(){let e=["color","normal","albedo","shadowCatcher","foreground","catcherBackground"];return Object.values(this._uniformsBuffers).reduce((t,A)=>t+A.size,0)+Array.from(new Set([...e.map(t=>this[`_${t}Texture`]),...this._retainedOutputs])).reduce((t,A)=>t+Mt(A),0)}dispose(){let e=Array.from(this._retainedOutputs);this._device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>e.forEach(t=>t.destroy())),this._destroyTextures(),this._retainedOutputs.clear(),Object.keys(this._uniformsBuffers).forEach(t=>{this._uniformsBuffers[t].destroy()})}};var wA=5,Fn={magFilter:"linear",minFilter:"linear"};function Ef(i){return new st("bright",i,{inputs:["colorTex"],outputs:["color"],uniforms:[{label:"threshold",type:"f32",data:1},{label:"scale",type:"f32",data:1}],fsDefine:`
fn st(a: vec4f, b: vec4f, c: vec4f) -> vec4f {
return a + b + c - min(min(a, b), c) - max(max(a, b), c);
}
`,fsMain:`

let d = vec3i(1, 1, 0);

var iX = load_colorTex(uv, 0);
let s1 = load_colorTex(uv - d.xz, 0);
let s2 = load_colorTex(uv + d.xz, 0);
let s3 = load_colorTex(uv - d.zy, 0);
let s4 = load_colorTex(uv + d.zy, 0);
iX = st(st(iX, s1, s2), s3, s4);


let lum = dot(iX.rgb, vec3f(0.2125, 0.7154, 0.0721));
var color: vec4f;
if (lum > threshold && iX.a > 0.0) {
color = vec4f(iX.rgb * scale, iX.a);
} else {

color = vec4f(vec3(0.0), iX.a);
}
output.color = color;
`})}function wf(i){return new st("downsample",i,{inputs:["colorTex"],outputs:["color"],uniforms:[],samplers:{linearSampler:i.createSampler(Fn)},fsDefine:`
fn vR(c: vec3f) -> f32 {
return max(max(c.r, c.g), c.b);
}
`,fsMain:`
let size = vec2f(colorTexRegion());
let d = vec4f(-1.0, -1.0, 1.0, 1.0) / size.xyxy;

output.color = sample_colorTex_linearSampler(uv2 + d.xy) * 0.25
+ sample_colorTex_linearSampler(uv2 + d.zy) * 0.25
+ sample_colorTex_linearSampler(uv2 + d.xw) * 0.25
+ sample_colorTex_linearSampler(uv2 + d.zw) * 0.25;
`})}function Vo(i){return new st("gaussian",i,{inputs:["colorTex"],outputs:["color"],uniforms:[{label:"direction",type:"vec2f",data:[1,0]},{label:"size",type:"f32",data:1}],samplers:{linearSampler:i.createSampler(Fn)},fsDefine:`
const vV = array<f32, 9>(0.07, 0.09, 0.12, 0.14, 0.16, 0.14, 0.12, 0.09, 0.07);
`,fsMain:`
let vK = vec2f(colorTexRegion());
let off = direction / vK * size;

var sum = vec4f(0.0);
var sZ = 0.0;
for (var i = 0; i < 9; i++) {
let w = vV[i];
sum += sample_colorTex_linearSampler(uv2 + off * f32(i - 4)) * w;
sZ += w;
}
output.color = sum / max(sZ, 0.01);
`})}function _f(i){return new st("blend",i,{inputs:["colorTex1","colorTex2"],outputs:["color"],uniforms:[{label:"weight",type:"f32",data:.3}],samplers:{linearSampler:i.createSampler(Fn)},fsMain:`
let vS = sample_colorTex1_linearSampler(uv2);
let vT = sample_colorTex2_linearSampler(uv2);
output.color = mix(vS, vT, weight);
`})}var On=class{_brightPass;_downsamplePasses=[];_blurHPasses=[];_blurVPasses=[];_blendPasses=[];constructor(e){this._brightPass=Ef(e);let t={color:{format:"rgba16float"}};this._brightPass.setOutputParams(t);for(let A=0;A<=wA;A++){let a=wf(e),r=Vo(e),n=Vo(e);if(a.setOutputParams(t),r.setOutputParams(t),n.setOutputParams(t),r.setUniform("direction",[1,0]),n.setUniform("direction",[0,1]),this._downsamplePasses.push(a),this._blurHPasses.push(r),this._blurVPasses.push(n),A>0){let o=_f(e);o.setOutputParams(t),this._blendPasses.push(o)}}}reserveCapacity(){[this._brightPass,...this._downsamplePasses,...this._blurHPasses,...this._blurVPasses,...this._blendPasses].forEach(e=>e.reserveCapacity())}setSize(e,t){this._brightPass.setSize(e,t);for(let A=0;A<=wA;A++)this._downsamplePasses[A].setSize(e>>A+1,t>>A+1),this._blurHPasses[A].setSize(e>>A+1,t>>A+1),this._blurVPasses[A].setSize(e>>A,t>>A),A>0&&this._blendPasses[A-1].setSize(e>>A-1,t>>A-1)}setBrightThreshold(e){this._brightPass.setUniform("threshold",e)}setRadius(e){this._blendPasses.forEach(t=>{t.setUniform("weight",1-Math.max(Math.min(e**.3*.8,.8),0))}),[...this._blurHPasses,...this._blurVPasses].forEach(t=>{t.setUniform("size",Math.max(Math.min(e*2,1),.2))})}createPass(e,t){let A=this._brightPass,a=this._downsamplePasses,r=this._blendPasses,n=this._blurHPasses,o=this._blurVPasses;A.createPass(e,{colorTex:t});for(let s=0;s<=wA;s++){let l=(s===0?A:a[s-1]).getOutput("color");a[s].createPass(e,{colorTex:l})}for(let s=wA;s>=0;s--)n[s].createPass(e,{colorTex:a[s].getOutput("color")}),o[s].createPass(e,{colorTex:n[s].getOutput("color")});for(let s=wA-1;s>=0;s--)r[s].createPass(e,{colorTex1:(s===wA-1?o[wA]:r[s+1]).getOutput("color"),colorTex2:o[s].getOutput("color")});return r[0].getOutput("color")}getMemoryBytes(){return[this._brightPass,...this._downsamplePasses,...this._blurHPasses,...this._blurVPasses,...this._blendPasses].reduce((e,t)=>e+t.getMemoryBytes(),0)}dispose(){this._brightPass.dispose(),[...this._downsamplePasses,...this._blurHPasses,...this._blurVPasses,...this._blendPasses].forEach(e=>e.dispose())}getOutput(){return this._blendPasses[0].getOutput("color")}},qo=On;function Qf(i,e){return i.channels===e.channels&&i.type===e.type&&i.count===e.count&&i.atomic===e.atomic}var Jo=8,eA=class{_label;_device;_outputBuffers={};_outputParams={};_pipeline;_bindGroups=[];_needsUpdatePipeline=!0;_inputs=[];_outputs=[];_uniforms=[];_uniformsMap={};_uniformBuffers={};_capacityWidth=0;_capacityHeight=0;_reserveCapacity=!1;_width=10;_height=10;_execWidth;_execHeight;_workGroupSize=[Jo,Jo];_csCode="";_csMain;_csDefine;_groupOffsets={inputs:0,uniforms:1,outputs:2};constructor(e,t,A){this._label=e,this._device=t,this._csMain=A.csMain,this._csDefine=A.csDefine,this._inputs=A.inputs,this._outputs=A.outputs;let a=A.uniforms||[];this._uniforms=a,this._uniformsMap=this._uniforms.reduce((r,n)=>(r[n.label]=n,r),{}),a.forEach(r=>{let n=Ki(r.data,r.type);this._uniformBuffers[r.label]=t.createBuffer({label:this._label+"."+r.label,size:n.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this._device.queue.writeBuffer(this._uniformBuffers[r.label],0,n)})}setCSCode({csDefine:e,csMain:t}){this._csDefine=e,this._csMain=t,this._needsUpdatePipeline=!0}reserveCapacity(){this._reserveCapacity=!0,this._capacityWidth=this._width,this._capacityHeight=this._height}setSize(e,t){e=Math.max(1,Math.ceil(e)),t=Math.max(1,Math.ceil(t));let A=e!==this._width||t!==this._height;if(this._width=e,this._height=t,A){this._needsUpdatePipeline=!0;let a=Math.max(this._capacityWidth,e),r=Math.max(this._capacityHeight,t),n=a!==this._capacityWidth||r!==this._capacityHeight;if(this._capacityWidth=a,this._capacityHeight=r,this._reserveCapacity&&!n)return;for(let o in this._outputBuffers)this._outputBuffers[o].destroy();this._outputBuffers={}}}setExecuteSize(e,t){e=Math.max(1,Math.ceil(e)),t=Math.max(1,Math.ceil(t)),this._execWidth=e,this._execHeight=t}setOutputParams(e){this._invalidateChangedOutputBuffers(e),this._outputParams=e,this._needsUpdatePipeline=!0}setUniform(e,t){let A=this._uniformBuffers[e];this._device.queue.writeBuffer(A,0,Ki(t,this._uniformsMap[e].type))}getOutput(e){let t=this._outputBuffers;return t[e]||(t[e]=this._createBuffer(e,this._outputParams[e]||{})),t[e]}getMemoryBytes(){return[...Object.values(this._uniformBuffers),...Object.values(this._outputBuffers)].reduce((e,t)=>e+t.size,0)}dispose(){Object.keys(this._uniformBuffers).forEach(e=>{this._uniformBuffers[e].destroy()}),Object.keys(this._outputBuffers).forEach(e=>{this._outputBuffers[e].destroy()})}setWorkGroupSize(e,t){this._needsUpdatePipeline=e!==this._workGroupSize[0]||t!==this._workGroupSize[1],this._workGroupSize=[e,t]}_getActualWorkgroupSize(){return[Math.min(this._workGroupSize[0],this._execWidth??this._width),Math.min(this._workGroupSize[1],this._execHeight??this._height)]}_createBuffer(e,t){let A=t.channels??4,a=(this._reserveCapacity?this._capacityWidth*this._capacityHeight:this._width*this._height)*A*(t.count??1)*4;return this._device.createBuffer({label:this._label+"."+e,size:Math.max(a,80),usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC})}_invalidateChangedOutputBuffers(e){let t=this._outputBuffers,A=this._outputParams;for(let a in t)Qf(e[a]||{},A[a]||{})||(t[a].destroy(),delete t[a])}_updateOutputBuffers(e){let t=this._outputBuffers,A=this._outputParams;for(let a in A)!t[a]&&!e?.includes(a)&&(t[a]=this._createBuffer(a,A[a]))}_updatePipeline(e,t){if(!this._needsUpdatePipeline)return;this._needsUpdatePipeline=!1;let A=this._device,a=this._getFullCs(e,t);a!==this._csCode&&(this._csCode=a,this._pipeline=je(A).createComputePipeline({label:this._label,layout:"auto",compute:{module:je(A).createShaderModule({label:this._label,code:a}),entryPoint:"main"}}),this._updateBindGroups())}_getFullCs(e,t){let A=this._inputs,a=this._uniforms,r=0,n=this._groupOffsets={inputs:0,uniforms:0,outputs:0},o=this._getActualWorkgroupSize();A.length>0&&r++,a.length>0&&(n.uniforms=r,r++);function s(c){let{type:u="f32",channels:p}=c,d=p===1?u:`vec${p}${u[0]}`;return c.atomic&&(d=`atomic<${d}>`),d}return n.outputs=r,`
${A.sort().map((c,u)=>{let p=`@group(${n.inputs}) @binding(${u}) `,d=`in_${c}`;return t[c]==="texture"?`${p} var ${d}: texture_2d<f32>;`:`${p} var<storage, read> ${d}: array<${s(e[c])}>;`}).join(`
`)}
${this._uniforms.map((c,u)=>`@group(${n.uniforms}) @binding(${u}) var<uniform> ${c.label}: ${c.type};`).join(`
`)}

${this._outputs.map((c,u)=>`@group(${n.outputs}) @binding(${u}) var<storage, read_write> out_${c}: array<${s(this._outputParams[c]||{})}>;`).join(`
`)}
${this._csDefine??""}
@compute @workgroup_size(${o[0]}, ${o[1]}, 1)
fn main(@builtin(global_invocation_id) globalId: vec3u) {
${this._csMain}
}
`}_updateBindGroups(){let e=[],t=this._device,A=this._groupOffsets;this._uniforms.length>0&&(e[A.uniforms]=t.createBindGroup({label:this._label+".uniforms",layout:this._pipeline.getBindGroupLayout(A.uniforms),entries:this._uniforms.map((a,r)=>({binding:r,resource:{buffer:this._uniformBuffers[a.label]}}))})),this._bindGroups=e}createPass(e,t,A){this._updateOutputBuffers(Object.keys(A||{}));let a={...this._outputBuffers,...A},r=this._inputs.reduce((l,c)=>(l[c]=t[c].buffer?"buffer":"texture",l),{});this._updatePipeline(t,r);let n=this._groupOffsets;this._inputs.length>0&&(this._bindGroups[n.inputs]=this._device.createBindGroup({label:this._label+".inputs",layout:this._pipeline.getBindGroupLayout(n.inputs),entries:this._inputs.map((l,c)=>({binding:c,resource:t[l].buffer?{buffer:t[l].buffer}:t[l].texture.createView()}))})),this._bindGroups[n.outputs]=this._device.createBindGroup({label:this._label+".outputs",layout:this._pipeline.getBindGroupLayout(n.outputs),entries:this._outputs.map((l,c)=>({binding:c,resource:{buffer:a[l]}}))});let o=e.beginComputePass();o.setPipeline(this._pipeline),this._bindGroups.forEach((l,c)=>{o.setBindGroup(c,l)});let s=this._getActualWorkgroupSize();o.dispatchWorkgroups(Math.ceil((this._execWidth??this._width)/s[0]),Math.ceil((this._execHeight??this._height)/s[1]),1),o.end()}};var bf=`
@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var<storage, read_write> peakBits: atomic<u32>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) id: vec3u) {
let size = textureDimensions(inputTexture);
if (id.x >= size.x || id.y >= size.y) { return; }
let color = max(textureLoad(inputTexture, vec2i(id.xy), 0).rgb, vec3f(0.0));
let peak = max(color.r, max(color.g, color.b));
if (peak < 65504.0) {
atomicMax(&peakBits, bitcast<u32>(peak));
}
}
`,Nn=class{device;peakBuffer;readbackBuffer;pipeline;pending=!1;disposed=!1;lastSubmissionTime=-1/0;peakDisplayValue=0;constructor(e){this.device=e,this.peakBuffer=e.createBuffer({label:"HDR display peak",size:Uint32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST}),this.readbackBuffer=e.createBuffer({label:"HDR display peak readback",size:Uint32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),this.pipeline=e.createComputePipeline({label:"HDR display peak",layout:"auto",compute:{module:e.createShaderModule({label:"HDR display peak",code:bf}),entryPoint:"main"}})}encode(e,t,A,a,r=performance.now()){if(this.pending||r-this.lastSubmissionTime<500)return!1;this.pending=!0,this.lastSubmissionTime=r,e.clearBuffer(this.peakBuffer);let n=this.device.createBindGroup({label:"HDR display peak",layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:t.createView()},{binding:1,resource:{buffer:this.peakBuffer}}]}),o=e.beginComputePass({label:"HDR display peak"});return o.setPipeline(this.pipeline),o.setBindGroup(0,n),o.dispatchWorkgroups(Math.ceil(A/16),Math.ceil(a/16)),o.end(),e.copyBufferToBuffer(this.peakBuffer,0,this.readbackBuffer,0,Uint32Array.BYTES_PER_ELEMENT),!0}async resolve(){if(!(!this.pending||this.disposed))try{await this.readbackBuffer.mapAsync(GPUMapMode.READ);let e=this.readbackBuffer.getMappedRange(),t=new Uint32Array(e)[0],A=new ArrayBuffer(Float32Array.BYTES_PER_ELEMENT);new Uint32Array(A)[0]=t,this.peakDisplayValue=new Float32Array(A)[0],this.readbackBuffer.unmap()}catch{this.readbackBuffer.mapState==="mapped"&&this.readbackBuffer.unmap()}finally{this.pending=!1}}getPeakDisplayValue(){return this.peakDisplayValue}reset(){this.peakDisplayValue=0,this.lastSubmissionTime=-1/0}getMemoryBytes(){return this.peakBuffer.size+this.readbackBuffer.size}dispose(){this.disposed=!0,this.device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>{this.peakBuffer.destroy(),this.readbackBuffer.destroy()})}},Ko=Nn;var It=8,Br=`
struct JNLMParams {
size: vec2u,
colorSensitivity: f32,

dilation: f32,
}
@group(0) @binding(0) var<uniform> params: JNLMParams;
`,xf=`
${Br}
${ri}
@group(0) @binding(1) var<storage, read> accumulation: array<ShadowCatcherAccumulation>;
@group(0) @binding(2) var<storage, read> normalBuffer: array<vec4f>;
@group(0) @binding(3) var<storage, read_write> rawGuide: array<vec2f>;

@compute @workgroup_size(${It}, ${It}, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
let size = params.size;
if (id.x >= size.x || id.y >= size.y) { return; }
let tT = id.x + (size.y - 1u - id.y) * size.x;
let n = normalBuffer[tT].a;
let moments = accumulation[tT].moments;
let mean = moments.x / max(n, 1.0);

var variance = -1.0;
if (n >= 2.0) {
variance = max(moments.y - n * mean * mean, 0.0) / (n * (n - 1.0));
}
rawGuide[id.x + id.y * size.x] = vec2f(mean, variance);
}
`,Cf=`
${Br}
@group(0) @binding(1) var<storage, read> rawGuide: array<vec2f>;
@group(0) @binding(2) var<storage, read_write> guide: array<vec2f>;

@compute @workgroup_size(${It}, ${It}, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
let size = params.size;
if (id.x >= size.x || id.y >= size.y) { return; }
let center = rawGuide[id.x + id.y * size.x];
var lk = 0.0;
var iY = 0.0;
var mO = 0.0;
var iS = 0.0;
for (var dy = -1; dy <= 1; dy++) {
for (var dx = -1; dx <= 1; dx++) {
let q = clamp(vec2i(id.xy) + vec2i(dx, dy), vec2i(0), vec2i(size) - 1);
let value = rawGuide[u32(q.x) + u32(q.y) * size.x];
mO += value.x;
iS += value.x * value.x;
if (value.y >= 0.0) {
lk += value.y;
iY += 1.0;
}
}
}
var variance: f32;
if (center.y >= 0.0) {
variance = lk / iY;
} else {
let lj = mO / 9.0;
variance = max(iS / 9.0 - lj * lj, 0.0) * 9.0 / 8.0;
}
guide[id.x + id.y * size.x] = vec2f(center.x, variance);
}
`,yf=`
${Br}
@group(0) @binding(1) var colorTex: texture_2d<f32>;
@group(0) @binding(2) var<storage, read_write> outColor: array<vec4f>;

@compute @workgroup_size(${It}, ${It}, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
if (id.x >= params.size.x || id.y >= params.size.y) { return; }
outColor[id.x + id.y * params.size.x] = textureLoad(colorTex, vec2i(id.xy), 0);
}
`;function Mf({searchRadius:i,patchRadius:e,albedoBandwidth:t,normalBandwidth:A}=nA){let a=(2*e+1)**2;return`
${Br}
@group(0) @binding(1) var<storage, read> guide: array<vec2f>;
@group(0) @binding(2) var<storage, read> color: array<vec4f>;
@group(0) @binding(3) var albedoTex: texture_2d<f32>;
@group(0) @binding(4) var normalTex: texture_2d<f32>;
@group(0) @binding(5) var<storage, read_write> outColor: array<vec4f>;
@group(0) @binding(6) var<storage, read_write> outGuide: array<vec2f>;
@group(0) @binding(7) var shadowCatcherTex: texture_2d<f32>;

const SEARCH_RADIUS = ${i};
const PATCH_RADIUS = ${e};
const PATCH_SIZE = ${a};

const VARIANCE_CANCELLATION = 1.0;

const INV_ALBEDO_BANDWIDTH2 = ${(1/t**2).toFixed(6)};
const INV_COVERAGE_BANDWIDTH2 = ${(1/.1**2).toFixed(6)};
const INV_NORMAL_BANDWIDTH2 = ${(1/A**2).toFixed(6)};


const CENTER_WEIGHT_MIN = 0.01;

fn ha(p: vec2i) -> u32 {
let q = clamp(p, vec2i(0), vec2i(params.size) - 1);
return u32(q.x) + u32(q.y) * params.size.x;
}

fn ln(q: vec2i, bs: vec4f, gO: vec3f) -> f32 {
let albedo = textureLoad(albedoTex, q, 0);


let oW = max((albedo.rgb + bs.rgb) * 0.5, vec3f(${.02}));
let kU = (albedo.rgb - bs.rgb) / oW;
let iP = albedo.a - bs.a;
let le = textureLoad(normalTex, q, 0).rgb - gO;
return max(
dot(kU, kU) * INV_ALBEDO_BANDWIDTH2
+ iP * iP * INV_COVERAGE_BANDWIDTH2,
dot(le, le) * INV_NORMAL_BANDWIDTH2
);
}

fn premultiplied(c: vec4f) -> vec4f {
return vec4f(c.rgb * c.a, c.a);
}

@compute @workgroup_size(${It}, ${It}, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
let size = vec2i(params.size);
let p = vec2i(id.xy);
if (p.x >= size.x || p.y >= size.y) { return; }
let step = i32(params.dilation);
let bs = textureLoad(albedoTex, p, 0);
let fw = textureLoad(normalTex, p, 0);
let gO = fw.rgb;
let index = ha(p);


if (fw.a <= 0.0 && textureLoad(shadowCatcherTex, p, 0).r <= 0.0) {
outColor[index] = color[index];
outGuide[index] = guide[index];
return;
}

var kW: array<vec2f, PATCH_SIZE>;
var k = 0;
for (var dy = -PATCH_RADIUS; dy <= PATCH_RADIUS; dy++) {
for (var dx = -PATCH_RADIUS; dx <= PATCH_RADIUS; dx++) {
kW[k] = guide[ha(p + vec2i(dx, dy) * step)];
k++;
}
}
let k2 = params.colorSensitivity * params.colorSensitivity;

var sum = vec4f(0.0);
let gR = max(bs.rgb, vec3f(${.02}));
var mf = vec3f(0.0);
var gt = vec3f(0.0);
var hn = vec3f(0.0);
var pk = 0.0;
var gv = 0.0;
var nK = 0.0;
var kD = 0.0;
for (var sy = -SEARCH_RADIUS; sy <= SEARCH_RADIUS; sy++) {
for (var sx = -SEARCH_RADIUS; sx <= SEARCH_RADIUS; sx++) {
let q = p + vec2i(sx, sy) * step;
if (
(sx == 0 && sy == 0) ||
q.x < 0 || q.y < 0 || q.x >= size.x || q.y >= size.y
) { continue; }

let features = ln(q, bs, gO);
if (features > 16.0) { continue; }

var fT = 0.0;
k = 0;
for (var dy = -PATCH_RADIUS; dy <= PATCH_RADIUS; dy++) {
for (var dx = -PATCH_RADIUS; dx <= PATCH_RADIUS; dx++) {
let a = kW[k];
let b = guide[ha(q + vec2i(dx, dy) * step)];
let qL = a.x - b.x;
fT += (qL * qL
- VARIANCE_CANCELLATION * (a.y + min(a.y, b.y)))
/ (1e-10 + k2 * (a.y + b.y));
k++;
}
}
fT /= f32(PATCH_SIZE);

let weight = exp(-max(max(fT, 0.0), features));
let index = ha(q);
let c = color[index];
let g = guide[index];

let a = (textureLoad(albedoTex, q, 0).rgb - bs.rgb) / gR;
let value = premultiplied(c);
sum += value * weight;
mf += a * weight;
gt += a * a * weight;
hn += a * value.rgb * weight;
pk += g.x * weight;
gv += g.y * weight * weight;
nK += weight;
kD = max(kD, weight);
}
}



let center = color[index];
let kV = guide[index];
let dF = max(kD, CENTER_WEIGHT_MIN);
let totalWeight = nK + dF;
let tF = premultiplied(center);
let mean = (sum + tF * dF) / totalWeight;


let ez = mf / totalWeight;
let lo = max(gt / totalWeight - ez * ez, vec3f(0.0));
let qm = hn / totalWeight - ez * mean.rgb;



let qw = bs.rgb + ez * gR;
let oq = mean.rgb * gR / max(qw, vec3f(${.02}));
let vs = clamp(qm / (lo + vec3f(${1e-4})), vec3f(0.0), oq);
let rs = mean.rgb - vs * ez;
let filtered = vec4f(max(rs, vec3f(0.0)), max(mean.a, 0.0));
let rgb = select(
center.rgb,
filtered.rgb / max(filtered.a, 1e-6),
filtered.a > 1e-6
);
outColor[index] = vec4f(rgb, filtered.a);
outGuide[index] = vec2f(
(pk + kV.x * dF) / totalWeight,
(gv + kV.y * dF * dF)
/ (totalWeight * totalWeight)
);
}
`}var Xo=4,gr=class{_device;_paramsBuffers=[];_guidePipeline;_variancePipeline;_loadColorPipeline;_filterPipeline;_filterShapeKey="";_guides=[];_colors=[];_width=0;_height=0;constructor(e){this._device=e;for(let t=0;t<=Xo;t++)this._paramsBuffers.push(e.createBuffer({label:"JNLM params",size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}));this._guidePipeline=this._createPipeline("JNLM guide",xf),this._variancePipeline=this._createPipeline("JNLM variance",Cf),this._loadColorPipeline=this._createPipeline("JNLM load color",yf)}_createPipeline(e,t){return je(this._device).createComputePipeline({label:e,layout:"auto",compute:{module:je(this._device).createShaderModule({label:e,code:t}),entryPoint:"main"}})}_getFilterPipeline(e){let t=JSON.stringify(e);return(!this._filterPipeline||t!==this._filterShapeKey)&&(this._filterPipeline=this._createPipeline("JNLM filter",Mf(e)),this._filterShapeKey=t),this._filterPipeline}reserveCapacity(){}_ensureBuffers(e,t){if(e<=this._width&&t<=this._height&&this._colors.length)return;e=Math.max(e,this._width),t=Math.max(t,this._height),this._destroyBuffers();let A=e*t,a=(r,n)=>this._device.createBuffer({label:r,size:A*n,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC});this._guides=[a("JNLM guide A",8),a("JNLM guide B",8)],this._colors=[a("JNLM color A",16),a("JNLM color B",16)],this._width=e,this._height=t}_destroyBuffers(){for(let e of[...this._guides,...this._colors])e.destroy();this._guides=[],this._colors=[]}encode(e,t){let{width:A,height:a,shape:r}=t;this._ensureBuffers(A,a);let n=Math.min(Math.max(Math.round(r.iterations),1),Xo),o=.6*Math.max(t.strength,.001);this._paramsBuffers.forEach((x,M)=>{let P=new ArrayBuffer(16);new Uint32Array(P,0,2).set([A,a]),new Float32Array(P,8,2).set([o,ga(Math.max(M-1,0))]),this._device.queue.writeBuffer(x,0,P)});let s=this._device,l=this._getFilterPipeline(r),c=(x,M,P)=>s.createBindGroup({layout:x.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:M}},...P.map((D,V)=>({binding:V+1,resource:D}))]}),[u,p]=this._guides,[d,f]=this._colors,m=this._paramsBuffers[0],g=[[this._guidePipeline,c(this._guidePipeline,m,[{buffer:t.accumulation},{buffer:t.normalAccumulation},{buffer:p}])],[this._variancePipeline,c(this._variancePipeline,m,[{buffer:p},{buffer:u}])],[this._loadColorPipeline,c(this._loadColorPipeline,m,[t.color.createView(),{buffer:d}])]],h=t.albedo.createView(),B=t.normal.createView(),_=t.shadowCatcher.createView(),E=[u,p],Q=[d,f];for(let x=1;x<=n;x++)g.push([l,c(l,this._paramsBuffers[x],[{buffer:E[0]},{buffer:Q[0]},h,B,{buffer:Q[1]},{buffer:E[1]},_])]),E=[E[1],E[0]],Q=[Q[1],Q[0]];let w=e.beginComputePass({label:"JNLM denoise"});for(let[x,M]of g)w.setPipeline(x),w.setBindGroup(0,M),w.dispatchWorkgroups(Math.ceil(A/It),Math.ceil(a/It));return w.end(),Q[0]}getMemoryBytes(){return[...this._paramsBuffers,...this._guides,...this._colors].reduce((e,t)=>e+t.size,0)}dispose(){for(let e of this._paramsBuffers)e.destroy();this._destroyBuffers()}};var Pf=`
if (globalId.x >= u32(imageSize.x) || globalId.y >= u32(imageSize.y)) { return; }
let index = globalId.x + globalId.y * u32(imageSize.x);
let raw = textureLoad(in_albedo, vec2u(globalId.xy), 0);
let linear = clamp(raw.rgb, vec3f(0.0), vec3f(1.0));
let encoded = select(
1.055 * pow(linear, vec3f(1.0 / 2.4)) - 0.055,
12.92 * linear,
linear <= vec3f(0.0031308)
);
out_albedo[index] = vec4f(encoded, raw.a);
`,If=`
if (globalId.x >= u32(imageSize.x) || globalId.y >= u32(imageSize.y)) { return; }
let index = globalId.x + globalId.y * u32(imageSize.x);
let filtered = in_albedo[index];
let encoded = clamp(filtered.rgb, vec3f(0.0), vec3f(1.0));
let linear = select(
pow((encoded + 0.055) / 1.055, vec3f(2.4)),
encoded / 12.92,
encoded <= vec3f(0.04045)
);
var result = linear;
let jc = textureLoad(in_rawAlbedo, vec2i(globalId.xy), 0).a;
if (preserveSurfaceTexture != 0u) {



let fM = vec2i(globalId.xy);
let center = textureLoad(in_rawNormal, fM, 0);
let n = normalize(center.rgb * 2.0 - 1.0 + vec3f(1e-8));
var mS = 0.0;
for (var y = -1; y <= 1; y++) {
for (var x = -1; x <= 1; x++) {
let tO = textureLoad(in_rawNormal,
clamp(fM + vec2i(x, y), vec2i(0), imageSize - 1), 0);
let nn = normalize(tO.rgb * 2.0 - 1.0 + vec3f(1e-8));
mS = max(mS,
max(1.0 - dot(n, nn), abs(center.a - tO.a)));
}
}
let ug = smoothstep(0.02, 0.1, mS);
let raw = clamp(textureLoad(in_rawAlbedo, fM, 0).rgb,
vec3f(0.0), vec3f(1.0));
result = mix(raw, linear, ug);
}
out_albedo[index] = vec4f(result, jc);
`,Df=`
if (globalId.x >= u32(imageSize.x) || globalId.y >= u32(imageSize.y)) { return; }
let index = globalId.x + globalId.y * u32(imageSize.x);
out_normal[index] = vec4f(clamp(in_normal[index].rgb, vec3f(0.0), vec3f(1.0)), 1.0);
`;function Sf(i){try{let e=i.createQuerySet({type:"timestamp",count:2}),t=i.createBuffer({size:e.count*8,usage:GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC}),A=i.createBuffer({size:t.size,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});return{querySet:e,resolveBuffer:t,resultBuffer:A}}catch(e){console.error(e);return}}function Tf(i,e,t,A,a,r){let n=()=>{},o=!1,s=0,l=!1,c=0,u=0,p=32,d,f=0,m,g=Promise.resolve(),h=!0,B=!1,_=!0,E=!1,Q=0,w=0,x=0,M=0,P={},D,V=0,$=!1,v=[0,0,0,0],U=[0,0,0,0],I,N=!1,q=new Ya(e),O=!1,te=21,le=0,Le=1,ge=.6,xe=1,Be=0,oe=1,ue=1,De=0,X=0,ve=0,Oe=!1,de=!1,re="final",ze=y.create(),Fe=1,Ce=performance.now(),ye=0,ne,Z,Ne=!1,at=!1,vt,AA,ee=0,Re=!1,Ye;function S(){vt?.abort(),vt=void 0,ee++;let b=Ye;if(Ye=void 0,b)try{b.abort()}finally{b.finish()}}function J(b,T){return b!==ee?Promise.resolve():new Promise((R,F)=>{let H=!1,W,Ae=()=>{H||(H=!0,Ye===W&&(Ye=void 0),R())},Me=se=>{H||(H=!0,Ye===W&&(Ye=void 0),F(se))};try{let se=T(Ae,Me);if(W={abort:se,finish:Ae},H)return;if(b!==ee){se(),Ae();return}Ye=W}catch(se){Ye===W&&(Ye=void 0),H=!0,F(se)}})}let he=A.context,Pe=e.features.has("timestamp-query")?a.get("trace timing",()=>{let b=Sf(e);return{query:b,getMemoryBytes:()=>b?b.resolveBuffer.size+b.resultBuffer.size:0,dispose(){b?.querySet.destroy(),b?.resolveBuffer.destroy(),b?.resultBuffer.destroy()}}}).query:void 0,ce=pr(),Ee=Pe?Yo():void 0;ce.setDesiredMsPerTile(te),Ee?.setDesiredMsPerTile(te);function Et(){f++,Ee?.needsUpdatePredicting(),m=void 0,_=s===0,E=!1}let xA=a.get("empty texture",()=>{let b=e.createTexture({label:"Shared empty image",size:{width:1,height:1},format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING});return{texture:b,getMemoryBytes:()=>4,dispose:()=>b.destroy()}}).texture,wt=new mr(e,xA),Qe=b=>wt.getOutput(b),ct,ra=a.get("rawOutputPass",()=>new st("raw output",e,{textureWillBeRead:!0,inputs:["colorTex","coverageTex"],outputs:["color"],uniforms:[{label:"flatBackgroundColor",type:"vec4f",data:[0,0,0,0]}],fsMain:`
var color = load_colorTex(uv, 0);
let coverage = clamp(load_coverageTex(uv, 0).a, 0.0, 1.0);
if (flatBackgroundColor.a > 0.5 && coverage > 0.0) {
color = vec4f(color.rgb * coverage, color.a);
}
output.color = color;
`})),ft=a.get("readbackPass",()=>new st("output readback",e,{textureWillBeRead:!0,inputs:["inputTex"],outputs:["color"],fsMain:"output.color = load_inputTex(uv, 0);"}));ft.setOutputParams({color:{format:"rgba32float"}});let Pr,fe=a.get("composePass",()=>new st("compose",e,{textureWillBeRead:!0,fsMain:ko+Go,fsDefine:zo,uniforms:[{label:"exposure",type:"f32",data:xe},{label:"toneMappingParams",type:"vec2f",data:[Be,ve]},{label:"hdrOutputEnabled",type:"f32",data:0},{label:"colorGradingParams",type:"vec4f",data:[oe,ue,De,X]},{label:"flatBackgroundColor",type:"vec4f",data:[0,0,0,0]},{label:"shadowCatcherColor",type:"vec3f",data:ze},{label:"shadowCatcherAlpha",type:"f32",data:Fe},{label:"shadowCatcherEnabled",type:"f32",data:0},{label:"bloomIntensity",type:"f32",data:.25}],outputs:["color","denoiseColor","denoiseAlbedo"],inputs:["colorTex","foregroundTex","catcherBackgroundTex","flatBackgroundMaskTex","shadowCatcherTex","bloomTex"]})),iA="rgba8unorm";fe.setOutputParams({color:{format:iA},denoiseColor:{format:"rgba32float"},denoiseAlbedo:{format:"rgba8unorm"}});let ot=a.get("compositeDenoiseDisplayPass",()=>new st("OIDN composed display",e,{textureWillBeRead:!0,fsMain:Ho,fsDefine:Ln,uniforms:[{label:"hdrOutputEnabled",type:"f32",data:0},{label:"denoisedAlpha",type:"f32",data:0}],outputs:["color"],inputs:["colorTex","composedTex"]}));ot.setOutputParams({color:{format:"rgba8unorm"}});let Bi=[{label:"imageSize",type:"vec2i",data:new Int32Array([1,1])}],na=a.get("oidnAlbedoEncodePass",()=>new eA("OIDN albedo sRGB encode",e,{inputs:["albedo"],outputs:["albedo"],uniforms:Bi,csMain:Pf})),vi=a.get("oidnAlbedoDecodePass",()=>new eA("OIDN albedo sRGB decode",e,{inputs:["albedo","rawAlbedo","rawNormal"],outputs:["albedo"],uniforms:[...Bi,{label:"preserveSurfaceTexture",type:"u32",data:0}],csMain:If})),sa=a.get("oidnNormalSanitizePass",()=>new eA("OIDN normal sanitize",e,{inputs:["normal"],outputs:["normal"],uniforms:Bi,csMain:Df}));na.setOutputParams({albedo:{channels:4}}),vi.setOutputParams({albedo:{channels:4}}),sa.setOutputParams({normal:{channels:4}});let Ei=a.get("outputPass",()=>new st("output",e,{fsMain:`
let vF = min(
vec2i(uv2 * vec2f(colorTexRegion())),
vec2i(colorTexRegion()) - vec2i(1)
);
var color = load_colorTex(vF, 0);
color = vec4(color.rgb * color.a, color.a);
output.color = color;
`,outputs:["color"],inputs:["colorTex"]}));Ei.setOutputParams({color:{format:"rgba8unorm"}});function El(b,T){Ei.setRenderToScreen(he.getCurrentTexture(),A.format),Ei.createPass(b,{colorTex:T})}function wl(b,T){let R=u+c,F=EA(R,2)-.5,H=EA(R,3)-.5;t.setJitter(F/b,H/T)}function es(b,T){let R=e.createCommandEncoder();t.setSampleCount(u+c),t.setSampleSequenceOffset(c),wl(Q,w);let F=Pe,H=F?.resultBuffer.mapState==="unmapped";t.createPass(R,b,T,F?{querySet:F.querySet}:void 0),F&&(R.resolveQuerySet(F.querySet,0,F.querySet.count,F.resolveBuffer,0),H&&R.copyBufferToBuffer(F.resolveBuffer,0,F.resultBuffer,0,F.resultBuffer.size)),e.queue.submit([R.finish()]);let W=Ee,Ae=f;if(F&&H&&W){let Me=T[0]*T[1];g=F.resultBuffer.mapAsync(GPUMapMode.READ).then(()=>{let se=F.resultBuffer.getMappedRange(),be=new BigInt64Array(se,0,2),$e=Math.max(Number(be[1]-be[0])/1e6,.1);!B&&Ae===f&&!h&&(m={tileTimeMs:$e,tileTimePerSampleMs:$e,estimatedFullFrameTimeMs:$e*Me,tileCount:Me},W.setLastTraceTime($e)),F.resultBuffer.unmap()}).catch(()=>{F.resultBuffer.mapState==="mapped"&&F.resultBuffer.unmap()})}}function ts(){O=!1}function Ir(){Ne&&(S(),O=!1)}function _l(b,T,R){if(!T)return;let F=a.get("denoised conversion",()=>new qa(e));return R=F.get(Q,w),F.setRegion(Q,w),b.copyBufferToTexture({buffer:T,bytesPerRow:16*Q},{texture:R},{width:Q,height:w,depthOrArrayLayers:1}),R}function CA(b,T,R){let F=T.width*T.height*16;return(!R||R.size!==F)&&(R?.destroy(),R=e.createBuffer({label:"Persistent denoised output",size:F,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC})),b.copyBufferToBuffer(T.data,0,R,0,F),R}function Ql(){fe.setSize(Q,w),fe.setOutputParams({color:{format:iA},denoiseColor:{format:"rgba32float"},denoiseAlbedo:{format:"rgba8unorm"}}),fe.setUniform("exposure",xe),fe.setUniform("toneMappingParams",[Be,ve]),fe.setUniform("colorGradingParams",[oe,ue,De,X]),fe.setUniform("hdrOutputEnabled",+de),fe.setUniform("shadowCatcherColor",ze),fe.setUniform("shadowCatcherAlpha",Fe),ot.setSize(Q,w),ot.setOutputParams({color:{format:iA}}),ot.setUniform("hdrOutputEnabled",+de),ot.setUniform("denoisedAlpha",O&&Ne?+t.needsDenoiseAlpha():0)}function As(b,T,R,F=!1){let H=a.get(T,()=>new ZA(e)).get(Q*w*16,F);return b.copyTextureToBuffer({texture:R},{buffer:H,bytesPerRow:Q*16},{width:Q,height:w}),H}function yA(b,T,R=!1){let F=a.get(b,()=>new eA(`${b} copy`,e,{inputs:["guide"],outputs:["color"],uniforms:Bi,csMain:"if (globalId.x >= u32(imageSize.x) || globalId.y >= u32(imageSize.y)) {return;} out_color[globalId.x + globalId.y * u32(imageSize.x)] = textureLoad(in_guide, vec2i(globalId.xy), 0);"}));F.setOutputParams({color:{channels:4}}),F.setSize(Q,w),F.setUniform("imageSize",[Q,w]);let H=R?a.get(`${b} buffer`,()=>new ZA(e)).get(Q*w*16,!0):void 0,W=e.createCommandEncoder();return F.createPass(W,{guide:{texture:T,channels:4}},H?{color:H}:void 0),e.queue.submit([W.finish()]),H??F.getOutput("color")}function jt(b,T,R=!1){if(q.reset(),R&&(V=u,$=t.hasShadowCatcher(),U=v.slice()),fe.setUniform("flatBackgroundColor",U),ra.setUniform("flatBackgroundColor",U),V<1)return;Ql(),O&&(Z=_l(b,ne,Z)),R&&(wt.setSampleCount(u),wt.createPass(b,t.getOutputBuffer(),$)),fe.setUniform("shadowCatcherEnabled",+$);let F=Qe($?"foreground":"color"),H=O&&at&&Z?Z:Qe("color"),W=Qe("catcherBackground");if(O&&at&&Z&&$){let We=a.get("custom HDR layers",()=>new st("Custom HDR layers",e,{textureWillBeRead:!0,inputs:["originalTex","filteredTex","foregroundTex","backgroundTex"],outputs:["foreground","background"],fsMain:oo}));We.setOutputParams({foreground:{format:"rgba32float"},background:{format:"rgba32float"}}),We.setSize(Q,w),We.createPass(b,{originalTex:Qe("color"),filteredTex:Z,foregroundTex:F,backgroundTex:W}),F=We.getOutput("foreground"),W=We.getOutput("background")}let Ae=le>0,Me=u<10||u%10>0,se=a.get("bloom state",()=>({owner:void 0,settings:"",dispose(){}})),be=`${Le}/${ge}/${+(O&&at)}`,$e=Ae&&u>=10&&(!Me||se.owner!==P||se.settings!==be),Ze=le;$e?(ct||(ct=a.get("bloom",()=>new qo(e)),ct.setSize(Q,w)),ct.setSize(Q,w),se.owner=P,se.settings=be,ct.setBrightThreshold(Le),ct.setRadius(ge),ct.createPass(b,H)):Ae&&u<10&&(Ze=0),fe.setUniform("bloomIntensity",Ze),fe.createPass(b,{colorTex:H,foregroundTex:F,catcherBackgroundTex:W,flatBackgroundMaskTex:Qe("albedo"),shadowCatcherTex:Qe("shadowCatcher"),bloomTex:Ae&&ct?ct.getOutput():H}),O&&!at&&Ne&&Z&&ot.createPass(b,{colorTex:Z,composedTex:fe.getOutput("denoiseColor")});let ke=(O&&ne?at?fe.getOutput("color"):Ne?ot.getOutput("color"):Z:void 0)||fe.getOutput("color"),pe=de?Pr??=a.get("hdrPeak",()=>new Ko(e)):void 0,ut=pe?.encode(b,ke,Q,w)??!1;if(re==="normal"||re==="albedo"?ke=Qe(re):re==="shadowCatcher"&&(ke=Qe("shadowCatcher")),(ke.width<Q||ke.height<w)&&(ft.setSize(Q,w),ft.createPass(b,{inputTex:ke}),ke=ft.getOutput("color")),!(Re&&re==="final"&&!O&&N)){let We=Q,et=w;if(!I||I.width!==We||I.height!==et||I.format!==ke.format){let _t=I;I=e.createTexture({label:"Render complete image",size:{width:We,height:et},format:ke.format,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.COPY_SRC}),_t&&e.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>_t.destroy())}b.copyTextureToTexture({texture:ke},{texture:I},{width:We,height:et}),N=re==="final"&&O}let Dt=b.finish();e.queue.submit([Dt]),ut&&pe?.resolve()}function bl(b,T){if(S(),t.isCompilingShader())return h=!0,u=0,!0;t.setCamera(b);let R=h;if(R&&(O=!1,f++,d=void 0,t.setCamera(b),(Ee||ce).reset(),h=!1,u=0),t.updatePipeline(),t.isCompilingShader()||!t.isPipelineReady())return h=!0,u=0,!0;(!Re||h)&&ts(),E&&((Ee||ce).reset(),E=!1),s===0&&R&&Ee&&_&&Pe?.resultBuffer.mapState==="unmapped"&&((Ee||ce).reset(),E=!0,Ee.needsUpdatePredicting(),_=!1);let F=u;Il(!R);let H=T,W=Math.min(H,u+Math.max(s,1));do{let{xIndex:Ae,yIndex:Me,columns:se,rows:be,isFirstTile:$e,isLastTile:Ze,samplesPerFrame:ke}=(Ee||ce).nextTile(d);if(wt.setSampleTileGrid(se,be),s>0&&se*be===1?ke=W-u:o||(ke=1),se*be===1){t.setSampleTiles(1,1,0,0);let pe=0;for(;pe<ke&&u<H&&u<W;)es(u===0,[1,1]),u++,pe++}else t.setSampleTiles(se,be,Ae,Me),es(u===0&&$e,[se,be]),Ze&&u++}while(s>0&&u<W&&u<H);if(E)return u=0,!1;if(u!==F&&(!l||u>=H)){let Ae=e.createCommandEncoder();jt(Ae,u>=H,!0)}return u!==F&&n(u,F===0,p),!1}function is(b,T){return Math.ceil(b/T)*T}function xl(){if(!x||!M)return;t.useTarget(P);let b=1,T=is(Math.max(1,Math.round(x*b)),16),R=is(Math.max(1,Math.round(M*b)),16);if(T===Q&&R===w){t.setSize(T,R,x/M);return}S(),ts(),f++,Q=T,w=R,(Ee||ce).setSize(Q,w),t.setSize(Q,w,x/M),wt.setSize(Q,w),fe.setSize(Q,w),ot.setSize(Q,w),ct?.setSize(Q,w),V=0,u=0,V=0,h=!0}function Cl(b,T){b===x&&T===M||(x=b,M=T,Et(),xl(),Ei.setSize(x,M),h=!0)}function yl(b){let T=Array.isArray(b)&&b[3]>=.99999?b:void 0;v=T?[T[0],T[1],T[2],1]:[0,0,0,0]}function Ml(b){let T=b.exposure??1,R={agx:0,aces:1,cineon:2,reinhard:3,linear:4}[b.toneMapping??"agx"]??0,F=b.contrast??1,H=b.saturation??1,W=b.temperature??0,Ae=b.tint??0,Me=b.vignette??0;return T===xe&&R===Be&&F===oe&&H===ue&&W===De&&Ae===X&&Me===ve?!1:(Ir(),xe=T,Be=R,oe=F,ue=H,De=W,X=Ae,ve=Me,fe.setUniform("exposure",xe),fe.setUniform("toneMappingParams",[Be,ve]),fe.setUniform("colorGradingParams",[oe,ue,De,X]),!0)}function Pl(b){if(b===Oe)return!1;Ir(),Oe=b;let T=de;de=b&&A.supportsHDR;let R=de?"rgba16float":"rgba8unorm";return R!==iA&&(iA=R,fe.setOutputParams({color:{format:iA},denoiseColor:{format:"rgba32float"},denoiseAlbedo:{format:"rgba8unorm"}})),T!==de&&Pr?.reset(),ot.setOutputParams({color:{format:iA}}),ot.setUniform("hdrOutputEnabled",de?1:0),fe.setUniform("hdrOutputEnabled",de?1:0),T!==de}function Il(b){let T=performance.now(),R=f,F=ce;(typeof requestAnimationFrame=="function"?requestAnimationFrame:W=>setTimeout(()=>W(performance.now()),0))(()=>{p=Math.max(performance.now()-T-ye,ye>0?16:8),ye=0,R===f&&F===ce&&!h&&(d=b?p:void 0)})}function as(){typeof document<"u"&&document.hidden?Ce=performance.now():ye=performance.now()-Ce}function Dl(b){let T=ee;AA??=a.get("jnlm",()=>new gr(e));let R=t.getOutputBuffer(),F=e.createCommandEncoder({label:"JNLM denoise"}),H=AA.encode(F,{width:Q,height:w,accumulation:R.shadowCatcher,normalAccumulation:R.normal,color:fe.getOutput("denoiseColor"),albedo:Qe("albedo"),normal:Qe("normal"),shadowCatcher:Qe("shadowCatcher"),strength:b.strength,shape:b.shape});return ne=CA(F,{data:H,width:Q,height:w},ne),Ne=!0,O=!0,ot.setUniform("denoisedAlpha",+t.needsDenoiseAlpha()),jt(F,!1),e.queue.onSubmittedWorkDone().then(()=>T===ee)}function Sl(b,T,R){let F=ee,H=vt=new AbortController,W=()=>H.abort();R?.addEventListener("abort",W,{once:!0}),R?.aborted&&W();let Ae=(async()=>{if(H.signal.aborted)return!1;let Me=yA("Custom HDR input",Qe("color"),!0),se=Q,be=w,$e=yA("Custom albedo",Qe("albedo"),!0),Ze=yA("Custom normal",Qe("normal"),!0),ke=a.get("Custom output",()=>new ZA(e)).get(se*be*16,!0);if(await b.denoise({device:e,width:se,height:be,color:Me,albedo:$e,normal:Ze,output:ke},{signal:H.signal,schedule:T}),H.signal.aborted||B||F!==ee)return!1;let pe=a.get("custom coverage",()=>new eA("Custom coverage",e,{inputs:["filtered","original"],outputs:["color"],uniforms:Bi,csMain:lo}));pe.setOutputParams({color:{channels:4}}),pe.setSize(se,be),pe.setUniform("imageSize",[se,be]);let ut=e.createCommandEncoder({label:"Custom HDR result"});return pe.createPass(ut,{filtered:{buffer:ke,channels:4},original:{buffer:Me,channels:4}}),ne=CA(ut,{data:pe.getOutput("color"),width:se,height:be},ne),at=!0,Ne=!1,O=!0,jt(ut,!1),await e.queue.onSubmittedWorkDone(),!H.signal.aborted&&!B&&F===ee})();return r.add(Ae),Ae.finally(()=>{r.delete(Ae),R?.removeEventListener("abort",W),vt===H&&(vt=void 0)}).catch(()=>{}),Ae}function Tl(b,T,R="converged",F){if(S(),h||u<1)return Promise.resolve(!1);if(b.kind==="custom")return Sl(b.denoiser,R,F);if(at=!1,b.kind==="jnlm")return Dl(b.denoiser);let H=b.denoiser;ot.setUniform("denoisedAlpha",0);let W=ee,Ae={width:Q,height:w},Me=e.createCommandEncoder(),se=As(Me,"OIDN color input",fe.getOutput("denoiseColor"));e.queue.submit([Me.finish()]);for(let pe of[na,vi,sa])pe.setSize(Q,w),pe.setUniform("imageSize",[Q,w]);let be={...R!=="converged"?{tileOverlap:80,wholeImage:R==="every-sample"}:{},scheduling:R==="every-sample"?"event-loop":"animation-frame"};async function $e(){let pe=H.auxiliaryDenoisers;if(!pe)return{albedo:{data:yA("OIDN raw albedo",fe.getOutput("denoiseAlbedo")),...Ae},normal:{data:yA("OIDN raw normal",Qe("normal")),...Ae}};if(W!==ee)return;let ut=e.createCommandEncoder();na.createPass(ut,{albedo:{texture:fe.getOutput("denoiseAlbedo"),channels:4}}),e.queue.submit([ut.finish()]);let Dt;if(await J(W,(MA,aA)=>pe.albedo.tileExecute({...be,color:{data:na.getOutput("albedo"),...Ae},done(Vt){Dt=Vt,MA()},error:aA})),W!==ee||!Dt)return;let We=e.createCommandEncoder();vi.setUniform("preserveSurfaceTexture",0),vi.createPass(We,{albedo:{buffer:Dt.data,channels:4},rawAlbedo:{texture:fe.getOutput("denoiseAlbedo"),channels:4},rawNormal:{texture:Qe("normal"),channels:4}}),e.queue.submit([We.finish()]);let et;if(await J(W,(MA,aA)=>pe.normal.tileExecute({...be,color:{data:yA("OIDN raw normal",Qe("normal")),...Ae},done(Vt){et=Vt,MA()},error:aA})),W!==ee||!et)return;let _t=e.createCommandEncoder();return sa.createPass(_t,{normal:{buffer:et.data,channels:4}}),e.queue.submit([_t.finish()]),{albedo:{data:vi.getOutput("albedo"),...Ae},normal:{data:sa.getOutput("normal"),...Ae}}}function Ze(pe){return W!==ee?Promise.resolve():J(W,(ut,Dt)=>H.tileExecute({...be,color:{data:se,...Ae},albedo:pe.albedo,normal:pe.normal,progress(We,et,_t,MA,aA){if(W!==ee||R!=="converged"&&MA+1<aA)return;let Vt=e.createCommandEncoder();ne=CA(Vt,We,ne),Ne=!0,O=!0,jt(Vt,!1)},done(We){if(W===ee){let et=e.createCommandEncoder();ne=CA(et,We,ne),Ne=!0,O=!0,jt(et,!1)}ut()},error:Dt}))}function ke(){if(!T||W!==ee)return Promise.resolve();let pe=e.createCommandEncoder();ft.setSize(Q,w),ft.createPass(pe,{inputTex:Ne?ot.getOutput("color"):fe.getOutput("color")});let ut=As(pe,"OIDN alpha input",ft.getOutput("color"));return e.queue.submit([pe.finish()]),J(W,(Dt,We)=>T.tileExecute({...be,color:{data:ut,...Ae},denoiseAlpha:!0,progress(et,_t,MA,aA,Vt){if(W!==ee||R!=="converged"&&aA+1<Vt)return;let rs=e.createCommandEncoder();ne=CA(rs,et,ne),Ne=!1,O=!0,jt(rs,!1)},done(et){if(W===ee){let _t=e.createCommandEncoder();ne=CA(_t,et,ne),Ne=!1,O=!0,jt(_t,!1)}Dt()},error:We}))}return $e().then(async pe=>{pe&&W===ee&&await Ze(pe)}).then(()=>{if(W===ee&&t.needsDenoiseAlpha())return ke()}).then(()=>W===ee)}typeof document<"u"&&document.addEventListener("visibilitychange",as);function Rl(){B||(typeof document<"u"&&document.removeEventListener("visibilitychange",as),B=!0,f++,S(),Promise.all([e.queue.onSubmittedWorkDone().catch(()=>{}),g]).then(()=>{t.releaseTarget(P),ne?.destroy(),I?.destroy(),q.dispose(),wt.dispose()}))}function Ul(){t.useTarget(P),Q&&w&&t.setSize(Q,w,x/M),D&&(t.setQuality(D),t.setClamping(D.clamping),t.setTransmissiveOutputAlphaMin(D.transmissiveOutputAlphaMin),t.setBevelSamples(D.bevelSamples),t.setAlphaBlendStrategy(D.alphaBlendStrategy),t.setSamplingPattern(D.samplingPattern,D.maxSamples))}return{invalidateTiming:Et,invalidateDenoisedOutput(){S(),O=!1,Re=!1},configure(b){(!D||["bounces","bevel","bevelSamples","directLightCandidates","dispersionWavelengths","alphaBlendStrategy","samplingPattern","clamping","transmissiveOutputAlphaMin"].some(R=>D[R]!==b[R]))&&Et(),D={...b},te=Math.max(1,b.timeBudgetMs),o=b.allowMultipleSamplesPerFrame,ce.setDesiredMsPerTile(te),ce.setMaxTiles(b.maxTiles),Ee?.setDesiredMsPerTile(te),Ee?.setMaxTiles(b.maxTiles)},synchronizeBackground:yl,activate:Ul,canCompleteSampleWithin(b){return(m?.estimatedFullFrameTimeMs??p)<=b},get presentationComplete(){return!!I},get presentationDenoised(){return N},present(){if(!I)return;A.configure(de);let b=e.createCommandEncoder();Ei.setSize(i.width,i.height),El(b,q.output??I),e.queue.submit([b.finish()])},getMemory(){return{width:Q,height:w,bytes:t.getTargetMemoryBytes(P)+wt.getMemoryBytes()+Mt(I)+q.getMemoryBytes()+(ne?.size??0)}},isFirstFrame(){return h},restartSamples(){f++,S(),Re=!1,O=!1,N=!1,V=0,(Ee||ce).reset(),E=!1,h=!0,u=0},getOutputTexture(b){if(!(V<1))return b==="hdr"?Qe("color"):q.output??I},applyPostProcesses(b,T){I&&q.run(I,b,T)},trace:bl,drawPostProcess(){let b=e.createCommandEncoder();jt(b,!0)},performDenoise:Tl,cancelDenoise:S,setSize:Cl,setHDROutputEnabled:Pl,setToneMappingParams:Ml,async readPresentation(){if(!I)throw new Error("Render has no complete image.");let b=q.output??I,T=b.width,R=b.height,F=Math.ceil(T*16/256)*256,H=e.createBuffer({size:F*R,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),W=e.createCommandEncoder();ft.setSize(T,R),ft.createPass(W,{inputTex:b}),W.copyTextureToBuffer({texture:ft.getOutput("color")},{buffer:H,bytesPerRow:F},{width:T,height:R}),e.queue.submit([W.finish()]);try{await H.mapAsync(GPUMapMode.READ);let Ae=new Float32Array(H.getMappedRange()),Me=new Float32Array(T*R*4);for(let se=0;se<R;se++)Me.set(Ae.subarray(se*F/4,se*F/4+T*4),se*T*4);return{width:T,height:R,data:Me}}finally{H.unmap(),H.destroy()}},async readOutput(b){ra.setUniform("flatBackgroundColor",U);let T=Q,R=w,F=Math.ceil(T*16/256)*256,H=e.createBuffer({size:F*R,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),W=e.createCommandEncoder(),Ae=b==="denoised"&&O?ne:void 0;b==="denoised"&&!Ae&&(b="hdr");let Me=b==="hdr"?ra:ft;Me.setOutputParams({color:{format:"rgba32float"}}),Me.setSize(T,R),Ae?W.copyBufferToBuffer(Ae,0,H,0,T*R*16):b==="hdr"?ra.createPass(W,{colorTex:Qe("color"),coverageTex:Qe("albedo")}):ft.createPass(W,{inputTex:Qe(b)}),Ae||W.copyTextureToBuffer({texture:Me.getOutput("color")},{buffer:H,bytesPerRow:F},{width:T,height:R,depthOrArrayLayers:1}),e.queue.submit([W.finish()]);try{await H.mapAsync(GPUMapMode.READ);let se=new Float32Array(H.getMappedRange()),be=new Float32Array(T*R*4),$e=Ae?T*4:F/4;for(let Ze=0;Ze<R;Ze++)be.set(se.subarray(Ze*$e,Ze*$e+T*4),Ze*T*4);return{data:be,width:T,height:R}}finally{H.unmap(),H.destroy()}},setPreserveDenoisedOutput(b){Re=b},setOfflineRenderOptions(b){let T=s>0;s=Math.max(0,Math.round(b.samplesPerBatch)),l=b.deferPostProcess,c=Math.max(0,Math.round(b.sampleSequenceOffset)),s>0&&E&&((Ee||ce).reset(),E=!1),s>0?_=!1:T&&Et()},setVarianceMoments(b){t.setVarianceMoments(b)},setAdaptiveSamplingTargets(b){t.setAdaptiveSamplingTargets(b)},prepareOfflineAdaptiveSampling(b){return t.prepareOfflineAdaptiveSampling(b)},getTotalSamplesRendered(){return u},getDiagnostics(){return{...t.getDiagnostics(),hdrPresentation:{requested:Oe,active:A.hdr,peakDisplayValue:A.hdr?Pr?.getPeakDisplayValue():void 0},gpuTraceTiming:m}},async flushDiagnostics(){await e.queue.onSubmittedWorkDone(),await g},setBloomParams({intensity:b,threshold:T,radius:R}){let F=T!==Le||b!==le||R!==ge;return F&&Ir(),Le=T,le=b,ge=R,F},setShadowCatcherParams(b,T){let R=b[0]!==ze[0]||b[1]!==ze[1]||b[2]!==ze[2]||T!==Fe;return R&&(y.copy(ze,b),Fe=T,fe.setUniform("shadowCatcherColor",b),fe.setUniform("shadowCatcherAlpha",T)),R},setOnSampleRendered(b){n=b},setOutput(b){return re===b?!1:(re=b,!0)},dispose:Rl}}function $o(i,e,t={}){let A=new No(e),a=new Set,r=new ti(o=>{Promise.resolve().then(()=>Promise.allSettled([...a])).then(()=>e.queue.onSubmittedWorkDone()).catch(()=>{}).then(o)}),n=r.get("canvas",()=>new ja(i,e,t.presentationFormat??navigator.gpu.getPreferredCanvasFormat()));return Ja(A,()=>Tf(i,e,A,n,r,a),!1,r)}function di(i){if(typeof requestAnimationFrame=="function"){let t=requestAnimationFrame(i);return()=>cancelAnimationFrame(t)}let e=setTimeout(()=>i(performance.now()),16);return()=>clearTimeout(e)}var vr=class{renderer;readFrameBuffer=new uA;drawFrameBuffer=new uA;constructor(e){this.renderer=e}copy(e,t,A,a){a??=new we({type:e.storageType});let r=this.renderer.gl;a.ensureStorage(r,t,A,{type:e.storageType}),this.readFrameBuffer.bind(this.renderer,[e],r.READ_FRAMEBUFFER),this.drawFrameBuffer.bind(this.renderer,[a],r.DRAW_FRAMEBUFFER),(e.width<t||e.height<A)&&(r.disable(r.SCISSOR_TEST),r.clearColor(0,0,0,0),r.clear(r.COLOR_BUFFER_BIT));let n=Math.min(t,e.width),o=Math.min(A,e.height);return r.blitFramebuffer(0,0,n,o,0,0,n,o,r.COLOR_BUFFER_BIT,r.NEAREST),a}dispose(){this.readFrameBuffer.dispose(this.renderer),this.drawFrameBuffer.dispose(this.renderer)}};async function Zo(i,e,t,A){let a=i.createBuffer();if(!a)throw new Error("Unable to allocate depth readback buffer.");let r=null,n=new Float32Array(e*t*4),o=i.getParameter(i.PIXEL_PACK_BUFFER_BINDING);try{if(i.bindBuffer(i.PIXEL_PACK_BUFFER,a),i.bufferData(i.PIXEL_PACK_BUFFER,n.byteLength,i.STREAM_READ),i.readPixels(0,0,e,t,i.RGBA,i.FLOAT,0),i.bindBuffer(i.PIXEL_PACK_BUFFER,o),r=i.fenceSync(i.SYNC_GPU_COMMANDS_COMPLETE,0),!r)throw new Error("Unable to create depth readback fence.");i.flush();let s=performance.now();return await new Promise((l,c)=>{let u,p=m=>{clearTimeout(u),A.removeEventListener("abort",d),m?c(m):l()},d=()=>p(new Error("Depth query cancelled.")),f=()=>{if(A.aborted){d();return}let m=i.clientWaitSync(r,0,0);m===i.WAIT_FAILED||i.isContextLost()?p(new Error("Depth readback failed.")):m===i.ALREADY_SIGNALED||m===i.CONDITION_SATISFIED?p():performance.now()-s>5e3?p(new Error("Depth readback timed out.")):u=setTimeout(f,16)};A.addEventListener("abort",d,{once:!0}),u=setTimeout(f,0)}),i.bindBuffer(i.PIXEL_PACK_BUFFER,a),i.getBufferSubData(i.PIXEL_PACK_BUFFER,0,n),n}finally{i.bindBuffer(i.PIXEL_PACK_BUFFER,o),r&&i.deleteSync(r),i.deleteBuffer(a)}}function Hn(i,e,t,A){let a=A?new Uint8Array(e*t*4):new Float32Array(e*t*4);i.readPixels(0,0,e,t,i.RGBA,A?i.UNSIGNED_BYTE:i.FLOAT,a);let r=new Float32Array(a.length);for(let n=0;n<t;n++)for(let o=0;o<e*4;o++)r[n*e*4+o]=a[(t-n-1)*e*4+o]/(A?255:1);return r}var Te=class{_renderer;_bindings;_sourceShader;_outputs;_frameBuffer=new uA;_outputTextures={};_targetOutputs=new Map;useTarget(e){let t=this._targetOutputs.get(e);t||this._targetOutputs.set(e,t={}),this._outputTextures=t}_outputParams={};_reserveCapacity=!1;_capacityWidth=1;_capacityHeight=1;_width=1;_height=1;_renderToScreen=!1;constructor(e,t,A){this._renderer=t,this._sourceShader=A.shader,this._bindings=new Ii(this._samplingShader(A.shader)),this._outputs=A.outputs||A.shader.outputs,this.setOutputParams(Object.fromEntries(this._outputs.map(a=>[a,A.outputParams?.[a]||{}])))}reserveCapacity(){this._reserveCapacity||(this._reserveCapacity=!0,this._bindings=new Ii(this._samplingShader(this._sourceShader,!0,this._bindings.uniforms,this._bindings.defines)))}_samplingShader(e,t=!1,A=e.uniforms,a=e.defines){let r=Object.keys(e.uniforms).filter(o=>e.uniforms[o].type==="sampler2D");if(A={...A},t)for(let o of r)A[`${o}RegionSize`]={type:"ivec2",value:[1,1]};let n=new _e({name:e.name,outputs:e.outputs,defines:a,uniforms:A,includes:[{defines:{},uniforms:{},main:"",functions:[()=>uo(r,t),...e.functions]}],main:e.main});return n.parallelCompile=e.parallelCompile,n}setSize(e,t){this._width===e&&this._height===t||(this._width=Math.max(1,e),this._height=Math.max(1,t),this._capacityWidth=Math.max(this._capacityWidth,this._width),this._capacityHeight=Math.max(this._capacityHeight,this._height),this.setUniform("viewportSize",[this._width,this._height]))}setOutputs(e){for(let t of this._outputs)e.includes(t)||(this._outputTextures[t]?.dispose(this._renderer.gl),delete this._outputTextures[t]);this._outputs.splice(0,this._outputs.length,...e)}setOutputParams(e){this._outputParams=e}setRenderToScreen(e=!0){this._renderToScreen=e}setUniform(e,t){return this._bindings.set(e,t)}setUniforms(e){this._bindings.setUniforms(e)}getUniform(e){return this._bindings.get(e)}setDefines(e){let t=!1;for(let[A,a]of Object.entries(e)){let r=this._bindings.defines[A];a?r!==a&&(this._bindings.setDefine(A,a),t=!0):A in this._bindings.defines&&(this._bindings.deleteDefine(A),t=!0)}return t}_retainedOutputs=new Set;retainOutput(e){Object.values(this._outputTextures).includes(e)&&this._retainedOutputs.add(e)}releaseOutput(e){this._retainedOutputs.delete(e)&&(Object.values(this._outputTextures).includes(e)||e.dispose(this._renderer.gl))}getOutput(e){return this._outputTextures[e]}_prepareOutputs(e){let t=this._renderer.gl;for(let A of this._outputs){let a=e?.[A],r=this._outputTextures[A],n=r&&this._retainedOutputs.has(r)&&(r.width!==this._width||r.height!==this._height),o=a||(n?new we(this._outputParams[A]):void 0)||this._outputTextures[A]||new we(this._outputParams[A]);o.ensureStorage(t,this._reserveCapacity?this._capacityWidth:this._width,this._reserveCapacity?this._capacityHeight:this._height,this._outputParams[A]),this._outputTextures[A]=o,ei(o,this._width,this._height)}}createPass(e,t,A={}){let a=this._renderer,r=a.gl;this._renderToScreen?r.bindFramebuffer(r.FRAMEBUFFER,null):(this._prepareOutputs(t),this._frameBuffer.bind(a,this._outputs.map(o=>this._outputTextures[o])));let n=A.viewport||{x:0,y:0,width:this._width,height:this._height};if(a.setViewport(n.x,n.y,n.width,n.height),A.clear&&(r.disable(r.SCISSOR_TEST),r.clearColor(0,0,0,0),r.clear(r.COLOR_BUFFER_BIT)),A.scissor?(r.enable(r.SCISSOR_TEST),r.scissor(A.scissor.x,A.scissor.y,A.scissor.width,A.scissor.height)):r.disable(r.SCISSOR_TEST),this._reserveCapacity)for(let[o,s]of Object.entries(e)){let l=Va(s);this.setUniform(`${o}RegionSize`,[l.width,l.height])}this._bindings.setUniforms(e),this._bindings.bind(a),r.disable(r.DEPTH_TEST),A.blend?(r.enable(r.BLEND),r.blendEquation(r.FUNC_ADD),r.blendFunc(r.ONE,r.ONE)):r.disable(r.BLEND),r.drawArrays(r.TRIANGLES,0,3),r.disable(r.SCISSOR_TEST)}releaseTarget(e){let t=this._targetOutputs.get(e);if(t){this._targetOutputs.delete(e);for(let A of Object.values(t))A.dispose(this._renderer.gl);t===this._outputTextures&&(this._outputTextures={})}}getMemoryBytes(e){let t=e?this._targetOutputs.get(e)??{}:this._outputTextures;return Array.from(new Set([...Object.values(t),...this._retainedOutputs])).reduce((A,a)=>A+a.getMemoryBytes(),0)}dispose(){let e=this._renderer.gl;Array.from(new Set([this._outputTextures,...this._targetOutputs.values()])).flatMap(t=>Object.values(t)).forEach(t=>t.dispose(e)),this._retainedOutputs.forEach(t=>t.dispose(e)),this._retainedOutputs.clear(),this._frameBuffer.dispose(this._renderer)}};var pi=G`
#define PI 3.14159265359
#define TWOPI 6.28318530718
#define INVPI 0.31830988618
#define INVPI2 0.10132118364
#define EPS 0.0005
#define INF 1.0e999
#define INV4PI 0.07957747154594766

#define ROUGHNESS_MIN 0.001

`;var Gt=bt({uniforms:{lightsTex:C.uniform("sampler2D"),iesProfileData:C.uniform("sampler2D"),iesProfileColumns:C.uniform("int",1),pixelSize:C.uniform("vec2"),jitter:C.uniform("vec2"),sampleCount:C.uniform("int"),envLightSelectionPmf:C.uniform("float",0)},defines:{STANDARD:0,UNLIT:2,SHADOW_CATCHER:3,SPOT_LIGHT:4},main:G`

const vec3 luminance = vec3(0.2126, 0.7152, 0.0722);
const int vw = 8;

#define RAY_MAX_DISTANCE 9999.0

#define NO_UNROLL(X) (X + min(0, sampleCount))
#define NO_UNROLLU(X) (X + uint(min(0, sampleCount)))

struct Ray {
vec3 o;
vec3 d;
float tMax;
};

struct ad {
bool hit;
vec3 position;
vec3 normal; 
#ifdef NUM_COAT_NORMAL_MAPS
vec3 coatNormal;
#endif
vec3 vertexNormal; 
vec3 shadowOffset; 

vec2 uv;
vec2 uv1;

#ifdef USE_TANGENT
vec3 tangent;
#endif
vec3 directionTangent;
vec3 directionBitangent;
vec3 geometryTangent;
vec3 geometryBitangent;
vec3 faceNormal; 

bool isTransparency;



bool albedoSampled;

int triangleIndex;
int instanceIndex;
int materialIndex;

int mediumType;
vec3 mediumExtinction;
vec3 mediumScattering;
float mediumAnisotropy;
};




struct J {
int materialType;

float specularRoughness;
float baseMetalness;
vec3 baseColor;
float specularIor;
vec3 emission;
float transmissionWeight;
bool thinWalled;
float specularAnisotropy;
float alpha;

float transmissionDispersionScale;
float dispersionAbbeNumber;
float thinFilmThickness;
float thinFilmIor;
float thinFilmWeight;


int mediumType;
vec3 mediumExtinction;
vec3 mediumScattering;
float mediumAnisotropy;

float baseWeight;
float diffuseRoughness;
float specularWeight;
vec3 specularColor;
float subsurfaceWeight;
vec3 subsurfaceColor;
vec3 transmissionColor;
float fuzzWeight;
vec3 fuzzColor;
float fuzzRoughness;
float coatWeight;
vec3 coatColor;
float coatRoughness;
float coatAnisotropy;
vec2 anisotropyDirection;
bool anisotropyDirectionEnabled;
float coatAnisotropyRotation;
vec3 directionTangent;
vec3 directionBitangent;
vec3 geometryTangent;
vec3 geometryBitangent;
#ifdef NUM_COAT_NORMAL_MAPS
vec3 coatNormal;
bool coatNormalEnabled;
vec3 geometricNormal;
#endif
float coatIor;
float coatDarkening;

float bevel;


float relativeIor;
bool inside;
float alphaX;
float alphaY;
};


struct Light {
vec3 position;
vec3 emission;
vec3 u;
vec3 v;
float radius;
float area;
float type;
int textureIndex;
float spread;
float selectionPmf;
float selectionCdf;
vec3 iesReference;
};

void iw(inout Ray ray, vec3 origin, vec3 direction) {
ray.o = origin;
ray.d = direction;
ray.tMax = RAY_MAX_DISTANCE;
}


ivec2 gM(int i, int jt) {
ivec2 u;
u.y = i >> jt; 
u.x = i - (u.y << jt); 
return u;
}

vec4 ky(sampler2D s, int i, int jt) {
return texelFetch(s, gM(i, jt), 0);
}

ivec4 ky(highp isampler2D s, int i, int jt) {
return texelFetch(s, gM(i, jt), 0);
}

struct Path {
Ray ray;
vec3 li;
float alpha;
vec3 beta;
bool fromEye;
bool abort;
float scatteringPdf;
bool scatteringIsDelta;
bool isNextRefraction;
};

struct LightSampleRec {
vec3 normal;
vec3 emission;
vec3 direction;
float dist;
float pdf;
bool isDelta;
};


Light qp(int i) {
int firstTexel = i * 6;
vec4 pG = texelFetch(
lightsTex,
ivec2(firstTexel, 0),
0
);
vec4 pf = texelFetch(
lightsTex,
ivec2(firstTexel + 1, 0),
0
);
vec4 nF = texelFetch(
lightsTex,
ivec2(firstTexel + 2, 0),
0
);
vec4 lD = texelFetch(
lightsTex,
ivec2(firstTexel + 3, 0),
0
);
vec4 shape = texelFetch(
lightsTex,
ivec2(firstTexel + 4, 0),
0
);
return Light(
pG.xyz,
pf.xyz,
nF.xyz,
lD.xyz,
shape.x,
shape.y,
shape.z,
int(lD.w),
nF.w,
pG.w,
pf.w,
texelFetch(lightsTex, ivec2(firstTexel + 5, 0), 0).xyz
);
}

float cL(int dV, int lh) {
int ih = dV + lh / 4;
vec4 packed = texelFetch(
iesProfileData,
ivec2(ih % iesProfileColumns, ih / iesProfileColumns),
0
);
return packed[lh % 4];
}

float kI(int dV, vec2 uv) {
if (dV < 0) return 1.0;
vec2 fM = fract(uv) * 128.0 - 0.5;
ivec2 p0 = ivec2(floor(fM));
vec2 f = fract(fM);
int xa = p0.x < 0 ? 127 : p0.x;
int xb = p0.x >= 127 ? 0 : p0.x + 1;
int ya = p0.y < 0 ? 127 : p0.y;
int yb = p0.y >= 127 ? 0 : p0.y + 1;
float a = cL(dV, ya * 128 + xa);
float b = cL(dV, ya * 128 + xb);
float c = cL(dV, yb * 128 + xa);
float d = cL(dV, yb * 128 + xb);
return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float bL(Light light, vec3 dJ) {
vec3 axis = normalize(light.u);
float cc = dot(axis, dJ);
float tI = light.v.y > 1e-6
? smoothstep(light.v.x, light.v.x + light.v.y, cc)
: step(light.v.x, cc);
if (tI <= 0.0 || light.textureIndex < 0) return tI;
vec3 uc = light.iesReference;
vec3 vu = cross(axis, uc);
float vertical = acos(clamp(cc, -1.0, 1.0));
float horizontal = atan(dot(dJ, vu), dot(dJ, uc));
return tI * kI(light.textureIndex, vec2(vertical / PI, horizontal / TWOPI + 0.5));
}
`});var Ht=bt({uniforms:{materialBuffer:C.uniform("sampler2D"),materialBufferColumns:C.uniform("int",1),mapInfo:C.arrayUniform("vec4","NUM_MAPS"),mapTransform:C.arrayUniform("vec4","NUM_MAPS"),mapUvChannel:C.arrayUniform("float","NUM_MAPS"),mapColorLinear:C.arrayUniform("float","NUM_MAPS"),map:C.uniform("sampler2DArray")},defines:{NUM_MATERIALS:1},main:G`
${bs()}
#ifdef HAS_GLTF_ANISOTROPY
vec2 fb(float roughness, float strength) {
if (strength == 0.0) { return vec2(roughness, 0.0); }
float u = roughness * roughness;
float a = u + (1.0 - u) * strength * strength;
if (a == 0.0) { return vec2(0.0); }
return vec2(pow((a*a + u*u) * 0.5, 0.25), clamp(1.0 - u/a, 0.0, 1.0));
}

#endif

vec3 oB(vec3 c) {
return mix(pow(c * 0.9478672986 + 0.0521327014, vec3(2.4)), c * 0.0773993808, vec3(lessThan(c, vec3(0.04045))));
}
vec4 fetchMatData(int i) {
return ky(materialBuffer, i, materialBufferColumns);
}


float lg(float alpha, int alphaMode, float alphaCutoff) {
if (alphaMode == ${dt.opaque}) {
return 1.0;
}
if (alphaMode == ${dt.mask}) {
return alpha >= alphaCutoff ? 1.0 : 0.0;
}
return alpha;
}

float vU(int idx) {
return fetchMatData(idx * MAT_DATA_SIZE + MAT_ROW_COLOR).w;
}

vec2 ae(int val) {
return vec2(float(val >> 8), float(val & 0xff) / 255.0);
}

#ifdef NUM_MAPS
vec3 decodeMapColor(int index, vec3 c) {
if (mapColorLinear[index] > 0.5) { return c; }
return oB(c);
}

vec2 oa(int index) {
return mapInfo[index].xy;
}

float pj(int index) {
return floor(mapInfo[index].z);
}

vec2 nZ(int index) {
return vec2(fract(mapInfo[index].z), mapInfo[index].w);
}

vec2 sg(int index, vec2 uv) {
vec4 transform = mapTransform[index];
vec2 qz = fract(uv * transform.xy + transform.zw);
vec2 jg = 1.0 / vec2(textureSize(map, 0).xy);
vec2 dZ = nZ(index);
vec2 kg = oa(index) + jg;
vec2 oE = dZ - 0.5 * jg;
vec2 lr = dZ + kg - jg;
return clamp(
oE + qz * kg,
dZ,
lr
);
}

vec2 getMapUvSet(int index, vec2 uv, vec2 uv1) {
return mapUvChannel[index] > 0.5 ? uv1 : uv;
}

vec4 sampleMap(int index, vec2 uv) {
return texture(map, vec3(sg(index, uv), pj(index)));
}
#endif


vec2 aK(float roughness, float anisotropy) {
float alpha = roughness * roughness;
float oX = ROUGHNESS_MIN * ROUGHNESS_MIN;
if (anisotropy == 0.0) { return vec2(max(oX, alpha)); }
float dg = 1.0 - anisotropy;
float rZ = alpha * sqrt(2.0 / (1.0 + dg * dg));
return max(vec2(oX), vec2(rZ, dg * rZ));
}

vec4 bv(int i);
vec3 kA(int instanceIndex) {
if (instanceIndex < 0) return vec3(1.0);
return bv(instanceIndex * ${Y+""} + 9).rgb;
}

void eT(
inout J mat,
int materialIndex,
vec2 uv,
vec2 uv1,
int instanceIndex
) {
int i = materialIndex * MAT_DATA_SIZE;
vec4 oM = fetchMatData(i + MAT_ROW_COLOR);
vec4 hc = fetchMatData(i + MAT_ROW_ROUGHNESS_NORMAL);
vec4 gi = fetchMatData(i + MAT_ROW_METALLIC_MAPS);
vec4 hE = fetchMatData(i + MAT_ROW_EMISSION);
vec4 gU = fetchMatData(i + MAT_ROW_IOR_TRANSMISSION);
vec4 misc = fetchMatData(i + MAT_ROW_MISC);
vec4 nk = fetchMatData(i + MAT_ROW_ALPHA_FILM);
vec4 lI = fetchMatData(i + MAT_ROW_BASE_CONTROLS);
vec4 oQ = fetchMatData(i + MAT_ROW_SPECULAR_FUZZ);
vec4 subsurface = fetchMatData(i + MAT_ROW_SUBSURFACE);
vec4 wj = fetchMatData(i + MAT_ROW_FUZZ);
vec4 vE = fetchMatData(i + MAT_ROW_COAT);
vec4 lJ = fetchMatData(i + MAT_ROW_COAT_CONTROLS);
vec4 mN = fetchMatData(i + MAT_ROW_FILM_DISPERSION);
vec4 nj = fetchMatData(i + MAT_ROW_STANDALONE_MAPS);
int mapAlphaUsage = int(misc.a);

mat.baseColor = oM.rgb;
mat.materialType = int(oM.w);
mat.specularRoughness = hc.x;
mat.baseMetalness = gi.x;
mat.specularAnisotropy = clamp(gi.y, 0.0, 1.0);
mat.emission = hE.rgb;
mat.inside = false;
mat.specularIor = gU.x;
mat.transmissionWeight = gU.y;
#ifdef HAS_MEDIUM
mat.mediumType = int(gU.z);
#else
mat.mediumType = 0;
#endif
mat.thinWalled = gU.w > 0.5;
mat.bevel = misc.r;
mat.transmissionDispersionScale = misc.g;
mat.dispersionAbbeNumber = max(mN.y, 1e-6);
mat.thinFilmThickness = misc.b;
mat.thinFilmIor = nk.b;
mat.thinFilmWeight = clamp(mN.x, 0.0, 1.0);

mat.thinFilmThickness *= 1000.0;
mat.baseWeight = clamp(lI.x, 0.0, 1.0);
mat.diffuseRoughness = clamp(lI.y, 0.0, 1.0);
mat.specularWeight = max(0.0, lI.z);
mat.subsurfaceWeight = clamp(lI.w, 0.0, 1.0);
mat.specularColor = max(oQ.rgb, vec3(0.0));
mat.fuzzWeight = clamp(oQ.w, 0.0, 1.0);
mat.subsurfaceColor = max(subsurface.rgb, vec3(0.0));
mat.transmissionColor = max(fetchMatData(i + MAT_ROW_TRANSMISSION_COLOR).rgb, vec3(0.0));
mat.fuzzColor = max(wj.rgb, vec3(0.0));
mat.fuzzRoughness = clamp(wj.w, 0.0, 1.0);
mat.coatColor = max(vE.rgb, vec3(0.0));
mat.coatWeight = clamp(vE.w, 0.0, 1.0);
mat.coatRoughness = clamp(lJ.x, ROUGHNESS_MIN, 1.0);
mat.coatAnisotropy = clamp(lJ.y, 0.0, 1.0);
mat.coatIor = max(lJ.z, 1.0);
mat.coatDarkening = clamp(lJ.w, 0.0, 1.0);

#ifdef HAS_MEDIUM
mat.mediumExtinction = max(fetchMatData(i + MAT_ROW_MEDIUM_EXTINCTION).rgb, vec3(0.0));
mat.mediumAnisotropy = clamp(fetchMatData(i + MAT_ROW_MEDIUM_EXTINCTION).a, -1.0, 1.0);
mat.mediumScattering = max(fetchMatData(i + MAT_ROW_MEDIUM_SCATTERING).rgb, vec3(0.0));
mat.mediumType = max(max(mat.mediumExtinction.x, mat.mediumExtinction.y), mat.mediumExtinction.z) > 0.0 ? 1 : 0;
#endif


#ifdef HAS_ALPHA
mat.alpha = nk.r;
#else
mat.alpha = 1.0;
#endif

#ifdef NUM_DIFFUSE_MAPS
int diffuseMapIndex = int(gi.z);
if (diffuseMapIndex >= 0) {
vec4 nQ = sampleMap(
diffuseMapIndex, getMapUvSet(diffuseMapIndex, uv, uv1)
);


mat.baseColor *= decodeMapColor(diffuseMapIndex, nQ.rgb);


if (mapAlphaUsage == ${pt.transmission+""}) {
mat.transmissionWeight = 1.0 - nQ.a;
}
else if (mapAlphaUsage == ${pt.alpha+""}) {
mat.alpha *= nQ.a;
}
}
#endif

${Se("alphaMap","glsl")}

mat.alpha = lg(
mat.alpha, int(fetchMatData(i + MAT_ROW_ALPHA).w), nj.w
);

${Se("transmissionMap","glsl")}

#ifdef NUM_METALLIC_ROUGHNESS_MAPS
int metallicRoughnessMapIndex = int(gi.w);
if (metallicRoughnessMapIndex >= 0) {
vec4 fK = sampleMap(
metallicRoughnessMapIndex,
getMapUvSet(metallicRoughnessMapIndex, uv, uv1)
);
mat.baseMetalness *= fK.b;
mat.specularRoughness *= fK.g;
}
#endif

${Se("roughnessMap","glsl")}

${Se("metalnessMap","glsl")}

#ifdef NUM_EMISSIVE_MAPS
int emissiveMapIndex = int(hE.w);
if (emissiveMapIndex >= 0) {
vec3 emissive = sampleMap(
emissiveMapIndex, getMapUvSet(emissiveMapIndex, uv, uv1)
).rgb;
mat.emission *= decodeMapColor(emissiveMapIndex, emissive);
}
#endif

#ifdef NUM_COAT_WEIGHT_MAPS
int hM = int(fetchMatData(i + MAT_ROW_LAYER_MAPS).x);
if (hM >= 0 && mat.materialType == 0) {
float qo = clamp(vE.w, 0.0, 1.0) * sampleMap(
hM, getMapUvSet(hM, uv, uv1)
).r;
mat.emission *= mix(vec3(1.0), sqrt(max(vE.rgb, vec3(0.0))), qo);
}
#endif

${xa("glsl")}

${Se("coatWeightMap","glsl")}
#ifdef NUM_COAT_NORMAL_MAPS
mat.coatNormalEnabled = fetchMatData(i + MAT_ROW_LAYER_MAPS).z >= 0.0 && mat.coatWeight > 0.0;
#endif

${Se("coatRoughnessMap","glsl")}

${Se("fuzzColorMap","glsl")}

${Se("fuzzRoughnessMap","glsl")}

${Se("specularWeightMap","glsl")}

${Se("specularColorMap","glsl")}

vec4 kN = fetchMatData(i + MAT_ROW_DIRECTION_NORMAL);
mat.anisotropyDirection = vec2(1.0, 0.0);
mat.anisotropyDirectionEnabled = kN.y != 0.0;
mat.coatAnisotropyRotation = fetchMatData(i + MAT_ROW_FILM_TEXTURE).x;
#ifdef NUM_ANISOTROPY_MAPS
if (kN.x >= 0.0) {
int index = int(kN.x);
vec4 iX = sampleMap(index, getMapUvSet(index, uv, uv1));
mat.specularAnisotropy *= iX.b;
vec2 direction = iX.rg * 2.0 - 1.0;
if (dot(direction, direction) > 1e-4) mat.anisotropyDirection = normalize(direction);
mat.anisotropyDirectionEnabled = true;
}
#endif
#ifdef HAS_GLTF_ANISOTROPY
if (fetchMatData(i + MAT_ROW_FILM_TEXTURE).y > 0.5 && mat.specularAnisotropy > 0.0) {
vec2 sv = fb(clamp(mat.specularRoughness, 0.0, 1.0), mat.specularAnisotropy);
mat.specularRoughness = sv.x;
mat.specularAnisotropy = sv.y;
}
#endif
if (mat.anisotropyDirectionEnabled) {
float theta = kN.y;
vec2 d = mat.anisotropyDirection;
mat.anisotropyDirection = vec2(cos(theta)*d.x - sin(theta)*d.y, sin(theta)*d.x + cos(theta)*d.y);
}



if (mat.coatWeight > 0.0 && mat.coatRoughness > 0.0) {
float hI = mat.specularRoughness * mat.specularRoughness;
float hJ = mat.coatRoughness * mat.coatRoughness;
mat.specularRoughness = mix(mat.specularRoughness,
pow(min(1.0, hI * hI + 2.0 * hJ * hJ), 0.25), mat.coatWeight);
}
vec3 instanceColor = kA(instanceIndex);
mat.baseColor *= instanceColor;
if (mat.materialType == UNLIT) mat.emission *= instanceColor;

mat.specularRoughness = clamp(mat.specularRoughness, ROUGHNESS_MIN, 1.0);
mat.baseMetalness = clamp(mat.baseMetalness, 0.0, 1.0);
vec2 specularAlpha = aK(mat.specularRoughness, mat.specularAnisotropy);
mat.alphaX = specularAlpha.x;
mat.alphaY = specularAlpha.y;
}

#if defined(NUM_NORMAL_MAPS)
vec3 ob(int materialIndex, vec2 uv, vec3 normal, vec3 dp1, vec3 dp2, vec2 nS, vec2 nT) {
int i = materialIndex * MAT_DATA_SIZE;
vec4 hc = fetchMatData(i + MAT_ROW_ROUGHNESS_NORMAL);
int normalMapIndex = int(hc.y);
if (normalMapIndex >= 0) {



vec3 qO = cross(dp2, normal);
vec3 qM = cross(normal, dp1);
vec3 dpdu = qO * nS.x + qM * nT.x;
vec3 se = qO * nS.y + qM * nT.y;
float dS = max(dot(dpdu, dpdu), dot(se, se));
if (dS > 1e-12) {
float sn = inversesqrt(dS);
dpdu *= sn;
se *= sn;
}
else {



vec3 nf = abs(normal.z) < 0.999
? vec3(0.0, 0.0, 1.0)
: vec3(0.0, 1.0, 0.0);
dpdu = normalize(cross(nf, normal));
se = cross(normal, dpdu);
}

vec3 n = 2.0 * sampleMap(normalMapIndex, uv).rgb - 1.0;
n.xy *= hc.zw;
n = normalize(n);

mat3 tbn = mat3(dpdu, se, normal);

return normalize(tbn * n);
} else {
return normal;
}
}
#endif

`});function Wn(i,e="",t="RAY_MAX_DISTANCE"){let A=G`
ivec3 vertexOffset = ivec3(floatBitsToInt(bv(cf * ${Y}).y));
for (int k = 0; k < bh; k++) {
int triangleIndex = primitiveOffset + k;
${e}
vec4 r3 = dp(triangleIndex);
ivec3 index = floatBitsToInt(r3.xyz) + vertexOffset;
fu tri = fu(
ky(positionBuffer, index.x, vertexColumns).xyz,
ky(positionBuffer, index.y, vertexColumns).xyz,
ky(positionBuffer, index.z, vertexColumns).xyz
);
eB hit = fI(o, d, tri, ey, gL, tMax);

if (hit.t > 0.0) {
tMax = hit.t;
vec3 e1 = tri.p1 - tri.p0;
vec3 e2 = tri.p2 - tri.p0;
vec3 faceNormal = normalize(cross(e1, e2));
int kd = int(ae(
floatBitsToInt(bv(cf * ${Y}).z)
).x);
bool iI = fetchMatData(
kd * MAT_DATA_SIZE + MAT_ROW_ALPHA
).z > 0.5;
if (!doubleSided && !iI && dot(faceNormal, d) > 0.0) {
continue;
}

${i}
}
}
`;return G`
ivec2 stack[STACK_SIZE];
int top = -1;
int sG = -1;
float tMax = ${t};

vec3 o = ray.o;
vec3 d = ray.d;

bool qT = false;
vec3 hx;
vec3 aB;
ivec3 hs;

fu lp;


top = 0;
stack[0] = ivec2(0, -1);

int wk = 0;
while(top >= 0 && wk < 5000) {
wk++;
ivec2 node = stack[top--];

int cf = node.y;

if (cf != sG) {
if (cf < 0) {
o = ray.o;
d = ray.d;
}
else {
mat4 w2l = mat4(
bv(cf * ${Y} + 1),
bv(cf * ${Y} + 2),
bv(cf * ${Y} + 3),
bv(cf * ${Y} + 4)
);
o = (w2l * vec4(ray.o, 1.0)).xyz;
d = (w2l * vec4(ray.d, 0.0)).xyz;
}
ey = maxDimension(abs(d));
gL = mj(d, ey);
sG = cf;
}

int bo = cf < 0 ? 0 : blasOffset;
uint fG = cf < 0 ? 0u : floatBitsToUint(bv(cf * ${Y}).x);
int gN = int(fG >> 30u);
int eS = int(fG & 0x3fffffffu);
int bh = 0;
int primitiveOffset = 0;

if (gN == 3) {
uint hS = uint(node.x);
if ((hS & 0x80000000u) != 0u) {
bh = int((hS >> 23u) & 0xffu);
primitiveOffset = bo + eS + int(hS & 0x007fffffu);
}
else {
int i = node.x + bo;
vec4 ju = dp(i);
vec4 fC = dp(i + 1);
vec4 mK = dp(i + 2);
vec4 mL = dp(i + 3);
vec4 mM = dp(i + 4);
uint header = floatBitsToUint(ju.w);
int rv = int(header << 24u) >> 24;
int rw = int((header >> 8u) << 24u) >> 24;
int rA = int((header >> 16u) << 24u) >> 24;
vec3 hF = vec3(
uintBitsToFloat(uint(rv + 127) << 23u),
uintBitsToFloat(uint(rw + 127) << 23u),
uintBitsToFloat(uint(rA + 127) << 23u)
);
uint childBase = floatBitsToUint(fC.x);
uint oH = floatBitsToUint(fC.y);
uint internalMask = header >> 24u;
uint ul = (d.x < 0.0 ? 4u : 0u) |
(d.y < 0.0 ? 2u : 0u) |
(d.z < 0.0 ? 1u : 0u);
uint gE[12] = uint[12](
floatBitsToUint(mK.x), floatBitsToUint(mK.y),
floatBitsToUint(mK.z), floatBitsToUint(mK.w),
floatBitsToUint(mL.x), floatBitsToUint(mL.y),
floatBitsToUint(mL.z), floatBitsToUint(mL.w),
floatBitsToUint(mM.x), floatBitsToUint(mM.y),
floatBitsToUint(mM.z), floatBitsToUint(mM.w)
);

for (int order = 7; order >= 0; order--) {
uint slot = uint(order) ^ ul;
uint su = slot >= 4u
? floatBitsToUint(fC.w)
: floatBitsToUint(fC.z);
uint meta = (su >> ((slot & 3u) * 8u)) & 0xffu;
if (meta == 0u) continue;
uint lO = (slot & 3u) * 8u;
uint kM = slot >> 2u;
vec3 tA = vec3(
float((gE[kM] >> lO) & 0xffu),
float((gE[2u + kM] >> lO) & 0xffu),
float((gE[4u + kM] >> lO) & 0xffu)
);
vec3 tw = vec3(
float((gE[6u + kM] >> lO) & 0xffu),
float((gE[8u + kM] >> lO) & 0xffu),
float((gE[10u + kM] >> lO) & 0xffu)
);
vec3 uP = ju.xyz + tA * hF;
vec3 uO = ju.xyz + tw * hF;
if (cM(o, d, uP, uO, tMax) <= 0.0) continue;
uint jw = meta & 0x1fu;
if (jw >= 24u) {
uint ne = internalMask & ((1u << slot) - 1u);
uint sQ = childBase + qK(ne);
stack[++top] = ivec2(
eS + int(sQ * 5u), cf
);
}
else {
uint triangleCount = qK(meta >> 5u);
uint rK = oH + jw;
uint uZ = 0x80000000u |
(triangleCount << 23u) |
(rK & 0x007fffffu);
stack[++top] = ivec2(int(uZ), cf);
}
}
}
}
else if (gN == 2) {
int i = node.x + bo;
vec4 uR = dp(i);
vec4 uS = dp(i + 1);
vec4 uT = dp(i + 2);
vec4 uU = dp(i + 3);
bh = int(floatBitsToUint(uT.w));
if (bh > 0) {
primitiveOffset = bo + eS + int(floatBitsToUint(uU.w));
}
else {
int left = eS + int(floatBitsToUint(uR.w) * 4u);
int right = eS + int(floatBitsToUint(uS.w) * 4u);
float d0 = cM(o, d, uR.xyz, uS.xyz, tMax);
float d1 = cM(o, d, uT.xyz, uU.xyz, tMax);
if (d0 > d1) {
if (d0 > 0.0) stack[++top] = ivec2(left, cf);
if (d1 > 0.0) stack[++top] = ivec2(right, cf);
}
else {
if (d1 > 0.0) stack[++top] = ivec2(right, cf);
if (d0 > 0.0) stack[++top] = ivec2(left, cf);
}
}
}
else if (gN == 1) {
uint hS = uint(node.x);
if ((hS & 0x80000000u) != 0u) {
bh = int((hS >> 23u) & 0xffu);
primitiveOffset = bo + eS + int(hS & 0x007fffffu);
}
else {
int i = node.x + bo;
vec4 ub = dp(i);
vec4 rf = dp(i + 1);
vec4 rh = dp(i + 2);
vec4 ri = dp(i + 3);
vec3 nodeMin = ub.xyz;
vec3 ec = vec3(ub.w, rf.x, rf.y);
uint lV[4] = uint[4](
floatBitsToUint(rf.z), floatBitsToUint(rf.w),
floatBitsToUint(rh.x), floatBitsToUint(rh.y)
);
vec4 ro = eY(floatBitsToUint(rh.z));
vec4 rp = eY(floatBitsToUint(rh.w));
vec4 rq = eY(floatBitsToUint(ri.x));
vec4 rl = eY(floatBitsToUint(ri.y));
vec4 rm = eY(floatBitsToUint(ri.z));
vec4 rn = eY(floatBitsToUint(ri.w));
vec3 gx = eX(d);
vec3 bJ = eV(gx, o);
vec4 tx0 = (nodeMin.x + ro * ec.x - o.x) * gx.x;
vec4 tx1 = (nodeMin.x + rl * ec.x - o.x) * gx.x;
vec4 ty0 = (nodeMin.y + rp * ec.y - o.y) * gx.y;
vec4 ty1 = (nodeMin.y + rm * ec.y - o.y) * gx.y;
vec4 tz0 = (nodeMin.z + rq * ec.z - o.z) * gx.z;
vec4 tz1 = (nodeMin.z + rn * ec.z - o.z) * gx.z;
vec4 mB = max(max((min(tx0, tx1) - vec4(bJ.x)), (min(ty0, ty1) - vec4(bJ.y))), (min(tz0, tz1) - vec4(bJ.z)));
vec4 rM = min(min((max(tx0, tx1) + vec4(bJ.x)), (max(ty0, ty1) + vec4(bJ.y))), (max(tz0, tz1) + vec4(bJ.z)));
vec4 distance = mix(rM, mB, greaterThan(mB, vec4(0.0)));
distance = mix(distance, vec4(-1.0), greaterThan(mB, min(rM, vec4(tMax))));
float fa[4] = float[4](distance.x, distance.y, distance.z, distance.w);


for (int order = 0; order < 4; order++) {
float dX = -1.0;
int el = -1;
for (int child = 0; child < 4; child++) {
if (lV[child] != 0u && fa[child] > dX) {
dX = fa[child];
el = child;
}
}
if (el >= 0 && dX > 0.0) {
uint nl = lV[el];
int jD = int(nl);
if ((nl & 0x80000000u) == 0u) {
jD += eS;
}
stack[++top] = ivec2(jD, cf);
fa[el] = -1.0;
}
}
}
}
else {
int i = node.x + bo;
vec4 r1 = dp(i);
int bb = floatBitsToInt(r1.w);

if (bb >= 0) {
int left = node.x + 2;
int right = bb + eS;

float d0 = cM(o, d, dp(left + bo).xyz, dp(left + 1 + bo).xyz, tMax);
float d1 = cM(o, d, dp(right + bo).xyz, dp(right + 1 + bo).xyz, tMax);
if (d0 > d1) {
if (d0 > 0.0) {
stack[++top] = ivec2(left, cf);
}
if (d1 > 0.0) {
stack[++top] = ivec2(right, cf);
}
}
else {
if (d1 > 0.0) {
stack[++top] = ivec2(right, cf);
}
if (d0 > 0.0) {
stack[++top] = ivec2(left, cf);
}
}
}
else {
if (cf < 0) {
for (int k = 0; k < -bb; k++) {
vec4 r3 = dp(i + 2 + k);
stack[++top] = ivec2(floatBitsToInt(r3.y), floatBitsToInt(r3.x));
}
}
else {
bh = -bb;
primitiveOffset = i + 2;
}
}
}
if (bh > 0) {
${A}
}
}
`}var Wt=bt({uniforms:{positionBuffer:C.uniform("sampler2D"),normalBuffer:C.uniform("sampler2D"),tangentBuffer:C.uniform("sampler2D"),uvBuffer:C.uniform("sampler2D"),uv1Buffer:C.uniform("sampler2D"),colorBuffer:C.uniform("sampler2D"),materialIndexBuffer:C.uniform("sampler2D"),bvhBuffer:C.uniform("sampler2D"),instancesBuffer:C.uniform("sampler2D"),bvhColumns:C.uniform("int",1),vertexColumns:C.uniform("int",1),instancesColumns:C.uniform("int",1),blasOffset:C.uniform("int"),isEmptyScene:C.uniform("bool")},main:G`

struct fu {
vec3 p0;
vec3 p1;
vec3 p2;
};
#ifdef NUM_LIGHTS
float ht(float rad, vec3 pos, Ray r) {
vec3 op = pos - r.o;
float eps = 0.001;
float b = dot(op, r.d);
float det = b * b - dot(op, op) + rad * rad;
if (det < 0.0)
return INF;

det = sqrt(det);
float t1 = b - det;
if (t1 > eps)
return t1;

float t2 = b + det;
if (t2 > eps)
return t2;

return INF;
}

float mU(vec3 pos, vec3 u, vec3 v, vec3 n, Ray r) {
float dt = dot(r.d, n);
float t = (dot(n, pos) - dot(n, r.o)) / dt;

if (t > EPS) {
vec3 p = r.o + r.d * t;
vec3 vi = p - pos;
float a1 = dot(u / dot(u, u), vi);
if (a1 >= 0.0 && a1 <= 1.0) {
float a2 = dot(v / dot(v, v), vi);
if (a2 >= 0.0 && a2 <= 1.0) {
return t;
}
}
}

return INF;
}

float mo(Ray r, Light light, out LightSampleRec lightSample) {



float d = INF;
vec3 u = light.u;
vec3 v = light.v;
int type = int(light.type);

#ifdef HAS_RECT_LIGHTS
if (type == RECT_LIGHT) {

vec3 pos = light.position-u*0.5-v*0.5;
vec3 normal = normalize(cross(u, v));
if (dot(normal, r.d) > 0.) 
return INF;

d = mU(pos, u, v, normal, r);
if (d < 0.) {
d = INF;
}
else {
float cc = dot(-r.d, normal);
float spread = light.spread;
if (cc >= cos(spread * PI / 2.0)) {
lightSample.pdf = (d * d) / (light.area * cc);
lightSample.emission = light.emission;
}
}
}
#endif
#ifdef HAS_SPHERE_LIGHTS
if (type == SPHERE_LIGHT) {
if (light.radius <= 0.0) {
vec3 kh = light.position - r.o;
float projection = dot(kh, r.d);
vec3 ba = kh - projection * r.d;
if (projection <= EPS || dot(ba, ba) > 1e-8) return INF;
d = projection;
lightSample.direction = r.d;
lightSample.normal = -r.d;
lightSample.dist = d;
lightSample.pdf = 1.0;
lightSample.isDelta = true;
} else {
d = ht(light.radius, light.position, r);
lightSample.isDelta = false;
}
if (d < 0.) {
d = INF;
}
else {
float aj = distance(r.o, light.position);
float cosThetaMax = aj <= light.radius
? -1.0
: sqrt(max(0.0, 1.0 - light.radius * light.radius / (aj * aj)));
if (light.radius > 0.0) {
lightSample.pdf = aj <= light.radius
? INV4PI
: 1.0 / max(TWOPI * (1.0 - cosThetaMax), 1e-8);
}
lightSample.emission = light.radius <= 0.0
? light.emission / max(d * d, 1e-8)
: light.emission;
}
}
#endif
#ifdef HAS_SPOT_LIGHTS
if (type == SPOT_LIGHT) {
if (light.radius <= 0.0) {
vec3 kh = light.position - r.o;
float projection = dot(kh, r.d);
vec3 ba = kh - projection * r.d;
if (projection <= EPS || dot(ba, ba) > 1e-8) return INF;
d = projection;
lightSample.direction = r.d;
lightSample.normal = -r.d;
lightSample.dist = d;
lightSample.pdf = 1.0;
lightSample.isDelta = true;
} else {
d = ht(light.radius, light.position, r);
lightSample.isDelta = false;
}
if (d != INF) {
vec3 uX = r.o + d * r.d;
float mr = bL(light, normalize(r.o - uX));
if (mr <= 0.0) return INF;
float aj = distance(r.o, light.position);
float cosThetaMax = aj <= light.radius
? -1.0
: sqrt(max(0.0, 1.0 - light.radius * light.radius / (aj * aj)));
if (light.radius > 0.0) {
lightSample.pdf = aj <= light.radius
? INV4PI
: 1.0 / max(TWOPI * (1.0 - cosThetaMax), 1e-8);
}
lightSample.emission = light.emission * mr * (light.radius <= 0.0
? 1.0 / max(d * d, 1e-8)
: 1.0);
}
}
#endif

return d;
}
#endif

int fj(ivec4 m0, ivec4 m1, ivec4 m2, vec3 eZ) {
vec2 m00 = ae(m0.x);
vec2 m01 = ae(m0.y);
vec2 m02 = ae(m0.z);
vec2 m10 = ae(m1.x);
vec2 m11 = ae(m1.y);
vec2 m12 = ae(m1.z);
vec2 m20 = ae(m2.x);
vec2 m21 = ae(m2.y);
vec2 m22 = ae(m2.z);
float w00 = m00.y * eZ.x;
float w01 = m01.y * eZ.x;
float w02 = m02.y * eZ.x;
float w10 = m10.y * eZ.y;
float w11 = m11.y * eZ.y;
float w12 = m12.y * eZ.y;
float w20 = m20.y * eZ.z;
float w21 = m21.y * eZ.z;
float w22 = m22.y * eZ.z;

float hg = w00 + w01 + w02 + w10 + w11 + w12 + w20 + w21 + w22;

w00 = w00 / hg;
w01 = w01 / hg + w00;
w02 = w02 / hg + w01;
w10 = w10 / hg + w02;
w11 = w11 / hg + w10;
w12 = w12 / hg + w11;
w20 = w20 / hg + w12;
w21 = w21 / hg + w20;
w22 = w22 / hg + w21;

float rand = eo(0u);
float mV;
if (rand < w00) {
mV = m00.x;
} else if (rand < w01) {
mV = m01.x;
} else if (rand < w02) {
mV = m02.x;
} else if (rand < w10) {
mV = m10.x;
} else if (rand < w11) {
mV = m11.x;
} else if (rand < w12) {
mV = m12.x;
} else if (rand < w20) {
mV = m20.x;
} else if (rand < w21) {
mV = m21.x;
} else {
mV = m22.x;
}
return int(mV);
}


vec4 bv(int i);


mat2x3 eD(vec3 normal, vec3 dp1, vec3 dp2, vec2 nS, vec2 nT, vec4 aU) {
float determinant = nS.x * nT.y - nS.y * nT.x;
vec3 t = aU.xyz;
vec3 b = vec3(0.0);

float qu = abs(aU.w) > 1.5 ? 0.0 : aU.w;
if (abs(determinant) > 1e-12) {
vec3 dt = (dp1 * nT.y - dp2 * nS.y) / determinant;
vec3 db = (dp2 * nS.x - dp1 * nT.x) / determinant;
if (dot(t, t) < 1e-8) { t = dt; }
if (qu == 0.0) { qu = (dot(cross(normal, dt), db) < 0.0 ? -1.0 : 1.0); }
}
t -= normal * dot(normal, t);
if (dot(t, t) < 1e-8) {
float ie = (normal.z >= 0.0 ? 1.0 : -1.0);
float dW = -1.0 / (ie + normal.z);
float xy = normal.x * normal.y * dW;
t = vec3(1.0 + ie * normal.x * normal.x * dW, ie * xy, -ie * normal.x);
b = vec3(xy, ie + normal.y * normal.y * dW, -normal.y);
}
else { t = normalize(t); b = normalize(cross(normal, t)); }
return mat2x3(t, b * (qu < 0.0 ? -1.0 : 1.0));
}

void hp(inout ad si, fu tri, vec3 barycentric, ivec3 index) {
si.hit = true;
si.position = barycentric.x * tri.p0 + barycentric.y * tri.p1 + barycentric.z * tri.p2;
ivec2 i0 = gM(index.x, vertexColumns);
ivec2 i1 = gM(index.y, vertexColumns);
ivec2 i2 = gM(index.z, vertexColumns);

vec3 n0 = texelFetch(normalBuffer, i0, 0).xyz;
vec3 n1 = texelFetch(normalBuffer, i1, 0).xyz;
vec3 n2 = texelFetch(normalBuffer, i2, 0).xyz;
vec3 normal = normalize(barycentric.x * n0 + barycentric.y * n1 + barycentric.z * n2);
si.vertexNormal = normal;





vec3 geometricNormal = normalize(cross(tri.p1 - tri.p0, tri.p2 - tri.p0));
vec3 kf = barycentric.x * n0 + barycentric.y * n1 + barycentric.z * n2;
float a = dot(n2 - n0, tri.p0 - tri.p2);
float b = dot(n2 - n1, tri.p1 - tri.p2);
float c = dot(n1 - n0, tri.p1 - tri.p0);
float h = a * barycentric.x * (barycentric.x - 1.0)
+ (a + b + c) * barycentric.x * barycentric.y
+ b * barycentric.y * (barycentric.y - 1.0);
if (dot(kf, geometricNormal) > 0.0) {
float h0 = max(max(dot(tri.p1 - tri.p0, n0), dot(tri.p2 - tri.p0, n0)), 0.0);
float h1 = max(max(dot(tri.p0 - tri.p1, n1), dot(tri.p2 - tri.p1, n1)), 0.0);
float h2 = max(max(dot(tri.p0 - tri.p2, n2), dot(tri.p1 - tri.p2, n2)), 0.0);
h0 = max(dot(tri.p0 - si.position, n0) + h0, 0.0);
h1 = max(dot(tri.p1 - si.position, n1) + h1, 0.0);
h2 = max(dot(tri.p2 - si.position, n2) + h2, 0.0);
h = max(min(min(h0, h1), h2), h * 0.5);
}
else {
float h0 = max(max(dot(tri.p0 - tri.p1, n0), dot(tri.p0 - tri.p2, n0)), 0.0);
float h1 = max(max(dot(tri.p1 - tri.p0, n1), dot(tri.p1 - tri.p2, n1)), 0.0);
float h2 = max(max(dot(tri.p2 - tri.p0, n2), dot(tri.p2 - tri.p1, n2)), 0.0);
h0 = max(dot(si.position - tri.p0, n0) + h0, 0.0);
h1 = max(dot(si.position - tri.p1, n1) + h1, 0.0);
h2 = max(dot(si.position - tri.p2, n2) + h2, 0.0);
h = min(-min(min(h0, h1), h2), h * 0.5);
}
si.shadowOffset = kf * h;


ivec4 m0 = ivec4(texelFetch(materialIndexBuffer, i0, 0));
ivec4 m1 = ivec4(texelFetch(materialIndexBuffer, i1, 0));
ivec4 m2 = ivec4(texelFetch(materialIndexBuffer, i2, 0));

if (m0.x > 0 || m1.x > 0 || m2.x > 0) {
si.materialIndex = fj(m0, m1, m2, barycentric);
}

vec2 uv0 = texelFetch(uvBuffer, i0, 0).xy;
vec2 uv1 = texelFetch(uvBuffer, i1, 0).xy;
vec2 uv2 = texelFetch(uvBuffer, i2, 0).xy;
#if defined(NUM_DIFFUSE_MAPS) || defined(NUM_NORMAL_MAPS) || defined(NUM_METALLIC_ROUGHNESS_MAPS) || defined(NUM_ROUGHNESS_MAPS) || defined(NUM_METALNESS_MAPS) || defined(NUM_EMISSIVE_MAPS) || defined(NUM_THIN_FILM_MAPS) || defined(NUM_ANISOTROPY_MAPS) || defined(NUM_COAT_NORMAL_MAPS)
vec2 uv = barycentric.x * uv0 + barycentric.y * uv1 + barycentric.z * uv2;
vec2 secondaryUv0 = texelFetch(uv1Buffer, i0, 0).xy;
vec2 secondaryUv1 = texelFetch(uv1Buffer, i1, 0).xy;
vec2 secondaryUv2 = texelFetch(uv1Buffer, i2, 0).xy;
vec2 cX = barycentric.x * secondaryUv0
+ barycentric.y * secondaryUv1
+ barycentric.z * secondaryUv2;

vec4 lC = fetchMatData(si.materialIndex * MAT_DATA_SIZE + MAT_ROW_UV);
int uvProjection = int(lC.r);
if (uvProjection > 0) {
uv = gC(uvProjection, si.position, normal, lC.zw);
cX = uv;
} else {
uv *= lC.zw;
cX *= lC.zw;
}
#else
vec2 uv = vec2(0.0);
vec2 cX = vec2(0.0);
#endif

#ifdef NUM_COAT_NORMAL_MAPS
si.coatNormal = normal;
float lm = fetchMatData(si.materialIndex * MAT_DATA_SIZE + MAT_ROW_LAYER_MAPS).z;
#endif
vec4 directionMaterial = fetchMatData(si.materialIndex * MAT_DATA_SIZE + MAT_ROW_DIRECTION_NORMAL);
float te = fetchMatData(si.materialIndex * MAT_DATA_SIZE + MAT_ROW_FILM_TEXTURE).x;
if (directionMaterial.x >= 0.0 || directionMaterial.y != 0.0 || te != 0.0
#ifdef NUM_COAT_NORMAL_MAPS
|| lm >= 0.0
#endif
) {
vec3 dp1 = tri.p0 - tri.p2;
vec3 dp2 = tri.p1 - tri.p2;
vec4 aU = vec4(0.0);
#ifdef USE_TANGENT
aU = barycentric.x * texelFetch(tangentBuffer, i0, 0)
+ barycentric.y * texelFetch(tangentBuffer, i1, 0)
+ barycentric.z * texelFetch(tangentBuffer, i2, 0);
#endif
mat2x3 eP = eD(normal, dp1, dp2, uv0-uv2, uv1-uv2, aU);
si.geometryTangent = eP[0];
si.geometryBitangent = eP[1];
mat2x3 fU = eP;
#ifdef NUM_ANISOTROPY_MAPS
if (directionMaterial.x >= 0.0 && mapUvChannel[int(directionMaterial.x)] > 0.5) {
vec2 a = texelFetch(uv1Buffer, i0, 0).xy;
vec2 b = texelFetch(uv1Buffer, i1, 0).xy;
vec2 c = texelFetch(uv1Buffer, i2, 0).xy;
fU = eD(normal, dp1, dp2, a-c, b-c, (aU.w == 0.0 ? vec4(0.0) : aU));
}
#endif
si.directionTangent = fU[0];
si.directionBitangent = fU[1];
#ifdef NUM_COAT_NORMAL_MAPS
if (lm >= 0.0) {
int ku = int(lm);
mat2x3 lW = eP;
if (mapUvChannel[ku] > 0.5) {
vec2 a = texelFetch(uv1Buffer, i0, 0).xy;
vec2 b = texelFetch(uv1Buffer, i1, 0).xy;
vec2 c = texelFetch(uv1Buffer, i2, 0).xy;
lW = eD(normal, dp1, dp2, a-c, b-c,
aU.w == 0.0 ? vec4(0.0) : aU);
}
vec3 decoded = sampleMap(ku, getMapUvSet(ku, uv, cX)).rgb * 2.0 - 1.0;
vec3 mapped = lW[0] * decoded.x * directionMaterial.z
+ lW[1] * decoded.y * directionMaterial.w + normal * decoded.z;
if (dot(mapped, mapped) > 1e-12) { si.coatNormal = normalize(mapped); }
}
#endif
}

si.uv = uv;
si.uv1 = cX;

#ifdef USE_TANGENT
vec3 t0 = texelFetch(tangentBuffer, i0, 0).xyz;
vec3 t1 = texelFetch(tangentBuffer, i1, 0).xyz;
vec3 t2 = texelFetch(tangentBuffer, i2, 0).xyz;
si.tangent = normalize(barycentric.x * t0 + barycentric.y * t1 + barycentric.z * t2);
#endif
#if defined(NUM_NORMAL_MAPS)
vec3 dp1 = tri.p0 - tri.p2;
vec3 dp2 = tri.p1 - tri.p2;
vec2 nS = uv0 - uv2;
vec2 nT = uv1 - uv2;
si.normal = ob(
si.materialIndex, uv, normal, dp1, dp2, nS, nT
);
#else
si.normal = normal;
#endif
}

struct eB {
float t;
vec3 barycentric;
};

vec4 dp(int i) {
return ky(bvhBuffer, i, bvhColumns);
}

vec4 bv(int i) {
return ky(instancesBuffer, i, instancesColumns);
}



uint qK(uint value) {
value -= (value >> 1u) & 0x55555555u;
value = (value & 0x33333333u) + ((value >> 2u) & 0x33333333u);
value = (value + (value >> 4u)) & 0x0f0f0f0fu;
return (value * 0x01010101u) >> 24u;
}

vec4 eY(uint lL) {
return vec4(
float(lL & 0xffu),
float((lL >> 8u) & 0xffu),
float((lL >> 16u) & 0xffu),
float(lL >> 24u)
) / 255.0;
}




eB fI(vec3 o, vec3 d, fu tri, int ey, vec3 gL, float tMax) {
eB ti;


vec3 p0t = tri.p0 - o;
vec3 p1t = tri.p1 - o;
vec3 p2t = tri.p2 - o;


if (ey == 0) {
p0t = p0t.yzx;
p1t = p1t.yzx;
p2t = p2t.yzx;
} else if (ey == 1) {
p0t = p0t.zxy;
p1t = p1t.zxy;
p2t = p2t.zxy;
}


p0t.xy += gL.xy * p0t.z;
p1t.xy += gL.xy * p1t.z;
p2t.xy += gL.xy * p2t.z;


vec3 e = vec3(
p1t.x * p2t.y - p1t.y * p2t.x,
p2t.x * p0t.y - p2t.y * p0t.x,
p0t.x * p1t.y - p0t.y * p1t.x
);

#ifdef DEPTH_QUERY_MODE
vec3 rt = abs(vec3(p1t.x * p2t.y, p2t.x * p0t.y, p0t.x * p1t.y))
+ abs(vec3(p1t.y * p2t.x, p2t.y * p0t.x, p0t.y * p1t.x));
e = mix(e, vec3(0.0), lessThanEqual(abs(e), rt * 1e-6));
#endif


if (any(lessThan(e, vec3(0))) && any(greaterThan(e, vec3(0)))) {
return ti;
}

float det = e.x + e.y + e.z;
#ifdef DEPTH_QUERY_MODE
if (det == 0.0) return ti;
#endif

p0t.z *= gL.z;
p1t.z *= gL.z;
p2t.z *= gL.z;
float rd = (e.x * p0t.z + e.y * p1t.z + e.z * p2t.z);


if (abs(rd) > abs(tMax * det)) {
return ti;
}

float sm = 1. / det;
ti.t = rd * sm;
ti.barycentric = e * sm;

return ti;
}

struct Box {
vec3 min;
vec3 max;
};


vec3 eX(vec3 d) {
#ifdef DEPTH_QUERY_MODE
vec3 ap = mix(d, mix(vec3(1e-20), vec3(-1e-20), lessThan(d, vec3(0.0))), lessThan(abs(d), vec3(1e-20)));
return 1.0 / ap;
#else
return 1.0 / d;
#endif
}

vec3 eV(vec3 gx, vec3 o) {
#ifdef DEPTH_QUERY_MODE
return abs(gx) * max(vec3(1.0), abs(o)) * 1e-6;
#else
return vec3(0.0);
#endif
}



float cM(vec3 o, vec3 d, vec3 vD, vec3 vC, float tMax) {
#ifdef DEPTH_QUERY_MODE
vec3 gx = eX(d);
vec3 uK = (vD - o) * gx;
vec3 uL = (vC - o) * gx;
vec3 bJ = eV(gx, o);
#else
vec3 uK = (vD - o) / d;
vec3 uL = (vC - o) / d;
vec3 bJ = vec3(0.0);
#endif
vec3 mB = min(uK, uL) - bJ;
vec3 rM = max(uK, uL) + bJ;
float t0 = max(mB.x, max(mB.y, mB.z));
float t1 = min(rM.x, min(rM.y, rM.z));

return (t0 > t1 || t0 > tMax) ? -1.0 : (t0 > 0.0 ? t0 : t1);
}

int maxDimension(vec3 v) {
return v.x > v.y ? (v.x > v.z ? 0 : 2) : (v.y > v.z ? 1 : 2);
}

vec3 mj(vec3 d, int ey) {


if (ey == 0) {
return vec3(-d.y, -d.z, 1.0) / d.x;
} else if (ey == 1) {
return vec3(-d.z, -d.x, 1.0) / d.y;
} else {
return vec3(-d.x, -d.y, 1.0) / d.z;
}
}


void cY(in Ray ray, inout ad si, bool doubleSided) {
si.hit = false;

if (isEmptyScene) {
return;
}

int ey = maxDimension(abs(ray.d));
vec3 gL = mj(ray.d, ey);
int ao;

${Wn(G`
si.triangleIndex = triangleIndex;
lp = tri;
hx = faceNormal;
aB = hit.barycentric;
hs = index;
qT = true;
ao = cf;
`)}

if (qT) {
si.instanceIndex = ao;
si.materialIndex = int(ae(floatBitsToInt(bv(ao * ${Y}).z)).x);

hp(si, lp, aB, hs);
mat4 l2w = mat4(
bv(ao * ${Y} + 5),
bv(ao * ${Y} + 6),
bv(ao * ${Y} + 7),
bv(ao * ${Y} + 8)
);
mat4 w2l = mat4(
bv(ao * ${Y} + 1),
bv(ao * ${Y} + 2),
bv(ao * ${Y} + 3),
bv(ao * ${Y} + 4)
);
mat3 aD = transpose(mat3(w2l));
si.faceNormal = normalize(aD * hx);
si.vertexNormal = normalize(aD * si.vertexNormal);
si.normal = normalize(aD * si.normal);
#ifdef NUM_COAT_NORMAL_MAPS
si.coatNormal = normalize(aD * si.coatNormal);
#endif
#ifdef USE_TANGENT
if (dot(si.tangent, si.tangent) > 0.0) {
si.tangent = normalize(mat3(l2w) * si.tangent);
}
#endif
si.shadowOffset = (l2w * vec4(si.shadowOffset, 0.0)).xyz;
si.directionTangent = mat3(l2w) * si.directionTangent;
si.directionBitangent = mat3(l2w) * si.directionBitangent;
si.geometryTangent = mat3(l2w) * si.geometryTangent;
si.geometryBitangent = mat3(l2w) * si.geometryBitangent;
si.position = (l2w * vec4(si.position, 1.0)).xyz;
}
}


void iH(in Ray ray, inout ad si, int instanceIndex, float maxDistance) {
si.hit = false;

if (isEmptyScene) {
return;
}

bool doubleSided = true;
int ey = maxDimension(abs(ray.d));
vec3 gL = mj(ray.d, ey);
int ao;

${Wn(G`
si.triangleIndex = triangleIndex;
lp = tri;
hx = faceNormal;
aB = hit.barycentric;
hs = index;
qT = true;
ao = cf;
`,G`
if (cf != instanceIndex) {
continue;
}
`,"maxDistance")}

if (qT) {
si.instanceIndex = ao;
si.materialIndex = int(ae(floatBitsToInt(bv(ao * ${Y}).z)).x);
hp(si, lp, aB, hs);
mat4 l2w = mat4(
bv(ao * ${Y} + 5),
bv(ao * ${Y} + 6),
bv(ao * ${Y} + 7),
bv(ao * ${Y} + 8)
);
mat4 w2l = mat4(
bv(ao * ${Y} + 1),
bv(ao * ${Y} + 2),
bv(ao * ${Y} + 3),
bv(ao * ${Y} + 4)
);
mat3 aD = transpose(mat3(w2l));
si.faceNormal = normalize(aD * hx);
si.vertexNormal = normalize(aD * si.vertexNormal);
si.normal = normalize(aD * si.normal);
#ifdef NUM_COAT_NORMAL_MAPS
si.coatNormal = normalize(aD * si.coatNormal);
#endif
#ifdef USE_TANGENT
if (dot(si.tangent, si.tangent) > 0.0) {
si.tangent = normalize(mat3(l2w) * si.tangent);
}
#endif
si.shadowOffset = (l2w * vec4(si.shadowOffset, 0.0)).xyz;
si.directionTangent = mat3(l2w) * si.directionTangent;
si.directionBitangent = mat3(l2w) * si.directionBitangent;
si.geometryTangent = mat3(l2w) * si.geometryTangent;
si.geometryBitangent = mat3(l2w) * si.geometryBitangent;
si.position = (l2w * vec4(si.position, 1.0)).xyz;
}
}

bool ex(in Ray ray, float lightDistance, int jG) {

if (isEmptyScene) {
return false;
}

bool doubleSided = true;
int ey = maxDimension(abs(ray.d));
vec3 gL = mj(ray.d, ey);

${Wn(G`


bool jn = true;
vec3 barycentric = hit.barycentric;
vec3 position = barycentric.x * tri.p0 + barycentric.y * tri.p1 + barycentric.z * tri.p2;

if (jn) {
#ifdef HAS_ALPHA
int materialIndex = int(ae(floatBitsToInt(bv(cf * ${Y}).z)).x);
ivec2 i0 = gM(index.x, vertexColumns);
ivec2 i1 = gM(index.y, vertexColumns);
ivec2 i2 = gM(index.z, vertexColumns);
ivec4 m0 = ivec4(texelFetch(materialIndexBuffer, i0, 0));
ivec4 m1 = ivec4(texelFetch(materialIndexBuffer, i1, 0));
ivec4 m2 = ivec4(texelFetch(materialIndexBuffer, i2, 0));

if (m0.x > 0 || m1.x > 0 || m2.x > 0) {
materialIndex = fj(m0, m1, m2, barycentric);
}

int ii = materialIndex * MAT_DATA_SIZE;
int mapAlphaUsage = int(fetchMatData(ii + MAT_ROW_MISC).a);
float alpha = fetchMatData(ii + MAT_ROW_ALPHA_FILM).r;
#ifdef NUM_DIFFUSE_MAPS
if (mapAlphaUsage == ${pt.alpha+""}) {
int diffuseMapIndex = int(fetchMatData(ii + MAT_ROW_METALLIC_MAPS).z);
if (diffuseMapIndex >= 0) {
vec2 uv0 = texelFetch(uvBuffer, i0, 0).xy;
vec2 uv1 = texelFetch(uvBuffer, i1, 0).xy;
vec2 uv2 = texelFetch(uvBuffer, i2, 0).xy;
vec2 uv = barycentric.x * uv0 + barycentric.y * uv1 + barycentric.z * uv2;
vec4 lC = fetchMatData(ii + MAT_ROW_UV);
int uvProjection = int(lC.r);
if (uvProjection > 0) {
uv = gC(uvProjection, position, hx, lC.zw);
} else {
uv *= lC.zw;
}

alpha *= sampleMap(diffuseMapIndex, uv).a;
}
}
#endif
#ifdef NUM_ALPHA_MAPS
int alphaMapIndex = int(fetchMatData(ii + MAT_ROW_STANDALONE_MAPS).z);
if (alphaMapIndex >= 0) {
vec2 uv0 = texelFetch(uvBuffer, i0, 0).xy;
vec2 uv1 = texelFetch(uvBuffer, i1, 0).xy;
vec2 uv2 = texelFetch(uvBuffer, i2, 0).xy;
vec2 uv = barycentric.x * uv0 + barycentric.y * uv1 + barycentric.z * uv2;
vec4 lC = fetchMatData(ii + MAT_ROW_UV);
int uvProjection = int(lC.r);
if (uvProjection > 0) {
uv = gC(uvProjection, position, hx, lC.zw);
} else {
uv *= lC.zw;
}
alpha *= sampleMap(alphaMapIndex, uv).g;
}
#endif
float alphaCutoff = fetchMatData(ii + MAT_ROW_STANDALONE_MAPS).a;
alpha = lg(
alpha, int(fetchMatData(ii + MAT_ROW_ALPHA).w), alphaCutoff
);
if (eo(0u) > alpha) {

tMax = min(max(lightDistance, 0.0), RAY_MAX_DISTANCE);
jn = false;
}
#endif
}
if (jn) {
return true;
}
`,G`
if (triangleIndex == jG) {
continue;
}
`,"min(max(lightDistance, 0.0), RAY_MAX_DISTANCE)")}
return false;
}
`});var mi=G`
vec2 sphericalProjection(vec3 pos) {
vec3 n = normalize(pos);
float theta = atan(n.x, n.z) / (2.0 * PI) + 0.5;
float phi = acos(n.y) / PI;
return vec2(theta, 1.0 - phi);
}

vec2 iM(vec3 pos, vec3 normal, vec2 uvScale) {
vec3 dm = abs(normal);
vec2 uv = vec2(0.0);
if (dm.x > dm.y && dm.x > dm.z) {
uv = pos.yz;
} else if (dm.y > dm.x && dm.y > dm.z) {
uv = pos.xz;
} else {
uv = pos.xy;
}
return fract(uv * uvScale);
}

































vec2 hz(vec3 pos, vec3 normal) {
float theta = atan(pos.z, pos.x) / (2.0 * PI) + 0.5;
return vec2(theta, pos.y);
}

vec2 gC(int fh, vec3 pos, vec3 normal, vec2 uvScale) {
if (fh == ${Ke.triplanar+""}) {
return iM(pos, normal, uvScale);
} else if (fh == ${Ke.spherical+""}) {
return sphericalProjection(pos) * uvScale;
} else if (fh == ${Ke.cylindrical+""}) {
return hz(pos, normal) * uvScale;
}
return vec2(0.0);
}
`;var el=`
uint reverseBits(uint x) {
x = ((x & 0x55555555u) << 1u) | ((x >> 1u) & 0x55555555u);
x = ((x & 0x33333333u) << 2u) | ((x >> 2u) & 0x33333333u);
x = ((x & 0x0f0f0f0fu) << 4u) | ((x >> 4u) & 0x0f0f0f0fu);
x = ((x & 0x00ff00ffu) << 8u) | ((x >> 8u) & 0x00ff00ffu);
return (x << 16u) | (x >> 16u);
}

const uint CAMERA_PIXEL = 0u;
const uint CAMERA_LENS = 1u;
const uint CAMERA_WAVELENGTH = 2u;
const uint CAMERA_BEVEL_BASE = 3u;
const uint LIGHT_SELECT = 0u;
const uint LIGHT_POSITION = 1u;
const uint BSDF_LOBE = 2u;
const uint BSDF_DIRECTION = 3u;
const uint MEDIUM_CHANNEL = 4u;
const uint MEDIUM_DISTANCE = 5u;
const uint PHASE_DIRECTION = 6u;
const uint RUSSIAN_ROULETTE = 7u;
const uint BOUNCE_STRIDE = 64u;



uvec2 bc;
uint bd;
uint cF = 0u;
uint em = 0u;
uint eg(uint kk) {
uint x = kk;
x ^= x >> 16u; x *= 0x7feb352du;
x ^= x >> 15u; x *= 0x846ca68bu;
return x ^ (x >> 16u);
}
uint aq(uint a, uint b) {
return eg(a ^ eg(b + 0x9e3779b9u));
}
uint iA(uint kk, uint ic) {
uint x = kk + ic;
x ^= x * 0x6c50b47cu; x ^= x * 0xb82f1e52u;
x ^= x * 0xc7afe638u; x ^= x * 0x8d22f6e6u;
return x;
}
uint sC(uint x, uint ic) {
return reverseBits(iA(reverseBits(x), ic));
}

uint rb(uint kk) {
uint r = reverseBits(kk);
${er.map(([i,e])=>`r ^= (r << ${i}u) & 0x${e.toString(16)}u;`).join(`
  `)}
return r;
}
vec2 vI(uint index, uint ic) {
uint i = sC(index, aq(ic, 0u));
uint x = reverseBits(iA(i, aq(ic, 1u)));
uint y = sC(rb(i), aq(ic, 2u));
return vec2(float(x >> 8u), float(y >> 8u)) * (1.0 / 16777216.0);
}
uint tp(uvec2 p) {
uvec2 v = p & uvec2(255u);
v = (v | (v << uvec2(4u))) & uvec2(0x0f0fu);
v = (v | (v << uvec2(2u))) & uvec2(0x3333u);
v = (v | (v << uvec2(1u))) & uvec2(0x5555u);
return v.x | (v.y << 1u);
}
${Za.map((i,e)=>`const uint Z_PERM_${e} = ${i}u;`).join(`
`)}
uint km(uint tu) {
uint group = tu >> 2u;
uint word = Z_PERM_5;
${[0,1,2,3,4].map(i=>`word = group == ${i}u ? Z_PERM_${i} : word;`).join(`
  `)}
return (word >> ((tu & 3u) * 8u)) & 255u;
}
uint pO(uint kE, uint dim, uint logSPP) {
uint odd = logSPP & 1u;
uint uf = 8u + ((logSPP + 1u) >> 1u);
uint result = 0u;
for (int digit = int(uf) - 1; digit >= int(odd); digit--) {
uint shift = 2u*uint(digit) - odd;

uint sj = 0u;
if (shift < 30u) { sj = kE >> (shift + 2u); }
uint tu = (eg(sj ^ (0x55555555u * dim)) >> 24u) % 24u;
uint d = (kE >> shift) & 3u;
result |= ((km(tu) >> (2u*d)) & 3u) << shift;
}
if (odd != 0u) {
result |= (kE & 1u) ^ (eg((kE >> 1u) ^ (0x55555555u * dim)) & 1u);
}
return result;
}



uint cw(uint slot) {
return CAMERA_BEVEL_BASE + uint(BEVEL_SAMPLES) + cF * BOUNCE_STRIDE + slot;
}

uvec4 hh;
uint hi;
bool fv = false;
bool df = false;
uint dE;
uint gq;
vec2 eN;
void dw(uint dim) {

uint jW = bc.x + bc.y * uint(round(1.0 / pixelSize.x));
uvec4 key = uvec4(dim, bd, jW, uint(sequenceSeed));
if (fv && all(equal(hh, key)) && hi == uint(zSobolLogSPP)) { return; }
hh = key; hi = uint(zSobolLogSPP);
fv = true; df = false;
uint ic = aq(aq(jW, dim), uint(sequenceSeed));
uint index = bd;
if (samplingPattern == 1) {
uint logSPP = uint(zSobolLogSPP);
if (index == 0u) { logSPP = 0u; }
else { index -= 1u; }

uint iW = index >> logSPP;
uint mask = (1u << logSPP) - 1u;
uint kE = (tp(bc) << logSPP) | (index & mask);
index = pO(kE, dim, logSPP);
uvec2 tile = bc >> uvec2(8u);
ic = aq(aq(dim, uint(sequenceSeed)), aq(tile.x, tile.y));

if (bd != 0u) { iW += 1u; }
ic = aq(ic, iW);
}
dE = sC(index, aq(ic, 0u));
gq = ic;
uint x = reverseBits(iA(dE, aq(ic, 1u)));
eN.x = float(x >> 8u) * (1.0 / 16777216.0);
}
vec2 kJ(uint dim) {
dw(dim);
if (!df) {
uint y = sC(rb(dE), aq(gq, 2u));
eN.y = float(y >> 8u) * (1.0 / 16777216.0);
df = true;
}
return EPS + (1.0 - 2.0*EPS) * eN;
}
float dz(uint dim) {
if (samplingPattern == 2) { return EPS + (1.0 - 2.0*EPS)*rand(); }
dw(dim);
return EPS + (1.0 - 2.0*EPS) * eN.x;
}
vec2 fk(uint dim) {
if (samplingPattern == 2) {
float x = dz(dim); float y = dz(dim);
return vec2(x,y);
}
return kJ(dim);
}

float eo(uint slot) {
uint dim = aq(aq(cF, slot), em) | 0x80000000u;
em += 1u;
if (samplingPattern == 2) { return EPS + (1.0 - 2.0*EPS)*rand(); }

uint jW = bc.x + bc.y * uint(round(1.0 / pixelSize.x));
uint ic = aq(aq(jW, dim), uint(sequenceSeed));
uint i = sC(bd, aq(ic, 0u));
uint x = reverseBits(iA(i, aq(ic, 1u)));
return EPS + (1.0 - 2.0*EPS) * (float(x >> 8u) * (1.0 / 16777216.0));
}
`;var Yt=bt({uniforms:{samplingPattern:C.uniform("int",0),sequenceSeed:C.uniform("int",0),zSobolLogSPP:C.uniform("int",0)},main:G`

${el}

void sk() {
bc = uvec2(v_Texcoord / pixelSize);
bd = uint(sampleCount);
cF = 0u; em = 0u;
}

vec2 rS() {
if (samplingPattern == 0 || samplingPattern == 1) {
return (fk(CAMERA_PIXEL) - 0.5) * pixelSize;
}
return jitter;
}
`});var gi=G`
uvec4 s0;

void ka(vec2 p, int frame) {

s0 = uvec4(p, uint(frame), uint(p.x) + uint(p.y));
}


void vo(inout uvec4 v) {
v = v * 1664525u + 1013904223u;
v.x += v.y*v.w; v.y += v.z*v.x; v.z += v.x*v.y; v.w += v.y*v.z;
v = v ^ (v>>16u);
v.x += v.y*v.w; v.y += v.z*v.x; v.z += v.x*v.y; v.w += v.y*v.z;
}

float rand() {
vo(s0); return float(s0.x)/float(0xffffffffu);
}

`;var tl=new _e({name:"depthQuery",outputs:["depth"],defines:{DEPTH_QUERY_MODE:!0},includes:[Gt,Ht,Wt,Yt],uniforms:{depthArea:C.uniform("vec4"),viewProjectionInv:C.uniform("mat4"),viewInv:C.uniform("mat4")},main:`
${pi}
${gi}
${Yt.main}
${Gt.main}
${mi}
${Ht.main}
${Wt.main}

void main() {
vec2 offset = floor(gl_FragCoord.xy) / ${6}.0 * 2.0 - 1.0;
vec2 uv = depthArea.xy + depthArea.zw * offset * vec2(1.0, -1.0);
out_depth = vec4(0.0);
if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return;
vec4 origin = viewProjectionInv * vec4(uv * 2.0 - 1.0, -1.0, 1.0);
vec4 target = viewProjectionInv * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
Ray ray;
iw(ray, origin.xyz / origin.w, normalize(target.xyz * origin.w - origin.xyz * target.w));
vec3 eye = viewInv[3].xyz;
vec3 nY = -normalize(viewInv[2].xyz);
ad si;
si.triangleIndex = -1;
for (int layer = 0; layer < 32; layer++) {
cY(ray, si, false);
if (!si.hit) return;
J material;
eT(material, si.materialIndex, si.uv, si.uv1, si.instanceIndex);
if (material.materialType != SHADOW_CATCHER && material.alpha > 0.0) {
out_depth.r = max(dot(si.position - eye, nY), 0.0);
return;
}
ray.o = si.position + ray.d * (EPS * 0.02);
}
}
`});var Er=`
Ray hy(vec2 fD) {
vec4 origin = viewProjectionInv * vec4(fD * 2.0 - 1.0, -1.0, 1.0);
vec4 target = viewProjectionInv * vec4(fD * 2.0 - 1.0, 1.0, 1.0);
Ray cam;
iw(cam, origin.xyz / origin.w, normalize(target.xyz * origin.w - origin.xyz * target.w));

return cam;
}

vec2 oC(vec2 p) {
p = 2.0 * p - 1.0;
bool greater = abs(p.x) > abs(p.y);
float r = greater ? p.x : p.y;
float theta = greater ? 0.25 * PI * p.y / p.x : PI * (0.5 - 0.25 * p.x / p.y);
return r * vec2(cos(theta), sin(theta));
}

Ray nC() {
Ray cam = hy(v_Texcoord + rS());
if (cameraApertureRadius > 0.0) {

vec3 eye = viewInv[3].xyz;
vec3 nY = -normalize(viewInv[2].xyz);
vec3 qq = eye + cam.d * (cameraFocusDistance / dot(cam.d, nY));
vec2 rC = cameraApertureRadius * oC(fk(CAMERA_LENS));
vec3 origin = vec3(viewInv * vec4(rC, 0.0, 1.0));
iw(cam, origin, normalize(qq - origin));
}
return cam;
}
`;var wr=G`
vec4 textureLinear(sampler2D map, vec2 uv) {
#ifdef OES_texture_float_linear
return texture(map, uv);
#else
vec2 size = vec2(textureSize(map, 0));
vec2 pS = 1.0 / size;

uv = uv * size - 0.5;
vec2 f = fract(uv);
uv = floor(uv) + 0.5;

vec4 s1 = texture(map, (uv + vec2(0, 0)) * pS);
vec4 s2 = texture(map, (uv + vec2(1, 0)) * pS);
vec4 s3 = texture(map, (uv + vec2(0, 1)) * pS);
vec4 s4 = texture(map, (uv + vec2(1, 1)) * pS);

return mix(mix(s1, s2, f.x), mix(s3, s4, f.x), f.y);
#endif
}
`;var hi=bt({uniforms:{envMap:C.uniform("sampler2D"),envMapDistribution:C.uniform("sampler2D"),backgroundMap:C.uniform("sampler2D"),groundedBackgroundParams:C.uniform("vec4"),groundedBackgroundCenter:C.uniform("vec2")},main:G`
vec2 aS(vec3 gc) {
float phi = mod(atan(-gc.z, -gc.x), TWOPI);
float theta = acos(gc.y);
return vec2(phi * 0.5 * INVPI, theta * INVPI);
}

float qt(float u, out int vOffset, out float pdf) {
ivec2 size = textureSize(envMap, 0);

int left = 0;
int right = size.y + 1; 
while (left < right) {
int mid = (left + right) >> 1;
float s = texelFetch(envMapDistribution, ivec2(0, mid), 0).x;
if (s <= u) {
left = mid + 1;
} else {
right = mid;
}
}
vOffset = left - 1;



vec2 s0 = texelFetch(envMapDistribution, ivec2(0, vOffset), 0).xy;
vec2 s1 = texelFetch(envMapDistribution, ivec2(0, vOffset + 1), 0).xy;

pdf = s0.y;

return (float(vOffset) +  (u - s0.x) / (s1.x - s0.x)) / float(size.y);
}

float qs(float u, int vOffset, out float pdf) {
ivec2 size = textureSize(envMap, 0);

int left = 0;
int right = size.x + 1; 
while (left < right) {
int mid = (left + right) >> 1;
float s = texelFetch(envMapDistribution, ivec2(1 + mid, vOffset), 0).x;
if (s <= u) {
left = mid + 1;
} else {
right = mid;
}
}
int oJ = left - 1;



vec2 s0 = texelFetch(envMapDistribution, ivec2(1 + oJ, vOffset), 0).xy;
vec2 s1 = texelFetch(envMapDistribution, ivec2(1 + oJ + 1, vOffset), 0).xy;

pdf = s0.y;

return (float(oJ) + (u - s0.x) / (s1.x - s0.x)) / float(size.x);
}


vec3 oD(vec2 random, out vec2 uv, out float pdf) {
vec2 gZ;
int vOffset;

uv.y = qt(random.x, vOffset, gZ.y);
uv.x = qs(random.y, vOffset, gZ.x);

float phi = uv.x * TWOPI;
float theta = uv.y * PI;
float cc = cos(theta);
float sinTheta = sin(theta);
float ue = cos(phi);
float um = sin(phi);

vec3 dir = vec3(-sinTheta * ue, cc, -sinTheta * um);

pdf = gZ.x * gZ.y * INVPI2 / (2.0 * sinTheta);

return dir;
}

float iv(vec2 uv) {
vec2 size = vec2(textureSize(envMap, 0));

float sinTheta = sin(uv.y * PI);

uv *= size;

float sD = texelFetch(envMapDistribution, ivec2(1.0 + uv.x, uv.y), 0).y;
float sE = texelFetch(envMapDistribution, ivec2(0, uv.y), 0).y;

return sD * sE * INVPI2 / (2.0 * sinTheta);
}

float dq(vec3 sF, float height, float radius) {
float fN = length(sF);
if (fN < 0.00001) {
return -radius;
}

float iC = radius * sF.y / fN;
float ij = -1.5 * height;
float ev;
if (iC >= 0.0) {
ev = radius;
} else if (iC < ij) {
ev = -height * fN / sF.y;
} else {
float dW = 1.0
- iC * iC / (3.0 * ij * ij);
ev = radius * dW;
}
return fN - ev;
}

vec3 eQ(vec3 origin, vec3 d) {
#ifdef USE_GROUNDED_BACKGROUND
float height = groundedBackgroundParams.x;
float radius = groundedBackgroundParams.y;
float vG = groundedBackgroundParams.z;
vec3 bY = normalize(d);
vec3 bB = origin - vec3(
groundedBackgroundCenter.x,
vG + height,
groundedBackgroundCenter.y
);



float eI = dot(bB, bY);
float ej = eI * eI
- dot(bB, bB) + radius * radius;
if (ej > 0.0) {
float cC = -eI + sqrt(ej);
if (
cC > 0.0
&& dq(bB, height, radius) <= 0.0
) {
vec3 nE = bB + bY * cC;
if (nE.y >= 0.0) {
return normalize(nE);
}

if (bY.y < -0.00001 && radius > 1.5 * height) {
float hP = (-height - bB.y) / bY.y;
vec3 nq = bB + bY * hP;
float oc = (2.0 / 3.0)
* sqrt(radius * radius - 2.25 * height * height);
if (hP > 0.0 && length(nq.xz) <= oc) {
return normalize(nq);
}
}

float cN = 0.0;
for (int i = 0; i < 14; i++) {
float fe = (cN + cC) * 0.5;
vec3 pt = bB + bY * fe;
if (dq(pt, height, radius) > 0.0) {
cC = fe;
} else {
cN = fe;
}
}
vec3 hit = bB + bY * ((cN + cC) * 0.5);
return normalize(hit);
}
}
#endif
return d;
}

vec4 cx(vec3 origin, vec3 d) {
d = eQ(origin, d);
vec2 uv = aS(d);
return textureLinear(backgroundMap, uv);
}`});var Al=G`
vec3 mJ(ad si, J mat, ag prepared, inout Path aa, vec3 ffnormal, bool gy) {
float mt = 1.0;
vec3 lc = vec3(fk(cw(LIGHT_POSITION)), dz(cw(LIGHT_SELECT)));

LightSampleRec lightSample;
sampleLight(si.position, lc, lightSample, false);
lightSample.emission = ai(lightSample.emission, bf);

vec3 lightDir = lightSample.direction;
vec3 oK = -aa.ray.d;
float fd = lightSample.pdf;




float cosThetaL = dot(ffnormal, lightDir);
#ifdef NUM_COAT_NORMAL_MAPS
if (gy && mat.coatNormalEnabled) { cosThetaL = dot(mat.geometricNormal, lightDir); }
#endif

if (fd <= 0.0 || max(max(lightSample.emission.x, lightSample.emission.y), lightSample.emission.z) <= 0.0) {
return vec3(0.0);
}

float scatteringPdf = 0.0;
vec3 f = vec3(0.0);
if (gy) {
if (cosThetaL <= 0.0 && mat.transmissionWeight <= 0.0 && mat.subsurfaceWeight <= 0.0) {
return vec3(0.0);
}
f = bI(prepared, lightDir, scatteringPdf);
}
else {
scatteringPdf = bD(
dot(oK, lightDir),
si.mediumAnisotropy
);
f = vec3(scatteringPdf);
}

if (scatteringPdf <= 0.0 || max(max(f.x, f.y), f.z) <= 0.0) {
return vec3(0.0);
}

Ray mp;
vec3 hd = si.position + EPS * lightDir;
if (gy) {
const float bZ = 0.1;
float dr = dot(si.normal, lightDir);
#ifdef NUM_COAT_NORMAL_MAPS
if (mat.coatNormalEnabled) { dr = dot(si.faceNormal, lightDir); }
#endif
vec3 geometricNormal = dr < 0.0 ? -si.faceNormal : si.faceNormal;
dr = abs(dr);
float hO = dot(geometricNormal, lightDir);
float ot = dr < bZ
? clamp(
2.0 - (hO + dr) / bZ,
0.0,
1.0
)
: clamp(1.0 - hO / bZ, 0.0, 1.0);
hd += si.shadowOffset * ot;
}
iw(mp, hd, lightDir);
if (ex(mp, lightSample.dist - EPS, si.triangleIndex)) {
return vec3(0.0);
}

#ifdef USE_ENVMAP


if (gy && cosThetaL < 0.0 && lc.z < envLightSelectionPmf) {
vec4 background = cx(mp.o, lightDir);
lightSample.emission = ai(background.rgb * background.a, bf);
}
#endif



float eW = lightSample.isDelta
? 1.0
: aG(fd, scatteringPdf);
return eW > 0.0
? eW * lightSample.emission * f / fd
: vec3(0.0);
}

#ifdef NUM_COAT_NORMAL_MAPS
vec3 fB(vec3 po, vec3 th, vec3 view) {
bool qQ = dot(th, view) >= 0.0;
vec3 uh = qQ ? th : -th;
vec3 qP = qQ ? po : -po;
if (dot(po, th) <= 0.0 || dot(qP, view) <= 1e-6) { return uh; }
return qP;
}
#endif
void lR(inout ad si, J mat, inout Path aa) {
vec3 uj = vec3(fk(cw(BSDF_DIRECTION)), dz(cw(BSDF_LOBE)));
#ifdef NUM_COAT_NORMAL_MAPS
vec3 bC = si.faceNormal;
vec3 mv = si.normal;
#endif
float rF = -dot(si.faceNormal, aa.ray.d);
float sw = -dot(si.normal, aa.ray.d);
if ((mat.transmissionWeight > 0.0 || mat.subsurfaceWeight > 0.0) && mat.thinWalled) {

if (rF < 0.0) {
si.faceNormal = -si.faceNormal;
rF = -rF;
}
if (sw < 0.0) {
si.normal = -si.normal;
sw = -sw;
}
}


bool pM = rF >= 0.0 && sw < 0.0;
float ndv = pM ? rF : sw;
vec3 normal = pM ? si.faceNormal : si.normal;

mat.inside = ndv <= 0.0 && !mat.thinWalled;

mat.relativeIor = ndv > 0.0 ? (1.0 / mat.specularIor) : mat.specularIor;
vec3 ffnormal = ndv >= 0.0 ? normal : -normal;
#ifdef NUM_COAT_NORMAL_MAPS
if (mat.coatNormalEnabled) {
vec3 view = -aa.ray.d;
float fW = dot(bC, view);
mat.geometricNormal = fW >= 0.0 ? bC : -bC;
ffnormal = fB(mv, bC, view);
mat.coatNormal = fB(si.coatNormal, bC, view);
mat.inside = fW <= 0.0 && !mat.thinWalled;
mat.relativeIor = (fW > 0.0 || mat.thinWalled) ? 1.0 / mat.specularIor : mat.specularIor;
}
#endif


float scatteringPdf;
vec3 cG;
aa.scatteringIsDelta = false;
bool bl = false;
bool hj = false;
ag prepared;

#ifdef HAS_MEDIUM
int mediumType = si.mediumType;
float d = distance(si.position, aa.ray.o);
vec3 nh = aa.ray.o;
vec3 extinction = si.mediumExtinction;
vec3 scattering = min(si.mediumScattering, extinction);
float sr = max(max(extinction.x, extinction.y), extinction.z);
if (mediumType > 0 && sr > 0.0) {




int mW = min(int(dz(cw(MEDIUM_CHANNEL)) * 3.0), 2);
float fA = extinction[mW];
float ib = fA > 0.0
? min(-log(max(dz(cw(MEDIUM_DISTANCE)), 1e-7)) / fA, d)
: d;
bl = ib < d;
vec3 ew = exp(-extinction * ib);
vec3 nP = bl
? extinction * ew
: ew;
float nA = max(
(nP.x + nP.y + nP.z) / 3.0,
1e-8
);
if (bl) {
aa.beta *= ew * scattering / nA;

aa.ray.o = nh + ib * aa.ray.d;
si.position = aa.ray.o;
aa.li += mJ(si, mat, prepared, aa, ffnormal, false) * aa.beta;


cG = fl(
-aa.ray.d,
si.mediumAnisotropy,
fk(cw(PHASE_DIRECTION))
);
scatteringPdf = bD(
dot(cG, -aa.ray.d),
si.mediumAnisotropy
);
}
else {
aa.beta *= ew / nA;
}
}
#endif


if (!bl) {
aa.li += mat.emission * aa.beta;
if (mat.materialType == UNLIT) {
aa.abort = true;
return;
}
vec3 pK = vec3(0.0);
#ifdef USE_TANGENT
pK = si.tangent;
#endif
mat.directionTangent = si.directionTangent;
mat.directionBitangent = si.directionBitangent;
mat.geometryTangent = si.geometryTangent;
mat.geometryBitangent = si.geometryBitangent;
prepared = eG(pK, mat, -aa.ray.d, ffnormal);
aa.li += mJ(si, mat, prepared, aa, ffnormal, true) * aa.beta;

bool isNextRefraction;
vec3 f = dv(
prepared,
uj,
cG,
scatteringPdf,
isNextRefraction
);

aa.scatteringIsDelta = !prepared.material.thinWalled &&
abs(prepared.material.relativeIor - 1.0) <= 1e-6 &&
prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] >= 1.0 - 1e-6;



if (!(scatteringPdf > 0.0) || any(isnan(f)) || any(isinf(f)) ||
dot(cG, cG) < 0.5) {
aa.scatteringPdf = 0.0;
aa.abort = true;
return;
}
aa.beta *= f / scatteringPdf;
hj = !mat.thinWalled &&
isNextRefraction;
aa.isNextRefraction = isNextRefraction;


aa.ray.o = si.position + EPS * cG;
#ifdef NUM_COAT_NORMAL_MAPS
if (mat.coatNormalEnabled) { aa.ray.o = si.position + EPS * (dot(bC, cG) >= 0.0 ? bC : -bC); }
#endif
}

aa.scatteringPdf = scatteringPdf;
iw(aa.ray, aa.ray.o, cG);
if (bl) {
aa.isNextRefraction = false;
}
aa.fromEye = false;

#ifdef HAS_MEDIUM


if (!bl && hj && mat.mediumType > 0) {
if (rF >= 0.0) {
si.mediumType = mat.mediumType;
si.mediumExtinction = mat.mediumExtinction;
si.mediumScattering = mat.mediumScattering;
si.mediumAnisotropy = mat.mediumAnisotropy;
}
else {
si.mediumType = 0;
si.mediumExtinction = vec3(0.0);
si.mediumScattering = vec3(0.0);
si.mediumAnisotropy = 0.0;
}
}
#endif
}
`;var _r=G`
#ifdef NUM_LIGHTS
void eJ(
in Light light,
in vec3 shadingPoint,
in vec2 samplePoint,
inout LightSampleRec result
) {
vec3 nH = light.position - shadingPoint;
float aj = length(nH);
if (light.radius <= 0.0) {
if (aj <= 1e-6) {
result.direction = vec3(0.0, 0.0, 1.0);
result.normal = vec3(0.0, 0.0, -1.0);
result.dist = 0.0;
result.pdf = 1.0;
result.emission = vec3(0.0);
result.isDelta = true;
return;
}
result.direction = nH / aj;
result.normal = -result.direction;
result.dist = aj;
result.pdf = 1.0;
result.emission = light.emission / max(aj * aj, 1e-8);
result.isDelta = true;
return;
}
float radius = max(light.radius, 1e-6);
result.isDelta = false;
vec3 direction;

if (aj <= radius) {
float z = 1.0 - 2.0 * samplePoint.x;
float fi = sqrt(max(0.0, 1.0 - z * z));
float br = TWOPI * samplePoint.y;
direction = vec3(fi * cos(br), fi * sin(br), z);
result.pdf = INV4PI;
}
else {
vec3 axis = nH / aj;
float rL = min(
1.0,
radius * radius / (aj * aj)
);
float rO = sqrt(max(0.0, 1.0 - rL));
float au = mix(1.0, rO, samplePoint.x);
float tW = sqrt(max(0.0, 1.0 - au * au));
float br = TWOPI * samplePoint.y;
vec3 tangent;
vec3 bitangent;
aL(axis, tangent, bitangent);
direction = axis * au
+ tangent * (tW * cos(br))
+ bitangent * (tW * sin(br));
result.pdf = 1.0 / max(TWOPI * (1.0 - rO), 1e-8);
}

float jb = dot(direction, nH);
float ej = jb * jb
- dot(nH, nH) + radius * radius;
float wB = sqrt(max(0.0, ej));
float cN = jb - wB;
float cC = jb + wB;
result.dist = cN > 1e-6 ? cN : cC;
result.direction = direction;
vec3 surfacePoint = shadingPoint + direction * result.dist;
result.normal = normalize(surfacePoint - light.position);
result.emission = light.emission;
}

void cZ(
in Light light,
in vec3 surfacePoint,
in vec3 lowerLeft,
inout LightSampleRec result
) {
#ifdef NUM_MAPS
if (light.textureIndex >= 0) {
float width = length(light.u);
float height = length(light.v);
vec3 hX = surfacePoint - lowerLeft;
vec2 uv = vec2(
dot(hX, light.u / width) / width,
dot(hX, light.v / height) / height
);
result.emission *= sampleMap(light.textureIndex, uv).rgb;
}
#endif
}

void jL(
in Light light,
in vec3 shadingPoint,
in vec2 samplePoint,
inout LightSampleRec result
) {
vec3 normal = normalize(cross(light.u, light.v));
vec3 lowerLeft = light.position - 0.5 * (light.u + light.v);
float spread = clamp(light.spread, 0.0, 1.0);

if (spread <= 0.001) {
float gb = dot(normal, shadingPoint - light.position);
vec3 surfacePoint = shadingPoint - normal * gb;
vec3 hX = surfacePoint - lowerLeft;
float width = length(light.u);
float height = length(light.v);
vec2 uv = vec2(
dot(hX, light.u / width) / width,
dot(hX, light.v / height) / height
);
if (gb <= 0.0 || any(lessThan(uv, vec2(0.0)))
|| any(greaterThan(uv, vec2(1.0)))) {
result.emission = vec3(0.0);
result.pdf = 0.0;
return;
}
result.direction = -normal;
result.dist = gb;
result.normal = normal;
result.emission = light.emission;
result.pdf = 1.0;
result.isDelta = true;
cZ(light, surfacePoint, lowerLeft, result);
return;
}

vec3 surfacePoint = lowerLeft
+ light.u * samplePoint.x
+ light.v * samplePoint.y;
vec3 offset = surfacePoint - shadingPoint;
float hl = dot(offset, offset);
result.dist = sqrt(hl);
result.direction = offset / result.dist;
result.normal = normal;
float fV = dot(-result.direction, normal);
float oF = cos(0.5 * PI * spread);
if (fV <= 0.0 || fV < oF) {
result.emission = vec3(0.0);
result.pdf = 0.0;
return;
}
result.emission = light.emission;
result.pdf = hl / max(light.area * fV, 1e-8);
cZ(light, surfacePoint, lowerLeft, result);
}

void fY(
in Light light,
in vec3 shadingPoint,
inout LightSampleRec result
) {
result.direction = normalize(-light.u);
result.normal = -result.direction;
result.emission = light.emission;
result.dist = INF;
result.pdf = 1.0;
result.isDelta = true;
}

void jM(
in Light light,
in vec3 shadingPoint,
in vec2 samplePoint,
inout LightSampleRec result
) {
eJ(light, shadingPoint, samplePoint, result);
vec3 surfacePoint = shadingPoint + result.direction * result.dist;
result.emission *= bL(
light,
normalize(shadingPoint - surfacePoint)
);
}

void iL(
in Light light,
in vec3 shadingPoint,
in vec2 samplePoint,
inout LightSampleRec result
) {
int dO = int(light.type);
#ifdef HAS_RECT_LIGHTS
if (dO == RECT_LIGHT) {
jL(light, shadingPoint, samplePoint, result);
return;
}
#endif
#ifdef HAS_SPHERE_LIGHTS
if (dO == SPHERE_LIGHT) {
eJ(light, shadingPoint, samplePoint, result);
return;
}
#endif
#ifdef HAS_SPOT_LIGHTS
if (dO == SPOT_LIGHT) {
jM(light, shadingPoint, samplePoint, result);
return;
}
#endif
#ifdef HAS_DIRECTIONAL_LIGHTS
if (dO == DIRECTIONAL_LIGHT) {
fY(light, shadingPoint, result);
}
#endif
}
#endif

void mx(in vec2 samplePoint, inout LightSampleRec result) {
vec2 uv;
result.direction = oD(samplePoint, uv, result.pdf);
result.emission = textureLinear(envMap, uv).rgb;
result.dist = INF;
}

void sampleLight(
in vec3 shadingPoint,
in vec3 randomSampleValue,
inout LightSampleRec result,
bool rU
) {
result.isDelta = false;
float tV = randomSampleValue.z;
bool kq = false;
#ifdef USE_ENVMAP
kq = tV < envLightSelectionPmf;
if (kq) {
mx(randomSampleValue.xy, result);
result.pdf *= envLightSelectionPmf;
}
#endif

#ifdef NUM_LIGHTS
if (!kq) {
int kT = NUM_LIGHTS - 1;
for (int index = 0; index < NUM_LIGHTS; index++) {
if (tV < qp(index).selectionCdf) {
kT = index;
break;
}
}
Light qf = qp(kT);
iL(
qf,
shadingPoint,
randomSampleValue.xy,
result
);
result.pdf *= qf.selectionPmf;
}
#endif
}
`;var il=G`
const int OPENPBR_LOBE_FUZZ = 0;
const int OPENPBR_LOBE_COAT = 1;
const int OPENPBR_LOBE_METAL = 2;
const int OPENPBR_LOBE_SPECULAR = 3;
const int OPENPBR_LOBE_TRANSMISSION = 4;
const int OPENPBR_LOBE_DIFFUSE = 5;
const int OPENPBR_LOBE_SUBSURFACE = 6;
const int OPENPBR_LOBE_COUNT = 7;

struct bj {
vec3 tangent;
vec3 bitangent;
vec3 normal;
};

struct ag {
J material;
bj basis;
bj coatBasis;
bool directionFrames;
#ifdef NUM_COAT_NORMAL_MAPS
vec3 coatViewLocal;
#endif
vec3 viewLocal;
vec3 diffuseColor;
float specularEtaTOverEtaI;
float refractionEtaTOverEtaI;
float transmissionReflectionIor;
float thinFilmExteriorIor;
float thinFilmBaseIor;
float specularAlpha;
float diffuseSpecularEnergyCompensation;
vec3 coatBaseScale;
vec3 metalMsScale;
float metalMsFactor;
float metalMsProbability;

vec3 dielectricMsReflectionScale;
vec3 dielectricMsTransmissionScale;
float dielectricMsViewLoss;
float dielectricMsReflectionRatio;
float dielectricMsProbability;

float weights[OPENPBR_LOBE_COUNT];
float probabilities[OPENPBR_LOBE_COUNT];
};

float aw(vec3 color) {
return dot(color, vec3(0.212671, 0.715160, 0.072169));
}

float cV(float bu) {
float value = (bu - 1.0) / (bu + 1.0);
return value * value;
}

float aY(
float bu,
float specularWeight
) {
float sJ = min(
cV(bu) * specularWeight,
0.9999
);
float sL = sqrt(sJ);
float kY = (1.0 + sL) / (1.0 - sL);
return bu < 1.0 ? 1.0 / kY : kY;
}

float af(float cc, float relativeIor) {
if (abs(relativeIor - 1.0) < 1e-6) {
return 0.0;
}
return cu(cc, relativeIor);
}

float aC(float ior) {
if (ior < 1.0) {
return 15.0 - ((1.0 / ior - 1.0) / 1.5) * 15.0;
}
return 16.0 + ((ior - 1.0) / 1.5) * 15.0;
}

float F(int sc, int row) {
return texelFetch(openPbrEnergyLut, ivec2(sc, row), 0).r;
}

float fZ(
float dI,
float bR,
float hN
) {
float bA = clamp(dI, 0.0, 31.0);
float aH = clamp(bR, 0.0, 31.0);
float bt = clamp(hN, 0.0, 31.0);
int dP = int(floor(bA));
int aN = int(floor(aH));
int cI = int(floor(bt));
int hA = min(dP + 1, 31);
int cp = min(aN + 1, 31);
int eO = min(cI + 1, 31);
float cq = bA - float(dP);
float cz = aH - float(aN);
float kw = bt - float(cI);

float ur = F(cI, dP * 32 + aN);
float us = F(eO, dP * 32 + aN);
float ut = F(cI, dP * 32 + cp);
float uw = F(eO, dP * 32 + cp);
float ux = F(cI, hA * 32 + aN);
float uy = F(eO, hA * 32 + aN);
float uz = F(cI, hA * 32 + cp);
float uA = F(eO, hA * 32 + cp);
float v00 = mix(ur, ux, cq);
float v01 = mix(us, uy, cq);
float v10 = mix(ut, uz, cq);
float v11 = mix(uw, uA, cq);
return mix(
mix(v00, v10, cz),
mix(v01, v11, cz),
kw
);
}

float gz(float dI, float bR) {
float bA = clamp(dI, 0.0, 31.0);
float aH = clamp(bR, 0.0, 31.0);
int dP = int(floor(bA));
int aN = int(floor(aH));
int hA = min(dP + 1, 31);
int cp = min(aN + 1, 31);
float cq = bA - float(dP);
float cz = aH - float(aN);
float v00 = F(aN, 1024 + dP);
float v01 = F(cp, 1024 + dP);
float v10 = F(aN, 1024 + hA);
float v11 = F(cp, 1024 + hA);
return mix(
mix(v00, v10, cq),
mix(v01, v11, cq),
cz
);
}



float ef(
float dI,
float bR,
float hN
) {
float bA = clamp(dI, 0.0, 31.0);
float aH = clamp(bR, 0.0, 31.0);
float bt = clamp(hN, 0.0, 31.0);
int dP = int(floor(bA));
int aN = int(floor(aH));
int cI = int(floor(bt));
int hA = min(dP + 1, 31);
int cp = min(aN + 1, 31);
int eO = min(cI + 1, 31);
float cq = bA - float(dP);
float cz = aH - float(aN);
float kw = bt - float(cI);

float ur = F(cI, ${1089} + dP * 32 + aN);
float us = F(eO, ${1089} + dP * 32 + aN);
float ut = F(cI, ${1089} + dP * 32 + cp);
float uw = F(eO, ${1089} + dP * 32 + cp);
float ux = F(cI, ${1089} + hA * 32 + aN);
float uy = F(eO, ${1089} + hA * 32 + aN);
float uz = F(cI, ${1089} + hA * 32 + cp);
float uA = F(eO, ${1089} + hA * 32 + cp);
float v00 = mix(ur, ux, cq);
float v01 = mix(us, uy, cq);
float v10 = mix(ut, uz, cq);
float v11 = mix(uw, uA, cq);
return mix(
mix(v00, v10, cz),
mix(v01, v11, cz),
kw
);
}

float ee(float dI, float bR) {
float bA = clamp(dI, 0.0, 31.0);
float aH = clamp(bR, 0.0, 31.0);
int dP = int(floor(bA));
int aN = int(floor(aH));
int hA = min(dP + 1, 31);
int cp = min(aN + 1, 31);
float cq = bA - float(dP);
float cz = aH - float(aN);
float v00 = F(aN, ${2113} + dP);
float v01 = F(cp, ${2113} + dP);
float v10 = F(aN, ${2113} + hA);
float v11 = F(cp, ${2113} + hA);
return mix(
mix(v00, v10, cq),
mix(v01, v11, cq),
cz
);
}

float eF(float dI, float bR) {
float bA = clamp(dI, 0.0, 31.0);
float aH = clamp(bR, 0.0, 31.0);
int dP = int(floor(bA));
int aN = int(floor(aH));
int hA = min(dP + 1, 31);
int cp = min(aN + 1, 31);
float cq = bA - float(dP);
float cz = aH - float(aN);
float v00 = F(aN, ${2145} + dP);
float v01 = F(cp, ${2145} + dP);
float v10 = F(aN, ${2145} + hA);
float v11 = F(cp, ${2145} + hA);
return mix(
mix(v00, v10, cq),
mix(v01, v11, cq),
cz
);
}

float bO(float ior, float alpha, float au) {
return ef(aC(ior), sqrt(alpha) * 31.0, au * 31.0);
}
float cO(float ior, float alpha) {
return ee(aC(ior), sqrt(alpha) * 31.0);
}
float ch(float ior, float alpha) {
return eF(aC(ior), sqrt(alpha) * 31.0);
}


float bH(float alpha, float au) {
float hZ = clamp(sqrt(alpha) * 31.0, 0.0, 31.0);
float bt = clamp(au * 31.0, 0.0, 31.0);
int r0 = int(floor(hZ));
int c0 = int(floor(bt));
int r1 = min(r0 + 1, 31);
int c1 = min(c0 + 1, 31);
return mix(
mix(F(c0, ${1056} + r0), F(c1, ${1056} + r0), fract(bt)),
mix(F(c0, ${1056} + r1), F(c1, ${1056} + r1), fract(bt)),
fract(hZ));
}

float cv(float alpha) {
float index = clamp(sqrt(alpha) * 31.0, 0.0, 31.0);
int i0 = int(floor(index));
return mix(F(i0, ${1088}),
F(min(i0 + 1, 31), ${1088}), fract(index));
}

float aX(float value, float ior) {
if (ior > 2.5 || ior < 0.4) {
float tN = cV(2.5);
float progress = (cV(ior) - tN) / (1.0 - tN);
return (1.0 - progress) * value;
}
return value;
}

float aJ(
float ior,
float alpha,
float au
) {
float value = fZ(
aC(ior),
sqrt(alpha) * 31.0,
au * 31.0
);
return aX(value, ior);
}

float cr(float ior, float alpha) {
float value = gz(
aC(ior),
sqrt(alpha) * 31.0
);
return aX(value, ior);
}

vec3 openpbr_to_world(bj basis, vec3 direction) {
return direction.x * basis.tangent
+ direction.y * basis.bitangent
+ direction.z * basis.normal;
}

vec3 openpbr_to_local(bj basis, vec3 direction) {
return vec3(
dot(direction, basis.tangent),
dot(direction, basis.bitangent),
dot(direction, basis.normal)
);
}

bj fg(
vec3 aU,
vec3 normal,
float anisotropy
) {
bj basis;
basis.normal = normal;
basis.tangent = vec3(0.0);
#ifdef USE_TANGENT
basis.tangent = aU;
#endif
if (dot(basis.tangent, basis.tangent) < 0.001 || anisotropy <= 0.0) {
aL(normal, basis.tangent, basis.bitangent);
}
else {
basis.bitangent = normalize(cross(normal, basis.tangent));
basis.tangent = normalize(cross(basis.bitangent, normal));
}
return basis;
}

float jT(
float av,
float ak,
float L,
float S
) {
return (av * L - ak * S)
/ (av * L + ak * S);
}

float jS(
float av,
float ak,
float L,
float S
) {
return (ak * L - av * S)
/ (av * S + ak * L);
}

float gY(
float av,
float ak,
float L,
float S
) {
return 2.0 * av * L
/ (av * L + ak * S);
}

float gX(
float av,
float ak,
float L,
float S
) {
return 2.0 * av * L
/ (av * S + ak * L);
}

vec2 aV(vec2 a, vec2 b) {
return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

vec2 aZ(vec2 a, vec2 b) {
float ap = max(dot(b, b), 1e-9);
return vec2(
(a.x * b.x + a.y * b.y) / ap,
(a.y * b.x - a.x * b.y) / ap
);
}

vec2 hT(vec2 value) {
float nv = length(value);
float sH = sqrt(max(0.0, 0.5 * (nv + value.x)));
float fc = sqrt(max(0.0, 0.5 * (nv - value.x)));
return vec2(sH, value.y >= 0.0 ? fc : -fc);
}

vec2 bX(
float L,
float av,
vec2 ak,
bool qy
) {
float oe = sqrt(max(0.0, 1.0 - L * L));
vec2 sp = aZ(vec2(av, 0.0), ak);
vec2 hw = sp * oe;
vec2 S = hT(
vec2(1.0, 0.0) - aV(hw, hw)
);
if (aV(ak, S).y < 0.0) {
S = -S;
}

vec2 fH = vec2(av * L, 0.0);
vec2 eA = aV(ak, S);
if (qy) {
vec2 ci = ak * L;
vec2 ce = S * av;
return aZ(
ci - ce,
ci + ce
);
}
return aZ(
fH - eA,
fH + eA
);
}

float eq(
float iD,
float gI,
float oy,
float mD,
vec2 jY,
float phase
) {
vec2 nd = vec2(cos(phase), sin(phase));
vec2 hW = aV(jY, nd);
vec2 kF = hW * (gI * mD);
vec2 ap = vec2(1.0, 0.0) - hW * oy;
vec2 hv = vec2(iD, 0.0)
+ aZ(kF, ap);
return dot(hv, hv);
}

float ar(
float L,
float wavelength,
float cn,
float aM,
float ck,
vec2 eu
) {
L = clamp(abs(L), 1e-5, 1.0);
float hq = pow(aM / ck, 2.0)
* (1.0 - L * L);
if (hq >= 1.0) {
return 1.0;
}
float cU = sqrt(1.0 - hq);
float kS = jT(
aM, ck, L, cU
);
float kR = jS(
aM, ck, L, cU
);
float jf = gY(
aM, ck, L, cU
);
float je = gX(
aM, ck, L, cU
);
float gk = ck * cU
/ max(aM * L, 1e-9);
vec2 sU = bX(
cU, ck, eu, false
);
vec2 sT = bX(
cU, ck, eu, true
);
float phase = 2.0 * PI * (2.0 * ck * cn * cU) / wavelength;
float tC = eq(
kS,
jf,
-kS,
jf * gk,
sU,
phase
);
float tB = eq(
kR,
je,
-kR,
je * gk,
sT,
phase
);
return clamp(0.5 * (tC + tB), 0.0, 1.0);
}

vec3 hC(
float L,
float cn,
float ck,
float eu,
float aM
) {
return vec3(
ar(
L, 620.0, cn, aM, ck, vec2(eu, 0.0)
),
ar(
L, 540.0, cn, aM, ck, vec2(eu, 0.0)
),
ar(
L, 450.0, cn, aM, ck, vec2(eu, 0.0)
)
);
}



vec3 dT(float au, vec3 f0, vec3 tint) {
vec3 ra = mix(f0, vec3(1.0), aE(au));
if (all(equal(tint, vec3(1.0)))) { return ra; }
float dj = 1.0 / 7.0;
float lZ = 1.0 - dj;
vec3 fF = mix(f0, vec3(1.0), aE(dj));
float dg = 1.0 - au;
float ql = au * aE(au) * dg
/ (dj * pow(lZ, 6.0));
return clamp(ra - ql * (fF - tint * fF), vec3(0.0), vec3(1.0));
}

vec2 cQ(float f0, float tg) {
float dM = clamp(f0, 0.0, 0.99);
float gH = sqrt(dM);
float qx = (1.0 - dM) / (1.0 + dM);
float qv = (1.0 + gH) / max(1.0 - gH, 1e-9);
float ior = mix(qv, qx, clamp(tg, 0.0, 1.0));
float jI = (
(ior + 1.0) * (ior + 1.0) * dM
- (ior - 1.0) * (ior - 1.0)
) / max(1.0 - dM, 1e-9);
return vec2(ior, sqrt(max(jI, 0.0)));
}

vec3 iT(
float L,
float cn,
float ck,
vec3 qW,
vec3 jP,
float aM
) {
return vec3(
ar(
L,
620.0,
cn,
aM,
ck,
cQ(qW.r, jP.r)
),
ar(
L,
540.0,
cn,
aM,
ck,
cQ(qW.g, jP.g)
),
ar(
L,
450.0,
cn,
aM,
ck,
cQ(qW.b, jP.b)
)
);
}

float bN(float cn, float weight) {
return clamp(weight, 0.0, 1.0) * smoothstep(1e-9, 30.0, cn);
}

vec3 bW(
vec3 ei,
float L,
float cn,
float ck,
float eu,
float weight,
float aM
) {
vec3 ph = hC(
L,
cn,
ck,
eu,
aM
);
return mix(
ei,
ph,
bN(cn, weight)
);
}

vec3 lf(
vec3 ei,
float L,
float cn,
float ck,
vec3 qW,
vec3 jP,
float weight,
float aM
) {
vec3 ph = iT(
L,
cn,
ck,
qW,
jP,
aM
);
return mix(
ei,
ph,
bN(cn, weight)
);
}

vec3 cE(
J material,
vec3 color,
vec3 viewLocal,
vec3 lightLocal,
float fo,
out float pdf
) {
pdf = 0.0;
if (lightLocal.z <= 0.0) {
return vec3(0.0);
}

float roughness = material.diffuseRoughness;
float gS = 0.5 - 2.0 / (3.0 * PI);
float nX = 2.0 / 3.0 - 28.0 / (15.0 * PI);
float os = lightLocal.z;
float mq = viewLocal.z;
float hL = dot(lightLocal, viewLocal) - os * mq;
float gP = hL > 0.0
? hL / max(max(os, mq), 1e-7)
: hL;
float ig = 1.0 / (1.0 + gS * roughness);
vec3 ni = color * INVPI * ig
* (1.0 + roughness * gP);

float dc = 1.0 - os;
float cP = 1.0 - mq;
float og = dc * (
0.0571085289 + dc * (
0.491881867 + dc * (
-0.332181442 + dc * 0.0714429953
)
)
);
float mZ = cP * (
0.0571085289 + cP * (
0.491881867 + cP * (
-0.332181442 + cP * 0.0714429953
)
)
);
float pm = (1.0 + roughness * og)
/ (1.0 + gS * roughness);
float ou = (1.0 + roughness * mZ)
/ (1.0 + gS * roughness);
float fQ = ig * (1.0 + nX * roughness);
vec3 hB = color * color * fQ
/ max(vec3(1e-7), vec3(1.0) - color * (1.0 - fQ));
vec3 ls = hB * INVPI
* max(1e-7, 1.0 - ou)
* max(1e-7, 1.0 - pm)
/ max(1e-7, 1.0 - fQ);
pdf = lightLocal.z * INVPI;
return (ni + ls) * fo;
}

float aO(float viewCosine, float roughness) {
float x = clamp(viewCosine, 0.0, 1.0);
float y = clamp(roughness, 0.01, 1.0);
float scale = y * (0.0206607 + 1.58491 * y)
/ (0.0379424 + y * (1.32227 + y));
float mean = y * (-0.193854 + y * (-1.14885 + y * (1.7932 - 0.95943 * y * y)))
/ (0.046391 + y);
float offset = y * (0.000654023 + (-0.0207818 + 0.119681 * y) * y)
/ (1.26264 + y * (-1.92021 + y));
float gaussian = exp(-0.5 * pow((x - mean) / scale, 2.0))
/ (scale * sqrt(2.0 * PI));
return max(gaussian + offset, 0.0);
}

vec3 jR(
J material,
vec3 viewLocal,
vec3 lightLocal,
out float pdf
) {
pdf = 0.0;
if (viewLocal.z <= 0.0 || lightLocal.z <= 0.0) {
return vec3(0.0);
}
float albedo = aO(
viewLocal.z,
material.fuzzRoughness
);
pdf = lightLocal.z * INVPI;
return material.fuzzColor * albedo * INVPI;
}

vec3 am(
J material,
vec3 viewLocal,
vec3 lightLocal,
vec3 V,
vec3 cK,
out float pdf
) {
pdf = 0.0;
if (lightLocal.z <= 0.0) {
return vec3(0.0);
}

vec2 alpha = vec2(material.alphaX, material.alphaY);
float distribution = gG(V, alpha);
float jO = bk(viewLocal, alpha);
float ea = jO
* bk(lightLocal, alpha);

pdf = jO * distribution / (4.0 * max(viewLocal.z, 1e-8));
return cK * distribution * ea
/ (4.0 * max(lightLocal.z * viewLocal.z, 1e-8));
}

vec3 dk(
J material,
float relativeIor,
vec3 tint,
vec3 viewLocal,
vec3 lightLocal,
vec3 V,
vec3 cK,
out float pdf
) {
pdf = 0.0;
if (lightLocal.z >= 0.0) {
return vec3(0.0);
}

float kC = dot(lightLocal, V);
float bQ = dot(viewLocal, V);


if (bQ <= 0.0 || kC >= 0.0) {
return vec3(0.0);
}
vec2 alpha = vec2(material.alphaX, material.alphaY);
float distribution = gG(V, alpha);
float jO = bk(viewLocal, alpha);
float ea = jO
* bk(lightLocal, alpha);
float ap = kC + bQ * relativeIor;
ap *= ap;
float pr = abs(kC) / max(ap, 1e-8);
float jo = relativeIor * relativeIor;

pdf = jO * max(0.0, bQ) * distribution * pr
/ max(viewLocal.z, 1e-8);
return tint * (vec3(1.0) - cK) * distribution * ea
* abs(bQ) * pr * jo
/ max(abs(lightLocal.z * viewLocal.z), 1e-8);
}

vec3 bn(J material) {
#ifdef HAS_MEDIUM
if (material.mediumType > 0) {
return vec3(1.0);
}
#endif
return material.transmissionColor;
}

float cS(float ah) {
return 2.0 * ah / (1.0 + ah);
}

vec3 aP(
vec3 ah,
float transmissionWeight
) {
vec3 gg = 2.0 * ah
/ (vec3(1.0) + ah);
return mix(
ah,
gg,
clamp(transmissionWeight, 0.0, 1.0)
);
}

vec3 bG(
J material,
float L,
float bu
) {
vec3 tint = bn(material);
if (!material.thinWalled) {
return tint;
}
float iG = max(0.0, 1.0 - L * L);
float dN = iG
/ max(bu * bu, 1e-9);
if (dN >= 1.0) {
return vec3(0.0);
}
float S = sqrt(1.0 - dN);
return pow(max(tint, vec3(0.0)), vec3(1.0 / max(S, 1e-5)));
}

vec3 dL(
J material,
vec3 viewLocal,
vec3 lightLocal,
out float pdf
) {
pdf = 0.0;
if (viewLocal.z <= 0.0 || lightLocal.z >= 0.0) {
return vec3(0.0);
}
float S = -lightLocal.z;
float nU = cu(
viewLocal.z,
material.relativeIor
);
pdf = S * INVPI;
return vec3(1.0 - nU) * INVPI;
}

void dQ(inout ag prepared) {
float total = prepared.probabilities[OPENPBR_LOBE_FUZZ];
for (int hQ = 1; hQ < OPENPBR_LOBE_COUNT; hQ++) {
total += prepared.probabilities[hQ];
}
if (total <= 1e-8) {
for (int hQ = 0; hQ < OPENPBR_LOBE_COUNT; hQ++) {
prepared.probabilities[hQ] = 0.0;
}
return;
}
float oj = 1.0 / total;
for (int hQ = 0; hQ < OPENPBR_LOBE_COUNT; hQ++) {
prepared.probabilities[hQ] *= oj;
}
}



float bM(float eta) {
if (abs(eta - 1.0) < 1e-6) { return 0.0; }
if (eta > 1.0) { return (eta - 1.0) / (4.08567 + 1.00071 * eta); }
return 0.997118 + 0.1014 * eta - 0.965241 * eta * eta - 0.130607 * eta * eta * eta;
}

vec3 bP(vec3 f0, vec3 tint) {
float dj = 1.0 / 7.0;
vec3 fF = mix(f0, vec3(1.0), aE(dj));
vec3 b = fF * (vec3(1.0) - tint) / (dj * pow(1.0 - dj, 6.0));
return clamp(f0 + (vec3(1.0) - f0) / 21.0 - b / 126.0, vec3(0.0), vec3(1.0));
}



vec3 cD(J material, float au) {
if (au <= 0.0) { return vec3(1.0); }
float lu = sqrt(max(0.0, 1.0 - (1.0 - au * au) / (material.coatIor * material.coatIor)));
vec3 tr = pow(max(material.coatColor, vec3(0.0)), vec3(0.5 / max(lu, 1e-5)));
return mix(vec3(1.0), tr, material.coatWeight);
}

float gj(J material, float au) {
if (material.coatRoughness <= ROUGHNESS_MIN) {
return af(au, 1.0 / material.coatIor);
}


return clamp(1.0 - aJ(material.coatIor,
material.coatRoughness * material.coatRoughness, au), 0.0, 1.0);
}

vec3 gW(ag prepared) {
J material = prepared.material;
float dielectric = 1.0 - material.baseMetalness;
float opaque = dielectric * (1.0 - material.transmissionWeight) * (1.0 - material.subsurfaceWeight);
float sss = dielectric * (1.0 - material.transmissionWeight) * material.subsurfaceWeight;
float tZ = dielectric * material.transmissionWeight;
float fL = bM(prepared.specularEtaTOverEtaI);
float kL = bM(1.0 / prepared.transmissionReflectionIor);
float pJ = clamp(opaque * fL + (sss + tZ) * kL + material.baseMetalness, 0.0, 1.0);
float jk = mix(1.0, material.specularRoughness, pJ);
float ks = bM(material.coatIor);
float kr = 1.0 - (1.0 - ks) / (material.coatIor * material.coatIor);
float k = mix(ks, kr, jk);
vec3 eb = material.baseMetalness * material.specularWeight * bP(material.baseWeight * material.baseColor, material.specularColor)
+ opaque * mix(material.baseWeight * material.baseColor, vec3(1.0), fL)
+ sss * material.subsurfaceColor + vec3(tZ);
vec3 qL = vec3(1.0 - k) / max(vec3(1.0) - eb * k, vec3(1e-6));
return mix(vec3(1.0), qL, material.coatWeight * material.coatDarkening);
}

vec3 ds(ag prepared, float lb) {
if (prepared.material.coatWeight <= 0.0) { return vec3(1.0); }
if (prepared.material.inside) {

return cD(prepared.material, -lb);
}

return prepared.coatBaseScale * cD(prepared.material, lb);
}


bj du(bj fallback, vec3 tangent, vec3 bitangent, vec2 direction) {
vec3 t = tangent - fallback.normal * dot(fallback.normal, tangent);
if (dot(t, t) < 1e-8) { t = fallback.tangent; }
t = normalize(t);
vec3 b = cross(fallback.normal, t) * (dot(cross(fallback.normal, t), bitangent) < 0.0 ? -1.0 : 1.0);
t = t * direction.x + b * direction.y;
if (dot(t, t) < 1e-8) { return fallback; }
bj basis = fallback;
basis.tangent = normalize(t);
basis.bitangent = normalize(cross(basis.normal, basis.tangent));
basis.tangent = normalize(cross(basis.bitangent, basis.normal));
return basis;
}

ag eG(
vec3 tangent,
J material,
vec3 bF,
vec3 normal
) {
ag prepared;
prepared.material = material;
prepared.basis = fg(
tangent,
normal,
max(material.specularAnisotropy, material.coatAnisotropy)
);
prepared.coatBasis = prepared.basis;
prepared.directionFrames = false;
#ifdef NUM_COAT_NORMAL_MAPS


if (material.coatNormalEnabled) {
prepared.coatBasis = fg(material.geometryTangent, material.coatNormal, material.coatAnisotropy);
prepared.directionFrames = true;
}
#endif
if (material.specularAnisotropy > 0.0 && material.anisotropyDirectionEnabled) {
prepared.basis = du(prepared.basis, material.directionTangent, material.directionBitangent, material.anisotropyDirection);
prepared.directionFrames = true;
}
if (material.coatAnisotropy > 0.0 && material.coatAnisotropyRotation != 0.0) {
prepared.coatBasis = du(prepared.coatBasis, material.geometryTangent, material.geometryBitangent, vec2(cos(material.coatAnisotropyRotation), sin(material.coatAnisotropyRotation)));
prepared.directionFrames = true;
}
prepared.viewLocal = openpbr_to_local(prepared.basis, bF);
#ifdef NUM_COAT_NORMAL_MAPS
prepared.coatViewLocal = openpbr_to_local(prepared.coatBasis, bF);
#endif
prepared.diffuseColor = material.baseColor;

float cB = 1.0 - material.baseMetalness;
float dK = cB
* (1.0 - material.transmissionWeight);
prepared.weights[OPENPBR_LOBE_FUZZ] = material.fuzzWeight;
prepared.weights[OPENPBR_LOBE_COAT] = material.coatWeight;
if (material.inside) { prepared.weights[OPENPBR_LOBE_COAT] = 0.0; }
prepared.weights[OPENPBR_LOBE_METAL] = material.baseMetalness;
prepared.weights[OPENPBR_LOBE_SPECULAR] = cB;
prepared.weights[OPENPBR_LOBE_TRANSMISSION] = cB
* material.transmissionWeight;
prepared.weights[OPENPBR_LOBE_DIFFUSE] = dK
* (1.0 - material.subsurfaceWeight) * material.baseWeight;
prepared.weights[OPENPBR_LOBE_SUBSURFACE] = dK
* material.subsurfaceWeight;

prepared.specularEtaTOverEtaI = aY(
1.0 / material.relativeIor,
material.specularWeight
);
prepared.material.relativeIor = 1.0 / prepared.specularEtaTOverEtaI;
prepared.refractionEtaTOverEtaI = prepared.specularEtaTOverEtaI;
prepared.transmissionReflectionIor = prepared.material.relativeIor;


if (material.coatWeight > 0.0) {
float cj = 1.0;
if (!material.inside) { cj = mix(1.0, material.coatIor, material.coatWeight); }
float bq = cj * aY(
material.specularIor / cj, material.specularWeight);
float er = bq / cj;
if (cj > bq && bq >= 1.0) {
er = 1.0 / er;
}
prepared.specularEtaTOverEtaI = er;
prepared.transmissionReflectionIor = 1.0 / er;
prepared.refractionEtaTOverEtaI = bq;
if (material.inside) {
prepared.refractionEtaTOverEtaI = 1.0 / bq;
prepared.transmissionReflectionIor = bq;
}
prepared.material.relativeIor = 1.0 / prepared.refractionEtaTOverEtaI;
}



prepared.thinFilmExteriorIor = 1.0;
prepared.thinFilmBaseIor = prepared.specularEtaTOverEtaI;
if (material.coatWeight > 0.0) {
if (material.inside) {
prepared.thinFilmExteriorIor = 1.0 / prepared.refractionEtaTOverEtaI;
prepared.thinFilmBaseIor = 1.0;
}
else {
prepared.thinFilmExteriorIor = mix(1.0, material.coatIor, material.coatWeight);
prepared.thinFilmBaseIor = prepared.refractionEtaTOverEtaI;
}
}
prepared.specularAlpha = material.specularRoughness
* material.specularRoughness;
float viewCosine = abs(prepared.viewLocal.z);
float ah = af(
viewCosine,
1.0 / prepared.specularEtaTOverEtaI
);
vec3 ft = material.specularColor * (
material.thinWalled
? mix(
ah,
cS(ah),
material.transmissionWeight
)
: ah
);
vec3 hR = material.specularWeight * dT(
viewCosine,
material.baseWeight * material.baseColor,
material.specularColor
);
float eL = material.thinWalled
? cS(af(viewCosine, prepared.transmissionReflectionIor))
: af(viewCosine, prepared.transmissionReflectionIor);
vec3 gJ = bG(
material,
viewCosine,
prepared.refractionEtaTOverEtaI
);
float il = aJ(
prepared.specularEtaTOverEtaI,
prepared.specularAlpha,
viewCosine
);
float gm = cr(
prepared.specularEtaTOverEtaI,
prepared.specularAlpha
);
prepared.diffuseSpecularEnergyCompensation = il
/ max(gm, 1e-12);

prepared.probabilities[OPENPBR_LOBE_FUZZ] = prepared.weights[OPENPBR_LOBE_FUZZ]
* aw(material.fuzzColor)
* max(aO(
viewCosine,
material.fuzzRoughness
), 0.02);
prepared.probabilities[OPENPBR_LOBE_COAT] = 0.0;
prepared.coatBaseScale = vec3(1.0);
if (material.coatWeight > 0.0 && !material.inside) {
#ifdef NUM_COAT_NORMAL_MAPS
float coatViewCosine = material.coatNormalEnabled ? max(prepared.coatViewLocal.z, 0.0) : viewCosine;
float kt = gj(material, coatViewCosine);
#else
float kt = gj(material, viewCosine);
#endif
prepared.probabilities[OPENPBR_LOBE_COAT] = prepared.weights[OPENPBR_LOBE_COAT] * kt;
prepared.coatBaseScale = cD(material,
#ifdef NUM_COAT_NORMAL_MAPS
coatViewCosine
#else
viewCosine
#endif
)
* (1.0 - prepared.weights[OPENPBR_LOBE_COAT] * kt) * gW(prepared);
}
prepared.probabilities[OPENPBR_LOBE_METAL] = prepared.weights[OPENPBR_LOBE_METAL]
* aw(hR);
prepared.metalMsScale = vec3(0.0);
prepared.metalMsFactor = 0.0;
prepared.metalMsProbability = 0.0;
if (material.specularRoughness >= 0.04 && prepared.weights[OPENPBR_LOBE_METAL] > 0.0) {
vec3 hH = bP(material.baseWeight * material.baseColor, material.specularColor);
prepared.metalMsScale = material.specularWeight * hH * hH;
float pN = bH(prepared.specularAlpha, viewCosine);
prepared.metalMsFactor = pN / max(cv(prepared.specularAlpha), 1e-12);
float ff = prepared.weights[OPENPBR_LOBE_METAL] * aw(prepared.metalMsScale) * pN;
prepared.probabilities[OPENPBR_LOBE_METAL] += ff;
prepared.metalMsProbability = ff / max(prepared.probabilities[OPENPBR_LOBE_METAL], 1e-12);
}
prepared.probabilities[OPENPBR_LOBE_SPECULAR] = prepared.weights[OPENPBR_LOBE_SPECULAR]
* aw(ft);
prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] = prepared.weights[OPENPBR_LOBE_TRANSMISSION]
* (1.0 - eL)
* aw(gJ);






prepared.dielectricMsReflectionScale = vec3(0.0);
prepared.dielectricMsTransmissionScale = vec3(0.0);
prepared.dielectricMsViewLoss = 0.0;
prepared.dielectricMsReflectionRatio = 0.0;
prepared.dielectricMsProbability = 0.0;
if (!material.thinWalled && material.transmissionWeight > 0.0 &&
prepared.specularAlpha >= 0.0016 && prepared.weights[OPENPBR_LOBE_TRANSMISSION] > 0.0 &&
abs(prepared.refractionEtaTOverEtaI - 1.0) > 1e-6) {
float lt = prepared.weights[OPENPBR_LOBE_TRANSMISSION] + prepared.weights[OPENPBR_LOBE_SUBSURFACE];
prepared.dielectricMsReflectionScale = (material.inside ? vec3(1.0) : material.specularColor) * lt;
prepared.dielectricMsTransmissionScale = gJ * prepared.weights[OPENPBR_LOBE_TRANSMISSION]
+ vec3(prepared.weights[OPENPBR_LOBE_SUBSURFACE]);
prepared.dielectricMsReflectionRatio = ch(prepared.refractionEtaTOverEtaI, prepared.specularAlpha);
prepared.dielectricMsViewLoss = bO(prepared.refractionEtaTOverEtaI, prepared.specularAlpha, viewCosine);
vec3 nL = mix(prepared.dielectricMsTransmissionScale, prepared.dielectricMsReflectionScale, prepared.dielectricMsReflectionRatio);
float ff = aw(nL) * prepared.dielectricMsViewLoss;
prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] += ff;
prepared.dielectricMsProbability = ff / max(prepared.probabilities[OPENPBR_LOBE_TRANSMISSION], 1e-12);
}
prepared.probabilities[OPENPBR_LOBE_DIFFUSE] = prepared.weights[OPENPBR_LOBE_DIFFUSE]
* aw(prepared.diffuseColor)
* prepared.diffuseSpecularEnergyCompensation;
prepared.probabilities[OPENPBR_LOBE_SUBSURFACE] = prepared.weights[OPENPBR_LOBE_SUBSURFACE]
* (1.0 - eL)
* aw(material.subsurfaceColor)
* prepared.diffuseSpecularEnergyCompensation;


if (material.coatWeight > 0.0 && material.thinFilmWeight > 0.0) {
float kZ = 0.02 * bN(material.thinFilmThickness, material.thinFilmWeight);
prepared.probabilities[OPENPBR_LOBE_SPECULAR] = max(prepared.probabilities[OPENPBR_LOBE_SPECULAR], prepared.weights[OPENPBR_LOBE_SPECULAR] * kZ);
prepared.probabilities[OPENPBR_LOBE_METAL] = max(prepared.probabilities[OPENPBR_LOBE_METAL], prepared.weights[OPENPBR_LOBE_METAL] * material.specularWeight * kZ);
}
if (material.coatWeight > 0.0 && !material.inside) {
float gn = max(max(prepared.coatBaseScale.x, prepared.coatBaseScale.y), prepared.coatBaseScale.z);
prepared.probabilities[OPENPBR_LOBE_METAL] *= gn;
prepared.probabilities[OPENPBR_LOBE_SPECULAR] *= gn;
prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] *= gn;
prepared.probabilities[OPENPBR_LOBE_DIFFUSE] *= gn;
prepared.probabilities[OPENPBR_LOBE_SUBSURFACE] *= gn;
}
dQ(prepared);
return prepared;
}

float cR(ag prepared, float au, bool reflection) {
if (prepared.material.coatWeight <= 0.0) {
return af(au, prepared.material.relativeIor);
}
float ki = af(au, prepared.transmissionReflectionIor);
if (!reflection) { return ki; }
float mX = af(au, 1.0 / prepared.specularEtaTOverEtaI);
float rH = prepared.material.transmissionWeight + (1.0 - prepared.material.transmissionWeight) * prepared.material.subsurfaceWeight;
return mix(mX, ki, rH);
}

vec3 bI(
ag prepared,
vec3 lightDirection,
out float pdf
) {
J material = prepared.material;
vec3 viewLocal = prepared.viewLocal;
vec3 lightLocal = openpbr_to_local(prepared.basis, lightDirection);
bool reflection = lightLocal.z * viewLocal.z > 0.0;
#ifdef NUM_COAT_NORMAL_MAPS
bool independentCoat = material.coatNormalEnabled;
bool geometricReflection = dot(material.geometricNormal, lightDirection) > 0.0;
float coatLightCosine = dot(prepared.coatBasis.normal, lightDirection);
bool coatReflection = geometricReflection && prepared.coatViewLocal.z > 0.0 && coatLightCosine > 0.0;
#endif

vec3 V;
if (reflection) {
V = normalize(lightLocal + viewLocal);
}
else {
V = normalize(lightLocal + viewLocal * material.relativeIor);
}
if (V.z < 0.0) {
V = -V;
}

vec3 response = vec3(0.0);
pdf = 0.0;
float aI = 0.0;
float bQ = abs(dot(viewLocal, V));
float diffuseSpecularEnergyCompensation =
prepared.diffuseSpecularEnergyCompensation
* aJ(
prepared.specularEtaTOverEtaI,
prepared.specularAlpha,
abs(lightLocal.z)
);

#ifdef NUM_COAT_NORMAL_MAPS
if (!independentCoat || (lightLocal.z != 0.0 && reflection == geometricReflection)) {
#endif
if (reflection) {
if (prepared.weights[OPENPBR_LOBE_DIFFUSE] > 0.0) {
response += prepared.weights[OPENPBR_LOBE_DIFFUSE] * cE(
material,
prepared.diffuseColor,
viewLocal,
lightLocal,
diffuseSpecularEnergyCompensation,
aI
);
pdf += prepared.probabilities[OPENPBR_LOBE_DIFFUSE] * aI;
}

if (prepared.weights[OPENPBR_LOBE_SUBSURFACE] > 0.0 && material.thinWalled) {
response += 0.5 * prepared.weights[OPENPBR_LOBE_SUBSURFACE] * cE(
material,
material.subsurfaceColor,
viewLocal,
lightLocal,
diffuseSpecularEnergyCompensation,
aI
);
pdf += prepared.probabilities[OPENPBR_LOBE_SUBSURFACE] * 0.5 * aI;
}

if (prepared.weights[OPENPBR_LOBE_SPECULAR] > 0.0) {
vec3 ct = vec3(cR(prepared, bQ, true));
if (material.thinFilmWeight > 0.0) {
ct = bW(
ct,
bQ,
material.thinFilmThickness,
material.thinFilmIor,
prepared.thinFilmBaseIor,
material.thinFilmWeight,
prepared.thinFilmExteriorIor
);
}
if (material.thinWalled) {
ct = aP(
ct,
material.transmissionWeight
);
}
vec3 cK = material.specularColor * ct;
response += prepared.weights[OPENPBR_LOBE_SPECULAR] * am(
material,
viewLocal,
lightLocal,
V,
cK,
aI
);
pdf += prepared.probabilities[OPENPBR_LOBE_SPECULAR] * aI;
}

if (prepared.weights[OPENPBR_LOBE_METAL] > 0.0) {
vec3 cK = dT(
bQ,
material.baseWeight * material.baseColor,
material.specularColor
);
if (material.thinFilmWeight > 0.0) {
cK = lf(
cK,
bQ,
material.thinFilmThickness,
material.thinFilmIor,
material.baseWeight * material.baseColor,
material.specularColor,
material.thinFilmWeight,
prepared.thinFilmExteriorIor
);
}
cK *= material.specularWeight;
response += prepared.weights[OPENPBR_LOBE_METAL] * am(
material,
viewLocal,
lightLocal,
V,
cK,
aI
);
if (prepared.metalMsFactor > 0.0) {
float dW = min(prepared.metalMsFactor * bH(prepared.specularAlpha, lightLocal.z), 1.0 / max(lightLocal.z, 1e-8));
response += prepared.weights[OPENPBR_LOBE_METAL] * prepared.metalMsScale * dW * INVPI;
aI = mix(aI, 0.5 * INVPI, prepared.metalMsProbability);
}
pdf += prepared.probabilities[OPENPBR_LOBE_METAL] * aI;
}
}
else {
vec3 cK = vec3(cR(prepared, bQ, false));
if (material.thinFilmWeight > 0.0) {
cK = bW(
cK,
bQ,
material.thinFilmThickness,
material.thinFilmIor,
prepared.thinFilmBaseIor,
material.thinFilmWeight,
prepared.thinFilmExteriorIor
);
}
if (prepared.weights[OPENPBR_LOBE_TRANSMISSION] > 0.0) {
if (material.thinWalled) {
vec3 kP = vec3(lightLocal.xy, -lightLocal.z);
vec3 dd = normalize(kP + viewLocal);
if (dd.z < 0.0) {
dd = -dd;
}
float nG = abs(dot(viewLocal, dd));
vec3 lB = vec3(cR(prepared, nG, false));
if (material.thinFilmWeight > 0.0) {
lB = bW(
lB,
nG,
material.thinFilmThickness,
material.thinFilmIor,
prepared.thinFilmBaseIor,
material.thinFilmWeight,
prepared.thinFilmExteriorIor
);
}
vec3 gg = aP(
lB,
1.0
);
vec3 tint = bG(
material,
abs(viewLocal.z),
prepared.refractionEtaTOverEtaI
);
response += prepared.weights[OPENPBR_LOBE_TRANSMISSION]
* am(
material,
viewLocal,
kP,
dd,
tint * (vec3(1.0) - gg),
aI
);
}
else {
response += prepared.weights[OPENPBR_LOBE_TRANSMISSION]
* dk(
material,
material.relativeIor,
bn(material),
viewLocal,
lightLocal,
V,
cK,
aI
);
}
if (prepared.dielectricMsProbability > 0.0) {
aI *= 1.0 - prepared.dielectricMsProbability;
}
pdf += prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] * aI;
}
if (prepared.weights[OPENPBR_LOBE_SUBSURFACE] > 0.0) {
if (material.thinWalled) {
vec3 nW = vec3(lightLocal.xy, -lightLocal.z);
response += 0.5 * prepared.weights[OPENPBR_LOBE_SUBSURFACE]
* cE(
material,
material.subsurfaceColor,
viewLocal,
nW,
diffuseSpecularEnergyCompensation,
aI
);
aI *= 0.5;
}
else {
response += prepared.weights[OPENPBR_LOBE_SUBSURFACE] * dL(
material,
viewLocal,
lightLocal,
aI
);
}
pdf += prepared.probabilities[OPENPBR_LOBE_SUBSURFACE] * aI;
}
}




if (prepared.dielectricMsProbability > 0.0) {
float au = abs(lightLocal.z);
if (au > 0.0) {
float ior = (reflection ? prepared.refractionEtaTOverEtaI : 1.0 / prepared.refractionEtaTOverEtaI);
float iV = (reflection ? prepared.dielectricMsReflectionRatio : 1.0 - prepared.dielectricMsReflectionRatio);
float tj = prepared.dielectricMsViewLoss * bO(ior, prepared.specularAlpha, au)
/ max(cO(ior, prepared.specularAlpha), 1e-12);
float dW = min(tj * iV, 1.0 / au);
vec3 scale = (reflection ? prepared.dielectricMsReflectionScale : prepared.dielectricMsTransmissionScale);
response += scale * dW * INVPI;
pdf += prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] * prepared.dielectricMsProbability * iV * 0.5 * INVPI;
}
}

#ifdef NUM_COAT_NORMAL_MAPS
} 
#endif
if (material.coatWeight > 0.0) {
response *= ds(prepared,
#ifdef NUM_COAT_NORMAL_MAPS
independentCoat ? coatLightCosine : lightLocal.z
#else
lightLocal.z
#endif
);
}
#ifdef NUM_COAT_NORMAL_MAPS
if (independentCoat) { response *= abs(lightLocal.z); }
#endif

if (
#ifdef NUM_COAT_NORMAL_MAPS
(independentCoat ? coatReflection : reflection)
#else
reflection
#endif
&& prepared.weights[OPENPBR_LOBE_COAT] > 0.0) {
vec3 dH = viewLocal;
vec3 kv = lightLocal;
vec3 gr = V;
float jF = bQ;
if (prepared.directionFrames) {
dH = openpbr_to_local(prepared.coatBasis, openpbr_to_world(prepared.basis, viewLocal));
#ifdef NUM_COAT_NORMAL_MAPS
if (independentCoat) { dH = prepared.coatViewLocal; }
#endif
kv = openpbr_to_local(prepared.coatBasis, lightDirection);
gr = normalize(kv + dH);
if (gr.z < 0.0) { gr = -gr; }
jF = abs(dot(dH, gr));
}

vec3 kX = vec3(af(
jF,
1.0 / material.coatIor
));
J dG = material;
vec2 jr = aK(material.coatRoughness, material.coatAnisotropy);
dG.alphaX = jr.x;
dG.alphaY = jr.y;
response += prepared.weights[OPENPBR_LOBE_COAT]
#ifdef NUM_COAT_NORMAL_MAPS
* (independentCoat ? max(coatLightCosine, 0.0) : 1.0)
#endif
* am(
dG,
dH,
kv,
gr,
kX,
aI
);
pdf += prepared.probabilities[OPENPBR_LOBE_COAT] * aI;
}

if (
#ifdef NUM_COAT_NORMAL_MAPS
(independentCoat ? geometricReflection : reflection)
#else
reflection
#endif
&& prepared.weights[OPENPBR_LOBE_FUZZ] > 0.0) {
float qr = aO(
abs(viewLocal.z),
material.fuzzRoughness
);
response *= max(
vec3(0.0),
vec3(1.0 - prepared.weights[OPENPBR_LOBE_FUZZ] * qr)
);
response += prepared.weights[OPENPBR_LOBE_FUZZ]
#ifdef NUM_COAT_NORMAL_MAPS
* (independentCoat ? max(lightLocal.z, 0.0) : 1.0)
#endif
* jR(
material,
viewLocal,
lightLocal,
aI
);
pdf += prepared.probabilities[OPENPBR_LOBE_FUZZ] * aI;
}

#ifdef NUM_COAT_NORMAL_MAPS
if (independentCoat) { return response; }
#endif
return response * abs(lightLocal.z);
}

vec3 qY(
vec3 tangent,
J material,
vec3 bF,
vec3 normal,
vec3 lightDirection,
out float pdf
) {
ag prepared = eG(
tangent,
material,
bF,
normal
);
return bI(prepared, lightDirection, pdf);
}

float vP(
vec3 tangent,
J material,
vec3 bF,
vec3 normal,
vec3 lightDirection
) {
float pdf;
qY(
tangent,
material,
bF,
normal,
lightDirection,
pdf
);
return pdf;
}

vec3 dv(
ag prepared,
vec3 cm,
out vec3 lightDirection,
out float pdf,
out bool isTransmissionEvent
) {
J material = prepared.material;
vec3 viewLocal = prepared.viewLocal;
float cy = cm.x;
float fp = cm.y;
float bm = cm.z;
pdf = 0.0;
isTransmissionEvent = false;
lightDirection = prepared.basis.normal;



if (!prepared.material.thinWalled &&
abs(prepared.material.relativeIor - 1.0) <= 1e-6 &&
prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] >= 1.0 - 1e-6) {
lightDirection = openpbr_to_world(prepared.basis, -viewLocal);
pdf = 1.0;
isTransmissionEvent = true;
return (bn(prepared.material) * ds(prepared,
#ifdef NUM_COAT_NORMAL_MAPS
prepared.material.coatNormalEnabled ? dot(prepared.coatBasis.normal, lightDirection) : -prepared.viewLocal.z
#else
-prepared.viewLocal.z
#endif
));
}

float cdf[OPENPBR_LOBE_COUNT];
cdf[OPENPBR_LOBE_FUZZ] = prepared.probabilities[OPENPBR_LOBE_FUZZ];
for (int hQ = 1; hQ < OPENPBR_LOBE_COUNT; hQ++) {
cdf[hQ] = cdf[hQ - 1] + prepared.probabilities[hQ];
}
if (cdf[OPENPBR_LOBE_SUBSURFACE] <= 0.0) {
return vec3(0.0);
}

vec3 lightLocal;
if (bm < cdf[OPENPBR_LOBE_FUZZ] || (
bm >= cdf[OPENPBR_LOBE_TRANSMISSION] && bm < cdf[OPENPBR_LOBE_DIFFUSE]
)) {
lightLocal = bi(vec2(cy, fp));
}
else if (bm < cdf[OPENPBR_LOBE_COAT]) {
vec3 dH = viewLocal;
if (prepared.directionFrames) { dH = openpbr_to_local(prepared.coatBasis, openpbr_to_world(prepared.basis, viewLocal)); }
#ifdef NUM_COAT_NORMAL_MAPS
if (material.coatNormalEnabled) { dH = prepared.coatViewLocal; }
#endif
vec3 V = aQ(
dH,

aK(material.coatRoughness, material.coatAnisotropy),
vec2(cy, fp)
);
if (V.z < 0.0) {
V = -V;
}
lightLocal = normalize(reflect(-dH, V));
#ifdef NUM_COAT_NORMAL_MAPS
if (material.coatNormalEnabled) {
lightDirection = openpbr_to_world(prepared.coatBasis, lightLocal);
if (lightLocal.z <= 0.0 || dot(material.geometricNormal, lightDirection) <= 0.0) { return vec3(0.0); }
return bI(prepared, lightDirection, pdf);
}
#endif
if (prepared.directionFrames) { lightLocal = openpbr_to_local(prepared.basis, openpbr_to_world(prepared.coatBasis, lightLocal)); }
}
else if (bm < cdf[OPENPBR_LOBE_SPECULAR]) {
bool tm = bm < cdf[OPENPBR_LOBE_METAL];
float rE = (bm - cdf[OPENPBR_LOBE_COAT]) / max(prepared.probabilities[OPENPBR_LOBE_METAL], 1e-12);
if (tm && rE < prepared.metalMsProbability) {
float z = cy;
float fi = sqrt(max(0.0, 1.0 - z * z));
float br = TWOPI * fp;
lightLocal = vec3(fi * cos(br), fi * sin(br), z);
}
else {
vec3 V = aQ(
viewLocal,
vec2(material.alphaX, material.alphaY),
vec2(cy, fp)
);
if (V.z < 0.0) {
V = -V;
}
lightLocal = normalize(reflect(-viewLocal, V));
}
}
else if (bm < cdf[OPENPBR_LOBE_TRANSMISSION]) {
isTransmissionEvent = true;


float uk = (bm - cdf[OPENPBR_LOBE_SPECULAR]) / max(prepared.probabilities[OPENPBR_LOBE_TRANSMISSION], 1e-12);
if (prepared.dielectricMsProbability > 0.0 && uk < prepared.dielectricMsProbability) {
float iV = prepared.dielectricMsReflectionRatio;
bool lP = cy < iV;
float z;
if (lP) { z = min(cy / iV, 0.99999994); }
else { z = -min((cy - iV) / (1.0 - iV), 0.99999994); }
float fi = sqrt(max(0.0, 1.0 - z * z));
float br = TWOPI * fp;
lightLocal = vec3(fi * cos(br), fi * sin(br), z);
isTransmissionEvent = !lP;
}
else {
vec3 V = aQ(
viewLocal,
vec2(material.alphaX, material.alphaY),
vec2(cy, fp)
);
if (V.z < 0.0) {
V = -V;
}
float bQ = abs(dot(viewLocal, V));
vec3 cK = vec3(af(
bQ,
prepared.material.relativeIor
));
if (material.thinFilmWeight > 0.0) {
cK = bW(
cK,
bQ,
material.thinFilmThickness,
material.thinFilmIor,
prepared.thinFilmBaseIor,
material.thinFilmWeight,
prepared.thinFilmExteriorIor
);
}
if (material.thinWalled) {
vec3 hV = normalize(reflect(-viewLocal, V));
lightLocal = vec3(hV.xy, -hV.z);
}
else {
lightLocal = refract(
-viewLocal,
V,
prepared.material.relativeIor
);
if (dot(lightLocal, lightLocal) <= 1e-8) {
isTransmissionEvent = false;
return vec3(0.0);
}
lightLocal = normalize(lightLocal);
}
}
}
else {
isTransmissionEvent = true;
if (material.thinWalled) {
float kB = cy;
bool pL = kB >= 0.5;
cy = pL
? (kB - 0.5) * 2.0
: kB * 2.0;
lightLocal = bi(vec2(cy, fp));
if (pL) {
lightLocal.z = -lightLocal.z;
}
else {
isTransmissionEvent = false;
}
}
else {
lightLocal = bi(vec2(cy, fp));
lightLocal.z = -lightLocal.z;
}
}

lightDirection = openpbr_to_world(prepared.basis, lightLocal);

if (lightLocal.z == 0.0 || (lightLocal.z < 0.0) != isTransmissionEvent) {
return vec3(0.0);
}
#ifdef NUM_COAT_NORMAL_MAPS
if (material.coatNormalEnabled &&
((dot(material.geometricNormal, lightDirection) <= 0.0) != isTransmissionEvent)) { return vec3(0.0); }
#endif
return bI(prepared, lightDirection, pdf);
}

vec3 sB(
vec3 tangent,
J material,
vec3 cm,
vec3 bF,
vec3 normal,
out vec3 lightDirection,
out float pdf,
out bool isTransmissionEvent
) {
ag prepared = eG(tangent, material, bF, normal);
return dv(prepared, cm, lightDirection, pdf, isTransmissionEvent);
}`;var Qr=G`




vec3 aQ(vec3 view, vec2 alpha, vec2 samplePoint) {
vec3 rc = vec3(alpha, 1.0);
vec3 gf = normalize(rc * view);
float ua = min(gf.z, 1.0);
float qH = 1.0 + ua;
float qX = (1.0 - samplePoint.y) * qH;
float rJ = samplePoint.y * qH;
float sA = qX + (1.0 - ua);
float fi = sqrt(max(0.0, sA * rJ));
float br = TWOPI * samplePoint.x;
vec3 lw = vec3(
gf.x + fi * cos(br),
gf.y + fi * sin(br),
qX
);
return normalize(rc * lw);
}

float gG(vec3 od, vec2 alpha) {
vec3 hm = vec3(
od.x / alpha.x,
od.y / alpha.y,
od.z
);
float ap = dot(hm, hm);
return 1.0 / (
PI * alpha.x * alpha.y * ap * ap
);
}

float bk(vec3 direction, vec2 alpha) {
float eE = abs(direction.z);
if (eE <= 1e-8) {
return 0.0;
}
vec2 hY = alpha * direction.xy;
float lA = dot(hY, hY)
/ (eE * eE);
return 2.0 / (1.0 + sqrt(1.0 + lA));
}

float aE(float au) {
float dg = clamp(1.0 - au, 0.0, 1.0);
return pow(dg, 5.0);
}

float cu(float L, float cJ) {
float iu = clamp(abs(L), 0.0, 1.0);
float ke = cJ * cJ
* max(0.0, 1.0 - iu * iu);
if (ke >= 1.0) {
return 1.0;
}

float lK = sqrt(max(0.0, 1.0 - ke));
float ba = (iu - cJ * lK)
/ max(iu + cJ * lK, 1e-8);
float pw = (cJ * iu - lK)
/ max(cJ * iu + lK, 1e-8);
return 0.5 * (
ba * ba + pw * pw
);
}

vec2 gd(vec2 samplePoint) {
vec2 offset = 2.0 * samplePoint - vec2(1.0);
if (offset.x == 0.0 && offset.y == 0.0) {
return vec2(0.0);
}

float radius;
float angle;
if (abs(offset.x) > abs(offset.y)) {
radius = offset.x;
angle = 0.25 * PI * (offset.y / offset.x);
}
else {
radius = offset.y;
angle = 0.5 * PI - 0.25 * PI * (offset.x / offset.y);
}
return radius * vec2(cos(angle), sin(angle));
}

vec3 bi(vec2 samplePoint) {
vec2 kx = gd(samplePoint);
return vec3(
kx,
sqrt(max(0.0, 1.0 - dot(kx, kx)))
);
}

float aG(float pi, float nD) {
float scale = max(pi, nD);
if (scale <= 0.0) {
return 0.0;
}
vec2 normalized = vec2(pi, nD) / scale;
vec2 oG = normalized * normalized;
return oG.x / (oG.x + oG.y);
}

void aL(in vec3 normal, out vec3 tangent, out vec3 bitangent) {
float ie = normal.z >= 0.0 ? 1.0 : -1.0;
float dW = -1.0 / (ie + normal.z);
float xy = normal.x * normal.y * dW;
tangent = vec3(
1.0 + ie * normal.x * normal.x * dW,
ie * xy,
-ie * normal.x
);
bitangent = vec3(
xy,
ie + normal.y * normal.y * dW,
-normal.y
);
}

vec3 ai(vec3 rgb, float wavelength) {
if (wavelength == 0.0) {
return rgb;
}
vec3 tG = wavelength > 600.0
? vec3(1.0, 0.0, 0.0)
: wavelength > 500.0
? vec3(0.0, 1.0, 0.0)
: vec3(0.0, 0.0, 1.0);
return rgb * tG;
}

float eK(
float wavelength,
float hb,
float hk,
float qk
) {
if (wavelength == 0.0 || hk <= 0.0) {
return hb;
}

const float FRAUNHOFER_C = 656.3;
const float FRAUNHOFER_D = 587.6;
const float FRAUNHOFER_F = 486.1;
float jK = 1.0 / (
1.0 / (FRAUNHOFER_F * FRAUNHOFER_F)
- 1.0 / (FRAUNHOFER_C * FRAUNHOFER_C)
);
float mT = max(qk / hk, 1e-6);
float qI = (hb - 1.0) * jK / mT;
float td = hb
- qI / (FRAUNHOFER_D * FRAUNHOFER_D);
return td + qI / (wavelength * wavelength);
}

vec3 fl(
vec3 gu,
float anisotropy,
vec2 samplePoint
) {
float au;
if (abs(anisotropy) < 0.001) {
au = 1.0 - 2.0 * samplePoint.y;
}
else {
float iV = (1.0 - anisotropy * anisotropy)
/ (1.0 + anisotropy - 2.0 * anisotropy * samplePoint.y);
au = (
iV * iV - 1.0 - anisotropy * anisotropy
) / (2.0 * anisotropy);
}

float tW = sqrt(max(0.0, 1.0 - au * au));
float br = TWOPI * samplePoint.x;
vec3 tangent;
vec3 bitangent;
aL(gu, tangent, bitangent);
return tangent * (tW * cos(br))
+ bitangent * (tW * sin(br))
+ gu * au;
}

float bD(float au, float anisotropy) {
float ap = 1.0 + anisotropy * anisotropy
+ 2.0 * anisotropy * au;
return INV4PI * (1.0 - anisotropy * anisotropy)
/ (ap * sqrt(ap));
}
`;var Rf=G`
#if defined(HAS_TRANSMISSION) || defined(HAS_ALPHA)
if (!si.isTransparency && BOUNCES < 16 && depth * 2 > BOUNCES) {
aa.abort = true;
return;
}
#endif
`,Uf=G`

for(int vN = 0; vN < BOUNCES; vN++) {{
if (aa.abort) {
return vec4(aa.li, aa.alpha);
}
bounce(aa, depth, si, mat, outAux);
}}
`,Lf=G`
bool uY = !si.isTransparency;
int qF = min(BOUNCES, bounceLimit);
for(int idx = 0; idx < min(BOUNCES * 3, ${20}); idx++) {
if (uY && idx > qF) {
aa.abort = true;
}
if (aa.abort) {
return vec4(aa.li, aa.alpha);
}
bounce(aa, depth, si, mat, outAux);
}
`;function Yn(){let i=nr();return new _e({name:"rayTraceFrag",outputs:["color","albedo","normal","moments"],defines:{BOUNCES:2},uniforms:{cameraApertureRadius:C.uniform("float",0),cameraFocusDistance:C.uniform("float",10),viewProjectionInv:C.uniform("mat4"),viewInv:C.uniform("mat4"),transmissiveOutputAlphaMin:C.uniform("float"),openPbrEnergyLut:C.uniform("sampler2D"),viewportSize:C.uniform("vec2"),wavelength:C.uniform("float",0),bevelEnabled:C.uniform("bool",!0),dispersionWavelengths:C.uniform("int",3),bounceLimit:C.uniform("int",8)},includes:[Gt,Ht,Wt,Yt,hi],main:G`
${pi}

${gi}
${Yt.main}

${wr}

${Gt.main}

${mi}

${Ht.main}
${Wt.main}
${hi.main}

${Qr}
${il}

float mk;
float bf;

${_r}
${Al}

${Er}
struct RayTraceAuxiliary {

vec3 albedo;
vec3 normal;
bool isBlank;

bool isShadowCatcher;
};

void bounce(inout Path aa, inout int depth, inout ad si, inout J mat, inout RayTraceAuxiliary outAux) {
cF = uint(max(depth, 0));




${i?Rf:""}

bool isShadowCatcher = mat.materialType == SHADOW_CATCHER;
if (isShadowCatcher) {
if (aa.fromEye) {


outAux.albedo = vec3(1.0);
outAux.normal = dot(si.normal, aa.ray.d) > 0.0 ? -si.normal : si.normal;
si.hit = false;
outAux.isShadowCatcher = true;
}
else {


#ifdef USE_ENVMAP
if (aa.isNextRefraction) {



vec4 bg = cx(aa.ray.o, aa.ray.d);
bg.rgb = ai(bg.rgb, bf);
float cT = aa.scatteringIsDelta ? 1.0
: aG(aa.scatteringPdf,
iv(aS(aa.ray.d)) * envLightSelectionPmf);
aa.li += cT * aa.beta * bg.rgb * bg.a;
aa.alpha = max(aa.alpha, bg.a);
}
else {
vec2 tJ = aS(aa.ray.d);
vec3 emission = textureLinear(envMap, tJ).rgb;
emission = ai(emission, bf);
aa.li += aa.beta * emission *
aG(
aa.scatteringPdf,
iv(tJ) * envLightSelectionPmf
);
}
#else
vec4 bg = cx(aa.ray.o, aa.ray.d);
bg.rgb = ai(bg.rgb, bf);
aa.li += aa.beta * bg.rgb * bg.a;
#endif
aa.abort = true;
return;
}
}

if (!si.hit) {

vec4 bg = cx(aa.ray.o, aa.ray.d);



bg.rgb = ai(bg.rgb, bf);
if (aa.fromEye) {
aa.li = bg.rgb * bg.a;
aa.alpha = bg.a;

outAux.isBlank = bg.a < 0.01;
}
else {
Ray cam = hy(v_Texcoord + rS());
bool mC = dot(cam.d, aa.ray.d) > 0.0;
if (transmissiveOutputAlphaMin < 1.0) {
if (mC) {
aa.alpha = max(aa.alpha, bg.a);
} else {
aa.alpha = 1.0;
}
}
#if !defined(USE_ENVMAP)

if (mC) {
aa.li = aa.beta * aG(aa.scatteringPdf, 1.0) * bg.rgb;
}
#endif
}
aa.abort = true;
return;
}

bool cH = false;
if ((mat.materialType == STANDARD || mat.materialType == UNLIT)) {
if (transmissiveOutputAlphaMin < 1.0) {

float alpha = max(1.0 - mat.transmissionWeight, 1.0 - pow(1.0 - transmissiveOutputAlphaMin, float(depth)));
aa.alpha = max(alpha, aa.alpha);
}
float alpha = mat.alpha;
if (alpha < 1.0) {


aa.alpha = max(aa.alpha, alpha);
if (eo(3u) > alpha) {
cH = true;
}
}
if (!cH) {
lR(si, mat, aa);
}
else {
aa.ray.o = si.position + aa.ray.d * EPS;
}
}

if (!si.albedoSampled && !cH) {

if ((mat.materialType == STANDARD || mat.materialType == UNLIT) &&
!(mat.transmissionWeight > 0.5 ||
(mat.specularRoughness <= 0.02 && mat.baseMetalness > 0.98))) {



outAux.albedo = mat.baseColor;
outAux.normal = dot(si.normal, si.position - vec3(viewInv[3])) > 0.0
? -si.normal
: si.normal;
si.albedoSampled = true;
}
if (depth > 4) {
si.albedoSampled = true;
}
}



#ifdef USE_RR
if (depth >= RR_MAX && !cH) {

float oo = max(max(aa.beta.x, aa.beta.y), aa.beta.z);
float q = max(0.0, 1.0 - oo);
if (dz(cw(RUSSIAN_ROULETTE)) < q) {


aa.alpha = 1.0;
aa.abort = true;
}
else {
aa.beta /= 1.0 - q;
}
}
#endif

if (aa.abort) {
return;
}


cY(aa.ray, si, true);
eT(mat, si.materialIndex, si.uv, si.uv1, si.instanceIndex);
si.isTransparency = mat.transmissionWeight > 0.001 || mat.subsurfaceWeight > 0.001 || mat.alpha < 0.999;




if (dispersionWavelengths == 1 && si.hit && mat.transmissionWeight > 0.001 && mat.transmissionDispersionScale > 0.001) {
bf = mk;
}
if (mat.transmissionWeight > 0.001 && bf > 0.0) {
mat.specularIor = eK(
bf,
mat.specularIor,
mat.transmissionDispersionScale,
mat.dispersionAbbeNumber
);
}

if (cH) {
return;
}

bool hu = eo(3u) < mat.alpha;
#ifdef NUM_LIGHTS

LightSampleRec lightSample;
for (int i = 0; i < NUM_LIGHTS; i++) {

Light light = qp(i);
float d = mo(aa.ray, light, lightSample);
bool mt = si.hit && d > distance(si.position, aa.ray.o);
if (d != INF && !(mt && hu)) {
lightSample.pdf *= light.selectionPmf;
float eW = aG(aa.scatteringPdf, lightSample.pdf);
lightSample.emission = ai(lightSample.emission, bf);
aa.li += eW * aa.beta * lightSample.emission;

aa.alpha = 1.0;
aa.abort = true;
}
}
#endif

#ifdef USE_ENVMAP
if (!(si.hit && hu)) {
if (aa.isNextRefraction) {


vec4 bg = cx(aa.ray.o, aa.ray.d);
bg.rgb = ai(bg.rgb, bf);
float cT = aa.scatteringIsDelta ? 1.0
: aG(aa.scatteringPdf,
iv(aS(aa.ray.d)) * envLightSelectionPmf);
aa.li += cT * aa.beta * bg.rgb * bg.a;
aa.alpha = max(aa.alpha, bg.a);
aa.abort = true;
return;
}
vec2 uv = aS(aa.ray.d);
vec3 emission = textureLinear(envMap, uv).rgb;
float eW = aG(
aa.scatteringPdf,
iv(uv) * envLightSelectionPmf
);
emission = ai(emission, bf);
aa.li += aa.beta * emission * eW;


#if !defined(USE_BACKGROUND)
aa.alpha = 1.0;
#endif
aa.abort = true;
return;
}
#endif

depth++;
}


vec2 kp(float radius, float xi) {
float x = 0.25;
for (int ns = 0; ns < 10; ns++) {
float x2 = x * x;
float x3 = x2 * x;
float kG = 1.0 - x;
float value = 10.0 * x2 - 20.0 * x3 + 15.0 * x2 * x2 -
4.0 * x2 * x3 - xi;
float lY = 20.0 * x * kG * kG * kG;
if (abs(value) < 1e-6 || lY == 0.0) break;
x = clamp(x - value / lY, 0.0, 1.0);
}
float jj = x * radius;
return vec2(
jj,
sqrt(max(radius * radius - jj * jj, 0.0))
);
}

float iO(float radius, float gs) {
if (gs >= radius) return 0.0;
float nV = radius - gs;
return nV * nV * nV;
}


vec3 mi(ad source, float radius) {
vec3 geometricNormal = source.faceNormal;
if (dot(geometricNormal, source.vertexNormal) < 0.0) geometricNormal = -geometricNormal;
vec3 tangent;
vec3 bitangent;
aL(geometricNormal, tangent, bitangent);
vec3 iB = vec3(0.0);

for (int ia = 0; ia < BEVEL_SAMPLES; ia++) {
vec2 oY = fk(CAMERA_BEVEL_BASE + uint(ia));
float cA = oY.x;
float ox = oY.y;
vec3 di = geometricNormal;
vec3 fE = tangent;
vec3 ek = bitangent;
float ga = 0.5;
float hU = 0.25;
float gA = 0.25;
if (cA < 0.5) {
cA *= 2.0;
}
else if (cA < 0.75) {
vec3 mA = di;
di = fE;
fE = mA;
ga = 0.25;
hU = 0.5;
cA = (cA - 0.5) * 4.0;
}
else {
vec3 mA = di;
di = ek;
ek = mA;
ga = 0.25;
gA = 0.5;
cA = (cA - 0.75) * 4.0;
}

vec2 gQ = kp(radius, ox);
float phi = TWOPI * cA;
vec3 qn = gQ.x *
(cos(phi) * fE + sin(phi) * ek);
Ray ray;
iw(
ray,
source.position + di * gQ.y + qn,
-di
);
ad hit;
iH(
ray,
hit,
source.instanceIndex,
max(2.0 * gQ.y, EPS)
);
if (!hit.hit) continue;

float kH = ga * abs(dot(di, hit.faceNormal));
float mw = hU * abs(dot(fE, hit.faceNormal));
float jU = gA * abs(dot(ek, hit.faceNormal));
float weight = kH / max(
kH * kH + mw * mw +
jU * jU,
1e-8
);
weight *= iO(radius, distance(hit.position, source.position)) /
max(iO(radius, gQ.x), 1e-8);
iB += weight * hit.vertexNormal;
}

if (dot(iB, iB) <= 1e-12) return source.normal;
vec3 jC = normalize(iB);
vec3 result = source.normal + jC - source.vertexNormal;
return dot(result, result) > 1e-12 ? normalize(result) : source.normal;
}

vec4 bw(ad si, Ray ray, J mat, inout RayTraceAuxiliary outAux) {
Path aa;
aa.ray = ray;
aa.li = vec3(0);
aa.alpha = transmissiveOutputAlphaMin < 1.0 ? 0.0 : 1.0;
aa.beta = vec3(1.0);
aa.fromEye = true;
aa.scatteringPdf = 0.0;
aa.scatteringIsDelta = false;
aa.isNextRefraction = false;
aa.abort = false;
int depth = 0;
${i?Uf:Lf}
return vec4(aa.li, aa.alpha);
}

vec4 iz(ad si, Ray ray, J mat, inout RayTraceAuxiliary outAux) {
float coverage = clamp(mat.alpha, 0.0, 1.0);
if (!si.hit || (mat.materialType != STANDARD && mat.materialType != UNLIT) || coverage >= 1.0) {
return bw(si, ray, mat, outAux);
}





Ray nN = ray;
nN.o = si.position + ray.d * (EPS * 0.02);
ad dU = si;
dU.albedoSampled = false;
cY(nN, dU, false);
J nM;
eT(nM, dU.materialIndex, dU.uv, dU.uv1, dU.instanceIndex);
RayTraceAuxiliary gh = outAux;
if (dU.hit && (nM.materialType == STANDARD || nM.materialType == UNLIT)) {
gh.albedo = nM.transmissionWeight > 0.5
? vec3(1.0)
: nM.baseColor;
gh.normal = dot(
dU.normal,
dU.position - vec3(viewInv[3])
) > 0.0
? -dU.normal
: dU.normal;
dU.albedoSampled = nM.transmissionWeight > 0.5;
}
vec4 back = bw(dU, nN, nM, gh);
if (coverage <= 0.0) {
outAux = gh;
return back;
}

ad tk = si;
J tK = mat;
tK.alpha = 1.0;
RayTraceAuxiliary iR = outAux;
vec4 qQ = bw(tk, ray, tK, iR);
outAux.albedo = mix(gh.albedo, iR.albedo, coverage);
vec3 fR = mix(gh.normal, iR.normal, coverage);
outAux.normal = dot(fR, fR) > 1e-12
? normalize(fR)
: vec3(0.0);
outAux.isBlank = gh.isBlank && iR.isBlank;
return mix(back, qQ, coverage);
}



vec4 mn(Ray ray, out RayTraceAuxiliary outAux) {

ad si;
J mat;

si.albedoSampled = false;
#ifdef HAS_MEDIUM
si.mediumType = 0;
si.mediumExtinction = vec3(0.0);
si.mediumScattering = vec3(0.0);
si.mediumAnisotropy = 0.0;
#endif

cY(ray, si, false);
eT(mat, si.materialIndex, si.uv, si.uv1, si.instanceIndex);
si.isTransparency = mat.transmissionWeight > 0.001 || mat.subsurfaceWeight > 0.001 || mat.alpha < 0.999;

#ifdef HAS_BEVEL
if (bevelEnabled && mat.bevel > 0.0) {
si.normal = mi(si, mat.bevel);
}
#endif



if (si.hit && (mat.materialType == STANDARD || mat.materialType == UNLIT)) {
outAux.albedo = mat.transmissionWeight > 0.5 ? vec3(1.0) : mat.baseColor;
outAux.normal = dot(si.normal, si.position - vec3(viewInv[3])) > 0.0
? -si.normal
: si.normal;


si.albedoSampled = mat.transmissionWeight > 0.5;
}

if (mat.transmissionDispersionScale > 0.001) {
mat.specularIor = eK(
bf,
mat.specularIor,
mat.transmissionDispersionScale,
mat.dispersionAbbeNumber
);
}
return iz(si, ray, mat, outAux);
}

void main() {

sk();
ka(v_Texcoord * viewportSize, int(uint(sampleCount) ^ eg(uint(sequenceSeed))));


bf = dispersionWavelengths == 1 ? 0.0 : wavelength;
mk = wavelength;
if (dispersionWavelengths == 1 && wavelength > 0.0) {
float channel = floor(dz(CAMERA_WAVELENGTH) * 3.0);
mk = channel < 1.0 ? 650.0 : channel < 2.0 ? 510.0 : 475.0;
}



Ray cam = nC();

RayTraceAuxiliary outAux;
outAux.albedo = vec3(0.0);
outAux.normal = vec3(0.0);
outAux.isBlank = false;
outAux.isShadowCatcher = false;

vec4 aF = mn(cam, outAux);



#ifdef CLAMPING
float clamping = float(CLAMPING);
aF.rgb = clamp(aF.rgb, -clamping, clamping);
#endif


if (bf > 0.0) {

aF.rgb *= 3.0;
if (dispersionWavelengths != 1) {


aF.a /= 3.0;
}
}
if (!(aF.x < INF && aF.x > -EPS)) {
aF = vec4(0, 0, 0, 1);
}

out_color = aF;
out_albedo = vec4(outAux.albedo, outAux.isBlank ? 0.0 : 1.0);
out_normal = vec4(outAux.normal, 1.0);


float jl = dot(aF.rgb, vec3(0.2126, 0.7152, 0.0722));
out_moments = outAux.isShadowCatcher
? vec4(0.0)
: vec4(jl, jl * jl, 1.0, 0.0);

}`})}var al=G`




const uint SHADOW_CATCHER_LIGHT_SAMPLES = 4u;

uint ko(uint candidate, uint slot) {
return candidate == 0u ? cw(slot) : cw(9u + (candidate - 1u) * 3u + slot);
}

void sampleShadowCatcher(ad si, int bounce, inout Path aa) {
vec3 oK = -aa.ray.d;

#if defined(NUM_LIGHTS) || defined(USE_ENVMAP)
float visibility = 0.0;
for (uint candidate = 0u; candidate < SHADOW_CATCHER_LIGHT_SAMPLES; candidate++) {
LightSampleRec lightSample;
vec3 lc = vec3(
fk(ko(candidate, LIGHT_POSITION)),
dz(ko(candidate, LIGHT_SELECT))
);
sampleLight(si.position, lc, lightSample, false);

vec3 lightDir = lightSample.direction;
float cosThetaL = dot(si.normal, lightDir);
float pv = dot(si.normal, oK) * cosThetaL;
bool mt = false;
if (pv >= 0.0) {
Ray ray;
iw(ray, si.position + EPS * lightDir, lightDir);
mt = ex(ray, lightSample.dist - EPS, si.triangleIndex);
}
visibility += mt ? 0.0 : 1.0;
}

aa.alpha = visibility / float(SHADOW_CATCHER_LIGHT_SAMPLES);
#endif
aa.fromEye = false;
}
`;var jn=new _e({name:"shadowCatcher",outputs:["shadowCatcher","catcherBackground","catcherMoments"],defines:{BOUNCES:2},uniforms:{dispersionWavelengths:C.uniform("int",3),wavelength:C.uniform("float",0),viewportSize:C.uniform("vec2"),viewProjectionInv:C.uniform("mat4"),viewInv:C.uniform("mat4"),cameraApertureRadius:C.uniform("float",0),cameraFocusDistance:C.uniform("float",10)},includes:[Gt,Ht,Wt,Yt,hi],main:G`
${pi}
${gi}
${Yt.main}

${wr}

${Gt.main}
${mi}

${Ht.main}
${Wt.main}
${hi.main}

${Qr}
${_r}
${al}
${Er}



vec4 mn(inout Ray ray, out vec4 background) {
background = vec4(0.0);
Path aa;
aa.ray = ray;
aa.li = vec3(0);
aa.alpha = 1.0;
aa.beta = vec3(1.0);
aa.fromEye = true;
aa.scatteringPdf = 0.0;
aa.abort = false;

ad si;

cY(aa.ray, si, false);
if (!si.hit) {



return vec4(0.0, 0.0, 0.0, 1.0);
}

J mat;
eT(mat, si.materialIndex, si.uv, si.uv1, si.instanceIndex);
if (mat.materialType != SHADOW_CATCHER) {


return vec4(0.0, 0.0, 0.0, 1.0);
}

vec4 bg = cx(ray.o, ray.d);
background = vec4(bg.rgb * bg.a, bg.a);
if (!aa.abort) {
sampleShadowCatcher(si, 0, aa);
}
return vec4(1.0, bg.a, bg.a >= 0.01 ? 1.0 : 0.0, aa.alpha);
}

void main() {
sk();
ka(v_Texcoord * viewportSize, int(uint(sampleCount) ^ eg(uint(sequenceSeed))));

if (dispersionWavelengths == 1 && wavelength > 0.0) { dz(CAMERA_WAVELENGTH); }
Ray cam = nC();
vec4 background;
vec4 aF = mn(cam, background);

if (!(aF.x < INF && aF.x > -EPS)) {
aF = vec4(0, 0, 0, 1);
}

out_shadowCatcher = aF;
out_catcherBackground = background;



float jl = aF.a * (background.a >= 0.01
? dot(background.rgb / background.a, vec3(0.2126, 0.7152, 0.0722))
: 1.0);
out_catcherMoments = aF.r > 0.0
? vec4(jl, jl * jl, 1.0, 0.0)
: vec4(0.0);

}`});function rl(i){let e=0,t=0,A=[],a=new Map,r=[];zr();for(let o of i)for(let s=0;s<St(o);s++){let l=o.geometry;l.indices||Ff(l),l=Nf(l,PA(o,s,Array(16).fill(0))),l.normal?y.forEach(l.normal.array,3,0,void 0,y.normalize,void 0):zf(l),e+=z.getCount(l.position),t+=z.getCount(l.indices);let u=o.materials.map(p=>{let d=rt(p),f=a.get(d);return f===void 0&&(f=a.size,a.set(d,f),r.push(p)),f});A.push({geometry:l,materialIndex:u})}return{geometry:Of(A,e,t),materials:r}}function Of(i,e,t){let A=new z(new Float32Array(3*e),3),a=new z(new Float32Array(3*e),3),r=new z(new Float32Array(2*e),2),n=new z(new Float32Array(2*e),2),o=new z(new Uint32Array(t),1),s=new z(new Int32Array(4*e),4),l=new Ge({position:A,normal:a,uv:r,uv1:n,materialIndex:s,indices:o}),c=0,u=0,p=1;for(let{geometry:d}of i){if(d.color){l.color=new z(new Float32Array(3*e),3);break}if(d.tangent){l.tangent=new z(new Float32Array(3*e),3);break}}for(let{geometry:d,materialIndex:f}of i){let m=z.getCount(d.position);if(["position","normal","uv"].forEach(h=>{if(!d[h]){(h=="normal"||h==="position")&&console.error("Geometry must have at least position and normal attributes.");return}l[h].array.set(d[h].array,c*d[h].itemSize)}),n.array.set((d.uv1??d.uv)?.array??new Float32Array(m*2),c*2),l.color)if(d.color)l.color.array.set(d.color.array,c*3);else for(let B=0;B<m*3;B++)l.color.array[c*3+B]=1;if(l.tangent)if(d.tangent)l.tangent.array.set(d.tangent.array,c*3);else for(let B=0;B<m*3;B++)l.tangent.array[c*3+B]=0;let g=d.indices.array;for(let h=0;h<g.length;h++)o.array[u+h]=c+g[h];qA(d,f,s.array,c,!0),c+=m,u+=g.length,p++}return l}function Ff(i){let e=i.position;if(!e){console.warn("No position attribute");return}let t=new Uint32Array(z.getCount(e));for(let A=0;A<t.length;A++)t[A]=A;return i.indices=new z(t,1),i}function Nf(i,e){let{position:t,normal:A,uv:a,uv1:r,color:n,tangent:o,materialIndex:s,indices:l}={position:i.position.array,normal:i.normal.array,uv:i.uv&&i.uv.array,uv1:i.uv1&&i.uv1.array,color:i.color&&i.color.array,tangent:i.tangent&&i.tangent.array,materialIndex:i.materialIndex&&i.materialIndex.array,indices:i.indices.array},c=new Ge({position:new z(new Float32Array(t),i.position.itemSize),normal:new z(new Float32Array(A),i.normal.itemSize),uv:a&&new z(a,i.uv.itemSize),uv1:r&&new z(r,i.uv1.itemSize),color:n&&new z(n,i.color.itemSize),tangent:o&&new z(new Float32Array(o),i.tangent.itemSize),materialIndex:s&&new z(s,i.materialIndex.itemSize),indices:l&&new z(l,i.indices.itemSize)}),u=oa.normalFromMat4(oa.create(),e);return u==null&&(u=oa.create()),y.forEach(c.position.array,3,0,void 0,y.transformMat4,e),c.normal&&(y.forEach(c.normal.array,3,0,void 0,y.transformMat3,u),y.forEach(c.normal.array,3,0,void 0,y.normalize)),c.tangent&&y.forEach(c.tangent.array,3,0,void 0,y.transformMat3,u),c}function zf(i){let e=i.indices,t=i.position.array;i.normal=new z(new Float32Array(t.length),3);let A=i.normal.array,a=y.create(),r=y.create(),n=y.create(),o=y.create(),s=y.create(),l=y.create(),c=e?e.array.length:i.vertexCount,u,p,d;for(let f=0;f<c;){e?(u=e.array[f++],p=e.array[f++],d=e.array[f++]):(u=f++,p=f++,d=f++),y.set(a,t[u*3],t[u*3+1],t[u*3+2]),y.set(r,t[p*3],t[p*3+1],t[p*3+2]),y.set(n,t[d*3],t[d*3+1],t[d*3+2]),y.sub(o,a,r),y.sub(s,r,n),y.cross(l,o,s);for(let m=0;m<3;m++)A[u*3+m]=A[u*3+m]+l[m],A[p*3+m]=A[p*3+m]+l[m],A[d*3+m]=A[d*3+m]+l[m]}for(let f=0;f<A.length;)y.set(l,A[f],A[f+1],A[f+2]),y.normalize(l,l),A[f++]=l[0],A[f++]=l[1],A[f++]=l[2]}var br=.25;function kf(i,e,t,A,a,r){let n=js(e,t,A,a,r);i.source={data:n,width:n.length/4,height:1}}var Vn=class{_renderer;_meshes=[];_sceneEnvironment=new li;_rectLightTextures=new ci;_analyticLights=[];_analyticLightSelectionPmfs=new Float32Array(0);_analyticLightSelectionCdfs=new Float32Array(0);_envLightSelectionPmf=0;_materialData;_maxTextureArrayBytes=Bt;_preparedMeshData;_membershipCache=new oi;_pendingMembershipData;_materialChanges=new si;_pendingMaterialUpdate;_pendingGeometryUpdates=new Set;_needsUpdateMeshData=!0;_needsUpdateMeshMembership=!1;_needsRefitTLAS=!1;_dirtyTransformMeshes=new Set;_dirtyColorMeshes=new Set;_tlas;_bvhData;_instancesData;_materialIndexData;_meshSnapshot=[];_snapshotByMesh=new WeakMap;_needsUpdateAnalyticLightsBuffer=!0;_debugBvhData;_lightTex=new we(Je);_iesProfileTex=new we(Je);_iesProfileColumns=1;_iesProfileTexelOffsets=new Int32Array(0);_openPbrEnergyLut=new we({...Je,source:{data:sr(),width:32,height:2177}});_envMap=new we(Ma);_envMapDistribution=new we(Ma);_envImageSource;_backgroundTex=new we(Ma);_hasEnvMap=!1;_hasBackground=!1;_groundedBackgroundParams=new Float32Array([0,0,0,0]);_groundedBackgroundCenter=new Float32Array([0,0]);_bounces=2;_bevelSamples=8;_clamping;_samplingCode=-1;_sequenceSeed=0;_zLogSPP=0;_positionBufferTex=new we(Je);_normalBufferTex=new we(Je);_colorBufferTex=new we(Je);_tangentBufferTex=new we(Je);_uvBufferTex=new we(Je);_uv1BufferTex=new we(Je);_bvhBufferTex=new we(Je);_instancesBufferTex=new we(Je);_matIndexBufferTex=new we({...Je});_hasTransmission=!1;_hasAlpha=!1;_invalid=!1;_transmissiveAlphaMin=1;_mainPass;_shadowCatcherPass;_viewProjInv=Ue.create();_apertureRadius=0;_focusDistance=10;_tracePasses;_depthPass;_depthAbort=new AbortController;_depthAspect=1;_hasShadowCatcher=!1;_spectral=!1;constructor(e){this._renderer=e;let t={type:k.FLOAT,minFilter:k.LINEAR,magFilter:k.LINEAR,wrapS:k.CLAMP_TO_EDGE,wrapT:k.CLAMP_TO_EDGE},A=Yn();A.parallelCompile=!0,jn.parallelCompile=!0,this._mainPass=new Te("rayTrace",e,{shader:A,outputs:["color","albedo","normal","moments"],outputParams:{color:t,albedo:t,normal:t,moments:t}}),this._shadowCatcherPass=new Te("shadowCatcher",e,{shader:jn,outputs:["shadowCatcher","catcherBackground","catcherMoments"],outputParams:{shadowCatcher:t,catcherBackground:t,catcherMoments:t}}),this._depthPass=new Te("Depth query",e,{shader:tl,outputs:["depth"],outputParams:{depth:Je}}),this._tracePasses=[this._mainPass,this._shadowCatcherPass,this._depthPass],this._tracePasses.forEach(a=>{a.setDefines({OES_texture_float_linear:!!e.gl.getExtension("OES_texture_float_linear")})}),this._mainPass.setUniform("openPbrEnergyLut",this._openPbrEnergyLut)}createPass(e,t,A=!1){this.prepare();let a={clear:e,blend:!e,scissor:t};this._mainPass.createPass({},void 0,a),this._hasShadowCatcher&&!A&&this._shadowCatcherPass.createPass({},void 0,a)}getOutput(e){return e==="shadowCatcher"||e==="catcherBackground"||e==="catcherMoments"?this._shadowCatcherPass.getOutput(e):this._mainPass.getOutput(e)}setBounce(e){let t=ii(e),A=this._bounces!==t;return this._bounces=t,A}setClamping(e){let t=this._clamping!==e;return this._clamping=e,t}setBevelSamples(e){let t=ui(e),A=this._bevelSamples!==t;return A&&(this._bevelSamples=t),A}_setEnvMap(e){!or(e,this._envImageSource)&&e&&(this._envMap.source=e,this._envMapDistribution.source=lr(e)),this._envImageSource=e,this._tracePasses.forEach(t=>{t.setUniform("envMap",e?this._envMap:null),t.setUniform("envMapDistribution",e?this._envMapDistribution:null),t.setUniform("envLightSelectionPmf",this._envLightSelectionPmf),t.setDefines({USE_ENVMAP:!!e})}),this._hasEnvMap=!!e}setBackground(e){let t=e&&ar(e);t&&(this._backgroundTex.source=t),this._hasBackground=!!t;let A=e&&!Array.isArray(e)&&"type"in e&&e.type==="GroundedSkybox"?e:void 0;this._groundedBackgroundParams.set(A?[Math.max(A.height,1e-4),Math.max(A.radius,1e-4),A.groundHeight??0,1]:[0,0,0,0]),this._groundedBackgroundCenter.set(A?.center??[0,0])}setTransmissiveOutputAlphaMin(e){let t=this._transmissiveAlphaMin!==e;return this._transmissiveAlphaMin=e,t}setMeshes(e,t){for(let s of t?.colors??[])this._dirtyColorMeshes.add(s);if(t&&this._preparedMeshData&&this._materialData&&!this._needsUpdateMeshData&&e===this._meshes){let s=this._materialChanges.classify(t.materials??[]);if(s.level!=="geometry"&&Ar(this._preparedMeshData,t.geometries??[])){if(t.materials?.length){let l=this._pendingMaterialUpdate;this._pendingMaterialUpdate={level:l?.level==="textures"?"textures":s.level,emission:!!l?.emission||s.emission,emissiveMap:!!l?.emissiveMap||s.emissiveMap,materials:new Set([...l?.materials??[],...t.materials])},this._meshSnapshot.forEach(c=>{c.materialKeys=c.materials.map(rt)})}for(let l of t.geometries??[])this._pendingGeometryUpdates.add(l);for(let l of this._meshSnapshot)this._pendingGeometryUpdates.has(l.geometry)&&(l.geometryVersion=l.geometry.version);for(let l of t.transforms??[]){let c=this._snapshotByMesh.get(l);if(c){for(let u=0;u<16;u++)c.matrix[u]=l.transform[u];this._dirtyTransformMeshes.add(l),this._needsRefitTLAS=!0}}return!!t.materials?.length||!!t.transforms?.length||!!t.colors?.length||!!t.geometries?.length}}let A=!!t?.materials?.length,a=e.map(s=>({mesh:s,instanceCount:s instanceof ie?s.count:1,instanceVersion:s instanceof ie?s.transformsVersion:0,instanceTransforms:s instanceof ie?s.transforms:void 0,instanceColors:s instanceof ie?s.colors:void 0,colorVersion:s instanceof ie?s.colorsVersion:0,geometry:s.geometry,materials:s.materials.slice(),materialKeys:s.materials.map(rt),geometryVersion:s.geometry.version,positionArray:s.geometry.position.array,indexArray:s.geometry.indices.array,matrix:Array.from(s.transform)})),r=a.length!==this._meshSnapshot.length||a.some((s,l)=>s.mesh!==this._meshSnapshot[l]?.mesh||s.instanceCount!==this._meshSnapshot[l]?.instanceCount||s.materials.some((c,u)=>c!==this._meshSnapshot[l]?.materials[u])),n=!this._needsUpdateMeshData&&r&&this._preparedMeshData?this._membershipCache.update(this._preparedMeshData,e):void 0;if(n){let s=new Map(this._meshSnapshot.flatMap(c=>c.materials.map((u,p)=>[u,c.materialKeys[p]]))),l=n.materials.length!==this._preparedMeshData.materials.length||n.materials.some((c,u)=>c!==this._preparedMeshData.materials[u]||s.has(c)&&rt(c)!==s.get(c));return this._pendingMembershipData=n,this._meshes=e,this._meshSnapshot=a,this._snapshotByMesh=new WeakMap,a.forEach(c=>this._snapshotByMesh.set(c.mesh,c)),this._needsUpdateMeshMembership=!0,this._needsRefitTLAS=!1,this._dirtyTransformMeshes.clear(),l&&(this._pendingMaterialUpdate={level:"textures",emission:!0,emissiveMap:!0,materials:new Set(n.materials)}),!0}let o=a.length!==this._meshSnapshot.length||a.some((s,l)=>{let c=this._meshSnapshot[l];return!c||s.mesh!==c.mesh||s.instanceCount!==c.instanceCount||s.instanceVersion!==c.instanceVersion||s.instanceTransforms!==c.instanceTransforms||s.geometry!==c.geometry||s.colorVersion!==c.colorVersion||s.instanceColors!==c.instanceColors||s.materials.length!==c.materials.length||s.materials.some((u,p)=>u!==c.materials[p])||s.materialKeys.some((u,p)=>u!==c.materialKeys[p])||s.geometryVersion!==c.geometryVersion||s.matrix.some((u,p)=>u!==c.matrix[p])});return a.forEach((s,l)=>{let c=this._meshSnapshot[l];c&&s.geometry===c.geometry&&(s.geometryVersion!==c.geometryVersion||s.positionArray!==c.positionArray||s.indexArray!==c.indexArray)&&(s.materials[0]?.displacementMap&&Math.abs(s.materials[0].displacementScale)>1e-6||Xi(this._preparedMeshData,s.geometry)||!me(s.geometry)||!SA(me(s.geometry),s.geometry))&&Xe(s.geometry,void 0)}),this._meshSnapshot=a,this._snapshotByMesh=new WeakMap,a.forEach(s=>this._snapshotByMesh.set(s.mesh,s)),!o&&t&&!A?!1:(this._meshes=e,this._needsUpdateMeshData=!0,this._needsRefitTLAS=!1,this._dirtyTransformMeshes.clear(),this._debugBvhData=void 0,!0)}setTextureAtlasBudget(e){let t=Number.isFinite(e)?Math.max(4,Math.floor(e)):Bt;return t===this._maxTextureArrayBytes?!1:(this._maxTextureArrayBytes=t,this._needsUpdateMeshData=!0,!0)}getDebugBVHData(){if(!this._debugBvhData){let e=rl(this._meshes),t=qt(e.geometry);this._debugBvhData={buffer:t.buffer}}return this._debugBvhData}getDiagnostics(){return{textureAtlas:this._materialData?.textureAtlasStats}}_updateMeshData(){this._pendingGeometryUpdates.clear(),this._needsUpdateMeshData=!1;let e=ka(this._meshes,{displacement:!1});this._preparedMeshData=e,this._membershipCache.capture(e),this._pendingMembershipData=void 0,this._needsUpdateMeshMembership=!1;let t=e.geometry,A=e.materials,a=rA(e.instances,e.blases);this._tlas=a;let r=new Float32Array(a.buffer),n=this._instancesData=new Float32Array(a.instancesBuffer),o=new Float32Array(IA(e.blases)),s=this._bvhData=new Float32Array(r.length+o.length),l=r.length/4;s.set(r),s.set(o,l*4),t.position.array.length>0&&(qe(this._positionBufferTex,t.position.array,3),qe(this._normalBufferTex,t.normal.array,3),t.color&&qe(this._colorBufferTex,t.color.array,3),t.tangent&&qe(this._tangentBufferTex,t.tangent.array,4),t.uv&&qe(this._uvBufferTex,t.uv.array,2),t.uv1&&qe(this._uv1BufferTex,t.uv1.array,2),t.materialIndex&&qe(this._matIndexBufferTex,this._materialIndexData=new Float32Array(t.materialIndex.array),4)),s.length>0&&(qe(this._bvhBufferTex,s,4),qe(this._instancesBufferTex,n,4)),this._materialData?.dispose(this._renderer.gl);let c=new jA(A,this._analyticLights,{maxTextureArrayBytes:this._maxTextureArrayBytes,maxTextureArrayLayers:this._renderer.gl.getParameter(this._renderer.gl.MAX_ARRAY_TEXTURE_LAYERS),maxTextureDimension2D:this._renderer.gl.getParameter(this._renderer.gl.MAX_TEXTURE_SIZE)});return this._materialData=c,this._tracePasses.forEach(u=>{u.setUniforms({bvhBuffer:this._bvhBufferTex,instancesBuffer:this._instancesBufferTex,positionBuffer:this._positionBufferTex,normalBuffer:this._normalBufferTex,tangentBuffer:t.tangent?this._tangentBufferTex:null,colorBuffer:t.color?this._colorBufferTex:null,uvBuffer:t.uv?this._uvBufferTex:null,uv1Buffer:t.uv1?this._uv1BufferTex:null,materialIndexBuffer:this._matIndexBufferTex,bvhColumns:Xt(s.length/4).columnsLog,vertexColumns:Xt(z.getCount(t.position)).columnsLog,instancesColumns:Xt(n.length/4).columnsLog,blasOffset:l,isEmptyScene:+(e.instances.length===0)})}),this._updateMaterialConstants(A,c,t),this._materialChanges.capture(A),this._pendingMaterialUpdate=void 0,s}_updateMaterialConstants(e,t,A){let r=e.some(s=>s.shadowCatcher),n=e.some(s=>s.bevelSize>0),o=e.some(Di);this._hasShadowCatcher=r,this._hasTransmission=e.some(s=>s.transmissionWeight>0||s.mapAlphaUsage==="transmission"),this._hasAlpha=e.some(s=>Jt(s)!=="opaque"),this._spectral=e.some(s=>s.transmissionDispersionScale>0),this._tracePasses.forEach(s=>{s.setDefines({OES_texture_float_linear:!0,STACK_SIZE:50,USE_VERTEX_COLOR:A.color!=null,USE_TANGENT:A.tangent!=null,HAS_TRANSMISSION:this._hasTransmission,HAS_GLTF_ANISOTROPY:e.some(l=>l.specularAnisotropyModel==="gltf"&&l.specularAnisotropy>0),HAS_BEVEL:n,HAS_MEDIUM:o,HAS_ALPHA:this._hasAlpha,BEVEL_SAMPLES:this._bevelSamples,RECT_LIGHT:3,SPHERE_LIGHT:2,DIRECTIONAL_LIGHT:1,USE_RR:!0,RR_MAX:o?12:2,...t.defines}),t.setToPass(s)})}_updateMeshMembership(){let e=this._pendingMembershipData;this._preparedMeshData=e;let t=this._tlas=rA(e.instances,e.blases),A=new Float32Array(IA(e.blases)),a=this._bvhData=new Float32Array(t.buffer.byteLength/4+A.length);a.set(new Float32Array(t.buffer)),a.set(A,t.buffer.byteLength/4),this._instancesData=new Float32Array(t.instancesBuffer),qe(this._bvhBufferTex,a,4),qe(this._instancesBufferTex,this._instancesData,4),this._tracePasses.forEach(r=>r.setUniforms({bvhColumns:Xt(a.length/4).columnsLog,instancesColumns:Xt(this._instancesData.length/4).columnsLog,blasOffset:t.buffer.byteLength/16,isEmptyScene:+(e.instances.length===0)})),this._pendingMembershipData=void 0,this._needsUpdateMeshMembership=!1,this._debugBvhData=void 0}_updateGeometryData(){let e=this._preparedMeshData,t=this._tlas,A=ir(e,this._pendingGeometryUpdates);for(let{first:a,count:r,topologyChanged:n,deformationOnly:o}of A.vertices){for(let[l,c]of[[e.geometry.position,this._positionBufferTex],[e.geometry.normal,this._normalBufferTex],[e.geometry.tangent,this._tangentBufferTex],[e.geometry.color,this._colorBufferTex],[e.geometry.uv,this._uvBufferTex],[e.geometry.uv1,this._uv1BufferTex]])l&&(!o||l===e.geometry.position||l===e.geometry.normal||l===e.geometry.tangent)&&c.updateDataRange(this._renderer.gl,l.array,a*l.itemSize*4,r*l.itemSize*4);if(!n)continue;let s=this._materialIndexData;for(let l=a*4;l<(a+r)*4;l++)s[l]=e.geometry.materialIndex.array[l];this._matIndexBufferTex.updateDataRange(this._renderer.gl,s,a*16,r*16)}for(let a of A.meshes)this._dirtyTransformMeshes.add(a);if(A.relocated)for(let a of e.instanceBindings)this._dirtyTransformMeshes.add(a.mesh);if(A.resized){e.instances=yt(e.instanceBindings),DA(t,e.instances,e.blases);let a=new Float32Array(IA(e.blases));this._bvhData=new Float32Array(t.buffer.byteLength/4+a.length),this._bvhData.set(new Float32Array(t.buffer)),this._bvhData.set(a,t.buffer.byteLength/4),qe(this._bvhBufferTex,this._bvhData,4),this._tracePasses.forEach(r=>r.setUniform("bvhColumns",Xt(this._bvhData.length/4).columnsLog))}else{let a=[];for(let{blas:r,offset:n}of A.blases){let o=t.buffer.byteLength+n;new Uint8Array(this._bvhData.buffer).set(new Uint8Array(r.buffer),o),a.push({offset:o,size:r.buffer.byteLength})}for(let{offset:r,size:n}of pa(a))this._bvhBufferTex.updateDataRange(this._renderer.gl,this._bvhData,r,n)}this._needsRefitTLAS=!0,this._pendingGeometryUpdates.clear(),this._debugBvhData=void 0}_updateMeshColors(){let e=this._preparedMeshData,t=this._tlas;if(e&&t){let A=Ha(e.instanceBindings,e.instances,this._dirtyColorMeshes),a=ma(t,e.instances,A);for(let{offset:r,size:n}of a)this._instancesBufferTex.updateDataRange(this._renderer.gl,this._instancesData,r,n)}this._dirtyColorMeshes.clear()}_refitMeshInstances(){let e=this._preparedMeshData,t=this._tlas,A=Ga(e.instanceBindings,this._dirtyTransformMeshes,e.instances),a=e.instances;if(e.instances=yt(e.instanceBindings,e.instances,A),!ua(a,e.instances)){this._pendingMembershipData=e,this._updateMeshMembership(),this._dirtyTransformMeshes.clear(),this._needsRefitTLAS=!1;return}let r=DA(t,e.instances,e.blases,A);this._bvhData.set(new Float32Array(t.buffer));for(let{offset:n,size:o}of r.tlasRanges)this._bvhBufferTex.updateDataRange(this._renderer.gl,this._bvhData,n,o);for(let{offset:n,size:o}of r.instanceRanges)this._instancesBufferTex.updateDataRange(this._renderer.gl,this._instancesData,n,o);this._dirtyTransformMeshes.clear(),this._needsRefitTLAS=!1,this._debugBvhData=void 0}_updateMaterialData(){let e=this._pendingMaterialUpdate,t=this._preparedMeshData,A=this._materialData;e.level==="textures"?(A.dispose(this._renderer.gl),A=this._materialData=new jA(t.materials,this._analyticLights,{maxTextureArrayBytes:this._maxTextureArrayBytes,maxTextureArrayLayers:this._renderer.gl.getParameter(this._renderer.gl.MAX_ARRAY_TEXTURE_LAYERS),maxTextureDimension2D:this._renderer.gl.getParameter(this._renderer.gl.MAX_TEXTURE_SIZE)}),this._needsUpdateAnalyticLightsBuffer=!0):A.repackParams(t.materials),this._updateMaterialConstants(t.materials,A,t.geometry),(e.emission||e.emissiveMap)&&(t.emissiveBindings=t.instanceBindings.filter(a=>a.materialIndices.some(r=>mA(t.materials[r])))),this._materialChanges.capture([...e.materials]),this._pendingMaterialUpdate=void 0}setLights(e){let t=e.filter(d=>d.type==="DirectionalLight"||d.type==="SphereLight"||d.type==="SpotLight"||d.type==="RectLight"),A=t.length,a=this._sceneEnvironment.update(e),r=La(a),n=t.map(Ra),o=r+n.reduce((d,f)=>d+f,0),s=t.length+(a?1:0),l=s>0?1/s:0;this._envLightSelectionPmf=a?o>0?(1-br)*l+br*(r/o):l:0,this._analyticLightSelectionPmfs=Float32Array.from(n,d=>o>0?(1-br)*l+br*(d/o):l);let c=this._envLightSelectionPmf;this._analyticLightSelectionCdfs=Float32Array.from(this._analyticLightSelectionPmfs,d=>(c+=d,c)),this._analyticLightSelectionCdfs.length>0&&(this._analyticLightSelectionCdfs[this._analyticLightSelectionCdfs.length-1]=1),this._tracePasses.forEach(d=>{d.setDefines({NUM_LIGHTS:A,HAS_SPHERE_LIGHTS:!!t.find(f=>f.type==="SphereLight"),HAS_SPOT_LIGHTS:!!t.find(f=>f.type==="SpotLight"),HAS_RECT_LIGHTS:!!t.find(f=>f.type==="RectLight"),HAS_DIRECTIONAL_LIGHTS:!!t.find(f=>f.type==="DirectionalLight")})});let u=this._rectLightTextures.update(t);this._analyticLights=t;let p=Ua(t);this._iesProfileTexelOffsets=p.offsets,this._iesProfileColumns=qe(this._iesProfileTex,p.data.length?p.data:new Float32Array(4),4).columns,u&&(this._needsUpdateMeshData=!0),this._needsUpdateAnalyticLightsBuffer=!0,this._setEnvMap(a)}_getViewProjInv(e,t){Ue.invert(t,e.getProjectionMatrix(this._depthAspect)),Ue.mul(t,e.transform,t)}setCamera(e){let t=this._viewProjInv;this._apertureRadius=ai(e),this._focusDistance=e.focusDistance,this._getViewProjInv(e,t),this._tracePasses.forEach(A=>{A.setUniform("viewProjectionInv",t),A.setUniform("viewInv",e.transform),A.setUniform("cameraApertureRadius",this._apertureRadius),A.setUniform("cameraFocusDistance",e.focusDistance)})}cameraChanged(e){let t=Ue.create();return this._getViewProjInv(e,t),!rr(this._viewProjInv,t)||ai(e)!==this._apertureRadius||e.focusDistance!==this._focusDistance}setSize(e,t,A=e/t){this._depthAspect=A,this._tracePasses.forEach(a=>{a.setSize(a===this._depthPass?7:e,a===this._depthPass?7:t),a.setUniform("pixelSize",[1/e,1/t])})}setJitter(e,t){this._tracePasses.forEach(A=>{A.setUniform("jitter",[e,t])})}releaseTarget(e){this._mainPass.releaseTarget(e),this._shadowCatcherPass.releaseTarget(e)}getTargetMemoryBytes(e){return this._mainPass.getMemoryBytes(e)+this._shadowCatcherPass.getMemoryBytes(e)}useTarget(e){this._mainPass.useTarget(e),this._shadowCatcherPass.useTarget(e)}setQuality(e){this._tracePasses.forEach(t=>{t.setUniform("bounceLimit",ii(e.bounces)),t.setUniform("bevelEnabled",e.bevel),t.setUniform("dispersionWavelengths",e.dispersionWavelengths)})}setWavelength(e){this._tracePasses.forEach(t=>{t.setUniform("wavelength",e)})}setSampleCount(e){this._tracePasses.forEach(t=>{t.setUniform("sampleCount",e)})}isInvalid(){return this._invalid}hasShadowCatcher(){return this._hasShadowCatcher}hasDispersion(){return this._spectral}prepare(){if(this._needsUpdateMeshData?this._updateMeshData():this._needsUpdateMeshMembership&&this._updateMeshMembership(),this._pendingGeometryUpdates.size&&this._updateGeometryData(),this._needsRefitTLAS&&this._refitMeshInstances(),this._dirtyColorMeshes.size&&this._updateMeshColors(),this._pendingMaterialUpdate&&this._updateMaterialData(),this._needsUpdateAnalyticLightsBuffer){let e=this._analyticLights;e.length>0&&kf(this._lightTex,e,this._materialData.getLightTexturesIndices(),this._analyticLightSelectionPmfs,this._analyticLightSelectionCdfs,this._iesProfileTexelOffsets),this._needsUpdateAnalyticLightsBuffer=!1}this._tracePasses.forEach(e=>{e.setUniform("backgroundMap",this._hasBackground?this._backgroundTex:this._hasEnvMap?this._envMap:null),e.setUniform("transmissiveOutputAlphaMin",Math.max(Math.min(1,this._transmissiveAlphaMin),0)),e.setUniform("lightsTex",this._lightTex),e.setUniform("iesProfileData",this._iesProfileTex),e.setUniform("iesProfileColumns",this._iesProfileColumns),e.setUniform("groundedBackgroundParams",this._groundedBackgroundParams),e.setUniform("groundedBackgroundCenter",this._groundedBackgroundCenter),e.setDefines({BOUNCES:nr()?Math.min(this._bounces,3)*(this._hasTransmission||this._hasAlpha?2:1):this._bounces,CLAMPING:this._clamping||void 0,BEVEL_SAMPLES:this._bevelSamples,USE_BACKGROUND:this._hasBackground,USE_GROUNDED_BACKGROUND:this._groundedBackgroundParams[3]>0})})}setSamplingPattern(e,t,A=0){let a=Xa(e),r=$a(a===1?t-1:t),n=this._samplingCode!==a||this._sequenceSeed!==A>>>0||a===1&&this._zLogSPP!==r;return this._samplingCode=a,this._sequenceSeed=A>>>0,this._zLogSPP=r,this._tracePasses.forEach(o=>{o.setUniform("samplingPattern",a),o.setUniform("sequenceSeed",this._sequenceSeed),o.setUniform("zSobolLogSPP",r)}),n}setSampleSequenceOffset(e){}async readDepthSamples(e,t){if(this._depthAbort.signal.aborted||this._invalid||!this._preparedMeshData||!this._renderer.isAllProgramCompiled())return;this.prepare(),this._depthPass.setUniform("depthArea",$A(e,t??this._depthAspect)),this._depthPass.createPass({});let A=await Zo(this._renderer.gl,7,7,this._depthAbort.signal);return Wa(A)}dispose(){this._depthAbort.abort(),this._materialData?.dispose(this._renderer.gl),this._materialData=void 0,this._tracePasses.forEach(t=>t.dispose());let e=this._renderer.gl;[this._lightTex,this._openPbrEnergyLut,this._envMap,this._envMapDistribution,this._backgroundTex,this._positionBufferTex,this._normalBufferTex,this._colorBufferTex,this._tangentBufferTex,this._uvBufferTex,this._uv1BufferTex,this._bvhBufferTex,this._instancesBufferTex,this._matIndexBufferTex].forEach(t=>t.dispose(e))}},nl=Vn;var Gf=new _e({name:"normalizeRayTraceOutput",outputs:["color","albedo","normal","shadowCatcher"],uniforms:{colorTex:C.uniform("sampler2D"),albedoTex:C.uniform("sampler2D"),normalTex:C.uniform("sampler2D"),shadowCatcherTex:C.uniform("sampler2D"),sampleCount:C.uniform("float",1),lightScale:C.uniform("vec2",[1,1])},main:G`
void main() {
vec2 uv = lightScale * v_Texcoord;
vec4 rN = sample_albedoTex(uv);
float hit = rN.a;
vec4 rR = sample_normalTex(uv);



float sh = max(rR.a, 1.0);
vec3 albedo = rN.rgb / sh;
vec3 normal = rR.rgb / sh;
vec4 shadowCatcher= sample_shadowCatcherTex(uv) / sampleCount;
vec4 sq = sample_colorTex(uv);




vec4 light = vec4(sq.rgb / (hit > 0.0 ? hit : sampleCount), sq.a / sampleCount);



out_normal = dot(normal, normal) > 0.1 ? vec4(normal * 0.5 + 0.5, 1.0) : vec4(0.0);
out_albedo = vec4(albedo, 1.0);
out_shadowCatcher = shadowCatcher;
out_color = light;
}
`}),sl=Gf;var xr=class{_renderer;_pass;_layersPass;constructor(e){this._renderer=e,this._pass=new Te("rayTraceOutput",e,{shader:sl,outputs:["color","albedo","normal","shadowCatcher"],outputParams:{color:{type:k.HALF_FLOAT,minFilter:k.LINEAR,magFilter:k.LINEAR},albedo:{type:k.UNSIGNED_BYTE},normal:{type:k.UNSIGNED_BYTE},shadowCatcher:{type:k.HALF_FLOAT}}}),this._layersPass=new Te("rayTraceLayers",e,{shader:new _e({name:"normalizeRayTraceLayers",outputs:["foreground","catcherBackground"],uniforms:{colorTex:C.uniform("sampler2D"),albedoTex:C.uniform("sampler2D"),normalTex:C.uniform("sampler2D"),shadowCatcherTex:C.uniform("sampler2D"),catcherBackgroundTex:C.uniform("sampler2D"),sampleCount:C.uniform("float",1)},main:G`
void main() {
vec4 light = sample_colorTex(v_Texcoord);
vec4 mask = sample_shadowCatcherTex(v_Texcoord);
vec4 background = sample_catcherBackgroundTex(v_Texcoord);
float hit = sample_albedoTex(v_Texcoord).a;

float qa = max(sample_normalTex(v_Texcoord).a, 1.0) / sampleCount;
float iQ = max(hit - mask.b * qa, 0.0);
out_foreground = vec4(
(light.rgb - background.rgb * qa)
/ (iQ > 0.0 ? iQ : sampleCount),
clamp((light.a - background.a) / sampleCount, 0.0, 1.0)
);
out_catcherBackground = background / sampleCount;
}`}),outputs:["foreground","catcherBackground"],outputParams:{foreground:{type:k.HALF_FLOAT},catcherBackground:{type:k.HALF_FLOAT}}})}setSize(e,t){this._pass.setSize(e,t),this._layersPass.setSize(e,t)}setSampleCount(e){this._pass.setUniform("sampleCount",Math.max(e,1)),this._layersPass.setUniform("sampleCount",Math.max(e,1))}createPass(e){this._pass.setOutputs(e.hasShadowCatcher()?["color","albedo","normal","shadowCatcher"]:["color","albedo","normal"]),this._pass.createPass({colorTex:e.getOutput("color"),albedoTex:e.getOutput("albedo"),normalTex:e.getOutput("normal"),shadowCatcherTex:e.hasShadowCatcher()?e.getOutput("shadowCatcher"):this._renderer.emptyTexture},void 0,{clear:!0}),e.hasShadowCatcher()?(this._layersPass.setOutputs(["foreground","catcherBackground"]),this._layersPass.createPass({colorTex:e.getOutput("color"),albedoTex:e.getOutput("albedo"),normalTex:e.getOutput("normal"),shadowCatcherTex:e.getOutput("shadowCatcher"),catcherBackgroundTex:e.getOutput("catcherBackground")},void 0,{clear:!0})):this._layersPass.setOutputs([])}getOutput(e){return e==="foreground"||e==="catcherBackground"?this._layersPass.getOutput(e)??this._renderer.emptyTexture:this._pass.getOutput(e)??this._renderer.emptyTexture}retainOutput(e){this._pass.retainOutput(e),this._layersPass.retainOutput(e)}releaseOutput(e){this._pass.releaseOutput(e),this._layersPass.releaseOutput(e)}getMemoryBytes(){return this._pass.getMemoryBytes()+this._layersPass.getMemoryBytes()}dispose(){this._pass.dispose(),this._layersPass.dispose()}};var ol=new _e({name:"blend",uniforms:{colorTex1:C.uniform("sampler2D"),colorTex2:C.uniform("sampler2D"),weight1:C.uniform("float",.5),weight2:C.uniform("float",.5)},main:G`void main() {
out_color = sample_colorTex1(v_Texcoord) * weight1
+ sample_colorTex2(v_Texcoord) * weight2;
}`}),ll=new _e({name:"downsample",uniforms:{colorTex:C.uniform("sampler2D")},main:G`void main() {
vec2 d = 1.0 / vec2(colorTexRegion());
out_color = (sample_colorTex(v_Texcoord + d * vec2(-0.5, -0.5))
+ sample_colorTex(v_Texcoord + d * vec2(0.5, -0.5))
+ sample_colorTex(v_Texcoord + d * vec2(-0.5, 0.5))
+ sample_colorTex(v_Texcoord + d * vec2(0.5, 0.5))) * 0.25;
}`}),qn=new _e({name:"gaussianBlur",uniforms:{colorTex:C.uniform("sampler2D"),blurDir:C.uniform("int",0),blurSize:C.uniform("float",1)},main:G`void main() {
vec2 size = vec2(colorTexRegion());
vec2 d = (blurDir == 0 ? vec2(1.0, 0.0) : vec2(0.0, 1.0)) * blurSize / size;
out_color = sample_colorTex(v_Texcoord) * 0.227027
+ (sample_colorTex(v_Texcoord + d * 1.384615) + sample_colorTex(v_Texcoord - d * 1.384615)) * 0.316216
+ (sample_colorTex(v_Texcoord + d * 3.230769) + sample_colorTex(v_Texcoord - d * 3.230769)) * 0.070270;
}`});var cl=new _e({name:"bloomBright",uniforms:{colorTex:C.uniform("sampler2D"),threshold:C.uniform("float",1),scale:C.uniform("float",1)},main:G`
const vec3 uJ = vec3(0.2125, 0.7154, 0.0721);
vec4 st(vec4 a, vec4 b, vec4 c) {
return a + b + c - min(min(a, b), c) - max(max(a, b), c);
}
void main() {
vec2 d = 1.0 / vec2(colorTexRegion());
vec4 iX = sample_colorTex(v_Texcoord);
vec4 s1 = sample_colorTex(v_Texcoord - vec2(d.x, 0.0));
vec4 s2 = sample_colorTex(v_Texcoord + vec2(d.x, 0.0));
vec4 s3 = sample_colorTex(v_Texcoord - vec2(0.0, d.y));
vec4 s4 = sample_colorTex(v_Texcoord + vec2(0.0, d.y));
iX = st(st(iX, s1, s2), s3, s4);
float lum = dot(iX.rgb, uJ);
out_color = lum > threshold && iX.a > 0.0
? vec4(iX.rgb * scale, iX.a)
: vec4(0.0, 0.0, 0.0, iX.a);
}`}),fl=new _e({name:"compose",uniforms:{colorTex:C.uniform("sampler2D"),foregroundTex:C.uniform("sampler2D"),catcherBackgroundTex:C.uniform("sampler2D"),shadowCatcherTex:C.uniform("sampler2D"),bloomTex:C.uniform("sampler2D"),exposure:C.uniform("float",1),shadowCatcherColor:C.uniform("vec3",[0,0,0]),shadowCatcherAlpha:C.uniform("float",1),shadowCatcherEnabled:C.uniform("float",0),bloomIntensity:C.uniform("float",0),toneMappingMode:C.uniform("int",0),contrast:C.uniform("float",1),saturation:C.uniform("float",1),temperature:C.uniform("float",0),tint:C.uniform("float",0),vignette:C.uniform("float",0),outputMode:C.uniform("int",0),sRGBOutput:C.uniform("bool",1)},main:G`
vec3 jN(vec3 color) {
return clamp(color, 0.0, 1.0);
}
vec3 iK(vec3 color) {
return clamp(color / (vec3(1.0) + color), 0.0, 1.0);
}
vec3 jE(vec3 color) {
color = max(vec3(0.0), color - 0.004);
return pow((color * (6.2 * color + 0.5)) /
(color * (6.2 * color + 1.7) + 0.06), vec3(2.2));
}
vec3 oA(vec3 value) {
vec3 kF = value * (value + 0.0245786) - 0.000090537;
vec3 ap = value * (0.983729 * value + 0.4329510) + 0.238081;
return kF / ap;
}
vec3 ll(vec3 color) {
const mat3 pn = mat3(
vec3(0.59719, 0.07600, 0.02840),
vec3(0.35458, 0.90834, 0.13383),
vec3(0.04823, 0.01566, 0.83777)
);
const mat3 ov = mat3(
vec3(1.60475, -0.10208, -0.00327),
vec3(-0.53108, 1.10813, -0.07276),
vec3(-0.07367, -0.00605, 1.07602)
);
color = pn * (color / 0.6);
return clamp(ov * oA(color), 0.0, 1.0);
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
vec3(1.6605, -0.1246, -0.0182),
vec3(-0.5876, 1.1329, -0.1006),
vec3(-0.0728, -0.0083, 1.1187)
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
vec3(0.6274, 0.0691, 0.0164),
vec3(0.3293, 0.9195, 0.0880),
vec3(0.0433, 0.0113, 0.8956)
);
vec3 fP(vec3 value) {
vec3 mE = value * value;
vec3 qC = mE * mE;
return 15.5 * qC * mE - 40.14 * qC * value
+ 31.96 * qC - 6.868 * mE * value
+ 0.4298 * mE + 0.1191 * value - 0.00232;
}
vec3 lS(vec3 color) {
const mat3 pp = mat3(
vec3(0.856627153315983, 0.137318972929847, 0.11189821299995),
vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903),
vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859)
);
const mat3 ow = mat3(
vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826),
vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294),
vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405)
);
color = pp * (LINEAR_SRGB_TO_LINEAR_REC2020 * color);
color = clamp((log2(max(color, 1e-10)) + 12.47393) / 16.5, 0.0, 1.0);
color = ow * fP(color);
color = pow(max(color, 0.0), vec3(2.2));
return clamp(LINEAR_REC2020_TO_LINEAR_SRGB * color, 0.0, 1.0);
}
vec3 cl(vec3 color) {
if (toneMappingMode == 1) return ll(color);
if (toneMappingMode == 2) return jE(color);
if (toneMappingMode == 3) return iK(color);
if (toneMappingMode == 4) return jN(color);
return lS(color);
}
vec3 fX(vec3 color) {
vec3 tb = vec3(
1.0 + temperature * 0.16 + tint * 0.04,
1.0 - tint * 0.12,
1.0 - temperature * 0.16 + tint * 0.04
);
color = max(color * tb, 0.0);
color = max((color - 0.18) * contrast + 0.18, 0.0);
float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
return max(mix(vec3(luminance), color, saturation), 0.0);
}
void main() {
vec2 uv = v_Texcoord;
vec4 shadow = sample_shadowCatcherTex(uv);
if (outputMode == 1) {
out_color = vec4(vec3(shadow.a), 1.0);
return;
}

vec4 color = sample_colorTex(uv);
vec4 bloom = sample_bloomTex(uv) * bloomIntensity;
color.rgb += bloom.rgb;
color.rgb = fX(color.rgb * exposure);
if (sRGBOutput) {
float edge = smoothstep(0.2, 0.72, distance(uv, vec2(0.5)));
color.rgb *= 1.0 - vignette * edge;
color.rgb = cl(color.rgb);
color.rgb = pow(max(color.rgb, 0.0), vec3(1.0 / 2.2));
}
color.a = max(color.a, min(dot(bloom.rgb, vec3(0.2125, 0.7154, 0.0721)), 1.0));

if (shadowCatcherEnabled > 0.5) {
float coverage = clamp(shadow.r, 0.0, 1.0);


float fO = clamp(
(1.0 - shadow.a) / max(coverage, 0.000001), 0.0, 1.0
);
fO = max(fO - (1.0 - shadowCatcherAlpha), 0.0);
if (coverage > 0.0) {
vec4 foreground = sample_foregroundTex(uv);
vec4 background = sample_catcherBackgroundTex(uv);
vec3 bK = fX((foreground.rgb + bloom.rgb) * exposure);
vec3 backgroundColor = fX((background.rgb / max(background.a, 0.000001) + bloom.rgb) * exposure);
if (sRGBOutput) {
float edge = smoothstep(0.2, 0.72, distance(uv, vec2(0.5)));
bK *= 1.0 - vignette * edge;
backgroundColor *= 1.0 - vignette * edge;
bK = pow(max(cl(bK), 0.0), vec3(1.0 / 2.2));
backgroundColor = pow(max(cl(backgroundColor), 0.0), vec3(1.0 / 2.2));
}

float opacity = fO;
fO *= coverage;
float lU = clamp(dot(bloom.rgb, vec3(0.2125, 0.7154, 0.0721)), 0.0, 1.0);
float hr = max(foreground.a, lU * (1.0 - coverage));
float iZ = max(background.a, lU * coverage);
float alpha = hr + iZ * (1.0 - opacity) + fO;
vec3 premultiplied = bK * hr
+ backgroundColor * iZ * (1.0 - opacity)
+ shadowCatcherColor * fO;
color = vec4(premultiplied / max(alpha, 0.000001), alpha);
}
}
out_color = color;
}`}),ul=new _e({name:"output",uniforms:{colorTex:C.uniform("sampler2D"),colorDenoisedTex:C.uniform("sampler2D"),denoisedPercent:C.uniform("float",0)},main:G`
void main() {
vec2 uv = v_Texcoord;
vec4 color = mix(
sample_colorTex(uv),
sample_colorDenoisedTex(uv),
denoisedPercent
);
color = vec4(color.rgb * color.a, color.a);
out_color = color;
}`});var QA=5,Aa={color:{type:k.HALF_FLOAT,minFilter:k.LINEAR,magFilter:k.LINEAR}},ia=class{_brightPass;_downsamplePasses=[];_blurHPasses=[];_blurVPasses=[];_blendPasses=[];constructor(e){this._brightPass=new Te("bloomBright",e,{shader:cl,outputs:["color"],outputParams:Aa});for(let t=0;t<=QA;t++){let A=new Te(`bloomDownsample${t}`,e,{shader:ll,outputs:["color"],outputParams:Aa}),a=new Te(`bloomBlurH${t}`,e,{shader:qn,outputs:["color"],outputParams:Aa}),r=new Te(`bloomBlurV${t}`,e,{shader:qn,outputs:["color"],outputParams:Aa});a.setUniform("blurDir",0),r.setUniform("blurDir",1),this._downsamplePasses.push(A),this._blurHPasses.push(a),this._blurVPasses.push(r),t>0&&this._blendPasses.push(new Te(`bloomBlend${t}`,e,{shader:ol,outputs:["color"],outputParams:Aa}))}}reserveCapacity(){[this._brightPass,...this._downsamplePasses,...this._blurHPasses,...this._blurVPasses,...this._blendPasses].forEach(e=>e.reserveCapacity())}setSize(e,t){this._brightPass.setSize(e,t);for(let A=0;A<=QA;A++)this._downsamplePasses[A].setSize(e>>A+1,t>>A+1),this._blurHPasses[A].setSize(e>>A+1,t>>A+1),this._blurVPasses[A].setSize(e>>A,t>>A),A>0&&this._blendPasses[A-1].setSize(e>>A-1,t>>A-1)}setBrightThreshold(e){this._brightPass.setUniform("threshold",e)}setRadius(e){let t=1-Math.max(Math.min(e**.3*.8,.8),0);this._blendPasses.forEach(a=>{a.setUniform("weight1",1-t),a.setUniform("weight2",t)});let A=Math.max(Math.min(e*2,1),.2);[...this._blurHPasses,...this._blurVPasses].forEach(a=>a.setUniform("blurSize",A))}createPass(e){this._brightPass.createPass({colorTex:e});for(let t=0;t<=QA;t++)this._downsamplePasses[t].createPass({colorTex:t===0?this._brightPass.getOutput("color"):this._downsamplePasses[t-1].getOutput("color")});for(let t=QA;t>=0;t--)this._blurHPasses[t].createPass({colorTex:this._downsamplePasses[t].getOutput("color")}),this._blurVPasses[t].createPass({colorTex:this._blurHPasses[t].getOutput("color")});for(let t=QA-1;t>=0;t--)this._blendPasses[t].createPass({colorTex1:t===QA-1?this._blurVPasses[QA].getOutput("color"):this._blendPasses[t+1].getOutput("color"),colorTex2:this._blurVPasses[t].getOutput("color")})}getOutput(){return this._blendPasses[0].getOutput("color")}getMemoryBytes(){return[this._brightPass,...this._downsamplePasses,...this._blurHPasses,...this._blurVPasses,...this._blendPasses].reduce((e,t)=>e+t.getMemoryBytes(),0)}dispose(){[this._brightPass,...this._downsamplePasses,...this._blurHPasses,...this._blurVPasses,...this._blendPasses].forEach(e=>e.dispose())}};var Hf=new _e({name:"jnlmGuide",outputs:["guide"],uniforms:{momentsTex:C.uniform("sampler2D"),catcherMomentsTex:C.uniform("sampler2D")},main:G`
void main() {
ivec2 p = ivec2(gl_FragCoord.xy);
vec4 moments = load_momentsTex(p, 0) + load_catcherMomentsTex(p, 0);
float n = moments.z;
float mean = moments.x / max(n, 1.0);

float variance = n >= 2.0
? max(moments.y - n * mean * mean, 0.0) / (n * (n - 1.0))
: -1.0;
out_guide = vec4(mean, variance, 0.0, 1.0);
}`}),Wf=new _e({name:"jnlmVariance",outputs:["guide"],uniforms:{rawGuideTex:C.uniform("sampler2D")},main:G`
void main() {
ivec2 p = ivec2(gl_FragCoord.xy);
ivec2 size = rawGuideTexRegion();
vec2 center = load_rawGuideTex(p, 0).xy;
float lk = 0.0;
float iY = 0.0;
float mO = 0.0;
float iS = 0.0;
for (int dy = -1; dy <= 1; dy++) {
for (int dx = -1; dx <= 1; dx++) {
vec2 value = load_rawGuideTex(clamp(p + ivec2(dx, dy), ivec2(0), size - 1), 0).xy;
mO += value.x;
iS += value.x * value.x;
if (value.y >= 0.0) {
lk += value.y;
iY += 1.0;
}
}
}
float variance;
if (center.y >= 0.0) {
variance = lk / iY;
} else {
float lj = mO / 9.0;
variance = max(iS / 9.0 - lj * lj, 0.0) * 9.0 / 8.0;
}
out_guide = vec4(center.x, variance, 0.0, 1.0);
}`}),Yf=new _e({name:"jnlmFilter",outputs:["color","guide"],defines:{SEARCH_RADIUS:nA.searchRadius,PATCH_RADIUS:nA.patchRadius,INV_ALBEDO_BANDWIDTH2:(1/nA.albedoBandwidth**2).toFixed(6),INV_NORMAL_BANDWIDTH2:(1/nA.normalBandwidth**2).toFixed(6)},uniforms:{guideTex:C.uniform("sampler2D"),colorTex:C.uniform("sampler2D"),albedoTex:C.uniform("sampler2D"),normalTex:C.uniform("sampler2D"),shadowCatcherTex:C.uniform("sampler2D"),colorSensitivity:C.uniform("float",.6),dilation:C.uniform("int",1),decodeInput:C.uniform("bool",0),encodeOutput:C.uniform("bool",0)},main:G`
#define PATCH_SIZE ((2 * PATCH_RADIUS + 1) * (2 * PATCH_RADIUS + 1))

#define VARIANCE_CANCELLATION 1.0


#define CENTER_WEIGHT_MIN 0.01
#define INV_COVERAGE_BANDWIDTH2 ${(1/.1**2).toFixed(6)}

ivec2 imageSize;

vec2 nt(ivec2 p) {
return load_guideTex(clamp(p, ivec2(0), imageSize - 1), 0).xy;
}


vec4 rD(ivec2 p) {
vec4 c = load_colorTex(p, 0);
if (decodeInput) c.rgb = pow(max(c.rgb, 0.0), vec3(2.2));
return vec4(c.rgb * c.a, c.a);
}

float ln(ivec2 q, vec4 bs, vec3 gO) {
vec4 albedo = load_albedoTex(q, 0);


vec3 oW = max((albedo.rgb + bs.rgb) * 0.5, vec3(${.02}));
vec3 kU = (albedo.rgb - bs.rgb) / oW;
float iP = albedo.a - bs.a;
vec3 le = load_normalTex(q, 0).rgb - gO;
return max(
dot(kU, kU) * INV_ALBEDO_BANDWIDTH2
+ iP * iP * INV_COVERAGE_BANDWIDTH2,
dot(le, le) * INV_NORMAL_BANDWIDTH2
);
}

void main() {
imageSize = guideTexRegion();
ivec2 p = ivec2(gl_FragCoord.xy);
vec4 bs = load_albedoTex(p, 0);
vec4 fw = load_normalTex(p, 0);
vec3 gO = fw.rgb;


if (fw.a <= 0.0 && load_shadowCatcherTex(p, 0).r <= 0.0) {
vec4 c = rD(p);
vec3 rgb = c.rgb / max(c.a, 1e-6);
if (encodeOutput) rgb = pow(max(rgb, 0.0), vec3(1.0 / 2.2));
out_color = vec4(rgb, c.a);
out_guide = vec4(nt(p), 0.0, 1.0);
return;
}

vec2 kW[PATCH_SIZE];
int k = 0;
for (int dy = -PATCH_RADIUS; dy <= PATCH_RADIUS; dy++) {
for (int dx = -PATCH_RADIUS; dx <= PATCH_RADIUS; dx++) {
kW[k] = nt(p + ivec2(dx, dy) * dilation);
k++;
}
}
float k2 = colorSensitivity * colorSensitivity;

vec4 sum = vec4(0.0);
vec3 gR = max(bs.rgb, vec3(${.02}));
vec3 mf = vec3(0.0);
vec3 gt = vec3(0.0);
vec3 hn = vec3(0.0);
float pk = 0.0;
float gv = 0.0;
float nK = 0.0;
float kD = 0.0;
for (int sy = -SEARCH_RADIUS; sy <= SEARCH_RADIUS; sy++) {
for (int sx = -SEARCH_RADIUS; sx <= SEARCH_RADIUS; sx++) {
ivec2 q = p + ivec2(sx, sy) * dilation;
if (
(sx == 0 && sy == 0) ||
q.x < 0 || q.y < 0 || q.x >= imageSize.x || q.y >= imageSize.y
) continue;
float features = ln(q, bs, gO);
if (features > 16.0) continue;

float fT = 0.0;
k = 0;
for (int dy = -PATCH_RADIUS; dy <= PATCH_RADIUS; dy++) {
for (int dx = -PATCH_RADIUS; dx <= PATCH_RADIUS; dx++) {
vec2 a = kW[k];
vec2 b = nt(q + ivec2(dx, dy) * dilation);
float qL = a.x - b.x;
fT += (qL * qL
- VARIANCE_CANCELLATION * (a.y + min(a.y, b.y)))
/ (1e-10 + k2 * (a.y + b.y));
k++;
}
}
fT /= float(PATCH_SIZE);

float weight = exp(-max(max(fT, 0.0), features));
vec2 g = nt(q);

vec3 a = (load_albedoTex(q, 0).rgb - bs.rgb) / gR;
vec4 value = rD(q);
sum += value * weight;
mf += a * weight;
gt += a * a * weight;
hn += a * value.rgb * weight;
pk += g.x * weight;
gv += g.y * weight * weight;
nK += weight;
kD = max(kD, weight);
}
}



vec4 center = rD(p);
vec2 kV = nt(p);
float dF = max(kD, CENTER_WEIGHT_MIN);
float totalWeight = nK + dF;
vec4 mean = (sum + center * dF) / totalWeight;


vec3 ez = mf / totalWeight;
vec3 lo = max(gt / totalWeight - ez * ez, vec3(0.0));
vec3 qm = hn / totalWeight - ez * mean.rgb;



vec3 qw = bs.rgb + ez * gR;
vec3 oq = mean.rgb * gR / max(qw, vec3(${.02}));
vec3 vs = clamp(qm / (lo + vec3(${1e-4})), vec3(0.0), oq);
vec3 rs = mean.rgb - vs * ez;
vec4 filtered = vec4(max(rs, vec3(0.0)), max(mean.a, 0.0));
vec3 rgb = filtered.a > 1e-6
? filtered.rgb / max(filtered.a, 1e-6)
: center.rgb / max(center.a, 1e-6);
if (encodeOutput) rgb = pow(max(rgb, 0.0), vec3(1.0 / 2.2));
out_color = vec4(rgb, filtered.a);
out_guide = vec4(
(pk + kV.x * dF) / totalWeight,
(gv + kV.y * dF * dF)
/ (totalWeight * totalWeight),
0.0,
1.0
);
}`}),Jn={type:k.FLOAT,minFilter:k.NEAREST,magFilter:k.NEAREST},Cr=class{_renderer;_guidePass;_variancePass;_filterPasses;constructor(e){this._renderer=e,this._guidePass=new Te("jnlmGuide",e,{shader:Hf,outputParams:{guide:Jn}}),this._variancePass=new Te("jnlmVariance",e,{shader:Wf,outputParams:{guide:Jn}}),this._filterPasses=[0,1].map(()=>new Te("jnlmFilter",e,{shader:Yf,outputParams:{color:{type:k.HALF_FLOAT},guide:Jn}}))}render(e){let{width:t,height:A,shape:a}=e;[this._guidePass,this._variancePass,...this._filterPasses].forEach(c=>c.setSize(t,A)),this._guidePass.createPass({momentsTex:e.moments,catcherMomentsTex:e.catcherMoments??this._renderer.emptyTexture}),this._variancePass.createPass({rawGuideTex:this._guidePass.getOutput("guide")});let n=.6*Math.max(e.strength,.001),o=Math.min(4,Math.max(1,Math.round(a.iterations))),s=this._variancePass.getOutput("guide"),l=e.color;for(let c=0;c<o;c++){let u=this._filterPasses[c%2];u.setDefines({SEARCH_RADIUS:a.searchRadius,PATCH_RADIUS:String(a.patchRadius),INV_ALBEDO_BANDWIDTH2:(1/a.albedoBandwidth**2).toFixed(6),INV_NORMAL_BANDWIDTH2:(1/a.normalBandwidth**2).toFixed(6)}),u.setUniforms({colorSensitivity:n,dilation:ga(c),decodeInput:c===0,encodeOutput:c===o-1}),u.createPass({guideTex:s,colorTex:l,albedoTex:e.albedo,normalTex:e.normal,shadowCatcherTex:e.shadowCatcher}),s=u.getOutput("guide"),l=u.getOutput("color")}return l}reserveCapacity(){[this._guidePass,this._variancePass,...this._filterPasses].forEach(e=>e.reserveCapacity())}retainOutput(e){this._filterPasses.forEach(t=>t.retainOutput(e))}releaseOutput(e){this._filterPasses.forEach(t=>t.releaseOutput(e))}getMemoryBytes(){return[this._guidePass,this._variancePass,...this._filterPasses].reduce((e,t)=>e+t.getMemoryBytes(),0)}dispose(){[this._guidePass,this._variancePass,...this._filterPasses].forEach(e=>e.dispose())}};var dl=[650,510,475];function jf(i,e,t){let A=(S,J,he)=>{},a=!1,r=0,n=!1,o=0,s=0,l=32,c,u=0,p=!0,d=!1,f=!1,m=1,g=1,h=1,B=1,_={},E,Q=0,w=!1,x,M=!1,P=21,D=0,V=1,$=.6,v=1,U=0,I=1,N=1,q=0,O=0,te=0,le="final",Le=performance.now(),ge=0,xe=y.create(),Be=1,oe=pr(i.gl);oe.setDesiredMsPerTile(P);let ue=new xr(i),De,X=t.get("composePass",()=>new Te("compose",i,{shader:fl,outputs:["color"],outputParams:{color:{type:k.UNSIGNED_BYTE}}}));X.setUniforms({exposure:v,shadowCatcherColor:xe,shadowCatcherAlpha:Be,shadowCatcherEnabled:0,bloomIntensity:0,toneMappingMode:U,contrast:I,saturation:N,temperature:q,tint:O,vignette:te,outputMode:0,sRGBOutput:1});let ve=t.get("outputPass",()=>new Te("output",i,{shader:ul,outputs:["color"]}));ve.setRenderToScreen();let Oe=t.get("image copy",()=>new vr(i)),de=Oe.readFrameBuffer,re,ze,Fe,Ce=!1,ye=!1;function ne(S){let J=s+o,he=S?EA(J,2)-.5:0,Pe=S?EA(J,3)-.5:0;e.setJitter(he/m,Pe/g)}function Z(S,J){e.setSampleCount(s+o),e.setSampleSequenceOffset(o),ne(!0),e.hasDispersion()?E?.dispersionWavelengths===1?(e.setWavelength(dl[0]),e.createPass(S,J)):dl.forEach((he,Pe)=>{e.setWavelength(he),e.createPass(S&&Pe===0,J,Pe>0)}):(e.setWavelength(0),e.createPass(S,J))}function Ne(S=!1,J=!1){if(J&&(Q=s,w=e.hasShadowCatcher()),Q===0)return;J&&(ue.setSampleCount(s),ue.createPass(e)),X.setSize(m,g),X.setUniforms({exposure:v,toneMappingMode:U,contrast:I,saturation:N,temperature:q,tint:O,vignette:te,shadowCatcherColor:xe,shadowCatcherAlpha:Be});let he=ue.getOutput("color"),Pe=D>0,ce=s<10||s%10>0,Ee=t.get("bloom state",()=>({owner:void 0,settings:"",dispose(){}})),Et=`${V}/${$}`,xA=Pe&&s>=10&&(!ce||Ee.owner!==_||Ee.settings!==Et),wt=D;if(xA?(De||=t.get("bloom",()=>new ia(i)),De.setSize(m,g),Ee.owner=_,Ee.settings=Et,De.setBrightThreshold(V),De.setRadius($),De.createPass(he)):Pe&&s<10&&(wt=0),X.setUniforms({bloomIntensity:wt,shadowCatcherEnabled:+w,outputMode:le==="shadow"?1:0}),X.createPass({colorTex:he,foregroundTex:ue.getOutput("foreground"),catcherBackgroundTex:ue.getOutput("catcherBackground"),shadowCatcherTex:ue.getOutput("shadowCatcher"),bloomTex:Pe&&De?De.getOutput():i.emptyTexture}),ze){re??=t.get("jnlm",()=>new Cr(i));let ct=re.render({width:m,height:g,moments:e.getOutput("moments"),catcherMoments:e.hasShadowCatcher()?e.getOutput("catcherMoments"):void 0,color:X.getOutput("color"),albedo:ue.getOutput("albedo"),normal:ue.getOutput("normal"),shadowCatcher:ue.getOutput("shadowCatcher"),strength:ze.strength,shape:ze.shape});Fe=Oe.copy(ct,m,g,Fe),Ce=!0,ze=void 0}let Qe=le==="final"&&Ce&&Fe||X.getOutput("color");le==="normal"||le==="albedo"?Qe=ue.getOutput(le):le==="shadowCatcher"&&(Qe=ue.getOutput("shadowCatcher")),x=Oe.copy(Qe,m,g,x),M=le==="final"&&Ce&&!!Fe}function at(S){let J=performance.now(),he=u,Pe=oe;di(()=>{l=Math.max(performance.now()-J-ge,ge>0?16:8),ge=0,he===u&&Pe===oe&&!p&&(c=S&&i.isAllProgramCompiled()?l:void 0)})}function vt(S,J){if(e.isInvalid()||d)return!1;if(!i.isAllProgramCompiled())return p=!0,s=0,oe.reset(),!0;e.setCamera(S);let he=p;if(he&&(u++,c=void 0,e.setCamera(S),oe.reset(),s=0,p=!1),s>=J)return Ne(!0),!1;(!ye||he)&&(Ce=!1),at(!he);let Pe=s,ce=oe.nextTile(c);r>0&&ce.isFirstTile&&ce.isLastTile?ce.samplesPerFrame=r:(!a||!(ce.isFirstTile&&ce.isLastTile))&&(ce.samplesPerFrame=1);try{for(let Ee=0;Ee<ce.samplesPerFrame&&s<J;Ee++)Z(s===0&&ce.isFirstTile,{x:ce.x,y:ce.y,width:ce.tileWidth,height:ce.tileHeight}),ce.isLastTile&&s++;s!==Pe&&(!n||s>=J)&&Ne(s>=J,!0)}catch(Ee){return console.error(Ee),d=!0,!1}return s!==Pe&&A(s,Pe===0,l),!i.isAllProgramCompiled()}function AA(){e.useTarget(_);let S=1,J=Math.max(1,Math.round(h*S)),he=Math.max(1,Math.round(B*S));e.setSize(J,he,h/B),!(J===m&&he===g)&&(m=J,g=he,oe.setSize(m,g),ue.setSize(m,g),X.setSize(m,g),De?.setSize(m,g),s=0,Q=0,p=!0)}function ee(S,J){S=Math.max(1,S),J=Math.max(1,J),!(S===h&&J===B)&&(h=S,B=J,ve.setSize(h,B),AA(),s=0,p=!0)}function Re(){document.hidden?Le=performance.now():ge=performance.now()-Le}typeof document<"u"&&document.addEventListener("visibilitychange",Re);function Ye(){e.useTarget(_),e.setSize(m,g,h/B),E&&(e.setQuality(E),e.setClamping(E.clamping),e.setTransmissiveOutputAlphaMin(E.transmissiveOutputAlphaMin),e.setBevelSamples(E.bevelSamples),e.setSamplingPattern(E.samplingPattern,E.maxSamples))}return{invalidateDenoisedOutput(){ze=void 0,Ce=!1,ye=!1},synchronizeBackground(){},configure(S){E={...S},P=Math.max(1,S.timeBudgetMs),a=S.allowMultipleSamplesPerFrame,oe.setDesiredMsPerTile(P),oe.setMaxTiles(S.maxTiles)},activate:Ye,canCompleteSampleWithin(S){return l<=S},getOutputTexture(){},applyPostProcesses(){},get presentationComplete(){return!!x},get presentationDenoised(){return M},present(){x&&(ve.setSize(i.canvas.width,i.canvas.height),ve.setUniform("denoisedPercent",0),ve.createPass({colorTex:x,colorDenoisedTex:x}))},getMemory(){return{width:m,height:g,bytes:e.getTargetMemoryBytes(_)+ue.getMemoryBytes()+(x?.getMemoryBytes()??0)+(Fe?.getMemoryBytes()??0)}},isFirstFrame:()=>p,restartSamples(S=!1){oe.reset(),p=!0,s=0,Ce=!1,ye=!1},performDenoise(S){return S.kind!=="jnlm"?Promise.reject(new Error("This denoiser requires WebGPU.")):p||s<1?Promise.resolve(!1):(ze=S.denoiser,Ne(!0),Promise.resolve(!0))},cancelDenoise(){ze=void 0},setPreserveDenoisedOutput(S){ye=S},trace:vt,drawPostProcess:()=>Ne(!0),setSize:ee,setToneMappingParams(S){let J=S.exposure??1,he={agx:0,aces:1,cineon:2,reinhard:3,linear:4}[S.toneMapping??"agx"]??0,Pe=S.contrast??1,ce=S.saturation??1,Ee=S.temperature??0,Et=S.tint??0,xA=S.vignette??0;return J===v&&he===U&&Pe===I&&ce===N&&Ee===q&&Et===O&&xA===te?!1:(v=J,U=he,I=Pe,N=ce,q=Ee,O=Et,te=xA,X.setUniforms({exposure:v,toneMappingMode:U,contrast:I,saturation:N,temperature:q,tint:O,vignette:te}),!0)},setOfflineRenderOptions(S){r=Math.max(0,Math.round(S.samplesPerBatch)),n=S.deferPostProcess,o=Math.max(0,Math.round(S.sampleSequenceOffset))},setVarianceMoments(S){},setAdaptiveSamplingTargets(S){},async prepareOfflineAdaptiveSampling(S){},getTotalSamplesRendered:()=>s,getDiagnostics:()=>({...e.getDiagnostics(),shaderCompilation:i.getShaderCompilationDiagnostics()}),flushDiagnostics:async()=>{},setShadowCatcherParams(S,J){let he=S[0]!==xe[0]||S[1]!==xe[1]||S[2]!==xe[2]||J!==Be;return he&&(y.copy(xe,S),Be=J,X.setUniform("shadowCatcherColor",S),X.setUniform("shadowCatcherAlpha",J)),he},setBloomParams({intensity:S,threshold:J,radius:he}){let Pe=S!==D||J!==V||he!==$;return D=S,V=J,$=he,Pe},setOnSampleRendered(S){A=S},setOutput(S){return le===S?!1:(le=S,!0)},async readPresentation(){if(!x)throw new Error("Render has no complete image.");de.bind(i,[x]);let S=x.width,J=x.height;return{width:S,height:J,data:Hn(i.gl,S,J,x.isByteEncoded)}},async readOutput(S){S==="denoised"&&(!Fe||!Ce)&&(S="hdr");let J=S==="denoised"?Fe:ue.getOutput(S==="hdr"?"color":S);return de.bind(i,[J]),{data:Hn(i.gl,m,g,S==="albedo"||S==="normal"),width:m,height:g}},dispose(){f||(f=!0,typeof document<"u"&&document.removeEventListener("visibilitychange",Re),e.releaseTarget(_),ue.dispose(),x?.dispose(i.gl),Fe?.dispose(i.gl))}}}function pl(i){let e=new nl(i),t=new ti;return Ja(e,()=>jf(i,e,t),!0,t)}var bA=null,ml=null,aa;async function Vf(i){if(bA)return bA;if(!aa){let e=(async()=>{let t=await i.requestAdapter({powerPreference:"high-performance"})??await i.requestAdapter();if(!t)throw new Error("No WebGPU adapter is available");let A=await t.requestDevice(tn(t));return ml=t.info??null,bA=A,A.lost.then(()=>{bA===A&&(bA=null)}),A})();aa=e,e.finally(()=>{aa===e&&(aa=void 0)}).catch(()=>{})}return aa}var yr=class{scene;camera;display;bvhBuilder="builtin";bvhLayout="bvh2";bvhSpatialSplits=!1;textureAtlasBudgetBytes=Bt;get bvhWorkerCount(){return this._bvhWorkerCount}set bvhWorkerCount(e){Si(e),this._bvhWorkerCount=e}_bvhWorkerCount="auto";_bvhWorkerPool;_bvhPreparationRevision=0;_bvhPreparation;_bvhPreparationTail=Promise.resolve();_tinyBvhUnavailable=!1;_bvhWorkerUnavailable=!1;_bvhPreparedGeometry=new WeakMap;_lastBvhBuild;_lastBvhSettings="";_lastBudget=-1;_shaderProgress="";_events=new Zt;_pipeline;_webglRenderer;_gpuDevice;_suppliedDevice;_ownsDeviceSelection;_deviceRevision=0;_lossController;_deviceLossError;_webglListening=!1;_webglLost=!1;_recoverWebGL=!1;_contextRestore;_gpuAdapterInfo;_backendChoice;_initPromise;_info;_pipelineInitError;_webgpuFallbackReason;_reportedErrors=new WeakSet;_loggedErrorMessages=new Set;_sceneChangeDetector;_snapshot=new Sa;_sourceScene;_committedScene;_sourceCamera;_committedCamera;_cameraFields=[];_sceneRevision=0;_cameraRevision=0;_uploadedRevision=-1;_pendingMeshes="full";_pendingTransforms=new Set;_pendingColors=new Set;_pendingGeometries=new Set;_pendingMaterials=new Set;_pendingLights=!0;_pendingBackground=!0;_disposed=!1;_readingDepth=!1;_renders=new Set;_targetCounter=0;_presented;_denoisers=new Set;_denoiserCache=new Map;_denoiserEntries=new WeakMap;_weights=new Map;_customPrepared=new WeakMap;_denoiseTail=Promise.resolve();_lastError;get lastError(){return this._lastError}_setRenderError(e){this._lastError=e??this._pipelineInitError}constructor(e={}){if(e.device&&e.backend==="webgl")throw new Error("A supplied GPUDevice cannot use the webgl backend.");this._suppliedDevice=e.device,this._ownsDeviceSelection=!e.device,this._backendChoice=e.device?"webgpu":e.backend??"auto",this._sceneChangeDetector=new va,this.display=VA._create(this,e.canvas??nt())}init(){return this._initPromise??=(async()=>{if(this._disposed)throw new Error("Engine is disposed.");if(this._pipelineInitError&&!this._ownsDeviceSelection)throw this._pipelineInitError;let e=this._deviceRevision;if(this._contextRestore&&await this._contextRestore.promise,this._disposed)throw new Error("Engine is disposed.");if(await this._initPipeline(this._backendChoice!=="webgl"&&!this._recoverWebGL),e!==this._deviceRevision)throw this._deviceLossError;if(this._pipelineInitError)throw this._pipelineInitError;if(this._disposed)throw this._pipeline?.dispose(),new Error("Engine is disposed.");let t=this._webglRenderer?.gl,A=this._gpuDevice?.limits;return this._info={backend:this._gpuDevice?"webgpu":"webgl",adapterName:this._adapterName(),webgpuFallbackReason:this._webgpuFallbackReason,limits:{maxTextureArrayLayers:A?.maxTextureArrayLayers??t?.getParameter(t.MAX_ARRAY_TEXTURE_LAYERS),maxTextureDimension2D:A?.maxTextureDimension2D??t?.getParameter(t.MAX_TEXTURE_SIZE)}},this._upload(),this._info})()}get info(){return this._info}get backend(){return this._info?.backend}get device(){return this._gpuDevice}on(e,t){return this._events.on(e,t)}update(){if(this._disposed)throw new Error("Engine is disposed.");this._lastError=this._pipelineInitError;let e=!1,t=!1,A=this.camera?Qt(this.camera):[];(this.camera!==this._sourceCamera||!Ve(A,this._cameraFields))&&(this._sourceCamera=this.camera,this._cameraFields=A,this._committedCamera=this.camera?Ri(this.camera):void 0,this._cameraRevision++,e=!0);let a=Ns(this,"bvh"),r=a!==this._lastBvhSettings||Ia(this)!==this._lastBudget;if((this.scene!==this._sourceScene||r)&&this._sceneChangeDetector.reset(),this.scene){Gi(this.scene.lights,o=>this._notifyError(o)),io(this.scene.meshes);let n=this._sceneChangeDetector.detect(this.scene);if(t=n.meshes==="full"||this.scene!==this._sourceScene||r,n.meshes!=="none"||n.lights||n.background||this.scene!==this._sourceScene||r){this._committedScene=this._snapshot.capture(this.scene,n),n.meshes==="full"||r||this.scene!==this._sourceScene?this._pendingMeshes="full":n.meshes==="incremental"&&this._pendingMeshes!=="full"&&(this._pendingMeshes="incremental");for(let o of n.transforms)this._pendingTransforms.add(this._snapshot.mirror(o));for(let o of n.colors)this._pendingColors.add(this._snapshot.mirror(o));for(let o of n.geometries)this._pendingGeometries.add(this._snapshot.mirror(o));for(let o of n.materials)this._pendingMaterials.add(this._snapshot.mirror(o));this._pendingLights||=n.lights,this._pendingBackground||=n.background,this._sceneRevision++,e=!0}this._sceneChangeDetector.commit()}else this._sourceScene&&(this._committedScene=void 0,this._pendingMeshes="full",this._pendingLights=!0,this._pendingBackground=!0,this._sceneRevision++,e=!0);if(this._sourceScene=this.scene,this._lastBvhSettings=a,this._lastBudget=Ia(this),this._pipeline||this.init().catch(()=>{}),e)for(let n of this._renders)n._inputsChanged(t);return this._upload(),e}_upload(){let e=this._pipeline;if(!e||this._disposed||this._bvhPreparation||this._uploadedRevision===this._sceneRevision)return;let t=this._committedScene??{meshes:[],lights:[]};if(this._needsBVHPreparation(t.meshes)){let a=this.prepare(t);this._bvhPreparation=a,a.then(()=>{this._bvhPreparation===a&&(this._bvhPreparation=void 0),this._upload()},r=>{this._bvhPreparation===a&&(this._bvhPreparation=void 0),this._notifyError(r)});return}let A=e.setTextureAtlasBudget(this._lastBudget>=0?this._lastBudget:Ia(this));(this._pendingMeshes!=="none"||A)&&e.setMeshes(t.meshes,this._pendingMeshes==="full"||A?void 0:{transforms:[...this._pendingTransforms],colors:[...this._pendingColors],geometries:[...this._pendingGeometries],materials:[...this._pendingMaterials]}),this._pendingLights&&e.setLights(t.lights),this._pendingBackground&&e.setBackground(t.background),this._pendingMeshes="none",this._pendingLights=!1,this._pendingBackground=!1,this._pendingTransforms.clear(),this._pendingColors.clear(),this._pendingGeometries.clear(),this._pendingMaterials.clear(),this._uploadedRevision=this._sceneRevision}_bvhConfig(){return Fs(this)}prepare(e,t={}){let A=this._bvhPreparationRevision,a=this._bvhPreparationTail.then(async()=>{let n=()=>A!==this._bvhPreparationRevision||t.signal?.aborted===!0;if(n())return;let o=e.meshes,s=Zr()&&!this._bvhWorkerUnavailable;if(s){let u=zs(this);this._bvhWorkerPool?.size!==u&&(this._bvhWorkerPool?.dispose(),this._bvhWorkerPool=new dA(u))}let l=this._bvhConfig(),c=await so(o,{config:l,...l,builder:this.bvhBuilder==="tinybvh"&&!this._tinyBvhUnavailable?"tinybvh":"builtin",useWorker:s,workerPool:this._bvhWorkerPool,isCancelled:n,rebuild:!1,onProgress:u=>{this._bvhPreparation===a&&this._events.emit("progress",{stage:"bvh",progress:u}),t.onProgress?.(u)}});n()||(c.workerUnavailable&&!this._bvhWorkerUnavailable&&(this._bvhWorkerUnavailable=!0,this._bvhWorkerPool?.dispose(),this._bvhWorkerPool=void 0,console.warn("BVH preparation failed; falling back to the calling-thread BVH builder.")),c.tinyBvhUnavailable&&!this._tinyBvhUnavailable&&(this._tinyBvhUnavailable=!0,console.warn("BVH preparation failed; falling back to the built-in BVH builder.")),c.failedMeshes.forEach(u=>{this._bvhPreparedGeometry.set(u,[u.geometry,u.geometry.version])}),this._lastBvhBuild={geometryCount:c.geometryCount,bvhTimeMs:c.bvhTimeMs})});this._bvhPreparationTail=a.catch(()=>{});let r=t.signal;return r?new Promise((n,o)=>{let s=()=>o(r.reason??new DOMException("BVH preparation aborted","AbortError"));if(r.aborted){s();return}r.addEventListener("abort",s,{once:!0}),a.then(n,o).finally(()=>r.removeEventListener("abort",s))}):a}_needsBVHPreparation(e){return this._bvhPreparation?!0:(this.bvhBuilder!=="tinybvh"||this._tinyBvhUnavailable)&&(!Zr()||this._bvhWorkerUnavailable)?e.some(t=>!!me(pA(t))&&qi(t,this._bvhConfig())):e.some(t=>{let A=this._bvhPreparedGeometry.get(t);return!(A?.[0]===t.geometry&&A[1]===t.geometry.version)&&qi(t,this._bvhConfig())})}async _initPipeline(e){let t=!1;try{if(this._events.emit("progress",{stage:"device",progress:0}),this._pipelineInitError=void 0,e&&(this._suppliedDevice||typeof navigator<"u"&&navigator.gpu))try{let A=typeof navigator<"u"?navigator.gpu:void 0,a=this._suppliedDevice??await Vf(A),r=this._suppliedDevice?a.adapterInfo:ml;if(this._disposed)return;en(a),this._gpuAdapterInfo=r??void 0,this._gpuDevice=a,this._pipeline=$o(this.display.canvas,a,{presentationFormat:A?.getPreferredCanvasFormat()??"bgra8unorm"}),this._watchDevice(a),t=!0}catch(A){if(this._backendChoice==="webgpu")throw A;this._webgpuFallbackReason=A instanceof Error?A.message:String(A),this._gpuDevice=void 0,this._gpuAdapterInfo=void 0}if(!t){if(this._backendChoice==="webgpu")throw new Error("WebGPU is not available in this environment");e&&!this._webgpuFallbackReason&&(this._webgpuFallbackReason="WebGPU is not available in this environment"),this._webglRenderer=new ya({canvas:this.display.canvas,alpha:!0,depth:!0,stencil:!1,antialias:!1,pixelRatio:1,preserveDrawingBuffer:!0,premultipliedAlpha:!1,parallelShaderCompile:!0,powerPreference:"high-performance"}),this._pipeline=pl(this._webglRenderer),this._webglListening||(this._webglListening=!0,this.display.canvas.addEventListener("webglcontextlost",this._onContextLost),this.display.canvas.addEventListener("webglcontextrestored",this._onContextRestored)),this._recoverWebGL=!1}}catch(A){this._pipelineInitError=A instanceof Error?A:new Error(String(A)),this._lastError=this._pipelineInitError,this._notifyError(this._pipelineInitError)}finally{this._events.emit("progress",{stage:"device",progress:1})}}_onContextLost=e=>{if(e.preventDefault(),this._disposed||this._webglLost)return;this._webglLost=!0,this._recoverWebGL=!0;let t,A,a=new Promise((n,o)=>{t=n,A=o});a.catch(()=>{}),this._contextRestore={promise:a,resolve:t,reject:A};let r=new Error(`WebGL context lost: ${e.statusMessage||"context is unavailable"}`);this._invalidateDevice(r,!0),this._events.emit("devicelost",{reason:"webglcontextlost",recovering:!0})};_onContextRestored=()=>{if(this._disposed||!this._webglLost)return;this._webglLost=!1;let e=this._contextRestore;this._contextRestore=void 0,e?.resolve()};_watchDevice(e){e.lost.then(t=>{if(this._disposed||this._gpuDevice!==e)return;bA===e&&(bA=null);let A=this._ownsDeviceSelection,a=new Error(`WebGPU device lost (${t.reason}): ${t.message||"device is unavailable"}`);this._invalidateDevice(a,A),this._events.emit("devicelost",{reason:t.reason,recovering:A}),A||this._notifyError(a)})}_invalidateDevice(e,t){this._deviceLossError=e,this._deviceRevision++,this._lossController?.abort(e),this._lossController=void 0;for(let A of this._renders)A._deviceLost(t);this._pipeline?.dispose(),this._pipeline=void 0,this._webglRenderer?.dispose(),this._webglRenderer=void 0,this._gpuDevice=void 0,this._gpuAdapterInfo=void 0,this._info=void 0,this._initPromise=void 0,this._pipelineInitError=t?void 0:e,this._lastError=e,this._presented=void 0,this._shaderProgress="",this._uploadedRevision=-1,this._pendingMeshes="full",this._pendingLights=!0,this._pendingBackground=!0,this._sceneRevision++,this._customPrepared=new WeakMap;for(let A of[...this._denoisers]){let a=this._denoiserEntries.get(A);a&&(a.references=1),this._releaseDenoiser(A)}this._denoiserCache.clear()}async setDevice(e){if(this._disposed)throw new Error("Engine is disposed.");if(this._ownsDeviceSelection)throw new Error("setDevice requires an engine constructed with device.");try{en(e)}catch(t){throw this._lastError=this._notifyError(t),t}this._gpuDevice===e&&!this._pipelineInitError||(this._invalidateDevice(new Error("WebGPU device replaced during converge."),!0),this._suppliedDevice=e)}_awaitDevice(e){let t=(this._lossController??=new AbortController).signal;return new Promise((A,a)=>{let r=()=>a(t.reason);t.addEventListener("abort",r,{once:!0}),e.then(A,a).finally(()=>t.removeEventListener("abort",r))})}get _deviceGeneration(){return this._deviceRevision}get _lostError(){return this._deviceLossError}_adapterName(){if(this._gpuAdapterInfo)return this._gpuAdapterInfo.description||this._gpuAdapterInfo.vendor||"WebGPU";let e=this._webglRenderer?.gl,t=e?.getExtension("WEBGL_debug_renderer_info");return t&&e?e.getParameter(t.UNMASKED_RENDERER_WEBGL):this._webglRenderer?"WebGL 2":this._gpuDevice?"WebGPU":""}_reportShaderProgress(){let e=this._pipeline?.getDiagnostics().shaderCompilation;if(!e)return;let t=`${e.status}/${e.completedPipelineCount}/${e.pipelineCount}`;t!==this._shaderProgress&&(this._shaderProgress=t,this._events.emit("progress",{stage:"shaders",progress:e.pipelineCount?e.completedPipelineCount/e.pipelineCount:1}))}getDiagnostics(){if(!this._pipeline&&!this._lastBvhBuild)return;let e=this._pipeline?.getDiagnostics();return{...e,bvh:{...e?.bvh,lastBuild:this._lastBvhBuild},backend:this.backend,adapterName:this._adapterName(),width:this.display.canvas.width,height:this.display.canvas.height,lastError:this.lastError?.message,webgpuFallbackReason:this._webgpuFallbackReason,presentedTarget:this._presented?.label,presentedComplete:this._presented?.presentationComplete??!1}}async readDepthSamples(e){if($A(e,1),!(!this._ready||!this._committedCamera||this._readingDepth)){this._readingDepth=!0;try{let t=Ri(this._committedCamera);t.aspect??=this.display.canvas.width/this.display.canvas.height;let A=await this._pipeline.readDepthSamples(t,e);return this._disposed?void 0:A}finally{this._readingDepth=!1}}}dispose(){if(!this._disposed){this._disposed=!0,this._bvhPreparationRevision++,this._contextRestore?.reject(new Error("Engine is disposed.")),this._contextRestore=void 0,this._webglListening&&(this.display.canvas.removeEventListener("webglcontextlost",this._onContextLost),this.display.canvas.removeEventListener("webglcontextrestored",this._onContextRestored));for(let e of[...this._renders])e.dispose();this._pipeline?.dispose(),this._pipeline=void 0,this._webglRenderer?.dispose(),this._bvhWorkerPool?.dispose();for(let e of[...this._denoisers]){let t=this._denoiserEntries.get(e);t&&(t.references=1),this._releaseDenoiser(e)}this._denoiserCache.clear(),this._weights.clear(),this._events.clear()}}get _initializationError(){return this._pipelineInitError}get _ready(){return!!this._pipeline&&this._uploadedRevision===this._sceneRevision&&!!this._committedScene&&!!this._committedCamera&&!this._disposed}get _inputs(){return{scene:this._sceneRevision,camera:this._cameraRevision,value:this._committedCamera}}_register(e){if(this._disposed)throw new Error("Engine is disposed.");this._renders.add(e)}_unregister(e){this._renders.delete(e)}_createTarget(){return this._pipeline?.createTarget(`render-${++this._targetCounter}`)}_releaseTarget(e){this._presented===e&&(this._presented=void 0),this._pipeline?.releaseTarget(e)}_present(e){e.activate(),e.present(),this._presented=e}_notifyError(e){let t=e instanceof Error?e:new Error(String(e));return this._loggedErrorMessages.has(t.message)||(this._loggedErrorMessages.add(t.message),console.error(`Path tracing failed: ${t.message}`,t)),this._reportedErrors.has(t)||(this._reportedErrors.add(t),this._events.emit("error",t)),t}_getWeights(e,t){let A=this._weights.get(e);return A||(A=t(),this._weights.set(e,A),A.catch(()=>{this._weights.get(e)===A&&this._weights.delete(e)})),A}_retainDenoiser(e,t){let A=this._denoiserCache.get(e);if(!A?.value){let a=this._ownDenoiser(t()),r={key:e,references:0,value:a};this._denoiserCache.set(e,r),this._denoiserEntries.set(a,r),A=r}return A.references++,A.value}async _acquireDenoiser(e,t){let A=this._denoiserCache.get(e);if(!A){let a={key:e,references:0},r=this._deviceRevision;a.pending=t().then(n=>{if(r!==this._deviceRevision)throw this._disposeDenoiser(n),this._deviceLossError;return a.value=this._ownDenoiser(n),this._denoiserEntries.set(n,a),n}),this._denoiserCache.set(e,a),A=a}A.references++;try{return A.value??await A.pending}catch(a){throw A.references--,this._denoiserCache.get(e)===A&&this._denoiserCache.delete(e),a}}_ownDenoiser(e){if(this._disposed)throw this._disposeDenoiser(e),new Error("Engine is disposed.");return this._denoisers.add(e),e}_releaseDenoiser(e){let t=this._denoiserEntries.get(e);t&&--t.references>0||(t&&this._denoiserCache.get(t.key)===t&&this._denoiserCache.delete(t.key),this._denoiserEntries.delete(e),this._denoisers.delete(e)&&this._disposeDenoiser(e))}_disposeDenoiser(e){e.kind==="oidn"&&(e.denoiser.auxiliaryDenoisers?.albedo.dispose(),e.denoiser.auxiliaryDenoisers?.normal.dispose()),e.denoiser.dispose()}async _prepareCustomDenoiser(e,t,A){let a=this.device;if(!a)throw new Error("Custom denoising requires WebGPU.");let r=this._customPrepared.get(e);r?.device===a&&r.width===t&&r.height===A||(await e.prepare?.({device:a,width:t,height:A}),this._customPrepared.set(e,{device:a,width:t,height:A}))}_enqueueDenoise(e){let t=this._denoiseTail.then(e);return this._denoiseTail=t.catch(()=>{}),t}};var it=["webgpu","webgl"],Kn={bounces:{key:"bounces",default:3,kind:"image",backends:it},clamping:{key:"clamping",default:0,kind:"image",backends:it},bevel:{key:"bevel",default:!0,kind:"image",backends:it},bevelSamples:{key:"bevelSamples",default:8,kind:"image",backends:it,normalize:ui},dispersionWavelengths:{key:"dispersionWavelengths",default:3,kind:"image",backends:it},directLightCandidates:{key:"directLightCandidates",default:4,kind:"image",backends:["webgpu"],normalize:ea},alphaBlendStrategy:{key:"alphaBlendStrategy",default:"stochastic",kind:"image",backends:["webgpu"]},transmissiveOutputAlphaMin:{key:"transmissiveOutputAlphaMin",default:1,kind:"image",backends:it},samplingPattern:{key:"samplingPattern",default:"sobol",kind:"image",backends:it},maxSamples:{key:"maxSamples",default:2048,kind:"sample-cap",backends:it},timeBudgetMs:{key:"timeBudgetMs",default:21,kind:"execution",backends:it},maxTiles:{key:"maxTiles",default:1/0,kind:"execution",backends:it},allowMultipleSamplesPerFrame:{key:"allowMultipleSamplesPerFrame",default:!1,kind:"execution",backends:it}},RE=[...Object.values(Kn),{key:"resolutionScale",default:1,kind:"resolution",backends:it},{key:"adaptiveResolution",default:!1,kind:"resolution",backends:it},{key:"fallback",default:null,kind:"fallback",backends:it},{key:"denoiser",default:null,kind:"denoiser",backends:it}];function gl(i,e){return Object.fromEntries(Object.values(Kn).map(t=>[t.key,t.key==="maxSamples"?e:"normalize"in t?t.normalize(i[t.key]):i[t.key]]))}function hl(i,e){let t=Object.values(Kn).filter(A=>A.kind==="image");return JSON.stringify({...Object.fromEntries(t.map(A=>[A.key,i[A.key]])),samples:i.samplingPattern==="zsobol"?i.maxSamples:void 0,...e})}var qf,Jf=()=>qf??=import("./chunk-OQCHW2DJ.js");function Bl(i){if(!i||typeof i!="object"||i.type!=="jnlm"&&i.type!=="oidn"&&i.type!=="custom")throw new Error("Denoiser type must be jnlm, oidn or custom.");let e=i.type==="jnlm"?["type","schedule",...Object.keys(Qi)]:i.type==="custom"?["type","schedule","denoiser"]:["type","schedule","model","weightsBaseUrl","weightsUrl","aux","hdr","hdrTransfer","auxiliaryModelUrls","engine","precision","dynamicTile","maxTileSize","signal"];for(let t of Object.keys(i))if(!e.includes(t))throw new Error(`Denoiser field ${t} does not belong to ${i.type}.`);if(i.schedule!==void 0&&!["converged","progressive","every-sample"].includes(i.schedule))throw new Error("Unknown denoise schedule.");if(i.type==="jnlm")Sr(i);else if(i.type==="custom"){if(!i.denoiser||typeof i.denoiser!="object"||typeof i.denoiser.denoise!="function"||i.denoiser.prepare!==void 0&&typeof i.denoiser.prepare!="function")throw new Error("Custom denoiser must implement denoise and optional prepare.")}else{if(i.weightsUrl!==void 0){if(i.model!==void 0||i.weightsBaseUrl!==void 0)throw new Error("weightsUrl is mutually exclusive with model and weightsBaseUrl.")}else if(i.aux!==void 0||i.hdr!==void 0||i.hdrTransfer!==void 0)throw new Error("aux, hdr and hdrTransfer require weightsUrl.");for(let t of["weightsUrl","weightsBaseUrl"])if(i[t]!==void 0&&!Xn(i[t]))throw new Error(`${t} must be a nonempty string or URL.`);if(i.auxiliaryModelUrls!==void 0){let t=i.auxiliaryModelUrls;if(!t||!Xn(t.albedo)||!Xn(t.normal)||Object.keys(t).some(A=>!["albedo","normal"].includes(A)))throw new Error("auxiliaryModelUrls requires only albedo and normal URLs.")}for(let[t,A]of[["engine",["auto","wgsl","webnn"]],["precision",["auto","fp32","fp16"]],["hdrTransfer",["pu","log"]]])if(i[t]!==void 0&&!A.includes(i[t]))throw new Error(`Unknown OIDN ${t}.`);for(let t of["aux","hdr"])if(i[t]!==void 0&&typeof i[t]!="boolean")throw new Error(`${t} must be boolean.`);if(i.dynamicTile!==void 0&&typeof i.dynamicTile!="boolean"){if(!i.dynamicTile||typeof i.dynamicTile!="object")throw new Error("dynamicTile must be boolean or tile settings.");for(let[t,A]of Object.entries(i.dynamicTile))if(!["minTileSize","initialTileSize","targetTileTimeMs","adjustmentStep"].includes(t)||A!==void 0&&(typeof A!="number"||!Number.isFinite(A)||A<=0))throw new Error(`Invalid dynamicTile ${t}.`)}if(i.model!==void 0&&!["standard","small","cleanAuxLarge"].includes(i.model))throw new Error("Unknown OIDN model.");if(i.maxTileSize!==void 0&&(!Number.isInteger(i.maxTileSize)||i.maxTileSize<1))throw new Error("maxTileSize must be a positive integer.")}}function Xn(i){return typeof i=="string"&&i.length>0||i instanceof URL}function Kf(i){if(i.type!=="oidn")return Object.freeze({...i});let e={...i};return i.weightsBaseUrl!==void 0&&(e.weightsBaseUrl=String(i.weightsBaseUrl)),i.weightsUrl!==void 0&&(e.weightsUrl=String(i.weightsUrl)),i.auxiliaryModelUrls!==void 0&&(e.auxiliaryModelUrls=Object.freeze({albedo:String(i.auxiliaryModelUrls.albedo),normal:String(i.auxiliaryModelUrls.normal)})),typeof i.dynamicTile=="object"&&(e.dynamicTile=Object.freeze({...i.dynamicTile})),Object.freeze(e)}function $n(i){if(i.type==="custom")return i.denoiser;if(i.type==="jnlm")return JSON.stringify({type:"jnlm",...Object.fromEntries(Object.entries(Qi).map(([t,A])=>[t,i[t]??A]))});let e=i.dynamicTile;return JSON.stringify({type:"oidn",...i.weightsUrl===void 0?{model:i.model??"standard",weightsBaseUrl:i.weightsBaseUrl?.toString()}:{weightsUrl:String(i.weightsUrl),aux:i.aux??!0,hdr:i.hdr??!0,hdrTransfer:i.hdrTransfer??"pu"},auxiliaryModelUrls:i.auxiliaryModelUrls&&{albedo:String(i.auxiliaryModelUrls.albedo),normal:String(i.auxiliaryModelUrls.normal)},maxTileSize:i.maxTileSize,engine:i.engine??"auto",precision:i.precision??"auto",dynamicTile:e===!1?!1:{minTileSize:typeof e=="object"?e.minTileSize??256:256,initialTileSize:typeof e=="object"?e.initialTileSize??432:432,targetTileTimeMs:typeof e=="object"?e.targetTileTimeMs??16:16,adjustmentStep:typeof e=="object"?e.adjustmentStep??16:16}})}var tA=class{maxSamples=2048;bounces=3;clamping=0;samplingPattern="sobol";directLightCandidates=4;bevel=!0;bevelSamples=8;dispersionWavelengths=3;alphaBlendStrategy="stochastic";transmissiveOutputAlphaMin=1;timeBudgetMs=21;maxTiles=1/0;allowMultipleSamplesPerFrame=!1;adaptiveResolution=!1;_resolutionScale=1;get resolutionScale(){return this._resolutionScale}set resolutionScale(e){if(this._fixed)throw new Error("Fixed-size renders cannot use resolutionScale.");if(!Number.isFinite(e)||e<=0)throw new Error("resolutionScale must be positive.");e!==this._resolutionScale&&this._cancelAdaptiveFrames(),this._resolutionScale=e}_fallback=null;get fallback(){return this._fallback}set fallback(e){if(e&&(e._engine!==this._engine||e===this||e.fallback))throw new Error("Fallback must be a render on the same engine with no fallback.");if(e&&this._dependents.size)throw new Error("Fallback renders cannot have their own fallback.");this._fallback?._dependents.delete(this),this._fallback=e,e?._dependents.add(this)}_dependents=new Set;_denoiserOptions=null;get denoiser(){return this._denoiserOptions}setDenoiser(e){e!==null&&Bl(e);let t=e?Kf(e):null,A=this._denoiserOptions;return A===null&&t===null?this._denoiserReady:t&&A&&$n(t)===$n(A)&&t.schedule===A.schedule&&(t.type!=="oidn"||A.type==="oidn"&&t.signal===A.signal)?this._denoiserReady:(this._denoiserOptions=t,this._refreshDenoiser()??this._denoiserReady)}_denoiserReady=Promise.resolve();_fixed;_target;_status="preparing";_disposed=!1;_busy=!1;_offlineCamera=!1;_input={scene:-1,camera:-1,settings:""};_adaptiveScale=1;_lastScale=1;_frameTime=0;_sampleStart;_frameStart;_sampleScale=1;_frameScale=1;_adaptiveFrames=new Set;_adaptiveFastFrames=0;_events=new Zt;get engine(){return this._engine}get denoising(){return!!this._denoisePending}on(e,t){return this._events.on(e,t)}_filter;_filterKey="";_warnedWebGPUFilter=!1;_denoiseController;_filterRevision=0;_filterPending;_denoiseRevision=0;_denoisePending;_denoisedSamples=0;_lastDenoiseTime=0;_warnedDenoisedReadback=!1;_engine;constructor(e,t={}){if(this._engine=e,t.denoiser!=null&&Bl(t.denoiser),"width"in t||"height"in t){if("resolutionScale"in t||!Number.isInteger(t.width)||!Number.isInteger(t.height)||t.width<1||t.height<1)throw new Error("Provide positive integer width and height, or resolutionScale, exclusively.");this._fixed={width:t.width,height:t.height}}let{width:A,height:a,resolutionScale:r,fallback:n,denoiser:o,...s}=t;Object.assign(this,s),r!==void 0&&(this.resolutionScale=r),this._adaptiveScale=this._resolutionScale,this._lastScale=this._resolutionScale,this._validate(),this.fallback=n??null,e._register(this),o&&this.setDenoiser(o).catch(l=>this._engine._notifyError(l))}get width(){return this._target?.getMemory().width||this._size().width}get height(){return this._target?.getMemory().height||this._size().height}get samples(){return this._current?this._target?.getTotalSamplesRendered()??0:0}get converged(){return this.samples>=this.maxSamples}get status(){return!this._current&&this._status!=="error"?this._engine._ready?"converging":"preparing":this._status}get _current(){let e=this._engine._inputs;return e.scene===this._input.scene&&e.camera===this._input.camera&&!this._disposed}get _complete(){return this._current&&!!this._target?.presentationComplete&&!this._target.isFirstFrame()&&this.samples>0}get _presentable(){return this._complete&&(!this._denoisePending||this._denoisedSamples>0||this._schedule()==="converged"&&this.maxSamples>1)}get _output(){if(this._disposed)throw new Error("Render is disposed.");return this._target}_validate(){if(!Number.isFinite(this.maxSamples)||this.maxSamples<1)throw new Error("maxSamples must be positive.");if(this.dispersionWavelengths!==1&&this.dispersionWavelengths!==3)throw new Error("dispersionWavelengths must be 1 or 3.");let e=this.adaptiveResolution;if(e&&(this._fixed||!Number.isFinite(e.targetFrameMs)||e.targetFrameMs<=0||!Number.isFinite(e.minScale)||e.minScale<=0||e.minScale>this._resolutionScale))throw new Error("adaptiveResolution requires a scale-based render with positive targetFrameMs and minScale <= resolutionScale.")}_size(){if(this._fixed)return this._fixed;let e=this.adaptiveResolution?Math.min(this._adaptiveScale,this._resolutionScale):this._resolutionScale;return{width:Math.max(1,Math.round(this._engine.display.canvas.width*e)),height:Math.max(1,Math.round(this._engine.display.canvas.height*e))}}_settings(e=this.maxSamples){return gl(this,e)}_synchronize(e=this.maxSamples,t=!1){this._validate(),this._lastScale!==this._resolutionScale&&(this._adaptiveScale=this._resolutionScale,this._lastScale=this._resolutionScale);let A=this._target??=this._engine._createTarget();if(!A)return;let a=this._settings(e),r=this._size(),n=hl(a,r),o=this._engine._inputs;return A.configure(a),A.activate(),(!t&&this._offlineCamera||o.scene!==this._input.scene||o.camera!==this._input.camera||n!==this._input.settings)&&(t||(this._offlineCamera=!1),this._cancelDenoise(),A.restartSamples(),this._sampleStart=this._frameStart=void 0,this._frameTime=0,A.setSize(r.width,r.height),this._input={scene:o.scene,camera:o.camera,settings:n}),A.setOnSampleRendered((s,l,c)=>{this._frameTime=Math.max(c,this._sampleStart===void 0?0:performance.now()-this._sampleStart),this._frameStart=this._sampleStart,this._frameScale=this._sampleScale,this._sampleStart=void 0,this._events.emit("sample",{samples:s,isFirstFrame:l,frameTimeMs:c})}),A}_trace(e,t){this._sampleStart===void 0&&(this._sampleStart=performance.now(),this._sampleScale=this._adaptiveScale);let A=e.trace(this._engine._inputs.value,t);return A&&(this._sampleStart=void 0),A}_adaptResolution(){if(!this._busy&&this.adaptiveResolution&&this._frameTime>0&&this.samples>0){let{targetFrameMs:e,minScale:t}=this.adaptiveResolution,A=this._frameStart,a=this._frameTime,r=this._frameScale,n=this._resolutionScale,{width:o,height:s}=this._engine.display.canvas;this._frameTime=0;let l=di(()=>{this._adaptiveFrames.delete(l);let c=this.adaptiveResolution,u=this._engine.display.canvas;if(this._disposed||this._busy||!c||c.targetFrameMs!==e||c.minScale!==t||this._resolutionScale!==n||u.width!==o||u.height!==s)return;let p=Math.max(a,A===void 0?0:performance.now()-A),d=Qo(r,p,e,n,this._adaptiveScale,t);if(d>this._adaptiveScale){if(++this._adaptiveFastFrames<4)return;this._adaptiveScale=Math.min(d,this._adaptiveScale*1.25)}else this._adaptiveScale=d;this._adaptiveFastFrames=0});this._adaptiveFrames.add(l)}}_cancelAdaptiveFrames(){for(let e of this._adaptiveFrames)e();this._adaptiveFrames.clear(),this._adaptiveFastFrames=0}refine(){if(this._busy)throw new Error("Cannot refine a render while converge is running.");if(this._disposed)throw new Error("Render is disposed.");this._engine._setRenderError();try{return this._refine()}catch(e){return this._engine._setRenderError(this._engine._notifyError(e)),this._status="error"}finally{this._engine._reportShaderProgress()}}_refine(){if(this._engine._initializationError)throw this._engine._initializationError;if(this._reloadDenoiser(),!this._engine._ready){let A=this._engine._deviceGeneration;return this._engine.init().catch(a=>{this._disposed||A!==this._engine._deviceGeneration||(this._status="error",this._engine._notifyError(a))}),this._status="preparing"}let e=this._synchronize();if(!e)return this._status="preparing";if(this._fallback&&this.samples===0&&!e.canCompleteSampleWithin(this.timeBudgetMs)&&!this._fallback._complete&&this._fallback._refineOne(),e.activate(),this._denoisePending)return this._status=this.converged?"denoising":"converging";e.setPreserveDenoisedOutput?.(!!this._filter&&this._schedule()!=="converged");let t=this._nextSampleTarget();return this.samples<t&&this._trace(e,t)?this._status="compiling":(this._maybeDenoise(!1,t),this._denoisePending?this._status=this.converged?"denoising":"converging":this._filterPending&&this.converged?this._status="preparing":(this._adaptResolution(),this._status=this.converged?"finished":"converging"))}_refineOne(){if(this._busy||this._disposed||!this._engine._ready)return;this._reloadDenoiser();let e=this._synchronize();e&&(e.activate(),this.samples<1&&(this._status=this._trace(e,1)?"compiling":"converging"),this._maybeDenoise(),this._denoisePending||this._adaptResolution())}_schedule(){return this._denoiserOptions?.schedule??"converged"}_nextSampleTarget(){return this._filter?this._schedule()==="every-sample"?Math.min(this.maxSamples,this.samples+1):this._schedule()==="converged"?this.maxSamples:this._denoisedSamples===0?1:performance.now()-this._lastDenoiseTime>=1e4?Math.min(this.maxSamples,this.samples+1):Math.min(this.maxSamples,Math.max(4,this._denoisedSamples*2)):this.maxSamples}_reloadDenoiser(){this._refreshDenoiser()?.catch(e=>this._engine._notifyError(e))}_refreshDenoiser(){if(this._disposed)return;let e=this._denoiserOptions,t=e?$n(e):"";if(t===this._filterKey)return;this._filterKey=t;let A=++this._filterRevision;if(this._cancelDenoise(),this._filter&&this._filter.kind!=="custom"&&this._engine._releaseDenoiser(this._filter),this._target?.invalidateDenoisedOutput(),this._filter=void 0,this._filterPending=void 0,!e)return this._denoiserReady=Promise.resolve();if(e.type==="jnlm")return this._filter=this._engine._retainDenoiser(`jnlm:${t}`,()=>({kind:"jnlm",denoiser:Sr(e)})),this._denoiserReady=Promise.resolve();let a=(async()=>{if(await this._engine.init(),this._engine.backend!=="webgpu"){A===this._filterRevision&&!this._warnedWebGPUFilter&&(this._warnedWebGPUFilter=!0,console.warn("This denoiser requires WebGPU; denoising is disabled for this render."));return}if(A!==this._filterRevision||this._disposed)return;if(e.type==="custom"){this._filter={kind:"custom",denoiser:e.denoiser};return}let{loadOIDNNetwork:r}=await Jf(),n=await this._engine._acquireDenoiser(t,async()=>({kind:"oidn",denoiser:await r(this._engine,e)}));if(A!==this._filterRevision||this._disposed){this._engine._releaseDenoiser(n);return}this._filter=n,this._warmDenoiser()})();return this._filterPending=a,this._denoiserReady=a.catch(r=>{if(A===this._filterRevision&&!this._disposed)throw r}).finally(()=>{this._filterPending===a&&(this._filterPending=void 0)})}_warmDenoiser(){let e=this._filter,t=this._filterRevision;if(!e||e.kind!=="oidn")return;let A=e.denoiser,a=[A,A.auxiliaryDenoisers?.albedo,A.auxiliaryDenoisers?.normal],r=this.width,n=this.height;this._engine._enqueueDenoise(async()=>{t!==this._filterRevision||e!==this._filter||this._disposed||await Promise.all(a.map(s=>s?.prepareForImage?.(r,n,{tileOverlap:this._schedule()==="converged"?void 0:80})))}).catch(s=>{t===this._filterRevision&&e===this._filter&&!this._disposed&&this._engine._notifyError(s)})}_cancelDenoise(){this._denoiseController?.abort(),this._denoiseController=void 0,this._denoiseRevision++,this._target?.cancelDenoise?.(),this._denoisePending=void 0,this._denoisedSamples=0}_inputsChanged(e=!1){this._cancelDenoise(),e&&this._target?.invalidateTiming?.()}_deviceLost(e){this._cancelAdaptiveFrames(),this._cancelDenoise(),this._filterRevision++,this._filter=void 0,this._filterPending=void 0,this._filterKey="",this._target=void 0,this._input={scene:-1,camera:-1,settings:""},this._status=e?"preparing":"error"}_displayChanged(){this._cancelDenoise(),this._target?.invalidateDenoisedOutput()}_maybeDenoise(e=!1,t=this._nextSampleTarget()){let A=this._target,a=this._filter;if(!A||!a||this._denoisePending||this.samples<1||this._denoisedSamples===this.samples||!e&&this._schedule()==="converged"&&!this.converged||!e&&this._schedule()==="progressive"&&this.samples<t)return;this._engine.display._configure(this),A.activate(),A.drawPostProcess();let r=++this._denoiseRevision,n=this.samples,o=this._frameStart,s=this._denoiseController=new AbortController,l=this._engine._enqueueDenoise(async()=>{if(r!==this._denoiseRevision||this._disposed||(A.activate(),this._engine.display._configure(this),r!==this._denoiseRevision||this._disposed)||(A.drawPostProcess(),a.kind==="custom"&&(await this._engine._prepareCustomDenoiser(a.denoiser,this.width,this.height),s.signal.aborted||r!==this._denoiseRevision||this._disposed)))return;let c=await A.performDenoise?.(a,void 0,this._schedule(),s.signal);r!==this._denoiseRevision||this._disposed||c&&(A.activate(),A.drawPostProcess(),this._denoisedSamples=n,this._lastDenoiseTime=performance.now(),o!==void 0&&(this._frameTime=Math.max(this._frameTime,this._lastDenoiseTime-o)))});this._denoisePending=l,l.catch(c=>{r===this._denoiseRevision&&!this._disposed&&this._engine._notifyError(c)}).finally(()=>{this._denoisePending===l&&(this._denoiseController=void 0,this._denoisePending=void 0,this._status=this.converged?"finished":"converging",this._adaptResolution())})}async readPixels(e="hdr"){if(this._disposed)throw new Error("Render is disposed.");let t=this._target;return t?(e==="denoised"&&this._denoisedSamples===0&&(this._warnedDenoisedReadback||(this._warnedDenoisedReadback=!0,console.warn("Denoised output is not ready; reading HDR samples instead.")),e="hdr"),t.activate(),t.readOutput(e)):{width:0,height:0,data:new Float32Array(0)}}getOutputTexture(e){if(!(!this._complete||this._engine.backend!=="webgpu"))return this._target?.getOutputTexture?.(e)}restart(){if(this._disposed)throw new Error("Render is disposed.");this._cancelDenoise(),this._cancelAdaptiveFrames(),this._sampleStart=this._frameStart=void 0,this._frameTime=0,this._target?.restartSamples(),this._status="converging"}dispose(){if(!this._disposed){this._disposed=!0,this._events.clear(),this._filterRevision++,this._cancelDenoise(),this._cancelAdaptiveFrames(),this._target&&this._engine._releaseTarget(this._target),this._filter&&this._filter.kind!=="custom"&&this._engine._releaseDenoiser(this._filter),this._target=void 0,this._filter=void 0,this._engine._unregister(this),this._fallback?._dependents.delete(this);for(let e of this._dependents)e._fallback=null;this._dependents.clear()}}async converge(e){if(this._busy)throw new Error("Converge is already running on this render.");if(this._disposed)throw new Error("Render is disposed.");let t=this._engine._inputs,A=this._engine._deviceGeneration;if(!t.value)throw new Error("Commit engine.scene and engine.camera with engine.update() before converge.");let a=Ri(e.camera??t.value),r=Math.max(1,Math.round(e.samples));if(!Number.isFinite(r))throw new Error("samples must be finite and positive.");let n=Math.max(1,Math.round(e.samplesPerBatch??8)),o=Math.max(0,Math.round(e.sampleSequenceOffset??0)),s=Math.max(1,e.timeoutMs??6e5),l=()=>{if(this._disposed)throw new Error("Render is disposed.");if(this._engine._deviceGeneration!==A)throw this._engine._lostError;if(e.signal?.aborted)throw e.signal.reason??new DOMException("Convergence aborted","AbortError");let d=this._engine._inputs;if(d.scene!==t.scene||d.camera!==t.camera)throw new Error("Engine inputs changed during converge.")};this._busy=!0;let c=()=>this._cancelDenoise();e.signal?.addEventListener("abort",c,{once:!0});let u,p=performance.now();try{for(await this._engine._awaitDevice(this._engine.init()),l();!this._engine._ready;){if(l(),performance.now()-p>s)throw new Error("Timed out preparing convergence.");await new Promise(m=>setTimeout(m,0))}if(u=this._synchronize(r,!0),this._offlineCamera=!!e.camera,!u)throw new Error("The render target is not ready.");this._cancelDenoise(),u.restartSamples(),this._reloadDenoiser(),await this._engine._awaitDevice(Promise.resolve(this._filterPending)),l();let d=async(m,g,h)=>{l(),this._cancelDenoise(),u.activate(),u.restartSamples(),u.configure({...this._settings(m),allowMultipleSamplesPerFrame:!0});let B=e.targetBatchTimeMs&&this._engine.device?1:Math.min(n,m),_=-1,E=performance.now(),Q=performance.now();for(;;){if(l(),performance.now()-Q>s)throw new Error(`Timed out rendering the offline ${g} pass.`);u.activate(),u.setOfflineRenderOptions({samplesPerBatch:B,deferPostProcess:!0,sampleSequenceOffset:h});let w=u.getTotalSamplesRendered(),x=performance.now();this._status=u.trace(a,m)?"compiling":"converging";let M=u.getTotalSamplesRendered();if(M!==_&&(_=M,e.onProgress?.({stage:g,samples:Math.min(M,m),targetSamples:m}),g==="final"&&e.previewIntervalMs!==void 0&&M>0&&M<m&&performance.now()-E>=e.previewIntervalMs&&(u.drawPostProcess(),E=performance.now())),M>=m)break;if(M>w&&this._engine.device?await this._engine._awaitDevice(this._engine.device.queue.onSubmittedWorkDone()):await new Promise(P=>setTimeout(P,0)),e.targetBatchTimeMs&&this._engine.device&&M>w){let P=Math.max(1,Math.min(n,Math.round(e.targetBatchTimeMs*(M-w)/Math.max(1,performance.now()-x))));B=P>B?Math.min(P,B*2):P}}await this._engine._awaitDevice(Promise.resolve(this._engine.device?.queue.onSubmittedWorkDone())),l()},f={samples:r,averageSamplesPerPixel:r,pilotSamples:0,adaptiveSampling:!1};if(e.adaptiveSampling&&this._engine.device){let m=Math.min(r,Math.max(2,Math.round(e.adaptiveSampling.pilotSamples??8)));u.activate(),u.setVarianceMoments(!0),u.setAdaptiveSamplingTargets(void 0),await d(m,"pilot",o),u.activate();let g=await this._engine._awaitDevice(u.prepareOfflineAdaptiveSampling({...e.adaptiveSampling,maxSamples:r}));g?(u.activate(),u.setVarianceMoments(!1),await d(g.maximumTarget,"final",o+m),f={samples:g.maximumTarget,averageSamplesPerPixel:g.averageTarget,pilotSamples:m,varianceHistory:g.history,adaptiveSampling:!0}):(u.setVarianceMoments(!1),u.setAdaptiveSamplingTargets(void 0),await d(r,"final",o))}else u.activate(),u.setVarianceMoments(!1),u.setAdaptiveSamplingTargets(void 0),await d(r,"final",o);return this._filter&&(e.onProgress?.({stage:"denoising",samples:f.samples,targetSamples:f.samples}),this._status="denoising",this._maybeDenoise(!0),await this._engine._awaitDevice(Promise.resolve(this._denoisePending)),l()),this._status="finished",f}catch(d){throw this._engine._deviceGeneration===A&&(this._status="error"),d}finally{u&&!this._disposed&&this._engine._deviceGeneration===A&&(u.activate(),u.setVarianceMoments(!1),u.setAdaptiveSamplingTargets(void 0),u.setOfflineRenderOptions({samplesPerBatch:0,deferPostProcess:!1,sampleSequenceOffset:0})),e.signal?.removeEventListener("abort",c),this._busy=!1}}};function vl(i,e,t,A,a){let r=t?-1/0:e&&i.previousChanged?A:i.lastContinuousChange;return{previousChanged:e&&!t,lastContinuousChange:r,changing:t||A-r<Math.max(0,a)}}function Zn(i,e){return JSON.stringify([i.samples,i.width,i.height,i.maxSamples,i.bounces,i.clamping,i.samplingPattern,i.directLightCandidates,i.bevel,i.bevelSamples,i.dispersionWavelengths,i.alphaBlendStrategy,i.transmissiveOutputAlphaMin,i.resolutionScale,i.adaptiveResolution,i.denoiser,i.denoising,e.canvas.width,e.canvas.height,e.toneMapping,e.toneMappingExposure,e.contrast,e.saturation,e.temperature,e.tint,e.vignette,e.bloomIntensity,e.bloomThreshold,e.bloomRadius,e.hdrOutputEnabled,e.channel,e.shadowCatcherColor,e.shadowCatcherAlpha])}var Mr=class{engine;preview;final;display;select=({changing:e})=>e?"preview":"final";idleMs;coalesceSceneUpdates;_changing=!1;_status="preparing";_events=new Zt;_syncs=new Set;_owned=new Set;_policy={previousChanged:!1,lastContinuousChange:-1/0,changing:!1};_running=!1;_busy=!1;_disposed=!1;_cancelScheduled;_warnedTick=!1;_previewFrameOwner;_presented;_finishedImage;_unsubscribe;constructor(e,t={}){this.engine=e;let A=t.sync?Array.isArray(t.sync)?t.sync:[t.sync]:[];for(let a of A)this._checkEngine(a.engine);for(let a of[t.preview,t.final])a instanceof tA&&this._checkEngine(a.engine);this.display=t.display??e.display,this.idleMs=t.idleMs??150,this.coalesceSceneUpdates=t.coalesceSceneUpdates??!1;try{t.preview!==!1&&(this.preview=this._render(t.preview,{resolutionScale:.5,timeBudgetMs:80,adaptiveResolution:{targetFrameMs:80,minScale:.125},bounces:2,bevel:!1,dispersionWavelengths:1,directLightCandidates:2})),this.final=this._render(t.final,{fallback:this.preview??null})}catch(a){for(let r of this._owned)r.dispose();throw a}for(let a of A)this.addSync(a);this._unsubscribe=this.final.on("sample",a=>this._events.emit("sample",{...a,preview:!1})),typeof document<"u"&&document.addEventListener("visibilitychange",this._visibility)}_render(e,t){if(e instanceof tA)return e;let A={...t,...e};e&&"width"in e&&("resolutionScale"in e||delete A.resolutionScale,"adaptiveResolution"in e||delete A.adaptiveResolution);let a=new tA(this.engine,A);return this._owned.add(a),a}_checkEngine(e){if(e!==this.engine)throw new Error("RenderLoop renders and syncs must belong to the same engine.")}_assertAlive(){if(this._disposed)throw new Error("RenderLoop is disposed.")}get changing(){return this._changing}get samples(){return this.status==="previewing"?0:this.final.samples}get status(){return this._status}on(e,t){return this._events.on(e,t)}addSync(e){this._assertAlive(),this._checkEngine(e.engine),this._syncs.add(e)}removeSync(e){this._syncs.delete(e)}_setStatus(e){if(e!==this._status){let t=this._status;this._status=e,this._events.emit("status",{status:e,previous:t})}return e}_present(e){let t=this.display.present(e);return t&&(this._presented=t),t}tick(){return this._assertAlive(),this._running?(this._warnedTick||(this._warnedTick=!0,console.warn("RenderLoop.tick() is ignored while start() is active.")),this.status):this._tick()}_tick(){if(this._busy||typeof document<"u"&&document.hidden)return this.status;for(let f of this._syncs)f.update();let e=this._previewFrameOwner,t=!!e&&(e===this.preview||!e._complete),A=t&&this.preview?.status==="converging"&&this.preview.samples===0,a=A||this.coalesceSceneUpdates&&t&&!!this.preview?.denoising;t&&!a&&this.preview&&this._present(this.preview),a||(this._previewFrameOwner=void 0);let r=a?!1:this.engine.update(),n=[...this._syncs].some(f=>f.active);this._policy=vl(this._policy,r,n,performance.now(),this.idleMs),this._changing=this._policy.changing;let o=this.select({changing:this.changing});if(a&&this.preview){if(A){if(this.preview.refine()==="error")return this._previewFrameOwner=void 0,this._setStatus("error");(!this.coalesceSceneUpdates||!this.preview.denoising)&&this._present(this.preview)&&(this._previewFrameOwner=void 0)}return this._setStatus("previewing")}let s=o==="preview"&&this.preview?this.preview:this.final,l=Zn(this.final,this.display);if(!r&&!this.changing&&s===this.final&&this.status==="finished"&&this.final.status==="finished"&&l===this._finishedImage)return this.status;this.status==="finished"&&l!==this._finishedImage&&this.final.samples>0&&this._present(this.final);let c=s.refine(),u=!!this.preview&&(s===this.preview&&c==="converging"&&s.samples===0||this.coalesceSceneUpdates&&this.preview.denoising)&&(s===this.preview||!s._complete&&s.fallback===this.preview);u?this._previewFrameOwner=s:this._present(s);let p=u||s===this.preview&&s.denoising||!!this.preview&&this._presented===this.preview,d=c==="error"?"error":p?"previewing":c;return this._finishedImage=d==="finished"?Zn(this.final,this.display):void 0,this._setStatus(d)}_schedule(){!this._running||this._busy||this._cancelScheduled!==void 0||typeof document<"u"&&document.hidden||(this._cancelScheduled=di(()=>{this._cancelScheduled=void 0;try{this._tick()}finally{this._schedule()}}))}_visibility=()=>{document.hidden?this._cancelFrame():this._schedule()};_cancelFrame(){this._cancelScheduled?.(),this._cancelScheduled=void 0}start(){this._assertAlive(),this._running=!0,this._schedule()}stop(){this._running=!1,this._cancelFrame()}async converge(e){if(this._assertAlive(),this._busy)throw new Error("RenderLoop convergence is already running.");this._busy=!0,this._previewFrameOwner=void 0,this._cancelFrame();try{for(let A of this._syncs)A.update();this.engine.update(),this._setStatus("preparing");let t=await this.final.converge({...e,onProgress:A=>{this._setStatus(A.stage==="denoising"?"denoising":this.final.status),e.onProgress?.(A)}});return this._present(this.final),this._setStatus("finished"),t}catch(t){throw this._setStatus("error"),t}finally{this._busy=!1,this._schedule()}}dispose(){if(!this._disposed){this.stop(),this._disposed=!0,this._unsubscribe(),this._events.clear(),this._syncs.clear(),typeof document<"u"&&document.removeEventListener("visibilitychange",this._visibility);for(let e of this._owned)e.dispose();this._owned.clear()}}};export{UA as AmbientLight,sA as Camera,Qi as DEFAULT_JNLM_OPTIONS,LA as DirectionalLight,VA as Display,yr as Engine,zA as EnvironmentLight,Ge as Geometry,z as GeometryAttribute,tt as IESParseError,cA as IESProfile,ie as InstancedMesh,Dr as Mesh,lA as OpenPBRMaterial,OA as RectLight,tA as Render,Mr as RenderLoop,mt as SceneNode,FA as SphereLight,NA as SpotLight,GA as Sync,jr as THREESync,He as Texture,Ll as VERSION,cc as computeMeshesBoundingBox,oc as createCubeGeometry,lc as createCurvePlaneGeometry,sc as createPlaneGeometry,nc as createSphereGeometry,Es as fromTHREECamera,rc as fromTHREEScene,wi as generateVertexNormals,ca as generateVertexTangents,tn as getRecommendedDeviceDescriptor,Vl as loadRGBE,zl as parseIESProfile,us as parseRGBE};
