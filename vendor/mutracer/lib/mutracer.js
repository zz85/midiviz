import{a as Br,b as oe,c as le,d as S,e as Q,f as Je,g as xs,h as J,i as wt,j as Pl,k as _A,l as bs,m as ha,n as $,p as Er,q as xA,r as Qi,s as Hi,t as wr,u as bA,v as yA,w as _r}from"./chunk-IYIKX5A4.js";import{b as yd}from"./chunk-EAEMA2E5.js";var ga=Object.freeze({strength:1,searchRadius:5,patchRadius:1,albedoBandwidth:.4,normalBandwidth:.05,iterations:2}),Wi={searchRadius:5,patchRadius:1,albedoBandwidth:.4,normalBandwidth:.05,iterations:2};function ys(i={}){let e={...ga};for(let a of Object.keys(e)){let r=i[a];r!==void 0&&(e[a]=r)}if(!Number.isFinite(e.strength)||e.strength<=0)throw new Error("strength must be finite and positive");for(let[a,r,n]of[["searchRadius",1,16],["patchRadius",0,3],["iterations",1,4]])if(!Number.isInteger(e[a])||e[a]<r||e[a]>n)throw new Error(`${a} must be an integer from ${r} to ${n}`);for(let a of["albedoBandwidth","normalBandwidth"])if(!Number.isFinite(e[a])||e[a]<1e-4||e[a]>10)throw new Error(`${a} must be finite and from 0.0001 to 10`);let{strength:t,...A}=e;return{type:"jnlm",strength:t,shape:A,dispose(){}}}function xr(i){return 2**i}var At=class{name="";transform=oe.create();get position(){return[Q(this.transform,12),Q(this.transform,13),Q(this.transform,14)]}set position(e){Je(this.transform,12,Q(e,0)),Je(this.transform,13,Q(e,1)),Je(this.transform,14,Q(e,2))}lookAt(e,t=[0,1,0]){let A=oe.getScaling(new Float32Array(3),this.transform),a=this.position,r=[Q(e,0)-Q(a,0),Q(e,1)-Q(a,1),Q(e,2)-Q(a,2)],n=[r[1]*Q(t,2)-r[2]*Q(t,1),r[2]*Q(t,0)-r[0]*Q(t,2),r[0]*Q(t,1)-r[1]*Q(t,0)],s=Math.hypot(...n)>1e-8?t:Math.abs(r[2])<Math.hypot(...r)*.99?[0,0,-1]:[1,0,0];return oe.targetTo(this.transform,a,e,s),oe.scale(this.transform,this.transform,A),this}};var Yi=class i extends At{projection="perspective";fStop=0;focusDistance=10;sensorHeight=24;metersPerUnit=1;fov=45;near;far;aspect=void 0;left=-1;right=1;top=1;bottom=-1;zoom=1;constructor(e){super(),this.projection=e.projection,this.near=e.near??.1,this.far=e.far??2e3,e.projection==="perspective"?(this.fov=e.fov??45,this.aspect=e.aspect):(this.left=e.left??-1,this.right=e.right??1,this.bottom=e.bottom??-1,this.top=e.top??1)}copy(e){let t=this;return t.projection=e.projection,t.fov=e.fov,t.near=e.near,t.far=e.far,t.aspect=e.aspect,t.zoom=e.zoom,t.fStop=e.fStop,t.focusDistance=e.focusDistance,t.sensorHeight=e.sensorHeight,t.metersPerUnit=e.metersPerUnit,t.left=e.left,t.right=e.right,t.top=e.top,t.bottom=e.bottom,oe.copy(t.transform,e.transform),this}clone(){return(this.projection==="perspective"?new i({projection:"perspective"}):new i({projection:"orthographic"})).copy(this)}getProjectionMatrix(e=1){let t=this,A=[];if(t.projection==="perspective"){let a=t.fov*Math.PI/180,r=2*Math.atan(Math.tan(a/2)/Math.max(t.zoom,Number.EPSILON));return oe.perspective(A,r,t.aspect??e,t.near,t.far)}return oe.ortho(A,(t.left+t.right)/2-(t.right-t.left)/(2*t.zoom),(t.left+t.right)/2+(t.right-t.left)/(2*t.zoom),(t.bottom+t.top)/2-(t.top-t.bottom)/(2*t.zoom),(t.bottom+t.top)/2+(t.top-t.bottom)/(2*t.zoom),t.near,t.far)}};var Xt=["depth","position","roughness","diffuseAlbedo","specularAlbedo","id","motion"];var MA={accumulatedBytes:64,centerBytes:32,depthRoughness:0,position:4,diffuseAlbedo:8,specularAlbedo:12,id:0,motion:4},Dl=0;function br(){if(Dl>=4294967295)throw new RangeError("AOV ID space exhausted");return Dl++}function fi(i){if(!Number.isInteger(i)||i<0||i>=4294967295)throw new RangeError("AOV ID must be uint32 excluding 0xFFFFFFFF");return i}function je(i){let e=0;for(let t of i){let A=Xt.indexOf(t);if(A<0)throw new RangeError(`Unknown AOV: ${t}`);e|=1<<A}return e}var CA=class{frame;instances=new Map;clear(){this.frame=void 0,this.instances.clear()}previous(e){let t=this.frame;return t&&t.width===e.width&&t.height===e.height&&t.projection===e.projection?t:void 0}match(e,t){let A=this.previous(e)?this.instances.get(`${t.object}:${t.instance}`):void 0;return A&&A.topology===t.topology&&A.vertices===t.vertices?A:void 0}accept(e){this.frame={...e,cameraEye:e.cameraEye?.slice(),cameraForward:e.cameraForward?.slice(),viewProjection:e.viewProjection.slice(),instances:e.instances.map(t=>({...t,transform:t.transform.slice()}))},this.instances.clear();for(let t of this.frame.instances)this.instances.set(`${t.object}:${t.instance}`,t)}};var Cs=new WeakMap,ji=class extends At{get aovId(){return Cs.get(this)}set aovId(e){Cs.set(this,fi(e))}materials;geometry;_instances;get instanceData(){let e=this._instances;return e?{count:e.count,transforms:e.transforms,colors:e.colors,transformsVersion:e.transformsVersion,colorsVersion:e.colorsVersion}:void 0}get instanceState(){return this._instances}setInstanceState(e){this._instances=e}constructor(e,t){super(),Cs.set(this,br()),this.geometry=e,this.materials=Array.isArray(t)?t:[t]}};var Ii=class extends ji{constructor(e,t){super(e,t)}};var be=class extends Ii{get instanceData(){return this}transforms;count;colors;get version(){return this._version}_version=0;_transformVersion=0;_colorVersion=0;get transformsVersion(){return this._transformVersion}get colorsVersion(){return this._colorVersion}constructor(e,t,A){if(super(e,t),this.count=A.count,this.transforms=A.transforms??new Float32Array(this.count*16),this.colors=A.colors,this.validate(),!A.transforms)for(let a=0;a<this.count;a++){let r=a*16;this.transforms[r]=this.transforms[r+5]=this.transforms[r+10]=this.transforms[r+15]=1}}markUpdated(){return this.validate(),this._transformVersion++,this._colorVersion++,this._version++,this}markTransformsUpdated(e=0,t=this.count-e){if(this.validate(),!Number.isInteger(e)||!Number.isInteger(t)||e<0||t<0||e+t>this.count)throw new RangeError("Instance transform range must fit the active count.");return this._transformVersion++,this._version++,this}markColorsUpdated(e=0,t=this.count-e){if(this.validate(),!Number.isInteger(e)||!Number.isInteger(t)||e<0||t<0||e+t>this.count)throw new RangeError("Instance color range must fit the active count.");return this._colorVersion++,this._version++,this}validate(){if(!Number.isInteger(this.count)||this.count<0||!(this.transforms instanceof Float32Array)||this.transforms.length<this.count*16)throw new RangeError("InstancedMesh requires a nonnegative count and at least 16 * count Float32 transforms.");if(this.colors!==void 0&&(!(this.colors instanceof Float32Array)||this.colors.length<this.count*3))throw new RangeError("InstancedMesh colors must contain at least 3 * count Float32 values.")}};function Vi(i){if(!i.vertexCount)return;let e=xs(i.indices.array),t=i.position.array,A=new Float32Array(t.length);i.normal=new X(A,3);let a=S.create(),r=S.create(),n=S.create(),s=S.create(),o=S.create(),l=S.create(),c=e?wt(e):i.vertexCount,f,m,d;for(let u=0;u<c;){e?(f=J(e,u++),m=J(e,u++),d=J(e,u++)):(f=u++,m=u++,d=u++),S.set(a,t[f*3],t[f*3+1],t[f*3+2]),S.set(r,t[m*3],t[m*3+1],t[m*3+2]),S.set(n,t[d*3],t[d*3+1],t[d*3+2]),S.sub(s,a,r),S.sub(o,r,n),S.cross(l,s,o);for(let p=0;p<3;p++)A[f*3+p]=A[f*3+p]+l[p],A[m*3+p]=A[m*3+p]+l[p],A[d*3+p]=A[d*3+p]+l[p]}for(let u=0;u<A.length;)S.set(l,A[u],A[u+1],A[u+2]),S.normalize(l,l),A[u++]=l[0],A[u++]=l[1],A[u++]=l[2]}var Ms=new WeakSet;function yr(i){return!!i.tangent&&Ms.has(i.tangent)}function Cr(i){if(!i.position||!i.uv||!i.normal)return;let e=i.vertexCount;if(!e)return;let t=new Float32Array(e*3);Ul(i,new Float32Array(e*3),t),i.tangent=new X(t,3),Ms.add(i.tangent)}var Tl=new WeakMap;function Rl(i){if(!i.position||!i.uv||!i.normal)return;let e=i.vertexCount;if(!e)return;let t=Tl.get(i);t?.length!==e*3&&(t=new Float32Array(e*3),Tl.set(i,t)),i.tangent?.array.length!==e*3&&(i.tangent=new X(new Float32Array(e*3),3)),Ul(i,t,i.tangent.array),Ms.add(i.tangent)}function Ul(i,e,t){let A=i.uv?.array,a=i.normal?.array,r=i.position?.array;if(!A||!a||!r||!i.vertexCount)return;let n=i.vertexCount;e.fill(0);let s=xs(i.indices.array),o=s?wt(s):n;for(let l=0;l+2<o;l+=3){let c=s?J(s,l):l,f=s?J(s,l+1):l+1,m=s?J(s,l+2):l+2,d=r[f*3]-r[c*3],u=r[f*3+1]-r[c*3+1],p=r[f*3+2]-r[c*3+2],g=r[m*3]-r[c*3],v=r[m*3+1]-r[c*3+1],h=r[m*3+2]-r[c*3+2],B=A[f*2]-A[c*2],E=A[f*2+1]-A[c*2+1],x=A[m*2]-A[c*2],y=A[m*2+1]-A[c*2+1],M=B*y-x*E;if(Math.abs(M)<1e-12)continue;let b=1/M,T=(d*y-g*E)*b,O=(u*y-v*E)*b,R=(p*y-h*E)*b;for(let D=0;D<3;D++){let L=D===0?c:D===1?f:m;e[L*3]+=T,e[L*3+1]+=O,e[L*3+2]+=R}}for(let l=0;l<n;l++){let c=l*3,f=a[c],m=a[c+1],d=a[c+2],u=e[c]*f+e[c+1]*m+e[c+2]*d,p=e[c]-f*u,g=e[c+1]-m*u,v=e[c+2]-d*u,h=Math.hypot(p,g,v);h>1e-8?(p/=h,g/=h,v/=h):p=g=v=0,t[c]=p,t[c+1]=g,t[c+2]=v}}function va(i){let e=i.position.array,t=i.boundingBox.min,A=i.boundingBox.max;if(e&&e.length){S.set(t,e[0],e[1],e[2]),S.set(A,e[0],e[1],e[2]);for(let a=3;a<e.length;){let r=e[a++],n=e[a++],s=e[a++];r<Q(t,0)&&Je(t,0,r),n<Q(t,1)&&Je(t,1,n),s<Q(t,2)&&Je(t,2,s),r>Q(A,0)&&Je(A,0,r),n>Q(A,1)&&Je(A,1,n),s>Q(A,2)&&Je(A,2,s)}}}var X=class{array;itemSize;constructor(e,t){this.array=e,this.itemSize=t}static getItem(e,t,A){let a=e.array,r=e.itemSize,n=A*r;for(let s=0;s<r;s++)t[s]=J(a,n+s)}static getCount(e){return wt(e.array)/e.itemSize}};function Cd(i){let e=new Uint32Array(i);for(let t=0;t<e.length;t++)e[t]=t;return new X(e,1)}var Ge=class{version=0;_topologyVersion=0;get topologyVersion(){return this._topologyVersion}dynamic=!1;position;normal;tangent;uv;uv1;color;indices;_indexSource;_indexVersion=-1;_indices32=new Uint32Array(0);get indexArray(){let e=this.indices.array;return e instanceof Uint32Array?(this._indexSource&&(this._indexSource=void 0,this._indices32=new Uint32Array(0),this._indexVersion=-1),e):((this._indexSource!==e||this._indexVersion!==this.topologyVersion||this._indices32.length!==e.length)&&(this._indices32=new Uint32Array(e),this._indexSource=e,this._indexVersion=this.topologyVersion),this._indices32)}materialIndex;boundingBox={min:S.create(),max:S.create()};constructor(e){this.position=e.position,this.indices=e.indices??Cd(this.vertexCount),this.normal=e.normal??new X(new Float32Array(this.vertexCount*3),3),e.normal||Vi(this),this.tangent=e.tangent,this.uv=e.uv,this.uv1=e.uv1,this.color=e.color,this.materialIndex=e.materialIndex}markUpdated(){return this._topologyVersion++,this.version++,this}markVerticesUpdated(){return this.version++,this}get vertexCount(){return this.position.array.length/this.position.itemSize}get triangleCount(){return wt(this.indices.array)/3}};function QA(i){if(i==="openpbr")return 0;if(i==="gltf")return 1;throw new Error(`Invalid specularAnisotropyModel: ${String(i)}. Expected openpbr or gltf.`)}function Qs(i,e){return Number.isFinite(i)?Math.min(1,Math.max(0,i)):e}var Md=["r","g","b","a"];function IA(i){let e=Md.indexOf(i);if(e<0)throw new Error(`Invalid thinFilmMapChannel: ${String(i)}; expected r, g, b or a`);return e}function Is(i,e){return Number.isFinite(i)?Math.max(0,i):e}var Ll={specularRoughnessAnisotropy:"specularAnisotropy",coatRoughnessAnisotropy:"coatAnisotropy",subsurfaceScatterAnisotropy:"subsurfaceAnisotropy",geometryOpacity:"opacity",geometryThinWalled:"thinWalled"};function Ds(i){let e={...i};for(let t of Object.keys(Ll)){let A=Ll[t];if(i[t]!==void 0){if(i[A]!==void 0&&i[A]!==i[t])throw new Error(`Conflicting OpenPBR material parameters: ${t} and ${A}`);Object.assign(e,{[A]:i[t]}),delete e[t]}}return e}var Ts=[{key:"baseWeight",type:"float",default:1,category:"param"},{key:"baseColor",type:"color",default:[.8,.8,.8],category:"param"},{key:"baseDiffuseRoughness",type:"float",default:0,category:"param"},{key:"baseMetalness",type:"float",default:0,category:"param"},{key:"specularWeight",type:"float",default:1,category:"param"},{key:"specularColor",type:"color",default:[1,1,1],category:"param"},{key:"specularRoughness",type:"float",default:.3,category:"param"},{key:"specularIor",type:"float",default:1.5,category:"param"},{key:"specularAnisotropy",type:"float",default:0,category:"param"},{key:"transmissionWeight",type:"float",default:0,category:"param"},{key:"transmissionColor",type:"color",default:[1,1,1],category:"param"},{key:"transmissionDepth",type:"float",default:0,category:"param"},{key:"transmissionScatter",type:"color",default:[0,0,0],category:"param"},{key:"transmissionScatterAnisotropy",type:"float",default:0,category:"param"},{key:"transmissionDispersionScale",type:"float",default:0,category:"param"},{key:"transmissionDispersionAbbeNumber",type:"float",default:20,category:"param"},{key:"subsurfaceWeight",type:"float",default:0,category:"param"},{key:"subsurfaceColor",type:"color",default:[.8,.8,.8],category:"param"},{key:"subsurfaceRadius",type:"float",default:1,category:"param"},{key:"subsurfaceRadiusScale",type:"color",default:[1,.5,.25],category:"param"},{key:"subsurfaceAnisotropy",type:"float",default:0,category:"param"},{key:"fuzzWeight",type:"float",default:0,category:"param"},{key:"fuzzColor",type:"color",default:[1,1,1],category:"param"},{key:"fuzzRoughness",type:"float",default:.5,category:"param"},{key:"coatWeight",type:"float",default:0,category:"param"},{key:"coatColor",type:"color",default:[1,1,1],category:"param"},{key:"coatRoughness",type:"float",default:0,category:"param"},{key:"coatAnisotropy",type:"float",default:0,category:"param"},{key:"coatIor",type:"float",default:1.6,category:"param"},{key:"coatDarkening",type:"float",default:1,category:"param"},{key:"thinFilmWeight",type:"float",default:0,category:"param"},{key:"thinFilmThickness",type:"float",default:.5,category:"param"},{key:"thinFilmIor",type:"float",default:1.4,category:"param"},{key:"emissionColor",type:"color",default:[1,1,1],category:"param"},{key:"emissionLuminance",type:"float",default:0,category:"param"},{key:"opacity",type:"float",default:1,category:"param"},{key:"thinWalled",type:"bool",default:!1,category:"param"},{key:"doubleSided",type:"bool",default:!1,category:"param"},{key:"map",type:"texture",default:void 0,category:"texture"},{key:"alphaMap",type:"texture",default:void 0,category:"texture"},{key:"alphaMode",type:"enum",default:"auto",category:"param"},{key:"alphaCutoff",type:"float",default:0,category:"param"},{key:"emissiveMap",type:"texture",default:void 0,category:"texture"},{key:"normalMap",type:"texture",default:void 0,category:"texture"},{key:"normalScale",type:"vec2",default:[1,1],category:"param"},{key:"metallicRoughnessMap",type:"texture",default:void 0,category:"texture"},{key:"roughnessMap",type:"texture",default:void 0,category:"texture"},{key:"metalnessMap",type:"texture",default:void 0,category:"texture"},{key:"transmissionMap",type:"texture",default:void 0,category:"texture"},{key:"thinFilmMap",type:"texture",default:void 0,category:"texture"},{key:"shadowCatcher",type:"bool",default:!1,category:"param"},{key:"unlit",type:"bool",default:!1,category:"param"},{key:"bevelSize",type:"float",default:0,category:"param"},{key:"mapAlphaUsage",type:"enum",default:"opaque",category:"param"},{key:"uvProjection",type:"enum",default:"none",category:"param"},{key:"uvProjectionScale",type:"vec2",default:[1,1],category:"param"},{key:"displacementUvProjection",type:"enum",default:"none",category:"geometry"},{key:"displacementUvProjectionScale",type:"float",default:1,category:"geometry"},{key:"displacementMap",type:"texture",default:void 0,category:"texture"},{key:"displacementScale",type:"float",default:.1,category:"geometry"},{key:"displacementStepSize",type:"float",default:0,category:"geometry"},{key:"thinFilmThicknessMinimum",type:"float",default:0,category:"param"},{key:"thinFilmMapChannel",type:"enum",default:"r",category:"param"},{key:"coatWeightMap",type:"texture",default:void 0,category:"texture"},{key:"coatRoughnessMap",type:"texture",default:void 0,category:"texture"},{key:"fuzzColorMap",type:"texture",default:void 0,category:"texture"},{key:"fuzzRoughnessMap",type:"texture",default:void 0,category:"texture"},{key:"specularWeightMap",type:"texture",default:void 0,category:"texture"},{key:"specularColorMap",type:"texture",default:void 0,category:"texture"},{key:"anisotropyMap",type:"texture",default:void 0,category:"texture"},{key:"specularAnisotropyRotation",type:"float",default:0,category:"param"},{key:"coatAnisotropyRotation",type:"float",default:0,category:"param"},{key:"specularAnisotropyModel",type:"enum",default:"openpbr",category:"param"},{key:"coatNormalMap",type:"texture",default:void 0,category:"texture"},{key:"coatNormalScale",type:"vec2",default:[1,1],category:"param"},{key:"displacementBias",type:"float",default:0,category:"geometry"}];var Mr=["baseWeight","baseColor","baseDiffuseRoughness","baseMetalness","specularWeight","specularColor","specularRoughness","specularIor","specularAnisotropy","transmissionWeight","transmissionColor","transmissionDepth","transmissionScatter","transmissionScatterAnisotropy","transmissionDispersionScale","transmissionDispersionAbbeNumber","subsurfaceWeight","subsurfaceColor","subsurfaceRadius","subsurfaceRadiusScale","subsurfaceAnisotropy","fuzzWeight","fuzzColor","fuzzRoughness","coatWeight","coatColor","coatRoughness","coatAnisotropy","coatIor","coatDarkening","thinFilmWeight","thinFilmThickness","thinFilmIor","emissionColor","emissionLuminance","opacity","thinWalled","doubleSided","map","alphaMap","alphaMode","alphaCutoff","emissiveMap","normalMap","normalScale","metallicRoughnessMap","roughnessMap","metalnessMap","transmissionMap","thinFilmMap","shadowCatcher","unlit","bevelSize","mapAlphaUsage","uvProjection","uvProjectionScale","displacementUvProjection","displacementUvProjectionScale","displacementMap","displacementScale","displacementStepSize","thinFilmThicknessMinimum","thinFilmMapChannel","coatWeightMap","coatRoughnessMap","fuzzColorMap","fuzzRoughnessMap","specularWeightMap","specularColorMap","anisotropyMap","specularAnisotropyRotation","coatAnisotropyRotation","specularAnisotropyModel","coatNormalMap","coatNormalScale","displacementBias"],Ba=["map","alphaMap","emissiveMap","normalMap","metallicRoughnessMap","roughnessMap","metalnessMap","transmissionMap","thinFilmMap","displacementMap","coatWeightMap","coatRoughnessMap","fuzzColorMap","fuzzRoughnessMap","specularWeightMap","specularColorMap","anisotropyMap","coatNormalMap"],Rs=["displacementUvProjection","displacementUvProjectionScale","displacementScale","displacementStepSize","displacementBias"],Us=["baseWeight","baseColor","baseDiffuseRoughness","baseMetalness","specularWeight","specularColor","specularRoughness","specularIor","specularAnisotropy","transmissionWeight","transmissionColor","transmissionDepth","transmissionScatter","transmissionScatterAnisotropy","transmissionDispersionScale","transmissionDispersionAbbeNumber","subsurfaceWeight","subsurfaceColor","subsurfaceRadius","subsurfaceRadiusScale","subsurfaceAnisotropy","fuzzWeight","fuzzColor","fuzzRoughness","coatWeight","coatColor","coatRoughness","coatAnisotropy","coatIor","coatDarkening","thinFilmWeight","thinFilmThickness","thinFilmIor","emissionColor","emissionLuminance","opacity","thinWalled","doubleSided","alphaMode","alphaCutoff","normalScale","shadowCatcher","unlit","bevelSize","mapAlphaUsage","uvProjection","uvProjectionScale","thinFilmThicknessMinimum","thinFilmMapChannel","specularAnisotropyRotation","coatAnisotropyRotation","specularAnisotropyModel","coatNormalScale"],Ol=new Map;for(let i of Ts)Ol.set(i.key,i.default);function Z(i){let e=Ol.get(i);return Array.isArray(e)?e.slice():e}function Fl(i,e){let t=Ds(e);t.thinFilmMapChannel!==void 0&&IA(t.thinFilmMapChannel),t.specularAnisotropyModel!==void 0&&QA(t.specularAnisotropyModel),t.baseWeight!==void 0&&(i.baseWeight=t.baseWeight),t.baseColor!==void 0&&(i.baseColor=t.baseColor),t.baseDiffuseRoughness!==void 0&&(i.baseDiffuseRoughness=t.baseDiffuseRoughness),t.baseMetalness!==void 0&&(i.baseMetalness=t.baseMetalness),t.specularWeight!==void 0&&(i.specularWeight=t.specularWeight),t.specularColor!==void 0&&(i.specularColor=t.specularColor),t.specularRoughness!==void 0&&(i.specularRoughness=t.specularRoughness),t.specularIor!==void 0&&(i.specularIor=t.specularIor),t.specularAnisotropy!==void 0&&(i.specularAnisotropy=t.specularAnisotropy),t.transmissionWeight!==void 0&&(i.transmissionWeight=t.transmissionWeight),t.transmissionColor!==void 0&&(i.transmissionColor=t.transmissionColor),t.transmissionDepth!==void 0&&(i.transmissionDepth=t.transmissionDepth),t.transmissionScatter!==void 0&&(i.transmissionScatter=t.transmissionScatter),t.transmissionScatterAnisotropy!==void 0&&(i.transmissionScatterAnisotropy=t.transmissionScatterAnisotropy),t.transmissionDispersionScale!==void 0&&(i.transmissionDispersionScale=t.transmissionDispersionScale),t.transmissionDispersionAbbeNumber!==void 0&&(i.transmissionDispersionAbbeNumber=t.transmissionDispersionAbbeNumber),t.subsurfaceWeight!==void 0&&(i.subsurfaceWeight=t.subsurfaceWeight),t.subsurfaceColor!==void 0&&(i.subsurfaceColor=t.subsurfaceColor),t.subsurfaceRadius!==void 0&&(i.subsurfaceRadius=t.subsurfaceRadius),t.subsurfaceRadiusScale!==void 0&&(i.subsurfaceRadiusScale=t.subsurfaceRadiusScale),t.subsurfaceAnisotropy!==void 0&&(i.subsurfaceAnisotropy=t.subsurfaceAnisotropy),t.fuzzWeight!==void 0&&(i.fuzzWeight=t.fuzzWeight),t.fuzzColor!==void 0&&(i.fuzzColor=t.fuzzColor),t.fuzzRoughness!==void 0&&(i.fuzzRoughness=t.fuzzRoughness),t.coatWeight!==void 0&&(i.coatWeight=t.coatWeight),t.coatColor!==void 0&&(i.coatColor=t.coatColor),t.coatRoughness!==void 0&&(i.coatRoughness=t.coatRoughness),t.coatAnisotropy!==void 0&&(i.coatAnisotropy=t.coatAnisotropy),t.coatIor!==void 0&&(i.coatIor=t.coatIor),t.coatDarkening!==void 0&&(i.coatDarkening=t.coatDarkening),t.thinFilmWeight!==void 0&&(i.thinFilmWeight=t.thinFilmWeight),t.thinFilmThickness!==void 0&&(i.thinFilmThickness=t.thinFilmThickness),t.thinFilmIor!==void 0&&(i.thinFilmIor=t.thinFilmIor),t.emissionColor!==void 0&&(i.emissionColor=t.emissionColor),t.emissionLuminance!==void 0&&(i.emissionLuminance=t.emissionLuminance),t.opacity!==void 0&&(i.opacity=t.opacity),t.thinWalled!==void 0&&(i.thinWalled=t.thinWalled),t.doubleSided!==void 0&&(i.doubleSided=t.doubleSided),t.map!==void 0&&(i.map=t.map),t.alphaMap!==void 0&&(i.alphaMap=t.alphaMap),t.alphaMode!==void 0&&(i.alphaMode=t.alphaMode),t.alphaCutoff!==void 0&&(i.alphaCutoff=t.alphaCutoff),t.emissiveMap!==void 0&&(i.emissiveMap=t.emissiveMap),t.normalMap!==void 0&&(i.normalMap=t.normalMap),t.normalScale!==void 0&&(i.normalScale=t.normalScale),t.metallicRoughnessMap!==void 0&&(i.metallicRoughnessMap=t.metallicRoughnessMap),t.roughnessMap!==void 0&&(i.roughnessMap=t.roughnessMap),t.metalnessMap!==void 0&&(i.metalnessMap=t.metalnessMap),t.transmissionMap!==void 0&&(i.transmissionMap=t.transmissionMap),t.thinFilmMap!==void 0&&(i.thinFilmMap=t.thinFilmMap),t.shadowCatcher!==void 0&&(i.shadowCatcher=t.shadowCatcher),t.unlit!==void 0&&(i.unlit=t.unlit),t.bevelSize!==void 0&&(i.bevelSize=t.bevelSize),t.mapAlphaUsage!==void 0&&(i.mapAlphaUsage=t.mapAlphaUsage),t.uvProjection!==void 0&&(i.uvProjection=t.uvProjection),t.uvProjectionScale!==void 0&&(i.uvProjectionScale=t.uvProjectionScale),t.displacementUvProjection!==void 0&&(i.displacementUvProjection=t.displacementUvProjection),t.displacementUvProjectionScale!==void 0&&(i.displacementUvProjectionScale=t.displacementUvProjectionScale),t.displacementMap!==void 0&&(i.displacementMap=t.displacementMap),t.displacementScale!==void 0&&(i.displacementScale=t.displacementScale),t.displacementBias!==void 0&&(i.displacementBias=t.displacementBias),t.displacementStepSize!==void 0&&(i.displacementStepSize=t.displacementStepSize),t.thinFilmThicknessMinimum!==void 0&&(i.thinFilmThicknessMinimum=t.thinFilmThicknessMinimum),t.thinFilmMapChannel!==void 0&&(i.thinFilmMapChannel=t.thinFilmMapChannel),t.coatWeightMap!==void 0&&(i.coatWeightMap=t.coatWeightMap),t.coatRoughnessMap!==void 0&&(i.coatRoughnessMap=t.coatRoughnessMap),t.fuzzColorMap!==void 0&&(i.fuzzColorMap=t.fuzzColorMap),t.fuzzRoughnessMap!==void 0&&(i.fuzzRoughnessMap=t.fuzzRoughnessMap),t.specularWeightMap!==void 0&&(i.specularWeightMap=t.specularWeightMap),t.specularColorMap!==void 0&&(i.specularColorMap=t.specularColorMap),t.anisotropyMap!==void 0&&(i.anisotropyMap=t.anisotropyMap),t.specularAnisotropyRotation!==void 0&&(i.specularAnisotropyRotation=t.specularAnisotropyRotation),t.coatAnisotropyRotation!==void 0&&(i.coatAnisotropyRotation=t.coatAnisotropyRotation),t.specularAnisotropyModel!==void 0&&(i.specularAnisotropyModel=t.specularAnisotropyModel),t.coatNormalMap!==void 0&&(i.coatNormalMap=t.coatNormalMap),t.coatNormalScale!==void 0&&(i.coatNormalScale=t.coatNormalScale)}var Nl=1,Ss=new WeakMap;function Ls(){Nl=1}function ie(i){return i==null?"$":String(i)}function ui(i){return i==null?"$":[i[0],i[1],i[2]].join("_")}function Ps(i){if(i==null)return"$";if(i instanceof Float32Array){let e=[];for(let t=0;t<i.length;t++)e.push(i[t]);return e.join("_")}return[i[0],i[1]].join("_")}function at(i){return i?(Ss.has(i)||Ss.set(i,Nl++),`${Ss.get(i)}@${i.version}`):"$"}function Ct(i){return[ie(i.baseWeight),ui(i.baseColor),ie(i.baseDiffuseRoughness),ie(i.baseMetalness),ie(i.specularWeight),ui(i.specularColor),ie(i.specularRoughness),ie(i.specularIor),ie(i.specularAnisotropy),ie(i.transmissionWeight),ui(i.transmissionColor),ie(i.transmissionDepth),ui(i.transmissionScatter),ie(i.transmissionScatterAnisotropy),ie(i.transmissionDispersionScale),ie(i.transmissionDispersionAbbeNumber),ie(i.subsurfaceWeight),ui(i.subsurfaceColor),ie(i.subsurfaceRadius),ui(i.subsurfaceRadiusScale),ie(i.subsurfaceAnisotropy),ie(i.fuzzWeight),ui(i.fuzzColor),ie(i.fuzzRoughness),ie(i.coatWeight),ui(i.coatColor),ie(i.coatRoughness),ie(i.coatAnisotropy),ie(i.coatIor),ie(i.coatDarkening),ie(i.thinFilmWeight),ie(i.thinFilmThickness),ie(i.thinFilmIor),ui(i.emissionColor),ie(i.emissionLuminance),ie(i.opacity),ie(i.thinWalled),ie(i.doubleSided),at(i.map),at(i.alphaMap),ie(i.alphaMode),ie(i.alphaCutoff),at(i.emissiveMap),at(i.normalMap),Ps(i.normalScale),at(i.metallicRoughnessMap),at(i.roughnessMap),at(i.metalnessMap),at(i.transmissionMap),at(i.thinFilmMap),ie(i.shadowCatcher),ie(i.unlit),ie(i.bevelSize),ie(i.mapAlphaUsage),ie(i.uvProjection),Ps(i.uvProjectionScale),ie(i.displacementUvProjection),ie(i.displacementUvProjectionScale),at(i.displacementMap),ie(i.displacementScale),ie(i.displacementStepSize),ie(i.thinFilmThicknessMinimum),ie(i.thinFilmMapChannel),at(i.coatWeightMap),at(i.coatRoughnessMap),at(i.fuzzColorMap),at(i.fuzzRoughnessMap),at(i.specularWeightMap),at(i.specularColorMap),at(i.anisotropyMap),ie(i.specularAnisotropyRotation),ie(i.coatAnisotropyRotation),ie(i.specularAnisotropyModel),at(i.coatNormalMap),Ps(i.coatNormalScale),ie(i.displacementBias)].join("_")}var Pt={opaque:0,alpha:2,transmission:3},ot={none:0,spherical:1,cylindrical:2,triplanar:3},It={opaque:0,mask:1,blend:2};var Os=new WeakMap,qi=class{get aovId(){return Os.get(this)}set aovId(e){Os.set(this,fi(e))}constructor(e={}){Os.set(this,br()),Fl(this,e),e.aovId!==void 0&&(this.aovId=fi(e.aovId))}baseWeight=Z("baseWeight");baseColor=Z("baseColor");baseDiffuseRoughness=Z("baseDiffuseRoughness");baseMetalness=Z("baseMetalness");specularWeight=Z("specularWeight");specularColor=Z("specularColor");specularRoughness=Z("specularRoughness");specularIor=Z("specularIor");specularAnisotropy=Z("specularAnisotropy");transmissionWeight=Z("transmissionWeight");transmissionColor=Z("transmissionColor");transmissionDepth=Z("transmissionDepth");transmissionScatter=Z("transmissionScatter");transmissionScatterAnisotropy=Z("transmissionScatterAnisotropy");transmissionDispersionScale=Z("transmissionDispersionScale");transmissionDispersionAbbeNumber=Z("transmissionDispersionAbbeNumber");subsurfaceWeight=Z("subsurfaceWeight");subsurfaceColor=Z("subsurfaceColor");subsurfaceRadius=Z("subsurfaceRadius");subsurfaceRadiusScale=Z("subsurfaceRadiusScale");subsurfaceAnisotropy=Z("subsurfaceAnisotropy");fuzzWeight=Z("fuzzWeight");fuzzColor=Z("fuzzColor");fuzzRoughness=Z("fuzzRoughness");coatWeight=Z("coatWeight");coatColor=Z("coatColor");coatRoughness=Z("coatRoughness");coatAnisotropy=Z("coatAnisotropy");coatIor=Z("coatIor");coatDarkening=Z("coatDarkening");thinFilmWeight=Z("thinFilmWeight");thinFilmThickness=Z("thinFilmThickness");thinFilmIor=Z("thinFilmIor");thinFilmThicknessMinimum=Z("thinFilmThicknessMinimum");thinFilmMapChannel=Z("thinFilmMapChannel");emissionColor=Z("emissionColor");emissionLuminance=Z("emissionLuminance");opacity=Z("opacity");thinWalled=Z("thinWalled");doubleSided=Z("doubleSided");map;alphaMap;alphaMode=Z("alphaMode");alphaCutoff=Z("alphaCutoff");emissiveMap;normalMap;normalScale=Z("normalScale");metallicRoughnessMap;roughnessMap;metalnessMap;transmissionMap;thinFilmMap;coatWeightMap;coatRoughnessMap;fuzzColorMap;fuzzRoughnessMap;specularWeightMap;specularColorMap;specularAnisotropyModel="openpbr";anisotropyMap;coatNormalMap;coatNormalScale=Z("coatNormalScale");specularAnisotropyRotation=0;coatAnisotropyRotation=0;get specularRoughnessAnisotropy(){return this.specularAnisotropy}set specularRoughnessAnisotropy(e){this.specularAnisotropy=e}get coatRoughnessAnisotropy(){return this.coatAnisotropy}set coatRoughnessAnisotropy(e){this.coatAnisotropy=e}get subsurfaceScatterAnisotropy(){return this.subsurfaceAnisotropy}set subsurfaceScatterAnisotropy(e){this.subsurfaceAnisotropy=e}get geometryOpacity(){return this.opacity}set geometryOpacity(e){this.opacity=e}get geometryThinWalled(){return this.thinWalled}set geometryThinWalled(e){this.thinWalled=e}shadowCatcher=Z("shadowCatcher");unlit=Z("unlit");bevelSize=Z("bevelSize");mapAlphaUsage=Z("mapAlphaUsage");uvProjection=Z("uvProjection");uvProjectionScale=Z("uvProjectionScale");displacementMap;displacementUvProjection=Z("displacementUvProjection");displacementUvProjectionScale=Z("displacementUvProjectionScale");displacementScale=Z("displacementScale");displacementBias=Z("displacementBias");displacementStepSize=Z("displacementStepSize")};function di(i){return i.alphaMode!=="auto"?i.alphaMode:i.alphaCutoff>0?"mask":i.opacity<1||i.mapAlphaUsage==="alpha"||i.alphaMap?"blend":"opaque"}var Ji=class extends qi{constructor(e={}){super(e)}};function pi(i){return i==="clamp-to-edge"?1:i==="mirrored-repeat"?2:0}var Ea=class{image;version=0;flipY=!1;uvScale=[1,1];uvOffset=[0,0];wrapS="repeat";wrapT="repeat";colorSpace;uvChannel=0;constructor(e){this.image=e}markUpdated(){return this.version++,this}};var Ke=class extends Ea{source;constructor(e){super(e)}};function pt(i){return!!(i&&i.data)}function mi(i){return!!i&&i.type==="ProceduralSky"}var Qd=40,Ns=15;var Id=50;function Qr(i){let e=Fs(Qd),t=r=>{let n=Fs(15*(r-12));return Math.atan2(Math.sin(n),Math.cos(n)*Math.sin(e))+Math.PI},A=Fs(15*(i-12));return{elevation:Math.asin(Math.cos(e)*Math.cos(A))*180/Math.PI,azimuth:Id+(t(i)-t(Ns))*180/Math.PI}}function Fs(i){return i*Math.PI/180}var Ir=class extends Ke{constructor(e={}){let[t,A]=kl(e.resolution??[2048,1024]);super({type:"ProceduralSky",width:t,height:A,time:zl(e.time??Ns)}),this.colorSpace="linear"}get time(){return this.image.time}set time(e){let t=zl(e);t!==this.time&&(this.image={...this.image,time:t})}get resolution(){return[this.image.width,this.image.height]}set resolution(e){let[t,A]=kl(e);(t!==this.image.width||A!==this.image.height)&&(this.image={...this.image,width:t,height:A})}};function zl(i){if(!Number.isFinite(i)||i<0||i>24)throw new RangeError("ProceduralSky time must be between 0 and 24 hours.");return i}function kl(i){if(i.length!==2||!i.every(e=>Number.isSafeInteger(e)&&e>0))throw new RangeError("ProceduralSky resolution must contain two positive integers.");return i}var SA=class{type="AmbientLight";color=[1,1,1];intensity=1;constructor(e={}){this.color=e.color??[1,1,1],this.intensity=e.intensity??1}};var PA=class extends At{type="DirectionalLight";color=[1,1,1];intensity=1;constructor(e={}){super(),this.color=e.color??[1,1,1],this.intensity=e.intensity??1}};var wa=class extends At{type="RectLight";size=[1,1];color=[1,1,1];intensity=1;texture=void 0;spread=1;constructor(e={}){super(),this.size=e.size??[1,1],this.color=e.color??[1,1,1],this.intensity=e.intensity??1,this.texture=e.texture??void 0,this.spread=e.spread??1}};var DA=class extends wa{constructor(e={}){super(e)}};var TA=class extends At{type="SphereLight";color=[1,1,1];intensity=1;radius=1;constructor(e={}){super(),this.color=e.color??[1,1,1],this.intensity=e.intensity??1,this.radius=e.radius??1}};var RA=class extends At{type="SpotLight";color=[1,1,1];intensity=1;radius=.01;innerAngle=30;outerAngle=45;iesProfile=void 0;constructor(e={}){super(),this.color=e.color??[1,1,1],this.intensity=e.intensity??1,this.radius=e.radius??.01,this.innerAngle=e.innerAngle??30,this.outerAngle=e.outerAngle??45,this.iesProfile=e.iesProfile??void 0}};var _a=class extends At{type="EnvironmentLight";map;intensity=1;constructor(e){super(),this.map=e.map,this.intensity=e.intensity??1}};var UA=class extends _a{constructor(e){super(e)}};var _t=class extends Error{constructor(e,t="IES profile"){super(`${t}: ${e}`),this.name="IESParseError"}};function Gl(i,e){if(e.length===1||i<=e[0])return 0;let t=e.length-1;if(i>=e[t])return t;for(let A=1;A<=t;A++)if(i<=e[A])return A-1+(i-e[A-1])/(e[A]-e[A-1]);return t}function LA(i,e,t){return i+(e-i)*t}var Ki=class{name;verticalAngles;horizontalAngles;candelaValues;peakCandela;data;type="IESProfile";size=128;constructor(e,t,A,a,r,n){this.name=e,this.verticalAngles=t,this.horizontalAngles=A,this.candelaValues=a,this.peakCandela=r,this.data=n}evaluateAngles(e,t){if(e>this.verticalAngles[this.verticalAngles.length-1])return 0;let A=t,a=this.horizontalAngles[this.horizontalAngles.length-1];a<=180?(A=Math.abs(A),a===90&&A>90&&(A=180-A)):A<0&&(A+=360);let r=Gl(e,this.verticalAngles),n=Gl(A,this.horizontalAngles),s=Math.floor(r),o=Math.ceil(r),l=Math.floor(n),c=Math.ceil(n),f=r-s,m=n-l,d=this.verticalAngles.length,u=this.candelaValues[l*d+s],p=this.candelaValues[l*d+o],g=this.candelaValues[c*d+s],v=this.candelaValues[c*d+o];return LA(LA(u,p,f),LA(g,v,f),m)/this.peakCandela}sampleBaked(e,t,A=0){let a=e/Math.PI,r=(t-A)/(2*Math.PI)+.5,n=a*128-.5,s=r*128-.5,o=Math.floor(n),l=Math.floor(s),c=n-o,f=s-l,m=u=>(u%128+128)%128,d=(u,p)=>this.data[m(p)*128+m(u)];return LA(LA(d(o,l),d(o+1,l),c),LA(d(o,l+1),d(o+1,l+1),c),f)}},Sd=["IESNA:LM-63-1986","IESNA:LM-63-1991","IESNA91","IESNA:LM-63-1995","IESNA:LM-63-2002","ERCO Leuchten"];function Pd(i,e="IES profile"){let t=i.replace(/\r/g,"").split(`
`),A=t[0]?.trim();if(!Sd.includes(A))throw new _t(`unsupported LM-63 header "${A||"<empty>"}"`,e);let a=t.findIndex(v=>v.trim().startsWith("TILT="));if(a<0)throw new _t("missing TILT record",e);if(t[a].trim()!=="TILT=NONE")throw new _t("only TILT=NONE is supported",e);let r=t.slice(a+1).join(" ").trim().split(/[\s,]+/).filter(Boolean),n=r.map(v=>Number(v)),s=n.findIndex(v=>!Number.isFinite(v));if(s>=0)throw new _t(`invalid numeric token "${r[s]}"`,e);if(n.length<13)throw new _t("incomplete numeric header",e);let o=n[3],l=n[4];if(!Number.isInteger(o)||o<1||!Number.isInteger(l)||l<1)throw new _t("angle counts must be positive integers",e);if(n[5]!==1)throw new _t("only Type C photometry is supported",e);let c=13+o+l+o*l;if(n.length!==c)throw new _t(`numeric data size is ${n.length}, expected ${c}`,e);let f=n.slice(13,13+o),m=n.slice(13+o,13+o+l),d=n.slice(13+o+l),u=(v,h,B)=>{if(v.some((E,x)=>E<0||E>B||x>0&&E<=v[x-1]))throw new _t(`${h} angles must be finite, strictly increasing, and within 0..${B}`,e)};if(u(f,"vertical",180),u(m,"horizontal",360),f[0]!==0||m[0]!==0)throw new _t("Type C angle tables must begin at 0 degrees",e);if(d.some(v=>v<0))throw new _t("candela values must be non-negative",e);let p=Math.max(...d);if(!(p>0))throw new _t("candela peak must be greater than zero",e);let g=new Ki(e,f,m,d,p,new Float32Array(16384));for(let v=0;v<128;v++){let h=v*360/128-180;for(let B=0;B<128;B++)g.data[v*128+B]=g.evaluateAngles(B*180/128,h)}return g}var Dd=8,Td=32767;function Rd(i,e,t,A){if(i[3]>0){let a=Math.pow(2,i[3]-128-8+A);e[t+0]=i[0]*a,e[t+1]=i[1]*a,e[t+2]=i[2]*a}else e[t+0]=0,e[t+1]=0,e[t+2]=0;return e[t+3]=1,e}function Ud(i,e,t){let A="";for(let a=e;a<t;a++)A+=String.fromCharCode(i[a]);return A}function Ld(i,e){e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3]}function Hl(i,e,t,A){let a=0,r=0,n=A;for(;n>0;)if(i[r][0]=e[t++],i[r][1]=e[t++],i[r][2]=e[t++],i[r][3]=e[t++],i[r][0]===1&&i[r][1]===1&&i[r][2]===1){for(let s=i[r][3]<<a>>>0;s>0;s--)Ld(i[r-1],i[r]),r++,n--;a+=8}else r++,n--,a=0;return t}function Od(i,e,t,A){if(A<Dd||A>Td)return Hl(i,e,t,A);let a=e[t++];if(a!=2)return Hl(i,e,t-1,A);if(i[0][1]=e[t++],i[0][2]=e[t++],a=e[t++],(i[0][2]<<8>>>0|a)>>>0!==A)return null;for(let r=0;r<4;r++)for(let n=0;n<A;){let s=e[t++];if(s>128){s=(s&127)>>>0;let o=e[t++];for(;s--;)i[n++][r]=o}else for(;s--;)i[n++][r]=e[t++]}return t}function Wl(i,e=0){let t=new Uint8Array(i),A=t.length;if(Ud(t,0,2)!=="#?")return;let a;for(a=2;a<A&&!(String.fromCharCode(t[a])===`
`&&String.fromCharCode(t[a+1])===`
`);a++);if(a>=A)return;a+=2;let r="";for(;a<A;a++){let d=String.fromCharCode(t[a]);if(d===`
`)break;r+=d}let n=r.split(" "),s=parseInt(n[1]),o=parseInt(n[3]);if(!o||!s)return;let l=a+1,c=[];for(let d=0;d<o;d++){c[d]=[];for(let u=0;u<4;u++)c[d][u]=0}let f=new Float32Array(o*s*4),m=0;for(let d=0;d<s;d++){if(l=Od(c,t,l,o),!l)return;for(let u=0;u<o;u++)Rd(c[u],f,m,e),m+=4}return new Ke({data:f,width:o,height:s})}function Fd(i,e){return fetch(i).then(t=>t.arrayBuffer()).then(t=>Wl(t,e))}function Ae(i,e){if(!Array.isArray(i)&&!ArrayBuffer.isView(i))return!1;let t=i;if(!Array.isArray(e)||t.length!==e.length)return!1;for(let A=0;A<t.length;A++)if(!Object.is(t[A],e[A]))return!1;return!0}function xa(i,e){{let t=i.baseWeight,A=e[0];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.baseColor,A=e[1];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.baseDiffuseRoughness,A=e[2];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.baseMetalness,A=e[3];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.specularWeight,A=e[4];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.specularColor,A=e[5];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.specularRoughness,A=e[6];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.specularIor,A=e[7];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.specularAnisotropy,A=e[8];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.transmissionWeight,A=e[9];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.transmissionColor,A=e[10];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.transmissionDepth,A=e[11];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.transmissionScatter,A=e[12];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.transmissionScatterAnisotropy,A=e[13];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.transmissionDispersionScale,A=e[14];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.transmissionDispersionAbbeNumber,A=e[15];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.subsurfaceWeight,A=e[16];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.subsurfaceColor,A=e[17];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.subsurfaceRadius,A=e[18];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.subsurfaceRadiusScale,A=e[19];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.subsurfaceAnisotropy,A=e[20];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.fuzzWeight,A=e[21];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.fuzzColor,A=e[22];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.fuzzRoughness,A=e[23];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.coatWeight,A=e[24];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.coatColor,A=e[25];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.coatRoughness,A=e[26];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.coatAnisotropy,A=e[27];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.coatIor,A=e[28];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.coatDarkening,A=e[29];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.thinFilmWeight,A=e[30];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.thinFilmThickness,A=e[31];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.thinFilmIor,A=e[32];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.emissionColor,A=e[33];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.emissionLuminance,A=e[34];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.opacity,A=e[35];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.thinWalled,A=e[36];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.doubleSided,A=e[37];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.alphaMode,A=e[38];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.alphaCutoff,A=e[39];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.normalScale,A=e[40];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.shadowCatcher,A=e[41];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.unlit,A=e[42];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.bevelSize,A=e[43];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.mapAlphaUsage,A=e[44];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.uvProjection,A=e[45];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.uvProjectionScale,A=e[46];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.displacementUvProjection,A=e[47];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.displacementUvProjectionScale,A=e[48];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.displacementScale,A=e[49];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.displacementStepSize,A=e[50];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.thinFilmThicknessMinimum,A=e[51];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.thinFilmMapChannel,A=e[52];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.specularAnisotropyRotation,A=e[53];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.coatAnisotropyRotation,A=e[54];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.specularAnisotropyModel,A=e[55];if(!Object.is(t,A)&&!Ae(t,A))return!1}{let t=i.coatNormalScale,A=e[56];if(Array.isArray(t)||ArrayBuffer.isView(t)){let a=t;if(!Array.isArray(A)||a.length!==A.length)return!1;for(let r=0;r<a.length;r++)if(!Object.is(a[r],A[r]))return!1}else if(!Object.is(t,A))return!1}{let t=i.displacementBias,A=e[57];if(!Object.is(t,A)&&!Ae(t,A))return!1}return!0}function Yl(i,e){let t=0;{let A=i.map;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel||e[t++]!==A.wrapS||e[t++]!==A.wrapT||e[t++]!==A.colorSpace)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.alphaMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel||e[t++]!==A.wrapS||e[t++]!==A.wrapT||e[t++]!==A.colorSpace)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.emissiveMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel||e[t++]!==A.wrapS||e[t++]!==A.wrapT||e[t++]!==A.colorSpace)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.normalMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel||e[t++]!==A.wrapS||e[t++]!==A.wrapT||e[t++]!==A.colorSpace)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.metallicRoughnessMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel||e[t++]!==A.wrapS||e[t++]!==A.wrapT||e[t++]!==A.colorSpace)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.roughnessMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel||e[t++]!==A.wrapS||e[t++]!==A.wrapT||e[t++]!==A.colorSpace)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.metalnessMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel||e[t++]!==A.wrapS||e[t++]!==A.wrapT||e[t++]!==A.colorSpace)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.transmissionMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel||e[t++]!==A.wrapS||e[t++]!==A.wrapT||e[t++]!==A.colorSpace)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.thinFilmMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel||e[t++]!==A.wrapS||e[t++]!==A.wrapT||e[t++]!==A.colorSpace)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.displacementMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel||e[t++]!==A.wrapS||e[t++]!==A.wrapT||e[t++]!==A.colorSpace)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.coatWeightMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel||e[t++]!==A.wrapS||e[t++]!==A.wrapT||e[t++]!==A.colorSpace)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.coatRoughnessMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel||e[t++]!==A.wrapS||e[t++]!==A.wrapT||e[t++]!==A.colorSpace)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.fuzzColorMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel||e[t++]!==A.wrapS||e[t++]!==A.wrapT||e[t++]!==A.colorSpace)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.fuzzRoughnessMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel||e[t++]!==A.wrapS||e[t++]!==A.wrapT||e[t++]!==A.colorSpace)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.specularWeightMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel||e[t++]!==A.wrapS||e[t++]!==A.wrapT||e[t++]!==A.colorSpace)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.specularColorMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel||e[t++]!==A.wrapS||e[t++]!==A.wrapT||e[t++]!==A.colorSpace)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.anisotropyMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel||e[t++]!==A.wrapS||e[t++]!==A.wrapT||e[t++]!==A.colorSpace)return!0}else if(e[t++]!==void 0)return!0}}{let A=i.coatNormalMap;if(typeof A!="number"){if(A){if(e[t++]!==A||e[t++]!==A.version||e[t++]!==A.image||e[t++]!==A.flipY||e[t++]!==A.uvScale||e[t++]!==A.uvOffset||e[t++]!==A.uvChannel||e[t++]!==A.wrapS||e[t++]!==A.wrapT||e[t++]!==A.colorSpace)return!0}else if(e[t++]!==void 0)return!0}}return t!==e.length}function ba(i,e){return i===void 0||e===void 0?i===void 0&&e===void 0:i===e}function Nd(i,e){return i===void 0||e===void 0?i===void 0&&e===void 0:i===e}function zd(i,e){return i instanceof Uint16Array?e instanceof Uint16Array&&i===e:e instanceof Uint16Array?!1:i===e}function zs(i){return i instanceof Uint16Array,i.length}function kd(i,e,t){if(i instanceof Float32Array){for(let A=0;A<16;A++)if(!Object.is(i[A],e[t+A]))return!1}else for(let A=0;A<16;A++)if(!Object.is(i[A],e[t+A]))return!1;return!0}function Gd(i,e,t){i instanceof Float32Array,e.set(i,t)}var ks=class{position;positionSize;normal;normalSize;indices;indicesLength;indicesSize;tangent=void 0;tangentSize=0;uv=void 0;uvSize=0;uv1=void 0;uv1Size=0;color=void 0;colorSize=0;materialIndex=void 0;materialIndexSize=0;lengths=[0,0,0,0,0,0,0];constructor(e){this.position=e.position.array,this.positionSize=e.position.itemSize,this.normal=e.normal.array,this.normalSize=e.normal.itemSize,this.indices=e.indices.array,this.indicesLength=zs(e.indices.array),this.indicesSize=e.indices.itemSize,this.capture(e)}capture(e){this.position=e.position.array,this.positionSize=e.position.itemSize,this.normal=e.normal.array,this.normalSize=e.normal.itemSize,this.indices=e.indices.array,this.indicesLength=zs(e.indices.array),this.indicesSize=e.indices.itemSize;let t=e.tangent,A=e.uv,a=e.uv1,r=e.color,n=e.materialIndex;this.tangent=t?t.array:void 0,this.tangentSize=t?t.itemSize:0,this.uv=A?A.array:void 0,this.uvSize=A?A.itemSize:0,this.uv1=a?a.array:void 0,this.uv1Size=a?a.itemSize:0,this.color=r?r.array:void 0,this.colorSize=r?r.itemSize:0,this.materialIndex=n?n.array:void 0,this.materialIndexSize=n?n.itemSize:0;let s=this.lengths;s[0]=e.position.array.length,s[1]=e.normal.array.length,s[2]=t?t.array.length:-1,s[3]=A?A.array.length:-1,s[4]=a?a.array.length:-1,s[5]=r?r.array.length:-1,s[6]=n?n.array.length:-1}matches(e){let t=e.tangent,A=e.uv,a=e.uv1,r=e.color,n=e.materialIndex,s=this.lengths;return this.position===e.position.array&&this.positionSize===e.position.itemSize&&s[0]===e.position.array.length&&this.normal===e.normal.array&&this.normalSize===e.normal.itemSize&&s[1]===e.normal.array.length&&zd(this.indices,e.indices.array)&&this.indicesLength===zs(e.indices.array)&&this.indicesSize===e.indices.itemSize&&ba(this.tangent,t?t.array:void 0)&&this.tangentSize===(t?t.itemSize:0)&&s[2]===(t?t.array.length:-1)&&ba(this.uv,A?A.array:void 0)&&this.uvSize===(A?A.itemSize:0)&&s[3]===(A?A.array.length:-1)&&ba(this.uv1,a?a.array:void 0)&&this.uv1Size===(a?a.itemSize:0)&&s[4]===(a?a.array.length:-1)&&ba(this.color,r?r.array:void 0)&&this.colorSize===(r?r.itemSize:0)&&s[5]===(r?r.array.length:-1)&&Nd(this.materialIndex,n?n.array:void 0)&&this.materialIndexSize===(n?n.itemSize:0)&&s[6]===(n?n.array.length:-1)}},Gs=class{aovId;mesh;geometry;version;dynamic;storage;materials=[];instanced=!1;instanceCount=0;instanceVersion=0;colorVersion=0;instanceTransforms=void 0;instanceColors=void 0;constructor(e){this.aovId=e.aovId,this.mesh=e,this.geometry=e.geometry,this.version=e.geometry.version,this.dynamic=e.geometry.dynamic,this.storage=new ks(e.geometry)}capture(e){this.aovId=e.aovId,this.mesh=e,this.geometry=e.geometry,this.version=e.geometry.version,this.dynamic=e.geometry.dynamic,this.storage.capture(e.geometry);let t=e.instanceData;this.instanced=t!==void 0,this.instanceCount=t?t.count:0,this.instanceVersion=t?t.transformsVersion:0,this.colorVersion=t?t.colorsVersion:0,this.instanceTransforms=t?t.transforms:void 0,this.instanceColors=t?t.colors:void 0,this.materials.length=0;for(let A=0;A<e.materials.length;A++)this.materials.push(e.materials[A])}},Hs=class{meshList;meshes=[];matrices;materials=new Map;lightList;lights=[];background;constructor(e,t,A){this.meshList=e,this.matrices=new Float64Array(e.length*16),this.lightList=t,this.background=A}},Sr=class{adapter;snapshot=void 0;pending=void 0;spare=void 0;seen=new Set;constructor(e){this.adapter=e}detect(e){let t=this.adapter,A=this.snapshot,a=e.meshes,r=A===void 0||A.meshList!==a||A.meshes.length!==a.length,n=[],s=[],o=new Set,l=[],c=this.seen;c.clear();for(let p=0;p<a.length;p++){let g=a[p],v=A!==void 0&&p<A.meshes.length?A.meshes[p]:void 0,h=!1,B=g.instanceData;if(B&&(t.validateMesh(g),(v===void 0||!v.instanced||v.instanceCount!==B.count)&&(r=!0),v!==void 0&&v.mesh===g&&(v.colorVersion!==B.colorsVersion||!ba(v.instanceColors,B.colors))&&s.push(g),v!==void 0&&v.mesh===g&&(v.instanceVersion!==B.transformsVersion||v.instanceTransforms!==B.transforms)&&(n.push(g),h=!0)),v===void 0||v.mesh!==g||v.aovId!==g.aovId||v.geometry!==g.geometry||v.dynamic!==g.geometry.dynamic||!v.storage.matches(g.geometry)||v.materials.length!==g.materials.length)r=!0;else for(let E=0;E<g.materials.length;E++)if(v.materials[E]!==g.materials[E]){r=!0;break}v!==void 0&&v.geometry===g.geometry&&v.version!==g.geometry.version&&o.add(g.geometry),v!==void 0&&v.mesh===g&&A!==void 0&&!kd(g.transform,A.matrices,p*16)&&(h||n.push(g));for(let E=0;E<g.materials.length;E++){let x=g.materials[E];if(c.has(x))continue;c.add(x);let y=A!==void 0?A.materials.get(x):void 0;(y===void 0||!t.materialMatches(x,y))&&l.push(x)}}let f=[];for(let p=0;p<e.lights.length;p++)f.push(t.captureLight(e.lights[p]));let m=t.captureBackground(e.background),d=A===void 0||A.lightList!==e.lights||f.length!==A.lights.length;if(A!==void 0&&!d){for(let p=0;p<f.length;p++)if(!t.lightsEqual(f[p],A.lights[p])){d=!0;break}}let u={meshes:r?"full":n.length>0||s.length>0||l.length>0||o.size>0?"incremental":"none",transforms:n,colors:s,materials:l,geometries:[...o],lights:d,background:A===void 0||!t.backgroundsEqual(m,A.background)};if(u.meshes!=="none"||u.lights||u.background){let p=this.spare;(p===void 0||p.meshList!==a||p.meshes.length!==a.length)&&(p=new Hs(a,e.lights,m),this.spare=p);for(let h=0;h<a.length;h++){let B=a[h],E=h<p.meshes.length?p.meshes[h]:void 0;E===void 0&&(E=new Gs(B),p.meshes.push(E)),E.capture(B),Gd(B.transform,p.matrices,h*16)}let g=p.materials;p.materials=new Map;let v=new Set(l);for(let h of c){let B=A!==void 0?A.materials.get(h):void 0;if(B!==void 0&&!v.has(h))p.materials.set(h,B);else{let E=g.get(h);p.materials.set(h,t.captureMaterial(h,B,E!==B?E:void 0))}}p.lightList=e.lights,p.lights=f,p.background=m,this.pending=p}else this.pending=A;return u}commit(){this.pending!==void 0&&this.pending!==this.snapshot&&(this.spare=this.snapshot,this.snapshot=this.pending),this.pending=void 0}reset(){this.snapshot=void 0,this.pending=void 0,this.spare=void 0,this.seen.clear()}};function Zt(i){let e=[i];for(let t of Object.keys(i)){let A=i[t];e.push(t),A instanceof Ke?e.push(...jl(A)):Array.isArray(A)||ArrayBuffer.isView(A)?e.push(...Array.from(A)):e.push(A)}return e}function jl(i){return i?[i,i.version,i.image,i.flipY,i.uvScale,i.uvOffset,i.uvChannel,i.wrapS,i.wrapT,i.colorSpace]:[void 0]}function mt(i,e){return i.length===e.length&&i.every((t,A)=>Object.is(t,e[A]))}function Hd(i){return i instanceof Ke?jl(i):Array.isArray(i)?[i,...i]:i?Zt(i):[void 0]}function Wd(i,e){let t=0;for(let A of Ba){let a=i[A];if(typeof a!="number"){if(!a){e[t++]=void 0;continue}e[t++]=a,e[t++]=a.version,e[t++]=a.image,e[t++]=a.flipY,e[t++]=a.uvScale,e[t++]=a.uvOffset,e[t++]=a.uvChannel,e[t++]=a.wrapS,e[t++]=a.wrapT,e[t++]=a.colorSpace}}e.length=t}var Yd=Ts.filter(i=>i.type!=="texture").map(i=>i.key);function Ws(i,e){return Yd.map((t,A)=>{let a=i[t];if(Array.isArray(a)||ArrayBuffer.isView(a)){let r=a,n=e?.[A];if(Array.isArray(n)&&n.length===r.length){let s=!0;for(let o=0;o<r.length;o++)if(!Object.is(r[o],n[o])){s=!1;break}if(s)return n}return Array.from(r)}return a})}var jd={validateMesh:i=>{i instanceof be&&i.validate()},captureMaterial:(i,e,t)=>{let A=t??{aovId:i.aovId,values:[],textures:[]};return A.aovId=i.aovId,A.values=Ws(i,e?.values),Wd(i,A.textures),A},materialMatches:(i,e)=>i.aovId===e.aovId&&xa(i,e.values)&&!Yl(i,e.textures),captureLight:i=>Zt(i),lightsEqual:mt,captureBackground:Hd,backgroundsEqual:mt},Pr=class{_tracker=new Sr(jd);detect(e){return this._tracker.detect(e)}commit(){this._tracker.commit()}reset(){this._tracker.reset()}};var OA=class{engine;_active=!1;_activeUntil=-1/0;constructor(e){this.engine=e}get active(){return this._active||performance.now()<this._activeUntil}setActive(e){this._active=e}activateFor(e){this._activeUntil=Math.max(this._activeUntil,performance.now()+Math.max(0,e))}dispose(){this._active=!1,this._activeUntil=-1/0}};var Dr=new WeakMap;function Vl(i){i.markVerticesUpdated(),Dr.set(i,i.version)}function Ys(i){return Dr.get(i)===i.version}function ql(i,e){Ys(i)?Dr.set(e,e.version):Dr.delete(e)}var Vd=["position","normal","tangent","skinIndex","skinWeight"];function $i(i){let e=i,t=e.isInterleavedBufferAttribute?e.data.array:i.array,A=e.isInterleavedBufferAttribute?e.data.stride:i.itemSize,a=e.isInterleavedBufferAttribute?e.offset:0;if(!i.normalized&&!i.isFloat16BufferAttribute)return{array:t,stride:A,offset:a};let r=new Float64Array(i.count*i.itemSize),n=1,s=!1;i.normalized&&(t instanceof Uint8Array||t instanceof Uint8ClampedArray?n=255:t instanceof Uint16Array?n=65535:t instanceof Uint32Array?n=4294967295:t instanceof Int8Array?(n=127,s=!0):t instanceof Int16Array?(n=32767,s=!0):t instanceof Int32Array&&(n=2147483647,s=!0));let o=i.isFloat16BufferAttribute;for(let l=0;l<i.count;l++)for(let c=0;c<i.itemSize;c++){let f=t[l*A+a+c];if(o){let m=f>>10&31,d=f&1023;f=(f&32768?-1:1)*(m===31?d?NaN:1/0:m===0?d*2**-24:(1+d/1024)*2**(m-15))}f/=n,r[l*i.itemSize+c]=s?Math.max(-1,f):f}return{array:r,stride:i.itemSize,offset:0}}function FA(i,e,t){return i.array[e*i.stride+i.offset+t]}function Jl(i){return!!i.isSkinnedMesh||!!i.morphTargetInfluences&&(!!i.geometry.morphAttributes.position?.length||!!i.geometry.morphAttributes.normal?.length)}var Tr=class{geometry;position;normal;tangent;_accepted=[];_next=[];_bones=new Float32Array(0);_boundBones=new Float64Array(0);_temporary=new Float64Array(16);_skin=new Float64Array(16);_vector=new Float64Array(3);_initialized=!1;constructor(e){this.geometry=e;let t=e.attributes.position.count;this.position=new Float32Array(t*3),e.attributes.normal&&(this.normal=new Float32Array(t*3)),e.attributes.tangent&&(this.tangent=new Float32Array(t*Math.min(4,e.attributes.tangent.itemSize)))}matches(e){return this.geometry===e&&this.position.length===e.attributes.position.count*3&&!!this.normal==!!e.attributes.normal&&!!this.tangent==!!e.attributes.tangent&&(!this.tangent||this.tangent.length===e.attributes.position.count*Math.min(4,e.attributes.tangent.itemSize))}update(e){let t=e.geometry,A=e;A.isSkinnedMesh&&A.skeleton.update();let a=this._next;a.length=0,a.push(t,t.morphTargetsRelative);let r=h=>{if(!h){a.push(void 0);return}let B=h,E=B.isInterleavedBufferAttribute?B.data:h;a.push(h,E.array,E.version,h.count,h.itemSize,h.normalized,B.offset,B.data?.stride)};for(let h of Vd)r(t.getAttribute(h));for(let h of["position","normal"]){let B=t.morphAttributes[h];if(a.push(B?.length),B)for(let E of B)r(E)}let n=e.morphTargetInfluences;if(a.push(n?.length),n)for(let h of n)a.push(h);if(A.isSkinnedMesh){a.push(A.skeleton,A.skeleton.boneMatrices.length);for(let h of A.bindMatrix.elements)a.push(h);for(let h of A.bindMatrixInverse.elements)a.push(h)}let s=A.isSkinnedMesh?A.skeleton.boneMatrices:void 0,o=!!s&&s.length!==this._bones.length;if(s&&!o){for(let h=0;h<s.length;h++)if(!Object.is(s[h],this._bones[h])){o=!0;break}}if(this._initialized&&!o&&a.length===this._accepted.length&&a.every((h,B)=>Object.is(h,this._accepted[B])))return!1;let l=$i(t.getAttribute("position")),c=this.normal&&$i(t.getAttribute("normal")),f=this.tangent&&$i(t.getAttribute("tangent")),m=s&&$i(t.getAttribute("skinIndex")),d=s&&$i(t.getAttribute("skinWeight")),u=t.morphAttributes.position?.map($i),p=t.morphAttributes.normal?.map($i);if(s){this._bones.length!==s.length&&(this._bones=new Float32Array(s.length),this._boundBones=new Float64Array(s.length)),this._bones.set(s);for(let h=0;h<s.length;h+=16)oe.multiply(this._temporary,s.subarray(h,h+16),A.bindMatrix.elements),oe.multiply(this._boundBones.subarray(h,h+16),A.bindMatrixInverse.elements,this._temporary)}let g=(h,B,E)=>{for(let x=0;x<3;x++){let y=FA(h,E,x),M=y;if(n&&B)for(let b=0;b<B.length;b++){let T=n[b]??0;T&&(M+=T*(FA(B[b],E,x)-(t.morphTargetsRelative?0:y)))}this._vector[x]=M}},v=(h,B,E,x=3)=>{let y=this._vector[0],M=this._vector[1],b=this._vector[2];if(A.isSkinnedMesh){let T=this._skin,O=T[0]*y+T[4]*M+T[8]*b+(E?T[12]:0),R=T[1]*y+T[5]*M+T[9]*b+(E?T[13]:0),D=T[2]*y+T[6]*M+T[10]*b+(E?T[14]:0);if(y=O,M=R,b=D,!E){let L=Math.hypot(y,M,b);L&&(y/=L,M/=L,b/=L)}}h[B*x]=y,h[B*x+1]=M,h[B*x+2]=b};for(let h=0;h<this.position.length/3;h++){if(A.isSkinnedMesh){this._skin.fill(0);for(let B=0;B<4;B++){let E=FA(m,h,B),x=FA(d,h,B);if(!x)continue;let y=E*16;for(let M=0;M<16;M++)this._skin[M]+=x*this._boundBones[y+M]}}if(g(l,u,h),v(this.position,h,!0),this.normal&&(g(c,p,h),v(this.normal,h,!1)),this.tangent){for(let E=0;E<3;E++)this._vector[E]=FA(f,h,E);let B=this.tangent.length/(this.position.length/3);v(this.tangent,h,!1,B),B===4&&(this.tangent[h*4+3]=FA(f,h,3))}}return this._next=this._accepted,this._accepted=a,this._initialized=!0,!0}};function He(i,e){if(!i)return;let t=[i.version,i.image,i.flipY,i.repeat.x,i.repeat.y,i.offset.x,i.offset.y,i.channel,i.wrapS,i.wrapT,i.colorSpace],A=e.get(i);if(A&&mt(A.state,t))return A.texture;let a=Jd(i),r=A?.texture??new Ke(a);r.image=a,r.source=i,r.flipY=i.flipY,r.uvScale=[i.repeat.x,i.repeat.y],r.uvOffset=[i.offset.x,i.offset.y],r.uvChannel=i.channel===1?1:0;let n=s=>s===1001?"clamp-to-edge":s===1002?"mirrored-repeat":"repeat";return r.wrapS=n(i.wrapS),r.wrapT=n(i.wrapT),r.colorSpace=i.colorSpace==="srgb"?"srgb":i.colorSpace==="srgb-linear"||i.colorSpace===""?"linear":void 0,A?r.markUpdated():r.version=i.version,e.set(i,{texture:r,state:t}),r}function qd(i){let e=i&32768?-1:1,t=i>>10&31,A=i&1023;return t===0?e*Math.pow(2,-14)*(A/1024):t===31?A?NaN:e*(1/0):e*Math.pow(2,t-15)*(1+A/1024)}function Jd(i){let e=i.image;if(!e?.data)return e;let t=i.format===1028?1:i.format===1030?2:i.format===1022?3:i.format===1023?4:0;if(!t)throw new Error(`Unsupported Three.js data texture format: ${i.format}`);let A=e.data;if(A.length!==e.width*e.height*t)throw new Error("Three.js data texture length does not match its format and dimensions.");let a=i.type===1016;if(t===4&&!a&&(A instanceof Float32Array||A instanceof Uint8Array||A instanceof Uint8ClampedArray||A instanceof Int32Array))return e;let r=A instanceof Uint8Array||A instanceof Uint8ClampedArray,n=r?new Uint8Array(e.width*e.height*4):new Float32Array(e.width*e.height*4),s=o=>{let l=A[o];return a?qd(l):A instanceof Uint16Array?l/65535:A instanceof Uint32Array?l/4294967295:A instanceof Int8Array?Math.max(-1,l/127):A instanceof Int16Array?Math.max(-1,l/32767):l};for(let o=0;o<e.width*e.height;o++)n[o*4]=s(o*t),n[o*4+1]=t>1?s(o*t+1):0,n[o*4+2]=t>2?s(o*t+2):0,n[o*4+3]=t===4?s(o*t+3):r?255:1;return{width:e.width,height:e.height,data:n}}function js(i,e){if(!i?.image?.data||!i.image.width||!i.image.height)return;let t=e.get(i),A=He(i,e);if(t?.state===e.get(i)?.state)return A;let a=A.image.data,{width:r,height:n}=i.image;return A.image={data:i.flipY?a:Kd(a,r,n),width:r,height:n},A.flipY=!1,A}function Kd(i,e,t){if(t<=1)return i;let A=i.length/t,a=new i.constructor(i.length);for(let r=0;r<t;r++)a.set(i.subarray((t-1-r)*A,(t-r)*A),r*A);return a}function $d(i,e){let t=new Ji;if(i.userData.mutracerShadowCatcher===!0)return t.shadowCatcher=!0,t;if(i.isMeshBasicMaterial){let y=i;return t.unlit=!0,t.baseWeight=0,t.specularWeight=0,t.baseColor=y.color.toArray(),t.emissionColor=t.baseColor,t.emissionLuminance=1,t.map=He(y.map,e),t.emissiveMap=t.map,t.alphaMap=He(y.alphaMap,e),t.geometryOpacity=y.opacity,t.alphaCutoff=Math.max(0,y.alphaTest),t.alphaMode=y.alphaTest>0?"mask":y.transparent||y.opacity<1||y.alphaMap?"blend":"opaque",t.mapAlphaUsage=t.alphaMode==="opaque"?"opaque":"alpha",t.doubleSided=y.side===2,t}let A=i;t.baseColor=A.color.toArray(),t.emissionColor=A.emissive&&A.emissive.toArray(),t.specularRoughness=A.roughness,t.baseMetalness=A.metalness,t.emissionLuminance=A.emissiveIntensity,t.normalScale=A.normalScale&&A.normalScale.toArray();let a=A.userData.mutracerUvProjection;(a==="triplanar"||a==="spherical"||a==="cylindrical"||a==="none")&&(t.uvProjection=a);let r=A.userData.mutracerUvProjectionScale;if(Array.isArray(r)&&r.length>=2){let y=Math.max(Number(A.userData.mutracerUvReferenceLength)||1,1e-6),M=Math.max(Number(r[0])||1e-6,1e-6),b=Math.max(Number(r[1])||1e-6,1e-6);t.uvProjectionScale=t.uvProjection==="triplanar"?[M/y,b/y]:t.uvProjection==="cylindrical"?[M,b/y]:[M,b]}t.map=He(A.map,e),t.alphaMap=He(A.alphaMap,e),t.alphaCutoff=Math.max(0,Number.isFinite(A.alphaTest)?A.alphaTest:0),t.emissiveMap=He(A.emissiveMap,e),t.normalMap=He(A.normalMap,e),t.displacementMap=He(A.displacementMap,e);let n=Number(A.displacementBias);Number.isFinite(n)&&(t.displacementBias=n);let s=Number(A.displacementScale);t.displacementScale=Number.isFinite(s)&&(A.displacementMap!=null||s!==1)?s:t.displacementScale;let o=Number(A.userData.mutracerDisplacementStepSize);Number.isFinite(o)&&(t.displacementStepSize=Math.max(0,o));let l=A.userData.mutracerDisplacementUvProjection;(l==="triplanar"||l==="spherical"||l==="cylindrical"||l==="none")&&(t.displacementUvProjection=l);let c=Number(A.userData.mutracerDisplacementUvProjectionScale);Number.isFinite(c)&&(t.displacementUvProjectionScale=Math.max(c,1e-6)),A.roughnessMap&&A.roughnessMap===A.metalnessMap?t.metallicRoughnessMap=He(A.roughnessMap,e):(t.roughnessMap=He(A.roughnessMap,e),t.metalnessMap=He(A.metalnessMap,e));let f=A;if(f.type==="MeshPhysicalMaterial"){t.transmissionWeight=f.transmission,t.transmissionMap=He(f.transmissionMap,e),t.specularIor=f.ior;let y=f.metalness===1&&!f.metalnessMap;t.specularWeight=y?1:f.specularIntensity,f.specularColor&&!y&&(t.specularColor=f.specularColor.toArray()),t.coatWeightMap=He(f.clearcoatMap,e),t.coatRoughnessMap=He(f.clearcoatRoughnessMap,e),t.coatNormalMap=He(f.clearcoatNormalMap,e),t.coatNormalScale=f.clearcoatNormalScale.toArray(),t.fuzzColorMap=He(f.sheenColorMap,e),t.fuzzRoughnessMap=He(f.sheenRoughnessMap,e),y||(t.specularWeightMap=He(f.specularIntensityMap,e),t.specularColorMap=He(f.specularColorMap,e)),t.coatWeight=f.clearcoat,t.coatRoughness=f.clearcoatRoughness,t.coatIor=1.5,t.coatDarkening=0,t.fuzzWeight=f.sheen,t.fuzzRoughness=f.sheenRoughness,f.sheenColor&&(t.fuzzColor=f.sheenColor.toArray()),f.attenuationColor&&(t.transmissionColor=f.attenuationColor.toArray()),Number.isFinite(f.attenuationDistance)&&(t.transmissionDepth=Math.max(0,f.attenuationDistance))}let m=Number(f.dispersion);t.transmissionDispersionScale=Number.isFinite(m)?Math.min(1,Math.max(0,m)):0;let d=f;t.thinFilmThickness=Math.min(20,Math.max(0,(d.iridescenceThicknessRange?.[1]??500)/1e3)),t.thinFilmWeight=Math.min(1,Math.max(0,d.iridescence??0)),t.thinFilmIor=Math.min(2.5,Math.max(1,d.iridescenceIOR??1.4));let u=A.userData.mutracerThinFilmMap,p=A.userData.mutracerThinFilmMap??d.iridescenceThicknessMap??void 0;p&&(t.thinFilmMap=He(p,e),u||(t.thinFilmThicknessMinimum=Math.min(20,Math.max(0,(d.iridescenceThicknessRange?.[0]??0)/1e3)),t.thinFilmMapChannel="g"));let g=Number(f.anisotropy);if(t.specularRoughnessAnisotropy=Number.isFinite(g)?Math.min(1,Math.max(0,g)):0,f.isMeshPhysicalMaterial){t.specularAnisotropyModel="gltf",t.anisotropyMap=He(f.anisotropyMap,e);let y=Number(f.anisotropyRotation);t.specularAnisotropyRotation=Number.isFinite(y)?y:0}let v=A.userData.mutracerOpenPBR,h=v?Ds(v):void 0,B=(y,M,b=0,T=1)=>{let O=Number(y);return Number.isFinite(O)?Math.min(T,Math.max(b,O)):M},E=(y,M)=>{let b=y;return b&&b.length>=3?[B(b[0],M[0]),B(b[1],M[1]),B(b[2],M[2])]:M};if(h){for(let M of["displacementScale","displacementBias","displacementStepSize"]){let b=h[M];typeof b=="number"&&Number.isFinite(b)&&(t[M]=M==="displacementStepSize"?Math.max(0,b):b)}h.specularAnisotropyModel!==void 0&&(QA(h.specularAnisotropyModel),t.specularAnisotropyModel=h.specularAnisotropyModel),h.specularAnisotropy!==void 0&&h.specularAnisotropyModel!=="gltf"&&(t.specularAnisotropyModel="openpbr",t.anisotropyMap=void 0,t.specularAnisotropyRotation=0);for(let M of["coatWeightMap","coatRoughnessMap","fuzzColorMap","fuzzRoughnessMap","specularWeightMap","specularColorMap","anisotropyMap","coatNormalMap"]){let b=h[M];b===null?t[M]=void 0:b instanceof Ke?t[M]=b:b&&b.isTexture&&typeof b.clone=="function"&&(t[M]=He(b,e))}t.specularAnisotropyRotation=B(h.specularAnisotropyRotation,t.specularAnisotropyRotation,-1/0,1/0),t.coatAnisotropyRotation=B(h.coatAnisotropyRotation,t.coatAnisotropyRotation,-1/0,1/0);let y=h.coatNormalScale;y&&y.length>=2&&(t.coatNormalScale=[B(y[0],t.coatNormalScale[0],-1/0,1/0),B(y[1],t.coatNormalScale[1],-1/0,1/0)]),t.baseWeight=B(h.baseWeight,t.baseWeight),t.baseDiffuseRoughness=B(h.baseDiffuseRoughness,t.baseDiffuseRoughness),t.specularWeight=B(h.specularWeight,t.specularWeight),t.specularColor=E(h.specularColor,t.specularColor),t.transmissionScatter=E(h.transmissionScatter,t.transmissionScatter),t.transmissionScatterAnisotropy=B(h.transmissionScatterAnisotropy,t.transmissionScatterAnisotropy,-.95,.95),t.transmissionDispersionScale=B(h.transmissionDispersionScale,t.transmissionDispersionScale),t.transmissionDispersionAbbeNumber=B(h.transmissionDispersionAbbeNumber,t.transmissionDispersionAbbeNumber,1,100),t.subsurfaceWeight=B(h.subsurfaceWeight,t.subsurfaceWeight),t.subsurfaceColor=E(h.subsurfaceColor,t.subsurfaceColor),t.subsurfaceRadius=B(h.subsurfaceRadius,t.subsurfaceRadius,0,1/0),t.subsurfaceRadiusScale=E(h.subsurfaceRadiusScale,t.subsurfaceRadiusScale),t.subsurfaceScatterAnisotropy=B(h.subsurfaceAnisotropy,t.subsurfaceAnisotropy,-.95,.95),t.coatWeight=B(h.coatWeight,t.coatWeight),t.coatColor=E(h.coatColor,t.coatColor),t.coatRoughness=B(h.coatRoughness,t.coatRoughness),t.coatRoughnessAnisotropy=B(h.coatAnisotropy,t.coatAnisotropy),t.coatIor=B(h.coatIor,t.coatIor,1,2.5),t.coatDarkening=B(h.coatDarkening,t.coatDarkening),t.fuzzWeight=B(h.fuzzWeight,t.fuzzWeight),t.fuzzColor=E(h.fuzzColor,t.fuzzColor),t.fuzzRoughness=B(h.fuzzRoughness,t.fuzzRoughness),"thinWalled"in h&&(t.geometryThinWalled=h.thinWalled===!0),t.thinFilmWeight=B(h.thinFilmWeight,t.thinFilmWeight),t.thinFilmThickness=B(h.thinFilmThickness,t.thinFilmThickness,0,20),t.thinFilmThicknessMinimum=B(h.thinFilmThicknessMinimum,t.thinFilmThicknessMinimum,0,20),h.thinFilmMapChannel!==void 0&&(t.thinFilmMapChannel=["r","g","b","a"][IA(h.thinFilmMapChannel)]),h.thinFilmMap instanceof Ke?t.thinFilmMap=h.thinFilmMap:h.thinFilmMap&&h.thinFilmMap.isTexture&&(t.thinFilmMap=He(h.thinFilmMap,e)),t.thinFilmIor=B(h.thinFilmIor,t.thinFilmIor,1,2.5)}t.geometryOpacity=A.opacity,t.doubleSided=A.side===2,h&&(t.specularRoughnessAnisotropy=B(h.specularAnisotropy,t.specularRoughnessAnisotropy),t.geometryOpacity=B(h.opacity,t.geometryOpacity));let x=Number(A.userData.mutracerBevelSize);return t.bevelSize=Number.isFinite(x)?Math.max(0,x):0,t.mapAlphaUsage=A.transparent||A.alphaMap||A.alphaTest>0?"alpha":"opaque",t.alphaMode=A.alphaTest>0?"mask":A.transparent||t.geometryOpacity<1||A.alphaMap?"blend":"opaque",A.side===1&&(t.displacementScale=-t.displacementScale,t.displacementBias=-t.displacementBias),t}function NA(i,e=i.itemSize){let t=new Float32Array(i.count*e);if(i.array instanceof Float32Array&&!i.normalized){let a=i;if(!a.isInterleavedBufferAttribute&&e===i.itemSize)t.set(i.array.subarray(0,t.length));else{let r=a.isInterleavedBufferAttribute?a.data.stride:i.itemSize,n=a.isInterleavedBufferAttribute?a.offset:0;for(let s=0;s<i.count;s++){let o=s*r+n,l=s*e;for(let c=0;c<e;c++)t[l+c]=i.array[o+c]}}return t}let A=[i.getX,i.getY,i.getZ,i.getW];for(let a=0;a<i.count;a++)for(let r=0;r<e;r++)t[a*e+r]=A[r].call(i,a);return t}function Xd(i,e,t,A){let a=i.getAttribute("position"),r=i.getAttribute("normal"),n=i.getAttribute("tangent"),s=i.getAttribute("uv"),o=i.getAttribute("uv1"),l=t&&i.getAttribute("color"),c=i.getIndex(),f=c?c.array.length:a.count,m=h=>{let B=Math.trunc(h)||0;return B<0?Math.max(f+B,0):Math.min(B,f)},d=e?m(e.start):0,u=e?m(e.start+e.count):f,p=Math.max(u-d,0);if(p-=p%3,p===0)return null;let g=new Uint32Array(p);if(c)g.set(c.array.subarray(d,d+p));else for(let h=0;h<p;h++)g[h]=d+h;if(A)for(let h=0;h<g.length;h+=3){let B=g[h+1];g[h+1]=g[h+2],g[h+2]=B}let v=new Ge({position:new X(NA(a),a.itemSize),normal:r&&new X(NA(r),r.itemSize),tangent:n&&new X(NA(n,Math.min(4,n.itemSize)),Math.min(4,n.itemSize)),uv:s&&new X(NA(s),s.itemSize),uv1:o&&new X(NA(o),o.itemSize),color:l?new X(NA(l,3),3):void 0,indices:new X(g,1)});return A&&(r&&Kl(v),$l(v)),va(v),v}function Kl(i){let e=i.normal.array;for(let t=0;t<e.length;t++)e[t]=-e[t]}function $l(i){let e=i.tangent;if(e?.itemSize===4)for(let t=3;t<e.array.length;t+=4)e.array[t]*=-1}function qs(){return{updateId:0,textures:new WeakMap,equirectTextures:new WeakMap,materials:new WeakMap,geometries:new WeakMap,materialHooks:new WeakMap,lightHooks:new WeakMap,poseChanged:!1,meshes:new WeakMap,lights:new WeakMap,deformedGeometries:new WeakMap,deformations:new WeakMap,instanceMeshes:new WeakMap,projectionVariants:new Map,warned:new WeakSet}}var Rr=["position","normal","tangent","uv","uv1","color","index"];function Zd(i,e){let t=[];for(let A=0;A<Rr.length;A++){let a=Rr[A],r=a==="index"?i.index:i.getAttribute(a);if(!r){t.push(void 0);continue}let n=r,s=n.isInterleavedBufferAttribute?n.data:r;t.push(r,s,e&&A<3?void 0:s.version,s.array,r.count,r.itemSize,r.normalized,n.offset,n.data?.stride)}return t}function ep(i,e,t){let A=0;for(let a=0;a<Rr.length;a++){let r=Rr[a],n=r==="index"?i.index:i.getAttribute(r);if(!n){if(e[A++]!==void 0)return!1;continue}let s=n,o=s.isInterleavedBufferAttribute?s.data:n;if(e[A++]!==n||e[A++]!==o||!Object.is(e[A++],t&&a<3?void 0:o.version)||e[A++]!==o.array||!Object.is(e[A++],n.count)||!Object.is(e[A++],n.itemSize)||!Object.is(e[A++],n.normalized)||!Object.is(e[A++],s.offset)||!Object.is(e[A++],s.data?.stride))return!1}return A===e.length}function zA(i,e,t){let A=i.lights.get(e);if(!A||A.type!==t.type)return i.lights.set(e,t),t;for(let a of Object.keys(t)){let r=A[a],n=t[a];Array.isArray(r)&&Array.isArray(n)&&mt(r,n)||(A[a]=n)}return A}function tp(i,e={}){return Xl(i,e,qs())}function Xl(i,e,t){let A=++t.updateId,a=[],r=[],n=t.textures,s=new Set,o=new Map;function l(w,N){let H=o.get(N);if(H===void 0&&(H=Ct(N),o.set(N,H)),!(w.base===N&&w.hash===H&&xa(N,w.parameters))){for(let ee of Mr)w.material[ee]=N[ee];w.autoUvProjection&&(w.material.uvProjection="triplanar"),w.autoDisplacementUvProjection&&(w.material.displacementUvProjection="triplanar"),w.parameters=Ws(N),w.hash=H,w.base=N}}function c(w,N,H,ee){if(!H&&!ee)return N;let te=t.projectionVariants.get(w);te||(te=new Map,t.projectionVariants.set(w,te));let Y=`${+H}:${+ee}`,ne=te.get(Y);return ne||(ne={material:new Ji,parameters:[],autoUvProjection:H,autoDisplacementUvProjection:ee},te.set(Y,ne)),l(ne,N),ne.material}function f(w){if(!e.convertMaterial)return;let N=t.materialHooks.get(w);return(!N||N.version!==w.version)&&(N={version:w.version,value:e.convertMaterial(w)},t.materialHooks.set(w,N)),N.value}function m(w){if(!e.convertLight)return;let N=w.userData.mutracerVersion,H=typeof N=="number"?N:void 0,ee=t.lightHooks.get(w);return(!ee||ee.version!==H)&&(ee={version:H,value:e.convertLight(w)},t.lightHooks.set(w,ee)),ee.value}function d(w){let N=f(w);if(N!==void 0)return N;let H=t.materials.get(w);if(s.has(w))return H.material;let ee=$d(w,n),te=Ct(ee),Y=ee;if(H){if(H.hash!==te){for(let ne of Mr)H.material[ne]=ee[ne];H.hash=te}Y=H.material}else t.materials.set(w,{material:Y,hash:te});return s.add(w),Y}function u(w){return w.isMesh}function p(w){return w.isDirectionalLight}function g(w){return w.isAmbientLight}function v(w){return w.isRectAreaLight}function h(w){return w.type==="PointLight"}function B(w){return w.type==="SpotLight"}i.updateMatrixWorld(!0),i.traverseVisible(w=>{if(w.isLight){let N=m(w);if(N!==void 0){N!==null&&r.push(N);return}}if(u(w)){if(w.userData.viewerEnvironment||w.userData.viewerRealtimeDisplacement)return;let N=Array.isArray(w.material)?w.material:[w.material];if(N.some(H=>f(H)===null))return;if(!w.geometry)console.warn(w,"must have a geometry property");else if(N.some(H=>f(H)===void 0&&!H.isMeshStandardMaterial&&!H.isMeshBasicMaterial&&H.userData.mutracerShadowCatcher!==!0))console.warn(w,"must use MeshStandardMaterial or MeshBasicMaterial in order to be rendered.");else{let H=w,ee=w.isBatchedMesh||H.isInstancedMesh&&(!!H.morphTexture||w.isSkinnedMesh);ee&&!t.warned.has(w)&&(console.warn("MuTracer: BatchedMesh, instanced morph targets and skinned instancing are not supported; converting as an ordinary mesh.",w),t.warned.add(w));let te=H.isInstancedMesh&&!ee,Y,ne=!1;!ee&&Jl(w)&&(Y=t.deformations.get(w),Y?.matches(w.geometry)||(Y=new Tr(w.geometry),t.deformations.set(w,Y),t.deformedGeometries.delete(w)),ne=Y.update(w),t.poseChanged||=ne);let Le=N,fe=Le.length>1&&w.geometry.groups.length?w.geometry.groups:[{start:0,count:1/0,materialIndex:0}],_e=Y?t.deformedGeometries.get(w):t.geometries.get(w.geometry);(!_e||_e.checkedAt!==A)&&((!_e||!ep(w.geometry,_e.state,!!Y))&&(_e={state:Zd(w.geometry,!!Y),groups:new Map,checkedAt:A},Y?t.deformedGeometries.set(w,_e):t.geometries.set(w.geometry,_e)),_e.checkedAt=A);let Me=_e;fe.forEach((Qe,de)=>{let xe=Number.isFinite(Qe.count)?Qe.count:w.geometry.getIndex()?.count??w.geometry.getAttribute("position").count,We=Le[Qe.materialIndex??0],Oe=We.vertexColors===!0,Ze=We.side===1,Mt=`${Qe.start}:${xe}:${Oe}:${Ze}`,pe=Me.groups.get(Mt),zt=!pe;if(!pe){let Pe=Xd(w.geometry,{start:Qe.start,count:xe},Oe,Ze);if(!Pe)return;pe=Pe,Me.groups.set(Mt,pe)}if(Y&&(ne||zt||t.meshes.get(w)?.get(de)?.geometry!==pe)){if(pe.dynamic=!0,pe.position.array.set(Y.position),Y.normal)pe.normal.array.set(Y.normal),Ze&&Kl(pe);else{let Pe=pe.normal;Vi(pe),Pe.array.set(pe.normal.array),pe.normal=Pe}Y.tangent&&pe.tangent&&(pe.tangent.array.set(Y.tangent),Ze&&$l(pe)),w.geometry.getAttribute("tangent")||Rl(pe),va(pe),zt||Vl(pe)}let $e=d(We),me=$e,Fe=!pe.uv&&me.uvProjection==="none"&&!!(me.map||me.normalMap||me.emissiveMap||me.metallicRoughnessMap||me.roughnessMap||me.metalnessMap||me.thinFilmMap||me.coatWeightMap||me.coatRoughnessMap||me.fuzzColorMap||me.fuzzRoughnessMap||me.specularWeightMap||me.specularColorMap||me.anisotropyMap||me.coatNormalMap),Ye=!pe.uv&&!!me.displacementMap&&me.displacementUvProjection==="none",dt=te?H.count:1;if(te){let Pe=t.instanceMeshes.get(w);Pe||(Pe=new Map,t.instanceMeshes.set(w,Pe));let Re=c(We,me,Fe,Ye),ue=Pe.get(de);ue||(ue=new be(pe,Re,{count:dt}),ue.transform=w.matrixWorld.elements.slice(),Pe.set(de,ue)),ue.geometry=pe,ue.materials[0]!==Re&&(ue.materials=[Re]);let Vt=ue.count!==dt;ue.transforms.length<dt*16&&(ue.transforms=new Float32Array(dt*16),Vt=!0);let Ne=H.instanceColor,Bt=!1;if(Ne){(!ue.colors||ue.colors.length<dt*3)&&(ue.colors=new Float32Array(dt*3));for(let ye=0;ye<dt;ye++)for(let I=0;I<3;I++){let W=Math.fround(I===0?Ne.getX(ye):I===1?Ne.getY(ye):Ne.getZ(ye));Object.is(ue.colors[ye*3+I],W)||(ue.colors[ye*3+I]=W,Bt=!0)}}else ue.colors=void 0;ue.count=dt;let rt=H.instanceMatrix;for(let ye=0;ye<dt;ye++)for(let I=0;I<16;I++){let W=Math.fround(rt.array[ye*rt.itemSize+I]);Object.is(ue.transforms[ye*16+I],W)||(ue.transforms[ye*16+I]=W,Vt=!0)}for(let ye=0;ye<16;ye++)ue.transform[ye]=w.matrixWorld.elements[ye];Vt&&ue.markTransformsUpdated(),Bt&&ue.markColorsUpdated(),ue.name=w.name||`Mesh ${a.length+1}${fe.length>1?`.${de+1}`:""}`,dt>0&&(a.push(ue),e.onMeshConverted?.(ue,w,Qe,de))}else{$e=c(We,me,Fe,Ye);let Pe=t.meshes.get(w);Pe||(Pe=new Map,t.meshes.set(w,Pe));let Re=Pe.get(de);Re||(Re=new Ii(pe,$e),Re.transform=w.matrixWorld.elements.slice(),Pe.set(de,Re)),Re.geometry=pe,Re.materials[0]!==$e&&(Re.materials=[$e]),Re.name=w.name||`Mesh ${a.length+1}${fe.length>1?`.${de+1}`:""}`;for(let ue=0;ue<16;ue++)Re.transform[ue]=w.matrixWorld.elements[ue];a.push(Re),e.onMeshConverted?.(Re,w,Qe,de)}})}}else if(p(w)){let N=new PA({color:w.color.toArray(),intensity:w.intensity});N.transform=Array.from(N.transform),N.position=w.getWorldPosition(w.position.clone()).toArray(),N.lookAt(w.target.getWorldPosition(w.target.position.clone()).toArray()),r.push(zA(t,w,N))}else if(v(w)){let N=w.matrixWorld.clone(),H=w.getWorldQuaternion(w.quaternion.clone()).normalize(),ee=w.getWorldPosition(w.position.clone()),te=N.elements,Y=Math.hypot(te[0],te[1],te[2]),ne=Math.hypot(te[4],te[5],te[6]),Le=new DA({size:[w.width*Y,w.height*ne],color:w.color.toArray(),intensity:w.intensity});N.compose(ee,H,w.scale.clone().set(1,1,1)),Le.transform=N.elements.slice(),r.push(zA(t,w,Le))}else if(B(w)){let N=w.getWorldPosition(w.position.clone()),H=w.target.getWorldPosition(w.target.position.clone()),ee=w.angle*180/Math.PI,te=w.userData.mutracerIesProfile;if(te!=null&&!(te instanceof Ki))throw new Error(`THREE.SpotLight "${w.name||"<unnamed>"}" has an invalid mutracerIesProfile`);let Y=new RA({color:w.color.toArray(),intensity:w.intensity,radius:w.userData.mutracerRadius??.01,innerAngle:ee*(1-w.penumbra),outerAngle:ee,iesProfile:te});Y.transform=Array.from(Y.transform),Y.position=N.toArray(),Y.lookAt(H.toArray());let ne=-(w.userData.mutracerIesRotation??0)*Math.PI/180;ne&&oe.rotateZ(Y.transform,Y.transform,ne),r.push(zA(t,w,Y))}else if(h(w)){let N=w.matrixWorld.elements,H=[N[12],N[13],N[14]];r.push(zA(t,w,Object.assign(new TA({color:w.color.toArray(),intensity:w.intensity,radius:w.userData.mutracerRadius??.25}),{transform:[1,0,0,0,0,1,0,0,0,0,1,0,...H,1]})))}else g(w)&&r.push(zA(t,w,new SA({color:w.color.toArray(),intensity:w.intensity})))});let E=i.environment,x=e.environment??js(E,t.equirectTextures),y=e.environment??E,M=y&&x?zA(t,y,new UA({map:x,intensity:i.environmentIntensity})):void 0;M&&(M.transform=i.matrix.clone().makeRotationFromEuler(i.environmentRotation).elements.slice(),r.push(M));let b=i.userData.mutracerGroundedSkybox,T=b&&(b.texture instanceof Ke?b.texture:js(b.texture,t.equirectTextures)),R=i.userData.mutracerHiddenBackground===!0?[0,0,0,0]:b&&T?{type:"GroundedSkybox",map:T,height:b.height,radius:b.radius,groundHeight:b.groundHeight,center:b.center,rotation:b.rotation,intensity:b.intensity}:i.background?i.background.isColor?[...i.background.toArray(),1]:i.background===i.environment&&M?M.map:js(i.background,t.equirectTextures):void 0,D=i.backgroundRotation,L=!!D&&(D.x!==0||D.y!==0||D.z!==0),se=i.backgroundIntensity??1;R instanceof Ke&&(L||se!==1)&&(R={type:"Equirect",map:R,transform:L?i.matrix.clone().makeRotationFromEuler(D).elements.slice():void 0,intensity:se!==1?se:void 0});let q=t.background;Array.isArray(R)&&Array.isArray(q)&&mt(R,q)?R=q:R&&q&&!Array.isArray(R)&&!Array.isArray(q)&&!(R instanceof Ke)&&!(q instanceof Ke)&&R.type===q.type&&(mt(Zt(R).slice(1),Zt(q).slice(1))||Object.assign(q,R),R=q),t.background=R;let re=new Set(a.flatMap(w=>w.materials));for(let[w,N]of t.projectionVariants){for(let[H,ee]of N)re.has(ee.material)||N.delete(H);N.size||t.projectionVariants.delete(w)}return{background:R,meshes:a,lights:r}}function Vs(i,e){if(!i||!e.getPolarAngle||!e.getAzimuthalAngle)return;i.parent?.updateWorldMatrix(!0,!1);let t=[i,e.update,i.parent,...i.position.toArray(),...i.quaternion.toArray(),...i.scale.toArray(),...i.up.toArray(),i.zoom,...i.parent?.matrixWorld.elements??[]];for(let[A,a]of Object.entries(e)){if(A.startsWith("_")||A==="state")continue;let r=a;r?.isVector3?t.push(A,...r.toArray()):(typeof a=="number"||typeof a=="boolean"||typeof a=="string")&&t.push(A,a)}return t}var Js=class extends OA{_options;scene;_camera;_store=qs();_disposed=!1;_started=!1;_gestureChanged=!1;_cameraState=[];_lastUpdate;_idleControlsState;_start=()=>{this._started=!0,this._gestureChanged=!1};_end=()=>{this._started=!1};constructor(e,t={}){super(e),this._options=t,t.scene&&(this.scene={meshes:[],lights:[]}),t.controls?.addEventListener("start",this._start),t.controls?.addEventListener("end",this._end)}update(){if(this._disposed)throw new Error("THREESync has been disposed");let e=performance.now(),t=this._options.controls,A=this._options.camera,a=this._lastUpdate===void 0?0:Math.max(0,(e-this._lastUpdate)/1e3),r=Math.min(.1,a);this._lastUpdate=e;let n=!1,s=!1;if(t&&this._options.updateControls!==!1){let l=Vs(A,t);if(!((!this._started||!this._gestureChanged)&&!t.autoRotate&&l&&this._idleControlsState&&mt(l,this._idleControlsState))){this._idleControlsState=void 0;let f=A?.position.clone(),m=A?.quaternion.clone(),d=A?.zoom,u=t.target?.clone(),p=t.dampingFactor,g=t.enableDamping&&p!==void 0&&p>=0&&p<=1?1-Math.pow(1-p,a*60):void 0;g!==void 0&&(t.dampingFactor=g);try{n=!!t.update(r)}finally{g!==void 0&&(t.dampingFactor=p)}if(!this._started&&!t.autoRotate&&t.enableDamping&&f&&A&&t.target){let v=g?p/g:1,h=f.distanceTo(A.position)*v,B=Math.abs(Math.log(A.zoom/d))*v,E=h>0||A.zoom!==d||!!(l&&(!m.equals(A.quaternion)||!u.equals(t.target)));if((n||E)&&h<5e-4*A.position.distanceTo(t.target)&&B<5e-4){t.enableDamping=!1;try{t.update(0)}finally{t.enableDamping=!0}n=!1,s=!0}l&&(s||!n&&!E)&&(this._idleControlsState=Vs(A,t))}else l&&!this._started&&!t.autoRotate&&!n&&(this._idleControlsState=Vs(A,t))}}if(this._store.poseChanged=!1,this._options.scene&&this.scene){let l=Xl(this._options.scene,this._options,this._store);mt(this.scene.meshes,l.meshes)||(this.scene.meshes=l.meshes),mt(this.scene.lights,l.lights)||(this.scene.lights=l.lights),this.scene.background=l.background,this.engine.scene=this.scene}let o=!1;if(A){A.updateWorldMatrix(!0,!1);let l=Zl(A),c=Zt(l).slice(1);o=this._cameraState.length>0&&!mt(c,this._cameraState),this._cameraState=c,this._camera?this._camera.copy(l):this._camera=l,this.engine.camera=this._camera}this._started&&(n||o)&&(this._gestureChanged=!0),this.setActive(this._started&&this._gestureChanged||n||this._store.poseChanged||o&&!s)}dispose(){this._disposed||(this._options.controls?.removeEventListener("start",this._start),this._options.controls?.removeEventListener("end",this._end),this._store=qs(),this._idleControlsState=void 0,this._disposed=!0,super.dispose())}};function Zl(i,e={}){let t=i.fov?new Yi({projection:"perspective",fov:i.fov,aspect:i.aspect,near:i.near,far:i.far}):new Yi({projection:"orthographic",left:i.left,right:i.right,bottom:i.bottom,top:i.top,near:i.near,far:i.far});i.updateWorldMatrix(!0,!1),t.zoom=i.zoom,t.transform=i.matrixWorld.elements.slice();let A=i;if(A.isPerspectiveCamera){A.focus>0&&(t.focusDistance=A.focus);let a=A.getFilmHeight();a>0&&(t.sensorHeight=a)}return e.fStop!==void 0&&(t.fStop=e.fStop),e.focusDistance!==void 0&&(t.focusDistance=e.focusDistance),e.metersPerUnit!==void 0&&(t.metersPerUnit=e.metersPerUnit),t}function ip(i=40,e=20,t=0,A=Math.PI*2,a=0,r=Math.PI){let n=[],s=[],o=[],l=[];for(let B=0;B<=e;B++)for(let E=0;E<=i;E++){let x=E/i,y=B/e,M=-1*Math.cos(t+x*A)*Math.sin(a+y*r),b=1*Math.cos(a+y*r),T=1*Math.sin(t+x*A)*Math.sin(a+y*r);n.push(M,b,T),s.push(x,y),o.push(M*1,b*1,T*1)}let m,d,u,p,g=i+1,v=0;for(let B=0;B<e;B++)for(let E=0;E<i;E++)d=B*g+E,m=B*g+E+1,p=(B+1)*g+E+1,u=(B+1)*g+E,l[v++]=m,l[v++]=d,l[v++]=p,l[v++]=d,l[v++]=u,l[v++]=p;let h=new Ge({uv:new X(new Float32Array(s),2),position:new X(new Float32Array(n),3),normal:new X(new Float32Array(o),3),indices:new X(new Uint32Array(l),1)});return S.set(h.boundingBox.min,-1,-1,-1),S.set(h.boundingBox.max,1,1,1),h}function Ap(i=1,e=1,t="horizontal"){let A=[],a=[],r=[],n=[],s=t==="vertical";for(let l=0;l<=e;l++){let c=l/e;for(let f=0;f<=i;f++){let m=f/i;if(s?(A.push(2*m-1,2*c-1,0),r&&r.push(0,0,1)):(A.push(2*c-1,0,2*m-1),r&&r.push(0,1,0)),a&&a.push(m,c),f<i&&l<e){let d=f+l*(i+1);n.push(d,d+1,d+i+1),n.push(d+i+1,d+1,d+i+2)}}}let o=new Ge({uv:new X(new Float32Array(a),2),position:new X(new Float32Array(A),3),normal:new X(new Float32Array(r),3),indices:new X(new Uint32Array(n),1)});return s?(S.set(o.boundingBox.min,-1,-1,0),S.set(o.boundingBox.max,1,1,0)):(S.set(o.boundingBox.min,-1,0,-1),S.set(o.boundingBox.max,1,0,1)),o}function ap(i=1,e=1,t=1){let A=[],a=[],r=[],n=[],s=0,o=1,l=1,c=1;f(2,1,0,-1,-1,c,l,o,t,e),f(2,1,0,1,-1,c,l,-o,t,e),f(0,2,1,1,1,o,c,l,i,t),f(0,2,1,1,-1,o,c,-l,i,t),f(0,1,2,1,-1,o,l,c,i,e),f(0,1,2,-1,-1,o,l,-c,i,e);function f(d,u,p,g,v,h,B,E,x,y){let M=h/x,b=B/y,T=h/2,O=B/2,R=E/2,D=x+1,L=y+1,se=0,q=S.create();for(let re=0;re<L;re++){let w=re*b-O;for(let N=0;N<D;N++){let H=N*M-T;q[d]=H*g,q[u]=w*v,q[p]=R,a.push(q[0],q[1],q[2]),q[d]=0,q[u]=0,q[p]=E>0?1:-1,r.push(q[0],q[1],q[2]),n.push(N/x),n.push(1-re/y),se+=1}}for(let re=0;re<y;re++)for(let w=0;w<x;w++){let N=s+w+D*re,H=s+w+D*(re+1),ee=s+(w+1)+D*(re+1),te=s+(w+1)+D*re;A.push(N,H,te),A.push(H,ee,te)}s+=se}let m=new Ge({uv:new X(new Float32Array(n),2),position:new X(new Float32Array(a),3),normal:new X(new Float32Array(r),3),indices:new X(new Uint32Array(A),1)});return S.set(m.boundingBox.min,-1,-1,-1),S.set(m.boundingBox.max,1,1,1),m}function rp(i=.2){let e=[],t=[],r=[],n=i/Math.PI*2,s=(1-i)/2,o=0;for(let c=0;c<=200;c++){let f,m,d=c/200;if(!(d>0&&d<=s-1/200||d>=s+i+1/200&&d<1)){if(d<=s)f=0,m=n+s-d;else if(d>=s+i)f=d-s-i+n,m=0;else{let u=(d-s)/i*Math.PI/2;f=(1-Math.cos(u))*n,m=(1-Math.sin(u))*n}for(let u=0;u<=5;u++){let p=u/5,g=2*p-1;if(t.push(g,f*2,m*2),r.push(p,d),u<5&&c<200){let v=u+o*6;e.push(v,v+1,v+5+1),e.push(v+5+1,v+1,v+5+2)}}o++}}let l=new Ge({uv:new X(new Float32Array(r),2),position:new X(new Float32Array(t),3),indices:new X(new Uint32Array(e),1)});return va(l),Vi(l),l}var hi=S.create(),gi=S.create(),vi=S.create(),Bi=S.create(),Ei=S.create(),wi=S.create(),_i=Math.min,xi=Math.max;function ec(i,e,t){let A=e.min,a=e.max;hi[0]=t[0]*A[0],hi[1]=t[1]*A[0],hi[2]=t[2]*A[0],gi[0]=t[0]*a[0],gi[1]=t[1]*a[0],gi[2]=t[2]*a[0],vi[0]=t[4]*A[1],vi[1]=t[5]*A[1],vi[2]=t[6]*A[1],Bi[0]=t[4]*a[1],Bi[1]=t[5]*a[1],Bi[2]=t[6]*a[1],Ei[0]=t[8]*A[2],Ei[1]=t[9]*A[2],Ei[2]=t[10]*A[2],wi[0]=t[8]*a[2],wi[1]=t[9]*a[2],wi[2]=t[10]*a[2],A=i.min,a=i.max,A[0]=_i(hi[0],gi[0])+_i(vi[0],Bi[0])+_i(Ei[0],wi[0])+t[12],A[1]=_i(hi[1],gi[1])+_i(vi[1],Bi[1])+_i(Ei[1],wi[1])+t[13],A[2]=_i(hi[2],gi[2])+_i(vi[2],Bi[2])+_i(Ei[2],wi[2])+t[14],a[0]=xi(hi[0],gi[0])+xi(vi[0],Bi[0])+xi(Ei[0],wi[0])+t[12],a[1]=xi(hi[1],gi[1])+xi(vi[1],Bi[1])+xi(Ei[1],wi[1])+t[13],a[2]=xi(hi[2],gi[2])+xi(vi[2],Bi[2])+xi(Ei[2],wi[2])+t[14]}function np(i){let e={min:S.fromValues(1/0,1/0,1/0),max:S.fromValues(-1/0,-1/0,-1/0)},t={min:S.create(),max:S.create()};return i.forEach(A=>{ec(t,A.geometry.boundingBox,A.transform),S.min(e.min,e.min,t.min),S.max(e.max,e.max,t.max)}),e}var ya=["map","alphaMap","normalMap","emissiveMap","metallicRoughnessMap","roughnessMap","metalnessMap","transmissionMap","thinFilmMap","displacementMap","coatWeightMap","coatRoughnessMap","fuzzColorMap","fuzzRoughnessMap","specularWeightMap","specularColorMap","anisotropyMap","coatNormalMap"];function z(i,e,t,A=!1){return{name:i,source:e,type:t,reserved:A}}var Ca=[{name:"COLOR",fields:[z("color","color","vec3f"),z("matType","type","f32")]},{name:"ROUGHNESS_NORMAL",fields:[z("roughness","roughness","f32"),z("normalMapIndex","normalMapIndex","f32"),z("normalMapScale","normalScale","vec2f")]},{name:"METALLIC_MAPS",fields:[z("metallic","metallic","f32"),z("anisotropy","anisotropy","f32"),z("diffuseMapIndex","diffuseMapIndex","f32"),z("mrtMapIndex","metallicRoughnessMapIndex","f32")]},{name:"EMISSION",fields:[z("emission","emission","vec3f"),z("emissiveMapIndex","emissiveMapIndex","f32")]},{name:"IOR_TRANSMISSION",fields:[z("ior","ior","f32"),z("transmission","transmission","f32"),z("mediumType","mediumType","f32",!0),z("thin","thin","f32")]},{name:"MISC",fields:[z("bevel","bevelSize","f32"),z("dispersion","dispersion","f32"),z("thinFilmThickness","thinFilmThickness","f32"),z("mapAlphaUsage","mapAlphaUsage","f32")]},{name:"LAYER_MAPS",fields:[z("coatWeightMapIndex","coatWeightMapIndex","f32"),z("coatRoughnessMapIndex","coatRoughnessMapIndex","f32"),z("coatNormalMapIndex","coatNormalMapIndex","f32"),z("fuzzColorMapIndex","fuzzColorMapIndex","f32")]},{name:"UV",fields:[z("uvProjection","uvProjection","f32"),z("displacementMapIndex","displacementMapIndex","f32"),z("uvScale","uvScale","vec2f")]},{name:"DISPLACEMENT",fields:[z("displacementStepSize","displacementStepSize","f32"),z("displacementBias","displacementBias","f32"),z("displacementUvProjection","displacementUvProjection","f32"),z("displacementUvProjectionScale","displacementUvProjectionScale","f32")]},{name:"ALPHA_FILM",fields:[z("alpha","alpha","f32"),z("thinFilmMapIndex","thinFilmMapIndex","f32"),z("thinFilmIor","thinFilmIor","f32"),z("transmissionMapIndex","transmissionMapIndex","f32")]},{name:"BASE_CONTROLS",fields:[z("baseWeight","baseWeight","f32"),z("baseDiffuseRoughness","baseDiffuseRoughness","f32"),z("specularWeight","specularWeight","f32"),z("subsurfaceWeight","subsurfaceWeight","f32")]},{name:"SPECULAR_FUZZ",fields:[z("specularColor","specularColor","vec3f"),z("fuzzWeight","fuzzWeight","f32")]},{name:"TRANSMISSION_COLOR",fields:[z("transmissionColor","transmissionColor","vec3f"),z("transmissionDepth","transmissionDepth","f32")]},{name:"TRANSMISSION_SCATTER",fields:[z("transmissionScatter","transmissionScatter","vec3f"),z("transmissionScatterAnisotropy","transmissionScatterAnisotropy","f32")]},{name:"SUBSURFACE",fields:[z("subsurfaceColor","subsurfaceColor","vec3f"),z("subsurfaceRadius","subsurfaceRadius","f32")]},{name:"FUZZ",fields:[z("fuzzColor","fuzzColor","vec3f"),z("fuzzRoughness","fuzzRoughness","f32")]},{name:"COAT",fields:[z("coatColor","coatColor","vec3f"),z("coatWeight","coatWeight","f32")]},{name:"COAT_CONTROLS",fields:[z("coatRoughness","coatRoughness","f32"),z("coatAnisotropy","coatAnisotropy","f32"),z("coatIor","coatIor","f32"),z("coatDarkening","coatDarkening","f32")]},{name:"FILM_DISPERSION",fields:[z("thinFilmWeight","thinFilmWeight","f32"),z("dispersionAbbeNumber","dispersionAbbeNumber","f32"),z("subsurfaceScatterAnisotropy","subsurfaceScatterAnisotropy","f32"),z("fuzzRoughnessMapIndex","fuzzRoughnessMapIndex","f32")]},{name:"SUBSURFACE_RADIUS",fields:[z("subsurfaceRadiusScale","subsurfaceRadiusScale","vec3f"),z("specularWeightMapIndex","specularWeightMapIndex","f32")]},{name:"MEDIUM_EXTINCTION",fields:[z("mediumExtinction","mediumExtinction","vec3f"),z("mediumAnisotropy","mediumAnisotropy","f32")]},{name:"MEDIUM_SCATTERING",fields:[z("mediumScattering","mediumScattering","vec3f"),z("specularColorMapIndex","specularColorMapIndex","f32")]},{name:"STANDALONE_MAPS",fields:[z("roughnessMapIndex","roughnessMapIndex","f32"),z("metalnessMapIndex","metalnessMapIndex","f32"),z("alphaMapIndex","alphaMapIndex","f32"),z("alphaCutoff","alphaCutoff","f32")]},{name:"ALPHA",fields:[z("_padding1",null,"f32",!0),z("_padding2",null,"f32",!0),z("doubleSided","doubleSided","f32"),z("alphaMode","alphaMode","f32")]},{name:"DIRECTION_NORMAL",fields:[z("anisotropyMapIndex","anisotropyMapIndex","f32"),z("specularAnisotropyRotation","specularAnisotropyRotation","f32"),z("coatNormalScale","coatNormalScale","vec2f")]},{name:"FILM_TEXTURE",fields:[z("coatAnisotropyRotation","coatAnisotropyRotation","f32"),z("specularAnisotropyModel","specularAnisotropyModel","f32"),z("thinFilmThicknessMinimum","thinFilmThicknessMinimum","f32"),z("thinFilmMapChannel","thinFilmMapChannel","f32")]}],$s=Ca.length,kA=$s*4,Ks={f32:1,vec2f:2,vec3f:3};function Ma(){return Ca.flatMap((i,e)=>{let t=0;return i.fields.map(A=>{let a=e*16+t*4;return t+=Ks[A.type],{name:A.name,source:A.source,type:A.type,reserved:A.reserved,row:e,component:a%16/4,offset:a}})})}function tc(){let i=0,e=Ma().map(t=>{let A=t.type==="vec3f"?16:Ks[t.type]*4,a=Math.ceil(i/A)*A;if(a!==t.offset)throw new Error(`Misaligned material field: ${t.name}`);return i=a+Ks[t.type]*4,`  ${t.name}: ${t.type},`});if(Math.ceil(i/16)*16!==$s*16)throw new Error("Invalid material buffer size");return`struct MaterialBuffer {
${e.join(`
`)}
};`}function ic(){return[`const int MAT_DATA_SIZE = ${$s};`,...Ca.map((i,e)=>`const int MAT_ROW_${i.name} = ${e};`)].join(`
`)}var sp=[{property:"map",index:"diffuseMapIndex",target:"baseColor/alpha/transmissionWeight",channel:"rgb/a",colorSpace:"srgb",operation:"custom",define:"NUM_DIFFUSE_MAPS",feature:"USE_DIFFUSE_MAPS",featureBit:2**1,sampling:"manual"},{property:"alphaMap",index:"alphaMapIndex",target:"alpha",channel:"g",colorSpace:"linear",operation:"multiply",define:"NUM_ALPHA_MAPS",feature:"USE_ALPHA_MAPS",featureBit:2**2,sampling:"multiply"},{property:"normalMap",index:"normalMapIndex",target:"normal",channel:"rgb",colorSpace:"linear",operation:"custom",define:"NUM_NORMAL_MAPS",feature:"USE_NORMAL_MAPS",featureBit:2**9,sampling:"manual"},{property:"emissiveMap",index:"emissiveMapIndex",target:"emission",channel:"rgb",colorSpace:"srgb",operation:"custom",define:"NUM_EMISSIVE_MAPS",feature:"USE_EMISSIVE_MAPS",featureBit:2**7,sampling:"manual"},{property:"metallicRoughnessMap",index:"metallicRoughnessMapIndex",target:"baseMetalness/specularRoughness",channel:"b/g",colorSpace:"linear",operation:"custom",define:"NUM_METALLIC_ROUGHNESS_MAPS",feature:"USE_METALLIC_ROUGHNESS_MAPS",featureBit:2**3,sampling:"manual"},{property:"roughnessMap",index:"roughnessMapIndex",target:"specularRoughness",channel:"g",colorSpace:"linear",operation:"multiply",define:"NUM_ROUGHNESS_MAPS",feature:"USE_ROUGHNESS_MAPS",featureBit:2**4,sampling:"multiply"},{property:"metalnessMap",index:"metalnessMapIndex",target:"baseMetalness",channel:"b",colorSpace:"linear",operation:"multiply",define:"NUM_METALNESS_MAPS",feature:"USE_METALNESS_MAPS",featureBit:2**5,sampling:"multiply"},{property:"transmissionMap",index:"transmissionMapIndex",target:"transmissionWeight",channel:"r",colorSpace:"linear",operation:"multiply",define:"NUM_TRANSMISSION_MAPS",feature:"USE_TRANSMISSION_MAPS",featureBit:2**6,sampling:"multiply"},{property:"thinFilmMap",index:"thinFilmMapIndex",target:"thinFilmThickness",channel:"per-material",colorSpace:"linear",operation:"custom",define:"NUM_THIN_FILM_MAPS",feature:"USE_THIN_FILM_MAPS",featureBit:2**8,sampling:"manual"},{property:"displacementMap",index:"displacementMapIndex",target:"displacement",channel:"r",colorSpace:"linear",operation:"custom",define:null,feature:null,featureBit:0,sampling:"manual"},{property:"coatWeightMap",index:"coatWeightMapIndex",target:"coatWeight",channel:"r",colorSpace:"linear",operation:"multiply",define:"NUM_COAT_WEIGHT_MAPS",feature:"USE_COAT_WEIGHT_MAPS",featureBit:2**15,sampling:"multiply"},{property:"coatRoughnessMap",index:"coatRoughnessMapIndex",target:"coatRoughness",channel:"g",colorSpace:"linear",operation:"multiply",define:"NUM_COAT_ROUGHNESS_MAPS",feature:"USE_COAT_ROUGHNESS_MAPS",featureBit:2**16,sampling:"multiply"},{property:"fuzzColorMap",index:"fuzzColorMapIndex",target:"fuzzColor",channel:"rgb",colorSpace:"srgb",operation:"multiply",define:"NUM_FUZZ_COLOR_MAPS",feature:"USE_FUZZ_COLOR_MAPS",featureBit:2**18,sampling:"multiply"},{property:"fuzzRoughnessMap",index:"fuzzRoughnessMapIndex",target:"fuzzRoughness",channel:"a",colorSpace:"linear",operation:"multiply",define:"NUM_FUZZ_ROUGHNESS_MAPS",feature:"USE_FUZZ_ROUGHNESS_MAPS",featureBit:2**19,sampling:"multiply"},{property:"specularWeightMap",index:"specularWeightMapIndex",target:"specularWeight",channel:"a",colorSpace:"linear",operation:"multiply",define:"NUM_SPECULAR_WEIGHT_MAPS",feature:"USE_SPECULAR_WEIGHT_MAPS",featureBit:2**20,sampling:"multiply"},{property:"specularColorMap",index:"specularColorMapIndex",target:"specularColor",channel:"rgb",colorSpace:"srgb",operation:"multiply",define:"NUM_SPECULAR_COLOR_MAPS",feature:"USE_SPECULAR_COLOR_MAPS",featureBit:2**21,sampling:"multiply"},{property:"anisotropyMap",index:"anisotropyMapIndex",target:"specularAnisotropy/direction",channel:"rg/b",colorSpace:"linear",operation:"custom",define:"NUM_ANISOTROPY_MAPS",feature:"USE_ANISOTROPY_MAPS",featureBit:2**22,sampling:"manual"},{property:"coatNormalMap",index:"coatNormalMapIndex",target:"coatNormal",channel:"rgb",colorSpace:"linear",operation:"custom",define:"NUM_COAT_NORMAL_MAPS",feature:"USE_COAT_NORMAL_MAPS",featureBit:2**17,sampling:"manual"}];var Ac=sp,Xi=Ac.map(i=>{let e=Ma().find(t=>t.source===i.index);if(!e)throw new Error(`Missing packed texture index: ${i.property}`);return{property:i.property,index:i.index,target:i.target,channel:i.channel,colorSpace:i.colorSpace,operation:i.operation,define:i.define,feature:i.feature,featureBit:i.featureBit,sampling:i.sampling,packed:{row:e.row,component:e.component,wgslField:e.name,glslRow:`MAT_ROW_${Ca[e.row].name}`,glslComponent:"xyzw"[e.component]}}}),Xs={},Zs=[];for(let i of Ac)i.feature&&(Xs[i.feature]=i.featureBit),i.define&&Zs.push(i.define);function ac(i){let e={};for(let t of Xi)t.feature&&t.define&&(e[t.feature]=Number(i[t.define])>0);return e}function Ve(i,e){let t=Xi.find(r=>r.property===i);if(!t||t.sampling!=="multiply")throw new Error(`Handwritten texture slot: ${i}`);let A=t.index,a=r=>t.colorSpace==="srgb"?`decodeMapColor(${A}, ${r})`:r;return e==="wgsl"?`
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
`}function Ur(i){let e=Xi.find(t=>t.property==="thinFilmMap");return i==="wgsl"?`
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
`}function Lr(i,e){let t={textures:[],indices:{}};for(let A of e)t.indices[A]=op(i,A,t.textures);return t}function op(i,e,t){let A=[];for(let a of i)if(!(a[e]&&a[e].image))A.push(-1);else{let n=t.indexOf(a[e]);n>=0?A.push(n):(A.push(t.length),t.push(a[e]))}return A}function Si(i){let e=[i.emissionColor[0]*i.emissionLuminance,i.emissionColor[1]*i.emissionLuminance,i.emissionColor[2]*i.emissionLuminance];if(i.unlit||i.shadowCatcher||i.coatWeight<=0||i.coatWeightMap)return e;let t=Math.min(i.coatWeight,1);return e[0]=e[0]*(1+t*(Math.sqrt(Math.max(i.coatColor[0],0))-1)),e[1]=e[1]*(1+t*(Math.sqrt(Math.max(i.coatColor[1],0))-1)),e[2]=e[2]*(1+t*(Math.sqrt(Math.max(i.coatColor[2],0))-1)),e}function GA(i){return!i.thinWalled&&(i.transmissionWeight>0&&i.transmissionDepth>0||i.subsurfaceWeight>0)}function eo(i,e){let t=Number(i);return Number.isFinite(t)?Math.min(1,Math.max(0,t)):e}function Ht(i,e=0){return[eo(i[0],e),eo(i[1],e),eo(i[2],e)]}function ei(i,e){return e===0?i[0]:e===1?i[1]:i[2]}function Or(i,e){return[e(i[0],0),e(i[1],1),e(i[2],2)]}function rc(i){return[i(0),i(1),i(2)]}function lp(){return{anisotropy:0,extinction:[0,0,0],scattering:[0,0,0]}}function cp(i){let e=Math.min(1,Math.max(0,i.transmissionWeight)),t=Math.max(0,i.transmissionDepth);if(e<=0||t<=0||i.thinWalled)return;let A=Ht(i.transmissionColor,1),a=Ht(i.transmissionScatter),r=Or(A,s=>Math.max(0,-Math.log(Math.max(s,1e-6))/t)),n=Or(a,(s,o)=>ei(r,o)*s);return{anisotropy:Math.min(.999,Math.max(-.999,i.transmissionScatterAnisotropy)),extinction:r,scattering:n}}function fp(i){if(Math.min(1,Math.max(0,i.subsurfaceWeight))<=0||i.thinWalled)return;let t=Math.max(i.subsurfaceRadius,.001),A=Ht(i.subsurfaceRadiusScale,1),a=Ht(i.subsurfaceColor),r=Math.min(.999,Math.max(-.999,i.subsurfaceAnisotropy)),n=Or(A,o=>1/Math.max(t*o,.001)),s=Or(a,(o,l)=>{let c=4.09712+4.20863*o-Math.sqrt(9.59217+41.6808*o+17.7126*o*o),f=c*c,m=Math.min(1,Math.max(0,(1-f)/(1-r*f)));return ei(n,l)*m});return{anisotropy:r,extinction:n,scattering:s}}function up(i,e,t){let A=e?Math.min(1,Math.max(0,i.transmissionWeight)):0,a=t?(1-A)*Math.min(1,Math.max(0,i.subsurfaceWeight)):0,r=A+a;if(r<=0)return;let n=A/r,s=a/r,o=rc(f=>{let m=e?ei(e.extinction,f)-ei(e.scattering,f):0,d=t?ei(t.extinction,f)-ei(t.scattering,f):0,u=m*n+d*s,p=((e?ei(e.scattering,f):0)||0)*n+((t?ei(t.scattering,f):0)||0)*s;return Math.max(0,u+p)}),l=rc(f=>((e?ei(e.scattering,f):0)||0)*n+((t?ei(t.scattering,f):0)||0)*s);return{anisotropy:(e?.anisotropy||0)*n+(t?.anisotropy||0)*s,extinction:o,scattering:l}}function dp(i){return up(i,cp(i),fp(i))??lp()}function oc(i){let e=i.map(dp);return{color:i.map(t=>[t.baseColor[0],t.baseColor[1],t.baseColor[2]]),roughness:i.map(t=>t.specularAnisotropyModel==="gltf"?Qs(t.specularRoughness,.3):t.specularRoughness),emission:i.map(Si),metallic:i.map(t=>t.baseMetalness),ior:i.map(t=>t.specularIor),dispersion:i.map(t=>t.transmissionDispersionScale),thin:i.map(t=>Number(t.thinWalled)),bevelSize:i.map(t=>t.bevelSize),transmission:i.map(t=>t.transmissionWeight),anisotropy:i.map(t=>t.specularAnisotropyModel==="gltf"?Qs(t.specularAnisotropy,0):t.specularAnisotropy),specularAnisotropyModel:i.map(t=>QA(t.specularAnisotropyModel)),thinFilmThickness:i.map(t=>Is(t.thinFilmThickness,.5)),thinFilmThicknessMinimum:i.map(t=>Is(t.thinFilmThicknessMinimum,0)),thinFilmMapChannel:i.map(t=>IA(t.thinFilmMapChannel)),thinFilmIor:i.map(t=>t.thinFilmIor),normalScale:i.map(t=>t.normalScale),mapAlphaUsage:i.map(t=>Pt[t.mapAlphaUsage]),type:i.map(t=>t.shadowCatcher?3:t.unlit?2:0),mediumType:i.map(t=>Number(GA(t))),specularAnisotropyRotation:i.map(t=>Number.isFinite(t.specularAnisotropyRotation)?t.specularAnisotropyRotation:0),coatAnisotropyRotation:i.map(t=>Number.isFinite(t.coatAnisotropyRotation)?t.coatAnisotropyRotation:0),coatNormalScale:i.map(t=>t.coatNormalScale),uvProjection:i.map(t=>ot[t.uvProjection]||0),uvScale:i.map(t=>t.uvProjectionScale||[1,1]),displacementUvProjection:i.map(t=>ot[t.displacementUvProjection]||0),displacementUvProjectionScale:i.map(t=>t.displacementUvProjectionScale||1),displacementBias:i.map(t=>t.displacementBias),displacementStepSize:i.map(t=>Number.isFinite(t.displacementStepSize)&&t.displacementStepSize>0?t.displacementStepSize:0),alpha:i.map(t=>t.opacity),alphaMode:i.map(t=>It[di(t)]),alphaCutoff:i.map(t=>Math.max(0,t.alphaCutoff)),doubleSided:i.map(t=>Number(t.doubleSided)),baseWeight:i.map(t=>t.baseWeight),baseDiffuseRoughness:i.map(t=>t.baseDiffuseRoughness),specularWeight:i.map(t=>t.specularWeight),specularColor:i.map(t=>Ht(t.specularColor,1)),transmissionColor:i.map(t=>Ht(t.transmissionColor,1)),transmissionDepth:i.map(t=>Math.max(0,t.transmissionDepth)),transmissionScatter:i.map(t=>Ht(t.transmissionScatter)),transmissionScatterAnisotropy:i.map(t=>t.transmissionScatterAnisotropy),subsurfaceWeight:i.map(t=>t.subsurfaceWeight),subsurfaceColor:i.map(t=>Ht(t.subsurfaceColor)),subsurfaceRadius:i.map(t=>Math.max(0,t.subsurfaceRadius)),subsurfaceRadiusScale:i.map(t=>Ht(t.subsurfaceRadiusScale)),subsurfaceScatterAnisotropy:i.map(t=>t.subsurfaceAnisotropy),fuzzWeight:i.map(t=>t.fuzzWeight),fuzzColor:i.map(t=>Ht(t.fuzzColor,1)),fuzzRoughness:i.map(t=>t.fuzzRoughness),coatWeight:i.map(t=>t.coatWeight),coatColor:i.map(t=>Ht(t.coatColor,1)),coatRoughness:i.map(t=>t.coatRoughness),coatAnisotropy:i.map(t=>t.coatAnisotropy),coatIor:i.map(t=>t.coatIor),coatDarkening:i.map(t=>t.coatDarkening),thinFilmWeight:i.map(t=>t.thinFilmWeight),dispersionAbbeNumber:i.map(t=>t.transmissionDispersionAbbeNumber),mediumExtinction:e.map(t=>t.extinction),mediumScattering:e.map(t=>t.scattering),mediumAnisotropy:e.map(t=>t.anisotropy)}}function Fr(i){return{...oc(i),diffuseMapIndex:[],alphaMapIndex:[],normalMapIndex:[],emissiveMapIndex:[],metallicRoughnessMapIndex:[],roughnessMapIndex:[],metalnessMapIndex:[],transmissionMapIndex:[],thinFilmMapIndex:[],displacementMapIndex:[],coatWeightMapIndex:[],coatRoughnessMapIndex:[],fuzzColorMapIndex:[],fuzzRoughnessMapIndex:[],specularWeightMapIndex:[],specularColorMapIndex:[],anisotropyMapIndex:[],coatNormalMapIndex:[],mapInfo:[],mapTransform:[],mapWrap:[],mapUvChannel:[],mapColorLinear:[]}}function HA(i,e){let t=oc(e);i.color=t.color,i.roughness=t.roughness,i.emission=t.emission,i.metallic=t.metallic,i.ior=t.ior,i.dispersion=t.dispersion,i.thin=t.thin,i.bevelSize=t.bevelSize,i.transmission=t.transmission,i.anisotropy=t.anisotropy,i.specularAnisotropyModel=t.specularAnisotropyModel,i.thinFilmThickness=t.thinFilmThickness,i.thinFilmThicknessMinimum=t.thinFilmThicknessMinimum,i.thinFilmMapChannel=t.thinFilmMapChannel,i.thinFilmIor=t.thinFilmIor,i.normalScale=t.normalScale,i.mapAlphaUsage=t.mapAlphaUsage,i.type=t.type,i.mediumType=t.mediumType,i.specularAnisotropyRotation=t.specularAnisotropyRotation,i.coatAnisotropyRotation=t.coatAnisotropyRotation,i.coatNormalScale=t.coatNormalScale,i.uvProjection=t.uvProjection,i.uvScale=t.uvScale,i.displacementUvProjection=t.displacementUvProjection,i.displacementUvProjectionScale=t.displacementUvProjectionScale,i.displacementStepSize=t.displacementStepSize,i.alpha=t.alpha,i.alphaMode=t.alphaMode,i.alphaCutoff=t.alphaCutoff,i.doubleSided=t.doubleSided,i.baseWeight=t.baseWeight,i.baseDiffuseRoughness=t.baseDiffuseRoughness,i.specularWeight=t.specularWeight,i.specularColor=t.specularColor,i.transmissionColor=t.transmissionColor,i.transmissionDepth=t.transmissionDepth,i.transmissionScatter=t.transmissionScatter,i.transmissionScatterAnisotropy=t.transmissionScatterAnisotropy,i.subsurfaceWeight=t.subsurfaceWeight,i.subsurfaceColor=t.subsurfaceColor,i.subsurfaceRadius=t.subsurfaceRadius,i.subsurfaceRadiusScale=t.subsurfaceRadiusScale,i.subsurfaceScatterAnisotropy=t.subsurfaceScatterAnisotropy,i.fuzzWeight=t.fuzzWeight,i.fuzzColor=t.fuzzColor,i.fuzzRoughness=t.fuzzRoughness,i.coatWeight=t.coatWeight,i.coatColor=t.coatColor,i.coatRoughness=t.coatRoughness,i.coatAnisotropy=t.coatAnisotropy,i.coatIor=t.coatIor,i.coatDarkening=t.coatDarkening,i.thinFilmWeight=t.thinFilmWeight,i.dispersionAbbeNumber=t.dispersionAbbeNumber,i.mediumExtinction=t.mediumExtinction,i.mediumScattering=t.mediumScattering,i.mediumAnisotropy=t.mediumAnisotropy}var pp={f32:1,vec2f:2,vec3f:3};function Wt(i){let e=[];if(!i)return e;for(let t of i){let A=t;for(let a=0;a<A.length;a++)e.push(A[a])}return e}function to(i){let e=[];if(!i)return e;for(let t of i)if(t instanceof Float32Array)e.push(t.length===0?0:t.length===1?t[0]:NaN);else for(let A=0;A<t.length;A++)e.push(t[A]);return e}function WA(i){let e={color:Wt(i.color),type:i.type?.flat()??[],roughness:i.roughness?.flat()??[],normalMapIndex:i.normalMapIndex?.flat()??[],normalScale:to(i.normalScale),metallic:i.metallic?.flat()??[],anisotropy:i.anisotropy?.flat()??[],diffuseMapIndex:i.diffuseMapIndex?.flat()??[],metallicRoughnessMapIndex:i.metallicRoughnessMapIndex?.flat()??[],emission:Wt(i.emission),emissiveMapIndex:i.emissiveMapIndex?.flat()??[],ior:i.ior?.flat()??[],transmission:i.transmission?.flat()??[],mediumType:i.mediumType?.flat()??[],thin:i.thin?.flat()??[],bevelSize:i.bevelSize?.flat()??[],dispersion:i.dispersion?.flat()??[],thinFilmThickness:i.thinFilmThickness?.flat()??[],mapAlphaUsage:i.mapAlphaUsage?.flat()??[],coatWeightMapIndex:i.coatWeightMapIndex?.flat()??[],coatRoughnessMapIndex:i.coatRoughnessMapIndex?.flat()??[],coatNormalMapIndex:i.coatNormalMapIndex?.flat()??[],fuzzColorMapIndex:i.fuzzColorMapIndex?.flat()??[],uvProjection:i.uvProjection?.flat()??[],displacementMapIndex:i.displacementMapIndex?.flat()??[],uvScale:to(i.uvScale),displacementStepSize:i.displacementStepSize?.flat()??[],displacementBias:i.displacementBias?.flat()??[],displacementUvProjection:i.displacementUvProjection?.flat()??[],displacementUvProjectionScale:i.displacementUvProjectionScale?.flat()??[],alpha:i.alpha?.flat()??[],thinFilmMapIndex:i.thinFilmMapIndex?.flat()??[],thinFilmIor:i.thinFilmIor?.flat()??[],transmissionMapIndex:i.transmissionMapIndex?.flat()??[],baseWeight:i.baseWeight?.flat()??[],baseDiffuseRoughness:i.baseDiffuseRoughness?.flat()??[],specularWeight:i.specularWeight?.flat()??[],subsurfaceWeight:i.subsurfaceWeight?.flat()??[],specularColor:Wt(i.specularColor),fuzzWeight:i.fuzzWeight?.flat()??[],transmissionColor:Wt(i.transmissionColor),transmissionDepth:i.transmissionDepth?.flat()??[],transmissionScatter:Wt(i.transmissionScatter),transmissionScatterAnisotropy:i.transmissionScatterAnisotropy?.flat()??[],subsurfaceColor:Wt(i.subsurfaceColor),subsurfaceRadius:i.subsurfaceRadius?.flat()??[],fuzzColor:Wt(i.fuzzColor),fuzzRoughness:i.fuzzRoughness?.flat()??[],coatColor:Wt(i.coatColor),coatWeight:i.coatWeight?.flat()??[],coatRoughness:i.coatRoughness?.flat()??[],coatAnisotropy:i.coatAnisotropy?.flat()??[],coatIor:i.coatIor?.flat()??[],coatDarkening:i.coatDarkening?.flat()??[],thinFilmWeight:i.thinFilmWeight?.flat()??[],dispersionAbbeNumber:i.dispersionAbbeNumber?.flat()??[],subsurfaceScatterAnisotropy:i.subsurfaceScatterAnisotropy?.flat()??[],fuzzRoughnessMapIndex:i.fuzzRoughnessMapIndex?.flat()??[],subsurfaceRadiusScale:Wt(i.subsurfaceRadiusScale),specularWeightMapIndex:i.specularWeightMapIndex?.flat()??[],mediumExtinction:Wt(i.mediumExtinction),mediumAnisotropy:i.mediumAnisotropy?.flat()??[],mediumScattering:Wt(i.mediumScattering),specularColorMapIndex:i.specularColorMapIndex?.flat()??[],roughnessMapIndex:i.roughnessMapIndex?.flat()??[],metalnessMapIndex:i.metalnessMapIndex?.flat()??[],alphaMapIndex:i.alphaMapIndex?.flat()??[],alphaCutoff:i.alphaCutoff?.flat()??[],doubleSided:i.doubleSided?.flat()??[],alphaMode:i.alphaMode?.flat()??[],anisotropyMapIndex:i.anisotropyMapIndex?.flat()??[],specularAnisotropyRotation:i.specularAnisotropyRotation?.flat()??[],coatNormalScale:to(i.coatNormalScale),coatAnisotropyRotation:i.coatAnisotropyRotation?.flat()??[],specularAnisotropyModel:i.specularAnisotropyModel?.flat()??[],thinFilmThicknessMinimum:i.thinFilmThicknessMinimum?.flat()??[],thinFilmMapChannel:i.thinFilmMapChannel?.flat()??[]},t=Ma().map(a=>({type:a.type,offset:a.offset,values:a.source===null?i.type.map(()=>0):e[a.source]??[]})),A=new Float32Array(i.type.length*kA);for(let a=0;a<i.type.length;a++)for(let r of t){let n=pp[r.type];for(let s=0;s<n;s++)A[a*kA+r.offset/4+s]=Number(r.values[a*n+s]??-1)}return A}var Dt=384*1024*1024;function lc(i,e,t){let A=[],a=new Array(i.length),r=i.map((n,s)=>({height:Math.max(1,Math.floor(n.image.height*t)),index:s,width:Math.max(1,Math.floor(n.image.width*t))})).sort((n,s)=>s.height-n.height||s.width-n.width);for(let n of r){let s;for(let o=0;o<A.length&&!s;o++){let l=A[o];for(let c of l.shelves)if(n.height<=c.height&&c.x+n.width<=e){s={height:n.height,index:n.index,width:n.width,layer:o,x:c.x,y:c.y},c.x+=n.width;break}!s&&l.nextY+n.height<=e&&(s={height:n.height,index:n.index,width:n.width,layer:o,x:0,y:l.nextY},l.shelves.push({height:n.height,x:n.width,y:l.nextY}),l.nextY+=n.height)}if(!s){let o=A.length;s={height:n.height,index:n.index,width:n.width,layer:o,x:0,y:0},A.push({nextY:n.height,placements:[],shelves:[{height:n.height,x:n.width,y:0}]})}A[s.layer].placements.push(s),a[n.index]=s}return{pages:A,placements:a}}function cc(i,e,t={},A=e.some(a=>!!a)){let a=A?8:4;if(!i.length)return{pages:[],placements:[],width:1,height:1,floatStorage:A,bytesPerPixel:a,mapInfo:[],mapTransform:[],mapWrap:[],mapUvChannel:[],mapColorLinear:e,stats:{estimatedBytes:0,height:1,layers:0,packTimeMs:0,scale:1,sourcePixels:0,textureCount:0,width:1}};let r=t.maxTextureArrayLayers??1/0,n=t.maxTextureDimension2D??1/0,s=t.maxTextureArrayBytes??Dt,o=i.reduce((E,x)=>E+x.image.width*x.image.height,0),l=i.reduce((E,x)=>Math.max(E,x.image.width,x.image.height),1),c=Math.max(1,Math.floor(Math.sqrt(s/a))),f=Math.max(1,Math.floor(Math.min(l,n,c))),m=f*f*a,d=Math.max(1,Math.min(r,Math.floor(s/m))),u=Math.min(1,f/l),p=lc(i,f,u),g=u;if(p.pages.length>d){let E=0,x=u,y,M=0;for(let b=0;b<14;b++){let T=(E+x)/2,O=lc(i,f,T);O.pages.length<=d?(E=T,M=T,y=O):x=T}if(!y)throw new Error(`Unable to fit ${i.length} textures into ${d} atlas layers.`);p=y,g=M}let v=p.placements.reduce((E,x)=>Math.max(E,x.x+x.width),1),h=p.placements.reduce((E,x)=>Math.max(E,x.y+x.height),1),B=p.placements.flatMap(E=>{let x=(E.x+.5)/v,y=(E.y+.5)/h;return[Math.max(E.width-1,0)/v,Math.max(E.height-1,0)/h,E.layer+x,y]});return{pages:p.pages,placements:p.placements,width:v,height:h,floatStorage:A,bytesPerPixel:a,mapInfo:B,mapTransform:i.flatMap(E=>[E.uvScale[0],E.uvScale[1],E.uvOffset[0],E.uvOffset[1]]),mapWrap:i.flatMap(E=>[pi(E.wrapS),pi(E.wrapT)]),mapUvChannel:i.map(E=>E.uvChannel),mapColorLinear:e,stats:{estimatedBytes:v*h*p.pages.length*a,height:h,layers:p.pages.length,packTimeMs:0,scale:g,sourcePixels:o,textureCount:i.length,width:v}}}var Qa=class{bufferData;textures;displacementMaps;lightTexturesIndices=[];defines={};atlas;constructor(e,t,A,a={},r){let n=Lr(e,ya);this.displacementMaps=n.indices.displacementMap.map(s=>n.textures[s]).filter(s=>!!s),this.textures=n.textures.slice();for(let s of t)s?(this.lightTexturesIndices.push(this.textures.length),this.textures.push(s)):this.lightTexturesIndices.push(-1);this.bufferData=Fr(e),this.bufferData.diffuseMapIndex=n.indices.map,this.bufferData.alphaMapIndex=n.indices.alphaMap,this.bufferData.normalMapIndex=n.indices.normalMap,this.bufferData.emissiveMapIndex=n.indices.emissiveMap,this.bufferData.metallicRoughnessMapIndex=n.indices.metallicRoughnessMap,this.bufferData.roughnessMapIndex=n.indices.roughnessMap,this.bufferData.metalnessMapIndex=n.indices.metalnessMap,this.bufferData.transmissionMapIndex=n.indices.transmissionMap,this.bufferData.thinFilmMapIndex=n.indices.thinFilmMap,this.bufferData.displacementMapIndex=n.indices.displacementMap,this.bufferData.coatWeightMapIndex=n.indices.coatWeightMap,this.bufferData.coatRoughnessMapIndex=n.indices.coatRoughnessMap,this.bufferData.fuzzColorMapIndex=n.indices.fuzzColorMap,this.bufferData.fuzzRoughnessMapIndex=n.indices.fuzzRoughnessMap,this.bufferData.specularWeightMapIndex=n.indices.specularWeightMap,this.bufferData.specularColorMapIndex=n.indices.specularColorMap,this.bufferData.anisotropyMapIndex=n.indices.anisotropyMap,this.bufferData.coatNormalMapIndex=n.indices.coatNormalMap,this.atlas=cc(this.textures,this.textures.map(A),a,r?this.textures.some(r):void 0),this.bufferData.mapInfo=this.atlas.mapInfo,this.bufferData.mapTransform=this.atlas.mapTransform,this.bufferData.mapWrap=this.atlas.mapWrap,this.bufferData.mapUvChannel=this.atlas.mapUvChannel,this.bufferData.mapColorLinear=this.atlas.mapColorLinear,this.defines={NUM_MAPS:this.textures.length};for(let s of Xi)s.define&&(this.defines[s.define]=n.indices[s.property].filter(o=>o>=0).length)}repackParams(e){HA(this.bufferData,e)}getBufferArray(){return WA(this.bufferData)}};function Zi(i){return i.length}function ti(i,e){return i[e]}function fc(i){let e=Math.floor(i),t=i-e;return e+ +(t>.5||t===.5&&e%2===1)}function YA(i){let e=i<0||Object.is(i,-0)?32768:0,t=Math.abs(i);if(Number.isNaN(t))return 32256;if(t>=65520)return e|31744;if(t<2**-14)return e|fc(t*2**24);let A=Math.floor(Math.log2(t));return e|(A+14)*1024+fc(t/2**(A-10))}function io(i,e,t){i[e]=t}function zr(i,e,t,A,a){let r=A.image;if(!(r.data instanceof Uint8Array||r.data instanceof Uint8ClampedArray)&&!(r.data instanceof Float32Array)&&!(r.data instanceof Int32Array))throw new Error("Material texture data must be Uint8Array, Uint8ClampedArray, Float32Array or Int32Array.");if(!(!a&&i instanceof Uint8Array&&t.width===r.width&&t.height===r.height&&(r.data instanceof Uint8Array&&uc(i,e,t,r.data,r.width,r.height,A.flipY)||r.data instanceof Uint8ClampedArray&&uc(i,e,t,r.data,r.width,r.height,A.flipY))))return i instanceof Uint16Array,dc(i,e,t,A,a)}function uc(i,e,t,A,a,r,n){if(Zi(A)!==a*r*4)throw new Error("Material texture RGBA source length does not match its dimensions.");if(A.buffer===i.buffer)return!1;let s=a*4;for(let o=0;o<t.height;o++){let l=n?r-o-1:o;i.set(A.subarray(l*s,(l+1)*s),((t.y+o)*e+t.x)*4)}return!0}function dc(i,e,t,A,a){let r=A.image;return r.data instanceof Uint8Array||r.data instanceof Uint8ClampedArray?Nr(i,e,t,r.data,r.width,r.height,A.flipY,a,255):(r.data instanceof Float32Array,Nr(i,e,t,r.data,r.width,r.height,A.flipY,a,1))}function Nr(i,e,t,A,a,r,n,s,o){if(Zi(A)!==a*r*4)throw new Error("Material texture RGBA source length does not match its dimensions.");for(let l=0;l<t.height;l++){let c=Math.min(r-1,Math.floor((l+.5)*r/t.height));n&&(c=r-1-c);for(let f=0;f<t.width;f++){let m=Math.min(a-1,Math.floor((f+.5)*a/t.width)),d=(c*a+m)*4,u=((t.y+l)*e+t.x+f)*4;for(let p=0;p<4;p++){let g=ti(A,d+p);io(i,u+p,s?YA(g/o):g)}}}}function ht(i=300,e=150,t=!1){if(!t&&typeof document<"u"){let A=document.createElement("canvas");return A.width=i,A.height=e,A}if(typeof OffscreenCanvas<"u")return new OffscreenCanvas(i,e);throw new Error("Canvas creation requires document or OffscreenCanvas.")}function K(i,...e){return i.reduce((t,A,a)=>t+(a?String(e[a-1]??""):"")+A,"")}function ii(i){return typeof i=="string"&&(i={main:i}),{defines:i.defines||{},uniforms:i.uniforms||{},main:i.main||"",functions:i.functions||[]}}var C=class{static uniform(e,t){return{type:e,value:t}}static arrayUniform(e,t,A){return{type:e,len:t,value:A,array:!0}}},we=class{name;outputs;outputTypes;defines;uniforms;functions;main;parallelCompile=!1;constructor(e){let t=e.includes||[];this.name=e.name||"",this.outputs=e.outputs||["color"],this.outputTypes=e.outputTypes??{},this.defines=Object.assign({},...t.map(A=>A.defines),e.defines||{}),this.uniforms=Object.assign({},...t.map(A=>A.uniforms),e.uniforms||{}),this.functions=t.flatMap(A=>A.functions||[]),this.main=e.main}};var j={FLOAT:5126,HALF_FLOAT:5131,UNSIGNED_BYTE:5121,RGBA:6408,LINEAR:9729,NEAREST:9728,REPEAT:10497,CLAMP_TO_EDGE:33071,SCISSOR_TEST:3089,COLOR_BUFFER_BIT:16384,DEPTH_BUFFER_BIT:256,LINES:1,TEXTURE_2D:3553,TEXTURE_2D_ARRAY:35866};function kr(i){return!!i&&typeof i=="object"&&"data"in i}var ce=class{_source;width=1;height=1;target=j.TEXTURE_2D;_options;_texture;_dirty=!0;_allocated=!1;constructor(e={}){this._options=e,this.source=e.source,this.width=e.width||1,this.height=e.height||1}get storageType(){return this._options.type??j.UNSIGNED_BYTE}get isByteEncoded(){return(this._options.type??j.UNSIGNED_BYTE)===j.UNSIGNED_BYTE}getMemoryBytes(){if(!this._allocated)return 0;let e=this._options.type===j.FLOAT?4:this._options.type===j.HALF_FLOAT?2:1;return this.width*this.height*4*e}get source(){return this._source}set source(e){this._source!==e&&(this._source=e,this._dirty=!0,this._allocated=!1)}dirty(){this._dirty=!0}resize(e,t){(this.width!==e||this.height!==t)&&(this.width=e,this.height=t,this._dirty=!0,this._allocated=!1)}ensureStorage(e,t,A,a=this._options){let r=(this._options.type??j.UNSIGNED_BYTE)!==(a.type??this._options.type??j.UNSIGNED_BYTE)||this._options.sRGB!==(a.sRGB??this._options.sRGB);if(this._options={...this._options,...a},r&&(this._dirty=!0,this._allocated=!1),this.resize(Math.max(1,t),Math.max(1,A)),this._ensureTexture(e),!this._allocated||this._dirty){this._bindAndConfigure(e);let{internalFormat:n,format:s,type:o}=this._format(e);e.texImage2D(e.TEXTURE_2D,0,n,this.width,this.height,0,s,o,null),this._allocated=!0,this._dirty=!1}return this}bind(e,t){this._ensureTexture(e),e.activeTexture(e.TEXTURE0+t),this._bindAndConfigure(e),(this._dirty||!this._allocated)&&this._upload(e)}updateDataRange(e,t,A,a){if(!a)return;let r=this.source;if(!kr(r)||A<0||a<0||A%t.BYTES_PER_ELEMENT||a%t.BYTES_PER_ELEMENT||A+a>t.byteLength||A+a>r.data.byteLength)throw new RangeError("Invalid data texture byte range");if(r.data.set(t.subarray(A/t.BYTES_PER_ELEMENT,(A+a)/t.BYTES_PER_ELEMENT),A/r.data.BYTES_PER_ELEMENT),this._ensureTexture(e),this._bindAndConfigure(e),this._dirty||!this._allocated){this._upload(e);return}let n=r.data.length/(r.width*r.height),s=r.width*n*r.data.BYTES_PER_ELEMENT,o=Math.floor(A/s),l=Math.ceil((A+a)/s),{format:c,type:f}=this._format(e,n);e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,this._options.flipY?1:0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,this._options.premultiplyAlpha?1:0),e.texSubImage2D(e.TEXTURE_2D,0,0,o,r.width,l-o,c,f,r.data.subarray(o*r.width*n,l*r.width*n))}getWebGLTexture(e){return this._ensureTexture(e),this._texture}dispose(e){this._texture&&e.deleteTexture(this._texture),this._texture=void 0,this._allocated=!1,this._dirty=!0}_ensureTexture(e){this._texture||(this._texture=e.createTexture(),this._dirty=!0,this._allocated=!1)}_bindAndConfigure(e){e.bindTexture(e.TEXTURE_2D,this._texture),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,this._options.minFilter||e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,this._options.magFilter||e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,this._options.wrapS||e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,this._options.wrapT||e.CLAMP_TO_EDGE)}_format(e,t=4){let A=this._options.type||e.UNSIGNED_BYTE;if(A===e.UNSIGNED_INT)return{type:A,format:e.RGBA_INTEGER,internalFormat:e.RGBA32UI};let a=[e.RED,e.RG,e.RGB,e.RGBA],r=[e.R32F,e.RG32F,e.RGB32F,e.RGBA32F],n=[e.R16F,e.RG16F,e.RGB16F,e.RGBA16F];return{type:A,format:a[t-1],internalFormat:A===e.FLOAT?r[t-1]:A===e.HALF_FLOAT?n[t-1]:this._options.sRGB?e.SRGB8_ALPHA8:e.RGBA8}}_upload(e){let t=this.source,A=t&&kr(t)?t.data.byteLength/t.data.BYTES_PER_ELEMENT/(t.width*t.height):4,{internalFormat:a,format:r,type:n}=this._format(e,A);e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,this._options.flipY?1:0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,this._options.premultiplyAlpha?1:0),t&&kr(t)?(this.width=t.width,this.height=t.height,e.texImage2D(e.TEXTURE_2D,0,a,t.width,t.height,0,r,n,t.data)):t&&!Array.isArray(t)?(this.width=t.width,this.height=t.height,e.texImage2D(e.TEXTURE_2D,0,a,r,n,t)):e.texImage2D(e.TEXTURE_2D,0,a,this.width,this.height,0,r,n,null),this._options.useMipmap&&e.generateMipmap(e.TEXTURE_2D),this._dirty=!1,this._allocated=!0}},Ia=class extends ce{target=j.TEXTURE_2D_ARRAY;get flipYArray(){return this._options.flipYArray||[]}_bindAndConfigure(e){e.bindTexture(e.TEXTURE_2D_ARRAY,this._texture),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_MIN_FILTER,this._options.minFilter||e.LINEAR),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_MAG_FILTER,this._options.magFilter||e.LINEAR),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_WRAP_S,this._options.wrapS||e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_WRAP_T,this._options.wrapT||e.CLAMP_TO_EDGE)}_upload(e){let t=this.source||[],A=Math.max(1,t.length),a=e.getParameter(e.MAX_TEXTURE_SIZE),r=e.getParameter(e.MAX_ARRAY_TEXTURE_LAYERS);if(this.width>a||this.height>a||A>r)throw new Error(`Texture array ${this.width}x${this.height}x${A} exceeds WebGL limits ${a}x${a}x${r}.`);let n=this.storageType,s=n===e.HALF_FLOAT?e.RGBA16F:n===e.FLOAT?e.RGBA32F:this._options.sRGB?e.SRGB8_ALPHA8:e.RGBA8;for(;e.getError()!==e.NO_ERROR;);e.texImage3D(e.TEXTURE_2D_ARRAY,0,s,this.width,this.height,A,0,e.RGBA,n,null);let o=e.getError();if(o!==e.NO_ERROR)throw new Error(`WebGL could not allocate texture array ${this.width}x${this.height}x${A} (error 0x${o.toString(16)}).`);t.forEach((l,c)=>{e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,this._options.flipYArray?.[c]??this._options.flipY?1:0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,0),e.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,c,l.width,l.height,1,e.RGBA,n,kr(l)?l.data:l);let f=e.getError();if(f!==e.NO_ERROR)throw new Error(`WebGL could not upload texture array layer ${c} (error 0x${f.toString(16)}).`)}),this._dirty=!1,this._allocated=!0}bind(e,t){this._ensureTexture(e),e.activeTexture(e.TEXTURE0+t),this._bindAndConfigure(e),(this._dirty||!this._allocated)&&this._upload(e)}},Sa=class{shader;uniforms;defines;_programs=new Map;constructor(e){this.shader=e,this.uniforms=Object.fromEntries(Object.entries(e.uniforms).map(([t,A])=>[t,{...A,value:mp(A.value)}])),this.defines={...e.defines}}set(e,t){if(t===void 0||!this.uniforms[e])return!1;let A=this.uniforms[e].value!==t;return this.uniforms[e].value=t,A}setUniforms(e){Object.entries(e).forEach(([t,A])=>this.set(t,A))}get(e){return this.uniforms[e]?.value}setDefine(e,t){this.defines[e]=t}deleteDefine(e){delete this.defines[e]}getProgram(e){let t={};for(let[n,s]of Object.entries(this.uniforms))pc(s.type)&&s.value&&(t[`${n.toUpperCase()}_ENABLED`]=null);let A={...this.defines,...t},a=JSON.stringify(A),r=this._programs.get(a);return r||(r=e.createProgram(this.shader,A),this._programs.set(a,r)),r}bind(e){let t=e.gl,A=this.getProgram(e);if(!e.isProgramCompiled(A))return!1;t.useProgram(A);let a=0;for(let[r,n]of Object.entries(this.uniforms)){let s=t.getUniformLocation(A,r);if(s===null)continue;let o=n.value;pc(n.type)?((o||e.emptyTexture).bind(t,a),t.uniform1i(s,a++)):gp(t,s,n,o)}return!0}};function mp(i){return Array.isArray(i)?i.slice():i}function pc(i){return i.includes("sampler")}function hp(i){return i?ArrayBuffer.isView(i)?i:Array.isArray(i)?i.flat(1/0):[i]:[]}function gp(i,e,t,A){if(A==null)return;let a=hp(A);if(t.array){t.type==="int"?i.uniform1iv(e,a):t.type==="vec2"?i.uniform2fv(e,a):t.type==="vec3"?i.uniform3fv(e,a):t.type==="vec4"?i.uniform4fv(e,a):i.uniform1fv(e,a);return}switch(t.type){case"bool":case"int":i.uniform1i(e,Number(A));break;case"float":i.uniform1f(e,Number(A));break;case"vec2":i.uniform2fv(e,a);break;case"vec3":i.uniform3fv(e,a);break;case"vec4":i.uniform4fv(e,a);break;case"ivec2":i.uniform2iv(e,a);break;case"ivec3":i.uniform3iv(e,a);break;case"ivec4":i.uniform4iv(e,a);break;case"mat3":i.uniformMatrix3fv(e,!1,a);break;case"mat4":i.uniformMatrix4fv(e,!1,a);break}}var mc=`#version 300 es
precision highp float;
out vec2 v_Texcoord;
void main() {
vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
v_Texcoord = p;
gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;function vp(i,e){let t=Object.entries(e).filter(([,r])=>r!==!1&&r!==void 0).map(([r,n])=>n===null||n===!0?`#define ${r}`:`#define ${r} ${n}`).join(`
`),A=Object.entries(i.uniforms).map(([r,n])=>{let s=n.array&&isNaN(Number(n.len)),o=`uniform ${n.type} ${r}${n.array?`[${n.len}]`:""};`;return s?`#ifdef ${n.len}
${o}
#endif`:o}).join(`
`),a=i.outputs.map((r,n)=>`layout(location=${n}) out highp ${i.outputTypes[r]??"vec4"} out_${r};`).join(`
`);return`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp sampler2DArray;
precision highp usampler2D;
${t}
${a}
${A}
in vec2 v_Texcoord;
${i.functions.map(r=>r()).join(`
`)}
${i.main}`}var Gr=class{canvas;gl;emptyTexture=new ce;_viewport=[0,0,1,1];_viewportStack=[];_programs=new Set;_parallel;_pendingPrograms=new Map;_programErrors=new Map;_compilationStart=0;_compilationRecords=[];constructor(e){this.canvas=e.canvas;let t=e.canvas.getContext("webgl2",e);if(!t)throw new Error("WebGL 2.0 is required");this.gl=t,t.getExtension("EXT_color_buffer_float"),t.getExtension("OES_texture_float_linear"),this._parallel=e.parallelShaderCompile&&t.getExtension("KHR_parallel_shader_compile")||void 0,this.resize(this.canvas.width,this.canvas.height)}createProgram(e,t){let A=this.gl,a=performance.now();this._compilationRecords.length||(this._compilationStart=a);let r=vp(e,t),n=performance.now()-a,s=mc+r,o=2166136261;for(let u=0;u<s.length;u++)o=Math.imul(o^s.charCodeAt(u),16777619);let l=performance.now(),c=A.createProgram(),f=!!this._parallel&&e.parallelCompile,m=[],d=(u,p)=>{let g=A.createShader(u);if(m.push(g),A.shaderSource(g,p),A.compileShader(g),!f&&!A.getShaderParameter(g,A.COMPILE_STATUS)){let v=A.getShaderInfoLog(g);throw A.deleteShader(g),new Error(`${e.name||"WebGL shader"}: ${v}
${p}`)}A.attachShader(c,g),f||A.deleteShader(g)};if(d(A.VERTEX_SHADER,mc),d(A.FRAGMENT_SHADER,r),A.linkProgram(c),f)this._pendingPrograms.set(c,{shader:e,shaders:m});else if(!A.getProgramParameter(c,A.LINK_STATUS))throw new Error(`${e.name||"WebGL program"}: ${A.getProgramInfoLog(c)}`);return this._programs.add(c),this._compilationRecords.push({program:c,label:e.name||"WebGL program",bytes:new TextEncoder().encode(s).byteLength,lines:s.split(`
`).length,fingerprint:(o>>>0).toString(16).padStart(8,"0"),startedAt:a,generationMs:n,creationMs:performance.now()-l,completedAt:f?void 0:performance.now()}),c}isProgramCompiled(e){let t=this._programErrors.get(e);if(t)throw t;let A=this._pendingPrograms.get(e);if(!A)return!0;let a=this.gl;if(!a.getProgramParameter(e,this._parallel.COMPLETION_STATUS_KHR))return!1;this._pendingPrograms.delete(e);try{if(!a.getProgramParameter(e,a.LINK_STATUS)){let n=A.shaders.filter(o=>!a.getShaderParameter(o,a.COMPILE_STATUS)).map(o=>`${a.getShaderInfoLog(o)}
${a.getShaderSource(o)}`).join(`
`),s=new Error(`${A.shader.name||"WebGL program"}: ${a.getProgramInfoLog(e)}${n?`
`+n:""}`);throw this._programErrors.set(e,s),s}}finally{A.shaders.forEach(n=>a.deleteShader(n))}let r=this._compilationRecords.find(n=>n.program===e);return r&&(r.completedAt=performance.now()),!0}getShaderCompilationDiagnostics(){let e=performance.now(),t=this._compilationRecords;for(let o of t)o.completedAt===void 0&&this.isProgramCompiled(o.program)&&(o.completedAt=e);let A=t.filter(o=>o.completedAt!==void 0),a=A.length===t.length&&t.length>0?Math.max(...A.map(o=>o.completedAt))-this._compilationStart:void 0,r=t.flatMap(o=>[{time:o.startedAt,change:1},...o.completedAt===void 0?[]:[{time:o.completedAt,change:-1}]]).sort((o,l)=>o.time-l.time||o.change-l.change),n=0,s=0;for(let o of r)n+=o.change,s=Math.max(s,n);return{status:A.length===t.length?"ready":"compiling",sourceBytes:t.reduce((o,l)=>o+l.bytes,0),sourceLines:t.reduce((o,l)=>o+l.lines,0),pipelineCount:t.length,completedPipelineCount:A.length,sourceGenerationTimeMs:t.reduce((o,l)=>o+l.generationMs,0),moduleCreationTimeMs:t.reduce((o,l)=>o+l.creationMs,0),modules:t.map(o=>({label:o.label,sourceBytes:o.bytes,sourceLines:o.lines,sourceFingerprint:o.fingerprint})),pipelines:t.map(o=>({label:o.label,entryPoint:"main",firstFrameRequired:!0,status:o.completedAt===void 0?"compiling":"ready",startedAtMs:o.startedAt-this._compilationStart,endedAtMs:o.completedAt===void 0?void 0:o.completedAt-this._compilationStart,durationMs:o.completedAt===void 0?void 0:o.completedAt-o.startedAt})),maximumConcurrentPipelineCount:this._parallel?t.length:Math.min(t.length,1),peakConcurrentPipelineCount:s,pipelineCompilationTimeMs:a,totalTimeMs:a}}isAllProgramCompiled(){for(let e of this._programs)if(!this.isProgramCompiled(e))return!1;return!0}resize(e,t){this.canvas.width=e,this.canvas.height=t,this.setViewport(0,0,e,t)}getWidth(){return this.canvas.width}getHeight(){return this.canvas.height}saveViewport(){this._viewportStack.push([...this._viewport])}restoreViewport(){let e=this._viewportStack.pop();e&&this.setViewport(...e)}setViewport(e,t,A,a){this._viewport=[e,t,A,a],this.gl.viewport(e,t,A,a)}dispose(){this._pendingPrograms.forEach(e=>e.shaders.forEach(t=>this.gl.deleteShader(t))),this._pendingPrograms.clear(),this._programErrors.clear(),this._programs.forEach(e=>this.gl.deleteProgram(e)),this._programs.clear(),this._compilationRecords=[],this.emptyTexture.dispose(this.gl)}},bi=class{_frameBuffer;_attachments=[];attach(e){this._attachments=[e]}bind(e,t,A=e.gl.FRAMEBUFFER){let a=e.gl,r=this._attachments.length;t&&(this._attachments=t),t=this._attachments,this._frameBuffer||=a.createFramebuffer(),a.bindFramebuffer(A,this._frameBuffer);for(let n=t.length;n<r;n++)a.framebufferTexture2D(A,a.COLOR_ATTACHMENT0+n,a.TEXTURE_2D,null,0);t.forEach((n,s)=>{n.bind(a,0),a.framebufferTexture2D(A,a.COLOR_ATTACHMENT0+s,a.TEXTURE_2D,n.getWebGLTexture(a),0)}),A!==a.READ_FRAMEBUFFER&&a.drawBuffers(t.map((n,s)=>a.COLOR_ATTACHMENT0+s))}dispose(e){this._frameBuffer&&e.gl.deleteFramebuffer(this._frameBuffer),this._frameBuffer=void 0}};function Bp(i,e){let t=new i.constructor(e);return t.set(i),t}function Pi(i){let e=Math.round(Math.log2(Math.sqrt(i))),t=2**e,A=Math.ceil(i/t);return{columnsLog:e,columns:t,rows:A,size:A*t}}function gt(i,e,t){let A=Pi(e.length/t);return i.source={data:Bp(e,A.size*t),width:A.columns,height:A.rows},A}var Hr={wrapS:j.CLAMP_TO_EDGE,wrapT:j.CLAMP_TO_EDGE,type:j.FLOAT,minFilter:j.LINEAR,magFilter:j.LINEAR,flipY:!1,useMipmap:!1},tt={wrapS:j.CLAMP_TO_EDGE,wrapT:j.CLAMP_TO_EDGE,minFilter:j.NEAREST,magFilter:j.NEAREST,type:j.FLOAT,flipY:!1,useMipmap:!1};function hc(i,e){return ht(i,e)}function Ep(i,e,t,A,a){let r=a?new Uint16Array(i*e*4):new Uint8Array(i*e*4),n=t.placements.filter(s=>!pt(A[s.index].image));if(n.length){let o=hc(i,e).getContext("2d");if(!o)throw new Error("Unable to create a canvas for the texture atlas.");for(let c of n)gc(o,c,A[c.index]);let l=o.getImageData(0,0,i,e).data;for(let c=0;c<l.length;c++)io(r,c,a?YA(l[c]/255):l[c])}for(let s of t.placements){let o=A[s.index],l=o.image;pt(l)&&zr(r,i,s,{image:l,flipY:o.flipY},a)}return{data:r,width:i,height:e}}function gc(i,e,t){t.flipY?(i.save(),i.translate(e.x,e.y+e.height),i.scale(1,-1),i.drawImage(t.image,0,0,e.width,e.height),i.restore()):i.drawImage(t.image,e.x,e.y,e.width,e.height)}function wp(i,e,t=!1){let A=performance.now();if(!i.length)return{stats:{estimatedBytes:0,height:1,layers:0,packTimeMs:performance.now()-A,scale:1,sourcePixels:0,textureCount:0,width:1},texture:new Ia({width:1,height:1,sRGB:t,source:[],minFilter:j.LINEAR,magFilter:j.LINEAR,wrapS:j.CLAMP_TO_EDGE,wrapT:j.CLAMP_TO_EDGE})};let a=i.some(c=>pt(c.image)),r=e.width,n=e.height,s=e.floatStorage,o=e.pages.map(c=>{if(a)return Ep(r,n,c,i,s);let f=hc(r,n),m=f.getContext("2d");if(!m)throw new Error("Unable to create a canvas for the texture atlas.");for(let d of c.placements)gc(m,d,i[d.index]);return f});return e.stats.scale<.999&&console.warn(`Texture atlas downscaled to ${(e.stats.scale*100).toFixed(1)}% to fit the GPU budget.`),{texture:new Ia({width:r,height:n,sRGB:t,type:s?j.HALF_FLOAT:j.UNSIGNED_BYTE,source:o,flipY:!1,flipYArray:o.map(()=>!1),minFilter:j.LINEAR,magFilter:j.LINEAR,wrapS:j.CLAMP_TO_EDGE,wrapT:j.CLAMP_TO_EDGE}),stats:{...e.stats,packTimeMs:performance.now()-A}}}var Ao=class{texture;textureAtlasStats;defines={};bufferData;_matBufferTex=new ce(tt);_materialBufferColumnsLog=0;_displacementMaps=[];_lightTexturesIndices=[];constructor(e,t,A={}){let a=performance.now(),r=new Qa(e,t.map(o=>o.type==="RectLight"?o.texture:void 0),o=>{let l=o.image;return Number(o.colorSpace?o.colorSpace==="linear":pt(l)&&!(l.data instanceof Uint8Array)&&!(l.data instanceof Uint8ClampedArray))},A,o=>{let l=o.image;return pt(l)&&!(l.data instanceof Uint8Array)&&!(l.data instanceof Uint8ClampedArray)});if(r.textures.some(o=>mi(o.image)))throw new Error("ProceduralSky is only supported as an environment or background.");let{texture:n,stats:s}=wp(r.textures,r.atlas);this.texture=n,this.textureAtlasStats={...s,packTimeMs:performance.now()-a},this.bufferData=r.bufferData,this.defines=r.defines,this._displacementMaps=r.displacementMaps,this._lightTexturesIndices=r.lightTexturesIndices,this._updateBuffer()}repackParams(e){HA(this.bufferData,e),this._updateBuffer()}getBufferArray(){return WA(this.bufferData)}getDisplacementMaps(){return this._displacementMaps}getLightTexturesIndices(){return this._lightTexturesIndices}_updateBuffer(){this._materialBufferColumnsLog=gt(this._matBufferTex,this.getBufferArray(),4).columnsLog}setToPass(e){e.setUniform("map",this.texture||null),e.setUniform("mapInfo",this.bufferData.mapInfo),e.setUniform("mapTransform",this.bufferData.mapTransform),e.setUniform("mapWrap",this.bufferData.mapWrap),e.setUniform("mapUvChannel",this.bufferData.mapUvChannel),e.setUniform("mapColorLinear",this.bufferData.mapColorLinear),e.setUniforms({materialBuffer:this._matBufferTex,materialBufferColumns:this._materialBufferColumnsLog})}dispose(e){this.texture?.dispose(e),this._matBufferTex.dispose(e)}},jA=Ao;var Ai=class extends Error{constructor(e){super(e),this.name="BvhWorkerUnavailableError"}},Di=class extends Error{constructor(){super("BVH worker pool was disposed."),this.name="BvhWorkerDisposedError"}};function Pa(i){if(i!=="auto"){if(!Number.isSafeInteger(i)||i<1)throw new RangeError('bvhWorkerCount must be "auto" or a positive safe integer.');return i}let e=typeof navigator>"u"?2:navigator.hardwareConcurrency;return Number.isFinite(e)?Math.max(1,Math.min(4,Math.floor(e)-1)):1}var ao=class{worker;nextId=0;pending=new Map;failed=!1;constructor(e){this.worker=e,e.onmessage=({data:t})=>{let A=this.pending.get(t.id);A&&(this.pending.delete(t.id),"error"in t?A.reject(new Error(t.error)):A.resolve(t.bvh))},e.onerror=t=>{t.preventDefault(),this.fail(new Ai(t.message||"BVH worker failed."))},e.onmessageerror=()=>this.fail(new Ai("Unable to receive BVH worker result."))}fail(e){this.failed||(this.failed=!0,this.worker.onmessage=this.worker.onerror=this.worker.onmessageerror=null,this.worker.terminate(),this.pending.forEach(t=>t.reject(e)),this.pending.clear())}dispose(){this.fail(new Di)}build(e){if(this.failed)return Promise.reject(new Ai("BVH worker is unavailable."));let t=this.nextId++;return new Promise((A,a)=>{this.pending.set(t,{resolve:A,reject:a});try{let r={...e.position,array:e.position.array.slice()},n={...e.indices,array:e.indices.array.slice()},s=e.normal&&{...e.normal,array:e.normal.array.slice()},o=e.trianglesDisplacement?.slice(),l=[r.array.buffer,n.array.buffer];s&&l.push(s.array.buffer),o&&l.push(o.buffer),this.worker.postMessage({...e,id:t,position:r,indices:n,normal:s,trianglesDisplacement:o},l)}catch(r){this.fail(new Ai(r instanceof Error?r.message:String(r)))}})}},eA=class{size;slots=[];queue=[];stopped;constructor(e){this.size=e,Pa(e)}build(e){return this.stopped?Promise.reject(this.stopped):new Promise((t,A)=>{this.queue.push({request:e,resolve:t,reject:A}),this.dispatch()})}stop(e){this.stopped??=e;for(let t of this.queue.splice(0))t.reject(this.stopped)}dispatch(){for(;this.queue.length&&!this.stopped;){let e=this.slots.find(a=>!a.busy);if(!e){if(this.slots.length>=this.size)return;try{e={client:new ao(new Worker(new URL("./bvh.worker.js",import.meta.url),{type:"module"})),busy:!1},this.slots.push(e)}catch(a){this.stop(new Ai(a instanceof Error?a.message:String(a)));return}}let t=this.queue.shift(),A=e;A.busy=!0,A.client.build(t.request).then(t.resolve,a=>{a instanceof Ai&&this.stop(a),t.reject(a)}).finally(()=>{A.busy=!1,this.dispatch()})}}dispose(){this.stop(new Di);for(let e of this.slots)e.client.dispose();this.slots=[]}};function ro(){return typeof Worker<"u"}async function vc(i,e=0,t,A="builtin",a="bvh2",r=!1,n){let s=n??new eA(1);try{return await s.build({position:i.position,normal:t?i.normal:void 0,indices:i.indices,dynamic:i.dynamic,builder:A,layout:a,displacementScale:e,trianglesDisplacement:t,spatialSplits:r})}finally{n||s.dispose()}}var Da=["webgpu","webgl"],Wr=[{key:"bvhBuilder",default:"builtin",kind:"bvh",backends:Da,parameter:"builder"},{key:"bvhLayout",default:"bvh2",kind:"bvh",backends:Da,parameter:"layout"},{key:"bvhSpatialSplits",default:!1,kind:"bvh",backends:Da,parameter:"spatialSplits"},{key:"bvhWorkerCount",default:"auto",kind:"bvh",backends:Da,normalize:Pa},{key:"textureAtlasBudgetBytes",default:Dt,kind:"resources",backends:Da}];function Bc(i){return Object.fromEntries(Wr.flatMap(e=>"parameter"in e?[[e.parameter,i[e.key]]]:[]))}function Ec(i,e){return JSON.stringify(Wr.filter(t=>t.kind===e&&!("normalize"in t)).map(t=>i[t.key]))}function wc(i){let e=Wr.find(t=>"normalize"in t);return"normalize"in e?e.normalize(i.bvhWorkerCount):1}function Yr(i){let e=Wr.find(t=>t.kind==="resources");return i[e.key]}var _p={maxStorageBuffersPerShaderStage:8,maxStorageBufferBindingSize:12288,maxBufferSize:12288,maxSampledTexturesPerShaderStage:8,maxStorageTexturesPerShaderStage:1,maxComputeWorkgroupStorageSize:0,maxComputeWorkgroupSizeX:64,maxComputeWorkgroupSizeY:16,maxComputeInvocationsPerWorkgroup:256,maxBindGroups:4};function no(i){let e=[];for(let[t,A]of Object.entries(_p)){let a=i.limits[t];(typeof a!="number"||a<A)&&e.push(`${t}: requires ${A}, actual ${a}`)}if(e.length)throw new Error(`GPUDevice does not meet MuTracer requirements:
${e.join(`
`)}`)}function jr(i){let e=[];for(let a of["timestamp-query","bgra8unorm-storage","shader-f16","subgroups","texture-formats-tier1","texture-formats-tier2","float32-filterable"])i.features.has(a)&&e.push(a);let t=i.limits,A={};for(let a of["maxComputeWorkgroupStorageSize","maxComputeWorkgroupsPerDimension","maxStorageBufferBindingSize","maxStorageBuffersPerShaderStage","maxSampledTexturesPerShaderStage","maxStorageTexturesPerShaderStage","maxBufferSize","maxTextureArrayLayers","maxComputeWorkgroupSizeX","maxComputeInvocationsPerWorkgroup"])A[a]=t[a];return{requiredFeatures:e,requiredLimits:A}}function so(i){for(let[e,t]of[["sampling-resource-table","resource_table"],["chromium-experimental-sampling-resource-table","chromium_experimental_resource_table"]])if(i.has(e))return{feature:e,enable:t}}function Ta(i,e=0){if(i.limits.maxStorageBuffersPerShaderStage<9)return"Bindless textures require 9 storage buffers per shader stage.";if(e+10>65536)return"Scene exceeds resource-table slot capacity.";let t=Math.max(1,e)*48;if(t>i.limits.maxStorageBufferBindingSize||t>i.limits.maxBufferSize)return"Texture metadata exceeds device buffer limits."}function oo(i,e){return i.createResourceTable({size:e,label:"Material textures"})}function Ra(i,e){i.setResourceTable(e)}function Vr(i){return{...i,usesResourceTable:!0}}var _c=new WeakMap;function xc(i,e){let t=_c.get(i);return t||(t=xp(i,e),_c.set(i,t)),t}async function xp(i,e){let t=Ta(i);if(t)return t;if(typeof i.createResourceTable!="function")return"Resource-table API is unavailable.";let A,a=[],r=[];i.pushErrorScope("validation");let n;try{A=oo(i,3);for(let g=0;g<2;g++){let v=i.createTexture({size:[1,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST});a.push(v),i.queue.writeTexture({texture:v},new Uint8Array(g?[0,255,0,255]:[255,0,0,255]),{bytesPerRow:4},[1,1]),A.update(g,v.createView())}A.update(2,i.createSampler({minFilter:"linear",magFilter:"linear"}));let o=i.createShaderModule({code:`enable ${e.enable};
@group(0) @binding(0) var<storage, read_write> result: array<vec4f>;
@compute @workgroup_size(2) fn main(@builtin(local_invocation_index) index: u32) {
  let tex = getResource<texture_2d<f32>>(index);
  let samp = getResource<sampler>(2);
  result[index] = textureSampleLevel(tex, samp, vec2f(0.5), 0.0);
}`}),l=await i.createComputePipelineAsync({layout:"auto",compute:{module:o}}),c=i.createBuffer({size:32,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),f=i.createBuffer({size:32,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});r.push(c,f);let m=i.createBindGroup({layout:l.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:c}}]}),d=i.createCommandEncoder(),u=d.beginComputePass();u.setPipeline(l),Ra(u,A),u.setBindGroup(0,m),u.dispatchWorkgroups(1),u.end(),d.copyBufferToBuffer(c,0,f,0,32),i.queue.submit([d.finish()]),await f.mapAsync(GPUMapMode.READ);let p=new Float32Array(f.getMappedRange());[1,0,0,1,0,1,0,1].some((g,v)=>p[v]!==g)&&(n="Resource-table sampling probe returned incorrect pixels."),f.unmap()}catch(o){n=o instanceof Error?o.message:String(o)}finally{A?.destroy(),a.forEach(o=>o.destroy()),r.forEach(o=>o.destroy())}let s=await i.popErrorScope();return n??s?.message}function Ua(i){let e=i.clone(),t=i.transform;return e.transform=(t instanceof Float32Array,t.slice()),e}var qr={depthRange:[0,10],positionScale:1,motionScale:16,idComponent:"object"},Jr=["object","instance","material","primitive"];function vt(i){return Xt.find(e=>e===i)}function La(i){let e=i.depthRange;if(!Array.isArray(e)||e.length!==2||!e.every(Number.isFinite)||e[0]<0||e[1]<=e[0])throw new RangeError("aovDepthRange requires 0 <= near < far");if(!e.map(Math.fround).every(Number.isFinite)||Math.fround(e[1])<=Math.fround(e[0]))throw new RangeError("aovDepthRange must remain finite and increasing in float32");for(let t of[i.positionScale,i.motionScale])if(!Number.isFinite(t)||!Number.isFinite(Math.fround(t))||Math.fround(t)<=0)throw new RangeError("AOV display scales must be finite and positive in float32");if(!Jr.includes(i.idComponent))throw new RangeError("Unknown AOV ID component")}function bc(i,e,t,A,a,r){La(a);let n=new Uint32Array(12),s=new Float32Array(n.buffer);return n.set([i,e,t,Xt.indexOf(A)]),s.set([...a.depthRange,a.positionScale,a.motionScale],4),n[8]=Jr.indexOf(a.idComponent),n[9]=+r,n}var lt=["webgpu","webgl"],bp={toneMapping:{key:"toneMapping",default:"agx",kind:"display",backends:lt,group:"toneMapping",parameter:"toneMapping"},toneMappingExposure:{key:"toneMappingExposure",default:1,kind:"display",backends:lt,group:"toneMapping",parameter:"exposure"},contrast:{key:"contrast",default:1,kind:"display",backends:lt,group:"toneMapping",parameter:"contrast"},saturation:{key:"saturation",default:1,kind:"display",backends:lt,group:"toneMapping",parameter:"saturation"},temperature:{key:"temperature",default:0,kind:"display",backends:lt,group:"toneMapping",parameter:"temperature"},tint:{key:"tint",default:0,kind:"display",backends:lt,group:"toneMapping",parameter:"tint"},vignette:{key:"vignette",default:0,kind:"display",backends:lt,group:"toneMapping",parameter:"vignette"},bloomIntensity:{key:"bloomIntensity",default:0,kind:"display",backends:lt,group:"bloom",parameter:"intensity"},bloomThreshold:{key:"bloomThreshold",default:1,kind:"display",backends:lt,group:"bloom",parameter:"threshold"},bloomRadius:{key:"bloomRadius",default:.6,kind:"display",backends:lt,group:"bloom",parameter:"radius"},hdrOutputEnabled:{key:"hdrOutputEnabled",default:!1,kind:"display",backends:["webgpu"],group:"hdr",parameter:"enabled"},aovDepthRange:{key:"aovDepthRange",default:[0,10],kind:"display",backends:lt,group:"aov",parameter:"depthRange"},aovPositionScale:{key:"aovPositionScale",default:1,kind:"display",backends:lt,group:"aov",parameter:"positionScale"},aovMotionScale:{key:"aovMotionScale",default:16,kind:"display",backends:lt,group:"aov",parameter:"motionScale"},aovIdComponent:{key:"aovIdComponent",default:"object",kind:"display",backends:lt,group:"aov",parameter:"idComponent"},channel:{key:"channel",default:"final",kind:"display",backends:lt,group:"channel",parameter:"channel"},shadowCatcherColor:{key:"shadowCatcherColor",default:[0,0,0],kind:"display",backends:lt,group:"catcher",parameter:"color"},shadowCatcherAlpha:{key:"shadowCatcherAlpha",default:1,kind:"display",backends:lt,group:"catcher",parameter:"alpha"}},lo=Object.values(bp);function yc(i){return JSON.stringify(lo.map(e=>i[e.key]))}var yp=lo.filter(i=>i.group!=="channel"&&i.group!=="aov");function Cc(i){return JSON.stringify(yp.map(e=>i[e.key]))}function Mc(i,e){let t=new Map;for(let A of lo){let a=t.get(A.group);a||t.set(A.group,a={}),a[A.parameter]=i[A.key]}e.setToneMappingParams(t.get("toneMapping")),e.setBloomParams(t.get("bloom")),e.setHDROutputEnabled?.(t.get("hdr").enabled),e.setOutput(t.get("channel").channel),e.setAovDisplayOptions?.(t.get("aov")),e.setShadowCatcherParams(t.get("catcher").color,t.get("catcher").alpha)}var VA=class i{engine;canvas;toneMapping="agx";toneMappingExposure=1;contrast=1;saturation=1;temperature=0;tint=0;vignette=0;bloomIntensity=0;bloomThreshold=1;bloomRadius=.6;hdrOutputEnabled=!1;channel="final";aovDepthRange=[0,10];aovPositionScale=1;aovMotionScale=16;aovIdComponent="object";shadowCatcherColor=[0,0,0];shadowCatcherAlpha=1;constructor(e,t){this.engine=e,this.canvas=t}static _create(e,t){return new i(e,t)}setSize(e,t){if(!Number.isFinite(e)||!Number.isFinite(t)||e<1||t<1)throw new Error("Display dimensions must be positive.");e=Math.round(e),t=Math.round(t),this.canvas.width!==e&&(this.canvas.width=e),this.canvas.height!==t&&(this.canvas.height=t)}_filterSettings=new WeakMap;settings=new WeakMap;_configure(e){if(e._engine!==this.engine)throw new Error("Render belongs to another engine.");let t=e._output;if(!t)return;let A=vt(this.channel);if(!A&&!["final","normal","albedo","shadow","shadowCatcher"].includes(this.channel))throw new RangeError("Unknown display channel");if(A&&!e.aovs.includes(A))throw new Error(`AOV ${A} is not enabled on the selected render`);La({depthRange:this.aovDepthRange,positionScale:this.aovPositionScale,motionScale:this.aovMotionScale,idComponent:this.aovIdComponent});let a=yc(this),r=Cc(this),n=this.settings.get(e);n!==a&&(this.settings.set(e,a),n!==void 0&&this._filterSettings.get(e)!==r&&e._displayChanged(),this._filterSettings.set(e,r)),t.activate(),Mc(this,t)}_postProcesses=[];_warnedPostProcess=!1;addPostProcess(e){let t={pass:e};return this._postProcesses.push(t),this.engine.backend==="webgl"&&this.warnPostProcess(),()=>{let A=this._postProcesses.indexOf(t);A>=0&&this._postProcesses.splice(A,1)}}warnPostProcess(){this._warnedPostProcess||(this._warnedPostProcess=!0,console.warn("Display post-processing requires WebGPU; passes are ignored on WebGL."))}compose(e){if(e._engine!==this.engine)throw new Error("Render belongs to another engine.");let t=e._output;if(!t)return;let A=vt(this.channel);if(!(!A&&!t.presentationComplete)){if(A&&!e.aovs.includes(A))throw new Error(`AOV ${A} is not enabled on the selected render`);if(!(A&&t.aovReady&&!t.aovReady(A))){this._configure(e),t.drawPostProcess(),this._postProcesses.length&&this.engine.backend==="webgl"&&this.warnPostProcess();try{t.applyPostProcesses?.(this._postProcesses.map(a=>a.pass),e)}catch(a){this.engine._notifyError(a)}return t}}}present(e){if(e._engine!==this.engine)throw new Error("Render belongs to another engine.");let t=this.channel==="final"&&e.fallback?e._presentable:e._completeFor(this.channel),A=e.fallback,a=t?e:A&&(this.channel==="final"?A._presentable:A._completeFor(this.channel))?A:void 0;if(!a)return;let r=this.compose(a);if(r)return this.engine._present(r),a}async toBlob(e,t={}){let A=this.compose(e);if(!A)throw new Error("Render has no complete image.");let a=await A.readPresentation(),r=ht(a.width,a.height,"convertToBlob"in this.canvas),n=r.getContext("2d");if(!n)throw new Error("The image encoding context is not available.");let s=new Uint8ClampedArray(a.data.length);for(let o=0;o<s.length;o++)s[o]=Math.round(Math.min(1,Math.max(0,a.data[o]))*255);return n.putImageData(new ImageData(s,a.width,a.height),0,0),"convertToBlob"in r?r.convertToBlob({type:t.type??"image/png",quality:t.quality}):new Promise((o,l)=>r.toBlob(c=>c?o(c):l(new Error("The image could not be encoded")),t.type??"image/png",t.quality))}};var Ti=class{listeners=new Map;on(e,t){let A=this.listeners.get(e);return A||this.listeners.set(e,A=new Set),A.add(t),()=>{A.delete(t)}}emit(e,t){for(let A of[...this.listeners.get(e)??[]])try{A(t)}catch(a){console.error("Event listener failed.",a)}}clear(){this.listeners.clear()}};var Kr=new WeakMap;function Qc(i,e){let t=ge(i),A=Kr.get(i)??(t?{builder:t.builder??"builtin",layout:t.layout??"bvh2",spatialSplits:!1}:void 0);return!!A&&A.builder===e.builder&&A.layout===e.layout&&A.spatialSplits===e.spatialSplits}var co=new WeakMap;function ge(i){return co.get(i)}function ct(i,e,t){e?(co.set(i,e),t?Kr.set(i,{...t}):Kr.delete(i)):(co.delete(i),Kr.delete(i))}var $r=class{copies=new WeakMap;geometryVersions=new WeakMap;instanceVersions=new WeakMap;value;copying=new WeakSet;copy(e,t=!1){if(!e||typeof e!="object")return e;let A=e;if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&A instanceof HTMLCanvasElement||typeof OffscreenCanvas<"u"&&A instanceof OffscreenCanvas||typeof ImageBitmap<"u"&&A instanceof ImageBitmap){let r=A,n=this.copies.get(A);n||(n=ht(r.width,r.height),this.copies.set(A,n)),n.width=r.width,n.height=r.height;let s=n.getContext("2d");if(!s)throw new Error("Texture snapshot context is not available.");return s.drawImage(r,0,0),n}if(typeof Node<"u"&&A instanceof Node)return e;if(e instanceof Ge&&this.geometryVersions.get(e)===e.version)return this.copies.get(e);if(ArrayBuffer.isView(e)){let r=this.copies.get(A);if(r?.constructor===e.constructor&&r.length===e.length)return r.set(e),r;let n=e.slice();return this.copies.set(A,n),n}if(e instanceof ArrayBuffer)return e.slice(0);let a=this.copies.get(A);if(a||(a=Array.isArray(e)?[]:Object.create(Object.getPrototypeOf(e)),this.copies.set(A,a)),(e instanceof ji||e instanceof qi)&&(a.aovId=e.aovId),this.copying.has(A))return a;this.copying.add(A);try{for(let r of Object.keys(e))if(e instanceof be&&(r==="transforms"||r==="colors")){let n=this.instanceVersions.get(e),s=r==="transforms"?e.transformsVersion:e.colorsVersion,o=r==="transforms"?n?.transformsVersion:n?.colorsVersion,l=e[r];(!n||o!==s||n[r]!==l)&&(l?n?.[r]===l&&a[r]?.length===l.length?a[r].set(l):a[r]=l.slice():a[r]=void 0)}else a[r]=e instanceof Ke&&r==="source"?e.source:this.copy(e[r],t)}finally{this.copying.delete(A)}if(Array.isArray(e)&&(a.length=e.length),e instanceof be&&this.instanceVersions.set(e,{transformsVersion:e.transformsVersion,transforms:e.transforms,colorsVersion:e.colorsVersion,colors:e.colors}),e instanceof Ge){this.geometryVersions.set(e,e.version);let r=ge(e);(r||!t)&&ct(a,r),ql(e,a)}return a}mirror(e){return this.copies.get(e)}capture(e,t){if(!this.value||t.meshes==="full")this.value={meshes:this.copy(e.meshes),lights:this.copy(e.lights),background:this.copy(e.background)};else{for(let A of t.transforms)this.copy(A.transform),A instanceof be&&this.copy(A,!0);for(let A of t.colors)this.copy(A,!0);for(let A of t.geometries)this.copy(A,!0);for(let A of t.materials)this.copy(A);t.lights&&(this.value.lights=this.copy(e.lights)),t.background&&(this.value.background=this.copy(e.background))}return this.value}};function Se(i){return i instanceof Float64Array?i:i instanceof Float32Array?new Float64Array(i):new Float64Array(i)}function uo(i,e){return i instanceof Float32Array||i instanceof Float64Array,fo(i,e)}function fo(i,e){for(let t=0;t<e.length;t++)Je(i,t,e[t])}function Pc(i,e,t,A,a){Ya(i);let r=i.length,n=6,s=new Float32Array(r*n*4);function o(l,c){for(let f=0;f<3;f++)s[f+l*4]=Q(c,f)}for(let l=0;l<r;l++){let c=i[l],f=c.color,m=c.intensity,d=l*n;o(d,[Q(c.transform,12),Q(c.transform,13),Q(c.transform,14)]),s[d*4+3]=t(l)??1/Math.max(r,1);let u=c.type==="SpotLight"?Wa(c):m;o(d+1,[f[0]*u,f[1]*u,f[2]*u]),s[(d+1)*4+3]=A(l)??(l+1)/r,c.type==="RectLight"?(o(d+2,Na(c,0)),s[(d+2)*4+3]=c.spread,o(d+3,Na(c,1)),s[(d+3)*4+3]=e[l]??-1,o(d+4,[c.spread,ka(c),3])):c.type==="SphereLight"?o(d+4,[c.radius,Ga(c),2]):c.type==="SpotLight"?(o(d+2,Fa(c)),o(d+3,[Math.cos(c.outerAngle*Math.PI/180),Math.cos(Math.min(c.innerAngle,c.outerAngle)*Math.PI/180),0]),s[(d+3)*4+3]=a(l)??-1,o(d+4,[c.radius,Ha(c),4])):c.type==="DirectionalLight"&&(o(d+2,Fa(c)),o(d+4,[0,0,1])),o(d+5,za(c).x)}return s}function za(i){let e=Se(i.transform),t=(s,o)=>{let l=Math.hypot(Q(s,0),Q(s,1),Q(s,2));return l>1e-12?[Q(s,0)/l,Q(s,1)/l,Q(s,2)/l]:o},A=t([Q(e,8),Q(e,9),Q(e,10)],[0,0,1]),a=Q(e,0)*Q(A,0)+Q(e,1)*Q(A,1)+Q(e,2)*Q(A,2),r=[Q(e,0)-a*Q(A,0),Q(e,1)-a*Q(A,1),Q(e,2)-a*Q(A,2)];Math.hypot(...r)<=1e-12&&(r=Math.abs(Q(A,1))<.99?[Q(A,2),0,-Q(A,0)]:[1,0,0]),r=t(r,[1,0,0]);let n=[Q(A,1)*Q(r,2)-Q(A,2)*Q(r,1),Q(A,2)*Q(r,0)-Q(A,0)*Q(r,2),Q(A,0)*Q(r,1)-Q(A,1)*Q(r,0)];return{x:r,y:n,direction:[-Q(A,0)||0,-Q(A,1)||0,-Q(A,2)||0]}}function Fa(i){return za(i).direction}function Na(i,e){let t=za(i),A=e?t.y:t.x,r=Se(i.size)[e]*(e?-1:1);return[Q(A,0)*r,Q(A,1)*r,Q(A,2)*r]}function ka(i){let e=Se(i.size);return e[0]*e[1]}function Ga(i){return 4*Math.PI*i.radius**2}function Ha(i){return 4*Math.PI*i.radius**2}function Wa(i){return i.radius===0?i.intensity:i.intensity/(Math.PI*i.radius**2)}function mo(i){let e=Math.cos(i.outerAngle*Math.PI/180);return .5*(1-.5*(Math.cos(Math.min(i.innerAngle,i.outerAngle)*Math.PI/180)+e))}var Ic=new WeakSet;function Ya(i,e){for(let t of i){if(t.type==="EnvironmentLight")continue;let A=!1,a=(r,n,s,o)=>{let l=Math.min(s,Math.max(n,Number.isFinite(r)?r:o));return A||=!Object.is(l,r),l};switch(t.type){case"AmbientLight":Oa(t,a);break;case"DirectionalLight":Oa(t,a);break;case"RectLight":Oa(t,a);break;case"SphereLight":Oa(t,a);break;case"SpotLight":Oa(t,a);break}if(t.type!=="AmbientLight"){let r=t.transform;A=(r instanceof Float32Array,Sc(r)||A)}if(t.type==="RectLight"){let r=t.size;r instanceof Float32Array,r[0]=a(r[0],0,Number.MAX_VALUE,1),r[1]=a(r[1],0,Number.MAX_VALUE,1),t.spread=a(t.spread,0,1,1)}if(t.type==="SphereLight"&&(t.radius=a(t.radius,0,Number.MAX_VALUE,1)),t.type==="SpotLight"&&(t.radius=a(t.radius,0,Number.MAX_VALUE,.01)),t.type==="SpotLight"&&(t.outerAngle=a(t.outerAngle,Number.EPSILON,180,45),t.innerAngle=a(t.innerAngle,0,t.outerAngle,30)),A&&!Ic.has(t)){Ic.add(t);let r=new Error(`Invalid ${t.type} values were clamped.`);console.warn(r.message),e?.(r)}}}function Oa(i,e){i.intensity=e(i.intensity,0,Number.MAX_VALUE,1),i.color[0]=e(i.color[0],0,Number.MAX_VALUE,1),i.color[1]=e(i.color[1],0,Number.MAX_VALUE,1),i.color[2]=e(i.color[2],0,Number.MAX_VALUE,1)}function Sc(i){let e=!1;for(let t=0;t<16;t++)Number.isFinite(Q(i,t))||(Je(i,t,t%5===0?1:0),e=!0);return e}function Dc(i,e,t=[],A=[],a=[]){return Pc(i,e,r=>t[r],r=>A[r],r=>a[r])}function Tt(i){return i.instanceData?.count??1}function tA(i,e,t,A=Se(i.transform)){let a=i.instanceData;if(!a)return oe.copy(t,A);let r=a.transforms,n=e*16;for(let s=0;s<4;s++){let o=n+s*4,l=r[o],c=r[o+1],f=r[o+2],m=r[o+3];for(let d=0;d<4;d++)Je(t,s*4+d,Q(A,d)*l+Q(A,d+4)*c+Q(A,d+8)*f+Q(A,d+12)*m)}return t}var Tc=new WeakSet;function ho(i,e,t){let A=i.materialIndex;if(!A)return 0;let a=A.array[e];return A.itemSize===1&&Number.isInteger(a)&&a>=0&&a<t?a:(Tc.has(A.array)||(Tc.add(A.array),console.warn("Invalid geometry.materialIndex; expected itemSize 1 and an index within mesh.materials. Falling back to material 0.")),0)}function tn(i,e,t,A=0,a=!1){let r=i.vertexCount;if(t.fill(0,A*4,(A+r)*4),!(!i.materialIndex&&!a))for(let n=0;n<r;n++){let s=ho(i,n,e.length);t[(A+n)*4]=ja(e[s]??0,1)}}function ja(i,e){return Math.round(e*255)+(i<<8)}var go=[.2126,.7152,.0722];function ai(i){return Math.max(i[0]*go[0]+i[1]*go[1]+i[2]*go[2],0)}function rn(i){let e=ai(i.color)*i.intensity;if(!(e>0))return 0;if(i.type==="RectLight")return e*Math.PI*Math.max(ka(i),0);if(i.type==="SphereLight")return i.radius===0?e*4*Math.PI:e*Math.PI*Math.max(Ga(i),0);if(i.type==="SpotLight"){let t=ai(i.color)*Wa(i);return i.radius===0?e*4*Math.PI*mo(i):t*Math.PI*Ha(i)*mo(i)}return e*4*Math.PI}function nn(i,e=0){let t=new Int32Array(i.length).fill(-1),A=[],a=new Map;i.forEach((n,s)=>{if(n.type!=="SpotLight"||!n.iesProfile)return;let o=a.get(n.iesProfile);o==null&&(o=A.length,a.set(n.iesProfile,o),A.push(n.iesProfile)),t[s]=e+o*(16384/4)});let r=new Float32Array(A.length*128*128);return A.forEach((n,s)=>r.set(n.data,s*128*128)),{data:r,offsets:t,texelCount:r.length/4}}var Rc=new WeakMap;function sn(i){if(!i?.data||!i.width||!i.height)return 0;let e=Rc.get(i);if(e!==void 0)return e;let{data:t,width:A,height:a}=i,r=Sp(t,A,a);return Rc.set(i,r),r}var yi=class{count=0;sourceTypes=new Uint32Array(0);sourceIndices=new Uint32Array(0);weights=new Float64Array(0);reserve(e){this.count=0,this.weights.length<e&&(this.sourceTypes=new Uint32Array(e),this.sourceIndices=new Uint32Array(e),this.weights=new Float64Array(e))}push(e,t,A){if(!(A>0)||!isFinite(A))return;let a=this.count++;this.sourceTypes[a]=e,this.sourceIndices[a]=t,this.weights[a]=A}};function Bo(i){let e;if(!Array.isArray(i))e=i;else{e=new yi,e.reserve(i.length);for(let d of i)e.push(d.sourceType,d.sourceIndex,d.weight)}let t=e.count,A=0;for(let d=0;d<t;d++)A+=e.weights[d];if(!t||!(A>0))return{choices:new Uint32Array(4),pmfs:new Float32Array(0),totalWeight:0};let a=new Float32Array(t),r=new Float64Array(t),n=new Uint32Array(t),s=new Uint32Array(t),o=0,l=0;for(let d=0;d<t;d++)a[d]=e.weights[d]/A,r[d]=a[d]*t,r[d]<1?n[o++]=d:s[l++]=d;let c=new ArrayBuffer(t*16),f=new Float32Array(c),m=new Int32Array(c);for(;o&&l;){let d=n[--o]+0,u=s[--l]+0;f[d*4]=r[d],m[d*4+1]=u,r[u]=r[u]+r[d]-1,r[u]<1?n[o++]=u:s[l++]=u}for(let d=0;d<o;d++){let u=n[d];f[u*4]=1,m[u*4+1]=u}for(let d=0;d<l;d++){let u=s[d];f[u*4]=1,m[u*4+1]=u}for(let d=0;d<t;d++)m[d*4+2]=e.sourceTypes[d],m[d*4+3]=e.sourceIndices[d];return{choices:new Uint32Array(c),pmfs:a,totalWeight:A}}function Lc(i,e=new yi){let t=0;for(let A=0;A<i.count;A++)i.sourceTypes[A]===3&&t++;if(t){e.reserve(i.count-t);for(let A=0;A<i.count;A++)i.sourceTypes[A]!==3&&e.push(i.sourceTypes[A],i.sourceIndices[A],i.weights[A]);return Bo(e)}}function Cp(i,e,t,A){return ho(i,e[t],A)}function Mp(i,e){let t=[],A=[S.create(),S.create(),S.create()],a=[S.create(),S.create(),S.create()],r=S.create(),n=S.create(),s=S.create();for(let{mesh:o,geometry:l,materialIndices:c}of i){let f=[];for(let u=0;u<Math.max(1,c.length);u++){let p=e[c[u]??c[0]??0];f.push(!p||p.shadowCatcher||p.unlit?0:ai(Si(p)))}let m=new Float64Array(16),d=Se(o.transform);for(let u=0;u<Tt(o);u++){tA(o,u,m,d);let p=l.indexArray,g=l.position.array,v=l.uv?.array,h=l.uv1?.array??v;for(let B=0;B<wt(p);B+=3){let E=Cp(l,p,B,c.length),x=c[E]??c[0]??0,y=f[E];if(!(y>1e-8))continue;let M=[J(p,B),J(p,B+1),J(p,B+2)];for(let R=0;R<3;R++){let D=M[R];S.set(A[R],g[D*l.position.itemSize],g[D*l.position.itemSize+1],g[D*l.position.itemSize+2]),S.transformMat4(a[R],A[R],m)}S.sub(r,a[1],a[0]),S.sub(n,a[2],a[0]),S.cross(s,r,n);let b=.5*S.length(s);if(!(b>1e-10)||!isFinite(b))continue;let T=M.map(R=>v?[v[R*2],v[R*2+1]]:[0,0]),O=M.map(R=>h?[h[R*2],h[R*2+1]]:[0,0]);t.push({p0:S.clone(a[0]),p1:S.clone(a[1]),p2:S.clone(a[2]),uv0:T[0],uv1:T[1],uv2:T[2],secondaryUv0:O[0],secondaryUv1:O[1],secondaryUv2:O[2],materialIndex:x,area:b,samplingLuminance:y,selectionPmf:0})}}}return t}function vo(i,e,t){if(i.buffer===t.buffer){i.set(t,e);return}i[e]=t[0],i[e+1]=t[1],i[e+2]=t[2]}function Oc(i,e=new Float32Array(Math.max(i.length,1)*24)){return i.forEach((t,A)=>{let a=A*24;vo(e,a,t.p0),e[a+3]=t.selectionPmf,vo(e,a+4,t.p1),e[a+7]=t.area,vo(e,a+8,t.p2),e[a+11]=t.materialIndex,e[a+12]=t.uv0[0],e[a+13]=t.uv0[1],e[a+14]=t.uv1[0],e[a+15]=t.uv1[1],e[a+16]=t.uv2[0],e[a+17]=t.uv2[1],e[a+18]=t.secondaryUv0[0],e[a+19]=t.secondaryUv0[1],e[a+20]=t.secondaryUv1[0],e[a+21]=t.secondaryUv1[1],e[a+22]=t.secondaryUv2[0],e[a+23]=t.secondaryUv2[1]}),e}var Uc=new WeakMap,Va=class{constructor(){Uc.set(this,new WeakMap)}_triangles=[];collect(e,t){let A=Uc.get(this);this._triangles.length=0;for(let a of e){let{mesh:r,geometry:n,materialIndices:s}=a,o=d=>{let u=t[d];return!!u&&!u.unlit&&!u.shadowCatcher&&ai(Si(u))>1e-8},l=r.instanceData?.transformsVersion??0,c=Tt(r),f=r.instanceData?.transforms,m=A.get(r);if(!m||m.geometry!==n||m.version!==n.version||m.instanceVersion!==l||m.instanceCount!==c||m.instanceTransforms!==f||m.indices.length!==s.length||s.some((d,u)=>m.indices[u]!==d||m.activity[u]!==o(d))||Ip(r,m.matrix))m={geometry:n,version:n.version,instanceVersion:l,instanceCount:c,instanceTransforms:f,matrix:Qp(r),indices:s.slice(),activity:s.map(o),triangles:Mp([a],t)},A.set(r,m);else for(let d of m.triangles){let u=t[d.materialIndex];d.samplingLuminance=ai(Si(u))}for(let d of m.triangles)this._triangles.push(d)}return this._triangles}};function Qp(i){return Se(i.transform)}function Ip(i,e){let t=Se(i.transform);for(let A=0;A<t.length;A++)if(!Object.is(t[A],e[A]))return!0;return!1}function Sp(i,e,t){return i instanceof Uint8Array||i instanceof Uint8ClampedArray?An(i,e,t,1/255):(i instanceof Float32Array,An(i,e,t,1))}function An(i,e,t,A){let a=Math.max(Math.floor(Zi(i)/(e*t)),1),r=0;for(let n=0;n<t;n++){let s=Math.sin(Math.PI*(n+.5)/t);for(let o=0;o<e;o++){let l=(n*e+o)*a;r+=ai([ti(i,l)*A,ti(i,l+Math.min(1,a-1))*A,ti(i,l+Math.min(2,a-1))*A])*s}}return r*(2*Math.PI*Math.PI)/(e*t)}function Eo(i){let e=1/0,t=1/0,A=1/0,a=-1/0,r=-1/0,n=-1/0,s=i.position.array,o=i.position.itemSize;for(let l=0;l+2<s.length;l+=o){let c=s[l],f=s[l+1],m=s[l+2];!Number.isFinite(c)||!Number.isFinite(f)||!Number.isFinite(m)||(e=Math.min(e,c),t=Math.min(t,f),A=Math.min(A,m),a=Math.max(a,c),r=Math.max(r,f),n=Math.max(n,m))}return[S.fromValues(e,t,A),S.fromValues(a,r,n)]}function iA(i){let e=ge(i),t=new Float32Array(e.buffer);if(e.layout==="bvh4")return[[t[0],t[1],t[2]],[t[0]+t[3],t[1]+t[4],t[2]+t[5]]];if(e.layout==="bvh-gpu")return new Uint32Array(e.buffer)[11]===0?[[Math.min(t[0],t[8]),Math.min(t[1],t[9]),Math.min(t[2],t[10])],[Math.max(t[4],t[12]),Math.max(t[5],t[13]),Math.max(t[6],t[14])]]:Eo(i);if(e.layout==="cwbvh"){let A=new Uint32Array(e.buffer),a=A[3],r=l=>l<<24>>24,n=[2**r(a),2**r(a>>8),2**r(a>>16)],s=[t[0],t[1],t[2]],o=[...s];for(let l=0;l<8;l++){if(!(A[6+(l>>2)]>>(l&3)*8&255))continue;let f=(l&3)*8,m=l>>2;o[0]=Math.max(o[0],s[0]+(A[14+m]>>f&255)*n[0]),o[1]=Math.max(o[1],s[1]+(A[16+m]>>f&255)*n[1]),o[2]=Math.max(o[2],s[2]+(A[18+m]>>f&255)*n[2])}return[s,o]}return[[t[0],t[1],t[2]],[t[4],t[5],t[6]]]}function qa(i,e,t,A=_o(),a=S.create()){let r=Se(e),n=Se(t[0]),s=Se(t[1]),{min:o,max:l}=A;S.set(o,1/0,1/0,1/0),S.set(l,-1/0,-1/0,-1/0);for(let c=0;c<8;c++)S.set(a,c&1?s[0]:n[0],c&2?s[1]:n[1],c&4?s[2]:n[2]),S.transformMat4(a,a,r),ri(a)&&(S.min(o,o,a),S.max(l,l,a));return A}function Yt(i,e,t){if(e&&!Array.isArray(e)&&t&&e.bindingSlots.length===i.length&&e.bindingSlots.every((r,n)=>r.length===Tt(i[n].mesh))){let r=e.copy(),n=new Float64Array(16),s=_o(),o=S.create(),l=!1,c=new Map;for(let f of t){let m=i[e.bindingIndices[f]],d=e.localIndices[f];if(!m||d>=Tt(m.mesh)){l=!0;break}let u=c.get(m.mesh);u||(u=Se(m.mesh.transform),c.set(m.mesh,u)),tA(m.mesh,d,n,u);let p=qa(m.geometry,n,m.bvhBounds,s,o);if(!ri(p.min)||!ri(p.max)||!ri(n)){l=!0;break}r.transforms.set(n,f*16),r.bounds.set(p.min,f*6),r.bounds.set(p.max,f*6+3)}if(!l)return r}if(i.some(r=>r.mesh.instanceData!=null)){let r=new _A(i.reduce((c,f)=>c+Tt(f.mesh),0)),n=new Float64Array(16),s=_o(),o=S.create(),l=0;for(let c=0;c<i.length;c++){let f=i[c],m=[];r.bindingSlots.push(m);let{mesh:d,geometry:u,bvhBounds:p,blasIndex:g,materialIndices:v,displacementScale:h}=f,B=Se(d.transform);for(let E=0;E<Tt(d);E++,l++){tA(d,E,n,B);let x=qa(u,n,p,s,o);if(!ri(x.min)||!ri(x.max)||!ri(n))continue;let y=r.length++;r.sourceIndices[y]=l,r.bindingIndices[y]=c,r.localIndices[y]=E,m.push(y),r.transforms.set(n,y*16),r.bounds.set(x.min,y*6),r.bounds.set(x.max,y*6+3),r.blasIndices[y]=g,r.materials[y]=ja(v[0],1),r.displacement[y]=h;let M=d.instanceData?.colors;for(let b=0;b<3;b++)r.colors[y*3+b]=M?.[E*3+b]??1}}return r}let A=({mesh:r,geometry:n,blasIndex:s,materialIndices:o,displacementScale:l,bvhBounds:c})=>({bounds:qa(n,r.transform,c),blasIndex:s,transform:Se(r.transform),materialsIndices:o.map(f=>ja(f,1)),displacementScale:l});if(!e||!t||!Array.isArray(e))return i.map(A);let a=e.slice();return t.forEach(r=>{let n=i[r];n&&(a[r]=A(n))}),a}function Ja(i,e,t){let A=new Set;for(let a=0;a<i.length;a++)if(e.has(i[a].mesh))if(Array.isArray(t))A.add(a);else for(let r of t.bindingSlots[a]??[])A.add(r);return A}function Fc(i,e,t=iA,A=!0){let a=new Map,r=new Map,n=new Map,s=[],o=[],l=[],c=[],f=[],m=i.filter(p=>p.geometry.position?.array.length>0).map(p=>{let{geometry:g,displacementScale:v}=e(p),h=n.get(g);if(!h){let b=t(g);h=[Se(b[0]),Se(b[1])],n.set(g,h)}let B=[h[0].slice(),h[1].slice()],E=qa(g,p.transform,B),x=r.get(g),y=p.materials.map(b=>{let T=b;return a.has(T)||(a.set(T,o.length),o.push(b)),a.get(T)});if(x!=null&&g.materialIndex&&(y.length!==l[x].length||y.some((b,T)=>b!==l[x][T]))){let b=ge(g);g=new Ge(g),ct(g,b),x=void 0}x==null&&(x=s.length,r.set(g,s.length),s.push(g),l.push(y));let M={bounds:E,blasIndex:x,transform:Se(p.transform),materialsIndices:y.map(b=>ja(b,1)),displacementScale:v};if(!(p.instanceData==null&&(!ri(E.min)||!ri(E.max)||!ri(p.transform))))return p.materials.some(b=>!b.unlit&&!b.shadowCatcher&&ai(b.emissionColor)*b.emissionLuminance>1e-8)&&c.push({mesh:p,geometry:g,materialIndices:y}),f.push({mesh:p,geometry:g,blasIndex:x,materialIndices:y,displacementScale:v,bvhBounds:B}),M}).filter(p=>p!=null),d=new Map;return{geometry:xo(s,l,d),geometries:s,geometryRegions:d,geometryStates:new Map(f.map(p=>{let g=p.mesh.geometry;return[g,{topologyVersion:g.topologyVersion,indices:g.indices.array,indexCount:g.indexArray.length}]})),instances:i.some(p=>p.instanceData!=null)?Yt(f):m,materials:o,instanceBindings:f,emissiveBindings:c,blases:A?s.map(p=>({bvh:ge(p),verticesCount:p.vertexCount,trainglesCount:p.indexArray.length/3})):[]}}function xo(i,e,t,A=!1){let a=i.reduce((B,E)=>B+E.vertexCount,0),r=i.reduce((B,E)=>B+E.indexArray.length,0),n=new X(new Float32Array(3*a),3),s=new X(new Float32Array(3*a),3),o=new X(new Float32Array(2*a),2),l=new X(new Float32Array(2*a),2),c=new X(new Uint32Array(r),1),f=new X(new Int32Array(4*a),4),m=A?i.find(B=>B.color||B.tangent):void 0,d=A?!!m?.color:i.some(B=>B.color),u=A?!m?.color&&!!m?.tangent:i.some(B=>B.tangent),p=A?3:4,g=new Ge({position:n,normal:s,uv:o,uv1:l,materialIndex:f,color:d?new X(new Float32Array(3*a).fill(1),3):void 0,tangent:u?new X(new Float32Array(p*a),p):void 0,indices:c}),v=0,h=0;return i.forEach((B,E)=>{let x=B.vertexCount,y=e[E];if(t.set(B,{vertexOffset:v,indexOffset:h,materialIndices:y}),n.array.set(B.position.array,v*3),s.array.set(B.normal.array,v*3),B.uv&&o.array.set(B.uv.array,v*2),l.array.set((B.uv1??B.uv)?.array??new Float32Array(x*2),v*2),g.color&&B.color&&g.color.array.set(B.color.array,v*3),g.tangent&&B.tangent){let b=B.tangent;if(A)g.tangent.array.set(b.array,v*p);else for(let T=0;T<x;T++)for(let O=0;O<4;O++)g.tangent.array[(v+T)*4+O]=O<b.itemSize?b.array[T*b.itemSize+O]:yr(B)?0:2}tn(B,y,f.array,v,A);let M=B.indexArray;for(let b=0;b<wt(M);b++)c.array[h+b]=v+J(M,b);v+=x,h+=wt(M)}),g}function Ka(i){let e=i.indexArray,t=i.position.array;i.normal=new X(new Float32Array(t.length),3);let A=i.normal.array,a=S.create(),r=S.create(),n=S.create(),s=S.create(),o=S.create(),l=S.create(),c=e?e.length:i.vertexCount,f,m,d;for(let u=0;u<c;){e?(f=J(e,u++),m=J(e,u++),d=J(e,u++)):(f=u++,m=u++,d=u++),S.set(a,t[f*3],t[f*3+1],t[f*3+2]),S.set(r,t[m*3],t[m*3+1],t[m*3+2]),S.set(n,t[d*3],t[d*3+1],t[d*3+2]),S.sub(s,a,r),S.sub(o,r,n),S.cross(l,s,o);for(let p=0;p<3;p++)A[f*3+p]=A[f*3+p]+l[p],A[m*3+p]=A[m*3+p]+l[p],A[d*3+p]=A[d*3+p]+l[p]}for(let u=0;u<A.length;)S.set(l,A[u],A[u+1],A[u+2]),S.normalize(l,l),A[u++]=l[0],A[u++]=l[1],A[u++]=l[2]}function ri(i){return i instanceof Float32Array||i instanceof Float64Array,wo(i)}function wo(i){let e=i.length;for(let t=0;t<e;t++)if(!Number.isFinite(Q(i,t)))return!1;return!0}function _o(){return new Pl}function Nc(i,e){if(e===0)return i;let t=i.position.array.slice(),A=i.normal.array;for(let r=0;r<i.vertexCount;r++){let n=r*i.position.itemSize,s=r*i.normal.itemSize,o=Math.hypot(A[s],A[s+1],A[s+2]);if(o>0)for(let l=0;l<3;l++)t[n+l]+=A[s+l]/o*e}let a=new Ge(i);return a.position=new X(t,i.position.itemSize),a}function zc(i,e,t){let A=[],a=Math.log2(i),r=i;for(let n=0;n<=a;n++){let s=A[Math.max(0,n-1)],o=new Uint8Array(r*r*2);A.push(o);let l=n===0?e:2;for(let c=0;c<r;c++)for(let f=0;f<r;f++){let m=c*r+f,d=m*l,u=0,p=0;if(n==0){if(u=t(d),p=u,c<r-1&&f<r-1){let g=t(d+(r+1)*l);u=Math.min(u,g),p=Math.max(p,g)}if(c<r-1){let g=t(d+r*l);u=Math.min(u,g),p=Math.max(p,g)}if(f<r-1){let g=t(d+l);u=Math.min(u,g),p=Math.max(p,g)}}else{let g=f*2,v=c*2,h=r*2,B=(v*h+g)*l,E=B,x=B+l,y=B+h*l,M=B+h*l+l;u=Math.min(s[E],s[x],s[y],s[M]),p=Math.max(s[E+1],s[x+1],s[y+1],s[M+1])}o[m*2]=u,o[m*2+1]=p}r=r/2}return A}function bo(i,e){let t=Math.atan2(Q(i,0),Q(i,2))/(2*Math.PI)+.5,A=Math.acos(Q(i,1))/Math.PI;le.set(e,t,1-A)}function Pp(i,e,t,A,a,r){bo(i,A),bo(e,a),bo(t,r);let n=!1;for(let s=0;s<2;s++)if(Math.abs(Q(A,s)-Q(a,s))>.5||Math.abs(Q(A,s)-Q(r,s))>.5||Math.abs(Q(a,s)-Q(r,s))>.5){let o=Math.max(Q(A,s),Q(a,s),Q(r,s));o-Q(A,s)>.5&&(Je(A,s,Q(A,s)+1),n=!0),o-Q(a,s)>.5&&(Je(a,s,Q(a,s)+1),n=!0),o-Q(r,s)>.5&&(Je(r,s,Q(r,s)+1),n=!0)}return n}function yo(i){let e=Math.abs(Q(i,0)),t=Math.abs(Q(i,1)),A=Math.abs(Q(i,2));return e>t&&e>A?0:t>A?1:2}function Dp(i,e,t,A,a,r,n,s,o){let l=Math.max(Math.abs(Q(A,0)),Math.abs(Q(a,0)),Math.abs(Q(r,0))),c=Math.max(Math.abs(Q(A,1)),Math.abs(Q(a,1)),Math.abs(Q(r,1))),f=Math.max(Math.abs(Q(A,2)),Math.abs(Q(a,2)),Math.abs(Q(r,2)));l>c&&l>f?(le.set(n,Q(i,1),Q(i,2)),le.set(s,Q(e,1),Q(e,2)),le.set(o,Q(t,1),Q(t,2))):c>l&&c>f?(le.set(n,Q(i,0),Q(i,2)),le.set(s,Q(e,0),Q(e,2)),le.set(o,Q(t,0),Q(t,2))):(le.set(n,Q(i,0),Q(i,1)),le.set(s,Q(e,0),Q(e,1)),le.set(o,Q(t,0),Q(t,1)))}function Tp(i,e,t,A){let a=le.sub(le.create(),e,i),r=Math.max(a[0],a[1]),n=t-Math.floor(Math.log2(Math.floor(1/r)))-1;isFinite(n)||(n=t),n=Math.max(n,0);let s=0;for(;;){let o=Math.pow(2,t-n),l=Math.floor(o*Q(i,0)),c=Math.floor(o*Q(i,1)),f=Math.floor(o*Q(e,0)),m=Math.floor(o*Q(e,1));if(f-l<2&&m-c<2&&n>=0||n>=t){for(let d=c;d<=m;d++)for(let u=l;u<=f;u++)s<A.length&&(S.set(A[s],Math.floor(u),Math.floor(d),n),s++);break}n++}return s}function Co(i){if(i<1e5)return;let e=new Float32Array(i*2);for(let t=0;t<i;t++)e[t*2+1]=1;return e}function kc(i,e,t,A,a){let r=i.indexArray,n=i.uv?.array,s=a.displacementUvProjection;if(!n&&s==="none")throw new Error("UV displacement requires texture coordinates; use triplanar, spherical, or cylindrical projection for a UV-less mesh.");let o=Co(wt(r)/3);if(o)return o;let l=Math.log2(t),c=new Float32Array(wt(r)/3*2),f=i.normal.array,m=i.position.array,d=le.create(),u=le.create(),p=le.create(),g=S.create(),v=S.create(),h=S.create(),B=S.create(),E=S.create(),x=S.create(),y=s==="triplanar",M=s==="spherical",b=s==="cylindrical",T=a.displacementUvProjectionScale,O=le.create(),R=le.create(),D=[];for(let L=0;L<100;L++)D.push(new Float64Array(3));for(let L=0;L<wt(r);L+=3){let se=J(r,L),q=J(r,L+1),re=J(r,L+2),w=se*2,N=q*2,H=re*2,ee=se*3,te=q*3,Y=re*3;n?(le.set(d,J(n,w),J(n,w+1)),le.set(u,J(n,N),J(n,N+1)),le.set(p,J(n,H),J(n,H+1))):(le.set(d,0,0),le.set(u,0,0),le.set(p,0,0));let ne=!1;if(y||M||b)if(S.set(B,J(f,ee),J(f,ee+1),J(f,ee+2)),S.set(E,J(f,te),J(f,te+1),J(f,te+2)),S.set(x,J(f,Y),J(f,Y+1),J(f,Y+2)),S.normalize(B,B),S.normalize(E,E),S.normalize(x,x),(y||M||b)&&(S.set(g,J(m,ee),J(m,ee+1),J(m,ee+2)),S.set(v,J(m,te),J(m,te+1),J(m,te+2)),S.set(h,J(m,Y),J(m,Y+1),J(m,Y+2))),y){let _e=yo(B),Me=yo(E),Qe=yo(x);_e===Me&&Me===Qe||(ne=!0),Dp(g,v,h,B,E,x,d,u,p)}else if(M)S.normalize(g,g),S.normalize(v,v),S.normalize(h,h),ne=Pp(g,v,h,d,u,p);else{let _e=Math.atan2(g[2],g[0])/(Math.PI*2)+.5,Me=Math.atan2(v[2],v[0])/(Math.PI*2)+.5,Qe=Math.atan2(h[2],h[0])/(Math.PI*2)+.5;le.set(d,_e,g[1]),le.set(u,Me,v[1]),le.set(p,Qe,h[1]),ne=Math.max(_e,Me,Qe)-Math.min(_e,Me,Qe)>.5}le.scale(d,d,T),le.scale(u,u,T),le.scale(p,p,T);let Le=1/0,fe=-1/0;if(ne)Le=0,fe=255;else{le.copy(R,d),le.copy(O,d),le.min(O,O,u),le.min(O,O,p),le.max(R,R,u),le.max(R,R,p);let _e=Tp(O,R,l,D);for(let Me=0;Me<_e;Me++){let Qe=Q(D[Me],2),de=Math.pow(2,l-Qe),xe=e[Qe],We=(Q(D[Me],0)%de+de)%de,Oe=(Q(D[Me],1)%de+de)%de;A&&(Oe=de-Oe-1);let Ze=(Oe*de+We)*2;Le=Math.min(Le,xe[Ze]),fe=Math.max(fe,xe[Ze+1])}}c[L/3*2]=Math.max((Math.floor(Le)-4)/255,0),c[L/3*2+1]=Math.min((Math.ceil(fe)+4)/255,1)}return c}function on(i){return i.materials[0]}function ln(i){return on(i).displacementMap}function Xa(i){return i.materials[0].displacementScale}var Mo=new WeakMap,Rp=1,Gc=new WeakMap;function Hc(i){let e=Gc.get(i);return e==null&&(e=Rp++,Gc.set(i,e)),e}function cn(i){let e=i.image;return[Hc(i.source??i),Hc(e),i.version,e.width,e.height].join("|")}var $a=new Map;function fn(i){let e=i.geometry,t=on(i),A=t?.displacementMap;if(!t)return;let a=Xa(i);if(A&&(a!==0||t.displacementBias!==0))return["displacement",e.version,cn(A),+A.flipY,A.uvScale.join(","),A.uvOffset.join(","),A.uvChannel,A.wrapS,A.wrapT,A.colorSpace,a,t.displacementBias,t.displacementUvProjectionScale,t.displacementUvProjection].join("|")}function Up(i){let e=fn(i);if(e==null)return i.geometry;let t=Mo.get(i.geometry)?.get(e);if(!t){let A=new Ge(i.geometry);return A.dynamic=i.geometry.dynamic,A.version=i.geometry.version,Lp(i,A)}return t}function Lp(i,e){let t=fn(i);if(t==null)return i.geometry;let A=Mo.get(i.geometry);return A||(A=new Map,Mo.set(i.geometry,A)),A.size>=4&&!A.has(t)&&A.clear(),A.set(t,e),e}function AA(i){return Up(i)??i.geometry}function Op(i,e){let t=e.width,A,a,r;if(pt(e))A=e.data,a=Math.max(1,Math.floor(e.data.length/(e.width*e.height))),r=e.data instanceof Uint8Array||e.data instanceof Uint8ClampedArray?s=>s:s=>Math.round(Math.min(Math.max(s,0),1)*255);else{let n=ht(),s=n.getContext("2d");if(!s)throw new Error("The displacement texture is not CPU-readable.");if(n.width=t,n.height=t,mi(e))throw new Error("ProceduralSky is only supported as an environment or background.");s.drawImage(e,0,0,t,t),A=s.getImageData(0,0,t,t).data,a=4,r=o=>o}return zc(t,a,n=>r(A[n]))}function Fp(i,e,t){let A=i.indexArray,a=i.uv?.array,r=t.displacementUvProjection;if(!e)return;if(!a&&r==="none")throw new Error("UV displacement requires texture coordinates; use triplanar, spherical, or cylindrical projection for a UV-less mesh.");let n=e.image,s=e.flipY;if(!n.width||!n.height)return;let o=A.length/3,l=Co(o);if(l)return l;let c=cn(e),f=$a.get(c);return f||(f=Op(i,n),$a.size>=4&&$a.delete($a.keys().next().value),$a.set(c,f)),kc(i,f,n.width,s,t)}var Wc=new WeakSet;function Yc(i){for(let{geometry:e,materials:t}of i)!e.tangent&&!Wc.has(e)&&t.some(A=>A.anisotropyMap||A.specularAnisotropyRotation!==0||A.coatAnisotropyRotation!==0||A.specularAnisotropyModel==="gltf"&&A.specularAnisotropy>0)&&(console.warn("MuTracer: anisotropy direction has no vertex tangent; deriving a frame from the selected UV set with a stable fallback for degenerate UVs."),Wc.add(e)),e.position?.array.length&&(e.normal||Ka(e),!e.tangent&&e.uv&&Cr(e))}function jc(i,e=!0){let t=e?AA(i):i.geometry;return t.normal||Ka(t),!t.tangent&&t.uv&&Cr(t),t}function Qo(i){let e=jc(i),t=ln(i),A=t?Xa(i):0,a=A!==0?Fp(e,t,on(i)):void 0,r=t?on(i).displacementBias:0;return{geometry:Nc(e,r),displacementScale:A,trianglesDisplacement:a}}function Za(i,e){return!!i.geometry.position?.array.length&&!i.geometry.dynamic&&(!ge(AA(i))||!!e&&!Qc(AA(i),e))}function Vc(i,e){let t=ln(i);return{geometry:i.geometry,version:i.geometry.version,cacheKey:fn(i),bvh:ge(e),displacementMap:t,displacementScale:Xa(i),displacementTextureKey:t?cn(t):void 0}}function Io(i,e,t){return i.geometry===t.geometry&&i.geometry.version===t.version&&fn(i)===t.cacheKey&&ge(e)===t.bvh&&ln(i)===t.displacementMap&&Xa(i)===t.displacementScale&&(!t.displacementMap||cn(t.displacementMap)===t.displacementTextureKey)}function Np(i,e=!0){let t=jc(i,e),A=e&&ln(i)?Xa(i):0;if(t.dynamic&&ge(t)?.builder!=="builtin"&&ct(t,void 0),!ge(t)){let a=e?Qo(i):{geometry:t,displacementScale:A,trianglesDisplacement:void 0};ct(t,Qi(a.geometry,a.displacementScale,a.trianglesDisplacement))}return{geometry:t,displacementScale:A}}function un(i,e={}){return Fc(i,t=>Np(t,e.displacement!==!1))}function dn(i,e,t){let A=new Set;if(Array.isArray(e))return A;let a=0,r=0;for(let{mesh:n}of i){let s=Tt(n),o=a+s;for(;r<e.length&&e.sourceIndices[r]<o;){if(t.has(n)){let l=e.sourceIndices[r]-a,c=n instanceof be?n.colors:void 0;for(let f=0;f<3;f++)e.colors[r*3+f]=c?.[l*3+f]??1;A.add(r)}r++}a=o}return A}async function qc(i,e){let t={geometryCount:0,bvhTimeMs:0,failedMeshes:[],workerUnavailable:!1,tinyBvhUnavailable:!1},A=new Map;for(let f of i){if(!f.geometry.position?.array.length||f.geometry.dynamic)continue;let m=AA(f);if(!(A.has(m)||!Za(f,e.config??e)&&!e.rebuild))try{A.set(m,{mesh:f,snapshot:Vc(f,m)})}catch{t.failedMeshes.push(f)}}let a=e.useWorker?e.workerPool??new eA(1):void 0;async function r(f,m,d){let{geometry:u,displacementScale:p,trianglesDisplacement:g}=f,v;if(d)v=await vc(u,p,g,m,m==="tinybvh"?e.layout:"bvh2",e.spatialSplits,a);else if(m==="tinybvh"){let{buildTinyBvh:h}=await import("./chunk-ME7N2EMK.js");v=await h(u,p,g,e.layout,e.spatialSplits)}else{let h=performance.now();v={...Qi(u,p,g),bvhTimeMs:performance.now()-h}}if(m==="tinybvh"&&(v.builder!=="tinybvh"||!v.buffer.byteLength))throw new Error("TinyBVH did not build every scene geometry.");return t.bvhTimeMs+=v.bvhTimeMs??0,v}async function n(f){let m=e.builder,d=e.useWorker&&!t.workerUnavailable;for(;;){if(e.isCancelled?.())throw new Di;try{return await r(f,m,d)}catch(u){if(u instanceof Di)throw u;if(u instanceof Ai&&d)t.workerUnavailable=!0,d=!1;else if(m==="tinybvh")t.tinyBvhUnavailable=!0,m="builtin",d=e.useWorker&&!t.workerUnavailable;else throw u}}}let s=0,o=[...A].sort(([f],[m])=>(m.indices?.array.length??0)-(f.indices?.array.length??0)),l=0;async function c(){for(;l<o.length&&!e.isCancelled?.();){let[f,{mesh:m,snapshot:d}]=o[l++];try{if(!Io(m,f,d))continue;let u=Qo(m),p=await n(u);!e.isCancelled?.()&&Io(m,f,d)&&(ct(f,p,e.config??e),t.geometryCount++)}catch(u){u instanceof Di||t.failedMeshes.push(m)}finally{if(!e.isCancelled?.())try{e.onProgress?.(++s/A.size)}catch{}}}}try{await Promise.allSettled(Array.from({length:Math.min(a?.size??1,A.size)},c))}finally{e.workerPool||a?.dispose()}return t}function qA(i,e){if(![i.x,i.y,i.size,e].every(Number.isFinite)||i.x<0||i.x>1||i.y<0||i.y>1||i.size<0||e<=0)throw new RangeError("Depth sampling requires a viewport center in 0..1, a non-negative size and a positive aspect.");return new Float32Array([i.x,1-i.y,i.size/e,i.size])}function pn(i){let e=new Float32Array(49);for(let t=0;t<e.length;t++)e[t]=i[t*4];return e}var er=`
fn linearToSrgb(color: vec3f) -> vec3f {
let linear = max(color, vec3f(0.0));
let low = linear * 12.92;
let high = 1.055 * pow(linear, vec3f(1.0 / 2.4)) - 0.055;
return select(high, low, linear <= vec3f(0.0031308));
}
`,Jc=`

fn ky(color: vec3f) -> vec3f {
return clamp(color, vec3f(0.0), vec3f(1.0));
}
fn jf(color: vec3f) -> vec3f {
return clamp(color / (vec3f(1.0) + color), vec3f(0.0), vec3f(1.0));
}
fn kj(jR: vec3f) -> vec3f {
let color = max(vec3f(0.0), jR - 0.004);
return pow((color * (6.2 * color + 0.5)) /
(color * (6.2 * color + 1.7) + 0.06), vec3f(2.2));
}
fn pH(value: vec3f) -> vec3f {
let lv = value * (value + 0.0245786) - 0.000090537;
let aq = value * (0.983729 * value + 0.4329510) + 0.238081;
return lv / aq;
}
fn mh(jR: vec3f) -> vec3f {
let qs = mat3x3f(
vec3f(0.59719, 0.07600, 0.02840),
vec3f(0.35458, 0.90834, 0.13383),
vec3f(0.04823, 0.01566, 0.83777)
);
let outputMatrix = mat3x3f(
vec3f(1.60475, -0.10208, -0.00327),
vec3f(-0.53108, 1.10813, -0.07276),
vec3f(-0.07367, -0.00605, 1.07602)
);
let color = qs * (jR / 0.6);
return clamp(outputMatrix * pH(color), vec3f(0.0), vec3f(1.0));
}
fn gh(value: vec3f) -> vec3f {
let nM = value * value;
let rR = nM * nM;
return 15.5 * rR * nM - 40.14 * rR * value
+ 31.96 * rR - 6.868 * nM * value
+ 0.4298 * nM + 0.1191 * value - 0.00232;
}
fn mM(jR: vec3f) -> vec3f {
let nP = mat3x3f(
vec3f(1.6605, -0.1246, -0.0182),
vec3f(-0.5876, 1.1329, -0.1006),
vec3f(-0.0728, -0.0083, 1.1187)
);
let nQ = mat3x3f(
vec3f(0.6274, 0.0691, 0.0164),
vec3f(0.3293, 0.9195, 0.0880),
vec3f(0.0433, 0.0113, 0.8956)
);
let qu = mat3x3f(
vec3f(0.856627153315983, 0.137318972929847, 0.11189821299995),
vec3f(0.0951212405381588, 0.761241990602591, 0.0767994186031903),
vec3f(0.0482516061458583, 0.101439036467562, 0.811302368396859)
);
let pt = mat3x3f(
vec3f(1.1271005818144368, -0.1413297634984383, -0.14132976349843826),
vec3f(-0.11060664309660323, 1.157823702216272, -0.11060664309660294),
vec3f(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405)
);
var color = qu * (nQ * jR);
color = clamp((log2(max(color, vec3f(1e-10))) + 12.47393) / 16.5, vec3f(0.0), vec3f(1.0));
color = pt * gh(color);
color = pow(max(color, vec3f(0.0)), vec3f(2.2));
return clamp(nP * color, vec3f(0.0), vec3f(1.0));
}
fn cp(color: vec3f) -> vec3f {
let toneMappingMode = i32(toneMappingParams.x);
if (toneMappingMode == 1) { return mh(color); }
if (toneMappingMode == 2) { return kj(color); }
if (toneMappingMode == 3) { return jf(color); }
if (toneMappingMode == 4) { return ky(color); }
return mM(color);
}
${er}
fn gq(jR: vec3f) -> vec3f {
let contrast = colorGradingParams.x;
let saturation = colorGradingParams.y;
let temperature = colorGradingParams.z;
let tint = colorGradingParams.w;
let uH = vec3f(
1.0 + temperature * 0.16 + tint * 0.04,
1.0 - tint * 0.12,
1.0 - temperature * 0.16 + tint * 0.04
);
var color = max(jR * uH, vec3f(0.0));
color = max((color - 0.18) * contrast + 0.18, vec3f(0.0));
let luminance = dot(color, vec3f(0.2126, 0.7152, 0.0722));
return max(mix(vec3f(luminance), color, saturation), vec3f(0.0));
}
`;function zp(i="srgb"){return`

var finalColor = load_colorTex(uv, 0);
var jI = vec4(0.0);
if (bloomIntensity > 0.0) {
jI = load_bloomTex(uv, 0) * bloomIntensity;
finalColor = vec4f(finalColor.rgb + jI.rgb, finalColor.a);
}

var gradedColor = gq(finalColor.rgb * exposure);
let ja = smoothstep(0.2, 0.72, distance(vec2f(uv) / vec2f(colorTexRegion()), vec2f(0.5)));
gradedColor *= 1.0 - toneMappingParams.y * ja;
let gQ = hdrOutputEnabled > 0.5;
if (!gQ) {
gradedColor = cp(gradedColor);
}
let mZ = select(
${i==="srgb"?"linearToSrgb(gradedColor)":"pow(max(gradedColor, vec3f(0.0)), vec3f(1.0 / 2.2))"},
linearToSrgb(gradedColor),
gQ
);
var oV = mZ;
if (flatBackgroundColor.a > 0.5) {
let jD = clamp(
load_flatBackgroundMaskTex(uv, 0).a,
0.0,
1.0
);
let pX = linearToSrgb(max(flatBackgroundColor.rgb, vec3f(0.0)));
oV = mix(pX, mZ, jD);
if (bloomIntensity > 0.0) {
var unbloomedColor = gq(
max(finalColor.rgb - jI.rgb, vec3f(0.0))
* exposure
);
unbloomedColor *= 1.0 - toneMappingParams.y * ja;
if (!gQ) {
unbloomedColor = cp(unbloomedColor);
}
let sG = select(
${i==="srgb"?"linearToSrgb(unbloomedColor)":"pow(max(unbloomedColor, vec3f(0.0)), vec3f(1.0 / 2.2))"},
linearToSrgb(unbloomedColor),
gQ
);
oV += max(mZ - sG, vec3f(0.0))
* (1.0 - jD);
}
}
finalColor = vec4f(oV, finalColor.a);
if (bloomIntensity > 0.0) {
finalColor.a = max(finalColor.a, min(dot(jI.rgb, vec3f(0.2125, 0.7154, 0.0721)), 1.0));
}

if (shadowCatcherEnabled > 0.5) {
let shadowCatcher = load_shadowCatcherTex(uv, 0);
let coverage = clamp(shadowCatcher.r, 0.0, 1.0);
let opacity = max(clamp(shadowCatcher.a / max(coverage, 0.000001), 0.0, 1.0) - (1.0 - shadowCatcherAlpha), 0.0);
if (coverage > 0.0 || flatBackgroundColor.a > 0.5) {
let foreground = load_foregroundTex(uv, 0);
let background = load_catcherBackgroundTex(uv, 0);




let ln = select(0.0, clamp(background.a - coverage, 0.0, 1.0 - coverage), flatBackgroundColor.a > 0.5);
var foregroundColor = gq((foreground.rgb + jI.rgb) * exposure);
var backgroundColor = gq((background.rgb / max(background.a, 0.000001) + jI.rgb) * exposure);
foregroundColor *= 1.0 - toneMappingParams.y * ja;
backgroundColor *= 1.0 - toneMappingParams.y * ja;
if (!gQ) {
foregroundColor = cp(foregroundColor);
backgroundColor = cp(backgroundColor);
}
foregroundColor = select(${i==="srgb"?"linearToSrgb(foregroundColor)":"pow(max(foregroundColor, vec3f(0.0)), vec3f(1.0 / 2.2))"}, linearToSrgb(foregroundColor), gQ);
backgroundColor = select(${i==="srgb"?"linearToSrgb(backgroundColor)":"pow(max(backgroundColor, vec3f(0.0)), vec3f(1.0 / 2.2))"}, linearToSrgb(backgroundColor), gQ);
if (flatBackgroundColor.a > 0.5) {
var unbloomedBackground = gq(background.rgb / max(background.a, 0.000001) * exposure);
unbloomedBackground *= 1.0 - toneMappingParams.y * ja;
if (!gQ) { unbloomedBackground = cp(unbloomedBackground); }
let nd = select(${i==="srgb"?"linearToSrgb(unbloomedBackground)":"pow(max(unbloomedBackground, vec3f(0.0)), vec3f(1.0 / 2.2))"}, linearToSrgb(unbloomedBackground), gQ);
let vL = select(vec3f(0.0), max(backgroundColor - nd, vec3f(0.0)), bloomIntensity > 0.0);
backgroundColor = linearToSrgb(max(flatBackgroundColor.rgb, vec3f(0.0))) + vL;
}


let gf = coverage * opacity;
let mR = clamp(dot(jI.rgb, vec3f(0.2125, 0.7154, 0.0721)), 0.0, 1.0);
let hJ = max(foreground.a, mR * (1.0 - coverage - ln));
let jz = max(background.a, mR * coverage);
let kX = (jz - ln) * (1.0 - opacity) + ln;
let alpha = hJ + kX + gf;
let premultiplied = foregroundColor * hJ
+ backgroundColor * kX
+ shadowCatcherColor * gf;
finalColor = vec4f(premultiplied / max(alpha, 0.000001), alpha);
}
}

output.color = finalColor;


`}var Kc=zp();function kp(i="output.denoiseColor",e="finalColor",t="srgb"){let A="select(pow((encoded + 0.055) / 1.055, vec3f(2.4)), encoded / 12.92, encoded <= vec3f(0.04045))";return`
let encoded = max(${e}.rgb, vec3f(0.0));
let um = ${t==="srgb"?A:`select(pow(encoded, vec3f(2.2)), ${A}, gQ)`};
${i} = vec4f(um, ${e}.a);

`}function Gp(i="output.denoiseAlbedo"){return`



let rawAlbedo = load_flatBackgroundMaskTex(uv, 0);
var pS = rawAlbedo.rgb;
if (shadowCatcherEnabled > 0.5 && flatBackgroundColor.a < 0.5) {
let coverage = clamp(load_shadowCatcherTex(uv, 0).r, 0.0, 1.0);
let background = load_catcherBackgroundTex(uv, 0);
if (coverage > 0.0 && background.a > 0.0) {
var iO = gq(background.rgb / background.a * exposure);
iO *= 1.0 - toneMappingParams.y * ja;
if (!gQ) { iO = cp(iO); }



let sA = clamp(background.a, 0.0, coverage);
pS += sA * (clamp(iO, vec3f(0.0), vec3f(1.0)) - vec3f(1.0));
}
}
${i} = vec4f(clamp(pS, vec3f(0.0), vec3f(1.0)), rawAlbedo.a);
`}var $c=kp()+Gp();function Hp(i="srgb"){return`
let denoised = load_colorTex(uv, 0);



let alpha = select(load_composedTex(uv, 0).a, clamp(denoised.a, 0.0, 1.0), denoisedAlpha > 0.5);
let linear = max(denoised.rgb, vec3f(0.0));
let encoded = ${i==="srgb"?"linearToSrgb(linear)":"select(pow(linear, vec3f(1.0 / 2.2)), linearToSrgb(linear), hdrOutputEnabled > 0.5)"};
output.color = vec4f(select(vec3f(0.0), encoded, alpha > 0.0), alpha);
`}var Xc=Hp(),mn=`
fn fK(color: f32, count: f32, hit: f32, ur: f32, rgb: bool) -> f32 {
if (count <= 0.0) {
return 0.0;
}
let total = max(count, ur);
let divisor = select(total, hit, (rgb && (hit > 0.0)));
return (color / divisor);
}
fn jQ(color: f32, coverage: f32, flat: bool, rgb: bool) -> f32 {
if ((flat && rgb) && (coverage > 0.0)) {
return (color * coverage);
}
return color;
}
`;var hn=`
fn sT(value: vec3f) -> vec3f {
let linear = clamp(value, vec3f(0.0), vec3f(1.0));
return select(1.055 * pow(linear, vec3f(1.0 / 2.4)) - 0.055,
12.92 * linear, linear <= vec3f(0.0031308));
}
fn sS(value: vec3f) -> vec3f {
let encoded = clamp(value, vec3f(0.0), vec3f(1.0));
return select(pow((encoded + 0.055) / 1.055, vec3f(2.4)),
encoded / 12.92, encoded <= vec3f(0.04045));
}
fn rL(value: vec3f) -> vec3f {
return clamp(value, vec3f(0.0), vec3f(1.0));
}
`;function Zc(i){return`
struct DisplayAovAccum { geometry: vec4f, position: vec4f, diffuse: vec4f, specular: vec4f, }
struct DisplayAovCenter { identity: vec4u, motion: vec4f, }
struct DisplayAovParams { sizeKind: vec4u, mapping: vec4f, flags: vec4u, }
@group(0) @binding(0) var<storage, read> accumulation: array<DisplayAovAccum>;
@group(0) @binding(1) var<storage, read> center: array<DisplayAovCenter>;
@group(0) @binding(2) var image: texture_storage_2d<${i}, write>;
@group(0) @binding(3) var<uniform> params: DisplayAovParams;

fn tF(input: u32) -> u32 {
var v = input;
v = (v ^ (v >> 16u)) * 0x7feb352du;
v = (v ^ (v >> 15u)) * 0x846ca68bu;
return v ^ (v >> 16u);
}
fn tG(rgb: vec3f) -> vec3f {
return select(1.055 * pow(max(rgb, vec3f(0.0)), vec3f(1.0 / 2.4)) - 0.055,
12.92 * rgb, rgb <= vec3f(0.0031308));
}
fn sE(rgb: vec3f) -> vec3f {
return select(pow((rgb + 0.055) / 1.055, vec3f(2.4)), rgb / 12.92,
rgb <= vec3f(0.04045));
}
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
let size = params.sizeKind.xy;
if (any(id.xy >= size)) { return; }
let index = id.x + (size.y - 1u - id.y) * size.x;
let kind = params.sizeKind.w;
let pixel = accumulation[index];
let hit = pixel.position.w;
var color = vec3f(0.0);
var alpha = hit / f32(max(params.sizeKind.z, 1u));
let inv = 1.0 / max(hit, 1.0);
if (kind == 0u) {
color = vec3f(clamp((pixel.geometry.x * inv - params.mapping.x) /
(params.mapping.y - params.mapping.x), 0.0, 1.0));
} else if (kind == 1u) {
color = clamp(pixel.position.xyz * inv / params.mapping.z * 0.5 + 0.5,
vec3f(0.0), vec3f(1.0));
} else if (kind == 2u) {
color = clamp(pixel.geometry.yzw * inv, vec3f(0.0), vec3f(1.0));
} else if (kind == 3u || kind == 4u) {
let r = select(pixel.diffuse, pixel.specular, kind == 4u);
alpha = r.w / f32(max(params.sizeKind.z, 1u));
color = tG(clamp(r.xyz / max(r.w, 1.0), vec3f(0.0), vec3f(1.0)));
} else if (kind == 5u) {
let identity = center[index].identity;
alpha = select(1.0, 0.0, identity.x == 0xffffffffu);
let hash = tF(identity[params.flags.x]);
color = 0.2 + 0.8 * vec3f(f32(hash & 255u), f32((hash >> 8u) & 255u),
f32((hash >> 16u) & 255u)) / 255.0;
} else {
let m = center[index].motion;
alpha = select(0.0, 1.0, m.w == 3.0);
let gR = length(m.xy);
var hue = 0.0;
if (gR > 0.0) { hue = fract(atan2(m.y, m.x) / 6.28318530718 + 1.0); }
let p = abs(fract(vec3f(hue) + vec3f(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
color = clamp(p - 1.0, vec3f(0.0), vec3f(1.0)) * clamp(gR / params.mapping.w, 0.0, 1.0);
}
if (alpha <= 0.0) { color = vec3f(0.0); }
if (params.flags.y != 0u) { color = sE(color); }
textureStore(image, vec2i(id.xy), vec4f(color, clamp(alpha, 0.0, 1.0)));
}
`}var So=`
struct AovResolvedAccumulation { geometry: vec4f, position: vec4f, diffuse: vec4f, specular: vec4f, }
struct AovResolvedCenter { identity: vec4u, motion: vec4f, }
@group(0) @binding(0) var<storage,read> accumulation: array<AovResolvedAccumulation>;
@group(0) @binding(1) var<storage,read> center: array<AovResolvedCenter>;
@group(0) @binding(3) var<uniform> parameters: vec4u;
fn ox(source: u32, kind: u32) -> vec4u {
if(kind==5u){return center[source].identity;}
var value=vec4f(0.0);
if(kind==6u){let motion=center[source].motion;value=vec4f(motion.xy,0.0,motion.w);}
else{
let pixel=accumulation[source];let hits=pixel.position.w;
let scale=select(0.0,1.0/max(hits,1.0),hits>0.0);let coverage=hits/f32(max(parameters.z,1u));
if(kind==0u){value=vec4f(pixel.geometry.x*scale,0.0,0.0,coverage);}
else if(kind==1u){value=vec4f(pixel.position.xyz*scale,coverage);}
else if(kind==2u){value=vec4f(pixel.geometry.yzw*scale,coverage);}
else{let reflectance=select(pixel.diffuse,pixel.specular,kind==4u);
let inv=select(0.0,1.0/max(reflectance.w,1.0),reflectance.w>0.0);
value=vec4f(reflectance.xyz*inv,reflectance.w/f32(max(parameters.z,1u)));
}
}
return bitcast<vec4u>(value);
}
`,nE=So+`
@group(0) @binding(2) var<storage,read_write> output: array<vec4u>;
@compute @workgroup_size(8,8)
fn main(@builtin(global_invocation_id) id: vec3u) {
let width=parameters.x;let height=parameters.y;
if(id.x>=width||id.y>=height){return;}
let index=id.x+id.y*width;
let source=id.x+select(id.y,height-1u-id.y,(parameters.w&256u)!=0u)*width;
output[index]=ox(source,parameters.w&255u);
}
`;var gn=6,Po=i=>i===0?2:i+3;function ef(i){if(!i.length||i.length>gn)throw new RangeError("Invalid AOV snapshot batch size");return So+i.map((e,t)=>`@group(0) @binding(${Po(t)}) var<storage,read_write> output${t}: array<vec4u>;`).join(`
`)+`
@compute @workgroup_size(8,8)
fn main(@builtin(global_invocation_id) id: vec3u) {
let width=parameters.x;let height=parameters.y;
if(id.x>=width||id.y>=height){return;}
let index=id.x+id.y*width;
let source=id.x+(height-1u-id.y)*width;
${i.map((e,t)=>`output${t}[index]=ox(source,${Xt.indexOf(e)}u);`).join(`
  `)}
}
`}var vn=class{device;history=new CA;width=0;height=0;samples=0;centerReady=!1;accumulation;center;previousCenter;scene;frame;displayPipeline;displayTexture;resolvePipelines=new Map;scenePrimitives;scenePrimitiveOffset=0;snapshotGeneration=0;snapshotPool=new Map;snapshotLeases=new WeakMap;snapshotBuffers=new Set;constructor(e){this.device=e}reset(){if(this.centerReady&&this.center&&this.previousCenter){let e=this.device.createCommandEncoder();e.copyBufferToBuffer(this.center,0,this.previousCenter,0,this.center.size),this.device.queue.submit([e.finish()])}this.samples=0,this.centerReady=!1,this.frame=void 0}resize(e,t){if(e===this.width&&t===this.height)return;if(e*t*MA.accumulatedBytes>this.device.limits.maxStorageBufferBindingSize||e*t*MA.accumulatedBytes>this.device.limits.maxBufferSize)throw new RangeError("AOV accumulation exceeds device buffer limits");this.dispose(),this.history.clear(),this.reset(),this.width=e,this.height=t;let A=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC;this.accumulation=this.device.createBuffer({label:"AOV accumulation",size:e*t*MA.accumulatedBytes,usage:A}),this.previousCenter=this.device.createBuffer({label:"Previous AOV center",size:e*t*MA.centerBytes,usage:A}),this.center=this.device.createBuffer({label:"AOV center",size:e*t*MA.centerBytes,usage:A})}setScene(e,t){let A=e.byteLength+(t?.byteLength??0);if(A>this.device.limits.maxStorageBufferBindingSize)throw new RangeError("AOV scene metadata exceeds device storage binding limit");let a=!1;(!this.scene||this.scene.size<A)&&(this.scene?.destroy(),this.scene=this.device.createBuffer({label:"AOV identities/history",size:Math.max(16,A),usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),a=!0),this.device.queue.writeBuffer(this.scene,0,e),t&&(a||this.scenePrimitives!==t||this.scenePrimitiveOffset!==e.byteLength)&&this.device.queue.writeBuffer(this.scene,e.byteLength,t),this.scenePrimitives=t,this.scenePrimitiveOffset=e.byteLength}get bytes(){return(this.accumulation?.size??0)+(this.center?.size??0)+(this.previousCenter?.size??0)+(this.scene?.size??0)+(this.displayTexture?this.width*this.height*8:0)+[...this.snapshotBuffers].reduce((e,t)=>e+t.size,0)}snapshot(e){if(!this.accumulation||!this.center||!this.samples)throw new Error("AOV output is not ready");let t=this.device;je(e);let A=Xt.filter(s=>e.includes(s)),a=[];for(let s=0;s<A.length;s+=gn){let o=A.slice(s,s+gn),l=o.join(","),c=this.resolvePipelines.get(l);c||(c=t.createComputePipeline({label:"AOV snapshot",layout:"auto",compute:{module:t.createShaderModule({code:ef(o)}),entryPoint:"main"}}),this.resolvePipelines.set(l,c)),a.push({kinds:o,pipeline:c})}let r={};if(!a.length)return r;let n=t.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM,mappedAtCreation:!0});new Uint32Array(n.getMappedRange()).set([this.width,this.height,this.samples,0]),n.unmap();try{let s=t.createCommandEncoder({label:"AOV snapshot"}),o=s.beginComputePass();for(let{kinds:l,pipeline:c}of a){let f=[{binding:0,resource:{buffer:this.accumulation}},{binding:1,resource:{buffer:this.center}},{binding:3,resource:{buffer:n}}];l.forEach((m,d)=>{let u=this.snapshotPool.get(m)??t.createBuffer({label:`Custom ${m} input`,size:this.width*this.height*16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST});this.snapshotPool.delete(m),this.snapshotLeases.set(u,{kind:m,generation:this.snapshotGeneration}),this.snapshotBuffers.add(u),r[m]=u,f.push({binding:Po(d),resource:{buffer:u}})}),o.setPipeline(c),o.setBindGroup(0,t.createBindGroup({layout:c.getBindGroupLayout(0),entries:f})),o.dispatchWorkgroups(Math.ceil(this.width/8),Math.ceil(this.height/8))}return o.end(),t.queue.submit([s.finish()]),r}catch(s){throw Object.values(r).forEach(o=>{o&&(this.snapshotLeases.delete(o),this.snapshotBuffers.delete(o),o.destroy())}),s}finally{n.destroy()}}releaseSnapshot(e){for(let t of Object.values(e)){if(!t)continue;let A=this.snapshotLeases.get(t);A&&(this.snapshotLeases.delete(t),A.generation===this.snapshotGeneration&&!this.snapshotPool.has(A.kind)?this.snapshotPool.set(A.kind,t):(this.snapshotBuffers.delete(t),t.destroy()))}}visualize(e,t,A){if(!this.accumulation||!this.center||!this.samples)throw new Error("AOV output is not ready");let a=this.device;this.displayPipeline??=a.createComputePipeline({label:"AOV visualization",layout:"auto",compute:{module:a.createShaderModule({code:Zc("rgba16float")}),entryPoint:"main"}}),(!this.displayTexture||this.displayTexture.width!==this.width||this.displayTexture.height!==this.height)&&(this.displayTexture?.destroy(),this.displayTexture=a.createTexture({label:"AOV display image",size:[this.width,this.height],format:"rgba16float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC}));let r=bc(this.width,this.height,this.samples,e,t,A),n=a.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM,mappedAtCreation:!0});new Uint32Array(n.getMappedRange()).set(r),n.unmap();let s=a.createBindGroup({layout:this.displayPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.accumulation}},{binding:1,resource:{buffer:this.center}},{binding:2,resource:this.displayTexture.createView()},{binding:3,resource:{buffer:n}}]}),o=a.createCommandEncoder(),l=o.beginComputePass();return l.setPipeline(this.displayPipeline),l.setBindGroup(0,s),l.dispatchWorkgroups(Math.ceil(this.width/8),Math.ceil(this.height/8)),l.end(),a.queue.submit([o.finish()]),n.destroy(),this.displayTexture}async read(e){let t=e==="id"||e==="motion",A=t?this.center:this.accumulation,a=this.device.createBuffer({size:A.size,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST});try{let r=this.device.createCommandEncoder();r.copyBufferToBuffer(A,0,a,0,A.size),this.device.queue.submit([r.finish()]),await a.mapAsync(GPUMapMode.READ);let n=new Float32Array(a.getMappedRange()),s=new Uint32Array(n.buffer),o=e==="id"?new Uint32Array(this.width*this.height*4):new Float32Array(this.width*this.height*4);for(let l=0;l<this.height;l++)for(let c=0;c<this.width;c++){let f=(l*this.width+c)*4,m=(this.height-1-l)*this.width+c,d=m*(t?8:16);if(e==="id")o.set(s.subarray(d,d+4),f);else if(e==="motion")o.set([n[d+4],n[d+5],0,n[d+7]],f);else{let u=n[d+7],p=u/Math.max(1,this.samples),g=u>0?1/u:0;if(e==="depth")o.set([n[d]*g,0,0,p],f);else if(e==="position")o.set([n[d+4]*g,n[d+5]*g,n[d+6]*g,p],f);else if(e==="roughness")o.set([n[d+1]*g,n[d+2]*g,n[d+3]*g,p],f);else{let v=e==="diffuseAlbedo"?d+8:d+12,h=n[v+3],B=h>0?1/h:0;o.set([n[v]*B,n[v+1]*B,n[v+2]*B,h/Math.max(1,this.samples)],f)}}}return{width:this.width,height:this.height,data:o}}finally{a.mapState==="mapped"&&a.unmap(),a.destroy()}}dispose(){let e=this.displayTexture;this.displayTexture=void 0,this.scenePrimitives=void 0,this.scenePrimitiveOffset=0,this.snapshotGeneration++;let t=[...this.snapshotPool.values()];this.snapshotPool.clear(),t.forEach(a=>this.snapshotBuffers.delete(a));let A=[this.accumulation,this.center,this.scene,this.previousCenter,...t];this.accumulation=this.center=this.scene=this.previousCenter=void 0,this.device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>{e?.destroy(),A.forEach(a=>a?.destroy())})}};function ni(i){if(typeof requestAnimationFrame=="function"){let t=requestAnimationFrame(i);return()=>cancelAnimationFrame(t)}let e=setTimeout(()=>i(performance.now()),16);return()=>clearTimeout(e)}function si(i){if(!i)return 0;let e=i.format==="rgba32float"?16:i.format==="rgba16float"?8:(i.format==="r32float",4);return i.width*i.height*i.depthOrArrayLayers*e}var Bn=class{device;textures=[];image;constructor(e){this.device=e}get output(){return this.image}reset(){this.image=void 0}getMemoryBytes(){return this.textures.reduce((e,t)=>e+si(t),0)}retire(e){e.length&&this.device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>e.forEach(t=>t.destroy()))}dispose(){this.reset(),this.retire(this.textures),this.textures=[]}run(e,t,A){if(this.reset(),!t.length)return;(this.textures.length===0||this.textures[0].width!==e.width||this.textures[0].height!==e.height||this.textures[0].format!==e.format)&&(this.retire(this.textures),this.textures=Array.from({length:2},(n,s)=>this.device.createTexture({label:`Display post-process ${s}`,size:{width:e.width,height:e.height},format:e.format,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST})));let a=this.device.createCommandEncoder(),r=e;for(let n=0;n<t.length;n++){let s=this.textures[n%2];t[n]({device:this.device,encoder:a,input:r,output:s,width:e.width,height:e.height,render:A}),r=s}this.device.queue.submit([a.finish()]),this.image=r}};var tf=`
let original = load_originalTex(uv, 0).rgb;
let filtered = load_filteredTex(uv, 0).rgb;
let foreground = load_foregroundTex(uv, 0);
let background = load_backgroundTex(uv, 0);

var ni = foreground;
var nh = background;
if (any(filtered != original)) {
let wa = abs(original) > vec3f(0.000001);
let aq = select(vec3f(1.0), original, wa);
let scale = select(vec3f(1.0), filtered / aq, wa);
let vD = select(filtered - original, vec3f(0.0), wa);
ni = vec4f(foreground.rgb * scale + vD, foreground.a);

nh = vec4f(background.rgb * scale + vD * background.a, background.a);
}
output.foreground = ni;
output.background = nh;
`,Af=`
if (globalId.x >= u32(imageSize.x) || globalId.y >= u32(imageSize.y)) { return; }
let index = globalId.x + globalId.y * u32(imageSize.x);
out_color[index] = vec4f(in_filtered[index].rgb, in_original[index].a);
`;var En=class{device;standardFormat;context;hdr=!1;compatibleHDR;constructor(e,t,A){this.device=t,this.standardFormat=A,this.context=e.getContext("webgpu"),this.context.configure({device:t,format:A,alphaMode:"premultiplied"})}get format(){return this.hdr?"rgba16float":this.standardFormat}get supportsHDR(){if(this.compatibleHDR!==void 0)return this.compatibleHDR;this.compatibleHDR=!1;let e=null;try{if(e=ht().getContext("webgpu"),!e)return!1;e.configure({device:this.device,format:"rgba16float",alphaMode:"premultiplied",colorSpace:"srgb",toneMapping:{mode:"extended"}});let t=e.getConfiguration?.();this.compatibleHDR=t?.format==="rgba16float"&&t.toneMapping?.mode==="extended"}catch{this.compatibleHDR=!1}finally{e?.unconfigure?.()}return this.compatibleHDR}configure(e){let t=e&&this.supportsHDR;t!==this.hdr&&(this.hdr=t,this.context.configure(t?{device:this.device,format:"rgba16float",alphaMode:"premultiplied",colorSpace:"srgb",toneMapping:{mode:"extended"}}:{device:this.device,format:this.standardFormat,alphaMode:"premultiplied"}))}dispose(){this.context.unconfigure?.()}};var JA=class{device;buffer;constructor(e){this.device=e}get(e,t=!1){if(!this.buffer||(t?this.buffer.size!==e:this.buffer.size<e)){let A=this.buffer;this.buffer=this.device.createBuffer({label:"Shared inference input",size:e,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC}),A&&this.device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>A.destroy())}return this.buffer}getMemoryBytes(){return this.buffer?.size??0}dispose(){this.buffer?.destroy()}};var af=new WeakMap;function KA(i,e,t){af.set(i,{width:e,height:t})}function wn(i){return af.get(i)??{width:i.width,height:i.height}}var _n=class{device;texture;constructor(e){this.device=e}get(e,t){if(!this.texture||e>this.texture.width||t>this.texture.height){e=Math.max(e,this.texture?.width??0),t=Math.max(t,this.texture?.height??0);let A=this.texture;this.texture=this.device.createTexture({label:"Shared denoised conversion",size:{width:e,height:t},format:"rgba32float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.COPY_SRC}),A&&this.device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>A.destroy())}return this.texture}setRegion(e,t){this.texture&&KA(this.texture,e,t)}getMemoryBytes(){return si(this.texture)}dispose(){this.texture?.destroy()}};var $A=class{release;constructor(e=t=>t()){this.release=e}resources=new Map;get(e,t){let A=this.resources.get(e);return A||(A=t(),A.reserveCapacity?.(),this.resources.set(e,A)),A}getMemoryBytes(){return Array.from(this.resources.values()).reduce((e,t)=>e+(t.getMemoryBytes?.()??0),0)}dispose(){let e=Array.from(this.resources.values());this.resources.clear(),this.release(()=>{for(let t of e)t.dispose()})}};var xn=class{queue;pendingMs=0;pending=new Set;constructor(e){this.queue=e}available(e){return Math.max(0,e-this.pendingMs)}whenAvailable(){return this.pending.values().next().value??Promise.resolve()}track(e){this.pendingMs+=e;let t=()=>{this.pendingMs=Math.max(0,this.pendingMs-e),this.pending.delete(A),this.pending.size||(this.pendingMs=0)},A=this.queue.onSubmittedWorkDone().then(t,t);this.pending.add(A)}};function bn(i,e,t=!1,A){let a=new Set,r=new Map,n,s;return{getSharedMemoryBytes:()=>A?.getMemoryBytes()??0,createTarget(o){let l=e(),c={...l,get presentationComplete(){return l.presentationComplete},get presentationDenoised(){return l.presentationDenoised},label:o,configure(f){r.set(c,{...f}),l.configure(f)},activate(){n=c,t&&i.setBounce(Math.max(1,...Array.from(r.values(),f=>f.bounces))),l.activate()}};return c.synchronizeBackground(s),a.add(c),c},releaseTarget(o){a.delete(o)&&(r.delete(o),o.dispose())},setMeshes:(o,l)=>i.setMeshes(o,l),setLights:o=>i.setLights(o),setBackground(o){s=o,i.setBackground(o);for(let l of a)l.synchronizeBackground(o)},setTextureAtlasBudget:o=>i.setTextureAtlasBudget(o),async readDepthSamples(o,l){return i.setCamera(o),i.readDepthSamples(l,o.aspect)},getDiagnostics(){return{...i.getDiagnostics(),...n?.getDiagnostics(),targets:Array.from(a,o=>({label:o.label,...o.getMemory()}))}},dispose(){for(let o of a)o.dispose();a.clear(),r.clear(),i.dispose(),A?.dispose()}}}function rf(i,e,t=!1){return i.map((A,a)=>`
fn ${A}Region() -> vec2u {
return ${t?`imageRegions[${a}].xy`:`textureDimensions(${A})`};
}
fn load_${A}(pixel: vec2i, level: i32) -> vec4f {
${t?`if (any(pixel < vec2i(0)) || any(pixel >= vec2i(${A}Region()))) { return vec4f(0.0); }`:""}
return textureLoad(${A}, pixel, level);
}
${e.map(r=>`
fn sample_${A}_${r}(coord: vec2f) -> vec4f {
${t?`
let kH = textureDimensions(${A});
if (all(kH == ${A}Region())) { return textureSampleLevel(${A}, ${r}, coord, 0.0); }
let pixel = clamp(coord * vec2f(${A}Region()), vec2f(0.5), vec2f(${A}Region()) - vec2f(0.5));
return textureSampleLevel(${A}, ${r}, pixel / vec2f(kH), 0.0);`:`return textureSample(${A}, ${r}, coord);`}
}`).join("")}`).join("")}function nf(i,e=!1){return i.map(t=>`
ivec2 ${t}Region() {
return ${e?`${t}RegionSize`:`textureSize(${t}, 0)`};
}
vec4 load_${t}(ivec2 pixel, int level) {
${e?`if (any(lessThan(pixel, ivec2(0))) || any(greaterThanEqual(pixel, ${t}Region()))) return vec4(0.0);`:""}
return texelFetch(${t}, pixel, level);
}
vec4 sample_${t}(vec2 coord) {
${e?`
ivec2 kH = textureSize(${t}, 0);
if (all(equal(kH, ${t}Region()))) return texture(${t}, coord);
vec2 pixel = clamp(coord * vec2(${t}Region()), vec2(0.5), vec2(${t}Region()) - vec2(0.5));
return texture(${t}, pixel / vec2(kH));`:`return texture(${t}, coord);`}
}`).join("")}function Ri(i,e=0,t=8){return Math.max(e,t,2**Math.ceil(Math.log2(Math.max(1,i))))}var tr=class{device;modules=new Map;moduleIds=new Map;bindGroupLayouts=new Map;layouts=new Map;pipelines=new Map;renderPipelines=new Map;computePipelines=new Map;ids=new WeakMap;nextId=0;constructor(e){this.device=e}id(e){let t=this.ids.get(e);return t===void 0&&(t=++this.nextId,this.ids.set(e,t)),t}remember(e,t,A,a){return e.delete(t),e.set(t,A),e.size>a&&e.delete(e.keys().next().value),A}createShaderModule(e){let t=e.code,A=this.remember(this.modules,t,this.modules.get(t)??this.device.createShaderModule(e),8),a=this.remember(this.moduleIds,t,this.moduleIds.get(t)??this.id(A),128);return this.ids.set(A,a),A}createBindGroupLayout(e){let t=Array.from(e.entries),A=JSON.stringify(t);return this.remember(this.bindGroupLayouts,A,this.bindGroupLayouts.get(A)??this.device.createBindGroupLayout({...e,entries:t}),32)}createPipelineLayout(e){let t=Array.from(e.bindGroupLayouts),{bindGroupLayouts:A,label:a,...r}=e,n=JSON.stringify([r,t.map(s=>s==null?null:this.id(s))]);return this.remember(this.layouts,n,this.layouts.get(n)??this.device.createPipelineLayout({...e,bindGroupLayouts:t}),16)}createComputePipelineAsync(e){let{compute:t,layout:A}=e,a=JSON.stringify([this.id(t.module),A==="auto"?"auto":this.id(A),t.entryPoint,Object.entries(t.constants??{}).sort(([n],[s])=>n.localeCompare(s))]),r=this.pipelines.get(a);if(!r){r=this.device.createComputePipelineAsync(e);let n=r;n.catch(()=>{this.pipelines.get(a)===n&&this.pipelines.delete(a)})}return this.remember(this.pipelines,a,r,128)}createRenderPipeline(e){let{label:t,vertex:A,fragment:a,...r}=e,n=JSON.stringify([r,{...A,module:this.id(A.module)},a&&{...a,module:this.id(a.module)}]);return this.remember(this.renderPipelines,n,this.renderPipelines.get(n)??this.device.createRenderPipeline(e),128)}createComputePipeline(e){let{label:t,compute:A,...a}=e,r=JSON.stringify([a,{...A,module:this.id(A.module)}]);return this.remember(this.computePipelines,r,this.computePipelines.get(r)??this.device.createComputePipeline(e),128)}clear(){this.modules.clear(),this.moduleIds.clear(),this.bindGroupLayouts.clear(),this.layouts.clear(),this.pipelines.clear(),this.renderPipelines.clear(),this.computePipelines.clear()}},sf=new WeakMap;function ft(i){let e=sf.get(i);return e||sf.set(i,e=new tr(i)),e}var yn=`
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
`;function Wp(i,e){return i.format===e.format}function ir(i,e){return i instanceof Float32Array||i instanceof Int32Array||i instanceof Uint32Array?i:(typeof i=="number"&&(i=[i]),e==="i32"||e.endsWith("i")?new Int32Array(i):e==="u32"||e.endsWith("u")?new Uint32Array(i):new Float32Array(i))}var xt=class{_label;_device;_outputTextures={};_outputParams={};_pipeline;_bindGroups=[];_needsUpdatePipeline=!0;_needsUpdateOutputTextures=!0;_renderToScreen;_inputs=[];_inputViewDimensions={};_outputs=[];_uniforms=[];_uniformsMap={};_uniformBuffers={};_samplers={};_capacityWidth=0;_capacityHeight=0;_reserveCapacity=!1;_regionNames=[];_width=10;_height=10;_fsCode="";_fsMain;_fsDefine;_textureWillBeRead;constructor(e,t,A){this._label=e,this._device=t,this._fsMain=A.fsMain,this._fsDefine=A.fsDefine,this._inputs=A.inputs,this._inputViewDimensions=A.inputViewDimensions||{},this._outputs=A.outputs,this._uniforms=(A.uniforms||[]).concat({label:"viewportSize",type:"vec2f",data:[0,0]}),this._samplers=A.samplers||{},this._uniformsMap=this._uniforms.reduce((a,r)=>(a[r.label]=r,a),{}),this._textureWillBeRead=A.textureWillBeRead||!1,this._uniforms.forEach(a=>{let r=ir(a.data,a.type);this._uniformBuffers[a.label]=t.createBuffer({label:this._label,size:r.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this._device.queue.writeBuffer(this._uniformBuffers[a.label],0,r)})}reserveCapacity(){if(this._reserveCapacity)return;this._reserveCapacity=!0,this._capacityWidth=this._width,this._capacityHeight=this._height;let e=this._inputs.filter(t=>!this._inputViewDimensions[t]||this._inputViewDimensions[t]==="2d");if(this._regionNames=e,e.length){let t={label:"imageRegions",type:`array<vec4u, ${e.length}>`,data:new Uint32Array(e.length*4)};this._uniforms.push(t),this._uniformsMap[t.label]=t,this._uniformBuffers[t.label]=this._device.createBuffer({label:`${this._label}.${t.label}`,size:e.length*16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})}this._needsUpdatePipeline=!0,this._fsCode=""}setSize(e,t){e=Math.max(1,Math.ceil(e)),t=Math.max(1,Math.ceil(t));let A=e!==this._width||t!==this._height;if(this._width=e,this._height=t,A){let a=Math.max(this._capacityWidth,e),r=Math.max(this._capacityHeight,t);this._needsUpdateOutputTextures||=!this._reserveCapacity||a!==this._capacityWidth||r!==this._capacityHeight,this._capacityWidth=a,this._capacityHeight=r,this._needsUpdatePipeline=!0,this.setUniform("viewportSize",[e,t])}}setOutputParams(e){let t=!!this._renderToScreen;this._renderToScreen=void 0;let A=Object.keys(e).some(a=>!Wp(e[a],this._outputParams[a]||{}));this._needsUpdateOutputTextures||=A,this._needsUpdatePipeline||=A||t,(A||t)&&(this._fsCode=""),this._outputParams=e}setRenderToScreen(e,t){(!this._renderToScreen||this._renderToScreen.presentationFormat!==t)&&(this._needsUpdatePipeline=!0,this._fsCode=""),this._renderToScreen={screenTexture:e,presentationFormat:t}}setUniform(e,t){let A=this._uniformBuffers[e];this._device.queue.writeBuffer(A,0,ir(t,this._uniformsMap[e].type))}_retainedOutputs=new Set;retainOutput(e){Object.values(this._outputTextures).includes(e)&&this._retainedOutputs.add(e)}releaseOutput(e){this._retainedOutputs.delete(e)&&(Object.values(this._outputTextures).includes(e)||this._device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>e.destroy()))}getOutput(e){return this._outputTextures[e]}getMemoryBytes(){return Object.values(this._uniformBuffers).reduce((e,t)=>e+t.size,0)+Array.from(new Set([...Object.values(this._outputTextures),...this._retainedOutputs])).reduce((e,t)=>e+si(t),0)}dispose(){Object.keys(this._uniformBuffers).forEach(e=>{this._uniformBuffers[e].destroy()}),new Set([...Object.values(this._outputTextures),...this._retainedOutputs]).forEach(e=>e.destroy()),this._retainedOutputs.clear()}_createTexture(e){return this._device.createTexture({label:this._label,size:{width:this._reserveCapacity?this._capacityWidth:this._width,height:this._reserveCapacity?this._capacityHeight:this._height,depthOrArrayLayers:1},format:e.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|(this._textureWillBeRead?GPUTextureUsage.COPY_SRC:0)})}_updateOutputTextures(e){let t=this._outputParams;for(let A in t){if(e?.includes(A))continue;let a=t[A];this._retainedOutputs.has(this._outputTextures[A])||this._outputTextures[A]?.destroy(),this._outputTextures[A]=this._createTexture(a)}}_updatePipeline(){if(!this._needsUpdatePipeline)return;this._needsUpdatePipeline=!1;let e=this._outputParams,t=this._device,A=this._getFullFs();if(A===this._fsCode)return;let{screenTexture:a,presentationFormat:r}=this._renderToScreen||{};this._fsCode=A,this._pipeline=ft(t).createRenderPipeline({label:this._label,layout:"auto",vertex:{module:ft(t).createShaderModule({label:this._label,code:yn}),entryPoint:"main"},fragment:{module:ft(t).createShaderModule({label:this._label,code:A}),entryPoint:"main",targets:a?[{format:r}]:this._outputs.map(n=>({format:e[n].format}))},primitive:{topology:"triangle-list"}}),this._updateBindGroups()}_getFullFs(){let e=this._inputs,t=e.length,A=t>0;return`
${e.sort().map((r,n)=>{let o=this._inputViewDimensions[r]==="3d"?"texture_3d":"texture_2d";return`@group(0) @binding(${n}) var ${r}: ${o}<f32>;`}).join(`
`)}

${A?Object.keys(this._samplers).sort().map((r,n)=>`@group(0) @binding(${n+t}) var ${r}: sampler;`).join(`
`):""}
${this._uniforms.map((r,n)=>`@group(${A?1:0}) @binding(${n}) var<uniform> ${r.label}: ${r.type};`).join(`
`)}
struct qa {
${this._outputs.map((r,n)=>`@location(${n}) ${r}: vec4f,`).join(`
`)}
}
${rf(this._reserveCapacity?this._regionNames:e.filter(r=>!this._inputViewDimensions[r]||this._inputViewDimensions[r]==="2d"),Object.keys(this._samplers),this._reserveCapacity)}
${this._fsDefine??""}
@fragment
fn main(
@builtin(position) coord: vec4f
) -> qa {
let uv = vec2i(floor(coord.xy));
let uv2 = coord.xy / viewportSize;
var output: qa;
${this._fsMain}
return output;
}
`}_updateBindGroups(){let e=[],t=this._device,A=this._inputs.length>0?1:0;this._uniforms.length>0&&(e[A]=t.createBindGroup({label:this._label,layout:this._pipeline.getBindGroupLayout(A),entries:this._uniforms.map((a,r)=>({binding:r,resource:{buffer:this._uniformBuffers[a.label]}}))})),this._bindGroups=e}createPass(e,t,A){if(this._needsUpdateOutputTextures&&!this._renderToScreen&&(this._updateOutputTextures(Object.keys(A||{})),this._needsUpdateOutputTextures=!1),this._regionNames.length){let s=new Uint32Array(this._regionNames.length*4);for(let[o,l]of this._regionNames.entries()){let c=wn(t[l]);s.set([c.width,c.height],o*4)}this.setUniform("imageRegions",s)}for(let s of Object.values(this._outputTextures))KA(s,this._width,this._height);this._updatePipeline();let a=this._inputs.length;a>0&&(this._bindGroups[0]=this._device.createBindGroup({label:this._label,layout:this._pipeline.getBindGroupLayout(0),entries:[...this._inputs.map((s,o)=>({binding:o,resource:t[s].createView(this._inputViewDimensions[s]?{dimension:this._inputViewDimensions[s]}:void 0)})),...Object.keys(this._samplers).map((s,o)=>({binding:o+a,resource:this._samplers[s]}))]}));let r={...this._outputTextures,...A},n=e.beginRenderPass({colorAttachments:this._renderToScreen?[{view:this._renderToScreen.screenTexture.createView(),clearValue:{r:0,g:0,b:0,a:0},storeOp:"store",loadOp:"clear"}]:this._outputs.map(s=>({view:r[s].createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:"clear",storeOp:"store"}))});n.setViewport(0,0,this._width,this._height,0,1),n.setScissorRect(0,0,this._width,this._height),n.setPipeline(this._pipeline),this._bindGroups.forEach((s,o)=>{n.setBindGroup(o,s)}),n.draw(6,1,0,0),n.end()}};var XA=class{blases=new WeakMap;parts=[];tlasRecords=-1;combined;get(e,t){let A=e.blases.map((r,n)=>{let s=e.geometries[n],o=s.indexArray,l=r.bvh.buffer,c=r.bvh.triangleIds,f=this.blases.get(l);if(f&&f.geometry===s&&f.indices===o&&f.topology===s.topologyVersion&&f.triangleIds===c)return f.ids;let m=new Uint32Array(l),d=new Uint32Array(m.length/4).fill(4294967295),u=new Map;for(let p=0;p<o.length/3;p++)u.set(`${o[p*3]},${o[p*3+1]},${o[p*3+2]}`,p);for(let p=0;p<d.length;p++){let g=u.get(`${m[p*4]},${m[p*4+1]},${m[p*4+2]}`);g!==void 0&&(d[p]=g)}if(c)for(let p=0;p<c.length;p+=2)d[c[p]]=c[p+1];return this.blases.set(l,{geometry:s,indices:o,topology:s.topologyVersion,triangleIds:c,ids:d}),d}),a=t.buffer.byteLength/16;if(!this.combined||this.tlasRecords!==a||A.length!==this.parts.length||A.some((r,n)=>r!==this.parts[n])){let r=new Uint32Array(a+A.reduce((s,o)=>s+o.length,0)).fill(4294967295),n=a;for(let s of A)r.set(s,n),n+=s.length;this.combined=r,this.parts=A,this.tlasRecords=a}return this.combined}};var of=new WeakMap,jp=1;function Vp(i){let e=of.get(i);return e===void 0&&(e=jp++,of.set(i,e)),e}function qp(i){let e=new Uint32Array(i.buffer),t=new Int32Array(i.buffer),A=new Uint32Array((i.instancesBuffer?.byteLength??0)/160);if(!i.buffer.byteLength){for(let r=0;r<A.length;r++)A[r]=r;return A}function a(r){let n=r*4,s=t[n+3];if(s>=0)a(r+2),a(s);else for(let o=0;o<-s;o++)A[e[n+8+o*4]]=e[n+10+o*4]}return A.length&&a(0),A}function Cn(i,e,t,A,a,r,n,s=!0){let o=qp(e),l=i.instances,c={width:A,height:a,projection:JSON.stringify(Array.from(t.getProjectionMatrix(A/a))),viewProjection:new Float32Array(16),instances:[]},f=oe.create();oe.invert(f,t.transform),oe.mul(c.viewProjection,t.getProjectionMatrix(A/a),f);let m=new Float32Array([t.transform[12],t.transform[13],t.transform[14],1]),d=Math.hypot(t.transform[8],t.transform[9],t.transform[10]),u=new Float32Array([-t.transform[8]/d,-t.transform[9]/d,-t.transform[10]/d,0]);c.cameraEye=m,c.cameraForward=u;let p=[];for(let R=0;R<o.length;R++){let D=o[R],se=i.instanceBindings[l instanceof _A?l.bindingIndices[D]:D].mesh,q=se.geometry;p.push({object:fi(se.aovId),instance:l instanceof _A?l.localIndices[D]:0,topology:Vp(q)+q.topologyVersion*4294967296,vertices:q.version,transform:new Float32Array(bs(l,D).transform)})}c.instances=p;let g=52+o.length*24,v=g+i.materials.length,h=n?.length??e.buffer.byteLength/16+i.blases.reduce((R,D)=>R+D.bvh.buffer.byteLength/16,0),B=new Uint32Array(v+(s?h:0)),E=new Float32Array(B.buffer),x=r.previous(c);x&&E.set(x.viewProjection),B[16]=g,B[17]=v;let y=new Float32Array(Array.from(t.getProjectionMatrix(A/a))),M=2166136261;for(let R of new Uint32Array(y.buffer))M=Math.imul(M^R,16777619)>>>0;B[18]=M,E.set(c.viewProjection,20),E.set(m,36),E.set(u,40),x?.cameraEye&&x.cameraForward&&(E.set(x.cameraEye,44),E.set(x.cameraForward,48));let b=new Set;for(let R of i.instanceBindings){let D=fi(R.mesh.aovId);if(b.has(D))throw new Error("AOV object IDs must be unique");b.add(D)}p.forEach((R,D)=>{let L=52+D*24;B[L]=R.object,B[L+1]=R.instance;let se=r.match(c,R),q=oe.create();if(se&&oe.invert(q,R.transform)){let re=oe.create();oe.mul(re,se.transform,q),E.set(Array.from(re),L+4),B[L+2]=1}});let T=new Set;if(i.materials.forEach((R,D)=>{let L=fi(R.aovId);if(T.has(L))throw new Error("AOV material IDs must be unique");T.add(L),B[g+D]=L}),!s)return{words:B,frame:c};if(B.fill(4294967295,v),n)return B.set(n,v),{words:B,frame:c};let O=e.buffer.byteLength/16;return i.blases.forEach((R,D)=>{let L=new Uint32Array(R.bvh.buffer),se=i.geometries[D].indexArray,q=new Map;for(let w=0;w<se.length/3;w++)q.set(`${se[w*3]},${se[w*3+1]},${se[w*3+2]}`,w);for(let w=0;w<L.length/4;w++){let N=q.get(`${L[w*4]},${L[w*4+1]},${L[w*4+2]}`);N!==void 0&&(B[v+O+w]=N)}let re=R.bvh.triangleIds;if(re)for(let w=0;w<re.length;w+=2)B[v+O+re[w]]=re[w+1];O+=L.length/4}),{words:B,frame:c}}function lf(i){let e=i.ambient[0]*.2126+i.ambient[1]*.7152+i.ambient[2]*.0722;return 4*Math.PI*(i.intensity+Math.max(0,e))}var Mn=[.2,.18,.15],Qn=Math.PI,Ar=.488;var cf=`
struct Params { sun: vec4f, sunWorld: vec4f, size: vec4f, scale: vec4f, ambient: vec4f }
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var transmittanceTable: texture_2d<f32>;
@group(0) @binding(2) var multipleTable: texture_2d<f32>;
@group(0) @binding(3) var skyTable: texture_2d<f32>;
@group(0) @binding(4) var irradianceTable: texture_2d<f32>;
@group(0) @binding(5) var output: texture_storage_2d<rgba32float, write>;
const PI = 3.14159265358979;
const R_GROUND = 6360.0;
const R_TOP = 6460.0;
const CAMERA_ALTITUDE = 0.2;
const RAYLEIGH = vec3f(5.802e-3, 13.558e-3, 33.1e-3);
const MIE_SCATTERING = 3.996e-3;
const MIE_EXTINCTION = 4.44e-3;
const MIE_G = 0.8;
const OZONE = vec3f(0.65e-3, 1.881e-3, 0.085e-3);
const ALBEDO = vec3f(${Mn.join(", ")});
const T_SIZE = vec2u(256, 64);
const MS_ALTITUDES = 32u;
const SV_SIZE = vec2u(96, 192);

fn br(r: f32, mu: f32, radius: f32) -> f32 { return (radius - r) * (radius + r) + r * r * mu * mu; }
fn np(r: f32, mu: f32) -> bool { return mu < 0.0 && br(r, mu, R_GROUND) >= 0.0; }
fn ll(r: f32, mu: f32) -> f32 { return max(-r * mu - sqrt(max(br(r, mu, R_GROUND), 0.0)), 0.0); }
fn jm(r: f32, mu: f32) -> f32 { return max(-r * mu + sqrt(max(br(r, mu, R_TOP), 0.0)), 0.0); }
fn oz(r: f32) -> vec3f {
let h = max(r - R_GROUND, 0.0);
return vec3f(exp(-h / 8.0), exp(-h / 1.2) * ${5}, max(0.0, 1.0 - abs(h - 25.0) / 15.0));
}
fn extinction(d: vec3f) -> vec3f { return RAYLEIGH * d.x + MIE_EXTINCTION * d.y + OZONE * d.z; }
fn mP(x: f32) -> f32 { return x * x * (R_TOP - R_GROUND); }
fn hR(h: f32) -> f32 { return sqrt(clamp(h / (R_TOP - R_GROUND), 0.0, 1.0)); }
fn fh(table: texture_2d<f32>, p: vec2f) -> vec3f {
let size = vec2i(textureDimensions(table));
let q = clamp(p, vec2f(0.0), vec2f(size - 1));
let i = min(vec2i(floor(q)), max(size - 2, vec2i(0)));
let f = clamp(q - vec2f(i), vec2f(0.0), vec2f(1.0));
let j = min(i + 1, size - 1);
let a = textureLoad(table, i, 0).rgb;
let b = textureLoad(table, vec2i(j.x, i.y), 0).rgb;
let c = textureLoad(table, vec2i(i.x, j.y), 0).rgb;
let d = textureLoad(table, j, 0).rgb;
return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
fn fO(r: f32, mu: f32) -> vec3f {
return fh(transmittanceTable, vec2f((clamp(mu, -1.0, 1.0) + 1.0) * 0.5 * f32(T_SIZE.x - 1u), hR(r - R_GROUND) * f32(T_SIZE.y - 1u)));
}
fn mW(nu: f32) -> f32 {
let g2 = MIE_G * MIE_G;
return 3.0 / (8.0 * PI) * ((1.0 - g2) * (1.0 + nu * nu)) / ((2.0 + g2) * pow(1.0 + g2 - 2.0 * MIE_G * nu, 1.5));
}
struct xJ { radiance: vec3f, throughput: vec3f }
fn vt(origin: vec3f, dir: vec3f, steps: u32, full: bool, uw: vec3f) -> xJ {
let r = length(origin);
let mu = dot(origin, dir) / r;
let ground = np(r, mu);
var len = jm(r, mu);
if (ground) { len = ll(r, mu); }
let nu = dot(dir, params.sun.xyz);
var jv = 1.0 / (4.0 * PI);
var sn = jv;
if (full) { jv = 3.0 / (16.0 * PI) * (1.0 + nu * nu); sn = mW(nu); }
var result = xJ(vec3f(0.0), vec3f(0.0));
var view = vec3f(1.0);
var previous = 0.0;
for (var i = 0u; i < steps; i++) {
let s = f32(i + 1u) / f32(steps);
let next = len * s * s;
let dt = next - previous;
let p = origin + dir * (0.5 * (previous + next));
previous = next;
let pr = length(p);
let d = oz(pr);
let e = extinction(d);
let vb = fO(pr, dot(p, params.sun.xyz) / pr);
let nG = RAYLEIGH * d.x;
let nF = MIE_SCATTERING * d.y;
var ms = vec3f(0.0);
if (full) { ms = fh(multipleTable, vec2f(hR(pr - R_GROUND) * f32(MS_ALTITUDES - 1u), 0.0)); }
let source = vb * (nG * jv + nF * sn) + (nG + nF) * ms;
let st = exp(-e * dt);
let weight = (1.0 - st) / max(e, vec3f(1e-9));
result.radiance += view * source * weight;
result.throughput += view * (nG + nF) * weight;
view *= st;
}
if (ground) {
let p = origin + dir * len;
let pr = length(p);
let tC = dot(p, params.sun.xyz) / pr;
let irradiance = fO(pr, tC) * max(tC, 0.0) + uw;
result.radiance += view * ALBEDO / PI * irradiance;
}
return result;
}
fn qk(row: f32) -> f32 {
let x = row / f32(SV_SIZE.y - 1u) * 2.0 - 1.0;
return sign(x) * x * x * (PI / 2.0);
}
fn ik(e: f32) -> f32 {
let x = sign(e) * sqrt(abs(e) / (PI / 2.0));
return clamp((x + 1.0) * 0.5, 0.0, 1.0) * f32(SV_SIZE.y - 1u);
}
@compute @workgroup_size(8, 8)
fn transmittance(@builtin(global_invocation_id) id: vec3u) {
if (any(id.xy >= T_SIZE)) { return; }
let mu = f32(id.x) / f32(T_SIZE.x - 1u) * 2.0 - 1.0;
let r = R_GROUND + mP(f32(id.y) / f32(T_SIZE.y - 1u));
if (np(r, mu)) { textureStore(output, vec2i(id.xy), vec4f(0.0, 0.0, 0.0, 1.0)); return; }
let len = jm(r, mu);
var depth = vec3f(0.0);
for (var i = 0u; i < 48u; i++) {
let t = (f32(i) + 0.5) / 48.0 * len;
depth += extinction(oz(sqrt(t * t + 2.0 * r * mu * t + r * r))) * (len / 48.0);
}
textureStore(output, vec2i(id.xy), vec4f(exp(-depth), 1.0));
}
@compute @workgroup_size(8, 8)
fn multiple(@builtin(global_invocation_id) id: vec3u) {
if (id.x >= MS_ALTITUDES || id.y > 0u) { return; }
let r = R_GROUND + mP(f32(id.x) / f32(MS_ALTITUDES - 1u));
var second = vec3f(0.0);
var qK = vec3f(0.0);
for (var i = 0u; i < 64u; i++) {
let mu = 1.0 - 2.0 * (f32(i) + 0.5) / 64.0;
let phi = f32(i) * PI * (3.0 - sqrt(5.0));
let s = sqrt(1.0 - mu * mu);
let result = vt(vec3f(0.0, r, 0.0), vec3f(s * cos(phi), mu, s * sin(phi)), 20u, false, vec3f(0.0));
second += result.radiance / 64.0;
qK += result.throughput / 64.0;
}
textureStore(output, vec2i(id.xy), vec4f(second / (1.0 - qK), 1.0));
}
@compute @workgroup_size(8, 8)
fn skyView(@builtin(global_invocation_id) id: vec3u) {
if (any(id.xy >= SV_SIZE)) { return; }
let e = qk(f32(id.y));
let phi = f32(id.x) / f32(SV_SIZE.x - 1u) * PI;
var sky = vec3f(0.0);
if (params.size.w > 0.0) { sky = textureLoad(irradianceTable, vec2i(0), 0).rgb; }
let result = vt(vec3f(0.0, R_GROUND + CAMERA_ALTITUDE, 0.0), vec3f(cos(e) * cos(phi), sin(e), cos(e) * sin(phi)), 40u, true, sky);
textureStore(output, vec2i(id.xy), vec4f(result.radiance, 1.0));
}
@compute @workgroup_size(8, 8)
fn irradiance(@builtin(global_invocation_id) id: vec3u) {
if (id.x >= 2u || id.y > 0u) { return; }
var sky = vec3f(0.0);
for (var i = 0u; i < 128u; i++) {
let e = (f32(i) + 0.5) / 128.0 * (PI / 2.0);
let weight = 2.0 * sin(e) * cos(e) * (PI / 2.0 / 128.0) * (PI / 48.0);
for (var j = 0u; j < 48u; j++) {
let phi = (f32(j) + 0.5) / 48.0 * PI;
sky += fh(skyTable, vec2f(phi / PI * f32(SV_SIZE.x - 1u), ik(e))) * weight;
}
}
if (id.x == 0u) { textureStore(output, vec2i(id.xy), vec4f(sky, 1.0)); return; }
let vb = fO(R_GROUND + CAMERA_ALTITUDE, params.sun.y);
let xc = vec3f(0.2126, 0.7152, 0.0722);
let horizontal = dot(sky, xc) + dot(vb, xc) * max(params.sun.y, 0.0);
let scale = ${Qn} / sqrt(max(horizontal, ${Ar} * 1e-3) * ${Ar});
textureStore(output, vec2i(id.xy), vec4f(vb, scale));
}
fn hn(dk: vec2f) -> vec3f {
let theta = dk.y / params.size.y * PI;
let phi = dk.x / params.size.x * 2.0 * PI;
return vec3f(-sin(theta) * cos(phi), cos(theta), -sin(theta) * sin(phi));
}
@compute @workgroup_size(8, 8)
fn map(@builtin(global_invocation_id) id: vec3u) {
if (any(id.xy >= vec2u(params.size.xy))) { return; }
let dk = vec2f(id.xy) + 0.5;
let dir = hn(dk);
let th = abs(atan2(dir.z, dir.x) - params.sun.w);
let wr = th - floor(th / (2.0 * PI)) * (2.0 * PI);
let ek = min(wr, 2.0 * PI - wr);
let e = asin(clamp(dir.y, -1.0, 1.0));
var radiance = fh(skyTable, vec2f(ek / PI * f32(SV_SIZE.x - 1u), ik(e)));
let sun = textureLoad(irradianceTable, vec2i(1, 0), 0);
let radius = params.sunWorld.w;
let rP = PI / params.size.y;
if (acos(clamp(dot(dir, params.sunWorld.xyz), -1.0, 1.0)) < radius + 3.0 * rP / max(sqrt(1.0 - dir.y * dir.y), 0.05)) {
var coverage = 0.0;
for (var y = 0u; y < 6u; y++) { for (var x = 0u; x < 6u; x++) {
let d = hn(dk - 0.5 + (vec2f(f32(x), f32(y)) + 0.5) / 6.0);
let angle = 2.0 * asin(min(length(d - params.sunWorld.xyz) * 0.5, 1.0));
let t = angle / radius;
if (t < 1.0) { coverage += 1.0 - 0.6 * (1.0 - sqrt(1.0 - t * t)); }
} }
let rO = 2.0 * PI * (1.0 - cos(radius));
radiance += coverage / 36.0 / (rO * (1.0 - 0.6 / 3.0)) * sun.rgb;
}
textureStore(output, vec2i(id.xy), vec4f(radiance * sun.a * params.scale.xyz + params.ambient.xyz, 1.0));
}
`;var ar=class{device;tables;uniforms;pipelines;inputs={transmittance:[],multiple:[1,2],skyView:[1,2,4],irradiance:[1,3],map:[3,4]};time;constructor(e){this.device=e;let t=(a,r,n)=>e.createTexture({label:a,size:[r,n],format:"rgba32float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.STORAGE_BINDING});this.tables={transmittance:t("Sky transmittance",256,64),multiple:t("Sky multiple scattering",32,1),skyView:t("Sky view",96,192),irradiance:t("Sky irradiance",2,1)},this.uniforms=[0,1].map(()=>e.createBuffer({label:"Sky parameters",size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}));let A=e.createShaderModule({label:"Procedural sky",code:cf});this.pipelines={};for(let a of Object.keys(this.inputs)){let r=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},...this.inputs[a].map(n=>({binding:n,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"unfilterable-float"}})),{binding:5,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba32float"}}]});this.pipelines[a]=e.createComputePipeline({label:`Sky ${a}`,layout:e.createPipelineLayout({bindGroupLayouts:[r]}),compute:{module:A,entryPoint:a}})}}bake(e,t){let{width:A,height:a,sky:r,intensity:n,ambient:s}=e;if(A>this.device.limits.maxTextureDimension2D||a>this.device.limits.maxTextureDimension2D)throw new RangeError("ProceduralSky resolution exceeds the device texture size limit.");let{elevation:o,azimuth:l}=Qr(r.time),c=o*Math.PI/180,f=l*Math.PI/180,m=new Float32Array([Math.cos(c),Math.sin(c),0,f,Math.cos(c)*Math.cos(f),Math.sin(c),Math.cos(c)*Math.sin(f),.4*Math.PI/180,A,a,0,0,n,n,n,1,...s,0]);this.device.queue.writeBuffer(this.uniforms[0],0,m),m[11]=1,this.device.queue.writeBuffer(this.uniforms[1],0,m);let d=this.device.createCommandEncoder({label:"Procedural sky"}),u=(p,g,v=!1)=>{let h=this.pipelines[p],B={1:this.tables.transmittance,2:p==="multiple"?this.tables.transmittance:this.tables.multiple,3:this.tables.skyView,4:this.tables.irradiance},E=this.device.createBindGroup({layout:h.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniforms[v?1:0]}},...this.inputs[p].map(y=>({binding:y,resource:B[y].createView()})),{binding:5,resource:g.createView()}]}),x=d.beginComputePass({label:`Sky ${p}`});x.setPipeline(h),x.setBindGroup(0,E),x.dispatchWorkgroups(Math.ceil(g.width/8),Math.ceil(g.height/8)),x.end()};this.time===void 0&&u("transmittance",this.tables.transmittance),this.time!==r.time&&(u("multiple",this.tables.multiple),u("skyView",this.tables.skyView),u("irradiance",this.tables.irradiance),u("skyView",this.tables.skyView,!0)),u("map",t,!0),this.device.queue.submit([d.finish()]),this.time=r.time}dispose(){Object.values(this.tables).forEach(e=>e.destroy()),this.uniforms.forEach(e=>e.destroy())}};var pf=200,uf=64,df=6;function mf(){let i=new ArrayBuffer(320),e={outputSize:new Float32Array(i,0,2),sampleCount:new Float32Array(i,8,1),scaleOffset:new Float32Array(i,16,4),lightsCount:new Int32Array(i,32,1),transmissiveOutputAlphaMin:new Float32Array(i,36,1),jitter:new Float32Array(i,40,2),backgroundColor:new Float32Array(i,48,4),groundedBackgroundParams:new Float32Array(i,64,4),groundedBackgroundCenter:new Float32Array(i,80,2),blasOffset:new Int32Array(i,88,1),isEmpty:new Int32Array(i,92,1),bevel:new Int32Array(i,96,1),dispersionWavelengths:new Int32Array(i,100,1),envLightPmf:new Float32Array(i,104,1),lightChoiceCount:new Int32Array(i,108,1),lightWeightTotal:new Float32Array(i,112,1),lightSamplingTextureWidth:new Int32Array(i,116,1),lightChoiceTexelOffset:new Int32Array(i,120,1),bounces:new Int32Array(i,124,1),varianceMoments:new Int32Array(i,128,1),adaptiveSampling:new Int32Array(i,132,1),clamping:new Float32Array(i,136,1),directLightCandidates:new Int32Array(i,140,1),backgroundFlags:new Int32Array(i,144,1),loopUnrollGuard:new Uint32Array(i,148,1),sceneFeatureFlags:new Uint32Array(i,152,1),sequenceSeed:new Uint32Array(i,156,1),zSobolLogSPP:new Uint32Array(i,160,1),sampleSequenceOffset:new Uint32Array(i,164,1),shadowCatcherChoiceOffset:new Int32Array(i,168,1),shadowCatcherChoiceCount:new Int32Array(i,172,1),environmentRotation:new Float32Array(i,176,16),backgroundMapTransform:new Float32Array(i,240,4),backgroundMapRotation:new Float32Array(i,256,16)};return e.loopUnrollGuard[0]=4,e.environmentRotation.set([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),e.backgroundMapRotation.set([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),e.backgroundMapTransform.set([1,0,1,0]),e.bevel[0]=1,e.dispersionWavelengths[0]=3,{buffer:i,views:e}}function hf(i,e,t,A){Ya(i);let a=i.length;a>uf&&console.warn(`Too many lights, only the first ${uf} lights will be used.`);let r=new Float32Array(a*df*4);function n(o,l){for(let c=0;c<3;c++)r[c+o*4]=Q(l,c)}let s={DirectionalLight:1,SphereLight:2,RectLight:3,SpotLight:4};for(let o=0;o<a;o++){let l=i[o],c=Se(l.transform),f=l.color,m=l.intensity,d=o*df;n(d,[c[12],c[13],c[14]]),r[d*4+3]=s[l.type];let u=l.type==="SpotLight"?Wa(l):m;n(d+1,[f[0]*u,f[1]*u,f[2]*u]),l.type==="RectLight"?(r[(d+1)*4+3]=ka(l),n(d+2,Na(l,0)),r[(d+2)*4+3]=l.spread,n(d+3,Na(l,1))):l.type==="SphereLight"?(r[(d+1)*4+3]=Ga(l),r[(d+2)*4+3]=l.radius):l.type==="SpotLight"?(r[(d+1)*4+3]=Ha(l),n(d+2,Fa(l)),r[(d+2)*4+3]=l.radius,n(d+3,[Math.cos(l.outerAngle*Math.PI/180),Math.cos(Math.min(l.innerAngle,l.outerAngle)*Math.PI/180),0])):l.type==="DirectionalLight"&&n(d+2,Fa(l)),r[(d+3)*4+3]=l.type==="SpotLight"?A(o)??-1:e[o]??-1,r[(d+4)*4]=t[o]??0,n(d+5,za(l).x)}return r}function aA(i){return Math.min(20,Math.max(1,Number.isNaN(i)?1:Math.round(i)))}function rA(i){return Number.isFinite(i)?Math.min(16,Math.max(1,Math.round(i))):4}function nA(i){return Number.isFinite(i)?Math.min(32,Math.max(1,Math.round(i))):8}function In(i){let e={sobol:0,zsobol:1,random:2}[i];if(e===void 0)throw new Error(`Unknown sampling pattern: ${i}`);return e}function Sn(i){return Number.isFinite(i)?Math.min(16,Math.max(0,Math.ceil(Math.log2(Math.max(1,i))))):16}var Jp=[[0,1,2,3],[0,1,3,2],[0,2,1,3],[0,2,3,1],[0,3,2,1],[0,3,1,2],[1,0,2,3],[1,0,3,2],[1,2,0,3],[1,2,3,0],[1,3,2,0],[1,3,0,2],[2,1,0,3],[2,1,3,0],[2,0,1,3],[2,0,3,1],[2,3,0,1],[2,3,1,0],[3,1,2,0],[3,1,0,2],[3,2,1,0],[3,2,0,1],[3,0,2,1],[3,0,1,2]].map(i=>i.reduce((e,t,A)=>e|t<<2*A,0)),Pn=Array.from({length:6},(i,e)=>Jp.slice(e*4,e*4+4).reduce((t,A,a)=>t|A<<a*8,0)>>>0),Dn=[[1,2863311530],[2,3435973836],[4,4042322160],[8,4278255360],[16,4294901760]];function gf(){return{USE_BACKGROUND:!1,USE_BACKGROUND_MAP:!1,USE_GROUNDED_BACKGROUND:!1,SAMPLING_PATTERN:0,BEVEL_SAMPLES:8}}function vf(i){let e=["position","normal","uv","uv1","color","tangent","materialIndex"],t=[],A={USE_UV:i.uv!=null,USE_VERTEX_COLOR:i.color!=null},a=0;for(let r of e)t.push(a),A[r.toUpperCase()+"_OFF"]=a/4,i[r]&&(a+=4);return A.ATTR_STRIDE=a/4,{stride:a,offsets:t,constants:A}}function Bf(i,e,t={}){return{TLAS_STACK_SIZE:Ri(i,Number(t.TLAS_STACK_SIZE??0)),BLAS_STACK_SIZE:Ri(e,Number(t.BLAS_STACK_SIZE??0),32)}}function Ef(i,e){i.bounces[0]=aA(e.bounces),i.bevel[0]=Number(e.bevel),i.dispersionWavelengths[0]=e.dispersionWavelengths,i.directLightCandidates[0]=rA(e.directLightCandidates)}function wf(i,e,t){let A=In(i);return{code:A,logSPP:Sn(A===1?e-1:e),seed:t>>>0}}function _f(i,e){i.sequenceSeed[0]=e.seed,i.zSobolLogSPP[0]=e.logSPP}function xf(i,e,t,A,a=new yi,r,n){a.reserve(1+i.length+e.length),a.push(1,0,t);for(let M=0;M<i.length;M++)a.push(2,M,rn(i[M]));for(let M=0;M<e.length;M++)a.push(3,M,e[M].area*e[M].samplingLuminance);let s=Bo(a),o=Lc(a,n),l=o?a.count:0,c=o?o.pmfs.length:a.count,f={environment:{count:0,weight:0,pmf:0},infinite:{count:0,weight:0,pmf:0},localAndEmissive:{count:0,weight:0,pmf:0}},m=[f.environment,f.infinite,f.localAndEmissive],d=new Array(i.length).fill(0),u=0;for(let M=0;M<a.count;M++){let b=a.sourceTypes[M],T=a.sourceIndices[M],O=s.pmfs[M],R=b===1?0:b===2&&i[T]?.type==="DirectionalLight"?1:2,D=m[R];D.count++,D.weight+=a.weights[M],D.pmf+=O,b===1?u=O:b===2?d[T]=O:e[T].selectionPmf=O}let p=Math.max(a.count+(o?c:0),1),g=e.length*6,v=g+p,h=nn(i,v),B=Math.max(v+h.texelCount,1),E=Math.min(A,Math.max(16,Math.ceil(Math.sqrt(B)/16)*16)),x=Math.ceil(B/E);if(x>A)throw new Error("Too many emissive triangles for the light sampling texture.");let y=r?.length===E*x*4?r:new Float32Array(E*x*4);return y.fill(0),e.length&&Oc(e,y),new Uint32Array(y.buffer).set(s.choices,g*4),o&&c&&new Uint32Array(y.buffer).set(o.choices,(g+a.count)*4),y.set(h.data,v*4),{lightData:y,lightWidth:E,lightHeight:x,analyticPmfs:d,profiles:h,environmentPmf:u,choiceCount:a.count,totalWeight:s.totalWeight,emissiveTexels:g,domains:f,shadowCatcherChoiceOffset:l,shadowCatcherChoiceCount:c}}function bf(i,e){i.envLightPmf[0]=e.environmentPmf,i.lightChoiceCount[0]=e.choiceCount,i.shadowCatcherChoiceOffset[0]=e.shadowCatcherChoiceOffset,i.shadowCatcherChoiceCount[0]=e.shadowCatcherChoiceCount,i.lightWeightTotal[0]=e.totalWeight,i.lightSamplingTextureWidth[0]=e.lightWidth,i.lightChoiceTexelOffset[0]=e.emissiveTexels}function yf(i,e,t,A){return hf(i,e,t,A)}var Zp=4;var it={AS_CHANGED_BLASES:53,BVH:1,INSTANCES:2,ATTRIBUTES:3,MATERIALS:4,MAP_INFO:5,CAMERA:6,TRACE_UNIFORM:7,LIGHT_UNIFORM:8,COLOR:10,NORMAL:11,ALBEDO:12,SHADOW_CATCHER:13,ATLAS:20,ENVIRONMENT:21,ENVIRONMENT_CDF:22,BACKGROUND:23,LIGHT_SAMPLING:24,ENERGY_LUT:25,DISPLACEMENT:26,SOFTWARE_SHADER:30,METADATA:31,HWRT_SHADER:33,HIT_SHADER:34,INDICES:35,SOFTWARE_PATH_SHADER:36,HWRT_PATH_SHADER:37,DISPLACEMENT_BOUNDS:38,SOFTWARE_HIT_SHADER:39,PRIMITIVE_IDS:40,AS_POSITIONS:41,AS_INDICES:42,PATH_EVENTS:50,PATH_PARAMETERS:51,QUERY_COUNTS:52,SOFTWARE_FRAME_SHADER:54,HWRT_FRAME_SHADER:55};var em={MATERIAL:40},rr={RGBA8_UNORM:0,RGBA16_FLOAT:1,RGBA32_FLOAT:2,R32_FLOAT:3,RG32_FLOAT:4},uw=[{id:rr.RGBA8_UNORM,name:"rgba8unorm",bytes:4},{id:rr.RGBA16_FLOAT,name:"rgba16float",bytes:8},{id:rr.RGBA32_FLOAT,name:"rgba32float",bytes:16},{id:rr.R32_FLOAT,name:"r32float",bytes:4},{id:rr.RG32_FLOAT,name:"rg32float",bytes:8}];var Rt=(i,e,t,A)=>({name:i,resource:e,kind:"buffer",layout:{binding:t,visibility:4,buffer:{type:A}}}),sA=(i,e,t,A=!1,a=!1)=>({name:i,resource:e,kind:"texture",layout:{binding:t,visibility:4,texture:{viewDimension:A?"2d-array":"2d",sampleType:a?"float":"unfilterable-float"}}}),tm=[{name:"SCENE",label:"Buffers",bindings:[Rt("BVH",it.BVH,0,"read-only-storage"),Rt("INSTANCES",it.INSTANCES,1,"read-only-storage"),Rt("ATTRIBUTES",it.ATTRIBUTES,2,"read-only-storage"),Rt("MATERIALS",it.MATERIALS,3,"read-only-storage")]},{name:"TEXTURES",label:"Textures",bindings:[{name:"SAMPLER",resource:em.MATERIAL,kind:"sampler",layout:{binding:0,visibility:4,sampler:{}}},sA("ATLAS",it.ATLAS,1,!0,!0),Rt("MAP_INFO",it.MAP_INFO,3,"uniform"),sA("ENVIRONMENT",it.ENVIRONMENT,4),sA("ENVIRONMENT_CDF",it.ENVIRONMENT_CDF,5),sA("BACKGROUND",it.BACKGROUND,6),sA("LIGHT_SAMPLING",it.LIGHT_SAMPLING,8),sA("ENERGY_LUT",it.ENERGY_LUT,9),sA("DISPLACEMENT",it.DISPLACEMENT,10)]},{name:"FRAME",label:"Uniforms",bindings:[Rt("CAMERA",it.CAMERA,0,"uniform"),Rt("TRACE_UNIFORM",it.TRACE_UNIFORM,1,"uniform"),Rt("LIGHT_UNIFORM",it.LIGHT_UNIFORM,2,"uniform")]},{name:"OUTPUT",label:"Ray Trace Out Buffers",bindings:[Rt("COLOR",it.COLOR,0,"storage"),Rt("NORMAL",it.NORMAL,1,"storage"),Rt("ALBEDO",it.ALBEDO,2,"storage"),Rt("SHADOW_CATCHER",it.SHADOW_CATCHER,3,"storage")]}];function Un(){return tm.map(i=>({label:i.label,entries:i.bindings.map(e=>e.layout)}))}var dw={CAMERA_BYTES:144,LIGHT_BYTES:384*4*Zp};var nr=class{bufferData;textures;defines;lightIndices=[];displacementMaps;constructor(e,t){let A=Lr(e,ya);this.textures=A.textures.slice(),this.displacementMaps=A.indices.displacementMap.map(a=>A.textures[a]).filter(Boolean);for(let a of t){let r=a.type==="RectLight"?a.texture:void 0;this.lightIndices.push(r?this.textures.length:-1),r&&this.textures.push(r)}this.bufferData=Fr(e),this.defines={NUM_MAPS:this.textures.length};for(let a of Xi)this.bufferData[a.index]=A.indices[a.property],a.define&&(this.defines[a.define]=A.indices[a.property].filter(r=>r>=0).length);this.bufferData.mapUvChannel=this.textures.map(a=>a.uvChannel),this.bufferData.mapColorLinear=this.textures.map(Ro),this.bufferData.mapTransform=this.textures.flatMap(a=>[...a.uvScale,...a.uvOffset]),this.bufferData.mapWrap=this.textures.flatMap(a=>[pi(a.wrapS),pi(a.wrapT)])}repackParams(e){HA(this.bufferData,e)}getBufferArray(){return WA(this.bufferData)}getLightTexturesIndices(){return this.lightIndices}getDisplacementMaps(){return this.displacementMaps}};function To(i){let e=i.image;return pt(e)&&!(e.data instanceof Uint8Array)&&!(e.data instanceof Uint8ClampedArray)}function Ro(i){return Number(i.colorSpace?i.colorSpace==="linear":To(i))}function Am(i,e,t){let A=i.some(To),a=A?8:4,r=[...new Map(i.map((c,f)=>[c,f])).values()];for(let{image:c}of i)if(!Number.isSafeInteger(c.width)||!Number.isSafeInteger(c.height)||c.width<1||c.height<1)throw new Error("Material textures require positive integer dimensions.");let n=c=>i.map(f=>({width:Math.max(1,Math.floor(f.image.width*c)),height:Math.max(1,Math.floor(f.image.height*c))})),s=c=>r.reduce((f,m)=>f+c[m].width*c[m].height*a,0);if(r.length*a>e)throw new Error("Material textures cannot fit the budget even at 1\xD71.");let o=i.reduce((c,f)=>Math.min(c,t/Math.max(f.image.width,f.image.height)),1);if(s(n(o))>e){let c=0,f=o;for(let m=0;m<40;m++){let d=(c+f)/2;s(n(d))<=e?c=d:f=d}o=c}let l=n(o);return{sizes:l,scale:o,floatStorage:A,bytesPerPixel:a,estimatedBytes:s(l)}}function am(i,e,t){let A=t?new Uint16Array(e.width*e.height*4):new Uint8Array(e.width*e.height*4);if(pt(i.image))zr(A,e.width,{index:0,layer:0,x:0,y:0,...e},{image:i.image,flipY:i.flipY},t);else{let a=ht(e.width,e.height),r=a.getContext("2d");if(!r)throw new Error("Unable to prepare material texture pixels.");if(i.flipY&&(r.translate(0,e.height),r.scale(1,-1)),mi(i.image))throw new Error("ProceduralSky is only supported as an environment or background.");r.drawImage(i.image,0,0,e.width,e.height);let n=r.getImageData(0,0,e.width,e.height).data;for(let s=0;s<n.length;s++)A[s]=t?YA(n[s]/255):n[s]}return A}function rm(i,e,t){let A=new ArrayBuffer(t*48),a=new Float32Array(A),r=new Uint32Array(A);return i.forEach((n,s)=>{let o=s*12;a.set([...n.uvScale,...n.uvOffset],o),r.set([10+s,1+pi(n.wrapS)*3+pi(n.wrapT),n.uvChannel,Ro(n),e[s].width,e[s].height],o+4)}),A}var Ln=class{device;table;metadata;retirement;entries=new Map;logical=[];samplers;fallback;disposed=!1;generation=0;metadataCapacity=0;retiredBytes=0;destroyRetired;stats={textureCount:0,estimatedBytes:0,scale:1};constructor(e){this.device=e;let t=["repeat","clamp-to-edge","mirror-repeat"];this.samplers=t.flatMap(A=>t.map(a=>e.createSampler({minFilter:"linear",magFilter:"linear",addressModeU:A,addressModeV:a}))),this.fallback=e.createTexture({size:[1,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST}),e.queue.writeTexture({texture:this.fallback},new Uint8Array([255,255,255,255]),{bytesPerRow:4},[1,1])}get revision(){return this.generation}get diagnostics(){return{...this.stats,metadataBytes:this.metadata?.size??0,resourceTableCapacity:this.table?.size??0,retiredBytes:this.retiredBytes}}update(e,t){if(this.disposed)throw new Error("Bindless textures are disposed.");if(this.retirement)throw new Error("Previous resource-table generation has not retired.");let A=Ta(this.device,e.length);if(A)throw new Error(A);let a=Am(e,t,this.device.limits.maxTextureDimension2D),r=a.floatStorage?"rgba16float":"rgba8unorm",n=new Map,s=[],o,l;try{e.forEach((h,B)=>{if(n.has(h))return;let E=a.sizes[B],x=this.entries.get(h),y=x&&x.width===E.width&&x.height===E.height&&x.format===r,M=y?x.gpu:this.device.createTexture({label:"Material texture",size:[E.width,E.height],format:r,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST});if(y||s.push(M),!y||x.image!==h.image||x.version!==h.version||x.flipY!==h.flipY||x.sourceWidth!==h.image.width||x.sourceHeight!==h.image.height){let b=am(h,E,a.floatStorage);this.device.queue.writeTexture({texture:M},b,{bytesPerRow:E.width*a.bytesPerPixel},[E.width,E.height])}n.set(h,{gpu:M,image:h.image,version:h.version,sourceWidth:h.image.width,sourceHeight:h.image.height,flipY:h.flipY,format:r,...E})});let c=e.map(h=>n.get(h).gpu);if(!this.table||c.length!==this.logical.length||c.some((h,B)=>h!==this.logical[B])){let h=Math.min(65536,2**Math.ceil(Math.log2(Math.max(16,e.length+10))));o=oo(this.device,h),o.update(0,this.fallback.createView()),this.samplers.forEach((B,E)=>o.update(E+1,B)),c.forEach((B,E)=>o.update(10+E,B.createView()))}let m=Math.floor(Math.min(this.device.limits.maxStorageBufferBindingSize,this.device.limits.maxBufferSize)/48),d=Math.min(m,Math.max(this.metadataCapacity,2**Math.ceil(Math.log2(Math.max(1,e.length)))));(!this.metadata||d!==this.metadataCapacity)&&(l=this.device.createBuffer({label:"Material texture metadata",size:d*48,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST})),this.device.queue.writeBuffer(l??this.metadata,0,rm(e,a.sizes,d));let u=o?this.table:void 0,p=l?this.metadata:void 0,g=new Set(c),v=[...new Set([...this.entries.values()].map(h=>h.gpu))].filter(h=>!g.has(h));if(this.entries=n,this.logical=c,o&&(this.table=o),l&&(this.metadata=l),this.metadataCapacity=d,this.generation++,this.stats={textureCount:e.length,estimatedBytes:[...new Set(c)].reduce((h,B)=>h+B.width*B.height*a.bytesPerPixel,0),scale:a.scale},u||p||v.length){this.retiredBytes=(p?.size??0)+v.reduce((B,E)=>B+E.width*E.height*(E.format==="rgba16float"?8:4),0);let h=()=>{u?.destroy(),p?.destroy(),v.forEach(B=>B.destroy()),this.retiredBytes=0};this.destroyRetired=h,this.retirement=this.device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>{this.destroyRetired===h&&(h(),this.destroyRetired=void 0,this.retirement=void 0)})}}catch(c){throw o?.destroy(),l?.destroy(),s.forEach(f=>f.destroy()),c}}dispose(){this.disposed||(this.disposed=!0,this.generation++,this.destroyRetired?.(),this.destroyRetired=void 0,this.retirement=void 0,this.table?.destroy(),this.metadata?.destroy(),this.fallback.destroy(),new Set([...this.entries.values()].map(e=>e.gpu)).forEach(e=>e.destroy()),this.entries.clear(),this.logical=[])}};function Cf(i,e){let t=i.indexOf("fn decodeMapColor("),A=i.indexOf("fn getMaterialEmission(",t),a=/@group\(1\) @binding\(0\) var mapSampler: sampler;[\s\S]*?@group\(1\) @binding\(3\) var<uniform> mapInfo: array<vec4f, NUM_MAPS \* 3>;/;if(t<0||A<t||!a.test(i))throw new Error("Shared shader material sampling boundary changed.");return`enable ${e};
`+(i.slice(0,t)+sm+i.slice(A)).replace(a,nm).replace(/mapInfo\[([^\]\n]+) \+ NUM_MAPS \* 2\]\.x > 0\.5/g,"materialTextureInfo[$1].resources.z != 0u").replace(/@group\((\d)\) @binding\((\d+)\)/g,(r,n,s)=>{let o=Number(n);return o===0?r:`@group(${o===1?0:o-1}) @binding(${Number(s)+(o===1?4:0)})`})}function Mf(){let i=Un().map((e,t)=>t!==1?e:{...e,entries:Array.from(e.entries).filter(A=>A.binding!==0&&A.binding!==1).map(A=>A.binding===3?{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}}:A)});return[{label:"Bindless scene",entries:[...i[0].entries,...Array.from(i[1].entries).map(e=>({...e,binding:e.binding+4}))]},i[2],i[3]]}var nm=`struct MaterialTextureInfo {
uvTransform: vec4f,
resources: vec4u,
extent: vec4u,
};
@group(1) @binding(3) var<storage, read> materialTextureInfo: array<MaterialTextureInfo>;`,sm=`fn decodeMapColor(idx: i32, c: vec3f) -> vec3f {
if (materialTextureInfo[idx].resources.w != 0u) { return c; }
return mG(c);
}
fn ah(val: i32) -> vec2f {
return vec2f(f32(val >> 8), f32(val & 0xff) / 255.0);
}
fn jO(idx: i32) -> vec2f { return vec2f(materialTextureInfo[idx].extent.xy); }
fn getMapUvSet(idx: i32, uv: vec2f, uv1: vec2f) -> vec2f {
return select(uv, uv1, materialTextureInfo[idx].resources.z != 0u);
}
fn sampleMap(idx: i32, uv: vec2f) -> vec4f {
let info = materialTextureInfo[idx];
let tex = getResource<texture_2d<f32>>(info.resources.x);
let samp = getResource<sampler>(info.resources.y);
return textureSampleLevel(tex, samp, uv * info.uvTransform.xy + info.uvTransform.zw, 0.0);
}
`;var Ut={USE_ENVMAP:1,...Xs,HAS_THIN_FILM:2**10,HAS_COAT:2**11,HAS_FUZZ:2**12,HAS_SUBSURFACE:2**13,HAS_SHADOW_CATCHER:2**14};function On(i){let e=0;for(let[t,A]of Object.entries(Ut))i[t]&&(e|=A);return e}var oA={transmission:1,metal:2},jt={SphereLight:1,RectLight:2,SpotLight:4,DirectionalLight:8,emissive:16},Qf=3,If=31;function Sf(i,e){let t=e>0?jt.emissive:0;for(let A of i)switch(A){case"SphereLight":t|=jt.SphereLight;break;case"RectLight":t|=jt.RectLight;break;case"SpotLight":t|=jt.SpotLight;break;case"DirectionalLight":t|=jt.DirectionalLight;break}return t}function Pf(i,e){return(i.SCENE_CAPABILITIES&e.SCENE_CAPABILITIES)===e.SCENE_CAPABILITIES&&(i.MATERIAL_CAPABILITIES&e.MATERIAL_CAPABILITIES)===e.MATERIAL_CAPABILITIES&&(i.LIGHT_CAPABILITIES&e.LIGHT_CAPABILITIES)===e.LIGHT_CAPABILITIES}function Lo(i,e){let t=On(i)|(e?.SCENE_CAPABILITIES??0),A=oA.metal|Number(i.MATERIAL_CAPABILITIES??0)|(e?.MATERIAL_CAPABILITIES??0),a=Ut.HAS_COAT|Ut.HAS_FUZZ;return(t&a)!==0&&(t|=a),{SCENE_CAPABILITIES:t,MATERIAL_CAPABILITIES:A,LIGHT_CAPABILITIES:Number(i.LIGHT_CAPABILITIES??0)|(e?.LIGHT_CAPABILITIES??0)}}function Df(i,e,t,A,a=0){let r=i.some(c=>c.bevelSize>0),n=i.some(c=>c.transmissionDispersionScale>0),s=i.some(GA),o=Math.max(Math.ceil(+e.defines.NUM_MAPS/10)*10,Number(a??0),20),l=i.some(c=>c.coatWeight>0&&(!!c.normalMap||!!c.coatNormalMap));return{MATERIAL_CAPABILITIES:(i.some(c=>c.transmissionWeight!==0||!!c.map&&c.mapAlphaUsage==="transmission")?oA.transmission:0)|(i.some(c=>c.baseMetalness!==0)?oA.metal:0),USE_UV1:e.bufferData.mapUvChannel.some(c=>c>.5),USE_TANGENT:t.tangent!=null&&i.some(c=>c.specularAnisotropy>0||c.coatAnisotropy>0||!!c.coatNormalMap&&c.coatWeight>0),USE_COAT_NORMAL_FRAMES:l,USE_ANISOTROPY_DIRECTIONS:l||i.some(c=>c.specularAnisotropy>0&&(c.specularAnisotropyModel==="gltf"||!!c.anisotropyMap||c.specularAnisotropyRotation!==0)||c.coatAnisotropy>0&&c.coatAnisotropyRotation!==0),HAS_MEDIUM:s,HAS_SHADOW_CATCHER:i.some(c=>c.shadowCatcher),HAS_THIN_FILM:i.some(c=>c.thinFilmWeight>0),HAS_COAT:i.some(c=>c.coatWeight>0),HAS_FUZZ:i.some(c=>c.fuzzWeight>0),HAS_SUBSURFACE:i.some(c=>c.subsurfaceWeight>0),HAS_BEVEL:r,HAS_ALPHA_MASK:i.some(c=>di(c)==="mask"),HAS_ALPHA_BLEND:i.some(c=>di(c)==="blend"),HAS_ALPHA:i.some(c=>di(c)!=="opaque"),SPECTRAL:n,BEVEL_SAMPLES:A,USE_RR:!0,RR_MAX:s?12:2,NUM_UNIFORM_LIGHTS:64,...e.defines,NUM_MAPS:o,...ac(e.defines),USE_NORMAL_MAPS:+e.defines.NUM_NORMAL_MAPS>0}}var lA=`
struct ShadowCatcherAccumulation {

mask: vec4f,
background: vec4f,


moments: vec4f,
}
`;var Tf=`
const hp: array<vec4f, 128> = array<vec4f, 128>(
vec4f(-0.971247852, -0.202764958, 0.999698818, 0.0245412290),
vec4f(-0.808660269, 0.547487736, 0.997290432, 0.0735645667),
vec4f(-0.942509234, 0.187289074, 0.992479563, 0.122410677),
vec4f(-0.763038993, -0.558020830, 0.985277653, 0.170961902),
vec4f(-0.929654300, -0.00785388052, 0.975702107, 0.219101235),
vec4f(-0.656618595, 0.740912974, 0.963776052, 0.266712785),
vec4f(-0.817265987, 0.373183846, 0.949528158, 0.313681751),
vec4f(-0.793490529, -0.386950523, 0.932992816, 0.359895051),
vec4f(-0.860713601, -0.105764769, 0.914209723, 0.405241340),
vec4f(-0.604139447, 0.619064212, 0.893224299, 0.449611336),
vec4f(-0.787263036, 0.281084418, 0.870086968, 0.492898226),
vec4f(-0.673318744, -0.468566477, 0.844853580, 0.534997642),
vec4f(-0.799623907, 0.0901312605, 0.817584813, 0.575808227),
vec4f(-0.570307195, -0.676738262, 0.788346410, 0.615231633),
vec4f(-0.627450705, 0.452229142, 0.757208824, 0.653172851),
vec4f(-0.698281944, -0.294418186, 0.724247098, 0.689540565),
vec4f(-0.726036906, -0.153989345, 0.689540505, 0.724247098),
vec4f(-0.523753047, 0.608020604, 0.653172791, 0.757208884),
vec4f(-0.671607554, 0.233185455, 0.615231574, 0.788346410),
vec4f(-0.491990626, -0.494420350, 0.575808167, 0.817584813),
vec4f(-0.678437173, 0.0412081257, 0.534997642, 0.844853580),
vec4f(-0.495611340, -0.807542920, 0.492898196, 0.870086968),
vec4f(-0.508582473, 0.402262419, 0.449611306, 0.893224299),
vec4f(-0.537693322, -0.333672792, 0.405241281, 0.914209783),
vec4f(-0.614562631, -0.0568606183, 0.359894961, 0.932992816),
vec4f(-0.452296555, 0.809743226, 0.313681662, 0.949528217),
vec4f(-0.492342144, 0.317682207, 0.266712755, 0.963776052),
vec4f(-0.403601944, -0.406031638, 0.219101220, 0.975702107),
vec4f(-0.537260950, 0.137945175, 0.170961857, 0.985277653),
vec4f(-0.404928178, -0.715918541, 0.122410625, 0.992479563),
vec4f(-0.386338592, 0.556550741, 0.0735644922, 0.997290432),
vec4f(-0.445942074, -0.242918074, 0.0245411359, 0.999698818),
vec4f(-0.459759980, -0.175696611, -0.0245412234, 0.999698818),
vec4f(-0.359771132, 0.682195961, -0.0735645741, 0.997290432),
vec4f(-0.412575692, 0.205535084, -0.122410707, 0.992479503),
vec4f(-0.336475104, -0.646421731, -0.170961946, 0.985277653),
vec4f(-0.429363400, 0.0166855231, -0.219101310, 0.975702107),
vec4f(-0.319253087, -0.925218344, -0.266712844, 0.963776052),
vec4f(-0.294470191, 0.430103362, -0.313681722, 0.949528158),
vec4f(-0.281283021, -0.387403429, -0.359895051, 0.932992816),
vec4f(-0.358183086, -0.0808178857, -0.405241340, 0.914209723),
vec4f(-0.271769434, 0.854052365, -0.449611366, 0.893224299),
vec4f(-0.244775921, 0.311606824, -0.492898166, 0.870087028),
vec4f(-0.244355842, -0.552090824, -0.534997702, 0.844853520),
vec4f(-0.283291280, 0.112162955, -0.575808167, 0.817584813),
vec4f(-0.224362880, -0.823741674, -0.615231693, 0.788346350),
vec4f(-0.210826442, 0.610893846, -0.653172851, 0.757208824),
vec4f(-0.191608176, -0.297364026, -0.689540684, 0.724246979),
vec4f(-0.207833603, -0.124338157, -0.724247158, 0.689540505),
vec4f(-0.176593989, 0.814833522, -0.757208824, 0.653172851),
vec4f(-0.158949688, 0.293469012, -0.788346469, 0.615231514),
vec4f(-0.152046368, -0.648668587, -0.817584813, 0.575808167),
vec4f(-0.167782038, 0.0643178672, -0.844853640, 0.534997463),
vec4f(-0.128430068, -0.907204390, -0.870087028, 0.492898136),
vec4f(-0.115809105, 0.572147131, -0.893224299, 0.449611366),
vec4f(-0.103222348, -0.403248310, -0.914209783, 0.405241221),
vec4f(-0.112737618, -0.0319865458, -0.932992816, 0.359895051),
vec4f(-0.0796749964, 0.955433667, -0.949528217, 0.313681602),
vec4f(-0.0672519580, 0.453793734, -0.963776052, 0.266712725),
vec4f(-0.0551275201, -0.538435221, -0.975702167, 0.219101071),
vec4f(-0.0426490456, 0.204346836, -0.985277653, 0.170961812),
vec4f(-0.0306719355, -0.790655255, -0.992479503, 0.122410700),
vec4f(-0.0184057076, 0.708510995, -0.997290492, 0.0735644475),
vec4f(-0.00613544276, -0.291185349, -0.999698818, 0.0245412104),
vec4f(0.00613530306, -0.244297966, -0.999698818, -0.0245413855),
vec4f(0.0184059385, 0.755400777, -0.997290432, -0.0735646188),
vec4f(0.0306059923, 0.253786176, -0.992479503, -0.122410871),
vec4f(0.0429276451, -0.743136168, -0.985277653, -0.170961991),
vec4f(0.0701737553, 0.00441496586, -0.975702107, -0.219101235),
vec4f(0.0674433559, -0.992085159, -0.963776052, -0.266712904),
vec4f(0.0794365108, 0.499346048, -0.949528158, -0.313681781),
vec4f(0.0915081054, -0.485832185, -0.932992756, -0.359895200),
vec4f(0.101071075, -0.0861614645, -0.914209723, -0.405241400),
vec4f(0.116242222, 0.872919321, -0.893224180, -0.449611515),
vec4f(0.126407236, 0.359021723, -0.870086908, -0.492898285),
vec4f(0.139908314, -0.603366435, -0.844853580, -0.534997642),
vec4f(0.168981716, 0.0979395211, -0.817584693, -0.575808346),
vec4f(0.164669126, -0.853637457, -0.788346410, -0.615231633),
vec4f(0.175589874, 0.605686426, -0.757208705, -0.653172970),
vec4f(0.181917489, -0.321471483, -0.724247038, -0.689540625),
vec4f(0.219242185, -0.135647133, -0.689540565, -0.724247098),
vec4f(0.212299466, 0.790099680, -0.653172910, -0.757208765),
vec4f(0.208243251, 0.240495890, -0.615231574, -0.788346469),
vec4f(0.234419063, -0.640313387, -0.575808048, -0.817584932),
vec4f(0.315854102, 0.0532567836, -0.534997344, -0.844853759),
vec4f(0.260333687, -0.894772291, -0.492898196, -0.870086968),
vec4f(0.265374005, 0.502337217, -0.449611217, -0.893224359),
vec4f(0.267429054, -0.339113116, -0.405241072, -0.914209843),
vec4f(0.380209267, -0.0445682108, -0.359895110, -0.932992756),
vec4f(0.307221651, 0.891683638, -0.313681692, -0.949528217),
vec4f(0.296788067, 0.329054117, -0.266712576, -0.963776112),
vec4f(0.317195147, -0.457708418, -0.219100907, -0.975702226),
vec4f(0.419729054, 0.148764044, -0.170961887, -0.985277653),
vec4f(0.349995196, -0.727014899, -0.122410536, -0.992479563),
vec4f(0.356363803, 0.594497383, -0.0735642835, -0.997290492),
vec4f(0.434345096, -0.231501341, -0.0245412868, -0.999698818),
vec4f(0.480473697, -0.164373189, 0.0245413091, -0.999698818),
vec4f(0.392657876, 0.681903303, 0.0735647827, -0.997290432),
vec4f(0.492657542, 0.218807966, 0.122411035, -0.992479503),
vec4f(0.409054011, -0.584142148, 0.170961916, -0.985277653),
vec4f(0.569577277, 0.0289491210, 0.219101399, -0.975702107),
vec4f(0.442882210, -0.855257273, 0.266713053, -0.963775992),
vec4f(0.459734946, 0.387970626, 0.313681692, -0.949528217),
vec4f(0.513070345, -0.343044043, 0.359895140, -0.932992756),
vec4f(0.629031241, -0.0690753013, 0.405241549, -0.914209664),
vec4f(0.483215511, 0.773316741, 0.449611664, -0.893224120),
vec4f(0.586818159, 0.310843110, 0.492898226, -0.870086968),
vec4f(0.528679490, -0.427168757, 0.534997761, -0.844853461),
vec4f(0.683721542, 0.126429096, 0.575808465, -0.817584634),
vec4f(0.517971814, -0.658907175, 0.615231574, -0.788346410),
vec4f(0.548397303, 0.476606160, 0.653172910, -0.757208765),
vec4f(0.695181608, -0.259932309, 0.689540744, -0.724246919),
vec4f(0.748597383, -0.117820688, 0.724247038, -0.689540625),
vec4f(0.556980729, 0.641256869, 0.757208884, -0.653172791),
vec4f(0.741829991, 0.268901259, 0.788346529, -0.615231454),
vec4f(0.647817433, -0.477341115, 0.817584991, -0.575807929),
vec4f(0.816602290, 0.0779312477, 0.844853580, -0.534997642),
vec4f(0.599919200, -0.671730816, 0.870087087, -0.492898077),
vec4f(0.724726558, 0.447135508, 0.893224418, -0.449611068),
vec4f(0.810727239, -0.307791352, 0.914209723, -0.405241370),
vec4f(0.882583082, -0.0201240778, 0.932992816, -0.359894961),
vec4f(0.645550549, 0.729843259, 0.949528277, -0.313681543),
vec4f(0.839177251, 0.362342149, 0.963776171, -0.266712397),
vec4f(0.839526892, -0.399391353, 0.975702107, -0.219101220),
vec4f(0.928934336, 0.175204813, 0.985277653, -0.170961723),
vec4f(0.774228692, -0.569184363, 0.992479563, -0.122410372),
vec4f(0.815476179, 0.537282884, 0.997290432, -0.0735645965),
vec4f(0.968665719, -0.214761987, 0.999698818, -0.0245411228)
);
`;var Rf=Tf+`
struct oa {
diffuse: vec3f,
specular: vec3f,
}
fn hN(prepared: ag, qQ: bool, kY: bool) -> oa {
var result = oa();
let view = prepared.viewLocal;
if (view.z <= 1e-6) { return result; }
let material = prepared.material;
let alpha = vec2f(material.alphaX, material.alphaY);
let mg = aF(view, alpha);
let jl = prepared.weights[OPENPBR_LOBE_DIFFUSE];
let gb = prepared.weights[OPENPBR_LOBE_METAL];
let specularWeight = prepared.weights[OPENPBR_LOBE_SPECULAR];
var ei = 1.0;
if (kY && prepared.dielectricMsProbability > 0.0) {
ei = max(bf(prepared.refractionEtaTOverEtaI, prepared.specularAlpha), 1e-12);
}
let cr = normalize(vec3f(alpha, 1.0) * view);
let qP = min(cr.z, 1.0);
let kh = 1.0 + qP;
let count = 256u * min(rtUniform.loopUnrollGuard, 4u) / 4u;
for (var i = 0u; i < count; i++) {
let vV = i / 2u;
let u = vec2f((f32(vV) + 0.5) / f32(count / 2u),
fract(f32(reverseBits(vV)) * 2.3283064365386963e-10 + 0.37));
let kK = hp[vV];


let hO = prepared.specularAlpha < 0.001 || count != 256u;
var light = vec3f(kK.xy, sqrt(max(0.0, 1.0 - dot(kK.xy, kK.xy))));
if (hO) { light = aO(u); }
if ((i & 1u) != 0u) {
let kC = (1.0 - u.y) * kh;
let ex = sqrt(max(0.0, (kC + (1.0 - qP)) * (u.y * kh)));
var half = normalize(vec3f(alpha, 1.0) * vec3f(cr.xy + ex * kK.zw, kC));
if (hO) { half = aD(view, alpha, u); }
light = reflect(-view, half);
}

if (light.z <= 0.0) { continue; }
let half = normalize(view + light);
let qH = mg * cW(half, alpha) / (4.0 * view.z);
let pdf = 0.5 * (light.z * INVPI + qH);


let aA = openpbr_to_local(prepared.basis, openpbr_to_world(prepared.basis, light));
if (aA.z <= 0.0) { continue; }
let scale = abs(aA.z) / (pdf * f32(count));
if (qQ && jl > 0.0) {
let compensation = prepared.diffuseSpecularEnergyCompensation * aw(
prepared.specularEtaTOverEtaI, prepared.specularAlpha, abs(aA.z));
var sZ = 0.0;
result.diffuse += jl * bJ(material, prepared.diffuseColor,
view, aA, compensation, &sZ) * scale;
}
if (kY) {
let jn = normalize(view + aA);
let bm = abs(dot(view, jn));
var bG = vec3f(0.0);
if (specularWeight > 0.0) {
var dielectric = vec3f(af(bm, material.relativeIor));
if (material.thinWalled) { dielectric = av(dielectric, material.transmissionWeight); }
bG += specularWeight * material.specularColor * dielectric;
}
if (gb > 0.0) {
bG += gb * material.specularWeight * cw(bm,
material.baseWeight * material.baseColor, material.specularColor);
}
let rJ = cW(jn, alpha) * mg
* aF(aA, alpha) / (4.0 * max(aA.z * view.z, 1e-8));
var reflection = bG * rJ;
if (gb > 0.0 && prepared.metalMsFactor > 0.0) {
let cL = min(prepared.metalMsFactor * aV(prepared.specularAlpha, aA.z), 1.0 / max(aA.z, 1e-8));
reflection += gb * prepared.metalMsScale * cL * INVPI;
}
if (prepared.dielectricMsProbability > 0.0) {
let oZ = prepared.dielectricMsViewLoss * bb(
prepared.refractionEtaTOverEtaI, prepared.specularAlpha, abs(aA.z)) / ei;
let cL = min(oZ * prepared.dielectricMsReflectionRatio, 1.0 / abs(aA.z));
reflection += prepared.dielectricMsReflectionScale * cL * INVPI;
}
result.specular += reflection * scale;
}
}
return result;
}
fn vT(prepared: ag) -> oa {
return hN(prepared, true, true);
}
`;var Uf=`
override AOV_REFLECTANCE: bool = true;
struct AovAccumulation {
depthRoughness: vec4f,
position: vec4f,
diffuse: vec4f,
specular: vec4f,
}
struct AovCenter { identity: vec4u, motion: vec4f, }
@group(3) @binding(5) var<storage, read_write> aovAccum: array<AovAccumulation>;
@group(3) @binding(6) var<storage, read_write> aovCenter: array<AovCenter>;
@group(3) @binding(7) var<storage, read> aovScene: array<u32>;
@group(3) @binding(9) var<storage, read> aovPrevious: array<AovCenter>;
@group(3) @binding(8) var<uniform> aovParameters: vec4u;

fn ow(offset: u32) -> mat4x4f {
return mat4x4f(bitcast<vec4f>(vec4u(aovScene[offset], aovScene[offset+1u], aovScene[offset+2u], aovScene[offset+3u])),
bitcast<vec4f>(vec4u(aovScene[offset+4u], aovScene[offset+5u], aovScene[offset+6u], aovScene[offset+7u])),
bitcast<vec4f>(vec4u(aovScene[offset+8u], aovScene[offset+9u], aovScene[offset+10u], aovScene[offset+11u])),
bitcast<vec4f>(vec4u(aovScene[offset+12u], aovScene[offset+13u], aovScene[offset+14u], aovScene[offset+15u])));
}
fn iN(offset:u32)->vec3f {return bitcast<vec3f>(vec3u(aovScene[offset],aovScene[offset+1u],aovScene[offset+2u]));}
fn mQ(xe: Ray, si: ptr<function, SurfaceInteraction>, material: ptr<function, OpenPbrResolvedMaterial>) -> bool {
var ray = xe;
(*si).triangleIndex = -1;
for (var layer = 0; layer < 32; layer++) {
intersectScene(ray, si, 0, false, false);
if (!(*si).hit) { return false; }
dg(material, (*si).materialIndex, (*si).uv, (*si).uv1, (*si).instanceIndex, (*si).vertexColor);
if ((*material).materialType != SHADOW_CATCHER && (*material).alpha >= 0.5) { return true; }
ray.o = (*si).position + ray.d * (EPS * 0.02);
}
return false;
}
@compute @workgroup_size(8, 8)
fn aovTrace(@builtin(global_invocation_id) id: vec3u) {
let size = aovParameters.xy;
if (any(id.xy >= size)) { return; }
let index = id.x + id.y * size.x;
let sample = aovParameters.z;
if (sample == 0u) { aovAccum[index] = AovAccumulation(); }
aZ = id.xy; aQ = sample + rtUniform.sampleSequenceOffset;
bT = 0u; cP = 0u;
gW(id.xy, i32(aQ ^ dG(rtUniform.sequenceSeed)));
let uv = (vec2f(id.xy) + dZ(CAMERA_PIXEL)) / vec2f(size);
var ray = fj(uv);
if (cameraUniform.apertureRadius > 0.0) {
let eye = cameraUniform.viewInv[3].xyz;
let forward = -normalize(cameraUniform.viewInv[2].xyz);
let jN = eye + ray.d * (cameraUniform.focusDistance / dot(ray.d, forward));
let xU = cameraUniform.apertureRadius * kN(dZ(CAMERA_LENS));
let origin = (cameraUniform.viewInv * vec4f(xU, 0.0, 1.0)).xyz;
gC(&ray, origin, normalize(jN-origin));
}
var si: SurfaceInteraction; var material: OpenPbrResolvedMaterial;
if (!mQ(ray, &si, &material)) { return; }
let depth = max(dot(si.position-cameraUniform.viewInv[3].xyz, -normalize(cameraUniform.viewInv[2].xyz)), 0.0);
let unsupported = (material.materialType != STANDARD) | (material.alpha < 1.0) |
(material.coatWeight > 0.0) | (material.fuzzWeight > 0.0) |
(material.specularAnisotropy > 0.0) | (material.subsurfaceWeight > 0.0) |
(dot(material.mediumScattering, material.mediumScattering) > 0.0) |
(material.bevel > 0.0) | (material.thinFilmWeight > 0.0) |
(material.transmissionDispersionScale > 0.0);
aovAccum[index].depthRoughness += vec4f(depth, material.specularRoughness, material.baseMetalness, select(0.0,1.0,unsupported));
if (AOV_REFLECTANCE && (aovParameters.w & 24u) != 0u && !unsupported) {
var normal=si.normal; var face=si.faceNormal;
var cosine=-dot(normal,ray.d); var fu=-dot(face,ray.d);
if (material.thinWalled && (material.transmissionWeight>0.0 || material.subsurfaceWeight>0.0)) {
if(cosine<0.0){normal=-normal;cosine=-cosine;}
if(fu<0.0){face=-face;fu=-fu;}
}
if(fu>=0.0 && cosine<0.0){normal=face;cosine=fu;}
normal=select(-normal,normal,cosine>=0.0);
material.inside=(cosine<=0.0) && !material.thinWalled;
material.relativeIor=select(material.specularIor,1.0/material.specularIor,cosine>0.0);
let prepared=ds(si.tangent,material,-ray.d,normal);
let reflectance=hN(prepared, (aovParameters.w & 8u) != 0u, (aovParameters.w & 16u) != 0u);
aovAccum[index].diffuse+=vec4f(reflectance.diffuse,1.0);
aovAccum[index].specular+=vec4f(reflectance.specular,1.0);
}
aovAccum[index].position += vec4f(si.position, 1.0);
}
@compute @workgroup_size(8, 8)
fn aovTraceCenter(@builtin(global_invocation_id) id: vec3u) {
let size = aovParameters.xy;
if (any(id.xy >= size)) { return; }
let index = id.x + id.y * size.x;
aovCenter[index] = AovCenter(vec4u(0xffffffffu), vec4f(0.0));
let uv = (vec2f(id.xy) + 0.5) / vec2f(size);
let ray = fj(uv);
var si: SurfaceInteraction; var material: OpenPbrResolvedMaterial;
if (!mQ(ray, &si, &material)) { return; }
let offset = 52u + u32(si.instanceIndex) * 24u;
let materialOffset = aovScene[16u];
let primitiveOffset = aovScene[17u];
aovCenter[index].identity = vec4u(aovScene[offset], aovScene[offset+1u],
aovScene[materialOffset + u32(si.materialIndex)], aovScene[primitiveOffset + u32(si.triangleIndex)]);
aovCenter[index].motion.z = dot(si.position-iN(36u),iN(40u));
if (aovScene[offset+2u] == 0u) { return; }
let qA = ow(offset+4u) * vec4f(si.position,1.0);
let ps = ow(0u) * qA;
if (ps.w <= 0.0) { return; }
let tX=ps.xyz/ps.w;
let iz=(tX.xy*0.5+0.5)*vec2f(size);
if (any(iz < vec2f(0.0)) || any(iz >= vec2f(size)) || abs(tX.z)>1.0) { return; }
let previous=aovPrevious[u32(iz.x)+u32(iz.y)*size.x];
let qz=dot(qA.xyz-iN(44u),iN(48u));
if (any(previous.identity.xy != aovCenter[index].identity.xy) || abs(previous.motion.z-qz)>max(1e-4,abs(qz)*1e-3)) { return; }
let motion=(iz-(vec2f(id.xy)+0.5))*vec2f(1.0,-1.0);
aovCenter[index].motion=vec4f(motion,aovCenter[index].motion.z,3.0);
}
`;var Lf=`
@group(3) @binding(4) var<uniform> depthArea: vec4f;

@compute @workgroup_size(${7}, ${7})
fn depthQuery(@builtin(global_invocation_id) id: vec3u) {
let index = id.x + id.y * ${7}u;
let offset = vec2f(id.xy) / ${6}.0 * 2.0 - 1.0;
let uv = depthArea.xy + depthArea.zw * offset * vec2f(1.0, -1.0);
outColor[index] = vec4f(0.0);
if (any(uv < vec2f(0.0)) || any(uv > vec2f(1.0))) { return; }
var ray = fj(uv);
let eye = cameraUniform.viewInv[3].xyz;
let forward = -normalize(cameraUniform.viewInv[2].xyz);
var si: SurfaceInteraction;
si.triangleIndex = -1;



for (var layer = 0; layer < 32; layer++) {
intersectScene(ray, &si, 0, false, false);
if (!si.hit) { return; }
var material: OpenPbrResolvedMaterial;
dg(&material, si.materialIndex, si.uv, si.uv1, si.instanceIndex, si.vertexColor);
if (material.materialType != SHADOW_CATCHER && material.alpha > 0.0) {
outColor[index] = vec4f(max(dot(si.position - eye, forward), 0.0), 0.0, 0.0, 0.0);
return;
}
ray.o = si.position + ray.d * (EPS * 0.02);
}
}
`;var Of=`

const PI = 3.14159265359;
const TWOPI = 6.28318530718;
const INVPI = 0.31830988618;
const INVPI2 = 0.10132118364;
const EPS = 0.0005;
const INV4PI = 0.07957747154594766;
const INF = 1.0e+38;
const ROUGHNESS_MIN = 0.001;



fn sR(position: vec3f, geometricNormal: vec3f, direction: vec3f) -> vec3f {
let normal = select(-geometricNormal, geometricNormal, dot(geometricNormal, direction) >= 0.0);
let rm = vec3i(256.0 * normal);
let bits = bitcast<vec3i>(position);
let xC = bitcast<vec3f>(bits + select(rm, -rm, position < vec3f(0.0)));
return select(xC, position + normal / 65536.0, abs(position) < vec3f(1.0 / 32.0));
}

`;function Oo({hasAnisotropyDirections:i=!0,hasCoatNormals:e=!1,hasSceneAlpha:t=!0,lightCapabilities:A=If}){return`

const luminance = vec3f(0.2126, 0.7152, 0.0722);
const RAY_MAX_DISTANCE = 9999.0;

const STANDARD = 0;
const UNLIT = ${2};
const SHADOW_CATCHER = ${3};

const RECT_LIGHT = ${3};
const SPHERE_LIGHT = ${2};
const DIRECTIONAL_LIGHT = ${1};
const SPOT_LIGHT = ${4};
const HAS_SCENE_SPHERE_LIGHT = ${(A&jt.SphereLight)!==0};
const HAS_SCENE_RECT_LIGHT = ${(A&jt.RectLight)!==0};
const HAS_SCENE_SPOT_LIGHT = ${(A&jt.SpotLight)!==0};
const HAS_SCENE_DIRECTIONAL_LIGHT = ${(A&jt.DirectionalLight)!==0};
const HAS_SCENE_EMISSIVE_LIGHT = ${(A&jt.emissive)!==0};

struct Ray {
o: vec3f,
d: vec3f,
};

struct SurfaceInteraction {
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
vertexColor: vec3f,

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




struct OpenPbrResolvedMaterial {
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

struct qb {
probability: f32,
aliasIndex: i32,
sourceType: i32,
sourceIndex: i32,
};

${tc()}

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

shadowCatcherChoiceOffset: i32,
shadowCatcherChoiceCount: i32,
environmentRotation: mat4x4f,
backgroundMapTransform: vec4f,
backgroundMapRotation: mat4x4f,
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

fn cS(el: i32, mc: i32) -> f32 {
let iK = el + mc / 4;
let width = rtUniform.lightSamplingTextureWidth;
let packed = textureLoad(lightSamplingData, vec2i(iK % width, iK / width), 0);
return packed[mc % 4];
}

fn lB(el: i32, uv: vec2f) -> f32 {
if (el < 0) { return 1.0; }
let pixel = fract(uv) * 128.0 - vec2f(0.5);
let x0 = i32(floor(pixel.x));
let y0 = i32(floor(pixel.y));
let fx = fract(pixel.x);
let fy = fract(pixel.y);
let xa = select(x0, 127, x0 < 0);
let xb = select(x0 + 1, 0, x0 >= 127);
let ya = select(y0, 127, y0 < 0);
let yb = select(y0 + 1, 0, y0 >= 127);
let a = cS(el, ya * 128 + xa);
let b = cS(el, ya * 128 + xb);
let c = cS(el, yb * 128 + xa);
let d = cS(el, yb * 128 + xb);
return mix(mix(a, b, fx), mix(c, d, fx), fy);
}

fn bP(light: Light, dV: vec3f) -> f32 {
let axis = normalize(light.u);
let ci = dot(axis, dV);
var vm = select(0.0, 1.0, ci >= light.v.x);
if (light.v.y > light.v.x + 1e-6) {
vm = smoothstep(light.v.x, light.v.y, ci);
}
if (vm <= 0.0 || light.textureIndex < 0.0) { return vm; }
let vK = light.iesReference;
let xj = cross(axis, vK);
let vertical = acos(clamp(ci, -1.0, 1.0));
let horizontal = atan2(dot(dV, xj), dot(dV, vK));
return vm * lB(i32(light.textureIndex), vec2f(vertical / PI, horizontal / TWOPI + 0.5));
}




@group(2) @binding(0) var<uniform> cameraUniform: CameraUniform;
@group(2) @binding(1) var<uniform> rtUniform: RayTraceUniform;

@group(2) @binding(2) var<uniform> analyticLights: array<Light, NUM_UNIFORM_LIGHTS>;


fn gC(ray: ptr<function, Ray>, origin: vec3f, direction: vec3f) {
(*ray).o = origin;
(*ray).d = direction;
}
`}function Fo({hasAnisotropyDirections:i=!0,hasCoatNormals:e=!1,hasSceneAlpha:t=!0,hasTransmission:A=!0,hasMetalness:a=!0}={}){let r=t?"(*ma).alphaMode = i32(matData.alphaMode);":"",n=t?`
if ((*ma).alphaMode == ${It.opaque}) {
(*ma).alpha = 1.0;
}
else if ((*ma).alphaMode == ${It.mask}) {
(*ma).alpha = select(0.0, 1.0, (*ma).alpha >= matData.alphaCutoff);
}`:"(*ma).alpha = 1.0;";return`

${i?`fn fv(roughness: f32, strength: f32) -> vec2f {
if (strength == 0.0) { return vec2f(roughness, 0.0); }
let u = roughness * roughness;
let a = u + (1.0 - u) * strength * strength;
if (a == 0.0) { return vec2f(0.0); }
return vec2f(pow((a*a + u*u) * 0.5, 0.25), clamp(1.0 - u/a, 0.0, 1.0));
}
`:""}

fn mG(c: vec3f) -> vec3f {
return mix(pow(c * 0.9478672986 + 0.0521327014, vec3f(2.4)), c * 0.0773993808, vec3f(c < vec3f(0.04045)));
}

fn decodeMapColor(idx: i32, c: vec3f) -> vec3f {
if (mapInfo[idx + NUM_MAPS * 2].y > 0.5) { return c; }
return mG(c);
}

fn ah(val: i32) -> vec2f {
return vec2f(f32(val >> 8), f32(val & 0xff) / 255.0);
}

fn jO(idx: i32) -> vec2f {
return mapInfo[idx].xy;
}

fn lT(idx: i32) -> i32 {
return i32(floor(mapInfo[idx].z));
}

fn kt(idx: i32) -> vec2f {
return vec2f(fract(mapInfo[idx].z), mapInfo[idx].w);
}

fn gg(value: f32, mode: f32) -> f32 {
if (mode < 0.5) { return fract(value); }
if (mode < 1.5) { return clamp(value, 0.0, 1.0); }
return 1.0 - abs(1.0 - (value - 2.0 * floor(value * 0.5)));
}

fn kZ(idx: i32, uv: vec2f) -> vec2f {
let transform = mapInfo[idx + NUM_MAPS];
let modes = mapInfo[idx + NUM_MAPS * 2].zw;
let value = uv * transform.xy + transform.zw;
return vec2f(gg(value.x, modes.x), gg(value.y, modes.y));
}

fn tJ(idx: i32, uv: vec2f) -> vec2f {
let rN = kZ(idx, uv);
let jH = 1.0 / vec2f(textureDimensions(map).xy);
let eo = kt(idx);
let kS = jO(idx) + jH;
let pJ = eo - 0.5 * jH;
let ml = eo + kS - jH;
return clamp(
pJ + rN * kS,
eo,
ml
);
}

fn getMapUvSet(idx: i32, uv: vec2f, uv1: vec2f) -> vec2f {
return select(uv, uv1, mapInfo[idx + NUM_MAPS * 2].x > 0.5);
}

fn sampleMap(idx: i32, uv: vec2f) -> vec4f {
let size = vec2i(round(jO(idx) * vec2f(textureDimensions(map).xy) + vec2f(1.0)));
let dk = kZ(idx, uv) * vec2f(size) - vec2f(0.5);
let modes = mapInfo[idx + NUM_MAPS * 2].zw;


if ((size.x > 1 && modes.x < 0.5 && (dk.x < 0.0 || dk.x > f32(size.x - 1))) ||
(size.y > 1 && modes.y < 0.5 && (dk.y < 0.0 || dk.y > f32(size.y - 1)))) {
let base = vec2i(floor(dk));
let weight = fract(dk);
let origin = vec2i(round(kt(idx) * vec2f(textureDimensions(map).xy) - vec2f(0.5)));
return mix(
mix(fe(idx, base, size, origin, modes), fe(idx, base + vec2i(1, 0), size, origin, modes), weight.x),
mix(fe(idx, base + vec2i(0, 1), size, origin, modes), fe(idx, base + vec2i(1, 1), size, origin, modes), weight.x), weight.y);
}
return textureSampleLevel(map, mapSampler, tJ(idx, uv), lT(idx), 0.0);
}

fn fe(idx: i32, jJ: vec2i, size: vec2i, origin: vec2i, modes: vec2f) -> vec4f {
var p = clamp(jJ, vec2i(0), size - vec2i(1));
if (modes.x < 0.5) { p.x = ((jJ.x % size.x) + size.x) % size.x; }
if (modes.y < 0.5) { p.y = ((jJ.y % size.y) + size.y) % size.y; }
return textureLoad(map, origin + p, lT(idx), 0);
}


fn getMaterialEmission(materialIndex: i32, uv: vec2f, uv1: vec2f) -> vec3f {
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


fn aN(roughness: f32, anisotropy: f32) -> vec2f {
let alpha = roughness * roughness;
let qe = ROUGHNESS_MIN * ROUGHNESS_MIN;
if (anisotropy == 0.0) { return vec2f(max(qe, alpha)); }
let dw = 1.0 - anisotropy;
let tp = alpha * sqrt(2.0 / (1.0 + dw * dw));
return max(vec2f(qe), vec2f(tp, dw * tp));
}

fn lp(instanceIndex: i32) -> vec3f {
if (instanceIndex < 0) { return vec3f(1.0); }
return instancesBuffer[instanceIndex * ${$} + 9].xyz;
}

fn dg(
ma: ptr<function, OpenPbrResolvedMaterial>,
materialIndex: i32,
uv: vec2f,
uv1: vec2f,
instanceIndex: i32,
vertexColor: vec3f
) {
let matData = materialsBuffer[materialIndex];

(*ma).baseColor = matData.color;
(*ma).materialType = i32(matData.matType);
(*ma).specularRoughness = matData.roughness;
(*ma).baseMetalness = matData.metallic;
(*ma).specularAnisotropy = clamp(matData.anisotropy, 0.0, 1.0);
(*ma).emission = getMaterialEmission(materialIndex, uv, uv1);
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
${r}

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

let diffuse = sampleMap(
diffuseMapIndex, getMapUvSet(diffuseMapIndex, uv, uv1)
);


(*ma).baseColor *= decodeMapColor(diffuseMapIndex, diffuse.rgb);


if (matData.mapAlphaUsage == ${Pt.transmission}) {
(*ma).transmissionWeight = 1.0 - diffuse.a;
}
else if (matData.mapAlphaUsage == ${Pt.alpha}) {
(*ma).alpha *= diffuse.a;
}
}
}

${Ve("alphaMap","wgsl")}

${n}

${Ve("transmissionMap","wgsl")}

if (USE_METALLIC_ROUGHNESS_MAPS) {

let mrtMapIndex = i32(matData.mrtMapIndex);
if (mrtMapIndex >= 0) {
let gc = sampleMap(
mrtMapIndex, getMapUvSet(mrtMapIndex, uv, uv1)
);
(*ma).baseMetalness *= gc.b;
(*ma).specularRoughness *= gc.g;
}
}

${Ve("roughnessMap","wgsl")}

${Ve("metalnessMap","wgsl")}

${Ur("wgsl")}

${Ve("coatWeightMap","wgsl")}

${e?`

(*ma).coatNormalEnabled = (*ma).coatWeight > 0.0 && (matData.normalMapIndex >= 0.0 || matData.coatNormalMapIndex >= 0.0);
`:""}

${Ve("coatRoughnessMap","wgsl")}

${Ve("fuzzColorMap","wgsl")}

${Ve("fuzzRoughnessMap","wgsl")}

${Ve("specularWeightMap","wgsl")}

${Ve("specularColorMap","wgsl")}

${i?`
(*ma).anisotropyDirection = vec2f(1.0, 0.0);
(*ma).anisotropyDirectionEnabled = matData.specularAnisotropyRotation != 0.0;
(*ma).coatAnisotropyRotation = matData.coatAnisotropyRotation;
if (USE_ANISOTROPY_MAPS && matData.anisotropyMapIndex >= 0.0) {
let index = i32(matData.anisotropyMapIndex);
let dk = sampleMap(index, getMapUvSet(index, uv, uv1));
(*ma).specularAnisotropy *= dk.b;
let direction = dk.rg * 2.0 - 1.0;
if (dot(direction, direction) > 1e-4) { (*ma).anisotropyDirection = normalize(direction); }
(*ma).anisotropyDirectionEnabled = true;
}
if (matData.specularAnisotropyModel > 0.5 && (*ma).specularAnisotropy > 0.0) {
let tU = fv(clamp((*ma).specularRoughness, 0.0, 1.0), (*ma).specularAnisotropy);
(*ma).specularRoughness = tU.x;
(*ma).specularAnisotropy = tU.y;
}
if ((*ma).anisotropyDirectionEnabled) {
let theta = matData.specularAnisotropyRotation;
let d = (*ma).anisotropyDirection;
(*ma).anisotropyDirection = vec2f(cos(theta)*d.x - sin(theta)*d.y, sin(theta)*d.x + cos(theta)*d.y);
}

`:""}


if ((*ma).coatWeight > 0.0 && (*ma).coatRoughness > 0.0) {
let ih = (*ma).specularRoughness * (*ma).specularRoughness;
let ij = (*ma).coatRoughness * (*ma).coatRoughness;
(*ma).specularRoughness = mix((*ma).specularRoughness,
pow(min(1.0, ih * ih + 2.0 * ij * ij), 0.25), (*ma).coatWeight);
}
${A?"":"(*ma).transmissionWeight = 0.0;"}
${a?"":"(*ma).baseMetalness = 0.0;"}
let color = lp(instanceIndex) * vertexColor;
(*ma).baseColor *= color;
if ((*ma).materialType == UNLIT) { (*ma).emission *= color; }

(*ma).specularRoughness = clamp((*ma).specularRoughness, ROUGHNESS_MIN, 1.0);
(*ma).baseMetalness = clamp((*ma).baseMetalness, 0.0, 1.0);
let specularAlpha = aN((*ma).specularRoughness, (*ma).specularAnisotropy);
(*ma).alphaX = specularAlpha.x;
(*ma).alphaY = specularAlpha.y;
}

fn pd(materialIndex: i32, uv: vec2f, normal: vec3f, dp1: vec3f, dp2: vec3f, oW: vec2f, oX: vec2f) -> vec3f {
let matData = materialsBuffer[materialIndex];
let normalMapIndex = i32(matData.normalMapIndex);
if (normalMapIndex >= 0) {



let sb = cross(dp2, normal);
let sa = cross(normal, dp1);
var dpdu = sb * oW.x + sa * oX.x;
var tH = sb * oW.y + sa * oX.y;
let ej = max(dot(dpdu, dpdu), dot(tH, tH));
if (ej > 1e-12) {
let tO = inverseSqrt(ej);
dpdu *= tO;
tH *= tO;
}
else {


let oo = select(
vec3f(0.0, 1.0, 0.0),
vec3f(0.0, 0.0, 1.0),
abs(normal.z) < 0.999
);
dpdu = normalize(cross(oo, normal));
tH = cross(normal, dpdu);
}

var n = 2.0 * sampleMap(normalMapIndex, uv).rgb - 1.0;
n = normalize(vec3(n.xy * matData.normalMapScale, n.z));

let tbn = mat3x3(dpdu, tH, normal);

return normalize(tbn * n);
} else {
return normal;
}
}
`}var i_=Fo();var om=`


struct kc {
barycentric: vec3f,
t: f32,
normal: vec3f,

}

fn wO(
uu: f32,
vA: vec3f, vB: vec3f,
eAC: vec3f, eBD: vec3f,
je: vec3f,
qT: f32,
qV: ptr<function, f32>
) -> bool {
if (uu >= 0.0 && uu <= 1.0) {
let pAB = mix(vA, vB, uu);
let pCD = mix(eAC, eBD, uu);
var n = cross(je, pCD);
let xf = 1.0 / dot(n, n);
n = cross(n, pAB);
let tt = dot(n, pCD) * xf;
let vv = dot(n, je) * xf;
if (vv >= 0.0 && vv <= 1.0 && tt > qT && tt < *qV) {
*qV = tt;
return true;
}
}
return false;
}

fn hx(
qF: vec3f, je: vec3f, qT: f32, uM: f32,
pA: vec3f, pB: vec3f, pC: vec3f, pD: vec3f,
qV: ptr<function, f32>
) -> bool {
let eAB = pB - pA;
let eAC = pC - pA;
let eBD = pD - pB;
let eCD = pD - pC;
let vA = pA - qF;
let vB = pB - qF;

var u1: f32;
var u2: f32;
{
let qN = cross(eAB, -eCD);
let a = dot(qN, je);
var b = dot(cross(vB, je), eBD);
let c = dot(cross(vA, je), eAC);
b -= a + c;

let det = b * b - 4.0 * a * c;
if (det < 0.0) {
return false;
}

if (a == 0.0) {
u1 = -c / b;
u2 = -1.0;
} else {
let xF = sqrt(det);
let yo = -0.5 * (b + sign(b) * xF);
u1 = yo / a;
u2 = c / yo;
}
}

*qV = uM;

var hit = false;

hit = wO(u1, vA, vB, eAC, eBD, je, qT, qV) || 
wO(u2, vA, vB, eAC, eBD, je, qT, qV);
if (!hit) {
return false;
}

return true;
}

fn tM(
qF: vec3f, je: vec3f, qT: f32, uM: f32,
pA: vec3f, pB: vec3f, pC: vec3f,
pD: vec3f, pE: vec3f, pF: vec3f,

bX: ptr<function, f32>,
bW: ptr<function, f32>
) -> bool {
*bX = INF;
*bW = -INF;

let xV = maxDimension(abs(je));
let gY = nk(je, xV);
var tt: f32;

tt = ga(
qF, je,
fP(pC, pB, pA), xV, gY, INF
).t;
if (tt > 0.0) {
*bX = min(*bX, tt);
*bW = max(*bW, tt);
}
tt = ga(
qF, je,
fP(pD, pE, pF), xV, gY, INF
).t;
if (tt > 0.0) {
*bX = min(*bX, tt);
*bW = max(*bW, tt);
}
if (hx(
qF, je, -INF, INF,
pA, pB, pD, pE,
&tt)) {
*bX = min(*bX, tt);
*bW = max(*bW, tt);
}
if (hx(
qF, je, -INF, INF,
pB, pC, pE, pF,
&tt)) {
*bX = min(*bX, tt);
*bW = max(*bW, tt);
}
if (hx(
qF, je, -INF, INF,
pC, pA, pF, pD,
&tt)) {
*bX = min(*bX, tt);
*bW = max(*bW, tt);
}

*bX = max(*bX, qT);
*bW = min(*bW, uM);

return *bX <= *bW && *bW > 0.0;
}
`,Ff=`

${om}

fn mz(p: vec3f, p0: vec3f, p1: vec3f, p2: vec3f) -> vec3f {
let v0 = p1 - p0;
let v1 = p2 - p0;
let v2 = p - p0;

let d00 = dot(v0, v0);
let d01 = dot(v0, v1);
let d11 = dot(v1, v1);
let d20 = dot(v2, v0);
let d21 = dot(v2, v1);

let vs = 1.0 / (d00 * d11 - d01 * d01);
let v = clamp((d11 * d20 - d01 * d21) * vs, 0.0, 1.0);
let w = clamp((d00 * d21 - d01 * d20) * vs, 0.0, 1.0);
let u = 1.0 - v - w;

return vec3f(u, v, w);
}



fn pY(
rs: vec3f, rS: vec3f, yt: f32,
_pA: vec3f, _pB: vec3f, _pC: vec3f,
_nA: vec3f, _nB: vec3f, _nC: vec3f,
xm: vec2f, xn: vec2f, xo: vec2f,

ku: i32,
xl: vec2f,

yd: f32, yc: f32,
hScale: f32,
wk: f32,
vH: f32,
uvProjection: i32,
uvScale: vec2f,
xM: bool,
sk: bool
) -> kc {



let DT = select(max(abs(hScale) / 32.0, 1e-12), vH, vH > 0.0);
let dt = DT / length(rS);
let dbx = 0.001;
let dby = 0.001;

var result: kc;
result.t = INF;

var bX = INF;
var bW = -INF;

let sg = sign(hScale);
let wC = abs(hScale);

let uC = sg * normalize(cross(_pB - _pA, _pC - _pA));


let dA = dot(_nA, uC);
let dB = dot(_nB, uC);
let dC = dot(_nC, uC);

var minH = yd * hScale * min(min(dA, dB), dC);
var maxH = yc * hScale * max(max(dA, dB), dC);




let vC = abs(maxH) - abs(minH);


minH = sign(minH) * max(abs(minH) - DT * 2.0, 0.0);
if (vC < DT * 2.0) {
maxH = sign(maxH) * min(abs(maxH) + DT * 2.0, abs(hScale));
}

let pA = _pA + _nA * minH / dA;
let pB = _pB + _nB * minH / dB;
let pC = _pC + _nC * minH / dC;

let pD = _pA + _nA * maxH / dA;
let pE = _pB + _nB * maxH / dB;
let pF = _pC + _nC * maxH / dC;

if (!tM(
rs, rS, 0.0, INF,
pA, pB, pC,
pD, pE, pF,

&bX, &bW
)) {
return result;
}

var yp = false;

if (bW == bX) {
bX = 0.0;
}

var t = bX + dt * eC(2u);
var s = rs + rS * t;
var vq = dot(s - _pA, uC);
var wV = select(0.0, INF, sg < 0.0);

var c0 = _pA + _nA * vq / dA;
var c1 = _pB + _nB * vq / dB;
var c2 = _pC + _nC * vq / dC;

var uV: vec3f;

vq = abs(vq);

var sf = vq - wV;
var qU = sf;
var step = 0;

while (true) {

let b = mz(s, c0, c1, c2);

uV = _pA * b.x + _pB * b.y + _pC * b.z;

vq = distance(uV, s);

var uv: vec2f;
if (uvProjection > 0) {
let n = normalize(_nA * b.x + _nB * b.y + _nC * b.z);
uv = gU(uvProjection, uV - (_nA * b.x + _nB * b.y + _nC * b.z) * wk, n) * uvScale;
}
else {
uv = xm * b.x + xn * b.y + xo * b.z;
}
let h = sampleMap(ku, uv).x;

wV = max(wC * h, DT);


let dh = dot(uC, s - c0);
c0 = c0 + _nA * dh / dA;
c1 = c1 + _nB * dh / dB;
c2 = c2 + _nC * dh / dC;

qU = sf;
sf = vq - wV;

if (!(select(sf * sg, sf * qU, sk) > 0.0
&& t < bW + dt) 

&& step > 0) {
break;
}

step++;
t = t + dt;
s = s + rS * dt;
}

if (select(sf * sg, sf * qU, sk) <= 0.0) {
let dtt = dt * (abs(sf) / (abs(qU) + abs(sf) + EPS));
t = t - dtt;

let yr = rs + rS * t;
let b = mz(yr, c0, c1, c2);

let N = normalize(_nA * b.x + _nB * b.y + _nC * b.z);

let p_a = _pA * b.x + _pB * b.y + _pC * b.z;
let p_b = _pA * (b.x + dbx) + _pB * b.y + _pC * (b.z - dbx);
let p_c = _pA * b.x + _pB * (b.y + dby) + _pC * (b.z - dby);

var xX: vec2f;
var xY: vec2f;
var xZ: vec2f;

if (uvProjection > 0) {
let NA = normalize(_nA * b.x + _nB * b.y + _nC * b.z);
let NB = normalize(_nA * (b.x + dbx) + _nB * b.y + _nC * (b.z - dbx));
let NC = normalize(_nA * b.x + _nB * (b.y + dby) + _nC * (b.z - dby));  
xX = gU(uvProjection, p_a - (_nA * b.x + _nB * b.y + _nC * b.z) * wk, NA) * uvScale;
xY = gU(uvProjection, p_b - (_nA * (b.x + dbx) + _nB * b.y + _nC * (b.z - dbx)) * wk, NB) * uvScale;
xZ = gU(uvProjection, p_c - (_nA * b.x + _nB * (b.y + dby) + _nC * (b.z - dby)) * wk, NC) * uvScale;
}
else {
xX = xm * b.x + xn * b.y + xo * b.z;
xY = xm * (b.x + dbx) + xn * b.y + xo * (b.z - dbx);
xZ = xm * b.x + xn * (b.y + dby) + xo * (b.z - dby);
}

let s_a = p_a + sg * N * sampleMap(ku, xX).x * hScale;
let s_b = p_b + sg * N * sampleMap(ku, xY).x * hScale;
let s_c = p_c + sg * N * sampleMap(ku, xZ).x * hScale;

let N_s = -sg * normalize(cross(s_c - s_a, s_b - s_a));

result.t = t;
result.barycentric = b;
result.normal = normalize(N_s - uC + sg * N);
}

return result;

}
`;function No(i=!0){return`
fn oC(
qq: i32,
index: vec3i,
aC: vec3f,
fi: vec3f,
eL: vec3f
) -> bool {
var materialIndex = qq;
let m0 = vec3i(attrBuffers[index.x * ATTR_STRIDE + MATERIALINDEX_OFF]${i?".xyz":""});
let m1 = vec3i(attrBuffers[index.y * ATTR_STRIDE + MATERIALINDEX_OFF]${i?".xyz":""});
let m2 = vec3i(attrBuffers[index.z * ATTR_STRIDE + MATERIALINDEX_OFF]${i?".xyz":""});

if (m0.x > 0 || m1.x > 0 || m2.x > 0) {
materialIndex = fF(m0, m1, m2, aC);
}

let ma = materialsBuffer[materialIndex];
var alpha = ma.alpha;
if (USE_DIFFUSE_MAPS &&
ma.mapAlphaUsage == ${Pt.alpha}) {
let diffuseMapIndex = i32(ma.diffuseMapIndex);
if (diffuseMapIndex >= 0) {
let uvProjection = i32(ma.uvProjection);
let uv0 = attrBuffers[index.x * ATTR_STRIDE + UV_OFF].xy;
let uv1 = attrBuffers[index.y * ATTR_STRIDE + UV_OFF].xy;
let uv2 = attrBuffers[index.z * ATTR_STRIDE + UV_OFF].xy;
var uv = aC.x * uv0 +
aC.y * uv1 + aC.z * uv2;
if (uvProjection > 0) {
uv = gU(uvProjection, fi, eL);
}
uv *= ma.uvScale;
if (uvProjection == ${ot.triplanar}) {
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
var uv = aC.x * uv0 +
aC.y * uv1 + aC.z * uv2;
if (uvProjection > 0) {
uv = gU(uvProjection, fi, eL);
}
uv *= ma.uvScale;
if (uvProjection == ${ot.triplanar}) {
uv = fract(uv);
}
alpha *= sampleMap(alphaMapIndex, uv).g;
}
}

let alphaMode = i32(ma.alphaMode);
if (alphaMode == ${It.opaque}) {
alpha = 1.0;
}
else if (alphaMode == ${It.mask}) {
alpha = select(0.0, 1.0, alpha >= ma.alphaCutoff);
}
if (alphaMode == ${It.blend}) {
return eC(1u) <= alpha;
}
return alpha >= 1.0;
}
`}var o_=No();var lm=Ff,Nf=function(){return`
let hit = ga(o, d, tri, eq, gY, tMax);
if (hit.t > 0.0) {
let e1 = tri.p1 - tri.p0;
let e2 = tri.p2 - tri.p0;
eL = normalize(cross(e1, e2));
let kP = i32(ah(bitcast<i32>(pi.z)).x);
let jd = materialsBuffer[kP].doubleSided > 0.5;
if (!doubleSided && !jd && dot(eL, d) > 0.0) {
eL = vec3f(0.0);
continue;
}

tMax = hit.t;
sj = true;
pl = true;
fi = o + tMax * d;
aC = hit.barycentric;
}
`};function cm(i){return`
let lH = pY(
o, d, tMax,
tri.p0, tri.p1, tri.p2,
n0, n1, n2,
uv0, uv1, uv2,
displacementMapIndex,
jO(displacementMapIndex),
minH, maxH,
hScale,
matData.displacementBias,
matData.displacementStepSize,
i32(matData.displacementUvProjection),
displacementUvProjectionScale,
${i?"true":"false"},
jA
);
`}var fm=function(i,e){return`

let hScale = pi.w;
let uQ = bitcast<i32>(r3.w);

let materialIndex = i32(ah(bitcast<i32>(pi.z)).x);
let matData = materialsBuffer[materialIndex];
let n0 = normalize(attrBuffers[index.x * ATTR_STRIDE + NORMAL_OFF]${e?".xyz":""});
let n1 = normalize(attrBuffers[index.y * ATTR_STRIDE + NORMAL_OFF]${e?".xyz":""});
let n2 = normalize(attrBuffers[index.z * ATTR_STRIDE + NORMAL_OFF]${e?".xyz":""});
if (matData.displacementMapIndex >= 0.0 && matData.displacementBias != 0.0) {
tri.p0 += n0 * matData.displacementBias;
tri.p1 += n1 * matData.displacementBias;
tri.p2 += n2 * matData.displacementBias;
}
if (abs(hScale) > 0.0 && uQ > 0) {
let minH = f32(uQ >> 8) / 255.0;
let maxH = f32(uQ & 0xff) / 255.0;
let displacementUvProjectionScale = vec2f(matData.displacementUvProjectionScale);
let displacementMapIndex = i32(matData.displacementMapIndex);


var uv0 = attrBuffers[index.x * ATTR_STRIDE + UV_OFF].xy;
var uv1 = attrBuffers[index.y * ATTR_STRIDE + UV_OFF].xy;
var uv2 = attrBuffers[index.z * ATTR_STRIDE + UV_OFF].xy;

${cm(i)}

if (lH.t < tMax) {
eL = lH.normal;


tMax = lH.t;

aC = lH.barycentric;
fi = o + tMax * d;

bZ = true;
sj = true;
pl = true;
}
}
else {
${Nf()}
}
`},um=`
fn bA(value: u32) -> vec4f {
return vec4f(
f32(value & 0xffu),
f32((value >> 8u) & 0xffu),
f32((value >> 16u) & 0xffu),
f32(value >> 24u)
);
}







fn lb(value: u32) -> u32 {
return (bitcast<u32>(f32(value)) >> 23u) - 127u;
}

fn oT(value: u32) -> u32 {
return (bitcast<u32>(f32(value)) >> 23u) - 127u;
}

fn pj(
node: i32,
uJ: i32,
n0: vec4f,
o: vec3f,
gr: vec3f,
tMax: f32
) -> u32 {
let i = node + uJ;
let n2 = bvhBuffer[i + 2];
let n3 = bvhBuffer[i + 3];
let n4 = bvhBuffer[i + 4];
let header = bitcast<u32>(n0.w);
let sH = bitcast<i32>((header & 0xffu) << 24u) >> 24;
let sI = bitcast<i32>(((header >> 8u) & 0xffu) << 24u) >> 24;
let sJ = bitcast<i32>(((header >> 16u) & 0xffu) << 24u) >> 24;
let hZ = vec3f(
bitcast<f32>(u32(sH + 127) << 23u),
bitcast<f32>(u32(sI + 127) << 23u),
bitcast<f32>(u32(sJ + 127) << 23u)
);
let padding = fk(gr, o);
let eS = (n0.xyz - o) * gr;
let dq = hZ * gr;



let vc = bitcast<vec4u>(n2);
let vd = bitcast<vec4u>(n3);
let ve = bitcast<vec4u>(n4);
let negative = gr < vec3f(0.0);
let wn = select(vc.xy, vd.zw, negative.x);
let xt = select(vd.zw, vc.xy, negative.x);
let wo = select(vc.zw, ve.xy, negative.y);
let xu = select(ve.xy, vc.zw, negative.y);
let wp = select(vd.xy, ve.zw, negative.z);
let xv = select(ve.zw, vd.xy, negative.z);

let yl = max(
max(
bA(wn.x) * dq.x + eS.x - vec4f(padding.x),
bA(wo.x) * dq.y + eS.y - vec4f(padding.y)
),
bA(wp.x) * dq.z + eS.z - vec4f(padding.z)
);
let yg = min(
min(
bA(xt.x) * dq.x + eS.x + vec4f(padding.x),
bA(xu.x) * dq.y + eS.y + vec4f(padding.y)
),
bA(xv.x) * dq.z + eS.z + vec4f(padding.z)
);
let ym = max(
max(
bA(wn.y) * dq.x + eS.x - vec4f(padding.x),
bA(wo.y) * dq.y + eS.y - vec4f(padding.y)
),
bA(wp.y) * dq.z + eS.z - vec4f(padding.z)
);
let yh = min(
min(
bA(xt.y) * dq.x + eS.x + vec4f(padding.x),
bA(xu.y) * dq.y + eS.y + vec4f(padding.y)
),
bA(xv.y) * dq.z + eS.z + vec4f(padding.z)
);

let wl = (yl <= min(yg, vec4f(tMax))) & (yg > vec4f(0.0));
let wm = (ym <= min(yh, vec4f(tMax))) & (yh > vec4f(0.0));
return select(0u, 1u, wl.x)
| select(0u, 2u, wl.y)
| select(0u, 4u, wl.z)
| select(0u, 8u, wl.w)
| select(0u, 16u, wm.x)
| select(0u, 32u, wm.y)
| select(0u, 64u, wm.z)
| select(0u, 128u, wm.w);
}

`;function zo(i,e,t,A,a,r=""){let n=`
let pi = instancesBuffer[bY * ${$}];
let vertexOffset = vec3i(bitcast<i32>(pi.y));
for (var k = 0; k < primitiveCount; k++) {
let triangleIndex = primitiveOffset + k;
${r}
if (bounces > 0 && triangleIndex == fV) {
continue;
}

let r3 = bvhBuffer[triangleIndex];
let index = bitcast<vec3i>(r3.xyz) + vertexOffset;
var tri = fP(
attrBuffers[index.x * ATTR_STRIDE + POSITION_OFF]${a?".xyz":""},
attrBuffers[index.y * ATTR_STRIDE + POSITION_OFF]${a?".xyz":""},
attrBuffers[index.z * ATTR_STRIDE + POSITION_OFF]${a?".xyz":""}
);
var pl = false;

${e?fm(t,a):Nf()}
if (pl) {
${i}
}
}
`;return`
var d = ray.d;
var o = ray.o;
var jE = -1;
var gr = fo(d);
var bZ = false;
var sj = false;
var fi: vec3f;
var eL: vec3f;
var aC: vec3f;


if (cU(o, bvhBuffer[0].xyz, bvhBuffer[1].xyz, gr, tMax) > 0.0) {
jE = 0;
mK[0] = 0;
}
while (jE >= 0) {
let ul = mK[jE];
jE--;
o = ray.o;
d = ray.d;
gr = fo(d);

let xW = bvhBuffer[ul];
let ff = bitcast<i32>(xW.w);
if (ff >= 0) {
let left = ul + 2;
let right = ff;
let d0 = cU(
o,
bvhBuffer[left].xyz,
bvhBuffer[left + 1].xyz,
gr,
tMax
);
let d1 = cU(
o,
bvhBuffer[right].xyz,
bvhBuffer[right + 1].xyz,
gr,
tMax
);

if (d0 > d1) {
if (d0 > 0.0) { jE++; mK[jE] = left; }
if (d1 > 0.0) { jE++; mK[jE] = right; }
}
else {
if (d1 > 0.0) { jE++; mK[jE] = right; }
if (d0 > 0.0) { jE++; mK[jE] = left; }
}
}
else {
let rQ = -ff;


for (
var nq = rQ - 1;
nq >= 0;
nq--
) {
let qv = bvhBuffer[ul + 2 + nq];
let bY = bitcast<i32>(qv.x);
let wL = bitcast<i32>(qv.y);
let pi = instancesBuffer[bY * ${$}];
let w2l = mat4x4<f32>(
instancesBuffer[bY * ${$} + 1],
instancesBuffer[bY * ${$} + 2],
instancesBuffer[bY * ${$} + 3],
instancesBuffer[bY * ${$} + 4]
);
o = (w2l * vec4f(ray.o, 1.0)).xyz;
d = (w2l * vec4f(ray.d, 0.0)).xyz;
gr = fo(d);
eq = maxDimension(abs(d));
gY = nk(d, eq);

let fY = bitcast<u32>(pi.x);
let he = fY >> 30u;
let blasOffset = i32(fY & 0x3fffffffu);
let bw = rtUniform.blasOffset;

${(A&8)!==0?`
if (he == 3u) {




var qj = -1;
var td = 0u;
var lJ = 0u;

var eD = 0x80000000u;
let vU = select(0u, 4u, d.x < 0.0)
| select(0u, 2u, d.y < 0.0)
| select(0u, 1u, d.z < 0.0);
let rn = 7u - vU;




while (td < 4096u) {
td++;

let internalMask = eD & 0xffu;
let ri =
lb(eD >> 24u) + 24u;
eD &= ~(1u << ri);
if ((eD & 0xff000000u) != 0u) {
qj++;

tD[qj] = vec2u(lJ, eD);
}

let slot = (ri - 24u) ^ rn;
let om = (1u << slot) - 1u;
let relativeIndex = countOneBits(internalMask & om);
let tA = lJ + relativeIndex;
let node = blasOffset + i32(tA * 5u);
let jZ = bvhBuffer[node + bw];
let vG = pj(
node, bw, jZ, o, gr, tMax
);


eD = 0u;
if (vG != 0u) {
let fU = bvhBuffer[node + bw + 1];
let sP = bitcast<u32>(jZ.w) >> 24u;
var uO = 0u;
var kM = vG;
while (kM != 0u) {
let sC = lb(kM);
kM &= ~(1u << sC);
let tT = select(
bitcast<u32>(fU.z),
bitcast<u32>(fU.w),
sC >= 4u
);
let uB =
(tT >> ((sC & 3u) * 8u)) & 0xffu;
let kb = uB & 0x1fu;
let wK = select(
kb,
kb ^ rn,
kb >= 24u
);
let wt = (uB >> 5u) & 0x7u;
uO |= wt << wK;
}

lJ = bitcast<u32>(fU.x);
eD = (uO & 0xff000000u) | sP;
let pM = bitcast<u32>(fU.y);
var pN = uO & 0x00ffffffu;
while (pN != 0u) {
let oO = oT(pN);
pN &= ~(1u << oO);
let primitiveCount = 1;
let primitiveOffset = bw + blasOffset
+ i32(pM + oO);
${n}
}
}

if ((eD & 0xff000000u) != 0u) { continue; }
if (qj >= 0) {
let ro = tD[qj];
lJ = ro.x;
eD = ro.y;
qj--;
}
else { break; }
}
}
`:""}

var eh = -1;
if (he != 3u) {
eh = 0;

gJ[0] = wL;
}

while (eh >= 0) {

let node = gJ[eh];
eh--;
var primitiveCount = 0;
var primitiveOffset = 0;

${(A&4)!==0?`
if (he == 2u) {
let i = node + bw;
let wP = bvhBuffer[i];
let wQ = bvhBuffer[i + 1];
let wR = bvhBuffer[i + 2];
let wS = bvhBuffer[i + 3];
primitiveCount = i32(bitcast<u32>(wR.w));
if (primitiveCount > 0) {
primitiveOffset = bw + blasOffset
+ i32(bitcast<u32>(wS.w));
}
else {
let left = blasOffset + i32(bitcast<u32>(wP.w) * 4u);
let right = blasOffset + i32(bitcast<u32>(wQ.w) * 4u);
let pm = cU(
o, wP.xyz, wQ.xyz, gr, tMax
);
let oq = cU(
o, wR.xyz, wS.xyz, gr, tMax
);
if (pm > oq) {
if (pm > 0.0) {
eh++; gJ[eh] = left;
}
if (oq > 0.0) {
eh++; gJ[eh] = right;
}
}
else {
if (oq > 0.0) {
eh++; gJ[eh] = right;
}
if (pm > 0.0) {
eh++; gJ[eh] = left;
}
}
}
}
`:""}
${(A&2)!==0?`
if (he == 1u) {
let iw = bitcast<u32>(node);
if ((iw & 0x80000000u) != 0u) {
primitiveCount = i32((iw >> 23u) & 0xffu);
primitiveOffset = bw + blasOffset
+ i32(iw & 0x007fffffu);
}
else {
let i = node + bw;
let vJ = bvhBuffer[i];
let sz = bvhBuffer[i + 1];
let qR = bvhBuffer[i + 2];
let oQ = bvhBuffer[i + 3];
let nodeMin = vJ.xyz;
let er = vec3f(vJ.w, sz.x, sz.y);
let mT = array<u32, 4>(
bitcast<u32>(sz.z), bitcast<u32>(sz.w),
bitcast<u32>(qR.x), bitcast<u32>(qR.y)
);


let negative = gr < vec3f(0.0);
let wn = unpack4x8unorm(bitcast<u32>(select(qR.z, oQ.y, negative.x)));
let xt = unpack4x8unorm(bitcast<u32>(select(oQ.y, qR.z, negative.x)));
let wo = unpack4x8unorm(bitcast<u32>(select(qR.w, oQ.z, negative.y)));
let xu = unpack4x8unorm(bitcast<u32>(select(oQ.z, qR.w, negative.y)));
let wp = unpack4x8unorm(bitcast<u32>(select(oQ.x, oQ.w, negative.z)));
let xv = unpack4x8unorm(bitcast<u32>(select(oQ.w, oQ.x, negative.z)));
let padding = fk(gr, o);
let nJ = max(
max(
(nodeMin.x + wn * er.x - o.x) * gr.x - vec4f(padding.x),
(nodeMin.y + wo * er.y - o.y) * gr.y - vec4f(padding.y)
),
(nodeMin.z + wp * er.z - o.z) * gr.z - vec4f(padding.z)
);
let sY = min(
min(
(nodeMin.x + xt * er.x - o.x) * gr.x + vec4f(padding.x),
(nodeMin.y + xu * er.y - o.y) * gr.y + vec4f(padding.y)
),
(nodeMin.z + xv * er.z - o.z) * gr.z + vec4f(padding.z)
);
var distance = select(sY, nJ, nJ > vec4f(0.0));
distance = select(
distance,
vec4f(-1.0),
nJ > min(sY, vec4f(tMax))
);
var fq = array<f32, 4>(
distance.x,
distance.y,
distance.z,
distance.w
);


for (var order = 0; order < 4; order++) {
var em = -1.0;
var eB = -1;
for (var child = 0; child < 4; child++) {
if (
mT[child] != 0u &&
fq[child] > em
) {
em = fq[child];
eB = child;
}
}
if (eB >= 0 && em > 0.0) {
let oy = mT[eB];
var ki = bitcast<i32>(oy);
if ((oy & 0x80000000u) == 0u) {
ki += blasOffset;
}
eh++;
gJ[eh] = ki;
fq[eB] = -1.0;
}
}
}
}
`:""}
${(A&1)!==0?`
if (he == 0u) {
let i = node + bw;
let r1 = bvhBuffer[i];
let bl = bitcast<i32>(r1.w);

if (bl >= 0) {
let left = node + 2;
let right = bl + blasOffset;
let d0 = cU(
o,
bvhBuffer[left + bw].xyz,
bvhBuffer[left + 1 + bw].xyz,
gr,
tMax
);
let d1 = cU(
o,
bvhBuffer[right + bw].xyz,
bvhBuffer[right + 1 + bw].xyz,
gr,
tMax
);

if (d0 > d1) {
if (d0 > 0.0) {
eh++; gJ[eh] = left;

}
if (d1 > 0.0) {
eh++; gJ[eh] = right;

}
}
else {
if (d1 > 0.0) {
eh++; gJ[eh] = right;

}
if (d0 > 0.0) {
eh++; gJ[eh] = left;

}
}
}
else {
primitiveCount = -bl;
primitiveOffset = i + 2;
}
}
`:""}
if (primitiveCount > 0) {
${n}
}
}
}
}
}

`}function dm({hasDisplacement:i,hasAnisotropyDirections:e=!0,hasCoatNormals:t=!1,blasLayoutMask:A=1,closestName:a="intersectScene",shadowName:r="intersectSceneShadow",bevelName:n="intersectSceneBevel",closestHitHook:s=""}){return`
fn ${a}(ray: Ray, si: ptr<function, SurfaceInteraction>, bounces: i32, doubleSided: bool, jA: bool) {

(*si).hit = false;

if (rtUniform.isEmpty > 0) {
return;
}

var tMax = RAY_MAX_DISTANCE;
var eq: i32;
var gY: vec3f;

var hK: vec3i;
var mk: fP;
var ap: i32;
var fV: i32 = (*si).triangleIndex;

${zo(`
(*si).triangleIndex = triangleIndex;
mk = tri;
hK = index;
ap = bY;
`,i,!1,A,e)}

${s}  if (sj) {
mV(
si,
mk,
aC,
hK,
bZ,
ap,
eL,
fi,
-1
);
}
}


fn ${n}(ray: Ray, si: ptr<function, SurfaceInteraction>, instanceIndex: i32, maxDistance: f32) {
(*si).hit = false;

if (rtUniform.isEmpty > 0) {
return;
}

let bounces = 0;
let doubleSided = true;
let jA = false;
var tMax = maxDistance;
var eq: i32;
var gY: vec3f;
var hK: vec3i;
var mk: fP;
var ap: i32;
var fV: i32 = -1;

${zo(`
(*si).triangleIndex = triangleIndex;
mk = tri;
hK = index;
ap = bY;
`,i,!1,A,e,`
if (bY != instanceIndex) {
continue;
}
`)}

if (sj) {
(*si).instanceIndex = ap;
(*si).normal = eL;
(*si).position = fi;
(*si).materialIndex = i32(ah(bitcast<i32>(instancesBuffer[ap * ${$}].z)).x);
hH(
si,
mk,
aC,
hK,
bZ,
-1
);

let l2w = mat4x4<f32>(
instancesBuffer[ap * ${$} + 5],
instancesBuffer[ap * ${$} + 6],
instancesBuffer[ap * ${$} + 7],
instancesBuffer[ap * ${$} + 8]
);
let w2l = mat4x4<f32>(
instancesBuffer[ap * ${$} + 1],
instancesBuffer[ap * ${$} + 2],
instancesBuffer[ap * ${$} + 3],
instancesBuffer[ap * ${$} + 4]
);
let aH = transpose(mat3x3<f32>(
w2l[0].xyz,
w2l[1].xyz,
w2l[2].xyz
));
(*si).faceNormal = normalize(aH * eL);
(*si).vertexNormal = normalize(aH * (*si).vertexNormal);
(*si).normal = normalize(aH * (*si).normal);
${t?"  (*si).coatNormal = normalize(aH * (*si).coatNormal);":""}
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

fn ${r}(ray: Ray, lightDistance: f32, kn: i32) -> bool {
if (rtUniform.isEmpty > 0) {
return false;
}

let doubleSided = true;
let rq = min(max(lightDistance, 0.0), RAY_MAX_DISTANCE);
var tMax = rq;
var eq: i32;
var gY: vec3f;

let bounces = 1;
var jA = false;
var fV: i32 = kn;

${zo(`



var jS = true;

if (jS) {
if (HAS_ALPHA) {
let materialIndex = i32(ah(bitcast<i32>(pi.z)).x);
if (!oC(
materialIndex,
index,
aC,
fi,
eL
)) {

tMax = rq;
jS = false;
}
}
}
if (jS) {
return true;
}
`,i,!0,A,e)}

return false;
}

`}function ko({hasDisplacement:i,hasAnisotropyDirections:e=!0,hasCoatNormals:t=!1,blasLayoutMask:A=1,sceneIntersections:a=""}){return`





var<private> mK: array<i32, TLAS_STACK_SIZE>;
var<private> gJ: array<i32, BLAS_STACK_SIZE>;
${(A&8)!==0?"var<private> tD: array<vec2u, BLAS_STACK_SIZE>;":""}

${i?lm:""}
${(A&8)!==0?um:""}

struct fP {
p0: vec3f,
p1: vec3f,
p2: vec3f,
};

fn hL(rad: f32, pos: vec3f, r: Ray) -> f32 {
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

fn og(pos: vec3f, u: vec3f, v: vec3f, n: vec3f, r: Ray) -> f32 {
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
let ak = distance(origin, center);
if (ak <= radius) { return INV4PI; }
let jV = min(1.0, radius * radius / (ak * ak));
let cosThetaMax = sqrt(max(0.0, 1.0 - jV));
return 1.0 / max(TWOPI * (1.0 - cosThetaMax), 1e-8);
}

fn nr(r: Ray, light: Light, lightSample: ptr<function, LightSampleRec>) -> f32 {


var d: f32 = INF;
(*lightSample).direction = r.d;
(*lightSample).normal = -r.d;
(*lightSample).dist = INF;
(*lightSample).pdf = 0.0;
(*lightSample).emission = vec3f(0.0);
(*lightSample).isDelta = false;
var u = light.u;
var v = light.v;
var ec = i32(light.litType);

if (HAS_SCENE_RECT_LIGHT && ec == RECT_LIGHT) {

var pos = light.position - u * 0.5 - v * 0.5;
var normal = normalize(cross(u, v));
if (dot(normal, r.d) > 0.0) { 
return INF;
}

d = og(pos, u, v, normal, r);
if (d < 0.0) {
d = INF;
}
else {
var ci: f32 = dot(-r.d, normal);
let spread = light.radiusOrSpread;
if (ci >= cos(spread * PI / 2.0)) {
(*lightSample).direction = r.d;
(*lightSample).normal = normal;
(*lightSample).dist = d;
(*lightSample).pdf = (d * d) / (light.area * ci);
(*lightSample).emission = light.emission;
(*lightSample).isDelta = false;
}
else {
d = INF;
}
}
}

else if (HAS_SCENE_SPHERE_LIGHT && ec == SPHERE_LIGHT) {
if (light.radiusOrSpread <= 0.0) {
let kT = light.position - r.o;
let projection = dot(kT, r.d);
let bk = kT - projection * r.d;
if (projection <= EPS || dot(bk, bk) > 1e-8) {
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
d = hL(light.radiusOrSpread, light.position, r);
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

else if (HAS_SCENE_SPOT_LIGHT && ec == SPOT_LIGHT) {
if (light.radiusOrSpread <= 0.0) {
let kT = light.position - r.o;
let projection = dot(kT, r.d);
let bk = kT - projection * r.d;
if (projection <= EPS || dot(bk, bk) > 1e-8) {
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
d = hL(light.radiusOrSpread, light.position, r);
(*lightSample).isDelta = false;
}
if (d != INF) {
let wW = r.o + d * r.d;
let nv = bP(light, normalize(r.o - wW));
if (nv <= 0.0) { return INF; }
if (light.radiusOrSpread > 0.0) {
(*lightSample).direction = r.d;
(*lightSample).dist = d;
(*lightSample).normal = normalize(
r.o + r.d * d - light.position
);
(*lightSample).pdf = sphereSolidAnglePdf(r.o, light.position, light.radiusOrSpread);
}
(*lightSample).emission = light.emission * nv * select(
1.0,
1.0 / max(d * d, 1e-8),
light.radiusOrSpread <= 0.0
);
}
}

else if (ec != RECT_LIGHT && ec != SPHERE_LIGHT && ec != SPOT_LIGHT) {

d = INF;
}

return d;
}

fn fF(m0: vec3i, m1: vec3i, m2: vec3i, eU: vec3f) -> i32 {
let m00 = ah(m0.x);
let m01 = ah(m0.y);
let m02 = ah(m0.z);
let m10 = ah(m1.x);
let m11 = ah(m1.y);
let m12 = ah(m1.z);
let m20 = ah(m2.x);
let m21 = ah(m2.y);
let m22 = ah(m2.z);
var w00 = m00.y * eU.x;
var w01 = m01.y * eU.x;
var w02 = m02.y * eU.x;
var w10 = m10.y * eU.y;
var w11 = m11.y * eU.y;
var w12 = m12.y * eU.y;
var w20 = m20.y * eU.z;
var w21 = m21.y * eU.z;
var w22 = m22.y * eU.z;

var hy = w00 + w01 + w02 + w10 + w11 + w12 + w20 + w21 + w22;

w00 = w00 / hy;
w01 = w01 / hy + w00;
w02 = w02 / hy + w01;
w10 = w10 / hy + w02;
w11 = w11 / hy + w10;
w12 = w12 / hy + w11;
w20 = w20 / hy + w12;
w21 = w21 / hy + w20;
w22 = w22 / hy + w21;

let rand = eC(0u);
var oh: f32;
if (rand < w00) {
oh = m00.x;
} else if (rand < w01) {
oh = m01.x;
} else if (rand < w02) {
oh = m02.x;
} else if (rand < w10) {
oh = m10.x;
} else if (rand < w11) {
oh = m11.x;
} else if (rand < w12) {
oh = m12.x;
} else if (rand < w20) {
oh = m20.x;
} else if (rand < w21) {
oh = m21.x;
} else {
oh = m22.x;
}
return i32(oh);
}

fn mF(
pW: i32,
index: vec3i,
eU: vec3f
) -> i32 {
let m0 = vec3i(attrBuffers[index.x * ATTR_STRIDE + MATERIALINDEX_OFF]${e?".xyz":""});
let m1 = vec3i(attrBuffers[index.y * ATTR_STRIDE + MATERIALINDEX_OFF]${e?".xyz":""});
let m2 = vec3i(attrBuffers[index.z * ATTR_STRIDE + MATERIALINDEX_OFF]${e?".xyz":""});
if (m0.x > 0 || m1.x > 0 || m2.x > 0) {
return fF(m0, m1, m2, eU);
}
return pW;
}



${e?`
fn eP(normal: vec3f, dp1: vec3f, dp2: vec3f, oW: vec2f, oX: vec2f, input: vec4f) -> mat2x3f {
let determinant = oW.x * oX.y - oW.y * oX.x;
var t = input.xyz;
var b = vec3f(0.0);

var sign = select(input.w, 0.0, abs(input.w) > 1.5);
if (abs(determinant) > 1e-12) {
let dt = (dp1 * oX.y - dp2 * oW.y) / determinant;
let db = (dp2 * oW.x - dp1 * oX.x) / determinant;
if (dot(t, t) < 1e-8) { t = dt; }
if (sign == 0.0) { sign = select(1.0, -1.0, dot(cross(normal, dt), db) < 0.0); }
}
t -= normal * dot(normal, t);
if (dot(t, t) < 1e-8) {
let iI = select(-1.0, 1.0, normal.z >= 0.0);
let cL = -1.0 / (iI + normal.z);
let xy = normal.x * normal.y * cL;
t = vec3f(1.0 + iI * normal.x * normal.x * cL, iI * xy, -iI * normal.x);
b = vec3f(xy, iI + normal.y * normal.y * cL, -normal.y);
}
else { t = normalize(t); b = normalize(cross(normal, t)); }
return mat2x3f(t, b * select(1.0, -1.0, sign < 0.0));
}

`:""}
fn hH(
si: ptr<function, SurfaceInteraction>,
tri: fP,
eU: vec3f,
index: vec3i,
bZ: bool,
fM: i32
) {
(*si).hit = true;

let material = materialsBuffer[(*si).materialIndex];
let uvProjection = i32(material.uvProjection);

let i0 = index.x;
let i1 = index.y;
let i2 = index.z;
(*si).vertexColor = vec3f(1.0);
if (USE_VERTEX_COLOR) {
(*si).vertexColor = eU.x * attrBuffers[i0 * ATTR_STRIDE + COLOR_OFF].xyz
+ eU.y * attrBuffers[i1 * ATTR_STRIDE + COLOR_OFF].xyz
+ eU.z * attrBuffers[i2 * ATTR_STRIDE + COLOR_OFF].xyz;
}
let pU = uvProjection == ${ot.spherical};

var normal: vec3f = (*si).normal;
var hq: vec3f;
var n0 = vec3f(0.0);
var n1 = vec3f(0.0);
var n2 = vec3f(0.0);


if (!bZ || pU) {
n0 = attrBuffers[i0 * ATTR_STRIDE + NORMAL_OFF]${e?".xyz":""};
n1 = attrBuffers[i1 * ATTR_STRIDE + NORMAL_OFF]${e?".xyz":""};
n2 = attrBuffers[i2 * ATTR_STRIDE + NORMAL_OFF]${e?".xyz":""};
hq = normalize(eU.x * n0 + eU.y * n1 + eU.z * n2);
if (!bZ) {
normal = hq;
}
}

var uv: vec2f;
var uv0: vec2f;
var uv1: vec2f;
var uv2: vec2f;
var dj = vec2f(0.0);
if (USE_UV) {
uv0 = attrBuffers[i0 * ATTR_STRIDE + UV_OFF].xy;
uv1 = attrBuffers[i1 * ATTR_STRIDE + UV_OFF].xy;
uv2 = attrBuffers[i2 * ATTR_STRIDE + UV_OFF].xy;
uv = eU.x * uv0 + eU.y * uv1 + eU.z * uv2;
if (USE_UV1) {
let secondaryUv0 = attrBuffers[i0 * ATTR_STRIDE + UV1_OFF].xy;
let secondaryUv1 = attrBuffers[i1 * ATTR_STRIDE + UV1_OFF].xy;
let secondaryUv2 = attrBuffers[i2 * ATTR_STRIDE + UV1_OFF].xy;
dj = eU.x * secondaryUv0
+ eU.y * secondaryUv1
+ eU.z * secondaryUv2;
}
}

if (USE_TANGENT) {
let t0 = attrBuffers[i0 * ATTR_STRIDE + TANGENT_OFF]${e?".xyz":""};
let t1 = attrBuffers[i1 * ATTR_STRIDE + TANGENT_OFF]${e?".xyz":""};
let t2 = attrBuffers[i2 * ATTR_STRIDE + TANGENT_OFF]${e?".xyz":""};
(*si).tangent = normalize(eU.x * t0 + eU.y * t1 + eU.z * t2);
}

if (fM >= 0) {
(*si).materialIndex = fM;
}
else {
(*si).materialIndex = mF(
(*si).materialIndex,
index,
eU
);
}

if (uvProjection > 0) {

uv = gU(uvProjection, (*si).position, select(normal, hq, pU));
dj = uv;
}

uv = uv * material.uvScale;
dj = dj * material.uvScale;


if (uvProjection == ${ot.triplanar}) {
uv = fract(uv);
}

${e?`
${t?"  (*si).coatNormal = normal;":""}
let directionMaterial = materialsBuffer[(*si).materialIndex];
if (directionMaterial.anisotropyMapIndex >= 0.0 || directionMaterial.specularAnisotropyRotation != 0.0 || directionMaterial.coatAnisotropyRotation != 0.0${t?" || directionMaterial.coatWeight > 0.0":""}) {
let dp1 = tri.p0 - tri.p2;
let dp2 = tri.p1 - tri.p2;
var aX = vec4f(0.0);
if (USE_TANGENT) {
aX = eU.x * attrBuffers[i0 * ATTR_STRIDE + TANGENT_OFF]
+ eU.y * attrBuffers[i1 * ATTR_STRIDE + TANGENT_OFF]
+ eU.z * attrBuffers[i2 * ATTR_STRIDE + TANGENT_OFF];
}
let fc = eP(normal, dp1, dp2, uv0-uv2, uv1-uv2, aX);
(*si).geometryTangent = fc[0];
(*si).geometryBitangent = fc[1];
var gm = fc;
if (USE_UV1 && directionMaterial.anisotropyMapIndex >= 0.0 && mapInfo[i32(directionMaterial.anisotropyMapIndex) + NUM_MAPS * 2].x > 0.5) {
let a = attrBuffers[i0 * ATTR_STRIDE + UV1_OFF].xy;
let b = attrBuffers[i1 * ATTR_STRIDE + UV1_OFF].xy;
let c = attrBuffers[i2 * ATTR_STRIDE + UV1_OFF].xy;
gm = eP(normal, dp1, dp2, a-c, b-c, select(aX, vec4f(0.0), aX.w == 0.0));
}
(*si).directionTangent = gm[0];
(*si).directionBitangent = gm[1];
${t?`
if (USE_COAT_NORMAL_MAPS && directionMaterial.coatNormalMapIndex >= 0.0) {
let lg = i32(directionMaterial.coatNormalMapIndex);
var mU = fc;
if (USE_UV1 && mapInfo[lg + NUM_MAPS * 2].x > 0.5) {
let a = attrBuffers[i0 * ATTR_STRIDE + UV1_OFF].xy;
let b = attrBuffers[i1 * ATTR_STRIDE + UV1_OFF].xy;
let c = attrBuffers[i2 * ATTR_STRIDE + UV1_OFF].xy;
mU = eP(normal, dp1, dp2, a-c, b-c,
select(aX, vec4f(0.0), aX.w == 0.0));
}


let decoded = sampleMap(lg, getMapUvSet(lg, uv,
select(dj, uv, uvProjection > 0))).rgb * 2.0 - 1.0;
let mapped = mU[0] * decoded.x * directionMaterial.coatNormalScale.x
+ mU[1] * decoded.y * directionMaterial.coatNormalScale.y + normal * decoded.z;
if (dot(mapped, mapped) > 1e-12) { (*si).coatNormal = normalize(mapped); }
}
`:""}
}

`:""}
(*si).normal = normal;
(*si).vertexNormal = normal;
(*si).shadowOffset = vec3f(0.0);
if (!bZ) {



let geometricNormal = normalize(cross(tri.p1 - tri.p0, tri.p2 - tri.p0));
let kR = eU.x * n0 + eU.y * n1 + eU.z * n2;
let a = dot(n2 - n0, tri.p0 - tri.p2);
let b = dot(n2 - n1, tri.p1 - tri.p2);
let c = dot(n1 - n0, tri.p1 - tri.p0);
var h = a * eU.x * (eU.x - 1.0)
+ (a + b + c) * eU.x * eU.y
+ b * eU.y * (eU.y - 1.0);
if (dot(kR, geometricNormal) > 0.0) {
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
(*si).shadowOffset = kR * h;
}
(*si).uv = uv;
(*si).uv1 = dj;
if (USE_NORMAL_MAPS) {
let dp1 = tri.p0 - tri.p2;
let dp2 = tri.p1 - tri.p2;
let oW = uv0 - uv2;
let oX = uv1 - uv2;
(*si).normal = pd(
(*si).materialIndex, uv, normal, dp1, dp2, oW, oX
);
}
}

struct eK {
t: f32,
barycentric: vec3f,
};





fn ga(o: vec3f, d: vec3f, tri: fP, eq: i32, gY: vec3f, tMax: f32) -> eK {
var ti: eK;


var p0t = tri.p0 - o;
var p1t = tri.p1 - o;
var p2t = tri.p2 - o;


if (eq == 0) {
p0t = p0t.yzx;
p1t = p1t.yzx;
p2t = p2t.yzx;
} else if (eq == 1) {
p0t = p0t.zxy;
p1t = p1t.zxy;
p2t = p2t.zxy;
}



p0t = vec3f(p0t.xy + gY.xy * p0t.z, p0t.z);
p1t = vec3f(p1t.xy + gY.xy * p1t.z, p1t.z);
p2t = vec3f(p2t.xy + gY.xy * p2t.z, p2t.z);


var e = vec3f(
p1t.x * p2t.y - p1t.y * p2t.x,
p2t.x * p0t.y - p2t.y * p0t.x,
p0t.x * p1t.y - p0t.y * p1t.x
);

if (DEPTH_QUERY_MODE) {


let sF = abs(vec3f(p1t.x * p2t.y, p2t.x * p0t.y, p0t.x * p1t.y))
+ abs(vec3f(p1t.y * p2t.x, p2t.y * p0t.x, p0t.y * p1t.x));
e = select(e, vec3f(0.0), abs(e) <= sF * 1e-6);
}


if (any(e < vec3f(0)) && any(e > vec3f(0))) {
return ti;
}

let det = e.x + e.y + e.z;
if (DEPTH_QUERY_MODE && det == 0.0) { return ti; }

p0t.z *= gY.z;
p1t.z *= gY.z;
p2t.z *= gY.z;
let sw = (e.x * p0t.z + e.y * p1t.z + e.z * p2t.z);


if (abs(sw) > abs(tMax * det)) {
return ti;
}

let tN = 1. / det;
ti.t = sw * tN;
ti.barycentric = e * tN;

return ti;
}




override DEPTH_QUERY_MODE: bool = false;

fn fo(d: vec3f) -> vec3f {
if (!DEPTH_QUERY_MODE) { return 1.0 / d; }
return 1.0 / select(d, select(vec3f(1e-20), vec3f(-1e-20), d < vec3f(0.0)), abs(d) < vec3f(1e-20));
}

fn fk(gr: vec3f, o: vec3f) -> vec3f {
if (!DEPTH_QUERY_MODE) { return vec3f(0.0); }
return abs(gr) * max(vec3f(1.0), abs(o)) * 1e-6;
}



fn cU(o: vec3f, xq: vec3f, xp: vec3f, gr: vec3f, tMax: f32) -> f32 {
let wG = (xq - o) * gr;
let wI = (xp - o) * gr;
let padding = fk(gr, o);
let nJ = min(wG, wI) - padding;
let sY = max(wG, wI) + padding;
let t0 = max(nJ.x, max(nJ.y, nJ.z));
let t1 = min(sY.x, min(sY.y, sY.z));
return select(select(t1, t0, t0 > 0.0), -1.0, (t0 > t1 || t0 > tMax));
}

fn maxDimension(v: vec3f) -> i32 {
return select(select(2, 1, v.y > v.z), select(2, 0, v.x > v.z), v.x > v.y);
}

fn nk(d: vec3f, eq: i32) -> vec3f {


if (eq == 0) {
return vec3f(-d.y, -d.z, 1.0) / d.x;
} else if (eq == 1) {
return vec3f(-d.z, -d.x, 1.0) / d.y;
} else {
return vec3f(-d.x, -d.y, 1.0) / d.z;
}
}

fn mV(
si: ptr<function, SurfaceInteraction>,
mk: fP,
aC: vec3f,
hK: vec3i,
bZ: bool,
ap: i32,
eL: vec3f,
fi: vec3f,
fM: i32
) {
(*si).instanceIndex = ap;
(*si).barycentrics = aC.xy;
(*si).normal = eL;
(*si).position = fi;
(*si).materialIndex = i32(ah(
bitcast<i32>(instancesBuffer[ap * ${$}].z)
).x);


hH(
si,
mk,
aC,
hK,
bZ,
fM
);

let l2w = mat4x4<f32>(
instancesBuffer[ap * ${$} + 5],
instancesBuffer[ap * ${$} + 6],
instancesBuffer[ap * ${$} + 7],
instancesBuffer[ap * ${$} + 8]
);
let w2l = mat4x4<f32>(
instancesBuffer[ap * ${$} + 1],
instancesBuffer[ap * ${$} + 2],
instancesBuffer[ap * ${$} + 3],
instancesBuffer[ap * ${$} + 4]
);
let aH = transpose(mat3x3<f32>(
w2l[0].xyz,
w2l[1].xyz,
w2l[2].xyz
));

(*si).faceNormal = normalize(aH * eL);
(*si).vertexNormal = normalize(aH * (*si).vertexNormal);
(*si).normal = normalize(aH * (*si).normal);
${t?"  (*si).coatNormal = normalize(aH * (*si).coatNormal);":""}
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


${No(e)}



${a||dm({hasDisplacement:i,hasAnisotropyDirections:e,hasCoatNormals:t,blasLayoutMask:A})}`}var Go=`
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



var<private> aZ: vec2u;
var<private> aQ: u32;
var<private> bT: u32 = 0u;
var<private> cP: u32 = 0u;
fn dG(kW: u32) -> u32 {
var x = kW;
x ^= x >> 16u; x *= 0x7feb352du;
x ^= x >> 15u; x *= 0x846ca68bu;
return x ^ (x >> 16u);
}
fn ar(a: u32, b: u32) -> u32 {
return dG(a ^ dG(b + 0x9e3779b9u));
}
fn iV(kW: u32, seed: u32) -> u32 {
var x = kW + seed;
x ^= x * 0x6c50b47cu; x ^= x * 0xb82f1e52u;
x ^= x * 0xc7afe638u; x ^= x * 0x8d22f6e6u;
return x;
}
fn ua(x: u32, seed: u32) -> u32 {
return reverseBits(iV(reverseBits(x), seed));
}

fn su(kW: u32) -> u32 {
var r = reverseBits(kW);
${Dn.map(([i,e])=>`r ^= (r << ${i}u) & 0x${e.toString(16)}u;`).join(`
  `)}
return r;
}
fn xE(index: u32, seed: u32) -> vec2f {
let i = ua(index, ar(seed, 0u));
let x = reverseBits(iV(i, ar(seed, 1u)));
let y = ua(su(i), ar(seed, 2u));
return vec2f(f32(x >> 8u), f32(y >> 8u)) * (1.0 / 16777216.0);
}
fn uR(p: vec2u) -> u32 {
var v = p & vec2u(255u);
v = (v | (v << vec2u(4u))) & vec2u(0x0f0fu);
v = (v | (v << vec2u(2u))) & vec2u(0x3333u);
v = (v | (v << vec2u(1u))) & vec2u(0x5555u);
return v.x | (v.y << 1u);
}
${Pn.map((i,e)=>`const Z_PERM_${e} = ${i}u;`).join(`
`)}
fn la(uU: u32) -> u32 {
let group = uU >> 2u;
var word = Z_PERM_5;
${[0,1,2,3,4].map(i=>`word = select(word, Z_PERM_${i}, group == ${i}u);`).join(`
  `)}
return (word >> ((uU & 3u) * 8u)) & 255u;
}
fn qS(lu: u32, dim: u32, logSPP: u32) -> u32 {
let odd = logSPP & 1u;
let vN = 8u + ((logSPP + 1u) >> 1u);
var result = 0u;
for (var digit = i32(vN) - 1; digit >= i32(odd); digit--) {
let shift = 2u*u32(digit) - odd;

var tL = 0u;
if (shift < 30u) { tL = lu >> (shift + 2u); }
let uU = (dG(tL ^ (0x55555555u * dim)) >> 24u) % 24u;
let d = (lu >> shift) & 3u;
result |= ((la(uU) >> (2u*d)) & 3u) << shift;
}
if (odd != 0u) {
result |= (lu & 1u) ^ (dG((lu >> 1u) ^ (0x55555555u * dim)) & 1u);
}
return result;
}



fn cE(slot: u32) -> u32 {
return CAMERA_BEVEL_BASE + u32(BEVEL_SAMPLES) + bT * BOUNCE_STRIDE + slot;
}
fn sl(candidate: u32, slot: u32) -> u32 {
if (candidate == 0u) {
if (slot == 2u) { return cE(8u); }
return cE(slot);
}
return cE(9u + (candidate - 1u) * 3u + slot);
}


var<private> hA: vec4u;
var<private> hB: u32;
var<private> fQ: bool = false;
var<private> dv: bool = false;
var<private> dQ: u32;
var<private> gK: u32;
var<private> fa: vec2f;
fn dN(dim: u32) {

let kI = aZ.x + aZ.y * u32(rtUniform.outputSize.x);
let key = vec4u(dim, aQ, kI, rtUniform.sequenceSeed);
if (fQ && all(hA == key) && hB == rtUniform.zSobolLogSPP) { return; }
hA = key; hB = rtUniform.zSobolLogSPP;
fQ = true; dv = false;
var seed = ar(ar(kI, dim), rtUniform.sequenceSeed);
var index = aQ;
if (SAMPLING_PATTERN == 1) {
var logSPP = rtUniform.zSobolLogSPP;
if (index == 0u) { logSPP = 0u; }
else { index -= 1u; }

var jw = index >> logSPP;
let mask = (1u << logSPP) - 1u;
let lu = (uR(aZ) << logSPP) | (index & mask);
index = qS(lu, dim, logSPP);
let tile = aZ >> vec2u(8u);
seed = ar(ar(dim, rtUniform.sequenceSeed), ar(tile.x, tile.y));

if (aQ != 0u) { jw += 1u; }
seed = ar(seed, jw);
}
dQ = ua(index, ar(seed, 0u));
gK = seed;
let x = reverseBits(iV(dQ, ar(seed, 1u)));
fa.x = f32(x >> 8u) * (1.0 / 16777216.0);
}
fn lC(dim: u32) -> vec2f {
dN(dim);
if (!dv) {
let y = ua(su(dQ), ar(gK, 2u));
fa.y = f32(y >> 8u) * (1.0 / 16777216.0);
dv = true;
}
return EPS + (1.0 - 2.0*EPS) * fa;
}
fn dp(dim: u32) -> f32 {
if (SAMPLING_PATTERN == 2) { return EPS + (1.0 - 2.0*EPS)*rand(); }
dN(dim);
return EPS + (1.0 - 2.0*EPS) * fa.x;
}
fn dZ(dim: u32) -> vec2f {
if (SAMPLING_PATTERN == 2) {
let x = dp(dim); let y = dp(dim);
return vec2f(x,y);
}
return lC(dim);
}

fn eC(slot: u32) -> f32 {
let dim = ar(ar(bT, slot), cP) | 0x80000000u;
cP += 1u;
if (SAMPLING_PATTERN == 2) { return EPS + (1.0 - 2.0*EPS)*rand(); }

let kI = aZ.x + aZ.y * u32(rtUniform.outputSize.x);
let seed = ar(ar(kI, dim), rtUniform.sequenceSeed);
let i = ua(aQ, ar(seed, 0u));
let x = reverseBits(iV(i, ar(seed, 1u)));
return EPS + (1.0 - 2.0*EPS) * (f32(x >> 8u) * (1.0 / 16777216.0));
}
`;var zf=`
var<private> s0: vec4u;

fn gW(p: vec2u, frame: i32) {

s0 = vec4u(p, u32(frame), u32(p.x) + u32(p.y));
}


fn xd() {
s0 = s0 * 1664525u + 1013904223u;
s0.x += s0.y*s0.w; s0.y += s0.z*s0.x; s0.z += s0.x*s0.y; s0.w += s0.y*s0.z;
s0 = s0 ^ (s0>>vec4(16u));
s0.x += s0.y*s0.w; s0.y += s0.z*s0.x; s0.z += s0.x*s0.y; s0.w += s0.y*s0.z;
}

fn rand() -> f32 {
xd(); return f32(s0.x)/f32(0xffffffffu);
}

`;function Ho(i=!0,e=!1){return`

struct ob {
ray: Ray,
maxDistance: f32,
triangleIndex: i32,
contribution: vec3f,


risTarget: f32,
lightSelectionPmf: f32,
valid: bool,
}

fn sd(
si: ptr<function, SurfaceInteraction>,
ma: OpenPbrResolvedMaterial,
aa: ptr<function, Path>,
ffnormal: vec3f,
eM: bool,
lightSample: LightSampleRec,
f: vec3f,
scatteringPdf: f32,
gz: ptr<function, ob>
) -> bool {
(*gz).valid = false;
(*gz).lightSelectionPmf = 0.0;
(*gz).risTarget = 0.0;
var Li = lightSample.emission;

let lightDir = lightSample.direction;
let qY = -(*aa).ray.d;
let fA = lightSample.pdf;
let lightSelectionPmf = lightSample.selectionPmf;


${e?`var cosThetaL = dot(ffnormal, lightDir);
if (eM && ma.coatNormalEnabled) { cosThetaL = dot(ma.geometricNormal, lightDir); }`:"let cosThetaL = dot(ffnormal, lightDir);"}

if ((fA <= 0.0) | (lightSelectionPmf <= 0.0) |
(max(max(Li.x, Li.y), Li.z) <= 0.0)) {
return false;
}

if ((scatteringPdf <= 0.0) | (max(max(f.x, f.y), f.z) <= 0.0)) {
return false;
}

var ns: Ray;
var hw = (*si).position + EPS * lightDir;
if (eM) {
hw = sR((*si).position, (*si).faceNormal, lightDir);
let ch = 0.1;
var dL = dot((*si).normal, lightDir);
${e?"    if (ma.coatNormalEnabled) { dL = dot((*si).faceNormal, lightDir); }":""}
let geometricNormal = select(
(*si).faceNormal,
-(*si).faceNormal,
dL < 0.0
);
dL = abs(dL);
let iq = dot(geometricNormal, lightDir);
let pq = select(
clamp(1.0 - iq / ch, 0.0, 1.0),
clamp(
2.0 - (iq + dL) / ch,
0.0,
1.0
),
dL < ch
);
hw += (*si).shadowOffset * pq;
}




var mA = lightDir;
var nN = lightSample.dist - EPS;
if (lightSample.sourceType == 1u) {
let uo =
(*si).position + lightSample.direction * lightSample.dist;
let rc = uo + EPS * lightSample.normal;
let rr = rc - hw;
nN = length(rr);
mA = normalize(rr);
}
gC(&ns, hw, mA);




if (eM & (cosThetaL < 0.0) & (lightSample.sourceType == 0u)) {
let background = hX(ns);
Li = background.rgb * background.a;
}
if (SPECTRAL) {
Li = aj(Li, (*si).wavelength);
}



let fl = select(
uS(fA, scatteringPdf),
1.0,
lightSample.isDelta
);
if (fl > 0.0) {
let kV = Li * f / fA * (*aa).beta;
(*gz).risTarget = max(
dot(max(kV * lightSelectionPmf, vec3f(0.0)), luminance),
0.0
);
(*gz).ray = ns;
(*gz).maxDistance = nN;
(*gz).triangleIndex = (*si).triangleIndex;
(*gz).contribution = fl * kV;
(*gz).lightSelectionPmf = lightSelectionPmf;
(*gz).valid = true;
return true;
}
return false;
}

struct qc {
direction: vec3f,
response: vec3f,
pdf: f32,
transmission: bool,
}

fn sW(
si: ptr<function, SurfaceInteraction>,
ma: OpenPbrResolvedMaterial,
prepared: ag,
aa: ptr<function, Path>,
ffnormal: vec3f,
eM: bool
) -> qc {
let candidateCount = kB();
var selected: ob;
selected.valid = false;
var nH = 0.0;
var mq = 0.0;
var result: qc;




for (var event = 0u; event <= candidateCount; event++) {
let rX = event == candidateCount;
var lightSample: LightSampleRec;
var lightDir: vec3f;
var scatteringPdf = 0.0;
var response = vec3f(0.0);
var tE = false;
if (rX) {
var rU = 1.0;
var valid = selected.valid;
if (candidateCount > 1u) {
valid = valid & (nH > 0.0);
if (valid) {
rU = selected.lightSelectionPmf * mq /
(f32(candidateCount) * nH);
}
}
if (valid && !intersectSceneShadow(selected.ray, selected.maxDistance, selected.triangleIndex)) {
(*aa).li += selected.contribution * rU;
}
if (!eM) {
result.direction = fH(-(*aa).ray.d,
(*si).mediumAnisotropy, dZ(cE(PHASE_DIRECTION)));
result.pdf = bL(
dot(result.direction, -(*aa).ray.d), (*si).mediumAnisotropy);
return result;
}
let vR = vec3f(dZ(cE(BSDF_DIRECTION)), dp(cE(BSDF_LOBE)));
tE = !prepared.material.thinWalled &
(abs(prepared.material.relativeIor - 1.0) <= 1e-6) &
(prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] >= 1.0 - 1e-6);
if (tE) {
lightDir = openpbr_to_world(prepared.basis, -prepared.viewLocal);
response = bh(prepared.material) * cF(prepared,
${e?"select(-prepared.viewLocal.z, dot(prepared.coatBasis.normal, lightDir), prepared.material.coatNormalEnabled)":"-prepared.viewLocal.z"});
scatteringPdf = 1.0;
result.transmission = true;
} else {
var roughness = 1.0; var specular = false; var diffuse = true;
var jT = u32(OPENPBR_LOBE_DIFFUSE);

var transmission = false;
if (!jq(prepared, vR, &lightDir, &transmission,
&roughness, &specular, &diffuse, &jT)) { return result; }
result.transmission = transmission;
}
} else {
let lV = vec3f(dZ(sl(event, 1u)), dp(sl(event, 0u)));
nE((*si).position, lV, event, candidateCount, &lightSample);
lightDir = lightSample.direction;
if ((lightSample.pdf <= 0.0) | (lightSample.selectionPmf <= 0.0) |
(max(max(lightSample.emission.x, lightSample.emission.y), lightSample.emission.z) <= 0.0)) { continue; }
${e?`var cosThetaL = dot(ffnormal, lightDir);
if (eM & ma.coatNormalEnabled) { cosThetaL = dot(ma.geometricNormal, lightDir); }`:"let cosThetaL = dot(ffnormal, lightDir);"}
if (eM & (cosThetaL <= 0.0) & (ma.transmissionWeight <= 0.0) & (ma.subsurfaceWeight <= 0.0)) { continue; }
}
if (!tE) {
if (eM) {
response = bO(prepared, lightDir, &scatteringPdf);
} else {
scatteringPdf = bL(
dot(-(*aa).ray.d, lightDir), (*si).mediumAnisotropy);
response = vec3f(scatteringPdf);
}
}
if (rX) {
result.direction = lightDir; result.response = response; result.pdf = scatteringPdf;
return result;
}
var candidate: ob;
let tv = sd(si, ma, aa, ffnormal, eM,
lightSample, response, scatteringPdf, &candidate);
if (!tv) { continue; }
if (candidateCount == 1u) {
selected = candidate;
continue;
}
let kO = candidate.risTarget / max(candidate.lightSelectionPmf, 1e-20);
if (!(kO > 0.0) | (kO != kO)) { continue; }
mq += kO;
if (!selected.valid ||
qx(event) * mq <= kO) {
selected = candidate;
nH = candidate.risTarget;
}
}
return result;
}

fn qm(
si: ptr<function, SurfaceInteraction>,
aa: ptr<function, Path>
) -> f32 {
if ((*aa).fromEye | (rtUniform.lightWeightTotal <= 0.0) |
(i32(materialsBuffer[(*si).materialIndex].matType) == UNLIT)) {
return 1.0;
}
let samplingLuminance = dot(
materialsBuffer[(*si).materialIndex].emission,
luminance
);
let qi = dot((*si).faceNormal, -(*aa).ray.d);
if ((samplingLuminance <= 0.0) | (qi <= 0.0)) {
return 1.0;
}
let te = distance((*si).position, (*aa).ray.o);
let fA = samplingLuminance / rtUniform.lightWeightTotal *
te * te / max(qi, 1e-8);
return gj((*aa).scatteringPdf, fA);
}

${e?`


fn fT(input: vec3f, face: vec3f, view: vec3f) -> vec3f {
let front = dot(face, view) >= 0.0;
let vP = select(-face, face, front);
let sc = select(-input, input, front);
if ((dot(input, face) <= 0.0) | (dot(sc, view) <= 1e-6)) { return vP; }
return sc;
}
`:""}
fn mL(
si: ptr<function, SurfaceInteraction>,
ma: ptr<function, OpenPbrResolvedMaterial>,
aa: ptr<function, Path>
) {
${e?`
let bK = (*si).faceNormal;
let nB = (*si).normal;
`:""}
var sO: f32 = -dot((*si).faceNormal, (*aa).ray.d);
var tV: f32 = -dot((*si).normal, (*aa).ray.d);
if ((((*ma).transmissionWeight > 0.0) | ((*ma).subsurfaceWeight > 0.0)) & (*ma).thinWalled) {

if (sO < 0.0) {
(*si).faceNormal = -(*si).faceNormal;
sO = -sO;
}
if (tV < 0.0) {
(*si).normal = -(*si).normal;
tV = -tV;
}
}


var qM: bool = (sO >= 0.0) & (tV < 0.0);
var ndv: f32 = select(tV, sO, qM);
var N: vec3f = select((*si).normal, (*si).faceNormal, qM);

(*ma).inside = (ndv <= 0.0) & !(*ma).thinWalled;

(*ma).relativeIor = select((*ma).specularIor, (1.0 / (*ma).specularIor), ndv > 0.0);
var ffnormal = select(-N, N, ndv >= 0.0);
${e?`
if ((*ma).coatNormalEnabled) {
let view = -(*aa).ray.d;
let gp = dot(bK, view);
(*ma).geometricNormal = select(-bK, bK, gp >= 0.0);
ffnormal = fT(nB, bK, view);
(*ma).coatNormal = fT((*si).coatNormal, bK, view);
(*ma).inside = (gp <= 0.0) & !(*ma).thinWalled;
(*ma).relativeIor = select((*ma).specularIor, 1.0 / (*ma).specularIor, (gp > 0.0) | (*ma).thinWalled);
}
`:""}

(*aa).scatteringIsDelta = false;
var bs = false;
var hC = false;
let mediumType = (*si).mediumType;

var scatteringPdf: f32;
var dH: vec3f;

if (HAS_MEDIUM) {
let d = distance((*si).position, (*aa).ray.o);
let os = (*aa).ray.o;
let extinction = (*si).mediumExtinction;
let scattering = min((*si).mediumScattering, extinction);
let tR = max(max(extinction.x, extinction.y), extinction.z);
if ((mediumType > 0) & (tR > 0.0)) {


let oi = min(i32(dp(cE(MEDIUM_CHANNEL)) * 3.0), 2);
let fS = extinction[oi];
let iH = select(
d,
min(-log(max(dp(cE(MEDIUM_DISTANCE)), 1e-7)) / fS, d),
fS > 0.0
);
bs = iH < d;
let transmittance = exp(-extinction * iH);
let oU = select(
transmittance,
extinction * transmittance,
bs
);
let oE = max((oU.x + oU.y + oU.z) / 3.0, 1e-8);
if (bs) {
(*aa).beta *= transmittance * scattering / oE;

(*aa).ray.o = os + iH * (*aa).ray.d;
(*si).position = (*aa).ray.o;
}
else {
(*aa).beta *= transmittance / oE;
}
}
}

if (!bs) {
(*aa).li += qm(si, aa) * (*ma).emission * (*aa).beta;
}
if ((*ma).materialType == UNLIT) {
(*aa).abort = true;
return;
}


var prepared: ag;
if (!bs) {
${i?`
(*ma).directionTangent = (*si).directionTangent;
(*ma).directionBitangent = (*si).directionBitangent;
(*ma).geometryTangent = (*si).geometryTangent;
(*ma).geometryBitangent = (*si).geometryBitangent;
`:""}
prepared = ds((*si).tangent, *ma, -(*aa).ray.d, ffnormal);
}
let qW = sW(si, *ma, prepared, aa, ffnormal, !bs);
dH = qW.direction;
scatteringPdf = qW.pdf;
if (!bs) {
let f = qW.response;
let isNextRefraction = qW.transmission;




if (!(scatteringPdf > 0.0) |
!all(f == f) | !all(abs(f) < vec3f(3.402823e38)) |
(dot(dH, dH) < 0.5)) {
(*aa).scatteringPdf = 0.0;
(*aa).abort = true;
return;
}


(*aa).scatteringIsDelta = !prepared.material.thinWalled &
(abs(prepared.material.relativeIor - 1.0) <= 1e-6) &
(prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] >= 1.0 - 1e-6);
(*aa).beta *= f / scatteringPdf;

hC = isNextRefraction & !(*ma).thinWalled;
(*aa).isNextRefraction = isNextRefraction;


(*aa).ray.o = (*si).position + EPS * dH;
${e?`
if ((*ma).coatNormalEnabled) { (*aa).ray.o = (*si).position + EPS * select(-bK, bK, dot(bK, dH) >= 0.0); }
`:""}
}
(*aa).scatteringPdf = scatteringPdf;
(*aa).ray.d = dH;
if (bs) {
(*aa).isNextRefraction = false;
}

(*aa).fromEye = false;

if (HAS_MEDIUM) {


if (!bs & hC & ((*ma).mediumType > 0)) {
if (sO >= 0.0) {
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
`}var E_=Ho();var kf=`
fn eY(light: Light, fI: vec3f, jt: vec2f, lightSample: ptr<function, LightSampleRec>) {
let iQ = light.position - fI;
let ak = length(iQ);
if (light.radiusOrSpread <= 0.0) {



if (ak <= 1e-6) {
(*lightSample).direction = vec3f(0.0, 0.0, 1.0);
(*lightSample).normal = vec3f(0.0, 0.0, -1.0);
(*lightSample).dist = 0.0;
(*lightSample).pdf = 1.0;
(*lightSample).emission = vec3f(0.0);
(*lightSample).isDelta = true;
return;
}
(*lightSample).direction = iQ / ak;
(*lightSample).normal = -(*lightSample).direction;
(*lightSample).dist = ak;
(*lightSample).pdf = 1.0;
(*lightSample).emission = light.emission /
max(ak * ak, 1e-8);
(*lightSample).isDelta = true;
return;
}
let radius = max(light.radiusOrSpread, 1e-6);
(*lightSample).isDelta = false;
var gX: vec3f;

if (ak <= radius) {
let z = 1.0 - 2.0 * jt.x;
let ex = sqrt(max(0.0, 1.0 - z * z));
let azimuth = TWOPI * jt.y;
gX = vec3f(
ex * cos(azimuth),
ex * sin(azimuth),
z
);
(*lightSample).pdf = INV4PI;
}
else {
let ui = iQ / ak;
let jV = min(
1.0,
radius * radius / (ak * ak)
);
let cosThetaMax = sqrt(max(0.0, 1.0 - jV));
let ci = mix(1.0, cosThetaMax, jt.x);
let sinTheta = sqrt(max(0.0, 1.0 - ci * ci));
let azimuth = TWOPI * jt.y;
var tangent: vec3f;
var bitangent: vec3f;
aP(ui, &tangent, &bitangent);
gX = ui * ci
+ tangent * (sinTheta * cos(azimuth))
+ bitangent * (sinTheta * sin(azimuth));
(*lightSample).pdf = 1.0 / max(
TWOPI * (1.0 - cosThetaMax),
1e-8
);
}

let iR = dot(gX, iQ);
let ra = dot(iQ, iQ);
let br = iR * iR
- ra + radius * radius;
let cV = iR - sqrt(max(0.0, br));
let cM = iR + sqrt(max(0.0, br));
(*lightSample).dist = select(cM, cV, cV > 1e-6);
(*lightSample).direction = gX;
let tl = fI + gX * (*lightSample).dist;
(*lightSample).normal = normalize(tl - light.position);
(*lightSample).emission = light.emission;
}

fn dn(
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
let ek = surfacePoint - lowerLeft;
let uv = vec2f(
dot(ek, light.u / width) / width,
dot(ek, light.v / height) / height
);
(*result).emission *= sampleMap(i32(light.textureIndex), uv).rgb;
}

fn kw(
light: Light,
shadingPoint: vec3f,
samplePoint: vec2f,
result: ptr<function, LightSampleRec>
) {
let normal = normalize(cross(light.u, light.v));
let lowerLeft = light.position - 0.5 * (light.u + light.v);
let spread = clamp(light.radiusOrSpread, 0.0, 1.0);

if (spread <= 0.001) {
let gw = dot(normal, shadingPoint - light.position);
let surfacePoint = shadingPoint - normal * gw;
let ek = surfacePoint - lowerLeft;
let width = length(light.u);
let height = length(light.v);
let uv = vec2f(
dot(ek, light.u / width) / width,
dot(ek, light.v / height) / height
);
if (gw <= 0.0 || any(uv < vec2f(0.0)) || any(uv > vec2f(1.0))) {
(*result).emission = vec3f(0.0);
(*result).pdf = 0.0;
return;
}
(*result).direction = -normal;
(*result).dist = gw;
(*result).normal = normal;
(*result).emission = light.emission;
(*result).pdf = 1.0;
(*result).isDelta = true;
dn(light, surfacePoint, lowerLeft, result);
return;
}

let surfacePoint = lowerLeft
+ light.u * samplePoint.x
+ light.v * samplePoint.y;
let offset = surfacePoint - shadingPoint;
let hE = dot(offset, offset);
(*result).dist = sqrt(hE);
(*result).direction = offset / (*result).dist;
(*result).normal = normal;
let gn = dot(-(*result).direction, normal);
let pK = cos(0.5 * PI * spread);
if (gn <= 0.0 || gn < pK) {
(*result).emission = vec3f(0.0);
(*result).pdf = 0.0;
return;
}
(*result).emission = light.emission;
(*result).pdf = hE / max(light.area * gn, 1e-8);
dn(light, surfacePoint, lowerLeft, result);
}

fn gs(
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

fn kx(
light: Light,
shadingPoint: vec3f,
samplePoint: vec2f,
result: ptr<function, LightSampleRec>
) {
eY(light, shadingPoint, samplePoint, result);
let surfacePoint = shadingPoint + (*result).direction * (*result).dist;
let dV = normalize(shadingPoint - surfacePoint);
(*result).emission *= bP(light, dV);
}

fn jg(
light: Light,
shadingPoint: vec3f,
samplePoint: vec2f,
result: ptr<function, LightSampleRec>
) {
let ec = i32(light.litType);
if (HAS_SCENE_RECT_LIGHT && ec == RECT_LIGHT) {
kw(light, shadingPoint, samplePoint, result);
return;
}
if (HAS_SCENE_SPHERE_LIGHT && ec == SPHERE_LIGHT) {
eY(light, shadingPoint, samplePoint, result);
return;
}
if (HAS_SCENE_SPOT_LIGHT && ec == SPOT_LIGHT) {
kx(light, shadingPoint, samplePoint, result);
return;
}
if (HAS_SCENE_DIRECTIONAL_LIGHT && ec == DIRECTIONAL_LIGHT) {
gs(light, result);
}
}

fn nD(jt: vec2f, lightSample: ptr<function, LightSampleRec>) {
var uv: vec2f;

var pdf: f32;
let direction = pI(jt, &uv, &pdf);
(*lightSample).pdf = pdf;
(*lightSample).direction = direction;
(*lightSample).emission = textureLinear(envMap, uv).rgb;
(*lightSample).dist = INF;
}

fn ca(iK: i32) -> vec4f {
let width = rtUniform.lightSamplingTextureWidth;
return textureLoad(
lightSamplingData,
vec2i(iK % width, iK / width),
0
);
}

fn rb(index: i32) -> EmissiveTriangle {
let offset = index * 6;
let a = ca(offset);
let b = ca(offset + 1);
let c = ca(offset + 2);
let d = ca(offset + 3);
let e = ca(offset + 4);
let f = ca(offset + 5);
return EmissiveTriangle(
a.xyz, a.w,
b.xyz, b.w,
c.xyz, c.w,
d.xy, d.zw, e.xy,
e.zw, f.xy, f.zw
);
}

fn tI(index: i32) -> qb {
let data = ca(rtUniform.lightChoiceTexelOffset + index);
return qb(
data.x,
bitcast<i32>(data.y),
bitcast<i32>(data.z),
bitcast<i32>(data.w)
);
}

fn ka(nZ: i32, index: i32) -> qb {
return tI(nZ + index);
}

fn nR(
rnd: vec3f,
mS: u32,
candidateCount: u32
) -> vec3f {
var uk = rnd;
let count = max(candidateCount, 1u);
uk.z = (rnd.z + f32(min(mS, count - 1u))) /
f32(count);
return uk;
}

fn mH(
triangle: EmissiveTriangle,
fI: vec3f,
jt: vec2f,
lightSample: ptr<function, LightSampleRec>
) {
let xh = sqrt(jt.x);
let barycentric = vec3f(
1.0 - xh,
xh * (1.0 - jt.y),
xh * jt.y
);
let uq =
barycentric.x * triangle.p0 +
barycentric.y * triangle.p1 +
barycentric.z * triangle.p2;
let uv =
barycentric.x * triangle.uv0 +
barycentric.y * triangle.uv1 +
barycentric.z * triangle.uv2;
let dj =
barycentric.x * triangle.secondaryUv0 +
barycentric.y * triangle.secondaryUv1 +
barycentric.z * triangle.secondaryUv2;
let normal = normalize(cross(triangle.p1 - triangle.p0, triangle.p2 - triangle.p0));
(*lightSample).direction = uq - fI;
(*lightSample).dist = length((*lightSample).direction);
if ((*lightSample).dist <= EPS) {
(*lightSample).emission = vec3f(0.0);
(*lightSample).pdf = 0.0;
return;
}
(*lightSample).direction /= (*lightSample).dist;
(*lightSample).normal = normal;
let qi = dot(normal, -(*lightSample).direction);
if (qi <= 0.0) {
(*lightSample).emission = vec3f(0.0);
(*lightSample).pdf = 0.0;
return;
}
(*lightSample).emission = getMaterialEmission(
i32(triangle.materialIndex), uv, dj
);
(*lightSample).selectionPmf = triangle.selectionPmf;
(*lightSample).pdf = triangle.selectionPmf *
((*lightSample).dist * (*lightSample).dist) /
max(triangle.area * qi, 1e-8);
}

fn hv(
fI: vec3f,
rnd: vec3f,
nZ: i32,
choiceCount: i32,
nX: f32,
lightSample: ptr<function, LightSampleRec>
) {
(*lightSample).emission = vec3f(0.0);
(*lightSample).pdf = 0.0;
(*lightSample).selectionPmf = 0.0;
(*lightSample).dist = INF;
(*lightSample).isDelta = false;
(*lightSample).sourceType = 0u;
(*lightSample).sourceIndex = 0xffffffffu;
if (choiceCount <= 0) {
return;
}

let sq = rnd.z * f32(choiceCount);
let column = min(i32(sq), choiceCount - 1);
let rW = ka(nZ, column);
let lM = select(
rW.aliasIndex,
column,
fract(sq) < rW.probability
);
let qh = ka(nZ, lM);
if (USE_ENVMAP && qh.sourceType == ${1}) {
(*lightSample).sourceType = 0u;
(*lightSample).sourceIndex = u32(qh.sourceIndex);
nD(rnd.xy, lightSample);
(*lightSample).selectionPmf = rtUniform.envLightPmf;
(*lightSample).pdf *= rtUniform.envLightPmf;
}
else if (qh.sourceType == ${2}) {
(*lightSample).sourceType = 2u;
(*lightSample).sourceIndex = u32(qh.sourceIndex);
let light = analyticLights[qh.sourceIndex];
jg(light, fI, rnd.xy, lightSample);
(*lightSample).selectionPmf = light.selectionPmf;
(*lightSample).pdf *= light.selectionPmf;
}
else if (HAS_SCENE_EMISSIVE_LIGHT && qh.sourceType == ${3}) {
(*lightSample).sourceType = 1u;
(*lightSample).sourceIndex = u32(qh.sourceIndex);
mH(
rb(qh.sourceIndex),
fI,
rnd.xy,
lightSample
);
}
(*lightSample).selectionPmf *= nX;
(*lightSample).pdf *= nX;
}

fn sampleLight(
fI: vec3f,
rnd: vec3f,
lightSample: ptr<function, LightSampleRec>,
tk: bool
) {
hv(
fI,
rnd,
0,
rtUniform.lightChoiceCount,
1.0,
lightSample
);
}



fn nE(
fI: vec3f,
rnd: vec3f,
mS: u32,
candidateCount: u32,
lightSample: ptr<function, LightSampleRec>
) {
hv(
fI,
nR(rnd, mS, candidateCount),
0,
rtUniform.lightChoiceCount,
1.0,
lightSample
);
}
`;var pm=["AAD60AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8f7/AAAAACUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPYDAQAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAB/wAAAQD///wLAwIBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/v8ACgD1//8PCAQCAQEBAQEAAAAAAAAAAAAAAAAAAAAAAAEH+v8A","MgAz/wAHCwcFAwIBAQABAQEAAAAAAAAAAAAAAAAAAQIK+AAAlQAm/wABCAgGBAMDAQEBAAABAQAAAAAAAAAAAAABAQIN9P4AHgHE///+BQgHBgUDAwMBAgEA","AAEAAAAAAAAAAAEAAQUN9P0AHwHL/QD+AQUHBwYFBAMDAQECAQABAQAAAAAAAAABAgQK9PwAGgI9/v/9/wIEBQUFBAMDAwIBAQEAAAAAAAAAAQECAwYJ9fsA","yAL7/P79/f8CBAUEBQQDAwMCAQEBAAEAAAAAAAABAwcI+PsAsANT/P79/f4AAQIEAwQDAwICAgEBAQAAAAAAAAECBAYF+foA3gQe/Pz7+/z9/wABAgIDAgIC","AQEBAAABAAAAAQECBAYF+/oA5wU/+/v6+vv8/f7/AAABAQEBAQEAAQAAAAABAAIDBAYD/PsAhQYb+/n6+vr6+/3+/wAAAAEBAQEBAAEAAQEBAgIDBQYE/fwA","jgIl+wD/AAABAgMDBAUGBwcHCAkJCQkJCQkKCgsMDQ0KA/0A4QI9+wAAAAABAQIEBAYGBwgJCQkKCwsLCwwMDQ4ODg0KBAAANgMP/AABAAEBAgMDBQUGCAgJ","CgoLCwwNDQ4ODw8QEA8LBgEAjwPH/AAAAQECAgMEBAYHBwkJCgsLDQ0ODw8QERESEhANCAIA8QMN/gABAQEBAwMEBQUHCAgKCwwNDQ4PEBEREhMSEREOCAQA","SQQw/wAAAQIDAgMEBQYGBwkJCwwNDg8PEBESEhMTExANCgQAmAR4AAAAAQICBAQEBQYHCAkKCgsMDQ8QERETExITEhAOCQUA5QSuAQABAQICAwMFBgYHCAkK","CwwNDg4PEBEREhIREBAMCQUAPwW7AgABAQEDAwQEBQYHBwgJCgsMDA0ODxAQEBEQDw0MCQQAgwWhAwAAAgICAwQEBQYGCAgJCQoKDA0NDQ4ODg4ODgwKBwQA","vAUpBAABAQIDAwQFBQUGBgcICQkLCwsMDQwNDQ0NCwoIBwQAAgbvBAABAQICAwMEBAUGBwcHCAkICQoKCgsKCwoJCQgHBAIALgYxBQAAAQICAgMEBQUFBQYH","BwcICAgJCQkJCAgIBwcFBAIAUQY9BQABAQEDAwQDBAUFBgYGBwcHBwgHBwcICAcHBgUFAwIAcgY+BQAAAgICAwMEBAQFBQUFBgYHBwYHBwcGBgYFBQQDAwEA","hQYlBQABAQICAwMEBAQFBQUGBQYFBgYGBgUGBQUEBAMCAQEAjAbjBAABAQECAgMDBAUEBAUFBQUFBQUFBQUEBAQEAwMDAgEAqI78BQDx49bJvbGmm5GIf3Zt","ZV1WTkdAOTMtJyEcFxIN/gMAAAAAACQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPcDAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/wAA","AQD///wLAwIBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAEL/wAADAD4//8OCAQCAQEBAQAAAAAAAAAAAAAAAAAAAAAAAQES/f8ANQAt/wAICgYEAwIBAQEBAQEA","AAAAAAAAAAAAAAABAAIR+v8AmAAl//8BCQkHBAMCAQEBAAABAAAAAAAAAAAAAAAAAQQP+P8ALQEAAAD+BAcHBgUEAwIBAQEAAQEAAAAAAAAAAAEBAgYL9v0A","LQEk/gD9AQUGBgYFBAMDAgEBAQABAAAAAAAAAQABAwYH9f0AKgI8/v/+/wIEBQUEBAQDAwICAQEAAQAAAAAAAAECBAcG9fwA5gIc/f78/v8CBAQFBAQDAgIB","AQEBAAEAAAAAAAECBAgF9/wA1APj/P39/P4AAQIDAwMDAwICAQEBAQAAAAABAQECBAcD+PsAAwU7/P37+/z9/wABAgICAgICAgEAAAAAAAAAAAIDBAYD+vsA","CwbD+/r7+vv8/P7/AAAAAQEBAAABAAAAAAAAAQEDBQYC+vsAdgaD+/r5+vr6/P3+/gABAAEBAgIBAQEBAQICAwMEBgYC/fsApQJe+wAAAAABAgIDBQUGBwcH","CAgICQkJCQkKCgwMDQwIAP4A+QKG+wAAAAABAQIDBAUGBwgJCAkKCgoLCwwMDQ0ODg0JA/8ATwNI/AAAAAEBAgMDBAUGBwgICgoKCwwMDQ0ODg8QDw4KBQAA","pQPp/AABAQEBAgMEBAUGBwgJCQsMDA0ODg8PEREREQ4LBgIA+wPw/QAAAQECAgMEBQYGBwgJCwsMDQ4OEBARERISERAMCAMAZgQD/wABAQICAwMEBQYHCAgK","CgsMDQ4QEBESEhISEQ8NCAMAsQRUAAAAAQECAwQEBQUHBwkJCwwNDg4PEBEREhIREQ8MCAQA+QRVAQABAQIDAwMEBQYHCAkKCgsMDQ4PEBARERIREA4MCQUA","UwVmAgAAAgICAwQFBQYGCAgJCgsMDQ4ODg8QEA8QDg0KBwQAkwUXAwABAQIDAwQFBgYHBwgJCgoLCwwNDg8ODw8ODQwKBwQA1wUOBAABAQICAwQEBQYGBwgI","CAoKCwsLDAwNDAwLCwkIBgIAAAZWBAAAAgIDBAQEBQUGBwcICQgJCgoLCwsLCwoKCQkHBQMAQQatBAABAQIDAwMEBAYGBgYHBwgICAkJCQkJCQkICAYFBAIA","YAbjBAABAQICAwQEBQUFBQcGBwcICAgICAgICAcHBgYEAwIAeAb5BAAAAQICAgMEBAQFBgUGBgcGBwcHBwYGBgYFBQQEAgEAkQatBAABAgEDAwMEBAUFBQYG","BgYGBgYGBgYGBQUFBAMDAwIAkgabBAABAQICAwQEBAQFBQUFBQUGBQUFBQUFBQQEAwMCAQAAzowhBwDx49bJvbGmnJKIf3ZuZl5WT0hBOjQtJyIcFxKxAAMA","AAAAACQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+AAAAAAAAAPYDAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzAAAAAQD///0LAwIBAQAAAAAAAAAA","AAAAAAAAAAAAAAAAAAHv/wAAEQD6//8OBwMCAQEBAQAAAAAAAAAAAAAAAAAAAAAAAQL3/v8APAAp//8HCwcEAwIBAQEBAQEAAAAAAAAAAAAAAAABAQT8/QAA","mQAj/wABCAgGBAMCAQEBAAABAAAAAAAAAAAAAAEAAQb++v8AOgELAAD+BAgHBgUEAwIBAQEAAQEAAAAAAAAAAAACAwgA+P4AOgE9/v/+AgQHBgUEAwMCAgEB","AQABAAAAAAAAAQEBBAj/9/0APwJa/v/9/gIEBQUFBAQDAgICAQEAAQAAAAABAAECBAkA9/0ABAP8/f/9/v8BAwQEBAMDAwIBAQEBAAAAAAAAAQEDBQkA9vwA","/QP9/P38/P7/AQIDAwMDAgICAQAAAAEAAAAAAQIDBQcA+PwALwWB/Pz8+/z+/gAAAgICAgEBAQEBAQAAAAAAAQIDBgYA+fsAQwY4/Pv6+vv7/f7//wAAAQEB","AQEAAAAAAAEBAQIEBQUA+vwAWQbB+/r6+/r7/P3+/wABAAEBAQEBAQECAgECAwQFBgYB+/wAwgLI+wAA/wABAQIEBAUFBwcHCAgJCQkICQoKCgsMDQsGAP0A","FQP0+wAAAAAAAgIDBAQGBgcICAkJCQoLCwsMDQ0ODQsHAf8AbANX/AAAAQECAQIDBAUGBwgICQoKCwsMDA0ODg8PDw0IAwAAwAMw/QAAAAEBAgMDBAUGBwgJ","CQoLDA0NDg8PEBEQDw0KBQAAFQTa/QABAQECAwMEBQYGBwgJCgsMDQ0ODxAREREREQ4KBgMAfwQe/wAAAQICAgMEBQUGBwgJCwsMDA4PEBAREhEREA4LBwIA","ywTj/wABAQECAwQEBQYHCAgKCgsMDg4PEBERERISEA4MCAQADAU0AQABAgICAwQEBQYHCAkJCgsMDQ4PDxAQERAQDw4KBwQAcwX2AQAAAQIDAwMFBQYHBwgJ","CgsMDA0ODg8PDxAODQwKBwMAnQXyAgABAQIDBAQFBQYGBwgJCgoLDAwMDg0ODg0NDAsJBgMA8wV9AwAAAgICAwQEBgYHCAgICQoKCgwMDA0NDAwMCwkHBgMA","Hwb8AwABAQIDAwQEBQUGBgcICAkKCgoLCgoLCwsKCQgHBQMASwZTBAABAQICAwQFBAYGBwcICAgICQkJCgoJCQgICAYFAwIAagZWBAAAAgIDBAQEBQUGBgcH","BwgICAgICAgICAgHBgYFBAIAhgafBAABAQIDAwMEBQUFBQYGBwYHBwcHBwcHBgYFBQQDAgEAlgZrBAABAQICAwQEBAUFBgUGBgYGBgYGBgYFBgUFBAMDAgEA","mAYhBAAAAgIDAwMEBAQFBQYFBQYGBgYGBgUGBQUEBAQCAgEAoYrZBwDy49bJvbKnnZOJgHdvZ19XUElCOzUuKCIdFxLpAgMAAAAAACMAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAPcDAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+AAAAAQAAAPwLAwIBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAL6/wAA","GAD7//8NBwMCAQEBAQAAAAAAAAAAAAAAAAAAAAAAAQX1/wAAPgAl/wAICgcEAgIBAQEBAQAAAAAAAAAAAAAAAAABAgfy/gAAnwDQ/wABCQgGBQMCAQEBAAEB","AAAAAAAAAAAAAAEBAgrz+/4AQgFf///+BAcHBQQEAwIBAQEAAQEAAAAAAAAAAQECBAv1+/8AUQHb/gD9AQUGBgYEAwMCAgEBAAABAAAAAAAAAAECBQv3+f4A","XwJy/v/9/wEEBQUEBAMDAgEBAQAAAAAAAAABAQECBgr6+P0AKwMe/v79/QABAwMEBAMDAgICAQEAAQAAAAAAAQIEBgf7+P0AKQQb/f79/P3/AQIDAgMCAgIB","AQEBAAAAAAABAQIEBgf8+PwAZAVC/fz7+/z9/gAAAQICAgEBAQEAAAAAAAEAAQIEBgX9+PwAdwaB/Pr6+vv8/f3/AAAAAAEBAQAAAAAAAAABAQMEBgT++vwA","PwZB/Pv7+/r7/P7+/wABAgEBAQICAgICAgIDBAUGBwX/+/wA4QL++wD/AAABAQIDBAQFBgcICAcICAkJCQoKCwsMDAoE/v4ANgNu/AAAAAAAAQIDBAUGBgcH","CAkJCgoKCwsMDQ4ODAoFAP4AjAO9/AABAAEBAgIDBAUFBgcICQkKCgsMDQ0ODg4ODgsGAgAA4QM3/QAAAQECAgIDBAQGBwgICQoLDAwNDQ8PEBAQDgsIBAAA","NQQW/gAAAQEBAgMEBAYGBwgJCQsLDA0ODw8QEBAQDw0JBAIAoQT1/gABAAICAwMEBQUGBwgJCgsMDQ4ODxAQEREQDwwKBgIA4wTV/wAAAgEDAgQEBAYHBwgJ","CwsMDQ0PDxAQEBEQDw0JBgMANwXfAAABAQICBAQEBgYGCAgJCgsMDA4ODw8QEA8PDgwKBwMAgAWdAQABAQIDAwQFBQYHCAkKCgsMDQ0ODw8PDw8ODQwJBgMA","yQWIAgAAAQICAwMFBQYHBwgJCQoKCwwMDQ4ODg0NCwoIBgMA/QUQAwABAgIDBAUEBgYHBwgICQoLCwsMDAwMDAwLCgkHBQMANAaCAwABAQIDAwQFBQYGBwcI","CQkJCgsKCwsLCwoKCQcHBQIAXgbwAwAAAgIDAwMEBQUGBwcICAgJCQkKCQkJCQkICAcFAwIAdQYABAABAQMCBAQFBQYGBgcHBwgICAgICAgIBwcHBgUEAwIA","lAYTBAABAgIDAwQEBQUGBgYGBwcHBwgICAcHBwcFBQQEAwEAowYFBAABAQIDAwQEBAUFBgYGBgYHBwYGBgcGBgUFBAQCAgEAogblAwAAAQICAwQEBQQFBQYG","BgYGBgYGBQUFBAQEBAMDAQEAEIgoCADy5NbKvrKonZSKgXhwaGBYUUpDPTYwKiQeGBP4BQMAAAAAACMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAPYDAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL/AAAAAQAAAP0KAwIBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAQj+/wAAHwD8//8OBwMCAQEBAQAAAAAA","AAAAAAAAAAAAAAABAQ37/wAAQAAh/wAHCgcEAgIBAAEBAQAAAAAAAAAAAAAAAAEAAxH5/wAApADn/wABCAgGBQMCAgEBAAEBAAAAAAAAAAAAAQACBA71/P8A","UgH9///+BAcHBQQDAgIBAQEAAQAAAAAAAAAAAAECBgz0/P8AaAFL/gD+AQQFBgUFBAMCAgEBAAEAAAAAAAABAQIDBwn1+/4AewIE///9/wIEBAUEBAMCAgEB","AQABAAAAAAAAAQIEBwf3+v4AUgM6/v79/f8BAwMEAwMDAgIBAQEAAQAAAAEBAQIFCAX3+f0AXgSl/f38/f3/AQICAgICAgICAQEBAAAAAAAAAQMEBwT5+f0A","oAV3/fz7+/z9/v8AAQECAQEBAQAAAAAAAAABAgMFBgP7+f0AvAbm/Pv6+vr8/P7+/wAAAAAAAAAAAAAAAAEBAgMFBgL7+fwAMwam/Pv7+vv7/f3/AAABAgIC","AgICAgICAwMEBQYHBgT++/0ABQO//AAAAAABAQIDBAUFBgYHBwgICAkJCQoLCwwMCwcB/f0AWwOq/AAAAAEAAQIDAwQFBgcHCAgJCgoLCwsMDQ0NDAgE//8A","sAMX/QAAAAABAgICBAUGBgcICQkKCgsLDQ0NDg4ODQoEAf8AAwRb/QABAQECAgMEBAUFBgcICQoKCwwNDQ4PDw8PDQoHAgAAbQRZ/gAAAQEBAgIDBAUGBwgI","CQoLDAwNDg8PDxAPDQoHBAEAuQTu/gAAAQICAgQEBQUGBwcJCQsMDA4ODw8QEBAPDQsIBAEABQXG/wABAQECAwMEBAYHBwkJCgsLDQ0PDxAQEA8ODgwIBQIA","YgWOAAABAQIDAwQEBgUGCAgJCgsMDA0NDg8PEA8PDQsIBgMAowV5AQAAAQICAwQFBQYHBwgJCgoLDA0ODg4ODg4NCwoIBQMA3AUQAgABAgIDBAQFBQcHCAgJ","CgoLDAwMDQ0ODQ0MCwkIBQIAHAavAgABAQIDAwQEBgYGBwgJCQoKCwsMDAwMDAsKCggGBQMAUwYEAwABAgIDBAQFBQYHBwgICQkKCgsLCwsKCgoKCAgGBAIA","bgZZAwAAAQMDAwQFBQYGBwgICAkJCQkJCQkKCQkICAYFBAIAkAaWAwABAgIDBAQFBgUGBgYHCAgICAgICAkICAcGBgUFAwIApQaxAwABAQICAwQEBAUGBwcH","BgcHCAgICAcHBgYGBQQDAgEAqQaLAwABAgIDAwQEBQYGBgYGBwcHBgcHBgYGBgYFBAQDAgEAoAaAAwAAAQIDBAQFBQUFBQYGBgYGBwYFBgYFBQQEBAMCAgEA","DoU7CADy5NfKvrOonpSLgnlxaWFaUktFPjcxKyUfGb4BBgMAAAAAACIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAAAAAAAAAPcDAQAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAPj/AAAAAQAAAP0KAwIBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAfL//wAAJQD9//8NBwMCAQEBAQAAAAAAAAAAAAAAAAAAAAABA/P+AAAA","QwAd/wAHCgcEAgIBAAEBAQAAAAAAAAAAAAAAAAEBBvn8/wAAsgDx/wABCAcGBAMCAgEAAAEBAAAAAAAAAAAAAQEDB/z5/f8AXQEIAP//BAcGBgQDAgICAQAA","AQAAAAAAAAABAQEDCv73/v8AiAHS/gD9AQQGBQUEAwICAQEBAAEAAAAAAAEAAQMFCv/3+/8ApQIO///9/gIDBQQEBAMCAgIBAQABAAAAAAABAQIFCf/2/P4A","hgNo/v79/f8BAgQEAwMCAgEBAQEAAAAAAAABAgQGCP/3+v4AngTG/f39/f3/AQECAgIDAgIBAAAAAAAAAAEBAgMGBwD4+v4A5QUW/vz7+/z9/v8AAQEBAQEB","AQAAAAAAAQABAgQGBv/5+v0A/wZD/fr6+vr7/P3+/wD/AAAAAAAAAAAAAAECAwQFBAD6+v0AKAZO/fz7+/z8/f7/AAABAgICAgMDAwMDAwQEBQcIBgH8+v0A","MAMp/QAA//8BAQIDAwUGBQYHBwcICAgJCgoLDAwLCgX//f4AhQMl/QAAAQEAAQICBAQFBgcHCAkICgoKCwwMDQ0NCgYB/v4A2ANa/QAAAAABAQIDAwQFBgYI","CQkKCgsMDAwODg4NCwcDAP8ARgT0/QAAAAEBAgIDBAUFBwcHCAkKCwwNDQ4ODg4NCwgEAf8AkQRk/gABAQECAgMDBAUGBggJCQoLDAwNDg8PDw8ODAkGAgEA","4ATk/gAAAQICAwMEBQUGBwgICgsLDA0ODw8PDw8NDAkGBAEAPwXe/wABAQECAgMEBAYGBwgJCQoMDA0NDg4PDw4ODAoHBAEAhQVZAAAAAQIDAwQEBgUHBwgJ","CgsLDA0ODg8PDw4NCwkHBAMAwwUzAQABAgICBAQFBQYHCAgJCgoLDA0NDQ0NDQ0MCwkHBQIABwa1AQABAQIDAwQFBQcHBwgJCgoLCwsMDQ0NDAwLCgkHBAIA","QwZLAgAAAgIDBAQFBgYGCAgJCQoKCwsLCwwLDAoKCQcGBAIAZgaaAgABAQMDAwUFBQYHBwgICQkKCgsLCwoLCgoICAcFBAIAjQbsAgABAgIDBAQFBgYHBwcI","CAkJCQkJCQkJCAgIBgYFBAIApgb2AgABAQIDBAQEBQYGBwgHCAgICAkJCQkICAgHBwUEAwEAsQY6AwABAgMDAwQFBQUGBgYHBwcICAcHBwcHBwYGBAQDAgEA","sQYCAwAAAQIDBAQFBQYGBgcHBwcHBwcHBwcGBgUFBQQDAgIAtAYlAwABAgICAwQEBQUFBgYGBgYGBgYGBgUFBQUEAwMDAgAAZ4HXBwDy5NfLv7Spn5WMg3py","amNbVE1GPzkzLCYgG/MFBwUAAAAAACEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPgDAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf4AAAAA","AgAAAPwKAwIBAQAAAAAAAAAAAAAAAAAAAAAAAAABBv3//wAAKQD+/wANBwMCAQEBAQAAAAAAAAAAAAAAAAAAAAEBCvn/AP8ASgDO/wAHCQYEAgIBAAEBAAAA","AAAAAAAAAAAAAQEDDvb9/wAAvQBB/wABCAgFBAMCAgEAAQEAAAAAAAAAAAABAAEEDvT8/wAAcgELAP/+BAcHBQQDAgICAQABAQAAAAAAAAEAAgMGDfX7/v8A","pwEA/wD+AQQFBgQEAwIBAQEBAAEAAAAAAAABAQMHCvb5/f8AzgIe///9/wEEBAUEBAMDAgEAAQAAAAAAAQABAgQICPj4/P8AwwP6/v79/f8BAgMDAwICAgIB","AAABAAAAAAEBAwUHBvr4/P4A5wRc/v38/P3+AQECAQICAQEBAQEAAAAAAAECAwQHBPr4+/4ANwZD/vz7+/z9/f8AAQEAAQEBAAAAAAAAAQECAwUGA/z4+v4A","Zgfa/fr6+fr7/P39//8AAAAAAAAAAAABAAECAwUGA/35+/0AGAax/fz8/Pz8/v4A/wEBAgICAwICAwMDBAUGBwgHBP77+/4AYgOn/QAAAAABAQICBAQFBQYH","BwgJCAkKCgoLDAwLCAL+/P4AwgOw/QAAAAAAAQIDAwUFBgYHCAgICgoKCwwMDQwLCAT//v4AIATf/QAAAAABAQICBAQFBgcHCAkKCgsMDA0ODQ0LCAUB//8A","bAQf/gAAAQEBAgIDBAQGBgcICAoKCwwMDg4ODg4MCgYDAP8AzgTB/gAAAAECAgIEBAUFBgcICQkLDAwNDQ4ODg0MCQYEAQAAGwUg/wABAQICAgMDBAUGBwgJ","CgsLCw0NDg4ODg4MCggEAwEAdAXI/wAAAgECAwQEBQYHBwgICQoLDAwODg4ODg0MCwgGAwEAtAVeAAABAQICAwQFBQYGCAgJCgoLDA0NDQ4ODQwMCQgFAwEA","+gXqAAABAQIDAwQEBQYHBwgJCQsLDAwMDQ0NDQwKCgcGBAIANAZhAQAAAgIDBAQFBgYHCAgJCgoLCwsMDAwMDAsKCQgGAwEAXwbcAQABAQMDBAQFBQYHBwgJ","CQkKCgsLCwsLCgoKCAcFBAIAjQYsAgABAgIDAwQFBgYGBwgICQoJCgoKCgoKCgkIBwYFAwIAqwZVAgABAQIDBAUFBQYHBwgICAgJCQkJCgkICAgHBwUEAwIA","uwaUAgABAgMDBAQFBgYGBwcICAgJCQkJCAgICAcGBQUEAwEAvgaYAgABAgIDAwQFBQYHBwcHBwgHBwcHBwcHBgYGBQQDAgEAyAazAgAAAQIDBAUFBQYFBgYG","BwcHBwcHBwcGBgUFBAQDAgEAtQaPAgABAgMDBAQEBQUGBgYHBgYGBwYGBgUGBQUEBAMDAgEADH32BgDy5NfLv7SqoJaNhHxzbGRdVU9IQTs0LigiyQMJCAUA","AAAAACEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/wAAAAAAAAAAAPcDAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+wAAAAAAAgAAAP0KAwEBAQAAAAAAAAAA","AAAAAAAAAAAAAAAC9P4AAAAALwD+//8NBwQCAQEBAQAAAAAAAAAAAAAAAAAAAQEE9P3/AAAAYADp/wAGCQYDAgIBAAEBAAAAAAAAAAAAAAABAAIG9vv+//8A","vQAn/wECCAgGBAICAgEAAQEAAAAAAAAAAAEAAgMK+/r+/wAAiQFsAP/+BAYGBQQDAgEBAQABAAAAAAAAAAABAQQL/ff8/wAA3AGr/gD+AQQGBQUDAwMCAQEA","AQAAAAAAAQEBAwYK/vf8/v8ABQPZ///9/gEDBAQEAwICAQEBAAEAAAAAAAACAwYK//b5/f8ADAQL//78/f8BAgMDAwMCAgEBAQAAAAABAQICBAcH/vf6/f8A","QAWI/v38/P3+AAECAQECAQEAAAAAAAAAAAEDBAYHAPn5/P4AmAbY/vv7+/z9/v7/AQEAAQEBAAAAAAAAAQICBQYF/vj5+/4AxAcd/vv6+fr6/P3+/v8A//8A","AAAAAAABAQIEBAUEAPv5/P4AIgZY/vz8/Pz9/f//AAEBAgMCAwMEBAQEBQUGCAgGAfz7+/4ArANF/gAAAAAAAQEDBAQFBgYHBwgICAkKCgsMDAsJBP/8/f4A","AgRC/gAAAAABAQICAwQFBgYHCAgJCgsKDAwMDAwJBgH+/f8AXQRn/gAAAQEBAgIDAwQFBgcICAkJCgsMDA0NDQwKBgMA//4AwASc/gABAAABAQIDBAUFBgcH","CQkKCwsNDQ0ODQwJBwMB//8ACAXu/gAAAQECAwMDBAUGBgcJCQoLCwwMDQ4ODQwLBwUCAQAAZAVZ/wAAAQICAgMEBAUGBwgICQoLDA0NDg4NDQsKCAYDAQAA","swXx/wABAQECAwQEBQUGBwgICQoLDAwNDQ0NDQwKCQYEAQEA9AU5AAABAQICAwMEBQYHBwgJCgsLCwwNDQ0NDAsKCAYEAwEAKwarAAAAAgIDAwQFBgYGCAgJ","CQoLCwwMDAwMCwsJCAYFAwEAcQY6AQABAQMDBAQFBQYHBwgJCgoKCwsLCwsLCwkJBwYEAwEAkAZaAQABAgIDAwUFBgYHBwgICQkKCgoKCwsKCQoIBwYFAwIA","tQa7AQABAQIDBAQFBQcHCAgJCAkJCgoKCgkJCQgIBwYEAgEAygYAAgAAAgMDBAUFBgYGBwcHCQkJCQkJCAkICAcGBgQEAwEAzwYKAgABAgIDBAQFBgYHBwgI","BwgICAgICAgIBwYGBQUDAgIA2QYLAgABAQMDBAQFBQYGBwcHCAcICAgICAcHBgYFBQQDAwEAywYXAgABAgIDAwUFBQYGBgYHBwcHBwcHBgYGBgYFBAMDAgEA","tgYdAgABAgIEBAQEBQUGBgYGBgcGBgYGBgUFBQQEAwMCAQEAzHeVBQDy5NjLwLWroZeOhX11bWVeV1BJQz02MCok/wwNCgUAAAAAACAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAACAAAAAAAAAAAAAPgDAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/wAAAAAAAgAAAP0KAwEBAQAAAAAAAAAAAAAAAAAAAAAAAAEW/gAAAAAA","NgD///8MBgQCAQEBAQAAAAAAAAAAAAAAAAAAAQMT+/7//wAAdwDz/wAHCgYDAgIBAAEBAAAAAAAAAAAAAAABAQQN+P7/AP8AygAb/wEBBwcGBAICAgEAAQEA","AAAAAAAAAQEBAwcK+P3/AAEAqQHVAP/+BAcGBQQCAgEBAQABAAAAAAAAAAECBAkH9fr9/v8ADQIM/wD+AQQFBQQEAgICAQEAAQAAAAABAAECBAkF9vr9//8A","TgOz///9/gEDBAQDAwMCAQEBAAAAAAAAAQIDBgkE9/j8/gAAagRD//79/f4BAQMDAwIBAQEAAAAAAAAAAQEEBggD+Pj7/f8AtQXv/v38/P3+AAABAQECAQAB","AAEAAAEBAQMDBgcC+vj7/v8AFwcf//v7+/v8/v8AAAAAAQAAAP8AAAABAgIEBQYB+/j6/P4ANAja/vr5+fr7+/z9/v///wD/AAAAAAABAgMFBQQB+/n6/P4A","IwaY/v39/f39/v8AAQECAgMEBAQEBQUFBgcICQgD/vv7/f8ACQTo/gAAAAAAAQICAwUFBgYGBwgICQoKCwwMCwkGAf78/f4AWwTS/gAAAAABAQIDBAQFBgcI","CAgKCQoLDAwMDAoGAv79/f8AswTp/gAAAAEBAgIDAwQFBgYHCAoJCwwMDA0MCwkHAwH+/v8AFgUe/wAAAQEBAQIDBAUFBgcICQkLCwsNDQ0NDAoHBQEA//8A","aAVS/wABAAECAgMDBAQGBggICQoKCwwMDQ0NDAoIBQMB//8AsgWs/wAAAQECAwMEBAYGBwcJCQoLDAwNDAwMCwoIBgMBAQAAAAbu/wABAQICAwMEBQUGBwgI","CQoLCwwMDQ0MCwoIBgUDAQAAQgZJAAAAAgICAwQEBQYHBwgJCgoKCwwMDAsLCwoIBgQDAQAAdgadAAABAQIDAwQFBQYGCAgICQoLCwsLCwwLCgkIBwUDAgEA","pwbFAAABAgIDBAQFBgYHBwgJCQkKCwsLCwoKCQgIBgUDAgEAyQYlAQABAQIDAwUFBgYHCAgICQoJCQoKCgoJCQgHBgQEAgEA4wZMAQAAAgMDBAQFBQcHBwgJ","CQkKCgkJCQgICAcGBQUDAgEA8AZ7AQABAQIDBAUFBgYGBwcICAgICAgJCAgIBwcGBQQDAwEA5gZ5AQABAgMEBAQFBgYHBwgHBwgICAgHCAgHBgYFBQQDAgEA","6QaeAQABAgIDBAUFBQYGBgYHCAcHBwgIBgYGBgUFBAMDAQEA0gaLAQABAgMDBAQFBgYGBwcHBwcHBwYGBwYGBQUEBAMCAgEAtAaUAQABAQIDBAQFBQUGBgYG","BgYHBwYGBQYFBQQEAwMCAgEAX3G1AwDy5djMwLaroZiPhn52bmdfWFJLRT44Miz9EBMQCwYAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAPgDAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAT/AAAAAAAAAwAAAP0JAgEBAAAAAAAAAAAAAAAAAAAAAAAAAQ39//8AAAAAPAD///8NBwQCAgEBAQAAAAAA","AAAAAAAAAAABAhL5/gAAAAAAjgD5/wAGCQYDAgEBAAEAAAAAAAAAAAAAAAEBBBD3/f7/AP8A4AAU/wECCAcGBAMBAQEBAQAAAAAAAAABAQEDBw72/P8AAAEA","0wHpAAD+BAYGBAQDAgEBAAEAAAAAAAAAAQIDCAr2+fz+/v8AUwIQ///+AAQFBQQEAwIBAQABAAAAAAEAAQIFCQj3+f3+AAAAqgPx///9/wECBAQDAwICAQEA","AAAAAAABAgMFCQX4+Pr9/v8A5gTF//79/f4BAQICAgIBAQEBAQAAAAABAQMGCAT69/r9/gAAQwZQ//37+/3+AAABAQEBAQAAAAAAAAEBAwQGBgP7+Pr8/v8A","uQdI//v7+/v8/f7//wAAAAAAAAAAAQECAgQFBgL7+fn7/v8Awwhd//r5+fr6+/39/v7//wD//wAAAAECAwUGBQL9+fr7/f8AOgY1//3+/f3+//8AAQIDAwME","BQUFBgYHCAgJCAT/+/r8/f4AcwR+/wD/AAAAAQIDBAQFBgYHBwgJCQoLDAwLCQYB/vz8/f8AwgQr/wABAAABAQIDAwUFBgcICAkKCwsLDAwLCgcD//79/v8A","MgWC/wAAAAEBAQICBAQFBgcHCQkKCwwMDAwMCgcEAf7+/v8AfAWN/wAAAQEBAgIEBAUGBgcJCQoLCwwNDA0LCQcEAgD+/v8AzwXc/wAAAQECAwMDBAUFBwgI","CQoKCwsMDQsLCgcGAwEA//8AIgbc/wABAQECAgMEBQUHBwgICQoLDAwMDAwLCQgFAwEAAP8AZQYqAAAAAQICAwQEBAYGBwcJCgoLCwwLCwsKCQgGBAMBAAAA","nAY5AAABAQIDAwMFBgUGBwgJCQoKCwsMCwsKCQcGBQMCAQAAygaUAAABAgIDBAUEBQcHCAgICQkKCgoKCgkJCAcGBAMCAQAA7QakAAABAQICAwQFBgYHBwgJ","CQoJCgoKCgoJCAcGBQMCAQEABwfJAAAAAgMEBAQFBQYHCAgICQkKCQkJCQgICAcGBAQCAQEAHQfjAAABAQIDBAUGBgYHBwgICAgICQkICAgHBgYFBQMDAgAA","BgcQAQABAgMDBAQFBgcGBwcICAgICAgICAcHBwUFBAMCAQEADQcJAQABAgIDBAUFBQYHBwcHBwgIBwcHBwcGBQYEBAMDAgEA9QYTAQABAgMEBAQFBgYGBgcH","BwcHBwcHBgYGBgQEAwMCAQEAzgYPAQABAgIDBAUFBQUGBgYGBwYHBwYGBgUFBAUEBAMCAgAApwYOAQABAQMDAwQFBQYGBgcHBgcGBgYGBQUFBQQEAwMCAQEA","d2mAAQDy5djMwbaropiPh352b2dgWVNMRkA5MwMVGBYSDQcAAAAAAB8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAPgDAQAAAAAAAAAAAAAA","AAAAAAAAAAAACv8AAAAAAAAABAAAAP4JAgEBAAAAAAAAAAAAAAAAAAAAAAABFf3/AAAAAAAAQwD///8NBwQCAgEBAAAAAAAAAAAAAAAAAQEDEvr+/wAAAAAA","rQD8/wEGCQUDAgEAAQEAAAAAAAAAAAAAAAIFD/j9//8AAAAACQHI/wABBwgFAwMCAQABAQAAAAAAAAEBAgMIC/b8/f//AP8ADAI5AAD/BAYGBQMDAgIBAAEA","AAAAAAABAgQJCPb5/f7//wAAswKr/wD+AQMFBQQDAgEBAQAAAAAAAQECAgUKBvf5/P7/AAAAJwQSAP79/gECAwQDAwIBAQABAAAAAAABBAYJBPn4+v3+/wAA","iwW4//78/f4AAQECAQIBAAEAAAAAAAICAwYIBPn3+vz+//8ABQea//z8+/3+/wAAAQABAQAAAAABAQEDBAYGAvv4+vv9/gAAdwje//v6+vr8/f7//wD//wAA","AAAAAQIDBQYGAfz5+fv9/v8AgQmG//r5+vr6+/z9/v7/AP//AAABAgIDBQYEAfz5+fv8/v8AVwbL//7+/f7+/wABAgMDAwQFBQYGBwgJCQkIBP/8+/v9/v8A","+ATf/wAAAAABAQICAwQGBgcICQkKCgsMDAsJBgL+/Pz9/v8AYwXH/wAAAAABAgIDBAUFBwcICAoKCwwMDAsJBgL//f39/v8AvAXn/wAAAQEBAQIDBAQGBggI","CQoLDAwMDAsKBwQB//79/v8AEAbt/wABAAEBAgMEBAUGBwgICgoLCwwMCwsJBgQBAP7///8AXgYQAAAAAQECAwMEBQYGBwcJCQoLDAsMCwoIBwQDAAD+/v8A","lwYTAAABAgICAwQEBQUGBwkJCgsLCwwLCwoJBwYDAgAAAAAA4wZNAAAAAQIDAwMEBQYHCAgJCQkKCgoKCgkIBwUEAgEA//8AEgdJAAABAQIDAwQFBQYHBwgI","CgoKCwsLCgkIBwUEAgEAAAAAKQd2AAABAgICBAUFBgcHCAgJCQkKCQkJCQkIBgUEAwIBAAAARwd9AAABAQMEAwQFBQYGBwgICAkJCQkJCAcHBgYEAwIBAQAA","TAeEAAAAAgIDBAUFBgYHBwcICQkICQkICAgGBgUEBAICAQAARAefAAABAgIDBAQFBgYHBwgIBwgICAgHBwYGBgQEAwIBAAEAOAekAAABAQMDBAUFBgcGBwcH","CAcIBwcHBwYGBQUEAwMCAQAAGAekAAABAgMEBAUFBQYHBwcHBwcHBwYHBgYFBQQDAgIBAQEA8QajAAABAgIDBAQGBgUGBgYHBwcGBwcGBgUFBAQDAwICAQAA","wAafAAABAgMDBAQEBQYGBgYGBgYHBgUFBQUFBAMEAwICAQAAhwadAAABAgIDBAUFBQUFBgYGBgYFBQYFBQUEBAQCAgIBAQEApV93/wDy5NjMwLWroZiPhn52","bmdgWVJMRT/aEh0fHRkUDwgAAAAAAB8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPgDAQAAAAAAAAAAAAAAAAAAAAAAAAH7AAAAAAAAAAAA","BwAAAP4JAgEBAAAAAAAAAAAAAAAAAAAAAQL2/v8AAAAAAAAATQD//wAMBwQCAgEBAAAAAAAAAAAAAAABAQf2/P//AAAAAAAAzwD+/wAHCQUDAgEAAQEAAAAA","AAAAAAEBAwn4+v3///8A/wAAUQHv/wEBBwcFAwMCAQABAAAAAAAAAQECBQ38+f3+/wD/AAAAXAITAAD/BAYGBQMCAQEAAQAAAAABAAEDBgz+9/r9/v8AAAAA","RgPp///+AAQEBAMDAgIBAAAAAAAAAQIEBwv/9/r9/v//AP8A6AQCAP/9/gACAwMDAgEBAQEAAAAAAgMECAj/9/n7/f7//wAAdgb1//38/f4AAAIBAgEBAAAA","AAEBAQIFBwf/+Pj6/P7//wAAEAjq//z7+/z9//8AAAAAAAAAAAABAgQFBwYA+vj6/P3+/wAAZgn+//v6+vr7/P7+////AP8AAAECAwQGBgT/+vn5+/z+//8A","fwrz//n5+fr6+/v9/f///wAAAQECAwQFBQP/+/n6+/3+/wAAaAb3///+/v4AAAECAwMEBQYGBwgICQoKCggD//z7/Pz9//8AxgUBAAAAAAAAAgMDBAUGBwcJ","CQoLDAwMCggEAP78/P3+/v8AIAYGAAABAQEBAQIDBAUGBwkJCgsMDAwMCwgFAv7+/f7+/wAAfQYRAAAAAAECAgMEBQYHBwgJCgsLDAwLCggGAgH+/v3+//8A","0gYcAAAAAQECAwMEBQUGCAgKCwsMDAwLCggFBAEA/v///wAACgcnAAABAQICAwQEBQYHBwkJCgoLCwsLCQgGAwIAAP////8ATwczAAABAQIDAwMFBQcHCAkJ","CgsLCwsKCQcGBQIBAP///wAAcQc/AAAAAgICAwUFBgYICAgKCQoKCgoJCAcGBAMCAQD/AAAAlwdHAAABAQIDBAQFBgcHCAgICgkKCQkJCAcGBQMCAQAA//8A","qQdSAAABAgMDBAQFBgYHCAkJCAkJCQgICAcFBAQDAQEBAAAAlAdXAAABAgIEBAUFBgcHBwgICQkICAgHBgYGBAMCAgEAAAAAjwdcAAABAQMDBAUGBgYHBwcI","CAgICAgHBwYFBQQDAQEBAQAAcAdeAAABAgMEBAUFBQcHCAcHBwcHBwYHBgUEBAMCAgEAAAAASQdgAAABAgIDBAUFBgYGBgcHBwcHBwcFBQUFAwMDAgIBAAAA","EQddAAABAgMDBQQGBgYGBwcHBwcGBgYGBQUEBAMCAgEBAQAA1AZbAAABAgMEBAUFBQUGBgYGBgYGBgUFBQQEAwMDAgEBAAEAjwZXAAABAgIDAwQFBQYGBgYG","BgYGBQUFBAQDBAMCAgIBAQAARQZSAAABAgMDBAUEBQUFBQYGBQUFBQUEBQQEAwICAgEBAAAAW1PY/gDx49bKvrKonpSLgnlxamJbVE1HxxMgIyIfGhYRDAYA","AAAAAB8AAAAAAAAAAAAAAAAAAAAAAAAA/wAAAAAAAAAAAAAAAQAAAPgDAQAAAAAAAAAAAAAAAAAAAAAB+f8AAAAAAAAAAAAADAAAAP4JAgEBAAAAAAAAAAAA","AAAAAAEC9f7//wAAAAAAAAAAdQAAAAAMBwQBAQEAAAAAAAAAAAAAAQEG+vv/AAD/AAAAAAAA8wD//wEHCQUEAgEBAQAAAAAAAAABAQMJ/vn8/v8AAAD/AAAA","sQH5/wABBwcFBAICAQEAAAAAAAEBAgULAff8/v////8A/wAA/QIJAAH/AwYFBAMCAQEBAAAAAAABAwYMAff6/P7/AAAAAQAAMQT3///9AQMEBAMCAQAAAAAA","AQECBAcLAvj5/P3+//8A/wAAEAYCAP/9/QACAgICAgEBAQAAAAECBAcJAfj4+/z+/gD/AAAA1Qf9//z8/P3/AAEAAAEAAAAAAQIDBQgHAPn5+fz9//8AAAAA","gAn7//z7+/v8/v8AAP8A/wABAQIEBQYGAfv4+vv9/f7/AAAA7QoCAPr5+fr7/P3+/v//AAAAAQIDBQYEAPv5+fv8/v////8AhAsAAPn5+fn6+/z9/v//AAEC","AwQFBgYEAPz6+vv8/f7/AAAAmwYCAAAAAAABAQIDBQYHBwgJCgsMDAsJBQD9/Pz9/v7//wAA3QYIAAAAAAEBAgMEBQYHCQkKCwwNDQsJBQL//f39/f//AAAA","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","wQQHAAABAwMEBQUFBQUEBAMDAwICAQEBAQAAAAAAAAAAAAAAPAQHAAABAgMEBAUEBQQFAwQDAwICAgEAAAAAAAAAAAAAAAAAvwMGAAACAwMDBAQFBAQDBAMD","AgMBAQEBAAEAAAAAAAAAAAAAUQMGAAABAgMEBAQEBAQEAwMDAgECAQEBAQAAAAAAAAAAAAAA7wIFAAABAgMDBAQEBAQEBAMCAwIBAQEAAAAAAAAAAAAAAAAA","Exg1AADn0r6rmYl6bF9TSD41LCUeGBIOCgcFAwICAQEBAAAAxSYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHSsAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAe0QAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAizUAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","TBwAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzAwAAAD//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAArAUAAAD+AAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAlwIAAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQQEAAAAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","owAAAAD//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWAAAAAD/AAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAA/wAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAHQAAAAAA/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEgAAAAACBQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","CQAAAAD9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACQAAAAD6AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAD8AAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAVAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABz8AAAD+////////////////","////////////////////////YEsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEkAAAD+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","LhwAAAD8/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA3QkAAAD5AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAMAAAD6/v8AAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAcQEAAAD5/v//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAD7/wD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","SgAAAAD7/f8CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJAAAAAD6/v4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAD8AvwAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAACgAAAAAC+gkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAAAAD69gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AwAAAAAPGQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAADxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAADeAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAQAAAADWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAB/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAQAAAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAdgJr/wBCdZm0yNbg6O7y9fj5+/z9/f7+/v7/////////////","EiQAAADh6e/09vn7/P3+//7/////AP8AAAAAAAAAAAAAAAAAEw4AAAD39vn6/P3+/v///wAAAAAAAAAAAAAAAAAAAAAAAAAA0xYAAAD38fL1+Pr7/f3+/v//","//8A/wAAAAD/AAAAAAAAAAAASRgAAAD/8vHz9ff6+/z9/v7//wD/AAD/AAAAAAAAAAAAAAAA5xYAAAAA+PTz9ff4+vz8/f7+//////8AAAAA/wAAAAAAAAAA","lBQAAAD//ff19fb4+fr8/f3+/v//AAAA/wAAAAAAAAAAAAAA+REBAAD//vr49vf4+fr7/P3+/v7/////AP8AAP8AAAAAAAAAag8AAAAA/v36+fj4+fr7/P39","/v7//////wAAAAAAAAAAAAAADQ0AAAAA//78+vn5+vr7+/z9/v7+/v8AAAD/AAD/AAAAAAAA8goAAAAAAP79/Pv7+vv7/Pz9/f7+//////8A/wAA/wAAAAAA","IAkBAAABAP/+/fz7+/v7/Pz8/f7+/v//////AAAAAAAAAAAAkwcBAAABAP/+/v38/Pz8/P39/f3+//7+/wAAAP8AAP8AAAAARQYBAAABAAD//v7+/f39/f39","/v7+/v///////wD/AAAAAAAALwUCAAABAQAA//79/v39/f3+/f7+/v7///////8AAAD/AAAASQQCAAAAAQD//////v7+/v7+/v7///////8AAAAA/wAAAAAA","jAMDAAABAQEAAP///v7+/v7+/v7+/v///////wD/AAAAAAAA7wIDAAABAQEBAAD//////v7+/////////wD/AP8AAAAAAAAAcAIEAAABAQEBAAD/AP//////","////////AP8A/wAAAP8A/wAACAIFAAABAQEAAAAA////////////////////AP///wAAAAAAsQEGAAABAQEBAQAAAAD//////////////wAA/wAAAAAAAAAA","bAEGAAAAAQEBAQEBAAAAAAAA//////8A////AP8AAAD/AAAAMQEGAAABAQEBAQAAAAAAAAD/AAAAAAD/AAAAAAAAAAAAAAAAAQEHAAABAgICAQEBAQAAAP8A","////AP8AAP///wD///8AAAAA2gAHAAABAQEBAQEBAQEBAAAAAAAA/wD//wAAAP8AAAAAAP8AugAHAAABAQEBAQIBAAAAAAAAAAAAAAAAAP8AAAAAAAAAAAAA","ngAHAAAAAQICAgEBAQEAAAAAAP//AP8A/wD//wD/AAAAAAEAiAAHAAABAQEBAQEBAQEBAQEAAAAA/wD/AAAAAP8A/wAA//8AdQAGAAABAQEBAQEBAQAAAAAA","AAAAAAAAAP8AAAAAAAAAAAAAZAAHAAABAgICAgEBAQEBAQAAAAAAAP8A/wD//wAAAP//AAAAWAAFAAAAAQECAQIBAQEBAAEAAAAAAAAAAAAAAAD/AAAAAAAA","TAAGAAABAQIBAgEBAQEAAAAAAAAAAAD/AP8AAP8A/wAAAAAAZAQT/gAWJC0yNDU0MS4sKSUiHxwYFhQRDw4LCQgHBgQDAgEA7iIAAADf5+zw9Pb4+vv8/f3+","/v7///8AAP8AAAAAAAAAAAAAIAoAAAD6+Pn7+/z9/v7+////AAAAAAAAAAAAAAAAAAAAAAAA8BIAAAD78/T1+Pn6+/39/f///v///////wAAAAAAAAAAAAAA","MBUAAAAB9fLz9Pf5+vv8/f3+/////wAAAAD/AAD/AAAAAAAAtxQAAAAC+/X09PX3+Pr7/P39/v7///////8AAAAAAAAAAAAAPxMAAAD//vn29vb2+Pn7+/z9","/f7+//8AAAAA/wAA/wAAAAAAYBECAAD///z59/f3+Pn6+/z9/f7+/v//////AAAAAAAAAAAAZA///wAA//77+fj4+Pn5+/v8/f3+//7//wAAAP8AAAAAAAAA","dA0CAAAAAP/+/Pr6+vn6+vv7/P3+/v/+/////wAAAP8AAAAApgsCAAAA///+/fz7+vr7+/v8/f39/f7/////AAD/AAAAAAAAAwoCAAABAP///v38/Pz7+/z8","/P39/v7+//8A//8AAAD/AAAAkQgEAAAAAQD//v79/Pz8/Pz9/f3+/v7+/v///////wAAAAAATQcEAAABAQAAAP///v39/f38/f39/f7///7//wAAAAAAAAAA","NQYHAAABAQEA///+/v79/v3+/f7+/v7+/v//AP//AP8A/wAARgUIAAABAQEAAAAA/////v7+/v3+//7//////wAA/wAAAAAAegQLAAABAQEBAQD/AP///v/+","/v/+/v/+////////AAAAAAAAzwMNAAABAQEBAAAA//////////7///////////8A/wD/AAAAPQMQAAABAQEBAQABAAD/AP//////////////AAAAAP8AAAAA","wwISAAABAQIBAQEAAQAA/////wD//////wAA////AAAAAP8AWwIVAAAAAgECAgEBAAAAAAAAAP8A//8A/////wAA/wAAAAAABgIWAAABAQIBAQEBAQEBAAAA","AAD/AAD/AP//AP//AP8AAAAAvAEYAAABAQECAQIBAQAAAQAA//8A//8A/wAAAAAAAAD//wAAfwEZAAABAQEBAgEBAQEBAAAAAAD/AAD/AP///////wAAAAAA","SwEZAAABAgICAQEBAQEAAAAAAAAA//8A/wAAAAAAAAAAAAAAHwEZAAAAAQEBAgIBAQEBAQEAAAAAAAD/AP8A/wAAAP8AAAAA+wAZAAABAQICAQEBAQAAAAAA","AAD/AP8AAAD/AP///wD/AAAA2wAZAAABAQEBAQEBAAEBAAAAAP8A/wD///8A/wAAAAAAAAAAwAAXAAAAAQEBAgECAQEAAQAAAAAAAAAAAAD/AP8AAP8A/wAA","qQAWAAABAQICAQIBAQEBAAEAAAAAAAAA/wAA/wD//wAAAAAAlgAVAAAAAQEBAQEBAQEBAQABAAAAAP//AP//AAAAAAAAAAAAhAATAAABAQEBAgEBAQEBAQEA","AQEAAAAAAAAAAAAAAAD/AAAAwQZW/AAVJS41ODo5OTYzMC0qJyMhHRsYFRMQDgsJCAYFAwEAdiIAAADf5evu8fT3+Pn7/P3+/v/+//////8AAAAAAAAAAAAA","bQgAAAD8+fr7/P39/v////////8AAAAAAAAA/wAAAAAAAAAAKBEAAAD89PT29/j6+vv8/f7+/v////8AAAAAAAAA/wAAAAAApRMAAAAC9vPz9fb4+vv8/P39","/v7//////wD/AAAAAAAAAAAAgBMAAAAC/PX09Pb2+Pn6/Pz9/v7+////AP8AAP8AAAAAAAAAXxL//wAA//r39vX39/n6+vv9/f7+/v////8AAAAAAAAAAAAA","zxAFAAD/AP359/f3+Pj5+/v8/P39/v7//wD//wAAAP8AAAAAGA/+/wD////9+vn4+Pn5+vv7/P3+/v/+////AAD/AAAAAAAAYA0EAAAAAP/+/fv6+fn6+vv7","/Pz9/v7///////8AAAD/AAAAvQsEAAAAAAD+/fz7+/v6+vv8/P39/f3+/v4A//8A/wAAAAAAOgoFAAABAP8A//79/Pv8/Pv8/Pz9/f7+/v/+/wD/AAAAAAAA","3QgIAAABAAD///7+/f38/P38/f39/v7+////////AP8A/wAAqAcKAAABAQEAAAD///79/f39/f39/f7+/v7///8A/wAAAAAAmQYOAAAAAQEBAP////7//v39","/v7+/v7+////AAD/AAAAAAAArgUTAAABAQEBAAAA///+/v///v7+/v7//v////8A////AAAA4gQXAAABAQEBAQEAAAAAAP7+/v7+////////////AAAAAAAA","NAQcAAABAgEBAQEAAAD//wD///////7+//////8A/wAAAP8AoAMgAAABAQIBAQABAAAAAP8AAP8A/wAA/////wD/AP8AAAAAIAMmAAABAQECAQIBAQABAAAA","/wD///////8AAP8AAAD/AAAAtQIqAAABAgIBAgEBAQEAAAAAAAAAAP//AAD//wD//wAA/wAAWAIvAAABAQECAQEBAQEBAAAAAP///wAA//8AAP8AAP8AAAAA","CwIxAAAAAQIBAgEBAQAAAQEAAAAAAP//AAD//wD//wAAAAAAyAEzAAABAQECAQIBAQEBAAAAAAD//wAA//8AAP8AAAAAAAAAkAE0AAABAgEBAgEBAQEAAQAA","AAAAAP//AP///wD/AAD/AAAAXwE0AAABAQIBAQECAQEBAAAA//8AAAAA/wD/AP8A//8A/wAANgEzAAAAAQECAQIBAQAAAAAAAAD///////8A/wD/AAAAAAAA","EwEyAAABAQEBAgEBAAEBAQAAAAAAAAAAAAD///8A////AAAA9AAwAAAAAQEBAQEBAQEAAAEAAAAA////////AAD/AAAAAP8A2gAtAAABAQEBAQEBAQABAAAA","AP//AAD/AAAA//8A/wAAAAAAxAAqAAAAAAEBAQEAAQEAAQAAAAAAAAAA//8AAAD/AP///wAArwAnAAABAQECAQEBAQEBAAAAAAAAAP8AAAD/AAAAAAAAAAAA","HAlM+gAVJC81Ojs8Ozo4NTMvLCkmIh8cGRYUEA4MCQgGBAIANyIAAADe5ent8PT29/j6+/z9/f7+/v//////AAAAAAAAAAAAgwcAAAD8+vv8/Pz9/v/+////","AP//AAAAAAAAAAAAAAAAAAAAJRAAAAD99PT19/n6+/v8/f3+/v//////AAAAAP8AAAAAAAAAuRIAAAAE9/P09fb3+fr7/P39/v7//////wAAAAAAAAAAAAAA","uRL//wAC/ff09PX39/n7+/z9/f7+/v///////wAAAP8AAAAAwRH//wAA//r39vb2+Pj5+vv8/P3+/v////8AAAD/AAAAAAAAWxAIAAD/AP76+Pf39/n5+vr7","/f39/v7///////8AAAAAAAAAyA7+/wD/AP/9+vn4+Pj5+vv7+/z9/v7+////AAAAAAD/AAAAMA0HAAAA///+/fv7+vr6+vr7/P39/f7+/v///////wAAAAAA","pwsGAAAAAAD//v37+/r6+vv8/Pz9/f3+/////wAAAAAAAAAAOgoIAAAAAAAA//7+/Pz8/Pz8/Pz8/f7+/v7///////8AAAAA7QgPAAABAQAAAP/+/v38/Pz8","/P39/v3+/v////8AAAAA/wAAxQcRAAABAQAAAAD///7+/v39/v3+/f7+//7+////AAAAAAAAvgYYAAABAQEBAAAA/////v7+/f79/v7+/v//////////AAAA","2AUfAAABAQEAAAAAAAD////+//7//////////wAAAAAAAAAAEgUmAAABAQICAQEAAAD////////+/v7//v///////wAAAAAAZQQuAAABAQEBAgEBAAABAAAA","//8A////AP//AP8AAP8AAP8A0gM2AAAAAgEBAQEBAQAAAAAAAAD/AAD///8A/wD//wD/AAAAUwM/AAABAQICAQEBAQEAAQAA//8A//////////8AAAAA/wAA","5gJFAAABAQIBAgEBAQEBAAAAAAD/AAAAAAAAAAD/AP8AAAAAigJMAAABAgECAQIBAQEBAAAAAAAA//////////8A/wAAAAAAOgJQAAABAQEBAgEBAQAAAQEA","AAAAAAAAAAAAAAD/AAD/AAAA9wFTAAAAAQICAQECAQEBAAAAAP//AP////////8A//8AAAAAvAFVAAABAQEBAQEBAQEAAAAAAAAA/wAA////AAD/AAAA/wAA","iwFVAAABAQEBAQEAAAAAAAD//wD//////wD///8A////AAAAYAFUAAAAAQECAgEBAQEAAAAAAP//////AP8A/////wAAAAAAOwFRAAABAQEBAQEBAAABAAAA","//8AAP//////////AP8AAP8AGwFNAAAAAQEBAAEBAQAAAf8AAAD//wD//////wAA/wD//wAAAAFJAAABAAEAAQEAAQEAAAD/AAAAAP8A////AP//AP8AAAAA","5wBEAAAAAQEBAQEBAAABAAEAAP8A/wD/AAAA/wAAAAAAAAAA0gBAAAABAQEBAQEBAQEAAAAAAAD/AP8A/wD/AP///wD/AAAAcAsJ+AAVJC83Oz0+Pj07OTUz","LywpJiIfHBgWExEOCwkHBAIAFCIAAADe5Ons8PP19/j5+vz8/f7+/v//AAAAAP8AAAAAAAAA+QYAAAD8+/v8/Pz9/f7///8A//8AAAAA/wAAAAAAAAAAAAAA","hw8AAAD+9PT29/n6+/v8/f39////////AP8A/wAAAAAAAAAAHxIAAAAD+PTz9fb3+Pr7+/39/f7+/v///wD/AAAAAP8AAAAALxL//wAD/fb19PX3+Pn6+/v9","/f3+//////8AAAD/AAAAAAAATBH//wAA//v39vb29/j5+vv7/P39/v7///////8AAAAAAAAA+g8LAAD/Af77+Pf3+Pj5+vv8/P3+/f7+////AAAAAAAAAAAA","fQ7+/wD////9+/n4+Pn4+vr7/Pz8/v7//////////wD/AAAA+AwKAAAAAAD+/fz7+vn6+vr7/Pz9/f7+/v///wAAAAAAAAAAgAsJAAAAAAD///38+/v7+vv7","+/39/f39/v7/////AP8AAAAAIQoNAAAAAAAA//79/fz8/Pz8/Pz8/f3+/v////8A/wAA/wAA4QgVAAABAAAAAP///v79/fz8/f39/f7+//7+////AAAAAAAA","wgcbAAABAQEBAAD//v7+/f7+/f3+/v7+/v///wAA////AAAAxAYiAAABAQAAAAAAAP/+//7+/v7+/v7+/v7/////AAAAAAAA5QUuAAABAQIBAQEBAAAA///+","//7+/v///////////wAAAAAAIgU3AAAAAgEBAQEAAQAAAAAA/wD///7/////AP8AAP8AAP8AewREAAABAQECAQEBAAEAAAAAAP8AAAD//wD//wD//wD/AAAA","6QNPAAABAQIBAgEBAQEBAAAAAAD///8AAP8A//8AAAAA/wAAbQNaAAABAgECAQIBAQAAAQAAAAAAAAD//wD/AAD/AAAAAAAAAgNkAAABAQIBAgECAQEBAAAA","AAAAAP8AAP8A//8A//8AAAAApgJtAAABAQECAQEBAQEBAQEAAP8A/wD//wD/AAAAAAAAAAAAWQJ0AAAAAQIBAQEBAQEAAAAA/wD/AP8AAP8A////////AAAA","FAJ4AAABAQECAQEBAQAAAAAAAAAA/wD//////wD/AAAA/wAA3AF6AAABAQEBAQEAAAABAP//////////////AP8A////AAAAqQF6AAAAAQEBAQEBAQEAAAAA","AP//////////////AAAAAAAAfwF4AAABAQEBAQEAAAD//wD/////////////////////AP8AWgF0AAAAAAAAAQABAAAAAP8A/////////////////wAA/wAA","OgFvAAAAAQEBAQEAAAAAAAD/AAD///////////////8AAAAAHQFpAAABAQEBAAABAQAAAAAA//////////////8AAAD/AAAABgFiAAAAAAEAAQEAAAAAAP//","AAAAAP///////wD///8A/wAA7wBbAAABAQABAAEBAQAAAAAAAP8A/wAAAAAAAP8AAAAAAAAAvA2e9QAVJjE5PkBAQEA+Ozk2Mi8rKSUiHhsYFRIPDAoHBQIA","ASIAAADe4+js7/L19vj5+vv8/f7+/v7+//8A/wAAAAAAAAAAqAYAAAD9+/v7/Pz9/v7///////8AAAAAAAD/AAAAAP8AAAAAIQ8AAAD+9PX29/n6+/v8/f3+","/v/+//8A/wAAAAAAAAAAAAAAtxEAAAAE+PT09fb3+Pr7+/39/v3//v//AP8AAAD/AAAAAAAAyhH//wAC/fb09PX2+Pn5+/v8/P7+/v/+/wD///8AAAAAAAAA","7xD//wAAAPz49vb29/j5+vv7/f39/v7/////AAAAAAAAAAAAqA8OAAD/Af76+ff39/j5+fr8+/z9/v7+/v8A/wAA/wD/AAAANw7//wD////++/n5+Pj5+vr6","/Pz9/f7+//7/////AAAAAAAAvQwNAAAAAAD+/fz7+vr6+vv7+/z8/f3+/v//AP8AAAAAAAAAUAsNAAAAAAAA//38/Pv6+/v8/Pz9/f7+/v/+/wD///8A/wAA","/AkSAAABAAAA///+/fz8/Pz7/P38/f3+/v7/////AAAAAAAAxggdAAAAAQAAAP///v7+/Pz9/f3+/f7+/v7///8A/wAAAAAArwcjAAABAAEAAAH///7+/v7+","/f39/v3+///+/v//AP//AAAAtwYwAAABAQABAQAAAAD////+//7+/v/+/v//AP8A/wAAAAAA3wU9AAABAQIBAQEBAAAAAP///////////////wD/AAAAAAAA","IgVLAAABAgECAQEBAQEAAAAA/wD///////8A//8AAP8AAP8AfwRaAAAAAQEBAQEBAQABAAAAAP8AAP8AAP//AAD//wD/AAAA8QNqAAABAQIBAgEBAQEBAQAA","AAAAAAD//wAA//8AAAAA/wAAeAN5AAABAgECAQIBAQEAAAEAAAAAAAAAAP//AAD/AAAAAAAAEAOGAAABAQIBAQEBAQEBAQABAAAA//8AAAAA//8A//8AAAAA","tgKSAAABAQECAgEBAQAAAAAAAAD/AAD/////AAAAAAAAAAAAawKaAAAAAQEBAQEBAAEAAAD/AP8A/////wAA////////AAAAKQKgAAABAQEBAQEBAQAAAAAA","/wD/////////////AAAA/wAA8AGiAAAAAQEBAQAAAAAAAP////////////7+////////AAAAwAGjAAABAAEBAAEAAAAA//////7+//7///////////8AAP8A","lwGfAAAAAQEAAQAAAAD//////////v/+/v///////wD//wAAcgGaAAABAQABAAABAP8AAAD///////////7//v////8AAAAAUgGTAAAAAAEAAQEAAAD/////","//////7////+////////AAAAOAGLAAAAAAABAAAAAAAAAP8A//////////////8AAAAA/wAAHgGCAAAAAQEAAAAAAAAA/wD/AAD//wD///8AAP//////AAAA","CQF4AAABAAABAQEAAAAAAAAA//8AAP///wD//wAAAAAAAP8AAxAZ8wAWKDM7QEJEREJAPjs4NTIuKickIR0aFxMQDQsIBQMA9iEAAADd4+jr7/L09vj6+/v8","/f3+/////////wAAAP8AAAAAegYAAAD9+vv8/P39/f7+/v///wD//wAAAAAAAAAAAAAAAAAA4A4AAAD/9fX29/j6+/v8/f3+/v7//////wAAAAD/AAAAAAAA","bhEAAAAE+PPz9Pb3+Pr7+/39/v7+////////AAAAAAAAAAAAfhH//wAD/ff19fX2+Pj5+/v8/P3+/v7///8A//8AAAAAAAAApBD//wAAAfz39vb29/j5+vv7","/f39/f7+////AAAAAAD/AAAAYA8SAAD/AP77+Pf39/j5+fr7+/z9/v7//////////wAAAAAA9Q3+/wD/AP/++/r5+Pn5+vr7/Pz9/f7+/v///wAAAAAAAAAA","ggwRAAD/AAD//vz7+vn5+vv7+/z8/f3+/v7/////AP8AAAAAHAsRAAAA/wD///38/Pz7+/v7/Pz9/f79/v////8A/wAA/wAA0AkXAAABAQAA///+/fz8+/v8","/P38/f3+//7/////AAAAAAAAoQglAAAAAAEBAAAA//7+/v39/f3+/v7+/v/+/wAA/wD/AAAAkQcvAAABAQAAAQD//////v7+/v39/f7+/v7/////AP8AAAAA","oAY8AAABAQEBAQEBAAD//////v////7//////////wAAAAAAzgVOAAABAQEBAQABAQEAAAD/AP//////////AP8AAAAAAAAAFgVgAAABAQIBAQIBAQABAAAA","/wD//wD//wAA/wAAAP8AAP8AdwRzAAABAgECAQEBAQEBAQEAAQAAAP8AAP//AAD//wAAAAAA7wOGAAABAQEBAQEBAQEAAQABAAAAAAAAAAAAAP8AAAD/AAAA","eQOZAAAAAQICAgEBAQEBAAEAAAAAAAAAAAAA/wAAAAAA/wAAFQOqAAABAQEBAQEBAQEBAQAAAAAAAAD//wD/AAD/AAAAAAAAvgK4AAABAQEBAQEBAAAAAAAA","AAAA//8A//8A//8A//8AAAAAdQLDAAAAAQIBAQEAAQAA//8A////////////////AAD/AAAANgLKAAABAQABAQEBAAD/AAD////////+//////////8A/wAA","/wHNAAAAAQEBAAAA//8A///+//7+/v7///7+////////AAAA0gHMAAABAAEAAAD/AAD///7//v/+///+/v7//v////8AAP8AqAHJAAAAAQAAAQAAAP//////","/v7//v7+/v/+//7//////wAAhgHCAAAAAAABAAAA///////+//7+/v7//v7+/v/+/wD/AAAAaAG5AAABAAEAAAAAAAD////////////+//////////8A/wAA","TQGvAAAAAAAAAAAA//8A///////+//7///////8A////AAAANQGjAAAAAQAAAAAAAAD/AP8A//8A/////////////wAAAP8AIAGXAAAAAAEBAQAAAAAAAAD/","AAD//wD///8AAAD/AP8A/wAAQRKD8AAYKjU9QkZGR0VDQD47NzQxLSkmIx8bGBQSDgwIBgMA8yEAAADc4ujs7/H09vj5+vv8/f39/v///////wAAAP8AAAAA","YwYAAAD9+/v7/P3+/f7///////8AAP8A/wAAAAAAAAAAAAAAuQ4AAAD/9fT29/j5+/v8/f3+/v/+/wD/AP8AAAD/AAAAAAAAOhEAAAAE9/T09fb3+Pr6+/z8","/f3//v7//wD///8AAAAAAAAAQxEAAAAD/vf09PX29/j6+vz8/f79/v////8AAAAAAAAAAAAAZBD+/wAAAPv49vb29/j5+vr8/Pz+/v7+/////wAA/wD/AAAA","IA8WAAD/Af/7+ff3+Pj4+vr7/P38/f7+/v//AP//AAAAAAAAtg3+/wD/AP/9+/r5+Pj5+fv7+/z9/v3+/////wAAAAAAAAAARwwVAAAAAAAA/vz7+vr6+vr6","/Pz9/f7+/v7///////8AAAAA5woWAAAA/wD///79/Pz7+/v8+/z8/f3+/v////8AAAAA/wAAnwkcAAAAAAAA///+/v38/Pz8/fz9/f7+/v7+////AAAAAAAA","dgguAAABAQEBAQD///7+/v39/f79/f3+////////////AAAAbQc5AAABAQAAAAAB/////v/+/v3+/v/+/v7//wAAAAAAAAAAggZKAAAAAQEBAQEAAQAAAP//","//////7//////////wAAAAAAtQVgAAABAQEBAQEBAQEBAAAA/wD//wD//wD/AAAAAAAAAAAAAgV1AAABAQICAQEBAQEAAQEAAAAAAP8AAP8A//8AAAAAAAAA","aQSMAAABAQEBAgICAQEBAQABAQAAAAAAAAAAAAAAAP8AAAAA5QOkAAABAgICAQEBAQEBAAEAAAABAAAAAAAAAAAAAAAAAAAAdAO7AAABAQEBAQEBAQEBAQAB","AQAAAAAA/wAAAAD//wAAAP8AEwPPAAABAQEBAQEBAAAAAAAA/wAAAAD/AP//AP8AAAD/AAAAwQLgAAAAAQEBAQEAAQAAAAD/AAD//////wD//wD/AP8A/wAA","egLsAAABAQEBAQAAAAAA//////7///////7///8A/wAAAAAAPgL1AAAAAAEAAAAA/////////v/+/v7//v///v/+////AAAACgL5AAAAAQABAAAA///+//7+","/v7+/v7+/v7+//7//////wAA3gH4AAABAAAAAP//AP///v/+/v7+/v79/v7+/v7/////AP8AtwH0AAAAAAEAAAD///////7+/v7+/v7+/v7+/v/+/v8A/wAA","lwHrAAAAAAAAAAAA/////v7///7+/v7+/v7+//7//////wAAegHgAAAAAQAAAP/////+///+/v7+/v7///7//v//////AAAAYAHUAAAAAAAA/wAAAP8A////","///////+/v///////wAAAP8ASQHGAAAAAAAAAAAA/wD/////////////////////AP///wAANQG3AAABAAAAAQAAAAAAAAAA//////8AAAD/AAAA/wAAAAAA","eBTj7QAZLDlBRUlJSkhGREA9OjczLysnIyAdGRUSDwwJBgMA9CEAAADc4ufr7/H09ff5+vv8/f39/v//AP///wAAAP8AAAAAXQYAAAD9+/v8/P39/v/+/v//","//8AAP///wAAAAAAAAAAAAAAow4AAAD+9PT19/j6+vv8/f3+/v/+//8AAP8AAAD/AAAAAAAAFhEAAAAF+PT09fb3+fn7+/z8/f3//v///wD///8AAAAAAAAA","ExH//wAD/vf09PX29/n5+/z8/f39/v/+//8AAAAAAAAAAAAALRD//wAAAPv49vb29/f5+fr8/P39/v7//////wAA/wD/AAAA5g4ZAAD/Af/7+ff39/j5+vr7","/Pz9/f7+/v//AP//AAAAAAAAeg3//wD/AP/++/r5+fn4+fv7+/39/f3+//7///8AAAAAAAAADQwZAAAAAAH//vz7+vr6+vr6/Pz8/f7+/v///wD///8AAAAA","rwoaAAAA/wAA//79/Pv8/Pv8+/z9/f3+/v7+//8AAAAA/wAAbAkiAAAAAQAAAP/+/v78/P38/fz9/v7+/v//////AAAAAAAASAg3AAAAAAABAAEA//7+/v3+","/f7+/f7+////////////AAAARAdEAAABAQEAAQABAAAA///+//7+//7+/v7//wAAAAAAAAAAXgZZAAABAQEBAQEAAQAAAP///////////wD/AP8A/wAAAAAA","lwVxAAABAQEBAQECAQEBAAEBAAAA//8AAP8A/wD/AAAAAAAA6wSLAAABAQECAQIBAQEBAQEAAAAAAAAAAAAAAAAAAAAAAAAAVQSnAAABAQIBAgEBAQIBAQEB","AQEAAQEAAAAAAAAAAAAAAAAA1wPCAAABAgEBAQEBAQABAQABAAABAAAAAAAAAAAAAAAAAAAAagPdAAAAAQECAQEBAQEAAAEAAQEAAAAAAAAAAAAAAAAAAAAA","DQP0AAABAQEBAQEBAAAAAAAA////AAAA/wD///8AAP8AAAAAvgIIAQABAQEAAQAAAAAAAP//AP//////AP//AAD//wD/AP8AfAIYAQAAAAEBAAD/AP//////","/v///v7+/v7//v7///8A/wAAQgIhAQAAAQAAAAAA///+/v7+/v7+/v7+/v7+////////AAAAEgIlAQABAAAA/////////v79/v39/v3+/v7+/v7+/////wAA","5wElAQAAAAAAAP///v7+/v3+/f79/f79/f7+/v7//v////8AxAEfAQAAAAD//wD///7+/v7+/v3+/f3+/v3+/v7+////AAAApQEVAQAAAAAAAP/////+/v7+","/f7+/v79/f7+/v/+//8A/wAAigEIAQAAAAAA/////////v7+//7+/v7+//7+/v7//v//AP8AcQH5AAAAAAAAAAD////////+/v7+/v7//v//////AP///wAA","XAHpAAAAAAAAAP8A//////////////////////////8AAAAASAHXAAAAAAAAAAEAAAAAAAAA/wD/AP///////wAAAAAAAAAAphZB6wAbLjtESUtNTUtJRkNA","PTg1MC0pJiIeGxYTDw0JBgMA+SEAAADb4ufr7/L09vj5+vv7/P3+/v///////wAAAP8AAAAAZAYAAAD9+/v7/P39/f7+//8A/wD/AP8A/wAAAAAAAAAAAAAA","mQ4AAAD+9PX29/j5+/v8/f39/v7//wD/AP8AAAD/AAAAAAAA/RAAAAAF+PPz9PX3+Pn6+/z9/v3+/v7//wD///8AAAAAAAAA7BAAAAAD/vf09PX29/n6+vv8","/P79/v/+//8AAAAAAAAAAAAA/Q/+/wABAPv49vb29/f5+vv7/Pz+/v7//////wAA/wD/AAAArw4dAAD/Af/7+ff39/j4+fr7/P38/f7+/v//AP//AAAAAAAA","QQ0AAAD/AAD+/Pr5+fn5+vr7+/z9/v3+//7///8AAAAAAAAA0gscAAD/AAAA/v37+vr6+vv7/Pz9/f7+/v///wD///8AAAAAdwofAAAAAAAA//7+/fz8/Pv8","/Pz8/f3+/v7+//8AAAAA/wAAOAkoAAABAAEAAAD+/v39/P38/f39/f7+/v//////AAAAAAAAFwhAAAAAAAABAQAA///+/v7+/f7+/v7+/////wAA/wAAAAAA","GAdPAAABAQEAAQEBAAAAAP////7/////////////AP//AAAAOAZnAAABAQEBAQEBAgEAAAD//wD///////8AAAAAAAAAAAAAdgWEAAABAQECAQECAQEBAQAB","AQAAAAAAAAAAAP8AAAAAAAAAzgShAAAAAQEBAQIBAQECAQEBAQEBAAAAAAAAAAEAAAAAAAAAPwTBAAABAgEBAQEBAgIBAQIBAQAAAQEBAAAAAAAAAAAAAAAA","xQPhAAABAQICAgEBAAEBAQABAAEBAAAAAQEAAAAAAAAAAAAAXAP/AAABAQEBAQEBAQAAAAEAAQAAAQAAAAAAAAAAAAAAAAAABQMaAQABAQEAAAAAAAAAAP8A","/wAA/wAA//8AAP8A/wAAAAAAuQIyAQAAAAABAAAAAP/////+//7+//7+/////wD/AP8AAAAAegJCAQAAAQEAAAD//v///v7+/v7+/v7//v7+/v7//wD///8A","RQJOAQABAAAAAP////79/v7+/f7+/f79/v7+/v7+////AAAAFwJSAQAAAAD////+/v7+/v39/f39/f39/f39/v7+/v7//wAA7wFRAQAAAP8A//7//v7+/f39","/fz8/f39/f7+/v7+/v////8AzgFLAQAAAAD////+/v79/f79/f39/f39/f39/f7/////AAAAsgE/AQAAAAAA//////7+/v3+/f7+/f3+/v7+/v7+/v7//wAA","lwEwAQAAAAD/AP////7//v79/v79/v79/v7+///+//8AAP8AggEgAQAAAP8A/////v/+//////7//v7//v7//v7//wD//wAAbQELAQAAAAAAAAD/AP8A////","/v/+///+//////////8AAAAAWgH4AAAAAAAAAAAAAAD/////AP8A//8A////AAAAAAD/AAAAyhig6AAcMD9HTE9QT05MSUZCPjo2My8qJyMfGxcUEA0KBgMA","ASIAAADb4ubr7/L09vj5+vv8/f7+/v7//////wAAAP8AAAAAcwYAAAD9+vv7/P3+/v7+/////////wAA/wAAAAAAAAAAAAAAmg4AAAD+9fT29/j5+vv8/f3+","/v7/////AP8AAAD/AAAAAAAA7BAAAAAF9/Tz9PX3+fr7+/z8/f7+//7//wD///8AAAAAAAAAzBAAAAAD/vb09PX29/j5+vv8/f3+/v////8AAAAAAAAAAAAA","0Q///wAAAfz49vb29/j5+vv8/P39/f7+/////wAA/wD/AAAAfA4gAAD/Af/7+ff39/j5+vr7/Pz9/v7+/v//AP//AAAAAAAACQ0AAAAAAAD+/Pr5+fn5+fr7","+/z9/f3+/////wAAAAAAAAAAmQsgAAD//wAA/v37+vr6+/v7/Pz8/f7+/v7///////8AAAAAPgokAAAAAAAA//7+/fz7+/v8/P39/f7+/v////8AAAAA/wAA","AgkuAAAAAAEBAQD//v3+/f39/f39/v3+//7/////AAAAAAAA5QdJAAABAQAAAAEAAAD+/v79/v7+/v///v///wAA/wAAAAAA6gZaAAABAQEBAQEBAQAAAAAA","////////////AP//AP//AAAAEAZ2AAAAAQEBAgECAQEBAQAAAAAA////AAAAAAAAAAAAAAAAUgWWAAABAQEBAQIBAQICAQEBAAAAAQEBAAAAAAAAAAABAAAA","sAS4AAABAQECAQECAgEBAgIBAgEBAQAAAQEAAAABAAEAAAAAJgTbAAABAQIBAgEBAQICAQEBAQEBAQEBAAABAAEAAAAAAAAAsQP/AAABAQEBAQEBAQEBAQEB","AQEBAAEBAQEAAQAAAQAAAQAATQMiAQABAQEBAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+QJAAQAAAQAAAQAA//////8A/wD/AP///////wAA/wAA/wAA","sgJbAQABAAEA///////////+/v7//v7+////////AP//AAAAdwJtAQAAAQAAAP///v7+/f39/v39/f7+/v7+/v7+/v8AAP8ARQJ6AQAAAAAA///+/v39/f39","/P39/f39/f3+/v7//////wAAGgJ/AQAA//////7+/v79/f39/fz8/Pz9/P39/f7+/v7//wAA9gF+AQAAAAD//v7+/f39/fz8/P38/f38/f39/v39/v/+//8A","1wF2AQAAAP/////+/v39/f39/fz9/Pz9/f39/f7+////AAAAvAFqAQAAAP////7+/v7+/f39/f39/f39/f39/v7+/v7//wAApQFYAQAA/wD//////v7+/v79","/f39/v79/v7+/v7///////8AkAFFAQD/AAAA///////+/v7+/v7+/v7//v7//v////8AAAAAfQEvAQAAAAAAAAD//////////////v7+/////////wD/AAAA","bAEZAQAAAP8AAAAAAAD/AP8A////AAD/////AP////8A/wAA5RoE5gAfM0JKUFJTU1FPTElEQT05NDAsKCQgHBgVEQ4KBwMACiIAAADa4ufr7vL09vj5+vv8","/f39/v7//////wAAAP8AAAAAigYAAAD8+vr8/f3+/v7//v///wAAAAAAAAAAAAAAAAAAAAAAog4AAAD+9PT19vj5+vv8/f3+/v7//////wAAAAD/AAAAAAAA","4BAAAAAG9/Pz9Pb3+Pn6+/z8/f7+/v//////AP8AAAAAAAAAsRAAAAAD/vf09fT2+Pn6+/v8/f39/v7///8A/wAAAAAAAAAAqQ///wAAAfz49fb29/j5+vv8","/P3+/v7+////AAAA/wD/AAAASw4kAAD/Af/7+fj39/j4+fr7+/z8/f7/////////AAAAAAAA0gwAAAD/AAD//Pr5+fj5+vv7/Pz9/f7+/v///wAAAAAAAAAA","YQskAAAAAAD//vz8+vv7+vr7/Pz9/v3+/v7/////AP8AAAAABgooAAAAAAEBAP/+/fz8/Pz8/P39/f7+//////8A/wAA/wAAywg0AAAAAAAAAQD///79/f39","/f39/v7+/v///wD/AAAAAAAAsgdSAAABAQEBAQEBAAD//////v7//v//////AP8AAAAAAAAAuwZmAAABAAABAQEBAQABAAD/AAD///////8A/wAA/wAAAAAA","5gWEAAAAAQEBAQICAgIBAQABAAAAAAAAAAAAAAAAAAAAAAAALQWpAAABAQICAgIBAgICAgIBAgEBAQEBAQEAAQAAAQAAAAAAkQTNAAABAgEBAQECAQICAgIC","AQIBAQEBAQABAAEAAAAAAQAACwT3AAABAQEBAQEBAgEBAQECAgECAgEBAQEAAQABAAAAAAAAmwMfAQABAQEBAQEBAAEBAQEAAQEBAAEAAAEBAAAAAQEAAAAA","PANEAQAAAQEBAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAA7AJlAQABAAAAAAD/AP///////v//AP//AP//AP8A//8AAAAAqwKCAQAAAAD/AP///v7+/v7+","/v79/f7//v//////AAAA/wAAcgKYAQAAAAAA/v7+/f39/fz9/fz9/f39/f39/f7+/v//AAAARAKnAQAAAP////79/v38/P38/Pz8/Pz8/f39/v7+/v7///8A","HAKsAQAAAAD+/v7+/f39/Pv7+/z8/Pz8/Pz9/f3+/v///wAA+wGqAQAA/////v79/fz8/Pz8/Pz7/Pz8/P39/f39/v7+//8A3wGhAQAAAP////7+/f39/f38","/Pz9/Pz8/fz9/f7+/v7/AAAAxgGUAQAA/////v7+/f79/P39/fz8/f39/P39/f3+//////8AsAGAAQD/AAD////+//3+/v39/f39/f3+/v7+/v7+/v///wAA","ngFrAQAAAP////7//v/+/v7+/v7+/v7+/v7+////////AAAAjAFSAQAAAAAAAAD//////////////v7+//////////8A/wAAfAE4AQAAAAAAAAAAAP//////","////AAD///////8AAAAAAAAA9hxx4wAgNkVOU1ZXVlVST0tHQz86NTEuKSUhHRkVEQ4KBwMAFSIAAADa4ebr7/L09vj5+vv8/P3+/////////wAAAP8AAAAA","pgYAAAD8+vv7/Pz9/v7+////AP//////AAAAAAAAAAAAAAAArw4AAAD+9PT29/j5+vv8/P3+/v////8A/wAAAAD/AAAAAAAA2xAAAAAF9/Pz9Pb3+fn7/Pz8","/f3+/v//AP8AAAAAAAAAAAAAmRD//wAE/fb09PX29/n5+vz9/f7+///+/v////8AAAAAAAAAhA///wAAAvz39vX39/j5+vr7/Pz9/f7/////AAAAAAD/AAAA","Gw4oAAD/Af/8+fj39/j5+vv7/P39/v7+/////////wAAAAAAnQwBAAD/AAD+/Pr5+fn5+vr7+/z9/f7+/v///wAAAAAAAAAAKQsoAAAAAAEA/v38+/r7+vv8","/Pz9/f3+////////AP8AAAAAzgktAAAAAAABAP/+/f38/Pz8/f39/v7+/v7/AP8A/wAA/wAAlAg5AAAAAAEBAQEA//7+/v79/f7+/v7//////wAAAAAAAAAA","fgdbAAABAQABAQEAAQAA//7///7+/////wAA////AAAAAAAAjAZyAAABAAEBAgICAQEBAQEAAAAA/wD/AP//AAAAAAAAAAAAuwWSAAAAAQEBAQECAgIBAQEB","AQEBAQABAAEBAAEAAAAAAQAACAW7AAABAQIBAgICAwMDAwICAQIBAQEBAQAAAQABAAAAAAAAcATmAAABAgEBAQICAQICAgMCAgECAgIBAQEBAQEAAQEAAAAA","8AMTAQABAQECAQEBAgEBAQECAgIBAQEBAQEBAAABAAABAAAAhAM+AQABAQEAAQAAAAEBAQEBAQEBAQEBAQEBAQEAAQAAAAAAKgNnAQAAAAAAAAAAAP//AAAA","AAAAAAAAAAAAAAAAAAAAAAAA3wKIAQABAQAA/////v///v7+/v7/////////AP8A/wAAAAAAoAKnAQAAAAAA//7+/v39/f39/f79/f3+/v///v///wD/AAAA","bQLCAQAA///+/v79/f38/Pz8/Pz8/P38/f39/v7+//7//wAAQgLSAQAAAP///v39/Pv8/Pv7+/v7/Pv8/Pz8/f3+/v////8AHQLYAQD////+/v79/Pz8+/v7","+/v8+/z8/Pz9/P39/v7//wAA/wHWAQAA///+/v38/fz7+/z7+/v7+/v7+/z8/f3+/f7+//8A5gHNAQAAAP///v7+/f38/Pv8/Pv7/Pz8/Pz9/f39/v7/AAAA","zwG9AQD////+/v39/f39/f38/P38/Pz9/f39/f7+/v////8AvAGnAQAAAP/////+/v7+/f39/f39/f39/f39/v7+//7//wAAqwGQAQAA/wAA/////v7+/v7+","/v3+/v7+/v7+/v7/////AAAAmgF1AQAAAP///////////////v///v7+/////////wAA/wAAjAFYAQAAAAAAAAAAAP//////AP///wAA/////wD/////AAAA","/B7n4AAiOUhSV1paWVhVUU1JRUA8ODMuKiYiHhkWEg8LBwMAISIAAADZ4efr7/L09/j5+/v8/P7+/v7//wAA/wAAAP8AAAAAxwYAAAD8+vr7/Pz+/f7+/v//","AP//AAAAAP8AAAAAAAAAAAAAwQ4AAAD+9PT19/j5+/v8/f7+/v//////AAD/AAAAAAAAAAAA1xD//wAF9vPz9Pb3+Pr7+/z9/f3+/v////8AAAD/AAAAAAAA","hRAAAAAE/vb09PX29/j5+/v8/f7+/v7//wD///8AAAAAAAAAYQ///wAAAfz49vX29/j5+vv8/P39/v7+////AAAAAAD/AAAA7Q0sAAAAAv/7+fj4+Pj5+vr7","/Pz9/v7//v///////wAAAAAAaQwBAAD/AAH//Pr5+fn6+vv7/Pz9/f7+//4A/wAAAAAAAAAA8QosAAD/AAEA//78+/v7+/v8/P39/f7+/v//AP8AAAAAAAAA","lgkxAAAAAAABAP/+/v38/Pz8/P39/v7+/////wD///8AAAAAXghAAAAAAAEBAQEA///+/v7+/v7+/v7///////8AAAAAAAAASwdkAAABAQEBAgECAQAA/wD/","////////////AAAAAAAA/wAAXAZ8AAABAQACAQICAgICAgEBAQAAAAAAAAAAAAAAAAAAAQAAkAWhAAAAAQIBAgICAwMCAgIBAQECAQEBAQEBAAAAAAEAAAAA","4QTQAAABAQEBAgICAgIDAwIDAgICAgIBAQEBAQEBAQAAAAAATwT9AAABAQECAQICAgICAgMCAwMCAgICAQIBAQEAAQABAAAA0wMwAQABAQEAAQEBAQICAgEC","AgICAgEBAgEBAQEBAAEAAAD/bQNgAQABAQEBAAAAAAAAAAEBAQAAAQEBAQABAQAAAAAAAAAAFwOIAQAAAAAA/////////////wAA/wAA/wAAAAAAAAAAAAAA","0QKrAQAAAP/////+/v7+/v7+/v7+/////////wAAAAAAAAAAlwLJAQAAAAD///3+/fz8/Pz8/P39/f39/v7+//////8AAAABZgLoAQAA///+/f38/Pz8/Pz7","/Pv8+/z8/f39/f3+////AAAAPwL9AQAAAP7+/f38/Pv7+vr7+vr6+/v8+/z8/f3+/v7///8AHgIEAgAA///+/vz8+/v6+/r6+vv6+/r6+/v8/P39/f7+/wAA","AwIBAgD///7+/f39/Pz8+/v7+/r7+vv7+/z8/Pz9/f7+//8A7AH3AQAA///+/v38/Pz7+/v7+/v7+/v8/Pz8/P39/v7//wAA2AHmAQD////+/v7+/fz9/Pz8","/Pz8/Pz8/Pz9/v7+/v////8AxgHOAQAAAP///v7+/v79/f39/P39/f39/v7+/f7+//7//wAAtwG0AQAA///////+/v7+/v79/v39/v7+/f7+/v7+/v///wAA","qQGXAQAAAAD//////////////v///v7+//7+////AAD/AAAAmwF4AQAAAAAAAAD/AP//////AP///wAA/wAAAP8A//8AAAAA9yBo3gAjPEtWW11fXFtXVE9L","R0I+OTQvLCciHhsWEg8LBwMALiIAAADZ4Ofr7/P09/j6+vz9/P79//////8AAP8AAAAAAAAA6wYAAAD8+vr7/Pz9/v7+////AP8A//8AAAAAAAAAAP8AAAAA","1Q4AAAD+8/T19/j6+vv8/f39/v7//wD//////wAAAAAAAAAA2BAAAAAF9/Lz9Pb3+fr7+/z9/f7+//7//wAAAAD/AAAAAAAAchAAAAAE/vf09PX29/j6+/z8","/f7+/v////////8AAAAAAAAAPw///wABAfv49vX29/n5+vv8/P39/v7///8AAAAAAAAAAAAAwg0vAAD/AgD7+fj4+Pj5+vr7/Pz9/f7+/////wAA/wD/AAAA","NQwBAAD/AAH//Pv5+fn5+vv8/P39/v7//v//AP//AAAAAAAAugoxAAD/AAEB//38+/v7+/v8/Pz9/f7+//////8AAAAAAAAAXwk1AAAAAAABAQD//v39/f38","/f7+/v7+/////wD/AP8AAAAAJwhGAAABAQEBAQEBAAD//v7+//7+//////8AAAAA/wAAAAAAFwdsAAAAAAECAgICAgEBAAAA//8A//8A/wD/AAAAAAAAAAAA","LQaHAAABAQEBAgMCAgICAgIBAQEAAQEAAQABAAAAAQEAAAAAZAWzAAABAQEBAgIDAwMDAwIDAgICAQEBAQEAAQABAAABAAAAuwTiAAABAQECAgICAwMDAwQD","AwMDAwICAQECAQEBAQAAAAAALgQYAQAAAQEBAQICAgMDAwIDAwICAgICAgIBAQEAAAEAAAD/twNPAQABAQEBAQABAQEBAgICAgICAgICAgEBAQEBAQAAAP8A","VQOAAQABAQAA/wAAAAAAAAAAAAEBAQEAAAEBAAEAAAAAAAD/BAOpAQAAAAD///7+/v7+/v////////8AAAAAAP8AAAAAAAAAwgLLAQAAAAD///79/f39/f39","/v7+/v/+////AAAAAAAAAAABjALrAQAA///+/f39/Pz8/Pz8/Pz8/fz+/f3+/v///wAAAAEAYAIKAgAA//7+/f38/Pv7+vr6+vr7+/z7/P39/f3+////AAAB","PAImAgD///79/fv7+vr5+vr6+vr6+vr7+/v7/P39/f7//wAAHgIvAgAA//79/Pz7+/r6+vn5+fn5+fr6+/v8/Pz9/f3+//8ABgIsAgD///7+/f38/Pv7+vr6","+vr6+vr7+/v7/P39/v7+/v8A8gEgAgAA///+/vz8+/z7+/v7+/v7+/v7+/z8/Pz9/f7/AAAA3wEOAgD///7+/f79/fz8/Pz7+/v7/Pz8/Pz9/f39/v7///8A","0QH1AQAA//////7+/f39/fz9/f39/P38/f39/v7+/v/+/wAAwwHYAQAAAAD+/v7+//7+/f79/f39/v3+/v7+/v7///8A/wAAtgG4AQAAAP8A/////v//////","/////v///v//////////AAAAqQGXAQAA/wAAAAAAAP//////////AP//AP///wD/AAAAAP8AIUFmxwDu3s7As6idlY6IhIKBgYOHi5GYn6ixusPN1t/o8PkA","OwNDAgAAAAAAAAAAAAABAQAAAQEAAQEBAQEBAQEBAQEBAQAAswOTAgAAAAAAAAAAAAAAAAABAAEBAQEBAQEBAQEBAQEAAAAAQQThAgAAAAAAAAABAAEAAAEA","AQEBAQEBAgEBAQEBAAABAAEA7QQ7AwAAAAAAAAAAAAAAAQEBAQECAQICAQICAgIBAgEAAQAAvgWmAwAAAAAAAAAAAQABAAABAQEBAgECAgICAgECAQEBAQAA","vAYYBAAAAAAAAQAAAAEAAQEBAQECAgICAgICAgICAQIBAAEA9gejBAAAAAAAAAAAAAABAQECAgICAgMCAwMDAgMCAgEBAQAAgQkuBQAAAAAAAAABAQEBAQIB","AgMDAwMEAwMDBAMDAwICAQAAdAvDBQAAAAAAAAAAAAEBAgIDAwMDBAQEBQUEBAMDAgICAQEA9Q1nBgAAAAAAAAEAAQECAgIDBAQFBQYFBQUGBQUEBAMCAgEA","PxELBwAAAAAAAAABAQECAwQEBQYGBwcICAcGBgYFBAQCAQAApBVoBwAAAAAAAQEBAgMEBQYHCAkKCgsLCwsKCQgHBgQEAgIArxtIBwAAAAEBAQEDBAUGCAoN","Dg8QEREREA8ODAsJCAYEAwEAWCQXBgAAAAABAgUGCQ4SFRkcHiAhIB8dGxkWFBAOCggGBAIAsTGkAgAARIfJ6OPu5dnMvq6djX1tX1FFOjAoIBoUEAwIBQIA","DQAAAAAAPPgzEREAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkfmS/wAAgYQMFSEwP1BhcYCPnKizvcbO1dzh5uvv8/b5/P4AG/ss/wAAAP/8+vfz8e3r6uno","6Onq6+zu8PHz9fb4+fv8/f8AsPv1/gAAAP///fz6+Pf18/Py8vLy8vPz9PT29/j5+vv9/v8A/PvS/gAA/wD///38+/r5+Pb29vX19fX29vj4+Pr6/P39/v8A","K/y7/gAAAAD//v79/Pv6+fn49/f39/j3+Pj5+vr7/Pz+//8ATPyq/gAAAAAAAP/+/fz7+/r6+fn5+fj5+fr6+/v8/P7+/v8AZvyh/gAAAP///////v39/Pv6","+/r5+vr6+vr6+/z9/f3+/wAAfPyb/gAAAAAA///+/v79/Pz8+/v7+vr7+/v8/Pz8/f7+//8AkPyZ/gAAAAAAAP///v79/f38+/v7+/v7+/v8/P39/v7//wAA","pPya/gAAAAAA//////7+/fz8/Pz8/Pz8/P38/P3+/v7+//8AuPyc/gAAAAD/AP////7+/v79/fz8/Pz8/Pz9/f3+/v///wAAyvyg/gAAAAAAAAD////+/v39","/f39/f38/f39/v79/v7///8A3fyl/gAAAAAA/wAA///+/v7+/f39/P39/f39/f7//v//AAAA8Pyr/gAAAAAAAP////7//v7+/v79/v3+/f7+/v7+/////wAA","Av2x/gAAAAAAAAD///////7+/v39/f39/v3+/v7+////AAAA"].join(""),mm="zThrEgAAAP/+/Pn28ezl3tfOxbyyp5yQhHhrX1JGOS0iFgsBAABVHv8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC39wAcBwIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADX/ACBJREJBgQCAQEBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAACABMNhPR8SCwgGBQQDAgIBAQEBAAAAAAAAAAAAAAAAAAAAAAAXBtQANigaEgwJBwUEAwMEAwMCAwIBAQEAAAAAAAAAAAAABAD4APoAODotIRkTDgwJCAcFBQMDAgMDAwMDAwMCAgEAAAAA/wCI///7KDs4LiQcFhANCgcGBAQDAgEBAP////7//wAAAAAAEQBXAfvnABwpLCgjHhoWEhANCwoICAcGBQUEAwQDAgEBAQAADQFAAP7y/xQkKywpJSAbGBQRDwwLCAcGBQQEAwIBAQEBAAAALwEwAfvv8QAQGyEkIyEfHBkWExAODQsJCAcFBQMDAwIBAQEAiQEaAfz08/sHEhsgIiMhHx0aGBYTEQ4NCwkJBwYFAwMDAgEAXwJbAfjy8vcACREYHR4gHx4dGhgWExIPDgwKCAcGBQMCAQAA8QLnAfXy7/L4AAgOFBkbHR0cGxoYFxQTEA4MCwkHBgUDAgEAzgNTAvDu7u/z+gEIDhIWGBobGxoZFxYUExEPDQwKCAYFAwIAzQTQAujo6evw9PsBBgwRFRcYGhoaGRgWFBMRDwwLCQcFBAIA1QVrA9ze4OTo7vP6AAYKDhIVFxgYGRgXFhQTEQ8NCgkGBAIALwUYBODh4uPl6e7y+f4ECQ4TFRkcHR8gICEgICAeHhwbGRgX6QLMBAD79vLv7u/x9Pj8AgYLERUaHyImKiwvMTM1Njc4OTk5RgOjBQD79/Tx8O7v8PP2+f4CBgoOEhcbHiEkJyksLjAyMzQ2owORBgD8+PXz8O/v8PDz9ff6/gEFCAwPEhYZHB8hIyYoKiwt/wOTBwD9+fbz8fHw7/Dw8fP19/r9AAIFCAsOEBMWGRsdICIkWQS4CAD8+vf18/Hv7+/v8PHy8/X2+Pv9AAIEBwkLDQ8SFBYYrwT7CQD++vf19PLx8O/v7+/v8PHz9PX3+Pr8/gACBAYICQsNAAVjCwD9+/n39PPy8PDv7u7v7/Dv8PHy8/T29/j5+/3+AAIDTAXMCwD+/Pv5+Pb19PPz8/Ly8vLz8/P09fb29/j6+vv8/v4AjwWNCwD//vz7+vn5+Pf39vf29vb29/f3+Pj5+fv7/P3+/v8AywUlCwD//v38/Pz6+/r6+vn6+vn6+fr6+vr7/Pv8/f3+/gAA/QWbCgD///7+/f39/P37/Pz7+/z7/Pz8/P38/f79/v7+//8AJwb+CQAA//////7+/v3+/f39/f39/f39/v3+/v7///8AAAAARQZSCQAAAAD//////////////////////v///v///wD/AAAAWwacCAD//wAA//8A//////////////8AAAAAAP8AAP8A/wAA",hm=["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","AAAWAAAEBgcICQkJCQcHBwYGBQUEBAMDAgICAQEBAQAAAQAAAAAVAAADBQcICAgICAgIBwcGBQQEAwMDAwICAgEBAAEBAAAAAAARAAACBQYICAgICAgHBwYF","BgUFBQQDAgMCAgIBAQEBAAAAAAAQAAADBAYGCAgIBwcHBwcHBQYFBAQEBAMDAgICAgEAAQAAAAANAAACBAUGBgcHCAgIBwYGBgUFBQQEAwMCAgIBAQEBAAEA","AAANAAACBAUGBwcHBwcHBgcGBgYFBAQEBAMDAwICAQEBAQAAAAALAAABAwQFBQYHBwcGBwYGBgUFBQUEAwMDAwICAgEBAAAAAAAKAAACAwQFBgYGBgYHBwcH","BgYGBQUEBQQEAwMCAgIBAQAAAAAKAAABAgQEBQUGBgYGBgYGBgYFBgUFBAQDAwIDAgEBAQEAAAAIAAABAwMEBAUFBgYGBgYGBgYGBQUFBAQEAwMCAgIBAQAA","AAAIAAACAgMEBQUGBgYGBgYGBgUFBQUEBQQDAwMDAgICAQEAAAAHAAABAgIDBAUEBQYGBgYGBgYGBgUFBAQEBAQCAgIBAQAAAAB4AAEQHy47R1NfaXN9ho+X","n6eutbzDyc/V2t/l6u7z9/wAAAB7GP8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOBwAHAgEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AABIOAAGAgEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC2PwAJAwEBAAEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABKgAQBQMBAQAAAQEAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAADnFwAUCQQDAgIBAAABAQEAAAAAAAAAAAAAAAAAAAAAAAAAAACEDQAXDAcEAwIBAgEBAAABAQEBAAAAAAAAAAAAAAAAAAAA","AADtBwAWDwkGAwICAQEBAQEAAAAAAQEBAAAAAAAAAAAAAAAAAADlBAAUEAsHBgQDAgIBAQEBAQEAAAAAAQEAAAAAAAAAAAAAAAAhAwAREQwJBgUEAwICAgEB","AQABAQAAAAABAQAAAAAAAAAAAAAaAgAPEA4LCAYFBAMCAgICAQEBAAEBAAAAAAEBAAAAAAAAAAB7AQANDw0LCQcGBQQDAgICAQIBAQEAAQEAAAAAAQAAAAAA","AAASAQAKDg4MCgkGBQUEBAICAgEBAgEBAQABAQAAAAEAAAAAAADIAAAJDA0MCggIBwUFAwQCAwICAQEBAQEBAAEAAAABAAAAAACYAAAHCwwLCwoIBgYFBQME","AgMCAgICAQEAAQABAAAAAQAAAAB2AAAHCgsLCwkICAcGBQUDBAICAgEBAQEBAQEAAQAAAAAAAABdAAAFCQoLCgoJCAcGBQUFAwQDAgMCAgIBAQEBAAEAAAAA","AABMAAAFBwkKCgkJCAcGBgUEBQMDAwICAQECAQEBAQABAAAAAAA9AAAEBwkJCQoJCAgHBgUFBAQEAwMDAwIBAQEBAQEAAAEAAAAyAAADBgcICQkJCQcIBwYG","BQUEBAMCAgICAQEBAQAAAQAAAAAqAAAEBQcICAgICAgHBwcGBQQEAwMDAwICAgEBAAEBAAAAAAAkAAACBQYICAgICAgHBwYGBgUFBQQDAgMCAgIBAgEBAAAA","AAAeAAADBAYGCAgIBwcHBwcGBQYFBAQEBAMDAgICAQEAAQAAAAAaAAACBAUGBgcHCAgIBwYGBgUFBQQEAwMCAgIBAQEBAAEAAAAWAAACBAUGBwcHBwcHBgcG","BgYFBAQEBAMDAwICAQEBAQAAAAAUAAABAwQFBQYHBwcGBwYGBgUFBQUEBAMDAwICAgEBAAAAAAARAAACAwQFBgYGBgYHBwcHBgYGBQUFBAQEAwMCAgIBAQAA","AAAPAAABAgQEBQUGBgYGBgYGBgYFBgUEBAQDAwIDAgEBAQEAAAAOAAABAwMEBAUFBgYGBgYGBgYGBQUFBAQEAwMCAgIBAQAAAAAMAAACAgMEBQUGBgYGBgYG","BgUFBQUFBQQDAwMDAgICAQEAAAAKAAABAgIDBAUEBQYGBgYGBgYGBgUEBAQEBAQCAgIBAQAAAACRAAEQHy47R1NfaXN9ho+Xn6eutbzDyc/V2t/l6u7z9/wA","AAAYHv8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABx9wAYBAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB8/ABwGwoEAgEBAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAAD4AOF3ORgMBwUCAgIBAQEBAAAAAAAAAAAAAAAAAAAAAAAAAACeBM8ALx0RCQUFAwICAQEAAQEBAQEBAAAAAAAAAAAAAAAA","AABeAAIAMiweFA0IBgQEAwICAgEBAQEAAQEBAQEAAAAAAAAAAQAT/xgAJi8nHRUPCwkGBQQEAwMCAgECAQEBAAABAQEAAAAAAACr/yMAESIlIRoUEAwKCAcF","BAQDAgICAgEBAgEBAAABAAAABADQAhPv8AEMEBEQDgsJCAYGBQMDAwMCAgIBAAEAAQAAAQAABAA/BgDp4uz3AAQGBgcGBQUEAwMDAgEBAQEBAQABAAEAAAAA","BgAJCAD17e/1+wACBAQEBAMDAwMCAgIBAQEBAQEAAAAAAAAADgDHCQD89/b4+/4BAgMDAwMCAwICAgICAQEBAAABAQAAAAAADwBYCwAA/vz8/f4AAQECAgMD","AgICAQEBAQEAAQEAAAABAAAAGwB2DAACAQAA/wEBAQICAwICAgICAgEBAQABAQEAAQEAAAAAGQBCDQAEBAMCAgECAgIDAgICAgICAgICAQIBAAABAAAAAAEA","KACRDQADBQUEBAQDAwQDAwMDAgICAQIBAgEBAQEAAAAAAAAALwCFDQAEBQUGBQQEBAMDAwMCAwICAgECAQEBAQEBAQEAAQAAPQAWDQAEBQYGBgYFBQUEBAME","AwMCAgIBAgEBAQABAAABAAAANQBwDAADBQYGBgYGBgUFBAUDAwMDAwMCAgICAQEBAQAAAAAASACbCwADBQYGBwYGBQUFBQQEBAQDAwIDAQIBAgEAAQEAAAAA","PgCxCgACBQYHBgcHBwYGBQUFBAMDAwMCAwICAQICAQEBAAAATADJCQADBAUGBwYGBgYGBgUFBAUEAwMDAgICAgEBAQABAQAAYgDLCAACBAUFBgcGBgYGBgUF","BQQEBAMDAwICAgIBAQEAAAAAYgDyBwACAwQGBgYHBwcGBQYFBQUFBAQDAwMCAgICAQEBAAEAfAAiBwABAwUFBQYGBgYGBgYGBQUEBAQEAwMDAgEBAQEAAQAA","dgBcBgACAwMEBQUGBgYGBgUFBgUFBQQEBAMDAgICAQEBAAAAigCoBQABAgQEBQYFBgYGBgYGBQUFBAQEAwMCAwMCAgEBAQAApgACBQACAwMEBQUGBQUFBgYF","BQUFBQUEBAQEAwICAgIBAQAApgB5BAABAgMEBAQEBQYGBQUGBgUFBQQEBAMDAwMCAQEBAAEA0gDyAwABAgMDBAUFBQUFBgYFBQUFBQUEBAQDAwICAgIBAQAA","5gB+AwABAQIDAwQEBQUFBQUFBQUFBAQFBAQEAwMDAgEBAQAAwfjbHwEPHis4RE9bZW95gouUnKSrs7rAx83T2d/k6u/0+P0AAAAlHv8AAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAACE9wAaBQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH/ABzHAsFAwIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AAC7AdhyOxoNBwQDAgIBAQEAAAAAAAAAAAAAAAAAAAAAAAAAAADXBM8AMB8SCwcEBAICAQEBAQEBAQEAAAAAAAAAAAAAAAAAAABEAP0ANC8gFQ4KBgUEAwIC","AgEBAAABAQEBAQEAAAAAAAAAAwCt/g8AKDQsIBcRDQkHBgQEAwMCAgICAQEAAAABAQEAAAAABQDF/hgAFykrJyAYEg4LCQgFBAMDAwIBAgECAQEBAAABAAAA","BAAsABj6ABIdHh0ZFRIOCwkIBwYFBAMDAgIBAgEAAQAAAQAACQDiAB0C+wQPFhcYFRIQDQsKCAcGBQUDAwICAQICAQEAAAEAEwCmBADs4uXv+AADBwcHBwcG","BQQEAwIDAgICAQAAAAABAP8AGQACBgD17Ovv9fr+AQMEBQQEBAQDAwMCAgIBAQEBAQEAAAEAIgBYBwD69PLz9vn9/wECAgMDAwMCAwIDAgEBAgEBAAAAAAAA","LwCZCAD/+/n5+fr8/gABAgICAgICAQIBAQICAQEAAQAAAAAAPQC8CQAA//38/f7+//8AAQICAgICAgEBAQEBAQEBAAEBAQAAQACbCgACAgEA//8AAAEBAQEC","AgICAgICAgEBAAABAQAAAAAAUwBJCwACAwMCAgEBAQICAgICAgECAQIBAQEBAQEAAAEAAAAAWwCiCwADBAQEAwMDAwICAgICAgMCAgECAQIBAQEBAQAAAAAA","bwC6CwADBAQFBQQDAwMDAwMCAwICAgIBAgEBAQEBAAABAAAAeACUCwACBAUFBQUFBQQEBAMEAwMDAwICAgEBAQEAAQEAAQAAcAA4CwACAwUFBQUFBQUFBAUD","AwMDAwMDAgICAgECAQEBAAAAlAC+CgACBAQFBgYGBQUFBQQFBAQDAwMCAgICAgIBAQEAAAAApQAhCgACAwUFBQYGBgYFBQUEBAQEAwMDAwMCAQEBAQABAQEA","zgB9CQACAwQFBQUFBQUFBQUFBAQDBAMDAgICAgIBAQEAAAAA5AC7CAACAwQEBQUGBgYGBgUFBQQFAwQDAwICAgECAQEBAAAAAgEOCAABAwMEBQYFBQYFBQUF","BQUEBAMEAwMDAgIBAQEBAQAAEAFiBwABAgMEBQQFBgUGBQUFBQQEBQQDBAMCAgICAgEAAAAAIgG3BgABAgMEBAUFBQUFBgYFBQUFBAQEAwMDAwICAQEBAAAA","QQEeBgACAgMEBAQFBQUFBQUFBQUFBQUEBAQDAwMCAgEBAQAAVAGLBQAAAgMDAwUEBQUFBQUFBQUEBAQEBAMDAwICAgIBAQEAZgEFBQABAgIDBAMEBAUFBQUF","BQUFBQQEBAQEAwMCAgEBAAAA0vItMgEPHCk1QU1YYmx2f4iRmaGpsLi/xczS2N7k6e/0+f0AAAArHv8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AACL9wAaBQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACL/AB1HQwGAwIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAtVwOxoNCAQDAwIBAQAA","AAAAAAAAAAAAAAAAAAAAAAAAAADyBM8AMSATCwcFAwICAQIBAQEBAQEAAAAAAAAAAAAAAAAAAABJAPsANDEiFg8KBwYEBAICAgEBAAABAQEBAQEAAAAAAAAA","CACF/gwAKjUtIhoSDQkHBQUEAwMCAgIBAQEAAAABAQAAAAAAAQDw/hH7EygrJx8ZFBAMCQcGBQQDAwICAQECAQEBAAEBAAAACwDr/xH4ABIeIB8bFhIPDQoI","BgUFBAMDAwIBAQEAAQAAAQAAFQD6/xsDAAoVGxwbGRUTDw0LCQgGBQUEAwICAgEBAQEAAAAAFAAwARgD+f0EDBATExIQDw0LCggHBwYFBAQDAgICAQEBAAEA","KABtBADy5+Xs8/r/AgUGBgYGBgUFBAMDAwICAgEBAAAAAAAALgCGBQD38O3u8vf7/wECAwQFBAQEAwMCAgICAgIBAQEBAQAARwC5BgD89vTz9ff5/P4AAQIC","AwMCAgICAgIBAQEBAQAAAAAAUQDEBwD+/Pn5+fn7/P7/AQEBAQICAgICAQEBAQEAAAEAAAAAYwDHCAAB//78/P39/v4AAAABAQECAgEBAQEBAQABAQAAAAAA","bQCXCQABAgAA/////wAAAAEBAgIBAQIBAgEBAQEBAQEBAAAAewA6CgACAgMCAgEBAQEBAQICAQECAgECAQICAQEBAAAAAQAAiwCaCgACAwMEAgICAgICAgIC","AgICAgICAgEBAQEAAQEBAAAAqgDSCgACAwQDBAQDAwMDAwICAwMCAgICAgIBAQEBAQAAAAAAwgDECgACAwQFBQQFBAQDBAQDAwIDAgICAQECAQEBAAEBAAEA","7QCcCgACBAQEBAUEBQQEAwMEAwMCAwMCAgIBAQEBAQAAAf8ACAFDCgABAwQFBQUFBQUFBQQEAwQDAwICAgICAgEBAQEAAAEAKQHRCQACAgMEBQUFBQUFBQUE","BAMEAwMDAwICAQIBAQABAAAALAFPCQACAwQEBQUGBQUFBAUFBQUEBAMDAwMCAgEBAQEAAAAARgG5CAABAgMEBAUFBQUFBgUEBQQEAwQDAwICAwICAQEBAQAA","bQEpCAABAwMEBAUFBQUFBQUFBAUEBQQEAwMDAgICAQEBAAAAhwGKBwABAgMDBAQEBQYGBQUFBQQFBAQEAwQDAwMCAgIAAQAApQHsBgABAgMEBAQFBQQFBQUF","BQUEBAQEBAMDAgICAgEBAAEAwwFnBgABAQIDBAQEBAUEBQUFBQUFBQQDBAMDAwICAQECAQAA/QHYBQABAgICAwQEBQUFBQUFBQQFBAUEBAQDAwMCAgIBAQAA","qu0iPwEOGyg0P0pVX2lzfIWOlp+mrrW9w8rR193j6e7z+P0AAAAvHv8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACM9wAaBQEAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAACO/AB2HgwGAwIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAvAtNvOxsOCAUDAwIBAQAAAAAAAAAAAAAAAAAAAAAAAAAA","AAANBc8AMSATDAcFAwMCAQIBAQEBAQEAAAAAAAAAAAAAAAAAAABNAPsANTEiFg8LCAUFBAICAgEBAAABAQEBAQEAAAAAAAAACABu/gsAKjcvIxoTDgoHBQUE","AwMCAgIBAQAAAAABAQEAAAAABAAV/wz4EScrJyAZEw8MCgcGBQQDAwICAQIBAQEBAAABAAAAEwDC/w73ABMfIh8cGBQQDQsIBwYFBAMDAwICAQEAAQAAAAAA","EgC3/xYCAAsWHB4cGhYTEA4MCQgHBgUEAwMCAgEBAQEAAQEAIQA8ABwIAAMMExcYFxcUEg8ODAkIBwYGBQMEAwICAQEBAAAALwB7Agz88fH1/QMICgsMCwsJ","CQgHBgYEBAQDAgICAQEBAQAARwCSBAD17ens7/X5/gEDBAQFBQUEBAMDAgICAgIBAQAAAAAAVgCOBQD69PDw8/X5/P7/AQMDAgMDAwMCAwIBAQEBAQEAAAAA","YACYBgD9+ff19ff5+/z/AAACAwIDAgICAQICAgEBAQABAAAAbwCRBwAA/fv6+vr7/P7+AAEAAQICAgICAgEBAQEBAAEAAQAAgwBrCAAAAP/+/v79/f7//wAB","AQEBAgECAQIBAQEBAQEBAAAApAAnCQABAQEA//////8AAAABAQECAQIBAgEBAQEAAQAAAAAAwgC0CQACAgICAgEBAQEBAQEBAQIBAQECAQEBAQEBAAEAAAEA","7wAKCgACAwMDAwMDAgICAgICAgEBAgIBAgEBAQEBAQABAP8A+wA9CgABAwMEAwMDAwMDAwMCAgMDAgICAQICAQEAAAAAAQEAMAE6CgACAwQEBAQEBAQDAwMD","AwICAgICAgEBAQABAQEAAAAAPgEZCgABAgMEBQUEBQQEBAQEAwMDAwICAgICAgIBAQAAAAAAXQHLCQACAwQEBAUFBQUFBQQEBAQDAwMDAgICAQEBAAEBAAAA","gwFvCQABAgMEBAQFBAUFBAQEBAQEAwMCAwMCAgICAgEAAQAAjQH8CAACAwMDBQUFBQUFBQUFBQQEBAQEAwICAgIBAQEBAAAAzQF8CAABAgMEBAQEBQUFBQUE","BAUEBAMDAwMDAwICAQEBAQAA+AH4BwABAgMDBAQFBQQEBQUFBQQEBAQEAwMCAgICAgEBAAEADAJyBwABAgIDAwQEBAUFBQUFBQUFBAQEBAQDAwICAQIBAQAA","UQLeBgABAQMDAwQEBQUFBAQFBAQEBQQDAwMDAgICAgEBAAAAcAJjBgAAAgIDBAQEBAQEBQUEBQUFBAQEBAMDAwMCAgEBAQAA0+j1SAEOGiYyPUhTXWdxeoOM","lJykrLS7wsnQ1tzi6O7z+P0AAAAwHv8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACN9wAaBQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AACR/AB2Hg0GAwIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABJAtJvOxoOCAUDAwIBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMBc8AMiETDAcFAwMDAQIB","AQEBAQAAAAAAAAAAAAAAAAAAAABRAPoANDEjFxALCAUEBAMDAgEBAAEBAQEBAQAAAAAAAAAACwBr/goAKzgvJBsTDgsHBgQDAwMCAgIBAQAAAAEBAAAAAAAA","CQAl/wr3ECYsJyAaFA8NCQgGBAQDAwICAQIBAQEAAQEAAAAAEgCv/wz2ABQgIx8cGBQQDQoJCAUFBAMDAwICAQABAQABAQAAHACV/xQAAAsWHSAeGxgUEQ8M","CgkHBgUEAwICAgIBAAEAAAAAIwAMABgHAAQNFBgZGRcVExAODAoJBwcGBQUEAwICAgEBAAEAPADhABkI/v0CCA0RExMSEQ8ODAsKCQcGBQQEAwMCAgEBAQAA","UADqAwD16+jq7/X6/gEEBQYGBgYEBQQDBAMCAgICAQEAAAAAYgDWBAD58u7u8PT4+/4AAgMDBAQEAwMDAgICAgEBAAABAAAAbADNBQD89/Tz9PX3+vz+/wEC","AgIDAwMDAgICAgIBAgEBAQAAiQCyBgD+/Pr4+Pn6+vz9//8AAQICAgICAgIBAQEBAQEAAAAApACYBwAA//38/Pv8/f3+/wAAAQEBAQIBAgECAQEBAAEBAAEA","zQBXCAAAAAD//v79/v///wABAAABAQECAQEAAQAAAQAAAQAAAAH7CAACAQEBAAAA//8AAAAAAQEBAQEBAQEBAAEBAAAA//8ADgFoCQABAwICAgICAgEBAQEB","AQIBAQEBAQIBAgEAAQEAAQEATAG3CQABAgMDAwMCAgMCAgICAgECAgIBAQEBAAEBAAAAAP8AVwHZCQACAwMEBAMEAwMDAwMDAgMCAgECAgECAQABAAAAAAEA","cQHRCQABAgMDBAQEBAQEBAMDBAMDAwMCAgIBAgIBAQEBAAAAlwGpCQACAgQEBAUEBQQEBAQEAwMDAwMDAgICAgIBAQEAAQAA0QFlCQABAwMEBAQFBAUFBAQE","BAQEAwMDAwMCAgECAgEBAAAA7AEMCQABAgMDBAQEBQUEBQUEBAQDBAMDAwIDAgIBAQEBAAAALgKuCAABAgIEBAQFBQQFBQQFBQQFAwMDAwMCAgICAQEBAQEA","UgIxCAABAgMDAwQEBAUFBAUFBAQEBAQDAwMDAgICAgEAAAAAfgK0BwABAgIDBAQEBAQEBQUEBQUEBAQEAwMDAwIBAQEBAQAAogI1BwABAQMDAwQEBQUFBQUF","BAQEBAQEBAMDAgICAgEBAAAAvAKyBgABAQICAwMEBAQEBAQEBQUFBQQEBAQDAwMCAgIBAQEAdeTFUAENGiUxPEdRW2VveIGKkpqiqrK5wMfO1dvi5+3z+PwA","AAAxHv8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACN9wAaBQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACS/AB3Hg0GAwIBAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAABUAtJuPBoOCQUDAwIBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVBc8AMSIUCwgGBAMDAQIBAQEBAQAAAAAAAAAAAAAAAAAA","AABSAPoANTEjGA8KBwUEBAMDAgEBAAEBAQEBAQEAAAAAAAAADwBj/gkAKzgvJBsUDwsIBgQDAwMCAgIBAQAAAAAAAAAAAAAABwA0/wj1DyYsJyAaFBAMCggG","BQQDAwICAQIBAQEBAQEAAAAAGACh/wr3ABMgIyEdGRQQDQsJBwYFBAMDAwICAQABAQABAQAAHgCA/xL/AAwYHiAeGxgVEg8NCggIBgUEAwMCAgIBAQEAAAAA","LADh/xcGAAUNFRkaGhkWExEODQsJCAcGBQQEAwMCAQEBAAAAQQCNABkJAP8ECxAUFRQUExEQDQwKCQgHBgUEBAMDAgEBAQEAYAC+Agj88vDx9vsABAcJCQkI","CQgHBgYFBAQDAgIBAQEAAAAAaQBRBAD48ezt7/P3+v0AAgMEBQUFBQMDBAIDAgICAgECAQAAggA4BQD79vLx8vT2+fz9/wACAgIDAwMDAgMCAgEBAQEAAAEA","pgAYBgD++vj39vf4+vv9/gAAAQEBAQICAQEBAQEBAAEBAAAAyQD0BgD//vz6+vr7+/z9/v8AAAEBAgIBAgEBAQEBAQD/AQAA9gC0BwAA///+/f39/f7+//8A","AAEBAAEBAQEBAQAAAAAB/wAAEAFiCAABAQEAAP///////wAAAAABAQEBAQIBAQEBAQEAAQAASQHjCAABAgECAQEAAAABAQAAAQEBAgECAQEBAQEAAAAAAAAA","dQFDCQABAgMCAwICAgIBAQICAgIBAQEBAgEBAQEBAQAAAAAAiwF/CQACAgIDAwQDAwIDAwICAgICAgIBAQEBAQEBAAEBAAAAtQGPCQABAgMEAwMEBAQDAwMD","AwIDAgICAgICAQEBAQEAAAAA6QF6CQABAwMDBAQEBAQEBAQEAwMCAwMDAgICAgEBAQABAQAAJAJMCQACAgMEBAQEBAQEBAQDAwQEAwICAgICAgIBAQEAAAAA","PwIICQABAgMDBAQEBAUFBAQFBQQDAwQDAwICAgICAQEBAQAAeAK2CAABAgMDAwQFBQQEBQUEBAQEBAMEAwMCAgIBAgEBAAEAkwJRCAABAgIDBAQEBAUFBAQF","BAQFBAQDBAMDAgICAQEBAQAAuwLiBwABAQMDAwQEBAQFBQUEBQUEBAQEAwMDAwICAgIBAAAA4QJ2BwAAAgIDAwMEBQUEBQUFBAQEBAQEBAQDAwICAgEBAQAA","RQPsBgABAQICAwQDAwQEBAQEBQQEBAQDAwMDAgMCAQEBAQAAUeAZVwENGSQwO0VQWmNtdn+IkJmhqbC4v8bN1Nrh5+3y9/0AAAAxHv8AAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAACN9wAaBQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACS/AB3Hw0GAwIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AABdAtFuOxoOCQUDAwIBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVBc8AMSIUDAgGBAMDAgIBAQEBAQAAAAAAAAAAAAAAAAAAAABSAPoANTEjFxALBwYEAwMD","AgEBAAEBAQEBAQEAAAAAAAAAFABn/ggAKzgwJRsUDwoIBgQEAwMCAgIBAQAAAAAAAAAAAAAABAA0/wj1DyYsJyAaFRANCggGBQQDAwICAgIBAQEBAQEBAAAA","IQCk/wn1ABQgIyEdGBUQDgsJBwYFBAMDAgICAQABAAAAAAAAHQBn/xAAAAwYHiAeHBkVEhAMCwkIBwYFBAMDAgICAgEAAQAAOgDH/xYFAAUOFhobGxgXExEP","DQsJCAcFBAQDAwIBAQEBAAAASgBnABcIAAAFDBEVFhYVFBEQDgwLCQgHBgUEBAQDAgEBAAEAYgDGARAD+ff5/QIGCQwNDQ0MCwoJCAcHBgUEAwICAgIBAQAA","cwDsAwD38Ovr7vL3+/4AAwQFBQYFBQQEBAMDAwMCAQEBAQEAmwDMBAD79fHw8fP1+Pv9/wECAwMDAwMCAgICAQEBAQEBAAAAvwCbBQD9+vf29fb3+fr9/v8A","AAECAgMDAgIBAgEBAQAAAQAA4AB5BgD//Pv5+fn6+vz8/f7/AAEBAQEBAgECAQEAAAEAAAAAGwE0BwAA//79/fz8/Pz9/v//AAABAQEBAAEBAQEBAQAAAP8A","MAHmBwAAAAD//v/+//////8AAAAAAQEBAgIBAQEBAQABAAEAiQFuCAABAgEBAQAAAP8AAAAAAQABAAABAAABAAAAAAH/AAAAkAHgCAABAgICAgICAQIBAQEB","AQIBAgIBAgIBAgEBAQABAAAAwQElCQACAQIDAwMDAgICAgICAgICAQECAQEBAQEBAAEBAQAAAQJMCQABAwMDAwMDAwMDAwMDAgICAgIBAgIBAQEBAQAAAAAA","NwJKCQABAgMDAwMDBAMEAwMDAwMCAwICAgECAQEBAQEAAAAASQIsCQABAgMDBAQFBAUEBAQEBAMEAwMDAgMCAgIBAQEBAQAAmAIBCQABAgIEBAQEBAQEBAUE","BAQDAwQDAwICAgICAQEAAAAAoQKwCAABAgMDAwQEBQUFBQQEBAQEBAMDAwMDAgICAgECAQEA5gJdCAABAQIDBAQEBAQEBQUFBAQFBAQEAwMDAwIBAQEBAAAA","BgMACAABAgMCAwQEBAQFBAQEBQUEBAQEBAMDAgICAgIAAQAAWwOTBwABAQIDAwMDBAQEBQQFBAQEBAMDAwMCAwICAQEBAAAAggMhBwAAAgECAwMEBAQEBAUE","BQQEBAQEAwMDAgMCAgEBAQEAb9x1XAENGCQvOUROWGJrdH2Gjpefp6+2vsXM09ng5uzy9/wAAAAxHv8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AACN9wAaBQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACS/AB3Hw0GAwIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABfAtFuOxoOCQUDAwIBAQEA","AAAAAAAAAAAAAAAAAAAAAAAAAAAVBc8AMSIUDAgGBAMDAgEBAQEBAQEAAAAAAAAAAAAAAAAAAABSAPoANTIjFxALCAYEAwMDAgEBAAABAQEBAQEAAAAAAAAA","FgBk/gcAKzgxJRsUDgsIBgUEAwMCAgIBAQAAAAAAAAAAAAAABQA7/wf0DyUrKCEaFRANCwgGBQQEAwICAgICAQEBAQEBAAAAJACd/wj1ABQhIyEdGRQRDQsJ","CAYFBAMDAgIBAQEBAAAAAAAAJgBc/xD/AA0YHiEfHBkVEg8NCwkHBwYFBAMCAgEBAgEAAQAAOQC2/xQFAAUPFxocGxoXFRIQDQwKCAgGBQQEAwMCAQEBAAEA","WQBUABYHAAAFDBEVFhYWFBEPDgwLCQcHBgUEBAMDAgEBAP8AZwACARYKAP7/BAkMDxAREBEPDgwLCgkHBgYFBAMCAgICAgEAhACjAwD37+rr7vH2+/8AAwQF","BQYFBQQEBAMDAgIDAgEBAQEAtQBvBAD69PHv8PP2+Pr9AAECAwMDAwMDAgMCAgIBAAEAAAAA3AA/BQD8+PX09PX2+Pr8/f8AAQICAwMCAwECAgEAAQAA//8A","9wATBgD//Pr5+Pj5+vv8/f7/AAACAQECAgIBAQEBAQEAAQEAKgHMBgD///38+/v7/Pz+/v7//wAAAQIBAQICAQEBAQABAAAAcwF8BwAAAP///v7+/f79/v8A","/wAAAAABAAABAQEBAAEAAAAAlQERCAABAAEAAAD///8A/wAAAQABAQEBAgEAAQAAAQAAAAAAzgGICAABAgICAgEBAQEAAQAAAQEAAQEBAQEBAQEBAAEAAAAA","7QHeCAABAgICAgICAgICAgICAQICAgEBAQICAQEBAQABAQAANgIOCQABAgIDAwMDAwIDAgMCAwICAQICAQEBAQEBAQEAAAAAZgIZCQACAgMDAwQEAwQDBAMD","AgMDAwICAgIBAQEBAQEBAQAApAIQCQABAgMDBAMDBAQEAwMEBAMDAwMDAgICAgIBAQAAAAAAtgLpCAABAgIDAwQEBAQEBQUEBAQDAwMDAwIDAgICAQIBAAEA","+gKtCAABAQMDBAQEBQQEBAQEBAQEBAQDAwMCAgIBAQEBAQAAMwNhCAAAAgIDAwMEBAUFBAQFBAQEBAMDAwMDAgICAgEBAAAAYgMMCAABAgIDAwQEBAQEBQUE","BAQEAwQEBAMCAwICAQEBAQAAngOrBwABAQICAwMEBAQEBAQEBQQEBQQDAwMDAwICAgEBAAEAkQNCBwABAQICAwMDBAQFBAUFBAUFBAQEBAQEAwMCAgIBAQAA","9dj8YAEMGCMuOENNVmBpc3uEjZWdpa21vMPK0djf5evx9/wAAAAxHv8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACN9wAaBQEAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAACR/AB3Hw0GAwIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABcAtFuOxoOCQUDAwIBAQEAAAAAAAAAAAAAAAAAAAAAAAAA","AAAVBc8AMSIUDAgGBAMDAgECAQEBAQEAAAAAAAAAAAAAAAAAAABQAPkANTIkGBALCAYEAwMCAgEBAQABAQEBAQEAAAAAAAAAGABj/ggAKzgwJRwVDwsIBwUE","AwMCAQICAQAAAAAAAAAAAAAACgA//wb0DyUsJyAaFRANCggGBQQEAwIBAgICAQEBAQEAAAAAKQCb/wf1ABQgIyEdGBURDQsJCAYFBAQDAgIBAQABAAAAAAAA","JwBT/w/+AA4ZHyEfHRkWExANCwoHBwUFBAMDAgIBAgEBAQAAPgC5/xIE/wQOFxscGxoXFRIQDQsKCAcGBQUDBAMCAQEBAAAAXQBGABUG/wAGDBIVFxYWExIQ","Dw0LCggHBgUFAwMDAgIBAQEAawDBABcLAv8BBgoOEBMTExERDw0NCwoIBwYFBQQDAwICAgEApQD8AgX78+/v8vb6/gEDBQcGBwgGBQYFBAQDAgICAQEA/wAA","wQAoBAD69PDv8PL1+fv9AAECAwMEBAMEAwICAgEBAQABAQAA8gDwBAD8+PXz8/T29/n8/f8AAAEBAgIBAwICAQIBAAEAAP8AEAHABQD++/n49/f4+fr7/f4A","AAECAgIDAgICAgEBAgAAAAEAUwF7BgD//v37+vv7+/z9/f7+AP8AAQEBAQEBAgEBAAEBAAAAlwEpBwAAAP7+/v39/f39/v7//wAAAAAAAAEBAAEBAQEAAAAA","sQHABwABAAAA///+//////8AAAAAAQEBAgEBAQEBAQABAQAA7wE1CAABAQIBAQEBAAABAAEAAQEBAAEBAAEBAQEAAAEBAAAAMAKZCAABAgICAgICAgIBAgEC","AQEBAgEBAQEBAQABAQAAAAAAZQLUCAABAgICAwIDAgICAgICAgICAQICAgEBAQEBAAAAAQAAsgLvCAABAgIDAwMDAwMDAwMCAgMCAgIBAQIBAQEBAQEA/wAA","1gLvCAABAQMDAwQDBAQEAwMEBAMDAwIDAwICAgIBAQEBAQAA7wLQCAABAgIDBAQEBAQEBQQEBAQEBAQDAgIDAgICAgEBAAEAPwOhCAABAgMDAwMEBAQEBAUE","BAMEAwMDAwMCAgIBAQEAAQAAYANiCAABAgIDAwQEBAQFBAQEBAUEBAQEBAMDAwICAQEBAQAAkgMSCAABAQIDAwMEBAUEBQQFBAQEBAQDAwMDAgICAgIBAAEA","tQO0BwAAAgICAwQDBAQEBAUEBQQEBAQEBAQDAwICAgEBAQAA5QNYBwABAQICAwMEBAQEBAQFBAUEBAQEAwMDAwMCAgICAQAAv9X3ZAEMFyItN0FLVV5ocXqC","i5OcpKuzu8LJ0Nfe5Orw9vwAAAAwHv8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACN9wAaBQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AACR/AB3Hw0GAwIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABWAtFuOxoOCQUDAwIBAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAUBc8AMSIUDAgGBAMDAgEC","AQEBAQEAAAAAAAAAAAAAAAAAAABRAPkANTIkGBALCAYEBAMCAgIBAQABAQEBAQEAAAAAAAAAHABd/gcALDgwJRwVDwsIBgUEAwICAQICAQAAAAAAAAAAAAAA","CQBE/wb0DiUsJyAaFRANCggGBgUEAwIBAgICAQECAQEAAAAALACU/wb0ABUgJCIdGRUSDgsKBwUFBQQDAgIBAQAAAAABAAAALwBN/w//AA0aHyEgHBoVEhAN","CwoIBgUFBAMDAwIBAgEAAQAAQQC+/xAC/wQOFhscHBkYFRIQDgwKCAgGBQUEAwMDAQEBAAEAXwA8ABQG/wAGDRIVFxcWFRMQDw0LCwgHBwUEBAMCAwICAQAA","gwCjABcLAQACBwsPERMTExIRDw0MCwoJBwYGBAQDAgIBAQEAsQBaAgoA+fTz9/v/AgUHCAkJCQkIBwcGBQUDAwICAQEAAP8A1gDwAwD58+/v7/H1+fv9AAED","AwQFBAMDAwMDAgICAQABAQAAAwGzBAD89/Ty8vT19/r8/f8AAQICAwMDAwICAgIBAQEBAAEALwF7BQD++/j39vb3+Pn7/P7/AAABAQECAQICAgEBAQEAAAAA","dAE1BgD//fz6+vr6+/v8/f3+//8AAAEBAgEBAQEBAQAAAAAAnQHfBgD////+/fz8/P39/v///wAAAQEBAQEBAQEBAQIBAQAA4gF6BwABAQD//////v7/////","AAAAAAEAAQEBAQEBAQABAQAAIgL8BwABAQABAQAAAAD//wAAAAEAAAABAAEAAAEAAAAA/wAAXgJZCAAAAQICAQIBAQEBAQABAQEBAgEBAQEBAQABAQAAAAAA","pgKdCAABAgICAwIDAwICAgICAgECAQEBAQABAQEAAAEAAAAA0wLECAABAQIDAwMDAwMDAwMCAgICAgICAgICAQEBAQEAAQAABgPSCAABAgMCAwQDAwQEAwME","AwQDAwMCAgIBAgICAQABAAEANwO5CAABAgIDAwMEBAQEBAQDBAMEAwMEAwMDAgEBAQEBAQAAbQOTCAABAgMDAwQEBAQEBQQFBAQDBAQDAwICAgMCAgIBAAAA","jgNYCAABAQIDAwMEBAQEBAUEBQQEBAMDAwQDAwICAQEBAQEAzQMWCAABAgIDAwQDBAQFBAQEBAUFBAQEBAMDAgICAgEBAQAAEATBBwABAQICAwMEBAQEBAQF","BAQEBAQDAwMDAwICAgIBAAAAIARtBwAAAQICAwMDAwQEBQUEBQQEBAQEBAMDAwMCAQEBAQAAg9JiaAEMFyEsNkBKVF1mb3iBiZKaoqqyucHIz9bd5Orw9vwA","AAAwHv8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACN9wAaBQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACP/AB3Hg0GAwIBAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAABSAtFuPBoOCQUDAwICAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAOBc8AMSIUDAgGBAMCAgECAQEBAQEAAAAAAAAAAAAAAAAA","AQBQAPkANTIkGBALCAYEBAMCAgIBAQABAQEBAQEAAAAAAAAAIgBd/gcALDgwJRwVDwsIBgUEAwICAQIBAQAAAP8AAAAAAAAABQBJ/wX0DiUsJyAaFREOCggH","BgUEBAICAgICAQICAQEBAAAAMQCO/wb0ABUhJCIeGRQRDgwJCAYFBAQDAgIBAQEAAQAAAAAAMgBH/w7+AA0ZICIfHRsWExANCwkIBgYFBAMDAwICAQEAAQAA","RQDD/w8B/gQOFhocHBkYFRIQDgwKCQcHBgUEAwICAgEBAAEAaAA1ABMG/gAGDRMWFxcWFRMRDw4MCgkHBgYFBAMCAgICAQAAiACQABYKAgACBwwQEhMUExIR","Dw0MCwoJBwYFBQQDAgIBAQEAxgDOAQ8F/vn5/P8DBgkKDAwMCwsKCQcHBgUEAwMDAgEAAAAA6ADEAwD58u7u7vD0+Pv9/wECAwQFBAQDBAMDAgICAQEBAP8A","DwF9BAD89/Ty8vT19/r8/v8BAgICAwMDAwMDAgIBAQEBAQEATQFDBQD9+vj19vb3+Pn7+/7/AAABAgICAQIBAgEBAQEAAAAAfgH2BQD//fv7+fn5+vv7/f3+","/gAAAAEBAgECAgIBAQEBAQAAywGjBgD///79/Pz8/Pv9/f7+AP//AAEBAQEBAAEBAQABAAAACwI9BwABAAD///7+/f7+/////wABAAABAAEAAQABAAEAAQEA","WALGBwAAAQAAAAD/AAD///8AAAAAAQAAAQABAQEAAQAA//8AiAImCAABAQIBAQEBAQABAQEAAAEAAQEAAAEAAAABAAAAAQAAzQJxCAABAQECAgIDAgICAQEC","AgECAQECAQEBAQEAAQEBAAAABQOcCAABAgMDAwMCAgMCAwMCAgICAgICAgECAQEBAQAAAAAALAOtCAABAgIDAwMEBAMEAwMEAwMDAwMCAwICAgICAQEBAQEA","hQOkCAABAgICAwMDAwQDBAQDBAQDAwIDAgICAgEBAQEAAAAAnQOJCAABAQIDAwQEBAQEBAQEBAQEAwQDAwMCAgICAQEBAQAA0QNUCAAAAgMDAwMEBAQFBAQE","BAQEBAMDAwMDAgIBAgEBAAEA7AMVCAABAQICAwQDBAUEBQUFBAQEBAUEBAQDAwMDAgIBAQAAPATCBwABAgIDAwMEBAQEBAQEBQQEBAMEAwMDAwICAQEBAAAA","NQRvBwABAQICAwMEBAQEBAUFBAUFBQUEBAQDAwMCAgIBAQAAtM9sawELFiArNT9IUltlbnZ/iJCYoKiwuL/HztXc4+nw9vwAAAAvHv8AAAAAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAACN9wAaBQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACO/AB3Hg0GAwIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AABMAtFuPBoOCQUDAwICAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAALBc8AMSIUDAgGBAMCAgECAQEBAQEAAAAAAAAAAAAAAAAAAQBPAPkANTIkGBALCAYEBAMC","AgIBAQABAQEBAQEAAAAAAAAAJQBe/gYALDgwJRwVDwsJBgUEBAICAQIBAQAAAAAAAAAAAAAABQBC/wX0DiYsKCEaFRENCgkHBQUEBAMDAgICAQECAQEBAAAA","NwCQ/wb0ABQhIyEeGhURDgsJCAYFBAMCAgIBAQEAAQAAAAAALgBG/w39AA0ZICIgHRoXFBAOCwoJBwYGBQQDAwICAQEBAQAAUQDB/w8B/gQOFhscHBoXFRIQ","DgwJCQcGBQQEAwICAQEAAAEAawAsABIF/gAGDRMWFxcXFRQREA0NCgkIBgYFBAQDAwICAQAAlwCPABUKAQADBwsQEhQUFBMRDw4MCwoICAYFBQQDAgIBAQEA","zgBPARMJA/79AQQHCgwNDg4ODQ0LCgkJBwYFBAMDAgEBAQAA9ACfAwD58e3t7vH0+Pv+AAEEBAQGBQUDBAQDAgIBAgIBAAAAJQFRBAD79/Ty8vL19/r7/f8A","AgICAwMEAwMDAwICAQEBAAAAWwEPBQD9+vf19fb29/n7/P7//wEBAgIBAgICAgIBAQEAAQAAoQHFBQD//Pv6+fn5+vr7/P39//8AAAECAQECAQECAgEBAQEA","8gFuBgD///38+/v7+/v8/f3+////AAAAAQEAAQEAAAAAAAAAOAIKBwAA///+/v7+/f39/f7//wAAAAAAAAABAAABAAAAAAAAggKOBwABAQEBAP///////wD/","//8AAAABAAEAAAEAAAAAAAAAvgL2BwAAAQEBAQEAAQABAQAAAAAAAAAAAQAAAQAAAQEAAP8A9gJICAABAQECAgICAQIBAQECAgIBAQEBAQEBAQEBAAABAAAA","JQNyCAABAgICAgIDAwMDAwMCAgIDAgICAgICAQEBAQEAAAEAdAOLCAABAgMDAwMDAwMDAwMDAwMCAwMCAgEBAgEBAQABAQAAngOSCAABAQICAwQDBAQEAwME","AwMDAwMDAgMDAgICAQEBAAAA4wN2CAABAgIDAwMEBAQEBAQEBAQEAwMDAwICAgIBAgEAAQAA+gNNCAABAQIDAwMEBAQEBQUEBAQEBAQEAwMDAgICAQIBAAEA","NAQUCAAAAgICAwQEBAQEBAQEBQQEBAQDBAQDAwICAgEBAQAAQwTKBwABAQIDAwMDBAQFBQUFBAUFBQQEBAMDAwMDAgICAQEAfQR7BwABAQICAwMEAwQEBAQE","BQQEBAQEAwQEAwMCAgEBAQAA0swcbgELFiAqND5HUVpjbHV+ho+Xn6evt77FzdTb4unv9fsAAAAvHv8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AACM9wAaBQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACM/AB3Hg0GAwIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABEAtJuPBoOCQUDAwICAQEA","AAAAAAAAAAAAAAAAAAAAAAAAAAAKBc4AMSIUDAgGBAMCAgECAQEBAQEAAAAAAAAAAAAAAAAAAQBLAPgANTIkGBALCAYEBAMCAgIBAQABAQEBAQEAAAAAAAAA","JgBg/gcAKzgwJRwVDwsJBgUEBAICAgIBAQEAAAABAAAAAAAABQBA/wX0DyYsKCEbFRENCwkHBQUEAwMDAgECAgEBAQEBAAAAPgCO/wXzABQhIyEdGhURDQsJ","CAYFBAMCAgIBAAEAAQAAAAAAMQBF/wz+AA0ZICIgHRoXFBAOCwoJBwYGBQQDAwICAQIBAQEATwDA/w8A/QQOFhscHBoYFRMQDwwKCQgGBQUEAwMCAgEBAQAA","ewAiABEF/wAHDhMXGBgXFhQSEA4MCgkIBwUFBQMDAgEBAQAAnQCNABQJAAACBwwQEhQUFBMSDw4NDAoJBwcGBAQDAgIBAAEA5AAgARQKBP//AwYJDA4PDw8O","Dg0MCwkICAYFBAMDAgEBAP8A+QBCAwP79PDv8PP2+v0AAgMFBgYGBQYFBQQEBAMCAwIBAQEANgEoBAD89vPy8fL19/n7/QABAQIDBAQEAwQDAgMCAQEBAQAA","eQHjBAD9+vf19PX19/n6/P3+AAEBAQICAgICAwEBAQEBAQEAxQGZBQD+/Pr5+fj5+Pn7/P3+/v8AAQEBAQEBAAECAQEAAAAAGgI/BgD//v38+/v6+/v7/Pz9","//////8AAQAAAQEAAQEBAAAAVQLYBgAAAP/+/f39/f3+/f7+/v//AAAAAAEBAQEBAAAAAAAAtAJoBwAAAAD/AP///v7+//////8A//8AAAAAAAAAAP8AAAAA","2QLLBwABAQEBAQEAAQEAAAABAQEAAQEAAAABAAAAAAEAAP8AGwMlCAABAQECAQECAQEBAQEBAQEBAQECAQEBAQEBAQAAAAEAYwNZCAAAAQICAwMCAwICAgIC","AgICAgIBAgIBAQEBAQEAAP8ApgNxCAABAgMCAgMDAwMDAwMCAgICAgICAgIBAgEBAAEBAQEAxwN6CAABAgIDAwMEAwQEBAQEBAQEAwMDAgIDAQIBAgEBAQAA","+gNmCAABAQIDAwMDBAQEBAQEBAMEBAMDAwMCAwICAQEBAAEARARFCAABAgICAwMEBAQEBAQEBAQDBAQEBAMDAgICAgEBAQAAYQQOCAABAQIDAwQEBAQFBAQF","BAUFBAQDAwMDAwICAgIBAAAAcwTJBwAAAgICAwMDBAQEBQUEBQQEBAQFBAQDAwMCAgEBAQEAnAR9BwABAQIDAwMEBAQEBAQFBAUFBQUEBAMEAwMDAgICAQAA","GMqGcAELFR8pMz1GT1lia3R8hY2VnaWttb3EzNPa4eju9fsAAAAuHv8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACL9wAaBQEAAAAAAAAAAAAA","AAAAAAAAAAAAAAAAAAAAAAAAAACL/AB2Hg0GAwIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA5AtJvPBoOCQUDAwICAQEAAAAAAAAAAAAAAAAAAAAAAAAA","AAALBc4AMSIUDAgGBAMCAgECAQEBAQEAAAAAAAAAAAAAAAAAAQBKAPgANTIjGBALCAYFBAMCAgIBAQABAQEBAQEAAAAAAAAAKABb/gcAKzgxJRwVDwsIBgUE","BAMCAgIBAQEAAAABAAAAAAAACABE/wTzDyUrJyEaFRENCwkHBQQEAwMDAgECAgEBAQEBAAAAPgCF/wX0ABUiJSEeGhUSDgsJCAYFBAMDAgIBAAEAAQAAAAAA","NgBG/wz9AA0ZICIhHRsWExEODAoJBwYFBQQDAwICAQIBAQEAVADH/w4A/QQOFRsbHBkYFhIRDgwKCQgGBQUFAwMCAgEAAQAAfgAeABAF/gAHDhMXGBgYFRQS","EA8NCwkJBwYEBQMDAgICAAAAtwCAABQIAQACCA0RExQUFBMREA4MDAoICAYFBAQDAgAAAQAA4QAKARQLBAAAAwcKDQ8QEREQDw4NCwsJCAcHBQQDAwMCAAAA","BAHlAgb+9/Pz9PX5/AACBAUGBwcIBwYGBQUEBAMDAgICAgEASQEFBAD79vLw8PL09/n7/f8BAgMDBAQEBAMEAwMCAgEBAQEAmgG+BAD9+fb19PT19vj6+/3+","/wAAAQICAgIBAgEBAQEAAAAA5gFvBQD++/r49/j4+Pn6/P39/v8AAAABAQEBAAEBAQAAAP8ALAITBgD//v38+/r6+/v7/Pz+/v7//wAAAAEBAQEBAQEBAAEA","fgKuBgAAAP79/f39/Pz9/f7+////AP8AAQAAAQEBAAAAAQAAzwI7BwAAAAAA///+/v7+/v7+//8A/wAA/wEBAAAAAAEA/wAADAOmBwAAAQEBAQAAAAAAAAAA","/wAAAQEAAQAAAAAAAAABAAAARQMACAABAQEBAgIBAgIBAQEBAQEBAQEBAAEBAQEBAQAAAQAAjQMzCAABAQICAgIDAgICAgICAgICAQEBAgEBAQEBAQEAAAAA","4wNWCAABAgIDAgMDAwMDAwIDAwMCAgICAgEBAQEAAAAAAAAA8gNnCAABAQICAwMDAwMEAwQDAwMDAwMDAgMCAgICAgEBAQAAOQRZCAAAAgMDAwMDBAQEBAQE","BAQEBAMDAwIDAwIBAQEBAAEAXwQ4CAABAQICAwQEBAQEBAQFBAQEBAQEBAQDAgIDAgIBAQAAjgQLCAABAgIDAwMEBAQEBQUEBAQEBAQDAwMDAwICAQEBAQAA","oATLBwABAQICAwMEBAUEBAQFBQUEBAQFBAQDAwMCAwICAQEA1wSFBwAAAQEDAwMDBAMEBAUEBAQFBQUEBAMEAwMDAgIBAAAAW8fAcgELFR8oMjxFTlhhanJ7","hIyUnKSstLzDy9LZ4Ofu9fsAAAAsHv8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACM9wAaBQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","AACJ/AB2Hg0GAwIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAvAtJvPBoOCQUDAwICAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAFBc4AMSEUDAgGBAMCAgEC","AQEBAQEAAAAAAAAAAAAAAAAAAQBHAPgANTIjFxALCAYFBAMCAwIBAQEBAQEBAQEBAAAAAAAALABc/gcAKzkxJRwVDwsIBgUEAwMDAgEBAQEAAAD/AAAAAAAA","CgBC/wTzDyUrKCEaFRENCwkHBQQDAwMDAgECAQECAQEBAAAAOwCE/wX0ABUiJSEfGhYSDgwKCAcGBAQDAwICAgEBAQEAAQAAQgBM/wv9AA0ZICIgHRoWExAO","DAkIBwUFBAQCAgIBAQABAAAAWADB/w0A/QQOFhwcHBoYFhMQDg0KCQgGBQUFAwMCAgEAAQEAhwAfABAD/QAHDRMXGRgYFhQSEA4NCwoJBwYFBQMDAgICAAAA","swB4ABMJAQADCQ0RExQVFRMSEQ8ODQoJCAcFBQQDAwIBAQEA6wADARQKBAAAAwcKDRAQEBERDw4NCwsJCQcHBQUEAgICAQAAHQGGAgkB+vb29/j8/wIEBgcH","CQkICAcHBgUFBAMDAwIBAQAAaQHmAwD79vLw8PL09/n8/f8BAQIDBAQDAwMCAwICAQEBAAEAogGcBAD9+fb08/T19vj5/P3+AAEBAQIDAwMDAgMCAgIBAQAA","+wFIBQD9+/r49/f3+Pn6+/3+/v4AAAABAQEBAQEBAQAAAQAAVwLuBQD//vz7+vr6+vr7+/z8/v/+/wAA/wAAAAAAAAEA/wAAmgKKBgAA//79/fz8/Pz8/f3+","/v7/AAAAAQEBAQEBAQABAQAAAAMWBwAA///////+/f3+/v7+/v///v//AAD/AP//AAD/AAAAJAOABwABAQEBAQAAAAAA/wAAAAAAAQAAAAABAAEBAAABAAAA","hgPgBwAAAQEBAQEBAQEAAQABAAABAAABAAABAQAAAAAAAAAAtwMaCAABAgICAgICAgICAgIBAgICAgIBAgEBAQIBAQEAAAAA/QM8CAABAQICAgMDAwMDAwMD","AwMCAgICAgIBAQEBAQEBAAAANwRQCAABAgIDAwMDAwMEAwMDAwMDAwMDAgICAgEBAQEBAQEAWgRICAABAQICAwMEBAQEBAQEBAQEBAQDAwMDAgICAQEBAQAA","kAQwCAAAAgIDAwQDBAQEBQUFBAQEBAMEBAMDAwICAgEBAAAApQQBCAABAQIDAwMEBAUEBAQEBQQEBAUEAwQDAwMDAgIBAQAA0QTKBwABAQICAwMEBAQFBQUF","BAUFBQQEBAQDAwMCAgIBAQEA7ASIBwAAAgICAwQDBAQEBAQFBQUEBAQEBAQEAwMDAgEBAQAAVuzQPQHB3Ov9Dx8vPUpWYm13gYmSmaCmrLC2u7/Dx8vP0tbX","uQHZ/wD8/f7+/v/+/v8AAAAAAAAAAAAAAAD/////AP////7/MALQ/wD0+/z9//7/AP///wAAAAAAAAAAAAAAAAD//////v/+qAG6/wD8/f/+/f7+/v//AAAA","AAAAAAAA/wAAAP/////+//7/QQKn/wD8/P39/v3///8AAP8AAAAAAAAAAP///////v///v79xAGO/wD7/fz9/f7+/////wD//wAAAP//AAD///////7+/v7+","wgGf/wAC+/v8/f79/f7+//8AAQAAAAAA//7//v7+/v39/fz8VQJGAAD4+fr7+/v8/f3+/wAA/wAA/////v79/Pz8+/v7+vv72gF2AADv9vr6+vr8/f8A/wAA","AAAAAAD////+/vz6+vr5+fn4uwG/AAAA+PX4+fv9/wAAAQAAAQD/AP///v79/Pz8+vj39/b2PwHdAADo9vb2/P8AAAABAAEBAAAA///+/v39/fz7+/r59vTz","0P8GAQDz7/n/AQICAgIBAgEAAP///v39/fz7+vr5+Pn49/b1//2CAADx+AIEBAUFBQQEAgIBAAD+/f37+vn5+Pf39/X09fTzKPqh/wDpCQ0MCQkJBwcEBAEA","/vz7+vj39fTz8vHw7+/v7u7u6fFT/QAhFBEUExENCwcFAP359vLv6+jl4+Hf3t3c29vc3N3e4NwFyACnYf2fYTojFAwHBgcKDhUbJC03QUtVX2lzfYaOl5+m","RP96cAABDVGXxN3r8/f6/P3+//8AABQ9ZYScr8DQ2eLr8vr/VQGjSf8JBgQDAgEBAAAAAAAAAQEBAu7GnoBpVkY2LiUdFg8KswGmJgAaBAMDAgIBAQEAAAAA","//8A/wD/AP//AP8AAAEAAQEBRQKgGAAiBQUDAwICAgEBAQAAAAD/AP8AAAAAAAEBAQECAgID+AJTEQAZGAUFAwMCAQEBAAEAAAAAAAAAAAEBAQEBAQECAgIC","0APFDAALEBcGBAMDAgEBAQAAAAAAAAAAAAAAAQEBAgICAwMHpwSLCgD3Dg8SCQQCAgIBAAABAAAAAAAAAAEBAQECAgMECA0OkgVwCAAOCAYLDAoEAwIBAQEA","AAAAAAABAQABAQICBQgLCgkIdgbNBgD3AAYGCAgJBQICAQAAAAAAAAEAAAEBAgUIBwcGBgUFZgciBgD9/wACAgIEBQUDAgEAAAAAAAAAAgMFBQUEBAMDAgIC","twihBAAE/f3+/wEAAAEBAQEBAQAAAAECAQEBAQAAAAD////+pggFBAD7/fz9/f7+/////wD//wAAAP//AAD///////7+/v7+dQcKBAD8/P39/v3///8AAP8A","AAAAAAAAAP///////v///v79hwYVAwD8/f/+/f7+/v//AAAAAAAAAAAA/wAAAP/////+//7/0gVIAwD0+/z9//7/AP///wAAAAAAAAAAAAD/AAD//////v/+","NwWeAgD8/f7+/v/+/v8AAAAAAAAAAAAAAAAA////AP////7/"].join(""),gm="AAAAAAcAHgBVALwAYQFXAq8DfAXJB6EKDw4WEr8WCRzvIXAogi8VNxk/gEc8UDNZUGJ8a6N0r32Ohi6Pgpd/nw==",vm="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",Wo;function Fn(){if(Wo)return Wo;let i=atob(pm)+atob(mm)+atob(hm),e=new Float32Array(32*2177),t=0,A=0,a=new Uint8Array(32),r=0;for(let s=0;s<2177;s++){if(s===1088||s>=2113&&s<2145)continue;let o=r++*36;t=t+(i.charCodeAt(o)|i.charCodeAt(o+1)<<8)&65535,A=A+(i.charCodeAt(o+2)|i.charCodeAt(o+3)<<8)&65535;for(let l=0;l<32;l++){let c=a[l]+i.charCodeAt(o+4+l)&255;a[l]=c,e[s*32+l]=(t+(A-t)*c/255)/65535}}let n=atob(gm)+atob(vm);for(let s=0;s<1056;s++){let o=(n.charCodeAt(s*2)|n.charCodeAt(s*2+1)<<8)/65535,l=s<32?1088*32+s:2113*32+s-32;e[l]=o}return Wo=e,e}var Gf=[0,1,2,3,4,5,6];function jo(i=!0,e=!1){return`
const OPENPBR_LOBE_FUZZ: i32 = 0;
const OPENPBR_LOBE_COAT: i32 = 1;
const OPENPBR_LOBE_METAL: i32 = 2;
const OPENPBR_LOBE_SPECULAR: i32 = 3;
const OPENPBR_LOBE_TRANSMISSION: i32 = 4;
const OPENPBR_LOBE_DIFFUSE: i32 = 5;
const OPENPBR_LOBE_SUBSURFACE: i32 = 6;
const OPENPBR_LOBE_COUNT: i32 = ${Gf.length};




struct bq {
tangent: vec3f,
bitangent: vec3f,
normal: vec3f,
};

struct ag {
material: OpenPbrResolvedMaterial,
basis: bq,
${i?`
coatBasis: bq,
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

fn aE(color: vec3f) -> f32 {
return dot(color, vec3f(0.212671, 0.715160, 0.072169));
}

fn dd(bE: f32) -> f32 {
let value = (bE - 1.0) / (bE + 1.0);
return value * value;
}

fn bi(
bE: f32,
specularWeight: f32
) -> f32 {
let uh = min(
dd(bE) * specularWeight,
0.9999
);
let uj = sqrt(uh);
let lR = (1.0 + uj) / (1.0 - uj);
return select(lR, 1.0 / lR, bE < 1.0);
}

fn af(ci: f32, relativeIor: f32) -> f32 {
if (abs(relativeIor - 1.0) < 1e-6) {
return 0.0;
}
return cC(ci, relativeIor);
}

fn aG(ior: f32) -> f32 {
if (ior < 1.0) {
return 15.0 - ((1.0 / ior - 1.0) / 1.5) * 15.0;
}
return 16.0 + ((ior - 1.0) / 1.5) * 15.0;
}

fn F(tB: i32, row: i32) -> f32 {
return textureLoad(openPbrEnergyLut, vec2i(tB, row), 0).r;
}

fn gt(
dU: f32,
bV: f32,
im: f32
) -> f32 {
let bH = clamp(dU, 0.0, 31.0);
let aL = clamp(bV, 0.0, 31.0);
let bD = clamp(im, 0.0, 31.0);
let ef = i32(floor(bH));
let aT = i32(floor(aL));
let cQ = i32(floor(bD));
let hU = min(ef + 1, 31);
let cu = min(aT + 1, 31);
let fb = min(cQ + 1, 31);
let cv = bH - f32(ef);
let cI = aL - f32(aT);
let lj = bD - f32(cQ);

let wb = F(cQ, ef * 32 + aT);
let wc = F(fb, ef * 32 + aT);
let wd = F(cQ, ef * 32 + cu);
let wf = F(fb, ef * 32 + cu);
let wg = F(cQ, hU * 32 + aT);
let wh = F(fb, hU * 32 + aT);
let wi = F(cQ, hU * 32 + cu);
let wj = F(fb, hU * 32 + cu);
let v00 = mix(wb, wg, cv);
let v01 = mix(wc, wh, cv);
let v10 = mix(wd, wi, cv);
let v11 = mix(wf, wj, cv);
return mix(
mix(v00, v10, cI),
mix(v01, v11, cI),
lj
);
}

fn gS(dU: f32, bV: f32) -> f32 {
let bH = clamp(dU, 0.0, 31.0);
let aL = clamp(bV, 0.0, 31.0);
let ef = i32(floor(bH));
let aT = i32(floor(aL));
let hU = min(ef + 1, 31);
let cu = min(aT + 1, 31);
let cv = bH - f32(ef);
let cI = aL - f32(aT);
let v00 = F(aT, 1024 + ef);
let v01 = F(cu, 1024 + ef);
let v10 = F(aT, 1024 + hU);
let v11 = F(cu, 1024 + hU);
return mix(
mix(v00, v10, cv),
mix(v01, v11, cv),
cI
);
}



fn ev(
dU: f32,
bV: f32,
im: f32
) -> f32 {
let bH = clamp(dU, 0.0, 31.0);
let aL = clamp(bV, 0.0, 31.0);
let bD = clamp(im, 0.0, 31.0);
let ef = i32(floor(bH));
let aT = i32(floor(aL));
let cQ = i32(floor(bD));
let hU = min(ef + 1, 31);
let cu = min(aT + 1, 31);
let fb = min(cQ + 1, 31);
let cv = bH - f32(ef);
let cI = aL - f32(aT);
let lj = bD - f32(cQ);

let wb = F(cQ, ${1089} + ef * 32 + aT);
let wc = F(fb, ${1089} + ef * 32 + aT);
let wd = F(cQ, ${1089} + ef * 32 + cu);
let wf = F(fb, ${1089} + ef * 32 + cu);
let wg = F(cQ, ${1089} + hU * 32 + aT);
let wh = F(fb, ${1089} + hU * 32 + aT);
let wi = F(cQ, ${1089} + hU * 32 + cu);
let wj = F(fb, ${1089} + hU * 32 + cu);
let v00 = mix(wb, wg, cv);
let v01 = mix(wc, wh, cv);
let v10 = mix(wd, wi, cv);
let v11 = mix(wf, wj, cv);
return mix(
mix(v00, v10, cI),
mix(v01, v11, cI),
lj
);
}

fn eu(dU: f32, bV: f32) -> f32 {
let bH = clamp(dU, 0.0, 31.0);
let aL = clamp(bV, 0.0, 31.0);
let ef = i32(floor(bH));
let aT = i32(floor(aL));
let hU = min(ef + 1, 31);
let cu = min(aT + 1, 31);
let cv = bH - f32(ef);
let cI = aL - f32(aT);
let v00 = F(aT, ${2113} + ef);
let v01 = F(cu, ${2113} + ef);
let v10 = F(aT, ${2113} + hU);
let v11 = F(cu, ${2113} + hU);
return mix(
mix(v00, v10, cv),
mix(v01, v11, cv),
cI
);
}

fn eR(dU: f32, bV: f32) -> f32 {
let bH = clamp(dU, 0.0, 31.0);
let aL = clamp(bV, 0.0, 31.0);
let ef = i32(floor(bH));
let aT = i32(floor(aL));
let hU = min(ef + 1, 31);
let cu = min(aT + 1, 31);
let cv = bH - f32(ef);
let cI = aL - f32(aT);
let v00 = F(aT, ${2145} + ef);
let v01 = F(cu, ${2145} + ef);
let v10 = F(aT, ${2145} + hU);
let v11 = F(cu, ${2145} + hU);
return mix(
mix(v00, v10, cv),
mix(v01, v11, cv),
cI
);
}

fn bb(ior: f32, alpha: f32, cosine: f32) -> f32 {
return ev(aG(ior), sqrt(alpha) * 31.0, cosine * 31.0);
}
fn bf(ior: f32, alpha: f32) -> f32 {
return eu(aG(ior), sqrt(alpha) * 31.0);
}
fn ck(ior: f32, alpha: f32) -> f32 {
return eR(aG(ior), sqrt(alpha) * 31.0);
}



fn aV(alpha: f32, cosine: f32) -> f32 {
let iF = clamp(sqrt(alpha) * 31.0, 0.0, 31.0);
let bD = clamp(cosine * 31.0, 0.0, 31.0);
let r0 = i32(floor(iF));
let c0 = i32(floor(bD));
let r1 = min(r0 + 1, 31);
let c1 = min(c0 + 1, 31);
return mix(
mix(F(c0, ${1056} + r0), F(c1, ${1056} + r0), fract(bD)),
mix(F(c0, ${1056} + r1), F(c1, ${1056} + r1), fract(bD)),
fract(iF));
}

fn cD(alpha: f32) -> f32 {
let index = clamp(sqrt(alpha) * 31.0, 0.0, 31.0);
let i0 = i32(floor(index));
return mix(F(i0, ${1088}),
F(min(i0 + 1, 31), ${1088}), fract(index));
}

fn bd(value: f32, ior: f32) -> f32 {
if ((ior > 2.5) | (ior < 0.4)) {
let vu = dd(2.5);
let progress = (dd(ior) - vu) / (1.0 - vu);
return (1.0 - progress) * value;
}
return value;
}

fn aw(
ior: f32,
alpha: f32,
cosine: f32
) -> f32 {
let value = gt(
aG(ior),
sqrt(alpha) * 31.0,
cosine * 31.0
);
return bd(value, ior);
}

fn cA(ior: f32, alpha: f32) -> f32 {
let value = gS(
aG(ior),
sqrt(alpha) * 31.0
);
return bd(value, ior);
}

fn openpbr_to_world(basis: bq, direction: vec3f) -> vec3f {
return direction.x * basis.tangent
+ direction.y * basis.bitangent
+ direction.z * basis.normal;
}

fn openpbr_to_local(basis: bq, direction: vec3f) -> vec3f {
return vec3f(
dot(direction, basis.tangent),
dot(direction, basis.bitangent),
dot(direction, basis.normal)
);
}

fn fD(
aX: vec3f,
normal: vec3f,
anisotropy: f32
) -> bq {
var basis: bq;
basis.normal = normal;
var tangent = aX;
var bitangent = vec3f(0.0);
if ((dot(tangent, tangent) < 0.001) | (anisotropy <= 0.0)) {
aP(normal, &tangent, &bitangent);
}
else {
bitangent = normalize(cross(normal, tangent));
tangent = normalize(cross(bitangent, normal));
}
basis.tangent = tangent;
basis.bitangent = bitangent;
return basis;
}

fn kF(
aB: f32,
am: f32,
J: f32,
ae: f32
) -> f32 {
return (aB * J - am * ae)
/ (aB * J + am * ae);
}

fn kE(
aB: f32,
am: f32,
J: f32,
ae: f32
) -> f32 {
return (am * J - aB * ae)
/ (aB * ae + am * J);
}

fn ht(
aB: f32,
am: f32,
J: f32,
ae: f32
) -> f32 {
return 2.0 * aB * J
/ (aB * J + am * ae);
}

fn hs(
aB: f32,
am: f32,
J: f32,
ae: f32
) -> f32 {
return 2.0 * aB * J
/ (aB * ae + am * J);
}

fn aY(a: vec2f, b: vec2f) -> vec2f {
return vec2f(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

fn bj(a: vec2f, b: vec2f) -> vec2f {
let aq = max(dot(b, b), 1e-9);
return vec2f(
(a.x * b.x + a.y * b.y) / aq,
(a.y * b.x - a.x * b.y) / aq
);
}

fn iA(value: vec2f) -> vec2f {
let gR = length(value);
let uf = sqrt(max(0.0, 0.5 * (gR + value.x)));
let fw = sqrt(max(0.0, 0.5 * (gR - value.x)));
return vec2f(uf, select(-fw, fw, value.y >= 0.0));
}

fn ce(
J: f32,
aB: f32,
am: vec2f,
rM: bool
) -> vec2f {
let pg = sqrt(max(0.0, 1.0 - J * J));
let tP = bj(vec2f(aB, 0.0), am);
let hQ = tP * pg;
var ae = iA(
vec2f(1.0, 0.0) - aY(hQ, hQ)
);
if (aY(am, ae).y < 0.0) {
ae = -ae;
}

let fZ = vec2f(aB * J, 0.0);
let eJ = aY(am, ae);
if (rM) {
let cl = am * J;
let cj = ae * aB;
return bj(
cl - cj,
cl + cj
);
}
return bj(
fZ - eJ,
fZ + eJ
);
}

fn eE(
iZ: f32,
ha: f32,
pw: f32,
nL: f32,
kL: vec2f,
phase: f32
) -> f32 {
let ol = vec2f(cos(phase), sin(phase));
let iD = aY(kL, ol);
let lv = iD * (ha * nL);
let aq = vec2f(1.0, 0.0) - iD * pw;
let hP = vec2f(iZ, 0.0)
+ bj(lv, aq);
return dot(hP, hP);
}

fn au(
J: f32,
wavelength: f32,
ct: f32,
aR: f32,
cn: f32,
eG: vec2f
) -> f32 {
let dF = clamp(abs(J), 1e-5, 1.0);
let hI = pow(aR / cn, 2.0)
* (1.0 - dF * dF);
if (hI >= 1.0) {
return 1.0;
}
let dc = sqrt(1.0 - hI);
let lL = kF(
aR, cn, dF, dc
);
let lK = kE(
aR, cn, dF, dc
);
let jG = ht(
aR, cn, dF, dc
);
let jF = hs(
aR, cn, dF, dc
);
let gG = cn * dc
/ max(aR * dF, 1e-9);
let phase = 2.0 * PI * (2.0 * cn * ct * dc) / wavelength;
var reflectance = 0.0;

for (var kJ = 0u; kJ < (rtUniform.loopUnrollGuard >> 1u); kJ++) {
let iZ = select(lL, lK, kJ == 1u);
let ha = select(jG, jF, kJ == 1u);
let kL = ce(
dc, cn, eG, kJ == 1u);
reflectance += eE(iZ, ha,
-iZ, ha * gG, kL, phase);
}
return clamp(0.5 * reflectance, 0.0, 1.0);
}




fn cw(cosine: f32, f0: vec3f, tint: vec3f) -> vec3f {
let sr = mix(f0, vec3f(1.0), aI(cosine));
if (all(tint == vec3f(1.0))) { return sr; }
let dD = 1.0 / 7.0;
let mY = 1.0 - dD;
let fX = mix(f0, vec3f(1.0), aI(dD));
let dw = 1.0 - cosine;
let ru = cosine * aI(cosine) * dw
/ (dD * pow(mY, 6.0));
return clamp(sr - ru * (fX - tint * fX), vec3f(0.0), vec3f(1.0));
}

fn cX(f0: f32, uN: f32) -> vec2f {
let dY = clamp(f0, 0.0, 0.99);
let gZ = sqrt(dY);
let rK = (1.0 - dY) / (1.0 + dY);
let rH = (1.0 + gZ) / max(1.0 - gZ, 1e-9);
let ior = mix(rH, rK, clamp(uN, 0.0, 1.0));
let kp = (
(ior + 1.0) * (ior + 1.0) * dY
- (ior - 1.0) * (ior - 1.0)
) / max(1.0 - dY, 1e-9);
return vec2f(ior, sqrt(max(kp, 0.0)));
}


fn bS(ct: f32, weight: f32) -> f32 {
return clamp(weight, 0.0, 1.0) * smoothstep(1e-9, 30.0, ct);
}



fn bJ(
material: OpenPbrResolvedMaterial,
color: vec3f,
viewLocal: vec3f,
lightLocal: vec3f,
fJ: f32,
pdf: ptr<function, f32>
) -> vec3f {
*pdf = 0.0;
if (lightLocal.z <= 0.0) {
return vec3f(0.0);
}

let roughness = material.diffuseRoughness;
let hl = 0.5 - 2.0 / (3.0 * PI);
let pc = 2.0 / 3.0 - 28.0 / (15.0 * PI);
let pp = lightLocal.z;
let nt = viewLocal.z;
let directional = dot(lightLocal, viewLocal) - pp * nt;
let hh = select(
directional,
directional / max(max(pp, nt), 1e-7),
directional > 0.0
);
let iJ = 1.0 / (1.0 + hl * roughness);
let ot = color * INVPI * iJ
* (1.0 + roughness * hh);

let dr = 1.0 - pp;
let outputComplement = 1.0 - nt;
let ph = dr * (
0.0571085289 + dr * (
0.491881867 + dr * (
-0.332181442 + dr * 0.0714429953
)
)
);
let outputGOverPi = outputComplement * (
0.0571085289 + outputComplement * (
0.491881867 + outputComplement * (
-0.332181442 + outputComplement * 0.0714429953
)
)
);
let qr = (1.0 + roughness * ph)
/ (1.0 + hl * roughness);
let outputAlbedo = (1.0 + roughness * outputGOverPi)
/ (1.0 + hl * roughness);
let gi = iJ * (1.0 + pc * roughness);
let hV = color * color * gi
/ max(vec3f(1e-7), vec3f(1.0) - color * (1.0 - gi));
let mn = hV * INVPI
* max(1e-7, 1.0 - outputAlbedo)
* max(1e-7, 1.0 - qr)
/ max(1e-7, 1.0 - gi);
*pdf = lightLocal.z * INVPI;
return (ot + mn) * fJ;
}

fn aU(viewCosine: f32, roughness: f32) -> f32 {
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

fn kD(
material: OpenPbrResolvedMaterial,
viewLocal: vec3f,
lightLocal: vec3f,
pdf: ptr<function, f32>
) -> vec3f {
*pdf = 0.0;
if ((viewLocal.z <= 0.0) | (lightLocal.z <= 0.0)) {
return vec3f(0.0);
}
let albedo = aU(
viewLocal.z,
material.fuzzRoughness
);
*pdf = lightLocal.z * INVPI;
return material.fuzzColor * albedo * INVPI;
}

fn ao(
material: OpenPbrResolvedMaterial,
viewLocal: vec3f,
lightLocal: vec3f,
ad: vec3f,
bG: vec3f,
pdf: ptr<function, f32>
) -> vec3f {
*pdf = 0.0;
if (lightLocal.z <= 0.0) {
return vec3f(0.0);
}

let alpha = vec2f(material.alphaX, material.alphaY);
let distribution = cW(ad, alpha);
let kz = aF(viewLocal, alpha);
let ep = kz
* aF(lightLocal, alpha);

*pdf = kz * distribution / (4.0 * max(viewLocal.z, 1e-8));
return bG * distribution * ep
/ (4.0 * max(lightLocal.z * viewLocal.z, 1e-8));
}

fn dE(
material: OpenPbrResolvedMaterial,
relativeIor: f32,
tint: vec3f,
viewLocal: vec3f,
lightLocal: vec3f,
ad: vec3f,
bG: vec3f,
pdf: ptr<function, f32>
) -> vec3f {
*pdf = 0.0;
if (lightLocal.z >= 0.0) {
return vec3f(0.0);
}

let ls = dot(lightLocal, ad);
let bm = dot(viewLocal, ad);


if ((bm <= 0.0) | (ls >= 0.0)) {
return vec3f(0.0);
}
let alpha = vec2f(material.alphaX, material.alphaY);
let distribution = cW(ad, alpha);
let kz = aF(viewLocal, alpha);
let ep = kz
* aF(lightLocal, alpha);
var aq = ls + bm * relativeIor;
aq *= aq;
let qw = abs(ls) / max(aq, 1e-8);
let jU = relativeIor * relativeIor;

*pdf = kz * max(0.0, bm) * distribution * qw
/ max(viewLocal.z, 1e-8);
return tint * (vec3f(1.0) - bG) * distribution * ep
* abs(bm) * qw * jU
/ max(abs(lightLocal.z * viewLocal.z), 1e-8);
}

fn bh(material: OpenPbrResolvedMaterial) -> vec3f {
if (HAS_MEDIUM & (material.mediumType > 0)) {
return vec3f(1.0);
}
return material.transmissionColor;
}

fn cZ(ai: f32) -> f32 {
return 2.0 * ai / (1.0 + ai);
}

fn av(
ai: vec3f,
transmissionWeight: f32
) -> vec3f {
let gA = 2.0 * ai
/ (vec3f(1.0) + ai);
return mix(
ai,
gA,
clamp(transmissionWeight, 0.0, 1.0)
);
}

fn bN(
material: OpenPbrResolvedMaterial,
J: f32,
bE: f32
) -> vec3f {
let tint = bh(material);
if (!material.thinWalled) {
return tint;
}
let jc = max(0.0, 1.0 - J * J);
let ea = jc
/ max(bE * bE, 1e-9);
if (ea >= 1.0) {
return vec3f(0.0);
}
let ae = sqrt(1.0 - ea);
return pow(max(tint, vec3f(0.0)), vec3f(1.0 / max(ae, 1e-5)));
}

fn dX(
material: OpenPbrResolvedMaterial,
viewLocal: vec3f,
lightLocal: vec3f,
pdf: ptr<function, f32>
) -> vec3f {
*pdf = 0.0;
if ((viewLocal.z <= 0.0) | (lightLocal.z >= 0.0)) {
return vec3f(0.0);
}
let ae = -lightLocal.z;
let oY = cC(
viewLocal.z,
material.relativeIor
);
*pdf = ae * INVPI;
return vec3f(1.0 - oY) * INVPI;
}

fn eg(prepared: ptr<function, ag>) {


let sM = min(OPENPBR_LOBE_COUNT, i32(rtUniform.loopUnrollGuard * 2u));
var total = (*prepared).probabilities[OPENPBR_LOBE_FUZZ];
for (var jT = 1; jT < sM; jT++) {
total += (*prepared).probabilities[jT];
}
if (total <= 1e-8) {
for (var jT = 0; jT < sM; jT++) {
(*prepared).probabilities[jT] = 0.0;
}
return;
}
let pk = 1.0 / total;
for (var jT = 0; jT < sM; jT++) {
(*prepared).probabilities[jT] *= pk;
}
}



fn bR(eta: f32) -> f32 {
if (abs(eta - 1.0) < 1e-6) { return 0.0; }
if (eta > 1.0) { return (eta - 1.0) / (4.08567 + 1.00071 * eta); }
return 0.997118 + 0.1014 * eta - 0.965241 * eta * eta - 0.130607 * eta * eta * eta;
}

fn bU(f0: vec3f, tint: vec3f) -> vec3f {
let dD = 1.0 / 7.0;
let fX = mix(f0, vec3f(1.0), aI(dD));
let b = fX * (vec3f(1.0) - tint) / (dD * pow(1.0 - dD, 6.0));
return clamp(f0 + (vec3f(1.0) - f0) / 21.0 - b / 126.0, vec3f(0.0), vec3f(1.0));
}



fn cN(material: OpenPbrResolvedMaterial, cosine: f32) -> vec3f {
if (cosine <= 0.0) { return vec3f(1.0); }
let mp = sqrt(max(0.0, 1.0 - (1.0 - cosine * cosine) / (material.coatIor * material.coatIor)));
let uT = pow(max(material.coatColor, vec3f(0.0)), vec3f(0.5 / max(mp, 1e-5)));
return mix(vec3f(1.0), uT, material.coatWeight);
}

fn gF(material: OpenPbrResolvedMaterial, cosine: f32) -> f32 {
if (material.coatRoughness <= ROUGHNESS_MIN) {
return af(cosine, 1.0 / material.coatIor);
}


return clamp(1.0 - aw(material.coatIor,
material.coatRoughness * material.coatRoughness, cosine), 0.0, 1.0);
}

fn hr(prepared: ag) -> vec3f {
let material = prepared.material;
let dielectric = 1.0 - material.baseMetalness;
let opaque = dielectric * (1.0 - material.transmissionWeight) * (1.0 - material.subsurfaceWeight);
let sss = dielectric * (1.0 - material.transmissionWeight) * material.subsurfaceWeight;
let vI = dielectric * material.transmissionWeight;
let gd = bR(prepared.specularEtaTOverEtaI);
let lE = bR(1.0 / prepared.transmissionReflectionIor);
let qI = clamp(opaque * gd + (sss + vI) * lE + material.baseMetalness, 0.0, 1.0);
let jM = mix(1.0, material.specularRoughness, qI);
let ks = bR(material.coatIor);
let kr = 1.0 - (1.0 - ks) / (material.coatIor * material.coatIor);
let k = mix(ks, kr, jM);
let eb = material.baseMetalness * material.specularWeight * bU(material.baseWeight * material.baseColor, material.specularColor)
+ opaque * mix(material.baseWeight * material.baseColor, vec3f(1.0), gd)
+ sss * material.subsurfaceColor + vec3f(vI);
let rZ = vec3f(1.0 - k) / max(vec3f(1.0) - eb * k, vec3f(1e-6));
return mix(vec3f(1.0), rZ, material.coatWeight * material.coatDarkening);
}

fn cF(prepared: ag, lU: f32) -> vec3f {
if (prepared.material.coatWeight <= 0.0) { return vec3f(1.0); }
if (prepared.material.inside) {

return cN(prepared.material, -lU);
}

return prepared.coatBaseScale * cN(prepared.material, lU);
}


${i?`
fn dM(fallback: bq, tangent: vec3f, bitangent: vec3f, direction: vec2f) -> bq {
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
fn ds(
tangent: vec3f,
material: OpenPbrResolvedMaterial,
bM: vec3f,
normal: vec3f
) -> ag {
var prepared: ag;
prepared.material = material;
prepared.basis = fD(
tangent,
normal,
max(material.specularAnisotropy, material.coatAnisotropy)
);
${i?`
prepared.coatBasis = prepared.basis;
prepared.directionFrames = false;
${e?`


if (material.coatNormalEnabled) {
prepared.coatBasis = fD(material.geometryTangent, material.coatNormal, material.coatAnisotropy);
prepared.directionFrames = true;
}
`:""}
if ((material.specularAnisotropy > 0.0) & material.anisotropyDirectionEnabled) {
prepared.basis = dM(prepared.basis, material.directionTangent, material.directionBitangent, material.anisotropyDirection);
prepared.directionFrames = true;
}
if ((material.coatAnisotropy > 0.0) & (material.coatAnisotropyRotation != 0.0)) {
prepared.coatBasis = dM(prepared.coatBasis, material.geometryTangent, material.geometryBitangent, vec2f(cos(material.coatAnisotropyRotation), sin(material.coatAnisotropyRotation)));
prepared.directionFrames = true;
}
`:""}
prepared.viewLocal = openpbr_to_local(prepared.basis, bM);
${e?"    prepared.coatViewLocal = openpbr_to_local(prepared.coatBasis, bM);":""}
prepared.diffuseColor = material.baseColor;

let cK = 1.0 - material.baseMetalness;
let dW = cK
* (1.0 - material.transmissionWeight);
prepared.weights[OPENPBR_LOBE_FUZZ] = material.fuzzWeight;
prepared.weights[OPENPBR_LOBE_COAT] = material.coatWeight;
if (material.inside) { prepared.weights[OPENPBR_LOBE_COAT] = 0.0; }
prepared.weights[OPENPBR_LOBE_METAL] = material.baseMetalness;
prepared.weights[OPENPBR_LOBE_SPECULAR] = cK;
prepared.weights[OPENPBR_LOBE_TRANSMISSION] = cK
* material.transmissionWeight;
prepared.weights[OPENPBR_LOBE_DIFFUSE] = dW
* (1.0 - material.subsurfaceWeight) * material.baseWeight;
prepared.weights[OPENPBR_LOBE_SUBSURFACE] = dW
* material.subsurfaceWeight;

prepared.specularEtaTOverEtaI = bi(
1.0 / material.relativeIor,
material.specularWeight
);
prepared.material.relativeIor = 1.0 / prepared.specularEtaTOverEtaI;
prepared.refractionEtaTOverEtaI = prepared.specularEtaTOverEtaI;
prepared.transmissionReflectionIor = prepared.material.relativeIor;


if (material.coatWeight > 0.0) {
var cm = 1.0;
if (!material.inside) { cm = mix(1.0, material.coatIor, material.coatWeight); }
let bB = cm * bi(
material.specularIor / cm, material.specularWeight);
var eF = bB / cm;
if ((cm > bB) & (bB >= 1.0)) {
eF = 1.0 / eF;
}
prepared.specularEtaTOverEtaI = eF;
prepared.transmissionReflectionIor = 1.0 / eF;
prepared.refractionEtaTOverEtaI = bB;
if (material.inside) {
prepared.refractionEtaTOverEtaI = 1.0 / bB;
prepared.transmissionReflectionIor = bB;
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
let ai = af(
viewCosine,
1.0 / prepared.specularEtaTOverEtaI
);
let fN = material.specularColor * select(
ai,
mix(
ai,
cZ(ai),
material.transmissionWeight
),
material.thinWalled
);
let iv = material.specularWeight * cw(
viewCosine,
material.baseWeight * material.baseColor,
material.specularColor
);
let eZ = select(
af(viewCosine, prepared.transmissionReflectionIor),
cZ(af(viewCosine, prepared.transmissionReflectionIor)),
material.thinWalled
);
let hb = bN(
material,
viewCosine,
prepared.refractionEtaTOverEtaI
);
let iM = aw(
prepared.specularEtaTOverEtaI,
prepared.specularAlpha,
viewCosine
);
let gH = cA(
prepared.specularEtaTOverEtaI,
prepared.specularAlpha
);
prepared.diffuseSpecularEnergyCompensation = iM
/ max(gH, 1e-12);

prepared.probabilities[OPENPBR_LOBE_FUZZ] = prepared.weights[OPENPBR_LOBE_FUZZ]
* aE(material.fuzzColor)
* max(aU(
viewCosine,
material.fuzzRoughness
), 0.02);
prepared.probabilities[OPENPBR_LOBE_COAT] = 0.0;
prepared.coatBaseScale = vec3f(1.0);
if ((material.coatWeight > 0.0) & !material.inside) {
${e?"let coatViewCosine = select(viewCosine, max(prepared.coatViewLocal.z, 0.0), material.coatNormalEnabled);":""}
let lf = gF(material, ${e?"coatViewCosine":"viewCosine"});
prepared.probabilities[OPENPBR_LOBE_COAT] = prepared.weights[OPENPBR_LOBE_COAT] * lf;
prepared.coatBaseScale = cN(material, ${e?"coatViewCosine":"viewCosine"})
* (1.0 - prepared.weights[OPENPBR_LOBE_COAT] * lf) * hr(prepared);
}
prepared.probabilities[OPENPBR_LOBE_METAL] = prepared.weights[OPENPBR_LOBE_METAL]
* aE(iv);
prepared.metalMsScale = vec3f(0.0);
prepared.metalMsFactor = 0.0;
prepared.metalMsProbability = 0.0;


if ((material.specularRoughness >= 0.04) & (prepared.weights[OPENPBR_LOBE_METAL] > 0.0)) {
let ig = bU(material.baseWeight * material.baseColor, material.specularColor);
prepared.metalMsScale = material.specularWeight * ig * ig;
let qO = aV(prepared.specularAlpha, viewCosine);
prepared.metalMsFactor = qO / max(cD(prepared.specularAlpha), 1e-12);
let fC = prepared.weights[OPENPBR_LOBE_METAL] * aE(prepared.metalMsScale) * qO;
prepared.probabilities[OPENPBR_LOBE_METAL] += fC;
prepared.metalMsProbability = fC / max(prepared.probabilities[OPENPBR_LOBE_METAL], 1e-12);
}
prepared.probabilities[OPENPBR_LOBE_SPECULAR] = prepared.weights[OPENPBR_LOBE_SPECULAR]
* aE(fN);
prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] = prepared.weights[OPENPBR_LOBE_TRANSMISSION]
* (1.0 - eZ)
* aE(hb);






prepared.dielectricMsReflectionScale = vec3f(0.0);
prepared.dielectricMsTransmissionScale = vec3f(0.0);
prepared.dielectricMsViewLoss = 0.0;
prepared.dielectricMsReflectionRatio = 0.0;
prepared.dielectricMsProbability = 0.0;
if (!material.thinWalled & (material.transmissionWeight > 0.0) &
(prepared.specularAlpha >= 0.0016) & (prepared.weights[OPENPBR_LOBE_TRANSMISSION] > 0.0) &
(abs(prepared.refractionEtaTOverEtaI - 1.0) > 1e-6)) {
let mo = prepared.weights[OPENPBR_LOBE_TRANSMISSION] + prepared.weights[OPENPBR_LOBE_SUBSURFACE];
prepared.dielectricMsReflectionScale = select(material.specularColor, vec3f(1.0), material.inside) * mo;
prepared.dielectricMsTransmissionScale = hb * prepared.weights[OPENPBR_LOBE_TRANSMISSION]
+ vec3f(prepared.weights[OPENPBR_LOBE_SUBSURFACE]);
prepared.dielectricMsReflectionRatio = ck(prepared.refractionEtaTOverEtaI, prepared.specularAlpha);
prepared.dielectricMsViewLoss = bb(prepared.refractionEtaTOverEtaI, prepared.specularAlpha, viewCosine);
let oR = mix(prepared.dielectricMsTransmissionScale, prepared.dielectricMsReflectionScale, prepared.dielectricMsReflectionRatio);
let fC = aE(oR) * prepared.dielectricMsViewLoss;
prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] += fC;
prepared.dielectricMsProbability = fC / max(prepared.probabilities[OPENPBR_LOBE_TRANSMISSION], 1e-12);
}
prepared.probabilities[OPENPBR_LOBE_DIFFUSE] = prepared.weights[OPENPBR_LOBE_DIFFUSE]
* aE(prepared.diffuseColor)
* prepared.diffuseSpecularEnergyCompensation;
prepared.probabilities[OPENPBR_LOBE_SUBSURFACE] = prepared.weights[OPENPBR_LOBE_SUBSURFACE]
* (1.0 - eZ)
* aE(material.subsurfaceColor)
* prepared.diffuseSpecularEnergyCompensation;


if ((material.coatWeight > 0.0) & HAS_THIN_FILM & (material.thinFilmWeight > 0.0)) {
let lS = 0.02 * bS(material.thinFilmThickness, material.thinFilmWeight);
prepared.probabilities[OPENPBR_LOBE_SPECULAR] = max(prepared.probabilities[OPENPBR_LOBE_SPECULAR], prepared.weights[OPENPBR_LOBE_SPECULAR] * lS);
prepared.probabilities[OPENPBR_LOBE_METAL] = max(prepared.probabilities[OPENPBR_LOBE_METAL], prepared.weights[OPENPBR_LOBE_METAL] * material.specularWeight * lS);
}
if ((material.coatWeight > 0.0) & !material.inside) {
let gI = max(max(prepared.coatBaseScale.x, prepared.coatBaseScale.y), prepared.coatBaseScale.z);
prepared.probabilities[OPENPBR_LOBE_METAL] *= gI;
prepared.probabilities[OPENPBR_LOBE_SPECULAR] *= gI;
prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] *= gI;
prepared.probabilities[OPENPBR_LOBE_DIFFUSE] *= gI;
prepared.probabilities[OPENPBR_LOBE_SUBSURFACE] *= gI;
}
eg(&prepared);
return prepared;
}


fn cY(prepared: ag, cosine: f32, reflection: bool) -> f32 {
if (prepared.material.coatWeight <= 0.0) {
return af(cosine, prepared.material.relativeIor);
}
let kU = af(cosine, prepared.transmissionReflectionIor);
if (!reflection) { return kU; }
let oj = af(cosine, 1.0 / prepared.specularEtaTOverEtaI);
let sQ = prepared.material.transmissionWeight + (1.0 - prepared.material.transmissionWeight) * prepared.material.subsurfaceWeight;
return mix(oj, kU, sQ);
}

fn nA(
prepared: ag,
lightDirection: vec3f,
hc: i32,
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
let coatReflection = geometricReflection & (prepared.coatViewLocal.z > 0.0) & (coatLightCosine > 0.0);
`:""}

var ad: vec3f;
if (reflection) {
ad = normalize(lightLocal + viewLocal);
}
else {
ad = normalize(lightLocal + viewLocal * material.relativeIor);
}
if (ad.z < 0.0) {
ad = -ad;
}

var response = vec3f(0.0);
*pdf = 0.0;
var aM = 0.0;
let mO = hc < 0;
let ws = mO | (hc == OPENPBR_LOBE_FUZZ);
let uA = mO | (hc == OPENPBR_LOBE_COAT);
let tn = mO | (hc == OPENPBR_LOBE_METAL);
let rf = mO | (hc == OPENPBR_LOBE_SPECULAR);
let kd = mO | (hc == OPENPBR_LOBE_TRANSMISSION);
let uF = mO | (hc == OPENPBR_LOBE_DIFFUSE);
let pP = mO | (hc == OPENPBR_LOBE_SUBSURFACE);
let bm = abs(dot(viewLocal, ad));



var du = ad;
var jK = bm;
if (!reflection & material.thinWalled) {
du = normalize(vec3f(lightLocal.xy, -lightLocal.z) + viewLocal);
if (du.z < 0.0) { du = -du; }
jK = abs(dot(viewLocal, du));
}
let ne =
(reflection & (prepared.weights[OPENPBR_LOBE_SPECULAR] > 0.0) & rf) |
(!reflection & (prepared.weights[OPENPBR_LOBE_TRANSMISSION] > 0.0) & kd);
let rk = reflection & (prepared.weights[OPENPBR_LOBE_METAL] > 0.0) & tn;
var oA: array<vec3f, 2>;
if (ne) {
oA[0] = vec3f(cY(prepared, jK, reflection));
}
if (rk) {
oA[1] = cw(bm, material.baseWeight * material.baseColor, material.specularColor);
}
if (HAS_THIN_FILM & (material.thinFilmWeight > 0.0)) {
let wavelengths = vec3f(620.0, 540.0, 450.0);

for (var lD = 0u; lD < (rtUniform.loopUnrollGuard >> 1u); lD++) {
if (!select(ne, rk, lD == 1u)) { continue; }
var yi = vec3f(0.0);
let J = select(jK, bm, lD == 1u);
for (var channel = 0u; channel + 1u < rtUniform.loopUnrollGuard; channel++) {
var ior = vec2f(prepared.thinFilmBaseIor, 0.0);
if (lD == 1u) {
ior = cX(material.baseWeight * material.baseColor[channel], material.specularColor[channel]);
}
yi[channel] = au(J,
wavelengths[channel], material.thinFilmThickness, prepared.thinFilmExteriorIor, material.thinFilmIor, ior);
}
oA[lD] = mix(oA[lD], yi,
bS(material.thinFilmThickness, material.thinFilmWeight));
}
}
let ey = oA[0];
let diffuseSpecularEnergyCompensation =
prepared.diffuseSpecularEnergyCompensation
* aw(
prepared.specularEtaTOverEtaI,
prepared.specularAlpha,
abs(lightLocal.z)
);

${e?`

if (!independentCoat | ((lightLocal.z != 0.0) & (reflection == geometricReflection))) {
`:""}
if (reflection) {
if ((prepared.weights[OPENPBR_LOBE_DIFFUSE] > 0.0) & uF) {
response += prepared.weights[OPENPBR_LOBE_DIFFUSE] * bJ(
material,
prepared.diffuseColor,
viewLocal,
lightLocal,
diffuseSpecularEnergyCompensation,
&aM
);
*pdf += prepared.probabilities[OPENPBR_LOBE_DIFFUSE] * aM;
}

if ((prepared.weights[OPENPBR_LOBE_SUBSURFACE] > 0.0) & material.thinWalled & pP) {
response += 0.5 * prepared.weights[OPENPBR_LOBE_SUBSURFACE] * bJ(
material,
material.subsurfaceColor,
viewLocal,
lightLocal,
diffuseSpecularEnergyCompensation,
&aM
);
*pdf += prepared.probabilities[OPENPBR_LOBE_SUBSURFACE] * 0.5 * aM;
}

if ((prepared.weights[OPENPBR_LOBE_SPECULAR] > 0.0) & rf) {
var cB = ey;
if (material.thinWalled) {
cB = av(
cB,
material.transmissionWeight
);
}
let bG = material.specularColor * cB;
response += prepared.weights[OPENPBR_LOBE_SPECULAR] * ao(
material,
viewLocal,
lightLocal,
ad,
bG,
&aM
);
*pdf += prepared.probabilities[OPENPBR_LOBE_SPECULAR] * aM;
}

if ((prepared.weights[OPENPBR_LOBE_METAL] > 0.0) & tn) {
let bG = material.specularWeight * oA[1];
response += prepared.weights[OPENPBR_LOBE_METAL] * ao(
material,
viewLocal,
lightLocal,
ad,
bG,
&aM
);
if (prepared.metalMsFactor > 0.0) {
let cL = min(prepared.metalMsFactor * aV(prepared.specularAlpha, lightLocal.z), 1.0 / max(lightLocal.z, 1e-8));
response += prepared.weights[OPENPBR_LOBE_METAL] * prepared.metalMsScale * cL * INVPI;
aM = mix(aM, 0.5 * INVPI, prepared.metalMsProbability);
}
*pdf += prepared.probabilities[OPENPBR_LOBE_METAL] * aM;
}
}
else {
let bG = ey;
if ((prepared.weights[OPENPBR_LOBE_TRANSMISSION] > 0.0) & kd) {
if (material.thinWalled) {
let lI = vec3f(lightLocal.xy, -lightLocal.z);
let gA = av(
ey,
1.0
);
let tint = bN(
material,
abs(viewLocal.z),
prepared.refractionEtaTOverEtaI
);
response += prepared.weights[OPENPBR_LOBE_TRANSMISSION]
* ao(
material,
viewLocal,
lI,
du,
tint * (vec3f(1.0) - gA),
&aM
);
}
else {
response += prepared.weights[OPENPBR_LOBE_TRANSMISSION]
* dE(
material,
material.relativeIor,
bh(material),
viewLocal,
lightLocal,
ad,
bG,
&aM
);
}
if (prepared.dielectricMsProbability > 0.0) {
aM *= 1.0 - prepared.dielectricMsProbability;
}
*pdf += prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] * aM;
}
if ((prepared.weights[OPENPBR_LOBE_SUBSURFACE] > 0.0) & pP) {
if (material.thinWalled) {
let pb = vec3f(lightLocal.xy, -lightLocal.z);
response += 0.5 * prepared.weights[OPENPBR_LOBE_SUBSURFACE]
* bJ(
material,
material.subsurfaceColor,
viewLocal,
pb,
diffuseSpecularEnergyCompensation,
&aM
);
aM *= 0.5;
}
else {
response += prepared.weights[OPENPBR_LOBE_SUBSURFACE] * dX(
material,
viewLocal,
lightLocal,
&aM
);
}
*pdf += prepared.probabilities[OPENPBR_LOBE_SUBSURFACE] * aM;
}
}




if ((prepared.dielectricMsProbability > 0.0) & kd) {
let cosine = abs(lightLocal.z);
if (cosine > 0.0) {
let ior = select(1.0 / prepared.refractionEtaTOverEtaI, prepared.refractionEtaTOverEtaI, reflection);
let ju = select(1.0 - prepared.dielectricMsReflectionRatio, prepared.dielectricMsReflectionRatio, reflection);
let oZ = prepared.dielectricMsViewLoss * bb(ior, prepared.specularAlpha, cosine)
/ max(bf(ior, prepared.specularAlpha), 1e-12);
let cL = min(oZ * ju, 1.0 / cosine);
let scale = select(prepared.dielectricMsTransmissionScale, prepared.dielectricMsReflectionScale, reflection);
response += scale * cL * INVPI;
*pdf += prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] * prepared.dielectricMsProbability * ju * 0.5 * INVPI;
}
}

${e?"    } ":""}
if (material.coatWeight > 0.0) {
response *= cF(prepared, ${e?"select(lightLocal.z, coatLightCosine, independentCoat)":"lightLocal.z"});
}
${e?`

if (independentCoat) { response *= abs(lightLocal.z); }
`:""}

${i?`
if (${e?"select(reflection, coatReflection, independentCoat)":"reflection"} & (prepared.weights[OPENPBR_LOBE_COAT] > 0.0)) {
var dT = viewLocal;
var lh = lightLocal;
var gL = ad;
var kk = bm;
if (prepared.directionFrames) {
dT = ${e?"select(openpbr_to_local(prepared.coatBasis, openpbr_to_world(prepared.basis, viewLocal)), prepared.coatViewLocal, independentCoat)":"openpbr_to_local(prepared.coatBasis, openpbr_to_world(prepared.basis, viewLocal))"};
lh = openpbr_to_local(prepared.coatBasis, lightDirection);
gL = normalize(lh + dT);
if (gL.z < 0.0) { gL = -gL; }
kk = abs(dot(dT, gL));
}

let lQ = vec3f(af(
kk,
1.0 / material.coatIor
));
var dS = material;
let jX = aN(material.coatRoughness, material.coatAnisotropy);
dS.alphaX = jX.x;
dS.alphaY = jX.y;
if (uA) {
response += prepared.weights[OPENPBR_LOBE_COAT]${e?" * select(1.0, max(coatLightCosine, 0.0), independentCoat)":""} * ao(
dS,
dT,
lh,
gL,
lQ,
&aM
);
*pdf += prepared.probabilities[OPENPBR_LOBE_COAT] * aM;
}
}
`:`
if (${e?"select(reflection, coatReflection, independentCoat)":"reflection"} & (prepared.weights[OPENPBR_LOBE_COAT] > 0.0)) {
let lQ = vec3f(af(
bm,
1.0 / material.coatIor
));
var dS = material;
let jX = aN(material.coatRoughness, material.coatAnisotropy);
dS.alphaX = jX.x;
dS.alphaY = jX.y;
if (uA) {
response += prepared.weights[OPENPBR_LOBE_COAT]${e?" * select(1.0, max(coatLightCosine, 0.0), independentCoat)":""} * ao(
dS,
viewLocal,
lightLocal,
ad,
lQ,
&aM
);
*pdf += prepared.probabilities[OPENPBR_LOBE_COAT] * aM;
}
}
`}

if (${e?"select(reflection, geometricReflection, independentCoat)":"reflection"} & (prepared.weights[OPENPBR_LOBE_FUZZ] > 0.0)) {
let rC = aU(
abs(viewLocal.z),
material.fuzzRoughness
);
response *= max(
vec3f(0.0),
vec3f(1.0 - prepared.weights[OPENPBR_LOBE_FUZZ] * rC)
);
if (ws) {
response += prepared.weights[OPENPBR_LOBE_FUZZ]${e?" * select(1.0, max(lightLocal.z, 0.0), independentCoat)":""} * kD(
material,
viewLocal,
lightLocal,
&aM
);
*pdf += prepared.probabilities[OPENPBR_LOBE_FUZZ] * aM;
}
}

return response * ${e?"select(abs(lightLocal.z), 1.0, independentCoat)":"abs(lightLocal.z)"};
}

fn bO(
prepared: ag,
lightDirection: vec3f,
pdf: ptr<function, f32>
) -> vec3f {
return nA(prepared, lightDirection, -1, pdf);
}





fn sp(
tangent: vec3f,
material: OpenPbrResolvedMaterial,
bM: vec3f,
normal: vec3f,
lightDirection: vec3f,
pdf: ptr<function, f32>
) -> vec3f {
let prepared = ds(
tangent,
material,
bM,
normal
);
return bO(prepared, lightDirection, pdf);
}





fn jq(
prepared: ag, cq: vec3f,
lightDirection: ptr<function, vec3f>, isTransmissionEvent: ptr<function, bool>,
aS: ptr<function, f32>, bu: ptr<function, bool>,
cO: ptr<function, bool>, bn: ptr<function, u32>
) -> bool {
let material = prepared.material;
let viewLocal = prepared.viewLocal;
var cH = cq.x;
let fL = cq.y;
let bv = cq.z;
*isTransmissionEvent = false;
*aS = 1.0;
*bu = false;
*cO = false;
*bn = u32(OPENPBR_LOBE_DIFFUSE);
*lightDirection = prepared.basis.normal;

var cdf: array<f32, OPENPBR_LOBE_COUNT>;
cdf[OPENPBR_LOBE_FUZZ] = prepared.probabilities[OPENPBR_LOBE_FUZZ];
${Gf.slice(1).map(t=>`cdf[${t}] = cdf[${t-1}] + prepared.probabilities[${t}];`).join(`
    `)}
if (cdf[OPENPBR_LOBE_SUBSURFACE] <= 0.0) {
return false;
}

var lightLocal: vec3f;
if ((bv < cdf[OPENPBR_LOBE_FUZZ]) | (
(bv >= cdf[OPENPBR_LOBE_TRANSMISSION]) & (bv < cdf[OPENPBR_LOBE_DIFFUSE])
)) {
let qG = bv < cdf[OPENPBR_LOBE_FUZZ];
*aS = select(
1.0,
material.fuzzRoughness,
qG
);
*cO = !qG;
*bn = select(
u32(OPENPBR_LOBE_DIFFUSE),
u32(OPENPBR_LOBE_FUZZ),
qG
);
lightLocal = aO(vec2f(cH, fL));
}
${i?`
else if (bv < cdf[OPENPBR_LOBE_COAT]) {
*aS = material.coatRoughness;
*bu = true;
*bn = u32(OPENPBR_LOBE_COAT);
var dT = viewLocal;
if (prepared.directionFrames) { dT = ${e?"select(openpbr_to_local(prepared.coatBasis, openpbr_to_world(prepared.basis, viewLocal)), prepared.coatViewLocal, material.coatNormalEnabled)":"openpbr_to_local(prepared.coatBasis, openpbr_to_world(prepared.basis, viewLocal))"}; }
var ad = aD(
dT,

aN(material.coatRoughness, material.coatAnisotropy),
vec2f(cH, fL)
);
if (ad.z < 0.0) {
ad = -ad;
}
lightLocal = normalize(reflect(-dT, ad));
${e?`
if (material.coatNormalEnabled) {

*lightDirection = openpbr_to_world(prepared.coatBasis, lightLocal);
return (lightLocal.z > 0.0) & (dot(material.geometricNormal, *lightDirection) > 0.0);
}
`:""}
if (prepared.directionFrames) { lightLocal = openpbr_to_local(prepared.basis, openpbr_to_world(prepared.coatBasis, lightLocal)); }
}
`:`
else if (bv < cdf[OPENPBR_LOBE_COAT]) {
*aS = material.coatRoughness;
*bu = true;
*bn = u32(OPENPBR_LOBE_COAT);
var ad = aD(
viewLocal,

aN(material.coatRoughness, material.coatAnisotropy),
vec2f(cH, fL)
);
if (ad.z < 0.0) {
ad = -ad;
}
lightLocal = normalize(reflect(-viewLocal, ad));
}
`}
else if (bv < cdf[OPENPBR_LOBE_SPECULAR]) {
*aS = material.specularRoughness;
*bu = true;
*bn = select(
u32(OPENPBR_LOBE_SPECULAR),
u32(OPENPBR_LOBE_METAL),
bv < cdf[OPENPBR_LOBE_METAL]
);
let uP = bv < cdf[OPENPBR_LOBE_METAL];
let sN = (bv - cdf[OPENPBR_LOBE_COAT]) / max(prepared.probabilities[OPENPBR_LOBE_METAL], 1e-12);
if (uP & (sN < prepared.metalMsProbability)) {
let z = cH;
let ex = sqrt(max(0.0, 1.0 - z * z));
let azimuth = TWOPI * fL;
lightLocal = vec3f(ex * cos(azimuth), ex * sin(azimuth), z);
}
else {
var ad = aD(
viewLocal,
vec2f(material.alphaX, material.alphaY),
vec2f(cH, fL)
);
if (ad.z < 0.0) {
ad = -ad;
}
lightLocal = normalize(reflect(-viewLocal, ad));
}
}
else if (bv < cdf[OPENPBR_LOBE_TRANSMISSION]) {
*aS = material.specularRoughness;
*bu = true;
*isTransmissionEvent = true;
*bn = u32(OPENPBR_LOBE_TRANSMISSION);


let vS = (bv - cdf[OPENPBR_LOBE_SPECULAR]) / max(prepared.probabilities[OPENPBR_LOBE_TRANSMISSION], 1e-12);
if ((prepared.dielectricMsProbability > 0.0) & (vS < prepared.dielectricMsProbability)) {
let ju = prepared.dielectricMsReflectionRatio;
let mJ = cH < ju;
var z: f32;
if (mJ) { z = min(cH / ju, 0.99999994); }
else { z = -min((cH - ju) / (1.0 - ju), 0.99999994); }
let ex = sqrt(max(0.0, 1.0 - z * z));
let azimuth = TWOPI * fL;
lightLocal = vec3f(ex * cos(azimuth), ex * sin(azimuth), z);
*isTransmissionEvent = !mJ;
*bn = select(u32(OPENPBR_LOBE_TRANSMISSION), u32(OPENPBR_LOBE_SPECULAR), mJ);
}
else {
var ad = aD(
viewLocal,
vec2f(material.alphaX, material.alphaY),
vec2f(cH, fL)
);
if (ad.z < 0.0) {
ad = -ad;
}
if (material.thinWalled) {
let iC = normalize(reflect(-viewLocal, ad));
lightLocal = vec3f(iC.xy, -iC.z);
}
else {
lightLocal = refract(
-viewLocal,
ad,
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
*aS = 1.0;
*cO = true;
*isTransmissionEvent = true;
*bn = u32(OPENPBR_LOBE_SUBSURFACE);
if (material.thinWalled) {
let qL = cH >= 0.5;
if (qL) {
cH = (cH - 0.5) * 2.0;
}
else {
cH *= 2.0;
}
lightLocal = aO(vec2f(cH, fL));
if (qL) {
lightLocal.z = -lightLocal.z;
}
else {
*isTransmissionEvent = false;
}
}
else {
lightLocal = aO(vec2f(cH, fL));
lightLocal.z = -lightLocal.z;
}
}

*lightDirection = openpbr_to_world(prepared.basis, lightLocal);



if ((lightLocal.z == 0.0) | ((lightLocal.z < 0.0) != *isTransmissionEvent)) {
return false;
}
${e?`
if (material.coatNormalEnabled &
((dot(material.geometricNormal, *lightDirection) <= 0.0) != *isTransmissionEvent)) { return false; }
`:""}
return true;
}

fn eN(
prepared: ag,
cq: vec3f,
lightDirection: ptr<function, vec3f>,
pdf: ptr<function, f32>,
isTransmissionEvent: ptr<function, bool>,
aS: ptr<function, f32>,
bu: ptr<function, bool>,
cO: ptr<function, bool>,
bn: ptr<function, u32>,
lW: ptr<function, f32>,
kq: ptr<function, vec3f>
) -> vec3f {
*pdf = 0.0;
*lW = 0.0;
*kq = vec3f(0.0);




if (!prepared.material.thinWalled &
(abs(prepared.material.relativeIor - 1.0) <= 1e-6) &
(prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] >= 1.0 - 1e-6)) {
*lightDirection = openpbr_to_world(
prepared.basis,
-prepared.viewLocal
);
let oF = bh(prepared.material)
* cF(prepared, ${e?"select(-prepared.viewLocal.z, dot(prepared.coatBasis.normal, *lightDirection), prepared.material.coatNormalEnabled)":"-prepared.viewLocal.z"});
*pdf = 1.0;
*lW = 1.0;
*kq = oF;
*isTransmissionEvent = true;
*aS = 0.0;
*bu = true;
*cO = false;
*bn = u32(OPENPBR_LOBE_TRANSMISSION);
return oF;
}
if (!jq(prepared, cq, lightDirection,
isTransmissionEvent, aS, bu,
cO, bn)) { return vec3f(0.0); }
let response = bO(prepared, *lightDirection, pdf);
*lW = *pdf;
*kq = response;
return response;
}

fn tZ(
tangent: vec3f,
material: OpenPbrResolvedMaterial,
cq: vec3f,
bM: vec3f,
normal: vec3f,
lightDirection: ptr<function, vec3f>,
pdf: ptr<function, f32>,
isTransmissionEvent: ptr<function, bool>,
aS: ptr<function, f32>,
bu: ptr<function, bool>,
cO: ptr<function, bool>,
bn: ptr<function, u32>,
lW: ptr<function, f32>
) -> vec3f {
let prepared = ds(
tangent,
material,
bM,
normal
);
var kq = vec3f(0.0);
return eN(
prepared,
cq,
lightDirection,
pdf,
isTransmissionEvent,
aS,
bu,
cO,
bn,
lW,
&kq
);
}`}var b_=jo();var Hf=`




fn aD(view: vec3f, alpha: vec2f, samplePoint: vec2f) -> vec3f {
let sv = vec3f(alpha, 1.0);
let cr = normalize(sv * view);
let qP = min(cr.z, 1.0);
let kh = 1.0 + qP;
let kC = (1.0 - samplePoint.y) * kh;
let sU = samplePoint.y * kh;
let tY = kC + (1.0 - qP);
let ex = sqrt(max(0.0, tY * sU));
let azimuth = TWOPI * samplePoint.x;
let mr = vec3f(
cr.x + ex * cos(azimuth),
cr.y + ex * sin(azimuth),
kC
);
return normalize(sv * mr);
}

fn cW(pf: vec3f, alpha: vec2f) -> f32 {
let hF = vec3f(
pf.x / alpha.x,
pf.y / alpha.y,
pf.z
);
let aq = dot(hF, hF);
return 1.0 / (
PI * alpha.x * alpha.y * aq * aq
);
}

fn aF(direction: vec3f, alpha: vec2f) -> f32 {
let eQ = abs(direction.z);
if (eQ <= 1e-8) {
return 0.0;
}
let iE = alpha * direction.xy;
let mt = dot(iE, iE)
/ (eQ * eQ);
return 2.0 / (1.0 + sqrt(1.0 + mt));
}

fn aI(cosine: f32) -> f32 {
let dw = clamp(1.0 - cosine, 0.0, 1.0);
return pow(dw, 5.0);
}

fn cC(J: f32, cR: f32) -> f32 {
let iS = clamp(abs(J), 0.0, 1.0);
let kQ = cR * cR
* max(0.0, 1.0 - iS * iS);
if (kQ >= 1.0) {
return 1.0;
}

let mD = sqrt(max(0.0, 1.0 - kQ));
let bk = (iS - cR * mD)
/ max(iS + cR * mD, 1e-8);
let qC = (cR * iS - mD)
/ max(cR * iS + mD, 1e-8);
return 0.5 * (
bk * bk + qC * qC
);
}

fn gy(samplePoint: vec2f) -> vec2f {
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

fn aO(samplePoint: vec2f) -> vec3f {
let lk = gy(samplePoint);
return vec3f(
lk,
sqrt(max(0.0, 1.0 - dot(lk, lk)))
);
}

fn aK(qo: f32, oJ: f32) -> f32 {
let scale = max(qo, oJ);
if (scale <= 0.0) {
return 0.0;
}
let normalized = vec2f(qo, oJ) / scale;
let pL = normalized * normalized;
return pL.x / (pL.x + pL.y);
}

fn aP(
normal: vec3f,
tangent: ptr<function, vec3f>,
bitangent: ptr<function, vec3f>
) {
let iI = select(-1.0, 1.0, normal.z >= 0.0);
let cL = -1.0 / (iI + normal.z);
let xy = normal.x * normal.y * cL;
*tangent = vec3f(
1.0 + iI * normal.x * normal.x * cL,
iI * xy,
-iI * normal.x
);
*bitangent = vec3f(
xy,
iI + normal.y * normal.y * cL,
-normal.y
);
}

fn aj(rgb: vec3f, wavelength: f32) -> vec3f {
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

fn ee(
wavelength: f32,
hu: f32,
hD: f32,
rt: f32
) -> f32 {
if (wavelength == 0.0 || hD <= 0.0) {
return hu;
}

let FRAUNHOFER_C = 656.3;
let FRAUNHOFER_D = 587.6;
let FRAUNHOFER_F = 486.1;
let kv = 1.0 / (
1.0 / (FRAUNHOFER_F * FRAUNHOFER_F)
- 1.0 / (FRAUNHOFER_C * FRAUNHOFER_C)
);
let oe = max(rt / hD, 1e-6);
let rV = (hu - 1.0) * kv / oe;
let uK = hu
- rV / (FRAUNHOFER_D * FRAUNHOFER_D);
return uK + rV / (wavelength * wavelength);
}

fn fH(
gO: vec3f,
anisotropy: f32,
samplePoint: vec2f
) -> vec3f {
var cosine: f32;
if (abs(anisotropy) < 0.001) {
cosine = 1.0 - 2.0 * samplePoint.y;
}
else {
let ju = (1.0 - anisotropy * anisotropy)
/ (1.0 + anisotropy - 2.0 * anisotropy * samplePoint.y);
cosine = (
ju * ju - 1.0 - anisotropy * anisotropy
) / (2.0 * anisotropy);
}

let vF = sqrt(max(0.0, 1.0 - cosine * cosine));
let azimuth = TWOPI * samplePoint.x;
var tangent: vec3f;
var bitangent: vec3f;
aP(gO, &tangent, &bitangent);
return tangent * (vF * cos(azimuth))
+ bitangent * (vF * sin(azimuth))
+ gO * cosine;
}

fn bL(cosine: f32, anisotropy: f32) -> f32 {
let aq = 1.0 + anisotropy * anisotropy
+ 2.0 * anisotropy * cosine;
return INV4PI * (1.0 - anisotropy * anisotropy)
/ (aq * sqrt(aq));
}
`;var Wf=`




const SHADOW_CATCHER_LIGHT_SAMPLES = 4u;






fn sampleShadowCatcher(si: SurfaceInteraction, bounce: i32, aa: ptr<function, Path>) -> vec2f {
let qY = -(*aa).ray.d;
var counts = vec2f(0.0);



if (rtUniform.shadowCatcherChoiceCount > 0) {
for (var candidate = 0u; candidate < SHADOW_CATCHER_LIGHT_SAMPLES; candidate++) {
var lightSample: LightSampleRec;
let lV = vec3f(dZ(sl(candidate, 1u)), dp(sl(candidate, 0u)));
hv(
si.position,
lV,
rtUniform.shadowCatcherChoiceOffset,
rtUniform.shadowCatcherChoiceCount,
1.0,
&lightSample
);
let lightDir = lightSample.direction;
let cosThetaL = dot(si.normal, lightDir);
let qB = dot(si.normal, qY) * cosThetaL;
if (lightSample.pdf > 0.0 && qB >= 0.0) {
if (dot(lightSample.emission, luminance) * abs(cosThetaL) > 0.0) {
var ray: Ray;
gC(&ray, si.position + EPS * lightDir, lightDir);
let lY = intersectSceneShadow(ray, lightSample.dist - EPS, si.triangleIndex);
counts += vec2f(select(0.0, 1.0, lY), 1.0);
}
}
}
}
(*aa).fromEye = false;
return counts;
}
`;var Yf=`

fn textureLinear(tex: texture_2d<f32>, _uv: vec2f) -> vec4f {



let size = vec2f(textureDimensions(tex, 0));

let yq = _uv * size - vec2f(0.5);
let xI = floor(yq);
let f = fract(yq);
let xH = vec2i(xI);
let maximum = vec2i(size) - vec2i(1);


let s1 = textureLoad(tex, clamp(xH + vec2i(0, 0), vec2i(0), maximum), 0);
let s2 = textureLoad(tex, clamp(xH + vec2i(1, 0), vec2i(0), maximum), 0);
let s3 = textureLoad(tex, clamp(xH + vec2i(0, 1), vec2i(0), maximum), 0);
let s4 = textureLoad(tex, clamp(xH + vec2i(1, 1), vec2i(0), maximum), 0);

return mix(mix(s1, s2, f.x), mix(s3, s4, f.x), f.y);

}

fn eV(gx: vec3f) -> vec2f {
var phi = atan2(-gx.z, -gx.x);
if (phi < 0.0) {
phi += TWOPI;
}
let theta = acos(clamp(gx.y, -1.0, 1.0));
return vec2f(phi * 0.5 * INVPI, theta * INVPI);
}

fn ko() -> mat3x3f {
return mat3x3f(rtUniform.environmentRotation[0].xyz, rtUniform.environmentRotation[1].xyz, rtUniform.environmentRotation[2].xyz);
}

fn dm(nO: vec3f) -> vec2f {
return eV(transpose(ko()) * nO);
}

fn rE(u: f32, vOffset: ptr<function, i32>, pdf: ptr<function, vec2f>) -> f32 {
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

fn rD(u: f32, vOffset: i32, pdf: ptr<function, vec2f>) -> f32 {
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
let pO = left - 1;



let s0 = textureLoad(envMapDistribution, vec2i(1 + pO, vOffset), 0).xy;
let s1 = textureLoad(envMapDistribution, vec2i(1 + pO + 1, vOffset), 0).xy;

(*pdf).x = s0.y;

return (f32(pO) + (u - s0.x) / (s1.x - s0.x)) / f32(size.x);
}



fn eW(ew: vec2f, v: f32) -> f32 {
if (!(v > 0.0 && v < 1.0)) { return 0.0; }
let sinTheta = sin(min(v, 1.0 - v) * PI);
return ew.x * ew.y * INVPI2 / (2.0 * sinTheta);
}


fn pI(random: vec2f, uv: ptr<function, vec2f>, pdf: ptr<function, f32>) -> vec3f {
var ew: vec2f;
var vOffset: i32;

(*uv).y = rE(random.x, &vOffset, &ew);
(*uv).x = rD(random.y, vOffset, &ew);

let phi = (*uv).x * TWOPI;
let theta = (*uv).y * PI;
let ci = cos(theta);
let sinTheta = sin(theta);
let vM = cos(phi);
let vX = sin(phi);

let dir = vec3f(-sinTheta * vM, ci, -sinTheta * vX);

*pdf = eW(ew, (*uv).y);

return ko() * dir;
}

fn iT(_uv: vec2f) -> f32 {
let size = vec2f(textureDimensions(envMap, 0));

let xO = clamp(vec2i(_uv * size), vec2i(0), vec2i(size) - vec2i(1));

let ub = textureLoad(envMapDistribution, vec2i(1 + xO.x, xO.y), 0).y;
let uc = textureLoad(envMapDistribution, vec2i(0, xO.y), 0).y;

return eW(vec2f(ub, uc), _uv.y);
}


`;var jf=`

fn sphericalProjection(pos: vec3f) -> vec2f {
let n = normalize(pos);
let theta = atan2(n.x, n.z) / (2.0 * PI) + 0.5;
let phi = acos(n.y) / PI;
return vec2f(theta, 1.0 - phi);
}
fn jh(pos: vec3f, normal: vec3f) -> vec2f {
let dI = abs(normal);
var uv = vec2f(0.0);
if (dI.x > dI.y && dI.x > dI.z) {
uv = pos.yz;
} else if (dI.y > dI.x && dI.y > dI.z) {
uv = pos.xz;
} else {
uv = pos.xy;
}
return uv;
}




fn hT(pos: vec3f, normal: vec3f) -> vec2f {
let theta = atan2(pos.z, pos.x) / (2.0 * PI) + 0.5;
return vec2f(theta, pos.y);
}

fn gU(fE: i32, pos: vec3f, normal: vec3f) -> vec2f {
if (fE == ${ot.triplanar}) {
return jh(pos, normal);
} else if (fE == ${ot.spherical}) {
return sphericalProjection(pos);
} else if (fE == ${ot.cylindrical}) {
return hT(pos, normal);
}
return vec2f(0.0);
}
`;var sr=8;function Vo({hasDisplacement:i,hasAnisotropyDirections:e=!1,hasCoatNormals:t=!1,hasAlpha:A=!0,hasSceneAlpha:a=!0,blasLayoutMask:r=1,spectral:n,sceneCapabilities:s,dynamicEnvironment:o=!1,materialCapabilities:l=Qf,lightCapabilities:c},f="",m=!1,d){e||=t;let u=A,p=s===void 0||(s&Ut.HAS_SHADOW_CATCHER)!==0,g=`
var si: SurfaceInteraction;
var ma: OpenPbrResolvedMaterial;
si.albedoSampled = false;
si.mediumType = 0;
si.mediumExtinction = vec3f(0.0);
si.mediumScattering = vec3f(0.0);
si.mediumAnisotropy = 0.0;
si.barycentrics = vec2f(0.0);

`,v=`${d?.primarySurface??""}  if (${p?"si.hit && ma.materialType == SHADOW_CATCHER":"false"}) {
(*outAux).isShadowCatcher = true;


(*outAux).albedo = vec3f(1.0);
(*outAux).normal = select(si.normal, -si.normal, dot(si.normal, ray.d) > 0.0);
var aa: Path;
aa.ray = ray;
aa.fromEye = true;
(*outAux).shadowCounts = sampleShadowCatcher(si, 0, &aa);


return vec4f(1.0);
}
else {
if (HAS_BEVEL && rtUniform.bevel != 0) {
if (ma.bevel > 0.0) {
si.normal = nj(si, ma.bevel);
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


}
`,B=`

${Of}

${Oo({hasSceneAlpha:a,hasAnisotropyDirections:e,hasCoatNormals:t,lightCapabilities:c})}

${jf}

${Fo({hasSceneAlpha:a,hasAnisotropyDirections:e,hasCoatNormals:t,hasTransmission:(l&oA.transmission)!==0,hasMetalness:(l&oA.metal)!==0})}

${ko({hasDisplacement:i,blasLayoutMask:r,hasAnisotropyDirections:e,hasCoatNormals:t,sceneIntersections:f})}
${zf}
${Go}
${Yf}

${Hf}
${jo(e,t)}
${kf}${d?.declarations??""}


var<private> vg: u32 = 0u;



fn kB() -> u32 {
return u32(max(rtUniform.directLightCandidates, 1));
}




fn qx(ys: u32) -> f32 {




if (SAMPLING_PATTERN == 2) { _ = rand(); }
let kI = aZ.x + aZ.y * u32(rtUniform.outputSize.x);
let key = ar(ar(kI, aQ), rtUniform.sequenceSeed);
let dimension = ar(bT, ys) ^ 0xa511e9b3u;
return f32(dG(key ^ dimension) >> 8u) * (1.0 / 16777216.0);
}



fn uS(fA: f32, scatteringPdf: f32) -> f32 {
let candidateCount = kB();
if (candidateCount <= 1u) {
return aK(fA, scatteringPdf);
}
let jb = f32(candidateCount) * fA;
return jb /
max(jb + scatteringPdf, 1e-20);
}


fn gj(scatteringPdf: f32, fA: f32) -> f32 {
let candidateCount = kB();
if (candidateCount <= 1u) {
return aK(scatteringPdf, fA);
}
let jb = f32(candidateCount) * fA;
return scatteringPdf /
max(scatteringPdf + jb, 1e-20);
}

${Ho(e,t)}
${Wf}


@group(3) @binding(0) var<storage, read_write> outColor: array<vec4f>;
@group(3) @binding(1) var<storage, read_write> outNormal: array<vec4f>;
@group(3) @binding(2) var<storage, read_write> outAlbedo: array<vec4f>;

${lA}
@group(3) @binding(3) var<storage, read_write> outShadowCatcher: array<ShadowCatcherAccumulation>;


fn ie(
gv: u32,
radiance: vec3f,
normal: vec3f
) {
if (rtUniform.varianceMoments != 0) {
let value = dot(radiance, luminance);
outNormal[gv] += vec4f(value * value, 0.0, 0.0, 1.0);
}
else {
outNormal[gv] += vec4f(normal, 1.0);
}
}



fn ji(gv: u32, value: f32) {
outShadowCatcher[gv].moments += vec4f(value, value * value, 0.0, 0.0);
}


struct RayTraceAuxiliary {

albedo: vec3f,
isShadowCatcher: bool,
normal: vec3f,
isBlank: bool,

shadowCounts: vec2f,
}

fn dK(point: vec3f, height: f32, radius: f32) -> f32 {
let ge = length(point);
if (ge < 0.00001) {
return -radius;
}

let iX = radius * point.y / ge;
let iL = -1.5 * height;
var eH: f32;
if (iX >= 0.0) {
eH = radius;
}
else if (iX < iL) {
eH = -height * ge / point.y;
}
else {
let cL = 1.0
- iX * iX / (3.0 * iL * iL);
eH = radius * cL;
}
return ge - eH;
}

fn fd(origin: vec3f, direction: vec3f) -> vec3f {
if (!USE_GROUNDED_BACKGROUND) {
return direction;
}
let params = rtUniform.groundedBackgroundParams;
let cf = normalize(direction);
let center = vec3f(
rtUniform.groundedBackgroundCenter.x,
params.z + params.x,
rtUniform.groundedBackgroundCenter.y
);
let bI = origin - center;
let eT = dot(bI, cf);
let br = eT * eT
- dot(bI, bI) + params.y * params.y;
if (
br <= 0.0
|| dK(bI, params.x, params.y) > 0.0
) {
return direction;
}

var cM = -eT + sqrt(br);
if (cM <= 0.0) {
return direction;
}

let oK = bI + cf * cM;
if (oK.y >= 0.0) {
return normalize(oK);
}

if (cf.y < -0.00001 && params.y > 1.5 * params.x) {
let ir = (-params.x - bI.y) / cf.y;
let oB = bI + cf * ir;
let pe = (2.0 / 3.0)
* sqrt(params.y * params.y - 2.25 * params.x * params.x);
if (ir > 0.0 && length(oB.xz) <= pe) {
return normalize(oB);
}
}

var cV = 0.0;
for (var i = 0; i < 14; i++) {
let fB = (cV + cM) * 0.5;
let qy = bI + cf * fB;
if (dK(qy, params.x, params.y) > 0.0) {
cM = fB;
}
else {
cV = fB;
}
}
let hit = bI + cf * ((cV + cM) * 0.5);
return normalize(hit);
}

fn hX(ray: Ray) -> vec4f {
var bg = vec4f(0.0);
if (USE_BACKGROUND_MAP) {
let d = fd(ray.o, ray.d);
let t = rtUniform.backgroundMapTransform;
let qZ = vec3f(t.x * d.x - t.y * d.z, d.y, t.y * d.x + t.x * d.z);
let rotation = rtUniform.backgroundMapRotation;
let hn = transpose(mat3x3f(rotation[0].xyz, rotation[1].xyz, rotation[2].xyz)) * qZ;
let bc = textureLinear(backgroundMap, eV(hn));
bg = vec4f(bc.rgb * t.z, bc.a);
}
else if (USE_BACKGROUND) {
bg = rtUniform.backgroundColor;
}
else if (USE_ENVMAP) {
bg = textureLinear(envMap, dm(ray.d));
}
return bg;
}

fn di(ray: Ray, wavelength: f32) -> vec4f {
let bg = hX(ray);
if (SPECTRAL) {
return vec4f(aj(bg.rgb, wavelength), bg.a);
}
return bg;
}



fn nY(uv: vec2f, aa: ptr<function, Path>, depth: ptr<function, i32>, si: ptr<function, SurfaceInteraction>, ma: ptr<function, OpenPbrResolvedMaterial>, outAux: ptr<function, RayTraceAuxiliary>, fm: ptr<function, bool>) {
*fm = false;
bT = u32(max(*depth, 0));
let matType = (*ma).materialType;
let isShadowCatcher = ${p?"matType == SHADOW_CATCHER":"false"};
if (isShadowCatcher) {
if ((*aa).fromEye) {
(*si).hit = false;
}
else {



if (USE_ENVMAP) {
if ((*aa).isNextRefraction) {


let bg = di(
(*aa).ray,
(*si).wavelength
);
let da = select(gj((*aa).scatteringPdf,
iT(dm((*aa).ray.d)) * rtUniform.envLightPmf),
1.0, (*aa).scatteringIsDelta);
(*aa).li += da * (*aa).beta * bg.rgb * bg.a;
(*aa).alpha = max((*aa).alpha, bg.a);
}
else {
let vo = dm((*aa).ray.d);
var emission = textureLinear(envMap, vo).rgb;
if (SPECTRAL) {
emission = aj(emission, (*si).wavelength);
}
(*aa).li += (*aa).beta * emission *
gj((*aa).scatteringPdf, iT(vo));
}
}
else {
let bg = di(
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



let bg = di(
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
let cam = fj(uv);
let nK = dot(cam.d, (*aa).ray.d) > 0.0;
if (rtUniform.transmissiveOutputAlphaMin < 1.0) {
if (nK) {
(*aa).alpha = max((*aa).alpha, bg.a);
} else {
(*aa).alpha = 1.0;
}
}
if (!USE_ENVMAP) {


if (nK) {


(*aa).li += (*aa).beta *
gj((*aa).scatteringPdf, 1.0) * bg.rgb;
}
}
}
(*aa).abort = true;
return;
}


if ((matType == STANDARD || matType == UNLIT)) {
let alpha = clamp((*ma).alpha, 0.0, 1.0);

if (alpha < 1.0) {


if (alpha <= 0.0 || eC(3u) > alpha) {
(*fm) = true;
}
}
if (!(*fm) && rtUniform.transmissiveOutputAlphaMin < 1.0) {


let outputAlpha = max(1.0 - (*ma).transmissionWeight, 1.0 - pow(1.0 - rtUniform.transmissiveOutputAlphaMin, f32(*depth)));
(*aa).alpha = max(outputAlpha, (*aa).alpha);
}
if (!(*fm)) {
vg = u32(max(*depth, 0));
mL(si, ma, aa);
}
else {


(*aa).ray.o = (*si).position + (*aa).ray.d * EPS;
}
}

if (!(*si).albedoSampled && !(*fm)) {

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
if (*depth >= RR_MAX && !(*fm)) {
let pG = (*aa).beta;

let pn = max(max(pG.x, pG.y), pG.z);
let q: f32 = max(0.0, 1.0 - pn);
if (dp(cE(RUSSIAN_ROULETTE)) < q) {


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


}

fn kl(aa: ptr<function, Path>, depth: ptr<function, i32>, si: ptr<function, SurfaceInteraction>, ma: ptr<function, OpenPbrResolvedMaterial>, aJ: bool) {
if (SPECTRAL) {

if ((*ma).transmissionWeight > 0.001) {
(*ma).specularIor = ee(
(*si).wavelength,
(*ma).specularIor,
(*ma).transmissionDispersionScale,
(*ma).dispersionAbbeNumber
);
}
}

if (aJ) {
return;
}


var lightSample: LightSampleRec;
let hM = eC(3u) < (*ma).alpha;
for (var i = 0; i < rtUniform.lightsCount; i++) {

let light: Light = analyticLights[i];
let d = nr((*aa).ray, light, &lightSample);
lightSample.pdf *= light.selectionPmf;
let lY = (*si).hit && d > distance((*si).position, (*aa).ray.o);
if (d != INF && !(lY && hM)) {
let fl = gj((*aa).scatteringPdf, lightSample.pdf);
if (SPECTRAL) {
lightSample.emission = aj(lightSample.emission, (*si).wavelength);
}
(*aa).li += fl * (*aa).beta * lightSample.emission;
(*aa).alpha = 1.0;
(*aa).abort = true;
}
}

if (USE_ENVMAP) {
if (!((*si).hit && hM)) {
if ((*aa).isNextRefraction) {



let bg = di(
(*aa).ray,
(*si).wavelength
);
let da = select(gj((*aa).scatteringPdf,
iT(dm((*aa).ray.d)) * rtUniform.envLightPmf),
1.0, (*aa).scatteringIsDelta);
(*aa).li += da * (*aa).beta * bg.rgb * bg.a;
(*aa).alpha = max((*aa).alpha, bg.a);
(*aa).abort = true;
return;
}
let _uv = dm((*aa).ray.d);
var emission = textureLinear(envMap, _uv).rgb;
let fl = gj(
(*aa).scatteringPdf,
iT(_uv) * rtUniform.envLightPmf
);
if (SPECTRAL) {
emission = aj(emission, (*si).wavelength);
}

if (!USE_BACKGROUND) {
(*aa).alpha = 1.0;
}
(*aa).li += (*aa).beta * emission * fl;
(*aa).abort = true;
}
}

*depth = *depth + 1;
}

fn fj(coord: vec2f) -> Ray {
let origin = cameraUniform.viewProjectionInv * vec4f(coord * 2.0 - 1.0, -1.0, 1.0);
let center = cameraUniform.viewProjectionInv * vec4f(coord * 2.0 - 1.0, 1.0, 1.0);
var cam: Ray;
gC(&cam, origin.xyz / origin.w, normalize(center.xyz * origin.w - origin.xyz * center.w));

return cam;
}


fn ld(radius: f32, xi: f32) -> vec2f {
var x = 0.25;
for (var oD = 0; oD < 10; oD++) {
let x2 = x * x;
let x3 = x2 * x;
let lw = 1.0 - x;
let value = 10.0 * x2 - 20.0 * x3 + 15.0 * x2 * x2 -
4.0 * x2 * x3 - xi;
let mX = 20.0 * x * lw * lw * lw;
if (abs(value) < 1e-6 || mX == 0.0) { break; }
x = clamp(x - value / mX, 0.0, 1.0);
}
let jL = x * radius;
return vec2f(jL, sqrt(max(radius * radius - jL * jL, 0.0)));
}

fn jj(radius: f32, gM: f32) -> f32 {
if (gM >= radius) { return 0.0; }
let pa = radius - gM;
return pa * pa * pa;
}


fn nj(source: SurfaceInteraction, radius: f32) -> vec3f {
var geometricNormal = source.faceNormal;
if (dot(geometricNormal, source.vertexNormal) < 0.0) {
geometricNormal = -geometricNormal;
}
var tangent: vec3f;
var bitangent: vec3f;
aP(geometricNormal, &tangent, &bitangent);
var iW = vec3f(0.0);

for (var iG = 0; iG < BEVEL_SAMPLES; iG++) {
let qf = dZ(CAMERA_BEVEL_BASE + u32(iG));
var cJ = qf.x;
let pv = qf.y;
var dz = geometricNormal;
var fW = tangent;
var eA = bitangent;
var gu = 0.5;
var iB = 0.25;
var gT = 0.25;
if (cJ < 0.5) {
cJ *= 2.0;
}
else if (cJ < 0.75) {
let nI = dz;
dz = fW;
fW = nI;
gu = 0.25;
iB = 0.5;
cJ = (cJ - 0.5) * 4.0;
}
else {
let nI = dz;
dz = eA;
eA = nI;
gu = 0.25;
gT = 0.5;
cJ = (cJ - 0.75) * 4.0;
}

let hj = ld(radius, pv);
let phi = TWOPI * cJ;
let rw = hj.x *
(cos(phi) * fW + sin(phi) * eA);
var ray: Ray;
gC(
&ray,
source.position + dz * hj.y + rw,
-dz
);
var hit: SurfaceInteraction;
intersectSceneBevel(
ray,
&hit,
source.instanceIndex,
max(2.0 * hj.y, EPS)
);
if (!hit.hit) { continue; }

let lA = gu * abs(dot(dz, hit.faceNormal));
let nC = iB * abs(dot(fW, hit.faceNormal));
let kG = gT * abs(dot(eA, hit.faceNormal));
var weight = lA / max(
lA * lA + nC * nC +
kG * kG,
1e-8
);
weight *= jj(radius, distance(hit.position, source.position)) /
max(jj(radius, hj.x), 1e-8);
iW += weight * hit.vertexNormal;
}

if (dot(iW, iW) <= 1e-12) { return source.normal; }
let kg = normalize(iW);
let result = source.normal + kg - source.vertexNormal;
if (dot(result, result) > 1e-12) { return normalize(result); }
return source.normal;
}

fn cT(uv: vec2f, si: ptr<function, SurfaceInteraction>, ray: Ray, ma: ptr<function, OpenPbrResolvedMaterial>, outAux: ptr<function, RayTraceAuxiliary>, sh: bool) -> vec4f {
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

let bounceLimit = max(rtUniform.bounces, 0);
let ft = min(bounceLimit * 3, ${20});
var depth = 0;
var aJ = false;
var bQ = false;




for (var event = 0; event <= ft; event++) {
if ((event != 0) | sh) {
intersectScene(aa.ray, si, depth, event != 0, aa.isNextRefraction);
dg(ma, (*si).materialIndex, (*si).uv, (*si).uv1, (*si).instanceIndex, (*si).vertexColor);
}
if (event == 0) {
if (sh & (*si).hit & ((*ma).materialType == STANDARD)) {
(*outAux).albedo = select((*ma).baseColor, vec3f(1.0), (*ma).transmissionWeight > 0.5);
(*outAux).normal = select((*si).normal, -(*si).normal,
dot((*si).normal, (*si).position - cameraUniform.viewInv[3].xyz) > 0.0);
(*si).albedoSampled = (*ma).transmissionWeight > 0.5;
}
bQ = ((*ma).transmissionWeight < 0.001) & ((*ma).subsurfaceWeight < 0.001) & ((*ma).alpha > 0.99);
} else {
kl(&aa, &depth, si, ma, aJ);
}
if (bQ & (event > bounceLimit)) { aa.abort = true; }
if (aa.abort | (event >= ft)) { break; }
nY(uv, &aa, &depth, si, ma, outAux, &aJ);
if (aa.abort) { break; }
}

return vec4f(aa.li, aa.alpha);
}

fn iU(uv: vec2f, si: ptr<function, SurfaceInteraction>, ray: Ray, ma: ptr<function, OpenPbrResolvedMaterial>, outAux: ptr<function, RayTraceAuxiliary>) -> vec4f {
${u?`let coverage = clamp((*ma).alpha, 0.0, 1.0);




let split = (*si).hit & (((*ma).materialType == STANDARD) | ((*ma).materialType == UNLIT)) & (coverage < 1.0);
var sB = ray;
var tr = *si;
var tq = *ma;
var iP = *outAux;
if (split) {
sB.o = (*si).position + ray.d * (EPS * 0.02);
tr.albedoSampled = false;
}
var back: vec4f;
var ez: RayTraceAuxiliary;


let vh = select(1u, rtUniform.loopUnrollGuard >> 1u, split & (coverage > 0.0));
for (var uI = 0u; uI < vh; uI++) {
let result = cT(uv, &tr, sB, &tq, &iP, split & (uI == 0u));
if (!split | (coverage <= 0.0)) { *outAux = iP; return result; }
if (uI == 0u) {
back = result; ez = iP;
tr = *si; tq = *ma; tq.alpha = 1.0;
sB = ray; iP = *outAux;
} else {
(*outAux).albedo = mix(ez.albedo, iP.albedo, coverage);
let dl = mix(ez.normal, iP.normal, coverage);
(*outAux).normal = select(vec3f(0.0), normalize(dl), dot(dl, dl) > 1e-12);
(*outAux).isBlank = ez.isBlank & iP.isBlank;
(*outAux).isShadowCatcher = ez.isShadowCatcher & iP.isShadowCatcher;
(*outAux).shadowCounts = mix(ez.shadowCounts, iP.shadowCounts, coverage);
return mix(back, result, coverage);
}
}
return vec4f(0.0);`:"return cT(uv, si, ray, ma, outAux, false);"}
}



${n===!1&&u?`fn iu(uv: vec2f, ray: Ray, outAux: ptr<function, RayTraceAuxiliary>) -> vec4f {
${g}
var oI: SurfaceInteraction;
var oH: OpenPbrResolvedMaterial;
var ue: RayTraceAuxiliary;
var iY = false;
var query = true;
var split = false;
var coverage = 1.0;
var front = false;
var back: vec4f;
var ez: RayTraceAuxiliary;
var aa: Path; aa.ray = ray;
aa.alpha = select(1.0, 0.0, rtUniform.transmissiveOutputAlphaMin < 1.0);
aa.beta = vec3f(1.0); aa.fromEye = true;
let bounceLimit = max(rtUniform.bounces, 0);
let ft = min(bounceLimit * 3, ${20});
var event = 0; var depth = 0; var aJ = false;
var bQ = false;


for (var step = 0; step < (${20} + 1) * 2 + 2; step++) {
if (query) {
intersectScene(aa.ray, &si, depth, event != 0, aa.isNextRefraction);
dg(&ma, si.materialIndex, si.uv, si.uv1, si.instanceIndex, si.vertexColor);
}
query = true;
if (!iY) {
${v}
oI = si; oH = ma; ue = *outAux;
iY = true;
coverage = clamp(ma.alpha, 0.0, 1.0);
split = si.hit & ((ma.materialType == STANDARD) | (ma.materialType == UNLIT)) & (coverage < 1.0);
if (split) {
aa.ray.o = si.position + ray.d * (EPS * 0.02);
si.albedoSampled = false;
continue;
}
} else if ((event == 0) & !front & split) {
if (si.hit & (ma.materialType == STANDARD)) {
(*outAux).albedo = select(ma.baseColor, vec3f(1.0), ma.transmissionWeight > 0.5);
(*outAux).normal = select(si.normal, -si.normal,
dot(si.normal, si.position - cameraUniform.viewInv[3].xyz) > 0.0);
si.albedoSampled = ma.transmissionWeight > 0.5;
}
}
if (event == 0) {
bQ = (ma.transmissionWeight < 0.001) & (ma.subsurfaceWeight < 0.001) & (ma.alpha > 0.99);
} else {
kl(&aa, &depth, &si, &ma, aJ);
}
if (bQ & (event > bounceLimit)) { aa.abort = true; }
if (!aa.abort & (event < ft)) {
nY(uv, &aa, &depth, &si, &ma, outAux, &aJ);
}
if (aa.abort | (event >= ft)) {
let result = vec4f(aa.li, aa.alpha);
if (!split | (coverage <= 0.0)) { return result; }
if (front) {
(*outAux).albedo = mix(ez.albedo, (*outAux).albedo, coverage);
let dl = mix(ez.normal, (*outAux).normal, coverage);
(*outAux).normal = select(vec3f(0.0), normalize(dl), dot(dl, dl) > 1e-12);
(*outAux).isBlank = ez.isBlank & (*outAux).isBlank;
(*outAux).isShadowCatcher = ez.isShadowCatcher & (*outAux).isShadowCatcher;
(*outAux).shadowCounts = mix(ez.shadowCounts, (*outAux).shadowCounts, coverage);
return mix(back, result, coverage);
}
back = result; ez = *outAux;
front = true; query = false; event = 0; depth = 0; aJ = false;
si = oI; ma = oH; ma.alpha = 1.0; *outAux = ue;
aa = Path(); aa.ray = ray; aa.beta = vec3f(1.0); aa.fromEye = true;
aa.alpha = select(1.0, 0.0, rtUniform.transmissiveOutputAlphaMin < 1.0);
} else { event++; }
}
return vec4f(0.0);
}
`:n===!1&&!u?`fn iu(uv: vec2f, ray: Ray, outAux: ptr<function, RayTraceAuxiliary>) -> vec4f {
${g}
var aa: Path;
aa.ray = ray;
aa.alpha = select(1.0, 0.0, rtUniform.transmissiveOutputAlphaMin < 1.0);
aa.beta = vec3f(1.0);
aa.fromEye = true;
let bounceLimit = max(rtUniform.bounces, 0);
let ft = min(bounceLimit * 3, ${20});
var bQ = false;
var depth = 0;
var aJ = false;



for (var event = 0; event <= ft; event++) {
intersectScene(aa.ray, &si, depth, event != 0, aa.isNextRefraction);
dg(&ma, si.materialIndex, si.uv, si.uv1, si.instanceIndex, si.vertexColor);
if (event == 0) {
${v}
bQ = ma.transmissionWeight < 0.001 && ma.subsurfaceWeight < 0.001 && ma.alpha > 0.99;
} else {
kl(&aa, &depth, &si, &ma, aJ);
}
if (bQ && event > bounceLimit) { aa.abort = true; }
if (aa.abort || event >= ft) { break; }
nY(uv, &aa, &depth, &si, &ma, outAux, &aJ);
if (aa.abort) { break; }
}
return vec4f(aa.li, aa.alpha);
}
`:n===!0&&!u?`
fn iu(uv: vec2f, ray: Ray, outAux: ptr<function, RayTraceAuxiliary>) -> vec4f {
${g}
var oI: SurfaceInteraction;
var oH: OpenPbrResolvedMaterial;
var iY = false;
var aa: Path; aa.ray = ray;
let bounceLimit = max(rtUniform.bounces, 0);
let ft = min(bounceLimit * 3, ${20});
var depth = 0; var event = 0; var aJ = false;
var bQ = false;
var mx = 0;
let bo = rtUniform.dispersionWavelengths == 1;
var df = false;
var eX = 0;
var hz: vec4u;
var eO = 0u;
var ba: RayTraceAuxiliary;
let wavelengths = array<f32, 3>(650.0, 510.0, 475.0);
var color = vec3f(0.0); var alpha = 0.0;
var dO = vec3f(0.0);
var dP = vec3f(0.0);
var mN = true;



let wF = min((${20} + 1) * 3, i32(rtUniform.loopUnrollGuard * ${Math.ceil(63/4)}u));
for (var step = 0; step < wF; step++) {
if (!iY | ((event != 0) & !aa.abort)) {
intersectScene(aa.ray, &si, depth, event != 0, aa.isNextRefraction);
dg(&ma, si.materialIndex, si.uv, si.uv1, si.instanceIndex, si.vertexColor);
}
if (event == 0) {
if (!iY) {
${v}
oI = si; oH = ma; iY = true;
hz = s0; eO = cP;
df = si.hit & (ma.transmissionWeight > 0.001) & (ma.transmissionDispersionScale > 0.001);
if (bo & df) {
eX = min(i32(floor(dp(CAMERA_WAVELENGTH) * 3.0)), 2);
}
}
si = oI; ma = oH; ba = *outAux;
if (!bo) {
s0 = hz; cP = eO; bT = 0u;
ba.isBlank = false; ba.isShadowCatcher = false;
}
si.wavelength = 0.0;
if (!bo | df) {
si.wavelength = wavelengths[select(mx, eX, bo)];
ma.specularIor = ee(si.wavelength, ma.specularIor,
ma.transmissionDispersionScale, ma.dispersionAbbeNumber);
}
aa = Path(); aa.ray = ray; aa.beta = vec3f(1.0); aa.fromEye = true;
aa.alpha = select(1.0, 0.0, rtUniform.transmissiveOutputAlphaMin < 1.0);
depth = 0; aJ = false;
bQ = (ma.transmissionWeight < 0.001) & (ma.subsurfaceWeight < 0.001) & (ma.alpha > 0.99);
} else if (!aa.abort) {
kl(&aa, &depth, &si, &ma, aJ);
}
if (bQ & (event > bounceLimit)) { aa.abort = true; }
if (!aa.abort & (event < ft)) {
nY(uv, &aa, &depth, &si, &ma, &ba, &aJ);
}
if (aa.abort | (event >= ft)) {
let result = vec4f(aa.li, aa.alpha);
if (bo) {
*outAux = ba;
let scale = select(1.0, 3.0, df);
return vec4f(result.rgb * scale, result.a);
}
color += result.rgb; alpha = max(alpha, result.a);
dO += ba.albedo;
dP += ba.normal;
mN = mN & ba.isBlank;
mx++;
if (mx >= 3) {
(*outAux).albedo = dO / 3.0;
(*outAux).normal = dP / 3.0;
(*outAux).isBlank = mN;
return vec4f(color, alpha);
}
event = 0;
} else { event++; }
}
return vec4f(0.0);
}
`:`fn iu(uv: vec2f, ray: Ray, outAux: ptr<function, RayTraceAuxiliary>) -> vec4f {
${g}
intersectScene(ray, &si, 0, false, false);
dg(&ma, si.materialIndex, si.uv, si.uv1, si.instanceIndex, si.vertexColor);
${v}
if (SPECTRAL) {




let ug = array<f32, 3>(650.0, 510.0, 475.0);
var vl = vec3f(0.0);
var alpha = 0.0;
var dO = vec3f(0.0);
var dP = vec3f(0.0);
var mN = true;
var si2 = si;
var ma2 = ma;
let hz = s0;
let eO = cP;
let bo = rtUniform.dispersionWavelengths == 1;
let df = si.hit &&
ma.transmissionWeight > 0.001 &&
ma.transmissionDispersionScale > 0.001;
let tm = select(3, 1, bo);
var eX = 0;
if (bo && df) {


eX = min(i32(floor(dp(CAMERA_WAVELENGTH) * 3.0)), 2);
}
for (var i = 0; i < tm; i++) {



if (!bo) {
s0 = hz;
cP = eO;
bT = 0u;
}
si.wavelength = 0.0;
if (!bo || df) {
si.wavelength = ug[select(i, eX, bo)];
ma.specularIor = ee(
si.wavelength,
ma.specularIor,
ma.transmissionDispersionScale,
ma.dispersionAbbeNumber
);
}
var ba: RayTraceAuxiliary;
if (bo) {
ba = *outAux;
} else {
ba.albedo = (*outAux).albedo;
ba.normal = (*outAux).normal;
ba.isBlank = false;
ba.isShadowCatcher = false;
}
let res = iU(uv, &si, ray, &ma, &ba);
if (bo) {
*outAux = ba;
let scale = select(1.0, 3.0, df);
return vec4f(res.rgb * scale, res.a);
}
vl += res.rgb;
alpha = max(alpha, res.a);
dO += ba.albedo;
dP += ba.normal;
mN = mN && ba.isBlank;
si = si2;
ma = ma2;
}
(*outAux).albedo = dO / 3.0;
(*outAux).normal = dP / 3.0;
(*outAux).isBlank = mN;
return vec4f(vl, alpha);
}
else {
return iU(uv, &si, ray, &ma, outAux);
}
}
`}

fn kN(ip: vec2f) -> vec2f {
let p = 2.0 * ip - 1.0;
let greater = abs(p.x) > abs(p.y);
let r = select(p.y, p.x, greater);
let theta = select(PI * (0.5 - 0.25 * p.x / p.y), 0.25 * PI * p.y / p.x, greater);
return r * vec2f(cos(theta), sin(theta));
}


@compute @workgroup_size(${sr}, ${sr}, 1)
fn main(@builtin(global_invocation_id) globalId: vec3u) {
let outputSize = rtUniform.outputSize;
let scaleOffset = rtUniform.scaleOffset;
var jitter = rtUniform.jitter;

${m?`  if (globalId.y >= mtPathParameters.y) { return; }
let pathId = vec2u(globalId.x, globalId.y + mtPathParameters.x);
`:""}  let coord = ${m?"pathId":"globalId.xy"} * vec2u(scaleOffset.xy) + vec2u(scaleOffset.zw);
if (coord.x >= u32(outputSize.x) || coord.y >= u32(outputSize.y)) {
return;
}
let idx = coord.x + coord.y * u32(outputSize.x);

if (
rtUniform.adaptiveSampling != 0 &&
outNormal[idx].a >= textureLoad(
adaptiveSampleTargets,
vec2i(coord),
0
).r
) {
return;
}




let uv = (vec2<f32>(f32(coord.x), f32(coord.y)) + vec2f(0.5)) / outputSize;

aZ = coord;
aQ = u32(outNormal[idx].a) + rtUniform.sampleSequenceOffset;
bT = 0u; cP = 0u;
if (${d?.uniformJitter?"false":"SAMPLING_PATTERN == 0 || SAMPLING_PATTERN == 1"}) {
jitter = (dZ(CAMERA_PIXEL) - 0.5) / outputSize;
}
gW(coord, i32(aQ ^ dG(rtUniform.sequenceSeed)));
var cam = fj(uv + jitter);

if (cameraUniform.apertureRadius > 0.0) {

let eye = cameraUniform.viewInv[3].xyz;
let forward = -normalize(cameraUniform.viewInv[2].xyz);
let jN = eye + cam.d * (cameraUniform.focusDistance / dot(cam.d, forward));
let sK = cameraUniform.apertureRadius * kN(dZ(CAMERA_LENS));
let origin = (cameraUniform.viewInv * vec4f(sK, 0.0, 1.0)).xyz;
let dir = normalize(jN - origin);
gC(&cam, origin, dir);
}

var outAux: RayTraceAuxiliary;
outAux.albedo = vec3f(0.0);
outAux.normal = vec3f(0.0);
outAux.isBlank = false;
outAux.isShadowCatcher = false;
${m?`  mtPathBegin(coord);
`:""}${d?.begin??""}  var aW = iu(uv + jitter, cam, &outAux);
${d?.unclampedColor??""}


if (rtUniform.clamping > 0.0) {
let clamping = rtUniform.clamping;
aW = vec4(clamp(aW.rgb, -vec3f(clamping), vec3f(clamping)), aW.a);
}
if (!(aW.x < INF && aW.x > -EPS)) {
aW = vec4f(0.0, 0.0, 0.0, 1.0);
}

if (outAux.isShadowCatcher) {


let bc = hX(cam);
let rh = select(0.0, 1.0, bc.a >= 0.01);
let jW = vec4f(bc.rgb * bc.a, bc.a);



outShadowCatcher[idx].mask += vec4f(1.0, bc.a, rh, 0.0);
outShadowCatcher[idx].moments += vec4f(0.0, 0.0, outAux.shadowCounts);
outShadowCatcher[idx].background += jW;
outColor[idx] += jW;
outAlbedo[idx] += vec4f(outAux.albedo, rh);
ie(idx, bc.rgb, outAux.normal);


let counts = outAux.shadowCounts;
let visibility = 1.0 - select(0.0, counts.x / counts.y, counts.y > 0.0);
ji(idx, visibility * select(
1.0, dot(bc.rgb, luminance), bc.a >= 0.01
));
}
else {
if (HAS_SHADOW_CATCHER && outAux.isBlank && USE_BACKGROUND && !USE_BACKGROUND_MAP && rtUniform.backgroundColor.a >= 0.99999) {





outShadowCatcher[idx].background += aW;
outShadowCatcher[idx].mask.g += aW.a;
}
outColor[idx] += aW;
outAlbedo[idx] += vec4f(outAux.albedo, select(1.0, 0.0, outAux.isBlank));
ie(idx, aW.rgb, outAux.normal);
ji(idx, dot(aW.rgb, luminance));
}
${m?`  mtPathEnd(outAux.normal, outAux.albedo);
`:""}${d?.end??""}}
`+Lf+Rf+Uf,E={USE_BACKGROUND:1,USE_BACKGROUND_MAP:2,USE_GROUNDED_BACKGROUND:4};return B=B.replace(/\b(?:USE_BACKGROUND|USE_BACKGROUND_MAP|USE_GROUNDED_BACKGROUND)\b/g,x=>`((rtUniform.backgroundFlags & ${E[x]}) != 0)`),B=B.replace(new RegExp(`\\b(?:${Object.keys(Ut).join("|")})\\b`,"g"),x=>s===void 0||o&&x==="USE_ENVMAP"&&(s&Ut[x])!==0?`((rtUniform.sceneFeatureFlags & ${Ut[x]}u) != 0u)`:(s&Ut[x])!==0?"true":"false"),B}var Nn=["NUM_MAPS","TLAS_STACK_SIZE","BLAS_STACK_SIZE","NUM_UNIFORM_LIGHTS"],Bm=[...Object.keys(Ut),"USE_BACKGROUND","USE_BACKGROUND_MAP","USE_GROUNDED_BACKGROUND",...Zs,"USE_ANISOTROPY_DIRECTIONS","USE_COAT_NORMAL_FRAMES","HAS_ALPHA_BLEND","HAS_ALPHA_MASK"];function zn(i){return Object.keys(i).sort().filter(e=>!Nn.includes(e)&&!Bm.includes(e))}function Em(i,e=!1){let t=Nn.map(r=>`const ${r} = ${i[r]};`).join(`
`),a=zn(i).map(r=>{let n=i[r];return`${e?"const":"override"} ${r} = ${typeof n=="boolean"?n?"true":"false":n.toString()};`}).join(`
`);return`
${t}
${a}
`}function Vf(i,e,t=!1,A="",a=!1,r){return Em(i,t)+Vo({...e,spectral:t?!!i.SPECTRAL:void 0,sceneCapabilities:t&&i.SCENE_CAPABILITIES!==void 0?Number(i.SCENE_CAPABILITIES):void 0,materialCapabilities:t&&i.MATERIAL_CAPABILITIES!==void 0?Number(i.MATERIAL_CAPABILITIES):void 0,lightCapabilities:t&&i.LIGHT_CAPABILITIES!==void 0?Number(i.LIGHT_CAPABILITIES):void 0},A,a,r)}function wm(i){return i.projection!=="perspective"?0:.5*i.sensorHeight*Math.max(i.zoom,Number.EPSILON)/Math.tan(i.fov*Math.PI/360)}function ea(i){if(!(i.fStop>0)||!(i.metersPerUnit>0))return 0;let e=wm(i)/(2*i.fStop)/1e3/i.metersPerUnit;return Number.isFinite(e)&&e>0?e:0}function qo(i,e,t,A){let a=new Float32Array(36);for(let r=0;r<16;r++)a[r]=i[r],a[16+r]=e[r];return a[32]=t,a[33]=A,a}var ta=new WeakMap,qf=1;function kn(i){return i?(ta.has(i)||ta.set(i,qf++),ta.has(i.image)||ta.set(i.image,qf++),[ta.get(i),ta.get(i.image),i.version,i.uvScale.join(","),i.uvOffset.join(","),i.uvChannel,i.flipY,i.wrapS,i.wrapT,i.colorSpace].join(":")):"-"}function Jo(i,e){return JSON.stringify(e.map(t=>i[t]))}function Jf(i){return{paramKey:Jo(i,Us),textureKey:Ba.map(e=>{let t=i[e];return typeof t=="number"?String(t):kn(t)}).join("|"),geometryKey:Jo(i,Rs)+"|"+kn(i.displacementMap),emissive:Jo(i,["emissionColor","emissionLuminance","coatWeight","coatColor","unlit","shadowCatcher"])+"|"+kn(i.coatWeightMap),emissiveMap:kn(i.emissiveMap)}}function pA(i){return!i.unlit&&!i.shadowCatcher&&ai(Si(i))>1e-8}var ia=class{_snapshots=new WeakMap;capture(e){for(let t of e)this._snapshots.set(t,Jf(t))}classify(e){let t="params",A=!1,a=!1,r={params:0,emission:1,textures:2,geometry:3};for(let n of e){let s=this._snapshots.get(n),o=Jf(n),l=!s||s.emissive!==o.emissive;A||=l,a||=!s||s.emissiveMap!==o.emissiveMap;let c=!s||o.geometryKey!==s.geometryKey?"geometry":o.textureKey!==s.textureKey?"textures":l?"emission":"params";r[c]>r[t]&&(t=c)}return{level:t,emission:A,emissiveMap:a}}};var _m=["position","normal","tangent","color","uv","uv1","indices","materialIndex"];function Kf(i){return[i.version,i.dynamic,ge(i),..._m.flatMap(e=>{let t=i[e];return[t?.array,t?.array.length,t?.itemSize]})]}var Aa=class{_states=new Map;capture(e){this._states.clear();for(let t of e.instanceBindings)t.mesh.geometry===t.geometry&&this._states.set(t.geometry,Kf(t.geometry))}update(e,t){let A=new Map(e.geometries.map((d,u)=>[d,u])),a=new Set;for(let d of t){let u=this._states.get(d.geometry);if(!u||d.materials.length!==1||d.geometry.materialIndex||d.materials[0].displacementMap)return;if(!a.has(d.geometry)){if(Kf(d.geometry).some((g,v)=>g!==u[v]))return;a.add(d.geometry)}}let r=[],n=new Map,s=new Map(e.instanceBindings.map(d=>[d.geometry,d])),o=t.filter(d=>d.geometry.position.array.length>0).map(d=>{let u=d.materials[0],p=n.get(u);p==null&&(p=r.length,r.push(u),n.set(u,p));let g=s.get(d.geometry);return{mesh:d,geometry:d.geometry,blasIndex:A.get(d.geometry),materialIndices:[p],displacementScale:0,bvhBounds:g?.bvhBounds??iA(d.geometry)}}),l=Yt(o);if(t.some(d=>d instanceof be))return{...e,materials:r,instances:l,instanceBindings:o,emissiveBindings:o.filter(d=>pA(r[d.materialIndices[0]]))};let c=l,f=c.map((d,u)=>d.bounds.min.every(Number.isFinite)&&d.bounds.max.every(Number.isFinite)&&d.transform.every(Number.isFinite)?u:-1).filter(d=>d>=0),m=f.map(d=>o[d]);return{...e,materials:r,instances:f.map(d=>c[d]),instanceBindings:m,emissiveBindings:m.filter(d=>pA(r[d.materialIndices[0]]))}}};var xm=["position","normal","uv","uv1","color","tangent","materialIndex"],$f=new WeakMap;function Ko(i){let e=$f.get(i);if(!e){e={source:new Map,prepared:new Map};for(let t of i.instanceBindings)for(let[A,a]of[[e.source,t.mesh.geometry],[e.prepared,t.geometry]]){let r=A.get(a);r||A.set(a,r=[]),r.push(t)}$f.set(i,e)}return e}function Gn(i,e){return e.every(t=>{let A=Ko(i).source.get(t)??[];return A.length>0&&A.every(a=>!a.mesh.materials.some(r=>r.displacementMap)&&a.geometry.position.array===t.position.array)})}function bm(i,e,t,A,a){let{vertexOffset:r,indexOffset:n,materialIndices:s}=t,o=i.vertexCount;for(let c of xm){if(c==="materialIndex"||a&&c!=="position"&&c!=="normal"&&c!=="tangent")continue;let f=e[c];if(!f)continue;let m=c==="uv1"?i.uv1??i.uv:i[c],d=r*f.itemSize;if(m&&m.itemSize!==f.itemSize)for(let u=0;u<o;u++)for(let p=0;p<f.itemSize;p++)f.array[d+u*f.itemSize+p]=p<m.itemSize?m.array[u*m.itemSize+p]:c==="tangent"&&!yr(i)?2:0;else m?f.array.set(m.array,d):f.array.fill(c==="color"?1:0,d,d+o*f.itemSize)}if(!A)return;tn(i,s,e.materialIndex.array,r);let l=i.indexArray;for(let c=0;c<l.length;c++)ym(e,n+c,l[c]+r)}function or(i,e){let t=i?.geometryStates.get(e);return!!t&&(t.topologyVersion!==e.topologyVersion||t.indices!==e.indices.array||t.indexCount!==e.indexArray.length)}function Hn(i,e,t={}){let A=[],a=[],r=new Set,n=!1,s=!1,o=0,l=new Map;i.geometries.forEach((c,f)=>{let m=Ko(i).prepared.get(c)?.[0].mesh.geometry??c,d=f<i.blases.length?i.blases[f].bvh:void 0;if(e.has(m)){let u=i.geometryRegions.get(c),p=or(i,m),g=!p&&Ys(m);if(t.softwareBvhs!==!1){let B=t.displacement?.get(c),E=B?c:m,x=l.get(E);if(!x){x=B?ge(c)??ge(m):ge(m);let y=B?{normal:m.normal.array,scale:B.scale,ranges:B.ranges}:void 0;(p||!x||m.dynamic&&x.builder!=="builtin"||!yA(x,m,y))&&(x=Qi(m,B?.scale,B?.ranges)),ct(m,x),l.set(E,x)}ct(c,x),i.blases[f].bvh=x,n||=d?.buffer.byteLength!==x.buffer.byteLength,s||=d?.buffer.byteLength!==x.buffer.byteLength||d?.layout!==x.layout,a.push({blas:x,offset:o})}c.version=m.version,bm(m,i.geometry,u,p,g);let v=m.vertexCount,h=A[A.length-1];h&&h.first+h.count===u.vertexOffset&&h.topologyChanged===p&&h.deformationOnly===g?h.count+=v:A.push({first:u.vertexOffset,count:v,topologyChanged:p,deformationOnly:g});for(let B of Ko(i).prepared.get(c)??[]){let E=t.softwareBvhs===!1?Eo(c):iA(c);uo(B.bvhBounds[0],Se(E[0])),uo(B.bvhBounds[1],Se(E[1])),r.add(B.mesh)}}f<i.blases.length&&(o+=i.blases[f].bvh.buffer.byteLength)});for(let c of e)i.geometryStates.set(c,{topologyVersion:c.topologyVersion,indices:c.indices.array,indexCount:c.indexArray.length});return{vertices:A,blases:a,meshes:r,resized:n,relocated:s}}function ym(i,e,t){let A=i.indexArray;A[e]=t}function mA(i,e,t,A,a,r,n=a){if(!i)return;let s=i.array,o=i.itemSize,l=n*t+A,c=a*o;if(o===1){for(let f=0;f<r;f++,l+=t,c+=o)e[l]=J(s,c);return}if(o===2){for(let f=0;f<r;f++,l+=t,c+=o)e[l]=J(s,c),e[l+1]=J(s,c+1);return}if(o===3){for(let f=0;f<r;f++,l+=t,c+=o)e[l]=J(s,c),e[l+1]=J(s,c+1),e[l+2]=J(s,c+2);return}if(o===4){for(let f=0;f<r;f++,l+=t,c+=o)e[l]=J(s,c),e[l+1]=J(s,c+1),e[l+2]=J(s,c+2),e[l+3]=J(s,c+3);return}for(let f=0;f<r;f++,l+=t,c+=o)for(let m=0;m<o;m++)e[l+m]=J(s,c+m)}function $o(i,e,t,A,a,r,n=!0,s=!1,o=a){mA(i.position,e,t,A[0],a,r,o),mA(i.normal,e,t,A[1],a,r,o),s||(mA(i.uv,e,t,A[2],a,r,o),mA(i.uv1,e,t,A[3],a,r,o),mA(i.color,e,t,A[4],a,r,o)),mA(i.tangent,e,t,A[5],a,r,o),n&&mA(i.materialIndex,e,t,A[6],a,r,o)}function tu(i){let e=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);if(i)for(let t=0;t<3;t++){let A=t*4,a=Math.hypot(i[A],i[A+1],i[A+2]);if(a>0)for(let r=0;r<3;r++)e[A+r]=i[A+r]/a}return e}function Wn(i){let e=i.find(t=>t.type==="EnvironmentLight");return tu(e?.type==="EnvironmentLight"?e.transform:void 0)}function Yn(i){return tu(i&&!Array.isArray(i)&&"type"in i&&i.type==="Equirect"?i.transform:void 0)}function lr(i){let e=i&&!Array.isArray(i)&&"type"in i?i:void 0,t=e?.type==="GroundedSkybox"?e.rotation??0:0;return new Float32Array([Math.cos(t),Math.sin(t),Math.max(0,e?.intensity??1),0])}var Xf=new WeakMap,Zf={width:8,height:4};function jn(i){let e;if(Array.isArray(i))e=Au(1,1,i);else{let t="map"in i?i.map:i,A=Xf.get(t);if(A?.image===t.image&&A.version===t.version)return A.result;if(mi(t.image))e=au(t.image,1);else if(pt(t.image))e={width:t.image.width,height:t.image.height,data:t.image.data};else return;Xf.set(t,{image:t.image,version:t.version,result:e})}return e}function iu(i,e){let t=Cm(e);if("sky"in t){for(let A of i)for(let a=0;a<3;a++)t.ambient[a]+=A.color[a]*A.intensity;return t}return i.length>0&&e.length>0&&(t={width:t.width,height:t.height,data:t.data.slice()}),i.forEach(A=>{Qm(A,t)}),t}var eu=new WeakMap;function Cm(i){let e;if(i.length>0){let t=i[0];if(mi(t.map.image)){let a=Number.isFinite(t.intensity)?Math.max(0,t.intensity):1;return au(t.map.image,a)}e={width:t.map.image.width,height:t.map.image.height,data:t.map.image.data,distributionCacheKey:t.map.source??t.map.image.data,distributionCacheVersion:t.map.version};let A=Number.isFinite(t.intensity)?Math.max(0,t.intensity):1;if(A!==1||!(e.data instanceof Float32Array)){let a=eu.get(t);if(a&&a.data===e.data&&a.width===e.width&&a.height===e.height&&a.version===t.map.version&&a.intensity===A)return a.image;let r=e.data instanceof Uint8Array||e.data instanceof Uint8ClampedArray?1/255:1,n=Float32Array.from(e.data,(o,l)=>o*r*(l%4===3?1:A)),s={width:e.width,height:e.height,data:n};eu.set(t,{data:e.data,width:e.width,height:e.height,version:t.map.version,intensity:A,image:s}),e=s}}else e=Au(Zf.width,Zf.height,[0,0,0,1]);return e}function Au(i,e,t,A){let a=i*e,r=new Float32Array(a*4);return t&&Array.isArray(t)&&Mm(r,t,A),{width:i,height:e,data:r}}function Mm(i,e,t=1){for(let A=0;A<i.length;)i[A++]=e[0]*t,i[A++]=e[1]*t,i[A++]=e[2]*t,i[A++]=e[3];return i}function Qm(i,e){let t=i.color,A=i.intensity,a=e.data;for(let r=0;r<a.length;)a[r++]+=t[0]*A,a[r++]+=t[1]*A,a[r++]+=t[2]*A,r++}function au(i,e){return{sky:i,width:i.width,height:i.height,intensity:e,ambient:[0,0,0]}}var aa=class{_snapshot=[];_image;update(e){let t=e.filter(r=>r.type==="AmbientLight"),A=e.filter(r=>r.type==="EnvironmentLight"),a=[...t.map(Zt),...A.map(r=>[r,r.map,r.map.image,r.map.version,r.map.source,r.intensity])];return(a.length!==this._snapshot.length||a.some((r,n)=>!mt(r,this._snapshot[n])))&&(this._image=a.length?iu(t,A):void 0,this._snapshot=a),this._image}},ra=class{_snapshot=[];_hadTexture=!1;update(e){let t=e.map(n=>n.type==="RectLight"?n.texture:void 0),A=t.flatMap(n=>n?[n,n.version,n.image,n.flipY,...n.uvScale,...n.uvOffset,n.uvChannel,n.wrapS,n.wrapT,n.colorSpace]:[void 0]),a=t.some(n=>!!n),r=(this._hadTexture||a)&&!mt(A,this._snapshot);return this._snapshot=A,this._hadTexture=a,r}};var Im=`
@group(0) @binding(0) var radiance: texture_2d<f32>;

@group(0) @binding(1) var<storage, read_write> pixels: array<vec2f>;
@group(0) @binding(2) var<storage, read_write> rows: array<vec2f>;
@group(0) @binding(3) var output: texture_storage_2d<rg32float, write>;
var<workgroup> scan: array<f32, 256>;
var<workgroup> tw: f32;

fn rl(pZ: u32) {
workgroupBarrier();
for (var offset = 1u; offset < 256u; offset *= 2u) {
var previous = 0.0;
if (pZ >= offset) { previous = scan[pZ - offset]; }
workgroupBarrier();
scan[pZ] += previous;
workgroupBarrier();
}
}

@compute @workgroup_size(256)
fn scanRows(@builtin(workgroup_id) group: vec3u, @builtin(local_invocation_index) pZ: u32) {
let size = textureDimensions(radiance);
let y = group.x;
if (pZ == 0u) { tw = 0.0; }
workgroupBarrier();
for (var start = 0u; start < size.x; start += 256u) {
let x = start + pZ;
var weight = 0.0;
if (x < size.x) {

var maximum = 0.0;
for (var dy = -1; dy <= 1; dy++) {
for (var dx = -1; dx <= 1; dx++) {
let p = clamp(vec2i(i32(x) + dx, i32(y) + dy), vec2i(0), vec2i(size) - 1);
maximum = max(maximum, dot(textureLoad(radiance, p, 0).rgb, vec3f(0.2126, 0.7152, 0.0722)));
}
}
weight = max(maximum, 1e-12) * sin(3.141592653589793 * (f32(y) + 0.5) / f32(size.y));
}
scan[pZ] = weight / f32(size.x);
rl(pZ);
if (x < size.x) { pixels[y * size.x + x] = vec2f(tw + scan[pZ], weight); }
workgroupBarrier();
if (pZ == 0u) { tw += scan[255]; }
workgroupBarrier();
}
if (pZ == 0u) { rows[y] = vec2f(0.0, tw); }
}

@compute @workgroup_size(256)
fn scanMarginal(@builtin(local_invocation_index) pZ: u32) {
let height = textureDimensions(radiance).y;
if (pZ == 0u) { tw = 0.0; }
workgroupBarrier();
for (var start = 0u; start < height; start += 256u) {
let y = start + pZ;
var integral = 0.0;
if (y < height) { integral = rows[y].y; }
scan[pZ] = integral / f32(height);
rl(pZ);
if (y < height) { rows[y].x = tw + scan[pZ]; }
workgroupBarrier();
if (pZ == 0u) { tw += scan[255]; }
workgroupBarrier();
}
}

@compute @workgroup_size(16, 16)
fn normalize(@builtin(global_invocation_id) id: vec3u) {
let size = textureDimensions(radiance);
let x = id.x;
let y = id.y;
if (x >= size.x + 2u || y >= size.y + 1u) { return; }
var value = vec2f(0.0);
if (x == 0u) {
let total = rows[size.y - 1u].x;
if (y > 0u) { value.x = rows[y - 1u].x / total; }
if (y < size.y) { value.y = rows[y].y / total; }
} else if (y < size.y) {
let integral = rows[y].y;
if (x > 1u) { value.x = pixels[y * size.x + x - 2u].x / integral; }
if (x <= size.x) { value.y = pixels[y * size.x + x - 1u].y / integral; }
}
textureStore(output, vec2i(id.xy), vec4f(value, 0.0, 0.0));
}
`,cr=class{device;layout;pipelines;pixels;rows;static supported(e,t,A){return t*A*8<=Math.min(e.limits.maxStorageBufferBindingSize,e.limits.maxBufferSize)}constructor(e){this.device=e,this.layout=e.createBindGroupLayout({label:"Environment distribution",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"unfilterable-float"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rg32float"}}]});let t=e.createShaderModule({label:"Environment distribution",code:Im}),A=e.createPipelineLayout({bindGroupLayouts:[this.layout]});this.pipelines=["scanRows","scanMarginal","normalize"].map(a=>e.createComputePipeline({label:`Environment distribution ${a}`,layout:A,compute:{module:t,entryPoint:a}}))}build(e,t){let{width:A,height:a}=e;(this.pixels?.size!==A*a*8||this.rows?.size!==a*8)&&(this.dispose(),this.pixels=this.device.createBuffer({label:"Environment row scans",size:A*a*8,usage:GPUBufferUsage.STORAGE}),this.rows=this.device.createBuffer({label:"Environment marginal scan",size:a*8,usage:GPUBufferUsage.STORAGE}));let r=this.device.createBindGroup({layout:this.layout,entries:[{binding:0,resource:e.createView()},{binding:1,resource:{buffer:this.pixels}},{binding:2,resource:{buffer:this.rows}},{binding:3,resource:t.createView()}]}),n=this.device.createCommandEncoder({label:"Environment distribution"}),s=[[a,1],[1,1],[Math.ceil((A+2)/16),Math.ceil((a+1)/16)]];this.pipelines.forEach((o,l)=>{let c=n.beginComputePass();c.setPipeline(o),c.setBindGroup(0,r),c.dispatchWorkgroups(...s[l]),c.end()}),this.device.queue.submit([n.finish()])}dispose(){this.pixels?.destroy(),this.rows?.destroy(),this.pixels=void 0,this.rows=void 0}};function ru(i){return`${i.SCENE_CAPABILITIES},${i.MATERIAL_CAPABILITIES},${i.LIGHT_CAPABILITIES}`}function Sm(i){let e=0;for(let t of[i.SCENE_CAPABILITIES,i.MATERIAL_CAPABILITIES,i.LIGHT_CAPABILITIES])for(;t;)t&=t-1,e++;return e}var Vn=class{capacity;variants=new Map;constructor(e=128){this.capacity=e}find(e,t){let a=e+":"+ru(t),r=this.variants.get(a);if(!r){let n=1/0;for(let[s,o]of this.variants){if(o.structure!==e||!Pf(o.capabilities,t))continue;let l=Sm(o.capabilities);l<=n&&(a=s,r=o,n=l)}}if(r)return this.variants.delete(a),this.variants.set(a,r),r.capabilities}remember(e,t){let A=e+":"+ru(t);this.variants.delete(A),this.variants.set(A,{structure:e,capabilities:t}),this.variants.size>this.capacity&&this.variants.delete(this.variants.keys().next().value)}clear(){this.variants.clear()}};function Xo(i,e,t){return Math.min(Math.max(i,e),t)}function qn(i,e,t=1e-4){for(let A=0;A<i.length;A++)if(Math.abs(i[A]-e[A])>t)return!1;return!0}var Pm=typeof navigator<"u"&&navigator.userAgent.match("Macintosh"),fr;function Jn(){if(fr!==void 0)return fr;if(fr=!1,Pm)try{let i=ht().getContext("webgl"),e=i&&i.getExtension("WEBGL_debug_renderer_info"),t=e&&i.getParameter(e.UNMASKED_RENDERER_WEBGL)||"";t.match(/Apple M/)||t.match(/Apple GPU/)||(fr=!0)}catch{}return fr}var Dm=.125;function nu(i,e,t,A,a=i,r=Dm){let n=i*Math.sqrt(t/Math.max(e,.1)),s=n<.25?128:16,o=Xo(Math.round(n*s)/s,r,Math.max(r,A));return Math.abs(Math.log(o/a))>=Math.log(1.15)?o:a}var su=new WeakMap;function Zo(i){return"sky"in i?i:i.distributionCacheKey??i.data}function $n(i,e){return i===e?!0:!i||!e?!1:Zo(i)===Zo(e)&&i.width===e.width&&i.height===e.height&&("sky"in i?0:i.distributionCacheVersion??0)===("sky"in e?0:e.distributionCacheVersion??0)}function Xn(i){let e=Zo(i),t=i.distributionCacheVersion??0,A=su.get(e);if(A&&A.width===i.width&&A.height===i.height&&A.version===t)return A.distribution;let a=i.data,r=i.width+2,n=i.height+1,s=Tm(r,n,2),o={width:r,height:n,data:s.array},l=Rm(a,i.width,i.height),c=new Float32Array(i.width*i.height);for(let m=0;m<i.height;m++){let d=m*i.width;for(let u=0;u<i.width;u++)c[d+u]=Math.max(0,l[d+Math.max(0,u-1)],l[d+u],l[d+Math.min(i.width-1,u+1)])}for(let m=0;m<i.height;m++){let d=Math.sin(Math.PI*(m+.5)/i.height),u=Math.max(0,m-1)*i.width,p=m*i.width,g=Math.min(i.height-1,m+1)*i.width;for(let h=0;h<i.width;h++){let B=Math.max(c[u+h],c[p+h],c[g+h],1e-12)*d;s.set(h+2,m,0,s.get(h+1,m,0)+B/i.width),s.set(h+1,m,1,B)}let v=s.get(o.width-1,m,0);for(let h=1;h<s.width;h++)s.set(h,m,0,s.get(h,m,0)/v),s.set(h,m,1,s.get(h,m,1)/v);s.set(0,m+1,0,s.get(0,m,0)+v/i.height),s.set(0,m,1,v)}let f=s.get(0,s.height-1,0);for(let m=0;m<s.height;m++)s.set(0,m,0,s.get(0,m,0)/f),s.set(0,m,1,s.get(0,m,1)/f);return o.data=s.array,su.set(e,{width:i.width,height:i.height,version:t,distribution:o}),o}function Tm(i,e,t){let A=new Float32Array(t*i*e);return{set(a,r,n,s){A[t*(r*i+a)+n]=s},get(a,r,n){return A[t*(r*i+a)+n]},width:i,height:e,channels:t,array:A}}function Rm(i,e,t){return i instanceof Uint8Array||i instanceof Uint8ClampedArray?Kn(i,e,t,1/255):(i instanceof Float32Array,Kn(i,e,t,1))}function Kn(i,e,t,A){let a=Math.max(Math.floor(Zi(i)/(e*t)),1),r=new Float32Array(e*t);for(let n=0;n<t;n++)for(let s=0;s<e;s++){let o=a*(n*e+s);r[n*e+s]=A*(.2126*ti(i,o)+.7152*ti(i,o+Math.min(1,a-1))+.0722*ti(i,o+Math.min(2,a-1)))}return r}var lu=`
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
fn main(@builtin(global_invocation_id) vQ: vec3u) {
let tile = vQ.x;
let tileCount = params.columns * params.rows;
if (tile >= tileCount) {
return;
}

let tileX = tile % params.columns;
let tileY = tile / params.columns;
let vY = tileX * params.tileSize;
let vZ = tileY * params.tileSize;
let ye = min(vY + params.tileSize, params.width);
let yf = min(vZ + params.tileSize, params.height);
var nW = 0.0;
var jB = 0.0;
var count = 0u;

for (var y = vZ; y < yf; y++) {
for (var x = vY; x < ye; x++) {
let pixel = y * params.width + x;
let offset = pixel * 4u;
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
let va = pilotMoments[offset] / samples;
let qg = max(va - mean * mean, 0.0);
var variance = qg;
if (samples > 1.0) {
variance = qg * samples / (samples - 1.0);
}
nW += mean;
jB = max(jB, variance);
count += 1u;
}
}

let mean = nW / f32(max(count, 1u));
var pT = 0.0;
if (params.hasPrevious != 0u) {
pT = previousVariance[tile];
}
let tu = max(jB, pT);
let uD = params.absoluteError + params.relativeError * abs(mean);
let required = ceil(
params.confidence * params.confidence * tu /
max(uD * uD, 1e-16)
);
let targetSamples = u32(min(
f32(params.maxSamples),
max(f32(params.minSamples), required)
));

tileMeans[tile] = mean;


tileVariances[tile] = jB;
tileTargets[tile] = targetSamples;

for (var y = vZ; y < yf; y++) {
for (var x = vY; x < ye; x++) {
textureStore(
targetTexture,
vec2i(i32(x), i32(y)),
vec4f(f32(targetSamples), 0.0, 0.0, 0.0)
);
}
}
}
`;function el(i,e){return Number.isFinite(i)?Math.max(1,Math.round(i)):e}function Um(i,e,t,A,a,r){return!!i&&i.width===e&&i.height===t&&i.tileSize===A&&i.columns===a&&i.rows===r&&i.variance.length===a*r}function cu(i,e,t){let A=el(i.maxSamples,1),a=Math.min(A,el(i.minSamples,Math.min(A,16))),r=el(i.tileSize,16),n=Math.ceil(e/r),s=Math.ceil(t/r);return{maxSamples:A,minSamples:a,tileSize:r,columns:n,rows:s,absoluteError:Math.max(i.absoluteError??.002,1e-8),relativeError:Math.max(i.relativeError??.03,0),confidence:Math.max(i.confidence??1.96,.01),previous:Um(i.previous,e,t,r,n,s)?i.previous:void 0}}var tl=Float32Array,Zn=64,Om=6;function ts(i){if(i instanceof Error)return i.message;if(typeof i=="string")return i;if(i&&typeof i=="object"&&"message"in i){let e=i.message;if(typeof e=="string"&&e.length>0)return e}return String(i)}function fu(...i){return[...new Set(i.filter(e=>e!=null).map(ts).filter(Boolean))].join(`
`)}function oi(){return typeof performance>"u"?Date.now():performance.now()}function Fm(i){let e=1;for(let t=i.indexOf(`
`);t>=0;t=i.indexOf(`
`,t+1))e++;return e}function Nm(i){let e=2166136261;for(let t=0;t<i.length;t++)e=Math.imul(e^i.charCodeAt(t),16777619);return(e>>>0).toString(16).padStart(8,"0")}function zm(...i){return i.some(e=>/(?:compute )?library failed creation/i.test(ts(e)))}function km(i,e,t,A=[]){return yf(i,e,t,a=>A[a])}var il=class{_textureSelection;_aovPrimitiveCache=new XA;_device;_rayTracePipeline;_targetAspect=1;_width=0;_height=0;_meshes=[];_sceneEnvironment=new aa;_rectLightTextures=new ra;_analyticLights=[];_iesProfileTexelOffsets=new Int32Array(0);_materialChanges=new ia;_pendingMaterialUpdate;_materialData;_bindless;_retiredBindless=new Set;_disposed=!1;_maxTextureArrayBytes=Dt;_pendingGeometryUpdates=new Set;_needsUpdateMeshData=!0;_needsUpdateMeshMembership=!1;_needsRefitTLAS=!1;_preparedMeshData;_membershipCache=new Aa;_pendingMembershipData;_residentPreparedMeshData;_tlas;_meshSnapshot=[];_snapshotByMesh=new WeakMap;_residentSnapshotByMesh=new WeakMap;_dirtyTransformMeshes=new Set;_dirtyColorMeshes=new Set;_geometriesNeedRefit=new Set;_needsUpdateAnalyticLightsBuffer=!0;_activeTarget={};_targetOutputs=new Map;releaseTarget(e){let t=this._targetOutputs.get(e);if(t){this._targetOutputs.delete(e);for(let A of t.buffers)A.destroy();this._activeTarget===e&&(this._rayTraceBindGroups=void 0,this._needsUpdateBindGroups=!0)}}getTargetMemoryBytes(e){return this._targetOutputs.get(e)?.buffers.reduce((t,A)=>t+A.size,0)??0}useTarget(e){this._activeTarget=e;let t=this._targetOutputs.get(e);[this._outColorBuffer,this._outNormalBuffer,this._outAlbedoBuffer,this._outShadowCatcherBuffer]=t?.buffers??[],t?.bindGroup&&t.pipeline===this._rayTracePipeline&&this._rayTraceBindGroups?this._rayTraceBindGroups[this._bindless?2:3]=t.bindGroup:this._needsUpdateBindGroups=!0}_outColorBuffer;_outNormalBuffer;_outAlbedoBuffer;_outShadowCatcherBuffer;_uniforms;_rtUniform=mf();_mapInfoUniform;_attributeData;_attributeStride=0;_attributeOffsets=[];_attrBuffers;_materialsBuffer;_lightSamplingTexture;_lightSamplingTextureSize=[0,0];_lightDomainDiagnostics={environment:{count:0,weight:0,pmf:0},infinite:{count:0,weight:0,pmf:0},localAndEmissive:{count:0,weight:0,pmf:0}};_openPbrEnergyLut;_bvhBuffer;_instancesBuffer;_emissiveCache=new Va;_lightChoices=new yi;_shadowCatcherLightChoices=new yi;_lightSamplingData;_lightSamplingScratch;_lightSamplingTriangleCount=-1;_emissiveTriangles=[];_analyticLightSelectionPmfs=[];_needsUpdateLightSamplingData=!0;_adaptiveSamplingTexture;_adaptiveSamplingTextureSize=[1,1];_offlineAdaptivePipeline;_offlineAdaptiveHistory;_mapsSampler;_maps;_envImageSource;_envTex;_envDistributionTex;_envDistribution;_skyBaker;_backgroundImageSource;_backgroundTex;_rayTracePipelineLayout;_rayTraceBindGroups;_blasLayoutMask=1;_compiledBlasLayoutMask=0;_compiledAnisotropyDirections=!1;_compiledCoatNormals=!1;_compiledHasAlpha=!0;_compiledSceneHasAlpha=!0;_alphaBlendStrategy="stochastic";_constants=gf();_retainedShaderCapabilities;_retainedShaderStructure;_shaderCapabilities=new Vn;_prevPipelineConstants={};_prevDefinesCode="";_prevPipelineInputs;_hasTransmission=!1;_hasShadowCatcher=!1;_hasDisplacement=!1;_bounces=-1;_bevelSamples=8;_directLightCandidates=4;_clamping;_transmissiveAlphaMin=1;_viewProjInv=oe.create();_cameraWorld=oe.create();_apertureRadius=0;_focusDistance=10;_needsUpdateBindGroups=!0;_computeShaderModule;_aovPipelines=new WeakMap;_depthCompute;_depthTracePipeline;_depthPipeline;_shaderCache;_debugBVHBuffer;_isCompilingShader=!1;_shaderCompilationDiagnostics;_pipelineError;_bakePipelineConstants=!0;_failedPipelineSignature;constructor(e,t={requested:"atlas"}){this._textureSelection=t,this._device=e,this._shaderCache=new tr(e),t.support&&(this._bindless=new Ln(e)),this._uniforms={cameraUniform:this._uniformBuffer(144),rtUniform:this._uniformBuffer(this._rtUniform.buffer.byteLength),analyticLights:this._uniformBuffer(Zn*Om*4*4)},this._mapInfoUniform=this._uniformBuffer(16),this._openPbrEnergyLut=e.createTexture({format:"r32float",label:"OpenPBR opaque dielectric energy compensation",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST,size:{width:32,height:2177}}),e.queue.writeTexture({texture:this._openPbrEnergyLut},Fn(),{bytesPerRow:32*Float32Array.BYTES_PER_ELEMENT},{width:32,height:2177}),this._mapsSampler=e.createSampler({minFilter:"linear",magFilter:"linear",addressModeU:"clamp-to-edge",addressModeV:"clamp-to-edge"}),this._setBackgroundMap(void 0),this._adaptiveSamplingTexture=e.createTexture({format:"r32float",label:"Adaptive sample targets placeholder",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.STORAGE_BINDING,size:[1,1]}),e.queue.writeTexture({texture:this._adaptiveSamplingTexture},new Float32Array([Number.MAX_SAFE_INTEGER]),{bytesPerRow:4},[1,1])}getOutputBuffer(){return{color:this._outColorBuffer,normal:this._outNormalBuffer,albedo:this._outAlbedoBuffer,shadowCatcher:this._outShadowCatcherBuffer}}_ensureAdaptiveSamplingTexture(e,t){this._adaptiveSamplingTextureSize[0]===e&&this._adaptiveSamplingTextureSize[1]===t||(this._adaptiveSamplingTexture.destroy(),this._adaptiveSamplingTexture=this._device.createTexture({format:"r32float",label:"Adaptive sample targets",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.STORAGE_BINDING,size:[e,t]}),this._adaptiveSamplingTextureSize=[e,t],this._needsUpdateBindGroups=!0)}async prepareOfflineAdaptiveSampling(e){let t=this._width,A=this._height;if(!t||!A||!this._outColorBuffer||!this._outNormalBuffer)return;let a=cu(e,t,A),{maxSamples:r,minSamples:n,tileSize:s,columns:o,rows:l,absoluteError:c,relativeError:f,confidence:m,previous:d}=a,u=o*l,p=u*Float32Array.BYTES_PER_ELEMENT,g=this._offlineAdaptiveHistory,v=!1,h;d&&g?.history===d?h=g.varianceBuffer:(h=this._device.createBuffer({label:d?"Offline previous tile variance upload":"Offline empty tile variance",size:d?p:Float32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),this._device.queue.writeBuffer(h,0,d?.variance??new Float32Array(1)),v=!0);let B=this._device.createBuffer({label:"Offline adaptive sampling parameters",size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),E=new ArrayBuffer(48);new Uint32Array(E,0,8).set([t,A,s,o,l,r,n,d?1:0]),new Float32Array(E,32,4).set([c,f,m,0]),this._device.queue.writeBuffer(B,0,E);let x=this._device.createBuffer({label:"Offline tile mean luminance",size:p,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),y=this._device.createBuffer({label:"Offline current tile variance",size:p,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),M=this._device.createBuffer({label:"Offline tile sample targets",size:p,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),b=this._device.createBuffer({label:"Offline compact tile history readback",size:p*3,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});this._ensureAdaptiveSamplingTexture(t,A),this._offlineAdaptivePipeline??=await this._device.createComputePipelineAsync({label:"Offline adaptive sampling planner",layout:"auto",compute:{module:this._device.createShaderModule({label:"Offline adaptive sampling planner",code:lu}),entryPoint:"main"}});let T=this._device.createBindGroup({label:"Offline adaptive sampling planner",layout:this._offlineAdaptivePipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:B}},{binding:1,resource:{buffer:this._outColorBuffer}},{binding:2,resource:{buffer:this._outNormalBuffer}},{binding:3,resource:{buffer:h}},{binding:4,resource:{buffer:x}},{binding:5,resource:{buffer:y}},{binding:6,resource:{buffer:M}},{binding:7,resource:this._adaptiveSamplingTexture.createView()}]}),O=this._device.createCommandEncoder({label:"Offline adaptive sampling planner"}),R=O.beginComputePass({label:"Offline adaptive sampling planner"});R.setPipeline(this._offlineAdaptivePipeline),R.setBindGroup(0,T),R.dispatchWorkgroups(Math.ceil(u/64)),R.end(),O.copyBufferToBuffer(x,0,b,0,p),O.copyBufferToBuffer(y,0,b,p,p),O.copyBufferToBuffer(M,0,b,p*2,p),this._device.queue.submit([O.finish()]);let D=!1;try{await b.mapAsync(GPUMapMode.READ);let L=b.getMappedRange(),se=new Float32Array(L,0,u).slice(),q=new Float32Array(L,p,u).slice(),re=new Uint32Array(L,p*2,u).slice(),w={width:t,height:A,tileSize:s,columns:o,rows:l,meanLuminance:se,variance:q,sampleTargets:re},N=n,H=0;for(let ee=0;ee<u;ee++){let te=re[ee];N=Math.max(N,te);let Y=ee%o,ne=Math.floor(ee/o),Le=Math.min(s,t-Y*s),fe=Math.min(s,A-ne*s);H+=te*Le*fe}return this._offlineAdaptiveHistory={history:w,varianceBuffer:y},this._rtUniform.views.adaptiveSampling[0]=1,D=!0,g?.varianceBuffer!==y&&g?.varianceBuffer.destroy(),{maximumTarget:N,averageTarget:H/(t*A),history:w}}finally{b.mapState==="mapped"&&b.unmap(),b.destroy(),x.destroy(),M.destroy(),B.destroy(),v&&h.destroy(),D||y.destroy()}}_createPipelineLayout(){let e={label:"Ray Trace Pipeline Layout",bindGroupLayouts:(this._bindless?Mf():Un()).map(t=>this._shaderCache.createBindGroupLayout(t))};this._rayTracePipelineLayout=this._shaderCache.createPipelineLayout(this._bindless?Vr(e):e)}_updateGPUBuffer(e,t,A,a=pf){let r=this._device,n=Math.max(A.byteLength,a);return(t==null||t.size<n)&&(this._needsUpdateBindGroups=!0,t&&t.destroy(),t=r.createBuffer({label:e,size:n,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC})),this._device.queue.writeBuffer(t,0,A.buffer),t}_uniformBuffer(e){return this._needsUpdateBindGroups=!0,this._device.createBuffer({size:e,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})}async updatePipeline(){if(this._isCompilingShader)return;this._isCompilingShader=!0;let e,t,A;try{if(this._bindless?.retirement&&await this._bindless.retirement,this._disposed)return;this._needsUpdateMeshData?this._updateMeshData():this._needsUpdateMeshMembership&&this._updateMeshMembership(),this._pendingGeometryUpdates.size&&this._updateGeometryData(),this._needsRefitTLAS&&this._refitMeshInstances(),this._dirtyColorMeshes.size&&this._updateMeshColors(),this._pendingMaterialUpdate&&this._updateMaterialData(),this._needsUpdateLightSamplingData&&this._updateLightSamplingData();let a=this._device,r=JSON.stringify([this._constants,this._hasDisplacement,this._alphaBlendStrategy,this._blasLayoutMask,this._bakePipelineConstants]);if(r===this._prevPipelineInputs&&this._rayTracePipeline&&this._rayTraceBindGroups&&!this._needsUpdateBindGroups)return;this._rtUniform.views.sceneFeatureFlags[0]=On(this._constants);let n=Lo(this._constants),s={...this._constants,...n},o=!!s.HAS_ALPHA_BLEND&&this._alphaBlendStrategy==="deterministic-source-over",l=!!s.HAS_ALPHA,c=zn(s),f=Nn.map(b=>`const ${b} = ${s[b]};`).join(`
`),m={hasDisplacement:this._hasDisplacement,hasAlpha:o,hasSceneAlpha:l,hasAnisotropyDirections:!!s.USE_ANISOTROPY_DIRECTIONS,hasCoatNormals:!!s.USE_COAT_NORMAL_FRAMES,blasLayoutMask:this._blasLayoutMask,bakePipelineConstants:this._bakePipelineConstants},d=JSON.stringify({...m,defineCode:f,constants:c.filter(b=>!(b in n)).map(b=>[b,s[b]])}),u=this._shaderCapabilities.find(d,n)??Lo(this._constants,d===this._retainedShaderStructure?this._retainedShaderCapabilities:void 0);Object.assign(s,u);let p=JSON.stringify({...m,constants:Object.keys(s).sort().map(b=>[b,s[b]])});if(e=p,p===this._failedPipelineSignature)return;this._pipelineError=void 0;let g=zn(this._prevPipelineConstants),v=!this._rayTracePipelineLayout||!this._computeShaderModule||c.join(",")!==g.join(",")||f!==this._prevDefinesCode||o!==this._compiledHasAlpha||l!==this._compiledSceneHasAlpha||!!s.USE_ANISOTROPY_DIRECTIONS!==this._compiledAnisotropyDirections||!!s.USE_COAT_NORMAL_FRAMES!==this._compiledCoatNormals||this._blasLayoutMask!==this._compiledBlasLayoutMask||this._bakePipelineConstants&&c.some(b=>s[b]!==this._prevPipelineConstants[b]),h=v||c.some(b=>s[b]!==this._prevPipelineConstants[b]);t=h?oi():void 0;let B=0,E=0,x=this._shaderCompilationDiagnostics?.sourceBytes??0,y=this._shaderCompilationDiagnostics?.sourceLines??0,M=this._shaderCompilationDiagnostics?.modules[0]?.sourceFingerprint??"";if(v){let b=oi(),T=Vf(s,{hasDisplacement:this._hasDisplacement,hasAlpha:o,hasSceneAlpha:l,hasAnisotropyDirections:!!s.USE_ANISOTROPY_DIRECTIONS,hasCoatNormals:!!s.USE_COAT_NORMAL_FRAMES,blasLayoutMask:this._blasLayoutMask,dynamicEnvironment:!0},this._bakePipelineConstants);this._bindless&&(T=Cf(T,this._textureSelection.support.enable)),x=T.length,y=Fm(T),M=Nm(T),B=oi()-b;let O=oi();this._computeShaderModule=this._shaderCache.createShaderModule({label:"Ray Trace",code:T}),E=oi()-O,this._compiledHasAlpha=o,this._compiledSceneHasAlpha=l,this._compiledAnisotropyDirections=!!s.USE_ANISOTROPY_DIRECTIONS,this._compiledCoatNormals=!!s.USE_COAT_NORMAL_FRAMES,this._compiledBlasLayoutMask=this._blasLayoutMask}if(h){if(!this._rayTracePipelineLayout){a.pushErrorScope("validation");let T=!0;try{this._createPipelineLayout();let O=await a.popErrorScope();if(T=!1,O)throw O}catch(O){let R=T?await a.popErrorScope().catch(()=>null):null;this._rayTracePipelineLayout=void 0;let D=fu(O,R);throw new Error(`Unable to create the ray tracing pipeline layout: ${D}`)}}this._prevPipelineConstants={...s},this._prevDefinesCode=f,this._needsUpdateBindGroups=!0,a.pushErrorScope("validation");let b=!0;try{let T=this._bakePipelineConstants?void 0:c.reduce((se,q)=>(se[q]=+s[q],se),{}),O={label:"Ray Trace",entryPoint:"main",firstFrameRequired:!0,status:"compiling"};A=oi(),O.startedAtMs=0,O.concurrentCompilationCount=1,this._shaderCompilationDiagnostics={status:"compiling",sourceBytes:x,sourceLines:y,pipelineCount:1,completedPipelineCount:0,sourceGenerationTimeMs:B,moduleCreationTimeMs:E,modules:[{label:"Ray Trace",sourceBytes:x,sourceLines:y,sourceFingerprint:M}],pipelines:[{...O}],maximumConcurrentPipelineCount:1,peakConcurrentPipelineCount:1};let R;try{R=await this._shaderCache.createComputePipelineAsync({label:"Ray Trace",layout:this._rayTracePipelineLayout,compute:{module:this._computeShaderModule,entryPoint:"main",constants:T}}),O.status="ready"}catch(se){O.status="failed",O.error=ts(se);let re=((await this._computeShaderModule.getCompilationInfo().catch(()=>{}))?.messages??[]).filter(w=>w.type==="error");throw re.length?new Error(re.map(w=>`Ray Trace WGSL ${w.lineNum}:${w.linePos} ${w.message}`).join(`
`)):se}finally{O.endedAtMs=oi()-A,O.durationMs=O.endedAtMs}this._rayTracePipeline=R,this._depthCompute={module:this._computeShaderModule,constants:T};let D=await a.popErrorScope();if(b=!1,D)throw D;let L=oi();this._shaderCompilationDiagnostics={...this._shaderCompilationDiagnostics,status:"ready",completedPipelineCount:1,pipelines:[{...O}],pipelineCompilationTimeMs:L-A,totalTimeMs:L-t}}catch(T){let O=b?await a.popErrorScope().catch(()=>null):null,R=fu(T,O);if(!this._bakePipelineConstants&&zm(T,O)){let D=oi();this._shaderCompilationDiagnostics?.status==="compiling"&&(this._shaderCompilationDiagnostics={...this._shaderCompilationDiagnostics,status:"failed",pipelineCompilationTimeMs:A==null?void 0:D-A,totalTimeMs:t==null?void 0:D-t,error:R}),this._bakePipelineConstants=!0,this._rayTracePipeline=void 0,this._rayTraceBindGroups=void 0,this._computeShaderModule=void 0,this._prevPipelineConstants={},console.warn("WebGPU pipeline specialization failed; retrying with constants baked into WGSL.");return}throw new Error(R)}}if(this._disposed)return;this._needsUpdateBindGroups&&(this._needsUpdateBindGroups=!1,this._updateBindGroups()),this._retainedShaderCapabilities=u,this._retainedShaderStructure=d,this._shaderCapabilities.remember(d,u),this._prevPipelineInputs=r,this._failedPipelineSignature=void 0}catch(a){if(this._disposed)return;this._pipelineError=a;let r=oi();this._shaderCompilationDiagnostics?.status==="compiling"&&(this._shaderCompilationDiagnostics={...this._shaderCompilationDiagnostics,status:"failed",pipelineCompilationTimeMs:A==null?void 0:r-A,totalTimeMs:t==null?void 0:r-t,error:ts(a)}),this._failedPipelineSignature=e,this._rayTracePipeline=void 0,this._rayTraceBindGroups=void 0,this._prevPipelineConstants={},this._needsUpdateBindGroups=!0,console.error("Failed to update WebGPU ray tracing pipeline.",a)}finally{this._isCompilingShader=!1}}_prepareAovPipelines(e){let t=this._rayTracePipeline;if(!t||!this._depthCompute)return;let A=(je(e)&24)!==0,a=this._aovPipelines.get(t);a||(a=new Map,this._aovPipelines.set(t,a));let r=a.get(A);if(!r){r={},a.set(A,r);let n=r,s=this._bindless,o=s?2:3,l=this._device.createBindGroupLayout({entries:[{binding:5,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:6,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:7,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:8,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:9,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}}]}),c={bindGroupLayouts:Array.from({length:o},(d,u)=>t.getBindGroupLayout(u)).concat(l)},f=this._device.createPipelineLayout(s?Vr(c):c),m={...this._depthCompute,constants:{...this._depthCompute.constants,DEPTH_QUERY_MODE:1,AOV_REFLECTANCE:A?1:0}};Promise.all([this._shaderCache.createComputePipelineAsync({label:"AOV accumulation",layout:f,compute:{...m,entryPoint:"aovTrace"}}),this._shaderCache.createComputePipelineAsync({label:"AOV center",layout:f,compute:{...m,entryPoint:"aovTraceCenter"}})]).then(([d,u])=>{n.accumulation=d,n.center=u},d=>{n.error=d})}if(r.error)throw r.error;return r}prepareAovs(e){let t=this._prepareAovPipelines(e);return!!t?.accumulation&&!!t.center}renderAovs(e,t,A,a,r){let n=this._rayTraceBindGroups;if(!n||!this._tlas||!this._preparedMeshData||!r.length)return!1;let s=this._prepareAovPipelines(r);if(!s?.accumulation||!s.center)return!1;e.resize(this._width,this._height);let o=this._bindless,l=o?2:3,c=Math.min(A,a);if(e.centerReady&&e.samples>=c)return!0;if(!e.frame){let d=this._aovPrimitiveCache.get(this._preparedMeshData,this._tlas),u=Cn(this._preparedMeshData,this._tlas,t,this._width,this._height,e.history,d,!1);e.frame=u.frame,e.setScene(u.words,d)}this._device.queue.writeBuffer(this._uniforms.rtUniform,0,this._rtUniform.buffer),this._device.queue.writeBuffer(this._uniforms.cameraUniform,0,qo(this._viewProjInv,this._cameraWorld,this._apertureRadius,this._focusDistance));let f=this._device,m=(d,u)=>{let p=f.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM,mappedAtCreation:!0});new Uint32Array(p.getMappedRange()).set([e.width,e.height,u,je(r)]),p.unmap();let g=f.createBindGroup({layout:d.getBindGroupLayout(l),entries:[{binding:5,resource:{buffer:e.accumulation}},{binding:6,resource:{buffer:e.center}},{binding:7,resource:{buffer:e.scene}},{binding:8,resource:{buffer:p}},{binding:9,resource:{buffer:e.previousCenter}}]}),v=f.createCommandEncoder({label:"AOV"}),h=v.beginComputePass();o?.table&&Ra(h,o.table),h.setPipeline(d);for(let B=0;B<l;B++)h.setBindGroup(B,n[B]);h.setBindGroup(l,g),h.dispatchWorkgroups(Math.ceil(e.width/8),Math.ceil(e.height/8)),h.end(),f.queue.submit([v.finish()]),p.destroy()};for(e.centerReady||(m(s.center,0),e.centerReady=!0,e.history.accept(e.frame)),(je(r)&31)===0&&(e.samples=c);e.samples<c;)m(s.accumulation,e.samples),e.samples++;return!0}async readDepthSamples(e,t){let A=this._rayTracePipeline,a=this._rayTraceBindGroups,r=this._bindless,n=r?.revision;if(!A||!a||!this._depthCompute||this._isCompilingShader)return;let s=qA(e,t??this._width/this._height);if(this._depthTracePipeline!==A||!this._depthPipeline){let u=this._shaderCache.createBindGroupLayout({label:"Depth query output",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}]}),p={label:"Depth query layout",bindGroupLayouts:(r?[0,1]:[0,1,2]).map(v=>A.getBindGroupLayout(v)).concat(u)},g=this._shaderCache.createPipelineLayout(r?Vr(p):p);this._depthTracePipeline=A,this._depthPipeline=this._shaderCache.createComputePipelineAsync({label:"Depth query",layout:g,compute:{...this._depthCompute,entryPoint:"depthQuery",constants:{...this._depthCompute.constants,DEPTH_QUERY_MODE:1}}})}let o=await this._depthPipeline;if(A!==this._rayTracePipeline||a!==this._rayTraceBindGroups||r!==this._bindless||n!==r?.revision)return;let l=this._device,c=784,f=l.createBuffer({label:"Depth samples",size:c,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),m=l.createBuffer({label:"Depth readback",size:c,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),d=l.createBuffer({label:"Depth area",size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});try{l.queue.writeBuffer(d,0,s);let u=l.createBindGroup({layout:o.getBindGroupLayout(r?2:3),entries:[{binding:0,resource:{buffer:f}},{binding:4,resource:{buffer:d}}]}),p=l.createCommandEncoder({label:"Depth query"}),g=p.beginComputePass();r?.table&&Ra(g,r.table),g.setPipeline(o);for(let v=0;v<(r?2:3);v++)g.setBindGroup(v,a[v]);return g.setBindGroup(r?2:3,u),g.dispatchWorkgroups(1),g.end(),p.copyBufferToBuffer(f,0,m,0,c),l.queue.submit([p.finish()]),await m.mapAsync(GPUMapMode.READ),pn(new Float32Array(m.getMappedRange()))}finally{m.mapState==="mapped"&&m.unmap(),m.destroy(),f.destroy(),d.destroy()}}isCompilingShader(){return this._isCompilingShader}isPipelineReady(){return!!this._rayTracePipeline&&!!this._rayTraceBindGroups}getPipelineError(){return this._pipelineError}_updateBindGroups(){let{_device:e}=this,t=this._rayTracePipeline;if(!t)throw new Error("WebGPU ray tracing bind-group pipeline is not ready.");if(!this._bvhBuffer||!this._instancesBuffer)throw new Error("WebGPU BVH buffers are not ready.");let A=[this._bvhBuffer,this._instancesBuffer,this._attrBuffers,this._materialsBuffer].map((c,f)=>({binding:f,resource:{buffer:c}})),a=[...this._bindless?[]:[{binding:0,resource:this._mapsSampler},{binding:1,resource:this._maps.createView()}],{binding:3,resource:{buffer:this._bindless?.metadata??this._mapInfoUniform}},{binding:4,resource:this._envTex.createView()},{binding:5,resource:this._envDistributionTex.createView()},{binding:6,resource:this._backgroundTex.createView()},{binding:8,resource:this._lightSamplingTexture.createView()},{binding:9,resource:this._openPbrEnergyLut.createView()},{binding:10,resource:this._adaptiveSamplingTexture.createView()}],r=e.createBindGroup({layout:t.getBindGroupLayout(0),entries:this._bindless?A.concat(a.map(c=>({...c,binding:c.binding+4}))):A}),n=this._bindless?void 0:e.createBindGroup({layout:t.getBindGroupLayout(1),entries:a}),s=e.createBindGroup({layout:t.getBindGroupLayout(this._bindless?1:2),entries:Object.keys(this._uniforms).map((c,f)=>({binding:f,resource:{buffer:this._uniforms[c]}}))}),o=this._targetOutputs.get(this._activeTarget),l=o.pipeline===t&&o.bindGroup||e.createBindGroup({layout:t.getBindGroupLayout(this._bindless?2:3),entries:[this._outColorBuffer,this._outNormalBuffer,this._outAlbedoBuffer,this._outShadowCatcherBuffer].map((c,f)=>({binding:f,resource:{buffer:c}}))});o.bindGroup=l,o.pipeline=t,this._rayTraceBindGroups=[r,...n?[n]:[],s,l]}createPass(e,t,A,a){if(this._needsUpdateAnalyticLightsBuffer){let c=km(this._analyticLights,this._materialData.getLightTexturesIndices(),this._analyticLightSelectionPmfs,this._iesProfileTexelOffsets);this._device.queue.writeBuffer(this._uniforms.analyticLights,0,c.buffer,0,c.buffer.byteLength),this._needsUpdateAnalyticLightsBuffer=!1}let r=Math.ceil(this._width/A[0]),n=Math.ceil(this._height/A[1]);this._device.queue.writeBuffer(this._uniforms.rtUniform,0,this._rtUniform.buffer),t&&(e.clearBuffer(this._outColorBuffer),e.clearBuffer(this._outNormalBuffer),e.clearBuffer(this._outAlbedoBuffer),e.clearBuffer(this._outShadowCatcherBuffer));let s={},o=a?.querySet;o&&(s.timestampWrites={querySet:o,beginningOfPassWriteIndex:0,endOfPassWriteIndex:1});let l=e.beginComputePass(s);if(this._bindless?.table&&Ra(l,this._bindless.table),!this._rayTracePipeline||!this._rayTraceBindGroups)throw new Error("WebGPU ray tracing pass was submitted before it was ready.");l.setPipeline(this._rayTracePipeline),this._rayTraceBindGroups.forEach((c,f)=>{l.setBindGroup(f,c)}),l.dispatchWorkgroups(Math.ceil(r/sr),Math.ceil(n/sr),1),l.end()}async getDebugBVHData(){if(!this._debugBVHBuffer)throw new Error("software-bvh exposes no CPU-readable BVH debug buffer");return{buffer:this._debugBVHBuffer}}getDiagnostics(){let e=this._materialData instanceof jA?this._materialData.textureAtlasStats:void 0;return{textureAtlas:e,materialTextures:{requested:this._textureSelection.requested,active:this._bindless?"bindless":"atlas",fallbackReason:this._textureSelection.fallbackReason,...this._bindless?.diagnostics??{textureCount:e?.textureCount??0,estimatedBytes:e?.estimatedBytes??0,scale:e?.scale??1,metadataBytes:0,resourceTableCapacity:0,retiredBytes:0}},shaderCompilation:this._shaderCompilationDiagnostics,lightSampling:{emissiveTriangles:this._emissiveTriangles.length,activeChoices:this._rtUniform.views.lightChoiceCount[0],totalWeight:this._rtUniform.views.lightWeightTotal[0],domains:this._lightDomainDiagnostics},bvh:{tlasTraversalStackSize:this._constants.TLAS_STACK_SIZE,blasTraversalStackSize:this._constants.BLAS_STACK_SIZE}}}setAlphaBlendStrategy(e){let t=e==="deterministic-source-over"?e:"stochastic";return t===this._alphaBlendStrategy?!1:(this._alphaBlendStrategy=t,this._constants.HAS_ALPHA_BLEND&&(this._computeShaderModule=void 0,this._rayTracePipeline=void 0,this._rayTracePipelineLayout=void 0,this._rayTraceBindGroups=void 0,this._prevPipelineConstants={},this._failedPipelineSignature=void 0,this._needsUpdateBindGroups=!0),!0)}hasDepthOfField(){return this._apertureRadius>0}setBounce(e){let t=aA(e),A=this._bounces!==t;return this._bounces=t,this._rtUniform.views.bounces[0]=t,A}setDirectLightCandidates(e){let t=rA(e),A=this._directLightCandidates!==t;return this._directLightCandidates=t,this._rtUniform.views.directLightCandidates[0]=t,A}setClamping(e){let t=this._clamping!==e;return this._rtUniform.views.clamping[0]=e??0,this._clamping=e,t}setBevelSamples(e){let t=nA(e),A=this._bevelSamples!==t;return A&&(this._bevelSamples=t,this._constants.BEVEL_SAMPLES=t),A}setSamplingPattern(e,t,A=0){let a=wf(e,t,A),{code:r,logSPP:n}=a,s=this._rtUniform.views,o=this._constants.SAMPLING_PATTERN!==r||s.sequenceSeed[0]!==A>>>0||r===1&&s.zSobolLogSPP[0]!==n;return this._constants.SAMPLING_PATTERN=r,_f(s,a),o}setSampleSequenceOffset(e){this._rtUniform.views.sampleSequenceOffset[0]=e}setVarianceMoments(e){this._rtUniform.views.varianceMoments[0]=e?1:0}setAdaptiveSamplingTargets(e){if(this._rtUniform.views.adaptiveSampling[0]=e?1:0,!e)return;let{width:t,height:A,data:a}=e;if(t<=0||A<=0||a.length!==t*A)throw new Error("Adaptive sample targets do not match their dimensions.");this._ensureAdaptiveSamplingTexture(t,A),this._device.queue.writeTexture({texture:this._adaptiveSamplingTexture},a,{bytesPerRow:t*Float32Array.BYTES_PER_ELEMENT},[t,A])}setQuality(e){Ef(this._rtUniform.views,e)}_setEnvMap(e){let t=this._device;if(!$n(e,this._envImageSource)||!this._envTex){this._envImageSource=e;let A=e&&"sky"in e?e:void 0;if(A&&(A.width+2>t.limits.maxTextureDimension2D||A.height+1>t.limits.maxTextureDimension2D))throw new RangeError("ProceduralSky resolution exceeds the device texture size limit.");let a=e&&(A||e.width*e.height>=65536)&&cr.supported(t,e.width,e.height);if(A&&!a)throw new RangeError("ProceduralSky resolution exceeds the GPU sampling storage limit; reduce resolution.");let r=e&&!("sky"in e)&&!a?Xn(e):void 0,n=e?e.width+2:1,s=e?e.height+1:1,o=e?.width??1,l=e?.height??1,c=!this._envTex||this._envTex.width!==o||this._envTex.height!==l||!this._envDistributionTex||this._envDistributionTex.width!==n||this._envDistributionTex.height!==s;if(c){this._envTex?.destroy(),this._envDistributionTex?.destroy();let f=GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT;this._envTex=t.createTexture({format:"rgba32float",usage:f|GPUTextureUsage.STORAGE_BINDING,label:"Env",size:{width:o,height:l,depthOrArrayLayers:1}}),this._envDistributionTex=t.createTexture({format:"rg32float",usage:f|GPUTextureUsage.STORAGE_BINDING,label:"Env Distribution",size:{width:n,height:s,depthOrArrayLayers:1}})}e?("sky"in e?(this._skyBaker??=new ar(t),this._skyBaker.bake(e,this._envTex)):t.queue.writeTexture({texture:this._envTex},e.data.buffer,{bytesPerRow:e.width*4*4},{width:e.width,height:e.height,depthOrArrayLayers:1}),a?(this._envDistribution??=new cr(t),this._envDistribution.build(this._envTex,this._envDistributionTex)):r&&(this._envDistribution?.dispose(),t.queue.writeTexture({texture:this._envDistributionTex},r.data.buffer,{bytesPerRow:r.width*4*2},{width:r.width,height:r.height,depthOrArrayLayers:1}))):this._envDistribution?.dispose(),this._needsUpdateBindGroups||=c}this._constants.USE_ENVMAP=!!e}setMeshes(e,t){for(let u of t?.colors??[])this._dirtyColorMeshes.add(u);if(t&&this._preparedMeshData&&this._materialData&&!this._needsUpdateMeshData&&!this._needsUpdateMeshMembership&&e===this._meshes){let u=this._materialChanges.classify(t.materials??[]);if(u.level!=="geometry"&&Gn(this._preparedMeshData,t.geometries??[])){if(t.materials?.length){let p=this._pendingMaterialUpdate;this._pendingMaterialUpdate={level:p?.level==="textures"?"textures":u.level,emission:!!p?.emission||u.emission,emissiveMap:!!p?.emissiveMap||u.emissiveMap,materials:new Set([...p?.materials??[],...t.materials])},this._meshSnapshot.forEach(g=>{g.materialKeys=g.materials.map(Ct)})}for(let p of t.geometries??[])this._pendingGeometryUpdates.add(p);for(let p of this._meshSnapshot)this._pendingGeometryUpdates.has(p.geometry)&&(p.geometryVersion=p.geometry.version);for(let p of t.transforms??[]){let g=this._snapshotByMesh.get(p);g&&(g.matrix=Array.from(p.transform),this._dirtyTransformMeshes.add(p),this._needsRefitTLAS=!0)}return!!t.materials?.length||!!t.transforms?.length||!!t.colors?.length||!!t.geometries?.length}}let A=t?.materials?.length||t?.colors?.length?void 0:t?.transforms,a=!!t?.materials?.length;if(A&&!A.some(u=>u instanceof be)&&e===this._meshes&&this._meshSnapshot.length===e.length&&this._meshSnapshot.every(u=>u.geometryVersion===u.geometry.version&&u.bvh===ge(u.geometry))){let u=!1;for(let p of A){let g=this._snapshotByMesh.get(p);if(!g)continue;let v=p.transform;g.matrix.length===v.length&&g.matrix.every((h,B)=>h===v[B])||(g.matrix=Array.from(v),this._dirtyTransformMeshes.add(p),u=!0)}return u&&(this._needsRefitTLAS=!0),u}let r=this._meshSnapshot,n=e.map(u=>({mesh:u,instanceCount:u instanceof be?u.count:1,instanceVersion:u instanceof be?u.transformsVersion:0,instanceTransforms:u instanceof be?u.transforms:void 0,instanceColors:u instanceof be?u.colors:void 0,colorVersion:u instanceof be?u.colorsVersion:0,geometry:u.geometry,bvh:ge(u.geometry),materials:u.materials.slice(),materialKeys:u.materials.map(Ct),geometryVersion:u.geometry.version,positionArray:u.geometry.position.array,positionItemSize:u.geometry.position.itemSize,indexArray:u.geometry.indices.array,indexItemSize:u.geometry.indices.itemSize,materialIndexArray:u.geometry.materialIndex?.array,materialIndexItemSize:u.geometry.materialIndex?.itemSize,matrix:Array.from(u.transform)})),s=n.length!==r.length||n.some((u,p)=>u.mesh!==r[p]?.mesh||u.instanceCount!==r[p]?.instanceCount||u.materials.some((g,v)=>g!==r[p]?.materials[v])),o=!this._needsUpdateMeshData&&s&&this._preparedMeshData?this._membershipCache.update(this._preparedMeshData,e):void 0;if(o){let u=new Map(r.flatMap(g=>g.materials.map((v,h)=>[v,g.materialKeys[h]]))),p=o.materials.length!==this._preparedMeshData.materials.length||o.materials.some((g,v)=>g!==this._preparedMeshData.materials[v]||u.has(g)&&Ct(g)!==u.get(g));return this._pendingMembershipData=o,this._meshes=e,this._meshSnapshot=n,this._snapshotByMesh=new WeakMap,n.forEach(g=>this._snapshotByMesh.set(g.mesh,g)),this._needsUpdateMeshMembership=!0,this._needsRefitTLAS=!1,this._dirtyTransformMeshes.clear(),p&&(this._pendingMaterialUpdate={level:"textures",emission:!0,emissiveMap:!0,materials:new Set(o.materials)}),!0}if(!!this._residentPreparedMeshData&&(n.length!==r.length||n.some((u,p)=>u.mesh!==r[p]?.mesh))&&n.every(u=>{let p=this._residentSnapshotByMesh.get(u.mesh);return!!p&&u.colorVersion===p.colorVersion&&u.instanceColors===p.instanceColors&&u.geometry===p.geometry&&u.bvh===p.bvh&&u.materials.length===p.materials.length&&u.materials.every((g,v)=>g===p.materials[v])&&u.materialKeys.every((g,v)=>g===p.materialKeys[v])&&u.geometryVersion===p.geometryVersion&&this._materialChanges.classify(u.materials).level==="params"&&u.positionArray===p.positionArray&&u.indexArray===p.indexArray&&u.materialIndexArray===p.materialIndexArray&&u.matrix.every((g,v)=>g===p.matrix[v])}))return this._meshes=e,this._meshSnapshot=n,this._snapshotByMesh=new WeakMap,n.forEach(u=>{this._snapshotByMesh.set(u.mesh,u)}),this._needsUpdateMeshMembership=!0,this._needsRefitTLAS=!1,this._dirtyTransformMeshes.clear(),!0;let c=n.length!==r.length||n.some((u,p)=>{let g=r[p];return!g||u.mesh!==g.mesh||u.instanceCount!==g.instanceCount||u.geometry!==g.geometry||u.bvh!==g.bvh||u.colorVersion!==g.colorVersion||u.instanceColors!==g.instanceColors||u.materials.length!==g.materials.length||u.materials.some((v,h)=>v!==g.materials[h])||u.materialKeys.some((v,h)=>v!==g.materialKeys[h])||u.positionArray!==g.positionArray||u.positionArray.length!==g.positionArray.length||u.positionItemSize!==g.positionItemSize||u.indexArray!==g.indexArray||u.indexArray.length!==g.indexArray.length||u.indexItemSize!==g.indexItemSize||u.materialIndexArray!==g.materialIndexArray||u.materialIndexArray?.length!==g.materialIndexArray?.length||u.materialIndexItemSize!==g.materialIndexItemSize}),f=!c&&n.some((u,p)=>u.geometryVersion!==r[p].geometryVersion),m=c||f,d=!c&&n.some((u,p)=>u.instanceVersion!==r[p].instanceVersion||u.instanceTransforms!==r[p].instanceTransforms||u.matrix.some((g,v)=>g!==r[p].matrix[v]));return this._meshes=e,n.forEach((u,p)=>{let g=r[p];g?.geometry===u.geometry&&(g.positionArray!==u.positionArray||g.indexArray!==u.indexArray)&&(ct(u.geometry,void 0),this._geometriesNeedRefit.add(u.geometry)),u.geometryVersion>0&&(!g||u.geometry!==g.geometry||u.geometryVersion!==g.geometryVersion)&&this._geometriesNeedRefit.add(u.geometry)}),this._meshSnapshot=n,this._snapshotByMesh=new WeakMap,n.forEach(u=>{this._snapshotByMesh.set(u.mesh,u)}),m?(this._needsUpdateMeshData=!0,this._needsUpdateMeshMembership=!1,this._needsRefitTLAS=!1,this._dirtyTransformMeshes.clear()):d&&(this._needsRefitTLAS=!0,n.forEach((u,p)=>{(u.instanceVersion!==r[p].instanceVersion||u.instanceTransforms!==r[p].instanceTransforms||u.matrix.some((g,v)=>g!==r[p]?.matrix[v]))&&this._dirtyTransformMeshes.add(u.mesh)})),(a||!t&&!m&&!d)&&(this._needsUpdateMeshData=!0),m||d||a||!t}setTextureAtlasBudget(e){let t=Number.isFinite(e)?Math.max(4,Math.floor(e)):Dt;return t===this._maxTextureArrayBytes?!1:(this._maxTextureArrayBytes=t,this._needsUpdateMeshData=!0,!0)}setBackground(e){this._rtUniform.views.backgroundMapTransform.set(lr(e)),this._rtUniform.views.backgroundMapRotation.set(Yn(e)),this._constants.USE_BACKGROUND=!!e;let t=e&&!Array.isArray(e)?jn(e):void 0;this._constants.USE_BACKGROUND_MAP=!!t,Array.isArray(e)&&this._rtUniform.views.backgroundColor.set(new tl(e));let A=e&&!Array.isArray(e)&&"type"in e&&e.type==="GroundedSkybox"?e:void 0;this._rtUniform.views.groundedBackgroundParams.set(A?[Math.max(A.height,1e-4),Math.max(A.radius,1e-4),A.groundHeight??0,1]:[0,0,0,0]),this._rtUniform.views.groundedBackgroundCenter.set(A?.center??[0,0]),this._constants.USE_GROUNDED_BACKGROUND=!!A,this._rtUniform.views.backgroundFlags[0]=(e?1:0)|(t?2:0)|(A?4:0)|this._rtUniform.views.backgroundFlags[0]&2147483648,this._setBackgroundMap(t)}_setBackgroundMap(e){if(e===this._backgroundImageSource&&this._backgroundTex)return;this._backgroundImageSource=e;let t=e?.width??1,A=e?.height??1;if(e&&"sky"in e&&(t>this._device.limits.maxTextureDimension2D||A>this._device.limits.maxTextureDimension2D))throw new RangeError("ProceduralSky resolution exceeds the device texture size limit.");let a=!this._backgroundTex||this._backgroundTex.width!==t||this._backgroundTex.height!==A;if(a&&(this._backgroundTex?.destroy(),this._backgroundTex=this._device.createTexture({format:"rgba32float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.STORAGE_BINDING,label:"Background",size:{width:t,height:A,depthOrArrayLayers:1}})),e&&"sky"in e)this._skyBaker??=new ar(this._device),this._skyBaker.bake(e,this._backgroundTex);else if(e){let r=e.data,n=r instanceof Float32Array?r:r instanceof Uint8Array||r instanceof Uint8ClampedArray?Float32Array.from(r,s=>s/255):Float32Array.from(r);this._device.queue.writeTexture({texture:this._backgroundTex},n.buffer,{bytesPerRow:t*4*4},{width:t,height:A,depthOrArrayLayers:1})}this._needsUpdateBindGroups||=a}_updateLightSamplingData(){this._constants.LIGHT_CAPABILITIES=Sf(this._analyticLights.map(f=>f.type),this._emissiveTriangles.length);let e=xf(this._analyticLights,this._emissiveTriangles,this._envImageSource&&"sky"in this._envImageSource?lf(this._envImageSource):sn(this._envImageSource),this._device.limits.maxTextureDimension2D,this._lightChoices,this._lightSamplingScratch,this._shadowCatcherLightChoices);this._analyticLightSelectionPmfs=e.analyticPmfs,this._iesProfileTexelOffsets=e.profiles.offsets,this._lightDomainDiagnostics=e.domains;let{lightWidth:t,lightHeight:A,lightData:a}=e;bf(this._rtUniform.views,e);let r=!this._lightSamplingTexture||t!==this._lightSamplingTextureSize[0]||A!==this._lightSamplingTextureSize[1];(!this._lightSamplingTexture||t!==this._lightSamplingTextureSize[0]||A!==this._lightSamplingTextureSize[1])&&(this._lightSamplingTexture?.destroy(),this._lightSamplingTexture=this._device.createTexture({label:"Light sampling data",size:[t,A],format:"rgba32float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST}),this._lightSamplingTextureSize=[t,A],this._needsUpdateBindGroups=!0);let n=this._lightSamplingData,s=r||!n||this._lightSamplingTriangleCount!==this._emissiveTriangles.length,o=new Uint32Array(a.buffer),l=n&&new Uint32Array(n.buffer),c=-1;for(let f=0;f<=A;f++){let m=f<A&&s;if(f<A&&!s){for(let d=f*t*4;d<(f+1)*t*4;d++)if(o[d]!==l[d]){m=!0;break}}m&&c<0&&(c=f),!m&&c>=0&&(this._device.queue.writeTexture({texture:this._lightSamplingTexture,origin:[0,c]},a.subarray(c*t*4,f*t*4),{bytesPerRow:t*16},{width:t,height:f-c}),c=-1)}this._lightSamplingScratch=n,this._lightSamplingData=a,this._lightSamplingTriangleCount=this._emissiveTriangles.length,this._needsUpdateAnalyticLightsBuffer=!0,this._needsUpdateLightSamplingData=!1}_uploadBVH(e,t){let A=Er(e,t);this._constants.TLAS_STACK_SIZE=Ri(A.tlas,Number(this._constants.TLAS_STACK_SIZE??0)),this._constants.BLAS_STACK_SIZE=Ri(A.blas,Number(this._constants.BLAS_STACK_SIZE??0),32);let a=new Float32Array(e.buffer),r=new Float32Array(xA(t)),n=new Float32Array(a.length+r.length),s=a.length/4;n.set(a),n.set(r,s*4);let o=this._updateGPUBuffer("BVH",this._bvhBuffer,n),l=this._updateGPUBuffer("Instances",this._instancesBuffer,new Float32Array(e.instancesBuffer));(o!==this._bvhBuffer||l!==this._instancesBuffer)&&(this._needsUpdateBindGroups=!0),this._bvhBuffer=o,this._instancesBuffer=l,this._debugBVHBuffer=n.buffer.slice(0),this._rtUniform.views.blasOffset.set([s])}_updateMeshData(){this._pendingGeometryUpdates.clear(),this._emissiveCache=new Va;let e=this._meshes;for(let u of this._geometriesNeedRefit)(e.some(g=>g.geometry===u&&!!g.materials[0]?.displacementMap&&(g.materials[0].displacementScale!==0||g.materials[0].displacementBias!==0))||or(this._preparedMeshData,u)||!ge(u)||!yA(ge(u),u))&&ct(u,void 0);this._geometriesNeedRefit.clear();let t=un(e);this._preparedMeshData=t,this._membershipCache.capture(t),this._pendingMembershipData=void 0,this._needsUpdateMeshMembership=!1;let A=t.geometry,a=t.materials,r=e.length===0||t.instances.length===0,n=Hi(t.instances,t.blases);this._tlas=n,this._uploadBVH(n,t.blases);let s=this._materialData=this._createMaterialData(a,this._analyticLights,{maxTextureArrayBytes:this._maxTextureArrayBytes,maxTextureArrayLayers:this._device.limits.maxTextureArrayLayers,maxTextureDimension2D:this._device.limits.maxTextureDimension2D});this._emissiveTriangles=this._emissiveCache.collect(t.emissiveBindings,a),this._needsUpdateLightSamplingData=!0;let o=vf(A),{stride:l,offsets:c}=o,f=new tl(A.vertexCount*l);$o(A,f,l,c,0,A.vertexCount),this._attributeData=f,this._attributeStride=l,this._attributeOffsets=c,this._attrBuffers=this._updateGPUBuffer("Attributes",this._attrBuffers,f),this._materialsBuffer=this._updateGPUBuffer("Materials",this._materialsBuffer,s.getBufferArray(),kA*4);let m=Er(n,t.blases),d={bvh2:1,bvh4:2,"bvh-gpu":4,cwbvh:8};this._blasLayoutMask=t.blases.reduce((u,p)=>u|d[p.bvh.layout??"bvh2"],0),Object.assign(this._constants,Bf(m.tlas,m.blas,this._constants),o.constants),this._updateMaterialConstants(a,s,A),this._updateTextures(s),this._needsUpdateBindGroups=!0,this._rtUniform.views.isEmpty[0]=+r,this._meshSnapshot.forEach(u=>{u.bvh=ge(u.geometry)}),this._residentPreparedMeshData=t,this._residentSnapshotByMesh=new WeakMap,this._meshSnapshot.forEach(u=>{this._residentSnapshotByMesh.set(u.mesh,u)}),this._materialChanges.capture(a),this._pendingMaterialUpdate=void 0,this._needsUpdateMeshData=!1,this._needsUpdateMeshMembership=!1,this._needsRefitTLAS=!1}_updateMaterialConstants(e,t,A){let a=e.some(n=>n.transmissionWeight>0);a!==this._hasTransmission&&(this._hasTransmission=a),this._hasShadowCatcher=e.some(n=>n.shadowCatcher);let r=t.getDisplacementMaps().length>0;r!==this._hasDisplacement&&(this._hasDisplacement=r,this._rayTracePipelineLayout=void 0),Object.assign(this._constants,Df(e,t,A,this._bevelSamples,Number(this._constants.NUM_MAPS??0))),this._bindless&&(this._constants.NUM_MAPS=20)}_updateGeometryData(){let e=this._preparedMeshData,t=this._tlas,A=Hn(e,this._pendingGeometryUpdates);for(let{first:n,count:s,topologyChanged:o,deformationOnly:l}of A.vertices){$o(e.geometry,this._attributeData,this._attributeStride,this._attributeOffsets,n,s,o,l);let c=n*this._attributeStride*4,f=s*this._attributeStride*4;this._device.queue.writeBuffer(this._attrBuffers,c,this._attributeData.buffer,c,f)}for(let n of A.meshes)this._dirtyTransformMeshes.add(n);if(A.relocated)for(let n of e.instanceBindings)this._dirtyTransformMeshes.add(n.mesh);if(A.resized)e.instances=Yt(e.instanceBindings),bA(t,e.instances,e.blases),this._uploadBVH(t,e.blases);else{let n=new Uint8Array(this._debugBVHBuffer),s=[];for(let{blas:o,offset:l}of A.blases){let c=t.buffer.byteLength+l;n.set(new Uint8Array(o.buffer),c),s.push({offset:c,size:o.buffer.byteLength})}for(let{offset:o,size:l}of wr(s))this._device.queue.writeBuffer(this._bvhBuffer,o,this._debugBVHBuffer,o,l)}let a={bvh2:1,bvh4:2,"bvh-gpu":4,cwbvh:8};this._blasLayoutMask=e.blases.reduce((n,s)=>n|a[s.bvh.layout??"bvh2"],0);let r=Er(t,e.blases);this._constants.BLAS_STACK_SIZE=Ri(r.blas,Number(this._constants.BLAS_STACK_SIZE??0),32),this._meshSnapshot.forEach(n=>{n.bvh=ge(n.geometry)}),this._needsRefitTLAS=!0,this._pendingGeometryUpdates.clear()}_updateMaterialData(){let e=this._pendingMaterialUpdate,t=this._preparedMeshData,A=this._materialData;if(e.level==="textures"?(A=this._materialData=this._createMaterialData(t.materials,this._analyticLights,{maxTextureArrayBytes:this._maxTextureArrayBytes,maxTextureArrayLayers:this._device.limits.maxTextureArrayLayers,maxTextureDimension2D:this._device.limits.maxTextureDimension2D}),this._updateTextures(A)):A.repackParams(t.materials),this._materialsBuffer=this._updateGPUBuffer("Materials",this._materialsBuffer,A.getBufferArray(),kA*4),this._updateMaterialConstants(t.materials,A,t.geometry),e.emission||e.emissiveMap){let a=this._residentPreparedMeshData;a.emissiveBindings=a.instanceBindings.filter(n=>n.materialIndices.some(s=>pA(t.materials[s])));let r=new Set(this._meshes);t.emissiveBindings=a.emissiveBindings.filter(n=>r.has(n.mesh)),this._emissiveTriangles=this._emissiveCache.collect(t.emissiveBindings,t.materials),this._needsUpdateLightSamplingData=!0}this._needsUpdateBindGroups=!0,this._materialChanges.capture([...e.materials]),this._pendingMaterialUpdate=void 0}_updateMeshMembership(){let e=this._pendingMembershipData??this._residentPreparedMeshData,t=this._pendingMembershipData;if(!e){this._needsUpdateMeshData=!0,this._needsUpdateMeshMembership=!1;return}let A=new Set(this._meshes),a=e.instanceBindings.filter(({mesh:l})=>A.has(l)),r=e.emissiveBindings.filter(({mesh:l})=>A.has(l)),n=Yt(a),s={...e,instances:n,instanceBindings:a,emissiveBindings:r};this._preparedMeshData=s,t&&(this._residentPreparedMeshData=s),this._pendingMembershipData=void 0;let o=Hi(n,s.blases);this._tlas=o,this._uploadBVH(o,s.blases),this._emissiveTriangles=this._emissiveCache.collect(r,s.materials),this._needsUpdateLightSamplingData=!0,this._rtUniform.views.isEmpty[0]=+(n.length===0),this._meshSnapshot.forEach(l=>{l.bvh=ge(l.geometry)}),this._needsUpdateMeshMembership=!1}_updateMeshColors(){let e=this._preparedMeshData,t=this._tlas;if(e&&t){let A=dn(e.instanceBindings,e.instances,this._dirtyColorMeshes),a=_r(t,e.instances,A);if(this._instancesBuffer)for(let{offset:r,size:n}of a)this._device.queue.writeBuffer(this._instancesBuffer,r,t.instancesBuffer,r,n)}this._dirtyColorMeshes.clear()}_refitMeshInstances(){let e=this._preparedMeshData,t=this._tlas;if(!e||!t||!this._bvhBuffer||!this._instancesBuffer){this._needsUpdateMeshData=!0,this._needsRefitTLAS=!1;return}let A=Ja(e.instanceBindings,this._dirtyTransformMeshes,e.instances),a=A.size>0,r=e.instances;if(e.instances=Yt(e.instanceBindings,a?e.instances:void 0,a?A:void 0),!ha(r,e.instances)){this._tlas=Hi(e.instances,e.blases),this._uploadBVH(this._tlas,e.blases),this._emissiveTriangles=this._emissiveCache.collect(e.emissiveBindings,e.materials),this._needsUpdateLightSamplingData=!0,this._rtUniform.views.isEmpty[0]=+(e.instances.length===0),this._dirtyTransformMeshes.clear(),this._needsRefitTLAS=!1;return}let n=bA(t,e.instances,e.blases,a?A:void 0),s=new Float32Array(t.buffer);for(let{offset:o,size:l}of n.tlasRanges)this._device.queue.writeBuffer(this._bvhBuffer,o,t.buffer,o,l);for(let{offset:o,size:l}of n.instanceRanges)this._device.queue.writeBuffer(this._instancesBuffer,o,t.instancesBuffer,o,l);this._debugBVHBuffer&&new Float32Array(this._debugBVHBuffer).set(s),(!a||e.emissiveBindings.some(({mesh:o})=>this._dirtyTransformMeshes.has(o)))&&(this._emissiveTriangles=this._emissiveCache.collect(e.emissiveBindings,e.materials),this._needsUpdateLightSamplingData=!0),this._dirtyTransformMeshes.clear(),this._needsRefitTLAS=!1}_createMaterialData(...e){if(this._bindless){let t=new nr(e[0],e[1]),A=Ta(this._device,t.textures.length);if(!A)return t;this._textureSelection.fallbackReason=A;let a=this._bindless;this._retiredBindless.add(a),this._device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>{a.dispose(),this._retiredBindless.delete(a)}),this._bindless=void 0,this._computeShaderModule=void 0,this._rayTracePipelineLayout=void 0}return new jA(...e)}_updateTextures(e){if(e instanceof nr){this._bindless.update(e.textures,this._maxTextureArrayBytes),this._needsUpdateBindGroups=!0;return}let t=e.bufferData.mapInfo??[0,0,0,0],A=e.bufferData.mapTransform??[1,1,0,0],a=e.bufferData.mapUvChannel??[0],r=e.bufferData.mapColorLinear,n=+this._constants.NUM_MAPS,s=new tl(n*12);for(let v=0;v<t.length;v++)s[v]=t[v];for(let v=0;v<A.length;v++)s[n*4+v]=A[v];for(let v=0;v<a.length;v++)s[n*8+v*4]=a[v],s[n*8+v*4+1]=r[v],s[n*8+v*4+2]=e.bufferData.mapWrap[v*2],s[n*8+v*4+3]=e.bufferData.mapWrap[v*2+1];let o=this._mapInfoUniform;(!o||o.size!==s.byteLength)&&(o?.destroy(),o=this._uniformBuffer(s.byteLength),this._mapInfoUniform=o),this._device.queue.writeBuffer(o,0,s);let l=e.texture,c=this._maps,f=l?.storageType===j.HALF_FLOAT?"rgba16float":"rgba8unorm",m=f==="rgba16float"?8:4,d=Math.max(l?.width??1,1),u=Math.max(l?.height??1,1),p=Math.max(l?.source.length??1,2),g=this._device.limits.maxTextureArrayLayers;if(p>g)throw new Error(`The scene needs ${p} texture-array layers, but this GPU device supports ${g}.`);(!c||f!==c.format||d!==c.width||u!==c.height||p!==c.depthOrArrayLayers)&&(c&&c.destroy(),this._maps=this._device.createTexture({format:f,label:"Maps",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,size:{width:d,height:u,depthOrArrayLayers:p}}),this._needsUpdateBindGroups=!0),l?.source.forEach((v,h)=>{if(pt(v)){if(!(v.data instanceof Uint8Array)&&!(v.data instanceof Uint16Array))throw new Error("Material texture atlas GPU upload requires RGBA8 or RGBA16F data.");this._device.queue.writeTexture({texture:this._maps,origin:[0,0,h]},v.data,{bytesPerRow:v.width*m,rowsPerImage:v.height},{width:v.width,height:v.height,depthOrArrayLayers:1});return}this._device.queue.copyExternalImageToTexture({source:v,flipY:l.flipYArray[h]},{texture:this._maps,origin:[0,0,h]},[v.width,v.height])})}setLights(e){let t=e.filter(s=>s.type==="DirectionalLight"||s.type==="SphereLight"||s.type==="SpotLight"||s.type==="RectLight");t.length>Zn&&console.warn(`Too many lights, only the first ${Zn} lights will be used.`);let A=t.slice(0,Zn),a=A.length,r=this._sceneEnvironment.update(e);this._rtUniform.views.environmentRotation.set(Wn(e)),this._rtUniform.views.lightsCount[0]=a,this._setEnvMap(r);let n=this._rectLightTextures.update(A);this._analyticLights=A,n&&(this._needsUpdateMeshData=!0),this._needsUpdateAnalyticLightsBuffer=!0,this._needsUpdateLightSamplingData=!0}_updateViewProjInv(e,t){oe.invert(t,e.getProjectionMatrix(this._targetAspect)),oe.mul(t,e.transform,t)}setCamera(e){let t=this._viewProjInv;this._apertureRadius=ea(e),this._focusDistance=e.focusDistance,this._updateViewProjInv(e,t),oe.copy(this._cameraWorld,e.transform)}cameraChanged(e){let t=oe.create();return this._updateViewProjInv(e,t),!qn(this._viewProjInv,t)||ea(e)!==this._apertureRadius||e.focusDistance!==this._focusDistance}setSize(e,t,A=e/t){this._targetAspect=A,this._width=e,this._height=t;let a=this._rtUniform.views.outputSize;a[0]=e,a[1]=t;let r=this._outColorBuffer,n=e*t*4*4;if(r&&r.size===n)return;this._needsUpdateBindGroups=!0;let s=[];for(let o of["Color","Normal","Albedo","ShadowCatcher"]){let l=this[`_out${o}Buffer`];l&&s.push(l),this[`_out${o}Buffer`]=this._device.createBuffer({label:"Ray Trace "+o,size:o==="ShadowCatcher"?e*t*48:n,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC})}this._targetOutputs.set(this._activeTarget,{buffers:[this._outColorBuffer,this._outNormalBuffer,this._outAlbedoBuffer,this._outShadowCatcherBuffer]}),this._device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>s.forEach(o=>o.destroy()))}setJitter(e,t){let A=this._rtUniform.views.jitter;A[0]=e,A[1]=t,this._device.queue.writeBuffer(this._uniforms.cameraUniform,0,qo(this._viewProjInv,this._cameraWorld,this._apertureRadius,this._focusDistance))}setSampleTiles(e,t,A,a){let r=this._rtUniform.views.scaleOffset;r[0]=e,r[1]=t,r[2]=A,r[3]=a}setSampleCount(e){this._rtUniform.views.sampleCount[0]=e}setTransmissiveOutputAlphaMin(e){this._rtUniform.views.transmissiveOutputAlphaMin[0]=e;let t=this._transmissiveAlphaMin!==e;return this._transmissiveAlphaMin=e,t}needsDenoiseAlpha(){return this._hasShadowCatcher||this._transmissiveAlphaMin<1&&this._hasTransmission}hasShadowCatcher(){return this._hasShadowCatcher}dispose(){this._disposed=!0,this._envDistribution?.dispose(),this._skyBaker?.dispose(),this._bindless?.dispose(),this._retiredBindless.forEach(A=>A.dispose()),this._retiredBindless.clear(),this._shaderCache.clear(),this._shaderCapabilities.clear(),new Set([...Array.from(this._targetOutputs.values()).flatMap(A=>A.buffers),this._mapInfoUniform,this._attrBuffers,this._materialsBuffer,this._bvhBuffer,this._instancesBuffer,this._offlineAdaptiveHistory?.varianceBuffer,...Object.values(this._uniforms)]).forEach(A=>A?.destroy()),new Set([this._maps,this._lightSamplingTexture,this._openPbrEnergyLut,this._envTex,this._envDistributionTex,this._backgroundTex,this._adaptiveSamplingTexture]).forEach(A=>A?.destroy()),this._rayTracePipeline=void 0,this._rayTraceBindGroups=void 0}},uu=il;function hA(i,e){for(var t=0,A=1/e,a=i;a>0;)t=t+A*(a%e),a=Math.floor(a/e),A=A/e;return t}function is(i){let e=21,t=1/0,A=-1,a=1,r=1,n,s,o,l,c=0,f=0,m=0,d=0,u=i?Wm(i):6e5;function p(){A=-1,m=0,d=0}function g(E,x){c=E,f=x,p(),v()}function v(){let x=c/f;n=Math.ceil(3e3/Math.max(Math.round(3e3/Math.sqrt(u*x)),1)),s=Math.ceil(n/x),n>c&&s>f?(o=1,l=1,a=1,r=Math.round(n/c)*Math.round(s/f)):(r=1,o=Math.ceil(c/n),l=Math.ceil(f/s),a=o*l),a>t&&(a=t,o=Math.ceil(Math.sqrt(a)),l=Math.ceil(a/o),a=o*l,n=Math.ceil(c/o),s=Math.ceil(f/l))}function h(){let E=m/d,x=e-E;u+=5e3*Math.sign(x)*Math.sqrt(Math.abs(x)),u=Math.max(u,8192)}function B(E){A>=0&&E!=null&&Number.isFinite(E)&&E>0&&(m+=E,d++),A++,A%a===0&&(d&&(h(),v()),m=0,d=0,A=0);let x=A===a-1,y=A%o,M=Math.floor(A/o)%l;return{xIndex:y,yIndex:M,columns:o,rows:l,x:y*n,y:M*s,tileWidth:n,tileHeight:s,isFirstTile:A===0,isLastTile:x,samplesPerFrame:r}}return{nextTile:B,reset:p,setSize:g,setMaxTiles(E){t=E},setDesiredMsPerTile(E){e=E},getDesiredMsPerTile(){return e}}}function Gm(i,e,t,A,a,r){let n=[i,e],s=t>0?A/t:1,o=Xo(s,.25,4),l=Math.sqrt(o),c=o/l,f=Math.ceil(l*a[0]),m=Math.ceil(c*a[1]),d=1;f>n[0]*2&&(d*=Math.floor(f/n[0])),f=Math.min(f,n[0]),m>n[1]*2&&(d*=Math.floor(m/n[1])),m=Math.min(m,n[1]);let u=Math.round(i/f),p=Math.round(e/m);f=Math.ceil(i/u),m=Math.ceil(e/p);let g=p*u;return g>r&&(g=r,u=Math.ceil(Math.sqrt(g)),p=Math.ceil(g/u),g=u*p,f=Math.ceil(i/u),m=Math.ceil(e/p)),{tileWidth:f,tileHeight:m,columns:u,rows:p,numTiles:g,samplesPerFrame:d}}var du=262144;function Hm(i,e){let t=i>0&&e>0?i/e:1;return[Math.min(i,Math.max(1,Math.round(Math.sqrt(du*t)))),Math.min(e,Math.max(1,Math.round(Math.sqrt(du/t))))]}function pu(){let i=1,e=-1,t=-1,A=0,a=-1,r=0,n=0,s=[64,64],o=0,l=0,c=0,f=0,m=0,d=1,u=0,p=0,g=1/0;function v(){e++;let h=n>0?r/n:t;if(e%i===0&&(e=0),e===0&&A!==a){a=A;let y=Gm(o,l,h,c,t>=0?s:Hm(o,l),g);r=0,n=0,f=y.tileWidth,m=y.tileHeight,u=y.columns,p=y.rows,i=y.numTiles,d=y.samplesPerFrame}let B=e%u,E=Math.floor(e/u)%p,x=e===i-1;return s=[f,m],{xIndex:B,yIndex:E,columns:u,rows:p,x:B*f,y:E*m,tileWidth:f,tileHeight:m,isFirstTile:e===0,isLastTile:x,samplesPerFrame:d}}return{nextTile:v,reset(){e=-1},setSize(h,B){(o!==h||l!==B)&&A++,o=h,l=B},setMaxTiles(h){g!==h&&A++,g=h},setDesiredMsPerTile(h){c!==h&&A++,c=h},needsUpdatePredicting(){A++,t=-1,r=0,n=0},setLastTraceTime(h){A++,t=h,n++,r+=h},getLastTraceTime(){return t},getDesiredMsPerTile(){return c}}}function Wm(i){return i.getParameter(i.MAX_RENDERBUFFER_SIZE)<=8192?2e5:1e6}function mu(i=!1,e=!0){return`
${mn}
@group(0) @binding(0) var<storage, read> colorBuffer: array<vec4f>;
@group(0) @binding(1) var<storage, read> normalBuffer: array<vec4f>;
@group(0) @binding(2) var<storage, read> albedoBuffer: array<vec4f>;
${lA}
@group(0) @binding(3) var<storage, read> shadowCatcherBuffer: array<ShadowCatcherAccumulation>;

@group(1) @binding(0) var<uniform> sampleCount: f32;
@group(1) @binding(1) var<uniform> sampleTileGrid: vec2u;

override outputWidth: f32;
override outputHeight: f32;

struct qa {
${i?`@location(0) foreground: vec4f,
@location(1) catcherBackground: vec4f`:`@location(0) color: vec4f,
@location(1) normal: vec4f,
@location(2) albedo: vec4f${e?`,
  @location(3) shadowCatcher: vec4f`:""}`}
}
@fragment
fn main(@builtin(position) coord: vec4f) -> qa {
let size = vec2u(u32(outputWidth), u32(outputHeight));
let pixel = vec2u(u32(coord.x), size.y - u32(coord.y) - 1u);
var idx = pixel.x + pixel.y * size.x;




if (sampleCount < 1.0 && normalBuffer[idx].a <= 0.0) {
let wU = max(sampleTileGrid, vec2u(1u));
let wq = min(
((pixel + wU / 2u) / wU) * wU,
((size - vec2u(1u)) / wU) * wU
);
let tW = wq.x + wq.y * size.x;
if (normalBuffer[tW].a > 0.0) {
idx = tW;
}
}
var output: qa;
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
let jo = max(hit - shadow.mask.b, 0.0);


output.foreground = vec4f(
(color.rgb - shadow.background.rgb)
/ select(total, jo, jo > 0.0),
clamp((color.a - shadow.mask.g) / total, 0.0, 1.0)
);
output.catcherBackground = shadow.background / total;
`:`output.color = vec4f(


vec3f(fK(color.r,normal.a,hit,1.0,true),
fK(color.g,normal.a,hit,1.0,true),
fK(color.b,normal.a,hit,1.0,true)),
fK(color.a,normal.a,hit,1.0,false)
);

output.normal = vec4f(0.0);

if (dot(normal.rgb, normal.rgb) > 0.1) {
output.normal = vec4f(normal.rgb / total * 0.5 + 0.5, 1.0);
}
output.albedo = vec4f(albedo.rgb / total, clamp(hit / total, 0.0, 1.0));
${e?`let shadow = shadowCatcherBuffer[idx];



output.shadowCatcher = vec4f(shadow.mask.rgb / total,
shadow.mask.r / total * select(0.0, shadow.moments.z / shadow.moments.w, shadow.moments.w > 0.0));`:""}
`}
return output;
}
`}var As=class{zeroTexture;_device;_pipeline;_layersPipeline;_foregroundTexture;_catcherBackgroundTexture;_colorTexture;_normalTexture;_albedoTexture;_shadowCatcherTexture;_uniformBindGroup;_uniformsBuffers;_width=1;_height=1;_hasCatcher=!1;_needsUpdatePipeline=!0;constructor(e,t){this.zeroTexture=t,this._device=e,this._uniformsBuffers={sampleCount:e.createBuffer({size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),sampleTileGrid:e.createBuffer({size:8,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})}}_retainedOutputs=new Set;retainOutput(e){["color","normal","albedo","shadowCatcher","foreground","catcherBackground"].some(A=>this.getOutput(A)===e)&&this._retainedOutputs.add(e)}releaseOutput(e){if(!this._retainedOutputs.delete(e))return;["color","normal","albedo","shadowCatcher","foreground","catcherBackground"].some(A=>this.getOutput(A)===e)||this._device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>e.destroy())}getOutput(e){return this[`_${e}Texture`]??this.zeroTexture}_createTextures(){let{_device:e,_width:t,_height:A}=this,a={size:{width:t,height:A,depthOrArrayLayers:1},format:"rgba8unorm",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC};this._destroyTextures(),this._colorTexture=e.createTexture({...a,label:"Ray Trace Color",format:"rgba16float",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC}),this._normalTexture=e.createTexture({...a,label:"Ray Trace Normal",usage:a.usage|GPUTextureUsage.COPY_SRC}),this._albedoTexture=e.createTexture({...a,label:"Ray Trace Albedo"}),this._hasCatcher?(this._foregroundTexture=e.createTexture({...a,label:"Ray Trace Foreground",format:"rgba16float"}),this._catcherBackgroundTexture=e.createTexture({...a,label:"Ray Trace Catcher Background",format:"rgba16float"}),this._shadowCatcherTexture=e.createTexture({...a,label:"Ray Trace Shadow Catcher",format:"rgba16float"})):this._foregroundTexture=this._catcherBackgroundTexture=this._shadowCatcherTexture=void 0}_updateBindGroups(){let e=this._device;this._uniformBindGroup=e.createBindGroup({layout:this._pipeline.getBindGroupLayout(1),entries:[{binding:0,resource:{buffer:this._uniformsBuffers.sampleCount}},{binding:1,resource:{buffer:this._uniformsBuffers.sampleTileGrid}}]})}_updatePipeline(){if(!this._needsUpdatePipeline)return;this._needsUpdatePipeline=!1;let e=this._device;this._pipeline=ft(e).createRenderPipeline({label:"rayTraceOutput",layout:"auto",vertex:{module:ft(e).createShaderModule({code:yn}),entryPoint:"main"},fragment:{module:ft(e).createShaderModule({code:mu(!1,this._hasCatcher)}),entryPoint:"main",targets:[{format:"rgba16float"},{format:"rgba8unorm"},{format:"rgba8unorm"},...this._hasCatcher?[{format:"rgba16float"}]:[]],constants:{outputWidth:this._width,outputHeight:this._height}}}),this._hasCatcher&&(this._layersPipeline=ft(e).createRenderPipeline({label:"rayTraceLayers",layout:"auto",vertex:{module:ft(e).createShaderModule({code:yn}),entryPoint:"main"},fragment:{module:ft(e).createShaderModule({code:mu(!0)}),entryPoint:"main",targets:[{format:"rgba16float"},{format:"rgba16float"}],constants:{outputWidth:this._width,outputHeight:this._height}}})),this._updateBindGroups()}setSize(e,t){(this._width!==e||this._height!==t||!this._colorTexture)&&(this._width=e,this._height=t,this._createTextures(),this._needsUpdatePipeline=!0)}setSampleCount(e){this._device.queue.writeBuffer(this._uniformsBuffers.sampleCount,0,new Float32Array([e]))}setSampleTileGrid(e,t){this._device.queue.writeBuffer(this._uniformsBuffers.sampleTileGrid,0,new Uint32Array([e,t]))}createPass(e,t,A=!1){this._hasCatcher!==A&&(this._hasCatcher=A,this._createTextures(),this._needsUpdatePipeline=!0),this._updatePipeline(),this._createOutputPass(e,t,!1),A&&this._createOutputPass(e,t,!0)}_createOutputPass(e,t,A){let a=A?this._layersPipeline:this._pipeline,r=A?[this._foregroundTexture,this._catcherBackgroundTexture]:[this._colorTexture,this._normalTexture,this._albedoTexture,...this._hasCatcher?[this._shadowCatcherTexture]:[]],n=e.beginRenderPass({colorAttachments:r.map(s=>({view:s.createView(),loadValue:{r:0,g:0,b:0,a:0},storeOp:"store",loadOp:"clear"}))});n.setPipeline(a),n.setBindGroup(0,this._device.createBindGroup({label:"rayTraceOutput",layout:a.getBindGroupLayout(0),entries:[t.color,t.normal,t.albedo,t.shadowCatcher].map((s,o)=>({binding:o,resource:{buffer:s,...o===3?{offset:t.shadowCatcherOffset??0}:{}}})).filter(s=>s.binding<3||this._hasCatcher||A)})),n.setBindGroup(1,A?this._device.createBindGroup({layout:a.getBindGroupLayout(1),entries:Object.values(this._uniformsBuffers).map((s,o)=>({binding:o,resource:{buffer:s}}))}):this._uniformBindGroup),n.draw(6,1,0,0),n.end()}_destroyTextures(){if(!this._colorTexture)return;let e=[this._colorTexture,this._normalTexture,this._albedoTexture,this._shadowCatcherTexture,this._foregroundTexture,this._catcherBackgroundTexture].filter(t=>!!t&&!this._retainedOutputs.has(t));this._device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>e.forEach(t=>t.destroy()))}getMemoryBytes(){let e=["color","normal","albedo","shadowCatcher","foreground","catcherBackground"];return Object.values(this._uniformsBuffers).reduce((t,A)=>t+A.size,0)+Array.from(new Set([...e.map(t=>this[`_${t}Texture`]),...this._retainedOutputs])).reduce((t,A)=>t+si(A),0)}dispose(){let e=Array.from(this._retainedOutputs);this._device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>e.forEach(t=>t.destroy())),this._destroyTextures(),this._retainedOutputs.clear(),Object.keys(this._uniformsBuffers).forEach(t=>{this._uniformsBuffers[t].destroy()})}};var hu=`
fn tS(a: vec4f, b: vec4f, c: vec4f) -> vec4f {
return a + b + c - min(min(a, b), c) - max(max(a, b), c);
}
`,gu=`

let d = vec3i(1, 1, 0);

var dk = load_colorTex(uv, 0);
let s1 = load_colorTex(uv - d.xz, 0);
let s2 = load_colorTex(uv + d.xz, 0);
let s3 = load_colorTex(uv - d.zy, 0);
let s4 = load_colorTex(uv + d.zy, 0);
dk = tS(tS(dk, s1, s2), s3, s4);


let lum = dot(dk.rgb, vec3f(0.2125, 0.7154, 0.0721));
var color: vec4f;
if (lum > threshold && dk.a > 0.0) {
color = vec4f(dk.rgb * scale, dk.a);
} else {

color = vec4f(vec3(0.0), dk.a);
}
output.color = color;
`,vu=`
fn xP(c: vec3f) -> f32 {
return max(max(c.r, c.g), c.b);
}
`,Bu=`
let size = vec2f(colorTexRegion());
let d = vec4f(-1.0, -1.0, 1.0, 1.0) / size.xyxy;

output.color = sample_colorTex_linearSampler(uv2 + d.xy) * 0.25
+ sample_colorTex_linearSampler(uv2 + d.zy) * 0.25
+ sample_colorTex_linearSampler(uv2 + d.xw) * 0.25
+ sample_colorTex_linearSampler(uv2 + d.zw) * 0.25;
`,Eu=`
const xT = array<f32, 9>(0.07, 0.09, 0.12, 0.14, 0.16, 0.14, 0.12, 0.09, 0.07);
`,wu=`
let xG = vec2f(colorTexRegion());
let off = direction / xG * size;

var sum = vec4f(0.0);
var uE = 0.0;
for (var i = 0; i < 9; i++) {
let w = xT[i];
sum += sample_colorTex_linearSampler(uv2 + off * f32(i - 4)) * w;
uE += w;
}
output.color = sum / max(uE, 0.01);
`,_u=`
let xQ = sample_colorTex1_linearSampler(uv2);
let xR = sample_colorTex2_linearSampler(uv2);
output.color = mix(xQ, xR, weight);
`;function xu(i){return Math.max(Math.min(i*2,1),.2)}function bu(i){return 1-Math.max(Math.min(i**.3*.8,.8),0)}function Ym(i){let t=1+i,A=t+i,a=A+i,r=a+i-1,n=[[0,r,r,0,0,0]];for(let s=0;s<i;s++){let o=s===0?0:1+s-1;n.push([1,o,o,1+s,0,0])}for(let s=i-1;s>=0;s--)n.push([2,1+s,1+s,t+s,1,0]),n.push([2,t+s,t+s,A+s,0,1]);for(let s=i-2;s>=0;s--)n.push([3,s===i-2?A+i-1:a+s+1,A+s,a+s,0,0]);return n}var yu=Ym(6);var Cu=5,al={magFilter:"linear",minFilter:"linear"};function Vm(i){return new xt("bright",i,{inputs:["colorTex"],outputs:["color"],uniforms:[{label:"threshold",type:"f32",data:1},{label:"scale",type:"f32",data:1}],fsDefine:hu,fsMain:gu})}function qm(i){return new xt("downsample",i,{inputs:["colorTex"],outputs:["color"],uniforms:[],samplers:{linearSampler:i.createSampler(al)},fsDefine:vu,fsMain:Bu})}function Mu(i){return new xt("gaussian",i,{inputs:["colorTex"],outputs:["color"],uniforms:[{label:"direction",type:"vec2f",data:[1,0]},{label:"size",type:"f32",data:1}],samplers:{linearSampler:i.createSampler(al)},fsDefine:Eu,fsMain:wu})}function Jm(i){return new xt("blend",i,{inputs:["colorTex1","colorTex2"],outputs:["color"],uniforms:[{label:"weight",type:"f32",data:.3}],samplers:{linearSampler:i.createSampler(al)},fsMain:_u})}var Al=class{_brightPass;_downsamplePasses=[];_blurHPasses=[];_blurVPasses=[];_blendPasses=[];constructor(e){this._brightPass=Vm(e);let t={color:{format:"rgba16float"}};this._brightPass.setOutputParams(t);for(let A=0;A<=Cu;A++){let a=qm(e),r=Mu(e),n=Mu(e);if(a.setOutputParams(t),r.setOutputParams(t),n.setOutputParams(t),r.setUniform("direction",[1,0]),n.setUniform("direction",[0,1]),this._downsamplePasses.push(a),this._blurHPasses.push(r),this._blurVPasses.push(n),A>0){let s=Jm(e);s.setOutputParams(t),this._blendPasses.push(s)}}}reserveCapacity(){[this._brightPass,...this._downsamplePasses,...this._blurHPasses,...this._blurVPasses,...this._blendPasses].forEach(e=>e.reserveCapacity())}setSize(e,t){this._brightPass.setSize(e,t);for(let A=0;A<=Cu;A++)this._downsamplePasses[A].setSize(e>>A+1,t>>A+1),this._blurHPasses[A].setSize(e>>A+1,t>>A+1),this._blurVPasses[A].setSize(e>>A,t>>A),A>0&&this._blendPasses[A-1].setSize(e>>A-1,t>>A-1)}setBrightThreshold(e){this._brightPass.setUniform("threshold",e)}setRadius(e){this._blendPasses.forEach(t=>{t.setUniform("weight",bu(e))}),[...this._blurHPasses,...this._blurVPasses].forEach(t=>{t.setUniform("size",xu(e))})}createPass(e,t){let A=[this._brightPass,...this._downsamplePasses,...this._blurHPasses,...this._blurVPasses,...this._blendPasses],a=r=>r===A.length?t:A[r].getOutput("color");for(let[,r,n,s]of yu)A[s].createPass(e,{colorTex:a(r),colorTex1:a(r),colorTex2:a(n)});return this._blendPasses[0].getOutput("color")}getMemoryBytes(){return[this._brightPass,...this._downsamplePasses,...this._blurHPasses,...this._blurVPasses,...this._blendPasses].reduce((e,t)=>e+t.getMemoryBytes(),0)}dispose(){this._brightPass.dispose(),[...this._downsamplePasses,...this._blurHPasses,...this._blurVPasses,...this._blendPasses].forEach(e=>e.dispose())}getOutput(){return this._blendPasses[0].getOutput("color")}},Qu=Al;function Km(i,e){return i.channels===e.channels&&i.type===e.type&&i.count===e.count&&i.atomic===e.atomic}var Iu=8,Ui=class{_label;_device;_outputBuffers={};_outputParams={};_pipeline;_bindGroups=[];_needsUpdatePipeline=!0;_inputs=[];_outputs=[];_uniforms=[];_uniformsMap={};_uniformBuffers={};_capacityWidth=0;_capacityHeight=0;_reserveCapacity=!1;_width=10;_height=10;_execWidth;_execHeight;_workGroupSize=[Iu,Iu];_csCode="";_csMain;_csDefine;_groupOffsets={inputs:0,uniforms:1,outputs:2};constructor(e,t,A){this._label=e,this._device=t,this._csMain=A.csMain,this._csDefine=A.csDefine,this._inputs=A.inputs,this._outputs=A.outputs;let a=A.uniforms||[];this._uniforms=a,this._uniformsMap=this._uniforms.reduce((r,n)=>(r[n.label]=n,r),{}),a.forEach(r=>{let n=ir(r.data,r.type);this._uniformBuffers[r.label]=t.createBuffer({label:this._label+"."+r.label,size:n.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this._device.queue.writeBuffer(this._uniformBuffers[r.label],0,n)})}setCSCode({csDefine:e,csMain:t}){this._csDefine=e,this._csMain=t,this._needsUpdatePipeline=!0}reserveCapacity(){this._reserveCapacity=!0,this._capacityWidth=this._width,this._capacityHeight=this._height}setSize(e,t){e=Math.max(1,Math.ceil(e)),t=Math.max(1,Math.ceil(t));let A=e!==this._width||t!==this._height;if(this._width=e,this._height=t,A){this._needsUpdatePipeline=!0;let a=Math.max(this._capacityWidth,e),r=Math.max(this._capacityHeight,t),n=a!==this._capacityWidth||r!==this._capacityHeight;if(this._capacityWidth=a,this._capacityHeight=r,this._reserveCapacity&&!n)return;for(let s in this._outputBuffers)this._outputBuffers[s].destroy();this._outputBuffers={}}}setExecuteSize(e,t){e=Math.max(1,Math.ceil(e)),t=Math.max(1,Math.ceil(t)),this._execWidth=e,this._execHeight=t}setOutputParams(e){this._invalidateChangedOutputBuffers(e),this._outputParams=e,this._needsUpdatePipeline=!0}setUniform(e,t){let A=this._uniformBuffers[e];this._device.queue.writeBuffer(A,0,ir(t,this._uniformsMap[e].type))}getOutput(e){let t=this._outputBuffers;return t[e]||(t[e]=this._createBuffer(e,this._outputParams[e]||{})),t[e]}getMemoryBytes(){return[...Object.values(this._uniformBuffers),...Object.values(this._outputBuffers)].reduce((e,t)=>e+t.size,0)}dispose(){Object.keys(this._uniformBuffers).forEach(e=>{this._uniformBuffers[e].destroy()}),Object.keys(this._outputBuffers).forEach(e=>{this._outputBuffers[e].destroy()})}setWorkGroupSize(e,t){this._needsUpdatePipeline=e!==this._workGroupSize[0]||t!==this._workGroupSize[1],this._workGroupSize=[e,t]}_getActualWorkgroupSize(){return[Math.min(this._workGroupSize[0],this._execWidth??this._width),Math.min(this._workGroupSize[1],this._execHeight??this._height)]}_createBuffer(e,t){let A=t.channels??4,a=(this._reserveCapacity?this._capacityWidth*this._capacityHeight:this._width*this._height)*A*(t.count??1)*4;return this._device.createBuffer({label:this._label+"."+e,size:Math.max(a,80),usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC})}_invalidateChangedOutputBuffers(e){let t=this._outputBuffers,A=this._outputParams;for(let a in t)Km(e[a]||{},A[a]||{})||(t[a].destroy(),delete t[a])}_updateOutputBuffers(e){let t=this._outputBuffers,A=this._outputParams;for(let a in A)!t[a]&&!e?.includes(a)&&(t[a]=this._createBuffer(a,A[a]))}_updatePipeline(e,t){if(!this._needsUpdatePipeline)return;this._needsUpdatePipeline=!1;let A=this._device,a=this._getFullCs(e,t);a!==this._csCode&&(this._csCode=a,this._pipeline=ft(A).createComputePipeline({label:this._label,layout:"auto",compute:{module:ft(A).createShaderModule({label:this._label,code:a}),entryPoint:"main"}}),this._updateBindGroups())}_getFullCs(e,t){let A=this._inputs,a=this._uniforms,r=0,n=this._groupOffsets={inputs:0,uniforms:0,outputs:0},s=this._getActualWorkgroupSize();A.length>0&&r++,a.length>0&&(n.uniforms=r,r++);function o(c){let{type:f="f32",channels:m}=c,d=m===1?f:`vec${m}${f[0]}`;return c.atomic&&(d=`atomic<${d}>`),d}return n.outputs=r,`
${A.sort().map((c,f)=>{let m=`@group(${n.inputs}) @binding(${f}) `,d=`in_${c}`;return t[c]==="texture"?`${m} var ${d}: texture_2d<f32>;`:`${m} var<storage, read> ${d}: array<${o(e[c])}>;`}).join(`
`)}
${this._uniforms.map((c,f)=>`@group(${n.uniforms}) @binding(${f}) var<uniform> ${c.label}: ${c.type};`).join(`
`)}

${this._outputs.map((c,f)=>`@group(${n.outputs}) @binding(${f}) var<storage, read_write> out_${c}: array<${o(this._outputParams[c]||{})}>;`).join(`
`)}
${this._csDefine??""}
@compute @workgroup_size(${s[0]}, ${s[1]}, 1)
fn main(@builtin(global_invocation_id) globalId: vec3u) {
${this._csMain}
}
`}_updateBindGroups(){let e=[],t=this._device,A=this._groupOffsets;this._uniforms.length>0&&(e[A.uniforms]=t.createBindGroup({label:this._label+".uniforms",layout:this._pipeline.getBindGroupLayout(A.uniforms),entries:this._uniforms.map((a,r)=>({binding:r,resource:{buffer:this._uniformBuffers[a.label]}}))})),this._bindGroups=e}createPass(e,t,A){this._updateOutputBuffers(Object.keys(A||{}));let a={...this._outputBuffers,...A},r=this._inputs.reduce((l,c)=>(l[c]=t[c].buffer?"buffer":"texture",l),{});this._updatePipeline(t,r);let n=this._groupOffsets;this._inputs.length>0&&(this._bindGroups[n.inputs]=this._device.createBindGroup({label:this._label+".inputs",layout:this._pipeline.getBindGroupLayout(n.inputs),entries:this._inputs.map((l,c)=>({binding:c,resource:t[l].buffer?{buffer:t[l].buffer}:t[l].texture.createView()}))})),this._bindGroups[n.outputs]=this._device.createBindGroup({label:this._label+".outputs",layout:this._pipeline.getBindGroupLayout(n.outputs),entries:this._outputs.map((l,c)=>({binding:c,resource:{buffer:a[l]}}))});let s=e.beginComputePass();s.setPipeline(this._pipeline),this._bindGroups.forEach((l,c)=>{s.setBindGroup(c,l)});let o=this._getActualWorkgroupSize();s.dispatchWorkgroups(Math.ceil((this._execWidth??this._width)/o[0]),Math.ceil((this._execHeight??this._height)/o[1]),1),s.end()}};var $m=`
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
`,rl=class{device;peakBuffer;readbackBuffer;pipeline;pending=!1;disposed=!1;lastSubmissionTime=-1/0;peakDisplayValue=0;constructor(e){this.device=e,this.peakBuffer=e.createBuffer({label:"HDR display peak",size:Uint32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST}),this.readbackBuffer=e.createBuffer({label:"HDR display peak readback",size:Uint32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),this.pipeline=e.createComputePipeline({label:"HDR display peak",layout:"auto",compute:{module:e.createShaderModule({label:"HDR display peak",code:$m}),entryPoint:"main"}})}encode(e,t,A,a,r=performance.now()){if(this.pending||r-this.lastSubmissionTime<500)return!1;this.pending=!0,this.lastSubmissionTime=r,e.clearBuffer(this.peakBuffer);let n=this.device.createBindGroup({label:"HDR display peak",layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:t.createView()},{binding:1,resource:{buffer:this.peakBuffer}}]}),s=e.beginComputePass({label:"HDR display peak"});return s.setPipeline(this.pipeline),s.setBindGroup(0,n),s.dispatchWorkgroups(Math.ceil(A/16),Math.ceil(a/16)),s.end(),e.copyBufferToBuffer(this.peakBuffer,0,this.readbackBuffer,0,Uint32Array.BYTES_PER_ELEMENT),!0}async resolve(){if(!(!this.pending||this.disposed))try{await this.readbackBuffer.mapAsync(GPUMapMode.READ);let e=this.readbackBuffer.getMappedRange(),t=new Uint32Array(e)[0],A=new ArrayBuffer(Float32Array.BYTES_PER_ELEMENT);new Uint32Array(A)[0]=t,this.peakDisplayValue=new Float32Array(A)[0],this.readbackBuffer.unmap()}catch{this.readbackBuffer.mapState==="mapped"&&this.readbackBuffer.unmap()}finally{this.pending=!1}}getPeakDisplayValue(){return this.peakDisplayValue}reset(){this.peakDisplayValue=0,this.lastSubmissionTime=-1/0}getMemoryBytes(){return this.peakBuffer.size+this.readbackBuffer.size}dispose(){this.disposed=!0,this.device.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>{this.peakBuffer.destroy(),this.readbackBuffer.destroy()})}},Su=rl;function nl(i,e,t){return i==="textures"?`@group(0) @binding(${e}) var ${t}: texture_2d<f32>;`:`@group(0) @binding(${e}) var<storage, read> ${t}: array<vec4f>;`}function na(i,e,t){return i==="textures"?`textureLoad(${e}, ${t}, 0)`:`${e}[gv(${t})]`}function Pu(i,e,t,A){let a=new ArrayBuffer(16);return new Uint32Array(a,0,2).set([i,e]),new Float32Array(a,8,2).set([.6*Math.max(t,.001),xr(A)]),a}var St=8,rs=`
struct JNLMParams {
size: vec2u,
colorSensitivity: f32,

dilation: f32,
}
@group(0) @binding(0) var<uniform> params: JNLMParams;
`,Du=`
${rs}
${lA}
@group(0) @binding(1) var<storage, read> accumulation: array<ShadowCatcherAccumulation>;
@group(0) @binding(2) var<storage, read> normalBuffer: array<vec4f>;
@group(0) @binding(3) var<storage, read_write> rawGuide: array<vec2f>;

@compute @workgroup_size(${St}, ${St}, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
let size = params.size;
if (id.x >= size.x || id.y >= size.y) { return; }
let qE = id.x + (size.y - 1u - id.y) * size.x;
let n = normalBuffer[qE].a;
let moments = accumulation[qE].moments;
let mean = moments.x / max(n, 1.0);

var variance = -1.0;
if (n >= 2.0) {
variance = max(moments.y - n * mean * mean, 0.0) / (n * (n - 1.0));
}
rawGuide[id.x + id.y * size.x] = vec2f(mean, variance);
}
`,Tu=`
${rs}
@group(0) @binding(1) var<storage, read> rawGuide: array<vec2f>;
@group(0) @binding(2) var<storage, read_write> guide: array<vec2f>;

@compute @workgroup_size(${St}, ${St}, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
let size = params.size;
if (id.x >= size.x || id.y >= size.y) { return; }
let center = rawGuide[id.x + id.y * size.x];
var mf = 0.0;
var jx = 0.0;
var nW = 0.0;
var jp = 0.0;
for (var dy = -1; dy <= 1; dy++) {
for (var dx = -1; dx <= 1; dx++) {
let q = clamp(vec2i(id.xy) + vec2i(dx, dy), vec2i(0), vec2i(size) - 1);
let value = rawGuide[u32(q.x) + u32(q.y) * size.x];
nW += value.x;
jp += value.x * value.x;
if (value.y >= 0.0) {
mf += value.y;
jx += 1.0;
}
}
}
var variance: f32;
if (center.y >= 0.0) {
variance = mf / jx;
} else {
let me = nW / 9.0;
variance = max(jp / 9.0 - me * me, 0.0) * 9.0 / 8.0;
}
guide[id.x + id.y * size.x] = vec2f(center.x, variance);
}
`;function Xm(i="textures"){return`
${rs}
@group(0) @binding(1) var colorTex: texture_2d<f32>;
@group(0) @binding(2) var<storage, read_write> outColor: array<vec4f>;
${i==="buffers"?`${lA}
@group(0) @binding(3) var<storage, read> normalAccumulation: array<vec4f>;
@group(0) @binding(4) var<storage, read_write> normal: array<vec4f>;
@group(0) @binding(5) var<storage, read> shadowAccumulation: array<ShadowCatcherAccumulation>;
@group(0) @binding(6) var<storage, read_write> shadow: array<vec4f>;
@group(0) @binding(7) var albedoTex: texture_2d<f32>;
@group(0) @binding(8) var<storage, read_write> albedo: array<vec4f>;`:""}

@compute @workgroup_size(${St}, ${St}, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
if (id.x >= params.size.x || id.y >= params.size.y) { return; }
outColor[id.x + id.y * params.size.x] = textureLoad(colorTex, vec2i(id.xy), 0);
${i==="buffers"?`  let index = id.x + id.y * params.size.x;
let qE = id.x + (params.size.y - 1u - id.y) * params.size.x;
let n = normalAccumulation[qE];
let samples = max(n.a, 1.0);
normal[index] = vec4f(n.rgb / samples * 0.5 + 0.5, select(0.0, 1.0, dot(n.rgb, n.rgb) > 0.1));
shadow[index] = shadowAccumulation[qE].mask / samples;
albedo[index] = textureLoad(albedoTex, vec2i(id.xy), 0);`:""}
}
`}var Ru=Xm();function Uu({searchRadius:i,patchRadius:e,albedoBandwidth:t,normalBandwidth:A}=Wi,a="textures"){let r=(2*e+1)**2;return`
${rs}
@group(0) @binding(1) var<storage, read> guide: array<vec2f>;
@group(0) @binding(2) var<storage, read> color: array<vec4f>;
${nl(a,3,"albedoTex")}
${nl(a,4,"normalTex")}
@group(0) @binding(5) var<storage, read_write> outColor: array<vec4f>;
@group(0) @binding(6) var<storage, read_write> outGuide: array<vec2f>;
${nl(a,7,"shadowCatcherTex")}

const SEARCH_RADIUS = ${i};
const PATCH_RADIUS = ${e};
const PATCH_SIZE = ${r};

const VARIANCE_CANCELLATION = 1.0;

const INV_ALBEDO_BANDWIDTH2 = ${(1/t**2).toFixed(6)};
const INV_COVERAGE_BANDWIDTH2 = ${(1/.1**2).toFixed(6)};
const INV_NORMAL_BANDWIDTH2 = ${(1/A**2).toFixed(6)};


const CENTER_WEIGHT_MIN = 0.01;

fn gv(p: vec2i) -> u32 {
let q = clamp(p, vec2i(0), vec2i(params.size) - 1);
return u32(q.x) + u32(q.y) * params.size.x;
}

fn mi(q: vec2i, bC: vec4f, hg: vec3f) -> f32 {
let albedo = ${na(a,"albedoTex","q")};


let qd = max((albedo.rgb + bC.rgb) * 0.5, vec3f(${.02}));
let lN = (albedo.rgb - bC.rgb) / qd;
let jk = albedo.a - bC.a;
let lX = ${na(a,"normalTex","q")}.rgb - hg;
return max(
dot(lN, lN) * INV_ALBEDO_BANDWIDTH2
+ jk * jk * INV_COVERAGE_BANDWIDTH2,
dot(lX, lX) * INV_NORMAL_BANDWIDTH2
);
}

fn premultiplied(c: vec4f) -> vec4f {
return vec4f(c.rgb * c.a, c.a);
}

@compute @workgroup_size(${St}, ${St}, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
let size = vec2i(params.size);
let p = vec2i(id.xy);
if (p.x >= size.x || p.y >= size.y) { return; }
let step = i32(params.dilation);
let bC = ${na(a,"albedoTex","p")};
let fR = ${na(a,"normalTex","p")};
let hg = fR.rgb;
let index = gv(p);


if (fR.a <= 0.0 && ${na(a,"shadowCatcherTex","p")}.r <= 0.0) {
outColor[index] = color[index];
outGuide[index] = guide[index];
return;
}

var lP: array<vec2f, PATCH_SIZE>;
var k = 0;
for (var dy = -PATCH_RADIUS; dy <= PATCH_RADIUS; dy++) {
for (var dx = -PATCH_RADIUS; dx <= PATCH_RADIUS; dx++) {
lP[k] = guide[gv(p + vec2i(dx, dy) * step)];
k++;
}
}
let k2 = params.colorSensitivity * params.colorSensitivity;

var sum = vec4f(0.0);
let hk = max(bC.rgb, vec3f(${.02}));
var ng = vec3f(0.0);
var gN = vec3f(0.0);
var hG = vec3f(0.0);
var qp = 0.0;
var gP = 0.0;
var oP = 0.0;
var lt = 0.0;
for (var sy = -SEARCH_RADIUS; sy <= SEARCH_RADIUS; sy++) {
for (var sx = -SEARCH_RADIUS; sx <= SEARCH_RADIUS; sx++) {
let q = p + vec2i(sx, sy) * step;
if (
(sx == 0 && sy == 0) ||
q.x < 0 || q.y < 0 || q.x >= size.x || q.y >= size.y
) { continue; }

let features = mi(q, bC, hg);
if (features > 16.0) { continue; }

var gk = 0.0;
k = 0;
for (var dy = -PATCH_RADIUS; dy <= PATCH_RADIUS; dy++) {
for (var dx = -PATCH_RADIUS; dx <= PATCH_RADIUS; dx++) {
let a = lP[k];
let b = guide[gv(q + vec2i(dx, dy) * step)];
let rZ = a.x - b.x;
gk += (rZ * rZ
- VARIANCE_CANCELLATION * (a.y + min(a.y, b.y)))
/ (1e-10 + k2 * (a.y + b.y));
k++;
}
}
gk /= f32(PATCH_SIZE);

let weight = exp(-max(max(gk, 0.0), features));
let index = gv(q);
let c = color[index];
let g = guide[index];

let a = (${na(a,"albedoTex","q")}.rgb - bC.rgb) / hk;
let value = premultiplied(c);
sum += value * weight;
ng += a * weight;
gN += a * a * weight;
hG += a * value.rgb * weight;
qp += g.x * weight;
gP += g.y * weight * weight;
oP += weight;
lt = max(lt, weight);
}
}



let center = color[index];
let lO = guide[index];
let dR = max(lt, CENTER_WEIGHT_MIN);
let totalWeight = oP + dR;
let vj = premultiplied(center);
let mean = (sum + vj * dR) / totalWeight;


let eI = ng / totalWeight;
let mj = max(gN / totalWeight - eI * eI, vec3f(0.0));
let rv = hG / totalWeight - eI * mean.rgb;



let rI = bC.rgb + eI * hk;
let po = mean.rgb * hk / max(rI, vec3f(${.02}));
let xg = clamp(rv / (mj + vec3f(${1e-4})), vec3f(0.0), po);
let sD = mean.rgb - xg * eI;
let filtered = vec4f(max(sD, vec3f(0.0)), max(mean.a, 0.0));
let rgb = select(
center.rgb,
filtered.rgb / max(filtered.a, 1e-6),
filtered.a > 1e-6
);
outColor[index] = vec4f(rgb, filtered.a);
outGuide[index] = vec2f(
(qp + lO.x * dR) / totalWeight,
(gP + lO.y * dR * dR)
/ (totalWeight * totalWeight)
);
}
`}var sy=`
struct OutputParams { size: vec2u, premultiply: u32, reserved: u32 }
@group(0) @binding(0) var<uniform> params: OutputParams;
@group(0) @binding(1) var<storage, read> color: array<vec4f>;
@group(0) @binding(2) var output: texture_storage_2d<rgba8unorm, write>;
${er}
@compute @workgroup_size(${St}, ${St}, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
if (any(id.xy >= params.size)) { return; }
let c = color[id.y * params.size.x + id.x];
var rgb = linearToSrgb(c.rgb);
if (params.premultiply != 0u) { rgb *= c.a; }
textureStore(output, id.xy, vec4f(rgb, c.a));
}
`;var Lu=4,ns=class{_device;_paramsBuffers=[];_guidePipeline;_variancePipeline;_loadColorPipeline;_filterPipeline;_filterShapeKey="";_guides=[];_colors=[];_width=0;_height=0;constructor(e){this._device=e;for(let t=0;t<=Lu;t++)this._paramsBuffers.push(e.createBuffer({label:"JNLM params",size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}));this._guidePipeline=this._createPipeline("JNLM guide",Du),this._variancePipeline=this._createPipeline("JNLM variance",Tu),this._loadColorPipeline=this._createPipeline("JNLM load color",Ru)}_createPipeline(e,t){return ft(this._device).createComputePipeline({label:e,layout:"auto",compute:{module:ft(this._device).createShaderModule({label:e,code:t}),entryPoint:"main"}})}_getFilterPipeline(e){let t=JSON.stringify(e);return(!this._filterPipeline||t!==this._filterShapeKey)&&(this._filterPipeline=this._createPipeline("JNLM filter",Uu(e)),this._filterShapeKey=t),this._filterPipeline}reserveCapacity(){}_ensureBuffers(e,t){if(e<=this._width&&t<=this._height&&this._colors.length)return;e=Math.max(e,this._width),t=Math.max(t,this._height),this._destroyBuffers();let A=e*t,a=(r,n)=>this._device.createBuffer({label:r,size:A*n,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC});this._guides=[a("JNLM guide A",8),a("JNLM guide B",8)],this._colors=[a("JNLM color A",16),a("JNLM color B",16)],this._width=e,this._height=t}_destroyBuffers(){for(let e of[...this._guides,...this._colors])e.destroy();this._guides=[],this._colors=[]}encode(e,t){let{width:A,height:a,shape:r}=t;this._ensureBuffers(A,a);let n=Math.min(Math.max(Math.round(r.iterations),1),Lu);this._paramsBuffers.forEach((y,M)=>{let b=Pu(A,a,t.strength,Math.max(M-1,0));this._device.queue.writeBuffer(y,0,b)});let s=this._device,o=this._getFilterPipeline(r),l=(y,M,b)=>s.createBindGroup({layout:y.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:M}},...b.map((T,O)=>({binding:O+1,resource:T}))]}),[c,f]=this._guides,[m,d]=this._colors,u=this._paramsBuffers[0],p=[[this._guidePipeline,l(this._guidePipeline,u,[{buffer:t.accumulation},{buffer:t.normalAccumulation},{buffer:f}])],[this._variancePipeline,l(this._variancePipeline,u,[{buffer:f},{buffer:c}])],[this._loadColorPipeline,l(this._loadColorPipeline,u,[t.color.createView(),{buffer:m}])]],g=t.albedo.createView(),v=t.normal.createView(),h=t.shadowCatcher.createView(),B=[c,f],E=[m,d];for(let y=1;y<=n;y++)p.push([o,l(o,this._paramsBuffers[y],[{buffer:B[0]},{buffer:E[0]},g,v,{buffer:E[1]},{buffer:B[1]},h])]),B=[B[1],B[0]],E=[E[1],E[0]];let x=e.beginComputePass({label:"JNLM denoise"});for(let[y,M]of p)x.setPipeline(y),x.setBindGroup(0,M),x.dispatchWorkgroups(Math.ceil(A/St),Math.ceil(a/St));return x.end(),E[0]}getMemoryBytes(){return[...this._paramsBuffers,...this._guides,...this._colors].reduce((e,t)=>e+t.size,0)}dispose(){for(let e of this._paramsBuffers)e.destroy();this._destroyBuffers()}};var Zm=`
if (globalId.x >= u32(imageSize.x) || globalId.y >= u32(imageSize.y)) { return; }
let index = globalId.x + globalId.y * u32(imageSize.x);
let raw = textureLoad(in_albedo, vec2u(globalId.xy), 0);
let encoded = sT(raw.rgb);
out_albedo[index] = vec4f(encoded, raw.a);
`,eh=`
if (globalId.x >= u32(imageSize.x) || globalId.y >= u32(imageSize.y)) { return; }
let index = globalId.x + globalId.y * u32(imageSize.x);
let filtered = in_albedo[index];
let linear = sS(filtered.rgb);
var result = linear;
let jD = textureLoad(in_rawAlbedo, vec2i(globalId.xy), 0).a;
if (preserveSurfaceTexture != 0u) {



let pixel = vec2i(globalId.xy);
let center = textureLoad(in_rawNormal, pixel, 0);
let n = normalize(center.rgb * 2.0 - 1.0 + vec3f(1e-8));
var oc = 0.0;
for (var y = -1; y <= 1; y++) {
for (var x = -1; x <= 1; x++) {
let vw = textureLoad(in_rawNormal,
clamp(pixel + vec2i(x, y), vec2i(0), imageSize - 1), 0);
let nn = normalize(vw.rgb * 2.0 - 1.0 + vec3f(1e-8));
oc = max(oc,
max(1.0 - dot(n, nn), abs(center.a - vw.a)));
}
}
let vO = smoothstep(0.02, 0.1, oc);
let raw = clamp(textureLoad(in_rawAlbedo, pixel, 0).rgb,
vec3f(0.0), vec3f(1.0));
result = mix(raw, linear, vO);
}
out_albedo[index] = vec4f(result, jD);
`,th=`
if (globalId.x >= u32(imageSize.x) || globalId.y >= u32(imageSize.y)) { return; }
let index = globalId.x + globalId.y * u32(imageSize.x);
out_normal[index] = vec4f(rL(in_normal[index].rgb), 1.0);
`;function ih(i){try{let e=i.createQuerySet({type:"timestamp",count:2}),t=i.createBuffer({size:e.count*8,usage:GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC}),A=i.createBuffer({size:t.size,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});return{querySet:e,resolveBuffer:t,resultBuffer:A}}catch(e){console.error(e);return}}function Ah(i,e,t,A,a,r,n){let s=()=>{},o=!1,l=1/0,c=!1,f=!1,m=0,d=!1,u=0,p=new vn(e),g,v=0,h=32,B,E=0,x,y,M=Promise.resolve(),b=!0,T=!1,O=!0,R=!1,D=0,L=0,se=0,q=0,re={},w,N=0,H=!1,ee=[0,0,0,0],te=[0,0,0,0],Y,ne=!1,Le=new Bn(e),fe=!1,_e=21,Me=0,Qe=0,de=1,xe=.6,We=1,Oe=0,Ze=1,Mt=1,pe=0,zt=0,$e=0,me=!1,Fe=!1,Ye="final",dt=qr,Pe=S.create(),Re=1,ue=performance.now(),Vt=0,Ne,Bt,rt=!1,ye=!1,I,W,V=0,Be=!1,ve;function Ue(){I?.abort(),I=void 0,V++;let _=ve;if(ve=void 0,_)try{_.abort()}finally{_.finish()}}function ke(_,P){return _!==V?Promise.resolve():new Promise((U,F)=>{let k=!1,G,ae=()=>{k||(k=!0,ve===G&&(ve=void 0),U())},he=De=>{k||(k=!0,ve===G&&(ve=void 0),F(De))};try{let De=P(ae,he);if(G={abort:De,finish:ae},k)return;if(_!==V){De(),ae();return}ve=G}catch(De){ve===G&&(ve=void 0),k=!0,F(De)}})}let zi=A.context,ua=e.features.has("timestamp-query")?a.get("trace timing",()=>{let _=ih(e);return{query:_,getMemoryBytes:()=>_?_.resolveBuffer.size+_.resultBuffer.size:0,dispose(){_?.querySet.destroy(),_?.resolveBuffer.destroy(),_?.resultBuffer.destroy()}}}).query:void 0,Et=is(),et=ua?pu():void 0;Et.setDesiredMsPerTile(_e),et?.setDesiredMsPerTile(_e);function BA(){E++,et?.needsUpdatePredicting(),x=void 0,O=m===0,R=!1}let ld=a.get("empty texture",()=>{let _=e.createTexture({label:"Shared empty image",size:{width:1,height:1},format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING});return{texture:_,getMemoryBytes:()=>4,dispose:()=>_.destroy()}}).texture,qt=new As(e,ld),qe=_=>qt.getOutput(_),Jt,hr=a.get("rawOutputPass",()=>new xt("raw output",e,{textureWillBeRead:!0,inputs:["colorTex","coverageTex"],outputs:["color"],uniforms:[{label:"flatBackgroundColor",type:"vec4f",data:[0,0,0,0]}],fsDefine:mn,fsMain:`
var color = load_colorTex(uv, 0);
let coverage = clamp(load_coverageTex(uv, 0).a, 0.0, 1.0);
color = vec4f(
jQ(color.r, coverage, flatBackgroundColor.a > 0.5, true),
jQ(color.g, coverage, flatBackgroundColor.a > 0.5, true),
jQ(color.b, coverage, flatBackgroundColor.a > 0.5, true), color.a);
output.color = color;
`})),Kt=a.get("readbackPass",()=>new xt("output readback",e,{textureWillBeRead:!0,inputs:["inputTex"],outputs:["color"],fsMain:"output.color = load_inputTex(uv, 0);"}));Kt.setOutputParams({color:{format:"rgba32float"}});let Bs,Ee=a.get("composePass",()=>new xt("compose",e,{textureWillBeRead:!0,fsMain:Kc+$c,fsDefine:Jc,uniforms:[{label:"exposure",type:"f32",data:We},{label:"toneMappingParams",type:"vec2f",data:[Oe,$e]},{label:"hdrOutputEnabled",type:"f32",data:0},{label:"colorGradingParams",type:"vec4f",data:[Ze,Mt,pe,zt]},{label:"flatBackgroundColor",type:"vec4f",data:[0,0,0,0]},{label:"shadowCatcherColor",type:"vec3f",data:Pe},{label:"shadowCatcherAlpha",type:"f32",data:Re},{label:"shadowCatcherEnabled",type:"f32",data:0},{label:"bloomIntensity",type:"f32",data:.25}],outputs:["color","denoiseColor","denoiseAlbedo"],inputs:["colorTex","foregroundTex","catcherBackgroundTex","flatBackgroundMaskTex","shadowCatcherTex","bloomTex"]})),ki="rgba8unorm";Ee.setOutputParams({color:{format:ki},denoiseColor:{format:"rgba32float"},denoiseAlbedo:{format:"rgba8unorm"}});let kt=a.get("compositeDenoiseDisplayPass",()=>new xt("OIDN composed display",e,{textureWillBeRead:!0,fsMain:Xc,fsDefine:er,uniforms:[{label:"denoisedAlpha",type:"f32",data:0}],outputs:["color"],inputs:["colorTex","composedTex"]}));kt.setOutputParams({color:{format:"rgba8unorm"}});let da=[{label:"imageSize",type:"vec2i",data:new Int32Array([1,1])}],gr=a.get("oidnAlbedoEncodePass",()=>new Ui("OIDN albedo sRGB encode",e,{inputs:["albedo"],outputs:["albedo"],uniforms:da,csDefine:hn,csMain:Zm})),pa=a.get("oidnAlbedoDecodePass",()=>new Ui("OIDN albedo sRGB decode",e,{inputs:["albedo","rawAlbedo","rawNormal"],outputs:["albedo"],uniforms:[...da,{label:"preserveSurfaceTexture",type:"u32",data:0}],csDefine:hn,csMain:eh})),vr=a.get("oidnNormalSanitizePass",()=>new Ui("OIDN normal sanitize",e,{inputs:["normal"],outputs:["normal"],uniforms:da,csDefine:hn,csMain:th}));gr.setOutputParams({albedo:{channels:4}}),pa.setOutputParams({albedo:{channels:4}}),vr.setOutputParams({normal:{channels:4}});let ma=a.get("outputPass",()=>new xt("output",e,{fsMain:`
let xs = min(
vec2i(uv2 * vec2f(colorTexRegion())),
vec2i(colorTexRegion()) - vec2i(1)
);
var color = load_colorTex(xs, 0);
color = vec4(color.rgb * color.a, color.a);
output.color = color;
`,outputs:["color"],inputs:["colorTex"]}));ma.setOutputParams({color:{format:"rgba8unorm"}});function cd(_,P){ma.setRenderToScreen(zi.getCurrentTexture(),A.format),ma.createPass(_,{colorTex:P})}function fd(_,P){let U=v+u,F=hA(U,2)-.5,k=hA(U,3)-.5;t.setJitter(F/_,k/P)}function bl(_,P){let U=e.createCommandEncoder();t.setSampleCount(v+u),t.setSampleSequenceOffset(u),fd(D,L);let F=ua,k=F?.resultBuffer.mapState==="unmapped";t.createPass(U,_,P,F?{querySet:F.querySet}:void 0),F&&(U.resolveQuerySet(F.querySet,0,F.querySet.count,F.resolveBuffer,0),k&&U.copyBufferToBuffer(F.resolveBuffer,0,F.resultBuffer,0,F.resultBuffer.size)),e.queue.submit([U.finish()]);let G=et,ae=E;if(F&&k&&G){let he=P[0]*P[1];M=F.resultBuffer.mapAsync(GPUMapMode.READ).then(()=>{let De=F.resultBuffer.getMappedRange(),Ie=new BigInt64Array(De,0,2),ze=Math.max(Number(Ie[1]-Ie[0])/1e6,.1);!T&&ae===E&&!b&&(x={tileTimeMs:ze,tileTimePerSampleMs:ze,estimatedFullFrameTimeMs:ze*he,tileCount:he},G.setLastTraceTime(ze)),F.resultBuffer.unmap()}).catch(()=>{F.resultBuffer.mapState==="mapped"&&F.resultBuffer.unmap()})}}function Es(){fe=!1}function ws(){rt&&(Ue(),fe=!1)}function ud(_,P,U){if(!P)return;let F=a.get("denoised conversion",()=>new _n(e));return U=F.get(D,L),F.setRegion(D,L),_.copyBufferToTexture({buffer:P,bytesPerRow:16*D},{texture:U},{width:D,height:L,depthOrArrayLayers:1}),U}function EA(_,P,U){let F=P.width*P.height*16;return(!U||U.size!==F)&&(U?.destroy(),U=e.createBuffer({label:"Persistent denoised output",size:F,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC})),_.copyBufferToBuffer(P.data,0,U,0,F),U}function dd(){Ee.setSize(D,L),Ee.setOutputParams({color:{format:ki},denoiseColor:{format:"rgba32float"},denoiseAlbedo:{format:"rgba8unorm"}}),Ee.setUniform("exposure",We),Ee.setUniform("toneMappingParams",[Oe,$e]),Ee.setUniform("colorGradingParams",[Ze,Mt,pe,zt]),Ee.setUniform("hdrOutputEnabled",+Fe),Ee.setUniform("shadowCatcherColor",Pe),Ee.setUniform("shadowCatcherAlpha",Re),kt.setSize(D,L),kt.setOutputParams({color:{format:ki}}),kt.setUniform("denoisedAlpha",fe&&rt?+t.needsDenoiseAlpha():0)}function yl(_,P,U,F=!1){let k=a.get(P,()=>new JA(e)).get(D*L*16,F);return _.copyTextureToBuffer({texture:U},{buffer:k,bytesPerRow:D*16},{width:D,height:L}),k}function wA(_,P,U=!1){let F=a.get(_,()=>new Ui(`${_} copy`,e,{inputs:["guide"],outputs:["color"],uniforms:da,csMain:"if (globalId.x >= u32(imageSize.x) || globalId.y >= u32(imageSize.y)) {return;} out_color[globalId.x + globalId.y * u32(imageSize.x)] = textureLoad(in_guide, vec2i(globalId.xy), 0);"}));F.setOutputParams({color:{channels:4}}),F.setSize(D,L),F.setUniform("imageSize",[D,L]);let k=U?a.get(`${_} buffer`,()=>new JA(e)).get(D*L*16,!0):void 0,G=e.createCommandEncoder();return F.createPass(G,{guide:{texture:P,channels:4}},k?{color:k}:void 0),e.queue.submit([G.finish()]),k??F.getOutput("color")}function li(_,P,U=!1){Le.reset(),U&&(N=v,H=t.hasShadowCatcher(),te=ee.slice()),Ee.setUniform("flatBackgroundColor",te),hr.setUniform("flatBackgroundColor",te);let F=vt(Ye);if(F&&v===0){if(!w?.aovs?.includes(F))throw new Error(`AOV ${F} is not enabled`);if(!p.samples)return;Cl(_,p.visualize(F,dt,Fe));return}if(N<1)return;dd(),fe&&(Bt=ud(_,Ne,Bt)),U&&(qt.setSampleCount(v),qt.createPass(_,t.getOutputBuffer(),H)),Ee.setUniform("shadowCatcherEnabled",+H);let k=qe(H?"foreground":"color"),G=fe&&ye&&Bt?Bt:qe("color"),ae=qe("catcherBackground");if(fe&&ye&&Bt&&H){let Ce=a.get("custom HDR layers",()=>new xt("Custom HDR layers",e,{textureWillBeRead:!0,inputs:["originalTex","filteredTex","foregroundTex","backgroundTex"],outputs:["foreground","background"],fsMain:tf}));Ce.setOutputParams({foreground:{format:"rgba32float"},background:{format:"rgba32float"}}),Ce.setSize(D,L),y?.push("CorrectLayers:SceneLinear"),Ce.createPass(_,{originalTex:qe("color"),filteredTex:Bt,foregroundTex:k,backgroundTex:ae}),k=Ce.getOutput("foreground"),ae=Ce.getOutput("background")}let he=Me>0,De=a.get("bloom state",()=>({owner:void 0,settings:"",dispose(){}})),Ie=`${de}/${xe}/${+(fe&&ye)}`,ze=he&&v>=10&&(v-Qe>=10||De.owner!==re||De.settings!==Ie),nt=Me;ze?(Jt||(Jt=a.get("bloom",()=>new Qu(e)),Jt.setSize(D,L)),Jt.setSize(D,L),De.owner=re,De.settings=Ie,Qe=v,Jt.setBrightThreshold(de),Jt.setRadius(xe),y?.push("Bloom:SceneLinear"),Jt.createPass(_,G)):he&&v<10&&(nt=0),Ee.setUniform("bloomIntensity",nt),y?.push("Compose:DisplayLinear+DisplayEncoded"),Ee.createPass(_,{colorTex:G,foregroundTex:k,catcherBackgroundTex:ae,flatBackgroundMaskTex:qe("albedo"),shadowCatcherTex:qe("shadowCatcher"),bloomTex:he&&Jt?Jt.getOutput():G}),fe&&!ye&&rt&&Bt&&(y?.push("Encode:DisplayEncoded"),kt.createPass(_,{colorTex:Bt,composedTex:Ee.getOutput("denoiseColor")}));let $t=(fe&&Ne?ye?Ee.getOutput("color"):rt?kt.getOutput("color"):Bt:void 0)||Ee.getOutput("color");if(F){if(!w?.aovs?.includes(F))throw new Error(`AOV ${F} is not enabled`);$t=p.visualize(F,dt,Fe)}Cl(_,$t)}function Cl(_,P){let U=Fe?Bs??=a.get("hdrPeak",()=>new Su(e)):void 0,F=U?.encode(_,P,D,L)??!1;if(Ye==="normal"||Ye==="albedo"?(y?.push("AOV:Raw"),P=qe(Ye)):Ye==="shadowCatcher"&&(y?.push("AOV:Raw"),P=qe("shadowCatcher")),(P.width<D||P.height<L)&&(Kt.setSize(D,L),Kt.createPass(_,{inputTex:P}),P=Kt.getOutput("color")),!(Be&&Ye==="final"&&!fe&&ne)){let G=D,ae=L;if(!Y||Y.width!==G||Y.height!==ae||Y.format!==P.format){let he=Y;Y=e.createTexture({label:"Render complete image",size:{width:G,height:ae},format:P.format,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.COPY_SRC}),he&&e.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>he.destroy())}_.copyTextureToTexture({texture:P},{texture:Y},{width:G,height:ae}),ne=Ye==="final"&&fe}let k=_.finish();e.queue.submit([k]),F&&U?.resolve()}function _s(){f&&(f=!1,li(e.createCommandEncoder(),!1,!0))}function pd(_,P){if(Ue(),t.isCompilingShader())return b=!0,v=0,!0;t.setCamera(_),g=_;let U=b;if(U&&p.reset(),U&&(f=!1,Qe=0,fe=!1,E++,B=void 0,t.setCamera(_),(et||Et).reset(),b=!1,v=0),t.updatePipeline(),t.isCompilingShader()||!t.isPipelineReady())return b=!0,v=0,!0;if(w?.aovs?.length&&!t.prepareAovs(w.aovs))return!0;(!Be||b)&&Es(),R&&((et||Et).reset(),R=!1),m===0&&U&&et&&O&&ua?.resultBuffer.mapState==="unmapped"&&((et||Et).reset(),R=!0,et.needsUpdatePredicting(),O=!1);let F=v,k=x?.estimatedFullFrameTimeMs,G=m===0&&o,ae=Math.min(_e,l);if(G&&!U&&!R&&k!==void 0&&n.available(ae)<Math.min(k,ae))return!1;let he=G&&v>0&&!U&&!R&&x?.tileCount===1&&k!==void 0&&k<=ae/2,De=he?Math.min(64,Math.floor(n.available(ae)/k)):1;if(he&&De===0)return!1;let Ie=performance.now();Bd(!U);let ze=P,nt=Math.min(ze,v+(m>0?m:De));do{let{xIndex:$t,yIndex:Ce,columns:st,rows:Xe,isFirstTile:yt,isLastTile:Qt,samplesPerFrame:Gt}=(et||Et).nextTile(B);if(qt.setSampleTileGrid(st,Xe),(m>0||he)&&st*Xe===1?Gt=nt-v:o||(Gt=1),st*Xe===1){t.setSampleTiles(1,1,0,0);let ci=0;for(;ci<Gt&&v<ze&&v<nt&&(bl(v===0,[1,1]),v++,ci++,G&&!R&&k!==void 0&&n.track(k),!(he&&performance.now()-Ie>=4)););}else t.setSampleTiles(st,Xe,$t,Ce),bl(v===0&&yt,[st,Xe]),G&&!R&&k!==void 0&&n.track(k/(st*Xe)),Qt&&v++}while(m>0&&v<nt&&v<ze);if(R)return v=0,!1;if(v!==F&&w?.aovs?.length&&t.renderAovs(p,_,v,w.aovSamples??16,w.aovs),v!==F&&G&&c&&v<ze)f=!0;else if(v!==F&&(!d||v>=ze)){f=!1;let $t=e.createCommandEncoder();li($t,v>=ze,!0)}return v!==F&&s(v,F===0,h),!1}function Ml(_,P){return Math.ceil(_/P)*P}function md(){if(!se||!q)return;t.useTarget(re);let _=1,P=Ml(Math.max(1,Math.round(se*_)),16),U=Ml(Math.max(1,Math.round(q*_)),16);if(P===D&&U===L){t.setSize(P,U,se/q);return}Ue(),Es(),E++,D=P,L=U,(et||Et).setSize(D,L),t.setSize(D,L,se/q),qt.setSize(D,L),Ee.setSize(D,L),kt.setSize(D,L),Jt?.setSize(D,L),N=0,v=0,N=0,b=!0}function Ql(_,P){_===se&&P===q||(se=_,q=P,BA(),md(),ma.setSize(se,q),b=!0)}function hd(_){let P=Array.isArray(_)&&_[3]>=.99999?_:void 0;ee=P?[P[0],P[1],P[2],1]:[0,0,0,0]}function gd(_){let P=_.exposure??1,U={agx:0,aces:1,cineon:2,reinhard:3,linear:4}[_.toneMapping??"agx"]??0,F=_.contrast??1,k=_.saturation??1,G=_.temperature??0,ae=_.tint??0,he=_.vignette??0;return P===We&&U===Oe&&F===Ze&&k===Mt&&G===pe&&ae===zt&&he===$e?!1:(ws(),We=P,Oe=U,Ze=F,Mt=k,pe=G,zt=ae,$e=he,Ee.setUniform("exposure",We),Ee.setUniform("toneMappingParams",[Oe,$e]),Ee.setUniform("colorGradingParams",[Ze,Mt,pe,zt]),!0)}function vd(_){if(_===me)return!1;ws(),me=_;let P=Fe;Fe=_&&A.supportsHDR;let U=Fe?"rgba16float":"rgba8unorm";return U!==ki&&(ki=U,Ee.setOutputParams({color:{format:ki},denoiseColor:{format:"rgba32float"},denoiseAlbedo:{format:"rgba8unorm"}})),P!==Fe&&Bs?.reset(),kt.setOutputParams({color:{format:ki}}),Ee.setUniform("hdrOutputEnabled",Fe?1:0),P!==Fe}function Bd(_){let P=performance.now(),U=E,F=Et;(typeof requestAnimationFrame=="function"?requestAnimationFrame:G=>setTimeout(()=>G(performance.now()),0))(()=>{h=Math.max(performance.now()-P-Vt,Vt>0?16:8),Vt=0,U===E&&F===Et&&!b&&(B=_?h:void 0)})}function Il(){typeof document<"u"&&document.hidden?ue=performance.now():Vt=performance.now()-ue}function Ed(_){let P=V;W??=a.get("jnlm",()=>new ns(e));let U=t.getOutputBuffer(),F=e.createCommandEncoder({label:"JNLM denoise"});y?.push("Denoise:DisplayLinear");let k=W.encode(F,{width:D,height:L,accumulation:U.shadowCatcher,normalAccumulation:U.normal,color:Ee.getOutput("denoiseColor"),albedo:qe("albedo"),normal:qe("normal"),shadowCatcher:qe("shadowCatcher"),strength:_.strength,shape:_.shape});return Ne=EA(F,{data:k,width:D,height:L},Ne),rt=!0,fe=!0,kt.setUniform("denoisedAlpha",+t.needsDenoiseAlpha()),li(F,!1),e.queue.onSubmittedWorkDone().then(()=>P===V)}function wd(_,P,U,F=[]){let k=V,G=I=new AbortController,ae=()=>G.abort();U?.addEventListener("abort",ae,{once:!0}),U?.aborted&&ae();let he=(async()=>{if(G.signal.aborted)return!1;let De=wA("Custom HDR input",qe("color"),!0),Ie=D,ze=L,nt=wA("Custom albedo",qe("albedo"),!0),$t=wA("Custom normal",qe("normal"),!0),Ce=a.get("Custom output",()=>new JA(e)).get(Ie*ze*16,!0),st=F.length?p.snapshot(F):void 0;y?.push("Denoise:SceneLinear");try{await _.denoise({device:e,width:Ie,height:ze,color:De,albedo:nt,normal:$t,output:Ce,aovs:st},{signal:G.signal,schedule:P})}finally{st&&e.queue.onSubmittedWorkDone().catch(()=>{}).then(()=>p.releaseSnapshot(st))}if(G.signal.aborted||T||k!==V)return!1;let Xe=a.get("custom coverage",()=>new Ui("Custom coverage",e,{inputs:["filtered","original"],outputs:["color"],uniforms:da,csMain:Af}));Xe.setOutputParams({color:{channels:4}}),Xe.setSize(Ie,ze),Xe.setUniform("imageSize",[Ie,ze]);let yt=e.createCommandEncoder({label:"Custom HDR result"});return Xe.createPass(yt,{filtered:{buffer:Ce,channels:4},original:{buffer:De,channels:4}}),Ne=EA(yt,{data:Xe.getOutput("color"),width:Ie,height:ze},Ne),ye=!0,rt=!1,fe=!0,li(yt,!1),await e.queue.onSubmittedWorkDone(),!G.signal.aborted&&!T&&k===V})();return r.add(he),he.finally(()=>{r.delete(he),U?.removeEventListener("abort",ae),I===G&&(I=void 0)}).catch(()=>{}),he}function _d(_,P,U="converged",F){if(Ue(),b||v<1)return Promise.resolve(!1);if(Ye!=="final"&&Ye!=="shadow")return Promise.resolve(!0);if(_s(),_.kind==="custom")return wd(_.denoiser,U,F,_.aovs);if(ye=!1,_.kind==="jnlm")return Ed(_.denoiser);let k=_.denoiser;kt.setUniform("denoisedAlpha",0);let G=V,ae={width:D,height:L},he=e.createCommandEncoder(),De=yl(he,"OIDN color input",Ee.getOutput("denoiseColor"));e.queue.submit([he.finish()]);for(let Ce of[gr,pa,vr])Ce.setSize(D,L),Ce.setUniform("imageSize",[D,L]);let Ie={...U!=="converged"?{tileOverlap:80,wholeImage:U==="every-sample"}:{},scheduling:U==="every-sample"?"event-loop":"animation-frame"};async function ze(){let Ce=k.auxiliaryDenoisers;if(!Ce)return{albedo:{data:wA("OIDN raw albedo",Ee.getOutput("denoiseAlbedo")),...ae},normal:{data:wA("OIDN raw normal",qe("normal")),...ae}};if(G!==V)return;let st=e.createCommandEncoder();gr.createPass(st,{albedo:{texture:Ee.getOutput("denoiseAlbedo"),channels:4}}),e.queue.submit([st.finish()]);let Xe;if(await ke(G,(ci,Gi)=>Ce.albedo.tileExecute({...Ie,color:{data:gr.getOutput("albedo"),...ae},done(Mi){Xe=Mi,ci()},error:Gi})),G!==V||!Xe)return;let yt=e.createCommandEncoder();pa.setUniform("preserveSurfaceTexture",0),pa.createPass(yt,{albedo:{buffer:Xe.data,channels:4},rawAlbedo:{texture:Ee.getOutput("denoiseAlbedo"),channels:4},rawNormal:{texture:qe("normal"),channels:4}}),e.queue.submit([yt.finish()]);let Qt;if(await ke(G,(ci,Gi)=>Ce.normal.tileExecute({...Ie,color:{data:wA("OIDN raw normal",qe("normal")),...ae},done(Mi){Qt=Mi,ci()},error:Gi})),G!==V||!Qt)return;let Gt=e.createCommandEncoder();return vr.createPass(Gt,{normal:{buffer:Qt.data,channels:4}}),e.queue.submit([Gt.finish()]),{albedo:{data:pa.getOutput("albedo"),...ae},normal:{data:vr.getOutput("normal"),...ae}}}function nt(Ce){return G!==V?Promise.resolve():(y?.push("Denoise:DisplayLinear"),ke(G,(st,Xe)=>k.tileExecute({...Ie,color:{data:De,...ae},albedo:Ce.albedo,normal:Ce.normal,progress(yt,Qt,Gt,ci,Gi){if(G!==V||U!=="converged"&&ci+1<Gi)return;let Mi=e.createCommandEncoder();Ne=EA(Mi,yt,Ne),rt=!0,fe=!0,li(Mi,!1)},done(yt){if(G===V){let Qt=e.createCommandEncoder();Ne=EA(Qt,yt,Ne),rt=!0,fe=!0,li(Qt,!1)}st()},error:Xe})))}function $t(){if(!P||G!==V)return Promise.resolve();let Ce=e.createCommandEncoder();Kt.setSize(D,L),Kt.createPass(Ce,{inputTex:rt?kt.getOutput("color"):Ee.getOutput("color")});let st=yl(Ce,"OIDN alpha input",Kt.getOutput("color"));return e.queue.submit([Ce.finish()]),ke(G,(Xe,yt)=>P.tileExecute({...Ie,color:{data:st,...ae},denoiseAlpha:!0,progress(Qt,Gt,ci,Gi,Mi){if(G!==V||U!=="converged"&&Gi+1<Mi)return;let Sl=e.createCommandEncoder();Ne=EA(Sl,Qt,Ne),rt=!1,fe=!0,li(Sl,!1)},done(Qt){if(G===V){let Gt=e.createCommandEncoder();Ne=EA(Gt,Qt,Ne),rt=!1,fe=!0,li(Gt,!1)}Xe()},error:yt}))}return ze().then(async Ce=>{Ce&&G===V&&await nt(Ce)}).then(()=>{if(G===V&&t.needsDenoiseAlpha())return $t()}).then(()=>G===V)}typeof document<"u"&&document.addEventListener("visibilitychange",Il);function xd(){T||(typeof document<"u"&&document.removeEventListener("visibilitychange",Il),T=!0,E++,Ue(),Promise.all([e.queue.onSubmittedWorkDone().catch(()=>{}),M]).then(()=>{t.releaseTarget(re),p.dispose(),Ne?.destroy(),Y?.destroy(),Le.dispose(),qt.dispose()}))}function bd(){t.useTarget(re),D&&L&&t.setSize(D,L,se/q),w&&(t.setQuality(w),t.setClamping(w.clamping),t.setTransmissiveOutputAlphaMin(w.transmissiveOutputAlphaMin),t.setBevelSamples(w.bevelSamples),t.setAlphaBlendStrategy(w.alphaBlendStrategy),t.setSamplingPattern(w.samplingPattern,w.maxSamples))}return{invalidateTiming:BA,invalidateDenoisedOutput(){Ue(),fe=!1,Be=!1},configure(_){if((!w||["bounces","bevel","bevelSamples","directLightCandidates","dispersionWavelengths","alphaBlendStrategy","samplingPattern","clamping","transmissiveOutputAlphaMin"].some(G=>w[G]!==_[G]))&&BA(),_.aovs?.length&&(!Number.isInteger(_.aovSamples??16)||(_.aovSamples??16)<1))throw new RangeError("aovSamples must be a positive integer");let U=je(w?.aovs??[]),F=je(_.aovs??[]);(U!==F||w?.aovSamples!==_.aovSamples)&&(p.samples=0),w={..._,aovs:[..._.aovs??[]]};let k=vt(Ye);k&&!_.aovs?.includes(k)&&(Ye="final"),U&&!F&&(p.dispose(),p.history.clear(),p.width=p.height=0,p.reset()),_e=Math.max(1,_.timeBudgetMs),o=_.batchSamples,Et.setDesiredMsPerTile(_e),Et.setMaxTiles(_.maxTiles),et?.setDesiredMsPerTile(_e),et?.setMaxTiles(_.maxTiles)},synchronizeBackground:hd,activate:bd,canCompleteSampleWithin(_){return(x?.estimatedFullFrameTimeMs??h)<=_},setRealtimeBatchBudget(_){l=_},setRealtimeDeferPostProcess(_){c=_},getRealtimeSampleTime(){return x?.tileCount===1?x.estimatedFullFrameTimeMs:void 0},whenTraceAvailable(){return n.whenAvailable()},get presentationComplete(){return!!Y},get presentationDenoised(){return ne},present(){if(!Y)return;A.configure(Fe);let _=e.createCommandEncoder();ma.setSize(i.width,i.height),cd(_,Le.output??Y),e.queue.submit([_.finish()])},getMemory(){return{width:D,height:L,bytes:p.bytes+t.getTargetMemoryBytes(re)+qt.getMemoryBytes()+si(Y)+Le.getMemoryBytes()+(Ne?.size??0)}},isFirstFrame(){return b},restartSamples(){p.reset(),E++,Ue(),Be=!1,fe=!1,ne=!1,N=0,f=!1,Qe=0,(et||Et).reset(),R=!1,b=!0,v=0},getOutputTexture(_){return _s(),_==="hdr"?N>0?qe("color"):void 0:Le.output??Y},applyPostProcesses(_,P){Y&&Le.run(Y,_,P)},trace:pd,drawPostProcess(){let _=f;f=!1,li(e.createCommandEncoder(),!0,_)},performDenoise:_d,cancelDenoise:Ue,setSize:Ql,setHDROutputEnabled:vd,setToneMappingParams:gd,async readPresentation(){if(!Y)throw new Error("Render has no complete image.");let _=Le.output??Y,P=_.width,U=_.height,F=Math.ceil(P*16/256)*256,k=e.createBuffer({size:F*U,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),G=e.createCommandEncoder(),ae=Fe&&vt(Ye)?a.get("AOV encoded readback",()=>new xt("AOV encoded readback",e,{textureWillBeRead:!0,inputs:["inputTex"],outputs:["color"],fsMain:"let c=load_inputTex(uv,0);let rgb=select(1.055*pow(max(c.rgb,vec3f(0.0)),vec3f(1.0/2.4))-0.055,12.92*c.rgb,c.rgb<=vec3f(0.0031308));output.color=vec4f(rgb,c.a);"})):Kt;ae.setOutputParams({color:{format:"rgba32float"}}),ae.setSize(P,U),ae.createPass(G,{inputTex:_}),G.copyTextureToBuffer({texture:ae.getOutput("color")},{buffer:k,bytesPerRow:F},{width:P,height:U}),e.queue.submit([G.finish()]);try{await k.mapAsync(GPUMapMode.READ);let he=new Float32Array(k.getMappedRange()),De=new Float32Array(P*U*4);for(let Ie=0;Ie<U;Ie++)De.set(he.subarray(Ie*F/4,Ie*F/4+P*4),Ie*P*4);return{width:P,height:U,data:De}}finally{k.unmap(),k.destroy()}},aovReady(_){return!!w?.aovs?.includes(_)&&p.samples>0},getAovSamples(){return p.samples},restartAovs(){p.reset()},refineAovs(_,P=v){return P<1||!w?.aovs?.length?!0:(t.setCamera(_),g=_,t.updatePipeline(),t.isCompilingShader()||!t.isPipelineReady()?!1:t.renderAovs(p,_,P,w.aovSamples??16,w.aovs))},async readAov(_){if(!w?.aovs?.includes(_)||!g||v<1&&p.samples<1)throw new Error("AOV output is not ready");for(t.setCamera(g);!t.renderAovs(p,g,Math.max(v,p.samples),w.aovSamples??16,w.aovs);){if(T)throw new Error("AOV compilation was interrupted");await new Promise(P=>ni(()=>P()))}return p.read(_)},async readOutput(_){_s(),hr.setUniform("flatBackgroundColor",te);let P=D,U=L,F=Math.ceil(P*16/256)*256,k=e.createBuffer({size:F*U,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),G=e.createCommandEncoder(),ae=_==="denoised"&&fe?Ne:void 0;_==="denoised"&&!ae&&(_="hdr");let he=_==="hdr"?hr:Kt;he.setOutputParams({color:{format:"rgba32float"}}),he.setSize(P,U),ae?G.copyBufferToBuffer(ae,0,k,0,P*U*16):_==="hdr"?hr.createPass(G,{colorTex:qe("color"),coverageTex:qe("albedo")}):Kt.createPass(G,{inputTex:qe(_)}),ae||G.copyTextureToBuffer({texture:he.getOutput("color")},{buffer:k,bytesPerRow:F},{width:P,height:U,depthOrArrayLayers:1}),e.queue.submit([G.finish()]);try{await k.mapAsync(GPUMapMode.READ);let De=new Float32Array(k.getMappedRange()),Ie=new Float32Array(P*U*4),ze=ae?P*4:F/4;for(let nt=0;nt<U;nt++)Ie.set(De.subarray(nt*ze,nt*ze+P*4),nt*P*4);return{data:Ie,width:P,height:U}}finally{k.unmap(),k.destroy()}},setPreserveDenoisedOutput(_){Be=_},setOfflineRenderOptions(_){let P=m>0;m=Math.max(0,Math.round(_.samplesPerBatch)),d=_.deferPostProcess,u=Math.max(0,Math.round(_.sampleSequenceOffset)),m>0&&R&&((et||Et).reset(),R=!1),m>0?O=!1:P&&BA()},setVarianceMoments(_){t.setVarianceMoments(_)},setAdaptiveSamplingTargets(_){t.setAdaptiveSamplingTargets(_)},prepareOfflineAdaptiveSampling(_){return t.prepareOfflineAdaptiveSampling(_)},getTotalSamplesRendered(){return v},_displayParity(){return{record(_){y=_},load(_){Ue(),Es(),Ql(_.width,_.height),t.useTarget(re),t.setSize(D,L,se/q);let P=t.getOutputBuffer(),U=new Float32Array(_.width*_.height*12);for(let k=0;k<_.width*_.height;k++)U.set(_.shadow.subarray(k*8,k*8+8),k*12),U.set(_.moments.subarray(k*4,k*4+4),k*12+8);for(let[k,G]of[[P.color,_.color],[P.albedo,_.albedo],[P.normal,_.normal],[P.shadowCatcher,U]])e.queue.writeBuffer(k,0,G);v=N=_.samples,H=_.catcher,b=!1,f=!1,Qe=0,qt.setSampleCount(v),qt.setSampleTileGrid(1,1);let F=e.createCommandEncoder();qt.createPass(F,P,H),e.queue.submit([F.finish()])}}},getDiagnostics(){return{...t.getDiagnostics(),hdrPresentation:{requested:me,active:A.hdr,peakDisplayValue:A.hdr?Bs?.getPeakDisplayValue():void 0},gpuTraceTiming:x}},async flushDiagnostics(){await e.queue.onSubmittedWorkDone(),await M},setBloomParams({intensity:_,threshold:P,radius:U}){let F=P!==de||_!==Me||U!==xe;return F&&ws(),de=P,Me=_,xe=U,F},setShadowCatcherParams(_,P){let U=_[0]!==Pe[0]||_[1]!==Pe[1]||_[2]!==Pe[2]||P!==Re;return U&&(S.copy(Pe,_),Re=P,Ee.setUniform("shadowCatcherColor",_),Ee.setUniform("shadowCatcherAlpha",P)),U},setOnSampleRendered(_){s=_},setAovDisplayOptions(_){dt={..._,depthRange:[..._.depthRange]}},setOutput(_){return Ye===_?!1:(Ye=_,!0)},dispose:xd}}function Fu(i,e,t={}){let A=new uu(e,t.materialTextures),a=new xn(e.queue),r=new Set,n=new $A(o=>{Promise.resolve().then(()=>Promise.allSettled([...r])).then(()=>e.queue.onSubmittedWorkDone()).catch(()=>{}).then(o)}),s=n.get("canvas",()=>new En(i,e,t.presentationFormat??navigator.gpu.getPreferredCanvasFormat()));return bn(A,()=>Ah(i,e,A,s,n,r,a),!1,n)}var Nu=new we({name:"AOV display",outputs:["color"],uniforms:{geometry:C.uniform("sampler2D"),position:C.uniform("sampler2D"),diffuse:C.uniform("sampler2D"),specular:C.uniform("sampler2D"),identity:C.uniform("usampler2D"),motion:C.uniform("sampler2D"),kind:C.uniform("int"),samples:C.uniform("float"),mapping:C.uniform("vec4"),idComponent:C.uniform("int")},main:`
uint vn(uint v) {
v = (v ^ (v >> 16u)) * 0x7feb352du;
v = (v ^ (v >> 15u)) * 0x846ca68bu;
return v ^ (v >> 16u);
}
vec3 srgb(vec3 rgb) {
return mix(1.055 * pow(max(rgb, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
12.92 * rgb, lessThanEqual(rgb, vec3(0.0031308)));
}
void main() {
ivec2 p = ivec2(gl_FragCoord.xy);
vec4 point = texelFetch(position, p, 0), g = texelFetch(geometry, p, 0);
float inv = 1.0 / max(point.w, 1.0), alpha = point.w / max(samples, 1.0);
vec3 color = vec3(0.0);
if (kind == 0) {
color = vec3(clamp((g.x * inv - mapping.x) / (mapping.y - mapping.x), 0.0, 1.0));
} else if (kind == 1) {
color = clamp(point.xyz * inv / mapping.z * .5 + .5, 0.0, 1.0);
} else if (kind == 2) {
color = clamp(g.yzw * inv, 0.0, 1.0);
} else if (kind == 3 || kind == 4) {
vec4 r = kind == 3 ? texelFetch(diffuse, p, 0) : texelFetch(specular, p, 0);
alpha = r.w / max(samples, 1.0);
color = srgb(clamp(r.xyz / max(r.w, 1.0), 0.0, 1.0));
} else if (kind == 5) {
uvec4 ids = texelFetch(identity, p, 0);
alpha = ids.x == 0xffffffffu ? 0.0 : 1.0;
uint h = vn(ids[idComponent]);
color = .2 + .8 * vec3(float(h & 255u), float((h >> 8u) & 255u),
float((h >> 16u) & 255u)) / 255.0;
} else {
vec4 m = texelFetch(motion, p, 0);
alpha = m.w == 3.0 ? 1.0 : 0.0;
float gR = length(m.xy), hue = 0.0;
if (gR > 0.0) hue = fract(atan(m.y, m.x) / 6.28318530718 + 1.0);
vec3 v = abs(fract(vec3(hue) + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
color = clamp(v - 1.0, 0.0, 1.0) * clamp(gR / mapping.w, 0.0, 1.0);
}
if (alpha <= 0.0) color = vec3(0.0);
out_color = vec4(color, clamp(alpha, 0.0, 1.0));
}`});var Te=class{_renderer;_bindings;_sourceShader;_outputs;_frameBuffer=new bi;_outputTextures={};_targetOutputs=new Map;useTarget(e){let t=this._targetOutputs.get(e);t||this._targetOutputs.set(e,t={}),this._outputTextures=t}_outputParams={};_reserveCapacity=!1;_capacityWidth=1;_capacityHeight=1;_width=1;_height=1;_renderToScreen=!1;constructor(e,t,A){this._renderer=t,this._sourceShader=A.shader,this._bindings=new Sa(this._samplingShader(A.shader)),this._outputs=A.outputs||A.shader.outputs,this.setOutputParams(Object.fromEntries(this._outputs.map(a=>[a,A.outputParams?.[a]||{}])))}reserveCapacity(){this._reserveCapacity||(this._reserveCapacity=!0,this._bindings=new Sa(this._samplingShader(this._sourceShader,!0,this._bindings.uniforms,this._bindings.defines)))}_samplingShader(e,t=!1,A=e.uniforms,a=e.defines){let r=Object.keys(e.uniforms).filter(s=>e.uniforms[s].type==="sampler2D");if(A={...A},t)for(let s of r)A[`${s}RegionSize`]={type:"ivec2",value:[1,1]};let n=new we({name:e.name,outputs:e.outputs,outputTypes:e.outputTypes,defines:a,uniforms:A,includes:[{defines:{},uniforms:{},main:"",functions:[()=>nf(r,t),...e.functions]}],main:e.main});return n.parallelCompile=e.parallelCompile,n}setSize(e,t){this._width===e&&this._height===t||(this._width=Math.max(1,e),this._height=Math.max(1,t),this._capacityWidth=Math.max(this._capacityWidth,this._width),this._capacityHeight=Math.max(this._capacityHeight,this._height),this.setUniform("viewportSize",[this._width,this._height]))}setOutputs(e){for(let t of this._outputs)e.includes(t)||(this._outputTextures[t]?.dispose(this._renderer.gl),delete this._outputTextures[t]);this._outputs.splice(0,this._outputs.length,...e)}setOutputParams(e){this._outputParams=e}setRenderToScreen(e=!0){this._renderToScreen=e}setUniform(e,t){return this._bindings.set(e,t)}setUniforms(e){this._bindings.setUniforms(e)}getUniform(e){return this._bindings.get(e)}setDefines(e){let t=!1;for(let[A,a]of Object.entries(e)){let r=this._bindings.defines[A];a?r!==a&&(this._bindings.setDefine(A,a),t=!0):A in this._bindings.defines&&(this._bindings.deleteDefine(A),t=!0)}return t}_retainedOutputs=new Set;retainOutput(e){Object.values(this._outputTextures).includes(e)&&this._retainedOutputs.add(e)}releaseOutput(e){this._retainedOutputs.delete(e)&&(Object.values(this._outputTextures).includes(e)||e.dispose(this._renderer.gl))}loadDiagnosticOutputs(e){for(let t of Object.keys(e))this._outputTextures[t]?.dispose(this._renderer.gl),this._outputTextures[t]=e[t]}getOutput(e){return this._outputTextures[e]}_prepareOutputs(e){let t=this._renderer.gl;for(let A of this._outputs){let a=e?.[A],r=this._outputTextures[A],n=r&&this._retainedOutputs.has(r)&&(r.width!==this._width||r.height!==this._height),s=a||(n?new ce(this._outputParams[A]):void 0)||this._outputTextures[A]||new ce(this._outputParams[A]);s.ensureStorage(t,this._reserveCapacity?this._capacityWidth:this._width,this._reserveCapacity?this._capacityHeight:this._height,this._outputParams[A]),this._outputTextures[A]=s,KA(s,this._width,this._height)}}isProgramReady(e){return e&&this._bindings.setUniforms(e),this._renderer.isProgramCompiled(this._bindings.getProgram(this._renderer))}createPass(e,t,A={}){let a=this._renderer,r=a.gl;this._renderToScreen?r.bindFramebuffer(r.FRAMEBUFFER,null):(this._prepareOutputs(t),this._frameBuffer.bind(a,this._outputs.map(s=>this._outputTextures[s])));let n=A.viewport||{x:0,y:0,width:this._width,height:this._height};if(a.setViewport(n.x,n.y,n.width,n.height),A.clear&&(r.disable(r.SCISSOR_TEST),r.clearColor(0,0,0,0),r.clear(r.COLOR_BUFFER_BIT)),A.scissor?(r.enable(r.SCISSOR_TEST),r.scissor(A.scissor.x,A.scissor.y,A.scissor.width,A.scissor.height)):r.disable(r.SCISSOR_TEST),this._reserveCapacity)for(let[s,o]of Object.entries(e)){let l=wn(o);this.setUniform(`${s}RegionSize`,[l.width,l.height])}return this._bindings.setUniforms(e),this._bindings.bind(a)?(r.disable(r.DEPTH_TEST),A.blend?(r.enable(r.BLEND),r.blendEquation(r.FUNC_ADD),r.blendFunc(r.ONE,r.ONE)):r.disable(r.BLEND),r.drawArrays(r.TRIANGLES,0,3),r.disable(r.SCISSOR_TEST),!0):(r.disable(r.SCISSOR_TEST),!1)}releaseTarget(e){let t=this._targetOutputs.get(e);if(t){this._targetOutputs.delete(e);for(let A of Object.values(t))A.dispose(this._renderer.gl);t===this._outputTextures&&(this._outputTextures={})}}getMemoryBytes(e){let t=e?this._targetOutputs.get(e)??{}:this._outputTextures;return Array.from(new Set([...Object.values(t),...this._retainedOutputs])).reduce((A,a)=>A+a.getMemoryBytes(),0)}dispose(){let e=this._renderer.gl;Array.from(new Set([this._outputTextures,...this._targetOutputs.values()])).flatMap(t=>Object.values(t)).forEach(t=>t.dispose(e)),this._retainedOutputs.forEach(t=>t.dispose(e)),this._retainedOutputs.clear(),this._frameBuffer.dispose(this._renderer)}};async function zu(i,e,t,A){let a=i.createBuffer();if(!a)throw new Error("Unable to allocate depth readback buffer.");let r=null,n=new Float32Array(e*t*4),s=i.getParameter(i.PIXEL_PACK_BUFFER_BINDING);try{if(i.bindBuffer(i.PIXEL_PACK_BUFFER,a),i.bufferData(i.PIXEL_PACK_BUFFER,n.byteLength,i.STREAM_READ),i.readPixels(0,0,e,t,i.RGBA,i.FLOAT,0),i.bindBuffer(i.PIXEL_PACK_BUFFER,s),r=i.fenceSync(i.SYNC_GPU_COMMANDS_COMPLETE,0),!r)throw new Error("Unable to create depth readback fence.");i.flush();let o=performance.now();return await new Promise((l,c)=>{let f,m=p=>{clearTimeout(f),A.removeEventListener("abort",d),p?c(p):l()},d=()=>m(new Error("Depth query cancelled.")),u=()=>{if(A.aborted){d();return}let p=i.clientWaitSync(r,0,0);p===i.WAIT_FAILED||i.isContextLost()?m(new Error("Depth readback failed.")):p===i.ALREADY_SIGNALED||p===i.CONDITION_SATISFIED?m():performance.now()-o>5e3?m(new Error("Depth readback timed out.")):f=setTimeout(u,16)};A.addEventListener("abort",d,{once:!0}),f=setTimeout(u,0)}),i.bindBuffer(i.PIXEL_PACK_BUFFER,a),i.getBufferSubData(i.PIXEL_PACK_BUFFER,0,n),n}finally{i.bindBuffer(i.PIXEL_PACK_BUFFER,s),r&&i.deleteSync(r),i.deleteBuffer(a)}}function sa(i,e,t,A){let a=A?new Uint8Array(e*t*4):new Float32Array(e*t*4);i.readPixels(0,0,e,t,i.RGBA,A?i.UNSIGNED_BYTE:i.FLOAT,a);let r=new Float32Array(a.length);for(let n=0;n<t;n++)for(let s=0;s<e*4;s++)r[n*e*4+s]=a[(t-n-1)*e*4+s]/(A?255:1);return r}var ah=["geometry","position","diffuse","specular"],ss=class{renderer;displayPass;history=new CA;width=0;height=0;samples=0;centerReady=!1;frame;accumulation=[];previousCenter;center;scene=new ce({type:5125,minFilter:9728,magFilter:9728});constructor(e){this.renderer=e}reset(){if(this.centerReady){let e=this.previousCenter;this.previousCenter=this.center,this.center=e}this.samples=0,this.centerReady=!1,this.frame=void 0}resize(e,t){if(e===this.width&&t===this.height)return;this.dispose(),this.history.clear(),this.reset(),this.width=e,this.height=t;let A={width:e,height:t,type:5126,minFilter:9728,magFilter:9728};for(let a=0;a<2;a++)this.accumulation.push(Object.fromEntries(ah.map(r=>[r,new ce(A)])));this.previousCenter={id:new ce({...A,type:5125}),motion:new ce(A)},this.center={id:new ce({...A,type:5125}),motion:new ce(A)}}setScene(e){let t=Math.min(1024,Math.max(1,Math.ceil(e.length/4))),A=Math.ceil(e.length/(t*4)),a=new Uint32Array(t*A*4);a.set(e),this.scene.source={data:a,width:t,height:A}}visualize(e,t){if(!this.samples||!this.center)throw new Error("AOV output is not ready");La(t),this.displayPass??=new Te("AOV display",this.renderer,{shader:Nu,outputs:["color"]});let A=this.displayPass;return A.setSize(this.width,this.height),A.setUniforms({kind:Xt.indexOf(e),samples:this.samples,mapping:[...t.depthRange,t.positionScale,t.motionScale],idComponent:Jr.indexOf(t.idComponent)}),A.createPass({...this.accumulation[(this.samples-1)%2],identity:this.center.id,motion:this.center.motion}),A.getOutput("color")}async read(e){let t=this.renderer.gl,A=new bi,a=this.width,r=this.height;try{let n=this.accumulation[(this.samples-1)%2],s=e==="depth"||e==="roughness"?"geometry":e==="diffuseAlbedo"?"diffuse":e==="specularAlbedo"?"specular":"position";if(A.bind(this.renderer,[e==="id"?this.center.id:e==="motion"?this.center.motion:n[s]]),e==="id"){let c=new Uint32Array(a*r*4),f=new Uint32Array(c.length);t.readPixels(0,0,a,r,t.RGBA_INTEGER,t.UNSIGNED_INT,c);for(let m=0;m<r;m++)f.set(c.subarray((r-1-m)*a*4,(r-m)*a*4),m*a*4);return{width:a,height:r,data:f}}let o=sa(t,a,r,!1);if(e==="motion"){for(let c=2;c<o.length;c+=4)o[c]=0;return{width:a,height:r,data:o}}A.bind(this.renderer,[n.position]);let l=sa(t,a,r,!1);for(let c=0;c<a*r;c++){let f=c*4,m=l[f+3],d=m>0?1/m:0,u=m/Math.max(1,this.samples);if(e==="depth")o.set([o[f]*d,0,0,u],f);else if(e==="roughness")o.set([o[f+1]*d,o[f+2]*d,o[f+3]*d,u],f);else if(e==="position")o.set([o[f]*d,o[f+1]*d,o[f+2]*d,u],f);else{let p=o[f+3],g=p>0?1/p:0;o.set([o[f]*g,o[f+1]*g,o[f+2]*g,p/Math.max(1,this.samples)],f)}}return{width:a,height:r,data:o}}finally{A.dispose(this.renderer)}}get bytes(){return this.width*this.height*(192+(this.displayPass?4:0))+this.scene.width*this.scene.height*16}dispose(){this.displayPass?.dispose(),this.displayPass=void 0;let e=this.renderer.gl;for(let t of this.accumulation)for(let A of Object.values(t))A.dispose(e);this.accumulation.length=0,this.center?.id.dispose(e),this.center?.motion.dispose(e),this.center=void 0,this.previousCenter?.id.dispose(e),this.previousCenter?.motion.dispose(e),this.previousCenter=void 0,this.scene.dispose(e)}};var os=class{renderer;readFrameBuffer=new bi;drawFrameBuffer=new bi;constructor(e){this.renderer=e}copy(e,t,A,a){a??=new ce({type:e.storageType});let r=this.renderer.gl;a.ensureStorage(r,t,A,{type:e.storageType}),this.readFrameBuffer.bind(this.renderer,[e],r.READ_FRAMEBUFFER),this.drawFrameBuffer.bind(this.renderer,[a],r.DRAW_FRAMEBUFFER),(e.width<t||e.height<A)&&(r.disable(r.SCISSOR_TEST),r.clearColor(0,0,0,0),r.clear(r.COLOR_BUFFER_BIT));let n=Math.min(t,e.width),s=Math.min(A,e.height);return r.blitFramebuffer(0,0,n,s,0,0,n,s,r.COLOR_BUFFER_BIT,r.NEAREST),a}dispose(){this.readFrameBuffer.dispose(this.renderer),this.drawFrameBuffer.dispose(this.renderer)}};var ls=K`
const int OPENPBR_LOBE_FUZZ = 0;
const int OPENPBR_LOBE_COAT = 1;
const int OPENPBR_LOBE_METAL = 2;
const int OPENPBR_LOBE_SPECULAR = 3;
const int OPENPBR_LOBE_TRANSMISSION = 4;
const int OPENPBR_LOBE_DIFFUSE = 5;
const int OPENPBR_LOBE_SUBSURFACE = 6;
const int OPENPBR_LOBE_COUNT = 7;

struct bq {
vec3 tangent;
vec3 bitangent;
vec3 normal;
};

struct ag {
OpenPbrResolvedMaterial material;
bq basis;
bq coatBasis;
bool directionFrames;
#ifdef USE_COAT_NORMAL_FRAMES
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

float aE(vec3 color) {
return dot(color, vec3(0.212671, 0.715160, 0.072169));
}

float dd(float bE) {
float value = (bE - 1.0) / (bE + 1.0);
return value * value;
}

float bi(
float bE,
float specularWeight
) {
float uh = min(
dd(bE) * specularWeight,
0.9999
);
float uj = sqrt(uh);
float lR = (1.0 + uj) / (1.0 - uj);
return bE < 1.0 ? 1.0 / lR : lR;
}

float af(float ci, float relativeIor) {
if (abs(relativeIor - 1.0) < 1e-6) {
return 0.0;
}
return cC(ci, relativeIor);
}

float aG(float ior) {
if (ior < 1.0) {
return 15.0 - ((1.0 / ior - 1.0) / 1.5) * 15.0;
}
return 16.0 + ((ior - 1.0) / 1.5) * 15.0;
}

float F(int tB, int row) {
return texelFetch(openPbrEnergyLut, ivec2(tB, row), 0).r;
}

float gt(
float dU,
float bV,
float im
) {
float bH = clamp(dU, 0.0, 31.0);
float aL = clamp(bV, 0.0, 31.0);
float bD = clamp(im, 0.0, 31.0);
int ef = int(floor(bH));
int aT = int(floor(aL));
int cQ = int(floor(bD));
int hU = min(ef + 1, 31);
int cu = min(aT + 1, 31);
int fb = min(cQ + 1, 31);
float cv = bH - float(ef);
float cI = aL - float(aT);
float lj = bD - float(cQ);

float wb = F(cQ, ef * 32 + aT);
float wc = F(fb, ef * 32 + aT);
float wd = F(cQ, ef * 32 + cu);
float wf = F(fb, ef * 32 + cu);
float wg = F(cQ, hU * 32 + aT);
float wh = F(fb, hU * 32 + aT);
float wi = F(cQ, hU * 32 + cu);
float wj = F(fb, hU * 32 + cu);
float v00 = mix(wb, wg, cv);
float v01 = mix(wc, wh, cv);
float v10 = mix(wd, wi, cv);
float v11 = mix(wf, wj, cv);
return mix(
mix(v00, v10, cI),
mix(v01, v11, cI),
lj
);
}

float gS(float dU, float bV) {
float bH = clamp(dU, 0.0, 31.0);
float aL = clamp(bV, 0.0, 31.0);
int ef = int(floor(bH));
int aT = int(floor(aL));
int hU = min(ef + 1, 31);
int cu = min(aT + 1, 31);
float cv = bH - float(ef);
float cI = aL - float(aT);
float v00 = F(aT, 1024 + ef);
float v01 = F(cu, 1024 + ef);
float v10 = F(aT, 1024 + hU);
float v11 = F(cu, 1024 + hU);
return mix(
mix(v00, v10, cv),
mix(v01, v11, cv),
cI
);
}



float ev(
float dU,
float bV,
float im
) {
float bH = clamp(dU, 0.0, 31.0);
float aL = clamp(bV, 0.0, 31.0);
float bD = clamp(im, 0.0, 31.0);
int ef = int(floor(bH));
int aT = int(floor(aL));
int cQ = int(floor(bD));
int hU = min(ef + 1, 31);
int cu = min(aT + 1, 31);
int fb = min(cQ + 1, 31);
float cv = bH - float(ef);
float cI = aL - float(aT);
float lj = bD - float(cQ);

float wb = F(cQ, ${1089} + ef * 32 + aT);
float wc = F(fb, ${1089} + ef * 32 + aT);
float wd = F(cQ, ${1089} + ef * 32 + cu);
float wf = F(fb, ${1089} + ef * 32 + cu);
float wg = F(cQ, ${1089} + hU * 32 + aT);
float wh = F(fb, ${1089} + hU * 32 + aT);
float wi = F(cQ, ${1089} + hU * 32 + cu);
float wj = F(fb, ${1089} + hU * 32 + cu);
float v00 = mix(wb, wg, cv);
float v01 = mix(wc, wh, cv);
float v10 = mix(wd, wi, cv);
float v11 = mix(wf, wj, cv);
return mix(
mix(v00, v10, cI),
mix(v01, v11, cI),
lj
);
}

float eu(float dU, float bV) {
float bH = clamp(dU, 0.0, 31.0);
float aL = clamp(bV, 0.0, 31.0);
int ef = int(floor(bH));
int aT = int(floor(aL));
int hU = min(ef + 1, 31);
int cu = min(aT + 1, 31);
float cv = bH - float(ef);
float cI = aL - float(aT);
float v00 = F(aT, ${2113} + ef);
float v01 = F(cu, ${2113} + ef);
float v10 = F(aT, ${2113} + hU);
float v11 = F(cu, ${2113} + hU);
return mix(
mix(v00, v10, cv),
mix(v01, v11, cv),
cI
);
}

float eR(float dU, float bV) {
float bH = clamp(dU, 0.0, 31.0);
float aL = clamp(bV, 0.0, 31.0);
int ef = int(floor(bH));
int aT = int(floor(aL));
int hU = min(ef + 1, 31);
int cu = min(aT + 1, 31);
float cv = bH - float(ef);
float cI = aL - float(aT);
float v00 = F(aT, ${2145} + ef);
float v01 = F(cu, ${2145} + ef);
float v10 = F(aT, ${2145} + hU);
float v11 = F(cu, ${2145} + hU);
return mix(
mix(v00, v10, cv),
mix(v01, v11, cv),
cI
);
}

float bb(float ior, float alpha, float cosine) {
return ev(aG(ior), sqrt(alpha) * 31.0, cosine * 31.0);
}
float bf(float ior, float alpha) {
return eu(aG(ior), sqrt(alpha) * 31.0);
}
float ck(float ior, float alpha) {
return eR(aG(ior), sqrt(alpha) * 31.0);
}


float aV(float alpha, float cosine) {
float iF = clamp(sqrt(alpha) * 31.0, 0.0, 31.0);
float bD = clamp(cosine * 31.0, 0.0, 31.0);
int r0 = int(floor(iF));
int c0 = int(floor(bD));
int r1 = min(r0 + 1, 31);
int c1 = min(c0 + 1, 31);
return mix(
mix(F(c0, ${1056} + r0), F(c1, ${1056} + r0), fract(bD)),
mix(F(c0, ${1056} + r1), F(c1, ${1056} + r1), fract(bD)),
fract(iF));
}

float cD(float alpha) {
float index = clamp(sqrt(alpha) * 31.0, 0.0, 31.0);
int i0 = int(floor(index));
return mix(F(i0, ${1088}),
F(min(i0 + 1, 31), ${1088}), fract(index));
}

float bd(float value, float ior) {
if (ior > 2.5 || ior < 0.4) {
float vu = dd(2.5);
float progress = (dd(ior) - vu) / (1.0 - vu);
return (1.0 - progress) * value;
}
return value;
}

float aw(
float ior,
float alpha,
float cosine
) {
float value = gt(
aG(ior),
sqrt(alpha) * 31.0,
cosine * 31.0
);
return bd(value, ior);
}

float cA(float ior, float alpha) {
float value = gS(
aG(ior),
sqrt(alpha) * 31.0
);
return bd(value, ior);
}

vec3 openpbr_to_world(bq basis, vec3 direction) {
return direction.x * basis.tangent
+ direction.y * basis.bitangent
+ direction.z * basis.normal;
}

vec3 openpbr_to_local(bq basis, vec3 direction) {
return vec3(
dot(direction, basis.tangent),
dot(direction, basis.bitangent),
dot(direction, basis.normal)
);
}

bq fD(
vec3 aX,
vec3 normal,
float anisotropy
) {
bq basis;
basis.normal = normal;
basis.tangent = vec3(0.0);
#ifdef USE_TANGENT
basis.tangent = aX;
#endif
if (dot(basis.tangent, basis.tangent) < 0.001 || anisotropy <= 0.0) {
aP(normal, basis.tangent, basis.bitangent);
}
else {
basis.bitangent = normalize(cross(normal, basis.tangent));
basis.tangent = normalize(cross(basis.bitangent, normal));
}
return basis;
}

float kF(
float aB,
float am,
float J,
float ae
) {
return (aB * J - am * ae)
/ (aB * J + am * ae);
}

float kE(
float aB,
float am,
float J,
float ae
) {
return (am * J - aB * ae)
/ (aB * ae + am * J);
}

float ht(
float aB,
float am,
float J,
float ae
) {
return 2.0 * aB * J
/ (aB * J + am * ae);
}

float hs(
float aB,
float am,
float J,
float ae
) {
return 2.0 * aB * J
/ (aB * ae + am * J);
}

vec2 aY(vec2 a, vec2 b) {
return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

vec2 bj(vec2 a, vec2 b) {
float aq = max(dot(b, b), 1e-9);
return vec2(
(a.x * b.x + a.y * b.y) / aq,
(a.y * b.x - a.x * b.y) / aq
);
}

vec2 iA(vec2 value) {
float gR = length(value);
float uf = sqrt(max(0.0, 0.5 * (gR + value.x)));
float fw = sqrt(max(0.0, 0.5 * (gR - value.x)));
return vec2(uf, value.y >= 0.0 ? fw : -fw);
}

vec2 ce(
float J,
float aB,
vec2 am,
bool rM
) {
float pg = sqrt(max(0.0, 1.0 - J * J));
vec2 tP = bj(vec2(aB, 0.0), am);
vec2 hQ = tP * pg;
vec2 ae = iA(
vec2(1.0, 0.0) - aY(hQ, hQ)
);
if (aY(am, ae).y < 0.0) {
ae = -ae;
}

vec2 fZ = vec2(aB * J, 0.0);
vec2 eJ = aY(am, ae);
if (rM) {
vec2 cl = am * J;
vec2 cj = ae * aB;
return bj(
cl - cj,
cl + cj
);
}
return bj(
fZ - eJ,
fZ + eJ
);
}

float eE(
float iZ,
float ha,
float pw,
float nL,
vec2 kL,
float phase
) {
vec2 ol = vec2(cos(phase), sin(phase));
vec2 iD = aY(kL, ol);
vec2 lv = iD * (ha * nL);
vec2 aq = vec2(1.0, 0.0) - iD * pw;
vec2 hP = vec2(iZ, 0.0)
+ bj(lv, aq);
return dot(hP, hP);
}

float au(
float J,
float wavelength,
float ct,
float aR,
float cn,
vec2 eG
) {
J = clamp(abs(J), 1e-5, 1.0);
float hI = pow(aR / cn, 2.0)
* (1.0 - J * J);
if (hI >= 1.0) {
return 1.0;
}
float dc = sqrt(1.0 - hI);
float lL = kF(
aR, cn, J, dc
);
float lK = kE(
aR, cn, J, dc
);
float jG = ht(
aR, cn, J, dc
);
float jF = hs(
aR, cn, J, dc
);
float gG = cn * dc
/ max(aR * J, 1e-9);
vec2 ut = ce(
dc, cn, eG, false
);
vec2 us = ce(
dc, cn, eG, true
);
float phase = 2.0 * PI * (2.0 * cn * ct * dc) / wavelength;
float uZ = eE(
lL,
jG,
-lL,
jG * gG,
ut,
phase
);
float uY = eE(
lK,
jF,
-lK,
jF * gG,
us,
phase
);
return clamp(0.5 * (uZ + uY), 0.0, 1.0);
}

vec3 hW(
float J,
float ct,
float cn,
float eG,
float aR
) {
return vec3(
au(
J, 620.0, ct, aR, cn, vec2(eG, 0.0)
),
au(
J, 540.0, ct, aR, cn, vec2(eG, 0.0)
),
au(
J, 450.0, ct, aR, cn, vec2(eG, 0.0)
)
);
}



vec3 cw(float cosine, vec3 f0, vec3 tint) {
vec3 sr = mix(f0, vec3(1.0), aI(cosine));
if (all(equal(tint, vec3(1.0)))) { return sr; }
float dD = 1.0 / 7.0;
float mY = 1.0 - dD;
vec3 fX = mix(f0, vec3(1.0), aI(dD));
float dw = 1.0 - cosine;
float ru = cosine * aI(cosine) * dw
/ (dD * pow(mY, 6.0));
return clamp(sr - ru * (fX - tint * fX), vec3(0.0), vec3(1.0));
}

vec2 cX(float f0, float uN) {
float dY = clamp(f0, 0.0, 0.99);
float gZ = sqrt(dY);
float rK = (1.0 - dY) / (1.0 + dY);
float rH = (1.0 + gZ) / max(1.0 - gZ, 1e-9);
float ior = mix(rH, rK, clamp(uN, 0.0, 1.0));
float kp = (
(ior + 1.0) * (ior + 1.0) * dY
- (ior - 1.0) * (ior - 1.0)
) / max(1.0 - dY, 1e-9);
return vec2(ior, sqrt(max(kp, 0.0)));
}

vec3 jr(
float J,
float ct,
float cn,
vec3 sm,
vec3 kA,
float aR
) {
return vec3(
au(
J,
620.0,
ct,
aR,
cn,
cX(sm.r, kA.r)
),
au(
J,
540.0,
ct,
aR,
cn,
cX(sm.g, kA.g)
),
au(
J,
450.0,
ct,
aR,
cn,
cX(sm.b, kA.b)
)
);
}

float bS(float ct, float weight) {
return clamp(weight, 0.0, 1.0) * smoothstep(1e-9, 30.0, ct);
}

vec3 cc(
vec3 ey,
float J,
float ct,
float cn,
float eG,
float weight,
float aR
) {
vec3 qn = hW(
J,
ct,
cn,
eG,
aR
);
return mix(
ey,
qn,
bS(ct, weight)
);
}

vec3 lZ(
vec3 ey,
float J,
float ct,
float cn,
vec3 sm,
vec3 kA,
float weight,
float aR
) {
vec3 qn = jr(
J,
ct,
cn,
sm,
kA,
aR
);
return mix(
ey,
qn,
bS(ct, weight)
);
}

vec3 bJ(
OpenPbrResolvedMaterial material,
vec3 color,
vec3 viewLocal,
vec3 lightLocal,
float fJ,
out float pdf
) {
pdf = 0.0;
if (lightLocal.z <= 0.0) {
return vec3(0.0);
}

float roughness = material.diffuseRoughness;
float hl = 0.5 - 2.0 / (3.0 * PI);
float pc = 2.0 / 3.0 - 28.0 / (15.0 * PI);
float pp = lightLocal.z;
float nt = viewLocal.z;
float directional = dot(lightLocal, viewLocal) - pp * nt;
float hh = directional > 0.0
? directional / max(max(pp, nt), 1e-7)
: directional;
float iJ = 1.0 / (1.0 + hl * roughness);
vec3 ot = color * INVPI * iJ
* (1.0 + roughness * hh);

float dr = 1.0 - pp;
float outputComplement = 1.0 - nt;
float ph = dr * (
0.0571085289 + dr * (
0.491881867 + dr * (
-0.332181442 + dr * 0.0714429953
)
)
);
float outputGOverPi = outputComplement * (
0.0571085289 + outputComplement * (
0.491881867 + outputComplement * (
-0.332181442 + outputComplement * 0.0714429953
)
)
);
float qr = (1.0 + roughness * ph)
/ (1.0 + hl * roughness);
float outputAlbedo = (1.0 + roughness * outputGOverPi)
/ (1.0 + hl * roughness);
float gi = iJ * (1.0 + pc * roughness);
vec3 hV = color * color * gi
/ max(vec3(1e-7), vec3(1.0) - color * (1.0 - gi));
vec3 mn = hV * INVPI
* max(1e-7, 1.0 - outputAlbedo)
* max(1e-7, 1.0 - qr)
/ max(1e-7, 1.0 - gi);
pdf = lightLocal.z * INVPI;
return (ot + mn) * fJ;
}

float aU(float viewCosine, float roughness) {
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

vec3 kD(
OpenPbrResolvedMaterial material,
vec3 viewLocal,
vec3 lightLocal,
out float pdf
) {
pdf = 0.0;
if (viewLocal.z <= 0.0 || lightLocal.z <= 0.0) {
return vec3(0.0);
}
float albedo = aU(
viewLocal.z,
material.fuzzRoughness
);
pdf = lightLocal.z * INVPI;
return material.fuzzColor * albedo * INVPI;
}

vec3 ao(
OpenPbrResolvedMaterial material,
vec3 viewLocal,
vec3 lightLocal,
vec3 ad,
vec3 bG,
out float pdf
) {
pdf = 0.0;
if (lightLocal.z <= 0.0) {
return vec3(0.0);
}

vec2 alpha = vec2(material.alphaX, material.alphaY);
float distribution = cW(ad, alpha);
float kz = aF(viewLocal, alpha);
float ep = kz
* aF(lightLocal, alpha);

pdf = kz * distribution / (4.0 * max(viewLocal.z, 1e-8));
return bG * distribution * ep
/ (4.0 * max(lightLocal.z * viewLocal.z, 1e-8));
}

vec3 dE(
OpenPbrResolvedMaterial material,
float relativeIor,
vec3 tint,
vec3 viewLocal,
vec3 lightLocal,
vec3 ad,
vec3 bG,
out float pdf
) {
pdf = 0.0;
if (lightLocal.z >= 0.0) {
return vec3(0.0);
}

float ls = dot(lightLocal, ad);
float bm = dot(viewLocal, ad);


if (bm <= 0.0 || ls >= 0.0) {
return vec3(0.0);
}
vec2 alpha = vec2(material.alphaX, material.alphaY);
float distribution = cW(ad, alpha);
float kz = aF(viewLocal, alpha);
float ep = kz
* aF(lightLocal, alpha);
float aq = ls + bm * relativeIor;
aq *= aq;
float qw = abs(ls) / max(aq, 1e-8);
float jU = relativeIor * relativeIor;

pdf = kz * max(0.0, bm) * distribution * qw
/ max(viewLocal.z, 1e-8);
return tint * (vec3(1.0) - bG) * distribution * ep
* abs(bm) * qw * jU
/ max(abs(lightLocal.z * viewLocal.z), 1e-8);
}

vec3 bh(OpenPbrResolvedMaterial material) {
#ifdef HAS_MEDIUM
if (material.mediumType > 0) {
return vec3(1.0);
}
#endif
return material.transmissionColor;
}

float cZ(float ai) {
return 2.0 * ai / (1.0 + ai);
}

vec3 av(
vec3 ai,
float transmissionWeight
) {
vec3 gA = 2.0 * ai
/ (vec3(1.0) + ai);
return mix(
ai,
gA,
clamp(transmissionWeight, 0.0, 1.0)
);
}

vec3 bN(
OpenPbrResolvedMaterial material,
float J,
float bE
) {
vec3 tint = bh(material);
if (!material.thinWalled) {
return tint;
}
float jc = max(0.0, 1.0 - J * J);
float ea = jc
/ max(bE * bE, 1e-9);
if (ea >= 1.0) {
return vec3(0.0);
}
float ae = sqrt(1.0 - ea);
return pow(max(tint, vec3(0.0)), vec3(1.0 / max(ae, 1e-5)));
}

vec3 dX(
OpenPbrResolvedMaterial material,
vec3 viewLocal,
vec3 lightLocal,
out float pdf
) {
pdf = 0.0;
if (viewLocal.z <= 0.0 || lightLocal.z >= 0.0) {
return vec3(0.0);
}
float ae = -lightLocal.z;
float oY = cC(
viewLocal.z,
material.relativeIor
);
pdf = ae * INVPI;
return vec3(1.0 - oY) * INVPI;
}

void eg(inout ag prepared) {
float total = prepared.probabilities[OPENPBR_LOBE_FUZZ];
for (int jT = 1; jT < OPENPBR_LOBE_COUNT; jT++) {
total += prepared.probabilities[jT];
}
if (total <= 1e-8) {
for (int jT = 0; jT < OPENPBR_LOBE_COUNT; jT++) {
prepared.probabilities[jT] = 0.0;
}
return;
}
float pk = 1.0 / total;
for (int jT = 0; jT < OPENPBR_LOBE_COUNT; jT++) {
prepared.probabilities[jT] *= pk;
}
}



float bR(float eta) {
if (abs(eta - 1.0) < 1e-6) { return 0.0; }
if (eta > 1.0) { return (eta - 1.0) / (4.08567 + 1.00071 * eta); }
return 0.997118 + 0.1014 * eta - 0.965241 * eta * eta - 0.130607 * eta * eta * eta;
}

vec3 bU(vec3 f0, vec3 tint) {
float dD = 1.0 / 7.0;
vec3 fX = mix(f0, vec3(1.0), aI(dD));
vec3 b = fX * (vec3(1.0) - tint) / (dD * pow(1.0 - dD, 6.0));
return clamp(f0 + (vec3(1.0) - f0) / 21.0 - b / 126.0, vec3(0.0), vec3(1.0));
}



vec3 cN(OpenPbrResolvedMaterial material, float cosine) {
if (cosine <= 0.0) { return vec3(1.0); }
float mp = sqrt(max(0.0, 1.0 - (1.0 - cosine * cosine) / (material.coatIor * material.coatIor)));
vec3 uT = pow(max(material.coatColor, vec3(0.0)), vec3(0.5 / max(mp, 1e-5)));
return mix(vec3(1.0), uT, material.coatWeight);
}

float gF(OpenPbrResolvedMaterial material, float cosine) {
if (material.coatRoughness <= ROUGHNESS_MIN) {
return af(cosine, 1.0 / material.coatIor);
}


return clamp(1.0 - aw(material.coatIor,
material.coatRoughness * material.coatRoughness, cosine), 0.0, 1.0);
}

vec3 hr(ag prepared) {
OpenPbrResolvedMaterial material = prepared.material;
float dielectric = 1.0 - material.baseMetalness;
float opaque = dielectric * (1.0 - material.transmissionWeight) * (1.0 - material.subsurfaceWeight);
float sss = dielectric * (1.0 - material.transmissionWeight) * material.subsurfaceWeight;
float vI = dielectric * material.transmissionWeight;
float gd = bR(prepared.specularEtaTOverEtaI);
float lE = bR(1.0 / prepared.transmissionReflectionIor);
float qI = clamp(opaque * gd + (sss + vI) * lE + material.baseMetalness, 0.0, 1.0);
float jM = mix(1.0, material.specularRoughness, qI);
float ks = bR(material.coatIor);
float kr = 1.0 - (1.0 - ks) / (material.coatIor * material.coatIor);
float k = mix(ks, kr, jM);
vec3 eb = material.baseMetalness * material.specularWeight * bU(material.baseWeight * material.baseColor, material.specularColor)
+ opaque * mix(material.baseWeight * material.baseColor, vec3(1.0), gd)
+ sss * material.subsurfaceColor + vec3(vI);
vec3 rZ = vec3(1.0 - k) / max(vec3(1.0) - eb * k, vec3(1e-6));
return mix(vec3(1.0), rZ, material.coatWeight * material.coatDarkening);
}

vec3 cF(ag prepared, float lU) {
if (prepared.material.coatWeight <= 0.0) { return vec3(1.0); }
if (prepared.material.inside) {

return cN(prepared.material, -lU);
}

return prepared.coatBaseScale * cN(prepared.material, lU);
}


bq dM(bq fallback, vec3 tangent, vec3 bitangent, vec2 direction) {
vec3 t = tangent - fallback.normal * dot(fallback.normal, tangent);
if (dot(t, t) < 1e-8) { t = fallback.tangent; }
t = normalize(t);
vec3 b = cross(fallback.normal, t) * (dot(cross(fallback.normal, t), bitangent) < 0.0 ? -1.0 : 1.0);
t = t * direction.x + b * direction.y;
if (dot(t, t) < 1e-8) { return fallback; }
bq basis = fallback;
basis.tangent = normalize(t);
basis.bitangent = normalize(cross(basis.normal, basis.tangent));
basis.tangent = normalize(cross(basis.bitangent, basis.normal));
return basis;
}

ag ds(
vec3 tangent,
OpenPbrResolvedMaterial material,
vec3 bM,
vec3 normal
) {
ag prepared;
prepared.material = material;
prepared.basis = fD(
tangent,
normal,
max(material.specularAnisotropy, material.coatAnisotropy)
);
prepared.coatBasis = prepared.basis;
prepared.directionFrames = false;
#ifdef USE_COAT_NORMAL_FRAMES


if (material.coatNormalEnabled) {
prepared.coatBasis = fD(material.geometryTangent, material.coatNormal, material.coatAnisotropy);
prepared.directionFrames = true;
}
#endif
if (material.specularAnisotropy > 0.0 && material.anisotropyDirectionEnabled) {
prepared.basis = dM(prepared.basis, material.directionTangent, material.directionBitangent, material.anisotropyDirection);
prepared.directionFrames = true;
}
if (material.coatAnisotropy > 0.0 && material.coatAnisotropyRotation != 0.0) {
prepared.coatBasis = dM(prepared.coatBasis, material.geometryTangent, material.geometryBitangent, vec2(cos(material.coatAnisotropyRotation), sin(material.coatAnisotropyRotation)));
prepared.directionFrames = true;
}
prepared.viewLocal = openpbr_to_local(prepared.basis, bM);
#ifdef USE_COAT_NORMAL_FRAMES
prepared.coatViewLocal = openpbr_to_local(prepared.coatBasis, bM);
#endif
prepared.diffuseColor = material.baseColor;

float cK = 1.0 - material.baseMetalness;
float dW = cK
* (1.0 - material.transmissionWeight);
prepared.weights[OPENPBR_LOBE_FUZZ] = material.fuzzWeight;
prepared.weights[OPENPBR_LOBE_COAT] = material.coatWeight;
if (material.inside) { prepared.weights[OPENPBR_LOBE_COAT] = 0.0; }
prepared.weights[OPENPBR_LOBE_METAL] = material.baseMetalness;
prepared.weights[OPENPBR_LOBE_SPECULAR] = cK;
prepared.weights[OPENPBR_LOBE_TRANSMISSION] = cK
* material.transmissionWeight;
prepared.weights[OPENPBR_LOBE_DIFFUSE] = dW
* (1.0 - material.subsurfaceWeight) * material.baseWeight;
prepared.weights[OPENPBR_LOBE_SUBSURFACE] = dW
* material.subsurfaceWeight;

prepared.specularEtaTOverEtaI = bi(
1.0 / material.relativeIor,
material.specularWeight
);
prepared.material.relativeIor = 1.0 / prepared.specularEtaTOverEtaI;
prepared.refractionEtaTOverEtaI = prepared.specularEtaTOverEtaI;
prepared.transmissionReflectionIor = prepared.material.relativeIor;


if (material.coatWeight > 0.0) {
float cm = 1.0;
if (!material.inside) { cm = mix(1.0, material.coatIor, material.coatWeight); }
float bB = cm * bi(
material.specularIor / cm, material.specularWeight);
float eF = bB / cm;
if (cm > bB && bB >= 1.0) {
eF = 1.0 / eF;
}
prepared.specularEtaTOverEtaI = eF;
prepared.transmissionReflectionIor = 1.0 / eF;
prepared.refractionEtaTOverEtaI = bB;
if (material.inside) {
prepared.refractionEtaTOverEtaI = 1.0 / bB;
prepared.transmissionReflectionIor = bB;
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
float ai = af(
viewCosine,
1.0 / prepared.specularEtaTOverEtaI
);
vec3 fN = material.specularColor * (
material.thinWalled
? mix(
ai,
cZ(ai),
material.transmissionWeight
)
: ai
);
vec3 iv = material.specularWeight * cw(
viewCosine,
material.baseWeight * material.baseColor,
material.specularColor
);
float eZ = material.thinWalled
? cZ(af(viewCosine, prepared.transmissionReflectionIor))
: af(viewCosine, prepared.transmissionReflectionIor);
vec3 hb = bN(
material,
viewCosine,
prepared.refractionEtaTOverEtaI
);
float iM = aw(
prepared.specularEtaTOverEtaI,
prepared.specularAlpha,
viewCosine
);
float gH = cA(
prepared.specularEtaTOverEtaI,
prepared.specularAlpha
);
prepared.diffuseSpecularEnergyCompensation = iM
/ max(gH, 1e-12);

prepared.probabilities[OPENPBR_LOBE_FUZZ] = prepared.weights[OPENPBR_LOBE_FUZZ]
* aE(material.fuzzColor)
* max(aU(
viewCosine,
material.fuzzRoughness
), 0.02);
prepared.probabilities[OPENPBR_LOBE_COAT] = 0.0;
prepared.coatBaseScale = vec3(1.0);
if (material.coatWeight > 0.0 && !material.inside) {
#ifdef USE_COAT_NORMAL_FRAMES
float coatViewCosine = material.coatNormalEnabled ? max(prepared.coatViewLocal.z, 0.0) : viewCosine;
float lf = gF(material, coatViewCosine);
#else
float lf = gF(material, viewCosine);
#endif
prepared.probabilities[OPENPBR_LOBE_COAT] = prepared.weights[OPENPBR_LOBE_COAT] * lf;
prepared.coatBaseScale = cN(material,
#ifdef USE_COAT_NORMAL_FRAMES
coatViewCosine
#else
viewCosine
#endif
)
* (1.0 - prepared.weights[OPENPBR_LOBE_COAT] * lf) * hr(prepared);
}
prepared.probabilities[OPENPBR_LOBE_METAL] = prepared.weights[OPENPBR_LOBE_METAL]
* aE(iv);
prepared.metalMsScale = vec3(0.0);
prepared.metalMsFactor = 0.0;
prepared.metalMsProbability = 0.0;
if (material.specularRoughness >= 0.04 && prepared.weights[OPENPBR_LOBE_METAL] > 0.0) {
vec3 ig = bU(material.baseWeight * material.baseColor, material.specularColor);
prepared.metalMsScale = material.specularWeight * ig * ig;
float qO = aV(prepared.specularAlpha, viewCosine);
prepared.metalMsFactor = qO / max(cD(prepared.specularAlpha), 1e-12);
float fC = prepared.weights[OPENPBR_LOBE_METAL] * aE(prepared.metalMsScale) * qO;
prepared.probabilities[OPENPBR_LOBE_METAL] += fC;
prepared.metalMsProbability = fC / max(prepared.probabilities[OPENPBR_LOBE_METAL], 1e-12);
}
prepared.probabilities[OPENPBR_LOBE_SPECULAR] = prepared.weights[OPENPBR_LOBE_SPECULAR]
* aE(fN);
prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] = prepared.weights[OPENPBR_LOBE_TRANSMISSION]
* (1.0 - eZ)
* aE(hb);






prepared.dielectricMsReflectionScale = vec3(0.0);
prepared.dielectricMsTransmissionScale = vec3(0.0);
prepared.dielectricMsViewLoss = 0.0;
prepared.dielectricMsReflectionRatio = 0.0;
prepared.dielectricMsProbability = 0.0;
if (!material.thinWalled && material.transmissionWeight > 0.0 &&
prepared.specularAlpha >= 0.0016 && prepared.weights[OPENPBR_LOBE_TRANSMISSION] > 0.0 &&
abs(prepared.refractionEtaTOverEtaI - 1.0) > 1e-6) {
float mo = prepared.weights[OPENPBR_LOBE_TRANSMISSION] + prepared.weights[OPENPBR_LOBE_SUBSURFACE];
prepared.dielectricMsReflectionScale = (material.inside ? vec3(1.0) : material.specularColor) * mo;
prepared.dielectricMsTransmissionScale = hb * prepared.weights[OPENPBR_LOBE_TRANSMISSION]
+ vec3(prepared.weights[OPENPBR_LOBE_SUBSURFACE]);
prepared.dielectricMsReflectionRatio = ck(prepared.refractionEtaTOverEtaI, prepared.specularAlpha);
prepared.dielectricMsViewLoss = bb(prepared.refractionEtaTOverEtaI, prepared.specularAlpha, viewCosine);
vec3 oR = mix(prepared.dielectricMsTransmissionScale, prepared.dielectricMsReflectionScale, prepared.dielectricMsReflectionRatio);
float fC = aE(oR) * prepared.dielectricMsViewLoss;
prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] += fC;
prepared.dielectricMsProbability = fC / max(prepared.probabilities[OPENPBR_LOBE_TRANSMISSION], 1e-12);
}
prepared.probabilities[OPENPBR_LOBE_DIFFUSE] = prepared.weights[OPENPBR_LOBE_DIFFUSE]
* aE(prepared.diffuseColor)
* prepared.diffuseSpecularEnergyCompensation;
prepared.probabilities[OPENPBR_LOBE_SUBSURFACE] = prepared.weights[OPENPBR_LOBE_SUBSURFACE]
* (1.0 - eZ)
* aE(material.subsurfaceColor)
* prepared.diffuseSpecularEnergyCompensation;


if (material.coatWeight > 0.0 && material.thinFilmWeight > 0.0) {
float lS = 0.02 * bS(material.thinFilmThickness, material.thinFilmWeight);
prepared.probabilities[OPENPBR_LOBE_SPECULAR] = max(prepared.probabilities[OPENPBR_LOBE_SPECULAR], prepared.weights[OPENPBR_LOBE_SPECULAR] * lS);
prepared.probabilities[OPENPBR_LOBE_METAL] = max(prepared.probabilities[OPENPBR_LOBE_METAL], prepared.weights[OPENPBR_LOBE_METAL] * material.specularWeight * lS);
}
if (material.coatWeight > 0.0 && !material.inside) {
float gI = max(max(prepared.coatBaseScale.x, prepared.coatBaseScale.y), prepared.coatBaseScale.z);
prepared.probabilities[OPENPBR_LOBE_METAL] *= gI;
prepared.probabilities[OPENPBR_LOBE_SPECULAR] *= gI;
prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] *= gI;
prepared.probabilities[OPENPBR_LOBE_DIFFUSE] *= gI;
prepared.probabilities[OPENPBR_LOBE_SUBSURFACE] *= gI;
}
eg(prepared);
return prepared;
}

float cY(ag prepared, float cosine, bool reflection) {
if (prepared.material.coatWeight <= 0.0) {
return af(cosine, prepared.material.relativeIor);
}
float kU = af(cosine, prepared.transmissionReflectionIor);
if (!reflection) { return kU; }
float oj = af(cosine, 1.0 / prepared.specularEtaTOverEtaI);
float sQ = prepared.material.transmissionWeight + (1.0 - prepared.material.transmissionWeight) * prepared.material.subsurfaceWeight;
return mix(oj, kU, sQ);
}

vec3 bO(
ag prepared,
vec3 lightDirection,
out float pdf
) {
OpenPbrResolvedMaterial material = prepared.material;
vec3 viewLocal = prepared.viewLocal;
vec3 lightLocal = openpbr_to_local(prepared.basis, lightDirection);
bool reflection = lightLocal.z * viewLocal.z > 0.0;
#ifdef USE_COAT_NORMAL_FRAMES
bool independentCoat = material.coatNormalEnabled;
bool geometricReflection = dot(material.geometricNormal, lightDirection) > 0.0;
float coatLightCosine = dot(prepared.coatBasis.normal, lightDirection);
bool coatReflection = geometricReflection && prepared.coatViewLocal.z > 0.0 && coatLightCosine > 0.0;
#endif

vec3 ad;
if (reflection) {
ad = normalize(lightLocal + viewLocal);
}
else {
ad = normalize(lightLocal + viewLocal * material.relativeIor);
}
if (ad.z < 0.0) {
ad = -ad;
}

vec3 response = vec3(0.0);
pdf = 0.0;
float aM = 0.0;
float bm = abs(dot(viewLocal, ad));
float diffuseSpecularEnergyCompensation =
prepared.diffuseSpecularEnergyCompensation
* aw(
prepared.specularEtaTOverEtaI,
prepared.specularAlpha,
abs(lightLocal.z)
);

#ifdef USE_COAT_NORMAL_FRAMES
if (!independentCoat || (lightLocal.z != 0.0 && reflection == geometricReflection)) {
#endif
if (reflection) {
if (prepared.weights[OPENPBR_LOBE_DIFFUSE] > 0.0) {
response += prepared.weights[OPENPBR_LOBE_DIFFUSE] * bJ(
material,
prepared.diffuseColor,
viewLocal,
lightLocal,
diffuseSpecularEnergyCompensation,
aM
);
pdf += prepared.probabilities[OPENPBR_LOBE_DIFFUSE] * aM;
}

if (prepared.weights[OPENPBR_LOBE_SUBSURFACE] > 0.0 && material.thinWalled) {
response += 0.5 * prepared.weights[OPENPBR_LOBE_SUBSURFACE] * bJ(
material,
material.subsurfaceColor,
viewLocal,
lightLocal,
diffuseSpecularEnergyCompensation,
aM
);
pdf += prepared.probabilities[OPENPBR_LOBE_SUBSURFACE] * 0.5 * aM;
}

if (prepared.weights[OPENPBR_LOBE_SPECULAR] > 0.0) {
vec3 cB = vec3(cY(prepared, bm, true));
if (material.thinFilmWeight > 0.0) {
cB = cc(
cB,
bm,
material.thinFilmThickness,
material.thinFilmIor,
prepared.thinFilmBaseIor,
material.thinFilmWeight,
prepared.thinFilmExteriorIor
);
}
if (material.thinWalled) {
cB = av(
cB,
material.transmissionWeight
);
}
vec3 bG = material.specularColor * cB;
response += prepared.weights[OPENPBR_LOBE_SPECULAR] * ao(
material,
viewLocal,
lightLocal,
ad,
bG,
aM
);
pdf += prepared.probabilities[OPENPBR_LOBE_SPECULAR] * aM;
}

if (prepared.weights[OPENPBR_LOBE_METAL] > 0.0) {
vec3 bG = cw(
bm,
material.baseWeight * material.baseColor,
material.specularColor
);
if (material.thinFilmWeight > 0.0) {
bG = lZ(
bG,
bm,
material.thinFilmThickness,
material.thinFilmIor,
material.baseWeight * material.baseColor,
material.specularColor,
material.thinFilmWeight,
prepared.thinFilmExteriorIor
);
}
bG *= material.specularWeight;
response += prepared.weights[OPENPBR_LOBE_METAL] * ao(
material,
viewLocal,
lightLocal,
ad,
bG,
aM
);
if (prepared.metalMsFactor > 0.0) {
float cL = min(prepared.metalMsFactor * aV(prepared.specularAlpha, lightLocal.z), 1.0 / max(lightLocal.z, 1e-8));
response += prepared.weights[OPENPBR_LOBE_METAL] * prepared.metalMsScale * cL * INVPI;
aM = mix(aM, 0.5 * INVPI, prepared.metalMsProbability);
}
pdf += prepared.probabilities[OPENPBR_LOBE_METAL] * aM;
}
}
else {
vec3 bG = vec3(cY(prepared, bm, false));
if (material.thinFilmWeight > 0.0) {
bG = cc(
bG,
bm,
material.thinFilmThickness,
material.thinFilmIor,
prepared.thinFilmBaseIor,
material.thinFilmWeight,
prepared.thinFilmExteriorIor
);
}
if (prepared.weights[OPENPBR_LOBE_TRANSMISSION] > 0.0) {
if (material.thinWalled) {
vec3 lI = vec3(lightLocal.xy, -lightLocal.z);
vec3 du = normalize(lI + viewLocal);
if (du.z < 0.0) {
du = -du;
}
float oM = abs(dot(viewLocal, du));
vec3 mv = vec3(cY(prepared, oM, false));
if (material.thinFilmWeight > 0.0) {
mv = cc(
mv,
oM,
material.thinFilmThickness,
material.thinFilmIor,
prepared.thinFilmBaseIor,
material.thinFilmWeight,
prepared.thinFilmExteriorIor
);
}
vec3 gA = av(
mv,
1.0
);
vec3 tint = bN(
material,
abs(viewLocal.z),
prepared.refractionEtaTOverEtaI
);
response += prepared.weights[OPENPBR_LOBE_TRANSMISSION]
* ao(
material,
viewLocal,
lI,
du,
tint * (vec3(1.0) - gA),
aM
);
}
else {
response += prepared.weights[OPENPBR_LOBE_TRANSMISSION]
* dE(
material,
material.relativeIor,
bh(material),
viewLocal,
lightLocal,
ad,
bG,
aM
);
}
if (prepared.dielectricMsProbability > 0.0) {
aM *= 1.0 - prepared.dielectricMsProbability;
}
pdf += prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] * aM;
}
if (prepared.weights[OPENPBR_LOBE_SUBSURFACE] > 0.0) {
if (material.thinWalled) {
vec3 pb = vec3(lightLocal.xy, -lightLocal.z);
response += 0.5 * prepared.weights[OPENPBR_LOBE_SUBSURFACE]
* bJ(
material,
material.subsurfaceColor,
viewLocal,
pb,
diffuseSpecularEnergyCompensation,
aM
);
aM *= 0.5;
}
else {
response += prepared.weights[OPENPBR_LOBE_SUBSURFACE] * dX(
material,
viewLocal,
lightLocal,
aM
);
}
pdf += prepared.probabilities[OPENPBR_LOBE_SUBSURFACE] * aM;
}
}




if (prepared.dielectricMsProbability > 0.0) {
float cosine = abs(lightLocal.z);
if (cosine > 0.0) {
float ior = (reflection ? prepared.refractionEtaTOverEtaI : 1.0 / prepared.refractionEtaTOverEtaI);
float ju = (reflection ? prepared.dielectricMsReflectionRatio : 1.0 - prepared.dielectricMsReflectionRatio);
float oZ = prepared.dielectricMsViewLoss * bb(ior, prepared.specularAlpha, cosine)
/ max(bf(ior, prepared.specularAlpha), 1e-12);
float cL = min(oZ * ju, 1.0 / cosine);
vec3 scale = (reflection ? prepared.dielectricMsReflectionScale : prepared.dielectricMsTransmissionScale);
response += scale * cL * INVPI;
pdf += prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] * prepared.dielectricMsProbability * ju * 0.5 * INVPI;
}
}

#ifdef USE_COAT_NORMAL_FRAMES
} 
#endif
if (material.coatWeight > 0.0) {
response *= cF(prepared,
#ifdef USE_COAT_NORMAL_FRAMES
independentCoat ? coatLightCosine : lightLocal.z
#else
lightLocal.z
#endif
);
}
#ifdef USE_COAT_NORMAL_FRAMES
if (independentCoat) { response *= abs(lightLocal.z); }
#endif

if (
#ifdef USE_COAT_NORMAL_FRAMES
(independentCoat ? coatReflection : reflection)
#else
reflection
#endif
&& prepared.weights[OPENPBR_LOBE_COAT] > 0.0) {
vec3 dT = viewLocal;
vec3 lh = lightLocal;
vec3 gL = ad;
float kk = bm;
if (prepared.directionFrames) {
dT = openpbr_to_local(prepared.coatBasis, openpbr_to_world(prepared.basis, viewLocal));
#ifdef USE_COAT_NORMAL_FRAMES
if (independentCoat) { dT = prepared.coatViewLocal; }
#endif
lh = openpbr_to_local(prepared.coatBasis, lightDirection);
gL = normalize(lh + dT);
if (gL.z < 0.0) { gL = -gL; }
kk = abs(dot(dT, gL));
}

vec3 lQ = vec3(af(
kk,
1.0 / material.coatIor
));
OpenPbrResolvedMaterial dS = material;
vec2 jX = aN(material.coatRoughness, material.coatAnisotropy);
dS.alphaX = jX.x;
dS.alphaY = jX.y;
response += prepared.weights[OPENPBR_LOBE_COAT]
#ifdef USE_COAT_NORMAL_FRAMES
* (independentCoat ? max(coatLightCosine, 0.0) : 1.0)
#endif
* ao(
dS,
dT,
lh,
gL,
lQ,
aM
);
pdf += prepared.probabilities[OPENPBR_LOBE_COAT] * aM;
}

if (
#ifdef USE_COAT_NORMAL_FRAMES
(independentCoat ? geometricReflection : reflection)
#else
reflection
#endif
&& prepared.weights[OPENPBR_LOBE_FUZZ] > 0.0) {
float rC = aU(
abs(viewLocal.z),
material.fuzzRoughness
);
response *= max(
vec3(0.0),
vec3(1.0 - prepared.weights[OPENPBR_LOBE_FUZZ] * rC)
);
response += prepared.weights[OPENPBR_LOBE_FUZZ]
#ifdef USE_COAT_NORMAL_FRAMES
* (independentCoat ? max(lightLocal.z, 0.0) : 1.0)
#endif
* kD(
material,
viewLocal,
lightLocal,
aM
);
pdf += prepared.probabilities[OPENPBR_LOBE_FUZZ] * aM;
}

#ifdef USE_COAT_NORMAL_FRAMES
if (independentCoat) { return response; }
#endif
return response * abs(lightLocal.z);
}

vec3 sp(
vec3 tangent,
OpenPbrResolvedMaterial material,
vec3 bM,
vec3 normal,
vec3 lightDirection,
out float pdf
) {
ag prepared = ds(
tangent,
material,
bM,
normal
);
return bO(prepared, lightDirection, pdf);
}

float xN(
vec3 tangent,
OpenPbrResolvedMaterial material,
vec3 bM,
vec3 normal,
vec3 lightDirection
) {
float pdf;
sp(
tangent,
material,
bM,
normal,
lightDirection,
pdf
);
return pdf;
}

vec3 eN(
ag prepared,
vec3 cq,
out vec3 lightDirection,
out float pdf,
out bool isTransmissionEvent
) {
OpenPbrResolvedMaterial material = prepared.material;
vec3 viewLocal = prepared.viewLocal;
float cH = cq.x;
float fL = cq.y;
float bv = cq.z;
pdf = 0.0;
isTransmissionEvent = false;
lightDirection = prepared.basis.normal;



if (!prepared.material.thinWalled &&
abs(prepared.material.relativeIor - 1.0) <= 1e-6 &&
prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] >= 1.0 - 1e-6) {
lightDirection = openpbr_to_world(prepared.basis, -viewLocal);
pdf = 1.0;
isTransmissionEvent = true;
return (bh(prepared.material) * cF(prepared,
#ifdef USE_COAT_NORMAL_FRAMES
prepared.material.coatNormalEnabled ? dot(prepared.coatBasis.normal, lightDirection) : -prepared.viewLocal.z
#else
-prepared.viewLocal.z
#endif
));
}

float cdf[OPENPBR_LOBE_COUNT];
cdf[OPENPBR_LOBE_FUZZ] = prepared.probabilities[OPENPBR_LOBE_FUZZ];
for (int jT = 1; jT < OPENPBR_LOBE_COUNT; jT++) {
cdf[jT] = cdf[jT - 1] + prepared.probabilities[jT];
}
if (cdf[OPENPBR_LOBE_SUBSURFACE] <= 0.0) {
return vec3(0.0);
}

vec3 lightLocal;
if (bv < cdf[OPENPBR_LOBE_FUZZ] || (
bv >= cdf[OPENPBR_LOBE_TRANSMISSION] && bv < cdf[OPENPBR_LOBE_DIFFUSE]
)) {
lightLocal = aO(vec2(cH, fL));
}
else if (bv < cdf[OPENPBR_LOBE_COAT]) {
vec3 dT = viewLocal;
if (prepared.directionFrames) { dT = openpbr_to_local(prepared.coatBasis, openpbr_to_world(prepared.basis, viewLocal)); }
#ifdef USE_COAT_NORMAL_FRAMES
if (material.coatNormalEnabled) { dT = prepared.coatViewLocal; }
#endif
vec3 ad = aD(
dT,

aN(material.coatRoughness, material.coatAnisotropy),
vec2(cH, fL)
);
if (ad.z < 0.0) {
ad = -ad;
}
lightLocal = normalize(reflect(-dT, ad));
#ifdef USE_COAT_NORMAL_FRAMES
if (material.coatNormalEnabled) {
lightDirection = openpbr_to_world(prepared.coatBasis, lightLocal);
if (lightLocal.z <= 0.0 || dot(material.geometricNormal, lightDirection) <= 0.0) { return vec3(0.0); }
return bO(prepared, lightDirection, pdf);
}
#endif
if (prepared.directionFrames) { lightLocal = openpbr_to_local(prepared.basis, openpbr_to_world(prepared.coatBasis, lightLocal)); }
}
else if (bv < cdf[OPENPBR_LOBE_SPECULAR]) {
bool uP = bv < cdf[OPENPBR_LOBE_METAL];
float sN = (bv - cdf[OPENPBR_LOBE_COAT]) / max(prepared.probabilities[OPENPBR_LOBE_METAL], 1e-12);
if (uP && sN < prepared.metalMsProbability) {
float z = cH;
float ex = sqrt(max(0.0, 1.0 - z * z));
float azimuth = TWOPI * fL;
lightLocal = vec3(ex * cos(azimuth), ex * sin(azimuth), z);
}
else {
vec3 ad = aD(
viewLocal,
vec2(material.alphaX, material.alphaY),
vec2(cH, fL)
);
if (ad.z < 0.0) {
ad = -ad;
}
lightLocal = normalize(reflect(-viewLocal, ad));
}
}
else if (bv < cdf[OPENPBR_LOBE_TRANSMISSION]) {
isTransmissionEvent = true;


float vS = (bv - cdf[OPENPBR_LOBE_SPECULAR]) / max(prepared.probabilities[OPENPBR_LOBE_TRANSMISSION], 1e-12);
if (prepared.dielectricMsProbability > 0.0 && vS < prepared.dielectricMsProbability) {
float ju = prepared.dielectricMsReflectionRatio;
bool mJ = cH < ju;
float z;
if (mJ) { z = min(cH / ju, 0.99999994); }
else { z = -min((cH - ju) / (1.0 - ju), 0.99999994); }
float ex = sqrt(max(0.0, 1.0 - z * z));
float azimuth = TWOPI * fL;
lightLocal = vec3(ex * cos(azimuth), ex * sin(azimuth), z);
isTransmissionEvent = !mJ;
}
else {
vec3 ad = aD(
viewLocal,
vec2(material.alphaX, material.alphaY),
vec2(cH, fL)
);
if (ad.z < 0.0) {
ad = -ad;
}
float bm = abs(dot(viewLocal, ad));
vec3 bG = vec3(af(
bm,
prepared.material.relativeIor
));
if (material.thinFilmWeight > 0.0) {
bG = cc(
bG,
bm,
material.thinFilmThickness,
material.thinFilmIor,
prepared.thinFilmBaseIor,
material.thinFilmWeight,
prepared.thinFilmExteriorIor
);
}
if (material.thinWalled) {
vec3 iC = normalize(reflect(-viewLocal, ad));
lightLocal = vec3(iC.xy, -iC.z);
}
else {
lightLocal = refract(
-viewLocal,
ad,
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
float lq = cH;
bool qL = lq >= 0.5;
cH = qL
? (lq - 0.5) * 2.0
: lq * 2.0;
lightLocal = aO(vec2(cH, fL));
if (qL) {
lightLocal.z = -lightLocal.z;
}
else {
isTransmissionEvent = false;
}
}
else {
lightLocal = aO(vec2(cH, fL));
lightLocal.z = -lightLocal.z;
}
}

lightDirection = openpbr_to_world(prepared.basis, lightLocal);

if (lightLocal.z == 0.0 || (lightLocal.z < 0.0) != isTransmissionEvent) {
return vec3(0.0);
}
#ifdef USE_COAT_NORMAL_FRAMES
if (material.coatNormalEnabled &&
((dot(material.geometricNormal, lightDirection) <= 0.0) != isTransmissionEvent)) { return vec3(0.0); }
#endif
return bO(prepared, lightDirection, pdf);
}

vec3 tZ(
vec3 tangent,
OpenPbrResolvedMaterial material,
vec3 cq,
vec3 bM,
vec3 normal,
out vec3 lightDirection,
out float pdf,
out bool isTransmissionEvent
) {
ag prepared = ds(tangent, material, bM, normal);
return eN(prepared, cq, lightDirection, pdf, isTransmissionEvent);
}`;var oa=K`




vec3 aD(vec3 view, vec2 alpha, vec2 samplePoint) {
vec3 sv = vec3(alpha, 1.0);
vec3 cr = normalize(sv * view);
float qP = min(cr.z, 1.0);
float kh = 1.0 + qP;
float kC = (1.0 - samplePoint.y) * kh;
float sU = samplePoint.y * kh;
float tY = kC + (1.0 - qP);
float ex = sqrt(max(0.0, tY * sU));
float azimuth = TWOPI * samplePoint.x;
vec3 mr = vec3(
cr.x + ex * cos(azimuth),
cr.y + ex * sin(azimuth),
kC
);
return normalize(sv * mr);
}

float cW(vec3 pf, vec2 alpha) {
vec3 hF = vec3(
pf.x / alpha.x,
pf.y / alpha.y,
pf.z
);
float aq = dot(hF, hF);
return 1.0 / (
PI * alpha.x * alpha.y * aq * aq
);
}

float aF(vec3 direction, vec2 alpha) {
float eQ = abs(direction.z);
if (eQ <= 1e-8) {
return 0.0;
}
vec2 iE = alpha * direction.xy;
float mt = dot(iE, iE)
/ (eQ * eQ);
return 2.0 / (1.0 + sqrt(1.0 + mt));
}

float aI(float cosine) {
float dw = clamp(1.0 - cosine, 0.0, 1.0);
return pow(dw, 5.0);
}

float cC(float J, float cR) {
float iS = clamp(abs(J), 0.0, 1.0);
float kQ = cR * cR
* max(0.0, 1.0 - iS * iS);
if (kQ >= 1.0) {
return 1.0;
}

float mD = sqrt(max(0.0, 1.0 - kQ));
float bk = (iS - cR * mD)
/ max(iS + cR * mD, 1e-8);
float qC = (cR * iS - mD)
/ max(cR * iS + mD, 1e-8);
return 0.5 * (
bk * bk + qC * qC
);
}

vec2 gy(vec2 samplePoint) {
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

vec3 aO(vec2 samplePoint) {
vec2 lk = gy(samplePoint);
return vec3(
lk,
sqrt(max(0.0, 1.0 - dot(lk, lk)))
);
}

float aK(float qo, float oJ) {
float scale = max(qo, oJ);
if (scale <= 0.0) {
return 0.0;
}
vec2 normalized = vec2(qo, oJ) / scale;
vec2 pL = normalized * normalized;
return pL.x / (pL.x + pL.y);
}

void aP(in vec3 normal, out vec3 tangent, out vec3 bitangent) {
float iI = normal.z >= 0.0 ? 1.0 : -1.0;
float cL = -1.0 / (iI + normal.z);
float xy = normal.x * normal.y * cL;
tangent = vec3(
1.0 + iI * normal.x * normal.x * cL,
iI * xy,
-iI * normal.x
);
bitangent = vec3(
xy,
iI + normal.y * normal.y * cL,
-normal.y
);
}

vec3 aj(vec3 rgb, float wavelength) {
if (wavelength == 0.0) {
return rgb;
}
vec3 vk = wavelength > 600.0
? vec3(1.0, 0.0, 0.0)
: wavelength > 500.0
? vec3(0.0, 1.0, 0.0)
: vec3(0.0, 0.0, 1.0);
return rgb * vk;
}

float ee(
float wavelength,
float hu,
float hD,
float rt
) {
if (wavelength == 0.0 || hD <= 0.0) {
return hu;
}

const float FRAUNHOFER_C = 656.3;
const float FRAUNHOFER_D = 587.6;
const float FRAUNHOFER_F = 486.1;
float kv = 1.0 / (
1.0 / (FRAUNHOFER_F * FRAUNHOFER_F)
- 1.0 / (FRAUNHOFER_C * FRAUNHOFER_C)
);
float oe = max(rt / hD, 1e-6);
float rV = (hu - 1.0) * kv / oe;
float uK = hu
- rV / (FRAUNHOFER_D * FRAUNHOFER_D);
return uK + rV / (wavelength * wavelength);
}

vec3 fH(
vec3 gO,
float anisotropy,
vec2 samplePoint
) {
float cosine;
if (abs(anisotropy) < 0.001) {
cosine = 1.0 - 2.0 * samplePoint.y;
}
else {
float ju = (1.0 - anisotropy * anisotropy)
/ (1.0 + anisotropy - 2.0 * anisotropy * samplePoint.y);
cosine = (
ju * ju - 1.0 - anisotropy * anisotropy
) / (2.0 * anisotropy);
}

float vF = sqrt(max(0.0, 1.0 - cosine * cosine));
float azimuth = TWOPI * samplePoint.x;
vec3 tangent;
vec3 bitangent;
aP(gO, tangent, bitangent);
return tangent * (vF * cos(azimuth))
+ bitangent * (vF * sin(azimuth))
+ gO * cosine;
}

float bL(float cosine, float anisotropy) {
float aq = 1.0 + anisotropy * anisotropy
+ 2.0 * anisotropy * cosine;
return INV4PI * (1.0 - anisotropy * anisotropy)
/ (aq * sqrt(aq));
}
`;var ku=`
const vec4 hp[128] = vec4[128](
vec4(-0.971247852, -0.202764958, 0.999698818, 0.0245412290),
vec4(-0.808660269, 0.547487736, 0.997290432, 0.0735645667),
vec4(-0.942509234, 0.187289074, 0.992479563, 0.122410677),
vec4(-0.763038993, -0.558020830, 0.985277653, 0.170961902),
vec4(-0.929654300, -0.00785388052, 0.975702107, 0.219101235),
vec4(-0.656618595, 0.740912974, 0.963776052, 0.266712785),
vec4(-0.817265987, 0.373183846, 0.949528158, 0.313681751),
vec4(-0.793490529, -0.386950523, 0.932992816, 0.359895051),
vec4(-0.860713601, -0.105764769, 0.914209723, 0.405241340),
vec4(-0.604139447, 0.619064212, 0.893224299, 0.449611336),
vec4(-0.787263036, 0.281084418, 0.870086968, 0.492898226),
vec4(-0.673318744, -0.468566477, 0.844853580, 0.534997642),
vec4(-0.799623907, 0.0901312605, 0.817584813, 0.575808227),
vec4(-0.570307195, -0.676738262, 0.788346410, 0.615231633),
vec4(-0.627450705, 0.452229142, 0.757208824, 0.653172851),
vec4(-0.698281944, -0.294418186, 0.724247098, 0.689540565),
vec4(-0.726036906, -0.153989345, 0.689540505, 0.724247098),
vec4(-0.523753047, 0.608020604, 0.653172791, 0.757208884),
vec4(-0.671607554, 0.233185455, 0.615231574, 0.788346410),
vec4(-0.491990626, -0.494420350, 0.575808167, 0.817584813),
vec4(-0.678437173, 0.0412081257, 0.534997642, 0.844853580),
vec4(-0.495611340, -0.807542920, 0.492898196, 0.870086968),
vec4(-0.508582473, 0.402262419, 0.449611306, 0.893224299),
vec4(-0.537693322, -0.333672792, 0.405241281, 0.914209783),
vec4(-0.614562631, -0.0568606183, 0.359894961, 0.932992816),
vec4(-0.452296555, 0.809743226, 0.313681662, 0.949528217),
vec4(-0.492342144, 0.317682207, 0.266712755, 0.963776052),
vec4(-0.403601944, -0.406031638, 0.219101220, 0.975702107),
vec4(-0.537260950, 0.137945175, 0.170961857, 0.985277653),
vec4(-0.404928178, -0.715918541, 0.122410625, 0.992479563),
vec4(-0.386338592, 0.556550741, 0.0735644922, 0.997290432),
vec4(-0.445942074, -0.242918074, 0.0245411359, 0.999698818),
vec4(-0.459759980, -0.175696611, -0.0245412234, 0.999698818),
vec4(-0.359771132, 0.682195961, -0.0735645741, 0.997290432),
vec4(-0.412575692, 0.205535084, -0.122410707, 0.992479503),
vec4(-0.336475104, -0.646421731, -0.170961946, 0.985277653),
vec4(-0.429363400, 0.0166855231, -0.219101310, 0.975702107),
vec4(-0.319253087, -0.925218344, -0.266712844, 0.963776052),
vec4(-0.294470191, 0.430103362, -0.313681722, 0.949528158),
vec4(-0.281283021, -0.387403429, -0.359895051, 0.932992816),
vec4(-0.358183086, -0.0808178857, -0.405241340, 0.914209723),
vec4(-0.271769434, 0.854052365, -0.449611366, 0.893224299),
vec4(-0.244775921, 0.311606824, -0.492898166, 0.870087028),
vec4(-0.244355842, -0.552090824, -0.534997702, 0.844853520),
vec4(-0.283291280, 0.112162955, -0.575808167, 0.817584813),
vec4(-0.224362880, -0.823741674, -0.615231693, 0.788346350),
vec4(-0.210826442, 0.610893846, -0.653172851, 0.757208824),
vec4(-0.191608176, -0.297364026, -0.689540684, 0.724246979),
vec4(-0.207833603, -0.124338157, -0.724247158, 0.689540505),
vec4(-0.176593989, 0.814833522, -0.757208824, 0.653172851),
vec4(-0.158949688, 0.293469012, -0.788346469, 0.615231514),
vec4(-0.152046368, -0.648668587, -0.817584813, 0.575808167),
vec4(-0.167782038, 0.0643178672, -0.844853640, 0.534997463),
vec4(-0.128430068, -0.907204390, -0.870087028, 0.492898136),
vec4(-0.115809105, 0.572147131, -0.893224299, 0.449611366),
vec4(-0.103222348, -0.403248310, -0.914209783, 0.405241221),
vec4(-0.112737618, -0.0319865458, -0.932992816, 0.359895051),
vec4(-0.0796749964, 0.955433667, -0.949528217, 0.313681602),
vec4(-0.0672519580, 0.453793734, -0.963776052, 0.266712725),
vec4(-0.0551275201, -0.538435221, -0.975702167, 0.219101071),
vec4(-0.0426490456, 0.204346836, -0.985277653, 0.170961812),
vec4(-0.0306719355, -0.790655255, -0.992479503, 0.122410700),
vec4(-0.0184057076, 0.708510995, -0.997290492, 0.0735644475),
vec4(-0.00613544276, -0.291185349, -0.999698818, 0.0245412104),
vec4(0.00613530306, -0.244297966, -0.999698818, -0.0245413855),
vec4(0.0184059385, 0.755400777, -0.997290432, -0.0735646188),
vec4(0.0306059923, 0.253786176, -0.992479503, -0.122410871),
vec4(0.0429276451, -0.743136168, -0.985277653, -0.170961991),
vec4(0.0701737553, 0.00441496586, -0.975702107, -0.219101235),
vec4(0.0674433559, -0.992085159, -0.963776052, -0.266712904),
vec4(0.0794365108, 0.499346048, -0.949528158, -0.313681781),
vec4(0.0915081054, -0.485832185, -0.932992756, -0.359895200),
vec4(0.101071075, -0.0861614645, -0.914209723, -0.405241400),
vec4(0.116242222, 0.872919321, -0.893224180, -0.449611515),
vec4(0.126407236, 0.359021723, -0.870086908, -0.492898285),
vec4(0.139908314, -0.603366435, -0.844853580, -0.534997642),
vec4(0.168981716, 0.0979395211, -0.817584693, -0.575808346),
vec4(0.164669126, -0.853637457, -0.788346410, -0.615231633),
vec4(0.175589874, 0.605686426, -0.757208705, -0.653172970),
vec4(0.181917489, -0.321471483, -0.724247038, -0.689540625),
vec4(0.219242185, -0.135647133, -0.689540565, -0.724247098),
vec4(0.212299466, 0.790099680, -0.653172910, -0.757208765),
vec4(0.208243251, 0.240495890, -0.615231574, -0.788346469),
vec4(0.234419063, -0.640313387, -0.575808048, -0.817584932),
vec4(0.315854102, 0.0532567836, -0.534997344, -0.844853759),
vec4(0.260333687, -0.894772291, -0.492898196, -0.870086968),
vec4(0.265374005, 0.502337217, -0.449611217, -0.893224359),
vec4(0.267429054, -0.339113116, -0.405241072, -0.914209843),
vec4(0.380209267, -0.0445682108, -0.359895110, -0.932992756),
vec4(0.307221651, 0.891683638, -0.313681692, -0.949528217),
vec4(0.296788067, 0.329054117, -0.266712576, -0.963776112),
vec4(0.317195147, -0.457708418, -0.219100907, -0.975702226),
vec4(0.419729054, 0.148764044, -0.170961887, -0.985277653),
vec4(0.349995196, -0.727014899, -0.122410536, -0.992479563),
vec4(0.356363803, 0.594497383, -0.0735642835, -0.997290492),
vec4(0.434345096, -0.231501341, -0.0245412868, -0.999698818),
vec4(0.480473697, -0.164373189, 0.0245413091, -0.999698818),
vec4(0.392657876, 0.681903303, 0.0735647827, -0.997290432),
vec4(0.492657542, 0.218807966, 0.122411035, -0.992479503),
vec4(0.409054011, -0.584142148, 0.170961916, -0.985277653),
vec4(0.569577277, 0.0289491210, 0.219101399, -0.975702107),
vec4(0.442882210, -0.855257273, 0.266713053, -0.963775992),
vec4(0.459734946, 0.387970626, 0.313681692, -0.949528217),
vec4(0.513070345, -0.343044043, 0.359895140, -0.932992756),
vec4(0.629031241, -0.0690753013, 0.405241549, -0.914209664),
vec4(0.483215511, 0.773316741, 0.449611664, -0.893224120),
vec4(0.586818159, 0.310843110, 0.492898226, -0.870086968),
vec4(0.528679490, -0.427168757, 0.534997761, -0.844853461),
vec4(0.683721542, 0.126429096, 0.575808465, -0.817584634),
vec4(0.517971814, -0.658907175, 0.615231574, -0.788346410),
vec4(0.548397303, 0.476606160, 0.653172910, -0.757208765),
vec4(0.695181608, -0.259932309, 0.689540744, -0.724246919),
vec4(0.748597383, -0.117820688, 0.724247038, -0.689540625),
vec4(0.556980729, 0.641256869, 0.757208884, -0.653172791),
vec4(0.741829991, 0.268901259, 0.788346529, -0.615231454),
vec4(0.647817433, -0.477341115, 0.817584991, -0.575807929),
vec4(0.816602290, 0.0779312477, 0.844853580, -0.534997642),
vec4(0.599919200, -0.671730816, 0.870087087, -0.492898077),
vec4(0.724726558, 0.447135508, 0.893224418, -0.449611068),
vec4(0.810727239, -0.307791352, 0.914209723, -0.405241370),
vec4(0.882583082, -0.0201240778, 0.932992816, -0.359894961),
vec4(0.645550549, 0.729843259, 0.949528277, -0.313681543),
vec4(0.839177251, 0.362342149, 0.963776171, -0.266712397),
vec4(0.839526892, -0.399391353, 0.975702107, -0.219101220),
vec4(0.928934336, 0.175204813, 0.985277653, -0.170961723),
vec4(0.774228692, -0.569184363, 0.992479563, -0.122410372),
vec4(0.815476179, 0.537282884, 0.997290432, -0.0735645965),
vec4(0.968665719, -0.214761987, 0.999698818, -0.0245411228)
);
`;var Gu=ku+`
void aovReflectance(ag prepared, bool qQ, bool kY, out vec3 diffuse, out vec3 specular) {
diffuse=vec3(0.0); specular=vec3(0.0);
vec3 view = prepared.viewLocal;
if (view.z <= 1e-6) { return; }
OpenPbrResolvedMaterial material = prepared.material;
vec2 alpha = vec2(material.alphaX, material.alphaY);
float mg = aF(view, alpha);
float jl = prepared.weights[OPENPBR_LOBE_DIFFUSE];
float gb = prepared.weights[OPENPBR_LOBE_METAL];
float specularWeight = prepared.weights[OPENPBR_LOBE_SPECULAR];
float ei = 1.0;
if (kY && prepared.dielectricMsProbability > 0.0) {
ei = max(bf(prepared.refractionEtaTOverEtaI, prepared.specularAlpha), 1e-12);
}
vec3 cr = normalize(vec3(alpha, 1.0) * view);
float qP = min(cr.z, 1.0);
float kh = 1.0 + qP;
uint count = 256u;
for (uint i = 0u; i < uint(NO_UNROLL(256)); i++) {
uint vV = i / 2u;
vec2 u = vec2((float(vV) + 0.5) / float(count / 2u),
fract(float(reverseBits(vV)) * 2.3283064365386963e-10 + 0.37));
vec4 kK = hp[vV];

bool hO = prepared.specularAlpha < 0.001;
vec3 light = vec3(kK.xy, sqrt(max(0.0, 1.0 - dot(kK.xy, kK.xy))));
if (hO) { light = aO(u); }
if ((i & 1u) != 0u) {
float kC = (1.0 - u.y) * kh;
float ex = sqrt(max(0.0, (kC + (1.0 - qP)) * (u.y * kh)));
vec3 ad = normalize(vec3(alpha, 1.0) * vec3(cr.xy + ex * kK.zw, kC));
if (hO) { ad = aD(view, alpha, u); }
light = reflect(-view, ad);
}

if (light.z <= 0.0) { continue; }
vec3 ad = normalize(view + light);
float qH = mg * cW(ad, alpha) / (4.0 * view.z);
float pdf = 0.5 * (light.z * INVPI + qH);


vec3 aA = openpbr_to_local(prepared.basis, openpbr_to_world(prepared.basis, light));
if (aA.z <= 0.0) { continue; }
float scale = abs(aA.z) / (pdf * float(count));
if (qQ && jl > 0.0) {
float compensation = prepared.diffuseSpecularEnergyCompensation * aw(
prepared.specularEtaTOverEtaI, prepared.specularAlpha, abs(aA.z));
float sZ = 0.0;
diffuse += jl * bJ(material, prepared.diffuseColor,
view, aA, compensation, sZ) * scale;
}
if (kY) {
vec3 jn = normalize(view + aA);
float bm = abs(dot(view, jn));
vec3 bG = vec3(0.0);
if (specularWeight > 0.0) {
vec3 dielectric = vec3(af(bm, material.relativeIor));
if (material.thinWalled) { dielectric = av(dielectric, material.transmissionWeight); }
bG += specularWeight * material.specularColor * dielectric;
}
if (gb > 0.0) {
bG += gb * material.specularWeight * cw(bm,
material.baseWeight * material.baseColor, material.specularColor);
}
float rJ = cW(jn, alpha) * mg
* aF(aA, alpha) / (4.0 * max(aA.z * view.z, 1e-8));
vec3 reflection = bG * rJ;
if (gb > 0.0 && prepared.metalMsFactor > 0.0) {
float cL = min(prepared.metalMsFactor * aV(prepared.specularAlpha, aA.z), 1.0 / max(aA.z, 1e-8));
reflection += gb * prepared.metalMsScale * cL * INVPI;
}
if (prepared.dielectricMsProbability > 0.0) {
float oZ = prepared.dielectricMsViewLoss * bb(
prepared.refractionEtaTOverEtaI, prepared.specularAlpha, abs(aA.z)) / ei;
float cL = min(oZ * prepared.dielectricMsReflectionRatio, 1.0 / abs(aA.z));
reflection += prepared.dielectricMsReflectionScale * cL * INVPI;
}
specular += reflection * scale;
}
}
return;
}
`;var Li=K`
#define PI 3.14159265359
#define TWOPI 6.28318530718
#define INVPI 0.31830988618
#define INVPI2 0.10132118364
#define EPS 0.0005
#define INF 1.0e999
#define INV4PI 0.07957747154594766

#define ROUGHNESS_MIN 0.001

`;var Lt=ii({uniforms:{lightsTex:C.uniform("sampler2D"),iesProfileData:C.uniform("sampler2D"),iesProfileColumns:C.uniform("int",1),pixelSize:C.uniform("vec2"),jitter:C.uniform("vec2"),sampleCount:C.uniform("int"),envLightSelectionPmf:C.uniform("float",0)},defines:{STANDARD:0,UNLIT:2,SHADOW_CATCHER:3,SPOT_LIGHT:4},main:K`

const vec3 luminance = vec3(0.2126, 0.7152, 0.0722);
const int xk = 8;

#define RAY_MAX_DISTANCE 9999.0

#define NO_UNROLL(X) (X + min(0, sampleCount))
#define NO_UNROLLU(X) (X + uint(min(0, sampleCount)))

struct Ray {
vec3 o;
vec3 d;
float tMax;
};

struct SurfaceInteraction {
bool hit;
vec3 position;
vec3 normal; 
#ifdef USE_COAT_NORMAL_FRAMES
vec3 coatNormal;
#endif
vec3 vertexNormal; 
vec3 shadowOffset; 

vec2 uv;
vec2 uv1;
vec3 vertexColor;

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




struct OpenPbrResolvedMaterial {
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
#ifdef USE_COAT_NORMAL_FRAMES
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

void gC(inout Ray ray, vec3 origin, vec3 direction) {
ray.o = origin;
ray.d = direction;
ray.tMax = RAY_MAX_DISTANCE;
}


ivec2 hd(int i, int jY) {
ivec2 u;
u.y = i >> jY; 
u.x = i - (u.y << jY); 
return u;
}

vec4 lm(sampler2D s, int i, int jY) {
return texelFetch(s, hd(i, jY), 0);
}

ivec4 lm(highp isampler2D s, int i, int jY) {
return texelFetch(s, hd(i, jY), 0);
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


Light rB(int i) {
int firstTexel = i * 6;
vec4 qD = texelFetch(
lightsTex,
ivec2(firstTexel, 0),
0
);
vec4 ql = texelFetch(
lightsTex,
ivec2(firstTexel + 1, 0),
0
);
vec4 oL = texelFetch(
lightsTex,
ivec2(firstTexel + 2, 0),
0
);
vec4 my = texelFetch(
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
qD.xyz,
ql.xyz,
oL.xyz,
my.xyz,
shape.x,
shape.y,
shape.z,
int(my.w),
oL.w,
qD.w,
ql.w,
texelFetch(lightsTex, ivec2(firstTexel + 5, 0), 0).xyz
);
}

float cS(int el, int mc) {
int iK = el + mc / 4;
vec4 packed = texelFetch(
iesProfileData,
ivec2(iK % iesProfileColumns, iK / iesProfileColumns),
0
);
return packed[mc % 4];
}

float lB(int el, vec2 uv) {
if (el < 0) return 1.0;
vec2 pixel = fract(uv) * 128.0 - 0.5;
ivec2 p0 = ivec2(floor(pixel));
vec2 f = fract(pixel);
int xa = p0.x < 0 ? 127 : p0.x;
int xb = p0.x >= 127 ? 0 : p0.x + 1;
int ya = p0.y < 0 ? 127 : p0.y;
int yb = p0.y >= 127 ? 0 : p0.y + 1;
float a = cS(el, ya * 128 + xa);
float b = cS(el, ya * 128 + xb);
float c = cS(el, yb * 128 + xa);
float d = cS(el, yb * 128 + xb);
return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float bP(Light light, vec3 dV) {
vec3 axis = normalize(light.u);
float ci = dot(axis, dV);
float vm = light.v.y > light.v.x + 1e-6
? smoothstep(light.v.x, light.v.y, ci)
: step(light.v.x, ci);
if (vm <= 0.0 || light.textureIndex < 0) return vm;
vec3 vK = light.iesReference;
vec3 xj = cross(axis, vK);
float vertical = acos(clamp(ci, -1.0, 1.0));
float horizontal = atan(dot(dV, xj), dot(dV, vK));
return vm * lB(light.textureIndex, vec2(vertical / PI, horizontal / TWOPI + 0.5));
}
`});var Ot=ii({uniforms:{materialBuffer:C.uniform("sampler2D"),materialBufferColumns:C.uniform("int",1),mapInfo:C.arrayUniform("vec4","NUM_MAPS"),mapTransform:C.arrayUniform("vec4","NUM_MAPS"),mapUvChannel:C.arrayUniform("float","NUM_MAPS"),mapColorLinear:C.arrayUniform("float","NUM_MAPS"),mapWrap:C.arrayUniform("vec2","NUM_MAPS"),map:C.uniform("sampler2DArray")},defines:{NUM_MATERIALS:1},main:K`
${ic()}
#ifdef HAS_GLTF_ANISOTROPY
vec2 fv(float roughness, float strength) {
if (strength == 0.0) { return vec2(roughness, 0.0); }
float u = roughness * roughness;
float a = u + (1.0 - u) * strength * strength;
if (a == 0.0) { return vec2(0.0); }
return vec2(pow((a*a + u*u) * 0.5, 0.25), clamp(1.0 - u/a, 0.0, 1.0));
}

#endif

vec3 mG(vec3 c) {
return mix(pow(c * 0.9478672986 + 0.0521327014, vec3(2.4)), c * 0.0773993808, vec3(lessThan(c, vec3(0.04045))));
}
vec4 fetchMatData(int i) {
return lm(materialBuffer, i, materialBufferColumns);
}


float mb(float alpha, int alphaMode, float alphaCutoff) {
if (alphaMode == ${It.opaque}) {
return 1.0;
}
if (alphaMode == ${It.mask}) {
return alpha >= alphaCutoff ? 1.0 : 0.0;
}
return alpha;
}

float xS(int idx) {
return fetchMatData(idx * MAT_DATA_SIZE + MAT_ROW_COLOR).w;
}

vec2 ah(int val) {
return vec2(float(val >> 8), float(val & 0xff) / 255.0);
}

#ifdef NUM_MAPS
vec3 decodeMapColor(int index, vec3 c) {
if (mapColorLinear[index] > 0.5) { return c; }
return mG(c);
}

vec2 jO(int index) {
return mapInfo[index].xy;
}

float lT(int index) {
return floor(mapInfo[index].z);
}

vec2 kt(int index) {
return vec2(fract(mapInfo[index].z), mapInfo[index].w);
}

float gg(float value, float mode) {
if (mode < 0.5) return fract(value);
if (mode < 1.5) return clamp(value, 0.0, 1.0);
return 1.0 - abs(1.0 - (value - 2.0 * floor(value * 0.5)));
}

vec2 kZ(int index, vec2 uv) {
vec4 transform = mapTransform[index];
vec2 value = uv * transform.xy + transform.zw;
return vec2(gg(value.x, mapWrap[index].x), gg(value.y, mapWrap[index].y));
}

vec2 tJ(int index, vec2 uv) {
vec2 rN = kZ(index, uv);
vec2 jH = 1.0 / vec2(textureSize(map, 0).xy);
vec2 eo = kt(index);
vec2 kS = jO(index) + jH;
vec2 pJ = eo - 0.5 * jH;
vec2 ml = eo + kS - jH;
return clamp(
pJ + rN * kS,
eo,
ml
);
}

vec2 getMapUvSet(int index, vec2 uv, vec2 uv1) {
return mapUvChannel[index] > 0.5 ? uv1 : uv;
}

vec4 fe(int index, ivec2 jJ, ivec2 size, ivec2 origin, vec2 modes) {
ivec2 p = clamp(jJ, ivec2(0), size - 1);
if (modes.x < 0.5) p.x = ((jJ.x % size.x) + size.x) % size.x;
if (modes.y < 0.5) p.y = ((jJ.y % size.y) + size.y) % size.y;
return texelFetch(map, ivec3(origin + p, int(lT(index))), 0);
}

vec4 sampleMap(int index, vec2 uv) {
ivec2 size = ivec2(round(jO(index) * vec2(textureSize(map, 0).xy) + 1.0));
vec2 dk = kZ(index, uv) * vec2(size) - 0.5;
vec2 modes = mapWrap[index];
if ((size.x > 1 && modes.x < 0.5 && (dk.x < 0.0 || dk.x > float(size.x - 1))) ||
(size.y > 1 && modes.y < 0.5 && (dk.y < 0.0 || dk.y > float(size.y - 1)))) {
ivec2 base = ivec2(floor(dk));
vec2 weight = fract(dk);
ivec2 origin = ivec2(round(kt(index) * vec2(textureSize(map, 0).xy) - 0.5));
return mix(
mix(fe(index, base, size, origin, modes), fe(index, base + ivec2(1, 0), size, origin, modes), weight.x),
mix(fe(index, base + ivec2(0, 1), size, origin, modes), fe(index, base + ivec2(1, 1), size, origin, modes), weight.x), weight.y);
}
return texture(map, vec3(tJ(index, uv), lT(index)));
}
#endif


vec2 aN(float roughness, float anisotropy) {
float alpha = roughness * roughness;
float qe = ROUGHNESS_MIN * ROUGHNESS_MIN;
if (anisotropy == 0.0) { return vec2(max(qe, alpha)); }
float dw = 1.0 - anisotropy;
float tp = alpha * sqrt(2.0 / (1.0 + dw * dw));
return max(vec2(qe), vec2(tp, dw * tp));
}

vec4 bF(int i);
vec3 lp(int instanceIndex) {
if (instanceIndex < 0) return vec3(1.0);
return bF(instanceIndex * ${$+""} + 9).rgb;
}

void dg(
inout OpenPbrResolvedMaterial mat,
int materialIndex,
vec2 uv,
vec2 uv1,
int instanceIndex,
vec3 vertexColor
) {
int i = materialIndex * MAT_DATA_SIZE;
vec4 pR = fetchMatData(i + MAT_ROW_COLOR);
vec4 fG = fetchMatData(i + MAT_ROW_ROUGHNESS_NORMAL);
vec4 gE = fetchMatData(i + MAT_ROW_METALLIC_MAPS);
vec4 hY = fetchMatData(i + MAT_ROW_EMISSION);
vec4 hm = fetchMatData(i + MAT_ROW_IOR_TRANSMISSION);
vec4 misc = fetchMatData(i + MAT_ROW_MISC);
vec4 ov = fetchMatData(i + MAT_ROW_ALPHA_FILM);
vec4 mB = fetchMatData(i + MAT_ROW_BASE_CONTROLS);
vec4 pV = fetchMatData(i + MAT_ROW_SPECULAR_FUZZ);
vec4 subsurface = fetchMatData(i + MAT_ROW_SUBSURFACE);
vec4 yj = fetchMatData(i + MAT_ROW_FUZZ);
vec4 xr = fetchMatData(i + MAT_ROW_COAT);
vec4 mC = fetchMatData(i + MAT_ROW_COAT_CONTROLS);
vec4 nV = fetchMatData(i + MAT_ROW_FILM_DISPERSION);
vec4 ou = fetchMatData(i + MAT_ROW_STANDALONE_MAPS);
int mapAlphaUsage = int(misc.a);

mat.baseColor = pR.rgb;
mat.materialType = int(pR.w);
mat.specularRoughness = fG.x;
mat.baseMetalness = gE.x;
mat.specularAnisotropy = clamp(gE.y, 0.0, 1.0);
mat.emission = hY.rgb;
mat.inside = false;
mat.specularIor = hm.x;
mat.transmissionWeight = hm.y;
#ifdef HAS_MEDIUM
mat.mediumType = int(hm.z);
#else
mat.mediumType = 0;
#endif
mat.thinWalled = hm.w > 0.5;
mat.bevel = misc.r;
mat.transmissionDispersionScale = misc.g;
mat.dispersionAbbeNumber = max(nV.y, 1e-6);
mat.thinFilmThickness = misc.b;
mat.thinFilmIor = ov.b;
mat.thinFilmWeight = clamp(nV.x, 0.0, 1.0);

mat.thinFilmThickness *= 1000.0;
mat.baseWeight = clamp(mB.x, 0.0, 1.0);
mat.diffuseRoughness = clamp(mB.y, 0.0, 1.0);
mat.specularWeight = max(0.0, mB.z);
mat.subsurfaceWeight = clamp(mB.w, 0.0, 1.0);
mat.specularColor = max(pV.rgb, vec3(0.0));
mat.fuzzWeight = clamp(pV.w, 0.0, 1.0);
mat.subsurfaceColor = max(subsurface.rgb, vec3(0.0));
mat.transmissionColor = max(fetchMatData(i + MAT_ROW_TRANSMISSION_COLOR).rgb, vec3(0.0));
mat.fuzzColor = max(yj.rgb, vec3(0.0));
mat.fuzzRoughness = clamp(yj.w, 0.0, 1.0);
mat.coatColor = max(xr.rgb, vec3(0.0));
mat.coatWeight = clamp(xr.w, 0.0, 1.0);
mat.coatRoughness = clamp(mC.x, ROUGHNESS_MIN, 1.0);
mat.coatAnisotropy = clamp(mC.y, 0.0, 1.0);
mat.coatIor = max(mC.z, 1.0);
mat.coatDarkening = clamp(mC.w, 0.0, 1.0);

#ifdef HAS_MEDIUM
mat.mediumExtinction = max(fetchMatData(i + MAT_ROW_MEDIUM_EXTINCTION).rgb, vec3(0.0));
mat.mediumAnisotropy = clamp(fetchMatData(i + MAT_ROW_MEDIUM_EXTINCTION).a, -1.0, 1.0);
mat.mediumScattering = max(fetchMatData(i + MAT_ROW_MEDIUM_SCATTERING).rgb, vec3(0.0));
mat.mediumType = max(max(mat.mediumExtinction.x, mat.mediumExtinction.y), mat.mediumExtinction.z) > 0.0 ? 1 : 0;
#endif


#ifdef HAS_ALPHA
mat.alpha = ov.r;
#else
mat.alpha = 1.0;
#endif

#ifdef NUM_DIFFUSE_MAPS
int diffuseMapIndex = int(gE.z);
if (diffuseMapIndex >= 0) {
vec4 diffuse = sampleMap(
diffuseMapIndex, getMapUvSet(diffuseMapIndex, uv, uv1)
);


mat.baseColor *= decodeMapColor(diffuseMapIndex, diffuse.rgb);


if (mapAlphaUsage == ${Pt.transmission+""}) {
mat.transmissionWeight = 1.0 - diffuse.a;
}
else if (mapAlphaUsage == ${Pt.alpha+""}) {
mat.alpha *= diffuse.a;
}
}
#endif

${Ve("alphaMap","glsl")}

mat.alpha = mb(
mat.alpha, int(fetchMatData(i + MAT_ROW_ALPHA).w), ou.w
);

${Ve("transmissionMap","glsl")}

#ifdef NUM_METALLIC_ROUGHNESS_MAPS
int metallicRoughnessMapIndex = int(gE.w);
if (metallicRoughnessMapIndex >= 0) {
vec4 gc = sampleMap(
metallicRoughnessMapIndex,
getMapUvSet(metallicRoughnessMapIndex, uv, uv1)
);
mat.baseMetalness *= gc.b;
mat.specularRoughness *= gc.g;
}
#endif

${Ve("roughnessMap","glsl")}

${Ve("metalnessMap","glsl")}

#ifdef NUM_EMISSIVE_MAPS
int emissiveMapIndex = int(hY.w);
if (emissiveMapIndex >= 0) {
vec3 emissive = sampleMap(
emissiveMapIndex, getMapUvSet(emissiveMapIndex, uv, uv1)
).rgb;
mat.emission *= decodeMapColor(emissiveMapIndex, emissive);
}
#endif

#ifdef NUM_COAT_WEIGHT_MAPS
int il = int(fetchMatData(i + MAT_ROW_LAYER_MAPS).x);
if (il >= 0 && mat.materialType == 0) {
float rA = clamp(xr.w, 0.0, 1.0) * sampleMap(
il, getMapUvSet(il, uv, uv1)
).r;
mat.emission *= mix(vec3(1.0), sqrt(max(xr.rgb, vec3(0.0))), rA);
}
#endif

${Ur("glsl")}

${Ve("coatWeightMap","glsl")}
#ifdef USE_COAT_NORMAL_FRAMES

mat.coatNormalEnabled = mat.coatWeight > 0.0 && (fG.y >= 0.0 || fetchMatData(i + MAT_ROW_LAYER_MAPS).z >= 0.0);
#endif

${Ve("coatRoughnessMap","glsl")}

${Ve("fuzzColorMap","glsl")}

${Ve("fuzzRoughnessMap","glsl")}

${Ve("specularWeightMap","glsl")}

${Ve("specularColorMap","glsl")}

vec4 lG = fetchMatData(i + MAT_ROW_DIRECTION_NORMAL);
mat.anisotropyDirection = vec2(1.0, 0.0);
mat.anisotropyDirectionEnabled = lG.y != 0.0;
mat.coatAnisotropyRotation = fetchMatData(i + MAT_ROW_FILM_TEXTURE).x;
#ifdef NUM_ANISOTROPY_MAPS
if (lG.x >= 0.0) {
int index = int(lG.x);
vec4 dk = sampleMap(index, getMapUvSet(index, uv, uv1));
mat.specularAnisotropy *= dk.b;
vec2 direction = dk.rg * 2.0 - 1.0;
if (dot(direction, direction) > 1e-4) mat.anisotropyDirection = normalize(direction);
mat.anisotropyDirectionEnabled = true;
}
#endif
#ifdef HAS_GLTF_ANISOTROPY
if (fetchMatData(i + MAT_ROW_FILM_TEXTURE).y > 0.5 && mat.specularAnisotropy > 0.0) {
vec2 tU = fv(clamp(mat.specularRoughness, 0.0, 1.0), mat.specularAnisotropy);
mat.specularRoughness = tU.x;
mat.specularAnisotropy = tU.y;
}
#endif
if (mat.anisotropyDirectionEnabled) {
float theta = lG.y;
vec2 d = mat.anisotropyDirection;
mat.anisotropyDirection = vec2(cos(theta)*d.x - sin(theta)*d.y, sin(theta)*d.x + cos(theta)*d.y);
}



if (mat.coatWeight > 0.0 && mat.coatRoughness > 0.0) {
float ih = mat.specularRoughness * mat.specularRoughness;
float ij = mat.coatRoughness * mat.coatRoughness;
mat.specularRoughness = mix(mat.specularRoughness,
pow(min(1.0, ih * ih + 2.0 * ij * ij), 0.25), mat.coatWeight);
}
vec3 color = lp(instanceIndex) * vertexColor;
mat.baseColor *= color;
if (mat.materialType == UNLIT) mat.emission *= color;

mat.specularRoughness = clamp(mat.specularRoughness, ROUGHNESS_MIN, 1.0);
mat.baseMetalness = clamp(mat.baseMetalness, 0.0, 1.0);
vec2 specularAlpha = aN(mat.specularRoughness, mat.specularAnisotropy);
mat.alphaX = specularAlpha.x;
mat.alphaY = specularAlpha.y;
}

#if defined(NUM_NORMAL_MAPS)
vec3 pd(int materialIndex, vec2 uv, vec3 normal, vec3 dp1, vec3 dp2, vec2 oW, vec2 oX) {
int i = materialIndex * MAT_DATA_SIZE;
vec4 fG = fetchMatData(i + MAT_ROW_ROUGHNESS_NORMAL);
int normalMapIndex = int(fG.y);
if (normalMapIndex >= 0) {



vec3 sb = cross(dp2, normal);
vec3 sa = cross(normal, dp1);
vec3 dpdu = sb * oW.x + sa * oX.x;
vec3 tH = sb * oW.y + sa * oX.y;
float ej = max(dot(dpdu, dpdu), dot(tH, tH));
if (ej > 1e-12) {
float tO = inversesqrt(ej);
dpdu *= tO;
tH *= tO;
}
else {



vec3 oo = abs(normal.z) < 0.999
? vec3(0.0, 0.0, 1.0)
: vec3(0.0, 1.0, 0.0);
dpdu = normalize(cross(oo, normal));
tH = cross(normal, dpdu);
}

vec3 n = 2.0 * sampleMap(normalMapIndex, uv).rgb - 1.0;
n.xy *= fG.zw;
n = normalize(n);

mat3 tbn = mat3(dpdu, tH, normal);

return normalize(tbn * n);
} else {
return normal;
}
}
#endif

`});function ll(i,e="",t="RAY_MAX_DISTANCE"){let A=K`
ivec3 vertexOffset = ivec3(floatBitsToInt(bF(bY * ${$}).y));
for (int k = 0; k < primitiveCount; k++) {
int triangleIndex = primitiveOffset + k;
${e}
vec4 r3 = dJ(triangleIndex);
ivec3 index = floatBitsToInt(r3.xyz) + vertexOffset;
fP tri = fP(
lm(positionBuffer, index.x, vertexColumns).xyz,
lm(positionBuffer, index.y, vertexColumns).xyz,
lm(positionBuffer, index.z, vertexColumns).xyz
);
eK hit = ga(o, d, tri, eq, gY, tMax);

if (hit.t > 0.0) {
tMax = hit.t;
vec3 e1 = tri.p1 - tri.p0;
vec3 e2 = tri.p2 - tri.p0;
vec3 faceNormal = normalize(cross(e1, e2));
int kP = int(ah(
floatBitsToInt(bF(bY * ${$}).z)
).x);
bool jd = fetchMatData(
kP * MAT_DATA_SIZE + MAT_ROW_ALPHA
).z > 0.5;
if (!doubleSided && !jd && dot(faceNormal, d) > 0.0) {
continue;
}

${i}
}
}
`;return K`
ivec2 stack[STACK_SIZE];
int top = -1;
int ud = -1;
float tMax = ${t};

vec3 o = ray.o;
vec3 d = ray.d;

bool sj = false;
vec3 hS;
vec3 aC;
ivec3 hK;

fP mk;


top = 0;
stack[0] = ivec2(0, -1);

int yk = 0;
while(top >= 0 && yk < 5000) {
yk++;
ivec2 node = stack[top--];

int bY = node.y;

if (bY != ud) {
if (bY < 0) {
o = ray.o;
d = ray.d;
}
else {
mat4 w2l = mat4(
bF(bY * ${$} + 1),
bF(bY * ${$} + 2),
bF(bY * ${$} + 3),
bF(bY * ${$} + 4)
);
o = (w2l * vec4(ray.o, 1.0)).xyz;
d = (w2l * vec4(ray.d, 0.0)).xyz;
}
eq = maxDimension(abs(d));
gY = nk(d, eq);
ud = bY;
}

int bw = bY < 0 ? 0 : blasOffset;
uint fY = bY < 0 ? 0u : floatBitsToUint(bF(bY * ${$}).x);
int he = int(fY >> 30u);
int fg = int(fY & 0x3fffffffu);
int primitiveCount = 0;
int primitiveOffset = 0;

if (he == 3) {
uint iw = uint(node.x);
if ((iw & 0x80000000u) != 0u) {
primitiveCount = int((iw >> 23u) & 0xffu);
primitiveOffset = bw + fg + int(iw & 0x007fffffu);
}
else {
int i = node.x + bw;
vec4 jZ = dJ(i);
vec4 fU = dJ(i + 1);
vec4 nS = dJ(i + 2);
vec4 nT = dJ(i + 3);
vec4 nU = dJ(i + 4);
uint header = floatBitsToUint(jZ.w);
int sH = int(header << 24u) >> 24;
int sI = int((header >> 8u) << 24u) >> 24;
int sJ = int((header >> 16u) << 24u) >> 24;
vec3 hZ = vec3(
uintBitsToFloat(uint(sH + 127) << 23u),
uintBitsToFloat(uint(sI + 127) << 23u),
uintBitsToFloat(uint(sJ + 127) << 23u)
);
uint childBase = floatBitsToUint(fU.x);
uint pM = floatBitsToUint(fU.y);
uint internalMask = header >> 24u;
uint vU = (d.x < 0.0 ? 4u : 0u) |
(d.y < 0.0 ? 2u : 0u) |
(d.z < 0.0 ? 1u : 0u);
uint gV[12] = uint[12](
floatBitsToUint(nS.x), floatBitsToUint(nS.y),
floatBitsToUint(nS.z), floatBitsToUint(nS.w),
floatBitsToUint(nT.x), floatBitsToUint(nT.y),
floatBitsToUint(nT.z), floatBitsToUint(nT.w),
floatBitsToUint(nU.x), floatBitsToUint(nU.y),
floatBitsToUint(nU.z), floatBitsToUint(nU.w)
);

for (int order = 7; order >= 0; order--) {
uint slot = uint(order) ^ vU;
uint tT = slot >= 4u
? floatBitsToUint(fU.w)
: floatBitsToUint(fU.z);
uint meta = (tT >> ((slot & 3u) * 8u)) & 0xffu;
if (meta == 0u) continue;
uint mI = (slot & 3u) * 8u;
uint lF = slot >> 2u;
vec3 uX = vec3(
float((gV[lF] >> mI) & 0xffu),
float((gV[2u + lF] >> mI) & 0xffu),
float((gV[4u + lF] >> mI) & 0xffu)
);
vec3 uW = vec3(
float((gV[6u + lF] >> mI) & 0xffu),
float((gV[8u + lF] >> mI) & 0xffu),
float((gV[10u + lF] >> mI) & 0xffu)
);
vec3 wN = jZ.xyz + uX * hZ;
vec3 wM = jZ.xyz + uW * hZ;
if (cU(o, d, wN, wM, tMax) <= 0.0) continue;
uint kb = meta & 0x1fu;
if (kb >= 24u) {
uint om = internalMask & ((1u << slot) - 1u);
uint un = childBase + rY(om);
stack[++top] = ivec2(
fg + int(un * 5u), bY
);
}
else {
uint triangleCount = rY(meta >> 5u);
uint sV = pM + kb;
uint wZ = 0x80000000u |
(triangleCount << 23u) |
(sV & 0x007fffffu);
stack[++top] = ivec2(int(wZ), bY);
}
}
}
}
else if (he == 2) {
int i = node.x + bw;
vec4 wP = dJ(i);
vec4 wQ = dJ(i + 1);
vec4 wR = dJ(i + 2);
vec4 wS = dJ(i + 3);
primitiveCount = int(floatBitsToUint(wR.w));
if (primitiveCount > 0) {
primitiveOffset = bw + fg + int(floatBitsToUint(wS.w));
}
else {
int left = fg + int(floatBitsToUint(wP.w) * 4u);
int right = fg + int(floatBitsToUint(wQ.w) * 4u);
float d0 = cU(o, d, wP.xyz, wQ.xyz, tMax);
float d1 = cU(o, d, wR.xyz, wS.xyz, tMax);
if (d0 > d1) {
if (d0 > 0.0) stack[++top] = ivec2(left, bY);
if (d1 > 0.0) stack[++top] = ivec2(right, bY);
}
else {
if (d1 > 0.0) stack[++top] = ivec2(right, bY);
if (d0 > 0.0) stack[++top] = ivec2(left, bY);
}
}
}
else if (he == 1) {
uint iw = uint(node.x);
if ((iw & 0x80000000u) != 0u) {
primitiveCount = int((iw >> 23u) & 0xffu);
primitiveOffset = bw + fg + int(iw & 0x007fffffu);
}
else {
int i = node.x + bw;
vec4 vJ = dJ(i);
vec4 sz = dJ(i + 1);
vec4 qR = dJ(i + 2);
vec4 oQ = dJ(i + 3);
vec3 nodeMin = vJ.xyz;
vec3 er = vec3(vJ.w, sz.x, sz.y);
uint mT[4] = uint[4](
floatBitsToUint(sz.z), floatBitsToUint(sz.w),
floatBitsToUint(qR.x), floatBitsToUint(qR.y)
);
vec4 wx = fp(floatBitsToUint(qR.z));
vec4 wy = fp(floatBitsToUint(qR.w));
vec4 wB = fp(floatBitsToUint(oQ.x));
vec4 wu = fp(floatBitsToUint(oQ.y));
vec4 wv = fp(floatBitsToUint(oQ.z));
vec4 ww = fp(floatBitsToUint(oQ.w));
vec3 gr = fo(d);
vec3 padding = fk(gr, o);
vec4 tx0 = (nodeMin.x + wx * er.x - o.x) * gr.x;
vec4 tx1 = (nodeMin.x + wu * er.x - o.x) * gr.x;
vec4 ty0 = (nodeMin.y + wy * er.y - o.y) * gr.y;
vec4 ty1 = (nodeMin.y + wv * er.y - o.y) * gr.y;
vec4 tz0 = (nodeMin.z + wB * er.z - o.z) * gr.z;
vec4 tz1 = (nodeMin.z + ww * er.z - o.z) * gr.z;
vec4 nJ = max(max((min(tx0, tx1) - vec4(padding.x)), (min(ty0, ty1) - vec4(padding.y))), (min(tz0, tz1) - vec4(padding.z)));
vec4 sY = min(min((max(tx0, tx1) + vec4(padding.x)), (max(ty0, ty1) + vec4(padding.y))), (max(tz0, tz1) + vec4(padding.z)));
vec4 distance = mix(sY, nJ, greaterThan(nJ, vec4(0.0)));
distance = mix(distance, vec4(-1.0), greaterThan(nJ, min(sY, vec4(tMax))));
float fq[4] = float[4](distance.x, distance.y, distance.z, distance.w);


for (int order = 0; order < 4; order++) {
float em = -1.0;
int eB = -1;
for (int child = 0; child < 4; child++) {
if (mT[child] != 0u && fq[child] > em) {
em = fq[child];
eB = child;
}
}
if (eB >= 0 && em > 0.0) {
uint oy = mT[eB];
int ki = int(oy);
if ((oy & 0x80000000u) == 0u) {
ki += fg;
}
stack[++top] = ivec2(ki, bY);
fq[eB] = -1.0;
}
}
}
}
else {
int i = node.x + bw;
vec4 r1 = dJ(i);
int bl = floatBitsToInt(r1.w);

if (bl >= 0) {
int left = node.x + 2;
int right = bl + fg;

float d0 = cU(o, d, dJ(left + bw).xyz, dJ(left + 1 + bw).xyz, tMax);
float d1 = cU(o, d, dJ(right + bw).xyz, dJ(right + 1 + bw).xyz, tMax);
if (d0 > d1) {
if (d0 > 0.0) {
stack[++top] = ivec2(left, bY);
}
if (d1 > 0.0) {
stack[++top] = ivec2(right, bY);
}
}
else {
if (d1 > 0.0) {
stack[++top] = ivec2(right, bY);
}
if (d0 > 0.0) {
stack[++top] = ivec2(left, bY);
}
}
}
else {
if (bY < 0) {
for (int k = 0; k < -bl; k++) {
vec4 r3 = dJ(i + 2 + k);
stack[++top] = ivec2(floatBitsToInt(r3.y), floatBitsToInt(r3.x));
}
}
else {
primitiveCount = -bl;
primitiveOffset = i + 2;
}
}
}
if (primitiveCount > 0) {
${A}
}
}
`}var Ft=ii({uniforms:{positionBuffer:C.uniform("sampler2D"),normalBuffer:C.uniform("sampler2D"),tangentBuffer:C.uniform("sampler2D"),uvBuffer:C.uniform("sampler2D"),uv1Buffer:C.uniform("sampler2D"),colorBuffer:C.uniform("sampler2D"),materialIndexBuffer:C.uniform("sampler2D"),bvhBuffer:C.uniform("sampler2D"),instancesBuffer:C.uniform("sampler2D"),bvhColumns:C.uniform("int",1),vertexColumns:C.uniform("int",1),instancesColumns:C.uniform("int",1),blasOffset:C.uniform("int"),isEmptyScene:C.uniform("bool")},main:K`

struct fP {
vec3 p0;
vec3 p1;
vec3 p2;
};
#ifdef NUM_LIGHTS
float hL(float rad, vec3 pos, Ray r) {
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

float og(vec3 pos, vec3 u, vec3 v, vec3 n, Ray r) {
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

float nr(Ray r, Light light, out LightSampleRec lightSample) {



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

d = og(pos, u, v, normal, r);
if (d < 0.) {
d = INF;
}
else {
float ci = dot(-r.d, normal);
float spread = light.spread;
if (ci >= cos(spread * PI / 2.0)) {
lightSample.pdf = (d * d) / (light.area * ci);
lightSample.emission = light.emission;
}
}
}
#endif
#ifdef HAS_SPHERE_LIGHTS
if (type == SPHERE_LIGHT) {
if (light.radius <= 0.0) {
vec3 kT = light.position - r.o;
float projection = dot(kT, r.d);
vec3 bk = kT - projection * r.d;
if (projection <= EPS || dot(bk, bk) > 1e-8) return INF;
d = projection;
lightSample.direction = r.d;
lightSample.normal = -r.d;
lightSample.dist = d;
lightSample.pdf = 1.0;
lightSample.isDelta = true;
} else {
d = hL(light.radius, light.position, r);
lightSample.isDelta = false;
}
if (d < 0.) {
d = INF;
}
else {
float ak = distance(r.o, light.position);
float cosThetaMax = ak <= light.radius
? -1.0
: sqrt(max(0.0, 1.0 - light.radius * light.radius / (ak * ak)));
if (light.radius > 0.0) {
lightSample.pdf = ak <= light.radius
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
vec3 kT = light.position - r.o;
float projection = dot(kT, r.d);
vec3 bk = kT - projection * r.d;
if (projection <= EPS || dot(bk, bk) > 1e-8) return INF;
d = projection;
lightSample.direction = r.d;
lightSample.normal = -r.d;
lightSample.dist = d;
lightSample.pdf = 1.0;
lightSample.isDelta = true;
} else {
d = hL(light.radius, light.position, r);
lightSample.isDelta = false;
}
if (d != INF) {
vec3 wW = r.o + d * r.d;
float nv = bP(light, normalize(r.o - wW));
if (nv <= 0.0) return INF;
float ak = distance(r.o, light.position);
float cosThetaMax = ak <= light.radius
? -1.0
: sqrt(max(0.0, 1.0 - light.radius * light.radius / (ak * ak)));
if (light.radius > 0.0) {
lightSample.pdf = ak <= light.radius
? INV4PI
: 1.0 / max(TWOPI * (1.0 - cosThetaMax), 1e-8);
}
lightSample.emission = light.emission * nv * (light.radius <= 0.0
? 1.0 / max(d * d, 1e-8)
: 1.0);
}
}
#endif

return d;
}
#endif

int fF(ivec4 m0, ivec4 m1, ivec4 m2, vec3 eU) {
vec2 m00 = ah(m0.x);
vec2 m01 = ah(m0.y);
vec2 m02 = ah(m0.z);
vec2 m10 = ah(m1.x);
vec2 m11 = ah(m1.y);
vec2 m12 = ah(m1.z);
vec2 m20 = ah(m2.x);
vec2 m21 = ah(m2.y);
vec2 m22 = ah(m2.z);
float w00 = m00.y * eU.x;
float w01 = m01.y * eU.x;
float w02 = m02.y * eU.x;
float w10 = m10.y * eU.y;
float w11 = m11.y * eU.y;
float w12 = m12.y * eU.y;
float w20 = m20.y * eU.z;
float w21 = m21.y * eU.z;
float w22 = m22.y * eU.z;

float hy = w00 + w01 + w02 + w10 + w11 + w12 + w20 + w21 + w22;

w00 = w00 / hy;
w01 = w01 / hy + w00;
w02 = w02 / hy + w01;
w10 = w10 / hy + w02;
w11 = w11 / hy + w10;
w12 = w12 / hy + w11;
w20 = w20 / hy + w12;
w21 = w21 / hy + w20;
w22 = w22 / hy + w21;

float rand = eC(0u);
float oh;
if (rand < w00) {
oh = m00.x;
} else if (rand < w01) {
oh = m01.x;
} else if (rand < w02) {
oh = m02.x;
} else if (rand < w10) {
oh = m10.x;
} else if (rand < w11) {
oh = m11.x;
} else if (rand < w12) {
oh = m12.x;
} else if (rand < w20) {
oh = m20.x;
} else if (rand < w21) {
oh = m21.x;
} else {
oh = m22.x;
}
return int(oh);
}


vec4 bF(int i);


mat2x3 eP(vec3 normal, vec3 dp1, vec3 dp2, vec2 oW, vec2 oX, vec4 aX) {
float determinant = oW.x * oX.y - oW.y * oX.x;
vec3 t = aX.xyz;
vec3 b = vec3(0.0);

float rF = abs(aX.w) > 1.5 ? 0.0 : aX.w;
if (abs(determinant) > 1e-12) {
vec3 dt = (dp1 * oX.y - dp2 * oW.y) / determinant;
vec3 db = (dp2 * oW.x - dp1 * oX.x) / determinant;
if (dot(t, t) < 1e-8) { t = dt; }
if (rF == 0.0) { rF = (dot(cross(normal, dt), db) < 0.0 ? -1.0 : 1.0); }
}
t -= normal * dot(normal, t);
if (dot(t, t) < 1e-8) {
float iI = (normal.z >= 0.0 ? 1.0 : -1.0);
float cL = -1.0 / (iI + normal.z);
float xy = normal.x * normal.y * cL;
t = vec3(1.0 + iI * normal.x * normal.x * cL, iI * xy, -iI * normal.x);
b = vec3(xy, iI + normal.y * normal.y * cL, -normal.y);
}
else { t = normalize(t); b = normalize(cross(normal, t)); }
return mat2x3(t, b * (rF < 0.0 ? -1.0 : 1.0));
}

void hH(inout SurfaceInteraction si, fP tri, vec3 barycentric, ivec3 index) {
si.hit = true;
si.position = barycentric.x * tri.p0 + barycentric.y * tri.p1 + barycentric.z * tri.p2;
ivec2 i0 = hd(index.x, vertexColumns);
ivec2 i1 = hd(index.y, vertexColumns);
ivec2 i2 = hd(index.z, vertexColumns);
si.vertexColor = vec3(1.0);
#ifdef USE_VERTEX_COLOR
si.vertexColor = barycentric.x * texelFetch(colorBuffer, i0, 0).rgb
+ barycentric.y * texelFetch(colorBuffer, i1, 0).rgb
+ barycentric.z * texelFetch(colorBuffer, i2, 0).rgb;
#endif

vec3 n0 = texelFetch(normalBuffer, i0, 0).xyz;
vec3 n1 = texelFetch(normalBuffer, i1, 0).xyz;
vec3 n2 = texelFetch(normalBuffer, i2, 0).xyz;
vec3 normal = normalize(barycentric.x * n0 + barycentric.y * n1 + barycentric.z * n2);
si.vertexNormal = normal;





vec3 geometricNormal = normalize(cross(tri.p1 - tri.p0, tri.p2 - tri.p0));
vec3 kR = barycentric.x * n0 + barycentric.y * n1 + barycentric.z * n2;
float a = dot(n2 - n0, tri.p0 - tri.p2);
float b = dot(n2 - n1, tri.p1 - tri.p2);
float c = dot(n1 - n0, tri.p1 - tri.p0);
float h = a * barycentric.x * (barycentric.x - 1.0)
+ (a + b + c) * barycentric.x * barycentric.y
+ b * barycentric.y * (barycentric.y - 1.0);
if (dot(kR, geometricNormal) > 0.0) {
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
si.shadowOffset = kR * h;


ivec4 m0 = ivec4(texelFetch(materialIndexBuffer, i0, 0));
ivec4 m1 = ivec4(texelFetch(materialIndexBuffer, i1, 0));
ivec4 m2 = ivec4(texelFetch(materialIndexBuffer, i2, 0));

if (m0.x > 0 || m1.x > 0 || m2.x > 0) {
si.materialIndex = fF(m0, m1, m2, barycentric);
}

vec2 uv0 = texelFetch(uvBuffer, i0, 0).xy;
vec2 uv1 = texelFetch(uvBuffer, i1, 0).xy;
vec2 uv2 = texelFetch(uvBuffer, i2, 0).xy;
#if defined(NUM_DIFFUSE_MAPS) || defined(NUM_NORMAL_MAPS) || defined(NUM_METALLIC_ROUGHNESS_MAPS) || defined(NUM_ROUGHNESS_MAPS) || defined(NUM_METALNESS_MAPS) || defined(NUM_EMISSIVE_MAPS) || defined(NUM_THIN_FILM_MAPS) || defined(NUM_ANISOTROPY_MAPS) || defined(NUM_COAT_NORMAL_MAPS)
vec2 uv = barycentric.x * uv0 + barycentric.y * uv1 + barycentric.z * uv2;
vec2 secondaryUv0 = texelFetch(uv1Buffer, i0, 0).xy;
vec2 secondaryUv1 = texelFetch(uv1Buffer, i1, 0).xy;
vec2 secondaryUv2 = texelFetch(uv1Buffer, i2, 0).xy;
vec2 dj = barycentric.x * secondaryUv0
+ barycentric.y * secondaryUv1
+ barycentric.z * secondaryUv2;

vec4 mw = fetchMatData(si.materialIndex * MAT_DATA_SIZE + MAT_ROW_UV);
int uvProjection = int(mw.r);
if (uvProjection > 0) {
uv = gU(uvProjection, si.position, normal, mw.zw);
dj = uv;
} else {
uv *= mw.zw;
dj *= mw.zw;
}
#else
vec2 uv = vec2(0.0);
vec2 dj = vec2(0.0);
#endif

#ifdef USE_COAT_NORMAL_FRAMES
si.coatNormal = normal;
#ifdef NUM_COAT_NORMAL_MAPS
float pQ = fetchMatData(si.materialIndex * MAT_DATA_SIZE + MAT_ROW_LAYER_MAPS).z;
#endif
#endif
vec4 directionMaterial = fetchMatData(si.materialIndex * MAT_DATA_SIZE + MAT_ROW_DIRECTION_NORMAL);
float uL = fetchMatData(si.materialIndex * MAT_DATA_SIZE + MAT_ROW_FILM_TEXTURE).x;
if (directionMaterial.x >= 0.0 || directionMaterial.y != 0.0 || uL != 0.0
#ifdef USE_COAT_NORMAL_FRAMES
|| fetchMatData(si.materialIndex * MAT_DATA_SIZE + MAT_ROW_COAT).w > 0.0
#endif
) {
vec3 dp1 = tri.p0 - tri.p2;
vec3 dp2 = tri.p1 - tri.p2;
vec4 aX = vec4(0.0);
#ifdef USE_TANGENT
aX = barycentric.x * texelFetch(tangentBuffer, i0, 0)
+ barycentric.y * texelFetch(tangentBuffer, i1, 0)
+ barycentric.z * texelFetch(tangentBuffer, i2, 0);
#endif
mat2x3 fc = eP(normal, dp1, dp2, uv0-uv2, uv1-uv2, aX);
si.geometryTangent = fc[0];
si.geometryBitangent = fc[1];
mat2x3 gm = fc;
#ifdef NUM_ANISOTROPY_MAPS
if (directionMaterial.x >= 0.0 && mapUvChannel[int(directionMaterial.x)] > 0.5) {
vec2 a = texelFetch(uv1Buffer, i0, 0).xy;
vec2 b = texelFetch(uv1Buffer, i1, 0).xy;
vec2 c = texelFetch(uv1Buffer, i2, 0).xy;
gm = eP(normal, dp1, dp2, a-c, b-c, (aX.w == 0.0 ? vec4(0.0) : aX));
}
#endif
si.directionTangent = gm[0];
si.directionBitangent = gm[1];
#if defined(USE_COAT_NORMAL_FRAMES) && defined(NUM_COAT_NORMAL_MAPS)
if (pQ >= 0.0) {
int lg = int(pQ);
mat2x3 mU = fc;
if (mapUvChannel[lg] > 0.5) {
vec2 a = texelFetch(uv1Buffer, i0, 0).xy;
vec2 b = texelFetch(uv1Buffer, i1, 0).xy;
vec2 c = texelFetch(uv1Buffer, i2, 0).xy;
mU = eP(normal, dp1, dp2, a-c, b-c,
aX.w == 0.0 ? vec4(0.0) : aX);
}
vec3 decoded = sampleMap(lg, getMapUvSet(lg, uv, dj)).rgb * 2.0 - 1.0;
vec3 mapped = mU[0] * decoded.x * directionMaterial.z
+ mU[1] * decoded.y * directionMaterial.w + normal * decoded.z;
if (dot(mapped, mapped) > 1e-12) { si.coatNormal = normalize(mapped); }
}
#endif
}

si.uv = uv;
si.uv1 = dj;

#ifdef USE_TANGENT
vec3 t0 = texelFetch(tangentBuffer, i0, 0).xyz;
vec3 t1 = texelFetch(tangentBuffer, i1, 0).xyz;
vec3 t2 = texelFetch(tangentBuffer, i2, 0).xyz;
si.tangent = normalize(barycentric.x * t0 + barycentric.y * t1 + barycentric.z * t2);
#endif
#if defined(NUM_NORMAL_MAPS)
vec3 dp1 = tri.p0 - tri.p2;
vec3 dp2 = tri.p1 - tri.p2;
vec2 oW = uv0 - uv2;
vec2 oX = uv1 - uv2;
si.normal = pd(
si.materialIndex, uv, normal, dp1, dp2, oW, oX
);
#else
si.normal = normal;
#endif
}

struct eK {
float t;
vec3 barycentric;
};

vec4 dJ(int i) {
return lm(bvhBuffer, i, bvhColumns);
}

vec4 bF(int i) {
return lm(instancesBuffer, i, instancesColumns);
}



uint rY(uint value) {
value -= (value >> 1u) & 0x55555555u;
value = (value & 0x33333333u) + ((value >> 2u) & 0x33333333u);
value = (value + (value >> 4u)) & 0x0f0f0f0fu;
return (value * 0x01010101u) >> 24u;
}

vec4 fp(uint mE) {
return vec4(
float(mE & 0xffu),
float((mE >> 8u) & 0xffu),
float((mE >> 16u) & 0xffu),
float(mE >> 24u)
) / 255.0;
}




eK ga(vec3 o, vec3 d, fP tri, int eq, vec3 gY, float tMax) {
eK ti;


vec3 p0t = tri.p0 - o;
vec3 p1t = tri.p1 - o;
vec3 p2t = tri.p2 - o;


if (eq == 0) {
p0t = p0t.yzx;
p1t = p1t.yzx;
p2t = p2t.yzx;
} else if (eq == 1) {
p0t = p0t.zxy;
p1t = p1t.zxy;
p2t = p2t.zxy;
}


p0t.xy += gY.xy * p0t.z;
p1t.xy += gY.xy * p1t.z;
p2t.xy += gY.xy * p2t.z;


vec3 e = vec3(
p1t.x * p2t.y - p1t.y * p2t.x,
p2t.x * p0t.y - p2t.y * p0t.x,
p0t.x * p1t.y - p0t.y * p1t.x
);

#ifdef DEPTH_QUERY_MODE
vec3 sF = abs(vec3(p1t.x * p2t.y, p2t.x * p0t.y, p0t.x * p1t.y))
+ abs(vec3(p1t.y * p2t.x, p2t.y * p0t.x, p0t.y * p1t.x));
e = mix(e, vec3(0.0), lessThanEqual(abs(e), sF * 1e-6));
#endif


if (any(lessThan(e, vec3(0))) && any(greaterThan(e, vec3(0)))) {
return ti;
}

float det = e.x + e.y + e.z;
#ifdef DEPTH_QUERY_MODE
if (det == 0.0) return ti;
#endif

p0t.z *= gY.z;
p1t.z *= gY.z;
p2t.z *= gY.z;
float sw = (e.x * p0t.z + e.y * p1t.z + e.z * p2t.z);


if (abs(sw) > abs(tMax * det)) {
return ti;
}

float tN = 1. / det;
ti.t = sw * tN;
ti.barycentric = e * tN;

return ti;
}

struct Box {
vec3 min;
vec3 max;
};


vec3 fo(vec3 d) {
#ifdef DEPTH_QUERY_MODE
vec3 aq = mix(d, mix(vec3(1e-20), vec3(-1e-20), lessThan(d, vec3(0.0))), lessThan(abs(d), vec3(1e-20)));
return 1.0 / aq;
#else
return 1.0 / d;
#endif
}

vec3 fk(vec3 gr, vec3 o) {
#ifdef DEPTH_QUERY_MODE
return abs(gr) * max(vec3(1.0), abs(o)) * 1e-6;
#else
return vec3(0.0);
#endif
}



float cU(vec3 o, vec3 d, vec3 xq, vec3 xp, float tMax) {
#ifdef DEPTH_QUERY_MODE
vec3 gr = fo(d);
vec3 wG = (xq - o) * gr;
vec3 wI = (xp - o) * gr;
vec3 padding = fk(gr, o);
#else
vec3 wG = (xq - o) / d;
vec3 wI = (xp - o) / d;
vec3 padding = vec3(0.0);
#endif
vec3 nJ = min(wG, wI) - padding;
vec3 sY = max(wG, wI) + padding;
float t0 = max(nJ.x, max(nJ.y, nJ.z));
float t1 = min(sY.x, min(sY.y, sY.z));

return (t0 > t1 || t0 > tMax) ? -1.0 : (t0 > 0.0 ? t0 : t1);
}

int maxDimension(vec3 v) {
return v.x > v.y ? (v.x > v.z ? 0 : 2) : (v.y > v.z ? 1 : 2);
}

vec3 nk(vec3 d, int eq) {


if (eq == 0) {
return vec3(-d.y, -d.z, 1.0) / d.x;
} else if (eq == 1) {
return vec3(-d.z, -d.x, 1.0) / d.y;
} else {
return vec3(-d.x, -d.y, 1.0) / d.z;
}
}


void intersectScene(in Ray ray, inout SurfaceInteraction si, bool doubleSided) {
si.hit = false;

if (isEmptyScene) {
return;
}

int eq = maxDimension(abs(ray.d));
vec3 gY = nk(ray.d, eq);
int ap;

${ll(K`
si.triangleIndex = triangleIndex;
mk = tri;
hS = faceNormal;
aC = hit.barycentric;
hK = index;
sj = true;
ap = bY;
`)}

if (sj) {
si.instanceIndex = ap;
si.materialIndex = int(ah(floatBitsToInt(bF(ap * ${$}).z)).x);

hH(si, mk, aC, hK);
mat4 l2w = mat4(
bF(ap * ${$} + 5),
bF(ap * ${$} + 6),
bF(ap * ${$} + 7),
bF(ap * ${$} + 8)
);
mat4 w2l = mat4(
bF(ap * ${$} + 1),
bF(ap * ${$} + 2),
bF(ap * ${$} + 3),
bF(ap * ${$} + 4)
);
mat3 aH = transpose(mat3(w2l));
si.faceNormal = normalize(aH * hS);
si.vertexNormal = normalize(aH * si.vertexNormal);
si.normal = normalize(aH * si.normal);
#ifdef USE_COAT_NORMAL_FRAMES
si.coatNormal = normalize(aH * si.coatNormal);
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


void intersectSceneBevel(in Ray ray, inout SurfaceInteraction si, int instanceIndex, float maxDistance) {
si.hit = false;

if (isEmptyScene) {
return;
}

bool doubleSided = true;
int eq = maxDimension(abs(ray.d));
vec3 gY = nk(ray.d, eq);
int ap;

${ll(K`
si.triangleIndex = triangleIndex;
mk = tri;
hS = faceNormal;
aC = hit.barycentric;
hK = index;
sj = true;
ap = bY;
`,K`
if (bY != instanceIndex) {
continue;
}
`,"maxDistance")}

if (sj) {
si.instanceIndex = ap;
si.materialIndex = int(ah(floatBitsToInt(bF(ap * ${$}).z)).x);
hH(si, mk, aC, hK);
mat4 l2w = mat4(
bF(ap * ${$} + 5),
bF(ap * ${$} + 6),
bF(ap * ${$} + 7),
bF(ap * ${$} + 8)
);
mat4 w2l = mat4(
bF(ap * ${$} + 1),
bF(ap * ${$} + 2),
bF(ap * ${$} + 3),
bF(ap * ${$} + 4)
);
mat3 aH = transpose(mat3(w2l));
si.faceNormal = normalize(aH * hS);
si.vertexNormal = normalize(aH * si.vertexNormal);
si.normal = normalize(aH * si.normal);
#ifdef USE_COAT_NORMAL_FRAMES
si.coatNormal = normalize(aH * si.coatNormal);
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

bool intersectSceneShadow(in Ray ray, float lightDistance, int kn) {

if (isEmptyScene) {
return false;
}

bool doubleSided = true;
int eq = maxDimension(abs(ray.d));
vec3 gY = nk(ray.d, eq);

${ll(K`


bool jS = true;
vec3 barycentric = hit.barycentric;
vec3 position = barycentric.x * tri.p0 + barycentric.y * tri.p1 + barycentric.z * tri.p2;

if (jS) {
#ifdef HAS_ALPHA
int materialIndex = int(ah(floatBitsToInt(bF(bY * ${$}).z)).x);
ivec2 i0 = hd(index.x, vertexColumns);
ivec2 i1 = hd(index.y, vertexColumns);
ivec2 i2 = hd(index.z, vertexColumns);
ivec4 m0 = ivec4(texelFetch(materialIndexBuffer, i0, 0));
ivec4 m1 = ivec4(texelFetch(materialIndexBuffer, i1, 0));
ivec4 m2 = ivec4(texelFetch(materialIndexBuffer, i2, 0));

if (m0.x > 0 || m1.x > 0 || m2.x > 0) {
materialIndex = fF(m0, m1, m2, barycentric);
}

int ii = materialIndex * MAT_DATA_SIZE;
int mapAlphaUsage = int(fetchMatData(ii + MAT_ROW_MISC).a);
float alpha = fetchMatData(ii + MAT_ROW_ALPHA_FILM).r;
#ifdef NUM_DIFFUSE_MAPS
if (mapAlphaUsage == ${Pt.alpha+""}) {
int diffuseMapIndex = int(fetchMatData(ii + MAT_ROW_METALLIC_MAPS).z);
if (diffuseMapIndex >= 0) {
vec2 uv0 = texelFetch(uvBuffer, i0, 0).xy;
vec2 uv1 = texelFetch(uvBuffer, i1, 0).xy;
vec2 uv2 = texelFetch(uvBuffer, i2, 0).xy;
vec2 uv = barycentric.x * uv0 + barycentric.y * uv1 + barycentric.z * uv2;
vec4 mw = fetchMatData(ii + MAT_ROW_UV);
int uvProjection = int(mw.r);
if (uvProjection > 0) {
uv = gU(uvProjection, position, hS, mw.zw);
} else {
uv *= mw.zw;
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
vec4 mw = fetchMatData(ii + MAT_ROW_UV);
int uvProjection = int(mw.r);
if (uvProjection > 0) {
uv = gU(uvProjection, position, hS, mw.zw);
} else {
uv *= mw.zw;
}
alpha *= sampleMap(alphaMapIndex, uv).g;
}
#endif
float alphaCutoff = fetchMatData(ii + MAT_ROW_STANDALONE_MAPS).a;
alpha = mb(
alpha, int(fetchMatData(ii + MAT_ROW_ALPHA).w), alphaCutoff
);
if (eC(0u) > alpha) {

tMax = min(max(lightDistance, 0.0), RAY_MAX_DISTANCE);
jS = false;
}
#endif
}
if (jS) {
return true;
}
`,K`
if (triangleIndex == kn) {
continue;
}
`,"min(max(lightDistance, 0.0), RAY_MAX_DISTANCE)")}
return false;
}
`});var Oi=K`
vec2 sphericalProjection(vec3 pos) {
vec3 n = normalize(pos);
float theta = atan(n.x, n.z) / (2.0 * PI) + 0.5;
float phi = acos(n.y) / PI;
return vec2(theta, 1.0 - phi);
}

vec2 jh(vec3 pos, vec3 normal, vec2 uvScale) {
vec3 dI = abs(normal);
vec2 uv = vec2(0.0);
if (dI.x > dI.y && dI.x > dI.z) {
uv = pos.yz;
} else if (dI.y > dI.x && dI.y > dI.z) {
uv = pos.xz;
} else {
uv = pos.xy;
}
return fract(uv * uvScale);
}

































vec2 hT(vec3 pos, vec3 normal) {
float theta = atan(pos.z, pos.x) / (2.0 * PI) + 0.5;
return vec2(theta, pos.y);
}

vec2 gU(int fE, vec3 pos, vec3 normal, vec2 uvScale) {
if (fE == ${ot.triplanar+""}) {
return jh(pos, normal, uvScale);
} else if (fE == ${ot.spherical+""}) {
return sphericalProjection(pos) * uvScale;
} else if (fE == ${ot.cylindrical+""}) {
return hT(pos, normal) * uvScale;
}
return vec2(0.0);
}
`;var Hu=`
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



uvec2 aZ;
uint aQ;
uint bT = 0u;
uint cP = 0u;
uint dG(uint kW) {
uint x = kW;
x ^= x >> 16u; x *= 0x7feb352du;
x ^= x >> 15u; x *= 0x846ca68bu;
return x ^ (x >> 16u);
}
uint ar(uint a, uint b) {
return dG(a ^ dG(b + 0x9e3779b9u));
}
uint iV(uint kW, uint seed) {
uint x = kW + seed;
x ^= x * 0x6c50b47cu; x ^= x * 0xb82f1e52u;
x ^= x * 0xc7afe638u; x ^= x * 0x8d22f6e6u;
return x;
}
uint ua(uint x, uint seed) {
return reverseBits(iV(reverseBits(x), seed));
}

uint su(uint kW) {
uint r = reverseBits(kW);
${Dn.map(([i,e])=>`r ^= (r << ${i}u) & 0x${e.toString(16)}u;`).join(`
  `)}
return r;
}
vec2 xE(uint index, uint seed) {
uint i = ua(index, ar(seed, 0u));
uint x = reverseBits(iV(i, ar(seed, 1u)));
uint y = ua(su(i), ar(seed, 2u));
return vec2(float(x >> 8u), float(y >> 8u)) * (1.0 / 16777216.0);
}
uint uR(uvec2 p) {
uvec2 v = p & uvec2(255u);
v = (v | (v << uvec2(4u))) & uvec2(0x0f0fu);
v = (v | (v << uvec2(2u))) & uvec2(0x3333u);
v = (v | (v << uvec2(1u))) & uvec2(0x5555u);
return v.x | (v.y << 1u);
}
${Pn.map((i,e)=>`const uint Z_PERM_${e} = ${i}u;`).join(`
`)}
uint la(uint uU) {
uint group = uU >> 2u;
uint word = Z_PERM_5;
${[0,1,2,3,4].map(i=>`word = group == ${i}u ? Z_PERM_${i} : word;`).join(`
  `)}
return (word >> ((uU & 3u) * 8u)) & 255u;
}
uint qS(uint lu, uint dim, uint logSPP) {
uint odd = logSPP & 1u;
uint vN = 8u + ((logSPP + 1u) >> 1u);
uint result = 0u;
for (int digit = int(vN) - 1; digit >= int(odd); digit--) {
uint shift = 2u*uint(digit) - odd;

uint tL = 0u;
if (shift < 30u) { tL = lu >> (shift + 2u); }
uint uU = (dG(tL ^ (0x55555555u * dim)) >> 24u) % 24u;
uint d = (lu >> shift) & 3u;
result |= ((la(uU) >> (2u*d)) & 3u) << shift;
}
if (odd != 0u) {
result |= (lu & 1u) ^ (dG((lu >> 1u) ^ (0x55555555u * dim)) & 1u);
}
return result;
}



uint cE(uint slot) {
return CAMERA_BEVEL_BASE + uint(BEVEL_SAMPLES) + bT * BOUNCE_STRIDE + slot;
}

uvec4 hA;
uint hB;
bool fQ = false;
bool dv = false;
uint dQ;
uint gK;
vec2 fa;
void dN(uint dim) {

uint kI = aZ.x + aZ.y * uint(round(1.0 / pixelSize.x));
uvec4 key = uvec4(dim, aQ, kI, uint(sequenceSeed));
if (fQ && all(equal(hA, key)) && hB == uint(zSobolLogSPP)) { return; }
hA = key; hB = uint(zSobolLogSPP);
fQ = true; dv = false;
uint seed = ar(ar(kI, dim), uint(sequenceSeed));
uint index = aQ;
if (samplingPattern == 1) {
uint logSPP = uint(zSobolLogSPP);
if (index == 0u) { logSPP = 0u; }
else { index -= 1u; }

uint jw = index >> logSPP;
uint mask = (1u << logSPP) - 1u;
uint lu = (uR(aZ) << logSPP) | (index & mask);
index = qS(lu, dim, logSPP);
uvec2 tile = aZ >> uvec2(8u);
seed = ar(ar(dim, uint(sequenceSeed)), ar(tile.x, tile.y));

if (aQ != 0u) { jw += 1u; }
seed = ar(seed, jw);
}
dQ = ua(index, ar(seed, 0u));
gK = seed;
uint x = reverseBits(iV(dQ, ar(seed, 1u)));
fa.x = float(x >> 8u) * (1.0 / 16777216.0);
}
vec2 lC(uint dim) {
dN(dim);
if (!dv) {
uint y = ua(su(dQ), ar(gK, 2u));
fa.y = float(y >> 8u) * (1.0 / 16777216.0);
dv = true;
}
return EPS + (1.0 - 2.0*EPS) * fa;
}
float dp(uint dim) {
if (samplingPattern == 2) { return EPS + (1.0 - 2.0*EPS)*rand(); }
dN(dim);
return EPS + (1.0 - 2.0*EPS) * fa.x;
}
vec2 dZ(uint dim) {
if (samplingPattern == 2) {
float x = dp(dim); float y = dp(dim);
return vec2(x,y);
}
return lC(dim);
}

float eC(uint slot) {
uint dim = ar(ar(bT, slot), cP) | 0x80000000u;
cP += 1u;
if (samplingPattern == 2) { return EPS + (1.0 - 2.0*EPS)*rand(); }

uint kI = aZ.x + aZ.y * uint(round(1.0 / pixelSize.x));
uint seed = ar(ar(kI, dim), uint(sequenceSeed));
uint i = ua(aQ, ar(seed, 0u));
uint x = reverseBits(iV(i, ar(seed, 1u)));
return EPS + (1.0 - 2.0*EPS) * (float(x >> 8u) * (1.0 / 16777216.0));
}
`;var Nt=ii({uniforms:{samplingPattern:C.uniform("int",0),sequenceSeed:C.uniform("int",0),zSobolLogSPP:C.uniform("int",0)},main:K`

${Hu}

void rG() {
aZ = uvec2(v_Texcoord / pixelSize);
aQ = uint(sampleCount);
bT = 0u; cP = 0u;
}

vec2 tg() {
if (samplingPattern == 0 || samplingPattern == 1) {
return (dZ(CAMERA_PIXEL) - 0.5) * pixelSize;
}
return jitter;
}
`});var la=`
Ray fj(vec2 coord) {
vec4 origin = viewProjectionInv * vec4(coord * 2.0 - 1.0, -1.0, 1.0);
vec4 target = viewProjectionInv * vec4(coord * 2.0 - 1.0, 1.0, 1.0);
Ray cam;
gC(cam, origin.xyz / origin.w, normalize(target.xyz * origin.w - origin.xyz * target.w));

return cam;
}

vec2 kN(vec2 p) {
p = 2.0 * p - 1.0;
bool greater = abs(p.x) > abs(p.y);
float r = greater ? p.x : p.y;
float theta = greater ? 0.25 * PI * p.y / p.x : PI * (0.5 - 0.25 * p.x / p.y);
return r * vec2(cos(theta), sin(theta));
}

Ray oG() {
Ray cam = fj(v_Texcoord + tg());
if (cameraApertureRadius > 0.0) {

vec3 eye = viewInv[3].xyz;
vec3 forward = -normalize(viewInv[2].xyz);
vec3 jN = eye + cam.d * (cameraFocusDistance / dot(cam.d, forward));
vec2 sK = cameraApertureRadius * kN(dZ(CAMERA_LENS));
vec3 origin = vec3(viewInv * vec4(sK, 0.0, 1.0));
gC(cam, origin, normalize(jN - origin));
}
return cam;
}
`;var Fi=K`
uvec4 s0;

void gW(vec2 p, int frame) {

s0 = uvec4(p, uint(frame), uint(p.x) + uint(p.y));
}


void xd(inout uvec4 v) {
v = v * 1664525u + 1013904223u;
v.x += v.y*v.w; v.y += v.z*v.x; v.z += v.x*v.y; v.w += v.y*v.z;
v = v ^ (v>>16u);
v.x += v.y*v.w; v.y += v.z*v.x; v.z += v.x*v.y; v.w += v.y*v.z;
}

float rand() {
xd(s0); return float(s0.x)/float(0xffffffffu);
}

`;var rh=`
uint ke(int index) { ivec2 size = textureSize(aovScene,0); uvec4 v = texelFetch(aovScene, ivec2((index/4)%size.x, (index/4)/size.x),0); return v[index%4]; }
vec3 iN(int offset){return vec3(uintBitsToFloat(ke(offset)),uintBitsToFloat(ke(offset+1)),uintBitsToFloat(ke(offset+2)));}
mat4 ow(int offset) { mat4 m; for (int i=0;i<4;i++) for(int j=0;j<4;j++) m[i][j]=uintBitsToFloat(ke(offset+i*4+j)); return m; }
Ray wJ(vec2 uv) {
vec4 origin = viewProjectionInv*vec4(uv*2.0-1.0,-1.0,1.0);
vec4 target = viewProjectionInv*vec4(uv*2.0-1.0,1.0,1.0);
Ray ray; gC(ray, origin.xyz/origin.w, normalize(target.xyz*origin.w-origin.xyz*target.w)); return ray;
}
bool mQ(Ray wX, out SurfaceInteraction si, out OpenPbrResolvedMaterial material) {
Ray ray=wX; si.triangleIndex=-1;
for(int layer=0;layer<32;layer++) {
intersectScene(ray,si,false); if(!si.hit) return false;
dg(material,si.materialIndex,si.uv,si.uv1,si.instanceIndex,si.vertexColor);
if(material.materialType!=SHADOW_CATCHER && material.alpha>=0.5) return true;
ray.o=si.position+ray.d*(EPS*0.02);
}
return false;
}
`;function cl(i){let e=new we({name:i?"AOV center":"AOV accumulation",outputs:i?["id","motion"]:["geometry","position","diffuse","specular"],outputTypes:i?{id:"uvec4"}:{},defines:{DEPTH_QUERY_MODE:!0},includes:[Lt,Ot,Ft,Nt],uniforms:{viewProjectionInv:C.uniform("mat4"),viewInv:C.uniform("mat4"),cameraApertureRadius:C.uniform("float",0),cameraFocusDistance:C.uniform("float",10),viewportSize:C.uniform("vec2"),aovScene:C.uniform("usampler2D"),previousId:C.uniform("usampler2D"),previousMotion:C.uniform("sampler2D"),previousGeometry:C.uniform("sampler2D"),previousPosition:C.uniform("sampler2D"),previousDiffuse:C.uniform("sampler2D"),previousSpecular:C.uniform("sampler2D"),openPbrEnergyLut:C.uniform("sampler2D"),aovMask:C.uniform("int",0),aovSample:C.uniform("int",0)},main:`
${Li}
${Fi}
${Nt.main}
${Lt.main}
${Oi}
${Ot.main}
${Ft.main}
${la}
${i?"":oa+ls+Gu}
${rh}
void main() {
${i?`
out_id=uvec4(0xffffffffu); out_motion=vec4(0.0);
Ray ray=wJ((floor(gl_FragCoord.xy)+0.5)/viewportSize);
SurfaceInteraction si; OpenPbrResolvedMaterial material;
if(!mQ(ray,si,material)) return;
int offset=52+si.instanceIndex*24;
out_id=uvec4(ke(offset),ke(offset+1),ke(int(ke(16))+si.materialIndex),ke(int(ke(17))+si.triangleIndex));
out_motion.z=dot(si.position-iN(36),iN(40));
if(ke(offset+2)==0u)return;
vec4 qA=ow(offset+4)*vec4(si.position,1.0);
vec4 ps=ow(0)*qA;
if(ps.w<=0.0)return;
vec3 tX=ps.xyz/ps.w;vec2 iz=(tX.xy*0.5+0.5)*viewportSize;
if(any(lessThan(iz,vec2(0.0)))||any(greaterThanEqual(iz,viewportSize))||abs(tX.z)>1.0)return;
uvec4 identity=texelFetch(previousId,ivec2(iz),0);float qz=texelFetch(previousMotion,ivec2(iz),0).z;
if(any(notEqual(identity.xy,out_id.xy))||abs(qz-dot(qA.xyz-iN(44),iN(48)))>max(1e-4,abs(qz)*1e-3))return;
out_motion=vec4((iz-gl_FragCoord.xy)*vec2(1.0,-1.0),out_motion.z,3.0);
`:`
ivec2 coord=ivec2(gl_FragCoord.xy);
out_geometry=aovSample==0 ? vec4(0.0) : texelFetch(previousGeometry,coord,0);
out_position=aovSample==0 ? vec4(0.0) : texelFetch(previousPosition,coord,0);
out_diffuse=aovSample==0 ? vec4(0.0) : texelFetch(previousDiffuse,coord,0);
out_specular=aovSample==0 ? vec4(0.0) : texelFetch(previousSpecular,coord,0);
rG(); aZ=uvec2(floor(gl_FragCoord.xy));
gW(floor(gl_FragCoord.xy),int(aQ ^ dG(uint(sequenceSeed))));
Ray ray=wJ((floor(gl_FragCoord.xy)+dZ(CAMERA_PIXEL))/viewportSize);
if(cameraApertureRadius>0.0) {
vec3 eye=viewInv[3].xyz, forward=-normalize(viewInv[2].xyz);
vec3 jN=eye+ray.d*(cameraFocusDistance/dot(ray.d,forward));
vec2 xU=cameraApertureRadius*kN(dZ(CAMERA_LENS));
vec3 origin=(viewInv*vec4(xU,0.0,1.0)).xyz;
gC(ray,origin,normalize(jN-origin));
}
SurfaceInteraction si; OpenPbrResolvedMaterial material;
if(!mQ(ray,si,material)) return;
float depth=max(dot(si.position-viewInv[3].xyz,-normalize(viewInv[2].xyz)),0.0);
bool unsupported=material.materialType!=STANDARD || material.alpha<1.0 || material.coatWeight>0.0 || material.fuzzWeight>0.0 || material.specularAnisotropy>0.0 || material.subsurfaceWeight>0.0 || dot(material.mediumScattering,material.mediumScattering)>0.0 || material.bevel>0.0 || material.thinFilmWeight>0.0 || material.transmissionDispersionScale>0.0;
out_geometry+=vec4(depth,material.specularRoughness,material.baseMetalness,unsupported?1.0:0.0);
#ifdef AOV_REFLECTANCE
if((aovMask&24)!=0 && !unsupported){
vec3 normal=si.normal,face=si.faceNormal;float cosine=-dot(normal,ray.d),fu=-dot(face,ray.d);
if(material.thinWalled&&(material.transmissionWeight>0.0||material.subsurfaceWeight>0.0)){
if(cosine<0.0){normal=-normal;cosine=-cosine;}if(fu<0.0){face=-face;fu=-fu;}
}
if(fu>=0.0&&cosine<0.0){normal=face;cosine=fu;}
if(cosine<0.0)normal=-normal;
material.inside=cosine<=0.0&&!material.thinWalled;material.relativeIor=cosine>0.0?1.0/material.specularIor:material.specularIor;
vec3 tangent=vec3(0.0);
#ifdef USE_TANGENT
tangent=si.tangent;
#endif
ag prepared=ds(tangent,material,-ray.d,normal);
vec3 diffuse,specular;aovReflectance(prepared,(aovMask&8)!=0,(aovMask&16)!=0,diffuse,specular);
out_diffuse+=vec4(diffuse,1.0);out_specular+=vec4(specular,1.0);
}
#endif
out_position+=vec4(si.position,1.0);
`}
}
`});return e.parallelCompile=!0,e}var ul=[256,64],Wu=[32,1],dl=[96,192],dr=`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
out vec4 color;
const float PI = 3.14159265358979;
const float R_GROUND = 6360.0;
const float R_TOP = 6460.0;
const float CAMERA_ALTITUDE = 0.2;
const vec3 RAYLEIGH = vec3(5.802e-3, 13.558e-3, 33.1e-3);
const float MIE_SCATTERING = 3.996e-3;
const float MIE_EXTINCTION = 4.44e-3;
const float MIE_G = 0.8;
const vec3 OZONE = vec3(0.65e-3, 1.881e-3, 0.085e-3);
const ivec2 T_SIZE = ivec2(${ul[0]}, ${ul[1]});
const int MS_ALTITUDES = ${Wu[0]};
const ivec2 SV_SIZE = ivec2(${dl[0]}, ${dl[1]});
uniform vec3 uSun; 
uniform float uTurbidity;
uniform vec3 uAlbedo;


float br(float r, float mu, float radius) { return (radius - r) * (radius + r) + r * r * mu * mu; }
bool np(float r, float mu) { return mu < 0.0 && br(r, mu, R_GROUND) >= 0.0; }
float ll(float r, float mu) { return max(-r * mu - sqrt(max(br(r, mu, R_GROUND), 0.0)), 0.0); }
float jm(float r, float mu) { return max(-r * mu + sqrt(max(br(r, mu, R_TOP), 0.0)), 0.0); }


vec3 oz(float r) {
float h = max(r - R_GROUND, 0.0);
return vec3(exp(-h / 8.0), exp(-h / 1.2) * uTurbidity, max(0.0, 1.0 - abs(h - 25.0) / 15.0));
}
vec3 extinction(vec3 d) { return RAYLEIGH * d.x + MIE_EXTINCTION * d.y + OZONE * d.z; }

float mP(float x) { return x * x * (R_TOP - R_GROUND); }
float hR(float h) { return sqrt(clamp(h / (R_TOP - R_GROUND), 0.0, 1.0)); }


vec3 fh(sampler2D table, vec2 p) {
ivec2 size = textureSize(table, 0);
vec2 q = clamp(p, vec2(0.0), vec2(size - 1));
ivec2 i = min(ivec2(floor(q)), max(size - 2, ivec2(0)));
vec2 f = clamp(q - vec2(i), 0.0, 1.0);
ivec2 j = min(i + 1, size - 1);
vec3 a = texelFetch(table, i, 0).rgb, b = texelFetch(table, ivec2(j.x, i.y), 0).rgb;
vec3 c = texelFetch(table, ivec2(i.x, j.y), 0).rgb, d = texelFetch(table, j, 0).rgb;
return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
`,Yu=`
uniform sampler2D uTransmittance;
uniform sampler2D uMultiple;
uniform bool uFull;
uniform vec3 uSkyIrradiance;


vec3 fO(float r, float mu) {
return fh(uTransmittance, vec2((clamp(mu, -1.0, 1.0) + 1.0) * 0.5 * float(T_SIZE.x - 1),
hR(r - R_GROUND) * float(T_SIZE.y - 1)));
}

float mW(float nu) {
float g2 = MIE_G * MIE_G;
return 3.0 / (8.0 * PI) * ((1.0 - g2) * (1.0 + nu * nu)) / ((2.0 + g2) * pow(1.0 + g2 - 2.0 * MIE_G * nu, 1.5));
}






void vt(vec3 origin, vec3 dir, int steps, out vec3 radiance, out vec3 throughput) {
float r = length(origin);
float mu = dot(origin, dir) / r;
bool ground = np(r, mu);
float len = ground ? ll(r, mu) : jm(r, mu);
float nu = dot(dir, uSun);
float jv = uFull ? 3.0 / (16.0 * PI) * (1.0 + nu * nu) : 1.0 / (4.0 * PI);
float sn = uFull ? mW(nu) : 1.0 / (4.0 * PI);
radiance = vec3(0.0);
throughput = vec3(0.0);
vec3 view = vec3(1.0);
float previous = 0.0;
for (int i = 0; i < steps; i++) {

float s = float(i + 1) / float(steps);
float next = len * s * s;
float dt = next - previous;
vec3 p = origin + dir * (0.5 * (previous + next));
previous = next;
float pr = length(p);
vec3 d = oz(pr);
vec3 e = extinction(d);
vec3 vb = fO(pr, dot(p, uSun) / pr);
vec3 nG = RAYLEIGH * d.x;
float nF = MIE_SCATTERING * d.y;
vec3 ms = vec3(0.0);
if (uFull) {
float x = hR(pr - R_GROUND) * float(MS_ALTITUDES - 1);
ms = fh(uMultiple, vec2(x, 0.0));
}
vec3 source = vb * (nG * jv + nF * sn) + (nG + nF) * ms;

vec3 st = exp(-e * dt);
vec3 weight = (1.0 - st) / max(e, vec3(1e-9));
radiance += view * source * weight;
throughput += view * (nG + nF) * weight;
view *= st;
}
if (ground) {
vec3 p = origin + dir * len;
float pr = length(p);
float tC = dot(p, uSun) / pr;
vec3 irradiance = fO(pr, tC) * max(tC, 0.0) + uSkyIrradiance;
radiance += view * uAlbedo / PI * irradiance;
}
}
`,nh=dr+`
void main() {
ivec2 p = ivec2(gl_FragCoord.xy);
float mu = float(p.x) / float(T_SIZE.x - 1) * 2.0 - 1.0;
float r = R_GROUND + mP(float(p.y) / float(T_SIZE.y - 1));
if (np(r, mu)) { color = vec4(0.0, 0.0, 0.0, 1.0); return; }
float len = jm(r, mu);
vec3 depth = vec3(0.0);
const int STEPS = 48;
for (int i = 0; i < STEPS; i++) {
float t = (float(i) + 0.5) / float(STEPS) * len;
depth += extinction(oz(sqrt(t * t + 2.0 * r * mu * t + r * r))) * (len / float(STEPS));
}
color = vec4(exp(-depth), 1.0);
}
`,sh=dr+Yu+`
void main() {
float r = R_GROUND + mP(floor(gl_FragCoord.x) / float(MS_ALTITUDES - 1));
const int DIRECTIONS = 64;
vec3 second = vec3(0.0), qK = vec3(0.0);
for (int i = 0; i < DIRECTIONS; i++) {

float mu = 1.0 - 2.0 * (float(i) + 0.5) / float(DIRECTIONS);
float phi = float(i) * PI * (3.0 - sqrt(5.0));
float s = sqrt(1.0 - mu * mu);
vec3 radiance, throughput;
vt(vec3(0.0, r, 0.0), vec3(s * cos(phi), mu, s * sin(phi)), 20, radiance, throughput);
second += radiance / float(DIRECTIONS);
qK += throughput / float(DIRECTIONS);
}
color = vec4(second / (1.0 - qK), 1.0);
}
`,pl=`
float qk(float row) {
float x = row / float(SV_SIZE.y - 1) * 2.0 - 1.0;
return sign(x) * x * x * (PI / 2.0);
}
float ik(float e) {
float x = sign(e) * sqrt(abs(e) / (PI / 2.0));
return clamp((x + 1.0) * 0.5, 0.0, 1.0) * float(SV_SIZE.y - 1);
}
`,oh=dr+Yu+pl+`
void main() {
ivec2 p = ivec2(gl_FragCoord.xy);
float e = qk(float(p.y));
float phi = float(p.x) / float(SV_SIZE.x - 1) * PI;
vec3 radiance, throughput;
vt(vec3(0.0, R_GROUND + CAMERA_ALTITUDE, 0.0), vec3(cos(e) * cos(phi), sin(e), cos(e) * sin(phi)), 40, radiance, throughput);
color = vec4(radiance, 1.0);
}
`,lh=dr+pl+`
uniform sampler2D uTransmittance;
uniform sampler2D uSkyView;
void main() {
vec3 sky = vec3(0.0);
const int ROWS = 128, COLUMNS = 48;
for (int i = 0; i < ROWS; i++) {
float e = (float(i) + 0.5) / float(ROWS) * (PI / 2.0);

float weight = 2.0 * sin(e) * cos(e) * (PI / 2.0 / float(ROWS)) * (PI / float(COLUMNS));
for (int j = 0; j < COLUMNS; j++) {
float phi = (float(j) + 0.5) / float(COLUMNS) * PI;
sky += fh(uSkyView, vec2(phi / PI * float(SV_SIZE.x - 1), ik(e))) * weight;
}
}
if (int(gl_FragCoord.x) == 0) { color = vec4(sky, 1.0); return; }
float r = R_GROUND + CAMERA_ALTITUDE;
vec3 vb = fh(uTransmittance, vec2((uSun.y + 1.0) * 0.5 * float(T_SIZE.x - 1), hR(CAMERA_ALTITUDE) * float(T_SIZE.y - 1)));
vec3 xc = vec3(0.2126, 0.7152, 0.0722);
float horizontal = dot(sky, xc) + dot(vb, xc) * max(uSun.y, 0.0);


const float REFERENCE = ${Ar};
float scale = ${Qn} / sqrt(max(horizontal, REFERENCE * 1e-3) * REFERENCE);
color = vec4(vb, scale);
}
`,ch=dr+pl+`
uniform sampler2D uSkyView;
uniform sampler2D uIrradiance;
uniform vec2 uSize;
uniform float uAzimuth;
uniform vec3 uSunWorld;
uniform float uSunRadius;


vec3 hn(vec2 dk) {
float theta = dk.y / uSize.y * PI;
float phi = dk.x / uSize.x * 2.0 * PI;
return vec3(-sin(theta) * cos(phi), cos(theta), -sin(theta) * sin(phi));
}

void main() {
vec3 dir = hn(gl_FragCoord.xy);
float ek = abs(atan(dir.z, dir.x) - uAzimuth);
ek = min(mod(ek, 2.0 * PI), 2.0 * PI - mod(ek, 2.0 * PI));
float e = asin(clamp(dir.y, -1.0, 1.0));
vec3 radiance = fh(uSkyView, vec2(ek / PI * float(SV_SIZE.x - 1), ik(e)));
vec4 sun = texelFetch(uIrradiance, ivec2(1, 0), 0);


float rP = PI / uSize.y;
if (acos(clamp(dot(dir, uSunWorld), -1.0, 1.0)) < uSunRadius + 3.0 * rP / max(sqrt(1.0 - dir.y * dir.y), 0.05)) {
const int N = 6;
const float LIMB = 0.6;
float coverage = 0.0;
for (int y = 0; y < N; y++) for (int x = 0; x < N; x++) {
vec3 d = hn(gl_FragCoord.xy - 0.5 + (vec2(x, y) + 0.5) / float(N));

float angle = 2.0 * asin(min(length(d - uSunWorld) * 0.5, 1.0));
float t = angle / uSunRadius;
if (t < 1.0) coverage += 1.0 - LIMB * (1.0 - sqrt(1.0 - t * t));
}
float rO = 2.0 * PI * (1.0 - cos(uSunRadius));
radiance += coverage / float(N * N) / (rO * (1.0 - LIMB / 3.0)) * sun.rgb;
}
color = vec4(radiance * sun.a, 1.0);
}
`,fh=`#version 300 es
void main() {
vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
gl_Position = vec4(p, 0.0, 1.0);
}
`,cs=class{gl;programs;targets;map;constructor(){let t=(typeof OffscreenCanvas<"u"?new OffscreenCanvas(1,1):document.createElement("canvas")).getContext("webgl2",{antialias:!1,depth:!1,stencil:!1,alpha:!1});if(!t)throw new Error("The procedural sky needs WebGL 2.");if(!t.getExtension("EXT_color_buffer_float"))throw new Error("The procedural sky needs float render targets (EXT_color_buffer_float).");this.gl=t,t.bindVertexArray(t.createVertexArray()),this.programs={transmittance:this.program(nh),multiple:this.program(sh),skyView:this.program(oh),irradiance:this.program(lh),map:this.program(ch)},this.targets={transmittance:this.target(...ul),multiple:this.target(...Wu),skyView:this.target(...dl),irradiance:this.target(2,1)}}bake(e,t=2048,A=1024){let a=this.gl;if(a.isContextLost())throw new Error("The procedural sky lost its WebGL context.");let{elevation:r,azimuth:n}=Qr(e),s=fl(r),o=fl(n),l=v=>(a.useProgram(v),this.uniform(v,"uSun",h=>a.uniform3f(h,Math.cos(s),Math.sin(s),0)),this.uniform(v,"uTurbidity",h=>a.uniform1f(h,5)),this.uniform(v,"uAlbedo",h=>a.uniform3fv(h,Mn)),v),{transmittance:c,multiple:f,skyView:m,irradiance:d}=this.targets,u=(v,h,B)=>{l(v),this.bind(v,"uTransmittance",0,c),this.bind(v,"uMultiple",1,h?f:d),this.uniform(v,"uFull",E=>a.uniform1i(E,h?1:0)),this.uniform(v,"uSkyIrradiance",E=>a.uniform3fv(E,B))};this.draw(l(this.programs.transmittance),c),u(this.programs.multiple,!1,[0,0,0]),this.draw(this.programs.multiple,f),u(this.programs.skyView,!0,[0,0,0]),this.draw(this.programs.skyView,m),l(this.programs.irradiance),this.bind(this.programs.irradiance,"uTransmittance",0,c),this.bind(this.programs.irradiance,"uSkyView",1,m),this.draw(this.programs.irradiance,d);let p=this.read(d).subarray(0,3);u(this.programs.skyView,!0,Array.from(p)),this.draw(this.programs.skyView,m),(!this.map||this.map.width!==t||this.map.height!==A)&&(this.map&&this.release(this.map),this.map=this.target(t,A));let g=l(this.programs.map);return this.bind(g,"uSkyView",0,m),this.bind(g,"uIrradiance",1,d),this.uniform(g,"uSize",v=>a.uniform2f(v,t,A)),this.uniform(g,"uAzimuth",v=>a.uniform1f(v,o)),this.uniform(g,"uSunWorld",v=>a.uniform3f(v,Math.cos(s)*Math.cos(o),Math.sin(s),Math.cos(s)*Math.sin(o))),this.uniform(g,"uSunRadius",v=>a.uniform1f(v,fl(.4))),this.draw(g,this.map),{data:this.read(this.map),width:t,height:A}}dispose(){this.gl.getExtension("WEBGL_lose_context")?.loseContext()}program(e){let t=this.gl,A=(r,n)=>{let s=t.createShader(r);if(t.shaderSource(s,n),t.compileShader(s),!t.getShaderParameter(s,t.COMPILE_STATUS))throw new Error(`Sky shader: ${t.getShaderInfoLog(s)}`);return s},a=t.createProgram();if(t.attachShader(a,A(t.VERTEX_SHADER,fh)),t.attachShader(a,A(t.FRAGMENT_SHADER,e)),t.linkProgram(a),!t.getProgramParameter(a,t.LINK_STATUS))throw new Error(`Sky program: ${t.getProgramInfoLog(a)}`);return a}target(e,t){let A=this.gl,a=A.createTexture();A.bindTexture(A.TEXTURE_2D,a),A.texStorage2D(A.TEXTURE_2D,1,A.RGBA32F,e,t),A.texParameteri(A.TEXTURE_2D,A.TEXTURE_MIN_FILTER,A.NEAREST),A.texParameteri(A.TEXTURE_2D,A.TEXTURE_MAG_FILTER,A.NEAREST);let r=A.createFramebuffer();if(A.bindFramebuffer(A.FRAMEBUFFER,r),A.framebufferTexture2D(A.FRAMEBUFFER,A.COLOR_ATTACHMENT0,A.TEXTURE_2D,a,0),A.checkFramebufferStatus(A.FRAMEBUFFER)!==A.FRAMEBUFFER_COMPLETE)throw new Error("The procedural sky cannot render to float textures.");return{texture:a,framebuffer:r,width:e,height:t}}release(e){this.gl.deleteFramebuffer(e.framebuffer),this.gl.deleteTexture(e.texture)}uniform(e,t,A){let a=this.gl.getUniformLocation(e,t);a&&A(a)}bind(e,t,A,a){let r=this.gl;r.activeTexture(r.TEXTURE0+A),r.bindTexture(r.TEXTURE_2D,a.texture),this.uniform(e,t,n=>r.uniform1i(n,A))}draw(e,t){let A=this.gl;A.useProgram(e),A.bindFramebuffer(A.FRAMEBUFFER,t.framebuffer),A.viewport(0,0,t.width,t.height),A.drawArrays(A.TRIANGLES,0,3)}read(e){let t=this.gl,A=new Float32Array(e.width*e.height*4);return t.bindFramebuffer(t.FRAMEBUFFER,e.framebuffer),t.readPixels(0,0,e.width,e.height,t.RGBA,t.FLOAT,A),A}};function fl(i){return i*Math.PI/180}var fs=class{baker;images=new WeakMap;sky;resolve(e){if(!e||!("sky"in e))return e;let t=this.images.get(e);if(t)return t;let{width:A,height:a,sky:{time:r},intensity:n,ambient:s}=e;this.baker??=new cs,(!this.sky||this.sky.time!==r||this.sky.width!==A||this.sky.height!==a)&&(this.sky={time:r,...this.baker.bake(r,A,a)});let o=this.sky.data;(n!==1||s.some(c=>c!==0))&&(o=o.map((c,f)=>f%4===3?c:c*n+s[f%4]));let l={width:A,height:a,data:o};return this.images.set(e,l),l}dispose(){this.baker?.dispose(),this.baker=void 0,this.sky=void 0}};var ju=new we({name:"depthQuery",outputs:["depth"],defines:{DEPTH_QUERY_MODE:!0},includes:[Lt,Ot,Ft,Nt],uniforms:{depthArea:C.uniform("vec4"),viewProjectionInv:C.uniform("mat4"),viewInv:C.uniform("mat4")},main:`
${Li}
${Fi}
${Nt.main}
${Lt.main}
${Oi}
${Ot.main}
${Ft.main}

void main() {
vec2 offset = floor(gl_FragCoord.xy) / ${6}.0 * 2.0 - 1.0;
vec2 uv = depthArea.xy + depthArea.zw * offset * vec2(1.0, -1.0);
out_depth = vec4(0.0);
if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return;
vec4 origin = viewProjectionInv * vec4(uv * 2.0 - 1.0, -1.0, 1.0);
vec4 target = viewProjectionInv * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
Ray ray;
gC(ray, origin.xyz / origin.w, normalize(target.xyz * origin.w - origin.xyz * target.w));
vec3 eye = viewInv[3].xyz;
vec3 forward = -normalize(viewInv[2].xyz);
SurfaceInteraction si;
si.triangleIndex = -1;
for (int layer = 0; layer < 32; layer++) {
intersectScene(ray, si, false);
if (!si.hit) return;
OpenPbrResolvedMaterial material;
dg(material, si.materialIndex, si.uv, si.uv1, si.instanceIndex, si.vertexColor);
if (material.materialType != SHADOW_CATCHER && material.alpha > 0.0) {
out_depth.r = max(dot(si.position - eye, forward), 0.0);
return;
}
ray.o = si.position + ray.d * (EPS * 0.02);
}
}
`});var us=K`
vec4 textureLinear(sampler2D map, vec2 uv) {
#ifdef OES_texture_float_linear
return texture(map, uv);
#else
vec2 size = vec2(textureSize(map, 0));
vec2 qX = 1.0 / size;

uv = uv * size - 0.5;
vec2 f = fract(uv);
uv = floor(uv) + 0.5;

vec4 s1 = texture(map, (uv + vec2(0, 0)) * qX);
vec4 s2 = texture(map, (uv + vec2(1, 0)) * qX);
vec4 s3 = texture(map, (uv + vec2(0, 1)) * qX);
vec4 s4 = texture(map, (uv + vec2(1, 1)) * qX);

return mix(mix(s1, s2, f.x), mix(s3, s4, f.x), f.y);
#endif
}
`;var ca=ii({uniforms:{environmentRotation:C.uniform("mat3",[1,0,0,0,1,0,0,0,1]),envMap:C.uniform("sampler2D"),envMapDistribution:C.uniform("sampler2D"),backgroundMap:C.uniform("sampler2D"),backgroundMapTransform:C.uniform("vec4",[1,0,1,0]),backgroundMapRotation:C.uniform("mat3",[1,0,0,0,1,0,0,0,1]),groundedBackgroundParams:C.uniform("vec4"),groundedBackgroundCenter:C.uniform("vec2")},main:K`
vec2 eV(vec3 gx) {
float phi = mod(atan(-gx.z, -gx.x), TWOPI);
float theta = acos(clamp(gx.y, -1.0, 1.0));
return vec2(phi * 0.5 * INVPI, theta * INVPI);
}

vec2 dm(vec3 nO) {
return eV(transpose(environmentRotation) * nO);
}

float rE(float u, out int vOffset, out float pdf) {
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

float rD(float u, int vOffset, out float pdf) {
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
int pO = left - 1;



vec2 s0 = texelFetch(envMapDistribution, ivec2(1 + pO, vOffset), 0).xy;
vec2 s1 = texelFetch(envMapDistribution, ivec2(1 + pO + 1, vOffset), 0).xy;

pdf = s0.y;

return (float(pO) + (u - s0.x) / (s1.x - s0.x)) / float(size.x);
}


float eW(vec2 ew, float v) {
if (!(v > 0.0 && v < 1.0)) { return 0.0; }
float sinTheta = sin(min(v, 1.0 - v) * PI);
return ew.x * ew.y * INVPI2 / (2.0 * sinTheta);
}


vec3 pI(vec2 random, out vec2 uv, out float pdf) {
vec2 ew;
int vOffset;

uv.y = rE(random.x, vOffset, ew.y);
uv.x = rD(random.y, vOffset, ew.x);

float phi = uv.x * TWOPI;
float theta = uv.y * PI;
float ci = cos(theta);
float sinTheta = sin(theta);
float vM = cos(phi);
float vX = sin(phi);

vec3 dir = vec3(-sinTheta * vM, ci, -sinTheta * vX);

pdf = eW(ew, uv.y);

return environmentRotation * dir;
}

float iT(vec2 uv) {
vec2 size = vec2(textureSize(envMap, 0));

ivec2 pixel = clamp(ivec2(uv * size), ivec2(0), ivec2(size) - ivec2(1));

float ub = texelFetch(envMapDistribution, ivec2(1 + pixel.x, pixel.y), 0).y;
float uc = texelFetch(envMapDistribution, ivec2(0, pixel.y), 0).y;

return eW(vec2(ub, uc), uv.y);
}

float dK(vec3 point, float height, float radius) {
float ge = length(point);
if (ge < 0.00001) {
return -radius;
}

float iX = radius * point.y / ge;
float iL = -1.5 * height;
float eH;
if (iX >= 0.0) {
eH = radius;
} else if (iX < iL) {
eH = -height * ge / point.y;
} else {
float cL = 1.0
- iX * iX / (3.0 * iL * iL);
eH = radius * cL;
}
return ge - eH;
}

vec3 fd(vec3 origin, vec3 d) {
#ifdef USE_GROUNDED_BACKGROUND
float height = groundedBackgroundParams.x;
float radius = groundedBackgroundParams.y;
float xB = groundedBackgroundParams.z;
vec3 cf = normalize(d);
vec3 bI = origin - vec3(
groundedBackgroundCenter.x,
xB + height,
groundedBackgroundCenter.y
);



float eT = dot(bI, cf);
float br = eT * eT
- dot(bI, bI) + radius * radius;
if (br > 0.0) {
float cM = -eT + sqrt(br);
if (
cM > 0.0
&& dK(bI, height, radius) <= 0.0
) {
vec3 oK = bI + cf * cM;
if (oK.y >= 0.0) {
return normalize(oK);
}

if (cf.y < -0.00001 && radius > 1.5 * height) {
float ir = (-height - bI.y) / cf.y;
vec3 oB = bI + cf * ir;
float pe = (2.0 / 3.0)
* sqrt(radius * radius - 2.25 * height * height);
if (ir > 0.0 && length(oB.xz) <= pe) {
return normalize(oB);
}
}

float cV = 0.0;
for (int i = 0; i < 14; i++) {
float fB = (cV + cM) * 0.5;
vec3 qy = bI + cf * fB;
if (dK(qy, height, radius) > 0.0) {
cM = fB;
} else {
cV = fB;
}
}
vec3 hit = bI + cf * ((cV + cM) * 0.5);
return normalize(hit);
}
}
#endif
return d;
}

vec4 cG(vec3 origin, vec3 d) {
d = fd(origin, d);
#ifdef USE_BACKGROUND
vec4 t = backgroundMapTransform;
d = vec3(t.x * d.x - t.y * d.z, d.y, t.y * d.x + t.x * d.z);
vec4 bc = textureLinear(backgroundMap, eV(transpose(backgroundMapRotation) * d));
return vec4(bc.rgb * t.z, bc.a);
#else
return textureLinear(backgroundMap, dm(d));
#endif
}`});var Vu=K`
vec3 ta(SurfaceInteraction si, OpenPbrResolvedMaterial mat, ag prepared, inout Path aa, vec3 ffnormal, bool eM) {
float lY = 1.0;
vec3 lV = vec3(dZ(cE(LIGHT_POSITION)), dp(cE(LIGHT_SELECT)));

LightSampleRec lightSample;
sampleLight(si.position, lV, lightSample, false);
lightSample.emission = aj(lightSample.emission, bp);

vec3 lightDir = lightSample.direction;
vec3 qY = -aa.ray.d;
float fA = lightSample.pdf;




float cosThetaL = dot(ffnormal, lightDir);
#ifdef USE_COAT_NORMAL_FRAMES
if (eM && mat.coatNormalEnabled) { cosThetaL = dot(mat.geometricNormal, lightDir); }
#endif

if (fA <= 0.0 || max(max(lightSample.emission.x, lightSample.emission.y), lightSample.emission.z) <= 0.0) {
return vec3(0.0);
}

float scatteringPdf = 0.0;
vec3 f = vec3(0.0);
if (eM) {
if (cosThetaL <= 0.0 && mat.transmissionWeight <= 0.0 && mat.subsurfaceWeight <= 0.0) {
return vec3(0.0);
}
f = bO(prepared, lightDir, scatteringPdf);
}
else {
scatteringPdf = bL(
dot(qY, lightDir),
si.mediumAnisotropy
);
f = vec3(scatteringPdf);
}

if (scatteringPdf <= 0.0 || max(max(f.x, f.y), f.z) <= 0.0) {
return vec3(0.0);
}

Ray ns;
vec3 hw = si.position + EPS * lightDir;
if (eM) {
const float ch = 0.1;
float dL = dot(si.normal, lightDir);
#ifdef USE_COAT_NORMAL_FRAMES
if (mat.coatNormalEnabled) { dL = dot(si.faceNormal, lightDir); }
#endif
vec3 geometricNormal = dL < 0.0 ? -si.faceNormal : si.faceNormal;
dL = abs(dL);
float iq = dot(geometricNormal, lightDir);
float pq = dL < ch
? clamp(
2.0 - (iq + dL) / ch,
0.0,
1.0
)
: clamp(1.0 - iq / ch, 0.0, 1.0);
hw += si.shadowOffset * pq;
}
gC(ns, hw, lightDir);
if (intersectSceneShadow(ns, lightSample.dist - EPS, si.triangleIndex)) {
return vec3(0.0);
}

#ifdef USE_ENVMAP


if (eM && cosThetaL < 0.0 && lV.z < envLightSelectionPmf) {
vec4 background = cG(ns.o, lightDir);
lightSample.emission = aj(background.rgb * background.a, bp);
}
#endif



float fl = lightSample.isDelta
? 1.0
: aK(fA, scatteringPdf);
return fl > 0.0
? fl * lightSample.emission * f / fA
: vec3(0.0);
}

#ifdef USE_COAT_NORMAL_FRAMES
vec3 fT(vec3 qt, vec3 face, vec3 view) {
bool front = dot(face, view) >= 0.0;
vec3 vP = front ? face : -face;
vec3 sc = front ? qt : -qt;
if (dot(qt, face) <= 0.0 || dot(sc, view) <= 1e-6) { return vP; }
return sc;
}
#endif
void mL(inout SurfaceInteraction si, OpenPbrResolvedMaterial mat, inout Path aa) {
vec3 vR = vec3(dZ(cE(BSDF_DIRECTION)), dp(cE(BSDF_LOBE)));
#ifdef USE_COAT_NORMAL_FRAMES
vec3 bK = si.faceNormal;
vec3 nB = si.normal;
#endif
float sO = -dot(si.faceNormal, aa.ray.d);
float tV = -dot(si.normal, aa.ray.d);
if ((mat.transmissionWeight > 0.0 || mat.subsurfaceWeight > 0.0) && mat.thinWalled) {

if (sO < 0.0) {
si.faceNormal = -si.faceNormal;
sO = -sO;
}
if (tV < 0.0) {
si.normal = -si.normal;
tV = -tV;
}
}


bool qM = sO >= 0.0 && tV < 0.0;
float ndv = qM ? sO : tV;
vec3 normal = qM ? si.faceNormal : si.normal;

mat.inside = ndv <= 0.0 && !mat.thinWalled;

mat.relativeIor = ndv > 0.0 ? (1.0 / mat.specularIor) : mat.specularIor;
vec3 ffnormal = ndv >= 0.0 ? normal : -normal;
#ifdef USE_COAT_NORMAL_FRAMES
if (mat.coatNormalEnabled) {
vec3 view = -aa.ray.d;
float gp = dot(bK, view);
mat.geometricNormal = gp >= 0.0 ? bK : -bK;
ffnormal = fT(nB, bK, view);
mat.coatNormal = fT(si.coatNormal, bK, view);
mat.inside = gp <= 0.0 && !mat.thinWalled;
mat.relativeIor = (gp > 0.0 || mat.thinWalled) ? 1.0 / mat.specularIor : mat.specularIor;
}
#endif


float scatteringPdf;
vec3 dH;
aa.scatteringIsDelta = false;
bool bs = false;
bool hC = false;
ag prepared;

#ifdef HAS_MEDIUM
int mediumType = si.mediumType;
float d = distance(si.position, aa.ray.o);
vec3 os = aa.ray.o;
vec3 extinction = si.mediumExtinction;
vec3 scattering = min(si.mediumScattering, extinction);
float tR = max(max(extinction.x, extinction.y), extinction.z);
if (mediumType > 0 && tR > 0.0) {




int oi = min(int(dp(cE(MEDIUM_CHANNEL)) * 3.0), 2);
float fS = extinction[oi];
float iH = fS > 0.0
? min(-log(max(dp(cE(MEDIUM_DISTANCE)), 1e-7)) / fS, d)
: d;
bs = iH < d;
vec3 transmittance = exp(-extinction * iH);
vec3 oU = bs
? extinction * transmittance
: transmittance;
float oE = max(
(oU.x + oU.y + oU.z) / 3.0,
1e-8
);
if (bs) {
aa.beta *= transmittance * scattering / oE;

aa.ray.o = os + iH * aa.ray.d;
si.position = aa.ray.o;
aa.li += ta(si, mat, prepared, aa, ffnormal, false) * aa.beta;


dH = fH(
-aa.ray.d,
si.mediumAnisotropy,
dZ(cE(PHASE_DIRECTION))
);
scatteringPdf = bL(
dot(dH, -aa.ray.d),
si.mediumAnisotropy
);
}
else {
aa.beta *= transmittance / oE;
}
}
#endif


if (!bs) {
aa.li += mat.emission * aa.beta;
if (mat.materialType == UNLIT) {
aa.abort = true;
return;
}
vec3 qJ = vec3(0.0);
#ifdef USE_TANGENT
qJ = si.tangent;
#endif
mat.directionTangent = si.directionTangent;
mat.directionBitangent = si.directionBitangent;
mat.geometryTangent = si.geometryTangent;
mat.geometryBitangent = si.geometryBitangent;
prepared = ds(qJ, mat, -aa.ray.d, ffnormal);
aa.li += ta(si, mat, prepared, aa, ffnormal, true) * aa.beta;

bool isNextRefraction;
vec3 f = eN(
prepared,
vR,
dH,
scatteringPdf,
isNextRefraction
);

aa.scatteringIsDelta = !prepared.material.thinWalled &&
abs(prepared.material.relativeIor - 1.0) <= 1e-6 &&
prepared.probabilities[OPENPBR_LOBE_TRANSMISSION] >= 1.0 - 1e-6;



if (!(scatteringPdf > 0.0) || any(isnan(f)) || any(isinf(f)) ||
dot(dH, dH) < 0.5) {
aa.scatteringPdf = 0.0;
aa.abort = true;
return;
}
aa.beta *= f / scatteringPdf;
hC = !mat.thinWalled &&
isNextRefraction;
aa.isNextRefraction = isNextRefraction;


aa.ray.o = si.position + EPS * dH;
#ifdef USE_COAT_NORMAL_FRAMES
if (mat.coatNormalEnabled) { aa.ray.o = si.position + EPS * (dot(bK, dH) >= 0.0 ? bK : -bK); }
#endif
}

aa.scatteringPdf = scatteringPdf;
gC(aa.ray, aa.ray.o, dH);
if (bs) {
aa.isNextRefraction = false;
}
aa.fromEye = false;

#ifdef HAS_MEDIUM


if (!bs && hC && mat.mediumType > 0) {
if (sO >= 0.0) {
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
`;var ds=K`
#ifdef NUM_LIGHTS
void eY(
in Light light,
in vec3 shadingPoint,
in vec2 samplePoint,
inout LightSampleRec result
) {
vec3 oN = light.position - shadingPoint;
float ak = length(oN);
if (light.radius <= 0.0) {
if (ak <= 1e-6) {
result.direction = vec3(0.0, 0.0, 1.0);
result.normal = vec3(0.0, 0.0, -1.0);
result.dist = 0.0;
result.pdf = 1.0;
result.emission = vec3(0.0);
result.isDelta = true;
return;
}
result.direction = oN / ak;
result.normal = -result.direction;
result.dist = ak;
result.pdf = 1.0;
result.emission = light.emission / max(ak * ak, 1e-8);
result.isDelta = true;
return;
}
float radius = max(light.radius, 1e-6);
result.isDelta = false;
vec3 direction;

if (ak <= radius) {
float z = 1.0 - 2.0 * samplePoint.x;
float ex = sqrt(max(0.0, 1.0 - z * z));
float azimuth = TWOPI * samplePoint.y;
direction = vec3(ex * cos(azimuth), ex * sin(azimuth), z);
result.pdf = INV4PI;
}
else {
vec3 axis = oN / ak;
float sX = min(
1.0,
radius * radius / (ak * ak)
);
float tc = sqrt(max(0.0, 1.0 - sX));
float cosine = mix(1.0, tc, samplePoint.x);
float vF = sqrt(max(0.0, 1.0 - cosine * cosine));
float azimuth = TWOPI * samplePoint.y;
vec3 tangent;
vec3 bitangent;
aP(axis, tangent, bitangent);
direction = axis * cosine
+ tangent * (vF * cos(azimuth))
+ bitangent * (vF * sin(azimuth));
result.pdf = 1.0 / max(TWOPI * (1.0 - tc), 1e-8);
}

float jC = dot(direction, oN);
float br = jC * jC
- dot(oN, oN) + radius * radius;
float yn = sqrt(max(0.0, br));
float cV = jC - yn;
float cM = jC + yn;
result.dist = cV > 1e-6 ? cV : cM;
result.direction = direction;
vec3 surfacePoint = shadingPoint + direction * result.dist;
result.normal = normalize(surfacePoint - light.position);
result.emission = light.emission;
}

void dn(
in Light light,
in vec3 surfacePoint,
in vec3 lowerLeft,
inout LightSampleRec result
) {
#ifdef NUM_MAPS
if (light.textureIndex >= 0) {
float width = length(light.u);
float height = length(light.v);
vec3 ek = surfacePoint - lowerLeft;
vec2 uv = vec2(
dot(ek, light.u / width) / width,
dot(ek, light.v / height) / height
);
result.emission *= sampleMap(light.textureIndex, uv).rgb;
}
#endif
}

void kw(
in Light light,
in vec3 shadingPoint,
in vec2 samplePoint,
inout LightSampleRec result
) {
vec3 normal = normalize(cross(light.u, light.v));
vec3 lowerLeft = light.position - 0.5 * (light.u + light.v);
float spread = clamp(light.spread, 0.0, 1.0);

if (spread <= 0.001) {
float gw = dot(normal, shadingPoint - light.position);
vec3 surfacePoint = shadingPoint - normal * gw;
vec3 ek = surfacePoint - lowerLeft;
float width = length(light.u);
float height = length(light.v);
vec2 uv = vec2(
dot(ek, light.u / width) / width,
dot(ek, light.v / height) / height
);
if (gw <= 0.0 || any(lessThan(uv, vec2(0.0)))
|| any(greaterThan(uv, vec2(1.0)))) {
result.emission = vec3(0.0);
result.pdf = 0.0;
return;
}
result.direction = -normal;
result.dist = gw;
result.normal = normal;
result.emission = light.emission;
result.pdf = 1.0;
result.isDelta = true;
dn(light, surfacePoint, lowerLeft, result);
return;
}

vec3 surfacePoint = lowerLeft
+ light.u * samplePoint.x
+ light.v * samplePoint.y;
vec3 offset = surfacePoint - shadingPoint;
float hE = dot(offset, offset);
result.dist = sqrt(hE);
result.direction = offset / result.dist;
result.normal = normal;
float gn = dot(-result.direction, normal);
float pK = cos(0.5 * PI * spread);
if (gn <= 0.0 || gn < pK) {
result.emission = vec3(0.0);
result.pdf = 0.0;
return;
}
result.emission = light.emission;
result.pdf = hE / max(light.area * gn, 1e-8);
dn(light, surfacePoint, lowerLeft, result);
}

void gs(
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

void kx(
in Light light,
in vec3 shadingPoint,
in vec2 samplePoint,
inout LightSampleRec result
) {
eY(light, shadingPoint, samplePoint, result);
vec3 surfacePoint = shadingPoint + result.direction * result.dist;
result.emission *= bP(
light,
normalize(shadingPoint - surfacePoint)
);
}

void jg(
in Light light,
in vec3 shadingPoint,
in vec2 samplePoint,
inout LightSampleRec result
) {
int ec = int(light.type);
#ifdef HAS_RECT_LIGHTS
if (ec == RECT_LIGHT) {
kw(light, shadingPoint, samplePoint, result);
return;
}
#endif
#ifdef HAS_SPHERE_LIGHTS
if (ec == SPHERE_LIGHT) {
eY(light, shadingPoint, samplePoint, result);
return;
}
#endif
#ifdef HAS_SPOT_LIGHTS
if (ec == SPOT_LIGHT) {
kx(light, shadingPoint, samplePoint, result);
return;
}
#endif
#ifdef HAS_DIRECTIONAL_LIGHTS
if (ec == DIRECTIONAL_LIGHT) {
gs(light, shadingPoint, result);
}
#endif
}
#endif

void nD(in vec2 samplePoint, inout LightSampleRec result) {
vec2 uv;
result.direction = pI(samplePoint, uv, result.pdf);
result.emission = textureLinear(envMap, uv).rgb;
result.dist = INF;
}

void sampleLight(
in vec3 shadingPoint,
in vec3 randomSampleValue,
inout LightSampleRec result,
bool tk
) {
result.isDelta = false;
float vE = randomSampleValue.z;
bool le = false;
#ifdef USE_ENVMAP
le = vE < envLightSelectionPmf;
if (le) {
nD(randomSampleValue.xy, result);
result.pdf *= envLightSelectionPmf;
}
#endif

#ifdef NUM_LIGHTS
if (!le) {
int lM = NUM_LIGHTS - 1;
for (int index = 0; index < NUM_LIGHTS; index++) {
if (vE < rB(index).selectionCdf) {
lM = index;
break;
}
}
Light rp = rB(lM);
jg(
rp,
shadingPoint,
randomSampleValue.xy,
result
);
result.pdf *= rp.selectionPmf;
}
#endif
}
`;var uh=K`
#if defined(HAS_TRANSMISSION) || defined(HAS_ALPHA)
if (!si.isTransparency && BOUNCES < 16 && depth * 2 > BOUNCES) {
aa.abort = true;
return;
}
#endif
`,dh=K`

for(int xK = 0; xK < BOUNCES; xK++) {{
if (aa.abort) {
return vec4(aa.li, aa.alpha);
}
bounce(aa, depth, si, mat, outAux);
}}
`,ph=K`
bool wY = !si.isTransparency;
int rT = min(BOUNCES, bounceLimit);
for(int idx = 0; idx < min(BOUNCES * 3, ${20}); idx++) {
if (wY && idx > rT) {
aa.abort = true;
}
if (aa.abort) {
return vec4(aa.li, aa.alpha);
}
bounce(aa, depth, si, mat, outAux);
}
`;function ml(){let i=Jn();return new we({name:"rayTraceFrag",outputs:["color","albedo","normal","moments"],defines:{BOUNCES:2},uniforms:{cameraApertureRadius:C.uniform("float",0),cameraFocusDistance:C.uniform("float",10),viewProjectionInv:C.uniform("mat4"),viewInv:C.uniform("mat4"),transmissiveOutputAlphaMin:C.uniform("float"),openPbrEnergyLut:C.uniform("sampler2D"),viewportSize:C.uniform("vec2"),wavelength:C.uniform("float",0),bevelEnabled:C.uniform("bool",!0),dispersionWavelengths:C.uniform("int",3),bounceLimit:C.uniform("int",8)},includes:[Lt,Ot,Ft,Nt,ca],main:K`
${Li}

${Fi}
${Nt.main}

${us}

${Lt.main}

${Oi}

${Ot.main}
${Ft.main}
${ca.main}

${oa}
${ls}

float nl;
float bp;

${ds}
${Vu}

${la}
struct RayTraceAuxiliary {

vec3 albedo;
vec3 normal;
bool isBlank;

bool isShadowCatcher;
};

void bounce(inout Path aa, inout int depth, inout SurfaceInteraction si, inout OpenPbrResolvedMaterial mat, inout RayTraceAuxiliary outAux) {
bT = uint(max(depth, 0));




${i?uh:""}

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



vec4 bg = cG(aa.ray.o, aa.ray.d);
bg.rgb = aj(bg.rgb, bp);
float da = aa.scatteringIsDelta ? 1.0
: aK(aa.scatteringPdf,
iT(dm(aa.ray.d)) * envLightSelectionPmf);
aa.li += da * aa.beta * bg.rgb * bg.a;
aa.alpha = max(aa.alpha, bg.a);
}
else {
vec2 vo = dm(aa.ray.d);
vec3 emission = textureLinear(envMap, vo).rgb;
emission = aj(emission, bp);
aa.li += aa.beta * emission *
aK(
aa.scatteringPdf,
iT(vo) * envLightSelectionPmf
);
}
#else
vec4 bg = cG(aa.ray.o, aa.ray.d);
bg.rgb = aj(bg.rgb, bp);
aa.li += aa.beta * bg.rgb * bg.a;
#endif
aa.abort = true;
return;
}
}

if (!si.hit) {

vec4 bg = cG(aa.ray.o, aa.ray.d);



bg.rgb = aj(bg.rgb, bp);
if (aa.fromEye) {
aa.li = bg.rgb * bg.a;
aa.alpha = bg.a;

outAux.isBlank = bg.a < 0.01;
}
else {
Ray cam = fj(v_Texcoord + tg());
bool nK = dot(cam.d, aa.ray.d) > 0.0;
if (transmissiveOutputAlphaMin < 1.0) {
if (nK) {
aa.alpha = max(aa.alpha, bg.a);
} else {
aa.alpha = 1.0;
}
}
#if !defined(USE_ENVMAP)

if (nK) {
aa.li = aa.beta * aK(aa.scatteringPdf, 1.0) * bg.rgb;
}
#endif
}
aa.abort = true;
return;
}

bool aJ = false;
if ((mat.materialType == STANDARD || mat.materialType == UNLIT)) {
if (transmissiveOutputAlphaMin < 1.0) {

float alpha = max(1.0 - mat.transmissionWeight, 1.0 - pow(1.0 - transmissiveOutputAlphaMin, float(depth)));
aa.alpha = max(alpha, aa.alpha);
}
float alpha = mat.alpha;
if (alpha < 1.0) {


aa.alpha = max(aa.alpha, alpha);
if (eC(3u) > alpha) {
aJ = true;
}
}
if (!aJ) {
mL(si, mat, aa);
}
else {
aa.ray.o = si.position + aa.ray.d * EPS;
}
}

if (!si.albedoSampled && !aJ) {

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
if (depth >= RR_MAX && !aJ) {

float pn = max(max(aa.beta.x, aa.beta.y), aa.beta.z);
float q = max(0.0, 1.0 - pn);
if (dp(cE(RUSSIAN_ROULETTE)) < q) {


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


intersectScene(aa.ray, si, true);
dg(mat, si.materialIndex, si.uv, si.uv1, si.instanceIndex, si.vertexColor);
si.isTransparency = mat.transmissionWeight > 0.001 || mat.subsurfaceWeight > 0.001 || mat.alpha < 0.999;




if (dispersionWavelengths == 1 && si.hit && mat.transmissionWeight > 0.001 && mat.transmissionDispersionScale > 0.001) {
bp = nl;
}
if (mat.transmissionWeight > 0.001 && bp > 0.0) {
mat.specularIor = ee(
bp,
mat.specularIor,
mat.transmissionDispersionScale,
mat.dispersionAbbeNumber
);
}

if (aJ) {
return;
}

bool hM = eC(3u) < mat.alpha;
#ifdef NUM_LIGHTS

LightSampleRec lightSample;
for (int i = 0; i < NUM_LIGHTS; i++) {

Light light = rB(i);
float d = nr(aa.ray, light, lightSample);
bool lY = si.hit && d > distance(si.position, aa.ray.o);
if (d != INF && !(lY && hM)) {
lightSample.pdf *= light.selectionPmf;
float fl = aK(aa.scatteringPdf, lightSample.pdf);
lightSample.emission = aj(lightSample.emission, bp);
aa.li += fl * aa.beta * lightSample.emission;

aa.alpha = 1.0;
aa.abort = true;
}
}
#endif

#ifdef USE_ENVMAP
if (!(si.hit && hM)) {
if (aa.isNextRefraction) {


vec4 bg = cG(aa.ray.o, aa.ray.d);
bg.rgb = aj(bg.rgb, bp);
float da = aa.scatteringIsDelta ? 1.0
: aK(aa.scatteringPdf,
iT(dm(aa.ray.d)) * envLightSelectionPmf);
aa.li += da * aa.beta * bg.rgb * bg.a;
aa.alpha = max(aa.alpha, bg.a);
aa.abort = true;
return;
}
vec2 uv = dm(aa.ray.d);
vec3 emission = textureLinear(envMap, uv).rgb;
float fl = aK(
aa.scatteringPdf,
iT(uv) * envLightSelectionPmf
);
emission = aj(emission, bp);
aa.li += aa.beta * emission * fl;


#if !defined(USE_BACKGROUND)
aa.alpha = 1.0;
#endif
aa.abort = true;
return;
}
#endif

depth++;
}


vec2 ld(float radius, float xi) {
float x = 0.25;
for (int oD = 0; oD < 10; oD++) {
float x2 = x * x;
float x3 = x2 * x;
float lw = 1.0 - x;
float value = 10.0 * x2 - 20.0 * x3 + 15.0 * x2 * x2 -
4.0 * x2 * x3 - xi;
float mX = 20.0 * x * lw * lw * lw;
if (abs(value) < 1e-6 || mX == 0.0) break;
x = clamp(x - value / mX, 0.0, 1.0);
}
float jL = x * radius;
return vec2(
jL,
sqrt(max(radius * radius - jL * jL, 0.0))
);
}

float jj(float radius, float gM) {
if (gM >= radius) return 0.0;
float pa = radius - gM;
return pa * pa * pa;
}


vec3 nj(SurfaceInteraction source, float radius) {
vec3 geometricNormal = source.faceNormal;
if (dot(geometricNormal, source.vertexNormal) < 0.0) geometricNormal = -geometricNormal;
vec3 tangent;
vec3 bitangent;
aP(geometricNormal, tangent, bitangent);
vec3 iW = vec3(0.0);

for (int iG = 0; iG < BEVEL_SAMPLES; iG++) {
vec2 qf = dZ(CAMERA_BEVEL_BASE + uint(iG));
float cJ = qf.x;
float pv = qf.y;
vec3 dz = geometricNormal;
vec3 fW = tangent;
vec3 eA = bitangent;
float gu = 0.5;
float iB = 0.25;
float gT = 0.25;
if (cJ < 0.5) {
cJ *= 2.0;
}
else if (cJ < 0.75) {
vec3 nI = dz;
dz = fW;
fW = nI;
gu = 0.25;
iB = 0.5;
cJ = (cJ - 0.5) * 4.0;
}
else {
vec3 nI = dz;
dz = eA;
eA = nI;
gu = 0.25;
gT = 0.5;
cJ = (cJ - 0.75) * 4.0;
}

vec2 hj = ld(radius, pv);
float phi = TWOPI * cJ;
vec3 rw = hj.x *
(cos(phi) * fW + sin(phi) * eA);
Ray ray;
gC(
ray,
source.position + dz * hj.y + rw,
-dz
);
SurfaceInteraction hit;
intersectSceneBevel(
ray,
hit,
source.instanceIndex,
max(2.0 * hj.y, EPS)
);
if (!hit.hit) continue;

float lA = gu * abs(dot(dz, hit.faceNormal));
float nC = iB * abs(dot(fW, hit.faceNormal));
float kG = gT * abs(dot(eA, hit.faceNormal));
float weight = lA / max(
lA * lA + nC * nC +
kG * kG,
1e-8
);
weight *= jj(radius, distance(hit.position, source.position)) /
max(jj(radius, hj.x), 1e-8);
iW += weight * hit.vertexNormal;
}

if (dot(iW, iW) <= 1e-12) return source.normal;
vec3 kg = normalize(iW);
vec3 result = source.normal + kg - source.vertexNormal;
return dot(result, result) > 1e-12 ? normalize(result) : source.normal;
}

vec4 cT(SurfaceInteraction si, Ray ray, OpenPbrResolvedMaterial mat, inout RayTraceAuxiliary outAux) {
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
${i?dh:ph}
return vec4(aa.li, aa.alpha);
}

vec4 iU(SurfaceInteraction si, Ray ray, OpenPbrResolvedMaterial mat, inout RayTraceAuxiliary outAux) {
float coverage = clamp(mat.alpha, 0.0, 1.0);
if (!si.hit || (mat.materialType != STANDARD && mat.materialType != UNLIT) || coverage >= 1.0) {
return cT(si, ray, mat, outAux);
}





Ray uG = ray;
uG.o = si.position + ray.d * (EPS * 0.02);
SurfaceInteraction kf = si;
kf.albedoSampled = false;
intersectScene(uG, kf, false);
OpenPbrResolvedMaterial oS;
dg(oS, kf.materialIndex, kf.uv, kf.uv1, kf.instanceIndex, kf.vertexColor);
RayTraceAuxiliary ez = outAux;
if (kf.hit && (oS.materialType == STANDARD || oS.materialType == UNLIT)) {
ez.albedo = oS.transmissionWeight > 0.5
? vec3(1.0)
: oS.baseColor;
ez.normal = dot(
kf.normal,
kf.position - vec3(viewInv[3])
) > 0.0
? -kf.normal
: kf.normal;
kf.albedoSampled = oS.transmissionWeight > 0.5;
}
vec4 back = cT(kf, uG, oS, ez);
if (coverage <= 0.0) {
outAux = ez;
return back;
}

SurfaceInteraction xA = si;
OpenPbrResolvedMaterial vp = mat;
vp.alpha = 1.0;
RayTraceAuxiliary se = outAux;
vec4 front = cT(xA, ray, vp, se);
outAux.albedo = mix(ez.albedo, se.albedo, coverage);
vec3 dl = mix(ez.normal, se.normal, coverage);
outAux.normal = dot(dl, dl) > 1e-12
? normalize(dl)
: vec3(0.0);
outAux.isBlank = ez.isBlank && se.isBlank;
return mix(back, front, coverage);
}



vec4 iu(Ray ray, out RayTraceAuxiliary outAux) {

SurfaceInteraction si;
OpenPbrResolvedMaterial mat;

si.albedoSampled = false;
#ifdef HAS_MEDIUM
si.mediumType = 0;
si.mediumExtinction = vec3(0.0);
si.mediumScattering = vec3(0.0);
si.mediumAnisotropy = 0.0;
#endif

intersectScene(ray, si, false);
dg(mat, si.materialIndex, si.uv, si.uv1, si.instanceIndex, si.vertexColor);
si.isTransparency = mat.transmissionWeight > 0.001 || mat.subsurfaceWeight > 0.001 || mat.alpha < 0.999;

#ifdef HAS_BEVEL
if (bevelEnabled && mat.bevel > 0.0) {
si.normal = nj(si, mat.bevel);
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
mat.specularIor = ee(
bp,
mat.specularIor,
mat.transmissionDispersionScale,
mat.dispersionAbbeNumber
);
}
return iU(si, ray, mat, outAux);
}

void main() {

rG();
gW(v_Texcoord * viewportSize, int(uint(sampleCount) ^ dG(uint(sequenceSeed))));


bp = dispersionWavelengths == 1 ? 0.0 : wavelength;
nl = wavelength;
if (dispersionWavelengths == 1 && wavelength > 0.0) {
float channel = floor(dp(CAMERA_WAVELENGTH) * 3.0);
nl = channel < 1.0 ? 650.0 : channel < 2.0 ? 510.0 : 475.0;
}



Ray cam = oG();

RayTraceAuxiliary outAux;
outAux.albedo = vec3(0.0);
outAux.normal = vec3(0.0);
outAux.isBlank = false;
outAux.isShadowCatcher = false;

vec4 aW = iu(cam, outAux);



#ifdef CLAMPING
float clamping = float(CLAMPING);
aW.rgb = clamp(aW.rgb, -clamping, clamping);
#endif


if (bp > 0.0) {

aW.rgb *= 3.0;
if (dispersionWavelengths != 1) {


aW.a /= 3.0;
}
}
if (!(aW.x < INF && aW.x > -EPS)) {
aW = vec4(0, 0, 0, 1);
}

out_color = aW;
out_albedo = vec4(outAux.albedo, outAux.isBlank ? 0.0 : 1.0);
out_normal = vec4(outAux.normal, 1.0);


float jP = dot(aW.rgb, vec3(0.2126, 0.7152, 0.0722));
out_moments = outAux.isShadowCatcher
? vec4(0.0)
: vec4(jP, jP * jP, 1.0, 0.0);

}`})}var qu=K`





const uint SHADOW_CATCHER_LIGHT_SAMPLES = 4u;

uint lc(uint candidate, uint slot) {
return candidate == 0u ? cE(slot) : cE(9u + (candidate - 1u) * 3u + slot);
}



vec2 sampleShadowCatcher(SurfaceInteraction si, int bounce, inout Path aa) {
vec3 qY = -aa.ray.d;
vec2 counts = vec2(0.0);

#if defined(NUM_LIGHTS) || defined(USE_ENVMAP)
for (uint candidate = 0u; candidate < SHADOW_CATCHER_LIGHT_SAMPLES; candidate++) {
LightSampleRec lightSample;
vec3 lV = vec3(
dZ(lc(candidate, LIGHT_POSITION)),
dp(lc(candidate, LIGHT_SELECT))
);
sampleLight(si.position, lV, lightSample, false);

vec3 lightDir = lightSample.direction;
float cosThetaL = dot(si.normal, lightDir);
float qB = dot(si.normal, qY) * cosThetaL;
if (lightSample.pdf > 0.0 && qB >= 0.0) {
if (dot(lightSample.emission, luminance) * abs(cosThetaL) > 0.0) {
Ray ray;
gC(ray, si.position + EPS * lightDir, lightDir);
bool lY = intersectSceneShadow(ray, lightSample.dist - EPS, si.triangleIndex);
counts += vec2(lY ? 1.0 : 0.0, 1.0);
}
}
}
#endif
aa.fromEye = false;
return counts;
}
`;var hl=new we({name:"shadowCatcher",outputs:["shadowCatcher","catcherBackground","catcherMoments"],defines:{BOUNCES:2},uniforms:{dispersionWavelengths:C.uniform("int",3),wavelength:C.uniform("float",0),viewportSize:C.uniform("vec2"),viewProjectionInv:C.uniform("mat4"),viewInv:C.uniform("mat4"),cameraApertureRadius:C.uniform("float",0),cameraFocusDistance:C.uniform("float",10)},includes:[Lt,Ot,Ft,Nt,ca],main:K`
${Li}
${Fi}
${Nt.main}

${us}

${Lt.main}
${Oi}

${Ot.main}
${Ft.main}
${ca.main}

${oa}
${ds}
${qu}
${la}



vec4 iu(inout Ray ray, out vec4 background, out vec2 shadowCounts) {
background = vec4(0.0);
shadowCounts = vec2(0.0);
Path aa;
aa.ray = ray;
aa.li = vec3(0);
aa.alpha = 1.0;
aa.beta = vec3(1.0);
aa.fromEye = true;
aa.scatteringPdf = 0.0;
aa.abort = false;

SurfaceInteraction si;

intersectScene(aa.ray, si, false);
if (!si.hit) {



return vec4(0.0, 0.0, 0.0, 1.0);
}

OpenPbrResolvedMaterial mat;
dg(mat, si.materialIndex, si.uv, si.uv1, si.instanceIndex, si.vertexColor);
if (mat.materialType != SHADOW_CATCHER) {


return vec4(0.0, 0.0, 0.0, 1.0);
}

vec4 bg = cG(ray.o, ray.d);
background = vec4(bg.rgb * bg.a, bg.a);
if (!aa.abort) {
shadowCounts = sampleShadowCatcher(si, 0, aa);
}
return vec4(1.0, bg.a, bg.a >= 0.01 ? 1.0 : 0.0, 0.0);
}

void main() {
rG();
gW(v_Texcoord * viewportSize, int(uint(sampleCount) ^ dG(uint(sequenceSeed))));

if (dispersionWavelengths == 1 && wavelength > 0.0) { dp(CAMERA_WAVELENGTH); }
Ray cam = oG();
vec4 background;
vec2 shadowCounts;
vec4 aW = iu(cam, background, shadowCounts);

if (!(aW.x < INF && aW.x > -EPS)) {
aW = vec4(0.0);
shadowCounts = vec2(0.0);
}



out_shadowCatcher = vec4(aW.rgb, shadowCounts.x);
out_catcherBackground = background;


float visibility = 1.0 - (shadowCounts.y > 0.0 ? shadowCounts.x / shadowCounts.y : 0.0);
float jP = visibility * (background.a >= 0.01
? dot(background.rgb / background.a, vec3(0.2126, 0.7152, 0.0722))
: 1.0);
out_catcherMoments = aW.r > 0.0
? vec4(jP, jP * jP, 1.0, shadowCounts.y)
: vec4(0.0);

}`});function Ju(i){let e=[],t=new Map,A=[];Ls();for(let r of i){let n=Se(r.transform);for(let s=0;s<Tt(r);s++){let o=r.geometry;o=mh(o,tA(r,s,new Float64Array(16),n)),o.normal?S.forEach(o.normal.array,3,0,void 0,S.normalize,void 0):Ka(o);let l=r.materials.map(c=>{let f=Ct(c),m=t.get(f);return m===void 0&&(m=t.size,t.set(f,m),A.push(c)),m});e.push({geometry:o,materialIndex:l})}}return{geometry:xo(e.map(({geometry:r})=>r),e.map(({materialIndex:r})=>r),new Map,!0),materials:A}}function mh(i,e){let{position:t,normal:A,uv:a,uv1:r,color:n,tangent:s,materialIndex:o,indices:l}={position:i.position.array,normal:i.normal.array,uv:i.uv&&i.uv.array,uv1:i.uv1&&i.uv1.array,color:i.color&&i.color.array,tangent:i.tangent&&i.tangent.array,materialIndex:i.materialIndex&&i.materialIndex.array,indices:i.indexArray},c=new Ge({position:new X(new Float32Array(t),i.position.itemSize),normal:new X(new Float32Array(A),i.normal.itemSize),uv:a&&new X(a,i.uv.itemSize),uv1:r&&new X(r,i.uv1.itemSize),color:n&&new X(n,i.color.itemSize),tangent:s&&new X(new Float32Array(s),i.tangent.itemSize),materialIndex:o&&new X(o,i.materialIndex.itemSize),indices:l&&new X(l,i.indices.itemSize)}),f=Br.normalFromMat4(Br.create(),e);return f==null&&(f=Br.create()),S.forEach(c.position.array,3,0,void 0,S.transformMat4,e),c.normal&&(S.forEach(c.normal.array,3,0,void 0,S.transformMat3,f),S.forEach(c.normal.array,3,0,void 0,S.normalize)),c.tangent&&S.forEach(c.tangent.array,3,0,void 0,S.transformMat3,f),c}var ps=.25;function hh(i,e,t,A,a,r){let n=Dc(e,t,A,a,r);i.source={data:n,width:n.length/4,height:1}}var gl=class{_aovPrimitiveCache=new XA;_renderer;_meshes=[];_sceneEnvironment=new aa;_rectLightTextures=new ra;_analyticLights=[];_analyticLightSelectionPmfs=new Float32Array(0);_analyticLightSelectionCdfs=new Float32Array(0);_envLightSelectionPmf=0;_materialData;_maxTextureArrayBytes=Dt;_preparedMeshData;_membershipCache=new Aa;_pendingMembershipData;_materialChanges=new ia;_pendingMaterialUpdate;_pendingGeometryUpdates=new Set;_needsUpdateMeshData=!0;_needsUpdateMeshMembership=!1;_needsRefitTLAS=!1;_dirtyTransformMeshes=new Set;_dirtyColorMeshes=new Set;_tlas;_bvhData;_instancesData;_materialIndexData;_meshSnapshot=[];_snapshotByMesh=new WeakMap;_needsUpdateAnalyticLightsBuffer=!0;_debugBvhData;_lightTex=new ce(tt);_iesProfileTex=new ce(tt);_iesProfileColumns=1;_iesProfileTexelOffsets=new Int32Array(0);_openPbrEnergyLut=new ce({...tt,source:{data:Fn(),width:32,height:2177}});_envMap=new ce(Hr);_envMapDistribution=new ce(Hr);_envImageSource;_skySource=new fs;_backgroundTex=new ce(Hr);_hasEnvMap=!1;_hasBackground=!1;_groundedBackgroundParams=new Float32Array([0,0,0,0]);_groundedBackgroundCenter=new Float32Array([0,0]);_backgroundMapTransform=lr();_backgroundMapRotation=new Float32Array([1,0,0,0,1,0,0,0,1]);_bounces=2;_bevelSamples=8;_clamping;_samplingCode=-1;_sequenceSeed=0;_zLogSPP=0;_positionBufferTex=new ce(tt);_normalBufferTex=new ce(tt);_colorBufferTex=new ce(tt);_tangentBufferTex=new ce(tt);_uvBufferTex=new ce(tt);_uv1BufferTex=new ce(tt);_bvhBufferTex=new ce(tt);_instancesBufferTex=new ce(tt);_matIndexBufferTex=new ce({...tt});_hasTransmission=!1;_hasAlpha=!1;_invalid=!1;_transmissiveAlphaMin=1;_mainPass;_shadowCatcherPass;_viewProjInv=oe.create();_apertureRadius=0;_focusDistance=10;_aovPass;_aovCenter;_tracePasses;_depthPass;_depthAbort=new AbortController;_depthAspect=1;_hasShadowCatcher=!1;_spectral=!1;constructor(e){this._renderer=e;let t={type:j.FLOAT,minFilter:j.LINEAR,magFilter:j.LINEAR,wrapS:j.CLAMP_TO_EDGE,wrapT:j.CLAMP_TO_EDGE},A=ml();A.parallelCompile=!0,hl.parallelCompile=!0,this._mainPass=new Te("rayTrace",e,{shader:A,outputs:["color","albedo","normal","moments"],outputParams:{color:t,albedo:t,normal:t,moments:t}}),this._shadowCatcherPass=new Te("shadowCatcher",e,{shader:hl,outputs:["shadowCatcher","catcherBackground","catcherMoments"],outputParams:{shadowCatcher:t,catcherBackground:t,catcherMoments:t}}),this._depthPass=new Te("Depth query",e,{shader:ju,outputs:["depth"],outputParams:{depth:tt}}),this._aovPass=new Te("AOV accumulation",e,{shader:cl(!1),outputs:["geometry","position","diffuse","specular"],outputParams:Object.fromEntries(["geometry","position","diffuse","specular"].map(a=>[a,tt]))}),this._aovCenter=new Te("AOV center",e,{shader:cl(!0),outputs:["id","motion"],outputParams:{id:{...tt,type:5125},motion:tt}}),this._tracePasses=[this._aovPass,this._aovCenter,this._mainPass,this._shadowCatcherPass,this._depthPass],this._tracePasses.forEach(a=>{a.setDefines({OES_texture_float_linear:!!e.gl.getExtension("OES_texture_float_linear")})}),this._mainPass.setUniform("openPbrEnergyLut",this._openPbrEnergyLut),this._aovPass.setUniform("openPbrEnergyLut",this._openPbrEnergyLut)}preparePrograms(){this.prepare();let e=this._mainPass.isProgramReady(),t=!this._hasShadowCatcher||this._shadowCatcherPass.isProgramReady();return e&&t}createPass(e,t,A=!1){this.prepare();let a={clear:e,blend:!e,scissor:t};this._mainPass.createPass({},void 0,a),this._hasShadowCatcher&&!A&&this._shadowCatcherPass.createPass({},void 0,a)}getOutput(e){return e==="shadowCatcher"||e==="catcherBackground"||e==="catcherMoments"?this._shadowCatcherPass.getOutput(e):this._mainPass.getOutput(e)}setBounce(e){let t=aA(e),A=this._bounces!==t;return this._bounces=t,A}setClamping(e){let t=this._clamping!==e;return this._clamping=e,t}setBevelSamples(e){let t=nA(e),A=this._bevelSamples!==t;return A&&(this._bevelSamples=t),A}_setEnvMap(e){!$n(e,this._envImageSource)&&e&&(this._envMap.source=e,this._envMapDistribution.source=Xn(e)),this._envImageSource=e,this._tracePasses.forEach(t=>{t.setUniform("envMap",e?this._envMap:null),t.setUniform("envMapDistribution",e?this._envMapDistribution:null),t.setUniform("envLightSelectionPmf",this._envLightSelectionPmf),t.setDefines({USE_ENVMAP:!!e})}),this._hasEnvMap=!!e}setBackground(e){this._backgroundMapTransform.set(lr(e));let t=Yn(e);this._backgroundMapRotation.set([t[0],t[1],t[2],t[4],t[5],t[6],t[8],t[9],t[10]]);let A=e?this._skySource.resolve(jn(e)):void 0;A&&(this._backgroundTex.source=A),this._hasBackground=!!A;let a=e&&!Array.isArray(e)&&"type"in e&&e.type==="GroundedSkybox"?e:void 0;this._groundedBackgroundParams.set(a?[Math.max(a.height,1e-4),Math.max(a.radius,1e-4),a.groundHeight??0,1]:[0,0,0,0]),this._groundedBackgroundCenter.set(a?.center??[0,0])}setTransmissiveOutputAlphaMin(e){let t=this._transmissiveAlphaMin!==e;return this._transmissiveAlphaMin=e,t}setMeshes(e,t){for(let o of t?.colors??[])this._dirtyColorMeshes.add(o);if(t&&this._preparedMeshData&&this._materialData&&!this._needsUpdateMeshData&&e===this._meshes){let o=this._materialChanges.classify(t.materials??[]);if(o.level!=="geometry"&&Gn(this._preparedMeshData,t.geometries??[])){if(t.materials?.length){let l=this._pendingMaterialUpdate;this._pendingMaterialUpdate={level:l?.level==="textures"?"textures":o.level,emission:!!l?.emission||o.emission,emissiveMap:!!l?.emissiveMap||o.emissiveMap,materials:new Set([...l?.materials??[],...t.materials])},this._meshSnapshot.forEach(c=>{c.materialKeys=c.materials.map(Ct)})}for(let l of t.geometries??[])this._pendingGeometryUpdates.add(l);for(let l of this._meshSnapshot)this._pendingGeometryUpdates.has(l.geometry)&&(l.geometryVersion=l.geometry.version);for(let l of t.transforms??[]){let c=this._snapshotByMesh.get(l);if(c){for(let f=0;f<16;f++)c.matrix[f]=l.transform[f];this._dirtyTransformMeshes.add(l),this._needsRefitTLAS=!0}}return!!t.materials?.length||!!t.transforms?.length||!!t.colors?.length||!!t.geometries?.length}}let A=!!t?.materials?.length,a=e.map(o=>({mesh:o,instanceCount:o instanceof be?o.count:1,instanceVersion:o instanceof be?o.transformsVersion:0,instanceTransforms:o instanceof be?o.transforms:void 0,instanceColors:o instanceof be?o.colors:void 0,colorVersion:o instanceof be?o.colorsVersion:0,geometry:o.geometry,materials:o.materials.slice(),materialKeys:o.materials.map(Ct),geometryVersion:o.geometry.version,positionArray:o.geometry.position.array,indexArray:o.geometry.indices.array,matrix:Array.from(o.transform)})),r=a.length!==this._meshSnapshot.length||a.some((o,l)=>o.mesh!==this._meshSnapshot[l]?.mesh||o.instanceCount!==this._meshSnapshot[l]?.instanceCount||o.materials.some((c,f)=>c!==this._meshSnapshot[l]?.materials[f])),n=!this._needsUpdateMeshData&&r&&this._preparedMeshData?this._membershipCache.update(this._preparedMeshData,e):void 0;if(n){let o=new Map(this._meshSnapshot.flatMap(c=>c.materials.map((f,m)=>[f,c.materialKeys[m]]))),l=n.materials.length!==this._preparedMeshData.materials.length||n.materials.some((c,f)=>c!==this._preparedMeshData.materials[f]||o.has(c)&&Ct(c)!==o.get(c));return this._pendingMembershipData=n,this._meshes=e,this._meshSnapshot=a,this._snapshotByMesh=new WeakMap,a.forEach(c=>this._snapshotByMesh.set(c.mesh,c)),this._needsUpdateMeshMembership=!0,this._needsRefitTLAS=!1,this._dirtyTransformMeshes.clear(),l&&(this._pendingMaterialUpdate={level:"textures",emission:!0,emissiveMap:!0,materials:new Set(n.materials)}),!0}let s=a.length!==this._meshSnapshot.length||a.some((o,l)=>{let c=this._meshSnapshot[l];return!c||o.mesh!==c.mesh||o.instanceCount!==c.instanceCount||o.instanceVersion!==c.instanceVersion||o.instanceTransforms!==c.instanceTransforms||o.geometry!==c.geometry||o.colorVersion!==c.colorVersion||o.instanceColors!==c.instanceColors||o.materials.length!==c.materials.length||o.materials.some((f,m)=>f!==c.materials[m])||o.materialKeys.some((f,m)=>f!==c.materialKeys[m])||o.geometryVersion!==c.geometryVersion||o.matrix.some((f,m)=>f!==c.matrix[m])});return a.forEach((o,l)=>{let c=this._meshSnapshot[l];c&&o.geometry===c.geometry&&(o.geometryVersion!==c.geometryVersion||o.positionArray!==c.positionArray||o.indexArray!==c.indexArray)&&(o.materials[0]?.displacementMap&&Math.abs(o.materials[0].displacementScale)>1e-6||or(this._preparedMeshData,o.geometry)||!ge(o.geometry)||!yA(ge(o.geometry),o.geometry))&&ct(o.geometry,void 0)}),this._meshSnapshot=a,this._snapshotByMesh=new WeakMap,a.forEach(o=>this._snapshotByMesh.set(o.mesh,o)),!s&&t&&!A?!1:(this._meshes=e,this._needsUpdateMeshData=!0,this._needsRefitTLAS=!1,this._dirtyTransformMeshes.clear(),this._debugBvhData=void 0,!0)}setTextureAtlasBudget(e){let t=Number.isFinite(e)?Math.max(4,Math.floor(e)):Dt;return t===this._maxTextureArrayBytes?!1:(this._maxTextureArrayBytes=t,this._needsUpdateMeshData=!0,!0)}getDebugBVHData(){if(!this._debugBvhData){let e=Ju(this._meshes),t=Qi(e.geometry);this._debugBvhData={buffer:t.buffer}}return this._debugBvhData}_loadDiagnosticAccumulation(e,t){this._mainPass.loadDiagnosticOutputs({color:e.color,albedo:e.albedo,normal:e.normal,moments:e.moments}),this._shadowCatcherPass.loadDiagnosticOutputs({shadowCatcher:e.shadowCatcher,catcherBackground:e.catcherBackground,catcherMoments:e.catcherMoments}),this._hasShadowCatcher=t}getDiagnostics(){return{textureAtlas:this._materialData?.textureAtlasStats}}_updateMeshData(){this._pendingGeometryUpdates.clear(),this._needsUpdateMeshData=!1;let e=un(this._meshes,{displacement:!1});this._preparedMeshData=e,this._membershipCache.capture(e),this._pendingMembershipData=void 0,this._needsUpdateMeshMembership=!1;let t=e.geometry,A=e.materials,a=Hi(e.instances,e.blases);this._tlas=a;let r=new Float32Array(a.buffer),n=this._instancesData=new Float32Array(a.instancesBuffer),s=new Float32Array(xA(e.blases)),o=this._bvhData=new Float32Array(r.length+s.length),l=r.length/4;o.set(r),o.set(s,l*4),t.position.array.length>0&&(gt(this._positionBufferTex,t.position.array,3),gt(this._normalBufferTex,t.normal.array,3),t.color&&gt(this._colorBufferTex,t.color.array,3),t.tangent&&gt(this._tangentBufferTex,t.tangent.array,4),t.uv&&gt(this._uvBufferTex,t.uv.array,2),t.uv1&&gt(this._uv1BufferTex,t.uv1.array,2),t.materialIndex&&gt(this._matIndexBufferTex,this._materialIndexData=new Float32Array(t.materialIndex.array),4)),o.length>0&&(gt(this._bvhBufferTex,o,4),gt(this._instancesBufferTex,n,4)),this._materialData?.dispose(this._renderer.gl);let c=new jA(A,this._analyticLights,{maxTextureArrayBytes:this._maxTextureArrayBytes,maxTextureArrayLayers:this._renderer.gl.getParameter(this._renderer.gl.MAX_ARRAY_TEXTURE_LAYERS),maxTextureDimension2D:this._renderer.gl.getParameter(this._renderer.gl.MAX_TEXTURE_SIZE)});return this._materialData=c,this._tracePasses.forEach(f=>{f.setUniforms({bvhBuffer:this._bvhBufferTex,instancesBuffer:this._instancesBufferTex,positionBuffer:this._positionBufferTex,normalBuffer:this._normalBufferTex,tangentBuffer:t.tangent?this._tangentBufferTex:null,colorBuffer:t.color?this._colorBufferTex:null,uvBuffer:t.uv?this._uvBufferTex:null,uv1Buffer:t.uv1?this._uv1BufferTex:null,materialIndexBuffer:this._matIndexBufferTex,bvhColumns:Pi(o.length/4).columnsLog,vertexColumns:Pi(X.getCount(t.position)).columnsLog,instancesColumns:Pi(n.length/4).columnsLog,blasOffset:l,isEmptyScene:+(e.instances.length===0)})}),this._updateMaterialConstants(A,c,t),this._materialChanges.capture(A),this._pendingMaterialUpdate=void 0,o}_updateMaterialConstants(e,t,A){let r=e.some(o=>o.shadowCatcher),n=e.some(o=>o.bevelSize>0),s=e.some(GA);this._hasShadowCatcher=r,this._hasTransmission=e.some(o=>o.transmissionWeight>0||o.mapAlphaUsage==="transmission"),this._hasAlpha=e.some(o=>di(o)!=="opaque"),this._spectral=e.some(o=>o.transmissionDispersionScale>0),this._tracePasses.forEach(o=>{o.setDefines({OES_texture_float_linear:!0,STACK_SIZE:50,USE_VERTEX_COLOR:A.color!=null,USE_TANGENT:A.tangent!=null,USE_COAT_NORMAL_FRAMES:e.some(l=>l.coatWeight>0&&(!!l.normalMap||!!l.coatNormalMap)),HAS_TRANSMISSION:this._hasTransmission,HAS_GLTF_ANISOTROPY:e.some(l=>l.specularAnisotropyModel==="gltf"&&l.specularAnisotropy>0),HAS_BEVEL:n,HAS_MEDIUM:s,HAS_ALPHA:this._hasAlpha,BEVEL_SAMPLES:this._bevelSamples,RECT_LIGHT:3,SPHERE_LIGHT:2,DIRECTIONAL_LIGHT:1,USE_RR:!0,RR_MAX:s?12:2,...t.defines}),t.setToPass(o)})}_updateMeshMembership(){let e=this._pendingMembershipData;this._preparedMeshData=e;let t=this._tlas=Hi(e.instances,e.blases),A=new Float32Array(xA(e.blases)),a=this._bvhData=new Float32Array(t.buffer.byteLength/4+A.length);a.set(new Float32Array(t.buffer)),a.set(A,t.buffer.byteLength/4),this._instancesData=new Float32Array(t.instancesBuffer),gt(this._bvhBufferTex,a,4),gt(this._instancesBufferTex,this._instancesData,4),this._tracePasses.forEach(r=>r.setUniforms({bvhColumns:Pi(a.length/4).columnsLog,instancesColumns:Pi(this._instancesData.length/4).columnsLog,blasOffset:t.buffer.byteLength/16,isEmptyScene:+(e.instances.length===0)})),this._pendingMembershipData=void 0,this._needsUpdateMeshMembership=!1,this._debugBvhData=void 0}_updateGeometryData(){let e=this._preparedMeshData,t=this._tlas,A=Hn(e,this._pendingGeometryUpdates);for(let{first:a,count:r,topologyChanged:n,deformationOnly:s}of A.vertices){for(let[l,c]of[[e.geometry.position,this._positionBufferTex],[e.geometry.normal,this._normalBufferTex],[e.geometry.tangent,this._tangentBufferTex],[e.geometry.color,this._colorBufferTex],[e.geometry.uv,this._uvBufferTex],[e.geometry.uv1,this._uv1BufferTex]])l&&(!s||l===e.geometry.position||l===e.geometry.normal||l===e.geometry.tangent)&&c.updateDataRange(this._renderer.gl,l.array,a*l.itemSize*4,r*l.itemSize*4);if(!n)continue;let o=this._materialIndexData;for(let l=a*4;l<(a+r)*4;l++)o[l]=e.geometry.materialIndex.array[l];this._matIndexBufferTex.updateDataRange(this._renderer.gl,o,a*16,r*16)}for(let a of A.meshes)this._dirtyTransformMeshes.add(a);if(A.relocated)for(let a of e.instanceBindings)this._dirtyTransformMeshes.add(a.mesh);if(A.resized){e.instances=Yt(e.instanceBindings),bA(t,e.instances,e.blases);let a=new Float32Array(xA(e.blases));this._bvhData=new Float32Array(t.buffer.byteLength/4+a.length),this._bvhData.set(new Float32Array(t.buffer)),this._bvhData.set(a,t.buffer.byteLength/4),gt(this._bvhBufferTex,this._bvhData,4),this._tracePasses.forEach(r=>r.setUniform("bvhColumns",Pi(this._bvhData.length/4).columnsLog))}else{let a=[];for(let{blas:r,offset:n}of A.blases){let s=t.buffer.byteLength+n;new Uint8Array(this._bvhData.buffer).set(new Uint8Array(r.buffer),s),a.push({offset:s,size:r.buffer.byteLength})}for(let{offset:r,size:n}of wr(a))this._bvhBufferTex.updateDataRange(this._renderer.gl,this._bvhData,r,n)}this._needsRefitTLAS=!0,this._pendingGeometryUpdates.clear(),this._debugBvhData=void 0}_updateMeshColors(){let e=this._preparedMeshData,t=this._tlas;if(e&&t){let A=dn(e.instanceBindings,e.instances,this._dirtyColorMeshes),a=_r(t,e.instances,A);for(let{offset:r,size:n}of a)this._instancesBufferTex.updateDataRange(this._renderer.gl,this._instancesData,r,n)}this._dirtyColorMeshes.clear()}_refitMeshInstances(){let e=this._preparedMeshData,t=this._tlas,A=Ja(e.instanceBindings,this._dirtyTransformMeshes,e.instances),a=e.instances;if(e.instances=Yt(e.instanceBindings,e.instances,A),!ha(a,e.instances)){this._pendingMembershipData=e,this._updateMeshMembership(),this._dirtyTransformMeshes.clear(),this._needsRefitTLAS=!1;return}let r=bA(t,e.instances,e.blases,A);this._bvhData.set(new Float32Array(t.buffer));for(let{offset:n,size:s}of r.tlasRanges)this._bvhBufferTex.updateDataRange(this._renderer.gl,this._bvhData,n,s);for(let{offset:n,size:s}of r.instanceRanges)this._instancesBufferTex.updateDataRange(this._renderer.gl,this._instancesData,n,s);this._dirtyTransformMeshes.clear(),this._needsRefitTLAS=!1,this._debugBvhData=void 0}_updateMaterialData(){let e=this._pendingMaterialUpdate,t=this._preparedMeshData,A=this._materialData;e.level==="textures"?(A.dispose(this._renderer.gl),A=this._materialData=new jA(t.materials,this._analyticLights,{maxTextureArrayBytes:this._maxTextureArrayBytes,maxTextureArrayLayers:this._renderer.gl.getParameter(this._renderer.gl.MAX_ARRAY_TEXTURE_LAYERS),maxTextureDimension2D:this._renderer.gl.getParameter(this._renderer.gl.MAX_TEXTURE_SIZE)}),this._needsUpdateAnalyticLightsBuffer=!0):A.repackParams(t.materials),this._updateMaterialConstants(t.materials,A,t.geometry),(e.emission||e.emissiveMap)&&(t.emissiveBindings=t.instanceBindings.filter(a=>a.materialIndices.some(r=>pA(t.materials[r])))),this._materialChanges.capture([...e.materials]),this._pendingMaterialUpdate=void 0}setLights(e){let t=e.filter(p=>p.type==="DirectionalLight"||p.type==="SphereLight"||p.type==="SpotLight"||p.type==="RectLight"),A=t.length,a=this._skySource.resolve(this._sceneEnvironment.update(e)),r=Wn(e),n=[r[0],r[1],r[2],r[4],r[5],r[6],r[8],r[9],r[10]];this._tracePasses.forEach(p=>p.setUniform("environmentRotation",n));let s=sn(a),o=t.map(rn),l=s+o.reduce((p,g)=>p+g,0),c=t.length+(a?1:0),f=c>0?1/c:0;this._envLightSelectionPmf=a?l>0?(1-ps)*f+ps*(s/l):f:0,this._analyticLightSelectionPmfs=Float32Array.from(o,p=>l>0?(1-ps)*f+ps*(p/l):f);let m=this._envLightSelectionPmf;this._analyticLightSelectionCdfs=Float32Array.from(this._analyticLightSelectionPmfs,p=>(m+=p,m)),this._analyticLightSelectionCdfs.length>0&&(this._analyticLightSelectionCdfs[this._analyticLightSelectionCdfs.length-1]=1),this._tracePasses.forEach(p=>{p.setDefines({NUM_LIGHTS:A,HAS_SPHERE_LIGHTS:!!t.find(g=>g.type==="SphereLight"),HAS_SPOT_LIGHTS:!!t.find(g=>g.type==="SpotLight"),HAS_RECT_LIGHTS:!!t.find(g=>g.type==="RectLight"),HAS_DIRECTIONAL_LIGHTS:!!t.find(g=>g.type==="DirectionalLight")})});let d=this._rectLightTextures.update(t);this._analyticLights=t;let u=nn(t);this._iesProfileTexelOffsets=u.offsets,this._iesProfileColumns=gt(this._iesProfileTex,u.data.length?u.data:new Float32Array(4),4).columns,d&&(this._needsUpdateMeshData=!0),this._needsUpdateAnalyticLightsBuffer=!0,this._setEnvMap(a)}_getViewProjInv(e,t){oe.invert(t,e.getProjectionMatrix(this._depthAspect)),oe.mul(t,e.transform,t)}setCamera(e){let t=this._viewProjInv;this._apertureRadius=ea(e),this._focusDistance=e.focusDistance,this._getViewProjInv(e,t),this._tracePasses.forEach(A=>{A.setUniform("viewProjectionInv",t),A.setUniform("viewInv",e.transform),A.setUniform("cameraApertureRadius",this._apertureRadius),A.setUniform("cameraFocusDistance",e.focusDistance)})}cameraChanged(e){let t=oe.create();return this._getViewProjInv(e,t),!qn(this._viewProjInv,t)||ea(e)!==this._apertureRadius||e.focusDistance!==this._focusDistance}setSize(e,t,A=e/t){this._depthAspect=A,this._tracePasses.forEach(a=>{a.setSize(a===this._depthPass?7:e,a===this._depthPass?7:t),a.setUniform("pixelSize",[1/e,1/t])})}setJitter(e,t){this._tracePasses.forEach(A=>{A.setUniform("jitter",[e,t])})}releaseTarget(e){this._mainPass.releaseTarget(e),this._shadowCatcherPass.releaseTarget(e)}getTargetMemoryBytes(e){return this._mainPass.getMemoryBytes(e)+this._shadowCatcherPass.getMemoryBytes(e)}useTarget(e){this._mainPass.useTarget(e),this._shadowCatcherPass.useTarget(e)}setQuality(e){this._tracePasses.forEach(t=>{t.setUniform("bounceLimit",aA(e.bounces)),t.setUniform("bevelEnabled",e.bevel),t.setUniform("dispersionWavelengths",e.dispersionWavelengths)})}setWavelength(e){this._tracePasses.forEach(t=>{t.setUniform("wavelength",e)})}setSampleCount(e){this._tracePasses.forEach(t=>{t.setUniform("sampleCount",e)})}isInvalid(){return this._invalid}hasShadowCatcher(){return this._hasShadowCatcher}hasDispersion(){return this._spectral}prepare(){if(this._needsUpdateMeshData?this._updateMeshData():this._needsUpdateMeshMembership&&this._updateMeshMembership(),this._pendingGeometryUpdates.size&&this._updateGeometryData(),this._needsRefitTLAS&&this._refitMeshInstances(),this._dirtyColorMeshes.size&&this._updateMeshColors(),this._pendingMaterialUpdate&&this._updateMaterialData(),this._needsUpdateAnalyticLightsBuffer){let e=this._analyticLights;e.length>0&&hh(this._lightTex,e,this._materialData.getLightTexturesIndices(),this._analyticLightSelectionPmfs,this._analyticLightSelectionCdfs,this._iesProfileTexelOffsets),this._needsUpdateAnalyticLightsBuffer=!1}this._tracePasses.forEach(e=>{e.setUniform("backgroundMap",this._hasBackground?this._backgroundTex:this._hasEnvMap?this._envMap:null),e.setUniform("transmissiveOutputAlphaMin",Math.max(Math.min(1,this._transmissiveAlphaMin),0)),e.setUniform("lightsTex",this._lightTex),e.setUniform("iesProfileData",this._iesProfileTex),e.setUniform("iesProfileColumns",this._iesProfileColumns),e.setUniform("groundedBackgroundParams",this._groundedBackgroundParams),e.setUniform("groundedBackgroundCenter",this._groundedBackgroundCenter),e.setUniform("backgroundMapTransform",this._backgroundMapTransform),e.setUniform("backgroundMapRotation",this._backgroundMapRotation),e.setDefines({BOUNCES:Jn()?Math.min(this._bounces,3)*(this._hasTransmission||this._hasAlpha?2:1):this._bounces,CLAMPING:this._clamping||void 0,BEVEL_SAMPLES:this._bevelSamples,USE_BACKGROUND:this._hasBackground,USE_GROUNDED_BACKGROUND:this._groundedBackgroundParams[3]>0})})}setSamplingPattern(e,t,A=0){let a=In(e),r=Sn(a===1?t-1:t),n=this._samplingCode!==a||this._sequenceSeed!==A>>>0||a===1&&this._zLogSPP!==r;return this._samplingCode=a,this._sequenceSeed=A>>>0,this._zLogSPP=r,this._tracePasses.forEach(s=>{s.setUniform("samplingPattern",a),s.setUniform("sequenceSeed",this._sequenceSeed),s.setUniform("zSobolLogSPP",r)}),n}setSampleSequenceOffset(e){}prepareAovs(e,t,A,a,r){if(!r.length||!this._preparedMeshData||!this._tlas)return!0;if(!this._renderer.gl.getExtension("EXT_color_buffer_float"))throw new Error("AOV requires EXT_color_buffer_float");if(this.prepare(),e.resize(A,a),this._aovPass.setDefines({AOV_REFLECTANCE:(je(r)&24)!==0}),!e.frame){let c=Cn(this._preparedMeshData,this._tlas,t,A,a,e.history,this._aovPrimitiveCache.get(this._preparedMeshData,this._tlas));e.frame=c.frame,e.setScene(c.words)}this._aovCenter.setUniform("aovScene",e.scene),this._aovCenter.setUniform("previousId",e.previousCenter.id),this._aovCenter.setUniform("previousMotion",e.previousCenter.motion),this._aovPass.setUniform("aovScene",e.scene),this._aovCenter.setSize(A,a),this._aovPass.setSize(A,a);let s=e.accumulation[(e.samples+1)%2],o=this._aovCenter.isProgramReady(),l=this._aovPass.isProgramReady({previousGeometry:s.geometry,previousPosition:s.position,previousDiffuse:s.diffuse,previousSpecular:s.specular});return o&&l}renderAovs(e,t,A,a,r,n,s,o=0){if(!s.length||!this._preparedMeshData||!this._tlas)return!0;if(!this.prepareAovs(e,t,A,a,s))return!1;e.centerReady||(this._aovCenter.createPass({},e.center),e.centerReady=!0,e.history.accept(e.frame));let l=Math.min(r,n);for((je(s)&31)===0&&(e.samples=l);e.samples<l;){let c=e.accumulation[e.samples%2],f=e.accumulation[(e.samples+1)%2];this._aovPass.setUniform("aovMask",je(s)),this._aovPass.setUniform("aovSample",e.samples),this._aovPass.setUniform("sampleCount",e.samples+o),this._aovPass.createPass({previousGeometry:f.geometry,previousPosition:f.position,previousDiffuse:f.diffuse,previousSpecular:f.specular},c),e.samples++}return!0}async readDepthSamples(e,t){if(this._depthAbort.signal.aborted||this._invalid||!this._preparedMeshData||!this._renderer.isAllProgramCompiled())return;this.prepare(),this._depthPass.setUniform("depthArea",qA(e,t??this._depthAspect)),this._depthPass.createPass({});let A=await zu(this._renderer.gl,7,7,this._depthAbort.signal);return pn(A)}dispose(){this._skySource.dispose(),this._depthAbort.abort(),this._materialData?.dispose(this._renderer.gl),this._materialData=void 0,this._tracePasses.forEach(t=>t.dispose());let e=this._renderer.gl;[this._lightTex,this._openPbrEnergyLut,this._envMap,this._envMapDistribution,this._backgroundTex,this._positionBufferTex,this._normalBufferTex,this._colorBufferTex,this._tangentBufferTex,this._uvBufferTex,this._uv1BufferTex,this._bvhBufferTex,this._instancesBufferTex,this._matIndexBufferTex].forEach(t=>t.dispose(e))}},Ku=gl;var gh=new we({name:"normalizeRayTraceOutput",outputs:["color","albedo","normal","shadowCatcher"],uniforms:{colorTex:C.uniform("sampler2D"),albedoTex:C.uniform("sampler2D"),normalTex:C.uniform("sampler2D"),shadowCatcherTex:C.uniform("sampler2D"),catcherMomentsTex:C.uniform("sampler2D"),sampleCount:C.uniform("float",1),lightScale:C.uniform("vec2",[1,1])},main:K`
void main() {
vec2 uv = lightScale * v_Texcoord;
vec4 tb = sample_albedoTex(uv);
float hit = tb.a;
vec4 tf = sample_normalTex(uv);



float tK = max(tf.a, 1.0);
vec3 albedo = tb.rgb / tK;
vec3 normal = tf.rgb / tK;
vec4 shadowCatcher = sample_shadowCatcherTex(uv);



float tj = sample_catcherMomentsTex(uv).w;
float opacity = tj > 0.0 ? shadowCatcher.a / tj : 0.0;
shadowCatcher /= sampleCount;
shadowCatcher.a = 1.0 - shadowCatcher.r * opacity;
vec4 tQ = sample_colorTex(uv);




vec4 light = vec4(tQ.rgb / (hit > 0.0 ? hit : sampleCount), tQ.a / sampleCount);



out_normal = dot(normal, normal) > 0.1 ? vec4(normal * 0.5 + 0.5, 1.0) : vec4(0.0);
out_albedo = vec4(albedo, 1.0);
out_shadowCatcher = shadowCatcher;
out_color = light;
}
`}),$u=gh;var ms=class{_renderer;_pass;_layersPass;constructor(e){this._renderer=e,this._pass=new Te("rayTraceOutput",e,{shader:$u,outputs:["color","albedo","normal","shadowCatcher"],outputParams:{color:{type:j.HALF_FLOAT,minFilter:j.LINEAR,magFilter:j.LINEAR},albedo:{type:j.UNSIGNED_BYTE},normal:{type:j.UNSIGNED_BYTE},shadowCatcher:{type:j.HALF_FLOAT}}}),this._layersPass=new Te("rayTraceLayers",e,{shader:new we({name:"normalizeRayTraceLayers",outputs:["foreground","catcherBackground"],uniforms:{colorTex:C.uniform("sampler2D"),albedoTex:C.uniform("sampler2D"),normalTex:C.uniform("sampler2D"),shadowCatcherTex:C.uniform("sampler2D"),catcherBackgroundTex:C.uniform("sampler2D"),sampleCount:C.uniform("float",1)},main:K`
void main() {
vec4 light = sample_colorTex(v_Texcoord);
vec4 mask = sample_shadowCatcherTex(v_Texcoord);
vec4 background = sample_catcherBackgroundTex(v_Texcoord);
float hit = sample_albedoTex(v_Texcoord).a;

float rj = max(sample_normalTex(v_Texcoord).a, 1.0) / sampleCount;
float jo = max(hit - mask.b * rj, 0.0);
out_foreground = vec4(
(light.rgb - background.rgb * rj)
/ (jo > 0.0 ? jo : sampleCount),
clamp((light.a - background.a) / sampleCount, 0.0, 1.0)
);
out_catcherBackground = background / sampleCount;
}`}),outputs:["foreground","catcherBackground"],outputParams:{foreground:{type:j.HALF_FLOAT},catcherBackground:{type:j.HALF_FLOAT}}})}setSize(e,t){this._pass.setSize(e,t),this._layersPass.setSize(e,t)}setSampleCount(e){this._pass.setUniform("sampleCount",Math.max(e,1)),this._layersPass.setUniform("sampleCount",Math.max(e,1))}createPass(e){this._pass.setOutputs(e.hasShadowCatcher()?["color","albedo","normal","shadowCatcher"]:["color","albedo","normal"]),this._pass.createPass({colorTex:e.getOutput("color"),albedoTex:e.getOutput("albedo"),normalTex:e.getOutput("normal"),shadowCatcherTex:e.hasShadowCatcher()?e.getOutput("shadowCatcher"):this._renderer.emptyTexture,catcherMomentsTex:e.hasShadowCatcher()?e.getOutput("catcherMoments"):this._renderer.emptyTexture},void 0,{clear:!0}),e.hasShadowCatcher()?(this._layersPass.setOutputs(["foreground","catcherBackground"]),this._layersPass.createPass({colorTex:e.getOutput("color"),albedoTex:e.getOutput("albedo"),normalTex:e.getOutput("normal"),shadowCatcherTex:e.getOutput("shadowCatcher"),catcherBackgroundTex:e.getOutput("catcherBackground")},void 0,{clear:!0})):this._layersPass.setOutputs([])}getOutput(e){return e==="foreground"||e==="catcherBackground"?this._layersPass.getOutput(e)??this._renderer.emptyTexture:this._pass.getOutput(e)??this._renderer.emptyTexture}retainOutput(e){this._pass.retainOutput(e),this._layersPass.retainOutput(e)}releaseOutput(e){this._pass.releaseOutput(e),this._layersPass.releaseOutput(e)}getMemoryBytes(){return this._pass.getMemoryBytes()+this._layersPass.getMemoryBytes()}dispose(){this._pass.dispose(),this._layersPass.dispose()}};var Xu=new we({name:"blend",uniforms:{colorTex1:C.uniform("sampler2D"),colorTex2:C.uniform("sampler2D"),weight1:C.uniform("float",.5),weight2:C.uniform("float",.5)},main:K`void main() {
out_color = sample_colorTex1(v_Texcoord) * weight1
+ sample_colorTex2(v_Texcoord) * weight2;
}`}),Zu=new we({name:"downsample",uniforms:{colorTex:C.uniform("sampler2D")},main:K`void main() {
vec2 d = 1.0 / vec2(colorTexRegion());
out_color = (sample_colorTex(v_Texcoord + d * vec2(-0.5, -0.5))
+ sample_colorTex(v_Texcoord + d * vec2(0.5, -0.5))
+ sample_colorTex(v_Texcoord + d * vec2(-0.5, 0.5))
+ sample_colorTex(v_Texcoord + d * vec2(0.5, 0.5))) * 0.25;
}`}),vl=new we({name:"gaussianBlur",uniforms:{colorTex:C.uniform("sampler2D"),blurDir:C.uniform("int",0),blurSize:C.uniform("float",1)},main:K`void main() {
vec2 size = vec2(colorTexRegion());
vec2 d = (blurDir == 0 ? vec2(1.0, 0.0) : vec2(0.0, 1.0)) * blurSize / size;
out_color = sample_colorTex(v_Texcoord) * 0.227027
+ (sample_colorTex(v_Texcoord + d * 1.384615) + sample_colorTex(v_Texcoord - d * 1.384615)) * 0.316216
+ (sample_colorTex(v_Texcoord + d * 3.230769) + sample_colorTex(v_Texcoord - d * 3.230769)) * 0.070270;
}`});var ed=new we({name:"bloomBright",uniforms:{colorTex:C.uniform("sampler2D"),threshold:C.uniform("float",1),scale:C.uniform("float",1)},main:K`
const vec3 wE = vec3(0.2125, 0.7154, 0.0721);
vec4 tS(vec4 a, vec4 b, vec4 c) {
return a + b + c - min(min(a, b), c) - max(max(a, b), c);
}
void main() {
vec2 d = 1.0 / vec2(colorTexRegion());
vec4 dk = sample_colorTex(v_Texcoord);
vec4 s1 = sample_colorTex(v_Texcoord - vec2(d.x, 0.0));
vec4 s2 = sample_colorTex(v_Texcoord + vec2(d.x, 0.0));
vec4 s3 = sample_colorTex(v_Texcoord - vec2(0.0, d.y));
vec4 s4 = sample_colorTex(v_Texcoord + vec2(0.0, d.y));
dk = tS(tS(dk, s1, s2), s3, s4);
float lum = dot(dk.rgb, wE);
out_color = lum > threshold && dk.a > 0.0
? vec4(dk.rgb * scale, dk.a)
: vec4(0.0, 0.0, 0.0, dk.a);
}`}),td=new we({name:"compose",uniforms:{colorTex:C.uniform("sampler2D"),foregroundTex:C.uniform("sampler2D"),catcherBackgroundTex:C.uniform("sampler2D"),shadowCatcherTex:C.uniform("sampler2D"),bloomTex:C.uniform("sampler2D"),exposure:C.uniform("float",1),shadowCatcherColor:C.uniform("vec3",[0,0,0]),shadowCatcherAlpha:C.uniform("float",1),shadowCatcherEnabled:C.uniform("float",0),bloomIntensity:C.uniform("float",0),toneMappingMode:C.uniform("int",0),contrast:C.uniform("float",1),saturation:C.uniform("float",1),temperature:C.uniform("float",0),tint:C.uniform("float",0),vignette:C.uniform("float",0),outputMode:C.uniform("int",0),sRGBOutput:C.uniform("bool",1)},main:K`
vec3 od(vec3 color) {
color = max(color, 0.0);
return mix(1.055 * pow(color, vec3(1.0 / 2.4)) - 0.055,
color * 12.92, lessThanEqual(color, vec3(0.0031308)));
}
vec3 ky(vec3 color) {
return clamp(color, 0.0, 1.0);
}
vec3 jf(vec3 color) {
return clamp(color / (vec3(1.0) + color), 0.0, 1.0);
}
vec3 kj(vec3 color) {
color = max(vec3(0.0), color - 0.004);
return pow((color * (6.2 * color + 0.5)) /
(color * (6.2 * color + 1.7) + 0.06), vec3(2.2));
}
vec3 pH(vec3 value) {
vec3 lv = value * (value + 0.0245786) - 0.000090537;
vec3 aq = value * (0.983729 * value + 0.4329510) + 0.238081;
return lv / aq;
}
vec3 mh(vec3 color) {
const mat3 qs = mat3(
vec3(0.59719, 0.07600, 0.02840),
vec3(0.35458, 0.90834, 0.13383),
vec3(0.04823, 0.01566, 0.83777)
);
const mat3 outputMatrix = mat3(
vec3(1.60475, -0.10208, -0.00327),
vec3(-0.53108, 1.10813, -0.07276),
vec3(-0.07367, -0.00605, 1.07602)
);
color = qs * (color / 0.6);
return clamp(outputMatrix * pH(color), 0.0, 1.0);
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
vec3 gh(vec3 value) {
vec3 nM = value * value;
vec3 rR = nM * nM;
return 15.5 * rR * nM - 40.14 * rR * value
+ 31.96 * rR - 6.868 * nM * value
+ 0.4298 * nM + 0.1191 * value - 0.00232;
}
vec3 mM(vec3 color) {
const mat3 qu = mat3(
vec3(0.856627153315983, 0.137318972929847, 0.11189821299995),
vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903),
vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859)
);
const mat3 pt = mat3(
vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826),
vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294),
vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405)
);
color = qu * (LINEAR_SRGB_TO_LINEAR_REC2020 * color);
color = clamp((log2(max(color, 1e-10)) + 12.47393) / 16.5, 0.0, 1.0);
color = pt * gh(color);
color = pow(max(color, 0.0), vec3(2.2));
return clamp(LINEAR_REC2020_TO_LINEAR_SRGB * color, 0.0, 1.0);
}
vec3 cp(vec3 color) {
if (toneMappingMode == 1) return mh(color);
if (toneMappingMode == 2) return kj(color);
if (toneMappingMode == 3) return jf(color);
if (toneMappingMode == 4) return ky(color);
return mM(color);
}
vec3 gq(vec3 color) {
vec3 uH = vec3(
1.0 + temperature * 0.16 + tint * 0.04,
1.0 - tint * 0.12,
1.0 - temperature * 0.16 + tint * 0.04
);
color = max(color * uH, 0.0);
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
color.rgb = gq(color.rgb * exposure);
if (sRGBOutput) {
float edge = smoothstep(0.2, 0.72, distance(uv, vec2(0.5)));
color.rgb *= 1.0 - vignette * edge;
color.rgb = cp(color.rgb);
color.rgb = od(color.rgb);
}
color.a = max(color.a, min(dot(bloom.rgb, vec3(0.2125, 0.7154, 0.0721)), 1.0));

if (shadowCatcherEnabled > 0.5) {
float coverage = clamp(shadow.r, 0.0, 1.0);


float gf = clamp(
(1.0 - shadow.a) / max(coverage, 0.000001), 0.0, 1.0
);
gf = max(gf - (1.0 - shadowCatcherAlpha), 0.0);
if (coverage > 0.0) {
vec4 foreground = sample_foregroundTex(uv);
vec4 background = sample_catcherBackgroundTex(uv);
vec3 foregroundColor = gq((foreground.rgb + bloom.rgb) * exposure);
vec3 backgroundColor = gq((background.rgb / max(background.a, 0.000001) + bloom.rgb) * exposure);
if (sRGBOutput) {
float edge = smoothstep(0.2, 0.72, distance(uv, vec2(0.5)));
foregroundColor *= 1.0 - vignette * edge;
backgroundColor *= 1.0 - vignette * edge;
foregroundColor = od(cp(foregroundColor));
backgroundColor = od(cp(backgroundColor));
}

float opacity = gf;
gf *= coverage;
float mR = clamp(dot(bloom.rgb, vec3(0.2125, 0.7154, 0.0721)), 0.0, 1.0);
float hJ = max(foreground.a, mR * (1.0 - coverage));
float jz = max(background.a, mR * coverage);
float alpha = hJ + jz * (1.0 - opacity) + gf;
vec3 premultiplied = foregroundColor * hJ
+ backgroundColor * jz * (1.0 - opacity)
+ shadowCatcherColor * gf;
color = vec4(premultiplied / max(alpha, 0.000001), alpha);
}
}
out_color = color;
}`}),id=new we({name:"output",uniforms:{colorTex:C.uniform("sampler2D"),colorDenoisedTex:C.uniform("sampler2D"),denoisedPercent:C.uniform("float",0)},main:K`
void main() {
vec2 uv = v_Texcoord;
vec4 color = mix(
sample_colorTex(uv),
sample_colorDenoisedTex(uv),
denoisedPercent
);
color = vec4(color.rgb * color.a, color.a);
out_color = color;
}`});var vA=5,pr={color:{type:j.HALF_FLOAT,minFilter:j.LINEAR,magFilter:j.LINEAR}},mr=class{_brightPass;_downsamplePasses=[];_blurHPasses=[];_blurVPasses=[];_blendPasses=[];constructor(e){this._brightPass=new Te("bloomBright",e,{shader:ed,outputs:["color"],outputParams:pr});for(let t=0;t<=vA;t++){let A=new Te(`bloomDownsample${t}`,e,{shader:Zu,outputs:["color"],outputParams:pr}),a=new Te(`bloomBlurH${t}`,e,{shader:vl,outputs:["color"],outputParams:pr}),r=new Te(`bloomBlurV${t}`,e,{shader:vl,outputs:["color"],outputParams:pr});a.setUniform("blurDir",0),r.setUniform("blurDir",1),this._downsamplePasses.push(A),this._blurHPasses.push(a),this._blurVPasses.push(r),t>0&&this._blendPasses.push(new Te(`bloomBlend${t}`,e,{shader:Xu,outputs:["color"],outputParams:pr}))}}reserveCapacity(){[this._brightPass,...this._downsamplePasses,...this._blurHPasses,...this._blurVPasses,...this._blendPasses].forEach(e=>e.reserveCapacity())}setSize(e,t){this._brightPass.setSize(e,t);for(let A=0;A<=vA;A++)this._downsamplePasses[A].setSize(e>>A+1,t>>A+1),this._blurHPasses[A].setSize(e>>A+1,t>>A+1),this._blurVPasses[A].setSize(e>>A,t>>A),A>0&&this._blendPasses[A-1].setSize(e>>A-1,t>>A-1)}setBrightThreshold(e){this._brightPass.setUniform("threshold",e)}setRadius(e){let t=1-Math.max(Math.min(e**.3*.8,.8),0);this._blendPasses.forEach(a=>{a.setUniform("weight1",1-t),a.setUniform("weight2",t)});let A=Math.max(Math.min(e*2,1),.2);[...this._blurHPasses,...this._blurVPasses].forEach(a=>a.setUniform("blurSize",A))}createPass(e){this._brightPass.createPass({colorTex:e});for(let t=0;t<=vA;t++)this._downsamplePasses[t].createPass({colorTex:t===0?this._brightPass.getOutput("color"):this._downsamplePasses[t-1].getOutput("color")});for(let t=vA;t>=0;t--)this._blurHPasses[t].createPass({colorTex:this._downsamplePasses[t].getOutput("color")}),this._blurVPasses[t].createPass({colorTex:this._blurHPasses[t].getOutput("color")});for(let t=vA-1;t>=0;t--)this._blendPasses[t].createPass({colorTex1:t===vA-1?this._blurVPasses[vA].getOutput("color"):this._blendPasses[t+1].getOutput("color"),colorTex2:this._blurVPasses[t].getOutput("color")})}getOutput(){return this._blendPasses[0].getOutput("color")}getMemoryBytes(){return[this._brightPass,...this._downsamplePasses,...this._blurHPasses,...this._blurVPasses,...this._blendPasses].reduce((e,t)=>e+t.getMemoryBytes(),0)}dispose(){[this._brightPass,...this._downsamplePasses,...this._blurHPasses,...this._blurVPasses,...this._blendPasses].forEach(e=>e.dispose())}};var vh=new we({name:"jnlmGuide",outputs:["guide"],uniforms:{momentsTex:C.uniform("sampler2D"),catcherMomentsTex:C.uniform("sampler2D")},main:K`
void main() {
ivec2 p = ivec2(gl_FragCoord.xy);
vec4 moments = load_momentsTex(p, 0) + load_catcherMomentsTex(p, 0);
float n = moments.z;
float mean = moments.x / max(n, 1.0);

float variance = n >= 2.0
? max(moments.y - n * mean * mean, 0.0) / (n * (n - 1.0))
: -1.0;
out_guide = vec4(mean, variance, 0.0, 1.0);
}`}),Bh=new we({name:"jnlmVariance",outputs:["guide"],uniforms:{rawGuideTex:C.uniform("sampler2D")},main:K`
void main() {
ivec2 p = ivec2(gl_FragCoord.xy);
ivec2 size = rawGuideTexRegion();
vec2 center = load_rawGuideTex(p, 0).xy;
float mf = 0.0;
float jx = 0.0;
float nW = 0.0;
float jp = 0.0;
for (int dy = -1; dy <= 1; dy++) {
for (int dx = -1; dx <= 1; dx++) {
vec2 value = load_rawGuideTex(clamp(p + ivec2(dx, dy), ivec2(0), size - 1), 0).xy;
nW += value.x;
jp += value.x * value.x;
if (value.y >= 0.0) {
mf += value.y;
jx += 1.0;
}
}
}
float variance;
if (center.y >= 0.0) {
variance = mf / jx;
} else {
float me = nW / 9.0;
variance = max(jp / 9.0 - me * me, 0.0) * 9.0 / 8.0;
}
out_guide = vec4(center.x, variance, 0.0, 1.0);
}`}),Eh=new we({name:"jnlmFilter",outputs:["color","guide"],defines:{SEARCH_RADIUS:Wi.searchRadius,PATCH_RADIUS:Wi.patchRadius,INV_ALBEDO_BANDWIDTH2:(1/Wi.albedoBandwidth**2).toFixed(6),INV_NORMAL_BANDWIDTH2:(1/Wi.normalBandwidth**2).toFixed(6)},uniforms:{guideTex:C.uniform("sampler2D"),colorTex:C.uniform("sampler2D"),albedoTex:C.uniform("sampler2D"),normalTex:C.uniform("sampler2D"),shadowCatcherTex:C.uniform("sampler2D"),colorSensitivity:C.uniform("float",.6),dilation:C.uniform("int",1),decodeInput:C.uniform("bool",0),encodeOutput:C.uniform("bool",0)},main:K`
#define PATCH_SIZE ((2 * PATCH_RADIUS + 1) * (2 * PATCH_RADIUS + 1))

#define VARIANCE_CANCELLATION 1.0


#define CENTER_WEIGHT_MIN 0.01
#define INV_COVERAGE_BANDWIDTH2 ${(1/.1**2).toFixed(6)}

ivec2 imageSize;

vec2 loadGuide(ivec2 p) {
return load_guideTex(clamp(p, ivec2(0), imageSize - 1), 0).xy;
}


vec4 sL(ivec2 p) {
vec4 c = load_colorTex(p, 0);
if (decodeInput) c.rgb = mix(pow((max(c.rgb, 0.0) + 0.055) / 1.055, vec3(2.4)),
c.rgb / 12.92, lessThanEqual(c.rgb, vec3(0.04045)));
return vec4(c.rgb * c.a, c.a);
}

float mi(ivec2 q, vec4 bC, vec3 hg) {
vec4 albedo = load_albedoTex(q, 0);


vec3 qd = max((albedo.rgb + bC.rgb) * 0.5, vec3(${.02}));
vec3 lN = (albedo.rgb - bC.rgb) / qd;
float jk = albedo.a - bC.a;
vec3 lX = load_normalTex(q, 0).rgb - hg;
return max(
dot(lN, lN) * INV_ALBEDO_BANDWIDTH2
+ jk * jk * INV_COVERAGE_BANDWIDTH2,
dot(lX, lX) * INV_NORMAL_BANDWIDTH2
);
}

void main() {
imageSize = guideTexRegion();
ivec2 p = ivec2(gl_FragCoord.xy);
vec4 bC = load_albedoTex(p, 0);
vec4 fR = load_normalTex(p, 0);
vec3 hg = fR.rgb;


if (fR.a <= 0.0 && load_shadowCatcherTex(p, 0).r <= 0.0) {
vec4 c = sL(p);
vec3 rgb = c.rgb / max(c.a, 1e-6);
if (encodeOutput) rgb = mix(1.055 * pow(max(rgb, 0.0), vec3(1.0 / 2.4)) - 0.055,
rgb * 12.92, lessThanEqual(rgb, vec3(0.0031308)));
out_color = vec4(rgb, c.a);
out_guide = vec4(loadGuide(p), 0.0, 1.0);
return;
}

vec2 lP[PATCH_SIZE];
int k = 0;
for (int dy = -PATCH_RADIUS; dy <= PATCH_RADIUS; dy++) {
for (int dx = -PATCH_RADIUS; dx <= PATCH_RADIUS; dx++) {
lP[k] = loadGuide(p + ivec2(dx, dy) * dilation);
k++;
}
}
float k2 = colorSensitivity * colorSensitivity;

vec4 sum = vec4(0.0);
vec3 hk = max(bC.rgb, vec3(${.02}));
vec3 ng = vec3(0.0);
vec3 gN = vec3(0.0);
vec3 hG = vec3(0.0);
float qp = 0.0;
float gP = 0.0;
float oP = 0.0;
float lt = 0.0;
for (int sy = -SEARCH_RADIUS; sy <= SEARCH_RADIUS; sy++) {
for (int sx = -SEARCH_RADIUS; sx <= SEARCH_RADIUS; sx++) {
ivec2 q = p + ivec2(sx, sy) * dilation;
if (
(sx == 0 && sy == 0) ||
q.x < 0 || q.y < 0 || q.x >= imageSize.x || q.y >= imageSize.y
) continue;
float features = mi(q, bC, hg);
if (features > 16.0) continue;

float gk = 0.0;
k = 0;
for (int dy = -PATCH_RADIUS; dy <= PATCH_RADIUS; dy++) {
for (int dx = -PATCH_RADIUS; dx <= PATCH_RADIUS; dx++) {
vec2 a = lP[k];
vec2 b = loadGuide(q + ivec2(dx, dy) * dilation);
float rZ = a.x - b.x;
gk += (rZ * rZ
- VARIANCE_CANCELLATION * (a.y + min(a.y, b.y)))
/ (1e-10 + k2 * (a.y + b.y));
k++;
}
}
gk /= float(PATCH_SIZE);

float weight = exp(-max(max(gk, 0.0), features));
vec2 g = loadGuide(q);

vec3 a = (load_albedoTex(q, 0).rgb - bC.rgb) / hk;
vec4 value = sL(q);
sum += value * weight;
ng += a * weight;
gN += a * a * weight;
hG += a * value.rgb * weight;
qp += g.x * weight;
gP += g.y * weight * weight;
oP += weight;
lt = max(lt, weight);
}
}



vec4 center = sL(p);
vec2 lO = loadGuide(p);
float dR = max(lt, CENTER_WEIGHT_MIN);
float totalWeight = oP + dR;
vec4 mean = (sum + center * dR) / totalWeight;


vec3 eI = ng / totalWeight;
vec3 mj = max(gN / totalWeight - eI * eI, vec3(0.0));
vec3 rv = hG / totalWeight - eI * mean.rgb;



vec3 rI = bC.rgb + eI * hk;
vec3 po = mean.rgb * hk / max(rI, vec3(${.02}));
vec3 xg = clamp(rv / (mj + vec3(${1e-4})), vec3(0.0), po);
vec3 sD = mean.rgb - xg * eI;
vec4 filtered = vec4(max(sD, vec3(0.0)), max(mean.a, 0.0));
vec3 rgb = filtered.a > 1e-6
? filtered.rgb / max(filtered.a, 1e-6)
: center.rgb / max(center.a, 1e-6);
if (encodeOutput) rgb = mix(1.055 * pow(max(rgb, 0.0), vec3(1.0 / 2.4)) - 0.055,
rgb * 12.92, lessThanEqual(rgb, vec3(0.0031308)));
out_color = vec4(rgb, filtered.a);
out_guide = vec4(
(qp + lO.x * dR) / totalWeight,
(gP + lO.y * dR * dR)
/ (totalWeight * totalWeight),
0.0,
1.0
);
}`}),Bl={type:j.FLOAT,minFilter:j.NEAREST,magFilter:j.NEAREST},hs=class{_renderer;_guidePass;_variancePass;_filterPasses;constructor(e){this._renderer=e,this._guidePass=new Te("jnlmGuide",e,{shader:vh,outputParams:{guide:Bl}}),this._variancePass=new Te("jnlmVariance",e,{shader:Bh,outputParams:{guide:Bl}}),this._filterPasses=[0,1].map(()=>new Te("jnlmFilter",e,{shader:Eh,outputParams:{color:{type:j.HALF_FLOAT},guide:Bl}}))}render(e,t){let{width:A,height:a,shape:r}=e;[this._guidePass,this._variancePass,...this._filterPasses].forEach(f=>f.setSize(A,a)),this._guidePass.createPass({momentsTex:e.moments,catcherMomentsTex:e.catcherMoments??this._renderer.emptyTexture}),this._variancePass.createPass({rawGuideTex:this._guidePass.getOutput("guide")});let s=.6*Math.max(e.strength,.001),o=Math.min(4,Math.max(1,Math.round(r.iterations))),l=this._variancePass.getOutput("guide"),c=e.color;for(let f=0;f<o;f++){let m=this._filterPasses[f%2];m.setDefines({SEARCH_RADIUS:r.searchRadius,PATCH_RADIUS:String(r.patchRadius),INV_ALBEDO_BANDWIDTH2:(1/r.albedoBandwidth**2).toFixed(6),INV_NORMAL_BANDWIDTH2:(1/r.normalBandwidth**2).toFixed(6)}),m.setUniforms({colorSensitivity:s,dilation:xr(f),decodeInput:f===0,encodeOutput:f===o-1}),t&&(f===0&&t.push("Decode:DisplayLinear","Denoise:DisplayLinear"),f===o-1&&t.push("Encode:DisplayEncoded")),m.createPass({guideTex:l,colorTex:c,albedoTex:e.albedo,normalTex:e.normal,shadowCatcherTex:e.shadowCatcher}),l=m.getOutput("guide"),c=m.getOutput("color")}return c}reserveCapacity(){[this._guidePass,this._variancePass,...this._filterPasses].forEach(e=>e.reserveCapacity())}retainOutput(e){this._filterPasses.forEach(t=>t.retainOutput(e))}releaseOutput(e){this._filterPasses.forEach(t=>t.releaseOutput(e))}getMemoryBytes(){return[this._guidePass,this._variancePass,...this._filterPasses].reduce((e,t)=>e+t.getMemoryBytes(),0)}dispose(){[this._guidePass,this._variancePass,...this._filterPasses].forEach(e=>e.dispose())}};var Ad=[650,510,475];function wh(i,e,t){let A=(I,W,V)=>{},a=!1,r=0,n=!1,s=0,o=new ss(i),l,c,f=0,m=32,d,u=0,p=!0,g=!1,v=!1,h=1,B=1,E=1,x=1,y={},M,b=0,T=!1,O,R=!1,D=21,L=0,se=1,q=.6,re=1,w=0,N=1,H=1,ee=0,te=0,Y=0,ne="final",Le=qr,fe=performance.now(),_e=0,Me=S.create(),Qe=1,de=is(i.gl);de.setDesiredMsPerTile(D);let xe=new ms(i),We,Oe=t.get("composePass",()=>new Te("compose",i,{shader:td,outputs:["color"],outputParams:{color:{type:j.UNSIGNED_BYTE}}}));Oe.setUniforms({exposure:re,shadowCatcherColor:Me,shadowCatcherAlpha:Qe,shadowCatcherEnabled:0,bloomIntensity:0,toneMappingMode:w,contrast:N,saturation:H,temperature:ee,tint:te,vignette:Y,outputMode:0,sRGBOutput:1});let Ze=t.get("outputPass",()=>new Te("output",i,{shader:id,outputs:["color"]}));Ze.setRenderToScreen();let Mt=t.get("image copy",()=>new os(i)),pe=Mt.readFrameBuffer,zt,$e,me,Fe=!1,Ye=!1;function dt(I){let W=f+s,V=I?hA(W,2)-.5:0,Be=I?hA(W,3)-.5:0;e.setJitter(V/h,Be/B)}function Pe(I,W){e.setSampleCount(f+s),e.setSampleSequenceOffset(s),dt(!0),e.hasDispersion()?M?.dispersionWavelengths===1?(e.setWavelength(Ad[0]),e.createPass(I,W)):Ad.forEach((V,Be)=>{e.setWavelength(V),e.createPass(I&&Be===0,W,Be>0)}):(e.setWavelength(0),e.createPass(I,W))}function Re(I=!1,W=!1){W&&(b=f,T=e.hasShadowCatcher());let V=vt(ne);if(V&&f===0){if(!M?.aovs?.includes(V))throw new Error(`AOV ${V} is not enabled`);if(!o.samples)return;O=Mt.copy(o.visualize(V,Le),h,B,O),R=!1;return}if(b===0)return;W&&(xe.setSampleCount(f),xe.createPass(e)),Oe.setSize(h,B),Oe.setUniforms({exposure:re,toneMappingMode:w,contrast:N,saturation:H,temperature:ee,tint:te,vignette:Y,shadowCatcherColor:Me,shadowCatcherAlpha:Qe});let Be=xe.getOutput("color"),ve=L>0,Ue=f<10||f%10>0,ke=t.get("bloom state",()=>({owner:void 0,settings:"",dispose(){}})),zi=`${se}/${q}`,ua=ve&&f>=10&&(!Ue||ke.owner!==y||ke.settings!==zi),Et=L;if(ua?(We||=t.get("bloom",()=>new mr(i)),We.setSize(h,B),ke.owner=y,ke.settings=zi,We.setBrightThreshold(se),We.setRadius(q),c?.push("Bloom:SceneLinear"),We.createPass(Be)):ve&&f<10&&(Et=0),Oe.setUniforms({bloomIntensity:Et,shadowCatcherEnabled:+T,outputMode:ne==="shadow"?1:0}),c?.push("Compose:DisplayEncoded"),Oe.createPass({colorTex:Be,foregroundTex:xe.getOutput("foreground"),catcherBackgroundTex:xe.getOutput("catcherBackground"),shadowCatcherTex:xe.getOutput("shadowCatcher"),bloomTex:ve&&We?We.getOutput():i.emptyTexture}),$e){zt??=t.get("jnlm",()=>new hs(i));let BA=zt.render({width:h,height:B,moments:e.getOutput("moments"),catcherMoments:e.hasShadowCatcher()?e.getOutput("catcherMoments"):void 0,color:Oe.getOutput("color"),albedo:xe.getOutput("albedo"),normal:xe.getOutput("normal"),shadowCatcher:xe.getOutput("shadowCatcher"),strength:$e.strength,shape:$e.shape},c);me=Mt.copy(BA,h,B,me),Fe=!0,$e=void 0}let et=ne==="final"&&Fe&&me||Oe.getOutput("color");if(V){if(!M?.aovs?.includes(V))throw new Error(`AOV ${V} is not enabled`);et=o.visualize(V,Le)}else ne==="normal"||ne==="albedo"?(c?.push("AOV:Raw"),et=xe.getOutput(ne)):ne==="shadowCatcher"&&(c?.push("AOV:Raw"),et=xe.getOutput("shadowCatcher"));O=Mt.copy(et,h,B,O),R=ne==="final"&&Fe&&!!me}function ue(I){let W=performance.now(),V=u,Be=de;ni(()=>{m=Math.max(performance.now()-W-_e,_e>0?16:8),_e=0,V===u&&Be===de&&!p&&(d=I&&i.isAllProgramCompiled()?m:void 0)})}function Vt(I,W){if(e.isInvalid()||g)return!1;if(!i.isAllProgramCompiled())return p=!0,f=0,de.reset(),!0;if(e.setCamera(I),l=I,!e.preparePrograms())return!0;let V=p;if(V&&o.reset(),M?.aovs?.length&&!e.prepareAovs(o,I,h,B,M.aovs))return!0;if(V&&(u++,d=void 0,e.setCamera(I),de.reset(),f=0,p=!1),f>=W)return Re(!0),!1;(!Ye||V)&&(Fe=!1),ue(!V);let Be=f,ve=de.nextTile(d);r>0&&ve.isFirstTile&&ve.isLastTile?ve.samplesPerFrame=r:(!a||!(ve.isFirstTile&&ve.isLastTile))&&(ve.samplesPerFrame=1);try{for(let Ue=0;Ue<ve.samplesPerFrame&&f<W;Ue++)Pe(f===0&&ve.isFirstTile,{x:ve.x,y:ve.y,width:ve.tileWidth,height:ve.tileHeight}),ve.isLastTile&&f++;f!==Be&&M?.aovs?.length&&e.renderAovs(o,I,h,B,Math.max(f,o.samples),M.aovSamples??16,M.aovs,s),f!==Be&&(!n||f>=W)&&Re(f>=W,!0)}catch(Ue){return console.error(Ue),g=!0,!1}return f!==Be&&A(f,Be===0,m),!i.isAllProgramCompiled()}function Ne(){e.useTarget(y);let I=1,W=Math.max(1,Math.round(E*I)),V=Math.max(1,Math.round(x*I));e.setSize(W,V,E/x),!(W===h&&V===B)&&(h=W,B=V,de.setSize(h,B),xe.setSize(h,B),Oe.setSize(h,B),We?.setSize(h,B),f=0,b=0,p=!0)}function Bt(I,W){I=Math.max(1,I),W=Math.max(1,W),!(I===E&&W===x)&&(E=I,x=W,Ze.setSize(E,x),Ne(),f=0,p=!0)}function rt(){document.hidden?fe=performance.now():_e=performance.now()-fe}typeof document<"u"&&document.addEventListener("visibilitychange",rt);function ye(){e.useTarget(y),e.setSize(h,B,E/x),M&&(e.setQuality(M),e.setClamping(M.clamping),e.setTransmissiveOutputAlphaMin(M.transmissiveOutputAlphaMin),e.setBevelSamples(M.bevelSamples),e.setSamplingPattern(M.samplingPattern,M.maxSamples))}return{invalidateDenoisedOutput(){$e=void 0,Fe=!1,Ye=!1},synchronizeBackground(){},configure(I){if(I.aovs?.length&&(!Number.isInteger(I.aovSamples??16)||(I.aovSamples??16)<1))throw new RangeError("aovSamples must be a positive integer");let W=je(M?.aovs??[]),V=je(I.aovs??[]);(W!==V||M?.aovSamples!==I.aovSamples)&&(o.samples=0),M={...I,aovs:[...I.aovs??[]]};let Be=vt(ne);Be&&!I.aovs?.includes(Be)&&(ne="final"),W&&!V&&(o.dispose(),o.history.clear(),o.width=o.height=0,o.reset()),D=Math.max(1,I.timeBudgetMs),a=I.batchSamples,de.setDesiredMsPerTile(D),de.setMaxTiles(I.maxTiles)},activate:ye,canCompleteSampleWithin(I){return m<=I},getOutputTexture(){},applyPostProcesses(){},get presentationComplete(){return!!O},get presentationDenoised(){return R},present(){O&&(Ze.setSize(i.canvas.width,i.canvas.height),Ze.setUniform("denoisedPercent",0),Ze.createPass({colorTex:O,colorDenoisedTex:O}))},getMemory(){return{width:h,height:B,bytes:o.bytes+e.getTargetMemoryBytes(y)+xe.getMemoryBytes()+(O?.getMemoryBytes()??0)+(me?.getMemoryBytes()??0)}},isFirstFrame:()=>p,restartSamples(I=!1){o.reset(),de.reset(),p=!0,f=0,Fe=!1,Ye=!1},performDenoise(I){return I.kind!=="jnlm"?Promise.reject(new Error("This denoiser requires WebGPU.")):p||f<1?Promise.resolve(!1):(ne!=="final"&&ne!=="shadow"||($e=I.denoiser,Re(!0)),Promise.resolve(!0))},cancelDenoise(){$e=void 0},setPreserveDenoisedOutput(I){Ye=I},trace:Vt,drawPostProcess:()=>Re(!0),setSize:Bt,setToneMappingParams(I){let W=I.exposure??1,V={agx:0,aces:1,cineon:2,reinhard:3,linear:4}[I.toneMapping??"agx"]??0,Be=I.contrast??1,ve=I.saturation??1,Ue=I.temperature??0,ke=I.tint??0,zi=I.vignette??0;return W===re&&V===w&&Be===N&&ve===H&&Ue===ee&&ke===te&&zi===Y?!1:(re=W,w=V,N=Be,H=ve,ee=Ue,te=ke,Y=zi,Oe.setUniforms({exposure:re,toneMappingMode:w,contrast:N,saturation:H,temperature:ee,tint:te,vignette:Y}),!0)},setOfflineRenderOptions(I){r=Math.max(0,Math.round(I.samplesPerBatch)),n=I.deferPostProcess,s=Math.max(0,Math.round(I.sampleSequenceOffset))},setVarianceMoments(I){},setAdaptiveSamplingTargets(I){},async prepareOfflineAdaptiveSampling(I){},getTotalSamplesRendered:()=>f,_displayParity(){return{record(I){c=I},load(I){Bt(I.width,I.height),Fe=!1,$e=void 0;let W=Ue=>new ce({width:I.width,height:I.height,source:{data:Ue,width:I.width,height:I.height},type:j.FLOAT,minFilter:j.NEAREST,magFilter:j.NEAREST}),V=Float32Array.from({length:I.width*I.height*4},(Ue,ke)=>ke%4===3?I.moments[Math.floor(ke/4)*4+2]:I.shadow[Math.floor(ke/4)*8+ke%4]),Be=Float32Array.from(V,(Ue,ke)=>I.shadow[Math.floor(ke/4)*8+4+ke%4]),ve={color:W(I.color),albedo:W(I.albedo),normal:W(I.normal),moments:W(Float32Array.from(I.moments,(Ue,ke)=>ke%4===2?I.samples:Ue)),shadowCatcher:W(V),catcherBackground:W(Be),catcherMoments:W(I.moments)};e._loadDiagnosticAccumulation(ve,I.catcher),f=b=I.samples,T=I.catcher,p=!1,xe.setSize(h,B),xe.setSampleCount(f),xe.createPass(e)}}},getDiagnostics:()=>({...e.getDiagnostics(),shaderCompilation:i.getShaderCompilationDiagnostics()}),flushDiagnostics:async()=>{},setShadowCatcherParams(I,W){let V=I[0]!==Me[0]||I[1]!==Me[1]||I[2]!==Me[2]||W!==Qe;return V&&(S.copy(Me,I),Qe=W,Oe.setUniform("shadowCatcherColor",I),Oe.setUniform("shadowCatcherAlpha",W)),V},setBloomParams({intensity:I,threshold:W,radius:V}){let Be=I!==L||W!==se||V!==q;return L=I,se=W,q=V,Be},setOnSampleRendered(I){A=I},setAovDisplayOptions(I){Le={...I,depthRange:[...I.depthRange]}},setOutput(I){return ne===I?!1:(ne=I,!0)},async readPresentation(){if(!O)throw new Error("Render has no complete image.");pe.bind(i,[O]);let I=O.width,W=O.height;return{width:I,height:W,data:sa(i.gl,I,W,O.isByteEncoded)}},aovReady(I){return!!M?.aovs?.includes(I)&&o.samples>0},getAovSamples(){return o.samples},restartAovs(){o.reset()},refineAovs(I,W=f){return W<1||!M?.aovs?.length?!0:(e.setCamera(I),l=I,e.renderAovs(o,I,h,B,W,M.aovSamples??16,M.aovs,s))},async readAov(I){if(!M?.aovs?.includes(I)||!l||f<1&&o.samples<1)throw new Error("AOV output is not ready");for(e.setCamera(l);!e.renderAovs(o,l,h,B,Math.max(f,o.samples),M.aovSamples??16,M.aovs,s);){if(v||i.gl.isContextLost())throw new Error("AOV compilation was interrupted");await new Promise(W=>ni(()=>W()))}return o.read(I)},async readOutput(I){I==="denoised"&&(!me||!Fe)&&(I="hdr");let W=I==="denoised"?me:xe.getOutput(I==="hdr"?"color":I);return pe.bind(i,[W]),{data:sa(i.gl,h,B,I==="albedo"||I==="normal"),width:h,height:B}},dispose(){v||(v=!0,typeof document<"u"&&document.removeEventListener("visibilitychange",rt),o.dispose(),e.releaseTarget(y),xe.dispose(),O?.dispose(i.gl),me?.dispose(i.gl))}}}function ad(i){let e=new Ku(i),t=new $A;return bn(e,()=>wh(i,e,t),!0,t)}var fa=new Map;async function _h(i,e){let t=fa.get(e);if(!t){t=(async()=>{let a=await i.requestAdapter({powerPreference:"high-performance"})??await i.requestAdapter();if(!a)throw new Error("No WebGPU adapter is available");let r=jr(a),n=e==="auto"?so(a.features):void 0,s,o;try{s=await a.requestDevice(n?{...r,requiredFeatures:[...r.requiredFeatures??[],n.feature]}:r)}catch(c){if(!n)throw c;o=c instanceof Error?c.message:String(c);let f=await i.requestAdapter({powerPreference:"high-performance"})??await i.requestAdapter();if(!f)throw new Error("No WebGPU adapter is available for atlas fallback");s=await f.requestDevice(jr(f)),a=f}let l=t;return s.lost.then(()=>{fa.get(e)===l&&fa.delete(e)}),{device:s,adapterInfo:a.info,fallbackReason:o}})(),fa.set(e,t);let A=t;t.catch(()=>{fa.get(e)===A&&fa.delete(e)})}return t}var gs=class{scene;camera;display;bvhBuilder="builtin";bvhLayout="bvh2";bvhSpatialSplits=!1;textureAtlasBudgetBytes=Dt;get bvhWorkerCount(){return this._bvhWorkerCount}set bvhWorkerCount(e){Pa(e),this._bvhWorkerCount=e}_bvhWorkerCount="auto";_bvhWorkerPool;_bvhPreparationRevision=0;_bvhPreparation;_bvhPreparationTail=Promise.resolve();_tinyBvhUnavailable=!1;_bvhWorkerUnavailable=!1;_bvhPreparedGeometry=new WeakMap;_lastBvhBuild;_lastBvhSettings="";_lastBudget=-1;_shaderProgress="";_events=new Ti;_pipeline;_webglRenderer;_gpuDevice;_suppliedDevice;_ownsDeviceSelection;_deviceRevision=0;_lossController;_deviceLossError;_webglListening=!1;_webglLost=!1;_recoverWebGL=!1;_contextRestore;_gpuAdapterInfo;_backendChoice;_textureBinding;_initPromise;_info;_pipelineInitError;_webgpuFallbackReason;_reportedErrors=new WeakSet;_loggedErrorMessages=new Set;_sceneChangeDetector;_snapshot=new $r;_sourceScene;_committedScene;_sourceCamera;_committedCamera;_cameraFields=[];_sceneRevision=0;_cameraRevision=0;_uploadedRevision=-1;_pendingMeshes="full";_pendingTransforms=new Set;_pendingColors=new Set;_pendingGeometries=new Set;_pendingMaterials=new Set;_pendingLights=!0;_pendingBackground=!0;_disposed=!1;_readingDepth=!1;_renders=new Set;_targetCounter=0;_presented;_denoisers=new Set;_denoiserCache=new Map;_denoiserEntries=new WeakMap;_weights=new Map;_customPrepared=new WeakMap;_denoiseTail=Promise.resolve();_lastError;get lastError(){return this._lastError}_setRenderError(e){this._lastError=e??this._pipelineInitError}constructor(e={}){if(e.device&&e.backend==="webgl")throw new Error("A supplied GPUDevice cannot use the webgl backend.");this._suppliedDevice=e.device,this._textureBinding=e.textureBinding??"atlas",this._ownsDeviceSelection=!e.device,this._backendChoice=e.device?"webgpu":e.backend??"auto",this._sceneChangeDetector=new Pr,this.display=VA._create(this,e.canvas??ht())}init(){return this._initPromise??=(async()=>{if(this._disposed)throw new Error("Engine is disposed.");if(this._pipelineInitError&&!this._ownsDeviceSelection)throw this._pipelineInitError;let e=this._deviceRevision;if(this._contextRestore&&await this._contextRestore.promise,this._disposed)throw new Error("Engine is disposed.");if(await this._initPipeline(this._backendChoice!=="webgl"&&!this._recoverWebGL),e!==this._deviceRevision)throw this._deviceLossError;if(this._pipelineInitError)throw this._pipelineInitError;if(this._disposed)throw this._pipeline?.dispose(),new Error("Engine is disposed.");let t=this._webglRenderer?.gl,A=this._gpuDevice?.limits;return this._info={backend:this._gpuDevice?"webgpu":"webgl",adapterName:this._adapterName(),webgpuFallbackReason:this._webgpuFallbackReason,limits:{maxTextureArrayLayers:A?.maxTextureArrayLayers??t?.getParameter(t.MAX_ARRAY_TEXTURE_LAYERS),maxTextureDimension2D:A?.maxTextureDimension2D??t?.getParameter(t.MAX_TEXTURE_SIZE)}},this._upload(),this._info})()}get info(){return this._info}get backend(){return this._info?.backend}get device(){return this._gpuDevice}on(e,t){return this._events.on(e,t)}update(){if(this._disposed)throw new Error("Engine is disposed.");this._lastError=this._pipelineInitError;let e=!1,t=!1,A=this.camera?Zt(this.camera):[];(this.camera!==this._sourceCamera||!mt(A,this._cameraFields))&&(this._sourceCamera=this.camera,this._cameraFields=A,this._committedCamera=this.camera?Ua(this.camera):void 0,this._cameraRevision++,e=!0);let a=Ec(this,"bvh"),r=a!==this._lastBvhSettings||Yr(this)!==this._lastBudget;if((this.scene!==this._sourceScene||r)&&this._sceneChangeDetector.reset(),this.scene){Ya(this.scene.lights,s=>this._notifyError(s)),Yc(this.scene.meshes);let n=this._sceneChangeDetector.detect(this.scene);if(t=n.meshes==="full"||this.scene!==this._sourceScene||r,n.meshes!=="none"||n.lights||n.background||this.scene!==this._sourceScene||r){this._committedScene=this._snapshot.capture(this.scene,n),n.meshes==="full"||r||this.scene!==this._sourceScene?this._pendingMeshes="full":n.meshes==="incremental"&&this._pendingMeshes!=="full"&&(this._pendingMeshes="incremental");for(let s of n.transforms)this._pendingTransforms.add(this._snapshot.mirror(s));for(let s of n.colors)this._pendingColors.add(this._snapshot.mirror(s));for(let s of n.geometries)this._pendingGeometries.add(this._snapshot.mirror(s));for(let s of n.materials)this._pendingMaterials.add(this._snapshot.mirror(s));this._pendingLights||=n.lights,this._pendingBackground||=n.background,this._sceneRevision++,e=!0}this._sceneChangeDetector.commit()}else this._sourceScene&&(this._committedScene=void 0,this._pendingMeshes="full",this._pendingLights=!0,this._pendingBackground=!0,this._sceneRevision++,e=!0);if(this._sourceScene=this.scene,this._lastBvhSettings=a,this._lastBudget=Yr(this),this._pipeline||this.init().catch(()=>{}),e)for(let n of this._renders)n._inputsChanged(t);return this._upload(),e}_upload(){let e=this._pipeline;if(!e||this._disposed||this._bvhPreparation||this._uploadedRevision===this._sceneRevision)return;let t=this._committedScene??{meshes:[],lights:[]};if(this._needsBVHPreparation(t.meshes)){let a=this.prepare(t);this._bvhPreparation=a,a.then(()=>{this._bvhPreparation===a&&(this._bvhPreparation=void 0),this._upload()},r=>{this._bvhPreparation===a&&(this._bvhPreparation=void 0),this._notifyError(r)});return}let A=e.setTextureAtlasBudget(this._lastBudget>=0?this._lastBudget:Yr(this));(this._pendingMeshes!=="none"||A)&&e.setMeshes(t.meshes,this._pendingMeshes==="full"||A?void 0:{transforms:[...this._pendingTransforms],colors:[...this._pendingColors],geometries:[...this._pendingGeometries],materials:[...this._pendingMaterials]}),this._pendingLights&&e.setLights(t.lights),this._pendingBackground&&e.setBackground(t.background),this._pendingMeshes="none",this._pendingLights=!1,this._pendingBackground=!1,this._pendingTransforms.clear(),this._pendingColors.clear(),this._pendingGeometries.clear(),this._pendingMaterials.clear(),this._uploadedRevision=this._sceneRevision}_bvhConfig(){return Bc(this)}prepare(e,t={}){let A=this._bvhPreparationRevision,a=this._bvhPreparationTail.then(async()=>{let n=()=>A!==this._bvhPreparationRevision||t.signal?.aborted===!0;if(n())return;let s=e.meshes,o=ro()&&!this._bvhWorkerUnavailable;if(o){let f=wc(this);this._bvhWorkerPool?.size!==f&&(this._bvhWorkerPool?.dispose(),this._bvhWorkerPool=new eA(f))}let l=this._bvhConfig(),c=await qc(s,{config:l,...l,builder:this.bvhBuilder==="tinybvh"&&!this._tinyBvhUnavailable?"tinybvh":"builtin",useWorker:o,workerPool:this._bvhWorkerPool,isCancelled:n,rebuild:!1,onProgress:f=>{this._bvhPreparation===a&&this._events.emit("progress",{stage:"bvh",progress:f}),t.onProgress?.(f)}});n()||(c.workerUnavailable&&!this._bvhWorkerUnavailable&&(this._bvhWorkerUnavailable=!0,this._bvhWorkerPool?.dispose(),this._bvhWorkerPool=void 0,console.warn("BVH preparation failed; falling back to the calling-thread BVH builder.")),c.tinyBvhUnavailable&&!this._tinyBvhUnavailable&&(this._tinyBvhUnavailable=!0,console.warn("BVH preparation failed; falling back to the built-in BVH builder.")),c.failedMeshes.forEach(f=>{this._bvhPreparedGeometry.set(f,[f.geometry,f.geometry.version])}),this._lastBvhBuild={geometryCount:c.geometryCount,bvhTimeMs:c.bvhTimeMs})});this._bvhPreparationTail=a.catch(()=>{});let r=t.signal;return r?new Promise((n,s)=>{let o=()=>s(r.reason??new DOMException("BVH preparation aborted","AbortError"));if(r.aborted){o();return}r.addEventListener("abort",o,{once:!0}),a.then(n,s).finally(()=>r.removeEventListener("abort",o))}):a}_needsBVHPreparation(e){return this._bvhPreparation?!0:(this.bvhBuilder!=="tinybvh"||this._tinyBvhUnavailable)&&(!ro()||this._bvhWorkerUnavailable)?e.some(t=>!!ge(AA(t))&&Za(t,this._bvhConfig())):e.some(t=>{let A=this._bvhPreparedGeometry.get(t);return!(A?.[0]===t.geometry&&A[1]===t.geometry.version)&&Za(t,this._bvhConfig())})}async _initPipeline(e){let t=!1;try{if(this._events.emit("progress",{stage:"device",progress:0}),this._pipelineInitError=void 0,e&&(this._suppliedDevice||typeof navigator<"u"&&navigator.gpu))try{let A=typeof navigator<"u"?navigator.gpu:void 0,a=this._suppliedDevice?void 0:await _h(A,this._textureBinding),r=this._suppliedDevice??a.device,n=this._suppliedDevice?r.adapterInfo:a?.adapterInfo,s={requested:this._textureBinding};if(this._textureBinding==="auto"){let o=so(r.features);s.fallbackReason=a?.fallbackReason??(o?await xc(r,o):"Resource-table feature is not enabled on this device."),s.fallbackReason||(s.support=o)}if(this._disposed)return;no(r),this._gpuAdapterInfo=n??void 0,this._gpuDevice=r,this._pipeline=Fu(this.display.canvas,r,{presentationFormat:A?.getPreferredCanvasFormat()??"bgra8unorm",materialTextures:s}),this._watchDevice(r),t=!0}catch(A){if(this._backendChoice==="webgpu")throw A;this._webgpuFallbackReason=A instanceof Error?A.message:String(A),this._gpuDevice=void 0,this._gpuAdapterInfo=void 0}if(!t){if(this._backendChoice==="webgpu")throw new Error("WebGPU is not available in this environment");e&&!this._webgpuFallbackReason&&(this._webgpuFallbackReason="WebGPU is not available in this environment"),this._webglRenderer=new Gr({canvas:this.display.canvas,alpha:!0,depth:!0,stencil:!1,antialias:!1,pixelRatio:1,preserveDrawingBuffer:!0,premultipliedAlpha:!1,parallelShaderCompile:!0,powerPreference:"high-performance"}),this._pipeline=ad(this._webglRenderer),this._webglListening||(this._webglListening=!0,this.display.canvas.addEventListener("webglcontextlost",this._onContextLost),this.display.canvas.addEventListener("webglcontextrestored",this._onContextRestored)),this._recoverWebGL=!1}}catch(A){this._pipelineInitError=A instanceof Error?A:new Error(String(A)),this._lastError=this._pipelineInitError,this._notifyError(this._pipelineInitError)}finally{this._events.emit("progress",{stage:"device",progress:1})}}_onContextLost=e=>{if(e.preventDefault(),this._disposed||this._webglLost)return;this._webglLost=!0,this._recoverWebGL=!0;let t,A,a=new Promise((n,s)=>{t=n,A=s});a.catch(()=>{}),this._contextRestore={promise:a,resolve:t,reject:A};let r=new Error(`WebGL context lost: ${e.statusMessage||"context is unavailable"}`);this._invalidateDevice(r,!0),this._events.emit("devicelost",{reason:"webglcontextlost",recovering:!0})};_onContextRestored=()=>{if(this._disposed||!this._webglLost)return;this._webglLost=!1;let e=this._contextRestore;this._contextRestore=void 0,e?.resolve()};_watchDevice(e){e.lost.then(t=>{if(this._disposed||this._gpuDevice!==e)return;let A=this._ownsDeviceSelection,a=new Error(`WebGPU device lost (${t.reason}): ${t.message||"device is unavailable"}`);this._invalidateDevice(a,A),this._events.emit("devicelost",{reason:t.reason,recovering:A}),A||this._notifyError(a)})}_invalidateDevice(e,t){this._deviceLossError=e,this._deviceRevision++,this._lossController?.abort(e),this._lossController=void 0;for(let A of this._renders)A._deviceLost(t);this._pipeline?.dispose(),this._pipeline=void 0,this._webglRenderer?.dispose(),this._webglRenderer=void 0,this._gpuDevice=void 0,this._gpuAdapterInfo=void 0,this._info=void 0,this._initPromise=void 0,this._pipelineInitError=t?void 0:e,this._lastError=e,this._presented=void 0,this._shaderProgress="",this._uploadedRevision=-1,this._pendingMeshes="full",this._pendingLights=!0,this._pendingBackground=!0,this._sceneRevision++,this._customPrepared=new WeakMap;for(let A of[...this._denoisers]){let a=this._denoiserEntries.get(A);a&&(a.references=1),this._releaseDenoiser(A)}this._denoiserCache.clear()}async setDevice(e){if(this._disposed)throw new Error("Engine is disposed.");if(this._ownsDeviceSelection)throw new Error("setDevice requires an engine constructed with device.");try{no(e)}catch(t){throw this._lastError=this._notifyError(t),t}this._gpuDevice===e&&!this._pipelineInitError||(this._invalidateDevice(new Error("WebGPU device replaced during converge."),!0),this._suppliedDevice=e)}_awaitDevice(e){let t=(this._lossController??=new AbortController).signal;return new Promise((A,a)=>{let r=()=>a(t.reason);t.addEventListener("abort",r,{once:!0}),e.then(A,a).finally(()=>t.removeEventListener("abort",r))})}get _deviceGeneration(){return this._deviceRevision}get _lostError(){return this._deviceLossError}_adapterName(){if(this._gpuAdapterInfo)return this._gpuAdapterInfo.description||this._gpuAdapterInfo.vendor||"WebGPU";let e=this._webglRenderer?.gl,t=e?.getExtension("WEBGL_debug_renderer_info");return t&&e?e.getParameter(t.UNMASKED_RENDERER_WEBGL):this._webglRenderer?"WebGL 2":this._gpuDevice?"WebGPU":""}_reportShaderProgress(){let e=this._pipeline?.getDiagnostics().shaderCompilation;if(!e)return;let t=`${e.status}/${e.completedPipelineCount}/${e.pipelineCount}`;t!==this._shaderProgress&&(this._shaderProgress=t,this._events.emit("progress",{stage:"shaders",progress:e.pipelineCount?e.completedPipelineCount/e.pipelineCount:1}))}getDiagnostics(){if(!this._pipeline&&!this._lastBvhBuild)return;let e=this._pipeline?.getDiagnostics(),t=e?.materialTextures??(this._pipeline?{requested:this._textureBinding,active:"atlas",fallbackReason:this._textureBinding==="auto"?"Bindless textures require a supported WebGPU device.":void 0,textureCount:e?.textureAtlas?.textureCount??0,estimatedBytes:e?.textureAtlas?.estimatedBytes??0,scale:e?.textureAtlas?.scale??1,metadataBytes:0,resourceTableCapacity:0,retiredBytes:0}:void 0);return{...e,materialTextures:t,bvh:{...e?.bvh,lastBuild:this._lastBvhBuild},backend:this.backend,adapterName:this._adapterName(),width:this.display.canvas.width,height:this.display.canvas.height,lastError:this.lastError?.message,webgpuFallbackReason:this._webgpuFallbackReason,presentedTarget:this._presented?.label,presentedComplete:this._presented?.presentationComplete??!1}}async readDepthSamples(e){if(qA(e,1),!(!this._ready||!this._committedCamera||this._readingDepth)){this._readingDepth=!0;try{let t=Ua(this._committedCamera);t.aspect??=this.display.canvas.width/this.display.canvas.height;let A=await this._pipeline.readDepthSamples(t,e);return this._disposed?void 0:A}finally{this._readingDepth=!1}}}dispose(){if(!this._disposed){this._disposed=!0,this._bvhPreparationRevision++,this._lossController?.abort(new Error("Engine is disposed.")),this._lossController=void 0,this._contextRestore?.reject(new Error("Engine is disposed.")),this._contextRestore=void 0,this._webglListening&&(this.display.canvas.removeEventListener("webglcontextlost",this._onContextLost),this.display.canvas.removeEventListener("webglcontextrestored",this._onContextRestored));for(let e of[...this._renders])e.dispose();this._pipeline?.dispose(),this._pipeline=void 0,this._webglRenderer?.dispose(),this._bvhWorkerPool?.dispose();for(let e of[...this._denoisers]){let t=this._denoiserEntries.get(e);t&&(t.references=1),this._releaseDenoiser(e)}this._denoiserCache.clear(),this._weights.clear(),this._events.clear()}}get _initializationError(){return this._pipelineInitError}get _ready(){return!!this._pipeline&&this._uploadedRevision===this._sceneRevision&&!!this._committedScene&&!!this._committedCamera&&!this._disposed}get _inputs(){return{scene:this._sceneRevision,camera:this._cameraRevision,value:this._committedCamera}}_register(e){if(this._disposed)throw new Error("Engine is disposed.");this._renders.add(e)}_unregister(e){this._renders.delete(e)}_createTarget(){return this._pipeline?.createTarget(`render-${++this._targetCounter}`)}_releaseTarget(e){this._presented===e&&(this._presented=void 0),this._pipeline?.releaseTarget(e)}_present(e){e.activate(),e.present(),this._presented=e}_notifyError(e){let t=e instanceof Error?e:new Error(String(e));return this._loggedErrorMessages.has(t.message)||(this._loggedErrorMessages.add(t.message),console.error(`Path tracing failed: ${t.message}`,t)),this._reportedErrors.has(t)||(this._reportedErrors.add(t),this._events.emit("error",t)),t}_getWeights(e,t){let A=this._weights.get(e);return A||(A=t(),this._weights.set(e,A),A.catch(()=>{this._weights.get(e)===A&&this._weights.delete(e)})),A}_retainDenoiser(e,t){let A=this._denoiserCache.get(e);if(!A?.value){let a=this._ownDenoiser(t()),r={key:e,references:0,value:a};this._denoiserCache.set(e,r),this._denoiserEntries.set(a,r),A=r}return A.references++,A.value}async _acquireDenoiser(e,t){let A=this._denoiserCache.get(e);if(!A){let a={key:e,references:0},r=this._deviceRevision;a.pending=t().then(n=>{if(r!==this._deviceRevision)throw this._disposeDenoiser(n),this._deviceLossError;return a.value=this._ownDenoiser(n),this._denoiserEntries.set(n,a),n}),this._denoiserCache.set(e,a),A=a}A.references++;try{return A.value??await A.pending}catch(a){throw A.references--,this._denoiserCache.get(e)===A&&this._denoiserCache.delete(e),a}}_ownDenoiser(e){if(this._disposed)throw this._disposeDenoiser(e),new Error("Engine is disposed.");return this._denoisers.add(e),e}_releaseDenoiser(e){let t=this._denoiserEntries.get(e);t&&--t.references>0||(t&&this._denoiserCache.get(t.key)===t&&this._denoiserCache.delete(t.key),this._denoiserEntries.delete(e),this._denoisers.delete(e)&&this._disposeDenoiser(e))}_disposeDenoiser(e){e.kind==="oidn"&&(e.denoiser.auxiliaryDenoisers?.albedo.dispose(),e.denoiser.auxiliaryDenoisers?.normal.dispose()),e.denoiser.dispose()}async _prepareCustomDenoiser(e,t,A){let a=this.device;if(!a)throw new Error("Custom denoising requires WebGPU.");let r=this._customPrepared.get(e);r?.device===a&&r.width===t&&r.height===A||(await e.prepare?.({device:a,width:t,height:A}),this._customPrepared.set(e,{device:a,width:t,height:A}))}_enqueueDenoise(e){let t=this._denoiseTail.then(async()=>{let A=this._gpuDevice,a=this._deviceRevision;try{return await e()}finally{A&&A===this._gpuDevice&&a===this._deviceRevision&&!this._disposed&&await this._awaitDevice(A.queue.onSubmittedWorkDone()).catch(()=>{})}});return this._denoiseTail=t.catch(()=>{}),t}};var ut=["webgpu","webgl"],El={aovs:{key:"aovs",default:[],kind:"execution",backends:ut},aovSamples:{key:"aovSamples",default:16,kind:"execution",backends:ut},bounces:{key:"bounces",default:3,kind:"image",backends:ut},clamping:{key:"clamping",default:0,kind:"image",backends:ut},bevel:{key:"bevel",default:!0,kind:"image",backends:ut},bevelSamples:{key:"bevelSamples",default:8,kind:"image",backends:ut,normalize:nA},dispersionWavelengths:{key:"dispersionWavelengths",default:3,kind:"image",backends:ut},directLightCandidates:{key:"directLightCandidates",default:4,kind:"image",backends:["webgpu"],normalize:rA},alphaBlendStrategy:{key:"alphaBlendStrategy",default:"stochastic",kind:"image",backends:["webgpu"]},transmissiveOutputAlphaMin:{key:"transmissiveOutputAlphaMin",default:1,kind:"image",backends:ut},samplingPattern:{key:"samplingPattern",default:"sobol",kind:"image",backends:ut},maxSamples:{key:"maxSamples",default:2048,kind:"sample-cap",backends:ut},timeBudgetMs:{key:"timeBudgetMs",default:21,kind:"execution",backends:ut},maxTiles:{key:"maxTiles",default:1/0,kind:"execution",backends:ut},batchSamples:{key:"batchSamples",default:!1,kind:"execution",backends:ut}},ZM=[...Object.values(El),{key:"resolutionScale",default:1,kind:"resolution",backends:ut},{key:"adaptiveResolution",default:!1,kind:"resolution",backends:ut},{key:"fallback",default:null,kind:"fallback",backends:ut},{key:"denoiser",default:null,kind:"denoiser",backends:ut}];function rd(i,e){return Object.fromEntries(Object.values(El).map(t=>[t.key,t.key==="maxSamples"?e:"normalize"in t?t.normalize(i[t.key]):i[t.key]]))}function nd(i,e){let t=Object.values(El).filter(A=>A.kind==="image");return JSON.stringify({...Object.fromEntries(t.map(A=>[A.key,i[A.key]])),samples:i.samplingPattern==="zsobol"?i.maxSamples:void 0,...e})}var xh,bh=()=>xh??=import("./chunk-ZQYB5HPK.js");function sd(i){if(!i||typeof i!="object"||i.type!=="jnlm"&&i.type!=="oidn"&&i.type!=="custom")throw new Error("Denoiser type must be jnlm, oidn or custom.");let e=i.type==="jnlm"?["type","schedule",...Object.keys(ga)]:i.type==="custom"?["type","schedule","denoiser","aovs"]:["type","schedule","model","weightsBaseUrl","weightsUrl","aux","hdr","hdrTransfer","auxiliaryModelUrls","engine","precision","dynamicTile","maxTileSize","signal"];for(let t of Object.keys(i))if(!e.includes(t))throw new Error(`Denoiser field ${t} does not belong to ${i.type}.`);if(i.schedule!==void 0&&!["converged","progressive","every-sample"].includes(i.schedule))throw new Error("Unknown denoise schedule.");if(i.type==="jnlm")ys(i);else if(i.type==="custom"){if(je(i.aovs??[]),!i.denoiser||typeof i.denoiser!="object"||typeof i.denoiser.denoise!="function"||i.denoiser.prepare!==void 0&&typeof i.denoiser.prepare!="function")throw new Error("Custom denoiser must implement denoise and optional prepare.")}else{if(i.weightsUrl!==void 0){if(i.model!==void 0||i.weightsBaseUrl!==void 0)throw new Error("weightsUrl is mutually exclusive with model and weightsBaseUrl.")}else if(i.aux!==void 0||i.hdr!==void 0||i.hdrTransfer!==void 0)throw new Error("aux, hdr and hdrTransfer require weightsUrl.");for(let t of["weightsUrl","weightsBaseUrl"])if(i[t]!==void 0&&!wl(i[t]))throw new Error(`${t} must be a nonempty string or URL.`);if(i.auxiliaryModelUrls!==void 0){let t=i.auxiliaryModelUrls;if(!t||!wl(t.albedo)||!wl(t.normal)||Object.keys(t).some(A=>!["albedo","normal"].includes(A)))throw new Error("auxiliaryModelUrls requires only albedo and normal URLs.")}for(let[t,A]of[["engine",["auto","wgsl","webnn"]],["precision",["auto","fp32","fp16"]],["hdrTransfer",["pu","log"]]])if(i[t]!==void 0&&!A.includes(i[t]))throw new Error(`Unknown OIDN ${t}.`);for(let t of["aux","hdr"])if(i[t]!==void 0&&typeof i[t]!="boolean")throw new Error(`${t} must be boolean.`);if(i.dynamicTile!==void 0&&typeof i.dynamicTile!="boolean"){if(!i.dynamicTile||typeof i.dynamicTile!="object")throw new Error("dynamicTile must be boolean or tile settings.");for(let[t,A]of Object.entries(i.dynamicTile))if(!["minTileSize","initialTileSize","targetTileTimeMs","adjustmentStep"].includes(t)||A!==void 0&&(typeof A!="number"||!Number.isFinite(A)||A<=0))throw new Error(`Invalid dynamicTile ${t}.`)}if(i.model!==void 0&&!["standard","small","cleanAuxLarge"].includes(i.model))throw new Error("Unknown OIDN model.");if(i.maxTileSize!==void 0&&(!Number.isInteger(i.maxTileSize)||i.maxTileSize<1))throw new Error("maxTileSize must be a positive integer.")}}function wl(i){return typeof i=="string"&&i.length>0||i instanceof URL}function yh(i){if(i.type==="custom")return Object.freeze({...i,aovs:Object.freeze([...i.aovs??[]])});if(i.type!=="oidn")return Object.freeze({...i});let e={...i};return i.weightsBaseUrl!==void 0&&(e.weightsBaseUrl=String(i.weightsBaseUrl)),i.weightsUrl!==void 0&&(e.weightsUrl=String(i.weightsUrl)),i.auxiliaryModelUrls!==void 0&&(e.auxiliaryModelUrls=Object.freeze({albedo:String(i.auxiliaryModelUrls.albedo),normal:String(i.auxiliaryModelUrls.normal)})),typeof i.dynamicTile=="object"&&(e.dynamicTile=Object.freeze({...i.dynamicTile})),Object.freeze(e)}function _l(i){if(i.type==="custom")return i.denoiser;if(i.type==="jnlm")return JSON.stringify({type:"jnlm",...Object.fromEntries(Object.entries(ga).map(([t,A])=>[t,i[t]??A]))});let e=i.dynamicTile;return JSON.stringify({type:"oidn",...i.weightsUrl===void 0?{model:i.model??"standard",weightsBaseUrl:i.weightsBaseUrl?.toString()}:{weightsUrl:String(i.weightsUrl),aux:i.aux??!0,hdr:i.hdr??!0,hdrTransfer:i.hdrTransfer??"pu"},auxiliaryModelUrls:i.auxiliaryModelUrls&&{albedo:String(i.auxiliaryModelUrls.albedo),normal:String(i.auxiliaryModelUrls.normal)},maxTileSize:i.maxTileSize,engine:i.engine??"auto",precision:i.precision??"auto",dynamicTile:e===!1?!1:{minTileSize:typeof e=="object"?e.minTileSize??256:256,initialTileSize:typeof e=="object"?e.initialTileSize??432:432,targetTileTimeMs:typeof e=="object"?e.targetTileTimeMs??16:16,adjustmentStep:typeof e=="object"?e.adjustmentStep??16:16}})}var Ni=class{aovs=[];aovSamples=16;maxSamples=2048;bounces=3;clamping=0;samplingPattern="sobol";directLightCandidates=4;bevel=!0;bevelSamples=8;dispersionWavelengths=3;alphaBlendStrategy="stochastic";transmissiveOutputAlphaMin=1;timeBudgetMs=21;maxTiles=1/0;batchSamples=!1;get allowMultipleSamplesPerFrame(){return this.batchSamples}set allowMultipleSamplesPerFrame(e){this.batchSamples=e}adaptiveResolution=!1;_resolutionScale=1;get resolutionScale(){return this._resolutionScale}set resolutionScale(e){if(this._fixed)throw new Error("Fixed-size renders cannot use resolutionScale.");if(!Number.isFinite(e)||e<=0)throw new Error("resolutionScale must be positive.");e!==this._resolutionScale&&this._cancelAdaptiveFrames(),this._resolutionScale=e}_fallback=null;get fallback(){return this._fallback}set fallback(e){if(e&&(e._engine!==this._engine||e===this||e.fallback))throw new Error("Fallback must be a render on the same engine with no fallback.");if(e&&this._dependents.size)throw new Error("Fallback renders cannot have their own fallback.");this._fallback?._dependents.delete(this),this._fallback=e,e?._dependents.add(this)}_dependents=new Set;_denoiserOptions=null;get denoiser(){return this._denoiserOptions}setDenoiser(e){e!==null&&sd(e);let t=e?yh(e):null,A=this._denoiserOptions;return A===null&&t===null?this._denoiserReady:t&&A&&_l(t)===_l(A)&&(t.type!=="custom"||A.type==="custom"&&je(t.aovs??[])===je(A.aovs??[]))&&t.schedule===A.schedule&&(t.type!=="oidn"||A.type==="oidn"&&t.signal===A.signal)?this._denoiserReady:(this._denoiserOptions=t,this._refreshDenoiser()??this._denoiserReady)}_denoiserReady=Promise.resolve();_fixed;_target;_status="preparing";_disposed=!1;_busy=!1;_refineOptions;_offlineCamera=!1;_input={scene:-1,camera:-1,settings:""};_adaptiveScale=1;_lastScale=1;_frameTime=0;_sampleStart;_frameStart;_sampleScale=1;_frameScale=1;_adaptiveFrames=new Set;_adaptiveFastFrames=0;_events=new Ti;get engine(){return this._engine}get denoising(){return!!this._denoisePending}on(e,t){return this._events.on(e,t)}_filter;_filterKey="";_warnedWebGPUFilter=!1;_denoiseController;_filterRevision=0;_filterPending;_denoiseRevision=0;_denoisePending;_denoisedSamples=0;_lastDenoiseTime=0;_warnedDenoisedReadback=!1;_engine;constructor(e,t={}){if(this._engine=e,t.denoiser!=null&&sd(t.denoiser),"width"in t||"height"in t){if("resolutionScale"in t||!Number.isInteger(t.width)||!Number.isInteger(t.height)||t.width<1||t.height<1)throw new Error("Provide positive integer width and height, or resolutionScale, exclusively.");this._fixed={width:t.width,height:t.height}}let{width:A,height:a,resolutionScale:r,fallback:n,denoiser:s,allowMultipleSamplesPerFrame:o,...l}=t;Object.assign(this,l),l.batchSamples===void 0&&o!==void 0&&(this.batchSamples=o),r!==void 0&&(this.resolutionScale=r),this._adaptiveScale=this._resolutionScale,this._lastScale=this._resolutionScale,this._validate(),this.fallback=n??null,e._register(this),s&&this.setDenoiser(s).catch(c=>this._engine._notifyError(c))}get width(){return this._target?.getMemory().width||this._size().width}get height(){return this._target?.getMemory().height||this._size().height}get samples(){return this._current?this._target?.getTotalSamplesRendered()??0:0}get converged(){return this.samples>=this.maxSamples}get status(){return!this._current&&this._status!=="error"?this._engine._ready?"converging":"preparing":this._status}get _current(){let e=this._engine._inputs;return e.scene===this._input.scene&&e.camera===this._input.camera&&!this._disposed}get _complete(){return this._current&&!!this._target?.presentationComplete&&!this._target.isFirstFrame()&&this.samples>0}get _presentable(){return this._complete&&(!this._denoisePending||this._denoisedSamples>0||this._schedule()==="converged"&&this.maxSamples>1)}get _output(){if(this._disposed)throw new Error("Render is disposed.");return this._target}get gpuSampleTimeMs(){return!this._busy&&this._current?this._target?.getRealtimeSampleTime?.():void 0}whenReadyToRefine(){if(this._disposed)throw new Error("Render is disposed.");return this._target?.whenTraceAvailable?.()??Promise.resolve()}get aovSamplesRendered(){return this._current?this._target?.getAovSamples?.()??0:0}_completeFor(e){let t=vt(e);return t&&this.aovs.includes(t)&&this._target?.aovReady?this._current&&this._target.aovReady(t):this._complete}_restartAovs(){this._target?.activate(),this._target?.restartAovs?.(),this._status="converging"}_refineAov(e){if(this._engine._initializationError)throw this._engine._initializationError;if(!this.aovs.includes(e))throw new Error(`AOV ${e} is not enabled`);if(!this._engine._ready){let n=this._engine._deviceGeneration;return this._engine.init().catch(s=>{this._disposed||n!==this._engine._deviceGeneration||(this._status="error",this._engine._notifyError(s))}),this._status="preparing"}let t=performance.now(),A=this._synchronize();if(!A)return this._status="preparing";let a=A.getAovSamples?.()??0,r=e==="id"||e==="motion"?1:Math.min(this.maxSamples,this.aovSamples);return A.refineAovs?.(this._engine._inputs.value,Math.min(r,(A.getAovSamples?.()??0)+1))?((A.getAovSamples?.()??0)>a&&(this._frameTime=Math.max(.001,performance.now()-t),this._frameStart=t,this._frameScale=this._adaptiveScale,this._adaptResolution(!0)),this._status=(A.getAovSamples?.()??0)>=r?"finished":"converging"):this._status="compiling"}_validate(){if(je(this.aovs),!Number.isInteger(this.aovSamples)||this.aovSamples<1)throw new Error("aovSamples must be a positive integer.");if(!Number.isFinite(this.maxSamples)||this.maxSamples<1)throw new Error("maxSamples must be positive.");if(this.dispersionWavelengths!==1&&this.dispersionWavelengths!==3)throw new Error("dispersionWavelengths must be 1 or 3.");let e=this.adaptiveResolution;if(e&&(this._fixed||!Number.isFinite(e.targetFrameMs)||e.targetFrameMs<=0||!Number.isFinite(e.minScale)||e.minScale<=0||e.minScale>this._resolutionScale))throw new Error("adaptiveResolution requires a scale-based render with positive targetFrameMs and minScale <= resolutionScale.")}_size(){if(this._fixed)return this._fixed;let e=this.adaptiveResolution?Math.min(this._adaptiveScale,this._resolutionScale):this._resolutionScale;return{width:Math.max(1,Math.round(this._engine.display.canvas.width*e)),height:Math.max(1,Math.round(this._engine.display.canvas.height*e))}}_settings(e=this.maxSamples){let t=rd(this,e);return t.batchSamples=this._refineOptions?.batchSamples??t.batchSamples,this._denoiserOptions?.type==="custom"&&(t.aovs=[...new Set([...this.aovs,...this._denoiserOptions.aovs??[]])]),t}_synchronize(e=this.maxSamples,t=!1){this._validate(),this._lastScale!==this._resolutionScale&&(this._adaptiveScale=this._resolutionScale,this._lastScale=this._resolutionScale);let A=this._target??=this._engine._createTarget();if(!A)return;let a=this._settings(e),r=this._size(),n=nd(a,r),s=this._engine._inputs;return A.configure(a),A.activate(),A.setRealtimeBatchBudget?.(this._refineOptions?.targetBatchTimeMs??1/0),A.setRealtimeDeferPostProcess?.(!!this._refineOptions?.deferResolve),(!t&&this._offlineCamera||s.scene!==this._input.scene||s.camera!==this._input.camera||n!==this._input.settings)&&(t||(this._offlineCamera=!1),this._cancelDenoise(),A.restartSamples(),this._sampleStart=this._frameStart=void 0,this._frameTime=0,A.setSize(r.width,r.height),this._input={scene:s.scene,camera:s.camera,settings:n}),A.setOnSampleRendered((o,l,c)=>{this._frameTime=Math.max(c,this._sampleStart===void 0?0:performance.now()-this._sampleStart),this._frameStart=this._sampleStart,this._frameScale=this._sampleScale,this._sampleStart=void 0,this._events.emit("sample",{samples:o,isFirstFrame:l,frameTimeMs:c})}),A}_trace(e,t){this._sampleStart===void 0&&(this._sampleStart=performance.now(),this._sampleScale=this._adaptiveScale);let A=e.trace(this._engine._inputs.value,t);return A&&(this._sampleStart=void 0),A}_adaptResolution(e=!1){if(!this._busy&&this.adaptiveResolution&&this._frameTime>0&&(e?this.aovSamplesRendered>0:this.samples>0)){let{targetFrameMs:t,minScale:A}=this.adaptiveResolution,a=this._frameStart,r=this._frameTime,n=this._frameScale,s=this._resolutionScale,{width:o,height:l}=this._engine.display.canvas;this._frameTime=0;let c=ni(()=>{this._adaptiveFrames.delete(c);let f=this.adaptiveResolution,m=this._engine.display.canvas;if(this._disposed||this._busy||!f||f.targetFrameMs!==t||f.minScale!==A||this._resolutionScale!==s||m.width!==o||m.height!==l)return;let d=Math.max(r,a===void 0?0:performance.now()-a),u=nu(n,d,t,s,this._adaptiveScale,A);if(u>this._adaptiveScale){if(++this._adaptiveFastFrames<4)return;this._adaptiveScale=Math.min(u,this._adaptiveScale*1.25)}else this._adaptiveScale=u;this._adaptiveFastFrames=0});this._adaptiveFrames.add(c)}}_cancelAdaptiveFrames(){for(let e of this._adaptiveFrames)e();this._adaptiveFrames.clear(),this._adaptiveFastFrames=0}refine(e,t){if(this._busy)throw new Error("Cannot refine a render while converge is running.");if(this._disposed)throw new Error("Render is disposed.");this._engine._setRenderError();let A=this._refineOptions;this._refineOptions=t;try{if(t?.targetBatchTimeMs!==void 0&&(!Number.isFinite(t.targetBatchTimeMs)||t.targetBatchTimeMs<=0))throw new RangeError("targetBatchTimeMs must be positive and finite.");return e===void 0?this._refine():this._refineAov(e)}catch(a){return this._engine._setRenderError(this._engine._notifyError(a)),this._status="error"}finally{this._refineOptions=A,this._engine._reportShaderProgress()}}_refine(){if(this._engine._initializationError)throw this._engine._initializationError;if(this._reloadDenoiser(),!this._engine._ready){let A=this._engine._deviceGeneration;return this._engine.init().catch(a=>{this._disposed||A!==this._engine._deviceGeneration||(this._status="error",this._engine._notifyError(a))}),this._status="preparing"}let e=this._synchronize();if(!e)return this._status="preparing";if(this._fallback&&this.samples===0&&!e.canCompleteSampleWithin(this.timeBudgetMs)&&!this._fallback._complete&&this._fallback._refineOne(),e.activate(),this._denoisePending)return this._status=this.converged?"denoising":"converging";e.setPreserveDenoisedOutput?.(!!this._filter&&this._schedule()!=="converged");let t=this._nextSampleTarget();if(this.samples<t){if(this._trace(e,t))return this._status="compiling"}else if(e.refineAovs&&!e.refineAovs(this._engine._inputs.value))return this._status="compiling";return this._maybeDenoise(!1,t),this._denoisePending?this._status=this.converged?"denoising":"converging":this._filterPending&&this.converged?this._status="preparing":(this._adaptResolution(),this._status=this.converged?"finished":"converging")}_refineOne(){if(this._busy||this._disposed||!this._engine._ready)return;this._reloadDenoiser();let e=this._synchronize();e&&(e.activate(),this.samples<1&&(this._status=this._trace(e,1)?"compiling":"converging"),this._maybeDenoise(),this._denoisePending||this._adaptResolution())}_schedule(){return this._denoiserOptions?.schedule??"converged"}_nextSampleTarget(){if(!this._filter)return this.maxSamples;if(this._schedule()==="every-sample")return Math.min(this.maxSamples,this.samples+1);if(this._schedule()==="converged")return this.maxSamples;if(this._denoisedSamples===0)return 1;let e=performance.now()-this._lastDenoiseTime;return e>=1e4?Math.min(this.maxSamples,this.samples+1):e<500?this.maxSamples:Math.min(this.maxSamples,Math.max(4,this._denoisedSamples*2))}_reloadDenoiser(){this._refreshDenoiser()?.catch(e=>this._engine._notifyError(e))}_refreshDenoiser(){if(this._disposed)return;let e=this._denoiserOptions,t=e?_l(e):"";if(t===this._filterKey)return;this._filterKey=t;let A=++this._filterRevision;if(this._cancelDenoise(),this._filter&&this._filter.kind!=="custom"&&this._engine._releaseDenoiser(this._filter),this._target?.invalidateDenoisedOutput(),this._filter=void 0,this._filterPending=void 0,!e)return this._denoiserReady=Promise.resolve();if(e.type==="jnlm")return this._filter=this._engine._retainDenoiser(`jnlm:${t}`,()=>({kind:"jnlm",denoiser:ys(e)})),this._denoiserReady=Promise.resolve();let a=(async()=>{if(await this._engine.init(),this._engine.backend!=="webgpu"){A===this._filterRevision&&!this._warnedWebGPUFilter&&(this._warnedWebGPUFilter=!0,console.warn("This denoiser requires WebGPU; denoising is disabled for this render."));return}if(A!==this._filterRevision||this._disposed)return;if(e.type==="custom"){this._filter={kind:"custom",denoiser:e.denoiser,aovs:e.aovs};return}let{loadOIDNNetwork:r}=await bh(),n=await this._engine._acquireDenoiser(t,async()=>({kind:"oidn",denoiser:await r(this._engine,e)}));if(A!==this._filterRevision||this._disposed){this._engine._releaseDenoiser(n);return}this._filter=n,this._warmDenoiser()})();return this._filterPending=a,this._denoiserReady=a.catch(r=>{if(A===this._filterRevision&&!this._disposed)throw r}).finally(()=>{this._filterPending===a&&(this._filterPending=void 0)})}_warmDenoiser(){let e=this._filter,t=this._filterRevision;if(!e||e.kind!=="oidn")return;let A=e.denoiser,a=[A,A.auxiliaryDenoisers?.albedo,A.auxiliaryDenoisers?.normal],r=this.width,n=this.height;this._engine._enqueueDenoise(async()=>{t!==this._filterRevision||e!==this._filter||this._disposed||await Promise.all(a.map(o=>o?.prepareForImage?.(r,n,{tileOverlap:this._schedule()==="converged"?void 0:80})))}).catch(o=>{t===this._filterRevision&&e===this._filter&&!this._disposed&&this._engine._notifyError(o)})}_cancelDenoise(){this._denoiseController?.abort(),this._denoiseController=void 0,this._denoiseRevision++,this._target?.cancelDenoise?.(),this._denoisePending=void 0,this._denoisedSamples=0}_inputsChanged(e=!1){this._cancelDenoise(),e&&this._target?.invalidateTiming?.()}_deviceLost(e){this._cancelAdaptiveFrames(),this._cancelDenoise(),this._filterRevision++,this._filter=void 0,this._filterPending=void 0,this._filterKey="",this._target=void 0,this._input={scene:-1,camera:-1,settings:""},this._status=e?"preparing":"error"}_displayChanged(){this._cancelDenoise(),this._target?.invalidateDenoisedOutput()}_maybeDenoise(e=!1,t=this._nextSampleTarget()){let A=this._target,a=this._filter;if(!A||!a||this._denoisePending||this.samples<1||this._denoisedSamples===this.samples||!e&&this._schedule()==="converged"&&!this.converged||!e&&this._schedule()==="progressive"&&this.samples<t)return;this._engine.display._configure(this),A.activate(),A.drawPostProcess();let r=++this._denoiseRevision,n=this.samples,s=this._frameStart,o=this._denoiseController=new AbortController,l=this._engine._enqueueDenoise(async()=>{if(r!==this._denoiseRevision||this._disposed||(A.activate(),this._engine.display._configure(this),r!==this._denoiseRevision||this._disposed)||(A.drawPostProcess(),a.kind==="custom"&&(await this._engine._prepareCustomDenoiser(a.denoiser,this.width,this.height),o.signal.aborted||r!==this._denoiseRevision||this._disposed)))return;let c=await A.performDenoise?.(a,void 0,this._schedule(),o.signal);r!==this._denoiseRevision||this._disposed||c&&(A.activate(),A.drawPostProcess(),this._denoisedSamples=n,this._lastDenoiseTime=performance.now(),s!==void 0&&(this._frameTime=Math.max(this._frameTime,this._lastDenoiseTime-s)))});this._denoisePending=l,l.catch(c=>{r===this._denoiseRevision&&!this._disposed&&this._engine._notifyError(c)}).finally(()=>{this._denoisePending===l&&(this._denoiseController=void 0,this._denoisePending=void 0,this._status=this.converged?"finished":"converging",this._adaptResolution())})}async readPixels(e="hdr"){if(this._disposed)throw new Error("Render is disposed.");let t=this._target;if(["depth","position","roughness","diffuseAlbedo","specularAlbedo","id","motion"].includes(e)){let A=e;if(je(this.aovs),!this.aovs.includes(A))throw new Error(`AOV ${A} is not enabled`);if(!t?.readAov)throw new Error("AOV output is not ready");return t.activate(),t.readAov(A)}return!t||this.samples===0?{width:0,height:0,data:new Float32Array(0)}:(e==="denoised"&&this._denoisedSamples===0&&(this._warnedDenoisedReadback||(this._warnedDenoisedReadback=!0,console.warn("Denoised output is not ready; reading HDR samples instead.")),e="hdr"),t.activate(),t.readOutput(e))}getOutputTexture(e){if(!(this._engine.backend!=="webgpu"||(e==="hdr"?!this._complete:!this._current||!this._target?.presentationComplete||!this._complete&&!this._target.getAovSamples?.())))return this._target?.getOutputTexture?.(e)}restart(){if(this._disposed)throw new Error("Render is disposed.");this._cancelDenoise(),this._cancelAdaptiveFrames(),this._sampleStart=this._frameStart=void 0,this._frameTime=0,this._target?.restartSamples(),this._status="converging"}dispose(){if(!this._disposed){this._disposed=!0,this._events.clear(),this._filterRevision++,this._cancelDenoise(),this._cancelAdaptiveFrames(),this._target&&this._engine._releaseTarget(this._target),this._filter&&this._filter.kind!=="custom"&&this._engine._releaseDenoiser(this._filter),this._target=void 0,this._filter=void 0,this._engine._unregister(this),this._fallback?._dependents.delete(this);for(let e of this._dependents)e._fallback=null;this._dependents.clear()}}async converge(e){if(this._busy)throw new Error("Converge is already running on this render.");if(this._disposed)throw new Error("Render is disposed.");let t=this._engine._inputs,A=this._engine._deviceGeneration;if(!t.value)throw new Error("Commit engine.scene and engine.camera with engine.update() before converge.");let a=Ua(e.camera??t.value),r=Math.max(1,Math.round(e.samples));if(!Number.isFinite(r))throw new Error("samples must be finite and positive.");let n=Math.max(1,Math.round(e.samplesPerBatch??8)),s=Math.max(0,Math.round(e.sampleSequenceOffset??0)),o=Math.max(1,e.timeoutMs??6e5),l=()=>{if(this._disposed)throw new Error("Render is disposed.");if(this._engine._deviceGeneration!==A)throw this._engine._lostError;if(e.signal?.aborted)throw e.signal.reason??new DOMException("Convergence aborted","AbortError");let d=this._engine._inputs;if(d.scene!==t.scene||d.camera!==t.camera)throw new Error("Engine inputs changed during converge.")};this._busy=!0;let c=()=>this._cancelDenoise();e.signal?.addEventListener("abort",c,{once:!0});let f,m=performance.now();try{for(await this._engine._awaitDevice(this._engine.init()),l();!this._engine._ready;){if(l(),performance.now()-m>o)throw new Error("Timed out preparing convergence.");await new Promise(p=>setTimeout(p,0))}if(f=this._synchronize(r,!0),this._offlineCamera=!!e.camera,!f)throw new Error("The render target is not ready.");this._cancelDenoise(),f.restartSamples(),this._reloadDenoiser(),await this._engine._awaitDevice(Promise.resolve(this._filterPending)),l();let d=async(p,g,v)=>{l(),this._cancelDenoise(),f.activate(),f.restartSamples(),f.configure({...this._settings(p),batchSamples:!0});let h=e.targetBatchTimeMs&&this._engine.device?1:Math.min(n,p),B=-1,E=performance.now(),x=performance.now();for(;;){if(l(),performance.now()-x>o)throw new Error(`Timed out rendering the offline ${g} pass.`);f.activate(),f.setOfflineRenderOptions({samplesPerBatch:h,deferPostProcess:!0,sampleSequenceOffset:v});let y=f.getTotalSamplesRendered(),M=performance.now();this._status=f.trace(a,p)?"compiling":"converging";let b=f.getTotalSamplesRendered();if(b!==B&&(B=b,e.onProgress?.({stage:g,samples:Math.min(b,p),targetSamples:p}),g==="final"&&e.previewIntervalMs!==void 0&&b>0&&b<p&&performance.now()-E>=e.previewIntervalMs&&(f.drawPostProcess(),E=performance.now())),b>=p)break;if(b>y&&this._engine.device?await this._engine._awaitDevice(this._engine.device.queue.onSubmittedWorkDone()):await new Promise(T=>setTimeout(T,0)),e.targetBatchTimeMs&&this._engine.device&&b>y){let T=Math.max(1,Math.min(n,Math.round(e.targetBatchTimeMs*(b-y)/Math.max(1,performance.now()-M))));h=T>h?Math.min(T,h*2):T}}await this._engine._awaitDevice(Promise.resolve(this._engine.device?.queue.onSubmittedWorkDone())),l()},u={samples:r,averageSamplesPerPixel:r,pilotSamples:0,adaptiveSampling:!1};if(e.adaptiveSampling&&this._engine.device){let p=Math.min(r,Math.max(2,Math.round(e.adaptiveSampling.pilotSamples??8)));f.activate(),f.setVarianceMoments(!0),f.setAdaptiveSamplingTargets(void 0),await d(p,"pilot",s),f.activate();let g=await this._engine._awaitDevice(f.prepareOfflineAdaptiveSampling({...e.adaptiveSampling,maxSamples:r}));g?(f.activate(),f.setVarianceMoments(!1),await d(g.maximumTarget,"final",s+p),u={samples:g.maximumTarget,averageSamplesPerPixel:g.averageTarget,pilotSamples:p,varianceHistory:g.history,adaptiveSampling:!0}):(f.setVarianceMoments(!1),f.setAdaptiveSamplingTargets(void 0),await d(r,"final",s))}else f.activate(),f.setVarianceMoments(!1),f.setAdaptiveSamplingTargets(void 0),await d(r,"final",s);return this._filter&&(e.onProgress?.({stage:"denoising",samples:u.samples,targetSamples:u.samples}),this._status="denoising",this._maybeDenoise(!0),await this._engine._awaitDevice(Promise.resolve(this._denoisePending)),l()),this._status="finished",u}catch(d){throw this._engine._deviceGeneration===A&&(this._status="error"),d}finally{f&&!this._disposed&&this._engine._deviceGeneration===A&&(f.activate(),f.setVarianceMoments(!1),f.setAdaptiveSamplingTargets(void 0),f.setOfflineRenderOptions({samplesPerBatch:0,deferPostProcess:!1,sampleSequenceOffset:0})),e.signal?.removeEventListener("abort",c),this._busy=!1}}};function od(i,e,t,A,a){let r=t?-1/0:e&&i.previousChanged?A:i.lastContinuousChange;return{previousChanged:e&&!t,lastContinuousChange:r,changing:t||A-r<Math.max(0,a)}}function xl(i,e){return JSON.stringify([i.samples,i.width,i.height,i.maxSamples,i.bounces,i.clamping,i.samplingPattern,i.directLightCandidates,i.bevel,i.bevelSamples,i.dispersionWavelengths,i.alphaBlendStrategy,i.transmissiveOutputAlphaMin,i.resolutionScale,i.adaptiveResolution,i.denoiser,i.denoising,i.aovs,i.aovSamples,e.canvas.width,e.canvas.height,e.toneMapping,e.toneMappingExposure,e.contrast,e.saturation,e.temperature,e.tint,e.vignette,e.bloomIntensity,e.bloomThreshold,e.bloomRadius,e.hdrOutputEnabled,e.channel,e.shadowCatcherColor,e.shadowCatcherAlpha,e.aovDepthRange,e.aovPositionScale,e.aovMotionScale,e.aovIdComponent])}var vs=class{engine;preview;final;display;select=({changing:e})=>e?"preview":"final";idleMs;coalesceSceneUpdates;_changing=!1;_status="preparing";_events=new Ti;_syncs=new Set;_owned=new Set;_policy={previousChanged:!1,lastContinuousChange:-1/0,changing:!1};_running=!1;_busy=!1;_disposed=!1;_cancelScheduled;_refillGeneration=0;_cancelRefillFrame;_warnedTick=!1;_previewFrameOwner;_presented;_finishedImage;_motion;_unsubscribe;constructor(e,t={}){this.engine=e;let A=t.sync?Array.isArray(t.sync)?t.sync:[t.sync]:[];for(let a of A)this._checkEngine(a.engine);for(let a of[t.preview,t.final])a instanceof Ni&&this._checkEngine(a.engine);this.display=t.display??e.display,this.idleMs=t.idleMs??150,this.coalesceSceneUpdates=t.coalesceSceneUpdates??!1;try{t.preview!==!1&&(this.preview=this._render(t.preview,{resolutionScale:.5,timeBudgetMs:80,adaptiveResolution:{targetFrameMs:80,minScale:.125},bounces:2,bevel:!1,dispersionWavelengths:1,directLightCandidates:2})),this.final=this._render(t.final,{fallback:this.preview??null})}catch(a){for(let r of this._owned)r.dispose();throw a}for(let a of A)this.addSync(a);this._unsubscribe=this.final.on("sample",a=>this._events.emit("sample",{...a,preview:!1})),typeof document<"u"&&document.addEventListener("visibilitychange",this._visibility)}_render(e,t){if(e instanceof Ni)return e;let A={...t,...e};e&&"width"in e&&("resolutionScale"in e||delete A.resolutionScale,"adaptiveResolution"in e||delete A.adaptiveResolution);let a=new Ni(this.engine,A);return this._owned.add(a),a}_checkEngine(e){if(e!==this.engine)throw new Error("RenderLoop renders and syncs must belong to the same engine.")}_assertAlive(){if(this._disposed)throw new Error("RenderLoop is disposed.")}get changing(){return this._changing}get samples(){return this.status==="previewing"?0:this.final.samples}get status(){return this._status}on(e,t){return this._events.on(e,t)}addSync(e){this._assertAlive(),this._checkEngine(e.engine),this._syncs.add(e)}removeSync(e){this._syncs.delete(e)}_setStatus(e){if(e!==this._status){let t=this._status;this._status=e,this._events.emit("status",{status:e,previous:t})}return e}_present(e){let t=this.display.present(e);return t&&(this._presented=t),t}tick(){return this._assertAlive(),this._running?(this._warnedTick||(this._warnedTick=!0,console.warn("RenderLoop.tick() is ignored while start() is active.")),this.status):this._tick()}_tick(){this._cancelRefill();let e=this._refillGeneration;if(this._busy||typeof document<"u"&&document.hidden)return this.status;for(let E of this._syncs)E.update();let t=vt(this.display.channel),A=E=>E.refine(t,{batchSamples:E.batchSamples&&!this.changing&&E!==this.preview,targetBatchTimeMs:4}),a=E=>t?E.aovSamplesRendered:E.samples,r=this._previewFrameOwner,n=!!r&&(r===this.preview||!r._completeFor(this.display.channel)),s=n&&this.preview?.status==="converging"&&a(this.preview)===0,o=s||!t&&this.coalesceSceneUpdates&&n&&!!this.preview?.denoising;n&&!o&&this.preview&&this._present(this.preview),o||(this._previewFrameOwner=void 0);let l=o?!1:this.engine.update(),c=[...this._syncs].some(E=>E.active);this._policy=od(this._policy,l,c,performance.now(),this.idleMs),this._changing=this._policy.changing;let f=this.select({changing:this.changing});if(o&&this.preview){if(s){if(A(this.preview)==="error")return this._previewFrameOwner=void 0,this._setStatus("error");(!this.coalesceSceneUpdates||!this.preview.denoising)&&this._present(this.preview)&&(this._previewFrameOwner=void 0)}return this._setStatus("previewing")}let m=f==="preview"&&this.preview?this.preview:this.final,d=!l&&!this.changing;t!=="motion"?this._motion=void 0:this._motion?.render!==m?this._motion={render:m,phase:this._motion?"priming":"moving"}:(!d&&this._motion.phase!=="priming"||!m._completeFor("motion")&&this._motion.phase==="settled")&&(this._motion.phase="moving");let u=this._motion,p=xl(this.final,this.display);if(d&&m===this.final&&this.status==="finished"&&this.final.status==="finished"&&p===this._finishedImage&&(!u||u.phase==="settled"))return this.status;this.status==="finished"&&p!==this._finishedImage&&this.final.samples>0&&this._present(this.final),u?.phase==="moving"&&d&&m._completeFor("motion")&&(m._restartAovs(),u.phase="settling");let g=A(m);u?.phase==="priming"&&g==="finished"&&(m._restartAovs(),u.phase="settling",g=A(m)),u?.phase==="settling"&&g==="finished"&&(u.phase="settled");let v=!!this.preview&&(m===this.preview&&g==="converging"&&a(m)===0||!t&&this.coalesceSceneUpdates&&this.preview.denoising)&&(m===this.preview||!m._completeFor(this.display.channel)&&m.fallback===this.preview);v?this._previewFrameOwner=m:this._present(m);let h=v||!t&&m===this.preview&&m.denoising||!!this.preview&&this._presented===this.preview,B=g==="error"?"error":h?"previewing":g;return this._finishedImage=B==="finished"?xl(this.final,this.display):void 0,e===this._refillGeneration&&!t&&d&&m===this.final&&!h&&this._scheduleRefill(),this._setStatus(B)}_cancelRefill(){this._refillGeneration++,this._cancelRefillFrame?.(),this._cancelRefillFrame=void 0}_scheduleRefill(){let e=this.engine.device;if(!e||!this._canRefill())return;let t=this._refillGeneration;this._cancelRefillFrame=ni(()=>this._cancelRefill());let A=()=>{if(t!==this._refillGeneration||e!==this.engine.device||this._disposed||this._busy||typeof document<"u"&&document.hidden||vt(this.display.channel)||!this._canRefill()||[...this._syncs].some(s=>s.active)||this.select({changing:!1})!=="final")return;let r=this.final.samples,n=this.final.refine(void 0,{targetBatchTimeMs:4,deferResolve:!0});if(n==="error"){this._cancelRefill(),this._setStatus("error");return}this.final.samples>r&&n==="converging"&&a()},a=()=>{this.final.whenReadyToRefine().then(A,()=>{})};a()}_canRefill(){let e=this.final.gpuSampleTimeMs;return this.final.batchSamples&&!this.final.denoising&&this.final.samples>0&&this.final.status==="converging"&&e!==void 0&&e<=this.final.timeBudgetMs}_schedule(){!this._running||this._busy||this._cancelScheduled!==void 0||typeof document<"u"&&document.hidden||(this._cancelScheduled=ni(()=>{this._cancelScheduled=void 0;try{this._tick()}finally{this._schedule()}}))}_visibility=()=>{document.hidden?(this._cancelFrame(),this._cancelRefill()):this._schedule()};_cancelFrame(){this._cancelScheduled?.(),this._cancelScheduled=void 0}start(){this._assertAlive(),this._running=!0,this._schedule()}stop(){this._running=!1,this._cancelFrame(),this._cancelRefill()}async converge(e){if(this._assertAlive(),this._busy)throw new Error("RenderLoop convergence is already running.");this._busy=!0,this._previewFrameOwner=void 0,this._cancelFrame(),this._cancelRefill();try{for(let A of this._syncs)A.update();this.engine.update(),this._setStatus("preparing");let t=await this.final.converge({...e,onProgress:A=>{this._setStatus(A.stage==="denoising"?"denoising":this.final.status),e.onProgress?.(A)}});return this._present(this.final),this._setStatus("finished"),t}catch(t){throw this._setStatus("error"),t}finally{this._busy=!1,this._schedule()}}dispose(){if(!this._disposed){this.stop(),this._disposed=!0,this._unsubscribe(),this._events.clear(),this._syncs.clear(),typeof document<"u"&&document.removeEventListener("visibilitychange",this._visibility);for(let e of this._owned)e.dispose();this._owned.clear()}}};export{SA as AmbientLight,Yi as Camera,ga as DEFAULT_JNLM_OPTIONS,PA as DirectionalLight,VA as Display,gs as Engine,UA as EnvironmentLight,Ge as Geometry,X as GeometryAttribute,_t as IESParseError,Ki as IESProfile,be as InstancedMesh,Ii as Mesh,Ji as OpenPBRMaterial,Ir as ProceduralSky,DA as RectLight,Ni as Render,vs as RenderLoop,At as SceneNode,TA as SphereLight,RA as SpotLight,OA as Sync,Js as THREESync,Ke as Texture,yd as VERSION,np as computeMeshesBoundingBox,ap as createCubeGeometry,rp as createCurvePlaneGeometry,Ap as createPlaneGeometry,ip as createSphereGeometry,Zl as fromTHREECamera,tp as fromTHREEScene,Vi as generateVertexNormals,Cr as generateVertexTangents,jr as getRecommendedDeviceDescriptor,Fd as loadRGBE,Pd as parseIESProfile,Wl as parseRGBE};
