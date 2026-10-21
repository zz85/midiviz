import{a as ho}from"./chunk-WOT6VMZA.js";import{PerspectiveCamera as xo}from"three";var Fn=class extends xo{set bokehSize(t){this.fStop=this.getFocalLength()/t}get bokehSize(){return this.getFocalLength()/this.fStop}constructor(...t){super(...t),this.fStop=1.4,this.apertureBlades=0,this.apertureRotation=0,this.focusDistance=25,this.anamorphicRatio=1}copy(t,e){return super.copy(t,e),this.fStop=t.fStop,this.apertureBlades=t.apertureBlades,this.apertureRotation=t.apertureRotation,this.focusDistance=t.focusDistance,this.anamorphicRatio=t.anamorphicRatio,this}};import{Camera as yo}from"three";var Dn=class extends yo{constructor(){super(),this.isEquirectCamera=!0}};import{BufferAttribute as cr,FrontSide as wi,Ray as ar,Vector3 as Bi,Matrix4 as lr}from"three";var wt=Math.pow(2,-24),rt=Symbol("SKIP_GENERATION"),oe={strategy:0,maxDepth:40,targetLeafSize:10,useSharedArrayBuffer:!1,setBoundingBox:!0,onProgress:null,indirect:!1,verbose:!0,range:null,[rt]:!1};import{Vector3 as st,Matrix4 as Ln,Line3 as Cn}from"three";import{Vector3 as go}from"three";var X=class{constructor(){this.min=1/0,this.max=-1/0}setFromPointsField(t,e){let n=1/0,r=-1/0;for(let s=0,o=t.length;s<o;s++){let l=t[s][e];n=l<n?l:n,r=l>r?l:r}this.min=n,this.max=r}setFromPoints(t,e){let n=1/0,r=-1/0;for(let s=0,o=e.length;s<o;s++){let u=e[s],l=t.dot(u);n=l<n?l:n,r=l>r?l:r}this.min=n,this.max=r}isSeparated(t){return this.min>t.max||t.min>this.max}};X.prototype.setFromBox=(function(){let i=new go;return function(e,n){let r=n.min,s=n.max,o=1/0,u=-1/0;for(let l=0;l<=1;l++)for(let p=0;p<=1;p++)for(let f=0;f<=1;f++){i.x=r.x*l+s.x*(1-l),i.y=r.y*p+s.y*(1-p),i.z=r.z*f+s.z*(1-f);let c=e.dot(i);o=Math.min(c,o),u=Math.max(c,u)}this.min=o,this.max=u}})();import{Triangle as Ao,Vector3 as Q,Vector2 as Mn,Line3 as bt,Plane as So}from"three";import{Vector3 as mt,Vector2 as vo,Plane as To,Line3 as wo}from"three";var bo=(function(){let i=new mt,t=new mt,e=new mt;return function(r,s,o){let u=r.start,l=i,p=s.start,f=t;e.subVectors(u,p),i.subVectors(r.end,r.start),t.subVectors(s.end,s.start);let c=e.dot(f),a=f.dot(l),d=f.dot(f),y=e.dot(l),v=l.dot(l)*d-a*a,T,m;v!==0?T=(c*a-y*d)/v:T=0,m=(c+T*a)/d,o.x=T,o.y=m}})(),Ut=(function(){let i=new vo,t=new mt,e=new mt;return function(r,s,o,u){bo(r,s,i);let l=i.x,p=i.y;if(l>=0&&l<=1&&p>=0&&p<=1){r.at(l,o),s.at(p,u);return}else if(l>=0&&l<=1){p<0?s.at(0,u):s.at(1,u),r.closestPointToPoint(u,!0,o);return}else if(p>=0&&p<=1){l<0?r.at(0,o):r.at(1,o),s.closestPointToPoint(o,!0,u);return}else{let f;l<0?f=r.start:f=r.end;let c;p<0?c=s.start:c=s.end;let a=t,d=e;if(r.closestPointToPoint(c,!0,t),s.closestPointToPoint(f,!0,e),a.distanceToSquared(c)<=d.distanceToSquared(f)){o.copy(a),u.copy(c);return}else{o.copy(f),u.copy(d);return}}}})(),Nn=(function(){let i=new mt,t=new mt,e=new To,n=new wo;return function(s,o){let{radius:u,center:l}=s,{a:p,b:f,c}=o;if(n.start=p,n.end=f,n.closestPointToPoint(l,!0,i).distanceTo(l)<=u||(n.start=p,n.end=c,n.closestPointToPoint(l,!0,i).distanceTo(l)<=u)||(n.start=f,n.end=c,n.closestPointToPoint(l,!0,i).distanceTo(l)<=u))return!0;let w=o.getPlane(e);if(Math.abs(w.distanceToPoint(l))<=u){let T=w.projectPoint(l,t);if(o.containsPoint(T))return!0}return!1}})();var _o=["x","y","z"],nt=1e-15,Rn=nt*nt;function K(i){return Math.abs(i)<nt}var q=class extends Ao{constructor(...t){super(...t),this.isExtendedTriangle=!0,this.satAxes=new Array(4).fill().map(()=>new Q),this.satBounds=new Array(4).fill().map(()=>new X),this.points=[this.a,this.b,this.c],this.plane=new So,this.isDegenerateIntoSegment=!1,this.isDegenerateIntoPoint=!1,this.degenerateSegment=new bt,this.needsUpdate=!0}intersectsSphere(t){return Nn(t,this)}update(){let t=this.a,e=this.b,n=this.c,r=this.points,s=this.satAxes,o=this.satBounds,u=s[0],l=o[0];this.getNormal(u),l.setFromPoints(u,r);let p=s[1],f=o[1];p.subVectors(t,e),f.setFromPoints(p,r);let c=s[2],a=o[2];c.subVectors(e,n),a.setFromPoints(c,r);let d=s[3],y=o[3];d.subVectors(n,t),y.setFromPoints(d,r);let w=p.length(),v=c.length(),T=d.length();this.isDegenerateIntoPoint=!1,this.isDegenerateIntoSegment=!1,w<nt?v<nt||T<nt?this.isDegenerateIntoPoint=!0:(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(t),this.degenerateSegment.end.copy(n)):v<nt?T<nt?this.isDegenerateIntoPoint=!0:(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(e),this.degenerateSegment.end.copy(t)):T<nt&&(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(n),this.degenerateSegment.end.copy(e)),this.plane.setFromNormalAndCoplanarPoint(u,t),this.needsUpdate=!1}};q.prototype.closestPointToSegment=(function(){let i=new Q,t=new Q,e=new bt;return function(r,s=null,o=null){let{start:u,end:l}=r,p=this.points,f,c=1/0;for(let a=0;a<3;a++){let d=(a+1)%3;e.start.copy(p[a]),e.end.copy(p[d]),Ut(e,r,i,t),f=i.distanceToSquared(t),f<c&&(c=f,s&&s.copy(i),o&&o.copy(t))}return this.closestPointToPoint(u,i),f=u.distanceToSquared(i),f<c&&(c=f,s&&s.copy(i),o&&o.copy(u)),this.closestPointToPoint(l,i),f=l.distanceToSquared(i),f<c&&(c=f,s&&s.copy(i),o&&o.copy(l)),Math.sqrt(c)}})();q.prototype.intersectsTriangle=(function(){let i=new q,t=new X,e=new X,n=new Q,r=new Q,s=new Q,o=new Q,u=new bt,l=new bt,p=new Q,f=new Mn,c=new Mn;function a(h,x,g,A){let b=n;!h.isDegenerateIntoPoint&&!h.isDegenerateIntoSegment?b.copy(h.plane.normal):b.copy(x.plane.normal);let _=h.satBounds,P=h.satAxes;for(let B=1;B<4;B++){let E=_[B],F=P[B];if(t.setFromPoints(F,x.points),E.isSeparated(t)||(o.copy(b).cross(F),t.setFromPoints(o,h.points),e.setFromPoints(o,x.points),t.isSeparated(e)))return!1}let S=x.satBounds,I=x.satAxes;for(let B=1;B<4;B++){let E=S[B],F=I[B];if(t.setFromPoints(F,h.points),E.isSeparated(t)||(o.crossVectors(b,F),t.setFromPoints(o,h.points),e.setFromPoints(o,x.points),t.isSeparated(e)))return!1}return g&&(A||console.warn("ExtendedTriangle.intersectsTriangle: Triangles are coplanar which does not support an output edge. Setting edge to 0, 0, 0."),g.start.set(0,0,0),g.end.set(0,0,0)),!0}function d(h,x,g,A,b,_,P,S,I,B,E){let F=P/(P-S);B.x=A+(b-A)*F,E.start.subVectors(x,h).multiplyScalar(F).add(h),F=P/(P-I),B.y=A+(_-A)*F,E.end.subVectors(g,h).multiplyScalar(F).add(h)}function y(h,x,g,A,b,_,P,S,I,B,E){if(b>0)d(h.c,h.a,h.b,A,x,g,I,P,S,B,E);else if(_>0)d(h.b,h.a,h.c,g,x,A,S,P,I,B,E);else if(S*I>0||P!=0)d(h.a,h.b,h.c,x,g,A,P,S,I,B,E);else if(S!=0)d(h.b,h.a,h.c,g,x,A,S,P,I,B,E);else if(I!=0)d(h.c,h.a,h.b,A,x,g,I,P,S,B,E);else return!0;return!1}function w(h,x,g,A){let b=x.degenerateSegment,_=h.plane.distanceToPoint(b.start),P=h.plane.distanceToPoint(b.end);return K(_)?K(P)?a(h,x,g,A):(g&&(g.start.copy(b.start),g.end.copy(b.start)),h.containsPoint(b.start)):K(P)?(g&&(g.start.copy(b.end),g.end.copy(b.end)),h.containsPoint(b.end)):h.plane.intersectLine(b,n)!=null?(g&&(g.start.copy(n),g.end.copy(n)),h.containsPoint(n)):!1}function v(h,x,g){let A=x.a;return K(h.plane.distanceToPoint(A))&&h.containsPoint(A)?(g&&(g.start.copy(A),g.end.copy(A)),!0):!1}function T(h,x,g){let A=h.degenerateSegment,b=x.a;return A.closestPointToPoint(b,!0,n),b.distanceToSquared(n)<Rn?(g&&(g.start.copy(b),g.end.copy(b)),!0):!1}function m(h,x,g,A){if(h.isDegenerateIntoSegment)if(x.isDegenerateIntoSegment){let b=h.degenerateSegment,_=x.degenerateSegment,P=r,S=s;b.delta(P),_.delta(S);let I=n.subVectors(_.start,b.start),B=P.x*S.y-P.y*S.x;if(K(B))return!1;let E=(I.x*S.y-I.y*S.x)/B,F=-(P.x*I.y-P.y*I.x)/B;if(E<0||E>1||F<0||F>1)return!1;let D=b.start.z+P.z*E,V=_.start.z+S.z*F;return K(D-V)?(g&&(g.start.copy(b.start).addScaledVector(P,E),g.end.copy(b.start).addScaledVector(P,E)),!0):!1}else return x.isDegenerateIntoPoint?T(h,x,g):w(x,h,g,A);else{if(h.isDegenerateIntoPoint)return x.isDegenerateIntoPoint?x.a.distanceToSquared(h.a)<Rn?(g&&(g.start.copy(h.a),g.end.copy(h.a)),!0):!1:x.isDegenerateIntoSegment?T(x,h,g):v(x,h,g);if(x.isDegenerateIntoPoint)return v(h,x,g);if(x.isDegenerateIntoSegment)return w(h,x,g,A)}}return function(x,g=null,A=!1){this.needsUpdate&&this.update(),x.isExtendedTriangle?x.needsUpdate&&x.update():(i.copy(x),i.update(),x=i);let b=m(this,x,g,A);if(b!==void 0)return b;let _=this.plane,P=x.plane,S=P.distanceToPoint(this.a),I=P.distanceToPoint(this.b),B=P.distanceToPoint(this.c);K(S)&&(S=0),K(I)&&(I=0),K(B)&&(B=0);let E=S*I,F=S*B;if(E>0&&F>0)return!1;let D=_.distanceToPoint(x.a),V=_.distanceToPoint(x.b),ie=_.distanceToPoint(x.c);K(D)&&(D=0),K(V)&&(V=0),K(ie)&&(ie=0);let Pn=D*V,In=D*ie;if(Pn>0&&In>0)return!1;r.copy(_.normal),s.copy(P.normal);let Ve=r.cross(s),He=0,ke=Math.abs(Ve.x),En=Math.abs(Ve.y);En>ke&&(ke=En,He=1),Math.abs(Ve.z)>ke&&(He=2);let Tt=_o[He],ao=this.a[Tt],lo=this.b[Tt],uo=this.c[Tt],fo=x.a[Tt],po=x.b[Tt],mo=x.c[Tt];if(y(this,ao,lo,uo,E,F,S,I,B,f,u))return a(this,x,g,A);if(y(x,fo,po,mo,Pn,In,D,V,ie,c,l))return a(this,x,g,A);if(f.y<f.x){let qe=f.y;f.y=f.x,f.x=qe,p.copy(u.start),u.start.copy(u.end),u.end.copy(p)}if(c.y<c.x){let qe=c.y;c.y=c.x,c.x=qe,p.copy(l.start),l.start.copy(l.end),l.end.copy(p)}return f.y<c.x||c.y<f.x?!1:(g&&(c.x>f.x?g.start.copy(l.start):g.start.copy(u.start),c.y<f.y?g.end.copy(l.end):g.end.copy(u.end)),!0)}})();q.prototype.distanceToPoint=(function(){let i=new Q;return function(e){return this.closestPointToPoint(e,i),e.distanceTo(i)}})();q.prototype.distanceToTriangle=(function(){let i=new Q,t=new Q,e=["a","b","c"],n=new bt,r=new bt;return function(o,u=null,l=null){let p=u||l?n:null;if(this.intersectsTriangle(o,p,!0))return(u||l)&&(u&&p.getCenter(u),l&&p.getCenter(l)),0;let f=1/0;for(let c=0;c<3;c++){let a,d=e[c],y=o[d];this.closestPointToPoint(y,i),a=y.distanceToSquared(i),a<f&&(f=a,u&&u.copy(i),l&&l.copy(y));let w=this[d];o.closestPointToPoint(w,i),a=w.distanceToSquared(i),a<f&&(f=a,u&&u.copy(w),l&&l.copy(i))}for(let c=0;c<3;c++){let a=e[c],d=e[(c+1)%3];n.set(this[a],this[d]);for(let y=0;y<3;y++){let w=e[y],v=e[(y+1)%3];r.set(o[w],o[v]),Ut(n,r,i,t);let T=i.distanceToSquared(t);T<f&&(f=T,u&&u.copy(i),l&&l.copy(t))}}return Math.sqrt(f)}})();var H=class{constructor(t,e,n){this.isOrientedBox=!0,this.min=new st,this.max=new st,this.matrix=new Ln,this.invMatrix=new Ln,this.points=new Array(8).fill().map(()=>new st),this.satAxes=new Array(3).fill().map(()=>new st),this.satBounds=new Array(3).fill().map(()=>new X),this.alignedSatBounds=new Array(3).fill().map(()=>new X),this.needsUpdate=!1,t&&this.min.copy(t),e&&this.max.copy(e),n&&this.matrix.copy(n)}set(t,e,n){this.min.copy(t),this.max.copy(e),this.matrix.copy(n),this.needsUpdate=!0}copy(t){this.min.copy(t.min),this.max.copy(t.max),this.matrix.copy(t.matrix),this.needsUpdate=!0}};H.prototype.update=(function(){return function(){let t=this.matrix,e=this.min,n=this.max,r=this.points;for(let p=0;p<=1;p++)for(let f=0;f<=1;f++)for(let c=0;c<=1;c++){let a=1*p|2*f|4*c,d=r[a];d.x=p?n.x:e.x,d.y=f?n.y:e.y,d.z=c?n.z:e.z,d.applyMatrix4(t)}let s=this.satBounds,o=this.satAxes,u=r[0];for(let p=0;p<3;p++){let f=o[p],c=s[p],a=1<<p,d=r[a];f.subVectors(u,d),c.setFromPoints(f,r)}let l=this.alignedSatBounds;l[0].setFromPointsField(r,"x"),l[1].setFromPointsField(r,"y"),l[2].setFromPointsField(r,"z"),this.invMatrix.copy(this.matrix).invert(),this.needsUpdate=!1}})();H.prototype.intersectsBox=(function(){let i=new X;return function(e){this.needsUpdate&&this.update();let n=e.min,r=e.max,s=this.satBounds,o=this.satAxes,u=this.alignedSatBounds;if(i.min=n.x,i.max=r.x,u[0].isSeparated(i)||(i.min=n.y,i.max=r.y,u[1].isSeparated(i))||(i.min=n.z,i.max=r.z,u[2].isSeparated(i)))return!1;for(let l=0;l<3;l++){let p=o[l],f=s[l];if(i.setFromBox(p,e),f.isSeparated(i))return!1}return!0}})();H.prototype.intersectsTriangle=(function(){let i=new q,t=new Array(3),e=new X,n=new X,r=new st;return function(o){this.needsUpdate&&this.update(),o.isExtendedTriangle?o.needsUpdate&&o.update():(i.copy(o),i.update(),o=i);let u=this.satBounds,l=this.satAxes;t[0]=o.a,t[1]=o.b,t[2]=o.c;for(let a=0;a<3;a++){let d=u[a],y=l[a];if(e.setFromPoints(y,t),d.isSeparated(e))return!1}let p=o.satBounds,f=o.satAxes,c=this.points;for(let a=0;a<3;a++){let d=p[a],y=f[a];if(e.setFromPoints(y,c),d.isSeparated(e))return!1}for(let a=0;a<3;a++){let d=l[a];for(let y=0;y<4;y++){let w=f[y];if(r.crossVectors(d,w),e.setFromPoints(r,t),n.setFromPoints(r,c),e.isSeparated(n))return!1}}return!0}})();H.prototype.closestPointToPoint=(function(){return function(t,e){return this.needsUpdate&&this.update(),e.copy(t).applyMatrix4(this.invMatrix).clamp(this.min,this.max).applyMatrix4(this.matrix),e}})();H.prototype.distanceToPoint=(function(){let i=new st;return function(e){return this.closestPointToPoint(e,i),e.distanceTo(i)}})();H.prototype.distanceToBox=(function(){let i=["x","y","z"],t=new Array(12).fill().map(()=>new Cn),e=new Array(12).fill().map(()=>new Cn),n=new st,r=new st;return function(o,u=0,l=null,p=null){if(this.needsUpdate&&this.update(),this.intersectsBox(o))return(l||p)&&(o.getCenter(r),this.closestPointToPoint(r,n),o.closestPointToPoint(n,r),l&&l.copy(n),p&&p.copy(r)),0;let f=u*u,c=o.min,a=o.max,d=this.points,y=1/0;for(let v=0;v<8;v++){let T=d[v];r.copy(T).clamp(c,a);let m=T.distanceToSquared(r);if(m<y&&(y=m,l&&l.copy(T),p&&p.copy(r),m<f))return Math.sqrt(m)}let w=0;for(let v=0;v<3;v++)for(let T=0;T<=1;T++)for(let m=0;m<=1;m++){let h=(v+1)%3,x=(v+2)%3,g=T<<h|m<<x,A=1<<v|T<<h|m<<x,b=d[g],_=d[A];t[w].set(b,_);let S=i[v],I=i[h],B=i[x],E=e[w],F=E.start,D=E.end;F[S]=c[S],F[I]=T?c[I]:a[I],F[B]=m?c[B]:a[I],D[S]=a[S],D[I]=T?c[I]:a[I],D[B]=m?c[B]:a[I],w++}for(let v=0;v<=1;v++)for(let T=0;T<=1;T++)for(let m=0;m<=1;m++){r.x=v?a.x:c.x,r.y=T?a.y:c.y,r.z=m?a.z:c.z,this.closestPointToPoint(r,n);let h=r.distanceToSquared(n);if(h<y&&(y=h,l&&l.copy(n),p&&p.copy(r),h<f))return Math.sqrt(h)}for(let v=0;v<12;v++){let T=t[v];for(let m=0;m<12;m++){let h=e[m];Ut(T,h,n,r);let x=n.distanceToSquared(r);if(x<y&&(y=x,l&&l.copy(n),p&&p.copy(r),x<f))return Math.sqrt(x)}}return Math.sqrt(y)}})();var ct=class{constructor(t){this._getNewPrimitive=t,this._primitives=[]}getPrimitive(){let t=this._primitives;return t.length===0?this._getNewPrimitive():t.pop()}releasePrimitive(t){this._primitives.push(t)}};var Ge=class extends ct{constructor(){super(()=>new q)}},W=new Ge;import{Vector3 as zn}from"three";var Ot=new zn,We=new zn;function Un(i,t,e={},n=0,r=1/0){let s=n*n,o=r*r,u=1/0,l=null;if(i.shapecast({boundsTraverseOrder:f=>(Ot.copy(t).clamp(f.min,f.max),Ot.distanceToSquared(t)),intersectsBounds:(f,c,a)=>a<u&&a<o,intersectsTriangle:(f,c)=>{f.closestPointToPoint(t,Ot);let a=t.distanceToSquared(Ot);return a<u&&(We.copy(Ot),u=a,l=c),a<s}}),u===1/0)return null;let p=Math.sqrt(u);return e.point?e.point.copy(We):e.point=We.clone(),e.distance=p,e.faceIndex=l,e}function N(i,t){return t[i+15]===65535}function R(i,t){return t[i+6]}function z(i,t){return t[i+14]}function L(i){return i+8}function C(i,t){let e=t[i+6];return i+e*8}function at(i,t){return t[i+7]}import{Vector3 as tt,Vector2 as kt,Triangle as Vt,DoubleSide as Po,BackSide as Io,REVISION as Gn}from"three";var re=parseInt(Gn)>=169,Eo=parseInt(Gn)<=161,ht=new tt,xt=new tt,yt=new tt,se=new kt,ce=new kt,ae=new kt,On=new tt,Vn=new tt,Hn=new tt,Ht=new tt;function Fo(i,t,e,n,r,s,o,u){let l;if(s===Io?l=i.intersectTriangle(n,e,t,!0,r):l=i.intersectTriangle(t,e,n,s!==Po,r),l===null)return null;let p=i.origin.distanceTo(r);return p<o||p>u?null:{distance:p,point:r.clone()}}function kn(i,t,e,n,r,s,o,u,l,p,f){ht.fromBufferAttribute(t,s),xt.fromBufferAttribute(t,o),yt.fromBufferAttribute(t,u);let c=Fo(i,ht,xt,yt,Ht,l,p,f);if(c){if(n){se.fromBufferAttribute(n,s),ce.fromBufferAttribute(n,o),ae.fromBufferAttribute(n,u),c.uv=new kt;let d=Vt.getInterpolation(Ht,ht,xt,yt,se,ce,ae,c.uv);re||(c.uv=d)}if(r){se.fromBufferAttribute(r,s),ce.fromBufferAttribute(r,o),ae.fromBufferAttribute(r,u),c.uv1=new kt;let d=Vt.getInterpolation(Ht,ht,xt,yt,se,ce,ae,c.uv1);re||(c.uv1=d),Eo&&(c.uv2=c.uv1)}if(e){On.fromBufferAttribute(e,s),Vn.fromBufferAttribute(e,o),Hn.fromBufferAttribute(e,u),c.normal=new tt;let d=Vt.getInterpolation(Ht,ht,xt,yt,On,Vn,Hn,c.normal);c.normal.dot(i.direction)>0&&c.normal.multiplyScalar(-1),re||(c.normal=d)}let a={a:s,b:o,c:u,normal:new tt,materialIndex:0};if(Vt.getNormal(ht,xt,yt,a.normal),c.face=a,c.faceIndex=s,re){let d=new tt;Vt.getBarycoord(Ht,ht,xt,yt,d),c.barycoord=d}}return c}function qn(i){return i&&i.isMaterial?i.side:i}function At(i,t,e,n,r,s,o){let u=n*3,l=u+0,p=u+1,f=u+2,{index:c,groups:a}=i;i.index&&(l=c.getX(l),p=c.getX(p),f=c.getX(f));let{position:d,normal:y,uv:w,uv1:v}=i.attributes;if(Array.isArray(t)){let T=n*3;for(let m=0,h=a.length;m<h;m++){let{start:x,count:g,materialIndex:A}=a[m];if(T>=x&&T<x+g){let b=qn(t[A]),_=kn(e,d,y,w,v,l,p,f,b,s,o);if(_)if(_.faceIndex=n,_.face.materialIndex=A,r)r.push(_);else return _}}}else{let T=qn(t),m=kn(e,d,y,w,v,l,p,f,T,s,o);if(m)if(m.faceIndex=n,m.face.materialIndex=0,r)r.push(m);else return m}return null}import{Vector2 as Ys,Vector3 as Xs,Triangle as Ks}from"three";function U(i,t,e,n){let r=i.a,s=i.b,o=i.c,u=t,l=t+1,p=t+2;e&&(u=e.getX(u),l=e.getX(l),p=e.getX(p)),r.x=n.getX(u),r.y=n.getY(u),r.z=n.getZ(u),s.x=n.getX(l),s.y=n.getY(l),s.z=n.getZ(l),o.x=n.getX(p),o.y=n.getY(p),o.z=n.getZ(p)}function Wn(i,t,e,n,r,s,o,u){let{geometry:l,_indirectBuffer:p}=i;for(let f=n,c=n+r;f<c;f++)At(l,t,e,f,s,o,u)}function Yn(i,t,e,n,r,s,o){let{geometry:u,_indirectBuffer:l}=i,p=1/0,f=null;for(let c=n,a=n+r;c<a;c++){let d;d=At(u,t,e,c,null,s,o),d&&d.distance<p&&(f=d,p=d.distance)}return f}function Xn(i,t,e,n,r,s,o){let{geometry:u}=e,{index:l}=u,p=u.attributes.position;for(let f=i,c=t+i;f<c;f++){let a;if(a=f,U(o,a*3,l,p),o.needsUpdate=!0,n(o,a,r,s))return!0}return!1}function Kn(i,t=null){t&&Array.isArray(t)&&(t=new Set(t));let e=i.geometry,n=e.index?e.index.array:null,r=e.attributes.position,s,o,u,l,p=0,f=i._roots;for(let a=0,d=f.length;a<d;a++)s=f[a],o=new Uint32Array(s),u=new Uint16Array(s),l=new Float32Array(s),c(0,p),p+=s.byteLength;function c(a,d,y=!1){let w=a*2;if(N(w,u)){let v=R(a,o),T=z(w,u),m=1/0,h=1/0,x=1/0,g=-1/0,A=-1/0,b=-1/0;for(let _=3*v,P=3*(v+T);_<P;_++){let S=n[_],I=r.getX(S),B=r.getY(S),E=r.getZ(S);I<m&&(m=I),I>g&&(g=I),B<h&&(h=B),B>A&&(A=B),E<x&&(x=E),E>b&&(b=E)}return l[a+0]!==m||l[a+1]!==h||l[a+2]!==x||l[a+3]!==g||l[a+4]!==A||l[a+5]!==b?(l[a+0]=m,l[a+1]=h,l[a+2]=x,l[a+3]=g,l[a+4]=A,l[a+5]=b,!0):!1}else{let v=L(a),T=C(a,o),m=y,h=!1,x=!1;if(t){if(!m){let S=v/8+d/32,I=T/8+d/32;h=t.has(S),x=t.has(I),m=!h&&!x}}else h=!0,x=!0;let g=m||h,A=m||x,b=!1;g&&(b=c(v,d,m));let _=!1;A&&(_=c(T,d,m));let P=b||_;if(P)for(let S=0;S<3;S++){let I=v+S,B=T+S,E=l[I],F=l[I+3],D=l[B],V=l[B+3];l[a+S]=E<D?E:D,l[a+S+3]=F>V?F:V}return P}}}function Z(i,t,e,n,r){let s,o,u,l,p,f,c=1/e.direction.x,a=1/e.direction.y,d=1/e.direction.z,y=e.origin.x,w=e.origin.y,v=e.origin.z,T=t[i],m=t[i+3],h=t[i+1],x=t[i+3+1],g=t[i+2],A=t[i+3+2];return c>=0?(s=(T-y)*c,o=(m-y)*c):(s=(m-y)*c,o=(T-y)*c),a>=0?(u=(h-w)*a,l=(x-w)*a):(u=(x-w)*a,l=(h-w)*a),s>l||u>o||((u>s||isNaN(s))&&(s=u),(l<o||isNaN(o))&&(o=l),d>=0?(p=(g-v)*d,f=(A-v)*d):(p=(A-v)*d,f=(g-v)*d),s>f||p>o)?!1:((p>s||s!==s)&&(s=p),(f<o||o!==o)&&(o=f),s<=r&&o>=n)}var Ye=class{constructor(){this.float32Array=null,this.uint16Array=null,this.uint32Array=null;let t=[],e=null;this.setBuffer=n=>{e&&t.push(e),e=n,this.float32Array=new Float32Array(n),this.uint16Array=new Uint16Array(n),this.uint32Array=new Uint32Array(n)},this.clearBuffer=()=>{e=null,this.float32Array=null,this.uint16Array=null,this.uint32Array=null,t.length!==0&&this.setBuffer(t.pop())}}},M=new Ye;function Zn(i,t,e,n,r,s,o,u){let{geometry:l,_indirectBuffer:p}=i;for(let f=n,c=n+r;f<c;f++){let a=p?p[f]:f;At(l,t,e,a,s,o,u)}}function Qn(i,t,e,n,r,s,o){let{geometry:u,_indirectBuffer:l}=i,p=1/0,f=null;for(let c=n,a=n+r;c<a;c++){let d;d=At(u,t,e,l?l[c]:c,null,s,o),d&&d.distance<p&&(f=d,p=d.distance)}return f}function $n(i,t,e,n,r,s,o){let{geometry:u}=e,{index:l}=u,p=u.attributes.position;for(let f=i,c=t+i;f<c;f++){let a;if(a=e.resolveTriangleIndex(f),U(o,a*3,l,p),o.needsUpdate=!0,n(o,a,r,s))return!0}return!1}function jn(i,t,e,n,r,s,o){M.setBuffer(i._roots[t]),Xe(0,i,e,n,r,s,o),M.clearBuffer()}function Xe(i,t,e,n,r,s,o){let{float32Array:u,uint16Array:l,uint32Array:p}=M,f=i*2;if(N(f,l)){let a=R(i,p),d=z(f,l);Wn(t,e,n,a,d,r,s,o)}else{let a=L(i);Z(a,u,n,s,o)&&Xe(a,t,e,n,r,s,o);let d=C(i,p);Z(d,u,n,s,o)&&Xe(d,t,e,n,r,s,o)}}var Do=["x","y","z"];function Jn(i,t,e,n,r,s){M.setBuffer(i._roots[t]);let o=Ke(0,i,e,n,r,s);return M.clearBuffer(),o}function Ke(i,t,e,n,r,s){let{float32Array:o,uint16Array:u,uint32Array:l}=M,p=i*2;if(N(p,u)){let c=R(i,l),a=z(p,u);return Yn(t,e,n,c,a,r,s)}else{let c=at(i,l),a=Do[c],y=n.direction[a]>=0,w,v;y?(w=L(i),v=C(i,l)):(w=C(i,l),v=L(i));let m=Z(w,o,n,r,s)?Ke(w,t,e,n,r,s):null;if(m){let g=m.point[a];if(y?g<=o[v+c]:g>=o[v+c+3])return m}let x=Z(v,o,n,r,s)?Ke(v,t,e,n,r,s):null;return m&&x?m.distance<=x.distance?m:x:m||x||null}}import{Box3 as Lo,Matrix4 as Co}from"three";function O(i,t,e){return e.min.x=t[i],e.min.y=t[i+1],e.min.z=t[i+2],e.max.x=t[i+3],e.max.y=t[i+4],e.max.z=t[i+5],e}function qt(i){let t=-1,e=-1/0;for(let n=0;n<3;n++){let r=i[n+3]-i[n];r>e&&(e=r,t=n)}return t}function Ze(i,t){t.set(i)}function Qe(i,t,e){let n,r;for(let s=0;s<3;s++){let o=s+3;n=i[s],r=t[s],e[s]=n<r?n:r,n=i[o],r=t[o],e[o]=n>r?n:r}}function Gt(i,t,e){for(let n=0;n<3;n++){let r=t[i+2*n],s=t[i+2*n+1],o=r-s,u=r+s;o<e[n]&&(e[n]=o),u>e[n+3]&&(e[n+3]=u)}}function St(i){let t=i[3]-i[0],e=i[4]-i[1],n=i[5]-i[2];return 2*(t*e+e*n+n*t)}import{BufferAttribute as No}from"three";function Wt(i){return i.index?i.index.count:i.attributes.position.count}function lt(i){return Wt(i)/3}function $e(i,t=ArrayBuffer){return i>65535?new Uint32Array(new t(4*i)):new Uint16Array(new t(2*i))}function ti(i,t){if(!i.index){let e=i.attributes.position.count,n=t.useSharedArrayBuffer?SharedArrayBuffer:ArrayBuffer,r=$e(e,n);i.setIndex(new No(r,1));for(let s=0;s<e;s++)r[s]=s}}function Mo(i,t,e){let n=Wt(i)/e,r=t||i.drawRange,s=r.start/e,o=(r.start+r.count)/e,u=Math.max(0,s),l=Math.min(n,o)-u;return{offset:Math.floor(u),count:Math.floor(l)}}function Ro(i,t){return i.groups.map(e=>({offset:e.start/t,count:e.count/t}))}function je(i,t,e){let n=Mo(i,t,e),r=Ro(i,e);if(!r.length)return[n];let s=[],o=n.offset,u=n.offset+n.count,l=Wt(i)/e,p=[];for(let a of r){let{offset:d,count:y}=a,w=d,v=isFinite(y)?y:l-d,T=d+v;w<u&&T>o&&(p.push({pos:Math.max(o,w),isStart:!0}),p.push({pos:Math.min(u,T),isStart:!1}))}p.sort((a,d)=>a.pos!==d.pos?a.pos-d.pos:a.type==="end"?-1:1);let f=0,c=null;for(let a of p){let d=a.pos;f!==0&&d!==c&&s.push({offset:c,count:d-c}),f+=a.isStart?1:-1,c=d}return s}var le=new Lo,_t=new q,Bt=new q,Yt=new Co,ei=new H,ue=new H;function ni(i,t,e,n){M.setBuffer(i._roots[t]);let r=Je(0,i,e,n);return M.clearBuffer(),r}function Je(i,t,e,n,r=null){let{float32Array:s,uint16Array:o,uint32Array:u}=M,l=i*2;if(r===null&&(e.boundingBox||e.computeBoundingBox(),ei.set(e.boundingBox.min,e.boundingBox.max,n),r=ei),N(l,o)){let f=t.geometry,c=f.index,a=f.attributes.position,d=e.index,y=e.attributes.position,w=R(i,u),v=z(l,o);if(Yt.copy(n).invert(),e.boundsTree)return O(i,s,ue),ue.matrix.copy(Yt),ue.needsUpdate=!0,e.boundsTree.shapecast({intersectsBounds:m=>ue.intersectsBox(m),intersectsTriangle:m=>{m.a.applyMatrix4(n),m.b.applyMatrix4(n),m.c.applyMatrix4(n),m.needsUpdate=!0;for(let h=w*3,x=(v+w)*3;h<x;h+=3)if(U(Bt,h,c,a),Bt.needsUpdate=!0,m.intersectsTriangle(Bt))return!0;return!1}});{let T=lt(e);for(let m=w*3,h=(v+w)*3;m<h;m+=3){U(_t,m,c,a),_t.a.applyMatrix4(Yt),_t.b.applyMatrix4(Yt),_t.c.applyMatrix4(Yt),_t.needsUpdate=!0;for(let x=0,g=T*3;x<g;x+=3)if(U(Bt,x,d,y),Bt.needsUpdate=!0,_t.intersectsTriangle(Bt))return!0}}}else{let f=L(i),c=C(i,u);return O(f,s,le),!!(r.intersectsBox(le)&&Je(f,t,e,n,r)||(O(c,s,le),r.intersectsBox(le)&&Je(c,t,e,n,r)))}}import{Matrix4 as zo,Vector3 as de}from"three";var pe=new zo,tn=new H,Xt=new H,Uo=new de,Oo=new de,Vo=new de,Ho=new de;function ii(i,t,e,n={},r={},s=0,o=1/0){t.boundingBox||t.computeBoundingBox(),tn.set(t.boundingBox.min,t.boundingBox.max,e),tn.needsUpdate=!0;let u=i.geometry,l=u.attributes.position,p=u.index,f=t.attributes.position,c=t.index,a=W.getPrimitive(),d=W.getPrimitive(),y=Uo,w=Oo,v=null,T=null;r&&(v=Vo,T=Ho);let m=1/0,h=null,x=null;return pe.copy(e).invert(),Xt.matrix.copy(pe),i.shapecast({boundsTraverseOrder:g=>tn.distanceToBox(g),intersectsBounds:(g,A,b)=>b<m&&b<o?(A&&(Xt.min.copy(g.min),Xt.max.copy(g.max),Xt.needsUpdate=!0),!0):!1,intersectsRange:(g,A)=>{if(t.boundsTree)return t.boundsTree.shapecast({boundsTraverseOrder:_=>Xt.distanceToBox(_),intersectsBounds:(_,P,S)=>S<m&&S<o,intersectsRange:(_,P)=>{for(let S=_,I=_+P;S<I;S++){U(d,3*S,c,f),d.a.applyMatrix4(e),d.b.applyMatrix4(e),d.c.applyMatrix4(e),d.needsUpdate=!0;for(let B=g,E=g+A;B<E;B++){U(a,3*B,p,l),a.needsUpdate=!0;let F=a.distanceToTriangle(d,y,v);if(F<m&&(w.copy(y),T&&T.copy(v),m=F,h=B,x=S),F<s)return!0}}}});{let b=lt(t);for(let _=0,P=b;_<P;_++){U(d,3*_,c,f),d.a.applyMatrix4(e),d.b.applyMatrix4(e),d.c.applyMatrix4(e),d.needsUpdate=!0;for(let S=g,I=g+A;S<I;S++){U(a,3*S,p,l),a.needsUpdate=!0;let B=a.distanceToTriangle(d,y,v);if(B<m&&(w.copy(y),T&&T.copy(v),m=B,h=S,x=_),B<s)return!0}}}}}),W.releasePrimitive(a),W.releasePrimitive(d),m===1/0?null:(n.point?n.point.copy(w):n.point=w.clone(),n.distance=m,n.faceIndex=h,r&&(r.point?r.point.copy(T):r.point=T.clone(),r.point.applyMatrix4(pe),w.applyMatrix4(pe),r.distance=w.sub(r.point).length(),r.faceIndex=x),n)}function oi(i,t=null){t&&Array.isArray(t)&&(t=new Set(t));let e=i.geometry,n=e.index?e.index.array:null,r=e.attributes.position,s,o,u,l,p=0,f=i._roots;for(let a=0,d=f.length;a<d;a++)s=f[a],o=new Uint32Array(s),u=new Uint16Array(s),l=new Float32Array(s),c(0,p),p+=s.byteLength;function c(a,d,y=!1){let w=a*2;if(N(w,u)){let v=R(a,o),T=z(w,u),m=1/0,h=1/0,x=1/0,g=-1/0,A=-1/0,b=-1/0;for(let _=v,P=v+T;_<P;_++){let S=3*i.resolveTriangleIndex(_);for(let I=0;I<3;I++){let B=S+I;B=n?n[B]:B;let E=r.getX(B),F=r.getY(B),D=r.getZ(B);E<m&&(m=E),E>g&&(g=E),F<h&&(h=F),F>A&&(A=F),D<x&&(x=D),D>b&&(b=D)}}return l[a+0]!==m||l[a+1]!==h||l[a+2]!==x||l[a+3]!==g||l[a+4]!==A||l[a+5]!==b?(l[a+0]=m,l[a+1]=h,l[a+2]=x,l[a+3]=g,l[a+4]=A,l[a+5]=b,!0):!1}else{let v=L(a),T=C(a,o),m=y,h=!1,x=!1;if(t){if(!m){let S=v/8+d/32,I=T/8+d/32;h=t.has(S),x=t.has(I),m=!h&&!x}}else h=!0,x=!0;let g=m||h,A=m||x,b=!1;g&&(b=c(v,d,m));let _=!1;A&&(_=c(T,d,m));let P=b||_;if(P)for(let S=0;S<3;S++){let I=v+S,B=T+S,E=l[I],F=l[I+3],D=l[B],V=l[B+3];l[a+S]=E<D?E:D,l[a+S+3]=F>V?F:V}return P}}}function ri(i,t,e,n,r,s,o){M.setBuffer(i._roots[t]),en(0,i,e,n,r,s,o),M.clearBuffer()}function en(i,t,e,n,r,s,o){let{float32Array:u,uint16Array:l,uint32Array:p}=M,f=i*2;if(N(f,l)){let a=R(i,p),d=z(f,l);Zn(t,e,n,a,d,r,s,o)}else{let a=L(i);Z(a,u,n,s,o)&&en(a,t,e,n,r,s,o);let d=C(i,p);Z(d,u,n,s,o)&&en(d,t,e,n,r,s,o)}}var ko=["x","y","z"];function si(i,t,e,n,r,s){M.setBuffer(i._roots[t]);let o=nn(0,i,e,n,r,s);return M.clearBuffer(),o}function nn(i,t,e,n,r,s){let{float32Array:o,uint16Array:u,uint32Array:l}=M,p=i*2;if(N(p,u)){let c=R(i,l),a=z(p,u);return Qn(t,e,n,c,a,r,s)}else{let c=at(i,l),a=ko[c],y=n.direction[a]>=0,w,v;y?(w=L(i),v=C(i,l)):(w=C(i,l),v=L(i));let m=Z(w,o,n,r,s)?nn(w,t,e,n,r,s):null;if(m){let g=m.point[a];if(y?g<=o[v+c]:g>=o[v+c+3])return m}let x=Z(v,o,n,r,s)?nn(v,t,e,n,r,s):null;return m&&x?m.distance<=x.distance?m:x:m||x||null}}import{Box3 as qo,Matrix4 as Go}from"three";var me=new qo,Pt=new q,It=new q,Kt=new Go,ci=new H,he=new H;function ai(i,t,e,n){M.setBuffer(i._roots[t]);let r=on(0,i,e,n);return M.clearBuffer(),r}function on(i,t,e,n,r=null){let{float32Array:s,uint16Array:o,uint32Array:u}=M,l=i*2;if(r===null&&(e.boundingBox||e.computeBoundingBox(),ci.set(e.boundingBox.min,e.boundingBox.max,n),r=ci),N(l,o)){let f=t.geometry,c=f.index,a=f.attributes.position,d=e.index,y=e.attributes.position,w=R(i,u),v=z(l,o);if(Kt.copy(n).invert(),e.boundsTree)return O(i,s,he),he.matrix.copy(Kt),he.needsUpdate=!0,e.boundsTree.shapecast({intersectsBounds:m=>he.intersectsBox(m),intersectsTriangle:m=>{m.a.applyMatrix4(n),m.b.applyMatrix4(n),m.c.applyMatrix4(n),m.needsUpdate=!0;for(let h=w,x=v+w;h<x;h++)if(U(It,3*t.resolveTriangleIndex(h),c,a),It.needsUpdate=!0,m.intersectsTriangle(It))return!0;return!1}});{let T=lt(e);for(let m=w,h=v+w;m<h;m++){let x=t.resolveTriangleIndex(m);U(Pt,3*x,c,a),Pt.a.applyMatrix4(Kt),Pt.b.applyMatrix4(Kt),Pt.c.applyMatrix4(Kt),Pt.needsUpdate=!0;for(let g=0,A=T*3;g<A;g+=3)if(U(It,g,d,y),It.needsUpdate=!0,Pt.intersectsTriangle(It))return!0}}}else{let f=L(i),c=C(i,u);return O(f,s,me),!!(r.intersectsBox(me)&&on(f,t,e,n,r)||(O(c,s,me),r.intersectsBox(me)&&on(c,t,e,n,r)))}}import{Matrix4 as Wo,Vector3 as ye}from"three";var xe=new Wo,rn=new H,Zt=new H,Yo=new ye,Xo=new ye,Ko=new ye,Zo=new ye;function li(i,t,e,n={},r={},s=0,o=1/0){t.boundingBox||t.computeBoundingBox(),rn.set(t.boundingBox.min,t.boundingBox.max,e),rn.needsUpdate=!0;let u=i.geometry,l=u.attributes.position,p=u.index,f=t.attributes.position,c=t.index,a=W.getPrimitive(),d=W.getPrimitive(),y=Yo,w=Xo,v=null,T=null;r&&(v=Ko,T=Zo);let m=1/0,h=null,x=null;return xe.copy(e).invert(),Zt.matrix.copy(xe),i.shapecast({boundsTraverseOrder:g=>rn.distanceToBox(g),intersectsBounds:(g,A,b)=>b<m&&b<o?(A&&(Zt.min.copy(g.min),Zt.max.copy(g.max),Zt.needsUpdate=!0),!0):!1,intersectsRange:(g,A)=>{if(t.boundsTree){let b=t.boundsTree;return b.shapecast({boundsTraverseOrder:_=>Zt.distanceToBox(_),intersectsBounds:(_,P,S)=>S<m&&S<o,intersectsRange:(_,P)=>{for(let S=_,I=_+P;S<I;S++){let B=b.resolveTriangleIndex(S);U(d,3*B,c,f),d.a.applyMatrix4(e),d.b.applyMatrix4(e),d.c.applyMatrix4(e),d.needsUpdate=!0;for(let E=g,F=g+A;E<F;E++){let D=i.resolveTriangleIndex(E);U(a,3*D,p,l),a.needsUpdate=!0;let V=a.distanceToTriangle(d,y,v);if(V<m&&(w.copy(y),T&&T.copy(v),m=V,h=E,x=S),V<s)return!0}}}})}else{let b=lt(t);for(let _=0,P=b;_<P;_++){U(d,3*_,c,f),d.a.applyMatrix4(e),d.b.applyMatrix4(e),d.c.applyMatrix4(e),d.needsUpdate=!0;for(let S=g,I=g+A;S<I;S++){let B=i.resolveTriangleIndex(S);U(a,3*B,p,l),a.needsUpdate=!0;let E=a.distanceToTriangle(d,y,v);if(E<m&&(w.copy(y),T&&T.copy(v),m=E,h=S,x=_),E<s)return!0}}}}}),W.releasePrimitive(a),W.releasePrimitive(d),m===1/0?null:(n.point?n.point.copy(w):n.point=w.clone(),n.distance=m,n.faceIndex=h,r&&(r.point?r.point.copy(T):r.point=T.clone(),r.point.applyMatrix4(xe),w.applyMatrix4(xe),r.distance=w.sub(r.point).length(),r.faceIndex=x),n)}function sn(i,t,e){return i===null?null:(i.point.applyMatrix4(t.matrixWorld),i.distance=i.point.distanceTo(e.ray.origin),i.object=t,i)}import{Box3 as rr}from"three";function ui(){return typeof SharedArrayBuffer<"u"}import{Box3 as or}from"three";function ge(i,t,e,n,r){let s=1/0,o=1/0,u=1/0,l=-1/0,p=-1/0,f=-1/0,c=1/0,a=1/0,d=1/0,y=-1/0,w=-1/0,v=-1/0,T=i.offset||0;for(let m=(t-T)*6,h=(t+e-T)*6;m<h;m+=6){let x=i[m+0],g=i[m+1],A=x-g,b=x+g;A<s&&(s=A),b>l&&(l=b),x<c&&(c=x),x>y&&(y=x);let _=i[m+2],P=i[m+3],S=_-P,I=_+P;S<o&&(o=S),I>p&&(p=I),_<a&&(a=_),_>w&&(w=_);let B=i[m+4],E=i[m+5],F=B-E,D=B+E;F<u&&(u=F),D>f&&(f=D),B<d&&(d=B),B>v&&(v=B)}n[0]=s,n[1]=o,n[2]=u,n[3]=l,n[4]=p,n[5]=f,r[0]=c,r[1]=a,r[2]=d,r[3]=y,r[4]=w,r[5]=v}var it=32,$o=(i,t)=>i.candidate-t.candidate,ut=new Array(it).fill().map(()=>({count:0,bounds:new Float32Array(6),rightCacheBounds:new Float32Array(6),leftCacheBounds:new Float32Array(6),candidate:0})),ve=new Float32Array(6);function pi(i,t,e,n,r,s){let o=-1,u=0;if(s===0)o=qt(t),o!==-1&&(u=(t[o]+t[o+3])/2);else if(s===1)o=qt(i),o!==-1&&(u=jo(e,n,r,o));else if(s===2){let l=St(i),p=1.25*r,f=e.offset||0,c=(n-f)*6,a=(n+r-f)*6;for(let d=0;d<3;d++){let y=t[d],T=(t[d+3]-y)/it;if(r<it/4){let m=[...ut];m.length=r;let h=0;for(let g=c;g<a;g+=6,h++){let A=m[h];A.candidate=e[g+2*d],A.count=0;let{bounds:b,leftCacheBounds:_,rightCacheBounds:P}=A;for(let S=0;S<3;S++)P[S]=1/0,P[S+3]=-1/0,_[S]=1/0,_[S+3]=-1/0,b[S]=1/0,b[S+3]=-1/0;Gt(g,e,b)}m.sort($o);let x=r;for(let g=0;g<x;g++){let A=m[g];for(;g+1<x&&m[g+1].candidate===A.candidate;)m.splice(g+1,1),x--}for(let g=c;g<a;g+=6){let A=e[g+2*d];for(let b=0;b<x;b++){let _=m[b];A>=_.candidate?Gt(g,e,_.rightCacheBounds):(Gt(g,e,_.leftCacheBounds),_.count++)}}for(let g=0;g<x;g++){let A=m[g],b=A.count,_=r-A.count,P=A.leftCacheBounds,S=A.rightCacheBounds,I=0;b!==0&&(I=St(P)/l);let B=0;_!==0&&(B=St(S)/l);let E=1+1.25*(I*b+B*_);E<p&&(o=d,p=E,u=A.candidate)}}else{for(let x=0;x<it;x++){let g=ut[x];g.count=0,g.candidate=y+T+x*T;let A=g.bounds;for(let b=0;b<3;b++)A[b]=1/0,A[b+3]=-1/0}for(let x=c;x<a;x+=6){let b=~~((e[x+2*d]-y)/T);b>=it&&(b=it-1);let _=ut[b];_.count++,Gt(x,e,_.bounds)}let m=ut[it-1];Ze(m.bounds,m.rightCacheBounds);for(let x=it-2;x>=0;x--){let g=ut[x],A=ut[x+1];Qe(g.bounds,A.rightCacheBounds,g.rightCacheBounds)}let h=0;for(let x=0;x<it-1;x++){let g=ut[x],A=g.count,b=g.bounds,P=ut[x+1].rightCacheBounds;A!==0&&(h===0?Ze(b,ve):Qe(b,ve,ve)),h+=A;let S=0,I=0;h!==0&&(S=St(ve)/l);let B=r-h;B!==0&&(I=St(P)/l);let E=1+1.25*(S*h+I*B);E<p&&(o=d,p=E,u=g.candidate)}}}}else console.warn(`BVH: Invalid build strategy value ${s} used.`);return{axis:o,pos:u}}function jo(i,t,e,n){let r=0,s=i.offset;for(let o=t,u=t+e;o<u;o++)r+=i[(o-s)*6+n*2];return r/e}var Et=class{constructor(){this.boundingData=new Float32Array(6)}};function di(i,t,e,n,r,s){let o=n,u=n+r-1,l=s.pos,p=s.axis*2,f=e.offset||0;for(;;){for(;o<=u&&e[(o-f)*6+p]<l;)o++;for(;o<=u&&e[(u-f)*6+p]>=l;)u--;if(o<u){for(let c=0;c<t;c++){let a=i[o*t+c];i[o*t+c]=i[u*t+c],i[u*t+c]=a}for(let c=0;c<6;c++){let a=o-f,d=u-f,y=e[a*6+c];e[a*6+c]=e[d*6+c],e[d*6+c]=y}o++,u--}else return o}}var mi,Te,cn,hi,Jo=Math.pow(2,32);function we(i){return"count"in i?1:1+we(i.left)+we(i.right)}function xi(i,t,e){return mi=new Float32Array(e),Te=new Uint32Array(e),cn=new Uint16Array(e),hi=new Uint8Array(e),an(i,t)}function an(i,t){let e=i/4,n=i/2,r="count"in t,s=t.boundingData;for(let o=0;o<6;o++)mi[e+o]=s[o];if(r)return t.buffer?(hi.set(new Uint8Array(t.buffer),i),i+t.buffer.byteLength):(Te[e+6]=t.offset,cn[n+14]=t.count,cn[n+15]=65535,i+32);{let{left:o,right:u,splitAxis:l}=t,p=i+32,f=an(p,o),c=i/32,d=f/32-c;if(d>Jo)throw new Error("MeshBVH: Cannot store relative child node offset greater than 32 bits.");return Te[e+6]=d,Te[e+7]=l,an(f,u)}}function tr(i,t,e,n,r,s){let{maxDepth:o,verbose:u,targetLeafSize:l,_strictLeafSize:p=1/0,strategy:f,onProgress:c}=r,a=i.primitiveBuffer,d=i.primitiveBufferStride,y=new Float32Array(6),w=!1,v=new Et;return ge(t,e,n,v.boundingData,y),m(v,e,n,y),v;function T(h){c&&c((h-s.offset)/s.count)}function m(h,x,g,A=null,b=0){!w&&b>=o&&(w=!0,u&&console.warn(`BVH: Max depth of ${o} reached when generating BVH. Consider increasing maxDepth.`));let _=g>p;if(g<=l&&!_||b>=o)return T(x+g),h.offset=x,h.count=g,h;let P=pi(h.boundingData,A,t,x,g,f),S=P.axis===-1?-1:di(a,d,t,x,g,P);if(P.axis===-1||S===x||S===x+g){if(!_)return T(x+g),h.offset=x,h.count=g,h;P.axis=Math.max(0,qt(h.boundingData)),S=x+Math.max(1,Math.floor(g/2))}h.splitAxis=P.axis;let I=new Et,B=x,E=S-x;h.left=I,ge(t,B,E,I.boundingData,y),m(I,B,E,y,b+1);let F=new Et,D=S,V=g-E;return h.right=F,ge(t,D,V,F.boundingData,y),m(F,D,V,y,b+1),h}}function yi(i,t){let e=t.useSharedArrayBuffer?SharedArrayBuffer:ArrayBuffer,n=i.getRootRanges(t.range),r=n[0],s=n[n.length-1],o={offset:r.offset,count:s.offset+s.count-r.offset},u=new Float32Array(6*o.count);u.offset=o.offset,i.computePrimitiveBounds(o.offset,o.count,u),i._roots=n.map(l=>{let p=tr(i,u,l.offset,l.count,t,o),f=we(p),c=new e(32*f);return xi(0,p,c),c})}import{Box3 as nr}from"three";var ft,Dt,Ft=[],be=new ct(()=>new nr);function gi(i,t,e,n,r,s){ft=be.getPrimitive(),Dt=be.getPrimitive(),Ft.push(ft,Dt),M.setBuffer(i._roots[t]);let o=ln(0,i.geometry,e,n,r,s);M.clearBuffer(),be.releasePrimitive(ft),be.releasePrimitive(Dt),Ft.pop(),Ft.pop();let u=Ft.length;return u>0&&(Dt=Ft[u-1],ft=Ft[u-2]),o}function ln(i,t,e,n,r=null,s=0,o=0){let{float32Array:u,uint16Array:l,uint32Array:p}=M,f=i*2;if(N(f,l)){let a=R(i,p),d=z(f,l);return O(i,u,ft),n(a,d,!1,o,s+i/8,ft)}else{let S=function(B){let{uint16Array:E,uint32Array:F}=M,D=B*2;for(;!N(D,E);)B=L(B),D=B*2;return R(B,F)},I=function(B){let{uint16Array:E,uint32Array:F}=M,D=B*2;for(;!N(D,E);)B=C(B,F),D=B*2;return R(B,F)+z(D,E)},a=L(i),d=C(i,p),y=a,w=d,v,T,m,h;if(r&&(m=ft,h=Dt,O(y,u,m),O(w,u,h),v=r(m),T=r(h),T<v)){y=d,w=a;let B=v;v=T,T=B,m=h}m||(m=ft,O(y,u,m));let x=N(y*2,l),g=e(m,x,v,o+1,s+y/8),A;if(g===2){let B=S(y),F=I(y)-B;A=n(B,F,!0,o+1,s+y/8,m)}else A=g&&ln(y,t,e,n,r,s,o+1);if(A)return!0;h=Dt,O(w,u,h);let b=N(w*2,l),_=e(h,b,T,o+1,s+w/8),P;if(_===2){let B=S(w),F=I(w)-B;P=n(B,F,!0,o+1,s+w/8,h)}else P=_&&ln(w,t,e,n,r,s,o+1);return!!P}}import{Box3 as $t,Matrix4 as ir}from"three";var Qt=new M.constructor,Ae=new M.constructor,pt=new ct(()=>new $t),Nt=new $t,Mt=new $t,un=new $t,fn=new $t,pn=!1;function vi(i,t,e,n){if(pn)throw new Error("MeshBVH: Recursive calls to bvhcast not supported.");pn=!0;let r=i._roots,s=t._roots,o,u=0,l=0,p=new ir().copy(e).invert();for(let f=0,c=r.length;f<c;f++){Qt.setBuffer(r[f]),l=0;let a=pt.getPrimitive();O(0,Qt.float32Array,a),a.applyMatrix4(p);for(let d=0,y=s.length;d<y&&(Ae.setBuffer(s[d]),o=$(0,0,e,p,n,u,l,0,0,a),Ae.clearBuffer(),l+=s[d].byteLength/32,!o);d++);if(pt.releasePrimitive(a),Qt.clearBuffer(),u+=r[f].byteLength/32,o)break}return pn=!1,o}function $(i,t,e,n,r,s=0,o=0,u=0,l=0,p=null,f=!1){let c,a;f?(c=Ae,a=Qt):(c=Qt,a=Ae);let d=c.float32Array,y=c.uint32Array,w=c.uint16Array,v=a.float32Array,T=a.uint32Array,m=a.uint16Array,h=i*2,x=t*2,g=N(h,w),A=N(x,m),b=!1;if(A&&g)f?b=r(R(t,T),z(t*2,m),R(i,y),z(i*2,w),l,o+t/8,u,s+i/8):b=r(R(i,y),z(i*2,w),R(t,T),z(t*2,m),u,s+i/8,l,o+t/8);else if(A){let _=pt.getPrimitive();O(t,v,_),_.applyMatrix4(e);let P=L(i),S=C(i,y);O(P,d,Nt),O(S,d,Mt);let I=_.intersectsBox(Nt),B=_.intersectsBox(Mt);b=I&&$(t,P,n,e,r,o,s,l,u+1,_,!f)||B&&$(t,S,n,e,r,o,s,l,u+1,_,!f),pt.releasePrimitive(_)}else{let _=L(t),P=C(t,T);O(_,v,un),O(P,v,fn);let S=p.intersectsBox(un),I=p.intersectsBox(fn);if(S&&I)b=$(i,_,e,n,r,s,o,u,l+1,p,f)||$(i,P,e,n,r,s,o,u,l+1,p,f);else if(S)if(g)b=$(i,_,e,n,r,s,o,u,l+1,p,f);else{let B=pt.getPrimitive();B.copy(un).applyMatrix4(e);let E=L(i),F=C(i,y);O(E,d,Nt),O(F,d,Mt);let D=B.intersectsBox(Nt),V=B.intersectsBox(Mt);b=D&&$(_,E,n,e,r,o,s,l,u+1,B,!f)||V&&$(_,F,n,e,r,o,s,l,u+1,B,!f),pt.releasePrimitive(B)}else if(I)if(g)b=$(i,P,e,n,r,s,o,u,l+1,p,f);else{let B=pt.getPrimitive();B.copy(fn).applyMatrix4(e);let E=L(i),F=C(i,y);O(E,d,Nt),O(F,d,Mt);let D=B.intersectsBox(Nt),V=B.intersectsBox(Mt);b=D&&$(P,E,n,e,r,o,s,l,u+1,B,!f)||V&&$(P,F,n,e,r,o,s,l,u+1,B,!f),pt.releasePrimitive(B)}}return b}var Se=new class{constructor(){let i=null,t=null,e=null,n=!1;this.root=null,this.buffer=null,this.uint32Array=null,this.uint16Array=null,this.setBVH=(s,o)=>{if(n)throw new Error("BVHTraversalHelper: cannot call setBVH during an active traversal.");this.root=o,this.buffer=i=s._roots[o],this.uint16Array=e=new Uint16Array(i),this.uint32Array=t=new Uint32Array(i)},this.reset=()=>{this.root=null,this.buffer=i=null,this.uint16Array=e=null,this.uint32Array=t=null},this.getRangeStart=s=>{let o=s*2;for(;!N(o,e);)s=L(s),o=s*2;return R(s,t)},this.getRangeEnd=s=>{let o=s*2;for(;!N(o,e);)s=C(s,t),o=s*2;return R(s,t)+z(o,e)};let r=(s,o,u)=>{let l=o*2,p=N(l,e);if(!s(u,p,o)&&!p){let c=L(o),a=C(o,t);r(s,c,u+1),r(s,a,u+1)}};this.traverseBuffer=s=>{if(n)throw new Error("BVHTraversalHelper: cannot start a traversal during an active traversal.");n=!0;try{r(s,0,0)}finally{n=!1}},this.traverse=s=>{this.traverseBuffer((o,u,l)=>{if(u){let p=l*2,f=t[l+6],c=e[p+14];return s(o,u,new Float32Array(i,l*4,6),f,c)}else{let p=at(l,t);return s(o,u,new Float32Array(i,l*4,6),p)}})}}};var Ti=new or,Rt=new Float32Array(6),_e=class{constructor(){this._roots=null,this.primitiveBuffer=null,this.primitiveBufferStride=null}init(t){t={...oe,...t},"maxLeafSize"in t&&(console.warn('BVH: "maxLeafSize" option has been deprecated. Use "targetLeafSize", instead.'),t={...t,targetLeafSize:t.maxLeafSize}),yi(this,t)}getRootRanges(){throw new Error("BVH: getRootRanges() not implemented")}writePrimitiveBounds(){throw new Error("BVH: writePrimitiveBounds() not implemented")}writePrimitiveRangeBounds(t,e,n,r){let s=1/0,o=1/0,u=1/0,l=-1/0,p=-1/0,f=-1/0;for(let c=t,a=t+e;c<a;c++){this.writePrimitiveBounds(c,Rt,0);let[d,y,w,v,T,m]=Rt;d<s&&(s=d),v>l&&(l=v),y<o&&(o=y),T>p&&(p=T),w<u&&(u=w),m>f&&(f=m)}return n[r+0]=s,n[r+1]=o,n[r+2]=u,n[r+3]=l,n[r+4]=p,n[r+5]=f,n}computePrimitiveBounds(t,e,n){let r=n.offset||0;for(let s=t,o=t+e;s<o;s++){this.writePrimitiveBounds(s,Rt,0);let[u,l,p,f,c,a]=Rt,d=(u+f)/2,y=(l+c)/2,w=(p+a)/2,v=(f-u)/2,T=(c-l)/2,m=(a-p)/2,h=(s-r)*6;n[h+0]=d,n[h+1]=v+(Math.abs(d)+v)*wt,n[h+2]=y,n[h+3]=T+(Math.abs(y)+T)*wt,n[h+4]=w,n[h+5]=m+(Math.abs(w)+m)*wt}return n}shiftPrimitiveOffsets(t){let e=this._indirectBuffer;if(e)for(let n=0,r=e.length;n<r;n++)e[n]+=t;else{let n=this._roots;for(let r=0;r<n.length;r++){let s=n[r],o=new Uint32Array(s),u=new Uint16Array(s),l=s.byteLength/32;for(let p=0;p<l;p++){let f=8*p,c=2*f;N(c,u)&&(o[f+6]+=t)}}}}traverse(t,e=0){Se.setBVH(this,e),Se.traverse(t),Se.reset()}refit(){let t=this._roots;for(let e=0,n=t.length;e<n;e++){let r=t[e],s=new Uint32Array(r),o=new Uint16Array(r),u=new Float32Array(r),l=r.byteLength/32;for(let p=l-1;p>=0;p--){let f=p*8,c=f*2;if(N(c,o)){let d=R(f,s),y=z(c,o);this.writePrimitiveRangeBounds(d,y,Rt,0),u.set(Rt,f)}else{let d=L(f),y=C(f,s);for(let w=0;w<3;w++){let v=u[d+w],T=u[d+w+3],m=u[y+w],h=u[y+w+3];u[f+w]=v<m?v:m,u[f+w+3]=T>h?T:h}}}}}getBoundingBox(t){return t.makeEmpty(),this._roots.forEach(n=>{O(0,new Float32Array(n),Ti),t.union(Ti)}),t}shapecast(t){let{boundsTraverseOrder:e,intersectsBounds:n,intersectsRange:r,intersectsPrimitive:s,scratchPrimitive:o,iterate:u}=t;if(r&&s){let c=r;r=(a,d,y,w,v)=>c(a,d,y,w,v)?!0:u(a,d,this,s,y,w,o)}else r||(s?r=(c,a,d,y)=>u(c,a,this,s,d,y,o):r=(c,a,d)=>d);let l=!1,p=0,f=this._roots;for(let c=0,a=f.length;c<a;c++){let d=f[c];if(l=gi(this,c,n,r,e,p),l)break;p+=d.byteLength/32}return l}bvhcast(t,e,n){let{intersectsRanges:r}=n;return vi(this,t,e,r)}};function sr(i,t){let e=i[i.length-1],n=e.offset+e.count>2**16,r=i.reduce((p,f)=>p+f.count,0),s=n?4:2,o=t?new SharedArrayBuffer(r*s):new ArrayBuffer(r*s),u=n?new Uint32Array(o):new Uint16Array(o),l=0;for(let p=0;p<i.length;p++){let{offset:f,count:c}=i[p];for(let a=0;a<c;a++)u[l+a]=f+a;l+=c}return u}var Lt=class extends _e{get indirect(){return!!this._indirectBuffer}get primitiveStride(){return null}get primitiveBufferStride(){return this.indirect?1:this.primitiveStride}set primitiveBufferStride(t){}get primitiveBuffer(){return this.indirect?this._indirectBuffer:this.geometry.index.array}set primitiveBuffer(t){}constructor(t,e={}){if(t.isBufferGeometry){if(t.index&&t.index.isInterleavedBufferAttribute)throw new Error("BVH: InterleavedBufferAttribute is not supported for the index attribute.")}else throw new Error("BVH: Only BufferGeometries are supported.");if(e.useSharedArrayBuffer&&!ui())throw new Error("BVH: SharedArrayBuffer is not available.");super(),this.geometry=t,this.resolvePrimitiveIndex=e.indirect?n=>this._indirectBuffer[n]:n=>n,this.primitiveBuffer=null,this.primitiveBufferStride=null,this._indirectBuffer=null,e={...oe,...e},e[rt]||this.init(e)}init(t){let{geometry:e,primitiveStride:n}=this;if(t.indirect){let r=je(e,t.range,n),s=sr(r,t.useSharedArrayBuffer);this._indirectBuffer=s}else ti(e,t);super.init(t),!e.boundingBox&&t.setBoundingBox&&(e.boundingBox=this.getBoundingBox(new rr))}getRootRanges(t){return this.indirect?[{offset:0,count:this._indirectBuffer.length}]:je(this.geometry,t,this.primitiveStride)}raycastObject3D(){throw new Error("BVH: raycastObject3D() not implemented")}};var Be=new H,Pe=new ar,bi=new Bi,Ai=new lr,Si=new Bi,dn=["getX","getY","getZ"],_i=class i extends Lt{static serialize(t,e={}){e={cloneBuffers:!0,...e};let n=t.geometry,r=t._roots,s=t._indirectBuffer,o=n.getIndex(),u={version:1,roots:null,index:null,indirectBuffer:null};return e.cloneBuffers?(u.roots=r.map(l=>l.slice()),u.index=o?o.array.slice():null,u.indirectBuffer=s?s.slice():null):(u.roots=r,u.index=o?o.array:null,u.indirectBuffer=s),u}static deserialize(t,e,n={}){n={setIndex:!0,indirect:!!t.indirectBuffer,...n};let{index:r,roots:s,indirectBuffer:o}=t;t.version||(console.warn("MeshBVH.deserialize: Serialization format has been changed and will be fixed up. It is recommended to regenerate any stored serialized data."),l(s));let u=new i(e,{...n,[rt]:!0});if(u._roots=s,u._indirectBuffer=o||null,n.setIndex){let p=e.getIndex();if(p===null){let f=new cr(t.index,1,!1);e.setIndex(f)}else p.array!==r&&(p.array.set(r),p.needsUpdate=!0)}return u;function l(p){for(let f=0;f<p.length;f++){let c=p[f],a=new Uint32Array(c),d=new Uint16Array(c);for(let y=0,w=c.byteLength/32;y<w;y++){let v=8*y,T=2*v;N(T,d)||(a[v+6]=a[v+6]/8-y)}}}}get primitiveStride(){return 3}get resolveTriangleIndex(){return this.resolvePrimitiveIndex}constructor(t,e={}){e.maxLeafTris&&(console.warn('MeshBVH: "maxLeafTris" option has been deprecated. Use "targetLeafSize", instead.'),e={...e,targetLeafSize:e.maxLeafTris}),super(t,e)}shiftTriangleOffsets(t){return super.shiftPrimitiveOffsets(t)}writePrimitiveBounds(t,e,n){let r=this.geometry,s=this._indirectBuffer,o=r.attributes.position,u=r.index?r.index.array:null,p=(s?s[t]:t)*3,f=p+0,c=p+1,a=p+2;u&&(f=u[f],c=u[c],a=u[a]);for(let d=0;d<3;d++){let y=o[dn[d]](f),w=o[dn[d]](c),v=o[dn[d]](a),T=y;w<T&&(T=w),v<T&&(T=v);let m=y;w>m&&(m=w),v>m&&(m=v),e[n+d]=T,e[n+d+3]=m}return e}computePrimitiveBounds(t,e,n){let r=this.geometry,s=this._indirectBuffer,o=r.attributes.position,u=r.index?r.index.array:null,l=o.normalized;if(t<0||e+t-n.offset>n.length/6)throw new Error("MeshBVH: compute triangle bounds range is invalid.");let p=o.array,f=o.offset||0,c=3;o.isInterleavedBufferAttribute&&(c=o.data.stride);let a=["getX","getY","getZ"],d=n.offset;for(let y=t,w=t+e;y<w;y++){let T=(s?s[y]:y)*3,m=(y-d)*6,h=T+0,x=T+1,g=T+2;u&&(h=u[h],x=u[x],g=u[g]),l||(h=h*c+f,x=x*c+f,g=g*c+f);for(let A=0;A<3;A++){let b,_,P;l?(b=o[a[A]](h),_=o[a[A]](x),P=o[a[A]](g)):(b=p[h+A],_=p[x+A],P=p[g+A]);let S=b;_<S&&(S=_),P<S&&(S=P);let I=b;_>I&&(I=_),P>I&&(I=P);let B=(I-S)/2,E=A*2;n[m+E+0]=S+B,n[m+E+1]=B+(Math.abs(S)+B)*wt}}return n}raycastObject3D(t,e,n=[]){let{material:r}=t;if(r===void 0)return;Ai.copy(t.matrixWorld).invert(),Pe.copy(e.ray).applyMatrix4(Ai),Si.setFromMatrixScale(t.matrixWorld),bi.copy(Pe.direction).multiply(Si);let s=bi.length(),o=e.near/s,u=e.far/s;if(e.firstHitOnly===!0){let l=this.raycastFirst(Pe,r,o,u);l=sn(l,t,e),l&&n.push(l)}else{let l=this.raycast(Pe,r,o,u);for(let p=0,f=l.length;p<f;p++){let c=sn(l[p],t,e);c&&n.push(c)}}return n}refit(t=null){return(this.indirect?oi:Kn)(this,t)}raycast(t,e=wi,n=0,r=1/0){let s=this._roots,o=[],u=this.indirect?ri:jn;for(let l=0,p=s.length;l<p;l++)u(this,l,e,t,o,n,r);return o}raycastFirst(t,e=wi,n=0,r=1/0){let s=this._roots,o=null,u=this.indirect?si:Jn;for(let l=0,p=s.length;l<p;l++){let f=u(this,l,e,t,n,r);f!=null&&(o==null||f.distance<o.distance)&&(o=f)}return o}intersectsGeometry(t,e){let n=!1,r=this._roots,s=this.indirect?ai:ni;for(let o=0,u=r.length;o<u&&(n=s(this,o,t,e),!n);o++);return n}shapecast(t){let e=W.getPrimitive(),n=super.shapecast({...t,intersectsPrimitive:t.intersectsTriangle,scratchPrimitive:e,iterate:this.indirect?$n:Xn});return W.releasePrimitive(e),n}bvhcast(t,e,n){let{intersectsRanges:r,intersectsTriangles:s}=n,o=W.getPrimitive(),u=this.geometry.index,l=this.geometry.attributes.position,p=this.indirect?y=>{let w=this.resolveTriangleIndex(y);U(o,w*3,u,l)}:y=>{U(o,y*3,u,l)},f=W.getPrimitive(),c=t.geometry.index,a=t.geometry.attributes.position,d=t.indirect?y=>{let w=t.resolveTriangleIndex(y);U(f,w*3,c,a)}:y=>{U(f,y*3,c,a)};if(s){if(!(t instanceof i))throw new Error('MeshBVH: "intersectsTriangles" callback can only be used with another MeshBVH.');let y=(w,v,T,m,h,x,g,A)=>{for(let b=T,_=T+m;b<_;b++){d(b),f.a.applyMatrix4(e),f.b.applyMatrix4(e),f.c.applyMatrix4(e),f.needsUpdate=!0;for(let P=w,S=w+v;P<S;P++)if(p(P),o.needsUpdate=!0,s(o,f,P,b,h,x,g,A))return!0}return!1};if(r){let w=r;r=function(v,T,m,h,x,g,A,b){return w(v,T,m,h,x,g,A,b)?!0:y(v,T,m,h,x,g,A,b)}}else r=y}return super.bvhcast(t,e,{intersectsRanges:r})}intersectsBox(t,e){return Be.set(t.min,t.max,e),Be.needsUpdate=!0,this.shapecast({intersectsBounds:n=>Be.intersectsBox(n),intersectsTriangle:n=>Be.intersectsTriangle(n)})}intersectsSphere(t){return this.shapecast({intersectsBounds:e=>t.intersectsBox(e),intersectsTriangle:e=>e.intersectsSphere(t)})}closestPointToGeometry(t,e,n={},r={},s=0,o=1/0){return(this.indirect?li:ii)(this,t,e,n,r,s,o)}closestPointToPoint(t,e={},n=0,r=1/0){return Un(this,t,e,n,r)}};import{Vector3 as j,Vector2 as Jt,Ray as ur,Matrix4 as fr,FrontSide as pr,BackSide as dr,Triangle as jt,REVISION as Ci}from"three";var Ii=new j,Ei=new j,Fi=new j,ot=new ur,Di=new fr,gt=new j,hn=new j,mr=["x","y","z"],Ie=parseInt(Ci)>=169,hr=parseInt(Ci)<=161,Ee=new Jt,Fe=new Jt,De=new Jt,Ni=new j,Mi=new j,Ri=new j,Li=class extends Lt{get primitiveStride(){return 3}constructor(t,e={}){if(!t.isMesh)throw new Error("SkinnedMeshBVH: First argument must be a Mesh.");super(t.geometry,{...e,[rt]:!0}),this.mesh=t,e[rt]||this.init(e)}writePrimitiveBounds(t,e,n){let{mesh:r,geometry:s}=this,o=this._indirectBuffer,u=s.index?s.index.array:null,p=(o?o[t]:t)*3,f=p+0,c=p+1,a=p+2;u&&(f=u[f],c=u[c],a=u[a]),r.getVertexPosition(f,Ii),r.getVertexPosition(c,Ei),r.getVertexPosition(a,Fi);for(let d=0;d<3;d++){let y=mr[d],w=Ii[y],v=Ei[y],T=Fi[y],m=w;v<m&&(m=v),T<m&&(m=T);let h=w;v>h&&(h=v),T>h&&(h=T),e[n+d]=m,e[n+d+3]=h}return e}shapecast(t){let e=new q;return super.shapecast({...t,intersectsPrimitive:t.intersectsTriangle,scratchPrimitive:e,iterate:xr})}raycastObject3D(t,e,n=[]){let{material:r}=t;if(r===void 0)return;let{matrixWorld:s}=t,{firstHitOnly:o}=e;Di.copy(s).invert(),ot.copy(e.ray).applyMatrix4(Di);let u=null,l=1/0;return this.shapecast({boundsTraverseOrder:p=>p.distanceToPoint(ot.origin),intersectsBounds:p=>{if(o){if(!ot.intersectBox(p,hn))return 0;let f;return p.containsPoint(ot.origin)?f=0:(hn.applyMatrix4(s),f=e.ray.origin.distanceTo(hn)),f<l?1:0}else return ot.intersectsBox(p)?1:0},intersectsTriangle:(p,f)=>{let c=null;if(r.side===pr?c=ot.intersectTriangle(p.a,p.b,p.c,!0,gt):r.side===dr?c=ot.intersectTriangle(p.c,p.b,p.a,!0,gt):c=ot.intersectTriangle(p.a,p.b,p.c,!1,gt),!c)return;c=c.clone().applyMatrix4(s);let a=e.ray.origin.distanceTo(c);if(a>=e.near&&a<=e.far){if(o&&a>=l)return;let{geometry:d}=this,{index:y}=d,w=this.resolvePrimitiveIndex(f),v=w*3,T=v+0,m=v+1,h=v+2;y&&(T=y.array[T],m=y.array[m],h=y.array[h]);let x={distance:a,point:c.clone(),object:t,uv:null,uv1:null,normal:null,face:{a:T,b:m,c:h,normal:jt.getNormal(p.a,p.b,p.c,new j),materialIndex:0},faceIndex:w};if(Ie){let _=new j;jt.getBarycoord(gt,p.a,p.b,p.c,_),x.barycoord=_}let g=d.attributes.uv,A=d.attributes.uv1,b=d.attributes.normal;if(g){Ee.fromBufferAttribute(g,T),Fe.fromBufferAttribute(g,m),De.fromBufferAttribute(g,h),x.uv=new Jt;let _=jt.getInterpolation(gt,p.a,p.b,p.c,Ee,Fe,De,x.uv);Ie||(x.uv=_)}if(A){Ee.fromBufferAttribute(A,T),Fe.fromBufferAttribute(A,m),De.fromBufferAttribute(A,h),x.uv1=new Jt;let _=jt.getInterpolation(gt,p.a,p.b,p.c,Ee,Fe,De,x.uv1);Ie||(x.uv1=_),hr&&(x.uv2=x.uv1)}if(b){Ni.fromBufferAttribute(b,T),Mi.fromBufferAttribute(b,m),Ri.fromBufferAttribute(b,h),x.normal=new j;let _=jt.getInterpolation(gt,p.a,p.b,p.c,Ni,Mi,Ri,x.normal);x.normal.dot(ot.direction)>0&&x.normal.multiplyScalar(-1),Ie||(x.normal=_)}l=x.distance,u=x,o||n.push(x)}}}),o&&u&&n.push(u),n}};function xr(i,t,e,n,r,s,o){let{mesh:u,geometry:l}=e,p=l.index?l.index.array:null;for(let f=i,c=t+i;f<c;f++){let a=e.resolvePrimitiveIndex(f),d=3*a+0,y=3*a+1,w=3*a+2;if(p&&(d=p[d],y=p[y],w=p[w]),u.getVertexPosition(d,o.a),u.getVertexPosition(y,o.b),u.getVertexPosition(w,o.c),o.needsUpdate=!0,n(o,f,r,s))return!0}return!1}import{DataTexture as yr,FloatType as Ne,IntType as xn,UnsignedIntType as Me,ByteType as zi,UnsignedByteType as Ui,ShortType as gr,UnsignedShortType as vr,RedFormat as Tr,RGFormat as wr,RGBAFormat as yn,RedIntegerFormat as br,RGIntegerFormat as Ar,RGBAIntegerFormat as gn,NearestFilter as Oi}from"three";function Sr(i){switch(i){case 1:return"R";case 2:return"RG";case 3:return"RGBA";case 4:return"RGBA"}throw new Error}function _r(i){switch(i){case 1:return Tr;case 2:return wr;case 3:return yn;case 4:return yn}}function Vi(i){switch(i){case 1:return br;case 2:return Ar;case 3:return gn;case 4:return gn}}var Re=class extends yr{constructor(){super(),this.minFilter=Oi,this.magFilter=Oi,this.generateMipmaps=!1,this.overrideItemSize=null,this._forcedType=null}updateFrom(t){let e=this.overrideItemSize,n=t.itemSize,r=t.count;if(e!==null){if(n*r%e!==0)throw new Error("VertexAttributeTexture: overrideItemSize must divide evenly into buffer length.");t.itemSize=e,t.count=r*n/e}let s=t.itemSize,o=t.count,u=t.normalized,l=t.array.constructor,p=l.BYTES_PER_ELEMENT,f=this._forcedType,c=s;if(f===null)switch(l){case Float32Array:f=Ne;break;case Uint8Array:case Uint16Array:case Uint32Array:f=Me;break;case Int8Array:case Int16Array:case Int32Array:f=xn;break}let a,d,y,w,v=Sr(s);switch(f){case Ne:y=1,d=_r(s),u&&p===1?(w=l,v+="8",l===Uint8Array?a=Ui:(a=zi,v+="_SNORM")):(w=Float32Array,v+="32F",a=Ne);break;case xn:v+=p*8+"I",y=u?Math.pow(2,l.BYTES_PER_ELEMENT*8-1):1,d=Vi(s),p===1?(w=Int8Array,a=zi):p===2?(w=Int16Array,a=gr):(w=Int32Array,a=xn);break;case Me:v+=p*8+"UI",y=u?Math.pow(2,l.BYTES_PER_ELEMENT*8-1):1,d=Vi(s),p===1?(w=Uint8Array,a=Ui):p===2?(w=Uint16Array,a=vr):(w=Uint32Array,a=Me);break}c===3&&(d===yn||d===gn)&&(c=4);let T=Math.ceil(Math.sqrt(o))||1,m=c*T*T,h=new w(m),x=t.normalized;t.normalized=!1;for(let g=0;g<o;g++){let A=c*g;h[A]=t.getX(g)/y,s>=2&&(h[A+1]=t.getY(g)/y),s>=3&&(h[A+2]=t.getZ(g)/y,c===4&&(h[A+3]=1)),s>=4&&(h[A+3]=t.getW(g)/y)}t.normalized=x,this.internalFormat=v,this.format=d,this.type=a,this.image.width=T,this.image.height=T,this.image.data=h,this.needsUpdate=!0,this.dispose(),t.itemSize=n,t.count=r}},Le=class extends Re{constructor(){super(),this._forcedType=Me}};var Ce=class extends Re{constructor(){super(),this._forcedType=Ne}};import{DataTexture as Hi,FloatType as Br,UnsignedIntType as Pr,RGBAFormat as Ir,RGIntegerFormat as Er,NearestFilter as ze,BufferAttribute as Fr}from"three";var ki=class{constructor(){this.index=new Le,this.position=new Ce,this.bvhBounds=new Hi,this.bvhContents=new Hi,this._cachedIndexAttr=null,this.index.overrideItemSize=3}updateFrom(t){let{geometry:e}=t;if(Nr(t,this.bvhBounds,this.bvhContents),this.position.updateFrom(e.attributes.position),t.indirect){let n=t._indirectBuffer;if(this._cachedIndexAttr===null||this._cachedIndexAttr.count!==n.length)if(e.index)this._cachedIndexAttr=e.index.clone();else{let r=$e(Wt(e));this._cachedIndexAttr=new Fr(r,1,!1)}Dr(e,n,this._cachedIndexAttr),this.index.updateFrom(this._cachedIndexAttr)}else this.index.updateFrom(e.index)}dispose(){let{index:t,position:e,bvhBounds:n,bvhContents:r}=this;t&&t.dispose(),e&&e.dispose(),n&&n.dispose(),r&&r.dispose()}};function Dr(i,t,e){let n=e.array,r=i.index?i.index.array:null;for(let s=0,o=t.length;s<o;s++){let u=3*s,l=3*t[s];for(let p=0;p<3;p++)n[u+p]=r?r[l+p]:l+p}}function Nr(i,t,e){let n=i._roots;if(n.length!==1)throw new Error("MeshBVHUniformStruct: Multi-root BVHs not supported.");let r=n[0],s=new Uint16Array(r),o=new Uint32Array(r),u=new Float32Array(r),l=r.byteLength/32,p=2*Math.ceil(Math.sqrt(l/2)),f=new Float32Array(4*p*p),c=Math.ceil(Math.sqrt(l)),a=new Uint32Array(2*c*c);for(let d=0;d<l;d++){let y=d*32/4,w=y*2,v=y;for(let T=0;T<3;T++)f[8*d+0+T]=u[v+0+T],f[8*d+4+T]=u[v+3+T];if(N(w,s)){let T=z(w,s),m=R(y,o),h=-65536|T;a[d*2+0]=h,a[d*2+1]=m}else{let T=o[y+6],m=at(y,o);a[d*2+0]=m,a[d*2+1]=T}}t.image.data=f,t.image.width=p,t.image.height=p,t.format=Ir,t.type=Br,t.internalFormat="RGBA32F",t.minFilter=ze,t.magFilter=ze,t.generateMipmaps=!1,t.needsUpdate=!0,t.dispose(),e.image.data=a,e.image.width=c,e.image.height=c,e.format=Er,e.type=Pr,e.internalFormat="RG32UI",e.minFilter=ze,e.magFilter=ze,e.generateMipmaps=!1,e.needsUpdate=!0,e.dispose()}var wn={};ho(wn,{bvh_distance_functions:()=>qi,bvh_ray_functions:()=>Tn,bvh_struct_definitions:()=>Gi,common_functions:()=>vn});var vn=`

// A stack of uint32 indices can can store the indices for
// a perfectly balanced tree with a depth up to 31. Lower stack
// depth gets higher performance.
//
// However not all trees are balanced. Best value to set this to
// is the trees max depth.
#ifndef BVH_STACK_DEPTH
#define BVH_STACK_DEPTH 60
#endif

#ifndef INFINITY
#define INFINITY 1e20
#endif

// Utilities
uvec4 uTexelFetch1D( usampler2D tex, uint index ) {

	uint width = uint( textureSize( tex, 0 ).x );
	uvec2 uv;
	uv.x = index % width;
	uv.y = index / width;

	return texelFetch( tex, ivec2( uv ), 0 );

}

ivec4 iTexelFetch1D( isampler2D tex, uint index ) {

	uint width = uint( textureSize( tex, 0 ).x );
	uvec2 uv;
	uv.x = index % width;
	uv.y = index / width;

	return texelFetch( tex, ivec2( uv ), 0 );

}

vec4 texelFetch1D( sampler2D tex, uint index ) {

	uint width = uint( textureSize( tex, 0 ).x );
	uvec2 uv;
	uv.x = index % width;
	uv.y = index / width;

	return texelFetch( tex, ivec2( uv ), 0 );

}

vec4 textureSampleBarycoord( sampler2D tex, vec3 barycoord, uvec3 faceIndices ) {

	return
		barycoord.x * texelFetch1D( tex, faceIndices.x ) +
		barycoord.y * texelFetch1D( tex, faceIndices.y ) +
		barycoord.z * texelFetch1D( tex, faceIndices.z );

}

void ndcToCameraRay(
	vec2 coord, mat4 cameraWorld, mat4 invProjectionMatrix,
	out vec3 rayOrigin, out vec3 rayDirection
) {

	// get camera look direction and near plane for camera clipping
	vec4 lookDirection = cameraWorld * vec4( 0.0, 0.0, - 1.0, 0.0 );
	vec4 nearVector = invProjectionMatrix * vec4( 0.0, 0.0, - 1.0, 1.0 );
	float near = abs( nearVector.z / nearVector.w );

	// get the camera direction and position from camera matrices
	vec4 origin = cameraWorld * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec4 direction = invProjectionMatrix * vec4( coord, 0.5, 1.0 );
	direction /= direction.w;
	direction = cameraWorld * direction - origin;

	// slide the origin along the ray until it sits at the near clip plane position
	origin.xyz += direction.xyz * near / dot( direction, lookDirection );

	rayOrigin = origin.xyz;
	rayDirection = direction.xyz;

}
`;var qi=`

float dot2( vec3 v ) {

	return dot( v, v );

}

// implementation from https://www.shadertoy.com/view/ttfGWl, though method 2 has been removed
// and is now available at this fork: https://www.shadertoy.com/view/WlB3zW
vec3 closestPointToTriangle( vec3 p, vec3 v0, vec3 v1, vec3 v2, out vec3 barycoord ) {

    vec3 v10 = v1 - v0;
    vec3 v21 = v2 - v1;
    vec3 v02 = v0 - v2;

	vec3 p0 = p - v0;
	vec3 p1 = p - v1;
	vec3 p2 = p - v2;

    vec3 nor = cross( v10, v02 );

    // method 2, in barycentric space
    vec3  q = cross( nor, p0 );
    float d = 1.0 / dot2( nor );
    float u = d * dot( q, v02 );
    float v = d * dot( q, v10 );
    float w = 1.0 - u - v;

	if( u < 0.0 ) {

		w = clamp( dot( p2, v02 ) / dot2( v02 ), 0.0, 1.0 );
		u = 0.0;
		v = 1.0 - w;

	} else if( v < 0.0 ) {

		u = clamp( dot( p0, v10 ) / dot2( v10 ), 0.0, 1.0 );
		v = 0.0;
		w = 1.0 - u;

	} else if( w < 0.0 ) {

		v = clamp( dot( p1, v21 ) / dot2( v21 ), 0.0, 1.0 );
		w = 0.0;
		u = 1.0 - v;

	}

	// output the barycoord in v0, v1, v2 weight order
	barycoord = vec3( w, u, v );
    return u * v1 + v * v2 + w * v0;

}

float distanceToTriangles(
	// geometry info and triangle range
	sampler2D positionAttr, usampler2D indexAttr, uint offset, uint count,

	// point and cut off range
	vec3 point, float closestDistanceSquared,

	// outputs
	inout uvec4 faceIndices, inout vec3 faceNormal, inout vec3 barycoord, inout float side, inout vec3 outPoint
) {

	bool found = false;
	vec3 localBarycoord;
	for ( uint i = offset, l = offset + count; i < l; i ++ ) {

		uvec3 indices = uTexelFetch1D( indexAttr, i ).xyz;
		vec3 a = texelFetch1D( positionAttr, indices.x ).rgb;
		vec3 b = texelFetch1D( positionAttr, indices.y ).rgb;
		vec3 c = texelFetch1D( positionAttr, indices.z ).rgb;

		// get the closest point and barycoord
		vec3 closestPoint = closestPointToTriangle( point, a, b, c, localBarycoord );
		vec3 delta = point - closestPoint;
		float sqDist = dot2( delta );
		if ( sqDist < closestDistanceSquared ) {

			// set the output results
			closestDistanceSquared = sqDist;
			faceIndices = uvec4( indices.xyz, i );
			faceNormal = normalize( cross( a - b, b - c ) );
			barycoord = localBarycoord;
			outPoint = closestPoint;
			side = sign( dot( faceNormal, delta ) );

		}

	}

	return closestDistanceSquared;

}

float distanceSqToBounds( vec3 point, vec3 boundsMin, vec3 boundsMax ) {

	vec3 clampedPoint = clamp( point, boundsMin, boundsMax );
	vec3 delta = point - clampedPoint;
	return dot( delta, delta );

}

float distanceSqToBVHNodeBoundsPoint( vec3 point, sampler2D bvhBounds, uint currNodeIndex ) {

	uint cni2 = currNodeIndex * 2u;
	vec3 boundsMin = texelFetch1D( bvhBounds, cni2 ).xyz;
	vec3 boundsMax = texelFetch1D( bvhBounds, cni2 + 1u ).xyz;
	return distanceSqToBounds( point, boundsMin, boundsMax );

}

// use a macro to hide the fact that we need to expand the struct into separate fields
#define	bvhClosestPointToPoint(		bvh,		point, maxDistance, faceIndices, faceNormal, barycoord, side, outPoint	)	_bvhClosestPointToPoint(		bvh.position, bvh.index, bvh.bvhBounds, bvh.bvhContents,		point, maxDistance, faceIndices, faceNormal, barycoord, side, outPoint	)

float _bvhClosestPointToPoint(
	// bvh info
	sampler2D bvh_position, usampler2D bvh_index, sampler2D bvh_bvhBounds, usampler2D bvh_bvhContents,

	// point to check
	vec3 point, float maxDistance,

	// output variables
	inout uvec4 faceIndices, inout vec3 faceNormal, inout vec3 barycoord,
	inout float side, inout vec3 outPoint
 ) {

	// stack needs to be twice as long as the deepest tree we expect because
	// we push both the left and right child onto the stack every traversal
	int pointer = 0;
	uint stack[ BVH_STACK_DEPTH ];
	stack[ 0 ] = 0u;

	float closestDistanceSquared = maxDistance * maxDistance;
	bool found = false;
	while ( pointer > - 1 && pointer < BVH_STACK_DEPTH ) {

		uint currNodeIndex = stack[ pointer ];
		pointer --;

		// check if we intersect the current bounds
		float boundsHitDistance = distanceSqToBVHNodeBoundsPoint( point, bvh_bvhBounds, currNodeIndex );
		if ( boundsHitDistance > closestDistanceSquared ) {

			continue;

		}

		uvec2 boundsInfo = uTexelFetch1D( bvh_bvhContents, currNodeIndex ).xy;
		bool isLeaf = bool( boundsInfo.x & 0xffff0000u );
		if ( isLeaf ) {

			uint count = boundsInfo.x & 0x0000ffffu;
			uint offset = boundsInfo.y;
			closestDistanceSquared = distanceToTriangles(
				bvh_position, bvh_index, offset, count, point, closestDistanceSquared,

				// outputs
				faceIndices, faceNormal, barycoord, side, outPoint
			);

		} else {

			uint leftIndex = currNodeIndex + 1u;
			uint splitAxis = boundsInfo.x & 0x0000ffffu;
			uint rightIndex = currNodeIndex + boundsInfo.y;
			bool leftToRight = distanceSqToBVHNodeBoundsPoint( point, bvh_bvhBounds, leftIndex ) < distanceSqToBVHNodeBoundsPoint( point, bvh_bvhBounds, rightIndex );//rayDirection[ splitAxis ] >= 0.0;
			uint c1 = leftToRight ? leftIndex : rightIndex;
			uint c2 = leftToRight ? rightIndex : leftIndex;

			// set c2 in the stack so we traverse it later. We need to keep track of a pointer in
			// the stack while we traverse. The second pointer added is the one that will be
			// traversed first
			pointer ++;
			stack[ pointer ] = c2;
			pointer ++;
			stack[ pointer ] = c1;

		}

	}

	return sqrt( closestDistanceSquared );

}
`;var Tn=`

#ifndef TRI_INTERSECT_EPSILON
#define TRI_INTERSECT_EPSILON 1e-5
#endif

// Raycasting
bool intersectsBounds( vec3 rayOrigin, vec3 rayDirection, vec3 boundsMin, vec3 boundsMax, out float dist ) {

	// https://www.reddit.com/r/opengl/comments/8ntzz5/fast_glsl_ray_box_intersection/
	// https://tavianator.com/2011/ray_box.html
	vec3 invDir = 1.0 / rayDirection;

	// find intersection distances for each plane
	vec3 tMinPlane = invDir * ( boundsMin - rayOrigin );
	vec3 tMaxPlane = invDir * ( boundsMax - rayOrigin );

	// get the min and max distances from each intersection
	vec3 tMinHit = min( tMaxPlane, tMinPlane );
	vec3 tMaxHit = max( tMaxPlane, tMinPlane );

	// get the furthest hit distance
	vec2 t = max( tMinHit.xx, tMinHit.yz );
	float t0 = max( t.x, t.y );

	// get the minimum hit distance
	t = min( tMaxHit.xx, tMaxHit.yz );
	float t1 = min( t.x, t.y );

	// set distance to 0.0 if the ray starts inside the box
	dist = max( t0, 0.0 );

	return t1 >= dist;

}

bool intersectsTriangle(
	vec3 rayOrigin, vec3 rayDirection, vec3 a, vec3 b, vec3 c,
	out vec3 barycoord, out vec3 norm, out float dist, out float side
) {

	// https://stackoverflow.com/questions/42740765/intersection-between-line-and-triangle-in-3d
	vec3 edge1 = b - a;
	vec3 edge2 = c - a;
	norm = cross( edge1, edge2 );

	float det = - dot( rayDirection, norm );
	float invdet = 1.0 / det;

	vec3 AO = rayOrigin - a;
	vec3 DAO = cross( AO, rayDirection );

	vec4 uvt;
	uvt.x = dot( edge2, DAO ) * invdet;
	uvt.y = - dot( edge1, DAO ) * invdet;
	uvt.z = dot( AO, norm ) * invdet;
	uvt.w = 1.0 - uvt.x - uvt.y;

	// set the hit information
	barycoord = uvt.wxy; // arranged in A, B, C order
	dist = uvt.z;
	side = sign( det );
	norm = side * normalize( norm );

	// add an epsilon to avoid misses between triangles
	uvt += vec4( TRI_INTERSECT_EPSILON );

	return all( greaterThanEqual( uvt, vec4( 0.0 ) ) );

}

bool intersectTriangles(
	// geometry info and triangle range
	sampler2D positionAttr, usampler2D indexAttr, uint offset, uint count,

	// ray
	vec3 rayOrigin, vec3 rayDirection,

	// outputs
	inout float minDistance, inout uvec4 faceIndices, inout vec3 faceNormal, inout vec3 barycoord,
	inout float side, inout float dist
) {

	bool found = false;
	vec3 localBarycoord, localNormal;
	float localDist, localSide;
	for ( uint i = offset, l = offset + count; i < l; i ++ ) {

		uvec3 indices = uTexelFetch1D( indexAttr, i ).xyz;
		vec3 a = texelFetch1D( positionAttr, indices.x ).rgb;
		vec3 b = texelFetch1D( positionAttr, indices.y ).rgb;
		vec3 c = texelFetch1D( positionAttr, indices.z ).rgb;

		if (
			intersectsTriangle( rayOrigin, rayDirection, a, b, c, localBarycoord, localNormal, localDist, localSide )
			&& localDist < minDistance
		) {

			found = true;
			minDistance = localDist;

			faceIndices = uvec4( indices.xyz, i );
			faceNormal = localNormal;

			side = localSide;
			barycoord = localBarycoord;
			dist = localDist;

		}

	}

	return found;

}

bool intersectsBVHNodeBounds( vec3 rayOrigin, vec3 rayDirection, sampler2D bvhBounds, uint currNodeIndex, out float dist ) {

	uint cni2 = currNodeIndex * 2u;
	vec3 boundsMin = texelFetch1D( bvhBounds, cni2 ).xyz;
	vec3 boundsMax = texelFetch1D( bvhBounds, cni2 + 1u ).xyz;
	return intersectsBounds( rayOrigin, rayDirection, boundsMin, boundsMax, dist );

}

// use a macro to hide the fact that we need to expand the struct into separate fields
#define	bvhIntersectFirstHit(		bvh,		rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist	)	_bvhIntersectFirstHit(		bvh.position, bvh.index, bvh.bvhBounds, bvh.bvhContents,		rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist	)

bool _bvhIntersectFirstHit(
	// bvh info
	sampler2D bvh_position, usampler2D bvh_index, sampler2D bvh_bvhBounds, usampler2D bvh_bvhContents,

	// ray
	vec3 rayOrigin, vec3 rayDirection,

	// output variables split into separate variables due to output precision
	inout uvec4 faceIndices, inout vec3 faceNormal, inout vec3 barycoord,
	inout float side, inout float dist
) {

	// stack needs to be twice as long as the deepest tree we expect because
	// we push both the left and right child onto the stack every traversal
	int pointer = 0;
	uint stack[ BVH_STACK_DEPTH ];
	stack[ 0 ] = 0u;

	float triangleDistance = INFINITY;
	bool found = false;
	while ( pointer > - 1 && pointer < BVH_STACK_DEPTH ) {

		uint currNodeIndex = stack[ pointer ];
		pointer --;

		// check if we intersect the current bounds
		float boundsHitDistance;
		if (
			! intersectsBVHNodeBounds( rayOrigin, rayDirection, bvh_bvhBounds, currNodeIndex, boundsHitDistance )
			|| boundsHitDistance > triangleDistance
		) {

			continue;

		}

		uvec2 boundsInfo = uTexelFetch1D( bvh_bvhContents, currNodeIndex ).xy;
		bool isLeaf = bool( boundsInfo.x & 0xffff0000u );

		if ( isLeaf ) {

			uint count = boundsInfo.x & 0x0000ffffu;
			uint offset = boundsInfo.y;

			found = intersectTriangles(
				bvh_position, bvh_index, offset, count,
				rayOrigin, rayDirection, triangleDistance,
				faceIndices, faceNormal, barycoord, side, dist
			) || found;

		} else {

			uint leftIndex = currNodeIndex + 1u;
			uint splitAxis = boundsInfo.x & 0x0000ffffu;
			uint rightIndex = currNodeIndex + boundsInfo.y;

			bool leftToRight = rayDirection[ splitAxis ] >= 0.0;
			uint c1 = leftToRight ? leftIndex : rightIndex;
			uint c2 = leftToRight ? rightIndex : leftIndex;

			// set c2 in the stack so we traverse it later. We need to keep track of a pointer in
			// the stack while we traverse. The second pointer added is the one that will be
			// traversed first
			pointer ++;
			stack[ pointer ] = c2;

			pointer ++;
			stack[ pointer ] = c1;

		}

	}

	return found;

}
`;var Gi=`
struct BVH {

	usampler2D index;
	sampler2D position;

	sampler2D bvhBounds;
	usampler2D bvhContents;

};
`;var Gl=`
	${vn}
	${Tn}
`;import{BufferAttribute as te}from"three";function cu(i,t,e){let n=i.index,s=i.attributes.position.count,o=n?n.count:s,u=i.groups;u.length===0&&(u=[{count:o,start:0,materialIndex:0}]);let l=i.getAttribute("materialIndex");if(!l||l.count!==s){let f;e.length<=255?f=new Uint8Array(s):f=new Uint16Array(s),l=new te(f,1,!1),i.deleteAttribute("materialIndex"),i.setAttribute("materialIndex",l)}let p=l.array;for(let f=0;f<u.length;f++){let c=u[f],a=c.start,d=c.count,y=Math.min(d,o-a),w=Array.isArray(t)?t[c.materialIndex]:t,v=e.indexOf(w);for(let T=0;T<y;T++){let m=a+T;n&&(m=n.getX(m)),p[m]=v}}}function au(i,t){if(!i.index){let e=i.attributes.position.count,n=new Array(e);for(let r=0;r<e;r++)n[r]=r;i.setIndex(n)}if(!i.attributes.normal&&t&&t.includes("normal")&&i.computeVertexNormals(),!i.attributes.uv&&t&&t.includes("uv")){let e=i.attributes.position.count;i.setAttribute("uv",new te(new Float32Array(e*2),2,!1))}if(!i.attributes.uv2&&t&&t.includes("uv2")){let e=i.attributes.position.count;i.setAttribute("uv2",new te(new Float32Array(e*2),2,!1))}if(!i.attributes.tangent&&t&&t.includes("tangent"))if(i.attributes.uv&&i.attributes.normal)i.computeTangents();else{let e=i.attributes.position.count;i.setAttribute("tangent",new te(new Float32Array(e*4),4,!1))}if(!i.attributes.color&&t&&t.includes("color")){let e=i.attributes.position.count,n=new Float32Array(e*4);n.fill(1),i.setAttribute("color",new te(n,4))}}import{DataTexture as bn,RedFormat as Wi,LinearFilter as Ct,DataUtils as vt,HalfFloatType as dt,Source as Rr,RepeatWrapping as An,RGBAFormat as Lr,FloatType as Cr,ClampToEdgeWrapping as zr}from"three";import{DataUtils as Mr}from"three";function Ue(i){let t=new Uint16Array(i.length);for(let e=0,n=i.length;e<n;++e)t[e]=Mr.toHalfFloat(i[e]);return t}function Yi(i,t,e=0,n=i.length){let r=e,s=e+n-1;for(;r<s;){let o=r+s>>1;i[o]<t?r=o+1:s=o}return r-e}function Ur(i,t,e){return .2126*i+.7152*t+.0722*e}function Or(i,t=dt){let e=i.clone();e.source=new Rr({...e.image});let{width:n,height:r,data:s}=e.image,o=s;if(e.type!==t){t===dt?o=new Uint16Array(s.length):o=new Float32Array(s.length);let u;s instanceof Int8Array||s instanceof Int16Array||s instanceof Int32Array?u=2**(8*s.BYTES_PER_ELEMENT-1)-1:u=2**(8*s.BYTES_PER_ELEMENT)-1;for(let l=0,p=s.length;l<p;l++){let f=s[l];e.type===dt&&(f=vt.fromHalfFloat(s[l])),e.type!==Cr&&e.type!==dt&&(f/=u),t===dt&&(o[l]=vt.toHalfFloat(f))}e.image.data=o,e.type=t}if(e.flipY){let u=o;o=o.slice();for(let l=0;l<r;l++)for(let p=0;p<n;p++){let f=r-l-1,c=4*(l*n+p),a=4*(f*n+p);o[a+0]=u[c+0],o[a+1]=u[c+1],o[a+2]=u[c+2],o[a+3]=u[c+3]}e.flipY=!1,e.image.data=o}return e}var Xi=class{constructor(){let t=new bn(Ue(new Float32Array([0,0,0,0])),1,1);t.type=dt,t.format=Lr,t.minFilter=Ct,t.magFilter=Ct,t.wrapS=An,t.wrapT=An,t.generateMipmaps=!1,t.needsUpdate=!0;let e=new bn(Ue(new Float32Array([0,1])),1,2);e.type=dt,e.format=Wi,e.minFilter=Ct,e.magFilter=Ct,e.generateMipmaps=!1,e.needsUpdate=!0;let n=new bn(Ue(new Float32Array([0,0,1,1])),2,2);n.type=dt,n.format=Wi,n.minFilter=Ct,n.magFilter=Ct,n.generateMipmaps=!1,n.needsUpdate=!0,this.map=t,this.marginalWeights=e,this.conditionalWeights=n,this.totalSum=0}getPixelWeight(t,e,n){return Ur(t,e,n)}dispose(){this.marginalWeights.dispose(),this.conditionalWeights.dispose(),this.map.dispose()}updateFrom(t){let e=Or(t);e.wrapS=An,e.wrapT=zr;let{width:n,height:r,data:s}=e.image,o=new Float32Array(n*r),u=new Float32Array(n*r),l=new Float32Array(r),p=new Float32Array(r),f=0,c=0;for(let v=0;v<r;v++){let T=0;for(let m=0;m<n;m++){let h=v*n+m,x=vt.fromHalfFloat(s[4*h+0]),g=vt.fromHalfFloat(s[4*h+1]),A=vt.fromHalfFloat(s[4*h+2]),b=this.getPixelWeight(x,g,A,v,r);T+=b,f+=b,o[h]=b,u[h]=T}if(T!==0)for(let m=v*n,h=v*n+n;m<h;m++)o[m]/=T,u[m]/=T;c+=T,l[v]=T,p[v]=c}if(c!==0)for(let v=0,T=l.length;v<T;v++)l[v]/=c,p[v]/=c;let a=new Uint16Array(r),d=new Uint16Array(n*r);for(let v=0;v<r;v++){let T=(v+1)/r,m=Yi(p,T);a[v]=vt.toHalfFloat((m+.5)/r)}for(let v=0;v<r;v++)for(let T=0;T<n;T++){let m=v*n+T,h=(T+1)/n,x=Yi(u,h,v*n,n);d[m]=vt.toHalfFloat((x+.5)/n)}this.dispose();let{marginalWeights:y,conditionalWeights:w}=this;y.image={width:r,height:1,data:a},y.needsUpdate=!0,w.image={width:n,height:r,data:d},w.needsUpdate=!0,this.totalSum=f,this.map=e}};import{DataTexture as Vr,RGBAFormat as Hr,ClampToEdgeWrapping as Zi,FloatType as kr,Vector3 as ee,Quaternion as qr,Matrix4 as Gr,NearestFilter as Qi}from"three";function Ki(i){let t=0;if(i.byteLength!==0){let e=new Uint8Array(i);for(let n=0;n<i.byteLength;n++){let r=e[n];t=(t<<5)-t+r,t|=0}}return t}var Sn=6,Wr=11,Yr=0,Xr=1,Kr=2,Zr=3,Qr=4,J=new ee,Y=new ee,$i=new Gr,zt=new qr,ji=new ee,et=new ee,$r=new ee(0,1,0),Ji=class{constructor(){let t=new Vr(new Float32Array(4),1,1);t.format=Hr,t.type=kr,t.wrapS=Zi,t.wrapT=Zi,t.generateMipmaps=!1,t.minFilter=Qi,t.magFilter=Qi,this.tex=t,this.count=0}updateFrom(t,e=[]){let n=this.tex,r=Math.max(t.length*Sn,1),s=Math.ceil(Math.sqrt(r));n.image.width!==s&&(n.dispose(),n.image.data=new Float32Array(s*s*4),n.image.width=s,n.image.height=s);let o=n.image.data;for(let l=0,p=t.length;l<p;l++){let f=t[l],c=l*Sn*4,a=0;for(let y=0;y<Sn*4;y++)o[c+y]=0;f.getWorldPosition(Y),o[c+a++]=Y.x,o[c+a++]=Y.y,o[c+a++]=Y.z;let d=Yr;if(f.isRectAreaLight&&f.isCircular?d=Xr:f.isSpotLight?d=Kr:f.isDirectionalLight||f.isSunLight?d=Zr:f.isPointLight&&(d=Qr),o[c+a++]=d,o[c+a++]=f.color.r,o[c+a++]=f.color.g,o[c+a++]=f.color.b,o[c+a++]=f.intensity,f.getWorldQuaternion(zt),f.isRectAreaLight)J.set(f.width,0,0).applyQuaternion(zt),o[c+a++]=J.x,o[c+a++]=J.y,o[c+a++]=J.z,a++,Y.set(0,f.height,0).applyQuaternion(zt),o[c+a++]=Y.x,o[c+a++]=Y.y,o[c+a++]=Y.z,o[c+a++]=J.cross(Y).length()*(f.isCircular?Math.PI/4:1);else if(f.isSpotLight){let y=f.radius||0;ji.setFromMatrixPosition(f.matrixWorld),et.setFromMatrixPosition(f.target.matrixWorld),$i.lookAt(ji,et,$r),zt.setFromRotationMatrix($i),J.set(1,0,0).applyQuaternion(zt),o[c+a++]=J.x,o[c+a++]=J.y,o[c+a++]=J.z,a++,Y.set(0,1,0).applyQuaternion(zt),o[c+a++]=Y.x,o[c+a++]=Y.y,o[c+a++]=Y.z,o[c+a++]=Math.PI*y*y,o[c+a++]=y,o[c+a++]=f.decay,o[c+a++]=f.distance,o[c+a++]=Math.cos(f.angle),o[c+a++]=Math.cos(f.angle*(1-f.penumbra)),o[c+a++]=f.iesMap?e.indexOf(f.iesMap):-1}else if(f.isPointLight){let y=J.setFromMatrixPosition(f.matrixWorld);o[c+a++]=y.x,o[c+a++]=y.y,o[c+a++]=y.z,a++,a+=4,a+=1,o[c+a++]=f.decay,o[c+a++]=f.distance}else if(f.isDirectionalLight){let y=J.setFromMatrixPosition(f.matrixWorld),w=Y.setFromMatrixPosition(f.target.matrixWorld);et.subVectors(y,w).normalize(),o[c+a++]=et.x,o[c+a++]=et.y,o[c+a++]=et.z}else f.isSunLight&&(et.setFromMatrixPosition(f.matrixWorld).normalize(),o[c+a++]=et.x,o[c+a++]=et.y,o[c+a++]=et.z);o[c+Wr]=f.visibleToCameraRays?1:0}this.count=t.length;let u=Ki(o.buffer);return this.hash!==u?(this.hash=u,n.needsUpdate=!0,!0):!1}};function _n(i,t){return i.uuid<t.uuid?1:i.uuid>t.uuid?-1:0}function jr(i){return`${i.source.uuid}:${i.colorSpace}`}function Jr(i){let t=new Set,e=[];for(let n=0,r=i.length;n<r;n++){let s=i[n],o=jr(s);t.has(o)||(t.add(o),e.push(s))}return e}function vu(i){let t=i.map(n=>n.iesMap||null).filter(n=>n),e=new Set(t);return Array.from(e).sort(_n)}function Tu(i){let t=new Set;for(let n=0,r=i.length;n<r;n++){let s=i[n];for(let o in s){let u=s[o];u&&u.isTexture&&t.add(u)}}let e=Array.from(t);return Jr(e).sort(_n)}function wu(i){let t=[];return i.traverseVisible(e=>{(e.isRectAreaLight||e.isSpotLight||e.isPointLight||e.isDirectionalLight||e.isSunLight)&&t.push(e)}),t.sort(_n)}import{DataTexture as ts,FloatType as es,NearestFilter as no,RGBAFormat as oo,RGFormat as ns,RedFormat as is}from"three";function to(i,t=Math.random){for(let e=i.length-1;e>0;e--){let n=~~((t()-1e-6)*e),r=i[e];i[e]=i[n],i[n]=r}}function eo(i,t){i.fill(0);for(let e=0;e<t;e++)i[e]=1}var ne=class{constructor(t){this.count=0,this.size=-1,this.sigma=-1,this.radius=-1,this.lookupTable=null,this.score=null,this.binaryPattern=null,this.resize(t),this.setSigma(1.5)}findVoid(){let{score:t,binaryPattern:e}=this,n=1/0,r=-1;for(let s=0,o=e.length;s<o;s++){if(e[s]!==0)continue;let u=t[s];u<n&&(n=u,r=s)}return r}findCluster(){let{score:t,binaryPattern:e}=this,n=-1/0,r=-1;for(let s=0,o=e.length;s<o;s++){if(e[s]!==1)continue;let u=t[s];u>n&&(n=u,r=s)}return r}setSigma(t){if(t===this.sigma)return;let e=~~(Math.sqrt(20*t**2)+1),n=2*e+1,r=new Float32Array(n*n),s=t*t;for(let o=-e;o<=e;o++)for(let u=-e;u<=e;u++){let l=(e+u)*n+o+e,p=o*o+u*u;r[l]=Math.E**(-p/(2*s))}this.lookupTable=r,this.sigma=t,this.radius=e}resize(t){this.size!==t&&(this.size=t,this.score=new Float32Array(t*t),this.binaryPattern=new Uint8Array(t*t))}invert(){let{binaryPattern:t,score:e,size:n}=this;e.fill(0);for(let r=0,s=t.length;r<s;r++)if(t[r]===0){let o=~~(r/n),u=r-o*n;this.updateScore(u,o,1),t[r]=1}else t[r]=0}updateScore(t,e,n){let{size:r,score:s,lookupTable:o}=this,u=this.radius,l=2*u+1;for(let p=-u;p<=u;p++)for(let f=-u;f<=u;f++){let c=(u+f)*l+p+u,a=o[c],d=t+p;d=d<0?r+d:d%r;let y=e+f;y=y<0?r+y:y%r;let w=y*r+d;s[w]+=n*a}}addPointIndex(t){this.binaryPattern[t]=1;let e=this.size,n=~~(t/e),r=t-n*e;this.updateScore(r,n,1),this.count++}removePointIndex(t){this.binaryPattern[t]=0;let e=this.size,n=~~(t/e),r=t-n*e;this.updateScore(r,n,-1),this.count--}copy(t){this.resize(t.size),this.score.set(t.score),this.binaryPattern.set(t.binaryPattern),this.setSigma(t.sigma),this.count=t.count}};var Oe=class{constructor(){this.random=Math.random,this.sigma=1.5,this.size=64,this.majorityPointsRatio=.1,this.samples=new ne(1),this.savedSamples=new ne(1)}generate(){let{samples:t,savedSamples:e,sigma:n,majorityPointsRatio:r,size:s}=this;t.resize(s),t.setSigma(n);let o=Math.floor(s*s*r),u=t.binaryPattern;eo(u,o),to(u,this.random);for(let c=0,a=u.length;c<a;c++)u[c]===1&&t.addPointIndex(c);for(;;){let c=t.findCluster();t.removePointIndex(c);let a=t.findVoid();if(c===a){t.addPointIndex(c);break}t.addPointIndex(a)}let l=new Uint32Array(s*s);e.copy(t);let p;for(p=t.count-1;p>=0;){let c=t.findCluster();t.removePointIndex(c),l[c]=p,p--}let f=s*s;for(p=e.count;p<f/2;){let c=e.findVoid();e.addPointIndex(c),l[c]=p,p++}for(e.invert();p<f;){let c=e.findCluster();e.removePointIndex(c),l[c]=p,p++}return{data:l,maxValue:f}}};function os(i){return i>=3?4:i}function rs(i){switch(i){case 1:return is;case 2:return ns;default:return oo}}var io=class extends ts{constructor(t=64,e=1){super(new Float32Array(4),1,1,oo,es),this.minFilter=no,this.magFilter=no,this.size=t,this.channels=e,this.update()}update(){let t=this.channels,e=this.size,n=new Oe;n.channels=t,n.size=e;let r=os(t),s=rs(r);(this.image.width!==e||s!==this.format)&&(this.image.width=e,this.image.height=e,this.image.data=new Float32Array(e**2*r),this.format=s,this.dispose());let o=this.image.data;for(let u=0,l=t;u<l;u++){let p=n.generate(),f=p.data,c=p.maxValue;for(let a=0,d=f.length;a<d;a++){let y=f[a]/c;o[a*r+u]=y}}this.needsUpdate=!0}};var ro=`

	// TODO: possibly this should be renamed something related to material or path tracing logic

	#ifndef RAY_OFFSET
	#define RAY_OFFSET 1e-4
	#endif

	// adjust the hit point by the surface normal by a factor of some offset and the
	// maximum component-wise value of the current point to accommodate floating point
	// error as values increase.
	vec3 stepRayOrigin( vec3 rayOrigin, vec3 rayDirection, vec3 offset, float dist ) {

		vec3 point = rayOrigin + rayDirection * dist;
		vec3 absPoint = abs( point );
		float maxPoint = max( absPoint.x, max( absPoint.y, absPoint.z ) );
		return point + offset * ( maxPoint + 1.0 ) * RAY_OFFSET;

	}

	// https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_volume/README.md#attenuation
	vec3 transmissionAttenuation( float dist, vec3 attColor, float attDist ) {

		vec3 ot = - log( attColor ) / attDist;
		return exp( - ot * dist );

	}

	vec3 getHalfVector( vec3 wi, vec3 wo, float eta ) {

		// get the half vector - assuming if the light incident vector is on the other side
		// of the that it's transmissive.
		vec3 h;
		if ( wi.z > 0.0 ) {

			h = normalize( wi + wo );

		} else {

			// Scale by the ior ratio to retrieve the appropriate half vector
			// From Section 2.2 on computing the transmission half vector:
			// https://blog.selfshadow.com/publications/s2015-shading-course/burley/s2015_pbs_disney_bsdf_notes.pdf
			h = normalize( wi + wo * eta );

		}

		h *= sign( h.z );
		return h;

	}

	vec3 getHalfVector( vec3 a, vec3 b ) {

		return normalize( a + b );

	}

	// The discrepancy between interpolated surface normal and geometry normal can cause issues when a ray
	// is cast that is on the top side of the geometry normal plane but below the surface normal plane. If
	// we find a ray like that we ignore it to avoid artifacts.
	// This function returns if the direction is on the same side of both planes.
	bool isDirectionValid( vec3 direction, vec3 surfaceNormal, vec3 geometryNormal ) {

		bool aboveSurfaceNormal = dot( direction, surfaceNormal ) > 0.0;
		bool aboveGeometryNormal = dot( direction, geometryNormal ) > 0.0;
		return aboveSurfaceNormal == aboveGeometryNormal;

	}

	// ray sampling x and z are swapped to align with expected background view
	vec2 equirectDirectionToUv( vec3 direction ) {

		// from Spherical.setFromCartesianCoords
		vec2 uv = vec2( atan( direction.z, direction.x ), acos( direction.y ) );
		uv /= vec2( 2.0 * PI, PI );

		// apply adjustments to get values in range [0, 1] and y right side up
		uv.x += 0.5;
		uv.y = 1.0 - uv.y;
		return uv;

	}

	vec3 equirectUvToDirection( vec2 uv ) {

		// undo above adjustments
		uv.x -= 0.5;
		uv.y = 1.0 - uv.y;

		// from Vector3.setFromSphericalCoords
		float theta = uv.x * 2.0 * PI;
		float phi = uv.y * PI;

		float sinPhi = sin( phi );

		return vec3( sinPhi * cos( theta ), cos( phi ), sinPhi * sin( theta ) );

	}

	// power heuristic for multiple importance sampling
	float misHeuristic( float a, float b ) {

		float aa = a * a;
		float bb = b * b;
		return aa / ( aa + bb );

	}

	// tentFilter from Peter Shirley's 'Realistic Ray Tracing (2nd Edition)' book, pg. 60
	// erichlof/THREE.js-PathTracing-Renderer/
	float tentFilter( float x ) {

		return x < 0.5 ? sqrt( 2.0 * x ) - 1.0 : 1.0 - sqrt( 2.0 - ( 2.0 * x ) );

	}
`;import{DataTexture as ss,DataUtils as cs,EquirectangularReflectionMapping as as,FloatType as ls,HalfFloatType as us,LinearFilter as fs,LinearMipMapLinearFilter as ps,RGBAFormat as ds,RepeatWrapping as so,ShaderMaterial as ms,WebGLRenderTarget as hs}from"three";import{FullScreenQuad as xs}from"three/examples/jsm/postprocessing/Pass.js";var Bn=class extends ms{constructor(){super({uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:`
				varying vec2 vUv;
				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`
				#define ENVMAP_TYPE_CUBE_UV

				uniform samplerCube envMap;
				uniform float flipEnvMap;
				varying vec2 vUv;

				#include <common>
				#include <cube_uv_reflection_fragment>

				${ro}

				void main() {

					vec3 rayDirection = equirectUvToDirection( vUv );
					rayDirection.x *= flipEnvMap;
					gl_FragColor = textureCube( envMap, rayDirection );

				}`}),this.depthWrite=!1,this.depthTest=!1}},co=class{constructor(t){this._renderer=t,this._quad=new xs(new Bn)}generate(t,e=null,n=null){if(!t.isCubeTexture)throw new Error("CubeToEquirectMaterial: Source can only be cube textures.");let r=t.images[0],s=this._renderer,o=this._quad;e===null&&(e=4*r.height),n===null&&(n=2*r.height);let u=new hs(e,n,{type:ls,colorSpace:r.colorSpace}),l=r.height,p=Math.log2(l)-2,f=1/l,c=1/(3*Math.max(Math.pow(2,p),112));o.material.defines.CUBEUV_MAX_MIP=`${p}.0`,o.material.defines.CUBEUV_TEXEL_WIDTH=c,o.material.defines.CUBEUV_TEXEL_HEIGHT=f,o.material.uniforms.envMap.value=t,o.material.uniforms.flipEnvMap.value=t.isRenderTargetTexture?1:-1,o.material.needsUpdate=!0;let a=s.getRenderTarget(),d=s.autoClear;s.autoClear=!0,s.setRenderTarget(u),o.render(s),s.setRenderTarget(a),s.autoClear=d;let y=new Uint16Array(e*n*4),w=new Float32Array(e*n*4);s.readRenderTargetPixels(u,0,0,e,n,w),u.dispose();for(let T=0,m=w.length;T<m;T++)y[T]=cs.toHalfFloat(w[T]);let v=new ss(y,e,n,ds,us);return v.minFilter=ps,v.magFilter=fs,v.wrapS=so,v.wrapT=so,v.mapping=as,v.needsUpdate=!0,v}dispose(){this._quad.dispose()}};export{O as a,N as b,L as c,C as d,Se as e,_e as f,Lt as g,_i as h,Li as i,Le as j,Ce as k,ki as l,wn as m,cu as n,au as o,Ki as p,Fn as q,Xi as r,Ji as s,jr as t,vu as u,Tu as v,wu as w,io as x,ro as y,co as z,Dn as A};
