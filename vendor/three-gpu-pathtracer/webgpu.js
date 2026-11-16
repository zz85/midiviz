import{A as Qi,a as Bi,b as xt,c as Ei,d as Li,e as Oe,f as ki,g as Aa,h as Re,i as xe,o as Hi,q as zi,r as Ui,s as Oi,t as Vi,w as Wi,x as qi,z as Gi}from"./chunk-WTHQIZEU.js";import{a as Na}from"./chunk-WOT6VMZA.js";import{Box3 as rd,DataTexture as ad,EventDispatcher as id,LinearFilter as _a,MathUtils as sd,Vector2 as _n,Scene as od,PerspectiveCamera as nd,Color as ld,NoToneMapping as Ci,FloatType as cd,Timer as ud,StorageTexture as dd,MeshBasicNodeMaterial as hd,Matrix4 as fd,WebGPUCoordinateSystem as md}from"three/webgpu";import{uv as pd,uniform as gd,varying as xd}from"three/tsl";import{wgslFn as Pa}from"three/tsl";import{wgslFn as Ki,wgsl as Xi}from"three/tsl";import{StructTypeNode as Ve}from"three/webgpu";var B=new Ve({min:"array<f32, 3>",max:"array<f32, 3>"},"BVHBoundingBox");B.getLength=()=>6;var O=new Ve({leftBounds:"BVHBoundingBox",rightBounds:"BVHBoundingBox",rightChildOrTriangleOffset:"uint",splitAxisOrTriangleCount:"uint",_alignment0:"uint",_alignment1:"uint"},"BVHNode");O.getLength=()=>2*B.getLength()+4;var ji=new Ve({matrixWorld:"mat4x4f",inverseMatrixWorld:"mat4x4f",visible:"uint",_alignment0:"uint",_alignment1:"uint",_alignment2:"uint"},"TransformStruct"),v=new Ve({origin:"vec3f",direction:"vec3f",maxDist:"float"},"Ray"),ve=new Ve({indices:"vec4u",normal:"vec3f",didHit:"bool",barycoord:"vec3f",objectIndex:"uint",side:"float",dist:"float"},"IntersectionResult"),vt=new Ve({faceIndices:"vec4u",closestPoint:"vec3f",found:"bool",barycoord:"vec3f",objectIndex:"uint",faceNormal:"vec3f",side:"float",distanceSq:"float"},"PointQueryResult");var qt=Xi(`

	const BVH_STACK_DEPTH = 60u;
	const INFINITY = 1e20;
	const TRI_INTERSECT_EPSILON = 1e-5;

`),Gt=Xi(`
	struct IntersectionResult {
		indices: vec4u,
		normal: vec3f,
		didHit: bool,
		barycoord: vec3f,
		side: f32,
		dist: f32,
	};
`),sh=Ki(`

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

`),Yi=Ki(`

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

`,[v,B]);var Ba=Pa(`

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

`,[v,Gt,qt]),On=Pa(`

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

`,[Ba,v,Gt,qt]),uh=Pa(`

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

`,[On,Yi,v,O,Gt,qt]);import{Matrix4 as ws,Mesh as Zt,Group as sl}from"three";import{StorageBufferAttribute as Jt,StructTypeNode as ol}from"three/webgpu";import{storage as er}from"three/tsl";import{Node as Vn,TSL as Zi}from"three/webgpu";var Qt=class extends Vn{static get type(){return"ProxyCallNode"}constructor(e,t){super(),this.proxyNode=e,this.params=t}setup(){return this.proxyNode.proxyNode.call(...this.params)}},yt=class{get isNode(){return!0}get proxyNode(){let{proxyObject:e,proxyProperty:t}=this,r=t.split("."),a=e;for(let s=0,i=r.length;s<i;s++)a=a?.[r[s]];return a&&"functionNode"in a?a.functionNode:a??null}constructor(e,t=null){return this.proxyObject=t,this.proxyProperty=e,new Proxy(this,{get(r,a){if(a in r)return Reflect.get(r,a);{let s=r.proxyNode;if(!s)return;let i=Reflect.get(s,a);return typeof i=="function"?i.bind(s):i}},set(r,a,s){if(a in r)return Reflect.set(r,a,s);throw new Error("NodeProxy: Cannot set members of proxied nodes.")}})}},C=(...c)=>new yt(...c),R=(...c)=>{let e=new yt(...c),t=(...r)=>new Qt(e,r);return Zi.nodeProxyConstructor(t,e)},jt=class extends yt{get proxyNode(){return super.proxyNode||this.fallbackNode}constructor(e,t){super(e,null),Object.defineProperty(this,"fallbackNode",{value:t})}setup(e){return this.proxyObject=e.getContext(),this.proxyNode.setup(e)}},E=(...c)=>new jt(...c),N=(...c)=>{let e=new jt(...c),t=(...r)=>new Qt(e,r);return Zi.nodeProxyConstructor(t,e)};import{Vector4 as es}from"three";var Kt=64,ts=Kt/4,ye=new es,te=new es;function Ji(c,e,t,r){let a=e*8;for(let s=0;s<3;s++){let i=c[a+s],o=c[a+s+3];i>o?(t[r+s]=1,t[r+s+3]=-1):(t[r+s]=i,t[r+s+3]=o)}}function rs(c,e,t,r,a){let s=t*8;Ji(c,t+1,r,a),Ji(c,t+e[s+6],r,a+6)}function qn(c,e){let t=c?c.array:null,r=new Uint32Array(e.length*3);for(let a=0,s=e.length;a<s;a++){let i=3*a,o=3*e[a];for(let l=0;l<3;l++)r[i+l]=t?t[o+l]:o+l}return r}function Ea(c,e,t,r){let a=new Uint32Array(r),s=new Float32Array(r);c._roots.forEach(i=>{let o=new Uint16Array(i),l=new Uint32Array(i),h=new Float32Array(i);for(let n=0,f=i.byteLength/32;n<f;n++){let m=n*8,p=m*2,u=t*ts,g=xt(p,o);if(g||rs(h,l,n,s,u),e===null){t++;continue}if(g){let x=l[m+6],T=o[p+14],{transformSlot:b,nodeOffset:_}=T===0?{transformSlot:0,nodeOffset:0}:e[x];if(b>16777215)throw new Error(`packBVHBufferUtils: transform slot ${b} exceeds the 24-bit TLAS leaf limit.`);a[u+12]=_,a[u+13]=4278190080|b&16777215}else a[u+12]=l[m+6],a[u+13]=l[m+7];t++}})}function as(c,e){return is(new Uint16Array(c),new Uint32Array(c),e)}function is(c,e,t){if(xt(t*8*2,c))return 1;let a=e[t*8+6];return a+is(c,e,t+a)}function La(c,e=0){let t=new Uint16Array(c),r=new Uint32Array(c),a=0;return s(e*8,1),a;function s(i,o){let l=i,h=i*2;if(xt(h,t))a=Math.max(o,a);else{let f=Li(l,r),m=Ei(l);s(m,o+1),s(f,o+1)}}}function ss(c,e,t,r,a,s){let i=new Uint16Array(s),o=new Uint32Array(s),l=new Float32Array(s),h=new Uint16Array(c),n=new Uint32Array(c),f=new Float32Array(c);for(let m=0;m<t;m++){let p=e+m,u=p*8,g=u*2,x=a*ts,T=x*2;xt(g,h)?(o[x+12]=n[u+6]+r,i[T+26]=h[g+14],i[T+27]=65535):(rs(f,n,p,l,x),o[x+12]=n[u+6],o[x+13]=n[u+7]),a++}}function os(c,e,t,r,a){let{geometry:s}=c,{start:i,count:o,vertexStart:l}=e;if(c.indirect){let h=qn(s.index,c._indirectBuffer);for(let n=0;n<h.length;n++)a[n+r]=h[n]-l+t}else if(s.index)for(let h=0;h<o;h++)a[h+r]=s.index.getX(h+i)-l+t;else for(let h=0;h<o;h++)a[h+r]=h+i+t}function ns(c,e,t,r,a,s){let{geometry:i,mesh:o=null}=c,{vertexStart:l,vertexCount:h}=e,n=new Float32Array(r),f=a.getLength();a.membersLayout.forEach(({name:m},p)=>{let u=i.attributes[m];s.getDefaultAttributeValue(m,ye);for(let g=0;g<h;g++){if(u){switch(te.fromBufferAttribute(u,g+l),u.itemSize){case 1:te.y=ye.y,te.z=ye.z,te.w=ye.w;break;case 2:te.z=ye.z,te.w=ye.w;break;case 3:te.w=ye.w;break}o&&(m==="position"||m==="normal"||m==="tangent")&&o.applyBoneTransform(g+l,te)}else te.copy(ye);te.toArray(n,(t+g)*f+p*4)}})}import{CodeNode as Gn,FunctionNode as Qn,Node as ls,TSL as jn}from"three/webgpu";var ka=class extends ls{constructor(e){super(),this.literal=e}build(){return this.literal}},bt=class extends ls{constructor(e,t="property"){super(),this.node=e,this.output=t}build(e){return this.node.build(e,this.output)}};function Kn(c){return c.isNode?new bt(c):null}function cs(c){let e=[];for(let t of c)if(Array.isArray(t))for(let r of t){let a=Kn(r);a&&e.push(a)}return e}function us(c,e){return c.map(t=>(t&&!t.isNode&&t instanceof Function&&(t=t(e)),t&&t.isNode?(t.setup(e),t.isWGSLTagCodeNode?new bt(t,"inline"):new bt(t)):t))}function Ha(c,e,t){let r="";for(let a=0,s=c.length;a<s;a++)if(r+=c[a],a<e.length){let i=e[a];Array.isArray(i)||(typeof i=="string"||typeof i=="number"?r+=String(i):r+=i.build(t))}return r}var za=class extends Qn{static get type(){return"WGSLTagFnNode"}constructor(e,t,r="wgsl"){super("",cs(t),r),this.isWGSLTagFnNode=!0,this.tokens=e,this.args=t}setup(e){super.setup(e),this._normalizedArgs=us(this.args,e)}getNodeFunction(e){let{tokens:t,_normalizedArgs:r}=this,a=e.getDataFromNode(this),s=a.nodeFunction;if(s===void 0){let i="";for(let o=0,l=t.length;o<l;o++)if(i+=t[o],o<r.length){let h=r[o];Array.isArray(h)||(typeof h=="string"||typeof h=="number"?i+=String(h):h.isStructLayoutNode?i+=h.getNodeType(e):h.isStruct?i+=h.layout.getNodeType(e):i+="_arg"+o)}i=i.replace(/\/\/.*[\n\r]/g,""),s=e.parser.parseFunction(i),a.nodeFunction=s}return s}generate(e,t){let r=super.generate(e,t),{_normalizedArgs:a}=this,s=Ha(this.tokens,a,e),{type:i}=this.getNodeFunction(e),o=e.getCodeFromNode(this,i);return o.code=s.replace(/\/\/.+[\n\r]/g,"").replace(/->\s*void/,"").trim(),r}},Ua=class extends Gn{static get type(){return"WGSLTagCodeNode"}constructor(e,t,r="wgsl"){super("",cs(t),r),this.isWGSLTagCodeNode=!0,this.tokens=e,this.args=t}setup(e){super.setup(e),this._normalizedArgs=us(this.args,e)}build(e,t){return t==="inline"?Ha(this.tokens,this._normalizedArgs,e):super.build(e,t)}generate(e){super.generate(e);let t=e.getCodeFromNode(this,this.getNodeType(e));return t.code=Ha(this.tokens,this._normalizedArgs,e),t.code}},Xn=c=>{let e=(...t)=>{if(t.length===1&&t[0]&&typeof t[0]=="object"&&!t[0].isNode){let r=t[0];for(let a in r)typeof r[a]=="string"&&(r[a]=new ka(r[a]))}return c.call(...t)};return jn.nodeProxyConstructor(e,c)},d=(c,...e)=>Xn(new za(c,e)),De=(c,...e)=>new Ua(c,e);import{uint as Yn}from"three/tsl";var St=Yn(60);function ds(c,e){let{name:t=`bvh_shapecast_fn_${Math.random().toString(36).substring(2,7)}`,shapeStruct:r,resultStruct:a=null,prefixFn:s=null,boundsOrderFn:i=null,intersectsBoundsFn:o,intersectRangeFn:l,transformShapeFn:h=null,transformResultFn:n=null,resetShapeFn:f=null}=e,{nodes:m,transforms:p}=c.storage,u="";s&&(u=De`${s}();`);let g="";n&&(g=De`${n}( result, objectIndex );`);let x="";h&&(x=De`${h}( &localShape, objectIndex );`);let T="";f&&(T=De`${f}( objectIndex );`);let b="";i&&(b=De`
			let leftToRight = ${i}( localShape, splitAxis, node );
			c1 = select( rightIndex, leftIndex, leftToRight );
			c2 = select( leftIndex, rightIndex, leftToRight );
			hit1 = select( hitRight, hitLeft, leftToRight );
			hit2 = select( hitLeft, hitRight, leftToRight );
		`);let _=a?De`result: ptr<function, ${a}>`:"",y=a?"result":"",D=d`
		// fn
		fn ${t}( shape: ${r}, ${_} ) -> bool {

			${u}

			var didHit = false;

			var isTLAS = true;
			var pointer: i32 = 0;
			var stack: array<u32, ${St}>;
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

					${T}

					objectIndex = 0;
					isTLAS = true;
					localShape = shape;

				}

				// check if we've finished all nodes on the stack (or overrun the stack)
				if ( pointer < 0 || pointer >= i32( ${St} ) ) {

					break;

				}

				// a node's bounds were tested by its parent, so the popped node is always entered
				let nodeIndex = stack[ pointer ];
				let node = ${m}[ nodeIndex ];
				pointer = pointer - 1;

				let infoX = node.splitAxisOrTriangleCount;
				let infoY = node.rightChildOrTriangleOffset;
				let isLeaf = ( infoX & 0xffff0000u ) != 0u;

				if ( isLeaf ) {

					if ( isTLAS ) {

						// the leaf encodes the placement / transform slot in the low 24 bits of infoX
						// and the cluster subtree's absolute node offset in infoY, which is pushed
						// directly as the BLAS entry node. Each TLAS leaf references one cluster.
						objectIndex = infoX & 0x00ffffffu;

						let transform = ${p}[ objectIndex ];
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
						// Cast bool callbacks to u32 to preserve their existing hit / miss behavior.
						let rangeResult = u32( ${l}( localShape, offset, count, ${y} ) );
						blasDidHit = rangeResult != ${0}u || blasDidHit;
						if ( rangeResult == ${3}u ) {

							${g}
							${T}
							return true;

						}

					}

				} else {

					// test both children here, pushing the farther one first so the nearer is popped next
					let leftIndex = nodeIndex + 1u;
					let splitAxis = infoX & 0x0000ffffu;
					let rightIndex = nodeIndex + infoY;
					let hitLeft = ${o}( localShape, node.leftBounds, ${y} ) != 0u;
					let hitRight = ${o}( localShape, node.rightBounds, ${y} ) != 0u;

					var c1 = rightIndex;
					var c2 = leftIndex;
					var hit1 = hitRight;
					var hit2 = hitLeft;
					${b}

					if ( hit2 ) {

						pointer = pointer + 1;
						stack[ pointer ] = c2;

					}

					if ( hit1 ) {

						pointer = pointer + 1;
						stack[ pointer ] = c1;

					}

				}

			}

			return didHit;

		}
	`;return D.outputType=a,D.functionName=t,D}import{float as el}from"three/tsl";var hs=d`
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
`,We=d`
	// fn
	fn intersectRayTriangle( ray: ${v}, a: vec3f, b: vec3f, c: vec3f, threshold: f32 ) -> ${ve} {

		const DET_EPSILON = 1e-15;

		var result: ${ve};
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
`,be=d`
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
`;var Xt=d`
	fn bvh_rayBoundsDistance( ray: ${v}, bounds: ${B} ) -> f32 {

		let boundsMin = vec3( bounds.min[0], bounds.min[1], bounds.min[2] );
		let boundsMax = vec3( bounds.max[0], bounds.max[1], bounds.max[2] );

		// Avoid 0 * infinity for rays parallel to a slab and on its boundary.
		let parallel = ray.direction == vec3f( 0.0 );
		if ( any( parallel & ( ( ray.origin < boundsMin ) | ( ray.origin > boundsMax ) ) ) ) {

			return - 1.0;

		}

		let invDir = 1.0 / select( ray.direction, vec3f( 1.0 ), parallel );
		let tMinPlane = ( boundsMin - ray.origin ) * invDir;
		let tMaxPlane = ( boundsMax - ray.origin ) * invDir;

		// parallel axes never limit the slab interval
		const FLT_MAX = 3.402823e38;
		let tMinHit = select( min( tMinPlane, tMaxPlane ), vec3f( - FLT_MAX ), parallel );
		let tMaxHit = select( max( tMinPlane, tMaxPlane ), vec3f( FLT_MAX ), parallel );

		let t0 = max( max( tMinHit.x, tMinHit.y ), tMinHit.z );
		let t1 = min( min( tMaxHit.x, tMaxHit.y ), tMaxHit.z );

		let dist = max( t0, 0.0 );
		return select( dist, - 1.0, t1 < dist );

	}
`;function fs(c){let{index:e,attributes:t,transforms:r}=c.storage,a=el(1).toVar("bvh_rayScalarAnyHit");return c.getShapecastFn({name:"bvh_RaycastAnyHit",shapeStruct:v,intersectsBoundsFn:d`
			fn rayIntersectsBoundsAnyHit( ray: ${v}, bounds: ${B} ) -> u32 {

				let dist = ${Xt}( ray, bounds ) * ${a};
				return u32( dist >= 0.0 && ( ray.maxDist <= 0.0 || dist < ray.maxDist ) );

			}
		`,intersectRangeFn:d`
			fn intersectRangeAnyHit( ray: ${v}, offset: u32, count: u32 ) -> u32 {

				for ( var ti = offset; ti < offset + count; ti = ti + 1u ) {

					let a = ${t}[ ${e}[ ti * 3u ] ].position.xyz;
					let b = ${t}[ ${e}[ ti * 3u + 1u ] ].position.xyz;
					let c = ${t}[ ${e}[ ti * 3u + 2u ] ].position.xyz;

					let triResult = ${We}( ray, a, b, c, 0.0 );
					if ( triResult.didHit && ( ray.maxDist <= 0.0 || triResult.dist * ${a} < ray.maxDist ) ) {

						return ${3}u;

					}

				}

				return ${0}u;

			}
		`,transformShapeFn:d`
			fn transformRayAnyHit( ray: ptr<function, ${v}>, objectIndex: u32 ) -> void {

				let toLocal = ${r}[ objectIndex ].inverseMatrixWorld;
				ray.origin = ( toLocal * vec4f( ray.origin, 1.0 ) ).xyz;
				ray.direction = ( toLocal * vec4f( ray.direction, 0.0 ) ).xyz;

				let len = length( ray.direction );
				ray.direction /= len;
				${a} = 1.0 / len;

			}
		`,resetShapeFn:d`
			fn resetRayScalarAnyHit( objectIndex: u32 ) -> void {

				${a} = 1.0;

			}
		`})}import{float as tl}from"three/tsl";function ms(c){let{index:e,attributes:t,transforms:r}=c.storage,a=tl(1).toVar("bvh_rayScalar");return c.getShapecastFn({name:"bvh_RaycastFirstHit",shapeStruct:v,resultStruct:ve,boundsOrderFn:d`
			fn getBoundsOrder( ray: ${v}, splitAxis: u32, node: ${O} ) -> bool {

				return ray.direction[ splitAxis ] >= 0.0;

			}
		`,intersectsBoundsFn:d`
			fn rayIntersectsBounds( ray: ${v}, bounds: ${B}, result: ptr<function, ${ve}> ) -> u32 {

				let dist = ${Xt}( ray, bounds ) * ${a};
				if ( dist < 0.0 ) {

					return 0u;

				} else if ( ray.maxDist > 0.0 && dist >= ray.maxDist ) {

					return 0u;

				} else if ( result.didHit && dist >= result.dist ) {

					return 0u;

				} else {

					return 1u;

				}

			}

		`,intersectRangeFn:d`
			fn intersectRange( ray: ${v}, offset: u32, count: u32, result: ptr<function, ${ve}> ) -> bool {

				var didHit = false;
				for ( var ti = offset; ti < offset + count; ti = ti + 1u ) {

					let i0 = ${e}[ ti * 3u ];
					let i1 = ${e}[ ti * 3u + 1u ];
					let i2 = ${e}[ ti * 3u + 2u ];

					let a = ${t}[ i0 ].position.xyz;
					let b = ${t}[ i1 ].position.xyz;
					let c = ${t}[ i2 ].position.xyz;

					var triResult = ${We}( ray, a, b, c, 0.0 );
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
		`,transformShapeFn:d`
			fn transformRay( ray: ptr<function, ${v}>, objectIndex: u32 ) -> void {

				let toLocal = ${r}[ objectIndex ].inverseMatrixWorld;
				ray.origin = ( toLocal * vec4f( ray.origin, 1.0 ) ).xyz;
				ray.direction = ( toLocal * vec4f( ray.direction, 0.0 ) ).xyz;

				let len = length( ray.direction );
				ray.direction /= len;
				${a} = 1.0 / len;

			}
		`,transformResultFn:d`
			fn transformResult( hit: ptr<function, ${ve}>, objectIndex: u32 ) -> void {

				let toLocal = ${r}[ objectIndex ].inverseMatrixWorld;
				hit.normal = normalize( ( transpose( toLocal ) * vec4f( hit.normal, 0.0 ) ).xyz );
				hit.objectIndex = objectIndex;

			}
		`,resetShapeFn:d`
			fn resetRayScalar( objectIndex: u32 ) -> void {

				${a} = 1.0;

			}
		`})}function ps(c){let{storage:e,structs:t}=c,r=t.attributes.membersLayout.map(({name:a})=>`result.${a} = a0.${a} * barycoord.x + a1.${a} * barycoord.y + a2.${a} * barycoord.z;`).join(`
`);return d`
		// fn
		fn bvh_sampleTrianglePoint( barycoord: vec3f, indices: vec3u ) -> ${t.attributes} {

			var result: ${t.attributes};
			var a0 = ${e.attributes}[ indices.x ];
			var a1 = ${e.attributes}[ indices.y ];
			var a2 = ${e.attributes}[ indices.z ];
			${r}
			return result;

		}
	`}import{mat4 as rl}from"three/tsl";function gs(c){let{index:e,attributes:t,transforms:r}=c.storage,a=rl().toVar("bvh_toWorldMat");return c.getShapecastFn({name:"bvh_ClosestPointToPoint",shapeStruct:"vec3f",resultStruct:vt,boundsOrderFn:d`
			fn cppBoundsOrder( shape: vec3f, splitAxis: u32, node: ${O} ) -> bool {

				let toWorld = ${a};
				let absX = abs( toWorld[ 0 ].xyz );
				let absY = abs( toWorld[ 1 ].xyz );
				let absZ = abs( toWorld[ 2 ].xyz );

				// squared distance from the point to each child's bounds in world space
				let lMin = vec3f( node.leftBounds.min[ 0 ], node.leftBounds.min[ 1 ], node.leftBounds.min[ 2 ] );
				let lMax = vec3f( node.leftBounds.max[ 0 ], node.leftBounds.max[ 1 ], node.leftBounds.max[ 2 ] );
				let lHalf = ( lMax - lMin ) * 0.5;
				let lCenter = ( toWorld * vec4f( ( lMin + lMax ) * 0.5, 1.0 ) ).xyz;
				let lExtent = absX * lHalf.x + absY * lHalf.y + absZ * lHalf.z;
				let lDelta = shape - clamp( shape, lCenter - lExtent, lCenter + lExtent );

				let rMin = vec3f( node.rightBounds.min[ 0 ], node.rightBounds.min[ 1 ], node.rightBounds.min[ 2 ] );
				let rMax = vec3f( node.rightBounds.max[ 0 ], node.rightBounds.max[ 1 ], node.rightBounds.max[ 2 ] );
				let rHalf = ( rMax - rMin ) * 0.5;
				let rCenter = ( toWorld * vec4f( ( rMin + rMax ) * 0.5, 1.0 ) ).xyz;
				let rExtent = absX * rHalf.x + absY * rHalf.y + absZ * rHalf.z;
				let rDelta = shape - clamp( shape, rCenter - rExtent, rCenter + rExtent );

				// the nearer child is traversed first
				return dot( lDelta, lDelta ) <= dot( rDelta, rDelta );

			}
		`,intersectsBoundsFn:d`
			fn cppIntersectsBounds( shape: vec3f, bounds: ${B}, result: ptr<function, ${vt}> ) -> u32 {

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
		`,intersectRangeFn:d`
			fn cppIntersectsRange( shape: vec3f, offset: u32, count: u32, result: ptr<function, ${vt}> ) -> bool {

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

					let barycoord = ${hs}( shape, a, b, c );
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
		`,resetShapeFn:d`
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
			`,transformShapeFn:d`
			fn cppTransformShape( shape: ptr<function, vec3f>, objectIndex: u32 ) -> void {

				${a} = ${r}[ objectIndex ].matrixWorld;

			}
		`,transformResultFn:d`
			fn cppTransformResult( result: ptr<function, ${vt}>, objectIndex: u32 ) -> void {

				result.objectIndex = objectIndex;

			}
		`})}import{Matrix4 as qa,Box3 as al}from"three";var wt=24,Oa=(1<<wt)-1,vs=31-wt,il=(1<<vs)-1,Va=new qa,Wa=new al,Tt=new qa,Yt=class extends ki{constructor(e,t){super(),t={getBVH:(i,o)=>{throw new Error("ClusteredBVH: getBVH callback must be provided ")},shouldCluster:i=>i.isSkinnedMesh||i.isInstancedMesh||i.isBatchedMesh,primitiveLimit:64,matrixWorld:Array.isArray(e)?new qa:e.matrixWorld,includeInstances:!0,_strictLeafSize:1,...t};let r=Array.from(ys(e)),a=Math.ceil(Math.log2(r.length)),s=(1<<a)-1;this.objects=r,this.getBVH=t.getBVH,this.shouldCluster=t.shouldCluster,this.includeInstances=t.includeInstances,this.primitiveLimit=t.primitiveLimit,this.matrixWorld=t.matrixWorld,this.bvhMap=new WeakMap,this.idBits=a,this.idMask=s,this.primitiveBufferStride=2,this.init(t)}init(e){let t=0,{objects:r,bvhMap:a,matrixWorld:s}=this;Va.copy(s).invert(),r.forEach(i=>{let o=[];for(let l=0,h=this._getInstanceCount(i);l<h;l++){let n=this.getBVH(i,l);o.push(n),n&&(t+=this.shouldCluster(i)?n._roots.length:this._countRelevantLeafNodes(n))}a.set(i,o)}),this.primitiveBuffer=new Uint32Array(t*2),this._fillPrimitiveBuffer(this.primitiveBuffer),super.init(e)}getRootRanges(){return[{offset:0,count:this.primitiveBuffer.length/this.primitiveBufferStride}]}refit(...e){Va.copy(this.matrixWorld).invert(),super.refit(...e)}writePrimitiveBounds(e,t,r){let{primitiveBuffer:a,bvhMap:s,objects:i}=this,o=a[2*e+0],l=a[2*e+1],h=i[this.getObjectId(o)],n=this.getInstanceId(o),f=s.get(h)[n],m=this.getBVHRootIndex(l),p=this.getBVHNodeIndex(l);h.isInstancedMesh||h.isBatchedMesh?(h.getMatrixAt(n,Tt),Tt.premultiply(h.matrixWorld)):Tt.copy(h.matrixWorld),Tt.premultiply(Va),Bi(p,new Float32Array(f._roots[m]),Wa),Wa.applyMatrix4(Tt);let{min:u,max:g}=Wa;t[r+0]=u.x,t[r+1]=u.y,t[r+2]=u.z,t[r+3]=g.x,t[r+4]=g.y,t[r+5]=g.z}getInstanceId(e){let{idMask:t,idBits:r}=this;return(e&~t)>>>r}getObjectId(e){let{idMask:t}=this;return e&t}getBVHRootIndex(e){return e>>>wt}getBVHNodeIndex(e){return(e&Oa)*8}_getInstanceCount(e){let{includeInstances:t}=this;return e.isInstancedMesh&&t?e.count:e.isBatchedMesh&&t?e.instanceCount:1}_fillPrimitiveBuffer(e){let{objects:t,bvhMap:r,idBits:a,primitiveLimit:s}=this,i=0,o=(l,h,n,f)=>{if(f>Oa)throw new Error(`ClusteredBVH: cluster node index ${f} exceeds the ${wt}-bit packing limit and cannot be represented.`);if(n>il)throw new Error(`ClusteredBVH: bvh root index ${n} exceeds the ${vs}-bit packing limit and cannot be represented.`);e[2*i+0]=l<<a|h,e[2*i+1]=n<<wt|f&Oa,i++};t.forEach((l,h)=>{r.get(l).forEach((n,f)=>{if(n)if(this.shouldCluster(l))for(let m=0,p=n._roots.length;m<p;m++)o(f,h,m,0);else xs(n,s,(m,p)=>{o(f,h,m,p/8)})})})}_countRelevantLeafNodes(e){let{primitiveLimit:t}=this,r=0;return xs(e,t,(a,s,i,o)=>{r++,o&&i>=t&&console.warn(`ClusteredBVH: a leaf node with ${i} primitives exceeds the cluster primitive limit of ${t} and cannot be subdivided further.`)}),r}};function xs(c,e,t){let r=c._roots.length;for(let a=0;a<r;a++)Oe.setBVH(c,a),Oe.traverseBuffer((s,i,o)=>{let l=Oe.getRangeStart(o),n=Oe.getRangeEnd(o)-l;return n<e||i?(t(a,o,n,i),!0):!1});Oe.reset()}function ys(c,e=new Set){return Array.isArray(c)?c.forEach(t=>ys(t,e)):c.traverse(t=>{t.isMesh&&e.add(t)}),e}var Ce=new ws,tr=new ws,bs={start:0,count:0,vertexStart:0,vertexCount:0};function nl(c){let e=c;for(;e;){if(e.visible===!1)return!1;e=e.parent}return!0}function Ss(c){return c._roots.reduce((e,t)=>e+t.byteLength/32,0)}function Ts(c,e){return`${c}_${e}`}var rr=class{constructor(e,t={}){let{attributes:r={position:"vec4f"},autogenerateBvh:a=!0}=t;Array.isArray(e)||(e=[e]),e=e.map(s=>{if(s.isObject3D)return s;if(s.isBufferGeometry)return new Zt(s);if(s instanceof Aa){let i=new Zt;return i.geometry.boundsTree=s,i}}),this._bvhCache=new Map,this.autogenerateBvh=a,this.attributes=r,this.objects=e,this.bvh=null,this.storage=new It,this.structs=new It({transform:ji}),this.fns=new It({raycastFirstHit:ms(this),raycastAnyHit:fs(this),closestPointToPoint:gs(this),sampleTrianglePoint:null},R)}getRootObject(){let{objects:e}=this;if(e.isObject3D)return e;Array.isArray(e)||(e=[e]),e=e.map(r=>{if(r.isObject3D)return r;if(r.isBufferGeometry)return new Zt(r);if(r instanceof Aa){let a=new Zt;return a.geometry.boundsTree=r,a}});let t=new sl;return t.children=e,t}getShapecastFn(e){return ds(this,e)}update(){let e=this.getRootObject(),t=0;e.traverse(w=>{w.isMesh&&t++}),this.bvh=new Yt(e,{strategy:2,getBVH:(w,Fa)=>this._getBVHSync(w,Fa,bs),primitiveLimit:t<3?1/0:64}),this.dispose();let{attributes:r,structs:a,bvh:s}=this,i=[],o=[],l=new Map,h=Ss(s)*Kt,n=0,f=0,m=[],p=0,u=this._getTransformMap(s),{primitiveBuffer:g,primitiveBufferStride:x}=s;for(let w=0,Fa=g.length;w<Fa;w+=x){let Ma=g[w],Ni=g[w+1],zn=s.objects[s.getObjectId(Ma)],Un=s.getInstanceId(Ma),Ai={start:0,count:0,vertexStart:0,vertexCount:0},mt=this._getBVHSync(zn,Un,Ai);if(!mt)throw new Error("BVHComputeData: BVH not found.");let _e=i.find(Wt=>Wt.bvh===mt);_e||(_e={index:i.length,bvh:mt,range:Ai,geometryOffset:0},n+=_e.range.count,f+=_e.range.vertexCount,i.push(_e));let pt=s.getBVHRootIndex(Ni),Vt=s.getBVHNodeIndex(Ni)/8,Pi=`${_e.index}_${pt}_${Vt}`,gt=l.get(Pi);if(gt===void 0){let Wt=as(mt._roots[pt],Vt);gt={data:_e,root:pt,node:Vt,size:Wt,base:0},l.set(Pi,gt),o.push(gt),h+=Wt*Kt,p=Math.max(p,La(mt._roots[pt],Vt))}m.push({transformSlot:u.get(Ts(Ma,pt)).slot,subtree:gt})}if(La(s._roots[0])+p-1>St.value)throw new Error("BVHComputeData: BVH depth overruns the compute stack depth.");let _=Math.max(u.size,2);n=Math.max(n,2),f=Math.max(f,2);let y=new ol(r,"bvh_GeometryStruct"),D=0,H=0,z=new Uint32Array(n),le=new ArrayBuffer(f*y.getLength()*4),K=new ArrayBuffer(h);i.forEach(w=>{w.geometryOffset=H/3,w.bvh.indirect||(w.geometryOffset-=w.range.start/3),os(w.bvh,w.range,D,H,z),ns(w.bvh,w.range,D,le,y,this),H+=w.range.count,D+=w.range.vertexCount});let P=Ss(s);o.forEach(w=>{w.base=P,ss(w.data.bvh._roots[w.root],w.node,w.size,w.data.geometryOffset,P,K),P+=w.size}),m.forEach(w=>w.nodeOffset=w.subtree.base),Ea(s,m,0,K);let X=new ArrayBuffer(a.transform.getLength()*_*4),ze=er(new Jt(new Uint32Array(K),1),O).toReadOnly().setName("bvh_nodes"),Ue=new Jt(new Uint32Array(X),1),Ln=er(Ue,a.transform).toReadOnly().setName("bvh_transforms"),kn=er(new Jt(z,1),"uint").toReadOnly().setName("bvh_index"),Hn=er(new Jt(new Uint32Array(le),y.getLength()),y).toReadOnly().setName("bvh_attributes");this.storage.transforms=Ln,this.storage.nodes=ze,this.storage.index=kn,this.storage.attributes=Hn,this.structs.attributes=y,tr.copy(s.matrixWorld).invert(),u.forEach(w=>{this.writeTransformData(w,tr,w.slot,X)}),this.fns.sampleTrianglePoint=ps(this),this._bvhCache.clear()}async updateAsync(){let e=[];this.getRootObject().traverse(t=>{if(!t.isMesh)return;let r=1;t.isInstancedMesh?r=t.count:t.isBatchedMesh&&(r=t.instanceCount);for(let a=0;a<r;a++)e.push(this.getBVH(t,a,bs))}),await Promise.all(e),this.update()}updateTransforms(){let{bvh:e,storage:t}=this;e.refit();let r=t.nodes.proxyNode.value;Ea(e,null,0,r.array.buffer),r.needsUpdate=!0;let a=t.transforms.proxyNode.value,s=a.array.buffer;tr.copy(e.matrixWorld).invert(),this._getTransformMap(e).forEach(i=>{this.writeTransformData(i,tr,i.slot,s)}),a.needsUpdate=!0}writeTransformData(e,t,r,a){let{structs:s}=this,i=new Float32Array(a),o=new Uint32Array(a),{object:l,instanceId:h}=e;l.isInstancedMesh||l.isBatchedMesh?(l.getMatrixAt(h,Ce),Ce.premultiply(l.matrixWorld)):Ce.copy(l.matrixWorld),Ce.premultiply(t),Ce.toArray(i,r*s.transform.getLength()),Ce.invert(),Ce.toArray(i,r*s.transform.getLength()+16);let n=nl(l);l.isBatchedMesh&&(n=n&&l.getVisibleAt(h)),o[r*s.transform.getLength()+32]=n?1:0}getBVH(e,t,r){let{autogenerateBvh:a,_bvhCache:s}=this,i=null;if(e.boundsTree||e.isSkinnedMesh){let o=e.geometry;if(r.count=o.index?o.index.count:o.attributes.position.count,r.vertexCount=o.attributes.position.count,i=e.boundsTree||null,i===null&&a){let l=e.uuid;i=s.get(l)||new xe(e),s.set(l,i)}}else if(e.isBatchedMesh){let o=e.getGeometryIdAt(t),l=e.getGeometryRangeAt(o);if(Object.assign(r,l),i=e.boundsTrees[o]||null,i===null&&a){let h=`batched_${e.geometry.uuid}_${l.start}_${l.count}`;i=s.get(h)||new Re(e.geometry,{range:{...r}}),s.set(h,i)}}else{let o=e.geometry;if(r.count=o.index?o.index.count:o.attributes.position.count,r.vertexCount=o.attributes.position.count,i=e.geometry.boundsTree||null,i===null&&a){let l=o.uuid;i=s.get(l)||new Re(o),s.set(l,i)}}return i}getDefaultAttributeValue(e,t){switch(e){case"position":case"color":t.set(1,1,1,1);break;default:t.set(0,0,0,0)}return t}dispose(){let{storage:e}=this;for(let t in e)e[t].value?.dispose()}_getBVHSync(e,t,r){let a=this.getBVH(e,t,r);if(a instanceof Promise)throw new Error('BVHComputeData: "getBVH" returned a promise. Use "updateAsync" instead.');return a}_getTransformMap(e){let{primitiveBuffer:t,primitiveBufferStride:r}=e,a=new Map;for(let s=0,i=t.length;s<i;s+=r){let o=t[s],l=e.getBVHRootIndex(t[s+1]),h=Ts(o,l);if(a.has(h))continue;let n=a.size,f=e.objects[e.getObjectId(o)],m=e.getInstanceId(o);a.set(h,{object:f,instanceId:m,compositeId:o,root:l,slot:n})}return a}},It=class{constructor(e={},t=C){let r={};return new Proxy({...e},{get(a,s){return r[s]||(r[s]=t(s,a)),r[s]},set(a,s,i){return a[s]=i,!0}})}};import{FullScreenQuad as Ut}from"three/examples/jsm/postprocessing/Pass.js";import{MeshBasicNodeMaterial as ll,NoToneMapping as cl,StorageTexture as Is}from"three/webgpu";import{uv as ul,varying as dl,texture as _s,vec4 as hl,toneMapping as fl,uniform as ml,wgslFn as pl}from"three/tsl";var ar=pl(`
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
`),ir=class extends ll{get texture(){return this._texNode.value}set texture(e){this._texNode.value=e}get fromTexture(){return this._fromTexNode.value}set fromTexture(e){this._fromTexNode.value=e}get toneMapping(){return this._toneMapping.toneMapping}set toneMapping(e){this._toneMapping.setToneMapping(e)}get transition(){return this._transitionUniform.value}set transition(e){this._transitionUniform.value=e}get exposure(){return this._toneMapping.exposureNode.value}set exposure(e){this._toneMapping.exposureNode.value=e}constructor(e){super();let t=_s(new Is);this._texNode=t;let r=_s(new Is);this._fromTexNode=r;let a=dl(ul()),s=ml(1);this._transitionUniform=s;let i=d`
			fn fade( uv: vec2f ) -> vec4f {

				if ( ${s} <= 0.0 ) {

					return ${ar}( ${r}, uv );

				} else if ( ${s} >= 1.0 ) {

					return ${ar}( ${t}, uv );

				} else {

					let col0 = ${ar}( ${r}, uv );
					let col1 = ${ar}( ${t}, uv );
					return mix( col0, col1, ${s} );

				}

			}
		`,o=fl(cl,1,i(a));this._toneMapping=o,this.transparent=!0,this.colorNode=hl(o.rgb,o.a),this.setValues(e)}};import{Matrix4 as Rs,StructTypeNode as gl}from"three/webgpu";import{uniform as Ge,uint as xl,float as Ds}from"three/tsl";var Ga=d`
	fn debugHeatColor( t: f32 ) -> vec3f {

		let r = clamp( 1.5 - abs( 4.0 * t - 3.0 ), 0.0, 1.0 );
		let g = clamp( 1.5 - abs( 4.0 * t - 2.0 ), 0.0, 1.0 );
		let b = clamp( 1.5 - abs( 4.0 * t - 1.0 ), 0.0, 1.0 );
		return vec3f( r, g, b );

	}
`,sr=new gl({tlasCount:"uint",blasCount:"uint",didHit:"bool",dist:"float"},"DebugBoundsResult");function Cs(c){let{transforms:e,index:t,attributes:r,materials:a}=c.storage,s=Ge(new Rs),i=Ge(new Rs),o=Ge(1),l=Ge(1),h=Ge(0),n=Ge(64),f=xl(0).toVar("bvh_debugBoundsLevel"),m=Ds(1).toVar("bvh_debugRayScalar"),p=Ds(0).toVar("bvh_debugMaterialSide"),u=d`
		fn debugGetBoundsOrder( ray: ${v}, splitAxis: u32, node: ${O} ) -> bool {

			return ray.direction[ splitAxis ] >= 0.0;

		}
	`,g=d`
		fn debugIntersectsBounds( ray: ${v}, bounds: ${B}, result: ptr<function, ${sr}> ) -> u32 {

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

			} else if ( result.didHit && dist * ${m} >= result.dist ) {

				return 0u;

			}

			if ( ${f} == 1u ) {

				result.blasCount = result.blasCount + 1u;

			} else {

				result.tlasCount = result.tlasCount + 1u;

			}

			return 1u;

		}
	`,x=d`
		fn debugIntersectRange( ray: ${v}, offset: u32, count: u32, result: ptr<function, ${sr}> ) -> bool {

			var didHit = false;
			if ( ${h} > 0.5 ) {

				for ( var ti = offset; ti < offset + count; ti = ti + 1u ) {

					let i0 = ${t}[ ti * 3u ];
					let i1 = ${t}[ ti * 3u + 1u ];
					let i2 = ${t}[ ti * 3u + 2u ];

					let a = ${r}[ i0 ].position.xyz;
					let b = ${r}[ i1 ].position.xyz;
					let c = ${r}[ i2 ].position.xyz;

					var triResult = ${Ba}( ray, a, b, c );
					triResult.dist *= ${m};
					if ( triResult.didHit && ( ! result.didHit || triResult.dist < result.dist ) ) {

						// cull faces that don't match the material side
						if ( ${p} != 0.0 && triResult.side != ${p} ) {

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
	`,T=d`
		fn debugTransformRay( ray: ptr<function, ${v}>, objectIndex: u32 ) -> void {

			let object = ${e}[ objectIndex ];
			let toLocal = object.inverseMatrixWorld;
			ray.origin = ( toLocal * vec4f( ray.origin, 1.0 ) ).xyz;
			ray.direction = ( toLocal * vec4f( ray.direction, 0.0 ) ).xyz;

			let len = length( ray.direction );
			ray.direction = ray.direction / len;
			${m} = 1.0 / len;

			${p} = ${a}[ object.materialIndex ].side;
			${f} = 1u;

		}
	`,b=d`
		fn debugResetLevel( objectIndex: u32 ) -> void {

			${m} = 1.0;
			${f} = 0u;

		}
	`,_=c.getShapecastFn({name:"debugBoundsCount",shapeStruct:v,resultStruct:sr,boundsOrderFn:u,intersectsBoundsFn:g,intersectRangeFn:x,transformShapeFn:T,resetShapeFn:b}),y=d`
		fn debugBounds( vUv: vec2f ) -> vec4f {

			let ndc = vUv * 2.0 - vec2f( 1.0 );
			var ray = ${be}( ndc, ${s} * ${i} );
			ray.direction = normalize( ray.direction );

			// count the boxes the ray crosses, pruning those behind the nearest hit surface
			var result: ${sr};
			${_}( ray, &result );

			let tlas = select( 0u, result.tlasCount, ${o} > 0.5 );
			let blas = select( 0u, result.blasCount, ${l} > 0.5 );
			let count = tlas + blas;

			let t = clamp( f32( count ) / max( ${n}, 1.0 ), 0.0, 1.0 );

			return vec4f( ${Ga}( t ), 1.0 );

		}
	`;return y.uniforms={cameraToModelMatrix:s,inverseProjectionMatrix:i,displayTLAS:o,displayBLAS:l,stopAtSurface:h,saturationCount:n},y}import{Matrix4 as $o,Vector2 as Fo}from"three/webgpu";import{DataTexture as vo,Vector2 as yo}from"three/webgpu";var S=class{get computeNode(){return this.kernel.computeNode}get workgroupSize(){return this.kernel.workgroupSize}set needsUpdate(e){this.setWorkgroupSize(...this.workgroupSize)}constructor(e,t={}){let{workgroupSize:r=[64],context:a={}}=t;this._fn=e,this.kernel=null,this.context=a,this.setWorkgroupSize(...r)}defineUniformAccessors(e){for(let t in e){if(t in this)throw new Error(`ComputeNode: Uniform name ${t} is already defined.`);let r=e[t];r.isStorageBufferNode&&!r.name&&r.setName(`kernel_${t}`),"value"in r&&Object.defineProperty(this,t,{get(){return e[t].value},set(a){e[t].value=a}})}}setWorkgroupSize(e=64,t=1,r=1){let a=this._fn.context(this.context);return a.parameters=this._fn.parameters,this.kernel?.dispose(),this.kernel=a.computeKernel([e,t,r]),this}dispose(){this.kernel?.dispose(),this.kernel=null}getDispatchSize(e=1,t=1,r=1,a=[]){let[s,i,o]=this.workgroupSize;return a.length=3,a[0]=Math.ceil(e/s),a[1]=Math.ceil(t/i),a[2]=Math.ceil(r/o),a}};import{ColorManagement as Sl,FloatType as Tl,HalfFloatType as wl,RGBAFormat as Fs}from"three";import{RedIntegerFormat as Ms,StorageArrayTexture as Il,StorageTexture as Xa,UnsignedIntType as Ns}from"three/webgpu";import{wgsl as vl}from"three/tsl";import{StructTypeNode as re}from"three/webgpu";var I=vl(`

	const PI: f32 = 3.141592653589793;
	const EPSILON: f32 = 1e-5;
	const MIN_ROUGHNESS: f32 = 1e-3;
	const MIN_INCIDENT_COS: f32 = 1e-3;

`),Y=new re({color:"vec3f",isTransmissive:"bool",direction:"vec3f",pdf:"float"},"ScatterRecord"),Qa=new re({reflectance:"vec3f",transmittance:"vec3f",reflectProbability:"float"},"TransmissionFresnel"),or=new re({color:"vec3",map:"int",metalness:"float",metalnessMap:"int",roughness:"float",roughnessMap:"int",ior:"float",transmission:"float",transmissionMap:"int",emissiveIntensity:"float",emissive:"vec3",emissiveMap:"int",normalMap:"int",normalScale:"vec2",clearcoat:"float",clearcoatMap:"int",clearcoatNormalMap:"int",clearcoatNormalScale:"vec2",clearcoatRoughness:"float",clearcoatRoughnessMap:"int",iridescenceMap:"int",iridescenceThicknessMap:"int",iridescence:"float",iridescenceIor:"float",iridescenceThicknessMinimum:"float",iridescenceThicknessMaximum:"float",diffuseRoughness:"float",dispersion:"float",specularColor:"vec3",specularColorMap:"int",specularIntensity:"float",specularIntensityMap:"int",thinWall:"int",attenuationColor:"vec3",attenuationDistance:"float",alphaMap:"int",castShadow:"int",opacity:"float",alphaTest:"float",side:"float",matte:"int",sheen:"float",sheenColor:"vec3",sheenColorMap:"int",sheenRoughness:"float",sheenRoughnessMap:"int",vertexColors:"int",flatShading:"int",transparent:"int",fogVolume:"int",anisotropy:"float",anisotropyRotation:"float",anisotropyMap:"int",mapTransform:"mat3",metalnessMapTransform:"mat3",roughnessMapTransform:"mat3",transmissionMapTransform:"mat3",emissiveMapTransform:"mat3",normalMapTransform:"mat3",clearcoatMapTransform:"mat3",clearcoatNormalMapTransform:"mat3",clearcoatRoughnessMapTransform:"mat3",sheenColorMapTransform:"mat3",sheenRoughnessMapTransform:"mat3",iridescenceMapTransform:"mat3",iridescenceThicknessMapTransform:"mat3",specularColorMapTransform:"mat3",specularIntensityMapTransform:"mat3",alphaMapTransform:"mat3",anisotropyMapTransform:"mat3",multiscatterColor:"vec3",scatterStrength:"float",scatterAnisotropy:"float"},"Material"),$=new re({volumeParticle:"bool",faceNormal:"vec3f",frontFace:"bool",normal:"vec3f",normalBasis:"mat3x3f",normalInvBasis:"mat3x3f",eta:"f32",f0:"f32",roughness:"f32",diffuseRoughness:"f32",metalness:"f32",anisotropy:"f32",color:"vec3f",emission:"vec3f",opacity:"f32",ior:"f32",transmission:"f32",thinWall:"bool",attenuationColor:"vec3f",attenuationDistance:" f32",clearcoatNormal:"vec3f",clearcoatBasis:"mat3x3f",clearcoatInvBasis:"mat3x3f",clearcoat:"f32",clearcoatRoughness:"f32",sheen:"f32",sheenColor:"vec3f",sheenRoughness:"f32",iridescence:"f32",iridescenceIor:"f32",iridescenceThickness:"f32",specularColor:"vec3f",specularIntensity:"f32"},"SurfaceRecord"),Ff=new re({rotation:"mat3x3f",intensity:"float",blur:"float",totalSum:"float"},"EnvironmentInfo"),ja=new re({color:"vec3f",direction:"vec3f",pdf:"float"},"EnvironmentSample"),ue=new re({position:"vec3f",lightType:"int",color:"vec3f",intensity:"float",u:"vec3f",visibleToCameraRays:"int",v:"vec3f",area:"float",radius:"float",decay:"float",distance:"float",coneCos:"float",penumbraCos:"float",iesProfile:"int"},"Light"),V=new re({dist:"float",direction:"vec3f",pdf:"float",emission:"vec3f",lightType:"int"},"LightRecord"),$s=new re({diffuse:"float",specular:"float",transmission:"float",clearcoat:"float"},"LobeWeights"),Ka=new re({V:"vec3f",L:"vec3f",H:"vec3f",VdotH:"float"},"BxDFContext");var L=3,yl=.02,bl=.98,nr=d`

	fn isAuxSurface( surface: ${$}, scatterRec: ${Y} ) -> bool {

		let isMirror = surface.roughness <= ${yl} && surface.metalness >= ${bl};
		return ! scatterRec.isTransmissive && ! isMirror;

	}

`,_t=d`

	fn unpackAuxAlbedo( packed: vec3u ) -> vec3f {

		return vec3f( unpack2x16float( packed.x ), unpack2x16float( packed.y ).x );

	}

`,Rt=d`

	fn unpackAuxNormal( packed: vec3u ) -> vec3f {

		return vec3f( unpack2x16float( packed.z ), unpack2x16float( packed.y ).y );

	}

`,lr=d`

	fn blendAux( packed: vec3u, albedo: vec3f, normal: vec3f, weight: f32 ) -> vec3u {

		let meanAlbedo = mix( ${_t}( packed ), albedo, weight );
		let meanNormal = mix( ${Rt}( packed ), normal * 0.5 + 0.5, weight );
		return vec3u(
			pack2x16float( meanAlbedo.rg ),
			pack2x16float( vec2f( meanAlbedo.b, meanNormal.z ) ),
			pack2x16float( meanNormal.xy ),
		);

	}

`;function de(c=""){let e=new Xa(1,1);return e.format=Fs,e.type=Tl,e.colorSpace=Sl.workingColorSpace,e.name=c,e.generateMipmaps=!1,e}function Se(c=""){let e=new Xa(1,1);return e.format=Ms,e.type=Ns,e.name=c,e.generateMipmaps=!1,e}function Z(c=""){let e=new Il(1,1,L);return e.format=Ms,e.type=Ns,e.name=c,e.generateMipmaps=!1,e}function Qe(c=""){let e=new Xa(1,1);return e.format=Fs,e.type=wl,e.name=c,e.generateMipmaps=!1,e}import{texture as ic,sampler as sc,uniform as G,globalId as oc,textureStore as Kr}from"three/tsl";var hr={};Na(hr,{rand1:()=>Za,rand2:()=>Ja,rand3:()=>ei,rand4:()=>Ct,rngInit:()=>$t,rngNextBounce:()=>Ft});import{uint as ur,float as _l,wgsl as Rl,wgslFn as Dt}from"three/tsl";var As=ur(256*256),Bs=_l(1/16777216),Dl=Rl(`

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

`),Es=ur(0).toVar("sobolPixelIndex"),Ls=ur(0).toVar("sobolPathIndex"),Ya=ur(0).toVar("sobolBounceIndex"),cr=Dt(`
	fn getMaskedSobol( index: u32, directions: array<u32, 32> ) -> u32 {

		var X = 0u;
		for ( var bit = 0u; bit < 32u; bit ++ ) {

			let mask = ( index >> bit ) & 1u;
			X ^= mask * directions[ bit ];

		}
		return X;

	}
`),Cl=(c=1)=>{if(c<=0)return;let e=c>1?`vec${c}u`:"u32",t=Dt(`
		fn sobolReverseBits_${e}( in: ${e} ) -> ${e} {

			var x = in;
			x = ( ( ( x & ${e}( 0xaaaaaaaau ) ) >> ${e}( 1 ) ) | ( ( x & ${e}( 0x55555555u ) ) << ${e}( 1 ) ) );
			x = ( ( ( x & ${e}( 0xccccccccu ) ) >> ${e}( 2 ) ) | ( ( x & ${e}( 0x33333333u ) ) << ${e}( 2 ) ) );
			x = ( ( ( x & ${e}( 0xf0f0f0f0u ) ) >> ${e}( 4 ) ) | ( ( x & ${e}( 0x0f0f0f0fu ) ) << ${e}( 4 ) ) );
			x = ( ( ( x & ${e}( 0xff00ff00u ) ) >> ${e}( 8 ) ) | ( ( x & ${e}( 0x00ff00ffu ) ) << ${e}( 8 ) ) );
			return ( ( x >> ${e}( 16 ) ) | ( x << ${e}( 16 ) ) );

		}
	`),r=Dt(`
		fn sobolHashCombine_${e}( seed: u32, v: ${e} ) -> ${e} {

			return ${e}( seed ) ^ ( v + ${e}( ( seed << 6 ) + ( seed >> 2 ) ) );

		}
	`),a=Dt(`
		fn sobolLaineKarrasPermutation_${e}( in: ${e}, seed: ${e} ) -> ${e} {

			var x = in;
			x += seed;
			x ^= x * 0x6c50b47cu;
			x ^= x * 0xb82f1e52u;
			x ^= x * 0xc7afe638u;
			x ^= x * 0x8d22f6e6u;
			return x;

		}
	`),s=d`
		fn nestedUniformScrambleBase2_${e}( x: ${e}, seed: ${e} ) -> ${e} {

			var res = ${a}( x, seed );
			res = ${t}( res );
			return res;

		}
	`;return{reverseBits:t,hashCombine:r,lkPermutation:a,scramble:s}},J=Array.from({length:5},(c,e)=>Cl(e)),$l=d`
  	${[Dl]}
	fn generateSobolPoint( id: u32 ) -> vec4f {

		var index = id;
		if ( index >= ${As} ) {

			index = index % ${As};
			// return vec4( 0.0 );

		}

		// NOTE: this sobol "direction" is also available but we can't write out 5 components
		// uint x = index & 0x00ffffffu;
		let x = ${J[1].reverseBits}( ${cr}( index, SOBOL_DIRECTIONS_1 ) ) & 0x00ffffffu;
		let y = ${J[1].reverseBits}( ${cr}( index, SOBOL_DIRECTIONS_2 ) ) & 0x00ffffffu;
		let z = ${J[1].reverseBits}( ${cr}( index, SOBOL_DIRECTIONS_3 ) ) & 0x00ffffffu;
		let w = ${J[1].reverseBits}( ${cr}( index, SOBOL_DIRECTIONS_4 ) ) & 0x00ffffffu;

		return vec4( f32( x ), f32( y ), f32( z ), f32( w ) ) * ${Bs};

	}
`,Ps=Dt(`
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
`),Fl=d`
	fn sobolGetSeed( effect: u32 ) -> u32 {

		return ${Ps}(
			${J[1].hashCombine}(
				${J[1].hashCombine}(
					${Ps}( ${Ya} ),
					${Es}
				),
				effect
			)
		);

	}
`,dr=(c=1,e=$l)=>{if(c<=0)return;let t=c>1?`vec${c}u`:"u32",r=c>1?`vec${c}f`:"f32",a=".r",s="1u";return c===2?(a=".rg",s="vec2( 1u, 2u )"):c===3?(a=".rgb",s="vec3( 1u, 2u, 3u )"):c===4&&(a="",s="vec4( 1u, 2u, 3u, 4u )"),d`
		fn sobol${c}( effect: u32 ) -> ${r} {

			let seed = ${Fl}( effect );
			let index = ${Ls};

			let shuffle_seed = ${J[1].hashCombine}( seed, 0u );
			let shuffled_index = ${J[1].scramble}( ${J[1].reverseBits}( index ), shuffle_seed );
			let sobol_pt = ${e}( shuffled_index )${a};
			var result = ${t}( sobol_pt * 16777216.0 );

			let seed2 = ${J[c].hashCombine}( seed, ${s} );
			result = ${J[c].scramble}( result, seed2 );

			return ${Bs} * ${r}( result >> ${t}( 8 ) );

		}
	`},Za=dr(1),Ja=dr(2),ei=dr(3),Ct=dr(4),$t=d`
	fn sobolInit( pixel: vec2u, pathIndex: u32, bounceIndex: u32 ) -> void {

		${Es} = ( pixel.x << 16 ) | pixel.y;
		${Ls} = pathIndex;
		${Ya} = bounceIndex;

	}
`,Ft=d`
	fn sobolNextBounce() -> void {

		${Ya}++;

	}
`;var fr=0,mr=1,ks=2,pr=3,Hs=4,gr=5,xr=6,vr=7,yr=8,br=9,Sr=50,W=N("random.rngInit",$t),je=N("random.rngNextBounce",Ft),ae=N("random.rand1",Za),k=N("random.rand2",Ja),Ke=N("random.rand3",ei),Of=N("random.rand4",Ct);import{wgslFn as ee}from"three/tsl";import{wgslFn as F}from"three/tsl";var Us=F(`

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

`),Os=F(`

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

`),q=F(`

	fn iorToF0( ior: f32 ) -> f32 {
		return pow( ( 1 - ior ) / ( 1 + ior ), 2 );
	}

`),Vs=F(`

	fn iorToF0General( transmittedIor: f32, incidentIor: f32 ) -> f32 {

		return pow( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ), 2 );

	}

`),Ws=F(`

	fn iorToF0GeneralVec( transmittedIor: vec3f, incidentIor: vec3f ) -> vec3f {

		let v = ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor );
		return v * v;

	}

`),qs=F(`

	fn fresnel0ToIor( f0: vec3f ) -> vec3f {

		let sqrtF0 = sqrt( f0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );

	}

`),ie=F(`

	fn schlickFresnel( cosine: f32, f0: f32 ) -> f32 {

		return f0 + ( 1.0 - f0 ) * pow( 1.0 - cosine, 5.0 );

	}

`),Xe=F(`

	fn schlickFresnelVec( cosine: f32, f0: vec3f, f90: vec3f ) -> vec3f {

		return f0 + ( f90 - f0 ) * pow( 1.0 - cosine, 5.0 );

	}

`),wr=F(`

	fn totalInternalReflection( cosTheta: f32, eta: f32 ) -> bool {

		let sinTheta = sqrt( 1.0 - cosTheta * cosTheta );
		return eta * sinTheta > 1.0;

	}

`),Gs=F(`

	fn totalInternalReflectionVec( cosTheta: f32, eta: vec3f ) -> vec3<bool> {

		let sinTheta = sqrt( 1.0 - cosTheta * cosTheta );
		return eta * sinTheta > vec3f( 1.0 );

	}

`),Qf=F(`

	fn evaluateFresnel( cosine: f32, eta: f32, f0: vec3f, f90: vec3f ) -> vec3f {

		if ( totalInternalReflection( cosine, eta ) ) {

			return f90;

		}

		return f0 + ( f90 - f0 ) * pow( 1.0 - cosine, 5.0 );
	}

`,[wr]),$e=F(`

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

`),Qs=F(`

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

`,[wr,$e,ie]),Ye=F(`

	fn isTerminatingScatter( scatterRec: ScatterRecord ) -> bool {

		return scatterRec.pdf <= 0;

	}

`,[Y]),M=F(`

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

`),zs=F(`

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

`),he=F(`

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

`),Tr=F(`

	fn wrapTexelIndex( i: i32, size: i32, wrapMode: i32 ) -> i32 {

		if ( wrapMode == 0 ) {

			// Repeat wraps to the opposite edge
			return ( ( i % size ) + size ) % size;

		}

		// ClampToEdge and MirroredRepeat both fold back onto the edge texel
		return clamp( i, 0, size - 1 );

	}

`),Ir=(c,e,t="sampleTexel")=>d`

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
			${zs}( uv.x, wrapS ),
			${zs}( uv.y, wrapT ),
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
			let x0 = ${Tr}( base.x,     intSize.x, wrapS );
			let x1 = ${Tr}( base.x + 1, intSize.x, wrapS );
			let y0 = ${Tr}( base.y,     intSize.y, wrapT );
			let y1 = ${Tr}( base.y + 1, intSize.y, wrapT );

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
`;var Ml=ee(`

	fn sampleSphere( uv: vec2f ) -> vec3f {

		let u = ( uv.x - 0.5 ) * 2.0;
		let t = uv.y * PI * 2.0;
		let f = sqrt( 1.0 - u * u );

		return vec3f( f * cos( t ), f * sin( t ), u );

	}

`,[I]),js=ee(`

	fn diffuseDirection( wo: vec3f, uv: vec2f ) -> vec3f {

		var lightDirection = sampleSphere( uv );
		lightDirection.z += 1.0;
		lightDirection = normalize( lightDirection );

		return lightDirection;

	}

`,[Ml]),ti=ee(`

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

`,[Qs,ie,q,$s,I]),Ze=ee(`

	fn equirectDirectionToUv(direction: vec3f) -> vec2f {

		// from Spherical.setFromCartesianCoords
		var uv = vec2f( atan2( direction.z, direction.x ), acos( direction.y ) );
		uv /= vec2f( 2.0 * PI, PI );

		// apply adjustments to get values in range [0, 1] and y right side up
		uv.x += 0.5;
		uv.y = 1.0 - uv.y;
		return uv;

	}

`),Ks=ee(`

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

`,[I]),Nl=.001,_r=ee(`

	fn sampleHenyeyGreenstein( d: vec3f, g: f32, uv: vec2f ) -> vec3f {

		var cosTheta = 1.0 - 2.0 * uv.x;
		if ( abs( g ) > ${Nl} ) {

			let sqrTerm = ( 1.0 - g * g ) / ( 1.0 - g + 2.0 * g * uv.x );
			cosTheta = clamp( ( 1.0 + g * g - sqrTerm * sqrTerm ) / ( 2.0 * g ), - 1.0, 1.0 );

		}

		// orthonormal basis around "d", from https://graphics.pixar.com/library/OrthonormalB/paper.pdf
		let sign = select( sign( d.z ), 1.0, d.z == 0.0 );
		let a = - 1.0 / ( sign + d.z );
		let b = d.x * d.y * a;
		let b1 = vec3( 1.0 + sign * d.x * d.x * a, sign * b, - sign * d.x );
		let b2 = vec3( b, sign + d.y * d.y * a, - d.y );

		let sinTheta = sqrt( max( 0.0, 1.0 - cosTheta * cosTheta ) );
		let phi = 2.0 * PI * uv.y;
		return normalize( sinTheta * cos( phi ) * b1 + sinTheta * sin( phi ) * b2 + cosTheta * d );

	}

`,[I]),se=ee(`

	fn misHeuristic( a: f32, b: f32 ) -> f32 {

		// computed as a ratio so squaring large pdfs can't overflow to Inf / Inf
		if ( a >= b ) {

			let r = b / a;
			return 1.0 / ( 1.0 + r * r );

		}

		let r = a / b;
		return r * r / ( 1.0 + r * r );

	}

`),Xs=ee(`

	fn luminance( color: vec3f ) -> f32 {

		return dot( color, vec3f( 0.2126, 0.7152, 0.0722 ) );

	}

`),Ys=ee(`

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

`,[I]),Zf=ee(`

	fn equirectDirectionPdf( direction: vec3f ) -> f32 {

		let uv = equirectDirectionToUv( direction );
		let theta = uv.y * PI;
		let sinTheta = sin( theta );
		if ( sinTheta == 0.0 ) {

			return 0.0;

		}

		return 1.0 / ( 2.0 * PI * PI * sinTheta );

	}

`,[I,Ze]),Rr=ee(`

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

`);import{StructTypeNode as io}from"three/webgpu";import{wgslFn as Te}from"three/tsl";var Dr=0,Cr=1,ri=2,ai=3,ii=4,Mt=5,Q=1e30,$r=1e-5,Fr=Te(`

	fn isMISWeightLight( lightType: i32 ) -> bool {

		return lightType == ${Mt} || lightType == ${Cr} || lightType == ${Dr};

	}

`),si=Te(`

	fn getSpotAttenuation( coneCosine: f32, penumbraCosine: f32, angleCosine: f32 ) -> f32 {

		return smoothstep( coneCosine, penumbraCosine, angleCosine );

	}

`),Mr=Te(`

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

`,[I]),Zs=Te(`

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

`,[I]),Js=Te(`

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

`,[I]),eo=Te(`

	fn randomAreaLightSample( light: Light, rayOrigin: vec3f, ruv: vec2f ) -> LightRecord {

		var randomPos = vec3f( 0.0 );
		if ( light.lightType == ${Dr} ) {

			randomPos = light.position + light.u * ( ruv.x - 0.5 ) + light.v * ( ruv.y - 0.5 );

		} else if ( light.lightType == ${Cr} ) {

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

`,[ue,V,I]),to=Te(`

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

`,[ue,V,I,Mr]),ro=Te(`

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

`,[ue,I]);var Al=1e-6,Nr=1e-6,ao=.999,fe=new io({inside:"bool",object:"uint",extinction:"vec3f",albedo:"vec3f",anisotropy:"float"},"Medium"),Fe=new io({extinction:"vec3f",object:"uint",albedo:"vec3f",anisotropy:"float",inside:"uint"},"MediumState"),so=d`

	fn storeMedium( medium: ${fe} ) -> ${Fe} {

		var state: ${Fe};
		state.extinction = medium.extinction;
		state.object = medium.object;
		state.albedo = medium.albedo;
		state.anisotropy = medium.anisotropy;
		state.inside = select( 0u, 1u, medium.inside );
		return state;

	}

`,Ar=d`

	fn loadMedium( state: ${Fe} ) -> ${fe} {

		var medium: ${fe};
		medium.inside = state.inside != 0u;
		medium.object = state.object;
		medium.extinction = state.extinction;
		medium.albedo = state.albedo;
		medium.anisotropy = state.anisotropy;
		return medium;

	}

`,Pl=d`

	fn singleScatterAlbedo( multiscatterAlbedo: vec3f, anisotropy: f32 ) -> vec3f {

		let a = multiscatterAlbedo;
		let s = clamp( 4.09712 + 4.20863 * a - sqrt( 9.59217 + 41.6808 * a + 17.7126 * a * a ), vec3f( 0.0 ), vec3f( 1.0 ) );
		let s2 = select( s * s, vec3f( 1.0 ), a <= vec3f( 0.0 ) );
		return ( 1.0 - s2 ) / ( 1.0 - anisotropy * s2 );

	}

`,Pr=d`

	fn enterMedium( material: ${or}, object: u32 ) -> ${fe} {

		let anisotropy = clamp( material.scatterAnisotropy, - ${ao}, ${ao} );

		var medium: ${fe};
		medium.extinction = - log( max( material.attenuationColor, vec3f( ${Al} ) ) ) / material.attenuationDistance;
		medium.albedo = ${Pl}( material.multiscatterColor * material.scatterStrength, anisotropy );
		medium.inside = any( medium.albedo > vec3f( 0.0 ) ) && any( medium.extinction > vec3f( 0.0 ) );
		medium.object = object;
		medium.anisotropy = anisotropy;
		return medium;

	}

`,Br=d`

	fn mediumChannelPdf( throughput: vec3f, albedo: vec3f ) -> vec3f {

		let weights = abs( throughput * albedo );
		let weightSum = weights.r + weights.g + weights.b;
		if ( weightSum > 0.0 ) {

			return weights / weightSum;

		}

		return vec3f( 1.0 / 3.0 );

	}

`,Er=d`

	fn sampleMediumDistance( medium: ${fe}, channelPdf: vec3f, u: vec2f ) -> f32 {

		var channel = 2u;
		if ( u.x < channelPdf.r ) {

			channel = 0u;

		} else if ( u.x < channelPdf.r + channelPdf.g ) {

			channel = 1u;

		}

		// a channel with no extinction never scatters, and WGSL doesn't guarantee an infinite quotient
		let extinction = medium.extinction[ channel ];
		if ( extinction <= 0.0 ) {

			return ${Q};

		}

		return - log( 1.0 - u.y ) / extinction;

	}

`,Lr=d`

	fn mediumDistancePdf( medium: ${fe}, dist: f32, scattered: bool ) -> vec3f {

		let transmittance = exp( - medium.extinction * dist );
		return select( transmittance, medium.extinction * transmittance, scattered );

	}

`;import{wgslFn as U,mat3 as El}from"three/tsl";import{wgslFn as Me}from"three/tsl";var Ne=Me(`

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

`,[I]),Bl=Me(`

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

`,[I]),kr=Me(`

	fn ggxShadowMaskG1( V: vec3f, alpha: vec2f ) -> f32 {

		// TODO: this could be collapsed to a simpler form as an optimization
		return 1.0 / ( 1.0 + ggxLambda( V, alpha ) );

	}

`,[Bl]),oo=Me(`

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

`,[I]),Nt=Me(`

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

`,[I]),Ae=Me(`

	fn ggxReflectionAdjustedPDF( V: vec3f, H: vec3f, alpha: vec2f ) -> f32 {

		let NdotV = max( V.z, MIN_INCIDENT_COS );
		let D = ggxDistribution( H, alpha );
		let G1 = ggxShadowMaskG1( V, alpha );

		return D * G1 / ( 4 * NdotV );

	}
`,[Nt,kr]),Hr=Me(`

	fn ggxRefractionAdjustedPDF( V: vec3f, L: vec3f, H: vec3f, alpha: vec2f, eta: f32 ) -> f32 {

		let NdotV = max( V.z, MIN_INCIDENT_COS );
		let HdotV = dot( V, H );
		let HdotL = dot( L, H );
		let D = ggxDistribution( H, alpha );
		let G1 = ggxShadowMaskG1( V, alpha );

		let denom = eta * HdotV + HdotL;
		return D * G1 * abs( HdotV ) * abs( HdotL ) / ( NdotV * denom * denom );

	}
`,[Nt,kr]);var Ll=d`

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

`,kl=d`

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

`,zr=3402823466e29,no=(c,e,t)=>U(`

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

`,[Us,q,Os,c,e,t,$,I,Ll,kl]),gm=U(`

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

`,[I,ie,$]),xm=U(`

	fn lambertBrdf( NdotV: f32, NdotL: f32, VdotH: f32, surf: SurfaceRecord ) -> vec3f {

		return surf.color / PI;

	}

`,[I,$]),oi=U(`

	fn specularBrdf( V: vec3f, L: vec3f, H: vec3f, alpha: vec2f ) -> vec3f {

		let alphaT = alpha.x;
		let alphaB = alpha.y;

		let Vis = ggxSmithVisibility( V, L, alpha );
		let D = ggxDistribution( H, alpha );

		return vec3f( D * Vis );

	}

`,[oo,Nt]),Je=U(`

	fn isMatchedIor( eta: f32 ) -> bool {

		return abs( eta - 1.0 ) < EPSILON;

	}

`,[I]),ni=U(`

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

`,[kr,Nt,$e]),Ur=U(`

	fn thinWallTransmissionRoughness( alpha: f32, eta: f32 ) -> f32 {

		let t = 3.4 * ( eta - 1.0 ) * ( eta - 0.5 ) * ( eta - 0.5 ) / ( eta * eta * eta );
		return saturate( alpha * sqrt( max( t, 0.0 ) ) );

	}

`),Or=U(`

	fn transmissionAttenuation( dist: f32, attColor: vec3f, attDist: f32 ) -> vec3f {

		return pow( attColor, vec3f( dist / attDist ) );

	}

`),et=360,tt=830,Hl=U(`

	fn dispersionIor( ior: f32, dispersion: f32, wavelength: f32 ) -> f32 {

		let nd = max( ior, 1.0 );
		let scale = ( nd - 1.0 ) * max( dispersion, 0.0 ) / 20.0;
		let lambda = clamp( wavelength, ${et}.0, ${tt}.0 );
		return max( nd + scale * ( 523655.0 / ( lambda * lambda ) - 1.5168 ), 1.0 );

	}

`),Vr=d`

	fn applyDispersion( surf: ptr<function, ${$}>, dispersion: f32, wavelength: f32 ) -> void {

		surf.ior = ${Hl}( surf.ior, dispersion, wavelength );
		surf.eta = select( surf.ior, 1.0 / surf.ior, surf.thinWall || surf.frontFace );
		surf.f0 = ${q}( surf.eta );

	}

`,Wr=U(`

	fn dispersionColorWeight( wavelength: f32 ) -> vec3f {

		let lambda = clamp( wavelength, ${et}.0, ${tt}.0 );

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

`),lo=U(`

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

`,[Xe,q,wr]),zl=El(3.2404542,-.969266,.0556434,-1.5371385,1.8760108,-.2040259,-.4985314,.041556,1.0572252),Ul=d`

	fn evalSensitivity( OPD: f32, shift: vec3f ) -> vec3f {

		let phase = 2.0 * ${Math.PI} * OPD * 1.0e-9;
		const val = vec3(5.4856e-13, 4.4201e-13, 5.2481e-13);
		const pos = vec3(1.6810e+06, 1.7953e+06, 2.2084e+06);
		const _var = vec3(4.3278e+09, 9.3046e+09, 6.6121e+09);

		var xyz = val * sqrt(2.0 * ${Math.PI} * _var) * cos(pos * phase + shift) * exp(-phase * phase * _var);
		xyz.x += 9.7470e-14 * sqrt(2.0 * ${Math.PI} * 4.5282e+09) * cos(2.2399e+06 * phase + shift.x) * exp(-4.5282e+09 * phase * phase);
		xyz /= 1.0685e-7;

		let rgb = ${zl} * xyz;
		return rgb;

	}

`,li=U(`

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

`,[Vs,Ws,ie,qs,Ul,Gs]),co=(c=li)=>d`

	fn transmissionFresnel( cosTheta: f32, surf: ${$} ) -> ${Qa} {

		var result: ${Qa};
		let cosine = saturate( abs( cosTheta ) );
		let matchedIor = ${Je}( surf.eta );
		let airIncident = surf.thinWall || surf.frontFace;
		let dielectricFresnel = ${$e}( cosine, surf.eta );

		// Keep matched media transparent unless a real thin-film layer is present. This avoids
		// introducing the non-physical Schlick F90 reflection produced by KHR_materials_specular
		// when the substrate itself has no IOR boundary.
		var reflectance = vec3f( 0.0 );
		if ( ! matchedIor ) {

			let specularF0 = min( surf.f0 * surf.specularColor, vec3f( 1.0 ) );
			let dielectricReflectance = select(
				vec3f( dielectricFresnel ),
				${Xe}( cosine, specularF0, vec3f( 1.0 ) ),
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
				vec3f( ${q}( filmBaseIor ) ),
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
		let transmissionTint = select( sqrt( surf.color ), surf.color, surf.thinWall );
		let transmitEnergy = dot( transmittance * transmissionTint, vec3f( 1.0 / 3.0 ) );
		let totalEnergy = reflectEnergy + transmitEnergy;
		result.reflectProbability = select( 0.0, reflectEnergy / max( totalEnergy, EPSILON ), totalEnergy > EPSILON );

		return result;

	}

`,uo=U(`

	fn conductorFresnel( VdotH: f32, f0: vec3f, specular: vec3f ) -> vec3f {

		return specular * schlickFresnelVec( abs( VdotH ), f0, vec3f( 1 ) );

	}

`,[Xe]),ho=U(`

	fn fresnelCoat( VdotNc: f32, ior: f32, base: vec3f, layer: vec3f, weight: f32 ) -> vec3f {

		let f0 = iorToF0( ior );
		let F = schlickFresnel( abs( VdotNc ), f0 );

		return mix( base, layer, weight * F );

	}

`,[q,ie]),fo=c=>d`

	fn albedo(
		eta: f32,
		includeFresnel: bool,
		includeRefraction: bool,
		globalId: vec3u,
		layer: u32,
	) -> void {

		// The matched-IOR limit is a unit-energy delta transmission event, so it cannot
		// be integrated with the rough BTDF below.
		if ( includeRefraction && ${Je}( eta ) ) {

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

		let f0 = ${q}( eta );

		var result = 0.0;
		for ( var x = 0u; x < GRID_SIZE; x++ ) {

			for ( var y = 0u; y < GRID_SIZE; y++ ) {

				// calculate the half vector to sample
				let gridPoint = vec2f( vec2u( x, y ) ) + vec2f( 0.5 );
				let sampleUv = gridPoint / f32( GRID_SIZE );
				let wh = ${Ne}( wo, vec2( alpha ), sampleUv );

				var f = 1.0;
				if ( includeFresnel ) {

					// use the exact dielectric fresnel so the table agrees with the fresnel used
					// for lobe sampling
					f = ${$e}( dot( wo, wh ), eta );

				}

				// air-incident reflection is evaluated with schlick in bsdfEval - only the
				// volume-incident ( TIR ) glass reflection uses the exact fresnel
				var reflectionF = f;
				if ( eta < 1.0 ) {

					reflectionF = ${ie}( dot( wo, wh ), f0 );

				}

				// reflection lobe - samples landing below the surface are lost
				let wi = - reflect( wo, wh );
				let reflectionPdf = ${Ae}( wo, wh, vec2f( alpha ) );
				if ( wi.z > 0.0 && reflectionPdf != 0.0 ) {

					let specular = ${oi}( wo, wi, wh, vec2f( alpha ) );
					result += reflectionF * specular.x * wi.z / reflectionPdf;

				}

				// refraction lobe - the btdf carries its own ( 1 - F ) fresnel weight, and
				// samples landing back above the surface are lost
				if ( includeRefraction ) {

					let wiRefract = refract( - wo, wh, eta );
					if ( wiRefract.z < 0.0 ) {

						let transmission = ${ni}( wo, wiRefract, wh, vec2f( alpha ), eta );
						let pdf = ${Hr}( wo, wiRefract, wh, vec2f( alpha ), eta );
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

`;var ci={};Na(ci,{rand1:()=>Wl,rand2:()=>ql,rand3:()=>Gl,rand4:()=>Ql,rngInit:()=>Vl,rngNextBounce:()=>jl});import{wgsl as Ol,wgslFn as Pe}from"three/tsl";var At=Ol(`

	struct PcgState {
		s0: vec4u,
		s1: vec4u,
	};

	var<private> g_state: PcgState;
`),Vl=Pe(`
	fn pcgInitialize( pixel: vec2u, pathIndex: u32, bounceIndex: u32 ) -> void {

		// white noise seed
		g_state.s0 = vec4u( pixel | vec2( bounceIndex << 16 ), pathIndex, pixel.x + pixel.y);

		// blue noise seed
		g_state.s1 = vec4u( pathIndex, pathIndex * 15843, pathIndex * 31 + 4566, pathIndex * 2345 + 58585 );

	}
`,[At]),qr=Pe(`
	fn pcg4d( v: ptr<private, vec4u> ) -> void {

		*v = *v * 1664525u + 1013904223u;
		*v = *v + v.yzxy * v.wxyz;
		*v = *v ^ ( *v >> vec4u( 16u ) );
		*v = *v + v.yzxy * v.wxyz;
	}
`),Wl=Pe(`
	fn pcgRand( _id: u32 ) -> f32 {

		pcg4d( &g_state.s0 );
		return abs( f32( g_state.s0.x ) / f32( 0xffffffffu ) );

	}
`,[qr,At]),ql=Pe(`
	fn pcgRand2( _id: u32 ) -> vec2f {

		pcg4d( &g_state.s0 );
		return abs( vec2f( g_state.s0.xy ) / f32( 0xffffffffu ) );

	}
`,[qr,At]),Gl=Pe(`
	fn pcgRand3( _id: u32 ) -> vec3f {

		pcg4d( &g_state.s0 );
		return abs( vec3f( g_state.s0.xyz ) / f32( 0xffffffffu ) );

	}
`,[qr,At]),Ql=Pe(`
	fn pcgRand4( _id: u32 ) -> vec4f {

		pcg4d( &g_state.s0 );
		return abs( vec4f( g_state.s0 ) / f32( 0xffffffffu ) );

	}
`,[qr,At]),jl=Pe("fn noop() -> void {}");var ui={};Na(ui,{rand1:()=>ac,rand2:()=>rc,rand3:()=>tc,rand4:()=>Gr,rngInit:()=>Jl,rngNextBounce:()=>ec});import{texture as Kl,vec4 as Xl}from"three/tsl";var mo=64,Yl=new qi(mo,1),Zl=Kl(Yl),po=Xl(0).toVar("blueDitherSeed"),Jl=d`
	fn blueDitherInitialize( pixel: vec2u, pathIndex: u32, bounceIndex: u32 ) -> void {

		let coord = vec2i( pixel % vec2u( ${mo}u ) );
		${po} = textureLoad( ${Zl}, coord, 0 );
		${$t}( vec2u( 0 ), pathIndex, bounceIndex );

	}
`,ec=d`
	fn blueDitherNextBounce() -> void {

		${Ft}();

	}
`,Gr=d`
	fn blueDitherRand4( effect: u32 ) -> vec4f {

		// Get the scrambled sobol stratified sample
		let stratifiedSample = ${Ct}( effect );

		// offset it by the blue noise seed and dimension rotation
		return fract( stratifiedSample + ${po}.r );

	}
`,tc=d`
	fn blueDitherRand3( effect: u32 ) -> vec3f {

		return ${Gr}( effect ).xyz;

	}
`,rc=d`
	fn blueDitherRand2( effect: u32 ) -> vec2f {

		return ${Gr}( effect ).xy;

	}
`,ac=d`
	fn blueDitherRand1( effect: u32 ) -> f32 {

		return ${Gr}( effect ).x;

	}
`;var Im=ci,go=hr,_m=ui,Qr=0,rt=1,jr=2,xo=2147483648,at=1073741824,me=1073741823;var Xr=class extends S{constructor(){let e={material:{value:null},envInfo:{value:null},lightsInfo:{value:null},prevOutputTarget:Kr(de()).toReadOnly(),outputTarget:Kr(de()).toWriteOnly(),sampleCountTarget:Kr(Se()).toReadWrite(),offset:G(new yo),tileSize:G(new yo),seed:G(0),maxBounces:G(5),maxTransparentBounces:G(5,"uint"),maxSubsurfaceBounces:G(256,"uint"),misEnabled:G(1,"uint"),maxSamples:G(0,"uint"),filterGlossy:G(1),clampDirect:G(0),clampIndirect:G(10),backgroundInfo:{value:null},transmissiveBackground:G(rt),accumulateAux:G(0,"uint"),auxTarget:Kr(Z()).toReadWrite(),textures:ic(new vo),textureSampler:sc(new vo),globalId:oc},t=E("bvhData.fns.raycastFirstHit.outputType"),r=N("bvhData.fns.raycastFirstHit"),a=N("bvhData.fns.raycastShadow"),s=N("bvhData.fns.sampleTrianglePoint"),i=N("bvhData.fns.getSurfaceRecord"),o=N("bvhData.fns.getCameraRay"),l=R("material.value.bsdfSample",e),h=R("material.value.bsdfEvalPdf",e),n=E("bvhData.storage.materials"),f=E("bvhData.storage.transforms"),m=C("envInfo.value.totalSumNode",e),p=C("envInfo.value.intensityNode",e),u=C("envInfo.value.sampleColor",e),g=C("envInfo.value.sampleDir",e),x=C("envInfo.value.getDirPdf",e),T=C("envInfo.value.getWeight",e),b=C("backgroundInfo.value.sampleColor",e),_=C("lightsInfo.value.countNode",e),y=R("lightsInfo.value.randomLightSample",e),D=R("lightsInfo.value.intersectLightAtIndex",e),H=R("lightsInfo.value.getLightWeight",e),z=R("lightsInfo.value.getLightsWeight",e),le=R("lightsInfo.value.selectLight",e),K=R("lightsInfo.value.isLightVisibleToCamera",e),P=d`

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
				maxSubsurfaceBounces: u32,
				misEnabled: u32,
				maxSamples: u32,
				filterGlossy: f32,
				clampDirect: f32,
				clampIndirect: f32,

				transmissiveBackground: u32,
				accumulateAux: u32,

			) -> void {

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
				${W}( indexUV.xy, seed, 0 );

				// scene ray
				let jitteredUv = uv + ${k}( ${fr} ) / vec2f( targetDimensions );
				var ray: ${v};
				if ( ! ${o}( jitteredUv, vec2f( targetDimensions ), &ray ) ) {

					// a declined pixel never takes a sample, so with a cap it counts as finished
					if ( maxSamples != 0u ) {

						textureStore( ${e.sampleCountTarget}, indexUV, vec4( maxSamples ) );

					}

					return;

				}

				ray.direction = normalize( ray.direction );

				var resultColor = vec4f( 0, 0, 0, 1 );
				var throughputColor = vec3f( 1.0 );
				var bsdfPdf = 0.0;

				// Alpha pass throughs only move where the BVH traversal starts, "rayStart" along the ray, so the
				// ray keeps the origin it scattered from, which its MIS weights are measured from
				var rayStart = 0.0;
				var traceOrigin = ray.origin;
				var isFullyTransmissive = true;
				var minPdf = 1.0;
				var transparentBounce = 0u;

				// the scattering volume the path is in. Media don't nest
				var medium: ${fe};
				var subsurfaceBounces = 0u;

				// no light is sampled at a scatter event, so whatever the next segment reaches takes full weight
				var mediumScattered = false;

				// A negative value marks a sampled wavelength whose RGB reconstruction weight has not been applied yet.
				var dispersionWavelength = - mix( ${et}.0, ${tt}.0, ${ae}( ${vr} ) );

				// one-sample NEE chooses between the analytic lights and the environment
				let envActive = ${m} > 0.0 && ${p} > 0.0;
				let lightsCount = ${_};
				var envWeight = 0.0;
				if ( envActive ) {

					envWeight = ${T}();

				}

				// added last, since a camera ray miss overwrites the pixel with the background
				var lightHits = vec3f( 0.0 );
				var cameraHitLight = false;

				// The first surface the path scatters off fills the denoiser's auxiliary images. Until one is found
				// the last mirror or transmission hit stands in, for paths that reach the environment. The albedo
				// is tinted by the throughput of the surfaces looked past to reach it
				var auxFound = false;
				var auxAlbedo = vec3f( 0.0 );
				var auxNormal = vec3f( 0.0 );

				for ( var bounce = 0u; bounce < maxBounces; bounce ++ ) {

					// Inside a medium, sample a scatter event before the next surface and only trace up to it
					var channelPdf = vec3f( 0.0 );
					var scatterDist = 0.0;
					var traceRay = ray;
					traceRay.origin = traceOrigin;
					if ( medium.inside ) {

						channelPdf = ${Br}( throughputColor, medium.albedo );
						scatterDist = ${Er}( medium, channelPdf, ${k}( ${yr} ) );
						traceRay.maxDist = select( scatterDist, min( ray.maxDist, scatterDist ), ray.maxDist > 0.0 );

					}

					var hitResult: ${t};
					let didHit = ${r}( traceRay, &hitResult );
					let surfaceDist = select( ${Q}, hitResult.dist, didHit );

					let segmentInMedium = medium.inside;
					if ( medium.inside ) {

						let scattered = scatterDist < surfaceDist;
						let segmentDist = select( surfaceDist, scatterDist, scattered );
						let transmittance = exp( - medium.extinction * segmentDist );
						let distancePdf = dot( channelPdf, ${Lr}( medium, segmentDist, scattered ) );
						if ( distancePdf <= 0.0 ) {

							break;

						}

						if ( ! scattered ) {

							// reaching the surface, weighted by the probability of no scatter event before it
							throughputColor *= transmittance / distancePdf;

						} else {

							throughputColor *= medium.albedo * medium.extinction * transmittance / distancePdf;
							ray.origin = traceOrigin + ray.direction * scatterDist;
							traceOrigin = ray.origin;
							rayStart = 0.0;
							ray.direction = ${_r}( ray.direction, medium.anisotropy, ${k}( ${br} ) );
							ray.maxDist = 0.0;
							mediumScattered = true;
							isFullyTransmissive = false;

							// subsurface bounces are capped separately from bounces
							subsurfaceBounces ++;
							let maxThroughput = max( max( throughputColor.r, throughputColor.g ), throughputColor.b );
							if ( subsurfaceBounces >= maxSubsurfaceBounces || maxThroughput < ${Nr} ) {

								break;

							}

							${je}();
							bounce --;
							continue;

						}

					}

					// NEE's total weight at the vertex this ray left, for MIS. Camera rays have none, and
					// neither do scatter events in a medium
					let isMISWeighted = misEnabled != 0u && bounce > 0u && ! mediumScattered;
					var lightTotalWeight = 0.0;
					if ( isMISWeighted ) {

						lightTotalWeight = ${z}( ray.origin ) + envWeight;

					}

					// forward hits on area lights along the traced segment. Camera rays only see visibleToCameraRays
					// lights, at full weight
					for ( var li = 0u; li < lightsCount; li ++ ) {

						if ( bounce == 0u && ! ${K}( li ) ) {

							continue;

						}

						var lightRec: ${V};
						if ( ${D}( ray.origin, ray.direction, li, &lightRec ) && lightRec.dist > rayStart && lightRec.dist < rayStart + surfaceDist ) {

							var misWeight = 1.0;
							if ( isMISWeighted ) {

								let selectionPdf = ${H}( li, ray.origin ) / lightTotalWeight;
								misWeight = ${se}( bsdfPdf, lightRec.pdf * selectionPdf );

							}

							lightHits += ${M}( lightRec.emission * throughputColor * misWeight, bounce, clampDirect, clampIndirect );
							cameraHitLight = cameraHitLight || bounce == 0u;

						}

					}

					if ( didHit ) {

						// whole structs are read from the buffer, not a pointer alias, which Safari fails to compile
						let objectInfo = ${f}[ hitResult.objectIndex ];
						var materialInfo = ${n}[ objectInfo.materialIndex ];

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
						// the traversal at the hit point, advancing the rng but not the bounce count.
						if ( ${ae}( ${Sr} ) > surface.opacity ) {

							// stop once the transparent bounces run out
							if ( transparentBounce >= maxTransparentBounces ) {

								break;

							}

							traceOrigin = ${he}( vertexData.position.xyz, ray.direction, hitResult.normal );
							rayStart += hitResult.dist;
							${je}();
							transparentBounce ++;
							bounce --;
							continue;

						}

						let isDispersive = materialInfo.dispersion > 0.0 && surface.ior > 1.0 && surface.transmission > 0.0 && ! surface.thinWall;
						if ( isDispersive ) {

							let wavelength = abs( dispersionWavelength );
							${Vr}( &surface, materialInfo.dispersion, wavelength );
							if ( dispersionWavelength < 0.0 ) {

								dispersionWavelength = wavelength;
								throughputColor *= ${Wr}( wavelength );

							}

						}

						// attenuate the light transmitted through the volume when exiting a backface. A scattering
						// medium has already applied its transmittance above
						if ( hitResult.side < 0.0 && materialInfo.transmission > 0.0 && ! segmentInMedium ) {

							throughputColor *= ${Or}( hitResult.dist, materialInfo.attenuationColor, materialInfo.attenuationDistance );

						}

						// emission, clamped at the depth of the segment that found it, as in Cycles
						let emission = ${M}( throughputColor * surface.emission, bounce, clampDirect, clampIndirect );
						resultColor += vec4f( emission, 0.0 );

						// next event estimation: choose one light or the environment by its estimated
						// contribution
						if ( misEnabled != 0u ) {

							let ruv = ${Ke}( ${gr} );
							var selectionPdf = 0.0;
							let lightIndex = ${le}( vertexData.position.xyz, envWeight, ruv.x, &selectionPdf );
							if ( selectionPdf > 0.0 ) {

								var lightRec: ${V};
								if ( envActive && lightIndex == lightsCount ) {

									// the environment, sampled from its CDF, as a light of kind ENVIRONMENT
									let envSample = ${g}( ruv.yz );
									lightRec.direction = envSample.direction;
									lightRec.emission = envSample.color;
									lightRec.pdf = envSample.pdf;
									lightRec.dist = ${Q};
									lightRec.lightType = ${Mt};

								} else {

									lightRec = ${y}( lightIndex, vertexData.position.xyz, ruv.yz );

								}

								if ( lightRec.pdf > 0.0 ) {

									let evalRec = ${h}( view, lightRec.direction, surface );
									if ( evalRec.pdf > 0.0 ) {

										var shadowRay: ${v};
										shadowRay.origin = ${he}( vertexData.position.xyz, lightRec.direction, hitResult.normal );
										shadowRay.direction = lightRec.direction;
										shadowRay.maxDist = lightRec.dist * ( 1.0 - ${$r} );

										// opaque occlusion up to the light distance, attenuated by the partially
										// transparent surfaces passed
										var shadowHit: ${t};
										let occluded = ${a}( shadowRay, &shadowHit );
										if ( ! occluded ) {

											let lightPdf = lightRec.pdf * selectionPdf;

											// env + area lights are also found by bsdf rays, so MIS-weight them. Punctual lights, and lights
											// past the bounce limit, take full weight. Bsdf rays stopped by faces the shadow ray skipped can't
											// find the light, so their share of the weight moves to the light sample
											let isMISWeighted = ${Fr}( lightRec.lightType ) && bounce + 1u < maxBounces;
											let misWeight = select( 1.0, mix( ${se}( lightPdf, evalRec.pdf ), 1.0, shadowHit.skippedOcclusion ), isMISWeighted );
											let directLight = throughputColor * lightRec.emission * evalRec.color * misWeight * ( 1.0 - shadowHit.occlusion ) / lightPdf;
											let contribution = ${M}( directLight, bounce + 1u, clampDirect, clampIndirect );
											resultColor += vec4f( contribution, 0.0 );

										}

									}

								}

							}

						}

						let scatterRec = ${l}( view, surface );

						if ( ! auxFound ) {

							auxFound = ${nr}( surface, scatterRec );
							auxAlbedo = saturate( throughputColor * surface.color );
							auxNormal = surface.normal;

						}

						if ( ${Ye}( scatterRec ) ) {

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
							if ( rrProb <= 0.0 || ${ae}( ${xr} ) > rrProb ) {

								break;

							}

							throughputColor /= rrProb;

						}

						throughputColor *= scatterRec.color;
						throughputColor /= scatterRec.pdf;
						bsdfPdf = scatterRec.pdf;
						mediumScattered = false;

						// As in "KHR_materials_scatter", the medium's surface bsdf is its boundary: the walk ends when
						// light refracts out through it, and continues inside when it reflects back
						if ( segmentInMedium && hitResult.objectIndex == medium.object && hitResult.side < 0.0 && scatterRec.isTransmissive ) {

							medium.inside = false;

						}

						// refracting into a front face of a scattering material starts a random walk inside it
						if ( scatterRec.isTransmissive && ! surface.thinWall && hitResult.side > 0.0 ) {

							let entered = ${Pr}( materialInfo, hitResult.objectIndex );

							if ( entered.inside ) {

								medium = entered;

							}

						}

						// exit if our throughput is 0.0
						if ( all( throughputColor == vec3f( 0.0 ) ) ) {

							break;

						}

						ray.origin = ${he}( vertexData.position.xyz, scatterRec.direction, hitResult.normal );
						ray.direction = scatterRec.direction;
						ray.maxDist = 0.0;
						traceOrigin = ray.origin;
						rayStart = 0.0;

					} else {

						if ( bounce > 0u && ! isFullyTransmissive ) {

							var misWeight = 1.0;
							if ( isMISWeighted && envActive ) {

								// match the env pdf scaling used by the NEE selection so the two estimators balance
								let envPdf = ${x}( ray.direction ) * envWeight / lightTotalWeight;
								misWeight = ${se}( bsdfPdf, envPdf );

							}

							let environment = ${u}( ray.direction ).rgb * throughputColor * misWeight;
							let contribution = ${M}( environment, bounce, clampDirect, clampIndirect );
							resultColor += vec4f( contribution, 0.0 );

						} else {

							// hit the background
							// support multiple transparent background blending techniques
							let rng = ${k}( ${mr} );
							let bg = ${b}( ray.direction, rng );
							if ( bounce == 0u ) {

								// sample the background directly if this is the primary ray
								let background = ${M}( bg.a * bg.rgb, bounce, clampDirect, clampIndirect );
								resultColor = vec4f( background, bg.a );

							} else {

								// transmissive ray handling
								let env = ${u}( ray.direction );
								let avg = saturate( dot( throughputColor, vec3f( 1.0 / 3.0 ) ) );
								let transparency = ( 1.0 - bg.a ) * avg;
								var envMisWeight = 1.0;
								if ( misEnabled != 0u && ${m} > 0.0 ) {

									let envPdf = ${x}( ray.direction );
									envMisWeight = ${se}( bsdfPdf, envPdf );

								}

								if ( transmissiveBackground == ${Qr}u ) {

									// display the env map through transmissive surfaces
									let background = ${M}( env.rgb * throughputColor * envMisWeight, bounce, clampDirect, clampIndirect );
									resultColor = vec4f(
										resultColor.rgb + background,
										1.0,
									);

								} else if ( transmissiveBackground == ${jr}u ) {

									// fade the background by the throughput color average
									let background = ${M}( bg.a * bg.rgb * throughputColor * envMisWeight, bounce, clampDirect, clampIndirect );
									resultColor = vec4f(
										resultColor.rgb + background,
										1.0 - transparency,
									);

								} else {

									// fade the background by the throughput color average, mixing in env lighting
									var light = mix( env.rgb, bg.rgb, bg.a ) * envMisWeight;
									let background = ${M}( light * throughputColor, bounce, clampDirect, clampIndirect );
									resultColor = vec4f(
										resultColor.rgb + background,
										1.0 - transparency,
									);

								}

							}

						}

						break;

					}

					${je}();

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
				let blendedColor = ${Rr}( prevColor, resultColor, 1.0 / f32( nextSampleCount ) );
				textureStore( ${e.sampleCountTarget}, indexUV, vec4( nextSampleCount ) );
				textureStore( ${e.outputTarget}, colorIndex, blendedColor );

				// the auxiliary images are blended the same way, in the same row order
				if ( accumulateAux != 0u ) {

					var auxPacked: vec3u;
					for ( var layer = 0u; layer < ${L}u; layer ++ ) {

						auxPacked[ layer ] = textureLoad( ${e.auxTarget}, colorIndex, layer ).r;

					}

					auxPacked = ${lr}( auxPacked, auxAlbedo, auxNormal, 1.0 / f32( nextSampleCount ) );
					for ( var layer = 0u; layer < ${L}u; layer ++ ) {

						textureStore( ${e.auxTarget}, colorIndex, layer, vec4u( auxPacked[ layer ] ) );

					}

				}

			}`;super(P(e)),this.defineUniformAccessors(e)}};import{Matrix3 as nc,StorageBufferAttribute as bo}from"three/webgpu";import{texture as lc,sampler as cc,uniform as di,storage as uc,PI as Pt}from"three/tsl";var it=class extends Ui{constructor(){super(),this.mapNode=lc(this.map),this.mapSampler=cc(this.mapNode),this.cdfNode=uc(new bo(new Float32Array([0,1,0,1]),1),"float").toReadOnly(),this.rotationNode=di(new nc),this.intensityNode=di(1),this.totalSumNode=di(this.totalSum),this._initFns()}getPixelWeight(e,t,r,a,s){let i=Math.PI*(a+.5)/s;return super.getPixelWeight(e,t,r)*Math.sin(i)}updateFrom(e){super.updateFrom(e);let{mapNode:t,cdfNode:r,totalSumNode:a}=this;t.value=this.map,a.value=this.totalSum;let{width:s,height:i}=this.map.image,{cdfMarginal:o,cdfConditional:l}=this,h=new Float32Array(i+1+i*(s+1));h.set(o,1);for(let n=0;n<i;n++)h.set(l.subarray(n*s,n*s+s),i+1+n*(s+1)+1);r.value=new bo(h,1)}dispose(){super.dispose(),this.cdfNode.value.dispose()}_initFns(){let{mapNode:e,mapSampler:t,cdfNode:r,totalSumNode:a,rotationNode:s,intensityNode:i}=this,o=d`
			fn searchEnvCdf( r: f32, offset: u32, count: u32, fraction: ptr<function, f32> ) -> u32 {

				var lower = 0u;
				var upper = count - 1u;
				while ( lower < upper ) {

					let mid = ( lower + upper ) >> 1u;
					if ( ${r}[ offset + mid + 1u ] <= r ) {

						lower = mid + 1u;

					} else {

						upper = mid;

					}

				}

				let start = ${r}[ offset + lower ];
				let end = ${r}[ offset + lower + 1u ];
				*fraction = select( 0.5, saturate( ( r - start ) / ( end - start ) ), end > start );
				return lower;

			}
		`,l=d`
			fn getEnvTexelPdf( texel: vec2u, v: f32 ) -> f32 {

				let resolution = textureDimensions( ${e} );
				let rowOffset = resolution.y + 1u + texel.y * ( resolution.x + 1u );
				let rowPdf = ${r}[ texel.y + 1u ] - ${r}[ texel.y ];
				let pixelPdf = ${r}[ rowOffset + texel.x + 1u ] - ${r}[ rowOffset + texel.x ];

				// the equirect projection stretches each pixel by 1 / sin( theta ) over the sphere
				let sinTheta = sin( ${Pt} * v );
				return select( 0.0, rowPdf * pixelPdf * f32( resolution.x * resolution.y ) / ( 2.0 * ${Pt} * ${Pt} * sinTheta ), sinTheta > 0.0 );

			}
		`;this.sampleColor=d`
			fn sampleEnv( direction: vec3f ) -> vec4f {

				let sampleDir = ${s} * direction;
				let mapUv = ${Ze}( sampleDir );
				let col = textureSampleLevel( ${e}, ${t}, mapUv, 0 );

				return vec4f( ${i} * col.rgb, col.a );

			}
		`,this.sampleDir=d`
			fn sampleEnvDir( r: vec2f ) -> ${ja} {

				var result: ${ja};

				// search the CDFs: marginal picks the row (v), conditional picks the column (u), and the
				// fractions place the sample within the pixel
				let resolution = textureDimensions( ${e} );
				var rowFraction = 0.0;
				var columnFraction = 0.0;
				let row = ${o}( r.x, 0u, resolution.y, &rowFraction );
				let column = ${o}( r.y, resolution.y + 1u + row * ( resolution.x + 1u ), resolution.x, &columnFraction );
				let texel = vec2u( column, row );
				let uv = ( vec2f( texel ) + vec2f( columnFraction, rowFraction ) ) / vec2f( resolution );

				let direction = ${Ys}( uv );
				let color = textureSampleLevel( ${e}, ${t}, uv, 0 ).rgb;

				result.direction = transpose( ${s} ) * direction;
				result.color = color * ${i};
				result.pdf = ${l}( texel, uv.y );

				return result;

			}
		`,this.getWeight=d`
			fn getEnvWeight() -> f32 {

				let resolution = textureDimensions( ${e} );
				return ${i} * ${Pt} * ${Pt} * ${a} / ( 2.0 * f32( resolution.x * resolution.y ) );

			}
		`,this.getDirPdf=d`
			fn getEnvDirPdf( direction: vec3f ) -> f32 {

				if ( ${a} == 0.0 ) {

					return 0.0;

				}

				let rotatedDir = ${s} * direction;
				let mapUv = ${Ze}( rotatedDir );
				let resolution = textureDimensions( ${e} );
				let texel = min( vec2u( mapUv * vec2f( resolution ) ), resolution - 1u );

				return ${l}( texel, mapUv.y );

			}
		`}};import{DataTexture as dc,LinearFilter as So,Matrix4 as hc,RGBAFormat as fc,RepeatWrapping as To}from"three";import{sampler as mc,texture as pc,uniform as hi}from"three/tsl";var st=class{get map(){return this.mapNode.value}set map(e){this.mapNode.value=e}get blur(){return this.blurNode.value}set blur(e){this.blurNode.value=e}get rotation(){return this.rotationNode.value}get intensity(){return this.intensityNode.value}set intensity(e){this.intensityNode.value=e}constructor(){let e=new dc(new Uint8Array([0,0,0,255]),1,1,fc);e.minFilter=So,e.magFilter=So,e.wrapS=To,e.wrapT=To,e.generateMipmaps=!1,e.needsUpdate=!0,this.mapNode=pc(e),this.mapSampler=mc(this.mapNode),this.blurNode=hi(0),this.rotationNode=hi(new hc),this.intensityNode=hi(1),this._initFns()}dispose(){this.map.dispose()}_initFns(){let{mapNode:e,mapSampler:t,blurNode:r,rotationNode:a,intensityNode:s}=this;this.sampleColor=d`
			fn sampleBackground( direction: vec3f, uv: vec2f ) -> vec4f {

				let rotatedDir = ( ${a} * vec4f( direction, 0.0 ) ).xyz;
				let offsetDir = ${Ks}( rotatedDir, uv ) * 0.5 * ${r};
				let sampleDir = normalize( rotatedDir + offsetDir );

				let mapUv = ${Ze}( sampleDir );
				let col = textureSampleLevel( ${e}, ${t}, mapUv, 0 );

				return vec4f( ${s} * col.rgb, col.a );

			}
		`}};import{storage as _c,uniform as Rc,uniformArray as Dc,texture as Cc}from"three/tsl";import{StorageBufferAttribute as Do,HalfFloatType as $c}from"three/webgpu";import{MeshBasicMaterial as gc,RenderTarget as xc,NoToneMapping as vc,QuadMesh as yc,NoBlending as bc,Color as Sc,Vector4 as fi,Matrix3 as Tc}from"three/webgpu";var wo=new Sc,Io=new Tc;function _o(c){return`${c.source.uuid}:${c.source.version}`}function wc(c,e,t,r){if(c[e].x+t>r)return-1;let s=t,i=0,o=e;for(;s>0;){if(o>=c.length)return-1;i=Math.max(i,c[o].y),s-=c[o].width,o++}return i}function Ic(c,e,t,r){let a=e+r,s=[],i=!1;for(let o=0;o<c.length;o++){let l=c[o],h=l.x+l.width;h<=e?s.push(l):l.x>=a?(i||(s.push({x:e,y:t,width:r}),i=!0),s.push(l)):(i||(s.push({x:e,y:t,width:r}),i=!0),h>a&&s.push({x:a,y:l.y,width:h-a}))}i||s.push({x:e,y:t,width:r}),c.length=0;for(let o=0;o<s.length;o++){let l=s[o],h=c[c.length-1];h&&h.y===l.y&&h.x+h.width===l.x?h.width+=l.width:c.push(l)}}function Ro(c,e,t,r,a){let s=1/0,i=0,o=-1;for(let l=0;l<c.length;l++){let h=wc(c,l,e,r);h>=0&&h+t<=a&&h<s&&(s=h,i=c[l].x,o=l)}return o===-1?null:(Ic(c,i,s+t,e),{x:i,y:s})}var ot=class{get width(){return this.renderTarget.width}get height(){return this.renderTarget.height}get pageCount(){return this.renderTarget.depth}get texture(){return this.renderTarget.texture}constructor(e={}){this.renderTarget=new xc(1,1,{depthBuffer:!1,depth:1,...e}),this.texture.isArrayTexture=!0,this.textureInfo=[new fi],this.hashes=[],this.placements=[],this.quadMesh=new yc(new gc),this.quadMesh.material.blending=bc}setTextures(e,t){let r=t.map((f,m)=>m);if(r.sort((f,m)=>t[f].source.uuid<t[m].source.uuid?-1:1),t=r.map(f=>t[f]),this._hashesMatch(t)){this._buildCallerTextureInfo(r);return}let a=t.reduce((f,m)=>Math.max(f,m.width,m.height),1);a=Math.min(e.backend.device.limits.maxTextureDimension2D,a);let s=a,i=a,{renderTarget:o}=this,{placements:l,pageCount:h}=this._packTextures(t,s,i);o.setSize(s,i,h),this.texture.isArrayTexture=!0,this._renderTextures(e,t,l),this.placements=l;let n=new Array(t.length);for(let f=0,m=t.length;f<m;f++){let p=_o(t[f]);n[f]=p}this.hashes=n,this._buildCallerTextureInfo(r)}_buildCallerTextureInfo(e){let t=new Array(e.length);for(let r=0,a=e.length;r<a;r++)t[e[r]]=this.placements[r];this._buildTextureInfo(t)}dispose(){this.renderTarget.dispose(),this.quadMesh.material.dispose()}_hashesMatch(e){let t=this.hashes;if(t.length!==e.length)return!1;for(let r=0,a=e.length;r<a;r++)if(t[r]!==_o(e[r]))return!1;return!0}_packTextures(e,t,r){let a=[];for(let l=0,h=e.length;l<h;l++){let n=e[l];a.push({index:l,w:Math.min(n.width,t),h:Math.min(n.height,r)})}let s=a.sort((l,h)=>h.h-l.h),i=new Array(e.length),o=[];for(let l=0,h=s.length;l<h;l++){let n=s[l],f=null,m=-1;for(let p=0;p<o.length;p++)if(f=Ro(o[p],n.w,n.h,t,r),f){m=p;break}if(!f){let p=[{x:0,y:0,width:t}];f=Ro(p,n.w,n.h,t,r),o.push(p),m=o.length-1}i[n.index]={x:f.x,y:f.y,w:n.w,h:n.h,page:m}}return{placements:i,pageCount:Math.max(o.length,1)}}_buildTextureInfo(e){let t=this.textureInfo;t.length=0;for(let r=0,a=e.length;r<a;r++){let{x:s,y:i,w:o,h:l,page:h}=e[r],n=new fi;n.x=s&65535|(i&65535)<<16,n.y=o&65535|(l&65535)<<16,n.z=h&65535,n.w=0,t.push(n)}t.length===0&&t.push(new fi(0,0,0,0))}_renderTextures(e,t,r){let{quadMesh:a,renderTarget:s,width:i,height:o}=this,l=e.getRenderTarget(),h=e.toneMapping,n=e.autoClear,f=e.getScissorTest(),m=e.getClearAlpha();e.getClearColor(wo),e.toneMapping=vc,e.autoClear=!1,e.setScissorTest(!0),e.setClearColor(0,0);for(let p=0,u=s.depth;p<u;p++)s.viewport.set(0,0,i,o),s.scissor.set(0,0,i,o),e.setRenderTarget(s,p),e.clear();for(let p=0,u=t.length;p<u;p++){let{x:g,y:x,w:T,h:b,page:_}=r[p],y=t[p];if(s.viewport.set(g,x,T,b),s.scissor.set(g,x,T,b),e.setRenderTarget(s,_),y.isRenderTargetTexture){let D=y.matrixAutoUpdate;Io.copy(y.matrix),y.matrix.identity(),y.matrixAutoUpdate=!1,a.material.map=y,a.render(e),y.matrixAutoUpdate=D,y.matrix.copy(Io)}else{let D=y.clone();D.matrixAutoUpdate=!1,D.matrix.identity(),a.material.map=D,a.render(e),D.dispose()}}s.viewport.set(0,0,i,o),s.scissor.set(0,0,i,o),a.material.map=null,e.setClearColor(wo,m),e.setScissorTest(f),e.autoClear=n,e.setRenderTarget(l),e.toneMapping=h}};var nt=class extends Oi{constructor(){super(),this.countNode=Rc(this.count,"uint"),this.buffer=new Do(new Float32Array(2*ue.getLength()),ue.getLength()),this.bufferNode=_c(this.buffer,ue).toReadOnly().setName("lights"),this.iesAtlas=new ot({type:$c}),this.iesProfilesNode=Cc(this.iesAtlas.texture),this.iesInfoNode=Dc(this.iesAtlas.textureInfo,"uvec4").setName("iesInfo"),this._initFns()}updateFrom(e,t){let r=Array.from(new Set(t.map(n=>n.iesMap).filter(n=>n))),a=super.updateFrom(t,r);this.iesAtlas.setTextures(e,r),this.iesProfilesNode.value=this.iesAtlas.texture;let s=ue.getLength(),i=this.count,o=Math.max(i,2);this.buffer.array.length!==o*s&&(this.buffer.dispose(),this.buffer=new Do(new Float32Array(o*s),s),this.bufferNode.value=this.buffer);let l=this.tex.image.data;this.buffer.array.set(l.subarray(0,i*s));let h=new Int32Array(this.buffer.array.buffer);for(let n=0;n<i;n++){let f=n*s;h[f+3]=Math.round(l[f+3]),h[f+11]=Math.round(l[f+11]),h[f+21]=Math.round(l[f+21])}return this.buffer.needsUpdate=!0,this.countNode.value=this.count,a}_initFns(){let{bufferNode:e,countNode:t,iesProfilesNode:r,iesInfoNode:a}=this,s=Ir(a,r,"sampleIesTexel");this.isLightVisibleToCamera=d`
			fn isLightVisibleToCamera( index: u32 ) -> bool {

				return ${e}[ index ].visibleToCameraRays != 0;

			}
		`,this.getLightWeight=d`
			fn getLightWeight( index: u32, position: vec3f ) -> f32 {

				let light = ${e}[ index ];
				let power = ${Xs}( light.color * light.intensity );
				if ( light.lightType == ${ri} ) {

					// the most any point on the spot's disc lights the position. Ies profiles are not
					// evaluated here
					let nearest = ${ro}( light, position );
					var attenuation = 1.0;
					if ( light.iesProfile < 0 ) {

						attenuation = ${si}( light.coneCos, light.penumbraCos, nearest.x );

					}

					return power * attenuation * ${Mr}( nearest.y, light.distance, light.decay );

				} else if ( light.lightType == ${ii} ) {

					// the point light's world position is packed into the u slot
					let dist = length( light.u - position );
					return power * ${Mr}( dist, light.distance, light.decay );

				} else if ( light.lightType == ${ai} ) {

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
		`,this.getLightsWeight=d`
			fn getLightsWeight( position: vec3f ) -> f32 {

				var total = 0.0;
				for ( var i = 0u; i < ${t}; i ++ ) {

					total += ${this.getLightWeight}( i, position );

				}

				return total;

			}
		`,this.selectLight=d`
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
		`,this.randomLightSample=d`
			fn randomLightSample( lightIndex: u32, rayOrigin: vec3f, ruv: vec2f ) -> ${V} {

				let light = ${e}[ lightIndex ];

				var result: ${V};
				if ( light.lightType == ${ri} ) {

					result = ${to}( light, rayOrigin, ruv );

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

						spotAttenuation = ${si}( light.coneCos, light.penumbraCos, cosTheta );

					}

					result.emission *= spotAttenuation;

				} else if ( light.lightType == ${ii} ) {

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

				} else if ( light.lightType == ${ai} ) {

					// the directional light's direction is packed into the u slot
					result.dist = ${Q};
					result.direction = light.u;
					result.pdf = 1.0;
					result.emission = light.color * light.intensity;
					result.lightType = light.lightType;

				} else {

					result = ${eo}( light, rayOrigin, ruv );

				}

				return result;

			}
		`,this.intersectLightAtIndex=d`
			fn intersectLightAtIndex( rayOrigin: vec3f, rayDirection: vec3f, index: u32, lightRec: ptr<function, ${V}> ) -> bool {

				let light = ${e}[ index ];

				var u = light.u;
				var v = light.v;
				let normal = normalize( cross( u, v ) );

				// only front-facing area lights can be hit
				if ( dot( normal, rayDirection ) > 0.0 ) {

					u *= 1.0 / dot( u, u );
					v *= 1.0 / dot( v, v );

					var dist = - 1.0;
					if ( light.lightType == ${Dr} ) {

						dist = ${Zs}( light.position, normal, u, v, rayOrigin, rayDirection );

					} else if ( light.lightType == ${Cr} ) {

						dist = ${Js}( light.position, normal, u, v, rayOrigin, rayDirection );

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
		`}dispose(){this.tex.dispose(),this.buffer.dispose(),this.iesAtlas.dispose()}};import{TimestampQuery as Ac}from"three/webgpu";import{StorageTexture as Fc}from"three/webgpu";import{textureStore as Mc,globalId as Nc}from"three/tsl";var lt=class extends S{constructor(){let e={globalId:Nc,outputTarget:Mc(new Fc(1,1)).toWriteOnly()},t=()=>e.outputTarget.value.isArrayTexture?"globalId.xy, globalId.z":"globalId.xy",r=d`
			fn compute( globalId: vec3u ) -> void {

				textureStore( ${e.outputTarget}, ${t}, vec4( 0, 0, 0, 1 ) );

			}
		`;super(r(e)),this.defineUniformAccessors({target:e.outputTarget})}};var Pc=0,Co=1,ct=class{constructor(e){this.renderer=e,this.maxBounces=15,this.frameBudget=25e4,this.maxTransparentBounces=15,this.maxSubsurfaceBounces=256,this.lowResMode=!1,this.maxSamples=0,this.asyncCompile=!1,this.compiling=!1,this.timing={count:0,frameTime:0,frameBudget:0},this._renderTask=null,this._compileState=new WeakMap,this._timestampUIDs=null,this._timingFrame=!1,this.outputTarget=de("Output #0"),this.prevOutputTarget=de("Output #1"),this.sampleCountTarget=Se("Sample Count"),this.sampleCountClearKernel=new lt().setWorkgroupSize(8,8,1),this.outputTargetClearKernel=new lt().setWorkgroupSize(8,8,1),this.auxTargetClearKernel=new lt().setWorkgroupSize(8,8,1),this.auxTarget=null,this._auxPlaceholder=Z()}setAccumulateAux(e){if(!!this.auxTarget!==e){if(this.auxTarget?.dispose(),this.auxTarget=null,e){let{width:t,height:r}=this.outputTarget;this.auxTarget=Z("Auxiliary Images"),this.auxTarget.setSize(t,r,L)}this.reset()}}setRandom(e){}setBVHData(e){}setTextures(e){}setMaterial(e){}setFilterGlossy(e){}setClamping(e,t){}setEnvironment(e,t,r){}setLights(e){}setBackground(e,t,r,a){}*compileKernels(e){let{renderer:t,_compileState:r}=this;if(!this.asyncCompile||!t.compileComputeAsync)return;let a=e.map(i=>i.kernel),s=a.filter(i=>!r.has(i));for(s.length>0&&(this.compiling=!0,yield,s.forEach(i=>r.set(i,Pc)),t.compileComputeAsync(s).catch(()=>{}).finally(()=>{s.forEach(i=>r.set(i,Co))}));a.some(i=>r.get(i)!==Co);)this.compiling=!0,yield;this.compiling=!1}rebuild(){this._renderTask=null}setSize(e,t){e=Math.ceil(e),t=Math.ceil(t);let{width:r,height:a}=this.outputTarget;return r===e&&a===t?!1:(this.outputTarget.dispose(),this.prevOutputTarget.dispose(),this.sampleCountTarget.dispose(),this.outputTarget=this.outputTarget.clone(),this.prevOutputTarget=this.outputTarget.clone(),this.sampleCountTarget=this.sampleCountTarget.clone(),this.outputTarget.setSize(e,t),this.prevOutputTarget.setSize(e,t),this.sampleCountTarget.setSize(e,t),this.auxTarget?.setSize(e,t,L),this.reset(),!0)}getSize(e){let{width:t,height:r}=this.outputTarget;return e.x=t,e.y=r,e}getPreviewPixelBudget(){return this.frameBudget}update(){let{renderer:e}=this;if(!e.initialized)return;this._renderTask||(this._renderTask=this.createRenderTask());let t=e.backend.trackTimestamp&&!this._timingFrame;this._timestampUIDs=t?[]:null,this._renderTask.next(),t&&this._timestampUIDs.length>0&&this._measureFrameTime(this._timestampUIDs),this._timestampUIDs=null}dispatch(e,t){let{renderer:r}=this;r.compute(e.kernel,t),this._timestampUIDs?.push(r.backend.getTimestampUID(e.kernel))}async _measureFrameTime(e){let{renderer:t,timing:r,frameBudget:a}=this,{backend:s}=t;this._timingFrame=!0,await t.resolveTimestampsAsync(Ac.COMPUTE),this._timingFrame=!1,e.every(i=>s.hasTimestampQuery(i))&&(r.frameTime=e.reduce((i,o)=>i+s.getTimestamp(o),0),r.frameBudget=a,r.count++)}*createRenderTask(){}async getSampleCountsAsync(){return{min:0,max:0,avg:0}}resetSeed(){}reset(){let{renderer:e,outputTargetClearKernel:t,sampleCountClearKernel:r,outputTarget:a,prevOutputTarget:s,sampleCountTarget:i}=this;if(!e.initialized)return;let{width:o,height:l}=a,h=t.getDispatchSize(o,l);if(t.target=a,e.compute(t.kernel,h),t.target=s,e.compute(t.kernel,h),r.target=i,e.compute(r.kernel,h),this.auxTarget){let{auxTargetClearKernel:n}=this;n.target=this.auxTarget,e.compute(n.kernel,n.getDispatchSize(o,l,L))}this._renderTask=null}dispose(){this.outputTarget.dispose(),this.prevOutputTarget.dispose(),this.sampleCountTarget.dispose(),this.sampleCountClearKernel.dispose(),this.outputTargetClearKernel.dispose(),this.auxTargetClearKernel.dispose(),this.auxTarget?.dispose(),this._auxPlaceholder.dispose(),this._renderTask=null}};var mi=new Fo,Yr=class extends ct{constructor(e){super(e),this.envInfo=new it,this._completedSamples=0,this._tileProgress=0,this.kernel=new Xr().setWorkgroupSize(8,8,1),this.kernel.envInfo=this.envInfo,this.backgroundInfo=new st,this.kernel.backgroundInfo=this.backgroundInfo,this.lightsInfo=new nt,this.kernel.lightsInfo=this.lightsInfo}resetSeed(){this.kernel.seed=0}reset(){super.reset(),this._completedSamples=0,this._tileProgress=0}async getSampleCountsAsync(){if(this.lowResMode)return{min:0,max:0,avg:0};let e=this._completedSamples,t=this._tileProgress;return{min:t===1?e+1:e,max:e+1,avg:e+t}}setBVHData(e){this.kernel.context.bvhData=e,this.rebuild()}rebuild(){super.rebuild(),this.kernel.needsUpdate=!0,this.reset()}setRandom(e){this.kernel.context.random=e,this.kernel.needsUpdate=!0,this.reset()}setMaterial(e){this.kernel.material=e.getData(),this.kernel.needsUpdate=!0,this.reset()}setFilterGlossy(e){this.kernel.filterGlossy=e===0?zr:1/e,this.reset()}setClamping(e,t){this.kernel.clampDirect=e,this.kernel.clampIndirect=t,this.reset()}setEnvironment(e){this.envInfo.updateFrom(e)}setLights(e){this.lightsInfo.updateFrom(this.renderer,e),this.reset()}setMultipleImportanceSampling(e){this.kernel.misEnabled=e?1:0,this.reset()}setEnvironmentParams(e,t){let{envInfo:r}=this,a=new $o().makeRotationFromEuler(t).invert();r.rotationNode.value.setFromMatrix4(a),r.intensityNode.value=e}setBackground(e){let{backgroundInfo:t}=this;t.dispose(),t.map=e}setBackgroundParams(e,t,r){let{backgroundInfo:a}=this,s=new $o().makeRotationFromEuler(t).invert();a.rotationNode.value.copy(s),a.intensity=e,a.blur=r}setTransmissiveBackground(e){this.kernel.transmissiveBackground=e,this.reset()}*createRenderTask(){let{renderer:e,kernel:t,maxBounces:r,maxTransparentBounces:a,maxSubsurfaceBounces:s,outputTarget:i,sampleCountTarget:o,lowResMode:l}=this,h=new Fo;t.outputTarget=i,t.sampleCountTarget=o,t.maxBounces=r,t.maxTransparentBounces=a,t.maxSubsurfaceBounces=s,yield*this.compileKernels([t]);let n=0;for(;;){if(t.maxSamples=this.maxSamples,t.auxTarget=this.auxTarget??this._auxPlaceholder,t.accumulateAux=this.auxTarget?1:0,this.maxSamples!==0&&n>=this.maxSamples){yield;continue}this.getSize(mi);let f=l?1:Math.max(1,Math.ceil(mi.x*mi.y/this.frameBudget));h.x=Math.ceil(Math.sqrt(f)),h.y=Math.ceil(f/h.x);let m=this.lowResMode?1:h.x*h.y,p=0,u=t.tileSize;l?this.getSize(u):this.getSize(u).divide(h).ceil();let g=t.getDispatchSize(u.x,u.y);t.seed+=1,e.copyTextureToTexture(this.outputTarget,this.prevOutputTarget),[this.outputTarget,this.prevOutputTarget]=[this.prevOutputTarget,this.outputTarget],t.prevOutputTarget=this.prevOutputTarget,t.outputTarget=this.outputTarget;for(let x=0;x<h.x;x++)for(let T=0;T<h.y;T++)t.offset.set(x,T).multiply(u),this.dispatch(t,g),p=Math.min(p+1,m),this._completedSamples=n,this._tileProgress=p/m,yield;n++}}dispose(){super.dispose(),this.envInfo.dispose(),this.lightsInfo.dispose(),this.kernel.dispose()}};import{Matrix4 as Yo,StorageBufferAttribute as ge,Vector2 as su}from"three/webgpu";import{Vector2 as Ec}from"three";import{StorageBufferAttribute as No}from"three/webgpu";import{uniform as Ao,storage as Po,globalId as Lc}from"three/tsl";import{StructTypeNode as Bt}from"three/webgpu";var pi=class extends Bt{constructor(e,t,r=[]){super(e,t),this.dependencies=r}setup(e){for(let t of this.dependencies)t.build(e);super.setup(e)}},Mo={throughputColor:"vec3f",currentBounce:"uint",resultColor:"vec4f",emission:"vec3f",scatterPdf:"float",scatterColor:"vec3f",minPdf:"float",origin:"vec3f",isFullyTransmissive:"uint",direction:"vec3f",side:"float",normal:"vec3f",objectIndex:"int",barycoord:"vec3f",pixelIndex:"uint",indices:"vec3u",seed:"uint",lightDirection:"vec3f",lightPdf:"float",lightEmission:"vec3f",lightDist:"float",lightBsdf:"vec3f",lightBsdfPdf:"float",rayIntersectionIndex:"int",shadowRayIntersectionIndex:"int",lightType:"int",dist:"float",alphaDepth:"uint",rayStart:"float",maxDist:"float",dispersionWavelength:"float",auxAlbedo:"uint",auxNormal:"uint",subsurfaceBounces:"uint",walkPending:"uint",mediumScattered:"uint"},A=new pi({...Mo,medium:Fe.name},"RayData",[Fe]),Bc=new Bt(Mo).getLength();A.getLength=()=>Bc+Fe.getLength();var oe=new Bt({origin:"vec3f",pixelIndex:"uint",direction:"vec3f",rngIndex:"uint",seed:"uint",maxDist:"float",_alignment0:"uint",_alignment1:"uint"},"TraceQueuedRay"),we=new Bt({barycoord:"vec3f",objectIndex:"int",position:"vec3f",dist:"float",normal:"vec3f",side:"float",indices:"vec3u"},"TraceResult"),ut=new Bt({objectIndex:"int",skippedOcclusion:"float",occlusion:"float"},"ShadowTraceResult"),ne=0,dt=1,Zr=2,ht=0,Be=1,Jr=0,Ee=1,pe=2;var ea=class extends S{constructor(){let e={rayDataStorage:Po(new No(1,1),A),pixelQueue:Po(new No(1,1),"uint"),targetDimensions:Ao(new Ec),frameBudget:Ao(0,"uint"),globalId:Lc},t=d`
			fn compute( targetDimensions: vec2u, frameBudget: u32, globalId: vec3u ) -> void {

				let rayDataStorage = &${e.rayDataStorage};
				let pixelQueue = &${e.pixelQueue};

				if ( globalId.x >= targetDimensions.x || globalId.y >= targetDimensions.y ) {

					return;

				}

				let rayCount = min( frameBudget, arrayLength( rayDataStorage ) );
				let pixelCount = targetDimensions.x * targetDimensions.y;
				if ( globalId.x == 0u && globalId.y == 0u ) {

					pixelQueue[ ${Jr}u ] = 0u;
					pixelQueue[ ${Ee}u ] = select( 0u, pixelCount - rayCount, pixelCount >= rayCount );

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

					pixelQueue[ ${pe}u + pixelIndex - rayCount ] = pixelHash;

				}

			}
		`;super(t(e)),this.defineUniformAccessors(e)}};import{StorageBufferAttribute as gi}from"three/webgpu";import{uniform as Le,storage as xi,textureStore as ta,globalId as kc}from"three/tsl";var ra=class extends S{constructor(){let e={envInfo:{value:null},backgroundInfo:{value:null},lightsInfo:{value:null},prevOutputTarget:ta(de()).toReadOnly(),outputTarget:ta(de()).toWriteOnly(),sampleCountTarget:ta(Se()).toReadWrite(),auxTarget:ta(Z()).toReadWrite(),misEnabled:Le(1,"uint"),rayCount:Le(0,"uint"),maxBounces:Le(5,"uint"),clampDirect:Le(0),clampIndirect:Le(10),transmissiveBackground:Le(rt),accumulateAux:Le(0,"uint"),rayDataStorage:xi(new gi(1,1),A),rayIntersectionsStorage:xi(new gi(1,1),we),shadowRayIntersectionsStorage:xi(new gi(1,1),ut),globalId:kc},t=C("envInfo.value.totalSumNode",e),r=C("envInfo.value.intensityNode",e),a=C("envInfo.value.sampleColor",e),s=C("envInfo.value.sampleDir",e),i=C("envInfo.value.getDirPdf",e),o=C("envInfo.value.getWeight",e),l=C("backgroundInfo.value.sampleColor",e),h=C("lightsInfo.value.countNode",e),n=R("lightsInfo.value.randomLightSample",e),f=R("lightsInfo.value.intersectLightAtIndex",e),m=R("lightsInfo.value.getLightWeight",e),p=R("lightsInfo.value.getLightsWeight",e),u=R("lightsInfo.value.selectLight",e),g=R("lightsInfo.value.isLightVisibleToCamera",e),x=d`

			fn compute(
				// settings
				misEnabled: u32,
				rayCount: u32,
				maxBounces: u32,
				clampDirect: f32,
				clampIndirect: f32,
				transmissiveBackground: u32,
				accumulateAux: u32,

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
				// whole structs are read from the buffer, not the pointer alias, which Safari fails to compile
				let input = ${e.rayDataStorage}[ index ];
				if ( input.rayIntersectionIndex < 0 ) {

					return;

				}

				let indexUV = vec2u( input.pixelIndex >> 16, input.pixelIndex & 0xFFFF );
				${W}( indexUV, input.seed, input.currentBounce + input.alphaDepth + input.subsurfaceBounces );

				// one-sample NEE chooses between the analytic lights and the environment, matched with
				// the megakernel
				let envActive = ${t} > 0.0 && ${r} > 0.0;
				let lightsCount = ${h};
				var envWeight = 0.0;
				if ( envActive ) {

					envWeight = ${o}();

				}

				var resultColor = input.resultColor;
				var throughputColor = input.throughputColor;

				// added last, since a camera ray miss overwrites the pixel with the background
				var lightHits = vec3f( 0.0 );
				var cameraHitLight = false;

				// resolve the previous surface's NEE shadow ray (pre-scatter throughput). The index
				// is negative when no shadow ray was enqueued last frame
				if ( input.shadowRayIntersectionIndex >= 0 && input.lightPdf > 0.0 ) {

					let shadowHit = ${e.shadowRayIntersectionsStorage}[ u32( input.shadowRayIntersectionIndex ) ];
					let occluded = shadowHit.objectIndex >= 0;
					if ( ! occluded ) {

						// env + area lights are also found by bsdf rays, so MIS-weight them. Punctual lights, and lights
						// past the bounce limit, take full weight. Bsdf rays stopped by faces the shadow ray skipped can't
						// find the light, so their share of the weight moves to the light sample
						let isMISWeighted = ${Fr}( input.lightType ) && input.currentBounce < maxBounces;
						let misWeight = select( 1.0, mix( ${se}( input.lightPdf, input.lightBsdfPdf ), 1.0, shadowHit.skippedOcclusion ), isMISWeighted );
						let directLight = throughputColor * input.lightEmission * input.lightBsdf * misWeight * ( 1.0 - shadowHit.occlusion ) / input.lightPdf;
						let contribution = ${M}( directLight, input.currentBounce, clampDirect, clampIndirect );
						resultColor += vec4f( contribution, 0.0 );

					}

				}

				// emission gathered at the previous surface (pre-scatter throughput). Found light clamps
				// at the depth of the segment that found it, as in Cycles, so one less than the current
				let emission = ${M}( throughputColor * input.emission, max( input.currentBounce, 1u ) - 1u, clampDirect, clampIndirect );
				resultColor += vec4f( emission, 0.0 );

				// reconstruct the scatter record staged by MaterialKernel
				var scatterRec: ${Y};
				scatterRec.color = input.scatterColor;
				scatterRec.pdf = input.scatterPdf;

				// the bounce limit, russian roulette, and terminating scatter checks all ran in
				// MaterialKernel, which stages a zeroed pdf and skips the bounce trace when they fire
				var isTerminated = all( throughputColor == vec3f( 0.0 ) ) || input.currentBounce >= maxBounces || ${Ye}( scatterRec );

				// apply the scatter across the traced segment, including the weight of a medium walk
				if ( ! isTerminated ) {

					throughputColor *= scatterRec.color / scatterRec.pdf;

				}

				let isWalking = ! isTerminated && input.walkPending != 0u;
				if ( isWalking ) {

					// the walk hasn't reached a surface yet, so there's no hit to stage. Clear what was
					// resolved and let MediumKernel accumulate the walk's weight
					rayDataStorage[ index ].emission = vec3f( 0.0 );
					rayDataStorage[ index ].lightPdf = 0.0;
					rayDataStorage[ index ].shadowRayIntersectionIndex = - 1;
					rayDataStorage[ index ].scatterColor = vec3f( 1.0 );
					rayDataStorage[ index ].scatterPdf = 1.0;

				} else if ( ! isTerminated ) {

					let hitResult = ${e.rayIntersectionsStorage}[ u32( input.rayIntersectionIndex ) ];
					let didHit = hitResult.objectIndex >= 0;
					let surfaceDist = select( ${Q}, hitResult.dist, didHit );

					// NEE's total weight at the vertex this segment left, for MIS. Camera segments have none,
					// and neither do scatter events in a medium
					let isMISWeighted = misEnabled != 0u && input.currentBounce > 0u && input.mediumScattered == 0u;
					var lightTotalWeight = 0.0;
					if ( isMISWeighted ) {

						lightTotalWeight = ${p}( input.origin ) + envWeight;

					}

					// forward hits on area lights along the traced segment, which starts "rayStart" along the ray.
					// Camera rays only see visibleToCameraRays lights, at full weight
					for ( var li = 0u; li < lightsCount; li ++ ) {

						if ( input.currentBounce == 0u && ! ${g}( li ) ) {

							continue;

						}

						var lightRec: ${V};
						if ( ${f}( input.origin, input.direction, li, &lightRec ) && lightRec.dist > input.rayStart && lightRec.dist < input.rayStart + surfaceDist ) {

							var misWeight = 1.0;
							if ( isMISWeighted ) {

								let selectionPdf = ${m}( li, input.origin ) / lightTotalWeight;
								misWeight = ${se}( input.scatterPdf, lightRec.pdf * selectionPdf );

							}

							lightHits += ${M}( lightRec.emission * throughputColor * misWeight, input.currentBounce, clampDirect, clampIndirect );
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

							let ruv = ${Ke}( ${gr} );
							var selectionPdf = 0.0;
							let lightIndex = ${u}( hitResult.position, envWeight, ruv.x, &selectionPdf );
							if ( selectionPdf > 0.0 ) {

								var lightRec: ${V};
								if ( envActive && lightIndex == lightsCount ) {

									// the environment, sampled from its CDF, as a light of kind ENVIRONMENT
									let envSample = ${s}( ruv.yz );
									lightRec.direction = envSample.direction;
									lightRec.emission = envSample.color;
									lightRec.pdf = envSample.pdf;
									lightRec.dist = ${Q};
									lightRec.lightType = ${Mt};

								} else {

									lightRec = ${n}( lightIndex, hitResult.position, ruv.yz );

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
								misWeight = ${se}( input.scatterPdf, envPdf );

							}

							let environment = ${a}( input.direction ).rgb * throughputColor * misWeight;
							let contribution = ${M}( environment, input.currentBounce, clampDirect, clampIndirect );
							resultColor += vec4f( contribution, 0.0 );

						} else {

							// hit the background
							// support multiple transparent background blending techniques
							let rng = ${k}( ${mr} );
							let bg = ${l}( input.direction, rng );
							if ( input.currentBounce == 0u ) {

								// sample the background directly if this is the primary ray
								let background = ${M}( bg.a * bg.rgb, input.currentBounce, clampDirect, clampIndirect );
								resultColor = vec4f( background, bg.a );

							} else {

								// transmissive ray handling
								let env = ${a}( input.direction );
								let avg = saturate( dot( throughputColor, vec3f( 1.0 / 3.0 ) ) );
								let transparency = ( 1.0 - bg.a ) * avg;

								var misWeight = 1.0;
								if ( misEnabled != 0u && envActive ) {

									let envPdf = ${i}( input.direction );
									misWeight = ${se}( input.scatterPdf, envPdf );

								}

								if ( transmissiveBackground == ${Qr}u ) {

									// display the env map through transmissive surfaces
									let background = ${M}( env.rgb * throughputColor * misWeight, input.currentBounce, clampDirect, clampIndirect );
									resultColor = vec4f(
										resultColor.rgb + background,
										1.0,
									);

								} else if ( transmissiveBackground == ${jr}u ) {

									// fade the background by the throughput color average
									let background = ${M}( bg.a * bg.rgb * throughputColor * misWeight, input.currentBounce, clampDirect, clampIndirect );
									resultColor = vec4f(
										resultColor.rgb + background,
										1.0 - transparency,
									);

								} else {

									// fade the background by the throughput color average, mixing in env lighting
									var light = mix( env.rgb, bg.rgb, bg.a ) * misWeight;
									let background = ${M}( light * throughputColor, input.currentBounce, clampDirect, clampIndirect );
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
				let storedSamples = textureLoad( ${e.sampleCountTarget}, indexUV ).r & ${me}u;

				if ( isTerminated ) {

					// blend the finished sample into the output and free the slot for a new camera ray
					let sampleCount = storedSamples + 1;
					let prevColor = textureLoad( ${e.prevOutputTarget}, colorIndex );
					let blendedColor = ${Rr}( prevColor, resultColor, 1.0 / f32( sampleCount ) );
					textureStore( ${e.sampleCountTarget}, indexUV, vec4( ${at}u | sampleCount ) );
					textureStore( ${e.outputTarget}, colorIndex, blendedColor );

					// the auxiliary images are blended the same way, in the same row order
					if ( accumulateAux != 0u ) {

						var auxPacked: vec3u;
						for ( var layer = 0u; layer < ${L}u; layer ++ ) {

							auxPacked[ layer ] = textureLoad( ${e.auxTarget}, colorIndex, layer ).r;

						}

						let albedo = unpack4x8unorm( input.auxAlbedo ).rgb;
						let normal = unpack4x8snorm( input.auxNormal ).xyz;
						auxPacked = ${lr}( auxPacked, albedo, normal, 1.0 / f32( sampleCount ) );
						for ( var layer = 0u; layer < ${L}u; layer ++ ) {

							textureStore( ${e.auxTarget}, colorIndex, layer, vec4u( auxPacked[ layer ] ) );

						}

					}

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
		`;super(x(e)),this.defineUniformAccessors(e)}};import{Vector2 as Hc}from"three";import{StorageBufferAttribute as Et}from"three/webgpu";import{uniform as ke,storage as Lt,textureStore as zc,globalId as Uc}from"three/tsl";var aa=class extends S{constructor(){let e={material:{value:null},seed:ke(0,"uint"),targetDimensions:ke(new Hc),maxSamples:ke(0,"uint"),rayCount:ke(0,"uint"),filterGlossy:ke(1),maxTransparentBounces:ke(5,"uint"),maxBounces:ke(5,"uint"),sampleCountTarget:zc(Se()).toReadWrite(),rayDataStorage:Lt(new Et(1,1),A),rayQueue:Lt(new Et(1,1),oe),shadowRayQueue:Lt(new Et(1,1),oe),queueCounters:Lt(new Et(1,1),"uint").toAtomic(),pixelQueue:Lt(new Et(1,1),"uint").toAtomic(),globalId:Uc},t=N("bvhData.fns.getCameraRay"),r=N("bvhData.fns.sampleTrianglePoint"),a=N("bvhData.fns.getSurfaceRecord"),s=R("material.value.bsdfSample",e),i=R("material.value.bsdfEvalPdf",e),o=E("bvhData.storage.materials"),l=E("bvhData.storage.transforms"),h=d`

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
				let queueCounters = &${e.queueCounters};
				let pixelQueue = &${e.pixelQueue};

				// bound by "rayCount" rather than the pool length. The dispatch rounds up to the
				// workgroup size and those extra slots hold a zeroed pixel index
				let index = globalId.x;
				if ( index >= rayCount ) {

					return;

				}

				// whole structs are read from the buffer, not the pointer alias, which Safari fails to compile
				let input = ${e.rayDataStorage}[ index ];
				if ( input.objectIndex < 0 ) {

					// the slot's path has terminated: recycle the pixel through the overflow queue and
					// generate a fresh camera ray
					var pixelIndex = input.pixelIndex;
					let elementCount = atomicLoad( &pixelQueue[ ${Ee}u ] );
					if ( elementCount > 0u ) {

						// TODO: If we've pulled off a pixel that's already finished we currently just
						// write a no-op ray, wasting a frame. It may be better to iterate over a few
						// points in the queue to see if we can find one we can use.
						let queueIndex = atomicAdd( &pixelQueue[ ${Jr}u ], 1u ) % elementCount;
						pixelIndex = atomicExchange( &pixelQueue[ ${pe}u + queueIndex ], pixelIndex );

					}

					let indexUV = vec2u( pixelIndex >> 16, pixelIndex & 0xFFFF );

					// skip the pixel if it has hit the sample limit
					let combinedField = textureLoad( ${e.sampleCountTarget}, indexUV ).r;
					let samples = ( ${me}u & combinedField );
					let isComplete = maxSamples != 0u && samples >= maxSamples;

					if ( isComplete ) {

						rayDataStorage[ index ].pixelIndex = pixelIndex;
						rayDataStorage[ index ].rayIntersectionIndex = - 1;
						rayDataStorage[ index ].shadowRayIntersectionIndex = - 1;
						return;

					}

					${W}( indexUV, seed + samples, 0 );

					let uv = vec2f( indexUV ) / vec2f( targetDimensions );
					let jitteredUv = uv + ${k}( ${fr} ) / vec2f( targetDimensions );
					var ray: ${v};
					if ( ! ${t}( jitteredUv, vec2f( targetDimensions ), &ray ) ) {

						// the camera declined the pixel, so leave the slot dormant for this round. With a
						// sample cap the pixel counts as finished, since it will never take a sample
						// TODO: same as above - this work is a bit wasteful and leaves slots empty for
						// a frame. Is it possible to quickly skip rays outside the mask or are finished?
						if ( maxSamples != 0u ) {

							textureStore( ${e.sampleCountTarget}, indexUV, vec4( ( combinedField & ~${me}u ) | maxSamples ) );

						}

						rayDataStorage[ index ].pixelIndex = pixelIndex;
						rayDataStorage[ index ].rayIntersectionIndex = - 1;
						rayDataStorage[ index ].shadowRayIntersectionIndex = - 1;
						return;

					}

					ray.direction = normalize( ray.direction );

					let rayIndex = atomicAdd( &queueCounters[ ${ne}u ], 1u );
					rayQueue[ rayIndex ].origin = ray.origin;
					rayQueue[ rayIndex ].direction = ray.direction;
					rayQueue[ rayIndex ].pixelIndex = pixelIndex;
					rayQueue[ rayIndex ].rngIndex = 0u;
					rayQueue[ rayIndex ].seed = seed + samples;
					rayQueue[ rayIndex ].maxDist = ray.maxDist;

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
					rayDataStorage[ index ].rayStart = 0.0;
					rayDataStorage[ index ].maxDist = ray.maxDist;
					rayDataStorage[ index ].rayIntersectionIndex = i32( rayIndex );
					rayDataStorage[ index ].shadowRayIntersectionIndex = - 1;
					rayDataStorage[ index ].dispersionWavelength = - mix( ${et}.0, ${tt}.0, ${ae}( ${vr} ) );
					rayDataStorage[ index ].auxAlbedo = 0u;
					rayDataStorage[ index ].auxNormal = 0u;
					rayDataStorage[ index ].subsurfaceBounces = 0u;
					rayDataStorage[ index ].walkPending = 0u;
					rayDataStorage[ index ].mediumScattered = 0u;
					rayDataStorage[ index ].medium.inside = 0u;

					// write the active params & dispatched flag
					textureStore( ${e.sampleCountTarget}, indexUV, vec4( ${xo}u | ${at}u | samples ) );

				} else if ( input.walkPending == 0u ) {

					// evaluate the surface staged by LogicKernel. Paths still walking a medium have none
					let indexUV = vec2u( input.pixelIndex >> 16, input.pixelIndex & 0xFFFF );
					${W}( indexUV, input.seed, input.currentBounce + input.alphaDepth + input.subsurfaceBounces );

					// the medium the path is in, which the bsdf sample may enter or exit
					var medium = ${Ar}( input.medium );
					let segmentInMedium = medium.inside;

					let objectInfo = ${l}[ u32( input.objectIndex ) ];
					var materialInfo = ${o}[ objectInfo.materialIndex ];

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
					let passesThrough = ${ae}( ${Sr} ) > surface.opacity;
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

						let alphaOrigin = ${he}( vertexData.position.xyz, input.direction, input.normal );
						if ( segmentInMedium ) {

							// inside a medium, MediumKernel walks on past the surface, from the surface
							rayDataStorage[ index ].walkPending = 1u;
							rayDataStorage[ index ].origin = alphaOrigin;
							rayDataStorage[ index ].rayStart = 0.0;

						} else {

							let alphaIndex = atomicAdd( &queueCounters[ ${ne}u ], 1u );
							rayQueue[ alphaIndex ].origin = alphaOrigin;
							rayQueue[ alphaIndex ].direction = input.direction;
							rayQueue[ alphaIndex ].pixelIndex = input.pixelIndex;
							rayQueue[ alphaIndex ].rngIndex = input.currentBounce + input.alphaDepth + 1u + input.subsurfaceBounces;
							rayQueue[ alphaIndex ].seed = input.seed;
							// the origin advanced to the hit point, so the remaining budget shrinks by the
							// distance already traced
							rayQueue[ alphaIndex ].maxDist = max( input.maxDist - input.dist, 0.0 );
							rayDataStorage[ index ].rayIntersectionIndex = i32( alphaIndex );

							// the ray keeps its origin, and only the queued traversal starts past the surface
							rayDataStorage[ index ].rayStart = input.rayStart + input.dist;

						}

						// the surface is skipped, so no scatter or emission is staged for LogicKernel.
						// "pdf" is left alone so the previous scatter still weights the forward MIS,
						// and "bsdf" matches it so applying the scatter leaves the throughput as is.
						rayDataStorage[ index ].alphaDepth = input.alphaDepth + 1u;
						rayDataStorage[ index ].emission = vec3f( 0.0 );
						rayDataStorage[ index ].scatterColor = vec3f( input.scatterPdf );
						rayDataStorage[ index ].lightPdf = 0.0;
						rayDataStorage[ index ].shadowRayIntersectionIndex = - 1;
						return;

					}

					// apply the hero wavelength to dispersive surfaces, folding the spectral weight
					// into the throughput at the path's first dispersive interaction
					var throughputColor = input.throughputColor;
					let isDispersive = materialInfo.dispersion > 0.0 && surface.ior > 1.0 && surface.transmission > 0.0 && ! surface.thinWall;
					if ( isDispersive ) {

						let wavelength = abs( input.dispersionWavelength );
						${Vr}( &surface, materialInfo.dispersion, wavelength );
						if ( input.dispersionWavelength < 0.0 ) {

							rayDataStorage[ index ].dispersionWavelength = wavelength;
							throughputColor *= ${Wr}( wavelength );
							rayDataStorage[ index ].throughputColor = throughputColor;

						}

					}

					// attenuate the light transmitted through the volume when exiting a backface so
					// the surface's emission and NEE resolve against the attenuated throughput. MediumKernel
					// already applied a scattering medium's transmittance
					if ( input.side < 0.0 && materialInfo.transmission > 0.0 && ! segmentInMedium ) {

						throughputColor *= ${Or}( input.dist, materialInfo.attenuationColor, materialInfo.attenuationDistance );
						rayDataStorage[ index ].throughputColor = throughputColor;

					}

					// sample the next bounce direction and stage the scatter state for LogicKernel
					var scatterRec = ${s}( view, surface );
					let newBounce = input.currentBounce + 1u;

					// The first surface the path scatters off fills the denoiser's auxiliary images. Until one is
					// found the last mirror or transmission hit stands in, for paths that reach the environment.
					// The albedo is tinted by the throughput of the surfaces looked past to reach it. The packed
					// albedo's alpha marks the surface found
					let auxFound = unpack4x8unorm( input.auxAlbedo ).a != 0.0;
					if ( ! auxFound ) {

						let isAuxSurface = ${nr}( surface, scatterRec );
						let auxAlbedo = saturate( throughputColor * surface.color );
						rayDataStorage[ index ].auxAlbedo = pack4x8unorm( vec4f( auxAlbedo, select( 0.0, 1.0, isAuxSurface ) ) );
						rayDataStorage[ index ].auxNormal = pack4x8snorm( vec4f( surface.normal, 0.0 ) );

					}

					// decide termination now so finished paths skip the bounce trace entirely - a
					// zeroed pdf reads as a terminating scatter in LogicKernel, which still resolves
					// the surface's emission and NEE before freeing the slot
					var isTerminated = newBounce >= maxBounces || all( scatterRec.color == vec3f( 0.0 ) ) || ${Ye}( scatterRec );

					// russian roulette early out:
					// Matches Cycles path_state_continuation_probability in integrator/path_state.h
					if ( ! isTerminated && newBounce >= 3u ) {

						let rrThroughput = throughputColor * scatterRec.color / scatterRec.pdf;
						let rrProb = saturate( sqrt( max( max( rrThroughput.r, rrThroughput.g ), rrThroughput.b ) ) );
						isTerminated = rrProb <= 0.0 || ${ae}( ${xr} ) > rrProb;
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
					rayDataStorage[ index ].mediumScattered = 0u;

					// As in "KHR_materials_scatter", the surface bsdf is the medium's boundary: refracting out
					// ends the walk, reflecting continues it
					if ( segmentInMedium && u32( input.objectIndex ) == medium.object && input.side < 0.0 && scatterRec.isTransmissive ) {

						medium.inside = false;

					}

					// refracting into a front face of a scattering material starts a random walk inside it
					if ( scatterRec.isTransmissive && ! surface.thinWall && input.side > 0.0 ) {

						let entered = ${Pr}( materialInfo, u32( input.objectIndex ) );
						if ( entered.inside ) {

							medium = entered;

						}

					}

					// keep the medium the path left or entered
					if ( segmentInMedium || medium.inside ) {

						// a whole struct is written to the buffer, not through the pointer alias, which Safari fails to compile
						${e.rayDataStorage}[ index ].medium = ${so}( medium );

					}

					// the NEE shadow ray below still resolves the surface's direct light, so only
					// the bounce segment is skipped for finished paths. Inside a medium, MediumKernel walks it
					if ( ! isTerminated && medium.inside ) {

						rayDataStorage[ index ].walkPending = 1u;
						rayDataStorage[ index ].origin = ${he}( vertexData.position.xyz, scatterRec.direction, input.normal );
						rayDataStorage[ index ].direction = scatterRec.direction;
						rayDataStorage[ index ].rayStart = 0.0;

					} else if ( ! isTerminated ) {

						let rayIndex = atomicAdd( &queueCounters[ ${ne}u ], 1u );
						rayQueue[ rayIndex ].origin = ${he}( vertexData.position.xyz, scatterRec.direction, input.normal );
						rayQueue[ rayIndex ].direction = scatterRec.direction;
						rayQueue[ rayIndex ].pixelIndex = input.pixelIndex;
						rayQueue[ rayIndex ].rngIndex = newBounce + input.alphaDepth + input.subsurfaceBounces;
						rayQueue[ rayIndex ].seed = input.seed;
						rayQueue[ rayIndex ].maxDist = 0.0;
						rayDataStorage[ index ].rayIntersectionIndex = i32( rayIndex );

						rayDataStorage[ index ].origin = rayQueue[ rayIndex ].origin;
						rayDataStorage[ index ].direction = scatterRec.direction;
						rayDataStorage[ index ].rayStart = 0.0;

					}

					// evaluate the bsdf toward the light LogicKernel selected and enqueue the shadow ray.
					// the light pdf will be 0 if NEE is disabled.
					var lightPdf = input.lightPdf;
					if ( lightPdf > 0.0 ) {

						let evalRec = ${i}( view, input.lightDirection, surface );
						if ( evalRec.pdf > 0.0 ) {

							rayDataStorage[ index ].lightBsdf = evalRec.color;
							rayDataStorage[ index ].lightBsdfPdf = evalRec.pdf;

							let shadowIndex = atomicAdd( &queueCounters[ ${dt}u ], 1u );
							shadowRayQueue[ shadowIndex ].origin = ${he}( vertexData.position.xyz, input.lightDirection, input.normal );
							shadowRayQueue[ shadowIndex ].direction = input.lightDirection;
							shadowRayQueue[ shadowIndex ].pixelIndex = input.pixelIndex;
							shadowRayQueue[ shadowIndex ].rngIndex = input.currentBounce + input.alphaDepth + input.subsurfaceBounces;
							shadowRayQueue[ shadowIndex ].seed = input.seed;
							shadowRayQueue[ shadowIndex ].maxDist = input.lightDist * ( 1.0 - ${$r} );
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
		`;super(h(e)),this.defineUniformAccessors(e)}};import{StorageBufferAttribute as vi}from"three/webgpu";import{storage as yi,globalId as Oc}from"three/tsl";var ia=class extends S{constructor(){let e={rayQueue:yi(new vi(1,1),oe),queueCounters:yi(new vi(1,1),"uint"),rayIntersectionsStorage:yi(new vi(1,1),we),globalId:Oc},t=E("bvhData.fns.raycastFirstHit.outputType"),r=E("bvhData.fns.raycastFirstHit"),a=d`

			fn compute( globalId: vec3u ) -> void {

				let rayQueue = &${e.rayQueue};
				let queueCounters = &${e.queueCounters};
				let rayIntersectionsStorage = &${e.rayIntersectionsStorage};

				let index = globalId.x;
				if ( index >= queueCounters[ ${ne}u ] ) {

					return;

				}

				// whole structs are read from the buffer, not the pointer alias, which Safari fails to compile
				let queuedRay = ${e.rayQueue}[ index ];
				let indexUV = vec2u( queuedRay.pixelIndex >> 16, queuedRay.pixelIndex & 0xFFFF );
				${W}( indexUV, queuedRay.seed, queuedRay.rngIndex );

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
		`;super(a(e)),this.defineUniformAccessors(e)}};import{StorageBufferAttribute as bi}from"three/webgpu";import{storage as Si,globalId as Vc}from"three/tsl";var sa=class extends S{constructor(){let e={shadowRayQueue:Si(new bi(1,1),oe),queueCounters:Si(new bi(1,1),"uint"),shadowRayIntersectionsStorage:Si(new bi(1,1),ut),globalId:Vc},t=E("bvhData.fns.raycastFirstHit.outputType"),r=E("bvhData.fns.raycastShadow"),a=d`

			fn compute( globalId: vec3u ) -> void {

				let shadowRayQueue = &${e.shadowRayQueue};
				let queueCounters = &${e.queueCounters};
				let shadowRayIntersectionsStorage = &${e.shadowRayIntersectionsStorage};

				let index = globalId.x;
				if ( index >= queueCounters[ ${dt}u ] ) {

					return;

				}

				// whole structs are read from the buffer, not the pointer alias, which Safari fails to compile
				let queuedRay = ${e.shadowRayQueue}[ index ];
				let indexUV = vec2u( queuedRay.pixelIndex >> 16, queuedRay.pixelIndex & 0xFFFF );
				${W}( indexUV, queuedRay.seed, queuedRay.rngIndex );

				let ray = Ray( queuedRay.origin, queuedRay.direction, queuedRay.maxDist );
				var hitResult: ${t};
				let occluded = ${r}( ray, &hitResult );
				shadowRayIntersectionsStorage[ index ].objectIndex = select( - 1, i32( hitResult.objectIndex ), occluded );
				shadowRayIntersectionsStorage[ index ].skippedOcclusion = hitResult.skippedOcclusion;
				shadowRayIntersectionsStorage[ index ].occlusion = hitResult.occlusion;

			}
		`;super(a(e)),this.defineUniformAccessors(e)}};import{StorageBufferAttribute as Ti}from"three/webgpu";import{storage as wi,uniform as Ii,globalId as Wc}from"three/tsl";var oa=class extends S{constructor(){let e={maxSubsurfaceBounces:Ii(256,"uint"),stepsPerPass:Ii(16,"uint"),rayCount:Ii(0,"uint"),rayDataStorage:wi(new Ti(1,1),A),mediumQueue:wi(new Ti(1,1),"uint"),rayIntersectionsStorage:wi(new Ti(1,1),we),globalId:Wc},t=E("bvhData.fns.raycastFirstHit.outputType"),r=E("bvhData.fns.raycastFirstHit"),a=d`

			fn compute( maxSubsurfaceBounces: u32, stepsPerPass: u32, rayCount: u32, globalId: vec3u ) -> void {

				let rayDataStorage = &${e.rayDataStorage};
				let mediumQueue = &${e.mediumQueue};
				let rayIntersectionsStorage = &${e.rayIntersectionsStorage};

				if ( globalId.x >= mediumQueue[ ${ht}u ] ) {

					return;

				}

				let index = mediumQueue[ ${Be}u + globalId.x ];
				// whole structs are read from the buffer, not the pointer alias, which Safari fails to compile
				let input = ${e.rayDataStorage}[ index ];
				let medium = ${Ar}( input.medium );

				let indexUV = vec2u( input.pixelIndex >> 16, input.pixelIndex & 0xFFFF );
				${W}( indexUV, input.seed, input.currentBounce + input.alphaDepth + input.subsurfaceBounces );

				var ray = Ray( input.origin, input.direction, 0.0 );
				var weight = input.scatterColor;
				var subsurfaceBounces = input.subsurfaceBounces;
				var hasScattered = false;
				var isFinished = false;
				var isTerminated = false;

				for ( var i = 0u; i < stepsPerPass; i ++ ) {

					// only trace up to the sampled scatter event
					let channelPdf = ${Br}( input.throughputColor * weight, medium.albedo );
					let scatterDist = ${Er}( medium, channelPdf, ${k}( ${yr} ) );
					ray.maxDist = scatterDist;

					var hitResult: ${t};
					let didHit = ${r}( ray, &hitResult );
					let surfaceDist = select( ${Q}, hitResult.dist, didHit );

					let scattered = scatterDist < surfaceDist;
					let segmentDist = select( surfaceDist, scatterDist, scattered );
					let transmittance = exp( - medium.extinction * segmentDist );
					let distancePdf = dot( channelPdf, ${Lr}( medium, segmentDist, scattered ) );
					if ( distancePdf <= 0.0 ) {

						isTerminated = true;
						break;

					}

					if ( ! scattered ) {

						// reaching the surface, weighted by the chance of not scattering before it
						weight *= transmittance / distancePdf;

						// The hit fills the ray results from the back, by the walk's medium queue position, while the
						// traced rays fill them from the front. A path slot walking a medium queued no ray this round,
						// so the two ranges never exceed the slot count or overlap
						let resultIndex = rayCount - 1u - globalId.x;
						rayIntersectionsStorage[ resultIndex ].barycoord = hitResult.barycoord;
						// a walk that leaves without hitting anything is a miss, as in the trace kernel
						rayIntersectionsStorage[ resultIndex ].objectIndex = select( - 1, i32( hitResult.objectIndex ), didHit );
						rayIntersectionsStorage[ resultIndex ].position = ray.origin + ray.direction * hitResult.dist;
						rayIntersectionsStorage[ resultIndex ].dist = hitResult.dist;
						rayIntersectionsStorage[ resultIndex ].normal = hitResult.normal.xyz;
						rayIntersectionsStorage[ resultIndex ].side = hitResult.side;
						rayIntersectionsStorage[ resultIndex ].indices = hitResult.indices.xyz;
						rayDataStorage[ index ].rayIntersectionIndex = i32( resultIndex );

						isFinished = true;
						break;

					}

					weight *= medium.albedo * medium.extinction * transmittance / distancePdf;
					ray.origin += ray.direction * scatterDist;
					ray.direction = ${_r}( ray.direction, medium.anisotropy, ${k}( ${br} ) );
					hasScattered = true;

					// capped separately from bounces, and ends once the throughput is negligible
					subsurfaceBounces ++;
					let throughput = input.throughputColor * weight / input.scatterPdf;
					if ( subsurfaceBounces >= maxSubsurfaceBounces || max( max( throughput.r, throughput.g ), throughput.b ) < ${Nr} ) {

						isTerminated = true;
						break;

					}

					${je}();

				}

				// a zeroed pdf terminates the path in LogicKernel
				rayDataStorage[ index ].scatterColor = weight;
				rayDataStorage[ index ].scatterPdf = select( input.scatterPdf, 0.0, isTerminated );
				rayDataStorage[ index ].origin = ray.origin;
				rayDataStorage[ index ].direction = ray.direction;
				rayDataStorage[ index ].subsurfaceBounces = subsurfaceBounces;
				rayDataStorage[ index ].walkPending = select( 1u, 0u, isFinished || isTerminated );
				if ( hasScattered ) {

					rayDataStorage[ index ].mediumScattered = 1u;
					rayDataStorage[ index ].isFullyTransmissive = 0u;

				}

			}
		`;super(a(e)),this.defineUniformAccessors(e)}};import{StorageBufferAttribute as Bo}from"three/webgpu";import{uniform as qc,storage as Eo,globalId as Gc}from"three/tsl";var na=class extends S{constructor(){let e={rayCount:qc(0,"uint"),rayDataStorage:Eo(new Bo(1,1),A).toReadOnly(),mediumQueue:Eo(new Bo(1,1),"uint").toAtomic(),globalId:Gc},t=d`

			fn compute( rayCount: u32, globalId: vec3u ) -> void {

				let rayDataStorage = &${e.rayDataStorage};
				let mediumQueue = &${e.mediumQueue};

				let index = globalId.x;
				if ( index >= rayCount ) {

					return;

				}

				if ( rayDataStorage[ index ].walkPending != 0u && rayDataStorage[ index ].objectIndex >= 0 ) {

					let queueIndex = atomicAdd( &mediumQueue[ ${ht}u ], 1u );
					atomicStore( &mediumQueue[ ${Be}u + queueIndex ], index );

				}

			}
		`;super(t(e)),this.defineUniformAccessors(e)}};import{IndirectStorageBufferAttribute as Qc,StorageBufferAttribute as jc}from"three/webgpu";import{storage as Lo}from"three/tsl";var ft=class extends S{constructor(e=ne,t=64){let r={queueCounters:Lo(new jc(1,1),"uint").toAtomic(),outputDispatch:Lo(new Qc(3,1),"u32").setName("outputDispatch")},a=d`
			fn compute() -> void {

				let queueCounters = &${r.queueCounters};
				let outputDispatch = &${r.outputDispatch};

				let queueLength = atomicLoad( &queueCounters[ ${e}u ] );
				outputDispatch[ 0 ] = ( queueLength + ${t-1}u ) / ${t}u;
				outputDispatch[ 1 ] = 1u;
				outputDispatch[ 2 ] = 1u;

			}
		`;super(a(r)),this.defineUniformAccessors(r)}};import{StorageBufferAttribute as ko}from"three/webgpu";import{uniform as _i,storage as Ho,globalId as Kc}from"three/tsl";var la=class extends S{constructor(){let e={rayDataStorage:Ho(new ko(1,1),A),pixelQueue:Ho(new ko(1,1),"uint").toAtomic(),start:_i(0,"uint"),end:_i(0,"uint"),addingSlots:_i(0,"uint"),globalId:Kc},t=d`
			fn compute( start: u32, end: u32, addingSlots: u32, globalId: vec3u ) -> void {

				let rayDataStorage = &${e.rayDataStorage};
				let pixelQueue = &${e.pixelQueue};

				let index = start + globalId.x;
				if ( index >= end ) {

					return;

				}

				if ( addingSlots == 0u ) {

					// slots being removed hand their pixel back before the pool is discarded
					let queueIndex = atomicAdd( &pixelQueue[ ${Ee}u ], 1u );
					atomicStore( &pixelQueue[ ${pe}u + queueIndex ], rayDataStorage[ index ].pixelIndex );

				} else {

					// the pool never exceeds the pixel count, so the queue holds enough for every new slot
					let previousCount = atomicSub( &pixelQueue[ ${Ee}u ], 1u );
					rayDataStorage[ index ].pixelIndex = atomicLoad( &pixelQueue[ ${pe}u + previousCount - 1u ] );
					rayDataStorage[ index ].resultColor = vec4f( 0.0 );
					rayDataStorage[ index ].throughputColor = vec3f( 0.0 );
					rayDataStorage[ index ].objectIndex = - 1;
					rayDataStorage[ index ].alphaDepth = 0u;
					rayDataStorage[ index ].rayIntersectionIndex = - 1;
					rayDataStorage[ index ].shadowRayIntersectionIndex = - 1;

				}

			}
		`;super(t(e)),this.defineUniformAccessors(e)}};import{IndirectStorageBufferAttribute as Xc}from"three/webgpu";import{storage as Yc,globalId as Zc}from"three/tsl";var ca=class extends S{constructor(e={}){let{type:t="u32"}=e,r={globalId:Zc,outputTarget:Yc(new Xc(1,1),t)},a=d`
			fn compute( globalId: vec3u ) -> void {

				${r.outputTarget}[ globalId.x ] = 0;

			}
		`;super(a(r)),this.defineUniformAccessors({target:r.outputTarget})}};import{StorageBufferAttribute as zo}from"three/webgpu";import{uniform as Jc,storage as Uo,globalId as eu}from"three/tsl";var ua=class extends S{constructor(e){let t={source:Uo(new zo(1,1),e).toReadOnly(),target:Uo(new zo(1,1),e),count:Jc(0,"uint"),globalId:eu},r=d`
			fn compute( count: u32, globalId: vec3u ) -> void {

				let index = globalId.x;
				if ( index >= count ) {

					return;

				}

				${t.target}[ index ] = ${t.source}[ index ];

			}
		`;super(r(t)),this.defineUniformAccessors(t)}};import{StorageBufferAttribute as Oo,StorageTexture as tu,StructTypeNode as ru}from"three/webgpu";import{storage as Vo,textureStore as au,globalId as iu}from"three/tsl";var Wo=0,qo=1,Go=2,Qo=3,jo=4,Ri=5,Ko=4294967296,Xo=new ru({minSamples:{type:"uint",atomic:!0},maxSamples:{type:"uint",atomic:!0},totalLo:{type:"uint",atomic:!0},totalHi:{type:"uint",atomic:!0},pixelCount:{type:"uint",atomic:!0}},"SampleCounters"),da=class extends S{constructor(){let e={counters:Vo(new Oo(1,1),Xo)},t=d`
			fn compute() -> void {

				atomicStore( &${e.counters}[ 0 ].minSamples, 0xFFFFFFFFu );
				atomicStore( &${e.counters}[ 0 ].maxSamples, 0u );
				atomicStore( &${e.counters}[ 0 ].totalLo, 0u );
				atomicStore( &${e.counters}[ 0 ].totalHi, 0u );
				atomicStore( &${e.counters}[ 0 ].pixelCount, 0u );

			}
		`;super(t(e)),this.defineUniformAccessors(e)}},ha=class extends S{constructor(){let e={globalId:iu,counters:Vo(new Oo(1,1),Xo),sampleCountTarget:au(new tu(1,1)).toReadOnly()},t=d`
			fn compute( globalId: vec3u ) -> void {

				let targetDimensions = textureDimensions( ${e.sampleCountTarget} );
				if ( globalId.x >= targetDimensions.x || globalId.y >= targetDimensions.y ) {

					return;

				}

				// pixels without a camera ray aren't part of the image, so skip rather than count zero
				let combinedField = textureLoad( ${e.sampleCountTarget}, globalId.xy ).r;
				if ( ( combinedField & ${at}u ) == 0u ) {

					return;

				}

				let samples = combinedField & ${me}u;

				atomicMin( &${e.counters}[ 0 ].minSamples, samples );
				atomicMax( &${e.counters}[ 0 ].maxSamples, samples );
				atomicAdd( &${e.counters}[ 0 ].pixelCount, 1u );

				// the sum overflowed if it came out smaller than the value already there, so carry
				// the wrap into "totalHi"
				let previousTotal = atomicAdd( &${e.counters}[ 0 ].totalLo, samples );
				if ( previousTotal + samples < previousTotal ) {

					atomicAdd( &${e.counters}[ 0 ].totalHi, 1u );

				}

			}
		`;super(t(e)),this.defineUniformAccessors(e)}};var ou=134217728,Zo=Math.floor(ou/(A.getLength()*4)),nu=5,kt=class extends ct{constructor(e){super(e),this.seed=0,this.mediumStepsPerPass=16,this.envInfo=new it,this.backgroundInfo=new st,this.lightsInfo=new nt,this.rayCount=0,this.rayDataStorage=null,this.rayQueue=null,this.shadowRayQueue=null,this.queueCounters=new ge(new Uint32Array(Zr),1),this.queueCounters.name="Queue Counters",this.rayIntersectionsStorage=null,this.shadowRayIntersectionsStorage=null,this.mediumQueue=null,this.pixelQueue=null,this.sampleCountersStorage=new ge(new Uint32Array(Ri),Ri),this.sampleCountersStorage.name="Sample Counters",this._samplesPromise=null,this.populatePixelIndicesKernel=new ea().setWorkgroupSize(8,8,1),this.logicKernel=new ra().setWorkgroupSize(64,1,1),this.materialKernel=new aa().setWorkgroupSize(64,1,1),this.traceRayKernel=new ia().setWorkgroupSize(64,1,1),this.traceShadowRayKernel=new sa().setWorkgroupSize(64,1,1),this.mediumKernel=new oa().setWorkgroupSize(64,1,1),this.queueMediumWalksKernel=new na().setWorkgroupSize(64,1,1),this.rayDispatchConverter=new ft(ne).setWorkgroupSize(1,1,1),this.shadowDispatchConverter=new ft(dt).setWorkgroupSize(1,1,1),this.mediumDispatchConverter=new ft(ht).setWorkgroupSize(1,1,1),this.primeSampleCountersKernel=new da().setWorkgroupSize(1,1,1),this.tallySampleCountsKernel=new ha().setWorkgroupSize(8,8,1),this.resetSlotsKernel=new la().setWorkgroupSize(64,1,1),this.copyRayDataKernel=new ua(A).setWorkgroupSize(64,1,1),this.logicKernel.envInfo=this.envInfo,this.logicKernel.backgroundInfo=this.backgroundInfo,this.logicKernel.lightsInfo=this.lightsInfo,this.zeroDispatchKernel=new ca().setWorkgroupSize(1,1,1)}resetSeed(){this.seed=0}reset(){super.reset(),this._samplesPromise=null}setBVHData(e){this.materialKernel.context.bvhData=e,this.materialKernel.needsUpdate=!0,this.traceRayKernel.context.bvhData=e,this.traceRayKernel.needsUpdate=!0,this.traceShadowRayKernel.context.bvhData=e,this.traceShadowRayKernel.needsUpdate=!0,this.mediumKernel.context.bvhData=e,this.mediumKernel.needsUpdate=!0,this.reset()}rebuild(){super.rebuild(),this.materialKernel.needsUpdate=!0,this.reset()}setRandom(e){this.logicKernel.context.random=e,this.logicKernel.needsUpdate=!0,this.materialKernel.context.random=e,this.materialKernel.needsUpdate=!0,this.traceRayKernel.context.random=e,this.traceRayKernel.needsUpdate=!0,this.traceShadowRayKernel.context.random=e,this.traceShadowRayKernel.needsUpdate=!0,this.mediumKernel.context.random=e,this.mediumKernel.needsUpdate=!0,this.reset()}setMaterial(e){this.materialKernel.material=e.getData(),this.materialKernel.needsUpdate=!0,this.reset()}setFilterGlossy(e){this.materialKernel.filterGlossy=e===0?zr:1/e,this.reset()}setClamping(e,t){this.logicKernel.clampDirect=e,this.logicKernel.clampIndirect=t,this.reset()}setTransmissiveBackground(e){this.logicKernel.transmissiveBackground=e,this.reset()}setEnvironment(e){this.envInfo.updateFrom(e)}setLights(e){this.lightsInfo.updateFrom(this.renderer,e),this.reset()}setEnvironmentParams(e,t){let{envInfo:r}=this,a=new Yo().makeRotationFromEuler(t).invert();r.rotationNode.value.setFromMatrix4(a),r.intensityNode.value=e}setMultipleImportanceSampling(e){this.logicKernel.misEnabled=e?1:0,this.reset()}setBackground(e){let{backgroundInfo:t}=this;t.dispose(),t.map=e}setBackgroundParams(e,t,r){let{backgroundInfo:a}=this,s=new Yo().makeRotationFromEuler(t).invert();a.rotationNode.value.copy(s),a.intensity=e,a.blur=r}dispose(){super.dispose(),this.envInfo.dispose(),this.lightsInfo.dispose(),this.rayDataStorage?.dispose(),this.rayQueue?.dispose(),this.shadowRayQueue?.dispose(),this.queueCounters.dispose(),this.rayIntersectionsStorage?.dispose(),this.shadowRayIntersectionsStorage?.dispose(),this.mediumQueue?.dispose(),this.sampleCountersStorage.dispose(),this.pixelQueue?.dispose(),this.rayDispatchConverter.outputDispatch.dispose(),this.shadowDispatchConverter.outputDispatch.dispose(),this.mediumDispatchConverter.outputDispatch.dispose(),this.populatePixelIndicesKernel.dispose(),this.logicKernel.dispose(),this.materialKernel.dispose(),this.traceRayKernel.dispose(),this.traceShadowRayKernel.dispose(),this.mediumKernel.dispose(),this.queueMediumWalksKernel.dispose(),this.rayDispatchConverter.dispose(),this.shadowDispatchConverter.dispose(),this.mediumDispatchConverter.dispose(),this.primeSampleCountersKernel.dispose(),this.tallySampleCountsKernel.dispose(),this.resetSlotsKernel.dispose(),this.copyRayDataKernel.dispose(),this.zeroDispatchKernel.dispose()}_updatePixelQueue(e,t){let r=pe+Math.max(e*t,1);(!this.pixelQueue||this.pixelQueue.array.length<r)&&(this.pixelQueue?.dispose(),this.pixelQueue=new ge(new Float32Array(r),r),this.pixelQueue.name="Pixel Queue",this.materialKernel.pixelQueue=this.pixelQueue,this.populatePixelIndicesKernel.pixelQueue=this.pixelQueue,this.resetSlotsKernel.pixelQueue=this.pixelQueue)}_resizePool(e,t){let{resetSlotsKernel:r,copyRayDataKernel:a}=this,s=this.rayCount,i=Math.min(s,t),o=Math.min(e,t);r.pixelQueue=this.pixelQueue,o<i&&(r.rayDataStorage=this.rayDataStorage,r.start=o,r.end=i,r.addingSlots=!1,this.dispatch(r,r.getDispatchSize(i-o,1,1)));let l=new ge(e,A.getLength());l.name="Ray Data";let h=new ge(e,oe.getLength());h.name="Ray Queue";let n=new ge(e,oe.getLength());n.name="Shadow Ray Queue";let f=new ge(e,we.getLength());f.name="Ray Intersections";let m=new ge(e,ut.getLength());m.name="Shadow Ray Intersections";let p=Be+e,u=new ge(new Uint32Array(p),p);u.name="Medium Queue";let g=Math.min(e,s);g>0&&(a.source=this.rayDataStorage,a.target=l,a.count=g,this.dispatch(a,a.getDispatchSize(g,1,1))),this.rayDataStorage?.dispose(),this.rayQueue?.dispose(),this.shadowRayQueue?.dispose(),this.rayIntersectionsStorage?.dispose(),this.shadowRayIntersectionsStorage?.dispose(),this.mediumQueue?.dispose(),this.rayDataStorage=l,this.rayQueue=h,this.shadowRayQueue=n,this.rayIntersectionsStorage=f,this.shadowRayIntersectionsStorage=m,this.mediumQueue=u,this.rayCount=e,o>i&&(r.rayDataStorage=l,r.start=i,r.end=o,r.addingSlots=!0,this.dispatch(r,r.getDispatchSize(o-i,1,1)))}_getRequestedSlotCount(){return Math.min(Zo,Math.max(1,Math.floor(this.frameBudget)))}_getPreviewIterations(){return Math.max(1,Math.min(this.maxBounces,nu))}getPreviewPixelBudget(){return Math.min(this.frameBudget/this._getPreviewIterations(),Zo)}_applyBudget(e){let t=this._getRequestedSlotCount();t!==this.rayCount&&this._resizePool(t,e)}*createRenderTask(){let{renderer:e,maxTransparentBounces:t,logicKernel:r,materialKernel:a,traceRayKernel:s,traceShadowRayKernel:i,mediumKernel:o,queueMediumWalksKernel:l,rayDispatchConverter:h,shadowDispatchConverter:n,mediumDispatchConverter:f,zeroDispatchKernel:m,populatePixelIndicesKernel:p}=this,u=new su;this.getSize(u),this._updatePixelQueue(u.x,u.y);let g=u.x*u.y;for(this._applyBudget(g),yield*this.compileKernels([r,a,s,i,o,l,h,n,f,m,p]),m.target=this.queueCounters,this.dispatch(m,[Zr]),p.rayDataStorage=this.rayDataStorage,p.pixelQueue=this.pixelQueue,p.frameBudget=Math.min(this.rayCount,g),p.targetDimensions.copy(u),this.dispatch(p,p.getDispatchSize(u.x,u.y,1)),this.seed++;;){let x=Math.min(this._getRequestedSlotCount(),g),T=this.lowResMode?this._getPreviewIterations():1,b=Math.max(T,Math.round(this.frameBudget/x));for(let _=0;_<b;_++){e.copyTextureToTexture(this.outputTarget,this.prevOutputTarget),[this.outputTarget,this.prevOutputTarget]=[this.prevOutputTarget,this.outputTarget],r.prevOutputTarget=this.prevOutputTarget,r.outputTarget=this.outputTarget,r.sampleCountTarget=this.sampleCountTarget,r.auxTarget=this.auxTarget??this._auxPlaceholder,r.accumulateAux=this.auxTarget?1:0,r.rayDataStorage=this.rayDataStorage,r.rayIntersectionsStorage=this.rayIntersectionsStorage,r.shadowRayIntersectionsStorage=this.shadowRayIntersectionsStorage,r.maxBounces=this.maxBounces,r.rayCount=Math.min(this.rayCount,g),this.dispatch(r,r.getDispatchSize(r.rayCount,1,1)),this._applyBudget(g);let{rayDataStorage:y,rayQueue:D,shadowRayQueue:H,queueCounters:z,rayIntersectionsStorage:le,shadowRayIntersectionsStorage:K,mediumQueue:P}=this,X=Math.min(this.rayCount,g);m.target=z,this.dispatch(m,[Zr]),m.target=P,this.dispatch(m,[Be]),a.rayDataStorage=y,a.rayQueue=D,a.shadowRayQueue=H,a.queueCounters=z,a.pixelQueue=this.pixelQueue,a.sampleCountTarget=this.sampleCountTarget,a.seed=this.seed,a.maxSamples=this.maxSamples,a.rayCount=X,a.maxTransparentBounces=t,a.maxBounces=this.maxBounces,a.targetDimensions.copy(u),this.dispatch(a,a.getDispatchSize(X,1,1)),h.queueCounters=z,this.dispatch(h,[1,1,1]),s.rayQueue=D,s.queueCounters=z,s.rayIntersectionsStorage=le,this.dispatch(s,h.outputDispatch),n.queueCounters=z,this.dispatch(n,[1,1,1]),i.shadowRayQueue=H,i.queueCounters=z,i.shadowRayIntersectionsStorage=K,this.dispatch(i,n.outputDispatch),l.rayDataStorage=y,l.mediumQueue=P,l.rayCount=X,this.dispatch(l,l.getDispatchSize(X,1,1)),f.queueCounters=P,this.dispatch(f,[1,1,1]),o.rayDataStorage=y,o.mediumQueue=P,o.rayIntersectionsStorage=le,o.rayCount=X,o.maxSubsurfaceBounces=this.maxSubsurfaceBounces,o.stepsPerPass=this.mediumStepsPerPass,this.dispatch(o,f.outputDispatch)}yield}}getSampleCountsAsync(){if(this._samplesPromise===null){let e=this._measureSampleCounts().finally(()=>{this._samplesPromise===e&&(this._samplesPromise=null)});this._samplesPromise=e}return this._samplesPromise}async _measureSampleCounts(){let{renderer:e,sampleCountTarget:t,sampleCountersStorage:r,primeSampleCountersKernel:a,tallySampleCountsKernel:s}=this;if(!e.initialized||this.lowResMode)return{min:0,max:0,avg:0};a.counters=r,e.compute(a.kernel,[1,1,1]),s.counters=r,s.sampleCountTarget=t,e.compute(s.kernel,s.getDispatchSize(t.width,t.height));let i=await e.getArrayBufferAsync(r),o=new Uint32Array(i),l=o[jo];if(l===0)return{min:0,max:0,avg:0};let h=o[Qo]*Ko+o[Go];return{min:o[Wo],max:o[qo],avg:h/l}}};import{BackSide as lu,FrontSide as cu,DoubleSide as uu,BufferAttribute as du,BufferGeometry as hu,StorageBufferAttribute as Jo,StructTypeNode as rn,Vector4 as fu,SkinnedMesh as mu,RepeatWrapping as pu,ClampToEdgeWrapping as gu,MirroredRepeatWrapping as xu,NearestFilter as vu}from"three/webgpu";import{storage as yu,float as en,bool as tn,texture as bu,uniformArray as Su,uint as Tu}from"three/tsl";var Ht=new fu,fa=new rn({matrixWorld:"mat4x4f",inverseMatrixWorld:"mat4x4f",visible:"uint",materialIndex:"uint",visibleToShadowRays:"uint",_alignment0:"uint",color:"vec4f"},"TransformStruct"),ma=new rn({indices:"vec4u",normal:"vec3f",didHit:"bool",barycoord:"vec3f",objectIndex:"uint",side:"float",dist:"float",skippedOcclusion:"float",occlusion:"float"},"PathTracerIntersectionResult"),pa=class extends rr{constructor(e,t={}){super(e,{attributes:{position:"vec4f",normal:"vec4f",tangent:"vec4f",color:"vec4f",uv:"vec4f"},...t}),this.structs.transform=fa,this.structs.material=or,this.storage.materials=null,this.materialsMap=new Map,this.materials=[],this.bvhMap=new Map,this.textureAtlas=new ot}updateUvAttributesFromScene(){let{attributes:e}=this,t=new Set(["color"]);for(let r=0;r<8;r++){let a=r===0?"uv":"uv"+r;delete e[a],t.add(a)}this.getRootObject().traverse(r=>{if(r.geometry)for(let a in r.geometry.attributes)t.has(a)&&(e[a]="vec4f")})}updateUvSampleFunction(){let{structs:e,fns:t}=this,r=[],a=null;e.attributes.membersLayout.forEach(({name:s})=>{if(/^uv/.test(s)){let i=s==="uv"?0:Number(s.replace(/^uv/,""));r.push(`
					case ${i}u: {

						return vertexData.${s}.xy;

					}
				`),a===null&&(a=`vertexData.${s}.xy`)}}),t.getUvFromChannel=d`
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
		`}updateColorSampleFn(){let{structs:e,fns:t}=this;!!e.attributes.membersLayout.find(({name:a})=>a==="color")?t.getColor=d`
				fn getColor( vertexData: ${e.attributes} ) -> vec4f {

					return vertexData.color;

				}
			`:t.getColor=d`
				fn getColor( vertexData: ${e.attributes} ) -> vec4f {

					return vec4f( 1.0 );

				}
			`}useTransparencyRaycastFn(){let{textureAtlas:e,storage:t,fns:r}=this,a=e.texture,s=Su(e.textureInfo,"uvec4").setName("bvh_textureInfo"),i=Ir(s,bu(a));r.getSurfaceRecord=no(i,r.getUvFromChannel,r.getColor);let o=Tu().toVar("bvh_materialIndex"),l=en(1).toVar("bvh_rayScalar"),h=en(1).toVar("bvh_baseOpacity"),n=tn(!1).toVar("bvh_isShadowRay"),f=tn(!1).toVar("bvh_skipShadowObject"),m={shapeStruct:v,resultStruct:ma,boundsOrderFn:d`
				fn getBoundsOrder( ray: ${v}, splitAxis: u32, node: ${O} ) -> bool {

					return ray.direction[ splitAxis ] >= 0.0;

				}
			`,intersectsBoundsFn:d`
				fn rayIntersectsBounds( ray: ${v}, bounds: ${B}, result: ptr<function, ${ma}> ) -> u32 {

					// early-out if our object is completely transparent, or a shadow ray is already occluded
					if ( ${h} == 0.0 || ( ${n} && result.didHit ) ) {

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

					} else if ( ray.maxDist > 0.0 && dist * ${l} >= ray.maxDist ) {

						return 0u;

					} else if ( result.didHit && dist * ${l} >= result.dist ) {

						return 0u;

					} else {

						return 1u;

					}

				}

			`,intersectRangeFn:d`
				fn intersectRange( ray: ${v}, offset: u32, count: u32, result: ptr<function, ${ma}> ) -> bool {

					var didHit = false;
					for ( var ti = offset; ti < offset + count; ti = ti + 1u ) {

						let i0 = ${t.index}[ ti * 3u ];
						let i1 = ${t.index}[ ti * 3u + 1u ];
						let i2 = ${t.index}[ ti * 3u + 2u ];

						let a = ${t.attributes}[ i0 ].position.xyz;
						let b = ${t.attributes}[ i1 ].position.xyz;
						let c = ${t.attributes}[ i2 ].position.xyz;

						var triResult = ${We}( ray, a, b, c, 0.0 );
						triResult.dist *= ${l};
						if ( triResult.didHit && ( ray.maxDist <= 0.0 || triResult.dist < ray.maxDist ) && ( ! result.didHit || triResult.dist < result.dist ) ) {

							let material = ${t.materials}[ ${o} ];

							// TODO: if material is a transmissive volume we may need to assume double-sidedness
							// shadow rays hit both sides
							if ( ! ${n} && material.side != 0 && triResult.side != material.side ) {

								continue;

							}

							var opacity = ${h};
							if ( material.transparent != 0 || material.alphaTest > 0.0 ) {

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

							// shadow rays skip the objects not visible to them. Record the share of bsdf rays this face
							// would stop: all of them if it's opaque, its opacity if it's partially transparent
							if ( ${f} ) {

								if ( material.side == 0 || triResult.side == material.side ) {

									result.skippedOcclusion += ( 1.0 - result.skippedOcclusion ) * select( 1.0, opacity, material.transparent != 0 );

								}

								continue;

							}

							// shadow rays pass partially transparent surfaces, each blocking its opacity's share of the
							// light still getting through, just as bsdf rays pass them by chance
							if ( ${n} && material.transparent != 0 && opacity < 1.0 ) {

								result.occlusion += ( 1.0 - result.occlusion ) * opacity;
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
			`,transformShapeFn:d`
				fn transformRay( ray: ptr<function, ${v}>, objectIndex: u32 ) -> void {

					let toLocal = ${t.transforms}[ objectIndex ].inverseMatrixWorld;
					ray.origin = ( toLocal * vec4f( ray.origin, 1.0 ) ).xyz;
					ray.direction = ( toLocal * vec4f( ray.direction, 0.0 ) ).xyz;

					let len = length( ray.direction );
					ray.direction /= len;
					${l} = 1.0 / len;

					let object = ${t.transforms}[ objectIndex ];
					${o} = object.materialIndex;

					let material = ${t.materials}[ object.materialIndex ];
					if ( material.transparent == 1 ) {

						${h} = material.opacity * object.color.a;

					} else {

						${h} = 1.0;

					}

					${f} = ${n} && object.visibleToShadowRays == 0u;

				}
			`,transformResultFn:d`
				fn transformResult( hit: ptr<function, ${ma}>, objectIndex: u32 ) -> void {

					let toLocal = ${t.transforms}[ objectIndex ].inverseMatrixWorld;
					hit.normal = normalize( ( transpose( toLocal ) * vec4f( hit.normal, 0.0 ) ).xyz );
					hit.objectIndex = objectIndex;

				}
			`,resetShapeFn:d`
				fn resetRayScalar( objectIndex: u32 ) -> void {

					${l} = 1.0;
					${h} = 1.0;

				}
			`};r.raycastFirstHit=this.getShapecastFn({...m,name:"raycastFirstHit",prefixFn:d`
				fn initFirstHitCull() -> void {

					${n} = false;

				}
			`}),r.raycastShadow=this.getShapecastFn({...m,name:"raycastShadow",prefixFn:d`
				fn initShadowCull() -> void {

					${n} = true;

				}
			`})}update(){let{structs:e}=this,t=new Jo(new Uint8Array,e.material.getLength());this.storage.materials=yu(t,e.material).toReadOnly().setName("bvh_materials"),this.updateUvAttributesFromScene(),this.updateMaterialsMap(),super.update(),this.updateUvSampleFunction(),this.updateColorSampleFn(),this.updateMaterials(),this.bvhMap.clear(),this.useTransparencyRaycastFn()}updateMaterialsMap(){let{materials:e,materialsMap:t}=this;t.clear(),e.length=0,this.getRootObject().traverse(a=>{a.material&&(Array.isArray(a.material)?a.material.forEach(s=>s&&r(s)):r(a.material))}),e.sort((a,s)=>a.uuid<s.uuid?1:-1).forEach((a,s)=>{t.set(a,s)});function r(a){t.has(a)||(e.push(a),t.set(a,-1))}}updateMaterials(){this.updateMaterialsMap();let{materials:e,storage:t,structs:r,bvh:a}=this,{materialData:s,textures:i}=this.writeMaterialsBuffer(e),o=t.materials.proxyNode,l=t.transforms.proxyNode,h=s.length/r.material.getLength();o.value.count<h&&(o.value.dispose(),o.value=new Jo(s,r.material.getLength())),o.value.array.set(s),o.value.needsUpdate=!0,this._getTransformMap(a).forEach(n=>{this.writeMaterialData(n,n.slot,l.value.array.buffer)}),l.value.needsUpdate=!0,this.textures=i}writeMaterialsBuffer(e){function t(m){switch(m){case pu:return 0;case gu:return 1;case xu:return 2;default:return 0}}function r(m,p){if(p in m&&m[p]){let u=m[p],g=Vi(u);o.has(g)||(o.set(g,o.size),l.push(u));let x=o.get(g),T=u.channel&7,b=t(u.wrapS),_=t(u.wrapT);return(u.magFilter===vu?1:0)<<30|_<<28|b<<26|T<<23|x&8388607}else return-1}function a(m,p,u){return p in m?m[p]:u}function s(m,p,u,g){let x=m[p]&&m[p].isTexture?m[p]:null;if(x){x.matrixAutoUpdate&&x.updateMatrix();let T=x.matrix.elements;for(let b=0;b<3;b++)u[g+4*b+0]=T[3*b+0],u[g+4*b+1]=T[3*b+1],u[g+4*b+2]=T[3*b+2],u[g+4*b+3]=0}return 12}let i=0,o=new Map,l=[],h=Math.max(e.length,2),n=new Float32Array(h*this.structs.material.getLength()),f=new Int32Array(n.buffer);for(let m=0,p=e.length;m<p;m++){let u=e[m];n[i++]=u.color.r,n[i++]=u.color.g,n[i++]=u.color.b,f[i++]=r(u,"map"),n[i++]=a(u,"metalness",0),f[i++]=r(u,"metalnessMap"),n[i++]=a(u,"roughness",0),f[i++]=r(u,"roughnessMap"),n[i++]=a(u,"ior",1.5),n[i++]=a(u,"transmission",0),f[i++]=r(u,"transmissionMap"),n[i++]=a(u,"emissiveIntensity",0),"emissive"in u?(n[i++]=u.emissive.r,n[i++]=u.emissive.g,n[i++]=u.emissive.b):(n[i++]=0,n[i++]=0,n[i++]=0),f[i++]=r(u,"emissiveMap"),f[i++]=r(u,"normalMap"),i++,"normalScale"in u?(n[i++]=u.normalScale.x,n[i++]=u.normalScale.y):(n[i++]=1,n[i++]=1),n[i++]=a(u,"clearcoat",0),f[i++]=r(u,"clearcoatMap"),f[i++]=r(u,"clearcoatNormalMap"),i++,"clearcoatNormalScale"in u?(n[i++]=u.clearcoatNormalScale.x,n[i++]=u.clearcoatNormalScale.y):(n[i++]=1,n[i++]=1),n[i++]=a(u,"clearcoatRoughness",0),f[i++]=r(u,"clearcoatRoughnessMap"),f[i++]=r(u,"iridescenceMap"),f[i++]=r(u,"iridescenceThicknessMap"),n[i++]=a(u,"iridescence",0),n[i++]=a(u,"iridescenceIOR",1.3),n[i++]=a(u,"iridescenceThicknessMinimum",100),n[i++]=a(u,"iridescenceThicknessMaximum",400),n[i++]=a(u,"diffuseRoughness",0),n[i++]=a(u,"dispersion",0),"specularColor"in u?(n[i++]=u.specularColor.r,n[i++]=u.specularColor.g,n[i++]=u.specularColor.b):(n[i++]=1,n[i++]=1,n[i++]=1),f[i++]=r(u,"specularColorMap"),n[i++]=a(u,"specularIntensity",1),f[i++]=r(u,"specularIntensityMap");let g=a(u,"thickness",0)===0&&a(u,"attenuationDistance",1/0)===1/0;if(f[i++]=Number(g),i++,"attenuationColor"in u?(n[i++]=u.attenuationColor.r,n[i++]=u.attenuationColor.g,n[i++]=u.attenuationColor.b):(n[i++]=1,n[i++]=1,n[i++]=1),n[i++]=a(u,"attenuationDistance",1/0),f[i++]=r(u,"alphaMap"),f[i++]=Number(a(u,"castShadow",!0)),n[i++]=u.opacity,n[i++]=u.alphaTest,!g&&u.transmission>0)n[i++]=0;else switch(u.side){case cu:n[i++]=1;break;case lu:n[i++]=-1;break;case uu:n[i++]=0;break}f[i++]=Number(a(u,"matte",!1)),n[i++]=a(u,"sheen",0),i++,"sheenColor"in u?(n[i++]=u.sheenColor.r,n[i++]=u.sheenColor.g,n[i++]=u.sheenColor.b):(n[i++]=0,n[i++]=0,n[i++]=0),f[i++]=r(u,"sheenColorMap"),n[i++]=a(u,"sheenRoughness",0),f[i++]=r(u,"sheenRoughnessMap"),f[i++]=Number(u.vertexColors),f[i++]=Number(u.flatShading),f[i++]=Number(u.transparent),f[i++]=0,n[i++]=a(u,"anisotropy",0),n[i++]=a(u,"anisotropyRotation",0),f[i++]=r(u,"anisotropyMap"),i++,i++,i++,i+=s(u,"map",n,i),i+=s(u,"metalnessMap",n,i),i+=s(u,"roughnessMap",n,i),i+=s(u,"transmissionMap",n,i),i+=s(u,"emissiveMap",n,i),i+=s(u,"normalMap",n,i),i+=s(u,"clearcoatMap",n,i),i+=s(u,"clearcoatNormalMap",n,i),i+=s(u,"clearcoatRoughnessMap",n,i),i+=s(u,"sheenColorMap",n,i),i+=s(u,"sheenRoughnessMap",n,i),i+=s(u,"iridescenceMap",n,i),i+=s(u,"iridescenceThicknessMap",n,i),i+=s(u,"specularColorMap",n,i),i+=s(u,"specularIntensityMap",n,i),i+=s(u,"alphaMap",n,i),i+=s(u,"anisotropyMap",n,i);let x=a(u,"multiscatterColor",null);n[i++]=x?x.r:1,n[i++]=x?x.g:1,n[i++]=x?x.b:1,n[i++]=a(u,"scatterStrength",0),n[i++]=a(u,"scatterAnisotropy",0),i+=3}return{materialData:f,textures:l}}writeMaterialData(e,t,r){let{materialsMap:a}=this,{object:s,instanceId:i,root:o}=e,l=s.material;if(Array.isArray(l)){let{materialIndex:m}=s.geometry.groups[o];l=l[m]}let h=new Uint32Array(r),n=a.has(l)?a.get(l):-1;n===-1&&(h[t*fa.getLength()+32]=0),h[t*fa.getLength()+33]=n,s.isInstancedMesh&&s.instanceColor?(s.getColorAt(i,Ht),Ht.w=1):s.isBatchedMesh&&s._colorsTexture?s.getColorAt(i,Ht):Ht.setScalar(1);let f=new Float32Array(r);Ht.toArray(f,t*fa.getLength()+36)}writeTransformData(e,t,r,a){super.writeTransformData(e,t,r,a),this.writeMaterialData(e,r,a);let s=new Uint32Array(a);s[r*this.structs.transform.getLength()+34]=e.object.visibleToShadowRays===!1?0:1}getBVH(e,t,r){let{bvhMap:a}=this,s=super.getBVH(e,t,r);if(a.has(s)){let i=a.get(s);if(Object.assign(r,i.range),s!==i.bvh&&s instanceof xe){let o=s.mesh,l=i.bvh.mesh;l.matrixWorld.copy(o.matrixWorld).decompose(l.position,l.quaternion,l.scale),s.refit(),s.getBoundingBox(l.boundingBox),s.geometry.computeBoundingBox()}return i.bvh}else if(s.indirect){let i=new hu;i.attributes=s.geometry.attributes;let o;if(s.geometry.index)o=s.geometry.index.array.slice(r.start,r.count+r.start);else{let{start:h,count:n}=r;o=new Uint32Array(n);for(let f=0,m=r.count;f<m;f++)o[f]=h+f}i.index=new du(o,1),r.start=0;let l;if(s instanceof xe){let h=s.mesh,n=new mu(i);n.copy(h),n.matrixWorld.copy(h.matrixWorld).decompose(n.position,n.quaternion,n.scale),l=new xe(n,{strategy:2,targetLeafSize:5})}else l=new Re(i,{strategy:2,targetLeafSize:5});return a.set(s,{bvh:l,range:{...r}}),l}else return s}dispose(){let{storage:e}=this;for(let t in e)e[t].value?.dispose()}};import{MeshBasicNodeMaterial as wu,DataTexture as Iu,NoBlending as _u}from"three/webgpu";import{uv as Ru,varying as Du,texture as Cu,uniform as $u,wgslFn as Fu}from"three/tsl";var ga=class extends wu{set texture(e){this._texNode.value=e}set layer(e){this._layerUniform.value=e}constructor(){super(),this.blending=_u,this._texNode=Cu(new Iu),this._layerUniform=$u(0),this.colorNode=Fu(`
			fn atlasDebug( tex: texture_2d_array<f32>, coord: vec2f, layer: f32 ) -> vec4f {

				// flip y so texel origin shows at the top-left
				let dims = vec2f( textureDimensions( tex, 0 ).xy );
				let texel = vec2i( vec2f( coord.x, 1.0 - coord.y ) * dims );
				return textureLoad( tex, texel, i32( layer ), 0 );

			}
		`)(this._texNode,Du(Ru()),this._layerUniform)}};import{MeshBasicNodeMaterial as Mu,NoBlending as Nu,StorageTexture as Au}from"three/webgpu";import{uv as Pu,varying as Bu,texture as Eu,uniform as an}from"three/tsl";var xa=class extends Mu{set texture(e){this._texNode.value=e}set minCount(e){this._minUniform.value=e}set maxCount(e){this._maxUniform.value=e}constructor(){super(),this.blending=Nu,this._texNode=Eu(new Au(1,1)),this._minUniform=an(0),this._maxUniform=an(1);let e=d`
			fn sampleDensity( tex: texture_2d<u32>, coord: vec2f, minCount: f32, maxCount: f32 ) -> vec4f {

				let dims = vec2f( textureDimensions( tex, 0 ) );
				let texel = vec2i( coord * dims );

				// the high bits hold the ray state flags rather than part of the count
				let samples = textureLoad( tex, texel, 0 ).r & ${me}u;

				// stretched across the recorded range rather than from zero, otherwise a converged
				// image with counts bunched near the max reads as uniformly hot
				let range = max( maxCount - minCount, 1.0 );
				let t = clamp( ( f32( samples ) - minCount ) / range, 0.0, 1.0 );

				return vec4f( ${Ga}( t ), 1.0 );

			}
		`;this.colorNode=e(this._texNode,Bu(Pu()),this._minUniform,this._maxUniform)}};import{MeshBasicNodeMaterial as Lu,NoBlending as ku}from"three/webgpu";import{uv as Hu,varying as zu,texture as Uu,uniform as Ou}from"three/tsl";var va=class extends Lu{set texture(e){this._texNode.value=e}set showNormal(e){this._showNormalUniform.value=e?1:0}constructor(){super(),this.blending=ku,this._texNode=Uu(Z()),this._showNormalUniform=Ou(0,"uint");let e=d`
			fn auxDebug( tex: texture_2d_array<u32>, coord: vec2f, showNormal: u32 ) -> vec4f {

				// the rows are stored top down, so the quad's bottom up uv is flipped
				let texel = vec2u( vec2f( coord.x, 1.0 - coord.y ) * vec2f( textureDimensions( tex, 0 ) ) );
				var packed: vec3u;
				for ( var layer = 0u; layer < ${L}u; layer ++ ) {

					packed[ layer ] = textureLoad( tex, texel, layer, 0 ).r;

				}

				let albedo = ${_t}( packed );
				let normal = ${Rt}( packed );
				return vec4f( select( albedo, normal, showNormal == 1u ), 1.0 );

			}
		`;this.colorNode=e(this._texNode,zu(Hu()),this._showNormalUniform)}};import{float as bn}from"three/tsl";var ya=class{init(){}getBsdfNode(){return d`

			fn bsdfSample( worldWo: vec3f, surf: SurfaceRecord ) -> ScatterRecord {

				var record: ScatterRecord;

				let wo = normalize( surf.normalInvBasis * worldWo );
				let wi = ${js}( wo, ${k}( ${pr} ) );
				record.color = surf.color * max( wi.z, 0.0 );
				record.pdf = max( wi.z, 0.0 ) / PI;
				record.direction = normalize( surf.normalBasis * wi );

				return record;

			}

		`}getBsdfEvalPdfNode(){return d`

			fn bsdfEvalPdf( worldWo: vec3f, worldWi: vec3f, surf: SurfaceRecord ) -> ScatterRecord {

				var record: ScatterRecord;
				record.direction = worldWi;

				let wo = normalize( surf.normalInvBasis * worldWo );
				let wi = normalize( surf.normalInvBasis * worldWi );
				record.color = surf.color * max( wi.z, 0.0 );
				record.pdf = max( wi.z, 0.0 ) / PI;

				return record;

			}

		`}getData(){return{bsdfSample:this.getBsdfNode(),bsdfEvalPdf:this.getBsdfEvalPdfNode()}}};import{wgslFn as j}from"three/tsl";var Vu=j(`

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

`),sn=j(`

	fn fonSingleScatter( NdotV: f32, NdotL: f32, VdotH: f32, roughness: f32, A: f32, rho: vec3f ) -> vec3f {

		let VdotL = 2.0 * VdotH * VdotH - 1.0;
		let s = VdotL - NdotV * NdotL;
		let sOverT = select( s, s / max( NdotV, NdotL ), s > 0.0 );

		return ( rho / PI ) * A * ( 1.0 + roughness * sOverT );

	}

`,[I]),xx=j(`

	fn fonBrdf( NdotV: f32, NdotL: f32, VdotH: f32, surf: SurfaceRecord ) -> vec3f {

		let roughness = surf.diffuseRoughness;
		if ( roughness < 1e-5 ) {

			return surf.color / PI;

		}

		let rho = saturate( surf.color );
		let A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );

		return fonSingleScatter( NdotV, NdotL, VdotH, roughness, A, rho );

	}

`,[I,$,sn]),on=j(`

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

`,[I,$,Vu,sn]),nn=j(`

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

`),ln=j(`

	fn eonLtcBasis( wo: vec3f ) -> mat3x3f {

		let lenSqr = dot( wo.xy, wo.xy );
		let invLen = inverseSqrt( lenSqr );
		let x = select(
			vec3f( 1.0, 0.0, 0.0 ),
			vec3f( wo.x, wo.y, 0.0 ) * invLen,
			lenSqr > 0.0,
		);
		let y = vec3f( - x.y, x.x, 0.0 );

		return mat3x3f( x, y, vec3f( 0.0, 0.0, 1.0 ) );

	}

`),Wu=j(`

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

`,[I,nn,ln]),qu=j(`

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

`,[I,nn,ln]),Gu=j(`

	fn eonUniformHemisphereSample( uv: vec2f ) -> vec3f {

		let sinTheta = sqrt( max( 1.0 - uv.x * uv.x, 0.0 ) );
		let phi = 2.0 * PI * uv.y;
		return vec3f( sinTheta * cos( phi ), sinTheta * sin( phi ), uv.x );

	}

`,[I]),cn=j(`

	fn eonUniformProbability( wo: vec3f, roughness: f32 ) -> f32 {

		let mu = saturate( wo.z );
		return clamp( pow( roughness, 0.1 ), 0.0, 1.0 ) * (
			0.162925 + ( - 0.372058 + ( 0.538233 - 0.290822 * mu ) * mu ) * mu
		);

	}

`),un=j(`

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

`,[qu,Gu,cn]),dn=j(`

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

`,[I,Wu,cn]);var Qu=d`

	fn velvetD( cosThetaH: f32, roughness: f32 ) -> f32 {

		var alpha = max( roughness, 0.07 );
		alpha = alpha * alpha;

		let invAlpha = 1.0 / alpha;
		let sqrCosThetaH = cosThetaH * cosThetaH;
		let sinThetaH = max( 1.0 - sqrCosThetaH, 0.001 );

		return ( 2.0 + invAlpha ) * pow( sinThetaH, 0.5 * invAlpha ) / ( 2.0 * PI );

	}

`,zt=d`

	fn velvetParamsInterpolate( i: i32, oneMinusAlphaSquared: f32 ) -> f32 {

		let p0 = array<f32, 5>( 25.3245, 3.32435, 0.16801, - 1.27393, - 4.85967 );
		let p1 = array<f32, 5>( 21.5473, 3.82987, 0.19823, - 1.97760, - 4.32054 );

		return mix( p1[ i ], p0[ i ], oneMinusAlphaSquared );

	}

`,Di=d`

	fn velvetL( x: f32, alpha: f32 ) -> f32 {

		let oneMinusAlpha = 1.0 - alpha;
		let oneMinusAlphaSquared = oneMinusAlpha * oneMinusAlpha;

		let a = ${zt}( 0, oneMinusAlphaSquared );
		let b = ${zt}( 1, oneMinusAlphaSquared );
		let c = ${zt}( 2, oneMinusAlphaSquared );
		let d = ${zt}( 3, oneMinusAlphaSquared );
		let e = ${zt}( 4, oneMinusAlphaSquared );

		return a / ( 1.0 + b * pow( abs( x ), c ) ) + d * x + e;

	}

`,hn=d`

	fn velvetLambda( cosTheta: f32, alpha: f32 ) -> f32 {

		if ( abs( cosTheta ) < 0.5 ) {

			return exp( ${Di}( cosTheta, alpha ) );

		} else {

			return exp( 2.0 * ${Di}( 0.5, alpha ) - ${Di}( 1.0 - cosTheta, alpha ) );

		}

	}

`,ju=d`

	fn velvetG( cosThetaO: f32, cosThetaI: f32, roughness: f32 ) -> f32 {

		var alpha = max( roughness, 0.07 );
		alpha = alpha * alpha;

		return 1.0 / ( 1.0 + ${hn}( cosThetaO, alpha ) + ${hn}( cosThetaI, alpha ) );

	}

`,fn=d`

	fn directionalAlbedoSheen( cosThetaIn: f32, alpha: f32 ) -> f32 {

		let cosTheta = saturate( cosThetaIn );
		let c = 1.0 - cosTheta;
		let c3 = c * c * c;

		return 0.65584461 * c3 + 1.0 / ( 4.16526551 + exp( -7.97291361 * sqrt( alpha ) + 6.33516894 ) );

	}

`,mn=d`

	fn sheenAlbedoScaling( wo: vec3f, wi: vec3f, surf: ${$} ) -> f32 {

		var alpha = max( surf.sheenRoughness, 0.07 );
		alpha = alpha * alpha;

		let maxSheenColor = max( max( surf.sheenColor.r, surf.sheenColor.g ), surf.sheenColor.b );

		let eWo = ${fn}( clamp( wo.z, 0.001, 1.0 ), alpha );
		let eWi = ${fn}( clamp( wi.z, 0.001, 1.0 ), alpha );

		return min( 1.0 - maxSheenColor * eWo, 1.0 - maxSheenColor * eWi );

	}

`,pn=d`

	fn sheenColor( wo: vec3f, wi: vec3f, wh: vec3f, surf: ${$} ) -> vec3f {

		let cosThetaO = clamp( wo.z, 0.001, 1.0 );
		let cosThetaI = clamp( wi.z, 0.001, 1.0 );
		let cosThetaH = wh.z;

		let D = ${Qu}( cosThetaH, surf.sheenRoughness );
		let G = ${ju}( cosThetaO, cosThetaI, surf.sheenRoughness );

		// See equation (1) in http://www.aconty.com/pdf/s2017_pbs_imageworks_sheen.pdf
		var color = surf.sheenColor;
		color *= D * G / ( 4.0 * abs( cosThetaO * cosThetaI ) );

		return color;

	}

`;import{Storage3DTexture as Ku,RGBAFormat as Xu,LinearFilter as gn,HalfFloatType as Yu,MathUtils as xn}from"three/webgpu";import{storageTexture3D as Zu,globalId as Ju,uniform as ba,texture3D as ed,sampler as td}from"three/tsl";var Sa=32,Ta=16,wa=class extends Ku{constructor(){super(Sa,Sa,31),this.type=Yu,this.format=Xu,this.minFilter=gn,this.magFilter=gn,this.dielectricLayerCount=10,this.transmissiveLayerCount=10,this.minIoR=1,this.maxIoR=2.5,this.sampleConductorFn=R("_sampleConductorFn",this),this.sampleDielectricFn=R("_sampleDielectricFn",this),this.sampleTransmissiveFn=R("_sampleTransmissiveFn",this)}generate(e){let{dielectricLayerCount:t,transmissiveLayerCount:r,minIoR:a,maxIoR:s}=this,i={outputTarget:Zu(this).toWriteOnly(),globalId:Ju,eta:ba(1),layer:ba(0,"uint"),includeFresnel:ba(0),includeRefraction:ba(0)},o=[Sa/Ta,Sa/Ta,1],l=new S(fo(i.outputTarget)(i),{workgroupSize:[Ta,Ta,1]});i.layer.value=0,i.eta.value=1,i.includeFresnel.value=0,i.includeRefraction.value=0,e.compute(l.kernel,o);for(let g=0;g<t;g++)i.layer.value++,i.eta.value=1/xn.mapLinear(g,0,t-1,a,s),i.includeFresnel.value=1,e.compute(l.kernel,o);i.includeFresnel.value=1,i.includeRefraction.value=1;for(let g=0;g<r;g++){let x=xn.mapLinear(g,0,r-1,a,s);i.layer.value=1+t+g,i.eta.value=1/x,e.compute(l.kernel,o),i.layer.value=1+t+r+g,i.eta.value=x,e.compute(l.kernel,o)}l.dispose();let h=d`
			fn mapLinearClamped( v: f32, a0: f32, a1: f32, b0: f32, b1: f32 ) -> f32 {

				let mapped = saturate( ( v - a0 ) / ( a1 - a0 ) );
				return mix( b0, b1, mapped );

			}
		`,n=ed(this).setName("turquinTexture"),f=td(this).setName("turquinSampler"),m=1/(1+t+2*r);this._sampleConductorFn=d`
			fn sampleConductor( cosTheta0: f32, roughness: f32 ) -> f32 {

				let layer = 0.5;
				let uvw = vec3f( cosTheta0, roughness, layer * ${m} );
				return textureSampleLevel( ${n}, ${f}, uvw, 0 ).r;

			}
		`,this._sampleDielectricFn=d`
			fn sampleDielectric( cosTheta0: f32, roughness: f32, ior: f32 ) -> f32 {

				let blockStart = 1.0;
				let layer = ${h}(
					ior,
					f32( ${a} ), f32( ${s} ),
					0.5, f32( ${t} ) - 0.5,
				) + blockStart;

				let uvw = vec3f( cosTheta0, roughness, layer * ${m} );
				return textureSampleLevel( ${n}, ${f}, uvw, 0 ).r;

			}
		`;let p=1+t,u=1+t+r;this._sampleTransmissiveFn=d`
			fn sampleTransmissive( cosTheta0: f32, roughness: f32, ior: f32, entering: bool ) -> f32 {

				let blockStart = select(
					f32( ${u} ),
					f32( ${p} ),
					entering
				);
				let layer = ${h}(
					ior,
					f32( ${a} ), f32( ${s} ),
					0.5, f32( ${r} ) - 0.5,
				) + blockStart;

				let uvw = vec3f( cosTheta0, roughness, layer * ${m} );
				return textureSampleLevel( ${n}, ${f}, uvw, 0 ).r;

			}
		`}};var vn=bn(1.5),yn=bn(1e6),Ia=class extends ya{constructor(e={}){super();let{specularBrdf:t=oi,specularBtdf:r=ni,diffuseBrdf:a=on,fresnelMix:s=lo,conductorFresnel:i=uo,fresnelCoat:o=ho,iridescentFresnel:l=li}=e;this.turquinTexture=new wa,this.specularBrdf=t,this.specularBtdf=r,this.diffuseBrdf=a,this.fresnelMix=s,this.conductorFresnel=i,this.fresnelCoat=o,this.iridescentFresnel=l,this.transmissionFresnel=co(l)}init(e){this.turquinTexture.generate(e)}getBsdfNode(){this._bsdfEvalFunc=d`

			// The material is organized as one scoped block per lobe in cascade order - clearcoat,
			// sheen, transmission, specular, diffuse - each accumulating into a shared result and
			// guarding its own hemisphere.
			// TODO: energy only cascades downward through front faces, so the layers are always traversed
			// outside-in and cannot reflect energy back into the glass from below.
			fn bsdfEval( ctx: ${Ka}, surf: ${$} ) -> vec3f {

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
					let clearcoatBoost = 1.0 + ${q}( 1.5 ) * ( 1.0 - clearcoatEnergySS ) / clearcoatEnergySS;

					let clearcoatSpecular = ${this.specularBrdf}( Vc, Lc, Hc, vec2( clearcoatAlpha ) ) * clearcoatBoost;
					let clearcoatFresnel = ${ie}( abs( dot( Vc, Hc ) ), ${q}( 1.5 ) );

					// retrieve specular energy reflected by this layer
					let clearcoatFresnelEnergySS = ${this.turquinTexture.sampleDielectricFn}( NdotVc, surf.clearcoatRoughness, 1.5 ) * clearcoatBoost;

					result += surf.clearcoat * clearcoatFresnel * clearcoatSpecular;
					attenuation *= 1.0 - surf.clearcoat * clearcoatFresnelEnergySS;

				}

				// sheen
				if ( NdotL > 0.0 && surf.sheen > 0.0 ) {

					result += attenuation * surf.sheen * ${pn}( ctx.V, ctx.L, ctx.H, surf );
					attenuation *= mix( 1.0, ${mn}( ctx.V, ctx.L, surf ), surf.sheen );

				}

				// transmission
				// handles specular reflection and transmission
				if ( surf.transmission > 0.0 ) {

					let matchedIor = ${Je}( surf.eta );

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
							let thinWallAlpha = vec2f( ${Ur}( alphaB, surf.ior ) );
							let thinWallEnergySS = max( ${this.turquinTexture.sampleConductorFn}( NdotV, sqrt( thinWallAlpha.x ) ), 1e-5 );
							refraction = fresnel.transmittance * ${this.specularBrdf}( ctx.V, wiMirror, ctx.H, thinWallAlpha ) / thinWallEnergySS;

						} else if ( ! matchedIor ) {

							// The default BTDF contains the plain dielectric Fresnel complement. Replace it
							// with the colored thin-film-aware coefficient shared by sampling and the PDF.
							let dielectricTransmittance = 1.0 - ${$e}( abs( ctx.VdotH ), surf.eta );
							if ( dielectricTransmittance > EPSILON ) {

								refraction = ${this.specularBtdf}( ctx.V, ctx.L, ctx.H, alpha, surf.eta ) *
									fresnel.transmittance / dielectricTransmittance * glassBoost;

							}

						}

						// the refracted half is not attenuated by the layers above. A volume is entered and exited,
						// so each crossing takes the square root of the color, as in Cycles
						let transmissionTint = select( sqrt( surf.color ), surf.color, surf.thinWall );
						result += ( 1.0 - surf.metalness ) * surf.transmission * refraction * transmissionTint;

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
					let dielectricFr = ${Xe}( ctx.VdotH, dielectricF0, vec3f( 1.0 ) );
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

						let dielectricFilmFresnel = ${this.iridescentFresnel}( ctx.VdotH, vec3f( ${q}( filmBaseIor ) ), surf.iridescenceIor, outsideIor, surf.iridescenceThickness );
						dielectricReflectance = mix( dielectricReflectance, dielectricFilmFresnel, surf.iridescence );
						filmFresnelMax = max( max( dielectricFilmFresnel.r, dielectricFilmFresnel.g ), dielectricFilmFresnel.b );

					}

					let metallic = metallicSpecular * metallicReflectance;
					let dielectric = dielectricSpecular * dielectricReflectance;

					// The energy the specular interface takes from the layers below, at the lobe's specular color
					// and intensity. The table holds the albedo at the ior's f0, and the Schlick albedo is linear
					// in f0, so the tinted albedo slides from it toward the conductor albedo at f0 = 1
					let iorEnergySS = ${this.turquinTexture.sampleDielectricFn}( NdotV, surf.roughness, surf.ior );
					let tintedEnergySS = iorEnergySS + ( dielectricF0 - surf.f0 ) * ( energySS - iorEnergySS ) / ( 1.0 - surf.f0 );
					let fresnelEnergySS = surf.specularIntensity * tintedEnergySS * dielectricBoost;

					result += attenuation * mix( ( 1.0 - surf.transmission ) * dielectric, metallic, surf.metalness );
					attenuation *= ( 1.0 - surf.metalness ) * mix( 1.0 - fresnelEnergySS, vec3f( 1.0 - filmFresnelMax ), surf.iridescence );

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

		`;let e=this.getBsdfEvalPdfNode();return d`

			fn bsdfSample( worldWo: vec3f, surf: ${$} ) -> ${Y} {

				var result: ${Y};
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
				let weights = ${ti}( wo, wo, woClearcoat, vec3( 0, 0, 1 ), ${vn}, surf );
				let cdfClearcoat = weights.clearcoat;
				let cdfSpecular = cdfClearcoat + weights.specular;
				let cdfTransmission = cdfSpecular + weights.transmission;
				let cdfTotal = cdfTransmission + weights.diffuse;

				// random samples for lobes
				let lobeSample = ${ae}( ${ks} ) * cdfTotal;
				let directionUV = ${k}( ${pr} );

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
					let whCoat = ${Ne}( woClearcoat, vec2( clearcoatAlpha ), directionUV );
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

					wh = ${Ne}( wo, alpha, directionUV );
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
					wh = ${Ne}( wo, alpha, directionUV );

					let fresnelCosine = select( dot( wo, wh ), wo.z, surf.thinWall );
					let fresnel = ${this.transmissionFresnel}( fresnelCosine, surf );

					let fresnelSample = ( lobeSample - cdfSpecular ) / ( cdfTransmission - cdfSpecular );
					let doReflect = fresnelSample < fresnel.reflectProbability;
					if ( doReflect ) {

						wi = - normalize( reflect( wo, wh ) );

					} else if ( ${Je}( surf.eta ) ) {

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
						let thinWallAlpha = vec2f( ${Ur}( alphaB, surf.ior ) );
						wh = ${Ne}( wo, thinWallAlpha, directionUV );
						wi = - normalize( reflect( wo, wh ) );
						wi = vec3f( wi.xy, - wi.z );

					} else {

						wi = refract( - wo, wh, surf.eta );

						// "refract" returns zero on total internal reflection, so reflect instead and let "isDead" drop it
						if ( dot( wi, wi ) == 0.0 ) {

							wi = - normalize( reflect( wo, wh ) );

						}

					}

					// the facet choice must agree with the resulting hemisphere - reflection above,
					// transmission below. Mismatched samples are dropped since their loss is
					// refunded by the energy compensation tables
					isDead = doReflect != ( wi.z > 0.0 );

				} else if ( lobeSample <= cdfTotal ) {

					// diffuse
					// all diffuse BRDF variants share the EON sampling proposal
					wi = ${un}( wo, surf.diffuseRoughness, directionUV );
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
					let transmissionTint = select( sqrt( surf.color ), surf.color, surf.thinWall );
					result.color = ( 1.0 - surf.metalness ) * surf.transmission * transmissionTint *
						deltaTransmittance * ${yn};
					result.direction = worldWi;
					result.pdf = weights.transmission * deltaProbability * ${yn};
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

		`}getBsdfEvalPdfNode(){if(this._bsdfEvalPdfNode)return this._bsdfEvalPdfNode;this._bsdfEvalFunc||this.getBsdfNode();let e=this._bsdfEvalFunc;return this._bsdfEvalPdfNode=d`

			fn bsdfEvalPdf( worldWo: vec3f, worldWi: vec3f, surf: ${$} ) -> ${Y} {

				var result: ${Y};
				result.color = vec3f( 0.0 );
				result.isTransmissive = false;
				result.direction = worldWi;
				result.pdf = 0.0;

				let wo = normalize( surf.normalInvBasis * worldWo );
				let wi = normalize( surf.normalInvBasis * worldWi );
				let woClearcoat = normalize( surf.clearcoatInvBasis * worldWo );

				let isTransmission = wi.z < 0.0;
				if ( isTransmission && ${Je}( surf.eta ) ) {

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

				let weights = ${ti}( wo, wo, woClearcoat, vec3( 0, 0, 1 ), ${vn}, surf );

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
						result.pdf += weights.clearcoat * ${Ae}( woClearcoat, whClearcoat, vec2( clearcoatAlpha ) );

					}

				}

				// specular
				if ( weights.specular > 0.0 && wi.z > 0.0 ) {

					// anisotropic roughness along tangent, bitangent
					let alphaB = surf.roughness * surf.roughness;
					let alphaT = mix( alphaB, 1.0, surf.anisotropy * surf.anisotropy );
					let alpha = vec2( alphaT, alphaB );

					result.pdf += weights.specular * ${Ae}( wo, wh, alpha );

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

						result.pdf += weights.transmission * fresnel.reflectProbability * ${Ae}( wo, wh, alpha );

					} else if ( surf.thinWall ) {

						// the flipped reflection shares the reflection pdf at the remapped roughness
						let thinWallAlpha = vec2f( ${Ur}( alphaB, surf.ior ) );
						result.pdf += weights.transmission * ( 1.0 - fresnel.reflectProbability ) * ${Ae}( wo, wh, thinWallAlpha );

					} else {

						result.pdf += weights.transmission * ( 1.0 - fresnel.reflectProbability ) * ${Hr}( wo, wi, wh, alpha, surf.eta );

					}

				}

				// diffuse
				if ( weights.diffuse > 0.0 ) {

					result.pdf += weights.diffuse * ${dn}( wo, wi, surf.diffuseRoughness );

				}

				//

				// construct the scatter context
				var ctx: ${Ka};
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

		`,this._bsdfEvalPdfNode}};var Ie=new _n,Ra=new ld,vd=250,yd=16,Sn=1.15,Tn=2,bd=4096,wn={strategy:2,targetLeafSize:5},Sd=4,$i=0,Fi=1,Da=2;async function Td(c,e,t){let r=h=>typeof SharedArrayBuffer<"u"&&h.buffer instanceof SharedArrayBuffer?h:h.slice(),{position:a}=e.attributes,{index:s}=e,i=a.array,o=s?s.array:null;a.array=r(i),s&&(s.array=r(o));let l=await c.generate(e,t);return a.array=i,s&&(o.set(s.array),s.array=o,s.needsUpdate=!0),l}var Ca=class{constructor(e,t){this.key=t,this.renderer=e,this.texture=null,this.hash=null;let r=new ad(new Uint8Array([255,255,255,255]),1,1);r.minFilter=_a,r.magFilter=_a,this.colorTex=r}dispose(){this.colorTex.dispose(),this.texture?.dispose()}setFromScene(e){let{renderer:t,key:r,colorTex:a}=this,s=e[r],i="";if(s)s.isColor?(a.image.data[0]=s.r*255,a.image.data[1]=s.g*255,a.image.data[2]=s.b*255,a.image.data[3]=255,s=a,i=a.image.data.join(),a.needsUpdate=i!==this.hash):s.isCubeTexture?(i=null,s=new Gi(t).generate(s)):(i=s.uuid+"_"+s.version,i!==this.hash&&(s=s.clone(),s.minFilter=_a,s.magFilter=_a));else{let o=t.getClearAlpha();t.getClearColor(Ra),a.image.data[0]=Ra.r*255,a.image.data[1]=Ra.g*255,a.image.data[2]=Ra.b*255,a.image.data[3]=o*255,s=a,i=a.image.data.join(),a.needsUpdate=i!==this.hash}if(i===null)return this.texture?.dispose(),this.texture=s,this.hash=null,!0;{let o=i!==this.hash;return o&&(this.texture?.dispose(),this.texture=s,this.hash=i),o}}},In=class extends id{get maxBounces(){return this._pathTracer.maxBounces}set maxBounces(e){this._pathTracer.maxBounces=e,this.reset()}get frameBudget(){return this._pathTracer.frameBudget}set frameBudget(e){this._pathTracer.frameBudget=e}get frameTime(){return this._pathTracer.timing.frameTime}get maxTransparentBounces(){return this._pathTracer.maxTransparentBounces}set maxTransparentBounces(e){this._pathTracer.maxTransparentBounces=e,this.reset()}get maxSubsurfaceBounces(){return this._pathTracer.maxSubsurfaceBounces}set maxSubsurfaceBounces(e){this._pathTracer.maxSubsurfaceBounces=e,this.reset()}get maxSamples(){return this._pathTracer.maxSamples}set maxSamples(e){this._pathTracer.maxSamples=e,this._denoiser?.reset()}get complete(){let e=this.maxSamples,t=this._denoiser;return e>0&&this._lastSampleCounts.min>=e&&(!t||t.complete)}async getSampleCountsAsync(){let e=this._pathTracer,t=this._lastSampleCounts,r=await e.getSampleCountsAsync();t.min=r.min,t.max=r.max,t.avg=r.avg;let a=this.getRenderTime()/1e3;return t.samplesPerSecond=a>0?t.avg/a:0,{...t}}get transmissiveBackground(){return this._transmissiveBackground}set transmissiveBackground(e){this._transmissiveBackground!==e&&(this._transmissiveBackground=e,this._pathTracer.setTransmissiveBackground(e))}get filterGlossyFactor(){return this._filterGlossyFactor}set filterGlossyFactor(e){this._filterGlossyFactor!==e&&(this._filterGlossyFactor=e,this._pathTracer.setFilterGlossy(e))}get multipleImportanceSampling(){return this._multipleImportanceSampling}set multipleImportanceSampling(e){this._multipleImportanceSampling!==e&&this.setMultipleImportanceSampling(e)}get clampDirect(){return this._clampDirect}set clampDirect(e){e=Math.max(0,e),this._clampDirect!==e&&(this._clampDirect=e,this._pathTracer.setClamping(e,this._clampIndirect))}get clampIndirect(){return this._clampIndirect}set clampIndirect(e){e=Math.max(0,e),this._clampIndirect!==e&&(this._clampIndirect=e,this._pathTracer.setClamping(this._clampDirect,e))}get target(){return this._pathTracer.outputTarget??null}get fadeState(){return this._fadeState}get lowResTarget(){return this._lowResTarget}get lowResMode(){return this._pathTracer.lowResMode}get compiling(){return this._pathTracer.compiling}get textureAtlas(){return this._bvhData.textureAtlas}useMegakernel(e){let t=this._pathTracer.maxSamples;this._pathTracer.dispose(),this._pathTracer=e?new Yr(this._renderer):new kt(this._renderer),this._pathTracer.maxSamples=t,this._timingCount=0,this._pathTracer.setBVHData(this._bvhData),this._pathTracer.setMaterial(this.material),this._pathTracer.setRandom(this.random),this._pathTracer.setMultipleImportanceSampling(this.multipleImportanceSampling),this._pathTracer.setTransmissiveBackground(this._transmissiveBackground),this._pathTracer.setFilterGlossy(this._filterGlossyFactor),this._pathTracer.setClamping(this._clampDirect,this._clampIndirect),this._pathTracer.setAccumulateAux(!!(this._denoiser&&this._denoiser.useAuxiliaryBuffers)),this.setCamera(this.camera),this._pathTracer.setEnvironment(this._environmentCache.texture),this._pathTracer.setBackground(this._backgroundCache.texture),this.updateEnvironment(),this.updateLights()}constructor(e){super(),this._renderer=e,this._timer=new ud,this._environmentCache=new Ca(e,"environment"),this._backgroundCache=new Ca(e,"background"),this._resetTime=-1,this._fadeState=0,this._lastSampleCounts={min:0,max:0,avg:0,samplesPerSecond:0},this._size=new _n,this._blitQuad=new Ut(new ir),this._timingCount=0,this._frameTimeTotal=0,this._frameTimeCount=0,this._warnedTimestamps=!1,this._fullFrameBudget=null,this._lowResTarget=new dd(1,1),this._lowResTarget.type=cd,this._lowResTarget.generateMipmaps=!1,this._pathTracer=new kt(e),this._denoiser=null,this._upscaler=null,this._onDenoiserProgress=t=>this.dispatchEvent({type:"progress",stage:"denoising",progress:t.progress}),this._stage=Da,this._sceneRequest=0,this._pendingBVHs=new WeakMap,this.minSamples=1,this.renderDelay=16,this.fadeDuration=250,this.dynamicLowRes=!0,this.lowResScale=.1,this.adaptiveDynamicRes=!0,this.adaptiveFrameBudget=!0,this.targetFrameTime=16,this.renderScale=1,this.synchronizeRenderSize=!0,this.renderToCanvas=!0,this.asyncCompile=!1,this.generateMissingAttributes=!0,this.commonAttributes=["normal","tangent"],this.stableNoise=!0,this.pause=!1,this.filterGlossyFactor=1,this._clampDirect=0,this._clampIndirect=10,this.multipleImportanceSampling=!0,this.transmissiveBackground=rt,this.random=go,this.material=new Ia,this._invViewProjectionMatrix=gd(new fd),this._cameraRayFnHandle=null,this._BVHWorker=null,this._lastCompleteCheck=0,this._wasComplete=!1,this.setMaterial(this.material),this.setRandom(this.random),this.setScene(new od,new nd)}setMultipleImportanceSampling(e){this._multipleImportanceSampling=e,this._pathTracer.setMultipleImportanceSampling(e),this.reset()}setDenoiser(e){this._denoiser?.reset(),this._denoiser?.removeEventListener("progress",this._onDenoiserProgress),this._denoiser=e,e&&(e.init(this._renderer),e.addEventListener("progress",this._onDenoiserProgress)),this._pathTracer.setAccumulateAux(!!(e&&e.useAuxiliaryBuffers)),this.reset()}setUpscaler(e){this._upscaler=e,e&&e.init(this._renderer)}setScene(e,t){e.updateMatrixWorld(!0),t.updateMatrixWorld(),e.traverse(a=>{this.generateMissingAttributes&&a.geometry?.isBufferGeometry&&Hi(a.geometry,this.commonAttributes),a.isSkinnedMesh?(a.boundsTree?a.boundsTree.refit():a.boundsTree=new xe(a,{strategy:2,targetLeafSize:5,indirect:!0}),a.boundingBox===null&&(a.boundingBox=new rd),a.boundsTree.getBoundingBox(a.boundingBox)):a.isMesh&&(a.geometry.boundsTree||(a.geometry.boundsTree=new Re(a.geometry,wn)))});let r=new pa(e);r.update(),r.textureAtlas.setTextures(this._renderer,r.textures),this._bvhData&&(this._bvhData.dispose(),this._bvhData.textureAtlas.dispose()),this.scene=e,this._bvhData=r,this._pathTracer.setBVHData(r),this.setCamera(t),this.updateEnvironment(),this.updateLights()}setBVHWorker(e){this._BVHWorker=e}async setSceneAsync(e,t){let r=this._BVHWorker;if(!r)throw new Error('WebGPUPathTracer: "setBVHWorker" must be called before "setSceneAsync" can be called.');this._sceneRequest++;let a=this._sceneRequest,s=this._pendingBVHs,i=new Set,o=new Set;e.traverse(p=>{if(p.isMesh&&!p.isSkinnedMesh&&!p.geometry.boundsTree){let{geometry:u}=p;if(u.attributes.position.isInterleavedBufferAttribute||u.index&&u.index.isInterleavedBufferAttribute)return;s.has(u)?o.add(s.get(u)):i.add(u)}});let l=Array.from(i),h=p=>(p.index?p.index.count:p.attributes.position.count)/3,n=l.reduce((p,u)=>p+h(u),0),f=0,m=[];for(let p=0,u=Math.min(Sd,l.length);p<u;p++)m.push(new r);this._setStage($i),this._denoiser?.reset();try{await Promise.all([...o,...m.map(async p=>{for(;l.length>0;){let u=l.shift(),g=h(u),x=0,T=_=>{f+=(_-x)*g,x=_,a===this._sceneRequest&&this.dispatchEvent({type:"progress",stage:"building",progress:f/n})},b=Td(p,u,{...wn,onProgress:T});s.set(u,b);try{u.boundsTree=await b,T(1)}finally{s.delete(u)}}})])}finally{m.forEach(p=>p.dispose()),a===this._sceneRequest&&this._setStage(Fi)}a===this._sceneRequest&&this.setScene(e,t)}getMaterial(){return this.material}setMaterial(e){this.material=e,this._pathTracer.setMaterial(e),this.reset()}setRandom(e){this.random=e,this._pathTracer.setRandom(e),this.reset()}setCamera(e){if(this.camera=e,e.getCameraRayFn)this._cameraRayFnHandle=e.getCameraRayFn();else{let t=this._invViewProjectionMatrix;this._cameraRayFnHandle={update:()=>(e.coordinateSystem=md,e.updateMatrixWorld(),(e.isOrthographicCamera||e.isPerspectiveCamera)&&e.updateProjectionMatrix(),t.value.multiplyMatrices(e.matrixWorld,e.projectionMatrixInverse),!1),fn:d`
					fn getCameraRay( uv: vec2f, resolution: vec2f, ray: ptr<function, ${v}> ) -> bool {

						let ndc = uv * 2.0 - vec2f( 1.0 );
						*ray = ${be}( ndc, ${t} );
						return true;

					}
				`}}this._bvhData.fns.getCameraRay=this._cameraRayFnHandle.fn,this._cameraRayFnHandle.update(),this._pathTracer.rebuild(),this.reset()}updateMaterials(){let{_bvhData:e,_renderer:t}=this;e.updateMaterials(),e.textureAtlas.setTextures(t,e.textures),this.reset()}updateTransforms(){this.scene.updateMatrixWorld(!0),this._bvhData.updateTransforms(),this.reset()}updateCamera(){let{_cameraRayFnHandle:e,_pathTracer:t}=this;e.update()&&t.rebuild(),this.reset()}updateEnvironment(){let{_pathTracer:e,scene:t,_environmentCache:r,_backgroundCache:a}=this;r.setFromScene(t)&&e.setEnvironment(r.texture),a.setFromScene(t)&&e.setBackground(a.texture),e.setEnvironmentParams(t.environmentIntensity,t.environmentRotation),e.setBackgroundParams(t.backgroundIntensity,t.backgroundRotation,t.backgroundBlurriness),this.reset()}updateLights(){let{_pathTracer:e,scene:t}=this,r=Wi(t);e.setLights(r),this.reset()}setSize(e,t){(this._size.x!==e||this._size.y!==t)&&(this._size.set(e,t),this.reset())}reset(){this._pathTracer.reset(),this._denoiser?.reset(),this._resetTime=-1,this._fadeState=0,this._timer.update(),this._lastSampleCounts={min:0,max:0,avg:0,samplesPerSecond:0},this._lastCompleteCheck=0,this._wasComplete=!1,this.stableNoise&&this._pathTracer.resetSeed(),this._fullFrameBudget!==null&&(this.frameBudget=this._fullFrameBudget,this._fullFrameBudget=null)}_setStage(e){this._stage!==e&&(this._stage=e,e===$i?this.dispatchEvent({type:"progress",stage:"building",progress:0}):e===Fi?this.dispatchEvent({type:"progress",stage:"compiling",progress:null}):this._dispatchRenderProgress({min:0,max:0,avg:0,samplesPerSecond:0}))}_measureSamples(){let e=this._lastSampleCounts;this.getSampleCountsAsync().then(t=>{if(e===this._lastSampleCounts&&this._stage===Da){let{maxSamples:r}=this;this._fullFrameBudget===null&&r>0&&t.max>=r&&(this._fullFrameBudget=this.frameBudget),this._dispatchRenderProgress(t)}})}_dispatchRenderProgress(e){let{maxSamples:t}=this,r=t>0?Math.min(e.avg/t,1):null;this.dispatchEvent({type:"progress",stage:"rendering",progress:r,samples:e})}_readTiming(){let{timing:e}=this._pathTracer,{trackTimestamp:t}=this._renderer.backend;if(this.adaptiveFrameBudget&&!t&&!this._warnedTimestamps&&(console.warn('WebGPUPathTracer: "adaptiveFrameBudget" needs timestamp queries. Create the renderer with "trackTimestamp: true" on a device that supports them.'),this._warnedTimestamps=!0),e.count===this._timingCount)return;this._timingCount=e.count;let{frameBudget:r}=e;if(!this.adaptiveFrameBudget||r!==this.frameBudget){this._frameTimeTotal=0,this._frameTimeCount=0;return}if(this._frameTimeTotal+=e.frameTime,this._frameTimeCount++,this._frameTimeCount<yd)return;let{targetFrameTime:a}=this,s=this._frameTimeTotal/this._frameTimeCount;this._frameTimeTotal=0,this._frameTimeCount=0;let i=s/a;if(i<Sn&&i>1/Sn)return;let o=r*a/s,l=sd.clamp(o,r/Tn,r*Tn);this.frameBudget=Math.max(Math.round(l),bd)}renderSample(){let e=this._renderer,t=this._size,r=this._blitQuad,a=this._pathTracer,s=this._lowResTarget,i=this._timer,{renderDelay:o,dynamicLowRes:l,synchronizeRenderSize:h,renderScale:n,adaptiveDynamicRes:f,minSamples:m,maxSamples:p}=this;if(i.update(),!this._renderer._initialized)return;this.material.initialized||(this.material.init(e),this.material.initialized=!0);let u=1e3*i.getDelta(),g=this._resetTime===-1;g&&(this._resetTime=0,u=0),this._resetTime+=u;let x=e.getRenderTarget(),T=e.autoClear;if(h){e.getDrawingBufferSize(Ie);let ze=Math.floor(n*Ie.x),Ue=Math.floor(n*Ie.y);this.setSize(ze,Ue)}let{width:b,height:_}=t,y=this._resetTime<o||g&&l&&m!==0;if(y){let ze=Math.min(Math.sqrt(a.getPreviewPixelBudget()/(b*_)),1);f&&(this.lowResScale=ze);let Ue=Math.min(this.lowResScale,ze);b=Math.max(1,Math.floor(Ue*b)),_=Math.max(1,Math.floor(Ue*_))}a.getSize(Ie),!y&&a.lowResMode&&l&&(s.setSize(Ie.x,Ie.y),e.copyTextureToTexture(a.outputTarget,s)),(Ie.x!==b||Ie.y!==_)&&a.setSize(b,_);let D=p>0&&this._lastSampleCounts.min>=p;if(!this.pause&&!D&&this._stage>$i&&(!y||y&&l)&&(a.lowResMode=y,a.asyncCompile=this.asyncCompile,a.update(),this._readTiming(),this._setStage(a.compiling?Fi:Da)),this._stage<Da){this._resetTime=-1;return}let H=this._denoiser,z=this._upscaler,le=!!H&&!H.complete&&!H.running&&p>0;y||(!D&&this._fadeState<1&&m>0?this._measureSamples():!D&&this._resetTime-this._lastCompleteCheck>=vd&&(this._lastCompleteCheck=this._resetTime,this._measureSamples()),this._lastSampleCounts.avg>=m&&(this._fadeState+=u/this.fadeDuration,this._fadeState=Math.min(1,this._fadeState)||1));let K=y&&l?1:this._fadeState,P=a.outputTarget;H&&!y&&(le&&this._lastSampleCounts.min>=p&&H.update(a.outputTarget,a.auxTarget),P=H.texture??P),this.renderToCanvas&&(z&&!y&&(P=z.upscale(P,this.camera),e.setRenderTarget(x)),e.autoClear=l?!0:K===1,r.material.transition=l?K:1,r.material.opacity=l?1:K,r.material.fromTexture=s,r.material.texture=P,r.render(e)),e.autoClear=T,e.setRenderTarget(x);let X=this.complete;X&&!this._wasComplete&&this.dispatchEvent({type:"complete"}),this._wasComplete=X}renderDebugBounds(e={}){let{displayTLAS:t=!0,displayBLAS:r=!0,stopAtSurface:a=!1,saturationCount:s=64}=e,i=this._renderer,o=this.camera;if(!i._initialized)return;o.updateMatrixWorld(),(this._debugBoundsQuad===void 0||this._debugBoundsData!==this._bvhData)&&this._buildDebugBoundsQuad();let l=this._debugBoundsUniforms;l.cameraToModelMatrix.value.copy(o.matrixWorld),l.inverseProjectionMatrix.value.copy(o.projectionMatrixInverse),l.displayTLAS.value=t?1:0,l.displayBLAS.value=r?1:0,l.stopAtSurface.value=a?1:0,l.saturationCount.value=s;let h=i.getRenderTarget(),n=i.autoClear,f=i.toneMapping;i.setRenderTarget(null),i.autoClear=!0,i.toneMapping=Ci,this._debugBoundsQuad.render(i),i.setRenderTarget(h),i.autoClear=n,i.toneMapping=f}_buildDebugBoundsQuad(){let e=this._bvhData,t=Cs(e),r=new hd;r.colorNode=t(xd(pd())),this._debugBoundsQuad===void 0?this._debugBoundsQuad=new Ut(r):(this._debugBoundsQuad.material.dispose(),this._debugBoundsQuad.material=r),this._debugBoundsUniforms=t.uniforms,this._debugBoundsData=e}renderTextureAtlas(e=0){let t=this._renderer;this._atlasDebugQuad||(this._atlasDebugQuad=new Ut(new ga));let r=this._atlasDebugQuad;r.material.texture=this.textureAtlas.texture,r.material.layer=e,t.setRenderTarget(null),r.render(t)}renderSampleDensity(){let e=this._renderer;if(!e._initialized)return;this.getSampleCountsAsync(),this._sampleDensityQuad||(this._sampleDensityQuad=new Ut(new xa));let t=e.toneMapping;e.toneMapping=Ci;let r=this._sampleDensityQuad;r.material.texture=this._pathTracer.sampleCountTarget,r.material.minCount=this._lastSampleCounts.min,r.material.maxCount=this._lastSampleCounts.max,e.setRenderTarget(null),r.render(e),e.toneMapping=t}renderAuxBuffer(e="albedo"){let t=this._renderer,r=this._pathTracer;if(!t._initialized||!r.auxTarget)return;this._auxDebugQuad||(this._auxDebugQuad=new Ut(new va));let a=t.toneMapping;t.toneMapping=Ci;let s=this._auxDebugQuad;s.material.texture=r.auxTarget,s.material.showNormal=e==="normal",t.setRenderTarget(null),s.render(t),t.toneMapping=a}dispose(){this._pathTracer.dispose(),this._denoiser?.dispose(),this._upscaler?.dispose(),this._bvhData.dispose(),this._bvhData.textureAtlas.dispose(),this._environmentCache.dispose(),this._backgroundCache.dispose(),this._lowResTarget.dispose(),this._blitQuad.dispose(),this._blitQuad.material.dispose(),this._atlasDebugQuad?.dispose(),this._atlasDebugQuad?.material.dispose(),this._sampleDensityQuad?.dispose(),this._sampleDensityQuad?.material.dispose(),this._auxDebugQuad?.dispose(),this._auxDebugQuad?.material.dispose(),this._debugBoundsQuad!==void 0&&(this._debugBoundsQuad.dispose(),this._debugBoundsQuad.material.dispose())}getRenderTime(){return this._resetTime}};import{RenderTarget as wd,FloatType as Id,HalfFloatType as _d,RGBAFormat as Rn,DataTexture as Rd,DataUtils as Dd,EquirectangularReflectionMapping as Cd,NodeMaterial as $d,QuadMesh as Fd}from"three/webgpu";import{Fn as Md,pmremTexture as Nd,uniform as Ad,uv as Pd,vec3 as Bd,float as Ed,sin as Dn,cos as Cn}from"three/tsl";var $n=Math.PI,Ld=Md(([c])=>{let e=c.x.sub(.5),t=Ed(1).sub(c.y),r=e.mul(2*$n),a=t.mul($n),s=Dn(a);return Bd(s.mul(Cn(r)),Cn(a),s.mul(Dn(r)))}),Fn=class{constructor(e){this.renderer=e,this._blur=Ad(0),this._pmremNode=Nd(null,Ld(Pd()),this._blur);let t=new $d;t.colorNode=this._pmremNode,t.toneMapped=!1,this.quad=new Fd(t),this.renderTarget=new wd(1,1,{type:Id,format:Rn,depthBuffer:!1})}dispose(){this._pmremNode.value=null,this._pmremNode.dispose(),this.quad.material.dispose(),this.renderTarget.dispose()}async generate(e,t=0,r=null,a=null){let{renderTarget:s,quad:i,renderer:o}=this,l=e.clone();r=r??l.image.width,a=a??l.image.height,s.setSize(r,a),s.texture.colorSpace=l.colorSpace,this._pmremNode.value=l,this._blur.value=t;let h=o.getRenderTarget();o.setRenderTarget(s),i.render(o),o.setRenderTarget(h);let n=await o.readRenderTargetPixelsAsync(s,0,0,r,a),f=new Uint16Array(r*a*4);for(let p=0,u=f.length;p<u;p++)f[p]=Dd.toHalfFloat(n[p]);let m=new Rd(f,r,a,Rn,_d);return m.minFilter=l.minFilter,m.magFilter=l.magFilter,m.wrapS=l.wrapS,m.wrapT=l.wrapT,m.mapping=Cd,m.colorSpace=l.colorSpace,m.needsUpdate=!0,this._pmremNode.value=null,l.dispose(),m}};import{EventDispatcher as Hd,ExternalTexture as zd}from"three/webgpu";import{textureStore as Mi,globalId as kd}from"three/tsl";var $a=class extends S{constructor(){let e={auxTarget:Mi(Z()).toReadOnly(),albedoTarget:Mi(Qe()).toWriteOnly(),normalTarget:Mi(Qe()).toWriteOnly(),globalId:kd},t=d`
			fn compute( globalId: vec3u ) -> void {

				let dims = textureDimensions( ${e.auxTarget} );
				if ( globalId.x >= dims.x || globalId.y >= dims.y ) {

					return;

				}

				var packed: vec3u;
				for ( var layer = 0u; layer < ${L}u; layer ++ ) {

					packed[ layer ] = textureLoad( ${e.auxTarget}, globalId.xy, layer ).r;

				}

				textureStore( ${e.albedoTarget}, globalId.xy, vec4f( ${_t}( packed ), 1.0 ) );
				textureStore( ${e.normalTarget}, globalId.xy, vec4f( ${Rt}( packed ), 1.0 ) );

			}
		`;super(t(e)),this.defineUniformAccessors(e)}};var Mn=class extends Hd{get texture(){return this._texture}get complete(){return this._complete}get running(){return this._running}constructor(e={}){super();let{initUNetFromURL:t,auxWeightsUrl:r,colorWeightsUrl:a,useAuxiliaryBuffers:s=!0,maxTileSize:i=null,dynamicTile:o=null}=e;if(!t)throw new Error('OIDNDenoiser: "initUNetFromURL" from "oidn-webgpu" must be provided.');this.initUNetFromURL=t,this.auxWeightsUrl=r,this.colorWeightsUrl=a,this.useAuxiliaryBuffers=s,this.maxTileSize=i,this.dynamicTile=o,this.renderer=null,this._texture=null,this._running=!1,this._complete=!1,this._abort=null,this._requestId=0,this._failed=!1,this._unets={aux:null,color:null},this._resultPipeline=null,this._rawTexture=null,this._unpackAuxKernel=new $a().setWorkgroupSize(8,8,1),this._albedoTarget=Qe("Denoiser Albedo"),this._normalTarget=Qe("Denoiser Normal")}init(e){this.renderer=e}update(e,t=null){if(this._complete||this._running||this._failed)return this._texture;let r=null,a=null;return this.useAuxiliaryBuffers&&t&&(this._unpackAux(t),r=this._albedoTarget,a=this._normalTarget),this.denoise(e,r,a).catch(s=>{this._failed=!0,this.dispatchEvent({type:"error",error:s})}),this._texture}async denoise(e,t=null,r=null){if(this._complete||this._running)return;this._running=!0;let a=!!(t&&r),s=++this._requestId,i;try{i=await this._initUNet(a)}catch(m){throw this._running=!1,m}if(s!==this._requestId||!this._running)return;let{renderer:o}=this,l=o.backend;o.initTexture(e);let{width:h,height:n}=e,f={color:{data:l.get(e).texture,width:h,height:n},scheduling:"animation-frame",progress:(m,p,u,g,x)=>{this._copyOutputToTexture(m,h,n),this.dispatchEvent({type:"progress",progress:(g+1)/x})},done:m=>{this._running=!1,this._complete=!0,this._abort=null,this._disposeAuxImages()}};a&&(o.initTexture(t),o.initTexture(r),f.albedo={data:l.get(t).texture,width:h,height:n},f.normal={data:l.get(r).texture,width:h,height:n}),this._abort=i.tileExecute(f)}reset(){this._abort?.(),this._abort=null,this._texture?.dispose(),this._texture=null,this._rawTexture?.destroy(),this._rawTexture=null,this._disposeAuxImages(),this._running=!1,this._complete=!1,this._failed=!1}dispose(){this.reset(),this._unpackAuxKernel.dispose();for(let e in this._unets)this._unets[e]?.then(t=>t.dispose()),this._unets[e]=null}_unpackAux(e){let{renderer:t,_unpackAuxKernel:r,_albedoTarget:a,_normalTarget:s}=this,{width:i,height:o}=e.image;a.setSize(i,o),s.setSize(i,o),r.auxTarget=e,r.albedoTarget=a,r.normalTarget=s,t.compute(r.kernel,r.getDispatchSize(i,o))}_disposeAuxImages(){this._albedoTarget.dispose(),this._normalTarget.dispose()}_initUNet(e){let t=e?"aux":"color";return this._unets[t]||(this._unets[t]=(async()=>{let r=this.renderer.backend.device,a=e?this.auxWeightsUrl:this.colorWeightsUrl;if(!a)throw new Error(`OIDNDenoiser: no ${e?"auxWeightsUrl":"colorWeightsUrl"} was provided.`);let s={aux:e,hdr:!0};return this.maxTileSize!==null&&(s.maxTileSize=this.maxTileSize),this.dynamicTile!==null&&(s.dynamicTile=this.dynamicTile),this.initUNetFromURL(a,{device:r},s)})()),this._unets[t]}_copyOutputToTexture(e,t,r){let a=this.renderer.backend.device;if(!this._resultPipeline){let l=a.createShaderModule({code:`
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
				`});this._resultPipeline=a.createComputePipeline({layout:"auto",compute:{module:l,entryPoint:"main"}})}(!this._rawTexture||this._rawTexture.width!==t||this._rawTexture.height!==r)&&(this._rawTexture?.destroy(),this._rawTexture=a.createTexture({size:[t,r],format:"rgba16float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING}),this._texture?.dispose(),this._texture=new zd(this._rawTexture),this._texture.image={width:t,height:r});let s=a.createBindGroup({layout:this._resultPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:e.data}},{binding:1,resource:this._rawTexture.createView()}]}),i=a.createCommandEncoder(),o=i.beginComputePass();o.setPipeline(this._resultPipeline),o.setBindGroup(0,s),o.dispatchWorkgroups(Math.ceil(t/8),Math.ceil(r/8)),o.end(),a.queue.submit([i.finish()])}};import{Vector2 as Ud}from"three/webgpu";var Ot=new Ud,Nn=class{constructor(e={}){let{Upscaler:t,sharpness:r=1}=e;if(!t)throw new Error('FSRUpscaler: the "Upscaler" class from "@pmndrs/upscaler" must be provided.');this.Upscaler=t,this.sharpness=r,this.renderer=null,this._upscaler=null}init(e){this.renderer=e,this._upscaler?.dispose(),this._upscaler=new this.Upscaler({renderer:e}),this._upscaler.init()}upscale(e,t){let{renderer:r,_upscaler:a}=this;return r.initTexture(e),r.getDrawingBufferSize(Ot),(a.displayWidth!==Ot.x||a.displayHeight!==Ot.y||a.renderWidth!==e.width||a.renderHeight!==e.height)&&a.configure({displayWidth:Ot.x,displayHeight:Ot.y,renderWidth:e.width,renderHeight:e.height,path:"spatial"}),a.settings.sharpness=this.sharpness,a.dispatch({color:e},t),a.outputTexture}dispose(){this._upscaler?.dispose(),this._upscaler=null}};import{Matrix4 as Od}from"three";import{uniform as Vd,PI as An}from"three/tsl";Qi.prototype.getCameraRayFn=function(){let e=Vd(new Od);return{fn:d`
		fn getCameraRay( uv: vec2f, resolution: vec2f, ray: ptr<function, ${v}> ) -> bool {

			// screen uv to spherical direction, matching three.js' equirect orientation
			let theta = ( uv.x - 0.5 ) * 2.0 * ${An};
			let phi = ( 1.0 - uv.y ) * ${An};
			let sinPhi = sin( phi );
			let direction = vec3f( sinPhi * cos( theta ), cos( phi ), sinPhi * sin( theta ) );

			// equirect ignores the projection - orient by the camera world matrix and place the origin.
			// there is no projection far plane, so the trace distance is unbounded
			ray.origin = ( ${e} * vec4f( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
			ray.direction = ( ${e} * vec4f( direction, 0.0 ) ).xyz;
			ray.maxDist = 0.0;
			return true;

		}
	`,update:()=>(e.value.copy(this.matrixWorld),!1)}};import{Matrix4 as Pn,WebGPUCoordinateSystem as Wd}from"three";import{uniform as He,PI as Bn}from"three/tsl";var qd=d`
	fn sampleCircle( uv: vec2f ) -> vec2f {

		let angle = 2.0 * ${Bn} * uv.x;
		let radius = sqrt( uv.y );
		return vec2f( cos( angle ), sin( angle ) ) * radius;

	}
`,Gd=d`
	fn sampleTriangle( a: vec2f, b: vec2f, c: vec2f, rIn: vec2f ) -> vec2f {

		let e1 = a - b;
		let e2 = c - b;

		var r = rIn;
		if ( r.x + r.y > 1.0 ) {

			r = vec2f( 1.0 ) - r;

		}

		return e1 * r.x + e2 * r.y;

	}
`,Qd=d`
	fn sampleRegularPolygon( sidesIn: i32, uvw: vec3f ) -> vec2f {

		let sides = max( sidesIn, 3 );
		let anglePerSegment = 2.0 * ${Bn} / f32( sides );
		let segment = floor( f32( sides ) * uvw.x );

		let angle1 = anglePerSegment * segment;
		let angle2 = angle1 + anglePerSegment;
		let a = vec2f( sin( angle1 ), cos( angle1 ) );
		let b = vec2f( 0.0, 0.0 );
		let c = vec2f( sin( angle2 ), cos( angle2 ) );

		return ${Gd}( a, b, c, uvw.yz );

	}
`,jd=d`
	fn sampleAperture( blades: i32, uvw: vec3f ) -> vec2f {

		if ( blades == 0 ) {

			return ${qd}( uvw.xy );

		} else {

			return ${Qd}( blades, uvw );

		}

	}
`,Kd=d`
	fn rotateVector( v: vec2f, t: f32 ) -> vec2f {

		let vc = cos( t );
		let vs = sin( t );
		return vec2f( v.x * vc - v.y * vs, v.x * vs + v.y * vc );

	}
`;zi.prototype.getCameraRayFn=function(){let e=He(new Pn),t=He(new Pn),r=He(0),a=He(0),s=He(0,"int"),i=He(0),o=He(1);return{fn:d`
		fn getCameraRay( uv: vec2f, resolution: vec2f, ray: ptr<function, ${v}> ) -> bool {

			// base ray
			let ndc = uv * 2.0 - vec2f( 1.0 );
			*ray = ${be}( ndc, ${e} );

			// camera state
			let forward = normalize( ( ${t} * vec4f( 0.0, 0.0, - 1.0, 0.0 ) ).xyz );
			let cameraOrigin = ( ${t} * vec4f( 0.0, 0.0, 0.0, 1.0 ) ).xyz;

			// depth of field
			// measure focus distance from the camera origin along the optical axis so the focal
			// surface is a flat plane perpendicular to the camera forward vector rather than a sphere
			let focalPoint = cameraOrigin + ray.direction * ( ${r} / dot( ray.direction, forward ) );
			let nearDistance = dot( ray.origin - cameraOrigin, forward );

			// sample the aperture shape
			let shapeUVW = ${Ke}( ${Hs} );
			var apertureSample = ${jd}( ${s}, shapeUVW );
			apertureSample *= ${a} * 0.5 * 1e-3;

			// rotate + squash the sample for anamorphic apertures
			apertureSample =
				${Kd}( apertureSample, ${i} )
				* vec2f( ${o}, 1.0 / ${o} );

			// aim from the aperture through the focal point, starting on the near plane like the base ray
			ray.origin = cameraOrigin + ( ${t} * vec4f( apertureSample, 0.0, 0.0 ) ).xyz;
			ray.direction = normalize( focalPoint - ray.origin );
			ray.origin += ray.direction * ( nearDistance / dot( ray.direction, forward ) );

			return true;

		}
	`,update:()=>(this.coordinateSystem=Wd,this.updateMatrixWorld(),this.updateProjectionMatrix(),e.value.multiplyMatrices(this.matrixWorld,this.projectionMatrixInverse),t.value.copy(this.matrixWorld),r.value=this.focusDistance,a.value=this.bokehSize,s.value=this.apertureBlades,i.value=this.apertureRotation,o.value=this.anamorphicRatio,!1)}};import{ArrayCamera as Xd,Matrix4 as Yd,Vector4 as Zd,WebGPUCoordinateSystem as Jd}from"three";import{uniformArray as En,int as eh}from"three/tsl";Xd.prototype.getCameraRayFn=function(){let e={fn:null,update:null},t=eh(0),r=En([],"mat4"),a=En([],"vec4");return e.fn=d`
		fn getCameraRay( uv: vec2f, resolution: vec2f, ray: ptr<function, ${v}> ) -> bool {

			let pixel = uv * resolution;

			for ( var i = 0u; i < ${t}u; i ++ ) {

				let viewport = ${a}[ i ];
				let viewportMax = viewport.xy + viewport.zw;
				if ( all( pixel >= viewport.xy ) && all( pixel < viewportMax ) ) {

					let cameraUv = ( pixel - viewport.xy ) / viewport.zw;
					let ndc = cameraUv * 2.0 - vec2f( 1.0 );
					*ray = ${be}( ndc, ${r}[ i ] );
					return true;

				}

			}

			return false;

		}
	`,e.update=()=>{let{cameras:s}=this,i=t.node.value!==s.length;for(t.node.value=s.length;a.array.length<s.length;)a.array.push(new Zd),r.array.push(new Yd);r.array.length=s.length,a.array.length=s.length;for(let o=0;o<s.length;o++){let l=s[o],h=l.viewport;l.coordinateSystem=Jd,l.updateMatrixWorld(),l.updateProjectionMatrix(),r.array[o].multiplyMatrices(l.matrixWorld,l.projectionMatrixInverse),a.array[o].copy(h)}return i},e};export{Fn as BlurredEnvMapGenerator,Nn as FSRUpscaler,Mn as OIDNDenoiser,_m as RANDOM_BLUE_DITHER,Im as RANDOM_PCG,go as RANDOM_SOBOL,ir as RenderToScreenNodeMaterial,xo as SAMPLE_ACTIVE_FLAG,me as SAMPLE_COUNT_MASK,at as SAMPLE_DISPATCHED_FLAG,Qr as TRANSMISSIVE_BACKGROUND_ENVIRONMENT,rt as TRANSMISSIVE_BACKGROUND_OVERLAY,jr as TRANSMISSIVE_BACKGROUND_TRANSPARENT,In as WebGPUPathTracer};
