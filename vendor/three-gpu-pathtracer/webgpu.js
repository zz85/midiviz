import{A as si,a as Qa,b as Je,c as ja,d as Ka,e as _e,f as Xa,g as Kr,h as fe,i as te,o as Ya,q as Za,r as Ja,s as ei,t as ti,w as ri,x as ai,z as ii}from"./chunk-ANAG5KZE.js";import{a as jr}from"./chunk-WOT6VMZA.js";import{Box3 as kc,DataTexture as Hc,LinearFilter as To,Vector2 as Do,Scene as Vc,PerspectiveCamera as Oc,Color as Wc,NoToneMapping as Io,FloatType as Uc,Timer as qc,StorageTexture as Gc,MeshBasicNodeMaterial as Qc,Matrix4 as jc,WebGPUCoordinateSystem as Kc}from"three/webgpu";import{uv as Xc,uniform as Yc,varying as Zc}from"three/tsl";import{wgslFn as Xr}from"three/tsl";import{wgslFn as ni,wgsl as li}from"three/tsl";import{StructTypeNode as Ce}from"three/webgpu";var E=new Ce({min:"array<f32, 3>",max:"array<f32, 3>"},"BVHBoundingBox");E.getLength=()=>6;var B=new Ce({bounds:"BVHBoundingBox",rightChildOrTriangleOffset:"uint",splitAxisOrTriangleCount:"uint"},"BVHNode");B.getLength=()=>E.getLength()+2;var oi=new Ce({matrixWorld:"mat4x4f",inverseMatrixWorld:"mat4x4f",visible:"uint",_alignment0:"uint",_alignment1:"uint",_alignment2:"uint"},"TransformStruct"),v=new Ce({origin:"vec3f",direction:"vec3f",maxDist:"float"},"Ray"),re=new Ce({indices:"vec4u",normal:"vec3f",didHit:"bool",barycoord:"vec3f",objectIndex:"uint",side:"float",dist:"float"},"IntersectionResult"),et=new Ce({faceIndices:"vec4u",closestPoint:"vec3f",found:"bool",barycoord:"vec3f",objectIndex:"uint",faceNormal:"vec3f",side:"float",distanceSq:"float"},"PointQueryResult");var Rt=li(`

	const BVH_STACK_DEPTH = 60u;
	const INFINITY = 1e20;
	const TRI_INTERSECT_EPSILON = 1e-5;

`),Dt=li(`
	struct IntersectionResult {
		indices: vec4u,
		normal: vec3f,
		didHit: bool,
		barycoord: vec3f,
		side: f32,
		dist: f32,
	};
`),Hu=ni(`

	fn getVertexAttribute(
		barycoord: vec3f,
		indices: vec3u,
		attributeBuffer: ptr<storage, array<vec3f>, read>
	) -> vec3f {

		let n0 = attributeBuffer[ indices.x ];
		let n1 = attributeBuffer[ indices.y ];
		let n2 = attributeBuffer[ indices.z ];
		return barycoord.x * n0 + barycoord.y * n1 + barycoord.z * n2;

	}

`),ci=ni(`

	fn intersectsBounds(
		ray: Ray,
		bounds: BVHBoundingBox,
		dist: ptr<function, f32>
	) -> bool {

		let boundsMin = vec3( bounds.min[0], bounds.min[1], bounds.min[2] );
		let boundsMax = vec3( bounds.max[0], bounds.max[1], bounds.max[2] );

		let invDir = 1.0 / ray.direction;
		let tMinPlane = ( boundsMin - ray.origin ) * invDir;
		let tMaxPlane = ( boundsMax - ray.origin ) * invDir;

		let tMinHit = vec3f(
			min( tMinPlane.x, tMaxPlane.x ),
			min( tMinPlane.y, tMaxPlane.y ),
			min( tMinPlane.z, tMaxPlane.z )
		);

		let tMaxHit = vec3f(
			max( tMinPlane.x, tMaxPlane.x ),
			max( tMinPlane.y, tMaxPlane.y ),
			max( tMinPlane.z, tMaxPlane.z )
		);

		let t0 = max( max( tMinHit.x, tMinHit.y ), tMinHit.z );
		let t1 = min( min( tMaxHit.x, tMaxHit.y ), tMaxHit.z );

		( *dist ) = max( t0, 0.0 );

		return t1 >= ( *dist );

	}

`,[v,E]);var Yr=Xr(`

	fn intersectsTriangle( ray: Ray, a: vec3f, b: vec3f, c: vec3f ) -> IntersectionResult {

		var result: IntersectionResult;
		result.didHit = false;

		let edge1 = b - a;
		let edge2 = c - a;
		let n = cross( edge1, edge2 );

		let det = - dot( ray.direction, n );

		if ( abs( det ) < TRI_INTERSECT_EPSILON ) {

			return result;

		}

		let invdet = 1.0 / det;

		let AO = ray.origin - a;
		let DAO = cross( AO, ray.direction );

		let u = dot( edge2, DAO ) * invdet;
		let v = -dot( edge1, DAO ) * invdet;
		let t = dot( AO, n ) * invdet;

		let w = 1.0 - u - v;

		if ( u < - TRI_INTERSECT_EPSILON || v < - TRI_INTERSECT_EPSILON || w < - TRI_INTERSECT_EPSILON || t < TRI_INTERSECT_EPSILON ) {

			return result;

		}

		result.didHit = true;
		result.barycoord = vec3f( w, u, v );
		result.dist = t;
		result.side = sign( det );
		result.normal = result.side * normalize( n );

		return result;

	}

`,[v,Dt,Rt]),qo=Xr(`

	fn intersectTriangles(
		bvh_position: ptr<storage, array<vec3f>, read>,
		bvh_index: ptr<storage, array<vec3u>, read>,
		offset: u32,
		count: u32,
		ray: Ray
	) -> IntersectionResult {

		var closestResult: IntersectionResult;

		closestResult.didHit = false;
		closestResult.dist = INFINITY;

		for ( var i = offset; i < offset + count; i = i + 1u ) {

			let indices = bvh_index[ i ];
			let a = bvh_position[ indices.x ];
			let b = bvh_position[ indices.y ];
			let c = bvh_position[ indices.z ];

			var triResult = intersectsTriangle( ray, a, b, c );

			if ( triResult.didHit && triResult.dist < closestResult.dist ) {

				closestResult = triResult;
				closestResult.indices = vec4u( indices.xyz, i );

			}

		}

		return closestResult;

	}

`,[Yr,v,Dt,Rt]),qu=Xr(`

	fn bvhIntersectFirstHit(
		bvh_index: ptr<storage, array<vec3u>, read>,
		bvh_position: ptr<storage, array<vec3f>, read>,
		bvh: ptr<storage, array<BVHNode>,read>,
		ray: Ray,
	) -> IntersectionResult {

		var pointer = 0;
		var stack: array<u32, BVH_STACK_DEPTH>;
		stack[ 0 ] = 0u;

		var bestHit: IntersectionResult;

		bestHit.didHit = false;
		bestHit.dist = INFINITY;

		loop {

			if ( pointer < 0 || pointer >= i32( BVH_STACK_DEPTH ) ) {

				break;

			}

			let currNodeIndex = stack[ pointer ];
			let node = bvh[ currNodeIndex ];

			pointer = pointer - 1;

			var boundsHitDistance: f32 = 0.0;

			if ( ! intersectsBounds( ray, node.bounds, &boundsHitDistance ) || boundsHitDistance > bestHit.dist ) {

				continue;

			}

			let boundsInfox = node.splitAxisOrTriangleCount;
			let boundsInfoy = node.rightChildOrTriangleOffset;

			let isLeaf = ( boundsInfox & 0xffff0000u ) != 0u;

			if ( isLeaf ) {

				let count = boundsInfox & 0x0000ffffu;
				let offset = boundsInfoy;

				let localHit = intersectTriangles(
					bvh_position, bvh_index, offset,
					count, ray
				);

				if ( localHit.didHit && localHit.dist < bestHit.dist ) {

					bestHit = localHit;

				}

			} else {

				let leftIndex = currNodeIndex + 1u;
				let splitAxis = boundsInfox & 0x0000ffffu;
				let rightIndex = currNodeIndex + boundsInfoy;

				let leftToRight = ray.direction[splitAxis] >= 0.0;
				let c1 = select( rightIndex, leftIndex, leftToRight );
				let c2 = select( leftIndex, rightIndex, leftToRight );

				pointer = pointer + 1;
				stack[ pointer ] = c2;

				pointer = pointer + 1;
				stack[ pointer ] = c1;

			}

		}

		return bestHit;

	}

`,[qo,ci,v,B,Dt,Rt]);import{Matrix4 as $i,Mesh as Mt,Group as sn}from"three";import{StorageBufferAttribute as Nt,StructTypeNode as on}from"three/webgpu";import{storage as Bt}from"three/tsl";import{Node as Go,TSL as ui}from"three/webgpu";var _t=class extends Go{static get type(){return"ProxyCallNode"}constructor(e,t){super(),this.proxyNode=e,this.params=t}setup(){return this.proxyNode.proxyNode.call(...this.params)}},tt=class{get isNode(){return!0}get proxyNode(){let{proxyObject:e,proxyProperty:t}=this,r=t.split("."),a=e;for(let s=0,i=r.length;s<i;s++)a=a?.[r[s]];return a&&"functionNode"in a?a.functionNode:a??null}constructor(e,t=null){return this.proxyObject=t,this.proxyProperty=e,new Proxy(this,{get(r,a){if(a in r)return Reflect.get(r,a);{let s=r.proxyNode;if(!s)return;let i=Reflect.get(s,a);return typeof i=="function"?i.bind(s):i}},set(r,a,s){if(a in r)return Reflect.set(r,a,s);throw new Error("NodeProxy: Cannot set members of proxied nodes.")}})}},R=(...c)=>new tt(...c),w=(...c)=>{let e=new tt(...c),t=(...r)=>new _t(e,r);return ui.nodeProxyConstructor(t,e)},Zr=class extends tt{get proxyNode(){return super.proxyNode||this.fallbackNode}constructor(e,t){super(e,null),Object.defineProperty(this,"fallbackNode",{value:t})}setup(e){return this.proxyObject=e.getContext(),this.proxyNode.setup(e)}};var pe=(...c)=>{let e=new Zr(...c),t=(...r)=>new _t(e,r);return ui.nodeProxyConstructor(t,e)};import{Vector4 as di}from"three";var ae=new di,U=new di;function Qo(c,e){let t=c?c.array:null,r=new Uint32Array(e.length*3);for(let a=0,s=e.length;a<s;a++){let i=3*a,n=3*e[a];for(let o=0;o<3;o++)r[i+o]=t?t[n+o]:n+o}return r}function Jr(c,e,t,r){let a=new Uint32Array(r),s=new Float32Array(r);c._roots.forEach(i=>{let n=new Uint16Array(i),o=new Uint32Array(i);for(let u=0,l=i.byteLength/32;u<l;u++){let f=u*8,p=f*2,m=t*8,d=new Float32Array(i,u*32,6);if(u===0)for(let x=0;x<3;x++){let I=d[x+0],b=d[x+3];I>b?(s[m+x+0]=1,s[m+x+3]=-1):(s[m+x+0]=I,s[m+x+3]=b)}else s.set(d,m);if(e===null){t++;continue}if(Je(p,n)){let x=o[f+6],I=n[p+14],{transformSlot:b,nodeOffset:D}=I===0?{transformSlot:0,nodeOffset:0}:e[x];if(b>16777215)throw new Error(`packBVHBufferUtils: transform slot ${b} exceeds the 24-bit TLAS leaf limit.`);a[m+6]=D,a[m+7]=4278190080|b&16777215}else a[m+6]=o[f+6],a[m+7]=o[f+7];t++}})}function hi(c,e){return fi(new Uint16Array(c),new Uint32Array(c),e)}function fi(c,e,t){if(Je(t*8*2,c))return 1;let a=e[t*8+6];return a+fi(c,e,t+a)}function ea(c,e=0){let t=new Uint16Array(c),r=new Uint32Array(c),a=0;return s(e*8,1),a;function s(i,n){let o=i,u=i*2;if(Je(u,t))a=Math.max(n,a);else{let f=Ka(o,r),p=ja(o);s(p,n+1),s(f,n+1)}}}function pi(c,e,t,r,a,s){let i=new Uint16Array(s),n=new Uint32Array(s),o=new Float32Array(s),u=new Uint16Array(c),l=new Uint32Array(c);for(let f=0;f<t;f++){let p=e+f,m=p*8,d=m*2,g=a*8,x=g*2,I=new Float32Array(c,p*32,6);if(f===0)for(let D=0;D<3;D++){let y=I[D+0],C=I[D+3];y>C?(o[g+D+0]=1,o[g+D+3]=-1):(o[g+D+0]=y,o[g+D+3]=C)}else o.set(I,g);Je(d,u)?(n[g+6]=l[m+6]+r,i[x+14]=u[d+14],i[x+15]=65535):(n[g+6]=l[m+6],n[g+7]=l[m+7]),a++}}function mi(c,e,t,r,a){let{geometry:s}=c,{start:i,count:n,vertexStart:o}=e;if(c.indirect){let u=Qo(s.index,c._indirectBuffer);for(let l=0;l<u.length;l++)a[l+r]=u[l]-o+t}else if(s.index)for(let u=0;u<n;u++)a[u+r]=s.index.getX(u+i)-o+t;else for(let u=0;u<n;u++)a[u+r]=u+i+t}function gi(c,e,t,r,a,s){let{geometry:i,mesh:n=null}=c,{vertexStart:o,vertexCount:u}=e,l=new Float32Array(r),f=a.getLength();a.membersLayout.forEach(({name:p},m)=>{let d=i.attributes[p];s.getDefaultAttributeValue(p,ae);for(let g=0;g<u;g++){if(d){switch(U.fromBufferAttribute(d,g+o),d.itemSize){case 1:U.y=ae.y,U.z=ae.z,U.w=ae.w;break;case 2:U.z=ae.z,U.w=ae.w;break;case 3:U.w=ae.w;break}n&&(p==="position"||p==="normal"||p==="tangent")&&n.applyBoneTransform(g+o,U)}else U.copy(ae);U.toArray(l,(t+g)*f+m*4)}})}import{CodeNode as jo,FunctionNode as Ko,Node as xi,TSL as Xo}from"three/webgpu";var ta=class extends xi{constructor(e){super(),this.literal=e}build(){return this.literal}},rt=class extends xi{constructor(e,t="property"){super(),this.node=e,this.output=t}build(e){return this.node.build(e,this.output)}};function Yo(c){return c.isNode?new rt(c):null}function vi(c){let e=[];for(let t of c)if(Array.isArray(t))for(let r of t){let a=Yo(r);a&&e.push(a)}return e}function yi(c,e){return c.map(t=>(t&&!t.isNode&&t instanceof Function&&(t=t(e)),t&&t.isNode?(t.setup(e),t.isWGSLTagCodeNode?new rt(t,"inline"):new rt(t)):t))}function ra(c,e,t){let r="";for(let a=0,s=c.length;a<s;a++)if(r+=c[a],a<e.length){let i=e[a];Array.isArray(i)||(typeof i=="string"||typeof i=="number"?r+=String(i):r+=i.build(t))}return r}var aa=class extends Ko{static get type(){return"WGSLTagFnNode"}constructor(e,t,r="wgsl"){super("",vi(t),r),this.isWGSLTagFnNode=!0,this.tokens=e,this.args=t}setup(e){super.setup(e),this._normalizedArgs=yi(this.args,e)}getNodeFunction(e){let{tokens:t,_normalizedArgs:r}=this,a=e.getDataFromNode(this),s=a.nodeFunction;if(s===void 0){let i="";for(let n=0,o=t.length;n<o;n++)if(i+=t[n],n<r.length){let u=r[n];Array.isArray(u)||(typeof u=="string"||typeof u=="number"?i+=String(u):u.isStructLayoutNode?i+=u.getNodeType(e):u.isStruct?i+=u.layout.getNodeType(e):i+="_arg"+n)}i=i.replace(/\/\/.*[\n\r]/g,""),s=e.parser.parseFunction(i),a.nodeFunction=s}return s}generate(e,t){let r=super.generate(e,t),{_normalizedArgs:a}=this,s=ra(this.tokens,a,e),{type:i}=this.getNodeFunction(e),n=e.getCodeFromNode(this,i);return n.code=s.replace(/\/\/.+[\n\r]/g,"").replace(/->\s*void/,"").trim(),r}},ia=class extends jo{static get type(){return"WGSLTagCodeNode"}constructor(e,t,r="wgsl"){super("",vi(t),r),this.isWGSLTagCodeNode=!0,this.tokens=e,this.args=t}setup(e){super.setup(e),this._normalizedArgs=yi(this.args,e)}build(e,t){return t==="inline"?ra(this.tokens,this._normalizedArgs,e):super.build(e,t)}generate(e){super.generate(e);let t=e.getCodeFromNode(this,this.getNodeType(e));return t.code=ra(this.tokens,this._normalizedArgs,e),t.code}},Zo=c=>{let e=(...t)=>{if(t.length===1&&t[0]&&typeof t[0]=="object"&&!t[0].isNode){let r=t[0];for(let a in r)typeof r[a]=="string"&&(r[a]=new ta(r[a]))}return c.call(...t)};return Xo.nodeProxyConstructor(e,c)},h=(c,...e)=>Zo(new aa(c,e)),me=(c,...e)=>new ia(c,e);import{uint as Jo}from"three/tsl";var at=Jo(60);function bi(c,e){let{name:t=`bvh_shapecast_fn_${Math.random().toString(36).substring(2,7)}`,shapeStruct:r,resultStruct:a=null,prefixFn:s=null,boundsOrderFn:i=null,intersectsBoundsFn:n,intersectRangeFn:o,transformShapeFn:u=null,transformResultFn:l=null,resetShapeFn:f=null}=e,{nodes:p,transforms:m}=c.storage,d="";s&&(d=me`${s}();`);let g="";l&&(g=me`${l}( result, objectIndex );`);let x="";u&&(x=me`${u}( &localShape, objectIndex );`);let I="";f&&(I=me`${f}( objectIndex );`);let b="";i&&(b=me`
			let leftToRight = ${i}( localShape, splitAxis, node );
			c1 = select( rightIndex, leftIndex, leftToRight );
			c2 = select( leftIndex, rightIndex, leftToRight );
		`);let D=a?me`result: ptr<function, ${a}>`:"",y=a?"result":"",C=h`
		// fn
		fn ${t}( shape: ${r}, ${D} ) -> bool {

			${d}

			var didHit = false;

			var isTLAS = true;
			var pointer: i32 = 0;
			var stack: array<u32, ${at}>;
			stack[ 0 ] = 0u;

			var blasDidHit: bool = false;
			var objectIndex: u32 = 0;
			var localShape: ${r} = shape;

			// the stack depth the current cluster's BLAS drains back down to once it is complete
			var tlasReset: i32 = 0;

			loop {

				// The cluster's BLAS has drained back to its TLAS leaf. Finalize the cluster that
				// was just traversed and resume the TLAS.
				if ( ! isTLAS && tlasReset == pointer ) {

					if ( blasDidHit ) {

						blasDidHit = false;
						didHit = true;
						${g}

					}

					${I}

					objectIndex = 0;
					isTLAS = true;
					localShape = shape;

				}

				// check if we've finished all nodes on the stack (or overrun the stack)
				if ( pointer < 0 || pointer >= i32( ${at} ) ) {

					break;

				}

				let nodeIndex = stack[ pointer ];
				let node = ${p}[ nodeIndex ];
				pointer = pointer - 1;

				// skip the node if we don't intersect the bounds
				if ( ${n}( localShape, node.bounds, ${y} ) == 0u ) {

					continue;

				}

				let infoX = node.splitAxisOrTriangleCount;
				let infoY = node.rightChildOrTriangleOffset;
				let isLeaf = ( infoX & 0xffff0000u ) != 0u;

				if ( isLeaf ) {

					if ( isTLAS ) {

						// the leaf encodes the placement / transform slot in the low 24 bits of infoX
						// and the cluster subtree's absolute node offset in infoY, which is pushed
						// directly as the BLAS entry node. Each TLAS leaf references one cluster.
						objectIndex = infoX & 0x00ffffffu;

						let transform = ${m}[ objectIndex ];
						if ( transform.visible != 0u ) {

							tlasReset = pointer;
							isTLAS = false;
							blasDidHit = false;

							// Transform shape into object local space
							localShape = shape;
							${x}

							pointer = pointer + 1;
							stack[ pointer ] = infoY;

						}

					} else {

						let count = infoX & 0x0000ffffu;
						let offset = infoY;
						blasDidHit = ${o}( localShape, offset, count, ${y} ) || blasDidHit;

					}

				} else {

					let leftIndex = nodeIndex + 1u;
					let splitAxis = infoX & 0x0000ffffu;
					let rightIndex = nodeIndex + infoY;

					var c1 = rightIndex;
					var c2 = leftIndex;
					${b}

					pointer = pointer + 1;
					stack[ pointer ] = c2;

					pointer = pointer + 1;
					stack[ pointer ] = c1;

				}

			}

			return didHit;

		}
	`;return C.outputType=a,C.functionName=t,C}import{float as en}from"three/tsl";var Si=h`
	// fn
	fn closestPointToTriangle(
		p: vec3f,
		v0: vec3f,
		v1: vec3f,
		v2: vec3f
	) -> vec3f {

		let v10 = v1 - v0;
		let v21 = v2 - v1;
		let v02 = v0 - v2;
		let p0 = p - v0;
		let p1 = p - v1;
		let p2 = p - v2;

		let nor = cross( v10, v02 );
		let q = cross( nor, p0 );
		let d = 1.0 / dot( nor, nor );
		var u = d * dot( q, v02 );
		var v = d * dot( q, v10 );
		var w = 1.0 - u - v;

		if ( u < 0.0 ) {

			w = clamp( dot( p2, v02 ) / dot( v02, v02 ), 0.0, 1.0 );
			u = 0.0;
			v = 1.0 - w;

		} else if ( v < 0.0 ) {

			u = clamp( dot( p0, v10 ) / dot( v10, v10 ), 0.0, 1.0 );
			v = 0.0;
			w = 1.0 - u;

		} else if ( w < 0.0 ) {

			v = clamp( dot( p1, v21 ) / dot( v21, v21 ), 0.0, 1.0 );
			w = 0.0;
			u = 1.0 - v;

		}

		return vec3f( w, u, v );

	}
`,Ft=h`
	// fn
	fn intersectRayTriangle( ray: ${v}, a: vec3f, b: vec3f, c: vec3f, threshold: f32 ) -> ${re} {

		const DET_EPSILON = 1e-15;

		var result: ${re};
		result.didHit = false;

		let edge1 = b - a;
		let edge2 = c - a;
		let n = cross( edge1, edge2 );

		let det = - dot( ray.direction, n );
		if ( abs( det ) < DET_EPSILON ) {

			return result;

		}

		let invdet = 1.0 / det;

		let AO = ray.origin - a;
		let DAO = cross( AO, ray.direction );

		let u = dot( edge2, DAO ) * invdet;
		if ( u < 0.0 || u > 1.0 ) {

			return result;

		}

		let v = - dot( edge1, DAO ) * invdet;
		if ( v < 0.0 || u + v > 1.0 ) {

			return result;

		}

		let t = dot( AO, n ) * invdet;
		let w = 1.0 - u - v;
		if ( t < threshold ) {

			return result;

		}

		result.didHit = true;
		result.barycoord = vec3f( w, u, v );
		result.dist = t;
		result.side = sign( det );
		result.normal = result.side * normalize( n );

		return result;

	}
`,ie=h`
	// fn
	fn ndcToCameraRay( ndc: vec2f, inverseModelViewProjection: mat4x4f ) -> ${v} {

		var homogeneous = vec4f();
		var ray: ${v};

		homogeneous = inverseModelViewProjection * vec4f( ndc, 0.0, 1.0 );
		ray.origin = homogeneous.xyz / homogeneous.w;

		homogeneous = inverseModelViewProjection * vec4f( ndc, 1.0, 1.0 );
		let toFarPlane = ( homogeneous.xyz / homogeneous.w ) - ray.origin;
		ray.maxDist = length( toFarPlane );
		ray.direction = toFarPlane / ray.maxDist;

		return ray;

	}
`;function wi(c){let{index:e,attributes:t,transforms:r}=c.storage,a=en(1).toVar(`bvh_rayScalar_${Math.random().toString(36).substring(2,7)}`);return c.getShapecastFn({name:"bvh_RaycastFirstHit",shapeStruct:v,resultStruct:re,boundsOrderFn:h`
			fn getBoundsOrder( ray: ${v}, splitAxis: u32, node: ${B} ) -> bool {

				return ray.direction[ splitAxis ] >= 0.0;

			}
		`,intersectsBoundsFn:h`
			fn rayIntersectsBounds( ray: ${v}, bounds: ${E}, result: ptr<function, ${re}> ) -> u32 {

				let boundsMin = vec3( bounds.min[0], bounds.min[1], bounds.min[2] );
				let boundsMax = vec3( bounds.max[0], bounds.max[1], bounds.max[2] );

				let invDir = 1.0 / ray.direction;
				let tMinPlane = ( boundsMin - ray.origin ) * invDir;
				let tMaxPlane = ( boundsMax - ray.origin ) * invDir;

				let tMinHit = vec3f(
					min( tMinPlane.x, tMaxPlane.x ),
					min( tMinPlane.y, tMaxPlane.y ),
					min( tMinPlane.z, tMaxPlane.z )
				);

				let tMaxHit = vec3f(
					max( tMinPlane.x, tMaxPlane.x ),
					max( tMinPlane.y, tMaxPlane.y ),
					max( tMinPlane.z, tMaxPlane.z )
				);

				let t0 = max( max( tMinHit.x, tMinHit.y ), tMinHit.z );
				let t1 = min( min( tMaxHit.x, tMaxHit.y ), tMaxHit.z );

				let dist = max( t0, 0.0 );
				if ( t1 < dist ) {

					return 0u;

				} else if ( ray.maxDist > 0.0 && dist * ${a} >= ray.maxDist ) {

					return 0u;

				} else if ( result.didHit && dist * ${a} >= result.dist ) {

					return 0u;

				} else {

					return 1u;

				}

			}

		`,intersectRangeFn:h`
			fn intersectRange( ray: ${v}, offset: u32, count: u32, result: ptr<function, ${re}> ) -> bool {

				var didHit = false;
				for ( var ti = offset; ti < offset + count; ti = ti + 1u ) {

					let i0 = ${e}[ ti * 3u ];
					let i1 = ${e}[ ti * 3u + 1u ];
					let i2 = ${e}[ ti * 3u + 2u ];

					let a = ${t}[ i0 ].position.xyz;
					let b = ${t}[ i1 ].position.xyz;
					let c = ${t}[ i2 ].position.xyz;

					var triResult = ${Ft}( ray, a, b, c, 0.0 );
					triResult.dist *= ${a};
					if ( triResult.didHit && ( ray.maxDist <= 0.0 || triResult.dist < ray.maxDist ) && ( ! result.didHit || triResult.dist < result.dist ) ) {

						result.didHit = true;
						result.dist = triResult.dist;
						result.normal = triResult.normal;
						result.side = triResult.side;
						result.barycoord = triResult.barycoord;
						result.indices = vec4u( i0, i1, i2, ti );

						didHit = true;

					}

				}

				return didHit;

			}
		`,transformShapeFn:h`
			fn transformRay( ray: ptr<function, ${v}>, objectIndex: u32 ) -> void {

				let toLocal = ${r}[ objectIndex ].inverseMatrixWorld;
				ray.origin = ( toLocal * vec4f( ray.origin, 1.0 ) ).xyz;
				ray.direction = ( toLocal * vec4f( ray.direction, 0.0 ) ).xyz;

				let len = length( ray.direction );
				ray.direction /= len;
				${a} = 1.0 / len;

			}
		`,transformResultFn:h`
			fn transformResult( hit: ptr<function, ${re}>, objectIndex: u32 ) -> void {

				let toLocal = ${r}[ objectIndex ].inverseMatrixWorld;
				hit.normal = normalize( ( transpose( toLocal ) * vec4f( hit.normal, 0.0 ) ).xyz );
				hit.objectIndex = objectIndex;

			}
		`,resetShapeFn:h`
			fn resetRayScalar( objectIndex: u32 ) -> void {

				${a} = 1.0;

			}
		`})}function Ti(c){let{storage:e,structs:t}=c,r=t.attributes.membersLayout.map(({name:a})=>`result.${a} = a0.${a} * barycoord.x + a1.${a} * barycoord.y + a2.${a} * barycoord.z;`).join(`
`);return h`
		// fn
		fn bvh_sampleTrianglePoint( barycoord: vec3f, indices: vec3u ) -> ${t.attributes} {

			var result: ${t.attributes};
			var a0 = ${e.attributes}[ indices.x ];
			var a1 = ${e.attributes}[ indices.y ];
			var a2 = ${e.attributes}[ indices.z ];
			${r}
			return result;

		}
	`}import{mat4 as tn}from"three/tsl";function Ii(c){let{index:e,attributes:t,transforms:r}=c.storage,a=tn().toVar("bvh_toWorldMat");return c.getShapecastFn({name:"bvh_ClosestPointToPoint",shapeStruct:"vec3f",resultStruct:et,boundsOrderFn:h`
			fn cppBoundsOrder( shape: vec3f, splitAxis: u32, node: ${B} ) -> bool {

				let toWorld = ${a};

				// get center
				let bMin = vec3f( node.bounds.min[ 0 ], node.bounds.min[ 1 ], node.bounds.min[ 2 ] );
				let bMax = vec3f( node.bounds.max[ 0 ], node.bounds.max[ 1 ], node.bounds.max[ 2 ] );
				let center = bMin * 0.5 + bMax * 0.5;

				// determine the order in world space
				let worldCenter = ( toWorld * vec4f( center, 1.0 ) ).xyz;
				let worldAxis = normalize( toWorld[ splitAxis ].xyz );
				return dot( shape - worldCenter, worldAxis ) <= 0.0;

			}
		`,intersectsBoundsFn:h`
			fn cppIntersectsBounds( shape: vec3f, bounds: ${E}, result: ptr<function, ${et}> ) -> u32 {

				// return 1u;
				// we need to check this no matter what if the result has not been found yet
				if ( ! result.found ) {

					return 1u;

				}

				let toWorld = ${a};

				// transform to world space
				let bMin = vec3f( bounds.min[ 0 ], bounds.min[ 1 ], bounds.min[ 2 ] );
				let bMax = vec3f( bounds.max[ 0 ], bounds.max[ 1 ], bounds.max[ 2 ] );
				let center = ( bMin + bMax ) * 0.5;
				let halfExtent = ( bMax - bMin ) * 0.5;
				let worldCenter = ( toWorld * vec4f( center, 1.0 ) ).xyz;
				let worldHalfExtent =
					abs( toWorld[ 0 ].xyz ) * halfExtent.x +
				    abs( toWorld[ 1 ].xyz ) * halfExtent.y +
				    abs( toWorld[ 2 ].xyz ) * halfExtent.z;
				let worldMin = worldCenter - worldHalfExtent;
				let worldMax = worldCenter + worldHalfExtent;

				// intersect if the distance to the bounds is not bigger than the already found
				let d = shape - clamp( shape, worldMin, worldMax );
				return select( 0u, 1u, dot( d, d ) < result.distanceSq );

			}
		`,intersectRangeFn:h`
			fn cppIntersectsRange( shape: vec3f, offset: u32, count: u32, result: ptr<function, ${et}> ) -> bool {

				var didHit = false;
				let toWorld = ${a};

				for ( var i = offset; i < offset + count; i ++ ) {

					// transform the triangle to world space
					let i0 = ${e}[ i * 3u + 0u ];
					let i1 = ${e}[ i * 3u + 1u ];
					let i2 = ${e}[ i * 3u + 2u ];
					let a = ( toWorld * vec4f( ${t}[ i0 ].position.xyz, 1.0 ) ).xyz;
					let b = ( toWorld * vec4f( ${t}[ i1 ].position.xyz, 1.0 ) ).xyz;
					let c = ( toWorld * vec4f( ${t}[ i2 ].position.xyz, 1.0 ) ).xyz;

					let barycoord = ${Si}( shape, a, b, c );
					let closestPoint = barycoord.x * a + barycoord.y * b + barycoord.z * c;
					let delta = shape - closestPoint;
					let distSq = dot( delta, delta );

					// copy the content over
					if ( ! result.found || distSq < result.distanceSq ) {

						let normal = normalize( cross( a - b, b - c ) );

						result.closestPoint = closestPoint;
						result.barycoord = barycoord;
						result.distanceSq = distSq;
						result.faceNormal = normal;
						result.side = sign( dot( normal, delta ) );
						result.faceIndices = vec4u( i0, i1, i2, i );
						result.found = true;
						didHit = true;

					}

				}

				return didHit;

			}
		`,resetShapeFn:h`
				fn cppResetShape( objectIndex: u32 ) -> void {

					// node bounds are transformed by "toWorld" during the bounds tests. Only the
					// object-local BLAS bounds need the object's world matrix - the top-level bounds
					// are already in world space - so restore identity before top-level traversal resumes.
					${a} = mat4x4f(
						1.0, 0.0, 0.0, 0.0,
						0.0, 1.0, 0.0, 0.0,
						0.0, 0.0, 1.0, 0.0,
						0.0, 0.0, 0.0, 1.0
					);

				}
			`,transformShapeFn:h`
			fn cppTransformShape( shape: ptr<function, vec3f>, objectIndex: u32 ) -> void {

				${a} = ${r}[ objectIndex ].matrixWorld;

			}
		`,transformResultFn:h`
			fn cppTransformResult( result: ptr<function, ${et}>, objectIndex: u32 ) -> void {

				result.objectIndex = objectIndex;

			}
		`})}import{Matrix4 as la,Box3 as rn}from"three";var st=24,sa=(1<<st)-1,Di=31-st,an=(1<<Di)-1,oa=new la,na=new rn,it=new la,$t=class extends Xa{constructor(e,t){super(),t={getBVH:(i,n)=>{throw new Error("ClusteredBVH: getBVH callback must be provided ")},shouldCluster:i=>i.isSkinnedMesh||i.isInstancedMesh||i.isBatchedMesh,primitiveLimit:64,matrixWorld:Array.isArray(e)?new la:e.matrixWorld,includeInstances:!0,_strictLeafSize:1,...t};let r=Array.from(_i(e)),a=Math.ceil(Math.log2(r.length)),s=(1<<a)-1;this.objects=r,this.getBVH=t.getBVH,this.shouldCluster=t.shouldCluster,this.includeInstances=t.includeInstances,this.primitiveLimit=t.primitiveLimit,this.matrixWorld=t.matrixWorld,this.bvhMap=new WeakMap,this.idBits=a,this.idMask=s,this.primitiveBufferStride=2,this.init(t)}init(e){let t=0,{objects:r,bvhMap:a,matrixWorld:s}=this;oa.copy(s).invert(),r.forEach(i=>{let n=[];for(let o=0,u=this._getInstanceCount(i);o<u;o++){let l=this.getBVH(i,o);n.push(l),l&&(t+=this.shouldCluster(i)?l._roots.length:this._countRelevantLeafNodes(l))}a.set(i,n)}),this.primitiveBuffer=new Uint32Array(t*2),this._fillPrimitiveBuffer(this.primitiveBuffer),super.init(e)}getRootRanges(){return[{offset:0,count:this.primitiveBuffer.length/this.primitiveBufferStride}]}refit(...e){oa.copy(this.matrixWorld).invert(),super.refit(...e)}writePrimitiveBounds(e,t,r){let{primitiveBuffer:a,bvhMap:s,objects:i}=this,n=a[2*e+0],o=a[2*e+1],u=i[this.getObjectId(n)],l=this.getInstanceId(n),f=s.get(u)[l],p=this.getBVHRootIndex(o),m=this.getBVHNodeIndex(o);u.isInstancedMesh||u.isBatchedMesh?(u.getMatrixAt(l,it),it.premultiply(u.matrixWorld)):it.copy(u.matrixWorld),it.premultiply(oa),Qa(m,new Float32Array(f._roots[p]),na),na.applyMatrix4(it);let{min:d,max:g}=na;t[r+0]=d.x,t[r+1]=d.y,t[r+2]=d.z,t[r+3]=g.x,t[r+4]=g.y,t[r+5]=g.z}getInstanceId(e){let{idMask:t,idBits:r}=this;return(e&~t)>>>r}getObjectId(e){let{idMask:t}=this;return e&t}getBVHRootIndex(e){return e>>>st}getBVHNodeIndex(e){return(e&sa)*8}_getInstanceCount(e){let{includeInstances:t}=this;return e.isInstancedMesh&&t?e.count:e.isBatchedMesh&&t?e.instanceCount:1}_fillPrimitiveBuffer(e){let{objects:t,bvhMap:r,idBits:a,primitiveLimit:s}=this,i=0,n=(o,u,l,f)=>{if(f>sa)throw new Error(`ClusteredBVH: cluster node index ${f} exceeds the ${st}-bit packing limit and cannot be represented.`);if(l>an)throw new Error(`ClusteredBVH: bvh root index ${l} exceeds the ${Di}-bit packing limit and cannot be represented.`);e[2*i+0]=o<<a|u,e[2*i+1]=l<<st|f&sa,i++};t.forEach((o,u)=>{r.get(o).forEach((l,f)=>{if(l)if(this.shouldCluster(o))for(let p=0,m=l._roots.length;p<m;p++)n(f,u,p,0);else Ri(l,s,(p,m)=>{n(f,u,p,m/8)})})})}_countRelevantLeafNodes(e){let{primitiveLimit:t}=this,r=0;return Ri(e,t,(a,s,i,n)=>{r++,n&&i>=t&&console.warn(`ClusteredBVH: a leaf node with ${i} primitives exceeds the cluster primitive limit of ${t} and cannot be subdivided further.`)}),r}};function Ri(c,e,t){let r=c._roots.length;for(let a=0;a<r;a++)_e.setBVH(c,a),_e.traverseBuffer((s,i,n)=>{let o=_e.getRangeStart(n),l=_e.getRangeEnd(n)-o;return l<e||i?(t(a,n,l,i),!0):!1});_e.reset()}function _i(c,e=new Set){return Array.isArray(c)?c.forEach(t=>_i(t,e)):c.traverse(t=>{t.isMesh&&e.add(t)}),e}var ge=new $i,Pt=new $i,nn={start:0,count:0,vertexStart:0,vertexCount:0};function ln(c){let e=c;for(;e;){if(e.visible===!1)return!1;e=e.parent}return!0}function Ci(c){return c._roots.reduce((e,t)=>e+t.byteLength,0)}function Fi(c,e){return`${c}_${e}`}var At=class{constructor(e,t={}){let{attributes:r={position:"vec4f"},autogenerateBvh:a=!0}=t;Array.isArray(e)||(e=[e]),e=e.map(s=>{if(s.isObject3D)return s;if(s.isBufferGeometry)return new Mt(s);if(s instanceof Kr){let i=new Mt;return i.geometry.boundsTree=s,i}}),this._bvhCache=new Map,this.autogenerateBvh=a,this.attributes=r,this.objects=e,this.bvh=null,this.storage=new ot,this.structs=new ot({transform:oi}),this.fns=new ot({raycastFirstHit:wi(this),closestPointToPoint:Ii(this),sampleTrianglePoint:null},w)}getRootObject(){let{objects:e}=this;if(e.isObject3D)return e;Array.isArray(e)||(e=[e]),e=e.map(r=>{if(r.isObject3D)return r;if(r.isBufferGeometry)return new Mt(r);if(r instanceof Kr){let a=new Mt;return a.geometry.boundsTree=r,a}});let t=new sn;return t.children=e,t}getShapecastFn(e){return bi(this,e)}update(){let e=this.getRootObject(),t=0;e.traverse(S=>{S.isMesh&&t++}),this.bvh=new $t(e,{strategy:2,getBVH:(S,Gr)=>this.getBVH(S,Gr,nn),primitiveLimit:t<3?1/0:64}),this.dispose();let{attributes:r,structs:a,bvh:s}=this,i=[],n=[],o=new Map,u=Ci(s),l=0,f=0,p=[],m=0,d=this._getTransformMap(s),{primitiveBuffer:g,primitiveBufferStride:x}=s;for(let S=0,Gr=g.length;S<Gr;S+=x){let Qr=g[S],Ua=g[S+1],Wo=s.objects[s.getObjectId(Qr)],Uo=s.getInstanceId(Qr),qa={start:0,count:0,vertexStart:0,vertexCount:0},Xe=this.getBVH(Wo,Uo,qa);if(!Xe)throw new Error("BVHComputeData: BVH not found.");let he=i.find(It=>It.bvh===Xe);he||(he={index:i.length,bvh:Xe,range:qa,geometryOffset:0},l+=he.range.count,f+=he.range.vertexCount,i.push(he));let Ye=s.getBVHRootIndex(Ua),Tt=s.getBVHNodeIndex(Ua)/8,Ga=`${he.index}_${Ye}_${Tt}`,Ze=o.get(Ga);if(Ze===void 0){let It=hi(Xe._roots[Ye],Tt);Ze={data:he,root:Ye,node:Tt,size:It,base:0},o.set(Ga,Ze),n.push(Ze),u+=It*32,m=Math.max(m,ea(Xe._roots[Ye],Tt))}p.push({transformSlot:d.get(Fi(Qr,Ye)).slot,subtree:Ze})}if(ea(s._roots[0])+m-1>at.value)throw new Error("BVHComputeData: BVH depth overruns the compute stack depth.");let D=Math.max(d.size,2);l=Math.max(l,2),f=Math.max(f,2);let y=new on(r,"bvh_GeometryStruct"),C=0,L=0,ce=new Uint32Array(l),ue=new ArrayBuffer(f*y.getLength()*4),de=new ArrayBuffer(u);i.forEach(S=>{S.geometryOffset=L/3,S.bvh.indirect||(S.geometryOffset-=S.range.start/3),mi(S.bvh,S.range,C,L,ce),gi(S.bvh,S.range,C,ue,y,this),L+=S.range.count,C+=S.range.vertexCount});let Y=Ci(s)/32;n.forEach(S=>{S.base=Y,pi(S.data.bvh._roots[S.root],S.node,S.size,S.data.geometryOffset,Y,de),Y+=S.size}),p.forEach(S=>S.nodeOffset=S.subtree.base),Jr(s,p,0,de);let wt=new ArrayBuffer(a.transform.getLength()*D*4),qr=Bt(new Nt(new Uint32Array(de),1),B).toReadOnly().setName("bvh_nodes"),ko=new Nt(new Uint32Array(wt),1),Ho=Bt(ko,a.transform).toReadOnly().setName("bvh_transforms"),Vo=Bt(new Nt(ce,1),"uint").toReadOnly().setName("bvh_index"),Oo=Bt(new Nt(new Uint32Array(ue),y.getLength()),y).toReadOnly().setName("bvh_attributes");this.storage.transforms=Ho,this.storage.nodes=qr,this.storage.index=Vo,this.storage.attributes=Oo,this.structs.attributes=y,Pt.copy(s.matrixWorld).invert(),d.forEach(S=>{this.writeTransformData(S,Pt,S.slot,wt)}),this.fns.sampleTrianglePoint=Ti(this),this._bvhCache.clear()}updateTransforms(){let{bvh:e,storage:t}=this;e.refit();let r=t.nodes.proxyNode.value;Jr(e,null,0,r.array.buffer),r.needsUpdate=!0;let a=t.transforms.proxyNode.value,s=a.array.buffer;Pt.copy(e.matrixWorld).invert(),this._getTransformMap(e).forEach(i=>{this.writeTransformData(i,Pt,i.slot,s)}),a.needsUpdate=!0}writeTransformData(e,t,r,a){let{structs:s}=this,i=new Float32Array(a),n=new Uint32Array(a),{object:o,instanceId:u}=e;o.isInstancedMesh||o.isBatchedMesh?(o.getMatrixAt(u,ge),ge.premultiply(o.matrixWorld)):ge.copy(o.matrixWorld),ge.premultiply(t),ge.toArray(i,r*s.transform.getLength()),ge.invert(),ge.toArray(i,r*s.transform.getLength()+16);let l=ln(o);o.isBatchedMesh&&(l=l&&o.getVisibleAt(u)),n[r*s.transform.getLength()+32]=l?1:0}getBVH(e,t,r){let{autogenerateBvh:a,_bvhCache:s}=this,i=null;if(e.boundsTree||e.isSkinnedMesh){let n=e.geometry;if(r.count=n.index?n.index.count:n.attributes.position.count,r.vertexCount=n.attributes.position.count,i=e.boundsTree||null,i===null&&a){let o=e.uuid;i=s.get(o)||new te(e),s.set(o,i)}}else if(e.isBatchedMesh){let n=e.getGeometryIdAt(t),o=e.getGeometryRangeAt(n);if(Object.assign(r,o),i=e.boundsTrees[n]||null,i===null&&a){let u=`batched_${e.geometry.uuid}_${o.start}_${o.count}`;i=s.get(u)||new fe(e.geometry,{range:{...r}}),s.set(u,i)}}else{let n=e.geometry;if(r.count=n.index?n.index.count:n.attributes.position.count,r.vertexCount=n.attributes.position.count,i=e.geometry.boundsTree||null,i===null&&a){let o=n.uuid;i=s.get(o)||new fe(n),s.set(o,i)}}return i}getDefaultAttributeValue(e,t){switch(e){case"position":case"color":t.set(1,1,1,1);break;default:t.set(0,0,0,0)}return t}dispose(){let{storage:e}=this;for(let t in e)e[t].value?.dispose()}_getTransformMap(e){let{primitiveBuffer:t,primitiveBufferStride:r}=e,a=new Map;for(let s=0,i=t.length;s<i;s+=r){let n=t[s],o=e.getBVHRootIndex(t[s+1]),u=Fi(n,o);if(a.has(u))continue;let l=a.size,f=e.objects[e.getObjectId(n)],p=e.getInstanceId(n);a.set(u,{object:f,instanceId:p,compositeId:n,root:o,slot:l})}return a}},ot=class{constructor(e={},t=R){let r={};return new Proxy({...e},{get(a,s){return r[s]||(r[s]=t(s,a)),r[s]},set(a,s,i){return a[s]=i,!0}})}};import{FullScreenQuad as Or}from"three/examples/jsm/postprocessing/Pass.js";import{MeshBasicNodeMaterial as cn,NoToneMapping as un,StorageTexture as Mi}from"three/webgpu";import{uv as dn,varying as hn,texture as Ni,vec4 as fn,toneMapping as pn,uniform as mn,wgslFn as gn}from"three/tsl";var Lt=gn(`
	fn sampleTexel( tex: texture_2d<f32>, coord: vec2f ) -> vec4f {

		// Manual bilinear filtering using textureLoad to support filterable float32 textures
		// on all devices
		let size = vec2f( textureDimensions( tex, 0 ) );

		// the path tracer stores its color rows top down
		let pxCoord = vec2f( coord.x, 1.0 - coord.y ) * size - 0.5;
		let px = vec2i( floor( pxCoord ) );
		let fr = fract( pxCoord );

		// get the four sibling samples
		let s00 = textureLoad( tex, clamp( px,                 vec2i( 0 ), vec2i( size ) - 1 ), 0 );
		let s10 = textureLoad( tex, clamp( px + vec2i( 1, 0 ), vec2i( 0 ), vec2i( size ) - 1 ), 0 );
		let s01 = textureLoad( tex, clamp( px + vec2i( 0, 1 ), vec2i( 0 ), vec2i( size ) - 1 ), 0 );
		let s11 = textureLoad( tex, clamp( px + vec2i( 1, 1 ), vec2i( 0 ), vec2i( size ) - 1 ), 0 );

		// interpolate on the x axis
		let y0 = mix( s00, s10, fr.x );
		let y1 = mix( s01, s11, fr.x );

		// then y
		return mix( y0, y1, fr.y );

	}
`),Et=class extends cn{get texture(){return this._texNode.value}set texture(e){this._texNode.value=e}get fromTexture(){return this._fromTexNode.value}set fromTexture(e){this._fromTexNode.value=e}get toneMapping(){return this._toneMapping.toneMapping}set toneMapping(e){this._toneMapping.setToneMapping(e)}get transition(){return this._transitionUniform.value}set transition(e){this._transitionUniform.value=e}get exposure(){return this._toneMapping.exposureNode.value}set exposure(e){this._toneMapping.exposureNode.value=e}constructor(e){super();let t=Ni(new Mi);this._texNode=t;let r=Ni(new Mi);this._fromTexNode=r;let a=hn(dn()),s=mn(1);this._transitionUniform=s;let i=h`
			fn fade( uv: vec2f ) -> vec4f {

				if ( ${s} <= 0.0 ) {

					return ${Lt}( ${r}, uv );

				} else if ( ${s} >= 1.0 ) {

					return ${Lt}( ${t}, uv );

				} else {

					let col0 = ${Lt}( ${r}, uv );
					let col1 = ${Lt}( ${t}, uv );
					return mix( col0, col1, ${s} );

				}

			}
		`,n=pn(un,1,i(a));this._toneMapping=n,this.transparent=!0,this.colorNode=fn(n.rgb,n.a),this.setValues(e)}};import{Matrix4 as Bi,StructTypeNode as xn}from"three/webgpu";import{uniform as $e,uint as vn,float as Pi}from"three/tsl";var ca=h`
	fn debugHeatColor( t: f32 ) -> vec3f {

		let r = clamp( 1.5 - abs( 4.0 * t - 3.0 ), 0.0, 1.0 );
		let g = clamp( 1.5 - abs( 4.0 * t - 2.0 ), 0.0, 1.0 );
		let b = clamp( 1.5 - abs( 4.0 * t - 1.0 ), 0.0, 1.0 );
		return vec3f( r, g, b );

	}
`,zt=new xn({tlasCount:"uint",blasCount:"uint",didHit:"bool",dist:"float"},"DebugBoundsResult");function Ai(c){let{transforms:e,index:t,attributes:r,materials:a}=c.storage,s=$e(new Bi),i=$e(new Bi),n=$e(1),o=$e(1),u=$e(0),l=$e(64),f=vn(0).toVar("bvh_debugBoundsLevel"),p=Pi(1).toVar("bvh_debugRayScalar"),m=Pi(0).toVar("bvh_debugMaterialSide"),d=h`
		fn debugGetBoundsOrder( ray: ${v}, splitAxis: u32, node: ${B} ) -> bool {

			return ray.direction[ splitAxis ] >= 0.0;

		}
	`,g=h`
		fn debugIntersectsBounds( ray: ${v}, bounds: ${E}, result: ptr<function, ${zt}> ) -> u32 {

			let boundsMin = vec3( bounds.min[ 0 ], bounds.min[ 1 ], bounds.min[ 2 ] );
			let boundsMax = vec3( bounds.max[ 0 ], bounds.max[ 1 ], bounds.max[ 2 ] );

			let invDir = 1.0 / ray.direction;
			let tMinPlane = ( boundsMin - ray.origin ) * invDir;
			let tMaxPlane = ( boundsMax - ray.origin ) * invDir;

			let tMinHit = min( tMinPlane, tMaxPlane );
			let tMaxHit = max( tMinPlane, tMaxPlane );

			let t0 = max( max( tMinHit.x, tMinHit.y ), tMinHit.z );
			let t1 = min( min( tMaxHit.x, tMaxHit.y ), tMaxHit.z );

			let dist = max( t0, 0.0 );
			if ( t1 < dist ) {

				return 0u;

			} else if ( result.didHit && dist * ${p} >= result.dist ) {

				return 0u;

			}

			if ( ${f} == 1u ) {

				result.blasCount = result.blasCount + 1u;

			} else {

				result.tlasCount = result.tlasCount + 1u;

			}

			return 1u;

		}
	`,x=h`
		fn debugIntersectRange( ray: ${v}, offset: u32, count: u32, result: ptr<function, ${zt}> ) -> bool {

			var didHit = false;
			if ( ${u} > 0.5 ) {

				for ( var ti = offset; ti < offset + count; ti = ti + 1u ) {

					let i0 = ${t}[ ti * 3u ];
					let i1 = ${t}[ ti * 3u + 1u ];
					let i2 = ${t}[ ti * 3u + 2u ];

					let a = ${r}[ i0 ].position.xyz;
					let b = ${r}[ i1 ].position.xyz;
					let c = ${r}[ i2 ].position.xyz;

					var triResult = ${Yr}( ray, a, b, c );
					triResult.dist *= ${p};
					if ( triResult.didHit && ( ! result.didHit || triResult.dist < result.dist ) ) {

						// cull faces that don't match the material side
						if ( ${m} != 0.0 && triResult.side != ${m} ) {

							continue;

						}

						result.didHit = true;
						result.dist = triResult.dist;
						didHit = true;

					}

				}

			}

			return didHit;

		}
	`,I=h`
		fn debugTransformRay( ray: ptr<function, ${v}>, objectIndex: u32 ) -> void {

			let object = ${e}[ objectIndex ];
			let toLocal = object.inverseMatrixWorld;
			ray.origin = ( toLocal * vec4f( ray.origin, 1.0 ) ).xyz;
			ray.direction = ( toLocal * vec4f( ray.direction, 0.0 ) ).xyz;

			let len = length( ray.direction );
			ray.direction = ray.direction / len;
			${p} = 1.0 / len;

			${m} = ${a}[ object.materialIndex ].side;
			${f} = 1u;

		}
	`,b=h`
		fn debugResetLevel( objectIndex: u32 ) -> void {

			${p} = 1.0;
			${f} = 0u;

		}
	`,D=c.getShapecastFn({name:"debugBoundsCount",shapeStruct:v,resultStruct:zt,boundsOrderFn:d,intersectsBoundsFn:g,intersectRangeFn:x,transformShapeFn:I,resetShapeFn:b}),y=h`
		fn debugBounds( vUv: vec2f ) -> vec4f {

			let ndc = vUv * 2.0 - vec2f( 1.0 );
			var ray = ${ie}( ndc, ${s} * ${i} );
			ray.direction = normalize( ray.direction );

			// count the boxes the ray crosses, pruning those behind the nearest hit surface
			var result: ${zt};
			${D}( ray, &result );

			let tlas = select( 0u, result.tlasCount, ${n} > 0.5 );
			let blas = select( 0u, result.blasCount, ${o} > 0.5 );
			let count = tlas + blas;

			let t = clamp( f32( count ) / max( ${l}, 1.0 ), 0.0, 1.0 );

			return vec4f( ${ca}( t ), 1.0 );

		}
	`;return y.uniforms={cameraToModelMatrix:s,inverseProjectionMatrix:i,displayTLAS:n,displayBLAS:o,stopAtSurface:u,saturationCount:l},y}import{Matrix4 as Ms,Vector2 as Ns}from"three/webgpu";import{DataTexture as xs,Vector2 as vs,StorageTexture as _a}from"three/webgpu";var _=class{get computeNode(){return this.kernel.computeNode}get workgroupSize(){return this.kernel.workgroupSize}set needsUpdate(e){this.setWorkgroupSize(...this.workgroupSize)}constructor(e,t={}){let{workgroupSize:r=[64],context:a={}}=t;this._fn=e,this.kernel=null,this.context=a,this.setWorkgroupSize(...r)}defineUniformAccessors(e){for(let t in e){if(t in this)throw new Error(`ComputeNode: Uniform name ${t} is already defined.`);"value"in e[t]&&Object.defineProperty(this,t,{get(){return e[t].value},set(a){e[t].value=a}})}}setWorkgroupSize(e=64,t=1,r=1){let a=this._fn.context(this.context);return a.parameters=this._fn.parameters,this.kernel?.dispose(),this.kernel=a.computeKernel([e,t,r]),this}dispose(){this.kernel?.dispose(),this.kernel=null}getDispatchSize(e=1,t=1,r=1,a=[]){let[s,i,n]=this.workgroupSize;return a.length=3,a[0]=Math.ceil(e/s),a[1]=Math.ceil(t/i),a[2]=Math.ceil(r/n),a}};import{texture as Xn,sampler as Yn,uniform as W,globalId as Zn,textureStore as Ca}from"three/tsl";var Ot={};jr(Ot,{rand1:()=>da,rand2:()=>ha,rand3:()=>fa,rand4:()=>lt,rngInit:()=>ct,rngNextBounce:()=>ut});import{uint as Ht,float as yn,wgsl as bn,wgslFn as nt}from"three/tsl";var Li=Ht(256*256),zi=yn(1/16777216),Sn=bn(`

	const SOBOL_DIRECTIONS_1 = array<u32, 32>(
		0x80000000u, 0xc0000000u, 0xa0000000u, 0xf0000000u,
		0x88000000u, 0xcc000000u, 0xaa000000u, 0xff000000u,
		0x80800000u, 0xc0c00000u, 0xa0a00000u, 0xf0f00000u,
		0x88880000u, 0xcccc0000u, 0xaaaa0000u, 0xffff0000u,
		0x80008000u, 0xc000c000u, 0xa000a000u, 0xf000f000u,
		0x88008800u, 0xcc00cc00u, 0xaa00aa00u, 0xff00ff00u,
		0x80808080u, 0xc0c0c0c0u, 0xa0a0a0a0u, 0xf0f0f0f0u,
		0x88888888u, 0xccccccccu, 0xaaaaaaaau, 0xffffffffu
	);

	const SOBOL_DIRECTIONS_2 = array<u32, 32>(
		0x80000000u, 0xc0000000u, 0x60000000u, 0x90000000u,
		0xe8000000u, 0x5c000000u, 0x8e000000u, 0xc5000000u,
		0x68800000u, 0x9cc00000u, 0xee600000u, 0x55900000u,
		0x80680000u, 0xc09c0000u, 0x60ee0000u, 0x90550000u,
		0xe8808000u, 0x5cc0c000u, 0x8e606000u, 0xc5909000u,
		0x6868e800u, 0x9c9c5c00u, 0xeeee8e00u, 0x5555c500u,
		0x8000e880u, 0xc0005cc0u, 0x60008e60u, 0x9000c590u,
		0xe8006868u, 0x5c009c9cu, 0x8e00eeeeu, 0xc5005555u
	);

	const SOBOL_DIRECTIONS_3 = array<u32, 32>(
		0x80000000u, 0xc0000000u, 0x20000000u, 0x50000000u,
		0xf8000000u, 0x74000000u, 0xa2000000u, 0x93000000u,
		0xd8800000u, 0x25400000u, 0x59e00000u, 0xe6d00000u,
		0x78080000u, 0xb40c0000u, 0x82020000u, 0xc3050000u,
		0x208f8000u, 0x51474000u, 0xfbea2000u, 0x75d93000u,
		0xa0858800u, 0x914e5400u, 0xdbe79e00u, 0x25db6d00u,
		0x58800080u, 0xe54000c0u, 0x79e00020u, 0xb6d00050u,
		0x800800f8u, 0xc00c0074u, 0x200200a2u, 0x50050093u
	);

	const SOBOL_DIRECTIONS_4 = array<u32, 32>(
		0x80000000u, 0x40000000u, 0x20000000u, 0xb0000000u,
		0xf8000000u, 0xdc000000u, 0x7a000000u, 0x9d000000u,
		0x5a800000u, 0x2fc00000u, 0xa1600000u, 0xf0b00000u,
		0xda880000u, 0x6fc40000u, 0x81620000u, 0x40bb0000u,
		0x22878000u, 0xb3c9c000u, 0xfb65a000u, 0xddb2d000u,
		0x78022800u, 0x9c0b3c00u, 0x5a0fb600u, 0x2d0ddb00u,
		0xa2878080u, 0xf3c9c040u, 0xdb65a020u, 0x6db2d0b0u,
		0x800228f8u, 0x400b3cdcu, 0x200fb67au, 0xb00ddb9du
	);

`),ki=Ht(0).toVar("sobolPixelIndex"),Hi=Ht(0).toVar("sobolPathIndex"),ua=Ht(0).toVar("sobolBounceIndex"),kt=nt(`
	fn getMaskedSobol( index: u32, directions: array<u32, 32> ) -> u32 {

		var X = 0u;
		for ( var bit = 0u; bit < 32u; bit ++ ) {

			let mask = ( index >> bit ) & 1u;
			X ^= mask * directions[ bit ];

		}
		return X;

	}
`),wn=(c=1)=>{if(c<=0)return;let e=c>1?`vec${c}u`:"u32",t=nt(`
		fn sobolReverseBits_${e}( in: ${e} ) -> ${e} {

			var x = in;
			x = ( ( ( x & ${e}( 0xaaaaaaaau ) ) >> ${e}( 1 ) ) | ( ( x & ${e}( 0x55555555u ) ) << ${e}( 1 ) ) );
			x = ( ( ( x & ${e}( 0xccccccccu ) ) >> ${e}( 2 ) ) | ( ( x & ${e}( 0x33333333u ) ) << ${e}( 2 ) ) );
			x = ( ( ( x & ${e}( 0xf0f0f0f0u ) ) >> ${e}( 4 ) ) | ( ( x & ${e}( 0x0f0f0f0fu ) ) << ${e}( 4 ) ) );
			x = ( ( ( x & ${e}( 0xff00ff00u ) ) >> ${e}( 8 ) ) | ( ( x & ${e}( 0x00ff00ffu ) ) << ${e}( 8 ) ) );
			return ( ( x >> ${e}( 16 ) ) | ( x << ${e}( 16 ) ) );

		}
	`),r=nt(`
		fn sobolHashCombine_${e}( seed: u32, v: ${e} ) -> ${e} {

			return ${e}( seed ) ^ ( v + ${e}( ( seed << 6 ) + ( seed >> 2 ) ) );

		}
	`),a=nt(`
		fn sobolLaineKarrasPermutation_${e}( in: ${e}, seed: ${e} ) -> ${e} {

			var x = in;
			x += seed;
			x ^= x * 0x6c50b47cu;
			x ^= x * 0xb82f1e52u;
			x ^= x * 0xc7afe638u;
			x ^= x * 0x8d22f6e6u;
			return x;

		}
	`),s=h`
		fn nestedUniformScrambleBase2_${e}( x: ${e}, seed: ${e} ) -> ${e} {

			var res = ${a}( x, seed );
			res = ${t}( res );
			return res;

		}
	`;return{reverseBits:t,hashCombine:r,lkPermutation:a,scramble:s}},H=Array.from({length:5},(c,e)=>wn(e)),Tn=h`
  	${[Sn]}
	fn generateSobolPoint( id: u32 ) -> vec4f {

		var index = id;
		if ( index >= ${Li} ) {

			index = index % ${Li};
			// return vec4( 0.0 );

		}

		// NOTE: this sobol "direction" is also available but we can't write out 5 components
		// uint x = index & 0x00ffffffu;
		let x = ${H[1].reverseBits}( ${kt}( index, SOBOL_DIRECTIONS_1 ) ) & 0x00ffffffu;
		let y = ${H[1].reverseBits}( ${kt}( index, SOBOL_DIRECTIONS_2 ) ) & 0x00ffffffu;
		let z = ${H[1].reverseBits}( ${kt}( index, SOBOL_DIRECTIONS_3 ) ) & 0x00ffffffu;
		let w = ${H[1].reverseBits}( ${kt}( index, SOBOL_DIRECTIONS_4 ) ) & 0x00ffffffu;

		return vec4( f32( x ), f32( y ), f32( z ), f32( w ) ) * ${zi};

	}
`,Ei=nt(`
	fn sobolHash( in: u32 ) -> u32 {

		var x = in;
		// finalizer from murmurhash3
		x ^= x >> 16;
		x *= 0x85ebca6bu;
		x ^= x >> 13;
		x *= 0xc2b2ae35u;
		x ^= x >> 16;
		return x;

	}
`),In=h`
	fn sobolGetSeed( effect: u32 ) -> u32 {

		return ${Ei}(
			${H[1].hashCombine}(
				${H[1].hashCombine}(
					${Ei}( ${ua} ),
					${ki}
				),
				effect
			)
		);

	}
`,Vt=(c=1,e=Tn)=>{if(c<=0)return;let t=c>1?`vec${c}u`:"u32",r=c>1?`vec${c}f`:"f32",a=".r",s="1u";return c===2?(a=".rg",s="vec2( 1u, 2u )"):c===3?(a=".rgb",s="vec3( 1u, 2u, 3u )"):c===4&&(a="",s="vec4( 1u, 2u, 3u, 4u )"),h`
		fn sobol${c}( effect: u32 ) -> ${r} {

			let seed = ${In}( effect );
			let index = ${Hi};

			let shuffle_seed = ${H[1].hashCombine}( seed, 0u );
			let shuffled_index = ${H[1].scramble}( ${H[1].reverseBits}( index ), shuffle_seed );
			let sobol_pt = ${e}( shuffled_index )${a};
			var result = ${t}( sobol_pt * 16777216.0 );

			let seed2 = ${H[c].hashCombine}( seed, ${s} );
			result = ${H[c].scramble}( result, seed2 );

			return ${zi} * ${r}( result >> ${t}( 8 ) );

		}
	`},da=Vt(1),ha=Vt(2),fa=Vt(3),lt=Vt(4),ct=h`
	fn sobolInit( pixel: vec2u, pathIndex: u32, bounceIndex: u32 ) -> void {

		${ki} = ( pixel.x << 16 ) | pixel.y;
		${Hi} = pathIndex;
		${ua} = bounceIndex;

	}
`,ut=h`
	fn sobolNextBounce() -> void {

		${ua}++;

	}
`;var Wt=0,Ut=1,Vi=2,qt=3,Oi=4,Gt=5,Qt=6,jt=7,Kt=50,V=pe("random.rngInit",ct),pa=pe("random.rngNextBounce",ut),q=pe("random.rand1",da),O=pe("random.rand2",ha),Me=pe("random.rand3",fa),eh=pe("random.rand4",lt);import{wgslFn as j}from"three/tsl";import{wgsl as Rn}from"three/tsl";import{StructTypeNode as G}from"three/webgpu";var T=Rn(`

	const PI: f32 = 3.141592653589793;
	const EPSILON: f32 = 1e-5;
	const MIN_ROUGHNESS: f32 = 1e-3;
	const MIN_INCIDENT_COS: f32 = 1e-3;

`),J=new G({color:"vec3f",isTransmissive:"bool",direction:"vec3f",pdf:"float"},"ScatterRecord"),ma=new G({reflectance:"vec3f",transmittance:"vec3f",reflectProbability:"float"},"TransmissionFresnel"),Wi=new G({color:"vec3",map:"int",metalness:"float",metalnessMap:"int",roughness:"float",roughnessMap:"int",ior:"float",transmission:"float",transmissionMap:"int",emissiveIntensity:"float",emissive:"vec3",emissiveMap:"int",normalMap:"int",normalScale:"vec2",clearcoat:"float",clearcoatMap:"int",clearcoatNormalMap:"int",clearcoatNormalScale:"vec2",clearcoatRoughness:"float",clearcoatRoughnessMap:"int",iridescenceMap:"int",iridescenceThicknessMap:"int",iridescence:"float",iridescenceIor:"float",iridescenceThicknessMinimum:"float",iridescenceThicknessMaximum:"float",diffuseRoughness:"float",dispersion:"float",specularColor:"vec3",specularColorMap:"int",specularIntensity:"float",specularIntensityMap:"int",thinWall:"int",attenuationColor:"vec3",attenuationDistance:"float",alphaMap:"int",castShadow:"int",opacity:"float",alphaTest:"float",side:"float",matte:"int",sheen:"float",sheenColor:"vec3",sheenColorMap:"int",sheenRoughness:"float",sheenRoughnessMap:"int",vertexColors:"int",flatShading:"int",transparent:"int",fogVolume:"int",anisotropy:"float",anisotropyRotation:"float",anisotropyMap:"int",mapTransform:"mat3",metalnessMapTransform:"mat3",roughnessMapTransform:"mat3",transmissionMapTransform:"mat3",emissiveMapTransform:"mat3",normalMapTransform:"mat3",clearcoatMapTransform:"mat3",clearcoatNormalMapTransform:"mat3",clearcoatRoughnessMapTransform:"mat3",sheenColorMapTransform:"mat3",sheenRoughnessMapTransform:"mat3",iridescenceMapTransform:"mat3",iridescenceThicknessMapTransform:"mat3",specularColorMapTransform:"mat3",specularIntensityMapTransform:"mat3",alphaMapTransform:"mat3",anisotropyMapTransform:"mat3"},"Material"),M=new G({volumeParticle:"bool",faceNormal:"vec3f",frontFace:"bool",normal:"vec3f",normalBasis:"mat3x3f",normalInvBasis:"mat3x3f",eta:"f32",f0:"f32",roughness:"f32",diffuseRoughness:"f32",metalness:"f32",anisotropy:"f32",color:"vec3f",emission:"vec3f",opacity:"f32",ior:"f32",transmission:"f32",thinWall:"bool",attenuationColor:"vec3f",attenuationDistance:" f32",clearcoatNormal:"vec3f",clearcoatBasis:"mat3x3f",clearcoatInvBasis:"mat3x3f",clearcoat:"f32",clearcoatRoughness:"f32",sheen:"f32",sheenColor:"vec3f",sheenRoughness:"f32",iridescence:"f32",iridescenceIor:"f32",iridescenceThickness:"f32",specularColor:"vec3f",specularIntensity:"f32"},"SurfaceRecord"),ih=new G({rotation:"mat3x3f",intensity:"float",blur:"float",totalSum:"float"},"EnvironmentInfo"),ga=new G({color:"vec3f",direction:"vec3f",pdf:"float"},"EnvironmentSample"),ee=new G({position:"vec3f",lightType:"int",color:"vec3f",intensity:"float",u:"vec3f",visibleToCameraRays:"int",v:"vec3f",area:"float",radius:"float",decay:"float",distance:"float",coneCos:"float",penumbraCos:"float",iesProfile:"int"},"Light"),P=new G({dist:"float",direction:"vec3f",pdf:"float",emission:"vec3f",lightType:"int"},"LightRecord"),Ui=new G({diffuse:"float",specular:"float",transmission:"float",clearcoat:"float"},"LobeWeights"),xa=new G({V:"vec3f",L:"vec3f",H:"vec3f",VdotH:"float"},"BxDFContext");import{wgslFn as F}from"three/tsl";var Gi=F(`

	fn inverse(m: mat3x3f) -> mat3x3f {
		var adj: mat3x3f;
		adj[0][0] =   (m[1][1] * m[2][2] - m[2][1] * m[1][2]);
		adj[1][0] = - (m[1][0] * m[2][2] - m[2][0] * m[1][2]);
		adj[2][0] =   (m[1][0] * m[2][1] - m[2][0] * m[1][1]);
		adj[0][1] = - (m[0][1] * m[2][2] - m[2][1] * m[0][2]);
		adj[1][1] =   (m[0][0] * m[2][2] - m[2][0] * m[0][2]);
		adj[2][1] = - (m[0][0] * m[2][1] - m[2][0] * m[0][1]);
		adj[0][2] =   (m[0][1] * m[1][2] - m[1][1] * m[0][2]);
		adj[1][2] = - (m[0][0] * m[1][2] - m[1][0] * m[0][2]);
		adj[2][2] =   (m[0][0] * m[1][1] - m[1][0] * m[0][1]);

		let det = ( m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
			- m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
			+ m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]));

		return adj * ( 1.0 / det );
	}

`),Qi=F(`

	fn getBasisFromNormal( normal: vec3f ) -> mat3x3f {

		var other: vec3f;
		if ( abs( normal.x ) > 0.5 ) {

			other = vec3f( 0.0, 1.0, 0.0 );

		} else {

			other = vec3f( 1.0, 0.0, 0.0 );

		}

		let ortho = normalize( cross( normal, other ) );
		let ortho2 = normalize( cross( normal, ortho ) );
		return mat3x3f( ortho2, ortho, normal );

	}

`),A=F(`

	fn iorToF0( ior: f32 ) -> f32 {
		return pow( ( 1 - ior ) / ( 1 + ior ), 2 );
	}

`),ji=F(`

	fn iorToF0General( transmittedIor: f32, incidentIor: f32 ) -> f32 {

		return pow( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ), 2 );

	}

`),Ki=F(`

	fn iorToF0GeneralVec( transmittedIor: vec3f, incidentIor: vec3f ) -> vec3f {

		let v = ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor );
		return v * v;

	}

`),Xi=F(`

	fn fresnel0ToIor( f0: vec3f ) -> vec3f {

		let sqrtF0 = sqrt( f0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );

	}

`),Q=F(`

	fn schlickFresnel( cosine: f32, f0: f32 ) -> f32 {

		return f0 + ( 1.0 - f0 ) * pow( 1.0 - cosine, 5.0 );

	}

`),Ne=F(`

	fn schlickFresnelVec( cosine: f32, f0: vec3f, f90: vec3f ) -> vec3f {

		return f0 + ( f90 - f0 ) * pow( 1.0 - cosine, 5.0 );

	}

`),Yt=F(`

	fn totalInternalReflection( cosTheta: f32, eta: f32 ) -> bool {

		let sinTheta = sqrt( 1.0 - cosTheta * cosTheta );
		return eta * sinTheta > 1.0;

	}

`),Yi=F(`

	fn totalInternalReflectionVec( cosTheta: f32, eta: vec3f ) -> vec3<bool> {

		let sinTheta = sqrt( 1.0 - cosTheta * cosTheta );
		return eta * sinTheta > vec3f( 1.0 );

	}

`),ch=F(`

	fn evaluateFresnel( cosine: f32, eta: f32, f0: vec3f, f90: vec3f ) -> vec3f {

		if ( totalInternalReflection( cosine, eta ) ) {

			return f90;

		}

		return f0 + ( f90 - f0 ) * pow( 1.0 - cosine, 5.0 );
	}

`,[Yt]),xe=F(`

	fn dielectricFresnel( cosThetaI: f32, eta: f32 ) -> f32 {

		// https://schuttejoe.github.io/post/disneybsdf/
		let ni = eta;
		let nt = 1.0;

		// Check for total internal reflection
		let sinThetaISq = 1.0 - cosThetaI * cosThetaI;
		let sinThetaTSq = eta * eta * sinThetaISq;
		if ( sinThetaTSq >= 1.0 ) {

			return 1.0;

		}

		let sinThetaT = sqrt( sinThetaTSq );
		let cosThetaT = sqrt( max( 0.0, 1.0 - sinThetaT * sinThetaT ) );
		let rParallel = ( ( nt * cosThetaI ) - ( ni * cosThetaT ) ) / ( ( nt * cosThetaI ) + ( ni * cosThetaT ) );
		let rPerpendicular = ( ( ni * cosThetaI ) - ( nt * cosThetaT ) ) / ( ( ni * cosThetaI ) + ( nt * cosThetaT ) );
		return ( rParallel * rParallel + rPerpendicular * rPerpendicular ) / 2.0;

	}

`),Zi=F(`

	fn disneyFresnel( wo: vec3f, wi: vec3f, wh: vec3f, f0: f32, eta: f32, metalness: f32 ) -> f32 {

		let dotHV = dot( wo, wh );
		if ( totalInternalReflection( dotHV, eta ) ) {

			return 1.0;

		}

		let dotHL = dot( wi, wh );
		let dielectricF = dielectricFresnel( abs( dotHV ), eta );
		let metallicF = schlickFresnel( dotHL, f0 );

		return mix( dielectricF, metallicF, metalness );

	}

`,[Yt,xe,Q]),Be=F(`

	fn isTerminatingScatter( scatterRec: ScatterRecord ) -> bool {

		return scatterRec.pdf <= 0;

	}

`,[J]),$=F(`

	fn clampPathContribution( contribution: vec3f, pathDepth: u32, clampDirect: f32, clampIndirect: f32 ) -> vec3f {

		let limit = select( clampIndirect, clampDirect, pathDepth <= 1u ) * 3.0;
		if ( limit <= 0.0 ) {

			return contribution;

		}

		let strength = dot( abs( contribution ), vec3f( 1.0 ) );
		if ( strength > limit ) {

			return contribution * ( limit / strength );

		}

		return contribution;

	}

`),qi=F(`

	fn applyWrap( v: f32, wrapMode: i32 ) -> f32 {

		var res = v;
		if ( wrapMode == 1 ) {

			// ClampToEdge
			res = clamp( res, 0.0, 1.0 );

		} else if ( wrapMode == 2 ) {

			// MirroredRepeat
			res = 1.0 - abs( 2.0 * fract( res * 0.5 ) - 1.0 );

		} else {

			// Repeat
			res = fract( res );

		}

		return res;

	}

`),se=F(`

	fn offsetRayOrigin( point: vec3f, direction: vec3f, geometricNormal: vec3f ) -> vec3f {

		let normal = normalize( select( -geometricNormal, geometricNormal, dot( direction, geometricNormal ) >= 0.0 ) );
		let intScale = 256.0;
		let integerOffset = vec3i( intScale * normal );
		let pointBits = bitcast<vec3i>( point );
		let signedOffset = select( integerOffset, -integerOffset, point < vec3f( 0.0 ) );
		let offsetPoint = bitcast<vec3f>( pointBits + signedOffset );
		let origin = 1.0 / 32.0;
		let floatScale = 1.0 / 65536.0;
		return select( offsetPoint, point + floatScale * normal, abs( point ) < vec3f( origin ) );

	}

`),Xt=F(`

	fn wrapTexelIndex( i: i32, size: i32, wrapMode: i32 ) -> i32 {

		if ( wrapMode == 0 ) {

			// Repeat wraps to the opposite edge
			return ( ( i % size ) + size ) % size;

		}

		// ClampToEdge and MirroredRepeat both fold back onto the edge texel
		return clamp( i, 0, size - 1 );

	}

`),Zt=(c,e,t="sampleTexel")=>h`

	fn ${t}( uv: vec2f, packed: i32, lod: f32 ) -> vec4f {

		let texIndex = packed & 0x7FFFFF;
		let wrapS    = ( packed >> 26 ) & 0x3;
		let wrapT    = ( packed >> 28 ) & 0x3;
		let nearest  = ( packed >> 30 ) & 0x1;

		// look up the texture's rect and page within the atlas. three wraps a
		// uniformArray in a struct ( textureInfoStruct ) with a "value" array member.
		let info   = ${c}[ u32( texIndex ) ];
		let offset = vec2f( vec2u( info.x & 0xFFFFu, info.x >> 16u ) );
		let size   = vec2f( vec2u( info.y & 0xFFFFu, info.y >> 16u ) );
		let page   = i32( info.z & 0xFFFFu );

		// wrap is applied on the logical uv first, then remapped into the tile
		let wrappedUv = vec2f(
			${qi}( uv.x, wrapS ),
			${qi}( uv.y, wrapT ),
		);

		if ( nearest == 1 ) {

			let tileTexel = clamp( vec2i( wrappedUv * size ), vec2i( 0 ), vec2i( size ) - vec2i( 1 ) );
			return textureLoad( ${e}, vec2i( offset ) + tileTexel, page, 0 );

		} else {

			// The tile's neighbors in the atlas are unrelated textures, so hardware
			// filtering cannot supply the taps that fall outside it. Filter here instead
			// and resolve each tap through the wrap mode.
			let texelPos = wrappedUv * size - vec2f( 0.5 );
			let basePos = floor( texelPos );
			let base = vec2i( basePos );
			let f = texelPos - basePos;

			let intSize = vec2i( size );
			let x0 = ${Xt}( base.x,     intSize.x, wrapS );
			let x1 = ${Xt}( base.x + 1, intSize.x, wrapS );
			let y0 = ${Xt}( base.y,     intSize.y, wrapT );
			let y1 = ${Xt}( base.y + 1, intSize.y, wrapT );

			let tile = vec2i( offset );
			let c00 = textureLoad( ${e}, tile + vec2i( x0, y0 ), page, 0 );
			let c10 = textureLoad( ${e}, tile + vec2i( x1, y0 ), page, 0 );
			let c01 = textureLoad( ${e}, tile + vec2i( x0, y1 ), page, 0 );
			let c11 = textureLoad( ${e}, tile + vec2i( x1, y1 ), page, 0 );

			return mix(
				mix( c00, c10, f.x ),
				mix( c01, c11, f.x ),
				f.y,
			);

		}

	}
`;var Dn=j(`

	fn sampleSphere( uv: vec2f ) -> vec3f {

		let u = ( uv.x - 0.5 ) * 2.0;
		let t = uv.y * PI * 2.0;
		let f = sqrt( 1.0 - u * u );

		return vec3f( f * cos( t ), f * sin( t ), u );

	}

`,[T]),Ji=j(`

	fn diffuseDirection( wo: vec3f, uv: vec2f ) -> vec3f {

		var lightDirection = sampleSphere( uv );
		lightDirection.z += 1.0;
		lightDirection = normalize( lightDirection );

		return lightDirection;

	}

`,[Dn]),va=j(`

	fn getLobeWeights( wo: vec3f, wi: vec3f, woClearcoat: vec3f, wh: vec3f, clearcoatIor: f32, surf: SurfaceRecord ) -> LobeWeights {

		var weights: LobeWeights;
		var remaining = 1.0;

		let clearcoatF0 = iorToF0( clearcoatIor );
		let clearcoatFresnel = schlickFresnel( saturate( woClearcoat.z ), clearcoatF0 );
		weights.clearcoat = surf.clearcoat * clearcoatFresnel;
		remaining -= weights.clearcoat;

		// this specular lobe only handles the opaque portion of the specular
		let fEstimate = disneyFresnel( wo, wi, wh, surf.f0, surf.eta, surf.metalness );
		weights.specular = remaining * ( surf.metalness + ( 1.0 - surf.metalness ) * ( 1.0 - surf.transmission ) * fEstimate );
		remaining -= weights.specular;

		// the transmission lobe covers both the reflected and refracted halves of the transmissive portion
		weights.transmission = remaining * surf.transmission;
		remaining -= weights.transmission;

		weights.diffuse = remaining;

		return weights;

	}

`,[Zi,Q,A,Ui,T]),Pe=j(`

	fn equirectDirectionToUv(direction: vec3f) -> vec2f {

		// from Spherical.setFromCartesianCoords
		var uv = vec2f( atan2( direction.z, direction.x ), acos( direction.y ) );
		uv /= vec2f( 2.0 * PI, PI );

		// apply adjustments to get values in range [0, 1] and y right side up
		uv.x += 0.5;
		uv.y = 1.0 - uv.y;
		return uv;

	}

`),es=j(`

	fn sampleHemisphere( n: vec3f, uv: vec2f ) -> vec3f {

		// https://www.rorydriscoll.com/2009/01/07/better-sampling/
		// https://graphics.pixar.com/library/OrthonormalB/paper.pdf
		let sign = select( sign( n.z ), 1.0, n.z == 0.0 );
		let a = - 1.0 / ( sign + n.z );
		let b = n.x * n.y * a;
		let b1 = vec3( 1.0 + sign * n.x * n.x * a, sign * b, - sign * n.x );
		let b2 = vec3( b, sign + n.y * n.y * a, - n.y );

		let r = sqrt( uv.x );
		let theta = 2.0 * PI * uv.y;
		let x = r * cos( theta );
		let y = r * sin( theta );
		return x * b1 + y * b2 + sqrt( 1.0 - uv.x ) * n;

	}

`,[T]),K=j(`

	fn misHeuristic( a: f32, b: f32 ) -> f32 {

		let aa = a * a;
		let bb = b * b;
		return aa / ( aa + bb );

	}

`),dt=j(`

	fn luminance( color: vec3f ) -> f32 {

		return dot( color, vec3f( 0.2126, 0.7152, 0.0722 ) );

	}

`),ts=j(`

	fn equirectUvToDirection( uvIn: vec2f ) -> vec3f {

		// undo the adjustments applied in equirectDirectionToUv
		var uv = uvIn;
		uv.x -= 0.5;
		uv.y = 1.0 - uv.y;

		let theta = uv.x * 2.0 * PI;
		let phi = uv.y * PI;
		let sinPhi = sin( phi );

		return vec3f( sinPhi * cos( theta ), cos( phi ), sinPhi * sin( theta ) );

	}

`,[T]),ph=j(`

	fn equirectDirectionPdf( direction: vec3f ) -> f32 {

		let uv = equirectDirectionToUv( direction );
		let theta = uv.y * PI;
		let sinTheta = sin( theta );
		if ( sinTheta == 0.0 ) {

			return 0.0;

		}

		return 1.0 / ( 2.0 * PI * PI * sinTheta );

	}

`,[T,Pe]),Jt=j(`

	fn weightedAlphaBlend( prevColor: vec4f, newColor: vec4f, weight: f32 ) -> vec4f {

		let invWeight = 1.0 - weight;
		let totalAlpha = prevColor.a * invWeight + newColor.a * weight;
		var blendedColor = vec4f( 0 );
		if ( totalAlpha != 0.0 ) {

			let prevContrib = prevColor.rgb * invWeight * prevColor.a / totalAlpha;
			let resContrib = newColor.rgb * weight * newColor.a / totalAlpha;
			blendedColor = vec4f( prevContrib + resContrib, totalAlpha );

		}

		return blendedColor;

	}

`);import{wgslFn as oe}from"three/tsl";var er=0,tr=1,ya=2,ba=3,Sa=4,ht=5,ne=1e30,rr=1e-5,ar=oe(`

	fn isMISWeightLight( lightType: i32 ) -> bool {

		return lightType == ${ht} || lightType == ${tr} || lightType == ${er};

	}

`),wa=oe(`

	fn getSpotAttenuation( coneCosine: f32, penumbraCosine: f32, angleCosine: f32 ) -> f32 {

		return smoothstep( coneCosine, penumbraCosine, angleCosine );

	}

`),ir=oe(`

	fn getDistanceAttenuation( lightDistance: f32, cutoffDistance: f32, decayExponent: f32 ) -> f32 {

		// based upon Frostbite 3 Moving to Physically-based Rendering
		// https://seblagarde.files.wordpress.com/2015/07/course_notes_moving_frostbite_to_pbr_v32.pdf
		var distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), EPSILON );
		if ( cutoffDistance > 0.0 ) {

			let window = clamp( 1.0 - pow( lightDistance / cutoffDistance, 4.0 ), 0.0, 1.0 );
			distanceFalloff *= window * window;

		}

		return distanceFalloff;

	}

`,[T]),rs=oe(`

	fn intersectsRectangle( center: vec3f, normal: vec3f, u: vec3f, v: vec3f, rayOrigin: vec3f, rayDirection: vec3f ) -> f32 {

		let t = dot( center - rayOrigin, normal ) / dot( rayDirection, normal );
		if ( t > EPSILON ) {

			let p = rayOrigin + rayDirection * t;
			let vi = p - center;

			let a1 = dot( u, vi );
			if ( abs( a1 ) <= 0.5 ) {

				let a2 = dot( v, vi );
				if ( abs( a2 ) <= 0.5 ) {

					return t;

				}

			}

		}

		return - 1.0;

	}

`,[T]),as=oe(`

	fn intersectsCircle( position: vec3f, normal: vec3f, u: vec3f, v: vec3f, rayOrigin: vec3f, rayDirection: vec3f ) -> f32 {

		let t = dot( position - rayOrigin, normal ) / dot( rayDirection, normal );
		if ( t > EPSILON ) {

			let hit = rayOrigin + rayDirection * t;
			let vi = hit - position;

			let a1 = dot( u, vi );
			let a2 = dot( v, vi );
			if ( length( vec2f( a1, a2 ) ) <= 0.5 ) {

				return t;

			}

		}

		return - 1.0;

	}

`,[T]),is=oe(`

	fn randomAreaLightSample( light: Light, rayOrigin: vec3f, ruv: vec2f ) -> LightRecord {

		var randomPos = vec3f( 0.0 );
		if ( light.lightType == ${er} ) {

			randomPos = light.position + light.u * ( ruv.x - 0.5 ) + light.v * ( ruv.y - 0.5 );

		} else if ( light.lightType == ${tr} ) {

			let r = 0.5 * sqrt( ruv.x );
			let theta = ruv.y * 2.0 * PI;
			randomPos = light.position + light.u * ( r * cos( theta ) ) + light.v * ( r * sin( theta ) );

		}

		let toLight = randomPos - rayOrigin;
		let lightDistSq = dot( toLight, toLight );
		let dist = sqrt( lightDistSq );
		let direction = toLight / dist;
		let lightNormal = normalize( cross( light.u, light.v ) );

		var lightRec: LightRecord;
		lightRec.lightType = light.lightType;
		lightRec.emission = light.color * light.intensity;
		lightRec.dist = dist;
		lightRec.direction = direction;

		// points behind or edge-on to the light receive no contribution
		let cosTheta = dot( direction, lightNormal );
		if ( cosTheta <= 0.0 ) {

			lightRec.pdf = 0.0;

		} else {

			lightRec.pdf = lightDistSq / ( light.area * cosTheta );

		}

		return lightRec;

	}

`,[ee,P,T]),ss=oe(`

	fn randomSpotLightSample( light: Light, rayOrigin: vec3f, ruv: vec2f ) -> LightRecord {

		let radius = light.radius * sqrt( ruv.x );
		let theta = ruv.y * 2.0 * PI;
		let x = radius * cos( theta );
		let y = radius * sin( theta );

		let u = light.u;
		let v = light.v;
		let normal = normalize( cross( u, v ) );

		let angle = acos( light.coneCos );
		let angleTan = tan( angle );
		let startDistance = light.radius / max( angleTan, EPSILON );

		let randomPos = light.position - normal * startDistance + u * x + v * y;
		let toLight = randomPos - rayOrigin;
		let lightDistSq = dot( toLight, toLight );
		let dist = sqrt( lightDistSq );

		let direction = toLight / max( dist, EPSILON );
		let distanceAttenuation = getDistanceAttenuation( dist, light.distance, light.decay );

		var lightRec: LightRecord;
		lightRec.lightType = light.lightType;
		lightRec.dist = dist;
		lightRec.direction = direction;
		lightRec.emission = light.color * light.intensity * distanceAttenuation;
		lightRec.pdf = 1.0;

		return lightRec;

	}

`,[ee,P,T,ir]),os=oe(`

	fn getSpotLightNearest( light: Light, position: vec3f ) -> vec2f {

		let normal = normalize( cross( light.u, light.v ) );
		let startDistance = light.radius / max( tan( acos( light.coneCos ) ), EPSILON );
		let discCenter = light.position - normal * startDistance;

		let toPosition = position - discCenter;
		let along = dot( toPosition, - normal );
		let across = max( length( toPosition + normal * along ) - light.radius, 0.0 );
		let dist = length( vec2f( along, across ) );
		return vec2f( along / max( dist, EPSILON ), dist );

	}

`,[ee,T]);import{wgslFn as N,mat3 as Cn}from"three/tsl";import{wgslFn as ve}from"three/tsl";var ye=ve(`

	fn ggxDirection( incidentDir: vec3f, alpha: vec2f, uv: vec2f ) -> vec3f {

		// Implementation from reference [1]
		// stretch view
		let V = normalize( vec3f( alpha * incidentDir.xy, incidentDir.z ) );

		// orthonormal basis
		var T1: vec3f;
		if ( V.z < 0.9999 ) {

			T1 = normalize( cross( V, vec3( 0.0, 0.0, 1.0 ) ) );

		} else {

			T1 = vec3( 1.0, 0.0, 0.0 );

		}

		let T2 = cross( T1, V );

		// sample point with polar coordinates (r, phi)
		let a = 1.0 / ( 1.0 + V.z );
		let r = sqrt( uv.x );
		var phi: f32;
		if ( uv.y < a ) {

			phi = uv.y / a * PI;

		} else {

			phi = PI + ( uv.y - a ) / ( 1.0 - a ) * PI;

		}

		let P1 = r * cos( phi );
		var P2 = r * sin( phi );
		if ( uv.y >= a ) {

			P2 *= V.z;

		}

		// compute normal
		var N = P1 * T1 + P2 * T2 + V * sqrt( max( 0.0, 1.0 - P1 * P1 - P2 * P2 ) );

		// unstretch
		N = normalize( vec3( alpha * N.xy, max( 0.0, N.z ) ) );

		return N;

	}

`,[T]),_n=ve(`

	fn ggxLambda( V: vec3f, alpha: vec2f ) -> f32 {

		let alphaT = alpha.x;
		let alphaB = alpha.y;

		// abs v.z to support transmitted rays
		let NdotV = max( abs( V.z ), MIN_INCIDENT_COS );
		let cos2 = NdotV * NdotV;
		let t = ( alphaT * alphaT * V.x * V.x + alphaB * alphaB * V.y * V.y ) / cos2;
		let numerator = - 1.0 + sqrt( 1.0 + t );
		return numerator / 2.0;

	}

`,[T]),sr=ve(`

	fn ggxShadowMaskG1( V: vec3f, alpha: vec2f ) -> f32 {

		// TODO: this could be collapsed to a simpler form as an optimization
		return 1.0 / ( 1.0 + ggxLambda( V, alpha ) );

	}

`,[_n]),ns=ve(`

	fn ggxSmithVisibility( V: vec3f, L: vec3f, alpha: vec2f ) -> f32 {

		let alphaT = alpha.x;
		let alphaB = alpha.y;

		let NdotV = max( V.z, MIN_INCIDENT_COS );
		let NdotL = max( L.z, MIN_INCIDENT_COS );

		let TdotV = V.x;
		let TdotL = L.x;

		let BdotV = V.y;
		let BdotL = L.y;

		let GGXV = NdotL * length( vec3f( alphaT * TdotV, alphaB * BdotV, NdotV ) );
		let GGXL = NdotV * length( vec3f( alphaT * TdotL, alphaB * BdotL, NdotL ) );

		return 0.5 / ( GGXV + GGXL );

	}

`,[T]),ft=ve(`

	fn ggxDistribution( H: vec3f, alpha: vec2f ) -> f32 {

		let alphaT = alpha.x;
		let alphaB = alpha.y;

		let NdotH = H.z;
		let TdotH = H.x;
		let BdotH = H.y;

		let a2 = alphaT * alphaB;
		let v = vec3f( alphaB * TdotH, alphaT * BdotH, a2 * NdotH );
		let v2 = dot( v, v );
		let w2 = a2 / v2;

		return a2 * w2 * w2 / PI;

	}

`,[T]),be=ve(`

	fn ggxReflectionAdjustedPDF( V: vec3f, H: vec3f, alpha: vec2f ) -> f32 {

		let NdotV = max( V.z, MIN_INCIDENT_COS );
		let D = ggxDistribution( H, alpha );
		let G1 = ggxShadowMaskG1( V, alpha );

		return D * G1 / ( 4 * NdotV );

	}
`,[ft,sr]),or=ve(`

	fn ggxRefractionAdjustedPDF( V: vec3f, L: vec3f, H: vec3f, alpha: vec2f, eta: f32 ) -> f32 {

		let NdotV = max( V.z, MIN_INCIDENT_COS );
		let HdotV = dot( V, H );
		let HdotL = dot( L, H );
		let D = ggxDistribution( H, alpha );
		let G1 = ggxShadowMaskG1( V, alpha );

		let denom = eta * HdotV + HdotL;
		return D * G1 * abs( HdotV ) * abs( HdotL ) / ( NdotV * denom * denom );

	}
`,[ft,sr]);var Fn=h`

	fn ensureValidReflectionNormal( n: vec3f, ng: vec3f, i: vec3f ) -> vec3f {

		// reflected ray
		let R = 2.0 * dot( n, i ) * n - i;

		let Iz = dot( i, ng );

		// reflection rays may always be at least as shallow as the incoming ray
		let threshold = min( 0.9 * Iz, 0.01 );
		if ( dot( ng, R ) >= threshold ) {

			return n;

		}

		// Form coordinate system with Ng as the Z axis and N inside the X-Z-plane.
   		// The X axis is found by normalizing the component of N that's orthogonal to Ng.
   		// The Y axis isn't actually needed.
		let orthoN = n - dot( n, ng ) * ng;
		let orthoLen = length( orthoN );
		let X = select( n, orthoN / orthoLen, orthoLen != 0.0 );

		// Calculate N.z and N.x in the local coordinate system.
		//
		// The goal of this computation is to find a N' that is rotated towards Ng just enough
   		// to lift R' above the threshold (here called t), therefore dot(R', Ng) = t.
		//
		// See the Blender implementation for a full description of the solution.
		let Ix = dot( i, X );

		let a = Ix * Ix + Iz * Iz;
		let b = 2.0 * ( a + Iz * threshold );
		let c = ( threshold + Iz ) * ( threshold + Iz );

		// only one root is valid; the sign of Ix selects it
		var Nz2: f32;
		if ( Ix < 0.0 ) {

			Nz2 = 0.25 * ( b + sqrt( max( b * b - 4.0 * a * c, 0.0 ) ) ) / a;

		} else {

			Nz2 = 0.25 * ( b - sqrt( max( b * b - 4.0 * a * c, 0.0 ) ) ) / a;

		}

		let Nx = sqrt( max( 1.0 - Nz2, 0.0 ) );
		let Nz = sqrt( max( Nz2, 0.0 ) );

		return Nx * X + Nz * ng;

	}

`,$n=h`

	fn ensureValidViewNormal( n: vec3f, ng: vec3f, view: vec3f ) -> vec3f {

		// ensure the view is at least slightly above the surface normal hemisphere
		const MIN_VIEW_COS = 1e-6;

		// if we're positive already then early out
		let c = dot( n, view );
		if ( c > MIN_VIEW_COS ) {

			return n;

		}

		// perpendicular vector to normal and view
		var perp = n - c * view;
		let perpLen = length( perp );

		// if we reach here that means that he view is nearly the opposite direction and
		// we can't derive plan to rotate on towards the view, so just use the geometry
		// normal. This could likely only really happen with a severe normal map application.
		if ( perpLen <= 1e-6 ) {

			return ng;

		}

		perp = perp / perpLen;

		// rotate the normal to be at larger than the above threshold - pythagorean
		// theorem for generating normal with threshold*view component
		return MIN_VIEW_COS * view + sqrt( 1.0 - MIN_VIEW_COS * MIN_VIEW_COS ) * perp;

	}

`,nr=3402823466e29,ls=(c,e,t)=>N(`

	fn getSurfaceRecord(
		material: Material,
		vertexData: bvh_GeometryStruct,
		side: f32,
		faceNormal: vec3f,
		view: vec3f,
		blurRoughness: f32,
	) -> SurfaceRecord {

		// "faceNormal" is provided on the hit side so flip it back to the geometric side
		var normal = faceNormal * side;
		if ( material.flatShading == 0 ) {

			normal = normalize( vertexData.normal.xyz );

		}

		var baseNormal = normal;
		if ( material.normalMap != -1 ) {

			// some provided tangents can be malformed (0, 0, 0) causing the normal to be degenerate
			// resulting in NaNs and slow path tracing.
			if ( length( vertexData.tangent.xyz ) > 0.0 && vertexData.tangent.w != 0.0 ) {

				// TODO: consider re-orthonormalizing against the normal here since attribute
				// interpolation could result in drift.
				let tangent = normalize( vertexData.tangent.xyz );
				let bitangent = normalize( cross( baseNormal, tangent ) * vertexData.tangent.w );
				let vTBN = mat3x3f( tangent, bitangent, baseNormal );

				let uvPrime = material.normalMapTransform * vec3( getUvFromChannel( vertexData, material.normalMap ), 1.0 );
				var texNormal = sampleTexel( uvPrime.xy, material.normalMap, 0 ).xyz;
				texNormal = texNormal * 2.0 - 1.0;
				texNormal = texNormal * vec3f( material.normalScale, 1.0 );
				normal = normalize( vTBN * texNormal );

			}

		}

		normal *= side;

		normal = ensureValidViewNormal( normal, faceNormal, view );

		normal = ensureValidReflectionNormal( normal, faceNormal, view );

		var albedo = vec4( material.color, material.opacity );
		if ( material.vertexColors == 1 ) {

			albedo *= getColor( vertexData );

		}

		if ( material.map != -1 ) {

			let uvPrime = material.mapTransform * vec3f( getUvFromChannel( vertexData, material.map ), 1 );
			albedo *= sampleTexel( uvPrime.xy, material.map, 0 );

		}

		if ( material.alphaMap != -1 ) {

			let uvPrime = material.alphaMapTransform * vec3f( getUvFromChannel( vertexData, material.alphaMap ), 1 );
			albedo.a *= sampleTexel( uvPrime.xy, material.alphaMap, 0 ).g;

		}

		var roughness = material.roughness;
		if ( material.roughnessMap != -1 ) {

			let uvPrime = material.roughnessMapTransform * vec3f( getUvFromChannel( vertexData, material.roughnessMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.roughnessMap, 0 );
			roughness *= texColor.g;

		}

		var metalness = material.metalness;
		if ( material.metalnessMap != -1 ) {

			let uvPrime = material.metalnessMapTransform * vec3f( getUvFromChannel( vertexData, material.metalnessMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.metalnessMap, 0 );
			metalness *= texColor.b;

		}

		var emission = material.emissiveIntensity * material.emissive;
		if ( material.emissiveMap != -1 ) {

			let uvPrime = material.emissiveMapTransform * vec3f( getUvFromChannel( vertexData, material.emissiveMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.emissiveMap, 0 );
			emission *= texColor.rgb;

		}

		var transmission = material.transmission;
		if ( material.transmissionMap != -1 ) {

			let uvPrime = material.transmissionMapTransform * vec3f( getUvFromChannel( vertexData, material.transmissionMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.transmissionMap, 0 );
			transmission *= texColor.r;

		}

		var clearcoat = material.clearcoat;
		if ( material.clearcoatMap != -1 ) {

			let uvPrime = material.clearcoatMapTransform * vec3f( getUvFromChannel( vertexData, material.clearcoatMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.clearcoatMap, 0 );
			clearcoat *= texColor.r;

		}

		var clearcoatRoughness = material.clearcoatRoughness;
		if ( material.clearcoatRoughnessMap != -1 ) {

			let uvPrime = material.clearcoatRoughnessMapTransform * vec3f( getUvFromChannel( vertexData, material.clearcoatRoughnessMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.clearcoatRoughnessMap, 0 );
			clearcoatRoughness *= texColor.g;

		}

		var clearcoatNormal = baseNormal;
		if ( material.clearcoatNormalMap != -1 ) {

			// some provided tangents can be malformed (0, 0, 0) causing the normal to be degenerate
			// resulting in NaNs and slow path tracing.
			if ( length( vertexData.tangent.xyz ) > 0.0 && vertexData.tangent.w != 0.0 ) {

				// TODO: consider re-orthonormalizing against the normal here since attribute
				// interpolation could result in drift.
				let tangent = normalize( vertexData.tangent.xyz );
				let bitangent = normalize( cross( baseNormal, tangent ) * vertexData.tangent.w );
				let vTBN = mat3x3f( tangent, bitangent, baseNormal );

				let uvPrime = material.clearcoatNormalMapTransform * vec3( getUvFromChannel( vertexData, material.clearcoatNormalMap ), 1.0 );
				var texNormal = sampleTexel( uvPrime.xy, material.clearcoatNormalMap, 0 ).xyz;
				texNormal = texNormal * 2.0 - 1.0;
				texNormal = texNormal * vec3f( material.clearcoatNormalScale, 1.0 );
				clearcoatNormal = normalize( vTBN * texNormal );

			}

		}

		clearcoatNormal *= side;

		clearcoatNormal = ensureValidViewNormal( clearcoatNormal, faceNormal, view );

		clearcoatNormal = ensureValidReflectionNormal( clearcoatNormal, faceNormal, view );

		var sheenColor = material.sheenColor;
		if ( material.sheenColorMap != -1 ) {

			let uvPrime = material.sheenColorMapTransform * vec3f( getUvFromChannel( vertexData, material.sheenColorMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.sheenColorMap, 0 );
			sheenColor *= texColor.rgb;

		}

		var sheenRoughness = material.sheenRoughness;
		if ( material.sheenRoughnessMap != -1 ) {

			let uvPrime = material.sheenRoughnessMapTransform * vec3f( getUvFromChannel( vertexData, material.sheenRoughnessMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.sheenRoughnessMap, 0 );
			sheenRoughness *= texColor.r;

		}

		var iridescence = material.iridescence;
		if ( material.iridescenceMap != -1 ) {

			let uvPrime = material.iridescenceMapTransform * vec3f( getUvFromChannel( vertexData, material.iridescenceMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.iridescenceMap, 0 );
			iridescence *= texColor.r;

		}

		var iridescenceThickness = material.iridescenceThicknessMaximum;
		if ( material.iridescenceThicknessMap != -1 ) {

			let uvPrime = material.iridescenceThicknessMapTransform * vec3f( getUvFromChannel( vertexData, material.iridescenceThicknessMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.iridescenceThicknessMap, 0 );

			iridescenceThickness = mix(
				material.iridescenceThicknessMinimum,
				material.iridescenceThicknessMaximum,
				texColor.g,
			);

		}

		var specularColor = material.specularColor;
		if ( material.specularColorMap != -1 ) {

			let uvPrime = material.specularColorMapTransform * vec3f( getUvFromChannel( vertexData, material.specularColorMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.specularColorMap, 0 );
			specularColor *= texColor.rgb;

		}

		var specularIntensity = material.specularIntensity;
		if ( material.specularIntensityMap != -1 ) {

			let uvPrime = material.specularIntensityMapTransform * vec3f( getUvFromChannel( vertexData, material.specularIntensityMap ), 1 );
			let texColor = sampleTexel( uvPrime.xy, material.specularIntensityMap, 0 );
			specularIntensity *= texColor.a;

		}

		// extract the anisotropy magnitude vector in tangent space
		var anisotropyDirVec = material.anisotropy * vec2f( cos( material.anisotropyRotation ), sin( material.anisotropyRotation ) );
		if ( material.anisotropyMap != -1 ) {

			let uvPrime = material.anisotropyMapTransform * vec3f( getUvFromChannel( vertexData, material.anisotropyMap ), 1.0 );
			let aniTex = sampleTexel( uvPrime.xy, material.anisotropyMap, 0 );

			// map rg encode the direction ([-1,1]), b the strength; rotate + scale by the material anisotropy.
			let mapDir = aniTex.rg * 2.0 - vec2f( 1.0 );
			let mapStr = aniTex.b;
			let mapLen = length( mapDir );
			if ( mapLen > EPSILON ) {

				anisotropyDirVec = mat2x2f(
					anisotropyDirVec.x, anisotropyDirVec.y,
					- anisotropyDirVec.y, anisotropyDirVec.x
				) * mapStr * mapDir / mapLen;

			}

		}

		// adjust the surface basis to be oriented along the anisotropic vector
		let anisotropyStrength = length( anisotropyDirVec );
		var surfaceBasis = getBasisFromNormal( normal );
		if ( anisotropyStrength > 0.0 && length( vertexData.tangent.xyz ) > 0.0 && vertexData.tangent.w != 0.0 ) {

			let anisotropyDir = anisotropyDirVec / anisotropyStrength;

			// re-orthonormalize the tangent against the shading normal so the frame stays orthonormal -
			// normal map adjustments will cause the normal and tangent to become non-orthonormal.
			let tangent = normalize( vertexData.tangent.xyz - normal * dot( normal, vertexData.tangent.xyz ) );
			let bitangent = cross( normal, tangent ) * vertexData.tangent.w;

			surfaceBasis = mat3x3f(
				tangent * anisotropyDir.x + bitangent * anisotropyDir.y,
				bitangent * anisotropyDir.x - tangent * anisotropyDir.y,
				normal
			);

		}

		var surf: SurfaceRecord;

		surf.volumeParticle = false;
		surf.faceNormal = faceNormal;
		surf.normal = normal;

		surf.metalness = metalness;
		surf.diffuseRoughness = material.diffuseRoughness;
		surf.color = albedo.rgb;
		surf.emission = emission;

		surf.opacity = select( 1.0, albedo.a, material.transparent != 0 );

		surf.ior = material.ior;
		surf.transmission = transmission;
		surf.thinWall = material.thinWall == 1;
		surf.attenuationColor = material.attenuationColor;
		surf.attenuationDistance = material.attenuationDistance;

		surf.clearcoatNormal = clearcoatNormal;
		surf.clearcoat = clearcoat;

		surf.iridescence = iridescence;
		surf.iridescenceIor = material.iridescenceIor;
		surf.iridescenceThickness = iridescenceThickness;

		surf.specularColor = specularColor;
		surf.specularIntensity = specularIntensity;

		surf.sheen = material.sheen;
		surf.sheenColor = sheenColor;

		let minRoughness = max( MIN_ROUGHNESS, blurRoughness );
		surf.roughness = clamp( roughness, minRoughness, 1.0 );
		surf.clearcoatRoughness = clamp( clearcoatRoughness, minRoughness, 1.0 );
		surf.sheenRoughness = clamp( sheenRoughness, minRoughness, 1.0 );
		surf.anisotropy = anisotropyStrength;

		// frontFace is used to determine transmissive properties and PDF. If no transmission is used
		// then we can just always assume this is a front face.
		surf.frontFace = side == 1.0 || transmission == 0.0;
		if ( material.thinWall == 1 || surf.frontFace ) {

			surf.eta = 1.0 / material.ior;

		} else {

			surf.eta = material.ior;

		}
		surf.f0 = iorToF0( surf.eta );

		// get the normal frames
		surf.normalBasis = surfaceBasis;
		surf.normalInvBasis = inverse( surf.normalBasis );

		surf.clearcoatBasis = getBasisFromNormal( surf.clearcoatNormal );
		surf.clearcoatInvBasis = inverse( surf.clearcoatBasis );

		return surf;
	}

`,[Gi,A,Qi,c,e,t,M,T,Fn,$n]),_h=N(`

	fn diffuseBrdf( NdotV: f32, NdotL: f32, VdotH: f32, surf: SurfaceRecord ) -> vec3f {

		// https://blog.selfshadow.com/publications/s2015-shading-course/burley/s2015_pbs_disney_bsdf_notes.pdf
		// See equation (4)

		let fl = schlickFresnel( NdotL, 0.0 );
		let fv = schlickFresnel( NdotV, 0.0 );

		let alpha = surf.roughness * surf.roughness;
		let bias = mix( 0.0, 0.5, alpha ) - 1;
		let energyFactor = mix( 1.0, 1.0 / 1.51, alpha );

		let rr = 2.0 * alpha * VdotH * VdotH;
		let retro = rr * ( fl + fv + fl * fv * ( rr + 2.0 * bias ) );
		let fresnel = ( 1.0 + bias * fl ) * ( 1.0f + bias * fv );

		// TODO: subsurface approx?

		return energyFactor * ( surf.color / PI ) * ( retro + fresnel );

	}

`,[T,Q,M]),Ch=N(`

	fn lambertBrdf( NdotV: f32, NdotL: f32, VdotH: f32, surf: SurfaceRecord ) -> vec3f {

		return surf.color / PI;

	}

`,[T,M]),Ta=N(`

	fn specularBrdf( V: vec3f, L: vec3f, H: vec3f, alpha: vec2f ) -> vec3f {

		let alphaT = alpha.x;
		let alphaB = alpha.y;

		let Vis = ggxSmithVisibility( V, L, alpha );
		let D = ggxDistribution( H, alpha );

		return vec3f( D * Vis );

	}

`,[ns,ft]),Ae=N(`

	fn isMatchedIor( eta: f32 ) -> bool {

		return abs( eta - 1.0 ) < EPSILON;

	}

`,[T]),Ia=N(`

	fn specularBtdf( V: vec3f, L: vec3f, H: vec3f, alpha: vec2f, eta: f32 ) -> vec3f {

		let NdotV = V.z;
		let NdotL = L.z;
		let HdotV = dot( V, H );
		let HdotL = dot( L, H );

		// Heaviside function for G term
		if ( NdotV * HdotV < 0.0 || NdotL * HdotL < 0.0 || HdotV * HdotL > 0.0 ) {

			return vec3f( 0.0 );

		}

		let G1_i = ggxShadowMaskG1( V, alpha );
		let G1_o = ggxShadowMaskG1( L, alpha );

		// separable G2 product, no height correlation
		let denom = eta * HdotV + HdotL;
		let Vis = G1_i * G1_o * abs( HdotV ) * abs( HdotL ) /
			( abs( NdotV ) * abs( NdotL ) * denom * denom );

		let F = dielectricFresnel( abs( HdotV ), eta );

		let D = ggxDistribution( H, alpha );

		return vec3f( ( 1 - F ) * D * Vis );

	}

`,[sr,ft,xe]),lr=N(`

	fn thinWallTransmissionRoughness( alpha: f32, eta: f32 ) -> f32 {

		let t = 3.4 * ( eta - 1.0 ) * ( eta - 0.5 ) * ( eta - 0.5 ) / ( eta * eta * eta );
		return saturate( alpha * sqrt( max( t, 0.0 ) ) );

	}

`),cr=N(`

	fn transmissionAttenuation( dist: f32, attColor: vec3f, attDist: f32 ) -> vec3f {

		return pow( attColor, vec3f( dist / attDist ) );

	}

`),Le=360,Ee=830,Mn=N(`

	fn dispersionIor( ior: f32, dispersion: f32, wavelength: f32 ) -> f32 {

		let nd = max( ior, 1.0 );
		let scale = ( nd - 1.0 ) * max( dispersion, 0.0 ) / 20.0;
		let lambda = clamp( wavelength, ${Le}.0, ${Ee}.0 );
		return max( nd + scale * ( 523655.0 / ( lambda * lambda ) - 1.5168 ), 1.0 );

	}

`),ur=h`

	fn applyDispersion( surf: ptr<function, ${M}>, dispersion: f32, wavelength: f32 ) -> void {

		surf.ior = ${Mn}( surf.ior, dispersion, wavelength );
		surf.eta = select( surf.ior, 1.0 / surf.ior, surf.thinWall || surf.frontFace );
		surf.f0 = ${A}( surf.eta );

	}

`,dr=N(`

	fn dispersionColorWeight( wavelength: f32 ) -> vec3f {

		let lambda = clamp( wavelength, ${Le}.0, ${Ee}.0 );

		let x1 = ( lambda - 442.0 ) * select( 0.0374, 0.0624, lambda < 442.0 );
		let x2 = ( lambda - 599.8 ) * select( 0.0323, 0.0264, lambda < 599.8 );
		let x3 = ( lambda - 501.1 ) * select( 0.0382, 0.0490, lambda < 501.1 );
		let x = 0.362 * exp( - 0.5 * x1 * x1 ) + 1.056 * exp( - 0.5 * x2 * x2 ) - 0.065 * exp( - 0.5 * x3 * x3 );

		let y1 = ( lambda - 568.8 ) * select( 0.0247, 0.0213, lambda < 568.8 );
		let y2 = ( lambda - 530.9 ) * select( 0.0322, 0.0613, lambda < 530.9 );
		let y = 0.821 * exp( - 0.5 * y1 * y1 ) + 0.286 * exp( - 0.5 * y2 * y2 );

		let z1 = ( lambda - 437.0 ) * select( 0.0278, 0.0845, lambda < 437.0 );
		let z2 = ( lambda - 459.0 ) * select( 0.0725, 0.0385, lambda < 459.0 );
		let z = 1.217 * exp( - 0.5 * z1 * z1 ) + 0.681 * exp( - 0.5 * z2 * z2 );

		let linearRgb = max( vec3f(
			3.2404542 * x - 1.5371385 * y - 0.4985314 * z,
			- 0.9692660 * x + 1.8760108 * y + 0.0415560 * z,
			0.0556434 * x - 0.2040259 * y + 1.0572252 * z,
		), vec3f( 0.0 ) );

		return linearRgb * vec3f( 2.6699448, 4.0708066, 4.2980494 );

	}

`),cs=N(`

	fn fresnelMix( VdotH: f32, f0Color: vec3f, ior: f32, eta: f32, weight: f32, base: vec3f, layer: vec3f ) -> vec3f {

		var f0 = iorToF0( ior ) * f0Color;
		f0 = min( f0, vec3f( 1.0 ) );

		// reflect all light on total internal reflection, matching the WebGL evaluateFresnel function
		var fr = vec3f( 1.0 );
		if ( ! totalInternalReflection( abs( VdotH ), eta ) ) {

			fr = schlickFresnelVec( abs( VdotH ), f0, vec3f( 1.0 ) );

		}

		let maxFr = max( max( fr.r, fr.g ), fr.b );

		return ( 1.0 - weight * maxFr ) * base + weight * fr * layer;

	}

`,[Ne,A,Yt]),Nn=Cn(3.2404542,-.969266,.0556434,-1.5371385,1.8760108,-.2040259,-.4985314,.041556,1.0572252),Bn=h`

	fn evalSensitivity( OPD: f32, shift: vec3f ) -> vec3f {

		let phase = 2.0 * ${Math.PI} * OPD * 1.0e-9;
		const val = vec3(5.4856e-13, 4.4201e-13, 5.2481e-13);
		const pos = vec3(1.6810e+06, 1.7953e+06, 2.2084e+06);
		const _var = vec3(4.3278e+09, 9.3046e+09, 6.6121e+09);

		var xyz = val * sqrt(2.0 * ${Math.PI} * _var) * cos(pos * phase + shift) * exp(-phase * phase * _var);
		xyz.x += 9.7470e-14 * sqrt(2.0 * ${Math.PI} * 4.5282e+09) * cos(2.2399e+06 * phase + shift.x) * exp(-4.5282e+09 * phase * phase);
		xyz /= 1.0685e-7;

		let rgb = ${Nn} * xyz;
		return rgb;

	}

`,Ra=N(`

	fn iridescentFresnel(
		cosTheta1: f32, baseF0: vec3f, iridescenceIor: f32,
		outsideIor: f32, iridescenceThickness: f32,
	) -> vec3f {

		let sinTheta2Sq = pow( outsideIor / iridescenceIor, 2.0 ) * ( 1.0 - pow( cosTheta1, 2.0 ) );
		let cosTheta2Sq = 1.0 - sinTheta2Sq;

		// Handle total internal reflection
		if ( cosTheta2Sq < 0.0 ) {

			return vec3( 1.0 );

		}

		let cosTheta2 = sqrt( cosTheta2Sq );

		// First interface: air -> iridescent thin film
		let R0 = iorToF0General( iridescenceIor, outsideIor );
		let R12 = schlickFresnel( cosTheta1, R0 );
		let R21 = R12;
		let T121 = 1.0 - R12;
		let phi12 = select( 0.0, PI, iridescenceIor < outsideIor );
		let phi21 = PI - phi12;

		// Second interface: iridescent thin film -> base material
		let baseIor = fresnel0ToIor( clamp( baseF0, vec3( 0.0 ), vec3( 0.9999 ) ) ); // guard against 1.0
		let R1 = iorToF0GeneralVec( baseIor, vec3( iridescenceIor ) );
		var R23 = schlickFresnelVec( cosTheta2, R1, vec3( 1.0 ) );

		// Handle total internal reflection at the film -> base interface
		// NOTE: Added separately from the original implementation. Is this correct?
		R23 = select( R23, vec3( 1.0 ), totalInternalReflectionVec( cosTheta2, vec3( iridescenceIor ) / baseIor ) );
		let phi23 = select( vec3( 0.0 ), vec3( PI ), baseIor < vec3( iridescenceIor ) );

		// Phase shift
		let OPD = 2.0 * iridescenceIor * iridescenceThickness * cosTheta2;
		let phi = vec3( phi21 ) + phi23;

		// Analytical integration
		// Compound terms
		let R123 = clamp( R12 * R23, vec3( 1e-5 ), vec3( 0.9999 ) );
		let r123 = sqrt( R123 );
		let Rs = T121 * T121 * R23 / ( vec3( 1.0 ) - R123 );

		// Reflectance term for m = 0 (DC term amplitude)
		let C0 = R12 + Rs;
		var I = C0;

		// Reflectance term for m > 0 (pairs of diracs)
		var Cm = Rs - T121;
		for (var m = 1; m <= 2; m += 1) {

			Cm *= r123;
			let Sm = 2.0 * evalSensitivity( f32( m ) * OPD, f32( m ) * phi );
			I += Cm * Sm;

		}

		return max( I, vec3(0.0) );

	}

`,[ji,Ki,Q,Xi,Bn,Yi]),us=(c=Ra)=>h`

	fn transmissionFresnel( cosTheta: f32, surf: ${M} ) -> ${ma} {

		var result: ${ma};
		let cosine = saturate( abs( cosTheta ) );
		let matchedIor = ${Ae}( surf.eta );
		let airIncident = surf.thinWall || surf.frontFace;
		let dielectricFresnel = ${xe}( cosine, surf.eta );

		// Keep matched media transparent unless a real thin-film layer is present. This avoids
		// introducing the non-physical Schlick F90 reflection produced by KHR_materials_specular
		// when the substrate itself has no IOR boundary.
		var reflectance = vec3f( 0.0 );
		if ( ! matchedIor ) {

			let specularF0 = min( surf.f0 * surf.specularColor, vec3f( 1.0 ) );
			let dielectricReflectance = select(
				vec3f( dielectricFresnel ),
				${Ne}( cosine, specularF0, vec3f( 1.0 ) ),
				airIncident,
			);
			reflectance = surf.specularIntensity * dielectricReflectance;

		}

		reflectance = clamp( reflectance, vec3f( 0.0 ), vec3f( 1.0 ) );
		var transmittance = vec3f( 1.0 ) - reflectance;

		if ( surf.iridescence > 0.0 ) {

			// The media on either side of the film are air outside and the volume interior as
			// the base. Swap them on interior hits so film-interface TIR remains possible.
			let outsideIor = select( surf.ior, 1.0, airIncident );
			let filmBaseIor = select( 1.0, surf.ior, airIncident );
			let filmReflectance = clamp( ${c}(
				cosine,
				vec3f( ${A}( filmBaseIor ) ),
				surf.iridescenceIor,
				outsideIor,
				surf.iridescenceThickness,
			), vec3f( 0.0 ), vec3f( 1.0 ) );

			reflectance = mix( reflectance, filmReflectance, surf.iridescence );
			transmittance = mix( transmittance, vec3f( 1.0 ) - filmReflectance, surf.iridescence );

		}

		result.reflectance = reflectance;
		result.transmittance = transmittance;

		// Include the base-color tint in the transmission energy, as Cycles does when it
		// computes the glass reflection probability from its two tinted coefficients.
		let reflectEnergy = dot( reflectance, vec3f( 1.0 / 3.0 ) );
		let transmitEnergy = dot( transmittance * surf.color, vec3f( 1.0 / 3.0 ) );
		let totalEnergy = reflectEnergy + transmitEnergy;
		result.reflectProbability = select( 0.0, reflectEnergy / max( totalEnergy, EPSILON ), totalEnergy > EPSILON );

		return result;

	}

`,ds=N(`

	fn conductorFresnel( VdotH: f32, f0: vec3f, specular: vec3f ) -> vec3f {

		return specular * schlickFresnelVec( abs( VdotH ), f0, vec3f( 1 ) );

	}

`,[Ne]),hs=N(`

	fn fresnelCoat( VdotNc: f32, ior: f32, base: vec3f, layer: vec3f, weight: f32 ) -> vec3f {

		let f0 = iorToF0( ior );
		let F = schlickFresnel( abs( VdotNc ), f0 );

		return mix( base, layer, weight * F );

	}

`,[A,Q]),fs=c=>h`

	fn albedo(
		eta: f32,
		includeFresnel: bool,
		includeRefraction: bool,
		globalId: vec3u,
		layer: u32,
	) -> void {

		// The matched-IOR limit is a unit-energy delta transmission event, so it cannot
		// be integrated with the rough BTDF below.
		if ( includeRefraction && ${Ae}( eta ) ) {

			textureStore( ${c}, vec3( globalId.xy, layer ), vec4( 1.0 ) );
			return;

		}

		// sample the brdf directions in a grid pattern
		const GRID_SIZE = 64u;

		// TODO: this sampling means that energy at 0.0 & 1.0 roughness (and 0 and 90deg cos) are never
		// written to the texture due to the half texel inset, resulting in small, though possibly noticeable,
		// error in common cases.
		let dimensions = textureDimensions( ${c} ).xy;
		let uv = ( vec2f( globalId.xy ) + vec2f( 0.5 ) ) / vec2f( dimensions );

		let cosThetaO = uv.x;
		let roughness = uv.y;
		let alpha = roughness * roughness;

		let wo = vec3( sqrt( 1 - cosThetaO * cosThetaO ), 0 , cosThetaO );

		let f0 = ${A}( eta );

		var result = 0.0;
		for ( var x = 0u; x < GRID_SIZE; x++ ) {

			for ( var y = 0u; y < GRID_SIZE; y++ ) {

				// calculate the half vector to sample
				let gridPoint = vec2f( vec2u( x, y ) ) + vec2f( 0.5 );
				let sampleUv = gridPoint / f32( GRID_SIZE );
				let wh = ${ye}( wo, vec2( alpha ), sampleUv );

				var f = 1.0;
				if ( includeFresnel ) {

					// use the exact dielectric fresnel so the table agrees with the fresnel used
					// for lobe sampling
					f = ${xe}( dot( wo, wh ), eta );

				}

				// air-incident reflection is evaluated with schlick in bsdfEval - only the
				// volume-incident ( TIR ) glass reflection uses the exact fresnel
				var reflectionF = f;
				if ( eta < 1.0 ) {

					reflectionF = ${Q}( dot( wo, wh ), f0 );

				}

				// reflection lobe - samples landing below the surface are lost
				let wi = - reflect( wo, wh );
				let reflectionPdf = ${be}( wo, wh, vec2f( alpha ) );
				if ( wi.z > 0.0 && reflectionPdf != 0.0 ) {

					let specular = ${Ta}( wo, wi, wh, vec2f( alpha ) );
					result += reflectionF * specular.x * wi.z / reflectionPdf;

				}

				// refraction lobe - the btdf carries its own ( 1 - F ) fresnel weight, and
				// samples landing back above the surface are lost
				if ( includeRefraction ) {

					let wiRefract = refract( - wo, wh, eta );
					if ( wiRefract.z < 0.0 ) {

						let transmission = ${Ia}( wo, wiRefract, wh, vec2f( alpha ), eta );
						let pdf = ${or}( wo, wiRefract, wh, vec2f( alpha ), eta );
						if ( pdf != 0.0 ) {

							result += transmission.x * abs( wiRefract.z ) / pdf;

						}

					}

				}

			}

		}

		result /= f32( GRID_SIZE * GRID_SIZE );

		textureStore( ${c}, vec3( globalId.xy, layer ), vec4( result ) );

	}

`;var Da={};jr(Da,{rand1:()=>Ln,rand2:()=>En,rand3:()=>zn,rand4:()=>kn,rngInit:()=>An,rngNextBounce:()=>Hn});import{wgsl as Pn,wgslFn as Se}from"three/tsl";var pt=Pn(`

	struct PcgState {
		s0: vec4u,
		s1: vec4u,
	};

	var<private> g_state: PcgState;
`),An=Se(`
	fn pcgInitialize( pixel: vec2u, pathIndex: u32, bounceIndex: u32 ) -> void {

		// white noise seed
		g_state.s0 = vec4u( pixel | vec2( bounceIndex << 16 ), pathIndex, pixel.x + pixel.y);

		// blue noise seed
		g_state.s1 = vec4u( pathIndex, pathIndex * 15843, pathIndex * 31 + 4566, pathIndex * 2345 + 58585 );

	}
`,[pt]),hr=Se(`
	fn pcg4d( v: ptr<private, vec4u> ) -> void {

		*v = *v * 1664525u + 1013904223u;
		*v = *v + v.yzxy * v.wxyz;
		*v = *v ^ ( *v >> vec4u( 16u ) );
		*v = *v + v.yzxy * v.wxyz;
	}
`),Ln=Se(`
	fn pcgRand( _id: u32 ) -> f32 {

		pcg4d( &g_state.s0 );
		return abs( f32( g_state.s0.x ) / f32( 0xffffffffu ) );

	}
`,[hr,pt]),En=Se(`
	fn pcgRand2( _id: u32 ) -> vec2f {

		pcg4d( &g_state.s0 );
		return abs( vec2f( g_state.s0.xy ) / f32( 0xffffffffu ) );

	}
`,[hr,pt]),zn=Se(`
	fn pcgRand3( _id: u32 ) -> vec3f {

		pcg4d( &g_state.s0 );
		return abs( vec3f( g_state.s0.xyz ) / f32( 0xffffffffu ) );

	}
`,[hr,pt]),kn=Se(`
	fn pcgRand4( _id: u32 ) -> vec4f {

		pcg4d( &g_state.s0 );
		return abs( vec4f( g_state.s0 ) / f32( 0xffffffffu ) );

	}
`,[hr,pt]),Hn=Se("fn noop() -> void {}");var mt={};jr(mt,{rand1:()=>Kn,rand2:()=>jn,rand3:()=>Qn,rand4:()=>fr,rngInit:()=>qn,rngNextBounce:()=>Gn});import{texture as Vn,vec4 as On}from"three/tsl";var ps=64,Wn=new ai(ps,1),Un=Vn(Wn),ms=On(0).toVar("blueDitherSeed"),qn=h`
	fn blueDitherInitialize( pixel: vec2u, pathIndex: u32, bounceIndex: u32 ) -> void {

		let coord = vec2i( pixel % vec2u( ${ps}u ) );
		${ms} = textureLoad( ${Un}, coord, 0 );
		${ct}( vec2u( 0 ), pathIndex, bounceIndex );

	}
`,Gn=h`
	fn blueDitherNextBounce() -> void {

		${ut}();

	}
`,fr=h`
	fn blueDitherRand4( effect: u32 ) -> vec4f {

		// Get the scrambled sobol stratified sample
		let stratifiedSample = ${lt}( effect );

		// offset it by the blue noise seed and dimension rotation
		return fract( stratifiedSample + ${ms}.r );

	}
`,Qn=h`
	fn blueDitherRand3( effect: u32 ) -> vec3f {

		return ${fr}( effect ).xyz;

	}
`,jn=h`
	fn blueDitherRand2( effect: u32 ) -> vec2f {

		return ${fr}( effect ).xy;

	}
`,Kn=h`
	fn blueDitherRand1( effect: u32 ) -> f32 {

		return ${fr}( effect ).x;

	}
`;var Ah=Da,Lh=Ot,Eh=mt,pr=0,ze=1,mr=2,gs=2147483648,ke=1073741824,le=1073741823;var gr=class extends _{constructor(){let e={bvhData:{value:null},material:{value:null},envInfo:{value:null},lightsInfo:{value:null},prevOutputTarget:Ca(new _a(1,1)).toReadOnly(),outputTarget:Ca(new _a(1,1)).toWriteOnly(),sampleCountTarget:Ca(new _a(1,1)).toReadWrite(),offset:W(new vs),tileSize:W(new vs),seed:W(0),maxBounces:W(5),maxTransparentBounces:W(5,"uint"),misEnabled:W(1,"uint"),maxSamples:W(0,"uint"),filterGlossy:W(1),clampDirect:W(0),clampIndirect:W(10),backgroundInfo:{value:null},transmissiveBackground:W(ze),textures:Xn(new xs),textureSampler:Yn(new xs),globalId:Zn},t=R("bvhData.value.fns.raycastFirstHit.outputType",e),r=w("bvhData.value.fns.raycastFirstHit",e),a=w("bvhData.value.fns.raycastShadow",e),s=w("bvhData.value.fns.sampleTrianglePoint",e),i=w("bvhData.value.fns.getSurfaceRecord",e),n=w("bvhData.value.fns.getCameraRay",e),o=w("material.value.bsdfSample",e),u=w("material.value.bsdfEvalPdf",e),l=R("envInfo.value.totalSumNode",e),f=R("envInfo.value.intensityNode",e),p=R("envInfo.value.sampleColor",e),m=R("envInfo.value.sampleDir",e),d=R("envInfo.value.getDirPdf",e),g=R("envInfo.value.getWeight",e),x=R("backgroundInfo.value.sampleColor",e),I=R("lightsInfo.value.countNode",e),b=w("lightsInfo.value.randomLightSample",e),D=w("lightsInfo.value.intersectLightAtIndex",e),y=w("lightsInfo.value.getLightWeight",e),C=w("lightsInfo.value.getLightsWeight",e),L=w("lightsInfo.value.selectLight",e),ce=w("lightsInfo.value.isLightVisibleToCamera",e),ue=h`

			fn compute(

				// indices and target
				globalId: vec3u,

				// tiles
				offset: vec2u,
				tileSize: vec2u,

				// settings
				seed: u32,
				maxBounces: u32,
				maxTransparentBounces: u32,
				misEnabled: u32,
				maxSamples: u32,
				filterGlossy: f32,
				clampDirect: f32,
				clampIndirect: f32,

				transmissiveBackground: u32,

			) -> void {

				let transforms = &${R("bvhData.value.storage.transforms",e)};
				let materials = &${R("bvhData.value.storage.materials",e)};

				// make sure we don't bleed over the edge of our tile
				if ( globalId.x >= tileSize.x || globalId.y >= tileSize.y ) {

					return;

				}

				// to screen coordinates
				let indexUV = offset + globalId.xy;
				let targetDimensions = textureDimensions( ${e.outputTarget} );
				if ( indexUV.x >= targetDimensions.x || indexUV.y >= targetDimensions.y ) {

					return;

				}

				// skip the pixel once it has hit the sample limit
				let sampleCount = textureLoad( ${e.sampleCountTarget}, indexUV ).r;
				if ( maxSamples != 0u && sampleCount >= maxSamples ) {

					return;

				}

				let uv = vec2f( indexUV ) / vec2f( targetDimensions );
				${V}( indexUV.xy, seed, 0 );

				// scene ray
				let jitteredUv = uv + ${O}( ${Wt} ) / vec2f( targetDimensions );
				var ray: ${v};
				if ( ! ${n}( jitteredUv, vec2f( targetDimensions ), &ray ) ) {

					return;

				}

				ray.direction = normalize( ray.direction );

				var resultColor = vec4f( 0, 0, 0, 1 );
				var throughputColor = vec3f( 1.0 );
				var bsdfPdf = 0.0;
				var isFullyTransmissive = true;
				var minPdf = 1.0;
				var transparentBounce = 0u;
				// A negative value marks a sampled wavelength whose RGB reconstruction weight has not been applied yet.
				var dispersionWavelength = - mix( ${Le}.0, ${Ee}.0, ${q}( ${jt} ) );

				// one-sample NEE chooses between the analytic lights and the environment
				let envActive = ${l} > 0.0 && ${f} > 0.0;
				let lightsCount = ${I};
				var envWeight = 0.0;
				if ( envActive ) {

					envWeight = ${g}();

				}

				// added last, since a camera ray miss overwrites the pixel with the background
				var lightHits = vec3f( 0.0 );
				var cameraHitLight = false;

				for ( var bounce = 0u; bounce < maxBounces; bounce ++ ) {

					var hitResult: ${t};
					let didHit = ${r}( ray, &hitResult );
					let surfaceDist = select( ${ne}, hitResult.dist, didHit );

					// NEE's total weight at the vertex this ray left, for MIS. Camera rays have none
					let isMISWeighted = misEnabled != 0u && bounce > 0u;
					var lightTotalWeight = 0.0;
					if ( isMISWeighted ) {

						lightTotalWeight = ${C}( ray.origin ) + envWeight;

					}

					// forward hits on area lights. Camera rays only see visibleToCameraRays lights, at full weight
					for ( var li = 0u; li < lightsCount; li ++ ) {

						if ( bounce == 0u && ! ${ce}( li ) ) {

							continue;

						}

						var lightRec: ${P};
						if ( ${D}( ray.origin, ray.direction, li, &lightRec ) && lightRec.dist < surfaceDist ) {

							var misWeight = 1.0;
							if ( isMISWeighted ) {

								let selectionPdf = ${y}( li, ray.origin ) / lightTotalWeight;
								misWeight = ${K}( bsdfPdf, lightRec.pdf * selectionPdf );

							}

							lightHits += ${$}( lightRec.emission * throughputColor * misWeight, bounce, clampDirect, clampIndirect );
							cameraHitLight = cameraHitLight || bounce == 0u;

						}

					}

					if ( didHit ) {

						let objectInfo = transforms[ hitResult.objectIndex ];
						var materialInfo = ( *materials )[ objectInfo.materialIndex ];

						// a matte surface hit by the camera ray renders as a fully transparent
						if ( materialInfo.matte != 0 && bounce == 0u ) {

							resultColor = vec4f( 0.0 );
							break;

						}

						// apply per-object colors
						materialInfo.color *= objectInfo.color.rgb;
						materialInfo.opacity *= objectInfo.color.a;

						let view = - ray.direction;
						var vertexData = ${s}( hitResult.barycoord, hitResult.indices.xyz );
						vertexData.normal = normalize( transpose( objectInfo.inverseMatrixWorld ) * vertexData.normal );
						vertexData.tangent = vec4f( ( objectInfo.matrixWorld * vec4f( vertexData.tangent.xyz, 0.0 ) ).xyz, vertexData.tangent.w );
						vertexData.position = objectInfo.matrixWorld * vertexData.position;

						// blur glossy surfaces after low-probability bounces to suppress fireflies,
						// from the Cycles "filter glossy" approach in integrator/surface_shader.h
						// The smallest pdf seen along the path for the glossy filter is tracked below
						let blurRoughness = sqrt( clamp( 1.0 - filterGlossy * minPdf, 0.0, 1.0 ) ) * 0.5;

						var surface = ${i}( materialInfo, vertexData, hitResult.side, hitResult.normal, view, blurRoughness );

						// Stochastically pass through partially transparent surfaces by restarting
						// the ray at the hit point, advancing the rng but not the bounce count.
						if ( ${q}( ${Kt} ) > surface.opacity ) {

							// stop once the transparent bounces run out
							if ( transparentBounce >= maxTransparentBounces ) {

								break;

							}

							ray.origin = ${se}( vertexData.position.xyz, ray.direction, hitResult.normal );
							${pa}();
							transparentBounce ++;
							bounce --;
							continue;

						}

						let isDispersive = materialInfo.dispersion > 0.0 && surface.ior > 1.0 && surface.transmission > 0.0 && ! surface.thinWall;
						if ( isDispersive ) {

							let wavelength = abs( dispersionWavelength );
							${ur}( &surface, materialInfo.dispersion, wavelength );
							if ( dispersionWavelength < 0.0 ) {

								dispersionWavelength = wavelength;
								throughputColor *= ${dr}( wavelength );

							}

						}

						// attenuate the light transmitted through the volume when exiting a backface
						if ( hitResult.side < 0.0 && materialInfo.transmission > 0.0 ) {

							throughputColor *= ${cr}( hitResult.dist, materialInfo.attenuationColor, materialInfo.attenuationDistance );

						}

						// emission, clamped at the depth of the segment that found it, as in Cycles
						let emission = ${$}( throughputColor * surface.emission, bounce, clampDirect, clampIndirect );
						resultColor += vec4f( emission, 0.0 );

						// next event estimation: choose one light or the environment by its estimated
						// contribution
						if ( misEnabled != 0u ) {

							let ruv = ${Me}( ${Gt} );
							var selectionPdf = 0.0;
							let lightIndex = ${L}( vertexData.position.xyz, envWeight, ruv.x, &selectionPdf );
							if ( selectionPdf > 0.0 ) {

								var lightRec: ${P};
								if ( envActive && lightIndex == lightsCount ) {

									// the environment, sampled from its CDF, as a light of kind ENVIRONMENT
									let envSample = ${m}( ruv.yz );
									lightRec.direction = envSample.direction;
									lightRec.emission = envSample.color;
									lightRec.pdf = envSample.pdf;
									lightRec.dist = ${ne};
									lightRec.lightType = ${ht};

								} else {

									lightRec = ${b}( lightIndex, vertexData.position.xyz, ruv.yz );

								}

								if ( lightRec.pdf > 0.0 ) {

									let evalRec = ${u}( view, lightRec.direction, surface );
									if ( evalRec.pdf > 0.0 ) {

										var shadowRay: ${v};
										shadowRay.origin = ${se}( vertexData.position.xyz, lightRec.direction, hitResult.normal );
										shadowRay.direction = lightRec.direction;
										shadowRay.maxDist = lightRec.dist * ( 1.0 - ${rr} );

										// opaque occlusion up to the light distance. A shadow-specific any hit
										// traversal could support tinted shadows from transmissive and partially
										// opaque objects
										var shadowHit: ${t};
										let occluded = ${a}( shadowRay, &shadowHit );
										if ( ! occluded ) {

											let lightPdf = lightRec.pdf * selectionPdf;

											// env + area lights are also bsdf-sampled, so MIS-weight them - punctual lights take full weight,
											// or when a bsdf ray could never reach the light
											let isMISWeighted = ${ar}( lightRec.lightType ) && ! shadowHit.forwardBlocked;
											let misWeight = select( 1.0, ${K}( lightPdf, evalRec.pdf ), isMISWeighted );
											let directLight = throughputColor * lightRec.emission * evalRec.color * misWeight / lightPdf;
											let contribution = ${$}( directLight, bounce + 1u, clampDirect, clampIndirect );
											resultColor += vec4f( contribution, 0.0 );

										}

									}

								}

							}

						}

						let scatterRec = ${o}( view, surface );
						if ( ${Be}( scatterRec ) ) {

							break;

						}

						isFullyTransmissive = isFullyTransmissive && scatterRec.isTransmissive;

						// track the smallest pdf seen along the path for the glossy filter
						minPdf = min( minPdf, scatterRec.pdf );

						// russian roulette early out:
						// Matches Cycles path_state_continuation_probability in integrator/path_state.h
						if ( bounce >= 3u ) {

							let rrThroughput = throughputColor * scatterRec.color / scatterRec.pdf;
							let rrProb = saturate( sqrt( max( max( rrThroughput.r, rrThroughput.g ), rrThroughput.b ) ) );
							if ( rrProb <= 0.0 || ${q}( ${Qt} ) > rrProb ) {

								break;

							}

							throughputColor /= rrProb;

						}

						throughputColor *= scatterRec.color;
						throughputColor /= scatterRec.pdf;
						bsdfPdf = scatterRec.pdf;

						// exit if our throughput is 0.0
						if ( all( throughputColor == vec3f( 0.0 ) ) ) {

							break;

						}

						ray.origin = ${se}( vertexData.position.xyz, scatterRec.direction, hitResult.normal );
						ray.direction = scatterRec.direction;
						ray.maxDist = 0.0;

					} else {

						if ( bounce > 0u && ! isFullyTransmissive ) {

							var misWeight = 1.0;
							if ( isMISWeighted && envActive ) {

								// match the env pdf scaling used by the NEE selection so the two estimators balance
								let envPdf = ${d}( ray.direction ) * envWeight / lightTotalWeight;
								misWeight = ${K}( bsdfPdf, envPdf );

							}

							let environment = ${p}( ray.direction ).rgb * throughputColor * misWeight;
							let contribution = ${$}( environment, bounce, clampDirect, clampIndirect );
							resultColor += vec4f( contribution, 0.0 );

						} else {

							// hit the background
							// support multiple transparent background blending techniques
							let rng = ${O}( ${Ut} );
							let bg = ${x}( ray.direction, rng );
							if ( bounce == 0u ) {

								// sample the background directly if this is the primary ray
								let background = ${$}( bg.a * bg.rgb, bounce, clampDirect, clampIndirect );
								resultColor = vec4f( background, bg.a );

							} else {

								// transmissive ray handling
								let env = ${p}( ray.direction );
								let avg = saturate( dot( throughputColor, vec3f( 1.0 / 3.0 ) ) );
								let transparency = ( 1.0 - bg.a ) * avg;
								var envMisWeight = 1.0;
								if ( misEnabled != 0u && ${l} > 0.0 ) {

									let envPdf = ${d}( ray.direction );
									envMisWeight = ${K}( bsdfPdf, envPdf );

								}

								if ( transmissiveBackground == ${pr}u ) {

									// display the env map through transmissive surfaces
									let background = ${$}( env.rgb * throughputColor * envMisWeight, bounce, clampDirect, clampIndirect );
									resultColor = vec4f(
										resultColor.rgb + background,
										1.0,
									);

								} else if ( transmissiveBackground == ${mr}u ) {

									// fade the background by the throughput color average
									let background = ${$}( bg.a * bg.rgb * throughputColor * envMisWeight, bounce, clampDirect, clampIndirect );
									resultColor = vec4f(
										resultColor.rgb + background,
										1.0 - transparency,
									);

								} else {

									// fade the background by the throughput color average, mixing in env lighting
									var light = mix( env.rgb, bg.rgb, bg.a ) * envMisWeight;
									let background = ${$}( light * throughputColor, bounce, clampDirect, clampIndirect );
									resultColor = vec4f(
										resultColor.rgb + background,
										1.0 - transparency,
									);

								}

							}

						}

						break;

					}

					${pa}();

				}

				// visible lights are opaque against a transparent background
				resultColor += vec4f( lightHits, 0.0 );
				if ( cameraHitLight ) {

					resultColor.a = 1.0;

				}

				let nextSampleCount = sampleCount + 1;
				// store the color rows top down to match a rasterized render target
				let colorIndex = vec2u( indexUV.x, targetDimensions.y - 1u - indexUV.y );

				let prevColor = textureLoad( ${e.prevOutputTarget}, colorIndex );
				let blendedColor = ${Jt}( prevColor, resultColor, 1.0 / f32( nextSampleCount ) );
				textureStore( ${e.sampleCountTarget}, indexUV, vec4( nextSampleCount ) );
				textureStore( ${e.outputTarget}, colorIndex, blendedColor );

			}`;super(ue(e)),this.defineUniformAccessors(e)}};import{Matrix3 as Jn}from"three/webgpu";import{texture as Fa,sampler as $a,uniform as Ma,wgslFn as el,PI as ys}from"three/tsl";var bs=el(`

	fn equirectLuminancePdf( luminance: f32, totalWeight: f32, resolution: vec2u ) -> f32 {

		return f32( resolution.x * resolution.y ) * luminance / ( 2.0 * PI * PI * totalWeight );

	}

`,[T]),He=class extends Ja{constructor(){super(),this.mapNode=Fa(this.map),this.mapSampler=$a(this.mapNode),this.marginalNode=Fa(this.marginalWeights),this.marginalSampler=$a(this.marginalNode),this.conditionalNode=Fa(this.conditionalWeights),this.conditionalSampler=$a(this.conditionalNode),this.rotationNode=Ma(new Jn),this.intensityNode=Ma(1),this.totalSumNode=Ma(this.totalSum),this._initFns()}getPixelWeight(e,t,r,a,s){let i=Math.PI*(a+.5)/s;return super.getPixelWeight(e,t,r)*Math.sin(i)}updateFrom(e){super.updateFrom(e);let{mapNode:t,marginalNode:r,conditionalNode:a,totalSumNode:s}=this;t.value=this.map,r.value=this.marginalWeights,a.value=this.conditionalWeights,s.value=this.totalSum}_initFns(){let{mapNode:e,mapSampler:t,marginalNode:r,marginalSampler:a,conditionalNode:s,conditionalSampler:i,totalSumNode:n,rotationNode:o,intensityNode:u}=this;this.sampleColor=h`
			fn sampleEnv( direction: vec3f ) -> vec4f {

				let sampleDir = ${o} * direction;
				let mapUv = ${Pe}( sampleDir );
				let col = textureSampleLevel( ${e}, ${t}, mapUv, 0 );

				return vec4f( ${u} * col.rgb, col.a );

			}
		`,this.sampleDir=h`
			fn sampleEnvDir( r: vec2f ) -> ${ga} {

				var result: ${ga};

				// walk the CDF: marginal picks the row (v), conditional picks the column (u)
				let v = textureSampleLevel( ${r}, ${a}, vec2f( r.x, 0.0 ), 0 ).x;
				let u = textureSampleLevel( ${s}, ${i}, vec2f( r.y, v ), 0 ).x;
				let uv = vec2f( u, v );
				let totalSum = ${n};

				let direction = ${ts}( uv );
				let color = textureSampleLevel( ${e}, ${t}, uv, 0 ).rgb;

				result.direction = transpose( ${o} ) * direction;
				result.color = color * ${u};

				if ( totalSum != 0.0 ) {

					let lum = ${dt}( color );
					let resolution = textureDimensions( ${e} );
					result.pdf = ${bs}( lum, totalSum, resolution );

				} else {

					result.pdf = 0.0;

				}

				return result;

			}
		`,this.getWeight=h`
			fn getEnvWeight() -> f32 {

				let resolution = textureDimensions( ${e} );
				return ${u} * ${ys} * ${ys} * ${n} / ( 2.0 * f32( resolution.x * resolution.y ) );

			}
		`,this.getDirPdf=h`
			fn getEnvDirPdf( direction: vec3f ) -> f32 {

				if ( ${n} == 0.0 ) {

					return 0.0;

				}

				let rotatedDir = ${o} * direction;
				let mapUv = ${Pe}( rotatedDir );
				let color = textureSampleLevel( ${e}, ${t}, mapUv, 0 ).rgb;
				let lum = ${dt}( color );
				let resolution = textureDimensions( ${e} );

				return ${bs}( lum, ${n}, resolution );

			}
		`}};import{DataTexture as tl,LinearFilter as Ss,Matrix4 as rl,RGBAFormat as al,RepeatWrapping as ws}from"three";import{sampler as il,texture as sl,uniform as Na}from"three/tsl";var Ve=class{get map(){return this.mapNode.value}set map(e){this.mapNode.value=e}get blur(){return this.blurNode.value}set blur(e){this.blurNode.value=e}get rotation(){return this.rotationNode.value}get intensity(){return this.intensityNode.value}set intensity(e){this.intensityNode.value=e}constructor(){let e=new tl(new Uint8Array([0,0,0,255]),1,1,al);e.minFilter=Ss,e.magFilter=Ss,e.wrapS=ws,e.wrapT=ws,e.generateMipmaps=!1,e.needsUpdate=!0,this.mapNode=sl(e),this.mapSampler=il(this.mapNode),this.blurNode=Na(0),this.rotationNode=Na(new rl),this.intensityNode=Na(1),this._initFns()}dispose(){this.map.dispose()}_initFns(){let{mapNode:e,mapSampler:t,blurNode:r,rotationNode:a,intensityNode:s}=this;this.sampleColor=h`
			fn sampleBackground( direction: vec3f, uv: vec2f ) -> vec4f {

				let rotatedDir = ( ${a} * vec4f( direction, 0.0 ) ).xyz;
				let offsetDir = ${es}( rotatedDir, uv ) * 0.5 * ${r};
				let sampleDir = normalize( rotatedDir + offsetDir );

				let mapUv = ${Pe}( sampleDir );
				let col = textureSampleLevel( ${e}, ${t}, mapUv, 0 );

				return vec4f( ${s} * col.rgb, col.a );

			}
		`}};import{storage as gl,uniform as xl,uniformArray as vl,texture as yl}from"three/tsl";import{StorageBufferAttribute as _s,HalfFloatType as bl}from"three/webgpu";import{MeshBasicMaterial as ol,RenderTarget as nl,NoToneMapping as ll,QuadMesh as cl,NoBlending as ul,Color as dl,Vector4 as Ba,Matrix3 as hl}from"three/webgpu";var fl=4096,Ts=new dl,Is=new hl;function Rs(c){return`${c.source.uuid}:${c.source.version}`}function pl(c,e,t,r){if(c[e].x+t>r)return-1;let s=t,i=0,n=e;for(;s>0;){if(n>=c.length)return-1;i=Math.max(i,c[n].y),s-=c[n].width,n++}return i}function ml(c,e,t,r){let a=e+r,s=[],i=!1;for(let n=0;n<c.length;n++){let o=c[n],u=o.x+o.width;u<=e?s.push(o):o.x>=a?(i||(s.push({x:e,y:t,width:r}),i=!0),s.push(o)):(i||(s.push({x:e,y:t,width:r}),i=!0),u>a&&s.push({x:a,y:o.y,width:u-a}))}i||s.push({x:e,y:t,width:r}),c.length=0;for(let n=0;n<s.length;n++){let o=s[n],u=c[c.length-1];u&&u.y===o.y&&u.x+u.width===o.x?u.width+=o.width:c.push(o)}}function Ds(c,e,t,r,a){let s=1/0,i=0,n=-1;for(let o=0;o<c.length;o++){let u=pl(c,o,e,r);u>=0&&u+t<=a&&u<s&&(s=u,i=c[o].x,n=o)}return n===-1?null:(ml(c,i,s+t,e),{x:i,y:s})}var Oe=class{get width(){return this.renderTarget.width}get height(){return this.renderTarget.height}get pageCount(){return this.renderTarget.depth}get texture(){return this.renderTarget.texture}constructor(e={}){this.renderTarget=new nl(1,1,{depthBuffer:!1,depth:1,...e}),this.texture.isArrayTexture=!0,this.textureInfo=[new Ba],this.hashes=[],this.placements=[],this.quadMesh=new cl(new ol),this.quadMesh.material.blending=ul}setTextures(e,t){let r=t.map((f,p)=>p);if(r.sort((f,p)=>t[f].source.uuid<t[p].source.uuid?-1:1),t=r.map(f=>t[f]),this._hashesMatch(t)){this._buildCallerTextureInfo(r);return}let a=t.reduce((f,p)=>Math.max(f,p.width,p.height),1);a=Math.min(fl,a);let s=a,i=a,{renderTarget:n}=this,{placements:o,pageCount:u}=this._packTextures(t,s,i);n.setSize(s,i,u),this.texture.isArrayTexture=!0,this._renderTextures(e,t,o),this.placements=o;let l=new Array(t.length);for(let f=0,p=t.length;f<p;f++){let m=Rs(t[f]);l[f]=m}this.hashes=l,this._buildCallerTextureInfo(r)}_buildCallerTextureInfo(e){let t=new Array(e.length);for(let r=0,a=e.length;r<a;r++)t[e[r]]=this.placements[r];this._buildTextureInfo(t)}dispose(){this.renderTarget.dispose(),this.quadMesh.material.dispose()}_hashesMatch(e){let t=this.hashes;if(t.length!==e.length)return!1;for(let r=0,a=e.length;r<a;r++)if(t[r]!==Rs(e[r]))return!1;return!0}_packTextures(e,t,r){let a=[];for(let o=0,u=e.length;o<u;o++){let l=e[o];a.push({index:o,w:Math.min(l.width,t),h:Math.min(l.height,r)})}let s=a.sort((o,u)=>u.h-o.h),i=new Array(e.length),n=[];for(let o=0,u=s.length;o<u;o++){let l=s[o],f=null,p=-1;for(let m=0;m<n.length;m++)if(f=Ds(n[m],l.w,l.h,t,r),f){p=m;break}if(!f){let m=[{x:0,y:0,width:t}];f=Ds(m,l.w,l.h,t,r),n.push(m),p=n.length-1}i[l.index]={x:f.x,y:f.y,w:l.w,h:l.h,page:p}}return{placements:i,pageCount:Math.max(n.length,1)}}_buildTextureInfo(e){let t=this.textureInfo;t.length=0;for(let r=0,a=e.length;r<a;r++){let{x:s,y:i,w:n,h:o,page:u}=e[r],l=new Ba;l.x=s&65535|(i&65535)<<16,l.y=n&65535|(o&65535)<<16,l.z=u&65535,l.w=0,t.push(l)}t.length===0&&t.push(new Ba(0,0,0,0))}_renderTextures(e,t,r){let{quadMesh:a,renderTarget:s,width:i,height:n}=this,o=e.getRenderTarget(),u=e.toneMapping,l=e.autoClear,f=e.getScissorTest(),p=e.getClearAlpha();e.getClearColor(Ts),e.toneMapping=ll,e.autoClear=!1,e.setScissorTest(!0),e.setClearColor(0,0);for(let m=0,d=s.depth;m<d;m++)s.viewport.set(0,0,i,n),s.scissor.set(0,0,i,n),e.setRenderTarget(s,m),e.clear();for(let m=0,d=t.length;m<d;m++){let{x:g,y:x,w:I,h:b,page:D}=r[m],y=t[m];if(s.viewport.set(g,x,I,b),s.scissor.set(g,x,I,b),e.setRenderTarget(s,D),y.isRenderTargetTexture){let C=y.matrixAutoUpdate;Is.copy(y.matrix),y.matrix.identity(),y.matrixAutoUpdate=!1,a.material.map=y,a.render(e),y.matrixAutoUpdate=C,y.matrix.copy(Is)}else{let C=y.clone();C.matrixAutoUpdate=!1,C.matrix.identity(),a.material.map=C,a.render(e),C.dispose()}}s.viewport.set(0,0,i,n),s.scissor.set(0,0,i,n),a.material.map=null,e.setClearColor(Ts,p),e.setScissorTest(f),e.autoClear=l,e.setRenderTarget(o),e.toneMapping=u}};var We=class extends ei{constructor(){super(),this.countNode=xl(this.count,"uint"),this.buffer=new _s(new Float32Array(2*ee.getLength()),ee.getLength()),this.bufferNode=gl(this.buffer,ee).toReadOnly().setName("lights"),this.iesAtlas=new Oe({type:bl}),this.iesProfilesNode=yl(this.iesAtlas.texture),this.iesInfoNode=vl(this.iesAtlas.textureInfo,"uvec4"),this._initFns()}updateFrom(e,t){let r=Array.from(new Set(t.map(l=>l.iesMap).filter(l=>l))),a=super.updateFrom(t,r);this.iesAtlas.setTextures(e,r),this.iesProfilesNode.value=this.iesAtlas.texture;let s=ee.getLength(),i=this.count,n=Math.max(i,2);this.buffer.array.length!==n*s&&(this.buffer.dispose(),this.buffer=new _s(new Float32Array(n*s),s),this.bufferNode.value=this.buffer);let o=this.tex.image.data;this.buffer.array.set(o.subarray(0,i*s));let u=new Int32Array(this.buffer.array.buffer);for(let l=0;l<i;l++){let f=l*s;u[f+3]=Math.round(o[f+3]),u[f+11]=Math.round(o[f+11]),u[f+21]=Math.round(o[f+21])}return this.buffer.needsUpdate=!0,this.countNode.value=this.count,a}_initFns(){let{bufferNode:e,countNode:t,iesProfilesNode:r,iesInfoNode:a}=this,s=Zt(a,r,"sampleIesTexel");this.isLightVisibleToCamera=h`
			fn isLightVisibleToCamera( index: u32 ) -> bool {

				return ${e}[ index ].visibleToCameraRays != 0;

			}
		`,this.getLightWeight=h`
			fn getLightWeight( index: u32, position: vec3f ) -> f32 {

				let light = ${e}[ index ];
				let power = ${dt}( light.color * light.intensity );
				if ( light.lightType == ${ya} ) {

					// the most any point on the spot's disc lights the position. Ies profiles are not
					// evaluated here
					let nearest = ${os}( light, position );
					var attenuation = 1.0;
					if ( light.iesProfile < 0 ) {

						attenuation = ${wa}( light.coneCos, light.penumbraCos, nearest.x );

					}

					return power * attenuation * ${ir}( nearest.y, light.distance, light.decay );

				} else if ( light.lightType == ${Sa} ) {

					// the point light's world position is packed into the u slot
					let dist = length( light.u - position );
					return power * ${ir}( dist, light.distance, light.decay );

				} else if ( light.lightType == ${ba} ) {

					return power;

				} else {

					let toLight = light.position - position;
					let distSq = dot( toLight, toLight );
					if ( distSq == 0.0 ) {

						return 0.0;

					}

					// area lights only emit from their front face, and the distance is held above the size
					// of the light so positions on or near it do not dominate
					let normal = normalize( cross( light.u, light.v ) );
					let cosTheta = dot( toLight, normal ) * inverseSqrt( distSq );
					return power * light.area * max( cosTheta, 0.0 ) / max( distSq, light.area );

				}

			}
		`,this.getLightsWeight=h`
			fn getLightsWeight( position: vec3f ) -> f32 {

				var total = 0.0;
				for ( var i = 0u; i < ${t}; i ++ ) {

					total += ${this.getLightWeight}( i, position );

				}

				return total;

			}
		`,this.selectLight=h`
			fn selectLight( position: vec3f, envWeight: f32, r: f32, selectionPdf: ptr<function, f32> ) -> u32 {

				let count = ${t};
				let totalWeight = ${this.getLightsWeight}( position ) + envWeight;
				if ( totalWeight <= 0.0 ) {

					*selectionPdf = 0.0;
					return 0u;

				}

				let targetWeight = r * totalWeight;
				var accumulated = 0.0;
				var lastWeighted = 0u;
				var index = count;
				for ( var i = 0u; i < count; i ++ ) {

					let lightWeight = ${this.getLightWeight}( i, position );
					accumulated += lightWeight;
					if ( lightWeight > 0.0 ) {

						lastWeighted = i;

					}

					if ( targetWeight < accumulated ) {

						index = i;
						break;

					}

				}

				// rounding can carry the target past the last light when there is no environment
				if ( index == count && envWeight <= 0.0 ) {

					index = lastWeighted;

				}

				var weight = envWeight;
				if ( index < count ) {

					weight = ${this.getLightWeight}( index, position );

				}

				*selectionPdf = weight / totalWeight;
				return index;

			}
		`,this.randomLightSample=h`
			fn randomLightSample( lightIndex: u32, rayOrigin: vec3f, ruv: vec2f ) -> ${P} {

				let light = ${e}[ lightIndex ];

				var result: ${P};
				if ( light.lightType == ${ya} ) {

					result = ${ss}( light, rayOrigin, ruv );

					let spotNormal = normalize( cross( light.u, light.v ) );
					let cosTheta = dot( result.direction, spotNormal );
					var spotAttenuation: f32;
					if ( light.iesProfile >= 0 ) {

						// half a texel of the profile's tile in the atlas
						let profileInfo = ${a}[ u32( light.iesProfile ) ];
						let texelInset = 0.5 / vec2f( vec2u( profileInfo.y & 0xFFFFu, profileInfo.y >> 16u ) );

						// tilt spans [ 0, 180 ]deg inset to the texel centers, twist covers [ 0, 359 ]deg and wraps
						let tiltAngle = mix( texelInset.x, 1.0 - texelInset.x, acos( cosTheta ) / PI );
						let twistAngle = ( atan2( dot( result.direction, light.v ), dot( result.direction, light.u ) ) + PI ) / ( 2.0 * PI ) + texelInset.y;
						let packedProfile = ( 1 << 26 ) | light.iesProfile;
						spotAttenuation = ${s}( vec2f( tiltAngle, twistAngle ), packedProfile, 0.0 ).r;

					} else {

						spotAttenuation = ${wa}( light.coneCos, light.penumbraCos, cosTheta );

					}

					result.emission *= spotAttenuation;

				} else if ( light.lightType == ${Sa} ) {

					// the point light's world position is packed into the u slot
					let lightRay = light.u - rayOrigin;
					let lightDist = length( lightRay );
					let cutoffDistance = light.distance;
					var distanceFalloff = 1.0 / max( pow( lightDist, light.decay ), 0.01 );
					if ( cutoffDistance > 0.0 ) {

						let window = clamp( 1.0 - pow( lightDist / cutoffDistance, 4.0 ), 0.0, 1.0 );
						distanceFalloff *= window * window;

					}

					result.direction = normalize( lightRay );
					result.dist = lightDist;
					result.pdf = 1.0;
					result.emission = light.color * light.intensity * distanceFalloff;
					result.lightType = light.lightType;

				} else if ( light.lightType == ${ba} ) {

					// the directional light's direction is packed into the u slot
					result.dist = ${ne};
					result.direction = light.u;
					result.pdf = 1.0;
					result.emission = light.color * light.intensity;
					result.lightType = light.lightType;

				} else {

					result = ${is}( light, rayOrigin, ruv );

				}

				return result;

			}
		`,this.intersectLightAtIndex=h`
			fn intersectLightAtIndex( rayOrigin: vec3f, rayDirection: vec3f, index: u32, lightRec: ptr<function, ${P}> ) -> bool {

				let light = ${e}[ index ];

				var u = light.u;
				var v = light.v;
				let normal = normalize( cross( u, v ) );

				// only front-facing area lights can be hit
				if ( dot( normal, rayDirection ) > 0.0 ) {

					u *= 1.0 / dot( u, u );
					v *= 1.0 / dot( v, v );

					var dist = - 1.0;
					if ( light.lightType == ${er} ) {

						dist = ${rs}( light.position, normal, u, v, rayOrigin, rayDirection );

					} else if ( light.lightType == ${tr} ) {

						dist = ${as}( light.position, normal, u, v, rayOrigin, rayDirection );

					}

					if ( dist > 0.0 ) {

						let cosTheta = dot( rayDirection, normal );
						lightRec.dist = dist;
						lightRec.pdf = ( dist * dist ) / ( light.area * cosTheta );
						lightRec.emission = light.color * light.intensity;
						lightRec.direction = rayDirection;
						lightRec.lightType = light.lightType;
						return true;

					}

				}

				return false;

			}
		`}dispose(){this.tex.dispose(),this.buffer.dispose(),this.iesAtlas.dispose()}};import{ColorManagement as Cs,FloatType as Fs,RGBAFormat as $s}from"three";import{RedIntegerFormat as Il,StorageTexture as Pa,UnsignedIntType as Rl}from"three/webgpu";import{StorageTexture as Sl}from"three/webgpu";import{textureStore as wl,globalId as Tl}from"three/tsl";var gt=class extends _{constructor(){let e={globalId:Tl,outputTarget:wl(new Sl(1,1)).toWriteOnly()},t=h`
			fn compute( globalId: vec3u ) -> void {

				textureStore( ${e.outputTarget}, globalId.xy, vec4( 0, 0, 0, 1 ) );

			}
		`;super(t(e)),this.defineUniformAccessors({target:e.outputTarget})}};var Ue=class{constructor(e){this.renderer=e,this.maxBounces=15,this.frameBudget=25e4,this.maxTransparentBounces=15,this.lowResMode=!1,this.maxSamples=0,this._renderTask=null,this.outputTarget=new Pa(1,1),this.outputTarget.format=$s,this.outputTarget.type=Fs,this.outputTarget.colorSpace=Cs.workingColorSpace,this.outputTarget.name="Output #0",this.outputTarget.generateMipmaps=!1,this.prevOutputTarget=new Pa(1,1),this.prevOutputTarget.format=$s,this.prevOutputTarget.type=Fs,this.prevOutputTarget.colorSpace=Cs.workingColorSpace,this.prevOutputTarget.name="Output #1",this.prevOutputTarget.generateMipmaps=!1,this.sampleCountTarget=new Pa(1,1),this.sampleCountTarget.format=Il,this.sampleCountTarget.type=Rl,this.sampleCountTarget.name="Sample Count",this.sampleCountTarget.generateMipmaps=!1,this.sampleCountClearKernel=new gt().setWorkgroupSize(8,8,1),this.outputTargetClearKernel=new gt().setWorkgroupSize(8,8,1)}setRandom(e){}setBVHData(e){}setTextures(e){}setMaterial(e){}setFilterGlossy(e){}setClamping(e,t){}setEnvironment(e,t,r){}setLights(e){}setBackground(e,t,r,a){}rebuild(){this._renderTask=null}setSize(e,t){e=Math.ceil(e),t=Math.ceil(t);let{width:r,height:a}=this.outputTarget;return r===e&&a===t?!1:(this.outputTarget.dispose(),this.prevOutputTarget.dispose(),this.sampleCountTarget.dispose(),this.outputTarget=this.outputTarget.clone(),this.prevOutputTarget=this.outputTarget.clone(),this.sampleCountTarget=this.sampleCountTarget.clone(),this.outputTarget.setSize(e,t),this.prevOutputTarget.setSize(e,t),this.sampleCountTarget.setSize(e,t),this.reset(),!0)}getSize(e){let{width:t,height:r}=this.outputTarget;return e.x=t,e.y=r,e}update(){let{renderer:e}=this;e.initialized&&(this._renderTask||(this._renderTask=this.createRenderTask()),this._renderTask.next())}*createRenderTask(){}async getSampleCountsAsync(){return{min:0,max:0,avg:0}}resetSeed(){}reset(){let{renderer:e,outputTargetClearKernel:t,sampleCountClearKernel:r,outputTarget:a,prevOutputTarget:s,sampleCountTarget:i}=this;if(!e.initialized)return;let{width:n,height:o}=a,u=t.getDispatchSize(n,o);t.target=a,e.compute(t.kernel,u),t.target=s,e.compute(t.kernel,u),r.target=i,e.compute(r.kernel,u),this._renderTask=null}dispose(){this.outputTarget.dispose(),this.prevOutputTarget.dispose(),this.sampleCountTarget.dispose(),this.sampleCountClearKernel.dispose(),this.outputTargetClearKernel.dispose(),this._renderTask=null}};var Aa=new Ns,xr=class extends Ue{constructor(e){super(e),this.envInfo=new He,this._completedSamples=0,this._tileProgress=0,this.kernel=new gr().setWorkgroupSize(8,8,1),this.kernel.envInfo=this.envInfo,this.backgroundInfo=new Ve,this.kernel.backgroundInfo=this.backgroundInfo,this.lightsInfo=new We,this.kernel.lightsInfo=this.lightsInfo}resetSeed(){this.kernel.seed=0}reset(){super.reset(),this._completedSamples=0,this._tileProgress=0}async getSampleCountsAsync(){if(this.lowResMode)return{min:0,max:0,avg:0};let e=this._completedSamples,t=this._tileProgress;return{min:t===1?e+1:e,max:e+1,avg:e+t}}setBVHData(e){this.kernel.bvhData=e,this.rebuild()}rebuild(){super.rebuild(),this.kernel.needsUpdate=!0,this.reset()}setRandom(e){this.kernel.context.random=e,this.kernel.needsUpdate=!0,this.reset()}setMaterial(e){this.kernel.material=e.getData(),this.kernel.needsUpdate=!0,this.reset()}setFilterGlossy(e){this.kernel.filterGlossy=e===0?nr:1/e,this.reset()}setClamping(e,t){this.kernel.clampDirect=e,this.kernel.clampIndirect=t,this.reset()}setEnvironment(e){this.envInfo.updateFrom(e)}setLights(e){this.lightsInfo.updateFrom(this.renderer,e),this.reset()}setMultipleImportanceSampling(e){this.kernel.misEnabled=e?1:0,this.reset()}setEnvironmentParams(e,t){let{envInfo:r}=this,a=new Ms().makeRotationFromEuler(t).invert();r.rotationNode.value.setFromMatrix4(a),r.intensityNode.value=e}setBackground(e){let{backgroundInfo:t}=this;t.dispose(),t.map=e}setBackgroundParams(e,t,r){let{backgroundInfo:a}=this,s=new Ms().makeRotationFromEuler(t).invert();a.rotationNode.value.copy(s),a.intensity=e,a.blur=r}setTransmissiveBackground(e){this.kernel.transmissiveBackground=e,this.reset()}*createRenderTask(){let{renderer:e,kernel:t,maxBounces:r,maxTransparentBounces:a,outputTarget:s,sampleCountTarget:i,lowResMode:n}=this,o=new Ns;t.outputTarget=s,t.sampleCountTarget=i,t.maxBounces=r,t.maxTransparentBounces=a;let u=0;for(;;){if(t.maxSamples=this.maxSamples,this.maxSamples!==0&&u>=this.maxSamples){yield;continue}this.getSize(Aa);let l=Math.max(1,Math.ceil(Aa.x*Aa.y/this.frameBudget));o.x=Math.ceil(Math.sqrt(l)),o.y=Math.ceil(l/o.x);let f=this.lowResMode?1:o.x*o.y,p=0,m=t.tileSize;n?this.getSize(m):this.getSize(m).divide(o).ceil();let d=t.getDispatchSize(m.x,m.y);t.seed+=1,e.copyTextureToTexture(this.outputTarget,this.prevOutputTarget),[this.outputTarget,this.prevOutputTarget]=[this.prevOutputTarget,this.outputTarget],t.prevOutputTarget=this.prevOutputTarget,t.outputTarget=this.outputTarget;for(let g=0;g<o.x;g++)for(let x=0;x<o.y;x++)t.offset.set(g,x).multiply(m),e.compute(t.kernel,d),p=Math.min(p+1,f),this._completedSamples=u,this._tileProgress=p/f,yield;u++}}dispose(){super.dispose(),this.envInfo.dispose(),this.lightsInfo.dispose(),this.kernel.dispose()}};import{Matrix4 as eo,StorageBufferAttribute as Re,Vector2 as Ql}from"three/webgpu";import{Vector2 as Dl}from"three";import{StorageBufferAttribute as Bs}from"three/webgpu";import{uniform as Ps,storage as As,globalId as _l}from"three/tsl";import{StructTypeNode as vr}from"three/webgpu";var qe=class extends vr{constructor(e,t,r=[]){super(e,t),this.dependencies=r}setup(e){for(let t of this.dependencies)t.build(e);super.setup(e)}},z=new vr({throughputColor:"vec3f",currentBounce:"uint",resultColor:"vec4f",emission:"vec3f",scatterPdf:"float",scatterColor:"vec3f",minPdf:"float",origin:"vec3f",isFullyTransmissive:"uint",direction:"vec3f",side:"float",normal:"vec3f",objectIndex:"int",barycoord:"vec3f",pixelIndex:"uint",indices:"vec3u",seed:"uint",lightDirection:"vec3f",lightPdf:"float",lightEmission:"vec3f",lightDist:"float",lightBsdf:"vec3f",lightBsdfPdf:"float",rayIntersectionIndex:"int",shadowRayIntersectionIndex:"int",lightType:"int",dist:"float",alphaDepth:"uint",maxDist:"float",dispersionWavelength:"float"},"RayData"),Ge=new vr({origin:"vec3f",pixelIndex:"uint",direction:"vec3f",currentBounce:"uint",seed:"uint",alphaDepth:"uint",maxDist:"float",_alignment0:"uint"},"TraceQueuedRay"),X=new vr({barycoord:"vec3f",objectIndex:"int",position:"vec3f",dist:"float",normal:"vec3f",side:"float",indices:"vec3u",forwardBlocked:"uint"},"TraceResult"),we=new qe({length:"uint",elements:`array<${Ge.name}>`},"RayQueue",[Ge]);we.getLength=()=>4;var Qe=new qe({length:{type:"uint",atomic:!0},elements:`array<${Ge.name}>`},"RayQueue",[Ge]);Qe.getLength=()=>4;var Te=new qe({current:{type:"uint",atomic:!0},elementCount:{type:"uint",atomic:!0},elements:"array<atomic<u32>>"},"PixelQueue");Te.getLength=()=>2;var La=new qe({current:"uint",elementCount:"uint",elements:"array<u32>"},"PixelQueue");La.getLength=()=>2;var yr=class extends _{constructor(){let e={rayDataStorage:As(new Bs(1,1),z),pixelQueue:As(new Bs(1,1),La),targetDimensions:Ps(new Dl),frameBudget:Ps(0,"uint"),globalId:_l},t=h`
			fn compute( targetDimensions: vec2u, frameBudget: u32, globalId: vec3u ) -> void {

				let rayDataStorage = &${e.rayDataStorage};
				let pixelQueue = &${e.pixelQueue};

				if ( globalId.x >= targetDimensions.x || globalId.y >= targetDimensions.y ) {

					return;

				}

				let rayCount = min( frameBudget, arrayLength( rayDataStorage ) );
				let pixelCount = targetDimensions.x * targetDimensions.y;
				if ( globalId.x == 0u && globalId.y == 0u ) {

					pixelQueue.current = 0u;
					pixelQueue.elementCount = select( 0u, pixelCount - rayCount, pixelCount >= rayCount );

				}

				let pixelHash = ( globalId.x << 16 ) | globalId.y;
				let pixelIndex = globalId.x + globalId.y * targetDimensions.x;
				if ( pixelIndex < rayCount ) {

					rayDataStorage[ pixelIndex ].pixelIndex = pixelHash;
					rayDataStorage[ pixelIndex ].resultColor = vec4f( 0.0 );
					rayDataStorage[ pixelIndex ].throughputColor = vec3f( 0.0 );
					rayDataStorage[ pixelIndex ].objectIndex = - 1;
					rayDataStorage[ pixelIndex ].alphaDepth = 0u;
					rayDataStorage[ pixelIndex ].rayIntersectionIndex = - 1;
					rayDataStorage[ pixelIndex ].shadowRayIntersectionIndex = - 1;

				} else {

					pixelQueue.elements[ pixelIndex - rayCount ] = pixelHash;

				}

			}
		`;super(t(e)),this.defineUniformAccessors(e)}};import{StorageBufferAttribute as Ea,StorageTexture as za}from"three/webgpu";import{uniform as je,storage as ka,textureStore as Ha,globalId as Cl}from"three/tsl";var br=class extends _{constructor(){let e={envInfo:{value:null},backgroundInfo:{value:null},lightsInfo:{value:null},prevOutputTarget:Ha(new za(1,1)).toReadOnly(),outputTarget:Ha(new za(1,1)).toWriteOnly(),sampleCountTarget:Ha(new za(1,1)).toReadWrite(),misEnabled:je(1,"uint"),rayCount:je(0,"uint"),maxBounces:je(5,"uint"),clampDirect:je(0),clampIndirect:je(10),transmissiveBackground:je(ze),rayDataStorage:ka(new Ea(1,1),z),rayIntersectionsStorage:ka(new Ea(1,1),X),shadowRayIntersectionsStorage:ka(new Ea(1,1),X),globalId:Cl},t=R("envInfo.value.totalSumNode",e),r=R("envInfo.value.intensityNode",e),a=R("envInfo.value.sampleColor",e),s=R("envInfo.value.sampleDir",e),i=R("envInfo.value.getDirPdf",e),n=R("envInfo.value.getWeight",e),o=R("backgroundInfo.value.sampleColor",e),u=R("lightsInfo.value.countNode",e),l=w("lightsInfo.value.randomLightSample",e),f=w("lightsInfo.value.intersectLightAtIndex",e),p=w("lightsInfo.value.getLightWeight",e),m=w("lightsInfo.value.getLightsWeight",e),d=w("lightsInfo.value.selectLight",e),g=w("lightsInfo.value.isLightVisibleToCamera",e),x=h`

			fn compute(
				// settings
				misEnabled: u32,
				rayCount: u32,
				maxBounces: u32,
				clampDirect: f32,
				clampIndirect: f32,
				transmissiveBackground: u32,

				globalId: vec3u
			) -> void {

				let rayDataStorage = &${e.rayDataStorage};
				let rayIntersectionsStorage = &${e.rayIntersectionsStorage};
				let shadowRayIntersectionsStorage = &${e.shadowRayIntersectionsStorage};

				// bound by "rayCount" rather than the pool length. See MaterialKernel
				let index = globalId.x;
				if ( index >= rayCount ) {

					return;

				}

				// skip slots that have never spawned a ray
				let input = ( *rayDataStorage )[ index ];
				if ( input.rayIntersectionIndex < 0 ) {

					return;

				}

				let indexUV = vec2u( input.pixelIndex >> 16, input.pixelIndex & 0xFFFF );
				${V}( indexUV, input.seed, input.currentBounce + input.alphaDepth );

				// one-sample NEE chooses between the analytic lights and the environment, matched with
				// the megakernel
				let envActive = ${t} > 0.0 && ${r} > 0.0;
				let lightsCount = ${u};
				var envWeight = 0.0;
				if ( envActive ) {

					envWeight = ${n}();

				}

				var resultColor = input.resultColor;
				var throughputColor = input.throughputColor;

				// added last, since a camera ray miss overwrites the pixel with the background
				var lightHits = vec3f( 0.0 );
				var cameraHitLight = false;

				// resolve the previous surface's NEE shadow ray (pre-scatter throughput). The index
				// is negative when no shadow ray was enqueued last frame
				if ( input.shadowRayIntersectionIndex >= 0 && input.lightPdf > 0.0 ) {

					let shadowHit = ( *shadowRayIntersectionsStorage )[ u32( input.shadowRayIntersectionIndex ) ];
					let occluded = shadowHit.objectIndex >= 0;
					if ( ! occluded ) {

						// env + area lights are also bsdf-sampled, so MIS-weight them; punctual take full weight,
						// or when a bsdf ray could never reach the light
						let isMISWeighted = ${ar}( input.lightType ) && shadowHit.forwardBlocked == 0u;
						let misWeight = select( 1.0, ${K}( input.lightPdf, input.lightBsdfPdf ), isMISWeighted );
						let directLight = throughputColor * input.lightEmission * input.lightBsdf * misWeight / input.lightPdf;
						let contribution = ${$}( directLight, input.currentBounce, clampDirect, clampIndirect );
						resultColor += vec4f( contribution, 0.0 );

					}

				}

				// emission gathered at the previous surface (pre-scatter throughput). Found light clamps
				// at the depth of the segment that found it, as in Cycles, so one less than the current
				let emission = ${$}( throughputColor * input.emission, max( input.currentBounce, 1u ) - 1u, clampDirect, clampIndirect );
				resultColor += vec4f( emission, 0.0 );

				// reconstruct the scatter record staged by MaterialKernel
				var scatterRec: ${J};
				scatterRec.color = input.scatterColor;
				scatterRec.pdf = input.scatterPdf;

				// the bounce limit, russian roulette, and terminating scatter checks all ran in
				// MaterialKernel, which stages a zeroed pdf and skips the bounce trace when they fire
				var isTerminated = all( throughputColor == vec3f( 0.0 ) ) || input.currentBounce >= maxBounces || ${Be}( scatterRec );

				if ( ! isTerminated ) {

					// apply the scatter across the traced segment
					throughputColor *= scatterRec.color / scatterRec.pdf;

					let hitResult = ( *rayIntersectionsStorage )[ u32( input.rayIntersectionIndex ) ];
					let didHit = hitResult.objectIndex >= 0;
					let surfaceDist = select( ${ne}, hitResult.dist, didHit );

					// NEE's total weight at the vertex this segment left, for MIS. Camera segments have none
					let isMISWeighted = misEnabled != 0u && input.currentBounce > 0u;
					var lightTotalWeight = 0.0;
					if ( isMISWeighted ) {

						lightTotalWeight = ${m}( input.origin ) + envWeight;

					}

					// forward hits on area lights. Camera rays only see visibleToCameraRays lights, at full weight
					for ( var li = 0u; li < lightsCount; li ++ ) {

						if ( input.currentBounce == 0u && ! ${g}( li ) ) {

							continue;

						}

						var lightRec: ${P};
						if ( ${f}( input.origin, input.direction, li, &lightRec ) && lightRec.dist < surfaceDist ) {

							var misWeight = 1.0;
							if ( isMISWeighted ) {

								let selectionPdf = ${p}( li, input.origin ) / lightTotalWeight;
								misWeight = ${K}( input.scatterPdf, lightRec.pdf * selectionPdf );

							}

							lightHits += ${$}( lightRec.emission * throughputColor * misWeight, input.currentBounce, clampDirect, clampIndirect );
							cameraHitLight = cameraHitLight || input.currentBounce == 0u;

						}

					}

					if ( didHit ) {

						// stage the hit for MaterialKernel
						rayDataStorage[ index ].barycoord = hitResult.barycoord;
						rayDataStorage[ index ].normal = hitResult.normal;
						rayDataStorage[ index ].side = hitResult.side;
						rayDataStorage[ index ].indices = hitResult.indices;
						rayDataStorage[ index ].objectIndex = hitResult.objectIndex;
						rayDataStorage[ index ].dist = hitResult.dist;

						// next event estimation: choose one light or the environment by its estimated
						// contribution. MaterialKernel evaluates the bsdf and enqueues the shadow ray.
						var lightPdf = 0.0;
						if ( misEnabled != 0u ) {

							let ruv = ${Me}( ${Gt} );
							var selectionPdf = 0.0;
							let lightIndex = ${d}( hitResult.position, envWeight, ruv.x, &selectionPdf );
							if ( selectionPdf > 0.0 ) {

								var lightRec: ${P};
								if ( envActive && lightIndex == lightsCount ) {

									// the environment, sampled from its CDF, as a light of kind ENVIRONMENT
									let envSample = ${s}( ruv.yz );
									lightRec.direction = envSample.direction;
									lightRec.emission = envSample.color;
									lightRec.pdf = envSample.pdf;
									lightRec.dist = ${ne};
									lightRec.lightType = ${ht};

								} else {

									lightRec = ${l}( lightIndex, hitResult.position, ruv.yz );

								}

								lightPdf = lightRec.pdf * selectionPdf;
								rayDataStorage[ index ].lightDirection = lightRec.direction;
								rayDataStorage[ index ].lightEmission = lightRec.emission;
								rayDataStorage[ index ].lightDist = lightRec.dist;
								rayDataStorage[ index ].lightType = lightRec.lightType;

							}

						}

						rayDataStorage[ index ].lightPdf = lightPdf;

					} else {

						// the segment escaped the scene: gather the environment for opaque paths, or
						// the background for camera segments and fully transmissive paths
						if ( input.currentBounce > 0u && input.isFullyTransmissive == 0u ) {

							var misWeight = 1.0;
							if ( isMISWeighted && envActive ) {

								// match the env pdf scaling used by the NEE selection so the two estimators balance
								let envPdf = ${i}( input.direction ) * envWeight / lightTotalWeight;
								misWeight = ${K}( input.scatterPdf, envPdf );

							}

							let environment = ${a}( input.direction ).rgb * throughputColor * misWeight;
							let contribution = ${$}( environment, input.currentBounce, clampDirect, clampIndirect );
							resultColor += vec4f( contribution, 0.0 );

						} else {

							// hit the background
							// support multiple transparent background blending techniques
							let rng = ${O}( ${Ut} );
							let bg = ${o}( input.direction, rng );
							if ( input.currentBounce == 0u ) {

								// sample the background directly if this is the primary ray
								let background = ${$}( bg.a * bg.rgb, input.currentBounce, clampDirect, clampIndirect );
								resultColor = vec4f( background, bg.a );

							} else {

								// transmissive ray handling
								let env = ${a}( input.direction );
								let avg = saturate( dot( throughputColor, vec3f( 1.0 / 3.0 ) ) );
								let transparency = ( 1.0 - bg.a ) * avg;

								var misWeight = 1.0;
								if ( misEnabled != 0u && envActive ) {

									let envPdf = ${i}( input.direction );
									misWeight = ${K}( input.scatterPdf, envPdf );

								}

								if ( transmissiveBackground == ${pr}u ) {

									// display the env map through transmissive surfaces
									let background = ${$}( env.rgb * throughputColor * misWeight, input.currentBounce, clampDirect, clampIndirect );
									resultColor = vec4f(
										resultColor.rgb + background,
										1.0,
									);

								} else if ( transmissiveBackground == ${mr}u ) {

									// fade the background by the throughput color average
									let background = ${$}( bg.a * bg.rgb * throughputColor * misWeight, input.currentBounce, clampDirect, clampIndirect );
									resultColor = vec4f(
										resultColor.rgb + background,
										1.0 - transparency,
									);

								} else {

									// fade the background by the throughput color average, mixing in env lighting
									var light = mix( env.rgb, bg.rgb, bg.a ) * misWeight;
									let background = ${$}( light * throughputColor, input.currentBounce, clampDirect, clampIndirect );
									resultColor = vec4f(
										resultColor.rgb + background,
										1.0 - transparency,
									);

								}

							}

						}

						isTerminated = true;

					}

				}

				// visible lights are opaque against a transparent background
				resultColor += vec4f( lightHits, 0.0 );
				if ( cameraHitLight ) {

					resultColor.a = 1.0;

				}

				// the color rows are stored top down to match a rasterized render target
				let colorIndex = vec2u( indexUV.x, textureDimensions( ${e.outputTarget} ).y - 1u - indexUV.y );
				let storedSamples = textureLoad( ${e.sampleCountTarget}, indexUV ).r & ${le}u;

				if ( isTerminated ) {

					// blend the finished sample into the output and free the slot for a new camera ray
					let sampleCount = storedSamples + 1;
					let prevColor = textureLoad( ${e.prevOutputTarget}, colorIndex );
					let blendedColor = ${Jt}( prevColor, resultColor, 1.0 / f32( sampleCount ) );
					textureStore( ${e.sampleCountTarget}, indexUV, vec4( ${ke}u | sampleCount ) );
					textureStore( ${e.outputTarget}, colorIndex, blendedColor );

					rayDataStorage[ index ].objectIndex = - 1;

				} else {

					// show the path so far, which the first sample overwrites
					if ( storedSamples == 0u ) {

						textureStore( ${e.outputTarget}, colorIndex, resultColor );

					}

					rayDataStorage[ index ].resultColor = resultColor;
					rayDataStorage[ index ].throughputColor = throughputColor;

				}

			}
		`;super(x(e)),this.defineUniformAccessors(e)}};import{Vector2 as Fl}from"three";import{StorageBufferAttribute as Sr,StorageTexture as $l}from"three/webgpu";import{uniform as Ie,storage as wr,textureStore as Ml,globalId as Nl}from"three/tsl";var Tr=class extends _{constructor(){let e={bvhData:{value:null},material:{value:null},seed:Ie(0,"uint"),targetDimensions:Ie(new Fl),maxSamples:Ie(0,"uint"),rayCount:Ie(0,"uint"),filterGlossy:Ie(1),maxTransparentBounces:Ie(5,"uint"),maxBounces:Ie(5,"uint"),sampleCountTarget:Ml(new $l(1,1)).toReadWrite(),rayDataStorage:wr(new Sr(1,1),z),rayQueue:wr(new Sr(1,1),Qe),shadowRayQueue:wr(new Sr(1,1),Qe),pixelQueue:wr(new Sr(1,1),Te),globalId:Nl},t=w("bvhData.value.fns.getCameraRay",e),r=w("bvhData.value.fns.sampleTrianglePoint",e),a=w("bvhData.value.fns.getSurfaceRecord",e),s=w("material.value.bsdfSample",e),i=w("material.value.bsdfEvalPdf",e),n=h`

			fn compute(
				seed: u32,
				targetDimensions: vec2u,
				maxSamples: u32,
				rayCount: u32,
				filterGlossy: f32,
				maxTransparentBounces: u32,
				maxBounces: u32,

				globalId: vec3u
			) -> void {

				let rayDataStorage = &${e.rayDataStorage};
				let rayQueue = &${e.rayQueue};
				let shadowRayQueue = &${e.shadowRayQueue};
				let pixelQueue = &${e.pixelQueue};

				let materials = &${R("bvhData.value.storage.materials",e)};
				let transforms = &${R("bvhData.value.storage.transforms",e)};

				// bound by "rayCount" rather than the pool length. The dispatch rounds up to the
				// workgroup size and those extra slots hold a zeroed pixel index
				let index = globalId.x;
				if ( index >= rayCount ) {

					return;

				}

				let input = ( *rayDataStorage )[ index ];
				if ( input.objectIndex < 0 ) {

					// the slot's path has terminated: recycle the pixel through the overflow queue and
					// generate a fresh camera ray
					var pixelIndex = input.pixelIndex;
					let elementCount = atomicLoad( &pixelQueue.elementCount );
					if ( elementCount > 0u ) {

						// TODO: If we've pulled off a pixel that's already finished we currently just
						// write a no-op ray, wasting a frame. It may be better to iterate over a few
						// points in the queue to see if we can find one we can use.
						let queueIndex = atomicAdd( &pixelQueue.current, 1u ) % elementCount;
						pixelIndex = atomicExchange( &pixelQueue.elements[ queueIndex ], pixelIndex );

					}

					let indexUV = vec2u( pixelIndex >> 16, pixelIndex & 0xFFFF );

					// skip the pixel if it has hit the sample limit
					let combinedField = textureLoad( ${e.sampleCountTarget}, indexUV ).r;
					let samples = ( ${le}u & combinedField );
					let isComplete = maxSamples != 0u && samples >= maxSamples;

					if ( isComplete ) {

						rayDataStorage[ index ].pixelIndex = pixelIndex;
						rayDataStorage[ index ].rayIntersectionIndex = - 1;
						rayDataStorage[ index ].shadowRayIntersectionIndex = - 1;
						return;

					}

					${V}( indexUV, seed + samples, 0 );

					let uv = vec2f( indexUV ) / vec2f( targetDimensions );
					let jitteredUv = uv + ${O}( ${Wt} ) / vec2f( targetDimensions );
					var ray: ${v};
					if ( ! ${t}( jitteredUv, vec2f( targetDimensions ), &ray ) ) {

						// the camera declined the pixel, so leave the slot dormant for this round
						// TODO: same as above - this work is a bit wasteful and leaves slots empty for
						// a frame. Is it possible to quickly skip rays outside the mask or are finished?
						rayDataStorage[ index ].pixelIndex = pixelIndex;
						rayDataStorage[ index ].rayIntersectionIndex = - 1;
						rayDataStorage[ index ].shadowRayIntersectionIndex = - 1;
						return;

					}

					ray.direction = normalize( ray.direction );

					let rayIndex = atomicAdd( &rayQueue.length, 1u );
					rayQueue.elements[ rayIndex ].origin = ray.origin;
					rayQueue.elements[ rayIndex ].direction = ray.direction;
					rayQueue.elements[ rayIndex ].pixelIndex = pixelIndex;
					rayQueue.elements[ rayIndex ].currentBounce = 0u;
					rayQueue.elements[ rayIndex ].seed = seed + samples;
					rayQueue.elements[ rayIndex ].alphaDepth = 0u;
					rayQueue.elements[ rayIndex ].maxDist = ray.maxDist;

					rayDataStorage[ index ].origin = ray.origin;
					rayDataStorage[ index ].direction = ray.direction;
					rayDataStorage[ index ].pixelIndex = pixelIndex;
					rayDataStorage[ index ].seed = seed + samples;
					rayDataStorage[ index ].currentBounce = 0u;
					rayDataStorage[ index ].throughputColor = vec3f( 1.0 );
					rayDataStorage[ index ].resultColor = vec4f( 0.0, 0.0, 0.0, 1.0 );
					rayDataStorage[ index ].scatterColor = vec3f( 1.0 );
					rayDataStorage[ index ].scatterPdf = 1.0;
					rayDataStorage[ index ].minPdf = 1.0;
					rayDataStorage[ index ].isFullyTransmissive = 1u;
					rayDataStorage[ index ].emission = vec3f( 0.0 );
					rayDataStorage[ index ].lightPdf = 0.0;
					rayDataStorage[ index ].alphaDepth = 0u;
					rayDataStorage[ index ].maxDist = ray.maxDist;
					rayDataStorage[ index ].rayIntersectionIndex = i32( rayIndex );
					rayDataStorage[ index ].shadowRayIntersectionIndex = - 1;
					rayDataStorage[ index ].dispersionWavelength = - mix( ${Le}.0, ${Ee}.0, ${q}( ${jt} ) );

					// write the active params & dispatched flag
					textureStore( ${e.sampleCountTarget}, indexUV, vec4( ${gs}u | ${ke}u | samples ) );

				} else {

					// evaluate the surface staged by LogicKernel
					let indexUV = vec2u( input.pixelIndex >> 16, input.pixelIndex & 0xFFFF );
					${V}( indexUV, input.seed, input.currentBounce + input.alphaDepth );

					let objectInfo = transforms[ u32( input.objectIndex ) ];
					var materialInfo = ( *materials )[ objectInfo.materialIndex ];

					// a matte surface hit by the camera ray renders as a fully transparent
					let isMatte = materialInfo.matte != 0 && input.currentBounce == 0u;
					if ( isMatte ) {

						rayDataStorage[ index ].resultColor = vec4f( 0.0 );
						rayDataStorage[ index ].throughputColor = vec3f( 0.0 );
						rayDataStorage[ index ].emission = vec3f( 0.0 );
						rayDataStorage[ index ].lightPdf = 0.0;
						rayDataStorage[ index ].shadowRayIntersectionIndex = - 1;
						return;

					}

					// apply per-object colors
					materialInfo.color *= objectInfo.color.rgb;
					materialInfo.opacity *= objectInfo.color.a;

					var vertexData = ${r}( input.barycoord, input.indices );
					vertexData.normal = normalize( transpose( objectInfo.inverseMatrixWorld ) * vertexData.normal );
					vertexData.tangent = vec4f( ( objectInfo.matrixWorld * vec4f( vertexData.tangent.xyz, 0.0 ) ).xyz, vertexData.tangent.w );
					vertexData.position = objectInfo.matrixWorld * vertexData.position;

					let view = - input.direction;

					// blur glossy surfaces after low-probability bounces to suppress fireflies,
					// from the Cycles "filter glossy" approach in integrator/surface_shader.h
					let blurRoughness = sqrt( clamp( 1.0 - filterGlossy * input.minPdf, 0.0, 1.0 ) ) * 0.5;

					var surface = ${a}( materialInfo, vertexData, input.side, input.normal, view, blurRoughness );

					// Stochastically pass through partially transparent surfaces by re-enqueueing
					// the ray at the hit point, advancing the alpha depth but not the bounce count.
					let passesThrough = ${q}( ${Kt} ) > surface.opacity;
					if ( passesThrough ) {

						// out of transparent bounces, so stop rather than shading a surface that
						// should be invisible. A zeroed throughput terminates in LogicKernel.
						if ( input.alphaDepth >= maxTransparentBounces ) {

							rayDataStorage[ index ].throughputColor = vec3f( 0.0 );
							rayDataStorage[ index ].emission = vec3f( 0.0 );
							rayDataStorage[ index ].lightPdf = 0.0;
							rayDataStorage[ index ].shadowRayIntersectionIndex = - 1;
							return;

						}

						let alphaIndex = atomicAdd( &rayQueue.length, 1u );
						rayQueue.elements[ alphaIndex ].origin = ${se}( vertexData.position.xyz, input.direction, input.normal );
						rayQueue.elements[ alphaIndex ].direction = input.direction;
						rayQueue.elements[ alphaIndex ].pixelIndex = input.pixelIndex;
						rayQueue.elements[ alphaIndex ].currentBounce = input.currentBounce;
						rayQueue.elements[ alphaIndex ].seed = input.seed;
						rayQueue.elements[ alphaIndex ].alphaDepth = input.alphaDepth + 1u;
						// the origin advanced to the hit point, so the remaining budget shrinks by the
						// distance already traced
						rayQueue.elements[ alphaIndex ].maxDist = max( input.maxDist - input.dist, 0.0 );

						// the surface is skipped, so no scatter or emission is staged for LogicKernel.
						// "pdf" is left alone so the previous scatter still weights the forward MIS,
						// and "bsdf" matches it so applying the scatter leaves the throughput as is.
						rayDataStorage[ index ].alphaDepth = input.alphaDepth + 1u;
						rayDataStorage[ index ].emission = vec3f( 0.0 );
						rayDataStorage[ index ].scatterColor = vec3f( input.scatterPdf );
						rayDataStorage[ index ].lightPdf = 0.0;
						rayDataStorage[ index ].origin = rayQueue.elements[ alphaIndex ].origin;
						rayDataStorage[ index ].rayIntersectionIndex = i32( alphaIndex );
						rayDataStorage[ index ].shadowRayIntersectionIndex = - 1;
						return;

					}

					// apply the hero wavelength to dispersive surfaces, folding the spectral weight
					// into the throughput at the path's first dispersive interaction
					var throughputColor = input.throughputColor;
					let isDispersive = materialInfo.dispersion > 0.0 && surface.ior > 1.0 && surface.transmission > 0.0 && ! surface.thinWall;
					if ( isDispersive ) {

						let wavelength = abs( input.dispersionWavelength );
						${ur}( &surface, materialInfo.dispersion, wavelength );
						if ( input.dispersionWavelength < 0.0 ) {

							rayDataStorage[ index ].dispersionWavelength = wavelength;
							throughputColor *= ${dr}( wavelength );
							rayDataStorage[ index ].throughputColor = throughputColor;

						}

					}

					// attenuate the light transmitted through the volume when exiting a backface so
					// the surface's emission and NEE resolve against the attenuated throughput
					if ( input.side < 0.0 && materialInfo.transmission > 0.0 ) {

						throughputColor *= ${cr}( input.dist, materialInfo.attenuationColor, materialInfo.attenuationDistance );
						rayDataStorage[ index ].throughputColor = throughputColor;

					}

					// sample the next bounce direction and stage the scatter state for LogicKernel
					var scatterRec = ${s}( view, surface );
					let newBounce = input.currentBounce + 1u;

					// decide termination now so finished paths skip the bounce trace entirely - a
					// zeroed pdf reads as a terminating scatter in LogicKernel, which still resolves
					// the surface's emission and NEE before freeing the slot
					var isTerminated = newBounce >= maxBounces || all( scatterRec.color == vec3f( 0.0 ) ) || ${Be}( scatterRec );

					// russian roulette early out:
					// Matches Cycles path_state_continuation_probability in integrator/path_state.h
					if ( ! isTerminated && newBounce >= 3u ) {

						let rrThroughput = throughputColor * scatterRec.color / scatterRec.pdf;
						let rrProb = saturate( sqrt( max( max( rrThroughput.r, rrThroughput.g ), rrThroughput.b ) ) );
						isTerminated = rrProb <= 0.0 || ${q}( ${Qt} ) > rrProb;
						if ( ! isTerminated ) {

							// fold the survival boost into the scatter color so LogicKernel's
							// throughput update applies it without a separate division
							scatterRec.color /= rrProb;

						}

					}

					// Write the ray storage content here since things like the emissive value is read
					// in the logic kernel on the subsequent frame.
					rayDataStorage[ index ].scatterColor = scatterRec.color;
					rayDataStorage[ index ].scatterPdf = select( scatterRec.pdf, 0.0, isTerminated );
					rayDataStorage[ index ].minPdf = min( input.minPdf, scatterRec.pdf );
					rayDataStorage[ index ].isFullyTransmissive = input.isFullyTransmissive & select( 0u, 1u, scatterRec.isTransmissive );
					rayDataStorage[ index ].emission = surface.emission;
					rayDataStorage[ index ].currentBounce = newBounce;

					// the NEE shadow ray below still resolves the surface's direct light, so only
					// the bounce segment is skipped for finished paths
					if ( ! isTerminated ) {

						let rayIndex = atomicAdd( &rayQueue.length, 1u );
						rayQueue.elements[ rayIndex ].origin = ${se}( vertexData.position.xyz, scatterRec.direction, input.normal );
						rayQueue.elements[ rayIndex ].direction = scatterRec.direction;
						rayQueue.elements[ rayIndex ].pixelIndex = input.pixelIndex;
						rayQueue.elements[ rayIndex ].currentBounce = newBounce;
						rayQueue.elements[ rayIndex ].seed = input.seed;
						rayQueue.elements[ rayIndex ].alphaDepth = input.alphaDepth;
						rayQueue.elements[ rayIndex ].maxDist = 0.0;
						rayDataStorage[ index ].rayIntersectionIndex = i32( rayIndex );

						rayDataStorage[ index ].origin = rayQueue.elements[ rayIndex ].origin;
						rayDataStorage[ index ].direction = scatterRec.direction;

					}

					// evaluate the bsdf toward the light LogicKernel selected and enqueue the shadow ray.
					// the light pdf will be 0 if NEE is disabled.
					var lightPdf = input.lightPdf;
					if ( lightPdf > 0.0 ) {

						let evalRec = ${i}( view, input.lightDirection, surface );
						if ( evalRec.pdf > 0.0 ) {

							rayDataStorage[ index ].lightBsdf = evalRec.color;
							rayDataStorage[ index ].lightBsdfPdf = evalRec.pdf;

							let shadowIndex = atomicAdd( &shadowRayQueue.length, 1u );
							shadowRayQueue.elements[ shadowIndex ].origin = ${se}( vertexData.position.xyz, input.lightDirection, input.normal );
							shadowRayQueue.elements[ shadowIndex ].direction = input.lightDirection;
							shadowRayQueue.elements[ shadowIndex ].pixelIndex = input.pixelIndex;
							shadowRayQueue.elements[ shadowIndex ].currentBounce = input.currentBounce;
							shadowRayQueue.elements[ shadowIndex ].seed = input.seed;
							shadowRayQueue.elements[ shadowIndex ].alphaDepth = input.alphaDepth;
							shadowRayQueue.elements[ shadowIndex ].maxDist = input.lightDist * ( 1.0 - ${rr} );
							rayDataStorage[ index ].shadowRayIntersectionIndex = i32( shadowIndex );

						} else {

							lightPdf = 0.0;

						}

					}

					if ( lightPdf <= 0.0 ) {

						rayDataStorage[ index ].lightPdf = 0.0;
						rayDataStorage[ index ].shadowRayIntersectionIndex = - 1;

					}

				}

			}
		`;super(n(e)),this.defineUniformAccessors(e)}};import{StorageBufferAttribute as Ls}from"three/webgpu";import{storage as Es,globalId as Bl}from"three/tsl";var Ir=class extends _{constructor(){let e={bvhData:{value:null},rayQueue:Es(new Ls(1,1),we),rayIntersectionsStorage:Es(new Ls(1,1),X),globalId:Bl},t=R("bvhData.value.fns.raycastFirstHit.outputType",e),r=R("bvhData.value.fns.raycastFirstHit",e),a=h`

			fn compute( globalId: vec3u ) -> void {

				let rayQueue = &${e.rayQueue};
				let rayIntersectionsStorage = &${e.rayIntersectionsStorage};

				let index = globalId.x;
				if ( index >= rayQueue.length ) {

					return;

				}

				let queuedRay = ( *rayQueue ).elements[ index ];
				let indexUV = vec2u( queuedRay.pixelIndex >> 16, queuedRay.pixelIndex & 0xFFFF );
				${V}( indexUV, queuedRay.seed, queuedRay.currentBounce + queuedRay.alphaDepth );

				let ray = Ray( queuedRay.origin, queuedRay.direction, queuedRay.maxDist );
				var hitResult: ${t};
				if ( ${r}( ray, &hitResult ) ) {

					rayIntersectionsStorage[ index ].barycoord = hitResult.barycoord;
					rayIntersectionsStorage[ index ].objectIndex = i32( hitResult.objectIndex );
					rayIntersectionsStorage[ index ].position = ray.origin + ray.direction * hitResult.dist;
					rayIntersectionsStorage[ index ].dist = hitResult.dist;
					rayIntersectionsStorage[ index ].normal = hitResult.normal.xyz;
					rayIntersectionsStorage[ index ].side = hitResult.side;
					rayIntersectionsStorage[ index ].indices = hitResult.indices.xyz;

				} else {

					rayIntersectionsStorage[ index ].objectIndex = - 1;

				}

			}
		`;super(a(e)),this.defineUniformAccessors(e)}};import{StorageBufferAttribute as zs}from"three/webgpu";import{storage as ks,globalId as Pl}from"three/tsl";var Rr=class extends _{constructor(){let e={bvhData:{value:null},shadowRayQueue:ks(new zs(1,1),we),shadowRayIntersectionsStorage:ks(new zs(1,1),X),globalId:Pl},t=R("bvhData.value.fns.raycastFirstHit.outputType",e),r=R("bvhData.value.fns.raycastShadow",e),a=h`

			fn compute( globalId: vec3u ) -> void {

				let shadowRayQueue = &${e.shadowRayQueue};
				let shadowRayIntersectionsStorage = &${e.shadowRayIntersectionsStorage};

				let index = globalId.x;
				if ( index >= shadowRayQueue.length ) {

					return;

				}

				let queuedRay = ( *shadowRayQueue ).elements[ index ];
				let indexUV = vec2u( queuedRay.pixelIndex >> 16, queuedRay.pixelIndex & 0xFFFF );
				${V}( indexUV, queuedRay.seed, queuedRay.currentBounce + queuedRay.alphaDepth );

				let ray = Ray( queuedRay.origin, queuedRay.direction, queuedRay.maxDist );
				var hitResult: ${t};
				if ( ${r}( ray, &hitResult ) ) {

					shadowRayIntersectionsStorage[ index ].objectIndex = i32( hitResult.objectIndex );
					shadowRayIntersectionsStorage[ index ].dist = hitResult.dist;

				} else {

					shadowRayIntersectionsStorage[ index ].objectIndex = - 1;

				}

				shadowRayIntersectionsStorage[ index ].forwardBlocked = u32( hitResult.forwardBlocked );

			}
		`;super(a(e)),this.defineUniformAccessors(e)}};import{IndirectStorageBufferAttribute as Al,StorageBufferAttribute as Ll}from"three/webgpu";import{storage as Hs}from"three/tsl";var xt=class extends _{constructor(e=Qe,t=64){let r={queue:Hs(new Ll(1,1),e),outputDispatch:Hs(new Al(3,1),"u32").setName("outputDispatch")},a=h`
			fn compute() -> void {

				let queue = &${r.queue};
				let outputDispatch = &${r.outputDispatch};

				let queueLength = atomicLoad( &queue.length );
				outputDispatch[ 0 ] = ( queueLength + ${t-1}u ) / ${t}u;
				outputDispatch[ 1 ] = 1u;
				outputDispatch[ 2 ] = 1u;

			}
		`;super(a(r)),this.defineUniformAccessors(r)}};import{StorageBufferAttribute as Vs}from"three/webgpu";import{uniform as Va,storage as Os,globalId as El}from"three/tsl";var Dr=class extends _{constructor(){let e={rayDataStorage:Os(new Vs(1,1),z),pixelQueue:Os(new Vs(1,1),Te),start:Va(0,"uint"),end:Va(0,"uint"),addingSlots:Va(0,"uint"),globalId:El},t=h`
			fn compute( start: u32, end: u32, addingSlots: u32, globalId: vec3u ) -> void {

				let rayDataStorage = &${e.rayDataStorage};
				let pixelQueue = &${e.pixelQueue};

				let index = start + globalId.x;
				if ( index >= end ) {

					return;

				}

				if ( addingSlots == 0u ) {

					// slots being removed hand their pixel back before the pool is discarded
					let queueIndex = atomicAdd( &pixelQueue.elementCount, 1u );
					atomicStore( &pixelQueue.elements[ queueIndex ], rayDataStorage[ index ].pixelIndex );

				} else {

					// the pool never exceeds the pixel count, so the queue holds enough for every new slot
					let previousCount = atomicSub( &pixelQueue.elementCount, 1u );
					rayDataStorage[ index ].pixelIndex = atomicLoad( &pixelQueue.elements[ previousCount - 1u ] );
					rayDataStorage[ index ].resultColor = vec4f( 0.0 );
					rayDataStorage[ index ].throughputColor = vec3f( 0.0 );
					rayDataStorage[ index ].objectIndex = - 1;
					rayDataStorage[ index ].alphaDepth = 0u;
					rayDataStorage[ index ].rayIntersectionIndex = - 1;
					rayDataStorage[ index ].shadowRayIntersectionIndex = - 1;

				}

			}
		`;super(t(e)),this.defineUniformAccessors(e)}};import{IndirectStorageBufferAttribute as zl}from"three/webgpu";import{storage as kl,globalId as Hl}from"three/tsl";var _r=class extends _{constructor(e={}){let{type:t="u32"}=e,r={globalId:Hl,outputTarget:kl(new zl(1,1),t)},a=h`
			fn compute( globalId: vec3u ) -> void {

				${r.outputTarget}[ globalId.x ] = 0;

			}
		`;super(a(r)),this.defineUniformAccessors({target:r.outputTarget})}};import{StorageBufferAttribute as Ws}from"three/webgpu";import{uniform as Vl,storage as Us,globalId as Ol}from"three/tsl";var Cr=class extends _{constructor(e){let t={source:Us(new Ws(1,1),e).toReadOnly(),target:Us(new Ws(1,1),e),count:Vl(0,"uint"),globalId:Ol},r=h`
			fn compute( count: u32, globalId: vec3u ) -> void {

				let index = globalId.x;
				if ( index >= count ) {

					return;

				}

				${t.target}[ index ] = ${t.source}[ index ];

			}
		`;super(r(t)),this.defineUniformAccessors(t)}};import{StorageBufferAttribute as qs,StorageTexture as Wl,StructTypeNode as Ul}from"three/webgpu";import{storage as Gs,textureStore as ql,globalId as Gl}from"three/tsl";var Qs=0,js=1,Ks=2,Xs=3,Ys=4,Oa=5,Zs=4294967296,Js=new Ul({minSamples:{type:"uint",atomic:!0},maxSamples:{type:"uint",atomic:!0},totalLo:{type:"uint",atomic:!0},totalHi:{type:"uint",atomic:!0},pixelCount:{type:"uint",atomic:!0}},"SampleCounters"),Fr=class extends _{constructor(){let e={counters:Gs(new qs(1,1),Js)},t=h`
			fn compute() -> void {

				atomicStore( &${e.counters}.minSamples, 0xFFFFFFFFu );
				atomicStore( &${e.counters}.maxSamples, 0u );
				atomicStore( &${e.counters}.totalLo, 0u );
				atomicStore( &${e.counters}.totalHi, 0u );
				atomicStore( &${e.counters}.pixelCount, 0u );

			}
		`;super(t(e)),this.defineUniformAccessors(e)}},$r=class extends _{constructor(){let e={globalId:Gl,counters:Gs(new qs(1,1),Js),sampleCountTarget:ql(new Wl(1,1)).toReadOnly()},t=h`
			fn compute( globalId: vec3u ) -> void {

				let targetDimensions = textureDimensions( ${e.sampleCountTarget} );
				if ( globalId.x >= targetDimensions.x || globalId.y >= targetDimensions.y ) {

					return;

				}

				// pixels without a camera ray aren't part of the image, so skip rather than count zero
				let combinedField = textureLoad( ${e.sampleCountTarget}, globalId.xy ).r;
				if ( ( combinedField & ${ke}u ) == 0u ) {

					return;

				}

				let samples = combinedField & ${le}u;

				atomicMin( &${e.counters}.minSamples, samples );
				atomicMax( &${e.counters}.maxSamples, samples );
				atomicAdd( &${e.counters}.pixelCount, 1u );

				// the sum overflowed if it came out smaller than the value already there, so carry
				// the wrap into "totalHi"
				let previousTotal = atomicAdd( &${e.counters}.totalLo, samples );
				if ( previousTotal + samples < previousTotal ) {

					atomicAdd( &${e.counters}.totalHi, 1u );

				}

			}
		`;super(t(e)),this.defineUniformAccessors(e)}};var jl=134217728,Kl=Math.floor(jl/(z.getLength()*4)),Xl=5,vt=class extends Ue{constructor(e){super(e),this.seed=0,this.envInfo=new He,this.backgroundInfo=new Ve,this.lightsInfo=new We,this.rayCount=0,this.rayDataStorage=null,this.rayQueue=null,this.shadowRayQueue=null,this.rayIntersectionsStorage=null,this.shadowRayIntersectionsStorage=null,this.pixelQueue=null,this.sampleCountersStorage=new Re(new Uint32Array(Oa),Oa),this.sampleCountersStorage.name="Sample Counters",this._samplesPromise=null,this.populatePixelIndicesKernel=new yr().setWorkgroupSize(8,8,1),this.logicKernel=new br().setWorkgroupSize(64,1,1),this.materialKernel=new Tr().setWorkgroupSize(64,1,1),this.traceRayKernel=new Ir().setWorkgroupSize(64,1,1),this.traceShadowRayKernel=new Rr().setWorkgroupSize(64,1,1),this.rayDispatchConverter=new xt().setWorkgroupSize(1,1,1),this.shadowDispatchConverter=new xt().setWorkgroupSize(1,1,1),this.primeSampleCountersKernel=new Fr().setWorkgroupSize(1,1,1),this.tallySampleCountsKernel=new $r().setWorkgroupSize(8,8,1),this.resetSlotsKernel=new Dr().setWorkgroupSize(64,1,1),this.copyRayDataKernel=new Cr(z).setWorkgroupSize(64,1,1),this.logicKernel.envInfo=this.envInfo,this.logicKernel.backgroundInfo=this.backgroundInfo,this.logicKernel.lightsInfo=this.lightsInfo,this.zeroDispatchKernel=new _r().setWorkgroupSize(1,1,1),this.volumeKernel=null}resetSeed(){this.seed=0}reset(){super.reset(),this._samplesPromise=null}setBVHData(e){this.materialKernel.bvhData=e,this.materialKernel.needsUpdate=!0,this.traceRayKernel.bvhData=e,this.traceRayKernel.needsUpdate=!0,this.traceShadowRayKernel.bvhData=e,this.traceShadowRayKernel.needsUpdate=!0,this.reset()}rebuild(){super.rebuild(),this.materialKernel.needsUpdate=!0,this.reset()}setRandom(e){this.logicKernel.context.random=e,this.logicKernel.needsUpdate=!0,this.materialKernel.context.random=e,this.materialKernel.needsUpdate=!0,this.traceRayKernel.context.random=e,this.traceRayKernel.needsUpdate=!0,this.traceShadowRayKernel.context.random=e,this.traceShadowRayKernel.needsUpdate=!0,this.reset()}setMaterial(e){this.materialKernel.material=e.getData(),this.materialKernel.needsUpdate=!0,this.reset()}setFilterGlossy(e){this.materialKernel.filterGlossy=e===0?nr:1/e,this.reset()}setClamping(e,t){this.logicKernel.clampDirect=e,this.logicKernel.clampIndirect=t,this.reset()}setTransmissiveBackground(e){this.logicKernel.transmissiveBackground=e,this.reset()}setEnvironment(e){this.envInfo.updateFrom(e)}setLights(e){this.lightsInfo.updateFrom(this.renderer,e),this.reset()}setEnvironmentParams(e,t){let{envInfo:r}=this,a=new eo().makeRotationFromEuler(t).invert();r.rotationNode.value.setFromMatrix4(a),r.intensityNode.value=e}setMultipleImportanceSampling(e){this.logicKernel.misEnabled=e?1:0,this.reset()}setBackground(e){let{backgroundInfo:t}=this;t.dispose(),t.map=e}setBackgroundParams(e,t,r){let{backgroundInfo:a}=this,s=new eo().makeRotationFromEuler(t).invert();a.rotationNode.value.copy(s),a.intensity=e,a.blur=r}dispose(){super.dispose(),this.envInfo.dispose(),this.lightsInfo.dispose(),this.rayDataStorage?.dispose(),this.rayQueue?.dispose(),this.shadowRayQueue?.dispose(),this.rayIntersectionsStorage?.dispose(),this.shadowRayIntersectionsStorage?.dispose(),this.sampleCountersStorage.dispose(),this.pixelQueue?.dispose(),this.rayDispatchConverter.outputDispatch.dispose(),this.shadowDispatchConverter.outputDispatch.dispose(),this.populatePixelIndicesKernel.dispose(),this.logicKernel.dispose(),this.materialKernel.dispose(),this.traceRayKernel.dispose(),this.traceShadowRayKernel.dispose(),this.rayDispatchConverter.dispose(),this.shadowDispatchConverter.dispose(),this.primeSampleCountersKernel.dispose(),this.tallySampleCountsKernel.dispose(),this.resetSlotsKernel.dispose(),this.copyRayDataKernel.dispose(),this.zeroDispatchKernel.dispose()}_updatePixelQueue(e,t){let r=Te.getLength()+Math.max(e*t,1);(!this.pixelQueue||this.pixelQueue.array.length<r)&&(this.pixelQueue?.dispose(),this.pixelQueue=new Re(new Float32Array(r),r),this.pixelQueue.name="Pixel Queue",this.materialKernel.pixelQueue=this.pixelQueue,this.materialKernel.needsUpdate=!0,this.populatePixelIndicesKernel.pixelQueue=this.pixelQueue,this.populatePixelIndicesKernel.needsUpdate=!0,this.resetSlotsKernel.pixelQueue=this.pixelQueue,this.resetSlotsKernel.needsUpdate=!0)}_resizePool(e){let{renderer:t,resetSlotsKernel:r,copyRayDataKernel:a}=this,s=this.rayCount;r.pixelQueue=this.pixelQueue,e<s&&(r.rayDataStorage=this.rayDataStorage,r.start=e,r.end=s,r.addingSlots=!1,t.compute(r.kernel,r.getDispatchSize(s-e,1,1)));let i=new Re(e,z.getLength());i.name="Ray Data";let n=we.getLength()+e*Ge.getLength(),o=new Re(new Float32Array(n),n);o.name="Ray Queue";let u=new Re(new Float32Array(n),n);u.name="Shadow Ray Queue";let l=new Re(e,X.getLength());l.name="Ray Intersections";let f=new Re(e,X.getLength());f.name="Shadow Ray Intersections";let p=Math.min(e,s);p>0&&(a.source=this.rayDataStorage,a.target=i,a.count=p,t.compute(a.kernel,a.getDispatchSize(p,1,1))),this.rayDataStorage?.dispose(),this.rayQueue?.dispose(),this.shadowRayQueue?.dispose(),this.rayIntersectionsStorage?.dispose(),this.shadowRayIntersectionsStorage?.dispose(),this.rayDataStorage=i,this.rayQueue=o,this.shadowRayQueue=u,this.rayIntersectionsStorage=l,this.shadowRayIntersectionsStorage=f,this.rayCount=e,this.logicKernel.needsUpdate=!0,this.materialKernel.needsUpdate=!0,this.traceRayKernel.needsUpdate=!0,this.traceShadowRayKernel.needsUpdate=!0,this.populatePixelIndicesKernel.needsUpdate=!0,this.resetSlotsKernel.needsUpdate=!0,e>s&&(r.rayDataStorage=i,r.start=s,r.end=e,r.addingSlots=!0,t.compute(r.kernel,r.getDispatchSize(e-s,1,1)))}_getRequestedSlotCount(e){return Math.min(Kl,e,Math.max(1,Math.floor(this.frameBudget)))}_applyBudget(e){let t=this._getRequestedSlotCount(e);t!==this.rayCount&&this._resizePool(t)}*createRenderTask(){let{renderer:e,maxTransparentBounces:t,logicKernel:r,materialKernel:a,traceRayKernel:s,traceShadowRayKernel:i,rayDispatchConverter:n,shadowDispatchConverter:o,zeroDispatchKernel:u,populatePixelIndicesKernel:l}=this,f=new Ql;this.getSize(f),this._updatePixelQueue(f.x,f.y);let p=f.x*f.y;for(this._applyBudget(p),u.target=this.rayQueue,e.compute(u.kernel,[1]),u.target=this.shadowRayQueue,e.compute(u.kernel,[1]),l.rayDataStorage=this.rayDataStorage,l.pixelQueue=this.pixelQueue,l.frameBudget=this.rayCount,l.targetDimensions.copy(f),e.compute(l.kernel,l.getDispatchSize(f.x,f.y,1)),this.seed++;;){let m=this.lowResMode?Math.min(this.maxBounces,Xl):1;for(let d=0;d<m;d++){e.copyTextureToTexture(this.outputTarget,this.prevOutputTarget),[this.outputTarget,this.prevOutputTarget]=[this.prevOutputTarget,this.outputTarget],r.prevOutputTarget=this.prevOutputTarget,r.outputTarget=this.outputTarget,r.sampleCountTarget=this.sampleCountTarget,r.rayDataStorage=this.rayDataStorage,r.rayIntersectionsStorage=this.rayIntersectionsStorage,r.shadowRayIntersectionsStorage=this.shadowRayIntersectionsStorage,r.maxBounces=this.maxBounces,r.rayCount=this.rayCount,e.compute(r.kernel,r.getDispatchSize(this.rayCount,1,1)),this._applyBudget(p);let{rayDataStorage:g,rayQueue:x,shadowRayQueue:I,rayIntersectionsStorage:b,shadowRayIntersectionsStorage:D,rayCount:y}=this;u.target=x,e.compute(u.kernel,[1]),u.target=I,e.compute(u.kernel,[1]),a.rayDataStorage=g,a.rayQueue=x,a.shadowRayQueue=I,a.pixelQueue=this.pixelQueue,a.sampleCountTarget=this.sampleCountTarget,a.seed=this.seed,a.maxSamples=this.maxSamples,a.rayCount=y,a.maxTransparentBounces=t,a.maxBounces=this.maxBounces,a.targetDimensions.copy(f),e.compute(a.kernel,a.getDispatchSize(y,1,1)),n.queue=x,e.compute(n.kernel,[1,1,1]),s.rayQueue=x,s.rayIntersectionsStorage=b,e.compute(s.kernel,n.outputDispatch),o.queue=I,e.compute(o.kernel,[1,1,1]),i.shadowRayQueue=I,i.shadowRayIntersectionsStorage=D,e.compute(i.kernel,o.outputDispatch)}yield}}getSampleCountsAsync(){if(this._samplesPromise===null){let e=this._measureSampleCounts().finally(()=>{this._samplesPromise===e&&(this._samplesPromise=null)});this._samplesPromise=e}return this._samplesPromise}async _measureSampleCounts(){let{renderer:e,sampleCountTarget:t,sampleCountersStorage:r,primeSampleCountersKernel:a,tallySampleCountsKernel:s}=this;if(!e.initialized||this.lowResMode)return{min:0,max:0,avg:0};a.counters=r,e.compute(a.kernel,[1,1,1]),s.counters=r,s.sampleCountTarget=t,e.compute(s.kernel,s.getDispatchSize(t.width,t.height));let i=await e.getArrayBufferAsync(r),n=new Uint32Array(i),o=n[Ys];if(o===0)return{min:0,max:0,avg:0};let u=n[Xs]*Zs+n[Ks];return{min:n[Qs],max:n[js],avg:u/o}}};import{BackSide as Yl,FrontSide as Zl,DoubleSide as Jl,BufferAttribute as ec,BufferGeometry as tc,StorageBufferAttribute as to,StructTypeNode as io,Vector4 as rc,SkinnedMesh as ac,RepeatWrapping as ic,ClampToEdgeWrapping as sc,MirroredRepeatWrapping as oc,NearestFilter as nc}from"three/webgpu";import{storage as lc,float as ro,bool as ao,texture as cc,uniformArray as uc,uint as dc}from"three/tsl";var yt=new rc,Mr=new io({matrixWorld:"mat4x4f",inverseMatrixWorld:"mat4x4f",visible:"uint",materialIndex:"uint",visibleToShadowRays:"uint",_alignment0:"uint",color:"vec4f"},"TransformStruct"),Nr=new io({indices:"vec4u",normal:"vec3f",didHit:"bool",barycoord:"vec3f",objectIndex:"uint",side:"float",dist:"float",forwardBlocked:"bool"},"PathTracerIntersectionResult"),Br=class extends At{constructor(e,t={}){super(e,{attributes:{position:"vec4f",normal:"vec4f",tangent:"vec4f",color:"vec4f",uv:"vec4f"},...t}),this.structs.transform=Mr,this.structs.material=Wi,this.storage.materials=null,this.materialsMap=new Map,this.materials=[],this.bvhMap=new Map,this.textureAtlas=new Oe}updateUvAttributesFromScene(){let{attributes:e}=this,t=new Set(["color"]);for(let r=0;r<8;r++){let a=r===0?"uv":"uv"+r;delete e[a],t.add(a)}this.getRootObject().traverse(r=>{if(r.geometry)for(let a in r.geometry.attributes)t.has(a)&&(e[a]="vec4f")})}updateUvSampleFunction(){let{structs:e,fns:t}=this,r=[],a=null;e.attributes.membersLayout.forEach(({name:s})=>{if(/^uv/.test(s)){let i=s==="uv"?0:Number(s.replace(/^uv/,""));r.push(`
					case ${i}u: {

						return vertexData.${s}.xy;

					}
				`),a===null&&(a=`vertexData.${s}.xy`)}}),t.getUvFromChannel=h`
			fn getUvFromChannel( vertexData: ${e.attributes}, packed: i32 ) -> vec2f {

				// the uv channel is packed into bits 23-25 of the "*Map" descriptor
				let channel = u32( ( packed >> 23 ) & 0x7 );
				switch ( channel ) {

					${r.join(`
`)}
					default: {

						return ${a??"vec2f( 0.0 )"};

					}

				}

			}
		`}updateColorSampleFn(){let{structs:e,fns:t}=this;!!e.attributes.membersLayout.find(({name:a})=>a==="color")?t.getColor=h`
				fn getColor( vertexData: ${e.attributes} ) -> vec4f {

					return vertexData.color;

				}
			`:t.getColor=h`
				fn getColor( vertexData: ${e.attributes} ) -> vec4f {

					return vec4f( 1.0 );

				}
			`}useTransparencyRaycastFn(){let{textureAtlas:e,storage:t,fns:r}=this,a=e.texture,s=uc(e.textureInfo,"uvec4"),i=Zt(s,cc(a));r.getSurfaceRecord=ls(i,r.getUvFromChannel,r.getColor);let n=dc().toVar("bvh_materialIndex"),o=ro(1).toVar("bvh_rayScalar"),u=ro(1).toVar("bvh_baseOpacity"),l=ao(!1).toVar("bvh_isShadowRay"),f=ao(!1).toVar("bvh_skipShadowObject"),p={shapeStruct:v,resultStruct:Nr,boundsOrderFn:h`
				fn getBoundsOrder( ray: ${v}, splitAxis: u32, node: ${B} ) -> bool {

					return ray.direction[ splitAxis ] >= 0.0;

				}
			`,intersectsBoundsFn:h`
				fn rayIntersectsBounds( ray: ${v}, bounds: ${E}, result: ptr<function, ${Nr}> ) -> u32 {

					// early-out if our object is completely transparent
					if ( ${u} == 0.0 ) {

						return 0u;

					}

					let boundsMin = vec3( bounds.min[0], bounds.min[1], bounds.min[2] );
					let boundsMax = vec3( bounds.max[0], bounds.max[1], bounds.max[2] );

					let invDir = 1.0 / ray.direction;
					let tMinPlane = ( boundsMin - ray.origin ) * invDir;
					let tMaxPlane = ( boundsMax - ray.origin ) * invDir;

					let tMinHit = min( tMinPlane, tMaxPlane );
					let tMaxHit = max( tMinPlane, tMaxPlane );

					let t0 = max( max( tMinHit.x, tMinHit.y ), tMinHit.z );
					let t1 = min( min( tMaxHit.x, tMaxHit.y ), tMaxHit.z );

					let dist = max( t0, 0.0 );
					if ( t1 < dist ) {

						return 0u;

					} else if ( ray.maxDist > 0.0 && dist * ${o} >= ray.maxDist ) {

						return 0u;

					} else if ( result.didHit && dist * ${o} >= result.dist ) {

						return 0u;

					} else {

						return 1u;

					}

				}

			`,intersectRangeFn:h`
				fn intersectRange( ray: ${v}, offset: u32, count: u32, result: ptr<function, ${Nr}> ) -> bool {

					var didHit = false;
					for ( var ti = offset; ti < offset + count; ti = ti + 1u ) {

						let i0 = ${t.index}[ ti * 3u ];
						let i1 = ${t.index}[ ti * 3u + 1u ];
						let i2 = ${t.index}[ ti * 3u + 2u ];

						let a = ${t.attributes}[ i0 ].position.xyz;
						let b = ${t.attributes}[ i1 ].position.xyz;
						let c = ${t.attributes}[ i2 ].position.xyz;

						var triResult = ${Ft}( ray, a, b, c, 0.0 );
						triResult.dist *= ${o};
						if ( triResult.didHit && ( ray.maxDist <= 0.0 || triResult.dist < ray.maxDist ) && ( ! result.didHit || triResult.dist < result.dist ) ) {

							let material = ${t.materials}[ ${n} ];

							// TODO: if material is a transmissive volume we may need to assume double-sidedness
							// shadow rays hit both sides
							if ( ! ${l} && material.side != 0 && triResult.side != material.side ) {

								continue;

							}

							if ( material.transparent != 0 || material.alphaTest > 0.0 ) {

								var opacity = ${u};

								// add support for vertex color opacity
								if ( material.vertexColors == 1 ) {

									let barycoord = triResult.barycoord;
									let a = ${r.getColor}( ${t.attributes}[ i0 ] );
									let b = ${r.getColor}( ${t.attributes}[ i1 ] );
									let c = ${r.getColor}( ${t.attributes}[ i2 ] );
									let col = barycoord.x * a + barycoord.y * b + barycoord.z * c;

									opacity *= col.a;

								}

								// account for alpha component of albedo map
								if ( material.map != - 1 ) {

									let barycoord = triResult.barycoord;
									let a = ${r.getUvFromChannel}( ${t.attributes}[ i0 ], material.map );
									let b = ${r.getUvFromChannel}( ${t.attributes}[ i1 ], material.map );
									let c = ${r.getUvFromChannel}( ${t.attributes}[ i2 ], material.map );
									let uv = barycoord.x * a + barycoord.y * b + barycoord.z * c;
									let uvPrime = material.mapTransform * vec3f( uv, 1 );

									opacity *= ${i}( uvPrime.xy, material.map, 0 ).a;

								}

								// account for green component of alpha map
								if ( material.alphaMap != - 1 ) {

									let barycoord = triResult.barycoord;
									let a = ${r.getUvFromChannel}( ${t.attributes}[ i0 ], material.alphaMap );
									let b = ${r.getUvFromChannel}( ${t.attributes}[ i1 ], material.alphaMap );
									let c = ${r.getUvFromChannel}( ${t.attributes}[ i2 ], material.alphaMap );
									let uv = barycoord.x * a + barycoord.y * b + barycoord.z * c;
									let uvPrime = material.alphaMapTransform * vec3f( uv, 1 );

									opacity *= ${i}( uvPrime.xy, material.alphaMap, 0 ).g;

								}

								// Opacity is resolved at surface processing but skip full transparent hits here.
								if ( material.transparent != 0 && opacity <= 0.0 ) {

									continue;

								}

								if ( opacity < material.alphaTest ) {

									continue;

								}

							}

							// shadow rays pass the objects not visible to them, but a bsdf ray would hit this face
							if ( ${f} ) {

								if ( material.side == 0 || triResult.side == material.side ) {

									result.forwardBlocked = true;

								}

								continue;

							}

							result.didHit = true;
							result.dist = triResult.dist;
							result.normal = triResult.normal;
							result.side = triResult.side;
							result.barycoord = triResult.barycoord;
							result.indices = vec4u( i0, i1, i2, ti );

							didHit = true;

						}

					}

					return didHit;

				}
			`,transformShapeFn:h`
				fn transformRay( ray: ptr<function, ${v}>, objectIndex: u32 ) -> void {

					let toLocal = ${t.transforms}[ objectIndex ].inverseMatrixWorld;
					ray.origin = ( toLocal * vec4f( ray.origin, 1.0 ) ).xyz;
					ray.direction = ( toLocal * vec4f( ray.direction, 0.0 ) ).xyz;

					let len = length( ray.direction );
					ray.direction /= len;
					${o} = 1.0 / len;

					let object = ${t.transforms}[ objectIndex ];
					${n} = object.materialIndex;

					let material = ${t.materials}[ object.materialIndex ];
					if ( material.transparent == 1 ) {

						${u} = material.opacity * object.color.a;

					} else {

						${u} = 1.0;

					}

					${f} = ${l} && object.visibleToShadowRays == 0u;

				}
			`,transformResultFn:h`
				fn transformResult( hit: ptr<function, ${Nr}>, objectIndex: u32 ) -> void {

					let toLocal = ${t.transforms}[ objectIndex ].inverseMatrixWorld;
					hit.normal = normalize( ( transpose( toLocal ) * vec4f( hit.normal, 0.0 ) ).xyz );
					hit.objectIndex = objectIndex;

				}
			`,resetShapeFn:h`
				fn resetRayScalar( objectIndex: u32 ) -> void {

					${o} = 1.0;
					${u} = 1.0;

				}
			`};r.raycastFirstHit=this.getShapecastFn({...p,name:"raycastFirstHit",prefixFn:h`
				fn initFirstHitCull() -> void {

					${l} = false;

				}
			`}),r.raycastShadow=this.getShapecastFn({...p,name:"raycastShadow",prefixFn:h`
				fn initShadowCull() -> void {

					${l} = true;

				}
			`})}update(){let{structs:e}=this,t=new to(new Uint8Array,e.material.getLength());this.storage.materials=lc(t,e.material).toReadOnly().setName("bvh_materials"),this.updateUvAttributesFromScene(),this.updateMaterialsMap(),super.update(),this.updateUvSampleFunction(),this.updateColorSampleFn(),this.updateMaterials(),this.bvhMap.clear(),this.useTransparencyRaycastFn()}updateMaterialsMap(){let{materials:e,materialsMap:t}=this;t.clear(),e.length=0,this.getRootObject().traverse(a=>{a.material&&(Array.isArray(a.material)?a.material.forEach(s=>s&&r(s)):r(a.material))}),e.sort((a,s)=>a.uuid<s.uuid?1:-1).forEach((a,s)=>{t.set(a,s)});function r(a){t.has(a)||(e.push(a),t.set(a,-1))}}updateMaterials(){this.updateMaterialsMap();let{materials:e,storage:t,structs:r,bvh:a}=this,{materialData:s,textures:i}=this.writeMaterialsBuffer(e),n=t.materials.proxyNode,o=t.transforms.proxyNode,u=s.length/r.material.getLength();n.value.count<u&&(n.value.dispose(),n.value=new to(s,r.material.getLength())),n.value.array.set(s),n.value.needsUpdate=!0,this._getTransformMap(a).forEach(l=>{this.writeMaterialData(l,l.slot,o.value.array.buffer)}),o.value.needsUpdate=!0,this.textures=i}writeMaterialsBuffer(e){function t(p){switch(p){case ic:return 0;case sc:return 1;case oc:return 2;default:return 0}}function r(p,m){if(m in p&&p[m]){let d=p[m],g=ti(d);n.has(g)||(n.set(g,n.size),o.push(d));let x=n.get(g),I=d.channel&7,b=t(d.wrapS),D=t(d.wrapT);return(d.magFilter===nc?1:0)<<30|D<<28|b<<26|I<<23|x&8388607}else return-1}function a(p,m,d){return m in p?p[m]:d}function s(p,m,d,g){let x=p[m]&&p[m].isTexture?p[m]:null;if(x){x.matrixAutoUpdate&&x.updateMatrix();let I=x.matrix.elements;for(let b=0;b<3;b++)d[g+4*b+0]=I[3*b+0],d[g+4*b+1]=I[3*b+1],d[g+4*b+2]=I[3*b+2],d[g+4*b+3]=0}return 12}let i=0,n=new Map,o=[],u=Math.max(e.length,2),l=new Float32Array(u*this.structs.material.getLength()),f=new Int32Array(l.buffer);for(let p=0,m=e.length;p<m;p++){let d=e[p];l[i++]=d.color.r,l[i++]=d.color.g,l[i++]=d.color.b,f[i++]=r(d,"map"),l[i++]=a(d,"metalness",0),f[i++]=r(d,"metalnessMap"),l[i++]=a(d,"roughness",0),f[i++]=r(d,"roughnessMap"),l[i++]=a(d,"ior",1.5),l[i++]=a(d,"transmission",0),f[i++]=r(d,"transmissionMap"),l[i++]=a(d,"emissiveIntensity",0),"emissive"in d?(l[i++]=d.emissive.r,l[i++]=d.emissive.g,l[i++]=d.emissive.b):(l[i++]=0,l[i++]=0,l[i++]=0),f[i++]=r(d,"emissiveMap"),f[i++]=r(d,"normalMap"),i++,"normalScale"in d?(l[i++]=d.normalScale.x,l[i++]=d.normalScale.y):(l[i++]=1,l[i++]=1),l[i++]=a(d,"clearcoat",0),f[i++]=r(d,"clearcoatMap"),f[i++]=r(d,"clearcoatNormalMap"),i++,"clearcoatNormalScale"in d?(l[i++]=d.clearcoatNormalScale.x,l[i++]=d.clearcoatNormalScale.y):(l[i++]=1,l[i++]=1),l[i++]=a(d,"clearcoatRoughness",0),f[i++]=r(d,"clearcoatRoughnessMap"),f[i++]=r(d,"iridescenceMap"),f[i++]=r(d,"iridescenceThicknessMap"),l[i++]=a(d,"iridescence",0),l[i++]=a(d,"iridescenceIOR",1.3);let g=a(d,"iridescenceThicknessRange",[100,400]);l[i++]=g[0],l[i++]=g[1],l[i++]=a(d,"diffuseRoughness",0),l[i++]=a(d,"dispersion",0),"specularColor"in d?(l[i++]=d.specularColor.r,l[i++]=d.specularColor.g,l[i++]=d.specularColor.b):(l[i++]=1,l[i++]=1,l[i++]=1),f[i++]=r(d,"specularColorMap"),l[i++]=a(d,"specularIntensity",1),f[i++]=r(d,"specularIntensityMap");let x=a(d,"thickness",0)===0&&a(d,"attenuationDistance",1/0)===1/0;if(f[i++]=Number(x),i++,"attenuationColor"in d?(l[i++]=d.attenuationColor.r,l[i++]=d.attenuationColor.g,l[i++]=d.attenuationColor.b):(l[i++]=1,l[i++]=1,l[i++]=1),l[i++]=a(d,"attenuationDistance",1/0),f[i++]=r(d,"alphaMap"),f[i++]=Number(a(d,"castShadow",!0)),l[i++]=d.opacity,l[i++]=d.alphaTest,!x&&d.transmission>0)l[i++]=0;else switch(d.side){case Zl:l[i++]=1;break;case Yl:l[i++]=-1;break;case Jl:l[i++]=0;break}f[i++]=Number(a(d,"matte",!1)),l[i++]=a(d,"sheen",0),i++,"sheenColor"in d?(l[i++]=d.sheenColor.r,l[i++]=d.sheenColor.g,l[i++]=d.sheenColor.b):(l[i++]=0,l[i++]=0,l[i++]=0),f[i++]=r(d,"sheenColorMap"),l[i++]=a(d,"sheenRoughness",0),f[i++]=r(d,"sheenRoughnessMap"),f[i++]=Number(d.vertexColors),f[i++]=Number(d.flatShading),f[i++]=Number(d.transparent),f[i++]=0,l[i++]=a(d,"anisotropy",0),l[i++]=a(d,"anisotropyRotation",0),f[i++]=r(d,"anisotropyMap"),i++,i++,i++,i+=s(d,"map",l,i),i+=s(d,"metalnessMap",l,i),i+=s(d,"roughnessMap",l,i),i+=s(d,"transmissionMap",l,i),i+=s(d,"emissiveMap",l,i),i+=s(d,"normalMap",l,i),i+=s(d,"clearcoatMap",l,i),i+=s(d,"clearcoatNormalMap",l,i),i+=s(d,"clearcoatRoughnessMap",l,i),i+=s(d,"sheenColorMap",l,i),i+=s(d,"sheenRoughnessMap",l,i),i+=s(d,"iridescenceMap",l,i),i+=s(d,"iridescenceThicknessMap",l,i),i+=s(d,"specularColorMap",l,i),i+=s(d,"specularIntensityMap",l,i),i+=s(d,"alphaMap",l,i),i+=s(d,"anisotropyMap",l,i)}return{materialData:f,textures:o}}writeMaterialData(e,t,r){let{materialsMap:a}=this,{object:s,instanceId:i,root:n}=e,o=s.material;if(Array.isArray(o)){let{materialIndex:p}=s.geometry.groups[n];o=o[p]}let u=new Uint32Array(r),l=a.has(o)?a.get(o):-1;l===-1&&(u[t*Mr.getLength()+32]=0),u[t*Mr.getLength()+33]=l,s.isInstancedMesh&&s.instanceColor?(s.getColorAt(i,yt),yt.w=1):s.isBatchedMesh&&s._colorsTexture?s.getColorAt(i,yt):yt.setScalar(1);let f=new Float32Array(r);yt.toArray(f,t*Mr.getLength()+36)}writeTransformData(e,t,r,a){super.writeTransformData(e,t,r,a),this.writeMaterialData(e,r,a);let s=new Uint32Array(a);s[r*this.structs.transform.getLength()+34]=e.object.visibleToShadowRays===!1?0:1}getBVH(e,t,r){let{bvhMap:a}=this,s=super.getBVH(e,t,r);if(a.has(s)){let i=a.get(s);if(Object.assign(r,i.range),s!==i.bvh&&s instanceof te){let n=s.mesh,o=i.bvh.mesh;o.matrixWorld.copy(n.matrixWorld).decompose(o.position,o.quaternion,o.scale),s.refit(),s.getBoundingBox(o.boundingBox),s.geometry.computeBoundingBox()}return i.bvh}else if(s.indirect){let i=new tc;i.attributes=s.geometry.attributes;let n;if(s.geometry.index)n=s.geometry.index.array.slice(r.start,r.count+r.start);else{let{start:u,count:l}=r;n=new Uint32Array(l);for(let f=0,p=r.count;f<p;f++)n[f]=u+f}i.index=new ec(n,1),r.start=0;let o;if(s instanceof te){let u=s.mesh,l=new ac(i);l.copy(u),l.matrixWorld.copy(u.matrixWorld).decompose(l.position,l.quaternion,l.scale),o=new te(l,{strategy:2,targetLeafSize:5})}else o=new fe(i,{strategy:2,targetLeafSize:5});return a.set(s,{bvh:o,range:{...r}}),o}else return s}dispose(){let{storage:e}=this;for(let t in e)e[t].value?.dispose()}};import{MeshBasicNodeMaterial as hc,DataTexture as fc,NoBlending as pc}from"three/webgpu";import{uv as mc,varying as gc,texture as xc,uniform as vc,wgslFn as yc}from"three/tsl";var Pr=class extends hc{set texture(e){this._texNode.value=e}set layer(e){this._layerUniform.value=e}constructor(){super(),this.blending=pc,this._texNode=xc(new fc),this._layerUniform=vc(0),this.colorNode=yc(`
			fn atlasDebug( tex: texture_2d_array<f32>, coord: vec2f, layer: f32 ) -> vec4f {

				// flip y so texel origin shows at the top-left
				let dims = vec2f( textureDimensions( tex, 0 ).xy );
				let texel = vec2i( vec2f( coord.x, 1.0 - coord.y ) * dims );
				return textureLoad( tex, texel, i32( layer ), 0 );

			}
		`)(this._texNode,gc(mc()),this._layerUniform)}};import{MeshBasicNodeMaterial as bc,NoBlending as Sc,StorageTexture as wc}from"three/webgpu";import{uv as Tc,varying as Ic,texture as Rc,uniform as so}from"three/tsl";var Ar=class extends bc{set texture(e){this._texNode.value=e}set minCount(e){this._minUniform.value=e}set maxCount(e){this._maxUniform.value=e}constructor(){super(),this.blending=Sc,this._texNode=Rc(new wc(1,1)),this._minUniform=so(0),this._maxUniform=so(1);let e=h`
			fn sampleDensity( tex: texture_2d<u32>, coord: vec2f, minCount: f32, maxCount: f32 ) -> vec4f {

				let dims = vec2f( textureDimensions( tex, 0 ) );
				let texel = vec2i( coord * dims );

				// the high bits hold the ray state flags rather than part of the count
				let samples = textureLoad( tex, texel, 0 ).r & ${le}u;

				// stretched across the recorded range rather than from zero, otherwise a converged
				// image with counts bunched near the max reads as uniformly hot
				let range = max( maxCount - minCount, 1.0 );
				let t = clamp( ( f32( samples ) - minCount ) / range, 0.0, 1.0 );

				return vec4f( ${ca}( t ), 1.0 );

			}
		`;this.colorNode=e(this._texNode,Ic(Tc()),this._minUniform,this._maxUniform)}};import{float as wo}from"three/tsl";var Lr=class{init(){}getBsdfNode(){return h`

			fn bsdfSample( worldWo: vec3f, surf: SurfaceRecord ) -> ScatterRecord {

				var record: ScatterRecord;

				let wo = normalize( surf.normalInvBasis * worldWo );
				let wi = ${Ji}( wo, ${O}( ${qt} ) );
				record.color = surf.color * max( wi.z, 0.0 );
				record.pdf = max( wi.z, 0.0 ) / PI;
				record.direction = normalize( surf.normalBasis * wi );

				return record;

			}

		`}getBsdfEvalPdfNode(){return h`

			fn bsdfEvalPdf( worldWo: vec3f, worldWi: vec3f, surf: SurfaceRecord ) -> ScatterRecord {

				var record: ScatterRecord;
				record.direction = worldWi;

				let wo = normalize( surf.normalInvBasis * worldWo );
				let wi = normalize( surf.normalInvBasis * worldWi );
				record.color = surf.color * max( wi.z, 0.0 );
				record.pdf = max( wi.z, 0.0 ) / PI;

				return record;

			}

		`}getData(){return{bsdfSample:this.getBsdfNode(),bsdfEvalPdf:this.getBsdfEvalPdfNode()}}};import{wgslFn as k}from"three/tsl";var Dc=k(`

	fn eonDirectionalAlbedo( mu: f32, roughness: f32, A: f32 ) -> f32 {

		let muComp = 1.0 - mu;
		let gOverPi = muComp * (
			0.0571085289 + muComp * (
				0.491881867 + muComp * (
					- 0.332181442 + muComp * 0.0714429953
				)
			)
		);
		return A * ( 1.0 + roughness * gOverPi );

	}

`),oo=k(`

	fn fonSingleScatter( NdotV: f32, NdotL: f32, VdotH: f32, roughness: f32, A: f32, rho: vec3f ) -> vec3f {

		let VdotL = 2.0 * VdotH * VdotH - 1.0;
		let s = VdotL - NdotV * NdotL;
		let sOverT = select( s, s / max( NdotV, NdotL ), s > 0.0 );

		return ( rho / PI ) * A * ( 1.0 + roughness * sOverT );

	}

`,[T]),Xm=k(`

	fn fonBrdf( NdotV: f32, NdotL: f32, VdotH: f32, surf: SurfaceRecord ) -> vec3f {

		let roughness = surf.diffuseRoughness;
		if ( roughness < 1e-5 ) {

			return surf.color / PI;

		}

		let rho = saturate( surf.color );
		let A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );

		return fonSingleScatter( NdotV, NdotL, VdotH, roughness, A, rho );

	}

`,[T,M,oo]),no=k(`

	fn eonBrdf( NdotV: f32, NdotL: f32, VdotH: f32, surf: SurfaceRecord ) -> vec3f {

		let roughness = surf.diffuseRoughness;
		if ( roughness < 1e-5 ) {

			return surf.color / PI;

		}

		let rho = saturate( surf.color );
		let A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		let singleScatter = fonSingleScatter( NdotV, NdotL, VdotH, roughness, A, rho );

		let averageDirectionalAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		let directionalAlbedoV = eonDirectionalAlbedo( NdotV, roughness, A );
		let directionalAlbedoL = eonDirectionalAlbedo( NdotL, roughness, A );

		let rhoMultiScatter = rho * rho * averageDirectionalAlbedo /
			max( vec3f( 1e-7 ), vec3f( 1.0 ) - rho * ( 1.0 - averageDirectionalAlbedo ) );
		let multiScatter = ( rhoMultiScatter / PI ) *
			max( 1e-7, 1.0 - directionalAlbedoV ) *
			max( 1e-7, 1.0 - directionalAlbedoL ) /
			max( 1e-7, 1.0 - averageDirectionalAlbedo );

		return singleScatter + multiScatter;

	}

`,[T,M,Dc,oo]),lo=k(`

	fn eonLtcCoeffs( mu: f32, roughness: f32 ) -> vec4f {

		let a = 1.0 + roughness * (
			0.303392 + ( - 0.518982 + 0.111709 * mu ) * mu +
			( - 0.276266 + 0.335918 * mu ) * roughness
		);
		let b = roughness * (
			- 1.16407 + 1.15859 * mu + ( 0.150815 - 0.150105 * mu ) * roughness
		) / ( mu * mu * mu - 1.43545 );
		let c = 1.0 + roughness * ( 0.20013 + ( - 0.506373 + 0.261777 * mu ) * mu );
		let d = roughness * (
			0.540852 + ( - 1.01625 + 0.475392 * mu ) * mu
		) / ( - 1.0743 + ( 0.0725628 + mu ) * mu );

		return vec4f( a, b, c, d );

	}

`),co=k(`

	fn eonLtcBasis( wo: vec3f ) -> mat3x3f {

		let lenSqr = dot( wo.xy, wo.xy );
		let invLen = inverseSqrt( max( lenSqr, 1e-7 ) );
		let x = select(
			vec3f( 1.0, 0.0, 0.0 ),
			vec3f( wo.x, wo.y, 0.0 ) * invLen,
			lenSqr > 0.0,
		);
		let y = vec3f( - x.y, x.x, 0.0 );

		return mat3x3f( x, y, vec3f( 0.0, 0.0, 1.0 ) );

	}

`),_c=k(`

	fn eonCltcPdf( wo: vec3f, wi: vec3f, roughness: f32 ) -> f32 {

		let toLtc = transpose( eonLtcBasis( wo ) );
		let wiLtc = toLtc * wi;
		let coeffs = eonLtcCoeffs( saturate( wo.z ), roughness );
		let a = coeffs.x;
		let b = coeffs.y;
		let c = coeffs.z;
		let d = coeffs.w;
		let detM = c * ( a - b * d );
		let wh = vec3f(
			c * ( wiLtc.x - b * wiLtc.z ),
			( a - b * d ) * wiLtc.y,
			- c * ( d * wiLtc.x - a * wiLtc.z ),
		);
		let lenSqr = max( dot( wh, wh ), 1e-7 );
		let vz = inverseSqrt( d * d + 1.0 );
		let s = 0.5 * ( 1.0 + vz );
		let jacobian = detM * detM / ( lenSqr * lenSqr );

		return jacobian * max( wh.z, 0.0 ) / ( PI * s );

	}

`,[T,lo,co]),Cc=k(`

	fn eonCltcDirection( wo: vec3f, roughness: f32, uv: vec2f ) -> vec3f {

		let coeffs = eonLtcCoeffs( saturate( wo.z ), roughness );
		let a = coeffs.x;
		let b = coeffs.y;
		let c = coeffs.z;
		let d = coeffs.w;
		let radius = sqrt( uv.x );
		let phi = 2.0 * PI * uv.y;
		let y = radius * sin( phi );
		let vz = inverseSqrt( d * d + 1.0 );
		let s = 0.5 * ( 1.0 + vz );
		let x = - mix( sqrt( max( 1.0 - y * y, 0.0 ) ), radius * cos( phi ), s );
		let wh = vec3f( x, y, sqrt( max( 1.0 - x * x - y * y, 0.0 ) ) );
		let wiUnnormalized = vec3f(
			a * wh.x + b * wh.z,
			c * wh.y,
			d * wh.x + wh.z,
		);
		let wi = normalize( eonLtcBasis( wo ) * wiUnnormalized );

		return wi;

	}

`,[T,lo,co]),Fc=k(`

	fn eonUniformHemisphereSample( uv: vec2f ) -> vec3f {

		let sinTheta = sqrt( max( 1.0 - uv.x * uv.x, 0.0 ) );
		let phi = 2.0 * PI * uv.y;
		return vec3f( sinTheta * cos( phi ), sinTheta * sin( phi ), uv.x );

	}

`,[T]),uo=k(`

	fn eonUniformProbability( wo: vec3f, roughness: f32 ) -> f32 {

		let mu = saturate( wo.z );
		return clamp( pow( roughness, 0.1 ), 0.0, 1.0 ) * (
			0.162925 + ( - 0.372058 + ( 0.538233 - 0.290822 * mu ) * mu ) * mu
		);

	}

`),ho=k(`

	fn eonDirection( wo: vec3f, roughness: f32, uv: vec2f ) -> vec3f {

		let uniformProbability = eonUniformProbability( wo, roughness );
		if ( uv.x <= uniformProbability && uniformProbability > 0.0 ) {

			return eonUniformHemisphereSample( vec2f( uv.x / uniformProbability, uv.y ) );

		}

		let cltcProbability = 1.0 - uniformProbability;
		let cltcUv = vec2f(
			( uv.x - uniformProbability ) / max( cltcProbability, 1e-7 ),
			uv.y,
		);
		return eonCltcDirection( wo, roughness, cltcUv );

	}

`,[Cc,Fc,uo]),fo=k(`

	fn eonPdf( wo: vec3f, wi: vec3f, roughness: f32 ) -> f32 {

		// The EON proposal is defined over the positive hemisphere.
		if ( wo.z <= 0.0 || wi.z <= 0.0 ) {

			return 0.0;

		}

		let uniformProbability = eonUniformProbability( wo, roughness );
		let cltcProbability = 1.0 - uniformProbability;
		let uniformPdf = 1.0 / ( 2.0 * PI );

		return uniformProbability * uniformPdf +
			cltcProbability * eonCltcPdf( wo, wi, roughness );

	}

`,[T,_c,uo]);var $c=h`

	fn velvetD( cosThetaH: f32, roughness: f32 ) -> f32 {

		var alpha = max( roughness, 0.07 );
		alpha = alpha * alpha;

		let invAlpha = 1.0 / alpha;
		let sqrCosThetaH = cosThetaH * cosThetaH;
		let sinThetaH = max( 1.0 - sqrCosThetaH, 0.001 );

		return ( 2.0 + invAlpha ) * pow( sinThetaH, 0.5 * invAlpha ) / ( 2.0 * PI );

	}

`,bt=h`

	fn velvetParamsInterpolate( i: i32, oneMinusAlphaSquared: f32 ) -> f32 {

		let p0 = array<f32, 5>( 25.3245, 3.32435, 0.16801, - 1.27393, - 4.85967 );
		let p1 = array<f32, 5>( 21.5473, 3.82987, 0.19823, - 1.97760, - 4.32054 );

		return mix( p1[ i ], p0[ i ], oneMinusAlphaSquared );

	}

`,Wa=h`

	fn velvetL( x: f32, alpha: f32 ) -> f32 {

		let oneMinusAlpha = 1.0 - alpha;
		let oneMinusAlphaSquared = oneMinusAlpha * oneMinusAlpha;

		let a = ${bt}( 0, oneMinusAlphaSquared );
		let b = ${bt}( 1, oneMinusAlphaSquared );
		let c = ${bt}( 2, oneMinusAlphaSquared );
		let d = ${bt}( 3, oneMinusAlphaSquared );
		let e = ${bt}( 4, oneMinusAlphaSquared );

		return a / ( 1.0 + b * pow( abs( x ), c ) ) + d * x + e;

	}

`,po=h`

	fn velvetLambda( cosTheta: f32, alpha: f32 ) -> f32 {

		if ( abs( cosTheta ) < 0.5 ) {

			return exp( ${Wa}( cosTheta, alpha ) );

		} else {

			return exp( 2.0 * ${Wa}( 0.5, alpha ) - ${Wa}( 1.0 - cosTheta, alpha ) );

		}

	}

`,Mc=h`

	fn velvetG( cosThetaO: f32, cosThetaI: f32, roughness: f32 ) -> f32 {

		var alpha = max( roughness, 0.07 );
		alpha = alpha * alpha;

		return 1.0 / ( 1.0 + ${po}( cosThetaO, alpha ) + ${po}( cosThetaI, alpha ) );

	}

`,mo=h`

	fn directionalAlbedoSheen( cosThetaIn: f32, alpha: f32 ) -> f32 {

		let cosTheta = saturate( cosThetaIn );
		let c = 1.0 - cosTheta;
		let c3 = c * c * c;

		return 0.65584461 * c3 + 1.0 / ( 4.16526551 + exp( -7.97291361 * sqrt( alpha ) + 6.33516894 ) );

	}

`,go=h`

	fn sheenAlbedoScaling( wo: vec3f, wi: vec3f, surf: ${M} ) -> f32 {

		var alpha = max( surf.sheenRoughness, 0.07 );
		alpha = alpha * alpha;

		let maxSheenColor = max( max( surf.sheenColor.r, surf.sheenColor.g ), surf.sheenColor.b );

		let eWo = ${mo}( clamp( wo.z, 0.001, 1.0 ), alpha );
		let eWi = ${mo}( clamp( wi.z, 0.001, 1.0 ), alpha );

		return min( 1.0 - maxSheenColor * eWo, 1.0 - maxSheenColor * eWi );

	}

`,xo=h`

	fn sheenColor( wo: vec3f, wi: vec3f, wh: vec3f, surf: ${M} ) -> vec3f {

		let cosThetaO = clamp( wo.z, 0.001, 1.0 );
		let cosThetaI = clamp( wi.z, 0.001, 1.0 );
		let cosThetaH = wh.z;

		let D = ${$c}( cosThetaH, surf.sheenRoughness );
		let G = ${Mc}( cosThetaO, cosThetaI, surf.sheenRoughness );

		// See equation (1) in http://www.aconty.com/pdf/s2017_pbs_imageworks_sheen.pdf
		var color = surf.sheenColor;
		color *= D * G / ( 4.0 * abs( cosThetaO * cosThetaI ) );

		return color;

	}

`;import{Storage3DTexture as Nc,RGBAFormat as Bc,LinearFilter as vo,HalfFloatType as Pc,MathUtils as yo}from"three/webgpu";import{storageTexture3D as Ac,globalId as Lc,uniform as Er,texture3D as Ec,sampler as zc}from"three/tsl";var zr=32,kr=16,Hr=class extends Nc{constructor(){super(zr,zr,31),this.type=Pc,this.format=Bc,this.minFilter=vo,this.magFilter=vo,this.dielectricLayerCount=10,this.transmissiveLayerCount=10,this.minIoR=1,this.maxIoR=2.5,this.sampleConductorFn=w("_sampleConductorFn",this),this.sampleDielectricFn=w("_sampleDielectricFn",this),this.sampleTransmissiveFn=w("_sampleTransmissiveFn",this)}generate(e){let{dielectricLayerCount:t,transmissiveLayerCount:r,minIoR:a,maxIoR:s}=this,i={outputTarget:Ac(this).toWriteOnly(),globalId:Lc,eta:Er(1),layer:Er(0,"uint"),includeFresnel:Er(0),includeRefraction:Er(0)},n=[zr/kr,zr/kr,1],o=new _(fs(i.outputTarget)(i),{workgroupSize:[kr,kr,1]});i.layer.value=0,i.eta.value=1,i.includeFresnel.value=0,i.includeRefraction.value=0,e.compute(o.kernel,n);for(let g=0;g<t;g++)i.layer.value++,i.eta.value=1/yo.mapLinear(g,0,t-1,a,s),i.includeFresnel.value=1,e.compute(o.kernel,n);i.includeFresnel.value=1,i.includeRefraction.value=1;for(let g=0;g<r;g++){let x=yo.mapLinear(g,0,r-1,a,s);i.layer.value=1+t+g,i.eta.value=1/x,e.compute(o.kernel,n),i.layer.value=1+t+r+g,i.eta.value=x,e.compute(o.kernel,n)}o.dispose();let u=h`
			fn mapLinearClamped( v: f32, a0: f32, a1: f32, b0: f32, b1: f32 ) -> f32 {

				let mapped = saturate( ( v - a0 ) / ( a1 - a0 ) );
				return mix( b0, b1, mapped );

			}
		`,l=Ec(this).setName("turquinTexture"),f=zc(this).setName("turquinSampler"),p=1/(1+t+2*r);this._sampleConductorFn=h`
			fn sampleConductor( cosTheta0: f32, roughness: f32 ) -> f32 {

				let layer = 0.5;
				let uvw = vec3f( cosTheta0, roughness, layer * ${p} );
				return textureSampleLevel( ${l}, ${f}, uvw, 0 ).r;

			}
		`,this._sampleDielectricFn=h`
			fn sampleDielectric( cosTheta0: f32, roughness: f32, ior: f32 ) -> f32 {

				let blockStart = 1.0;
				let layer = ${u}(
					ior,
					f32( ${a} ), f32( ${s} ),
					0.5, f32( ${t} ) - 0.5,
				) + blockStart;

				let uvw = vec3f( cosTheta0, roughness, layer * ${p} );
				return textureSampleLevel( ${l}, ${f}, uvw, 0 ).r;

			}
		`;let m=1+t,d=1+t+r;this._sampleTransmissiveFn=h`
			fn sampleTransmissive( cosTheta0: f32, roughness: f32, ior: f32, entering: bool ) -> f32 {

				let blockStart = select(
					f32( ${d} ),
					f32( ${m} ),
					entering
				);
				let layer = ${u}(
					ior,
					f32( ${a} ), f32( ${s} ),
					0.5, f32( ${r} ) - 0.5,
				) + blockStart;

				let uvw = vec3f( cosTheta0, roughness, layer * ${p} );
				return textureSampleLevel( ${l}, ${f}, uvw, 0 ).r;

			}
		`}};var bo=wo(1.5),So=wo(1e6),Vr=class extends Lr{constructor(e={}){super();let{specularBrdf:t=Ta,specularBtdf:r=Ia,diffuseBrdf:a=no,fresnelMix:s=cs,conductorFresnel:i=ds,fresnelCoat:n=hs,iridescentFresnel:o=Ra}=e;this.turquinTexture=new Hr,this.specularBrdf=t,this.specularBtdf=r,this.diffuseBrdf=a,this.fresnelMix=s,this.conductorFresnel=i,this.fresnelCoat=n,this.iridescentFresnel=o,this.transmissionFresnel=us(o)}init(e){this.turquinTexture.generate(e)}getBsdfNode(){this._bsdfEvalFunc=h`

			// The material is organized as one scoped block per lobe in cascade order - clearcoat,
			// sheen, transmission, specular, diffuse - each accumulating into a shared result and
			// guarding its own hemisphere.
			// TODO: energy only cascades downward through front faces, so the layers are always traversed
			// outside-in and cannot reflect energy back into the glass from below.
			fn bsdfEval( ctx: ${xa}, surf: ${M} ) -> vec3f {

				let NdotV = ctx.V.z;
				let NdotL = ctx.L.z;

				// Each lobe contributes into "result" within its own scope, evaluated in cascade.
				// "attenuation" carries the fraction of energy each layer passes through to
				// the layers beneath it. Every lobe guards its own hemisphere.
				var result = vec3f( 0.0 );
				var attenuation = vec3f( 1.0 );

				// clearcoat
				if ( NdotL > 0.0 && surf.clearcoat > 0.0 ) {

					// the clearcoat evaluates in its own frame
					let toClearcoatMat = surf.clearcoatInvBasis * surf.normalBasis;
					let Vc = normalize( toClearcoatMat * ctx.V );
					let Lc = normalize( toClearcoatMat * ctx.L );
					let Hc = normalize( toClearcoatMat * ctx.H );
					let NdotVc = Vc.z;

					let clearcoatAlpha = surf.clearcoatRoughness * surf.clearcoatRoughness;

					// reuse the same pattern for energy conservation used in the dielectric layer
					let clearcoatEnergySS = max( ${this.turquinTexture.sampleConductorFn}( NdotVc, surf.clearcoatRoughness ), 1e-5 );
					let clearcoatBoost = 1.0 + ${A}( 1.5 ) * ( 1.0 - clearcoatEnergySS ) / clearcoatEnergySS;

					let clearcoatSpecular = ${this.specularBrdf}( Vc, Lc, Hc, vec2( clearcoatAlpha ) ) * clearcoatBoost;
					let clearcoatFresnel = ${Q}( abs( dot( Vc, Hc ) ), ${A}( 1.5 ) );

					// retrieve specular energy reflected by this layer
					let clearcoatFresnelEnergySS = ${this.turquinTexture.sampleDielectricFn}( NdotVc, surf.clearcoatRoughness, 1.5 ) * clearcoatBoost;

					result += surf.clearcoat * clearcoatFresnel * clearcoatSpecular;
					attenuation *= 1.0 - surf.clearcoat * clearcoatFresnelEnergySS;

				}

				// sheen
				if ( NdotL > 0.0 && surf.sheen > 0.0 ) {

					result += attenuation * surf.sheen * ${xo}( ctx.V, ctx.L, ctx.H, surf );
					attenuation *= mix( 1.0, ${go}( ctx.V, ctx.L, surf ), surf.sheen );

				}

				// transmission
				// handles specular reflection and transmission
				if ( surf.transmission > 0.0 ) {

					let matchedIor = ${Ae}( surf.eta );

					// anisotropic roughness along tangent, bitangent
					let alphaB = surf.roughness * surf.roughness;
					let alphaT = mix( alphaB, 1.0, surf.anisotropy * surf.anisotropy );
					let alpha = vec2( alphaT, alphaB );

					// multiscatter compensation
					var glassBoost = 0.0;
					if ( matchedIor ) {

						glassBoost = 1.0;

					} else if ( surf.thinWall ) {

						// thin wall halves are reflection-shaped so each is compensated with the conductor albedo at its own roughness.
						glassBoost = 1.0 / max( ${this.turquinTexture.sampleConductorFn}( NdotV, surf.roughness ), 1e-5 );

					} else {

						// volumetric bsdf is scaled by its total reflected + refracted energy
						glassBoost = 1.0 / max( ${this.turquinTexture.sampleTransmissiveFn}( NdotV, surf.roughness, surf.ior, surf.frontFace ), 1e-5 );

					}

					let fresnelCosine = select( ctx.VdotH, NdotV, surf.thinWall );
					let fresnel = ${this.transmissionFresnel}( fresnelCosine, surf );

					if ( NdotL < 0.0 ) {

						var refraction = vec3f( 0.0 );
						if ( surf.thinWall && ! matchedIor ) {

							// evaluate the flipped reflection, compensated at the remapped roughness
							let wiMirror = vec3f( ctx.L.xy, - ctx.L.z );
							let thinWallAlpha = vec2f( ${lr}( alphaB, surf.ior ) );
							let thinWallEnergySS = max( ${this.turquinTexture.sampleConductorFn}( NdotV, sqrt( thinWallAlpha.x ) ), 1e-5 );
							refraction = fresnel.transmittance * ${this.specularBrdf}( ctx.V, wiMirror, ctx.H, thinWallAlpha ) / thinWallEnergySS;

						} else if ( ! matchedIor ) {

							// The default BTDF contains the plain dielectric Fresnel complement. Replace it
							// with the colored thin-film-aware coefficient shared by sampling and the PDF.
							let dielectricTransmittance = 1.0 - ${xe}( abs( ctx.VdotH ), surf.eta );
							if ( dielectricTransmittance > EPSILON ) {

								refraction = ${this.specularBtdf}( ctx.V, ctx.L, ctx.H, alpha, surf.eta ) *
									fresnel.transmittance / dielectricTransmittance * glassBoost;

							}

						}

						// the refracted half is not attenuated by the layers above
						result += ( 1.0 - surf.metalness ) * surf.transmission * refraction * surf.color;

					} else {

						// the raw single scatter lobe scaled by the glass compensation boost rather
						// than the opaque dielectric boost
						let specular = ${this.specularBrdf}( ctx.V, ctx.L, ctx.H, alpha );
						let dielectricSpecular = specular * glassBoost;

						let reflection = dielectricSpecular * fresnel.reflectance;

						result += attenuation * ( 1.0 - surf.metalness ) * surf.transmission * reflection;

					}

				}

				// specular
				// metallic + dielectric + iridescence
				if ( NdotL > 0.0 ) {

					// anisotropic roughness along tangent, bitangent
					let alphaB = surf.roughness * surf.roughness;
					let alphaT = mix( alphaB, 1.0, surf.anisotropy * surf.anisotropy );
					let alpha = vec2( alphaT, alphaB );

					// Sample the single scatter energy for specular at the given roughness
					let energySS = max( ${this.turquinTexture.sampleConductorFn}( NdotV, surf.roughness ), 1e-5 );
					let specular = ${this.specularBrdf}( ctx.V, ctx.L, ctx.H, alpha );

					// metallic with the multiscatter comp
					let metallicBoost = 1.0 + surf.color * ( 1.0 - energySS ) / energySS;
					let metallicSpecular = specular * metallicBoost;
					var metallicReflectance = ${this.conductorFresnel}( ctx.VdotH, surf.color, vec3f( 1.0 ) );

					// dielectric with the multiscatter comp
					let dielectricBoost = 1.0 + surf.f0 * ( 1.0 - energySS ) / energySS;
					let dielectricSpecular = specular * dielectricBoost;

					// KHR_materials_specular: fold the specular color and intensity into the dielectric f0.
					// Schlick is used on both hit sides, matching Cycles - the opaque specular carries no
					// TIR so the energy removed from the base always matches the energy paid back
					let dielectricF0 = min( surf.f0 * surf.specularColor, vec3f( 1.0 ) );
					let dielectricFr = ${Ne}( ctx.VdotH, dielectricF0, vec3f( 1.0 ) );
					var dielectricReflectance = surf.specularIntensity * dielectricFr;

					// iridescence
					var filmFresnelMax = 0.0;
					if ( surf.iridescence > 0.0 ) {

						// the media on either side of the film - air outside and the volume interior
						// as the base on front faces, swapped on back faces so TIR can take effect
						let outsideIor = select( surf.ior, 1.0, surf.frontFace );
						let filmBaseIor = select( 1.0, surf.ior, surf.frontFace );

						let metallicFilmFresnel = ${this.iridescentFresnel}( ctx.VdotH, surf.color, surf.iridescenceIor, outsideIor, surf.iridescenceThickness );
						metallicReflectance = mix( metallicReflectance, metallicFilmFresnel, surf.iridescence );

						let dielectricFilmFresnel = ${this.iridescentFresnel}( ctx.VdotH, vec3f( ${A}( filmBaseIor ) ), surf.iridescenceIor, outsideIor, surf.iridescenceThickness );
						dielectricReflectance = mix( dielectricReflectance, dielectricFilmFresnel, surf.iridescence );
						filmFresnelMax = max( max( dielectricFilmFresnel.r, dielectricFilmFresnel.g ), dielectricFilmFresnel.b );

					}

					let metallic = metallicSpecular * metallicReflectance;
					let dielectric = dielectricSpecular * dielectricReflectance;

					// the energy the specular interface takes from the layers below
					let fresnelEnergySS = ${this.turquinTexture.sampleDielectricFn}( NdotV, surf.roughness, surf.ior ) * dielectricBoost;

					result += attenuation * mix( ( 1.0 - surf.transmission ) * dielectric, metallic, surf.metalness );
					attenuation *= ( 1.0 - surf.metalness ) * mix( 1.0 - fresnelEnergySS, 1.0 - filmFresnelMax, surf.iridescence );

				}

				// diffuse
				if ( NdotL > 0.0 ) {

					// the dielectric base mixes diffuse with transmission - the transmissive half
					// is carried by the glass lobe above
					let diffuseVdotH = sqrt( saturate( 0.5 * ( 1.0 + dot( ctx.V, ctx.L ) ) ) );
					let reflection = ${this.diffuseBrdf}( NdotV, NdotL, diffuseVdotH, surf );
					let diffuse = ( 1.0 - surf.transmission ) * reflection;

					result += attenuation * diffuse;

				}

				return result;

			}

		`;let e=this.getBsdfEvalPdfNode();return h`

			fn bsdfSample( worldWo: vec3f, surf: ${M} ) -> ${J} {

				var result: ${J};
				result.color = vec3f( 0.0 );
				result.isTransmissive = false;
				result.direction = vec3f( 0.0 );
				result.pdf = 0.0;

				let wo = normalize( surf.normalInvBasis * worldWo );
				let woClearcoat = normalize( surf.clearcoatInvBasis * worldWo );

				// TODO: mirror bsdfEval's layer structure - the glass layer should own both its
				// reflection and refraction halves
				// lobe selection weights and cumulative bounds in cascade order:
				// clearcoat, specular, transmission, diffuse
				let weights = ${va}( wo, wo, woClearcoat, vec3( 0, 0, 1 ), ${bo}, surf );
				let cdfClearcoat = weights.clearcoat;
				let cdfSpecular = cdfClearcoat + weights.specular;
				let cdfTransmission = cdfSpecular + weights.transmission;
				let cdfTotal = cdfTransmission + weights.diffuse;

				// random samples for lobes
				let lobeSample = ${q}( ${Vi} ) * cdfTotal;
				let directionUV = ${O}( ${qt} );

				// output
				var wi: vec3f;
				var wh: vec3f;

				// TODO: see if we can clean up these flags so they're not necessary
				var isTransmissionLobe = false;
				var isDeltaTransmission = false;
				var deltaTransmittance = vec3f( 1.0 );
				var deltaProbability = 1.0;
				var isDead = false;

				if ( lobeSample <= cdfClearcoat ) {

					// clearcoat
					let clearcoatAlpha = surf.clearcoatRoughness * surf.clearcoatRoughness;
					let whCoat = ${ye}( woClearcoat, vec2( clearcoatAlpha ), directionUV );
					let wiCoat = - normalize( reflect( woClearcoat, whCoat ) );

					wi = normalize( surf.normalInvBasis * surf.clearcoatBasis * wiCoat );
					wh = normalize( surf.normalInvBasis * surf.clearcoatBasis * whCoat );

					// reflected rays must leave above the geometry surface - flip rays that land
					// below it due to the shading normal. Rays below the shading hemisphere are
					// left as is since their loss is refunded by the energy compensation tables
					let faceNormal = normalize( surf.normalInvBasis * surf.faceNormal );
					let geomDotDir = dot( wi, faceNormal );
					if ( wi.z > 0.0 && geomDotDir < 0.0 ) {

						wi = normalize( wi - 2.0 * geomDotDir * faceNormal );

					}

				} else if ( lobeSample <= cdfSpecular ) {

					// specular
					// anisotropic roughness along tangent, bitangent
					let alphaB = surf.roughness * surf.roughness;
					let alphaT = mix( alphaB, 1.0, surf.anisotropy * surf.anisotropy );
					let alpha = vec2( alphaT, alphaB );

					wh = ${ye}( wo, alpha, directionUV );
					wi = - normalize( reflect( wo, wh ) );

					// reflected rays must leave above the geometry surface - flip rays that land
					// below it due to the shading normal. Rays below the shading hemisphere are
					// left as is since their loss is refunded by the energy compensation tables
					let faceNormal = normalize( surf.normalInvBasis * surf.faceNormal );
					let geomDotDir = dot( wi, faceNormal );
					if ( wi.z > 0.0 && geomDotDir < 0.0 ) {

						wi = normalize( wi - 2.0 * geomDotDir * faceNormal );

					}

				} else if ( lobeSample <= cdfTransmission ) {

					// transmission
					isTransmissionLobe = true;

					// anisotropic roughness along tangent, bitangent
					let alphaB = surf.roughness * surf.roughness;
					let alphaT = mix( alphaB, 1.0, surf.anisotropy * surf.anisotropy );
					let alpha = vec2( alphaT, alphaB );

					// sample the half vector first and select reflection or refraction by the
					// facet fresnel, matching Cycles - total internal reflection drives the
					// fresnel to 1 so TIR facets always reflect with a matching pdf
					wh = ${ye}( wo, alpha, directionUV );

					let fresnelCosine = select( dot( wo, wh ), wo.z, surf.thinWall );
					let fresnel = ${this.transmissionFresnel}( fresnelCosine, surf );

					let fresnelSample = ( lobeSample - cdfSpecular ) / ( cdfTransmission - cdfSpecular );
					let doReflect = fresnelSample < fresnel.reflectProbability;
					if ( doReflect ) {

						wi = - normalize( reflect( wo, wh ) );

					} else if ( ${Ae}( surf.eta ) ) {

						// With no IOR boundary, rough transmission collapses to straight-through
						// delta transmission independent of the sampled microfacet.
						wi = - wo;
						wh = vec3f( 0.0, 0.0, 1.0 );
						isDeltaTransmission = true;
						deltaTransmittance = fresnel.transmittance;
						deltaProbability = 1.0 - fresnel.reflectProbability;

					} else if ( surf.thinWall ) {

						// model the double refraction as a single reflection flipped through the
						// surface at the remapped thin wall roughness
						let thinWallAlpha = vec2f( ${lr}( alphaB, surf.ior ) );
						wh = ${ye}( wo, thinWallAlpha, directionUV );
						wi = - normalize( reflect( wo, wh ) );
						wi = vec3f( wi.xy, - wi.z );

					} else {

						wi = refract( - wo, wh, surf.eta );

					}

					// the facet choice must agree with the resulting hemisphere - reflection above,
					// transmission below. Mismatched samples are dropped since their loss is
					// refunded by the energy compensation tables
					isDead = doReflect != ( wi.z > 0.0 );

				} else if ( lobeSample <= cdfTotal ) {

					// diffuse
					// all diffuse BRDF variants share the EON sampling proposal
					wi = ${ho}( wo, surf.diffuseRoughness, directionUV );
					wh = normalize( wi + wo );

					// reflected rays must leave above the geometry surface - flip rays that land
					// below it due to the shading normal. Rays below the shading hemisphere are
					// left as is since their loss is refunded by the energy compensation tables
					let faceNormal = normalize( surf.normalInvBasis * surf.faceNormal );
					let geomDotDir = dot( wi, faceNormal );
					if ( wi.z > 0.0 && geomDotDir < 0.0 ) {

						wi = normalize( wi - 2.0 * geomDotDir * faceNormal );

					}

				}

				let worldWi = normalize( surf.normalBasis * wi );
				if ( isDeltaTransmission ) {

					// Cycles represents a singular event with a large matching BSDF and PDF. Their
					// ratio preserves throughput while forward MIS correctly gives the event full weight.
					result.color = ( 1.0 - surf.metalness ) * surf.transmission * surf.color *
						deltaTransmittance * ${So};
					result.direction = worldWi;
					result.pdf = weights.transmission * deltaProbability * ${So};
					result.isTransmissive = dot( worldWi, surf.faceNormal ) < 0.0;

				} else {

					// evaluate the shared eval / pdf function for the sampled direction so the sample
					// and light-sampling paths can never disagree on color or pdf
					result = ${e}( worldWo, worldWi, surf );

				}

				// mismatched glass facets and reflection lobe samples that land below the
				// hemisphere carry no energy - their loss is refunded by the compensation tables
				let invalid = isDead || ( ! isTransmissionLobe && wi.z <= 0.0 );
				result.color *= select( 1.0, 0.0, invalid );

				return result;

			}

		`}getBsdfEvalPdfNode(){if(this._bsdfEvalPdfNode)return this._bsdfEvalPdfNode;this._bsdfEvalFunc||this.getBsdfNode();let e=this._bsdfEvalFunc;return this._bsdfEvalPdfNode=h`

			fn bsdfEvalPdf( worldWo: vec3f, worldWi: vec3f, surf: ${M} ) -> ${J} {

				var result: ${J};
				result.color = vec3f( 0.0 );
				result.isTransmissive = false;
				result.direction = worldWi;
				result.pdf = 0.0;

				let wo = normalize( surf.normalInvBasis * worldWo );
				let wi = normalize( surf.normalInvBasis * worldWi );
				let woClearcoat = normalize( surf.clearcoatInvBasis * worldWo );

				let isTransmission = wi.z < 0.0;
				if ( isTransmission && ${Ae}( surf.eta ) ) {

					// Delta transmission has no finite solid-angle BSDF or PDF. It is handled
					// explicitly by bsdfSample, matching PBRT-v4's eta == 1 path.
					return result;

				}

				// reconstruct the half vector bsdfSample would have used for this direction -
				// reflections use the standard half vector while refractions use the generalized
				// form scaled by the ior ratio, oriented into the upper hemisphere
				var wh: vec3f;
				if ( ! isTransmission ) {

					wh = normalize( wo + wi );

				} else if ( surf.thinWall ) {

					// thin wall transmission is modeled as a reflection flipped through the surface
					wh = normalize( wo + vec3f( wi.xy, - wi.z ) );

				} else {

					wh = normalize( wi + wo * surf.eta );
					wh *= sign( wh.z );

				}

				let weights = ${va}( wo, wo, woClearcoat, vec3( 0, 0, 1 ), ${bo}, surf );

				// TODO: mirror bsdfEval's layer structure - the glass layer should own both its
				// reflection and refraction halves
				// pdf mixture - every lobe that can produce the direction contributes its share,
				// in the same cascade order and with the same terms as bsdfSample

				// clearcoat
				if ( weights.clearcoat > 0.0 ) {

					// the clearcoat lobe evaluates in its own frame
					let toClearcoatMat = surf.clearcoatInvBasis * surf.normalBasis;
					let wiClearcoat = normalize( toClearcoatMat * wi );
					if ( wiClearcoat.z > 0.0 ) {

						let whClearcoat = normalize( toClearcoatMat * wh );
						let clearcoatAlpha = surf.clearcoatRoughness * surf.clearcoatRoughness;
						result.pdf += weights.clearcoat * ${be}( woClearcoat, whClearcoat, vec2( clearcoatAlpha ) );

					}

				}

				// specular
				if ( weights.specular > 0.0 && wi.z > 0.0 ) {

					// anisotropic roughness along tangent, bitangent
					let alphaB = surf.roughness * surf.roughness;
					let alphaT = mix( alphaB, 1.0, surf.anisotropy * surf.anisotropy );
					let alpha = vec2( alphaT, alphaB );

					result.pdf += weights.specular * ${be}( wo, wh, alpha );

				}

				// transmission
				if ( weights.transmission > 0.0 ) {

					// anisotropic roughness along tangent, bitangent
					let alphaB = surf.roughness * surf.roughness;
					let alphaT = mix( alphaB, 1.0, surf.anisotropy * surf.anisotropy );
					let alpha = vec2( alphaT, alphaB );

					// the glass lobe selects reflection or refraction by the facet fresnel so
					// each side carries the corresponding share of the transmission pdf
					let fresnelCosine = select( dot( wo, wh ), wo.z, surf.thinWall );
					let fresnel = ${this.transmissionFresnel}( fresnelCosine, surf );

					if ( wi.z > 0.0 ) {

						result.pdf += weights.transmission * fresnel.reflectProbability * ${be}( wo, wh, alpha );

					} else if ( surf.thinWall ) {

						// the flipped reflection shares the reflection pdf at the remapped roughness
						let thinWallAlpha = vec2f( ${lr}( alphaB, surf.ior ) );
						result.pdf += weights.transmission * ( 1.0 - fresnel.reflectProbability ) * ${be}( wo, wh, thinWallAlpha );

					} else {

						result.pdf += weights.transmission * ( 1.0 - fresnel.reflectProbability ) * ${or}( wo, wi, wh, alpha, surf.eta );

					}

				}

				// diffuse
				if ( weights.diffuse > 0.0 ) {

					result.pdf += weights.diffuse * ${fo}( wo, wi, surf.diffuseRoughness );

				}

				//

				// construct the scatter context
				var ctx: ${xa};
				ctx.V = wo;
				ctx.L = wi;
				ctx.H = wh;
				ctx.VdotH = saturate( dot( wo, wh ) );

				// evaluate the bsdf for the direction
				result.color = ${e}( ctx, surf ) * abs( wi.z );

				// a direction crossing below the surface enters or leaves the volume
				result.isTransmissive = isTransmission && dot( worldWi, surf.faceNormal ) < 0.0;

				return result;

			}

		`,this._bsdfEvalPdfNode}};var Ke=new Do,Wr=new Wc,Ur=class{constructor(e,t){this.key=t,this.renderer=e,this.texture=null,this.hash=null;let r=new Hc(new Uint8Array([255,255,255,255]),1,1);r.minFilter=To,r.magFilter=To,this.colorTex=r}dispose(){this.colorTex.dispose(),this.texture?.dispose()}setFromScene(e){let{renderer:t,key:r,colorTex:a}=this,s=e[r],i="";if(s)s.isColor?(a.image.data[0]=s.r*255,a.image.data[1]=s.g*255,a.image.data[2]=s.b*255,a.image.data[3]=255,s=a,i=a.image.data.join(),a.needsUpdate=i!==this.hash):s.isCubeTexture?(i=null,s=new ii(t).generate(s)):(s=s.clone(),i=s.uuid+"_"+s.version);else{let n=t.getClearAlpha();t.getClearColor(Wr),a.image.data[0]=Wr.r*255,a.image.data[1]=Wr.g*255,a.image.data[2]=Wr.b*255,a.image.data[3]=n*255,s=a,i=a.image.data.join(),a.needsUpdate=i!==this.hash}if(i===null)return this.texture?.dispose(),this.texture=s,this.hash=null,!0;{let n=i!==this.hash;return n&&(this.texture?.dispose(),this.texture=s,this.hash=i),n}}},Ro=class{get maxBounces(){return this._pathTracer.maxBounces}set maxBounces(e){this._pathTracer.maxBounces=e,this.reset()}get frameBudget(){return this._pathTracer.frameBudget}set frameBudget(e){this._pathTracer.frameBudget=e}get maxTransparentBounces(){return this._pathTracer.maxTransparentBounces}set maxTransparentBounces(e){this._pathTracer.maxTransparentBounces=e,this.reset()}get maxSamples(){return this._pathTracer.maxSamples}set maxSamples(e){this._pathTracer.maxSamples=e,this._denoiser?.reset()}async getSampleCountsAsync(){let e=this._pathTracer,t=this._lastSampleCounts,r=await e.getSampleCountsAsync();t.min=r.min,t.max=r.max,t.avg=r.avg;let a=this.getRenderTime()/1e3;return t.samplesPerSecond=a>0?t.avg/a:0,{...t}}get transmissiveBackground(){return this._transmissiveBackground}set transmissiveBackground(e){this._transmissiveBackground!==e&&(this._transmissiveBackground=e,this._pathTracer.setTransmissiveBackground(e))}get filterGlossyFactor(){return this._filterGlossyFactor}set filterGlossyFactor(e){this._filterGlossyFactor!==e&&(this._filterGlossyFactor=e,this._pathTracer.setFilterGlossy(e))}get multipleImportanceSampling(){return this._multipleImportanceSampling}set multipleImportanceSampling(e){this._multipleImportanceSampling!==e&&this.setMultipleImportanceSampling(e)}get clampDirect(){return this._clampDirect}set clampDirect(e){e=Math.max(0,e),this._clampDirect!==e&&(this._clampDirect=e,this._pathTracer.setClamping(e,this._clampIndirect))}get clampIndirect(){return this._clampIndirect}set clampIndirect(e){e=Math.max(0,e),this._clampIndirect!==e&&(this._clampIndirect=e,this._pathTracer.setClamping(this._clampDirect,e))}get target(){return this._pathTracer.outputTarget??null}get fadeState(){return this._fadeState}get lowResTarget(){return this._lowResTarget}get lowResMode(){return this._pathTracer.lowResMode}get textureAtlas(){return this._bvhData.textureAtlas}useMegakernel(e){let t=this._pathTracer.maxSamples;this._pathTracer.dispose(),this._pathTracer=e?new xr(this._renderer):new vt(this._renderer),this._pathTracer.maxSamples=t,this._pathTracer.setBVHData(this._bvhData),this._pathTracer.setMaterial(this.material),this._pathTracer.setRandom(this.random),this._pathTracer.setMultipleImportanceSampling(this.multipleImportanceSampling),this._pathTracer.setTransmissiveBackground(this._transmissiveBackground),this._pathTracer.setFilterGlossy(this._filterGlossyFactor),this._pathTracer.setClamping(this._clampDirect,this._clampIndirect),this.setCamera(this.camera),this._pathTracer.setEnvironment(this._environmentCache.texture),this._pathTracer.setBackground(this._backgroundCache.texture),this.updateEnvironment(),this.updateLights()}constructor(e){this._renderer=e,this._timer=new qc,this._environmentCache=new Ur(e,"environment"),this._backgroundCache=new Ur(e,"background"),this._resetTime=-1,this._fadeState=0,this._lastSampleCounts={min:0,max:0,avg:0,samplesPerSecond:0},this._size=new Do,this._blitQuad=new Or(new Et),this._lowResTarget=new Gc(1,1),this._lowResTarget.type=Uc,this._lowResTarget.generateMipmaps=!1,this._pathTracer=new vt(e),this._denoiser=null,this._upscaler=null,this.minSamples=1,this.renderDelay=500,this.fadeDuration=500,this.dynamicLowRes=!0,this.lowResScale=.1,this.renderScale=1,this.synchronizeRenderSize=!0,this.generateMissingAttributes=!0,this.commonAttributes=["normal","tangent"],this.stableNoise=!0,this.pause=!1,this.filterGlossyFactor=1,this._clampDirect=0,this._clampIndirect=10,this.multipleImportanceSampling=!0,this.transmissiveBackground=ze,this.random=mt,this.material=new Vr,this._invViewProjectionMatrix=Yc(new jc),this._cameraRayFnHandle=null,this.setMaterial(this.material),this.setRandom(this.random),this.setScene(new Vc,new Oc)}setMultipleImportanceSampling(e){this._multipleImportanceSampling=e,this._pathTracer.setMultipleImportanceSampling(e),this.reset()}setDenoiser(e){this._denoiser?.reset(),this._denoiser=e,e&&(e.init(this._renderer),e.setScene(this.scene,this.camera))}setUpscaler(e){this._upscaler=e,e&&e.init(this._renderer)}setScene(e,t){e.updateMatrixWorld(!0),t.updateMatrixWorld(),e.traverse(a=>{this.generateMissingAttributes&&a.geometry?.isBufferGeometry&&Ya(a.geometry,this.commonAttributes),a.isSkinnedMesh?(a.boundsTree?a.boundsTree.refit():a.boundsTree=new te(a,{strategy:2,targetLeafSize:5,indirect:!0}),a.boundingBox===null&&(a.boundingBox=new kc),a.boundsTree.getBoundingBox(a.boundingBox)):a.isMesh&&(a.geometry.boundsTree||(a.geometry.boundsTree=new fe(a.geometry,{strategy:2,targetLeafSize:5})))});let r=new Br(e);r.update(),r.textureAtlas.setTextures(this._renderer,r.textures),this._bvhData&&(this._bvhData.dispose(),this._bvhData.textureAtlas.dispose()),this.scene=e,this._bvhData=r,this._pathTracer.setBVHData(r),this.setCamera(t),this.updateEnvironment(),this.updateLights(),this._denoiser?.setScene(e,t)}getMaterial(){return this.material}setMaterial(e){this.material=e,this._pathTracer.setMaterial(e),this.reset()}setRandom(e){this.random=e,this._pathTracer.setRandom(e),this.reset()}setCamera(e){if(this.camera=e,e.getCameraRayFn)this._cameraRayFnHandle=e.getCameraRayFn();else{let t=this._invViewProjectionMatrix;this._cameraRayFnHandle={update:()=>(e.coordinateSystem=Kc,e.updateMatrixWorld(),(e.isOrthographicCamera||e.isPerspectiveCamera)&&e.updateProjectionMatrix(),t.value.multiplyMatrices(e.matrixWorld,e.projectionMatrixInverse),!1),fn:h`
					fn getCameraRay( uv: vec2f, resolution: vec2f, ray: ptr<function, ${v}> ) -> bool {

						let ndc = uv * 2.0 - vec2f( 1.0 );
						*ray = ${ie}( ndc, ${t} );
						return true;

					}
				`}}this._bvhData.fns.getCameraRay=this._cameraRayFnHandle.fn,this._cameraRayFnHandle.update(),this._pathTracer.rebuild(),this.reset()}updateMaterials(){let{_bvhData:e,_renderer:t}=this;e.updateMaterials(),e.textureAtlas.setTextures(t,e.textures),this.reset()}updateTransforms(){this.scene.updateMatrixWorld(!0),this._bvhData.updateTransforms(),this.reset()}updateCamera(){let{_cameraRayFnHandle:e,_pathTracer:t}=this;e.update()&&t.rebuild(),this.reset()}updateEnvironment(){let{_pathTracer:e,scene:t,_environmentCache:r,_backgroundCache:a}=this;r.setFromScene(t)&&e.setEnvironment(r.texture),a.setFromScene(t)&&e.setBackground(a.texture),e.setEnvironmentParams(t.environmentIntensity,t.environmentRotation),e.setBackgroundParams(t.backgroundIntensity,t.backgroundRotation,t.backgroundBlurriness),this.reset()}updateLights(){let{_pathTracer:e,scene:t}=this,r=ri(t);e.setLights(r),this.reset()}setSize(e,t){(this._size.x!==e||this._size.y!==t)&&(this._size.set(e,t),this.reset())}reset(){this._pathTracer.reset(),this._denoiser?.reset(),this._resetTime=-1,this._fadeState=0,this._timer.update(),this._lastSampleCounts={min:0,max:0,avg:0,samplesPerSecond:0},this.stableNoise&&this._pathTracer.resetSeed()}renderSample(){let e=this._renderer,t=this._size,r=this._blitQuad,a=this._pathTracer,s=this._lowResTarget,i=this._timer,{renderDelay:n,dynamicLowRes:o,synchronizeRenderSize:u,renderScale:l,lowResScale:f,minSamples:p,maxSamples:m}=this;if(i.update(),!this._renderer._initialized)return;this.material.initialized||(this.material.init(e),this.material.initialized=!0);let d=1e3*i.getDelta(),g=this._resetTime===-1;g&&(this._resetTime=0,d=0),this._resetTime+=d;let x=e.getRenderTarget(),I=e.autoClear;if(u){e.getDrawingBufferSize(Ke);let wt=Math.floor(l*Ke.x),qr=Math.floor(l*Ke.y);this.setSize(wt,qr)}let{width:b,height:D}=t,y=this._resetTime<n||g&&o&&p!==0;y&&(b=Math.ceil(f*b),D=Math.ceil(f*D)),a.getSize(Ke),(Ke.x!==b||Ke.y!==D)&&(!y&&o&&(s.setSize(Math.ceil(f*b),Math.ceil(f*D)),e.copyTextureToTexture(a.outputTarget,s)),a.setSize(b,D)),!this.pause&&(!y||y&&o)&&(a.lowResMode=y,a.update());let L=this._denoiser,ce=this._upscaler,ue=!!L&&!L.complete&&!L.running&&m>0;y||((this._fadeState<1&&p>0||ue)&&this.getSampleCountsAsync(),this._lastSampleCounts.min>=p&&(this._fadeState+=d/this.fadeDuration,this._fadeState=Math.min(1,this._fadeState)||1));let de=y&&o?1:this._fadeState,Y=a.outputTarget;L&&!y&&(ue&&this._lastSampleCounts.min>=m&&L.update(a.outputTarget),Y=L.texture??Y),ce&&!y&&(Y=ce.upscale(Y,this.camera),e.setRenderTarget(x)),e.autoClear=o?!0:de===1,r.material.transition=o?de:1,r.material.opacity=o?1:de,r.material.fromTexture=s,r.material.texture=Y,r.render(e),e.autoClear=I,e.setRenderTarget(x)}renderDebugBounds(e={}){let{displayTLAS:t=!0,displayBLAS:r=!0,stopAtSurface:a=!1,saturationCount:s=64}=e,i=this._renderer,n=this.camera;if(!i._initialized)return;n.updateMatrixWorld(),(this._debugBoundsQuad===void 0||this._debugBoundsData!==this._bvhData)&&this._buildDebugBoundsQuad();let o=this._debugBoundsUniforms;o.cameraToModelMatrix.value.copy(n.matrixWorld),o.inverseProjectionMatrix.value.copy(n.projectionMatrixInverse),o.displayTLAS.value=t?1:0,o.displayBLAS.value=r?1:0,o.stopAtSurface.value=a?1:0,o.saturationCount.value=s;let u=i.getRenderTarget(),l=i.autoClear,f=i.toneMapping;i.setRenderTarget(null),i.autoClear=!0,i.toneMapping=Io,this._debugBoundsQuad.render(i),i.setRenderTarget(u),i.autoClear=l,i.toneMapping=f}_buildDebugBoundsQuad(){let e=this._bvhData,t=Ai(e),r=new Qc;r.colorNode=t(Zc(Xc())),this._debugBoundsQuad===void 0?this._debugBoundsQuad=new Or(r):(this._debugBoundsQuad.material.dispose(),this._debugBoundsQuad.material=r),this._debugBoundsUniforms=t.uniforms,this._debugBoundsData=e}renderTextureAtlas(e=0){let t=this._renderer;this._atlasDebugQuad||(this._atlasDebugQuad=new Or(new Pr));let r=this._atlasDebugQuad;r.material.texture=this.textureAtlas.texture,r.material.layer=e,t.setRenderTarget(null),r.render(t)}renderSampleDensity(){let e=this._renderer;if(!e._initialized)return;this.getSampleCountsAsync(),this._sampleDensityQuad||(this._sampleDensityQuad=new Or(new Ar));let t=e.toneMapping;e.toneMapping=Io;let r=this._sampleDensityQuad;r.material.texture=this._pathTracer.sampleCountTarget,r.material.minCount=this._lastSampleCounts.min,r.material.maxCount=this._lastSampleCounts.max,e.setRenderTarget(null),r.render(e),e.toneMapping=t}dispose(){this._pathTracer.dispose(),this._denoiser?.dispose(),this._upscaler?.dispose(),this._bvhData.dispose(),this._bvhData.textureAtlas.dispose(),this._environmentCache.dispose(),this._backgroundCache.dispose(),this._lowResTarget.dispose(),this._blitQuad.dispose(),this._blitQuad.material.dispose(),this._atlasDebugQuad?.dispose(),this._atlasDebugQuad?.material.dispose(),this._sampleDensityQuad?.dispose(),this._sampleDensityQuad?.material.dispose(),this._debugBoundsQuad!==void 0&&(this._debugBoundsQuad.dispose(),this._debugBoundsQuad.material.dispose())}getRenderTime(){return this._resetTime}};import{RenderTarget as Jc,FloatType as eu,HalfFloatType as tu,RGBAFormat as _o,DataTexture as ru,DataUtils as au,EquirectangularReflectionMapping as iu,NodeMaterial as su,QuadMesh as ou}from"three/webgpu";import{Fn as nu,pmremTexture as lu,uniform as cu,uv as uu,vec3 as du,float as hu,sin as Co,cos as Fo}from"three/tsl";var $o=Math.PI,fu=nu(([c])=>{let e=c.x.sub(.5),t=hu(1).sub(c.y),r=e.mul(2*$o),a=t.mul($o),s=Co(a);return du(s.mul(Fo(r)),Fo(a),s.mul(Co(r)))}),Mo=class{constructor(e){this.renderer=e,this._blur=cu(0),this._pmremNode=lu(null,fu(uu()),this._blur);let t=new su;t.colorNode=this._pmremNode,t.toneMapped=!1,this.quad=new ou(t),this.renderTarget=new Jc(1,1,{type:eu,format:_o,depthBuffer:!1})}dispose(){this._pmremNode.value=null,this._pmremNode.dispose(),this.quad.material.dispose(),this.renderTarget.dispose()}async generate(e,t=0,r=null,a=null){let{renderTarget:s,quad:i,renderer:n}=this,o=e.clone();r=r??o.image.width,a=a??o.image.height,s.setSize(r,a),s.texture.colorSpace=o.colorSpace,this._pmremNode.value=o,this._blur.value=t;let u=n.getRenderTarget();n.setRenderTarget(s),i.render(n),n.setRenderTarget(u);let l=await n.readRenderTargetPixelsAsync(s,0,0,r,a),f=new Uint16Array(r*a*4);for(let m=0,d=f.length;m<d;m++)f[m]=au.toHalfFloat(l[m]);let p=new ru(f,r,a,_o,tu);return p.minFilter=o.minFilter,p.magFilter=o.magFilter,p.wrapS=o.wrapS,p.wrapT=o.wrapT,p.mapping=iu,p.colorSpace=o.colorSpace,p.needsUpdate=!0,this._pmremNode.value=null,o.dispose(),p}};import{ExternalTexture as pu,NearestFilter as No,NoToneMapping as mu,RenderTarget as gu,UnsignedByteType as xu}from"three/webgpu";import{diffuseColor as vu,mrt as yu,normalView as bu,vec4 as Su}from"three/tsl";var Bo=class{get texture(){return this._texture}get complete(){return this._complete}get running(){return this._running}constructor(e={}){let{initUNetFromURL:t,auxWeightsUrl:r,colorWeightsUrl:a,useAuxiliaryBuffers:s=!0,maxTileSize:i=null,dynamicTile:n=null}=e;if(!t)throw new Error('OIDNDenoiser: "initUNetFromURL" from "oidn-web" must be provided.');this.initUNetFromURL=t,this.auxWeightsUrl=r,this.colorWeightsUrl=a,this.useAuxiliaryBuffers=s,this.maxTileSize=i,this.dynamicTile=n,this.renderer=null,this.scene=null,this.camera=null,this._texture=null,this._running=!1,this._complete=!1,this._abort=null,this._requestId=0,this._unets={aux:null,color:null},this._resultPipeline=null,this._rawTexture=null,this._auxTarget=null}init(e){this.renderer=e}setScene(e,t){this.scene=e,this.camera=t}update(e){if(this._complete||this._running)return this._texture;let t=null,r=null;if(this.useAuxiliaryBuffers){let a=this._renderAuxiliaryBuffers(e.width,e.height);t=a.textures[0],r=a.textures[1]}return this.denoise(e,t,r),this._texture}async denoise(e,t=null,r=null){if(this._complete||this._running)return;this._running=!0;let a=!!(t&&r),s=++this._requestId,i;try{i=await this._initUNet(a)}catch(p){throw this._running=!1,p}if(s!==this._requestId||!this._running)return;let{renderer:n}=this,o=n.backend;n.initTexture(e);let{width:u,height:l}=e,f={color:{data:o.get(e).texture,width:u,height:l},progress:p=>this._copyOutputToTexture(p,u,l),done:p=>{this._copyOutputToTexture(p,u,l),this._running=!1,this._complete=!0,this._abort=null}};a&&(n.initTexture(t),n.initTexture(r),f.albedo={data:o.get(t).texture,width:u,height:l},f.normal={data:o.get(r).texture,width:u,height:l}),this._abort=i.tileExecute(f)}reset(){this._abort?.(),this._abort=null,this._texture?.dispose(),this._texture=null,this._rawTexture?.destroy(),this._rawTexture=null,this._running=!1,this._complete=!1}dispose(){this.reset(),this._auxTarget?.dispose(),this._auxTarget=null;for(let e in this._unets)this._unets[e]?.then(t=>t.dispose()),this._unets[e]=null}_renderAuxiliaryBuffers(e,t){let{renderer:r,scene:a,camera:s}=this;this._auxTarget||(this._auxTarget=new gu(1,1,{count:2,type:xu,minFilter:No,magFilter:No,samples:4}),this._auxTarget.textures[0].name="output",this._auxTarget.textures[1].name="normal");let i=this._auxTarget;i.setSize(e,t);let n=r.getRenderTarget(),o=r.getMRT(),u=r.toneMapping;return r.toneMapping=mu,r.setRenderTarget(i),r.setMRT(yu({output:vu,normal:Su(bu.mul(.5).add(.5),1)})),r.render(a,s),r.setMRT(o),r.setRenderTarget(n),r.toneMapping=u,i}_initUNet(e){let t=e?"aux":"color";return this._unets[t]||(this._unets[t]=(async()=>{let r=this.renderer.backend.device,a=e?this.auxWeightsUrl:this.colorWeightsUrl;if(!a)throw new Error(`OIDNDenoiser: no ${e?"auxWeightsUrl":"colorWeightsUrl"} was provided.`);let s={aux:e,hdr:!0};return this.maxTileSize!==null&&(s.maxTileSize=this.maxTileSize),this.dynamicTile!==null&&(s.dynamicTile=this.dynamicTile),this.initUNetFromURL(a,{device:r,adapterInfo:r.adapterInfo},s)})()),this._unets[t]}_copyOutputToTexture(e,t,r){let a=this.renderer.backend.device;if(!this._resultPipeline){let o=a.createShaderModule({code:`
					@group( 0 ) @binding( 0 ) var<storage, read> src : array<vec4f>;
					@group( 0 ) @binding( 1 ) var dst : texture_storage_2d<rgba16float, write>;

					@compute @workgroup_size( 8, 8 )
					fn main( @builtin( global_invocation_id ) gid : vec3u ) {

						let dims = textureDimensions( dst );
						if ( gid.x >= dims.x || gid.y >= dims.y ) {

							return;

						}

						textureStore( dst, gid.xy, src[ gid.y * dims.x + gid.x ] );

					}
				`});this._resultPipeline=a.createComputePipeline({layout:"auto",compute:{module:o,entryPoint:"main"}})}(!this._rawTexture||this._rawTexture.width!==t||this._rawTexture.height!==r)&&(this._rawTexture?.destroy(),this._rawTexture=a.createTexture({size:[t,r],format:"rgba16float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING}),this._texture?.dispose(),this._texture=new pu(this._rawTexture),this._texture.image={width:t,height:r});let s=a.createBindGroup({layout:this._resultPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:e.data}},{binding:1,resource:this._rawTexture.createView()}]}),i=a.createCommandEncoder(),n=i.beginComputePass();n.setPipeline(this._resultPipeline),n.setBindGroup(0,s),n.dispatchWorkgroups(Math.ceil(t/8),Math.ceil(r/8)),n.end(),a.queue.submit([i.finish()])}};import{Vector2 as wu}from"three/webgpu";var St=new wu,Po=class{constructor(e={}){let{Upscaler:t,sharpness:r=1}=e;if(!t)throw new Error('FSRUpscaler: the "Upscaler" class from "@pmndrs/upscaler" must be provided.');this.Upscaler=t,this.sharpness=r,this.renderer=null,this._upscaler=null}init(e){this.renderer=e,this._upscaler?.dispose(),this._upscaler=new this.Upscaler({renderer:e}),this._upscaler.init()}upscale(e,t){let{renderer:r,_upscaler:a}=this;return r.initTexture(e),r.getDrawingBufferSize(St),(a.displayWidth!==St.x||a.displayHeight!==St.y||a.renderWidth!==e.width||a.renderHeight!==e.height)&&a.configure({displayWidth:St.x,displayHeight:St.y,renderWidth:e.width,renderHeight:e.height,path:"spatial"}),a.settings.sharpness=this.sharpness,a.dispatch({color:e},t),a.outputTexture}dispose(){this._upscaler?.dispose(),this._upscaler=null}};import{Matrix4 as Tu}from"three";import{uniform as Iu,PI as Ao}from"three/tsl";si.prototype.getCameraRayFn=function(){let e=Iu(new Tu);return{fn:h`
		fn getCameraRay( uv: vec2f, resolution: vec2f, ray: ptr<function, ${v}> ) -> bool {

			// screen uv to spherical direction, matching three.js' equirect orientation
			let theta = ( uv.x - 0.5 ) * 2.0 * ${Ao};
			let phi = ( 1.0 - uv.y ) * ${Ao};
			let sinPhi = sin( phi );
			let direction = vec3f( sinPhi * cos( theta ), cos( phi ), sinPhi * sin( theta ) );

			// equirect ignores the projection - orient by the camera world matrix and place the origin.
			// there is no projection far plane, so the trace distance is unbounded
			ray.origin = ( ${e} * vec4f( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
			ray.direction = ( ${e} * vec4f( direction, 0.0 ) ).xyz;
			ray.maxDist = 0.0;
			return true;

		}
	`,update:()=>(e.value.copy(this.matrixWorld),!1)}};import{Matrix4 as Lo,WebGPUCoordinateSystem as Ru}from"three";import{uniform as De,PI as Eo}from"three/tsl";var Du=h`
	fn sampleCircle( uv: vec2f ) -> vec2f {

		let angle = 2.0 * ${Eo} * uv.x;
		let radius = sqrt( uv.y );
		return vec2f( cos( angle ), sin( angle ) ) * radius;

	}
`,_u=h`
	fn sampleTriangle( a: vec2f, b: vec2f, c: vec2f, rIn: vec2f ) -> vec2f {

		let e1 = a - b;
		let e2 = c - b;

		var r = rIn;
		if ( r.x + r.y > 1.0 ) {

			r = vec2f( 1.0 ) - r;

		}

		return e1 * r.x + e2 * r.y;

	}
`,Cu=h`
	fn sampleRegularPolygon( sidesIn: i32, uvw: vec3f ) -> vec2f {

		let sides = max( sidesIn, 3 );
		let anglePerSegment = 2.0 * ${Eo} / f32( sides );
		let segment = floor( f32( sides ) * uvw.x );

		let angle1 = anglePerSegment * segment;
		let angle2 = angle1 + anglePerSegment;
		let a = vec2f( sin( angle1 ), cos( angle1 ) );
		let b = vec2f( 0.0, 0.0 );
		let c = vec2f( sin( angle2 ), cos( angle2 ) );

		return ${_u}( a, b, c, uvw.yz );

	}
`,Fu=h`
	fn sampleAperture( blades: i32, uvw: vec3f ) -> vec2f {

		if ( blades == 0 ) {

			return ${Du}( uvw.xy );

		} else {

			return ${Cu}( blades, uvw );

		}

	}
`,$u=h`
	fn rotateVector( v: vec2f, t: f32 ) -> vec2f {

		let vc = cos( t );
		let vs = sin( t );
		return vec2f( v.x * vc - v.y * vs, v.x * vs + v.y * vc );

	}
`;Za.prototype.getCameraRayFn=function(){let e=De(new Lo),t=De(new Lo),r=De(0),a=De(0),s=De(0,"int"),i=De(0),n=De(1);return{fn:h`
		fn getCameraRay( uv: vec2f, resolution: vec2f, ray: ptr<function, ${v}> ) -> bool {

			// base ray
			let ndc = uv * 2.0 - vec2f( 1.0 );
			*ray = ${ie}( ndc, ${e} );

			// camera state
			let forward = normalize( ( ${t} * vec4f( 0.0, 0.0, - 1.0, 0.0 ) ).xyz );
			let cameraOrigin = ( ${t} * vec4f( 0.0, 0.0, 0.0, 1.0 ) ).xyz;

			// depth of field
			// measure focus distance from the camera origin along the optical axis so the focal
			// surface is a flat plane perpendicular to the camera forward vector rather than a sphere
			let focalPoint = cameraOrigin + ray.direction * ( ${r} / dot( ray.direction, forward ) );
			let nearDistance = dot( ray.origin - cameraOrigin, forward );

			// sample the aperture shape
			let shapeUVW = ${Me}( ${Oi} );
			var apertureSample = ${Fu}( ${s}, shapeUVW );
			apertureSample *= ${a} * 0.5 * 1e-3;

			// rotate + squash the sample for anamorphic apertures
			apertureSample =
				${$u}( apertureSample, ${i} )
				* vec2f( ${n}, 1.0 / ${n} );

			// aim from the aperture through the focal point, starting on the near plane like the base ray
			ray.origin = cameraOrigin + ( ${t} * vec4f( apertureSample, 0.0, 0.0 ) ).xyz;
			ray.direction = normalize( focalPoint - ray.origin );
			ray.origin += ray.direction * ( nearDistance / dot( ray.direction, forward ) );

			return true;

		}
	`,update:()=>(this.coordinateSystem=Ru,this.updateMatrixWorld(),this.updateProjectionMatrix(),e.value.multiplyMatrices(this.matrixWorld,this.projectionMatrixInverse),t.value.copy(this.matrixWorld),r.value=this.focusDistance,a.value=this.bokehSize,s.value=this.apertureBlades,i.value=this.apertureRotation,n.value=this.anamorphicRatio,!1)}};import{ArrayCamera as Mu,Matrix4 as Nu,Vector4 as Bu,WebGPUCoordinateSystem as Pu}from"three";import{uniformArray as zo,int as Au}from"three/tsl";Mu.prototype.getCameraRayFn=function(){let e={fn:null,update:null},t=Au(0),r=zo([],"mat4"),a=zo([],"vec4");return e.fn=h`
		fn getCameraRay( uv: vec2f, resolution: vec2f, ray: ptr<function, ${v}> ) -> bool {

			let pixel = uv * resolution;

			for ( var i = 0u; i < ${t}u; i ++ ) {

				let viewport = ${a}[ i ];
				let viewportMax = viewport.xy + viewport.zw;
				if ( all( pixel >= viewport.xy ) && all( pixel < viewportMax ) ) {

					let cameraUv = ( pixel - viewport.xy ) / viewport.zw;
					let ndc = cameraUv * 2.0 - vec2f( 1.0 );
					*ray = ${ie}( ndc, ${r}[ i ] );
					return true;

				}

			}

			return false;

		}
	`,e.update=()=>{let{cameras:s}=this,i=t.node.value!==s.length;for(t.node.value=s.length;a.array.length<s.length;)a.array.push(new Bu),r.array.push(new Nu);r.array.length=s.length,a.array.length=s.length;for(let n=0;n<s.length;n++){let o=s[n],u=o.viewport;o.coordinateSystem=Pu,o.updateMatrixWorld(),o.updateProjectionMatrix(),r.array[n].multiplyMatrices(o.matrixWorld,o.projectionMatrixInverse),a.array[n].copy(u)}return i},e};export{Mo as BlurredEnvMapGenerator,Po as FSRUpscaler,Bo as OIDNDenoiser,Eh as RANDOM_BLUE_DITHER,Ah as RANDOM_PCG,Lh as RANDOM_SOBOL,Et as RenderToScreenNodeMaterial,gs as SAMPLE_ACTIVE_FLAG,le as SAMPLE_COUNT_MASK,ke as SAMPLE_DISPATCHED_FLAG,pr as TRANSMISSIVE_BACKGROUND_ENVIRONMENT,ze as TRANSMISSIVE_BACKGROUND_OVERLAY,mr as TRANSMISSIVE_BACKGROUND_TRANSPARENT,Ro as WebGPUPathTracer};
